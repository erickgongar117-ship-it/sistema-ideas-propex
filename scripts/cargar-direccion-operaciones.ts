/**
 * Carga la Direccion de Operaciones y sus gerencias con acceso global operativo.
 *
 * Direccion y Gerencia tienen perfiles ejecutivos propios con lectura integral, mientras
 * el cargo real, sus areas y la cadena de reporte viven en OrgMembership. Ninguna cuenta
 * recibe ADMIN ni permisos para configurar el sistema.
 *
 * Uso:
 *   pnpm exec tsx scripts/cargar-direccion-operaciones.ts
 *   pnpm exec tsx scripts/cargar-direccion-operaciones.ts --aplicar
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma, type Role } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const requestedInitialPassword = process.env.PROPEX_INITIAL_PASSWORD?.trim();
if (requestedInitialPassword && requestedInitialPassword.length < 8) {
  throw new Error("PROPEX_INITIAL_PASSWORD debe tener al menos 8 caracteres.");
}

type LeaderKey = "myriam" | "violeta" | "erick" | "adriana" | "paul" | "adrian" | "javier" | "edgar";
type LeaderDefinition = {
  key: LeaderKey;
  name: string;
  email: string;
  role: Extract<Role, "DIRECCION" | "GERENTE">;
  title: string;
  unitCodes: string[];
  legacyEmail?: string;
};

const leaders: LeaderDefinition[] = [
  {
    key: "myriam",
    name: "Myriam Esparza Solis",
    email: "myriam.esparza@proboca.net",
    role: "DIRECCION",
    title: "Directora de Operaciones",
    unitCodes: ["TSJ-DIR-OPS"]
  },
  {
    key: "violeta",
    name: "Lucero Violeta Villanueva Mart\u00ednez",
    email: "lucero.villanueva@proboca.net",
    role: "GERENTE",
    title: "Gerente de Calidad",
    unitCodes: ["APO-CAL", "CAR-CAL"]
  },
  {
    key: "erick",
    name: "Erick Hafid Padilla Escarcega",
    email: "epadilla@proboca.net",
    role: "GERENTE",
    title: "Gerente de Operaciones Planta Apodaca",
    unitCodes: ["APO-PROD"],
    legacyEmail: "padilla@propex.local"
  },
  {
    key: "adriana",
    name: "Adriana Josefina Elizondo Sep\u00falveda",
    email: "adriana.elizondo@proboca.net",
    role: "GERENTE",
    title: "Gerente de Log\u00edstica Apodaca",
    unitCodes: ["APO-LOG"]
  },
  {
    key: "paul",
    name: "Paul Christian de la Cerda Suarez",
    email: "paul.delacerda@proboca.net",
    role: "GERENTE",
    title: "Gerente de Planeaci\u00f3n de la Demanda y Almac\u00e9n General",
    unitCodes: ["APO-PLAN-ALM"]
  },
  {
    key: "adrian",
    name: "Adri\u00e1n Montalvo Gil",
    email: "adrian.montalvo@proboca.net",
    role: "GERENTE",
    title: "Gerente de Operaciones Planta El Carmen",
    unitCodes: ["CAR-PROD"]
  },
  {
    key: "javier",
    name: "Javier S\u00e1nchez L\u00f3pez",
    email: "javier.sanchez@proboca.net",
    role: "GERENTE",
    title: "Gerente de Mantenimiento y Proyectos",
    unitCodes: ["APO-MAN", "APO-PROY", "CAR-MAN", "CAR-PROY"]
  },
  {
    key: "edgar",
    name: "Edgar Allan Santos Tamez",
    email: "edgar.santos@proboca.net",
    role: "GERENTE",
    title: "Gerente de Mejora Continua",
    unitCodes: ["APO-MC", "CAR-MC"]
  }
];

const plannedUnits = [
  {
    code: "TSJ-DIR-OPS",
    plantCode: "TSJ",
    parentCode: null,
    type: "MACROPROCESO" as const,
    name: "Direcci\u00f3n de Operaciones",
    responsible: "Myriam Esparza Solis",
    manager: "Direcci\u00f3n General",
    qrEnabled: false,
    isSupportArea: false,
    sortOrder: 0
  },
  {
    code: "APO-PLAN-ALM",
    plantCode: "APO",
    parentCode: "APO-SOP",
    type: "DEPARTAMENTO" as const,
    name: "Planeaci\u00f3n de la Demanda y Almac\u00e9n General",
    responsible: "Paul Christian de la Cerda Suarez",
    manager: "Myriam Esparza Solis",
    qrEnabled: true,
    isSupportArea: true,
    sortOrder: 6
  },
];

type Database = Prisma.TransactionClient;
type AccountResult = { id: string; name: string; email: string; password?: string };

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function temporaryPassword() {
  return `PBc!${randomBytes(12).toString("base64url")}`;
}

async function findUserByEmail(database: Database | PrismaClient, email: string) {
  const normalized = normalizeEmail(email);
  const users = await database.user.findMany({ select: { id: true, email: true } });
  const match = users.find((user) => normalizeEmail(user.email) === normalized);
  return match ? database.user.findUnique({ where: { id: match.id } }) : null;
}

async function ensureUser(database: Database, definition: LeaderDefinition): Promise<AccountResult> {
  const corporate = await findUserByEmail(database, definition.email);
  const legacy = definition.legacyEmail ? await findUserByEmail(database, definition.legacyEmail) : null;
  if (corporate && legacy && corporate.id !== legacy.id) {
    throw new Error(`Existen dos cuentas para ${definition.name}; se requiere conciliacion manual.`);
  }

  const existing = corporate ?? legacy;
  const needsTemporaryPassword = Boolean(requestedInitialPassword) || !existing || Boolean(legacy && !corporate);
  const password = needsTemporaryPassword ? requestedInitialPassword ?? temporaryPassword() : undefined;
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  const data = {
    name: definition.name,
    email: normalizeEmail(definition.email),
    role: definition.role,
    jobTitle: definition.title,
    active: true,
    kaizenAccess: true,
    genbaAccess: true,
    ...(passwordHash ? { passwordHash } : {})
  };

  const user = existing
    ? await database.user.update({ where: { id: existing.id }, data })
    : await database.user.create({ data: { ...data, passwordHash: passwordHash! } });

  const linkedParticipant = await database.participant.findUnique({ where: { userId: user.id } });
  const reusableParticipant = linkedParticipant
    ?? await database.participant.findFirst({
      where: { userId: null, email: normalizeEmail(definition.email) },
      orderBy: { createdAt: "asc" }
    });
  if (reusableParticipant) {
    await database.participant.update({
      where: { id: reusableParticipant.id },
      data: {
        userId: user.id,
        name: definition.name,
        email: normalizeEmail(definition.email),
        jobTitle: definition.title,
        active: true
      }
    });
  } else {
    await database.participant.create({
      data: {
        userId: user.id,
        name: definition.name,
        email: normalizeEmail(definition.email),
        jobTitle: definition.title,
        active: true
      }
    });
  }

  return { id: user.id, name: user.name, email: user.email, password };
}

async function ensurePlant(database: Database, code: string, name: string) {
  return database.plant.upsert({
    where: { code },
    update: { name, active: true },
    create: { code, name, active: true }
  });
}

async function ensurePlannedUnits(database: Database) {
  const plants = new Map<string, { id: string }>();
  plants.set("APO", await ensurePlant(database, "APO", "Planta Apodaca"));
  plants.set("CAR", await ensurePlant(database, "CAR", "Planta El Carmen"));
  plants.set("TSJ", await ensurePlant(database, "TSJ", "Torre San Jeronimo"));

  for (const definition of plannedUnits) {
    const plant = plants.get(definition.plantCode);
    if (!plant) throw new Error(`No se encontro la planta ${definition.plantCode}.`);
    const parent = definition.parentCode
      ? await database.orgUnit.findUnique({ where: { code: definition.parentCode }, select: { id: true } })
      : null;
    if (definition.parentCode && !parent) throw new Error(`No existe la unidad padre ${definition.parentCode}.`);
    await database.orgUnit.upsert({
      where: { code: definition.code },
      update: {
        plantId: plant.id,
        parentId: parent?.id ?? null,
        type: definition.type,
        name: definition.name,
        responsible: definition.responsible,
        manager: definition.manager,
        qrEnabled: definition.qrEnabled,
        isSupportArea: definition.isSupportArea,
        active: true,
        sortOrder: definition.sortOrder
      },
      create: {
        plantId: plant.id,
        parentId: parent?.id ?? null,
        type: definition.type,
        code: definition.code,
        name: definition.name,
        responsible: definition.responsible,
        manager: definition.manager,
        qrEnabled: definition.qrEnabled,
        isSupportArea: definition.isSupportArea,
        active: true,
        sortOrder: definition.sortOrder
      }
    });
  }
}

async function ensureMembership(
  database: Database,
  userId: string,
  unitCode: string,
  title: string,
  level: number,
  managerMembershipId: string | null
) {
  const unit = await database.orgUnit.findUniqueOrThrow({ where: { code: unitCode } });
  return database.orgMembership.upsert({
    where: { userId_orgUnitId: { userId, orgUnitId: unit.id } },
    update: {
      title,
      level,
      managerMembershipId,
      canReviewTeam: true,
      canReceiveIdeas: true,
      canManageActivities: true,
      active: true
    },
    create: {
      userId,
      orgUnitId: unit.id,
      title,
      level,
      managerMembershipId,
      canReviewTeam: true,
      canReceiveIdeas: true,
      canManageActivities: true,
      active: true,
      sortOrder: 0
    }
  });
}

async function attachUnassignedReports(database: Database, unitCode: string, managerMembershipId: string, managerUserId: string, managerLevel: number) {
  const unit = await database.orgUnit.findUniqueOrThrow({ where: { code: unitCode } });
  await database.orgMembership.updateMany({
    where: {
      orgUnitId: unit.id,
      active: true,
      userId: { not: managerUserId },
      managerMembershipId: null,
      level: { lt: managerLevel }
    },
    data: { managerMembershipId }
  });
}

async function updateManagedUnit(database: Database, unitCode: string, managerName: string, routingUserId: string, overwriteRouting = false) {
  const unit = await database.orgUnit.findUniqueOrThrow({ where: { code: unitCode } });
  await database.orgUnit.update({
    where: { id: unit.id },
    data: {
      manager: managerName,
      responsible: managerName,
      ...(overwriteRouting || !unit.routingUserId ? { routingUserId } : {})
    }
  });
}

async function ensureCaptureArea(database: Database, unitCode: string, areaName: string, supervisorId: string) {
  const unit = await database.orgUnit.findUniqueOrThrow({ where: { code: unitCode } });
  const area = await database.area.upsert({
    where: { code: unitCode },
    update: { name: areaName, supervisorId, active: true },
    create: { code: unitCode, name: areaName, supervisorId, active: true }
  });
  await database.orgUnit.update({
    where: { id: unit.id },
    data: { captureAreaId: area.id, routingUserId: supervisorId, qrEnabled: true }
  });
  return { unit, area };
}

async function ensureEscalationRule(
  database: Database,
  unitCode: string,
  reviewerMembershipId: string,
  submitterLabel: string,
  submitterLevel: number,
  isDefault: boolean
) {
  const unit = await database.orgUnit.findUniqueOrThrow({ where: { code: unitCode } });
  const existing = await database.orgEscalationRule.findFirst({
    where: { orgUnitId: unit.id, submitterLabel }
  });
  const data = {
    name: isDefault ? "Ruta principal" : submitterLabel,
    submitterLabel,
    submitterLevel,
    reviewerMembershipId,
    isDefault,
    active: true
  };
  if (existing) return database.orgEscalationRule.update({ where: { id: existing.id }, data });
  const sortOrder = await database.orgEscalationRule.count({ where: { orgUnitId: unit.id } });
  return database.orgEscalationRule.create({ data: { ...data, orgUnitId: unit.id, sortOrder } });
}

async function preview() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true } });
  const units = await prisma.orgUnit.findMany({ select: { code: true } });
  const unitCodes = new Set(units.map((unit) => unit.code));
  console.log("Simulacion de Direccion de Operaciones\n");
  for (const definition of leaders) {
    const corporate = users.find((user) => normalizeEmail(user.email) === definition.email);
    const legacy = definition.legacyEmail
      ? users.find((user) => normalizeEmail(user.email) === definition.legacyEmail)
      : null;
    const existing = corporate ?? legacy;
    console.log(`${existing ? "actualiza" : "crea"}  ${definition.name} <${definition.email}> - ${definition.role} - ${definition.title}`);
  }
  for (const unit of plannedUnits) {
    console.log(`${unitCodes.has(unit.code) ? "actualiza" : "crea"}  unidad ${unit.code} - ${unit.name}`);
  }
  console.log("\nLas ocho cuentas quedaran con visualizacion integral y rol no administrativo.");
  console.log("Vuelve a ejecutar con --aplicar para escribir los cambios.");
}

async function apply() {
  const credentials: AccountResult[] = [];
  await prisma.$transaction(async (database) => {
    await ensurePlannedUnits(database);

    const accounts = new Map<LeaderKey, AccountResult>();
    for (const definition of leaders) {
      const account = await ensureUser(database, definition);
      accounts.set(definition.key, account);
      if (account.password) credentials.push(account);
    }

    const director = accounts.get("myriam")!;
    const directorMembership = await ensureMembership(database, director.id, "TSJ-DIR-OPS", leaders[0].title, 5, null);

    const primaryMemberships = new Map<LeaderKey, string>();
    for (const definition of leaders.filter((leader) => leader.key !== "myriam")) {
      const account = accounts.get(definition.key)!;
      for (const [index, unitCode] of definition.unitCodes.entries()) {
        const membership = await ensureMembership(database, account.id, unitCode, definition.title, 4, directorMembership.id);
        if (index === 0) primaryMemberships.set(definition.key, membership.id);
        await attachUnassignedReports(database, unitCode, membership.id, account.id, 4);
        await updateManagedUnit(database, unitCode, account.name, account.id);
      }
    }

    const erick = accounts.get("erick")!;
    const adrian = accounts.get("adrian")!;
    const paul = accounts.get("paul")!;
    await ensureCaptureArea(database, "APO-PROD", "Producci\u00f3n y Operaciones Apodaca", erick.id);
    await ensureCaptureArea(database, "CAR-PROD", "Producci\u00f3n y Operaciones El Carmen", adrian.id);
    await ensureCaptureArea(database, "APO-PLAN-ALM", "Planeaci\u00f3n de la Demanda y Almac\u00e9n General", paul.id);

    await ensureEscalationRule(database, "APO-PROD", primaryMemberships.get("erick")!, "Personal operativo o colaborador", 0, true);
    await ensureEscalationRule(database, "CAR-PROD", primaryMemberships.get("adrian")!, "Personal operativo o colaborador", 0, true);
    await ensureEscalationRule(database, "APO-PLAN-ALM", primaryMemberships.get("paul")!, "Personal operativo o colaborador", 0, true);

    const adriana = accounts.get("adriana")!;
    const logisticsChildren = await database.orgUnit.findMany({
      where: { parent: { is: { code: "APO-LOG" } } },
      select: { id: true, code: true, captureAreaId: true }
    });
    for (const child of logisticsChildren) {
      await database.orgUnit.update({
        where: { id: child.id },
        data: { routingUserId: adriana.id, manager: adriana.name, responsible: adriana.name }
      });
      if (child.captureAreaId) {
        await database.area.update({ where: { id: child.captureAreaId }, data: { supervisorId: adriana.id } });
      }
    }

    const admin = await database.user.findFirst({ where: { role: "ADMIN", active: true }, select: { id: true } });
    await database.auditLog.create({
      data: {
        entity: "Organization",
        entityId: "DIRECCION-OPERACIONES-2026",
        action: "OPERATIONS_LEADERSHIP_IMPORTED",
        userId: admin?.id ?? null,
        details: JSON.stringify({
          source: "Organigrama_Apodaca_250326",
          director: director.email,
          managers: leaders.filter((leader) => leader.key !== "myriam").map((leader) => leader.email),
          administrativeRoleGranted: false
        })
      }
    });
  }, { maxWait: 15_000, timeout: 90_000 });

  const allUsers = await prisma.user.findMany({
    where: { email: { in: leaders.map((leader) => leader.email) } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      kaizenAccess: true,
      genbaAccess: true,
      orgMemberships: { where: { active: true }, select: { id: true, managerMembershipId: true, orgUnit: { select: { code: true } } } }
    }
  });
  if (allUsers.length !== leaders.length) throw new Error(`Se esperaban ${leaders.length} cuentas y se verificaron ${allUsers.length}.`);
  if (allUsers.some((user) => user.role === "ADMIN")) throw new Error("Una cuenta de direccion recibio ADMIN por error.");
  if (allUsers.some((user) => user.role !== leaders.find((leader) => leader.email === user.email)?.role)) {
    throw new Error("Una cuenta no conserva su perfil ejecutivo de Direccion o Gerencia.");
  }
  if (allUsers.some((user) => !user.active || !user.kaizenAccess || !user.genbaAccess)) {
    throw new Error("Una cuenta no quedo activa o sin acceso a Kaizen/GENBA.");
  }

  const erick = allUsers.find((user) => user.email === "epadilla@proboca.net")!;
  const erickMembership = erick.orgMemberships.find((membership) => membership.orgUnit.code === "APO-PROD");
  const preservedReports = erickMembership
    ? await prisma.orgMembership.count({ where: { managerMembershipId: erickMembership.id, active: true } })
    : 0;
  if (preservedReports < 3) throw new Error("No se conservaron los tres jefes de turno bajo Erick Padilla.");

  console.log(`Cuentas verificadas: ${allUsers.length}; ADMIN asignados: 0; reportes preservados de Erick: ${preservedReports}.`);
  if (credentials.length) {
    console.log("\nCredenciales temporales creadas en esta ejecucion (cambiar al primer acceso):");
    for (const account of credentials) console.log(`${account.email}\t${account.password}`);
  } else {
    console.log("No se cambiaron contrasenas existentes.");
  }
}

(aplicar ? apply() : preview())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
