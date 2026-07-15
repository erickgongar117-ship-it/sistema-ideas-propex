import {
  approvalStatusLabels,
  approvalTypeLabels,
  classificationLabels,
  ideaCategoryLabels,
  kaizenStatusLabels,
  parseImpactTypes,
  priorityLabels,
  statusLabels
} from "@/lib/domain";
import { isManagerialEvaluationRule, managerialCriterionLabel } from "@/lib/managerial-evaluation";
import { prisma } from "@/lib/prisma";
import {
  WORKBOOK_COLORS as COLORS,
  addSummaryMetric,
  createDataSheet,
  createSummarySheet,
  finalizeDataSheet,
  setupWorkbook
} from "@/lib/workbook-style";

function isIdeaOverdue(idea: { dueDate: Date | null; status: string }, now: Date) {
  return Boolean(idea.dueDate && idea.dueDate < now && !["IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA", "CANCELADA"].includes(idea.status));
}

export async function buildIdeasWorkbook() {
  const workbook = setupWorkbook("Concentrado de Ideas de Mejora");
  const now = new Date();
  const ideas = await prisma.idea.findMany({
    include: {
      area: { include: { organizationUnit: { include: { plant: true, parent: true } } } },
      supervisor: true,
      implementationOwner: true,
      approvals: { include: { assignedTo: true } },
      comments: { include: { user: true } },
      pointRuleSelections: { include: { pointRule: true } },
      kaizenProject: { include: { leader: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const closed = ideas.filter((idea) => idea.status === "CERRADA").length;
  const implemented = ideas.filter((idea) => ["IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA"].includes(idea.status)).length;
  const active = ideas.filter((idea) => !["CERRADA", "CANCELADA"].includes(idea.status)).length;
  const overdue = ideas.filter((idea) => isIdeaOverdue(idea, now)).length;
  const pendingApprovals = ideas.flatMap((idea) => idea.approvals).filter((approval) => approval.status === "PENDING").length;
  const kaizenClassified = ideas.filter((idea) => idea.classification === "KAIZEN").length;
  const kaizenLinked = ideas.filter((idea) => idea.kaizenProject).length;
  const totalPoints = ideas.reduce((sum, idea) => sum + idea.pointsAssigned, 0);

  const summary = createSummarySheet(
    workbook,
    "CONCENTRADO DE IDEAS DE MEJORA",
    `Corte al ${now.toLocaleDateString("es-MX")} | Informacion sincronizada con PROpEx`
  );
  addSummaryMetric(summary, 1, 4, "IDEAS", ideas.length, COLORS.blueSoft);
  addSummaryMetric(summary, 3, 4, "EN SEGUIMIENTO", active, COLORS.amberSoft);
  addSummaryMetric(summary, 5, 4, "IMPLEMENTADAS", implemented, COLORS.greenSoft);
  addSummaryMetric(summary, 7, 4, "CIERRE", ideas.length ? `${Math.round((closed / ideas.length) * 100)}%` : "0%", COLORS.greenSoft);
  addSummaryMetric(summary, 1, 9, "VALIDACIONES PENDIENTES", pendingApprovals, pendingApprovals ? COLORS.amberSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 3, 9, "VENCIDAS", overdue, overdue ? COLORS.roseSoft : COLORS.greenSoft);
  addSummaryMetric(summary, 5, 9, "CLASIFICADAS KAIZEN", kaizenClassified, COLORS.blueSoft);
  addSummaryMetric(summary, 7, 9, "PROBOCACOINS ASIGNADAS", totalPoints, COLORS.greenSoft);
  summary.mergeCells("A14:H14");
  summary.getCell("A14").value = `Trazabilidad Kaizen: ${kaizenLinked} proyectos vinculados. El archivo incluye base maestra, validaciones, comentarios, ProbocaCoins y flujo automatico hacia Kaizen.`;
  summary.getCell("A14").alignment = { wrapText: true, vertical: "middle" };
  summary.getCell("A14").font = { color: { argb: COLORS.gray }, italic: true, size: 10 };
  summary.getRow(14).height = 42;

  const ideaSheet = createDataSheet(workbook, "Ideas", "BASE MAESTRA DE IDEAS", "Una fila por idea con origen, flujo, responsables, fechas, ProbocaCoins y proyecto relacionado.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Registro", key: "createdAt", width: 18 },
    { header: "Planta", key: "plant", width: 16 },
    { header: "Area", key: "areaCode", width: 16 },
    { header: "Nombre del area", key: "areaName", width: 24 },
    { header: "Departamento", key: "department", width: 24 },
    { header: "Categoria", key: "category", width: 30 },
    { header: "Colaborador", key: "collaboratorName", width: 26 },
    { header: "Correo", key: "collaboratorEmail", width: 30 },
    { header: "Empleado", key: "employeeNumber", width: 14 },
    { header: "Turno", key: "shift", width: 16 },
    { header: "Problema", key: "problem", width: 42 },
    { header: "Propuesta", key: "proposal", width: 42 },
    { header: "Beneficio esperado", key: "expectedBenefit", width: 36 },
    { header: "Impactos", key: "impactTypes", width: 30 },
    { header: "Calidad", key: "quality", width: 12 },
    { header: "Seguridad", key: "safety", width: 12 },
    { header: "Mantenimiento", key: "maintenance", width: 16 },
    { header: "Apoyo externo", key: "external", width: 15 },
    { header: "Detalle externo / cotizacion", key: "externalDetails", width: 38 },
    { header: "Supervisor", key: "supervisor", width: 24 },
    { header: "Estatus", key: "status", width: 28 },
    { header: "Prioridad", key: "priority", width: 14 },
    { header: "Clasificacion", key: "classification", width: 24 },
    { header: "Responsable", key: "owner", width: 24 },
    { header: "Compromiso", key: "dueDate", width: 15 },
    { header: "Implementada", key: "implementedAt", width: 15 },
    { header: "Cerrada", key: "closedAt", width: 15 },
    { header: "ProbocaCoins", key: "points", width: 16 },
    { header: "Kaizen", key: "kaizen", width: 18 },
    { header: "Estatus Kaizen", key: "kaizenStatus", width: 24 },
    { header: "Comentario MC", key: "mcComments", width: 38 }
  ]);
  ideas.forEach((idea) => {
    const orgUnit = idea.area.organizationUnit;
    ideaSheet.addRow({
      folio: idea.folio,
      createdAt: idea.createdAt,
      plant: orgUnit?.plant.name ?? "Sin planta",
      areaCode: idea.area.code,
      areaName: idea.area.name,
      department: orgUnit?.parent?.name ?? orgUnit?.name ?? "",
      category: ideaCategoryLabels[idea.category],
      collaboratorName: idea.collaboratorName,
      collaboratorEmail: idea.collaboratorEmail ?? "",
      employeeNumber: idea.employeeNumber ?? "",
      shift: idea.shift,
      problem: idea.problem,
      proposal: idea.proposal,
      expectedBenefit: idea.expectedBenefit,
      impactTypes: parseImpactTypes(idea.impactTypes).join(", "),
      quality: idea.impactsQuality ? "Si" : "No",
      safety: idea.impactsSafety ? "Si" : "No",
      maintenance: idea.requiresMaintenance ? "Si" : "No",
      external: idea.requiresExternalSupport ? "Si" : "No",
      externalDetails: idea.externalSupportDetails ?? "",
      supervisor: idea.supervisor?.name ?? "Sin asignar",
      status: statusLabels[idea.status],
      priority: idea.priority ? priorityLabels[idea.priority] : "Sin definir",
      classification: idea.classification ? classificationLabels[idea.classification] : "Sin clasificar",
      owner: idea.implementationOwner?.name ?? "Sin asignar",
      dueDate: idea.dueDate ?? null,
      implementedAt: idea.implementedAt ?? null,
      closedAt: idea.closedAt ?? null,
      points: idea.pointsAssigned,
      kaizen: idea.kaizenProject?.folio ?? (idea.classification === "KAIZEN" ? "Pendiente" : ""),
      kaizenStatus: idea.kaizenProject ? kaizenStatusLabels[idea.kaizenProject.status] : "",
      mcComments: idea.mcComments ?? ""
    });
  });
  ["createdAt", "dueDate", "implementedAt", "closedAt"].forEach((key) => { ideaSheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  finalizeDataSheet(ideaSheet, ["status", "priority", "classification", "kaizenStatus"]);

  const approvalSheet = createDataSheet(workbook, "Validaciones", "VALIDACIONES POR IDEA", "Decisiones y comentarios de Supervisor, Calidad, Seguridad, Mantenimiento y Mejora Continua.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Area", key: "area", width: 18 },
    { header: "Tipo", key: "type", width: 24 },
    { header: "Asignado a", key: "assignedTo", width: 26 },
    { header: "Estatus", key: "status", width: 18 },
    { header: "Comentarios", key: "comments", width: 48 },
    { header: "Fecha decision", key: "decidedAt", width: 18 }
  ]);
  ideas.forEach((idea) => idea.approvals.forEach((approval) => approvalSheet.addRow({
    folio: idea.folio,
    area: idea.area.code,
    type: approvalTypeLabels[approval.type],
    assignedTo: approval.assignedTo?.name ?? "Sin asignar",
    status: approvalStatusLabels[approval.status],
    comments: approval.comments ?? "",
    decidedAt: approval.decidedAt ?? null
  })));
  approvalSheet.getColumn("decidedAt").numFmt = "dd/mm/yyyy hh:mm";
  finalizeDataSheet(approvalSheet, ["status"]);

  const kaizenSheet = createDataSheet(workbook, "Flujo Kaizen", "TRAZABILIDAD DE IDEAS A KAIZEN", "Toda idea clasificada como Kaizen debe tener un proyecto consecutivo relacionado.", [
    { header: "Idea", key: "idea", width: 18 },
    { header: "Registro idea", key: "createdAt", width: 16 },
    { header: "Planta", key: "plant", width: 16 },
    { header: "Area", key: "area", width: 20 },
    { header: "Problema / proyecto", key: "problem", width: 42 },
    { header: "Kaizen", key: "kaizen", width: 18 },
    { header: "Lider", key: "leader", width: 24 },
    { header: "Estatus Kaizen", key: "status", width: 24 },
    { header: "Inicio", key: "startDate", width: 14 },
    { header: "Cierre objetivo", key: "endDate", width: 16 },
    { header: "Resultado", key: "result", width: 24 }
  ]);
  ideas.filter((idea) => idea.classification === "KAIZEN").forEach((idea) => kaizenSheet.addRow({
    idea: idea.folio,
    createdAt: idea.createdAt,
    plant: idea.area.organizationUnit?.plant.name ?? "Sin planta",
    area: `${idea.area.code} - ${idea.area.name}`,
    problem: idea.problem,
    kaizen: idea.kaizenProject?.folio ?? "Pendiente",
    leader: idea.kaizenProject?.leader.name ?? "Pendiente",
    status: idea.kaizenProject ? kaizenStatusLabels[idea.kaizenProject.status] : "Sin proyecto",
    startDate: idea.kaizenProject?.startDate ?? null,
    endDate: idea.kaizenProject?.endDate ?? null,
    result: idea.kaizenProject ? "Transferida automaticamente" : "Requiere conciliacion"
  }));
  ["createdAt", "startDate", "endDate"].forEach((key) => { kaizenSheet.getColumn(key).numFmt = "dd/mm/yyyy"; });
  finalizeDataSheet(kaizenSheet, ["status", "result"]);

  const commentsSheet = createDataSheet(workbook, "Comentarios", "BITACORA DE COMENTARIOS", "Seguimientos y acuerdos registrados dentro de cada idea.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Area", key: "area", width: 18 },
    { header: "Usuario", key: "user", width: 26 },
    { header: "Comentario", key: "comment", width: 64 },
    { header: "Fecha", key: "createdAt", width: 20 }
  ]);
  ideas.forEach((idea) => idea.comments.forEach((comment) => commentsSheet.addRow({
    folio: idea.folio,
    area: idea.area.code,
    user: comment.user?.name ?? "Sistema",
    comment: comment.comment,
    createdAt: comment.createdAt
  })));
  commentsSheet.getColumn("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  finalizeDataSheet(commentsSheet);

  const pointsSheet = createDataSheet(workbook, "ProbocaCoins", "DETALLE DE PROBOCACOINS", "Reglas sugeridas o aprobadas que forman la recompensa total de cada idea.", [
    { header: "Folio", key: "folio", width: 18 },
    { header: "Colaborador", key: "collaborator", width: 28 },
    { header: "Area", key: "area", width: 18 },
    { header: "Tipo", key: "type", width: 24 },
    { header: "Regla", key: "rule", width: 38 },
    { header: "Criterio seleccionado", key: "criterion", width: 56 },
    { header: "ProbocaCoins", key: "points", width: 16 }
  ]);
  ideas.forEach((idea) => idea.pointRuleSelections.forEach((selection) => pointsSheet.addRow({
    folio: idea.folio,
    collaborator: idea.collaboratorName,
    area: idea.area.code,
    type: isManagerialEvaluationRule(selection.pointRule.id) ? "Evaluacion gerencial" : "Regla base",
    rule: selection.pointRule.name,
    criterion: isManagerialEvaluationRule(selection.pointRule.id) ? managerialCriterionLabel(selection.pointRule.id, selection.points) : "",
    points: selection.points
  })));
  finalizeDataSheet(pointsSheet);

  return workbook;
}
