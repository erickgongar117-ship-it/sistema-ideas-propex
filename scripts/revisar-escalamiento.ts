/**
 * Radiografia del enrutamiento de ideas: quien recibe en cada area y donde falta gente.
 *
 * Por que existe: el organigrama real todavia se esta armando, y "no se a quien reporta
 * esta area" no es un problema que se resuelva adivinando. Lo que si se puede es decir con
 * exactitud que le falta a cada area, para que Mejora Continua tenga una lista concreta que
 * ir a preguntar en lugar de descubrir los huecos de uno en uno.
 *
 * Clasifica cada area de captura en tres estados, siguiendo la misma cadena que usa
 * `submitIdeaAction` para decidir a quien le llega una idea:
 *
 *   SIN SALIDA    ni ruta de escalamiento ni supervisor activo. El QR carga y avisa
 *                 "Captura temporalmente pausada": nadie puede registrar nada ahi.
 *   UN PELDANO    hay a quien mandarla, pero quien captura no puede elegir: todos —el
 *                 operador y su propio jefe— caen en la misma persona.
 *   ESCALERA      dos o mas peldanos: cada quien elige el suyo.
 *
 * No escribe nada. Es solo de lectura.
 *
 * Uso:  pnpm run qa:escalamiento
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Fila = {
  codigo: string;
  nombre: string;
  planta: string;
  peldanos: number;
  receptor: string | null;
  fichaJefe: string | null;
};

function imprimir(titulo: string, filas: Fila[], detalle: (fila: Fila) => string) {
  if (!filas.length) return;
  console.log(`\n${titulo}  (${filas.length})`);
  for (const fila of filas) {
    console.log(`  ${fila.planta}/${fila.codigo.padEnd(16)} ${fila.nombre.padEnd(30)} ${detalle(fila)}`);
  }
}

async function main() {
  const areas = await prisma.area.findMany({
    where: { active: true },
    select: {
      code: true,
      name: true,
      supervisor: { select: { name: true, active: true } },
      organizationUnit: {
        select: {
          manager: true,
          plant: { select: { code: true, active: true } },
          // Mismo filtro que la accion de captura: una ruta cuyo revisor esta inactivo no
          // sirve de nada, asi que aqui tampoco cuenta.
          escalationRules: {
            where: { active: true, reviewerMembership: { is: { active: true, user: { is: { active: true } } } } },
            orderBy: { submitterLevel: "asc" },
            select: { submitterLabel: true, reviewerMembership: { select: { user: { select: { name: true } } } } }
          }
        }
      }
    },
    orderBy: { code: "asc" }
  });

  const sinSalida: Fila[] = [];
  const unPeldano: Fila[] = [];
  const conEscalera: Fila[] = [];

  for (const area of areas) {
    if (area.organizationUnit && !area.organizationUnit.plant.active) continue;
    const reglas = area.organizationUnit?.escalationRules ?? [];
    const supervisor = area.supervisor?.active ? area.supervisor.name : null;
    const fila: Fila = {
      codigo: area.code,
      nombre: area.name,
      planta: area.organizationUnit?.plant.code ?? "?",
      peldanos: reglas.length,
      receptor: reglas[0]?.reviewerMembership.user.name ?? supervisor,
      fichaJefe: area.organizationUnit?.manager ?? null
    };
    if (!reglas.length && !supervisor) sinSalida.push(fila);
    else if (reglas.length <= 1) unPeldano.push(fila);
    else conEscalera.push(fila);
  }

  imprimir("SIN SALIDA — el QR carga pero nadie puede registrar", sinSalida, (f) => `falta responsable · ficha dice "${f.fichaJefe ?? "-"}"`);
  imprimir("UN SOLO PELDANO — llega, pero nadie puede elegir a quien", unPeldano, (f) => `todo cae en ${f.receptor}`);
  imprimir("CON ESCALERA — cada quien elige su peldano", conEscalera, (f) => `${f.peldanos} peldanos, empieza en ${f.receptor}`);

  console.log(`\nareas de captura activas ${sinSalida.length + unPeldano.length + conEscalera.length}`);
  console.log(`  sin salida ....... ${sinSalida.length}`);
  console.log(`  un peldano ....... ${unPeldano.length}`);
  console.log(`  con escalera ..... ${conEscalera.length}`);
  if (sinSalida.length) {
    console.log("\nLo urgente son las de arriba: sus QR estan impresos y pegados, y hoy no reciben nada.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
