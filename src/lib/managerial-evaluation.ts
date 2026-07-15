export type ManagerialEvaluationOption = {
  points: number;
  label: string;
};

export type ManagerialEvaluationFactor = {
  ruleId: string;
  ruleName: string;
  description: string;
  maxPoints: number;
  options: ManagerialEvaluationOption[];
};

export const managerialEvaluationFactors: ManagerialEvaluationFactor[] = [
  {
    ruleId: "managerial-effect",
    ruleName: "Evaluacion gerencial - Efecto",
    description: "Impacto comprobado en Calidad, Costo, Entrega, Seguridad o Moral.",
    maxPoints: 300,
    options: [
      { points: 300, label: "Muy significativo en Calidad, Costo o Entrega (mayor a $15,000)" },
      { points: 225, label: "Considerable ($3,000 a $5,000) o significativo en Seguridad o Moral" },
      { points: 150, label: "Pequeno (menor a $3,000) o algun efecto en Seguridad o Moral" },
      { points: 75, label: "Efecto no significativo" },
      { points: 0, label: "No hay manera de medirlo" }
    ]
  },
  {
    ruleId: "managerial-implementation",
    ruleName: "Evaluacion gerencial - Posibilidad de implementacion",
    description: "Tiempo y preparacion requeridos para llevar la mejora a operacion.",
    maxPoints: 75,
    options: [
      { points: 75, label: "Se implemento inmediatamente (menos de 30 dias)" },
      { points: 50, label: "Requirio un periodo de preparacion (31 a 60 dias)" },
      { points: 30, label: "Tuvo dificultad para implementarse (61 a 90 dias)" },
      { points: 15, label: "Requirio mucho estudio adicional (mas de 90 dias)" },
      { points: 0, label: "No implementada o sin evidencia suficiente" }
    ]
  },
  {
    ruleId: "managerial-effort",
    ruleName: "Evaluacion gerencial - Esfuerzo de implementacion",
    description: "Recursos y horas-persona invertidos para ejecutar la mejora.",
    maxPoints: 50,
    options: [
      { points: 50, label: "Gran cantidad de esfuerzo (mas de 50 horas-persona)" },
      { points: 40, label: "Esfuerzo alto (25 a 50 horas-persona)" },
      { points: 25, label: "Esfuerzo moderado (9 a 24 horas-persona)" },
      { points: 10, label: "Esfuerzo bajo (1 a 8 horas-persona)" },
      { points: 0, label: "Sin esfuerzo comprobable o sin informacion" }
    ]
  },
  {
    ruleId: "managerial-originality",
    ruleName: "Evaluacion gerencial - Originalidad",
    description: "Grado de novedad, creatividad y aplicacion original de la solucion.",
    maxPoints: 75,
    options: [
      { points: 75, label: "Nuevo y creativo" },
      { points: 50, label: "Bastante original y con amplia esfera de aplicacion" },
      { points: 30, label: "Adaptacion creativa con alguna ayuda" },
      { points: 10, label: "Usa ejemplos similares como referencia" },
      { points: 0, label: "Sin contribucion original identificable" }
    ]
  }
];

export const managerialEvaluationRuleIds = managerialEvaluationFactors.map((factor) => factor.ruleId);

export function managerialFactorForRule(ruleId: string) {
  return managerialEvaluationFactors.find((factor) => factor.ruleId === ruleId);
}

export function isManagerialEvaluationRule(ruleId: string) {
  return managerialEvaluationRuleIds.includes(ruleId);
}

export function managerialCriterionLabel(ruleId: string, points: number) {
  return managerialFactorForRule(ruleId)?.options.find((option) => option.points === points)?.label ?? "Ajuste manual";
}
