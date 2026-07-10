import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { loginAction } from "@/app/actions";

type LoginProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginProps) {
  const params = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <Image alt="Planta de produccion Proboca" className="object-cover" fill priority sizes="100vw" src="/brand/proboca-servicios.jpg" />
      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-brand-500" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-12 w-24 items-center justify-center bg-white p-2">
              <Image alt="Proboca" className="h-auto w-full object-contain" height={72} priority width={216} src="/brand/proboca-logo.png" />
            </span>
            <span>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-red-300">PROpEx</span>
              <span className="block text-sm font-extrabold">Ideas de Mejora</span>
            </span>
          </Link>
          <Link className="btn border-white/25 bg-white/10 text-white hover:bg-white/20" href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Inicio
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_430px] lg:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-red-200">Espacio de trabajo</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Seguimiento claro para cada idea.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
              Revisa pendientes, toma decisiones y consulta el avance desde la bandeja correspondiente a tu departamento.
            </p>
            <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["1", "Revisar"],
                ["2", "Dar seguimiento"],
                ["3", "Cerrar"]
              ].map(([number, label]) => (
                <div className="border-l-2 border-red-500 pl-3" key={number}>
                  <p className="text-xs font-extrabold text-red-200">PASO {number}</p>
                  <p className="mt-1 text-sm font-extrabold">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <form action={loginAction} className="rounded-lg border border-white/20 bg-white p-6 text-ink shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Acceso interno</p>
                <h2 className="mt-1 text-2xl font-extrabold">Entrar al sistema</h2>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Usa el correo y la contraseña registrados por el administrador.</p>

            {params.error ? (
              <div className="alert alert-danger mt-5">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>El correo o la contraseña no coinciden. Revisa los datos e intenta de nuevo.</span>
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <label>
                <span className="label">Correo</span>
                <input autoComplete="email" className="field" name="email" placeholder="nombre@proboca.net" type="email" required />
              </label>
              <label>
                <span className="label">Contraseña</span>
                <input autoComplete="current-password" className="field" name="password" placeholder="Ingresa tu contraseña" type="password" required />
              </label>
            </div>

            <button className="btn btn-primary mt-6 w-full" type="submit">
              Entrar a mi bandeja
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <Link className="btn btn-secondary mt-3 w-full" href="/#areas">
              <QrCode className="h-4 w-4" aria-hidden />
              Registrar una idea sin entrar
            </Link>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">El acceso y las acciones quedan registrados para proteger la trazabilidad del proceso.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
