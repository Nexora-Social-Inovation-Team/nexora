import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { prisma } from "./db";
import { env } from "./env";
import { ApiProblem, apiErrorResponse } from "./errors";
import { identity } from "./identity";

export const app = new Elysia()
  .use(cors({ origin: env.WEB_ORIGIN, credentials: true }))
  // Single error shape for every route (docs/API.md). Nothing is logged here:
  // a URL or a connection string must never reach the log (docs/PRIVACY.md).
  .onError({ as: "global" }, ({ code, error }) => {
    if (error instanceof ApiProblem) return apiErrorResponse(error.code, error.message);
    // Duck-typed: shared and api each resolve their own zod copy under bun's
    // isolated linker, so `instanceof ZodError` can be false for a real one.
    if (error instanceof Error && error.name === "ZodError") return apiErrorResponse("validation_error");
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
  .use(identity);

// Tests import `app` and call app.handle(new Request(...)); only the real
// entry module opens a socket.
if (import.meta.main) {
  app.listen(env.PORT);
  console.log(`nexora-api listening on :${env.PORT}`);
}
