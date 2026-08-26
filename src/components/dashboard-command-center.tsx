"use client";

import type { IdeaCategory, IdeaStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { supervisorDecisionAction } from "@/app/actions";
import { OperationsWorkboard, type WorkboardGroupDefinition, type WorkboardItem } from "@/components/operations-workboard";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { statusLabels } from "@/lib/domain";
import { ideaStatusCategory, statusCategoryFill, statusCategoryMeta, type StatusCategory } from "@/lib/status-system";

const DAY = 86_400_000;
const terminalStatuses = new Set<IdeaStatus>(["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"]);

export type DashboardIdea = {
  id: string;
  folio: string;
  areaCode: string;
  collaboratorName: string;
  supervisorName: string | null;
  problem: string;
  status: IdeaStatus;
  category: IdeaCategory;
  createdAt: string;
  closedAt: string | null;
  dueDate: string | null;
  pointsAssigned: number;
  impactTypes: string[];
  impactsQuality: boolean;
  impactsSafety: boolean;
  requiresMaintenance: boolean;
};

export type DashboardPortfolio = {
  kaizen: { total: number; active: number; averageProgress: number; overdueActivities: number; estimatedSavings: number; realSavings: number };
  genba: { total: number; openActivities: number; overdueActivities: number; averageAttendance: number };
};

type DashboardCommandCenterProps = {
  canOperate: boolean;
  ideas: DashboardIdea[];
  areas: string[];
  generatedAt: string;
  portfolio: DashboardPortfolio;
  timing: { supervisor: string; validation: string; implementation: string };
};

// Una Idea no tiene actividades que contar, asi que no tiene porcentaje real. Antes se
// pintaba una constante por categoria y el tablero mostraba ficciones: toda idea en
// ejecucion al 72%, una idea RECHAZADA al 100% y el grupo "Detenida" promediando 86%.
// La misma idea decia 0% en Mi trabajo y 15% aqui. Ahora la columna muestra la etapa.

/**
 * Orden de flujo, no orden de llegada. Sin esto los grupos salian en el orden en que
 * aparecia el primer registro de cada uno, y el tablero mostraba Ejecucion antes que
 * Entrada: un tablero de proceso que ensena la fase 3 primero obliga a interpretar.
 * Detenida va al final a proposito: es lo que ya no avanza.
 */
const IDEA_GROUPS: WorkboardGroupDefinition[] = (
  ["ENTRADA", "VALIDACION", "EJECUCION", "CIERRE", "DETENIDA"] as StatusCategory[]
).map((key) => ({ key, label: statusCategoryMeta[key].label, color: statusCategoryFill(key) }));

function groupFor(status: IdeaStatus) {
  const key = ideaStatusCategory(status);
  return {
    key,
    label: statusCategoryMeta[key].label,
    color: statusCategoryFill(key)
  };
}

export function DashboardCommandCenter({ canOperate, ideas, generatedAt, portfolio, timing }: DashboardCommandCenterProps) {
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
    if (period === "all") return ideas;
    const start = now.getTime() - Number(period) * DAY;
    return ideas.filter((idea) => !terminalStatuses.has(idea.status) || new Date(idea.createdAt).getTime() >= start || Boolean(idea.closedAt && new Date(idea.closedAt).getTime() >= start));
  }, [ideas, now, period]);
  const items: WorkboardItem[] = visible.map((idea) => {
    const group = groupFor(idea.status);
    const overdue = idea.status === "VENCIDA" || Boolean(idea.dueDate && new Date(idea.dueDate) < now && !["CERRADA", "CANCELADA"].includes(idea.status));
    const support = [idea.impactsQuality ? "Calidad" : "", idea.impactsSafety ? "Seguridad" : "", idea.requiresMaintenance ? "Mantenimiento" : ""].filter(Boolean);
    return {
      id: idea.id,
      href: `/ideas/${idea.id}`,
      code: idea.folio,
      title: idea.problem,
      subtitle: `${idea.collaboratorName} · Categoria ${idea.category}`,
      group: group.key,
      groupLabel: group.label,
      groupColor: group.color,
      statusLabel: statusLabels[idea.status],
      statusCategory: ideaStatusCategory(idea.status),
      owner: idea.supervisorName ?? "Sin responsable",
      location: idea.areaCode,
      dueDate: idea.dueDate,
      progress: null,
      progressLabel: `Etapa: ${statusLabels[idea.status]}`,
      risk: overdue || !idea.supervisorName,
      riskLabel: overdue ? "Compromiso vencido" : !idea.supervisorName ? "Responsable pendiente" : undefined,
      tags: [`Categoria ${idea.category}`, ...idea.impactTypes, ...support, idea.pointsAssigned ? `${idea.pointsAssigned} ProbocaCoins` : ""].filter(Boolean),
      // Solo mientras la idea espera la primera revision. El servidor revalida quien puede
      // decidir y en que estado; esto solo evita ofrecer un boton que iba a rebotar.
      canDecide: canOperate && idea.status === "EN_REVISION_SUPERVISOR"
    };
  });

  const closed = visible.filter((idea) => idea.status === "CERRADA").length;
  const pending = visible.filter((idea) => !["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status)).length;
  const overdue = items.filter((item) => item.riskLabel === "Compromiso vencido").length;
  const coins = visible.reduce((sum, idea) => sum + idea.pointsAssigned, 0);

  return <OperationsWorkboard
    itemAction={{
      action: supervisorDecisionAction,
      idField: "ideaId",
      noteField: "comments",
      noteLabel: "Comentario para quien la propuso",
      notePlaceholder: "Obligatorio si rechazas o pides mas informacion",
      summary: "Decidir esta idea",
      options: [
        { name: "decision", value: "APROBAR", label: "Aprobar", tone: "success" },
        { name: "decision", value: "SOLICITAR_INFORMACION", label: "Pedir informacion", tone: "secondary" },
        { name: "decision", value: "RECHAZAR", label: "Rechazar", tone: "danger" }
      ]
    }}
    groupDefinitions={IDEA_GROUPS}
    items={items}
    locationLabel="Area"
    primaryLabel="Ideas"
    metrics={[
      { label: "Ideas visibles", value: visible.length, detail: `${pending} requieren seguimiento`, color: "var(--time-soon)" },
      { label: "Cerradas", value: closed, detail: `${visible.length ? Math.round((closed / visible.length) * 100) : 0}% de la seleccion`, color: "var(--time-planned)" },
      { label: "Vencidas", value: overdue, detail: `Respuesta supervisor ${timing.supervisor}`, color: "var(--time-overdue)" },
      { label: "ProbocaCoins", value: coins.toLocaleString("es-MX"), detail: "Saldo asignado en ideas", color: "var(--time-today)" },
      { label: "Portafolio", value: `${portfolio.kaizen.active}K · ${portfolio.genba.total}G`, detail: "Kaizen activos y recorridos GENBA", color: "var(--brand-black)" }
    ]}
  />;
}
