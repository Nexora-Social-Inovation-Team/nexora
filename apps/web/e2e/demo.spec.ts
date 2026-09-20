import { expect, test } from "@playwright/test";

/**
 * The critical E2E of docs/building-blocks/08-demo-seed.md: login, approve,
 * ingest, coach, complete task, report. It runs against a real API and a real
 * Neon database seeded by `db:seed`, so it asserts the jury path itself rather
 * than a mock of it (the mocked suite lives in ../tests).
 *
 * Preconditions: `bun run --filter nexora-api db:seed` — Deniz must still be
 * pending, because approving him live is step 1:20 of the script.
 */

const API = "http://localhost:3000";
const PERIOD = "2026-09-08/2026-09-15";

/** docs/DESIGN.md "Demo seeds": the balanced week, which scores 80. */
const BALANCED = {
  science: 40,
  arts: 15,
  sports: 20,
  culture: 10,
  entrepreneurship: 0,
  national_memory: 5,
  entertainment: 120,
  harmful: 0,
};

test("parent approves Deniz, the week lands, and the panel switcher shows 38 / 93 / 80", async ({
  page,
  request,
}) => {
  // ---------------------------------------------------- 1:20 Ece approves
  await page.goto("/app/parent");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.getByRole("heading", { name: "Çocuğunun haftası" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Veli onayı bekleniyor" })).toBeVisible();
  await page.getByRole("button", { name: "Onayla" }).click();
  // Approved but nothing ingested yet: the panel's empty state, not an error.
  await expect(page.getByText("Bu hafta henüz özet yok.")).toBeVisible();

  // ------------------------------------------- 2:00–3:00 the Expo steps, but
  // out of band: /signals, /coach and /tasks are Bearer-only youth routes with
  // no web UI, so Playwright's APIRequestContext stands in for the phone.
  const login = await request.post(`${API}/auth/login`, { data: { persona: "deniz" } });
  expect(login.status()).toBe(200);
  const { token } = (await login.json()) as { token: string };
  const headers = { authorization: `Bearer ${token}` };

  const ingest = await request.post(`${API}/signals/category-summary`, {
    headers,
    data: { period: PERIOD, minutes: BALANCED },
  });
  expect(ingest.status()).toBe(201);
  expect(((await ingest.json()) as { score: { value: number } }).score.value).toBe(80);

  const coach = await request.get(`${API}/coach/recommendation`, { headers });
  expect(coach.status()).toBe(200);
  // Whether the model or the canned fallback wrote it, the panel must show
  // this exact sentence back to the parent.
  const { task_id, share_text } = (await coach.json()) as { task_id: string; share_text: string };

  const completed = await request.post(`${API}/tasks/${task_id}/complete`, { headers });
  expect(completed.status()).toBe(200);
  expect((await completed.json()).badge).toBe("degerli_adim");

  // -------------------------------------------------- 4:00 the parent report
  // Switching youth changes the query key, which refetches. Never page.reload():
  // the web session is React state only, so a reload logs Ece out.
  const score = page.getByRole("region", { name: "Bu haftaki denge" });

  await page.getByRole("button", { name: "Riskli" }).click();
  await expect(score.getByText("38", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Üretken" }).click();
  await expect(score.getByText("93", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Dengeli" }).click();
  await expect(score.getByText("80", { exact: true })).toBeVisible();
  // The wire period is `2026-09-08/2026-09-15`; the panel says it in Turkish.
  await expect(score.getByText("Dönem: 8–15 Eylül 2026")).toBeVisible();

  const task = page.getByRole("region", { name: "Mikro-görev" });
  await expect(task.getByText("Tamamlandı")).toBeVisible();
  await expect(task.getByText(share_text)).toBeVisible();

  // 5:30 the privacy promise stays on the screen the parent is looking at.
  await expect(page.getByText("Bu panelde tam bağlantı veya alan adı gösterilmez.")).toBeVisible();

  // ------------------------------------------------- 3:40 the teacher panel
  // The same three weeks one level up: (80 + 38 + 93) / 3 = 70, and only the
  // risky youth sits under the support band. Mert can read the class but can
  // never approve — the button must not exist on his panel at all.
  await page.getByRole("button", { name: "Çıkış" }).click();
  await page.goto("/app/teacher");
  const signIn = page.getByRole("button", { name: "Giriş yap" });
  await expect(signIn).toBeEnabled();
  await page.getByLabel("Rol").selectOption("mert");
  await signIn.click();

  const classWeek = page.getByRole("region", { name: "Sınıfın haftası" });
  await expect(classWeek.getByText("70", { exact: true })).toBeVisible();
  await expect(classWeek.getByText("Destek gerektiren: 1 / 3 öğrenci")).toBeVisible();
  await expect(page.getByRole("row", { name: /Riskli.*38.*Destek gerekli/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Onayla" })).toHaveCount(0);
});
