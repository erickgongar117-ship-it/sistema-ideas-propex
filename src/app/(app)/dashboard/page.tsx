import { IdeaStatus } from "@prisma/client";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Lightbulb,
  Medal,
  Plus,
  QrCode,
  ShieldCheck,
  Timer,
  XCircle
} from "lucide-react";
import { BarList, KpiCard } from "@/components/mini-charts";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
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

  const byArea = areas.map((area) => ({ label: area.code, value: ideas.filter((idea) => idea.areaId === area.id).length }));
  const closed = ideas.filter((idea) => idea.status === "CERRADA").length;
  const rejected = ideas.filter((idea) => ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(idea.status)).length;
  const approved = ideas.filter((idea) => ["APROBADA_SUPERVISOR", "APROBADA_PARA_IMPLEMENTAR", "EN_IMPLEMENTACION", "IMPLEMENTADA", "CERRADA"].includes(idea.status)).length;
  const overdue = ideas.filter((idea) => idea.status === "VENCIDA" || (idea.dueDate && idea.dueDate < new Date() && !["CERRADA", "CANCELADA"].includes(idea.status))).length;
  const totalPoints = ideas.reduce((sum, idea) => sum + idea.pointsAssigned, 0);
  const closeRate = ideas.length ? Math.round((closed / ideas.length) * 100) : 0;
  const impactCounts = new Map<string, number>();
  ideas.forEach((idea) => parseImpactTypes(idea.impactTypes).forEach((impact) => impactCounts.set(impact, (impactCounts.get(impact) ?? 0) + 1)));
  const topImpacts = Array.from(impactCounts.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  const statusRows = Object.values(IdeaStatus).map((status) => ({ label: statusLabels[status], value: ideas.filter((idea) => idea.status === status).length }));
  const recentIdeas = ideas.slice(0, 8);

  const waitingSupervisor = ideas.filter((idea) => ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"].includes(idea.status)).length;
  const waitingValidation = ideas.filter((idea) => ["EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"].includes(idea.status)).length;
  const readyForMc = ideas.filter((idea) => ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "IMPLEMENTADA", "EN_VALIDACION_FINAL"].includes(idea.status)).length;
  const implementationDays = ideas.filter((idea) => idea.implementedAt && idea.dueDate).length
    ? `${Math.round(
        ideas
          .filter((idea) => idea.implementedAt && idea.dueDate)
          .reduce((sum, idea) => sum + Math.max(0, (idea.implementedAt?.getTime() ?? 0) - idea.createdAt.getTime()), 0) /
          Math.max(1, ideas.filter((idea) => idea.implementedAt && idea.dueDate).length) /
          1000 /
          60 /
          60 /
          24
      )} d`
    : "0 d";

  const attentionItems = [
    { label: "Revisión de supervisor", value: waitingSupervisor, href: "/supervisor", icon: Clock3 },
    { label: "Validaciones pendientes", value: waitingValidation, href: "/kanban", icon: ShieldCheck },
    { label: "Acciones de Mejora Continua", value: readyForMc, href: "/mejora", icon: Lightbulb },
    { label: "Compromisos vencidos", value: overdue, href: "/vencidas", icon: AlertTriangle }
  ];

  return (
    <>
      <PageHeader
        title="Panel general"
        eyebrow="Mejora Continua · Centro de control"
        description="Prioridades, resultados y avance del programa de ideas de mejora."
        actions={
          <>
            <Link aria-label="Ver codigos QR" className="icon-button" href="/qr" title="Codigos QR">
              <QrCode className="h-[18px] w-[18px]" aria-hidden />
            </Link>
            <Link className="btn btn-secondary" href="/api/export">
              <Download className="h-4 w-4" aria-hidden />
              Exportar
            </Link>
            <Link className="btn btn-primary" href="/#areas">
              <Plus className="h-4 w-4" aria-hidden />
              Nueva idea
            </Link>
          </>
        }
      />

      <section className="overflow-hidden rounded-lg bg-slate-950 text-white">
        <div className="grid lg:grid-cols-[280px_1fr]">
          <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-red-300">Atención de hoy</p>
            <h2 className="mt-2 text-xl font-extrabold">Lo que necesita movimiento</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Abre una bandeja para continuar el proceso.</p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link className="group flex min-h-28 items-center gap-3 border-b border-white/10 p-4 transition hover:bg-white/5 sm:border-r xl:border-b-0" href={item.href} key={item.label}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-2xl font-extrabold">{item.value}</span>
                    <span className="mt-1 block text-xs font-bold leading-4 text-slate-300">{item.label}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard detail="Todas las áreas" icon={Lightbulb} label="Ideas registradas" value={ideas.length} />
        <KpiCard detail="Con autorización o avance" icon={CheckCircle2} label="Aprobadas" tone="green" value={approved} />
        <KpiCard detail="Supervisor o soporte" icon={XCircle} label="Rechazadas" tone="red" value={rejected} />
        <KpiCard detail={`${closeRate}% de cierre`} icon={CheckCircle2} label="Cerradas" tone="dark" value={closed} />
        <KpiCard detail={`${overdue} compromisos vencidos`} icon={Medal} label="Puntos otorgados" tone="amber" value={totalPoints} />
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface rounded-lg p-5 sm:p-6">
          <SectionHeading description="Participación acumulada por zona" title="Ideas por área" />
          <BarList color="#14835f" rows={byArea} />
        </div>
        <div className="surface rounded-lg p-5 sm:p-6">
          <SectionHeading description="Tiempo transcurrido en cada etapa" title="Tiempos promedio" />
          <dl className="divide-y divide-line">
            {[
              ["Respuesta del supervisor", averageHours(supervisorApprovals), Clock3],
              ["Validación de soporte", averageHours(validationApprovals), ShieldCheck],
              ["Implementación", implementationDays, Timer]
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof Clock3;
              return (
                <div className="flex items-center gap-3 py-3.5" key={label as string}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <MetricIcon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <dt className="min-w-0 flex-1 text-sm font-bold text-slate-600">{label as string}</dt>
                  <dd className="text-xl font-extrabold text-ink">{value as string}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="surface rounded-lg p-5 sm:p-6">
          <SectionHeading description="Distribucion actual del flujo" title="Ideas por estatus" />
          <div className="divide-y divide-line">
            {statusRows.filter((row) => row.value > 0).map((row) => (
              <div className="flex items-center justify-between gap-3 py-2.5" key={row.label}>
                <span className="text-sm font-semibold text-slate-700">{row.label}</span>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-extrabold text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="surface rounded-lg p-5 sm:p-6">
          <SectionHeading description="Temas con mayor participación" title="Impacto SQDCM" />
          <BarList color="#e21d2b" rows={topImpacts.length ? topImpacts : [{ label: "Sin datos", value: 0 }]} />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeading
          actions={<Link className="text-sm font-extrabold text-brand-700 hover:underline" href="/ideas">Ver todas</Link>}
          description="Ultimos registros recibidos"
          title="Ideas recientes"
        />
        <div className="mobile-card-list">
          {recentIdeas.map((idea) => (
            <Link className="surface block rounded-lg p-4" href={`/ideas/${idea.id}`} key={idea.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-ink">{idea.folio}</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-500">{idea.area.code} · {idea.collaboratorName}</p>
                </div>
                <StatusPill status={idea.status} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-700">{idea.problem}</p>
            </Link>
          ))}
        </div>
        <div className="table-wrap desktop-table-only">
          <table className="data-table">
            <thead>
              <tr><th>Folio</th><th>Área</th><th>Problema</th><th>Supervisor</th><th>Estatus</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {recentIdeas.map((idea) => (
                <tr key={idea.id}>
                  <td><Link className="font-extrabold text-brand-700" href={`/ideas/${idea.id}`}>{idea.folio}</Link></td>
                  <td className="font-bold">{idea.area.code}</td>
                  <td className="max-w-md"><p className="line-clamp-2">{idea.problem}</p></td>
                  <td>{idea.supervisor?.name ?? "Sin supervisor"}</td>
                  <td><StatusPill status={idea.status} /></td>
                  <td className="whitespace-nowrap">{idea.createdAt.toLocaleDateString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
