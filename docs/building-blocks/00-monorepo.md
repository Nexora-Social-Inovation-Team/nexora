# Building block 00 — Monorepo

**Phase:** A  
**Depends on:** nothing  
**Unlocks:** 01–08

## Purpose

Create the Turborepo + Bun workspace so every later block has a place to land. No product features.

## Stack

- Bun workspaces
- Turborepo
- TypeScript strict
- ESLint (shared)
- Vitest at the root or per package

## Create

```
package.json                 private, workspaces: apps/*, packages/*
turbo.json                   tasks: dev, build, lint, typecheck, test
tsconfig.base.json
apps/api/                    stub package.json, "nexora-api"
apps/web/                    stub
apps/mobile/                 stub (Expo will replace this in 06)
apps/extension/              stub
packages/shared/             src/index.ts — export types from docs/API.md
packages/score/              src/index.ts — export placeholder computeScore later filled in 03
.gitignore
.env.example                 DATABASE_URL, HF_TOKEN, HF_MODEL_ID, SESSION_SECRET
```

`packages/shared` **must** export (copy from [`../API.md`](../API.md)):

- `Role`, `AccountStatus`, `CategoryId`, `CATEGORY_IDS` (tuple)
- `CategoryMinutes`
- `ApiErrorCode`
- Zod schemas: `categoryMinutesSchema`, `scoreSchema`, `coachSchema`

Do not put Prisma in this block.

## Commands (wire even if apps are stubs)

```
bun install
bun run typecheck
bun run test          # shared schema tests at minimum
```

## Constraints

- Package manager is **Bun**, not npm/yarn/pnpm.
- No Next.js. Web is TanStack Start (block 05).
- No Python packages in the monorepo for Phase A.

## Done when

- [ ] `bun install` succeeds.
- [ ] `packages/shared` typechecks and Vitest covers: coach schema accepts the example in API.md; rejects `tips` of length 2; rejects extra `url` key on a fake signals object if you add that schema here.
- [ ] `.env.example` lists `DATABASE_URL`, `HF_TOKEN`, `HF_MODEL_ID`, `SESSION_SECRET` with empty values.
- [ ] README at repo root still describes docs-first state until 01 exists; do not claim the API runs.
