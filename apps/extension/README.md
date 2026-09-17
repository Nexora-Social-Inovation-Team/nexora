# nexora-extension (Manifest V3)

Counts **category seconds** on device, event by event. A hostname is read from the active tab,
mapped through `dictionary.js` and dropped: no URL, hostname or page content is ever stored, sent
or logged. Unknown hosts are ignored — there is no live "harmful" list; harmful minutes come from
the seed.

## How the accounting works

One checkpoint (`activeCategory` + `since`) is settled into a seconds-per-category accumulator
whenever the situation changes: tab activated, tab navigated to another url, window focus gained
or lost, machine idle or locked or active again. A 1-minute alarm is only a **safety flush** — it
settles the elapsed seconds of a long dwell, it never adds a flat minute. So a tab switch 20
seconds in credits those 20 seconds, and the time before the first alarm is not rounded away.

Accrual **stops** while: no Chrome window has focus (`WINDOW_ID_NONE`), the screen is **locked**,
**Duraklat** is on, or the active tab maps to no category. A single segment is capped at two flush
windows (120 s), so a suspended laptop cannot credit hours.

Plain **idle** is treated differently from locked. `chrome.idle` only means "no keyboard or mouse
for 180 s" (three minutes is *walked away*; one minute is *read a long paragraph*), so idle stops
accrual **only when the active tab is silent**. A tab that is playing sound (`tab.audible`, already
on the objects `chrome.tabs.query` returns — no extra permission) keeps counting: a twenty-minute
video watched without touching the keyboard is being consumed, and reporting it as idle is the
under-counting this extension exists to fix. A locked screen is unambiguous and always stops.
Known ceiling: a **muted** video still counts as idle.

`idleState` stores Chrome's own `"active" | "idle" | "locked"` verbatim — one boolean cannot tell
locked from idle. An unknown or missing value reads as `"active"`: the gate errs towards counting.

Minutes are derived only when sending or displaying (`Math.round(seconds / 60)`). A category under
half a minute reports 0 and shows `<1 dk`, but its seconds stay in the accumulator, so a partial
minute is delayed, never discarded.

`chrome.storage.local` holds `seconds`, `periodStart` and flags only — `paused`, `focused`,
`idleState`, `activeCategory`, `since`, `sentTotal`, `lastSentAt`, `lastStatus`, `sendBlocked`. No
hostname, url, tab id or title. Settings (`apiBase`, `token`) live in `chrome.storage.sync`.

## Dictionary

`dictionary.js` holds the hand-written rows and the registry-suffix fallback
(`.edu`, `.edu.tr`, `.k12.tr`, `.ac.uk`, `.museum`). `dictionary.generated.js`
adds ~11k hosts for `sports`, `entertainment`, `science` and `entrepreneurship`;
regenerate it with `npm run dict:build`. Hand rows win, generated rows come next,
suffix rules last, and an unknown host stays unknown.

Generated data comes from the [UT1 Capitole
blacklists](https://dsi.ut-capitole.fr/blacklists/), CC BY-SA 4.0. `arts`,
`culture` and `national_memory` have no source there and stay hand-written, and
nothing is ever mapped to `harmful`.

## Sending

The extension delivers on its own: a 5-minute alarm posts `POST /signals/category-summary` when a
token is set, nothing is blocked, and at least one whole new minute is pending. At the UTC day
rollover it sends the finished day first, then starts a fresh accumulator.

**Every send carries the CUMULATIVE total for the period, never a delta.** The API upserts the
summary (`update: { minutes }`), so a repeated send *replaces* the day's stored total with whatever
the last POST carried — posting only the newest chunk would shrink the day. For the same reason a
`201` does **not** clear the counters: only the day rollover or **Temizle** clears them.

On `401 unauthorized` or `403 consent_missing` (a youth whose parent has not approved yet) the
automatic sender stops instead of retrying: the block lifts when the options page saves new
settings, or when the user presses **Şimdi gönder**. A UTC day rollover is not one of those two
triggers: the day still flips locally, but the finished day is dropped instead of posted, so a
pending or revoked youth cannot turn midnight into a daily retry. Failure bodies are never logged.

## Load unpacked

1. `chrome://extensions` (or `edge://extensions`) → enable **Developer mode**.
2. **Load unpacked** → pick `apps/extension`.
3. Open the extension **Options** page, set the API address (default `http://localhost:3000`) and paste a token.

## Get a token

Start the API (`bun run --filter nexora-api dev`), then:

```bash
curl -s -X POST http://localhost:3000/auth/login -H "content-type: application/json" -d '{"persona":"deniz_risky"}'
```

Copy `token` from the response into the options page. The youth must be **active** (a parent
approved consent) or the popup answers `Veli onayı olmadan bu işlem yapılamaz.`

## Popup

Turkish category totals that update live while the popup is open, the last successful send time and
the last status message, plus **Şimdi gönder** (an immediate cumulative POST), **Duraklat / Devam
et** (stops accrual, not just sending) and **Temizle** (fresh accumulator).

## Tests

```bash
bun run --filter nexora-extension test      # vitest: accounting, sending, wiring, privacy, payload, manifest
bun run --filter nexora-extension test:e2e  # playwright (node, not bun): load unpacked + real tab switches
```

`chrome.idle` reports `"idle"` for every automation profile — Chrome derives it from OS-level input,
which Playwright never generates and synthetic CDP input does not clear — so the e2e waits for that
unavoidable transition and then writes `idleState: "active"` into storage, declaring what a human
machine would report. Everything else in that run (tab events, `chrome.tabs.query`, the worker's
own writes, the popup's live updates) is real.

Permissions are `tabs`, `storage`, `alarms`, `idle` and host access to the API origin only — no
`<all_urls>`, no content scripts, no `scripting`, no `webRequest`. Changing the API address to a
different origin also needs that origin added to `host_permissions` in `manifest.json`.
