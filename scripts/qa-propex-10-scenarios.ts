import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import {
  ApprovalDecision,
  ApprovalStatus,
  ApprovalType,
  CoinSourceType,
  CoinTransactionType,
  GenbaAttachmentType,
  GenbaStatus,
  IdeaCategory,
  IdeaStatus,
  KaizenAttachmentType,
  KaizenStatus,
  OrgUnitType,
  Prisma,
  PrismaClient,
  Role,
  TrainingEnrollmentStatus,
  WorkItemStatus
} from "@prisma/client";

const TAG = "QA/E2E";
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const productionOptIn = process.env.ALLOW_PRODUCTION_DEMO_SEED === "1";

function assertSafeDatabase() {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no esta definida. Para ejecutar localmente usa DATABASE_URL=file:./dev.db."
    );
  }

  if (!databaseUrl.toLowerCase().startsWith("file:") && !productionOptIn) {
    throw new Error(
      "Carga bloqueada: una base en linea requiere ALLOW_PRODUCTION_DEMO_SEED=1."
    );
  }
}

assertSafeDatabase();

const prisma = new PrismaClient();

class VerificationError extends Error {}
class InsufficientBalanceError extends Error {}

type ScenarioResult = {
  id: string;
  name: string;
  evidence: string;
};

type Foundation = Awaited<ReturnType<typeof ensureFoundation>>;

function qaDate(dayOffset: number, hour = 12) {
  return new Date(Date.UTC(2026, 6, 1 + dayOffset, hour, 0, 0));
}

function verify(condition: unknown, message: string): asserts condition {
  if (!condition) throw new VerificationError(message);
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function ensureUser(input: {
  email: string;
  name: string;
  role: Role;
  jobTitle: string;
  kaizenAccess?: boolean;
  genbaAccess?: boolean;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        role: input.role,
        jobTitle: input.jobTitle,
        active: true,
        kaizenAccess: input.kaizenAccess ?? existing.kaizenAccess,
        genbaAccess: input.genbaAccess ?? existing.genbaAccess
      }
    });
  }

  // The random value creates a valid hash but intentionally leaves no reusable QA credential.
  const passwordHash = await hash(randomUUID(), 4);
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      jobTitle: input.jobTitle,
      active: true,
      kaizenAccess: input.kaizenAccess ?? false,
      genbaAccess: input.genbaAccess ?? false,
      passwordHash
    }
  });
}

async function ensureMembership(input: {
  userId: string;
  orgUnitId: string;
  title: string;
  level: number;
  managerMembershipId?: string | null;
  canReviewTeam?: boolean;
  canReceiveIdeas?: boolean;
  canManageActivities?: boolean;
  sortOrder?: number;
}) {
  return prisma.orgMembership.upsert({
    where: {
      userId_orgUnitId: { userId: input.userId, orgUnitId: input.orgUnitId }
    },
    create: {
      userId: input.userId,
      orgUnitId: input.orgUnitId,
      title: input.title,
      level: input.level,
      managerMembershipId: input.managerMembershipId ?? null,
      canReviewTeam: input.canReviewTeam ?? false,
      canReceiveIdeas: input.canReceiveIdeas ?? false,
      canManageActivities: input.canManageActivities ?? false,
      active: true,
      sortOrder: input.sortOrder ?? input.level
    },
    update: {
      title: input.title,
      level: input.level,
      managerMembershipId: input.managerMembershipId ?? null,
      canReviewTeam: input.canReviewTeam ?? false,
      canReceiveIdeas: input.canReceiveIdeas ?? false,
      canManageActivities: input.canManageActivities ?? false,
      active: true,
      sortOrder: input.sortOrder ?? input.level
    }
  });
}

async function ensureEscalationRule(input: {
  orgUnitId: string;
  name: string;
  submitterLabel: string;
  submitterLevel: number;
  reviewerMembershipId: string;
  circumstance: string;
  isDefault?: boolean;
  sortOrder: number;
}) {
  const existing = await prisma.orgEscalationRule.findFirst({
    where: { orgUnitId: input.orgUnitId, name: input.name }
  });
  const data = {
    submitterLabel: input.submitterLabel,
    submitterLevel: input.submitterLevel,
    reviewerMembershipId: input.reviewerMembershipId,
    circumstance: input.circumstance,
    isDefault: input.isDefault ?? false,
    active: true,
    sortOrder: input.sortOrder
  };

  return existing
    ? prisma.orgEscalationRule.update({ where: { id: existing.id }, data })
    : prisma.orgEscalationRule.create({
        data: { orgUnitId: input.orgUnitId, name: input.name, ...data }
      });
}

