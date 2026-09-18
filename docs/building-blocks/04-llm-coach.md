# Building block 04 — Trendyol-LLM coach

**Phase:** A  
**Depends on:** 03  
**Unlocks:** 05, 06, 08

## Purpose

`GET /coach/recommendation` returns the **fixed** schema. HuggingFace is the producer; Zod + policy are the gate; canned JSON is the demo safety net.

## Schema (exact)

```ts
{
  tips: [string, string, string],
  task: { title: string, steps: string[], eta_minutes: number },
  share_text: string
}
```

`steps` 2–5 items. `eta_minutes` 5–30 integer. No URLs in any string.

## Prompt (summary-only)

System: Turkish coach for ages 13–18. No diagnosis. No shame. JSON only.

User payload (structured, not prose dump of PII):

```json
{
  "minutes": { "science": 40, "entertainment": 120 },
  "score": { "value": 80, "reasons": ["...", "...", "..."] },
  "completed_tasks": []
}
```

Never send hostnames, messages, or the youth’s real-world identifiers beyond display-safe first name if needed. Prefer no name; `share_text` can say “Bu hafta…”.

## Provider

- Env: `HF_TOKEN`, `HF_MODEL_ID` (Trendyol-LLM id as used on HuggingFace).
- Env: `HF_BASE_URL` — base of the OpenAI-compatible chat API. Empty means the HF router, which is the default and the only path the demo depends on. Any other OpenAI-compatible host goes here; [`../colab/trendyol-coach.ipynb`](../colab/trendyol-coach.ipynb) serves Trendyol-LLM from Colab that way.
- Timeout: ~20s. On timeout/network/parse/policy fail → fallback.
- Do not stream in MVP (simpler for Expo).

## Fallback map (must differ by score band)

Keep in `apps/api/src/coach/fallback.ts`. Three entries: `<50`, `50-79`, `>=80`. Each is valid coach JSON in Turkish.

Example `<50`: task title `Kısa bir mola ve bir yetişkinle konuş`. Tips about reducing harmful/entertainment monopoly **without** the word “bağımlılık”.

Persist `CoachRecommendation` with `source: "model" | "fallback"` and create/open a `Task` row.

If a valid model response arrives, it replaces the open task.

## Policy filter

After Zod: if any string matches diagnostic terms (`teşhis`, `depresyon tanısı`, `bağımlısın`, `kötü çocuk`, `http://`, `https://`), discard and fallback.

## Tests

- Zod accepts API.md example; rejects 2 tips; rejects `eta_minutes: 0`.
- Mock HF returning prose → fallback, HTTP 200, `source: "fallback"`.
- Mock HF returning valid JSON → `source: "model"`.
- No score in DB → 404 `no_data`.
- Pending consent → 403.
- Prompt builder unit test: given a summary with a sneaky `url` field, the serialized prompt string does not contain `http`.

## Constraints

- No RAG, no pgvector, no local GGUF.
- No client-side HF key.
- Jury demo must succeed with `HF_TOKEN` unset (fallback only).

## Done when

- [ ] Endpoint matches API.md.
- [ ] Unset token still returns 200 valid coach JSON (fallback).
- [ ] Three score bands produce three different fallback tasks.
- [ ] Task row exists for `POST /tasks/:id/complete` (block 06/08).

**Verified live on Neon — 2026-09-17:** with `HF_TOKEN` and `HF_MODEL_ID` unset, `GET /coach/recommendation` answered 200 + `X-Nexora-Coach: fallback` and a schema-valid 3-tip payload for all three personas (80 / 38 / 93), and the `<50` band tips differ from the `>=80` band. The model path is blocked on the provider, not on this block: `GET https://router.huggingface.co/v1/models` returns 200 for our token but lists no Trendyol id among the 143 served models.

**Model path measured — 2026-09-17, `Qwen/Qwen3-8B` via the router (provider `nscale`):** the model answers our real prompt in ~3.5–4 s and satisfies `coachSchema` in roughly 3 calls out of 4; the rest fail on an empty string, a fourth tip or malformed JSON and take the canned fallback, exactly as designed. Two findings are now pinned in code: the request budget must cover the model's reasoning pass (`max_tokens: 500` returned `content: null` every time — see the regression test *"falls back when a reasoning model spends the whole budget on reasoning_content"*), and HF's free monthly credit is small — once depleted the router answers `402` and every call falls back. `response_format: { type: "json_object" }` measured the same 3/4; strict `json_schema` was not measurable before the credit ran out and is the obvious next lever if the model path ever needs to be reliable.

**Trendyol path measured — 2026-09-18, `Trendyol/Trendyol-LLM-7B-chat-v4.1.0` 4-bit nf4 on a free Colab T4 via `transformers` ([`../colab/trendyol-coach.ipynb`](../colab/trendyol-coach.ipynb)), N=10 per band:**

| band | schema | through the API | p50 | p95 | distinct | banned |
|---|---|---|---|---|---|---|
| risky (38) | 5/10 | 3/10 | 13.7s | 23.7s | 0.97 | 0 |
| balanced (80) | 7/10 | 5/10 | 19.8s | 24.6s | 0.98 | 0 |
| productive (93) | 9/10 | 9/10 | 13.0s | 17.4s | 0.96 | 0 |
| **all** | **21/30 (70%)** | **17/30 (57%)** | | | | **0** |

On schema alone Trendyol is level with `Qwen/Qwen3-8B`'s ~3/4 — the difference is noise at N=30. The gap opens on **latency**: four of the nine lost calls produced valid coach JSON that the 20s `AbortSignal` would have aborted, so only 57% survive the real endpoint. `balanced` has a p50 of 19.8s, meaning half that band fails on time alone, and two of three bands blow the budget at p95. Failure mix over 30 calls: 4 no JSON object, 3 `tips != 3`, 1 unparseable, 1 extra top-level key. The safe-language post-check never fired.

`distinct` (unique share of `tips + title + steps + share_text`) sat at 0.96–0.98, so the model does not pad the schema by repeating one sentence — a single hand-read sample had suggested it might, and the run does not bear that out. The column stays in the notebook because `coachSchema` structurally cannot catch that failure.

**Read the latency as an upper bound, not a property of the model:** `transformers` with 4-bit weights on a Turing T4 is the slowest reasonable way to run this. A served runtime on real hardware would cut it, and the schema rate would not move. What the run does settle is that Trendyol-LLM writes the coach schema about as reliably as the substitute already in use, and that **no hosting we can reach for free fits the 20s budget** — so the demo default stays the canned fallback and nothing in [`../DEMO.md`](../DEMO.md) changes. Swap `HF_MODEL_ID` the day a provider serves Trendyol; revisit the budget then, not before.

**`HF_BASE_URL` verified end to end — 2026-09-18, against the notebook's shim over a `trycloudflare` tunnel:** `GET /coach/recommendation` as `deniz_risky` answered 200 + `X-Nexora-Coach: model` in 12.1s, and the seeded fallback task was upgraded **in place** — `task_id` stayed `tsk_usr_deniz_risky`, so a retry does not stack a second task on the report. The same prompt measured 13.9–17.8s over three direct calls to the tunnel, and one earlier attempt did fall back, which is the p95 tail the table above shows rather than a broken path. Fail-closed measured too: with `HF_BASE_URL` pointed at a black-hole address the endpoint still answered **200 + `fallback` in 21.2s** — the 20s `AbortSignal` plus a DB round trip. That is also the cost of leaving a dead tunnel URL in `.env`: every coach call pays ~21s before the canned answer. Delete the three lines when the Colab session ends.
