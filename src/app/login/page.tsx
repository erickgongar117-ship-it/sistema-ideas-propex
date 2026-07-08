import { Lightbulb } from "lucide-react";
import { loginAction } from "@/app/actions";

type LoginProps = {
  searchParams: Promise<{ error?: string }>;
};

const demoUsers = [
  "admin@propEx.local",
  "mc@propEx.local",
  "calidad@propEx.local",
  "seguridad@propEx.local",
  "mantenimiento@propEx.local",
  "supervisor.p1@propEx.local"
];

export default async function LoginPage({ searchParams }: LoginProps) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-panel p-4">
      <section className="surface grid w-full max-w-5xl overflow-hidden rounded-lg md:grid-cols-[1fr_420px]">
        <div className="bg-brand-700 p-8 text-white md:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
            <Lightbulb className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="mt-8 max-w-lg text-4xl font-black">SISTEMA DE IDEAS DE MEJORA - PROpEx</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-brand-50">
            Captura, valida, implementa y reconoce ideas de mejora con flujo SQDCM, evidencia, auditoria y notificaciones.
          </p>
          <div className="mt-8 rounded-lg border border-white/20 bg-white/10 p-4">
            <p className="text-sm font-bold">Usuarios demo</p>
            <p className="mt-1 text-sm text-brand-50">Todos usan la contrasena: admin123</p>
            <div className="mt-3 grid gap-1 text-xs text-brand-50 sm:grid-cols-2">
              {demoUsers.map((email) => (
                <span key={email}>{email}</span>
              ))}
            </div>
          </div>
        </div>

        <form action={loginAction} className="p-6 md:p-8">
          <h2 className="text-2xl font-black text-ink">Entrar al sistema</h2>
          <p className="mt-1 text-sm text-slate-600">Panel administrativo protegido por rol.</p>

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
          </button>
          <a className="btn btn-secondary mt-3 w-full" href="/captura/P1">
            Captura publica P1
          </a>
        </form>
      </section>
    </main>
  );
}
