import { IdeaStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, CalendarDays, Download, Filter, RotateCcw, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { classificationLabels, ideaCategoryLabels, priorityLabels, statusLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type IdeasPageProps = {
  searchParams: Promise<{ q?: string; status?: string; area?: string }>;
};

export default async function IdeasPage({ searchParams }: IdeasPageProps) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const where: Prisma.IdeaWhereInput = {};
  if (query.q) {
    where.OR = [
      { folio: { contains: query.q } },
      { collaboratorName: { contains: query.q } },
      { problem: { contains: query.q } },
      { proposal: { contains: query.q } }
    ];
  }
  if (query.status && Object.values(IdeaStatus).includes(query.status as IdeaStatus)) where.status = query.status as IdeaStatus;
  if (query.area) where.area = { code: query.area };

  const [ideas, areas] = await Promise.all([
    prisma.idea.findMany({ where, include: { area: true, supervisor: true, implementationOwner: true }, orderBy: { createdAt: "desc" } }),
    prisma.area.findMany({ orderBy: { code: "asc" } })
  ]);
  const hasFilters = Boolean(query.q || query.status || query.area);

  return (
    <>
      <PageHeader
        eyebrow="Mejora Continua · Base de seguimiento"
        title="Todas las ideas"
        description={`${ideas.length} ${ideas.length === 1 ? "resultado" : "resultados"}${hasFilters ? " con los filtros actuales" : " en la base maestra"}.`}
        actions={
          <Link className="btn btn-primary" href="/api/export">
            <Download className="h-4 w-4" aria-hidden /> Exportar Excel
          </Link>
        }
      />

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
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
                <span className="font-extrabold text-slate-700">{idea.pointsAssigned} pts</span>
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
                <th>Folio</th><th>Fecha</th><th>Área</th><th>Categoría</th><th>Colaborador</th><th>Problema</th><th>Supervisor</th><th>Estatus</th><th>Prioridad</th><th>Clasificación</th><th>Compromiso</th><th>Días</th><th>Puntos</th><th><span className="sr-only">Acción</span></th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => {
                const daysOpen = Math.max(0, Math.floor((Date.now() - idea.createdAt.getTime()) / 86400000));
                return (
                  <tr key={idea.id}>
                    <td><Link className="font-extrabold text-brand-700 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link></td>
                    <td className="whitespace-nowrap">{idea.createdAt.toLocaleDateString("es-MX")}</td>
                    <td className="font-extrabold text-ink">{idea.area.code}</td>
                    <td className="min-w-44 text-xs font-bold">{ideaCategoryLabels[idea.category]}</td>
                    <td className="whitespace-nowrap">{idea.collaboratorName}</td>
                    <td className="min-w-64 max-w-sm"><p className="line-clamp-2">{idea.problem}</p></td>
                    <td className="whitespace-nowrap">{idea.supervisor?.name ?? "Sin supervisor"}</td>
                    <td><StatusPill status={idea.status} /></td>
                    <td>{idea.priority ? priorityLabels[idea.priority] : "-"}</td>
                    <td className="min-w-36">{idea.classification ? classificationLabels[idea.classification] : "-"}</td>
                    <td className="whitespace-nowrap">{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "-"}</td>
                    <td>{daysOpen}</td>
                    <td className="font-extrabold text-ink">{idea.pointsAssigned}</td>
                    <td><Link aria-label={`Ver ${idea.folio}`} className="icon-button h-9 w-9 min-w-9" href={`/ideas/${idea.id}`} title="Ver detalle"><ArrowRight className="h-4 w-4" aria-hidden /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
