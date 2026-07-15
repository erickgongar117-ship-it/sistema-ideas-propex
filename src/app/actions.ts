"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type ApprovalType, type Classification, type GenbaStatus, type IdeaCategory, type KaizenStatus, type Priority, type Role, type WorkItemStatus } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { clearSession, requireUser, setSession } from "@/lib/auth";
import { approvalTypeForRole, genbaDepartments, impactOptions, nextValidationStatus, requiredApprovalTypes, roleHomePath } from "@/lib/domain";
import { saveUpload } from "@/lib/files";
import { createKaizenFromIdea } from "@/lib/kaizen-from-idea";
import { managerialFactorForRule } from "@/lib/managerial-evaluation";
import { userModuleAccess } from "@/lib/module-access";
import { ideaMailBody, notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";
import { approveSupervisor, createValidationApprovals, markOverdueIdeas, nextFolio, notifyIdeaClosed, updateStatusAfterValidations } from "@/lib/workflow";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const checked = (formData: FormData, key: string) => ["on", "true", "1", "yes", "si"].includes(text(formData, key).toLowerCase());
const numberOrNull = (formData: FormData, key: string) => {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const dateOrNull = (formData: FormData, key: string) => {
  const value = text(formData, key);
  return value ? new Date(`${value}T12:00:00`) : null;
};
const isImprovementManager = (role: Role) => role === "ADMIN" || role === "MEJORA_CONTINUA";

const ideaSchema = z.object({
  collaboratorName: z.string().min(2),
  areaCode: z.string().min(1),
  shift: z.string().min(1),
  problem: z.string().min(3),
  proposal: z.string().min(3),
  expectedBenefit: z.string().min(2),
  category: z.enum(["A", "B", "C"])
});

const userRoles: Role[] = ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"];
const emailSchema = z.string().trim().toLowerCase().email();

async function userWithNormalizedEmail(email: string) {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  return users.find((user) => user.email.trim().toLowerCase() === email) ?? null;
}

async function notifyModuleAssignment(input: { to?: string | null; subject: string; lines: string[]; path: string }) {
  await notify({
    to: input.to ?? "",
    subject: input.subject,
    body: [...input.lines, `Liga directa: ${appBaseUrl()}${input.path}`].join("\n")
  });
}

async function refreshKaizenProject(projectId: string) {
  const project = await prisma.kaizenProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { activities: true }
  });
  if (project.status === "CANCELADO") return;
  const relevant = project.activities.filter((activity) => activity.status !== "COMBINADA");
  const complete = relevant.length > 0 && relevant.every((activity) => activity.status === "COMPLETADA" || activity.status === "CANCELADA");
  if (complete) {
    await prisma.kaizenProject.update({ where: { id: projectId }, data: { status: "COMPLETADO", closedAt: new Date() } });
    if (project.sourceIdeaId) {
      await prisma.idea.update({ where: { id: project.sourceIdeaId }, data: { status: "IMPLEMENTADA", implementedAt: new Date() } });
    }
  } else if (project.status === "COMPLETADO") {
    await prisma.kaizenProject.update({ where: { id: projectId }, data: { status: "EN_CURSO", closedAt: null } });
  }
}

async function refreshGenbaWalk(walkId: string) {
  const walk = await prisma.genbaWalk.findUniqueOrThrow({ where: { id: walkId }, include: { activities: true } });
  if (walk.status === "CANCELADO") return;
  const relevant = walk.activities.filter((activity) => activity.status !== "COMBINADA");
  const complete = relevant.length > 0 && relevant.every((activity) => activity.status === "COMPLETADA" || activity.status === "CANCELADA");
  await prisma.genbaWalk.update({
    where: { id: walkId },
    data: complete ? { status: "CERRADO", closedAt: new Date() } : { status: "ABIERTO", closedAt: null }
  });
}

export async function loginAction(formData: FormData) {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const destination = text(formData, "destination");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    redirect("/login?error=credenciales");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    redirect("/login?error=credenciales");
  }

  await setSession(user);
  const access = await userModuleAccess(user);
  if (destination === "kaizen" && access.kaizen) redirect("/kaizen");
  if (destination === "genba" && access.genba) redirect("/genba");
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
    expectedBenefit: text(formData, "expectedBenefit"),
    category: text(formData, "category")
  });

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => String(issue.path[0])).filter(Boolean);
    const category = text(formData, "category");
    redirect(`/captura/${areaCode}?error=datos&campos=${encodeURIComponent([...new Set(fields)].join(","))}&categoria=${encodeURIComponent(category)}`);
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
  const selectedSupport = {
    impactsQuality: parsed.data.category === "A" ? false : checked(formData, "impactsQuality"),
    impactsSafety: parsed.data.category === "A" ? false : checked(formData, "impactsSafety"),
    requiresMaintenance: parsed.data.category === "A" ? false : checked(formData, "requiresMaintenance")
  };
  const externalSupportDetails = text(formData, "externalSupportDetails");
  if (parsed.data.category === "C" && externalSupportDetails.length < 3) {
    redirect(`/captura/${areaCode}?error=datos&campos=externalSupportDetails&categoria=C`);
  }

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
      category: parsed.data.category,
      ...selectedSupport,
      requiresExternalSupport: parsed.data.category === "C",
      externalSupportDetails: parsed.data.category === "C" ? externalSupportDetails : null,
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
    const support = {
      impactsQuality: checked(formData, "impactsQuality"),
      impactsSafety: checked(formData, "impactsSafety"),
      requiresMaintenance: checked(formData, "requiresMaintenance")
    };
    const category: IdeaCategory = idea.category === "C" ? "C" : Object.values(support).some(Boolean) ? "B" : "A";
    await prisma.idea.update({ where: { id: ideaId }, data: { ...support, category } });
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

