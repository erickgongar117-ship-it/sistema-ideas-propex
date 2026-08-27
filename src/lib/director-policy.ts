import "server-only";

import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DIRECTOR_ROLE: Role = "DIRECCION";
export const DIRECTOR_OPERATIONAL_MESSAGE = "Direccion conserva visibilidad de consulta, pero no puede recibir rutas, tareas ni notificaciones operativas.";

export function operationalUserWhere(where: Prisma.UserWhereInput = {}): Prisma.UserWhereInput {
  return {
    AND: [
      where,
      { active: true, role: { not: DIRECTOR_ROLE } }
    ]
  };
}

export async function areOperationalUsers(userIds: Array<string | null | undefined>) {
  const uniqueIds = [...new Set(userIds.filter((userId): userId is string => Boolean(userId)))];
  if (!uniqueIds.length) return true;
  const count = await prisma.user.count({ where: operationalUserWhere({ id: { in: uniqueIds } }) });
  return count === uniqueIds.length;
}

function recipientAddresses(value: string) {
  return value
    .split(/[;,]/)
    .map((address) => address.trim())
    .filter(Boolean);
}

export async function withoutDirectorRecipients(value: string) {
  const recipients = recipientAddresses(value);
  if (!recipients.length) return value;

  const directors = await prisma.user.findMany({
    where: { role: DIRECTOR_ROLE },
    select: { email: true }
  });
  const blocked = new Set(directors.map((director) => director.email.trim().toLowerCase()));
  return recipients.filter((recipient) => !blocked.has(recipient.toLowerCase())).join(";");
}
