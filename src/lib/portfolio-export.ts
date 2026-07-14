import ExcelJS from "exceljs";
import {
  attendancePercent,
  genbaStatusLabels,
  kaizenStatusLabels,
  parseStringArray,
  workItemStatusLabels,
  workProgress
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const COLORS = {
  red: "EA0029",
  dark: "171717",
  gray: "64748B",
  line: "D8D8D8",
  panel: "F8FAFC",
  green: "14835F",
  greenSoft: "DCFCE7",
  amber: "A16207",
  amberSoft: "FEF3C7",
  blue: "176FC1",
  blueSoft: "DBEAFE",
  rose: "D32236",
  roseSoft: "FFE4E6",
  white: "FFFFFF"
};

type ColumnDefinition = { header: string; key: string; width: number };

function setupWorkbook(title: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PROpEx | Proboca";
  workbook.company = "Proboca";
  workbook.subject = title;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  return workbook;
}

function titleRows(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.mergeCells(2, 1, 2, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, color: { argb: COLORS.white }, size: 18 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.red } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 34;
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { color: { argb: COLORS.gray }, italic: true, size: 10 };
  subtitleCell.alignment = { vertical: "middle" };
  sheet.getRow(2).height = 24;
}

function createDataSheet(workbook: ExcelJS.Workbook, name: string, title: string, subtitle: string, columns: ColumnDefinition[]) {
  const sheet = workbook.addWorksheet(name, { properties: { defaultRowHeight: 20 } });
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  titleRows(sheet, title, subtitle, columns.length);
  columns.forEach((column, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.dark } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.red } } };
  });
  sheet.getRow(4).height = 30;
  sheet.views = [{ state: "frozen", ySplit: 4, showGridLines: false, zoomScale: 90 }];
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  sheet.headerFooter.oddFooter = "&LPROpEx | Proboca&C&P de &N&RGenerado &D";
  return sheet;
}

function statusFill(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("asisti")) return COLORS.greenSoft;
  if (normalized.includes("ausente")) return COLORS.roseSoft;
  if (normalized.includes("complet") || normalized.includes("cerrad")) return COLORS.greenSoft;
  if (normalized.includes("bloque") || normalized.includes("vencid") || normalized.includes("cancel")) return COLORS.roseSoft;
  if (normalized.includes("curso") || normalized.includes("proceso") || normalized.includes("planific")) return COLORS.blueSoft;
  return COLORS.amberSoft;
}

function finalizeDataSheet(sheet: ExcelJS.Worksheet, statusKeys: string[] = []) {
  for (let rowIndex = 5; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.height = 34;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.line } } };
      if (rowIndex % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.panel } };
    });
  }
  statusKeys.forEach((key) => {
    const column = sheet.getColumn(key);
    for (let rowIndex = 5; rowIndex <= sheet.rowCount; rowIndex += 1) {
      const cell = sheet.getCell(rowIndex, column.number);
      const value = String(cell.value ?? "");
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill(value) } };
      cell.font = { bold: true, color: { argb: COLORS.dark } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
  });
}

function addSummaryMetric(sheet: ExcelJS.Worksheet, columnStart: number, rowStart: number, label: string, value: string | number, tone: string) {
  sheet.mergeCells(rowStart, columnStart, rowStart, columnStart + 1);
  sheet.mergeCells(rowStart + 1, columnStart, rowStart + 2, columnStart + 1);
  const labelCell = sheet.getCell(rowStart, columnStart);
  labelCell.value = label;
  labelCell.font = { bold: true, color: { argb: COLORS.gray }, size: 9 };
  labelCell.alignment = { vertical: "middle", horizontal: "center" };
  labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.panel } };
  const valueCell = sheet.getCell(rowStart + 1, columnStart);
  valueCell.value = value;
  valueCell.font = { bold: true, color: { argb: COLORS.dark }, size: 19 };
  valueCell.alignment = { vertical: "middle", horizontal: "center" };
  valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tone } };
  for (let row = rowStart; row <= rowStart + 2; row += 1) {
    for (let column = columnStart; column <= columnStart + 1; column += 1) {
      sheet.getCell(row, column).border = {
        top: { style: "thin", color: { argb: COLORS.line } },
        left: { style: "thin", color: { argb: COLORS.line } },
        bottom: { style: "thin", color: { argb: COLORS.line } },
        right: { style: "thin", color: { argb: COLORS.line } }
      };
    }
  }
}