export async function reopenRejectedIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const justification = text(formData, "justification");
  if (!justification) redirect(`/ideas/${ideaId}?error=justificacion`);

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true, supervisor: true }
  });
  if (!["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status)) redirect(`/ideas/${ideaId}`);

  const support = {
    impactsQuality: checked(formData, "impactsQuality"),
    impactsSafety: checked(formData, "impactsSafety"),
    requiresMaintenance: checked(formData, "requiresMaintenance")
  };
  const category: IdeaCategory = idea.category === "C" ? "C" : Object.values(support).some(Boolean) ? "B" : "A";

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      ...support,
      category,
      rejectionReason: null,
      moreInfoRequest: null,
      mcComments: justification
    }
  });
  await prisma.approval.upsert({
    where: { ideaId_type: { ideaId, type: "SUPERVISOR" } },
    update: { status: "APPROVED", decision: "APROBAR", comments: `Revalidada por Mejora Continua: ${justification}`, decidedAt: new Date() },
    create: { ideaId, type: "SUPERVISOR", assignedToId: idea.supervisorId, status: "APPROVED", decision: "APROBAR", comments: `Revalidada por Mejora Continua: ${justification}`, decidedAt: new Date() }
  });

  const required = await createValidationApprovals(ideaId);
  const status = required.length ? nextValidationStatus(required) : "APROBADA_PARA_IMPLEMENTAR";
  await prisma.idea.update({ where: { id: ideaId }, data: { status } });
  await prisma.comment.create({ data: { ideaId, userId: user.id, comment: `Mejora Continua reabrió la idea. Justificación: ${justification}` } });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "MC_REOPENED_REJECTED_IDEA", userId: user.id, details: { justification, support, status } });

  const recipients = new Set<string>();
  if (idea.supervisor?.email) recipients.add(idea.supervisor.email);
  if (idea.collaboratorEmail) recipients.add(idea.collaboratorEmail);
  for (const to of recipients) {
    await notify({
      ideaId,
      to,
      subject: `Idea reabierta por Mejora Continua - Folio ${idea.folio} - Area ${idea.area.code}`,
      body: ideaMailBody({ folio: idea.folio, area: idea.area.code, problem: idea.problem, proposal: idea.proposal, action: `Revalidada: ${justification}`, ideaId })
    });
  }

  revalidatePath("/mejora");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function classifyIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const classification = text(formData, "classification") as Classification;
  const priority = text(formData, "priority") as Priority;
  const mcComments = text(formData, "mcComments");
  const currentIdea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { status: true } });
  if (["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(currentIdea.status)) redirect(`/ideas/${ideaId}?error=justificacion`);

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
  if (classification === "KAIZEN") {
    const startDate = new Date();
    const kaizenProject = await createKaizenFromIdea({
      ideaId,
      leaderId: user.id,
      startDate,
      endDate: new Date(startDate.getTime() + 90 * 86_400_000),
      createdById: user.id,
      updateExisting: false
    });
    await auditLog({
      entity: "KaizenProject",
      entityId: kaizenProject.id,
      action: "AUTO_CREATED_FROM_CLASSIFICATION",
      userId: user.id,
      details: { ideaId, folio: kaizenProject.folio }
    });
    revalidatePath("/kaizen");
  }
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
  const currentIdea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { status: true, classification: true } });
  if (["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(currentIdea.status)) redirect(`/ideas/${ideaId}?error=justificacion`);

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

  let kaizenProject: Awaited<ReturnType<typeof createKaizenFromIdea>> | null = null;
  if (currentIdea.classification === "KAIZEN") {
    kaizenProject = await createKaizenFromIdea({
      ideaId,
      leaderId: ownerId,
      startDate: new Date(),
      endDate: new Date(`${dueDateText}T12:00:00`),
      createdById: user.id
    });
    await auditLog({ entity: "KaizenProject", entityId: kaizenProject.id, action: "CREATED_FROM_IDEA", userId: user.id, details: { ideaId, folio: kaizenProject.folio } });
    await notifyModuleAssignment({
      to: idea.implementationOwner?.email,
      subject: `Nuevo proyecto Kaizen ${kaizenProject.folio}`,
      lines: [`Proyecto: ${kaizenProject.title}`, `Origen: idea ${idea.folio}`, "Acción requerida: cargar Project Charter y plan de actividades."],
      path: `/kaizen/${kaizenProject.id}`
    });
  }

  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/kaizen");
  if (kaizenProject) redirect(`/kaizen/${kaizenProject.id}`);
  redirect(`/ideas/${ideaId}`);
}

export async function implementationUpdateAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"]);
  const ideaId = text(formData, "ideaId");
  const comments = text(formData, "comments");
  const markImplemented = checked(formData, "markImplemented");

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: true, supervisor: true, implementationOwner: true }
  });
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

  const updatedIdea = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: markImplemented ? "IMPLEMENTADA" : "EN_IMPLEMENTACION",
      implementedAt: markImplemented ? new Date() : idea.implementedAt
    },
    include: { area: true, supervisor: true, implementationOwner: true }
  });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "IMPLEMENTATION_UPDATED", userId: user.id, details: { markImplemented, hasEvidence: Boolean(afterEvidence) } });

  const recipients = new Set<string>();
  if (updatedIdea.supervisor?.email) recipients.add(updatedIdea.supervisor.email);
  if (updatedIdea.implementationOwner?.email) recipients.add(updatedIdea.implementationOwner.email);
  const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true } });
  mcUsers.forEach((mcUser) => recipients.add(mcUser.email));
  for (const to of recipients) {
    await notify({
      ideaId,
      to,
      subject: `${markImplemented ? "Idea marcada como implementada" : "Avance de implementacion actualizado"} - Folio ${updatedIdea.folio} - Area ${updatedIdea.area.code}`,
      body: ideaMailBody({
        folio: updatedIdea.folio,
        area: updatedIdea.area.code,
        problem: updatedIdea.problem,
        proposal: updatedIdea.proposal,
        action: `${user.name} actualizo el avance.${comments ? ` Comentario: ${comments}` : ""}${afterEvidence ? " Se cargo evidencia." : ""}`,
        ideaId
      })
    });
  }

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

  const activeRules = await prisma.pointRule.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" }
  });
  const pointAdjustments = new Map<string, number>();
  for (const rule of activeRules) {
    const factor = managerialFactorForRule(rule.id);
    if (!factor) continue;
    const rawValue = text(formData, `managerial-${rule.id}`);
    if (!rawValue) continue;
    const value = Number(rawValue);
    if (!factor.options.some((option) => option.points === value)) continue;
    selectedRuleIds.add(rule.id);
    pointAdjustments.set(rule.id, value);
  }
  const selectedRules = activeRules.filter((rule) => selectedRuleIds.has(rule.id));
  for (const rule of selectedRules) {
    if (pointAdjustments.has(rule.id)) continue;
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
  redirect(`/ideas/${ideaId}?coins=${totalPoints}`);
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
      comment: `Mejora Continua retiro las ProbocaCoins. Motivo: ${reason}`
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

export async function createKaizenProjectAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const title = text(formData, "title");
  const area = text(formData, "area");
  const objective = text(formData, "objective");
  const leaderId = text(formData, "leaderId");
  const startDate = dateOrNull(formData, "startDate");
  const endDate = dateOrNull(formData, "endDate");
  if (!title || !area || !objective || !leaderId || !startDate || !endDate || endDate < startDate) redirect("/kaizen/nuevo?error=campos");

  const project = await prisma.$transaction(async (tx) => {
    const maximum = await tx.kaizenProject.aggregate({ _max: { number: true } });
    const number = (maximum._max.number ?? 0) + 1;
    return tx.kaizenProject.create({
      data: {
        number,
        folio: `KZN-${String(number).padStart(3, "0")}`,
        title,
        plant: text(formData, "plant") || null,
        area,
        objective,
        scope: text(formData, "scope") || null,
        baselineValue: numberOrNull(formData, "baselineValue"),
        targetValue: numberOrNull(formData, "targetValue"),
        currentValue: numberOrNull(formData, "currentValue"),
        unit: text(formData, "unit") || null,
        estimatedSavings: numberOrNull(formData, "estimatedSavings"),
        realSavings: numberOrNull(formData, "realSavings"),
        status: "PENDIENTE_CHARTER",
        startDate,
        endDate,
        leaderId,
        createdById: user.id
      },
      include: { leader: true }
    });
  });

  await auditLog({ entity: "KaizenProject", entityId: project.id, action: "KAIZEN_CREATED", userId: user.id, details: { folio: project.folio } });
  await notifyModuleAssignment({
    to: project.leader.email,
    subject: `Nuevo proyecto Kaizen ${project.folio}`,
    lines: [`Proyecto: ${project.title}`, `Objetivo: ${project.objective}`, "Acción requerida: preparar el Project Charter."],
    path: `/kaizen/${project.id}`
  });
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/gantt");
  redirect(`/kaizen/${project.id}`);
}

