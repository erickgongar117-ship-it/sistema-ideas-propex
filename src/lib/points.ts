import type { Approval, Attachment, Idea, PointRule } from "@prisma/client";
import { parseImpactTypes } from "@/lib/domain";

type IdeaForPoints = Idea & {
  approvals: Approval[];
  attachments: Attachment[];
};

const defaultRuleNames = {
  registered: "Idea registrada correctamente",
  supervisorApproved: "Idea aprobada por supervisor",
  supportValidated: "Idea validada por areas soporte",
  implemented: "Idea implementada",
  evidence: "Idea cerrada con evidencia",
  replicable: "Idea replicable a otra area",
  safety: "Idea con impacto en seguridad",
  foodSafety: "Idea con impacto en inocuidad",
  savings: "Idea con ahorro comprobado"
};

function textHasAny(value: string | null | undefined, words: string[]) {
  const text = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return words.some((word) => text.includes(word));
}

function addIfRuleExists(selected: Set<string>, rulesByName: Map<string, PointRule>, name: string) {
  const rule = rulesByName.get(name);
  if (rule) selected.add(rule.id);
}

export function automaticPointRules(idea: IdeaForPoints, pointRules: PointRule[]) {
  const activeRules = pointRules.filter((rule) => rule.active);
  const rulesByName = new Map(activeRules.map((rule) => [rule.name, rule]));
  const selected = new Set<string>();
  const impacts = parseImpactTypes(idea.impactTypes);
  const approvedSupport = idea.approvals.filter(
    (approval) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(approval.type) && approval.status === "APPROVED"
  );
  const afterEvidence = idea.attachments.some((attachment) => attachment.type === "AFTER");

  addIfRuleExists(selected, rulesByName, defaultRuleNames.registered);

  if (idea.approvals.some((approval) => approval.type === "SUPERVISOR" && approval.status === "APPROVED")) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.supervisorApproved);
  }

  if (approvedSupport.length > 0 || (!idea.impactsQuality && !idea.impactsSafety && !idea.requiresMaintenance)) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.supportValidated);
  }

  if (idea.implementedAt || idea.status === "IMPLEMENTADA" || idea.status === "CERRADA" || afterEvidence) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.implemented);
  }

  if (afterEvidence) addIfRuleExists(selected, rulesByName, defaultRuleNames.evidence);

  if (
    textHasAny(`${idea.proposal} ${idea.expectedBenefit} ${idea.mcComments}`, [
      "replica",
      "replicable",
      "otra area",
      "otras areas",
      "linea",
      "lineas"
    ])
  ) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.replicable);
  }

  if (idea.impactsSafety || impacts.some((impact) => ["Seguridad", "Ergonomia"].includes(impact))) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.safety);
  }

  if (idea.impactsQuality || impacts.includes("Calidad/Inocuidad")) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.foodSafety);
  }

  if (
    impacts.includes("Costo") ||
    textHasAny(`${idea.expectedBenefit} ${idea.mcComments}`, ["ahorro", "costo", "econom", "merma", "desperdicio"])
  ) {
    addIfRuleExists(selected, rulesByName, defaultRuleNames.savings);
  }

  const selectedRules = activeRules.filter((rule) => selected.has(rule.id));
  const totalPoints = selectedRules.reduce((sum, rule) => sum + rule.points, 0);
  return { selectedRules, totalPoints };
}
