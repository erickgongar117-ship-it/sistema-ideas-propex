import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "propex_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
  exp: number;
};

function secret() {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

function signPayload(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signPayload(body)}`;
}

function decodeSession(value: string): SessionPayload | null {
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = signPayload(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSession(user: Pick<User, "id" | "email" | "role">) {
  const store = await cookies();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  store.set(SESSION_COOKIE, encodeSession({ userId: user.id, email: user.email, role: user.role, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : null;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.userId, active: true }
  });
}

export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}
