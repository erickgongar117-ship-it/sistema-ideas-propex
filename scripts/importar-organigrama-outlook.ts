/**
 * Importa el organigrama corporativo desde una exportacion JSON del directorio global
 * de Outlook. El archivo fuente permanece fuera del repositorio para no publicar datos
 * personales; el resultado queda editable desde Configuracion > Estructura.
 *
 * Uso:
 *   pnpm exec tsx scripts/importar-organigrama-outlook.ts --directorio "C:\\ruta\\directorio.json"
 *   pnpm exec tsx scripts/importar-organigrama-outlook.ts --directorio "C:\\ruta\\directorio.json" --aplicar
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma, type Role } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const credentialsOnly = process.argv.includes("--solo-credenciales");
const GENERATED_ROUTE_PREFIX = "Organigrama 2026 -";
const OPERATIONS_DIRECTOR_EMAIL = "myriam.esparza@proboca.net";
const MANAGER_LEVEL = 4;
const MAX_GENERATED_ROUTES_PER_UNIT = 8;
const requestedInitialPassword = process.env.PROPEX_INITIAL_PASSWORD?.trim();
if (requestedInitialPassword && requestedInitialPassword.length < 8) {
  throw new Error("PROPEX_INITIAL_PASSWORD debe tener al menos 8 caracteres.");
}
if (credentialsOnly && !requestedInitialPassword) {
  throw new Error("--solo-credenciales requiere PROPEX_INITIAL_PASSWORD.");
}
const sourceIndex = process.argv.findIndex((argument) => argument === "--directorio");
const sourcePath = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourcePath) throw new Error("Indica el JSON del directorio con --directorio <ruta>.");

type DirectoryEntry = {
  Name: string;
  Email: string;
  FirstName?: string;
  LastName?: string;
  JobTitle?: string;
  Department?: string;
  Office?: string;
  Company?: string;
  ManagerName?: string | null;
  ManagerEmail?: string | null;
};

type UnitDefinition = {
  code: string;
  plantCode: "APO" | "CAR" | "TSJ";
  parentCode: string | null;
  name: string;
  type: "MACROPROCESO" | "DEPARTAMENTO" | "PROCESO" | "AREA";
  qrEnabled: boolean;
  support: boolean;
  sortOrder: number;
};

type PreparedPerson = DirectoryEntry & {
  email: string;
  level: number;
  plantCode: "APO" | "CAR" | "TSJ";
  unitCodes: string[];
};

type ImportedMembership = {
  email: string;
  id: string;
  level: number;
  managerEmail: string | null;
  orgUnitId: string;
  plantCode: string;
  title: string;
  unitCode: string;
  userId: string;
};

type RouteCandidate = {
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  reviewerTitle: string;
  level: number;
  directReports: number;
};

const ROOT_EMAILS = [
  "osbaldo.montano@proboca.net",
  "mgorena@proboca.net",
  "melizondo@proboca.net"
];

const SPECIAL_UNITS: Record<string, string[]> = {
  "osbaldo.montano@proboca.net": ["TSJ-DIR-GEN", "APO-SOP", "CAR-SOP"],
  "mgorena@proboca.net": ["TSJ-DIR-GEN"],
  "melizondo@proboca.net": ["TSJ-DIR-GEN"],
  "myriam.esparza@proboca.net": ["TSJ-DIR-OPS", "APO-VAL", "CAR-VAL"],
  "mario.flores@proboca.net": ["TSJ-DIR-COM", "TSJ-COM", "APO-COM", "CAR-COM", "APO-DNP", "CAR-DNP"],
  "joel.lagunes@proboca.net": ["TSJ-DIR-RH", "TSJ-RH", "APO-RH", "CAR-RH"],
  "ricardo.perez@proboca.net": ["TSJ-DIR-FIN", "TSJ-FIN", "APO-FIN", "CAR-FIN"],
  "adrian.gonzalez@proboca.net": ["TSJ-DIR-ABA", "TSJ-ABA", "APO-ABA", "CAR-ABA"],
  "lucero.villanueva@proboca.net": ["APO-CAL", "CAR-CAL"],
  "epadilla@proboca.net": ["APO-PROD"],
  "adriana.elizondo@proboca.net": ["APO-LOG"],
  "paul.delacerda@proboca.net": ["APO-PLAN-ALM", "CAR-PLAN-ALM"],
  "adrian.montalvo@proboca.net": ["CAR-PROD"],
  "javier.sanchez@proboca.net": ["APO-MAN", "APO-PROY", "CAR-MAN", "CAR-PROY"],
  "edgar.santos@proboca.net": ["APO-MC", "CAR-MC"]
};

const SPECIAL_TITLES: Record<string, string> = {
  "myriam.esparza@proboca.net": "Directora de Operaciones",
  "lucero.villanueva@proboca.net": "Gerente de Calidad",
  "epadilla@proboca.net": "Gerente de Operaciones Planta Apodaca",
  "adriana.elizondo@proboca.net": "Gerente de Logistica Apodaca",
  "paul.delacerda@proboca.net": "Gerente de Planeacion de la Demanda y Almacen General",
  "adrian.montalvo@proboca.net": "Gerente de Operaciones Planta El Carmen",
  "javier.sanchez@proboca.net": "Gerente de Mantenimiento y Proyectos",
  "edgar.santos@proboca.net": "Gerente de Mejora Continua"
};

const units: UnitDefinition[] = [
  { code: "APO-VAL", plantCode: "APO", parentCode: null, name: "Cadena de valor", type: "MACROPROCESO", qrEnabled: false, support: false, sortOrder: 0 },
  { code: "APO-SOP", plantCode: "APO", parentCode: null, name: "Areas de soporte y gestion", type: "MACROPROCESO", qrEnabled: false, support: true, sortOrder: 1 },
  { code: "CAR-VAL", plantCode: "CAR", parentCode: null, name: "Cadena de valor", type: "MACROPROCESO", qrEnabled: false, support: false, sortOrder: 0 },
  { code: "CAR-SOP", plantCode: "CAR", parentCode: null, name: "Areas de soporte y gestion", type: "MACROPROCESO", qrEnabled: false, support: true, sortOrder: 1 },
  { code: "TSJ-CORP", plantCode: "TSJ", parentCode: null, name: "Estructura corporativa", type: "MACROPROCESO", qrEnabled: false, support: true, sortOrder: 0 },
  { code: "TSJ-DIR-GEN", plantCode: "TSJ", parentCode: "TSJ-CORP", name: "Comite Directivo", type: "DEPARTAMENTO", qrEnabled: false, support: true, sortOrder: 0 },
  { code: "TSJ-DIR-OPS", plantCode: "TSJ", parentCode: "TSJ-CORP", name: "Direccion de Operaciones", type: "DEPARTAMENTO", qrEnabled: false, support: true, sortOrder: 1 },
  { code: "TSJ-DIR-COM", plantCode: "TSJ", parentCode: "TSJ-CORP", name: "Direccion Comercial", type: "DEPARTAMENTO", qrEnabled: false, support: true, sortOrder: 2 },
  { code: "TSJ-DIR-RH", plantCode: "TSJ", parentCode: "TSJ-CORP", name: "Direccion de Capital Humano", type: "DEPARTAMENTO", qrEnabled: false, support: true, sortOrder: 3 },
  { code: "TSJ-DIR-FIN", plantCode: "TSJ", parentCode: "TSJ-CORP", name: "Direccion de Administracion y Finanzas", type: "DEPARTAMENTO", qrEnabled: false, support: true, sortOrder: 4 },
  { code: "TSJ-DIR-ABA", plantCode: "TSJ", parentCode: "TSJ-CORP", name: "Direccion de Abasto e Inteligencia Comercial", type: "DEPARTAMENTO", qrEnabled: false, support: true, sortOrder: 5 },
  { code: "TSJ-RH", plantCode: "TSJ", parentCode: "TSJ-DIR-RH", name: "Capital Humano", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 10 },
  { code: "TSJ-FIN", plantCode: "TSJ", parentCode: "TSJ-DIR-FIN", name: "Administracion y Finanzas", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 11 },
  { code: "TSJ-TI", plantCode: "TSJ", parentCode: "TSJ-DIR-FIN", name: "Tecnologias de Informacion", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 12 },
  { code: "TSJ-COM", plantCode: "TSJ", parentCode: "TSJ-DIR-COM", name: "Comercial y Mercadotecnia", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 13 },
  { code: "TSJ-DNP", plantCode: "TSJ", parentCode: "TSJ-DIR-COM", name: "Desarrollo de Nuevos Productos", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 14 },
  { code: "TSJ-ABA", plantCode: "TSJ", parentCode: "TSJ-DIR-ABA", name: "Abasto e Inteligencia Comercial", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 15 },
  { code: "TSJ-ADM", plantCode: "TSJ", parentCode: "TSJ-CORP", name: "Administracion", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 16 },
  { code: "TSJ-LOG", plantCode: "TSJ", parentCode: "TSJ-CORP", name: "Logistica", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 17 },
  { code: "TSJ-CAL", plantCode: "TSJ", parentCode: "TSJ-DIR-OPS", name: "Calidad e Inocuidad", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 18 },
  { code: "TSJ-MC", plantCode: "TSJ", parentCode: "TSJ-DIR-OPS", name: "Mejora Continua", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 19 },
  ...(["APO", "CAR"] as const).flatMap((plantCode) => {
    const supportRoot = `${plantCode}-SOP`;
    return [
      { code: `${plantCode}-RH`, plantCode, parentCode: supportRoot, name: "Capital Humano", type: "DEPARTAMENTO" as const, qrEnabled: true, support: true, sortOrder: 20 },
      { code: `${plantCode}-FIN`, plantCode, parentCode: supportRoot, name: "Administracion y Finanzas", type: "DEPARTAMENTO" as const, qrEnabled: true, support: true, sortOrder: 21 },
      { code: `${plantCode}-TI`, plantCode, parentCode: supportRoot, name: "Tecnologias de Informacion", type: "DEPARTAMENTO" as const, qrEnabled: true, support: true, sortOrder: 22 },
      { code: `${plantCode}-COM`, plantCode, parentCode: supportRoot, name: "Comercial y Mercadotecnia", type: "DEPARTAMENTO" as const, qrEnabled: true, support: true, sortOrder: 23 },
      { code: `${plantCode}-ABA`, plantCode, parentCode: supportRoot, name: "Abasto e Inteligencia Comercial", type: "DEPARTAMENTO" as const, qrEnabled: true, support: true, sortOrder: 24 },
      { code: `${plantCode}-ADM`, plantCode, parentCode: supportRoot, name: "Administracion", type: "DEPARTAMENTO" as const, qrEnabled: true, support: true, sortOrder: 25 },
      { code: `${plantCode}-SER`, plantCode, parentCode: supportRoot, name: "Servicios Generales", type: "DEPARTAMENTO" as const, qrEnabled: true, support: true, sortOrder: 26 }
    ];
  }),
  { code: "CAR-DNP", plantCode: "CAR", parentCode: "CAR-SOP", name: "Desarrollo de Nuevos Productos (DNP)", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 27 },
  { code: "CAR-SEG", plantCode: "CAR", parentCode: "CAR-SOP", name: "Seguridad, Salud y Ambiente", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 28 },
  { code: "CAR-PLAN-ALM", plantCode: "CAR", parentCode: "CAR-SOP", name: "Planeacion de Produccion y Almacen General", type: "DEPARTAMENTO", qrEnabled: true, support: true, sortOrder: 29 },
  { code: "CAR-LOG-TRA", plantCode: "CAR", parentCode: "CAR-LOG", name: "Trafico", type: "PROCESO", qrEnabled: true, support: true, sortOrder: 30 },
  { code: "CAR-SAC", plantCode: "CAR", parentCode: "CAR-PROD", name: "Sacrificio", type: "AREA", qrEnabled: true, support: false, sortOrder: 40 },
  { code: "CAR-DES", plantCode: "CAR", parentCode: "CAR-PROD", name: "Deshuese", type: "AREA", qrEnabled: true, support: false, sortOrder: 41 },
  { code: "CAR-MOL", plantCode: "CAR", parentCode: "CAR-PROD", name: "Molidas", type: "AREA", qrEnabled: true, support: false, sortOrder: 42 },
  { code: "CAR-EMP", plantCode: "CAR", parentCode: "CAR-PROD", name: "Empaque", type: "AREA", qrEnabled: true, support: false, sortOrder: 43 },
  { code: "CAR-INY", plantCode: "CAR", parentCode: "CAR-PROD", name: "Inyeccion", type: "AREA", qrEnabled: true, support: false, sortOrder: 44 },
  { code: "CAR-SAN", plantCode: "CAR", parentCode: "CAR-PROD", name: "Sanidad", type: "AREA", qrEnabled: true, support: false, sortOrder: 45 },
  { code: "CAR-ALM-FRIO", plantCode: "CAR", parentCode: "CAR-PROD", name: "Almacen Frio", type: "AREA", qrEnabled: true, support: false, sortOrder: 46 },
  { code: "CAR-PIE", plantCode: "CAR", parentCode: "CAR-PROD", name: "Pieles y Corrales", type: "AREA", qrEnabled: true, support: false, sortOrder: 47 }
];

function normalize(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function addRouteCandidate(candidates: Map<string, RouteCandidate>, candidate: RouteCandidate) {
  if (candidate.reviewerEmail === OPERATIONS_DIRECTOR_EMAIL && candidate.level < MANAGER_LEVEL) return;
  const current = candidates.get(candidate.reviewerId);
  if (!current
    || candidate.directReports > current.directReports
    || (candidate.directReports === current.directReports && candidate.level < current.level)) {
    candidates.set(candidate.reviewerId, candidate);
  }
}

function loadDirectory() {
  const text = readFileSync(sourcePath!, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(text) as DirectoryEntry[];
  if (!Array.isArray(parsed)) throw new Error("El directorio debe ser un arreglo JSON.");
  return parsed;
}

function looksLikeSharedMailbox(entry: DirectoryEntry) {
  const name = normalize(entry.Name);
  const local = normalizeEmail(entry.Email).split("@")[0] ?? "";
  const genericName = /^(sala|supervisor|supervisores|capturista|pieles|laboratorio|almacen|anden|embarques|alerta|asistencia|cuarto|facturacion|compras)\b/.test(name);
  const genericEmail = /^(sala|salade|supervisor|supervisores|sup\.|capturista|pieles|laboratorio|almacen\.|anden\d|embarques\.|alerta|asistencia|cuarto|facturacion)\b/.test(local);
  return genericName || genericEmail;
}

function isUsablePerson(entry: DirectoryEntry) {
  const email = normalizeEmail(entry.Email);
  const combined = normalize(`${entry.Name} ${entry.JobTitle}`);
  return email.endsWith("@proboca.net")
    && Boolean(entry.Name?.trim())
    && Boolean(entry.JobTitle?.trim())
    && !combined.includes(" baja")
    && !combined.startsWith("baja ")
    && !combined.includes("vacante")
    && !looksLikeSharedMailbox(entry);
}

function selectedDirectory(entries: DirectoryEntry[]) {
  const byEmail = new Map(entries.map((entry) => [normalizeEmail(entry.Email), entry]));
  const children = new Map<string, string[]>();
  for (const entry of entries) {
    const manager = normalizeEmail(entry.ManagerEmail);
    const email = normalizeEmail(entry.Email);
    if (!manager || !email) continue;
    const current = children.get(manager) ?? [];
    current.push(email);
    children.set(manager, current);
  }
  const selected = new Set<string>();
  const visit = (email: string) => {
    if (selected.has(email)) return;
    selected.add(email);
    for (const child of children.get(email) ?? []) visit(child);
  };
  ROOT_EMAILS.forEach(visit);
  const raw = [...selected].map((email) => byEmail.get(email)).filter((entry): entry is DirectoryEntry => Boolean(entry));
  return { byEmail, children, raw, people: raw.filter(isUsablePerson) };
}

function explicitPlant(entry: DirectoryEntry): PreparedPerson["plantCode"] | null {
  const office = normalize(entry.Office);
  if (office.includes("carmen")) return "CAR";
  if (office.includes("san jeronimo")) return "TSJ";
  if (["apodaca", "planta piloto", "norte", "sur", "produccion", "traila"].some((token) => office.includes(token))) return "APO";
  return null;
}

function inferPlants(people: DirectoryEntry[], byEmail: Map<string, DirectoryEntry>) {
  const included = new Set(people.map((entry) => normalizeEmail(entry.Email)));
  const cache = new Map<string, PreparedPerson["plantCode"]>();
  const known: Record<string, PreparedPerson["plantCode"]> = {
    "osbaldo.montano@proboca.net": "TSJ",
    "mgorena@proboca.net": "TSJ",
    "melizondo@proboca.net": "TSJ",
    "myriam.esparza@proboca.net": "TSJ",
    "mario.flores@proboca.net": "TSJ",
    "joel.lagunes@proboca.net": "TSJ",
    "ricardo.perez@proboca.net": "TSJ",
    "adrian.gonzalez@proboca.net": "TSJ",
    "adrian.montalvo@proboca.net": "CAR"
  };
  for (const [email, plant] of Object.entries(known)) cache.set(email, plant);

  const resolve = (entry: DirectoryEntry, trail = new Set<string>()): PreparedPerson["plantCode"] => {
    const email = normalizeEmail(entry.Email);
    const cached = cache.get(email);
    if (cached) return cached;
    const direct = explicitPlant(entry);
    if (direct) {
      cache.set(email, direct);
      return direct;
    }
    if (trail.has(email)) return "APO";
    trail.add(email);
    const managerEmail = normalizeEmail(entry.ManagerEmail);
    const manager = managerEmail && included.has(managerEmail) ? byEmail.get(managerEmail) : null;
    const inferred = manager ? resolve(manager, trail) : "APO";
    cache.set(email, inferred);
    return inferred;
  };
  people.forEach((entry) => resolve(entry));
  return cache;
}

function levelFor(entry: DirectoryEntry) {
  const title = normalize(entry.JobTitle);
  if (title.includes("comite directivo")) return 6;
  if (title.includes("director") || title.includes("directora")) return 5;
  if (title.includes("gerente") || title.includes("contralor")) return 4;
  if (title.includes("jefe")) return 3;
  if (title.includes("coordinador") || title.includes("lider")) return 2;
  if (title.includes("supervisor")) return 1;
  return 0;
}

function canonicalKey(entry: DirectoryEntry) {
  const department = normalize(entry.Department);
  const title = normalize(entry.JobTitle);
  const text = `${department} ${title}`;
  if (/mejora continua/.test(text)) return "MC";
  if (/calidad|inocuidad|sgci|laboratorio/.test(text)) return "CAL";
  if (/seguridad industrial|seguridad patrimonial|salud|medic|enfermer/.test(text)) return "SEG";
  if (/mantenimiento|refrigeracion|ingenieria/.test(text)) return "MAN";
  if (/^proyectos?$/.test(department) || /gerente de mantenimiento y proyectos/.test(text)) return "PROY";
  if (/recursos humanos|capital humano|\brh\b|\br h\b|nomina|reclut|capacit|relaciones laborales|desarrollo organizacional/.test(text)) return "RH";
  if (/\bti\b|tecnologias de informacion|sistemas|soporte tecnico|desarrollo y aplicaciones/.test(text)) return "TI";
  if (/abasto|compras|comprador/.test(text)) return "ABA";
  if (/desarrollo de nuevos|\bdnp\b/.test(text)) return "DNP";
  if (/comercial|mercadotecnia|nuevos negocios|pricing|comercio exterior/.test(text)) return "COM";
  if (/finanzas|finazas|contabilidad|fiscal|tesoreria|riesgos|costos|cuentas por pagar|cartera/.test(text)) return "FIN";
  if (/planeacion|almacen general/.test(text)) return "PLAN";
  if (/logistica|embarques|trafico|almacen secos|almacen externo|recibo|tarimas/.test(text)) return "LOG";
  if (/operaciones|produccion|sacrificio|deshuese|molidas|empaque|inyeccion|sanidad|pieles/.test(text)) return "PROD";
  if (/servicios generales/.test(text)) return "SER";
  return "ADM";
}

function processUnit(entry: DirectoryEntry, plantCode: PreparedPerson["plantCode"]) {
  const text = normalize(`${entry.Department} ${entry.JobTitle}`);
  if (plantCode === "APO") {
    const processCodes = [...text.matchAll(/\bp\s*([1-9])\b/g)].map((match) => `APO-P${match[1]}`);
    if (processCodes.length) return [...new Set(processCodes)];
    if (text.includes("embarques")) return ["APO-LOG-EMB"];
    if (text.includes("trafico")) return ["APO-LOG-TRA"];
    if (text.includes("almacen secos")) return ["APO-LOG-SEC"];
    if (text.includes("recibo")) return ["APO-LOG-REC"];
    if (text.includes("tarima")) return ["APO-LOG-TAR"];
  }
  if (plantCode === "CAR") {
    if (text.includes("sacrificio")) return ["CAR-SAC"];
    if (text.includes("deshuese")) return ["CAR-DES"];
    if (text.includes("molida")) return ["CAR-MOL"];
    if (text.includes("empaque")) return ["CAR-EMP"];
    if (text.includes("inyeccion")) return ["CAR-INY"];
    if (text.includes("sanidad")) return ["CAR-SAN"];
    if (text.includes("almacen frio")) return ["CAR-ALM-FRIO"];
    if (text.includes("pieles") || text.includes("corrales")) return ["CAR-PIE"];
    if (text.includes("embarques")) return ["CAR-LOG-EMB"];
    if (text.includes("trafico")) return ["CAR-LOG-TRA"];
    if (text.includes("almacen")) return ["CAR-LOG-ALM"];
  }
  return null;
}

function unitCodesFor(entry: DirectoryEntry, plantCode: PreparedPerson["plantCode"]) {
  const email = normalizeEmail(entry.Email);
  if (SPECIAL_UNITS[email]) return SPECIAL_UNITS[email];
  const process = processUnit(entry, plantCode);
  if (process) return process;
  const key = canonicalKey(entry);
  if (plantCode === "TSJ") {
    const tsjKey = key === "PLAN" || key === "PROD" || key === "SER" || key === "SEG" || key === "MAN" || key === "PROY" ? "ADM" : key;
    return [`TSJ-${tsjKey}`];
  }
  const codeByKey: Record<string, string> = {
    ABA: `${plantCode}-ABA`,
    ADM: `${plantCode}-ADM`,
    CAL: `${plantCode}-CAL`,
    COM: `${plantCode}-COM`,
    DNP: `${plantCode}-DNP`,
    FIN: `${plantCode}-FIN`,
    LOG: `${plantCode}-LOG`,
    MAN: `${plantCode}-MAN`,
    MC: `${plantCode}-MC`,
    PLAN: `${plantCode}-PLAN-ALM`,
    PROD: `${plantCode}-PROD`,
    PROY: `${plantCode}-PROY`,
    RH: `${plantCode}-RH`,
    SEG: `${plantCode}-SEG`,
    SER: `${plantCode}-SER`,
    TI: `${plantCode}-TI`
  };
  return [codeByKey[key] ?? `${plantCode}-ADM`];
}

function roleFor(entry: DirectoryEntry, existingRole?: Role): Role {
  const title = normalize(entry.JobTitle);
  const key = canonicalKey(entry);
  if (existingRole === "ADMIN") return existingRole;
  if (title.includes("comite directivo") || title.includes("director") || title.includes("directora")) return "DIRECCION";
  if (title.includes("gerente") || title.includes("contralor")) return "GERENTE";
  if (existingRole === "MEJORA_CONTINUA") return existingRole;
  if (key === "CAL") return "CALIDAD";
  if (key === "SEG") return "SEGURIDAD";
  if (key === "MAN") return "MANTENIMIENTO";
  if (levelFor(entry) >= 1) return "SUPERVISOR";
  return existingRole ?? "COLABORADOR";
}

function prepareDirectory(entries: DirectoryEntry[]) {
  const selected = selectedDirectory(entries);
  const plants = inferPlants(selected.people, selected.byEmail);
  const people: PreparedPerson[] = selected.people.map((entry) => {
    const email = normalizeEmail(entry.Email);
    const preparedEntry = SPECIAL_TITLES[email] ? { ...entry, JobTitle: SPECIAL_TITLES[email] } : entry;
    const plantCode = plants.get(email) ?? "APO";
    const unitCodes = unitCodesFor(preparedEntry, plantCode);
    return { ...preparedEntry, email, level: levelFor(preparedEntry), plantCode, unitCodes: [...new Set(unitCodes)] };
  });
  for (const manager of people.filter((person) => person.level >= 2 && !SPECIAL_UNITS[person.email])) {
    const reportPlants = new Set(
      people
        .filter((person) => normalizeEmail(person.ManagerEmail) === manager.email)
        .map((person) => person.plantCode)
    );
    for (const plantCode of reportPlants) {
      manager.unitCodes.push(...unitCodesFor(manager, plantCode));
    }
    manager.unitCodes = [...new Set(manager.unitCodes)];
  }
  return { ...selected, people };
}

function summary(prepared: ReturnType<typeof prepareDirectory>) {
  const byPlant = prepared.people.reduce<Record<string, number>>((result, person) => {
    result[person.plantCode] = (result[person.plantCode] ?? 0) + 1;
    return result;
  }, {});
  const byLevel = prepared.people.reduce<Record<string, number>>((result, person) => {
    result[String(person.level)] = (result[String(person.level)] ?? 0) + 1;
    return result;
  }, {});
  const usedUnits = new Set(prepared.people.flatMap((person) => person.unitCodes));
  const byUnit = [...prepared.people.reduce((result, person) => {
    for (const code of person.unitCodes) result.set(code, (result.get(code) ?? 0) + 1);
    return result;
  }, new Map<string, number>())].sort((left, right) => left[0].localeCompare(right[0]));
  const executives = prepared.people
    .filter((person) => person.level >= 4)
    .map((person) => ({ name: person.Name, title: person.JobTitle, units: person.unitCodes }));
  console.log(JSON.stringify({
    directoryRows: prepared.byEmail.size,
    inReportingTree: prepared.raw.length,
    peopleAccepted: prepared.people.length,
    sharedOrInactiveExcluded: prepared.raw.length - prepared.people.length,
    byPlant,
    byLevel,
    unitsWithPeople: usedUnits.size,
    byUnit: Object.fromEntries(byUnit),
    executives,
    credentialActivationRequested: Boolean(requestedInitialPassword)
  }, null, 2));
}

async function ensureUnits(database: Prisma.TransactionClient) {
  const plants = new Map<string, { id: string }>();
  for (const plant of [
    { code: "APO", name: "Planta Apodaca" },
    { code: "CAR", name: "Planta El Carmen" },
    { code: "TSJ", name: "Torre San Jeronimo" }
  ]) {
    plants.set(plant.code, await database.plant.upsert({ where: { code: plant.code }, update: { name: plant.name, active: true }, create: { ...plant, active: true } }));
  }

  for (const definition of units) {
    const plant = plants.get(definition.plantCode)!;
    const parent = definition.parentCode ? await database.orgUnit.findUnique({ where: { code: definition.parentCode }, select: { id: true } }) : null;
    if (definition.parentCode && !parent) throw new Error(`No existe la unidad padre ${definition.parentCode}.`);
    await database.orgUnit.upsert({
      where: { code: definition.code },
      update: {
        plantId: plant.id,
        parentId: parent?.id ?? null,
        name: definition.name,
        type: definition.type,
        qrEnabled: definition.qrEnabled,
        isSupportArea: definition.support,
        active: true,
        sortOrder: definition.sortOrder
      },
      create: {
        plantId: plant.id,
        parentId: parent?.id ?? null,
        code: definition.code,
        name: definition.name,
        type: definition.type,
        responsible: "Responsable por asignar",
        manager: "Jefatura por asignar",
        qrEnabled: definition.qrEnabled,
        isSupportArea: definition.support,
        active: true,
        sortOrder: definition.sortOrder
      }
    });
  }
}

function chooseManagerMembership(current: ImportedMembership, managerMemberships: ImportedMembership[]) {
  const sameUnit = managerMemberships.find((candidate) => candidate.unitCode === current.unitCode);
  if (sameUnit) return sameUnit;
  const samePlant = managerMemberships.filter((candidate) => candidate.plantCode === current.plantCode);
  if (samePlant.length) return samePlant.sort((a, b) => b.level - a.level || a.unitCode.localeCompare(b.unitCode))[0];
  return null;
}

async function ensureCaptureArea(database: Prisma.TransactionClient, unitId: string, unitCode: string, unitName: string) {
  const unit = await database.orgUnit.findUniqueOrThrow({ where: { id: unitId }, include: { captureArea: true } });
  if (unit.captureArea) return unit.captureArea;
  const area = await database.area.upsert({
    where: { code: unitCode },
    update: { name: unitName, active: true },
    create: { code: unitCode, name: unitName, active: true }
  });
  await database.orgUnit.update({ where: { id: unitId }, data: { captureAreaId: area.id } });
  return area;
}

async function applyImport(prepared: ReturnType<typeof prepareDirectory>) {
  const unavailableHash = await bcrypt.hash(`NotForLogin-${randomBytes(32).toString("base64url")}`, 10);
  const stats = { usersCreated: 0, usersUpdated: 0, participantsLinked: 0, memberships: 0, managerLinks: 0, routes: 0, units: 0 };

  await prisma.$transaction(async (database) => {
    await ensureUnits(database);
    stats.units = units.length;
    const [existingUsers, participants, dbUnits] = await Promise.all([
      database.user.findMany(),
      database.participant.findMany({ select: { id: true, userId: true, name: true, email: true } }),
      database.orgUnit.findMany({ include: { plant: true } })
    ]);
    const usersByEmail = new Map(existingUsers.map((user) => [normalizeEmail(user.email), user]));
    const participantByEmail = new Map(participants.filter((participant) => participant.email).map((participant) => [normalizeEmail(participant.email), participant]));
    const participantsByName = new Map<string, typeof participants>();
    for (const participant of participants) {
      const key = normalize(participant.name);
      participantsByName.set(key, [...(participantsByName.get(key) ?? []), participant]);
    }
    const unitsByCode = new Map(dbUnits.map((unit) => [unit.code, unit]));
    const importedUsers = new Map<string, { id: string; role: Role }>();

    for (const person of prepared.people) {
      const existing = usersByEmail.get(person.email);
      const role = roleFor(person, existing?.role);
      const data = {
        name: person.Name.trim(),
        email: person.email,
        role,
        jobTitle: person.JobTitle?.trim() || null,
        active: true,
        kaizenAccess: existing?.kaizenAccess || person.level >= 1,
        genbaAccess: existing?.genbaAccess || person.level >= 1
      };
      const user = existing
        ? await database.user.update({ where: { id: existing.id }, data })
        : await database.user.create({ data: { ...data, passwordHash: unavailableHash } });
      existing ? stats.usersUpdated++ : stats.usersCreated++;
      importedUsers.set(person.email, { id: user.id, role: user.role });

      const linked = participants.find((participant) => participant.userId === user.id);
      const emailMatch = participantByEmail.get(person.email);
      const nameMatches = (participantsByName.get(normalize(person.Name)) ?? []).filter((participant) => !participant.userId);
      const reusable = linked ?? (emailMatch && !emailMatch.userId ? emailMatch : null) ?? (nameMatches.length === 1 ? nameMatches[0] : null);
      const participantOrgUnitId = person.unitCodes.map((code) => unitsByCode.get(code)?.id).find(Boolean) ?? null;
      if (reusable) {
        await database.participant.update({
          where: { id: reusable.id },
          data: { userId: user.id, orgUnitId: participantOrgUnitId, name: person.Name.trim(), email: person.email, jobTitle: person.JobTitle?.trim() || null, active: true }
        });
        stats.participantsLinked++;
      } else if (!linked) {
        await database.participant.create({ data: { userId: user.id, orgUnitId: participantOrgUnitId, name: person.Name.trim(), email: person.email, jobTitle: person.JobTitle?.trim() || null, active: true } });
        stats.participantsLinked++;
      }
    }

    const importedMemberships: ImportedMembership[] = [];
    for (const person of prepared.people) {
      const user = importedUsers.get(person.email)!;
      for (const unitCode of person.unitCodes) {
        const unit = unitsByCode.get(unitCode);
        if (!unit) continue;
        const existing = await database.orgMembership.findUnique({ where: { userId_orgUnitId: { userId: user.id, orgUnitId: unit.id } } });
        const canLead = person.level >= 1;
        const membership = await database.orgMembership.upsert({
          where: { userId_orgUnitId: { userId: user.id, orgUnitId: unit.id } },
          update: {
            title: person.JobTitle?.trim() || "Colaborador",
            level: person.level,
            canReviewTeam: existing?.canReviewTeam || canLead,
            canReceiveIdeas: existing?.canReceiveIdeas || canLead,
            canManageActivities: existing?.canManageActivities || canLead,
            active: true
          },
          create: {
            userId: user.id,
            orgUnitId: unit.id,
            title: person.JobTitle?.trim() || "Colaborador",
            level: person.level,
            canReviewTeam: canLead,
            canReceiveIdeas: canLead,
            canManageActivities: canLead,
            active: true,
            sortOrder: 0
          }
        });
        importedMemberships.push({
          email: person.email,
          id: membership.id,
          level: person.level,
          managerEmail: normalizeEmail(person.ManagerEmail) || null,
          orgUnitId: unit.id,
          plantCode: unit.plant.code,
          title: membership.title,
          unitCode,
          userId: user.id
        });
        stats.memberships++;
      }
    }

    const membershipsByEmail = new Map<string, ImportedMembership[]>();
    for (const membership of importedMemberships) membershipsByEmail.set(membership.email, [...(membershipsByEmail.get(membership.email) ?? []), membership]);
    for (const membership of importedMemberships) {
      let managerEmail = membership.managerEmail;
      const visited = new Set<string>();
      let managerMembership: ImportedMembership | null = null;
      while (managerEmail && !visited.has(managerEmail)) {
        visited.add(managerEmail);
        managerMembership = chooseManagerMembership(membership, membershipsByEmail.get(managerEmail) ?? []);
        if (managerMembership) break;
        managerEmail = normalizeEmail(prepared.byEmail.get(managerEmail)?.ManagerEmail) || null;
      }
      if (!managerMembership || managerMembership.userId === membership.userId) continue;
      await database.orgMembership.update({ where: { id: membership.id }, data: { managerMembershipId: managerMembership.id } });
      stats.managerLinks++;
    }

    const obsoleteDnpMemberships = await database.orgMembership.findMany({
      where: {
        active: true,
        user: { email: "myriam.esparza@proboca.net" },
        orgUnit: { code: "APO-DNP" },
        title: { contains: "interina" }
      },
      select: { id: true }
    });
    if (obsoleteDnpMemberships.length) {
      const ids = obsoleteDnpMemberships.map((membership) => membership.id);
      await database.orgEscalationRule.updateMany({ where: { reviewerMembershipId: { in: ids }, active: true }, data: { active: false, isDefault: false } });
      await database.orgMembership.updateMany({ where: { id: { in: ids } }, data: { active: false, canReceiveIdeas: false, canReviewTeam: false, canManageActivities: false } });
    }

    const activeUnits = await database.orgUnit.findMany({
      where: { active: true, qrEnabled: true },
      include: {
        plant: true,
        captureArea: true,
        escalationRules: {
          where: { active: true },
          include: { reviewerMembership: { include: { user: true } } }
        },
        memberships: {
          where: { active: true },
          include: {
            user: true,
            managerMembership: { include: { user: true, orgUnit: { include: { plant: true } } } },
            directReports: { where: { active: true }, include: { orgUnit: true } }
          }
        }
      }
    });

    for (const unit of activeUnits) {
      if (!unit.memberships.length) continue;
      const area = await ensureCaptureArea(database, unit.id, unit.code, unit.name);
      const routeCandidates = new Map<string, RouteCandidate>();
      for (const membership of unit.memberships) {
        if (!membership.canReceiveIdeas) continue;
        const reportsHere = membership.directReports.filter((report) => report.orgUnitId === unit.id).length;
        if (reportsHere) addRouteCandidate(routeCandidates, {
          reviewerId: membership.id,
          reviewerName: membership.user.name,
          reviewerEmail: normalizeEmail(membership.user.email),
          reviewerTitle: membership.title,
          level: Math.max(0, membership.level - 1),
          directReports: reportsHere
        });
      }
      for (const membership of unit.memberships) {
        const manager = membership.managerMembership;
        if (!manager || manager.userId === membership.userId || manager.orgUnit.plantId !== unit.plantId || !manager.canReceiveIdeas) continue;
        addRouteCandidate(routeCandidates, {
          reviewerId: manager.id,
          reviewerName: manager.user.name,
          reviewerEmail: normalizeEmail(manager.user.email),
          reviewerTitle: manager.title,
          level: membership.level,
          directReports: 0
        });
      }
      if (![...routeCandidates.values()].some((candidate) => candidate.level === 0)) {
        const fallback = unit.memberships
          .filter((membership) => membership.canReceiveIdeas && normalizeEmail(membership.user.email) !== OPERATIONS_DIRECTOR_EMAIL)
          .sort((a, b) => a.level - b.level || a.user.name.localeCompare(b.user.name))[0];
        if (fallback) addRouteCandidate(routeCandidates, {
          reviewerId: fallback.id,
          reviewerName: fallback.user.name,
          reviewerEmail: normalizeEmail(fallback.user.email),
          reviewerTitle: fallback.title,
          level: 0,
          directReports: 0
        });
      }
      const prohibitedDirectorRules = unit.escalationRules.filter((rule) =>
        normalizeEmail(rule.reviewerMembership.user.email) === OPERATIONS_DIRECTOR_EMAIL
        && rule.submitterLevel < MANAGER_LEVEL
      );
      if (prohibitedDirectorRules.length) {
        await database.orgEscalationRule.updateMany({
          where: { id: { in: prohibitedDirectorRules.map((rule) => rule.id) } },
          data: { active: false, isDefault: false }
        });
      }
      const manualRoutes = unit.escalationRules.filter((rule) =>
        !rule.name.startsWith(GENERATED_ROUTE_PREFIX)
        && !prohibitedDirectorRules.some((prohibited) => prohibited.id === rule.id)
      );
      const manualReviewerIds = new Set(manualRoutes.map((rule) => rule.reviewerMembershipId));
      const candidates = [...routeCandidates.values()]
        .filter((candidate) => !manualReviewerIds.has(candidate.reviewerId))
        .sort((a, b) => b.directReports - a.directReports || a.level - b.level || a.reviewerName.localeCompare(b.reviewerName))
        .slice(0, MAX_GENERATED_ROUTES_PER_UNIT);
      await database.orgEscalationRule.updateMany({
        where: { orgUnitId: unit.id, active: true, name: { startsWith: GENERATED_ROUTE_PREFIX } },
        data: { active: false, isDefault: false }
      });
      const generatedRouteIds: string[] = [];
      for (const [index, candidate] of candidates.entries()) {
        const name = `${GENERATED_ROUTE_PREFIX}${candidate.reviewerName}`;
        const existing = await database.orgEscalationRule.findFirst({
          where: {
            orgUnitId: unit.id,
            reviewerMembershipId: candidate.reviewerId,
            name: { startsWith: GENERATED_ROUTE_PREFIX }
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
        });
        const data = {
          name,
          submitterLabel: candidate.reviewerName,
          circumstance: candidate.reviewerTitle,
          submitterLevel: candidate.level,
          reviewerMembershipId: candidate.reviewerId,
          isDefault: false,
          active: true
        };
        const saved = existing
          ? await database.orgEscalationRule.update({ where: { id: existing.id }, data: { ...data, sortOrder: manualRoutes.length + index } })
          : await database.orgEscalationRule.create({ data: { ...data, orgUnitId: unit.id, sortOrder: manualRoutes.length + index } });
        generatedRouteIds.push(saved.id);
        stats.routes++;
      }
      const manualDefault = manualRoutes.find((rule) => rule.isDefault) ?? manualRoutes[0];
      const defaultRuleId = manualDefault?.id ?? generatedRouteIds[0];
      if (defaultRuleId) {
        await database.orgEscalationRule.updateMany({ where: { orgUnitId: unit.id, isDefault: true }, data: { isDefault: false } });
        const defaultRule = await database.orgEscalationRule.update({
          where: { id: defaultRuleId },
          data: { isDefault: true },
          include: { reviewerMembership: { include: { user: true } } }
        });
        const reviewer = defaultRule.reviewerMembership.user;
        await database.orgUnit.update({ where: { id: unit.id }, data: { routingUserId: reviewer.id, responsible: reviewer.name, manager: reviewer.name } });
        await database.area.update({ where: { id: area.id }, data: { supervisorId: reviewer.id } });
      }
    }

    const admin = await database.user.findFirst({ where: { role: "ADMIN", active: true }, select: { id: true } });
    await database.auditLog.create({
      data: {
        entity: "Organization",
        entityId: "OUTLOOK-ORG-2026",
        action: "OUTLOOK_ORGANIZATION_IMPORTED",
        userId: admin?.id ?? null,
        details: JSON.stringify({ source: "Outlook GAL + Organigrama_Apodaca_250326", ...stats })
      }
    });
  }, { maxWait: 20_000, timeout: 180_000 });

  const memberships = await prisma.orgMembership.findMany({ where: { active: true }, select: { id: true, managerMembershipId: true } });
  const managerById = new Map(memberships.map((membership) => [membership.id, membership.managerMembershipId]));
  const cycles: string[] = [];
  for (const membership of memberships) {
    const seen = new Set([membership.id]);
    let current = membership.managerMembershipId;
    while (current) {
      if (seen.has(current)) {
        cycles.push(membership.id);
        break;
      }
      seen.add(current);
      current = managerById.get(current) ?? null;
    }
  }
  if (cycles.length) throw new Error(`Se detectaron ${cycles.length} ciclos de jefatura.`);

  const generatedRoutes = await prisma.orgEscalationRule.findMany({
    where: { active: true, name: { startsWith: "Organigrama 2026 -" } },
    include: { orgUnit: { include: { plant: true } }, reviewerMembership: { include: { orgUnit: { include: { plant: true } }, user: true } } }
  });
  const crossPlant = generatedRoutes.filter((route) => route.orgUnit.plantId !== route.reviewerMembership.orgUnit.plantId);
  if (crossPlant.length) throw new Error(`Se detectaron ${crossPlant.length} rutas entre plantas distintas.`);
  const administrativeExecutives = await prisma.user.count({
    where: { email: { in: prepared.people.filter((person) => person.level >= 4).map((person) => person.email) }, role: "ADMIN" }
  });
  if (administrativeExecutives) throw new Error("Una cuenta ejecutiva recibio ADMIN por error.");
  console.log(JSON.stringify({ ...stats, cycles: cycles.length, generatedRoutes: generatedRoutes.length, crossPlantRoutes: crossPlant.length, administrativeExecutives }, null, 2));
}

async function activateCredentials(prepared: ReturnType<typeof prepareDirectory>) {
  if (!requestedInitialPassword) return;
  const passwordHash = await bcrypt.hash(requestedInitialPassword, 10);
  const importedEmails = prepared.people.map((person) => person.email);
  const result = await prisma.user.updateMany({
    where: { active: true, email: { in: importedEmails } },
    data: { passwordHash }
  });
  const credentialsEnabled = await prisma.user.count({
    where: { active: true, email: { in: importedEmails }, passwordHash }
  });
  if (credentialsEnabled !== importedEmails.length) {
    throw new Error(`Solo se habilitaron ${credentialsEnabled} de ${importedEmails.length} cuentas importadas.`);
  }
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", active: true }, select: { id: true } });
  await prisma.auditLog.create({
    data: {
      entity: "Organization",
      entityId: "OUTLOOK-ORG-2026",
      action: "ORGANIZATION_CREDENTIALS_ENABLED",
      userId: admin?.id ?? null,
      details: JSON.stringify({ accounts: credentialsEnabled, source: "Outlook GAL + Organigrama_Apodaca_250326" })
    }
  });
  console.log(JSON.stringify({ passwordsUpdated: result.count, credentialsEnabled }, null, 2));
}

async function main() {
  const directory = loadDirectory();
  const prepared = prepareDirectory(directory);
  summary(prepared);
  if (!aplicar) {
    console.log("\nSimulacion completada. Usa --aplicar para guardar usuarios, areas, jefaturas y rutas.");
  } else if (credentialsOnly) {
    await activateCredentials(prepared);
  } else {
    await applyImport(prepared);
    await activateCredentials(prepared);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
