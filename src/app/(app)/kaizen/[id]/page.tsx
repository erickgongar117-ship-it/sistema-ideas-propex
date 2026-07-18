import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, FileText, FolderOpen, GitMerge, MessageSquare, Paperclip, Plus, Save, Target, Upload, XCircle } from "lucide-react";
import {
  addKaizenActivityAction,
  addKaizenUpdateAction,
  closeKaizenActivityAction,
  mergeKaizenActivitiesAction,
  updateKaizenActivityAction,
  updateKaizenProjectAction,
  uploadKaizenCharterAction
} from "@/app/actions";
import { KaizenStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { SectionHeading } from "@/components/section-heading";
import { WorkItemDisclosure } from "@/components/work-item-disclosure";
import { isWorkItemOverdue, kaizenStatusLabels, workItemStatusLabels, workProgress } from "@/lib/domain";
import { requireKaizenAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type KaizenDetailProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function KaizenDetailPage({ params, searchParams }: KaizenDetailProps) {
  const { user, canManage } = await requireKaizenAccess();
  const { id } = await params;
  const query = await searchParams;
  const [project, users] = await Promise.all([
    prisma.kaizenProject.findUnique({
      where: { id },
      include: {
        leader: true,
        createdBy: true,
        sourceIdea: true,
        activities: { include: { owner: true, mergedInto: true, attachments: true }, orderBy: { number: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" }, take: 60 }
      }
    }),
    prisma.user.findMany({ where: { active: true, role: { not: "COLABORADOR" } }, orderBy: { name: "asc" } })
  ]);
  if (!project) notFound();
  const progress = workProgress(project.activities);
  const charterFiles = project.attachments.filter((attachment) => attachment.type === "CHARTER");
  const activeActivities = project.activities.filter((activity) => !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
  const overdue = project.activities.filter(isWorkItemOverdue).length;
  const errorMessage = query.error === "evidencia" ? "Para completar una actividad debes adjuntar evidencia." : query.error === "justificacion" ? "Escribe el motivo por el que la actividad no se realizará." : query.error === "charter" ? "Selecciona el archivo de Project Charter." : query.error ? "Revisa los campos obligatorios." : null;

  return (
    <>
      <PageHeader eyebrow={`Proyectos Kaizen · Kaizen #${String(project.number).padStart(3, "0")}`} title={project.title} description={`${project.area}${project.plant ? ` · ${project.plant}` : ""}`} actions={<><Link className="btn btn-secondary" href="/kaizen"><ArrowLeft className="h-4 w-4" aria-hidden />Panel</Link><Link className="btn btn-secondary" href="/kaizen/gantt"><CalendarDays className="h-4 w-4" aria-hidden />Gantt</Link></>} />
      {errorMessage ? <div className="alert alert-danger mb-5"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}

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
              <div className="border-l-4 border-slate-300 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Actual → Meta → Real</dt><dd className="mt-1 text-sm font-extrabold text-ink">{project.baselineValue ?? "–"} → {project.targetValue ?? "–"} → {project.currentValue ?? "–"} {project.unit ?? ""}</dd></div>
              <div className="border-l-4 border-emerald-500 pl-3"><dt className="text-[10px] font-extrabold uppercase text-slate-500">Ahorro estimado / real</dt><dd className="mt-1 text-sm font-extrabold text-ink">${(project.estimatedSavings ?? 0).toLocaleString("es-MX")} / ${(project.realSavings ?? 0).toLocaleString("es-MX")}</dd></div>
            </dl>
          </article>

          <section>
            <SectionHeading count={project.activities.filter((activity) => activity.status !== "COMBINADA").length} description="El avance del proyecto se calcula automáticamente con estas actividades." title="Plan de actividades" tone="dark" />
            {!project.activities.length ? <div className="surface rounded-lg border-dashed p-8 text-center text-sm text-slate-500">Todavía no hay actividades en este Kaizen.</div> : null}
            <div className="overflow-hidden rounded-lg">
              {project.activities.map((activity) => {
                const canClose = canManage || project.leaderId === user.id || activity.ownerId === user.id;
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
                        {canManage ? <details className="details-panel"><summary>Editar actividad</summary><form action={updateKaizenActivityAction} className="grid gap-3 p-4"><input name="activityId" type="hidden" value={activity.id} /><label><span className="label">Problemática</span><textarea className="field min-h-20" defaultValue={activity.problem ?? ""} name="problem" /></label><label><span className="label">Acción</span><textarea className="field min-h-20" defaultValue={activity.action} name="action" required /></label><label><span className="label">Responsable</span><select className="field" defaultValue={activity.ownerId ?? ""} name="ownerId"><option value="">Sin asignar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label><span className="label">Inicio</span><input className="field" defaultValue={activity.startDate?.toISOString().slice(0, 10) ?? ""} name="startDate" type="date" /></label><label><span className="label">Compromiso</span><input className="field" defaultValue={activity.dueDate?.toISOString().slice(0, 10) ?? ""} name="dueDate" type="date" /></label></div><label><span className="label">Estado</span><select className="field" defaultValue={activity.status} name="status"><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="BLOQUEADA">Bloqueada</option></select></label><button className="btn btn-secondary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar actividad</button></form></details> : null}
                        {canClose ? <details className="details-panel"><summary>Cerrar actividad</summary><form action={closeKaizenActivityAction} className="grid gap-3 p-4"><input name="activityId" type="hidden" value={activity.id} /><p className="text-xs leading-5 text-slate-600">Para completar, adjunta evidencia. Si no se hará, escribe la justificación.</p><label><span className="label">Evidencia</span><input className="field" name="evidence" type="file" accept="image/*,.pdf,.doc,.docx" /></label><label><span className="label">Resultado o justificación</span><textarea className="field min-h-20" name="note" placeholder="Qué se realizó o por qué no se realizará" /></label><div className="grid gap-2 sm:grid-cols-2"><button className="btn btn-success" name="outcome" type="submit" value="COMPLETADA"><CheckCircle2 className="h-4 w-4" aria-hidden />Completar</button><button className="btn btn-danger" name="outcome" type="submit" value="CANCELADA"><XCircle className="h-4 w-4" aria-hidden />Cerrar sin ejecutar</button></div></form></details> : null}
                      </div> : null}
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
