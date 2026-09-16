import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
vi.mock("./db", () => ({ prisma: { $queryRaw: queryRaw } }));

const { app } = await import("./index");

const health = () => app.handle(new Request("http://localhost/health"));

describe("GET /health", () => {
  // mockClear, not mockReset: reset drops vitest's settled-result tracking and
  // the rejected promise below then surfaces as an unhandled rejection.
  beforeEach(() => {
    queryRaw.mockClear();
  });

  it("returns 200 { ok: true, db: true } when SELECT 1 succeeds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const res = await health();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: true });
    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it("returns 503 { ok: false, db: false } when the database is unreachable", async () => {
    // Not mockRejectedValue: vitest builds that promise eagerly and the
    // unconsumed rejection fails the test before the handler ever runs.
    queryRaw.mockImplementation(() => Promise.reject(new Error("connection refused")));
    const res = await health();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: false });
  });

  it("allows the configured web origin with credentials", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const res = await app.handle(
      new Request("http://localhost/health", { headers: { origin: "http://localhost:5173" } }),
    );

    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("does not allow an unlisted origin", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const res = await app.handle(
      new Request("http://localhost/health", { headers: { origin: "https://evil.example" } }),
    );

    expect(res.headers.get("access-control-allow-origin")).not.toBe("https://evil.example");
  });
});
