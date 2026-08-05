import "server-only";

import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type IdeaAccessUser = Pick<User, "id" | "role">;

export type SupervisableOrgUnit = {
  id: string;
  code: string;
  name: string;
  plant: {
    id: string;
    code: string;
    name: string;
  };
};

export function hasGlobalIdeaAccess(user: Pick<User, "role">) {
  return user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
}

type OrgScopeCapability = "canReviewTeam" | "canManageActivities";

async function resolveOrgUnitScopeIds(userId: string, capability: OrgScopeCapability) {
  const [memberships, orgUnits] = await Promise.all([
    prisma.orgMembership.findMany({
      where: { active: true, orgUnit: { active: true } },
      select: {
        id: true,
        userId: true,
        orgUnitId: true,
        managerMembershipId: true,
        canReviewTeam: true,
        canManageActivities: true
      }
    }),
    prisma.orgUnit.findMany({
      where: { active: true },
      select: { id: true, parentId: true }
    })
  ]);

  const managerMembershipIds = new Set(
    memberships
      .filter((membership) => membership.userId === userId && membership[capability])
      .map((membership) => membership.id)
  );

  if (!managerMembershipIds.size) return [];

  // A manager can supervise a non-standard reporting chain even when reports live in another branch.
  let changed = true;
  while (changed) {
    changed = false;
    for (const membership of memberships) {
      if (
        membership.managerMembershipId &&
        managerMembershipIds.has(membership.managerMembershipId) &&
        !managerMembershipIds.has(membership.id)
      ) {
        managerMembershipIds.add(membership.id);
        changed = true;
      }
    }
  }

  const scopedUnitIds = new Set(
    memberships
      .filter((membership) => managerMembershipIds.has(membership.id))
      .map((membership) => membership.orgUnitId)
  );
  const childrenByParent = new Map<string, string[]>();

  for (const unit of orgUnits) {
    if (!unit.parentId) continue;
    const children = childrenByParent.get(unit.parentId) ?? [];
    children.push(unit.id);
    childrenByParent.set(unit.parentId, children);
  }

  const queue = [...scopedUnitIds];
  for (let index = 0; index < queue.length; index += 1) {
    for (const childId of childrenByParent.get(queue[index]) ?? []) {
      if (scopedUnitIds.has(childId)) continue;
      scopedUnitIds.add(childId);
      queue.push(childId);
    }
  }

  return [...scopedUnitIds].sort();
}

export async function getSupervisableOrgUnitIds(userId: string) {
  return resolveOrgUnitScopeIds(userId, "canReviewTeam");
}

export const getSupervisedOrgUnitIds = getSupervisableOrgUnitIds;

export async function getManageableActivityOrgUnitIds(userId: string) {
  return resolveOrgUnitScopeIds(userId, "canManageActivities");
}

export async function getSupervisableOrgUnits(userId: string): Promise<SupervisableOrgUnit[]> {
  const ids = await resolveOrgUnitScopeIds(userId, "canReviewTeam");
  if (!ids.length) return [];

  return prisma.orgUnit.findMany({
    where: { id: { in: ids }, active: true },
    select: {
      id: true,
      code: true,
      name: true,
      plant: { select: { id: true, code: true, name: true } }
    },
    orderBy: [{ plant: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }]
  });
}

export function buildIdeaVisibilityWhere(
  user: IdeaAccessUser,
  supervisableOrgUnitIds: string[] = []
): Prisma.IdeaWhereInput {
  if (hasGlobalIdeaAccess(user)) return {};

  const directAssignments: Prisma.IdeaWhereInput[] = [
    { supervisorId: user.id },
    { implementationOwnerId: user.id },
    { area: { is: { supervisorId: user.id } } },
    { approvals: { some: { assignedToId: user.id } } },
    { supportRequests: { some: { assignedToId: user.id } } },
    { followers: { some: { userId: user.id } } },
    {
      escalationRule: {
        is: {
          reviewerMembership: {
            is: { userId: user.id, active: true }
          }
        }
      }
    }
  ];

  if (supervisableOrgUnitIds.length) {
    directAssignments.push(
      {
        area: {
          is: {
            organizationUnit: {
              is: { id: { in: supervisableOrgUnitIds } }
            }
          }
        }
      },
      { escalationRule: { is: { orgUnitId: { in: supervisableOrgUnitIds } } } },
      { participant: { is: { orgUnitId: { in: supervisableOrgUnitIds } } } },
      { supportRequests: { some: { orgUnitId: { in: supervisableOrgUnitIds } } } }
    );
  }

  return { OR: directAssignments };
}

export async function getVisibleIdeasWhere(user: IdeaAccessUser): Promise<Prisma.IdeaWhereInput> {
  if (hasGlobalIdeaAccess(user)) return {};
  const supervisableOrgUnitIds = await resolveOrgUnitScopeIds(user.id, "canReviewTeam");
  return buildIdeaVisibilityWhere(user, supervisableOrgUnitIds);
}

export const getIdeaVisibilityWhere = getVisibleIdeasWhere;

export async function canViewIdea(user: IdeaAccessUser, ideaOrId: string | { id: string }) {
  const ideaId = typeof ideaOrId === "string" ? ideaOrId : ideaOrId.id;
  if (!ideaId) return false;
  if (hasGlobalIdeaAccess(user)) {
    return Boolean(await prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true } }));
  }

  const visibilityWhere = await getVisibleIdeasWhere(user);
  const matchingIdea = await prisma.idea.findFirst({
    where: { AND: [{ id: ideaId }, visibilityWhere] },
    select: { id: true }
  });
  return Boolean(matchingIdea);
}
