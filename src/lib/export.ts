import ExcelJS from "exceljs";
import { approvalStatusLabels, approvalTypeLabels, classificationLabels, ideaCategoryLabels, parseImpactTypes, priorityLabels, statusLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export async function buildIdeasWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Ideas de Mejora PROpEx";
  workbook.created = new Date();

  const ideas = await prisma.idea.findMany({
    include: {
      area: true,
      supervisor: true,
      implementationOwner: true,
      approvals: { include: { assignedTo: true } },
      comments: { include: { user: true } },
      pointRuleSelections: { include: { pointRule: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const ideaSheet = workbook.addWorksheet("Ideas");
  ideaSheet.columns = [
    { header: "Folio", key: "folio", width: 16 },
    { header: "Fecha", key: "createdAt", width: 22 },
    { header: "Area", key: "area", width: 12 },
    { header: "Categoria", key: "category", width: 34 },
    { header: "Colaborador", key: "collaboratorName", width: 28 },
    { header: "Empleado", key: "employeeNumber", width: 16 },
    { header: "Problema", key: "problem", width: 45 },
    { header: "Propuesta", key: "proposal", width: 45 },
    { header: "Beneficio", key: "expectedBenefit", width: 34 },
    { header: "Impactos", key: "impactTypes", width: 32 },
    { header: "Apoyo externo / cotizacion", key: "externalSupportDetails", width: 42 },
    { header: "Supervisor", key: "supervisor", width: 24 },
    { header: "Estatus", key: "status", width: 28 },
    { header: "Prioridad", key: "priority", width: 14 },
    { header: "Clasificacion", key: "classification", width: 26 },
    { header: "Responsable", key: "owner", width: 24 },
    { header: "Fecha compromiso", key: "dueDate", width: 22 },
    { header: "Implementada", key: "implementedAt", width: 22 },
    { header: "Cerrada", key: "closedAt", width: 22 },
    { header: "Puntos", key: "pointsAssigned", width: 10 }
  ];
  ideaSheet.getRow(1).font = { bold: true };
  ideas.forEach((idea) => {
    ideaSheet.addRow({
      folio: idea.folio,
      createdAt: idea.createdAt,
      area: idea.area.code,
      category: ideaCategoryLabels[idea.category],
      collaboratorName: idea.collaboratorName,
      employeeNumber: idea.employeeNumber ?? "",
      problem: idea.problem,
      proposal: idea.proposal,
      expectedBenefit: idea.expectedBenefit,
      impactTypes: parseImpactTypes(idea.impactTypes).join(", "),
      externalSupportDetails: idea.externalSupportDetails ?? "",
      supervisor: idea.supervisor?.name ?? "",
      status: statusLabels[idea.status],
      priority: idea.priority ? priorityLabels[idea.priority] : "",
      classification: idea.classification ? classificationLabels[idea.classification] : "",
      owner: idea.implementationOwner?.name ?? "",
      dueDate: idea.dueDate ?? "",
      implementedAt: idea.implementedAt ?? "",
      closedAt: idea.closedAt ?? "",
      pointsAssigned: idea.pointsAssigned
    });
  });

  const approvalsSheet = workbook.addWorksheet("Validaciones");
  approvalsSheet.columns = [
    { header: "Folio", key: "folio", width: 16 },
    { header: "Tipo", key: "type", width: 24 },
    { header: "Asignado a", key: "assignedTo", width: 28 },
    { header: "Estatus", key: "status", width: 18 },
    { header: "Comentarios", key: "comments", width: 45 },
    { header: "Fecha decision", key: "decidedAt", width: 22 }
  ];
  approvalsSheet.getRow(1).font = { bold: true };
  ideas.flatMap((idea) =>
    idea.approvals.map((approval) =>
      approvalsSheet.addRow({
        folio: idea.folio,
        type: approvalTypeLabels[approval.type],
        assignedTo: approval.assignedTo?.name ?? "",
        status: approvalStatusLabels[approval.status],
        comments: approval.comments ?? "",
        decidedAt: approval.decidedAt ?? ""
      })
    )
  );

  const commentsSheet = workbook.addWorksheet("Comentarios");
  commentsSheet.columns = [
    { header: "Folio", key: "folio", width: 16 },
    { header: "Usuario", key: "user", width: 28 },
    { header: "Comentario", key: "comment", width: 60 },
    { header: "Fecha", key: "createdAt", width: 22 }
  ];
  commentsSheet.getRow(1).font = { bold: true };
  ideas.flatMap((idea) =>
    idea.comments.map((comment) =>
      commentsSheet.addRow({
        folio: idea.folio,
        user: comment.user?.name ?? "Sistema",
        comment: comment.comment,
        createdAt: comment.createdAt
      })
    )
  );

  const pointsSheet = workbook.addWorksheet("Puntos");
  pointsSheet.columns = [
    { header: "Folio", key: "folio", width: 16 },
    { header: "Regla", key: "rule", width: 34 },
    { header: "Puntos", key: "points", width: 12 }
  ];
  pointsSheet.getRow(1).font = { bold: true };
  ideas.flatMap((idea) =>
    idea.pointRuleSelections.map((selection) =>
      pointsSheet.addRow({
        folio: idea.folio,
        rule: selection.pointRule.name,
        points: selection.points
      })
    )
  );

  for (const sheet of workbook.worksheets) {
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: Math.max(sheet.columnCount, 1) }
    };
  }

  return workbook;
}
