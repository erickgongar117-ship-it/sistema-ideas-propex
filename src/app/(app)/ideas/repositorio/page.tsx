import { IdeaStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { RepositoryList, type RepositoryEntry } from "@/components/repository-list";
import { requireUser } from "@/lib/auth";
import { statusLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type RepositoryPageProps = { searchParams: Promise<{ page?: string; q?: string; status?: string }> };

const pageSize = 30;
const terminalStatuses: IdeaStatus[] = ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"];

function positivePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function IdeasRepositoryPage({ searchParams }: RepositoryPageProps) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const page = positivePage(query.page);
  const search = query.q?.trim() ?? "";
  const status = terminalStatuses.find((item) => item === query.status);
  const where: Prisma.IdeaWhereInput = {
    status: status ?? { in: terminalStatuses },
    ...(search ? { OR: [
      { folio: { contains: search } },
      { problem: { contains: search } },
      { proposal: { contains: search } },
      { collaboratorName: { contains: search } },
      { employeeNumber: { contains: search } },
      { area: { name: { contains: search } } }
    ] } : {})
  };
  const [count, ideas] = await Promise.all([
    prisma.idea.count({ where }),
    prisma.idea.findMany({
      where,
      include: {
        area: true,
        supervisor: true,
        implementationOwner: true,
        approvals: { select: { id: true } },
        attachments: { select: { id: true } }
      },
      orderBy: [{ closedAt: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);
  const ids = ideas.map((idea) => idea.id);
  const movements = ids.length ? await prisma.coinTransaction.findMany({
    where: { sourceType: "IDEA", sourceId: { in: ids } },
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
  const entries: RepositoryEntry[] = ideas.map((idea) => ({
    href: `/ideas/${idea.id}`,
    folio: idea.folio,
    title: idea.problem,
    subtitle: `${idea.area.code} · ${idea.collaboratorName}`,
    status: statusLabels[idea.status],
    statusTone: idea.status === "CERRADA" ? "green" : idea.status === "CANCELADA" ? "gray" : "red",
    closedAt: idea.closedAt ?? idea.updatedAt,
    owner: idea.implementationOwner?.name ?? idea.supervisor?.name ?? "Sin responsable",
    team: `Autor: ${idea.collaboratorName}`,
    progress: `${idea.approvals.length} validaciones`,
    evidence: `${idea.attachments.length} evidencias`,
    coins: coinTotals.get(idea.id) ?? 0,
    recipients: recipients.get(idea.id)?.size ?? 0
  }));

  return (
    <>
      <PageHeader eyebrow="Ideas de Mejora · Historico" title="Repositorio de ideas" description="Expedientes cerrados, cancelados o rechazados con su responsable, evidencia y saldo real de ProbocaCoins." actions={<><Link className="btn btn-secondary" href="/ideas"><ArrowLeft className="h-4 w-4" aria-hidden />Trabajo actual</Link><Link className="btn btn-secondary" href="/api/export"><Download className="h-4 w-4" aria-hidden />Excel</Link></>} />
      <form className="mb-5 grid gap-2 border-y border-line py-4 md:grid-cols-[minmax(0,1fr)_240px_auto]" method="get">
        <label><span className="label">Buscar expediente</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400" aria-hidden /><input className="field pl-9" defaultValue={search} name="q" placeholder="Folio, persona, numero o problema" /></span></label>
        <label><span className="label">Resultado</span><select className="field" defaultValue={status ?? ""} name="status"><option value="">Todos los resultados</option>{terminalStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
        <div className="flex items-end"><button className="btn btn-primary w-full" type="submit"><Filter className="h-4 w-4" aria-hidden />Filtrar</button></div>
      </form>
      <RepositoryList entries={entries} />
      <Pagination currentPage={page} pageSize={pageSize} path="/ideas/repositorio" query={{ q: search || undefined, status }} totalItems={count} totalPages={Math.max(1, Math.ceil(count / pageSize))} />
    </>
  );
}
