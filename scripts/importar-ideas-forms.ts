/**
 * Importa las ocho respuestas del Microsoft Forms entregado el 25-08-2026.
 *
 * El archivo original no tiene folio ni estado. Se asignan IM-000001..IM-000008 y
 * EN_REVISION_SUPERVISOR, exactamente como si hubieran entrado por un QR. El ID de Forms,
 * el area declarada, el proceso/equipo y el apoyo pedido se conservan en mcComments.
 *
 * Uso:
 *   pnpm exec tsx scripts/importar-ideas-forms.ts
 *   pnpm exec tsx scripts/importar-ideas-forms.ts --aplicar
 */
import { PrismaClient, type IdeaCategory, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const sourceName = "Registro general de Ideas de Mejora _ Proboca (1).xlsx";

type FormIdea = {
  sourceId: number;
  startedAt: string;
  finishedAt: string;
  areaCode: string;
  declaredArea: string;
  process: string;
  collaboratorName: string;
  employeeNumber: string;
  jobTitle?: string;
  routeLabel?: string;
  shift: string;
  problem: string;
  proposal: string;
  expectedBenefit: string;
  category: IdeaCategory;
  impacts: string[];
  requestedSupport: string;
  supportUnitCodes?: string[];
};

const rows: FormIdea[] = [
  {
    sourceId: 1,
    startedAt: "2026-07-27T06:44:20-06:00",
    finishedAt: "2026-07-27T09:38:41-06:00",
    areaCode: "APO-DNP",
    declaredArea: "DNPI",
    process: "Proceso 7818CK- 7820CK- 7821CK",
    collaboratorName: "Julio Cesar Olvera Espinoza",
    employeeNumber: "81150",
    jobTitle: "Coordinador DNP",
    routeLabel: "Coordinacion DNP",
    shift: "Matutino",
    problem: "reducci\u00f3n de costos en empaque",
    proposal: "Validar una alternativa de empaque de menor costo para\nprocesos de transferencia de MP formulada.",
    expectedBenefit: "un ahorro anual de $403,200",
    category: "A",
    impacts: ["Ahorro o costos", "Orden y limpieza"],
    requestedSupport: "Mejora Continua"
  },
  {
    sourceId: 2,
    startedAt: "2026-07-27T11:15:08-06:00",
    finishedAt: "2026-07-27T11:19:02-06:00",
    areaCode: "P6",
    declaredArea: "Descongelados",
    process: "Preparaci\u00f3n de salmuera o marinador",
    collaboratorName: "Alfredo Alvarado Lara",
    employeeNumber: "00302",
    jobTitle: "Supervisor P2 / P6",
    routeLabel: "Supervisor de area",
    shift: "Matutino",
    problem: "El tiempo de vaciado de salmuera o marinador es demasiado\nDesperdicio traslado",
    proposal: "Preparar la salmuera o marinador en mismo tumbler",
    expectedBenefit: "Un ahorro en tiempo de marinado de aproximadamente 60 minutos por tumbler de marinado",
    category: "A",
    impacts: ["Productividad", "Seguridad", "Ahorro o costos"],
    requestedSupport: "DNP"
  },
  {
    sourceId: 3,
    startedAt: "2026-07-27T13:30:18-06:00",
    finishedAt: "2026-07-27T13:39:21-06:00",
    areaCode: "APO-PROD",
    declaredArea: "Operaciones",
    process: "Todo el personal",
    collaboratorName: "Ernesto Ariel Gonz\u00e1lez Audiffred",
    employeeNumber: "46484",
    shift: "Matutino",
    problem: "La fatiga al estar de pie en largas jornadas",
    proposal: "Generar cambio en la postura y la reducci\u00f3n del cansancio con uso de plantillas para las botas",
    expectedBenefit: "Ahorro en contra de tapetes antifatiga y mayor eficiencia en lineas por alto rendimiento",
    category: "C",
    impacts: ["Productividad", "Ergonom\u00eda"],
    requestedSupport: "Compras o cotizaci\u00f3n"
  },
  {
    sourceId: 4,
    startedAt: "2026-07-28T15:31:21-06:00",
    finishedAt: "2026-07-28T15:35:19-06:00",
    areaCode: "P6",
    declaredArea: "P2 / P6 Canastillas",
    process: "Todas las \u00e1reas",
    collaboratorName: "Alfredo Alvarado Lara",
    employeeNumber: "00302",
    jobTitle: "Supervisor P2 / P6",
    routeLabel: "Supervisor de area",
    shift: "Matutino",
    problem: "Tiempo muerto por falta de canastillas en \u00e1reas",
    proposal: "Aprovechar turno noche y entregar la cantidad de canastillas limpias para el inicio de proceso de cada una de las \u00e1reas",
    expectedBenefit: "Eliminar tiempos muertos y aumentar la producci\u00f3n en cada una de las \u00e1reas",
    category: "A",
    impacts: ["Productividad", "Orden y limpieza"],
    requestedSupport: "Supervisores de cada \u00e1rea"
  },
  {
    sourceId: 5,
    startedAt: "2026-07-29T11:05:28-06:00",
    finishedAt: "2026-07-29T11:09:16-06:00",
    areaCode: "P6",
    declaredArea: "P6 P2 Canastillas",
    process: "P4 molidas",
    collaboratorName: "Alfredo Alvarado Lara",
    employeeNumber: "00302",
    jobTitle: "Supervisor P2 / P6",
    routeLabel: "Supervisor de area",
    shift: "Matutino",
    problem: "Tiempo muerto por falta de hielo al inicio de proceso 30 minutos",
    proposal: "Dejarle 2 a 3 combos con hielo en el inicio de turno para que inicien actividades en tiempo y forma y no parar 30 minutos",
    expectedBenefit: "Aumento de kilos de proceso",
    category: "A",
    impacts: ["Productividad"],
    requestedSupport: "No genera costo"
  },
  {
    sourceId: 6,
    startedAt: "2026-07-30T14:43:09-06:00",
    finishedAt: "2026-07-30T14:50:50-06:00",
    areaCode: "P6",
    declaredArea: "P6 Descongelados",
    process: "descongelado por inmersi\u00f3n en agua",
    collaboratorName: "Alfredo Alvarado Lara",
    employeeNumber: "00302",
    jobTitle: "Supervisor P2 / P6",
    routeLabel: "Supervisor de area",
    shift: "Matutino",
    problem: "exceso de gasto en agua",
    proposal: "descongelar en agua y con aire, para reducir el consumo de agua al 50%",
    expectedBenefit: "reducir gasto de agua, eliminar gasto econ\u00f3mico de compra de pipas y no afectar el lavado de \u00e1reas por sanidad por falta de agua.",
    category: "C",
    impacts: ["Productividad", "Calidad e Inocuidad", "Medio ambiente", "Ahorro o costos", "Orden y limpieza"],
    requestedSupport: "Mejora Continua",
    supportUnitCodes: ["APO-MC"]
  },
  {
    sourceId: 7,
    startedAt: "2026-08-18T11:07:13-06:00",
    finishedAt: "2026-08-18T11:13:11-06:00",
    areaCode: "P2",
    declaredArea: "P2 Multiprocesos",
    process: "Planta general - Lavados Operativos y Pre-operativos",
    collaboratorName: "Joselyn Cristal Isabel Ipi\u00f1a Garcia",
    employeeNumber: "43610",
    shift: "Matutino",
    problem: "Perdida de pistolas de agua y ahorro en gastos de consumos/compras",
    proposal: "Implementar pistolas de la marca Truper Jardineras con regulador y fijas. Para ahorro de agua y de compra de pistolas. Eficiencia en lavados pre-operativos.\n\nFuncionales actual en proceso de uso prueba para P1 Pym Linea 1- Canastillas y P8\n\nAhorro en la compra de pistolas de agua actuales con costo elevada a unas de menor precio con la misma funcionalidad.\n\nEsto para optimizar los lavados.",
    expectedBenefit: "Uso de todas las \u00e1reas para ahorro de agua y correcto uso de la misma.",
    category: "C",
    impacts: ["Ahorro o costos"],
    requestedSupport: "Supervisores de producci\u00f3n a las cuales se les asigno"
  },
  {
    sourceId: 8,
    startedAt: "2026-08-25T08:10:08-06:00",
    finishedAt: "2026-08-25T08:21:11-06:00",
    areaCode: "APO-DNP",
    declaredArea: "DNP",
    process: "4285G PASTA FRESCA DE POLLO",
    collaboratorName: "Julio Cesar Olvera Espinoza",
    employeeNumber: "81150",
    jobTitle: "Coordinador DNP",
    routeLabel: "Coordinacion DNP",
    shift: "Administrativo",
    problem: "El principal cambio se encuentra en la Tarima actual\nIN10989 \u2013 Tarima h\u00edbrida 40\" \u00d7 48\"\nCosto: $208.88 MXN/unidad",
    proposal: "Reducir el costo por kilogramo mediante la\noptimizaci\u00f3n de materiales, manteniendo la funcionalidad y\ndesempe\u00f1o del empaque",
    expectedBenefit: "Cambio de material\nMenor costo unitario\nReducci\u00f3n de $0.06/kg\nAplicaci\u00f3n a 34.1 millones de kg/a\u00f1o\n$2.16 millones MXN de ahorro anual\nUna peque\u00f1a modificaci\u00f3n genera un beneficio\nacumulativo y sostenible",
    category: "B",
    impacts: ["Ahorro o costos"],
    requestedSupport: "Compras y empaque"
  }
];

type Database = Prisma.TransactionClient;

function folioFor(sourceId: number) {
  return `IM-${String(sourceId).padStart(6, "0")}`;
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function resolveParticipant(database: Database, row: FormIdea, orgUnitId: string) {
  const byEmployeeNumber = await database.participant.findUnique({ where: { employeeNumber: row.employeeNumber } });
  const allParticipants = byEmployeeNumber ? [] : await database.participant.findMany({ select: { id: true, name: true, employeeNumber: true } });
  const byName = allParticipants.find((participant) => normalizeName(participant.name) === normalizeName(row.collaboratorName));
  if (byName?.employeeNumber && byName.employeeNumber !== row.employeeNumber) {
    throw new Error(`${row.collaboratorName} ya tiene el numero ${byName.employeeNumber}; no se reemplaza por ${row.employeeNumber}.`);
  }
  const existing = byEmployeeNumber ?? (byName ? await database.participant.findUnique({ where: { id: byName.id } }) : null);
  if (existing) {
    return database.participant.update({
      where: { id: existing.id },
      data: {
        name: row.collaboratorName,
        employeeNumber: row.employeeNumber,
        jobTitle: row.jobTitle ?? existing.jobTitle,
        orgUnitId,
        active: true
      }
    });
  }
  return database.participant.create({
    data: {
      name: row.collaboratorName,
      employeeNumber: row.employeeNumber,
      jobTitle: row.jobTitle ?? null,
      orgUnitId,
      active: true
    }
  });
}

async function resolveRoute(database: Database, row: FormIdea, orgUnitId: string) {
  const requested = row.routeLabel
    ? await database.orgEscalationRule.findFirst({
      where: { orgUnitId, submitterLabel: row.routeLabel, active: true },
      include: { reviewerMembership: { include: { user: true } } }
    })
    : null;
  return requested ?? database.orgEscalationRule.findFirst({
    where: { orgUnitId, active: true },
    include: { reviewerMembership: { include: { user: true } } },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { submitterLevel: "asc" }]
  });
}

async function addManagerFollowers(database: Database, ideaId: string, reviewerMembershipId: string, reviewerUserId: string) {
  const visited = new Set<string>();
  let currentId: string | null = reviewerMembershipId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const membership: {
      managerMembershipId: string | null;
      managerMembership: { userId: string; active: boolean; user: { active: boolean } } | null;
    } | null = await database.orgMembership.findUnique({
      where: { id: currentId },
      select: {
        managerMembershipId: true,
        managerMembership: { select: { userId: true, active: true, user: { select: { active: true } } } }
      }
    });
    const manager = membership?.managerMembership;
    if (!manager) break;
    if (manager.userId !== reviewerUserId && manager.active && manager.user.active) {
      await database.ideaFollower.upsert({
        where: { ideaId_userId: { ideaId, userId: manager.userId } },
        update: { label: "Jefatura de la ruta" },
        create: { ideaId, userId: manager.userId, label: "Jefatura de la ruta" }
      });
    }
    currentId = membership?.managerMembershipId ?? null;
  }
}

