import type { IdeaStatus, WorkItemStatus } from "@prisma/client";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { FollowUpTable, type FollowUpRow } from "@/components/follow-up-table";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { genbaStatusLabels, kaizenStatusLabels, statusLabels, workItemStatusLabels, workProgress } from "@/lib/domain";
import {
  getManageableActivityOrgUnitIds,
  getSupervisableOrgUnitIds,
  hasGlobalIdeaAccess
} from "@/lib/idea-access";
import {
  allocateFollowUpSlots,
  followUpConsumedBeforePage,
  followUpTotalPages,
  type FollowUpModuleFilter
} from "@/lib/follow-up-pagination";
import { serializeFollowUpBulkTarget } from "@/lib/follow-up-bulk";
import {
  followUpGenbaWhere,
  followUpIdeaWhere,
  followUpKaizenWhere,
  type FollowUpView
} from "@/lib/follow-up-scope";
import { userModuleAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";
import { genbaStatusCategory, ideaStatusCategory, kaizenStatusCategory } from "@/lib/status-system";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ vista?: string; modulo?: string; pagina?: string; error?: string }> };

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

function followUpHref(view: FollowUpView, moduleFilter: FollowUpModuleFilter, page = 1) {
  const params = new URLSearchParams({ vista: view });
  if (moduleFilter !== "TODOS") params.set("modulo", moduleFilter.toLowerCase());
  if (page > 1) params.set("pagina", String(page));
  return `/seguimientos?${params.toString()}`;
}

