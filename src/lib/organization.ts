import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  OrganizationNode,
  OrganizationStructure,
  PlantCode,
  PublicCaptureNode,
  PublicCaptureStructure
} from "@/lib/organization-types";

type SeedNode = {
  code: string;
  name: string;
  type: "MACROPROCESO" | "DEPARTAMENTO" | "AREA" | "PROCESO";
  responsible: string;
  manager: string;
  qrEnabled?: boolean;
  isSupportArea?: boolean;
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
          { code: "APO-MC", name: "Mejora Continua", type: "DEPARTAMENTO", responsible: "Equipo de Mejora Continua (2 personas)", manager: "Gerencia de Mejora Continua", qrEnabled: true, isSupportArea: true, routingRole: "MEJORA_CONTINUA" },
          { code: "APO-PROY", name: "Proyectos", type: "DEPARTAMENTO", responsible: "Responsable de Proyectos", manager: "Gerencia de Proyectos", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "APO-CAL", name: "Calidad e Inocuidad", type: "DEPARTAMENTO", responsible: "Jefatura de Calidad", manager: "Gerencia de Calidad", qrEnabled: true, isSupportArea: true, routingRole: "CALIDAD" },
          { code: "APO-MAN", name: "Mantenimiento y Servicios", type: "DEPARTAMENTO", responsible: "Jefatura de Mantenimiento", manager: "Gerencia de Mantenimiento", qrEnabled: true, isSupportArea: true, routingRole: "MANTENIMIENTO" },
          { code: "APO-SEG", name: "Seguridad, Salud y Ambiente", type: "DEPARTAMENTO", responsible: "Responsable de Seguridad", manager: "Gerencia responsable", qrEnabled: true, isSupportArea: true, routingRole: "SEGURIDAD" }
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
          { code: "CAR-MC", name: "Mejora Continua", type: "DEPARTAMENTO", responsible: "Responsable por asignar", manager: "Gerencia de Mejora Continua", qrEnabled: true, isSupportArea: true, routingRole: "MEJORA_CONTINUA" },
          { code: "CAR-PROY", name: "Proyectos", type: "DEPARTAMENTO", responsible: "Responsable de Proyectos", manager: "Gerencia de Proyectos", qrEnabled: true, routingRole: "MEJORA_CONTINUA" },
          { code: "CAR-CAL", name: "Calidad e Inocuidad", type: "DEPARTAMENTO", responsible: "Jefatura de Calidad El Carmen", manager: "Gerencia de Calidad", qrEnabled: true, isSupportArea: true, routingRole: "CALIDAD" },
          { code: "CAR-MAN", name: "Mantenimiento y Servicios", type: "DEPARTAMENTO", responsible: "Jefatura de Mantenimiento El Carmen", manager: "Gerencia de Mantenimiento", qrEnabled: true, isSupportArea: true, routingRole: "MANTENIMIENTO" }
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
      isSupportArea: Boolean(input.node.isSupportArea),
      active: true,
      sortOrder: input.sortOrder
    }
  });

  for (const [index, child] of (input.node.children ?? []).entries()) {
    await createSeedNode({ plantId: input.plantId, parentId: unit.id, node: child, sortOrder: index });
  }
}

async function ensureDefaultRoutingMemberships() {
  const routedUnits = await prisma.orgUnit.findMany({
    where: { routingUserId: { not: null } },
    include: { escalationRules: true }
  });
  for (const unit of routedUnits) {
    if (!unit.routingUserId) continue;
    const membership = await prisma.orgMembership.upsert({
      where: { userId_orgUnitId: { userId: unit.routingUserId, orgUnitId: unit.id } },
      update: {},
      create: {
        userId: unit.routingUserId,
        orgUnitId: unit.id,
        title: unit.responsible,
        level: 1,
        canReviewTeam: true,
        canReceiveIdeas: true,
        canManageActivities: true,
        active: true
      }
    });
    if (!unit.escalationRules.length) {
      await prisma.orgEscalationRule.create({
        data: {
          orgUnitId: unit.id,
          name: "Ruta principal",
          submitterLabel: "Personal operativo o colaborador",
          circumstance: "Ruta inicial heredada del responsable del QR",
          submitterLevel: 0,
          reviewerMembershipId: membership.id,
          isDefault: true,
          active: true
        }
      });
    }
  }
}

