import Link from "next/link";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { updateKaizenDatesAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { workProgress } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type GanttProps = { searchParams: Promise<{ year?: string; error?: string }> };

function isoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const first = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - first.getTime()) / 86400000) + 1) / 7);
}

function mondayOfWeek(year: number, week: number) {
  const fourth = new Date(Date.UTC(year, 0, 4));
  const day = fourth.getUTCDay() || 7;
  const monday = new Date(fourth);
  monday.setUTCDate(fourth.getUTCDate() - day + 1 + (week - 1) * 7);
  return monday;
}

const barTone = {
  PENDIENTE_CHARTER: "bg-amber-400 text-slate-950",
  PLANIFICACION: "bg-sky-500 text-white",
  EN_CURSO: "bg-emerald-600 text-white",
  EN_PAUSA: "bg-slate-500 text-white",
  COMPLETADO: "bg-slate-950 text-white",
  CANCELADO: "bg-rose-600 text-white"
};

export default async function KaizenGanttPage({ searchParams }: GanttProps) {
  const { canManage } = await requireKaizenAccess();
  const query = await searchParams;
  const currentYear = new Date().getFullYear();
  const parsedYear = Number(query.year || currentYear);
  const year = Number.isInteger(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100 ? parsedYear : currentYear;
  const yearStart = new Date(`${year}-01-01T00:00:00`);
  const yearEnd = new Date(`${year}-12-31T23:59:59`);
  const projects = await prisma.kaizenProject.findMany({
    where: { startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
    include: { leader: true, activities: true },
    orderBy: [{ startDate: "asc" }, { number: "asc" }]
  });
  const weeks = Array.from({ length: 53 }, (_, index) => index + 1);
  const gridStyle = { gridTemplateColumns: "340px repeat(53, 34px)" };

  return (
    <>
      <PageHeader
        eyebrow="Proyectos Kaizen · Calendario anual"
        title={`Gantt Kaizen ${year}`}
        description="Las fechas se editan aquí o en la carpeta del proyecto; ambas vistas usan el mismo registro."
        actions={<div className="flex items-center gap-2"><Link aria-label="Año anterior" className="icon-button" href={`/kaizen/gantt?year=${year - 1}`}><ChevronLeft className="h-4 w-4" aria-hidden /></Link><span className="min-w-16 text-center text-sm font-extrabold">{year}</span><Link aria-label="Año siguiente" className="icon-button" href={`/kaizen/gantt?year=${year + 1}`}><ChevronRight className="h-4 w-4" aria-hidden /></Link></div>}
      />
      {query.error ? <div className="alert alert-danger mb-5">La fecha final debe ser posterior a la fecha de inicio.</div> : null}
      {!projects.length ? <EmptyState title="No hay proyectos en este año" description="Cambia el año o crea un nuevo proyecto Kaizen." /> : (
        <section className="surface overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <div className="gantt-grid gantt-header" style={gridStyle}>
              <div className="gantt-sticky-cell px-4 py-3"><p className="text-xs font-extrabold uppercase text-slate-500">Proyecto, fechas y avance</p></div>
              {weeks.map((week) => {
                const date = mondayOfWeek(year, week);
                const month = date.toLocaleDateString("es-MX", { month: "short", timeZone: "UTC" });
                return <div className="border-l border-line py-2 text-center" key={week}><span className="block text-[9px] font-bold uppercase text-slate-400">{week === 1 || date.getUTCDate() <= 7 ? month : ""}</span><span className="block text-[10px] font-extrabold text-slate-600">{week}</span></div>;
              })}
            </div>
            {projects.map((project) => {
              const progress = workProgress(project.activities);
              const start = project.startDate.getFullYear() < year ? 1 : Math.max(1, isoWeek(project.startDate));
              const end = project.endDate.getFullYear() > year ? 53 : Math.min(53, isoWeek(project.endDate));
              return (
                <div className="gantt-grid gantt-project-row" style={gridStyle} key={project.id}>
                  <div className="gantt-sticky-cell border-t border-line bg-white p-3">
                    <div className="flex items-start justify-between gap-2"><Link className="min-w-0 text-sm font-extrabold text-ink hover:text-amber-700" href={`/kaizen/${project.id}`}>#{String(project.number).padStart(3, "0")} · {project.title}</Link><span className="shrink-0 text-[10px] font-bold text-slate-500">{project.leader.name}</span></div>
                    {canManage ? (
                      <form action={updateKaizenDatesAction} className="mt-2 grid grid-cols-[1fr_1fr_34px] gap-1.5">
                        <input name="projectId" type="hidden" value={project.id} />
                        <input aria-label={`Inicio de ${project.folio}`} className="field min-h-8 px-1.5 py-1 text-[10px]" defaultValue={project.startDate.toISOString().slice(0, 10)} name="startDate" type="date" />
                        <input aria-label={`Cierre de ${project.folio}`} className="field min-h-8 px-1.5 py-1 text-[10px]" defaultValue={project.endDate.toISOString().slice(0, 10)} name="endDate" type="date" />
                        <button aria-label={`Guardar fechas de ${project.folio}`} className="icon-button h-8 min-h-8 w-8 min-w-8" type="submit"><Save className="h-3.5 w-3.5" aria-hidden /></button>
                      </form>
                    ) : <p className="mt-2 text-[10px] font-bold text-slate-500">{project.startDate.toLocaleDateString("es-MX")} → {project.endDate.toLocaleDateString("es-MX")}</p>}
                    <div className="mt-2"><ProgressMeter label={`${progress.closed}/${progress.total} actividades`} percent={progress.percent} /></div>
                  </div>
                  {weeks.map((week) => <div className={`border-l border-t border-line ${week % 4 === 0 ? "bg-slate-50" : "bg-white"}`} key={week} />)}
                  <Link className={`gantt-bar ${barTone[project.status]}`} href={`/kaizen/${project.id}`} style={{ gridColumn: `${start + 1} / ${Math.max(start + 2, end + 2)}`, gridRow: 1 }} title={`${project.folio}: ${project.startDate.toLocaleDateString("es-MX")} - ${project.endDate.toLocaleDateString("es-MX")}`}><span>{progress.percent}%</span></Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span><strong className="text-slate-700">Gris alternado:</strong> bloques de cuatro semanas</span><span><strong className="text-slate-700">Barra:</strong> periodo vigente del proyecto</span><span><strong className="text-slate-700">Número:</strong> semana del año</span></div>
    </>
  );
}
