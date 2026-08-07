import { IdeaStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { Archive, ArrowRight, CalendarDays, CheckCircle2, Download, Filter, RotateCcw, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { classificationLabels, ideaCategoryLabels, statusLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type IdeasPageProps = {
  searchParams: Promise<{ q?: string; status?: string; area?: string; page?: string; success?: string }>;
};

const pageSize = 50;
const terminalStatuses: IdeaStatus[] = ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"];

function positivePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function IdeasPage({ searchParams }: IdeasPageProps) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const currentPage = positivePage(query.page);
  const where: Prisma.IdeaWhereInput = {};
  if (query.q) {
    where.OR = [
      { folio: { contains: query.q } },
      { collaboratorName: { contains: query.q } },
      { problem: { contains: query.q } },
      { proposal: { contains: query.q } }
    ];
  }
  if (query.status && Object.values(IdeaStatus).includes(query.status as IdeaStatus) && !terminalStatuses.includes(query.status as IdeaStatus)) where.status = query.status as IdeaStatus;
  else where.status = { notIn: terminalStatuses };
  if (query.area) where.area = { code: query.area };

  const [ideaCount, ideas, areas] = await Promise.all([
    prisma.idea.count({ where }),
    prisma.idea.findMany({
      where,
      include: {
        area: true,
        supervisor: true,
        implementationOwner: true,
        approvals: { select: { id: true, status: true, decision: true } },
        supportRequests: { select: { id: true, status: true, decision: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize
    }),
    prisma.area.findMany({ orderBy: { code: "asc" } })
  ]);
  const hasFilters = Boolean(query.q || query.status || query.area);

  return (
    <>
      <PageHeader
        eyebrow="Mejora Continua · Base de seguimiento"
        title="Ideas activas"
        description={`${ideaCount.toLocaleString("es-MX")} ${ideaCount === 1 ? "resultado" : "resultados"}${hasFilters ? " con los filtros actuales" : " en la base maestra"}. Se muestran 50 por pagina.`}
        actions={
          <><Link className="btn btn-secondary" href="/ideas/repositorio"><Archive className="h-4 w-4" aria-hidden />Repositorio</Link><Link className="btn btn-primary" href="/api/export"><Download className="h-4 w-4" aria-hidden />Exportar Excel</Link></>
        }
      />

      {query.success === "eliminada" ? (
        <div className="alert alert-success mb-5" role="status"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">La idea cancelada se eliminó definitivamente.</span></div>
      ) : null}

      <form className="surface mb-5 rounded-lg p-4" method="get">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
          <Filter className="h-4 w-4 text-slate-500" aria-hidden />
          Buscar y filtrar
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_160px_220px_auto_auto]">
          <label>
            <span className="label">Buscar</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-[14px] h-4 w-4 text-slate-400" aria-hidden />
              <input className="field pl-9" defaultValue={query.q ?? ""} name="q" placeholder="Folio, persona o problema" />
            </span>
          </label>
          <label>
            <span className="label">Área</span>
            <select className="field" defaultValue={query.area ?? ""} name="area">
              <option value="">Todas</option>
              {areas.map((area) => <option key={area.id} value={area.code}>{area.code}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Estatus</span>
            <select className="field" defaultValue={query.status ?? ""} name="status">
              <option value="">Todos</option>
              {Object.entries(statusLabels).filter(([value]) => !terminalStatuses.includes(value as IdeaStatus)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" type="submit">Aplicar</button>
          </div>
          {hasFilters ? (
            <div className="flex items-end">
              <Link aria-label="Limpiar filtros" className="icon-button w-full md:w-[42px]" href="/ideas" title="Limpiar filtros"><RotateCcw className="h-4 w-4" aria-hidden /></Link>
            </div>
          ) : null}
        </div>
      </form>

      {!ideas.length ? <EmptyState title="No encontramos ideas" description="Cambia los filtros o limpia la busqueda para ver mas resultados." /> : null}

      <div className="mobile-card-list">
        {ideas.map((idea) => {
          const daysOpen = Math.max(0, Math.floor((Date.now() - idea.createdAt.getTime()) / 86400000));
          return (
            <Link className="surface block rounded-lg p-4" href={`/ideas/${idea.id}`} key={idea.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-brand-700">{idea.folio}</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-500">{idea.area.code} · {idea.collaboratorName}</p>
                  <p className="mt-1 text-[11px] font-extrabold text-emerald-700">{ideaCategoryLabels[idea.category]}</p>
                </div>
                <StatusPill status={idea.status} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden />{daysOpen} dias abierta</span>
                <span className="font-extrabold text-slate-700">{idea.pointsAssigned} ProbocaCoins</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </div>
            </Link>
          );
        })}
      </div>

      {ideas.length ? (
        <div className="table-wrap desktop-table-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio / oportunidad</th><th>Origen</th><th>Responsable</th><th>Validaciones</th><th>Estatus</th><th>Compromiso</th><th><span className="sr-only">Acción</span></th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => {
                const daysOpen = Math.max(0, Math.floor((Date.now() - idea.createdAt.getTime()) / 86400000));
                const validations = [...idea.approvals, ...idea.supportRequests];
                const approvedValidations = validations.filter((validation) => validation.status === "APPROVED" && validation.decision === "APROBAR").length;
                const pendingValidations = validations.filter((validation) => validation.status === "PENDING").length;
                return (
                  <tr key={idea.id}>
                    <td className="min-w-72"><Link className="font-extrabold text-brand-700 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link><p className="mt-1 line-clamp-2 text-xs text-slate-600">{idea.problem}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{ideaCategoryLabels[idea.category]}{idea.classification ? ` - ${classificationLabels[idea.classification]}` : ""} - {daysOpen} dias - {idea.pointsAssigned} ProbocaCoins</p></td>
                    <td className="min-w-36"><p className="font-extrabold text-ink">{idea.area.code}</p><p className="mt-1 text-xs text-slate-500">{idea.collaboratorName}</p></td>
                    <td className="whitespace-nowrap">{idea.supervisor?.name ?? "Sin supervisor"}</td>
                    <td className="min-w-40"><p className="text-xs font-extrabold text-emerald-700">{approvedValidations}/{validations.length} aprobadas</p><p className={`mt-1 text-[10px] font-bold ${pendingValidations ? "text-amber-700" : "text-slate-500"}`}>{pendingValidations ? `${pendingValidations} pendientes` : validations.length ? "Sin pendientes" : "Sin apoyos requeridos"}</p></td>
                    <td><StatusPill status={idea.status} /></td>
                    <td className="whitespace-nowrap">{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "-"}</td>
                    <td><Link aria-label={`Ver ${idea.folio}`} className="icon-button h-9 w-9 min-w-9" href={`/ideas/${idea.id}`} title="Ver detalle"><ArrowRight className="h-4 w-4" aria-hidden /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <Pagination currentPage={currentPage} pageSize={pageSize} path="/ideas" query={{ q: query.q, status: query.status, area: query.area }} totalItems={ideaCount} totalPages={Math.max(1, Math.ceil(ideaCount / pageSize))} />
    </>
  );
}
