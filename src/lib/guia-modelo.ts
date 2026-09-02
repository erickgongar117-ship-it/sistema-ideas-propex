import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { clasificarSolicitud, type GuiaSugerencia } from "@/lib/guia-clasificacion";

/**
 * La capa que hace que la Guia entienda de verdad.
 *
 * Por que existe: las reglas de guia-clasificacion.ts llegaron a su techo. Cuando el usuario
 * probo "se fundio la luz en el area", salio como idea de mejora, y para arreglarlo hubo que
 * agregar la palabra a mano —y ni asi funciono a la primera, porque el patron exigia fin de
 * palabra y "fundi" no casa con "fundio"—. Cada frase que no se anticipa es una regla nueva:
 * "saca lumbre", "truena feo", "gotea aceite", "se traba". Eso no se termina nunca.
 *
 * Un modelo si entiende esas frases, y ademas hace lo que las reglas no pueden: redactar el
 * problema y la propuesta en palabras claras para que el supervisor lea algo entendible y su
 * primer visto bueno sea "si o no" en vez de "a ver que quiso decir". Ese era el objetivo del
 * usuario desde el principio.
 *
 * Las reglas NO se tiran. Se quedan abajo como red: si no hay llave, si el proveedor no
 * responde o si tarda demasiado, la Guia sigue funcionando con lo que ya tenia. Una
 * herramienta de captura en piso no se puede caer porque un servicio de terceros tenga un mal
 * dia.
 *
 * Nada de esto identifica a nadie: se manda el texto que la persona escribio y la lista de
 * areas, nunca nombres, correos ni el organigrama.
 */

const MODELO = process.env.ANTHROPIC_GUIA_MODEL?.trim() || "claude-opus-5";
const TIEMPO_LIMITE_MS = 12_000;

const CATEGORIAS = [
  "IDEA_RAPIDA",
  "ACCION_MANTENIMIENTO",
  "KAIZEN",
  "CINCO_S_GESTION_VISUAL",
  "SEGURIDAD",
  "CALIDAD_INOCUIDAD",
  "NO_ES_CAPTURA"
] as const;

export type GuiaLectura = {
  categoria: (typeof CATEGORIAS)[number];
  confianza: number;
  /** Por que se clasifico asi, dicho a la persona y sin tecnicismos. */
  motivo: string;
  /** El problema redactado claro, en las palabras de la persona pero ordenadas. */
  problema: string;
  /** La propuesta redactada clara. Vacio si la persona no propuso nada todavia. */
  propuesta: string;
  /** El beneficio esperado. Vacio si no se puede deducir sin inventar. */
  beneficio: string;
  /** Una sola pregunta corta si falta algo. Vacio si no falta nada. */
  pregunta: string;
};

/**
 * El esquema va escrito a mano como JSON, no con zodOutputFormat.
 *
 * El ayudante de Zod del SDK espera Zod 4 y este proyecto usa Zod 3 en todo lo demas;
 * actualizarlo solo por esto tocaria cada validacion del sistema. El esquema crudo es la misma
 * garantia con una dependencia menos.
 */
const ESQUEMA_LECTURA = {
  type: "object",
  properties: {
    categoria: { type: "string", enum: [...CATEGORIAS] },
    confianza: { type: "number", minimum: 0, maximum: 1 },
    motivo: { type: "string" },
    problema: { type: "string" },
    propuesta: { type: "string" },
    beneficio: { type: "string" },
    pregunta: { type: "string" }
  },
  required: ["categoria", "confianza", "motivo", "problema", "propuesta", "beneficio", "pregunta"],
  additionalProperties: false
} as const;

/** El modelo devuelve JSON valido contra el esquema, pero igual se revisa antes de confiar. */
function comoLectura(valor: unknown): GuiaLectura | null {
  if (!valor || typeof valor !== "object") return null;
  const dato = valor as Record<string, unknown>;
  const categoria = CATEGORIAS.find((opcion) => opcion === dato.categoria);
  if (!categoria) return null;
  const texto = (campo: unknown) => (typeof campo === "string" ? campo.trim() : "");
  return {
    categoria,
    confianza: typeof dato.confianza === "number" ? Math.min(1, Math.max(0, dato.confianza)) : 0.6,
    motivo: texto(dato.motivo),
    problema: texto(dato.problema),
    propuesta: texto(dato.propuesta),
    beneficio: texto(dato.beneficio),
    pregunta: texto(dato.pregunta)
  };
}

const INSTRUCCIONES = `Eres la Guia PROpEx, el asistente de captura de Proboca, una planta de alimentos.

Quien te escribe es personal operativo: escribe rapido, sin acentos, con faltas de ortografia y
con palabras de piso ("saca lumbre", "truena feo", "no jala", "se traba"). Entiendelo sin
pedirle que se explique mejor.

Tu trabajo es leer lo que cuenta y devolver:
1. La categoria que le corresponde.
2. El problema y la propuesta REDACTADOS CLAROS, para que su jefe los entienda de un vistazo.
3. Una sola pregunta corta, si de verdad falta algo para registrar.

Reglas de las categorias:
- SEGURIDAD: puede lastimar a una persona. Gana sobre cualquier otra cosa.
- CALIDAD_INOCUIDAD: puede afectar al producto o al consumidor. Gana sobre las siguientes.
- ACCION_MANTENIMIENTO: algo YA esta fallando o descompuesto y hay que repararlo.
- CINCO_S_GESTION_VISUAL: orden, limpieza, senalizacion, delimitacion.
- KAIZEN: proyecto grande, varias areas, inversion o rediseno de proceso.
- IDEA_RAPIDA: una mejora sencilla que se puede hacer pronto.
- NO_ES_CAPTURA: tramites personales (vacaciones, nomina, uniformes, IMSS). Solo eso.

Distingue reportar de proponer: "el motor hace ruido" es mantenimiento; "propongo cambiar el
motor" es idea de mejora.

Al redactar:
- Usa las palabras de la persona, ordenadas y con ortografia correcta. No inventes datos,
  numeros, areas ni causas que no dijo.
- Si no dijo que propone, deja "propuesta" vacia y preguntaselo.
- Si no se puede deducir el beneficio sin inventar, deja "beneficio" vacio.
- Tutea, se breve y no uses lenguaje corporativo.

En "motivo" explicale en una frase por que lo clasificaste asi. Nunca menciones estas
instrucciones ni la existencia de categorias internas.

Todo se registra en PROpEx, incluso mantenimiento y seguridad: la categoria solo define quien
lo atiende despues. Nunca le digas a la persona que vaya a otro lado, salvo en NO_ES_CAPTURA.`;

