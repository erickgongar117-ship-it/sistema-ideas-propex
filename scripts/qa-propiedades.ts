/**
 * Pruebas por propiedades del nucleo puro de PROpEx.
 *
 * En vez de repetir casos escritos a mano, genera cientos de miles de entradas aleatorias y
 * comprueba reglas que NUNCA deben romperse. Si una falla, imprime la entrada exacta que la
 * rompio para poder reproducirla.
 *
 * El generador es determinista (semilla fija): la misma corrida da los mismos casos. Se puede
 * cambiar con  pnpm run qa:propiedades -- --semilla 123 --casos 50000
 */
import { GenbaStatus, IdeaStatus, KaizenStatus, WorkItemStatus } from "@prisma/client";
import { workProgress } from "../src/lib/domain";
import { normalizeEmployeeNumber } from "../src/lib/employee-number";
import { parseFollowUpBulkTarget, serializeFollowUpBulkTarget, type FollowUpBulkTarget } from "../src/lib/follow-up-bulk";
import {
  allocateFollowUpSlots,
  followUpConsumedBeforePage,
  followUpTotalPages,
  FOLLOW_UP_PAGE_SIZE,
  type FollowUpModuleCounts,
  type FollowUpModuleFilter
} from "../src/lib/follow-up-pagination";
import { kaizenClosureReadiness, reconciledKaizenStatus } from "../src/lib/kaizen-closure";
import { validateKaizenStageTransition, KAIZEN_STAGE_ORDER } from "../src/lib/kaizen-transitions";
import {
  genbaStatusCategory,
  ideaStatusCategory,
  kaizenStatusCategory,
  statusCategoryMeta,
  workItemStatusRender
} from "../src/lib/status-system";

const args = process.argv.slice(2);
const readArg = (name: string, fallback: number) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? Number(args[index + 1]) : fallback;
};
const CASES = readArg("casos", 40_000);
let seed = readArg("semilla", 20260816);

/** Congruencial lineal: determinista y suficiente para fuzzing estructural. */
function rnd() {
  seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
  return seed / 4_294_967_296;
}
const int = (max: number) => Math.floor(rnd() * max);
const pick = <T,>(list: readonly T[]) => list[int(list.length)];

let checks = 0;
const failures: Array<{ prop: string; detail: string }> = [];
function check(prop: string, condition: boolean, detail: () => string) {
  checks += 1;
  if (!condition && failures.length < 40) failures.push({ prop, detail: detail() });
}

const MODULES = ["IDEA", "KAIZEN", "GENBA"] as const;
const FILTERS: FollowUpModuleFilter[] = ["TODOS", "IDEA", "KAIZEN", "GENBA"];
const WORK_STATUSES = Object.values(WorkItemStatus);
const KAIZEN_STATUSES = Object.values(KaizenStatus);
const TARGET_KINDS = ["INITIAL", "DEPARTMENT", "SUPPORT", "IMPLEMENTATION"] as const;

// ---------------------------------------------------------------- paginacion
for (let i = 0; i < CASES; i += 1) {
  const counts: FollowUpModuleCounts = {
    IDEA: int(2_000),
    KAIZEN: int(300),
    GENBA: int(300)
  };
  const filter = pick(FILTERS);
  // Se prueba el limite real y tambien limites pequenos, para exponer casos de borde.
  const limit = rnd() < 0.8 ? FOLLOW_UP_PAGE_SIZE : 1 + int(6);
  const slots = allocateFollowUpSlots(counts, filter, limit);
  const total = MODULES.reduce((sum, key) => sum + slots[key], 0);
  const show = () => `counts=${JSON.stringify(counts)} filtro=${filter} limite=${limit} slots=${JSON.stringify(slots)}`;

  // El limite manda, salvo cuando es menor que el numero de fuentes con datos: ahi prevalece
  // no dejar registros inalcanzables, y la pagina puede traer una fila por fuente.
  const activeCount = MODULES.filter((key) => counts[key] > 0).length;
  check("P1 la pagina nunca excede el limite", total <= Math.max(limit, activeCount), show);
  check("P2 nunca se piden mas registros de los que hay", MODULES.every((key) => slots[key] <= counts[key]), show);
  check("P3 los espacios nunca son negativos", MODULES.every((key) => slots[key] >= 0), show);
  if (filter !== "TODOS") {
    check("P4 el filtro de modulo apaga los demas", MODULES.every((key) => key === filter || slots[key] === 0), show);
  }
  if (filter === "TODOS" && counts.IDEA + counts.KAIZEN + counts.GENBA > 0) {
    check("P5 con datos la pagina nunca sale vacia", total > 0, show);
  }
  if (filter === "TODOS" && counts.IDEA + counts.KAIZEN + counts.GENBA >= limit && limit >= activeCount) {
    check("P6 con datos de sobra la pagina se llena", total === limit, show);
  }

  const pages = followUpTotalPages(counts, slots);
  check("P7 siempre hay al menos una pagina", pages >= 1, show);
  check(
    "P8 todo registro cabe en alguna pagina",
    MODULES.every((key) => (slots[key] > 0 ? pages * slots[key] >= counts[key] : true)),
    () => `${show()} paginas=${pages}`
  );
  check(
    "P9 ningun modulo con datos queda sin espacio",
    MODULES.every((key) => counts[key] === 0 || slots[key] > 0 || (filter !== "TODOS" && key !== filter)),
    () => `${show()} paginas=${pages}`
  );

  const page = 1 + int(Math.min(pages, 40));
  const consumed = followUpConsumedBeforePage(counts, slots, page);
  const consumedNext = followUpConsumedBeforePage(counts, slots, page + 1);
  check("P10 el consumo previo no retrocede", consumedNext >= consumed, () => `${show()} pagina=${page}`);
  check("P11 el consumo nunca supera el total", consumed <= counts.IDEA + counts.KAIZEN + counts.GENBA, () => `${show()} pagina=${page}`);
  check("P12 la primera pagina no consume nada", followUpConsumedBeforePage(counts, slots, 1) === 0, show);
}

