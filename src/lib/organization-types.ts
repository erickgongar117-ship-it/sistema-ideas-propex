export type PlantCode = string;
export type OrgNodeType = "MACROPROCESO" | "DEPARTAMENTO" | "AREA" | "PROCESO";

export type OrganizationUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string | null;
};

export type OrganizationMembership = {
  id: string;
  userId: string;
  orgUnitId: string;
  title: string;
  level: number;
  managerMembershipId: string | null;
  canReviewTeam: boolean;
  canReceiveIdeas: boolean;
  canManageActivities: boolean;
  active: boolean;
  sortOrder: number;
  user: OrganizationUserOption;
  managerMembership: {
    id: string;
    title: string;
    user: OrganizationUserOption;
  } | null;
};

export type OrganizationEscalationRule = {
  id: string;
  name: string;
  submitterLabel: string;
  circumstance: string | null;
  submitterLevel: number;
  reviewerMembershipId: string;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
  reviewerMembership: {
    id: string;
    title: string;
    user: OrganizationUserOption;
  };
};

export type OrganizationNode = {
  id: string;
  plantId: string;
  parentId: string | null;
  name: string;
  type: OrgNodeType;
  code: string;
  responsible: string;
  manager: string;
  routingUserId: string | null;
  routingUser: OrganizationUserOption | null;
  captureArea: {
    id: string;
    code: string;
    active: boolean;
    supervisorId: string | null;
  } | null;
  qrEnabled: boolean;
  isSupportArea: boolean;
  active: boolean;
  sortOrder: number;
  memberships: OrganizationMembership[];
  escalationRules: OrganizationEscalationRule[];
  children: OrganizationNode[];
};

export type OrganizationPlant = {
  id: string;
  code: PlantCode;
  name: string;
  active: boolean;
  nodes: OrganizationNode[];
};

export type OrganizationStructure = Record<string, OrganizationPlant>;

export type OrganizationActionResult = {
  ok: boolean;
  message: string;
};
