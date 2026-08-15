import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Coins, FileSpreadsheet, FolderKanban, Footprints, GraduationCap, ShieldAlert, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { SectionHeading } from "@/components/section-heading";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PreviewReport = {
  generatedAt: string;
  mode: string;
  kaizen: { projectCount: number; actionCount: number; conflicts: Array<{ number: number; options: string[]; selected: string }> };
  genba: { walkCount: number; actionCount: number; evidenceReferences: number; unassignedResponsibilities: number; missingDueDates: number };
  whiteBelt: { participantCount: number; projectCandidates: number; coachCandidates: number; coinsSuggested: number; coinsAwarded: number };
  pending: Array<{ key: string; count: number; message: string }>;
};

function readReport(value?: string): PreviewReport | null {
  if (!value) return null;
  try { return JSON.parse(value) as PreviewReport; } catch { return null; }
}

const projectStatusLabels = {
  PENDIENTE_CHARTER: "Pendiente de Charter",
  PLANIFICACION: "Planificacion",
  EN_CURSO: "En curso",
  EN_PAUSA: "En pausa",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
} as const;

export default async function Migration2026Page() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [setting, projects, walks, program] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "import2026PreviewReport" } }),
    prisma.kaizenProject.findMany({
      where: { folio: { startsWith: "XLS-KZN-" } },
      include: { leader: true, activities: { select: { status: true } } },
      orderBy: { number: "asc" },
    }),
    prisma.genbaWalk.findMany({
      where: { folio: { startsWith: "XLS-GENBA-" } },
      include: { activities: { select: { status: true } } },
      orderBy: { number: "desc" },
    }),
    prisma.trainingProgram.findUnique({
      where: { name: "White Belt 2026" },
      include: { sessions: { include: { enrollments: { include: { participant: { include: { orgUnit: { include: { plant: true } } } } } } } } },
    }),
  ]);
  const report = readReport(setting?.value);
  const participants = program?.sessions.flatMap((session) => session.enrollments.map((enrollment) => ({ ...enrollment.participant, route: session.notes?.includes("Coach / mentor") ? "Coach / mentor" : "Proyecto" }))) ?? [];
  const statusCounts = new Map(projects.map((project) => [project.status, projects.filter((item) => item.status === project.status).length]));
  const openGenbaActions = walks.flatMap((walk) => walk.activities).filter((activity) => !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status)).length;
  const completedGenbaActions = walks.flatMap((walk) => walk.activities).filter((activity) => activity.status === "COMPLETADA").length;

  return (
    <>
      <PageHeader
        eyebrow="Vista local · Conciliacion antes de publicar"
        title="Migracion operativa 2026"
        description="Lectura consolidada de los Excel actuales y de la cohorte White Belt. Esta vista separa lo utilizable de lo que necesita una decision antes de pasar a produccion."
        actions={<><Link className="btn btn-secondary" href="/kaizen"><FolderKanban className="h-4 w-4" aria-hidden />Ver Kaizen</Link><Link className="btn btn-secondary" href="/genba"><Footprints className="h-4 w-4" aria-hidden />Ver GENBA</Link><Link className="btn btn-primary" href="/entrenamientos"><GraduationCap className="h-4 w-4" aria-hidden />White Belt</Link></>}
      />

      {!report ? <section className="surface border-dashed p-8 text-center"><FileSpreadsheet className="mx-auto h-8 w-8 text-slate-400" aria-hidden /><h2 className="mt-3 text-lg font-extrabold text-ink">Aun no hay una importacion de prueba</h2><p className="mt-1 text-sm text-slate-500">Ejecuta el importador local para generar la conciliacion.</p></section> : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumen de importacion">
            {[
              { label: "Kaizens", value: report.kaizen.projectCount, detail: `${report.kaizen.actionCount} actividades`, icon: FolderKanban },
              { label: "Recorridos GENBA", value: report.genba.walkCount, detail: `${report.genba.actionCount} acciones reales`, icon: Footprints },
              { label: "White Belt", value: report.whiteBelt.participantCount, detail: "40 proyecto · 3 coaches", icon: UsersRound },
              { label: "Coins sugeridas", value: report.whiteBelt.coinsSuggested.toLocaleString("es-MX"), detail: "0 otorgadas por ahora", icon: Coins },
              { label: "Decisiones pendientes", value: report.pending.length, detail: "Antes de publicar", icon: ShieldAlert },
            ].map((metric) => <div className="surface border-t-4 border-t-slate-950 p-4" key={metric.label}><metric.icon className="h-5 w-5 text-brand-700" aria-hidden /><p className="mt-4 text-3xl font-black tabular-nums text-ink">{metric.value}</p><p className="mt-1 text-sm font-extrabold text-ink">{metric.label}</p><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></div>)}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <SectionHeading title="Lo que ya puede verse" description="Datos normalizados en la copia local, con navegación hacia el seguimiento real." tone="red" />
              <div className="divide-y divide-line border-y border-line">
                {[
                  { title: "Portafolio Kaizen", description: `${projects.length} proyectos y actividades agrupadas por proyecto`, href: "/kaizen", icon: FolderKanban },
                  { title: "Recorridos GENBA", description: `${walks.length} recorridos; cada recorrido conserva sus acciones dentro`, href: "/genba", icon: Footprints },
                  { title: "Cohorte White Belt 2026", description: `${participants.length} personas inscritas como pendientes de certificacion`, href: "/entrenamientos", icon: GraduationCap },
                ].map((item) => <Link className="flex items-center gap-4 py-4 hover:bg-slate-50" href={item.href} key={item.title}><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-950 text-white"><item.icon className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-ink">{item.title}</span><span className="mt-0.5 block text-xs text-slate-500">{item.description}</span></span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /></Link>)}
              </div>
            </div>
            <div>
              <SectionHeading title="Antes de publicar" description="La importacion no toma decisiones irreversibles por nosotros." />
              <div className="divide-y divide-line border-y border-line">
                {report.pending.map((item) => <div className="flex gap-3 py-4" key={item.key}><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden /><div><p className="text-sm font-extrabold text-ink">{item.count.toLocaleString("es-MX")}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.message}</p></div></div>)}
              </div>
            </div>
          </section>

          <section className="mt-8">
            <SectionHeading title="Salud del portafolio Kaizen" description="Avance calculado con las actividades importadas; el porcentaje del Excel queda como referencia en cada proyecto." />
            <div className="mb-4 flex flex-wrap gap-2">{[...statusCounts.entries()].map(([status, count]) => <span className="status-pill bg-slate-100 text-slate-700" key={status}>{projectStatusLabels[status]} · {count}</span>)}</div>
            <div className="table-wrap"><table className="data-table"><thead><tr><th>Kaizen</th><th>Proyecto</th><th>Planta</th><th>Lider</th><th>Avance por actividades</th><th>Estatus</th><th></th></tr></thead><tbody>{projects.slice(0, 15).map((project) => { const closed = project.activities.filter((activity) => ["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status)).length; const progress = project.activities.length ? Math.round(closed / project.activities.length * 100) : 0; return <tr key={project.id}><td className="font-extrabold text-brand-700">#{String(project.number).padStart(3, "0")}</td><td className="min-w-64 font-bold text-ink">{project.title}</td><td>{project.plant ?? "Por confirmar"}</td><td>{project.leader.name}</td><td className="min-w-52"><ProgressMeter label={`${closed} de ${project.activities.length}`} percent={progress} /></td><td>{projectStatusLabels[project.status]}</td><td><Link aria-label={`Abrir Kaizen ${project.number}`} className="icon-button h-9 w-9 min-w-9" href={`/kaizen/${project.id}`}><ArrowRight className="h-4 w-4" aria-hidden /></Link></td></tr>; })}</tbody></table></div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeading title="GENBA conciliado" description="El resumen del Excel no se usa para calcular el tablero; los indicadores salen de las acciones normalizadas." />
              <div className="grid grid-cols-2 gap-3"><div className="border-l-4 border-l-amber-500 bg-amber-50 p-4"><p className="text-2xl font-black tabular-nums text-ink">{openGenbaActions}</p><p className="mt-1 text-xs font-bold text-slate-600">Acciones abiertas</p></div><div className="border-l-4 border-l-emerald-600 bg-emerald-50 p-4"><p className="text-2xl font-black tabular-nums text-ink">{completedGenbaActions}</p><p className="mt-1 text-xs font-bold text-slate-600">Acciones cerradas</p></div></div>
              <p className="mt-4 flex gap-2 text-xs leading-5 text-slate-600"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />El resumen original muestra 95 hallazgos, pero sus formulas no abarcan toda la Base. La vista local calcula directamente desde los registros vigentes.</p>
            </div>
            <div>
              <SectionHeading title="White Belt 2026" description="La identidad queda pendiente; no se inventan correos ni numeros de empleado." />
              <div className="divide-y divide-line border-y border-line">{participants.slice(0, 8).map((participant) => <div className="grid gap-1 py-3 sm:grid-cols-[1fr_120px_120px] sm:items-center" key={participant.id}><div><p className="text-sm font-extrabold text-ink">{participant.name}</p><p className="text-xs text-slate-500">{participant.jobTitle}</p></div><span className="text-xs font-bold text-slate-600">{participant.orgUnit?.plant.name ?? "Planta por vincular"}</span><span className="text-xs font-extrabold text-amber-700">{participant.route}</span></div>)}</div>
              <Link className="btn btn-secondary mt-4 inline-flex min-h-11 items-center gap-2" href="/entrenamientos">Revisar las 43 personas <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
          </section>

          <section className="mt-8 border-y border-line py-5">
            <div className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden /><div><h2 className="text-sm font-extrabold text-ink">Vista aislada y reversible</h2><p className="mt-1 text-xs leading-5 text-slate-600">Nada de esta prueba se ha enviado a la base en linea. La publicacion se hara solo despues de confirmar el conflicto del Kaizen #034, la identidad White Belt, las evidencias y el tratamiento de TWI.</p></div></div>
          </section>
        </>
      )}
    </>
  );
}
