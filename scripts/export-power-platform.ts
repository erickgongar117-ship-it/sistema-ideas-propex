import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

type ExportRow = Record<string, unknown>;

type DatasetDefinition = {
  name: string;
  targetTable: string;
  load: () => Promise<ExportRow[]>;
  omit?: string[];
};

const prisma = new PrismaClient();

function outputArgument() {
  const index = process.argv.indexOf("--out");
  if (index === -1) return null;
  const value = process.argv[index + 1]?.trim();
  if (!value) throw new Error("Debes indicar una carpeta despues de --out.");
  return value;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  return JSON.stringify(value);
}

function sanitizeRow(row: ExportRow, omit: string[] = []) {
  const excluded = new Set(["id", ...omit]);
  const output: ExportRow = { legacyId: row.id };
  for (const [key, value] of Object.entries(row)) {
    if (excluded.has(key)) continue;
    output[key] = normalizeValue(value);
  }
  return output;
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: ExportRow[]) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  if (columns.length === 0) return "\uFEFFlegacyId\r\n";
  const lines = [columns.map(csvEscape).join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function sha256(contents: string) {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

const datasets: DatasetDefinition[] = [
  { name: "users", targetTable: "pbx_userprofile", load: () => prisma.user.findMany({ orderBy: { id: "asc" } }), omit: ["passwordHash"] },
  { name: "plants", targetTable: "pbx_plant", load: () => prisma.plant.findMany({ orderBy: { id: "asc" } }) },
  { name: "areas", targetTable: "pbx_area", load: () => prisma.area.findMany({ orderBy: { id: "asc" } }) },
  { name: "org-units", targetTable: "pbx_orgunit", load: () => prisma.orgUnit.findMany({ orderBy: { id: "asc" } }) },
  { name: "org-memberships", targetTable: "pbx_orgmembership", load: () => prisma.orgMembership.findMany({ orderBy: { id: "asc" } }) },
  { name: "org-escalation-rules", targetTable: "pbx_escalationrule", load: () => prisma.orgEscalationRule.findMany({ orderBy: { id: "asc" } }) },
  { name: "participants", targetTable: "pbx_participant", load: () => prisma.participant.findMany({ orderBy: { id: "asc" } }) },
  { name: "point-rules", targetTable: "pbx_pointrule", load: () => prisma.pointRule.findMany({ orderBy: { id: "asc" } }) },
  { name: "training-programs", targetTable: "pbx_trainingprogram", load: () => prisma.trainingProgram.findMany({ orderBy: { id: "asc" } }) },
  { name: "training-sessions", targetTable: "pbx_trainingsession", load: () => prisma.trainingSession.findMany({ orderBy: { id: "asc" } }) },
  { name: "training-enrollments", targetTable: "pbx_trainingenrollment", load: () => prisma.trainingEnrollment.findMany({ orderBy: { id: "asc" } }) },
  { name: "ideas", targetTable: "pbx_idea", load: () => prisma.idea.findMany({ orderBy: { id: "asc" } }) },
  { name: "idea-support-requests", targetTable: "pbx_ideasupportrequest", load: () => prisma.ideaSupportRequest.findMany({ orderBy: { id: "asc" } }) },
  { name: "idea-followers", targetTable: "pbx_ideafollower", load: () => prisma.ideaFollower.findMany({ orderBy: { id: "asc" } }) },
  { name: "approvals", targetTable: "pbx_approval", load: () => prisma.approval.findMany({ orderBy: { id: "asc" } }) },
  { name: "idea-attachments", targetTable: "pbx_ideaattachment", load: () => prisma.attachment.findMany({ orderBy: { id: "asc" } }) },
  { name: "idea-comments", targetTable: "pbx_ideacomment", load: () => prisma.comment.findMany({ orderBy: { id: "asc" } }) },
  { name: "idea-point-rules", targetTable: "pbx_ideapointrule", load: () => prisma.ideaPointRule.findMany({ orderBy: { id: "asc" } }) },
  { name: "kaizen-projects", targetTable: "pbx_kaizenproject", load: () => prisma.kaizenProject.findMany({ orderBy: { id: "asc" } }) },
  { name: "kaizen-team-members", targetTable: "pbx_kaizenteammember", load: () => prisma.kaizenTeamMember.findMany({ orderBy: { id: "asc" } }) },
  { name: "kaizen-activities", targetTable: "pbx_kaizenactivity", load: () => prisma.kaizenActivity.findMany({ orderBy: { id: "asc" } }) },
  { name: "kaizen-attachments", targetTable: "pbx_kaizenattachment", load: () => prisma.kaizenAttachment.findMany({ orderBy: { id: "asc" } }) },
  { name: "kaizen-updates", targetTable: "pbx_kaizenupdate", load: () => prisma.kaizenUpdate.findMany({ orderBy: { id: "asc" } }) },
  { name: "genba-walks", targetTable: "pbx_genbawalk", load: () => prisma.genbaWalk.findMany({ orderBy: { id: "asc" } }) },
  { name: "genba-activities", targetTable: "pbx_genbaactivity", load: () => prisma.genbaActivity.findMany({ orderBy: { id: "asc" } }) },
  { name: "genba-attachments", targetTable: "pbx_genbaattachment", load: () => prisma.genbaAttachment.findMany({ orderBy: { id: "asc" } }) },
  { name: "genba-updates", targetTable: "pbx_genbaupdate", load: () => prisma.genbaUpdate.findMany({ orderBy: { id: "asc" } }) },
  { name: "coin-transactions", targetTable: "pbx_cointransaction", load: () => prisma.coinTransaction.findMany({ orderBy: { id: "asc" } }) },
  { name: "notification-outbox", targetTable: "pbx_notificationoutbox", load: () => prisma.notificationOutbox.findMany({ orderBy: { id: "asc" } }) },
  { name: "audit-logs", targetTable: "pbx_legacyauditlog", load: () => prisma.auditLog.findMany({ orderBy: { id: "asc" } }) },
  { name: "settings", targetTable: "pbx_setting", load: () => prisma.setting.findMany({ orderBy: { id: "asc" } }) }
];

async function main() {
  const requestedOutput = outputArgument();
  const outputDirectory = path.resolve(requestedOutput ?? path.join("power-platform-migration", "export", timestamp()));
  await mkdir(outputDirectory, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    sourceDatabase: process.env.DATABASE_URL?.startsWith("file:") ? "sqlite" : "postgresql",
    passwordHashesIncluded: false,
    datasets: [] as Array<{ file: string; source: string; targetTable: string; rows: number; sha256: string }>
  };

  for (const dataset of datasets) {
    const sourceRows = await dataset.load();
    const rows = sourceRows.map((row) => sanitizeRow(row, dataset.omit));
    const contents = toCsv(rows);
    const file = `${dataset.name}.csv`;
    await writeFile(path.join(outputDirectory, file), contents, "utf8");
    manifest.datasets.push({ file, source: dataset.name, targetTable: dataset.targetTable, rows: rows.length, sha256: sha256(contents) });
  }

  const manifestContents = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(path.join(outputDirectory, "manifest.json"), manifestContents, "utf8");
  process.stdout.write(`${JSON.stringify({ outputDirectory, datasets: manifest.datasets.length, rows: manifest.datasets.reduce((sum, item) => sum + item.rows, 0) })}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
