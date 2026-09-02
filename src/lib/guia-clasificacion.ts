import type { Classification } from "@prisma/client";

/**
 * Motor de la Guia PROpEx: lee lo que la persona escribio y propone que es.
 *
 * Por que existe: hoy quien captura por QR tiene que decidir solo si lo suyo es una idea de
 * mejora, y elegir categoria y apoyo en un formulario. En piso eso se traduce en capturas mal
 * clasificadas —ordenes de mantenimiento entrando como ideas, riesgos de seguridad perdidos
 * entre propuestas— y en supervisores que reciben texto crudo y tienen que descifrarlo antes
 * de aprobar. La Guia propone la clasificacion y redacta claro, para que el primer visto
 * bueno sea "si o no" en vez de "a ver que quiso decir".
 *
 * Dos decisiones de fondo:
 *
 * 1. Usa el enum Classification que ya existe, no una taxonomia paralela. Mejora Continua
 *    clasifica con esos mismos valores al revisar, asi que la sugerencia y la decision final
 *    hablan el mismo idioma y se puede medir si la Guia acierta. Una lista propia habria
 *    obligado a traducir en cada lado y a perder la comparacion.
 *
 * 2. Funciona sin modelo de lenguaje. Estas reglas son la base y siempre corren; un modelo
 *    encima puede redactar mejor y entender frases raras, pero la clasificacion no puede
 *    depender de que haya llave de API, de que responda el proveedor, ni de que alguien
 *    acepte mandar texto de la planta a un tercero. Si el modelo no esta, la Guia sigue.
 *
 * Es a proposito conservadora: ante la duda propone IDEA_RAPIDA con confianza baja y deja que
 * la persona corrija, en vez de mandar con seguridad a la cola equivocada.
 */

export type GuiaCategoria = Classification | "NO_ES_CAPTURA";

export type GuiaSugerencia = {
  categoria: GuiaCategoria;
  /** 0 a 1. Debajo de 0.5 la Guia pregunta en vez de afirmar. */
  confianza: number;
  /** Como se le dice a la persona, en su idioma, no en el del sistema. */
  etiqueta: string;
  /** Por que se propone eso. Se le muestra: sin esto la clasificacion parece arbitraria. */
  motivo: string;
  /** A donde va realmente esto, cuando no es una idea de mejora. */
  destino: string;
  /** Lo que falta preguntar para poder registrar. */
  faltantes: string[];
};

type Regla = {
  categoria: GuiaCategoria;
  etiqueta: string;
  destino: string;
  /** Cada grupo suma; se pide al menos una coincidencia por grupo exigido. */
  senales: RegExp[];
  /** Frases que descartan la regla aunque coincida. */
  descartes?: RegExp[];
  peso: number;
};

/**
 * El orden importa: seguridad y calidad ganan a todo lo demas.
 *
 * Si alguien describe un riesgo de caida y ademas propone una mejora, lo urgente es el
 * riesgo. Mandarlo a la cola de ideas —donde puede esperar semanas a una aprobacion— seria
 * el peor error que puede cometer esta herramienta, asi que esas dos reglas van primero y
 * con peso alto.
 */
const REGLAS: Regla[] = [
  {
    categoria: "SEGURIDAD",
    etiqueta: "Riesgo de seguridad",
    destino: "Seguridad Industrial, para atencion inmediata",
    peso: 3,
    senales: [
      /\b(riesgo|peligro|accidente|lesion|lesionar|golpe|caida|resbal|quemad|atrapamiento|electrocut|chispa|incendio|fuga de gas|amoniaco)\b/,
      /\b(sin guarda|sin proteccion|paro de emergencia|extintor|salida de emergencia|casi me|casi nos)\b/
    ]
  },
  {
    categoria: "CALIDAD_INOCUIDAD",
    etiqueta: "Tema de calidad o inocuidad",
    destino: "Calidad e Inocuidad",
    peso: 3,
    senales: [
      /\b(inocuidad|contaminaci|cuerpo extrano|plaga|fauna nociva|moho|oxido|corrosion|temperatura fuera|cadena de frio)\b/,
      /\b(producto contaminado|material extrano|pelo|metal en|plastico en|vidrio)\b/
    ]
  },
  {
    categoria: "ACCION_MANTENIMIENTO",
    etiqueta: "Orden de mantenimiento",
    destino: "Mantenimiento, como orden de trabajo",
    peso: 2,
    senales: [
      /\b(no (funciona|sirve|enciende|prende|arranca)|descompuest|averiad|fuga|gotea|ruido|vibra|banda rota|motor|rodamiento|balero|soldar|reparar|arreglar|cambiar la pieza|refaccion)\b/
    ],
    // "Proponer que se cambie" es una idea; "esta descompuesto" es una orden de trabajo.
    descartes: [/\b(propongo|sugiero|se podria|estaria bien|convendria)\b/]
  },
  {
    categoria: "CINCO_S_GESTION_VISUAL",
    etiqueta: "Orden, limpieza o senalizacion",
    destino: "Mejora Continua, como accion de 5S",
    peso: 1,
    senales: [/\b(5s|cinco s|orden y limpieza|senaliz|etiquet|delimitar|marcar el piso|acomodar|tablero visual|identificar)\b/]
  },
  {
    categoria: "KAIZEN",
    etiqueta: "Posible proyecto Kaizen",
    destino: "Mejora Continua, para confirmar si abre proyecto",
    peso: 2,
    senales: [
      /\b(proyecto|rediseno|reingenieria|automatiz|linea completa|todo el proceso|varias areas|inversion|cotizar|comprar equipo|layout)\b/,
      /\b(reducir (tiempo|merma|costo)|aumentar (capacidad|productividad)|eliminar (el )?cuello de botella)\b/
    ]
  },
  {
    categoria: "NO_ES_CAPTURA",
    etiqueta: "Solicitud administrativa",
    destino: "Recursos Humanos o tu jefe directo, no por este medio",
    peso: 2,
    senales: [
      /\b(vacacion|permiso|incapacidad|nomina|pago|sueldo|aguinaldo|uniforme|casillero|comedor|transporte|credencial|constancia|imss|infonavit)\b/
    ]
  }
];

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Clasifica el texto libre de la persona.
 *
 * `contexto` es opcional y solo sirve para afinar: si la persona ya dijo que su tema impacta
 * seguridad marcando la casilla, eso pesa mas que adivinar por palabras.
 */
