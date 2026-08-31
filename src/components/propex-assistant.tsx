"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronRight, LoaderCircle, Send, Sparkles, X } from "lucide-react";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  links?: Array<{ href: string; label: string }>;
  mode?: "ai" | "operational";
};

const suggestions = ["¿Qué tengo pendiente?", "¿Quién es mi jefe directo?", "Muéstrame mis Kaizen", "¿Cómo van mis GENBA?"];
const welcome: AssistantMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hola. Soy el asistente PROpEx. Puedo consultar tu trabajo, ideas, Kaizen, GENBA y ruta de autorización usando solamente la información que tu cuenta tiene permiso de ver."
};

export function PropexAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([welcome]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 30); }, [open]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  async function send(question: string) {
    const message = question.trim();
    if (message.length < 2 || loading) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: message }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const payload = await response.json() as { answer?: string; error?: string; links?: AssistantMessage["links"]; mode?: AssistantMessage["mode"] };
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "assistant",
        text: payload.answer ?? payload.error ?? "No pude consultar la información en este momento.",
        links: payload.links, mode: payload.mode
      }]);
    } catch {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: "No pude conectar con el asistente. Inténtalo nuevamente." }]);
    } finally { setLoading(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(input); }

  return (
    <>
      <button aria-controls="propex-assistant-dialog" aria-expanded={open} aria-label="Abrir asistente PROpEx" className={`assistant-launcher ${open ? "is-open" : ""}`} onClick={() => setOpen((current) => !current)} title="Asistente PROpEx" type="button">
        {open ? <X className="h-5 w-5" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}<span>Asistente</span>
      </button>
      {open ? (
        <section aria-label="Asistente virtual PROpEx" aria-modal="true" className="assistant-panel" id="propex-assistant-dialog" role="dialog">
          <header className="assistant-header">
            <span className="assistant-mark"><Bot className="h-5 w-5" aria-hidden /></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-black text-white">Asistente PROpEx</strong><span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Consulta segura por rol</span></span>
            <button aria-label="Cerrar asistente" className="assistant-close" onClick={() => setOpen(false)} type="button"><X className="h-5 w-5" aria-hidden /></button>
          </header>
          <div className="assistant-messages" ref={scrollRef}>
            {messages.map((message) => (
              <article className={`assistant-message ${message.role === "user" ? "is-user" : "is-assistant"}`} key={message.id}>
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.links?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.links.map((link) => <Link className="assistant-link" href={link.href} key={`${message.id}-${link.href}`} onClick={() => setOpen(false)}>{link.label}<ChevronRight className="h-3.5 w-3.5" aria-hidden /></Link>)}</div> : null}
                {message.role === "assistant" && message.mode ? <span className="assistant-mode">{message.mode === "ai" ? "Respuesta con IA" : "Respuesta operativa"}</span> : null}
              </article>
            ))}
            {loading ? <div className="assistant-thinking"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /><span>Consultando tu información…</span></div> : null}
          </div>
          {messages.length === 1 ? <div className="assistant-suggestions">{suggestions.map((suggestion) => <button disabled={loading} key={suggestion} onClick={() => void send(suggestion)} type="button">{suggestion}</button>)}</div> : null}
          <form className="assistant-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="assistant-question">Pregunta al asistente</label>
            <input autoComplete="off" id="assistant-question" maxLength={600} onChange={(event) => setInput(event.target.value)} placeholder="Pregunta por tu trabajo o una ruta…" ref={inputRef} value={input} />
            <button aria-label="Enviar pregunta" disabled={loading || input.trim().length < 2} type="submit"><Send className="h-4 w-4" aria-hidden /></button>
          </form>
          <p className="assistant-disclaimer">Consulta información; no modifica registros sin tu confirmación.</p>
        </section>
      ) : null}
    </>
  );
}