function metadata(row: FormIdea) {
  return [
    `Origen: Microsoft Forms | respuesta ${row.sourceId}`,
    `Area declarada: ${row.declaredArea}`,
    `Proceso, linea o equipo: ${row.process}`,
    `Apoyo indicado: ${row.requestedSupport}`
  ].join("\n");
}

function sourceData(row: FormIdea) {
  const supportEnabled = row.category !== "A";
  const impactsText = row.impacts.join(" ").toLowerCase();
  return {
    collaboratorName: row.collaboratorName,
    collaboratorEmail: null,
    employeeNumber: row.employeeNumber,
    shift: row.shift,
    problem: row.problem,
    proposal: row.proposal,
    expectedBenefit: row.expectedBenefit,
    impactTypes: JSON.stringify(row.impacts),
    category: row.category,
    impactsQuality: supportEnabled && (impactsText.includes("calidad") || impactsText.includes("inocuidad")),
    impactsSafety: supportEnabled && (impactsText.includes("seguridad") || impactsText.includes("ergonomia") || impactsText.includes("ergonom\u00eda")),
    requiresMaintenance: supportEnabled && row.requestedSupport.toLowerCase().includes("mantenimiento"),
    requiresExternalSupport: row.category === "C",
    externalSupportDetails: row.requestedSupport,
    mcComments: metadata(row),
    createdAt: new Date(row.startedAt)
  };
}

