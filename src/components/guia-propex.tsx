"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, CircleAlert, Compass, LoaderCircle, Pencil } from "lucide-react";
import { analizarSolicitudAction, type GuiaAnalisis } from "@/app/guia-actions";

/**
 * Guia PROpEx: arma el registro preguntando, y lo enseña antes de enviarlo.
 *
 * La primera version fallo y vale la pena dejar escrito por que, para no repetirlo: era un
 * cuadro de texto, un veredicto y un enlace. El usuario lo describio exacto —"se ve como
 * llenalo, no como apoyo"— porque era un segundo formulario antes del formulario. Ademas
 * decia "va a Mantenimiento, como orden de trabajo", mandando a la gente a un lugar que no
 * existe: esas categorias son la clasificacion que Mejora Continua pone despues, no oficinas.
 *
 * Lo que hace ahora: pregunta una cosa a la vez, exactamente las que el formulario exige
 * —problema, propuesta, beneficio, nombre, turno, area, quien revisa— y va armando el
 * registro a la vista. Al final lo muestra completo y lo entrega listo. Esa vista previa es
 * lo que faltaba: sin ella la persona no tiene contra que comparar y la Guia parece un
 * tramite extra.
 *
 * No registra nada. Al confirmar abre el formulario de captura con todo precargado y ahi
 * corre submitIdeaAction con las validaciones de siempre. Un segundo camino de alta se habria
 * separado del primero en la primera modificacion.
 */

type Campo = "relato" | "propuesta" | "beneficio" | "nombre" | "turno" | "area" | "escalon";

type Respuestas = {
  relato: string;
  propuesta: string;
  beneficio: string;
  nombre: string;
  turno: string;
  area: string;
  escalon: string;
};

const VACIO: Respuestas = { relato: "", propuesta: "", beneficio: "", nombre: "", turno: "Matutino", area: "", escalon: "" };

const TURNOS = ["Matutino", "Vespertino", "Nocturno", "Mixto", "Administrativo"];

const PREGUNTAS: Record<Campo, { titulo: string; ayuda: string; ejemplo?: string }> = {
  relato: {
    titulo: "¿Qué viste o qué te está estorbando?",
    ayuda: "Con tus palabras, como se lo contarías a un compañero.",
    ejemplo: "La guarda de la banda 8 está suelta y ayer casi me pesca la mano."
  },
  propuesta: {
    titulo: "¿Qué se te ocurre que podría hacerse?",
    ayuda: "Aunque no estés seguro. Quien lo revise puede ajustarlo."
  },
  beneficio: {
    titulo: "Si se hace, ¿qué mejora?",
    ayuda: "Qué se evita, qué se ahorra o qué se vuelve más seguro."
  },
  nombre: { titulo: "¿Cómo te llamas?", ayuda: "Para que la mejora quede a tu nombre y te lleguen los puntos." },
  turno: { titulo: "¿En qué turno trabajas?", ayuda: "" },
  area: { titulo: "¿En qué área pasa esto?", ayuda: "Elige donde ocurre, no donde estás ahora." },
  escalon: { titulo: "¿Quién te revisa normalmente?", ayuda: "Es quien dará el primer visto bueno." }
};

