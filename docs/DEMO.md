# Demo runbook — jury script (5–7 minutes)

Block [`building-blocks/08-demo-seed.md`](building-blocks/08-demo-seed.md), made runnable. Prose is
English; every string in quotes is what is literally on the screen, in Turkish. Somebody who has
never seen this repository should be able to run the demo from this page alone.

## What the jury sees

Three surfaces, in the order the product actually works: **extension → web → phone.**

The browser extension counts **category minutes** on device — Turkish category names, a bar each,
and nowhere a URL, because no URL is ever stored. It tries to send, and the API refuses: the youth's
account is closed until a parent opens it. His mother opens the web panel, reads the same sentence,
and presses one button. The same minutes now turn into a 0–100 score with three plain Turkish
reasons. Her panel shows one child's week; the teacher's panel, the same data one level up, shows a
class average and who needs support — and neither of them can see a link. On the phone the youth
gets three coaching tips and one short task, completes it, earns a badge, and the task flips to
`"Tamamlandı"` on his mother's panel. Then the privacy page shows what was never collected.

Measure → understand → coach → produce, with the consent gate standing in the middle of it.

## Before the room

```bash
cp .env.example .env                        # DATABASE_URL, DIRECT_URL, SESSION_SECRET
bun install
bun run --filter nexora-api db:generate     # mandatory on a fresh checkout
bun run --filter nexora-api db:migrate      # prisma migrate deploy
bun run --filter nexora-api db:seed         # the demo reset, see the table below
```

`HF_TOKEN` and `HF_MODEL_ID` may stay empty. The coach then answers from its canned Turkish
fallback, which is a supported path, not a failure — see the drills.

Three terminals (`bun run dev` starts all three through Turborepo at once, but one window per
process is far easier to steer on stage):

```bash
bun run --filter nexora-api dev       # API      http://localhost:3000
bun run --filter nexora-web dev       # web      http://localhost:5173
bun run --filter nexora-mobile start  # Expo     http://localhost:8081
```

Keep a fourth terminal free for `bun run demo:ingest-balanced` at beat 4.

The extension opens the demo, so load it **before** the room — it cannot be done on stage:

```bash
# 1. chrome://extensions → Developer mode → Load unpacked → apps/extension
# 2. a bearer token for Deniz, pasted into the extension's Options page:
curl -s -X POST http://localhost:3000/auth/login   -H "content-type: application/json" -d '{"persona":"deniz"}'
```

On Windows PowerShell, `curl` is an alias for `Invoke-WebRequest` and the flags above are a syntax
error. Use this instead — it puts the token straight on the clipboard, ready to paste into Options:

```powershell
(Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/login" `
  -ContentType "application/json" -Body '{"persona":"deniz"}').token | Set-Clipboard
