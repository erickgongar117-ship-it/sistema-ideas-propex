import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 120
  });

  return (
    <>
      <PageHeader title="Auditoria" description="Historial de cambios relevantes del sistema." />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Entidad</th>
              <th>Accion</th>
              <th>Usuario</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt.toLocaleString("es-MX")}</td>
                <td>
                  {log.entity === "Idea" ? (
                    <Link className="font-bold text-brand-700" href={`/ideas/${log.entityId}`}>
                      {log.entity}
                    </Link>
                  ) : (
                    log.entity
                  )}
                </td>
                <td>{log.action}</td>
                <td>{log.user?.name ?? "Sistema"}</td>
                <td className="max-w-xl truncate">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
