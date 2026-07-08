import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardCheck, Factory, Lightbulb, QrCode, ShieldCheck } from "lucide-react";

const pillars = [
  {
    title: "Captura sencilla",
    text: "Cada colaborador puede registrar una idea por area con problema, propuesta, beneficio esperado y evidencia inicial.",
    icon: Lightbulb
  },
  {
    title: "Validacion por rol",
    text: "Supervisor, Calidad, Seguridad, Mantenimiento y Mejora Continua revisan lo necesario antes de implementar.",
    icon: ShieldCheck
  },
  {
    title: "Seguimiento completo",
    text: "El sistema concentra estatus, responsables, vencimientos, puntos, reportes, auditoria y notificaciones.",
    icon: BarChart3
  }
];

const flow = ["Registrar", "Revisar", "Validar", "Implementar", "Cerrar"];

export default function HomePage() {
  return (
    <main className="min-h-screen text-ink">
      <section className="relative min-h-[86vh] overflow-hidden">
        <img
          alt="Servicios Proboca"
          className="absolute inset-0 h-full w-full object-cover"
          src="/brand/proboca-servicios.jpg"
        />
        <div className="absolute inset-0 bg-slate-950/78" />
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-28 items-center justify-center rounded-lg bg-white p-2">
              <img alt="Proboca" className="max-h-10 max-w-full object-contain" src="/brand/proboca-logo.png" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-brand-100">PROpEx</p>
              <p className="text-lg font-black text-white">Ideas de Mejora</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="btn border-white/25 bg-white/10 text-white hover:bg-white/20" href="/captura/P1">
              Capturar idea
            </Link>
            <Link className="btn btn-primary" href="/login">
              Entrar
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[68vh] max-w-7xl items-center px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-black uppercase text-brand-100">Productora de Bocados Carnicos</p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">PROpEx convierte ideas de planta en mejoras visibles.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
              Captura por QR, seguimiento por rol, evidencia antes/despues y puntos automaticos en un flujo simple para piso, soporte y Mejora Continua.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn btn-primary" href="/captura/P1">
                <QrCode className="h-4 w-4" aria-hidden />
                Captura publica
              </Link>
              <Link className="btn btn-secondary" href="/login">
                Ver sistema
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-3 bg-brand-500" />
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase text-brand-700">Que contiene</p>
          <h2 className="mt-2 text-3xl font-black">Un flujo completo para mejora continua</h2>
          <p className="mt-4 leading-7 text-slate-700">
            Proboca centraliza la participacion de colaboradores y da visibilidad al avance de cada idea. La pagina no es solo un
            formulario: tambien permite priorizar, auditar decisiones, consultar tableros, revisar vencimientos y descargar reportes.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {flow.map((item) => (
              <span className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-black text-slate-700" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article className="surface rounded-lg p-5" key={pillar.title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-black">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            ["Supervisor", "bg-emerald-600", "Revision rapida y clara"],
            ["Calidad", "bg-red-600", "Validacion de inocuidad"],
            ["Mantenimiento", "bg-blue-600", "Ejecucion y evidencia"]
          ].map(([title, color, text]) => (
            <article className="rounded-lg border border-line bg-panel p-6 shadow-soft" key={title}>
              <div className={`h-2 w-20 rounded-full ${color}`} />
              <h3 className="mt-5 text-2xl font-black">{title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["SQDCM", "Impactos en seguridad, calidad, entrega, costo y moral."],
            ["QR por area", "Captura publica rapida para cada zona de trabajo."],
            ["Evidencia", "Archivos antes y despues para comprobar la mejora."],
            ["Reportes", "Excel, auditoria, kanban y tablero ejecutivo."]
          ].map(([title, text]) => (
            <article className="border-t-4 border-brand-500 bg-white p-5 shadow-soft" key={title}>
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
