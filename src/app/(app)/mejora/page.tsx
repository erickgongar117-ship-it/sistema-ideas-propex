import Link from "next/link";
import { assignImplementationAction, classifyIdeaAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { classificationLabels, priorityLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function MejoraContinuaPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const [ideas, owners] = await Promise.all([
    prisma.idea.findMany({
      where: { status: { in: ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "IMPLEMENTADA", "EN_VALIDACION_FINAL"] } },
      include: { area: true, implementationOwner: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR", "ADMIN"] }, active: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <>
      <PageHeader title="Panel Mejora Continua" description="Clasificacion, responsable, fecha compromiso, prioridad y cierre final." />
      {!ideas.length ? <EmptyState title="Sin ideas listas para Mejora Continua" /> : null}
      <div className="grid gap-4">
        {ideas.map((idea) => (
          <article className="surface rounded-lg p-5" key={idea.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Link className="text-lg font-black text-brand-700" href={`/ideas/${idea.id}`}>
                  {idea.folio}
                </Link>
                <p className="text-sm text-slate-600">
                  {idea.area.code} - {idea.problem}
                </p>
              </div>
              <StatusPill status={idea.status} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <form action={classifyIdeaAction} className="grid gap-3 rounded-lg border border-line bg-panel p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="label">Clasificacion</span>
                    <select className="field" name="classification" defaultValue={idea.classification ?? "IDEA_RAPIDA"}>
                      {Object.entries(classificationLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="label">Prioridad</span>
                    <select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <textarea className="field min-h-20" name="mcComments" placeholder="Comentarios de Mejora Continua" />
                <button className="btn btn-secondary w-full sm:w-fit" type="submit">
                  Clasificar
                </button>
              </form>
              <form action={assignImplementationAction} className="grid gap-3 rounded-lg border border-line bg-panel p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <label>
                    <span className="label">Responsable</span>
                    <select className="field" name="ownerId" defaultValue={idea.implementationOwnerId ?? ""} required>
                      <option value="">Seleccionar</option>
                      {owners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="label">Fecha compromiso</span>
                    <input className="field" name="dueDate" type="date" required />
                  </label>
                  <label>
                    <span className="label">Prioridad</span>
                    <select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input defaultChecked name="requiresEvidence" type="checkbox" />
                  Requiere evidencia obligatoria
                </label>
                <button className="btn btn-primary w-full sm:w-fit" type="submit">
                  Asignar implementacion
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
