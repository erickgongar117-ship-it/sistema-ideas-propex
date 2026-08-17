"use client";

import type { GenbaStatus, WorkItemStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { OperationsWorkboard, type WorkboardGroupDefinition, type WorkboardItem } from "@/components/operations-workboard";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { genbaStatusLabels, workItemStatusLabels } from "@/lib/domain";
import { genbaStatusCategory, statusCategoryFill, workItemStatusRender } from "@/lib/status-system";

const DAY = 86_400_000;

/** Orden de flujo del recorrido; sin esto los grupos salen por orden de llegada. */
const GENBA_GROUPS: WorkboardGroupDefinition[] = (["ABIERTO", "CERRADO", "CANCELADO"] as GenbaStatus[])
  .map((key) => ({ key, label: genbaStatusLabels[key], color: statusCategoryFill(genbaStatusCategory(key)) }));

export type GenbaDashboardActivity = {
  id: string;
  number: number;
  problem: string;
  action: string | null;
  ownerName: string | null;
  dueDate: string | null;
  status: WorkItemStatus;
  closedAt: string | null;
  createdAt: string;
  promotedToKaizen: boolean;
};

export type GenbaDashboardWalk = {
  id: string;
  number: number;
  folio: string;
  areaName: string;
  visitDate: string;
  status: GenbaStatus;
  coordinatorName: string;
  expectedDepartments: number;
  attendedDepartments: number;
  createdAt: string;
  closedAt: string | null;
  activities: GenbaDashboardActivity[];
};

function activityProgress(activities: GenbaDashboardActivity[]) {
  const relevant = activities.filter((activity) => activity.status !== "COMBINADA");
  const closed = relevant.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  return { total: relevant.length, closed, percent: relevant.length ? Math.round((closed / relevant.length) * 100) : 0 };
}

export function GenbaCommandCenter({ walks, generatedAt }: { walks: GenbaDashboardWalk[]; generatedAt: string }) {
  const [period, setPeriod] = useState<WorkspacePeriod>("90");
  useEffect(() => {
    const stored = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (["30", "90", "365", "all"].includes(stored ?? "")) setPeriod(stored as WorkspacePeriod);
    const onChange = (event: Event) => setPeriod((event as CustomEvent<WorkspacePeriod>).detail);
    window.addEventListener(WORKSPACE_PERIOD_EVENT, onChange);
    return () => window.removeEventListener(WORKSPACE_PERIOD_EVENT, onChange);
  }, []);

  const now = useMemo(() => new Date(generatedAt), [generatedAt]);
  const visible = useMemo(() => {
    if (period === "all") return walks;
    const start = now.getTime() - Number(period) * DAY;
    return walks.filter((walk) => walk.status === "ABIERTO" || new Date(walk.visitDate).getTime() >= start || Boolean(walk.closedAt && new Date(walk.closedAt).getTime() >= start));
  }, [now, period, walks]);
  const items: WorkboardItem[] = visible.map((walk) => {
    const progress = activityProgress(walk.activities);
    const statusCategory = genbaStatusCategory(walk.status);
    const overdue = walk.activities.filter((activity) => activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status)).length;
    const blocked = walk.activities.filter((activity) => activity.status === "BLOQUEADA").length;
    const unassigned = walk.activities.filter((activity) => !activity.ownerName && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status)).length;
    const alerts = [overdue ? `${overdue} vencidas` : "", blocked ? `${blocked} bloqueadas` : "", unassigned ? `${unassigned} sin responsable` : ""].filter(Boolean);
    return {
      id: walk.id,
      href: `/genba/${walk.id}`,
      code: walk.folio,
      title: walk.areaName,
      subtitle: `${walk.activities.length} actividades · Coordinacion ${walk.coordinatorName}`,
      group: walk.status,
      groupLabel: genbaStatusLabels[walk.status],
      groupColor: statusCategoryFill(statusCategory),
      statusLabel: genbaStatusLabels[walk.status],
      statusCategory,
      owner: walk.coordinatorName,
      location: walk.areaName,
      dueDate: walk.visitDate,
      progress: progress.percent,
      progressLabel: `${progress.closed} de ${progress.total} actividades cerradas`,
      risk: alerts.length > 0 && walk.status === "ABIERTO",
      riskLabel: alerts.join(" · "),
      tags: [`Asistencia ${walk.expectedDepartments ? Math.min(100, Math.round((walk.attendedDepartments / walk.expectedDepartments) * 100)) : 0}%`, walk.activities.some((activity) => activity.promotedToKaizen) ? "Con conversion Kaizen" : ""].filter(Boolean),
      children: walk.activities.filter((activity) => activity.status !== "COMBINADA").map((activity) => {
        const activityStatus = workItemStatusRender(activity.status);
        return {
          id: activity.id,
          label: activity.action ?? activity.problem,
          status: activity.status,
          statusLabel: workItemStatusLabels[activity.status],
          owner: activity.ownerName ?? "Sin asignar",
          dueDate: activity.dueDate,
          statusCategory: activityStatus.category,
          statusReference: activityStatus.reference
        };
      })
    };
  });
  const activities = visible.flatMap((walk) => walk.activities).filter((activity) => activity.status !== "COMBINADA");
  const completed = activities.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  const overdue = activities.filter((activity) => activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  const attendanceRows = visible.filter((walk) => walk.expectedDepartments);
  const attendance = attendanceRows.length ? Math.min(100, Math.round(attendanceRows.reduce((sum, walk) => sum + Math.min(1, walk.attendedDepartments / walk.expectedDepartments) * 100, 0) / attendanceRows.length)) : 0;

  return <OperationsWorkboard
    groupDefinitions={GENBA_GROUPS}
    items={items}
    locationLabel="Area visitada"
    primaryLabel="Recorridos"
    metrics={[
      { label: "Recorridos visibles", value: visible.length, detail: `${visible.filter((walk) => walk.status === "ABIERTO").length} abiertos`, color: "var(--time-soon)" },
      { label: "Avance de acciones", value: `${activities.length ? Math.round((completed / activities.length) * 100) : 0}%`, detail: `${completed} de ${activities.length} cerradas`, color: "var(--time-planned)" },
      { label: "Acciones vencidas", value: overdue, detail: "Compromisos fuera de fecha", color: "var(--time-overdue)" },
      { label: "Asistencia", value: `${attendance}%`, detail: "Cumplimiento de areas convocadas", color: "var(--time-today)" }
    ]}
  />;
}
