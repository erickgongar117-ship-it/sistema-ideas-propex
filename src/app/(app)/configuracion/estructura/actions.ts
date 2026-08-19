"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import type { OrganizationActionResult } from "@/lib/organization-types";
import { prisma } from "@/lib/prisma";

const unitSchema = z.object({
  unitId: z.string().trim().optional(),
  plantId: z.string().trim().min(1),
  parentId: z.string().trim().optional(),
  type: z.enum(["MACROPROCESO", "DEPARTAMENTO", "AREA", "PROCESO"]),
  name: z.string().trim().min(2, "Escribe un nombre de al menos 2 caracteres."),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,32}$/, "Usa un codigo de 2 a 32 caracteres, sin espacios."),
  responsible: z.string().trim().min(2, "Indica el responsable o puesto."),
  manager: z.string().trim().min(2, "Indica el jefe directo o gerente."),
  routingUserId: z.string().trim().optional(),
  qrEnabled: z.boolean(),
  isSupportArea: z.boolean(),
  active: z.boolean()
});

const plantSchema = z.object({
  plantId: z.string().trim().optional(),
  name: z.string().trim().min(2, "Escribe el nombre de la planta."),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/, "Usa un codigo de 2 a 12 caracteres, sin espacios."),
  active: z.boolean()
});

const membershipSchema = z.object({
  membershipId: z.string().trim().optional(),
  orgUnitId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  title: z.string().trim().min(2, "Indica el puesto de la persona."),
  level: z.number().int().min(0).max(99),
  managerMembershipId: z.string().trim().optional(),
  canReviewTeam: z.boolean(),
  canReceiveIdeas: z.boolean(),
  canManageActivities: z.boolean(),
  setAsRoute: z.boolean(),
  active: z.boolean()
});

const escalationSchema = z.object({
  ruleId: z.string().trim().optional(),
  orgUnitId: z.string().trim().min(1),
  // El nombre dejo de pedirse en pantalla: repetia lo que ya dice "quien reporta".
  // Si llega vacio se arma solo, mas abajo, con la etiqueta y la circunstancia.
  name: z.string().trim().optional(),
  submitterLabel: z.string().trim().min(2, "Indica quien inicia esta ruta."),
  circumstance: z.string().trim().optional(),
  submitterLevel: z.number().int().min(0).max(99),
  reviewerMembershipId: z.string().trim().min(1),
  isDefault: z.boolean(),
  active: z.boolean()
});

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isChecked(formData: FormData, key: string) {
  return ["on", "true", "1", "yes", "si"].includes(value(formData, key).toLowerCase());
}

function refreshOrganizationPaths(captureCodes: string[] = []) {
  revalidatePath("/configuracion/estructura");
  revalidatePath("/configuracion");
  revalidatePath("/qr");
  for (const code of captureCodes) revalidatePath(`/captura/${code}`);
}

function createsReportingCycle(
  membershipId: string,
  managerMembershipId: string,
  memberships: Array<{ id: string; managerMembershipId: string | null }>
) {
  const managerByMembership = new Map(memberships.map((membership) => [membership.id, membership.managerMembershipId]));
  managerByMembership.set(membershipId, managerMembershipId);

  const visited = new Set<string>();
  let currentId: string | null = membershipId;
  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = managerByMembership.get(currentId) ?? null;
  }
  return false;
}

