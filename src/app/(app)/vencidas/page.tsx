import Link from "next/link";
import { runRemindersAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { prisma } from "@/lib/prisma";

export default async function OverduePage() {
  const ideas = await prisma.idea.findMany({
    where: {
      OR: [{ status: "VENCIDA" }, { dueDate: { lt: new Date() }, status: { notIn: ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"] } }]
    },
    include: { area: true, supervisor: true, implementationOwner: true },
    orderBy: { dueDate: "asc" }
  });

  return (
    <>
      <PageHeader
        title="Ideas vencidas"
        description="Semaforo rojo de compromisos vencidos."
        actions={
          <form action={runRemindersAction}>
            <button className="btn btn-primary" type="submit">
              Ejecutar recordatorios
            </button>
          </form>
        }
      />
      {!ideas.length ? <EmptyState title="Sin vencimientos" /> : null}
      <div className="grid gap-4">
        {ideas.map((idea) => (
          <article className="surface rounded-lg p-5" key={idea.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Link className="text-lg font-black text-brand-700" href={`/ideas/${idea.id}`}>
                  {idea.folio}
                </Link>
                <p className="text-sm text-slate-600">
                  {idea.area.code} - Responsable: {idea.implementationOwner?.name ?? "Sin asignar"}
                </p>
              </div>
              <StatusPill status={idea.status} />
            </div>
            <p className="mt-3 text-sm text-slate-700">{idea.problem}</p>
            <p className="mt-2 text-sm font-bold text-rose-700">
              Fecha compromiso: {idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
