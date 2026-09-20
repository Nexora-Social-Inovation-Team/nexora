# Design — IA, screens, copy, UX principles

Visual exploration is out of scope for this file. This is the contract for UI structure, states, and Turkish copy. Personas: [`PRODUCT.md`](PRODUCT.md).

## Principles

1. **Youth first.** Mobile, 1–3 minute tasks, one idea per screen, light and high-contrast.
2. **Score is a mirror, not a grade.** No traffic-light “iyi/kötü çocuk”. Prefer a 0–100 number + three plain-language reasons.
3. **Privacy is visible.** Critical screens show that raw URLs are not collected.
4. **Non-judgmental, non-diagnostic.** High `harmful` share → support language, not a verdict.
5. **Short Turkish.** No academic paragraphs on youth screens. Parents get “ne oldu?” + “birlikte ne yapabiliriz?”
6. **WCAG 2.1 AA** on critical flows: 4.5:1 contrast, keyboard, labels, 200% zoom, focus visible.
7. **One happy path + empty + error.** Do not design extra dashboards for MVP.

## Youth journey (Expo)

Join → wait for parent → first analysis → score explanation → micro-task → complete → badge → optional share.

```mermaid
flowchart TD
  S1[1 Onboarding] --> S2[2 Veli onayı bekleniyor]
  S2 -->|status=active| S3[3 Analiz ve skor]
  S3 --> S4[4 Koç ve mikro-görev]
  S4 --> S5[5 Görev tamamlandı ve rozet]
  S2 -->|consent_missing| S2
  S3 -->|no_data| S3e[Empty: henüz özet yok]
  S3 -->|network| S3err[Error + retry]
```

## Expo screens (MVP)

### 1. Onboarding / katılım (mock)

- Wordmark NEXORA.
- One sentence: what the app does.
- Primary: “Katıl”.
- Secondary link: “Verilerim nasıl kullanılır?” → privacy snippet, not a legal novel.
- Demo: no real email/password. Persona login via debug switch (below).

Copy:

- Title: `NEXORA`
- Sub: `Sosyal medyayı ölç, anla, küçük bir adım at.`
- CTA: `Katıl`
- Privacy line: `Ham bağlantı, mesaj veya arama kaydı toplanmaz.`

### 2. Veli onayı bekleniyor

Shown while `status === pending_parent_consent`.

- Explain that the account is not active.
- What the parent will see: category trends, not history.
- No score yet.

Copy:

- Title: `Veli onayı bekleniyor`
- Body: `Hesabın, bir veli onaylayana kadar açılmaz. Veli yalnızca kategori özetlerini görür; tam bağlantı yok.`
- Hint (demo): `Jüri demosu: web panelinden Ece olarak onayla.`

### 3. Analiz ve skor

- Large score `value` (0–100).
- Exactly three `reasons`.
- Mini distribution (8 categories, bars or stacked — keep readable at phone width).
- KVKK line again.
- States: `loading` / `empty` / `error` / `ready`.

Empty: `Henüz kategori özeti yok. Eklenti özet gönderince veya demo verisi yüklenince skorun burada olur.`

Error `consent_missing`: return to screen 2.

Copy (ready header): `Bu haftaki dengen`

Do not color the whole screen red/green from the score. Reasons carry the meaning.

### 4. Koç önerileri + mikro-görev

- 3 tips (short cards).
- 1 task: title, steps, `eta_minutes`.
- Primary CTA: `Görevi tamamladım`.
- Language: actionable, second person, no shame.

### 5. Görev tamamlandı + rozet

- Badge `degerli_adim` (MVP: one badge is enough).
- Optional `share_text` preview (“Velinle paylaşılacak özet”).
- CTA: `Panele yansısın` (informational — completing the task is the API call).

### Demo persona switch

Hidden: long-press wordmark **or** `__DEV__` menu.

Options: `Dengeli` / `Riskli` / `Üretken` → login as `deniz_balanced` | `deniz_risky` | `deniz_productive` and load that seed (see below). Three personas must yield **different** scores and coach tips.

### Expo UI states (all data screens)

