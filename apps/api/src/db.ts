import { PrismaClient } from "@prisma/client";

// Prisma is the only DB access layer (docs/ARCHITECTURE.md).
// ponytail: one client for the whole process; add a globalThis guard only if a
// watch-mode reload starts exhausting Neon connections.
export const prisma = new PrismaClient();