async function importRow(row: FormIdea) {
  const folio = folioFor(row.sourceId);
  const existing = await prisma.idea.findUnique({
    where: { folio },
    select: {
      id: true,
      collaboratorName: true,
      employeeNumber: true,
      shift: true,
      problem: true,
      proposal: true,
      expectedBenefit: true,
      impactTypes: true,
      category: true,
      impactsQuality: true,
      impactsSafety: true,
      requiresMaintenance: true,
      requiresExternalSupport: true,
      externalSupportDetails: true,
      mcComments: true,
      createdAt: true
    }
  });
  if (existing) {
    if (!existing.mcComments?.includes(`respuesta ${row.sourceId}`)) {
      throw new Error(`${folio} ya existe y no pertenece a la respuesta ${row.sourceId} del Forms.`);
    }
    const target = sourceData(row);
    const changed = existing.collaboratorName !== target.collaboratorName
      || existing.employeeNumber !== target.employeeNumber
      || existing.shift !== target.shift
      || existing.problem !== target.problem
      || existing.proposal !== target.proposal
      || existing.expectedBenefit !== target.expectedBenefit
      || existing.impactTypes !== target.impactTypes
      || existing.category !== target.category
      || existing.impactsQuality !== target.impactsQuality
      || existing.impactsSafety !== target.impactsSafety
      || existing.requiresMaintenance !== target.requiresMaintenance
      || existing.requiresExternalSupport !== target.requiresExternalSupport
      || existing.externalSupportDetails !== target.externalSupportDetails
      || existing.mcComments !== target.mcComments
      || existing.createdAt.getTime() !== target.createdAt.getTime();
    if (!changed) return { folio, action: "sin cambio" as const };
    if (aplicar) {
      await prisma.$transaction([
        prisma.participant.updateMany({
          where: { employeeNumber: row.employeeNumber },
          data: { name: row.collaboratorName, jobTitle: row.jobTitle ?? undefined, active: true }
        }),
        prisma.idea.update({ where: { id: existing.id }, data: target })
      ]);
    }
    return { folio, action: "actualiza" as const };
  }

  if (!aplicar) {
    const area = await prisma.area.findUnique({
      where: { code: row.areaCode },
      include: { organizationUnit: true }
    });
    if (!area?.organizationUnit) throw new Error(`No existe el area capturable ${row.areaCode}.`);
    const route = await resolveRoute(prisma as unknown as Database, row, area.organizationUnit.id);
    if (!route?.reviewerMembership.user.active) throw new Error(`${row.areaCode} no tiene una ruta activa para ${row.routeLabel ?? "ruta principal"}.`);
    return { folio, action: "crea" as const, reviewer: route.reviewerMembership.user.name };
  }

  return prisma.$transaction(async (database) => {
    const area = await database.area.findUnique({
      where: { code: row.areaCode },
      include: { organizationUnit: true }
    });
    if (!area?.organizationUnit) throw new Error(`No existe el area capturable ${row.areaCode}.`);
    const route = await resolveRoute(database, row, area.organizationUnit.id);
    if (!route?.reviewerMembership.user.active) throw new Error(`${row.areaCode} no tiene una ruta activa para ${row.routeLabel ?? "ruta principal"}.`);

    const participant = await resolveParticipant(database, row, area.organizationUnit.id);
    const finishedAt = new Date(row.finishedAt);
    const idea = await database.idea.create({
      data: {
        folio,
        ...sourceData(row),
        areaId: area.id,
        status: "EN_REVISION_SUPERVISOR",
        supervisorId: route.reviewerMembership.userId,
        escalationRuleId: route.id,
        submitterPosition: route.submitterLabel,
        participantId: participant.id,
        updatedAt: finishedAt
      }
    });

    await database.approval.create({
      data: {
        ideaId: idea.id,
        type: "SUPERVISOR",
        assignedToId: route.reviewerMembership.userId,
        status: "PENDING",
        createdAt: finishedAt,
        updatedAt: finishedAt
      }
    });
    await addManagerFollowers(database, idea.id, route.reviewerMembership.id, route.reviewerMembership.userId);

    for (const unitCode of row.category === "A" ? [] : row.supportUnitCodes ?? []) {
      const unit = await database.orgUnit.findUniqueOrThrow({ where: { code: unitCode } });
      const supportMembership = await database.orgMembership.findFirst({
        where: { orgUnitId: unit.id, active: true, canReceiveIdeas: true },
        orderBy: [{ level: "asc" }, { sortOrder: "asc" }]
      });
      await database.ideaSupportRequest.upsert({
        where: { ideaId_orgUnitId: { ideaId: idea.id, orgUnitId: unit.id } },
        update: { assignedToId: unit.routingUserId ?? supportMembership?.userId ?? null, activatedAt: null },
        create: {
          ideaId: idea.id,
          orgUnitId: unit.id,
          assignedToId: unit.routingUserId ?? supportMembership?.userId ?? null,
          activatedAt: null
        }
      });
    }

    const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "https://sistema-ideas-propex.vercel.app";
    await database.notificationOutbox.createMany({
      data: ["EMAIL", "TEAMS"].map((channel) => ({
        ideaId: idea.id,
        channel: channel as "EMAIL" | "TEAMS",
        to: route.reviewerMembership.user.email,
        subject: `Nueva idea de mejora pendiente de revision - Folio ${folio} - Area ${area.code}`,
        body: `Se importo una idea de ${row.collaboratorName}.\n\nProblema: ${row.problem}\n\nPropuesta: ${row.proposal}\n\nLiga directa: ${baseUrl}/ideas/${idea.id}`,
        status: "PENDING" as const,
        createdAt: finishedAt
      }))
    });
    const admin = await database.user.findFirst({ where: { role: "ADMIN", active: true }, select: { id: true } });
    await database.auditLog.create({
      data: {
        entity: "Idea",
        entityId: idea.id,
        action: "IDEA_IMPORTED_FORMS",
        userId: admin?.id ?? null,
        details: JSON.stringify({ source: sourceName, responseId: row.sourceId, originalArea: row.declaredArea }),
        createdAt: finishedAt
      }
    });
    return { folio, action: "crea" as const, reviewer: route.reviewerMembership.user.name };
  }, { maxWait: 15_000, timeout: 30_000 });
}

