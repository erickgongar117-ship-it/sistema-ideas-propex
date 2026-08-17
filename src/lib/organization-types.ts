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

/**
 * Proyeccion PUBLICA de la estructura, para la portada y el explorador de captura por QR.
 *
 * Deliberadamente NO incluye personas: ni correos, ni roles, ni membresias, ni reglas de
 * escalamiento, ni el responsable de ruta. La portada es anonima, asi que todo lo que entre
 * aqui queda al alcance de cualquiera que escanee un QR. Si una pantalla necesita personas,
 * debe estar autenticada y usar `getOrganizationStructure`.
 */
export type PublicCaptureNode = {
  id: string;
  name: string;
  type: OrgNodeType;
  code: string;
  responsible: string;
  qrEnabled: boolean;
  active: boolean;
  captureArea: { code: string; active: boolean } | null;
  children: PublicCaptureNode[];
};

export type PublicCapturePlant = {
  id: string;
  code: PlantCode;
  name: string;
  active: boolean;
  nodes: PublicCaptureNode[];
};

export type PublicCaptureStructure = Record<string, PublicCapturePlant>;

export type OrganizationActionResult = {
  ok: boolean;
  message: string;
};
