import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lightbulb } from "lucide-react";

type ThanksProps = {
  searchParams: Promise<{ folio?: string; area?: string }>;
};

export default async function ThanksPage({ searchParams }: ThanksProps) {
  const { folio, area } = await searchParams;
  const areaCode = area ?? "P1";
  return (
    <main className="capture-theme grid min-h-screen place-items-center bg-panel p-4">
      <section className="surface w-full max-w-lg overflow-hidden rounded-lg text-center">
        <div className="h-1.5 bg-brand-500" />
        <div className="p-6 sm:p-8">
          <Image alt="Proboca" className="mx-auto h-auto w-28 object-contain" height={72} width={216} src="/brand/proboca-logo.png" />
          <span className="mx-auto mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">¡Idea registrada!</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">El supervisor de {areaCode} ya puede revisarla.</p>
          <div className="mt-6 border-y border-line bg-panel px-4 py-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Tu folio</p>
            <p className="mt-1 text-3xl font-extrabold text-ink">{folio ?? "Pendiente"}</p>
          </div>
          <p className="mt-5 flex items-start justify-center gap-2 text-xs leading-5 text-slate-500">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            Guarda este folio para identificar tu idea.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link className="btn btn-success" href={`/captura/${areaCode}`}>
              Registrar otra
            </Link>
            <Link className="btn btn-secondary" href="/">
              Terminar
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
