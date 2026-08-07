import "server-only";

import { del } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export type OperationalModule = "IDEAS" | "KAIZEN" | "GENBA";

export type FileCleanupSummary = {
  referenced: number;
  deleted: number;
  missing: number;
  unmanaged: number;
  failed: number;
};

export type HardDeleteResult = {
  ideas: number;
  orphanParticipants: number;
  kaizenProjects: number;
  kaizenActivities: number;
  genbaWalks: number;
  genbaActivities: number;
  detachedKaizenFromIdeas: number;
  detachedKaizenFromGenba: number;
  files: FileCleanupSummary;
};

type DeleteSnapshot = Omit<HardDeleteResult, "files"> & { filePaths: string[] };
type TransactionClient = Prisma.TransactionClient;

const emptySnapshot = (): DeleteSnapshot => ({
  ideas: 0,
  orphanParticipants: 0,
  kaizenProjects: 0,
  kaizenActivities: 0,
  genbaWalks: 0,
  genbaActivities: 0,
  detachedKaizenFromIdeas: 0,
  detachedKaizenFromGenba: 0,
  filePaths: []
});

export class HardDeleteNotFoundError extends Error {
  constructor(public readonly module: OperationalModule, public readonly folio: string) {
    super(`No existe ${folio} en ${module}.`);
    this.name = "HardDeleteNotFoundError";
  }
}

function chunks<T>(values: T[], size = 100) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

async function deleteAuditReferences(
  tx: TransactionClient,
  entityIds: string[],
  referenceTokens: string[],
  entityNames: string[] = []
) {
  if (entityNames.length) await tx.auditLog.deleteMany({ where: { entity: { in: entityNames } } });

  for (const group of chunks(unique(entityIds), 300)) {
    await tx.auditLog.deleteMany({ where: { entityId: { in: group } } });
  }

  for (const group of chunks(unique(referenceTokens), 20)) {
    await tx.auditLog.deleteMany({
      where: { OR: group.map((token) => ({ details: { contains: token } })) }
    });
  }
}

async function deleteNotificationReferences(
  tx: TransactionClient,
  referenceTokens: string[],
  purgeModule?: OperationalModule
) {
  if (purgeModule === "IDEAS") {
    await tx.notificationOutbox.deleteMany({
      where: {
        OR: [
          { ideaId: { not: null } },
          { subject: { contains: "Folio IM-" } },
          { body: { contains: "/ideas/" } }
        ]
      }
    });
  }
  if (purgeModule === "KAIZEN") {
    await tx.notificationOutbox.deleteMany({
      where: { OR: [{ subject: { contains: "KZN-" } }, { body: { contains: "/kaizen/" } }] }
    });
  }
  if (purgeModule === "GENBA") {
    await tx.notificationOutbox.deleteMany({
      where: { OR: [{ subject: { contains: "GENBA-" } }, { body: { contains: "/genba/" } }] }
    });
  }

  for (const group of chunks(unique(referenceTokens), 20)) {
    await tx.notificationOutbox.deleteMany({
      where: {
        OR: group.flatMap((token) => [
          { subject: { contains: token } },
          { body: { contains: token } }
        ])
      }
    });
  }
}