export function GuiaPropex() {
  const [respuestas, setRespuestas] = useState<Respuestas>(VACIO);
  const [analisis, setAnalisis] = useState<GuiaAnalisis | null>(null);
  const [cargando, setCargando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [editando, setEditando] = useState<Campo | null>(null);

  /**
   * El siguiente hueco, en el orden en que importa.
   *
   * Primero lo que pasa, luego quien lo reporta, al final donde y quien revisa. Preguntar el
   * area de entrada obliga a alguien a elegir de una lista larga antes de saber si su tema
   * siquiera va por aqui.
   */
  const pendiente: Campo | null = useMemo(() => {
    if (!respuestas.relato.trim()) return "relato";
    if (!analisis) return null;
    if (analisis.sugerencia.categoria === "NO_ES_CAPTURA") return null;
    if (!respuestas.propuesta.trim()) return "propuesta";
    if (!respuestas.beneficio.trim()) return "beneficio";
    if (!respuestas.nombre.trim()) return "nombre";
    if (!respuestas.area) return "area";
    if (analisis.escalones.length > 1 && !respuestas.escalon) return "escalon";
    return null;
  }, [analisis, respuestas]);

  const campoActual = editando ?? pendiente;
  const completo = !pendiente && Boolean(analisis) && analisis!.sugerencia.categoria !== "NO_ES_CAPTURA";
  const fuera = analisis?.sugerencia.categoria === "NO_ES_CAPTURA";

  async function responder(campo: Campo, valor: string) {
    const siguientes = { ...respuestas, [campo]: valor };
    if (campo === "area") siguientes.escalon = "";
    setRespuestas(siguientes);
    setBorrador("");
    setEditando(null);

    // Se vuelve a analizar cuando cambia algo que altera la lectura: el relato y la propuesta
    // cambian la clasificacion, el area cambia los escalones disponibles.
    if (campo === "relato" || campo === "propuesta" || campo === "area") {
      setCargando(true);
      try {
        const resultado = await analizarSolicitudAction({
          texto: `${siguientes.relato} ${siguientes.propuesta}`.trim(),
          areaCode: siguientes.area || undefined
        });
        setAnalisis(resultado);
        // Se adopta lo que redacto el modelo, sin pisar lo que la persona ya escribio a mano.
        // Ese es el apoyo real: no tiene que volver a contar lo mismo en otras palabras.
        setRespuestas((actual) => ({
          ...actual,
          escalon: resultado.escalones.length === 1 ? resultado.escalones[0].id : actual.escalon,
          relato: resultado.borrador.problema || actual.relato,
          propuesta: actual.propuesta || resultado.borrador.propuesta,
          beneficio: actual.beneficio || resultado.borrador.beneficio
        }));
      } finally {
        setCargando(false);
      }
    }
  }

  const enlaceCaptura = () => {
    const params = new URLSearchParams({
      collaboratorName: respuestas.nombre,
      shift: respuestas.turno,
      problem: respuestas.relato,
      proposal: respuestas.propuesta,
      expectedBenefit: respuestas.beneficio,
      guia: analisis?.sugerencia.categoria ?? ""
    });
    if (respuestas.escalon) params.set("escalationRuleId", respuestas.escalon);
    return `/captura/${respuestas.area}?${params.toString()}`;
  };

  const nombreArea = analisis?.areas.find((item) => item.code === respuestas.area);
  const escalonElegido = analisis?.escalones.find((item) => item.id === respuestas.escalon);

  return (
    <section className="guia-panel" aria-label="Guía PROpEx">
      <header className="guia-panel-head">
        <span className="guia-panel-icon" aria-hidden><Compass className="h-5 w-5" /></span>
        <div>
          <h2>Guía PROpEx</h2>
          <p>Te hago unas preguntas y te dejo el registro listo. No tienes que llenar nada dos veces.</p>
        </div>
      </header>

      {/* Lo que ya se sabe, siempre visible: es contra lo que la persona compara. */}
      {analisis && !fuera ? (
        <div className="guia-avance">
          <span className="guia-avance-titulo">Esto es lo que llevo</span>
          <Resumen etiqueta="Qué pasa" valor={respuestas.relato} onEditar={() => setEditando("relato")} />
          <Resumen etiqueta="Qué propones" valor={respuestas.propuesta} onEditar={() => setEditando("propuesta")} />
          <Resumen etiqueta="Qué mejora" valor={respuestas.beneficio} onEditar={() => setEditando("beneficio")} />
          <Resumen etiqueta="Quién lo reporta" valor={respuestas.nombre ? `${respuestas.nombre} · turno ${respuestas.turno.toLowerCase()}` : ""} onEditar={() => setEditando("nombre")} />
          <Resumen etiqueta="Dónde" valor={nombreArea ? `${nombreArea.planta} · ${nombreArea.name}` : ""} onEditar={() => setEditando("area")} />
          <Resumen etiqueta="Quién lo revisa" valor={escalonElegido ? escalonElegido.puestoQueRecibe : ""} onEditar={() => setEditando("escalon")} />
          <p className="guia-avance-clasificacion">
            <Check className="h-4 w-4 shrink-0" aria-hidden />
            <span>Lo estoy tomando como <strong>{analisis.sugerencia.etiqueta.toLowerCase()}</strong>. {analisis.sugerencia.destino}.</span>
          </p>
        </div>
      ) : null}

      {fuera ? (
        <div className="alert alert-warning" role="status">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>{analisis!.sugerencia.destino}. Aquí solo se registran mejoras del proceso, y así te atienden más rápido.</span>
        </div>
      ) : null}

      {campoActual ? (
        <div className="guia-pregunta">
          <p className="guia-pregunta-titulo">
            {/* Si el modelo pregunto algo concreto sobre lo que la persona conto, se usa esa
                pregunta; la generica solo aparece cuando no hay nada mejor. */}
            {!editando && analisis?.siguientePregunta && (campoActual === "propuesta" || campoActual === "beneficio")
              ? analisis.siguientePregunta
              : PREGUNTAS[campoActual].titulo}
          </p>
          {PREGUNTAS[campoActual].ayuda ? <p className="guia-pregunta-ayuda">{PREGUNTAS[campoActual].ayuda}</p> : null}

          {campoActual === "area" ? (
            <select className="field" onChange={(event) => responder("area", event.target.value)} value={respuestas.area}>
              <option value="">Elige tu área</option>
              {analisis?.areas.map((item) => <option key={item.code} value={item.code}>{item.planta} · {item.name}</option>)}
            </select>
          ) : campoActual === "turno" ? (
            <select className="field" onChange={(event) => responder("turno", event.target.value)} value={respuestas.turno}>
              {TURNOS.map((turno) => <option key={turno} value={turno}>{turno}</option>)}
            </select>
          ) : campoActual === "escalon" ? (
            <div className="guia-escalones">
              {analisis?.escalones.map((item) => (
                <label className="guia-escalon" key={item.id}>
                  <input checked={respuestas.escalon === item.id} name="guia-escalon" onChange={() => responder("escalon", item.id)} type="radio" />
                  <span><strong>{item.quienReporta}</strong><small>Lo revisa: {item.puestoQueRecibe}</small></span>
                </label>
              ))}
            </div>
          ) : (
            <>
              {campoActual === "nombre" ? (
                <input
                  autoComplete="name"
                  className="field"
                  onChange={(event) => setBorrador(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && borrador.trim()) responder("nombre", borrador.trim()); }}
                  placeholder="Escribe tu nombre"
                  value={borrador}
                />
              ) : (
                <textarea
                  className="field min-h-24"
                  maxLength={1500}
                  onChange={(event) => setBorrador(event.target.value)}
                  placeholder={PREGUNTAS[campoActual].ejemplo}
                  value={borrador}
                />
              )}
              <button
                className="btn btn-primary w-full"
                disabled={borrador.trim().length < 3 || cargando}
                onClick={() => responder(campoActual, borrador.trim())}
                type="button"
              >
                {cargando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
                Continuar
              </button>
            </>
          )}
        </div>
      ) : null}

      {completo ? (
        <>
          {analisis!.necesitaConfirmacion ? (
            <p className="guia-nota"><span>Mejora Continua confirmará la clasificación antes de que avance. Tu registro entra igual.</span></p>
          ) : null}
          <Link className="btn btn-primary w-full" href={enlaceCaptura()}>
            Revisar y enviar mi idea
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="guia-nota"><span>Te abro el formulario ya lleno con esto. Solo lo revisas y le das enviar.</span></p>
        </>
      ) : null}
    </section>
  );
}

/** Un renglon del resumen. Vacio se ve distinto: marca lo que todavia falta. */
function Resumen({ etiqueta, valor, onEditar }: { etiqueta: string; valor: string; onEditar: () => void }) {
  return (
    <div className={`guia-resumen${valor ? "" : " is-pendiente"}`}>
      <span className="guia-resumen-etiqueta">{etiqueta}</span>
      {valor ? (
        <>
          <span className="guia-resumen-valor">{valor}</span>
          <button aria-label={`Cambiar ${etiqueta.toLowerCase()}`} className="guia-resumen-editar" onClick={onEditar} type="button">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      ) : (
        <span className="guia-resumen-valor">Falta</span>
      )}
    </div>
  );
}
