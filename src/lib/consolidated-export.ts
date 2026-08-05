import {
  approvalStatusLabels,
  approvalTypeLabels,
  attendancePercent,
  classificationLabels,
  genbaStatusLabels,
  ideaCategoryLabels,
  kaizenStatusLabels,
  parseImpactTypes,
  parseStringArray,
  priorityLabels,
  roleLabels,
  statusLabels,
  workItemStatusLabels,
  workProgress
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import {
  WORKBOOK_COLORS as COLORS,
  addSummaryMetric,
  createDataSheet,
  createSummarySheet,
  finalizeDataSheet,
  setupWorkbook
} from "@/lib/workbook-style";

const CLOSED_IDEA_STATUSES = new Set(["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"]);
const CLOSED_WORK_STATUSES = new Set(["COMPLETADA", "CANCELADA", "COMBINADA"]);

const trainingStatusLabels: Record<string, string> = {
  REGISTERED: "Registrado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado"
};

const coinTypeLabels: Record<string, string> = {
  AWARD: "Otorgamiento",
  ADJUSTMENT: "Ajuste",
  REDEMPTION: "Canje"
};

const coinSourceLabels: Record<string, string> = {
  IDEA: "Idea de mejora",
  KAIZEN: "Kaizen",
  GENBA: "GENBA",
  TRAINING: "Entrenamiento",
  MANUAL: "Manual"
};

const decisionLabels: Record<string, string> = {
  APROBAR: "Aprobada",
  RECHAZAR: "Rechazada",
  SOLICITAR_INFORMACION: "Solicita informacion"
};

const orgTypeLabels: Record<string, string> = {
  MACROPROCESO: "Macroproceso",
  DEPARTAMENTO: "Departamento",
  AREA: "Area",
  PROCESO: "Proceso"
};

function isIdeaOverdue(idea: { dueDate: Date | null; status: string }, now: Date) {
  return Boolean(idea.dueDate && idea.dueDate < now && !CLOSED_IDEA_STATUSES.has(idea.status));
}

function isWorkOverdue(item: { dueDate: Date | null; status: string }, now: Date) {
  return Boolean(item.dueDate && item.dueDate < now && !CLOSED_WORK_STATUSES.has(item.status));
}

function daysOverdue(dueDate: Date | null, status: string, now: Date) {
  if (!dueDate || !isWorkOverdue({ dueDate, status }, now)) return 0;
  return Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000));
}

function formatList(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value?.trim())).join(" | ");
}

function addEmptyState(sheet: ReturnType<typeof createDataSheet>) {
  if (sheet.rowCount > 4) return;
  sheet.mergeCells(5, 1, 5, Math.max(1, sheet.columnCount));
  const cell = sheet.getCell(5, 1);
  cell.value = "Sin registros al momento del corte";
  cell.font = { italic: true, color: { argb: COLORS.gray } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.panel } };
  sheet.getRow(5).height = 34;
}

function formatDateColumns(sheet: ReturnType<typeof createDataSheet>, keys: string[], includeTime = false) {
  keys.forEach((key) => {
    sheet.getColumn(key).numFmt = includeTime ? "dd/mm/yyyy hh:mm" : "dd/mm/yyyy";
  });
}

function styleSummarySection(
  sheet: ReturnType<typeof createSummarySheet>,
  startRow: number,
  title: string,
  headers: string[]
) {
  sheet.mergeCells(startRow, 1, startRow, 8);
  const titleCell = sheet.getCell(startRow, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, color: { argb: COLORS.white }, size: 11 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.dark } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(startRow).height = 25;

  headers.forEach((header, index) => {
    const cell = sheet.getCell(startRow + 1, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: COLORS.gray }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.panel } };
    cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function styleSummaryRows(sheet: ReturnType<typeof createSummarySheet>, from: number, to: number) {
  for (let rowIndex = from; rowIndex <= to; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.height = 29;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.line } } };
      if (rowIndex % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.panel } };
      }
    });
  }
}

