export type FollowUpBulkTargetKind = "INITIAL" | "DEPARTMENT" | "SUPPORT" | "IMPLEMENTATION";

export type FollowUpBulkTarget = {
  kind: FollowUpBulkTargetKind;
  targetId: string;
  expectedTargetUpdatedAt: string;
  expectedIdeaUpdatedAt: string;
  expectedRelatedUpdatedAt?: string;
};

const separator = "|";

function validIsoDate(value: string | undefined) {
  if (!value) return false;
  const parsed = new Date(value);
  return value.length >= 20 && !Number.isNaN(parsed.getTime());
}

export function serializeFollowUpBulkTarget(target: FollowUpBulkTarget) {
  if ([target.targetId, target.expectedTargetUpdatedAt, target.expectedIdeaUpdatedAt, target.expectedRelatedUpdatedAt]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.includes(separator))) {
    throw new Error("El destino del lote contiene un separador reservado.");
  }
  return [target.kind, target.targetId, target.expectedTargetUpdatedAt, target.expectedIdeaUpdatedAt, target.expectedRelatedUpdatedAt]
    .filter((value): value is string => value !== undefined)
    .join(separator);
}

export function parseFollowUpBulkTarget(value: string): FollowUpBulkTarget | null {
  const [kind, targetId, expectedTargetUpdatedAt, expectedIdeaUpdatedAt, expectedRelatedUpdatedAt, extra] = value.split(separator);
  if (
    extra !== undefined ||
    !["INITIAL", "DEPARTMENT", "SUPPORT", "IMPLEMENTATION"].includes(kind) ||
    !targetId ||
    !validIsoDate(expectedTargetUpdatedAt) ||
    !validIsoDate(expectedIdeaUpdatedAt) ||
    (expectedRelatedUpdatedAt !== undefined && !validIsoDate(expectedRelatedUpdatedAt))
  ) {
    return null;
  }
  const target: FollowUpBulkTarget = {
    kind: kind as FollowUpBulkTargetKind,
    targetId,
    expectedTargetUpdatedAt,
    expectedIdeaUpdatedAt
  };
  if (expectedRelatedUpdatedAt) target.expectedRelatedUpdatedAt = expectedRelatedUpdatedAt;
  return target;
}
