import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  Database,
  FolderKanban,
  Lightbulb,
  Link2,
  Paperclip,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hardDeleteByFolioAction, purgeOperationalDataAction } from "./actions";

type DataControlPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function countParam(query: Record<string, string | string[] | undefined>, key: string) {
  const value = Number(first(query[key]) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("es-MX").format(value);
}

const statusLabels: Record<string, string> = {
  REGISTRADA: "Registrada",
  EN_REVISION_SUPERVISOR: "Revision de supervisor",
  RECHAZADA_SUPERVISOR: "Rechazada",
  SOLICITUD_INFORMACION: "Solicita informacion",
  APROBADA_SUPERVISOR: "Aprobada por supervisor",
  EN_VALIDACION_CALIDAD: "Validacion de Calidad",
  EN_VALIDACION_SEGURIDAD: "Validacion de Seguridad",
  EN_VALIDACION_MANTENIMIENTO: "Validacion de Mantenimiento",
  RECHAZADA_VALIDACION: "Rechazada en validacion",
  APROBADA_PARA_IMPLEMENTAR: "Lista para implementar",
  CLASIFICACION_MEJORA_CONTINUA: "Clasificacion MC",
  EN_IMPLEMENTACION: "En implementacion",
  IMPLEMENTADA: "Implementada",
  EN_VALIDACION_FINAL: "Validacion final",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
  VENCIDA: "Vencida",
  PENDIENTE_CHARTER: "Pendiente de charter",
  PLANIFICACION: "Planificacion",
  EN_CURSO: "En curso",
  EN_PAUSA: "En pausa",
  COMPLETADO: "Completado",
  ABIERTO: "Abierto"
};

export default async function DataControlPage({ searchParams }: DataControlPageProps) {
  await requireUser(["ADMIN"]);
  const query = await searchParams;

  const [
    ideaCount,
    ideaAttachmentCount,
    ideaNotificationCount,
    kaizenCount,
    kaizenActivityCount,
    kaizenAttachmentCount,
    kaizenFromIdeaCount,
    genbaCount,
    genbaActivityCount,
    genbaAttachmentCount,
    genbaPromotedCount,
    recentIdeas,
    recentKaizens,
    recentGenbas
  ] = await Promise.all([
    prisma.idea.count(),
    prisma.attachment.count(),
    prisma.notificationOutbox.count({ where: { ideaId: { not: null } } }),
    prisma.kaizenProject.count(),
    prisma.kaizenActivity.count(),
    prisma.kaizenAttachment.count(),
    prisma.kaizenProject.count({ where: { sourceIdeaId: { not: null } } }),
    prisma.genbaWalk.count(),
    prisma.genbaActivity.count(),
    prisma.genbaAttachment.count(),
    prisma.kaizenActivity.count({ where: { sourceGenbaActivityId: { not: null } } }),
    prisma.idea.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { folio: true, problem: true, status: true } }),
    prisma.kaizenProject.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { folio: true, title: true, status: true } }),
    prisma.genbaWalk.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { folio: true, areaName: true, status: true } })
  ]);

  const error = first(query.error);
  const success = first(query.success);
  const errorMessage = error === "campos"
    ? "Selecciona un modulo y escribe un folio valido."
    : error === "confirmacion_folio"
      ? `La confirmacion no coincide. Escribe exactamente ELIMINAR ${first(query.folio) ?? "FOLIO"}.`
      : error === "no_existe"
        ? `No encontramos ${first(query.folio) ?? "ese folio"}. No se elimino ningun dato.`
        : error === "seleccion"
          ? "Selecciona al menos un modulo para reiniciar."
          : error === "confirmacion_reinicio"
            ? "La frase de seguridad no coincide. No se elimino ningun dato."
            : error === "operacion" || error === "operacion_reinicio"
              ? "La base de datos rechazo la operacion. No la repetiremos automaticamente; revisa el registro del servidor."
              : null;

  const deletedRecords = countParam(query, "ideas") + countParam(query, "kaizen") + countParam(query, "genba");
  const deletedActivities = countParam(query, "activities");
  const resolvedFiles = countParam(query, "files");
  const fileWarnings = countParam(query, "fileWarnings");
  const detached = countParam(query, "detached");
  const successMessage = success === "eliminado"
    ? `${first(query.folio) ?? "El registro"} fue eliminado definitivamente.`
    : success === "reiniciado"
      ? `Reinicio completado: ${formatCount(deletedRecords)} registros principales y ${formatCount(deletedActivities)} actividades eliminadas.`
      : null;

  const modules = [
    {
      key: "IDEAS" as const,
      title: "Ideas de mejora",
      count: ideaCount,
      secondary: `${formatCount(ideaAttachmentCount)} evidencias y ${formatCount(ideaNotificationCount)} avisos vinculados`,
      linked: `${formatCount(kaizenFromIdeaCount)} dieron origen a un Kaizen`,
      icon: Lightbulb,
      tone: "border-l-red-600",
      recent: recentIdeas.map((idea) => ({ folio: idea.folio, name: idea.problem, status: statusLabels[idea.status] ?? idea.status })),
      note: "Si una idea genero un Kaizen, el proyecto se conserva y queda desacoplado. Para borrar ambos, selecciona Ideas y Kaizen en el reinicio."
    },
    {
      key: "KAIZEN" as const,
      title: "Proyectos Kaizen",
      count: kaizenCount,
      secondary: `${formatCount(kaizenActivityCount)} actividades y ${formatCount(kaizenAttachmentCount)} archivos`,
      linked: `${formatCount(kaizenFromIdeaCount)} proceden de ideas`,
      icon: FolderKanban,
      tone: "border-l-slate-950",
      recent: recentKaizens.map((project) => ({ folio: project.folio, name: project.title, status: statusLabels[project.status] ?? project.status })),
      note: "La idea o actividad GENBA de origen se conserva. Se eliminan el proyecto, sus actividades, archivos, avances, avisos y movimientos vinculados."
    },
    {
      key: "GENBA" as const,
      title: "Recorridos GENBA",
      count: genbaCount,
      secondary: `${formatCount(genbaActivityCount)} actividades y ${formatCount(genbaAttachmentCount)} evidencias`,
      linked: `${formatCount(genbaPromotedCount)} actividades se promovieron a Kaizen`,
      icon: ClipboardCheck,
      tone: "border-l-blue-600",
      recent: recentGenbas.map((walk) => ({ folio: walk.folio, name: walk.areaName, status: statusLabels[walk.status] ?? walk.status })),
      note: "Las actividades ya enviadas a Kaizen se conservan dentro del proyecto y quedan desacopladas del recorrido eliminado."
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administracion - Control irreversible"
        title="Control de datos"
        description="Elimina registros de prueba y reinicia modulos operativos sin afectar usuarios, estructura organizacional, reglas ni entrenamientos."
        actions={<Link className="btn btn-secondary" href="/configuracion"><ArrowLeft className="h-4 w-4" aria-hidden />Volver a configuracion</Link>}
      />

      {errorMessage ? (
        <div className="alert alert-danger mb-5" role="alert"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div>
      ) : null}
      {successMessage ? (
        <div className="alert alert-success mb-5" role="status">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-extrabold">{successMessage}</p>
            <p className="mt-1 text-sm leading-5">
              {resolvedFiles ? `${formatCount(resolvedFiles)} archivos administrados fueron eliminados o ya no existian. ` : ""}
              {detached ? `${formatCount(detached)} vinculos de origen se desacoplaron para conservar el modulo no seleccionado. ` : ""}
              {fileWarnings ? `${formatCount(fileWarnings)} archivos externos o Blob no pudieron confirmarse; revisa la configuracion de almacenamiento.` : ""}
            </p>
          </div>
        </div>
      ) : null}

      <section aria-label="Inventario operativo" className="mb-10">
        <SectionHeading count={ideaCount + kaizenCount + genbaCount} description="Conteos consultados directamente en la base de datos al abrir esta pantalla." title="Inventario operativo" />
        <div className="grid gap-4 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <article className={`surface overflow-hidden rounded-lg border-l-4 p-5 ${module.tone}`} key={module.key}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-slate-500">{module.title}</p>
                    <p className="mt-2 text-4xl font-extrabold text-ink">{formatCount(module.count)}</p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800"><Icon className="h-5 w-5" aria-hidden /></span>
                </div>
                <p className="mt-4 text-sm font-bold text-slate-700">{module.secondary}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Link2 className="h-3.5 w-3.5" aria-hidden />{module.linked}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-label="Eliminacion individual" className="mb-10">
        <SectionHeading description="Busca el folio correcto y confirma por escrito. Esta operacion no genera AuditLog y no tiene deshacer." title="Eliminar un registro" tone="red" />
        <div className="grid gap-4 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            const example = module.recent[0]?.folio ?? (module.key === "IDEAS" ? "IM-000001" : module.key === "KAIZEN" ? "KZN-001" : "GENBA-001");
            return (
              <article className={`surface overflow-hidden rounded-lg border-l-4 ${module.tone}`} key={module.key}>
                <div className="border-b border-line p-4">
                  <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-slate-700" aria-hidden /><h2 className="text-base font-extrabold text-ink">{module.title}</h2></div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{module.note}</p>
                </div>
                <form action={hardDeleteByFolioAction} className="grid gap-4 p-4">
                  <input name="module" type="hidden" value={module.key} />
                  <label>
                    <span className="label">Folio exacto</span>
                    <input autoComplete="off" className="field uppercase" list={`folios-${module.key}`} name="folio" placeholder={example} required />
                    <datalist id={`folios-${module.key}`}>{module.recent.map((item) => <option key={item.folio} value={item.folio}>{item.name}</option>)}</datalist>
                  </label>
                  <label>
                    <span className="label">Confirmacion escrita</span>
                    <input autoComplete="off" className="field" name="confirmation" placeholder={`ELIMINAR ${example}`} required />
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">Escribe ELIMINAR seguido del mismo folio.</span>
                  </label>
                  <button className="btn btn-danger w-full" type="submit"><Trash2 className="h-4 w-4" aria-hidden />Eliminar definitivamente</button>
                </form>
                {module.recent.length ? (
                  <details className="border-t border-line px-4 py-3">
                    <summary className="cursor-pointer text-xs font-extrabold text-slate-600">Ver folios recientes</summary>
                    <ul className="mt-3 divide-y divide-line">{module.recent.map((item) => <li className="flex items-start justify-between gap-3 py-2 text-xs" key={item.folio}><span className="min-w-0"><span className="block font-extrabold text-ink">{item.folio}</span><span className="block truncate text-slate-500">{item.name}</span></span><span className="shrink-0 text-right font-bold text-slate-500">{item.status}</span></li>)}</ul>
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section aria-label="Reinicio selectivo" className="overflow-hidden rounded-lg border border-red-300 bg-red-50">
        <div className="border-b border-red-200 bg-red-700 p-5 text-white sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15"><ShieldAlert className="h-6 w-6" aria-hidden /></span>
            <div><p className="text-xs font-extrabold uppercase text-red-100">Zona de peligro</p><h2 className="mt-1 text-2xl font-extrabold">Reinicio selectivo</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-red-50">Elimina todos los registros de los modulos marcados. Para reiniciar todo el trabajo operativo, marca Ideas, Kaizen y GENBA.</p></div>
          </div>
        </div>
        <form action={purgeOperationalDataAction} className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <fieldset>
              <legend className="text-sm font-extrabold text-red-950">Modulos que se eliminaran</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {modules.map((module) => (
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-red-200 bg-white p-3 text-sm font-extrabold text-slate-800" key={module.key}>
                    <input className="h-4 w-4 accent-red-700" name="modules" type="checkbox" value={module.key} />
                    <span className="flex-1">{module.title}</span>
                    <span className="text-xs text-slate-500">{formatCount(module.count)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-red-900"><Paperclip className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><p>Tambien se eliminan evidencias locales o de Vercel Blob cuando las credenciales lo permiten. Cualquier archivo no administrado se reporta como advertencia.</p></div>
          </div>

          <div className="rounded-lg border border-red-200 bg-white p-4">
            <div className="flex items-start gap-3"><Database className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden /><div><p className="font-extrabold text-ink">Se conserva sin cambios</p><p className="mt-1 text-xs leading-5 text-slate-600">Usuarios, plantas, estructura, responsables, reglas de ProbocaCoins, participantes, catalogos de entrenamiento, sesiones y movimientos TRAINING o MANUAL.</p></div></div>
            <label className="mt-5 block">
              <span className="label">Frase de seguridad</span>
              <input autoComplete="off" className="field border-red-300" name="confirmation" placeholder="ELIMINAR DATOS PROPEX" required />
              <span className="mt-1 block text-[11px] font-bold text-red-800">Escribe exactamente: ELIMINAR DATOS PROPEX</span>
            </label>
            <button className="btn btn-danger mt-4 w-full" type="submit"><RotateCcw className="h-4 w-4" aria-hidden />Reiniciar modulos seleccionados</button>
          </div>
        </form>
      </section>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-slate-300 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
        <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p><strong className="text-slate-800">Sin deshacer:</strong> estas operaciones eliminan las filas reales y sus dependencias; no crean una entrada de auditoria. Antes de usar el reinicio en produccion, descarga los concentrados que necesites conservar.</p>
      </div>
    </>
  );
}
