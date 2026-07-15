import { PrismaClient, ApprovalStatus, IdeaStatus, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";
import { managerialEvaluationFactors } from "../src/lib/managerial-evaluation";

const prisma = new PrismaClient();

const password = "admin123";

async function user(email: string, name: string, role: Parameters<typeof prisma.user.upsert>[0]["create"]["role"]) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, active: true, passwordHash },
    create: { email, name, role, passwordHash, active: true }
  });
}

async function idea(input: {
  folio: string;
  areaId: string;
  supervisorId: string;
  status: IdeaStatus;
  collaboratorName: string;
  employeeNumber?: string;
  problem: string;
  proposal: string;
  impactsQuality?: boolean;
  impactsSafety?: boolean;
  requiresMaintenance?: boolean;
  priority?: Priority;
  dueDate?: Date;
  pointsAssigned?: number;
  rejectionReason?: string;
}) {
  return prisma.idea.upsert({
    where: { folio: input.folio },
    update: {},
    create: {
      folio: input.folio,
      collaboratorName: input.collaboratorName,
      collaboratorEmail: `${input.collaboratorName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@propex.local`,
      employeeNumber: input.employeeNumber ?? null,
      areaId: input.areaId,
      shift: "Matutino",
      problem: input.problem,
      proposal: input.proposal,
      expectedBenefit: "Reducir retrabajos y mejorar el control operativo.",
      impactTypes: JSON.stringify(["Seguridad", "Calidad/Inocuidad", "Productividad"].filter((_, index) => index !== 0 || input.impactsSafety)),
      impactsQuality: input.impactsQuality ?? false,
      impactsSafety: input.impactsSafety ?? false,
      requiresMaintenance: input.requiresMaintenance ?? false,
      status: input.status,
      supervisorId: input.supervisorId,
      priority: input.priority ?? null,
      dueDate: input.dueDate ?? null,
      implementedAt: ["IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA"].includes(input.status) ? new Date() : null,
      closedAt: input.status === "CERRADA" ? new Date() : null,
      pointsAssigned: input.pointsAssigned ?? 0,
      rejectionReason: input.rejectionReason ?? null,
      mcComments: "Dato demo creado para validar dashboard y flujo."
    }
  });
}

