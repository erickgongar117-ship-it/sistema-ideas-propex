import "server-only";

import { prisma } from "@/lib/prisma";

export function supportFlags(units: Array<{ code: string; name: string }>) {
  const normalized = units.map((unit) => `${unit.code} ${unit.name}`.toLowerCase()).join(" ");
  return {
    impactsQuality: normalized.includes("calidad") || normalized.includes("inocuidad") || normalized.includes("-cal"),
    impactsSafety: normalized.includes("seguridad") || normalized.includes("ambiente") || normalized.includes("-seg"),
    requiresMaintenance: normalized.includes("mantenimiento") || normalized.includes("servicio") || normalized.includes("-man")
  };
}

function isStandardSupportUnit(unit: { code: string; name: string }) {
  const value = `${unit.code} ${unit.name}`.toLowerCase();
  return value.includes("calidad") || value.includes("inocuidad") || value.includes("-cal") ||
    value.includes("seguridad") || value.includes("ambiente") || value.includes("-seg") ||
    value.includes("mantenimiento") || value.includes("servicio") || value.includes("-man");
}

export async function validSupportUnits(unitIds: string[], plantId?: string | null) {
  const uniqueIds = [...new Set(unitIds.filter(Boolean))];
  if (!uniqueIds.length) return [];
  return prisma.orgUnit.findMany({
    where: {
      id: { in: uniqueIds },
      active: true,
      isSupportArea: true,
      ...(plantId ? { plantId } : {})
    },
    include: {
      routingUser: true,
      memberships: {
        where: { active: true, canReceiveIdeas: true, user: { active: true, role: { not: "DIRECCION" } } },
        include: { user: true },
        orderBy: [{ level: "asc" }, { sortOrder: "asc" }]
      }
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
}

export async function syncIdeaSupportRequests(input: {
  ideaId: string;
  unitIds: string[];
  plantId?: string | null;
  activate: boolean;
}) {
  const units = await validSupportUnits(input.unitIds, input.plantId);
  const additionalUnits = units.filter((unit) => !isStandardSupportUnit(unit));
  const selectedIds = additionalUnits.map((unit) => unit.id);

  await prisma.ideaSupportRequest.updateMany({
    where: {
      ideaId: input.ideaId,
      ...(selectedIds.length ? { orgUnitId: { notIn: selectedIds } } : {})
    },
    data: {
      activatedAt: null,
      status: "PENDING",
      decision: null,
      comments: null,
      decidedAt: null
    }
  });

  const requests = [];
  for (const unit of additionalUnits) {
    const assignedToId = unit.routingUser?.active && unit.routingUser.role !== "DIRECCION"
      ? unit.routingUser.id
      : unit.memberships[0]?.userId ?? null;
    const request = await prisma.ideaSupportRequest.upsert({
      where: { ideaId_orgUnitId: { ideaId: input.ideaId, orgUnitId: unit.id } },
      update: {
        assignedToId,
        ...(input.activate ? { activatedAt: new Date(), status: "PENDING", decision: null, comments: null, decidedAt: null } : {})
      },
      create: {
        ideaId: input.ideaId,
        orgUnitId: unit.id,
        assignedToId,
        activatedAt: input.activate ? new Date() : null
      },
      include: { orgUnit: true, assignedTo: true }
    });
    requests.push(request);
  }
  return { units, requests };
}

export async function managerFollowersForMembership(membershipId: string | null | undefined) {
  if (!membershipId) return [];
  const followers: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = membershipId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const membership: {
      managerMembershipId: string | null;
      managerMembership: {
        userId: string;
        active: boolean;
        user: { active: boolean; role: string };
      } | null;
    } | null = await prisma.orgMembership.findUnique({
      where: { id: currentId },
      select: { managerMembershipId: true, managerMembership: { select: { userId: true, active: true, user: { select: { active: true, role: true } } } } }
    });
    const manager = membership?.managerMembership;
    if (!manager) break;
    if (manager.active && manager.user.active && manager.user.role !== "DIRECCION") followers.push(manager.userId);
    currentId = membership?.managerMembershipId ?? null;
  }
  return [...new Set(followers)];
}
