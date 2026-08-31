import "server-only";

import type { User } from "@prisma/client";
import type { AssistantContext } from "@/lib/assistant-answers";
import { statusLabels } from "@/lib/domain";
import { getVisibleIdeasWhere } from "@/lib/idea-access";
import { prisma } from "@/lib/prisma";

type AssistantUser = Pick<User, "id" | "name" | "email" | "role" | "jobTitle">;

const activeWork = ["PENDIENTE", "EN_PROCESO", "BLOQUEADA"] as const;

export async function buildAssistantContext(user: AssistantUser): Promise<AssistantContext> {
  const visibleIdeas = await getVisibleIdeasWhere(user);
  const memberships = await prisma.orgMembership.findMany({
    where: { userId: user.id, active: true },
    include: {
      orgUnit: { include: { plant: true } },
      managerMembership: { include: { user: true } }
    },
    orderBy: [{ level: "desc" }, { sortOrder: "asc" }]
  });
  const unitIds = memberships.map((membership) => membership.orgUnitId);

  const [visibleIdeaCount, openIdeaCount, pendingDecisions, recentIdeas, kaizenTasks, genbaTasks, routes] = await Promise.all([
    prisma.idea.count({ where: visibleIdeas }),
    prisma.idea.count({ where: { AND: [visibleIdeas, { status: { notIn: ["CERRADA", "CANCELADA"] } }] } }),
    prisma.idea.count({
      where: {
        OR: [
          { approvals: { some: { assignedToId: user.id, status: { in: ["PENDING", "MORE_INFO"] } } } },
          { supportRequests: { some: { assignedToId: user.id, activatedAt: { not: null }, status: { in: ["PENDING", "MORE_INFO"] } } } },
          { executiveValidations: { some: { assignedToId: user.id, status: "PENDING" } } }
        ]
      }
    }),
    prisma.idea.findMany({
      where: visibleIdeas,
      select: { id: true, folio: true, status: true, area: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.kaizenActivity.findMany({
      where: { ownerId: user.id, status: { in: [...activeWork] } },
      select: { id: true, action: true, status: true, project: { select: { id: true, folio: true, title: true } } },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 8
    }),
    prisma.genbaActivity.findMany({
      where: { ownerId: user.id, status: { in: [...activeWork] } },
      select: { id: true, action: true, problem: true, status: true, walk: { select: { id: true, folio: true, areaName: true } } },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 8
    }),
    unitIds.length ? prisma.orgEscalationRule.findMany({
      where: { orgUnitId: { in: unitIds }, active: true },
      select: {
        orgUnit: { select: { name: true } },
        reviewerMembership: { select: { title: true, user: { select: { name: true } } } }
      },
      orderBy: [{ sortOrder: "asc" }],
      take: 12
    }) : []
  ]);

  return {
    person: { name: user.name, role: user.role, jobTitle: user.jobTitle },
    metrics: {
      visibleIdeas: visibleIdeaCount,
      openIdeas: openIdeaCount,
      pendingDecisions,
      kaizenTasks: kaizenTasks.length,
      genbaTasks: genbaTasks.length
    },
    memberships: memberships.map((membership) => ({
      unit: membership.orgUnit.name,
      plant: membership.orgUnit.plant.name,
      manager: membership.managerMembership?.user.name ?? null,
      managerTitle: membership.managerMembership?.title ?? null
    })),
    routes: routes.map((route) => ({
      unit: route.orgUnit.name,
      reviewer: route.reviewerMembership.user.name,
      reviewerTitle: route.reviewerMembership.title
    })),
    recentIdeas: recentIdeas.map((idea) => ({
      id: idea.id,
      folio: idea.folio,
      area: idea.area.name,
      status: statusLabels[idea.status]
    })),
    kaizenTasks: kaizenTasks.map((task) => ({
      id: task.id,
      projectId: task.project.id,
      project: `${task.project.folio} · ${task.project.title}`,
      title: task.action,
      status: task.status
    })),
    genbaTasks: genbaTasks.map((task) => ({
      id: task.id,
      walkId: task.walk.id,
      walk: `${task.walk.folio} · ${task.walk.areaName}`,
      title: task.action ?? task.problem,
      status: task.status
    }))
  };
}
