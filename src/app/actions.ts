"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ApprovalType, Classification, Priority, Role } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { clearSession, requireUser, setSession } from "@/lib/auth";
import { approvalTypeForRole, impactOptions, requiredApprovalTypes, roleHomePath } from "@/lib/domain";
import { saveUpload } from "@/lib/files";
import { ideaMailBody, notify } from "@/lib/notifications";
import { automaticPointRules } from "@/lib/points";
import { prisma } from "@/lib/prisma";
import { approveSupervisor, markOverdueIdeas, nextFolio, notifyIdeaClosed, updateStatusAfterValidations } from "@/lib/workflow";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const checked = (formData: FormData, key: string) => ["on", "true", "1", "yes", "si"].includes(text(formData, key).toLowerCase());

const ideaSchema = z.object({
  collaboratorName: z.string().min(2),
  areaCode: z.string().min(1),
  shift: z.string().min(1),
  problem: z.string().min(3),
  proposal: z.string().min(3),
  expectedBenefit: z.string().min(2)
});

const userRoles: Role[] = ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"];

export async function loginAction(formData: FormData) {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    redirect("/login?error=credenciales");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    redirect("/login?error=credenciales");
  }

  await setSession(user);
  redirect(roleHomePath(user.role));
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function submitIdeaAction(formData: FormData) {
  const areaCode = text(formData, "areaCode") || "P1";
  const parsed = ideaSchema.safeParse({
    collaboratorName: text(formData, "collaboratorName"),
    areaCode,
    shift: text(formData, "shift"),
    problem: text(formData, "problem"),
    proposal: text(formData, "proposal"),
    expectedBenefit: text(formData, "expectedBenefit")
  });

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => String(issue.path[0])).filter(Boolean);
    redirect(`/captura/${areaCode}?error=datos&campos=${encodeURIComponent([...new Set(fields)].join(","))}`);
  }

  const area = await prisma.area.findFirst({
    where: { code: parsed.data.areaCode, active: true },
    include: { supervisor: true }
  });
  if (!area) redirect(`/captura/${areaCode}?error=area`);

  const selectedImpacts = formData
    .getAll("impactTypes")
    .map(String)
    .filter((impact) => impactOptions.includes(impact));

  const idea = await prisma.idea.create({
    data: {
      folio: await nextFolio(),
      collaboratorName: parsed.data.collaboratorName,
      collaboratorEmail: text(formData, "collaboratorEmail") || null,
      employeeNumber: text(formData, "employeeNumber") || null,
      areaId: area.id,
      shift: parsed.data.shift,
      problem: parsed.data.problem,
      proposal: parsed.data.proposal,
      expectedBenefit: parsed.data.expectedBenefit,
      impactTypes: JSON.stringify(selectedImpacts),
      impactsQuality: checked(formData, "impactsQuality"),
      impactsSafety: checked(formData, "impactsSafety"),
      requiresMaintenance: checked(formData, "requiresMaintenance"),
      status: "EN_REVISION_SUPERVISOR",
      supervisorId: area.supervisorId
    }
  });

  await prisma.approval.create({
    data: {
      ideaId: idea.id,
      type: "SUPERVISOR",
      assignedToId: area.supervisorId,
      status: "PENDING"
    }
  });

  const beforeEvidence = await saveUpload(formData.get("beforeEvidence") as File | null, `${idea.folio}-before`);
  if (beforeEvidence) {
    await prisma.attachment.create({
      data: {
        ideaId: idea.id,
        type: "BEFORE",
        filename: beforeEvidence.filename,
        path: beforeEvidence.path,
        uploadedBy: idea.collaboratorName
      }
    });
  }

  await auditLog({
    entity: "Idea",
    entityId: idea.id,
    action: "IDEA_CREATED",
    details: { area: area.code, supervisorId: area.supervisorId }
  });

  await notify({
    ideaId: idea.id,
    to: area.supervisor?.email ?? "",
    subject: `Nueva idea de mejora pendiente de revision - Folio ${idea.folio} - Area ${area.code}`,
    body: ideaMailBody({
      folio: idea.folio,
      area: area.code,
      problem: idea.problem,
      proposal: idea.proposal,
      action: "Revision de supervisor",
      ideaId: idea.id
    }),
    channels: ["EMAIL", "TEAMS"]
  });

  revalidatePath("/");
  redirect(`/captura/gracias?folio=${encodeURIComponent(idea.folio)}&area=${encodeURIComponent(area.code)}`);
}

