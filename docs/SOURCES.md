# Sources of truth

NEXORA product decisions live in Notion. This repo distills them into agent-executable contracts.

## Conflict rules

1. **Product scope and copy:** Notion **MVP Scope** wins over the hub page and over older roadmap wording.
2. **Engineering constraints (must-nots, endpoints, schemas):** `AGENTS.md` + `docs/API.md` + `docs/PRIVACY.md` win. Do not invent endpoints or data fields.
3. **Phase A stack:** NeonDB + Prisma + Trendyol-LLM (HuggingFace). Hub-page PostgreSQL 16, pg-boss, Ollama/llama.cpp, and BERTurk are **Phase B+**, not MVP.
4. If this repo and Notion diverge after a later Notion edit, update these docs — do not silently follow the stale file.

## Notion

| Doc | URL |
|---|---|
| Hub | https://app.notion.com/p/3c6d27b535c380668a51f95debefafe9 |
| Personas | https://app.notion.com/p/23a1e24d35dc43f5a9233e51b964b765 |
| Goals and roadmap | https://app.notion.com/p/d7c93abb576d41949483a57bb0f054a1 |
| KPIs | https://app.notion.com/p/e7193d4c06cf476b9f6d5804146e7f83 |
| MVP Scope | https://app.notion.com/p/ef1dad84d38d47cfb21bbd7d73bc9db9 |
| MVP overview and non-goals | https://app.notion.com/p/f45e2087b15941dab9da35e163703e0e |
| Website pages | https://app.notion.com/p/b76380d54ec4408e9a548e67b7ec3ad5 |
| API spec v0.5 | https://app.notion.com/p/94aec179072b41a3868849bd4a14c0cb |
| Expo screens | https://app.notion.com/p/12142e9408b44b67a4b13a3a5e5bb82b |
| Extension spec | https://app.notion.com/p/3ef8c69fc7424682b8cd72562f977604 |
| LLM integration | https://app.notion.com/p/0da5f2480ff648f6a2155c268cade307 |

Read date for this distillation: 2026-09-15.

## Repo map

| Need | File |
|---|---|
| How to work | [`../AGENTS.md`](../AGENTS.md) |
| Product | [`PRODUCT.md`](PRODUCT.md) |
| System | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| UX / copy | [`DESIGN.md`](DESIGN.md) |
| Privacy | [`PRIVACY.md`](PRIVACY.md) |
| HTTP contract | [`API.md`](API.md) |
| Phases | [`PHASES.md`](PHASES.md) |
| Implement a slice | [`building-blocks/`](building-blocks/) |
