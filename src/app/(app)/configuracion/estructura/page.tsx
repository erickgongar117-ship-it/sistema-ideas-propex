import Link from "next/link";
import { ArrowLeft, Database, QrCode } from "lucide-react";
import { OrganizationBuilder } from "@/components/organization-builder";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getOrganizationStructure } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export default async function OrganizationStructurePage() {
  await requireUser(["ADMIN"]);
  const [structure, users] = await Promise.all([
    getOrganizationStructure(),
    prisma.user.findMany({
      where: { active: true, role: { not: "COLABORADOR" } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true }
    })
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Administracion · Estructura y responsables"
        title="Estructura organizacional"
        description="Selecciona la planta y administra departamentos, areas, responsables, jefes directos y rutas de captura."
        actions={<Link className="btn btn-secondary" href="/configuracion"><ArrowLeft className="h-4 w-4" aria-hidden />Volver a configuracion</Link>}
      />

      <div className="alert alert-success mb-5">
        <Database className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div><p className="font-extrabold">Estructura conectada al sistema</p><p className="mt-0.5 leading-5">Los cambios se guardan en la base de datos y quedan registrados. Las unidades con QR se sincronizan con las areas de captura.</p></div>
      </div>

      <div className="no-print mb-5 flex justify-end">
        <Link className="btn btn-secondary" href="/qr"><QrCode className="h-4 w-4" aria-hidden />Revisar QR activos</Link>
      </div>

      <OrganizationBuilder initialStructure={structure} users={users} />
    </>
  );
}
