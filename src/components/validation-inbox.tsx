import type { ApprovalType, Role } from "@prisma/client";
import Link from "next/link";
import { validationDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { approvalTypeLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function ValidationInbox({ type, roles, title }: { type: ApprovalType; roles: Role[]; title: string }) {
  await requireUser(["ADMIN", ...roles]);
  const approvals = await prisma.approval.findMany({
    where: { type, status: { in: ["PENDING", "MORE_INFO"] } },
    include: { idea: { include: { area: true, supervisor: true } }, assignedTo: true },
    orderBy: { createdAt: "asc" }
  });

  return (
    <>
      <PageHeader title={title} description={`Validaciones pendientes para ${approvalTypeLabels[type]}.`} />
      {!approvals.length ? <EmptyState title="Sin validaciones pendientes" /> : null}
      <div className="grid gap-4">
        {approvals.map((approval) => (
          <article className="surface rounded-lg p-5" key={approval.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Link className="text-lg font-black text-brand-700" href={`/ideas/${approval.idea.id}`}>
                  {approval.idea.folio}
                </Link>
                <p className="text-sm font-bold text-slate-500">
                  {approval.idea.area.code} - {approval.idea.collaboratorName}
                </p>
              </div>
              <StatusPill status={approval.idea.status} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Problema</p>
                <p className="mt-1 text-sm text-slate-700">{approval.idea.problem}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Propuesta</p>
                <p className="mt-1 text-sm text-slate-700">{approval.idea.proposal}</p>
              </div>
            </div>
            <form action={validationDecisionAction} className="mt-4 grid gap-3">
              <input name="ideaId" type="hidden" value={approval.idea.id} />
              <input name="type" type="hidden" value={type} />
              <textarea className="field min-h-20" name="comments" placeholder="Comentario o justificacion" />
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" name="decision" type="submit" value="APROBAR">
                  Aprobar validacion
                </button>
                <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">
                  Solicitar informacion
                </button>
                <button className="btn btn-danger" name="decision" type="submit" value="RECHAZAR">
                  Rechazar
                </button>
              </div>
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
