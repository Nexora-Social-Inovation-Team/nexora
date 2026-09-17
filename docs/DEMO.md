# Demo runbook — jury script (5–7 minutes)

Block [`building-blocks/08-demo-seed.md`](building-blocks/08-demo-seed.md), made runnable. Prose is
English; every string in quotes is what is literally on the screen, in Turkish. Somebody who has
never seen this repository should be able to run the demo from this page alone.

## What the jury sees

A 15-year-old joins on a phone and is told his account stays closed until a parent opens it. His
mother opens the web panel, sees the same sentence, and presses one button. A week of **category
minutes** — never a URL — turns into a 0–100 score with three plain Turkish reasons, three coaching
tips and one short task. He completes the task, earns a badge, and the same week appears on his
mother's panel with the task marked done and one sentence she may share. Then the privacy page shows
what was never collected in the first place.

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

Keep a fourth terminal free for `bun run demo:ingest-balanced` at beat 3.

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

## The eight beats

| Time | Surface | Do | Point at (exact string) |
|---|---|---|---|
| **0:00** | Web `/` | Open the landing page. | `"Ham URL yok. Mesaj yok. Arama kaydı yok."` |
| **0:40** | Expo | Press `"Katıl"`. The app lands on the waiting screen. | `"Veli onayı bekleniyor"` — say the account is closed until a parent opens it. |
| **1:20** | Web `/app/parent` | Log in as `"Ece (Veli)"`, stay on `"Dengeli"`, press `"Onayla"`. Then run `bun run demo:ingest-balanced` in the spare terminal. | The panel's own `"Veli onayı bekleniyor"` card, then the button `"Onayla"`. |
| **2:00** | Expo | Press `"Durumu yenile"` on the waiting screen. | `"Bu haftaki dengen"` and the score **80**. Read the three reasons aloud, then: the number is a mirror, not a grade. |
| **3:00** | Expo | Scroll to the coach, press `"Görevi tamamladım"`. | The three tips, the task's `eta_minutes`, then the badge `"Değerli adım"`. |
| **4:00** | Web `/app/parent` | Press `"Riskli"`, then `"Üretken"`, then back to `"Dengeli"`. | **38**, then **93**, then **80** under `"Bu haftaki denge"`; `"Dönem: 2026-09-08/2026-09-15"`; the task reading `"Tamamlandı"`; and `"Velinle paylaşılacak özet"`. |
| **5:30** | Web `/privacy` | Show the two-column table. Optional: the extension popup. | `"Asla toplanmaz"` and `"Ham bağlantılar veya tam alan adı ve yol"`. |
| **6:30** | — | Stop. | Do not open the admin route, Kubernetes, or model cards. |

Beat 3 carries the whole demo: `demo:ingest-balanced` logs in as Deniz, posts the balanced week
(40/15/20/10/0/5/120/0 → **80**) and fetches the coach, so by the time the phone refreshes, the
score, the task and the `share_text` all already exist. It must run **after** the approval — before
it, the youth is still pending and the API refuses with `consent_missing`, which is the consent gate
doing its job.

## If something breaks

| Symptom | Drill |
|---|---|
| HuggingFace is down, slow, or the model is not served | Nothing to do. The coach falls back to canned Turkish JSON and sets `X-Nexora-Coach: fallback`. Say **"güvenli yedek yanıt"** and keep going — a demo that survives its LLM is the point. |
| Expo will not start, or the phone will not connect | Skip beats 2, 4 and 5. Run `bun run demo:ingest-balanced` after the approval and tell the story from the parent panel alone. Be honest that the task then reads `"Açık"` instead of `"Tamamlandı"`: nobody completed it. |
| The panel shows `"Bu hafta henüz özet yok."` | Deniz is approved but no week has been ingested. Run `bun run demo:ingest-balanced`, then press another persona and come back to `"Dengeli"` to force a refetch. |
| The panel shows `"Veli onayı bekleniyor"` when you expected a report | The approval has not happened (or `db:seed` was re-run). Press `"Onayla"`. |
| `demo:ingest-balanced` prints "Deniz is still waiting for a parent" | Same cause, and the script tells you the fix. Approve first, then re-run it. |
| The panel shows `"Rapor alınamadı. Bağlantını kontrol edip tekrar dene."` | The API is down or CORS is wrong. Check `curl http://localhost:3000/health` and that `WEB_ORIGIN` contains the origin the browser is actually on. |

## The extension step (optional, beat 5:30)

Stated honestly: the extension is **not** wired into the demo automatically.

1. `chrome://extensions` → Developer mode → **Load unpacked** → pick `apps/extension`.
2. Open its **Options** page and paste a bearer token — the extension has no login UI:
   ```bash
   curl -s -X POST http://localhost:3000/auth/login \
     -H "content-type: application/json" -d '{"persona":"deniz"}'
   ```
   Copy the `token` field into the options page.
3. The popup then shows Turkish **category totals** and nothing else — that is the whole point of
   showing it. It also sends on its own every five minutes, and its `"Şimdi gönder"` button posts
   the running total immediately — real browsing minutes, which are not the DESIGN numbers, so use
   it to show the shape of the data, not to drive the score.

`manifest.json` grants host access to `http://localhost:3000/*` only. Pointing the extension at any
other API origin also means adding that origin to `host_permissions`.

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
coach, complete the task, and read **38 / 93 / 80** back off the panel switcher along with
`"Tamamlandı"`, the `share_text` and the KVKK strip.

It leaves the database in the *end* state of the demo, with Deniz already approved.

```bash
bun run --filter nexora-api db:seed    # always re-seed after a rehearsal
```

Check the read-back says `usr_deniz status=pending_parent_consent` before you walk into the room.
