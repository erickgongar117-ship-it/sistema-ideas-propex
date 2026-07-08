import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  addCommentAction,
  assignImplementationAction,
  cancelIdeaAction,
  classifyIdeaAction,
  closeIdeaAction,
  implementationUpdateAction,
  removeIdeaPointsAction,
  supervisorDecisionAction,
  validationDecisionAction
} from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import {
  approvalStatusLabels,
  approvalTypeForRole,
  approvalTypeLabels,
  classificationLabels,
  parseImpactTypes,
  priorityLabels,
  roleHomePath,
  roleLabels
} from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { automaticPointRules } from "@/lib/points";
import { prisma } from "@/lib/prisma";
import type { ApprovalType } from "@prisma/client";

type DetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

const approvalTone: Record<ApprovalType, string> = {
  SUPERVISOR: "border-emerald-200 bg-emerald-50",
  CALIDAD: "border-red-200 bg-red-50",
  SEGURIDAD: "border-slate-300 bg-slate-100",
  MANTENIMIENTO: "border-blue-200 bg-blue-50",
  MEJORA_CONTINUA_FINAL: "border-slate-800 bg-slate-950 text-white"
};

export default async function IdeaDetailPage({ params, searchParams }: DetailProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const [idea, owners, pointRules] = await Promise.all([
    prisma.idea.findUnique({
      where: { id },
      include: {
        area: { include: { supervisor: true } },
        supervisor: true,
        implementationOwner: true,
        approvals: { include: { assignedTo: true }, orderBy: { createdAt: "asc" } },
        attachments: { orderBy: { createdAt: "asc" } },
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        pointRuleSelections: { include: { pointRule: true } }
      }
    }),
    prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR", "ADMIN"] }, active: true }, orderBy: { name: "asc" } }),
    prisma.pointRule.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } })
  ]);

  if (!idea) notFound();

  const canViewIdea =
    user.role === "ADMIN" ||
    user.role === "MEJORA_CONTINUA" ||
    (user.role === "SUPERVISOR" && idea.supervisorId === user.id) ||
    (user.role === "CALIDAD" && idea.approvals.some((approval) => approval.type === "CALIDAD")) ||
    (user.role === "SEGURIDAD" && idea.approvals.some((approval) => approval.type === "SEGURIDAD")) ||
    (user.role === "MANTENIMIENTO" &&
      (idea.approvals.some((approval) => approval.type === "MANTENIMIENTO") ||
        ["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"].includes(idea.status)));

  if (!canViewIdea) redirect(roleHomePath(user.role));

  const canSupervisor = user.role === "ADMIN" || (user.role === "SUPERVISOR" && idea.supervisorId === user.id);
  const roleApprovalType = approvalTypeForRole(user.role);
  const validationTypes: ApprovalType[] =
    user.role === "ADMIN" ? ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"] : roleApprovalType ? [roleApprovalType].filter((type) => type !== "SUPERVISOR" && type !== "MEJORA_CONTINUA_FINAL") : [];
  const canMC = user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
  const hasAfterEvidence = idea.attachments.some((attachment) => attachment.type === "AFTER");
  const automaticPoints = automaticPointRules(idea, pointRules);
  const isClosed = idea.status === "CERRADA";

  return (
    <>
      <PageHeader
        title={`Detalle de idea ${idea.folio}`}
        description={`${idea.area.code} - ${idea.collaboratorName}`}
        actions={
          <>
            <Link className="btn btn-secondary" href="/ideas">
              Tabla maestra
            </Link>
            <Link className="btn btn-secondary" href="/kanban">
              Kanban
            </Link>
          </>
        }
      />

      {query.error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
          {query.error === "evidencia"
            ? "No se puede cerrar sin evidencia despues."
            : query.error === "justificacion"
              ? "La justificacion es obligatoria."
              : "Revisa los datos requeridos."}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <article className="surface rounded-lg p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">{idea.createdAt.toLocaleString("es-MX")}</p>
                <h2 className="mt-1 text-2xl font-black text-ink">{idea.problem}</h2>
              </div>
              <StatusPill status={idea.status} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Propuesta</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{idea.proposal}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Beneficio esperado</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{idea.expectedBenefit}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {parseImpactTypes(idea.impactTypes).map((impact) => (
                <span className="rounded-full bg-panel px-3 py-1 text-xs font-bold text-slate-700" key={impact}>
                  {impact}
                </span>
              ))}
            </div>
          </article>

          <article className="surface rounded-lg p-5">
            <h2 className="text-lg font-black text-ink">Validaciones</h2>
            <div className="mt-4 grid gap-3">
              {idea.approvals.map((approval) => (
                <div className={`rounded-lg border p-3 ${approvalTone[approval.type]}`} key={approval.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black">{approvalTypeLabels[approval.type]}</p>
                      <p className="text-sm opacity-75">{approval.assignedTo?.name ?? "Sin asignar"}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">{approvalStatusLabels[approval.status]}</span>
                  </div>
                  {approval.comments ? <p className="mt-2 text-sm opacity-80">{approval.comments}</p> : null}
                </div>
              ))}
            </div>
          </article>

          <article className="surface rounded-lg p-5">
            <h2 className="text-lg font-black text-ink">Evidencias</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {idea.attachments.length ? (
                idea.attachments.map((attachment) => (
                  <a className="rounded-lg border border-line bg-panel p-3 font-bold text-brand-700" href={attachment.path} key={attachment.id} target="_blank">
                    {attachment.type} - {attachment.filename}
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-600">Sin evidencias cargadas.</p>
              )}
            </div>
          </article>

          <article className="surface rounded-lg p-5">
            <h2 className="text-lg font-black text-ink">Comentarios</h2>
            <div className="mt-4 space-y-3">
              {idea.comments.map((comment) => (
                <div className="rounded-lg border border-line bg-panel p-3" key={comment.id}>
                  <p className="text-sm font-black text-ink">{comment.user?.name ?? "Sistema"}</p>
                  <p className="mt-1 text-sm text-slate-700">{comment.comment}</p>
                </div>
              ))}
            </div>
            <form action={addCommentAction} className="mt-4 grid gap-3">
              <input name="ideaId" type="hidden" value={idea.id} />
              <textarea className="field min-h-20" name="comment" placeholder="Agregar comentario" />
              <button className="btn btn-secondary w-full sm:w-fit" type="submit">
                Comentar
              </button>
            </form>
          </article>
        </div>

        <aside className="space-y-5">
          <article className="surface rounded-lg p-5">
            <h2 className="text-lg font-black text-ink">Datos clave</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-bold text-slate-500">Area</dt>
                <dd>{idea.area.code} - {idea.area.name}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Supervisor</dt>
                <dd>{idea.supervisor?.name ?? "Sin supervisor"}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Responsable</dt>
                <dd>{idea.implementationOwner?.name ?? "Sin responsable"}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Prioridad</dt>
                <dd>{idea.priority ? priorityLabels[idea.priority] : "Sin prioridad"}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Clasificacion</dt>
                <dd>{idea.classification ? classificationLabels[idea.classification] : "Sin clasificar"}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Puntos</dt>
                <dd>{idea.pointsAssigned}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">Rol actual</dt>
                <dd>{roleLabels[user.role]}</dd>
              </div>
            </dl>
          </article>

          {canSupervisor && ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"].includes(idea.status) ? (
            <article className="surface rounded-lg p-5">
              <h2 className="text-lg font-black text-ink">Decision supervisor</h2>
              <form action={supervisorDecisionAction} className="mt-4 grid gap-3">
                <input name="ideaId" type="hidden" value={idea.id} />
                <textarea className="field min-h-20" name="comments" placeholder="Justificacion o informacion requerida" />
                <button className="btn btn-primary" name="decision" type="submit" value="APROBAR">
                  Aprobar
                </button>
                <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">
                  Solicitar informacion
                </button>
                <button className="btn btn-danger" name="decision" type="submit" value="RECHAZAR">
                  Rechazar
                </button>
              </form>
            </article>
          ) : null}

          {validationTypes.map((type) => {
            const approval = idea.approvals.find((item) => item.type === type);
            if (!approval || approval.status === "APPROVED" || approval.status === "REJECTED") return null;
            return (
              <article className="surface rounded-lg p-5" key={type}>
                <h2 className="text-lg font-black text-ink">{approvalTypeLabels[type]}</h2>
                <form action={validationDecisionAction} className="mt-4 grid gap-3">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <input name="type" type="hidden" value={type} />
                  <textarea className="field min-h-20" name="comments" placeholder="Comentario o justificacion" />
                  <button className="btn btn-primary" name="decision" type="submit" value="APROBAR">
                    Aprobar validacion
                  </button>
                  <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">
                    Solicitar informacion
                  </button>
                  <button className="btn btn-danger" name="decision" type="submit" value="RECHAZAR">
                    Rechazar
                  </button>
                </form>
              </article>
            );
          })}

          {canMC ? (
            <>
              <article className="surface rounded-lg p-5">
                <h2 className="text-lg font-black text-ink">Clasificacion</h2>
                <form action={classifyIdeaAction} className="mt-4 grid gap-3">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <select className="field" name="classification" defaultValue={idea.classification ?? "IDEA_RAPIDA"}>
                    {Object.entries(classificationLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <textarea className="field min-h-20" name="mcComments" placeholder="Comentarios MC" defaultValue={idea.mcComments ?? ""} />
                  <button className="btn btn-secondary" type="submit">
                    Guardar clasificacion
                  </button>
                </form>
              </article>

              <article className="surface rounded-lg p-5">
                <h2 className="text-lg font-black text-ink">Implementacion</h2>
                <form action={assignImplementationAction} className="mt-4 grid gap-3">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <select className="field" name="ownerId" defaultValue={idea.implementationOwnerId ?? ""} required>
                    <option value="">Responsable</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name}
                      </option>
                    ))}
                  </select>
                  <input className="field" name="dueDate" type="date" defaultValue={idea.dueDate ? idea.dueDate.toISOString().slice(0, 10) : ""} required />
                  <select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input defaultChecked={idea.requiresEvidence} name="requiresEvidence" type="checkbox" />
                    Requiere evidencia obligatoria
                  </label>
                  <button className="btn btn-primary" type="submit">
                    Asignar
                  </button>
                </form>
              </article>
            </>
          ) : null}

          {["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"].includes(idea.status) || canMC ? (
            <article className="surface rounded-lg p-5">
              <h2 className="text-lg font-black text-ink">Avance</h2>
              <form action={implementationUpdateAction} className="mt-4 grid gap-3">
                <input name="ideaId" type="hidden" value={idea.id} />
                <textarea className="field min-h-20" name="comments" placeholder="Avance o comentario" />
                <input className="field" name="afterEvidence" type="file" accept="image/*,.pdf" />
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input name="markImplemented" type="checkbox" />
                  Marcar como implementada
                </label>
                <button className="btn btn-secondary" type="submit">
                  Guardar avance
                </button>
              </form>
            </article>
          ) : null}

          {canMC ? (
            <article className="surface rounded-lg p-5">
              <h2 className="text-lg font-black text-ink">Cierre y puntos sugeridos</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                El sistema marca una sugerencia inicial. Puedes quitar reglas, agregar otras o cambiar puntos antes de cerrar.
              </p>
              {!hasAfterEvidence && idea.requiresEvidence ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  Falta evidencia despues para cierre.
                </p>
              ) : null}

              <div className="mt-4 rounded-lg border border-line bg-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black uppercase text-slate-500">{isClosed ? "Puntos otorgados" : "Sugerencia del sistema"}</p>
                  <p className="text-3xl font-black text-ink">{isClosed ? idea.pointsAssigned : automaticPoints.totalPoints}</p>
                </div>
                <div className="mt-3 space-y-2">
                  {isClosed && idea.pointRuleSelections.length ? (
                    idea.pointRuleSelections.map((item) => {
                      const rule = item.pointRule;
                      const points = item.points;
                      return (
                        <div className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm" key={rule.id}>
                        <div>
                          <p className="font-black text-ink">{rule.name}</p>
                          <p className="text-slate-600">{rule.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
                          +{points}
                        </span>
                      </div>
                      );
                    })
                  ) : (
                    <>
                      {automaticPoints.selectedRules.length ? (
                        automaticPoints.selectedRules.map((rule) => (
                          <div className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm" key={rule.id}>
                            <div>
                              <p className="font-black text-ink">{rule.name}</p>
                              <p className="text-slate-600">{rule.description}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">
                              +{rule.points}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-lg bg-white p-3 text-sm font-bold text-slate-600">
                          No hay reglas sugeridas para esta idea.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!isClosed ? (
                <form action={closeIdeaAction} className="mt-4 grid gap-3">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <div className="rounded-lg border border-line bg-white p-3">
                    <p className="text-sm font-black text-ink">Editar puntos antes de cerrar</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Desmarca lo que no aplique, marca reglas adicionales o cambia el numero de puntos.
                    </p>
                    <div className="mt-3 space-y-2">
                      {pointRules.map((rule) => {
                        const suggested = automaticPoints.selectedRules.some((item) => item.id === rule.id);
                        return (
                          <label className="grid gap-3 rounded-lg border border-line bg-panel p-3 text-sm sm:grid-cols-[1fr_92px]" key={rule.id}>
                            <span className="flex items-start gap-2">
                              <input defaultChecked={suggested} className="mt-1" name="pointRuleIds" type="checkbox" value={rule.id} />
                              <span>
                                <span className="font-black text-ink">
                                  {rule.name}
                                  {suggested ? <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-black text-brand-700">Sugerida</span> : null}
                                </span>
                                <span className="block text-slate-600">{rule.description}</span>
                              </span>
                            </span>
                            <span>
                              <span className="label mb-1">Puntos</span>
                              <input className="field py-2" defaultValue={rule.points} min={0} name={`points-${rule.id}`} type="number" />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <button className="btn btn-primary" type="submit">
                    Cerrar con puntos revisados
                  </button>
                </form>
              ) : null}
              {isClosed && idea.pointsAssigned > 0 ? (
                <form action={removeIdeaPointsAction} className="mt-5 grid gap-3 border-t border-line pt-4">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <textarea className="field min-h-20" name="reason" placeholder="Motivo para retirar puntos" required />
                  <button className="btn btn-danger" type="submit">
                    Retirar puntos
                  </button>
                </form>
              ) : null}
              <form action={cancelIdeaAction} className="mt-5 grid gap-3 border-t border-line pt-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <textarea className="field min-h-20" name="reason" placeholder="Justificacion de cancelacion" />
                <button className="btn btn-danger" type="submit">
                  Cancelar
                </button>
              </form>
            </article>
          ) : null}
        </aside>
      </section>
    </>
  );
}
