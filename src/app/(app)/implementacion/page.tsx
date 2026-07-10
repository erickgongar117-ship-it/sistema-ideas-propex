import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Save, UserRound } from "lucide-react";
import { implementationUpdateAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { isOverdue } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export default async function ImplementationPage() {
  const user = await requireUser(["ADMIN", "MEJORA_CONTINUA", "MANTENIMIENTO", "SUPERVISOR"]);
  const ideas = await prisma.idea.findMany({
    where: { status: { in: ["EN_IMPLEMENTACION", "IMPLEMENTADA", "VENCIDA"] }, ...(user.role === "SUPERVISOR" ? { supervisorId: user.id } : {}) },
    include: { area: true, implementationOwner: true, supervisor: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }]
  });
  const overdue = ideas.filter(isOverdue).length;
  const implemented = ideas.filter((idea) => idea.status === "IMPLEMENTADA").length;

  return (
    <>
      <PageHeader eyebrow="Ejecución · Avances y evidencia" title="Implementación" description="Registra avances, carga la evidencia final y marca las acciones terminadas." />
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard detail="Acciones en esta bandeja" icon={Clock3} label="En seguimiento" tone="blue" value={ideas.length} />
        <KpiCard detail="Fecha compromiso superada" icon={AlertTriangle} label="Vencidas" tone="red" value={overdue} />
        <KpiCard detail="Esperan cierre de MC" icon={CheckCircle2} label="Implementadas" tone="green" value={implemented} />
      </section>

      <section className="mt-8">
        <SectionHeading count={ideas.length} description="Actualiza cada acción sin perder de vista responsable y compromiso." title="Acciones activas" tone="blue" />
        {!ideas.length ? <EmptyState title="Sin acciones pendientes" description="Cuando se te asigne una implementación aparecerá en esta bandeja." /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {ideas.map((idea) => {
            const overdueIdea = isOverdue(idea);
            return (
              <article className={`surface overflow-hidden rounded-lg ${overdueIdea ? "border-rose-300" : ""}`} key={idea.id}>
                <div className={`h-1 ${overdueIdea ? "bg-rose-600" : "bg-blue-600"}`} />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link className="text-lg font-extrabold text-blue-800 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-extrabold text-blue-800">{idea.area.code}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>
                    </div>
                    <StatusPill status={idea.status} />
                  </div>

                  <dl className="mt-4 grid gap-3 border-y border-line py-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /><div><dt className="text-[10px] font-extrabold uppercase text-slate-500">Responsable</dt><dd className="mt-0.5 text-xs font-extrabold text-ink">{idea.implementationOwner?.name ?? "Sin asignar"}</dd></div></div>
                    <div className="flex items-start gap-2"><CalendarDays className={`mt-0.5 h-4 w-4 shrink-0 ${overdueIdea ? "text-rose-600" : "text-slate-400"}`} aria-hidden /><div><dt className="text-[10px] font-extrabold uppercase text-slate-500">Fecha compromiso</dt><dd className={`mt-0.5 text-xs font-extrabold ${overdueIdea ? "text-rose-700" : "text-ink"}`}>{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</dd></div></div>
                  </dl>

                  <form action={implementationUpdateAction} className="mt-4 grid gap-3">
                    <input name="ideaId" type="hidden" value={idea.id} />
                    <label><span className="label">Avance realizado</span><textarea className="field min-h-20" name="comments" placeholder="Describe que se hizo o que falta" /></label>
                    <label><span className="label">Evidencia después</span><input className="field" name="afterEvidence" type="file" accept="image/*,.pdf" /></label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input name="markImplemented" type="checkbox" />Trabajo terminado</label>
                      <button className="btn btn-primary" type="submit"><Save className="h-4 w-4" aria-hidden />Guardar avance</button>
                    </div>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