async function ensureFoundation() {
  const users = {
    admin: await ensureUser({
      email: "qa.e2e.admin@example.test",
      name: `[${TAG}] Administrador`,
      role: Role.ADMIN,
      jobTitle: "Administrador QA",
      kaizenAccess: true,
      genbaAccess: true
    }),
    manager: await ensureUser({
      email: "qa.e2e.gerente@example.test",
      name: `[${TAG}] Gerente asignado`,
      role: Role.COLABORADOR,
      jobTitle: "Gerente de Operaciones",
      kaizenAccess: true,
      genbaAccess: true
    }),
    shiftLead: await ensureUser({
      email: "qa.e2e.jefe-turno@example.test",
      name: `[${TAG}] Jefe de turno`,
      role: Role.COLABORADOR,
      jobTitle: "Jefe de turno"
    }),
    supervisor: await ensureUser({
      email: "qa.e2e.supervisor@example.test",
      name: `[${TAG}] Supervisor`,
      role: Role.SUPERVISOR,
      jobTitle: "Supervisor de Produccion"
    }),
    operator: await ensureUser({
      email: "qa.e2e.operador@example.test",
      name: `[${TAG}] Operador`,
      role: Role.COLABORADOR,
      jobTitle: "Operador"
    }),
    follower: await ensureUser({
      email: "qa.e2e.seguidor@example.test",
      name: `[${TAG}] Seguidor sin permiso`,
      role: Role.COLABORADOR,
      jobTitle: "Observador"
    }),
    quality: await ensureUser({
      email: "qa.e2e.calidad@example.test",
      name: `[${TAG}] Calidad`,
      role: Role.CALIDAD,
      jobTitle: "Validador de Calidad"
    }),
    safety: await ensureUser({
      email: "qa.e2e.seguridad@example.test",
      name: `[${TAG}] Seguridad`,
      role: Role.SEGURIDAD,
      jobTitle: "Validador de Seguridad"
    }),
    maintenance: await ensureUser({
      email: "qa.e2e.mantenimiento@example.test",
      name: `[${TAG}] Mantenimiento`,
      role: Role.MANTENIMIENTO,
      jobTitle: "Validador de Mantenimiento"
    }),
    continuousImprovement: await ensureUser({
      email: "qa.e2e.mejora@example.test",
      name: `[${TAG}] Mejora Continua`,
      role: Role.MEJORA_CONTINUA,
      jobTitle: "Lider de Mejora Continua",
      kaizenAccess: true,
      genbaAccess: true
    }),
    participant: await ensureUser({
      email: "qa.e2e.sofia@example.test",
      name: `[${TAG}] Sofia Lopez`,
      role: Role.COLABORADOR,
      jobTitle: "Operadora"
    })
  };

  const apodaca = await prisma.plant.upsert({
    where: { code: "QA-E2E-APO" },
    create: { code: "QA-E2E-APO", name: `[${TAG}] Apodaca`, active: true },
    update: { name: `[${TAG}] Apodaca`, active: true }
  });
  const elCarmen = await prisma.plant.upsert({
    where: { code: "QA-E2E-CAR" },
    create: { code: "QA-E2E-CAR", name: `[${TAG}] El Carmen`, active: true },
    update: { name: `[${TAG}] El Carmen`, active: true }
  });

  const productionArea = await prisma.area.upsert({
    where: { code: "QA-E2E-P1" },
    create: {
      code: "QA-E2E-P1",
      name: `[${TAG}] Produccion P1`,
      supervisorId: users.supervisor.id,
      active: true
    },
    update: {
      name: `[${TAG}] Produccion P1`,
      supervisorId: users.supervisor.id,
      active: true
    }
  });

  const operations = await prisma.orgUnit.upsert({
    where: { code: "QA-E2E-APO-OPS" },
    create: {
      plantId: apodaca.id,
      type: OrgUnitType.MACROPROCESO,
      code: "QA-E2E-APO-OPS",
      name: `[${TAG}] Operaciones`,
      responsible: users.manager.name,
      manager: users.manager.name,
      routingUserId: users.manager.id,
      active: true,
      sortOrder: 1
    },
    update: {
      plantId: apodaca.id,
      parentId: null,
      type: OrgUnitType.MACROPROCESO,
      name: `[${TAG}] Operaciones`,
      responsible: users.manager.name,
      manager: users.manager.name,
      routingUserId: users.manager.id,
      active: true,
      sortOrder: 1
    }
  });

  const production = await prisma.orgUnit.upsert({
    where: { code: "QA-E2E-APO-P1" },
    create: {
      plantId: apodaca.id,
      parentId: operations.id,
      type: OrgUnitType.AREA,
      code: "QA-E2E-APO-P1",
      name: `[${TAG}] Produccion P1`,
      responsible: users.supervisor.name,
      manager: users.manager.name,
      routingUserId: users.supervisor.id,
      captureAreaId: productionArea.id,
      qrEnabled: true,
      active: true,
      sortOrder: 1
    },
    update: {
      plantId: apodaca.id,
      parentId: operations.id,
      type: OrgUnitType.AREA,
      name: `[${TAG}] Produccion P1`,
      responsible: users.supervisor.name,
      manager: users.manager.name,
      routingUserId: users.supervisor.id,
      captureAreaId: productionArea.id,
      qrEnabled: true,
      active: true,
      sortOrder: 1
    }
  });

  const supportDefinitions = [
    { key: "quality", code: "QA-E2E-APO-CAL", name: "Calidad", user: users.quality },
    { key: "safety", code: "QA-E2E-APO-SEG", name: "Seguridad", user: users.safety },
    { key: "maintenance", code: "QA-E2E-APO-MAN", name: "Mantenimiento", user: users.maintenance }
  ] as const;
  const supportUnits: Record<(typeof supportDefinitions)[number]["key"], Awaited<ReturnType<typeof prisma.orgUnit.upsert>>> = {} as never;

  for (const definition of supportDefinitions) {
    supportUnits[definition.key] = await prisma.orgUnit.upsert({
      where: { code: definition.code },
      create: {
        plantId: apodaca.id,
        parentId: operations.id,
        type: OrgUnitType.DEPARTAMENTO,
        code: definition.code,
        name: `[${TAG}] ${definition.name}`,
        responsible: definition.user.name,
        manager: definition.user.name,
        routingUserId: definition.user.id,
        isSupportArea: true,
        active: true,
        sortOrder: 20
      },
      update: {
        plantId: apodaca.id,
        parentId: operations.id,
        type: OrgUnitType.DEPARTAMENTO,
        name: `[${TAG}] ${definition.name}`,
        responsible: definition.user.name,
        manager: definition.user.name,
        routingUserId: definition.user.id,
        isSupportArea: true,
        active: true,
        sortOrder: 20
      }
    });
  }

  const carmenArea = await prisma.area.upsert({
    where: { code: "QA-E2E-CAR-PROD" },
    create: {
      code: "QA-E2E-CAR-PROD",
      name: `[${TAG}] Produccion El Carmen`,
      active: true
    },
    update: { name: `[${TAG}] Produccion El Carmen`, active: true }
  });
  const carmenProduction = await prisma.orgUnit.upsert({
    where: { code: "QA-E2E-CAR-PROD" },
    create: {
      plantId: elCarmen.id,
      type: OrgUnitType.AREA,
      code: "QA-E2E-CAR-PROD",
      name: `[${TAG}] Produccion`,
      responsible: "Responsable QA El Carmen",
      manager: "Gerencia QA El Carmen",
      captureAreaId: carmenArea.id,
      qrEnabled: true,
      active: true,
      sortOrder: 1
    },
    update: {
      plantId: elCarmen.id,
      parentId: null,
      type: OrgUnitType.AREA,
      name: `[${TAG}] Produccion`,
      responsible: "Responsable QA El Carmen",
      manager: "Gerencia QA El Carmen",
      captureAreaId: carmenArea.id,
      qrEnabled: true,
      active: true,
      sortOrder: 1
    }
  });

  const managerMembership = await ensureMembership({
    userId: users.manager.id,
    orgUnitId: production.id,
    title: "Gerente",
    level: 3,
    canReviewTeam: true,
    canReceiveIdeas: true,
    canManageActivities: true,
    sortOrder: 1
  });
  const shiftMembership = await ensureMembership({
    userId: users.shiftLead.id,
    orgUnitId: production.id,
    title: "Jefe de turno",
    level: 2,
    managerMembershipId: managerMembership.id,
    canReviewTeam: true,
    canReceiveIdeas: true,
    canManageActivities: true,
    sortOrder: 2
  });
  const supervisorMembership = await ensureMembership({
    userId: users.supervisor.id,
    orgUnitId: production.id,
    title: "Supervisor",
    level: 1,
    managerMembershipId: shiftMembership.id,
    canReviewTeam: true,
    canReceiveIdeas: true,
    canManageActivities: true,
    sortOrder: 3
  });
  const operatorMembership = await ensureMembership({
    userId: users.operator.id,
    orgUnitId: production.id,
    title: "Operador",
    level: 0,
    managerMembershipId: supervisorMembership.id,
    sortOrder: 4
  });
  await ensureMembership({
    userId: users.participant.id,
    orgUnitId: production.id,
    title: "Operadora",
    level: 0,
    managerMembershipId: supervisorMembership.id,
    sortOrder: 5
  });
  await ensureMembership({
    userId: users.continuousImprovement.id,
    orgUnitId: operations.id,
    title: "Mejora Continua",
    level: 2,
    canReviewTeam: true,
    canReceiveIdeas: true,
    canManageActivities: true
  });
  await ensureMembership({
    userId: users.quality.id,
    orgUnitId: supportUnits.quality.id,
    title: "Validador",
    level: 1,
    canReviewTeam: true,
    canReceiveIdeas: true
  });
  await ensureMembership({
    userId: users.safety.id,
    orgUnitId: supportUnits.safety.id,
    title: "Validador",
    level: 1,
    canReviewTeam: true,
    canReceiveIdeas: true
  });
  await ensureMembership({
    userId: users.maintenance.id,
    orgUnitId: supportUnits.maintenance.id,
    title: "Validador",
    level: 1,
    canReviewTeam: true,
    canReceiveIdeas: true
  });

  const routes = {
    operator: await ensureEscalationRule({
      orgUnitId: production.id,
      name: `[${TAG}] Operador a supervisor`,
      submitterLabel: "Operador",
      submitterLevel: 0,
      reviewerMembershipId: supervisorMembership.id,
      circumstance: "Idea creada por personal operativo",
      isDefault: true,
      sortOrder: 1
    }),
    supervisor: await ensureEscalationRule({
      orgUnitId: production.id,
      name: `[${TAG}] Supervisor a jefe de turno`,
      submitterLabel: "Supervisor",
      submitterLevel: 1,
      reviewerMembershipId: shiftMembership.id,
      circumstance: "Idea creada por supervision",
      sortOrder: 2
    }),
    shiftLead: await ensureEscalationRule({
      orgUnitId: production.id,
      name: `[${TAG}] Jefe de turno a gerente`,
      submitterLabel: "Jefe de turno",
      submitterLevel: 2,
      reviewerMembershipId: managerMembership.id,
      circumstance: "Idea creada por jefatura de turno",
      sortOrder: 3
    })
  };

  const participant = await prisma.participant.upsert({
    where: { employeeNumber: "QA-E2E-1001" },
    create: {
      userId: users.participant.id,
      orgUnitId: production.id,
      name: users.participant.name,
      employeeNumber: "QA-E2E-1001",
      email: users.participant.email,
      jobTitle: users.participant.jobTitle,
      active: true
    },
    update: {
      userId: users.participant.id,
      orgUnitId: production.id,
      name: users.participant.name,
      email: users.participant.email,
      jobTitle: users.participant.jobTitle,
      active: true
    }
  });

  return {
    users,
    plants: { apodaca, elCarmen },
    areas: { productionArea, carmenArea },
    units: { operations, production, carmenProduction, ...supportUnits },
    memberships: {
      manager: managerMembership,
      shiftLead: shiftMembership,
      supervisor: supervisorMembership,
      operator: operatorMembership
    },
    routes,
    participant
  };
}

