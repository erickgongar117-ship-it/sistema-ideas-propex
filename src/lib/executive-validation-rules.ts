import type { ExecutiveValidationLevel, ExecutiveValidationStatus, Prisma, User } from "@prisma/client";

export const CEO_EMAIL = "osbaldo.montano@proboca.net";

export const executiveValidationStatusLabels: Record<ExecutiveValidationStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  MORE_INFO: "Más información",
  CANCELLED: "Cancelada"
};

export const executiveValidationLevelLabels: Record<ExecutiveValidationLevel, string> = {
  DIRECTOR: "Dirección",
  CEO: "CEO"
};

export function isCeoUser(user: Pick<User, "email">) {
  return user.email.trim().toLowerCase() === CEO_EMAIL;
}

export function executiveValidationLevelFor(user: Pick<User, "email">): ExecutiveValidationLevel {
  return isCeoUser(user) ? "CEO" : "DIRECTOR";
}

export function blocksIdeaClosure(status: ExecutiveValidationStatus) {
  return !["APPROVED", "CANCELLED"].includes(status);
}

export function canTargetExecutive(
  requester: Pick<User, "id" | "email" | "role">,
  target: Pick<User, "id" | "email" | "role" | "active">
) {
  if (!target.active || target.role !== "DIRECCION" || requester.id === target.id) return false;
  if (requester.role === "GERENTE") return true;
  return requester.role === "DIRECCION" && !isCeoUser(requester) && isCeoUser(target);
}

export function buildExecutiveValidationIdeaScope(
  requester: Pick<User, "email" | "role">,
  orgUnitIds: string[] = []
): Prisma.IdeaWhereInput | null {
  const openIdea: Prisma.IdeaWhereInput = { status: { notIn: ["CERRADA", "CANCELADA"] } };

  if (requester.role === "DIRECCION") return isCeoUser(requester) ? null : openIdea;
  if (requester.role !== "GERENTE" || !orgUnitIds.length) return null;

  return {
    AND: [
      openIdea,
      {
        OR: [
          { area: { is: { organizationUnit: { is: { id: { in: orgUnitIds } } } } } },
          { escalationRule: { is: { orgUnitId: { in: orgUnitIds } } } },
          { participant: { is: { orgUnitId: { in: orgUnitIds } } } }
        ]
      }
    ]
  };
}
