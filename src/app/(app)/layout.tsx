import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userModuleAccess } from "@/lib/module-access";
import { hasExecutiveVisibility } from "@/lib/domain";
import type { NotificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pendingStatuses: NotificationStatus[] = ["PENDING", "ERROR"];
  const notificationWhere =
    hasExecutiveVisibility(user)
      ? { status: { in: pendingStatuses } }
      : { status: { in: pendingStatuses }, to: { contains: user.email } };
  const [pendingNotifications, moduleAccess, reviewMemberships, reviewAssignments, responsibilityMemberships] = await Promise.all([
    prisma.notificationOutbox.count({ where: notificationWhere }),
    userModuleAccess(user),
    prisma.orgMembership.count({
      where: {
        userId: user.id,
        active: true,
        OR: [{ canReviewTeam: true }, { canReceiveIdeas: true }]
      }
    }),
    prisma.idea.count({
      where: {
        OR: [
          { supervisorId: user.id },
          { area: { is: { supervisorId: user.id } } },
          { approvals: { some: { type: "SUPERVISOR", assignedToId: user.id } } },
          { escalationRule: { is: { reviewerMembership: { is: { userId: user.id, active: true } } } } }
        ]
      }
    }),
    prisma.orgMembership.findMany({
      where: { userId: user.id, active: true, orgUnit: { active: true, plant: { active: true } } },
      include: { orgUnit: { include: { plant: true } } },
      orderBy: [{ level: "desc" }, { sortOrder: "asc" }]
    })
  ]);
  const responsibilities = [...new Set(responsibilityMemberships.map((membership) => `${membership.orgUnit.plant.code} · ${membership.orgUnit.name}`))];
  const canReviewIdeas = user.role === "ADMIN" || user.role === "SUPERVISOR" || reviewMemberships > 0 || reviewAssignments > 0;
  return (
    <AppShell
      canReviewIdeas={canReviewIdeas}
      moduleAccess={moduleAccess}
      pendingNotifications={pendingNotifications}
      user={{ name: user.name, email: user.email, role: user.role, kaizenAccess: user.kaizenAccess, genbaAccess: user.genbaAccess, jobTitle: user.jobTitle, responsibilities }}
    >
      {children}
    </AppShell>
  );
}