async function main() {
  const results = [];
  for (const row of rows) results.push(await importRow(row));
  for (const result of results) {
    console.log(`${result.action.padEnd(10)} ${result.folio}${"reviewer" in result ? ` -> ${result.reviewer}` : ""}`);
  }
  if (!aplicar) {
    console.log("\nSimulacion correcta. Ejecuta con --aplicar para importar.");
    return;
  }

  const folios = rows.map((row) => folioFor(row.sourceId));
  const imported = await prisma.idea.findMany({
    where: { folio: { in: folios } },
    select: {
      folio: true,
      employeeNumber: true,
      status: true,
      supervisor: { select: { name: true, email: true } },
      participantId: true,
      approvals: { select: { type: true, status: true, assignedToId: true } }
    },
    orderBy: { folio: "asc" }
  });
  if (imported.length !== rows.length) throw new Error(`Se esperaban ${rows.length} ideas y se verificaron ${imported.length}.`);
  if (imported.some((idea) => idea.status !== "EN_REVISION_SUPERVISOR" || !idea.participantId || !idea.supervisor)) {
    throw new Error("Una idea importada quedo sin participante, responsable o estado inicial.");
  }
  if (imported.some((idea) => idea.approvals.length !== 1 || idea.approvals[0].type !== "SUPERVISOR" || idea.approvals[0].status !== "PENDING")) {
    throw new Error("Una idea importada no tiene exactamente una aprobacion inicial pendiente.");
  }
  console.log(`\nVerificacion final: ${imported.length} ideas, ${imported.length} participantes enlazados y ${imported.length} aprobaciones iniciales pendientes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
