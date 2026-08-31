import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  blocksIdeaClosure,
  buildExecutiveValidationIdeaScope,
  canTargetExecutive,
  isCeoUser
} from "../src/lib/executive-validation-rules";

const prisma = new PrismaClient();
const checks: string[] = [];
class ProbeRollback extends Error {}

function check(condition: unknown, message: string) {
  assert.ok(condition, message);
  checks.push(message);
}

function runPolicyChecks() {
  const manager = { id: "manager", email: "gerencia@proboca.net", role: "GERENTE" as const };
  const director = { id: "director", email: "direccion@proboca.net", role: "DIRECCION" as const, active: true };
  const ceo = { id: "ceo", email: "osbaldo.montano@proboca.net", role: "DIRECCION" as const, active: true };
  const collaborator = { id: "collaborator", email: "persona@proboca.net", role: "COLABORADOR" as const };

  check(canTargetExecutive(manager, director) && canTargetExecutive(manager, ceo), "Gerencia puede solicitar decisión a Dirección o CEO");
  check(canTargetExecutive(director, ceo) && !canTargetExecutive(director, director), "Dirección solo puede solicitar decisión al CEO");
  check(!canTargetExecutive(ceo, director) && !canTargetExecutive(collaborator, ceo), "CEO y personal no ejecutivo no generan escalaciones ejecutivas");
  check(Boolean(buildExecutiveValidationIdeaScope(manager, ["unit-a"])), "Gerencia con alcance puede escalar ideas abiertas de su estructura");
  check(buildExecutiveValidationIdeaScope(manager, []) === null, "Gerencia sin alcance no puede escalar ideas ajenas");
  check(Boolean(buildExecutiveValidationIdeaScope(director)), "Dirección puede escalar una idea abierta al CEO");
  check(buildExecutiveValidationIdeaScope(ceo) === null, "El CEO recibe decisiones y cierra la cadena de escalación");
  check(blocksIdeaClosure("PENDING") && blocksIdeaClosure("MORE_INFO") && blocksIdeaClosure("REJECTED"), "Una decisión ejecutiva no resuelta bloquea el cierre");
  check(!blocksIdeaClosure("APPROVED") && !blocksIdeaClosure("CANCELLED"), "Una decisión aprobada o cancelada libera el cierre");
}

