import { IdeaCard } from "@/components/idea-card";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { kanbanColumns } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export default async function KanbanPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const ideas = await prisma.idea.findMany({
    include: { area: true, supervisor: true, implementationOwner: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <>
      <PageHeader title="Kanban de seguimiento" description="Vista de flujo para Mejora Continua." />
      <div className="grid gap-4 xl:grid-cols-7">
        {kanbanColumns.map((column) => {
          const columnIdeas = ideas.filter((idea) => column.statuses.includes(idea.status));
          return (
            <section className="min-h-64 rounded-lg border border-line bg-panel p-3" key={column.title}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-ink">{column.title}</h2>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-600">{columnIdeas.length}</span>
              </div>
              <div className="space-y-3">
                {columnIdeas.map((idea) => (
                  <IdeaCard idea={idea} key={idea.id} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
