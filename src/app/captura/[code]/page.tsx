import { notFound } from "next/navigation";
import { submitIdeaAction } from "@/app/actions";
import { impactOptions, shifts } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CaptureProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function CapturePage({ params, searchParams }: CaptureProps) {
  const { code } = await params;
  const query = await searchParams;
  const area = await prisma.area.findFirst({
    where: { code: code.toUpperCase(), active: true },
    include: { supervisor: true }
  });

  if (!area) notFound();

  return (
    <main className="min-h-screen bg-panel p-4 sm:p-6">
      <section className="mx-auto max-w-4xl">
        <div className="mb-5 rounded-lg bg-brand-700 p-5 text-white">
          <p className="text-sm font-bold uppercase text-brand-50">PROpEx</p>
          <h1 className="text-3xl font-black">Registrar idea de mejora</h1>
          <p className="mt-2 text-sm text-brand-50">
            Area {area.code} - {area.name}
          </p>
        </div>

        {query.error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
            Revisa los campos obligatorios antes de enviar.
          </div>
        ) : null}

        <form action={submitIdeaAction} className="surface rounded-lg p-5 sm:p-6">
          <input name="areaCode" type="hidden" value={area.code} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label">Nombre del colaborador *</span>
              <input className="field" name="collaboratorName" required />
            </label>
            <label>
              <span className="label">Numero de empleado</span>
              <input className="field" name="employeeNumber" />
            </label>
            <label>
              <span className="label">Correo del colaborador</span>
              <input className="field" name="collaboratorEmail" type="email" />
            </label>
            <label>
              <span className="label">Turno *</span>
              <select className="field" name="shift" required>
                {shifts.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4">
            <label>
              <span className="label">Problema detectado *</span>
              <textarea className="field min-h-28" name="problem" required />
            </label>
            <label>
              <span className="label">Idea propuesta *</span>
              <textarea className="field min-h-28" name="proposal" required />
            </label>
            <label>
              <span className="label">Beneficio esperado *</span>
              <textarea className="field min-h-24" name="expectedBenefit" required />
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="label">Tipo de impacto SQDCM</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {impactOptions.map((impact) => (
                <label className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold" key={impact}>
                  <input name="impactTypes" type="checkbox" value={impact} />
                  {impact}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="flex items-start gap-2 rounded-lg border border-line bg-panel p-3 text-sm font-semibold">
              <input name="impactsQuality" type="checkbox" />
              Impacta calidad/inocuidad
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-line bg-panel p-3 text-sm font-semibold">
              <input name="impactsSafety" type="checkbox" />
              Impacta seguridad
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-line bg-panel p-3 text-sm font-semibold">
              <input name="requiresMaintenance" type="checkbox" />
              Requiere mantenimiento
            </label>
          </div>

          <label className="mt-5 block">
            <span className="label">Evidencia antes</span>
            <input className="field" name="beforeEvidence" type="file" accept="image/*,.pdf" />
          </label>

          <button className="btn btn-primary mt-6 w-full sm:w-auto" type="submit">
            Registrar idea
          </button>
        </form>
      </section>
    </main>
  );
}
