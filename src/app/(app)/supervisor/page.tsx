import Link from "next/link";
import { supervisorDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SupervisorPage() {
  const user = await requireUser(["ADMIN", "SUPERVISOR"]);
  const ideas = await prisma.idea.findMany({
    where: {
      status: { in: ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"] },
      ...(user.role === "SUPERVISOR" ? { supervisorId: user.id } : {})
    },
    include: { area: true, supervisor: true },
    orderBy: { createdAt: "asc" }
  });

  return (
    <>
      <PageHeader title="Bandeja del supervisor" description="Ideas pendientes de aprobacion, rechazo o solicitud de informacion." />
      {!ideas.length ? <EmptyState title="Sin ideas pendientes" description="Cuando un colaborador registre una idea del area aparecera aqui." /> : null}
      <div className="grid gap-4">
        {ideas.map((idea) => (
          <article className="surface rounded-lg p-5" key={idea.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Link className="text-lg font-black text-brand-700" href={`/ideas/${idea.id}`}>
                  {idea.folio}
                </Link>
                <p className="text-sm font-bold text-slate-500">
                  {idea.area.code} - {idea.collaboratorName}
                </p>
              </div>
              <StatusPill status={idea.status} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Problema</p>
                <p className="mt-1 text-sm text-slate-700">{idea.problem}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Propuesta</p>
                <p className="mt-1 text-sm text-slate-700">{idea.proposal}</p>
              </div>
            </div>
            <form action={supervisorDecisionAction} className="mt-4 grid gap-3">
              <input name="ideaId" type="hidden" value={idea.id} />
              <textarea className="field min-h-20" name="comments" placeholder="Justificacion o informacion requerida" />
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" name="decision" type="submit" value="APROBAR">
                  Aprobar
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
