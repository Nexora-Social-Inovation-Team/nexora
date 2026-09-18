import type { CategoryMinutes } from "@nexora/shared";

/**
 * The jury's numbers, in one place: docs/DESIGN.md "Demo seeds (minutes →
 * distinct scores)". Used by prisma/seed.ts and prisma/demo-ingest.ts.
 *
 * `CategoryMinutes` is the privacy guard here. The seed writes Prisma directly
 * and never passes through `findForbiddenKey`, so the type is what makes a
 * `url`, `hostname` or `title` key impossible to express (docs/PRIVACY.md).
 *
 * ponytail: the four periods are frozen literals, never `new Date()`. A moving
 * "this week" would make a re-seed non-identical and the trend unreproducible;
 * the jury simply reads 2026-09-08/2026-09-15 as last week. Upgrade path: pass
 * a week start in once the demo outlives the competition.
 */

export type DemoPeriod = { start: string; end: string };

export const WEEK_MINUS_3: DemoPeriod = { start: "2026-08-18", end: "2026-08-25" };
export const WEEK_MINUS_2: DemoPeriod = { start: "2026-08-25", end: "2026-09-01" };
export const PREVIOUS_WEEK: DemoPeriod = { start: "2026-09-01", end: "2026-09-08" };
export const CURRENT_WEEK: DemoPeriod = { start: "2026-09-08", end: "2026-09-15" };

/** `YYYY-MM-DD/YYYY-MM-DD`, the wire form of `period` (docs/API.md). */
export const wirePeriod = (period: DemoPeriod) => `${period.start}/${period.end}`;

/** UTC midnight, matching how the API parses a period into Prisma columns. */
export const utcDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

/** Minutes → 80 / 38 / 93 through `computeScore`; never hard-code the scores. */
export const DEMO_MINUTES = {
  deniz_balanced: {
    science: 40,
    arts: 15,
    sports: 20,
    culture: 10,
    entrepreneurship: 0,
    national_memory: 5,
    entertainment: 120,
    harmful: 0,
  },
  deniz_risky: {
    science: 10,
    arts: 0,
    sports: 0,
    culture: 0,
    entrepreneurship: 0,
    national_memory: 0,
    entertainment: 200,
    harmful: 40,
  },
  deniz_productive: {
    science: 70,
    arts: 20,
    sports: 20,
    culture: 15,
    entrepreneurship: 0,
    national_memory: 0,
    entertainment: 40,
    harmful: 0,
  },
} satisfies Record<string, CategoryMinutes>;

/**
 * The three weeks every persona shares before the current one. They score
 * 53 -> 67 -> 80 through `computeScore`, so the parent panel's trend is a real
 * line the switcher then splits (38 for Riskli, 93 for Üretken) instead of two
 * lonely points. Same frozen-literal rule as the periods above.
 */
export const HISTORY: { period: DemoPeriod; minutes: CategoryMinutes }[] = [
  {
    period: WEEK_MINUS_3,
    minutes: {
      science: 20,
      arts: 5,
      sports: 10,
      culture: 0,
      entrepreneurship: 0,
      national_memory: 0,
      entertainment: 150,
      harmful: 5,
    },
  },
  {
    period: WEEK_MINUS_2,
    minutes: {
      science: 30,
      arts: 10,
      sports: 15,
      culture: 5,
      entrepreneurship: 0,
      national_memory: 0,
      entertainment: 130,
      harmful: 0,
    },
  },
  { period: PREVIOUS_WEEK, minutes: DEMO_MINUTES.deniz_balanced },
];
