import { OperationsWorkboard, type WorkboardItem, type WorkboardMetric } from "@/components/operations-workboard";

export type FollowUpModule = "IDEA" | "KAIZEN" | "GENBA";
export type FollowUpTone = "amber" | "blue" | "green" | "red" | "slate" | "violet";

export type FollowUpChild = {
  id: string;
  label: string;
  status: string;
  statusLabel: string;
  owner: string;
  dueDate: Date | null;
  tone: FollowUpTone;
};

export type FollowUpRow = {
  key: string;
  module: FollowUpModule;
  reference: string;
  title: string;
  subtitle: string;
  location: string;
  assignment: string;
  owner: string;
  status: string;
  statusTone: FollowUpTone;
  href: string;
  dueDate: Date | null;
  updatedAt: Date;
  overdue: boolean;
  progress?: {
    completed: number;
    total: number;
    percent: number;
  };
  children?: FollowUpChild[];
};

const moduleLabels: Record<FollowUpModule, string> = {
  IDEA: "Idea",
  KAIZEN: "Kaizen",
  GENBA: "GENBA"
};

const toneColors: Record<FollowUpTone, string> = {
  amber: "#fdab3d",
  blue: "#579bfc",
  green: "#00a86b",
  red: "#e2445c",
  slate: "#7f8c8d",
  violet: "#a25ddc"
};

const urgencyOrder = ["overdue", "today", "soon", "planned", "no-date"];

function urgency(row: FollowUpRow, now: Date) {
  if (row.overdue) return { key: "overdue", label: "Vencidos", color: "#e2445c" };
  if (!row.dueDate) return { key: "no-date", label: "Sin fecha compromiso", color: "#a5adba" };

  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const endSoon = new Date(endToday);
  endSoon.setDate(endSoon.getDate() + 7);
  if (row.dueDate.getTime() <= endToday.getTime()) return { key: "today", label: "Para hoy", color: "#fdab3d" };
  if (row.dueDate.getTime() <= endSoon.getTime()) return { key: "soon", label: "Proximos 7 dias", color: "#579bfc" };
  return { key: "planned", label: "Programados", color: "#00a86b" };
}

export function FollowUpTable({
  rows,
  emptyTitle,
  emptyDescription
}: {
  rows: FollowUpRow[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const now = new Date();
  const items: WorkboardItem[] = rows.map((row) => {
    const group = urgency(row, now);
    const moduleLabel = moduleLabels[row.module];
    return {
      id: row.key,
      href: row.href,
      code: row.reference,
      title: row.title,
      subtitle: `${moduleLabel} · ${row.assignment} · ${row.subtitle}`,
      group: group.key,
      groupLabel: group.label,
      groupColor: group.color,
      statusLabel: row.status,
      statusColor: toneColors[row.statusTone],
      owner: row.owner,
      location: row.location,
      dueDate: row.dueDate?.toISOString() ?? null,
      progress: row.progress?.percent ?? 0,
      progressLabel: row.progress
        ? `${row.progress.completed} de ${row.progress.total} actividades completadas`
        : "Seguimiento por etapa",
      risk: row.overdue,
      riskLabel: row.overdue ? "Fecha compromiso vencida" : undefined,
      tags: [moduleLabel, row.status, row.assignment],
      children: row.children?.map((child) => ({
        id: child.id,
        label: child.label,
        status: child.status,
        statusLabel: child.statusLabel,
        owner: child.owner,
        dueDate: child.dueDate?.toISOString() ?? null,
        tone: toneColors[child.tone]
      }))
    };
  }).sort((left, right) => urgencyOrder.indexOf(left.group) - urgencyOrder.indexOf(right.group));

  const activeWithProgress = rows.filter((row) => row.progress);
  const averageProgress = activeWithProgress.length
    ? Math.round(activeWithProgress.reduce((sum, row) => sum + (row.progress?.percent ?? 0), 0) / activeWithProgress.length)
    : 0;
  const dueSoon = rows.filter((row) => {
    if (!row.dueDate || row.overdue) return false;
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 7);
    return row.dueDate.getTime() <= limit.getTime();
  }).length;
  const metrics: WorkboardMetric[] = [
    { label: "En esta vista", value: rows.length, detail: "Registros dentro de tu alcance", color: "#171717" },
    { label: "Vencidos", value: rows.filter((row) => row.overdue).length, detail: "Requieren una decision o nueva fecha", color: "#e2445c" },
    { label: "Proximos 7 dias", value: dueSoon, detail: "Compromisos cercanos", color: "#fdab3d" },
    { label: "Avance medio", value: `${averageProgress}%`, detail: "Kaizen y GENBA con actividades", color: "#00a86b" }
  ];

  return (
    <OperationsWorkboard
      emptyLabel={`${emptyTitle}. ${emptyDescription}`}
      items={items}
      locationLabel="Planta y area"
      metrics={metrics}
      primaryLabel="Trabajo"
    />
  );
}
