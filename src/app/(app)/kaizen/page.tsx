import Link from "next/link";
import { AlertTriangle, ArrowRight, Banknote, CalendarRange, CheckCircle2, Clock3, FolderKanban, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { BarList, KpiCard } from "@/components/mini-charts";
import { KaizenStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { SectionHeading } from "@/components/section-heading";
import { isWorkItemOverdue, kaizenStatusLabels, workProgress } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export default async function KaizenDashboardPage() {
  const { canManage } = await requireKaizenAccess();
  const projects = await prisma.kaizenProject.findMany({
    include: { leader: true, activities: true, attachments: true, sourceIdea: true },
    orderBy: [{ status: "asc" }, { number: "desc" }]
  });
  const progressRows = projects.map((project) => ({ project, progress: workProgress(project.activities) }));
  const active = projects.filter((project) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status)).length;
  const pendingCharter = projects.filter((project) => project.status === "PENDIENTE_CHARTER");
  const completed = projects.filter((project) => project.status === "COMPLETADO").length;
  const overdue = projects.flatMap((project) => project.activities).filter(isWorkItemOverdue).length;
  const averageProgress = progressRows.length ? Math.round(progressRows.reduce((sum, row) => sum + row.progress.percent, 0) / progressRows.length) : 0;
  const estimatedSavings = projects.reduce((sum, project) => sum + (project.estimatedSavings ?? 0), 0);
  const statusRows = Object.entries(kaizenStatusLabels).map(([status, label]) => ({ label, value: projects.filter((project) => project.status === status).length })).filter((row) => row.value > 0);

  return (
    <>
      <PageHeader
        eyebrow="Proyectos Kaizen · Dirección y seguimiento"
        title="Panel de Proyectos Kaizen"
        description="Avance calculado desde actividades, responsables, fechas y evidencias del proyecto."
        actions={canManage ? <Link className="btn btn-primary" href="/kaizen/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo Kaizen</Link> : undefined}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard detail="Proyectos en ejecución o planeación" icon={FolderKanban} label="Activos" tone="amber" value={active} />
        <KpiCard detail="Esperan documento inicial" icon={Clock3} label="Sin charter" tone="red" value={pendingCharter.length} />
        <KpiCard detail="Promedio por actividades cerradas" icon={CheckCircle2} label="Avance global" tone="green" value={`${averageProgress}%`} />
        <KpiCard detail="Actividades fuera de compromiso" icon={AlertTriangle} label="Vencidas" tone="red" value={overdue} />
        <KpiCard detail="Suma de beneficios estimados" icon={Banknote} label="Ahorro estimado" tone="dark" value={estimatedSavings ? `$${estimatedSavings.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "$0"} />
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <SectionHeading count={pendingCharter.length} description="Proyectos creados que todavía no tienen su documento base." title="Carpetas pendientes de Project Charter" tone="dark" />
          {!pendingCharter.length ? <EmptyState title="No hay charters pendientes" description="Todos los proyectos tienen su carpeta inicial preparada." /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingCharter.map((project) => (
                <Link className="surface surface-interactive block rounded-lg border-l-4 border-l-amber-500 p-4" href={`/kaizen/${project.id}`} key={project.id}>
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold text-amber-700">Kaizen #{String(project.number).padStart(3, "0")}</p><h2 className="mt-1 text-base font-extrabold leading-5 text-ink">{project.title}</h2></div><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /></div>
                  <p className="mt-3 text-xs text-slate-500">Líder: <span className="font-bold text-slate-700">{project.leader.name}</span></p>
                  <p className="mt-1 text-xs text-slate-500">Compromiso: {project.endDate.toLocaleDateString("es-MX")}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
        <article className="surface rounded-lg p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-slate-500">Portafolio</p><h2 className="mt-1 text-lg font-extrabold text-ink">Estado de proyectos</h2></div><CalendarRange className="h-5 w-5 text-amber-700" aria-hidden /></div>
          <div className="mt-5">{statusRows.length ? <BarList color="#a16207" rows={statusRows} /> : <p className="text-sm text-slate-500">Sin proyectos registrados.</p>}</div>
          <div className="mt-5 border-t border-line pt-4"><p className="text-sm font-extrabold text-ink">{completed} completados</p><p className="mt-1 text-xs leading-5 text-slate-500">Los proyectos se cierran automáticamente cuando todas sus actividades quedan completadas o justificadas.</p></div>
        </article>
      </section>

      <section className="mt-9">
        <SectionHeading count={projects.length} description="Cada porcentaje proviene de las actividades no combinadas del proyecto." title="Portafolio completo" />
        {!projects.length ? <EmptyState title="Todavía no hay proyectos Kaizen" description="Crea uno manualmente o clasifica una idea como Kaizen y asigna a su líder." /> : null}
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {progressRows.map(({ project, progress }) => (
            <Link className="surface surface-interactive block min-h-64 rounded-lg p-5" href={`/kaizen/${project.id}`} key={project.id}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-extrabold uppercase text-amber-700">Kaizen #{String(project.number).padStart(3, "0")}</p><h2 className="mt-1 line-clamp-2 text-lg font-extrabold leading-6 text-ink">{project.title}</h2></div><KaizenStatusPill status={project.status} /></div>
              <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{project.objective}</p>
              <div className="mt-5"><ProgressMeter label={`${progress.closed} de ${progress.total} actividades cerradas`} percent={progress.percent} /></div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs"><div><p className="font-bold text-slate-500">Líder</p><p className="mt-1 truncate font-extrabold text-slate-800">{project.leader.name}</p></div><div><p className="font-bold text-slate-500">Fecha objetivo</p><p className="mt-1 font-extrabold text-slate-800">{project.endDate.toLocaleDateString("es-MX")}</p></div></div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
