"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type ApprovalType, type Classification, type GenbaStatus, type IdeaCategory, type KaizenStatus, type Priority, type Role, type WorkItemStatus } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { clearSession, requireUser, setSession } from "@/lib/auth";
import { genbaDepartments, impactOptions, requiredApprovalTypes, roleHomePath } from "@/lib/domain";
import { EmployeeNumberValidationError, normalizeEmployeeNumber } from "@/lib/employee-number";
import { saveUpload } from "@/lib/files";
import { createKaizenFromIdea } from "@/lib/kaizen-from-idea";
import { managerialFactorForRule } from "@/lib/managerial-evaluation";
import { userModuleAccess } from "@/lib/module-access";
import { ideaMailBody, notify } from "@/lib/notifications";
import { reconcileCoinSourceAmount, resolveParticipantFromCollaborator, resolveParticipantFromUser } from "@/lib/coins";
import { canDecideDepartmentApproval, canDecideInitialIdea, canViewIdea } from "@/lib/idea-access";
import { hardDeleteIdeaByFolio } from "@/lib/hard-delete";
import { kaizenClosureReadiness } from "@/lib/kaizen-closure";
import { prisma } from "@/lib/prisma";
import { managerFollowersForMembership, supportFlags, syncIdeaSupportRequests, validSupportUnits } from "@/lib/support-routing";
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
class KaizenAlreadyClosedError extends Error {}

async function serializableTransaction<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error("No fue posible completar la operacion atomica.");
}

const ideaSchema = z.object({
  collaboratorName: z.string().min(2),
  areaCode: z.string().min(1),
  shift: z.string().min(1),
  problem: z.string().min(3),
  proposal: z.string().min(3),
  expectedBenefit: z.string().min(2),
  category: z.enum(["A", "B", "C"])
});

const userRoles: Role[] = ["ADMIN", "MEJORA_CONTINUA", "SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO", "COLABORADOR"];
const emailSchema = z.string().trim().toLowerCase().email();

async function userWithNormalizedEmail(email: string) {
  const users = await prisma.user.findMany();
  const normalized = email.trim().toLowerCase();
  return users.find((user) => user.email.trim().toLowerCase() === normalized) ?? null;
}

function userUniqueError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  return JSON.stringify(error.meta ?? {}).toLowerCase().includes("employeenumber") ? "empleado" : "correo";
}

async function notifyModuleAssignment(input: { to?: string | null; subject: string; lines: string[]; path: string }) {
  await notify({
    to: input.to ?? "",
    subject: input.subject,
    body: [...input.lines, `Liga directa: ${appBaseUrl()}${input.path}`].join("\n")
  });
}

async function createIdeaWithUniqueFolio(data: Omit<Prisma.IdeaUncheckedCreateInput, "folio">) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.idea.create({ data: { ...data, folio: await nextFolio() } });
    } catch (error) {
      const duplicateFolio = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!duplicateFolio || attempt === 3) throw error;
    }
  }
  throw new Error("No fue posible generar el folio de la idea.");
}

async function ensureKaizenTransfer(input: {
  ideaId: string;
  actorId: string;
  leaderId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  updateExisting?: boolean;
}) {
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: input.ideaId },
    select: {
      classification: true,
      implementationOwnerId: true,
      createdAt: true,
      dueDate: true
    }
  });
  if (idea.classification !== "KAIZEN") return null;

  const startDate = input.startDate ?? idea.createdAt;
  const endDate = input.endDate ?? idea.dueDate ?? new Date(startDate.getTime() + 90 * 86_400_000);
  return createKaizenFromIdea({
    ideaId: input.ideaId,
    leaderId: input.leaderId ?? idea.implementationOwnerId ?? input.actorId,
    startDate,
    endDate,
    createdById: input.actorId,
    updateExisting: input.updateExisting
  });
}