export async function updateKaizenProjectAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const startDate = dateOrNull(formData, "startDate");
  const endDate = dateOrNull(formData, "endDate");
  const status = text(formData, "status") as KaizenStatus;
  const allowedStatuses: KaizenStatus[] = ["PENDIENTE_CHARTER", "PLANIFICACION", "EN_CURSO", "EN_PAUSA", "COMPLETADO", "CANCELADO"];
  if (!startDate || !endDate || endDate < startDate || !allowedStatuses.includes(status)) redirect(`/kaizen/${projectId}?error=fechas`);
  const project = await prisma.kaizenProject.update({
    where: { id: projectId },
    data: {
      title: text(formData, "title"),
      plant: text(formData, "plant") || null,
      area: text(formData, "area"),
      objective: text(formData, "objective"),
      scope: text(formData, "scope") || null,
      baselineValue: numberOrNull(formData, "baselineValue"),
      targetValue: numberOrNull(formData, "targetValue"),
      currentValue: numberOrNull(formData, "currentValue"),
      unit: text(formData, "unit") || null,
      estimatedSavings: numberOrNull(formData, "estimatedSavings"),
      realSavings: numberOrNull(formData, "realSavings"),
      status,
      startDate,
      endDate,
      leaderId: text(formData, "leaderId"),
      closedAt: status === "COMPLETADO" || status === "CANCELADO" ? new Date() : null
    }
  });
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_UPDATED", userId: user.id, details: { status } });
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/gantt");
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function updateKaizenDatesAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const startDate = dateOrNull(formData, "startDate");
  const endDate = dateOrNull(formData, "endDate");
  if (!startDate || !endDate || endDate < startDate) redirect("/kaizen/gantt?error=fechas");
  await prisma.kaizenProject.update({ where: { id: projectId }, data: { startDate, endDate } });
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_DATES_UPDATED", userId: user.id, details: { startDate, endDate } });
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/gantt");
  revalidatePath(`/kaizen/${projectId}`);
}

