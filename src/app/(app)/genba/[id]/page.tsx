import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Footprints,
  GitMerge,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  Send,
  UsersRound,
  XCircle
} from "lucide-react";
import {
  addGenbaActivityAction,
  addGenbaUpdateAction,
  closeGenbaActivityAction,
  mergeGenbaActivitiesAction,
  promoteGenbaActivityToKaizenAction,
  updateGenbaActivityAction,
  updateGenbaWalkAction
} from "@/app/actions";
import { GenbaStatusPill } from "@/components/module-status";
import { PageHeader } from "@/components/page-header";
import { ProgressMeter } from "@/components/progress-meter";
import { SectionHeading } from "@/components/section-heading";
import { WorkItemDisclosure } from "@/components/work-item-disclosure";
import {
  attendancePercent,
  genbaDepartments,
  genbaStatusLabels,
  isWorkItemOverdue,
  parseStringArray,
  workProgress
} from "@/lib/domain";
import { requireGenbaAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

type GenbaDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function GenbaDetailPage({ params, searchParams }: GenbaDetailProps) {
  const { user, canManage } = await requireGenbaAccess();
  const { id } = await params;
  const query = await searchParams;
  const [walk, users, kaizenProjects] = await Promise.all([
    prisma.genbaWalk.findUnique({
      where: { id },
      include: {
        coordinator: true,
        activities: {
          include: {
            owner: true,
            mergedInto: true,
            attachments: true,
            promotedKaizenActivity: { include: { project: true } }
          },
          orderBy: { number: "asc" }
        },
        updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" }, take: 60 }
      }
    }),
    prisma.user.findMany({ where: { active: true, role: { not: "COLABORADOR" } }, orderBy: { name: "asc" } }),
    prisma.kaizenProject.findMany({ where: { status: { notIn: ["COMPLETADO", "CANCELADO"] } }, orderBy: { number: "desc" } })
  ]);

  if (!walk) notFound();

  const progress = workProgress(walk.activities);
  const expected = parseStringArray(walk.expectedDepartments);
  const attended = new Set(parseStringArray(walk.attendedDepartments));
  const attendance = attendancePercent(walk.expectedDepartments, walk.attendedDepartments);
  const activeActivities = walk.activities.filter((activity) => !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
  const overdue = walk.activities.filter(isWorkItemOverdue).length;
  const defaultActivityDueDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const canAddActivity = canManage && walk.status === "ABIERTO";
  const errorMessage = query.error === "evidencia"
    ? "Para completar una actividad debes adjuntar evidencia."
    : query.error === "justificacion"
      ? "Escribe por qué la actividad no se realizará."
      : query.error === "lider"
        ? "Selecciona el líder del nuevo proyecto Kaizen."
        : query.error === "actividad"
          ? "Escribe la problemática de la nueva actividad."
          : query.error === "cerrado"
            ? "No se pueden agregar actividades a un recorrido cerrado."
            : query.error
              ? "Revisa los campos obligatorios."
              : null;

  return (
    <>
      <PageHeader
        eyebrow={`Recorridos GENBA · GENBA #${String(walk.number).padStart(3, "0")}`}
        title={walk.areaName}
        description={walk.visitDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={<Link className="btn btn-secondary" href="/genba"><ArrowLeft className="h-4 w-4" aria-hidden />Panel</Link>}
      />
      {errorMessage ? <div className="alert alert-danger mb-5"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}

      <section className="surface mb-5 rounded-lg p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2"><GenbaStatusPill status={walk.status} /><span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-extrabold text-slate-700">Coordinador: {walk.coordinator.name}</span></div>
            <p className="mt-4 text-lg font-extrabold text-ink">{walk.notes ?? "Recorrido de observación y seguimiento operativo."}</p>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-600"><UsersRound className="h-4 w-4 text-red-700" aria-hidden />{attended.size} de {expected.length} departamentos asistieron · {attendance}%</div>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <ProgressMeter label={`${progress.closed} de ${progress.total} actividades cerradas`} percent={progress.percent} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div><p className="text-2xl font-extrabold text-ink">{progress.open}</p><p className="text-[10px] font-bold uppercase text-slate-500">Abiertas</p></div>
              <div><p className={`text-2xl font-extrabold ${overdue ? "text-rose-700" : "text-ink"}`}>{overdue}</p><p className="text-[10px] font-bold uppercase text-slate-500">Vencidas</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <article className="surface rounded-lg p-5">
            <SectionHeading description="Comparación entre comité esperado y asistencia real." title="Asistencia" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {expected.map((department) => <div className={`flex items-center justify-between rounded-lg border p-3 text-sm font-bold ${attended.has(department) ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-800"}`} key={department}><span>{department}</span><span className="text-[10px] font-extrabold uppercase">{attended.has(department) ? "Asistió" : "Ausente"}</span></div>)}
            </div>
          </article>

          <section>
            <SectionHeading count={walk.activities.filter((activity) => activity.status !== "COMBINADA").length} description="Las cinco principales y cualquier actividad adicional del recorrido." title="Plan de acción GENBA" tone="red" />
            {canAddActivity ? (
              <details className="details-panel mb-4" open={query.error === "actividad"}>
                <summary><span className="flex items-center gap-2"><Plus className="h-4 w-4 text-red-700" aria-hidden />Agregar otra actividad</span></summary>
                <form action={addGenbaActivityAction} className="grid gap-3 p-4 sm:grid-cols-2">
                  <input name="walkId" type="hidden" value={walk.id} />
                  <label className="sm:col-span-2"><span className="label">Problemática *</span><textarea className="field min-h-20" name="problem" placeholder="Condición o hallazgo adicional" required /></label>
                  <label className="sm:col-span-2"><span className="label">Acción propuesta</span><textarea className="field min-h-20" name="action" placeholder="Qué debe hacerse" /></label>
                  <label><span className="label">Responsable</span><select className="field" defaultValue="" name="ownerId"><option value="">Sin asignar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                  <label><span className="label">Compromiso</span><input className="field" defaultValue={defaultActivityDueDate} name="dueDate" type="date" /></label>
                  <button className="btn btn-primary sm:col-span-2" type="submit"><Plus className="h-4 w-4" aria-hidden />Agregar al plan de acción</button>
                </form>
              </details>
            ) : null}

            {!walk.activities.length ? <div className="surface rounded-lg border-dashed p-8 text-center text-sm text-slate-500">Todavía no hay actividades en este recorrido.</div> : null}
            <div className="overflow-hidden rounded-lg">
              {walk.activities.map((activity) => {
                const canClose = canManage || walk.coordinatorId === user.id || activity.ownerId === user.id;
                const terminal = ["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status);
                return (
                  <WorkItemDisclosure
                    description={`Acción: ${activity.action ?? "Por definir"}`}
                    dueDate={activity.dueDate}
                    id={`actividad-${activity.id}`}
                    key={activity.id}
                    number={activity.number}
                    overdue={isWorkItemOverdue(activity)}
                    owner={activity.owner?.name}
                    status={activity.status}
                    title={activity.problem}
                    tone="red"
                  >
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <p className="border-l-4 border-brand-500 pl-3"><span className="block text-[10px] font-extrabold uppercase text-slate-400">Acción acordada</span><span className="mt-1 block leading-5 text-slate-700">{activity.action ?? "Por definir"}</span></p>
                      <p className="flex items-center gap-2 border-l-4 border-slate-300 pl-3"><Paperclip className="h-4 w-4 text-slate-400" aria-hidden /><span><span className="block text-[10px] font-extrabold uppercase text-slate-400">Evidencias</span><span className="mt-1 block font-extrabold text-slate-700">{activity.attachments.length}</span></span></p>
                    </div>
                    {activity.mergedInto ? <div className="alert alert-info mt-3"><GitMerge className="h-4 w-4 shrink-0" aria-hidden />Combinada con actividad #{activity.mergedInto.number}. {activity.mergeReason}</div> : null}
                    {activity.promotedKaizenActivity ? <Link className="alert alert-warning mt-3" href={`/kaizen/${activity.promotedKaizenActivity.projectId}`}><Send className="h-4 w-4 shrink-0" aria-hidden />Enviada a {activity.promotedKaizenActivity.project.folio}: {activity.promotedKaizenActivity.project.title}</Link> : null}
                    {activity.completionNote || activity.cancellationReason ? <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-5 text-slate-700">{activity.completionNote ?? activity.cancellationReason}</p> : null}
                    {activity.attachments.length ? <div className="mt-3 flex flex-wrap gap-2">{activity.attachments.map((file) => <a className="btn btn-secondary" href={file.path} key={file.id} rel="noreferrer" target="_blank"><Paperclip className="h-4 w-4" aria-hidden />{file.filename}</a>)}</div> : null}

                    {!terminal && (canManage || canClose) ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {canManage ? (
                          <details className="details-panel">
                            <summary>Editar actividad</summary>
                            <form action={updateGenbaActivityAction} className="grid gap-3 p-4">
                              <input name="activityId" type="hidden" value={activity.id} />
                              <label><span className="label">Problemática</span><textarea className="field min-h-20" defaultValue={activity.problem} name="problem" required /></label>
                              <label><span className="label">Acción</span><textarea className="field min-h-20" defaultValue={activity.action ?? ""} name="action" /></label>
                              <label><span className="label">Responsable</span><select className="field" defaultValue={activity.ownerId ?? ""} name="ownerId"><option value="">Sin asignar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                              <label><span className="label">Compromiso</span><input className="field" defaultValue={activity.dueDate?.toISOString().slice(0, 10) ?? ""} name="dueDate" type="date" /></label>
                              <label><span className="label">Estado</span><select className="field" defaultValue={activity.status} name="status"><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="BLOQUEADA">Bloqueada</option></select></label>
                              <button className="btn btn-secondary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar actividad</button>
                            </form>
                          </details>
                        ) : null}
                        {canClose ? (
                          <details className="details-panel">
                            <summary>Cerrar actividad</summary>
                            <form action={closeGenbaActivityAction} className="grid gap-3 p-4">
                              <input name="activityId" type="hidden" value={activity.id} />
                              <p className="text-xs leading-5 text-slate-600">Para completar, adjunta evidencia. Si no se hará, escribe la justificación.</p>
                              <label><span className="label">Evidencia</span><input className="field" name="evidence" type="file" accept="image/*,.pdf,.doc,.docx" /></label>
                              <label><span className="label">Resultado o justificación</span><textarea className="field min-h-20" name="note" /></label>
                              <div className="grid gap-2 sm:grid-cols-2"><button className="btn btn-success" name="outcome" type="submit" value="COMPLETADA"><CheckCircle2 className="h-4 w-4" aria-hidden />Completar</button><button className="btn btn-danger" name="outcome" type="submit" value="CANCELADA"><XCircle className="h-4 w-4" aria-hidden />Cerrar sin ejecutar</button></div>
                            </form>
                          </details>
                        ) : null}
                      </div>
                    ) : null}

                    {canManage && !activity.promotedKaizenActivity && activity.status !== "COMBINADA" ? (
                      <details className="details-panel mt-3">
                        <summary><span className="flex items-center gap-2 text-amber-800"><Send className="h-4 w-4" aria-hidden />Enviar actividad a Kaizen</span></summary>
                        <form action={promoteGenbaActivityToKaizenAction} className="grid gap-3 p-4">
                          <input name="activityId" type="hidden" value={activity.id} />
                          <label><span className="label">Proyecto existente</span><select className="field" defaultValue="" name="targetProjectId"><option value="">Crear un nuevo Kaizen</option>{kaizenProjects.map((project) => <option key={project.id} value={project.id}>{project.folio} · {project.title}</option>)}</select></label>
                          <label><span className="label">Nombre si se crea uno nuevo</span><input className="field" defaultValue={activity.problem} name="newProjectTitle" /></label>
                          <label><span className="label">Líder del nuevo Kaizen</span><select className="field" defaultValue={activity.ownerId ?? ""} name="leaderId"><option value="">Seleccionar</option>{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                          <button className="btn bg-amber-500 text-slate-950 hover:bg-amber-400" type="submit"><Send className="h-4 w-4" aria-hidden />Enviar a Kaizen</button>
                        </form>
                      </details>
                    ) : null}
                  </WorkItemDisclosure>
                );
              })}
            </div>
          </section>

          <article className="surface rounded-lg p-5">
            <SectionHeading count={walk.updates.length} description="Avances y acuerdos del recorrido." title="Bitácora" />
            {canManage ? <form action={addGenbaUpdateAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><input name="walkId" type="hidden" value={walk.id} /><label><span className="label">Nuevo seguimiento</span><textarea className="field min-h-20" name="comment" required /></label><button className="btn btn-secondary" type="submit"><MessageSquare className="h-4 w-4" aria-hidden />Agregar</button></form> : null}
            <div className="mt-5 space-y-3 border-t border-line pt-4">{walk.updates.map((update) => <div className="flex gap-3" key={update.id}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold">{(update.user?.name ?? "S").charAt(0)}</span><div><p className="text-xs font-extrabold text-ink">{update.user?.name ?? "Sistema"} <span className="font-normal text-slate-400">{update.createdAt.toLocaleString("es-MX")}</span></p><p className="mt-1 text-sm leading-5 text-slate-700">{update.comment}</p></div></div>)}</div>
          </article>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <article className="surface rounded-lg p-5">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700"><Footprints className="h-5 w-5" aria-hidden /></span><div><h2 className="text-base font-extrabold text-ink">Resumen del recorrido</h2><p className="text-xs text-slate-500">{walk.folio}</p></div></div>
            <dl className="mt-4 divide-y divide-line text-xs">{[["Fecha", walk.visitDate.toLocaleDateString("es-MX")], ["Área", walk.areaName], ["Coordinador", walk.coordinator.name], ["Asistencia", `${attendance}%`], ["Actividades", String(progress.total)], ["Avance", `${progress.percent}%`]].map(([label, value]) => <div className="flex justify-between gap-3 py-2.5" key={label}><dt className="font-bold text-slate-500">{label}</dt><dd className="text-right font-extrabold text-slate-800">{value}</dd></div>)}</dl>
          </article>

          {canManage ? (
            <details className="details-panel">
              <summary>Editar recorrido</summary>
              <form action={updateGenbaWalkAction} className="grid gap-3 p-4">
                <input name="walkId" type="hidden" value={walk.id} />
                <label><span className="label">Área</span><input className="field" defaultValue={walk.areaName} name="areaName" required /></label>
                <label><span className="label">Fecha</span><input className="field" defaultValue={walk.visitDate.toISOString().slice(0, 10)} name="visitDate" type="date" required /></label>
                <label><span className="label">Coordinador</span><select className="field" defaultValue={walk.coordinatorId} name="coordinatorId">{users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                <label><span className="label">Notas</span><textarea className="field min-h-20" defaultValue={walk.notes ?? ""} name="notes" /></label>
                <label><span className="label">Estado</span><select className="field" defaultValue={walk.status} name="status">{Object.entries(genbaStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <fieldset><legend className="label">Asistencia</legend><div className="space-y-2">{genbaDepartments.map((department) => <div className="grid grid-cols-[1fr_70px_70px] items-center gap-2 rounded-lg border border-line p-2 text-xs" key={department}><span className="font-bold">{department}</span><label className="text-center"><span className="block text-[9px] uppercase text-slate-400">Esperado</span><input defaultChecked={expected.includes(department)} name="expectedDepartments" type="checkbox" value={department} /></label><label className="text-center"><span className="block text-[9px] uppercase text-slate-400">Asistió</span><input defaultChecked={attended.has(department)} name="attendedDepartments" type="checkbox" value={department} /></label></div>)}</div></fieldset>
                <button className="btn btn-primary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar recorrido</button>
              </form>
            </details>
          ) : null}

          {canManage && activeActivities.length > 1 ? (
            <details className="details-panel">
              <summary><span className="flex items-center gap-2"><GitMerge className="h-4 w-4 text-violet-700" aria-hidden />Combinar actividades</span></summary>
              <form action={mergeGenbaActivitiesAction} className="grid gap-3 p-4">
                <label><span className="label">Actividad duplicada</span><select className="field" name="sourceId" required defaultValue=""><option value="">Seleccionar</option>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.number} · {activity.problem}</option>)}</select></label>
                <label><span className="label">Se integrará en</span><select className="field" name="targetId" required defaultValue=""><option value="">Seleccionar</option>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>#{activity.number} · {activity.problem}</option>)}</select></label>
                <label><span className="label">Justificación *</span><textarea className="field min-h-20" name="reason" required /></label>
                <button className="btn btn-secondary" type="submit"><GitMerge className="h-4 w-4" aria-hidden />Combinar</button>
              </form>
            </details>
          ) : null}
        </aside>
      </section>
    </>
  );
}