export function clasificarSolicitud(
  texto: string,
  contexto?: { marcaSeguridad?: boolean; marcaCalidad?: boolean }
): GuiaSugerencia {
  const limpio = normalizar(texto ?? "");
  const faltantes = camposFaltantes(texto ?? "");

  if (limpio.trim().length < 12) {
    return {
      categoria: "IDEA_RAPIDA",
      confianza: 0,
      etiqueta: "Todavia no puedo clasificarlo",
      motivo: "Necesito que me cuentes un poco mas de lo que viste.",
      destino: "Pendiente de definir",
      faltantes
    };
  }

  // Lo que la persona marca explicitamente gana a la deteccion por palabras: ella estaba ahi.
  if (contexto?.marcaSeguridad) return construir(REGLAS[0], "Lo marcaste como tema de seguridad.", 0.95, faltantes);
  if (contexto?.marcaCalidad) return construir(REGLAS[1], "Lo marcaste como tema de calidad o inocuidad.", 0.95, faltantes);

  let mejor: { regla: Regla; aciertos: number; puntos: number } | null = null;
  for (const regla of REGLAS) {
    if (regla.descartes?.some((patron) => patron.test(limpio))) continue;
    const aciertos = regla.senales.filter((patron) => patron.test(limpio)).length;
    if (!aciertos) continue;
    const puntos = aciertos * regla.peso;
    if (!mejor || puntos > mejor.puntos) mejor = { regla, aciertos, puntos };
  }

  if (!mejor) {
    return {
      categoria: "IDEA_RAPIDA",
      confianza: 0.45,
      etiqueta: "Idea de mejora",
      motivo: "No encontre senales de mantenimiento, seguridad ni calidad, asi que la tomo como propuesta de mejora. Si me equivoque, corrigeme.",
      destino: "Tu jefe directo, para el primer visto bueno",
      faltantes
    };
  }

  // Dos senales distintas de la misma regla convencen mas que una sola.
  const confianza = Math.min(0.95, 0.5 + mejor.aciertos * 0.2 + (mejor.regla.peso - 1) * 0.05);
  return construir(mejor.regla, motivoDe(mejor.regla), confianza, faltantes);
}

function construir(regla: Regla, motivo: string, confianza: number, faltantes: string[]): GuiaSugerencia {
  return { categoria: regla.categoria, etiqueta: regla.etiqueta, destino: regla.destino, motivo, confianza, faltantes };
}

function motivoDe(regla: Regla) {
  switch (regla.categoria) {
    case "SEGURIDAD": return "Describes algo que puede lastimar a alguien, y eso no espera turno.";
    case "CALIDAD_INOCUIDAD": return "Lo que cuentas puede afectar al producto, asi que lo ve Calidad.";
    case "ACCION_MANTENIMIENTO": return "Suena a algo que ya esta fallando y hay que repararlo, mas que a una propuesta.";
    case "CINCO_S_GESTION_VISUAL": return "Es una mejora de orden, limpieza o senalizacion.";
    case "KAIZEN": return "Por su tamano parece un proyecto, no un cambio de un dia.";
    case "NO_ES_CAPTURA": return "Este medio es para mejoras del proceso; lo tuyo se atiende por otro lado.";
    default: return "Lo tomo como propuesta de mejora.";
  }
}

/** Lo minimo para poder registrar y enrutar. Sin esto, la captura llega incompleta. */
export function camposFaltantes(texto: string): string[] {
  const limpio = normalizar(texto);
  const faltantes: string[] = [];
  if (limpio.length < 40) faltantes.push("Que viste exactamente");
  if (!/\b(propongo|sugiero|se podria|deberia|convendria|hay que|proponer|cambiar|poner|instalar|quitar)\b/.test(limpio)) {
    faltantes.push("Que propones hacer");
  }
  return faltantes;
}

/**
 * Una sugerencia de KAIZEN nunca abre proyecto sola.
 *
 * Lo pidio el usuario y es la decision correcta: si la Guia pudiera crear Kaizen, el tablero
 * se llenaria de proyectos que nadie acordo. Entra como candidata y Mejora Continua confirma.
 */
export function requiereConfirmacionHumana(sugerencia: GuiaSugerencia) {
  return sugerencia.categoria === "KAIZEN" || sugerencia.confianza < 0.5;
}
