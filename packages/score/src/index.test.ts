import type { CategoryMinutes } from "@nexora/shared";
import { describe, expect, it } from "vitest";
import { NoScoreDataError, computeScore } from "./index";

/** docs/DESIGN.md persona seed table. */
const BALANCED: CategoryMinutes = {
  science: 40,
  arts: 15,
  sports: 20,
  culture: 10,
  entrepreneurship: 0,
  national_memory: 5,
  entertainment: 120,
  harmful: 0,
};
const RISKY: CategoryMinutes = {
  science: 10,
  arts: 0,
  sports: 0,
  culture: 0,
  entrepreneurship: 0,
  national_memory: 0,
  entertainment: 200,
  harmful: 40,
};
const PRODUCTIVE: CategoryMinutes = {
  science: 70,
  arts: 20,
  sports: 20,
  culture: 15,
  entrepreneurship: 0,
  national_memory: 0,
  entertainment: 40,
  harmful: 0,
};

describe("computeScore value", () => {
  // Exact, not a band: the formula in docs/ARCHITECTURE.md is deterministic.
  it("scores the balanced persona 80", () => {
    expect(computeScore(BALANCED).value).toBe(80);
  });

  it("scores the risky persona 38", () => {
    expect(computeScore(RISKY).value).toBe(38);
  });

  it("scores the productive persona 93", () => {
    expect(computeScore(PRODUCTIVE).value).toBe(93);
  });

  it("stays inside 0..100 for an all-harmful week", () => {
    const { value } = computeScore({ harmful: 600 });
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });
});

describe("computeScore no-data path", () => {
  it("throws NoScoreDataError for an empty body", () => {
    expect(() => computeScore({})).toThrow(NoScoreDataError);
  });

  it("throws NoScoreDataError when every category is zero", () => {
    expect(() =>
      computeScore({
        science: 0,
        arts: 0,
        sports: 0,
        culture: 0,
        entrepreneurship: 0,
        national_memory: 0,
        entertainment: 0,
        harmful: 0,
      }),
    ).toThrow(NoScoreDataError);
  });

  it("names the error so the API can map it to no_data across module copies", () => {
    expect(() => computeScore({})).toThrow(expect.objectContaining({ name: "NoScoreDataError" }));
  });
});

describe("computeScore reasons", () => {
  const cases: [string, CategoryMinutes][] = [
    ["balanced", BALANCED],
    ["risky", RISKY],
    ["productive", PRODUCTIVE],
    ["single category", { entertainment: 10 }],
    ["low harmful share, diversity 2", { science: 10, arts: 10, entertainment: 79, harmful: 1 }],
  ];

  it.each(cases)("gives %s exactly 3 non-empty Turkish reasons", (_name, minutes) => {
    const { reasons } = computeScore(minutes);

    expect(reasons).toHaveLength(3);
    for (const reason of reasons) {
      expect(reason.trim().length).toBeGreaterThan(0);
      // No English category id leaks into youth-facing copy.
      expect(reason.toLowerCase()).not.toMatch(
        /entertainment|harmful|science|arts|sports|culture|entrepreneurship|national_memory/,
      );
    }
  });

  it.each(cases)("never diagnoses %s", (_name, minutes) => {
    for (const reason of computeScore(minutes).reasons) {
      expect(reason.toLowerCase()).not.toMatch(/bağımlı|kötü çocuk|hasta/);
    }
  });

  // docs/API.md POST /signals/category-summary response example, byte for byte.
  it("matches the docs/API.md example reasons for the balanced persona", () => {
    expect(computeScore(BALANCED).reasons).toEqual([
      "Eğlence kategorisi sürenin çoğunu kaplıyor.",
      "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
      "Birden fazla değerli kategoride zaman geçirmişsin.",
    ]);
  });

  it("leads with the support-language reason when harmful time exists", () => {
    expect(computeScore(RISKY).reasons[0]).toBe(
      "Zararlı veya manipülatif kategoride süre var; bunu bir yetişkinle konuşmak iyi olabilir.",
    );
  });

  it("pads with fillers when fewer than three rules fire", () => {
    const { reasons } = computeScore({ science: 10, arts: 10, entertainment: 79, harmful: 1 });

    expect(reasons).toEqual([
      "Eğlence kategorisi sürenin çoğunu kaplıyor.",
      "Skor, yasaklamak için değil; kendi dengeni görmen için.",
      "Küçük bir görev, haftalık dengeyi değiştirebilir.",
    ]);
  });
});
