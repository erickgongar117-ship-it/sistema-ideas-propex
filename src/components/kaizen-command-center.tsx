"use client";

import type { KaizenStatus, WorkItemStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { changeKaizenStageAction } from "@/app/actions";
import {
  OperationsWorkboard,
  type WorkboardGroupDefinition,
  type WorkboardItem,
  type WorkboardMoveInput,
  type WorkboardMoveResult
} from "@/components/operations-workboard";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { kaizenStatusLabels, workItemStatusLabels } from "@/lib/domain";
import { KAIZEN_STAGE_ORDER, kaizenAllowedStageTargets } from "@/lib/kaizen-transitions";
import { kaizenStatusCategory, statusCategoryFill, workItemStatusRender } from "@/lib/status-system";

const DAY = 86_400_000;

export type KaizenDashboardActivity = {
  id: string;
  number: number;
  action: string;
  ownerName: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: WorkItemStatus;
  closedAt: string | null;
  createdAt: string;
};

export type KaizenDashboardProject = {
  id: string;
  number: number;
  folio: string;
  title: string;
  plant: string | null;
  area: string;
  objective: string;
  status: KaizenStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  leaderName: string;
  sourceIdeaFolio: string | null;
  estimatedSavings: number;
  realSavings: number;
  hasCharter: boolean;
  activities: KaizenDashboardActivity[];
};

function progress(activities: KaizenDashboardActivity[]) {
  const relevant = activities.filter((activity) => activity.status !== "COMBINADA");
  const closed = relevant.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  return { closed, total: relevant.length, percent: relevant.length ? Math.round((closed / relevant.length) * 100) : 0 };
}

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);
}

const KAIZEN_GROUPS: WorkboardGroupDefinition[] = KAIZEN_STAGE_ORDER.map((status) => ({
  key: status,
  label: kaizenStatusLabels[status],
  color: statusCategoryFill(kaizenStatusCategory(status))
}));

export function KaizenCommandCenter({
  projects,
  generatedAt,
  canManage
}: {
  projects: KaizenDashboardProject[];
  generatedAt: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<WorkspacePeriod>("90");
  const [liveProjects, setLiveProjects] = useState(projects);

  useEffect(() => {
    setLiveProjects(projects);
  }, [projects]);

  useEffect(() => {
    const stored = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (["30", "90", "365", "all"].includes(stored ?? "")) setPeriod(stored as WorkspacePeriod);
    const onChange = (event: Event) => setPeriod((event as CustomEvent<WorkspacePeriod>).detail);
    window.addEventListener(WORKSPACE_PERIOD_EVENT, onChange);
    return () => window.removeEventListener(WORKSPACE_PERIOD_EVENT, onChange);
  }, []);

  const now = useMemo(() => new Date(generatedAt), [generatedAt]);
  const visible = useMemo(() => {
    if (period === "all") return liveProjects;
    const start = now.getTime() - Number(period) * DAY;
    return liveProjects.filter((project) => ["PENDIENTE_CHARTER", "PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status) || new Date(project.updatedAt).getTime() >= start);
  }, [liveProjects, now, period]);

  const items: WorkboardItem[] = visible.map((project) => {
    const projectProgress = progress(project.activities);
    const statusCategory = kaizenStatusCategory(project.status);
    const overdue = project.activities.filter((activity) => activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status)).length;
    const blocked = project.activities.filter((activity) => activity.status === "BLOQUEADA").length;
    const charterPending = !project.hasCharter || project.status === "PENDIENTE_CHARTER";
    const alerts = [charterPending ? "Charter pendiente" : "", overdue ? `${overdue} vencidas` : "", blocked ? `${blocked} bloqueadas` : ""].filter(Boolean);
    return {
      id: project.id,
      href: `/kaizen/${project.id}`,
      code: `K-${String(project.number).padStart(3, "0")}`,
      title: project.title,
      subtitle: project.objective,
      group: project.status,
      groupLabel: kaizenStatusLabels[project.status],
      groupColor: statusCategoryFill(statusCategory),
      statusLabel: kaizenStatusLabels[project.status],
      statusCategory,
      owner: project.leaderName,
      location: project.plant ?? project.area,
      dueDate: project.endDate,
      progress: projectProgress.percent,
      progressLabel: `${projectProgress.closed} de ${projectProgress.total} actividades cerradas`,
      risk: alerts.length > 0 && !["COMPLETADO", "CANCELADO"].includes(project.status),
      riskLabel: alerts.join(" · "),
      tags: [project.area, project.sourceIdeaFolio ? `Origen ${project.sourceIdeaFolio}` : "", project.hasCharter ? "Charter listo" : ""].filter(Boolean),
      allowedGroups: canManage ? kaizenAllowedStageTargets(project.status, {
        hasCharter: project.hasCharter,
        activityCount: project.activities.filter((activity) => activity.status !== "COMBINADA").length
      }) : [],
      children: project.activities.filter((activity) => activity.status !== "COMBINADA").map((activity) => {
        const activityStatus = workItemStatusRender(activity.status);
        return {
          id: activity.id,
          label: activity.action,
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

  const allActivities = visible.flatMap((project) => project.activities).filter((activity) => activity.status !== "COMBINADA");
  const completed = allActivities.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  const overdue = allActivities.filter((activity) => activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  const realSavings = visible.reduce((sum, project) => sum + project.realSavings, 0);

  const moveProject = async (input: WorkboardMoveInput): Promise<WorkboardMoveResult> => {
    const fromStatus = input.fromGroup as KaizenStatus;
    const toStatus = input.toGroup as KaizenStatus;
    if (!KAIZEN_STAGE_ORDER.includes(fromStatus) || !KAIZEN_STAGE_ORDER.includes(toStatus)) {
      return { ok: false, message: "La etapa seleccionada no pertenece al flujo Kaizen." };
    }

    setLiveProjects((current) => current.map((project) => project.id === input.itemId ? { ...project, status: toStatus } : project));
    try {
      const result = await changeKaizenStageAction({
        projectId: input.itemId,
        fromStatus,
        toStatus,
        via: input.via
      });
      if (!result.ok) {
        setLiveProjects((current) => current.map((project) => project.id === input.itemId && project.status === toStatus ? { ...project, status: fromStatus } : project));
      }
      router.refresh();
      return { ok: result.ok, message: result.message };
    } catch {
      setLiveProjects((current) => current.map((project) => project.id === input.itemId && project.status === toStatus ? { ...project, status: fromStatus } : project));
      router.refresh();
      return { ok: false, message: "No fue posible guardar la etapa. Restauramos el estado anterior." };
    }
  };

  return <OperationsWorkboard
    groupDefinitions={KAIZEN_GROUPS}
    items={items}
    locationLabel="Planta"
    onMoveItem={canManage ? moveProject : undefined}
    primaryLabel="Proyectos"
    metrics={[
      { label: "Kaizen visibles", value: visible.length, detail: `${visible.filter((project) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status)).length} activos`, color: "#579bfc" },
      { label: "Avance global", value: `${allActivities.length ? Math.round((completed / allActivities.length) * 100) : 0}%`, detail: `${completed} de ${allActivities.length} actividades`, color: "#00a878" },
      { label: "Compromisos vencidos", value: overdue, detail: "Actividades abiertas fuera de fecha", color: "#e2445c" },
      { label: "Ahorro comprobado", value: currency(realSavings), detail: "Beneficio real registrado", color: "#fdab3d" }
    ]}
  />;
}
