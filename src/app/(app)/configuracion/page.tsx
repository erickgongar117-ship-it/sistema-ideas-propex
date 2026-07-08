import { createPointRuleAction, updateAreaAction, updatePointRuleAction, updateSupportSettingsAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseSettings(value?: string | null) {
  if (!value) return { calidad: "", seguridad: "", mantenimiento: "", mejoraContinua: "" };
  try {
    return JSON.parse(value) as { calidad?: string; seguridad?: string; mantenimiento?: string; mejoraContinua?: string };
  } catch {
    return { calidad: "", seguridad: "", mantenimiento: "", mejoraContinua: "" };
  }
}

export default async function ConfigPage() {
  await requireUser(["ADMIN"]);
  const [areas, supervisors, pointRules, supportSetting] = await Promise.all([
    prisma.area.findMany({ include: { supervisor: true }, orderBy: { code: "asc" } }),
    prisma.user.findMany({ where: { role: "SUPERVISOR", active: true }, orderBy: { name: "asc" } }),
    prisma.pointRule.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.setting.findUnique({ where: { key: "supportEmails" } })
  ]);
  const support = parseSettings(supportSetting?.value);

  return (
    <>
      <PageHeader title="Configuracion" description="Areas, supervisores, reglas de puntos y correos de soporte." />

      <section className="surface rounded-lg p-5">
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
        <h2 className="text-lg font-black text-ink">Correos de areas soporte</h2>
        <form action={updateSupportSettingsAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <label>
            <span className="label">Calidad/Inocuidad</span>
            <input className="field" name="calidad" defaultValue={support.calidad ?? ""} type="email" />
          </label>
          <label>
            <span className="label">Seguridad</span>
            <input className="field" name="seguridad" defaultValue={support.seguridad ?? ""} type="email" />
          </label>
          <label>
            <span className="label">Mantenimiento</span>
            <input className="field" name="mantenimiento" defaultValue={support.mantenimiento ?? ""} type="email" />
          </label>
          <label>
            <span className="label">Mejora Continua</span>
            <input className="field" name="mejoraContinua" defaultValue={support.mejoraContinua ?? ""} type="email" />
          </label>
          <button className="btn btn-primary md:col-span-4 md:w-fit" type="submit">
            Guardar correos
          </button>
        </form>
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
