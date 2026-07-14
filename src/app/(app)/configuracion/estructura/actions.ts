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
      details: { plant: plant.code, code: input.code, qrEnabled: input.qrEnabled, routingUserId: routingUser?.id ?? null }
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