```

That token is Deniz's own — the summary endpoint is self-only, so Ece's or Mert's token is refused.
It is good for **seven days**, so mint it the night before; it survives reloading the unpacked
extension, because `apiBase` and `token` sit in `chrome.storage.sync`.

Then browse for two or three minutes on a few mapped sites (a news site, YouTube, a science page) so
the popup has something to show. `"Henüz kategori dakikası yok."` on stage is a flat opening.

Then prove the API is really talking to Neon:

```bash
curl -s http://localhost:3000/health
# {"ok":true,"db":true}
```

`503` with `"db": false` means Neon is unreachable. Fix that before anything else: every beat after
the landing page needs the database.

## State after `db:seed`

| User | Login persona | Status | Weeks stored | Score trend |
|---|---|---|---|---|
| `usr_deniz` — Deniz | `deniz` (alias of `deniz_balanced`) | `pending_parent_consent` | none | — |
| `usr_deniz_risky` — Deniz (Riskli) | `deniz_risky` | `active` | 2026-09-01/08 + 2026-09-08/15 | 80 → **38** |
| `usr_deniz_productive` — Deniz (Üretken) | `deniz_productive` | `active` | 2026-09-01/08 + 2026-09-08/15 | 80 → **93** |
| `usr_ece` — Ece (veli) | `ece` | `active` | parent of all three youths | — |
| `usr_mert` — Mert (öğretmen) | `mert` | `active` | — | — |
| `usr_selin` — Selin (yönetici) | `selin` | `active` | — | — |

Neither switcher persona has a task or a coach row, so their panels correctly read
`"Bu hafta için görev yok."` Only Deniz gets a task, and only after beat 3.

The seed prints exactly that state back from the database when it finishes. Run it twice: the lines
are identical. That read-back is both the idempotency proof and your pre-demo check.

> **`db:seed` is a reset, not a top-up.** It puts Deniz back to `pending_parent_consent` and deletes
> every summary, score, task, coach recommendation, consent event and deletion request belonging to
> the three youths. **Never run it mid-demo** — it silently undoes the live approval the jury just
> watched, and the panel drops back to the waiting state.

## The nine beats

| Time | Surface | Do | Point at (exact string) |
|---|---|---|---|
| **0:00** | Extension popup | Open it. Let the bars speak, then press `"Şimdi gönder"`. | `"Kategori özeti"`, the Turkish category bars — then say what is *not* on the screen: no link, no hostname, no page title. The send answers `"Veli onayı olmadan bu işlem yapılamaz."` — the gate, at the measuring layer. |
| **1:00** | Web `/` | Open the landing page. | `"Ham URL yok. Mesaj yok. Arama kaydı yok."` and the three role cards under `"Kim ne görür?"`. |
| **1:40** | Web `/app/parent` | Log in as `"Ece (Veli)"`, stay on `"Dengeli"`, press `"Onayla"`. | The panel's own `"Veli onayı bekleniyor"` card, then the button `"Onayla"`. Same sentence the extension just got, now with a button under it. |
| **2:10** | Extension → terminal | Press `"Şimdi gönder"` again, then `"Duraklat"`. Run `bun run demo:ingest-balanced` in the spare terminal. | `"Özet gönderildi. Skorun: …"` — real browsing minutes, scored. Then the terminal loads the canonical week so the rest of the demo is the DESIGN numbers, not today's browsing. |
| **2:40** | Web `/app/parent` | Press `"Riskli"`, `"Üretken"`, then back to `"Dengeli"` — switching refetches. Never reload the page: the demo session lives in memory and a reload logs Ece out. Read the three reasons aloud. | **80** under `"Bu haftaki denge"`, `"Dönem: 2026-09-08/2026-09-15"`, the distribution bars — then **38**, **93**, **80**. The number is a mirror, not a grade. |
| **3:40** | Web `/app/teacher` | `"Çıkış"`, then log in as `"Mert (Öğretmen)"`. | **70** and `"sınıf ortalaması"`, `"Destek gerektiren: 1 / 3 öğrenci"`, the roster's `"Destek gerekli"` next to `"Riskli"`, and `"Bu hafta sınıfla"`. Same data, one level up — still no link, no student name. |
| **4:30** | Expo | Press `"Katıl"`. Deniz is approved now, so the app lands straight on the score. | `"Bu haftaki dengen"` and **80**, with the same three reasons the parent just read. |
| **5:15** | Expo | Scroll to the coach, press `"Görevi tamamladım"`. | The three tips, the task's `eta_minutes`, then the badge `"Değerli adım"`. |
| **6:00** | Web `/app/parent` → `/privacy` | Log back in as `"Ece (Veli)"` (you signed out at 3:40), show the task, then open the privacy page. | The task reading `"Tamamlandı"`, `"Velinle paylaşılacak özet"` — then `"Asla toplanmaz"` and `"Ham bağlantılar veya tam alan adı ve yol"`. |
| **6:45** | — | Stop. | Do not open the admin route, Kubernetes, or model cards. |

Beat 4 carries the whole demo. `demo:ingest-balanced` logs in as Deniz, posts the balanced week
(40/15/20/10/0/5/120/0 → **80**) and fetches the coach, so the score, the task and the `share_text`
all exist before the phone is touched. It must run **after** the approval — before it, the API
refuses with `consent_missing`, which is the gate doing its job.

Why `"Duraklat"` at beat 4: the report always shows the **most recently computed** score, and the
extension re-sends on its own every five minutes. Pausing it stops today's real browsing from
quietly replacing the 80 halfway through beat 6.

**If you would rather open with the phone's waiting screen**, run Expo before beat 3 and press
`"Katıl"` there: Deniz is still `pending_parent_consent`, so the app shows
`"Veli onayı bekleniyor"` and `"Durumu yenile"` brings him in after the approval. It costs one extra
hop between surfaces; the extension already tells that part of the story.

## If something breaks

| Symptom | Drill |
|---|---|
| HuggingFace is down, slow, or the model is not served | Nothing to do. The coach falls back to canned Turkish JSON and sets `X-Nexora-Coach: fallback`. Say **"güvenli yedek yanıt"** and keep going — a demo that survives its LLM is the point. |
| Expo will not start, or the phone will not connect | Skip beats 2, 4 and 5. Run `bun run demo:ingest-balanced` after the approval and tell the story from the parent panel alone. Be honest that the task then reads `"Açık"` instead of `"Tamamlandı"`: nobody completed it. |
| The panel shows `"Bu hafta henüz özet yok."` | Deniz is approved but no week has been ingested. Run `bun run demo:ingest-balanced`, then press another persona and come back to `"Dengeli"` to force a refetch. |
| The panel shows `"Veli onayı bekleniyor"` when you expected a report | The approval has not happened (or `db:seed` was re-run). Press `"Onayla"`. |
| `demo:ingest-balanced` prints "Deniz is still waiting for a parent" | Same cause, and the script tells you the fix. Approve first, then re-run it. |
| The panel shows `"Rapor alınamadı. Bağlantını kontrol edip tekrar dene."` | The API is down or CORS is wrong. Check `curl http://localhost:3000/health` and that `WEB_ORIGIN` contains the origin the browser is actually on. |
| The extension popup reads `"Henüz kategori dakikası yok. Tarayıcıda gezindikçe burada birikir."` | Nothing mapped has been browsed in this period, or accrual is paused / the window was never focused. Open two or three mapped sites for a minute, or skip to beat 1 and show the popup at the privacy beat instead. |
| The extension says `"Önce ayarlardan oturum anahtarını gir."` | No token in Options. Re-run the `curl` login for persona `deniz` and paste the `token` field. |
| The extension says `"Bağlantı kurulamadı. Sunucu adresini ayarlardan kontrol et."` | The API is down, or Options points somewhere `host_permissions` does not allow (it allows `http://localhost:3000/*` only). |
| The parent panel shows a score you do not recognise instead of **80** | An extension send landed after `demo:ingest-balanced` — the report shows the newest computed score. Press `"Duraklat"` in the popup and re-run `bun run demo:ingest-balanced`. |
| The teacher panel shows `"Veli onayı bekliyor"` on the `"Dengeli"` row | Deniz has not been approved yet. That is beat 3; the class average is then computed from the other two. |

