import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrganizationNode, OrganizationStructure, PlantCode } from "@/lib/organization-types";

type SeedNode = {
  code: string;
  name: string;
  type: "MACROPROCESO" | "DEPARTAMENTO" | "AREA" | "PROCESO";
  responsible: string;
  manager: string;
  qrEnabled?: boolean;
  captureAreaCode?: string;
  routingRole?: Role;
  children?: SeedNode[];
};

const pAreas: SeedNode[] = Array.from({ length: 9 }, (_, index) => ({
  code: `APO-P${index + 1}`,
  captureAreaCode: `P${index + 1}`,
  name: `P${index + 1}`,
  type: "AREA",
  responsible: `Supervisor P${index + 1}`,
  manager: "Jefatura de Produccion",
  qrEnabled: true
}));

const seedPlants: Array<{ code: PlantCode; name: string; nodes: SeedNode[] }> = [
  {
    code: "APO",
    name: "Planta Apodaca",
    nodes: [
      {
        code: "APO-VAL",
        name: "Cadena de valor",
        type: "MACROPROCESO",
        responsible: "Gerencia de Operaciones",
        manager: "Direccion de Planta",
        children: [{
          code: "APO-PROD",
          name: "Produccion y Valor Agregado",
          type: "DEPARTAMENTO",
          responsible: "Jefatura de Produccion",
          manager: "Gerencia de Operaciones",
          children: pAreas
        }]
      },
      {
        code: "APO-SOP",
        name: "Areas de soporte y gestion",
        type: "MACROPROCESO",
        responsible: "Direccion de Planta",
        manager: "Direccion General",
        children: [
          {
            code: "APO-LOG",
            name: "Logistica",
            type: "DEPARTAMENTO",
            responsible: "Jefatura de Logistica",
            manager: "Gerencia de Logistica",
            children: [
              { code: "APO-LOG-SEC", name: "Almacen de secos", type: "PROCESO", responsible: "Supervisor de Almacen", manager: "Jefatura de Logistica", qrEnabled: true },
              { code: "APO-LOG-REC", name: "Recibo", type: "PROCESO", responsible: "Supervisor de Recibo", manager: "Jefatura de Logistica", qrEnabled: true },
              { code: "APO-LOG-EMB", name: "Embarques", type: "PROCESO", responsible: "Supervisor de Embarques", manager: "Jefatura de Logistica", qrEnabled: true },
              { code: "APO-LOG-TRA", name: "Trafico", type: "PROCESO", responsible: "Responsable de Trafico", manager: "Gerencia de Logistica", qrEnabled: true },
              { code: "APO-LOG-TAR", name: "Tarimas", type: "PROCESO", responsible: "Responsable por asignar", manager: "Jefatura de Logistica", qrEnabled: true }
            ]
          },
          { code: "APO-MC", name: "Mejora Continua", type: "DEPARTAMENTO", responsible: "Equipo de Mejora Continua (2 personas)", manager: "Gerencia de Mejora Continua", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "APO-PROY", name: "Proyectos", type: "DEPARTAMENTO", responsible: "Responsable de Proyectos", manager: "Gerencia de Proyectos", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "APO-CAL", name: "Calidad e Inocuidad", type: "DEPARTAMENTO", responsible: "Jefatura de Calidad", manager: "Gerencia de Calidad", qrEnabled: true, routingRole: "CALIDAD" },
          { code: "APO-MAN", name: "Mantenimiento y Servicios", type: "DEPARTAMENTO", responsible: "Jefatura de Mantenimiento", manager: "Gerencia de Mantenimiento", qrEnabled: true, routingRole: "MANTENIMIENTO" },
          { code: "APO-SEG", name: "Seguridad, Salud y Ambiente", type: "DEPARTAMENTO", responsible: "Responsable de Seguridad", manager: "Gerencia responsable", qrEnabled: true, routingRole: "SEGURIDAD" }
        ]
      }
    ]
  },
  {
    code: "CAR",
    name: "Planta El Carmen",
    nodes: [
      {
        code: "CAR-VAL",
        name: "Cadena de valor",
        type: "MACROPROCESO",
        responsible: "Gerencia de Operaciones El Carmen",
        manager: "Direccion de Planta",
        children: [{ code: "CAR-PROD", name: "Produccion y Operaciones", type: "DEPARTAMENTO", responsible: "Jefatura de Produccion El Carmen", manager: "Gerencia de Operaciones El Carmen", qrEnabled: true }]
      },
      {
        code: "CAR-SOP",
        name: "Areas de soporte y gestion",
        type: "MACROPROCESO",
        responsible: "Direccion de Planta",
        manager: "Direccion General",
        children: [
          {
            code: "CAR-LOG",
            name: "Logistica",
            type: "DEPARTAMENTO",
            responsible: "Jefatura de Logistica El Carmen",
            manager: "Gerencia de Logistica",
            children: [
              { code: "CAR-LOG-ALM", name: "Almacen", type: "PROCESO", responsible: "Supervisor de Almacen", manager: "Jefatura de Logistica El Carmen", qrEnabled: true },
              { code: "CAR-LOG-EMB", name: "Embarques", type: "PROCESO", responsible: "Supervisor de Embarques", manager: "Jefatura de Logistica El Carmen", qrEnabled: true }
            ]
          },
          { code: "CAR-MC", name: "Mejora Continua", type: "DEPARTAMENTO", responsible: "Responsable por asignar", manager: "Gerencia de Mejora Continua", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "CAR-PROY", name: "Proyectos", type: "DEPARTAMENTO", responsible: "Responsable de Proyectos", manager: "Gerencia de Proyectos", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "CAR-CAL", name: "Calidad e Inocuidad", type: "DEPARTAMENTO", responsible: "Jefatura de Calidad El Carmen", manager: "Gerencia de Calidad", qrEnabled: true, routingRole: "CALIDAD" },
          { code: "CAR-MAN", name: "Mantenimiento y Servicios", type: "DEPARTAMENTO", responsible: "Jefatura de Mantenimiento El Carmen", manager: "Gerencia de Mantenimiento", qrEnabled: true, routingRole: "MANTENIMIENTO" }
        ]
      }
    ]
  }
];

