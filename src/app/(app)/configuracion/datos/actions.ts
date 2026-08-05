"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  HardDeleteNotFoundError,
  hardDeleteGenbaByFolio,
  hardDeleteIdeaByFolio,
  hardDeleteKaizenByFolio,
  purgeOperationalModules,
  type HardDeleteResult,
  type OperationalModule
} from "@/lib/hard-delete";

const moduleNames: Record<OperationalModule, string> = {
  IDEAS: "idea",
  KAIZEN: "Kaizen",
  GENBA: "GENBA"
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeFolio(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function dataUrl(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return `/configuracion/datos?${query.toString()}`;
}

function revalidateOperationalPaths(modules: Iterable<OperationalModule>) {
  const selected = new Set(modules);
  revalidatePath("/configuracion/datos");
  revalidatePath("/dashboard");
  revalidatePath("/panorama");
  revalidatePath("/probocacoins");

  if (selected.has("IDEAS")) {
    for (const route of [
      "/ideas",
      "/supervisor",
      "/mejora",
      "/calidad",
      "/seguridad",
      "/mantenimiento",
      "/implementacion",
      "/notificaciones"
    ]) revalidatePath(route);
  }
  if (selected.has("KAIZEN")) {
    revalidatePath("/kaizen");
    revalidatePath("/kaizen/kanban");
    revalidatePath("/kaizen/gantt");
  }
  if (selected.has("GENBA")) {
    revalidatePath("/genba");
    revalidatePath("/genba/kanban");
  }
}

function resultParams(result: HardDeleteResult) {
  return {
    ideas: result.ideas,
    kaizen: result.kaizenProjects,
    genba: result.genbaWalks,
    activities: result.kaizenActivities + result.genbaActivities,
    files: result.files.deleted + result.files.missing,
    fileWarnings: result.files.failed + result.files.unmanaged,
    detached: result.detachedKaizenFromIdeas + result.detachedKaizenFromGenba
  };
}

function parseModule(value: string): OperationalModule | null {
  return value === "IDEAS" || value === "KAIZEN" || value === "GENBA" ? value : null;
}

export async function hardDeleteByFolioAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const module = parseModule(text(formData, "module"));
  const folio = normalizeFolio(text(formData, "folio"));
  const confirmation = text(formData, "confirmation").toUpperCase().replace(/\s+/g, " ");

  if (!module || !folio) redirect(dataUrl({ error: "campos" }));
  if (confirmation !== `ELIMINAR ${folio}`) {
    redirect(dataUrl({ error: "confirmacion_folio", module, folio }));
  }

  let result: HardDeleteResult;
  try {
    if (module === "IDEAS") result = await hardDeleteIdeaByFolio(folio);
    else if (module === "KAIZEN") result = await hardDeleteKaizenByFolio(folio);
    else result = await hardDeleteGenbaByFolio(folio);
  } catch (error) {
    if (error instanceof HardDeleteNotFoundError) {
      redirect(dataUrl({ error: "no_existe", module, folio }));
    }
    console.error("hardDeleteByFolioAction", { module, folio, error });
    redirect(dataUrl({ error: "operacion", module, folio }));
  }

  revalidateOperationalPaths([module]);
  redirect(dataUrl({
    success: "eliminado",
    module: moduleNames[module],
    folio,
    ...resultParams(result)
  }));
}

export async function purgeOperationalDataAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const modules = formData.getAll("modules").map(String).map(parseModule).filter((value): value is OperationalModule => Boolean(value));
  const confirmation = text(formData, "confirmation").toUpperCase().replace(/\s+/g, " ");

  if (!modules.length) redirect(dataUrl({ error: "seleccion" }));
  if (confirmation !== "ELIMINAR DATOS PROPEX") redirect(dataUrl({ error: "confirmacion_reinicio" }));

  let result: HardDeleteResult;
  try {
    result = await purgeOperationalModules(modules);
  } catch (error) {
    console.error("purgeOperationalDataAction", { modules, error });
    redirect(dataUrl({ error: "operacion_reinicio" }));
  }

  revalidateOperationalPaths(modules);
  redirect(dataUrl({
    success: "reiniciado",
    selected: modules.join(","),
    ...resultParams(result)
  }));
}