async function deleteIdeasInTransaction(
  tx: TransactionClient,
  ids: string[] | undefined,
  purgeAll: boolean
): Promise<DeleteSnapshot> {
  const ideas = await tx.idea.findMany({
    where: ids ? { id: { in: ids } } : {},
    select: {
      id: true,
      folio: true,
      participantId: true,
      attachments: { select: { id: true, path: true } },
      approvals: { select: { id: true } },
      comments: { select: { id: true } },
      pointRuleSelections: { select: { id: true } },
      notifications: { select: { id: true } },
      supportRequests: { select: { id: true } },
      followers: { select: { id: true } }
    }
  });
  if (!ideas.length) return emptySnapshot();

  const ideaIds = ideas.map((idea) => idea.id);
  const folios = ideas.map((idea) => idea.folio);
  const participantIds = unique(ideas.map((idea) => idea.participantId));
  const attachmentIds = ideas.flatMap((idea) => idea.attachments.map((item) => item.id));
  const dependencyIds = ideas.flatMap((idea) => [
    ...idea.approvals.map((item) => item.id),
    ...idea.comments.map((item) => item.id),
    ...idea.pointRuleSelections.map((item) => item.id),
    ...idea.notifications.map((item) => item.id),
    ...idea.supportRequests.map((item) => item.id),
    ...idea.followers.map((item) => item.id),
    ...idea.attachments.map((item) => item.id)
  ]);

  const detached = await tx.kaizenProject.updateMany({
    where: { sourceIdeaId: { in: ideaIds } },
    data: { sourceIdeaId: null }
  });

  await deleteNotificationReferences(tx, [...ideaIds, ...folios], purgeAll ? "IDEAS" : undefined);
  // Financial movements remain immutable even when an operational record is purged.
  await deleteAuditReferences(
    tx,
    [...ideaIds, ...dependencyIds],
    [...ideaIds, ...folios],
    purgeAll ? ["Idea"] : []
  );

  await tx.ideaFollower.deleteMany({ where: { ideaId: { in: ideaIds } } });
  await tx.ideaSupportRequest.deleteMany({ where: { ideaId: { in: ideaIds } } });
  await tx.ideaPointRule.deleteMany({ where: { ideaId: { in: ideaIds } } });
  await tx.approval.deleteMany({ where: { ideaId: { in: ideaIds } } });
  await tx.comment.deleteMany({ where: { ideaId: { in: ideaIds } } });
  await tx.notificationOutbox.deleteMany({ where: { ideaId: { in: ideaIds } } });
  if (attachmentIds.length) await tx.attachment.deleteMany({ where: { id: { in: attachmentIds } } });
  const deleted = await tx.idea.deleteMany({ where: { id: { in: ideaIds } } });
  const deletedParticipants = participantIds.length
    ? await tx.participant.deleteMany({
        where: {
          id: { in: participantIds },
          userId: null,
          ideas: { none: {} },
          enrollments: { none: {} },
          coinTransactions: { none: {} }
        }
      })
    : { count: 0 };

  return {
    ...emptySnapshot(),
    ideas: deleted.count,
    orphanParticipants: deletedParticipants.count,
    detachedKaizenFromIdeas: detached.count,
    filePaths: ideas.flatMap((idea) => idea.attachments.map((item) => item.path))
  };
}

async function deleteKaizensInTransaction(
  tx: TransactionClient,
  ids: string[] | undefined,
  purgeAll: boolean
): Promise<DeleteSnapshot> {
  const projects = await tx.kaizenProject.findMany({
    where: ids ? { id: { in: ids } } : {},
    select: {
      id: true,
      folio: true,
      activities: { select: { id: true } },
      attachments: { select: { id: true, path: true } },
      updates: { select: { id: true } }
    }
  });
  if (!projects.length) return emptySnapshot();

  const projectIds = projects.map((project) => project.id);
  const folios = projects.map((project) => project.folio);
  const activityIds = projects.flatMap((project) => project.activities.map((item) => item.id));
  const dependencyIds = projects.flatMap((project) => [
    ...project.activities.map((item) => item.id),
    ...project.attachments.map((item) => item.id),
    ...project.updates.map((item) => item.id)
  ]);

  if (activityIds.length) {
    await tx.kaizenActivity.updateMany({
      where: { mergedIntoId: { in: activityIds } },
      data: { mergedIntoId: null }
    });
  }
  for (const folio of folios) {
    await tx.genbaUpdate.deleteMany({ where: { comment: { contains: folio } } });
  }

  await deleteNotificationReferences(tx, [...projectIds, ...activityIds, ...folios], purgeAll ? "KAIZEN" : undefined);
  // Keep the ledger intact; sourceId and descriptions preserve the financial audit trail.
  await deleteAuditReferences(
    tx,
    [...projectIds, ...dependencyIds],
    [...projectIds, ...activityIds, ...folios],
    purgeAll ? ["KaizenProject", "KaizenActivity"] : []
  );

  await tx.kaizenUpdate.deleteMany({ where: { projectId: { in: projectIds } } });
  await tx.kaizenAttachment.deleteMany({ where: { projectId: { in: projectIds } } });
  if (activityIds.length) await tx.kaizenActivity.deleteMany({ where: { id: { in: activityIds } } });
  const deleted = await tx.kaizenProject.deleteMany({ where: { id: { in: projectIds } } });

  return {
    ...emptySnapshot(),
    kaizenProjects: deleted.count,
    kaizenActivities: activityIds.length,
    filePaths: projects.flatMap((project) => project.attachments.map((item) => item.path))
  };
}

