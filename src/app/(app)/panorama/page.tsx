import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Download,
  FolderKanban,
  GraduationCap,
  Lightbulb,
  MapPinned,
  Users
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { attendancePercent, workProgress } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const CLOSED_IDEA_STATUSES = new Set(["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"]);
const CLOSED_WORK_STATUSES = new Set(["COMPLETADA", "CANCELADA", "COMBINADA"]);

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className="surface metric-depth min-h-36 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tabular-nums text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function ProgressRow({
  title,
  href,
  status,
  detail,
  progress,
  progressLabel,
  icon: Icon
}: {
  title: string;
  href: string;
  status: string;
  detail: string;
  progress: number;
  progressLabel: string;
  icon: LucideIcon;
}) {
  const normalizedProgress = clamp(progress);
  return (
    <Link className="group grid gap-4 border-b border-line px-5 py-4 last:border-b-0 hover:bg-slate-50 sm:grid-cols-[minmax(150px,0.8fr)_minmax(220px,1.5fr)_auto] sm:items-center" href={href}>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-panel text-slate-700">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block font-extrabold text-ink">{title}</span>
          <span className="mt-0.5 block text-xs font-bold text-slate-500">{status}</span>
        </span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center justify-between gap-3 text-xs">
          <span className="font-bold text-slate-600">{progressLabel}</span>
          <span className="font-black tabular-nums text-slate-900">{normalizedProgress}%</span>
        </span>
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full rounded-full bg-brand-500" style={{ width: `${normalizedProgress}%` }} />
        </span>
        <span className="mt-2 block text-xs text-slate-500">{detail}</span>
      </span>
      <ArrowRight className="hidden h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 sm:block" aria-hidden />
    </Link>
  );
}

