import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

import { env } from "./env";

/*
 * Neon's pool talks over a WebSocket by default, and that socket is an I/O
 * object owned by the request that opened it. On Workers the second request
 * then dies with "Cannot perform I/O on behalf of a different request" —
 * measured: login worked, every call after it hung. Sending each query as its
 * own fetch keeps the I/O inside the request that asked for it.
 */
neonConfig.poolQueryViaFetch = true;

/**
 * Prisma is the only DB access layer (docs/ARCHITECTURE.md).
 *
 * The Neon driver adapter, not the native query engine: workerd cannot load a
 * native engine, and running the same driver locally means the deployed Worker
 * and `bun run dev` take one code path instead of two. Verified against the
 * real database under Bun and under Node.
 *
 * ponytail: one client for the whole process; add a globalThis guard only if a
 * watch-mode reload starts exhausting Neon connections.
 */
let client: PrismaClient | null = null;

const create = () =>
  new PrismaClient({ adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }) });

/**
 * Built on first query, not at import: Cloudflare runs top-level code to
 * validate an upload, where reading DATABASE_URL throws because no secret
 * exists yet. Deferring also keeps the connection inside the request that
 * opens it, which is what workerd requires.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, key) => {
    const live = (client ??= create());
    const value = Reflect.get(live, key, live);
    // `prisma.$queryRaw` and friends must keep their receiver.
    return typeof value === "function" ? value.bind(live) : value;
  },
});
