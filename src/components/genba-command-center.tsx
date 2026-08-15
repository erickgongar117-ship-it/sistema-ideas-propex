"use client";

import type { GenbaStatus, WorkItemStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { OperationsWorkboard, type WorkboardItem } from "@/components/operations-workboard";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { genbaStatusLabels, workItemStatusLabels } from "@/lib/domain";

const DAY = 86_400_000;

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

const statusColors: Record<GenbaStatus, string> = { ABIERTO: "#579bfc", CERRADO: "#00a878", CANCELADO: "#676879" };
const activityColors: Record<WorkItemStatus, string> = {
  PENDIENTE: "#c4c4c4", EN_PROCESO: "#579bfc", BLOQUEADA: "#e2445c", COMPLETADA: "#00a878", CANCELADA: "#676879", COMBINADA: "#784bd1"
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
  const visible = useMemo(() => period === "all" ? walks : walks.filter((walk) => new Date(walk.visitDate).getTime() >= now.getTime() - Number(period) * DAY), [now, period, walks]);
  const items: WorkboardItem[] = visible.map((walk) => {
    const progress = activityProgress(walk.activities);
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
      groupColor: statusColors[walk.status],
      statusLabel: genbaStatusLabels[walk.status],
      statusColor: statusColors[walk.status],
      owner: walk.coordinatorName,
      location: walk.areaName,
      dueDate: walk.visitDate,
      progress: progress.percent,
      progressLabel: `${progress.closed} de ${progress.total} actividades cerradas`,
      risk: alerts.length > 0 && walk.status === "ABIERTO",
      riskLabel: alerts.join(" · "),
      tags: [`Asistencia ${walk.expectedDepartments ? Math.round((walk.attendedDepartments / walk.expectedDepartments) * 100) : 0}%`, walk.activities.some((activity) => activity.promotedToKaizen) ? "Con conversion Kaizen" : ""].filter(Boolean),
      children: walk.activities.filter((activity) => activity.status !== "COMBINADA").map((activity) => ({
        id: activity.id,
        label: activity.action ?? activity.problem,
        status: activity.status,
        statusLabel: workItemStatusLabels[activity.status],
        owner: activity.ownerName ?? "Sin asignar",
        dueDate: activity.dueDate,
        tone: activityColors[activity.status]
      }))
    };
  });
  const activities = visible.flatMap((walk) => walk.activities).filter((activity) => activity.status !== "COMBINADA");
  const completed = activities.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  const overdue = activities.filter((activity) => activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  const attendanceRows = visible.filter((walk) => walk.expectedDepartments);
  const attendance = attendanceRows.length ? Math.round(attendanceRows.reduce((sum, walk) => sum + (walk.attendedDepartments / walk.expectedDepartments) * 100, 0) / attendanceRows.length) : 0;

  return <OperationsWorkboard
    items={items}
    locationLabel="Area visitada"
    primaryLabel="Recorridos"
    metrics={[
      { label: "Recorridos visibles", value: visible.length, detail: `${visible.filter((walk) => walk.status === "ABIERTO").length} abiertos`, color: "#579bfc" },
      { label: "Avance de acciones", value: `${activities.length ? Math.round((completed / activities.length) * 100) : 0}%`, detail: `${completed} de ${activities.length} cerradas`, color: "#00a878" },
      { label: "Acciones vencidas", value: overdue, detail: "Compromisos fuera de fecha", color: "#e2445c" },
      { label: "Asistencia", value: `${attendance}%`, detail: "Cumplimiento de areas convocadas", color: "#fdab3d" }
    ]}
  />;
}