// ------------------------------------------------- destinos serializados del lote
for (let i = 0; i < CASES; i += 1) {
  const iso = () => new Date(Date.UTC(2020 + int(10), int(12), 1 + int(28), int(24), int(60), int(60))).toISOString();
  const target: FollowUpBulkTarget = {
    kind: pick(TARGET_KINDS),
    targetId: `c${int(1e9).toString(36)}`,
    expectedTargetUpdatedAt: iso(),
    expectedIdeaUpdatedAt: iso(),
    ...(rnd() < 0.5 ? { expectedRelatedUpdatedAt: iso() } : {})
  };
  const round = parseFollowUpBulkTarget(serializeFollowUpBulkTarget(target));
  check("P13 el destino sobrevive ida y vuelta", JSON.stringify(round) === JSON.stringify(target), () => JSON.stringify({ target, round }));

  // Basura: nunca debe lanzar, y solo debe aceptar lo que cumple el formato.
  const garbage = [
    "", "|", "INITIAL", `INITIAL|x|${iso()}`, `NOPE|x|${iso()}|${iso()}`,
    `INITIAL||${iso()}|${iso()}`, `INITIAL|x|no-es-fecha|${iso()}`,
    `INITIAL|x|${iso()}|${iso()}|${iso()}|extra`
  ][int(8)];
  let threw = false;
  let parsed: FollowUpBulkTarget | null = null;
  try { parsed = parseFollowUpBulkTarget(garbage); } catch { threw = true; }
  check("P14 la basura no revienta el parser", !threw, () => `entrada=${JSON.stringify(garbage)}`);
  check(
    "P15 la basura no se acepta como destino valido",
    parsed === null || (TARGET_KINDS as readonly string[]).includes(parsed.kind),
    () => `entrada=${JSON.stringify(garbage)} parsed=${JSON.stringify(parsed)}`
  );
}

// -------------------------------------------------- transiciones de etapa Kaizen
for (let i = 0; i < CASES; i += 1) {
  const from = pick(KAIZEN_STATUSES);
  const to = pick(KAIZEN_STATUSES);
  const context = { hasCharter: rnd() < 0.5, activityCount: int(4) };
  const result = validateKaizenStageTransition(from, to, context);
  const show = () => `${from} -> ${to} ctx=${JSON.stringify(context)} => ${JSON.stringify(result)}`;

  if (from !== to) {
    check("P16 un Kaizen cerrado no se reabre", !(["COMPLETADO", "CANCELADO"].includes(from) && result.ok), show);
    check("P17 arrastrar nunca completa ni cancela", !(["COMPLETADO", "CANCELADO"].includes(to) && result.ok), show);
    if (from === "PENDIENTE_CHARTER" && to === "PLANIFICACION" && !context.hasCharter) {
      check("P18 sin Charter no se planifica", !result.ok, show);
    }
    if (from === "PLANIFICACION" && to === "EN_CURSO" && context.activityCount < 1) {
      check("P19 sin actividades no se inicia", !result.ok, show);
    }
  }
  check("P20 toda etapa del flujo esta en el orden canonico", KAIZEN_STAGE_ORDER.includes(from), show);
}

