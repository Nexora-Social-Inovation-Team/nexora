import type { Persona } from "@nexora/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Block 02 seed, in memory: no DATABASE_URL is needed to run these. */
const seedUsers = () =>
  new Map<string, Record<string, unknown>>([
    ["usr_ece", { id: "usr_ece", role: "parent", status: "active", displayName: "Ece", parentId: null }],
    ["usr_mert", { id: "usr_mert", role: "teacher", status: "active", displayName: "Mert", parentId: null }],
    ["usr_selin", { id: "usr_selin", role: "admin", status: "active", displayName: "Selin", parentId: null }],
    [
      "usr_deniz",
      {
        id: "usr_deniz",
        role: "youth",
        status: "pending_parent_consent",
        displayName: "Deniz",
        parentId: "usr_ece",
      },
    ],
  ]);

let users = seedUsers();
const consentEvents: Record<string, unknown>[] = [];
const deletionRequests: Record<string, unknown>[] = [];

const findUnique = vi.fn(async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null);
const update = vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
  const next = { ...users.get(where.id), ...data };
  users.set(where.id, next);
  return next;
});
const consentCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
  consentEvents.push(data);
  return { id: `ce_${consentEvents.length}`, ...data };
});
const deletionCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
  deletionRequests.push(data);
  return { id: `dr_${deletionRequests.length}`, ...data };
});

vi.mock("./db", () => ({
  prisma: {
    user: { findUnique, update },
    consentEvent: { create: consentCreate },
    deletionRequest: { create: deletionCreate },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    $queryRaw: vi.fn(),
  },
}));

const { app } = await import("./index");

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );

const login = async (persona: Persona | string) => {
  const res = await post("/auth/login", { persona });
  return { res, body: (await res.json()) as { user?: Record<string, unknown>; token?: string } };
};

const tokenOf = async (persona: Persona) => (await login(persona)).body.token as string;

beforeEach(() => {
  users = seedUsers();
  consentEvents.length = 0;
  deletionRequests.length = 0;
  // mockClear, not mockReset: reset drops vitest's settled-result tracking.
  for (const spy of [findUnique, update, consentCreate, deletionCreate]) spy.mockClear();
});

describe("POST /auth/login", () => {
  it("logs Deniz in as a youth still waiting for parent consent", async () => {
    const { res, body } = await login("deniz");

    expect(res.status).toBe(200);
    expect(body.user).toEqual({
      id: "usr_deniz",
      role: "youth",
      status: "pending_parent_consent",
      displayName: "Deniz",
      linkedYouthId: null,
    });
    expect(body.token).toBeTruthy();
  });

  it("sets an HttpOnly, SameSite=Lax session cookie carrying the same token", async () => {
    const { res, body } = await login("deniz");
    const cookie = res.headers.get("set-cookie") ?? "";

    expect(cookie).toContain(`nexora_session=${body.token}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it("gives the parent and the teacher a linked youth", async () => {
    expect((await login("ece")).body.user).toMatchObject({ role: "parent", linkedYouthId: "usr_deniz" });
    expect((await login("mert")).body.user).toMatchObject({ role: "teacher", linkedYouthId: "usr_deniz" });
    expect((await login("selin")).body.user).toMatchObject({ role: "admin", linkedYouthId: null });
  });

  it("rejects an unknown persona with validation_error", async () => {
    const { res, body } = await login("hacker");

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: { code: "validation_error", message: expect.any(String) } });
  });
});

describe("GET /users/me", () => {
  const me = (headers: Record<string, string>) =>
    app.handle(new Request("http://localhost/users/me", { headers }));

  it("is 401 unauthorized without a session", async () => {
    const res = await me({});

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: "unauthorized", message: expect.any(String) } });
  });

  it("accepts the cookie and the Bearer token for the same session", async () => {
    const token = await tokenOf("deniz");

    const byCookie = await me({ cookie: `nexora_session=${token}` });
    const byBearer = await me({ authorization: `Bearer ${token}` });

    expect(byCookie.status).toBe(200);
    expect(byBearer.status).toBe(200);
    expect(await byCookie.json()).toEqual(await byBearer.json());
  });

  it("rejects a tampered token", async () => {
    const token = await tokenOf("deniz");
    const res = await me({ authorization: `Bearer ${token.slice(0, -2)}xx` });

    expect(res.status).toBe(401);
  });

  it("reads status from the database, not from the token", async () => {
    const token = await tokenOf("deniz");
    users.set("usr_deniz", { ...users.get("usr_deniz")!, status: "active" });

    const res = await me({ authorization: `Bearer ${token}` });

    expect(((await res.json()) as { user: { status: string } }).user.status).toBe("active");
  });
});

describe("POST /consent/parent/approve", () => {
  const approve = async (persona: Persona, youthId = "usr_deniz") =>
    post("/consent/parent/approve", { youthId }, { authorization: `Bearer ${await tokenOf(persona)}` });

  it("activates the youth for the linked parent and writes a ConsentEvent", async () => {
    const res = await approve("ece");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      youthId: "usr_deniz",
      status: "active",
      approvedAt: expect.any(String),
    });
    expect(users.get("usr_deniz")).toMatchObject({ status: "active" });
    expect(consentEvents).toEqual([{ youthId: "usr_deniz", actorId: "usr_ece", action: "approve" }]);
  });

  it("lets an admin approve", async () => {
    const res = await approve("selin");

    expect(res.status).toBe(200);
    expect(users.get("usr_deniz")).toMatchObject({ status: "active" });
    expect(consentEvents).toEqual([{ youthId: "usr_deniz", actorId: "usr_selin", action: "approve" }]);
  });

  it("refuses the teacher with 403 forbidden and leaves the youth pending", async () => {
    const res = await approve("mert");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: "forbidden", message: expect.any(String) } });
    expect(users.get("usr_deniz")).toMatchObject({ status: "pending_parent_consent" });
    expect(consentEvents).toEqual([]);
  });

  it("refuses a youth approving themselves", async () => {
    const res = await approve("deniz");

    expect(res.status).toBe(403);
    expect(users.get("usr_deniz")).toMatchObject({ status: "pending_parent_consent" });
  });

  it("is 401 without a session", async () => {
    const res = await post("/consent/parent/approve", { youthId: "usr_deniz" });

    expect(res.status).toBe(401);
  });

  it("rejects a body without youthId", async () => {
    const res = await post("/consent/parent/approve", {}, { authorization: `Bearer ${await tokenOf("ece")}` });

    expect(res.status).toBe(400);
  });
});

describe("POST /consent/parent/revoke", () => {
  it("revokes and opens a pending deletion request", async () => {
    const token = await tokenOf("ece");
    const res = await post("/consent/parent/revoke", { youthId: "usr_deniz" }, { authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      youthId: "usr_deniz",
      status: "revoked",
      revokedAt: expect.any(String),
    });
    expect(users.get("usr_deniz")).toMatchObject({ status: "revoked" });
    expect(consentEvents).toEqual([{ youthId: "usr_deniz", actorId: "usr_ece", action: "revoke" }]);
    expect(deletionRequests).toEqual([{ youthId: "usr_deniz", status: "pending" }]);
  });

  it("refuses the teacher", async () => {
    const token = await tokenOf("mert");
    const res = await post("/consent/parent/revoke", { youthId: "usr_deniz" }, { authorization: `Bearer ${token}` });

    expect(res.status).toBe(403);
    expect(deletionRequests).toEqual([]);
  });
});
