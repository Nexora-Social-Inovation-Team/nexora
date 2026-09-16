import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { prisma } from "./db";
import { env } from "./env";

export const app = new Elysia()
  .use(cors({ origin: env.WEB_ORIGIN, credentials: true }))
  // The only endpoint outside docs/API.md (AGENTS.md constraint 8).
  .get("/health", async ({ status }) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: true };
    } catch {
      // No error detail in the body or the log: a connection string is a secret.
      return status(503, { ok: false, db: false });
    }
  });

// Tests import `app` and call app.handle(new Request(...)); only the real
// entry module opens a socket.
if (import.meta.main) {
  app.listen(env.PORT);
  console.log(`nexora-api listening on :${env.PORT}`);
}
