import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KaizenStatusPill, WorkStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { isWorkItemOverdue, workProgress } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

const columns = [
  { key: "PENDIENTES", title: "Por iniciar", tone: "border-amber-400" },
  { key: "EN_PROCESO", title: "En seguimiento", tone: "border-blue-500" },
  { key: "BLOQUEADAS", title: "Con bloqueos", tone: "border-rose-500" },
  { key: "CERRADAS", title: "Cerrados", tone: "border-emerald-600" }
] as const;

type ColumnKey = typeof columns[number]["key"];

function projectColumn(project: {
  status: string;
  activities: Array<{ status: string }>;
}): ColumnKey {
  const activities = project.activities.filter((activity) => activity.status !== "COMBINADA");
  const allClosed = activities.length > 0 && activities.every((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status));
  if (["COMPLETADO", "CANCELADO"].includes(project.status) || allClosed) return "CERRADAS";
  if (project.status === "EN_PAUSA" || activities.some((activity) => activity.status === "BLOQUEADA")) return "BLOQUEADAS";
  if (project.status === "EN_CURSO" || activities.some((activity) => activity.status === "EN_PROCESO" || ["COMPLETADA", "CANCELADA"].includes(activity.status))) return "EN_PROCESO";
  return "PENDIENTES";
}

export default async function KaizenKanbanPage() {
  await requireKaizenAccess();
  const projects = await prisma.kaizenProject.findMany({
    include: {
      leader: true,
      activities: { include: { owner: true }, orderBy: { number: "asc" } }
    },
    orderBy: [{ endDate: "asc" }, { number: "desc" }]
  });

  return (
    <>
      <PageHeader eyebrow="Proyectos Kaizen / Flujo visual" title="Kanban Kaizen por proyecto" description="Cada tarjeta representa un proyecto completo y mantiene sus actividades juntas para revisar avance, responsables y bloqueos." />
      {!projects.length ? <EmptyState title="No hay proyectos Kaizen" description="Los proyectos apareceran aqui cuando se creen o se transfieran desde Ideas de Mejora." /> : null}
      <section className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const items = projects.filter((project) => projectColumn(project) === column.key);
          return (
            <div className="min-w-0" key={column.key}>
              <div className={`mb-3 flex items-center justify-between border-b-2 ${column.tone} pb-2`}>
                <h2 className="text-sm font-extrabold text-ink">{column.title}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-700">{items.length} Kaizen</span>
              </div>
              <div className="grid gap-3">
                {items.map((project) => {
                  const activities = project.activities.filter((activity) => activity.status !== "COMBINADA");
                  const progress = workProgress(activities);
                  const overdue = activities.filter(isWorkItemOverdue).length;
                  const accent = column.key === "CERRADAS" ? "bg-emerald-600" : column.key === "BLOQUEADAS" ? "bg-rose-600" : column.key === "EN_PROCESO" ? "bg-blue-600" : "bg-amber-500";
                  return (
                    <article className="surface overflow-hidden rounded-lg" key={project.id}>
                      <div className={`h-1 ${accent}`} />
                      <div className="p-4">
                        <Link className="group flex items-start justify-between gap-3" href={`/kaizen/${project.id}`}>
                          <span className="min-w-0">
                            <span className="block text-[10px] font-extrabold uppercase text-amber-700">{project.folio}</span>
                            <span className="mt-1 block line-clamp-2 text-base font-extrabold leading-5 text-ink">{project.title}</span>
                            <span className="mt-1 block truncate text-[11px] font-bold text-slate-500">{project.leader.name} / {project.endDate.toLocaleDateString("es-MX")}</span>
                          </span>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-amber-700" aria-hidden />
                        </Link>
                        <div className="mt-3"><KaizenStatusPill status={project.status} /></div>
                        <div className="mt-4"><ProgressMeter label={`${progress.closed} de ${progress.total} realizadas`} percent={progress.percent} /></div>
                        {overdue ? <p className="mt-3 flex items-center gap-2 text-xs font-extrabold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />{overdue} {overdue === 1 ? "actividad vencida" : "actividades vencidas"}</p> : null}
                      </div>
                      <div className="border-t border-line bg-slate-50/70">
                        {activities.map((activity) => (
                          <Link className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-2 border-b border-line px-3 py-3 transition last:border-0 hover:bg-white" href={`/kaizen/${project.id}#actividad-${activity.id}`} key={activity.id}>
                            <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold ${["COMPLETADA", "CANCELADA"].includes(activity.status) ? "bg-emerald-100 text-emerald-800" : activity.status === "BLOQUEADA" ? "bg-rose-100 text-rose-800" : "bg-white text-slate-700"}`}>{activity.status === "COMPLETADA" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : activity.number}</span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 block text-xs font-extrabold leading-4 text-slate-800">{activity.action}</span>
                              <span className={`mt-1 block truncate text-[10px] font-bold ${isWorkItemOverdue(activity) ? "text-rose-700" : "text-slate-500"}`}>{activity.owner?.name ?? "Sin responsable"} / {activity.dueDate ? activity.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span>
                            </span>
                            <WorkStatusPill status={activity.status} />
                          </Link>
                        ))}
                        {!activities.length ? <p className="px-4 py-5 text-center text-xs font-bold text-slate-500">Sin actividades registradas</p> : null}
                      </div>
                    </article>
                  );
                })}
                {!items.length ? <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500"><FolderKanban className="mx-auto mb-2 h-5 w-5" aria-hidden />Sin proyectos</div> : null}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