| State | UI |
|---|---|
| `loading` | Skeleton, not a spinner-only blank |
| `empty` | Short explanation + what to do next |
| `error` | Message + retry. No raw exception |
| `ready` | Content |

## Web IA

### Public (marketing)

| Route | Purpose |
|---|---|
| `/` | Landing |
| `/how-it-works` | 4-step loop + report screenshot placeholder |
| `/privacy` | Collected vs never + consent/revoke |
| `/faq` | 3–5 questions |

### App (after demo login)

| Route | Role |
|---|---|
| `/app/parent` | Veli weekly report |
| `/app/teacher` | Öğretmen weekly report (MVP: same report chrome, class label) |
| `/app/admin` | Optional — consent list only if time |

### Layouts

- **Public:** Header (logo, nav: Nasıl çalışır, Gizlilik, SSS, Giriş) + Footer (KVKK links).
- **App:** AppShell — left nav (Rapor, Gizlilik, Çıkış) + main. Parent vs teacher: role badge.

## Web page copy (MVP)

### Landing `/`

Hero:

- Title: `Ölç → Anla → Koçla → Üret`
- Sub: `13–18 yaş için yerli sosyal yapay zekâ. Yasaklamadan, yargılamadan.`
- Trust: `Ham URL yok. Mesaj yok. Arama kaydı yok.` — now in the navy announcement
  strip above the nav, so it shows on every public page instead of the hero only.
- CTA: `Nasıl çalışır?` → `/how-it-works`. Secondary: `Veli paneli (demo)` → login.

Three cards, under eyebrow `ROLLER` + heading `Kim ne görür?`:

1. **Genç** — `Kısa skor, kısa görev, görünür üretim.`
2. **Veli** — `Kategori eğilimleri ve birlikte hedef. Geçmiş dökümü yok.`
3. **Öğretmen** — `Sınıf özeti dakikalar içinde.`

### How it works `/how-it-works`

Four steps matching the loop. One placeholder frame: “örnek haftalık rapor”.

### Privacy `/privacy`

Table: collected vs never (from [`PRIVACY.md`](PRIVACY.md), Turkish labels). Sections: veli onayı, geri çekme (30 gün), “tanı koymaz”.

### FAQ `/faq`

- `Şifrelerinizi istiyor musunuz?` → `Hayır.`
- `Ham içerik okunuyor mu?` → `Hayır. Yalnızca izinli kategori dakikaları.`
- `Kim neyi görür?` → `Genç kendi özetini; veli/öğretmen toplu kategorileri. Tam bağlantı yok.`
- `Ruh sağlığı tanısı koyuyor mu?` → `Hayır. Risk dilinde destek önerisi vardır.`

### Parent panel `/app/parent`

- Demo persona picker for the linked youth (dengeli / riskli / üretken) so the jury can switch without re-seeding by hand.
- Weekly report: score, 3 reasons, distribution, trend (2 points is enough), current task status, `share_text`.
- The score is never a bare number: band chip (`Destek gerekli` `<50` / `İzlenmeli` `50–79` / `İyi` `≥80`) and one plain sentence saying what it means, without diagnosing.
- Trend is a sentence, not two wire periods: `Geçen haftaya göre 22 puan arttı (58 → 80).` One week only → `Karşılaştırma için ikinci bir haftaya ihtiyaç var.`
- Distribution leads with the busiest category and carries a total in hours (`Toplam: 3 sa 30 dk`); zeros fall to the bottom by themselves.
- Periods read in Turkish — `Dönem: 8–15 Eylül 2026`, never `2026-09-08/2026-09-15`.
- Lightweight shared-goal suggestion: one sentence, not a full goal module.
- Empty: `Bu hafta henüz özet yok.`
- Error: retry.
- KVKK strip: `Bu panelde tam bağlantı veya alan adı gösterilmez.`

### Teacher panel `/app/teacher`

Not the parent report with a different header — the teacher's default view is the
aggregated class insight `PRODUCT.md` promises. Header: `Sınıf özeti (demo)`.