async function refreshKaizenProject(projectId: string) {
  const project = await prisma.kaizenProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { activities: true }
  });
  if (project.status === "COMPLETADO" || project.status === "CANCELADO") return;
  const relevant = project.activities.filter((activity) => activity.status !== "COMBINADA");
  const started = relevant.some((activity) => activity.status !== "PENDIENTE");
  if (project.status === "PLANIFICACION" && started) {
    await prisma.kaizenProject.update({ where: { id: projectId }, data: { status: "EN_CURSO" } });
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
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const destination = text(formData, "destination");
  const user = await userWithNormalizedEmail(email);

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
  let employeeNumber: string | null;
  try {
    employeeNumber = normalizeEmployeeNumber(text(formData, "employeeNumber"));
  } catch (error) {
    if (error instanceof EmployeeNumberValidationError) redirect(`/captura/${areaCode}?error=empleado`);
    throw error;
  }
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
    include: { supervisor: true, organizationUnit: true }
  });
  if (!area) redirect(`/captura/${areaCode}?error=area`);

  const requestedRouteId = text(formData, "escalationRuleId");
  const escalationRule = area.organizationUnit?.id
    ? await prisma.orgEscalationRule.findFirst({
        where: {
          orgUnitId: area.organizationUnit.id,
          active: true,
          reviewerMembership: { is: { active: true, user: { is: { active: true } } } },
          ...(requestedRouteId ? { id: requestedRouteId } : { isDefault: true })
        },
        include: { reviewerMembership: { include: { user: true } } }
      }) ?? await prisma.orgEscalationRule.findFirst({
        where: {
          orgUnitId: area.organizationUnit.id,
          active: true,
          reviewerMembership: { is: { active: true, user: { is: { active: true } } } }
        },
        include: { reviewerMembership: { include: { user: true } } },
        orderBy: [{ sortOrder: "asc" }, { submitterLevel: "asc" }]
      })
    : null;
  if (requestedRouteId && !escalationRule) redirect(`/captura/${areaCode}?error=ruta`);
  const supervisorId = escalationRule?.reviewerMembership.userId ?? area.supervisorId;
  const supervisor = escalationRule?.reviewerMembership.user ?? area.supervisor;
  if (!supervisorId || !supervisor?.active) {
    redirect(`/captura/${areaCode}?error=sin_responsable`);
  }

  const selectedImpacts = formData
    .getAll("impactTypes")
    .map(String)
    .filter((impact) => impactOptions.includes(impact));
  const supportUnitIds = parsed.data.category === "A" ? [] : formData.getAll("supportUnitIds").map(String).filter(Boolean);
  const selectedSupportUnits = await validSupportUnits(supportUnitIds, area.organizationUnit?.plantId);
  const selectedSupport = parsed.data.category === "A"
    ? { impactsQuality: false, impactsSafety: false, requiresMaintenance: false }
    : supportFlags(selectedSupportUnits);
  const externalSupportDetails = text(formData, "externalSupportDetails");
  if (parsed.data.category === "C" && externalSupportDetails.length < 3) {
    redirect(`/captura/${areaCode}?error=datos&campos=externalSupportDetails&categoria=C`);
  }

  const participant = await resolveParticipantFromCollaborator({
    name: parsed.data.collaboratorName,
    employeeNumber,
    email: text(formData, "collaboratorEmail") || null,
    jobTitle: escalationRule?.submitterLabel ?? null,
    orgUnitId: area.organizationUnit?.id
  });

  const idea = await createIdeaWithUniqueFolio({
      collaboratorName: parsed.data.collaboratorName,
      collaboratorEmail: text(formData, "collaboratorEmail") || null,
      employeeNumber,
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
      supervisorId,
      escalationRuleId: escalationRule?.id ?? null,
      submitterPosition: escalationRule?.submitterLabel ?? null,
      participantId: participant.id
  });

  await syncIdeaSupportRequests({
    ideaId: idea.id,
    unitIds: selectedSupportUnits.map((unit) => unit.id),
    plantId: area.organizationUnit?.plantId,
    activate: false
  });

  const followerIds = await managerFollowersForMembership(escalationRule?.reviewerMembership.id);
  for (const userId of followerIds) {
    await prisma.ideaFollower.upsert({
      where: { ideaId_userId: { ideaId: idea.id, userId } },
      update: { label: "Jefatura de la ruta" },
      create: { ideaId: idea.id, userId, label: "Jefatura de la ruta" }
    });
  }

  await prisma.approval.create({
    data: {
      ideaId: idea.id,
      type: "SUPERVISOR",
      assignedToId: supervisorId,
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
    details: { area: area.code, supervisorId, escalationRuleId: escalationRule?.id ?? null, supportUnitIds }
  });

  await notify({
    ideaId: idea.id,
    to: supervisor?.email ?? "",
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
  if (followerIds.length) {
    const followers = await prisma.user.findMany({ where: { id: { in: followerIds }, active: true }, select: { email: true } });
    for (const follower of followers) {
      await notify({
        ideaId: idea.id,
        to: follower.email,
        subject: `Nueva idea de tu equipo - Folio ${idea.folio} - Area ${area.code}`,
        body: ideaMailBody({
          folio: idea.folio,
          area: area.code,
          problem: idea.problem,
          proposal: idea.proposal,
          action: "Seguimiento de la ruta jerarquica",
          ideaId: idea.id
        })
      });
    }
  }

  revalidatePath("/");
  redirect(`/captura/gracias?folio=${encodeURIComponent(idea.folio)}&area=${encodeURIComponent(area.code)}`);
}

export async function supervisorDecisionAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = text(formData, "ideaId");
  const decision = text(formData, "decision");
  const comments = text(formData, "comments");

  if (!["APROBAR", "RECHAZAR", "SOLICITAR_INFORMACION"].includes(decision)) {
    redirect(`/ideas/${ideaId}?error=decision`);
  }

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: { include: { organizationUnit: true } }, supervisor: true, supportRequests: true, approvals: true }
  });
  if (!(await canDecideInitialIdea(user, ideaId))) redirect("/seguimientos?error=sin_permiso");
  const initialApproval = idea.approvals.find((approval) => approval.type === "SUPERVISOR");
  if (!initialApproval || !["PENDING", "MORE_INFO"].includes(initialApproval.status)) {
    redirect(`/ideas/${ideaId}?error=estado_revision`);
  }

  if ((decision === "RECHAZAR" || decision === "SOLICITAR_INFORMACION") && !comments) {
    redirect(`/ideas/${ideaId}?error=${decision === "RECHAZAR" ? "justificacion" : "informacion"}`);
  }
  const claimed = await prisma.approval.updateMany({
    where: { ideaId, type: "SUPERVISOR", status: { in: ["PENDING", "MORE_INFO"] } },
    data: {
      assignedToId: user.id,
      status: decision === "APROBAR" ? "APPROVED" : decision === "RECHAZAR" ? "REJECTED" : "MORE_INFO",
      decision: decision === "APROBAR" ? "APROBAR" : decision === "RECHAZAR" ? "RECHAZAR" : "SOLICITAR_INFORMACION",
      comments: comments || null,
      decidedAt: new Date()
    }
  });
  if (claimed.count !== 1) redirect(`/ideas/${ideaId}?error=estado_revision`);

  if (decision === "RECHAZAR") {
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "RECHAZADA_SUPERVISOR", supervisorId: user.id, rejectionReason: comments }
    });
    await auditLog({ entity: "Idea", entityId: ideaId, action: "SUPERVISOR_REJECTED", userId: user.id, details: { comments } });
    await notify({
      ideaId,
      to: idea.collaboratorEmail ?? "",
      subject: `Idea rechazada por responsable directo - Folio ${idea.folio} - Area ${idea.area.code}`,
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
    await prisma.idea.update({
      where: { id: ideaId },
      data: { status: "SOLICITUD_INFORMACION", supervisorId: user.id, moreInfoRequest: comments }
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
    const supportUnitIds = formData.getAll("supportUnitIds").map(String).filter(Boolean);
    const dynamicSupport = await syncIdeaSupportRequests({
      ideaId,
      unitIds: supportUnitIds,
      plantId: idea.area.organizationUnit?.plantId,
      activate: true
    });
    const dynamicFlags = supportFlags(dynamicSupport.units);
    const support = {
      impactsQuality: checked(formData, "impactsQuality") || dynamicFlags.impactsQuality,
      impactsSafety: checked(formData, "impactsSafety") || dynamicFlags.impactsSafety,
      requiresMaintenance: checked(formData, "requiresMaintenance") || dynamicFlags.requiresMaintenance
    };
    const category: IdeaCategory = idea.category === "C" ? "C" : dynamicSupport.units.length || Object.values(support).some(Boolean) ? "B" : "A";
    await prisma.idea.update({ where: { id: ideaId }, data: { ...support, category } });
    await approveSupervisor(ideaId, user.id);
    for (const request of dynamicSupport.requests) {
      await notifyModuleAssignment({
        to: request.assignedTo?.email,
        subject: `Apoyo solicitado para la idea ${idea.folio}`,
        lines: [`Area solicitante: ${idea.area.code}`, `Apoyo requerido de: ${request.orgUnit.name}`, `Problema: ${idea.problem}`],
        path: `/ideas/${idea.id}`
      });
    }
  }

  revalidatePath("/");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function validationDecisionAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = text(formData, "ideaId");
  const decision = text(formData, "decision");
  const comments = text(formData, "comments");
  const explicitType = text(formData, "type") as ApprovalType;
  const type = explicitType;
  if (!type || !requiredApprovalTypes({ impactsQuality: true, impactsSafety: true, requiresMaintenance: true }).includes(type)) redirect("/dashboard");
  if (!["APROBAR", "RECHAZAR", "SOLICITAR_INFORMACION"].includes(decision)) redirect(`/ideas/${ideaId}?error=decision`);
  if ((decision === "RECHAZAR" || decision === "SOLICITAR_INFORMACION") && !comments) redirect(`/ideas/${ideaId}?error=justificacion`);
  if (!(await canDecideDepartmentApproval(user, ideaId, type))) redirect(`/ideas/${ideaId}?error=sin_permiso`);

  const idea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, include: { area: true, supervisor: true } });
  const status = decision === "APROBAR" ? "APPROVED" : decision === "RECHAZAR" ? "REJECTED" : "MORE_INFO";
  const updatedApproval = await prisma.approval.updateMany({
    where: { ideaId, type, status: { in: ["PENDING", "MORE_INFO"] } },
    data: {
      assignedToId: user.id,
      status,
      decision: decision === "APROBAR" ? "APROBAR" : decision === "RECHAZAR" ? "RECHAZAR" : "SOLICITAR_INFORMACION",
      comments: comments || null,
      decidedAt: new Date()
    }
  });
  if (updatedApproval.count !== 1) redirect(`/ideas/${ideaId}?error=estado_revision`);

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

export async function supportDecisionAction(formData: FormData) {
  const user = await requireUser();
  const requestId = text(formData, "requestId");
  const decision = text(formData, "decision");
  const comments = text(formData, "comments");
  if (!['APROBAR', 'RECHAZAR', 'SOLICITAR_INFORMACION'].includes(decision)) redirect("/seguimientos");
  if ((decision === "RECHAZAR" || decision === "SOLICITAR_INFORMACION") && !comments) redirect("/seguimientos?error=justificacion");

  const request = await prisma.ideaSupportRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { idea: { include: { area: true, supervisor: true } }, orgUnit: true }
  });
  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, orgUnitId: request.orgUnitId, active: true, canReceiveIdeas: true }
  });
  const authorized = isImprovementManager(user.role) || request.assignedToId === user.id || Boolean(membership);
  if (!authorized || !request.activatedAt) redirect(roleHomePath(user.role));

  const status = decision === "APROBAR" ? "APPROVED" : decision === "RECHAZAR" ? "REJECTED" : "MORE_INFO";
  const updatedRequest = await prisma.ideaSupportRequest.updateMany({
    where: { id: request.id, activatedAt: { not: null }, status: { in: ["PENDING", "MORE_INFO"] } },
    data: {
      assignedToId: user.id,
      status,
      decision: decision === "APROBAR" ? "APROBAR" : decision === "RECHAZAR" ? "RECHAZAR" : "SOLICITAR_INFORMACION",
      comments: comments || null,
      decidedAt: new Date()
    }
  });
  if (updatedRequest.count !== 1) redirect(`/ideas/${request.ideaId}?error=estado_revision`);
  if (decision === "RECHAZAR") {
    await prisma.idea.update({ where: { id: request.ideaId }, data: { status: "RECHAZADA_VALIDACION", rejectionReason: comments } });
  } else if (decision === "SOLICITAR_INFORMACION") {
    await prisma.idea.update({ where: { id: request.ideaId }, data: { status: "SOLICITUD_INFORMACION", moreInfoRequest: comments } });
  } else {
    await updateStatusAfterValidations(request.ideaId);
  }
  await auditLog({ entity: "IdeaSupportRequest", entityId: request.id, action: `DYNAMIC_SUPPORT_${decision}`, userId: user.id, details: { ideaId: request.ideaId, orgUnitId: request.orgUnitId, comments } });

  const recipients = new Set<string>();
  if (request.idea.supervisor?.email) recipients.add(request.idea.supervisor.email);
  const mcUsers = await prisma.user.findMany({ where: { role: { in: ["MEJORA_CONTINUA", "ADMIN"] }, active: true }, select: { email: true } });
  mcUsers.forEach((person) => recipients.add(person.email));
  for (const to of recipients) {
    await notify({
      ideaId: request.ideaId,
      to,
      subject: `${request.orgUnit.name}: ${decision.toLowerCase()} - ${request.idea.folio}`,
      body: ideaMailBody({ folio: request.idea.folio, area: request.idea.area.code, problem: request.idea.problem, proposal: request.idea.proposal, action: `${request.orgUnit.name}: ${comments || decision}`, ideaId: request.ideaId })
    });
  }
  revalidatePath("/seguimientos");
  revalidatePath(`/ideas/${request.ideaId}`);
  redirect(`/ideas/${request.ideaId}`);
}

