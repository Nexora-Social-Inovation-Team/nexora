import { consentRequestSchema, loginRequestSchema } from "@nexora/shared";
import { Elysia } from "elysia";
import {
  PERSONA_USER_ID,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  requireLinkedParent,
  requireUser,
  signSession,
  toUserResponse,
  type SessionUser,
} from "./auth";
import { prisma } from "./db";
import { ApiProblem } from "./errors";

/**
 * Identity, session and the parent consent gate (docs/building-blocks/02).
 * Every body is parsed with the shared Zod schema; a ZodError surfaces as
 * `validation_error` through the global onError in index.ts.
 */
export const identity = new Elysia({ name: "identity" })
  .post("/auth/login", async ({ body, cookie }) => {
    const { persona } = loginRequestSchema.parse(body);
    const user = (await prisma.user.findUnique({
      where: { id: PERSONA_USER_ID[persona] },
    })) as SessionUser | null;
    if (!user) {
      throw new ApiProblem("no_data", "Demo kullanıcıları yüklenmemiş. Önce veritabanını hazırla.");
    }

    const token = await signSession(user.id);
    // Web uses this cookie; Expo and the extension send the same value as a
    // Bearer token.
    //
    // Deployed, the panel and the API are different origins, and a Lax cookie
    // is simply not sent on a cross-site fetch — login would appear to succeed
    // and every later request would arrive anonymous. None requires Secure,
    // which is why the two move together; locally both stay off so plain
    // http://localhost keeps working.
    const crossSite = process.env.NODE_ENV === "production";
    cookie[SESSION_COOKIE]?.set({
      value: token,
      httpOnly: true,
      sameSite: crossSite ? "none" : "lax",
      path: "/",
      secure: crossSite,
      maxAge: SESSION_TTL_SECONDS,
    });
    return { user: toUserResponse(user), token };
  })

  .get("/users/me", async ({ request }) => ({ user: toUserResponse(await requireUser(request)) }))

  .post("/consent/parent/approve", async ({ request, body }) => {
    const { youthId } = consentRequestSchema.parse(body);
    const actor = await requireUser(request);
    await requireLinkedParent(actor, youthId);

    await prisma.$transaction([
      prisma.user.update({ where: { id: youthId }, data: { status: "active" } }),
      prisma.consentEvent.create({ data: { youthId, actorId: actor.id, action: "approve" } }),
    ]);
    return { youthId, status: "active", approvedAt: new Date().toISOString() };
  })

  .post("/consent/parent/revoke", async ({ request, body }) => {
    const { youthId } = consentRequestSchema.parse(body);
    const actor = await requireUser(request);
    await requireLinkedParent(actor, youthId);

    await prisma.$transaction([
      prisma.user.update({ where: { id: youthId }, data: { status: "revoked" } }),
      prisma.consentEvent.create({ data: { youthId, actorId: actor.id, action: "revoke" } }),
      // ponytail: the 30-day deletion (docs/PRIVACY.md) is this row plus a
      // human. Upgrade path: a scheduled job that drains status=pending.
      prisma.deletionRequest.create({ data: { youthId, status: "pending" } }),
    ]);
    return { youthId, status: "revoked", revokedAt: new Date().toISOString() };
  });