- Class week card: average score over the students who have a week, `Destek gerektiren: 1 / 3 öğrenci`, period.
- Class category distribution: the same bars as the parent panel, minutes summed across the class.
- Roster: one compact row per demo student — label (`Dengeli` / `Riskli` / `Üretken`), score, band (`Destek gerekli` `<50` / `İzlenmeli` `50–79` / `İyi` `≥80`), task status. A student still waiting on consent shows `Veli onayı bekliyor` and is left out of the average.
- One class activity line, picked from the class distribution (media literacy when harmful minutes exist).
- Empty: `Bu hafta sınıf için henüz özet yok.` Error: retry.
- KVKK strip, same as the parent panel.

No youth switcher, no `share_text`, no `Birlikte hedef` — those are parent copy.
The class is the three demo youths; **do not build a 50-row student table**, no
student names, no hostnames. Read via `GET /reports/weekly?youthId=` once per
student — no class endpoint in Phase A.

## Visual tokens

Measured off [calendly.com](https://www.a1.gallery/website/calendly) via a1.gallery
(`get_website_sections` → `designTokens`) and applied verbatim in
`apps/web/src/styles.css`, `apps/mobile/src/ui.tsx` and the two extension pages.
This replaces the earlier dark chartreuse starter palette.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FCFBF8` | Page background (all apps, light) |
| `--band` | `#F1EFE9` | Beige hero / section band, chart tracks, skeletons |
| `--surface` | `#FFFFFF` | Cards — always on a `--line` border |
| `--line` | `#E4E0D8` | Hairline borders and dividers (non-text) |
| `--tint` | `#E7EEFB` | Light-blue pill and panel surface, 14:1 with `--text` |
| `--text` | `#071A31` | Navy ink, 16:1 on `--bg` |
| `--muted` | `#4D5F74` | Secondary text, 6.3:1 on `--bg` |
| `--accent` | `#071A31` | Primary CTA fill; `--bg` as its text is 16:1 |
| `--link` | `#0B5FD0` | Links, focus ring, chart fills, 5.8:1 on `--surface` |
| `--warn` | `#8A5A00` | Support suggestion, not alarm, 5.9:1 on `--surface` |
| `--danger` | `#B3261E` | Errors only, never score, 6.5:1 on `--surface` |
| `--font-display` | Geist 600, `-0.033em`, `line-height: 1.1` | Headings and wordmark |
| `--font-ui` | Geist 400 | Body |

### Brand ramp (decorative only)

Sampled off `brand/nexora-logo.jpg`, the logo artwork. The mark is neon on
near-black; the product is not, and the light palette above does not move. These
five carry **no text anywhere** — the measured ratios against `--bg` are why.

| Token | Value | On `--bg` | Use |
|---|---|---|---|
| `--brand-cyan` | `#0DFCFF` | 1.2:1 | Gradient stop only |
| `--brand-blue` | `#0171FD` | 4.2:1 | Large non-text: badge star, ring segment |
| `--brand-violet` | `#975EF9` | 3.8:1 | Large non-text: ring segment, sparks |
| `--brand-magenta` | `#FB2CFE` | 2.9:1 | Gradient stop only |
| `--brand-orange` | `#FF8E5B` | 2.2:1 | Gradient stop only |
| `--brand-ground` | `#030214` | — | The badge interior; icon and splash background |

`--brand-ramp` composes the five left to right. It appears in exactly three
places: a 3px hairline under the web header, the Expo score ring, and the badge
on screen 5. The score ring has no gradient border — React Native has no such
thing and `expo-linear-gradient` would be a dependency for one circle — so it
takes four of the stops as its four border sides, which reads as the sweep at
160px.

`--link` stays `#0B5FD0` at 5.7:1. The logo blue is 4.2:1 and would have failed
AA for body text, so the brand did not get to reassign it.

### Logo

`brand/nexora-logo.jpg` is the source of truth. Every icon is generated:

```
python scripts/build-brand-assets.py
```

It writes the web favicon and apple-touch icon, the Expo icon, adaptive icon,
splash and web favicon, and the four extension icons. Below about 128px the
wordmark and tagline in the badge turn to mush, so anything small is cropped to
the N mark — the script finds that crop from the artwork rather than hard-coding
it, and pads it onto a square of `--brand-ground` so the wordmark below cannot
creep into frame. Do not hand-edit the generated files; replace the source and
re-run.

Weights: 600 for headings — a1 measured 500 off the footer section, but the hero
and section headings on the reference pages are visibly heavier; the footer
statement is the one place that stays at 500. Body copy is 14–16px on a narrow
measure (`max-w-md` for hero sub, `max-w-2xl` for prose) at `line-height: 1.6`.
The size contrast between a 60px heading and 14px body is what makes the
reference read editorial, so do not grow the body to match the heading.

Shapes, also measured: cards `rounded-2xl` on a 1px `--line` border, bands and the
footer block `rounded-3xl`, buttons `rounded-lg`, no shadows. The one gradient is
the blue product panel in the hero.

Public page composition, in reference order: navy announcement strip carrying the
KVKK line, nav with mark + wordmark + one filled pill, an inset beige band
(`mx-2 rounded-3xl`) holding the heading block and the product frame, then
full-bleed sections whose content sits in the 1352px container, then the navy
footer block with one oversized statement. Sub-pages use the same band via
`PageHeader`. A small uppercase letterspaced eyebrow sits above section headings,
not above the hero heading.

The "örnek haftalık rapor" frame is markup (`apps/web/src/preview.tsx`), not a
screenshot, and uses the `deniz_balanced` seed numbers so it cannot drift from
the demo. It is `aria-hidden` and every caller captions it.

Geist loads from Google Fonts on web and falls back to `system-ui` offline. Expo
uses the platform grotesque — Geist there needs `expo-font` plus a bundled asset,
which Phase A skips.

Youth score ring uses `--accent` at any value. Reasons, not colour, encode
"needs attention". Public marketing and the app share one palette; do not
introduce a second brand.

Mobile adapts this composition with a persistent privacy strip, compact wordmark
and cream heading panels. The score sits on a blue panel; explanations use
numbered rows and category labels sit above their bars so long Turkish labels fit
narrow screens. Coach tasks and the earned badge share the blue treatment. Native
fonts remain platform defaults.

The youth screens carry **no decorative layer**: no per-screen illustration, no
Ölç / Anla / Koçla / Üret progress rail, no repeated slogan footer. A phone
screen held roughly fourteen blocks of which four carried information, and the
chrome was read as clutter. What is left is the heading, the data, and one
action. The score screen lists only the categories the week actually used,
busiest first, and counts the rest in one line — eight rows of which several read
`0 dk` is noise, not a distribution. The privacy strip, the support-language
line, the empty and error states and every accessibility label stay exactly as
they were; only decoration was removed.

The extension popup and options page share `apps/extension/ui.css`: cream summary
panel, white category card, navy controls, and blue privacy note. The popup shows
the live category-minute total and an explicit paused/counting label. Both panels
keep the orbit/card illustration; mobile dropped its copy (above), so the shared
language is now the palette and the panel treatment rather than the artwork. Settings remain a single keyboard-submittable form, linked
directly from the popup.

## Demo seeds (minutes → distinct scores)

Use these exact minutes so UI, API, and jury script agree. Formula: [`ARCHITECTURE.md`](ARCHITECTURE.md).

| Persona | science | arts | sports | culture | entrepreneurship | national_memory | entertainment | harmful | expected score band |
|---|---|---|---|---|---|---|---|---|---|
| `deniz_balanced` | 40 | 15 | 20 | 10 | 0 | 5 | 120 | 0 | ~80 |
| `deniz_risky` | 10 | 0 | 0 | 0 | 0 | 0 | 200 | 40 | ~38 |
| `deniz_productive` | 70 | 20 | 20 | 15 | 0 | 0 | 40 | 0 | ~93 |

Coach fallback (if HF is down) must still **differ by persona** using canned maps keyed by persona or by score band (`<50`, `50–79`, `≥80`).

## Accessibility checklist (critical screens)

- All icon-only controls have `aria-label`.
- Score value is text, not color-only.
- Forms (demo login, consent button) are keyboard operable.
- Focus visible on dark background.
- Privacy table on `/privacy` is a real `<table>` or definition list, not a screenshot.

## Out of design scope (MVP)

- Full design system documentation site.
- Illustration set, lottie onboarding, gamified map.
- Native share-to-Instagram stories.
- Teacher seating-chart visualization.
