import type { Approval, Attachment, Idea, PointRule } from "@prisma/client";
import { parseImpactTypes } from "@/lib/domain";
import { managerialCriterionLabel, managerialEvaluationFactors } from "@/lib/managerial-evaluation";

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

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function numericAmounts(value: string) {
  return [...value.matchAll(/\$?\s*(\d[\d,]*(?:\.\d+)?)/g)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter((amount) => Number.isFinite(amount));
}

function suggestedEffect(idea: Idea) {
  const impacts = parseImpactTypes(idea.impactTypes);
  const textValue = `${idea.expectedBenefit} ${idea.mcComments ?? ""}`;
  const greatestAmount = Math.max(0, ...numericAmounts(textValue));
  if (greatestAmount > 15_000) return 300;
  if (greatestAmount >= 3_000) return 225;
  if (greatestAmount > 0) return 150;
  if (idea.impactsSafety || impacts.includes("Seguridad") || normalized(textValue).includes("moral")) return 225;
  if (impacts.length > 0) return 150;
  return 75;
}

function suggestedImplementation(idea: Idea) {
  const implementedAt = idea.implementedAt ?? idea.closedAt;
  if (!implementedAt) return 0;
  const days = Math.max(0, Math.ceil((implementedAt.getTime() - idea.createdAt.getTime()) / 86_400_000));
  if (days <= 30) return 75;
  if (days <= 60) return 50;
  if (days <= 90) return 30;
  return 15;
}

function suggestedEffort(idea: Idea) {
  const textValue = `${idea.proposal} ${idea.mcComments ?? ""}`;
  const hourMatches = [...normalized(textValue).matchAll(/(\d+(?:\.\d+)?)\s*(?:horas?|hrs?|h)\b/g)];
  const hours = Math.max(0, ...hourMatches.map((match) => Number(match[1])));
  if (hours > 50) return 50;
  if (hours >= 25) return 40;
  if (hours >= 9) return 25;
  if (hours > 0) return 10;
  if (idea.category === "C" || idea.requiresExternalSupport) return 40;
  if (idea.category === "B" || idea.impactsQuality || idea.impactsSafety || idea.requiresMaintenance) return 25;
  return 10;
}

function suggestedOriginality(idea: Idea) {
  const textValue = normalized(`${idea.problem} ${idea.proposal} ${idea.expectedBenefit} ${idea.mcComments ?? ""}`);
  if (["nuevo", "creativ", "innov", "automat", "digitaliz"].some((word) => textValue.includes(word))) return 75;
  if (["replica", "replicable", "otras areas", "amplia aplicacion"].some((word) => textValue.includes(word))) return 50;
  if (["adapt", "modific", "reorganiz", "visual", "estandariz"].some((word) => textValue.includes(word))) return 30;
  if (["similar", "referencia", "copi"].some((word) => textValue.includes(word))) return 10;
  return 30;
}

export function automaticManagerialEvaluation(idea: Idea) {
  const suggestions = [suggestedEffect(idea), suggestedImplementation(idea), suggestedEffort(idea), suggestedOriginality(idea)];
  return managerialEvaluationFactors.map((factor, index) => {
    const points = suggestions[index];
    return { factor, points, criterion: managerialCriterionLabel(factor.ruleId, points) };
  });
}