export async function uploadKaizenCharterAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const project = await prisma.kaizenProject.findUniqueOrThrow({ where: { id: projectId } });
  const upload = await saveUpload(formData.get("charter") as File | null, `${project.folio}-charter`);
  if (!upload) redirect(`/kaizen/${projectId}?error=charter`);
  await prisma.$transaction([
    prisma.kaizenAttachment.create({ data: { projectId, type: "CHARTER", filename: upload.filename, path: upload.path, uploadedBy: user.name } }),
    prisma.kaizenProject.update({ where: { id: projectId }, data: project.status === "PENDIENTE_CHARTER" ? { status: "PLANIFICACION" } : {} }),
    prisma.kaizenUpdate.create({ data: { projectId, userId: user.id, comment: `Project Charter cargado: ${upload.filename}` } })
  ]);
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_CHARTER_UPLOADED", userId: user.id, details: { filename: upload.filename } });
  revalidatePath("/kaizen");
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function addKaizenActivityAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const action = text(formData, "action");
  if (!action) redirect(`/kaizen/${projectId}?error=actividad`);
  const activity = await prisma.$transaction(async (tx) => {
    const maximum = await tx.kaizenActivity.aggregate({ where: { projectId }, _max: { number: true } });
    return tx.kaizenActivity.create({
      data: {
        projectId,
        number: (maximum._max.number ?? 0) + 1,
        problem: text(formData, "problem") || null,
        action,
        ownerId: text(formData, "ownerId") || null,
        startDate: dateOrNull(formData, "startDate"),
        dueDate: dateOrNull(formData, "dueDate"),
        status: "PENDIENTE"
      },
      include: { owner: true, project: true }
    });
  });
  await prisma.kaizenUpdate.create({ data: { projectId, activityId: activity.id, userId: user.id, comment: `Actividad #${activity.number} creada.` } });
  await auditLog({ entity: "KaizenActivity", entityId: activity.id, action: "KAIZEN_ACTIVITY_CREATED", userId: user.id, details: { projectId } });
  await notifyModuleAssignment({
    to: activity.owner?.email,
    subject: `Actividad asignada en ${activity.project.folio}`,
    lines: [`Proyecto: ${activity.project.title}`, `Actividad: ${activity.action}`, `Fecha compromiso: ${activity.dueDate?.toLocaleDateString("es-MX") ?? "Por definir"}`],
    path: `/kaizen/${projectId}`
  });
  await refreshKaizenProject(projectId);
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function updateKaizenActivityAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const activityId = text(formData, "activityId");
  const status = text(formData, "status") as WorkItemStatus;
  const editableStatuses: WorkItemStatus[] = ["PENDIENTE", "EN_PROCESO", "BLOQUEADA"];
  if (!editableStatuses.includes(status)) redirect("/kaizen");
  const activity = await prisma.kaizenActivity.update({
    where: { id: activityId },
    data: {
      problem: text(formData, "problem") || null,
      action: text(formData, "action"),
      ownerId: text(formData, "ownerId") || null,
      startDate: dateOrNull(formData, "startDate"),
      dueDate: dateOrNull(formData, "dueDate"),
      status
    }
  });
  await prisma.kaizenUpdate.create({ data: { projectId: activity.projectId, activityId, userId: user.id, comment: `Actividad #${activity.number} actualizada.` } });
  await auditLog({ entity: "KaizenActivity", entityId: activityId, action: "KAIZEN_ACTIVITY_UPDATED", userId: user.id, details: { status } });
  await refreshKaizenProject(activity.projectId);
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/kaizen/${activity.projectId}`);
  redirect(`/kaizen/${activity.projectId}`);
}

export async function closeKaizenActivityAction(formData: FormData) {
  const user = await requireUser();
  const activityId = text(formData, "activityId");
  const outcome = text(formData, "outcome") as WorkItemStatus;
  const note = text(formData, "note");
  const activity = await prisma.kaizenActivity.findUniqueOrThrow({ where: { id: activityId }, include: { project: true } });
  if (!isImprovementManager(user.role) && activity.ownerId !== user.id && activity.project.leaderId !== user.id) redirect(`/kaizen/${activity.projectId}`);
  if (outcome !== "COMPLETADA" && outcome !== "CANCELADA") redirect(`/kaizen/${activity.projectId}`);
  if (outcome === "CANCELADA" && !note) redirect(`/kaizen/${activity.projectId}?error=justificacion`);
  const evidence = await saveUpload(formData.get("evidence") as File | null, `${activity.project.folio}-actividad-${activity.number}`);
  if (outcome === "COMPLETADA" && !evidence) redirect(`/kaizen/${activity.projectId}?error=evidencia`);

  await prisma.$transaction(async (tx) => {
    await tx.kaizenActivity.update({
      where: { id: activityId },
      data: {
        status: outcome,
        completionNote: outcome === "COMPLETADA" ? note || "Actividad completada con evidencia." : null,
        cancellationReason: outcome === "CANCELADA" ? note : null,
        closedAt: new Date()
      }
    });
    if (evidence) {
      await tx.kaizenAttachment.create({ data: { projectId: activity.projectId, activityId, type: "EVIDENCE", filename: evidence.filename, path: evidence.path, uploadedBy: user.name } });
    }
    await tx.kaizenUpdate.create({ data: { projectId: activity.projectId, activityId, userId: user.id, comment: outcome === "COMPLETADA" ? `Actividad #${activity.number} completada.` : `Actividad #${activity.number} cerrada sin ejecutar. Motivo: ${note}` } });
  });
  await auditLog({ entity: "KaizenActivity", entityId: activityId, action: `KAIZEN_ACTIVITY_${outcome}`, userId: user.id, details: { note, evidence: evidence?.filename } });
  await refreshKaizenProject(activity.projectId);
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/kaizen/${activity.projectId}`);
  redirect(`/kaizen/${activity.projectId}`);
}

export async function mergeKaizenActivitiesAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const sourceId = text(formData, "sourceId");
  const targetId = text(formData, "targetId");
  const reason = text(formData, "reason");
  if (!sourceId || !targetId || sourceId === targetId || !reason) redirect("/kaizen?error=combinacion");
  const [source, target] = await Promise.all([
    prisma.kaizenActivity.findUniqueOrThrow({ where: { id: sourceId }, include: { project: true } }),
    prisma.kaizenActivity.findUniqueOrThrow({ where: { id: targetId } })
  ]);
  if (source.projectId !== target.projectId) redirect(`/kaizen/${source.projectId}`);
  await prisma.$transaction([
    prisma.kaizenActivity.update({ where: { id: sourceId }, data: { status: "COMBINADA", mergedIntoId: targetId, mergeReason: reason, closedAt: new Date() } }),
    prisma.kaizenUpdate.create({ data: { projectId: source.projectId, activityId: sourceId, userId: user.id, comment: `Actividad #${source.number} combinada con #${target.number}. Justificación: ${reason}` } })
  ]);
  await auditLog({ entity: "KaizenActivity", entityId: sourceId, action: "KAIZEN_ACTIVITY_MERGED", userId: user.id, details: { targetId, reason } });
  await refreshKaizenProject(source.projectId);
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/kaizen/${source.projectId}`);
  redirect(`/kaizen/${source.projectId}`);
}

export async function addKaizenUpdateAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const comment = text(formData, "comment");
  if (!comment) redirect(`/kaizen/${projectId}`);
  await prisma.kaizenUpdate.create({ data: { projectId, userId: user.id, comment } });
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_UPDATE_ADDED", userId: user.id, details: { comment } });
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function createGenbaWalkAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const areaName = text(formData, "areaName");
  const visitDate = dateOrNull(formData, "visitDate");
  const coordinatorId = text(formData, "coordinatorId");
  const expectedDepartments = formData.getAll("expectedDepartments").map(String).filter((value) => genbaDepartments.includes(value));
  const attendedDepartments = formData.getAll("attendedDepartments").map(String).filter((value) => expectedDepartments.includes(value));
  const activityInputs = Array.from({ length: 5 }, (_, index) => ({
    number: index + 1,
    problem: text(formData, `problem-${index + 1}`),
    action: text(formData, `action-${index + 1}`) || null,
    ownerId: text(formData, `ownerId-${index + 1}`) || null,
    dueDate: dateOrNull(formData, `dueDate-${index + 1}`)
  }));
  if (!areaName || !visitDate || !coordinatorId || expectedDepartments.length === 0 || activityInputs.some((activity) => !activity.problem)) redirect("/genba/nuevo?error=campos");

  const walk = await prisma.$transaction(async (tx) => {
    const maximum = await tx.genbaWalk.aggregate({ _max: { number: true } });
    const number = (maximum._max.number ?? 0) + 1;
    return tx.genbaWalk.create({
      data: {
        number,
        folio: `GENBA-${String(number).padStart(3, "0")}`,
        areaName,
        visitDate,
        expectedDepartments: JSON.stringify(expectedDepartments),
        attendedDepartments: JSON.stringify(attendedDepartments),
        notes: text(formData, "notes") || null,
        coordinatorId,
        createdById: user.id,
        activities: { create: activityInputs }
      },
      include: { coordinator: true, activities: { include: { owner: true } } }
    });
  });
  await auditLog({ entity: "GenbaWalk", entityId: walk.id, action: "GENBA_CREATED", userId: user.id, details: { folio: walk.folio, areaName } });
  const notified = new Set<string>();
  for (const activity of walk.activities) {
    if (!activity.owner?.email || notified.has(activity.owner.email)) continue;
    notified.add(activity.owner.email);
    await notifyModuleAssignment({
      to: activity.owner.email,
      subject: `Actividades asignadas en ${walk.folio}`,
      lines: [`Área visitada: ${walk.areaName}`, `Fecha: ${walk.visitDate.toLocaleDateString("es-MX")}`, "Revisa las actividades que tienes asignadas."],
      path: `/genba/${walk.id}`
    });
  }
  revalidatePath("/genba");
  revalidatePath("/genba/kanban");
  redirect(`/genba/${walk.id}`);
}

export async function updateGenbaWalkAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const walkId = text(formData, "walkId");
  const expectedDepartments = formData.getAll("expectedDepartments").map(String).filter((value) => genbaDepartments.includes(value));
  const attendedDepartments = formData.getAll("attendedDepartments").map(String).filter((value) => expectedDepartments.includes(value));
  const status = text(formData, "status") as GenbaStatus;
  const allowed: GenbaStatus[] = ["ABIERTO", "CERRADO", "CANCELADO"];
  if (!allowed.includes(status) || expectedDepartments.length === 0) redirect(`/genba/${walkId}?error=campos`);
  await prisma.genbaWalk.update({
    where: { id: walkId },
    data: {
      areaName: text(formData, "areaName"),
      visitDate: dateOrNull(formData, "visitDate") ?? undefined,
      expectedDepartments: JSON.stringify(expectedDepartments),
      attendedDepartments: JSON.stringify(attendedDepartments),
      notes: text(formData, "notes") || null,
      coordinatorId: text(formData, "coordinatorId"),
      status,
      closedAt: status === "CERRADO" || status === "CANCELADO" ? new Date() : null
    }
  });
  await auditLog({ entity: "GenbaWalk", entityId: walkId, action: "GENBA_UPDATED", userId: user.id, details: { status } });
  revalidatePath("/genba");
  revalidatePath(`/genba/${walkId}`);
  redirect(`/genba/${walkId}`);
}

export async function addGenbaActivityAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const walkId = text(formData, "walkId");
  const problem = text(formData, "problem");
  if (!problem) redirect(`/genba/${walkId}?error=actividad`);
  const activity = await prisma.$transaction(async (tx) => {
    const maximum = await tx.genbaActivity.aggregate({ where: { walkId }, _max: { number: true } });
    return tx.genbaActivity.create({
      data: {
        walkId,
        number: (maximum._max.number ?? 0) + 1,
        problem,
        action: text(formData, "action") || null,
        ownerId: text(formData, "ownerId") || null,
        dueDate: dateOrNull(formData, "dueDate")
      },
      include: { owner: true, walk: true }
    });
  });
  await prisma.genbaUpdate.create({ data: { walkId, activityId: activity.id, userId: user.id, comment: `Actividad #${activity.number} agregada.` } });
  await auditLog({ entity: "GenbaActivity", entityId: activity.id, action: "GENBA_ACTIVITY_CREATED", userId: user.id, details: { walkId } });
  await notifyModuleAssignment({
    to: activity.owner?.email,
    subject: `Actividad asignada en ${activity.walk.folio}`,
    lines: [`Área: ${activity.walk.areaName}`, `Problemática: ${activity.problem}`, `Acción: ${activity.action ?? "Por definir"}`],
    path: `/genba/${walkId}`
  });
  await refreshGenbaWalk(walkId);
  revalidatePath("/genba");
  revalidatePath("/genba/kanban");
  revalidatePath(`/genba/${walkId}`);
  redirect(`/genba/${walkId}`);
}