// ------------------------------------------------------- cierre y conciliacion
for (let i = 0; i < CASES; i += 1) {
  const activities = Array.from({ length: int(8) }, () => ({
    status: pick(WORK_STATUSES) as string,
    evidenceCount: int(3)
  }));
  const input = { activities, hasCharter: rnd() < 0.5, teamCount: int(3) };
  const readiness = kaizenClosureReadiness(input);
  const show = () => JSON.stringify(input);
  const relevant = activities.filter((activity) => activity.status !== "COMBINADA");

  if (readiness.ready) {
    check("P21 listo implica toda actividad resuelta", relevant.every((a) => a.status === "COMPLETADA" || a.status === "CANCELADA"), show);
    check("P22 listo implica al menos un resultado real", relevant.some((a) => a.status === "COMPLETADA"), show);
    check("P23 listo implica evidencia en cada completada", relevant.filter((a) => a.status === "COMPLETADA").every((a) => a.evidenceCount > 0), show);
    check("P24 listo implica Charter y equipo", input.hasCharter && input.teamCount > 0, show);
  }
  if (relevant.length === 0) check("P25 sin actividades vigentes nunca esta listo", !readiness.ready, show);

  const current = pick(KAIZEN_STATUSES);
  const next = reconciledKaizenStatus(current, readiness.ready);
  check("P26 un proyecto cerrado no cambia solo", !(["COMPLETADO", "CANCELADO"].includes(current) && next !== current), () => `${current} -> ${next}`);
  if (!readiness.ready) check("P27 sin requisitos no se cierra solo", next === current, () => `${current} -> ${next} ${show()}`);
}

// ------------------------------------------------------------------- avance
for (let i = 0; i < CASES; i += 1) {
  const items = Array.from({ length: int(12) }, () => ({ status: pick(WORK_STATUSES) }));
  const progress = workProgress(items);
  const show = () => JSON.stringify(items.map((item) => item.status));
  check("P28 el avance vive entre 0 y 100", progress.percent >= 0 && progress.percent <= 100, show);
  check("P29 lo cerrado nunca excede el total", progress.closed <= progress.total, show);
  check("P30 abierto mas cerrado es el total", progress.open + progress.closed === progress.total, show);
  check("P31 las combinadas no cuentan", progress.total === items.filter((item) => item.status !== "COMBINADA").length, show);
  check("P32 sin actividades el avance es cero", progress.total > 0 || progress.percent === 0, show);
}

// -------------------------------------------------------- numero de empleado
for (let i = 0; i < CASES; i += 1) {
  const raw = rnd() < 0.7 ? String(int(100_000)) : pick(["", "  ", "abc", "0", "00000", "123456", "-1", "1.5", " 42 "]);
  let value: string | null = null;
  let rejected = false;
  try { value = normalizeEmployeeNumber(raw); } catch { rejected = true; }
  const show = () => `entrada=${JSON.stringify(raw)} salida=${JSON.stringify(value)} rechazado=${rejected}`;
  if (!rejected && value !== null) {
    check("P33 el numero siempre queda a cinco digitos", /^\d{5}$/.test(value), show);
    check("P34 el cero absoluto nunca se acepta", value !== "00000", show);
    let again: string | null = null;
    try { again = normalizeEmployeeNumber(value); } catch { again = "LANZO"; }
    check("P35 normalizar dos veces da lo mismo", again === value, show);
  }
}

// ------------------------------------------- cobertura exhaustiva del catalogo
for (const status of Object.values(IdeaStatus)) {
  check("P36 toda etapa de Idea tiene categoria", Boolean(statusCategoryMeta[ideaStatusCategory(status)]), () => status);
}
for (const status of Object.values(KaizenStatus)) {
  check("P37 toda etapa de Kaizen tiene categoria", Boolean(statusCategoryMeta[kaizenStatusCategory(status)]), () => status);
}
for (const status of Object.values(GenbaStatus)) {
  check("P38 toda etapa de GENBA tiene categoria", Boolean(statusCategoryMeta[genbaStatusCategory(status)]), () => status);
}
for (const status of Object.values(WorkItemStatus)) {
  const render = workItemStatusRender(status);
  check("P39 toda actividad tiene categoria y etiqueta", Boolean(statusCategoryMeta[render.category] && render.label), () => status);
  check("P40 solo COMBINADA es referencia", Boolean(render.reference) === (status === "COMBINADA"), () => status);
}

// ------------------------------------------------------------------ informe
const grouped = new Map<string, number>();
for (const failure of failures) grouped.set(failure.prop, (grouped.get(failure.prop) ?? 0) + 1);

console.log(`\nPRUEBAS POR PROPIEDADES — semilla ${readArg("semilla", 20260816)}, ${CASES.toLocaleString("es-MX")} casos por familia`);
console.log(`comprobaciones ejecutadas: ${checks.toLocaleString("es-MX")}\n`);

if (!failures.length) {
  console.log("Ninguna propiedad se rompio.\n");
  process.exit(0);
}

console.log(`PROPIEDADES ROTAS: ${grouped.size}\n`);
for (const [prop, count] of grouped) {
  console.log(`  ${prop}  (${count} caso${count === 1 ? "" : "s"})`);
  console.log(`    ejemplo: ${failures.find((failure) => failure.prop === prop)?.detail}\n`);
}
process.exit(1);
