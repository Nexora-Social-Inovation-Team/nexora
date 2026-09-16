import { PrismaClient, type Prisma } from "@prisma/client";

/**
 * Demo users for the jury (docs/building-blocks/02). Idempotent: run it as
 * `bun run --filter nexora-api db:seed` as often as you like.
 * Block 08 extends this file with category summaries.
 */
const prisma = new PrismaClient();

// Ece first: the three youth rows reference her through parentId.
const USERS: Prisma.UserUncheckedCreateInput[] = [
  { id: "usr_ece", role: "parent", status: "active", displayName: "Ece", personaKey: "ece" },
  { id: "usr_mert", role: "teacher", status: "active", displayName: "Mert", personaKey: "mert" },
  { id: "usr_selin", role: "admin", status: "active", displayName: "Selin", personaKey: "selin" },
  {
    id: "usr_deniz",
    role: "youth",
    status: "pending_parent_consent",
    displayName: "Deniz",
    personaKey: "deniz_balanced",
    parentId: "usr_ece",
  },
  {
    id: "usr_deniz_risky",
    role: "youth",
    status: "pending_parent_consent",
    displayName: "Deniz (Riskli)",
    personaKey: "deniz_risky",
    parentId: "usr_ece",
  },
  {
    id: "usr_deniz_productive",
    role: "youth",
    status: "pending_parent_consent",
    displayName: "Deniz (Üretken)",
    personaKey: "deniz_productive",
    parentId: "usr_ece",
  },
];

for (const user of USERS) {
  const { status: _initialStatus, ...rest } = user;
  await prisma.user.upsert({
    where: { id: user.id },
    // Re-seeding never rewrites `status`: only a parent or admin may move a
    // youth between pending_parent_consent, active and revoked.
    update: rest,
    create: user,
  });
}

console.log(`seeded ${USERS.length} demo users`);
await prisma.$disconnect();
