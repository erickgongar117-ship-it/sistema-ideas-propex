import Link from "next/link";
import { ListTodo, Plus } from "lucide-react";
import { GenbaCommandCenter, type GenbaDashboardWalk } from "@/components/genba-command-center";
import { PageHeader } from "@/components/page-header";
import { parseStringArray } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export default async function GenbaDashboardPage() {
  const { canManage } = await requireGenbaAccess();
  const walks = await prisma.genbaWalk.findMany({
    include: {
      coordinator: true,
      activities: {
        include: { owner: true, promotedKaizenActivity: true },
        orderBy: { number: "asc" }
      }
    },
    orderBy: { visitDate: "desc" }
  });

  const dashboardWalks: GenbaDashboardWalk[] = walks.map((walk) => ({
    id: walk.id,
    number: walk.number,
    folio: walk.folio,
    areaName: walk.areaName,
    visitDate: walk.visitDate.toISOString(),
    status: walk.status,
    coordinatorName: walk.coordinator.name,
    expectedDepartments: parseStringArray(walk.expectedDepartments).length,
    attendedDepartments: parseStringArray(walk.attendedDepartments).length,
    createdAt: walk.createdAt.toISOString(),
    closedAt: walk.closedAt?.toISOString() ?? null,
    activities: walk.activities.map((activity) => ({
      id: activity.id,
      number: activity.number,
      problem: activity.problem,
      action: activity.action,
      ownerName: activity.owner?.name ?? null,
      dueDate: activity.dueDate?.toISOString() ?? null,
      status: activity.status,
      closedAt: activity.closedAt?.toISOString() ?? null,
      createdAt: activity.createdAt.toISOString(),
      promotedToKaizen: Boolean(activity.promotedKaizenActivity)
    }))
  }));

  return (
    <>
      <PageHeader
        eyebrow="Recorridos GENBA · Gestión visual"
        title="Centro de mando GENBA"
        description="Recurrencia, asistencia, vencimientos y velocidad de cierre para dirigir el seguimiento en piso."
        actions={
          <>
            <Link className="btn btn-secondary" href="/genba/kanban"><ListTodo className="h-4 w-4" aria-hidden />Kanban</Link>
            {canManage ? <Link className="btn btn-primary" href="/genba/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo recorrido</Link> : null}
          </>
        }
      />
      <GenbaCommandCenter generatedAt={new Date().toISOString()} walks={dashboardWalks} />
    </>
  );
}
