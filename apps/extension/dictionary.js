/**
 * Hostname suffix -> CategoryId. Exactly the six rows of
 * docs/building-blocks/07-extension.md. There is deliberately no "harmful"
 * entry: harmful minutes come from the seed, never from a live blocklist.
 */
export const DICTIONARY = {
  "wikipedia.org": "science",
  "khanacademy.org": "science",
  "youtube.com": "entertainment",
  "instagram.com": "entertainment",
  "tiktok.com": "entertainment",
  "kultur.gov.tr": "culture",
};

/** Turkish labels; core.test.js asserts they still equal CATEGORY_LABELS_TR in @nexora/shared. */
export const LABELS_TR = {
  science: "Bilim",
  arts: "Sanat",
  sports: "Spor",
  culture: "Kültür",
  entrepreneurship: "Girişimcilik",
  national_memory: "Millî hafıza",
  entertainment: "Eğlence",
  harmful: "Zararlı / manipülatif",
};

/** hostname -> CategoryId, or null for an unknown host (unknown is ignored, never guessed). */
export function categorize(hostname) {
  if (!hostname) return null;
  const host = hostname.toLowerCase();
  for (const [suffix, category] of Object.entries(DICTIONARY)) {
    if (host === suffix || host.endsWith("." + suffix)) return category;
  }
  return null;
}
