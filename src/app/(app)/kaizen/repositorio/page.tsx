import { KaizenStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RepositoryList, type RepositoryEntry } from "@/components/repository-list";
import { kaizenStatusLabels } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";


export const metadata = { title: "Repositorio Kaizen" };
type RepositoryPageProps = { searchParams: Promise<{ page?: string; q?: string; status?: string }> };

const pageSize = 30;
const terminalStatuses: KaizenStatus[] = ["COMPLETADO", "CANCELADO"];

function positivePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function KaizenRepositoryPage({ searchParams }: RepositoryPageProps) {
  const { user, canManage } = await requireKaizenAccess();
  const query = await searchParams;
  const page = positivePage(query.page);
  const search = query.q?.trim() ?? "";
  const status = terminalStatuses.find((item) => item === query.status);
  const where: Prisma.KaizenProjectWhereInput = {
    status: status ?? { in: terminalStatuses },
    ...(!canManage ? { OR: [
      { leaderId: user.id },
      { teamMembers: { some: { userId: user.id } } },
      { activities: { some: { ownerId: user.id } } }
    ] } : {}),
    ...(search ? { AND: [{ OR: [
      { folio: { contains: search } },
      { title: { contains: search } },
      { objective: { contains: search } },
      { plant: { contains: search } },
      { area: { contains: search } },
      { leader: { name: { contains: search } } }
    ] }] } : {})
  };
  const [count, projects] = await Promise.all([
    prisma.kaizenProject.count({ where }),
    prisma.kaizenProject.findMany({
      where,
      include: {
        leader: true,
        closedBy: true,
        teamMembers: { include: { user: true } },
        activities: { include: { owner: true } },
        attachments: { select: { id: true } }
      },
      orderBy: [{ closedAt: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);
  const ids = projects.map((project) => project.id);
  const movements = ids.length ? await prisma.coinTransaction.findMany({
    where: { sourceType: "KAIZEN", sourceId: { in: ids } },
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
  const entries: RepositoryEntry[] = projects.map((project) => {
    const relevant = project.activities.filter((activity) => activity.status !== "COMBINADA");
    const completed = relevant.filter((activity) => activity.status === "COMPLETADA").length;
    const derivedTeam = new Set([project.leaderId, ...project.activities.map((activity) => activity.ownerId).filter(Boolean)]).size;
    return {
      href: `/kaizen/${project.id}`,
      folio: project.folio,
      title: project.title,
      subtitle: `${project.plant ?? "Sin planta"} · ${project.area}`,
      status: kaizenStatusLabels[project.status],
      statusTone: project.status === "COMPLETADO" ? "green" : "gray",
      closedAt: project.closedAt ?? project.updatedAt,
      owner: project.leader.name,
      team: `${project.teamMembers.length || derivedTeam} integrantes`,
      progress: `${completed}/${relevant.length} ejecutadas`,
      evidence: `${project.attachments.length} archivos`,
      coins: coinTotals.get(project.id) ?? 0,
      recipients: recipients.get(project.id)?.size ?? 0
    };
  });

  return (
    <>
      <PageHeader eyebrow="Proyectos Kaizen · Historico" title="Repositorio Kaizen" description="Proyectos completos y cancelados con equipo, resultado, evidencias y reconocimiento financiero." actions={<><Link className="btn btn-secondary" href="/kaizen"><ArrowLeft className="h-4 w-4" aria-hidden />Trabajo actual</Link><Link className="btn btn-secondary" href="/api/export/kaizen"><Download className="h-4 w-4" aria-hidden />Excel</Link></>} />
      <form className="mb-5 grid gap-2 border-y border-line py-4 md:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
        <label><span className="label">Buscar expediente</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400" aria-hidden /><input className="field pl-9" defaultValue={search} name="q" placeholder="Folio, proyecto, planta, area o lider" /></span></label>
        <label><span className="label">Resultado</span><select className="field" defaultValue={status ?? ""} name="status"><option value="">Todos</option>{terminalStatuses.map((item) => <option key={item} value={item}>{kaizenStatusLabels[item]}</option>)}</select></label>
        <div className="flex items-end"><button className="btn btn-primary w-full" type="submit"><Filter className="h-4 w-4" aria-hidden />Filtrar</button></div>
      </form>
      <RepositoryList entries={entries} />
      <Pagination currentPage={page} pageSize={pageSize} path="/kaizen/repositorio" query={{ q: search || undefined, status }} totalItems={count} totalPages={Math.max(1, Math.ceil(count / pageSize))} />
    </>
  );
}