async function ensureIdea(input: {
  folio: string;
  areaId: string;
  collaboratorName: string;
  collaboratorEmail?: string | null;
  employeeNumber?: string | null;
  participantId?: string | null;
  problem: string;
  proposal: string;
  expectedBenefit: string;
  category?: IdeaCategory;
  status: IdeaStatus;
  supervisorId?: string | null;
  implementationOwnerId?: string | null;
  escalationRuleId?: string | null;
  submitterPosition?: string | null;
  classification?: Prisma.IdeaUncheckedCreateInput["classification"];
  impactsQuality?: boolean;
  impactsSafety?: boolean;
  requiresMaintenance?: boolean;
  requiresExternalSupport?: boolean;
  pointsAssigned?: number;
}) {
  const data = {
    collaboratorName: input.collaboratorName,
    collaboratorEmail: input.collaboratorEmail ?? null,
    employeeNumber: input.employeeNumber ?? null,
    participantId: input.participantId ?? null,
    areaId: input.areaId,
    shift: "QA/E2E - Primer turno",
    problem: input.problem,
    proposal: input.proposal,
    expectedBenefit: input.expectedBenefit,
    impactTypes: JSON.stringify(["QA/E2E", "PRODUCTIVIDAD"]),
    category: input.category ?? IdeaCategory.A,
    status: input.status,
    supervisorId: input.supervisorId ?? null,
    implementationOwnerId: input.implementationOwnerId ?? null,
    escalationRuleId: input.escalationRuleId ?? null,
    submitterPosition: input.submitterPosition ?? null,
    classification: input.classification ?? null,
    impactsQuality: input.impactsQuality ?? false,
    impactsSafety: input.impactsSafety ?? false,
    requiresMaintenance: input.requiresMaintenance ?? false,
    requiresExternalSupport: input.requiresExternalSupport ?? false,
    requiresEvidence: true,
    pointsAssigned: input.pointsAssigned ?? 0
  };

  return prisma.idea.upsert({
    where: { folio: input.folio },
    create: { folio: input.folio, ...data },
    update: data
  });
}

async function ensureApproval(input: {
  ideaId: string;
  type: ApprovalType;
  assignedToId: string;
  status: ApprovalStatus;
  decision?: ApprovalDecision | null;
  comments: string;
  decidedAt?: Date | null;
}) {
  return prisma.approval.upsert({
    where: { ideaId_type: { ideaId: input.ideaId, type: input.type } },
    create: {
      ideaId: input.ideaId,
      type: input.type,
      assignedToId: input.assignedToId,
      status: input.status,
      decision: input.decision ?? null,
      comments: input.comments,
      decidedAt: input.decidedAt ?? null
    },
    update: {
      assignedToId: input.assignedToId,
      status: input.status,
      decision: input.decision ?? null,
      comments: input.comments,
      decidedAt: input.decidedAt ?? null
    }
  });
}

async function ensureSupportRequest(input: {
  ideaId: string;
  orgUnitId: string;
  assignedToId: string;
  comments: string;
  activatedAt: Date;
}) {
  return prisma.ideaSupportRequest.upsert({
    where: { ideaId_orgUnitId: { ideaId: input.ideaId, orgUnitId: input.orgUnitId } },
    create: {
      ideaId: input.ideaId,
      orgUnitId: input.orgUnitId,
      assignedToId: input.assignedToId,
      status: ApprovalStatus.APPROVED,
      decision: ApprovalDecision.APROBAR,
      comments: input.comments,
      activatedAt: input.activatedAt,
      decidedAt: input.activatedAt
    },
    update: {
      assignedToId: input.assignedToId,
      status: ApprovalStatus.APPROVED,
      decision: ApprovalDecision.APROBAR,
      comments: input.comments,
      activatedAt: input.activatedAt,
      decidedAt: input.activatedAt
    }
  });
}

async function ensureAudit(input: {
  entity: string;
  entityId: string;
  action: string;
  userId?: string | null;
  details: Record<string, unknown>;
}) {
  const details = JSON.stringify({ tag: TAG, ...input.details });
  const existing = await prisma.auditLog.findFirst({
    where: { entity: input.entity, entityId: input.entityId, action: input.action }
  });
  return existing
    ? prisma.auditLog.update({
        where: { id: existing.id },
        data: { userId: input.userId ?? null, details }
      })
    : prisma.auditLog.create({
        data: {
          entity: input.entity,
          entityId: input.entityId,
          action: input.action,
          userId: input.userId ?? null,
          details
        }
      });
}

async function ensureComment(input: {
  ideaId: string;
  userId: string;
  marker: string;
  comment: string;
}) {
  const taggedComment = `[${TAG}:${input.marker}] ${input.comment}`;
  const existing = await prisma.comment.findFirst({
    where: { ideaId: input.ideaId, comment: taggedComment }
  });
  return existing ?? prisma.comment.create({
    data: { ideaId: input.ideaId, userId: input.userId, comment: taggedComment }
  });
}

async function allocateKaizenNumber() {
  const maximum = await prisma.kaizenProject.aggregate({ _max: { number: true } });
  return (maximum._max.number ?? 0) + 1;
}

async function ensureKaizenProject(input: {
  folio: string;
  title: string;
  plant: string;
  area: string;
  objective: string;
  scope: string;
  status: KaizenStatus;
  startDate: Date;
  endDate: Date;
  leaderId: string;
  createdById: string;
  sourceIdeaId?: string | null;
  orgUnitId?: string | null;
}) {
  const existing = await prisma.kaizenProject.findUnique({ where: { folio: input.folio } });
  const data = {
    title: input.title,
    plant: input.plant,
    area: input.area,
    objective: input.objective,
    scope: input.scope,
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    leaderId: input.leaderId,
    createdById: input.createdById,
    sourceIdeaId: input.sourceIdeaId ?? null,
    orgUnitId: input.orgUnitId ?? null
  };
  if (existing) return prisma.kaizenProject.update({ where: { id: existing.id }, data });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.kaizenProject.create({
        data: { number: await allocateKaizenNumber(), folio: input.folio, ...data }
      });
    } catch (error) {
      if (!isUniqueConflict(error) || attempt === 3) throw error;
      const concurrent = await prisma.kaizenProject.findUnique({ where: { folio: input.folio } });
      if (concurrent) return prisma.kaizenProject.update({ where: { id: concurrent.id }, data });
    }
  }
  throw new Error(`No fue posible asignar numero a ${input.folio}.`);
}

async function ensureKaizenActivity(input: {
  projectId: string;
  number: number;
  problem: string;
  action: string;
  ownerId: string;
  startDate: Date;
  dueDate: Date;
  status: WorkItemStatus;
  completionNote?: string | null;
  mergeReason?: string | null;
  mergedIntoId?: string | null;
  closedAt?: Date | null;
}) {
  const data = {
    problem: input.problem,
    action: input.action,
    ownerId: input.ownerId,
    startDate: input.startDate,
    dueDate: input.dueDate,
    status: input.status,
    completionNote: input.completionNote ?? null,
    mergeReason: input.mergeReason ?? null,
    mergedIntoId: input.mergedIntoId ?? null,
    closedAt: input.closedAt ?? null
  };
  return prisma.kaizenActivity.upsert({
    where: { projectId_number: { projectId: input.projectId, number: input.number } },
    create: { projectId: input.projectId, number: input.number, ...data },
    update: data
  });
}

async function ensureKaizenAttachment(input: {
  projectId: string;
  activityId?: string | null;
  type: KaizenAttachmentType;
  filename: string;
  uploadedBy: string;
}) {
  const existing = await prisma.kaizenAttachment.findFirst({
    where: { projectId: input.projectId, activityId: input.activityId ?? null, filename: input.filename }
  });
  return existing ?? prisma.kaizenAttachment.create({
    data: {
      projectId: input.projectId,
      activityId: input.activityId ?? null,
      type: input.type,
      filename: input.filename,
      path: `/qa-e2e/${input.filename}`,
      uploadedBy: input.uploadedBy
    }
  });
}

