import { PrismaClient, type KaizenStatus, type WorkItemStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";

type Scalar = string | number | boolean | Date | null | undefined | { result?: unknown; text?: string; richText?: Array<{ text?: string }> };

type KaizenRow = {
  row: number;
  number: number;
  title: string;
  plant: string;
  baseline: number | null;
  target: number | null;
  current: number | null;
  estimatedSavings: number | null;
  realSavings: number | null;
  unit: string;
  progress: number;
  statusText: string;
  leader: string;
  facilitator: string;
  direction: string;
  startDate: Date | null;
  endDate: Date | null;
  originalEndDate: Date | null;
  sourceSheet: string;
};

type KaizenAction = {
  row: number;
  number: number;
  problem: string;
  action: string;
  responsible: string;
  dueDate: Date | null;
  dueDateText: string;
  statusText: string;
  comments: string;
};

type KaizenPlan = {
  number: number;
  title: string;
  leader: string;
  progress: number | null;
  row: number;
  actions: KaizenAction[];
};

type GenbaSourceRow = {
  row: number;
  number: number;
  date: Date;
  day: string;
  area: string;
  problem: string;
  /** Solo cuando el libro trae Hallazgo y Actividad por separado. */
  action: string;
  responsible: string;
  dueDate: Date | null;
  dueDateText: string;
  statusText: string;
  comments: string;
  department: string;
  evidence: string;
};

const prisma = new PrismaClient();


function args() {
  const values = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index];
    if (!key.startsWith("--")) continue;
    const next = process.argv[index + 1];
    values.set(key.slice(2), next && !next.startsWith("--") ? next : "true");
  }
  return values;
}

function text(value: Scalar): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text ?? "").join("").trim();
    if (value.result != null) return text(value.result as Scalar);
    if (value.text) return value.text.trim();
  }
  return String(value).trim();
}

function numberValue(value: Scalar): number | null {
  const resolved = typeof value === "object" && value && "result" in value ? value.result : value;
  if (typeof resolved === "number" && Number.isFinite(resolved)) return resolved;
  const parsed = Number(text(resolved as Scalar).replace(/[$,%\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value: string) {
  return normalize(value).replace(/\s+/g, ".").slice(0, 60) || "sin.nombre";
}

function isPersonalResponsible(value: string, department = "") {
  const candidate = normalize(value);
  if (!candidate || candidate === normalize(department)) return false;
  if (/[\/,;&]/.test(value) || /\s+y\s+/i.test(value)) return false;
  if (/^(mantenimiento|mtto|produccion|calidad|almacen|logistica|seguridad|proyectos|mejora|rh|e hs|pr|sin responsable|enfermera)$/.test(candidate)) return false;
  if (/operaciones|refrigeracion|planeacion|departamento|equipo|personal/.test(candidate) && candidate.split(" ").length < 4) return false;
  return true;
}

function dateValue(value: Scalar): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const numeric = numberValue(value);
  if (numeric != null && numeric > 20_000 && numeric < 80_000) {
    const result = new Date(Date.UTC(1899, 11, 30) + numeric * 86_400_000);
    return Number.isNaN(result.getTime()) ? null : result;
  }
  const raw = text(value);
  if (!raw || /pendiente|cada semana|^-$|^n\/a$/i.test(raw)) return null;
  const months: Record<string, number> = { ene: 0, enero: 0, feb: 1, febrero: 1, mar: 2, marzo: 2, abr: 3, abril: 3, may: 4, mayo: 4, jun: 5, junio: 5, jul: 6, julio: 6, ago: 7, agosto: 7, sep: 8, septiembre: 8, oct: 9, octubre: 9, nov: 10, noviembre: 10, dic: 11, diciembre: 11 };
  const parts = normalize(raw).split(/[\s/-]+/);
  if (parts.length >= 3) {
    const day = Number(parts[0]);
    const month = months[parts[1]] ?? (Number(parts[1]) - 1);
    const year = Number(parts[2]);
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) return new Date(Date.UTC(year, month, day, 12));
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoWeekDate(year: number, week: number, end = false) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4, 12));
  const mondayOffset = (januaryFourth.getUTCDay() + 6) % 7;
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - mondayOffset + (week - 1) * 7 + (end ? 6 : 0));
  return monday;
}

/**
 * Color con el que el Excel pinta cada tramo de la barra.
 *
 * La fila 1 del Gantt es una leyenda: la celda 14 lleva el color de "Original" y la 15 el
 * de "Reagenda". Leerla en vez de codificar los colores a mano evita que el importador se
 * rompa si alguien cambia la paleta del libro.
 */
function ganttLegend(sheet: ExcelJS.Worksheet) {
  const tone = (column: number) => {
    const fill = sheet.getRow(1).getCell(column).fill as ExcelJS.FillPattern | undefined;
    if (fill?.type !== "pattern" || !fill.fgColor) return null;
    return String(fill.fgColor.theme ?? fill.fgColor.argb ?? "");
  };
  return { original: tone(14), rescheduled: tone(15) };
}

/**
 * Fechas de la barra, separando el plan original del corrimiento.
 *
 * Antes se tomaba el tramo completo de una sola pieza, asi que un proyecto reagendado se
 * veia identico a uno que siempre duro mas: la fecha nueva borraba la evidencia de que
 * hubo un cambio. Ahora el tramo en color "Original" da el cierre comprometido y el tramo
 * en color "Reagenda" el cierre real, y la diferencia entre ambos es el retraso.
 */
