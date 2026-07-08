import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/prisma";

export default async function QrPage() {
  const areas = await prisma.area.findMany({ include: { supervisor: true }, orderBy: { code: "asc" } });
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  return (
    <>
      <PageHeader title="QR por area" description="Codigos para captura directa por area." actions={<PrintButton />} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => {
          const captureUrl = `${baseUrl}/captura/${area.code}`;
          return (
            <article className="surface rounded-lg p-5" key={area.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-ink">{area.code}</h2>
                  <p className="text-sm text-slate-600">{area.name}</p>
                  <p className="text-sm font-bold text-slate-700">{area.supervisor?.name ?? "Sin supervisor"}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">{area.active ? "Activo" : "Inactivo"}</span>
              </div>
              <img alt={`QR ${area.code}`} className="mx-auto mt-4 h-56 w-56 rounded-lg border border-line bg-white p-2" src={`/api/qr/${area.code}`} />
              <p className="mt-4 break-all rounded-lg bg-panel p-3 text-xs font-semibold text-slate-600">{captureUrl}</p>
              <a className="btn btn-secondary mt-4 w-full" download href={`/api/qr/${area.code}?download=1`}>
                <Download className="h-4 w-4" aria-hidden />
                Descargar PNG
              </a>
            </article>
          );
        })}
      </div>
    </>
  );
}
