import Link from "next/link";
import { AlertTriangle, CalendarDays, Play, UserRound } from "lucide-react";
import { runRemindersAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OverduePage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideas = await prisma.idea.findMany({
    where: { OR: [{ status: "VENCIDA" }, { dueDate: { lt: new Date() }, status: { notIn: ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"] } }] },
    include: { area: true, supervisor: true, implementationOwner: true },
    orderBy: { dueDate: "asc" }
  });

  return (
    <>
      <PageHeader
        eyebrow="Mejora Continua · Semaforo de compromisos"
        title="Compromisos vencidos"
        description="Acciones cuya fecha compromiso ya terminó y todavía no tienen cierre."
        actions={<form action={runRemindersAction}><button className="btn btn-primary" type="submit"><Play className="h-4 w-4" aria-hidden />Actualizar y notificar</button></form>}
      />
      <div className="alert alert-danger mb-6"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span><strong>{ideas.length} {ideas.length === 1 ? "compromiso requiere" : "compromisos requieren"} atención.</strong> Abre el detalle para registrar avance o ajustar la asignación.</span></div>
      <SectionHeading count={ideas.length} title="Lista de atención" tone="red" />
      {!ideas.length ? <EmptyState title="Sin vencimientos" description="Todos los compromisos activos se encuentran dentro de fecha." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {ideas.map((idea) => {
          const daysLate = idea.dueDate ? Math.max(1, Math.ceil((Date.now() - idea.dueDate.getTime()) / 86400000)) : 0;
          return (
            <article className="surface overflow-hidden rounded-lg border-rose-200" key={idea.id}>
              <div className="h-1 bg-rose-600" />
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><Link className="text-lg font-extrabold text-rose-800 hover:underline" href={`/ideas/${idea.id}`}>{idea.folio}</Link><p className="mt-0.5 text-xs font-bold text-slate-500">Área {idea.area.code}</p></div>
                  <StatusPill status={idea.status} />
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>
                <dl className="mt-4 grid gap-3 border-y border-line py-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden /><div><dt className="text-[10px] font-extrabold uppercase text-slate-500">Responsable</dt><dd className="mt-0.5 text-xs font-extrabold text-ink">{idea.implementationOwner?.name ?? "Sin asignar"}</dd></div></div>
                  <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-rose-600" aria-hidden /><div><dt className="text-[10px] font-extrabold uppercase text-slate-500">Vencimiento</dt><dd className="mt-0.5 text-xs font-extrabold text-rose-700">{idea.dueDate?.toLocaleDateString("es-MX") ?? "Sin fecha"} · {daysLate} dias</dd></div></div>
                </dl>
                <Link className="btn btn-secondary mt-4 w-full" href={`/ideas/${idea.id}`}>Abrir seguimiento</Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