function ganttDates(sheet: ExcelJS.Worksheet, rowNumber: number, legend: { original: string | null; rescheduled: string | null }) {
  const weeks: number[] = [];
  const originalWeeks: number[] = [];
  for (let column = 16; column <= 54; column += 1) {
    const cell = sheet.getRow(rowNumber).getCell(column);
    const fill = cell.fill as ExcelJS.FillPattern | undefined;
    if (fill?.type !== "pattern" || fill.pattern === "none" || !fill.fgColor) continue;
    const week = numberValue(sheet.getRow(2).getCell(column).value as Scalar);
    if (week == null) continue;
    weeks.push(week);
    const tone = String(fill.fgColor.theme ?? fill.fgColor.argb ?? "");
    if (legend.original && tone === legend.original) originalWeeks.push(week);
  }
  if (!weeks.length) return { startDate: null, endDate: null, originalEndDate: null };
  const startDate = isoWeekDate(2026, Math.min(...weeks));
  const endDate = isoWeekDate(2026, Math.max(...weeks), true);
  // Sin tramo "Original" identificable no hay con que comparar: se deja nulo en vez de
  // inventar un compromiso que el libro nunca declaro.
  const originalEnd = originalWeeks.length ? isoWeekDate(2026, Math.max(...originalWeeks), true) : null;
  const originalEndDate = originalEnd && originalEnd.getTime() < endDate.getTime() ? originalEnd : null;
  return { startDate, endDate, originalEndDate };
}

function parseGantt(workbook: ExcelJS.Workbook) {
  const candidates: KaizenRow[] = [];
  for (const sheet of workbook.worksheets.filter((item) => normalize(item.name).startsWith("gantt kaizen"))) {
    const legend = ganttLegend(sheet);
    let plant = "";
    for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      plant = text(row.getCell(1).value as Scalar) || plant;
      const projectNumber = numberValue(row.getCell(2).value as Scalar);
      const title = text(row.getCell(3).value as Scalar);
      if (projectNumber == null || !title) continue;
      const dates = ganttDates(sheet, rowNumber, legend);
      candidates.push({
        row: rowNumber,
        number: Math.trunc(projectNumber),
        title,
        plant: plant.trim(),
        baseline: numberValue(row.getCell(4).value as Scalar),
        target: numberValue(row.getCell(5).value as Scalar),
        current: numberValue(row.getCell(6).value as Scalar),
        estimatedSavings: numberValue(row.getCell(8).value as Scalar),
        realSavings: numberValue(row.getCell(9).value as Scalar),
        unit: text(row.getCell(10).value as Scalar),
        progress: numberValue(row.getCell(11).value as Scalar) ?? 0,
        statusText: text(row.getCell(12).value as Scalar),
        leader: text(row.getCell(13).value as Scalar),
        facilitator: text(row.getCell(14).value as Scalar),
        direction: text(row.getCell(15).value as Scalar),
        startDate: dates.startDate,
        endDate: dates.endDate,
        originalEndDate: dates.originalEndDate,
        sourceSheet: sheet.name,
      });
    }
  }
  return candidates;
}

function parsePlan(workbook: ExcelJS.Workbook) {
  const matchingSheets = workbook.worksheets.filter((item) => normalize(item.name).startsWith("plan de accion kaizen"));
  const sheet = [...matchingSheets].reverse().find((item) => item.state === "visible") ?? matchingSheets[matchingSheets.length - 1];
  if (!sheet) throw new Error("No se encontro Plan de Accion Kaizen.");
  const plans = new Map<number, KaizenPlan>();
  let current: KaizenPlan | null = null;
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const heading = text(row.getCell(1).value as Scalar);
    const match = heading.match(/kaizen\s*#\s*0*(\d+)\s*-\s*(.*?)(?:\s+l[ií]der\s*:\s*(.*?))?(?:\s+(\d{1,3})%)?$/i);
    if (match && current?.number !== Number(match[1])) {
      const leaderOnlyProgress = !match[4] && /^\d{1,3}%$/.test((match[3] || "").trim());
      current = {
        number: Number(match[1]),
        title: (match[2] || "").replace(/\s+\d{1,3}%$/, "").trim(),
        leader: leaderOnlyProgress ? "" : (match[3] || "").replace(/\s+\d{1,3}%$/, "").trim(),
        progress: match[4] ? Number(match[4]) / 100 : leaderOnlyProgress ? Number(match[3].replace("%", "")) / 100 : null,
        row: rowNumber,
        actions: [],
      };
      plans.set(current.number, current);
    }
    if (!current) continue;
    const actionNumber = numberValue(row.getCell(2).value as Scalar);
    const problem = text(row.getCell(3).value as Scalar);
    const action = text(row.getCell(4).value as Scalar);
    if (actionNumber == null || (!problem && !action)) continue;
    const dueRaw = row.getCell(6).value as Scalar;
    current.actions.push({
      row: rowNumber,
      number: Math.trunc(actionNumber),
      problem,
      action: action || problem,
      responsible: text(row.getCell(5).value as Scalar),
      dueDate: dateValue(dueRaw),
      dueDateText: text(dueRaw),
      statusText: text(row.getCell(7).value as Scalar),
      comments: text(row.getCell(8).value as Scalar),
    });
  }
  return { sheet, plans };
}

