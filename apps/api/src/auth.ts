import type { AccountStatus, Role, User } from "@nexora/shared";
import { prisma } from "./db";
import { env } from "./env";
import { ApiProblem } from "./errors";

export const SESSION_COOKIE = "nexora_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** The row shape every helper here needs; matches Prisma's User. */
export type SessionUser = {
  id: string;
  role: Role;
  status: AccountStatus;
  displayName: string;
  parentId: string | null;
};

/**
 * Demo login map (docs/API.md POST /auth/login). `deniz` aliases the balanced
 * persona; the two extra youths exist so parallel demos/tests do not collide.
 */
export const PERSONA_USER_ID = {
  deniz: "usr_deniz",
  deniz_balanced: "usr_deniz",
  deniz_risky: "usr_deniz_risky",
  deniz_productive: "usr_deniz_productive",
  ece: "usr_ece",
  mert: "usr_mert",
  selin: "usr_selin",
} as const;

/**
 * ponytail: the demo class is a constant, not a Class model with memberships —
 * teacher linkage has no column in the Phase A schema. Phase B upgrade: a
 * `Class` + `ClassMember` model and a join instead of this array.
 */
export const DEMO_CLASS_YOUTH_IDS = ["usr_deniz", "usr_deniz_risky", "usr_deniz_productive"];

/**
 * ponytail: `linkedYouthId` is the one youth a parent/teacher panel opens by
 * default, fixed for the demo. Parent authorization itself never reads this —
 * it reads User.parentId.
 */
const LINKED_YOUTH_ID: Record<string, string> = { usr_ece: "usr_deniz", usr_mert: "usr_deniz" };

/** Wire shape for docs/API.md `user` (login + GET /users/me). */
export const toUserResponse = (user: SessionUser): User => ({
  id: user.id,
  role: user.role,
  status: user.status,
  displayName: user.displayName,
  linkedYouthId: LINKED_YOUTH_ID[user.id] ?? null,
});

/* ---------------------------------------------------------------- session */

// ponytail: HS256 over Web Crypto instead of a JWT dependency — the token
// carries only { uid, exp }, so there is nothing to parse but a signature.
// Upgrade path: @elysiajs/jwt if we ever need claims, kid rotation or JWKS.
const keyPromise = crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(env.SESSION_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const fromB64url = (value: string) =>
  Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));

export async function signSession(userId: string): Promise<string> {
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
    ),
  );
  const signature = await crypto.subtle.sign("HMAC", await keyPromise, new TextEncoder().encode(payload));
  return `${payload}.${b64url(signature)}`;
}

/** Returns the user id, or null for a missing, tampered or expired token. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  const [payload, signature] = token?.split(".") ?? [];
  if (!payload || !signature) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await keyPromise,
      fromB64url(signature),
      new TextEncoder().encode(payload),
    );
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { uid?: string; exp?: number };
    if (!claims.uid || !claims.exp || claims.exp < Date.now() / 1000) return null;
    return claims.uid;
  } catch {
    return null;
  }
}

const cookieToken = (request: Request) =>
  new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`).exec(request.headers.get("cookie") ?? "")?.[1];

/**
 * Cookie (web) or `Authorization: Bearer` (Expo, extension). The token carries
 * only the user id: role and status are always re-read from the database, so a
 * revoked account cannot ride an old session.
 */
export async function requireUser(request: Request): Promise<SessionUser> {
  const header = request.headers.get("authorization");
  const token = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : cookieToken(request);
  const userId = await verifySession(token);
  if (!userId) throw new ApiProblem("unauthorized");
  const user = (await prisma.user.findUnique({ where: { id: userId } })) as SessionUser | null;
  if (!user) throw new ApiProblem("unauthorized");
  return user;
}

/* ------------------------------------------------------------------ authz */

export function requireRole(user: SessionUser, ...roles: Role[]): SessionUser {
  if (!roles.includes(user.role)) throw new ApiProblem("forbidden");
  return user;
}

/** Consent gate (docs/PRIVACY.md): anything but `active` is refused. */
export function requireActive(status: AccountStatus): void {
  if (status !== "active") throw new ApiProblem("consent_missing");
}

/** Caller must be the youth themselves, approved by a parent. */
export function requireActiveYouth(user: SessionUser): SessionUser {
  requireRole(user, "youth");
  requireActive(user.status);
  return user;
}

const loadYouth = async (youthId: string) =>
  (await prisma.user.findUnique({ where: { id: youthId } })) as SessionUser | null;

/** Consent writes: the linked parent (User.parentId) or an admin, nobody else. */
export async function requireLinkedParent(user: SessionUser, youthId: string): Promise<SessionUser> {
  const youth = await loadYouth(youthId);
  if (!youth || youth.role !== "youth") throw new ApiProblem("forbidden");
  if (user.role === "admin") return youth;
  if (user.role !== "parent" || youth.parentId !== user.id) throw new ApiProblem("forbidden");
  return youth;
}

/**
 * Whose data is this request allowed to read? A youth always reads itself; a
 * parent/teacher/admin must name the youth and pass the AuthZ matrix, and the
 * target's own consent gate still applies. Shared by /score and the weekly
 * report so the two cannot drift apart.
 */
export async function resolveYouthTarget(user: SessionUser, youthId?: string): Promise<string> {
  if (user.role === "youth") {
    requireActiveYouth(user);
    if (youthId && youthId !== user.id) throw new ApiProblem("forbidden");
    return user.id;
  }
  if (!youthId) throw new ApiProblem("validation_error", "youthId parametresi gerekli.");
  if (!(await canReadYouth(user, youthId))) throw new ApiProblem("forbidden");
  const youth = await loadYouth(youthId);
  if (!youth || youth.role !== "youth") throw new ApiProblem("forbidden");
  requireActive(youth.status);
  return youth.id;
}

/** docs/ARCHITECTURE.md AuthZ matrix, read side (score + weekly report). */
export async function canReadYouth(user: SessionUser, youthId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role === "youth") return user.id === youthId;
  if (user.role === "teacher") return DEMO_CLASS_YOUTH_IDS.includes(youthId);
  const youth = await loadYouth(youthId);
  return youth?.parentId === user.id;
}
