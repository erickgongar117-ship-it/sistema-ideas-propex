import Link from "next/link";
import { Download } from "lucide-react";
import {
  ExecutivePortfolioDashboard,
  type ExecutiveAlert,
  type ExecutiveMetric,
  type ExecutivePortfolioRow,
  type ExecutiveRiskCell
} from "@/components/executive-portfolio-dashboard";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { attendancePercent, workProgress } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const CLOSED_IDEA_STATUSES = new Set(["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"]);
const CLOSED_WORK_STATUSES = new Set(["COMPLETADA", "CANCELADA", "COMBINADA"]);

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthBuckets(now: Date, count = 6) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1);
    return {
      key: monthKey(date),
      label: date.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }).replace(" de ", " ")
    };
  });
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
        createdAt: true,
        closedAt: true,
        supportRequests: { select: { status: true } }
      }
    }),
    prisma.kaizenProject.findMany({
      select: {
        status: true,
        estimatedSavings: true,
        realSavings: true,
        createdAt: true,
        closedAt: true,
        activities: { select: { id: true, status: true, dueDate: true } }
      }
    }),
    prisma.genbaWalk.findMany({
      select: {
        status: true,
        visitDate: true,
        expectedDepartments: true,
        attendedDepartments: true,
        activities: { select: { id: true, status: true, dueDate: true, promotedKaizenActivity: { select: { id: true } } } }
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
    prisma.coinTransaction.findMany({ select: { amount: true, type: true, participantId: true, occurredAt: true } }),
    prisma.participant.findMany({ select: { id: true, active: true, coinTransactions: { select: { amount: true } } } }),
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
  const kaizenAtRisk = new Set([...overdueKaizen, ...blockedKaizen].map((activity) => activity.id)).size;
  const pendingCharters = activeKaizens.filter((project) => project.status === "PENDIENTE_CHARTER").length;

  const genbaActivities = genbaWalks.flatMap((walk) => walk.activities).filter((activity) => activity.status !== "COMBINADA");
  const genbaProgress = workProgress(genbaActivities);
  const openGenbas = genbaWalks.filter((walk) => walk.status === "ABIERTO");
  const overdueGenba = genbaActivities.filter((activity) => activity.dueDate && activity.dueDate < now && !CLOSED_WORK_STATUSES.has(activity.status));
  const blockedGenba = genbaActivities.filter((activity) => activity.status === "BLOQUEADA");
  const genbaAtRisk = new Set([...overdueGenba, ...blockedGenba].map((activity) => activity.id)).size;
  const promotedToKaizen = genbaActivities.filter((activity) => activity.promotedKaizenActivity).length;
  const averageAttendance = genbaWalks.length
    ? Math.round(genbaWalks.reduce((sum, walk) => sum + attendancePercent(walk.expectedDepartments, walk.attendedDepartments), 0) / genbaWalks.length)
    : 0;

  const trainingSessions = trainingPrograms.flatMap((program) => program.sessions);
  const enrollments = trainingSessions.flatMap((session) => session.enrollments.map((enrollment) => ({ ...enrollment, sessionDate: session.sessionDate })));
  const completedEnrollments = enrollments.filter((enrollment) => enrollment.status === "COMPLETED");
  const registeredEnrollments = enrollments.filter((enrollment) => enrollment.status === "REGISTERED");
  const pendingPastTraining = registeredEnrollments.filter((enrollment) => enrollment.sessionDate < now);

  const coinBalance = coinTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const coinsAwarded = coinTransactions.filter((transaction) => transaction.type === "AWARD").reduce((sum, transaction) => sum + transaction.amount, 0);
  const coinsRedeemed = Math.abs(coinTransactions.filter((transaction) => transaction.type === "REDEMPTION").reduce((sum, transaction) => sum + transaction.amount, 0));
  const participantsWithMovements = new Set(coinTransactions.map((transaction) => transaction.participantId)).size;
  const negativeBalances = participants.filter((participant) => participant.coinTransactions.reduce((sum, transaction) => sum + transaction.amount, 0) < 0).length;
  const activePeople = participants.filter((participant) => participant.active).length + users.filter((account) => account.active && !account.participant).length;

  const estimatedSavings = kaizenProjects.reduce((sum, project) => sum + (project.estimatedSavings ?? 0), 0);
  const registeredSavings = kaizenProjects.reduce((sum, project) => sum + (project.realSavings ?? 0), 0);

  const metrics: ExecutiveMetric[] = [
    { id: "ideas", label: "Ideas", value: formatNumber(ideas.length), detail: `${openIdeas.length} abiertas · ${percent(closedIdeas.length, ideas.length)}% cerradas`, signal: `${overdueIdeas.length} vencidas`, color: "#ea0029", href: "/dashboard" },
    { id: "kaizen", label: "Kaizen activos", value: formatNumber(activeKaizens.length), detail: `${kaizenProgress.percent}% de actividades resueltas`, signal: `${kaizenAtRisk} en riesgo`, color: "#171717", href: "/kaizen" },
    { id: "genba", label: "GENBA abiertos", value: formatNumber(openGenbas.length), detail: `${genbaProgress.percent}% de acciones resueltas`, signal: `${averageAttendance}% asistencia`, color: "#176fc1", href: "/genba" },
    { id: "training", label: "Participaciones", value: formatNumber(completedEnrollments.length), detail: `${trainingSessions.length} sesiones · ${trainingPrograms.filter((program) => program.active).length} programas`, signal: `${pendingPastTraining.length} por cerrar`, color: "#14835f", href: "/entrenamientos" },
    { id: "coins", label: "Saldo ProbocaCoins", value: formatNumber(coinBalance), detail: `${formatNumber(coinsAwarded)} otorgadas`, signal: `${formatNumber(coinsRedeemed)} canjeadas`, color: "#a16207", href: "/probocacoins" }
  ];

  const portfolio: ExecutivePortfolioRow[] = [
    { id: "ideas", label: "Ideas", status: `${openIdeas.length} abiertas`, progress: percent(closedIdeas.length, ideas.length), active: openIdeas.length, risk: overdueIdeas.length, detail: `${pendingInitialIdeas.length + pendingSupportReviews} decisiones pendientes`, href: "/dashboard", color: "#ea0029" },
    { id: "kaizen", label: "Kaizen", status: `${activeKaizens.length} activos`, progress: kaizenProgress.percent, active: activeKaizens.length, risk: kaizenAtRisk, detail: `$${formatNumber(registeredSavings)} de ahorro registrado`, href: "/kaizen", color: "#171717" },
    { id: "genba", label: "GENBA", status: `${openGenbas.length} abiertos`, progress: genbaProgress.percent, active: openGenbas.length, risk: genbaAtRisk, detail: `${promotedToKaizen} acciones enviadas a Kaizen`, href: "/genba", color: "#176fc1" },
    { id: "training", label: "Entrenamientos", status: `${registeredEnrollments.length} inscritos`, progress: percent(completedEnrollments.length, enrollments.length), active: registeredEnrollments.length, risk: pendingPastTraining.length, detail: `${completedEnrollments.length} participaciones completadas`, href: "/entrenamientos", color: "#14835f" },
    { id: "coins", label: "ProbocaCoins", status: `${participantsWithMovements} personas`, progress: percent(participantsWithMovements, participants.filter((participant) => participant.active).length), active: participantsWithMovements, risk: negativeBalances, detail: `${coinTransactions.length} movimientos auditables`, href: "/probocacoins", color: "#a16207" }
  ];

  const alerts: ExecutiveAlert[] = [
    { id: "ideas-overdue", severity: 3, count: overdueIdeas.length, title: "Ideas con fecha vencida", detail: "Requieren responsable, nueva fecha o cierre.", href: "/vencidas" },
    { id: "ideas-review", severity: 2, count: pendingInitialIdeas.length, title: "Ideas sin decision inicial", detail: "Esperan respuesta del jefe o supervisor asignado.", href: user.role === "ADMIN" ? "/supervisor" : "/seguimientos?vista=equipo" },
    { id: "support-review", severity: 2, count: pendingSupportReviews, title: "Validaciones de apoyo pendientes", detail: "Calidad, Seguridad, Mantenimiento u otra area deben responder.", href: "/kanban" },
    { id: "kaizen-risk", severity: 3, count: kaizenAtRisk, title: "Compromisos Kaizen en riesgo", detail: `${overdueKaizen.length} vencidos · ${blockedKaizen.length} bloqueados.`, href: "/kaizen" },
    { id: "genba-risk", severity: 3, count: genbaAtRisk, title: "Compromisos GENBA en riesgo", detail: `${overdueGenba.length} vencidos · ${blockedGenba.length} bloqueados.`, href: "/genba" },
    { id: "training-close", severity: 2, count: pendingPastTraining.length, title: "Entrenamientos por cerrar", detail: "La sesion ya paso y conserva participantes registrados.", href: "/entrenamientos" },
    { id: "coins-negative", severity: 3, count: negativeBalances, title: "Saldos ProbocaCoins negativos", detail: "Revisar ajustes o canjes antes del siguiente corte.", href: "/probocacoins" }
  ].filter((alert) => alert.count > 0).sort((a, b) => b.severity - a.severity || b.count - a.count);

  const riskMatrix: ExecutiveRiskCell[] = [
    { module: "Ideas", type: "Vencidos", value: overdueIdeas.length, href: "/vencidas" },
    { module: "Ideas", type: "Bloqueos", value: 0, href: "/dashboard" },
    { module: "Ideas", type: "Por decidir", value: pendingInitialIdeas.length + pendingSupportReviews, href: "/supervisor" },
    { module: "Kaizen", type: "Vencidos", value: overdueKaizen.length, href: "/kaizen" },
    { module: "Kaizen", type: "Bloqueos", value: blockedKaizen.length, href: "/kaizen" },
    { module: "Kaizen", type: "Por decidir", value: pendingCharters, href: "/kaizen" },
    { module: "GENBA", type: "Vencidos", value: overdueGenba.length, href: "/genba" },
    { module: "GENBA", type: "Bloqueos", value: blockedGenba.length, href: "/genba" },
    { module: "GENBA", type: "Por decidir", value: openGenbas.length, href: "/genba" },
    { module: "Entrenamiento", type: "Vencidos", value: pendingPastTraining.length, href: "/entrenamientos" },
    { module: "Entrenamiento", type: "Bloqueos", value: 0, href: "/entrenamientos" },
    { module: "Entrenamiento", type: "Por decidir", value: registeredEnrollments.length, href: "/entrenamientos" },
    { module: "ProbocaCoins", type: "Vencidos", value: 0, href: "/probocacoins" },
    { module: "ProbocaCoins", type: "Bloqueos", value: 0, href: "/probocacoins" },
    { module: "ProbocaCoins", type: "Por decidir", value: negativeBalances, href: "/probocacoins" }
  ];

  const buckets = monthBuckets(now);
  const countByMonth = (dates: Array<Date | null>) => buckets.map((bucket) => dates.filter((date) => date && monthKey(date) === bucket.key).length);

  return (
    <>
      <PageHeader
        eyebrow="Direccion · Inteligencia operativa"
        title="Panorama ejecutivo"
        description={`Corte integral de Ideas, Kaizen, GENBA, Entrenamientos y ProbocaCoins al ${now.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}.`}
        actions={
          <Link className="btn btn-primary" href="/api/export/concentrado">
            <Download className="h-4 w-4" aria-hidden />
            Descargar concentrado
          </Link>
        }
      />

      <ExecutivePortfolioDashboard
        alerts={alerts}
        finance={{ estimatedSavings, registeredSavings, awardedCoins: coinsAwarded, redeemedCoins: coinsRedeemed }}
        metrics={metrics}
        people={{ active: activePeople, participantsWithMovements, negativeBalances }}
        portfolio={portfolio}
        riskMatrix={riskMatrix}
        trend={{
          labels: buckets.map((bucket) => bucket.label),
          ideasCreated: countByMonth(ideas.map((idea) => idea.createdAt)),
          ideasClosed: countByMonth(ideas.map((idea) => idea.closedAt)),
          kaizenStarted: countByMonth(kaizenProjects.map((project) => project.createdAt)),
          genbaWalks: countByMonth(genbaWalks.map((walk) => walk.visitDate))
        }}
      />
    </>
  );
}
