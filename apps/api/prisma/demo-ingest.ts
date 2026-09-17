import type { ApiError, CoachResponse } from "@nexora/shared";
import { prisma } from "../src/db";
import { app } from "../src/index";
import { CURRENT_WEEK, DEMO_MINUTES, wirePeriod } from "./demo-data";

/**
 * `bun run demo:ingest-balanced` — the scripted stand-in for the Expo step
 * (docs/building-blocks/08-demo-seed.md): log in as Deniz, POST the balanced
 * week, fetch the coach. Run it after Ece approves and the parent panel has a
 * score, a task and a `share_text` without a phone in the room.
 *
 * In-process through `app.handle`: src/index.ts only listens under
 * `import.meta.main`, so importing it opens no socket and cannot collide with
 * a dev server already serving the same Neon database.
 */

const period = wirePeriod(CURRENT_WEEK);

const call = (path: string, init?: RequestInit) =>
  app.handle(new Request(`http://demo.local${path}`, init));

const post = (path: string, body: unknown, token?: string) =>
  call(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const stop = async (code: number, ...lines: string[]) => {
  for (const line of lines) console.log(line);
  await prisma.$disconnect();
  process.exit(code);
};

const login = await post("/auth/login", { persona: "deniz" });
if (!login.ok) await stop(1, "login failed: is the database seeded? run `bun run --filter nexora-api db:seed`");
const { token } = (await login.json()) as { token: string };

const ingest = await post("/signals/category-summary", { period, minutes: DEMO_MINUTES.deniz_balanced }, token);
if (ingest.status === 403) {
  const problem = (await ingest.json()) as ApiError;
  if (problem.error.code === "consent_missing") {
    await stop(
      1,
      "Deniz is still waiting for a parent, so nothing was ingested.",
      'Approve him first: open http://localhost:5173/app/parent, log in as "Ece (Veli)", stay on "Dengeli" and press "Onayla". Then run this again.',
    );
  }
  await stop(1, `ingest refused: ${problem.error.code}`);
}
if (ingest.status !== 201) await stop(1, `ingest failed with HTTP ${ingest.status}`);
const { score } = (await ingest.json()) as { score: { value: number } };

const coachResponse = await call("/coach/recommendation", { headers: { authorization: `Bearer ${token}` } });
if (!coachResponse.ok) await stop(1, `coach failed with HTTP ${coachResponse.status}`);
const coach = (await coachResponse.json()) as CoachResponse;

console.log(`usr_deniz ${period} score=${score.value} coach=${coach.source} task=${coach.task_id}`);
console.log(`task: ${coach.task.title} (${coach.task.eta_minutes} dk)`);
console.log(`share_text: ${coach.share_text}`);
console.log("Open the parent panel and press Dengeli — the report is ready.");

// Without this the Prisma client keeps the process alive forever.
await prisma.$disconnect();
