import { IdeaStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { classificationLabels, priorityLabels, statusLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type IdeasPageProps = {
  searchParams: Promise<{ q?: string; status?: string; area?: string }>;
};

export default async function IdeasPage({ searchParams }: IdeasPageProps) {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const query = await searchParams;
  const where: Prisma.IdeaWhereInput = {};
  if (query.q) {
    where.OR = [
      { folio: { contains: query.q } },
      { collaboratorName: { contains: query.q } },
      { problem: { contains: query.q } },
      { proposal: { contains: query.q } }
    ];
  }
  if (query.status && Object.values(IdeaStatus).includes(query.status as IdeaStatus)) {
    where.status = query.status as IdeaStatus;
  }
  if (query.area) where.area = { code: query.area };

  const [ideas, areas] = await Promise.all([
    prisma.idea.findMany({
      where,
      include: { area: true, supervisor: true, implementationOwner: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.area.findMany({ orderBy: { code: "asc" } })
  ]);

  return (
    <>
      <PageHeader
        title="Tabla maestra de ideas"
        description="Busqueda, filtros, orden visual y exportacion completa."
        actions={
          <Link className="btn btn-primary" href="/api/export">
            <Download className="h-4 w-4" aria-hidden />
            Exportar Excel
          </Link>
        }
      />

      <form className="surface mb-5 grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_180px_220px_auto]" method="get">
        <label>
          <span className="label">Buscar</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input className="field pl-9" defaultValue={query.q ?? ""} name="q" placeholder="Folio, colaborador, problema" />
          </div>
        </label>
        <label>
          <span className="label">Area</span>
          <select className="field" defaultValue={query.area ?? ""} name="area">
            <option value="">Todas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.code}>
                {area.code}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Estatus</span>
          <select className="field" defaultValue={query.status ?? ""} name="status">
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn btn-secondary w-full" type="submit">
            Filtrar
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Area</th>
              <th>Colaborador</th>
              <th>Problema</th>
              <th>Supervisor</th>
              <th>Estatus</th>
              <th>Prioridad</th>
              <th>Clasificacion</th>
              <th>Compromiso</th>
              <th>Dias abiertos</th>
              <th>Puntos</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {ideas.map((idea) => {
              const daysOpen = Math.max(0, Math.floor((Date.now() - idea.createdAt.getTime()) / 1000 / 60 / 60 / 24));
              return (
                <tr key={idea.id}>
                  <td className="font-black text-brand-700">{idea.folio}</td>
                  <td>{idea.createdAt.toLocaleDateString("es-MX")}</td>
                  <td>{idea.area.code}</td>
                  <td>{idea.collaboratorName}</td>
                  <td>{idea.problem}</td>
                  <td>{idea.supervisor?.name ?? ""}</td>
                  <td>
                    <StatusPill status={idea.status} />
                  </td>
                  <td>{idea.priority ? priorityLabels[idea.priority] : ""}</td>
                  <td>{idea.classification ? classificationLabels[idea.classification] : ""}</td>
                  <td>{idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : ""}</td>
                  <td>{daysOpen}</td>
                  <td>{idea.pointsAssigned}</td>
                  <td>
                    <Link className="font-bold text-brand-700" href={`/ideas/${idea.id}`}>
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
