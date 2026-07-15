import { Building2, CircleCheck, KeyRound, Mail, Network, Plus, SlidersHorizontal, UserCog, UsersRound } from "lucide-react";
import { createPointRuleAction, createUserAction, updateAreaAction, updatePointRuleAction, updateUserAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/domain";
import { isManagerialEvaluationRule } from "@/lib/managerial-evaluation";
import { prisma } from "@/lib/prisma";

const configurableRoles = ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"] as const;

type ConfigPageProps = {
  searchParams: Promise<{ error?: string; success?: string; user?: string }>;
};

const roleTone = {
  ADMIN: "bg-slate-950 text-white",
  MEJORA_CONTINUA: "bg-slate-800 text-white",
  SUPERVISOR: "bg-emerald-50 text-emerald-800",
  CALIDAD: "bg-red-50 text-red-800",
  SEGURIDAD: "bg-slate-100 text-slate-700",
  MANTENIMIENTO: "bg-blue-50 text-blue-800"
};

export default async function ConfigPage({ searchParams }: ConfigPageProps) {
  await requireUser(["ADMIN"]);
  const query = await searchParams;
  const [areas, assignableUsers, users, pointRules] = await Promise.all([
    prisma.area.findMany({ include: { supervisor: true }, orderBy: { code: "asc" } }),
    prisma.user.findMany({ where: { role: { in: [...configurableRoles] }, active: true }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.user.findMany({ where: { role: { in: [...configurableRoles] } }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.pointRule.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  const errorMessage = query.error === "correo"
    ? "Ese correo ya pertenece a otro usuario."
    : query.error === "correo_invalido"
      ? "Escribe un correo valido, por ejemplo nombre@proboca.net."
    : query.error === "contrasena"
      ? "La contraseña debe tener al menos 8 caracteres."
      : query.error === "usuario"
        ? "El usuario que intentas modificar ya no existe."
      : query.error
        ? "Revisa la información capturada."
        : null;
  const successMessage = query.success === "usuario_actualizado"
    ? "Los datos y el correo se actualizaron correctamente. Los avisos pendientes ahora usan el correo nuevo."
    : query.success === "usuario_creado"
      ? "El usuario fue creado y ya puede usar su correo para iniciar sesion."
      : query.success === "area_actualizada"
        ? "El area y su responsable se actualizaron en la estructura, los QR y las rutas de seguimiento."
      : null;

  return (
    <>
      <PageHeader eyebrow="Administración · Directorio y reglas" title="Configuración" description="Controla accesos, correos, módulos disponibles, áreas y reglas de puntos." />

      {errorMessage ? <div className="alert alert-danger mb-5"><KeyRound className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{errorMessage}</span></div> : null}
      {successMessage ? <div className="alert alert-success mb-5"><CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span className="font-bold">{successMessage}</span></div> : null}

      <nav aria-label="Secciones de configuración" className="no-print mb-6 flex gap-2 overflow-x-auto border-b border-line pb-3">
        <a className="btn btn-secondary shrink-0" href="#usuarios"><UsersRound className="h-4 w-4" aria-hidden />Usuarios</a>
        <a className="btn btn-secondary shrink-0" href="#areas"><Building2 className="h-4 w-4" aria-hidden />Áreas</a>
        <a className="btn btn-secondary shrink-0" href="/configuracion/estructura"><Network className="h-4 w-4" aria-hidden />Estructura organizacional</a>
        <a className="btn btn-secondary shrink-0" href="#puntos"><SlidersHorizontal className="h-4 w-4" aria-hidden />Reglas de puntos</a>
      </nav>

      <div className="alert alert-info mb-7">
        <Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="font-extrabold">Directorio de notificaciones</p><p className="mt-0.5 leading-5">Puedes crear varias personas para un mismo departamento. Cualquier usuario activo recibira los avisos que correspondan a su rol.</p></div>
      </div>

      <section className="scroll-mt-6" id="usuarios">
        <SectionHeading count={users.length} description="Solo el administrador puede crear accesos, cambiar correos o desactivar cuentas." title="Usuarios y correos" />

        <details className="details-panel mb-4 border-dashed border-slate-400" open={Boolean(query.error && !query.user)}>
          <summary><span className="flex items-center gap-2 text-brand-700"><Plus className="h-4 w-4" aria-hidden />Agregar una persona</span></summary>
          <form action={createUserAction} className="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
            <label><span className="label">Nombre completo</span><input className="field" name="name" placeholder="Nombre y apellidos" required /></label>
            <label><span className="label">Correo de acceso y notificaciones</span><input autoComplete="off" className="field" name="email" placeholder="nombre@proboca.net" required type="email" /></label>
            <label><span className="label">Departamento / rol</span><select className="field" name="role" defaultValue="MEJORA_CONTINUA">{configurableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
            <label><span className="label">Contraseña temporal</span><input autoComplete="new-password" className="field" minLength={8} name="password" placeholder="Minimo 8 caracteres" required type="password" /></label>
            <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700"><input defaultChecked name="active" type="checkbox" />Acceso activo</label>
            <fieldset className="rounded-lg border border-line bg-panel p-3"><legend className="px-1 text-xs font-extrabold text-ink">Módulos adicionales</legend><div className="mt-2 flex flex-wrap gap-4 text-sm font-bold text-slate-700"><label className="flex items-center gap-2"><input name="kaizenAccess" type="checkbox" />Kaizen</label><label className="flex items-center gap-2"><input name="genbaAccess" type="checkbox" />GENBA</label></div></fieldset>
            <div className="flex items-end"><button className="btn btn-primary w-full" type="submit"><Plus className="h-4 w-4" aria-hidden />Crear usuario</button></div>
          </form>
        </details>

        <div className="grid gap-3">
          {users.map((user) => (
            <details className="details-panel" data-user-email={user.email.toLowerCase()} data-testid={`user-${user.id}`} key={user.id} open={query.user === user.id}>
              <summary>
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${roleTone[user.role as keyof typeof roleTone]}`}>{user.name.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-extrabold text-ink">{user.name}</span><span className="block truncate text-xs font-normal text-slate-500">{user.email}</span></span>
                </span>
                <span className="ml-auto hidden items-center gap-2 pr-2 sm:flex"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${roleTone[user.role as keyof typeof roleTone]}`}>{roleLabels[user.role]}</span><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${user.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{user.active ? "Activo" : "Inactivo"}</span></span>
              </summary>
              <form action={updateUserAction} className="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
                <input name="userId" type="hidden" value={user.id} />
                <label><span className="label">Nombre</span><input className="field" name="name" defaultValue={user.name} required /></label>
                <label><span className="label">Correo real</span><input className="field" name="email" defaultValue={user.email} required type="email" /></label>
                <label><span className="label">Departamento / rol</span><select className="field" name="role" defaultValue={user.role}>{configurableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
                <label><span className="label">Cambiar contraseña</span><input autoComplete="new-password" className="field" minLength={8} name="password" placeholder="Dejar vacio para conservar" type="password" /></label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700"><input defaultChecked={user.active} name="active" type="checkbox" />Acceso activo</label>
                <fieldset className="rounded-lg border border-line bg-panel p-3"><legend className="px-1 text-xs font-extrabold text-ink">Módulos adicionales</legend><div className="mt-2 flex flex-wrap gap-4 text-sm font-bold text-slate-700"><label className="flex items-center gap-2"><input defaultChecked={user.kaizenAccess} name="kaizenAccess" type="checkbox" />Kaizen</label><label className="flex items-center gap-2"><input defaultChecked={user.genbaAccess} name="genbaAccess" type="checkbox" />GENBA</label></div></fieldset>
                <div className="flex items-end"><button className="btn btn-secondary w-full" type="submit"><UserCog className="h-4 w-4" aria-hidden />Guardar cambios</button></div>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 scroll-mt-6" id="areas">
        <SectionHeading count={areas.length} description="Define el nombre visible, supervisor responsable y disponibilidad de cada QR." title="Áreas y supervisores" tone="green" />
        <div className="grid gap-3">
          {areas.map((area) => (
            <details className="details-panel" key={area.id}>
              <summary><span className="flex items-center gap-3"><span className="flex h-9 w-12 items-center justify-center rounded-lg bg-emerald-700 text-xs font-extrabold text-white">{area.code}</span><span><span className="block text-sm font-extrabold text-ink">{area.name}</span><span className="block text-xs font-normal text-slate-500">{area.supervisor?.name ?? "Sin supervisor"}</span></span></span><span className={`ml-auto mr-2 hidden rounded-full px-2 py-1 text-[10px] font-extrabold sm:inline-flex ${area.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{area.active ? "Activa" : "Inactiva"}</span></summary>
              <form action={updateAreaAction} className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_140px_auto]">
                <input name="areaId" type="hidden" value={area.id} />
                <label><span className="label">Nombre del área</span><input className="field" name="name" defaultValue={area.name} required /></label>
                <label><span className="label">Responsable de recibir ideas</span><select className="field" name="supervisorId" defaultValue={area.supervisorId ?? ""}><option value="">Sin responsable</option>{assignableUsers.map((person) => <option key={person.id} value={person.id}>{person.name} · {roleLabels[person.role]}</option>)}</select></label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700"><input defaultChecked={area.active} name="active" type="checkbox" />Área activa</label>
                <div className="flex items-end"><button className="btn btn-secondary w-full" type="submit">Guardar</button></div>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 scroll-mt-6" id="puntos">
        <SectionHeading count={pointRules.length} description="Estas reglas aparecen como sugerencia automatica y pueden ajustarse antes del cierre." title="Reglas de puntos" />

        <details className="details-panel mb-4 border-dashed border-slate-400">
          <summary><span className="flex items-center gap-2 text-brand-700"><Plus className="h-4 w-4" aria-hidden />Crear una regla</span></summary>
          <form action={createPointRuleAction} className="grid gap-4 p-4 md:grid-cols-[1fr_1.5fr_110px_auto]">
            <label><span className="label">Nombre</span><input className="field" name="name" required /></label>
            <label><span className="label">Descripcion</span><input className="field" name="description" required /></label>
            <label><span className="label">Puntos</span><input className="field" name="points" min={0} required type="number" /></label>
            <div className="flex items-end"><button className="btn btn-primary w-full" type="submit">Crear</button></div>
          </form>
        </details>

        <div className="grid gap-3">
          {pointRules.map((rule) => {
            const managerial = isManagerialEvaluationRule(rule.id);
            return (
            <details className="details-panel" key={rule.id}>
              <summary><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-ink">{rule.name}</span><span className="block truncate text-xs font-normal text-slate-500">{rule.description}</span></span><span className="ml-auto mr-2 flex items-center gap-2"><span className="text-sm font-extrabold text-emerald-700">+{rule.points}</span><span className={`hidden rounded-full px-2 py-1 text-[10px] font-extrabold sm:inline-flex ${rule.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{rule.active ? "Activa" : "Inactiva"}</span></span></summary>
              <form action={updatePointRuleAction} className="grid gap-4 p-4 md:grid-cols-[1fr_1.5fr_110px_120px_auto]">
                <input name="pointRuleId" type="hidden" value={rule.id} />
                <label><span className="label">Regla</span><input className="field" name="name" defaultValue={rule.name} required /></label>
                <label><span className="label">Descripcion</span><input className="field" name="description" defaultValue={rule.description} required /></label>
                <label><span className="label">{managerial ? "Puntos maximos" : "Puntos"}</span><input className="field" name="points" defaultValue={rule.points} min={0} readOnly={managerial} type="number" required /></label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-700"><input defaultChecked={rule.active} name="active" type="checkbox" />Regla activa</label>
                <div className="flex items-end"><button className="btn btn-secondary w-full" type="submit">Guardar</button></div>
              </form>
            </details>
            );
          })}
        </div>
      </section>
    </>
  );
}
