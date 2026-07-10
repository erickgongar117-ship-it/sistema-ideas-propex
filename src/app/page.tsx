import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, LogIn, QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const areas = await prisma.area.findMany({ where: { active: true }, orderBy: { code: "asc" } });

  return (
    <main className="min-h-screen bg-white text-ink">
      <section className="relative flex min-h-[72svh] flex-col overflow-hidden bg-slate-950 text-white">
        <Image alt="Personal y equipo de proceso en Proboca" className="object-cover" fill priority sizes="100vw" src="/brand/proboca-servicios.jpg" />
        <div className="absolute inset-0 bg-slate-950/75" />
        <header className="relative z-10 border-t-4 border-brand-500">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-24 items-center justify-center bg-white p-2">
                <Image alt="Proboca" className="h-auto w-full object-contain" height={72} width={216} src="/brand/proboca-logo.png" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-red-300">PROpEx</p>
                <p className="text-sm font-extrabold">Ideas de Mejora</p>
              </div>
            </div>
            <Link className="btn border-white/30 bg-white/10 text-white hover:bg-white/20" href="/login">
              <LogIn className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Entrar al panel</span>
              <span className="sm:hidden">Entrar</span>
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-red-200">
              <span className="h-px w-9 bg-brand-500" />
              Mejora Continua Proboca
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">PROpEx Ideas de Mejora</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
              Tu experiencia en planta puede hacer el trabajo más seguro, simple y eficiente. Registra la oportunidad y sigue su avance en un solo lugar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="btn btn-brand" href="#areas">
                <QrCode className="h-4 w-4" aria-hidden />
                Registrar una idea
              </a>
              <Link className="btn border-white/30 bg-white text-slate-950" href="/login">
                Consultar seguimientos
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-200">
              {[
                "Sin iniciar sesión",
                "Desde cualquier celular",
                "Folio inmediato"
              ].map((item) => (
                <span className="flex items-center gap-1.5" key={item}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-10 h-2 bg-brand-500" />
      </section>

      <section className="scroll-mt-6 bg-white" id="areas">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Captura directa</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">¿En qué área viste la oportunidad?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Selecciona el área. El sistema enviará la idea al supervisor correcto automáticamente.</p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <Link className="surface surface-interactive group flex min-h-24 items-center gap-4 rounded-lg p-4" href={`/captura/${area.code}`} key={area.id}>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-lg font-extrabold text-white">{area.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-ink">{area.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">Abrir formulario</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 font-bold text-slate-700"><Building2 className="h-4 w-4" aria-hidden /> Productora de Bocados Carnicos</p>
          <p>PROpEx · Sistema interno de Ideas de Mejora</p>
        </div>
      </footer>
    </main>
  );
}
