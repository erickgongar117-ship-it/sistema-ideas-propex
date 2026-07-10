import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AlertCircle, Bell, Check, Clock3, Mail, RefreshCw } from "lucide-react";
import { markNotificationAction, retryNotificationAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type NotificationsProps = {
  searchParams: Promise<{ vista?: string; pagina?: string }>;
};

const statusMeta = {
  PENDING: { label: "Pendiente", className: "border-amber-200 bg-amber-50 text-amber-900", icon: Clock3 },
  ERROR: { label: "Requiere atención", className: "border-rose-200 bg-rose-50 text-rose-800", icon: AlertCircle },
  SENT: { label: "Enviada", className: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: Check },
  DISMISSED: { label: "Revisada", className: "border-slate-200 bg-slate-100 text-slate-700", icon: Check }
};

const channelLabels = { EMAIL: "Correo", TEAMS: "Teams", LOCAL: "Aviso interno" };

export default async function NotificationsPage({ searchParams }: NotificationsProps) {
  const user = await requireUser();
  const query = await searchParams;
  const canSeeAll = user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
  const showHistory = query.vista === "todas";
  const currentPage = Math.max(1, Number.parseInt(query.pagina ?? "1", 10) || 1);
  const pageSize = 20;
  const personalWhere: Prisma.NotificationOutboxWhereInput = canSeeAll ? {} : { to: { contains: user.email } };
  const activeWhere: Prisma.NotificationOutboxWhereInput = { ...personalWhere, status: { in: ["PENDING", "ERROR"] } };
  const viewWhere = showHistory ? personalWhere : activeWhere;
  const [notifications, pendingCount, viewCount] = await Promise.all([
    prisma.notificationOutbox.findMany({
      where: viewWhere,
      include: { idea: { include: { area: true } } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize
    }),
    prisma.notificationOutbox.count({ where: activeWhere }),
    prisma.notificationOutbox.count({ where: viewWhere })
  ]);
  const totalPages = Math.max(1, Math.ceil(viewCount / pageSize));
  const pageBase = showHistory ? "/notificaciones?vista=todas&pagina=" : "/notificaciones?pagina=";

  return (
    <>
      <PageHeader
        eyebrow="Avisos · Actividad del sistema"
        title="Notificaciones"
        description={canSeeAll ? "Avisos generados por el flujo y estado de los envíos de correo." : `Avisos dirigidos a ${user.email}.`}
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-lg bg-slate-950 p-5 text-white">
          <Bell className="h-6 w-6 text-red-300" aria-hidden />
          <p className="mt-4 text-4xl font-extrabold">{pendingCount}</p>
          <p className="mt-1 text-sm font-bold text-slate-300">{pendingCount === 1 ? "aviso pendiente" : "avisos pendientes"}</p>
        </div>
        <div className="surface flex flex-col justify-center rounded-lg p-4 sm:p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.05em] text-slate-500">Vista actual</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className={`btn ${!showHistory ? "btn-primary" : "btn-secondary"}`} href="/notificaciones">Pendientes</Link>
            <Link className={`btn ${showHistory ? "btn-primary" : "btn-secondary"}`} href="/notificaciones?vista=todas">Todo el historial</Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">Mostrando {viewCount ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, viewCount)} de {viewCount}.</p>
        </div>
      </section>

      {!notifications.length ? <EmptyState title={showHistory ? "Sin notificaciones" : "Todo esta revisado"} description={showHistory ? "No hay actividad registrada para esta cuenta." : "No tienes avisos pendientes en este momento."} /> : null}
      <div className="grid gap-3">
        {notifications.map((notification) => {
          const meta = statusMeta[notification.status];
          const StatusIcon = meta.icon;
          return (
            <article className={`surface min-w-0 overflow-hidden rounded-lg border-l-4 p-4 sm:p-5 ${notification.status === "ERROR" ? "border-l-rose-600" : notification.status === "PENDING" ? "border-l-amber-500" : "border-l-emerald-600"}`} key={notification.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Mail className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold leading-5 text-ink">{notification.subject}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{channelLabels[notification.channel]} · {notification.to}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${meta.className}`}><StatusIcon className="h-3.5 w-3.5" aria-hidden />{meta.label}</span>
                  <span className="text-[11px] text-slate-500">{notification.createdAt.toLocaleString("es-MX")}</span>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words border-t border-line pt-3 text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{notification.body}</p>
              {notification.errorMessage ? <div className="alert alert-danger mt-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{notification.errorMessage}</span></div> : null}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {notification.idea ? <Link className="btn btn-secondary" href={`/ideas/${notification.idea.id}`}>Ver {notification.idea.folio}</Link> : null}
                <div className="ml-auto flex flex-wrap gap-2">
                  {canSeeAll && ["PENDING", "ERROR"].includes(notification.status) ? (
                    <form action={retryNotificationAction}><input name="notificationId" type="hidden" value={notification.id} /><button className="btn btn-secondary" type="submit"><RefreshCw className="h-4 w-4" aria-hidden />Reintentar</button></form>
                  ) : null}
                  {notification.status !== "DISMISSED" ? (
                    <form action={markNotificationAction}><input name="notificationId" type="hidden" value={notification.id} /><button className="btn btn-ghost" type="submit"><Check className="h-4 w-4" aria-hidden />Marcar revisada</button></form>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {totalPages > 1 ? (
        <nav aria-label="Paginación de notificaciones" className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          {currentPage > 1 ? <Link className="btn btn-secondary" href={`${pageBase}${currentPage - 1}`}>Anterior</Link> : <span />}
          <span className="text-xs font-extrabold text-slate-600">Página {currentPage} de {totalPages}</span>
          {currentPage < totalPages ? <Link className="btn btn-secondary" href={`${pageBase}${currentPage + 1}`}>Siguiente</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
