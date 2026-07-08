import Link from "next/link";
import { CalendarDays, CheckCircle2, Eye, UserRound } from "lucide-react";
import { supervisorDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { approvalStatusLabels, approvalTypeLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export default async function SupervisorPage() {
  const user = await requireUser(["ADMIN", "SUPERVISOR"]);
  const supervisorWhere = user.role === "SUPERVISOR" ? { supervisorId: user.id } : {};
  const [ideas, approvedIdeas] = await Promise.all([
    prisma.idea.findMany({
      where: {
        status: { in: ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"] },
        ...supervisorWhere
      },
      include: { area: true, supervisor: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.idea.findMany({
      where: {
        ...supervisorWhere,
        approvals: { some: { type: "SUPERVISOR", status: "APPROVED" } }
      },
      include: {
        area: true,
        implementationOwner: true,
        approvals: { orderBy: { createdAt: "asc" } }
      },
      orderBy: { updatedAt: "desc" },
      take: 40
    })
  ]);
  const ideasInMotion = approvedIdeas.filter((idea) => !["CERRADA", "CANCELADA"].includes(idea.status)).length;
  const closedIdeas = approvedIdeas.filter((idea) => idea.status === "CERRADA").length;

  return (
    <>
      <PageHeader
        title="Bandeja del supervisor"
        description="Revisa ideas nuevas y da seguimiento a las ideas que ya aprobaste."
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-black uppercase text-slate-500">Pendientes</p>
          <p className="mt-2 text-3xl font-black text-ink">{ideas.length}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-black uppercase text-slate-500">Aprobadas en seguimiento</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{ideasInMotion}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-black uppercase text-slate-500">Cerradas</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{closedIdeas}</p>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-8 w-2 rounded-full bg-emerald-600" />
          <div>
            <h2 className="text-xl font-black text-ink">Pendientes de decision</h2>
            <p className="text-sm font-semibold text-slate-600">Aqui apruebas, rechazas o pides informacion.</p>
          </div>
        </div>
        {!ideas.length ? <EmptyState title="Sin ideas pendientes" description="Cuando un colaborador registre una idea del area aparecera aqui." /> : null}
        <div className="grid gap-4">
        {ideas.map((idea) => (
          <article className="surface overflow-hidden rounded-lg" key={idea.id}>
            <div className="h-2 bg-emerald-600" />
            <div className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Link className="text-lg font-black text-emerald-800" href={`/ideas/${idea.id}`}>
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
            </div>
          </article>
        ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-8 w-2 rounded-full bg-slate-950" />
          <div>
            <h2 className="text-xl font-black text-ink">Aprobadas por supervisor</h2>
            <p className="text-sm font-semibold text-slate-600">Solo se muestran ideas de tus areas para que sepas que paso despues de aprobarlas.</p>
          </div>
        </div>
        {!approvedIdeas.length ? <EmptyState title="Sin ideas aprobadas aun" description="Cuando apruebes una idea, su seguimiento aparecera aqui." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {approvedIdeas.map((idea) => {
            const supportApprovals = idea.approvals.filter((approval) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(approval.type));
            return (
              <article className="surface overflow-hidden rounded-lg" key={idea.id}>
                <div className="h-2 bg-slate-950" />
                <div className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link className="text-lg font-black text-slate-950" href={`/ideas/${idea.id}`}>
                        {idea.folio}
                      </Link>
                      <p className="text-sm font-bold text-slate-500">
                        {idea.area.code} - {idea.collaboratorName}
                      </p>
                    </div>
                    <StatusPill status={idea.status} />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-800">{idea.problem}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-panel p-3">
                      <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                        <UserRound className="h-3.5 w-3.5" aria-hidden />
                        Responsable
                      </p>
                      <p className="mt-1 text-sm font-black text-ink">{idea.implementationOwner?.name ?? "Pendiente por Mejora Continua"}</p>
                    </div>
                    <div className="rounded-lg bg-panel p-3">
                      <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        Compromiso
                      </p>
                      <p className="mt-1 text-sm font-black text-ink">{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-line bg-white p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Validaciones
                    </p>
                    {supportApprovals.length ? (
                      <div className="flex flex-wrap gap-2">
                        {supportApprovals.map((approval) => (
                          <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-black text-slate-700" key={approval.id}>
                            {approvalTypeLabels[approval.type]}: {approvalStatusLabels[approval.status]}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-600">No requirio validaciones de soporte.</p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-700">Puntos: {idea.pointsAssigned}</p>
                    <Link className="btn btn-secondary" href={`/ideas/${idea.id}`}>
                      <Eye className="h-4 w-4" aria-hidden />
                      Ver detalle
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
