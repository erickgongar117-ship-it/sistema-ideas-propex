import Link from "next/link";
import { Archive, CalendarRange, Download, Plus, TriangleAlert } from "lucide-react";
import { KaizenCommandCenter, type KaizenDashboardProject } from "@/components/kaizen-command-center";
import { PageHeader } from "@/components/page-header";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export default async function KaizenDashboardPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, canManage } = await requireKaizenAccess();
  const query = (await searchParams) ?? {};
  const errorCode = typeof query.error === "string" ? query.error : null;
  const errorMessage = errorCode === "combinacion"
    ? "Para combinar dos proyectos elige uno de origen, uno de destino distinto y escribe el motivo."
    : errorCode
      ? "No pudimos completar la operacion. Revisa los datos e intentalo de nuevo."
      : null;
  const projects = await prisma.kaizenProject.findMany({
    where: {
      ...(!canManage ? { OR: [{ leaderId: user.id }, { teamMembers: { some: { userId: user.id } } }, { activities: { some: { ownerId: user.id } } }] } : {})
    },
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
    originalEndDate: project.originalEndDate?.toISOString() ?? null,
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
        title="Proyectos Kaizen"
        description="Proyectos, actividades, responsables y resultados en vistas conectadas."
        actions={
          <>
            <Link className="btn btn-secondary" href="/api/export/kaizen"><Download className="h-4 w-4" aria-hidden />Excel</Link>
            <Link className="btn btn-secondary" href="/kaizen/repositorio"><Archive className="h-4 w-4" aria-hidden />Repositorio</Link>
            <Link className="btn btn-secondary" href="/kaizen/gantt"><CalendarRange className="h-4 w-4" aria-hidden />Gantt</Link>
            {canManage ? <Link className="btn btn-primary" href="/kaizen/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo Kaizen</Link> : null}
          </>
        }
      />
      {errorMessage ? <div className="alert alert-danger mb-5" role="alert"><TriangleAlert className="h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}
      <KaizenCommandCenter canManage={canManage} generatedAt={new Date().toISOString()} projects={dashboardProjects} />
    </>
  );
}
