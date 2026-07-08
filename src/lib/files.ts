import "server-only";

import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const uploadRoot = path.join(process.cwd(), "public", "uploads");

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function saveUpload(file: File | null | undefined, prefix: string) {
  if (!file || file.size === 0) return null;
  const extension = path.extname(file.name) || ".bin";
  const safeName = sanitizeFilename(`${prefix}-${randomUUID()}${extension}`);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`evidencias/${safeName}`, file, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: false
    });
    return {
      filename: file.name,
      path: blob.url
    };
  }

  if (process.env.VERCEL) {
    throw new Error("BLOB_READ_WRITE_TOKEN es obligatorio para cargar evidencias en Vercel.");
  }

  await mkdir(uploadRoot, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const fullPath = path.join(uploadRoot, safeName);
  await writeFile(fullPath, buffer);
  return {
    filename: file.name,
    path: `/uploads/${safeName}`
  };
}