export async function reopenRejectedIdeaAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const justification = text(formData, "justification");
  if (!justification) redirect(`/ideas/${ideaId}?error=justificacion`);

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: { include: { organizationUnit: true } }, supervisor: true }
  });
  if (!["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status)) redirect(`/ideas/${ideaId}`);

  const supportUnitIds = formData.getAll("supportUnitIds").map(String).filter(Boolean);
  const dynamicSupport = await syncIdeaSupportRequests({
    ideaId,
    unitIds: supportUnitIds,
    plantId: idea.area.organizationUnit?.plantId,
    activate: true
  });
  const dynamicFlags = supportFlags(dynamicSupport.units);
  const support = {
    impactsQuality: checked(formData, "impactsQuality") || dynamicFlags.impactsQuality,
    impactsSafety: checked(formData, "impactsSafety") || dynamicFlags.impactsSafety,
    requiresMaintenance: checked(formData, "requiresMaintenance") || dynamicFlags.requiresMaintenance
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

  await createValidationApprovals(ideaId);
  const status = await updateStatusAfterValidations(ideaId);
  await prisma.comment.create({ data: { ideaId, userId: user.id, comment: `Mejora Continua reabrió la idea. Justificación: ${justification}` } });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "MC_REOPENED_REJECTED_IDEA", userId: user.id, details: { justification, support, status } });

  const recipients = new Set<string>();
  if (idea.supervisor?.email) recipients.add(idea.supervisor.email);
  if (idea.collaboratorEmail) recipients.add(idea.collaboratorEmail);
  for (const request of dynamicSupport.requests) {
    if (request.assignedTo?.email) recipients.add(request.assignedTo.email);
  }
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
  if (!["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"].includes(currentIdea.status)) {
    redirect(`/ideas/${ideaId}?error=flujo`);
  }

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
  const currentIdea = await prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, select: { status: true, classification: true } });
  if (!currentIdea.classification || !["CLASIFICACION_MEJORA_CONTINUA", "EN_IMPLEMENTACION"].includes(currentIdea.status)) {
    redirect(`/ideas/${ideaId}?error=flujo`);
  }

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
    kaizenProject = await ensureKaizenTransfer({
      ideaId,
      actorId: user.id,
      leaderId: ownerId,
      startDate: new Date(),
      endDate: new Date(`${dueDateText}T12:00:00`),
      updateExisting: true
    });
    if (!kaizenProject) throw new Error("La idea no conservó la clasificación Kaizen.");
    await auditLog({ entity: "KaizenProject", entityId: kaizenProject.id, action: "SYNCED_FROM_IDEA_ASSIGNMENT", userId: user.id, details: { ideaId, folio: kaizenProject.folio, leaderId: ownerId, dueDateText } });
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
  const user = await requireUser();
  const ideaId = text(formData, "ideaId");
  const comments = text(formData, "comments");
  const markImplemented = checked(formData, "markImplemented");

  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: ideaId },
    include: { area: { include: { organizationUnit: true } }, supervisor: true, implementationOwner: true }
  });
  const activityMembership = idea.area.organizationUnit?.id
    ? await prisma.orgMembership.findFirst({
        where: {
          userId: user.id,
          orgUnitId: idea.area.organizationUnit.id,
          active: true,
          canManageActivities: true
        },
        select: { id: true }
      })
    : null;
  const canUpdate = isImprovementManager(user.role) ||
    idea.implementationOwnerId === user.id ||
    idea.supervisorId === user.id ||
    Boolean(activityMembership) ||
    await canDecideInitialIdea(user, ideaId);
  if (!canUpdate) redirect(`/ideas/${ideaId}`);

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

  const kaizenProject = await ensureKaizenTransfer({
    ideaId,
    actorId: user.id,
    leaderId: updatedIdea.implementationOwnerId,
    startDate: updatedIdea.createdAt,
    endDate: updatedIdea.dueDate,
    updateExisting: false
  });
  if (kaizenProject) {
    await auditLog({
      entity: "KaizenProject",
      entityId: kaizenProject.id,
      action: markImplemented ? "TRANSFER_VERIFIED_AT_IMPLEMENTATION" : "TRANSFER_VERIFIED_AT_PROGRESS",
      userId: user.id,
      details: { ideaId, folio: kaizenProject.folio }
    });
  }

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
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
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
  const wasClosed = idea.status === "CERRADA";

  const hasAfterEvidence = idea.attachments.some((attachment) => attachment.type === "AFTER");
  if (!wasClosed && idea.requiresEvidence && !hasAfterEvidence) redirect(`/ideas/${ideaId}?error=evidencia`);

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
  await serializableTransaction(async (transaction) => {
    await transaction.ideaPointRule.deleteMany({ where: { ideaId } });
    for (const rule of selectedRules) {
      await transaction.ideaPointRule.create({
        data: {
          ideaId,
          pointRuleId: rule.id,
          points: pointAdjustments.get(rule.id) ?? rule.points
        }
      });
    }

    await transaction.approval.upsert({
      where: { ideaId_type: { ideaId, type: "MEJORA_CONTINUA_FINAL" } },
      update: { assignedToId: user.id, status: "APPROVED", decision: "APROBAR", decidedAt: new Date(), comments: wasClosed ? "ProbocaCoins revisadas y otorgadas nuevamente." : "Cierre final validado." },
      create: {
        ideaId,
        type: "MEJORA_CONTINUA_FINAL",
        assignedToId: user.id,
        status: "APPROVED",
        decision: "APROBAR",
        decidedAt: new Date(),
        comments: wasClosed ? "ProbocaCoins revisadas y otorgadas nuevamente." : "Cierre final validado."
      }
    });

    await transaction.idea.update({
      where: { id: ideaId },
      data: {
        status: "CERRADA",
        closedAt: idea.closedAt ?? new Date(),
        pointsAssigned: totalPoints
      }
    });
    if (idea.participantId) {
      await reconcileCoinSourceAmount({
        participantId: idea.participantId,
        sourceType: "IDEA",
        sourceId: idea.id,
        targetAmount: totalPoints,
        description: wasClosed
          ? `Ajuste de ProbocaCoins de la idea ${idea.folio}`
          : `ProbocaCoins por cierre de la idea ${idea.folio}`,
        createdById: user.id,
        occurredAt: idea.closedAt ?? new Date()
      }, transaction);
    }
    if (wasClosed) {
      await transaction.comment.create({
        data: {
          ideaId,
          userId: user.id,
          comment: `Mejora Continua otorgo o ajusto ${totalPoints} ProbocaCoins.`
        }
      });
    }
  });
  await auditLog({
    entity: "Idea",
    entityId: ideaId,
    action: wasClosed ? "PROBOCACOINS_REASSIGNED" : "IDEA_CLOSED_REVIEWED_POINTS",
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
  const kaizenProject = await ensureKaizenTransfer({
    ideaId,
    actorId: user.id,
    leaderId: idea.implementationOwnerId,
    startDate: idea.createdAt,
    endDate: idea.dueDate,
    updateExisting: false
  });
  if (kaizenProject) {
    await auditLog({
      entity: "KaizenProject",
      entityId: kaizenProject.id,
      action: "TRANSFER_VERIFIED_AT_IDEA_CLOSE",
      userId: user.id,
      details: { ideaId, folio: kaizenProject.folio }
    });
  }
  await notifyIdeaClosed(ideaId, { coinsUpdated: wasClosed });
  revalidatePath("/dashboard");
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
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

  await serializableTransaction(async (transaction) => {
    await transaction.ideaPointRule.deleteMany({ where: { ideaId } });
    await transaction.idea.update({ where: { id: ideaId }, data: { pointsAssigned: 0 } });
    if (idea.participantId) {
      await reconcileCoinSourceAmount({
        participantId: idea.participantId,
        sourceType: "IDEA",
        sourceId: idea.id,
        targetAmount: 0,
        description: `Retiro de ProbocaCoins de la idea ${idea.folio}: ${reason}`,
        createdById: user.id
      }, transaction);
    }
    await transaction.comment.create({
      data: {
        ideaId,
        userId: user.id,
        comment: `Mejora Continua retiro las ProbocaCoins. Motivo: ${reason}`
      }
    });
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

export async function deleteCancelledIdeaAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const ideaId = text(formData, "ideaId");
  const confirmation = text(formData, "confirmation").toUpperCase();
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { folio: true, status: true }
  });
  if (!idea) redirect("/ideas");
  if (idea.status !== "CANCELADA") redirect(`/ideas/${ideaId}?error=eliminar_estado`);
  if (confirmation !== `ELIMINAR ${idea.folio}`) redirect(`/ideas/${ideaId}?error=eliminar_confirmacion`);

  await hardDeleteIdeaByFolio(idea.folio);
  revalidatePath("/dashboard");
  revalidatePath("/ideas");
  revalidatePath("/kanban");
  revalidatePath("/reportes");
  redirect("/ideas?success=eliminada");
}

export async function addCommentAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = text(formData, "ideaId");
  const comment = text(formData, "comment");
  if (!comment) redirect(`/ideas/${ideaId}`);
  if (!(await canViewIdea(user, ideaId))) redirect(roleHomePath(user.role));
  await prisma.comment.create({ data: { ideaId, userId: user.id, comment } });
  await auditLog({ entity: "Idea", entityId: ideaId, action: "COMMENT_ADDED", userId: user.id, details: { comment } });
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function addIdeaFollowerAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const followerId = text(formData, "followerId");
  const label = text(formData, "label") || "Seguimiento asignado";
  const [idea, follower] = await Promise.all([
    prisma.idea.findUniqueOrThrow({ where: { id: ideaId }, include: { area: true } }),
    prisma.user.findFirst({ where: { id: followerId, active: true } })
  ]);
  if (!follower) redirect(`/ideas/${ideaId}?error=responsable`);
  await prisma.ideaFollower.upsert({
    where: { ideaId_userId: { ideaId, userId: follower.id } },
    update: { label, createdById: user.id },
    create: { ideaId, userId: follower.id, label, createdById: user.id }
  });
  await notifyModuleAssignment({
    to: follower.email,
    subject: `Seguimiento asignado - ${idea.folio}`,
    lines: [`Area: ${idea.area.code}`, `Motivo: ${label}`, `Problema: ${idea.problem}`],
    path: `/ideas/${idea.id}`
  });
  await auditLog({ entity: "IdeaFollower", entityId: `${ideaId}:${follower.id}`, action: "FOLLOWER_ASSIGNED", userId: user.id, details: { label } });
  revalidatePath("/seguimientos");
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}`);
}

export async function removeIdeaFollowerAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideaId = text(formData, "ideaId");
  const followerId = text(formData, "followerId");
  await prisma.ideaFollower.deleteMany({ where: { ideaId, userId: followerId } });
  await auditLog({ entity: "IdeaFollower", entityId: `${ideaId}:${followerId}`, action: "FOLLOWER_REMOVED", userId: user.id });
  revalidatePath("/seguimientos");
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
        createdById: user.id,
        teamMembers: { create: { userId: leaderId, role: "Lider" } }
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
  const allowedStatuses: KaizenStatus[] = ["PENDIENTE_CHARTER", "PLANIFICACION", "EN_CURSO", "EN_PAUSA"];
  if (!startDate || !endDate || endDate < startDate || !allowedStatuses.includes(status)) redirect(`/kaizen/${projectId}?error=fechas`);
  const current = await prisma.kaizenProject.findUniqueOrThrow({ where: { id: projectId } });
  if (current.status === "COMPLETADO" || current.status === "CANCELADO") redirect(`/kaizen/${projectId}?error=cerrado`);
  const leaderId = text(formData, "leaderId");
  const project = await prisma.$transaction(async (tx) => {
    const updated = await tx.kaizenProject.update({ where: { id: projectId }, data: {
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
      leaderId
    } });
    if (current.leaderId !== leaderId) {
      await tx.kaizenTeamMember.updateMany({ where: { projectId, userId: current.leaderId, role: "Lider" }, data: { role: "Miembro" } });
    }
    await tx.kaizenTeamMember.upsert({
      where: { projectId_userId: { projectId, userId: leaderId } },
      update: { role: "Lider" },
      create: { projectId, userId: leaderId, role: "Lider" }
    });
    return updated;
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
  const current = await prisma.kaizenProject.findUniqueOrThrow({ where: { id: projectId }, select: { status: true } });
  if (current.status === "COMPLETADO" || current.status === "CANCELADO") redirect(`/kaizen/${projectId}?error=cerrado`);
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
  if (project.status === "COMPLETADO" || project.status === "CANCELADO") redirect(`/kaizen/${projectId}?error=cerrado`);
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
  const currentProject = await prisma.kaizenProject.findUniqueOrThrow({ where: { id: projectId }, select: { status: true } });
  if (currentProject.status === "COMPLETADO" || currentProject.status === "CANCELADO") redirect(`/kaizen/${projectId}?error=cerrado`);
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
  if (activity.ownerId) {
    await prisma.kaizenTeamMember.upsert({
      where: { projectId_userId: { projectId, userId: activity.ownerId } },
      update: {},
      create: { projectId, userId: activity.ownerId, role: "Responsable de actividad" }
    });
  }
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
  const currentActivity = await prisma.kaizenActivity.findUniqueOrThrow({ where: { id: activityId }, include: { project: { select: { status: true } } } });
  if (currentActivity.project.status === "COMPLETADO" || currentActivity.project.status === "CANCELADO") redirect(`/kaizen/${currentActivity.projectId}?error=cerrado`);
  const activity = await prisma.$transaction(async (tx) => {
    const updated = await tx.kaizenActivity.update({ where: { id: activityId }, data: {
      problem: text(formData, "problem") || null,
      action: text(formData, "action"),
      ownerId: text(formData, "ownerId") || null,
      startDate: dateOrNull(formData, "startDate"),
      dueDate: dateOrNull(formData, "dueDate"),
      status
    } });
    if (updated.ownerId) {
      await tx.kaizenTeamMember.upsert({
        where: { projectId_userId: { projectId: updated.projectId, userId: updated.ownerId } },
        update: {},
        create: { projectId: updated.projectId, userId: updated.ownerId, role: "Responsable de actividad" }
      });
    }
    return updated;
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
  if (activity.project.status === "COMPLETADO" || activity.project.status === "CANCELADO") redirect(`/kaizen/${activity.projectId}?error=cerrado`);
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
  if (source.project.status === "COMPLETADO" || source.project.status === "CANCELADO") redirect(`/kaizen/${source.projectId}?error=cerrado`);
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
  const project = await prisma.kaizenProject.findUniqueOrThrow({ where: { id: projectId }, select: { status: true } });
  if (project.status === "COMPLETADO" || project.status === "CANCELADO") redirect(`/kaizen/${projectId}?error=cerrado`);
  await prisma.kaizenUpdate.create({ data: { projectId, userId: user.id, comment } });
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_UPDATE_ADDED", userId: user.id, details: { comment } });
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}`);
}