export async function updateGenbaActivityAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const activityId = text(formData, "activityId");
  const status = text(formData, "status") as WorkItemStatus;
  const editableStatuses: WorkItemStatus[] = ["PENDIENTE", "EN_PROCESO", "BLOQUEADA"];
  if (!editableStatuses.includes(status)) redirect("/genba");
  const activity = await prisma.genbaActivity.update({
    where: { id: activityId },
    data: {
      problem: text(formData, "problem"),
      action: text(formData, "action") || null,
      ownerId: text(formData, "ownerId") || null,
      dueDate: dateOrNull(formData, "dueDate"),
      status
    }
  });
  await prisma.genbaUpdate.create({ data: { walkId: activity.walkId, activityId, userId: user.id, comment: `Actividad #${activity.number} actualizada.` } });
  await auditLog({ entity: "GenbaActivity", entityId: activityId, action: "GENBA_ACTIVITY_UPDATED", userId: user.id, details: { status } });
  await refreshGenbaWalk(activity.walkId);
  revalidatePath("/genba/kanban");
  revalidatePath(`/genba/${activity.walkId}`);
  redirect(`/genba/${activity.walkId}`);
}

export async function closeGenbaActivityAction(formData: FormData) {
  const user = await requireUser();
  const activityId = text(formData, "activityId");
  const outcome = text(formData, "outcome") as WorkItemStatus;
  const note = text(formData, "note");
  const activity = await prisma.genbaActivity.findUniqueOrThrow({ where: { id: activityId }, include: { walk: true } });
  if (!isImprovementManager(user.role) && activity.ownerId !== user.id && activity.walk.coordinatorId !== user.id) redirect(`/genba/${activity.walkId}`);
  if (outcome !== "COMPLETADA" && outcome !== "CANCELADA") redirect(`/genba/${activity.walkId}`);
  if (outcome === "CANCELADA" && !note) redirect(`/genba/${activity.walkId}?error=justificacion`);
  const evidence = await saveUpload(formData.get("evidence") as File | null, `${activity.walk.folio}-actividad-${activity.number}`);
  if (outcome === "COMPLETADA" && !evidence) redirect(`/genba/${activity.walkId}?error=evidencia`);

  await prisma.$transaction(async (tx) => {
    await tx.genbaActivity.update({
      where: { id: activityId },
      data: {
        status: outcome,
        completionNote: outcome === "COMPLETADA" ? note || "Actividad completada con evidencia." : null,
        cancellationReason: outcome === "CANCELADA" ? note : null,
        closedAt: new Date()
      }
    });
    if (evidence) {
      await tx.genbaAttachment.create({ data: { walkId: activity.walkId, activityId, filename: evidence.filename, path: evidence.path, uploadedBy: user.name } });
    }
    await tx.genbaUpdate.create({ data: { walkId: activity.walkId, activityId, userId: user.id, comment: outcome === "COMPLETADA" ? `Actividad #${activity.number} completada.` : `Actividad #${activity.number} cerrada sin ejecutar. Motivo: ${note}` } });
  });
  await auditLog({ entity: "GenbaActivity", entityId: activityId, action: `GENBA_ACTIVITY_${outcome}`, userId: user.id, details: { note, evidence: evidence?.filename } });
  await refreshGenbaWalk(activity.walkId);
  revalidatePath("/genba");
  revalidatePath("/genba/kanban");
  revalidatePath(`/genba/${activity.walkId}`);
  redirect(`/genba/${activity.walkId}`);
}

export async function mergeGenbaActivitiesAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const sourceId = text(formData, "sourceId");
  const targetId = text(formData, "targetId");
  const reason = text(formData, "reason");
  if (!sourceId || !targetId || sourceId === targetId || !reason) redirect("/genba?error=combinacion");
  const [source, target] = await Promise.all([
    prisma.genbaActivity.findUniqueOrThrow({ where: { id: sourceId }, include: { walk: true } }),
    prisma.genbaActivity.findUniqueOrThrow({ where: { id: targetId } })
  ]);
  if (source.walkId !== target.walkId) redirect(`/genba/${source.walkId}`);
  await prisma.$transaction([
    prisma.genbaActivity.update({ where: { id: sourceId }, data: { status: "COMBINADA", mergedIntoId: targetId, mergeReason: reason, closedAt: new Date() } }),
    prisma.genbaUpdate.create({ data: { walkId: source.walkId, activityId: sourceId, userId: user.id, comment: `Actividad #${source.number} combinada con #${target.number}. Justificación: ${reason}` } })
  ]);
  await auditLog({ entity: "GenbaActivity", entityId: sourceId, action: "GENBA_ACTIVITY_MERGED", userId: user.id, details: { targetId, reason } });
  await refreshGenbaWalk(source.walkId);
  revalidatePath("/genba/kanban");
  revalidatePath(`/genba/${source.walkId}`);
  redirect(`/genba/${source.walkId}`);
}

