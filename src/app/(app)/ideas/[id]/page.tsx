import type { ApprovalType } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ImageIcon,
  MessageSquare,
  MessageSquareMore,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
  UserRound,
  Wrench,
  XCircle
} from "lucide-react";
import {
  addCommentAction,
  assignImplementationAction,
  cancelIdeaAction,
  classifyIdeaAction,
  closeIdeaAction,
  implementationUpdateAction,
  removeIdeaPointsAction,
  reopenRejectedIdeaAction,
  supervisorDecisionAction,
  validationDecisionAction
} from "@/app/actions";
import { IdeaProgress } from "@/components/idea-progress";
import { PageHeader } from "@/components/page-header";
import { ProbocaCoin } from "@/components/proboca-coin";
import { ProbocaCoinsCelebration } from "@/components/proboca-coins-celebration";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import {
  approvalStatusLabels,
  approvalTypeForRole,
  approvalTypeLabels,
  classificationLabels,
  ideaCategoryLabels,
  parseImpactTypes,
  priorityLabels,
  roleHomePath,
  roleLabels
} from "@/lib/domain";
import { requireUser } from "@/lib/auth";
import { isManagerialEvaluationRule } from "@/lib/managerial-evaluation";
import { automaticManagerialEvaluation, automaticPointRules } from "@/lib/points";
import { prisma } from "@/lib/prisma";

type DetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coins?: string; error?: string }>;
};

