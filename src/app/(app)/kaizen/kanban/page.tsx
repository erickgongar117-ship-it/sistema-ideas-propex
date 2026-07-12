import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import type { WorkItemStatus } from "@prisma/client";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { WorkStatusPill } from "@/components/module-status";
import { isWorkItemOverdue } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

const columns: Array<{ title: string; statuses: WorkItemStatus[]; tone: string }> = [
  { title: "Pendientes", statuses: ["PENDIENTE"], tone: "border-amber-400" },
  { title: "En proceso", statuses: ["EN_PROCESO"], tone: "border-blue-500" },
  { title: "Bloqueadas", statuses: ["BLOQUEADA"], tone: "border-rose-500" },
  { title: "Cerradas", statuses: ["COMPLETADA", "CANCELADA"], tone: "border-emerald-600" }
];

export default async function KaizenKanbanPage() {
  await requireKaizenAccess();
  const activities = await prisma.kaizenActivity.findMany({
    where: { status: { not: "COMBINADA" } },
    include: { project: true, owner: true, attachments: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
  });
  return (
    <>
      <PageHeader eyebrow="Proyectos Kaizen · Flujo visual" title="Kanban de actividades" description="Todas las acciones del portafolio agrupadas por su estado real." />
      {!activities.length ? <EmptyState title="No hay actividades Kaizen" description="Las actividades aparecerán aquí cuando se agreguen a un proyecto." /> : null}
      <section className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => {
          const items = activities.filter((activity) => column.statuses.includes(activity.status));
          return (
            <div className="min-w-0" key={column.title}>
              <div className={`mb-3 flex items-center justify-between border-b-2 ${column.tone} pb-2`}><h2 className="text-sm font-extrabold text-ink">{column.title}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-700">{items.length}</span></div>
              <div className="grid gap-3">
                {items.map((activity) => (
                  <Link className="surface surface-interactive block rounded-lg p-4" href={`/kaizen/${activity.projectId}#actividad-${activity.id}`} key={activity.id}>
                    <div className="flex items-start justify-between gap-2"><p className="text-[10px] font-extrabold uppercase text-amber-700">{activity.project.folio} · #{activity.number}</p><ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden /></div>
                    <h3 className="mt-2 line-clamp-3 text-sm font-extrabold leading-5 text-ink">{activity.action}</h3>
                    <p className="mt-2 truncate text-xs text-slate-500">{activity.owner?.name ?? "Sin responsable"}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3"><WorkStatusPill status={activity.status} /><span className={`text-[11px] font-bold ${isWorkItemOverdue(activity) ? "text-rose-700" : "text-slate-500"}`}>{activity.dueDate ? activity.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span></div>
                  </Link>
                ))}
                {!items.length ? <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500"><FolderKanban className="mx-auto mb-2 h-5 w-5" aria-hidden />Sin actividades</div> : null}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