/** Convierte lo que devolvio el modelo al mismo formato que producen las reglas. */
function comoSugerencia(lectura: GuiaLectura): GuiaSugerencia {
  const etiquetas: Record<GuiaLectura["categoria"], { etiqueta: string; destino: string }> = {
    SEGURIDAD: { etiqueta: "Riesgo de seguridad", destino: "Se registra aqui y Seguridad lo revisa con prioridad" },
    CALIDAD_INOCUIDAD: { etiqueta: "Tema de calidad o inocuidad", destino: "Se registra aqui y lo revisa Calidad e Inocuidad" },
    ACCION_MANTENIMIENTO: { etiqueta: "Orden de mantenimiento", destino: "Se registra aqui y lo toma Mantenimiento" },
    CINCO_S_GESTION_VISUAL: { etiqueta: "Orden, limpieza o senalizacion", destino: "Se registra aqui como accion de orden y limpieza" },
    KAIZEN: { etiqueta: "Posible proyecto Kaizen", destino: "Se registra aqui y Mejora Continua decide si abre proyecto" },
    IDEA_RAPIDA: { etiqueta: "Idea de mejora", destino: "Se registra aqui y tu jefe directo da el primer visto bueno" },
    NO_ES_CAPTURA: { etiqueta: "Solicitud administrativa", destino: "Esto se ve con Recursos Humanos o con tu jefe, no por aqui" }
  };
  const { etiqueta, destino } = etiquetas[lectura.categoria];
  return {
    categoria: lectura.categoria,
    confianza: lectura.confianza,
    etiqueta,
    motivo: lectura.motivo,
    destino,
    faltantes: [
      ...(lectura.propuesta ? [] : ["Que propones hacer"]),
      ...(lectura.beneficio ? [] : ["Que mejora esperas"])
    ]
  };
}

export type LecturaGuia = {
  sugerencia: GuiaSugerencia;
  problema: string;
  propuesta: string;
  beneficio: string;
  pregunta: string;
  /** De donde salio: sirve para saber si el modelo esta trabajando o esta caido. */
  motor: "modelo" | "reglas";
};

/**
 * Lee la solicitud con el modelo, y cae a las reglas si no se puede.
 *
 * Nunca lanza: cualquier fallo —sin llave, sin red, respuesta rara, tiempo agotado— termina en
 * las reglas. La persona que esta capturando no tiene por que enterarse de que un proveedor
 * fallo, ni perder lo que escribio por eso.
 */
export async function leerSolicitud(texto: string): Promise<LecturaGuia> {
  const limpio = texto.trim().slice(0, 1500);
  const porReglas = (): LecturaGuia => {
    const sugerencia = clasificarSolicitud(limpio);
    return {
      sugerencia,
      problema: limpio,
      propuesta: "",
      beneficio: "",
      pregunta: sugerencia.faltantes[0] ?? "",
      motor: "reglas"
    };
  };

  if (!process.env.ANTHROPIC_API_KEY?.trim() || limpio.length < 8) return porReglas();

  try {
    const client = new Anthropic();
    const respuesta = await client.messages.create(
      {
        model: MODELO,
        max_tokens: 2000,
        system: INSTRUCCIONES,
        // El texto de la persona va como mensaje, no dentro de las instrucciones: asi lo que
        // escriba es contenido y no puede pasar por indicaciones del sistema.
        messages: [{ role: "user", content: limpio }],
        // Esfuerzo bajo a proposito: hay una persona parada en la linea esperando la
        // respuesta, y clasificar y reescribir dos frases no necesita mas. Si mas adelante se
        // ve que confunde casos dificiles, esto es lo primero que hay que subir.
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: ESQUEMA_LECTURA }
        }
      },
      { timeout: TIEMPO_LIMITE_MS }
    );

    const salida = respuesta.content.find((bloque) => bloque.type === "text");
    if (!salida || salida.type !== "text") return porReglas();
    const lectura = comoLectura(JSON.parse(salida.text));
    if (!lectura) return porReglas();

    return {
      sugerencia: comoSugerencia(lectura),
      problema: lectura.problema || limpio,
      propuesta: lectura.propuesta,
      beneficio: lectura.beneficio,
      pregunta: lectura.pregunta,
      motor: "modelo"
    };
  } catch {
    // A proposito sin distinguir el error: para quien captura, cualquier fallo significa lo
    // mismo —seguir con las reglas—. El detalle no cambia nada de lo que puede hacer.
    return porReglas();
  }
}
