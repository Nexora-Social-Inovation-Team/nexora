import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** docs/API.md GET /reports/weekly example + the contract's `empty: false`. */
const READY_REPORT = {
  youthId: "usr_deniz",
  period: "2026-09-08/2026-09-15",
  score: {
    value: 80,
    reasons: [
      "Eğlence kategorisi sürenin çoğunu kaplıyor.",
      "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
      "Birden fazla değerli kategoride zaman geçirmişsin.",
    ],
  },
  distribution: {
    science: 40,
    arts: 15,
    sports: 20,
    culture: 10,
    entrepreneurship: 0,
    national_memory: 5,
    entertainment: 120,
    harmful: 0,
  },
  trend: [
    { period: "2026-09-01/2026-09-08", value: 58 },
    { period: "2026-09-08/2026-09-15", value: 80 },
  ],
  task: { id: "task_abc", title: "15 dakikalık bilim molası", status: "open" },
  share_text: "Deniz bu hafta eğlence süresini dengelemek için kısa bir bilim görevi seçti.",
  empty: false,
};

const EMPTY_REPORT = {
  youthId: "usr_deniz",
  period: null,
  score: null,
  distribution: {},
  trend: [],
  task: null,
  share_text: null,
  empty: true,
};

const apiError = (code: string, message: string) => ({ error: { code, message } });

async function mockLogin(page: Page) {
  await page.route("**/auth/login", async (route) => {
    const persona = (route.request().postDataJSON() as { persona: string }).persona;
    const user =
      persona === "mert"
        ? { id: "usr_mert", role: "teacher", status: "active", displayName: "Mert", linkedYouthId: "usr_deniz" }
        : { id: "usr_ece", role: "parent", status: "active", displayName: "Ece", linkedYouthId: "usr_deniz" };
    await route.fulfill({ json: { user, token: "demo-token" } });
  });
}

async function signIn(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

test("landing shows the loop and the trust line", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ölç → Anla → Koçla → Üret" })).toBeVisible();
  await expect(page.getByText("Ham URL yok. Mesaj yok. Arama kaydı yok.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Nasıl çalışır?" }).first()).toBeVisible();
});

test("how-it-works and faq render the copy deck", async ({ page }) => {
  await page.goto("/how-it-works");
  for (const step of ["1. Ölç", "2. Anla", "3. Koçla", "4. Üret"]) {
    await expect(page.getByRole("heading", { name: step })).toBeVisible();
  }
  await expect(page.getByText("örnek haftalık rapor").first()).toBeVisible();

  await page.goto("/faq");
  await expect(page.getByText("Şifrelerinizi istiyor musunuz?")).toBeVisible();
  await expect(page.getByText("Ham içerik okunuyor mu?")).toBeVisible();
  await expect(page.getByText("Kim neyi görür?")).toBeVisible();
  await expect(page.getByText("Ruh sağlığı tanısı koyuyor mu?")).toBeVisible();
});

