import {
  GenbaStatus,
  KaizenStatus,
  PrismaClient,
  WorkItemStatus
} from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const dateFromToday = (offset: number) => new Date(Date.now() + offset * DAY);

const kaizenExamples: Array<{
  title: string;
  plant: string;
  area: string;
  objective: string;
  status: KaizenStatus;
  start: number;
  end: number;
  estimatedSavings: number;
  realSavings: number;
  progress: number;
}> = [
  { title: "SMED en cambio de presentación P1", plant: "Apodaca", area: "Producción P1", objective: "Reducir el cambio de presentación de 48 a 28 minutos.", status: "EN_CURSO", start: -92, end: 22, estimatedSavings: 185000, realSavings: 92000, progress: 62 },
  { title: "Control visual de materiales indirectos", plant: "Apodaca", area: "Almacén secos", objective: "Eliminar faltantes y reducir 30% el tiempo de surtido.", status: "PENDIENTE_CHARTER", start: -18, end: 72, estimatedSavings: 68000, realSavings: 0, progress: 0 },
  { title: "Optimización del flujo de empaque P3", plant: "Apodaca", area: "Producción P3", objective: "Incrementar 12% la productividad sin aumentar personal.", status: "EN_CURSO", start: -118, end: 12, estimatedSavings: 245000, realSavings: 198000, progress: 78 },
  { title: "Reducción de merma en corte", plant: "El Carmen", area: "Valor Agregado", objective: "Disminuir la merma del proceso de 4.8% a 3.2%.", status: "PLANIFICACION", start: -24, end: 96, estimatedSavings: 320000, realSavings: 28000, progress: 18 },
  { title: "Estandarización de liberación de calidad", plant: "Apodaca", area: "Calidad e Inocuidad", objective: "Reducir a menos de 20 minutos la liberación de producto.", status: "COMPLETADO", start: -190, end: -52, estimatedSavings: 96000, realSavings: 112000, progress: 100 },
  { title: "Disponibilidad de selladoras críticas", plant: "El Carmen", area: "Mantenimiento", objective: "Elevar la disponibilidad técnica de 89% a 96%.", status: "EN_PAUSA", start: -105, end: 38, estimatedSavings: 410000, realSavings: 120000, progress: 44 },
  { title: "Rutas internas de embarques", plant: "Apodaca", area: "Logística", objective: "Reducir recorridos de montacargas y tiempos de espera en andenes.", status: "EN_CURSO", start: -64, end: 48, estimatedSavings: 155000, realSavings: 54000, progress: 52 },
  { title: "Prevención de atrapamientos en tarimas", plant: "El Carmen", area: "Seguridad", objective: "Eliminar condiciones de atrapamiento en maniobras de tarimas.", status: "EN_CURSO", start: -76, end: 18, estimatedSavings: 75000, realSavings: 61000, progress: 71 },
  { title: "Digitalización de formatos de producción", plant: "Apodaca", area: "Producción P2", objective: "Eliminar captura duplicada y recuperar 18 horas administrativas al mes.", status: "COMPLETADO", start: -220, end: -84, estimatedSavings: 132000, realSavings: 146000, progress: 100 },
  { title: "Balanceo de carga en servicios generales", plant: "El Carmen", area: "Servicios Generales", objective: "Mejorar cobertura de rutinas y reducir pendientes semanales 40%.", status: "EN_CURSO", start: -42, end: 78, estimatedSavings: 84000, realSavings: 19000, progress: 33 }
];