async function createSeedNode(input: { plantId: string; parentId: string | null; node: SeedNode; sortOrder: number }) {
  const captureCode = input.node.captureAreaCode ?? input.node.code;
  let captureArea = input.node.qrEnabled ? await prisma.area.findUnique({ where: { code: captureCode } }) : null;
  let routingUserId = captureArea?.supervisorId ?? null;

  if (!routingUserId && input.node.routingRole) {
    routingUserId = (await prisma.user.findFirst({ where: { role: input.node.routingRole, active: true }, orderBy: { createdAt: "asc" } }))?.id ?? null;
  }

  if (input.node.qrEnabled) {
    captureArea = captureArea
      ? await prisma.area.update({ where: { id: captureArea.id }, data: { active: true, ...(routingUserId && !captureArea.supervisorId ? { supervisorId: routingUserId } : {}) } })
      : await prisma.area.create({ data: { code: captureCode, name: input.node.name, active: true, supervisorId: routingUserId } });
  }

  const unit = await prisma.orgUnit.upsert({
    where: { code: input.node.code },
    update: {},
    create: {
      plantId: input.plantId,
      parentId: input.parentId,
      type: input.node.type,
      code: input.node.code,
      name: input.node.name,
      responsible: input.node.responsible,
      manager: input.node.manager,
      routingUserId,
      captureAreaId: captureArea?.id ?? null,
      qrEnabled: Boolean(input.node.qrEnabled),
      active: true,
      sortOrder: input.sortOrder
    }
  });

  for (const [index, child] of (input.node.children ?? []).entries()) {
    await createSeedNode({ plantId: input.plantId, parentId: unit.id, node: child, sortOrder: index });
  }
}

export async function ensureOrganizationStructure() {
  if (await prisma.orgUnit.count()) return;

  for (const plantInput of seedPlants) {
    const plant = await prisma.plant.upsert({
      where: { code: plantInput.code },
      update: { name: plantInput.name, active: true },
      create: { code: plantInput.code, name: plantInput.name, active: true }
    });
    for (const [index, node] of plantInput.nodes.entries()) {
      await createSeedNode({ plantId: plant.id, parentId: null, node, sortOrder: index });
    }
  }
}

function buildTree(flatNodes: Omit<OrganizationNode, "children">[]): OrganizationNode[] {
  const nodes = new Map(flatNodes.map((node) => [node.id, { ...node, children: [] as OrganizationNode[] }]));
  const roots: OrganizationNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (items: OrganizationNode[]) => {
    items.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "es"));
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

export async function getOrganizationStructure(): Promise<OrganizationStructure> {
  await ensureOrganizationStructure();
  const plants = await prisma.plant.findMany({
    where: { code: { in: ["APO", "CAR"] } },
    include: {
      orgUnits: {
        include: { routingUser: true, captureArea: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }
    }
  });

  const entries = plants.map((plant) => [plant.code, {
    id: plant.id,
    code: plant.code,
    name: plant.name,
    active: plant.active,
    nodes: buildTree(plant.orgUnits.map((unit) => ({
      id: unit.id,
      plantId: unit.plantId,
      parentId: unit.parentId,
      name: unit.name,
      type: unit.type,
      code: unit.code,
      responsible: unit.responsible,
      manager: unit.manager,
      routingUserId: unit.routingUserId,
      routingUser: unit.routingUser ? { id: unit.routingUser.id, name: unit.routingUser.name, email: unit.routingUser.email, role: unit.routingUser.role } : null,
      captureArea: unit.captureArea ? { id: unit.captureArea.id, code: unit.captureArea.code, active: unit.captureArea.active, supervisorId: unit.captureArea.supervisorId } : null,
      qrEnabled: unit.qrEnabled,
      active: unit.active,
      sortOrder: unit.sortOrder
    })))
  }]);

  return Object.fromEntries(entries) as OrganizationStructure;
}
