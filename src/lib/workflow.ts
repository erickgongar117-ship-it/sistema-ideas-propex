import { ApprovalStatus, ApprovalType, IdeaStatus, Role } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { nextValidationStatus, requiredApprovalTypes, statusForApprovalType, validationOrder } from "@/lib/domain";
import { ideaMailBody, notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const supportRoleForApproval: Partial<Record<ApprovalType, Role>> = {
  CALIDAD: "CALIDAD",
  SEGURIDAD: "SEGURIDAD",
  MANTENIMIENTO: "MANTENIMIENTO"
};

export async function nextFolio() {
  const latest = await prisma.idea.findFirst({
    where: { folio: { startsWith: "IM-" } },
    orderBy: { folio: "desc" },
    select: { folio: true }
  });
  const current = Number(latest?.folio.replace(/^IM-/, "")) || 0;
  return `IM-${String(current + 1).padStart(6, "0")}`;
}

export async function supportUserFor(type: ApprovalType) {
  const role = supportRoleForApproval[type];
  if (!role) return null;
  return prisma.user.findFirst({ where: { role, active: true }, orderBy: { createdAt: "asc" } });
}

export async function supportUsersFor(type: ApprovalType) {
  const role = supportRoleForApproval[type];
  if (!role) return [];
  return prisma.user.findMany({ where: { role, active: true }, orderBy: { createdAt: "asc" } });
}

export async function createValidationApprovals(ideaId: string) {
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true }
  });
  const required = requiredApprovalTypes(idea);

  await prisma.approval.deleteMany({
    where: { ideaId, type: { in: validationOrder.filter((type) => !required.includes(type)) } }
  });

  for (const type of required) {
    const supportUsers = await supportUsersFor(type);
    const assignedTo = supportUsers[0] ?? null;
    await prisma.approval.upsert({
      where: { ideaId_type: { ideaId, type } },
      update: {
        assignedToId: assignedTo?.id,
        status: "PENDING",
        decision: null,
        comments: null,
        decidedAt: null
      },
      create: {
        ideaId,
        type,
        assignedToId: assignedTo?.id
      }
    });

    for (const supportUser of supportUsers) {
      await notify({
        ideaId,
        to: supportUser.email,
        subject: `Idea de mejora pendiente de validacion - Folio ${idea.folio} - Area ${idea.area.code}`,
        body: ideaMailBody({
          folio: idea.folio,
          area: idea.area.code,
          problem: idea.problem,
          proposal: idea.proposal,
          action: `Validar como ${type}`,
          ideaId
        }),
        channels: ["EMAIL", "TEAMS"]
      });
    }
  }

  return required;
}

export async function updateStatusAfterValidations(ideaId: string) {
  const approvals = await prisma.approval.findMany({
    where: { ideaId, type: { in: validationOrder } },
    orderBy: { createdAt: "asc" }
  });

  if (approvals.some((approval) => approval.status === "REJECTED")) {
    await prisma.idea.update({ where: { id: ideaId }, data: { status: "RECHAZADA_VALIDACION" } });
    return "RECHAZADA_VALIDACION" satisfies IdeaStatus;
  }

  if (approvals.some((approval) => approval.status === "MORE_INFO")) {
    await prisma.idea.update({ where: { id: ideaId }, data: { status: "SOLICITUD_INFORMACION" } });
    return "SOLICITUD_INFORMACION" satisfies IdeaStatus;
  }

  const pending = approvals.filter((approval) => approval.status === "PENDING").map((approval) => approval.type);
  if (pending.length === 0) {
    const idea = await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "APROBADA_PARA_IMPLEMENTAR" },
      include: { area: true }
    });
    const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
    for (const user of mcUsers) {
      await notify({
        ideaId,
        to: user.email,
        subject: `Idea aprobada para implementar - Folio ${idea.folio} - Area ${idea.area.code}`,
        body: ideaMailBody({
          folio: idea.folio,
          area: idea.area.code,
          problem: idea.problem,
          proposal: idea.proposal,
          action: "Clasificar y asignar responsable",
          ideaId
        })
      });
    }
    return "APROBADA_PARA_IMPLEMENTAR" satisfies IdeaStatus;
  }

  const nextStatus = statusForApprovalType(pending[0]);
  await prisma.idea.update({ where: { id: ideaId }, data: { status: nextStatus } });
  return nextStatus;
}

export async function approveSupervisor(ideaId: string, userId: string) {
  await prisma.approval.upsert({
    where: { ideaId_type: { ideaId, type: "SUPERVISOR" } },
    update: { status: "APPROVED", decision: "APROBAR", decidedAt: new Date() },
    create: { ideaId, type: "SUPERVISOR", assignedToId: userId, status: "APPROVED", decision: "APROBAR", decidedAt: new Date() }
  });

  const required = await createValidationApprovals(ideaId);
  const status = required.length ? nextValidationStatus(required) : "APROBADA_PARA_IMPLEMENTAR";
  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status,
      rejectionReason: null,
      moreInfoRequest: null
    }
  });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "SUPERVISOR_APPROVED", userId, details: { status } });
  if (!required.length) await updateStatusAfterValidations(ideaId);
}

export async function notifyIdeaClosed(ideaId: string, options: { coinsUpdated?: boolean } = {}) {
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true, supervisor: true, approvals: { include: { assignedTo: true } } }
  });
  const recipients = new Set<string>();
  if (idea.collaboratorEmail) recipients.add(idea.collaboratorEmail);
  if (idea.supervisor?.email) recipients.add(idea.supervisor.email);
  idea.approvals.forEach((approval) => {
    if (approval.assignedTo?.email) recipients.add(approval.assignedTo.email);
  });
  const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
  mcUsers.forEach((user) => recipients.add(user.email));

  for (const to of recipients) {
    await notify({
      ideaId,
      to,
      subject: `${options.coinsUpdated ? "ProbocaCoins actualizadas" : "Idea de mejora cerrada"} - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({
        folio: idea.folio,
        area: idea.area.code,
        problem: idea.problem,
        proposal: idea.proposal,
        action: options.coinsUpdated
          ? `Mejora Continua actualizo la recompensa a ${idea.pointsAssigned} ProbocaCoins`
          : `Idea cerrada con ${idea.pointsAssigned} ProbocaCoins`,
        ideaId
      })
    });
  }
}

export async function markOverdueIdeas(userId?: string | null) {
  const overdueIdeas = await prisma.idea.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { notIn: ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION", "VENCIDA"] }
    },
    include: { area: true, supervisor: true, implementationOwner: true }
  });

  for (const idea of overdueIdeas) {
    await prisma.idea.update({ where: { id: idea.id }, data: { status: "VENCIDA" } });
    await auditLog({ entity: "Idea", entityId: idea.id, action: "MARKED_OVERDUE", userId, details: { dueDate: idea.dueDate } });
    const recipients = new Set<string>();
    if (idea.implementationOwner?.email) recipients.add(idea.implementationOwner.email);
    if (idea.supervisor?.email) recipients.add(idea.supervisor.email);
    const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
    mcUsers.forEach((user) => recipients.add(user.email));

    for (const to of recipients) {
      await notify({
        ideaId: idea.id,
        to,
        subject: `Idea vencida - Folio ${idea.folio} - Area ${idea.area.code}`,
        body: ideaMailBody({
          folio: idea.folio,
          area: idea.area.code,
          problem: idea.problem,
          proposal: idea.proposal,
          action: "Revisar fecha compromiso y actualizar avance",
          ideaId: idea.id
        })
      });
    }
  }

  return overdueIdeas.length;
}
