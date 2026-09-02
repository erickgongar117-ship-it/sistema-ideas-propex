/**
 * Pruebas del motor de la Guia PROpEx.
 *
 * Las frases estan escritas como las diria alguien en piso: sin acentos, con faltas, cortas y
 * sin vocabulario de sistema. Si las pruebas usaran redaccion de oficina, pasarian siempre y
 * no dirian nada sobre el uso real.
 *
 * Uso: node node_modules/tsx/dist/cli.mjs scripts/qa-guia-clasificacion.ts
 */
import assert from "node:assert/strict";
import { camposFaltantes, clasificarSolicitud, requiereConfirmacionHumana } from "../src/lib/guia-clasificacion";

const casos: Array<{ texto: string; espera: string; nota: string }> = [
  {
    texto: "la guarda de la banda 8 esta suelta y casi me pesca la mano ayer en la noche",
    espera: "SEGURIDAD",
    nota: "riesgo de lesion"
  },
  {
    texto: "hay una fuga de amoniaco chiquita en el cuarto de maquinas se huele feo",
    espera: "SEGURIDAD",
    nota: "fuga peligrosa"
  },
  {
    texto: "encontramos pedazos de plastico en el producto de la linea de muslo",
    espera: "CALIDAD_INOCUIDAD",
    nota: "material extrano en producto"
  },
  {
    texto: "el motor de la banda 3 hace mucho ruido y vibra, ya no jala bien",
    espera: "ACCION_MANTENIMIENTO",
    nota: "algo ya fallando"
  },
  {
    texto: "propongo cambiar el motor de la banda 3 por uno mas grande para que rinda mas",
    espera: "IDEA_RAPIDA",
    nota: "propone, no reporta falla: el descarte debe ganarle a mantenimiento"
  },
  {
    texto: "se fundio la luz en el area y quedamos a oscuras",
    espera: "ACCION_MANTENIMIENTO",
    nota: "alumbrado: el caso que fallo en la prueba del usuario"
  },
  {
    texto: "seria bueno delimitar con pintura el paso de montacargas y poner senalizacion",
    espera: "CINCO_S_GESTION_VISUAL",
    nota: "orden y senalizacion"
  },
  {
    texto: "hay que automatizar todo el proceso de empaque, se necesita cotizar equipo nuevo",
    espera: "KAIZEN",
    nota: "proyecto con inversion"
  },
  {
    texto: "quiero saber cuando me pagan el aguinaldo y pedir mis vacaciones",
    espera: "NO_ES_CAPTURA",
    nota: "administrativo, no va por aqui"
  },
  {
    texto: "se podria poner una mesa mas cerca para no caminar tanto al surtir",
    espera: "IDEA_RAPIDA",
    nota: "mejora sencilla sin senales de otra cosa"
  }
];

let fallos = 0;
for (const caso of casos) {
  const resultado = clasificarSolicitud(caso.texto);
  const ok = resultado.categoria === caso.espera;
  if (!ok) {
    fallos += 1;
    console.log(`FALLA  ${caso.nota}\n       esperaba ${caso.espera}, dio ${resultado.categoria} (${resultado.confianza.toFixed(2)})\n       "${caso.texto}"`);
  } else {
    console.log(`ok     ${String(resultado.categoria).padEnd(24)} ${resultado.confianza.toFixed(2)}  ${caso.nota}`);
  }
}

// Lo que la persona marca gana a la deteccion por palabras.
const marcado = clasificarSolicitud("se podria poner una mesa mas cerca para no caminar tanto", { marcaSeguridad: true });
assert.equal(marcado.categoria, "SEGURIDAD", "la marca explicita de seguridad debe ganar");
assert.ok(marcado.confianza > 0.9, "marcarlo a mano da confianza alta");

// Texto demasiado corto no se clasifica con seguridad.
const corto = clasificarSolicitud("esta mal");
assert.equal(corto.confianza, 0, "sin informacion suficiente la confianza es cero");
assert.ok(corto.faltantes.length > 0, "debe decir que falta");

// Un Kaizen nunca se abre solo.
assert.ok(
  requiereConfirmacionHumana(clasificarSolicitud("hay que automatizar todo el proceso y cotizar equipo")),
  "una candidata a Kaizen siempre pasa por Mejora Continua"
);

// Falta "que propones" cuando la persona solo describe.
assert.ok(
  camposFaltantes("la banda esta sucia y llena de grasa desde hace tres semanas").includes("Que propones hacer"),
  "si solo describe, hay que pedirle la propuesta"
);

console.log(`\n${casos.length - fallos} de ${casos.length} clasificaciones correctas`);
if (fallos) process.exitCode = 1;