export default async function PanoramaPage() {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const now = new Date();

  const [ideas, kaizenProjects, genbaWalks, trainingPrograms, coinTransactions, participants, users] = await Promise.all([
    prisma.idea.findMany({
      select: {
        status: true,
        dueDate: true,
        pointsAssigned: true,
        supportRequests: { select: { status: true } }
      }
    }),
    prisma.kaizenProject.findMany({
      select: {
        status: true,
        estimatedSavings: true,
        realSavings: true,
        activities: { select: { status: true, dueDate: true } }
      }
    }),
    prisma.genbaWalk.findMany({
      select: {
        status: true,
        expectedDepartments: true,
        attendedDepartments: true,
        activities: { select: { status: true, dueDate: true, promotedKaizenActivity: { select: { id: true } } } }
      }
    }),
    prisma.trainingProgram.findMany({
      select: {
        active: true,
        sessions: {
          select: {
            sessionDate: true,
            enrollments: { select: { status: true, coinsAwarded: true } }
          }
        }
      }
    }),
    prisma.coinTransaction.findMany({ select: { amount: true, type: true, participantId: true } }),
    prisma.participant.findMany({
      select: { id: true, active: true, coinTransactions: { select: { amount: true } } }
    }),
    prisma.user.findMany({ select: { active: true, participant: { select: { id: true } } } })
  ]);

  const openIdeas = ideas.filter((idea) => !CLOSED_IDEA_STATUSES.has(idea.status));
  const closedIdeas = ideas.filter((idea) => idea.status === "CERRADA");
  const overdueIdeas = ideas.filter((idea) => idea.dueDate && idea.dueDate < now && !CLOSED_IDEA_STATUSES.has(idea.status));
  const pendingInitialIdeas = ideas.filter((idea) => ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"].includes(idea.status));
  const pendingSupportReviews = ideas.reduce((sum, idea) => sum + idea.supportRequests.filter((request) => request.status === "PENDING").length, 0);

  const kaizenActivities = kaizenProjects.flatMap((project) => project.activities).filter((activity) => activity.status !== "COMBINADA");
  const kaizenProgress = workProgress(kaizenActivities);
  const activeKaizens = kaizenProjects.filter((project) => ["PENDIENTE_CHARTER", "PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status));
  const overdueKaizen = kaizenActivities.filter((activity) => activity.dueDate && activity.dueDate < now && !CLOSED_WORK_STATUSES.has(activity.status));
  const blockedKaizen = kaizenActivities.filter((activity) => activity.status === "BLOQUEADA");

  const genbaActivities = genbaWalks.flatMap((walk) => walk.activities).filter((activity) => activity.status !== "COMBINADA");
  const genbaProgress = workProgress(genbaActivities);
  const openGenbas = genbaWalks.filter((walk) => walk.status === "ABIERTO");
  const overdueGenba = genbaActivities.filter((activity) => activity.dueDate && activity.dueDate < now && !CLOSED_WORK_STATUSES.has(activity.status));
  const blockedGenba = genbaActivities.filter((activity) => activity.status === "BLOQUEADA");
  const promotedToKaizen = genbaActivities.filter((activity) => activity.promotedKaizenActivity).length;
  const averageAttendance = genbaWalks.length
    ? Math.round(genbaWalks.reduce((sum, walk) => sum + attendancePercent(walk.expectedDepartments, walk.attendedDepartments), 0) / genbaWalks.length)
    : 0;

  const trainingSessions = trainingPrograms.flatMap((program) => program.sessions);
  const enrollments = trainingSessions.flatMap((session) => session.enrollments.map((enrollment) => ({ ...enrollment, sessionDate: session.sessionDate })));
  const completedEnrollments = enrollments.filter((enrollment) => enrollment.status === "COMPLETED");
  const pendingPastTraining = enrollments.filter((enrollment) => enrollment.status === "REGISTERED" && enrollment.sessionDate < now);

  const coinBalance = coinTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const coinsAwarded = coinTransactions.filter((transaction) => transaction.type === "AWARD").reduce((sum, transaction) => sum + transaction.amount, 0);
  const coinsRedeemed = Math.abs(coinTransactions.filter((transaction) => transaction.type === "REDEMPTION").reduce((sum, transaction) => sum + transaction.amount, 0));
  const participantsWithMovements = new Set(coinTransactions.map((transaction) => transaction.participantId)).size;
  const negativeBalances = participants.filter((participant) => participant.coinTransactions.reduce((sum, transaction) => sum + transaction.amount, 0) < 0).length;
  const activePeople = participants.filter((participant) => participant.active).length + users.filter((user) => user.active && !user.participant).length;

  const alerts = [
    { severity: 3, count: overdueIdeas.length, title: "Ideas con fecha vencida", detail: "Requieren responsable, nueva fecha o cierre.", href: "/vencidas" },
    { severity: 2, count: pendingInitialIdeas.length, title: "Ideas pendientes de revision inicial", detail: "Esperan decision del jefe o supervisor asignado.", href: user.role === "ADMIN" ? "/supervisor" : "/seguimientos?vista=equipo" },
    { severity: 2, count: pendingSupportReviews, title: "Validaciones de apoyo pendientes", detail: "Calidad, Seguridad, Mantenimiento u otra area deben responder.", href: "/kanban" },
    { severity: 3, count: overdueKaizen.length + blockedKaizen.length, title: "Compromisos Kaizen en riesgo", detail: `${overdueKaizen.length} vencidos y ${blockedKaizen.length} bloqueados.`, href: "/kaizen" },
    { severity: 3, count: overdueGenba.length + blockedGenba.length, title: "Compromisos GENBA en riesgo", detail: `${overdueGenba.length} vencidos y ${blockedGenba.length} bloqueados.`, href: "/genba" },
    { severity: 2, count: pendingPastTraining.length, title: "Entrenamientos por cerrar", detail: "La fecha de sesion ya paso y hay participantes registrados.", href: "/entrenamientos" },
    { severity: 3, count: negativeBalances, title: "Saldos ProbocaCoins negativos", detail: "Revisar ajustes o canjes antes del siguiente corte.", href: "/probocacoins" }
  ].filter((alert) => alert.count > 0).sort((a, b) => b.severity - a.severity || b.count - a.count);

  const totalOverdue = overdueIdeas.length + overdueKaizen.length + overdueGenba.length;
  const estimatedSavings = kaizenProjects.reduce((sum, project) => sum + (project.estimatedSavings ?? 0), 0);
  const realSavings = kaizenProjects.reduce((sum, project) => sum + (project.realSavings ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Direccion | Corte integral"
        title="Panorama ejecutivo"
        description={`Vista compacta del portafolio PROpEx. Corte actualizado al ${now.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}.`}
        actions={
          <Link className="btn btn-primary" href="/api/export/concentrado">
            <Download className="h-4 w-4" aria-hidden />
            Descargar concentrado
          </Link>
        }
      />

      <section aria-label="Indicadores principales" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Lightbulb} label="Ideas" value={formatNumber(ideas.length)} detail={`${openIdeas.length} abiertas | ${percent(closedIdeas.length, ideas.length)}% cerradas`} tone="bg-brand-50 text-brand-700" />
        <MetricCard icon={FolderKanban} label="Kaizen" value={formatNumber(activeKaizens.length)} detail={`${kaizenProgress.percent}% de actividades cerradas`} tone="bg-slate-950 text-white" />
        <MetricCard icon={MapPinned} label="GENBA" value={formatNumber(openGenbas.length)} detail={`${averageAttendance}% de asistencia promedio`} tone="bg-blue-50 text-blue-700" />
        <MetricCard icon={GraduationCap} label="Entrenamientos" value={formatNumber(completedEnrollments.length)} detail={`${trainingSessions.length} sesiones | ${trainingPrograms.filter((program) => program.active).length} programas activos`} tone="bg-emerald-50 text-emerald-700" />
        <MetricCard icon={Coins} label="Saldo ProbocaCoins" value={formatNumber(coinBalance)} detail={`${formatNumber(coinsAwarded)} otorgadas | ${formatNumber(coinsRedeemed)} canjeadas`} tone="bg-amber-50 text-amber-700" />
      </section>

      {alerts.length ? (
        <section aria-labelledby="executive-alerts" className="surface mb-6 overflow-hidden rounded-lg border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-rose-700">Atencion ejecutiva</p>
              <h2 className="mt-1 text-lg font-extrabold text-ink" id="executive-alerts">{alerts.length} frentes requieren decision</h2>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
          </div>
          <div className="divide-y divide-line">
            {alerts.slice(0, 5).map((alert) => (
              <Link className="group grid gap-2 px-5 py-3.5 hover:bg-rose-50/40 sm:grid-cols-[72px_1fr_auto] sm:items-center" href={alert.href} key={alert.title}>
                <span className="text-2xl font-black tabular-nums text-rose-700">{alert.count}</span>
                <span>
                  <span className="block text-sm font-extrabold text-slate-900">{alert.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{alert.detail}</span>
                </span>
                <ArrowRight className="hidden h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-rose-600 sm:block" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="alert alert-success mb-6" role="status">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          <span><strong>Sin alertas operativas.</strong> No hay compromisos vencidos, bloqueos ni cierres pendientes detectados.</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <section aria-labelledby="portfolio-health" className="surface overflow-hidden rounded-lg">
          <div className="border-b border-line px-5 py-4">
            <p className="text-[11px] font-extrabold uppercase text-brand-700">Portafolio conectado</p>
            <h2 className="mt-1 text-lg font-extrabold text-ink" id="portfolio-health">Salud por frente</h2>
            <p className="mt-1 text-sm text-slate-500">Avance basado en cierres reales, no en metas estimadas.</p>
          </div>
          <ProgressRow icon={Lightbulb} title="Ideas de mejora" href="/ideas" status={`${openIdeas.length} abiertas`} progress={percent(closedIdeas.length, ideas.length)} progressLabel="Tasa de cierre" detail={`${overdueIdeas.length} vencidas | ${ideas.reduce((sum, idea) => sum + idea.pointsAssigned, 0)} ProbocaCoins registradas`} />
          <ProgressRow icon={FolderKanban} title="Proyectos Kaizen" href="/kaizen" status={`${activeKaizens.length} activos`} progress={kaizenProgress.percent} progressLabel="Actividades cerradas" detail={`${overdueKaizen.length} vencidas | ${blockedKaizen.length} bloqueadas | $${formatNumber(realSavings)} de $${formatNumber(estimatedSavings)} en ahorro`} />
          <ProgressRow icon={MapPinned} title="Recorridos GENBA" href="/genba" status={`${openGenbas.length} abiertos`} progress={genbaProgress.percent} progressLabel="Actividades cerradas" detail={`${overdueGenba.length} vencidas | ${promotedToKaizen} promovidas a Kaizen | ${averageAttendance}% asistencia`} />
          <ProgressRow icon={GraduationCap} title="Entrenamientos" href="/entrenamientos" status={`${trainingSessions.length} sesiones`} progress={percent(completedEnrollments.length, enrollments.length)} progressLabel="Participantes completados" detail={`${enrollments.filter((enrollment) => enrollment.status === "REGISTERED").length} registrados | ${completedEnrollments.reduce((sum, enrollment) => sum + enrollment.coinsAwarded, 0)} ProbocaCoins otorgadas`} />
          <ProgressRow icon={Coins} title="ProbocaCoins" href="/probocacoins" status={`${participantsWithMovements} personas con movimientos`} progress={percent(participantsWithMovements, participants.filter((participant) => participant.active).length)} progressLabel="Cobertura del directorio activo" detail={`${coinTransactions.length} movimientos | saldo neto ${formatNumber(coinBalance)}`} />
        </section>

        <aside aria-labelledby="cut-summary" className="surface h-fit overflow-hidden rounded-lg">
          <div className="border-b border-line bg-slate-950 px-5 py-4 text-white">
            <p className="text-[11px] font-extrabold uppercase text-slate-300">Lectura del corte</p>
            <h2 className="mt-1 text-lg font-extrabold" id="cut-summary">Control general</h2>
          </div>
          <dl className="divide-y divide-line">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="flex items-center gap-2 text-sm font-bold text-slate-600"><AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden />Vencimientos totales</dt>
              <dd className="text-xl font-black tabular-nums text-ink">{totalOverdue}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="flex items-center gap-2 text-sm font-bold text-slate-600"><Users className="h-4 w-4 text-blue-700" aria-hidden />Personas activas</dt>
              <dd className="text-xl font-black tabular-nums text-ink">{activePeople}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="flex items-center gap-2 text-sm font-bold text-slate-600"><GraduationCap className="h-4 w-4 text-emerald-700" aria-hidden />Cumplimiento formativo</dt>
              <dd className="text-xl font-black tabular-nums text-ink">{percent(completedEnrollments.length, enrollments.length)}%</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="flex items-center gap-2 text-sm font-bold text-slate-600"><Coins className="h-4 w-4 text-amber-700" aria-hidden />Movimientos de monedas</dt>
              <dd className="text-xl font-black tabular-nums text-ink">{coinTransactions.length}</dd>
            </div>
          </dl>
          <div className="border-t border-line bg-panel p-4">
            <Link className="btn btn-secondary w-full justify-center" href="/api/export/concentrado">
              <Download className="h-4 w-4" aria-hidden />
              Abrir concentrado Excel
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
