/**
 * Marca como temporal toda contrasena que hoy es de dominio publico.
 *
 * Por que existe: al revisar produccion, 200 de las 205 cuentas activas compartian la
 * contrasena de la semilla. El login promete que "el acceso y las acciones quedan
 * registrados", pero con una contrasena comun cualquiera podia aprobar una idea, cerrar una
 * actividad o repartir ProbocaCoins a nombre de otro. La bitacora existia y no probaba nada.
 *
 * Lo que hace: prueba cada cuenta contra la lista de contrasenas conocidas y, a las que
 * coinciden, les enciende mustChangePassword. La siguiente vez que entren, el sistema les
 * pide una propia antes de dejarlas pasar. No cambia ninguna contrasena: nadie se queda
 * fuera, solo se les pide elegir la suya al entrar.
 *
 * A quien NO toca: a quien ya puso una contrasena que no esta en la lista. Ese ya hizo el
 * trabajo y volver a pedirselo seria ruido.
 *
 * Nota sobre las cuentas de buzon funcional (supervisor.muslo@proboca.net y companeras):
 * tienen un hash que nadie conoce, asi que no coinciden con nada y quedan intactas. Siguen
 * sin poder entrar hasta que un administrador les de una temporal desde Configuracion, y esa
 * ya nace marcada.
 *
 * Uso:  node node_modules/tsx/dist/cli.mjs scripts/marcar-contrasenas-temporales.ts            reporta
 *       node node_modules/tsx/dist/cli.mjs scripts/marcar-contrasenas-temporales.ts --aplicar  marca
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

/** Las que se repartieron alguna vez: la semilla y las variantes obvias del arranque. */
const CONOCIDAS = ["admin123", "propex123", "proboca123", "12345678", "Proboca2026"];

async function main() {
  console.log(aplicar ? "APLICANDO\n" : "SIMULACION\n");

  const usuarios = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true, passwordHash: true, mustChangePassword: true }
  });

  const aMarcar: typeof usuarios = [];
  let yaMarcados = 0;
  let propias = 0;

  for (const usuario of usuarios) {
    if (usuario.mustChangePassword) { yaMarcados += 1; continue; }
    const compartida = CONOCIDAS.some((clave) => {
      try { return bcrypt.compareSync(clave, usuario.passwordHash); } catch { return false; }
    });
    if (compartida) aMarcar.push(usuario);
    else propias += 1;
  }

  console.log(`Cuentas activas: ${usuarios.length}`);
  console.log(`  ${String(aMarcar.length).padStart(4)}  con contrasena conocida -> se les pedira una propia al entrar`);
  console.log(`  ${String(propias).padStart(4)}  con contrasena propia -> no se tocan`);
  console.log(`  ${String(yaMarcados).padStart(4)}  ya estaban marcadas`);

  const porRol = aMarcar.reduce<Record<string, number>>((acumulado, usuario) => {
    acumulado[usuario.role] = (acumulado[usuario.role] ?? 0) + 1;
    return acumulado;
  }, {});
  console.log("\nPor rol:");
  Object.entries(porRol).sort((a, b) => b[1] - a[1]).forEach(([rol, cuantos]) => console.log(`  ${String(cuantos).padStart(4)}  ${rol}`));

  if (!aplicar) {
    console.log("\nSimulacion. Vuelve a correr con --aplicar para marcarlas.");
    return;
  }

  const resultado = await prisma.user.updateMany({
    where: { id: { in: aMarcar.map((usuario) => usuario.id) } },
    data: { mustChangePassword: true }
  });
  await prisma.auditLog.create({
    data: {
      entity: "User",
      entityId: "*",
      action: "PASSWORD_ROTATION_REQUIRED",
      details: JSON.stringify({ marcadas: resultado.count, motivo: "contrasena compartida de la semilla" })
    }
  });

  console.log(`\nMarcadas ${resultado.count}.`);
  console.log(`Pendientes de elegir contrasena: ${await prisma.user.count({ where: { active: true, mustChangePassword: true } })}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
