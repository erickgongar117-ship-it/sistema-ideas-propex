/**
 * Concilia la plantilla quincenal y semanal con el directorio de participantes.
 * La simulacion es el modo predeterminado y ejecuta la transaccion completa con rollback.
 *
 * Uso:
 *   pnpm exec tsx scripts/importar-plantilla-nomina.ts --quincenales "C:\\ruta\\HC.xlsx" --semanales "C:\\ruta\\activos.xlsx" --directorio "C:\\ruta\\outlook.json"
 *   pnpm exec tsx scripts/importar-plantilla-nomina.ts --quincenales "C:\\ruta\\HC.xlsx" --semanales "C:\\ruta\\activos.xlsx" --directorio "C:\\ruta\\outlook.json" --aplicar
 */
import { existsSync, readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import {
  ParticipantEmailStatus,
  PayrollFrequency,
  Prisma,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();
const applyChanges = process.argv.includes("--aplicar");

type Database = Prisma.TransactionClient;

type DirectoryEntry = {
  Name: string;
  Email: string;
  JobTitle?: string;
  Department?: string;
  Office?: string;
};

type RosterPerson = {
  employeeNumber: string;
  name: string;
  jobTitle: string | null;
  department: string;
  direction: string;
  plantCode: "APO" | "CAR";
  payrollFrequency: PayrollFrequency;
  source: "quincenal" | "semanal";
  sourceRow: number;
};

type ImportStats = {
  source: { biweekly: number; weekly: number; total: number };
  participantsCreated: number;
  participantsUpdated: number;
  matchedByEmployeeNumber: number;
  matchedByDirectoryAccount: number;
  matchedByName: number;
  usersLinked: number;
  userEmployeeNumbersUpdated: number;
  emailsFound: number;
  emailsPending: number;
  weeklyWithoutEmailRequirement: number;
  foundEmailsWithoutAccount: number;
  orgUnitsMapped: number;
  orgUnitsPending: number;
  knownCorrections: string[];
  linkConflicts: string[];
  employeeConflicts: string[];
  pendingEmails: Array<{ employeeNumber: string; name: string }>;
  pendingOrgUnits: Array<{ employeeNumber: string; department: string; plant: string }>;
};

class DryRunRollback extends Error {}

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredFile(name: string) {
  const path = argument(name);
  if (!path) throw new Error(`Falta ${name} <ruta>.`);
  if (!existsSync(path)) throw new Error(`No existe el archivo indicado en ${name}: ${path}`);
  return path;
}

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

function nameCase(value: string) {
  const lowerWords = new Set(["de", "del", "la", "las", "los", "y"]);
  return value
    .trim()
    .toLocaleLowerCase("es-MX")
    .split(/\s+/)
    .map((word, index) => lowerWords.has(word) && index > 0
      ? word
      : word.charAt(0).toLocaleUpperCase("es-MX") + word.slice(1))
    .join(" ");
}

function weeklyName(value: string) {
  const [lastNames, ...givenNames] = value.split(",").map((part) => part.trim());
  return nameCase(givenNames.length ? `${givenNames.join(" ")} ${lastNames}` : value);
}

function employeeNumber(value: string, name: string) {
  const raw = value.trim().replace(/\.0+$/, "");
  if (raw === "266770" && normalize(name).includes("mendoza benavides fernando")) return "26677";
  if (!/^\d{1,5}$/.test(raw)) return null;
  return raw.padStart(5, "0");
}

function cellText(row: ExcelJS.Row, column: number) {
  return row.getCell(column).text.trim();
}

async function readBiweekly(path: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("El archivo quincenal no contiene hojas.");

  const people: RosterPerson[] = [];
  for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const rawNumber = cellText(row, 1);
    const rawName = cellText(row, 2);
    if (!rawName) continue;
    const normalizedNumber = employeeNumber(rawNumber, rawName);
    if (!normalizedNumber) {
      throw new Error(`Numero de empleado invalido en quincenales, fila ${rowNumber}: ${rawNumber}`);
    }
    const plant = normalize(cellText(row, 6));
    if (!plant.includes("apodaca") && !plant.includes("carmen")) {
      throw new Error(`Planta no reconocida en quincenales, fila ${rowNumber}: ${cellText(row, 6)}`);
    }
    people.push({
      employeeNumber: normalizedNumber,
      name: nameCase(rawName),
      jobTitle: cellText(row, 3) || null,
      department: cellText(row, 4),
      direction: cellText(row, 5),
      plantCode: plant.includes("carmen") ? "CAR" : "APO",
      payrollFrequency: PayrollFrequency.BIWEEKLY,
      source: "quincenal",
      sourceRow: rowNumber
    });
  }
  return people;
}

async function readWeekly(path: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("El archivo semanal no contiene hojas.");

  const people: RosterPerson[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const rawNumber = cellText(row, 1);
    const rawName = cellText(row, 2);
    if (!rawNumber && !rawName) continue;
    const normalizedNumber = employeeNumber(rawNumber, rawName);
    if (!normalizedNumber) {
      throw new Error(`Numero de empleado invalido en semanales, fila ${rowNumber}: ${rawNumber}`);
    }
    const plant = normalize(cellText(row, 5));
    if (!plant.includes("apodaca") && !plant.includes("carmen")) {
      throw new Error(`Planta no reconocida en semanales, fila ${rowNumber}: ${cellText(row, 5)}`);
    }
    people.push({
      employeeNumber: normalizedNumber,
      name: weeklyName(rawName),
      jobTitle: cellText(row, 3) || null,
      department: cellText(row, 4),
      direction: "",
      plantCode: plant.includes("carmen") ? "CAR" : "APO",
      payrollFrequency: PayrollFrequency.WEEKLY,
      source: "semanal",
      sourceRow: rowNumber
    });
  }
  return people;
}

function looksLikeSharedMailbox(entry: DirectoryEntry) {
  const name = normalize(entry.Name);
  const local = normalizeEmail(entry.Email).split("@")[0] ?? "";
  return /^(sala|supervisor|supervisores|capturista|pieles|laboratorio|almacen|anden|embarques|alerta|asistencia|cuarto|facturacion|compras)\b/.test(name)
    || /^(sala|salade|supervisor|supervisores|sup\.|capturista|pieles|laboratorio|almacen\.|anden\d|embarques\.|alerta|asistencia|cuarto|facturacion)\b/.test(local);
}

function usableDirectoryEntry(entry: DirectoryEntry) {
  const email = normalizeEmail(entry.Email);
  const combined = normalize(`${entry.Name} ${entry.JobTitle}`);
  return email.endsWith("@proboca.net")
    && Boolean(entry.Name?.trim())
    && !combined.includes(" baja")
    && !combined.startsWith("baja ")
    && !combined.includes("vacante")
    && !looksLikeSharedMailbox(entry);
}

function loadDirectory(path: string) {
  const parsed = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as DirectoryEntry[];
  if (!Array.isArray(parsed)) throw new Error("El directorio de Outlook debe ser un arreglo JSON.");
  const entries = parsed.filter(usableDirectoryEntry);
  const byEmail = new Map(entries.map((entry) => [normalizeEmail(entry.Email), entry]));
  const byName = new Map<string, DirectoryEntry[]>();
  for (const entry of entries) {
    const key = normalize(entry.Name);
    byName.set(key, [...(byName.get(key) ?? []), entry]);
  }
  return { entries, byEmail, byName };
}

function canonicalUnitKey(text: string) {
  if (/calidad|inocuidad|sgci|laboratorio/.test(text)) return "CAL";
  if (/seguridad|salud|medic|enfermer/.test(text)) return "SEG";
  if (/mantenimiento|refrigeracion|ingenieria/.test(text)) return "MAN";
  if (/mejora continua/.test(text)) return "MC";
  if (/proyectos?/.test(text)) return "PROY";
  if (/recursos humanos|capital humano|nomina|reclut|capacit|relaciones laborales/.test(text)) return "RH";
  if (/tecnologias de informacion|sistemas|soporte tecnico|desarrollo y aplicaciones|\bti\b/.test(text)) return "TI";
  if (/abasto|compras|comprador/.test(text)) return "ABA";
  if (/desarrollo de nuevos|\bdnp\b/.test(text)) return "DNP";
  if (/comercial|mercadotecnia|nuevos negocios|pricing|comercio exterior/.test(text)) return "COM";
  if (/finanzas|administracion|contabilidad|fiscal|tesoreria|riesgos|costos|cuentas por pagar|cartera/.test(text)) return "FIN";
  if (/planeacion|almacen general/.test(text)) return "PLAN-ALM";
  if (/logistica|embarques|trafico|almacen|inventario|recibo|tarimas/.test(text)) return "LOG";
  if (/operaciones|produccion|sanitizacion|sacrificio|deshuese|molidas|empaque|inyeccion|sanidad|pieles/.test(text)) return "PROD";
  if (/servicios generales/.test(text)) return "SER";
  return "ADM";
}

function unitCandidates(person: RosterPerson) {
  const text = normalize(`${person.department} ${person.direction} ${person.jobTitle ?? ""}`);
  const codes: string[] = [];
  const process = text.match(/\bp\s*([1-9])\b/);
  if (person.plantCode === "APO" && process) codes.push(`APO-P${process[1]}`);
  if (person.plantCode === "CAR") {
    if (text.includes("sacrificio")) codes.push("CAR-SAC");
    if (text.includes("deshuese")) codes.push("CAR-DES");
    if (text.includes("molida")) codes.push("CAR-MOL");
    if (text.includes("empaque")) codes.push("CAR-EMP");
    if (text.includes("inyeccion")) codes.push("CAR-INY");
    if (text.includes("sanidad")) codes.push("CAR-SAN");
    if (text.includes("almacen frio")) codes.push("CAR-ALM-FRIO");
    if (text.includes("pieles") || text.includes("corrales")) codes.push("CAR-PIE");
  }
  if (text.includes("embarques")) codes.push(`${person.plantCode}-LOG-EMB`);
  if (text.includes("trafico")) codes.push(`${person.plantCode}-LOG-TRA`);
  if (text.includes("recibo")) codes.push(`${person.plantCode}-LOG-REC`);
  if (text.includes("tarima")) codes.push(`${person.plantCode}-LOG-TAR`);
  if (text.includes("almacen secos")) codes.push(`${person.plantCode}-LOG-SEC`);
  codes.push(`${person.plantCode}-${canonicalUnitKey(text)}`);
  codes.push(`${person.plantCode}-ADM`);
  return [...new Set(codes)];
}

function uniqueByName<T extends { name: string }>(values: T[]) {
  const result = new Map<string, T[]>();
  for (const value of values) {
    const key = normalize(value.name);
    result.set(key, [...(result.get(key) ?? []), value]);
  }
  return result;
}

async function correctKnownIdentity(database: Database, stats: ImportStats) {
  const participants = await database.participant.findMany({ include: { user: true } });
  const erick = participants.find((participant) => normalize(participant.name) === "erick osvaldo gongora garza");
  if (!erick || erick.employeeNumber === "81177") return;
  if (erick.employeeNumber !== "81163") {
    throw new Error(`Erick Gongora tiene un numero inesperado: ${erick.employeeNumber ?? "sin numero"}.`);
  }
  const occupiedParticipant = await database.participant.findUnique({ where: { employeeNumber: "81177" } });
  if (occupiedParticipant && occupiedParticipant.id !== erick.id) {
    throw new Error("El numero 81177 ya pertenece a otro participante.");
  }
  await database.participant.update({ where: { id: erick.id }, data: { employeeNumber: "81177" } });
  if (erick.userId) {
    const occupiedUser = await database.user.findUnique({ where: { employeeNumber: "81177" } });
    if (occupiedUser && occupiedUser.id !== erick.userId) {
      throw new Error("El numero 81177 ya pertenece a otra cuenta de acceso.");
    }
    await database.user.update({ where: { id: erick.userId }, data: { employeeNumber: "81177" } });
  }
  stats.knownCorrections.push("Erick Osvaldo Gongora Garza: 81163 -> 81177");
}

async function importRoster(
  database: Database,
  roster: RosterPerson[],
  directory: ReturnType<typeof loadDirectory>,
  stats: ImportStats
) {
  await correctKnownIdentity(database, stats);

  const [participants, users, units] = await Promise.all([
    database.participant.findMany({ include: { user: true } }),
    database.user.findMany({ include: { participant: { select: { id: true } } } }),
    database.orgUnit.findMany({ select: { id: true, code: true } })
  ]);
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const participantsByEmployee = new Map(
    participants.filter((participant) => participant.employeeNumber).map((participant) => [participant.employeeNumber!, participant])
  );
  const participantsByName = uniqueByName(participants);
  const usersByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
  const usersByEmployee = new Map(users.filter((user) => user.employeeNumber).map((user) => [user.employeeNumber!, user]));
  const usersByName = uniqueByName(users);
  const unitsByCode = new Map(units.map((unit) => [unit.code, unit.id]));

  for (const person of roster) {
    const exactDirectory = directory.byName.get(normalize(person.name)) ?? [];
    let foundEmail = person.payrollFrequency === PayrollFrequency.BIWEEKLY && exactDirectory.length === 1
      ? normalizeEmail(exactDirectory[0].Email)
      : null;
    let directoryUser = foundEmail ? usersByEmail.get(foundEmail) : undefined;

    let participant = participantsByEmployee.get(person.employeeNumber);
    let match: "employee" | "account" | "name" | "new" = participant ? "employee" : "new";
    if (!participant && directoryUser?.participant) {
      participant = participantsById.get(directoryUser.participant.id);
      match = participant ? "account" : "new";
    }
    if (!participant) {
      const nameMatches = participantsByName.get(normalize(person.name)) ?? [];
      if (nameMatches.length === 1) {
        participant = nameMatches[0];
        match = "name";
      }
    }

    if (person.payrollFrequency === PayrollFrequency.BIWEEKLY && !foundEmail) {
      const candidateEmails = [participant?.email, participant?.user?.email]
        .map(normalizeEmail)
        .filter(Boolean);
      const userMatches = usersByName.get(normalize(person.name)) ?? [];
      candidateEmails.push(...userMatches.map((user) => normalizeEmail(user.email)));
      foundEmail = candidateEmails.find((email) => directory.byEmail.has(email)) ?? null;
      directoryUser = foundEmail ? usersByEmail.get(foundEmail) : undefined;
      if (!participant && directoryUser?.participant) {
        participant = participantsById.get(directoryUser.participant.id);
        match = participant ? "account" : "new";
      }
    }

    const numberOwner = participantsByEmployee.get(person.employeeNumber);
    if (participant && numberOwner && numberOwner.id !== participant.id) {
      stats.employeeConflicts.push(
        `${person.employeeNumber}: ${person.name} entra en conflicto con ${numberOwner.name}`
      );
      continue;
    }

    const unitId = unitCandidates(person).map((code) => unitsByCode.get(code)).find(Boolean) ?? null;
    if (unitId) stats.orgUnitsMapped++;
    else {
      stats.orgUnitsPending++;
      stats.pendingOrgUnits.push({
        employeeNumber: person.employeeNumber,
        department: person.department,
        plant: person.plantCode
      });
    }

    const emailStatus = person.payrollFrequency === PayrollFrequency.WEEKLY
      ? ParticipantEmailStatus.NOT_APPLICABLE
      : foundEmail
        ? ParticipantEmailStatus.FOUND
        : ParticipantEmailStatus.PENDING;
    if (emailStatus === ParticipantEmailStatus.FOUND) stats.emailsFound++;
    if (emailStatus === ParticipantEmailStatus.PENDING) {
      stats.emailsPending++;
      stats.pendingEmails.push({ employeeNumber: person.employeeNumber, name: person.name });
    }
    if (emailStatus === ParticipantEmailStatus.NOT_APPLICABLE) stats.weeklyWithoutEmailRequirement++;
    if (foundEmail && !directoryUser) stats.foundEmailsWithoutAccount++;

    let userId = participant?.userId ?? null;
    if (!userId && directoryUser) {
      if (!directoryUser.participant || directoryUser.participant.id === participant?.id) {
        userId = directoryUser.id;
        stats.usersLinked++;
      } else {
        stats.linkConflicts.push(
          `${person.employeeNumber}: ${foundEmail} ya esta vinculado a otro participante`
        );
      }
    } else if (userId && directoryUser && userId !== directoryUser.id) {
      stats.linkConflicts.push(
        `${person.employeeNumber}: conserva su cuenta actual; ${foundEmail} corresponde a otra cuenta`
      );
    }

    const data = {
      employeeNumber: person.employeeNumber,
      email: foundEmail ?? participant?.email ?? null,
      jobTitle: person.jobTitle ?? participant?.jobTitle ?? null,
      orgUnitId: unitId ?? participant?.orgUnitId ?? null,
      payrollFrequency: person.payrollFrequency,
      emailStatus,
      active: true,
      userId
    };
    const saved = participant
      ? await database.participant.update({
          where: { id: participant.id },
          data,
          include: { user: true }
        })
      : await database.participant.create({
          data: { ...data, name: person.name },
          include: { user: true }
        });

    if (participant) stats.participantsUpdated++;
    else stats.participantsCreated++;
    if (match === "employee") stats.matchedByEmployeeNumber++;
    if (match === "account") stats.matchedByDirectoryAccount++;
    if (match === "name") stats.matchedByName++;

    participantsById.set(saved.id, saved);
    participantsByEmployee.set(person.employeeNumber, saved);
    if (!participant) {
      participantsByName.set(normalize(saved.name), [
        ...(participantsByName.get(normalize(saved.name)) ?? []),
        saved
      ]);
    }

    if (userId) {
      const linkedUser = users.find((user) => user.id === userId);
      if (linkedUser && linkedUser.employeeNumber !== person.employeeNumber) {
        const userNumberOwner = usersByEmployee.get(person.employeeNumber);
        if (!userNumberOwner || userNumberOwner.id === linkedUser.id) {
          await database.user.update({
            where: { id: linkedUser.id },
            data: { employeeNumber: person.employeeNumber }
          });
          if (linkedUser.employeeNumber) usersByEmployee.delete(linkedUser.employeeNumber);
          linkedUser.employeeNumber = person.employeeNumber;
          usersByEmployee.set(person.employeeNumber, linkedUser);
          stats.userEmployeeNumbersUpdated++;
        } else {
          stats.employeeConflicts.push(
            `${person.employeeNumber}: no se actualizo la cuenta porque el numero ya esta en ${userNumberOwner.email}`
          );
        }
      }
    }
  }
}

async function verifyImport(roster: RosterPerson[]) {
  const numbers = roster.map((person) => person.employeeNumber);
  const [registered, biweekly, weekly, fernando] = await Promise.all([
    prisma.participant.count({ where: { employeeNumber: { in: numbers } } }),
    prisma.participant.count({
      where: { employeeNumber: { in: numbers }, payrollFrequency: PayrollFrequency.BIWEEKLY }
    }),
    prisma.participant.count({
      where: { employeeNumber: { in: numbers }, payrollFrequency: PayrollFrequency.WEEKLY }
    }),
    prisma.participant.findUnique({
      where: { employeeNumber: "26677" },
      select: { name: true, employeeNumber: true, payrollFrequency: true }
    })
  ]);
  if (registered !== roster.length || biweekly !== 157 || weekly !== 650) {
    throw new Error(
      `Validacion incompleta: ${registered}/${roster.length} registrados, ${biweekly} quincenales, ${weekly} semanales.`
    );
  }
  if (normalize(fernando?.name) !== "fernando mendoza benavides") {
    throw new Error("La correccion 26677 de Fernando Mendoza Benavides no quedo validada.");
  }
  return { registered, biweekly, weekly, fernando };
}

async function main() {
  const biweeklyPath = requiredFile("--quincenales");
  const weeklyPath = requiredFile("--semanales");
  const directoryPath = requiredFile("--directorio");
  const [biweekly, weekly] = await Promise.all([
    readBiweekly(biweeklyPath),
    readWeekly(weeklyPath)
  ]);
  const roster = [...biweekly, ...weekly];
  const duplicateNumbers = roster.reduce<Map<string, RosterPerson[]>>((result, person) => {
    result.set(person.employeeNumber, [...(result.get(person.employeeNumber) ?? []), person]);
    return result;
  }, new Map());
  const duplicates = [...duplicateNumbers.entries()].filter(([, people]) => people.length > 1);
  if (duplicates.length) {
    throw new Error(`Hay numeros repetidos entre los archivos: ${duplicates.map(([number]) => number).join(", ")}`);
  }
  if (biweekly.length !== 157 || weekly.length !== 650) {
    throw new Error(`Se esperaban 157 quincenales y 650 semanales; se leyeron ${biweekly.length} y ${weekly.length}.`);
  }

  const directory = loadDirectory(directoryPath);
  const stats: ImportStats = {
    source: { biweekly: biweekly.length, weekly: weekly.length, total: roster.length },
    participantsCreated: 0,
    participantsUpdated: 0,
    matchedByEmployeeNumber: 0,
    matchedByDirectoryAccount: 0,
    matchedByName: 0,
    usersLinked: 0,
    userEmployeeNumbersUpdated: 0,
    emailsFound: 0,
    emailsPending: 0,
    weeklyWithoutEmailRequirement: 0,
    foundEmailsWithoutAccount: 0,
    orgUnitsMapped: 0,
    orgUnitsPending: 0,
    knownCorrections: ["Fernando Mendoza Benavides: 266770 -> 26677"],
    linkConflicts: [],
    employeeConflicts: [],
    pendingEmails: [],
    pendingOrgUnits: []
  };

  try {
    await prisma.$transaction(async (database) => {
      await importRoster(database, roster, directory, stats);
      if (!applyChanges) throw new DryRunRollback("Simulacion completada");
    }, { maxWait: 10_000, timeout: 120_000 });
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }

  console.log(JSON.stringify({
    mode: applyChanges ? "aplicado" : "simulacion con rollback",
    directoryEntries: directory.entries.length,
    ...stats,
    pendingEmails: stats.pendingEmails.slice(0, 60),
    pendingOrgUnits: stats.pendingOrgUnits.slice(0, 30)
  }, null, 2));

  if (stats.employeeConflicts.length || stats.linkConflicts.length) {
    throw new Error(
      `La conciliacion encontro ${stats.employeeConflicts.length} conflictos de numero y ${stats.linkConflicts.length} conflictos de cuenta.`
    );
  }
  if (applyChanges) {
    console.log(JSON.stringify({ verification: await verifyImport(roster) }, null, 2));
  } else {
    console.log("\nNo se guardo ningun cambio. Repite con --aplicar cuando el reporte sea correcto.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
