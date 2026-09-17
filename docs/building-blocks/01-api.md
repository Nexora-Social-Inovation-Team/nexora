# Building block 01 — API skeleton

**Phase:** A  
**Depends on:** 00  
**Unlocks:** 02+

## Purpose

Elysia app + Prisma + Neon + `GET /health`. No business routes yet (those are 02–04).

## Stack

- Bun + Elysia
- Prisma 6.x targeting PostgreSQL
- Neon `DATABASE_URL` (pooled)
- Zod (already in `packages/shared`)
- OpenAPI plugin if Elysia’s built-in docs are easy; otherwise `/health` only until 02

## Create

```
apps/api/src/index.ts          listen, CORS for web/expo/extension origins
apps/api/src/env.ts            Zod-parse env
apps/api/prisma/schema.prisma  copy sketch from docs/ARCHITECTURE.md
apps/api/prisma/migrations/    initial
```

`GET /health` → `{ "ok": true, "db": true }` after a `SELECT 1`. If DB is down: 503 `{ "ok": false, "db": false }`.

## Env

- `DATABASE_URL` — Neon pooled connection string
- `PORT` — default 3000
- `WEB_ORIGIN` — e.g. `http://localhost:5173`
- Prisma client is the **only** DB access.

## Constraints

- Do not add Redis, queues, or S3.
- Do not implement login yet.
- Schema includes the models from Architecture even if unused; empty tables are fine.
- No `url` / `hostname` columns — reject in code review if they appear.

## Test

- Vitest: health handler with a mocked Prisma `$queryRaw`.
- Manual: `bun run --filter nexora-api dev` + `curl localhost:3000/health` against a real Neon branch (or local Postgres if Neon is unavailable — document the override in `.env.example` as `DATABASE_URL` only, same Prisma).

## Done when

- [ ] Prisma migrate applies on Neon.
- [ ] `GET /health` returns `{ "ok": true, "db": true }`.
- [ ] Schema matches Architecture (User, ConsentEvent, CategorySummary, Score, Task, CoachRecommendation, DeletionRequest).
- [ ] CORS allows the web origin from env.

**Verified live on Neon — 2026-09-17:** `db:generate`, then `migrate deploy` applied `20260916000000_init` and `migrate status` reported "Database schema is up to date!"; `db:seed` wrote the 6 demo users; `GET /health` answered `{"ok":true,"db":true}` over the pooled `DATABASE_URL`. No `?pgbouncer=true` was needed — no 42P05 appeared across the full smoke run.
