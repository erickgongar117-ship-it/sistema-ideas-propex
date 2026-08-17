import { CoinSourceType, CoinTransactionType, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpenCheck,
  CircleDollarSign,
  Filter,
  GraduationCap,
  History,
  Plus,
  ReceiptText,
  Search,
  SlidersHorizontal,
  ShieldAlert,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { CoinAccountDrawer } from "@/components/coin-account-drawer";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ProbocaCoin } from "@/components/proboca-coin";
import { SearchablePicker, type SearchablePickerOption } from "@/components/searchable-picker";
import { SectionHeading } from "@/components/section-heading";
import { requireUser } from "@/lib/auth";
import { getParticipantBalances } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { createCoinTransactionAction, reverseDuplicateCoinTransactionAction } from "./actions";

type CoinsPageProps = {
  searchParams: Promise<{
    error?: string;
    ledgerPage?: string;
    page?: string;
    participant?: string;
    peopleStatus?: string;
    q?: string;
    source?: string;
    success?: string;
    type?: string;
  }>;
};

const peoplePageSize = 40;
const ledgerPageSize = 50;

const sourceLabels: Record<CoinSourceType, string> = {
  IDEA: "Ideas de mejora",
  KAIZEN: "Kaizen",
  GENBA: "GENBA",
  TRAINING: "Entrenamientos",
  MANUAL: "Manual"
};

const typeLabels: Record<CoinTransactionType, string> = {
  AWARD: "Premio",
  ADJUSTMENT: "Ajuste",
  REDEMPTION: "Gasto"
};

const movementErrorCodes = new Set([
  "movimiento",
  "cantidad",
  "origen_tipo",
  "origen",
  "origen_duplicado",
  "participante",
  "saldo"
]);

const duplicateErrorCodes = new Set([
  "duplicado_datos",
  "duplicado_revertido",
  "duplicado_saldo",
  "duplicado_conciliacion",
  "duplicado_origen"
]);

const errorMessages: Record<string, string> = {
  movimiento: "Completa persona, tipo, cantidad, fecha y motivo.",
  cantidad: "Para premios y gastos captura una cantidad positiva.",
  origen_tipo: "Solo los premios pueden vincularse directamente con una idea, Kaizen o GENBA.",
  origen: "El elemento vinculado ya no existe o no es valido.",
  origen_duplicado: "Esa persona ya recibio un premio vinculado al mismo registro.",
  participante: "La persona seleccionada no esta disponible.",
  saldo: "El movimiento fue rechazado porque dejaria un saldo negativo.",
  duplicado_datos: "Selecciona el movimiento, explica el motivo y escribe DUPLICADO para confirmar.",
  duplicado_revertido: "Ese movimiento ya fue corregido o no puede consolidarse.",
  duplicado_saldo: "La correccion dejaria el saldo de la persona debajo de cero. Revisa primero sus canjes y ajustes.",
  duplicado_conciliacion: "Ese origen ya tiene el neto autorizado. Usa una conciliacion del total para evitar descontar dos veces.",
  duplicado_origen: "No se encontro el registro de origen necesario para comprobar esta correccion."
};

function positivePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(value);
}

function coinsHref(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== 1) query.set(key, String(value));
  }
  return query.size ? `/probocacoins?${query.toString()}` : "/probocacoins";
}

function valueOrLabel(value: number, emptyLabel: string) {
  return value === 0 ? emptyLabel : value.toLocaleString("es-MX");
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="border-l-2 border-brand-500 px-4 py-2">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500">{icon}{label}</div>
      <p className="mt-1 text-lg font-extrabold tabular-nums text-ink sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function movementTone(type: CoinTransactionType, amount: number) {
  if (type === "REDEMPTION" || amount < 0) return "text-rose-700";
  if (type === "AWARD") return "text-emerald-700";
  return "text-blue-700";
}

function sourceHref(sourceType: CoinSourceType, sourceId: string | null) {
  if (!sourceId) return null;
  if (sourceType === "IDEA") return `/ideas/${sourceId}`;
  if (sourceType === "KAIZEN") return `/kaizen/${sourceId}`;
  if (sourceType === "GENBA") return `/genba/${sourceId}`;
  if (sourceType === "TRAINING") return `/entrenamientos?session=${sourceId}`;
  return null;
}