export async function buildConsolidatedWorkbook() {
  const now = new Date();
  const workbook = setupWorkbook("Concentrado Ejecutivo PROpEx");

  const [ideas, kaizenProjects, genbaWalks, trainingPrograms, coinTransactions, participants, users, orgUnits] = await Promise.all([
    prisma.idea.findMany({
      include: {
        area: { include: { organizationUnit: { include: { plant: true, parent: true } } } },
        supervisor: true,
        implementationOwner: true,
        participant: true,
        escalationRule: { include: { reviewerMembership: { include: { user: true } } } },
        approvals: { include: { assignedTo: true }, orderBy: { type: "asc" } },
        supportRequests: { include: { orgUnit: true, assignedTo: true }, orderBy: { createdAt: "asc" } },
        followers: { include: { user: true }, orderBy: { createdAt: "asc" } },
        kaizenProject: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.kaizenProject.findMany({
      include: {
        leader: true,
        sourceIdea: true,
        orgUnit: { include: { plant: true, parent: true } },
        attachments: true,
        activities: {
          include: { owner: true, sourceGenbaActivity: { include: { walk: true } }, attachments: true },
          orderBy: { number: "asc" }
        }
      },
      orderBy: { number: "asc" }
    }),
    prisma.genbaWalk.findMany({
      include: {
        coordinator: true,
        orgUnit: { include: { plant: true, parent: true } },
        activities: {
          include: { owner: true, attachments: true, promotedKaizenActivity: { include: { project: true } } },
          orderBy: { number: "asc" }
        }
      },
      orderBy: { visitDate: "desc" }
    }),
    prisma.trainingProgram.findMany({
      include: {
        createdBy: true,
        sessions: {
          include: {
            plant: true,
            orgUnit: true,
            createdBy: true,
            enrollments: { include: { participant: true }, orderBy: { participant: { name: "asc" } } }
          },
          orderBy: { sessionDate: "desc" }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.coinTransaction.findMany({
      include: { participant: { include: { orgUnit: { include: { plant: true } }, user: true } }, createdBy: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.participant.findMany({
      include: {
        user: true,
        orgUnit: { include: { plant: true } },
        ideas: { select: { id: true } },
        enrollments: { include: { session: { include: { program: true } } } },
        coinTransactions: true
      },
      orderBy: { name: "asc" }
    }),
    prisma.user.findMany({
      include: {
        participant: true,
        orgMemberships: {
          include: {
            orgUnit: { include: { plant: true } },
            managerMembership: { include: { user: true } }
          },
          orderBy: [{ active: "desc" }, { level: "asc" }]
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.orgUnit.findMany({
      include: {
        plant: true,
        parent: true,
        routingUser: true,
        memberships: { include: { user: true }, orderBy: [{ level: "asc" }, { sortOrder: "asc" }] },
        escalationRules: {
          include: { reviewerMembership: { include: { user: true } } },
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: [{ plant: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  const kaizenActivities = kaizenProjects.flatMap((project) =>
    project.activities.map((activity) => ({ project, activity }))
  );
  const relevantKaizenActivities = kaizenActivities.filter(({ activity }) => activity.status !== "COMBINADA");
  const genbaActivities = genbaWalks.flatMap((walk) => walk.activities.map((activity) => ({ walk, activity })));
  const relevantGenbaActivities = genbaActivities.filter(({ activity }) => activity.status !== "COMBINADA");
  const trainingSessions = trainingPrograms.flatMap((program) => program.sessions.map((session) => ({ program, session })));
  const enrollments = trainingSessions.flatMap(({ program, session }) =>
    session.enrollments.map((enrollment) => ({ program, session, enrollment }))
  );

  const openIdeas = ideas.filter((idea) => !CLOSED_IDEA_STATUSES.has(idea.status));
  const overdueIdeas = ideas.filter((idea) => isIdeaOverdue(idea, now));
  const activeKaizens = kaizenProjects.filter((project) => ["PENDIENTE_CHARTER", "PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status));
  const openGenbas = genbaWalks.filter((walk) => walk.status === "ABIERTO");
  const overdueKaizenActivities = relevantKaizenActivities.filter(({ activity }) => isWorkOverdue(activity, now));
  const overdueGenbaActivities = relevantGenbaActivities.filter(({ activity }) => isWorkOverdue(activity, now));
  const completedTrainings = enrollments.filter(({ enrollment }) => enrollment.status === "COMPLETED");
  const coinBalance = coinTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const peopleCount = participants.length + users.filter((user) => !user.participant).length;
  const totalOverdue = overdueIdeas.length + overdueKaizenActivities.length + overdueGenbaActivities.length;

  const summary = createSummarySheet(
    workbook,
    "PANORAMA EJECUTIVO PROpEx",
    `Corte al ${now.toLocaleDateString("es-MX")} | Datos reales de Ideas, Kaizen, GENBA, Entrenamientos y ProbocaCoins`
  );
  addSummaryMetric(summary, 1, 4, "IDEAS", ideas.length, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 4, "IDEAS ABIERTAS", openIdeas.length, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 4, "KAIZEN ACTIVOS", activeKaizens.length, COLORS.blueSoft);
  addSummaryMetric(summary, 7, 4, "GENBA ABIERTOS", openGenbas.length, COLORS.amberSoft);
  addSummaryMetric(summary, 1, 9, "ENTRENAMIENTOS COMPLETADOS", completedTrainings.length, COLORS.greenSoft);
  addSummaryMetric(summary, 3, 9, "SALDO PROBOCACOINS", coinBalance, coinBalance < 0 ? COLORS.roseSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 5, 9, "COMPROMISOS VENCIDOS", totalOverdue, totalOverdue ? COLORS.roseSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 7, 9, "PERSONAS", peopleCount, COLORS.blueSoft);

  styleSummarySection(summary, 14, "DESEMPENO INTEGRADO", ["Modulo", "Total", "Activos", "Cerrados", "Avance", "Vencidos", "Bloqueados", "Resultado clave"]);
  const ideaClosed = ideas.filter((idea) => idea.status === "CERRADA").length;
  const kaizenProgress = workProgress(relevantKaizenActivities.map(({ activity }) => activity));
  const genbaProgress = workProgress(relevantGenbaActivities.map(({ activity }) => activity));
  const moduleRows: Array<Array<string | number>> = [
    ["Ideas", ideas.length, openIdeas.length, ideaClosed, ideas.length ? `${Math.round((ideaClosed / ideas.length) * 100)}%` : "0%", overdueIdeas.length, 0, `${ideas.reduce((sum, idea) => sum + idea.pointsAssigned, 0)} ProbocaCoins`],
    ["Kaizen", kaizenProjects.length, activeKaizens.length, kaizenProjects.filter((project) => project.status === "COMPLETADO").length, `${kaizenProgress.percent}%`, overdueKaizenActivities.length, relevantKaizenActivities.filter(({ activity }) => activity.status === "BLOQUEADA").length, `$${kaizenProjects.reduce((sum, project) => sum + (project.realSavings ?? 0), 0).toLocaleString("es-MX")}`],
    ["GENBA", genbaWalks.length, openGenbas.length, genbaWalks.filter((walk) => walk.status === "CERRADO").length, `${genbaProgress.percent}%`, overdueGenbaActivities.length, relevantGenbaActivities.filter(({ activity }) => activity.status === "BLOQUEADA").length, `${relevantGenbaActivities.filter(({ activity }) => activity.promotedKaizenActivity).length} acciones a Kaizen`],
    ["Entrenamientos", trainingSessions.length, enrollments.filter(({ enrollment }) => enrollment.status === "REGISTERED").length, completedTrainings.length, enrollments.length ? `${Math.round((completedTrainings.length / enrollments.length) * 100)}%` : "0%", 0, 0, `${completedTrainings.reduce((sum, { enrollment }) => sum + enrollment.coinsAwarded, 0)} ProbocaCoins`],
    ["ProbocaCoins", coinTransactions.length, participants.filter((participant) => participant.coinTransactions.length > 0).length, coinTransactions.filter((transaction) => transaction.type === "REDEMPTION").length, "-", 0, 0, `${coinBalance} saldo neto`]
  ];
  moduleRows.forEach((values, offset) => values.forEach((value, column) => { summary.getCell(16 + offset, column + 1).value = value; }));
  styleSummaryRows(summary, 16, 20);

  styleSummarySection(summary, 22, "ALERTAS OPERATIVAS", ["Prioridad", "Frente", "Situacion", "Cantidad", "Siguiente revision", "", "", ""]);
  const pendingIdeaReviews = ideas.filter((idea) => ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"].includes(idea.status)).length;
  const pastTrainingEnrollments = enrollments.filter(({ session, enrollment }) => session.sessionDate < now && enrollment.status === "REGISTERED").length;
  const alertRows = [
    { priority: overdueIdeas.length ? "Alta" : "Controlada", front: "Ideas", situation: "Compromisos vencidos", count: overdueIdeas.length, action: "Revisar responsables y fechas" },
    { priority: pendingIdeaReviews ? "Media" : "Controlada", front: "Ideas", situation: "Pendientes de revision inicial", count: pendingIdeaReviews, action: "Atender bandeja de validacion" },
    { priority: overdueKaizenActivities.length ? "Alta" : "Controlada", front: "Kaizen", situation: "Actividades vencidas", count: overdueKaizenActivities.length, action: "Escalar con lideres de proyecto" },
    { priority: overdueGenbaActivities.length ? "Alta" : "Controlada", front: "GENBA", situation: "Actividades vencidas", count: overdueGenbaActivities.length, action: "Revisar compromisos del recorrido" },
    { priority: pastTrainingEnrollments ? "Media" : "Controlada", front: "Entrenamientos", situation: "Asistentes por cerrar en sesiones pasadas", count: pastTrainingEnrollments, action: "Confirmar cumplimiento o cancelacion" }
  ];
  alertRows.forEach((alert, offset) => {
    const row = 24 + offset;
    summary.getCell(row, 1).value = alert.priority;
    summary.getCell(row, 2).value = alert.front;
    summary.mergeCells(row, 3, row, 4);
    summary.getCell(row, 3).value = alert.situation;
    summary.getCell(row, 5).value = alert.count;
    summary.mergeCells(row, 6, row, 8);
    summary.getCell(row, 6).value = alert.action;
    summary.getCell(row, 1).font = { bold: true, color: { argb: alert.priority === "Alta" ? COLORS.rose : alert.priority === "Media" ? COLORS.amber : COLORS.green } };
  });
  styleSummaryRows(summary, 24, 28);
  summary.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 };

  const ideasSheet = createDataSheet(workbook, "Ideas", "IDEAS DE MEJORA", "Base maestra con origen, escalamiento, validaciones, responsable, avance y enlace a Kaizen.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Registro", key: "createdAt", width: 18 },
    { header: "Planta", key: "plant", width: 16 },
    { header: "Departamento", key: "department", width: 24 },
    { header: "Area", key: "area", width: 24 },
    { header: "Categoria", key: "category", width: 30 },
    { header: "Colaborador", key: "collaborator", width: 26 },
    { header: "Correo", key: "email", width: 30 },
    { header: "Empleado", key: "employee", width: 15 },
    { header: "Puesto / nivel", key: "position", width: 24 },
    { header: "Turno", key: "shift", width: 16 },
    { header: "Problema", key: "problem", width: 42 },
    { header: "Propuesta", key: "proposal", width: 42 },
    { header: "Beneficio esperado", key: "benefit", width: 36 },
    { header: "Impactos", key: "impacts", width: 30 },
    { header: "Jefe / revisor", key: "supervisor", width: 26 },
    { header: "Regla de escalamiento", key: "escalation", width: 30 },
    { header: "Validaciones", key: "approvals", width: 52 },
    { header: "Apoyos adicionales", key: "support", width: 52 },
    { header: "Seguimiento compartido", key: "followers", width: 38 },
    { header: "Estatus", key: "status", width: 28 },
    { header: "Prioridad", key: "priority", width: 14 },
    { header: "Clasificacion", key: "classification", width: 28 },
    { header: "Responsable", key: "owner", width: 26 },
    { header: "Compromiso", key: "dueDate", width: 16 },
    { header: "Dias vencida", key: "overdueDays", width: 14 },
    { header: "Implementada", key: "implementedAt", width: 16 },
    { header: "Cerrada", key: "closedAt", width: 16 },
    { header: "ProbocaCoins", key: "coins", width: 16 },
    { header: "Kaizen relacionado", key: "kaizen", width: 20 },
    { header: "Comentario MC", key: "comments", width: 42 }
  ]);
  ideas.forEach((idea) => {
    const orgUnit = idea.area.organizationUnit;
    const approvalSummary = idea.approvals.map((approval) =>
      `${approvalTypeLabels[approval.type]}: ${approvalStatusLabels[approval.status]}${approval.assignedTo ? ` - ${approval.assignedTo.name}` : ""}${approval.decision ? ` (${decisionLabels[approval.decision] ?? approval.decision})` : ""}`
    );
    const supportSummary = idea.supportRequests.map((request) =>
      `${request.orgUnit.name}: ${approvalStatusLabels[request.status]}${request.assignedTo ? ` - ${request.assignedTo.name}` : ""}`
    );
    ideasSheet.addRow({
      folio: idea.folio,
      createdAt: idea.createdAt,
      plant: orgUnit?.plant.name ?? "Sin planta",
      department: orgUnit?.parent?.name ?? orgUnit?.name ?? "Sin departamento",
      area: `${idea.area.code} - ${idea.area.name}`,
      category: ideaCategoryLabels[idea.category],
      collaborator: idea.collaboratorName,
      email: idea.collaboratorEmail ?? idea.participant?.email ?? "",
      employee: idea.employeeNumber ?? idea.participant?.employeeNumber ?? "",
      position: idea.submitterPosition ?? idea.participant?.jobTitle ?? "",
      shift: idea.shift,
      problem: idea.problem,
      proposal: idea.proposal,
      benefit: idea.expectedBenefit,
      impacts: parseImpactTypes(idea.impactTypes).join(", "),
      supervisor: idea.supervisor?.name ?? idea.escalationRule?.reviewerMembership.user.name ?? "Sin asignar",
      escalation: idea.escalationRule ? `${idea.escalationRule.name} - ${idea.escalationRule.submitterLabel}` : "",
      approvals: formatList(approvalSummary),
      support: formatList(supportSummary),
      followers: formatList(idea.followers.map((follower) => `${follower.user.name} (${follower.label})`)),
      status: statusLabels[idea.status],
      priority: idea.priority ? priorityLabels[idea.priority] : "Sin definir",
      classification: idea.classification ? classificationLabels[idea.classification] : "Sin clasificar",
      owner: idea.implementationOwner?.name ?? "Sin asignar",
      dueDate: idea.dueDate,
      overdueDays: isIdeaOverdue(idea, now) && idea.dueDate ? Math.max(1, Math.floor((now.getTime() - idea.dueDate.getTime()) / 86_400_000)) : 0,
      implementedAt: idea.implementedAt,
      closedAt: idea.closedAt,
      coins: idea.pointsAssigned,
      kaizen: idea.kaizenProject?.folio ?? (idea.classification === "KAIZEN" ? "Pendiente de transferencia" : ""),
      comments: idea.mcComments ?? ""
    });
  });
  addEmptyState(ideasSheet);
  formatDateColumns(ideasSheet, ["createdAt", "dueDate", "implementedAt", "closedAt"]);
  finalizeDataSheet(ideasSheet, ["status", "priority", "classification"]);

  const kaizenSheet = createDataSheet(workbook, "Kaizen", "PROYECTOS KAIZEN", "Portafolio completo con avance, fechas, ahorros y trazabilidad a la idea de origen.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Proyecto", key: "title", width: 36 },
    { header: "Planta", key: "plant", width: 16 },
    { header: "Departamento", key: "department", width: 24 },
    { header: "Area", key: "area", width: 24 },
    { header: "Lider", key: "leader", width: 26 },
    { header: "Estatus", key: "status", width: 24 },
    { header: "Inicio", key: "startDate", width: 15 },
    { header: "Cierre objetivo", key: "endDate", width: 17 },
    { header: "Cierre real", key: "closedAt", width: 15 },
    { header: "Actividades", key: "activities", width: 13 },
    { header: "Cerradas", key: "closed", width: 12 },
    { header: "Avance", key: "progress", width: 12 },
    { header: "Vencidas", key: "overdue", width: 12 },
    { header: "Bloqueadas", key: "blocked", width: 12 },
    { header: "Linea base", key: "baseline", width: 14 },
    { header: "Meta", key: "target", width: 12 },
    { header: "Valor actual", key: "current", width: 14 },
    { header: "Unidad", key: "unit", width: 12 },
    { header: "Ahorro estimado", key: "estimated", width: 18 },
    { header: "Ahorro real", key: "real", width: 17 },
    { header: "Idea de origen", key: "sourceIdea", width: 18 },
    { header: "Project Charter", key: "charter", width: 17 },
    { header: "Objetivo", key: "objective", width: 44 },
    { header: "Alcance", key: "scope", width: 40 }
  ]);
  kaizenProjects.forEach((project) => {
    const relevant = project.activities.filter((activity) => activity.status !== "COMBINADA");
    const progress = workProgress(relevant);
    kaizenSheet.addRow({
      folio: project.folio,
      title: project.title,
      plant: project.orgUnit?.plant.name ?? project.plant ?? "Sin planta",
      department: project.orgUnit?.parent?.name ?? project.orgUnit?.name ?? "",
      area: project.orgUnit?.name ?? project.area,
      leader: project.leader.name,
      status: kaizenStatusLabels[project.status],
      startDate: project.startDate,
      endDate: project.endDate,
      closedAt: project.closedAt,
      activities: progress.total,
      closed: progress.closed,
      progress: progress.percent / 100,
      overdue: relevant.filter((activity) => isWorkOverdue(activity, now)).length,
      blocked: relevant.filter((activity) => activity.status === "BLOQUEADA").length,
      baseline: project.baselineValue ?? "",
      target: project.targetValue ?? "",
      current: project.currentValue ?? "",
      unit: project.unit ?? "",
      estimated: project.estimatedSavings ?? 0,
      real: project.realSavings ?? 0,
      sourceIdea: project.sourceIdea?.folio ?? "",
      charter: project.attachments.some((attachment) => attachment.type === "CHARTER") ? "Si" : "Pendiente",
      objective: project.objective,
      scope: project.scope ?? ""
    });
  });
  addEmptyState(kaizenSheet);
  formatDateColumns(kaizenSheet, ["startDate", "endDate", "closedAt"]);
  kaizenSheet.getColumn("progress").numFmt = "0%";
  ["estimated", "real"].forEach((key) => { kaizenSheet.getColumn(key).numFmt = "$#,##0.00;[Red]-$#,##0.00"; });
  finalizeDataSheet(kaizenSheet, ["status"]);

  const kaizenActivitySheet = createDataSheet(workbook, "Actividades Kaizen", "ACTIVIDADES KAIZEN", "Plan de accion consolidado; incluye actividades combinadas para conservar su relacion.", [
    { header: "Kaizen", key: "folio", width: 18 },
    { header: "Proyecto", key: "project", width: 34 },
    { header: "#", key: "number", width: 7 },
    { header: "Problematica", key: "problem", width: 38 },
    { header: "Actividad", key: "action", width: 44 },
    { header: "Responsable", key: "owner", width: 26 },
    { header: "Estatus", key: "status", width: 20 },
    { header: "Inicio", key: "startDate", width: 15 },
    { header: "Compromiso", key: "dueDate", width: 15 },
    { header: "Cierre", key: "closedAt", width: 15 },
    { header: "Dias vencida", key: "overdueDays", width: 14 },
    { header: "Evidencias", key: "evidence", width: 12 },
    { header: "Resultado", key: "completion", width: 38 },
    { header: "Justificacion", key: "cancellation", width: 38 },
    { header: "Combinada con", key: "merged", width: 16 },
    { header: "Motivo combinacion", key: "mergeReason", width: 34 },
    { header: "Origen GENBA", key: "sourceGenba", width: 20 }
  ]);
  kaizenActivities.forEach(({ project, activity }) => kaizenActivitySheet.addRow({
    folio: project.folio,
    project: project.title,
    number: activity.number,
    problem: activity.problem ?? "",
    action: activity.action,
    owner: activity.owner?.name ?? "Sin asignar",
    status: workItemStatusLabels[activity.status],
    startDate: activity.startDate,
    dueDate: activity.dueDate,
    closedAt: activity.closedAt,
    overdueDays: daysOverdue(activity.dueDate, activity.status, now),
    evidence: activity.attachments.length,
    completion: activity.completionNote ?? "",
    cancellation: activity.cancellationReason ?? "",
    merged: activity.mergedIntoId ? "Actividad relacionada" : "",
    mergeReason: activity.mergeReason ?? "",
    sourceGenba: activity.sourceGenbaActivity?.walk.folio ?? ""
  }));
  addEmptyState(kaizenActivitySheet);
  formatDateColumns(kaizenActivitySheet, ["startDate", "dueDate", "closedAt"]);
  finalizeDataSheet(kaizenActivitySheet, ["status"]);

  const genbaSheet = createDataSheet(workbook, "GENBA", "RECORRIDOS GENBA", "Una fila por recorrido con asistencia, avance, riesgos y conversion a Kaizen.", [
    { header: "Folio", key: "folio", width: 20 },
    { header: "Planta", key: "plant", width: 16 },
    { header: "Departamento", key: "department", width: 24 },
    { header: "Area visitada", key: "area", width: 26 },
    { header: "Fecha", key: "visitDate", width: 15 },
    { header: "Coordinador", key: "coordinator", width: 26 },
    { header: "Estatus", key: "status", width: 16 },
    { header: "Departamentos esperados", key: "expectedDepartments", width: 42 },
    { header: "Departamentos asistentes", key: "attendedDepartments", width: 42 },
    { header: "Asistencia", key: "attendance", width: 13 },
    { header: "Actividades", key: "activities", width: 13 },
    { header: "Cerradas", key: "closed", width: 12 },
    { header: "Avance", key: "progress", width: 12 },
    { header: "Vencidas", key: "overdue", width: 12 },
    { header: "Bloqueadas", key: "blocked", width: 12 },
    { header: "Promovidas a Kaizen", key: "promoted", width: 18 },
    { header: "Cierre", key: "closedAt", width: 15 },
    { header: "Notas", key: "notes", width: 46 }
  ]);
  genbaWalks.forEach((walk) => {
    const relevant = walk.activities.filter((activity) => activity.status !== "COMBINADA");
    const progress = workProgress(relevant);
    genbaSheet.addRow({
      folio: walk.folio,
      plant: walk.orgUnit?.plant.name ?? "",
      department: walk.orgUnit?.parent?.name ?? walk.orgUnit?.name ?? "",
      area: walk.orgUnit?.name ?? walk.areaName,
      visitDate: walk.visitDate,
      coordinator: walk.coordinator.name,
      status: genbaStatusLabels[walk.status],
      expectedDepartments: parseStringArray(walk.expectedDepartments).join(", "),
      attendedDepartments: parseStringArray(walk.attendedDepartments).join(", "),
      attendance: attendancePercent(walk.expectedDepartments, walk.attendedDepartments) / 100,
      activities: progress.total,
      closed: progress.closed,
      progress: progress.percent / 100,
      overdue: relevant.filter((activity) => isWorkOverdue(activity, now)).length,
      blocked: relevant.filter((activity) => activity.status === "BLOQUEADA").length,
      promoted: relevant.filter((activity) => activity.promotedKaizenActivity).length,
      closedAt: walk.closedAt,
      notes: walk.notes ?? ""
    });
  });
  addEmptyState(genbaSheet);
  formatDateColumns(genbaSheet, ["visitDate", "closedAt"]);
  ["attendance", "progress"].forEach((key) => { genbaSheet.getColumn(key).numFmt = "0%"; });
  finalizeDataSheet(genbaSheet, ["status"]);

  const genbaActivitySheet = createDataSheet(workbook, "Actividades GENBA", "ACTIVIDADES GENBA", "Concentrado de hallazgos y acciones, incluyendo combinaciones y promociones a Kaizen.", [
    { header: "GENBA", key: "folio", width: 20 },
    { header: "Area", key: "area", width: 26 },
    { header: "Fecha recorrido", key: "visitDate", width: 16 },
    { header: "#", key: "number", width: 7 },
    { header: "Problematica", key: "problem", width: 42 },
    { header: "Actividad", key: "action", width: 42 },
    { header: "Responsable", key: "owner", width: 26 },
    { header: "Compromiso", key: "dueDate", width: 15 },
    { header: "Estatus", key: "status", width: 20 },
    { header: "Cierre", key: "closedAt", width: 15 },
    { header: "Dias vencida", key: "overdueDays", width: 14 },
    { header: "Evidencias", key: "evidence", width: 12 },
    { header: "Resultado", key: "completion", width: 38 },
    { header: "Justificacion", key: "cancellation", width: 38 },
    { header: "Combinada con", key: "merged", width: 16 },
    { header: "Motivo combinacion", key: "mergeReason", width: 34 },
    { header: "Kaizen relacionado", key: "kaizen", width: 20 }
  ]);
  genbaActivities.forEach(({ walk, activity }) => genbaActivitySheet.addRow({
    folio: walk.folio,
    area: walk.orgUnit?.name ?? walk.areaName,
    visitDate: walk.visitDate,
    number: activity.number,
    problem: activity.problem,
    action: activity.action ?? "",
    owner: activity.owner?.name ?? "Sin asignar",
    dueDate: activity.dueDate,
    status: workItemStatusLabels[activity.status],
    closedAt: activity.closedAt,
    overdueDays: daysOverdue(activity.dueDate, activity.status, now),
    evidence: activity.attachments.length,
    completion: activity.completionNote ?? "",
    cancellation: activity.cancellationReason ?? "",
    merged: activity.mergedIntoId ? "Actividad relacionada" : "",
    mergeReason: activity.mergeReason ?? "",
    kaizen: activity.promotedKaizenActivity?.project.folio ?? ""
  }));
  addEmptyState(genbaActivitySheet);
  formatDateColumns(genbaActivitySheet, ["visitDate", "dueDate", "closedAt"]);
  finalizeDataSheet(genbaActivitySheet, ["status"]);

  const trainingSheet = createDataSheet(workbook, "Entrenamientos", "ENTRENAMIENTOS", "Programas, sesiones, participantes, cumplimiento y ProbocaCoins asignadas.", [
    { header: "Entrenamiento", key: "program", width: 34 },
    { header: "Valor configurado", key: "coinValue", width: 18 },
    { header: "Programa activo", key: "programActive", width: 16 },
    { header: "Fecha sesion", key: "sessionDate", width: 16 },
    { header: "Planta", key: "plant", width: 18 },
    { header: "Area", key: "area", width: 26 },
    { header: "Instructor", key: "trainer", width: 26 },
    { header: "Participante", key: "participant", width: 28 },
    { header: "Empleado", key: "employee", width: 15 },
    { header: "Puesto", key: "jobTitle", width: 24 },
    { header: "Estatus", key: "status", width: 18 },
    { header: "ProbocaCoins otorgadas", key: "coinsAwarded", width: 21 },
    { header: "Fecha cumplimiento", key: "completedAt", width: 19 },
    { header: "Notas", key: "notes", width: 42 },
    { header: "Registrado por", key: "createdBy", width: 26 }
  ]);
  trainingPrograms.forEach((program) => {
    if (!program.sessions.length) {
      trainingSheet.addRow({ program: program.name, coinValue: program.coinValue, programActive: program.active ? "Si" : "No", status: "Sin sesiones", createdBy: program.createdBy.name });
      return;
    }
    program.sessions.forEach((session) => {
      if (!session.enrollments.length) {
        trainingSheet.addRow({ program: program.name, coinValue: program.coinValue, programActive: program.active ? "Si" : "No", sessionDate: session.sessionDate, plant: session.plant?.name ?? "", area: session.orgUnit?.name ?? "", trainer: session.trainerName ?? "", status: "Sin participantes", notes: session.notes ?? "", createdBy: session.createdBy.name });
        return;
      }
      session.enrollments.forEach((enrollment) => trainingSheet.addRow({
        program: program.name,
        coinValue: program.coinValue,
        programActive: program.active ? "Si" : "No",
        sessionDate: session.sessionDate,
        plant: session.plant?.name ?? "",
        area: session.orgUnit?.name ?? "",
        trainer: session.trainerName ?? "",
        participant: enrollment.participant.name,
        employee: enrollment.participant.employeeNumber ?? "",
        jobTitle: enrollment.participant.jobTitle ?? "",
        status: trainingStatusLabels[enrollment.status] ?? enrollment.status,
        coinsAwarded: enrollment.coinsAwarded,
        completedAt: enrollment.completedAt,
        notes: session.notes ?? "",
        createdBy: session.createdBy.name
      }));
    });
  });
  addEmptyState(trainingSheet);
  formatDateColumns(trainingSheet, ["sessionDate", "completedAt"]);
  finalizeDataSheet(trainingSheet, ["status"]);

  const coinsSheet = createDataSheet(workbook, "ProbocaCoins", "MOVIMIENTOS PROBOCACOINS", "Libro mayor con otorgamientos, ajustes y canjes por persona y fuente.", [
    { header: "Referencia", key: "reference", width: 22 },
    { header: "Fecha", key: "occurredAt", width: 18 },
    { header: "Participante", key: "participant", width: 28 },
    { header: "Empleado", key: "employee", width: 15 },
    { header: "Planta", key: "plant", width: 18 },
    { header: "Area", key: "area", width: 26 },
    { header: "Tipo", key: "type", width: 18 },
    { header: "Fuente", key: "source", width: 20 },
    { header: "ID origen", key: "sourceId", width: 24 },
    { header: "Movimiento", key: "amount", width: 16 },
    { header: "Descripcion", key: "description", width: 48 },
    { header: "Registrado por", key: "createdBy", width: 26 }
  ]);
  coinTransactions.forEach((transaction) => coinsSheet.addRow({
    reference: transaction.reference,
    occurredAt: transaction.occurredAt,
    participant: transaction.participant.name,
    employee: transaction.participant.employeeNumber ?? "",
    plant: transaction.participant.orgUnit?.plant.name ?? "",
    area: transaction.participant.orgUnit?.name ?? "",
    type: coinTypeLabels[transaction.type] ?? transaction.type,
    source: coinSourceLabels[transaction.sourceType] ?? transaction.sourceType,
    sourceId: transaction.sourceId ?? "",
    amount: transaction.amount,
    description: transaction.description,
    createdBy: transaction.createdBy?.name ?? "Sistema"
  }));
  addEmptyState(coinsSheet);
  formatDateColumns(coinsSheet, ["occurredAt"], true);
  coinsSheet.getColumn("amount").numFmt = "+0;[Red]-0;0";
  finalizeDataSheet(coinsSheet, ["type"]);

  const peopleSheet = createDataSheet(workbook, "Personas", "DIRECTORIO DE PERSONAS", "Participantes y usuarios del sistema con ubicacion, acceso, formacion y saldo ProbocaCoins.", [
    { header: "Nombre", key: "name", width: 30 },
    { header: "Empleado", key: "employee", width: 15 },
    { header: "Correo", key: "email", width: 32 },
    { header: "Puesto", key: "jobTitle", width: 26 },
    { header: "Planta", key: "plant", width: 18 },
    { header: "Area principal", key: "area", width: 28 },
    { header: "Rol de acceso", key: "role", width: 24 },
    { header: "Membresias / alcance", key: "memberships", width: 52 },
    { header: "Jefes directos", key: "managers", width: 38 },
    { header: "Ideas", key: "ideas", width: 10 },
    { header: "Entrenamientos completados", key: "trainings", width: 24 },
    { header: "ProbocaCoins otorgadas", key: "awarded", width: 21 },
    { header: "ProbocaCoins canjeadas", key: "redeemed", width: 21 },
    { header: "Saldo", key: "balance", width: 14 },
    { header: "Estatus", key: "status", width: 14 },
    { header: "Tipo de registro", key: "recordType", width: 20 }
  ]);
  participants.forEach((participant) => {
    const linkedUser = participant.user;
    const memberships = linkedUser ? users.find((user) => user.id === linkedUser.id)?.orgMemberships ?? [] : [];
    const awarded = participant.coinTransactions.filter((transaction) => transaction.type === "AWARD").reduce((sum, transaction) => sum + transaction.amount, 0);
    const redeemed = Math.abs(participant.coinTransactions.filter((transaction) => transaction.type === "REDEMPTION").reduce((sum, transaction) => sum + transaction.amount, 0));
    peopleSheet.addRow({
      name: participant.name,
      employee: participant.employeeNumber ?? linkedUser?.employeeNumber ?? "",
      email: participant.email ?? linkedUser?.email ?? "",
      jobTitle: participant.jobTitle ?? linkedUser?.jobTitle ?? "",
      plant: participant.orgUnit?.plant.name ?? memberships[0]?.orgUnit.plant.name ?? "",
      area: participant.orgUnit?.name ?? memberships[0]?.orgUnit.name ?? "",
      role: linkedUser ? roleLabels[linkedUser.role] : "Sin acceso",
      memberships: formatList(memberships.map((membership) => `${membership.orgUnit.name}: ${membership.title}`)),
      managers: formatList(memberships.map((membership) => membership.managerMembership?.user.name)),
      ideas: participant.ideas.length,
      trainings: participant.enrollments.filter((enrollment) => enrollment.status === "COMPLETED").length,
      awarded,
      redeemed,
      balance: participant.coinTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      status: participant.active && (linkedUser?.active ?? true) ? "Activo" : "Inactivo",
      recordType: linkedUser ? "Participante con acceso" : "Participante"
    });
  });
  users.filter((user) => !user.participant).forEach((user) => peopleSheet.addRow({
    name: user.name,
    employee: user.employeeNumber ?? "",
    email: user.email,
    jobTitle: user.jobTitle ?? "",
    plant: user.orgMemberships[0]?.orgUnit.plant.name ?? "",
    area: user.orgMemberships[0]?.orgUnit.name ?? "",
    role: roleLabels[user.role],
    memberships: formatList(user.orgMemberships.map((membership) => `${membership.orgUnit.name}: ${membership.title}`)),
    managers: formatList(user.orgMemberships.map((membership) => membership.managerMembership?.user.name)),
    ideas: 0,
    trainings: 0,
    awarded: 0,
    redeemed: 0,
    balance: 0,
    status: user.active ? "Activo" : "Inactivo",
    recordType: "Usuario del sistema"
  }));
  addEmptyState(peopleSheet);
  ["awarded", "redeemed", "balance"].forEach((key) => { peopleSheet.getColumn(key).numFmt = "0;[Red]-0;0"; });
  finalizeDataSheet(peopleSheet, ["status"]);

  const structureSheet = createDataSheet(workbook, "Estructura", "ESTRUCTURA ORGANIZACIONAL", "Plantas, areas, responsables, rutas de escalamiento y capacidades operativas.", [
    { header: "Planta", key: "plant", width: 20 },
    { header: "Codigo planta", key: "plantCode", width: 16 },
    { header: "Tipo", key: "type", width: 18 },
    { header: "Codigo", key: "code", width: 18 },
    { header: "Unidad / area", key: "name", width: 30 },
    { header: "Unidad superior", key: "parent", width: 30 },
    { header: "Responsable", key: "responsible", width: 28 },
    { header: "Gerente", key: "manager", width: 28 },
    { header: "Receptor de ideas", key: "routingUser", width: 28 },
    { header: "Area de apoyo", key: "support", width: 16 },
    { header: "QR habilitado", key: "qr", width: 16 },
    { header: "Personas asignadas", key: "members", width: 56 },
    { header: "Rutas de escalamiento", key: "escalations", width: 68 },
    { header: "Estatus", key: "status", width: 14 }
  ]);
  orgUnits.forEach((unit) => structureSheet.addRow({
    plant: unit.plant.name,
    plantCode: unit.plant.code,
    type: orgTypeLabels[unit.type] ?? unit.type,
    code: unit.code,
    name: unit.name,
    parent: unit.parent?.name ?? "Raiz de planta",
    responsible: unit.responsible,
    manager: unit.manager,
    routingUser: unit.routingUser?.name ?? "Sin asignar",
    support: unit.isSupportArea ? "Si" : "No",
    qr: unit.qrEnabled ? "Si" : "No",
    members: formatList(unit.memberships.map((membership) => `${membership.user.name} - ${membership.title}${membership.active ? "" : " (inactivo)"}`)),
    escalations: formatList(unit.escalationRules.map((rule) => `${rule.submitterLabel} -> ${rule.reviewerMembership.user.name}${rule.circumstance ? ` [${rule.circumstance}]` : ""}${rule.active ? "" : " (inactiva)"}`)),
    status: unit.active ? "Activo" : "Inactivo"
  }));
  addEmptyState(structureSheet);
  finalizeDataSheet(structureSheet, ["status"]);

  return workbook;
}