const kaizenTeamRoles = ["Lider", "Patrocinador", "Facilitador", "Miembro", "Apoyo", "Responsable de actividad"] as const;

function kaizenCoinTargets(formData: FormData, members: Array<{ id: string; userId: string }>) {
  return members.map((member) => {
    const entry = formData.get(`coins-${member.id}`);
    if (entry === null) return null;
    const raw = String(entry).trim();
    const amount = Number(raw);
    if (!Number.isInteger(amount) || amount < 0 || amount > 100_000) return null;
    return { ...member, amount };
  });
}

export async function addKaizenTeamMemberAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const userId = text(formData, "userId");
  const requestedRole = text(formData, "role");
  const role = kaizenTeamRoles.find((item) => item === requestedRole);
  if (!projectId || !userId || !role) redirect(`/kaizen/${projectId}?error=equipo`);
  const project = await prisma.kaizenProject.findUniqueOrThrow({ where: { id: projectId } });
  if (project.status === "COMPLETADO" || project.status === "CANCELADO") redirect(`/kaizen/${projectId}?error=cerrado`);
  const member = await prisma.user.findFirst({ where: { id: userId, active: true }, select: { id: true, name: true, email: true } });
  if (!member) redirect(`/kaizen/${projectId}?error=equipo`);
  await prisma.$transaction(async (tx) => {
    await resolveParticipantFromUser(userId, tx);
    await tx.kaizenTeamMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: { role: userId === project.leaderId ? "Lider" : role },
      create: { projectId, userId, role: userId === project.leaderId ? "Lider" : role }
    });
  });
  await prisma.kaizenUpdate.create({ data: { projectId, userId: user.id, comment: `${member.name} se agrego al equipo como ${userId === project.leaderId ? "Lider" : role}.` } });
  await notifyModuleAssignment({
    to: member.email,
    subject: `Participacion asignada en ${project.folio}`,
    lines: [`Proyecto: ${project.title}`, `Funcion: ${userId === project.leaderId ? "Lider" : role}`, "Revisa el expediente y las actividades relacionadas."],
    path: `/kaizen/${projectId}`
  });
  await auditLog({ entity: "KaizenTeamMember", entityId: `${projectId}:${userId}`, action: "KAIZEN_TEAM_MEMBER_UPSERTED", userId: user.id, details: { role } });
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}?success=equipo`);
}

export async function removeKaizenTeamMemberAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const memberId = text(formData, "memberId");
  const member = await prisma.kaizenTeamMember.findFirst({
    where: { id: memberId, projectId },
    include: { project: true, user: true }
  });
  if (!member) redirect(`/kaizen/${projectId}?error=equipo`);
  if (member.project.status === "COMPLETADO" || member.project.status === "CANCELADO") redirect(`/kaizen/${projectId}?error=cerrado`);
  if (member.userId === member.project.leaderId) redirect(`/kaizen/${projectId}?error=lider_equipo`);
  const ownsActivities = await prisma.kaizenActivity.count({ where: { projectId, ownerId: member.userId } });
  if (ownsActivities) redirect(`/kaizen/${projectId}?error=responsable_equipo`);
  await prisma.kaizenTeamMember.delete({ where: { id: member.id } });
  await prisma.kaizenUpdate.create({ data: { projectId, userId: user.id, comment: `${member.user.name} se retiro del equipo.` } });
  await auditLog({ entity: "KaizenTeamMember", entityId: member.id, action: "KAIZEN_TEAM_MEMBER_REMOVED", userId: user.id });
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}?success=equipo`);
}

