import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, Eye, MessageSquareMore, UserRound, X } from "lucide-react";
import { supervisorDecisionAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { approvalStatusLabels, approvalTypeLabels, ideaCategoryLabels } from "@/lib/domain";
import { buildInitialReviewWhere, getSupervisableOrgUnitIds } from "@/lib/idea-access";
import { prisma } from "@/lib/prisma";

function SupportRequestFields({
  idea,
  supportAreas
}: {
  idea: {
    impactsQuality: boolean;
    impactsSafety: boolean;
    requiresMaintenance: boolean;
    area: { organizationUnit: { plantId: string } | null };
    supportRequests: Array<{ orgUnitId: string }>;
  };
  supportAreas: Array<{ id: string; name: string; code: string; plantId: string }>;
}) {
  const selectedIds = new Set(idea.supportRequests.map((request) => request.orgUnitId));
  const available = supportAreas.filter((area) => !idea.area.organizationUnit || area.plantId === idea.area.organizationUnit.plantId);
  for (const area of available) {
    const normalized = `${area.code} ${area.name}`.toLowerCase();
    if (idea.impactsQuality && (normalized.includes("calidad") || normalized.includes("inocuidad") || normalized.includes("-cal"))) selectedIds.add(area.id);
    if (idea.impactsSafety && (normalized.includes("seguridad") || normalized.includes("ambiente") || normalized.includes("-seg"))) selectedIds.add(area.id);
    if (idea.requiresMaintenance && (normalized.includes("mantenimiento") || normalized.includes("servicio") || normalized.includes("-man"))) selectedIds.add(area.id);
  }
  return (
    <fieldset className="rounded-lg border border-line bg-panel p-3">
      <legend className="px-1 text-xs font-extrabold text-ink">¿Necesitas apoyo para validar o realizar esta idea?</legend>
      <p className="mb-3 mt-1 text-xs leading-5 text-slate-500">Marca las áreas que deban revisarla. Al aprobar, les aparecerá automáticamente en su bandeja.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {available.map((area) => (
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-extrabold text-slate-700" key={area.id}>
            <input defaultChecked={selectedIds.has(area.id)} name="supportUnitIds" type="checkbox" value={area.id} />
            {area.name}
          </label>
        ))}
      </div>
      {!available.length ? <p className="text-xs font-bold text-amber-800">No hay areas de apoyo configuradas para esta planta.</p> : null}
    </fieldset>
  );
}

export default async function SupervisorPage() {
  const user = await requireUser();
  const supervisableOrgUnitIds = user.role === "ADMIN" ? [] : await getSupervisableOrgUnitIds(user.id);
  const initialReviewWhere = buildInitialReviewWhere(user, supervisableOrgUnitIds);
  const approvedWhere = (user.role === "ADMIN"
    ? { approvals: { some: { type: "SUPERVISOR", status: "APPROVED" } } }
    : {
        OR: [
          { approvals: { some: { type: "SUPERVISOR", status: "APPROVED", assignedToId: user.id } } },
          { AND: [initialReviewWhere, { approvals: { some: { type: "SUPERVISOR", status: "APPROVED" } } }] }
        ]
      }) satisfies Prisma.IdeaWhereInput;
  const [ideas, approvedIdeas, supportAreas] = await Promise.all([
    prisma.idea.findMany({
      where: {
        AND: [
          { status: { in: ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"] } },
          initialReviewWhere
        ]
      },
      include: { area: { include: { organizationUnit: true } }, supervisor: true, supportRequests: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.idea.findMany({
      where: approvedWhere,
      include: { area: true, implementationOwner: true, approvals: { include: { assignedTo: true }, orderBy: { createdAt: "asc" } }, supportRequests: { include: { orgUnit: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 40
    }),
    prisma.orgUnit.findMany({
      where: { active: true, isSupportArea: true },
      orderBy: [{ plantId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, plantId: true }
    })
  ]);
  const ideasInMotion = approvedIdeas.filter((idea) => !["CERRADA", "CANCELADA"].includes(idea.status)).length;
  const closedIdeas = approvedIdeas.filter((idea) => idea.status === "CERRADA").length;

  return (
    <>
      <PageHeader
        eyebrow="Jefatura / Revisión directa"
        title="Bandeja de aprobaciones"
        description="Atiende las ideas que recibes por asignación, ruta jerárquica o alcance de equipo y conserva su seguimiento después de decidir."
      />

      <section className="hidden gap-3 sm:grid sm:grid-cols-3">
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
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700">{ideaCategoryLabels[idea.category]}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{idea.collaboratorName} · {idea.shift} · {idea.createdAt.toLocaleDateString("es-MX")}</p>
                  </div>
                  <StatusPill status={idea.status} />
                </div>

                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-slate-800">{idea.problem}</p>
                <details className="group mt-4 border-t border-line pt-1" open={ideas.length === 1}>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-extrabold text-emerald-800">
                    Revisar detalle y decidir
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="grid gap-4 border-y border-line py-4 lg:grid-cols-3">
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
                    <SupportRequestFields idea={idea} supportAreas={supportAreas} />
                    <label>
                      <span className="label">Comentario del responsable</span>
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
                </details>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading count={approvedIdeas.length} description="Consulta quién decidió, responsable, validaciones y resultado final." title="Aprobadas en tu alcance" />
        {!approvedIdeas.length ? <EmptyState title="Aun no hay ideas aprobadas" description="Cuando apruebes una idea, su seguimiento permanecera visible aqui." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {approvedIdeas.map((idea) => {
            const supportApprovals = idea.approvals.filter((approval) => ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"].includes(approval.type));
            const directApproval = idea.approvals.find((approval) => approval.type === "SUPERVISOR");
            return (
              <article className="surface rounded-lg p-4 sm:p-5" key={idea.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link className="text-base font-extrabold text-ink hover:text-brand-700" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{idea.area.code} · {idea.collaboratorName}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Aprobó {directApproval?.assignedTo?.name ?? "Responsable no identificado"}{directApproval?.decidedAt ? ` · ${directApproval.decidedAt.toLocaleDateString("es-MX")}` : ""}</p>
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
                    {supportApprovals.length || idea.supportRequests.length ? (
                      <>
                        {supportApprovals.map((approval) => (
                          <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-slate-700" key={approval.id}>
                            {approvalTypeLabels[approval.type]}: {approvalStatusLabels[approval.status]}
                          </span>
                        ))}
                        {idea.supportRequests.map((request) => (
                          <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-bold text-slate-700" key={request.id}>
                            {request.orgUnit.name}: {approvalStatusLabels[request.status]}
                          </span>
                        ))}
                      </>
                    ) : <span className="text-xs text-slate-500">No requirio validaciones adicionales.</span>}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs font-extrabold text-slate-600">{idea.pointsAssigned} ProbocaCoins</p>
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
