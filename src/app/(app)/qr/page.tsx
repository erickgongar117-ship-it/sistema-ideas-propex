import { Download, ExternalLink, Globe2, QrCode } from "lucide-react";
import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baseUrlFromRequest } from "@/lib/url";

export default async function QrPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const areas = await prisma.area.findMany({ include: { supervisor: true }, orderBy: { code: "asc" } });
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const baseUrl = baseUrlFromRequest(host ? `${protocol}://${host}` : null);

  return (
    <>
      <PageHeader eyebrow="Herramientas · Captura pública" title="QR por área" description="Códigos conectados a la versión en línea. Cada QR dirige al formulario del área correspondiente." actions={<PrintButton />} />

      <div className="alert alert-info mb-6">
        <Globe2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="font-extrabold">Enlaces en linea activos</p><p className="mt-0.5 leading-5">Los codigos utilizan <span className="font-bold">{baseUrl}</span>; no dependen de esta computadora.</p></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {areas.map((area) => {
          const captureUrl = `${baseUrl}/captura/${area.code}`;
          const qrUrl = `/api/qr/${area.code}?target=${encodeURIComponent(captureUrl)}`;
          return (
            <article className="surface overflow-hidden rounded-lg" key={area.id}>
              <div className="flex items-start justify-between gap-3 border-b border-line p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-sm font-extrabold text-white">{area.code}</span>
                  <div><h2 className="text-base font-extrabold text-ink">{area.name}</h2><p className="mt-0.5 text-xs text-slate-500">{area.supervisor?.name ?? "Sin supervisor"}</p></div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${area.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{area.active ? "Activo" : "Inactivo"}</span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center rounded-lg border border-line bg-white p-3">
                  <img alt={`Código QR para captura del área ${area.code}`} className="h-full w-full object-contain" src={qrUrl} />
                </div>
                <p className="mt-4 break-all rounded-lg bg-panel p-3 text-xs font-semibold leading-5 text-slate-600">{captureUrl}</p>
                <div className="no-print mt-3 grid gap-2 sm:grid-cols-2">
                  <a className="btn btn-secondary" download href={`${qrUrl}&download=1`}><Download className="h-4 w-4" aria-hidden />Descargar PNG</a>
                  <a className="btn btn-primary" href={captureUrl} rel="noreferrer" target="_blank"><ExternalLink className="h-4 w-4" aria-hidden />Probar QR</a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
