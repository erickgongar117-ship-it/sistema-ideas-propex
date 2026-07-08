import Link from "next/link";
import { implementationUpdateAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ImplementationPage() {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"]);
  const ideas = await prisma.idea.findMany({
    where: {
      status: { in: ["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"] },
      ...(user.role === "SUPERVISOR" ? { supervisorId: user.id } : {})
    },
    include: { area: true, implementationOwner: true, supervisor: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }]
  });

  return (
    <>
      <PageHeader title="Implementacion y evidencias" description="Seguimiento de avances, evidencia despues y fecha real de implementacion." />
      {!ideas.length ? <EmptyState title="Sin ideas en implementacion" /> : null}
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
            <form action={implementationUpdateAction} className="mt-4 grid gap-3">
              <input name="ideaId" type="hidden" value={idea.id} />
              <textarea className="field min-h-20" name="comments" placeholder="Avance o comentario" />
              <input className="field" name="afterEvidence" type="file" accept="image/*,.pdf" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input name="markImplemented" type="checkbox" />
                Marcar como implementada
              </label>
              <button className="btn btn-primary w-full sm:w-fit" type="submit">
                Guardar avance
              </button>
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
