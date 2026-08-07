import { GenbaStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RepositoryList, type RepositoryEntry } from "@/components/repository-list";
import { attendancePercent, genbaStatusLabels } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type RepositoryPageProps = { searchParams: Promise<{ page?: string; q?: string; status?: string }> };

const pageSize = 30;
const terminalStatuses: GenbaStatus[] = ["CERRADO", "CANCELADO"];

function positivePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function GenbaRepositoryPage({ searchParams }: RepositoryPageProps) {
  const { user, canManage } = await requireGenbaAccess();
  const query = await searchParams;
  const page = positivePage(query.page);
  const search = query.q?.trim() ?? "";
  const status = terminalStatuses.find((item) => item === query.status);
  const where: Prisma.GenbaWalkWhereInput = {
    status: status ?? { in: terminalStatuses },
    ...(!canManage ? { OR: [{ coordinatorId: user.id }, { activities: { some: { ownerId: user.id } } }] } : {}),
    ...(search ? { AND: [{ OR: [
      { folio: { contains: search } },
      { areaName: { contains: search } },
      { notes: { contains: search } },
      { coordinator: { name: { contains: search } } }
    ] }] } : {})
  };
  const [count, walks] = await Promise.all([
    prisma.genbaWalk.count({ where }),
    prisma.genbaWalk.findMany({
      where,
      include: {
        coordinator: true,
        activities: { include: { owner: true, attachments: { select: { id: true } } } },
        attachments: { select: { id: true } }
      },
      orderBy: [{ closedAt: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);
  const ids = walks.map((walk) => walk.id);
  const movements = ids.length ? await prisma.coinTransaction.findMany({
    where: { sourceType: "GENBA", sourceId: { in: ids } },
    select: { sourceId: true, participantId: true, amount: true }
  }) : [];
  const coinTotals = new Map<string, number>();
  const recipients = new Map<string, Set<string>>();
  for (const movement of movements) {
    if (!movement.sourceId) continue;
    coinTotals.set(movement.sourceId, (coinTotals.get(movement.sourceId) ?? 0) + movement.amount);
    if (movement.amount) {
      const people = recipients.get(movement.sourceId) ?? new Set<string>();
      people.add(movement.participantId);
      recipients.set(movement.sourceId, people);
    }
  }
  const entries: RepositoryEntry[] = walks.map((walk) => {
    const relevant = walk.activities.filter((activity) => activity.status !== "COMBINADA");
    const completed = relevant.filter((activity) => activity.status === "COMPLETADA").length;
    const team = new Set([walk.coordinatorId, ...walk.activities.map((activity) => activity.ownerId).filter(Boolean)]).size;
    const evidenceCount = walk.attachments.length + walk.activities.reduce((sum, activity) => sum + activity.attachments.length, 0);
    return {
      href: `/genba/${walk.id}`,
      folio: walk.folio,
      title: walk.areaName,
      subtitle: `Visita ${walk.visitDate.toLocaleDateString("es-MX")} · asistencia ${attendancePercent(walk.expectedDepartments, walk.attendedDepartments)}%`,
      status: genbaStatusLabels[walk.status],
      statusTone: walk.status === "CERRADO" ? "green" : "gray",
      closedAt: walk.closedAt ?? walk.updatedAt,
      owner: walk.coordinator.name,
      team: `${team} responsables`,
      progress: `${completed}/${relevant.length} ejecutadas`,
      evidence: `${evidenceCount} evidencias`,
      coins: coinTotals.get(walk.id) ?? 0,
      recipients: recipients.get(walk.id)?.size ?? 0
    };
  });

  return (
    <>
      <PageHeader eyebrow="Recorridos GENBA · Historico" title="Repositorio GENBA" description="Recorridos cerrados y cancelados con asistencia, responsables, cumplimiento, evidencias y conversiones relacionadas." actions={<><Link className="btn btn-secondary" href="/genba"><ArrowLeft className="h-4 w-4" aria-hidden />Trabajo actual</Link><Link className="btn btn-secondary" href="/api/export/genba"><Download className="h-4 w-4" aria-hidden />Excel</Link></>} />
      <form className="mb-5 grid gap-2 border-y border-line py-4 md:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
        <label><span className="label">Buscar expediente</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400" aria-hidden /><input className="field pl-9" defaultValue={search} name="q" placeholder="Folio, area, nota o coordinador" /></span></label>
        <label><span className="label">Resultado</span><select className="field" defaultValue={status ?? ""} name="status"><option value="">Todos</option>{terminalStatuses.map((item) => <option key={item} value={item}>{genbaStatusLabels[item]}</option>)}</select></label>
        <div className="flex items-end"><button className="btn btn-primary w-full" type="submit"><Filter className="h-4 w-4" aria-hidden />Filtrar</button></div>
      </form>
      <RepositoryList entries={entries} />
      <Pagination currentPage={page} pageSize={pageSize} path="/genba/repositorio" query={{ q: search || undefined, status }} totalItems={count} totalPages={Math.max(1, Math.ceil(count / pageSize))} />
    </>
  );
}