const approvalTone: Record<ApprovalType, { border: string; accent: string; soft: string; text: string; icon: typeof ShieldCheck }> = {
  SUPERVISOR: { border: "border-emerald-500", accent: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-800", icon: UserRound },
  CALIDAD: { border: "border-red-500", accent: "bg-red-500", soft: "bg-red-50", text: "text-red-800", icon: ShieldCheck },
  SEGURIDAD: { border: "border-slate-500", accent: "bg-slate-500", soft: "bg-slate-100", text: "text-slate-800", icon: ClipboardCheck },
  MANTENIMIENTO: { border: "border-blue-500", accent: "bg-blue-500", soft: "bg-blue-50", text: "text-blue-800", icon: Wrench },
  MEJORA_CONTINUA_FINAL: { border: "border-slate-950", accent: "bg-slate-950", soft: "bg-slate-100", text: "text-slate-950", icon: CheckCircle2 }
};

function isImagePath(path: string) {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(path);
}

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
        pointRuleSelections: { include: { pointRule: true } },
        kaizenProject: true
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
    (user.role === "MANTENIMIENTO" && (idea.approvals.some((approval) => approval.type === "MANTENIMIENTO") || ["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"].includes(idea.status)));

  if (!canViewIdea) redirect(roleHomePath(user.role));

  const canSupervisor = user.role === "ADMIN" || (user.role === "SUPERVISOR" && idea.supervisorId === user.id);
  const roleApprovalType = approvalTypeForRole(user.role);
  const validationTypes: ApprovalType[] = user.role === "ADMIN"
    ? ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"]
    : roleApprovalType
      ? [roleApprovalType].filter((type) => type !== "SUPERVISOR" && type !== "MEJORA_CONTINUA_FINAL")
      : [];
  const canMC = user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
  const hasAfterEvidence = idea.attachments.some((attachment) => attachment.type === "AFTER");
  const automaticPoints = automaticPointRules(idea, pointRules);
  const standardPointRules = pointRules.filter((rule) => !isManagerialEvaluationRule(rule.id));
  const managerialSuggestions = automaticManagerialEvaluation(idea);
  const managerialSuggestionTotal = managerialSuggestions.reduce((sum, suggestion) => sum + suggestion.points, 0);
  const isClosed = idea.status === "CERRADA";
  const canUpdateProgress = ["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"].includes(idea.status);
  const canReviewClose = canMC && (["IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA"].includes(idea.status));
  const canAssign = canMC && !["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status);
  const canClassify = canMC && !["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status);
  const canReopen = canMC && ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status);
  const impacts = parseImpactTypes(idea.impactTypes);
  const returnPath = roleHomePath(user.role);
  const parsedReward = Number.parseInt(query.coins ?? "", 10);
  const rewardAmount = Number.isFinite(parsedReward) ? Math.max(0, Math.min(parsedReward, 999_999)) : null;

  const errorMessage = query.error === "evidencia"
    ? "Falta la evidencia despues. Agregala en Avance antes de cerrar la idea."
    : query.error === "justificacion"
      ? "Escribe una justificacion para completar esta decision."
      : query.error === "informacion"
        ? "Explica qué información necesitas del colaborador."
        : query.error
          ? "Revisa los campos obligatorios e intenta nuevamente."
          : null;

  return (
    <>
      {rewardAmount !== null ? <ProbocaCoinsCelebration amount={rewardAmount} /> : null}
      <PageHeader
        eyebrow={`${roleLabels[user.role]} · Seguimiento de idea`}
        title={idea.folio}
        description={`${idea.area.code} · ${idea.collaboratorName}`}
        actions={
          <>
            <Link className="btn btn-secondary" href={returnPath}><ArrowLeft className="h-4 w-4" aria-hidden />Volver</Link>
            {canMC ? <Link className="btn btn-secondary" href="/kanban">Ver Kanban</Link> : null}
          </>
        }
      />

      {errorMessage ? <div className="alert alert-danger mb-5" role="alert"><XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}

      <section className="surface mb-5 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Registrada el {idea.createdAt.toLocaleString("es-MX")}</p>
            <h2 className="mt-1 max-w-4xl text-xl font-extrabold leading-7 text-ink sm:text-2xl">{idea.problem}</h2>
          </div>
          <StatusPill status={idea.status} />
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <IdeaProgress status={idea.status} />
        </div>
        {idea.kaizenProject ? <div className="mt-5 flex flex-col gap-3 border-l-4 border-amber-500 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase text-amber-800">Convertida en proyecto Kaizen</p><p className="mt-1 text-sm font-bold text-amber-950">{idea.kaizenProject.folio} · {idea.kaizenProject.title}</p></div><Link className="btn bg-amber-500 text-slate-950 hover:bg-amber-400" href={`/kaizen/${idea.kaizenProject.id}`}>Abrir proyecto Kaizen</Link></div> : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <article className="surface rounded-lg p-5 sm:p-6">
            <SectionHeading description="Información original compartida por el colaborador." title="Propuesta de mejora" />
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="border-l-4 border-emerald-600 pl-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Solucion propuesta</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{idea.proposal}</p>
              </div>
              <div className="border-l-4 border-brand-500 pl-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Beneficio esperado</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{idea.expectedBenefit}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">{ideaCategoryLabels[idea.category]}</span>
              {impacts.length ? impacts.map((impact) => <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-bold text-slate-700" key={impact}>{impact}</span>) : <span className="text-sm text-slate-500">Sin impactos seleccionados.</span>}
            </div>
            {idea.requiresExternalSupport ? <div className="mt-4 border-l-4 border-slate-900 bg-slate-50 p-3"><p className="text-xs font-extrabold uppercase text-slate-600">Compra, cotización o apoyo externo</p><p className="mt-1 text-sm leading-5 text-slate-700">{idea.externalSupportDetails}</p></div> : null}
          </article>

          <article className="surface rounded-lg p-5 sm:p-6">
            <SectionHeading count={idea.approvals.length} description="Decisiones registradas por cada departamento." title="Validaciones" />
            <div className="space-y-3">
              {idea.approvals.map((approval) => {
                const tone = approvalTone[approval.type];
                const ApprovalIcon = tone.icon;
                return (
                  <div className={`border-l-4 ${tone.border} ${tone.soft} p-3.5`} key={approval.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <ApprovalIcon className={`h-5 w-5 shrink-0 ${tone.text}`} aria-hidden />
                        <div>
                          <p className={`text-sm font-extrabold ${tone.text}`}>{approvalTypeLabels[approval.type]}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{approval.assignedTo?.name ?? "Sin asignar"}</p>
                        </div>
                      </div>
                      <span className="w-fit rounded-full border border-white bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-700">{approvalStatusLabels[approval.status]}</span>
                    </div>
                    {approval.comments ? <p className="mt-3 border-t border-black/5 pt-2 text-sm leading-5 text-slate-700">{approval.comments}</p> : null}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="surface rounded-lg p-5 sm:p-6">
            <SectionHeading count={idea.attachments.length} description="Archivos que comprueban la situacion antes y despues." title="Evidencias" />
            {idea.attachments.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {idea.attachments.map((attachment) => (
                  <a className="group overflow-hidden rounded-lg border border-line bg-panel" href={attachment.path} key={attachment.id} rel="noreferrer" target="_blank">
                    {isImagePath(attachment.path) ? (
                      <span className="block aspect-[16/9] overflow-hidden bg-slate-100">
                        <img alt={`Evidencia ${attachment.type.toLowerCase()} de ${idea.folio}`} className="h-full w-full object-cover transition group-hover:scale-[1.02]" src={attachment.path} />
                      </span>
                    ) : (
                      <span className="flex aspect-[16/9] items-center justify-center bg-slate-100 text-slate-500"><FileText className="h-9 w-9" aria-hidden /></span>
                    )}
                    <span className="flex items-center gap-3 border-t border-line bg-white p-3">
                      <ImageIcon className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-extrabold uppercase text-slate-500">{attachment.type === "BEFORE" ? "Antes" : attachment.type === "AFTER" ? "Despues" : "Otro"}</span>
                        <span className="block truncate text-sm font-bold text-slate-800">{attachment.filename}</span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            ) : <p className="rounded-lg border border-dashed border-slate-300 bg-panel p-6 text-center text-sm text-slate-500">Todavia no hay evidencias cargadas.</p>}
          </article>

          <article className="surface rounded-lg p-5 sm:p-6">
            <SectionHeading count={idea.comments.length} description="Conversacion y avances registrados por el equipo." title="Comentarios" />
            <div className="space-y-3">
              {idea.comments.length ? idea.comments.map((comment) => (
                <div className="flex gap-3 border-b border-line pb-3 last:border-0" key={comment.id}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-700">{(comment.user?.name ?? "S").charAt(0).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-ink">{comment.user?.name ?? "Sistema"} <span className="ml-1 font-normal text-slate-400">{comment.createdAt.toLocaleString("es-MX")}</span></p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">{comment.comment}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">Sin comentarios todavia.</p>}
            </div>
            <form action={addCommentAction} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <input name="ideaId" type="hidden" value={idea.id} />
              <label>
                <span className="label">Nuevo comentario</span>
                <textarea className="field min-h-20" name="comment" placeholder="Escribe una actualizacion para el equipo" />
              </label>
              <button className="btn btn-secondary" type="submit"><Send className="h-4 w-4" aria-hidden />Comentar</button>
            </form>
          </article>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <article className="surface rounded-lg p-5">
            <h2 className="text-base font-extrabold text-ink">Resumen</h2>
            <dl className="mt-4 divide-y divide-line text-sm">
              {[
                ["Área", `${idea.area.code} · ${idea.area.name}`],
                ["Colaborador", idea.collaboratorName],
                ["Turno", idea.shift],
                ["Categoría", ideaCategoryLabels[idea.category]],
                ["Supervisor", idea.supervisor?.name ?? "Sin supervisor"],
                ["Responsable", idea.implementationOwner?.name ?? "Sin responsable"],
                ["Fecha compromiso", idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"],
                ["Prioridad", idea.priority ? priorityLabels[idea.priority] : "Sin prioridad"],
                ["Clasificación", idea.classification ? classificationLabels[idea.classification] : "Sin clasificar"],
                ["ProbocaCoins", String(idea.pointsAssigned)]
              ].map(([label, value]) => (
                <div className="grid grid-cols-[120px_1fr] gap-3 py-2.5" key={label}>
                  <dt className="text-xs font-bold text-slate-500">{label}</dt>
                  <dd className="text-right text-xs font-extrabold leading-5 text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          {canSupervisor && ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"].includes(idea.status) ? (
            <article className="surface overflow-hidden rounded-lg">
              <div className="h-1 bg-emerald-600" />
              <div className="p-5">
                <h2 className="text-base font-extrabold text-ink">Decision del supervisor</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">El comentario es obligatorio al rechazar o solicitar información.</p>
                <form action={supervisorDecisionAction} className="mt-4 grid gap-2">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <fieldset className="rounded-lg border border-line bg-panel p-3">
                    <legend className="px-1 text-xs font-extrabold text-ink">Apoyo requerido</legend>
                    <p className="mb-2 text-xs leading-5 text-slate-500">Puedes agregar o quitar áreas antes de aprobar.</p>
                    <div className="grid gap-2">
                      <label className="flex items-center gap-2 text-xs font-bold"><input defaultChecked={idea.impactsQuality} name="impactsQuality" type="checkbox" />Calidad / Inocuidad</label>
                      <label className="flex items-center gap-2 text-xs font-bold"><input defaultChecked={idea.impactsSafety} name="impactsSafety" type="checkbox" />Seguridad</label>
                      <label className="flex items-center gap-2 text-xs font-bold"><input defaultChecked={idea.requiresMaintenance} name="requiresMaintenance" type="checkbox" />Mantenimiento</label>
                    </div>
                  </fieldset>
                  <textarea className="field min-h-20" name="comments" placeholder="Comentario de la decision" />
                  <button className="btn btn-success" name="decision" type="submit" value="APROBAR"><Check className="h-4 w-4" aria-hidden />Aprobar idea</button>
                  <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION"><MessageSquareMore className="h-4 w-4" aria-hidden />Solicitar información</button>
                  <button className="btn btn-danger" name="decision" type="submit" value="RECHAZAR"><XCircle className="h-4 w-4" aria-hidden />Rechazar</button>
                </form>
              </div>
            </article>
          ) : null}

          {canReopen ? (
            <details className="details-panel border-slate-900" open>
              <summary><span className="flex items-center gap-2 text-slate-950"><RotateCcw className="h-4 w-4" aria-hidden />Revalidar idea rechazada</span></summary>
              <form action={reopenRejectedIdeaAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <p className="text-xs leading-5 text-slate-600">Mejora Continua puede justificar la recuperación y enviarla nuevamente a las áreas que deban apoyar.</p>
                <label><span className="label">Justificación de la revalidación *</span><textarea className="field min-h-24" name="justification" placeholder="Explica por qué debe continuar y qué cambió en la evaluación" required /></label>
                <fieldset>
                  <legend className="label">Solicitar apoyo a</legend>
                  <div className="grid gap-2">
                    <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-xs font-bold"><input defaultChecked={idea.impactsQuality} name="impactsQuality" type="checkbox" />Calidad / Inocuidad</label>
                    <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-xs font-bold"><input defaultChecked={idea.impactsSafety} name="impactsSafety" type="checkbox" />Seguridad</label>
                    <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-xs font-bold"><input defaultChecked={idea.requiresMaintenance} name="requiresMaintenance" type="checkbox" />Mantenimiento</label>
                  </div>
                </fieldset>
                <button className="btn btn-primary" type="submit"><RotateCcw className="h-4 w-4" aria-hidden />Reabrir y enviar a validación</button>
              </form>
            </details>
          ) : null}

          {validationTypes.map((type) => {
            const approval = idea.approvals.find((item) => item.type === type);
            if (!approval || approval.status === "APPROVED" || approval.status === "REJECTED") return null;
            const tone = approvalTone[type];
            return (
              <article className="surface overflow-hidden rounded-lg" key={type}>
                <div className={`h-1 ${tone.accent}`} />
                <div className="p-5">
                  <h2 className="text-base font-extrabold text-ink">{approvalTypeLabels[type]}</h2>
                  <form action={validationDecisionAction} className="mt-4 grid gap-2">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <input name="type" type="hidden" value={type} />
                    <textarea className="field min-h-20" name="comments" placeholder="Comentario de la validación" />
                    <button className="btn btn-success" name="decision" type="submit" value="APROBAR"><Check className="h-4 w-4" aria-hidden />Aprobar validación</button>
                    <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">Solicitar información</button>
                    <button className="btn btn-danger" name="decision" type="submit" value="RECHAZAR">Rechazar</button>
                  </form>
                </div>
              </article>
            );
          })}

          {canClassify ? (
            <details className="details-panel" open={["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"].includes(idea.status)}>
              <summary><span className="flex items-center gap-2"><Tag className="h-4 w-4 text-slate-500" aria-hidden />Clasificar y priorizar</span></summary>
              <form action={classifyIdeaAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <label><span className="label">Clasificación</span><select className="field" name="classification" defaultValue={idea.classification ?? "IDEA_RAPIDA"}>{Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span className="label">Prioridad</span><select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span className="label">Comentario de MC</span><textarea className="field min-h-20" name="mcComments" placeholder="Criterio o alcance" defaultValue={idea.mcComments ?? ""} /></label>
                <button className="btn btn-secondary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar clasificación</button>
              </form>
            </details>
          ) : null}

          {canAssign ? (
            <details className="details-panel" open={["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"].includes(idea.status)}>
              <summary><span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-500" aria-hidden />Asignar implementación</span></summary>
              <form action={assignImplementationAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <label><span className="label">Responsable</span><select className="field" name="ownerId" defaultValue={idea.implementationOwnerId ?? ""} required><option value="">Seleccionar responsable</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
                <label><span className="label">Fecha compromiso</span><input className="field" name="dueDate" type="date" defaultValue={idea.dueDate ? idea.dueDate.toISOString().slice(0, 10) : ""} required /></label>
                <label><span className="label">Prioridad</span><select className="field" name="priority" defaultValue={idea.priority ?? "MEDIA"}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input defaultChecked={idea.requiresEvidence} name="requiresEvidence" type="checkbox" />Requiere evidencia final</label>
                <button className="btn btn-primary" type="submit">Guardar asignacion</button>
              </form>
            </details>
          ) : null}

          {canUpdateProgress ? (
            <details className="details-panel" open={idea.status === "EN_IMPLEMENTACION" || idea.status === "VENCIDA"}>
              <summary><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-500" aria-hidden />Registrar avance</span></summary>
              <form action={implementationUpdateAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <label><span className="label">Avance o comentario</span><textarea className="field min-h-20" name="comments" placeholder="Describe lo realizado" /></label>
                <label><span className="label">Evidencia después</span><input className="field" name="afterEvidence" type="file" accept="image/*,.pdf" /></label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="markImplemented" type="checkbox" />Marcar como implementada</label>
                <button className="btn btn-primary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar avance</button>
              </form>
            </details>
          ) : null}

          {canReviewClose ? (
            <details className="details-panel" open={!isClosed}>
              <summary><span className="flex items-center gap-2"><ProbocaCoin size="sm" />{isClosed ? "ProbocaCoins otorgadas" : "Cierre y ProbocaCoins"}</span></summary>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                  <div><p className="text-xs font-extrabold uppercase text-slate-500">{isClosed ? "Total de ProbocaCoins" : "ProbocaCoins sugeridas"}</p><p className="mt-1 text-xs text-slate-500">Base {automaticPoints.totalPoints} + evaluacion gerencial {managerialSuggestionTotal}. Todo puede ajustarse.</p></div>
                  <p className="flex items-center gap-2 text-3xl font-extrabold text-ink"><ProbocaCoin size="md" />{isClosed ? idea.pointsAssigned : automaticPoints.totalPoints + managerialSuggestionTotal}</p>
                </div>
                {!hasAfterEvidence && idea.requiresEvidence ? <div className="alert alert-warning mt-3">Falta evidencia despues para cerrar.</div> : null}

                {isClosed ? (
                  <div className="mt-3 space-y-2">
                    {idea.pointRuleSelections.map((item) => <div className="flex items-start justify-between gap-3 border-b border-line py-2 text-sm last:border-0" key={item.id}><span><span className="block font-extrabold text-ink">{item.pointRule.name}</span><span className="block text-xs text-slate-500">{item.pointRule.description}</span></span><span className="flex items-center gap-1 font-extrabold text-emerald-700"><ProbocaCoin size="sm" />+{item.points}</span></div>)}
                  </div>
                ) : (
                  <form action={closeIdeaAction} className="mt-3 grid gap-3">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <div className="space-y-2">
                      {standardPointRules.map((rule) => {
                        const suggested = automaticPoints.selectedRules.some((item) => item.id === rule.id);
                        return (
                          <label className="grid gap-2 rounded-lg border border-line bg-panel p-3 text-sm sm:grid-cols-[1fr_82px]" key={rule.id}>
                            <span className="flex items-start gap-2"><input defaultChecked={suggested} className="mt-1" name="pointRuleIds" type="checkbox" value={rule.id} /><span><span className="font-extrabold text-ink">{rule.name}</span>{suggested ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">Sugerida</span> : null}<span className="mt-0.5 block text-xs text-slate-500">{rule.description}</span></span></span>
                            <span><span className="label mb-1">ProbocaCoins</span><input className="field min-h-10 py-2" defaultValue={rule.points} min={0} name={`points-${rule.id}`} type="number" /></span>
                          </label>
                        );
                      })}
                    </div>
                    <fieldset className="border-t border-line pt-4">
                      <legend className="mb-3 flex w-full items-center justify-between gap-3 text-sm font-extrabold text-ink">
                        <span>Evaluacion gerencial complementaria</span>
                        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] text-white">Hasta 500 ProbocaCoins</span>
                      </legend>
                      <p className="mb-3 text-xs leading-5 text-slate-500">Los niveles aparecen sugeridos con los datos de la idea. Selecciona otra opcion o elige No incluir.</p>
                      <div className="space-y-3">
                        {managerialSuggestions.map(({ factor, points, criterion }) => {
                          const rule = pointRules.find((item) => item.id === factor.ruleId);
                          if (!rule) return null;
                          return (
                            <label className="grid gap-2 border-l-4 border-slate-900 bg-slate-50 p-3 text-sm" key={factor.ruleId}>
                              <span>
                                <span className="font-extrabold text-ink">{factor.ruleName}</span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">Sugerida: {criterion} ({points} ProbocaCoins)</span>
                              </span>
                              <select className="field" defaultValue={String(points)} name={`managerial-${factor.ruleId}`}>
                                <option value="">No incluir este factor</option>
                                {factor.options.map((option) => <option key={option.points} value={option.points}>{option.points} ProbocaCoins - {option.label}</option>)}
                              </select>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                    <button className="btn btn-success" type="submit"><CheckCircle2 className="h-4 w-4" aria-hidden />Cerrar y entregar ProbocaCoins</button>
                  </form>
                )}

                {isClosed && idea.pointsAssigned > 0 ? (
                  <form action={removeIdeaPointsAction} className="mt-4 grid gap-2 border-t border-line pt-4">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <textarea className="field min-h-20" name="reason" placeholder="Motivo para retirar las ProbocaCoins" required />
                    <button className="btn btn-danger" type="submit"><Trash2 className="h-4 w-4" aria-hidden />Retirar ProbocaCoins</button>
                  </form>
                ) : null}
              </div>
            </details>
          ) : null}

          {canMC && !["CANCELADA", "CERRADA"].includes(idea.status) ? (
            <details className="details-panel border-rose-200">
              <summary><span className="flex items-center gap-2 text-rose-700"><XCircle className="h-4 w-4" aria-hidden />Cancelar idea</span></summary>
              <form action={cancelIdeaAction} className="grid gap-3 p-4">
                <input name="ideaId" type="hidden" value={idea.id} />
                <label><span className="label">Justificación</span><textarea className="field min-h-20" name="reason" placeholder="Explica por qué se cancela" required /></label>
                <button className="btn btn-danger" type="submit">Confirmar cancelacion</button>
              </form>
            </details>
          ) : null}
        </aside>
      </section>
    </>
  );
}
