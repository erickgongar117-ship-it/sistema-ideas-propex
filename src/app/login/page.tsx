import { ArrowRight, KeyRound, QrCode, ShieldCheck } from "lucide-react";
import { loginAction } from "@/app/actions";

type LoginProps = {
  searchParams: Promise<{ error?: string }>;
};

const demoUsers = [
  ["Admin", "admin@propEx.local", "bg-slate-950 text-white"],
  ["Mejora", "mc@propEx.local", "bg-slate-800 text-white"],
  ["Supervisor", "supervisor.p1@propEx.local", "bg-emerald-100 text-emerald-900"],
  ["Calidad", "calidad@propEx.local", "bg-red-100 text-red-900"],
  ["Seguridad", "seguridad@propEx.local", "bg-slate-200 text-slate-900"],
  ["Mantenimiento", "mantenimiento@propEx.local", "bg-blue-100 text-blue-900"]
];

export default async function LoginPage({ searchParams }: LoginProps) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="surface grid w-full max-w-6xl overflow-hidden rounded-lg md:grid-cols-[1fr_430px]">
        <div className="relative overflow-hidden bg-slate-950 p-8 text-white md:p-12">
          <div className="absolute inset-x-0 top-0 h-2 bg-brand-500" />
          <div className="flex h-20 w-36 items-center justify-center rounded-lg bg-white p-3">
            <img alt="Proboca" className="max-h-14 max-w-full object-contain" src="/brand/proboca-logo.png" />
          </div>
          <h1 className="mt-8 max-w-xl text-4xl font-black leading-tight">Sistema de Ideas de Mejora PROpEx</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-brand-50">
            Un tablero sencillo para capturar, validar, implementar y cerrar mejoras en planta con evidencia, puntos automaticos y seguimiento por rol.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Captura"],
              ["2", "Validacion"],
              ["3", "Cierre"]
            ].map(([step, label]) => (
              <div className="rounded-lg border border-white/15 bg-white/10 p-4" key={step}>
                <p className="text-2xl font-black text-brand-100">{step}</p>
                <p className="mt-1 text-sm font-black">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="flex items-center gap-2 text-sm font-black">
              <KeyRound className="h-4 w-4" aria-hidden />
              Usuarios demo
            </p>
            <p className="mt-1 text-sm text-brand-50">Contrasena para todos: admin123</p>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              {demoUsers.map(([role, email, className]) => (
                <div className="rounded-lg bg-white p-2 text-slate-900" key={email}>
                  <span className={`inline-flex rounded-full px-2 py-1 font-black ${className}`}>{role}</span>
                  <p className="mt-1 font-bold">{email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form action={loginAction} className="p-6 md:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-5 text-2xl font-black text-ink">Entrar al sistema</h2>
          <p className="mt-1 text-sm text-slate-600">Cada usuario ve solo su bandeja y sus acciones.</p>

          {params.error ? (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
              Credenciales invalidas o usuario inactivo.
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            <label>
              <span className="label">Correo</span>
              <input className="field" defaultValue="admin@propEx.local" name="email" type="email" required />
            </label>
            <label>
              <span className="label">Contrasena</span>
              <input className="field" defaultValue="admin123" name="password" type="password" required />
            </label>
          </div>

          <button className="btn btn-primary mt-6 w-full" type="submit">
            Entrar
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <a className="btn btn-secondary mt-3 w-full" href="/captura/P1">
            <QrCode className="h-4 w-4" aria-hidden />
            Captura publica P1
          </a>
        </form>
      </section>
    </main>
  );
}
