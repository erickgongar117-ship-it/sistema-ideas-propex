"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleAlert, Compass, LoaderCircle, MapPin, ShieldCheck } from "lucide-react";
import { analizarSolicitudAction, type GuiaAnalisis } from "@/app/guia-actions";

/**
 * Guia PROpEx: la conversacion corta que precede al formulario.
 *
 * Que resuelve: hoy quien llega por QR se topa con un formulario de tres pasos y tiene que
 * decidir solo si lo suyo es idea, orden de mantenimiento o riesgo, ademas de elegir
 * categoria y ruta. Aqui escribe con sus palabras, la Guia le dice que parece ser y a donde
 * va, y solo entonces lo lleva al formulario con lo que ya sabe.
 *
 * No registra nada. Al confirmar manda al formulario de captura del area con los campos
 * precargados, y ahi corre submitIdeaAction con las validaciones de siempre. Registrar desde
 * aqui habria significado un segundo camino de alta que mantener en paralelo, y el dia que
 * uno de los dos cambiara, el otro se quedaria atras.
 */

type Paso = "contar" | "revisar";

export function GuiaPropex({ areaInicial }: { areaInicial?: string }) {
  const [paso, setPaso] = useState<Paso>("contar");
  const [texto, setTexto] = useState("");
  const [area, setArea] = useState(areaInicial ?? "");
  const [escalon, setEscalon] = useState("");
  const [cargando, setCargando] = useState(false);
  const [analisis, setAnalisis] = useState<GuiaAnalisis | null>(null);

  async function analizar(areaElegida = area) {
    if (texto.trim().length < 12 || cargando) return;
    setCargando(true);
    try {
      const resultado = await analizarSolicitudAction({ texto, areaCode: areaElegida || undefined });
      setAnalisis(resultado);
      if (resultado.escalones.length === 1) setEscalon(resultado.escalones[0].id);
      setPaso("revisar");
    } finally {
      setCargando(false);
    }
  }

  const noVaPorAqui = analisis?.sugerencia.categoria === "NO_ES_CAPTURA";
  const listoParaEnviar = Boolean(analisis && !noVaPorAqui && area && (analisis.escalones.length <= 1 || escalon));

  // El formulario de captura recibe lo que la Guia ya sabe. Los nombres de los parametros son
  // los mismos campos del formulario, para que se precarguen sin traduccion de por medio.
  const enlaceCaptura = () => {
    const params = new URLSearchParams();
    if (analisis?.borrador.problema) params.set("problem", analisis.borrador.problema);
    if (analisis?.borrador.propuesta) params.set("proposal", analisis.borrador.propuesta);
    if (escalon) params.set("escalationRuleId", escalon);
    params.set("guia", analisis?.sugerencia.categoria ?? "");
    return `/captura/${area}?${params.toString()}`;
  };

  return (
    <section className="guia-panel" aria-label="Guia PROpEx">
      <header className="guia-panel-head">
        <span className="guia-panel-icon" aria-hidden><Compass className="h-5 w-5" /></span>
        <div>
          <h2>Guía PROpEx</h2>
          <p>Cuéntame qué necesitas y te ayudo a mandarlo al lugar correcto.</p>
        </div>
      </header>

      <label className="guia-campo">
        <span className="label">¿Qué viste o qué te está estorbando?</span>
        <textarea
          className="field min-h-28"
          maxLength={1500}
          onChange={(event) => { setTexto(event.target.value); setAnalisis(null); setPaso("contar"); }}
          placeholder="Escríbelo con tus palabras. Ejemplo: la guarda de la banda 8 está suelta y casi me pesca la mano."
          value={texto}
        />
      </label>

      {paso === "contar" ? (
        <button className="btn btn-primary w-full" disabled={texto.trim().length < 12 || cargando} onClick={() => analizar()} type="button">
          {cargando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
          Ver a dónde va
        </button>
      ) : null}

      {analisis ? (
        <div className="guia-resultado">
          <div className={`guia-veredicto${noVaPorAqui ? " is-fuera" : ""}`}>
            <span className="guia-veredicto-etiqueta">{analisis.sugerencia.etiqueta}</span>
            <p>{analisis.sugerencia.motivo}</p>
            <p className="guia-destino"><MapPin className="h-4 w-4 shrink-0" aria-hidden /><span>{analisis.sugerencia.destino}</span></p>
          </div>

          {noVaPorAqui ? (
            <div className="alert alert-warning" role="status">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <span>Este medio es para mejoras del proceso. Lo tuyo se atiende más rápido por el otro camino.</span>
            </div>
          ) : (
            <>
              {analisis.necesitaConfirmacion ? (
                <p className="guia-nota"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden /><span>Alguien de Mejora Continua confirmará la clasificación antes de que avance.</span></p>
              ) : null}

              <label className="guia-campo">
                <span className="label">¿En qué área pasa esto?</span>
                <select className="field" onChange={(event) => { setArea(event.target.value); setEscalon(""); analizar(event.target.value); }} value={area}>
                  <option value="">Elige tu área</option>
                  {analisis.areas.map((item) => (
                    <option key={item.code} value={item.code}>{item.planta} · {item.name}</option>
                  ))}
                </select>
              </label>

              {analisis.escalones.length > 1 ? (
                <fieldset className="guia-campo">
                  <legend className="label">¿Quién te revisa normalmente?</legend>
                  <div className="guia-escalones">
                    {analisis.escalones.map((item) => (
                      <label className="guia-escalon" key={item.id}>
                        <input checked={escalon === item.id} name="guia-escalon" onChange={() => setEscalon(item.id)} type="radio" value={item.id} />
                        <span>
                          <strong>{item.quienReporta}</strong>
                          <small>Lo revisa: {item.puestoQueRecibe}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {listoParaEnviar ? (
                <Link className="btn btn-primary w-full" href={enlaceCaptura()}>
                  Continuar con mi registro
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <p className="guia-nota"><span>{analisis.siguientePregunta ?? "Elige tu área para continuar."}</span></p>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
