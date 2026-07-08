import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type ThanksProps = {
  searchParams: Promise<{ folio?: string; area?: string }>;
};

export default async function ThanksPage({ searchParams }: ThanksProps) {
  const { folio, area } = await searchParams;
  const areaCode = area ?? "P1";
  return (
    <main className="grid min-h-screen place-items-center bg-panel p-4">
      <section className="surface max-w-lg rounded-lg p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-500" aria-hidden />
        <h1 className="mt-4 text-3xl font-black text-ink">Idea registrada</h1>
        <p className="mt-2 text-slate-600">Folio: {folio ?? "pendiente"}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link className="btn btn-primary" href={`/captura/${areaCode}`}>
            Registrar otra
          </Link>
          <Link className="btn btn-secondary" href="/login">
            Entrar al panel
          </Link>
        </div>
      </section>
    </main>
  );
}