async function ensureKaizenUpdate(input: {
  projectId: string;
  activityId?: string | null;
  userId: string;
  marker: string;
  comment: string;
}) {
  const comment = `[${TAG}:${input.marker}] ${input.comment}`;
  const existing = await prisma.kaizenUpdate.findFirst({
    where: { projectId: input.projectId, activityId: input.activityId ?? null, comment }
  });
  return existing ?? prisma.kaizenUpdate.create({
    data: {
      projectId: input.projectId,
      activityId: input.activityId ?? null,
      userId: input.userId,
      comment
    }
  });
}

async function allocateGenbaNumber() {
  const maximum = await prisma.genbaWalk.aggregate({ _max: { number: true } });
  return (maximum._max.number ?? 0) + 1;
}

async function ensureGenbaWalk(input: {
  folio: string;
  areaName: string;
  visitDate: Date;
  coordinatorId: string;
  createdById: string;
  orgUnitId: string;
}) {
  const data = {
    areaName: input.areaName,
    visitDate: input.visitDate,
    expectedDepartments: JSON.stringify(["Operaciones", "Calidad", "Seguridad", "Mantenimiento"]),
    attendedDepartments: JSON.stringify(["Operaciones", "Calidad", "Seguridad"]),
    notes: `[${TAG}-07] Recorrido con seis actividades y una promocion a Kaizen.`,
    status: GenbaStatus.ABIERTO,
    coordinatorId: input.coordinatorId,
    createdById: input.createdById,
    orgUnitId: input.orgUnitId,
    closedAt: null
  };
  const existing = await prisma.genbaWalk.findUnique({ where: { folio: input.folio } });
  if (existing) return prisma.genbaWalk.update({ where: { id: existing.id }, data });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.genbaWalk.create({
        data: { number: await allocateGenbaNumber(), folio: input.folio, ...data }
      });
    } catch (error) {
      if (!isUniqueConflict(error) || attempt === 3) throw error;
      const concurrent = await prisma.genbaWalk.findUnique({ where: { folio: input.folio } });
      if (concurrent) return prisma.genbaWalk.update({ where: { id: concurrent.id }, data });
    }
  }
  throw new Error(`No fue posible asignar numero a ${input.folio}.`);
}

async function ensureGenbaActivity(input: {
  walkId: string;
  number: number;
  problem: string;
  action: string;
  ownerId: string;
  dueDate: Date;
  status: WorkItemStatus;
  completionNote?: string | null;
  mergeReason?: string | null;
  mergedIntoId?: string | null;
  closedAt?: Date | null;
}) {
  const data = {
    problem: input.problem,
    action: input.action,
    ownerId: input.ownerId,
    dueDate: input.dueDate,
    status: input.status,
    completionNote: input.completionNote ?? null,
    mergeReason: input.mergeReason ?? null,
    mergedIntoId: input.mergedIntoId ?? null,
    closedAt: input.closedAt ?? null
  };
  return prisma.genbaActivity.upsert({
    where: { walkId_number: { walkId: input.walkId, number: input.number } },
    create: { walkId: input.walkId, number: input.number, ...data },
    update: data
  });
}

async function ensureGenbaAttachment(input: {
  walkId: string;
  activityId: string;
  filename: string;
  uploadedBy: string;
}) {
  const existing = await prisma.genbaAttachment.findFirst({
    where: { walkId: input.walkId, activityId: input.activityId, filename: input.filename }
  });
  return existing ?? prisma.genbaAttachment.create({
    data: {
      walkId: input.walkId,
      activityId: input.activityId,
      type: GenbaAttachmentType.EVIDENCE,
      filename: input.filename,
      path: `/qa-e2e/${input.filename}`,
      uploadedBy: input.uploadedBy
    }
  });
}

async function ensureGenbaUpdate(input: {
  walkId: string;
  activityId?: string | null;
  userId: string;
  marker: string;
  comment: string;
}) {
  const comment = `[${TAG}:${input.marker}] ${input.comment}`;
  const existing = await prisma.genbaUpdate.findFirst({
    where: { walkId: input.walkId, activityId: input.activityId ?? null, comment }
  });
  return existing ?? prisma.genbaUpdate.create({
    data: {
      walkId: input.walkId,
      activityId: input.activityId ?? null,
      userId: input.userId,
      comment
    }
  });
}

async function ensureTrainingSession(input: {
  programId: string;
  marker: string;
  sessionDate: Date;
  trainerName: string;
  plantId: string;
  orgUnitId: string;
  createdById: string;
}) {
  const notes = `[${TAG}:${input.marker}] Sesion integral de demostracion.`;
  const existing = await prisma.trainingSession.findFirst({
    where: { programId: input.programId, notes }
  });
  const data = {
    sessionDate: input.sessionDate,
    trainerName: input.trainerName,
    plantId: input.plantId,
    orgUnitId: input.orgUnitId,
    createdById: input.createdById,
    notes
  };
  return existing
    ? prisma.trainingSession.update({ where: { id: existing.id }, data })
    : prisma.trainingSession.create({ data: { programId: input.programId, ...data } });
}

async function ensureCoinTransaction(input: {
  reference: string;
  participantId: string;
  type: CoinTransactionType;
  sourceType: CoinSourceType;
  sourceId?: string | null;
  amount: number;
  description: string;
  createdById: string;
  occurredAt: Date;
}) {
  const normalizedAmount = input.type === CoinTransactionType.AWARD
    ? Math.abs(Math.trunc(input.amount))
    : input.type === CoinTransactionType.REDEMPTION
      ? -Math.abs(Math.trunc(input.amount))
      : Math.trunc(input.amount);
  verify(normalizedAmount !== 0, `El movimiento ${input.reference} no puede ser cero.`);
  const existing = await prisma.coinTransaction.findUnique({ where: { reference: input.reference } });
  if (existing) {
    verify(
      existing.participantId === input.participantId,
      `La referencia ${input.reference} pertenece a otra persona.`
    );
  }
  return prisma.coinTransaction.upsert({
    where: { reference: input.reference },
    create: {
      reference: input.reference,
      participantId: input.participantId,
      type: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      amount: normalizedAmount,
      description: input.description,
      createdById: input.createdById,
      occurredAt: input.occurredAt
    },
    update: {
      type: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      amount: normalizedAmount,
      description: input.description,
      createdById: input.createdById,
      occurredAt: input.occurredAt
    }
  });
}

async function ensureScenarioOne(foundation: Foundation): Promise<ScenarioResult> {
  const { users, areas, memberships, routes } = foundation;
  const idea = await ensureIdea({
    folio: "QA/E2E-01-JERARQUIA",
    areaId: areas.productionArea.id,
    collaboratorName: users.shiftLead.name,
    collaboratorEmail: users.shiftLead.email,
    problem: "La jefatura requiere escalar una mejora de balanceo al gerente.",
    proposal: "Reorganizar la secuencia de arranque y validar el resultado con el equipo.",
    expectedBenefit: "Reducir esperas de arranque en 20%.",
    status: IdeaStatus.APROBADA_PARA_IMPLEMENTAR,
    supervisorId: users.manager.id,
    implementationOwnerId: users.shiftLead.id,
    escalationRuleId: routes.shiftLead.id,
    submitterPosition: "Jefe de turno"
  });
  await ensureApproval({
    ideaId: idea.id,
    type: ApprovalType.SUPERVISOR,
    assignedToId: users.manager.id,
    status: ApprovalStatus.APPROVED,
    decision: ApprovalDecision.APROBAR,
    comments: `[${TAG}-01] Aprobada por el gerente configurado, aun con rol COLABORADOR.`,
    decidedAt: qaDate(1)
  });
  await ensureAudit({
    entity: "Idea",
    entityId: idea.id,
    action: "QA_E2E_MANAGER_APPROVED",
    userId: users.manager.id,
    details: { scenario: 1, routeId: routes.shiftLead.id }
  });

  const [operator, supervisor, shiftLead, manager, approval] = await Promise.all([
    prisma.orgMembership.findUnique({ where: { id: memberships.operator.id } }),
    prisma.orgMembership.findUnique({ where: { id: memberships.supervisor.id } }),
    prisma.orgMembership.findUnique({ where: { id: memberships.shiftLead.id } }),
    prisma.orgMembership.findUnique({ where: { id: memberships.manager.id } }),
    prisma.approval.findUnique({
      where: { ideaId_type: { ideaId: idea.id, type: ApprovalType.SUPERVISOR } }
    })
  ]);
  verify(operator?.managerMembershipId === supervisor?.id, "QA/E2E-01: operador sin supervisor directo.");
  verify(supervisor?.managerMembershipId === shiftLead?.id, "QA/E2E-01: supervisor sin jefe de turno.");
  verify(shiftLead?.managerMembershipId === manager?.id, "QA/E2E-01: jefe de turno sin gerente.");
  verify(users.manager.role === Role.COLABORADOR, "QA/E2E-01: el gerente debe probar un rol no SUPERVISOR.");
  verify(
    approval?.status === ApprovalStatus.APPROVED && approval.assignedToId === users.manager.id,
    "QA/E2E-01: la aprobacion gerencial no quedo registrada."
  );

  return {
    id: "QA/E2E-01",
    name: "Jerarquia y aprobacion gerencial",
    evidence: `${idea.folio} -> ${users.manager.email}`
  };
}

