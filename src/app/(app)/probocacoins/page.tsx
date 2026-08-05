import { CoinSourceType, CoinTransactionType, Prisma } from "@prisma/client";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  GraduationCap,
  History,
  ReceiptText,
  Search,
  SlidersHorizontal,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProbocaCoin } from "@/components/proboca-coin";
import { SectionHeading } from "@/components/section-heading";
import { requireUser } from "@/lib/auth";
import { getParticipantBalances } from "@/lib/coins";
import { prisma } from "@/lib/prisma";
import { createCoinTransactionAction } from "./actions";

type CoinsPageProps = {
  searchParams: Promise<{
    error?: string;
    participant?: string;
    source?: string;
    success?: string;
  }>;
};

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

const errorMessages: Record<string, string> = {
  movimiento: "Completa persona, tipo, cantidad, fecha y motivo.",
  cantidad: "Para premios y gastos captura una cantidad positiva.",
  origen_tipo: "Solo los premios pueden vincularse directamente con una idea, Kaizen o GENBA.",
  origen: "El elemento vinculado ya no existe o no es valido.",
  origen_duplicado: "Esa persona ya recibió un premio vinculado al mismo registro.",
  participante: "La persona seleccionada no esta disponible.",
  saldo: "El movimiento fue rechazado porque dejaria un saldo negativo."
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(value);
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="border-l-2 border-brand-500 px-4 py-2">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-500">{icon}{label}</div>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
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

export default async function ProbocaCoinsPage({ searchParams }: CoinsPageProps) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const sourceFilter = Object.values(CoinSourceType).find((source) => source === query.source);

  const participants = await prisma.participant.findMany({
    where: { active: true },
    include: {
      orgUnit: { include: { plant: { select: { code: true } } } },
      user: { select: { email: true } }
    },
    orderBy: { name: "asc" }
  });
  const selectedParticipant = participants.find((participant) => participant.id === query.participant) ?? null;
  const transactionWhere: Prisma.CoinTransactionWhereInput = {
    participantId: selectedParticipant?.id,
    sourceType: sourceFilter
  };

  const [balances, transactions, typeTotals, sourceTotals, ideaOptions, kaizenOptions, genbaOptions] = await Promise.all([
    getParticipantBalances(participants.map((participant) => participant.id)),
    prisma.coinTransaction.findMany({
      where: transactionWhere,
      include: {
        participant: { select: { id: true, name: true, employeeNumber: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 200
    }),
    prisma.coinTransaction.groupBy({ by: ["type"], _sum: { amount: true } }),
    prisma.coinTransaction.groupBy({ by: ["sourceType"], _sum: { amount: true } }),
    prisma.idea.findMany({ select: { id: true, folio: true, collaboratorName: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.kaizenProject.findMany({ select: { id: true, folio: true, title: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.genbaWalk.findMany({ select: { id: true, folio: true, areaName: true }, orderBy: { createdAt: "desc" }, take: 100 })
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

  const balanceRows = participants
    .map((participant) => ({ participant, balance: balances.get(participant.id) ?? 0 }))
    .sort((left, right) => right.balance - left.balance || left.participant.name.localeCompare(right.participant.name));
  const totalBalance = balanceRows.reduce((sum, row) => sum + row.balance, 0);
  const awarded = typeTotals.find((row) => row.type === "AWARD")?._sum.amount ?? 0;
  const redeemed = Math.abs(typeTotals.find((row) => row.type === "REDEMPTION")?._sum.amount ?? 0);
  const adjustments = typeTotals.find((row) => row.type === "ADJUSTMENT")?._sum.amount ?? 0;
  const holders = balanceRows.filter((row) => row.balance > 0).length;
  const sourceAmounts = new Map(sourceTotals.map((row) => [row.sourceType, row._sum.amount ?? 0]));
  const maxSourceAmount = Math.max(1, ...Object.values(CoinSourceType).map((source) => Math.abs(sourceAmounts.get(source) ?? 0)));
  const successMessage = query.success === "movimiento" ? "El movimiento se registro y el saldo se actualizo." : null;
  const errorMessage = query.error ? errorMessages[query.error] ?? "No fue posible registrar el movimiento." : null;

  return (
    <>
      <PageHeader
        eyebrow="ProbocaCoins - Control financiero"
        title="Finanzas de ProbocaCoins"
        description="Consulta saldos, identifica de donde provienen las monedas y registra premios, ajustes o gastos con trazabilidad."
        actions={<Link className="btn btn-secondary" href="/entrenamientos"><GraduationCap className="h-4 w-4" aria-hidden />Entrenamientos</Link>}
      />

      {errorMessage ? <div className="alert alert-danger mb-5"><X className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}
      {successMessage ? <div className="alert alert-success mb-5"><CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{successMessage}</span></div> : null}

      <section className="mb-7 grid grid-cols-2 gap-2 border-y border-line py-4 sm:gap-3 xl:grid-cols-4" aria-label="Resumen financiero">
        <Metric icon={<WalletCards className="h-4 w-4" aria-hidden />} label="Saldo vigente" value={totalBalance.toLocaleString("es-MX")} note={`${holders} personas con saldo`} />
        <Metric icon={<ArrowUpRight className="h-4 w-4" aria-hidden />} label="Premios" value={awarded.toLocaleString("es-MX")} note="ProbocaCoins entregadas" />
        <Metric icon={<ArrowDownRight className="h-4 w-4" aria-hidden />} label="Gastos" value={redeemed.toLocaleString("es-MX")} note="Canjeadas en recompensas" />
        <Metric icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />} label="Ajustes netos" value={adjustments.toLocaleString("es-MX")} note="Correcciones administrativas" />
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div>
          <SectionHeading count={participants.length} title="Saldo por persona" description="Ordenado de mayor a menor saldo disponible." />
          {!participants.length ? (
            <div className="surface border-dashed p-8 text-center text-sm text-slate-500">Registra participantes desde el modulo de Entrenamientos.</div>
          ) : (
            <div className="overflow-x-auto border-y border-line">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-line text-[10px] font-extrabold uppercase text-slate-500"><tr><th className="px-3 py-2.5">Persona</th><th className="px-3 py-2.5">Planta / area</th><th className="px-3 py-2.5 text-right">Saldo</th><th className="px-3 py-2.5 text-right">Detalle</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {balanceRows.map(({ participant, balance }) => (
                    <tr className={selectedParticipant?.id === participant.id ? "bg-red-50" : "bg-white"} key={participant.id}>
                      <td className="px-3 py-3"><p className="font-extrabold text-ink">{participant.name}</p><p className="text-xs text-slate-500">{participant.employeeNumber ?? participant.email ?? participant.user?.email ?? "Sin identificador"}</p></td>
                      <td className="px-3 py-3 text-xs text-slate-600">{participant.orgUnit ? `${participant.orgUnit.plant.code} - ${participant.orgUnit.name}` : participant.jobTitle ?? "Sin asignar"}</td>
                      <td className="px-3 py-3 text-right"><span className="inline-flex items-center justify-end gap-2 font-extrabold tabular-nums text-ink"><ProbocaCoin size="sm" />{balance.toLocaleString("es-MX")}</span></td>
                      <td className="px-3 py-3 text-right"><Link className="text-xs font-extrabold text-brand-700 hover:underline" href={`/probocacoins?participant=${participant.id}${sourceFilter ? `&source=${sourceFilter}` : ""}`}>Ver movimientos</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="surface p-5" aria-labelledby="new-coin-movement-title">
          <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
            <ProbocaCoin size="lg" />
            <div><p className="text-[10px] font-extrabold uppercase text-brand-700">Control administrativo</p><h2 className="text-lg font-extrabold text-ink" id="new-coin-movement-title">Nuevo movimiento</h2></div>
          </div>
          <form action={createCoinTransactionAction} className="grid gap-3">
            <label><span className="label">Persona</span><select className="field" defaultValue={selectedParticipant?.id ?? ""} name="participantId" required><option value="">Seleccionar</option>{participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}{participant.employeeNumber ? ` - ${participant.employeeNumber}` : ""}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label><span className="label">Tipo</span><select className="field" defaultValue="AWARD" name="type"><option value="AWARD">Premio</option><option value="ADJUSTMENT">Ajuste</option><option value="REDEMPTION">Gasto / canje</option></select></label>
              <label><span className="label">Cantidad</span><input className="field" name="amount" placeholder="100" required step={1} type="number" /></label>
            </div>
            <label><span className="label">Vincular premio</span><select className="field" defaultValue="" name="linkedEntity"><option value="">Movimiento manual</option><optgroup label="Ideas de mejora">{ideaOptions.map((idea) => <option key={idea.id} value={`IDEA:${idea.id}`}>{idea.folio} - {idea.collaboratorName}</option>)}</optgroup><optgroup label="Kaizen">{kaizenOptions.map((project) => <option key={project.id} value={`KAIZEN:${project.id}`}>{project.folio} - {project.title}</option>)}</optgroup><optgroup label="GENBA">{genbaOptions.map((walk) => <option key={walk.id} value={`GENBA:${walk.id}`}>{walk.folio} - {walk.areaName}</option>)}</optgroup></select><span className="helper-text">El vinculo aplica solo a premios; entrenamientos se registran automaticamente.</span></label>
            <label><span className="label">Fecha</span><input className="field" defaultValue={new Date().toISOString().slice(0, 10)} name="occurredAt" type="date" /></label>
            <label><span className="label">Motivo</span><textarea className="field min-h-20" name="description" placeholder="Describe el premio, correccion o recompensa canjeada" required /></label>
            <p className="text-xs leading-5 text-slate-500">En ajustes puedes usar una cantidad negativa. Los gastos siempre se descuentan y nunca pueden dejar el saldo debajo de cero.</p>
            <button className="btn btn-primary" disabled={!participants.length} type="submit"><ReceiptText className="h-4 w-4" aria-hidden />Registrar movimiento</button>
          </form>
        </aside>
      </section>

      <section className="mb-8" aria-labelledby="coin-source-title">
        <SectionHeading title="Composicion del saldo" description="Valor neto acumulado por cada origen." />
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-5">
          {Object.values(CoinSourceType).map((source) => {
            const amount = sourceAmounts.get(source) ?? 0;
            const width = Math.max(amount ? 6 : 0, Math.round((Math.abs(amount) / maxSourceAmount) * 100));
            return (
              <Link className="group" href={`/probocacoins?source=${source}${selectedParticipant ? `&participant=${selectedParticipant.id}` : ""}`} key={source}>
                <div className="mb-2 flex items-end justify-between gap-2"><span className="text-xs font-extrabold text-ink group-hover:text-brand-700">{sourceLabels[source]}</span><span className="text-sm font-extrabold tabular-nums text-ink">{amount.toLocaleString("es-MX")}</span></div>
                <div className="h-2 overflow-hidden bg-slate-100"><div className={`h-full ${amount < 0 ? "bg-rose-500" : "bg-brand-500"}`} style={{ width: `${width}%` }} /></div>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="coin-ledger-title">
        <SectionHeading
          count={transactions.length}
          title="Libro mayor"
          description={selectedParticipant ? `Movimientos de ${selectedParticipant.name}.` : "Ultimos 200 movimientos registrados."}
          actions={(selectedParticipant || sourceFilter) ? <Link className="btn btn-secondary" href="/probocacoins"><X className="h-4 w-4" aria-hidden />Limpiar filtros</Link> : null}
        />
        <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px_auto]" method="get">
          <label><span className="sr-only">Persona</span><select className="field" defaultValue={selectedParticipant?.id ?? ""} name="participant"><option value="">Todas las personas</option>{participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}</select></label>
          <label><span className="sr-only">Origen</span><select className="field" defaultValue={sourceFilter ?? ""} name="source"><option value="">Todos los origenes</option>{Object.values(CoinSourceType).map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}</select></label>
          <button className="btn btn-secondary" type="submit"><Search className="h-4 w-4" aria-hidden />Filtrar</button>
        </form>

        {!transactions.length ? (
          <div className="surface border-dashed p-8 text-center text-sm text-slate-500">No hay movimientos para los filtros seleccionados.</div>
        ) : (
          <div className="overflow-x-auto border-y border-line">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-line text-[10px] font-extrabold uppercase text-slate-500"><tr><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Persona</th><th className="px-3 py-2.5">Movimiento</th><th className="px-3 py-2.5">Origen</th><th className="px-3 py-2.5">Registro</th><th className="px-3 py-2.5 text-right">Importe</th></tr></thead>
              <tbody className="divide-y divide-line">
                {transactions.map((transaction) => {
                  const href = sourceHref(transaction.sourceType, transaction.sourceId);
                  const referenceLabel = transaction.sourceId ? referenceLabels.get(`${transaction.sourceType}:${transaction.sourceId}`) : null;
                  return (
                    <tr key={transaction.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">{formatDate(transaction.occurredAt)}</td>
                      <td className="px-3 py-3"><p className="font-extrabold text-ink">{transaction.participant.name}</p><p className="text-xs text-slate-500">{transaction.participant.employeeNumber ?? "Sin numero"}</p></td>
                      <td className="max-w-[320px] px-3 py-3"><p className="font-bold text-ink">{transaction.description}</p><p className="text-xs text-slate-500">{typeLabels[transaction.type]}</p></td>
                      <td className="px-3 py-3">{href ? <Link className="text-xs font-extrabold text-brand-700 hover:underline" href={href}>{referenceLabel ?? sourceLabels[transaction.sourceType]}</Link> : <span className="text-xs font-bold text-slate-600">{sourceLabels[transaction.sourceType]}</span>}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{transaction.createdBy?.name ?? "Sistema"}</td>
                      <td className={`px-3 py-3 text-right text-base font-extrabold tabular-nums ${movementTone(transaction.type, transaction.amount)}`}>{transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString("es-MX")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