export async function addGenbaUpdateAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const walkId = text(formData, "walkId");
  const comment = text(formData, "comment");
  if (!comment) redirect(`/genba/${walkId}`);
  await prisma.genbaUpdate.create({ data: { walkId, userId: user.id, comment } });
  await auditLog({ entity: "GenbaWalk", entityId: walkId, action: "GENBA_UPDATE_ADDED", userId: user.id, details: { comment } });
  revalidatePath(`/genba/${walkId}`);
  redirect(`/genba/${walkId}`);
}

export async function promoteGenbaActivityToKaizenAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const activityId = text(formData, "activityId");
  const activity = await prisma.genbaActivity.findUniqueOrThrow({
    where: { id: activityId },
    include: { walk: true, owner: true, promotedKaizenActivity: true }
  });
  if (activity.promotedKaizenActivity) redirect(`/kaizen/${activity.promotedKaizenActivity.projectId}`);

  let projectId = text(formData, "targetProjectId");
  if (!projectId) {
    const leaderId = text(formData, "leaderId") || activity.ownerId;
    if (!leaderId) redirect(`/genba/${activity.walkId}?error=lider`);
    const project = await prisma.$transaction(async (tx) => {
      const maximum = await tx.kaizenProject.aggregate({ _max: { number: true } });
      const number = (maximum._max.number ?? 0) + 1;
      const startDate = new Date();
      const proposedEndDate = activity.dueDate ?? new Date(startDate.getTime() + 30 * 86400000);
      const endDate = proposedEndDate < startDate ? new Date(startDate.getTime() + 30 * 86400000) : proposedEndDate;
      return tx.kaizenProject.create({
        data: {
          number,
          folio: `KZN-${String(number).padStart(3, "0")}`,
          title: text(formData, "newProjectTitle") || activity.problem,
          area: activity.walk.areaName,
          objective: activity.action || activity.problem,
          scope: `Origen: ${activity.walk.folio}, actividad #${activity.number}.`,
          startDate,
          endDate,
          leaderId,
          createdById: user.id
        }
      });
    });
    projectId = project.id;
  }

  const kaizenActivity = await prisma.$transaction(async (tx) => {
    const maximum = await tx.kaizenActivity.aggregate({ where: { projectId }, _max: { number: true } });
    return tx.kaizenActivity.create({
      data: {
        projectId,
        number: (maximum._max.number ?? 0) + 1,
        problem: activity.problem,
        action: activity.action || activity.problem,
        ownerId: activity.ownerId,
        startDate: new Date(),
        dueDate: activity.dueDate,
        sourceGenbaActivityId: activity.id
      },
      include: { project: true, owner: true }
    });
  });
  await prisma.genbaUpdate.create({ data: { walkId: activity.walkId, activityId, userId: user.id, comment: `Actividad enviada al proyecto ${kaizenActivity.project.folio}.` } });
  await prisma.kaizenUpdate.create({ data: { projectId, activityId: kaizenActivity.id, userId: user.id, comment: `Actividad importada desde ${activity.walk.folio}.` } });
  await auditLog({ entity: "GenbaActivity", entityId: activityId, action: "GENBA_ACTIVITY_PROMOTED_TO_KAIZEN", userId: user.id, details: { projectId } });
  await notifyModuleAssignment({
    to: kaizenActivity.owner?.email,
    subject: `Actividad incorporada a ${kaizenActivity.project.folio}`,
    lines: [`Proyecto: ${kaizenActivity.project.title}`, `Actividad: ${kaizenActivity.action}`, `Origen: ${activity.walk.folio}`],
    path: `/kaizen/${projectId}`
  });
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  revalidatePath(`/genba/${activity.walkId}`);
  redirect(`/kaizen/${projectId}`);
}

