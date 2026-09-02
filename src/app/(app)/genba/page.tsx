import Link from "next/link";
import { Archive, Download, Plus, TriangleAlert } from "lucide-react";
import { GenbaCommandCenter, type GenbaDashboardWalk } from "@/components/genba-command-center";
import { PageHeader } from "@/components/page-header";
import { parseStringArray, roleLabels } from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";


export const metadata = { title: "Recorridos GENBA" };
export default async function GenbaDashboardPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, canManage, canViewAll } = await requireGenbaAccess();
  const query = (await searchParams) ?? {};
  const errorCode = typeof query.error === "string" ? query.error : null;
  const errorMessage = errorCode === "combinacion"
    ? "Para combinar dos acciones elige una de origen, una de destino distinta y escribe el motivo."
    : errorCode
      ? "No pudimos completar la operacion. Revisa los datos e intentalo de nuevo."
      : null;
  const walks = await prisma.genbaWalk.findMany({
    where: {
      ...(!canViewAll ? { OR: [{ coordinatorId: user.id }, { activities: { some: { ownerId: user.id } } }] } : {})
    },
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
    // El nivel sale del rol de quien coordina. Es lo que permite ver de un vistazo los
    // recorridos que hace direccion, sin capturar el dato dos veces.
    coordinatorLevel: roleLabels[walk.coordinator.role],
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
        title="Recorridos GENBA"
        description="Recorridos y acciones agrupadas para dar seguimiento sin perder el contexto."
        actions={
          <>
            <Link className="btn btn-secondary" href="/api/export/genba"><Download className="h-4 w-4" aria-hidden />Excel</Link>
            <Link className="btn btn-secondary" href="/genba/repositorio"><Archive className="h-4 w-4" aria-hidden />Repositorio</Link>
            {canManage ? <Link className="btn btn-primary" href="/genba/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo recorrido</Link> : null}
          </>
        }
      />
      {errorMessage ? <div className="alert alert-danger mb-5" role="alert"><TriangleAlert className="h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}
      <GenbaCommandCenter canManage={canManage} generatedAt={new Date().toISOString()} walks={dashboardWalks} />
    </>
  );
}
