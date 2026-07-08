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
    <main className="min-h-screen bg-panel text-ink">
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          alt="Equipo de manufactura revisando mejoras en piso"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=2200&q=85"
        />
        <div className="absolute inset-0 bg-ink/68" />
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-black uppercase text-brand-100">Proboca</p>
            <p className="text-lg font-black text-white">Ideas de Mejora PROpEx</p>
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

        <div className="relative z-10 mx-auto flex min-h-[76vh] max-w-7xl items-center px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-black uppercase text-brand-100">Resumen de la pagina</p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">Proboca convierte ideas del piso en mejoras medibles.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
              La pagina organiza el programa de ideas de mejora: captura publica por QR, revision de supervisor, validaciones SQDCM,
              asignacion de responsables, evidencia antes/despues, cierre con puntos y reportes ejecutivos.
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
              <span className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700" key={item}>
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
          <img
            alt="Tablero de indicadores de operacion"
            className="h-72 w-full rounded-lg object-cover"
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85"
          />
          <img
            alt="Colaboradores revisando proceso productivo"
            className="h-72 w-full rounded-lg object-cover"
            src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=85"
          />
          <img
            alt="Linea de manufactura con control visual"
            className="h-72 w-full rounded-lg object-cover"
            src="https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=85"
          />
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
