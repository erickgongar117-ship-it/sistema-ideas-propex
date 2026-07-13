import Link from "next/link";
import { Download, Plus, QrCode } from "lucide-react";
import { DashboardCommandCenter, type DashboardIdea } from "@/components/dashboard-command-center";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { attendancePercent, isWorkItemOverdue, parseImpactTypes, workProgress } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

function averageHours(rows: Array<{ idea: { createdAt: Date }; decidedAt: Date | null }>) {
  const closed = rows.filter((row) => row.decidedAt);
  if (!closed.length) return "0 h";
  const total = closed.reduce((sum, row) => sum + ((row.decidedAt?.getTime() ?? 0) - row.idea.createdAt.getTime()), 0);
  return `${Math.max(1, Math.round(total / closed.length / 1000 / 60 / 60))} h`;
}

export default async function DashboardPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const [ideas, areas, supervisorApprovals, validationApprovals, kaizenProjects, genbaWalks] = await Promise.all([
    prisma.idea.findMany({
      include: { area: true, supervisor: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.area.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.approval.findMany({ where: { type: "SUPERVISOR" }, include: { idea: true } }),
    prisma.approval.findMany({ where: { type: { in: ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"] } }, include: { idea: true } }),
    prisma.kaizenProject.findMany({ include: { activities: true } }),
    prisma.genbaWalk.findMany({ include: { activities: true } })
  ]);

  const dashboardIdeas: DashboardIdea[] = ideas.map((idea) => ({
    id: idea.id,
    folio: idea.folio,
    areaCode: idea.area.code,
    collaboratorName: idea.collaboratorName,
    supervisorName: idea.supervisor?.name ?? null,
    problem: idea.problem,
    status: idea.status,
    category: idea.category,
    createdAt: idea.createdAt.toISOString(),
    closedAt: idea.closedAt?.toISOString() ?? null,
    dueDate: idea.dueDate?.toISOString() ?? null,
    pointsAssigned: idea.pointsAssigned,
    impactTypes: parseImpactTypes(idea.impactTypes),
    impactsQuality: idea.impactsQuality,
    impactsSafety: idea.impactsSafety,
    requiresMaintenance: idea.requiresMaintenance
  }));

  const implementationRows = ideas.filter((idea) => idea.implementedAt);
  const implementationDays = implementationRows.length
    ? `${Math.round(implementationRows.reduce((sum, idea) => sum + ((idea.implementedAt?.getTime() ?? idea.createdAt.getTime()) - idea.createdAt.getTime()), 0) / implementationRows.length / 1000 / 60 / 60 / 24)} d`
    : "0 d";

  const kaizenProgress = kaizenProjects.map((project) => workProgress(project.activities));
  const kaizenActive = kaizenProjects.filter((project) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status)).length;
  const kaizenAverageProgress = kaizenProgress.length ? Math.round(kaizenProgress.reduce((sum, progress) => sum + progress.percent, 0) / kaizenProgress.length) : 0;
  const genbaActivities = genbaWalks.flatMap((walk) => walk.activities).filter((activity) => activity.status !== "COMBINADA");
  const genbaOpenActivities = genbaActivities.filter((activity) => !["COMPLETADA", "CANCELADA"].includes(activity.status));
  const averageAttendance = genbaWalks.length
    ? Math.round(genbaWalks.reduce((sum, walk) => sum + attendancePercent(walk.expectedDepartments, walk.attendedDepartments), 0) / genbaWalks.length)
    : 0;

  return (
    <>
      <PageHeader
        title="Centro de mando PROpEx"
        eyebrow="Mejora Continua · Inteligencia operativa"
        description="Prioridades, tendencias y resultados conectados entre Ideas, Kaizen y GENBA."
        actions={
          <>
            <Link aria-label="Ver códigos QR" className="icon-button" href="/qr" title="Códigos QR">
              <QrCode className="h-[18px] w-[18px]" aria-hidden />
            </Link>
            <Link className="btn btn-secondary" href="/api/export">
              <Download className="h-4 w-4" aria-hidden />
              Exportar
            </Link>
            <Link className="btn btn-primary" href="/#areas">
              <Plus className="h-4 w-4" aria-hidden />
              Nueva idea
            </Link>
          </>
        }
      />

      <DashboardCommandCenter
        areas={areas.map((area) => area.code)}
        generatedAt={new Date().toISOString()}
        ideas={dashboardIdeas}
        portfolio={{
          kaizen: {
            total: kaizenProjects.length,
            active: kaizenActive,
            averageProgress: kaizenAverageProgress,
            overdueActivities: kaizenProjects.flatMap((project) => project.activities).filter(isWorkItemOverdue).length,
            estimatedSavings: kaizenProjects.reduce((sum, project) => sum + (project.estimatedSavings ?? 0), 0),
            realSavings: kaizenProjects.reduce((sum, project) => sum + (project.realSavings ?? 0), 0)
          },
          genba: {
            total: genbaWalks.length,
            openActivities: genbaOpenActivities.length,
            overdueActivities: genbaOpenActivities.filter(isWorkItemOverdue).length,
            averageAttendance
          }
        }}
        timing={{
          supervisor: averageHours(supervisorApprovals),
          validation: averageHours(validationApprovals),
          implementation: implementationDays
        }}
      />
    </>
  );
}
