export type AssistantContext = {
  person: { name: string; role: string; jobTitle: string | null };
  metrics: { visibleIdeas: number; openIdeas: number; pendingDecisions: number; kaizenTasks: number; genbaTasks: number };
  memberships: Array<{ unit: string; plant: string; manager: string | null; managerTitle: string | null }>;
  routes: Array<{ unit: string; reviewer: string; reviewerTitle: string }>;
  recentIdeas: Array<{ id: string; folio: string; area: string; status: string }>;
  kaizenTasks: Array<{ id: string; projectId: string; project: string; title: string; status: string }>;
  genbaTasks: Array<{ id: string; walkId: string; walk: string; title: string; status: string }>;
};

export type AssistantLink = { href: string; label: string };

export function answerFromContext(message: string, context: AssistantContext): { answer: string; links: AssistantLink[] } {
  const normalized = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const { metrics } = context;

  if (/jefe|reporto|ruta|autoriza|autorizacion|escalar/.test(normalized)) {
    const managers = [...new Map(context.memberships.filter((item) => item.manager).map((item) => [item.manager, item])).values()];
    const routeText = context.routes.slice(0, 5).map((route) => `${route.unit}: ${route.reviewer} (${route.reviewerTitle})`).join("\n");
    const managerText = managers.length ? managers.map((item) => `${item.unit}: ${item.manager} (${item.managerTitle ?? "jefe directo"})`).join("\n") : "No encontré un jefe directo asignado en tu estructura.";
    return {
      answer: `Esta es la ruta registrada para ti:\n${managerText}${routeText ? `\n\nRevisores de ideas:\n${routeText}` : ""}\n\nSi algún nombre no corresponde, un administrador debe corregir la membresía o la regla de escalación.`,
      links: context.person.role === "ADMIN"
        ? [{ href: "/configuracion/estructura", label: "Ver estructura" }]
        : [{ href: "/seguimientos?vista=mias", label: "Abrir Mi trabajo" }]
    };
  }
  if (/kaizen/.test(normalized)) {
    const detail = context.kaizenTasks.slice(0, 4).map((task) => `• ${task.project}: ${task.title}`).join("\n");
    return { answer: metrics.kaizenTasks ? `Tienes ${metrics.kaizenTasks} actividades Kaizen abiertas a tu nombre.${detail ? `\n\n${detail}` : ""}` : "No tienes actividades Kaizen abiertas asignadas directamente.", links: [{ href: "/seguimientos?vista=mias&modulo=kaizen", label: "Abrir mis Kaizen" }, { href: "/kaizen", label: "Panel Kaizen" }] };
  }
  if (/genba|gemba|recorrido/.test(normalized)) {
    const detail = context.genbaTasks.slice(0, 4).map((task) => `• ${task.walk}: ${task.title}`).join("\n");
    return { answer: metrics.genbaTasks ? `Tienes ${metrics.genbaTasks} actividades GENBA abiertas a tu nombre.${detail ? `\n\n${detail}` : ""}` : "No tienes actividades GENBA abiertas asignadas directamente.", links: [{ href: "/seguimientos?vista=mias&modulo=genba", label: "Abrir mis GENBA" }, { href: "/genba", label: "Panel GENBA" }] };
  }
  if (/pendiente|que tengo|mi trabajo|vencid|tarea/.test(normalized)) {
    return { answer: `Tu panorama actual:\n• ${metrics.pendingDecisions} decisiones pendientes\n• ${metrics.kaizenTasks} actividades Kaizen abiertas\n• ${metrics.genbaTasks} actividades GENBA abiertas\n• ${metrics.openIdeas} ideas abiertas dentro de tu alcance`, links: [{ href: "/seguimientos?vista=mias", label: "Abrir Mi trabajo" }, { href: "/notificaciones", label: "Ver notificaciones" }] };
  }
  if (/idea|folio|propuesta|mejora/.test(normalized)) {
    const ideas = context.recentIdeas.map((idea) => `• ${idea.folio} · ${idea.area} · ${idea.status}`).join("\n");
    return { answer: `Puedes consultar ${metrics.visibleIdeas} ideas según tus permisos; ${metrics.openIdeas} siguen abiertas.${ideas ? `\n\nActualizadas recientemente:\n${ideas}` : ""}`, links: [{ href: "/seguimientos?modulo=ideas", label: "Seguimiento de ideas" }, { href: "/", label: "Registrar una idea" }] };
  }
  return { answer: `Hola, ${context.person.name.split(" ")[0]}. Puedo ayudarte a consultar tus pendientes, actividades Kaizen o GENBA, ideas visibles y tu ruta de autorización. No realizo cambios sin que abras y confirmes el registro correspondiente.`, links: [{ href: "/seguimientos?vista=mias", label: "Mi trabajo" }] };
}