export async function supervisorDecisionAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "SUPERVISOR"]);
  const ideaId = text(formData, "ideaId");
  const decision = text(formData, "decision");
  const comments = text(formData, "comments");

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true, supervisor: true }
  });
  if (user.role === "SUPERVISOR" && idea.supervisorId !== user.id) redirect("/supervisor");

  if (decision === "RECHAZAR") {
    if (!comments) redirect(`/ideas/${ideaId}?error=justificacion`);
    await prisma.approval.upsert({
      where: { ideaId_type: { ideaId, type: "SUPERVISOR" } },
      update: { status: "REJECTED", decision: "RECHAZAR", comments, decidedAt: new Date(), assignedToId: user.id },
      create: { ideaId, type: "SUPERVISOR", status: "REJECTED", decision: "RECHAZAR", comments, decidedAt: new Date(), assignedToId: user.id }
    });
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "RECHAZADA_SUPERVISOR", rejectionReason: comments }
    });
    await auditLog({ entity: "Idea", entityId: ideaId, action: "SUPERVISOR_REJECTED", userId: user.id, details: { comments } });
    await notify({
      ideaId,
      to: idea.collaboratorEmail ?? "",
      subject: `Idea rechazada por supervisor - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({
        folio: idea.folio,
        area: idea.area.code,
        problem: idea.problem,
        proposal: idea.proposal,
        action: `Rechazada: ${comments}`,
        ideaId
      })
    });
  }

  if (decision === "SOLICITAR_INFORMACION") {
    if (!comments) redirect(`/ideas/${ideaId}?error=informacion`);
    await prisma.approval.upsert({
      where: { ideaId_type: { ideaId, type: "SUPERVISOR" } },
      update: { status: "MORE_INFO", decision: "SOLICITAR_INFORMACION", comments, decidedAt: new Date(), assignedToId: user.id },
      create: {
        ideaId,
        type: "SUPERVISOR",
        status: "MORE_INFO",
        decision: "SOLICITAR_INFORMACION",
        comments,
        decidedAt: new Date(),
        assignedToId: user.id
      }
    });
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "SOLICITUD_INFORMACION", moreInfoRequest: comments }
    });
    await auditLog({ entity: "Idea", entityId: ideaId, action: "SUPERVISOR_MORE_INFO", userId: user.id, details: { comments } });
    await notify({
      ideaId,
      to: idea.collaboratorEmail ?? "",
      subject: `Solicitud de mas informacion - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({
        folio: idea.folio,
        area: idea.area.code,
        problem: idea.problem,
        proposal: idea.proposal,
        action: comments,
        ideaId
      })
    });
  }

  if (decision === "APROBAR") {
    await approveSupervisor(ideaId, user.id);
  }

  revalidatePath("/");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function validationDecisionAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"]);
  const ideaId = text(formData, "ideaId");
  const decision = text(formData, "decision");
  const comments = text(formData, "comments");
  const explicitType = text(formData, "type") as ApprovalType;
  const type = user.role === "ADMIN" && explicitType ? explicitType : approvalTypeForRole(user.role);
  if (!type || !requiredApprovalTypes({ impactsQuality: true, impactsSafety: true, requiresMaintenance: true }).includes(type)) redirect("/dashboard");
  if ((decision === "RECHAZAR" || decision === "SOLICITAR_INFORMACION") && !comments) redirect(`/ideas/${ideaId}?error=justificacion`);

  const idea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, include: { area: true, supervisor: true } });
  const status = decision === "APROBAR" ? "APPROVED" : decision === "RECHAZAR" ? "REJECTED" : "MORE_INFO";
  await prisma.approval.upsert({
    where: { ideaId_type: { ideaId, type } },
    update: {
      assignedToId: user.id,
      status,
      decision: decision === "APROBAR" ? "APROBAR" : decision === "RECHAZAR" ? "RECHAZAR" : "SOLICITAR_INFORMACION",
      comments: comments || null,
      decidedAt: new Date()
    },
    create: {
      ideaId,
      type,
      assignedToId: user.id,
      status,
      decision: decision === "APROBAR" ? "APROBAR" : decision === "RECHAZAR" ? "RECHAZAR" : "SOLICITAR_INFORMACION",
      comments: comments || null,
      decidedAt: new Date()
    }
  });

  if (decision === "RECHAZAR") {
    await prisma.idea.update({ where: { id: ideaId }, data: { status: "RECHAZADA_VALIDACION", rejectionReason: comments } });
  } else if (decision === "SOLICITAR_INFORMACION") {
    await prisma.idea.update({ where: { id: ideaId }, data: { status: "SOLICITUD_INFORMACION", moreInfoRequest: comments } });
  } else {
    await updateStatusAfterValidations(ideaId);
  }

  await auditLog({ entity: "Idea", entityId: ideaId, action: `${type}_${decision}`, userId: user.id, details: { comments } });
  const recipients = [idea.supervisor?.email].filter((value): value is string => Boolean(value));
  const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
  recipients.push(...mcUsers.map((mcUser) => mcUser.email));
  for (const to of new Set(recipients)) {
    await notify({
      ideaId,
      to,
      subject: `Validacion ${decision.toLowerCase()} - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({
        folio: idea.folio,
        area: idea.area.code,
        problem: idea.problem,
        proposal: idea.proposal,
        action: `${type}: ${comments || decision}`,
        ideaId
      })
    });
  }

  revalidatePath("/");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function classifyIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const classification = text(formData, "classification") as Classification;
  const priority = text(formData, "priority") as Priority;
  const mcComments = text(formData, "mcComments");

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      classification,
      priority,
      mcComments: mcComments || null,
      status: "CLASIFICACION_MEJORA_CONTINUA"
    }
  });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "MC_CLASSIFIED", userId: user.id, details: { classification, priority } });
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function assignImplementationAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const ownerId = text(formData, "ownerId");
  const dueDateText = text(formData, "dueDate");
  const priority = text(formData, "priority") as Priority;
  if (!ownerId || !dueDateText) redirect(`/ideas/${ideaId}?error=asignacion`);

  const idea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      implementationOwnerId: ownerId,
      dueDate: new Date(`${dueDateText}T12:00:00`),
      priority,
      requiresEvidence: checked(formData, "requiresEvidence"),
      status: "EN_IMPLEMENTACION"
    },
    include: { area: true, implementationOwner: true }
  });

  await auditLog({ entity: "Idea", entityId: ideaId, action: "IMPLEMENTATION_ASSIGNED", userId: user.id, details: { ownerId, dueDateText } });
  await notify({
    ideaId,
    to: idea.implementationOwner?.email ?? "",
    subject: `Responsable asignado - Folio ${idea.folio} - Area ${idea.area.code}`,
    body: ideaMailBody({
      folio: idea.folio,
      area: idea.area.code,
      problem: idea.problem,
      proposal: idea.proposal,
      action: `Implementar antes de ${dueDateText}`,
      ideaId
    })
  });

  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function implementationUpdateAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"]);
  const ideaId = text(formData, "ideaId");
  const comments = text(formData, "comments");
  const markImplemented = checked(formData, "markImplemented");

  const idea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId } });
  if (user.role === "SUPERVISOR" && idea.supervisorId !== user.id) redirect(`/ideas/${ideaId}`);

  const afterEvidence = await saveUpload(formData.get("afterEvidence") as File | null, `${idea.folio}-after`);
  if (afterEvidence) {
    await prisma.attachment.create({
      data: {
        ideaId,
        type: "AFTER",
        filename: afterEvidence.filename,
        path: afterEvidence.path,
        uploadedBy: user.name
      }
    });
  }

  if (comments) {
    await prisma.comment.create({ data: { ideaId, userId: user.id, comment: comments } });
  }

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: markImplemented ? "IMPLEMENTADA" : "EN_IMPLEMENTACION",
      implementedAt: markImplemented ? new Date() : idea.implementedAt
    }
  });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "IMPLEMENTATION_UPDATED", userId: user.id, details: { markImplemented, hasEvidence: Boolean(afterEvidence) } });
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function closeIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const selectedRuleIds = new Set(formData.getAll("pointRuleIds").map(String));
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { approvals: true, attachments: true }
  });

  const hasAfterEvidence = idea.attachments.some((attachment) => attachment.type === "AFTER");
  if (idea.requiresEvidence && !hasAfterEvidence) redirect(`/ideas/${ideaId}?error=evidencia`);

  const selectedRules = await prisma.pointRule.findMany({
    where: { id: { in: [...selectedRuleIds] }, active: true },
    orderBy: { createdAt: "asc" }
  });
  const pointAdjustments = new Map<string, number>();
  for (const rule of selectedRules) {
    const value = Number(text(formData, `points-${rule.id}`));
    pointAdjustments.set(rule.id, Number.isFinite(value) ? Math.max(0, value) : rule.points);
  }
  const totalPoints = selectedRules.reduce((sum, rule) => sum + (pointAdjustments.get(rule.id) ?? rule.points), 0);
  await prisma.ideaPointRule.deleteMany({ where: { ideaId } });
  for (const rule of selectedRules) {
    await prisma.ideaPointRule.create({
      data: {
        ideaId,
        pointRuleId: rule.id,
        points: pointAdjustments.get(rule.id) ?? rule.points
      }
    });
  }

  await prisma.approval.upsert({
    where: { ideaId_type: { ideaId, type: "MEJORA_CONTINUA_FINAL" } },
    update: { assignedToId: user.id, status: "APPROVED", decision: "APROBAR", decidedAt: new Date(), comments: "Cierre final validado." },
    create: {
      ideaId,
      type: "MEJORA_CONTINUA_FINAL",
      assignedToId: user.id,
      status: "APPROVED",
      decision: "APROBAR",
      decidedAt: new Date(),
      comments: "Cierre final validado."
    }
  });

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: "CERRADA",
      closedAt: new Date(),
      pointsAssigned: totalPoints
    }
  });
  await auditLog({
    entity: "Idea",
    entityId: ideaId,
    action: "IDEA_CLOSED_REVIEWED_POINTS",
    userId: user.id,
    details: {
      totalPoints,
      selectedRuleIds: selectedRules.map((rule) => rule.id),
      selectedRules: selectedRules.map((rule) => ({
        name: rule.name,
        defaultPoints: rule.points,
        assignedPoints: pointAdjustments.get(rule.id) ?? rule.points
      }))
    }
  });
  await notifyIdeaClosed(ideaId);
  revalidatePath("/dashboard");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function removeIdeaPointsAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const reason = text(formData, "reason");
  if (!reason) redirect(`/ideas/${ideaId}?error=justificacion`);

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { pointRuleSelections: { include: { pointRule: true } } }
  });

  await prisma.ideaPointRule.deleteMany({ where: { ideaId } });
  await prisma.idea.update({ where: { id: ideaId }, data: { pointsAssigned: 0 } });
  await prisma.comment.create({
    data: {
      ideaId,
      userId: user.id,
      comment: `Mejora Continua retiro los puntos automaticos. Motivo: ${reason}`
    }
  });
  await auditLog({
    entity: "Idea",
    entityId: ideaId,
    action: "AUTO_POINTS_REMOVED",
    userId: user.id,
    details: {
      previousPoints: idea.pointsAssigned,
      previousRules: idea.pointRuleSelections.map((selection) => selection.pointRule.name),
      reason
    }
  });
  revalidatePath("/dashboard");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function cancelIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const reason = text(formData, "reason");
  if (!reason) redirect(`/ideas/${ideaId}?error=justificacion`);
  await prisma.idea.update({ where: { id: ideaId }, data: { status: "CANCELADA", rejectionReason: reason } });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "IDEA_CANCELLED", userId: user.id, details: { reason } });
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function addCommentAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = text(formData, "ideaId");
  const comment = text(formData, "comment");
  if (!comment) redirect(`/ideas/${ideaId}`);
  await prisma.comment.create({ data: { ideaId, userId: user.id, comment } });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "COMMENT_ADDED", userId: user.id, details: { comment } });
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function updateAreaAction(formData: FormData) {
  const user = await requireUser(["ADMIN"]);
  const areaId = text(formData, "areaId");
  await prisma.area.update({
    where: { id: areaId },
    data: {
      name: text(formData, "name"),
      supervisorId: text(formData, "supervisorId") || null,
      active: checked(formData, "active")
    }
  });
  await auditLog({ entity: "Area", entityId: areaId, action: "AREA_UPDATED", userId: user.id });
  revalidatePath("/configuracion");
}

export async function updatePointRuleAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const pointRuleId = text(formData, "pointRuleId");
  await prisma.pointRule.update({
    where: { id: pointRuleId },
    data: {
      name: text(formData, "name"),
      description: text(formData, "description"),
      points: Number(text(formData, "points") || 0),
      active: checked(formData, "active")
    }
  });
  await auditLog({ entity: "PointRule", entityId: pointRuleId, action: "POINT_RULE_UPDATED", userId: user.id });
  revalidatePath("/configuracion");
}

export async function createPointRuleAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const rule = await prisma.pointRule.create({
    data: {
      name: text(formData, "name"),
      description: text(formData, "description"),
      points: Number(text(formData, "points") || 0),
      active: true
    }
  });
  await auditLog({ entity: "PointRule", entityId: rule.id, action: "POINT_RULE_CREATED", userId: user.id });
  revalidatePath("/configuracion");
}

export async function updateSupportSettingsAction(formData: FormData) {
  const user = await requireUser(["ADMIN"]);
  const value = JSON.stringify({
    calidad: text(formData, "calidad"),
    seguridad: text(formData, "seguridad"),
    mantenimiento: text(formData, "mantenimiento"),
    mejoraContinua: text(formData, "mejoraContinua")
  });
  await prisma.setting.upsert({
    where: { key: "supportEmails" },
    update: { value },
    create: { key: "supportEmails", value }
  });
  await auditLog({ entity: "Setting", entityId: "supportEmails", action: "SUPPORT_EMAILS_UPDATED", userId: user.id });
  revalidatePath("/configuracion");
}

export async function createUserAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const role = text(formData, "role") as Role;
  if (!userRoles.includes(role)) redirect("/configuracion?error=rol");

  const email = text(formData, "email").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/configuracion?error=correo");
  const password = text(formData, "password") || "admin123";
  const user = await prisma.user.create({
    data: {
      name: text(formData, "name"),
      email,
      role,
      active: checked(formData, "active"),
      passwordHash: await bcrypt.hash(password, 10)
    }
  });
  await auditLog({ entity: "User", entityId: user.id, action: "USER_CREATED", userId: admin.id, details: { email, role } });
  revalidatePath("/configuracion");
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const userId = text(formData, "userId");
  const role = text(formData, "role") as Role;
  if (!userRoles.includes(role)) redirect("/configuracion?error=rol");

  const email = text(formData, "email").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) redirect("/configuracion?error=correo");
  const password = text(formData, "password");
  const data = {
    name: text(formData, "name"),
    email,
    role,
    active: checked(formData, "active"),
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {})
  };

  const user = await prisma.user.update({ where: { id: userId }, data });
  await auditLog({ entity: "User", entityId: user.id, action: "USER_UPDATED", userId: admin.id, details: { email: user.email, role } });
  revalidatePath("/configuracion");
}

export async function markNotificationAction(formData: FormData) {
  const user = await requireUser();
  const notificationId = text(formData, "notificationId");
  const where =
    user.role === "ADMIN" || user.role === "MEJORA_CONTINUA"
      ? { id: notificationId }
      : { id: notificationId, to: { contains: user.email } };
  const notification = await prisma.notificationOutbox.findFirst({ where });
  if (!notification) redirect("/notificaciones");
  await prisma.notificationOutbox.update({
    where: { id: notification.id },
    data: { status: "DISMISSED" }
  });
  revalidatePath("/notificaciones");
}

export async function retryNotificationAction(formData: FormData) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const notification = await prisma.notificationOutbox.findUniqueOrThrow({
    where: { id: text(formData, "notificationId") }
  });
  await notify({
    ideaId: notification.ideaId,
    to: notification.to,
    subject: notification.subject,
    body: notification.body,
    channels: [notification.channel]
  });
  await prisma.notificationOutbox.update({ where: { id: notification.id }, data: { status: "DISMISSED" } });
  revalidatePath("/notificaciones");
}

export async function runRemindersAction() {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  await markOverdueIdeas(user.id);
  revalidatePath("/");
  revalidatePath("/vencidas");
}
