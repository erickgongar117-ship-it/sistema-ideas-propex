export type FollowUpModuleFilter = "TODOS" | "IDEA" | "KAIZEN" | "GENBA";
export type FollowUpModuleCounts = Record<Exclude<FollowUpModuleFilter, "TODOS">, number>;

export const FOLLOW_UP_PAGE_SIZE = 50;

export function allocateFollowUpSlots(
  counts: FollowUpModuleCounts,
  moduleFilter: FollowUpModuleFilter,
  limit = FOLLOW_UP_PAGE_SIZE
): FollowUpModuleCounts {
  const slots: FollowUpModuleCounts = { IDEA: 0, KAIZEN: 0, GENBA: 0 };
  if (moduleFilter !== "TODOS") {
    slots[moduleFilter] = counts[moduleFilter] > 0 ? limit : 0;
    return slots;
  }

  const active = (Object.keys(counts) as Array<keyof FollowUpModuleCounts>).filter((key) => counts[key] > 0);
  if (!active.length) return slots;
  const base = Math.floor(limit / active.length);
  for (const key of active) slots[key] = Math.min(base, counts[key]);

  let remaining = limit - Object.values(slots).reduce((sum, value) => sum + value, 0);
  while (remaining > 0) {
    const candidate = active
      .filter((key) => slots[key] < counts[key])
      .sort((left, right) => (counts[right] - slots[right]) - (counts[left] - slots[left]))[0];
    if (!candidate) break;
    slots[candidate] += 1;
    remaining -= 1;
  }
  return slots;
}

export function followUpTotalPages(counts: FollowUpModuleCounts, slots: FollowUpModuleCounts) {
  return Math.max(
    1,
    ...((Object.keys(counts) as Array<keyof FollowUpModuleCounts>).map((key) =>
      slots[key] ? Math.ceil(counts[key] / slots[key]) : 0
    ))
  );
}

export function followUpConsumedBeforePage(
  counts: FollowUpModuleCounts,
  slots: FollowUpModuleCounts,
  page: number
) {
  return (Object.keys(counts) as Array<keyof FollowUpModuleCounts>).reduce(
    (total, key) => total + Math.min(counts[key], Math.max(0, page - 1) * slots[key]),
    0
  );
}
