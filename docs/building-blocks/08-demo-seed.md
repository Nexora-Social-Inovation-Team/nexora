# Building block 08 — Demo seed and jury script

**Phase:** A  
**Depends on:** 03, 04, 05, 06 (07 optional in the live path)  
**Unlocks:** jury demo

## Purpose

One command loads three youth weeks. A 5–7 minute script a human can run without improvising.

## Seed command

`bun run --filter nexora-api db:seed`

Idempotent upserts:

1. Users from block 02.
2. Parent approval for the two switcher variants. Deniz himself starts **pending** so the jury path includes one live approve; `db:seed -- --approve` starts him active instead, for rehearsals and for a full database in two commands (`db:seed -- --approve`, then `demo:ingest-balanced`).

**Jury-recommended state after seed:**

- `usr_deniz` (`deniz_balanced`) = `pending_parent_consent`, **no** summary yet.
- `usr_deniz_risky` and `usr_deniz_productive` = `active` with **four** weeks stored each (53 → 67 → 80 → 38 / 93, so the trend is a line, not two points), plus a task and a coach row carrying the canned `share_text` for that band. A parent switching personas lands on a filled report, never on an empty state; Üretken's task is `completed`, Riskli's is still `open`.

During the demo, Ece approves `usr_deniz`, then either extension or a “load sample week” debug button (web or expo `__DEV__`) POSTs the balanced minutes.

Alternatively, a single scripted POST after approve is fine: `bun run demo:ingest-balanced`.

Minutes: [`../DESIGN.md`](../DESIGN.md) table.

## Jury script (5–7 min)

Order: **extension → web → phone**, the way the product works. Full runbook: [`../DEMO.md`](../DEMO.md).

1. **0:00** Extension popup: category bars, no URL anywhere. `Şimdi gönder` → `Veli onayı olmadan bu işlem yapılamaz.`
2. **1:00** Landing `/` — point at “Ham URL yok”.
3. **1:40** Web: login Ece → approve Deniz.
4. **2:10** Extension: `Şimdi gönder` succeeds, then `Duraklat`. Run `bun run demo:ingest-balanced` for the canonical week.
5. **2:40** Web parent report: 80, 3 reasons, distribution. Toggle risky vs productive (38 / 93). Mention the number is a mirror.
6. **3:40** Web teacher panel: class average, who needs support, class activity. Same data one level up.
7. **4:30** Expo: score appears with the same three reasons.
8. **5:15** Expo: coach 3 tips + 1 task. Complete task → badge.
9. **6:00** Web parent: task `Tamamlandı` + `share_text`. Then `/privacy` table.
10. **6:45** Stop. Do not open admin, Kubernetes, or model cards.

If HF is down, say “güvenli yedek yanıt” and continue — fallback is a feature.

## Canned coach check

After seed + ingest, `GET /coach/recommendation` for each persona/band returns valid JSON even with `HF_TOKEN` unset.

## Done when

- [ ] `db:seed` is idempotent.
- [ ] Three scores match the DESIGN bands (±1).
- [ ] Completing the Expo task flips report `task.status`.
- [ ] The teacher panel reads the same week as a class: average, support count, per-student band.
- [ ] Someone not on the team can follow the script without a hidden wiki.
- [ ] Critical E2E: login, approve, report, complete task — automated where possible (Playwright against web + API).
