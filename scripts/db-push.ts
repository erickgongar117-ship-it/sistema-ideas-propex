import { spawnSync } from "child_process";
import path from "path";

function prismaCli() {
  return path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
}

function run(args: string[], input?: string) {
  return spawnSync(process.execPath, [prismaCli(), ...args], {
    cwd: process.cwd(),
    env: process.env,
    input,
    encoding: "utf8",
    shell: false
  });
}

function print(result: ReturnType<typeof run>) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function toIdempotentSql(sql: string) {
  return sql
    .replaceAll("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
    .replaceAll("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ");
}

function schemaPath() {
  const cliIndex = process.argv.findIndex((arg) => arg === "--schema");
  if (cliIndex >= 0 && process.argv[cliIndex + 1]) return process.argv[cliIndex + 1];
  return process.env.PRISMA_SCHEMA || "prisma/schema.prisma";
}

const schema = schemaPath();
const schemaArgs = ["--schema", schema];
const direct = run(["db", "push", ...schemaArgs]);
if (direct.status === 0) {
  print(direct);
  process.exit(0);
}

print(direct);
console.warn("Prisma db push fallo; aplicando fallback via migrate diff + db execute.");

const diff = run(["migrate", "diff", "--from-empty", "--to-schema-datamodel", schema, "--script"]);
if (diff.status !== 0 || !diff.stdout) {
  print(diff);
  process.exit(diff.status ?? 1);
}

const execute = run(["db", "execute", ...schemaArgs, "--stdin"], toIdempotentSql(diff.stdout));
print(execute);
if (execute.status !== 0) {
  process.exit(execute.status ?? 1);
}

const generate = run(["generate", ...schemaArgs]);
print(generate);
process.exit(generate.status ?? 0);
