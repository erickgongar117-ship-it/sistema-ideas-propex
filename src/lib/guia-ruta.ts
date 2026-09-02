import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Lo que la Guia PROpEx necesita saber de la organizacion, y nada mas.
 *
 * La Guia corre en la pagina publica, sin sesion. Eso obliga a una regla que atraviesa todo
 * este archivo: **nunca sale un nombre de persona, solo el puesto**. "Supervisor de muslo",
 * no "Jose Miguel Cerda". La pagina de captura ya funciona asi desde que se separaron las
 * lineas de P1, y la Guia se sujeta a lo mismo: para enrutar basta el puesto, y publicar el
 * directorio de la planta en una pagina abierta no aporta nada a quien reporta.
 *
 * No hay logica de enrutamiento nueva aqui. La ruta real la resuelve submitIdeaAction con la
 * regla de escalacion que traiga el formulario; esto solo ayuda a la persona a elegir bien el
 * area y el escalon antes de enviar. Duplicar el enrutamiento habria creado dos verdades que
 * se separan con el tiempo.
 */

export type GuiaArea = {
  code: string;
  name: string;
  planta: string;
};

export type GuiaEscalon = {
  id: string;
  /** Como se describe quien reporta: "Personal operativo o colaborador". */
  quienReporta: string;
  /** El puesto que recibe. Nunca el nombre de la persona. */
  puestoQueRecibe: string;
  esPrincipal: boolean;
};

/**
 * Areas donde se puede capturar, agrupadas por planta.
 *
 * Solo las que tienen QR habilitado y responsable resuelto: ofrecer un area sin revisor
 * activo manda a la persona a un callejon sin salida, y ese es exactamente el problema de los
 * ocho codigos que hoy dicen "Captura temporalmente pausada".
 */
export async function areasDisponibles(): Promise<GuiaArea[]> {
  const unidades = await prisma.orgUnit.findMany({
    where: {
      active: true,
      qrEnabled: true,
      plant: { active: true },
      captureArea: { is: { active: true } },
      escalationRules: {
        some: { active: true, reviewerMembership: { is: { active: true, user: { is: { active: true, role: { not: "DIRECCION" } } } } } }
      }
    },
    select: { name: true, plant: { select: { name: true } }, captureArea: { select: { code: true, name: true } } },
    orderBy: [{ plantId: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return unidades
    .filter((unidad) => unidad.captureArea)
    .map((unidad) => ({ code: unidad.captureArea!.code, name: unidad.name, planta: unidad.plant.name }));
}

/**
 * Los escalones de un area, descritos por puesto.
 *
 * Se excluye a Direccion igual que en submitIdeaAction: una idea de piso no arranca en la
 * mesa de un director. Si las dos listas se separaran, la Guia ofreceria una ruta que la
 * accion despues rechaza, y la persona perderia lo que escribio.
 */
export async function escalonesDeArea(areaCode: string): Promise<GuiaEscalon[]> {
  const area = await prisma.area.findFirst({
    where: { code: areaCode, active: true },
    select: { organizationUnit: { select: { id: true } } }
  });
  if (!area?.organizationUnit) return [];

  const reglas = await prisma.orgEscalationRule.findMany({
    where: {
      orgUnitId: area.organizationUnit.id,
      active: true,
      reviewerMembership: { is: { active: true, user: { is: { active: true, role: { not: "DIRECCION" } } } } }
    },
    select: { id: true, submitterLabel: true, isDefault: true, reviewerMembership: { select: { title: true } } },
    orderBy: [{ sortOrder: "asc" }, { submitterLevel: "asc" }]
  });

  return reglas.map((regla) => ({
    id: regla.id,
    quienReporta: regla.submitterLabel,
    puestoQueRecibe: regla.reviewerMembership.title,
    esPrincipal: regla.isDefault
  }));
}
