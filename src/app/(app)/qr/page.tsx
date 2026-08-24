import { Globe2 } from "lucide-react";
import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { QrExplorer } from "@/components/qr-explorer";
import { requireUser } from "@/lib/auth";
import { getOrganizationStructure } from "@/lib/organization";
import { baseUrlFromRequest, isPrivateOrLocalUrl } from "@/lib/url";


export const metadata = { title: "Códigos QR" };
export default async function QrPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const structure = await getOrganizationStructure();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const referer = requestHeaders.get("referer");
  let requestOrigin = host ? `${protocol}://${host}` : null;
  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch {
      requestOrigin = null;
    }
  }
  const baseUrl = baseUrlFromRequest(requestOrigin);
  const isLocalPreview = isPrivateOrLocalUrl(baseUrl);

  return (
    <>
      <PageHeader eyebrow="Herramientas · Captura publica" title="QR por planta y departamento" description="Selecciona una planta, abre el departamento y revisa sus areas, responsables, correos y codigos de captura." actions={isLocalPreview ? undefined : <PrintButton />} />

      <div className={`alert mb-6 ${isLocalPreview ? "alert-warning" : "alert-info"}`}>
        <Globe2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        {isLocalPreview ? (
          <div><p className="font-extrabold">Vista local de prueba</p><p className="mt-0.5 leading-5">Estos QR apuntan a <span className="font-bold">{baseUrl}</span>. Imprime o descarga los codigos desde la pagina publicada para que funcionen fuera de esta computadora.</p></div>
        ) : (
          <div><p className="font-extrabold">Enlaces en linea activos</p><p className="mt-0.5 leading-5">Los codigos utilizan <span className="font-bold">{baseUrl}</span> y se actualizan con la pagina publicada.</p></div>
        )}
      </div>

      <QrExplorer baseUrl={baseUrl} downloadEnabled={!isLocalPreview} structure={structure} />
    </>
  );
}
