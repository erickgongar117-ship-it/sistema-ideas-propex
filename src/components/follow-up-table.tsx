import type { WorkItemStatus } from "@prisma/client";
import {
  OperationsWorkboard,
  type WorkboardBulkAction,
  type WorkboardItem,
  type WorkboardMetric
} from "@/components/operations-workboard";
import { bulkFollowUpAction } from "@/app/actions";
import { workItemStatusRender, type StatusCategory } from "@/lib/status-system";

export type FollowUpModule = "IDEA" | "KAIZEN" | "GENBA";

export type FollowUpChild = {
  id: string;
  label: string;
  status: WorkItemStatus;
  statusLabel: string;
  owner: string;
  dueDate: Date | null;
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
  statusCategory: StatusCategory;
  href: string;
  dueDate: Date | null;
  updatedAt: Date;
  overdue: boolean;
  bulkEntityId?: string;
  bulkActions?: WorkboardBulkAction[];
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

const urgencyOrder = ["overdue", "today", "soon", "planned", "no-date"];

function urgency(row: FollowUpRow, now: Date) {
  if (row.overdue) return { key: "overdue", label: "Vencidos", color: "var(--time-overdue)" };
  if (!row.dueDate) return { key: "no-date", label: "Sin fecha compromiso", color: "var(--time-none)" };

  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const endSoon = new Date(endToday);
  endSoon.setDate(endSoon.getDate() + 7);
  if (row.dueDate.getTime() <= endToday.getTime()) return { key: "today", label: "Para hoy", color: "var(--time-today)" };
  if (row.dueDate.getTime() <= endSoon.getTime()) return { key: "soon", label: "Proximos 7 dias", color: "var(--time-soon)" };
  return { key: "planned", label: "Programados", color: "var(--time-planned)" };
}

export function FollowUpTable({
  rows,
  totalRows,
  emptyTitle,
  emptyDescription
}: {
  rows: FollowUpRow[];
  totalRows?: number;
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
      statusCategory: row.statusCategory,
      owner: row.owner,
      location: row.location,
      dueDate: row.dueDate?.toISOString() ?? null,
      progress: row.progress?.percent ?? null,
      progressLabel: row.progress
        ? `${row.progress.completed} de ${row.progress.total} actividades completadas`
        : `Etapa: ${row.status}`,
      risk: row.overdue,
      riskLabel: row.overdue ? "Fecha compromiso vencida" : undefined,
      tags: [moduleLabel, row.status, row.assignment],
      bulkEntityId: row.bulkEntityId,
      bulkActions: row.bulkActions,
      children: row.children?.map((child) => {
        const childStatus = workItemStatusRender(child.status);
        return {
          id: child.id,
          label: child.label,
          status: child.status,
          statusLabel: child.statusLabel,
          owner: child.owner,
          dueDate: child.dueDate?.toISOString() ?? null,
          statusCategory: childStatus.category,
          statusReference: childStatus.reference
        };
      })
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
    { label: "En esta vista", value: totalRows ?? rows.length, detail: "Registros dentro de tu alcance", color: "var(--brand-black)" },
    { label: "Vencidos", value: rows.filter((row) => row.overdue).length, detail: "Requieren una decision o nueva fecha", color: "var(--time-overdue)" },
    { label: "Proximos 7 dias", value: dueSoon, detail: "Compromisos cercanos", color: "var(--time-today)" },
    { label: "Avance medio", value: `${averageProgress}%`, detail: "Kaizen y GENBA con actividades", color: "var(--time-planned)" }
  ];

  return (
    <OperationsWorkboard
      clientPagination={false}
      emptyLabel={`${emptyTitle}. ${emptyDescription}`}
      items={items}
      locationLabel="Planta y area"
      metrics={metrics}
      onBulkAction={bulkFollowUpAction}
      primaryLabel="Trabajo"
    />
  );
}
