import { computeScore } from "@nexora/score";
import { PrismaClient, type Prisma } from "@prisma/client";
import { fallbackFor } from "../src/coach/fallback";
import { CURRENT_WEEK, DEMO_MINUTES, HISTORY, utcDate, wirePeriod } from "./demo-data";

/**
 * Demo RESET (docs/building-blocks/08-demo-seed.md). `bun run --filter
 * nexora-api db:seed` puts the database back on slide 1 of the jury script:
 * Deniz waits for a parent, the two switcher personas already have four weeks
 * each plus a coach row and a task. It is a reset, not an accumulator — running
 * it mid-demo undoes the live approve, and running it twice prints
 * byte-identical read-back lines.
 */
const prisma = new PrismaClient();

/**
 * `--approve` starts Deniz already active, for rehearsals and for anyone who
 * wants a full database in one command (`db:seed -- --approve` then
 * `demo:ingest-balanced`). The jury path uses the default: he waits, and Ece
 * approves him live on stage (docs/building-blocks/08-demo-seed.md).
 */
const approved = process.argv.includes("--approve");

// Ece first: the three youth rows reference her through parentId.
const USERS: Prisma.UserUncheckedCreateInput[] = [
  { id: "usr_ece", role: "parent", status: "active", displayName: "Ece", personaKey: "ece" },
  { id: "usr_mert", role: "teacher", status: "active", displayName: "Mert", personaKey: "mert" },
  { id: "usr_selin", role: "admin", status: "active", displayName: "Selin", personaKey: "selin" },
  {
    // Slide 1: the jury watches Ece approve this one live.
    id: "usr_deniz",
    role: "youth",
    status: approved ? "active" : "pending_parent_consent",
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
  // The three shared history weeks climb to 80, so the current week visibly
  // drops to 38 for Riskli and rises to 93 for Üretken.
  const weeks = [...HISTORY, { period: CURRENT_WEEK, minutes: persona.minutes }];

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

  // A parent switching to Riskli or Üretken must land on a filled report, not on
  // the "no task yet" empty state — only Deniz earns his task live on stage. The
  // copy is the same canned band answer the coach itself serves with HF_TOKEN
  // unset, so the demo shows one voice. Üretken already finished his; Riskli's
  // is still open, which is the honest shape of that week.
  const canned = fallbackFor(computeScore(persona.minutes).value);
  const done = persona.id === "usr_deniz_productive";
  const taskId = `tsk_${persona.id}`;
  await prisma.task.create({
    data: {
      id: taskId,
      youthId: persona.id,
      title: canned.task.title,
      steps: canned.task.steps,
      etaMinutes: canned.task.eta_minutes,
      status: done ? "completed" : "open",
      badge: done ? "degerli_adim" : null,
      // Frozen, like the periods: a re-seed must not move the demo's clock.
      completedAt: done ? utcDate(CURRENT_WEEK.end) : null,
    },
  });
  await prisma.coachRecommendation.create({
    data: {
      id: `cch_${persona.id}`,
      youthId: persona.id,
      tips: canned.tips,
      shareText: canned.share_text,
      taskId,
      source: "fallback",
      createdAt: utcDate(CURRENT_WEEK.end),
    },
  });
}

// Status and audit must never disagree here either.
if (approved) {
  await prisma.consentEvent.create({
    data: { id: "cns_usr_deniz_approve", youthId: "usr_deniz", actorId: "usr_ece", action: "approve" },
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
