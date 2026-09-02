import type { IdeaStatus, Prisma, User, WorkItemStatus } from "@prisma/client";
import { buildIdeaVisibilityWhere, buildInitialReviewWhere } from "@/lib/idea-access";

/**
 * Las cuatro vistas de la bandeja.
 *
 * "mias" se agrego porque las otras tres responden a "que hay que atender aqui" y no a "que
 * me toca a mi". Un supervisor abria Pendientes, encontraba su Kaizen, lo expandia y veia
 * las catorce actividades del proyecto entero para localizar las dos suyas. Esta vista
 * invierte el filtro: solo entran los registros donde alguna actividad es suya, y al
 * expandir solo se listan esas.
 */
export type FollowUpView = "pendientes" | "seguimiento" | "equipo" | "mias";

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

/**
 * "mias" no lleva `base` ni excluye a las otras vistas a proposito.
 *
 * `base` es la visibilidad organizacional —lo que alcanzo a ver por mi puesto— y aqui
 * estorba: lo que esta asignado a mi nombre me compete aunque sea de otra area, y de hecho
 * ese es el caso que mas se pierde hoy. Tampoco se resta lo que ya aparece en Pendientes:
 * esta vista es un corte distinto de lo mismo, no una cuarta bandeja aparte, asi que un
 * elemento puede salir en las dos.
 */
function viewWhere<T>(base: T, pending: T, direct: T, mine: T, view: FollowUpView): T {
  if (view === "mias") return mine;
  if (view === "pendientes") return { AND: [base, pending] } as T;
  if (view === "seguimiento") return { AND: [base, direct, { NOT: pending }] } as T;
  return { AND: [base, { NOT: pending }, { NOT: direct }] } as T;
}

export function followUpIdeaWhere(input: ScopeInput, view: FollowUpView): Prisma.IdeaWhereInput {
  const { user, globalAccess, supervisableOrgUnitIds } = input;
  if (user.role === "DIRECCION") {
    const pending: Prisma.IdeaWhereInput = {
      OR: [
        { executiveValidations: { some: { assignedToId: user.id, status: "PENDING" } } },
        { executiveValidations: { some: { requestedById: user.id, status: { in: ["MORE_INFO", "REJECTED"] } } } }
      ]
    };
    const direct: Prisma.IdeaWhereInput = {
      executiveValidations: { some: { OR: [{ assignedToId: user.id }, { requestedById: user.id }] } }
    };
    return viewWhere({}, pending, direct, pending, view);
  }

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
    { executiveValidations: { some: { assignedToId: user.id, status: "PENDING" } } },
    { executiveValidations: { some: { requestedById: user.id, status: { in: ["MORE_INFO", "REJECTED"] } } } },
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
      { executiveValidations: { some: { OR: [{ assignedToId: user.id }, { requestedById: user.id }] } } },
      { followers: { some: { userId: user.id } } },
      { escalationRule: { is: { reviewerMembership: { is: { userId: user.id, active: true } } } } }
    ]
  };

  // En Ideas no hay actividades que desglosar, asi que "lo mio" es lo que lleva mi nombre:
  // la implementacion a mi cargo y las decisiones que esperan mi respuesta.
  const mine: Prisma.IdeaWhereInput = {
    OR: [
      { implementationOwnerId: user.id, status: { in: implementationStatuses } },
      { approvals: { some: { assignedToId: user.id, status: { in: ["PENDING", "MORE_INFO"] } } } },
      { supportRequests: { some: { assignedToId: user.id, activatedAt: { not: null }, status: { in: ["PENDING", "MORE_INFO"] } } } },
      { executiveValidations: { some: { assignedToId: user.id, status: "PENDING" } } }
    ]
  };

  return viewWhere(base, pending, direct, mine, view);
}

export function followUpKaizenWhere(
  input: ScopeInput & { hasAccess: boolean },
  view: FollowUpView
): Prisma.KaizenProjectWhereInput {
  const { user, globalAccess, supervisableOrgUnitIds, manageableOrgUnitIds, hasAccess } = input;
  // Direccion no lleva la carga operativa de Kaizen, pero desde que puede abrir proyectos si
  // tiene que ver los suyos: bloquearla por completo escondia su propio trabajo.
  if (user.role === "DIRECCION") {
    const propio: Prisma.KaizenProjectWhereInput = {
      OR: [{ leaderId: user.id }, { activities: { some: { ownerId: user.id } } }, { createdById: user.id }]
    };
    const pendienteDireccion: Prisma.KaizenProjectWhereInput = {
      AND: [propio, { activities: { some: { ownerId: user.id, status: { in: activeWorkStatuses } } } }]
    };
    return viewWhere(propio, pendienteDireccion, propio, propio, view);
  }
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
  // Solo actividades abiertas: cerradas y canceladas ya no piden nada de mi parte.
  const mine: Prisma.KaizenProjectWhereInput = {
    activities: { some: { ownerId: user.id, status: { in: activeWorkStatuses } } }
  };
  return viewWhere(base, pending, direct, mine, view);
}

export function followUpGenbaWhere(
  input: ScopeInput & { hasAccess: boolean },
  view: FollowUpView
): Prisma.GenbaWalkWhereInput {
  const { user, globalAccess, supervisableOrgUnitIds, manageableOrgUnitIds, hasAccess } = input;
  if (user.role === "DIRECCION") {
    const propio: Prisma.GenbaWalkWhereInput = {
      OR: [{ coordinatorId: user.id }, { activities: { some: { ownerId: user.id } } }, { createdById: user.id }]
    };
    const pendienteDireccion: Prisma.GenbaWalkWhereInput = {
      AND: [propio, { OR: [{ coordinatorId: user.id, status: "ABIERTO" }, { activities: { some: { ownerId: user.id, status: { in: activeWorkStatuses } } } }] }]
    };
    return viewWhere(propio, pendienteDireccion, propio, propio, view);
  }
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
  const mine: Prisma.GenbaWalkWhereInput = {
    activities: { some: { ownerId: user.id, status: { in: activeWorkStatuses } } }
  };
  return viewWhere(base, pending, direct, mine, view);
}
