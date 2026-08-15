export type AutomationPilotState =
  | "NOT_CONFIGURED"
  | "ACTIVE_UNTESTED"
  | "VERIFIED"
  | "DEGRADED"
  | "PAUSED"
  | "UNKNOWN";

export type AutomationPilotConfig = {
  state: AutomationPilotState;
  flowName: string;
  flowId?: string;
  flowUrl?: string;
  verifiedAt?: Date;
};

const validStates = new Set<AutomationPilotState>([
  "NOT_CONFIGURED",
  "ACTIVE_UNTESTED",
  "VERIFIED",
  "DEGRADED",
  "PAUSED",
  "UNKNOWN"
]);

function enabled(value?: string) {
  return ["1", "true", "yes", "si"].includes(value?.trim().toLowerCase() ?? "");
}

function optionalDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function automationPilotConfig(): AutomationPilotConfig | null {
  if (!enabled(process.env.POWER_AUTOMATE_PILOT_ENABLED)) return null;

  const configuredState = process.env.POWER_AUTOMATE_PILOT_STATE as AutomationPilotState | undefined;
  const state = configuredState && validStates.has(configuredState) ? configuredState : "ACTIVE_UNTESTED";

  return {
    state,
    flowName: process.env.POWER_AUTOMATE_PILOT_NAME?.trim() || "PROpEx - Piloto captura por correo",
    flowId: process.env.POWER_AUTOMATE_PILOT_FLOW_ID?.trim() || undefined,
    flowUrl: process.env.POWER_AUTOMATE_PILOT_FLOW_URL?.trim() || undefined,
    verifiedAt: optionalDate(process.env.POWER_AUTOMATE_PILOT_VERIFIED_AT)
  };
}