async function ensureScenarioTwo(foundation: Foundation): Promise<ScenarioResult> {
  const { users, areas, routes } = foundation;
  const idea = await ensureIdea({
    folio: "QA/E2E-02-SEGUIDOR",
    areaId: areas.productionArea.id,
    collaboratorName: users.operator.name,
    collaboratorEmail: users.operator.email,
    problem: "El seguimiento gerencial necesita visibilidad sin otorgar aprobacion.",
    proposal: "Agregar a una persona como seguidora de solo consulta.",
    expectedBenefit: "Mantener trazabilidad sin ampliar permisos.",
    status: IdeaStatus.EN_REVISION_SUPERVISOR,
    supervisorId: users.manager.id,
    escalationRuleId: routes.shiftLead.id,
    submitterPosition: "Operador"
  });
  await ensureApproval({
    ideaId: idea.id,
    type: ApprovalType.SUPERVISOR,
    assignedToId: users.manager.id,
    status: ApprovalStatus.PENDING,
    comments: `[${TAG}-02] Pendiente del responsable; el seguidor solo consulta.`
  });
  await prisma.ideaFollower.upsert({
    where: { ideaId_userId: { ideaId: idea.id, userId: users.follower.id } },
    create: {
      ideaId: idea.id,
      userId: users.follower.id,
      createdById: users.admin.id,
      label: `[${TAG}] Seguimiento de solo consulta`
    },
    update: {
      createdById: users.admin.id,
      label: `[${TAG}] Seguimiento de solo consulta`
    }
  });

  const [follower, memberships, assignedApprovals, reviewerRules] = await Promise.all([
    prisma.ideaFollower.findUnique({
      where: { ideaId_userId: { ideaId: idea.id, userId: users.follower.id } }
    }),
    prisma.orgMembership.count({ where: { userId: users.follower.id, active: true } }),
    prisma.approval.count({
      where: { ideaId: idea.id, assignedToId: users.follower.id, status: ApprovalStatus.PENDING }
    }),
    prisma.orgEscalationRule.count({
      where: { reviewerMembership: { userId: users.follower.id, active: true }, active: true }
    })
  ]);
  verify(Boolean(follower), "QA/E2E-02: no se creo el seguidor.");
  verify(memberships === 0, "QA/E2E-02: el seguidor recibio una membresia no permitida.");
  verify(assignedApprovals === 0 && reviewerRules === 0, "QA/E2E-02: el seguidor obtuvo permiso de aprobar.");

  return {
    id: "QA/E2E-02",
    name: "Seguidor visible sin permiso de decision",
    evidence: `${idea.folio} -> ${users.follower.email}`
  };
}

async function ensureScenarioThree(foundation: Foundation): Promise<ScenarioResult> {
  const { users, areas, units, routes } = foundation;
  const idea = await ensureIdea({
    folio: "QA/E2E-03-VALIDACIONES",
    areaId: areas.productionArea.id,
    collaboratorName: users.operator.name,
    collaboratorEmail: users.operator.email,
    problem: "La mejora afecta calidad, seguridad y mantenimiento.",
    proposal: "Instalar un control con resguardo, estandar sanitario y ajuste tecnico.",
    expectedBenefit: "Controlar simultaneamente inocuidad, riesgo y disponibilidad.",
    category: IdeaCategory.B,
    status: IdeaStatus.APROBADA_PARA_IMPLEMENTAR,
    supervisorId: users.supervisor.id,
    escalationRuleId: routes.operator.id,
    submitterPosition: "Operador",
    impactsQuality: true,
    impactsSafety: true,
    requiresMaintenance: true
  });
  await ensureApproval({
    ideaId: idea.id,
    type: ApprovalType.SUPERVISOR,
    assignedToId: users.supervisor.id,
    status: ApprovalStatus.APPROVED,
    decision: ApprovalDecision.APROBAR,
    comments: `[${TAG}-03] El responsable solicita tres validaciones.`,
    decidedAt: qaDate(2)
  });

  const validations = [
    { type: ApprovalType.CALIDAD, user: users.quality, unit: units.quality, day: 3 },
    { type: ApprovalType.SEGURIDAD, user: users.safety, unit: units.safety, day: 4 },
    { type: ApprovalType.MANTENIMIENTO, user: users.maintenance, unit: units.maintenance, day: 5 }
  ] as const;
  for (const validation of validations) {
    await ensureApproval({
      ideaId: idea.id,
      type: validation.type,
      assignedToId: validation.user.id,
      status: ApprovalStatus.APPROVED,
      decision: ApprovalDecision.APROBAR,
      comments: `[${TAG}-03] Validacion aprobada por ${validation.type}.`,
      decidedAt: qaDate(validation.day)
    });
    await ensureSupportRequest({
      ideaId: idea.id,
      orgUnitId: validation.unit.id,
      assignedToId: validation.user.id,
      comments: `[${TAG}-03] Apoyo validado por ${validation.type}.`,
      activatedAt: qaDate(validation.day)
    });
  }
  await ensureAudit({
    entity: "Idea",
    entityId: idea.id,
    action: "QA_E2E_SUPPORT_INFO_REQUESTED_AND_RESOLVED",
    userId: users.safety.id,
    details: { scenario: 3, preservedApprovals: true }
  });

  const approvals = await prisma.approval.findMany({
    where: {
      ideaId: idea.id,
      type: { in: [ApprovalType.CALIDAD, ApprovalType.SEGURIDAD, ApprovalType.MANTENIMIENTO] }
    }
  });
  verify(approvals.length === 3, "QA/E2E-03: deben existir exactamente tres validaciones de soporte.");
  verify(
    approvals.every((approval) => approval.status === ApprovalStatus.APPROVED),
    "QA/E2E-03: alguna validacion no quedo aprobada."
  );

  return {
    id: "QA/E2E-03",
    name: "Validaciones de Calidad, Seguridad y Mantenimiento",
    evidence: `${idea.folio} -> 3/3 aprobadas`
  };
}

async function ensureScenarioFour(foundation: Foundation): Promise<ScenarioResult> {
  const { users, areas, routes } = foundation;
  const idea = await ensureIdea({
    folio: "QA/E2E-04-REVALIDACION",
    areaId: areas.productionArea.id,
    collaboratorName: users.operator.name,
    collaboratorEmail: users.operator.email,
    problem: "La primera propuesta no justificaba la inversion externa.",
    proposal: "Agregar comparativo de costo, beneficio y una alternativa interna.",
    expectedBenefit: "Reabrir una idea corregida sin perder el historial del rechazo.",
    category: IdeaCategory.C,
    status: IdeaStatus.APROBADA_PARA_IMPLEMENTAR,
    supervisorId: users.manager.id,
    escalationRuleId: routes.shiftLead.id,
    submitterPosition: "Jefe de turno",
    requiresExternalSupport: true
  });
  await ensureApproval({
    ideaId: idea.id,
    type: ApprovalType.SUPERVISOR,
    assignedToId: users.manager.id,
    status: ApprovalStatus.APPROVED,
    decision: ApprovalDecision.APROBAR,
    comments: `[${TAG}-04] Aprobada despues de la revalidacion documentada.`,
    decidedAt: qaDate(8)
  });
  await ensureComment({
    ideaId: idea.id,
    userId: users.manager.id,
    marker: "04-RECHAZO",
    comment: "Rechazo inicial: falta cotizacion y analisis de retorno."
  });
  await ensureComment({
    ideaId: idea.id,
    userId: users.continuousImprovement.id,
    marker: "04-REVALIDACION",
    comment: "Mejora Continua justifica la reapertura con informacion complementaria."
  });
  for (const event of [
    { action: "QA_E2E_IDEA_REJECTED", userId: users.manager.id, step: 1 },
    { action: "QA_E2E_IDEA_REVALIDATED", userId: users.continuousImprovement.id, step: 2 },
    { action: "QA_E2E_IDEA_REAPPROVED", userId: users.manager.id, step: 3 }
  ]) {
    await ensureAudit({
      entity: "Idea",
      entityId: idea.id,
      action: event.action,
      userId: event.userId,
      details: { scenario: 4, sequence: event.step }
    });
  }

  const history = await prisma.auditLog.findMany({
    where: {
      entityId: idea.id,
      action: { in: ["QA_E2E_IDEA_REJECTED", "QA_E2E_IDEA_REVALIDATED", "QA_E2E_IDEA_REAPPROVED"] }
    },
    select: { action: true }
  });
  verify(new Set(history.map((item) => item.action)).size === 3, "QA/E2E-04: el historial de revalidacion esta incompleto.");

  return {
    id: "QA/E2E-04",
    name: "Rechazo justificado y revalidacion",
    evidence: `${idea.folio} -> 3 eventos conservados`
  };
}

