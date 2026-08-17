import type { IdeaStatus, Prisma, User, WorkItemStatus } from "@prisma/client";
import { buildIdeaVisibilityWhere, buildInitialReviewWhere } from "@/lib/idea-access";

export type FollowUpView = "pendientes" | "seguimiento" | "equipo";

const initialReviewStatuses: IdeaStatus[] = ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"];
const mcActionStatuses: IdeaStatus[] = [
  "APROBADA_PARA_IMPLEMENTAR",
  "CLASIFICACION_MEJORA_CONTINUA",
  "IMPLEMENTADA",
  "EN_VALIDACION_FINAL",
  "RECHAZADA_VALIDACION"
];
const implementationStatuses: IdeaStatus[] = ["APROBADA_PARA_IMPLEMENTAR", "EN_IMPLEMENTACION", "VENCIDA"];
const activeWorkStatuses: WorkItemStatus[] = ["PENDIENTE", "EN_PROCESO", "BLOQUEADA"];

type ScopeInput = {
  user: Pick<User, "id" | "role">;
  globalAccess: boolean;
  supervisableOrgUnitIds: string[];
  manageableOrgUnitIds: string[];
};

function viewWhere<T>(base: T, pending: T, direct: T, view: FollowUpView): T {
  if (view === "pendientes") return { AND: [base, pending] } as T;
  if (view === "seguimiento") return { AND: [base, direct, { NOT: pending }] } as T;
  return { AND: [base, { NOT: pending }, { NOT: direct }] } as T;
}

export function followUpIdeaWhere(input: ScopeInput, view: FollowUpView): Prisma.IdeaWhereInput {
  const { user, globalAccess, supervisableOrgUnitIds } = input;
  const base = buildIdeaVisibilityWhere(user, supervisableOrgUnitIds);
  const initialAssignment = buildInitialReviewWhere(user, supervisableOrgUnitIds);
  const pendingOptions: Prisma.IdeaWhereInput[] = [
    {
      AND: [
        { status: { in: initialReviewStatuses } },
        initialAssignment
      ]
    },
    { approvals: { some: { assignedToId: user.id, status: { in: ["PENDING", "MORE_INFO"] } } } },
    { supportRequests: { some: { assignedToId: user.id, activatedAt: { not: null }, status: { in: ["PENDING", "MORE_INFO"] } } } },
    { implementationOwnerId: user.id, status: { in: implementationStatuses } }
  ];

  if (globalAccess) {
    pendingOptions.push(
      { status: { in: mcActionStatuses } },
      { supportRequests: { some: { assignedToId: null, activatedAt: { not: null }, status: { in: ["PENDING", "MORE_INFO"] } } } }
    );
  }
  if (user.role === "ADMIN") {
    pendingOptions.push({ approvals: { some: { assignedToId: null, status: { in: ["PENDING", "MORE_INFO"] } } } });
  }

  const pending: Prisma.IdeaWhereInput = { OR: pendingOptions };
  const direct: Prisma.IdeaWhereInput = {
    OR: [
      { supervisorId: user.id },
      { implementationOwnerId: user.id },
      { area: { is: { supervisorId: user.id } } },
      { approvals: { some: { assignedToId: user.id } } },
      { supportRequests: { some: { assignedToId: user.id } } },
      { followers: { some: { userId: user.id } } },
      { escalationRule: { is: { reviewerMembership: { is: { userId: user.id, active: true } } } } }
    ]
  };

  return viewWhere(base, pending, direct, view);
}

