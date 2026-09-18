import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { coach } from "./coach";
import { prisma } from "./db";
import { env } from "./env";
import { ApiProblem, apiErrorResponse } from "./errors";
import { identity } from "./identity";
import { report } from "./report";
import { signalsScore } from "./score";

/**
 * Elysia compiles each handler with `new Function`, and workerd forbids code
 * generation from strings — on Workers every request died with
 * `EvalError: Code generation from strings disallowed for this context`
 * before any route ran. `aot: false` takes the interpreted path instead.
 * Bun keeps the compiled one; the routes are identical either way.
 */
const onWorkerd = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

export const app = new Elysia({ aot: !onWorkerd })
  .use(cors({ origin: env.WEB_ORIGIN, credentials: true }))
  // Single error shape for every route (docs/API.md). Nothing is logged here:
  // a URL or a connection string must never reach the log (docs/PRIVACY.md).
  .onError({ as: "global" }, ({ code, error }) => {
    if (error instanceof ApiProblem) return apiErrorResponse(error.code, error.message);
    // Duck-typed: shared and api each resolve their own zod copy under bun's
    // isolated linker, so `instanceof ZodError` can be false for a real one.
    if (error instanceof Error && error.name === "ZodError") return apiErrorResponse("validation_error");
    // packages/score refuses to score an empty week (docs/API.md no_data).
    if (error instanceof Error && error.name === "NoScoreDataError") return apiErrorResponse("no_data");
    if (code === "VALIDATION" || code === "PARSE") return apiErrorResponse("validation_error");
    if (code === "NOT_FOUND") return apiErrorResponse("no_data", "Kayıt bulunamadı.");
    return apiErrorResponse("upstream_unavailable");
  })
  // The only endpoint outside docs/API.md (AGENTS.md constraint 8).
  .get("/health", async ({ status }) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: true };
    } catch {
      // No error detail in the body or the log: a connection string is a secret.
      return status(503, { ok: false, db: false });
    }
  })
  .use(identity)
  .use(signalsScore)
  .use(coach)
  .use(report);

// Tests import `app` and call app.handle(new Request(...)); only the real
// entry module opens a socket.
if (import.meta.main) {
  app.listen(env.PORT);
  console.log(`nexora-api listening on :${env.PORT}`);
}
