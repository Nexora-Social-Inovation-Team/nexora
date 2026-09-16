import { CATEGORY_IDS, VALUABLE_CATEGORIES, type CategoryMinutes, type Score } from "@nexora/shared";

/**
 * Feed Health Score v0.5 — docs/ARCHITECTURE.md "Score v0.5".
 * Rules only: no ML, no LLM, no I/O. Every number here is explainable to a
 * 13–18 year old, and every reason string is Turkish and non-diagnostic.
 */

/** `total === 0` means there is nothing to score. The API maps it to 404 `no_data`. */
export class NoScoreDataError extends Error {
  constructor() {
    super("computeScore: no minutes to score");
    // Name, not just the class: bun's isolated linker can hand two callers
    // different copies of a module, which breaks `instanceof`.
    this.name = "NoScoreDataError";
  }
}

/** Reason table, in docs/ARCHITECTURE.md order. Byte-identical to the doc. */
const REASON = {
  harmful: "Zararlı veya manipülatif kategoride süre var; bunu bir yetişkinle konuşmak iyi olabilir.",
  entertainment: "Eğlence kategorisi sürenin çoğunu kaplıyor.",
  valuable: "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
  diverse: "Birden fazla değerli kategoride zaman geçirmişsin.",
  narrow: "Kategori çeşitliliğin düşük; kısa bir keşif görevi dene.",
  clean: "Zararlı/manipülatif kategoride süre görünmüyor.",
} as const;

/** Padding so `reasons` is always exactly 3 (docs/ARCHITECTURE.md row 7). */
const FILLERS = [
  // Doc typo "dengenı" fixed to "dengeni"; the rest is verbatim.
  "Skor, yasaklamak için değil; kendi dengeni görmen için.",
  "Küçük bir görev, haftalık dengeyi değiştirebilir.",
];

export function computeScore(minutes: CategoryMinutes): Score {
  const at = (id: (typeof CATEGORY_IDS)[number]) => minutes[id] ?? 0;
  const total = CATEGORY_IDS.reduce((sum, id) => sum + at(id), 0);
  if (total === 0) throw new NoScoreDataError();

  const valuableShare = VALUABLE_CATEGORIES.reduce((sum, id) => sum + at(id), 0) / total;
  const harmfulShare = at("harmful") / total;
  const entertainmentShare = at("entertainment") / total;
  const diversity = VALUABLE_CATEGORIES.filter((id) => at(id) >= 10).length;

  // Each term is also a reason candidate's weight, so they are named once.
  const valuableBonus = 30 * valuableShare;
  const diversityBonus = 5 * diversity;
  const harmfulPenalty = 40 * harmfulShare;
  const entertainmentPenalty = (20 * Math.max(0, entertainmentShare - 0.5)) / 0.5;

  const value = Math.round(
    Math.min(100, Math.max(0, 50 + valuableBonus + diversityBonus - harmfulPenalty - entertainmentPenalty)),
  );

  // Candidates in table order; ranked by absolute contribution, then re-emitted
  // in table order so the copy always reads the same way.
  const candidates = [
    harmfulShare >= 0.05 ? { text: REASON.harmful, weight: harmfulPenalty } : null,
    entertainmentShare >= 0.5 ? { text: REASON.entertainment, weight: entertainmentPenalty } : null,
    valuableShare >= 0.35 ? { text: REASON.valuable, weight: valuableBonus } : null,
    diversity >= 3 ? { text: REASON.diverse, weight: diversityBonus } : null,
    diversity <= 1 ? { text: REASON.narrow, weight: diversityBonus } : null,
    harmfulShare === 0 ? { text: REASON.clean, weight: 0 } : null,
  ].filter((candidate) => candidate !== null);

  const top = [...candidates]
    .sort((a, b) => b.weight - a.weight) // stable: ties keep table order
    .slice(0, 3)
    .sort((a, b) => candidates.indexOf(a) - candidates.indexOf(b))
    .map((candidate) => candidate.text);

  // Shares sum to 1, so at least one of the first three rows always fires:
  // one candidate plus two fillers is always enough to reach 3.
  const reasons = [...top, ...FILLERS].slice(0, 3);

  return { value, reasons };
}
