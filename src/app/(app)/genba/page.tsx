import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Footprints, Plus, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { BarList, KpiCard } from "@/components/mini-charts";
import { GenbaStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { SectionHeading } from "@/components/section-heading";
import { attendancePercent, isWorkItemOverdue, workProgress } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export default async function GenbaDashboardPage() {
  const { canManage } = await requireGenbaAccess();
  const walks = await prisma.genbaWalk.findMany({
    include: { coordinator: true, activities: { include: { owner: true } } },
    orderBy: { visitDate: "desc" }
  });
  const allActivities = walks.flatMap((walk) => walk.activities);
  const relevantActivities = allActivities.filter((activity) => activity.status !== "COMBINADA");
  const openActivities = relevantActivities.filter((activity) => !["COMPLETADA", "CANCELADA"].includes(activity.status));
  const closedActivities = relevantActivities.length - openActivities.length;
  const overdue = openActivities.filter(isWorkItemOverdue).length;
  const averageAttendance = walks.length ? Math.round(walks.reduce((sum, walk) => sum + attendancePercent(walk.expectedDepartments, walk.attendedDepartments), 0) / walks.length) : 0;
  const areaMap = new Map<string, number>();
  walks.forEach((walk) => areaMap.set(walk.areaName, (areaMap.get(walk.areaName) ?? 0) + walk.activities.filter((activity) => activity.status !== "COMBINADA").length));
  const areaRows = [...areaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, value]) => ({ label, value }));

  return (
    <>
      <PageHeader eyebrow="Recorridos GENBA · Gestión visual" title="Panel de Recorridos GENBA" description="Hallazgos, asistencia y cumplimiento de las actividades observadas en piso." actions={canManage ? <Link className="btn btn-primary" href="/genba/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo recorrido</Link> : undefined} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard detail="Recorridos registrados" icon={Footprints} label="GENBAs" tone="red" value={walks.length} />
        <KpiCard detail="Acciones que requieren seguimiento" icon={ClipboardList} label="Actividades abiertas" tone="amber" value={openActivities.length} />
        <KpiCard detail="Completadas o cerradas con justificación" icon={CheckCircle2} label="Actividades cerradas" tone="green" value={closedActivities} />
        <KpiCard detail="Fuera de la fecha compromiso" icon={AlertTriangle} label="Vencidas" tone="red" value={overdue} />
        <KpiCard detail="Promedio de departamentos asistentes" icon={UsersRound} label="Asistencia" tone="dark" value={`${averageAttendance}%`} />
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <SectionHeading count={walks.length} description="Los cinco hallazgos principales permanecen juntos en cada recorrido." title="Recorridos recientes" tone="red" />
          {!walks.length ? <EmptyState title="Todavía no hay recorridos GENBA" description="Crea el primero con sus cinco actividades principales." /> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {walks.slice(0, 8).map((walk) => {
              const progress = workProgress(walk.activities);
              const attendance = attendancePercent(walk.expectedDepartments, walk.attendedDepartments);
              return <Link className="surface surface-interactive block rounded-lg p-5" href={`/genba/${walk.id}`} key={walk.id}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-red-700">GENBA #{String(walk.number).padStart(3, "0")}</p><h2 className="mt-1 text-lg font-extrabold text-ink">{walk.areaName}</h2><p className="mt-1 text-xs text-slate-500">{walk.visitDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</p></div><GenbaStatusPill status={walk.status} /></div><div className="mt-5"><ProgressMeter label={`${progress.closed} de ${progress.total} actividades cerradas`} percent={progress.percent} /></div><div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs"><span className="font-bold text-slate-500">Coordinador: <span className="text-slate-700">{walk.coordinator.name}</span></span><span className="font-extrabold text-red-700">{attendance}% asistencia</span></div></Link>;
            })}
          </div>
        </div>
        <article className="surface rounded-lg p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-slate-500">Concentración</p><h2 className="mt-1 text-lg font-extrabold text-ink">Actividades por área</h2></div><Footprints className="h-5 w-5 text-red-700" aria-hidden /></div>
          <div className="mt-5">{areaRows.length ? <BarList color="#c81e2d" rows={areaRows} /> : <p className="text-sm text-slate-500">Sin datos disponibles.</p>}</div>
          <div className="mt-5 border-t border-line pt-4"><p className="text-sm font-extrabold text-ink">{openActivities.length ? Math.round((closedActivities / relevantActivities.length) * 100) : relevantActivities.length ? 100 : 0}% de implementación</p><p className="mt-1 text-xs leading-5 text-slate-500">Cálculo automático sobre las actividades vigentes, excluyendo duplicados combinados.</p></div>
        </article>
      </section>

      <section className="mt-9">
        <SectionHeading count={openActivities.length} description="Prioriza responsables y fechas próximas." title="Próximos compromisos" />
        {!openActivities.length ? <EmptyState title="No hay actividades abiertas" description="Todas las actividades GENBA están atendidas." /> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>GENBA</th><th>Área</th><th>Actividad</th><th>Responsable</th><th>Compromiso</th><th></th></tr></thead><tbody>{openActivities.slice(0, 12).map((activity) => { const walk = walks.find((item) => item.id === activity.walkId)!; return <tr key={activity.id}><td className="font-extrabold text-red-700">{walk.folio}</td><td>{walk.areaName}</td><td className="min-w-64">{activity.action ?? activity.problem}</td><td>{activity.owner?.name ?? "Sin asignar"}</td><td className={isWorkItemOverdue(activity) ? "font-extrabold text-rose-700" : ""}>{activity.dueDate ? activity.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</td><td><Link aria-label={`Abrir ${walk.folio}`} className="icon-button h-9 w-9 min-w-9" href={`/genba/${walk.id}`}><ArrowRight className="h-4 w-4" aria-hidden /></Link></td></tr>; })}</tbody></table></div>
        )}
      </section>
    </>
  );
}
