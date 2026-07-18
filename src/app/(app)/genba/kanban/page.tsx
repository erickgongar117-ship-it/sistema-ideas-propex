import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Footprints } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { WorkStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { isWorkItemOverdue, workProgress } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

const columns = [
  { key: "PENDIENTES", title: "Por iniciar", tone: "border-amber-400" },
  { key: "EN_PROCESO", title: "En seguimiento", tone: "border-blue-500" },
  { key: "BLOQUEADAS", title: "Con bloqueos", tone: "border-rose-500" },
  { key: "CERRADAS", title: "Cerrados", tone: "border-emerald-600" }
] as const;

type ColumnKey = typeof columns[number]["key"];

function walkColumn(walk: {
  status: string;
  activities: Array<{ status: string }>;
}): ColumnKey {
  const activities = walk.activities.filter((activity) => activity.status !== "COMBINADA");
  const allClosed = activities.length > 0 && activities.every((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status));
  if (walk.status !== "ABIERTO" || allClosed) return "CERRADAS";
  if (activities.some((activity) => activity.status === "BLOQUEADA")) return "BLOQUEADAS";
  if (activities.some((activity) => activity.status === "EN_PROCESO" || ["COMPLETADA", "CANCELADA"].includes(activity.status))) return "EN_PROCESO";
  return "PENDIENTES";
}

export default async function GenbaKanbanPage() {
  await requireGenbaAccess();
  const walks = await prisma.genbaWalk.findMany({
    include: { activities: { include: { owner: true }, orderBy: { number: "asc" } } },
    orderBy: { visitDate: "desc" }
  });

  return (
    <>
      <PageHeader eyebrow="Recorridos GENBA · Flujo visual" title="Kanban GENBA por recorrido" description="Cada tarjeta representa un GENBA completo y muestra todas sus actividades sin saturar el tablero." />
      {!walks.length ? <EmptyState title="No hay recorridos GENBA" description="Crea un recorrido para comenzar el seguimiento." /> : null}
      <section className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const items = walks.filter((walk) => walkColumn(walk) === column.key);
          return (
            <div className="min-w-0" key={column.key}>
              <div className={`mb-3 flex items-center justify-between border-b-2 ${column.tone} pb-2`}><h2 className="text-sm font-extrabold text-ink">{column.title}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-700">{items.length} GENBA</span></div>
              <div className="grid gap-3">
                {items.map((walk) => {
                  const activities = walk.activities.filter((activity) => activity.status !== "COMBINADA");
                  const progress = workProgress(activities);
                  const overdue = activities.filter(isWorkItemOverdue).length;
                  return (
                    <article className="surface overflow-hidden rounded-lg" key={walk.id}>
                      <div className={`h-1 ${column.key === "CERRADAS" ? "bg-emerald-600" : column.key === "BLOQUEADAS" ? "bg-rose-600" : column.key === "EN_PROCESO" ? "bg-blue-600" : "bg-amber-500"}`} />
                      <div className="p-4">
                        <Link className="group flex items-start justify-between gap-3" href={`/genba/${walk.id}`}>
                          <span className="min-w-0"><span className="block text-[10px] font-extrabold uppercase text-brand-700">{walk.folio}</span><span className="mt-1 block truncate text-base font-extrabold text-ink">{walk.areaName}</span><span className="mt-1 block text-[11px] font-bold text-slate-500">{walk.visitDate.toLocaleDateString("es-MX")}</span></span>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
                        </Link>
                        <div className="mt-4"><ProgressMeter label={`${progress.closed} de ${progress.total} realizadas`} percent={progress.percent} /></div>
                        {overdue ? <p className="mt-3 flex items-center gap-2 text-xs font-extrabold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />{overdue} {overdue === 1 ? "actividad vencida" : "actividades vencidas"}</p> : null}
                      </div>
                      <div className="border-t border-line bg-slate-50/70">
                        {activities.slice(0, 3).map((activity) => (
                          <Link className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-2 border-b border-line px-3 py-3 transition last:border-0 hover:bg-white" href={`/genba/${walk.id}#actividad-${activity.id}`} key={activity.id}>
                            <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold ${["COMPLETADA", "CANCELADA"].includes(activity.status) ? "bg-emerald-100 text-emerald-800" : activity.status === "BLOQUEADA" ? "bg-rose-100 text-rose-800" : "bg-white text-slate-700"}`}>{activity.status === "COMPLETADA" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : activity.number}</span>
                            <span className="min-w-0"><span className="line-clamp-2 block text-xs font-extrabold leading-4 text-slate-800">{activity.action ?? activity.problem}</span><span className={`mt-1 block truncate text-[10px] font-bold ${isWorkItemOverdue(activity) ? "text-rose-700" : "text-slate-500"}`}>{activity.owner?.name ?? "Sin responsable"} · {activity.dueDate ? activity.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span></span>
                            <WorkStatusPill status={activity.status} />
                          </Link>
                        ))}
                        {activities.length ? <Link className="flex min-h-11 items-center justify-between gap-3 bg-white px-3 py-2 text-xs font-extrabold text-brand-700 hover:bg-brand-50" href={`/genba/${walk.id}`}><span>Ver plan completo · {activities.length} actividades</span><ArrowRight className="h-4 w-4" aria-hidden /></Link> : <p className="px-4 py-5 text-center text-xs font-bold text-slate-500">Sin actividades registradas</p>}
                      </div>
                    </article>
                  );
                })}
                {!items.length ? <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500"><Footprints className="mx-auto mb-2 h-5 w-5" aria-hidden />Sin recorridos</div> : null}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