type GenbaMinuteFinding = {
  problem: string;
  action: string;
  responsible: string;
  dueDate: Date | null;
  dueDateText: string;
};

type GenbaMinute = {
  sheet: string;
  convocante: string;
  lugar: string;
  tema: string;
  visitDate: Date;
  attendees: string[];
  absentees: string[];
  findings: GenbaMinuteFinding[];
};

function parseGenba(workbook: ExcelJS.Workbook) {
  const base = workbook.getWorksheet("Base");
  const plan = workbook.getWorksheet("Plan Accion Genba") ?? workbook.worksheets.find((sheet) => normalize(sheet.name) === "plan accion genba");
  if (!base) throw new Error("No se encontro la hoja Base de GENBA.");
  const latest = new Map<string, { responsible: string; dueDate: Date | null; dueDateText: string; statusText: string; comments: string; evidence: string }>();
  if (plan) {
    let number = 0;
    for (let rowNumber = 1; rowNumber <= plan.rowCount; rowNumber += 1) {
      const row = plan.getRow(rowNumber);
      const heading = text(row.getCell(1).value as Scalar);
      const headingMatch = heading.match(/genba\s*#\s*0*(\d+)/i);
      if (headingMatch) number = Number(headingMatch[1]);
      const problem = text(row.getCell(3).value as Scalar);
      if (!number || !problem || normalize(problem) === "problematica") continue;
      const dueRaw = row.getCell(5).value as Scalar;
      latest.set(`${number}:${normalize(problem)}`, {
        responsible: text(row.getCell(4).value as Scalar),
        dueDate: dateValue(dueRaw),
        dueDateText: text(dueRaw),
        statusText: text(row.getCell(6).value as Scalar),
        comments: text(row.getCell(7).value as Scalar),
        evidence: text(row.getCell(8).value as Scalar),
      });
    }
  }
  // Las columnas se resuelven por el nombre del encabezado, no por posicion.
  //
  // La version anterior leia la problematica de la columna 5 y el resto a partir de ahi.
  // El libro de Apodaca tiene una columna "Actividad" que la version vieja no contemplaba,
  // asi que todo el mapeo quedaba corrido un lugar: la columna 5 ("Hallazgo") esta vacia en
  // sus 227 renglones y el importador habria traido cero filas sin decir por que. Leer el
  // encabezado deja que el archivo declare su propia forma y sobrevive a que le agreguen o
  // muevan columnas.
  const columna = new Map<string, number>();
  base.getRow(1).eachCell({ includeEmpty: false }, (cell, index) => {
    const nombre = normalize(text(cell.value as Scalar));
    if (nombre && !columna.has(nombre)) columna.set(nombre, index);
  });
  const leer = (row: ExcelJS.Row, ...nombres: string[]) => {
    for (const nombre of nombres) {
      const index = columna.get(nombre);
      if (index) {
        const valor = text(row.getCell(index).value as Scalar);
        if (valor) return valor;
      }
    }
    return "";
  };
  const leerCrudo = (row: ExcelJS.Row, ...nombres: string[]) => {
    for (const nombre of nombres) {
      const index = columna.get(nombre);
      if (index) {
        const valor = row.getCell(index).value as Scalar;
        if (valor != null && text(valor)) return valor;
      }
    }
    return null;
  };
  if (!columna.has("genba")) throw new Error(`La hoja Base no tiene una columna "Genba". Encabezados leidos: ${[...columna.keys()].join(", ")}`);

  const rows: GenbaSourceRow[] = [];
  for (let rowNumber = 2; rowNumber <= base.rowCount; rowNumber += 1) {
    const row = base.getRow(rowNumber);
    const numberMatch = leer(row, "genba").match(/#\s*0*(\d+)/);
    // "Hallazgo" primero y "Actividad" como respaldo: en el libro de Apodaca solo esta la
    // segunda, y en libros anteriores solo la primera. Cualquiera de las dos sirve de
    // problematica; si estan ambas, la accion se guarda aparte.
    const problem = leer(row, "hallazgo", "actividad");
    const visitDate = dateValue(leerCrudo(row, "fecha") as Scalar);
    if (!numberMatch || !problem || !visitDate) continue;
    const number = Number(numberMatch[1]);
    const current = latest.get(`${number}:${normalize(problem)}`);
    const dueRaw = leerCrudo(row, "fecha compromiso") as Scalar;
    const hallazgo = leer(row, "hallazgo");
    rows.push({
      row: rowNumber,
      number,
      date: visitDate,
      day: leer(row, "dia"),
      area: leer(row, "zona", "area") || "Sin area especificada",
      problem,
      action: hallazgo ? leer(row, "actividad") : "",
      responsible: current?.responsible || leer(row, "responsables", "responsable"),
      dueDate: current?.dueDate ?? dateValue(dueRaw),
      dueDateText: current?.dueDateText || text(dueRaw),
      statusText: current?.statusText || leer(row, "estatus"),
      comments: current?.comments || leer(row, "comentarios"),
      department: leer(row, "departamento"),
      evidence: current?.evidence || "",
    });
  }
  return rows;
}

/**
 * Minutas de recorrido, el formato nuevo (Formatos.xlsx, una hoja por fecha).
 *
 * Traen lo que a la hoja Base le falta: hallazgo y accion por separado, responsable
 * personal y fecha compromiso real. Base tiene 225 de 227 renglones sin fecha compromiso;
 * estas la traen en cada linea, asi que son la fuente de mejor calidad de las dos.
 *
 * Se reconocen por el titulo de la primera fila, no por el nombre de la hoja, para que
 * agregar la minuta de otro dia no exija tocar el importador.
 */
function parseGenbaMinutes(book: ExcelJS.Workbook) {
  const minutas: GenbaMinute[] = [];
  for (const sheet of book.worksheets) {
    if (!/minuta de recorrido/i.test(text(sheet.getRow(1).getCell(1).value as Scalar))) continue;
    const etiqueta = (fila: number) => normalize(text(sheet.getRow(fila).getCell(1).value as Scalar));
    let convocante = "";
    let lugar = "";
    let tema = "";
    let visitDate: Date | null = null;
    for (let fila = 2; fila <= 8; fila += 1) {
      const clave = etiqueta(fila);
      if (clave === "convocante") {
        convocante = text(sheet.getRow(fila).getCell(2).value as Scalar);
        visitDate = visitDate ?? dateValue(sheet.getRow(fila).getCell(5).value as Scalar);
      }
      if (clave === "lugar") lugar = text(sheet.getRow(fila).getCell(2).value as Scalar);
      if (clave === "tema") tema = text(sheet.getRow(fila).getCell(2).value as Scalar);
    }
    // Asistentes en la primera columna, ausentes en la tercera, hasta el renglon vacio.
    let filaAsistencia = 0;
    for (let fila = 2; fila <= 20; fila += 1) if (etiqueta(fila) === "asistentes") { filaAsistencia = fila; break; }
    const attendees: string[] = [];
    const absentees: string[] = [];
    if (filaAsistencia) {
      for (let fila = filaAsistencia + 1; fila <= sheet.rowCount; fila += 1) {
        const presente = text(sheet.getRow(fila).getCell(1).value as Scalar);
        const ausente = text(sheet.getRow(fila).getCell(3).value as Scalar);
        if (!presente && !ausente) break;
        if (presente) attendees.push(presente);
        if (ausente) absentees.push(ausente);
      }
    }
    // La tabla de hallazgos empieza en el renglon cuyo primer valor dice "Hallazgo".
    let filaTabla = 0;
    for (let fila = filaAsistencia + 1; fila <= sheet.rowCount; fila += 1) if (etiqueta(fila) === "hallazgo") { filaTabla = fila; break; }
    const findings: GenbaMinuteFinding[] = [];
    if (filaTabla) {
      for (let fila = filaTabla + 1; fila <= sheet.rowCount; fila += 1) {
        const problem = text(sheet.getRow(fila).getCell(1).value as Scalar);
        if (!problem || normalize(problem) === "elaboro") break;
        const dueRaw = sheet.getRow(fila).getCell(5).value as Scalar;
        findings.push({
          problem,
          action: text(sheet.getRow(fila).getCell(3).value as Scalar),
          responsible: text(sheet.getRow(fila).getCell(4).value as Scalar),
          dueDate: dateValue(dueRaw),
          dueDateText: text(dueRaw),
        });
      }
    }
    if (!visitDate || !findings.length) continue;
    minutas.push({ sheet: sheet.name, convocante, lugar: lugar || "Sin area especificada", tema, visitDate, attendees, absentees, findings });
  }
  return minutas;
}

function titleSimilarity(a: string, b: string) {
  const left = new Set(normalize(a).split(" ").filter((word) => word.length > 2));
  const right = new Set(normalize(b).split(" ").filter((word) => word.length > 2));
  return [...left].filter((word) => right.has(word)).length;
}

function chooseGantt(candidates: KaizenRow[], plan?: KaizenPlan) {
  return [...candidates].sort((a, b) => {
    const planScoreA = plan ? titleSimilarity(a.title, plan.title) * 50 : 0;
    const planScoreB = plan ? titleSimilarity(b.title, plan.title) * 50 : 0;
    const completenessA = [a.baseline, a.target, a.current, a.estimatedSavings, a.realSavings, a.leader, a.statusText].filter((value) => value != null && value !== "").length;
    const completenessB = [b.baseline, b.target, b.current, b.estimatedSavings, b.realSavings, b.leader, b.statusText].filter((value) => value != null && value !== "").length;
    const visibleA = a.sourceSheet.endsWith(" ") ? 10 : 0;
    const visibleB = b.sourceSheet.endsWith(" ") ? 10 : 0;
    return planScoreB + completenessB + visibleB - (planScoreA + completenessA + visibleA);
  })[0];
}

function kaizenStatus(statusText: string, progress: number): KaizenStatus {
  const status = normalize(statusText);
  if (/cerrado|cierre/.test(status)) return "COMPLETADO";
  if (/cancel/.test(status)) return "CANCELADO";
  if (/pausa/.test(status)) return "EN_PAUSA";
  if (/proceso/.test(status)) return "EN_CURSO";
  if (/pendiente/.test(status)) return "PLANIFICACION";
  if (progress >= 1) return "COMPLETADO";
  if (progress > 0) return "EN_CURSO";
  return "PLANIFICACION";
}

/**
 * Justificacion de las acciones que el Excel dejo sin estatus.
 *
 * No es un hueco de captura: son las que el equipo decidio no seguir porque no aportaban
 * al proceso. Antes caian en PENDIENTE por descarte, asi que arrastraban el avance hacia
 * abajo y aparecian como vencidas. El #21 marcaba 71% cuando en realidad estaba terminado.
 */
export const SIN_SEGUIMIENTO = "Sin seguimiento: no aporta al proceso, cerrada sin ejecutar.";

function workStatus(statusText: string): WorkItemStatus {
  const status = normalize(statusText);
  if (!status) return "CANCELADA";
  if (/cerrado|complet/.test(status)) return "COMPLETADA";
  if (/proceso/.test(status)) return "EN_PROCESO";
  if (/bloque/.test(status)) return "BLOQUEADA";
  if (/cancel|no programado|no aplica/.test(status)) return "CANCELADA";
  return "PENDIENTE";
}

async function workbook(path: string) {
  const result = new ExcelJS.Workbook();
  await result.xlsx.readFile(path);
  return result;
}

async function importedUser(name: string, adminPasswordHash: string) {
  const cleanName = name.trim() || "Responsable por vincular";
  const existing = await prisma.user.findFirst({ where: { name: { equals: cleanName } }, orderBy: { active: "desc" } });
  if (existing) return existing;
  const email = `${slug(cleanName)}.${Buffer.from(normalize(cleanName)).toString("hex").slice(-8)}@import.propex.local`;
  return prisma.user.upsert({
    where: { email },
    update: { name: cleanName },
    create: { name: cleanName, email, role: "COLABORADOR", passwordHash: adminPasswordHash, active: false },
  });
}

async function resetPreviewData() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.toLowerCase().includes("preview-2026")) {
    throw new Error("El reinicio solo esta permitido sobre la base preview-2026.");
  }
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { action: { startsWith: "IMPORT_EXCEL_2026" } } }),
    prisma.kaizenProject.deleteMany(),
    prisma.genbaWalk.deleteMany(),
    prisma.trainingEnrollment.deleteMany(),
    prisma.trainingSession.deleteMany(),
    prisma.trainingProgram.deleteMany(),
    prisma.coinTransaction.deleteMany(),
    prisma.idea.updateMany({ data: { participantId: null } }),
    prisma.participant.deleteMany(),
  ]);
}

