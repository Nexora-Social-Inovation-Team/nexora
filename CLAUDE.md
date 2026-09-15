# CLAUDE.md

Read [`AGENTS.md`](AGENTS.md) first. That file is the contract. This file is Claude Code only: **ultracode**, **workflows**, **multiple agents**, **ponytail**.

Kickoff prompt: [`docs/prompts/claude-apply-phase-a.md`](docs/prompts/claude-apply-phase-a.md).

## Session defaults

```
/effort ultracode
/ponytail ultra
```

`ultracode` in a human prompt (or “use a workflow”) means: **write a dynamic workflow script and run it**. Do not grind Phase A turn-by-turn in the parent context when the workflow tool is available.

Ponytail **ultra** stays on until “stop ponytail”. Lazy = shortest working diff, not skipped reading. Ladder after you understand the block.

## Workflow terms

| Term | Use |
|---|---|
| **orchestrator** | Parent session / workflow runtime. Coordinates. Does not own app files. |
| **workflow** | JS script the runtime executes. Plan lives in the script; results in script variables. |
| **phase(title)** | Groups following agents in `/workflows`. Keep `meta.phases` in sync. |
| **agent(prompt, opts)** | One subagent. Prompt must be self-contained. `schema` / `label` optional. Null if stopped or blocked. |
| **parallel(tasks)** | Fan-out barrier. Independent workers only. |
| **pipeline(items, fn)** | One agent per list item. |
| **subagent / worker** | Spawned agent. One building block or one verify pass. |
| **fan-out / fan-in** | `parallel()` after block 03; then integrate. |
| **Done when** | Checklist in `docs/building-blocks/NN-*.md`. Merge gate. |

Host docs: [Orchestrate subagents with dynamic workflows](https://code.claude.com/docs/en/workflows). Caps: 16 concurrent, 1000 agents/run — **do not approach them**. Aim medium (<10 agents) for Phase A.

## When to workflow vs parent session

| Work | How |
|---|---|
| 00 → 03 | Serial `agent()` in phase `foundations`. Shared types/DB. No parallel. |
| 04, 05, 06, 07 | `parallel()` in phase `fan-out`. Disjoint trees only. |
| tests + ponytail-review | One `agent()` in phase `verify`. Fail closed. |
| 08 demo seed | Last `agent()` in phase `demo`. After 05 and 06 exist. |
| One-line doc tweak | Parent session. No workflow. |

Workers do **not** inherit this chat. Every `agent()` prompt must name the files to read and the Done when list.

## Ponytail ultra (workers)

Stop at the first rung that holds: skip / reuse repo / stdlib / native / existing dep / one line / minimum.

**Skip:** admin console, extra packages, caches, design-system site, BERTurk, pg-boss, Next.js, Ollama, K8s, “for later” scaffolding.

**Never skip:** input validation at the API boundary, URL-key reject, consent gate, score fixtures 80/38/93, coach Zod + fallback, WCAG on critical screens, empty/error states.

After a fan-in, run **ponytail-review** on the diff (`delete` / `stdlib` / `native` / `yagni` / `shrink`). Apply cuts that do not touch those never-skip items.

Mark real ceilings with `// ponytail: …` (e.g. report on-read, no job queue).

## Do not

- Add endpoints outside `docs/API.md` except `GET /health`.
- Parallelize 00–03.
- Let two workers edit `packages/shared` or `packages/score` (00/03 own them).
- Put `HF_TOKEN` in Expo or web.
- `console.log` `tab.url` in the extension.
- Fake `parallel()` if workflows are disabled — say so, then serial parent-session blocks.

## Do

- Shared Zod in `packages/shared`, score math in `packages/score`.
- Schema-validate HF output; fallback canned JSON per score band.
- Turkish UI from `docs/DESIGN.md`.
- Empty and error states on every data screen.

## Verification

Do not claim the demo works until `docs/building-blocks/08-demo-seed.md` is done and `verify` is green.
