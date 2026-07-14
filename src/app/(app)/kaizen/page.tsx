import Link from "next/link";
import { CalendarRange, Download, ListTodo, Plus } from "lucide-react";
import { KaizenCommandCenter, type KaizenDashboardProject } from "@/components/kaizen-command-center";
import { PageHeader } from "@/components/page-header";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export default async function KaizenDashboardPage() {
  const { canManage } = await requireKaizenAccess();
  const projects = await prisma.kaizenProject.findMany({
    include: {
      leader: true,
      activities: { include: { owner: true }, orderBy: { number: "asc" } },
      attachments: true,
      sourceIdea: true
    },
    orderBy: [{ status: "asc" }, { number: "desc" }]
  });

  const dashboardProjects: KaizenDashboardProject[] = projects.map((project) => ({
    id: project.id,
    number: project.number,
    folio: project.folio,
    title: project.title,
    plant: project.plant,
    area: project.area,
    objective: project.objective,
    status: project.status,
    startDate: project.startDate.toISOString(),
    endDate: project.endDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    leaderName: project.leader.name,
    sourceIdeaFolio: project.sourceIdea?.folio ?? null,
    estimatedSavings: project.estimatedSavings ?? 0,
    realSavings: project.realSavings ?? 0,
    hasCharter: project.attachments.some((attachment) => attachment.type === "CHARTER"),
    activities: project.activities.map((activity) => ({
      id: activity.id,
      number: activity.number,
      action: activity.action,
      ownerName: activity.owner?.name ?? null,
      startDate: activity.startDate?.toISOString() ?? null,
      dueDate: activity.dueDate?.toISOString() ?? null,
      status: activity.status,
      closedAt: activity.closedAt?.toISOString() ?? null,
      createdAt: activity.createdAt.toISOString()
    }))
  }));

  return (
    <>
      <PageHeader
        eyebrow="Proyectos Kaizen · Dirección y seguimiento"
        title="Centro de mando Kaizen"
        description="Salud del portafolio, avance planeado contra real, beneficios y compromisos en una vista ejecutiva."
        actions={
          <>
            <Link className="btn btn-secondary" href="/api/export/kaizen"><Download className="h-4 w-4" aria-hidden />Excel</Link>
            <Link className="btn btn-secondary" href="/kaizen/kanban"><ListTodo className="h-4 w-4" aria-hidden />Kanban</Link>
            <Link className="btn btn-secondary" href="/kaizen/gantt"><CalendarRange className="h-4 w-4" aria-hidden />Gantt</Link>
            {canManage ? <Link className="btn btn-primary" href="/kaizen/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo Kaizen</Link> : null}
          </>
        }
      />
      <KaizenCommandCenter generatedAt={new Date().toISOString()} projects={dashboardProjects} />
    </>
  );
}