async function importKaizen(sourcePath: string, adminId: string, passwordHash: string) {
  const book = await workbook(sourcePath);
  const ganttRows = parseGantt(book);
  const { plans } = parsePlan(book);
  const numbers = [...new Set([...ganttRows.map((row) => row.number), ...plans.keys()])].sort((a, b) => a - b);
  const conflicts: Array<{ number: number; options: string[]; selected: string }> = [];
  let actionCount = 0;
  for (const number of numbers) {
    const plan = plans.get(number);
    const options = ganttRows.filter((row) => row.number === number);
    const gantt = chooseGantt(options, plan);
    if (!gantt && !plan) continue;
    const title = plan?.title || gantt.title;
    const leaderName = plan?.leader || gantt?.leader || "Responsable por vincular";
    const leader = await importedUser(leaderName, passwordHash);
    const actionDates = (plan?.actions ?? []).map((action) => action.dueDate).filter((date): date is Date => Boolean(date));
    const startDate = gantt?.startDate ?? (actionDates.length ? new Date(Math.min(...actionDates.map((date) => date.getTime()))) : new Date(Date.UTC(2026, 0, 1, 12)));
    const endDate = gantt?.endDate ?? (actionDates.length ? new Date(Math.max(...actionDates.map((date) => date.getTime()))) : new Date(Date.UTC(2026, 11, 31, 12)));
    const status = kaizenStatus(gantt?.statusText ?? "", gantt?.progress ?? plan?.progress ?? 0);
    const project = await prisma.kaizenProject.upsert({
      where: { folio: `XLS-KZN-${String(number).padStart(3, "0")}` },
      // El compromiso original solo vive en el Excel, nadie lo edita en la aplicacion, asi
      // que se refresca en cada corrida sin miedo a pisar trabajo de alguien.
      update: { originalEndDate: gantt?.originalEndDate ?? null },
      create: {
        number,
        folio: `XLS-KZN-${String(number).padStart(3, "0")}`,
        title,
        plant: gantt?.plant || null,
        area: gantt?.direction || title,
        objective: `Dar seguimiento al proyecto ${title}.`,
        scope: [
          `Importado de Calendario Kaizen 2026 Oficial.xlsx.`,
          `Avance reportado en Excel: ${Math.round((gantt?.progress ?? plan?.progress ?? 0) * 100)}%.`,
          gantt?.facilitator ? `Seguimiento original: ${gantt.facilitator}.` : "",
          `Responsable original: ${leaderName}.`,
        ].filter(Boolean).join(" "),
        baselineValue: gantt?.baseline ?? null,
        targetValue: gantt?.target ?? null,
        currentValue: gantt?.current ?? null,
        unit: gantt?.unit || null,
        estimatedSavings: gantt?.estimatedSavings ?? null,
        realSavings: gantt?.realSavings ?? null,
        status,
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        originalEndDate: gantt?.originalEndDate ?? null,
        closedAt: status === "COMPLETADO" ? endDate : null,
        closureNote: status === "COMPLETADO" ? "Cierre historico importado del Excel; evidencia digital pendiente de conciliacion." : null,
        closedById: status === "COMPLETADO" ? adminId : null,
        leaderId: leader.id,
        createdById: adminId,
      },
    });
    if (options.length > 1 && new Set(options.map((item) => normalize(item.title))).size > 1) {
      conflicts.push({ number, options: [...new Set(options.map((item) => item.title))], selected: title });
    }
    for (const [index, action] of (plan?.actions ?? []).entries()) {
      const owner = isPersonalResponsible(action.responsible) ? await importedUser(action.responsible, passwordHash) : null;
      const itemStatus = workStatus(action.statusText);
      await prisma.kaizenActivity.upsert({
        where: { projectId_number: { projectId: project.id, number: index + 1 } },
        update: {},
        create: {
          projectId: project.id,
          number: index + 1,
          problem: action.problem || null,
          action: action.action,
          ownerId: owner?.id ?? null,
          dueDate: action.dueDate,
          status: itemStatus,
          completionNote: itemStatus === "COMPLETADA" ? [action.comments, `Responsable Excel: ${action.responsible || "Sin asignar"}.`].filter(Boolean).join(" ") : null,
          cancellationReason: itemStatus === "CANCELADA" ? [action.statusText || SIN_SEGUIMIENTO, action.comments].filter(Boolean).join(" - ") : null,
          closedAt: itemStatus === "COMPLETADA" ? action.dueDate ?? endDate : null,
        },
      });
      if (action.comments && itemStatus !== "COMPLETADA") {
        const activity = await prisma.kaizenActivity.findUniqueOrThrow({ where: { projectId_number: { projectId: project.id, number: index + 1 } } });
        const comment = `Excel: ${action.comments}`;
        const existingUpdate = await prisma.kaizenUpdate.findFirst({ where: { projectId: project.id, activityId: activity.id, comment } });
        if (!existingUpdate) await prisma.kaizenUpdate.create({ data: { projectId: project.id, activityId: activity.id, comment } });
      }
      actionCount += 1;
    }
    if (gantt?.facilitator) {
      const facilitator = await importedUser(gantt.facilitator, passwordHash);
      if (facilitator.id !== leader.id) await prisma.kaizenTeamMember.upsert({ where: { projectId_userId: { projectId: project.id, userId: facilitator.id } }, update: { role: "Seguimiento" }, create: { projectId: project.id, userId: facilitator.id, role: "Seguimiento" } });
    }
    const auditDetails = JSON.stringify({ source: sourcePath, number, planRow: plan?.row, ganttRow: gantt?.row, ganttSheet: gantt?.sourceSheet, originalProgress: gantt?.progress ?? plan?.progress ?? 0, originalLeader: leaderName });
    const existingAudit = await prisma.auditLog.findFirst({ where: { entity: "KaizenProject", entityId: project.id, action: "IMPORT_EXCEL_2026_KAIZEN", details: auditDetails } });
    if (!existingAudit) await prisma.auditLog.create({ data: { entity: "KaizenProject", entityId: project.id, action: "IMPORT_EXCEL_2026_KAIZEN", userId: adminId, details: auditDetails } });
  }
  return { projectCount: numbers.length, actionCount, conflicts };
}

