import type { Coach } from "@nexora/shared";

/**
 * Canned Turkish coach JSON, one entry per score band (docs/building-blocks/04).
 * The jury demo runs with HF_TOKEN unset, so these are the normal path, not an
 * edge case: each entry must pass coachSchema and the policy filter (tested).
 *
 * Language rules (docs/PRIVACY.md "Safety language"): support-suggestion, no
 * diagnosis, no shame, never the word "bağımlılık", no links.
 */
export const COACH_FALLBACKS = {
  /** < 50 — harmful/entertainment dominates the week. */
  low: {
    tips: [
      "Bu hafta ekran süren büyük ölçüde tek bir alanda toplanmış; yarın için 20 dakikalık bir mola planla.",
      "Güvendiğin bir yetişkine bu hafta seni en çok ne zorladığını tek cümleyle anlat.",
      "Küçük bir üretim -bir not, bir çizim, kısa bir kayıt- dengeyi geri getirmeye yardım eder.",
    ],
    task: {
      title: "Kısa bir mola ve bir yetişkinle konuş",
      steps: [
        "Telefonu 20 dakika uzağa bırak.",
        "Güvendiğin bir yetişkine nasıl hissettiğini bir cümleyle söyle.",
        "Yarın için tek bir küçük hedef yaz.",
      ],
      eta_minutes: 20,
    },
    share_text: "Bu hafta kısa bir mola ve bir yetişkinle konuşma görevi seçildi.",
  },
  /** 50–79 — entertainment outweighs the valuable categories. */
  mid: {
    tips: [
      "Eğlence süren dengeyi biraz aşmış; yarın 15 dakikalık bir bilim molası ekle.",
      "Skorunun nedenlerini kendi seçtiğin bir hedefe bağla.",
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
    share_text: "Bu hafta eğlence süresini dengelemek için kısa bir bilim görevi seçildi.",
  },
  /** >= 80 — the week is already balanced; push production over consumption. */
  high: {
    tips: [
      "Dengen iyi görünüyor; bu ritmi bir hafta daha sürdür.",
      "Güçlü olduğun kategoride bir adım öteye geç ve küçük bir şey üret.",
      "Öğrendiğin bir şeyi bir arkadaşına anlatmak, öğrenmeyi pekiştirir.",
    ],
    task: {
      title: "Küçük bir üretim adımı",
      steps: [
        "Bu hafta en çok vakit ayırdığın değerli kategoriyi seç.",
        "20 dakikada küçük bir şey üret: not, çizim ya da kısa bir kayıt.",
        "Ne öğrendiğini iki cümleyle yaz.",
      ],
      eta_minutes: 20,
    },
    share_text: "Bu hafta dengeyi sürdürmek için küçük bir üretim görevi seçildi.",
  },
} satisfies Record<string, Coach>;

/** docs/building-blocks/04 bands: `<50`, `50-79`, `>=80`. */
export const fallbackFor = (value: number): Coach =>
  value < 50 ? COACH_FALLBACKS.low : value < 80 ? COACH_FALLBACKS.mid : COACH_FALLBACKS.high;
