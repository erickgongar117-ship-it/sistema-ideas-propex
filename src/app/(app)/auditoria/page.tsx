import Link from "next/link";
import { Clock3, FileSearch, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const actionLabels: Record<string, string> = {
  IDEA_CREATED: "Idea registrada",
  SUPERVISOR_APPROVED: "Supervisor aprobo",
  SUPERVISOR_REJECTED: "Supervisor rechazo",
  SUPERVISOR_MORE_INFO: "Supervisor solicitó información",
  MC_CLASSIFIED: "Mejora Continua clasifico",
  IMPLEMENTATION_ASSIGNED: "Implementación asignada",
  IMPLEMENTATION_UPDATED: "Avance actualizado",
  IDEA_CLOSED: "Idea cerrada",
  IDEA_CANCELLED: "Idea cancelada",
  COMMENT_ADDED: "Comentario agregado",
  AREA_UPDATED: "Área actualizada",
  POINT_RULE_UPDATED: "Regla de ProbocaCoins actualizada",
  POINT_RULE_CREATED: "Regla de ProbocaCoins creada",
  USER_CREATED: "Usuario creado",
  USER_UPDATED: "Usuario actualizado"
};

function readableAction(action: string) {
  return actionLabels[action] ?? action.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export default async function AuditPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const logs = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 120 });

  return (
    <>
      <PageHeader eyebrow="Control · Trazabilidad" title="Auditoría" description="Historial cronológico de decisiones y cambios importantes en el sistema." />

      <div className="mobile-card-list">
        {logs.map((log) => (
          <article className="surface rounded-lg p-4" key={log.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-ink">{readableAction(log.action)}</p>
                <p className="mt-1 text-xs text-slate-500">{log.entity === "Idea" ? <Link className="font-bold text-brand-700" href={`/ideas/${log.entityId}`}>Abrir idea</Link> : log.entity}</p>
              </div>
              <FileSearch className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" aria-hidden />{log.user?.name ?? "Sistema"}</span>
              <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden />{log.createdAt.toLocaleString("es-MX")}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="table-wrap desktop-table-only">
        <table className="data-table">
          <thead><tr><th>Fecha</th><th>Registro</th><th>Acción</th><th>Usuario</th><th>Detalle técnico</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap">{log.createdAt.toLocaleString("es-MX")}</td>
                <td>{log.entity === "Idea" ? <Link className="font-extrabold text-brand-700 hover:underline" href={`/ideas/${log.entityId}`}>Idea</Link> : log.entity}</td>
                <td className="font-bold text-slate-800">{readableAction(log.action)}</td>
                <td className="whitespace-nowrap">{log.user?.name ?? "Sistema"}</td>
                <td className="max-w-lg"><details><summary className="cursor-pointer text-xs font-bold text-slate-600">Ver detalle</summary><pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-500">{log.details}</pre></details></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