async function importGenba(sourcePath: string, adminId: string, passwordHash: string, coordinatorId: string, minutesPath?: string) {
  const book = await workbook(sourcePath);
  const rows = parseGenba(book);
  const groups = new Map<number, GenbaSourceRow[]>();
  for (const row of rows) groups.set(row.number, [...(groups.get(row.number) ?? []), row]);
  let actionCount = 0;
  let evidenceReferences = 0;
  let unassignedResponsibilities = 0;
  let missingDueDates = 0;
  for (const [number, sourceRows] of groups.entries()) {
    const first = sourceRows[0];
    const actionable = sourceRows.filter((row) => !/no se program|recorrido genba cancelado|reunion de rotacion/i.test(normalize(row.problem)));
    const statuses = actionable.map((row) => workStatus(row.statusText));
    const status = !actionable.length ? "CANCELADO" : statuses.every((value) => value === "COMPLETADA" || value === "CANCELADA") ? "CERRADO" : "ABIERTO";
    const departments = [...new Set(actionable.map((row) => row.department).filter(Boolean))];
    const walk = await prisma.genbaWalk.upsert({
      where: { folio: `XLS-GENBA-${String(number).padStart(3, "0")}` },
      update: {},
      create: {
        number,
        folio: `XLS-GENBA-${String(number).padStart(3, "0")}`,
        areaName: first.area,
        visitDate: first.date,
        // Los departamentos responsables de los hallazgos son la mejor aproximacion a
        // quien se esperaba en el recorrido; la asistencia real no existe en este libro y
        // se deja vacia en vez de inventarla.
        expectedDepartments: JSON.stringify(departments),
        attendedDepartments: JSON.stringify([]),
        notes: [
          `Importado de Plan_Accion_Genba_Apodaca.xlsm (${first.day}).`,
          !actionable.length ? `Estado original: ${first.statusText}.` : "Asistencia no capturada en el libro fuente.",
          departments.length ? `Departamentos responsables: ${departments.join(", ")}.` : "",
        ].filter(Boolean).join(" "),
        status,
        coordinatorId,
        createdById: adminId,
        closedAt: status === "CERRADO" ? first.date : null,
      },
    });
    for (const [index, row] of actionable.entries()) {
      const hasPersonalOwner = isPersonalResponsible(row.responsible, row.department);
      const owner = hasPersonalOwner ? await importedUser(row.responsible, passwordHash) : null;
      if (!hasPersonalOwner) unassignedResponsibilities += 1;
      if (!row.dueDate) missingDueDates += 1;
      const itemStatus = workStatus(row.statusText);
      const evidence = /ver evidencia/i.test(row.evidence);
      if (evidence) evidenceReferences += 1;
      await prisma.genbaActivity.upsert({
        where: { walkId_number: { walkId: walk.id, number: index + 1 } },
        update: {},
        create: {
          walkId: walk.id,
          number: index + 1,
          problem: row.problem,
          action: row.department ? `Atender con ${row.department}.` : null,
          ownerId: owner?.id ?? null,
          dueDate: row.dueDate,
          status: itemStatus,
          completionNote: itemStatus === "COMPLETADA" ? [row.comments, evidence ? "Evidencia referenciada en el Excel; archivo pendiente de migrar." : ""].filter(Boolean).join(" ") : null,
          cancellationReason: itemStatus === "CANCELADA" ? [row.statusText, row.comments].filter(Boolean).join(" - ") : null,
          closedAt: itemStatus === "COMPLETADA" ? row.dueDate ?? first.date : null,
        },
      });
      const activity = await prisma.genbaActivity.findUniqueOrThrow({ where: { walkId_number: { walkId: walk.id, number: index + 1 } } });
      const update = [row.comments, row.responsible ? `Responsable Excel: ${row.responsible}.` : "", row.department ? `Departamento: ${row.department}.` : "", evidence ? "Referencia de evidencia presente en Excel." : ""].filter(Boolean).join(" ");
      if (update) {
        const existingUpdate = await prisma.genbaUpdate.findFirst({ where: { walkId: walk.id, activityId: activity.id, comment: update } });
        if (!existingUpdate) await prisma.genbaUpdate.create({ data: { walkId: walk.id, activityId: activity.id, comment: update } });
      }
      actionCount += 1;
    }
    const auditDetails = JSON.stringify({ source: sourcePath, number, sourceRows: sourceRows.map((row) => row.row), originalStatuses: [...new Set(sourceRows.map((row) => row.statusText))] });
    const existingAudit = await prisma.auditLog.findFirst({ where: { entity: "GenbaWalk", entityId: walk.id, action: "IMPORT_EXCEL_2026_GENBA", details: auditDetails } });
    if (!existingAudit) await prisma.auditLog.create({ data: { entity: "GenbaWalk", entityId: walk.id, action: "IMPORT_EXCEL_2026_GENBA", userId: adminId, details: auditDetails } });
  }
  // Las minutas del formato nuevo entran como recorridos propios. Su folio se ancla al
  // nombre de la hoja para que volver a correr el importador no las duplique, y su numero
  // continua la serie de la hoja Base.
  let minuteCount = 0;
  let minuteFindings = 0;
  if (minutesPath) {
    const minuteBook = await workbook(minutesPath);
    const minutas = parseGenbaMinutes(minuteBook);
    let siguiente = Math.max(0, ...[...groups.keys()]);
    for (const minuta of minutas.sort((left, right) => left.visitDate.getTime() - right.visitDate.getTime())) {
      const folio = `XLS-GENBA-MIN-${minuta.sheet}`;
      const existente = await prisma.genbaWalk.findUnique({ where: { folio }, select: { id: true, number: true } });
      siguiente = existente ? existente.number : siguiente + 1;
      const walk = await prisma.genbaWalk.upsert({
        where: { folio },
        update: {
          // La asistencia solo vive aqui, asi que se refresca en cada corrida: si alguien
          // corrige la minuta, el recorrido se entera.
          attendedDepartments: JSON.stringify(minuta.attendees),
          expectedDepartments: JSON.stringify([...minuta.attendees, ...minuta.absentees])
        },
        create: {
          number: siguiente,
          folio,
          areaName: minuta.lugar,
          visitDate: minuta.visitDate,
          expectedDepartments: JSON.stringify([...minuta.attendees, ...minuta.absentees]),
          attendedDepartments: JSON.stringify(minuta.attendees),
          notes: [
            `Importado de la minuta ${minuta.sheet} de Formatos.xlsx.`,
            minuta.tema ? `Tema: ${minuta.tema}.` : "",
            minuta.convocante ? `Convocante: ${minuta.convocante}.` : "",
            minuta.absentees.length ? `Ausentes: ${minuta.absentees.join(", ")}.` : ""
          ].filter(Boolean).join(" "),
          // Los hallazgos de una minuta nacen pendientes, asi que el recorrido nace abierto.
          status: "ABIERTO",
          coordinatorId,
          createdById: adminId
        }
      });
      minuteCount += 1;
      for (const [index, finding] of minuta.findings.entries()) {
        const owner = isPersonalResponsible(finding.responsible) ? await importedUser(finding.responsible, passwordHash) : null;
        if (!owner) unassignedResponsibilities += 1;
        if (!finding.dueDate) missingDueDates += 1;
        await prisma.genbaActivity.upsert({
          where: { walkId_number: { walkId: walk.id, number: index + 1 } },
          update: {},
          create: {
            walkId: walk.id,
            number: index + 1,
            problem: finding.problem,
            action: finding.action || null,
            ownerId: owner?.id ?? null,
            dueDate: finding.dueDate,
            status: "PENDIENTE"
          }
        });
        minuteFindings += 1;
        actionCount += 1;
      }
      await prisma.auditLog.create({
        data: { entity: "GenbaWalk", entityId: walk.id, action: "IMPORT_EXCEL_2026_GENBA_MINUTA", userId: adminId, details: JSON.stringify({ hoja: minuta.sheet, hallazgos: minuta.findings.length, asistentes: minuta.attendees.length }) }
      });
    }
  }

  return { minuteCount, minuteFindings, walkCount: groups.size, actionCount, evidenceReferences, unassignedResponsibilities, missingDueDates };
}