async function ensureScenarioFive(foundation: Foundation): Promise<ScenarioResult> {
  const { users, plants, areas, units, routes, participant } = foundation;
  const idea = await ensureIdea({
    folio: "QA/E2E-05-IDEA-KAIZEN",
    areaId: areas.productionArea.id,
    collaboratorName: participant.name,
    collaboratorEmail: participant.email,
    employeeNumber: participant.employeeNumber,
    participantId: participant.id,
    problem: "Los cambios de formato generan esperas y ajustes repetidos.",
    proposal: "Desarrollar un Kaizen de reduccion de tiempo de cambio.",
    expectedBenefit: "Reducir el cambio de 45 a 25 minutos.",
    category: IdeaCategory.B,
    status: IdeaStatus.APROBADA_PARA_IMPLEMENTAR,
    supervisorId: users.supervisor.id,
    implementationOwnerId: users.continuousImprovement.id,
    escalationRuleId: routes.operator.id,
    submitterPosition: "Operadora",
    classification: "KAIZEN",
    pointsAssigned: 80
  });
  await ensureApproval({
    ideaId: idea.id,
    type: ApprovalType.SUPERVISOR,
    assignedToId: users.supervisor.id,
    status: ApprovalStatus.APPROVED,
    decision: ApprovalDecision.APROBAR,
    comments: `[${TAG}-05] Idea aprobada y clasificada como Kaizen.`,
    decidedAt: qaDate(9)
  });
  const project = await ensureKaizenProject({
    folio: "QA/E2E-KZN-05",
    title: `[${TAG}] SMED desde Idea de Mejora`,
    plant: plants.apodaca.name,
    area: areas.productionArea.name,
    objective: idea.expectedBenefit,
    scope: `Origen automatico: ${idea.folio}. ${idea.proposal}`,
    status: KaizenStatus.PENDIENTE_CHARTER,
    startDate: qaDate(10),
    endDate: qaDate(100),
    leaderId: users.continuousImprovement.id,
    createdById: users.admin.id,
    sourceIdeaId: idea.id,
    orgUnitId: units.production.id
  });
  await ensureAudit({
    entity: "KaizenProject",
    entityId: project.id,
    action: "QA_E2E_KAIZEN_CREATED_FROM_IDEA",
    userId: users.continuousImprovement.id,
    details: { scenario: 5, sourceIdeaId: idea.id }
  });

  const projectsFromIdea = await prisma.kaizenProject.findMany({ where: { sourceIdeaId: idea.id } });
  verify(projectsFromIdea.length === 1, "QA/E2E-05: la idea debe generar un solo Kaizen.");
  verify(projectsFromIdea[0].folio === project.folio, "QA/E2E-05: el Kaizen no esta vinculado a la idea correcta.");

  return {
    id: "QA/E2E-05",
    name: "Transferencia automatica de Idea a Kaizen",
    evidence: `${idea.folio} -> ${project.folio}`
  };
}

async function ensureScenarioSix(foundation: Foundation): Promise<ScenarioResult> {
  const { users, plants, areas, units } = foundation;
  const project = await ensureKaizenProject({
    folio: "QA/E2E-KZN-06",
    title: `[${TAG}] Control visual de materiales`,
    plant: plants.apodaca.name,
    area: areas.productionArea.name,
    objective: "Reducir faltantes y tiempos de busqueda en 30%.",
    scope: "Tablero de actividades con evidencia, avance, bloqueo y combinacion.",
    status: KaizenStatus.EN_CURSO,
    startDate: qaDate(-15),
    endDate: qaDate(75),
    leaderId: users.continuousImprovement.id,
    createdById: users.admin.id,
    orgUnitId: units.production.id
  });
  const activityOne = await ensureKaizenActivity({
    projectId: project.id,
    number: 1,
    problem: "Ubicaciones sin identificacion.",
    action: "Definir y colocar identificacion visual.",
    ownerId: users.supervisor.id,
    startDate: qaDate(-10),
    dueDate: qaDate(5),
    status: WorkItemStatus.COMPLETADA,
    completionNote: `[${TAG}-06] Evidencia validada por el lider.`,
    closedAt: qaDate(4)
  });
  const activityTwo = await ensureKaizenActivity({
    projectId: project.id,
    number: 2,
    problem: "No existe minimo y maximo por material.",
    action: "Definir niveles y probar reposicion.",
    ownerId: users.shiftLead.id,
    startDate: qaDate(0),
    dueDate: qaDate(25),
    status: WorkItemStatus.EN_PROCESO
  });
  await ensureKaizenActivity({
    projectId: project.id,
    number: 3,
    problem: "La capacitacion duplicaba la actividad de estandarizacion.",
    action: "Integrar la capacitacion al nuevo estandar.",
    ownerId: users.shiftLead.id,
    startDate: qaDate(10),
    dueDate: qaDate(35),
    status: WorkItemStatus.COMBINADA,
    mergedIntoId: activityTwo.id,
    mergeReason: `[${TAG}-06] Mismo entregable y mismo responsable.`,
    closedAt: qaDate(12)
  });
  await ensureKaizenActivity({
    projectId: project.id,
    number: 4,
    problem: "Falta auditoria de sostenimiento.",
    action: "Auditar el uso del control durante cuatro semanas.",
    ownerId: users.manager.id,
    startDate: qaDate(30),
    dueDate: qaDate(70),
    status: WorkItemStatus.PENDIENTE
  });
  await ensureKaizenAttachment({
    projectId: project.id,
    type: KaizenAttachmentType.CHARTER,
    filename: "QA-E2E-06-project-charter.pdf",
    uploadedBy: users.continuousImprovement.email
  });
  await ensureKaizenAttachment({
    projectId: project.id,
    activityId: activityOne.id,
    type: KaizenAttachmentType.EVIDENCE,
    filename: "QA-E2E-06-evidencia-actividad-1.jpg",
    uploadedBy: users.supervisor.email
  });
  await ensureKaizenUpdate({
    projectId: project.id,
    activityId: activityOne.id,
    userId: users.continuousImprovement.id,
    marker: "06-AVANCE",
    comment: "Actividad completada con evidencia y avance recalculado."
  });

  const activities = await prisma.kaizenActivity.findMany({
    where: { projectId: project.id, number: { in: [1, 2, 3, 4] } },
    include: { attachments: true }
  });
  const completed = activities.find((item) => item.number === 1);
  const merged = activities.find((item) => item.number === 3);
  verify(activities.length === 4, "QA/E2E-06: faltan actividades base del Kaizen.");
  verify(completed?.attachments.length, "QA/E2E-06: la actividad completada no tiene evidencia.");
  verify(
    merged?.status === WorkItemStatus.COMBINADA && merged.mergedIntoId === activityTwo.id,
    "QA/E2E-06: la combinacion de actividades no quedo vinculada."
  );

  return {
    id: "QA/E2E-06",
    name: "Actividades Kaizen con evidencia y combinacion",
    evidence: `${project.folio} -> 4 actividades base`
  };
}