export async function closeKaizenProjectAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const outcome = text(formData, "outcome") as KaizenStatus;
  const closureNote = text(formData, "closureNote");
  const project = await prisma.kaizenProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { activities: { include: { attachments: true } }, attachments: true, teamMembers: { include: { user: true } } }
  });
  if (project.status === "COMPLETADO" || project.status === "CANCELADO") redirect(`/kaizen/${projectId}?error=cerrado`);
  if ((outcome !== "COMPLETADO" && outcome !== "CANCELADO") || closureNote.length < 3) redirect(`/kaizen/${projectId}?error=cierre_datos`);
  const relevantActivities = project.activities.filter((activity) => activity.status !== "COMBINADA");
  if (outcome === "COMPLETADO") {
    const readiness = kaizenClosureReadiness({
      activities: relevantActivities.map((activity) => ({ status: activity.status, evidenceCount: activity.attachments.length })),
      hasCharter: project.attachments.some((attachment) => attachment.type === "CHARTER"),
      teamCount: project.teamMembers.length
    });
    if (!readiness.hasCharter) redirect(`/kaizen/${projectId}?error=cierre_charter`);
    if (!readiness.allActivitiesResolved) redirect(`/kaizen/${projectId}?error=cierre_actividades`);
    if (!readiness.hasCompletedResult) redirect(`/kaizen/${projectId}?error=cierre_resultado`);
    if (!readiness.completedActivitiesHaveEvidence) redirect(`/kaizen/${projectId}?error=cierre_evidencia`);
  }
  if (!project.teamMembers.length) redirect(`/kaizen/${projectId}?error=cierre_equipo`);
  const targets = kaizenCoinTargets(formData, project.teamMembers);
  if (targets.some((target) => !target)) redirect(`/kaizen/${projectId}?error=coins`);
  const validTargets = targets.filter((target): target is NonNullable<typeof target> => Boolean(target));
  const totalCoins = validTargets.reduce((sum, target) => sum + target.amount, 0);
  const closedAt = new Date();

  try {
    await serializableTransaction(async (tx) => {
    const claimed = await tx.kaizenProject.updateMany({
      where: { id: projectId, status: { notIn: ["COMPLETADO", "CANCELADO"] } },
      data: { status: outcome, closedAt, closedById: user.id, closureNote }
    });
    if (!claimed.count) throw new KaizenAlreadyClosedError();
    if (outcome === "CANCELADO") {
      await tx.kaizenActivity.updateMany({
        where: { projectId, status: { in: ["PENDIENTE", "EN_PROCESO", "BLOQUEADA"] } },
        data: { status: "CANCELADA", cancellationReason: closureNote, closedAt }
      });
    }
    for (const target of validTargets) {
      const participant = await resolveParticipantFromUser(target.userId, tx);
      await reconcileCoinSourceAmount({
        participantId: participant.id,
        sourceType: "KAIZEN",
        sourceId: projectId,
        targetAmount: target.amount,
        description: `${project.folio} - cierre y reconocimiento del equipo`,
        createdById: user.id,
        occurredAt: closedAt
      }, tx);
      await tx.kaizenTeamMember.update({
        where: { id: target.id },
        data: { rewardAmount: target.amount, rewardReason: target.amount ? "Reconocimiento autorizado en el cierre." : closureNote, rewardDecidedAt: closedAt }
      });
    }
    await tx.kaizenUpdate.create({ data: { projectId, userId: user.id, comment: `${outcome === "COMPLETADO" ? "Proyecto completado" : "Proyecto cancelado"}. ${closureNote} ProbocaCoins del equipo: ${totalCoins}.` } });
    await tx.auditLog.create({ data: { entity: "KaizenProject", entityId: projectId, action: `KAIZEN_${outcome}`, userId: user.id, details: JSON.stringify({ closureNote, totalCoins }) } });
    if (outcome === "COMPLETADO" && project.sourceIdeaId) {
      await tx.idea.update({ where: { id: project.sourceIdeaId }, data: { status: "IMPLEMENTADA", implementedAt: closedAt } });
    }
    });
  } catch (error) {
    if (error instanceof KaizenAlreadyClosedError) redirect(`/kaizen/${projectId}?error=cerrado`);
    throw error;
  }
  revalidatePath("/kaizen");
  revalidatePath("/kaizen/kanban");
  revalidatePath("/kaizen/gantt");
  revalidatePath("/kaizen/repositorio");
  revalidatePath("/probocacoins");
  revalidatePath(`/kaizen/${projectId}`);
  redirect(`/kaizen/${projectId}?success=cerrado${totalCoins ? `&coins=${totalCoins}` : ""}`);
}

