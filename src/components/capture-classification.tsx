"use client";

import { useState } from "react";
import { Building2, Check, HardHat, PackageCheck, Settings, UsersRound, Wrench } from "lucide-react";

type Category = "A" | "B" | "C";

const categories = [
  {
    value: "A" as const,
    title: "Categoría A",
    subtitle: "Tú + tu jefe directo",
    description: "Es sencilla, no requiere inversión ni apoyo de otro departamento."
  },
  {
    value: "B" as const,
    title: "Categoría B",
    subtitle: "Apoyo interno",
    description: "Necesita ayuda de una o mas areas internas."
  },
  {
    value: "C" as const,
    title: "Categoría C",
    subtitle: "Externo o cotización",
    description: "Requiere comprar, cotizar, modificar o recibir apoyo externo."
  }
];

type SupportArea = { id: string; code: string; name: string };

function supportPresentation(area: SupportArea) {
  const value = `${area.name} ${area.code}`.toLowerCase();
  if (value.includes("calidad") || value.includes("inocuidad")) return { icon: PackageCheck, description: "Producto, limpieza, empaque o proceso", tone: "peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-900" };
  if (value.includes("seguridad") || value.includes("ambiente")) return { icon: HardHat, description: "Riesgo, ergonomia, ambiente o condicion insegura", tone: "peer-checked:border-slate-500 peer-checked:bg-slate-100 peer-checked:text-slate-900" };
  if (value.includes("mantenimiento") || value.includes("servicio")) return { icon: Wrench, description: "Reparacion, instalacion o ajuste tecnico", tone: "peer-checked:border-blue-400 peer-checked:bg-blue-50 peer-checked:text-blue-900" };
  if (value.includes("mejora")) return { icon: Settings, description: "Analisis, facilitacion o seguimiento especial", tone: "peer-checked:border-slate-950 peer-checked:bg-slate-100 peer-checked:text-slate-950" };
  return { icon: Building2, description: "Revision o apoyo de esta area", tone: "peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-950" };
}

export function CaptureClassification({ initialCategory = "A", supportAreas }: { initialCategory?: Category; supportAreas: SupportArea[] }) {
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
              <span className="capture-choice-box min-h-32 p-4">
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
            {supportAreas.map((area) => {
              const presentation = supportPresentation(area);
              const Icon = presentation.icon;
              return (
                <label className="capture-choice cursor-pointer" key={area.id}>
                  <input className="peer sr-only" name="supportUnitIds" type="checkbox" value={area.id} />
                  <span className={`capture-choice-box min-h-20 ${presentation.tone}`}>
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-sm font-extrabold">{area.name}</span>
                      <span className="mt-1 block text-xs leading-4 opacity-75">{presentation.description}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {!supportAreas.length ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">Todavia no hay areas de apoyo activas para esta planta. El supervisor podra solicitar apoyo despues.</p> : null}
        </fieldset>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div><p className="text-sm font-extrabold">La realizarán tú y tu jefe directo</p><p className="mt-1 text-xs leading-5">No necesitas seleccionar otro departamento.</p></div>
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