async function ensureScenarioSeven(foundation: Foundation): Promise<ScenarioResult> {
  const { users, units } = foundation;
  const walk = await ensureGenbaWalk({
    folio: "QA/E2E-GENBA-07",
    areaName: units.production.name,
    visitDate: qaDate(-7),
    coordinatorId: users.continuousImprovement.id,
    createdById: users.admin.id,
    orgUnitId: units.production.id
  });

  const definitions = [
    ["Material sin identificacion", "Identificar y delimitar", users.supervisor.id, WorkItemStatus.COMPLETADA],
    ["Flujo con espera", "Balancear el flujo", users.shiftLead.id, WorkItemStatus.EN_PROCESO],
    ["Resguardo pendiente", "Instalar control preventivo", users.safety.id, WorkItemStatus.BLOQUEADA],
    ["Limpieza fuera de estandar", "Ejecutar limpieza profunda", users.quality.id, WorkItemStatus.PENDIENTE],
    ["Ayuda visual duplicada", "Integrar ayuda al estandar", users.supervisor.id, WorkItemStatus.COMBINADA],
    ["Cambio de layout requerido", "Evaluar layout como proyecto Kaizen", users.continuousImprovement.id, WorkItemStatus.PENDIENTE]
  ] as const;
  const activities: Awaited<ReturnType<typeof ensureGenbaActivity>>[] = [];
  for (const [index, definition] of definitions.entries()) {
    activities.push(await ensureGenbaActivity({
      walkId: walk.id,
      number: index + 1,
      problem: definition[0],
      action: definition[1],
      ownerId: definition[2],
      dueDate: qaDate(10 + index * 7),
      status: definition[3],
      completionNote: index === 0 ? `[${TAG}-07] Condicion restablecida.` : null,
      mergedIntoId: index === 4 ? activities[1]?.id ?? null : null,
      mergeReason: index === 4 ? `[${TAG}-07] Comparte causa y entregable con actividad 2.` : null,
      closedAt: index === 0 || index === 4 ? qaDate(8 + index) : null
    }));
  }
  await ensureGenbaAttachment({
    walkId: walk.id,
    activityId: activities[0].id,
    filename: "QA-E2E-07-evidencia-genba-actividad-1.jpg",
    uploadedBy: users.supervisor.email
  });

  const targetProject = await prisma.kaizenProject.findUniqueOrThrow({ where: { folio: "QA/E2E-KZN-06" } });
  const sourceActivity = activities[5];
  let promoted = await prisma.kaizenActivity.findUnique({
    where: { sourceGenbaActivityId: sourceActivity.id }
  });
  if (!promoted) {
    const maximum = await prisma.kaizenActivity.aggregate({
      where: { projectId: targetProject.id },
      _max: { number: true }
    });
    promoted = await prisma.kaizenActivity.create({
      data: {
        projectId: targetProject.id,
        number: (maximum._max.number ?? 0) + 1,
        problem: sourceActivity.problem,
        action: sourceActivity.action ?? sourceActivity.problem,
        ownerId: sourceActivity.ownerId,
        startDate: qaDate(15),
        dueDate: sourceActivity.dueDate,
        status: WorkItemStatus.PENDIENTE,
        sourceGenbaActivityId: sourceActivity.id
      }
    });
  }
  await ensureGenbaUpdate({
    walkId: walk.id,
    activityId: sourceActivity.id,
    userId: users.continuousImprovement.id,
    marker: "07-PROMOCION",
    comment: `Actividad promovida una sola vez a ${targetProject.folio}.`
  });
  await ensureKaizenUpdate({
    projectId: targetProject.id,
    activityId: promoted.id,
    userId: users.continuousImprovement.id,
    marker: "07-ORIGEN-GENBA",
    comment: `Actividad importada desde ${walk.folio}.`
  });

  const [walkActivities, promotions] = await Promise.all([
    prisma.genbaActivity.findMany({ where: { walkId: walk.id } }),
    prisma.kaizenActivity.count({ where: { sourceGenbaActivityId: sourceActivity.id } })
  ]);
  verify(walkActivities.length > 5, "QA/E2E-07: el GENBA debe conservar mas de cinco actividades.");
  verify(promotions === 1, "QA/E2E-07: la promocion a Kaizen debe ser unica.");

  return {
    id: "QA/E2E-07",
    name: "GENBA con mas de cinco actividades y promocion",
    evidence: `${walk.folio} -> ${walkActivities.length} actividades, 1 promovida`
  };
}

async function ensureScenarioEight(foundation: Foundation): Promise<ScenarioResult> {
  const { users, plants, units, participant } = foundation;
  const whiteBelt = await prisma.trainingProgram.upsert({
    where: { name: `[${TAG}-08] White Belt` },
    create: {
      name: `[${TAG}-08] White Belt`,
      description: "Fundamentos de mejora continua.",
      coinValue: 100,
      active: true,
      createdById: users.admin.id
    },
    update: { description: "Fundamentos de mejora continua.", coinValue: 100, active: true }
  });
  const twi = await prisma.trainingProgram.upsert({
    where: { name: `[${TAG}-08] Training Within Industry (TWI)` },
    create: {
      name: `[${TAG}-08] Training Within Industry (TWI)`,
      description: "Estandarizacion y entrenamiento en el trabajo.",
      coinValue: 200,
      active: true,
      createdById: users.admin.id
    },
    update: { description: "Estandarizacion y entrenamiento en el trabajo.", coinValue: 200, active: true }
  });
  const whiteSession = await ensureTrainingSession({
    programId: whiteBelt.id,
    marker: "08-WHITE-BELT",
    sessionDate: qaDate(-30),
    trainerName: users.continuousImprovement.name,
    plantId: plants.apodaca.id,
    orgUnitId: units.production.id,
    createdById: users.admin.id
  });
  const twiSession = await ensureTrainingSession({
    programId: twi.id,
    marker: "08-TWI",
    sessionDate: qaDate(-20),
    trainerName: users.continuousImprovement.name,
    plantId: plants.apodaca.id,
    orgUnitId: units.production.id,
    createdById: users.admin.id
  });
  const enrollments = [];
  for (const [session, coins, day] of [[whiteSession, 100, -29], [twiSession, 200, -19]] as const) {
    const enrollment = await prisma.trainingEnrollment.upsert({
      where: { sessionId_participantId: { sessionId: session.id, participantId: participant.id } },
      create: {
        sessionId: session.id,
        participantId: participant.id,
        status: TrainingEnrollmentStatus.COMPLETED,
        coinsAwarded: coins,
        completedAt: qaDate(day)
      },
      update: {
        status: TrainingEnrollmentStatus.COMPLETED,
        coinsAwarded: coins,
        completedAt: qaDate(day)
      }
    });
    enrollments.push(enrollment);
    await ensureCoinTransaction({
      reference: `training:${enrollment.id}`,
      participantId: participant.id,
      type: CoinTransactionType.AWARD,
      sourceType: CoinSourceType.TRAINING,
      sourceId: session.id,
      amount: coins,
      description: `[${TAG}-08] Entrenamiento completado`,
      createdById: users.admin.id,
      occurredAt: qaDate(day)
    });
  }

  const completed = await prisma.trainingEnrollment.findMany({
    where: { id: { in: enrollments.map((item) => item.id) } }
  });
  const trainingLedger = await prisma.coinTransaction.findMany({
    where: { reference: { in: enrollments.map((item) => `training:${item.id}`) } }
  });
  verify(completed.length === 2 && completed.every((item) => item.status === TrainingEnrollmentStatus.COMPLETED), "QA/E2E-08: faltan entrenamientos completados.");
  verify(completed.reduce((sum, item) => sum + item.coinsAwarded, 0) === 300, "QA/E2E-08: los entrenamientos deben otorgar 300 ProbocaCoins.");
  verify(trainingLedger.reduce((sum, item) => sum + item.amount, 0) === 300, "QA/E2E-08: el libro mayor no coincide con entrenamientos.");

  return {
    id: "QA/E2E-08",
    name: "Entrenamientos e idempotencia de premios",
    evidence: `${participant.employeeNumber} -> 2 cursos, 300 ProbocaCoins`
  };
}