export async function ensureOrganizationStructure() {
  if (await prisma.orgUnit.count()) {
    await prisma.orgUnit.updateMany({
      where: { code: { in: ["APO-MC", "APO-CAL", "APO-MAN", "APO-SEG", "CAR-MC", "CAR-CAL", "CAR-MAN"] } },
      data: { isSupportArea: true }
    });
    await ensureDefaultRoutingMemberships();
    return;
  }

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
  await ensureDefaultRoutingMemberships();
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

/**
 * Estructura para la portada publica y el explorador de captura por QR.
 *
 * Trae SOLO lo que el explorador dibuja. La version completa serializaba cada membresia con
 * nombre, correo, rol y puesto hacia un componente cliente en una pagina anonima: el
 * directorio entero de la plantilla quedaba en el HTML de cualquier visita.
 *
 * Tampoco llama a `ensureOrganizationStructure`: la siembra no debe correr en el camino de
 * lectura publico, donde cada escaneo disparaba escrituras contra la base.
 */
export async function getPublicCaptureStructure(): Promise<PublicCaptureStructure> {
  const plants = await prisma.plant.findMany({
    where: { active: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      active: true,
      orgUnits: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          parentId: true,
          name: true,
          type: true,
          code: true,
          responsible: true,
          qrEnabled: true,
          active: true,
          captureArea: { select: { code: true, active: true } }
        }
      }
    }
  });

  const entries = plants.map((plant) => {
    const byParent = new Map<string | null, typeof plant.orgUnits>();
    for (const unit of plant.orgUnits) {
      const siblings = byParent.get(unit.parentId) ?? [];
      siblings.push(unit);
      byParent.set(unit.parentId, siblings);
    }
    const build = (parentId: string | null): PublicCaptureNode[] =>
      (byParent.get(parentId) ?? []).map((unit) => ({
        id: unit.id,
        name: unit.name,
        type: unit.type,
        code: unit.code,
        responsible: unit.responsible,
        qrEnabled: unit.qrEnabled,
        active: unit.active,
        captureArea: unit.captureArea ? { code: unit.captureArea.code, active: unit.captureArea.active } : null,
        children: build(unit.id)
      }));

    return [plant.code, { id: plant.id, code: plant.code, name: plant.name, active: plant.active, nodes: build(null) }] as const;
  });

  return Object.fromEntries(entries) as PublicCaptureStructure;
}

export async function getOrganizationStructure(): Promise<OrganizationStructure> {
  await ensureOrganizationStructure();
  const plants = await prisma.plant.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      orgUnits: {
        include: {
          routingUser: true,
          captureArea: true,
          memberships: {
            include: { user: true, managerMembership: { include: { user: true } } },
            orderBy: [{ level: "asc" }, { sortOrder: "asc" }]
          },
          escalationRules: {
            include: { reviewerMembership: { include: { user: true } } },
            orderBy: [{ sortOrder: "asc" }, { submitterLevel: "asc" }]
          }
        },
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
      routingUser: unit.routingUser ? { id: unit.routingUser.id, name: unit.routingUser.name, email: unit.routingUser.email, role: unit.routingUser.role, jobTitle: unit.routingUser.jobTitle } : null,
      captureArea: unit.captureArea ? { id: unit.captureArea.id, code: unit.captureArea.code, active: unit.captureArea.active, supervisorId: unit.captureArea.supervisorId } : null,
      qrEnabled: unit.qrEnabled,
      isSupportArea: unit.isSupportArea,
      active: unit.active,
      sortOrder: unit.sortOrder,
      memberships: unit.memberships.map((membership) => ({
        id: membership.id,
        userId: membership.userId,
        orgUnitId: membership.orgUnitId,
        title: membership.title,
        level: membership.level,
        managerMembershipId: membership.managerMembershipId,
        canReviewTeam: membership.canReviewTeam,
        canReceiveIdeas: membership.canReceiveIdeas,
        canManageActivities: membership.canManageActivities,
        active: membership.active,
        sortOrder: membership.sortOrder,
        user: { id: membership.user.id, name: membership.user.name, email: membership.user.email, role: membership.user.role, jobTitle: membership.user.jobTitle },
        managerMembership: membership.managerMembership ? {
          id: membership.managerMembership.id,
          title: membership.managerMembership.title,
          user: {
            id: membership.managerMembership.user.id,
            name: membership.managerMembership.user.name,
            email: membership.managerMembership.user.email,
            role: membership.managerMembership.user.role,
            jobTitle: membership.managerMembership.user.jobTitle
          }
        } : null
      })),
      escalationRules: unit.escalationRules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        submitterLabel: rule.submitterLabel,
        circumstance: rule.circumstance,
        submitterLevel: rule.submitterLevel,
        reviewerMembershipId: rule.reviewerMembershipId,
        isDefault: rule.isDefault,
        active: rule.active,
        sortOrder: rule.sortOrder,
        reviewerMembership: {
          id: rule.reviewerMembership.id,
          title: rule.reviewerMembership.title,
          user: {
            id: rule.reviewerMembership.user.id,
            name: rule.reviewerMembership.user.name,
            email: rule.reviewerMembership.user.email,
            role: rule.reviewerMembership.user.role,
            jobTitle: rule.reviewerMembership.user.jobTitle
          }
        }
      }))
    })))
  }]);

  return Object.fromEntries(entries) as OrganizationStructure;
}