function createSummarySheet(workbook: ExcelJS.Workbook, title: string, subtitle: string) {
  const sheet = workbook.addWorksheet("Resumen", { properties: { defaultRowHeight: 22 } });
  sheet.columns = Array.from({ length: 8 }, () => ({ width: 16 }));
  titleRows(sheet, title, subtitle, 8);
  sheet.views = [{ showGridLines: false, zoomScale: 95 }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
  return sheet;
}

function plannedProgress(startDate: Date, endDate: Date, now: Date) {
  if (now <= startDate) return 0;
  if (now >= endDate || endDate <= startDate) return 100;
  return Math.round(((now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100);
}

function isOverdue(item: { dueDate: Date | null; status: string }, now: Date) {
  return Boolean(item.dueDate && item.dueDate < now && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(item.status));
}

export async function buildKaizenWorkbook() {
  const workbook = setupWorkbook("Concentrado de Proyectos Kaizen");
  const now = new Date();
  const projects = await prisma.kaizenProject.findMany({
    include: {
      leader: true,
      sourceIdea: true,
      attachments: true,
      activities: { include: { owner: true, sourceGenbaActivity: { include: { walk: true } } }, orderBy: { number: "asc" } },
      updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" } }
    },
    orderBy: { number: "asc" }
  });
  const activities = projects.flatMap((project) => project.activities.filter((activity) => activity.status !== "COMBINADA").map((activity) => ({ project, activity })));
  const progress = workProgress(activities.map(({ activity }) => activity));
  const active = projects.filter((project) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status)).length;
  const completed = projects.filter((project) => project.status === "COMPLETADO").length;
  const overdue = activities.filter(({ activity }) => isOverdue(activity, now)).length;
  const estimated = projects.reduce((sum, project) => sum + (project.estimatedSavings ?? 0), 0);
  const real = projects.reduce((sum, project) => sum + (project.realSavings ?? 0), 0);

  const summary = createSummarySheet(workbook, "CONCENTRADO DE PROYECTOS KAIZEN", `Corte al ${now.toLocaleDateString("es-MX")} · Información sincronizada con PROpEx`);
  addSummaryMetric(summary, 1, 4, "PROYECTOS", projects.length, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 4, "ACTIVOS", active, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 4, "COMPLETADOS", completed, COLORS.greenSoft);
  addSummaryMetric(summary, 7, 4, "AVANCE GLOBAL", `${progress.percent}%`, COLORS.greenSoft);
  addSummaryMetric(summary, 1, 9, "ACTIVIDADES", progress.total, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 9, "VENCIDAS", overdue, overdue ? COLORS.roseSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 5, 9, "AHORRO ESTIMADO", estimated, COLORS.amberSoft);
  addSummaryMetric(summary, 7, 9, "AHORRO REAL", real, COLORS.greenSoft);
  summary.getCell("E10").numFmt = "$#,##0;[Red]-$#,##0";
  summary.getCell("G10").numFmt = "$#,##0;[Red]-$#,##0";
  summary.mergeCells("A14:H14");
  summary.getCell("A14").value = "El archivo incluye una fila por proyecto, una fila por actividad y la bitácora completa. Usa los filtros de cada hoja para concentrar planta, área, líder, estado o fechas.";
  summary.getCell("A14").alignment = { wrapText: true, vertical: "middle" };
  summary.getCell("A14").font = { color: { argb: COLORS.gray }, italic: true, size: 10 };
  summary.getRow(14).height = 42;

  const projectSheet = createDataSheet(workbook, "Proyectos", "PORTAFOLIO KAIZEN", "Una fila por proyecto con salud, beneficios y trazabilidad.", [
    { header: "Folio", key: "folio", width: 18 }, { header: "Proyecto", key: "title", width: 34 }, { header: "Planta", key: "plant", width: 16 }, { header: "Área", key: "area", width: 22 }, { header: "Líder", key: "leader", width: 24 }, { header: "Estatus", key: "status", width: 22 }, { header: "Inicio", key: "startDate", width: 14 }, { header: "Cierre objetivo", key: "endDate", width: 16 }, { header: "Avance real", key: "progress", width: 14 }, { header: "Avance planeado", key: "planned", width: 16 }, { header: "Brecha", key: "gap", width: 12 }, { header: "Actividades", key: "activities", width: 12 }, { header: "Vencidas", key: "overdue", width: 11 }, { header: "Bloqueadas", key: "blocked", width: 12 }, { header: "Línea base", key: "baseline", width: 13 }, { header: "Meta", key: "target", width: 12 }, { header: "Valor actual", key: "current", width: 13 }, { header: "Unidad", key: "unit", width: 12 }, { header: "Ahorro estimado", key: "estimated", width: 17 }, { header: "Ahorro real", key: "real", width: 16 }, { header: "Idea de origen", key: "sourceIdea", width: 17 }, { header: "Project Charter", key: "charter", width: 16 }, { header: "Objetivo", key: "objective", width: 42 }
  ]);
  projects.forEach((project) => {
    const relevant = project.activities.filter((activity) => activity.status !== "COMBINADA");
    const projectProgress = workProgress(relevant);
    const planned = plannedProgress(project.startDate, project.endDate, now);
    projectSheet.addRow({ folio: project.folio, title: project.title, plant: project.plant ?? "", area: project.area, leader: project.leader.name, status: kaizenStatusLabels[project.status], startDate: project.startDate, endDate: project.endDate, progress: projectProgress.percent / 100, planned: planned / 100, gap: (projectProgress.percent - planned) / 100, activities: relevant.length, overdue: relevant.filter((activity) => isOverdue(activity, now)).length, blocked: relevant.filter((activity) => activity.status === "BLOQUEADA").length, baseline: project.baselineValue ?? "", target: project.targetValue ?? "", current: project.currentValue ?? "", unit: project.unit ?? "", estimated: project.estimatedSavings ?? 0, real: project.realSavings ?? 0, sourceIdea: project.sourceIdea?.folio ?? "", charter: project.attachments.some((attachment) => attachment.type === "CHARTER") ? "Sí" : "Pendiente", objective: project.objective });
  });
  ["startDate", "endDate"].forEach((key) => { projectSheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  ["progress", "planned", "gap"].forEach((key) => { projectSheet.getColumn(key).numFmt = "0%"; });
  ["estimated", "real"].forEach((key) => { projectSheet.getColumn(key).numFmt = "$#,##0;[Red]-$#,##0"; });
  finalizeDataSheet(projectSheet, ["status"]);

  const activitySheet = createDataSheet(workbook, "Actividades", "PLAN DE ACCIÓN KAIZEN", "Concentrado operativo de todas las actividades del portafolio.", [
    { header: "Kaizen", key: "folio", width: 18 }, { header: "Proyecto", key: "project", width: 30 }, { header: "#", key: "number", width: 7 }, { header: "Problemática", key: "problem", width: 34 }, { header: "Acción", key: "action", width: 42 }, { header: "Responsable", key: "owner", width: 24 }, { header: "Estatus", key: "status", width: 20 }, { header: "Inicio", key: "startDate", width: 14 }, { header: "Compromiso", key: "dueDate", width: 14 }, { header: "Cierre", key: "closedAt", width: 14 }, { header: "Días vencida", key: "overdueDays", width: 13 }, { header: "Resultado", key: "completion", width: 36 }, { header: "Justificación", key: "cancellation", width: 36 }, { header: "Origen GENBA", key: "sourceGenba", width: 20 }
  ]);
  activities.forEach(({ project, activity }) => activitySheet.addRow({ folio: project.folio, project: project.title, number: activity.number, problem: activity.problem ?? "", action: activity.action, owner: activity.owner?.name ?? "Sin asignar", status: workItemStatusLabels[activity.status], startDate: activity.startDate ?? null, dueDate: activity.dueDate ?? null, closedAt: activity.closedAt ?? null, overdueDays: isOverdue(activity, now) && activity.dueDate ? Math.floor((now.getTime() - activity.dueDate.getTime()) / 86_400_000) : 0, completion: activity.completionNote ?? "", cancellation: activity.cancellationReason ?? "", sourceGenba: activity.sourceGenbaActivity?.walk.folio ?? "" }));
  ["startDate", "dueDate", "closedAt"].forEach((key) => { activitySheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  finalizeDataSheet(activitySheet, ["status"]);

  const updateSheet = createDataSheet(workbook, "Bitácora", "BITÁCORA KAIZEN", "Comentarios y acuerdos registrados en los proyectos.", [
    { header: "Kaizen", key: "folio", width: 18 }, { header: "Proyecto", key: "project", width: 30 }, { header: "Actividad", key: "activity", width: 12 }, { header: "Usuario", key: "user", width: 24 }, { header: "Comentario", key: "comment", width: 62 }, { header: "Fecha", key: "createdAt", width: 20 }
  ]);
  projects.flatMap((project) => project.updates.map((update) => updateSheet.addRow({ folio: project.folio, project: project.title, activity: update.activity ? `#${update.activity.number}` : "Proyecto", user: update.user?.name ?? "Sistema", comment: update.comment, createdAt: update.createdAt })));
  updateSheet.getColumn("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  finalizeDataSheet(updateSheet);
  return workbook;
}

export async function buildGenbaWorkbook() {
  const workbook = setupWorkbook("Concentrado de Recorridos GENBA");
  const now = new Date();
  const walks = await prisma.genbaWalk.findMany({
    include: {
      coordinator: true,
      activities: { include: { owner: true, attachments: true, promotedKaizenActivity: { include: { project: true } } }, orderBy: { number: "asc" } },
      updates: { include: { user: true, activity: true }, orderBy: { createdAt: "desc" } }
    },
    orderBy: { visitDate: "desc" }
  });
  const activities = walks.flatMap((walk) => walk.activities.filter((activity) => activity.status !== "COMBINADA").map((activity) => ({ walk, activity })));
  const progress = workProgress(activities.map(({ activity }) => activity));
  const openWalks = walks.filter((walk) => walk.status === "ABIERTO").length;
  const overdue = activities.filter(({ activity }) => isOverdue(activity, now)).length;
  const averageAttendance = walks.length ? Math.round(walks.reduce((sum, walk) => sum + attendancePercent(walk.expectedDepartments, walk.attendedDepartments), 0) / walks.length) : 0;
  const promoted = activities.filter(({ activity }) => activity.promotedKaizenActivity).length;

  const summary = createSummarySheet(workbook, "CONCENTRADO DE RECORRIDOS GENBA", `Corte al ${now.toLocaleDateString("es-MX")} · Información sincronizada con PROpEx`);
  addSummaryMetric(summary, 1, 4, "RECORRIDOS", walks.length, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 4, "ABIERTOS", openWalks, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 4, "ASISTENCIA", `${averageAttendance}%`, COLORS.blueSoft);
  addSummaryMetric(summary, 7, 4, "CIERRE", `${progress.percent}%`, COLORS.greenSoft);
  addSummaryMetric(summary, 1, 9, "ACTIVIDADES", progress.total, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 9, "ABIERTAS", progress.open, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 9, "VENCIDAS", overdue, overdue ? COLORS.roseSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 7, 9, "PROMOVIDAS A KAIZEN", promoted, COLORS.greenSoft);
  summary.mergeCells("A14:H14");
  summary.getCell("A14").value = "El archivo incluye una fila por recorrido, todas las actividades agrupadas por GENBA, la asistencia departamental y la bitácora. Usa los filtros para preparar el concentrado requerido.";
  summary.getCell("A14").alignment = { wrapText: true, vertical: "middle" };
  summary.getCell("A14").font = { color: { argb: COLORS.gray }, italic: true, size: 10 };
  summary.getRow(14).height = 42;

  const walkSheet = createDataSheet(workbook, "Recorridos", "RECORRIDOS GENBA", "Una fila por recorrido con asistencia, avance y riesgos.", [
    { header: "Folio", key: "folio", width: 20 }, { header: "Área visitada", key: "area", width: 24 }, { header: "Fecha", key: "visitDate", width: 14 }, { header: "Coordinador", key: "coordinator", width: 24 }, { header: "Estatus", key: "status", width: 16 }, { header: "Esperados", key: "expected", width: 12 }, { header: "Asistieron", key: "attended", width: 12 }, { header: "Asistencia", key: "attendance", width: 13 }, { header: "Actividades", key: "activities", width: 12 }, { header: "Realizadas", key: "closed", width: 12 }, { header: "Abiertas", key: "open", width: 11 }, { header: "Avance", key: "progress", width: 12 }, { header: "Vencidas", key: "overdue", width: 11 }, { header: "Bloqueadas", key: "blocked", width: 12 }, { header: "Notas", key: "notes", width: 46 }
  ]);
  walks.forEach((walk) => {
    const expected = parseStringArray(walk.expectedDepartments);
    const attended = parseStringArray(walk.attendedDepartments);
    const relevant = walk.activities.filter((activity) => activity.status !== "COMBINADA");
    const walkProgress = workProgress(relevant);
    walkSheet.addRow({ folio: walk.folio, area: walk.areaName, visitDate: walk.visitDate, coordinator: walk.coordinator.name, status: genbaStatusLabels[walk.status], expected: expected.length, attended: attended.length, attendance: attendancePercent(walk.expectedDepartments, walk.attendedDepartments) / 100, activities: walkProgress.total, closed: walkProgress.closed, open: walkProgress.open, progress: walkProgress.percent / 100, overdue: relevant.filter((activity) => isOverdue(activity, now)).length, blocked: relevant.filter((activity) => activity.status === "BLOQUEADA").length, notes: walk.notes ?? "" });
  });
  walkSheet.getColumn("visitDate").numFmt = "dd/mm/yyyy";
  ["attendance", "progress"].forEach((key) => { walkSheet.getColumn(key).numFmt = "0%"; });
  finalizeDataSheet(walkSheet, ["status"]);

  const activitySheet = createDataSheet(workbook, "Actividades", "PLAN DE ACCIÓN GENBA", "Todas las actividades agrupables por folio, área, responsable y estado.", [
    { header: "GENBA", key: "folio", width: 20 }, { header: "Área", key: "area", width: 22 }, { header: "Fecha recorrido", key: "visitDate", width: 16 }, { header: "#", key: "number", width: 7 }, { header: "Problemática", key: "problem", width: 38 }, { header: "Acción", key: "action", width: 40 }, { header: "Responsable", key: "owner", width: 24 }, { header: "Compromiso", key: "dueDate", width: 14 }, { header: "Estatus", key: "status", width: 20 }, { header: "Cierre", key: "closedAt", width: 14 }, { header: "Días vencida", key: "overdueDays", width: 13 }, { header: "Evidencias", key: "evidence", width: 11 }, { header: "Resultado", key: "completion", width: 34 }, { header: "Justificación", key: "cancellation", width: 34 }, { header: "Kaizen relacionado", key: "kaizen", width: 20 }
  ]);
  activities.forEach(({ walk, activity }) => activitySheet.addRow({ folio: walk.folio, area: walk.areaName, visitDate: walk.visitDate, number: activity.number, problem: activity.problem, action: activity.action ?? "", owner: activity.owner?.name ?? "Sin asignar", dueDate: activity.dueDate ?? null, status: workItemStatusLabels[activity.status], closedAt: activity.closedAt ?? null, overdueDays: isOverdue(activity, now) && activity.dueDate ? Math.floor((now.getTime() - activity.dueDate.getTime()) / 86_400_000) : 0, evidence: activity.attachments.length, completion: activity.completionNote ?? "", cancellation: activity.cancellationReason ?? "", kaizen: activity.promotedKaizenActivity?.project.folio ?? "" }));
  ["visitDate", "dueDate", "closedAt"].forEach((key) => { activitySheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  finalizeDataSheet(activitySheet, ["status"]);

  const attendanceSheet = createDataSheet(workbook, "Asistencia", "ASISTENCIA GENBA", "Detalle de participación esperada y real por departamento.", [
    { header: "GENBA", key: "folio", width: 20 }, { header: "Área", key: "area", width: 24 }, { header: "Fecha", key: "visitDate", width: 14 }, { header: "Departamento", key: "department", width: 28 }, { header: "Esperado", key: "expected", width: 13 }, { header: "Asistió", key: "attended", width: 13 }, { header: "Resultado", key: "result", width: 16 }
  ]);
  walks.forEach((walk) => {
    const expected = new Set(parseStringArray(walk.expectedDepartments));
    const attended = new Set(parseStringArray(walk.attendedDepartments));
    [...new Set([...expected, ...attended])].sort().forEach((department) => attendanceSheet.addRow({ folio: walk.folio, area: walk.areaName, visitDate: walk.visitDate, department, expected: expected.has(department) ? "Sí" : "No", attended: attended.has(department) ? "Sí" : "No", result: attended.has(department) ? "Asistió" : "Ausente" }));
  });
  attendanceSheet.getColumn("visitDate").numFmt = "dd/mm/yyyy";
  finalizeDataSheet(attendanceSheet, ["result"]);

  const updateSheet = createDataSheet(workbook, "Bitácora", "BITÁCORA GENBA", "Seguimientos y acuerdos registrados en los recorridos.", [
    { header: "GENBA", key: "folio", width: 20 }, { header: "Área", key: "area", width: 24 }, { header: "Actividad", key: "activity", width: 12 }, { header: "Usuario", key: "user", width: 24 }, { header: "Comentario", key: "comment", width: 62 }, { header: "Fecha", key: "createdAt", width: 20 }
  ]);
  walks.flatMap((walk) => walk.updates.map((update) => updateSheet.addRow({ folio: walk.folio, area: walk.areaName, activity: update.activity ? `#${update.activity.number}` : "Recorrido", user: update.user?.name ?? "Sistema", comment: update.comment, createdAt: update.createdAt })));
  updateSheet.getColumn("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  finalizeDataSheet(updateSheet);
  return workbook;
}
