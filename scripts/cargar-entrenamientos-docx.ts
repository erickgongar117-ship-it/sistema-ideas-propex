/**
 * Carga participantes de entrenamiento desde el documento de Word que los declara.
 *
 * Por que existe: la carga anterior de White Belt vivia como una lista escrita a mano
 * dentro del importador de Excel, y ademas partia a la gente en dos sesiones —"Proyecto" y
 * "Coach / mentor"— una clasificacion que el documento fuente nunca hizo. Aqui la unica
 * fuente es el archivo: se lee la tabla de cada curso tal como esta y no se agrega ni se
 * deduce nada que no aparezca escrito.
 *
 * Reglas que impone este script, tal como se pidieron:
 *   - Toda persona listada es personal a capacitar y certificar. Ningun otro papel.
 *   - Planta y area/puesto solo se guardan cuando la tabla los trae; si no, quedan vacios.
 *   - Los nombres se conservan al pie de la letra, sin normalizar ni corregir.
 *   - Quien aparece en dos cursos queda inscrito en los dos. No se deduplica entre cursos.
 *
 * Como reconoce los cursos: recorre el cuerpo del documento en orden y usa el ultimo
 * titulo que menciona un curso conocido; cada tabla se atribuye a ese curso. Asi, agregar
 * un tercer curso al documento no obliga a tocar el script, solo a nombrarlo aqui abajo.
 *
 * Uso:  pnpm exec tsx scripts/cargar-entrenamientos-docx.ts <documento.docx>
 *       pnpm exec tsx scripts/cargar-entrenamientos-docx.ts <documento.docx> --aplicar
 */
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import JSZip from "jszip";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const ruta = process.argv[2];

/** Cursos que el documento puede declarar, con el valor en ProbocaCoins de cada uno. */
const CURSOS = [
  { nombre: "White Belt 2026", patron: /white\s*belt/i, coinValue: 100 },
  { nombre: "TWI Certificación 2026", patron: /twi/i, coinValue: 100 }
];

const normalizar = (valor: string) => valor.replace(/\s+/g, " ").trim();
/** Guion largo, guion corto o casilla vacia significan "sin dato", no un valor. */
const opcional = (valor: string) => {
  const limpio = normalizar(valor);
  return limpio && !/^[—–-]+$/.test(limpio) ? limpio : null;
};

type Persona = { nombre: string; area: string | null; planta: string | null };

/**
 * Texto plano de un nodo.
 *
 * El patron exige que despues de <w:t venga un espacio o el cierre: sin eso tambien
 * capturaba <w:tcW .../> y otros hermanos que empiezan igual, y el contenido de la celda
 * salia con el marcado de formato pegado.
 */