function participantOption(participant: { id: string; name: string; employeeNumber: string | null; email: string | null; active: boolean }): SearchablePickerOption {
  return {
    value: participant.id,
    label: participant.name,
    description: `${participant.employeeNumber ?? participant.email ?? "Sin identificador"}${participant.active ? "" : " - Retirado"}`,
    searchText: `${participant.employeeNumber ?? ""} ${participant.email ?? ""}`
  };
}

export default async function ProbocaCoinsPage({ searchParams }: CoinsPageProps) {
  const currentUser = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const currentPage = positivePage(query.page);
  const ledgerPage = positivePage(query.ledgerPage);
  const search = query.q?.trim() ?? "";
  const peopleStatus = query.peopleStatus === "inactive" ? "inactive" : query.peopleStatus === "all" ? "all" : "active";
  const sourceFilter = Object.values(CoinSourceType).find((source) => source === query.source);
  const typeFilter = Object.values(CoinTransactionType).find((type) => type === query.type);
  const participantWhere: Prisma.ParticipantWhereInput = {
    ...(peopleStatus === "all" ? {} : { active: peopleStatus === "active" }),
    ...(search ? { OR: [
      { name: { contains: search } },
      { employeeNumber: { contains: search } },
      { email: { contains: search } },
      { jobTitle: { contains: search } }
    ] } : {})
  };

  const [allParticipantOptions, participantCount, participants, allBalances, typeTotals, sourceTotals, ideaOptions, kaizenOptions, genbaOptions, duplicateCandidates] = await Promise.all([
    prisma.participant.findMany({ select: { id: true, name: true, employeeNumber: true, email: true, active: true }, orderBy: { name: "asc" } }),
    prisma.participant.count({ where: participantWhere }),
    prisma.participant.findMany({
      where: participantWhere,
      include: { orgUnit: { include: { plant: { select: { code: true } } } }, user: { select: { email: true } } },
      orderBy: { name: "asc" },
      skip: (currentPage - 1) * peoplePageSize,
      take: peoplePageSize
    }),
    getParticipantBalances(),
    prisma.coinTransaction.groupBy({ by: ["type"], _sum: { amount: true } }),
    prisma.coinTransaction.groupBy({ by: ["sourceType"], _sum: { amount: true } }),
    prisma.idea.findMany({ select: { id: true, folio: true, collaboratorName: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.kaizenProject.findMany({ select: { id: true, folio: true, title: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.genbaWalk.findMany({ select: { id: true, folio: true, areaName: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    currentUser.role === "ADMIN" ? prisma.coinTransaction.findMany({
      where: { reversalOfId: null, reversal: { is: null }, amount: { not: 0 } },
      include: { participant: { select: { name: true, employeeNumber: true } } },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 500
    }) : Promise.resolve([])
  ]);

  const selectedParticipant = query.participant
    ? await prisma.participant.findUnique({ where: { id: query.participant }, select: { id: true, name: true, employeeNumber: true, email: true, active: true } })
    : null;
  const transactionWhere: Prisma.CoinTransactionWhereInput = {
    ...(selectedParticipant ? { participantId: selectedParticipant.id } : {}),
    ...(sourceFilter ? { sourceType: sourceFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {})
  };
  const [transactionCount, transactions] = await Promise.all([
    prisma.coinTransaction.count({ where: transactionWhere }),
    prisma.coinTransaction.findMany({
      where: transactionWhere,
      include: {
        participant: { select: { id: true, name: true, employeeNumber: true } },
        createdBy: { select: { name: true } },
        reversal: { select: { id: true, reference: true } },
        reversalOf: { select: { id: true, reference: true } }
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip: (ledgerPage - 1) * ledgerPageSize,
      take: ledgerPageSize
    })
  ]);

  const referencedIds = {
    ideas: transactions.filter((item) => item.sourceType === "IDEA" && item.sourceId).map((item) => item.sourceId as string),
    kaizens: transactions.filter((item) => item.sourceType === "KAIZEN" && item.sourceId).map((item) => item.sourceId as string),
    genbas: transactions.filter((item) => item.sourceType === "GENBA" && item.sourceId).map((item) => item.sourceId as string),
    trainings: transactions.filter((item) => item.sourceType === "TRAINING" && item.sourceId).map((item) => item.sourceId as string)
  };
  const [referencedIdeas, referencedKaizens, referencedGenbas, referencedTrainings] = await Promise.all([
    prisma.idea.findMany({ where: { id: { in: referencedIds.ideas } }, select: { id: true, folio: true } }),
    prisma.kaizenProject.findMany({ where: { id: { in: referencedIds.kaizens } }, select: { id: true, folio: true } }),
    prisma.genbaWalk.findMany({ where: { id: { in: referencedIds.genbas } }, select: { id: true, folio: true } }),
    prisma.trainingSession.findMany({ where: { id: { in: referencedIds.trainings } }, include: { program: { select: { name: true } } } })
  ]);
  const referenceLabels = new Map<string, string>([
    ...referencedIdeas.map((item) => [`IDEA:${item.id}`, item.folio] as const),
    ...referencedKaizens.map((item) => [`KAIZEN:${item.id}`, item.folio] as const),
    ...referencedGenbas.map((item) => [`GENBA:${item.id}`, item.folio] as const),
    ...referencedTrainings.map((item) => [`TRAINING:${item.id}`, item.program.name] as const)
  ]);

  const balanceRows = participants.map((participant) => ({ participant, balance: allBalances.get(participant.id) ?? 0 }));
  const totalBalance = [...allBalances.values()].reduce((sum, balance) => sum + balance, 0);
  const awarded = typeTotals.find((row) => row.type === "AWARD")?._sum.amount ?? 0;
  const redeemed = Math.abs(typeTotals.find((row) => row.type === "REDEMPTION")?._sum.amount ?? 0);
  const adjustments = typeTotals.find((row) => row.type === "ADJUSTMENT")?._sum.amount ?? 0;
  const holders = [...allBalances.values()].filter((balance) => balance > 0).length;
  const sourceAmounts = new Map(sourceTotals.map((row) => [row.sourceType, row._sum.amount ?? 0]));
  const maxSourceAmount = Math.max(1, ...Object.values(CoinSourceType).map((source) => Math.abs(sourceAmounts.get(source) ?? 0)));
  const activeOptions = allParticipantOptions.filter((participant) => participant.active).map(participantOption);
  const ledgerOptions = allParticipantOptions.map(participantOption);
  const linkedOptions: SearchablePickerOption[] = [
    ...ideaOptions.map((idea) => ({ value: `IDEA:${idea.id}`, label: idea.folio, description: `Idea - ${idea.collaboratorName}`, searchText: idea.collaboratorName })),
    ...kaizenOptions.map((project) => ({ value: `KAIZEN:${project.id}`, label: project.folio, description: `Kaizen - ${project.title}`, searchText: project.title })),
    ...genbaOptions.map((walk) => ({ value: `GENBA:${walk.id}`, label: walk.folio, description: `GENBA - ${walk.areaName}`, searchText: walk.areaName }))
  ];
  const duplicateOptions: SearchablePickerOption[] = duplicateCandidates.map((transaction) => ({
    value: transaction.id,
    label: `${transaction.amount > 0 ? "+" : ""}${transaction.amount.toLocaleString("es-MX")} | ${transaction.participant.name}`,
    description: `${formatDate(transaction.occurredAt)} | ${transaction.description}`,
    searchText: `${transaction.participant.employeeNumber ?? ""} ${transaction.reference} ${transaction.sourceType}`
  }));
  const successMessage = query.success === "movimiento" ? "El movimiento se registro y el saldo se actualizo."
    : query.success === "duplicado" ? "El duplicado se consolido con una contrapartida auditable; el saldo ya refleja la correccion."
    : null;
  const errorMessage = query.error ? errorMessages[query.error] ?? "No fue posible registrar el movimiento." : null;
  const selectedBalance = selectedParticipant ? allBalances.get(selectedParticipant.id) ?? 0 : null;
  // El cajon muestra la cuenta completa de la persona, ajena a los filtros del libro mayor.
  const [accountTotals, accountMovements] = selectedParticipant
    ? await Promise.all([
        prisma.coinTransaction.groupBy({
          by: ["type"],
          where: { participantId: selectedParticipant.id },
          _sum: { amount: true }
        }),
        prisma.coinTransaction.findMany({
          where: { participantId: selectedParticipant.id },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          take: 8,
          select: { id: true, amount: true, description: true, occurredAt: true, sourceType: true }
        })
      ])
    : [[], []];
  const totalFor = (type: CoinTransactionType) =>
    Math.abs(accountTotals.find((row) => row.type === type)?._sum.amount ?? 0);
  const openMovementPanel = Boolean(query.error && movementErrorCodes.has(query.error));
  const openDuplicatePanel = Boolean(query.error && duplicateErrorCodes.has(query.error));

  return (
    <>
      <PageHeader eyebrow="ProbocaCoins - Control financiero" title="Finanzas de ProbocaCoins" description="Busca personas en segundos y consulta o registra movimientos con trazabilidad completa." actions={<Link className="btn btn-secondary" href="/entrenamientos"><GraduationCap className="h-4 w-4" aria-hidden />Entrenamientos</Link>} />
      {errorMessage ? <div className="alert alert-danger mb-5"><X className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}
      {successMessage ? <div className="alert alert-success mb-5"><CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{successMessage}</span></div> : null}

      <section className="mb-8" aria-label="Consulta de saldos">
        <div>
          <SectionHeading count={participantCount} title="Buscar saldo por persona" description="Usa primero el numero de empleado de cinco digitos; tambien puedes buscar por nombre, correo o puesto." />
          <form className="surface mb-4 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]" method="get">
            <label>
              <span className="label">Persona o numero de empleado</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400" aria-hidden />
                <input className="field pl-9" defaultValue={search} name="q" placeholder="Ej. 00123 o nombre de la persona" type="search" />
              </span>
            </label>
            <label>
              <span className="label">Estado de cuenta</span>
              <select className="field" defaultValue={peopleStatus} name="peopleStatus">
                <option value="active">Personas activas</option>
                <option value="inactive">Personas retiradas</option>
                <option value="all">Todas las personas</option>
              </select>
            </label>
            <div className="flex items-end"><button className="btn btn-primary w-full" type="submit"><Filter className="h-4 w-4" aria-hidden />Buscar saldo</button></div>
          </form>
          {!participants.length ? (
            <div className="surface border-dashed p-8 text-center text-sm text-slate-500">No encontramos personas con estos filtros.</div>
          ) : (
            <>
              <div className="desktop-table-only table-wrap">
                <table className="data-table min-w-[720px]">
                  <thead><tr><th>Persona</th><th>Planta / area</th><th className="text-right">Saldo vigente</th><th className="text-right">Cuenta</th></tr></thead>
                  <tbody>
                    {balanceRows.map(({ participant, balance }) => (
                      <tr className={selectedParticipant?.id === participant.id ? "bg-red-50" : ""} key={participant.id}>
                        <td><p className="font-extrabold text-ink">{participant.name}</p><p className="text-xs text-slate-500">{participant.employeeNumber ? `Empleado ${participant.employeeNumber}` : participant.email ?? participant.user?.email ?? "Sin identificador"}{participant.active ? "" : " | Retirada"}</p></td>
                        <td className="text-xs text-slate-600">{participant.orgUnit ? `${participant.orgUnit.plant.code} | ${participant.orgUnit.name}` : participant.jobTitle ?? "Sin area asignada"}</td>
                        <td className="text-right"><span className="inline-flex items-center justify-end gap-2 font-extrabold tabular-nums text-ink">{balance !== 0 ? <ProbocaCoin size="sm" /> : null}{balance === 0 ? "Sin saldo" : balance.toLocaleString("es-MX")}</span></td>
                        <td className="text-right"><Link className="text-xs font-extrabold text-brand-700 hover:underline" href={coinsHref({ participant: participant.id, peopleStatus: peopleStatus === "active" ? undefined : peopleStatus, q: search || undefined, page: currentPage, source: sourceFilter, type: typeFilter })}>Abrir cuenta</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-card-list">
                {balanceRows.map(({ participant, balance }) => (
                  <Link className={`surface flex min-h-[76px] items-center gap-3 border-l-4 p-3 ${selectedParticipant?.id === participant.id ? "border-brand-500 bg-red-50" : "border-slate-300"}`} href={coinsHref({ participant: participant.id, peopleStatus: peopleStatus === "active" ? undefined : peopleStatus, q: search || undefined, page: currentPage, source: sourceFilter, type: typeFilter })} key={participant.id}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center bg-slate-950 text-xs font-extrabold text-white">{participant.name.charAt(0).toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-ink">{participant.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{participant.employeeNumber ? `Empleado ${participant.employeeNumber}` : participant.email ?? participant.user?.email ?? "Sin identificador"}</span></span>
                    <span className="shrink-0 text-right"><span className="block text-sm font-extrabold tabular-nums text-ink">{balance === 0 ? "Sin saldo" : balance.toLocaleString("es-MX")}</span><span className="mt-1 block text-xs font-bold text-brand-700">Ver cuenta</span></span>
                  </Link>
                ))}
              </div>
            </>
          )}
          <Pagination
            currentPage={currentPage}
            pageSize={peoplePageSize}
            path="/probocacoins"
            query={{
              participant: selectedParticipant?.id,
              peopleStatus: peopleStatus === "active" ? undefined : peopleStatus,
              q: search || undefined,
              source: sourceFilter,
              type: typeFilter
            }}
            totalItems={participantCount}
            totalPages={Math.max(1, Math.ceil(participantCount / peoplePageSize))}
          />
        </div>

      </section>

      <section className="mb-8" aria-labelledby="coin-ledger-title">
        <SectionHeading
          actions={(selectedParticipant || sourceFilter || typeFilter) ? (
            <Link
              className="btn btn-secondary"
              href={coinsHref({
                peopleStatus: peopleStatus === "active" ? undefined : peopleStatus,
                q: search || undefined,
                page: currentPage
              })}
            >
              <X className="h-4 w-4" aria-hidden />Limpiar detalle
            </Link>
          ) : null}
          count={transactionCount}
          description={selectedParticipant ? `Cuenta y movimientos de ${selectedParticipant.name}.` : "Historial paginado de premios, ajustes y gastos."}
          title="Detalle y libro mayor"
        />

        {selectedParticipant ? (
          <div className="surface mb-4 grid gap-4 border-l-4 border-brand-500 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-slate-950 text-white">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-extrabold text-ink">{selectedParticipant.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${selectedParticipant.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {selectedParticipant.active ? "Activa" : "Retirada"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedParticipant.employeeNumber ? `Empleado ${selectedParticipant.employeeNumber}` : "Sin numero de empleado"}
                  {selectedParticipant.email ? ` | ${selectedParticipant.email}` : ""}
                </p>
              </div>
            </div>
            <div className="border-t border-line pt-3 text-left md:border-l md:border-t-0 md:pl-6 md:pt-0 md:text-right">
              <p className="text-xs font-extrabold uppercase text-slate-500">Saldo vigente</p>
              <p className="mt-1 inline-flex items-center gap-2 text-xl font-extrabold tabular-nums text-ink">
                <ProbocaCoin size="sm" />
                {selectedBalance === 0 ? "Sin saldo" : selectedBalance?.toLocaleString("es-MX")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {transactionCount ? `${transactionCount.toLocaleString("es-MX")} movimientos con los filtros actuales` : "Sin movimientos con los filtros actuales"}
              </p>
            </div>
          </div>
        ) : null}

        <form className="surface mb-4 grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]" method="get">
          {search ? <input name="q" type="hidden" value={search} /> : null}
          {peopleStatus !== "active" ? <input name="peopleStatus" type="hidden" value={peopleStatus} /> : null}
          {currentPage > 1 ? <input name="page" type="hidden" value={currentPage} /> : null}
          <SearchablePicker defaultValue={selectedParticipant?.id ?? ""} label="Persona" name="participant" options={ledgerOptions} placeholder="Todas las personas" />
          <label>
            <span className="label">Origen</span>
            <select className="field" defaultValue={sourceFilter ?? ""} name="source">
              <option value="">Todos los origenes</option>
              {Object.values(CoinSourceType).map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Tipo</span>
            <select className="field" defaultValue={typeFilter ?? ""} name="type">
              <option value="">Todos los tipos</option>
              {Object.values(CoinTransactionType).map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn btn-secondary w-full" type="submit"><Search className="h-4 w-4" aria-hidden />Consultar</button>
          </div>
        </form>

        {!transactions.length ? (
          <div className="surface border-dashed p-8 text-center text-sm text-slate-500">No hay movimientos para los filtros seleccionados.</div>
        ) : (
          <>
            <div className="desktop-table-only table-wrap">
              <table className="data-table min-w-[1040px]">
                <thead>
                  <tr>
                    <th>Fecha efectiva</th>
                    <th>Persona</th>
                    <th>Concepto y referencia</th>
                    <th>Origen</th>
                    <th>Registro</th>
                    <th className="text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const href = sourceHref(transaction.sourceType, transaction.sourceId);
                    const referenceLabel = transaction.sourceId ? referenceLabels.get(`${transaction.sourceType}:${transaction.sourceId}`) : null;
                    const reconciliationLabel = transaction.reversalOfId
                      ? `Contrapartida de ${transaction.reversalOf?.reference ?? "movimiento anterior"}`
                      : transaction.reversal
                        ? "Movimiento corregido con contrapartida"
                        : null;
                    return (
                      <tr key={transaction.id}>
                        <td className="whitespace-nowrap text-xs text-slate-600">{formatDate(transaction.occurredAt)}</td>
                        <td>
                          <p className="font-extrabold text-ink">{transaction.participant.name}</p>
                          <p className="text-xs text-slate-500">{transaction.participant.employeeNumber ? `Empleado ${transaction.participant.employeeNumber}` : "Sin numero de empleado"}</p>
                        </td>
                        <td className="max-w-[340px]">
                          <p className="font-bold text-ink">{transaction.description}</p>
                          <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{transaction.reference}</p>
                          {reconciliationLabel ? <p className="mt-1 text-xs font-bold text-amber-800">{reconciliationLabel}</p> : null}
                          {transaction.correctionReason ? <p className="mt-1 text-xs text-slate-600">Motivo: {transaction.correctionReason}</p> : null}
                        </td>
                        <td>
                          {href ? (
                            <Link className="text-xs font-extrabold text-brand-700 hover:underline" href={href}>{referenceLabel ?? sourceLabels[transaction.sourceType]}</Link>
                          ) : (
                            <span className="text-xs font-bold text-slate-600">{sourceLabels[transaction.sourceType]}</span>
                          )}
                          <p className="mt-1 text-xs text-slate-500">{typeLabels[transaction.type]}</p>
                        </td>
                        <td className="text-xs text-slate-600">
                          <p className="font-bold text-ink">{transaction.createdBy?.name ?? "Sistema"}</p>
                          <p className="mt-1">{formatDateTime(transaction.createdAt)}</p>
                        </td>
                        <td className={`text-right text-base font-extrabold tabular-nums ${movementTone(transaction.type, transaction.amount)}`}>
                          {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString("es-MX")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list">
              {transactions.map((transaction) => {
                const href = sourceHref(transaction.sourceType, transaction.sourceId);
                const referenceLabel = transaction.sourceId ? referenceLabels.get(`${transaction.sourceType}:${transaction.sourceId}`) : null;
                const reconciliationLabel = transaction.reversalOfId
                  ? "Contrapartida auditable"
                  : transaction.reversal
                    ? "Corregido con contrapartida"
                    : null;
                return (
                  <article className="surface p-4" key={transaction.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-ink">{transaction.participant.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(transaction.occurredAt)} | {typeLabels[transaction.type]}</p>
                      </div>
                      <p className={`shrink-0 text-lg font-extrabold tabular-nums ${movementTone(transaction.type, transaction.amount)}`}>
                        {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString("es-MX")}
                      </p>
                    </div>
                    <p className="mt-3 text-sm font-bold leading-5 text-ink">{transaction.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                      <div><span className="block font-extrabold uppercase text-slate-500">Origen</span>{href ? <Link className="mt-1 block font-bold text-brand-700" href={href}>{referenceLabel ?? sourceLabels[transaction.sourceType]}</Link> : <span className="mt-1 block font-bold text-ink">{sourceLabels[transaction.sourceType]}</span>}</div>
                      <div><span className="block font-extrabold uppercase text-slate-500">Registrado por</span><span className="mt-1 block font-bold text-ink">{transaction.createdBy?.name ?? "Sistema"}</span></div>
                    </div>
                    <p className="mt-3 break-all font-mono text-[11px] text-slate-500">{transaction.reference}</p>
                    {reconciliationLabel ? <p className="mt-2 text-xs font-bold text-amber-800">{reconciliationLabel}</p> : null}
                    {transaction.correctionReason ? <p className="mt-1 text-xs text-slate-600">Motivo: {transaction.correctionReason}</p> : null}
                  </article>
                );
              })}
            </div>
          </>
        )}
        <Pagination
          currentPage={ledgerPage}
          pageParam="ledgerPage"
          pageSize={ledgerPageSize}
          path="/probocacoins"
          query={{
            participant: selectedParticipant?.id,
            peopleStatus: peopleStatus === "active" ? undefined : peopleStatus,
            q: search || undefined,
            page: currentPage > 1 ? String(currentPage) : undefined,
            source: sourceFilter,
            type: typeFilter
          }}
          totalItems={transactionCount}
          totalPages={Math.max(1, Math.ceil(transactionCount / ledgerPageSize))}
        />
      </section>

      <section className="mb-8" aria-label="Panorama financiero">
        <SectionHeading title="Panorama financiero" description="Acumulados globales del libro mayor. Los valores sin registros se identifican expresamente." />
        <div className="grid grid-cols-2 gap-2 border-y border-line py-4 sm:gap-3 xl:grid-cols-4" aria-label="Resumen financiero">
          <Metric icon={<WalletCards className="h-4 w-4" aria-hidden />} label="Saldo vigente" value={valueOrLabel(totalBalance, "Sin saldo emitido")} note={holders ? `${holders.toLocaleString("es-MX")} personas con saldo` : "Ninguna persona conserva saldo"} />
          <Metric icon={<ArrowUpRight className="h-4 w-4" aria-hidden />} label="Premios" value={valueOrLabel(awarded, "Sin premios")} note="ProbocaCoins entregadas" />
          <Metric icon={<ArrowDownRight className="h-4 w-4" aria-hidden />} label="Gastos" value={valueOrLabel(redeemed, "Sin canjes")} note="ProbocaCoins usadas en recompensas" />
          <Metric icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />} label="Ajustes netos" value={valueOrLabel(adjustments, "Sin ajustes")} note="Correcciones administrativas" />
        </div>

        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-5">
          {Object.values(CoinSourceType).map((source) => {
            const amount = sourceAmounts.get(source) ?? 0;
            const width = Math.max(amount ? 6 : 0, Math.round((Math.abs(amount) / maxSourceAmount) * 100));
            return (
              <Link
                className="group min-h-[58px]"
                href={coinsHref({
                  participant: selectedParticipant?.id,
                  peopleStatus: peopleStatus === "active" ? undefined : peopleStatus,
                  q: search || undefined,
                  page: currentPage,
                  source,
                  type: typeFilter
                })}
                key={source}
              >
                <div className="mb-2 flex items-end justify-between gap-2">
                  <span className="text-xs font-extrabold text-ink group-hover:text-brand-700">{sourceLabels[source]}</span>
                  <span className="text-sm font-extrabold tabular-nums text-ink">{valueOrLabel(amount, "Sin movimientos")}</span>
                </div>
                <div className="h-2 overflow-hidden bg-slate-100" aria-hidden>
                  <div className={`h-full ${amount < 0 ? "bg-rose-500" : "bg-brand-500"}`} style={{ width: `${width}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {currentUser.role === "ADMIN" ? (
        <details className="details-panel mb-8">
          <summary><span className="flex items-center gap-2"><History className="h-4 w-4 text-brand-700" aria-hidden />Consolidar un movimiento duplicado</span></summary>
          <form action={reverseDuplicateCoinTransactionAction} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
            <div className="grid gap-3">
              <SearchablePicker label="Movimiento que se anulara" name="transactionId" options={duplicateOptions} placeholder="Buscar por persona, numero, importe u origen" required />
              <label><span className="label">Motivo de la correccion *</span><textarea className="field min-h-20" name="reason" placeholder="Explica por que este movimiento es un duplicado" required /></label>
            </div>
            <div className="border-l-4 border-amber-400 bg-amber-50 p-4">
              <div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden /><p className="text-xs font-bold leading-5 text-amber-950">El original no se borra. Se registrara una contrapartida exacta y ambos movimientos quedaran ligados para auditoria.</p></div>
              <label className="mt-4 block"><span className="label">Escribe DUPLICADO para confirmar</span><input autoComplete="off" className="field" name="confirmation" pattern="DUPLICADO" required /></label>
              <button className="btn btn-danger mt-3 w-full" disabled={!duplicateOptions.length} type="submit"><History className="h-4 w-4" aria-hidden />Consolidar duplicado</button>
            </div>
          </form>
        </details>
      ) : null}

      <section aria-labelledby="coin-ledger-title">
        <SectionHeading count={transactionCount} title="Libro mayor" description={selectedParticipant ? `Movimientos de ${selectedParticipant.name}.` : "Historial paginado de premios, ajustes y gastos."} actions={(selectedParticipant || sourceFilter || typeFilter) ? <Link className="btn btn-secondary" href="/probocacoins"><X className="h-4 w-4" aria-hidden />Limpiar filtros</Link> : null} />
        <form className="mb-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]" method="get">
          <SearchablePicker defaultValue={selectedParticipant?.id ?? ""} label="Persona" name="participant" options={ledgerOptions} placeholder="Todas las personas" />
          <label><span className="label">Origen</span><select className="field" defaultValue={sourceFilter ?? ""} name="source"><option value="">Todos los origenes</option>{Object.values(CoinSourceType).map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}</select></label>
          <label><span className="label">Tipo</span><select className="field" defaultValue={typeFilter ?? ""} name="type"><option value="">Todos los tipos</option>{Object.values(CoinTransactionType).map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
          <div className="flex items-end"><button className="btn btn-secondary w-full" type="submit"><Search className="h-4 w-4" aria-hidden />Filtrar</button></div>
        </form>
        {!transactions.length ? <div className="surface border-dashed p-8 text-center text-sm text-slate-500">No hay movimientos para los filtros seleccionados.</div> : (
          <div className="overflow-x-auto border-y border-line"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-line text-[10px] font-extrabold uppercase text-slate-500"><tr><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Persona</th><th className="px-3 py-2.5">Movimiento</th><th className="px-3 py-2.5">Origen</th><th className="px-3 py-2.5">Registro</th><th className="px-3 py-2.5 text-right">Importe</th></tr></thead><tbody className="divide-y divide-line">{transactions.map((transaction) => { const href = sourceHref(transaction.sourceType, transaction.sourceId); const referenceLabel = transaction.sourceId ? referenceLabels.get(`${transaction.sourceType}:${transaction.sourceId}`) : null; return <tr key={transaction.id}><td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">{formatDate(transaction.occurredAt)}</td><td className="px-3 py-3"><p className="font-extrabold text-ink">{transaction.participant.name}</p><p className="text-xs text-slate-500">{transaction.participant.employeeNumber ?? "Sin numero"}</p></td><td className="max-w-[320px] px-3 py-3"><p className="font-bold text-ink">{transaction.description}</p><p className="text-xs text-slate-500">{typeLabels[transaction.type]}</p></td><td className="px-3 py-3">{href ? <Link className="text-xs font-extrabold text-brand-700 hover:underline" href={href}>{referenceLabel ?? sourceLabels[transaction.sourceType]}</Link> : <span className="text-xs font-bold text-slate-600">{sourceLabels[transaction.sourceType]}</span>}</td><td className="px-3 py-3 text-xs text-slate-500">{transaction.createdBy?.name ?? "Sistema"}</td><td className={`px-3 py-3 text-right text-base font-extrabold tabular-nums ${movementTone(transaction.type, transaction.amount)}`}>{transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString("es-MX")}</td></tr>; })}</tbody></table></div>
        )}
        <Pagination currentPage={ledgerPage} pageSize={ledgerPageSize} path="/probocacoins" query={{ participant: selectedParticipant?.id, source: sourceFilter, type: typeFilter }} totalItems={transactionCount} totalPages={Math.max(1, Math.ceil(transactionCount / ledgerPageSize))} pageParam="ledgerPage" />
      </section>

      {selectedParticipant ? (
        <CoinAccountDrawer
          adjustments={totalFor(CoinTransactionType.ADJUSTMENT)}
          awarded={totalFor(CoinTransactionType.AWARD)}
          balance={selectedBalance ?? 0}
          canManage
          closeHref={coinsHref({ q: search || undefined, peopleStatus: peopleStatus === "active" ? undefined : peopleStatus, page: currentPage })}
          movements={accountMovements.map((movement) => ({
            id: movement.id,
            amount: movement.amount,
            description: movement.description,
            occurredAt: formatDate(movement.occurredAt),
            sourceLabel: sourceLabels[movement.sourceType]
          }))}
          openForm={openMovementPanel}
          participant={selectedParticipant}
          redeemed={totalFor(CoinTransactionType.REDEMPTION)}
          requestId={randomUUID()}
          today={new Date().toISOString().slice(0, 10)}
        />
      ) : null}
    </>
  );
}
