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

## HuggingFace

- Env: `HF_TOKEN`, `HF_MODEL_ID` (Trendyol-LLM id as used on HuggingFace).
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
