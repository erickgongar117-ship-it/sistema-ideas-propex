"use server";

import { clasificarSolicitud, requiereConfirmacionHumana, type GuiaSugerencia } from "@/lib/guia-clasificacion";
import { areasDisponibles, escalonesDeArea, type GuiaArea, type GuiaEscalon } from "@/lib/guia-ruta";

/**
 * Los pasos de la Guia PROpEx, del lado del servidor.
 *
 * La conversacion es corta y con preguntas fijas —que paso, en que area, quien te revisa— y
 * termina en un resumen que la persona confirma. No hay modelo de lenguaje detras: clasificar
 * lo hace guia-clasificacion.ts con reglas y enrutar sale de la estructura organizacional que
 * ya esta en la base. Un modelo, si algun dia se conecta, entraria a redactar mejor el texto
 * y a entender frases que las reglas no anticipan; el flujo no cambia.
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
  borrador: { problema: string; propuesta: string };
};

const LIMITE_TEXTO = 1500;

export async function analizarSolicitudAction(input: {
  texto: string;
  areaCode?: string;
  marcaSeguridad?: boolean;
  marcaCalidad?: boolean;
}): Promise<GuiaAnalisis> {
  const texto = String(input.texto ?? "").trim().slice(0, LIMITE_TEXTO);
  const sugerencia = clasificarSolicitud(texto, {
    marcaSeguridad: input.marcaSeguridad,
    marcaCalidad: input.marcaCalidad
  });

  // Las areas se cargan siempre; los escalones solo cuando ya eligio area, para no traer la
  // estructura entera en cada tecla.
  const [areas, escalones] = await Promise.all([
    areasDisponibles(),
    input.areaCode ? escalonesDeArea(input.areaCode) : Promise.resolve([])
  ]);

  return {
    sugerencia,
    necesitaConfirmacion: requiereConfirmacionHumana(sugerencia),
    siguientePregunta: siguientePregunta(sugerencia, input.areaCode, escalones),
    areas,
    escalones,
    borrador: redactar(texto, sugerencia)
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

/**
 * Separa lo que la persona conto en problema y propuesta.
 *
 * Es a proposito modesto: parte el texto donde aparece el verbo de propuesta y limpia
 * espacios, sin inventar nada. Redactar de verdad —convertir "esta bien feo eso de la banda"
 * en una frase clara— es justo lo que un modelo de lenguaje haria bien y las reglas no,
 * asi que aqui se prefiere devolver las palabras de la persona antes que una version
 * adornada que ella no dijo.
 */
function redactar(texto: string, sugerencia: GuiaSugerencia): { problema: string; propuesta: string } {
  const limpio = texto.replace(/\s+/g, " ").trim();
  const corte = limpio.search(/\b(propongo|sugiero|se podria|deberia|convendria|hay que|estaria bien)\b/i);
  if (corte > 20) {
    return { problema: limpio.slice(0, corte).trim().replace(/[,;]$/, ""), propuesta: limpio.slice(corte).trim() };
  }
  return {
    problema: limpio,
    propuesta: sugerencia.faltantes.includes("Que propones hacer") ? "" : limpio
  };
}