export async function updateAreaAction(formData: FormData) {
  const user = await requireUser(["ADMIN"]);
  const areaId = text(formData, "areaId");
  const supervisorId = text(formData, "supervisorId") || null;
  const active = checked(formData, "active");
  await prisma.$transaction(async (tx) => {
    await tx.area.update({
      where: { id: areaId },
      data: { name: text(formData, "name"), supervisorId, active }
    });
    await tx.orgUnit.updateMany({
      where: { captureAreaId: areaId },
      data: { routingUserId: supervisorId, active, qrEnabled: active }
    });
  });
  await auditLog({ entity: "Area", entityId: areaId, action: "AREA_UPDATED", userId: user.id });
  revalidatePath("/configuracion");
  revalidatePath("/configuracion/estructura");
  revalidatePath("/qr");
  redirect(`/configuracion?success=area_actualizada#areas`);
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

  const parsedEmail = emailSchema.safeParse(text(formData, "email"));
  if (!parsedEmail.success) redirect("/configuracion?error=correo_invalido#usuarios");
  const email = parsedEmail.data;
  const existing = await userWithNormalizedEmail(email);
  if (existing) redirect("/configuracion?error=correo#usuarios");
  const password = text(formData, "password");
  if (password.length < 8) redirect("/configuracion?error=contrasena#usuarios");
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: text(formData, "name"),
        email,
        role,
        active: checked(formData, "active"),
        kaizenAccess: checked(formData, "kaizenAccess"),
        genbaAccess: checked(formData, "genbaAccess"),
        passwordHash: await bcrypt.hash(password, 10)
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/configuracion?error=correo#usuarios");
    }
    throw error;
  }
  await auditLog({ entity: "User", entityId: user.id, action: "USER_CREATED", userId: admin.id, details: { email, role } });
  revalidatePath("/configuracion");
  redirect(`/configuracion?success=usuario_creado&user=${encodeURIComponent(user.id)}#usuarios`);
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const userId = text(formData, "userId");
  const role = text(formData, "role") as Role;
  if (!userRoles.includes(role)) redirect(`/configuracion?error=rol&user=${encodeURIComponent(userId)}#usuarios`);

  const parsedEmail = emailSchema.safeParse(text(formData, "email"));
  if (!parsedEmail.success) redirect(`/configuracion?error=correo_invalido&user=${encodeURIComponent(userId)}#usuarios`);
  const email = parsedEmail.data;
  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) redirect("/configuracion?error=usuario#usuarios");
  const existing = await userWithNormalizedEmail(email);
  if (existing && existing.id !== userId) redirect(`/configuracion?error=correo&user=${encodeURIComponent(userId)}#usuarios`);
  const password = text(formData, "password");
  if (password && password.length < 8) redirect(`/configuracion?error=contrasena&user=${encodeURIComponent(userId)}#usuarios`);
  const data = {
    name: text(formData, "name"),
    email,
    role,
    active: checked(formData, "active"),
    kaizenAccess: checked(formData, "kaizenAccess"),
    genbaAccess: checked(formData, "genbaAccess"),
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {})
  };

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data });
      if (currentUser.email !== updated.email) {
        await tx.notificationOutbox.updateMany({
          where: { to: currentUser.email, status: { in: ["PENDING", "ERROR"] } },
          data: { to: updated.email }
        });
      }
      return updated;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/configuracion?error=correo&user=${encodeURIComponent(userId)}#usuarios`);
    }
    throw error;
  }
  if (admin.id === user.id) await setSession(user);
  await auditLog({
    entity: "User",
    entityId: user.id,
    action: "USER_UPDATED",
    userId: admin.id,
    details: { previousEmail: currentUser.email, email: user.email, role }
  });
  revalidatePath("/configuracion");
  revalidatePath("/configuracion/estructura");
  revalidatePath("/notificaciones");
  redirect(`/configuracion?success=usuario_actualizado&user=${encodeURIComponent(user.id)}#usuarios`);
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