export async function updateKaizenRewardsAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const projectId = text(formData, "projectId");
  const project = await prisma.kaizenProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { teamMembers: true }
  });
  if (project.status !== "COMPLETADO" && project.status !== "CANCELADO") redirect(`/kaizen/${projectId}?error=no_cerrado`);
  const targets = kaizenCoinTargets(formData, project.teamMembers);
  if (!project.teamMembers.length || targets.some((target) => !target)) redirect(`/kaizen/${projectId}?error=coins`);
  const validTargets = targets.filter((target): target is NonNullable<typeof target> => Boolean(target));
  await serializableTransaction(async (tx) => {
    for (const target of validTargets) {
      const participant = await resolveParticipantFromUser(target.userId, tx);
      await reconcileCoinSourceAmount({
        participantId: participant.id,
        sourceType: "KAIZEN",
        sourceId: projectId,
        targetAmount: target.amount,
        description: `${project.folio} - ajuste autorizado del reconocimiento del equipo`,
        createdById: user.id
      }, tx);
      await tx.kaizenTeamMember.update({
        where: { id: target.id },
        data: { rewardAmount: target.amount, rewardReason: target.amount ? "Reconocimiento ajustado por Mejora Continua." : "Sin reconocimiento despues de la conciliacion.", rewardDecidedAt: new Date() }
      });
    }
  });
  const totalCoins = validTargets.reduce((sum, target) => sum + target.amount, 0);
  await auditLog({ entity: "KaizenProject", entityId: projectId, action: "KAIZEN_REWARDS_RECONCILED", userId: user.id, details: { totalCoins } });
  revalidatePath(`/kaizen/${projectId}`);
  revalidatePath("/kaizen/repositorio");
  revalidatePath("/probocacoins");
  redirect(`/kaizen/${projectId}?success=coins`);
}

