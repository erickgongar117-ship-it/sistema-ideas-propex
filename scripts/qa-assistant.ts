import assert from "node:assert/strict";
import { answerFromContext, type AssistantContext } from "../src/lib/assistant-answers";

const context: AssistantContext = {
  person: { name: "Persona Prueba", role: "SUPERVISOR", jobTitle: "Supervisor" },
  metrics: { visibleIdeas: 18, openIdeas: 7, pendingDecisions: 2, kaizenTasks: 3, genbaTasks: 4 },
  memberships: [{ unit: "Producción P1", plant: "Apodaca", manager: "Gerente Prueba", managerTitle: "Gerente de Operaciones" }],
  routes: [{ unit: "Producción P1", reviewer: "Jefe de Turno", reviewerTitle: "Jefe de Turno" }],
  recentIdeas: [{ id: "idea-1", folio: "IDM-001", area: "P1", status: "En implementación" }],
  kaizenTasks: [{ id: "k-1", projectId: "kp-1", project: "KAI-001 · Flujo", title: "Medir tiempo", status: "PENDIENTE" }],
  genbaTasks: [{ id: "g-1", walkId: "gw-1", walk: "GENBA-001 · P1", title: "Corregir señal", status: "EN_PROCESO" }]
};

const cases = [
  ["¿Qué tengo pendiente?", "2 decisiones pendientes", "/seguimientos?vista=mias"],
  ["Dime mis tareas vencidas", "3 actividades Kaizen", "/seguimientos?vista=mias"],
  ["¿Quién es mi jefe directo?", "Gerente Prueba", "/seguimientos?vista=mias"],
  ["¿Cuál es mi ruta de autorización?", "Jefe de Turno", "/seguimientos?vista=mias"],
  ["Muéstrame mis Kaizen", "KAI-001", "/seguimientos?vista=mias&modulo=kaizen"],
  ["¿Tengo proyectos kaizen?", "3 actividades Kaizen", "/kaizen"],
  ["¿Cómo van mis recorridos GENBA?", "GENBA-001", "/seguimientos?vista=mias&modulo=genba"],
  ["Quiero revisar gemba", "4 actividades GENBA", "/genba"],
  ["Enséñame las ideas de mejora", "18 ideas", "/seguimientos?modulo=ideas"],
  ["¿Qué puedes hacer?", "Puedo ayudarte", "/seguimientos?vista=mias"]
] as const;

for (const [question, expectedText, expectedLink] of cases) {
  const result = answerFromContext(question, context);
  assert.match(result.answer, new RegExp(expectedText, "i"), question);
  assert.ok(result.links.some((link) => link.href === expectedLink), `${question}: enlace esperado ${expectedLink}`);
}

console.log(JSON.stringify({ ok: true, conversations: cases.length }, null, 2));