async function deleteGenbasInTransaction(
  tx: TransactionClient,
  ids: string[] | undefined,
  purgeAll: boolean
): Promise<DeleteSnapshot> {
  const walks = await tx.genbaWalk.findMany({
    where: ids ? { id: { in: ids } } : {},
    select: {
      id: true,
      folio: true,
      activities: { select: { id: true } },
      attachments: { select: { id: true, path: true } },
      updates: { select: { id: true } }
    }
  });
  if (!walks.length) return emptySnapshot();

  const walkIds = walks.map((walk) => walk.id);
  const folios = walks.map((walk) => walk.folio);
  const activityIds = walks.flatMap((walk) => walk.activities.map((item) => item.id));
  const dependencyIds = walks.flatMap((walk) => [
    ...walk.activities.map((item) => item.id),
    ...walk.attachments.map((item) => item.id),
    ...walk.updates.map((item) => item.id)
  ]);

  let detachedCount = 0;
  if (activityIds.length) {
    const detached = await tx.kaizenActivity.updateMany({
      where: { sourceGenbaActivityId: { in: activityIds } },
      data: { sourceGenbaActivityId: null }
    });
    detachedCount = detached.count;
    await tx.genbaActivity.updateMany({
      where: { mergedIntoId: { in: activityIds } },
      data: { mergedIntoId: null }
    });
  }
  for (const folio of folios) {
    await tx.kaizenUpdate.deleteMany({ where: { comment: { contains: folio } } });
  }

  await deleteNotificationReferences(tx, [...walkIds, ...activityIds, ...folios], purgeAll ? "GENBA" : undefined);
  // Keep the ledger intact; deleting a walk must never change employee balances.
  await deleteAuditReferences(
    tx,
    [...walkIds, ...dependencyIds],
    [...walkIds, ...activityIds, ...folios],
    purgeAll ? ["GenbaWalk", "GenbaActivity"] : []
  );

  await tx.genbaUpdate.deleteMany({ where: { walkId: { in: walkIds } } });
  await tx.genbaAttachment.deleteMany({ where: { walkId: { in: walkIds } } });
  if (activityIds.length) await tx.genbaActivity.deleteMany({ where: { id: { in: activityIds } } });
  const deleted = await tx.genbaWalk.deleteMany({ where: { id: { in: walkIds } } });

  return {
    ...emptySnapshot(),
    genbaWalks: deleted.count,
    genbaActivities: activityIds.length,
    detachedKaizenFromGenba: detachedCount,
    filePaths: walks.flatMap((walk) => walk.attachments.map((item) => item.path))
  };
}

function mergeSnapshots(snapshots: DeleteSnapshot[]) {
  return snapshots.reduce<DeleteSnapshot>((total, current) => ({
    ideas: total.ideas + current.ideas,
    orphanParticipants: total.orphanParticipants + current.orphanParticipants,
    kaizenProjects: total.kaizenProjects + current.kaizenProjects,
    kaizenActivities: total.kaizenActivities + current.kaizenActivities,
    genbaWalks: total.genbaWalks + current.genbaWalks,
    genbaActivities: total.genbaActivities + current.genbaActivities,
    detachedKaizenFromIdeas: total.detachedKaizenFromIdeas + current.detachedKaizenFromIdeas,
    detachedKaizenFromGenba: total.detachedKaizenFromGenba + current.detachedKaizenFromGenba,
    filePaths: [...total.filePaths, ...current.filePaths]
  }), emptySnapshot());
}