export async function saveOrganizationUnitAction(formData: FormData): Promise<OrganizationActionResult> {
  const admin = await requireUser(["ADMIN"]);
  const parsed = unitSchema.safeParse({
    unitId: value(formData, "unitId") || undefined,
    plantId: value(formData, "plantId"),
    parentId: value(formData, "parentId") || undefined,
    type: value(formData, "type"),
    name: value(formData, "name"),
    code: value(formData, "code"),
    responsible: value(formData, "responsible"),
    manager: value(formData, "manager"),
    routingUserId: value(formData, "routingUserId") || undefined,
    qrEnabled: isChecked(formData, "qrEnabled"),
    isSupportArea: isChecked(formData, "isSupportArea"),
    active: isChecked(formData, "active")
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos capturados." };
  }

  const input = parsed.data;
  const plant = await prisma.plant.findUnique({ where: { id: input.plantId } });
  if (!plant) return { ok: false, message: "La planta seleccionada ya no existe." };

  const parent = input.parentId ? await prisma.orgUnit.findUnique({ where: { id: input.parentId } }) : null;
  if (input.parentId && (!parent || parent.plantId !== plant.id)) {
    return { ok: false, message: "El departamento superior no pertenece a la planta seleccionada." };
  }

  const routingUser = input.routingUserId
    ? await prisma.user.findFirst({ where: { id: input.routingUserId, active: true } })
    : null;
  if (input.routingUserId && !routingUser) {
    return { ok: false, message: "El usuario responsable no existe o esta inactivo." };
  }

  const duplicate = await prisma.orgUnit.findFirst({
    where: { code: input.code, ...(input.unitId ? { id: { not: input.unitId } } : {}) }
  });
  if (duplicate) return { ok: false, message: `El codigo ${input.code} ya esta asignado a ${duplicate.name}.` };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = input.unitId
        ? await tx.orgUnit.findUnique({ where: { id: input.unitId }, include: { captureArea: true } })
        : null;
      if (input.unitId && !existing) throw new Error("UNIT_NOT_FOUND");
      if (existing && existing.plantId !== plant.id) throw new Error("PLANT_MISMATCH");

      let captureArea = existing?.captureArea ?? null;
      const oldCaptureCode = captureArea?.code ?? null;

      if (input.qrEnabled) {
        if (!captureArea) {
          const availableArea = await tx.area.findUnique({ where: { code: input.code } });
          if (availableArea) {
            const linkedUnit = await tx.orgUnit.findFirst({ where: { captureAreaId: availableArea.id } });
            if (linkedUnit && linkedUnit.id !== existing?.id) throw new Error("AREA_ALREADY_LINKED");
          }
          captureArea = availableArea
            ? await tx.area.update({ where: { id: availableArea.id }, data: { name: input.name, active: input.active, supervisorId: routingUser?.id ?? null } })
            : await tx.area.create({ data: { code: input.code, name: input.name, active: input.active, supervisorId: routingUser?.id ?? null } });
        } else {
          const captureCode = existing && captureArea.code === existing.code ? input.code : captureArea.code;
          captureArea = await tx.area.update({
            where: { id: captureArea.id },
            data: { code: captureCode, name: input.name, active: input.active, supervisorId: routingUser?.id ?? null }
          });
        }
      } else if (captureArea) {
        captureArea = await tx.area.update({ where: { id: captureArea.id }, data: { active: false, supervisorId: routingUser?.id ?? captureArea.supervisorId } });
      }

      const commonData = {
        plantId: plant.id,
        parentId: parent?.id ?? null,
        type: input.type,
        code: input.code,
        name: input.name,
        responsible: input.responsible,
        manager: input.manager,
        routingUserId: routingUser?.id ?? null,
        qrEnabled: input.qrEnabled,
        isSupportArea: input.isSupportArea,
        active: input.active,
        ...(captureArea ? { captureAreaId: captureArea.id } : {})
      };

      const unit = existing
        ? await tx.orgUnit.update({ where: { id: existing.id }, data: commonData })
        : await tx.orgUnit.create({
          data: {
            ...commonData,
            sortOrder: await tx.orgUnit.count({ where: { plantId: plant.id, parentId: parent?.id ?? null } })
          }
        });

      return { unit, captureCode: captureArea?.code ?? null, oldCaptureCode };
    });

    await auditLog({
      entity: "OrgUnit",
      entityId: result.unit.id,
      action: input.unitId ? "ORG_UNIT_UPDATED" : "ORG_UNIT_CREATED",
      userId: admin.id,
      details: { plant: plant.code, code: input.code, qrEnabled: input.qrEnabled, isSupportArea: input.isSupportArea, routingUserId: routingUser?.id ?? null }
    });
    refreshOrganizationPaths([result.oldCaptureCode, result.captureCode].filter((code): code is string => Boolean(code)));

    const routingMessage = input.qrEnabled && !routingUser
      ? " El QR quedo activo, pero debes asignar un usuario para que reciba las ideas y correos."
      : "";
    return { ok: true, message: `${input.name} se guardo correctamente en ${plant.name}.${routingMessage}` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, message: "El codigo o el area de captura ya esta en uso." };
    }
    if (error instanceof Error && error.message === "AREA_ALREADY_LINKED") {
      return { ok: false, message: "Esa area de captura ya esta vinculada con otro elemento de la estructura." };
    }
    if (error instanceof Error && ["UNIT_NOT_FOUND", "PLANT_MISMATCH"].includes(error.message)) {
      return { ok: false, message: "El elemento que intentas modificar ya no esta disponible." };
    }
    console.error("saveOrganizationUnitAction", error);
    return { ok: false, message: "No pudimos guardar la estructura. Intenta nuevamente." };
  }
}

