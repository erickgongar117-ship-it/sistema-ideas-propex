import { markNotificationAction, retryNotificationAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const user = await requireUser();
  const canSeeAll = user.role === "ADMIN" || user.role === "MEJORA_CONTINUA";
  const notifications = await prisma.notificationOutbox.findMany({
    where: canSeeAll ? {} : { to: { contains: user.email } },
    include: { idea: { include: { area: true } } },
    orderBy: { createdAt: "desc" },
    take: 80
  });
  const pendingCount = notifications.filter((notification) => ["PENDING", "ERROR"].includes(notification.status)).length;

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description={canSeeAll ? "Outbox general de correo, Teams y avisos locales." : "Avisos pendientes enviados a tu correo."}
      />
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="surface rounded-lg p-4">
          <p className="text-xs font-black uppercase text-slate-500">Pendientes</p>
          <p className="mt-2 text-3xl font-black text-red-700">{pendingCount}</p>
        </div>
        <div className="surface rounded-lg p-4 sm:col-span-2">
          <p className="text-xs font-black uppercase text-slate-500">Vista</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            {canSeeAll ? "Viendo todas las notificaciones del sistema." : `Viendo notificaciones para ${user.email}.`}
          </p>
        </div>
      </section>
      {!notifications.length ? <EmptyState title="Sin notificaciones" /> : null}
      <div className="grid gap-4">
        {notifications.map((notification) => (
          <article className="surface rounded-lg p-5" key={notification.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-black text-ink">{notification.subject}</p>
                <p className="text-xs font-bold text-slate-500">
                  {notification.channel} - {notification.status} - {notification.to}
                </p>
              </div>
              <p className="text-xs text-slate-500">{notification.createdAt.toLocaleString("es-MX")}</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{notification.body}</p>
            {notification.errorMessage ? <p className="mt-2 text-sm font-bold text-rose-700">{notification.errorMessage}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {canSeeAll ? (
                <form action={retryNotificationAction}>
                  <input name="notificationId" type="hidden" value={notification.id} />
                  <button className="btn btn-secondary" type="submit">
                    Reenviar
                  </button>
                </form>
              ) : null}
              <form action={markNotificationAction}>
                <input name="notificationId" type="hidden" value={notification.id} />
                <button className="btn btn-ghost" type="submit">
                  Marcar revisada
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
