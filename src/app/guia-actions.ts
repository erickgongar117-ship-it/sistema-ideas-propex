"use server";

import { requiereConfirmacionHumana, type GuiaSugerencia } from "@/lib/guia-clasificacion";
import { leerSolicitud } from "@/lib/guia-modelo";
import { areasDisponibles, escalonesDeArea, type GuiaArea, type GuiaEscalon } from "@/lib/guia-ruta";

/**
 * Los pasos de la Guia PROpEx, del lado del servidor.
 *
 * La conversacion es corta y termina en un resumen que la persona confirma. Quien lee lo que
 * escribio es Claude (guia-modelo.ts): entiende el habla de piso y redacta el problema y la
 * propuesta en claro. Si no hay llave o el proveedor falla, cae solo a las reglas de
 * guia-clasificacion.ts y la Guia sigue sirviendo.
 *
 * El enrutamiento no pasa por el modelo: sale de la estructura organizacional que ya esta en
 * la base. Quien revisa una idea no es cosa de adivinar.
 *
 * Esto vive en una accion de servidor y no en una ruta de API porque no necesita ser publico
 * para nadie mas que para la propia pagina, y asi no hay un endpoint abierto que mantener.
 *
 * Sin sesion: corre en la pagina publica. No devuelve nombres de personas —solo puestos— ni
 * escribe nada. El registro lo hace submitIdeaAction al final, con las validaciones de
 * siempre; la Guia solo prepara el formulario.
 */

export type GuiaAnalisis = {
  sugerencia: GuiaSugerencia;
  /** Cuando es true, la propuesta se registra marcada y alguien la confirma despues. */
  necesitaConfirmacion: boolean;
  /** Que sigue preguntando la Guia. */
  siguientePregunta: string | null;
  areas: GuiaArea[];
  escalones: GuiaEscalon[];
  /** Redaccion propuesta para el formulario, para que el supervisor lea algo claro. */
  borrador: { problema: string; propuesta: string; beneficio: string };
  /** "modelo" cuando entendio Claude, "reglas" cuando cayo a la red de respaldo. */
  motor: "modelo" | "reglas";
};

const LIMITE_TEXTO = 1500;

export async function analizarSolicitudAction(input: {
  texto: string;
  areaCode?: string;
  marcaSeguridad?: boolean;
  marcaCalidad?: boolean;
}): Promise<GuiaAnalisis> {
  const texto = String(input.texto ?? "").trim().slice(0, LIMITE_TEXTO);

  // La lectura y la estructura son independientes, asi que van en paralelo: el modelo tarda
  // segundos y no tiene por que sumarse al tiempo de las consultas.
  const [lectura, areas, escalones] = await Promise.all([
    leerSolicitud(texto),
    areasDisponibles(),
    input.areaCode ? escalonesDeArea(input.areaCode) : Promise.resolve([])
  ]);

  return {
    sugerencia: lectura.sugerencia,
    necesitaConfirmacion: requiereConfirmacionHumana(lectura.sugerencia),
    // La pregunta del modelo gana a la generica: esta escrita sobre lo que la persona conto.
    siguientePregunta: lectura.pregunta || siguientePregunta(lectura.sugerencia, input.areaCode, escalones),
    areas,
    escalones,
    borrador: { problema: lectura.problema, propuesta: lectura.propuesta, beneficio: lectura.beneficio },
    motor: lectura.motor
  };
}

/**
 * Una sola pregunta a la vez, y en el orden en que importa.
 *
 * Primero entender que paso, luego donde, luego quien revisa. Preguntar el area antes de
 * saber si el tema siquiera va por aqui haria que alguien llenara tres campos para que al
 * final la Guia le dijera que su tramite es de Recursos Humanos.
 */
function siguientePregunta(sugerencia: GuiaSugerencia, areaCode: string | undefined, escalones: GuiaEscalon[]): string | null {
  if (sugerencia.categoria === "NO_ES_CAPTURA") return null;
  if (sugerencia.confianza === 0) return "Cuentame con tus palabras que viste o que te esta estorbando.";
  if (sugerencia.faltantes.includes("Que propones hacer")) return "¿Que se te ocurre que podria hacerse?";
  if (!areaCode) return "¿En que area pasa esto?";
  if (escalones.length > 1) return "¿Quien te revisa normalmente?";
  return null;
}