function isBlobUrl(storedPath: string) {
  try {
    const hostname = new URL(storedPath).hostname.toLowerCase();
    return hostname === "blob.vercel-storage.com" || hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

async function removeStoredFile(storedPath: string): Promise<"deleted" | "missing" | "unmanaged" | "failed"> {
  if (isBlobUrl(storedPath)) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return "failed";
    try {
      await del(storedPath, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return "deleted";
    } catch {
      return "failed";
    }
  }

  let pathname = storedPath;
  try {
    if (/^https?:\/\//i.test(storedPath)) pathname = new URL(storedPath).pathname;
    pathname = decodeURIComponent(pathname);
  } catch {
    return "unmanaged";
  }
  if (!pathname.startsWith("/uploads/")) return "unmanaged";

  const uploadRoot = path.resolve(process.cwd(), "public", "uploads");
  const relativePath = pathname.slice("/uploads/".length).replaceAll("/", path.sep);
  const absolutePath = path.resolve(uploadRoot, relativePath);
  if (absolutePath === uploadRoot || !absolutePath.startsWith(`${uploadRoot}${path.sep}`)) return "failed";

  try {
    await unlink(absolutePath);
    return "deleted";
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return "missing";
    return "failed";
  }
}

async function cleanupStoredFiles(filePaths: string[]): Promise<FileCleanupSummary> {
  const references = unique(filePaths);
  const summary: FileCleanupSummary = {
    referenced: references.length,
    deleted: 0,
    missing: 0,
    unmanaged: 0,
    failed: 0
  };

  for (const group of chunks(references, 10)) {
    const statuses = await Promise.all(group.map(removeStoredFile));
    for (const status of statuses) summary[status] += 1;
  }
  return summary;
}

async function finish(snapshot: DeleteSnapshot): Promise<HardDeleteResult> {
  const files = await cleanupStoredFiles(snapshot.filePaths);
  const { filePaths: _filePaths, ...counts } = snapshot;
  return { ...counts, files };
}

export async function hardDeleteIdeaByFolio(folio: string) {
  const normalized = folio.trim().toUpperCase();
  const idea = await prisma.idea.findUnique({ where: { folio: normalized }, select: { id: true } });
  if (!idea) throw new HardDeleteNotFoundError("IDEAS", normalized);
  const snapshot = await prisma.$transaction(
    (tx) => deleteIdeasInTransaction(tx, [idea.id], false),
    { maxWait: 5_000, timeout: 60_000 }
  );
  return finish(snapshot);
}

export async function hardDeleteKaizenByFolio(folio: string) {
  const normalized = folio.trim().toUpperCase();
  const project = await prisma.kaizenProject.findUnique({ where: { folio: normalized }, select: { id: true } });
  if (!project) throw new HardDeleteNotFoundError("KAIZEN", normalized);
  const snapshot = await prisma.$transaction(
    (tx) => deleteKaizensInTransaction(tx, [project.id], false),
    { maxWait: 5_000, timeout: 60_000 }
  );
  return finish(snapshot);
}

export async function hardDeleteGenbaByFolio(folio: string) {
  const normalized = folio.trim().toUpperCase();
  const walk = await prisma.genbaWalk.findUnique({ where: { folio: normalized }, select: { id: true } });
  if (!walk) throw new HardDeleteNotFoundError("GENBA", normalized);
  const snapshot = await prisma.$transaction(
    (tx) => deleteGenbasInTransaction(tx, [walk.id], false),
    { maxWait: 5_000, timeout: 60_000 }
  );
  return finish(snapshot);
}

export async function purgeOperationalModules(modules: OperationalModule[]) {
  const selected = new Set(modules);
  if (!selected.size) throw new Error("Selecciona al menos un modulo para reiniciar.");

  const snapshot = await prisma.$transaction(async (tx) => {
    const results: DeleteSnapshot[] = [];
    if (selected.has("KAIZEN")) results.push(await deleteKaizensInTransaction(tx, undefined, true));
    if (selected.has("GENBA")) results.push(await deleteGenbasInTransaction(tx, undefined, true));
    if (selected.has("IDEAS")) results.push(await deleteIdeasInTransaction(tx, undefined, true));
    return mergeSnapshots(results);
  }, { maxWait: 5_000, timeout: 120_000 });

  return finish(snapshot);
}
