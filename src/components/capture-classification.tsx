"use client";

import { useState } from "react";
import { Building2, Check, HardHat, PackageCheck, UsersRound, Wrench } from "lucide-react";

type Category = "A" | "B" | "C";

const categories = [
  {
    value: "A" as const,
    title: "Categoría A",
    subtitle: "Operador + supervisor",
    description: "Es sencilla, no requiere inversión ni apoyo de otro departamento."
  },
  {
    value: "B" as const,
    title: "Categoría B",
    subtitle: "Apoyo interno",
    description: "Necesita ayuda de Calidad, Seguridad o Mantenimiento."
  },
  {
    value: "C" as const,
    title: "Categoría C",
    subtitle: "Externo o cotización",
    description: "Requiere comprar, cotizar, modificar o recibir apoyo externo."
  }
];

const departments = [
  { name: "impactsQuality", title: "Calidad / Inocuidad", description: "Producto, limpieza, empaque o proceso", icon: PackageCheck, tone: "peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-900" },
  { name: "impactsSafety", title: "Seguridad", description: "Riesgo, ergonomía o condición insegura", icon: HardHat, tone: "peer-checked:border-slate-500 peer-checked:bg-slate-100 peer-checked:text-slate-900" },
  { name: "requiresMaintenance", title: "Mantenimiento", description: "Reparación, instalación o ajuste técnico", icon: Wrench, tone: "peer-checked:border-blue-400 peer-checked:bg-blue-50 peer-checked:text-blue-900" }
];

export function CaptureClassification({ initialCategory = "A" }: { initialCategory?: Category }) {
  const [category, setCategory] = useState<Category>(initialCategory);

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="label">¿Qué tipo de apoyo necesita la idea? *</legend>
        <p className="mb-3 text-xs leading-5 text-slate-600">Elige la opción que más se parezca. El supervisor podrá ajustarla después.</p>
        <div className="grid gap-2 lg:grid-cols-3">
          {categories.map((item) => (
            <label className="capture-choice cursor-pointer" key={item.value}>
              <input
                checked={category === item.value}
                className="peer sr-only"
                name="category"
                onChange={() => setCategory(item.value)}
                type="radio"
                value={item.value}
              />
              <span className="flex min-h-32 items-start gap-3 rounded-lg border border-line bg-white p-4 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-950">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel text-slate-600 peer-checked:text-emerald-700">
                  {item.value === "A" ? <UsersRound className="h-5 w-5" aria-hidden /> : item.value === "B" ? <Building2 className="h-5 w-5" aria-hidden /> : <Wrench className="h-5 w-5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold">{item.title}</span>
                  <span className="mt-0.5 block text-xs font-bold text-emerald-800">{item.subtitle}</span>
                  <span className="mt-2 block text-xs leading-5 text-slate-600">{item.description}</span>
                </span>
                <Check className={`h-4 w-4 shrink-0 text-emerald-700 ${category === item.value ? "opacity-100" : "opacity-0"}`} aria-hidden />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {category !== "A" ? (
        <fieldset>
          <legend className="label px-1">¿Qué departamentos deben apoyar para realizarla?</legend>
          <p className="mb-3 px-1 text-xs leading-5 text-slate-600">
            Marca todos los que apliquen. Si todavía no estás seguro, el supervisor puede pedir el apoyo después.
          </p>
          <div className="grid gap-2 lg:grid-cols-3">
            {departments.map((department) => {
              const Icon = department.icon;
              return (
                <label className="capture-choice cursor-pointer" key={department.name}>
                  <input className="peer sr-only" name={department.name} type="checkbox" />
                  <span className={`flex min-h-20 items-start gap-3 rounded-lg border border-line bg-white p-3 transition ${department.tone}`}>
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-sm font-extrabold">{department.title}</span>
                      <span className="mt-1 block text-xs leading-4 opacity-75">{department.description}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div><p className="text-sm font-extrabold">La realizarán el operador y el supervisor</p><p className="mt-1 text-xs leading-5">No necesitas seleccionar otro departamento.</p></div>
        </div>
      )}

      {category === "C" ? (
        <label className="block rounded-lg border border-slate-300 bg-panel p-4">
          <span className="label">¿Qué se necesita comprar, cotizar o solicitar externamente? *</span>
          <textarea className="field min-h-24 bg-white" name="externalSupportDetails" placeholder="Ejemplo: cotizar una guarda, comprar material o solicitar apoyo de un proveedor..." required />
        </label>
      ) : null}
    </div>
  );
}
