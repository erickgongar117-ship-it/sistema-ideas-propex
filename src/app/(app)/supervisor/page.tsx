import Link from "next/link";
import { CalendarDays, Check, CheckCircle2, Clock3, Eye, MessageSquareMore, UserRound, X } from "lucide-react";
import { supervisorDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { approvalStatusLabels, approvalTypeLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export default async function SupervisorPage() {
  const user = await requireUser(["ADMIN", "SUPERVISOR"]);
  const supervisorWhere = user.role === "SUPERVISOR" ? { supervisorId: user.id } : {};
  const [ideas, approvedIdeas] = await Promise.all([
    prisma.idea.findMany({
      where: { status: { in: ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"] }, ...supervisorWhere },
      include: { area: true, supervisor: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.idea.findMany({
      where: { ...supervisorWhere, approvals: { some: { type: "SUPERVISOR", status: "APPROVED" } } },
      include: { area: true, implementationOwner: true, approvals: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 40
    })
  ]);
  const ideasInMotion = approvedIdeas.filter((idea) => !["CERRADA", "CANCELADA"].includes(idea.status)).length;
  const closedIdeas = approvedIdeas.filter((idea) => idea.status === "CERRADA").length;

  return (
    <>
      <PageHeader
        eyebrow="Supervisor · Revisión de área"
        title="Bandeja del supervisor"
        description="Primero atiende las ideas pendientes; abajo puedes consultar lo que ocurrio con las ideas aprobadas."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard detail="Esperan tu decision" icon={Clock3} label="Pendientes" tone="amber" value={ideas.length} />
        <KpiCard detail="Continuan en el proceso" icon={CheckCircle2} label="En seguimiento" tone="green" value={ideasInMotion} />
        <KpiCard detail="Con resultado final" icon={Check} label="Cerradas" tone="dark" value={closedIdeas} />
      </section>

      <section className="mt-8">
        <SectionHeading count={ideas.length} description="Aprueba, solicita información o rechaza cada propuesta." title="Pendientes de decisión" tone="green" />
        {!ideas.length ? <EmptyState title="Todo está al día" description="Las nuevas ideas de tus áreas aparecerán aquí automáticamente." /> : null}
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <article className="surface overflow-hidden rounded-lg" key={idea.id}>
              <div className="h-1 bg-emerald-600" />
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="text-lg font-extrabold text-emerald-800 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-800">Área {idea.area.code}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{idea.collaboratorName} · {idea.shift} · {idea.createdAt.toLocaleDateString("es-MX")}</p>
                  </div>
                  <StatusPill status={idea.status} />
                </div>

                <div className="mt-5 grid gap-4 border-y border-line py-4 lg:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Problema observado</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{idea.problem}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Propuesta</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{idea.proposal}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Beneficio esperado</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{idea.expectedBenefit}</p>
                  </div>
                </div>

                <form action={supervisorDecisionAction} className="mt-4 grid gap-3">
                  <input name="ideaId" type="hidden" value={idea.id} />
                  <label>
                    <span className="label">Comentario de la decision</span>
                    <textarea className="field min-h-20" name="comments" placeholder="Obligatorio al rechazar o solicitar información" />
                  </label>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <button className="btn btn-success" name="decision" type="submit" value="APROBAR">
                      <Check className="h-4 w-4" aria-hidden /> Aprobar idea
                    </button>
                    <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">
                      <MessageSquareMore className="h-4 w-4" aria-hidden /> Solicitar información
                    </button>
                    <button className="btn btn-danger sm:ml-auto" name="decision" type="submit" value="RECHAZAR">
                      <X className="h-4 w-4" aria-hidden /> Rechazar
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading count={approvedIdeas.length} description="Consulta responsable, fecha, validaciones y resultado final." title="Ideas que aprobaste" />
        {!approvedIdeas.length ? <EmptyState title="Aun no hay ideas aprobadas" description="Cuando apruebes una idea, su seguimiento permanecera visible aqui." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {approvedIdeas.map((idea) => {
            const supportApprovals = idea.approvals.filter((approval) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(approval.type));
            return (
              <article className="surface rounded-lg p-4 sm:p-5" key={idea.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link className="text-base font-extrabold text-ink hover:text-brand-700" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{idea.area.code} · {idea.collaboratorName}</p>
                  </div>
                  <StatusPill status={idea.status} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="border-l-2 border-slate-300 pl-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><UserRound className="h-3.5 w-3.5" aria-hidden />Responsable</dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">{idea.implementationOwner?.name ?? "Pendiente de asignar"}</dd>
                  </div>
                  <div className="border-l-2 border-slate-300 pl-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><CalendarDays className="h-3.5 w-3.5" aria-hidden />Compromiso</dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">Validaciones</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {supportApprovals.length ? supportApprovals.map((approval) => (
                      <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-slate-700" key={approval.id}>
                        {approvalTypeLabels[approval.type]}: {approvalStatusLabels[approval.status]}
                      </span>
                    )) : <span className="text-xs text-slate-500">No requirió validaciones adicionales.</span>}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs font-extrabold text-slate-600">{idea.pointsAssigned} puntos</p>
                  <Link className="btn btn-secondary" href={`/ideas/${idea.id}`}>
                    <Eye className="h-4 w-4" aria-hidden /> Ver seguimiento
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
