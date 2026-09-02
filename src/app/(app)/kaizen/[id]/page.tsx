import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Archive, ArrowLeft, CalendarDays, CheckCircle2, Coins, FileText, FolderOpen, GitMerge, MessageSquare, Paperclip, Plus, Save, Target, Trash2, Upload, UserPlus, UsersRound, XCircle, RotateCcw } from "lucide-react";
import {
  addKaizenActivityAction,
  addKaizenTeamMemberAction,
  addKaizenUpdateAction,
  closeKaizenActivityAction,
  closeKaizenProjectAction,
  mergeKaizenActivitiesAction,
  removeKaizenTeamMemberAction,
  updateKaizenActivityAction,
  updateKaizenProjectAction,
  updateKaizenClosureNoteAction,
  updateKaizenRewardsAction,
  uploadKaizenCharterAction, reopenKaizenActivityAction } from "@/app/actions";
import { SearchablePicker } from "@/components/searchable-picker";
import { KaizenStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProbocaCoin } from "@/components/proboca-coin";
import { ProbocaCoinsCelebration } from "@/components/proboca-coins-celebration";
import { ProgressMeter } from "@/components/progress-meter";
import { SectionHeading } from "@/components/section-heading";
import { KaizenProjectGantt } from "@/components/kaizen-project-gantt";
import { WorkItemDisclosure } from "@/components/work-item-disclosure";
import { isWorkItemOverdue, workItemStatusLabels, workProgress } from "@/lib/domain";
import { operationalUserWhere } from "@/lib/director-policy";
import { kaizenClosureReadiness } from "@/lib/kaizen-closure";
import { requireKaizenAccess } from "@/lib/module-access";
import { personOptions } from "@/lib/person-options";
import { prisma } from "@/lib/prisma";

type KaizenDetailProps = { params: Promise<{ id: string }>; searchParams: Promise<{ coins?: string; error?: string; success?: string }> };

const kaizenStatusLabels = {
  PENDIENTE_CHARTER: "Pendiente de Project Charter",
  PLANIFICACION: "En planificacion",
  EN_CURSO: "En curso",
  EN_PAUSA: "En pausa"
} as const;

