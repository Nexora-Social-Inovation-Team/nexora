import { computeScore } from "@nexora/score";
import { PrismaClient, type Prisma } from "@prisma/client";
import { CURRENT_WEEK, DEMO_MINUTES, PREVIOUS_WEEK, utcDate, wirePeriod } from "./demo-data";

/**
 * Demo RESET (docs/building-blocks/08-demo-seed.md). `bun run --filter
 * nexora-api db:seed` puts the database back on slide 1 of the jury script:
 * Deniz waits for a parent, the two switcher personas already have two weeks
 * each. It is a reset, not an accumulator — running it mid-demo undoes the
 * live approve, and running it twice prints byte-identical read-back lines.
 */
const prisma = new PrismaClient();

// Ece first: the three youth rows reference her through parentId.
const USERS: Prisma.UserUncheckedCreateInput[] = [
  { id: "usr_ece", role: "parent", status: "active", displayName: "Ece", personaKey: "ece" },
  { id: "usr_mert", role: "teacher", status: "active", displayName: "Mert", personaKey: "mert" },
  { id: "usr_selin", role: "admin", status: "active", displayName: "Selin", personaKey: "selin" },
  {
    // Slide 1: the jury watches Ece approve this one live.
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
    status: "active",
    displayName: "Deniz (Riskli)",
    personaKey: "deniz_risky",
    parentId: "usr_ece",
  },
  {
    id: "usr_deniz_productive",
    role: "youth",
    status: "active",
    displayName: "Deniz (Üretken)",
    personaKey: "deniz_productive",
    parentId: "usr_ece",
  },
];

/** Every youth whose derived rows this script owns and wipes. */
const DEMO_YOUTH_IDS = ["usr_deniz", "usr_deniz_risky", "usr_deniz_productive"];

/** The panel switcher's two ready personas. Deniz stays empty on purpose. */
const SEEDED = [
  { id: "usr_deniz_risky", minutes: DEMO_MINUTES.deniz_risky },
  { id: "usr_deniz_productive", minutes: DEMO_MINUTES.deniz_productive },
];

for (const user of USERS) {
  // The full row, `status` included: the reset owns the consent state.
  await prisma.user.upsert({ where: { id: user.id }, update: user, create: user });
}

await prisma.$transaction([
  prisma.coachRecommendation.deleteMany({ where: { youthId: { in: DEMO_YOUTH_IDS } } }),
  prisma.task.deleteMany({ where: { youthId: { in: DEMO_YOUTH_IDS } } }),
  prisma.score.deleteMany({ where: { youthId: { in: DEMO_YOUTH_IDS } } }),
  prisma.categorySummary.deleteMany({ where: { youthId: { in: DEMO_YOUTH_IDS } } }),
  prisma.consentEvent.deleteMany({ where: { youthId: { in: DEMO_YOUTH_IDS } } }),
  prisma.deletionRequest.deleteMany({ where: { youthId: { in: DEMO_YOUTH_IDS } } }),
]);

for (const persona of SEEDED) {
  // Previous week is the balanced set for everyone, so the trend visibly drops
  // to 38 for Riskli and rises to 93 for Üretken.
  const weeks = [
    { period: PREVIOUS_WEEK, minutes: DEMO_MINUTES.deniz_balanced },
    { period: CURRENT_WEEK, minutes: persona.minutes },
  ];

  for (const week of weeks) {
    const periodStart = utcDate(week.period.start);
    const periodEnd = utcDate(week.period.end);
    const score = computeScore(week.minutes);

    await prisma.categorySummary.create({
      data: {
        id: `sum_${persona.id}_${week.period.start}`,
        youthId: persona.id,
        periodStart,
        periodEnd,
        minutes: week.minutes,
      },
    });
    await prisma.score.create({
      data: {
        id: `sco_${persona.id}_${week.period.start}`,
        youthId: persona.id,
        value: score.value,
        reasons: score.reasons,
        periodStart,
        periodEnd,
        // Score.computedAt defaults to CURRENT_TIMESTAMP, which is constant
        // for a whole transaction: without an explicit value "latest score"
        // (orderBy computedAt desc) is a coin flip between the two weeks.
        computedAt: periodEnd,
      },
    });
  }

  // Status and audit must never disagree: an active youth has an approve row.
  await prisma.consentEvent.create({
    data: { id: `cns_${persona.id}_approve`, youthId: persona.id, actorId: "usr_ece", action: "approve" },
  });
}

// Read-back: what is actually in the database now. Two runs print the same
// lines — that is the idempotency proof and the presenter's pre-demo check.
const seeded = await prisma.user.findMany({
  where: { id: { in: DEMO_YOUTH_IDS } },
  include: {
    _count: { select: { summaries: true, scores: true, tasks: true, consents: true } },
    scores: { orderBy: { periodStart: "asc" } },
  },
});

console.log(`seeded ${USERS.length} demo users`);
for (const id of DEMO_YOUTH_IDS) {
  const youth = seeded.find((row) => row.id === id);
  if (!youth) throw new Error(`seed read-back: ${id} is missing`);
  const weeks = youth.scores
    .map((row) => `${wirePeriod({ start: row.periodStart.toISOString().slice(0, 10), end: row.periodEnd.toISOString().slice(0, 10) })}=${row.value}`)
    .join(" ");
  const counts = youth._count;
  const coach = await prisma.coachRecommendation.count({ where: { youthId: id } });
  console.log(
    `${id.padEnd(20)} status=${youth.status.padEnd(22)} summaries=${counts.summaries} scores=${counts.scores} tasks=${counts.tasks} coach=${coach} consents=${counts.consents} ${weeks}`.trimEnd(),
  );
}

await prisma.$disconnect();
