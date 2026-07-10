import type { ApprovalType, Role } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, Check, CheckCircle2, Clock3, Eye, MessageSquareMore, UserRound, XCircle } from "lucide-react";
import { validationDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { approvalStatusLabels, approvalTypeLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const validationTone: Record<ApprovalType, { accent: string; link: string; soft: string; sectionTone: "green" | "red" | "gray" | "blue" | "dark"; eyebrow: string }> = {
  SUPERVISOR: { accent: "bg-emerald-600", link: "text-emerald-800", soft: "bg-emerald-50", sectionTone: "green", eyebrow: "Supervisor" },
  CALIDAD: { accent: "bg-red-600", link: "text-red-800", soft: "bg-red-50", sectionTone: "red", eyebrow: "Calidad e inocuidad" },
  SEGURIDAD: { accent: "bg-slate-600", link: "text-slate-800", soft: "bg-slate-100", sectionTone: "gray", eyebrow: "Seguridad industrial" },
  MANTENIMIENTO: { accent: "bg-blue-600", link: "text-blue-800", soft: "bg-blue-50", sectionTone: "blue", eyebrow: "Mantenimiento" },
  MEJORA_CONTINUA_FINAL: { accent: "bg-slate-950", link: "text-slate-950", soft: "bg-slate-100", sectionTone: "dark", eyebrow: "Mejora Continua" }
};

export async function ValidationInbox({ type, roles, title }: { type: ApprovalType; roles: Role[]; title: string }) {
  await requireUser(["ADMIN", ...roles]);
  const [approvals, reviewedApprovals] = await Promise.all([
    prisma.approval.findMany({
      where: { type, status: { in: ["PENDING", "MORE_INFO"] } },
      include: { idea: { include: { area: true, supervisor: true } }, assignedTo: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.approval.findMany({
      where: { type, status: { in: ["APPROVED", "REJECTED"] } },
      include: {
        idea: { include: { area: true, supervisor: true, implementationOwner: true, approvals: { orderBy: { createdAt: "asc" } } } },
        assignedTo: true
      },
      orderBy: { updatedAt: "desc" },
      take: 40
    })
  ]);
  const tone = validationTone[type];
  const approvedCount = reviewedApprovals.filter((approval) => approval.status === "APPROVED").length;
  const rejectedCount = reviewedApprovals.filter((approval) => approval.status === "REJECTED").length;

  return (
    <>
      <PageHeader eyebrow={`${tone.eyebrow} · Bandeja de validación`} title={title} description="Atiende primero las validaciones pendientes y consulta después el avance de las ideas que ya revisaste." />

      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard detail="Esperan una decision" icon={Clock3} label="Pendientes" tone="amber" value={approvals.length} />
        <KpiCard detail="Validaciones favorables" icon={CheckCircle2} label="Aprobadas" tone="green" value={approvedCount} />
        <KpiCard detail="Con justificacion registrada" icon={XCircle} label="Rechazadas" tone="red" value={rejectedCount} />
      </section>

      <section className="mt-8">
        <SectionHeading count={approvals.length} description="Revisa problema, propuesta y beneficio antes de decidir." title="Pendientes de validación" tone={tone.sectionTone} />
        {!approvals.length ? <EmptyState title="Todo está al día" description="Las ideas que requieran la validación del departamento aparecerán aquí." /> : null}
        <div className="grid gap-4">
          {approvals.map((approval) => (
            <article className="surface overflow-hidden rounded-lg" key={approval.id}>
              <div className={`h-1 ${tone.accent}`} />
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className={`text-lg font-extrabold hover:underline ${tone.link}`} href={`/ideas/${approval.idea.id}`}>{approval.idea.folio}</Link>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-extrabold ${tone.soft} ${tone.link}`}>Área {approval.idea.area.code}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{approval.idea.collaboratorName} · {approval.idea.createdAt.toLocaleDateString("es-MX")}</p>
                  </div>
                  <StatusPill status={approval.idea.status} />
                </div>

                <div className="mt-5 grid gap-4 border-y border-line py-4 lg:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Problema</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{approval.idea.problem}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Propuesta</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{approval.idea.proposal}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Beneficio esperado</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{approval.idea.expectedBenefit}</p>
                  </div>
                </div>

                <form action={validationDecisionAction} className="mt-4 grid gap-3">
                  <input name="ideaId" type="hidden" value={approval.idea.id} />
                  <input name="type" type="hidden" value={type} />
                  <label>
                    <span className="label">Comentario de la validación</span>
                    <textarea className="field min-h-20" name="comments" placeholder="Obligatorio al rechazar o solicitar información" />
                  </label>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <button className="btn btn-success" name="decision" type="submit" value="APROBAR">
                      <Check className="h-4 w-4" aria-hidden /> Aprobar validación
                    </button>
                    <button className="btn btn-secondary" name="decision" type="submit" value="SOLICITAR_INFORMACION">
                      <MessageSquareMore className="h-4 w-4" aria-hidden /> Solicitar información
                    </button>
                    <button className="btn btn-danger sm:ml-auto" name="decision" type="submit" value="RECHAZAR">
                      <XCircle className="h-4 w-4" aria-hidden /> Rechazar
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading count={reviewedApprovals.length} description="Seguimiento posterior a la decision de tu departamento." title="Validaciones realizadas" tone={tone.sectionTone} />
        {!reviewedApprovals.length ? <EmptyState title="Aún no hay validaciones realizadas" description="Las ideas revisadas permanecerán visibles en esta sección." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {reviewedApprovals.map((approval) => {
            const supportApprovals = approval.idea.approvals.filter((item) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(item.type));
            return (
              <article className="surface rounded-lg p-4 sm:p-5" key={approval.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link className={`text-base font-extrabold hover:underline ${tone.link}`} href={`/ideas/${approval.idea.id}`}>{approval.idea.folio}</Link>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{approval.idea.area.code} · {approval.idea.collaboratorName}</p>
                  </div>
                  <StatusPill status={approval.idea.status} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{approval.idea.problem}</p>

                <div className={`mt-4 border-l-4 p-3 ${tone.soft}`}>
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">Decision del departamento</p>
                  <p className={`mt-1 text-sm font-extrabold ${tone.link}`}>{approvalStatusLabels[approval.status]}</p>
                  {approval.comments ? <p className="mt-1 text-sm leading-5 text-slate-700">{approval.comments}</p> : null}
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="border-l-2 border-slate-300 pl-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><UserRound className="h-3.5 w-3.5" aria-hidden />Responsable</dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">{approval.idea.implementationOwner?.name ?? "Pendiente de asignar"}</dd>
                  </div>
                  <div className="border-l-2 border-slate-300 pl-3">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-500"><CalendarDays className="h-3.5 w-3.5" aria-hidden />Compromiso</dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">{approval.idea.dueDate ? approval.idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">Todas las validaciones</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {supportApprovals.map((item) => (
                      <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-slate-700" key={item.id}>
                        {approvalTypeLabels[item.type]}: {approvalStatusLabels[item.status]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs font-extrabold text-slate-600">{approval.idea.pointsAssigned} puntos</p>
                  <Link className="btn btn-secondary" href={`/ideas/${approval.idea.id}`}><Eye className="h-4 w-4" aria-hidden />Ver seguimiento</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