const genbaExamples: Array<{
  area: string;
  visit: number;
  status: GenbaStatus;
  expected: number;
  attended: number;
  completion: number;
}> = [
  { area: "Producción P1", visit: -5, status: "ABIERTO", expected: 7, attended: 6, completion: 35 },
  { area: "Producción P3", visit: -12, status: "ABIERTO", expected: 7, attended: 5, completion: 50 },
  { area: "Almacén secos", visit: -19, status: "ABIERTO", expected: 6, attended: 4, completion: 25 },
  { area: "Mantenimiento", visit: -27, status: "ABIERTO", expected: 5, attended: 5, completion: 60 },
  { area: "Valor Agregado", visit: -36, status: "CERRADO", expected: 7, attended: 7, completion: 100 },
  { area: "Calidad e Inocuidad", visit: -45, status: "ABIERTO", expected: 6, attended: 5, completion: 70 },
  { area: "Embarques", visit: -57, status: "ABIERTO", expected: 7, attended: 4, completion: 20 },
  { area: "Servicios Generales", visit: -69, status: "CERRADO", expected: 5, attended: 5, completion: 100 },
  { area: "Producción P2", visit: -83, status: "ABIERTO", expected: 7, attended: 6, completion: 45 },
  { area: "Seguridad", visit: -105, status: "CERRADO", expected: 6, attended: 6, completion: 100 }
];

