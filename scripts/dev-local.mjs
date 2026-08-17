/**
 * Arranca `next dev` contra la base SQLite local, ignorando el DATABASE_URL de `.env.local`.
 *
 * Por que existe: `.env.local` apunta a produccion y le gana a `.env`, asi que un `pnpm dev`
 * normal conecta la aplicacion local contra la base real. Eso es peligroso para auditar y
 * para probar. Next carga los `.env*` sin pisar lo que ya esta en `process.env`, asi que
 * fijarlo aqui antes de arrancar es suficiente.
 *
 * Uso:  pnpm run dev:local            (puerto 3001 por omision)
 *       pnpm run dev:local -- -p 3005
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const db = resolve(process.cwd(), "prisma", "dev.db");
if (!existsSync(db)) {
  console.error(`No existe ${db}. Genera la base local con: pnpm run db:push && pnpm run db:seed`);
  process.exit(1);
}

process.env.DATABASE_URL = `file:${db.replace(/\\/g, "/")}`;
const args = process.argv.slice(2);
if (!args.includes("-p") && !args.includes("--port")) args.push("-p", "3001");

// `pnpm run build:vercel` deja el cliente Prisma generado contra el esquema de produccion
// (postgresql). Arrancar despues contra SQLite falla con "the URL must start with the
// protocol postgresql://". Regenerar el cliente local aqui evita esa trampa.
const generate = spawnSync("node", [resolve("node_modules", "prisma", "build", "index.js"), "generate"], {
  stdio: ["ignore", "ignore", "inherit"],
  env: process.env
});
if (generate.status !== 0) {
  console.error("No se pudo generar el cliente Prisma local. Corre: pnpm exec prisma generate");
  process.exit(1);
}

console.log(`base local: ${process.env.DATABASE_URL}`);
const child = spawn("node", [resolve("node_modules", "next", "dist", "bin", "next"), "dev", ...args], {
  stdio: "inherit",
  env: process.env
});
child.on("exit", (code) => process.exit(code ?? 0));
