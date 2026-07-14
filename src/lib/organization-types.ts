export type PlantCode = "APO" | "CAR";
export type OrgNodeType = "MACROPROCESO" | "DEPARTAMENTO" | "AREA" | "PROCESO";

export type OrganizationUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
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
  active: boolean;
  sortOrder: number;
  children: OrganizationNode[];
};

export type OrganizationPlant = {
  id: string;
  code: PlantCode;
  name: string;
  active: boolean;
  nodes: OrganizationNode[];
};

export type OrganizationStructure = Record<PlantCode, OrganizationPlant>;

export type OrganizationActionResult = {
  ok: boolean;
  message: string;
};