function workStatus(index: number, total: number, completion: number, variant: number): WorkItemStatus {
  const closedCount = Math.round((completion / 100) * total);
  if (index < closedCount) return "COMPLETADA";
  if (index === closedCount && completion < 100) return "EN_PROCESO";
  if (index === closedCount + 1 && variant % 3 === 0) return "BLOQUEADA";
  return "PENDIENTE";
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("La carga de ejemplos solo puede ejecutarse contra la base SQLite local.");
  }

  const users = await prisma.user.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });
  if (!users.length) throw new Error("No hay usuarios locales para asignar responsables.");

  await prisma.genbaWalk.deleteMany({ where: { folio: { startsWith: "DEMO-GENBA-" } } });
  await prisma.kaizenProject.deleteMany({ where: { folio: { startsWith: "DEMO-KZN-" } } });

  const kaizenMax = await prisma.kaizenProject.aggregate({ _max: { number: true } });
  const genbaMax = await prisma.genbaWalk.aggregate({ _max: { number: true } });
  const createdKaizenIds: string[] = [];
  const createdGenbaIds: string[] = [];

  for (const [index, example] of kaizenExamples.entries()) {
    const number = (kaizenMax._max.number ?? 0) + index + 1;
    const activityCount = 5 + (index % 3);
    const duration = example.end - example.start;
    const project = await prisma.kaizenProject.create({
      data: {
        number,
        folio: `DEMO-KZN-${String(index + 1).padStart(3, "0")}`,
        title: example.title,
        plant: example.plant,
        area: example.area,
        objective: example.objective,
        scope: "Ejemplo representativo para validar el centro de mando.",
        baselineValue: 100,
        targetValue: 70,
        currentValue: Math.max(70, 100 - Math.round(example.progress * 0.3)),
        unit: "Índice",
        estimatedSavings: example.estimatedSavings,
        realSavings: example.realSavings,
        status: example.status,
        startDate: dateFromToday(example.start),
        endDate: dateFromToday(example.end),
        closedAt: example.status === "COMPLETADO" ? dateFromToday(example.end - 2) : null,
        leaderId: users[index % users.length].id,
        createdById: users[0].id,
        createdAt: dateFromToday(example.start - 7),
        activities: {
          create: Array.from({ length: activityCount }, (_, activityIndex) => {
            const status = workStatus(activityIndex, activityCount, example.progress, index);
            const dueOffset = Math.round(example.start + ((activityIndex + 1) * duration) / (activityCount + 1));
            return {
              number: activityIndex + 1,
              problem: `Oportunidad ${activityIndex + 1} asociada a ${example.area}`,
              action: ["Definir estándar", "Ejecutar prueba piloto", "Validar resultado", "Capacitar al equipo", "Cerrar controles", "Auditar sostenimiento", "Documentar lección"][activityIndex],
              ownerId: activityIndex === activityCount - 1 && index % 4 === 0 ? null : users[(index + activityIndex) % users.length].id,
              startDate: dateFromToday(dueOffset - 14),
              dueDate: dateFromToday(dueOffset),
              status,
              closedAt: status === "COMPLETADA" ? dateFromToday(Math.min(-1, dueOffset + (activityIndex % 3 === 0 ? 2 : -2))) : null,
              createdAt: dateFromToday(example.start)
            };
          })
        },
        ...(example.status === "PENDIENTE_CHARTER" ? {} : {
          attachments: {
            create: {
              type: "CHARTER",
              filename: `project-charter-demo-${index + 1}.pdf`,
              path: "/demo/project-charter.pdf",
              uploadedBy: users[0].email
            }
          }
        })
      }
    });
    createdKaizenIds.push(project.id);
  }

  const departments = ["Producción", "Calidad / Inocuidad", "Mantenimiento", "Seguridad", "Mejora Continua", "Almacén", "Supervisión"];
  for (const [index, example] of genbaExamples.entries()) {
    const number = (genbaMax._max.number ?? 0) + index + 1;
    const activityCount = 5 + (index % 3 === 1 ? 1 : 0);
    const expected = departments.slice(0, example.expected);
    const attended = expected.slice(0, example.attended);
    const walk = await prisma.genbaWalk.create({
      data: {
        number,
        folio: `DEMO-GENBA-${String(index + 1).padStart(3, "0")}`,
        areaName: example.area,
        visitDate: dateFromToday(example.visit),
        expectedDepartments: JSON.stringify(expected),
        attendedDepartments: JSON.stringify(attended),
        notes: "Recorrido de demostración para validar tendencias y seguimiento.",
        status: example.status,
        coordinatorId: users[index % users.length].id,
        createdById: users[0].id,
        closedAt: example.status === "CERRADO" ? dateFromToday(example.visit + 24) : null,
        createdAt: dateFromToday(example.visit),
        activities: {
          create: Array.from({ length: activityCount }, (_, activityIndex) => {
            const status = workStatus(activityIndex, activityCount, example.completion, index + 1);
            const dueOffset = example.visit + 14 + activityIndex * 8;
            return {
              number: activityIndex + 1,
              problem: ["Condición fuera de estándar", "Material sin identificación", "Punto de limpieza pendiente", "Riesgo en recorrido", "Flujo con espera", "Control visual incompleto"][activityIndex],
              action: ["Restablecer condición", "Identificar y delimitar", "Ejecutar limpieza profunda", "Instalar control preventivo", "Balancear el flujo", "Actualizar ayuda visual"][activityIndex],
              ownerId: activityIndex === activityCount - 1 && index % 3 === 0 ? null : users[(index + activityIndex + 1) % users.length].id,
              dueDate: dateFromToday(dueOffset),
              status,
              closedAt: status === "COMPLETADA" ? dateFromToday(Math.min(-1, dueOffset + (activityIndex % 2 ? 1 : -1))) : null,
              createdAt: dateFromToday(example.visit)
            };
          })
        }
      }
    });
    createdGenbaIds.push(walk.id);
  }

  const promotableGenbaActivities = await prisma.genbaActivity.findMany({
    where: { walkId: { in: createdGenbaIds }, status: { not: "COMBINADA" } },
    orderBy: { createdAt: "asc" },
    take: 2
  });
  const targetKaizenActivities = await prisma.kaizenActivity.findMany({
    where: { projectId: { in: createdKaizenIds }, sourceGenbaActivityId: null },
    orderBy: { createdAt: "asc" },
    take: 2
  });
  for (let index = 0; index < Math.min(promotableGenbaActivities.length, targetKaizenActivities.length); index += 1) {
    await prisma.kaizenActivity.update({
      where: { id: targetKaizenActivities[index].id },
      data: { sourceGenbaActivityId: promotableGenbaActivities[index].id }
    });
  }

  console.log(`Ejemplos creados: ${createdKaizenIds.length} Kaizen y ${createdGenbaIds.length} GENBA.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