export default async function FollowUpsPage({ searchParams }: PageProps) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const requestedView = query.vista;
  const activeView: FollowUpView = requestedView === "seguimiento" || requestedView === "equipo" ? requestedView : "pendientes";
  const requestedModule = query.modulo?.toUpperCase();
  const moduleFilter: FollowUpModuleFilter = requestedModule === "IDEA" || requestedModule === "KAIZEN" || requestedModule === "GENBA"
    ? requestedModule
    : "TODOS";
  const errorMessage = query.error === "sin_permiso"
    ? "No puedes decidir esa idea porque no está asignada a tu ruta ni al equipo que supervisas."
    : null;
  const globalAccess = hasGlobalIdeaAccess(user);
  const [supervisableOrgUnitIds, manageableOrgUnitIds, moduleAccess] = await Promise.all([
    globalAccess ? Promise.resolve([]) : getSupervisableOrgUnitIds(user.id),
    globalAccess ? Promise.resolve([]) : getManageableActivityOrgUnitIds(user.id),
    userModuleAccess(user)
  ]);
  const scope = { user, globalAccess, supervisableOrgUnitIds, manageableOrgUnitIds };
  const ideaWhere = followUpIdeaWhere(scope, activeView);
  const kaizenWhere = followUpKaizenWhere({ ...scope, hasAccess: moduleAccess.kaizen }, activeView);
  const genbaWhere = followUpGenbaWhere({ ...scope, hasAccess: moduleAccess.genba }, activeView);
  const includesModule = (module: Exclude<FollowUpModuleFilter, "TODOS">) => moduleFilter === "TODOS" || moduleFilter === module;

  const [ideaCount, kaizenCount, genbaCount] = await Promise.all([
    includesModule("IDEA") ? prisma.idea.count({ where: ideaWhere }) : Promise.resolve(0),
    includesModule("KAIZEN") ? prisma.kaizenProject.count({ where: kaizenWhere }) : Promise.resolve(0),
    includesModule("GENBA") ? prisma.genbaWalk.count({ where: genbaWhere }) : Promise.resolve(0)
  ]);
  const moduleCounts = { IDEA: ideaCount, KAIZEN: kaizenCount, GENBA: genbaCount };
  const pageSlots = allocateFollowUpSlots(moduleCounts, moduleFilter);
  const portfolioOverview = moduleFilter === "TODOS";
  const totalPages = portfolioOverview ? 1 : followUpTotalPages(moduleCounts, pageSlots);
  const requestedPage = Math.max(1, Number.parseInt(query.pagina ?? "1", 10) || 1);
  const currentPage = portfolioOverview ? 1 : Math.min(requestedPage, totalPages);

  const [ideas, kaizenProjects, genbaWalks] = await Promise.all([
    pageSlots.IDEA ? prisma.idea.findMany({
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
        escalationRule: { include: { reviewerMembership: true } },
        participant: { select: { orgUnitId: true } },
        kaizenProject: { select: { updatedAt: true } }
      },
      orderBy: activeView === "pendientes"
        ? [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }]
        : { updatedAt: "desc" },
      skip: (currentPage - 1) * pageSlots.IDEA,
      take: pageSlots.IDEA
    }) : Promise.resolve([]),
    pageSlots.KAIZEN ? prisma.kaizenProject.findMany({
      where: kaizenWhere,
      include: {
        leader: true,
        orgUnit: { include: { plant: true } },
        activities: { include: { owner: true }, orderBy: { number: "asc" } },
        attachments: { where: { type: "CHARTER" }, select: { id: true } }
      },
      orderBy: activeView === "pendientes" ? [{ endDate: "asc" }, { updatedAt: "desc" }] : { updatedAt: "desc" },
      skip: (currentPage - 1) * pageSlots.KAIZEN,
      take: pageSlots.KAIZEN
    }) : Promise.resolve([]),
    pageSlots.GENBA ? prisma.genbaWalk.findMany({
      where: genbaWhere,
      include: {
        coordinator: true,
        orgUnit: { include: { plant: true } },
        activities: { include: { owner: true }, orderBy: { number: "asc" } }
      },
      orderBy: { updatedAt: "desc" },
      skip: (currentPage - 1) * pageSlots.GENBA,
      take: pageSlots.GENBA
    }) : Promise.resolve([])
  ]);

  const buckets: Record<FollowUpView, FollowUpRow[]> = {
    pendientes: [],
    seguimiento: [],
    equipo: []
  };
  const supervisedScope = new Set(supervisableOrgUnitIds);
  const manageableScope = new Set(manageableOrgUnitIds);

  for (const idea of ideas) {
    const initialApproval = idea.approvals.find((approval) =>
      approval.type === "SUPERVISOR" && ["PENDING", "MORE_INFO"].includes(approval.status)
    );
    const pendingInitialApproval = idea.approvals.find((approval) =>
      approval.type === "SUPERVISOR" && approval.assignedToId === user.id && ["PENDING", "MORE_INFO"].includes(approval.status)
    );
    const pendingApprovals = idea.approvals.filter((approval) =>
      approval.type !== "SUPERVISOR" &&
      ["PENDING", "MORE_INFO"].includes(approval.status) &&
      (approval.assignedToId === user.id || (user.role === "ADMIN" && !approval.assignedToId))
    );
    const pendingSupports = idea.supportRequests.filter((request) =>
      Boolean(request.activatedAt) &&
      ["PENDING", "MORE_INFO"].includes(request.status) &&
      (request.assignedToId === user.id || (globalAccess && !request.assignedToId))
    );
    const pendingApproval = pendingApprovals[0];
    const pendingSupport = pendingSupports[0];
    const orgUnit = idea.area.organizationUnit;
    const directInitialReview = Boolean(
      pendingInitialApproval ||
      idea.supervisorId === user.id ||
      idea.area.supervisorId === user.id ||
      idea.escalationRule?.reviewerMembership.userId === user.id
    );
    const teamInitialReview = Boolean(
      (orgUnit?.id && supervisedScope.has(orgUnit.id)) ||
      (idea.escalationRule?.orgUnitId && supervisedScope.has(idea.escalationRule.orgUnitId)) ||
      (idea.participant?.orgUnitId && supervisedScope.has(idea.participant.orgUnitId))
    );
    const supervisorAction = initialReviewStatuses.has(idea.status) && (user.role === "ADMIN" || directInitialReview || teamInitialReview);
    const ownerAction = idea.implementationOwnerId === user.id && ["APROBADA_PARA_IMPLEMENTAR", "EN_IMPLEMENTACION", "VENCIDA"].includes(idea.status);
    const unassignedValidation = (user.role === "ADMIN" && pendingApprovals.some((approval) => !approval.assignedToId)) || (globalAccess && pendingSupports.some((request) => !request.assignedToId));
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
    const decisionCount = (supervisorAction && initialApproval ? 1 : 0) + pendingApprovals.length + pendingSupports.length;
    const assignment = decisionCount > 1
      ? `${decisionCount} validaciones pendientes · abre el expediente para revisar cada una`
      : supervisorAction
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
    const owner = decisionCount > 1
      ? "Varios responsables"
      : pendingInitialApproval?.assignedTo?.name
      ?? pendingApproval?.assignedTo?.name
      ?? pendingSupport?.assignedTo?.name
      ?? idea.implementationOwner?.name
      ?? idea.supervisor?.name
      ?? (globalAction ? "Mejora Continua" : "Responsable por asignar");
    const bulkActions: FollowUpRow["bulkActions"] = [];
    const decisionTargets = [
      ...(supervisorAction && initialApproval ? [{
        kind: "INITIAL" as const,
        targetId: initialApproval.id,
        expectedTargetUpdatedAt: initialApproval.updatedAt.toISOString(),
        expectedIdeaUpdatedAt: idea.updatedAt.toISOString()
      }] : []),
      ...pendingApprovals.map((approval) => ({
        kind: "DEPARTMENT" as const,
        targetId: approval.id,
        expectedTargetUpdatedAt: approval.updatedAt.toISOString(),
        expectedIdeaUpdatedAt: idea.updatedAt.toISOString()
      })),
      ...pendingSupports.map((request) => ({
        kind: "SUPPORT" as const,
        targetId: request.id,
        expectedTargetUpdatedAt: request.updatedAt.toISOString(),
        expectedIdeaUpdatedAt: idea.updatedAt.toISOString()
      }))
    ];
    let bulkEntityId: string | undefined;
    if (decisionTargets.length === 1) {
      bulkActions.push("APPROVE", "REJECT");
      bulkEntityId = serializeFollowUpBulkTarget(decisionTargets[0]);
    } else if (
      globalAccess &&
      idea.classification &&
      ["CLASIFICACION_MEJORA_CONTINUA", "EN_IMPLEMENTACION", "VENCIDA"].includes(idea.status)
    ) {
      bulkActions.push("REASSIGN", "DUE_DATE");
      bulkEntityId = serializeFollowUpBulkTarget({
        kind: "IMPLEMENTATION",
        targetId: idea.id,
        expectedTargetUpdatedAt: idea.updatedAt.toISOString(),
        expectedIdeaUpdatedAt: idea.updatedAt.toISOString(),
        expectedRelatedUpdatedAt: idea.kaizenProject?.updatedAt.toISOString()
      });
    }

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
      statusCategory: ideaStatusCategory(idea.status),
      href: `/ideas/${idea.id}`,
      dueDate,
      updatedAt: idea.updatedAt,
      overdue: isPastDue(dueDate, terminalIdeaStatuses.has(idea.status)),
      bulkEntityId,
      bulkActions
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
      statusCategory: kaizenStatusCategory(project.status),
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
        dueDate: activity.dueDate
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
      statusCategory: genbaStatusCategory(walk.status),
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
        dueDate: activity.dueDate
      }))
    });
  }

  sortRows(buckets.pendientes, "pendientes");
  sortRows(buckets.seguimiento, "seguimiento");
  sortRows(buckets.equipo, "equipo");
  const totalItems = ideaCount + kaizenCount + genbaCount;
  const loadedItems = buckets[activeView].length;
  const consumedBefore = portfolioOverview ? 0 : followUpConsumedBeforePage(moduleCounts, pageSlots, currentPage);
  const shownFrom = loadedItems ? consumedBefore + 1 : 0;
  const shownTo = consumedBefore + loadedItems;

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

      <nav aria-label="Filtrar por modulo" className="follow-up-module-filter">
        {([
          ["TODOS", "Todo"],
          ["IDEA", "Ideas"],
          ["KAIZEN", "Kaizen"],
          ["GENBA", "GENBA"]
        ] as const).map(([value, label]) => (
          <Link
            aria-current={moduleFilter === value ? "page" : undefined}
            className={moduleFilter === value ? "is-active" : ""}
            href={followUpHref(activeView, value)}
            key={value}
          >
            {label}
          </Link>
        ))}
      </nav>

      <nav aria-label="Vistas de seguimiento" className="work-queue-tabs">
        {([
          ["pendientes", "Pendientes"],
          ["seguimiento", "Seguimiento"],
          ["equipo", "Equipo"]
        ] as const).map(([value, label]) => (
          <Link
            aria-current={activeView === value ? "page" : undefined}
            className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-md px-1 text-[10px] font-extrabold transition sm:gap-2 sm:px-2 sm:text-sm ${activeView === value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink"}`}
            href={followUpHref(value, moduleFilter)}
            key={value}
          >
            <span className="whitespace-nowrap">{label}</span>
            {activeView === value ? <span className="flex min-w-5 items-center justify-center rounded-full bg-white/15 px-1 py-0.5 text-[9px] text-white sm:min-w-6 sm:px-1.5 sm:text-[10px]">{totalItems}</span> : null}
          </Link>
        ))}
      </nav>

      <section className="mt-6 min-w-0 max-w-full overflow-hidden" aria-labelledby={`follow-up-${activeView}`}>
        <div className="mb-4 flex flex-col gap-1 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-ink" id={`follow-up-${activeView}`}>{currentMeta.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{currentMeta.description}</p>
          </div>
          <p className="text-xs font-extrabold text-slate-500">
            {portfolioOverview
              ? `${loadedItems} prioritarios de ${totalItems} · elige un módulo para consultar todo`
              : `${loadedItems ? `${shownFrom}-${shownTo}` : "0"} de ${totalItems} ${totalItems === 1 ? "elemento" : "elementos"}`}
          </p>
        </div>
        <FollowUpTable
          emptyDescription={currentMeta.emptyDescription}
          emptyTitle={currentMeta.emptyTitle}
          rows={buckets[activeView]}
          totalRows={totalItems}
        />
        {totalPages > 1 ? (
          <nav aria-label="Paginacion de seguimientos" className="workboard-pagination mt-5 no-print">
            <p>Pagina {currentPage} de {totalPages}</p>
            <div>
              {currentPage > 1 ? <Link href={followUpHref(activeView, moduleFilter, currentPage - 1)}>Anterior</Link> : <span aria-disabled="true">Anterior</span>}
              <strong>{shownFrom}-{shownTo} de {totalItems}</strong>
              {currentPage < totalPages ? <Link href={followUpHref(activeView, moduleFilter, currentPage + 1)}>Siguiente</Link> : <span aria-disabled="true">Siguiente</span>}
            </div>
          </nav>
        ) : null}
      </section>
    </>
  );
}
