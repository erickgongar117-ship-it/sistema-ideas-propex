import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { cambiarContrasenaAction } from "@/app/contrasena-actions";
import { requireUser } from "@/lib/auth";
import { roleHomePath } from "@/lib/domain";
import { ThemeSelector } from "@/components/theme-selector";

/**
 * Pantalla de contrasena propia.
 *
 * Vive fuera del grupo (app) a proposito: ese layout es el que manda aqui a quien tiene una
 * contrasena temporal, asi que si esta pagina estuviera dentro se redirigiria a si misma sin
 * parar. Por eso repite la cascara del login en vez de reutilizar AppShell.
 */

export const metadata = { title: "Tu contrasena" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function CambiarContrasenaPage({ searchParams }: Props) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const forzado = user.mustChangePassword;
  const error = params.error === "actual"
    ? "La contraseña de ahora no coincide."
    : params.error;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <Image alt="Planta de produccion Proboca" className="object-cover" fill priority sizes="100vw" src="/brand/proboca-servicios.jpg" />
      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-brand-500" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-5 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <span className="brand-logo-surface flex h-12 w-24 items-center justify-center bg-white p-2">
              <Image alt="Proboca" className="h-auto w-full object-contain" height={72} priority width={216} src="/brand/proboca-logo.png" />
            </span>
            <span>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-100">PROpEx</span>
              <span className="block text-sm font-extrabold">Mejora Operativa</span>
            </span>
          </span>
          <ThemeSelector />
        </header>

        <div className="flex flex-1 items-center justify-center py-8">
          <form action={cambiarContrasenaAction} className="w-full rounded-lg border border-white/20 bg-white p-6 text-ink shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-700">Tu cuenta</p>
                <h1 className="mt-1 text-2xl font-extrabold">{forzado ? "Elige tu contraseña" : "Cambiar mi contraseña"}</h1>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {forzado
                ? "La contraseña con la que entraste es temporal y la conocen otras personas. Elige una que solo tú sepas: lo que apruebes o registres queda a tu nombre."
                : "Escribe la que usas hoy y luego la nueva."}
            </p>

            {error ? (
              <div className="alert alert-danger mt-5" role="alert">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {forzado ? null : (
                <label>
                  <span className="label">Contraseña de ahora</span>
                  <input autoComplete="current-password" className="field" name="actual" required type="password" />
                </label>
              )}
              <label>
                <span className="label">Contraseña nueva</span>
                <input autoComplete="new-password" className="field" minLength={8} name="nueva" placeholder="Al menos 8 caracteres" required type="password" />
              </label>
              <label>
                <span className="label">Repítela</span>
                <input autoComplete="new-password" className="field" minLength={8} name="repetida" required type="password" />
              </label>
            </div>

            <button className="btn btn-primary mt-6 w-full" type="submit">
              Guardar y entrar
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>

            {forzado ? (
              <p className="mt-4 text-xs text-slate-600">
                Es tuya y nadie más la ve, ni el administrador. Si se te olvida, él puede darte una temporal nueva.
              </p>
            ) : (
              <Link className="btn btn-secondary mt-3 w-full" href={roleHomePath(user.role)}>Cancelar</Link>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
