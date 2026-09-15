# Building block 03 — Signals and Feed Health Score v0.5

**Phase:** A  
**Depends on:** 02  
**Unlocks:** 04, 05, 06, 07, 08

## Purpose

Ingest category-minute summaries. Compute explainable score in TypeScript. Persist. Never accept URLs.

## Implement

### `packages/score`

Pure functions, no I/O:

```ts
computeScore(minutes: CategoryMinutes): { value: number; reasons: [string, string, string] }
```

Formula and reason table: [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

Export helpers for tests: `valuableShare`, `diversityCount` if useful; do not leak them in the API.

### API

- `POST /signals/category-summary`
- `GET /score/current`
- `POST /score/recompute` (optional; nice for demo)

On ingest: validate Zod → reject URL-like keys → `requireActiveYouth` → upsert `CategorySummary` → `computeScore` → upsert `Score` → return 201.

Privacy reject list (400 `validation_error` if present at any depth): `url`, `urls`, `hostname`, `hostnames`, `path`, `title`, `content`.

## Tests (Vitest) — required

Use the seed minutes from [`../DESIGN.md`](../DESIGN.md):

| fixture | expected `value` |
|---|---|
| balanced (40/15/20/10/0/5/120/0) | 80 ± 1 |
| risky (10/0/0/0/0/0/200/40) | 38 ± 1 |
| productive (70/20/20/15/0/0/40/0) | 93 ± 1 |
| all zeros / empty | throw or sentinel; API maps to `no_data` |
| `total === 0` | no_data |

Also:

- reasons length === 3, all non-empty strings, Turkish (smoke: no English “entertainment” leaked as a reason label unless you intentionally use the Turkish table).
- API: pending youth POST signals → 403 `consent_missing`.
- API: body `{ minutes: { science: 10 }, url: "https://x" }` → 400.
- GET score with no rows → 404 `no_data` or documented empty.

Pin the three fixture values in a snapshot or exact assert after you run `computeScore` once locally. If off by more than 1 from the table, **fix the test math against the formula**, do not change the formula to match a guess.

## Constraints

- No Python, no LightGBM, no BERTurk.
- Score must not call the LLM.
- Do not store the request IP→URL. Minutes JSON only.

## Done when

- [ ] Three fixtures score in the bands above.
- [ ] Active youth can POST minutes and GET the same score back.
- [ ] Privacy keys rejected.
- [ ] Inactive youth blocked.
