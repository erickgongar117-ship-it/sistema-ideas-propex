import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Save, UserRound } from "lucide-react";
import { assignImplementationAction, classifyIdeaAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { classificationLabels, priorityLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function MejoraContinuaPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const [ideas, owners] = await Promise.all([
    prisma.idea.findMany({
      where: { status: { in: ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "IMPLEMENTADA", "EN_VALIDACION_FINAL", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"] } },
      include: { area: true, implementationOwner: true, kaizenProject: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR", "ADMIN"] }, active: true }, orderBy: { name: "asc" } })
  ]);
  const toAssign = ideas.filter((idea) => !idea.implementationOwnerId).length;
  const readyToClose = ideas.filter((idea) => ["IMPLEMENTADA", "EN_VALIDACION_FINAL"].includes(idea.status)).length;

  return (
    <>
      <PageHeader eyebrow="Mejora Continua · Acciones requeridas" title="Panel de Mejora Continua" description="Clasifica, prioriza, asigna responsables y prepara el cierre de las ideas aprobadas." />
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard detail="Requieren acción de MC" icon={Clock3} label="En bandeja" tone="dark" value={ideas.length} />
        <KpiCard detail="Sin responsable definido" icon={UserRound} label="Por asignar" tone="amber" value={toAssign} />
        <KpiCard detail="Esperan revisión final" icon={CheckCircle2} label="Listas para cierre" tone="green" value={readyToClose} />
      </section>

      <section className="mt-8">
        <SectionHeading count={ideas.length} description="Clasifica las aprobadas o abre una rechazada para justificar y enviarla a revalidación." title="Ideas listas para gestionar" />
        {!ideas.length ? <EmptyState title="Todo está al día" description="Las ideas aprobadas por las áreas de soporte aparecerán aquí." /> : null}
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <article className="surface rounded-lg p-4 sm:p-5" key={idea.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="text-lg font-extrabold text-ink hover:text-brand-700" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700">{idea.area.code}</span>
                  </div>
                  <p className="mt-2 max-w-4xl text-sm font-semibold leading-5 text-slate-700">{idea.problem}</p>
                </div>
                <StatusPill status={idea.status} />
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status) ? (
                  <div className="alert alert-warning lg:col-span-2">
                    Esta idea requiere una justificación de Mejora Continua. Ábrela en el detalle para revalidarla y elegir las áreas de apoyo.
                  </div>
                ) : (
                  <>
                <details className="details-panel" open={!idea.classification && !["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status)}>
                  <summary>1. Clasificar y priorizar</summary>
                  <form action={classifyIdeaAction} className="grid gap-3 p-4">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label><span className="label">Clasificación</span><select className="field" name="classification" defaultValue={idea.classification ?? "IDEA_RAPIDA"}>{Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label><span className="label">Prioridad</span><select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    </div>
                    <label><span className="label">Comentario de MC</span><textarea className="field min-h-20" name="mcComments" placeholder="Criterio, alcance o siguiente paso" defaultValue={idea.mcComments ?? ""} /></label>
                    <button className="btn btn-secondary w-full sm:w-fit" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar clasificación</button>
                  </form>
                </details>

                <details className="details-panel" open={Boolean(idea.classification && !idea.implementationOwnerId && !["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status))}>
                  <summary>2. Asignar implementación</summary>
                  <form action={assignImplementationAction} className="grid gap-3 p-4">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <label><span className="label">Responsable</span><select className="field" name="ownerId" defaultValue={idea.implementationOwnerId ?? ""} required><option value="">Seleccionar</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label><span className="label">Fecha compromiso</span><input className="field" defaultValue={idea.dueDate ? idea.dueDate.toISOString().slice(0, 10) : ""} name="dueDate" type="date" required /></label>
                      <label><span className="label">Prioridad</span><select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input defaultChecked={idea.requiresEvidence} name="requiresEvidence" type="checkbox" />Solicitar evidencia final</label>
                    <button className="btn btn-primary w-full sm:w-fit" type="submit">Asignar implementación</button>
                    {idea.classification === "KAIZEN" ? <p className="text-xs font-bold leading-5 text-amber-800">{idea.kaizenProject ? `El proyecto ${idea.kaizenProject.folio} ya fue transferido a Kaizen. Esta asignación actualizará su líder y fechas.` : "El proyecto Kaizen se generará automáticamente al guardar la clasificación."}</p> : null}
                  </form>
                </details>
                  </>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-xs text-slate-500">Responsable: <span className="font-extrabold text-slate-700">{idea.implementationOwner?.name ?? "Pendiente"}</span></p>
                <Link className="flex items-center gap-1 text-xs font-extrabold text-brand-700 hover:underline" href={`/ideas/${idea.id}`}>Abrir detalle <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
