type ClosureActivity = {
  status: string;
  evidenceCount: number;
};

export function kaizenClosureReadiness(input: {
  activities: ClosureActivity[];
  hasCharter: boolean;
  teamCount: number;
}) {
  const relevant = input.activities.filter((activity) => activity.status !== "COMBINADA");
  const allActivitiesResolved = relevant.length > 0 && relevant.every((activity) => activity.status === "COMPLETADA" || activity.status === "CANCELADA");
  const completed = relevant.filter((activity) => activity.status === "COMPLETADA");
  const hasCompletedResult = completed.length > 0;
  const completedActivitiesHaveEvidence = completed.every((activity) => activity.evidenceCount > 0);
  const hasTeam = input.teamCount > 0;
  return {
    allActivitiesResolved,
    completedActivitiesHaveEvidence,
    hasCharter: input.hasCharter,
    hasCompletedResult,
    hasTeam,
    ready: input.hasCharter && allActivitiesResolved && hasCompletedResult && completedActivitiesHaveEvidence && hasTeam
  };
}
