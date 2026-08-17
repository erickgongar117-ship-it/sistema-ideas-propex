/**
 * Auditor mecanico de rutas de PROpEx.
 *
 * No arranca la aplicacion ni toca la base: lee el arbol de `src/app` y comprueba, ruta por
 * ruta, las cinco cosas que en las auditorias aparecieron una y otra vez como defecto real.
 *
 *   1. GUARDA        la pagina exige sesion o acceso de modulo.
 *   2. ERROR_URL     alguna accion redirige aqui con `?error=` y la pagina lee `searchParams`.
 *   3. LIMITE        toda `findMany` de la pagina tiene `take`.
 *   4. CARGA/ERROR   existe `loading.tsx` y `error.tsx` en el segmento o en un ancestro.
 *   5. ENLACE        hay al menos un enlace entrante desde la interfaz.
 *
 * Uso:  pnpm run qa:rutas          informe completo
 *       pnpm run qa:rutas --strict sale con codigo 1 si hay defectos bloqueantes
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const APP = join(process.cwd(), "src", "app");
const strict = process.argv.includes("--strict");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const allFiles = walk(APP);
const sourceFiles = walk(join(process.cwd(), "src")).filter((file) => /\.tsx?$/.test(file));
const pageFiles = allFiles.filter((file) => file.endsWith(`${sep}page.tsx`));

/** `src/app/(app)/kaizen/[id]/page.tsx` -> `/kaizen/[id]` */
function routeOf(file: string) {
  const rel = relative(APP, file).replace(new RegExp(`\\${sep}`, "g"), "/").replace(/(^|\/)page\.tsx$/, "");
  const cleaned = rel.replace(/\((?:[^)]+)\)\/?/g, "");
  return (`/${cleaned}`.replace(/\/+$/, "") || "/");
}

/** Rutas publicas por diseno: el QR y el acceso no pueden exigir sesion. */
const PUBLIC_ROUTES = new Set(["/", "/login", "/captura/[code]", "/captura/gracias"]);
/** No versionada a proposito (CLAUDE.md). No es parte del producto. */
const EXCLUDED = new Set(["/calculadora-pollos"]);

/** Busca loading.tsx / error.tsx en el segmento o en cualquier ancestro. */
function hasBoundary(file: string, kind: "loading" | "error") {
  let dir = file.slice(0, file.lastIndexOf(sep));
  while (dir.length >= APP.length) {
    if (allFiles.includes(join(dir, `${kind}.tsx`))) return true;
    dir = dir.slice(0, dir.lastIndexOf(sep));
  }
  return false;
}

const actionsBody = sourceFiles
  .filter((file) => file.includes(`${sep}actions.ts`))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

type Row = {
  route: string;
  guard: boolean;
  errorUrl: "ok" | "falta" | "n/a";
  limit: "ok" | "falta" | "n/a";
  loading: boolean;
  errorBoundary: boolean;
  inbound: boolean;
};

const GUARD = /require(User|KaizenAccess|GenbaAccess|ImprovementManager)|getSession/;

/** La guarda puede vivir en la pagina o en el componente de servidor que renderiza. */
function guardedBody(file: string, body: string) {
  if (GUARD.test(body)) return true;
  const imports = [...body.matchAll(/from "@\/components\/([^"]+)"/g)].map((match) => match[1]);
  return imports.some((name) => {
    const candidate = join(process.cwd(), "src", "components", `${name}.tsx`);
    try {
      return GUARD.test(readFileSync(candidate, "utf8"));
    } catch {
      return false;
    }
  });
}

const rows: Row[] = pageFiles.map((file) => {
  const body = readFileSync(file, "utf8");
  const route = routeOf(file);

  const guard = PUBLIC_ROUTES.has(route) || guardedBody(file, body);

  // Codigos `?error=` que apuntan a esta ruta exacta desde cualquier archivo de acciones.
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\[[^\]]+\\\]/g, "[^`'\"?]+");
  const receivesError = new RegExp(`redirect\\([\`'"]${escaped}[?][^\`'"]*error=`).test(actionsBody);
  const readsSearchParams = /searchParams/.test(body);
  const errorUrl: Row["errorUrl"] = !receivesError ? "n/a" : readsSearchParams ? "ok" : "falta";

  const findManyCount = (body.match(/findMany/g) ?? []).length;
  const takeCount = (body.match(/take:/g) ?? []).length;
  const limit: Row["limit"] = findManyCount === 0 ? "n/a" : takeCount > 0 ? "ok" : "falta";

  // Enlace entrante desde cualquier componente o pagina distinta de la propia.
  const literal = route.replace(/\[[^\]]+\]/g, "");
  const inbound = sourceFiles.some((candidate) => {
    if (candidate === file) return false;
    const text = readFileSync(candidate, "utf8");
    return text.includes(`href="${route}"`) || text.includes(`href={\`${literal}`) || text.includes(`"${route}"`);
  });

  return { route, guard, errorUrl, limit, loading: hasBoundary(file, "loading"), errorBoundary: hasBoundary(file, "error"), inbound };
});

const visible = rows.filter((row) => !EXCLUDED.has(row.route));
visible.sort((left, right) => left.route.localeCompare(right.route, "es-MX"));
rows.length = 0;
rows.push(...visible);

const mark = (ok: boolean) => (ok ? "ok  " : "FALLA");
const cell = (value: "ok" | "falta" | "n/a") => (value === "ok" ? "ok  " : value === "n/a" ? "-   " : "FALLA");

console.log("\nAUDITOR DE RUTAS PROpEx\n");
console.log("ruta".padEnd(34), "guarda", "error-url", "limite", "carga", "error", "enlace");
console.log("-".repeat(92));
for (const row of rows) {
  console.log(
    row.route.padEnd(34),
    mark(row.guard).padEnd(6),
    cell(row.errorUrl).padEnd(9),
    cell(row.limit).padEnd(6),
    mark(row.loading).padEnd(5),
    mark(row.errorBoundary).padEnd(5),
    mark(row.inbound)
  );
}

const sinGuarda = rows.filter((row) => !row.guard);
const sinLimite = rows.filter((row) => row.limit === "falta");
const errorPerdido = rows.filter((row) => row.errorUrl === "falta");
const sinEnlace = rows.filter((row) => !row.inbound);
const sinCarga = rows.filter((row) => !row.loading);
const sinError = rows.filter((row) => !row.errorBoundary);

console.log("\nRESUMEN");
console.log(`  rutas analizadas .................. ${rows.length}`);
console.log(`  sin guarda de sesion ............. ${sinGuarda.length}  ${sinGuarda.map((r) => r.route).join(" ")}`);
console.log(`  consultas sin limite ............. ${sinLimite.length}  ${sinLimite.map((r) => r.route).join(" ")}`);
console.log(`  reciben ?error= y no lo leen ..... ${errorPerdido.length}  ${errorPerdido.map((r) => r.route).join(" ")}`);
console.log(`  sin enlace entrante .............. ${sinEnlace.length}  ${sinEnlace.map((r) => r.route).join(" ")}`);
console.log(`  sin loading.tsx .................. ${sinCarga.length}`);
console.log(`  sin error.tsx .................... ${sinError.length}`);

const bloqueantes = sinGuarda.length + sinLimite.length + errorPerdido.length;
console.log(`\n  defectos bloqueantes ............. ${bloqueantes}\n`);

if (strict && bloqueantes > 0) process.exit(1);
