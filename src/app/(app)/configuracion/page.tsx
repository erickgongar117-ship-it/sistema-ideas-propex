import {
  createPointRuleAction,
  createUserAction,
  updateAreaAction,
  updatePointRuleAction,
  updateUserAction
} from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { roleLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const configurableRoles = ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"] as const;

type ConfigPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ConfigPage({ searchParams }: ConfigPageProps) {
  await requireUser(["ADMIN"]);
  const query = await searchParams;
  const [areas, supervisors, users, pointRules] = await Promise.all([
    prisma.area.findMany({ include: { supervisor: true }, orderBy: { code: "asc" } }),
    prisma.user.findMany({ where: { role: "SUPERVISOR", active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { in: [...configurableRoles] } }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.pointRule.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  return (
    <>
      <PageHeader title="Configuracion" description="Usuarios, correos reales, areas, supervisores y reglas de puntos." />

      {query.error ? (
        <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-black text-rose-800">
          {query.error === "correo" ? "Ese correo ya esta registrado en otro usuario." : "Revisa la informacion capturada."}
        </div>
      ) : null}

      <section className="surface rounded-lg p-5">
        <h2 className="text-lg font-black text-ink">Usuarios y correos de acceso</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          Solo Administrador puede dar de alta usuarios, cambiar correos reales, activar/desactivar accesos y asignar rol.
        </p>
        <div className="mt-4 grid gap-3">
          {users.map((user) => (
            <form action={updateUserAction} className="grid gap-3 rounded-lg border border-line bg-panel p-3 xl:grid-cols-[1fr_1.4fr_190px_150px_120px_auto]" key={user.id}>
              <input name="userId" type="hidden" value={user.id} />
              <label>
                <span className="label">Nombre</span>
                <input className="field" name="name" defaultValue={user.name} required />
              </label>
              <label>
                <span className="label">Correo real</span>
                <input className="field" name="email" defaultValue={user.email} required type="email" />
              </label>
              <label>
                <span className="label">Rol</span>
                <select className="field" name="role" defaultValue={user.role}>
                  {configurableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Nueva contrasena</span>
                <input className="field" name="password" placeholder="No cambiar" type="text" />
              </label>
              <label className="flex items-end gap-2 pb-3 text-sm font-bold text-slate-700">
                <input defaultChecked={user.active} name="active" type="checkbox" />
                Activo
              </label>
              <div className="flex items-end">
                <button className="btn btn-secondary w-full" type="submit">
                  Guardar
                </button>
              </div>
            </form>
          ))}
        </div>
        <form action={createUserAction} className="mt-5 grid gap-3 rounded-lg border border-dashed border-brand-500 bg-brand-50 p-3 xl:grid-cols-[1fr_1.4fr_190px_150px_120px_auto]">
          <label>
            <span className="label">Nuevo usuario</span>
            <input className="field" name="name" required />
          </label>
          <label>
            <span className="label">Correo real</span>
            <input className="field" name="email" required type="email" />
          </label>
          <label>
            <span className="label">Rol</span>
            <select className="field" name="role" defaultValue="MEJORA_CONTINUA">
              {configurableRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Contrasena</span>
            <input className="field" name="password" placeholder="admin123 si se deja vacia" type="text" />
          </label>
          <label className="flex items-end gap-2 pb-3 text-sm font-bold text-slate-700">
            <input defaultChecked name="active" type="checkbox" />
            Activo
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" type="submit">
              Crear
            </button>
          </div>
        </form>
      </section>

      <section className="surface mt-5 rounded-lg p-5">
        <h2 className="text-lg font-black text-ink">Areas y supervisores</h2>
        <div className="mt-4 grid gap-3">
          {areas.map((area) => (
            <form action={updateAreaAction} className="grid gap-3 rounded-lg border border-line bg-panel p-3 md:grid-cols-[80px_1fr_1fr_120px_auto]" key={area.id}>
              <input name="areaId" type="hidden" value={area.id} />
              <div>
                <span className="label">Codigo</span>
                <input className="field" disabled value={area.code} />
              </div>
              <label>
                <span className="label">Nombre del area</span>
                <input className="field" name="name" defaultValue={area.name} />
              </label>
              <label>
                <span className="label">Supervisor</span>
                <select className="field" name="supervisorId" defaultValue={area.supervisorId ?? ""}>
                  <option value="">Sin supervisor</option>
                  {supervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-3 text-sm font-bold text-slate-700">
                <input defaultChecked={area.active} name="active" type="checkbox" />
                Activa
              </label>
              <div className="flex items-end">
                <button className="btn btn-secondary w-full" type="submit">
                  Guardar
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="surface mt-5 rounded-lg p-5">
        <h2 className="text-lg font-black text-ink">Reglas de puntos</h2>
        <div className="mt-4 grid gap-3">
          {pointRules.map((rule) => (
            <form action={updatePointRuleAction} className="grid gap-3 rounded-lg border border-line bg-panel p-3 md:grid-cols-[1fr_1.5fr_100px_100px_auto]" key={rule.id}>
              <input name="pointRuleId" type="hidden" value={rule.id} />
              <label>
                <span className="label">Regla</span>
                <input className="field" name="name" defaultValue={rule.name} />
              </label>
              <label>
                <span className="label">Descripcion</span>
                <input className="field" name="description" defaultValue={rule.description} />
              </label>
              <label>
                <span className="label">Puntos</span>
                <input className="field" name="points" defaultValue={rule.points} min={0} type="number" />
              </label>
              <label className="flex items-end gap-2 pb-3 text-sm font-bold text-slate-700">
                <input defaultChecked={rule.active} name="active" type="checkbox" />
                Activa
              </label>
              <div className="flex items-end">
                <button className="btn btn-secondary w-full" type="submit">
                  Guardar
                </button>
              </div>
            </form>
          ))}
        </div>
        <form action={createPointRuleAction} className="mt-5 grid gap-3 rounded-lg border border-dashed border-brand-500 bg-brand-50 p-3 md:grid-cols-[1fr_1.5fr_100px_auto]">
          <label>
            <span className="label">Nueva regla</span>
            <input className="field" name="name" required />
          </label>
          <label>
            <span className="label">Descripcion</span>
            <input className="field" name="description" required />
          </label>
          <label>
            <span className="label">Puntos</span>
            <input className="field" name="points" min={0} required type="number" />
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" type="submit">
              Crear
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
