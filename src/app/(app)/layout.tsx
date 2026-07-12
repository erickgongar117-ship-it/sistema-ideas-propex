import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userModuleAccess } from "@/lib/module-access";
import type { NotificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pendingStatuses: NotificationStatus[] = ["PENDING", "ERROR"];
  const notificationWhere =
    user.role === "ADMIN" || user.role === "MEJORA_CONTINUA"
      ? { status: { in: pendingStatuses } }
      : { status: { in: pendingStatuses }, to: { contains: user.email } };
  const [pendingNotifications, moduleAccess] = await Promise.all([
    prisma.notificationOutbox.count({ where: notificationWhere }),
    userModuleAccess(user)
  ]);
  return (
    <AppShell
      moduleAccess={moduleAccess}
      pendingNotifications={pendingNotifications}
      user={{ name: user.name, email: user.email, role: user.role, kaizenAccess: user.kaizenAccess, genbaAccess: user.genbaAccess }}
    >
      {children}
    </AppShell>
  );
}
