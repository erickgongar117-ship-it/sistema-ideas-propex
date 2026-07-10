import type { ComponentType } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Accessibility,
  Camera,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Factory,
  Gauge,
  HardHat,
  HeartHandshake,
  ImagePlus,
  Leaf,
  Lightbulb,
  PackageCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
  Wrench
} from "lucide-react";
import { submitIdeaAction } from "@/app/actions";
import { impactOptions, shifts } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CaptureProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string; campos?: string }>;
};

const fieldLabels: Record<string, string> = {
  collaboratorName: "tu nombre",
  areaCode: "el área",
  shift: "el turno",
  problem: "el problema",
  proposal: "la propuesta",
  expectedBenefit: "el beneficio esperado"
};

const impactIcons: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  Seguridad: ShieldCheck,
  "Calidad/Inocuidad": PackageCheck,
  Entrega: Truck,
  Costo: CircleDollarSign,
  Moral: HeartHandshake,
  Productividad: Gauge,
  "5S": Sparkles,
  Ergonomia: Accessibility,
  "Medio ambiente": Leaf
};

function fieldHasError(fields: string[], field: string) {
  return fields.includes(field);
}

function fieldClass(fields: string[], field: string) {
  return fieldHasError(fields, field) ? "field border-rose-500 bg-rose-50" : "field";
}