async function main() {
  const directors = await prisma.user.findMany({ where: { active: true, role: "DIRECCION" }, orderBy: { name: "asc" } });
  const [ceo, manager, director, collaborator, idea, storedValidations, operationalDirectorNotices] = await Promise.all([
    prisma.user.findUnique({ where: { email: "osbaldo.montano@proboca.net" } }),
    prisma.user.findFirst({ where: { active: true, role: "GERENTE" }, orderBy: { name: "asc" } }),
    prisma.user.findFirst({ where: { active: true, role: "DIRECCION", email: { not: "osbaldo.montano@proboca.net" } }, orderBy: { name: "asc" } }),
    prisma.user.findFirst({ where: { active: true, role: { notIn: ["GERENTE", "DIRECCION"] } }, orderBy: { name: "asc" } }),
    prisma.idea.findFirst({ select: { id: true } }),
    prisma.executiveValidation.findMany({ include: { requestedBy: true, assignedTo: true } }),
    prisma.notificationOutbox.count({
      where: {
        audience: "OPERATIONAL",
        status: { in: ["PENDING", "ERROR"] },
        OR: directors.map(({ email }) => ({ to: { contains: email } }))
      }
    })
  ]);

  check(Boolean(ceo?.active && ceo.role === "DIRECCION" && isCeoUser(ceo)), "CEO Osbaldo existe, está activo y pertenece a Dirección");
  check(Boolean(manager), "Existe una gerencia activa para probar la política");
  check(Boolean(director), "Existe una dirección distinta del CEO para probar la política");
  check(Boolean(collaborator), "Existe un usuario no ejecutivo para probar denegaciones");
  check(Boolean(idea), "Existe una idea local para probar persistencia transaccional");
  if (!ceo || !manager || !director || !collaborator || !idea) return;

  const managerTargets = directors.filter((target) => canTargetExecutive(manager, target))
    .sort((left, right) => Number(isCeoUser(right)) - Number(isCeoUser(left)) || left.name.localeCompare(right.name, "es"));
  const directorTargets = directors.filter((target) => canTargetExecutive(director, target));
  const ceoTargets = directors.filter((target) => canTargetExecutive(ceo, target));
  const collaboratorTargets = directors.filter((target) => canTargetExecutive(collaborator, target));

  check(managerTargets.length > 1 && managerTargets.every((target) => target.id !== manager.id), "Gerencia puede elegir Dirección o CEO, nunca a sí misma");
  check(isCeoUser(managerTargets[0]), "El CEO aparece primero entre los destinos de una gerencia");
  check(directorTargets.length === 1 && directorTargets[0].id === ceo.id, "Dirección solo puede elegir al CEO Osbaldo");
  check(ceoTargets.length === 0, "El CEO no puede solicitarse una validación a sí mismo");
  check(collaboratorTargets.length === 0, "Usuarios no ejecutivos no reciben destinos ejecutivos");
  check(canTargetExecutive(manager, director) && canTargetExecutive(manager, ceo), "Gerencia puede dirigir una solicitud a Dirección o CEO");
  check(canTargetExecutive(director, ceo) && !canTargetExecutive(director, manager) && !canTargetExecutive(director, director), "Dirección solo puede dirigir una solicitud al CEO");
  check(!canTargetExecutive(collaborator, ceo), "Un usuario no ejecutivo no puede crear solicitudes ejecutivas");
  const managerScope = buildExecutiveValidationIdeaScope(manager, ["qa-unit"]);
  const managerWithoutScope = buildExecutiveValidationIdeaScope(manager, []);
  const directorScope = buildExecutiveValidationIdeaScope(director);
  const ceoScope = buildExecutiveValidationIdeaScope(ceo);
  check(Boolean(managerScope) && JSON.stringify(managerScope).includes("qa-unit"), "Gerencia puede escalar ideas abiertas dentro de su alcance organizacional");
  check(managerWithoutScope === null, "Gerencia sin alcance organizacional no puede escalar ideas ajenas");
  check(Boolean(directorScope), "Dirección puede elevar una idea abierta al CEO");
  check(ceoScope === null, "El CEO recibe decisiones, pero no genera otra escalación ejecutiva");
  check(blocksIdeaClosure("PENDING") && blocksIdeaClosure("MORE_INFO") && blocksIdeaClosure("REJECTED"), "Pendiente, más información y rechazo bloquean el cierre");
  check(!blocksIdeaClosure("APPROVED") && !blocksIdeaClosure("CANCELLED"), "Aprobación o cancelación liberan el cierre");

  const managerialMembership = await prisma.orgMembership.findFirst({
    where: { userId: manager.id, active: true, canReviewTeam: true }
  });
  check(Boolean(managerialMembership), "La gerencia de prueba tiene alcance organizacional para revisar a su equipo");

  const invalidStored = storedValidations.filter((validation) => {
    const assignedIsCeo = isCeoUser(validation.assignedTo);
    return !validation.assignedTo.active || validation.assignedTo.role !== "DIRECCION" ||
      !["GERENTE", "DIRECCION"].includes(validation.requestedBy.role) ||
      validation.requestedById === validation.assignedToId ||
      ((validation.level === "CEO") !== assignedIsCeo) ||
      (validation.requestedBy.role === "DIRECCION" && (isCeoUser(validation.requestedBy) || !assignedIsCeo));
  });
  check(invalidStored.length === 0, "No existen validaciones ejecutivas almacenadas fuera de política");
  check(operationalDirectorNotices === 0, "Dirección conserva cero notificaciones operativas pendientes");

  let probeId = "";
  try {
    await prisma.$transaction(async (transaction) => {
      const probe = await transaction.executiveValidation.create({
        data: {
          ideaId: idea.id,
          requestedById: manager.id,
          assignedToId: ceo.id,
          level: "CEO",
          requestNote: "Prueba transaccional que no debe persistir"
        }
      });
      probeId = probe.id;
      const storedProbe = await transaction.executiveValidation.findUnique({ where: { id: probe.id } });
      check(storedProbe?.status === "PENDING" && storedProbe.level === "CEO", "La solicitud ejecutiva se guarda con destinatario, nivel y estado correctos");
      throw new ProbeRollback();
    });
  } catch (error) {
    if (!(error instanceof ProbeRollback)) throw error;
  }
  check(await prisma.executiveValidation.count({ where: { id: probeId } }) === 0, "La prueba transaccional se revierte sin dejar datos de prueba");

  console.log(JSON.stringify({ ok: true, checks: checks.length, validationsReviewed: storedValidations.length }, null, 2));
}

if (process.argv.includes("--policy-only")) {
  runPolicyChecks();
  console.log(JSON.stringify({ ok: true, checks: checks.length, mode: "policy-only" }, null, 2));
  void prisma.$disconnect();
} else {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
