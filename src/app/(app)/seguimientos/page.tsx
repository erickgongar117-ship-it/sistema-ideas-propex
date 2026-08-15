import type { IdeaStatus, KaizenStatus, WorkItemStatus } from "@prisma/client";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { FollowUpTable, type FollowUpRow, type FollowUpTone } from "@/components/follow-up-table";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { genbaStatusLabels, kaizenStatusLabels, statusLabels, statusTone, workItemStatusLabels, workProgress } from "@/lib/domain";
import {
  buildIdeaVisibilityWhere,
  getManageableActivityOrgUnitIds,
  getSupervisableOrgUnitIds,
  hasGlobalIdeaAccess
} from "@/lib/idea-access";
import { userModuleAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type FollowUpView = "pendientes" | "seguimiento" | "equipo";
type PageProps = { searchParams: Promise<{ vista?: string; error?: string }> };

const terminalIdeaStatuses = new Set<IdeaStatus>([
  "RECHAZADA_SUPERVISOR",
  "RECHAZADA_VALIDACION",
  "CERRADA",
  "CANCELADA"
]);
const activeWorkStatuses = new Set<WorkItemStatus>(["PENDIENTE", "EN_PROCESO", "BLOQUEADA"]);
const initialReviewStatuses = new Set<IdeaStatus>(["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"]);
const mcActionStatuses = new Set<IdeaStatus>([
  "APROBADA_PARA_IMPLEMENTAR",
  "CLASIFICACION_MEJORA_CONTINUA",
  "IMPLEMENTADA",
  "EN_VALIDACION_FINAL",
  "RECHAZADA_VALIDACION"
]);

const kaizenTone: Record<KaizenStatus, FollowUpTone> = {
  PENDIENTE_CHARTER: "amber",
  PLANIFICACION: "blue",
  EN_CURSO: "green",
  EN_PAUSA: "amber",
  COMPLETADO: "green",
  CANCELADO: "slate"
};

function ideaTone(value: IdeaStatus): FollowUpTone {
  const tone = statusTone[value];
  if (tone === "yellow") return "amber";
  if (tone === "gray") return "slate";
  if (tone === "purple") return "violet";
  return tone;
}

function workItemTone(value: WorkItemStatus): FollowUpTone {
  if (value === "COMPLETADA") return "green";
  if (value === "BLOQUEADA") return "red";
  if (value === "EN_PROCESO") return "blue";
  if (value === "PENDIENTE") return "amber";
  return "slate";
}

function nearestDueDate(dates: Array<Date | null | undefined>) {
  return dates
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
}

function isPastDue(date: Date | null, terminal: boolean) {
  return Boolean(date && !terminal && date.getTime() < Date.now());
}

function sortRows(rows: FollowUpRow[], view: FollowUpView) {
  return rows.sort((left, right) => {
    if (view === "pendientes" && left.overdue !== right.overdue) return left.overdue ? -1 : 1;
    const leftDate = left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDate = right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (view === "pendientes" && leftDate !== rightDate) return leftDate - rightDate;
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}

export default async function FollowUpsPage({ searchParams }: PageProps) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const requestedView = query.vista;
  const activeView: FollowUpView = requestedView === "seguimiento" || requestedView === "equipo" ? requestedView : "pendientes";
  const errorMessage = query.error === "sin_permiso"
    ? "No puedes decidir esa idea porque no está asignada a tu ruta ni al equipo que supervisas."
    : null;
  const globalAccess = hasGlobalIdeaAccess(user);
  const [supervisableOrgUnitIds, manageableOrgUnitIds, moduleAccess] = await Promise.all([
    globalAccess ? Promise.resolve([]) : getSupervisableOrgUnitIds(user.id),
    globalAccess ? Promise.resolve([]) : getManageableActivityOrgUnitIds(user.id),
    userModuleAccess(user)
  ]);
  const ideaWhere = buildIdeaVisibilityWhere(user, supervisableOrgUnitIds);
  const memberScope = supervisableOrgUnitIds.length
    ? { active: true, orgUnitId: { in: supervisableOrgUnitIds } }
    : null;

  const [ideas, kaizenProjects, genbaWalks] = await Promise.all([
    prisma.idea.findMany({
      where: ideaWhere,
      include: {
        area: {
          include: {
            organizationUnit: { include: { plant: true } }
          }
        },
        supervisor: true,
        implementationOwner: true,
        approvals: { include: { assignedTo: true } },
        supportRequests: { include: { assignedTo: true, orgUnit: true } },
        followers: { where: { userId: user.id } },
        escalationRule: { include: { reviewerMembership: true } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.kaizenProject.findMany({
      where: !moduleAccess.kaizen
        ? { id: "__no_kaizen_access__" }
        : globalAccess
          ? {}
          : {
            OR: [
              { leaderId: user.id },
              { activities: { some: { ownerId: user.id } } },
              ...(supervisableOrgUnitIds.length ? [{ orgUnitId: { in: supervisableOrgUnitIds } }] : []),
              ...(memberScope
                ? [
                    { leader: { is: { orgMemberships: { some: memberScope } } } },
                    { activities: { some: { owner: { is: { orgMemberships: { some: memberScope } } } } } }
                  ]
                : [])
            ]
          },
      include: {
        leader: true,
        orgUnit: { include: { plant: true } },
        activities: { include: { owner: true }, orderBy: { number: "asc" } },
        attachments: { where: { type: "CHARTER" }, select: { id: true } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.genbaWalk.findMany({
      where: !moduleAccess.genba
        ? { id: "__no_genba_access__" }
        : globalAccess
          ? {}
          : {
            OR: [
              { coordinatorId: user.id },
              { activities: { some: { ownerId: user.id } } },
              ...(supervisableOrgUnitIds.length ? [{ orgUnitId: { in: supervisableOrgUnitIds } }] : []),
              ...(memberScope
                ? [
                    { coordinator: { is: { orgMemberships: { some: memberScope } } } },
                    { activities: { some: { owner: { is: { orgMemberships: { some: memberScope } } } } } }
                  ]
                : [])
            ]
          },
      include: {
        coordinator: true,
        orgUnit: { include: { plant: true } },
        activities: { include: { owner: true }, orderBy: { number: "asc" } }
      },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const buckets: Record<FollowUpView, FollowUpRow[]> = {
    pendientes: [],
    seguimiento: [],
    equipo: []
  };
  const supervisedScope = new Set(supervisableOrgUnitIds);
  const manageableScope = new Set(manageableOrgUnitIds);

  for (const idea of ideas) {
    const pendingInitialApproval = idea.approvals.find((approval) =>
      approval.type === "SUPERVISOR" && approval.assignedToId === user.id && ["PENDING", "MORE_INFO"].includes(approval.status)
    );
    const pendingApproval = idea.approvals.find((approval) =>
      approval.type !== "SUPERVISOR" && approval.assignedToId === user.id && approval.status === "PENDING"
    );
    const pendingSupport = idea.supportRequests.find((request) => request.assignedToId === user.id && request.status === "PENDING");
    const orgUnit = idea.area.organizationUnit;
    const directInitialReview = Boolean(
      pendingInitialApproval ||
      idea.supervisorId === user.id ||
      idea.area.supervisorId === user.id ||
      idea.escalationRule?.reviewerMembership.userId === user.id
    );
    const teamInitialReview = Boolean(
      (orgUnit?.id && supervisedScope.has(orgUnit.id)) ||
      (idea.escalationRule?.orgUnitId && supervisedScope.has(idea.escalationRule.orgUnitId))
    );
    const supervisorAction = initialReviewStatuses.has(idea.status) && (directInitialReview || teamInitialReview);
    const ownerAction = idea.implementationOwnerId === user.id && ["APROBADA_PARA_IMPLEMENTAR", "EN_IMPLEMENTACION", "VENCIDA"].includes(idea.status);
    const unassignedValidation = globalAccess && (
      idea.approvals.some((approval) => approval.status === "PENDING" && !approval.assignedToId) ||
      idea.supportRequests.some((request) => request.status === "PENDING" && !request.assignedToId)
    );
    const globalAction = globalAccess && mcActionStatuses.has(idea.status);
    const needsAction = Boolean(pendingInitialApproval || pendingApproval || pendingSupport || supervisorAction || ownerAction || unassignedValidation || globalAction);
    const directAssignment = Boolean(
      idea.supervisorId === user.id ||
      idea.implementationOwnerId === user.id ||
      idea.area.supervisorId === user.id ||
      idea.approvals.some((approval) => approval.assignedToId === user.id) ||
      idea.supportRequests.some((request) => request.assignedToId === user.id) ||
      idea.followers.length ||
      idea.escalationRule?.reviewerMembership.userId === user.id
    );
    const view: FollowUpView = needsAction ? "pendientes" : directAssignment ? "seguimiento" : "equipo";
    const dueDate = idea.dueDate;
    const supportLabel = pendingSupport ? `Apoyo solicitado · ${pendingSupport.orgUnit.name}` : null;
    const followerLabel = idea.followers[0]?.label;
    const assignment = supervisorAction
      ? "Aprobación como responsable directo"
      : pendingApproval
        ? "Validación pendiente"
        : supportLabel
        ? supportLabel
          : ownerAction
            ? "Implementación a tu cargo"
            : unassignedValidation
              ? "Validación sin responsable"
              : globalAction
                ? "Decisión de Mejora Continua"
                : followerLabel ?? (directAssignment ? "Seguimiento asignado" : "Propuesta de tu equipo");
    const owner = pendingInitialApproval?.assignedTo?.name
      ?? pendingApproval?.assignedTo?.name
      ?? pendingSupport?.assignedTo?.name
      ?? idea.implementationOwner?.name
      ?? idea.supervisor?.name
      ?? (globalAction ? "Mejora Continua" : "Responsable por asignar");

    buckets[view].push({
      key: `idea-${idea.id}`,
      module: "IDEA",
      reference: idea.folio,
      title: idea.problem,
      subtitle: `${idea.collaboratorName} · ${idea.submitterPosition ?? idea.shift}`,
      location: orgUnit ? `${orgUnit.plant.code} · ${orgUnit.name}` : idea.area.name,
      assignment,
      owner,
      status: statusLabels[idea.status],
      statusTone: ideaTone(idea.status),
      href: `/ideas/${idea.id}`,
      dueDate,
      updatedAt: idea.updatedAt,
      overdue: isPastDue(dueDate, terminalIdeaStatuses.has(idea.status))
    });
  }

  for (const project of kaizenProjects) {
    const ownedActiveActivities = project.activities.filter((activity) => activity.ownerId === user.id && activeWorkStatuses.has(activity.status));
    const manageableProject = Boolean(project.orgUnitId && manageableScope.has(project.orgUnitId));
    const blockedActivities = project.activities.filter((activity) => activity.status === "BLOQUEADA");
    const needsCharter = project.status === "PENDIENTE_CHARTER" && !project.attachments.length;
    const needsAction = Boolean(
      ownedActiveActivities.length ||
      (project.leaderId === user.id && needsCharter) ||
      (manageableProject && blockedActivities.length) ||
      (globalAccess && (needsCharter || blockedActivities.length))
    );
    const directAssignment = project.leaderId === user.id || project.activities.some((activity) => activity.ownerId === user.id);
    const view: FollowUpView = needsAction ? "pendientes" : directAssignment ? "seguimiento" : "equipo";
    const progress = workProgress(project.activities);
    const dueDate = nearestDueDate([
      ...ownedActiveActivities.map((activity) => activity.dueDate),
      directAssignment || globalAccess || manageableProject ? project.endDate : null
    ]);
    const assignment = ownedActiveActivities.length
      ? `${ownedActiveActivities.length} ${ownedActiveActivities.length === 1 ? "actividad a tu cargo" : "actividades a tu cargo"}`
      : needsCharter && (project.leaderId === user.id || globalAccess)
        ? "Project Charter pendiente"
        : blockedActivities.length && (manageableProject || globalAccess)
          ? `${blockedActivities.length} ${blockedActivities.length === 1 ? "actividad bloqueada" : "actividades bloqueadas"}`
          : directAssignment
            ? project.leaderId === user.id ? "Liderazgo del Kaizen" : "Actividad asignada"
            : "Proyecto de tu equipo";

    buckets[view].push({
      key: `kaizen-${project.id}`,
      module: "KAIZEN",
      reference: project.folio,
      title: project.title,
      subtitle: `Líder: ${project.leader.name}`,
      location: project.orgUnit ? `${project.orgUnit.plant.code} · ${project.orgUnit.name}` : [project.plant, project.area].filter(Boolean).join(" · "),
      assignment,
      owner: project.leader.name,
      status: kaizenStatusLabels[project.status],
      statusTone: kaizenTone[project.status],
      href: `/kaizen/${project.id}`,
      dueDate,
      updatedAt: project.updatedAt,
      overdue: isPastDue(dueDate, project.status === "COMPLETADO" || project.status === "CANCELADO"),
      progress: { completed: progress.closed, total: progress.total, percent: progress.percent },
      children: project.activities.map((activity) => ({
        id: activity.id,
        label: activity.action,
        status: activity.status,
        statusLabel: workItemStatusLabels[activity.status],
        owner: activity.owner?.name ?? "Sin responsable",
        dueDate: activity.dueDate,
        tone: workItemTone(activity.status)
      }))
    });
  }

  for (const walk of genbaWalks) {
    const ownedActiveActivities = walk.activities.filter((activity) => activity.ownerId === user.id && activeWorkStatuses.has(activity.status));
    const manageableWalk = Boolean(walk.orgUnitId && manageableScope.has(walk.orgUnitId));
    const blockedActivities = walk.activities.filter((activity) => activity.status === "BLOQUEADA");
    const coordinatorAction = walk.coordinatorId === user.id && walk.status === "ABIERTO";
    const needsAction = Boolean(
      ownedActiveActivities.length ||
      coordinatorAction ||
      (manageableWalk && blockedActivities.length) ||
      (globalAccess && blockedActivities.length)
    );
    const directAssignment = walk.coordinatorId === user.id || walk.activities.some((activity) => activity.ownerId === user.id);
    const view: FollowUpView = needsAction ? "pendientes" : directAssignment ? "seguimiento" : "equipo";
    const progress = workProgress(walk.activities);
    const dueDate = nearestDueDate(ownedActiveActivities.map((activity) => activity.dueDate));
    const assignment = ownedActiveActivities.length
      ? `${ownedActiveActivities.length} ${ownedActiveActivities.length === 1 ? "actividad a tu cargo" : "actividades a tu cargo"}`
      : coordinatorAction
        ? "Coordinación del recorrido"
        : blockedActivities.length && (manageableWalk || globalAccess)
          ? `${blockedActivities.length} ${blockedActivities.length === 1 ? "actividad bloqueada" : "actividades bloqueadas"}`
          : directAssignment
            ? "Seguimiento asignado"
            : "Recorrido de tu equipo";

    buckets[view].push({
      key: `genba-${walk.id}`,
      module: "GENBA",
      reference: walk.folio,
      title: `Recorrido en ${walk.areaName}`,
      subtitle: `Coordinación: ${walk.coordinator.name}`,
      location: walk.orgUnit ? `${walk.orgUnit.plant.code} · ${walk.orgUnit.name}` : walk.areaName,
      assignment,
      owner: walk.coordinator.name,
      status: genbaStatusLabels[walk.status],
      statusTone: walk.status === "ABIERTO" ? "blue" : walk.status === "CERRADO" ? "green" : "slate",
      href: `/genba/${walk.id}`,
      dueDate,
      updatedAt: walk.updatedAt,
      overdue: isPastDue(dueDate, walk.status !== "ABIERTO"),
      progress: { completed: progress.closed, total: progress.total, percent: progress.percent },
      children: walk.activities.map((activity) => ({
        id: activity.id,
        label: activity.action || activity.problem,
        status: activity.status,
        statusLabel: workItemStatusLabels[activity.status],
        owner: activity.owner?.name ?? "Sin responsable",
        dueDate: activity.dueDate,
        tone: workItemTone(activity.status)
      }))
    });
  }

  sortRows(buckets.pendientes, "pendientes");
  sortRows(buckets.seguimiento, "seguimiento");
  sortRows(buckets.equipo, "equipo");

  const viewMeta: Record<FollowUpView, { title: string; description: string; emptyTitle: string; emptyDescription: string }> = {
    pendientes: {
      title: "Pendientes que requieren acción",
      description: "Decisiones, apoyos, actividades o bloqueos bajo tu responsabilidad.",
      emptyTitle: "No tienes pendientes",
      emptyDescription: "Tus asignaciones activas aparecerán aquí cuando requieran una decisión o avance."
    },
    seguimiento: {
      title: "Seguimientos asignados",
      description: "Elementos en los que participas, lideras o das seguimiento directo.",
      emptyTitle: "No hay seguimientos directos",
      emptyDescription: "Las ideas, Kaizen y GENBA que te asignen se concentrarán en esta vista."
    },
    equipo: {
      title: "Panorama de tu equipo",
      description: globalAccess ? "Portafolio visible por tu acceso global." : "Trabajo visible por tus responsabilidades organizacionales.",
      emptyTitle: "No hay elementos de equipo",
      emptyDescription: "Aparecerán cuando tengas unidades configuradas con permiso para revisar al equipo."
    }
  };
  const currentMeta = viewMeta[activeView];

  return (
    <>
      <PageHeader
        eyebrow="Trabajo asignado · Bandeja universal"
        title="Mis seguimientos"
        description="Ideas, Kaizen y recorridos GENBA reunidos por responsabilidad y nivel de atención."
      />

      {errorMessage ? (
        <div className="alert alert-danger mb-5" role="alert">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span className="font-bold">{errorMessage}</span>
        </div>
      ) : null}

      <nav aria-label="Vistas de seguimiento" className="work-queue-tabs">
        {([
          ["pendientes", "Pendientes", buckets.pendientes.length],
          ["seguimiento", "Seguimiento", buckets.seguimiento.length],
          ["equipo", "Equipo", buckets.equipo.length]
        ] as const).map(([value, label, count]) => (
          <Link
            aria-current={activeView === value ? "page" : undefined}
            className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-md px-1 text-[10px] font-extrabold transition sm:gap-2 sm:px-2 sm:text-sm ${activeView === value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink"}`}
            href={`/seguimientos?vista=${value}`}
            key={value}
          >
            <span className="whitespace-nowrap">{label}</span>
            <span className={`flex min-w-5 items-center justify-center rounded-full px-1 py-0.5 text-[9px] sm:min-w-6 sm:px-1.5 sm:text-[10px] ${activeView === value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>{count}</span>
          </Link>
        ))}
      </nav>

      <section className="mt-6 min-w-0 max-w-full overflow-hidden" aria-labelledby={`follow-up-${activeView}`}>
        <div className="mb-4 flex flex-col gap-1 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-ink" id={`follow-up-${activeView}`}>{currentMeta.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{currentMeta.description}</p>
          </div>
          <p className="text-xs font-extrabold text-slate-500">{buckets[activeView].length} {buckets[activeView].length === 1 ? "elemento" : "elementos"}</p>
        </div>
        <FollowUpTable
          emptyDescription={currentMeta.emptyDescription}
          emptyTitle={currentMeta.emptyTitle}
          rows={buckets[activeView]}
        />
      </section>
    </>
  );
}
