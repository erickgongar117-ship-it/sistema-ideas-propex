import Link from "next/link";
import { List } from "lucide-react";
import { IdeaCard } from "@/components/idea-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { kanbanColumns } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const columnColors = ["bg-amber-500", "bg-red-500", "bg-emerald-600", "bg-blue-600", "bg-violet-600", "bg-slate-950", "bg-slate-500"];

export default async function KanbanPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideas = await prisma.idea.findMany({
    include: { area: true, supervisor: true, implementationOwner: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <>
      <PageHeader
        eyebrow="Mejora Continua · Flujo visual"
        title="Kanban de seguimiento"
        description="Recorre el proceso de izquierda a derecha. Cada columna mantiene un ancho comodo para leer y comparar."
        actions={<Link className="btn btn-secondary" href="/ideas"><List className="h-4 w-4" aria-hidden />Ver tabla</Link>}
      />
      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-max auto-cols-[minmax(286px,320px)] grid-flow-col gap-4">
          {kanbanColumns.map((column, index) => {
            const columnIdeas = ideas.filter((idea) => column.statuses.includes(idea.status));
            return (
              <section className="min-h-[520px] rounded-lg border border-line bg-[#eef1ef]" key={column.title}>
                <div className={`h-1 rounded-t-lg ${columnColors[index]}`} />
                <div className="flex min-h-[74px] items-start justify-between gap-3 border-b border-line bg-white p-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-slate-500">Etapa {index + 1}</p>
                    <h2 className="mt-1 max-w-[220px] text-sm font-extrabold leading-5 text-ink">{column.title}</h2>
                  </div>
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-extrabold text-slate-700">{columnIdeas.length}</span>
                </div>
                <div className="space-y-3 p-3">
                  {columnIdeas.length ? columnIdeas.map((idea) => <IdeaCard idea={idea} key={idea.id} />) : (
                    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-center text-xs font-bold text-slate-500">Sin ideas en esta etapa</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
