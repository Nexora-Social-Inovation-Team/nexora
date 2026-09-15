# Building block 06 — Expo youth app

**Phase:** A  
**Depends on:** 02, 03, 04  
**Unlocks:** 08

## Purpose

Five screens for Deniz. Three demo personas. Completing a task changes the weekly report (`task.status`).

## Screens

1. Onboarding  
2. Waiting for parent consent  
3. Score + reasons  
4. Coach + micro-task  
5. Done + badge  

States, copy, tokens: [`../DESIGN.md`](../DESIGN.md).

## Navigation

File-based Expo Router is preferred. Gate screen 3–5 on `users/me.status === "active"`.

## Demo switch

`__DEV__` menu or long-press wordmark: Dengeli / Riskli / Üretken → re-login as the matching persona. After parent approval of that youth (jury does this on web, or a debug “simulate parent approve” **only in __DEV__** calling the same API as Ece).

Do not ship the simulate-approve control in a production build profile.

## API usage

- `POST /auth/login`
- `GET /users/me` (poll or refetch when returning to foreground)
- `GET /score/current`
- `GET /coach/recommendation`
- `POST /tasks/:id/complete`

Handle `consent_missing`, `no_data`, network error per DESIGN states.

## Tests

- Component/unit: score screen renders three reasons.
- Maestro or Expo-aware e2e is optional in MVP; at minimum a Playwright web is not a substitute. Prefer:

  - RNTL: waiting screen when status pending.
  - RNTL: complete button calls the tasks endpoint (mock).

If e2e time is short, document a manual script in block 08 and still keep RNTL for the gate.

## Constraints

- No native feed scraping.
- No push notifications in MVP.
- No store listing work.
- Keep main tasks 1–3 minutes; no multi-step settings.

## Done when

- [ ] Five screens exist and compile on iOS or Android simulator **or** Expo web for the jury if native time slips — **native is preferred**; Expo web is an explicit fallback, say so in the demo script.
- [ ] Pending status cannot see score.
- [ ] Three personas show different scores/tips (after seed).
- [ ] Complete task → `task.status` completed on `GET /reports/weekly`.
