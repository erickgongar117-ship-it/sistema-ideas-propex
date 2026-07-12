import "server-only";

import type { User } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AccessUser = Pick<User, "id" | "role" | "kaizenAccess" | "genbaAccess">;

export function canManageImprovementModules(user: Pick<User, "role">) {
  return user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
}

export async function userModuleAccess(user: AccessUser) {
  if (canManageImprovementModules(user)) return { kaizen: true, genba: true };
  const [kaizenAssignments, genbaAssignments] = await Promise.all([
    prisma.kaizenProject.count({ where: { OR: [{ leaderId: user.id }, { activities: { some: { ownerId: user.id } } }] } }),
    prisma.genbaWalk.count({ where: { OR: [{ coordinatorId: user.id }, { activities: { some: { ownerId: user.id } } }] } })
  ]);
  return {
    kaizen: user.kaizenAccess || kaizenAssignments > 0,
    genba: user.genbaAccess || genbaAssignments > 0
  };
}

export async function requireKaizenAccess() {
  const user = await requireUser();
  const access = await userModuleAccess(user);
  if (!access.kaizen) redirect("/dashboard?error=acceso-kaizen");
  return { user, canManage: canManageImprovementModules(user) };
}

export async function requireGenbaAccess() {
  const user = await requireUser();
  const access = await userModuleAccess(user);
  if (!access.genba) redirect("/dashboard?error=acceso-genba");
  return { user, canManage: canManageImprovementModules(user) };
}
