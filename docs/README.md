# Docs index

Agent entry: [`../AGENTS.md`](../AGENTS.md). Sources: [`SOURCES.md`](SOURCES.md).

## Contracts

| File | Use when |
|---|---|
| [`PRODUCT.md`](PRODUCT.md) | Vision, personas, goals, non-goals, KPIs that constrain MVP |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Diagrams, Prisma sketch, score formula, AuthZ, LLM boundary |
| [`DESIGN.md`](DESIGN.md) | Routes, screens, Turkish copy, tokens, demo minutes |
| [`PRIVACY.md`](PRIVACY.md) | KVKK data contract — treat as law |
| [`API.md`](API.md) | REST v0.5 paths and JSON |
| [`PHASES.md`](PHASES.md) | Product A/B/C + engineering order 00–08 |
| [`DEMO.md`](DEMO.md) | Jury runbook — setup, state after `db:seed`, the eight beats, failure drills |

## Building blocks (Phase A)

Implement in order. After 03, 05–07 may run in parallel.

| # | File |
|---|---|
| 00 | [`building-blocks/00-monorepo.md`](building-blocks/00-monorepo.md) |
| 01 | [`building-blocks/01-api.md`](building-blocks/01-api.md) |
| 02 | [`building-blocks/02-identity-consent.md`](building-blocks/02-identity-consent.md) |
| 03 | [`building-blocks/03-signals-score.md`](building-blocks/03-signals-score.md) |
| 04 | [`building-blocks/04-llm-coach.md`](building-blocks/04-llm-coach.md) |
| 05 | [`building-blocks/05-web.md`](building-blocks/05-web.md) |
| 06 | [`building-blocks/06-expo.md`](building-blocks/06-expo.md) |
| 07 | [`building-blocks/07-extension.md`](building-blocks/07-extension.md) |
| 08 | [`building-blocks/08-demo-seed.md`](building-blocks/08-demo-seed.md) |

## Claude Code

[`../CLAUDE.md`](../CLAUDE.md) — **ultracode**, workflow terms (`agent` / `parallel` / `phase`), **ponytail ultra**.

1. `/effort ultracode` then `/ponytail ultra`
2. Paste [`prompts/claude-apply-phase-a.md`](prompts/claude-apply-phase-a.md) (keep the word `ultracode` in the message)
3. Watch `/workflows`
