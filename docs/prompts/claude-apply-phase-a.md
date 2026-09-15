# Claude Code — apply NEXORA Phase A

Session setup, then paste the **ultracode** block. Do not paste Notion. Repo docs are the spec.

## Before you paste

In the Claude Code CLI (v2.1.203+):

```
/effort ultracode
/ponytail ultra
```

Optional: `/config` → Dynamic workflow size `medium` (aim <10 agents; do not spawn a swarm for 00–03).

Then paste everything in the fenced block below as the first user message. The word `ultracode` must stay in the prompt so Claude writes a **dynamic workflow** instead of turn-by-turn coding.

---

```
ultracode

Write and run a dynamic workflow that implements NEXORA Phase A with multiple agents. You are the orchestrator: the workflow script holds the plan (phase / agent / parallel / pipeline). Subagents do the work. Do not implement Phase A turn-by-turn in this conversation.

Keep the ponytail skill at ultra for every worker: YAGNI, shortest diff that satisfies the current building block’s Done when, stdlib/native/already-in-repo before new deps. Never lazy about privacy validation, consent gate, score fixtures, coach schema, or a11y on critical screens.

## Read before you write the script

Orchestrator (you) reads once, then each worker prompt is self-contained (workers do not inherit this chat):

- AGENTS.md
- CLAUDE.md
- docs/PRIVACY.md
- docs/API.md
- docs/ARCHITECTURE.md
- docs/DESIGN.md
- docs/PHASES.md
- docs/building-blocks/NN-*.md for the block that worker owns

Conflict: docs win over Notion. Engineering: AGENTS.md + PRIVACY.md + API.md win.

## Workflow terms (use these in the script)

| Term | Meaning |
|---|---|
| orchestrator | This session / the workflow runtime. Coordinates. Does not implement app code itself. |
| workflow | JS script the runtime executes. Intermediate results live in script variables, not your context. |
| phase(title) | Groups following agents in /workflows. Titles must match meta.phases. |
| agent(prompt, opts) | Spawn one subagent. Self-contained prompt. Optional schema, label. Null if stopped/blocked. |
| parallel([...]) | Fan-out: run a set of agent tasks at once; barrier until all finish. |
| pipeline(items, fn) | One agent per item in a list. |
| subagent / worker | The spawned agent. One building block (or one verify pass). |
| fan-out / fan-in | parallel() after 03; then integrate + verify. |
| Done when | The block file’s checklist. The only merge gate. |

Do not invent other orchestration APIs. Prefer agent() + parallel() + phase(). pipeline() only if you truly have a list (e.g. per-fixture score tests).

Size: small/medium. Serial path = 4 agents (00–03). Fan-out = 4 workers (04–07). Plus 1 verifier + 1 demo = keep total well under 50. No explorer swarm.

## Phases to encode (meta.phases + phase())

1. **foundations** — serial agent() calls, each waits for the previous Done when:
   - 00-monorepo
   - 01-api
   - 02-identity-consent
   - 03-signals-score
   Do not parallelize 00–03. Shared types and Prisma must exist before anyone else writes.

2. **fan-out** — only after 03 is green. parallel() four workers with disjoint trees:
   - 04-llm-coach → apps/api coach + packages (no web/expo/extension files)
   - 05-web → apps/web only
   - 06-expo → apps/mobile only
   - 07-extension → apps/extension only
   Isolation: each worker owns only its paths. No two workers edit packages/shared or packages/score (those are done in 00/03). If 04 must add an API route, it may touch apps/api; 05–07 only consume HTTP.

3. **verify** — after fan-in, one adversarial worker:
   - Run bun typecheck + bun test + Playwright named in the blocks
   - ponytail-review the diff: delete / stdlib / native / yagni / shrink. Apply only cuts that do not touch privacy, consent, score math, or coach schema.
   - Fail closed: missing tests = not done.

4. **demo** — last agent() for 08-demo-seed (idempotent seed + jury script). Not before 05 and 06 exist.

Save the script as a project workflow `.claude/workflows/nexora-phase-a.js` if the run works (`/workflows` then `s`, project location).

## Every worker prompt must include

Copy these into each agent() string (do not assume memory):

1. Read AGENTS.md, docs/PRIVACY.md, docs/API.md, and your one docs/building-blocks/NN-*.md.
2. Ponytail ultra: skip admin consoles, extra deps, caches, design-system sites, BERTurk, pg-boss, Next.js, Ollama, K8s. Ship the block’s Create + Tests + Done when only.
3. Hard constraints: no raw URLs/hostnames in DB/logs/payloads; youth pending_parent_consent until parent approve; score is rules (fixtures 80 / 38 / 93 ±1); coach JSON exact schema with fallback if HF unset; Turkish UI; empty+error states; no HF_TOKEN in clients; no console.log of tab.url.
4. Tests first where the block names Vitest/Playwright.
5. Commit feat(<area>): … for that block. No secrets.
6. Return: files changed, commands run, Done when checkboxes, skipped-with-ponytail list (max 3 lines).

## Stack (locked)

Turborepo + Bun workspaces. TanStack Start web. Expo mobile. MV3 extension. Elysia API. Neon + Prisma. packages/score TypeScript rules. Trendyol-LLM via HF with Zod + canned fallback.

Layout: apps/api, apps/web, apps/mobile, apps/extension, packages/shared, packages/score.

## Out of scope (workers refuse)

Next.js, Nest, npm/yarn as source of truth, Ollama, llama.cpp, BERTurk, FastAPI classifier, pg-boss, pgvector, S3, Kubernetes, social feed APIs, payments, ads, extra endpoints except GET /health.

## Orchestrator rules

- You write the workflow; workers write the code.
- If workflows are disabled, say so and fall back to serial parent-session blocks 00→08 with the same ponytail ultra rules. Do not fake parallel.
- If a parallel() slot is null, fail that block closed and do not start 08.
- Env: .env.example. Prisma/health must work when DATABASE_URL is set. Coach fallback must work with HF_TOKEN unset.
- Root README stays honest until the API actually runs.

Go. Write the workflow, run it, watch /workflows. Start phase foundations with block 00.
```

---

## Shorter continue (later session)

```
ultracode

Continue NEXORA Phase A. /ponytail ultra. Read AGENTS.md + CLAUDE.md + docs/PHASES.md. Lowest incomplete building block. Serial through 03; then parallel() 04–07 with disjoint paths; 08 last. Worker prompts self-contained. Verify fail-closed. Same hard constraints.
```

## If ultracode keyword is off

Turn on **Ultracode keyword trigger** in `/config`, or `/effort ultracode`, or replace the first line with `use a workflow to` — Claude treats that as the same opt-in.