async function ensureScenarioNine(foundation: Foundation): Promise<ScenarioResult> {
  const { users, participant } = foundation;
  const idea = await prisma.idea.findUniqueOrThrow({ where: { folio: "QA/E2E-05-IDEA-KAIZEN" } });
  const project = await prisma.kaizenProject.findUniqueOrThrow({ where: { folio: "QA/E2E-KZN-05" } });
  const transactions = [
    await ensureCoinTransaction({
      reference: "QA/E2E-09-IDEA-80",
      participantId: participant.id,
      type: CoinTransactionType.AWARD,
      sourceType: CoinSourceType.IDEA,
      sourceId: idea.id,
      amount: 80,
      description: `[${TAG}-09] Premio por Idea de Mejora implementable`,
      createdById: users.continuousImprovement.id,
      occurredAt: qaDate(20)
    }),
    await ensureCoinTransaction({
      reference: "QA/E2E-09-KAIZEN-50",
      participantId: participant.id,
      type: CoinTransactionType.AWARD,
      sourceType: CoinSourceType.KAIZEN,
      sourceId: project.id,
      amount: 50,
      description: `[${TAG}-09] Premio complementario por participacion Kaizen`,
      createdById: users.continuousImprovement.id,
      occurredAt: qaDate(21)
    })
  ];
  verify(transactions.reduce((sum, item) => sum + item.amount, 0) === 130, "QA/E2E-09: los premios por Idea y Kaizen deben sumar 130.");
  verify(
    new Set(transactions.map((item) => item.sourceType)).size === 2,
    "QA/E2E-09: faltan origenes trazables de Idea y Kaizen."
  );

  return {
    id: "QA/E2E-09",
    name: "ProbocaCoins por Idea y Kaizen",
    evidence: `${participant.employeeNumber} -> Idea 80 + Kaizen 50`
  };
}

async function attemptOverdraft(input: {
  participantId: string;
  reference: string;
  amount: number;
  createdById: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const balance = await transaction.coinTransaction.aggregate({
      where: { participantId: input.participantId },
      _sum: { amount: true }
    });
    const signedAmount = -Math.abs(Math.trunc(input.amount));
    if ((balance._sum.amount ?? 0) + signedAmount < 0) throw new InsufficientBalanceError();
    return transaction.coinTransaction.create({
      data: {
        reference: input.reference,
        participantId: input.participantId,
        type: CoinTransactionType.REDEMPTION,
        sourceType: CoinSourceType.MANUAL,
        amount: signedAmount,
        description: `[${TAG}-10] Este movimiento no debe persistir`,
        createdById: input.createdById,
        occurredAt: qaDate(25)
      }
    });
  });
}

async function ensureScenarioTen(foundation: Foundation): Promise<ScenarioResult> {
  const { users, areas, routes, participant } = foundation;
  await ensureCoinTransaction({
    reference: "QA/E2E-10-CANJE-120",
    participantId: participant.id,
    type: CoinTransactionType.REDEMPTION,
    sourceType: CoinSourceType.MANUAL,
    amount: 120,
    description: `[${TAG}-10] Canje de recompensa`,
    createdById: users.admin.id,
    occurredAt: qaDate(23)
  });
  await ensureCoinTransaction({
    reference: "QA/E2E-10-AJUSTE-MENOS-10",
    participantId: participant.id,
    type: CoinTransactionType.ADJUSTMENT,
    sourceType: CoinSourceType.MANUAL,
    amount: -10,
    description: `[${TAG}-10] Ajuste administrativo conciliado`,
    createdById: users.admin.id,
    occurredAt: qaDate(24)
  });

  const rejectedReference = "QA/E2E-10-RECHAZO-SALDO-NEGATIVO";
  const unexpectedExisting = await prisma.coinTransaction.findUnique({ where: { reference: rejectedReference } });
  verify(!unexpectedExisting, "QA/E2E-10: existe un movimiento que debio ser rechazado.");

  const actualBalanceBeforeAttempt = await prisma.coinTransaction.aggregate({
    where: { participantId: participant.id },
    _sum: { amount: true }
  });
  const attemptedAmount = (actualBalanceBeforeAttempt._sum.amount ?? 0) + 1;
  let rejected = false;
  try {
    await attemptOverdraft({
      participantId: participant.id,
      reference: rejectedReference,
      amount: attemptedAmount,
      createdById: users.admin.id
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) rejected = true;
    else throw error;
  }
  verify(rejected, "QA/E2E-10: el intento de saldo negativo no fue rechazado.");

  const controlledReferences = [
    "QA/E2E-09-IDEA-80",
    "QA/E2E-09-KAIZEN-50",
    "QA/E2E-10-CANJE-120",
    "QA/E2E-10-AJUSTE-MENOS-10"
  ];
  const trainingEnrollments = await prisma.trainingEnrollment.findMany({
    where: {
      participantId: participant.id,
      session: { notes: { startsWith: `[${TAG}:08-` } }
    },
    select: { id: true }
  });
  const controlledLedger = await prisma.coinTransaction.findMany({
    where: {
      reference: {
        in: [
          ...controlledReferences,
          ...trainingEnrollments.map((enrollment) => `training:${enrollment.id}`)
        ]
      }
    }
  });
  const controlledBalance = controlledLedger.reduce((sum, transaction) => sum + transaction.amount, 0);
  const rejectedTransaction = await prisma.coinTransaction.findUnique({ where: { reference: rejectedReference } });
  verify(controlledBalance === 300, `QA/E2E-10: la conciliacion controlada debe cerrar en 300, obtuvo ${controlledBalance}.`);
  verify(!rejectedTransaction, "QA/E2E-10: el canje rechazado genero un movimiento.");
  await ensureAudit({
    entity: "Participant",
    entityId: participant.id,
    action: "QA_E2E_NEGATIVE_BALANCE_REJECTED",
    userId: users.admin.id,
    details: {
      scenario: 10,
      attemptedAmount,
      controlledBalance,
      actualBalance: actualBalanceBeforeAttempt._sum.amount ?? 0
    }
  });

  const cancelledFolio = "QA/E2E-10-CANCELADA-PARA-BORRAR";
  await ensureIdea({
    folio: cancelledFolio,
    areaId: areas.productionArea.id,
    collaboratorName: users.operator.name,
    collaboratorEmail: users.operator.email,
    problem: "Registro temporal cancelado para validar el borrado administrativo.",
    proposal: "Eliminar definitivamente el registro cancelado y sus dependencias.",
    expectedBenefit: "Mantener los concentrados libres de pruebas canceladas.",
    status: IdeaStatus.CANCELADA,
    supervisorId: users.supervisor.id,
    escalationRuleId: routes.operator.id,
    submitterPosition: "Operador"
  });
  await prisma.idea.delete({ where: { folio: cancelledFolio } });
  const deletedCancelledIdea = await prisma.idea.findUnique({ where: { folio: cancelledFolio } });
  verify(!deletedCancelledIdea, "QA/E2E-10: la idea cancelada debe desaparecer definitivamente.");

  return {
    id: "QA/E2E-10",
    name: "Finanzas seguras y borrado administrativo",
    evidence: `${participant.employeeNumber} -> saldo 300; canje ${attemptedAmount} rechazado; cancelada eliminada`
  };
}

const scenarioRunners = [
  ensureScenarioOne,
  ensureScenarioTwo,
  ensureScenarioThree,
  ensureScenarioFour,
  ensureScenarioFive,
  ensureScenarioSix,
  ensureScenarioSeven,
  ensureScenarioEight,
  ensureScenarioNine,
  ensureScenarioTen
] as const;

async function main() {
  verify(scenarioRunners.length === 10, "El arnes debe contener exactamente 10 escenarios.");
  console.log(
    productionOptIn && !databaseUrl.toLowerCase().startsWith("file:")
      ? `[${TAG}] ADVERTENCIA: carga en linea autorizada explicitamente.`
      : `[${TAG}] Base local confirmada.`
  );
  console.log(`[${TAG}] Los datos existentes se conservaran; no se ejecutan eliminaciones.`);

  const foundation = await ensureFoundation();
  const results: ScenarioResult[] = [];
  for (const runner of scenarioRunners) results.push(await runner(foundation));

  verify(results.length === 10, "La ejecucion no devolvio exactamente 10 resultados.");
  verify(new Set(results.map((result) => result.id)).size === 10, "Hay identificadores de escenario duplicados.");

  console.log(`\n[${TAG}] 10 de 10 escenarios cargados y verificados:`);
  console.table(results);
  console.log(`[${TAG}] Los registros quedan disponibles para inspeccion y futuras reejecuciones.`);
}

main()
  .catch((error) => {
    console.error(`[${TAG}] Fallo de carga o verificacion:`);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
