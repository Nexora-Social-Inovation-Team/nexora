# NEXORA

Privacy-first social AI for ages **13–18** in Turkey. Not a blocker — a coach.

**Ölç → Anla → Koçla → Üret** (Measure → Understand → Coach → Create).

This repository is in a **docs-first** state. Product decisions are distilled from [Notion](https://app.notion.com/p/3c6d27b535c380668a51f95debefafe9). Implementation starts at [building block 00](docs/building-blocks/00-monorepo.md).

## Who it is for

| Persona | Role | Surface |
|---|---|---|
| Deniz | Youth | Expo app |
| Ece | Parent | Web panel |
| Mert | Teacher | Web panel |
| Selin | Coordinator | Optional admin |

## Phase

**A — Competition MVP.** One demo path: youth app → parent consent → category summaries → explainable Feed Health Score → Trendyol-LLM coach → weekly parent/teacher report.

Blocks [00–07](docs/building-blocks/) are implemented and pass typecheck, lint and tests: the API, web panel, mobile app and extension all run. Block 08 (demo seed) is still pending. Follow [`docs/PHASES.md`](docs/PHASES.md).

## Workspace

```bash
bun install
bun run typecheck
bun run test
bun run lint
```

Shared Zod contract in `packages/shared`, score rules in `packages/score` (block 03). Copy `.env.example` to `.env`; never commit it.

## Read in this order

1. [`AGENTS.md`](AGENTS.md) — constraints for humans and coding agents
2. [`docs/PRODUCT.md`](docs/PRODUCT.md) — why it exists
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how it fits
4. [`docs/PHASES.md`](docs/PHASES.md) — what to build when
5. [`docs/README.md`](docs/README.md) — full index

**Claude Code:** `/effort ultracode` + `/ponytail ultra`, then paste [`docs/prompts/claude-apply-phase-a.md`](docs/prompts/claude-apply-phase-a.md). That prompt keeps the `ultracode` keyword so Claude writes a multi-agent **workflow** (`phase` / `agent` / `parallel`) instead of coding turn-by-turn. Details: [`CLAUDE.md`](CLAUDE.md).

## Hard promises

- No raw URLs, messages, or search queries in the central system.
- No youth processing without parent consent.
- Score is explainable rules, not an LLM judgment.
- The product does not diagnose mental health.

## License / status

Private prototype. Not production. Not a medical device.