function FormSectionTitle({ number, title, description, icon: Icon }: { number: string; title: string; description: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">Paso {number}</p>
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm leading-5 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

export default async function CapturePage({ params, searchParams }: CaptureProps) {
  const { code } = await params;
  const query = await searchParams;
  const errorFields = query.campos ? query.campos.split(",").filter(Boolean) : [];
  const missingLabels = errorFields.map((field) => fieldLabels[field] ?? field);
  const area = await prisma.area.findFirst({
    where: { code: code.toUpperCase(), active: true },
    include: { supervisor: true }
  });

  if (!area) notFound();

  return (
    <main className="capture-theme min-h-screen bg-panel px-4 py-5 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-5xl">
        <header className="surface overflow-hidden rounded-lg">
          <div className="h-1.5 bg-brand-500" />
          <div className="grid gap-5 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="flex h-12 w-24 shrink-0 items-center justify-center border border-line bg-white p-2 sm:h-14 sm:w-28">
                <Image alt="Proboca" className="h-auto w-full object-contain" height={72} priority width={216} src="/brand/proboca-logo.png" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-700">PROpEx · Captura publica</p>
                <h1 className="mt-0.5 text-xl font-extrabold leading-tight text-ink sm:text-2xl">Registrar idea de mejora</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l-4 border-emerald-600 bg-emerald-50 px-3 py-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-sm font-extrabold text-white">{area.code}</span>
              <span>
                <span className="block text-xs font-extrabold text-emerald-900">{area.name}</span>
                <span className="mt-0.5 block text-[11px] text-emerald-800">{area.supervisor?.name ?? "Supervisor pendiente"}</span>
              </span>
            </div>
          </div>
        </header>

        <div className="my-4 grid grid-cols-3 gap-2 sm:my-5 sm:gap-3">
          {[
            ["1", "Idea", Lightbulb],
            ["2", "Impacto", ClipboardCheck],
            ["3", "Enviar", Send]
          ].map(([number, label, Icon]) => {
            const StepIcon = Icon as ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
            return (
              <div className="step-surface flex min-h-16 items-center gap-2 rounded-lg p-2.5 sm:p-3" key={number as string}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <StepIcon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-extrabold uppercase text-emerald-700">Paso {number as string}</span>
                  <span className="block text-[11px] font-extrabold leading-4 text-ink sm:text-sm">{label as string}</span>
                </span>
              </div>
            );
          })}
        </div>

        {query.error ? (
          <div className="alert alert-danger mb-4" role="alert">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="font-extrabold">No pudimos enviar la idea todavia.</p>
              <p className="mt-1 leading-5">
                {query.error === "area"
                  ? "Este QR pertenece a un área inactiva. Avisa a Mejora Continua o utiliza otro código."
                  : missingLabels.length
                    ? `Revisa ${missingLabels.join(", ")}. Puedes usar frases cortas; no tiene que quedar perfecto.`
                    : "Revisa los campos marcados e intenta nuevamente."}
              </p>
            </div>
          </div>
        ) : null}

        <form action={submitIdeaAction} className="surface overflow-hidden rounded-lg">
          <input name="areaCode" type="hidden" value={area.code} />

          <section className="p-5 sm:p-6">
            <FormSectionTitle description="Solo necesitamos saber quien comparte la oportunidad." icon={UserRound} number="1" title="Tus datos" />
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="label">Nombre completo *</span>
                <input autoComplete="name" className={fieldClass(errorFields, "collaboratorName")} name="collaboratorName" placeholder="Escribe tu nombre" required />
                {fieldHasError(errorFields, "collaboratorName") ? <span className="helper-text font-bold text-rose-700">Escribe al menos 2 letras.</span> : null}
              </label>
              <label>
                <span className="label">Número de empleado</span>
                <input className="field" inputMode="numeric" name="employeeNumber" placeholder="Opcional" />
              </label>
              <label>
                <span className="label">Correo</span>
                <input autoComplete="email" className="field" name="collaboratorEmail" placeholder="Opcional, para recibir avisos" type="email" />
              </label>
              <label>
                <span className="label">Turno *</span>
                <select className={fieldClass(errorFields, "shift")} defaultValue="Matutino" name="shift" required>
                  {shifts.map((shift) => (
                    <option key={shift} value={shift}>{shift}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="border-t border-line p-5 sm:p-6">
            <FormSectionTitle description="Cuentanos que viste y como crees que podria mejorar." icon={Lightbulb} number="2" title="La oportunidad" />
            <div className="grid gap-4">
              <label>
                <span className="label">¿Qué problema viste? *</span>
                <textarea className={`${fieldClass(errorFields, "problem")} min-h-28`} name="problem" placeholder="Ejemplo: El material se atora y retrasa la linea..." required />
                {fieldHasError(errorFields, "problem") ? <span className="helper-text font-bold text-rose-700">Describe el problema con una frase corta.</span> : null}
              </label>
              <div className="grid gap-4 lg:grid-cols-2">
                <label>
                  <span className="label">¿Qué propones hacer? *</span>
                  <textarea className={`${fieldClass(errorFields, "proposal")} min-h-28`} name="proposal" placeholder="Ejemplo: Cambiar la guia para evitar el atoron..." required />
                  {fieldHasError(errorFields, "proposal") ? <span className="helper-text font-bold text-rose-700">Escribe una propuesta corta.</span> : null}
                </label>
                <label>
                  <span className="label">¿Qué mejora esperas? *</span>
                  <textarea className={`${fieldClass(errorFields, "expectedBenefit")} min-h-28`} name="expectedBenefit" placeholder="Ejemplo: Menos paro, menor riesgo y trabajo mas rapido..." required />
                  {fieldHasError(errorFields, "expectedBenefit") ? <span className="helper-text font-bold text-rose-700">Escribe el beneficio esperado.</span> : null}
                </label>
              </div>
            </div>
          </section>

          <section className="border-t border-line p-5 sm:p-6">
            <FormSectionTitle description="Marca todo lo que podria mejorar con esta idea." icon={ClipboardCheck} number="3" title="Impacto y evidencia" />
            <fieldset>
              <legend className="label">¿Qué beneficia la idea?</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {impactOptions.map((impact) => {
                  const ImpactIcon = impactIcons[impact] ?? Check;
                  return (
                    <label className="capture-choice cursor-pointer" key={impact}>
                      <input className="peer sr-only" name="impactTypes" type="checkbox" value={impact} />
                      <span className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-white p-3 text-sm font-bold text-slate-700 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-900">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel text-slate-600">
                          <ImpactIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">{impact}</span>
                        <Check className="capture-choice-check h-4 w-4 shrink-0 text-emerald-700 opacity-0" aria-hidden />
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="label">¿Necesita revisión de algún departamento?</legend>
              <div className="grid gap-2 lg:grid-cols-3">
                {[
                  ["impactsQuality", "Calidad / Inocuidad", "Producto, limpieza, empaque o proceso", PackageCheck, "peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-900"],
                  ["impactsSafety", "Seguridad", "Riesgo, ergonomia o condicion insegura", HardHat, "peer-checked:border-slate-500 peer-checked:bg-slate-100 peer-checked:text-slate-900"],
                  ["requiresMaintenance", "Mantenimiento", "Reparacion, instalacion o ajuste tecnico", Wrench, "peer-checked:border-blue-400 peer-checked:bg-blue-50 peer-checked:text-blue-900"]
                ].map(([name, title, description, Icon, selectedClass]) => {
                  const DepartmentIcon = Icon as ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
                  return (
                    <label className="capture-choice cursor-pointer" key={name as string}>
                      <input className="peer sr-only" name={name as string} type="checkbox" />
                      <span className={`flex min-h-20 items-start gap-3 rounded-lg border border-line bg-white p-3 transition ${selectedClass as string}`}>
                        <DepartmentIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                        <span>
                          <span className="block text-sm font-extrabold">{title as string}</span>
                          <span className="mt-1 block text-xs leading-4 opacity-75">{description as string}</span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-6 block rounded-lg border border-dashed border-slate-300 bg-panel p-4">
              <span className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <Camera className="h-5 w-5 text-emerald-700" aria-hidden />
                Foto o evidencia antes
              </span>
              <span className="helper-text">Opcional. Una imagen ayuda a entender la oportunidad con mayor rapidez.</span>
              <input className="field mt-3 bg-white" name="beforeEvidence" type="file" accept="image/*,.pdf" />
            </label>
          </section>

          <footer className="flex flex-col gap-4 border-t border-line bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <Factory className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
              <div>
                <p className="text-sm font-extrabold">Tu idea llegará al supervisor de {area.code}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">Al enviarla recibirás un folio para identificarla.</p>
              </div>
            </div>
            <button className="btn btn-success min-w-48" type="submit">
              Enviar mi idea
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}