test("privacy page lists never-collected items in a real table", async ({ page }) => {
  await page.goto("/privacy");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  for (const item of ["Ham bağlantılar", "Mesajlar", "Arama sorguları", "Form alanları"]) {
    await expect(table.getByRole("row", { name: new RegExp(item) })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Geri çekme (30 gün)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tanı koymaz" })).toBeVisible();
});

test("parent sees the ready weekly report", async ({ page }) => {
  await mockLogin(page);
  await page.route("**/reports/weekly*", (route) => route.fulfill({ json: READY_REPORT }));

  await signIn(page, "/app/parent");

  await expect(page.getByRole("heading", { name: "Çocuğunun haftası" })).toBeVisible();
  await expect(page.getByText("80", { exact: true })).toBeVisible();
  for (const reason of READY_REPORT.score.reasons) {
    await expect(page.getByText(reason)).toBeVisible();
  }
  await expect(page.getByText("Eğlence", { exact: true })).toBeVisible();
  await expect(page.getByText("120 dk")).toBeVisible();
  await expect(page.getByText("15 dakikalık bilim molası")).toBeVisible();
  await expect(page.getByText("Açık")).toBeVisible();
  await expect(page.getByText(READY_REPORT.share_text)).toBeVisible();
  await expect(page.getByText("Bu panelde tam bağlantı veya alan adı gösterilmez.")).toBeVisible();
});

test("parent can switch youths", async ({ page }) => {
  await mockLogin(page);
  await page.route("**/reports/weekly*", (route) => {
    const youthId = new URL(route.request().url()).searchParams.get("youthId");
    return route.fulfill({
      json: youthId === "usr_deniz_risky" ? { ...READY_REPORT, youthId, score: { ...READY_REPORT.score, value: 38 } } : READY_REPORT,
    });
  });

  await signIn(page, "/app/parent");
  await expect(page.getByText("80", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Riskli" }).click();
  await expect(page.getByText("38", { exact: true })).toBeVisible();
});

test("empty report (empty: true) shows the empty copy", async ({ page }) => {
  await mockLogin(page);
  await page.route("**/reports/weekly*", (route) => route.fulfill({ json: EMPTY_REPORT }));

  await signIn(page, "/app/parent");
  await expect(page.getByText("Bu hafta henüz özet yok.")).toBeVisible();
});

test("404 no_data shows the empty copy too", async ({ page }) => {
  await mockLogin(page);
  await page.route("**/reports/weekly*", (route) =>
    route.fulfill({ status: 404, json: apiError("no_data", "Henüz kategori özeti yok.") }),
  );

  await signIn(page, "/app/parent");
  await expect(page.getByText("Bu hafta henüz özet yok.")).toBeVisible();
});

test("500 shows the error state and the retry control refetches", async ({ page }) => {
  await mockLogin(page);
  let calls = 0;
  await page.route("**/reports/weekly*", (route) => {
    calls += 1;
    return calls === 1
      ? route.fulfill({ status: 500, body: "boom" })
      : route.fulfill({ json: READY_REPORT });
  });

  await signIn(page, "/app/parent");
  await expect(page.getByText("Rapor alınamadı. Bağlantını kontrol edip tekrar dene.")).toBeVisible();
  await page.getByRole("button", { name: "Tekrar dene" }).click();
  await expect(page.getByText("80", { exact: true })).toBeVisible();
});

test("consent_missing shows the approve button, which approves and renders the report", async ({ page }) => {
  await mockLogin(page);
  let approved = false;
  await page.route("**/reports/weekly*", (route) =>
    approved
      ? route.fulfill({ json: READY_REPORT })
      : route.fulfill({ status: 403, json: apiError("consent_missing", "Veli onayı olmadan bu işlem yapılamaz.") }),
  );
  await page.route("**/consent/parent/approve", async (route) => {
    approved = true;
    await route.fulfill({
      json: { youthId: "usr_deniz", status: "active", approvedAt: new Date().toISOString() },
    });
  });

  await signIn(page, "/app/parent");
  await expect(page.getByText("Veli onayı bekleniyor")).toBeVisible();
  await page.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByText("80", { exact: true })).toBeVisible();
});

/** The three demo youths the teacher reads, at the DESIGN.md persona scores. */
const CLASS_REPORTS: Record<string, unknown> = {
  usr_deniz: READY_REPORT,
  usr_deniz_risky: {
    ...READY_REPORT,
    youthId: "usr_deniz_risky",
    score: { ...READY_REPORT.score, value: 38 },
    distribution: { ...READY_REPORT.distribution, entertainment: 200, harmful: 40 },
  },
  usr_deniz_productive: {
    ...READY_REPORT,
    youthId: "usr_deniz_productive",
    score: { ...READY_REPORT.score, value: 93 },
    task: { ...READY_REPORT.task, status: "completed" },
  },
};

/** Serves each youth its own report; `only` forces one youth to a different outcome. */
async function mockClass(page: Page, only?: { youthId: string; status: number; json: unknown }) {
  await page.route("**/reports/weekly*", (route) => {
    const youthId = new URL(route.request().url()).searchParams.get("youthId") ?? "";
    return youthId === only?.youthId
      ? route.fulfill({ status: only.status, json: only.json })
      : route.fulfill({ json: CLASS_REPORTS[youthId] ?? EMPTY_REPORT });
  });
}

test("teacher sees the class summary, not one child's report", async ({ page }) => {
  await mockLogin(page);
  await mockClass(page);

  await signIn(page, "/app/teacher");
  await expect(page.getByRole("heading", { name: "Sınıf özeti (demo)" })).toBeVisible();
  await expect(page.getByText("Öğretmen")).toBeVisible();

  // (80 + 38 + 93) / 3 = 70, and only the risky youth is under the support band.
  await expect(page.getByText("70", { exact: true })).toBeVisible();
  await expect(page.getByText("sınıf ortalaması")).toBeVisible();
  await expect(page.getByText("Destek gerektiren: 1 / 3 öğrenci")).toBeVisible();

  const roster = page.getByRole("table");
  await expect(roster.getByRole("row", { name: /Riskli.*38.*Destek gerekli/ })).toBeVisible();
  await expect(roster.getByRole("row", { name: /Dengeli.*80.*İyi/ })).toBeVisible();
  await expect(roster.getByRole("row", { name: /Üretken.*93.*İyi.*Tamamlandı/ })).toBeVisible();

  // Harmful minutes in the class pick the media-literacy activity.
  await expect(page.getByText(/medya okuryazarlığı atölyesi/)).toBeVisible();
  await expect(page.getByText("Bu panelde tam bağlantı veya alan adı gösterilmez.")).toBeVisible();

  // Parent-only surfaces stay on the parent panel.
  await expect(page.getByRole("button", { name: "Onayla" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Riskli" })).toHaveCount(0);
  await expect(page.getByText("Birlikte hedef")).toHaveCount(0);
  await expect(page.getByText(READY_REPORT.share_text)).toHaveCount(0);
});

test("a youth still waiting on consent drops out of the class average", async ({ page }) => {
  await mockLogin(page);
  await mockClass(page, {
    youthId: "usr_deniz_risky",
    status: 403,
    json: apiError("consent_missing", "Veli onayı olmadan bu işlem yapılamaz."),
  });

  await signIn(page, "/app/teacher");
  await expect(page.getByRole("table").getByRole("row", { name: /Riskli.*Veli onayı bekliyor/ })).toBeVisible();
  // (80 + 93) / 2 = 87 (rounded), and nobody is left under the support band.
  await expect(page.getByText("87", { exact: true })).toBeVisible();
  await expect(page.getByText("Destek gerektiren: 0 / 3 öğrenci")).toBeVisible();
  await expect(page.getByRole("button", { name: "Onayla" })).toHaveCount(0);
});

test("signing in as the other persona lands on that persona's panel", async ({ page }) => {
  await mockLogin(page);
  await mockClass(page);

  await page.goto("/app/teacher");
  // The submit stays disabled until hydration; picking before that, React resets the select.
  const submit = page.getByRole("button", { name: "Giriş yap" });
  await expect(submit).toBeEnabled();
  await page.getByLabel("Rol").selectOption("ece");
  await submit.click();

  await expect(page).toHaveURL(/\/app\/parent$/);
  await expect(page.getByRole("heading", { name: "Çocuğunun haftası" })).toBeVisible();
  await expect(page.getByText("Veli", { exact: true })).toBeVisible();
});

const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("landing has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).withTags(wcag).analyze();
  expect(violations).toEqual([]);
});

test("privacy has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/privacy");
  const { violations } = await new AxeBuilder({ page }).withTags(wcag).analyze();
  expect(violations).toEqual([]);
});

test("class summary has no WCAG 2.1 AA violations", async ({ page }) => {
  await mockLogin(page);
  await mockClass(page);

  await signIn(page, "/app/teacher");
  await expect(page.getByText("sınıf ortalaması")).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(wcag).analyze();
  expect(violations).toEqual([]);
});

test("ready parent report has no WCAG 2.1 AA violations", async ({ page }) => {
  await mockLogin(page);
  await page.route("**/reports/weekly*", (route) => route.fulfill({ json: READY_REPORT }));

  await signIn(page, "/app/parent");
  await expect(page.getByText("80", { exact: true })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(wcag).analyze();
  expect(violations).toEqual([]);
});
