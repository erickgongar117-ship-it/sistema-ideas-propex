import { IdeaStatus } from "@prisma/client";
import Link from "next/link";
import { Download, Plus, QrCode } from "lucide-react";
import { BarList, KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { parseImpactTypes, statusLabels } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

function averageHours(rows: Array<{ idea: { createdAt: Date }; decidedAt: Date | null }>) {
  const closed = rows.filter((row) => row.decidedAt);
  if (!closed.length) return "0 h";
  const total = closed.reduce((sum, row) => sum + ((row.decidedAt?.getTime() ?? 0) - row.idea.createdAt.getTime()), 0);
  return `${Math.max(1, Math.round(total / closed.length / 1000 / 60 / 60))} h`;
}

export default async function DashboardPage() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const [ideas, areas, supervisorApprovals, validationApprovals] = await Promise.all([
    prisma.idea.findMany({
      include: { area: true, supervisor: true, implementationOwner: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.area.findMany({ include: { supervisor: true }, orderBy: { code: "asc" } }),
    prisma.approval.findMany({ where: { type: "SUPERVISOR" }, include: { idea: true } }),
    prisma.approval.findMany({ where: { type: { in: ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"] } }, include: { idea: true } })
  ]);

  const byArea = areas.map((area) => ({
    label: area.code,
    value: ideas.filter((idea) => idea.areaId === area.id).length
  }));
  const closed = ideas.filter((idea) => idea.status === "CERRADA").length;
  const rejected = ideas.filter((idea) => ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status)).length;
  const approved = ideas.filter((idea) =>
    ["APROBADA_SUPERVISOR", "APROBADA_PARA_IMPLEMENTAR", "EN_IMPLEMENTACION", "IMPLEMENTADA", "CERRADA"].includes(idea.status)
  ).length;
  const overdue = ideas.filter((idea) => idea.status === "VENCIDA").length;
  const totalPoints = ideas.reduce((sum, idea) => sum + idea.pointsAssigned, 0);
  const closeRate = ideas.length ? Math.round((closed / ideas.length) * 100) : 0;
  const impactCounts = new Map<string, number>();
  ideas.forEach((idea) => parseImpactTypes(idea.impactTypes).forEach((impact) => impactCounts.set(impact, (impactCounts.get(impact) ?? 0) + 1)));
  const topImpacts = Array.from(impactCounts.entries()).map(([label, value]) => ({ label, value })).slice(0, 8);

  const statusRows = Object.values(IdeaStatus).map((status) => ({
    label: statusLabels[status],
    value: ideas.filter((idea) => idea.status === status).length
  }));

  return (
    <>
      <PageHeader
        title="Inicio / Dashboard"
        description="Indicadores ejecutivos del flujo de ideas de mejora, participacion, estatus y vencimientos."
        actions={
          <>
            <Link className="btn btn-secondary" href="/qr">
              <QrCode className="h-4 w-4" aria-hidden />
              QR
            </Link>
            <Link className="btn btn-secondary" href="/api/export">
              <Download className="h-4 w-4" aria-hidden />
              Excel
            </Link>
            <Link className="btn btn-primary" href="/captura/P1">
              <Plus className="h-4 w-4" aria-hidden />
              Registrar P1
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Ideas registradas" value={ideas.length} detail="Todas las areas" />
        <KpiCard label="Aprobadas" value={approved} detail="Supervisor o avance posterior" />
        <KpiCard label="Rechazadas" value={rejected} detail="Supervisor o validacion" />
        <KpiCard label="Cerradas" value={closed} detail={`${closeRate}% de cierre`} />
        <KpiCard label="Puntos asignados" value={totalPoints} detail={`${overdue} ideas vencidas`} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface rounded-lg p-5">
          <h2 className="text-lg font-black text-ink">Ideas por area</h2>
          <div className="mt-4">
            <BarList rows={byArea} />
          </div>
        </div>
        <div className="surface rounded-lg p-5">
          <h2 className="text-lg font-black text-ink">Tiempos promedio</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <KpiCard label="Respuesta supervisor" value={averageHours(supervisorApprovals)} />
            <KpiCard label="Validacion soporte" value={averageHours(validationApprovals)} />
            <KpiCard
              label="Implementacion"
              value={
                ideas.filter((idea) => idea.implementedAt && idea.dueDate).length
                  ? `${Math.round(
                      ideas
                        .filter((idea) => idea.implementedAt && idea.dueDate)
                        .reduce((sum, idea) => sum + ((idea.implementedAt?.getTime() ?? 0) - (idea.dueDate?.getTime() ?? 0)), 0) /
                        Math.max(1, ideas.filter((idea) => idea.implementedAt && idea.dueDate).length) /
                        1000 /
                        60 /
                        60 /
                        24
                    )} d`
                  : "0 d"
              }
            />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="surface rounded-lg p-5">
          <h2 className="text-lg font-black text-ink">Ideas por estatus</h2>
          <div className="mt-4 space-y-3">
            {statusRows
              .filter((row) => row.value > 0)
              .map((row) => (
                <div className="flex items-center justify-between gap-3 border-b border-line pb-2" key={row.label}>
                  <span className="text-sm font-bold text-slate-700">{row.label}</span>
                  <span className="text-sm font-black text-ink">{row.value}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="surface rounded-lg p-5">
          <h2 className="text-lg font-black text-ink">Impacto SQDCM</h2>
          <div className="mt-4">
            <BarList rows={topImpacts.length ? topImpacts : [{ label: "Sin datos", value: 0 }]} />
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">Ideas recientes</h2>
          <Link className="text-sm font-bold text-brand-700" href="/ideas">
            Ver tabla maestra
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Area</th>
                <th>Problema</th>
                <th>Supervisor</th>
                <th>Estatus</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {ideas.slice(0, 8).map((idea) => (
                <tr key={idea.id}>
                  <td>
                    <Link className="font-black text-brand-700" href={`/ideas/${idea.id}`}>
                      {idea.folio}
                    </Link>
                  </td>
                  <td>{idea.area.code}</td>
                  <td>{idea.problem}</td>
                  <td>{idea.supervisor?.name ?? "Sin supervisor"}</td>
                  <td>
                    <StatusPill status={idea.status} />
                  </td>
                  <td>{idea.createdAt.toLocaleDateString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
