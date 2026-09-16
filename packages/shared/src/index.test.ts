import { describe, expect, it } from "vitest";
import { coachSchema, findForbiddenKey, signalsRequestSchema } from "./index";

// docs/API.md GET /coach/recommendation example
const coachExample = {
  tips: [
    "Bu hafta eğlence süren yüksek; yarın 15 dakikalık bir bilim videosu seç.",
    "Skorunun nedenlerini kendin seçtiğin bir hedefe bağla.",
    "Ürettiğin kısa bir içerik, tüketimi dengeler.",
  ],
  task: {
    title: "15 dakikalık bilim molası",
    steps: [
      "İlgini çeken bir bilim konusunu seç.",
      "15 dakika boyunca yalnızca o konuya bak.",
      "Bir cümleyle ne öğrendiğini yaz.",
    ],
    eta_minutes: 15,
  },
  share_text: "Deniz bu hafta eğlence süresini dengelemek için kısa bir bilim görevi seçti.",
};

describe("coachSchema", () => {
  it("accepts the docs/API.md example", () => {
    expect(coachSchema.parse(coachExample)).toEqual(coachExample);
  });

  it("rejects 2 tips", () => {
    expect(coachSchema.safeParse({ ...coachExample, tips: coachExample.tips.slice(0, 2) }).success).toBe(false);
  });

  it("rejects eta_minutes 0", () => {
    const bad = { ...coachExample, task: { ...coachExample.task, eta_minutes: 0 } };
    expect(coachSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects extra keys", () => {
    expect(coachSchema.safeParse({ ...coachExample, url: "https://x.example" }).success).toBe(false);
  });
});

describe("signalsRequestSchema", () => {
  const valid = {
    period: "2026-09-08/2026-09-15",
    minutes: { science: 40, entertainment: 120, harmful: 0 },
  };

  it("accepts a category-minutes body", () => {
    expect(signalsRequestSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a top-level url key", () => {
    expect(signalsRequestSchema.safeParse({ ...valid, url: "https://x.example" }).success).toBe(false);
  });

  it("rejects a url key nested in minutes", () => {
    const bad = { ...valid, minutes: { ...valid.minutes, url: "https://x.example" } };
    expect(signalsRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown minute keys", () => {
    expect(signalsRequestSchema.safeParse({ ...valid, minutes: { gaming: 10 } }).success).toBe(false);
  });

  it("rejects negative minutes", () => {
    expect(signalsRequestSchema.safeParse({ ...valid, minutes: { science: -1 } }).success).toBe(false);
  });

  it("rejects a malformed period", () => {
    expect(signalsRequestSchema.safeParse({ ...valid, period: "2026-09-08" }).success).toBe(false);
  });
});

describe("findForbiddenKey", () => {
  it("finds a nested hostname", () => {
    expect(findForbiddenKey({ period: "x", meta: { visits: [{ hostname: "youtube.com" }] } })).toBe("hostname");
  });

  it("returns null for a clean summary body", () => {
    expect(findForbiddenKey({ period: "2026-09-08/2026-09-15", minutes: { science: 40 } })).toBeNull();
  });
});
