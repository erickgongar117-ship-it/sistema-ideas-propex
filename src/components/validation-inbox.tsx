import type { ApprovalType, Role } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Eye, UserRound } from "lucide-react";
import { validationDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { approvalStatusLabels, approvalTypeLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const validationTone: Record<ApprovalType, { card: string; link: string; stripe: string }> = {
  SUPERVISOR: { card: "border-emerald-200", link: "text-emerald-800", stripe: "bg-emerald-600" },
  CALIDAD: { card: "border-red-200", link: "text-red-800", stripe: "bg-red-600" },
  SEGURIDAD: { card: "border-slate-300", link: "text-slate-800", stripe: "bg-slate-600" },
  MANTENIMIENTO: { card: "border-blue-200", link: "text-blue-800", stripe: "bg-blue-600" },
  MEJORA_CONTINUA_FINAL: { card: "border-slate-800", link: "text-slate-950", stripe: "bg-slate-950" }
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
        idea: {
          include: {
            area: true,
            supervisor: true,
            implementationOwner: true,
            approvals: { orderBy: { createdAt: "asc" } }
          }
        },
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
      <PageHeader title={title} description={`Pendientes y seguimiento de ideas revisadas por ${approvalTypeLabels[type]}.`} />

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-black uppercase text-slate-500">Pendientes</p>
          <p className={`mt-2 text-3xl font-black ${tone.link}`}>{approvals.length}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-black uppercase text-slate-500">Aprobadas</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{approvedCount}</p>
        </div>
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-black uppercase text-slate-500">Rechazadas</p>
          <p className="mt-2 text-3xl font-black text-red-700">{rejectedCount}</p>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <div className={`h-8 w-2 rounded-full ${tone.stripe}`} />
          <div>
            <h2 className="text-xl font-black text-ink">Pendientes de validacion</h2>
            <p className="text-sm font-semibold text-slate-600">Aqui apruebas, rechazas o pides mas informacion.</p>
          </div>
        </div>
        {!approvals.length ? <EmptyState title="Sin validaciones pendientes" /> : null}
        <div className="grid gap-4">
          {approvals.map((approval) => (
            <article className={`surface overflow-hidden rounded-lg border ${tone.card}`} key={approval.id}>
              <div className={`h-2 ${tone.stripe}`} />
              <div className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link className={`text-lg font-black ${tone.link}`} href={`/ideas/${approval.idea.id}`}>
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
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-8 w-2 rounded-full bg-slate-950" />
          <div>
            <h2 className="text-xl font-black text-ink">Revisadas por el departamento</h2>
            <p className="text-sm font-semibold text-slate-600">Seguimiento para saber que paso despues de tu validacion.</p>
          </div>
        </div>
        {!reviewedApprovals.length ? <EmptyState title="Sin ideas revisadas aun" description="Cuando el departamento valide una idea, aparecera aqui su seguimiento." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {reviewedApprovals.map((approval) => {
            const supportApprovals = approval.idea.approvals.filter((item) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(item.type));
            return (
              <article className="surface overflow-hidden rounded-lg" key={approval.id}>
                <div className={`h-2 ${tone.stripe}`} />
                <div className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link className={`text-lg font-black ${tone.link}`} href={`/ideas/${approval.idea.id}`}>
                        {approval.idea.folio}
                      </Link>
                      <p className="text-sm font-bold text-slate-500">
                        {approval.idea.area.code} - {approval.idea.collaboratorName}
                      </p>
                    </div>
                    <StatusPill status={approval.idea.status} />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-800">{approval.idea.problem}</p>

                  <div className="mt-4 rounded-lg border border-line bg-panel p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Decision del departamento</p>
                    <p className="mt-1 text-sm font-black text-ink">{approvalStatusLabels[approval.status]}</p>
                    {approval.comments ? <p className="mt-2 text-sm text-slate-700">{approval.comments}</p> : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-panel p-3">
                      <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                        <UserRound className="h-3.5 w-3.5" aria-hidden />
                        Responsable
                      </p>
                      <p className="mt-1 text-sm font-black text-ink">{approval.idea.implementationOwner?.name ?? "Pendiente por Mejora Continua"}</p>
                    </div>
                    <div className="rounded-lg bg-panel p-3">
                      <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        Compromiso
                      </p>
                      <p className="mt-1 text-sm font-black text-ink">{approval.idea.dueDate ? approval.idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-line bg-white p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Validaciones
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {supportApprovals.map((item) => (
                        <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-black text-slate-700" key={item.id}>
                          {approvalTypeLabels[item.type]}: {approvalStatusLabels[item.status]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-700">Puntos: {approval.idea.pointsAssigned}</p>
                    <Link className="btn btn-secondary" href={`/ideas/${approval.idea.id}`}>
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