function textoDe(nodo: string) {
  return normalizar([...nodo.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(""))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

/**
 * Recorre el cuerpo en orden y devuelve los bloques de texto y tabla tal como aparecen.
 * El orden importa: es lo unico que dice a que curso pertenece cada tabla.
 */
function bloques(xml: string) {
  const cuerpo = xml.slice(xml.indexOf("<w:body>"), xml.lastIndexOf("</w:body>"));
  const salida: Array<{ tipo: "texto"; valor: string } | { tipo: "tabla"; filas: string[][] }> = [];

  // Primero se ubican los rangos de tabla y despues se lee como parrafo solo lo que queda
  // fuera de ellos. Una sola expresion con alternancia no basta: los parrafos de dentro de
  // una tabla tambien casan con el patron de parrafo, y el recorrido terminaba leyendo cada
  // celda como si fuera un titulo suelto, con lo que la tabla desaparecia.
  const rangos: Array<[number, number]> = [];
  for (const match of cuerpo.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)) {
    rangos.push([match.index!, match.index! + match[0].length]);
  }

  const leerTexto = (fragmento: string) => {
    for (const parrafo of fragmento.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
      const valor = textoDe(parrafo[0]);
      if (valor) salida.push({ tipo: "texto", valor });
    }
  };

  let cursor = 0;
  for (const [inicio, fin] of rangos) {
    leerTexto(cuerpo.slice(cursor, inicio));
    const tabla = cuerpo.slice(inicio, fin);
    const filas: string[][] = [];
    for (const tr of tabla.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
      filas.push([...tr[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((tc) => textoDe(tc[0])));
    }
    if (filas.length) salida.push({ tipo: "tabla", filas });
    cursor = fin;
  }
  leerTexto(cuerpo.slice(cursor));
  return salida;
}

/**
 * Convierte una tabla en personas leyendo su encabezado.
 *
 * Las dos tablas del documento tienen formas distintas: una es "# | Nombre | Área/Puesto |
 * Planta/Sede" con encabezado, la otra es "Planta | # | Nombre" sin el. Por eso la columna
 * del nombre se detecta por contenido —la que trae texto con espacios y sin numeros— en
 * lugar de fijarla por posicion.
 */
function personasDe(filas: string[][]): Persona[] {
  const encabezado = filas[0].map((c) => normalizar(c).toLowerCase());
  const tieneEncabezado = encabezado.some((c) => /nombre/.test(c));
  const indice = (patron: RegExp) => encabezado.findIndex((c) => patron.test(c));

  let colNombre = tieneEncabezado ? indice(/nombre/) : -1;
  let colArea = tieneEncabezado ? indice(/[aá]rea|puesto/) : -1;
  let colPlanta = tieneEncabezado ? indice(/planta|sede/) : -1;

  const cuerpo = tieneEncabezado ? filas.slice(1) : filas;
  if (colNombre < 0) {
    // Sin encabezado: el nombre es la columna que casi siempre trae varias palabras.
    const puntaje = (indice: number) => cuerpo.filter((f) => /\s/.test(normalizar(f[indice] ?? "")) && !/^\d+$/.test(normalizar(f[indice] ?? ""))).length;
    colNombre = filas[0].map((_, i) => i).sort((a, b) => puntaje(b) - puntaje(a))[0];
    // Y la planta, si existe, es una columna con pocos valores distintos y sin numeros.
    const candidatos = filas[0].map((_, i) => i).filter((i) => i !== colNombre);
    for (const i of candidatos) {
      const valores = new Set(cuerpo.map((f) => normalizar(f[i] ?? "")).filter(Boolean));
      if (valores.size > 0 && valores.size <= 4 && ![...valores].some((v) => /^\d+$/.test(v))) { colPlanta = i; break; }
    }
  }

  const personas: Persona[] = [];
  for (const fila of cuerpo) {
    const nombre = normalizar(fila[colNombre] ?? "");
    if (!nombre || /^\d+$/.test(nombre)) continue;
    personas.push({
      nombre,
      area: colArea >= 0 ? opcional(fila[colArea] ?? "") : null,
      planta: colPlanta >= 0 ? opcional(fila[colPlanta] ?? "") : null
    });
  }
  return personas;
}

async function main() {
  if (!ruta) throw new Error("Uso: pnpm exec tsx scripts/cargar-entrenamientos-docx.ts <documento.docx> [--aplicar]");
  const zip = await JSZip.loadAsync(await readFile(ruta));
  const documento = zip.file("word/document.xml");
  if (!documento) throw new Error("El archivo no parece un .docx: no tiene word/document.xml");

  const partes = bloques(await documento.async("string"));
  const porCurso = new Map<string, Persona[]>();
  let cursoActual: string | null = null;
  for (const parte of partes) {
    if (parte.tipo === "texto") {
      const encontrado = CURSOS.find((c) => c.patron.test(parte.valor));
      if (encontrado) cursoActual = encontrado.nombre;
      continue;
    }
    if (!cursoActual) continue;
    const personas = personasDe(parte.filas);
    porCurso.set(cursoActual, [...(porCurso.get(cursoActual) ?? []), ...personas]);
  }

  if (!porCurso.size) throw new Error(`No se reconocio ningun curso. Se buscan: ${CURSOS.map((c) => c.nombre).join(", ")}`);

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", active: true }, orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("Se necesita una cuenta ADMIN activa para registrar la carga.");

  let altas = 0;
  let reusadas = 0;
  let inscripciones = 0;
  let yaInscritas = 0;

  for (const [curso, personas] of porCurso) {
    const definicion = CURSOS.find((c) => c.nombre === curso)!;
    console.log(`\n${curso}: ${personas.length} personas`);
    const conArea = personas.filter((p) => p.area).length;
    const conPlanta = personas.filter((p) => p.planta).length;
    console.log(`  con area/puesto ${conArea} · con planta ${conPlanta} · sin area ${personas.length - conArea}`);

    if (!aplicar) {
      personas.slice(0, 3).forEach((p) => console.log(`    ${p.nombre} | ${p.area ?? "(vacio)"} | ${p.planta ?? "(vacio)"}`));
      if (personas.length > 3) console.log(`    ... y ${personas.length - 3} mas`);
      continue;
    }

    const programa = await prisma.trainingProgram.upsert({
      where: { name: curso },
      update: { active: true },
      create: { name: curso, coinValue: definicion.coinValue, createdById: admin.id }
    });
    // Una sola sesion por curso: el documento no distingue grupos ni fechas, y partirla
    // seria inventar una estructura que la fuente no declara.
    const marca = `[DOCX:${curso}]`;
    const sesion = (await prisma.trainingSession.findFirst({ where: { programId: programa.id, notes: { contains: marca } } }))
      ?? await prisma.trainingSession.create({
        data: {
          programId: programa.id,
          sessionDate: new Date(Date.UTC(2026, 0, 1, 12)),
          trainerName: "Mejora Continua",
          notes: `${marca} Personal a capacitar y certificar, cargado del documento ${ruta.split(/[\\/]/).pop()}.`,
          createdById: admin.id
        }
      });

    for (const persona of personas) {
      // La busqueda es por nombre exacto porque el documento manda conservarlos tal cual;
      // dos grafias distintas de la misma persona quedan como dos registros y eso se
      // corrige a mano, no adivinando aqui.
      let participante = await prisma.participant.findFirst({ where: { name: persona.nombre } });
      if (participante) {
        reusadas += 1;
        // Solo se completa lo que estaba vacio: nunca se pisa un dato ya capturado.
        if ((persona.area && !participante.jobTitle) || (persona.planta && !participante.orgUnitId)) {
          participante = await prisma.participant.update({
            where: { id: participante.id },
            data: { jobTitle: participante.jobTitle ?? persona.area ?? undefined }
          });
        }
      } else {
        altas += 1;
        participante = await prisma.participant.create({
          data: { name: persona.nombre, jobTitle: persona.area ?? undefined, active: true }
        });
      }

      const previa = await prisma.trainingEnrollment.findUnique({
        where: { sessionId_participantId: { sessionId: sesion.id, participantId: participante.id } }
      });
      if (previa) { yaInscritas += 1; continue; }
      await prisma.trainingEnrollment.create({
        data: { sessionId: sesion.id, participantId: participante.id, status: "REGISTERED" }
      });
      inscripciones += 1;
    }

    await prisma.auditLog.create({
      data: { entity: "TrainingSession", entityId: sesion.id, action: "IMPORT_DOCX_ENTRENAMIENTO", userId: admin.id, details: JSON.stringify({ curso, personas: personas.length, archivo: ruta.split(/[\\/]/).pop() }) }
    });
  }

  if (aplicar) {
    console.log(`\nparticipantes nuevos ${altas} · reutilizados ${reusadas}`);
    console.log(`inscripciones nuevas ${inscripciones} · ya existian ${yaInscritas}`);
  } else {
    console.log("\nSimulacion. Vuelve a correr con --aplicar para escribir los cambios.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