export function followUpKaizenWhere(
  input: ScopeInput & { hasAccess: boolean },
  view: FollowUpView
): Prisma.KaizenProjectWhereInput {
  const { user, globalAccess, supervisableOrgUnitIds, manageableOrgUnitIds, hasAccess } = input;
  if (!hasAccess) return { id: "__no_kaizen_access__" };

  const memberScope = supervisableOrgUnitIds.length
    ? { active: true, orgUnitId: { in: supervisableOrgUnitIds } }
    : null;
  const base: Prisma.KaizenProjectWhereInput = globalAccess
    ? {}
    : {
        OR: [
          { leaderId: user.id },
          { activities: { some: { ownerId: user.id } } },
          ...(supervisableOrgUnitIds.length ? [{ orgUnitId: { in: supervisableOrgUnitIds } }] : []),
          ...(manageableOrgUnitIds.length ? [{ orgUnitId: { in: manageableOrgUnitIds } }] : []),
          ...(memberScope
            ? [
                { leader: { is: { orgMemberships: { some: memberScope } } } },
                { activities: { some: { owner: { is: { orgMemberships: { some: memberScope } } } } } }
              ]
            : [])
        ]
      };
  const pendingOptions: Prisma.KaizenProjectWhereInput[] = [
    { activities: { some: { ownerId: user.id, status: { in: activeWorkStatuses } } } },
    { leaderId: user.id, status: "PENDIENTE_CHARTER", attachments: { none: { type: "CHARTER" } } }
  ];
  if (manageableOrgUnitIds.length) {
    pendingOptions.push({ orgUnitId: { in: manageableOrgUnitIds }, activities: { some: { status: "BLOQUEADA" } } });
  }
  if (globalAccess) {
    pendingOptions.push(
      { status: "PENDIENTE_CHARTER", attachments: { none: { type: "CHARTER" } } },
      { activities: { some: { status: "BLOQUEADA" } } }
    );
  }
  const pending: Prisma.KaizenProjectWhereInput = { OR: pendingOptions };
  const direct: Prisma.KaizenProjectWhereInput = {
    OR: [{ leaderId: user.id }, { activities: { some: { ownerId: user.id } } }]
  };
  return viewWhere(base, pending, direct, view);
}

export function followUpGenbaWhere(
  input: ScopeInput & { hasAccess: boolean },
  view: FollowUpView
): Prisma.GenbaWalkWhereInput {
  const { user, globalAccess, supervisableOrgUnitIds, manageableOrgUnitIds, hasAccess } = input;
  if (!hasAccess) return { id: "__no_genba_access__" };

  const memberScope = supervisableOrgUnitIds.length
    ? { active: true, orgUnitId: { in: supervisableOrgUnitIds } }
    : null;
  const base: Prisma.GenbaWalkWhereInput = globalAccess
    ? {}
    : {
        OR: [
          { coordinatorId: user.id },
          { activities: { some: { ownerId: user.id } } },
          ...(supervisableOrgUnitIds.length ? [{ orgUnitId: { in: supervisableOrgUnitIds } }] : []),
          ...(manageableOrgUnitIds.length ? [{ orgUnitId: { in: manageableOrgUnitIds } }] : []),
          ...(memberScope
            ? [
                { coordinator: { is: { orgMemberships: { some: memberScope } } } },
                { activities: { some: { owner: { is: { orgMemberships: { some: memberScope } } } } } }
              ]
            : [])
        ]
      };
  const pendingOptions: Prisma.GenbaWalkWhereInput[] = [
    { activities: { some: { ownerId: user.id, status: { in: activeWorkStatuses } } } },
    { coordinatorId: user.id, status: "ABIERTO" }
  ];
  if (manageableOrgUnitIds.length) {
    pendingOptions.push({ orgUnitId: { in: manageableOrgUnitIds }, activities: { some: { status: "BLOQUEADA" } } });
  }
  if (globalAccess) pendingOptions.push({ activities: { some: { status: "BLOQUEADA" } } });

  const pending: Prisma.GenbaWalkWhereInput = { OR: pendingOptions };
  const direct: Prisma.GenbaWalkWhereInput = {
    OR: [{ coordinatorId: user.id }, { activities: { some: { ownerId: user.id } } }]
  };
  return viewWhere(base, pending, direct, view);
}