async function findOrgUnit(plantName: string, jobTitle: string) {
  const units = await prisma.orgUnit.findMany({ where: { active: true }, include: { plant: true } });
  const plant = normalize(plantName);
  const words = normalize(jobTitle).split(" ").filter((word) => word.length > 3);
  const plantUnits = units.filter((unit) => normalize(`${unit.plant.code} ${unit.plant.name}`).includes(plant));
  const ranked = plantUnits.map((unit) => ({ unit, score: words.filter((word) => normalize(unit.name).includes(word)).length })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].unit : plantUnits.find((unit) => unit.type === "MACROPROCESO") ?? plantUnits[0] ?? null;
}

async function main() {
  const options = args();
  const kaizenPath = options.get("kaizen");
  const genbaPath = options.get("genba");
  const minutesPath = options.get("minutas");
  // Los dos libros dejaron de actualizarse a la par: el de Kaizen se revisa cada mes y el
  // de GENBA no. Exigir ambos obligaba a volver a pasar un libro que no cambio, asi que
  // cada uno entra por su cuenta y lo que no se pasa simplemente no se toca.
  if (!kaizenPath && !genbaPath) {
    throw new Error("Uso: tsx scripts/import-excel-2026-preview.ts [--kaizen <xlsx>] [--genba <xlsm>] [--reset]");
  }
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", active: true }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("Se necesita una cuenta ADMIN activa para registrar la importacion.");
  if (options.get("reset") === "true") await resetPreviewData();
  const passwordHash = await bcrypt.hash(`import-preview-${Date.now()}`, 10);
  const previo = await prisma.setting.findUnique({ where: { key: "import2026PreviewReport" } });
  const anterior = previo?.value ? JSON.parse(previo.value) : null;
  // Lo que no se vuelve a pasar conserva el resultado de la corrida anterior, para que el
  // reporte de conciliacion siga completo en vez de vaciarse a la mitad.
  const kaizen = kaizenPath ? await importKaizen(kaizenPath, admin.id, passwordHash) : anterior?.kaizen ?? null;
  // El coordinador sale de Mejora Continua, que es el convocante que declaran las minutas.
  // Si esa cuenta no existe, el administrador queda como respaldo antes que fallar.
  const mejoraContinua = await prisma.user.findFirst({ where: { role: "MEJORA_CONTINUA", active: true }, orderBy: { createdAt: "asc" } });
  const genba = genbaPath ? await importGenba(genbaPath, admin.id, passwordHash, mejoraContinua?.id ?? admin.id, minutesPath) : anterior?.genba ?? null;
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "LOCAL_PREVIEW",
    sources: {
      kaizen: kaizenPath ?? anterior?.sources?.kaizen ?? null,
      genba: genbaPath ?? anterior?.sources?.genba ?? null,
    },
    kaizen,
    genba,
    pending: [
      { key: "KAIZEN_CONFLICT", count: kaizen?.conflicts.length ?? 0, message: "El Kaizen #034 tiene nombres competidores en el calendario; se conserva la opcion mejor respaldada, pendiente de confirmacion." },
      { key: "TWI", count: 48, message: "Evaluaciones TWI detectadas; requieren un modelo de evaluacion por entregable antes de importar." },
      { key: "EVIDENCE", count: genba?.evidenceReferences ?? 0, message: "Referencias de evidencia detectadas; los archivos incrustados deben conciliarse antes de publicarse." },
      { key: "GENBA_OWNER", count: genba?.unassignedResponsibilities ?? 0, message: "Acciones GENBA sin un responsable personal unico; deben conciliarse antes de activar recordatorios." },
      { key: "GENBA_DATE", count: genba?.missingDueDates ?? 0, message: "Acciones GENBA sin fecha compromiso; no se marcan como vencidas hasta completar la conciliacion." },
      { key: "GENBA_GAPS", count: 2, message: "Los numeros GENBA 025 y 035 aparecen en el plan visual, pero no tienen hallazgos en la hoja Base." },
    ],
  };
  await prisma.setting.upsert({ where: { key: "import2026PreviewReport" }, update: { value: JSON.stringify(report) }, create: { key: "import2026PreviewReport", value: JSON.stringify(report) } });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
