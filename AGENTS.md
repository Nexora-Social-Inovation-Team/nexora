# AGENTS.md

NEXORA is a privacy-first coaching product for ages 13–18 in Turkey. Loop: **Ölç → Anla → Koçla → Üret**. You are implementing **Phase A (competition MVP)** only.

**Demo proof:** Expo youth → parent consent → category summaries → explainable score → Trendyol-LLM coach → parent/teacher weekly report. Target 5–7 minutes.

Read [`docs/README.md`](docs/README.md) before coding. Implement **one** building block at a time ([`docs/PHASES.md`](docs/PHASES.md)).

**Claude Code:** paste [`docs/prompts/claude-apply-phase-a.md`](docs/prompts/claude-apply-phase-a.md). Session: `/effort ultracode` + `/ponytail ultra`. The keyword `ultracode` means write a **workflow** (`phase` / `agent` / `parallel` / `pipeline`) with multiple **subagents**. Serial 00–03; fan-out 04–07; verify; 08 last. See [`CLAUDE.md`](CLAUDE.md).

## Stack (Phase A)

| Layer | Use |
|---|---|
| Web | TanStack Start, TypeScript, Tailwind, TanStack Query/Form/Table, i18next (`tr`) |
| Mobile | Expo, React Native, TypeScript |
| Extension | Manifest V3, domain→category minutes |
| API | Bun, Elysia, Zod, REST |
| DB | Neon Postgres + Prisma (only DB access) |
| Score | TypeScript in `packages/score` — rules, not ML |
| LLM | Trendyol-LLM via HuggingFace; Zod + canned fallback |
| Monorepo | Turborepo + Bun workspaces |
| Test | Vitest, Playwright (web + API). WCAG 2.1 AA on critical screens |

**Not Phase A:** Next.js, Nest, npm/yarn as source of truth, Ollama, llama.cpp, BERTurk, pg-boss, pgvector, S3, Kubernetes, Instagram/YouTube/TikTok APIs, payments, ads.

Hub-page stack that conflicts with MVP Scope is Phase B+.

## Target layout

```
apps/api
apps/web
apps/mobile
apps/extension
packages/shared      Zod types from docs/API.md
packages/score       computeScore()
docs/                this contract
```

Until block 00 exists, do not invent a different shape.

## Commands (after 00)

```
bun install
bun run dev
bun run typecheck
bun run lint
bun run test
bun run --filter nexora-api db:seed
```

If a command is not wired yet, add it in the current block — do not switch package managers.

## Hard constraints

1. **Never** store, log, or transmit raw URLs, hostnames, page content, messages, search queries, or form passwords. Reject those keys on `POST /signals/category-summary`.
2. Youth `status` starts `pending_parent_consent`. No signals, score, or coach until `active`.
3. Score is **rules only** (`docs/ARCHITECTURE.md`). Do not ask the LLM for a number.
4. Coach output is **exactly** `{ tips[3], task: { title, steps, eta_minutes }, share_text }`. Invalid/unsafe HF output → 200 + fallback JSON, never a demo-breaking 500.
5. Prompt the model with category minutes, score, reasons, task titles — nothing else.
6. Parent/teacher UI: category trends only, never hostnames.
7. Do not diagnose mental health. No “bağımlısın” / “kötü çocuk”.
8. Do not add endpoints outside [`docs/API.md`](docs/API.md) except `GET /health`.
9. One happy path + empty + error. No extra dashboards, feed ingest, or admin suites unless a block says optional.
10. UI copy is Turkish. Code, commits, and these docs stay English.
11. Least privilege: see the AuthZ matrix in `docs/ARCHITECTURE.md`.
12. WCAG 2.1 AA on critical screens (consent, score, report, privacy). Contrast ≥ 4.5:1; do not encode score meaning as color only.

## How to work

Ponytail **ultra** (Claude: `/ponytail ultra`): shortest diff that meets Done when. No speculative layers. Never skip privacy, consent, score tests, or coach schema.

1. Open the lowest incomplete file in `docs/building-blocks/`.
2. Read its Depends-on / Create / Tests / Done when.
3. Write tests first where the block specifies Vitest/Playwright.
4. Implement the minimum.
5. Stop at “Done when”. Do not start the next block in the same unsolicited sweep — unless a **workflow** is running Phase A end-to-end (then the script sequences blocks; each **worker** still stops at its own Done when).
6. If product text conflicts: Notion MVP Scope. If engineering constraints conflict: **this file** + `docs/PRIVACY.md` + `docs/API.md`.

**Multiple agents:** do not parallelize 00–03. After 03, independent workers may **fan-out** on 04 (api coach), 05 (web), 06 (mobile), 07 (extension) with disjoint paths. **Fan-in**, then one verifier, then 08. Worker prompts are self-contained; they do not inherit the orchestrator chat.

## Testing bar

| Area | Bar |
|---|---|
| `packages/score` | Fixtures: balanced **80**, risky **38**, productive **93** (±1) |
| Consent | Pending youth cannot POST signals or GET coach |
| Privacy | URL-like keys → 400 |
| Coach | Unset `HF_TOKEN` still 200 valid schema |
| Web | Playwright: landing trust line, report ready/empty |
| E2E | Login, approve, report, complete task |

P95 non-LLM API ≤ 500 ms is a goal, not a license to add caches in A.

## Commits

- One building block (or a named subset) per PR/commit series.
- `feat(score): …`, `feat(api): …`, `feat(web): …`, `docs: …`
- Do not commit secrets. `.env.example` only.

## Out of scope reminders

Closed platform APIs, micro-incentives, school SUS studies, full fine-tune, production K8s — say no.
