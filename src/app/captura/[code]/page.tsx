import { notFound } from "next/navigation";
import { submitIdeaAction } from "@/app/actions";
import { impactOptions, shifts } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { ClipboardCheck, ImagePlus, Lightbulb } from "lucide-react";

export const dynamic = "force-dynamic";

const captureSteps = [
  { icon: Lightbulb, number: "1", text: "Cuenta el problema" },
  { icon: ClipboardCheck, number: "2", text: "Marca el impacto" },
  { icon: ImagePlus, number: "3", text: "Agrega evidencia" }
];

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
    <main className="min-h-screen p-4 sm:p-6">
      <section className="mx-auto max-w-4xl">
        <div className="mb-5 overflow-hidden rounded-lg bg-slate-950 text-white shadow-soft">
          <div className="h-2 bg-brand-500" />
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-28 items-center justify-center rounded-lg bg-white p-2">
                  <img alt="Proboca" className="max-h-10 max-w-full object-contain" src="/brand/proboca-logo.png" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-brand-100">PROpEx</p>
                  <h1 className="text-3xl font-black">Registrar idea de mejora</h1>
                </div>
              </div>
              <p className="mt-3 text-sm font-bold text-brand-50">
                Area {area.code} - {area.name}
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-black">
              {area.supervisor?.name ?? "Supervisor pendiente"}
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {captureSteps.map((step) => {
            const Icon = step.icon;
            return (
            <div className="step-surface rounded-lg p-4" key={step.number}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-black uppercase text-brand-700">Paso {step.number}</p>
                  <p className="text-sm font-black text-ink">{step.text}</p>
                </div>
              </div>
            </div>
            );
          })}
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
              <span className="label">Que problema viste? *</span>
              <textarea className="field min-h-28" name="problem" placeholder="Ejemplo: el material se queda atorado en..." required />
            </label>
            <label>
              <span className="label">Que propones hacer? *</span>
              <textarea className="field min-h-28" name="proposal" placeholder="Ejemplo: cambiar la posicion de..." required />
            </label>
            <label>
              <span className="label">Que mejora esperas? *</span>
              <textarea className="field min-h-24" name="expectedBenefit" placeholder="Ejemplo: menos tiempo perdido, mas seguridad..." required />
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="label">Tipo de impacto SQDCM</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {impactOptions.map((impact) => (
                <label className="flex min-h-12 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-black" key={impact}>
                  <input name="impactTypes" type="checkbox" value={impact} />
                  {impact}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-black text-red-900">
              <input name="impactsQuality" type="checkbox" />
              Impacta calidad/inocuidad
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm font-black text-slate-900">
              <input name="impactsSafety" type="checkbox" />
              Impacta seguridad
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-black text-blue-900">
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
