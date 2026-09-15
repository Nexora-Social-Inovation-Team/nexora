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
2. Parent approval for all three Deniz variants (demo starts **already approved** *or* the script has a flag `--approve` used in the jury path that starts pending — **jury path should include one live approve**).

**Jury-recommended state after seed:**

- `usr_deniz` (`deniz_balanced`) = `pending_parent_consent`, **no** summary yet.
- `usr_deniz_risky` and `usr_deniz_productive` = `active` with minutes already stored (for the panel switcher).

During the demo, Ece approves `usr_deniz`, then either extension or a “load sample week” debug button (web or expo `__DEV__`) POSTs the balanced minutes.

Alternatively, a single scripted POST after approve is fine: `bun run demo:ingest-balanced`.

Minutes: [`../DESIGN.md`](../DESIGN.md) table.

## Jury script (5–7 min)

1. **0:00** Landing `/` — point at “Ham URL yok”.
2. **0:40** Expo: Deniz onboarding → waiting for parent.
3. **1:20** Web: login Ece → approve Deniz.
4. **2:00** Expo: score appears (after ingest). Read 3 reasons aloud. Mention the number is a mirror.
5. **3:00** Expo: coach 3 tips + 1 task. Complete task → badge.
6. **4:00** Web parent report: score, distribution, task `completed`, `share_text`. Toggle risky vs productive to show different scores.
7. **5:30** Privacy `/privacy` table. Optional: show extension popup with category totals, no URL list.
8. **6:30** Stop. Do not open admin, Kubernetes, or model cards.

If HF is down, say “güvenli yedek yanıt” and continue — fallback is a feature.

## Canned coach check

After seed + ingest, `GET /coach/recommendation` for each persona/band returns valid JSON even with `HF_TOKEN` unset.

## Done when

- [ ] `db:seed` is idempotent.
- [ ] Three scores match the DESIGN bands (±1).
- [ ] Completing the Expo task flips report `task.status`.
- [ ] Someone not on the team can follow the script without a hidden wiki.
- [ ] Critical E2E: login, approve, report, complete task — automated where possible (Playwright against web + API).
