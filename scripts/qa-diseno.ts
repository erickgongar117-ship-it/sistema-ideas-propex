/**
 * Medidor de calidad visual de PROpEx.
 *
 * "Se ve bien" no es una opinion: en un sistema de diseno es adherencia. Los productos que
 * se ven caros —Monday, Linear, Jira— no usan mejores colores, usan MENOS y siempre los
 * mismos. Este script mide esa disciplina sobre el codigo, de forma repetible.
 *
 * Mide siete cosas, cada una con un umbral justificado:
 *   1. Paleta        colores hex distintos. Un producto usa 12-20, no 100.
 *   2. Hex sueltos   colores escritos dentro de .tsx en vez de tokens.
 *   3. Tipografia    tamanos fuera de la escala declarada.
 *   4. Pesos         pesos fuera de los tres del sistema.
 *   5. Rejilla       espaciados que no caen en la rejilla de 4 px.
 *   6. Radios        radios por encima del maximo de 8 px del proyecto.
 *   7. Sombras       definiciones de sombra distintas. Dos niveles bastan.
 *
 * Uso:  pnpm run qa:diseno            informe
 *       pnpm run qa:diseno --strict   sale con codigo 1 si algo empeora
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const strict = process.argv.includes("--strict");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(join(ROOT, "src"));
const css = readFileSync(join(ROOT, "src", "app", "globals.css"), "utf8");
const tsx = files.filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"));

/** Normaliza #abc a #aabbcc para no contar dos veces el mismo color. */
function expand(hex: string) {
  const value = hex.toLowerCase();
  return value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value;
}

const cssHex = new Set([...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((match) => expand(match[0])));

const tsxHexByFile = new Map<string, Set<string>>();
for (const file of tsx) {
  const body = readFileSync(file, "utf8");
  const found = [...body.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((match) => expand(match[0]));
  if (found.length) tsxHexByFile.set(relative(ROOT, file), new Set(found));
}
const tsxHexTotal = new Set([...tsxHexByFile.values()].flatMap((set) => [...set]));

// --- tipografia: la escala declarada en :root manda ---
const SCALE_PX = new Set([11, 12, 13, 14, 16, 20, 24, 32]);
const fontSizes = new Map<string, number>();
for (const match of css.matchAll(/font-size:\s*([0-9.]+)(px|rem)/g)) {
  const raw = Number(match[1]);
  const px = match[2] === "rem" ? Math.round(raw * 16 * 100) / 100 : raw;
  fontSizes.set(`${px}px`, (fontSizes.get(`${px}px`) ?? 0) + 1);
}
const offScale = [...fontSizes.entries()].filter(([size]) => !SCALE_PX.has(Number(size.replace("px", ""))));

// --- pesos ---
const weights = new Map<string, number>();
for (const match of css.matchAll(/font-weight:\s*(\d{3})/g)) {
  weights.set(match[1], (weights.get(match[1]) ?? 0) + 1);
}
const ALLOWED_WEIGHTS = new Set(["400", "500", "600", "700"]);
const offWeights = [...weights.entries()].filter(([weight]) => !ALLOWED_WEIGHTS.has(weight));

// --- rejilla de 4 px sobre padding y margin en px ---
const offGrid = new Map<string, number>();
for (const match of css.matchAll(/(?:padding|margin)(?:-[a-z]+)?:\s*([^;]+);/g)) {
  for (const token of match[1].split(/\s+/)) {
    const px = /^([0-9.]+)px$/.exec(token);
    if (!px) continue;
    const value = Number(px[1]);
    if (value % 4 !== 0 && value !== 0) offGrid.set(`${value}px`, (offGrid.get(`${value}px`) ?? 0) + 1);
  }
}

// --- radios por encima del maximo del proyecto ---
const bigRadius = new Map<string, number>();
for (const match of css.matchAll(/border-radius:\s*([^;]+);/g)) {
  for (const token of match[1].split(/\s+/)) {
    const px = /^([0-9.]+)px$/.exec(token);
    if (px && Number(px[1]) > 8) bigRadius.set(`${px[1]}px`, (bigRadius.get(`${px[1]}px`) ?? 0) + 1);
  }
}

// --- sombras distintas ---
const shadows = new Set(
  [...css.matchAll(/box-shadow:\s*([^;]+);/g)]
    .map((match) => match[1].trim())
    .filter((value) => value !== "none" && !value.startsWith("var("))
);

const bangs = (css.match(/!important/g) ?? []).length;

type Check = { nombre: string; valor: number; umbral: number; detalle: string };
const checks: Check[] = [
  { nombre: "Colores distintos en globals.css", valor: cssHex.size, umbral: 40, detalle: "Un producto usa 12-20. Cada color extra es una decision que alguien tendra que repetir mal." },
  { nombre: "Archivos .tsx con hex suelto", valor: tsxHexByFile.size, umbral: 0, detalle: [...tsxHexByFile.keys()].slice(0, 6).join(", ") },
  { nombre: "Colores hex distintos en .tsx", valor: tsxHexTotal.size, umbral: 0, detalle: "Deberian venir de tokens; asi no se pueden auditar ni cambiar de tema." },
  { nombre: "Tamanos fuera de la escala", valor: offScale.length, umbral: 0, detalle: offScale.slice(0, 8).map(([size, count]) => `${size}x${count}`).join(" ") },
  { nombre: "Pesos fuera del sistema", valor: offWeights.length, umbral: 0, detalle: offWeights.map(([weight, count]) => `${weight}x${count}`).join(" ") || "ninguno" },
  { nombre: "Espaciados fuera de la rejilla de 4", valor: offGrid.size, umbral: 0, detalle: [...offGrid.entries()].slice(0, 8).map(([size, count]) => `${size}x${count}`).join(" ") },
  { nombre: "Radios por encima de 8px", valor: bigRadius.size, umbral: 0, detalle: [...bigRadius.keys()].join(" ") || "ninguno" },
  { nombre: "Sombras distintas", valor: shadows.size, umbral: 4, detalle: "Dos niveles bastan: tarjeta y capa flotante." },
  { nombre: "Usos de !important", valor: bangs, umbral: 6, detalle: "Cada uno es una regla que peleo con otra." }
];

console.log("\nCALIDAD VISUAL PROpEx — adherencia al sistema de diseno\n");
console.log("medida".padEnd(42), "valor".padStart(6), "umbral".padStart(7), "  estado");
console.log("-".repeat(78));
let failing = 0;
for (const check of checks) {
  const ok = check.valor <= check.umbral;
  if (!ok) failing += 1;
  console.log(check.nombre.padEnd(42), String(check.valor).padStart(6), String(check.umbral).padStart(7), ok ? "  ok" : "  EXCEDE");
  if (!ok && check.detalle) console.log(" ".repeat(4) + check.detalle.slice(0, 150));
}

const score = Math.round(((checks.length - failing) / checks.length) * 100);
console.log(`\n  medidas dentro de umbral: ${checks.length - failing} de ${checks.length}  (${score}%)\n`);

if (strict && failing) process.exit(1);