export async function savePlantAction(formData: FormData): Promise<OrganizationActionResult> {
  const admin = await requireUser(["ADMIN"]);
  const parsed = plantSchema.safeParse({
    plantId: value(formData, "plantId") || undefined,
    name: value(formData, "name"),
    code: value(formData, "code"),
    active: isChecked(formData, "active")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos de la planta." };

  const duplicate = await prisma.plant.findFirst({
    where: { code: parsed.data.code, ...(parsed.data.plantId ? { id: { not: parsed.data.plantId } } : {}) }
  });
  if (duplicate) return { ok: false, message: `El codigo ${parsed.data.code} ya pertenece a ${duplicate.name}.` };

  const plant = parsed.data.plantId
    ? await prisma.plant.update({ where: { id: parsed.data.plantId }, data: { name: parsed.data.name, code: parsed.data.code, active: parsed.data.active } })
    : await prisma.plant.create({ data: { name: parsed.data.name, code: parsed.data.code, active: parsed.data.active } });
  await auditLog({ entity: "Plant", entityId: plant.id, action: parsed.data.plantId ? "PLANT_UPDATED" : "PLANT_CREATED", userId: admin.id, details: { code: plant.code } });
  refreshOrganizationPaths();
  return { ok: true, message: `${plant.name} quedo disponible para configurar areas y responsables.` };
}

export async function saveMembershipAction(formData: FormData): Promise<OrganizationActionResult> {
  const admin = await requireUser(["ADMIN"]);
  const parsed = membershipSchema.safeParse({
    membershipId: value(formData, "membershipId") || undefined,
    orgUnitId: value(formData, "orgUnitId"),
    userId: value(formData, "userId"),
    title: value(formData, "title"),
    level: Number(value(formData, "level") || 0),
    managerMembershipId: value(formData, "managerMembershipId") || undefined,
    canReviewTeam: isChecked(formData, "canReviewTeam"),
    canReceiveIdeas: isChecked(formData, "canReceiveIdeas"),
    canManageActivities: isChecked(formData, "canManageActivities"),
    setAsRoute: isChecked(formData, "setAsRoute"),
    active: isChecked(formData, "active")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos de la persona." };
  const input = parsed.data;
  const [unit, person, manager, existingMembership, hierarchyMemberships] = await Promise.all([
    prisma.orgUnit.findUnique({ where: { id: input.orgUnitId }, include: { captureArea: true, plant: true } }),
    prisma.user.findFirst({ where: { id: input.userId, active: true } }),
    input.managerMembershipId
      ? prisma.orgMembership.findUnique({
          where: { id: input.managerMembershipId },
          include: { user: true, orgUnit: { include: { plant: true } } }
        })
      : null,
    input.membershipId
      ? prisma.orgMembership.findUnique({
          where: { id: input.membershipId },
          include: {
            orgUnit: true,
            escalationAssignments: {
              where: { active: true },
              select: { id: true, name: true, orgUnit: { select: { plantId: true, name: true } } }
            }
          }
        })
      : null,
    prisma.orgMembership.findMany({ select: { id: true, managerMembershipId: true } })
  ]);
  if (!unit || !person) return { ok: false, message: "El area o la persona seleccionada ya no esta disponible." };
  if (input.membershipId && !existingMembership) return { ok: false, message: "La asignacion que intentas modificar ya no existe." };
  if (input.managerMembershipId && !manager) return { ok: false, message: "El jefe directo seleccionado ya no existe." };
  if (manager && (!manager.active || !manager.user.active || !manager.orgUnit.active || !manager.orgUnit.plant.active)) {
    return { ok: false, message: "El jefe directo seleccionado esta inactivo. Activa su usuario, planta, area y membresia antes de asignarlo." };
  }
  if (manager && manager.orgUnit.plantId !== unit.plantId) {
    return { ok: false, message: `El jefe directo pertenece a ${manager.orgUnit.plant.name}; selecciona una jefatura de ${unit.plant.name}.` };
  }
  if (manager && manager.userId === input.userId) {
    return { ok: false, message: "Una persona no puede ser su propio jefe directo, aunque tenga otra asignacion en la estructura." };
  }
  if (
    input.membershipId &&
    input.managerMembershipId &&
    createsReportingCycle(input.membershipId, input.managerMembershipId, hierarchyMemberships)
  ) {
    return { ok: false, message: "Esta jefatura formaria un ciclo: alguno de los superiores termina reportando nuevamente a esta persona." };
  }
  if (input.setAsRoute && (!input.active || !input.canReceiveIdeas)) {
    return { ok: false, message: "Para usar esta persona como ruta, activa su membresia y el permiso para recibir ideas." };
  }
  if (input.setAsRoute && (!unit.active || !unit.plant.active)) {
    return { ok: false, message: "Activa la planta y el area antes de configurar una ruta de ideas." };
  }

  const activeRoutes = existingMembership?.escalationAssignments ?? [];
  if (activeRoutes.length && (!input.active || !input.canReceiveIdeas)) {
    return {
      ok: false,
      message: `Esta persona participa en ${activeRoutes.length} ruta${activeRoutes.length === 1 ? " activa" : "s activas"}. Reasigna esas rutas antes de desactivarla o quitarle el permiso para recibir ideas.`
    };
  }
  const crossPlantRoute = activeRoutes.find((route) => route.orgUnit.plantId !== unit.plantId);
  if (crossPlantRoute) {
    return { ok: false, message: `La ruta ${crossPlantRoute.name} pertenece al area ${crossPlantRoute.orgUnit.name} de otra planta. Reasignala antes de mover esta membresia.` };
  }
  if (
    existingMembership &&
    existingMembership.orgUnit.routingUserId === existingMembership.userId &&
    (!input.active || !input.canReceiveIdeas || input.userId !== existingMembership.userId || input.orgUnitId !== existingMembership.orgUnitId)
  ) {
    return { ok: false, message: "Esta persona es la ruta directa de su area. Asigna primero otro responsable que este activo y pueda recibir ideas." };
  }

  try {
    const membership = await prisma.$transaction(async (tx) => {
      const data = {
        userId: input.userId,
        orgUnitId: input.orgUnitId,
        title: input.title,
        level: input.level,
        managerMembershipId: input.managerMembershipId ?? null,
        canReviewTeam: input.canReviewTeam,
        canReceiveIdeas: input.canReceiveIdeas,
        canManageActivities: input.canManageActivities,
        active: input.active
      };
      const saved = input.membershipId
        ? await tx.orgMembership.update({ where: { id: input.membershipId }, data })
        : await tx.orgMembership.create({ data: { ...data, sortOrder: await tx.orgMembership.count({ where: { orgUnitId: input.orgUnitId } }) } });

      if (input.setAsRoute) {
        await tx.orgUnit.update({ where: { id: unit.id }, data: { routingUserId: person.id } });
        if (unit.captureAreaId) await tx.area.update({ where: { id: unit.captureAreaId }, data: { supervisorId: person.id } });
      }
      return saved;
    });
    await auditLog({ entity: "OrgMembership", entityId: membership.id, action: input.membershipId ? "MEMBERSHIP_UPDATED" : "MEMBERSHIP_CREATED", userId: admin.id, details: { orgUnitId: unit.id, userId: person.id, title: input.title } });
    refreshOrganizationPaths(unit.captureArea ? [unit.captureArea.code] : []);
    return { ok: true, message: `${person.name} quedo configurado como ${input.title} en ${unit.name}.` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, message: `${person.name} ya pertenece a esta area. Edita su registro existente.` };
    console.error("saveMembershipAction", error);
    return { ok: false, message: "No pudimos guardar a la persona en esta area." };
  }
}

export async function saveEscalationRuleAction(formData: FormData): Promise<OrganizationActionResult> {
  const admin = await requireUser(["ADMIN"]);
  const parsed = escalationSchema.safeParse({
    ruleId: value(formData, "ruleId") || undefined,
    orgUnitId: value(formData, "orgUnitId"),
    name: value(formData, "name"),
    submitterLabel: value(formData, "submitterLabel"),
    circumstance: value(formData, "circumstance") || undefined,
    submitterLevel: Number(value(formData, "submitterLevel") || 0),
    reviewerMembershipId: value(formData, "reviewerMembershipId"),
    isDefault: isChecked(formData, "isDefault"),
    active: isChecked(formData, "active")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa la ruta de escalamiento." };
  const input = parsed.data;
  const [unit, reviewer] = await Promise.all([
    prisma.orgUnit.findUnique({ where: { id: input.orgUnitId }, include: { captureArea: true, plant: true } }),
    prisma.orgMembership.findUnique({
      where: { id: input.reviewerMembershipId },
      include: { user: true, orgUnit: { include: { plant: true } } }
    })
  ]);
  if (!unit || !reviewer) return { ok: false, message: "El area o la persona revisora ya no esta disponible." };
  if (!unit.active || !unit.plant.active) return { ok: false, message: "Activa la planta y el area antes de configurar una ruta." };
  if (!reviewer.active || !reviewer.user.active || !reviewer.orgUnit.active || !reviewer.orgUnit.plant.active) {
    return { ok: false, message: "La persona revisora esta inactiva. Activa su usuario, planta, area y membresia antes de asignarla." };
  }
  if (reviewer.orgUnit.plantId !== unit.plantId) {
    return { ok: false, message: `La persona revisora pertenece a ${reviewer.orgUnit.plant.name}; esta ruta solo puede usar responsables de ${unit.plant.name}.` };
  }
  if (!reviewer.canReceiveIdeas) {
    return { ok: false, message: "La persona revisora no tiene permiso para recibir ideas. Activa ese permiso en su asignacion antes de crear la ruta." };
  }
  if (input.isDefault && !input.active) {
    return { ok: false, message: "Una ruta predeterminada debe estar activa. Activa la ruta o desmarca la opcion predeterminada." };
  }

  const rule = await prisma.$transaction(async (tx) => {
    if (input.isDefault) await tx.orgEscalationRule.updateMany({ where: { orgUnitId: input.orgUnitId }, data: { isDefault: false } });
    const data = {
      orgUnitId: input.orgUnitId,
      name: input.name && input.name.length >= 2
        ? input.name
        : [input.submitterLabel, input.circumstance].filter(Boolean).join(" · "),
      submitterLabel: input.submitterLabel,
      circumstance: input.circumstance ?? null,
      submitterLevel: input.submitterLevel,
      reviewerMembershipId: input.reviewerMembershipId,
      isDefault: input.isDefault,
      active: input.active
    };
    const saved = input.ruleId
      ? await tx.orgEscalationRule.update({ where: { id: input.ruleId }, data })
      : await tx.orgEscalationRule.create({ data: { ...data, sortOrder: await tx.orgEscalationRule.count({ where: { orgUnitId: input.orgUnitId } }) } });
    if (input.isDefault) {
      await tx.orgUnit.update({ where: { id: input.orgUnitId }, data: { routingUserId: reviewer.userId } });
      if (unit.captureAreaId) await tx.area.update({ where: { id: unit.captureAreaId }, data: { supervisorId: reviewer.userId } });
    }
    return saved;
  });
  await auditLog({ entity: "OrgEscalationRule", entityId: rule.id, action: input.ruleId ? "ESCALATION_UPDATED" : "ESCALATION_CREATED", userId: admin.id, details: { orgUnitId: unit.id, reviewerId: reviewer.userId, submitterLabel: input.submitterLabel } });
  refreshOrganizationPaths(unit.captureArea ? [unit.captureArea.code] : []);
  return { ok: true, message: `Ruta guardada: ${input.submitterLabel} enviara sus ideas a ${reviewer.user.name}.` };
}

export async function deleteEscalationRuleAction(formData: FormData): Promise<OrganizationActionResult> {
  const admin = await requireUser(["ADMIN"]);
  const ruleId = value(formData, "ruleId");
  const rule = await prisma.orgEscalationRule.findUnique({ where: { id: ruleId }, include: { orgUnit: { include: { captureArea: true } } } });
  if (!rule) return { ok: false, message: "La ruta ya no existe." };
  await prisma.orgEscalationRule.delete({ where: { id: rule.id } });
  await auditLog({ entity: "OrgEscalationRule", entityId: rule.id, action: "ESCALATION_DELETED", userId: admin.id, details: { name: rule.name } });
  refreshOrganizationPaths(rule.orgUnit.captureArea ? [rule.orgUnit.captureArea.code] : []);
  return { ok: true, message: `La ruta ${rule.name} fue eliminada.` };
}

export async function deleteMembershipAction(formData: FormData): Promise<OrganizationActionResult> {
  const admin = await requireUser(["ADMIN"]);
  const membershipId = value(formData, "membershipId");
  const membership = await prisma.orgMembership.findUnique({ where: { id: membershipId }, include: { user: true, orgUnit: { include: { captureArea: true } } } });
  if (!membership) return { ok: false, message: "La asignacion ya no existe." };
  await prisma.$transaction(async (tx) => {
    await tx.orgMembership.delete({ where: { id: membership.id } });
    if (membership.orgUnit.routingUserId === membership.userId) {
      await tx.orgUnit.update({ where: { id: membership.orgUnitId }, data: { routingUserId: null } });
      if (membership.orgUnit.captureAreaId) await tx.area.update({ where: { id: membership.orgUnit.captureAreaId }, data: { supervisorId: null } });
    }
  });
  await auditLog({ entity: "OrgMembership", entityId: membership.id, action: "MEMBERSHIP_DELETED", userId: admin.id, details: { userId: membership.userId, orgUnitId: membership.orgUnitId } });
  refreshOrganizationPaths(membership.orgUnit.captureArea ? [membership.orgUnit.captureArea.code] : []);
  return { ok: true, message: `${membership.user.name} fue retirado de ${membership.orgUnit.name}.` };
}

function descendantIds(rootId: string, units: Array<{ id: string; parentId: string | null }>) {
  const result = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const unit of units) {
      if (unit.parentId && result.has(unit.parentId) && !result.has(unit.id)) {
        result.add(unit.id);
        changed = true;
      }
    }
  }
  return [...result];
}

export async function deleteOrganizationUnitAction(formData: FormData): Promise<OrganizationActionResult> {
  await requireUser(["ADMIN"]);
  const unitId = value(formData, "unitId");
  const confirmation = value(formData, "confirmation").toUpperCase();
  const unit = await prisma.orgUnit.findUnique({ where: { id: unitId }, include: { plant: true } });
  if (!unit) return { ok: false, message: "El elemento ya no existe." };
  if (confirmation !== unit.code.toUpperCase()) return { ok: false, message: `Escribe ${unit.code} para confirmar la eliminacion.` };
  const units = await prisma.orgUnit.findMany({ where: { plantId: unit.plantId }, select: { id: true, parentId: true, captureAreaId: true } });
  const ids = descendantIds(unit.id, units);
  const areaIds = units.filter((item) => ids.includes(item.id) && item.captureAreaId).map((item) => item.captureAreaId as string);
  const ideaCount = areaIds.length ? await prisma.idea.count({ where: { areaId: { in: areaIds } } }) : 0;
  if (ideaCount) return { ok: false, message: `Hay ${ideaCount} ideas vinculadas. Eliminalas desde Control de datos antes de borrar esta estructura.` };
  await prisma.$transaction(async (tx) => {
    await tx.orgUnit.deleteMany({ where: { id: { in: ids } } });
    if (areaIds.length) await tx.area.deleteMany({ where: { id: { in: areaIds } } });
  });
  refreshOrganizationPaths();
  return { ok: true, message: `${unit.name} y sus subdivisiones fueron eliminados definitivamente.` };
}

export async function deletePlantAction(formData: FormData): Promise<OrganizationActionResult> {
  await requireUser(["ADMIN"]);
  const plantId = value(formData, "plantId");
  const confirmation = value(formData, "confirmation").toUpperCase();
  const plant = await prisma.plant.findUnique({ where: { id: plantId }, include: { orgUnits: { select: { captureAreaId: true } } } });
  if (!plant) return { ok: false, message: "La planta ya no existe." };
  if (confirmation !== plant.code.toUpperCase()) return { ok: false, message: `Escribe ${plant.code} para confirmar la eliminacion.` };
  const areaIds = plant.orgUnits.map((unit) => unit.captureAreaId).filter((id): id is string => Boolean(id));
  const ideaCount = areaIds.length ? await prisma.idea.count({ where: { areaId: { in: areaIds } } }) : 0;
  if (ideaCount) return { ok: false, message: `Hay ${ideaCount} ideas de esta planta. Usa Control de datos antes de eliminarla.` };
  await prisma.$transaction(async (tx) => {
    await tx.plant.delete({ where: { id: plant.id } });
    if (areaIds.length) await tx.area.deleteMany({ where: { id: { in: areaIds } } });
  });
  refreshOrganizationPaths();
  return { ok: true, message: `${plant.name} fue eliminada definitivamente.` };
}
