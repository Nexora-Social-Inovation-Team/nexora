import { GENERATED } from "./dictionary.generated.js";

/**
 * Hostname suffix -> CategoryId. A superset of the minimum table in
 * docs/building-blocks/07-extension.md, grouped by category. Suffix match, so
 * one row covers every subdomain. There is deliberately no "harmful" entry:
 * harmful minutes come from the seed, never from a live blocklist.
 */
export const DICTIONARY = {
  // science
  "wikipedia.org": "science",
  "khanacademy.org": "science",
  "tubitak.gov.tr": "science",
  "eba.gov.tr": "science",
  "meb.gov.tr": "science",
  "nasa.gov": "science",
  "arxiv.org": "science",
  "nature.com": "science",
  "scientificamerican.com": "science",
  "nationalgeographic.com": "science",
  "coursera.org": "science",
  "edx.org": "science",
  // Turkish public education and technology programmes. `.gov.tr` as a whole
  // stays out on purpose: e-Devlet and a tax office are not study minutes, and
  // a wrong category inflates the score.
  "btkakademi.gov.tr": "science",
  "btk.gov.tr": "science",
  "yok.gov.tr": "science",
  "osym.gov.tr": "science",
  "tuba.gov.tr": "science",
  "ulakbim.gov.tr": "science",
  "trtakademi.net": "science",
  "teknofest.org": "science",
  "t3kys.com": "science",
  "t3vakfi.org": "science",
  "deneyap.org": "science",
  "dergipark.org.tr": "science",
  // BTK's own media-literacy sites: the thing this product is arguing for.
  "guvenliweb.org.tr": "science",
  "guvenlicocuk.org.tr": "science",
  // Türk Hava Kurumu: gliding and aviation training, not a sports broadcast.
  "thk.org.tr": "science",
  // arts
  "behance.net": "arts",
  "artstation.com": "arts",
  "deviantart.com": "arts",
  "metmuseum.org": "arts",
  "moma.org": "arts",
  "louvre.fr": "arts",
  "istanbulmodern.org": "arts",
  "sakipsabancimuzesi.org": "arts",
  "goodreads.com": "arts",
  // sports
  "tff.org": "sports",
  "trtspor.com.tr": "sports",
  "ntvspor.net": "sports",
  "sporx.com": "sports",
  "fanatik.com.tr": "sports",
  "beinsports.com.tr": "sports",
  "gsb.gov.tr": "sports",
  "olympics.com": "sports",
  "uefa.com": "sports",
  "fifa.com": "sports",
  "espn.com": "sports",
  // culture
  "kultur.gov.tr": "culture",
  "kulturportali.gov.tr": "culture",
  "muze.gov.tr": "culture",
  "tdk.gov.tr": "culture",
  // TDK's dictionaries live on their own domain, not under tdk.gov.tr.
  "sozluk.gov.tr": "culture",
  "ktb.gov.tr": "culture",
  "kutuphane.gov.tr": "culture",
  "sanalmuze.gov.tr": "culture",
  "islamansiklopedisi.org.tr": "culture",
  "ayk.gov.tr": "culture",
  "akmb.gov.tr": "culture",
  "yee.org.tr": "culture",
  "unesco.org": "culture",
  // entrepreneurship
  "kosgeb.gov.tr": "entrepreneurship",
  "sanayi.gov.tr": "entrepreneurship",
  "turkpatent.gov.tr": "entrepreneurship",
  "webrazzi.com": "entrepreneurship",
  "techcrunch.com": "entrepreneurship",
  "ycombinator.com": "entrepreneurship",
  "forbes.com": "entrepreneurship",
  "bloomberght.com": "entrepreneurship",
  "investopedia.com": "entrepreneurship",
  "linkedin.com": "entrepreneurship",
  // national_memory
  "ttk.gov.tr": "national_memory",
  "atam.gov.tr": "national_memory",
  "devletarsivleri.gov.tr": "national_memory",
  "millisaraylar.gov.tr": "national_memory",
  "millikutuphane.gov.tr": "national_memory",
  "tbmm.gov.tr": "national_memory",
  // entertainment
  "youtube.com": "entertainment",
  "instagram.com": "entertainment",
  "tiktok.com": "entertainment",
  "x.com": "entertainment",
  "twitter.com": "entertainment",
  "facebook.com": "entertainment",
  "snapchat.com": "entertainment",
  "reddit.com": "entertainment",
  "pinterest.com": "entertainment",
  "discord.com": "entertainment",
  "twitch.tv": "entertainment",
  "netflix.com": "entertainment",
  "disneyplus.com": "entertainment",
  "blutv.com": "entertainment",
  "trtizle.com": "entertainment",
  "tabii.com": "entertainment",
  "exxen.com": "entertainment",
  "spotify.com": "entertainment",
  "roblox.com": "entertainment",
  "steampowered.com": "entertainment",
  "9gag.com": "entertainment",
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

/**
 * Registry-controlled suffixes, matched only after the dictionary misses. Nobody
 * can register a .edu or .museum host for something else, so the whole long tail
 * of schools and museums counts without a row each. Keyword matching on
 * arbitrary hosts ("spor", "muze") stays out: it would hand category minutes to
 * any squatter, and a wrong category inflates the score.
 */
const TLD_RULES = [
  [".edu", "science"],
  [".edu.tr", "science"],
  [".k12.tr", "science"],
  [".ac.uk", "science"],
  [".museum", "culture"],
];

/** hostname -> CategoryId, or null for an unknown host (unknown is ignored, never guessed). */
export function categorize(hostname) {
  if (!hostname) return null;
  const host = hostname.toLowerCase();
  const labels = host.split(".");
  /*
   * Walk the host from the left, so www.a.sports.example asks for the full host
   * first and a bare TLD never. Two object hits per step beat scanning 11k rows,
   * and the typeof guard keeps an inherited key ("constructor") from matching.
   */
  for (let i = 0; i < labels.length - 1; i++) {
    const suffix = labels.slice(i).join(".");
    const hit = DICTIONARY[suffix] ?? GENERATED[suffix];
    if (typeof hit === "string") return hit;
  }
  for (const [suffix, category] of TLD_RULES) {
    if (host.endsWith(suffix)) return category;
  }
  return null;
}