## The extension, in detail (beats 0:00 and 2:10)

Stated honestly: the extension is **not** wired into the seed. It counts what you actually browse,
and it needs two things done by hand before the room — both in **Before the room** above: load
unpacked from `apps/extension`, and paste a bearer token into its **Options** page, because the
extension has no login UI.

What it is showing:

- The popup lists Turkish **category totals** and nothing else. That is the demo: there is no list
  of sites to hide, because no hostname is ever stored. A category under half a minute reads
  `"<1 dk"`.
- `"Şimdi gönder"` posts the running total immediately; on its own it sends every five minutes.
  Every send carries the **cumulative** total for the period, so a repeated send replaces the day's
  stored total instead of adding to it.
- Before the approval the send is refused and the extension says
  `"Veli onayı olmadan bu işlem yapılamaz."` — and it stops trying until a new token or API address
  arrives, or until you press `"Şimdi gönder"` again.
- After the approval it says `"Özet gönderildi. Skorun: …"`. That number is **your** browsing, not
  the DESIGN numbers, which is why `demo:ingest-balanced` runs right after it and why you press
  `"Duraklat"`.

`manifest.json` grants host access to two concrete origins — `http://localhost:3000/*` and the
deployed API — so **API adresi** on the Options page may be either. No wildcard host, no third
destination.

## Demoing from the deployed Workers

The web and the API are also on Cloudflare Workers, which is the fallback if a laptop terminal
refuses to cooperate in the room, and the link you leave behind:

| | URL |
|---|---|
| Web | `https://nexora-web.<account>.workers.dev` |
| API | `https://nexora-api.<account>.workers.dev` |

Everything works there, against the same Neon database — the same seed, the same
`demo:ingest-balanced` from your laptop (point it at the deployed API, or run it locally: it is the
same database either way).

The extension included. To run the whole demo off the Workers deployment, change two fields on its
Options page before the room:

| Field | Value |
|---|---|
| API adresi | `https://nexora-api.<account>.workers.dev` |
| Oturum anahtarı | a token minted **from that API** — it is signed with the deployment's own `SESSION_SECRET`, so the local one will not open it |

Nothing else changes: the extension's requests carry the bearer token and leave from the extension's
own context, so `WEB_ORIGIN` — which governs browsers and cookies — is not in their way.

## Running on a physical phone

`localhost` on the phone is the phone. Both of these have to carry the laptop's LAN IP, and the two
have to agree:

```bash
# .env at the repo root — the API must accept the Expo origin
WEB_ORIGIN=http://localhost:5173,http://localhost:8081,http://192.168.1.42:8081

# the Expo app must call the laptop, not itself
EXPO_PUBLIC_API_URL=http://192.168.1.42:3000 bun run --filter nexora-mobile start
```

Restart the API after editing `.env`. An Android **emulator** needs neither: it already maps the host
to `10.0.2.2:3000` by itself.

## Rehearsal

```bash
bun run demo:e2e
```

That reseeds and then drives the whole critical path in a real browser against the real API and the
real database: log in as Ece, approve Deniz, ingest the balanced week (asserting **80**), fetch the
coach, complete the task, read **38 / 93 / 80** back off the panel switcher along with
`"Tamamlandı"`, the `share_text` and the KVKK strip — then log in as Mert and check the class panel
reads **70**, `"Destek gerektiren: 1 / 3 öğrenci"` and no `"Onayla"` button.

It does not touch the extension beats: those are hand-run, which is exactly why they are in
**Before the room**.

It leaves the database in the *end* state of the demo, with Deniz already approved.

```bash
bun run --filter nexora-api db:seed    # always re-seed after a rehearsal
```

Check the read-back says `usr_deniz status=pending_parent_consent` before you walk into the room.
