import "server-only";

import type { User } from "@prisma/client";
import { canDecideInitialIdea } from "@/lib/idea-access";
import {
  CEO_EMAIL,
  isCeoUser
} from "@/lib/executive-validation-rules";
import { prisma } from "@/lib/prisma";

export {
  blocksIdeaClosure,
  canTargetExecutive,
  CEO_EMAIL,
  executiveValidationLevelFor,
  executiveValidationLevelLabels,
  executiveValidationStatusLabels,
  isCeoUser
} from "@/lib/executive-validation-rules";

export async function executiveValidationTargetsFor(requester: Pick<User, "id" | "email" | "role">) {
  if (requester.role === "GERENTE") {
    const targets = await prisma.user.findMany({
      where: { active: true, role: "DIRECCION", id: { not: requester.id } },
      select: { id: true, name: true, email: true, jobTitle: true },
      orderBy: { name: "asc" }
    });
    return targets.sort((left, right) => Number(isCeoUser(right)) - Number(isCeoUser(left)) || left.name.localeCompare(right.name, "es"));
  }

  if (requester.role === "DIRECCION" && !isCeoUser(requester)) {
    const ceo = await prisma.user.findFirst({
      where: { active: true, role: "DIRECCION", email: CEO_EMAIL },
      select: { id: true, name: true, email: true, jobTitle: true }
    });
    return ceo && ceo.id !== requester.id ? [ceo] : [];
  }

  return [];
}

export async function canRequestExecutiveValidation(
  requester: Pick<User, "id" | "email" | "role">,
  ideaId: string
) {
  if (requester.role === "GERENTE") return canDecideInitialIdea(requester, ideaId);
  return requester.role === "DIRECCION" && !isCeoUser(requester);
}