async function main() {
  const admin = await user("admin@propEx.local", "Administrador PROpEx", "ADMIN");
  const mc = await user("mc@propEx.local", "Mejora Continua", "MEJORA_CONTINUA");
  const calidad = await user("calidad@propEx.local", "Calidad/Inocuidad", "CALIDAD");
  const seguridad = await user("seguridad@propEx.local", "Seguridad Industrial", "SEGURIDAD");
  const mantenimiento = await user("mantenimiento@propEx.local", "Mantenimiento", "MANTENIMIENTO");

  const supervisors = [];
  for (let index = 1; index <= 9; index += 1) {
    supervisors.push(await user(`supervisor.p${index}@propEx.local`, `Supervisor P${index}`, "SUPERVISOR"));
  }

  const areas = [];
  for (let index = 1; index <= 9; index += 1) {
    const code = `P${index}`;
    const area = await prisma.area.upsert({
      where: { code },
      update: { name: `Area ${code}`, supervisorId: supervisors[index - 1].id, active: true },
      create: {
        code,
        name: `Area ${code}`,
        supervisorId: supervisors[index - 1].id,
        active: true
      }
    });
    areas.push(area);
  }

  const pointRules = [
    ["Idea registrada correctamente", "Registro completo con problema y propuesta claros.", 2],
    ["Idea aprobada por supervisor", "La idea supera el filtro inicial del area.", 5],
    ["Idea validada por areas soporte", "Calidad, Seguridad o Mantenimiento validaron segun aplique.", 8],
    ["Idea implementada", "La accion fue ejecutada en piso o proceso.", 10],
    ["Idea cerrada con evidencia", "Cierre con evidencia despues.", 10],
    ["Idea replicable a otra area", "Puede aplicarse en mas de una linea o area.", 8],
    ["Idea con impacto en seguridad", "Reduce una condicion insegura o riesgo ergonomico.", 10],
    ["Idea con impacto en inocuidad", "Reduce riesgo de producto, limpieza, empaque o trazabilidad.", 10],
    ["Idea con ahorro comprobado", "Incluye beneficio economico verificable.", 15]
  ] as const;

  for (const [name, description, points] of pointRules) {
    await prisma.pointRule.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name, description, points, active: true }
    });
  }

  for (const factor of managerialEvaluationFactors) {
    await prisma.pointRule.upsert({
      where: { id: factor.ruleId },
      update: { name: factor.ruleName, description: factor.description, points: factor.maxPoints },
      create: { id: factor.ruleId, name: factor.ruleName, description: factor.description, points: factor.maxPoints, active: true }
    });
  }

  await prisma.setting.upsert({
    where: { key: "supportEmails" },
    update: { value: JSON.stringify({ calidad: calidad.email, seguridad: seguridad.email, mantenimiento: mantenimiento.email, mejoraContinua: mc.email }) },
    create: {
      key: "supportEmails",
      value: JSON.stringify({ calidad: calidad.email, seguridad: seguridad.email, mantenimiento: mantenimiento.email, mejoraContinua: mc.email })
    }
  });

  await prisma.setting.upsert({
    where: { key: "appName" },
    update: { value: "SISTEMA DE IDEAS DE MEJORA - PROpEx" },
    create: { key: "appName", value: "SISTEMA DE IDEAS DE MEJORA - PROpEx" }
  });

  const demoIdeas = [
    await idea({
      folio: "IM-000001",
      areaId: areas[0].id,
      supervisorId: supervisors[0].id,
      status: "REGISTRADA",
      collaboratorName: "Laura Gomez",
      employeeNumber: "1001",
      problem: "El material de limpieza se queda fuera de su punto asignado.",
      proposal: "Colocar tablero visual con sombras y responsables por turno.",
      impactsQuality: true
    }),
    await idea({
      folio: "IM-000002",
      areaId: areas[1].id,
      supervisorId: supervisors[1].id,
      status: "EN_REVISION_SUPERVISOR",
      collaboratorName: "Marco Ruiz",
      employeeNumber: "1002",
      problem: "Se duplican registros manuales de temperatura.",
      proposal: "Unificar formato y colocar lector compartido.",
      impactsQuality: true
    }),
    await idea({
      folio: "IM-000003",
      areaId: areas[2].id,
      supervisorId: supervisors[2].id,
      status: "EN_VALIDACION_CALIDAD",
      collaboratorName: "Ana Lopez",
      employeeNumber: "1003",
      problem: "El flujo de charolas genera cruces en cambio de turno.",
      proposal: "Separar entrada y salida con senalizacion y mesa de espera.",
      impactsQuality: true,
      impactsSafety: true
    }),
    await idea({
      folio: "IM-000004",
      areaId: areas[3].id,
      supervisorId: supervisors[3].id,
      status: "APROBADA_PARA_IMPLEMENTAR",
      collaboratorName: "Jose Martinez",
      employeeNumber: "1004",
      problem: "La herramienta de ajuste no tiene ubicacion fija.",
      proposal: "Instalar base marcada junto al equipo.",
      impactsSafety: true,
      requiresMaintenance: true,
      priority: "MEDIA"
    }),
    await idea({
      folio: "IM-000005",
      areaId: areas[4].id,
      supervisorId: supervisors[4].id,
      status: "EN_IMPLEMENTACION",
      collaboratorName: "Sofia Perez",
      employeeNumber: "1005",
      problem: "Hay recorridos innecesarios para surtir etiquetas.",
      proposal: "Crear punto de reposicion cercano con maximos y minimos.",
      priority: "ALTA",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)
    }),
    await idea({
      folio: "IM-000006",
      areaId: areas[5].id,
      supervisorId: supervisors[5].id,
      status: "CERRADA",
      collaboratorName: "Daniel Castro",
      employeeNumber: "1006",
      problem: "Los formatos terminados se mezclaban con pendientes.",
      proposal: "Separar charolas y usar codificacion de color.",
      priority: "BAJA",
      pointsAssigned: 35
    }),
    await idea({
      folio: "IM-000007",
      areaId: areas[6].id,
      supervisorId: supervisors[6].id,
      status: "RECHAZADA_SUPERVISOR",
      collaboratorName: "Patricia Nunez",
      employeeNumber: "1007",
      problem: "Solicita cambiar frecuencia de sanitizacion sin validacion.",
      proposal: "Reducir de cada turno a diaria.",
      impactsQuality: true,
      rejectionReason: "No viable por requisitos de inocuidad y limpieza."
    }),
    await idea({
      folio: "IM-000008",
      areaId: areas[7].id,
      supervisorId: supervisors[7].id,
      status: "VENCIDA",
      collaboratorName: "Ramon Silva",
      employeeNumber: "1008",
      problem: "Guardas visuales de una estacion estan desgastadas.",
      proposal: "Reponer guardas e incluir inspeccion semanal.",
      impactsSafety: true,
      requiresMaintenance: true,
      priority: "CRITICA",
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
    })
  ];

  for (const demoIdea of demoIdeas) {
    if (["EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"].includes(demoIdea.status)) {
      await prisma.approval.upsert({
        where: { ideaId_type: { ideaId: demoIdea.id, type: "CALIDAD" } },
        update: {},
        create: { ideaId: demoIdea.id, type: "CALIDAD", assignedToId: calidad.id, status: "PENDING" }
      });
      await prisma.approval.upsert({
        where: { ideaId_type: { ideaId: demoIdea.id, type: "SEGURIDAD" } },
        update: {},
        create: { ideaId: demoIdea.id, type: "SEGURIDAD", assignedToId: seguridad.id, status: "PENDING" }
      });
    }

    if (demoIdea.status === "CERRADA") {
      const rules = await prisma.pointRule.findMany({ where: { active: true }, take: 4 });
      for (const rule of rules) {
        await prisma.ideaPointRule.upsert({
          where: { ideaId_pointRuleId: { ideaId: demoIdea.id, pointRuleId: rule.id } },
          update: {},
          create: { ideaId: demoIdea.id, pointRuleId: rule.id, points: rule.points }
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        entity: "Idea",
        entityId: demoIdea.id,
        action: "SEED_DEMO_DATA",
        userId: admin.id,
        details: JSON.stringify({ folio: demoIdea.folio, status: demoIdea.status })
      }
    });
  }

  await prisma.notificationOutbox.create({
    data: {
      ideaId: demoIdeas[0].id,
      channel: "EMAIL",
      to: supervisors[0].email,
      subject: "Nueva idea de mejora pendiente de revision - Folio IM-000001 - Area P1",
      body: "Notificacion demo en fallback local porque Microsoft Graph no esta configurado.",
      status: "PENDING"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
