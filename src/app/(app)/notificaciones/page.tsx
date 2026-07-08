import { markNotificationAction, retryNotificationAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const notifications = await prisma.notificationOutbox.findMany({
    include: { idea: { include: { area: true } } },
    orderBy: { createdAt: "desc" },
    take: 80
  });

  return (
    <>
      <PageHeader title="Notificaciones pendientes" description="Outbox local para correo, Teams y eventos sin credenciales." />
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
              <form action={retryNotificationAction}>
                <input name="notificationId" type="hidden" value={notification.id} />
                <button className="btn btn-secondary" type="submit">
                  Reenviar
                </button>
              </form>
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