export async function createGenbaWalkAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const areaName = text(formData, "areaName");
  const visitDate = dateOrNull(formData, "visitDate");
  const coordinatorId = text(formData, "coordinatorId");
  const expectedDepartments = formData.getAll("expectedDepartments").map(String).filter((value) => genbaDepartments.includes(value));
  const attendedDepartments = formData.getAll("attendedDepartments").map(String).filter((value) => expectedDepartments.includes(value));
  const requestedActivityCount = Number.parseInt(text(formData, "activityCount") || "5", 10);
  const activityCount = Number.isFinite(requestedActivityCount) ? Math.min(25, Math.max(5, requestedActivityCount)) : 5;
  const activityInputs = Array.from({ length: activityCount }, (_, index) => ({
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
  const current = await prisma.genbaWalk.findUniqueOrThrow({ where: { id: walkId }, include: { activities: true } });
  if (current.status === "CERRADO" || current.status === "CANCELADO") redirect(`/genba/${walkId}?error=cerrado`);
  const notes = text(formData, "notes") || null;
  const unresolved = current.activities.filter((activity) => !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
  if (status === "CERRADO" && unresolved.length) redirect(`/genba/${walkId}?error=cierre_actividades`);
  if (status === "CANCELADO" && (!notes || notes.length < 3)) redirect(`/genba/${walkId}?error=justificacion`);
  const closedAt = status === "CERRADO" || status === "CANCELADO" ? new Date() : null;
  await prisma.$transaction(async (tx) => {
    await tx.genbaWalk.update({ where: { id: walkId }, data: {
      areaName: text(formData, "areaName"),
      visitDate: dateOrNull(formData, "visitDate") ?? undefined,
      expectedDepartments: JSON.stringify(expectedDepartments),
      attendedDepartments: JSON.stringify(attendedDepartments),
      notes,
      coordinatorId: text(formData, "coordinatorId"),
      status,
      closedAt
    } });
    if (status === "CANCELADO") {
      await tx.genbaActivity.updateMany({
        where: { walkId, status: { in: ["PENDIENTE", "EN_PROCESO", "BLOQUEADA"] } },
        data: { status: "CANCELADA", cancellationReason: notes, closedAt }
      });
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
  const walk = await prisma.genbaWalk.findUniqueOrThrow({ where: { id: walkId } });
  if (walk.status !== "ABIERTO") redirect(`/genba/${walkId}?error=cerrado`);
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
  if (activity.walk.status !== "ABIERTO") redirect(`/genba/${activity.walkId}?error=cerrado`);
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
          createdById: user.id,
          teamMembers: { create: { userId: leaderId, role: "Lider" } }
        }
      });
    });
    projectId = project.id;
  }

  const kaizenActivity = await prisma.$transaction(async (tx) => {
    const maximum = await tx.kaizenActivity.aggregate({ where: { projectId }, _max: { number: true } });
    const created = await tx.kaizenActivity.create({
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
    if (created.ownerId) {
      await tx.kaizenTeamMember.upsert({
        where: { projectId_userId: { projectId, userId: created.ownerId } },
        update: {},
        create: { projectId, userId: created.ownerId, role: "Responsable de actividad" }
      });
    }
    return created;
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
  let employeeNumber: string | null;
  try {
    employeeNumber = normalizeEmployeeNumber(text(formData, "employeeNumber"));
  } catch (error) {
    if (error instanceof EmployeeNumberValidationError) redirect("/configuracion?error=empleado_formato#usuarios");
    throw error;
  }
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
        name: text(formData, "name"),
        email,
        role,
        jobTitle: text(formData, "jobTitle") || null,
        employeeNumber,
        active: checked(formData, "active"),
        kaizenAccess: checked(formData, "kaizenAccess"),
        genbaAccess: checked(formData, "genbaAccess"),
        passwordHash: await bcrypt.hash(password, 10)
        }
      });
      if (created.active) await resolveParticipantFromUser(created.id, tx);
      return created;
    });
  } catch (error) {
    const duplicate = userUniqueError(error);
    if (duplicate) redirect(`/configuracion?error=${duplicate}#usuarios`);
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
  let employeeNumber: string | null;
  try {
    employeeNumber = normalizeEmployeeNumber(text(formData, "employeeNumber"));
  } catch (error) {
    if (error instanceof EmployeeNumberValidationError) redirect(`/configuracion?error=empleado_formato&user=${encodeURIComponent(userId)}#usuarios`);
    throw error;
  }
  const data = {
    name: text(formData, "name"),
    email,
    role,
    jobTitle: text(formData, "jobTitle") || null,
    employeeNumber,
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
      if (updated.active) {
        await resolveParticipantFromUser(updated.id, tx);
      } else {
        await tx.participant.updateMany({ where: { userId: updated.id }, data: { active: false } });
      }
      return updated;
    });
  } catch (error) {
    const duplicate = userUniqueError(error);
    if (duplicate) redirect(`/configuracion?error=${duplicate}&user=${encodeURIComponent(userId)}#usuarios`);
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

export async function deleteInactiveUserAction(formData: FormData) {
  const admin = await requireUser(["ADMIN"]);
  const userId = text(formData, "userId");
  if (!userId) redirect("/configuracion?error=usuario#usuarios");
  if (userId === admin.id) redirect("/configuracion?error=usuario_propio&status=inactive#usuarios");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      participant: { include: { _count: { select: { ideas: true, enrollments: true, coinTransactions: true } } } },
      _count: {
        select: {
          supervisedAreas: true,
          supervisedIdeas: true,
          ownedImplementations: true,
          approvals: true,
          comments: true,
          auditLogs: true,
          ledKaizenProjects: true,
          createdKaizenProjects: true,
          ownedKaizenActivities: true,
          kaizenUpdates: true,
          coordinatedGenbaWalks: true,
          createdGenbaWalks: true,
          ownedGenbaActivities: true,
          genbaUpdates: true,
          routedOrgUnits: true,
          orgMemberships: true,
          assignedSupportIdeas: true,
          followedIdeas: true,
          createdIdeaFollowers: true,
          createdTrainingPrograms: true,
          createdTrainingSessions: true,
          createdCoinTransactions: true
        }
      }
    }
  });
  if (!target) redirect("/configuracion?error=usuario#usuarios");
  if (target.active) redirect(`/configuracion?error=usuario_activo&status=active&user=${encodeURIComponent(target.id)}#usuarios`);

  const userHistory = Object.values(target._count).reduce((sum, count) => sum + count, 0);
  const participantHistory = target.participant
    ? target.participant._count.ideas + target.participant._count.enrollments + target.participant._count.coinTransactions
    : 0;
  if (userHistory || participantHistory) {
    redirect(`/configuracion?error=usuario_historial&status=inactive&user=${encodeURIComponent(target.id)}#usuarios`);
  }

  const removedAddress = `deleted-${target.id}@inactive.proboca`;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.notificationOutbox.updateMany({
        where: { to: target.email },
        data: { to: removedAddress, status: "DISMISSED", errorMessage: "Cuenta eliminada por el administrador." }
      });
      if (target.participant) await tx.participant.delete({ where: { id: target.participant.id } });
      await tx.user.delete({ where: { id: target.id } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirect(`/configuracion?error=usuario_historial&status=inactive&user=${encodeURIComponent(target.id)}#usuarios`);
    }
    throw error;
  }

  await auditLog({ entity: "User", entityId: target.id, action: "USER_DELETED", userId: admin.id, details: { name: target.name, previousEmail: target.email } });
  revalidatePath("/configuracion");
  revalidatePath("/configuracion/estructura");
  revalidatePath("/entrenamientos");
  revalidatePath("/probocacoins");
  redirect("/configuracion?success=usuario_eliminado&status=inactive#usuarios");
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
