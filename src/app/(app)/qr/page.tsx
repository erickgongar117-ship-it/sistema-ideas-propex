import { Globe2 } from "lucide-react";
import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { QrExplorer } from "@/components/qr-explorer";
import { requireUser } from "@/lib/auth";
import { getOrganizationStructure } from "@/lib/organization";
import { baseUrlFromRequest } from "@/lib/url";

export default async function QrPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const structure = await getOrganizationStructure();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const baseUrl = baseUrlFromRequest(host ? `${protocol}://${host}` : null);

  return (
    <>
      <PageHeader eyebrow="Herramientas · Captura publica" title="QR por planta y departamento" description="Selecciona una planta, abre el departamento y revisa sus areas, responsables, correos y codigos de captura." actions={<PrintButton />} />

      <div className="alert alert-info mb-6">
        <Globe2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="font-extrabold">Enlaces en linea activos</p><p className="mt-0.5 leading-5">Los codigos utilizan <span className="font-bold">{baseUrl}</span>; no dependen de esta computadora.</p></div>
      </div>

      <QrExplorer baseUrl={baseUrl} structure={structure} />
    </>
  );
}