export default async function KaizenDetailPage({ params, searchParams }: KaizenDetailProps) {
  const { user, canManage: hasManagePermission, canViewAll } = await requireKaizenAccess();
  const { id } = await params;
  const query = await searchParams;
  const [project, users, coinTransactions] = await Promise.all([
    prisma.kaizenProject.findUnique({
      where: { id },
      include: {
        leader: true,
        closedBy: true,
        createdBy: true,
        sourceIdea: true,
        teamMembers: { include: { user: true }, orderBy: { createdAt: "asc" } },
        activities: { include: { owner: true, mergedInto: true, attachments: true }, orderBy: { number: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" }, take: 60 }
      }
    }),
    prisma.user.findMany({ where: operationalUserWhere(), orderBy: { name: "asc" } }),
    prisma.coinTransaction.findMany({
      where: { sourceType: "KAIZEN", sourceId: id },
      include: { participant: { select: { userId: true, name: true, employeeNumber: true } } },
      orderBy: { occurredAt: "asc" }
    })
  ]);
  if (!project) notFound();
  if (!canViewAll && project.leaderId !== user.id && !project.teamMembers.some((member) => member.userId === user.id) && !project.activities.some((activity) => activity.ownerId === user.id)) notFound();
  const progress = workProgress(project.activities);
  const charterFiles = project.attachments.filter((attachment) => attachment.type === "CHARTER");
  const activeActivities = project.activities.filter((activity) => !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
  const overdue = project.activities.filter(isWorkItemOverdue).length;
  const projectClosed = project.status === "COMPLETADO" || project.status === "CANCELADO";
  const canManage = hasManagePermission && !projectClosed;
  // El auto-cierre gana la carrera contra el boton "Completar Kaizen", asi que el resultado
  // se escribe despues. El lider tambien puede, porque es quien conoce el resultado.
  const canWriteClosureNote = projectClosed && (hasManagePermission || project.leaderId === user.id);
  const closureNoteIsAutomatic = Boolean(project.closureNote?.startsWith("Cierre automatico:"));
  const relevantActivities = project.activities.filter((activity) => activity.status !== "COMBINADA");
  const closureReadiness = kaizenClosureReadiness({
    activities: relevantActivities.map((activity) => ({ status: activity.status, evidenceCount: activity.attachments.length })),
    hasCharter: charterFiles.length > 0,
    teamCount: project.teamMembers.length
  });
  const { allActivitiesResolved, completedActivitiesHaveEvidence, hasCompletedResult, ready: readyToClose } = closureReadiness;
  const teamCoins = new Map<string, number>();
  for (const transaction of coinTransactions) {
    if (!transaction.participant.userId) continue;
    teamCoins.set(transaction.participant.userId, (teamCoins.get(transaction.participant.userId) ?? 0) + transaction.amount);
  }
  const totalCoins = coinTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const celebrationAmount = Math.max(0, Number.parseInt(query.coins ?? "", 10) || 0);
  const detailedErrorMessage = query.error === "motivo_reapertura" ? "Escribe el motivo de la reapertura; queda en la bitacora y no puede ir vacio."
    : query.error === "no_cerrada" ? "Esa actividad no esta cerrada, asi que no hay nada que reabrir."
    : query.error === "evidencia" ? "Para completar una actividad debes adjuntar evidencia."
    : query.error === "justificacion" ? "Escribe el motivo por el que la actividad no se realizara."
    : query.error === "charter" || query.error === "cierre_charter" ? "Carga el Project Charter antes de completar el Kaizen."
    : query.error === "cierre_actividades" ? "Resuelve todas las actividades antes de completar el proyecto."
    : query.error === "cierre_resultado" ? "Debe existir al menos una actividad completada; un conjunto cancelado no representa un resultado Kaizen."
    : query.error === "cierre_evidencia" ? "Cada actividad completada debe conservar al menos una evidencia."
    : query.error === "cierre_equipo" ? "Define al menos al lider en el equipo antes de cerrar."
    : query.error === "cierre_datos" ? "Escribe el resultado final o la causa de cancelacion."
    : query.error === "lider_equipo" ? "El lider no puede retirarse del equipo; cambia primero al lider del proyecto."
    : query.error === "responsable_equipo" ? "No puedes retirar a una persona que sigue asignada a una actividad."
    : query.error === "sin_permiso" ? "Tu permiso sobre este expediente cambio mientras trabajabas. Pide acceso a Mejora Continua antes de reintentar."
    : query.error === "no_cerrado" ? "El expediente sigue abierto: el resultado final se registra despues del cierre."
    : query.error === "cerrado" ? "Este expediente ya esta cerrado y se conserva en modo consulta."
    : query.error === "coins" ? "Las ProbocaCoins deben ser numeros enteros iguales o mayores a cero."
    : query.error ? "Revisa los campos obligatorios." : null;
  const successMessage = query.success === "equipo" ? "El equipo responsable se actualizo."
    : query.success === "cerrado" ? "El Kaizen se cerro y quedo disponible en el repositorio."
    : query.success === "cierre_nota" ? "El resultado final quedo registrado en el expediente."
    : query.success === "coins" ? "Las ProbocaCoins del equipo se conciliaron correctamente."
    : null;

  return (
    <>
      {celebrationAmount ? <ProbocaCoinsCelebration amount={celebrationAmount} /> : null}
      <PageHeader eyebrow={`Proyectos Kaizen · Kaizen #${String(project.number).padStart(3, "0")}`} title={project.title} description={`${project.area}${project.plant ? ` · ${project.plant}` : ""}`} actions={<><Link className="btn btn-secondary" href="/kaizen"><ArrowLeft className="h-4 w-4" aria-hidden />Panel</Link><Link className="btn btn-secondary" href="/kaizen/repositorio"><Archive className="h-4 w-4" aria-hidden />Repositorio</Link><Link className="btn btn-secondary" href="/kaizen/gantt"><CalendarDays className="h-4 w-4" aria-hidden />Gantt</Link></>} />
      {detailedErrorMessage ? <div className="alert alert-danger mb-5"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{detailedErrorMessage}</span></div> : null}
      {successMessage ? <div className="alert alert-success mb-5"><CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{successMessage}</span></div> : null}

      <section className="surface mb-5 rounded-lg p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><KaizenStatusPill status={project.status} />{project.sourceIdea ? <Link className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-extrabold text-slate-700 hover:border-slate-400" href={`/ideas/${project.sourceIdea.id}`}>Origen {project.sourceIdea.folio}</Link> : null}{charterFiles.length ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">Charter cargado</span> : <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">Charter pendiente</span>}</div><p className="mt-4 max-w-4xl text-lg font-extrabold leading-7 text-ink">{project.objective}</p><p className="mt-2 text-sm leading-6 text-slate-600">{project.scope ?? "Alcance por definir."}</p></div>
          <div className="rounded-lg border border-line bg-panel p-4"><ProgressMeter label={`${progress.closed} de ${progress.total} actividades cerradas`} percent={progress.percent} /><div className="mt-4 grid grid-cols-2 gap-3 text-center"><div><p className="text-2xl font-extrabold text-ink">{progress.open}</p><p className="text-[10px] font-bold uppercase text-slate-500">Abiertas</p></div><div><p className={`text-2xl font-extrabold ${overdue ? "text-rose-700" : "text-ink"}`}>{overdue}</p><p className="text-[10px] font-bold uppercase text-slate-500">Vencidas</p></div></div></div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <article className="surface rounded-lg p-5">
            <SectionHeading description="Indicador, responsables y calendario del proyecto." title="Ficha ejecutiva" />
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border-l-4 border-amber-500 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Líder</dt><dd className="mt-1 text-sm font-extrabold text-ink">{project.leader.name}</dd></div>
              <div className="border-l-4 border-slate-300 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Periodo</dt><dd className="mt-1 text-sm font-extrabold text-ink">{project.startDate.toLocaleDateString("es-MX")} – {project.endDate.toLocaleDateString("es-MX")}</dd></div>
              {/* El retraso solo se muestra cuando el Excel declaro un cierre comprometido
                  distinto al real. Sin reagenda no hay nada que reportar y una casilla en
                  cero solo restaria atencion a las tres que si dicen algo. */}
              {project.originalEndDate ? (
                <div className="border-l-4 border-brand-500 pl-3">
                  <dt className="text-[10px] font-extrabold uppercase text-slate-500">Retraso sobre el compromiso</dt>
                  <dd className="mt-1 text-sm font-extrabold text-ink">{Math.round((project.endDate.getTime() - project.originalEndDate.getTime()) / 86_400_000)} días</dd>
                  <dd className="mt-0.5 text-[11px] text-slate-500">Comprometido {project.originalEndDate.toLocaleDateString("es-MX")}</dd>
                </div>
              ) : null}
              <div className="border-l-4 border-slate-300 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Actual → Meta → Real</dt><dd className="mt-1 text-sm font-extrabold text-ink">{project.baselineValue ?? "–"} → {project.targetValue ?? "–"} → {project.currentValue ?? "–"} {project.unit ?? ""}</dd></div>
              <div className="border-l-4 border-emerald-500 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Ahorro estimado / real</dt><dd className="mt-1 text-sm font-extrabold text-ink">${(project.estimatedSavings ?? 0).toLocaleString("es-MX")} / ${(project.realSavings ?? 0).toLocaleString("es-MX")}</dd></div>
            </dl>
          </article>

          <article className="surface rounded-lg p-5">
            <SectionHeading count={project.teamMembers.length} description="Personas responsables del resultado y reconocimiento del Kaizen." title="Equipo del proyecto" />
            {!project.teamMembers.length ? <div className="alert alert-warning"><UsersRound className="h-4 w-4 shrink-0" aria-hidden />Agrega al lider y a quienes participaron antes de cerrar.</div> : (
              <div className="divide-y divide-line border-y border-line">
                {project.teamMembers.map((member) => (
                  <div className="grid gap-2 px-2 py-3 sm:grid-cols-[minmax(0,1fr)_180px_130px_auto] sm:items-center" key={member.id}>
                    <div className="min-w-0"><p className="truncate text-sm font-extrabold text-ink">{member.user.name}</p><p className="truncate text-xs text-slate-500">{member.user.employeeNumber ?? member.user.email}</p></div>
                    <p className="text-xs font-bold text-slate-600">{member.role}<span className="mt-0.5 block text-[10px] font-normal text-slate-500">{member.rewardAmount === null ? "Decision pendiente" : member.rewardAmount > 0 ? "Reconocimiento otorgado" : "Sin reconocimiento (decidido)"}</span></p>
                    <p className="inline-flex items-center gap-1.5 text-xs font-extrabold tabular-nums text-ink"><ProbocaCoin size="sm" />{(teamCoins.get(member.userId) ?? 0).toLocaleString("es-MX")}</p>
                    {canManage && !projectClosed && member.userId !== project.leaderId ? <form action={removeKaizenTeamMemberAction}><input name="projectId" type="hidden" value={project.id} /><input name="memberId" type="hidden" value={member.id} /><button aria-label={`Retirar a ${member.user.name} del equipo`} className="icon-button h-9 w-9" title="Retirar del equipo" type="submit"><Trash2 className="h-4 w-4" aria-hidden /></button></form> : null}
                  </div>
                ))}
              </div>
            )}
            {canManage && !projectClosed ? (
              <details className="details-panel mt-4">
                <summary><span className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-amber-700" aria-hidden />Agregar o actualizar integrante</span></summary>
                <form action={addKaizenTeamMemberAction} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
                  <input name="projectId" type="hidden" value={project.id} />
                  <SearchablePicker label="Persona" name="userId" options={personOptions(users)} placeholder="Nombre o numero de empleado" required />
                  <label><span className="label">Funcion en el equipo</span><select className="field" defaultValue="Miembro" name="role"><option value="Patrocinador">Patrocinador</option><option value="Facilitador">Facilitador</option><option value="Miembro">Miembro</option><option value="Apoyo">Apoyo</option><option value="Responsable de actividad">Responsable de actividad</option></select></label>
                  <button className="btn btn-secondary" type="submit"><UserPlus className="h-4 w-4" aria-hidden />Guardar</button>
                </form>
              </details>
            ) : null}
          </article>

          <article className="surface rounded-lg p-5">
            <SectionHeading
              description={project.originalEndDate ? "El tramo rojo es lo que se recorrió respecto del cierre comprometido." : "Calendario del proyecto y de sus actividades sobre la misma línea de tiempo."}
              title="Calendario del proyecto"
            />
            <KaizenProjectGantt
              activities={project.activities}
              endDate={project.endDate}
              originalEndDate={project.originalEndDate}
              startDate={project.startDate}
            />
          </article>

          <section>
            <SectionHeading count={project.activities.filter((activity) => activity.status !== "COMBINADA").length} description="El avance del proyecto se calcula automáticamente con estas actividades." title="Plan de actividades" tone="dark" />
            {!project.activities.length ? <div className="surface rounded-lg border-dashed p-8 text-center text-sm text-slate-500">Todavía no hay actividades en este Kaizen.</div> : null}
            <div className="overflow-hidden rounded-lg">
              {project.activities.map((activity) => {
                const canClose = !projectClosed && (canManage || project.leaderId === user.id || activity.ownerId === user.id);
                const terminal = ["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status);
                return (
                  <WorkItemDisclosure description={activity.problem ? `Problema: ${activity.problem}` : null} dueDate={activity.dueDate} id={`actividad-${activity.id}`} key={activity.id} number={activity.number} overdue={isWorkItemOverdue(activity)} owner={activity.owner?.name} status={activity.status} title={activity.action} tone="amber">
                      <div className="grid gap-3 text-xs sm:grid-cols-2">
                        <p className="border-l-4 border-slate-300 pl-3"><span className="block text-[10px] font-extrabold uppercase text-slate-400">Contexto</span><span className="mt-1 block leading-5 text-slate-700">{activity.problem ?? "Sin problemática adicional."}</span></p>
                        <p className="flex items-center gap-2 border-l-4 border-slate-300 pl-3"><Paperclip className="h-4 w-4 text-slate-400" aria-hidden /><span><span className="block text-[10px] font-extrabold uppercase text-slate-400">Evidencias</span><span className="mt-1 block font-extrabold text-slate-700">{activity.attachments.length}</span></span></p>
                      </div>
                      {activity.mergedInto ? <div className="alert alert-info mt-3"><GitMerge className="h-4 w-4 shrink-0" aria-hidden />Combinada con actividad #{activity.mergedInto.number}. {activity.mergeReason}</div> : null}
                      {activity.completionNote || activity.cancellationReason ? <p className="mt-3 rounded-lg bg-panel p-3 text-sm leading-5 text-slate-700">{activity.completionNote ?? activity.cancellationReason}</p> : null}
                      {activity.attachments.length ? <div className="mt-3 flex flex-wrap gap-2">{activity.attachments.map((file) => <a className="btn btn-secondary" href={file.path} key={file.id} rel="noreferrer" target="_blank"><Paperclip className="h-4 w-4" aria-hidden />{file.filename}</a>)}</div> : null}

                      {!terminal && (canManage || canClose) ? <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {canManage && !terminal ? <details className="details-panel"><summary>Editar actividad</summary><form action={updateKaizenActivityAction} className="grid gap-3 p-4"><input name="activityId" type="hidden" value={activity.id} /><label><span className="label">Problemática</span><textarea className="field min-h-20" defaultValue={activity.problem ?? ""} name="problem" /></label><label><span className="label">Acción</span><textarea className="field min-h-20" defaultValue={activity.action} name="action" required /></label><SearchablePicker defaultValue={activity.ownerId ?? ""} label="Responsable" name="ownerId" options={personOptions(users)} placeholder="Nombre o numero de empleado" /><div className="grid grid-cols-2 gap-2"><label><span className="label">Inicio</span><input className="field" defaultValue={activity.startDate?.toISOString().slice(0, 10) ?? ""} name="startDate" type="date" /></label><label><span className="label">Compromiso</span><input className="field" defaultValue={activity.dueDate?.toISOString().slice(0, 10) ?? ""} name="dueDate" type="date" /></label></div><label><span className="label">Estado</span><select className="field" defaultValue={activity.status} name="status"><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="BLOQUEADA">Bloqueada</option></select></label><button className="btn btn-secondary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar actividad</button></form></details> : null}
                        {canClose ? <details className="details-panel"><summary>Cerrar actividad</summary><form action={closeKaizenActivityAction} className="grid gap-3 p-4"><input name="activityId" type="hidden" value={activity.id} /><p className="text-xs leading-5 text-slate-600">Para completar, adjunta evidencia. Si no se hará, escribe la justificación.</p><label><span className="label">Evidencia</span><input className="field" name="evidence" type="file" accept="image/*,.pdf,.doc,.docx" /></label><label><span className="label">Resultado o justificación</span><textarea className="field min-h-20" name="note" placeholder="Qué se realizó o por qué no se realizará" /></label><div className="grid gap-2 sm:grid-cols-2"><button className="btn btn-success" name="outcome" type="submit" value="COMPLETADA"><CheckCircle2 className="h-4 w-4" aria-hidden />Completar</button><button className="btn btn-danger" name="outcome" type="submit" value="CANCELADA"><XCircle className="h-4 w-4" aria-hidden />Cerrar sin ejecutar</button></div></form></details> : null}
                      </div> : null}

                      {/* Reabrir vive fuera del bloque de arriba porque su condicion es la
                          contraria: aparece justo cuando la actividad ya esta cerrada.
                          COMBINADA queda fuera a proposito: deshacer una combinacion es
                          otra operacion, con su propio flujo. */}
                      {!projectClosed && canClose && ["COMPLETADA", "CANCELADA"].includes(activity.status) ? (
                        <details className="details-panel mt-4">
                          <summary><span className="flex items-center gap-2"><RotateCcw className="h-4 w-4" aria-hidden />Reabrir actividad</span></summary>
                          <form action={reopenKaizenActivityAction} className="grid gap-3 p-4">
                            <input name="activityId" type="hidden" value={activity.id} />
                            <p className="text-xs leading-5 text-slate-600">Vuelve al plan como <strong>en proceso</strong> y el avance del proyecto baja. Si el Kaizen ya estaba cerrado, se reabre también.</p>
                            <label>
                              <span className="label">Motivo de la reapertura</span>
                              <textarea className="field min-h-20" name="reason" placeholder="Por qué hay que volver a trabajarla" required />
                              <span className="helper-text">Queda en la bitácora y en la auditoría. Se explícito.</span>
                            </label>
                            <button className="btn btn-secondary" type="submit"><RotateCcw className="h-4 w-4" aria-hidden />Reabrir</button>
                          </form>
                        </details>
                      ) : null}
                  </WorkItemDisclosure>
                );
              })}
            </div>
          </section>

          <article className="surface rounded-lg p-5">
            <SectionHeading count={project.updates.length} description="Comentarios y decisiones en orden cronológico." title="Bitácora" />
            {canManage ? <form action={addKaizenUpdateAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><input name="projectId" type="hidden" value={project.id} /><label><span className="label">Nuevo seguimiento</span><textarea className="field min-h-20" name="comment" placeholder="Avance, bloqueo, acuerdo o siguiente paso" required /></label><button className="btn btn-secondary" type="submit"><MessageSquare className="h-4 w-4" aria-hidden />Agregar</button></form> : null}
            <div className="mt-5 space-y-3 border-t border-line pt-4">{project.updates.map((update) => <div className="flex gap-3" key={update.id}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold">{(update.user?.name ?? "S").charAt(0)}</span><div><p className="text-xs font-extrabold text-ink">{update.user?.name ?? "Sistema"} <span className="font-normal text-slate-400">{update.createdAt.toLocaleString("es-MX")}</span></p><p className="mt-1 text-sm leading-5 text-slate-700">{update.comment}</p></div></div>)}</div>
          </article>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <article className="surface rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${projectClosed ? "bg-emerald-50 text-emerald-800" : readyToClose ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}><CheckCircle2 className="h-5 w-5" aria-hidden /></span><div><h2 className="text-base font-extrabold text-ink">{projectClosed ? "Expediente cerrado" : readyToClose ? "Listo para cerrar" : "Preparacion de cierre"}</h2><p className="text-xs text-slate-500">Revision final y ProbocaCoins</p></div></div>
              <span className="inline-flex items-center gap-1 text-sm font-extrabold tabular-nums text-ink"><ProbocaCoin size="sm" />{totalCoins.toLocaleString("es-MX")}</span>
            </div>

            {projectClosed ? (
              <>
                <dl className="mt-4 divide-y divide-line text-xs">
                  <div className="flex justify-between gap-3 py-2.5"><dt className="font-bold text-slate-500">Resultado</dt><dd className="font-extrabold text-ink">{project.status === "COMPLETADO" ? "Completado" : "Cancelado"}</dd></div>
                  <div className="flex justify-between gap-3 py-2.5"><dt className="font-bold text-slate-500">Fecha</dt><dd className="font-extrabold text-ink">{project.closedAt?.toLocaleDateString("es-MX") ?? "Sin fecha"}</dd></div>
                  <div className="flex justify-between gap-3 py-2.5"><dt className="font-bold text-slate-500">Cerro</dt><dd className="text-right font-extrabold text-ink">{project.closedBy?.name ?? "Sistema"}</dd></div>
                </dl>
                <p className="mt-3 border-l-4 border-slate-300 pl-3 text-sm leading-5 text-slate-700">{project.closureNote ?? "Sin nota de cierre."}</p>
                {canWriteClosureNote ? (
                  <details className="details-panel mt-4" open={query.error === "cierre_datos"}>
                    <summary><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden />{closureNoteIsAutomatic ? "Escribir el resultado final" : "Corregir el resultado final"}</span></summary>
                    <form action={updateKaizenClosureNoteAction} className="grid gap-3 p-4">
                      <input name="projectId" type="hidden" value={project.id} />
                      <label>
                        <span className="label">Resultado final o motivo *</span>
                        <textarea className="field min-h-24" defaultValue={closureNoteIsAutomatic ? "" : project.closureNote ?? ""} minLength={10} name="closureNote" placeholder="Resultado alcanzado, sostenimiento o causa de cancelacion" required />
                      </label>
                      {closureNoteIsAutomatic ? <p className="text-xs leading-5 text-slate-500">El sistema cerro este expediente al confirmar los requisitos. Escribe el resultado real para que el repositorio conserve la narrativa y no el texto automatico.</p> : null}
                      <button className="btn btn-secondary" type="submit"><CheckCircle2 className="h-4 w-4" aria-hidden />Guardar resultado</button>
                    </form>
                  </details>
                ) : null}
                {hasManagePermission && project.teamMembers.length ? (
                  <details className="details-panel mt-4">
                    <summary><span className="flex items-center gap-2"><Coins className="h-4 w-4 text-amber-700" aria-hidden />Ajustar ProbocaCoins</span></summary>
                    <form action={updateKaizenRewardsAction} className="grid gap-3 p-4">
                      <input name="projectId" type="hidden" value={project.id} />
                      {project.teamMembers.map((member) => <label key={member.id}><span className="label">{member.user.name} · {member.role}</span><input className="field" defaultValue={member.rewardAmount ?? teamCoins.get(member.userId) ?? 0} min={0} name={`coins-${member.id}`} step={1} type="number" /><span className="helper-text">{member.rewardReason ?? "Sin motivo registrado."}</span></label>)}
                      <p className="text-xs leading-5 text-slate-500">Puedes retirar o volver a otorgar monedas. El libro mayor conserva cada ajuste.</p>
                      <button className="btn btn-secondary" type="submit"><Coins className="h-4 w-4" aria-hidden />Conciliar reconocimiento</button>
                    </form>
                  </details>
                ) : null}
              </>
            ) : (
              <>
                <div className="mt-4 divide-y divide-line border-y border-line text-xs">
                  {[
                    [Boolean(charterFiles.length), "Project Charter cargado"],
                    [allActivitiesResolved, "Todas las actividades resueltas"],
                    [hasCompletedResult, "Existe resultado ejecutado"],
                    [completedActivitiesHaveEvidence, "Resultados con evidencia"],
                    [Boolean(project.teamMembers.length), "Equipo responsable definido"]
                  ].map(([complete, label]) => <div className="flex items-center gap-2 py-2.5" key={String(label)}><span className={`flex h-5 w-5 items-center justify-center rounded-full ${complete ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"}`}>{complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span><span className={complete ? "font-bold text-slate-800" : "text-slate-500"}>{String(label)}</span></div>)}
                </div>
                {canManage ? (
                  <form action={closeKaizenProjectAction} className="mt-4 grid gap-3">
                    <input name="projectId" type="hidden" value={project.id} />
                    <label><span className="label">Resultado final o motivo *</span><textarea className="field min-h-24" name="closureNote" placeholder="Resultado alcanzado, sostenimiento o causa de cancelacion" required /></label>
                    {project.teamMembers.length ? <fieldset><legend className="label">ProbocaCoins por integrante</legend><div className="grid gap-2">{project.teamMembers.map((member) => <label className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-2" key={member.id}><span className="min-w-0"><span className="block truncate text-xs font-extrabold text-ink">{member.user.name}</span><span className="block truncate text-[10px] text-slate-500">{member.role}</span></span><input aria-label={`ProbocaCoins para ${member.user.name}`} className="field text-right" defaultValue={teamCoins.get(member.userId) ?? 0} min={0} name={`coins-${member.id}`} step={1} type="number" /></label>)}</div></fieldset> : null}
                    <button className="btn btn-success" disabled={!readyToClose} name="outcome" type="submit" value="COMPLETADO"><CheckCircle2 className="h-4 w-4" aria-hidden />Completar Kaizen</button>
                    <button className="btn btn-danger" name="outcome" type="submit" value="CANCELADO"><XCircle className="h-4 w-4" aria-hidden />Cancelar con justificacion</button>
                  </form>
                ) : <p className="mt-4 text-xs leading-5 text-slate-500">Mejora Continua confirmara el cierre cuando el expediente este completo.</p>}
              </>
            )}
          </article>

          <article className="surface rounded-lg p-5">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800"><FolderOpen className="h-5 w-5" aria-hidden /></span><div><h2 className="text-base font-extrabold text-ink">Carpeta del Kaizen</h2><p className="text-xs text-slate-500">{project.folio}</p></div></div>
            <div className="mt-4 space-y-2">{charterFiles.length ? charterFiles.map((file) => <a className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3 text-sm font-bold text-slate-700 hover:border-slate-400" href={file.path} key={file.id} rel="noreferrer" target="_blank"><FileText className="h-4 w-4 shrink-0 text-amber-700" aria-hidden /><span className="min-w-0 flex-1 truncate">{file.filename}</span></a>) : <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-xs leading-5 text-amber-900">En espera del Project Charter.</p>}</div>
            {canManage ? <form action={uploadKaizenCharterAction} className="mt-4 grid gap-2 border-t border-line pt-4"><input name="projectId" type="hidden" value={project.id} /><label><span className="label">Project Charter</span><input className="field" name="charter" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" required /></label><button className="btn btn-secondary" type="submit"><Upload className="h-4 w-4" aria-hidden />Subir documento</button></form> : null}
          </article>

          {canManage ? <details className="details-panel"><summary><span className="flex items-center gap-2"><Target className="h-4 w-4 text-amber-700" aria-hidden />Editar proyecto</span></summary><form action={updateKaizenProjectAction} className="grid gap-3 p-4"><input name="projectId" type="hidden" value={project.id} /><label><span className="label">Nombre</span><input className="field" defaultValue={project.title} name="title" required /></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Planta</span><input className="field" defaultValue={project.plant ?? ""} name="plant" /></label><label><span className="label">Área</span><input className="field" defaultValue={project.area} name="area" required /></label></div><label><span className="label">Objetivo</span><textarea className="field min-h-20" defaultValue={project.objective} name="objective" required /></label><label><span className="label">Alcance</span><textarea className="field min-h-20" defaultValue={project.scope ?? ""} name="scope" /></label><label><span className="label">Líder</span><select className="field" defaultValue={project.leaderId} name="leaderId">{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Inicio</span><input className="field" defaultValue={project.startDate.toISOString().slice(0, 10)} name="startDate" type="date" required /></label><label><span className="label">Cierre</span><input className="field" defaultValue={project.endDate.toISOString().slice(0, 10)} name="endDate" type="date" required /></label></div><label><span className="label">Estado</span><select className="field" defaultValue={project.status} name="status">{Object.entries(kaizenStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="grid grid-cols-3 gap-2"><label><span className="label">Actual</span><input className="field" defaultValue={project.baselineValue ?? ""} name="baselineValue" step="any" type="number" /></label><label><span className="label">Meta</span><input className="field" defaultValue={project.targetValue ?? ""} name="targetValue" step="any" type="number" /></label><label><span className="label">Real</span><input className="field" defaultValue={project.currentValue ?? ""} name="currentValue" step="any" type="number" /></label></div><label><span className="label">Unidad</span><input className="field" defaultValue={project.unit ?? ""} name="unit" /></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Ahorro estimado</span><input className="field" defaultValue={project.estimatedSavings ?? ""} name="estimatedSavings" type="number" /></label><label><span className="label">Ahorro real</span><input className="field" defaultValue={project.realSavings ?? ""} name="realSavings" type="number" /></label></div><button className="btn btn-primary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar proyecto</button></form></details> : null}

          {canManage ? <details className="details-panel"><summary><span className="flex items-center gap-2"><Plus className="h-4 w-4 text-amber-700" aria-hidden />Agregar actividad</span></summary><form action={addKaizenActivityAction} className="grid gap-3 p-4"><input name="projectId" type="hidden" value={project.id} /><label><span className="label">Problemática</span><textarea className="field min-h-20" name="problem" /></label><label><span className="label">Acción *</span><textarea className="field min-h-20" name="action" required /></label><label><span className="label">Responsable</span><select className="field" defaultValue="" name="ownerId"><option value="">Sin asignar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Inicio</span><input className="field" name="startDate" type="date" /></label><label><span className="label">Compromiso</span><input className="field" name="dueDate" type="date" /></label></div><button className="btn btn-primary" type="submit"><Plus className="h-4 w-4" aria-hidden />Agregar</button></form></details> : null}

          {canManage && activeActivities.length > 1 ? <details className="details-panel"><summary><span className="flex items-center gap-2"><GitMerge className="h-4 w-4 text-violet-700" aria-hidden />Combinar actividades</span></summary><form action={mergeKaizenActivitiesAction} className="grid gap-3 p-4"><label><span className="label">Actividad duplicada</span><select className="field" name="sourceId" required defaultValue=""><option value="">Seleccionar</option>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.number} · {activity.action}</option>)}</select></label><label><span className="label">Se integrará en</span><select className="field" name="targetId" required defaultValue=""><option value="">Seleccionar</option>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.number} · {activity.action}</option>)}</select></label><label><span className="label">Justificación *</span><textarea className="field min-h-20" name="reason" required /></label><button className="btn btn-secondary" type="submit"><GitMerge className="h-4 w-4" aria-hidden />Combinar</button></form></details> : null}
        </aside>
      </section>
    </>
  );
}
