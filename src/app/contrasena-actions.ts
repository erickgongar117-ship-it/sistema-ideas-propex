"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { roleHomePath } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

/**
 * Cambio de contrasena propia.
 *
 * Por que existe: al arrancar, 200 de las 205 cuentas activas compartian la contrasena de la
 * semilla. El login promete que "el acceso y las acciones quedan registrados", y con una
 * contrasena comun cualquiera podia aprobar ideas o repartir ProbocaCoins a nombre de otro:
 * la bitacora dejaba de probar nada. Esto convierte esa contrasena en temporal.
 *
 * Vive fuera de src/app/actions.ts porque ese archivo pasa de cinco mil lineas y tiene
 * trabajo de otro frente sin cerrar.
 */

const MINIMO = 8;

/**
 * Reglas deliberadamente humanas: largo minimo y que no sea una de las obvias.
 *
 * Nada de exigir mayuscula, numero y simbolo. Esto lo usa gente en piso, muchas veces desde
 * el telefono y con guantes; las reglas barrocas no producen contrasenas mas seguras, solo
 * contrasenas apuntadas en un papel pegado al monitor.
 */
function revisar(nueva: string, repetida: string, correo: string) {
  if (nueva.length < MINIMO) return `La contrasena necesita al menos ${MINIMO} caracteres.`;
  if (nueva !== repetida) return "Las dos contrasenas no coinciden.";
  const prohibidas = ["admin123", "12345678", "propex123", "proboca123", correo.split("@")[0]?.toLowerCase()];
  if (prohibidas.includes(nueva.toLowerCase())) return "Esa contrasena es demasiado facil de adivinar. Elige otra.";
  return null;
}

export async function cambiarContrasenaAction(formData: FormData) {
  const user = await requireUser();
  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  const repetida = String(formData.get("repetida") ?? "");

  // La contrasena de ahora solo se pide cuando el cambio es voluntario. En el forzado, la
  // persona acaba de escribirla en el login y ademas es la temporal que todos conocen:
  // volver a pedirla no protege de nada y solo agrega un paso.
  if (!user.mustChangePassword) {
    if (!actual || !(await bcrypt.compare(actual, user.passwordHash))) {
      redirect("/cambiar-contrasena?error=actual");
    }
  }

  const problema = revisar(nueva, repetida, user.email);
  if (problema) redirect(`/cambiar-contrasena?error=${encodeURIComponent(problema)}`);

  if (await bcrypt.compare(nueva, user.passwordHash)) {
    redirect("/cambiar-contrasena?error=" + encodeURIComponent("Esa ya es tu contrasena actual. Elige una distinta."));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(nueva, 10), mustChangePassword: false }
  });
  // Sin detalles: la bitacora registra que cambio, nunca el valor ni una pista de el.
  await prisma.auditLog.create({
    data: { entity: "User", entityId: user.id, action: "PASSWORD_CHANGED", userId: user.id, details: "{}" }
  });

  redirect(roleHomePath(user.role));
}
