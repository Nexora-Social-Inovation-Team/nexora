export const meta = {
  name: 'nexora-phase-a',
  description: 'Build NEXORA Phase A: serial blocks 00-03, parallel 04-07 in git worktrees, fail-closed verify, demo seed',
  phases: [
    { title: 'foundations', detail: 'blocks 00-03 serial, then an adversarial gate + fix loop' },
    { title: 'fan-out', detail: 'blocks 04-07 in parallel worktrees, then fan-in merge' },
    { title: 'verify', detail: 'full Done-when audit, live integration, ponytail-review, fix loop' },
    { title: 'demo', detail: 'block 08 seed + jury script, then demo gate' },
  ],
}

const ROOT = 'W:/projects/personal/nexora'
const BASE_SHA = '80fc00dd0795572fdf112f48e9840c35cf072498'
const TRAILER = 'Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>'

const RULES = [
'WORKER RULES (NEXORA Phase A build). You do not inherit any orchestrator chat: this prompt plus the repo docs are everything.',
'Environment: Windows 11. Repo ' + ROOT + ', branch phase-a. Your cwd may be a fresh git worktree of that repo: if so, work in your cwd and run bun install there first (no node_modules yet). Git Bash and PowerShell both available. bun 1.3.14 and node on PATH.',
'',
'1. READ FIRST: AGENTS.md, docs/PRIVACY.md, docs/API.md, your building block file, and the docs/ARCHITECTURE.md + docs/DESIGN.md sections it references. Docs are the spec. On conflict: AGENTS.md + docs/PRIVACY.md + docs/API.md win, then the ORCHESTRATOR CONTRACT below.',
'2. PONYTAIL ULTRA: shortest diff that satisfies your block Create + Tests + Done when. Ladder, stop at the first rung that holds: skip it / reuse what is already in the repo / stdlib / native platform feature / already-installed dep / one line / minimum code. Skip admin consoles, extra deps, caches, design-system sites, BERTurk, pg-boss, pgvector, Next.js, Nest, Ollama, llama.cpp, S3, Kubernetes, and any scaffolding "for later". Mark real ceilings with a comment starting "ponytail:" naming the ceiling and the upgrade path. NEVER lazy about: input validation at the API boundary, URL-key reject, consent gate, score fixtures 80/38/93, coach Zod + policy + fallback, WCAG 2.1 AA on critical screens, empty and error states.',
'3. HARD CONSTRAINTS: never store, log or transmit raw URLs, hostnames, page content, messages, search queries or form fields (no url/hostname/path/rawContent columns, payload keys, or log lines). Youth status starts pending_parent_consent; signals, score and coach are refused with 403 consent_missing until a parent or admin approves. Score is rules only in packages/score (fixtures balanced 80, risky 38, productive 93, all +-1); never ask the LLM for a number. Coach model output is exactly { tips[3], task: { title, steps[2-5], eta_minutes 5-30 }, share_text } with a canned Turkish fallback whenever HF_TOKEN is unset or output is invalid or unsafe (never a 500). UI copy is Turkish; code, commits and docs stay English. Every data screen has loading, empty and error states. No HF token in web, mobile or extension. Never console.log tab.url. No endpoints outside docs/API.md except GET /health. No mental-health diagnosis language (bagimlisin, kotu cocuk, tesis of a diagnosis).',
'4. TESTS FIRST where your block names Vitest / Playwright / RNTL. Run them and report real output. Never skip, .only, delete or weaken a test to go green.',
'5. BUN ONLY: bun install / bun add / bunx. Never create package-lock.json, yarn.lock or pnpm-lock.yaml, never invoke npm/yarn/pnpm to install.',
'6. DATABASE: Neon only. NEVER use local Postgres, Docker, SQLite, PGlite or "prisma dev", not even for tests. The Neon URL lives in the gitignored repo-root .env (DATABASE_URL pooled, DIRECT_URL direct). If your cwd has no .env, check ' + ROOT + '/.env and copy it into your cwd root only after confirming "git check-ignore .env" succeeds. Never print, log or commit its values. If no DATABASE_URL exists anywhere, still build the block with mocked-Prisma tests, report db_available=false, and mark ONLY the items that truly need a live database as blocked_on_db.',
'7. Look up current library APIs with the context7 MCP tools (load them with ToolSearch, query "context7") instead of guessing: Elysia, Prisma 6, TanStack Start, Tailwind, Expo, Playwright, Chrome MV3, HuggingFace Inference.',
'8. Long-running processes: start dev servers in the background, verify, then kill them (find the PID by port on Windows). Never leave a server running when you return.',
'9. COMMIT when your Done when holds: stage only your block paths (never .env, never node_modules, never secrets), message "feat(<area>): <summary>" whose last line is exactly:',
TRAILER,
'Do not push, do not amend or rebase earlier commits, do not switch branches.',
].join('\n')

const CONTRACT = [
'ORCHESTRATOR CONTRACT (fixed so parallel workers agree; deviate only if a doc forces it, and then say so in integration_notes):',
'- Workspace names: @nexora/shared, @nexora/score, nexora-api, nexora-web, nexora-mobile, nexora-extension. Apps depend on the packages with "workspace:*".',
'- API listens on PORT (default 3000). CORS: WEB_ORIGIN is a comma-separated list, default "http://localhost:5173,http://localhost:8081", credentials allowed.',
'- Web dev server port 5173, env VITE_API_URL (default http://localhost:3000). Expo env EXPO_PUBLIC_API_URL (default http://localhost:3000; Android emulator uses http://10.0.2.2:3000). Extension stores API base URL + bearer token in its options page.',
'- Session: POST /auth/login sets HttpOnly cookie nexora_session (SameSite=Lax, Path=/, Secure only in production) AND returns { user, token }. token is the same signed session value (HS256 with SESSION_SECRET) and carries only the user id + expiry: account status is always read from the DB per request. Every protected route accepts the cookie or "Authorization: Bearer <token>". Web uses the cookie (fetch credentials: "include"); Expo and the extension use Bearer.',
'- Demo users: usr_deniz (youth, personaKey deniz_balanced), usr_deniz_risky (deniz_risky), usr_deniz_productive (deniz_productive), all youth with parentId usr_ece and initial status pending_parent_consent; usr_ece parent (linkedYouthId "usr_deniz"); usr_mert teacher (linkedYouthId "usr_deniz", demo class = the three deniz ids); usr_selin admin. Login persona "deniz" aliases deniz_balanced.',
'- Errors: body { error: { code, message } } with a Turkish message and the API.md status mapping (validation_error 400, unauthorized 401, forbidden 403, consent_missing 403, no_data 404, upstream_unavailable 503).',
'- GET /coach/recommendation 200 body: { tips: [3 strings], task: { title, steps, eta_minutes }, share_text, source: "model" | "fallback", task_id } plus header "X-Nexora-Coach: model|fallback". coachSchema in @nexora/shared validates the exact 3-key model output; coachResponseSchema = coachSchema plus source and task_id.',
'- GET /reports/weekly?youthId=...&week=YYYY-MM-DD: youthId required for parent/teacher/admin, youth defaults to self; not linked -> 403 forbidden; youth not active -> 403 consent_missing; active with no summary -> 200 { youthId, period: null, score: null, distribution: {}, trend: [], task: null, share_text: null, empty: true }; ready -> the API.md shape plus empty: false, distribution carrying all 8 category keys, task { id, title, status } or null, share_text string or null. Clients also treat 404 no_data as empty.',
'- POST /tasks/:id/complete 200: { id, status: "completed", completedAt, badge: "degerli_adim" }. Unknown id or not the caller task -> 404 no_data. Repeating it is idempotent.',
'- Neon integration tests use different youths so parallel runs never collide: blocks 02/03 use usr_deniz, block 04 uses usr_deniz_productive, block 07 uses usr_deniz_risky. Every integration test restores the state it changed.',
].join('\n')

const BLOCK_RETURN = [
'RETURN (structured output, no prose anywhere else):',
'- block: your block id, e.g. "03-signals-score".',
'- done_when: EVERY checkbox from your block file Done when section, copied verbatim, each with status and concrete evidence (test name + result, a command output line, or file:line). status is one of: done | not_done | blocked_on_db (only when no DATABASE_URL exists anywhere) | deferred_to_integration (fan-out workers only: the item needs another parallel block code that is not in your tree; put the exact manual check in evidence).',
'- files_changed, commands_run (cmd + result), commit_sha (full sha of your last commit, or "none"), branch ("git branch --show-current" or "detached"), worktree_path (absolute cwd), db_available.',
'- integration_notes: terse facts later workers need (scripts, env vars, ports, exported symbols, auth details, response quirks, any deviation from the contract).',
'- skipped_ponytail: max 3 lines, each "skipped X, add when Y".',
].join('\n')

const ITEM = { type: 'object', properties: { item: { type: 'string' }, status: { type: 'string', enum: ['done', 'not_done', 'blocked_on_db', 'deferred_to_integration'] }, evidence: { type: 'string' } }, required: ['item', 'status', 'evidence'] }
const CMD = { type: 'object', properties: { cmd: { type: 'string' }, result: { type: 'string' } }, required: ['cmd', 'result'] }

const BLOCK_SCHEMA = { type: 'object', properties: {
  block: { type: 'string' },
  done_when: { type: 'array', items: ITEM },
  files_changed: { type: 'array', items: { type: 'string' } },
  commands_run: { type: 'array', items: CMD },
  commit_sha: { type: 'string' },
  branch: { type: 'string' },
  worktree_path: { type: 'string' },
  db_available: { type: 'boolean' },
  integration_notes: { type: 'string' },
  skipped_ponytail: { type: 'array', items: { type: 'string' } },
}, required: ['block', 'done_when', 'files_changed', 'commands_run', 'commit_sha', 'branch', 'worktree_path', 'db_available', 'integration_notes', 'skipped_ponytail'] }

const VERIFY_SCHEMA = { type: 'object', properties: {
  pass: { type: 'boolean' },
  db_available: { type: 'boolean' },
  failures: { type: 'array', items: { type: 'object', properties: {
    block: { type: 'string' }, item: { type: 'string' },
    kind: { type: 'string', enum: ['defect', 'missing_test', 'blocked_on_db'] },
    evidence: { type: 'string' }, fix_hint: { type: 'string' },
  }, required: ['block', 'item', 'kind', 'evidence', 'fix_hint'] } },
  ponytail: { type: 'array', items: { type: 'object', properties: {
    location: { type: 'string' },
    tag: { type: 'string', enum: ['delete', 'stdlib', 'native', 'yagni', 'shrink'] },
    cut: { type: 'string' }, replacement: { type: 'string' }, touches_protected: { type: 'boolean' },
  }, required: ['location', 'tag', 'cut', 'replacement', 'touches_protected'] } },
  commands_run: { type: 'array', items: CMD },
  summary: { type: 'string' },
}, required: ['pass', 'db_available', 'failures', 'ponytail', 'commands_run', 'summary'] }

const FIX_SCHEMA = { type: 'object', properties: {
  fixed: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, how: { type: 'string' } }, required: ['item', 'how'] } },
  not_fixed: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, why: { type: 'string' } }, required: ['item', 'why'] } },
  ponytail_applied: { type: 'array', items: { type: 'string' } },
  ponytail_skipped: { type: 'array', items: { type: 'object', properties: { cut: { type: 'string' }, why: { type: 'string' } }, required: ['cut', 'why'] } },
  commit_sha: { type: 'string' },
  commands_run: { type: 'array', items: CMD },
}, required: ['fixed', 'not_fixed', 'ponytail_applied', 'ponytail_skipped', 'commit_sha', 'commands_run'] }

const ADJ_SCHEMA = { type: 'object', properties: {
  blocking: { type: 'array', items: { type: 'object', properties: { block: { type: 'string' }, item: { type: 'string' }, reason: { type: 'string' } }, required: ['block', 'item', 'reason'] } },
  dismissed: { type: 'array', items: { type: 'object', properties: { block: { type: 'string' }, item: { type: 'string' }, reason: { type: 'string' } }, required: ['block', 'item', 'reason'] } },
  summary: { type: 'string' },
}, required: ['blocking', 'dismissed', 'summary'] }

const MERGE_SCHEMA = { type: 'object', properties: {
  merged: { type: 'array', items: { type: 'object', properties: { block: { type: 'string' }, sha: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['block', 'sha', 'ok', 'note'] } },
  unresolved: { type: 'array', items: { type: 'string' } },
  head_sha: { type: 'string' },
  removed_worktrees: { type: 'array', items: { type: 'string' } },
  commands_run: { type: 'array', items: CMD },
  notes: { type: 'string' },
}, required: ['merged', 'unresolved', 'head_sha', 'removed_worktrees', 'commands_run', 'notes'] }

const BLOCKS = {}

BLOCKS['00-monorepo'] = [
'YOUR BLOCK: docs/building-blocks/00-monorepo.md (block 00, foundations, serial). You own: repo root config, apps/* stubs, packages/shared, packages/score placeholder.',
'- Root package.json: private, workspaces apps/* and packages/*, packageManager "bun@1.3.14", scripts dev/build/lint/typecheck/test delegating to turbo. turbo.json tasks: dev (persistent, no cache), build, lint, typecheck, test.',
'- tsconfig.base.json (strict). One shared ESLint flat config at the root, not per package.',
'- packages/shared exports the block list (Role, AccountStatus, CategoryId, CATEGORY_IDS tuple, CategoryMinutes, ApiErrorCode, categoryMinutesSchema, scoreSchema, coachSchema) AND, because fan-out workers may not edit this package later, every other docs/API.md + contract shape, one Zod expression each, no codegen: personaSchema, userSchema, loginRequestSchema, loginResponseSchema ({ user, token }), consentRequestSchema, consentApproveResponseSchema, consentRevokeResponseSchema, periodSchema (YYYY-MM-DD/YYYY-MM-DD), signalsRequestSchema (strict: period + minutes, unknown minute keys and negatives rejected), signalsResponseSchema, scoreCurrentSchema, coachResponseSchema, weeklyReportSchema (ready | empty union per the contract), taskCompleteResponseSchema, apiErrorSchema, CATEGORY_LABELS_TR (Turkish labels from ARCHITECTURE.md), VALUABLE_CATEGORIES, FORBIDDEN_PAYLOAD_KEYS = url, urls, hostname, hostnames, path, title, content, and findForbiddenKey(value) returning the first forbidden key found at any depth (objects and arrays) or null.',
'- coachSchema is strict: tips exactly 3 non-empty strings, task.steps 2-5, eta_minutes integer 5-30, share_text non-empty, no extra keys.',
'- Vitest in packages/shared: coachSchema accepts the docs/API.md example, rejects 2 tips, rejects eta_minutes 0; signalsRequestSchema rejects an extra url key (top level and nested), unknown minute keys and negative minutes; findForbiddenKey finds a nested hostname.',
'- packages/score: placeholder computeScore export only (block 03 fills it). No speculative helpers.',
'- apps/api (name nexora-api), apps/web, apps/mobile, apps/extension: stub package.json each with typecheck and test scripts that succeed today.',
'- .gitignore already exists and already ignores .env: extend it (node_modules, dist, .turbo, build outputs, .expo, playwright-report, test-results, .claude/worktrees). Never remove a line.',
'- .env.example with empty values and one short comment each: DATABASE_URL (Neon pooled), DIRECT_URL (Neon direct, used by prisma migrate), HF_TOKEN, HF_MODEL_ID (Trendyol-LLM id on HuggingFace), SESSION_SECRET.',
'- README.md stays docs-first and honest (the API does not run yet); at most add a short Workspace note with the bun commands.',
'- Done when commands from the repo root: bun install, bun run typecheck, bun run test, all green.',
'Commit message: "feat(monorepo): bun + turborepo workspace and shared zod contract".',
].join('\n')

BLOCKS['01-api'] = [
'YOUR BLOCK: docs/building-blocks/01-api.md (block 01, foundations, serial). You own apps/api, plus .env.example and README.md only where this block requires it.',
'- Elysia on Bun. src/index.ts exports the app (so tests can call app.handle(new Request(...)) without listening) and listens only when run as the entry module. src/env.ts Zod-parses env: DATABASE_URL, DIRECT_URL, PORT default 3000, WEB_ORIGIN default list, SESSION_SECRET, HF_TOKEN and HF_MODEL_ID optional. Tests must never need the real .env.',
'- The .env file is at the REPO ROOT, not in apps/api. Make the api dev script, the Prisma CLI and the tests find it with no new dependency (bun --env-file, Prisma env loading rules: check the current docs).',
'- Prisma 6.x (prisma and @prisma/client pinned to ^6). prisma/schema.prisma is the docs/ARCHITECTURE.md sketch (User, ConsentEvent, CategorySummary, Score, Task, CoachRecommendation, DeletionRequest), adding only the back-relations Prisma needs to compile. datasource url = env("DATABASE_URL"), directUrl = env("DIRECT_URL"). No url/hostname/path/rawContent columns anywhere.',
'- Initial migration generated offline so no shadow database is needed: prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script into prisma/migrations/<timestamp>_init/migration.sql plus migration_lock.toml; apply with prisma migrate deploy when DATABASE_URL is present.',
'- GET /health: prisma.$queryRaw SELECT 1 -> 200 { ok: true, db: true }; on failure 503 { ok: false, db: false }. Vitest with a mocked $queryRaw covers both.',
'- CORS via @elysiajs/cors with credentials, origins parsed from WEB_ORIGIN.',
'- If you log requests at all: method, route pattern, status, duration, request id only. Never query strings, bodies or headers.',
'- Scripts in apps/api/package.json: dev, test, typecheck, db:migrate (migrate deploy), db:generate.',
'- DB step (rule 6): if DATABASE_URL exists, run migrate deploy against Neon, start the API in the background, curl /health expecting {"ok":true,"db":true}, kill it. If not, those two Done-when items are blocked_on_db.',
'- README.md: add a short "Run the API" section ONLY if /health really returned db:true against Neon; otherwise leave the docs-first wording untouched.',
'Commit message: "feat(api): elysia skeleton, prisma schema on neon, health".',
].join('\n')

BLOCKS['02-identity-consent'] = [
'YOUR BLOCK: docs/building-blocks/02-identity-consent.md (block 02, foundations, serial). You own apps/api; packages/shared only for an additive schema the contract requires.',
'- Endpoints exactly: POST /auth/login, GET /users/me, POST /consent/parent/approve, POST /consent/parent/revoke (it is cheap, include it). Nothing else.',
'- Session per the contract: HS256 signed token with SESSION_SECRET (Web Crypto or a maintained Elysia JWT plugin, no heavy dep), HttpOnly cookie nexora_session AND token in the login body; every protected route accepts cookie or Bearer; no session -> 401 unauthorized.',
'- AuthZ helpers requireRole, requireActiveYouth, requireLinkedParent(youthId) and one canReadYouth(user, youthId) implementing the ARCHITECTURE.md matrix. Teacher linkage has no column: hardcode the demo class as the three deniz ids with a "ponytail:" comment naming Class model as the Phase B upgrade. Parent linkage is User.parentId.',
'- Seed of the six block users as idempotent upserts, runnable as "bun run --filter nexora-api db:seed" (block 08 will extend the same file). Do not auto-seed on boot. Do not auto-activate youth.',
'- login persona deniz aliases deniz_balanced; unknown persona -> 400 validation_error. linkedYouthId: ece and mert -> usr_deniz, others null.',
'- approve/revoke: linked parent or admin only (teacher and youth -> 403 forbidden); both write a ConsentEvent (action, actorId); revoke sets status revoked and creates a DeletionRequest row with status pending and a "ponytail:" comment that the 30-day deletion job is a stub.',
'- Zod on every body; one global error handler mapping validation failures to the contract error body with a Turkish message (not Elysia default shape).',
'- Tests (Vitest, no HF): login deniz -> pending_parent_consent; ece approves usr_deniz -> active and ConsentEvent written; mert approve -> 403; selin (admin) approve -> 200; unknown persona -> 400; GET /users/me without session -> 401; the same request authorized by cookie and by Bearer both work. Mock the Prisma module so "bun run test" passes with no DATABASE_URL. If DATABASE_URL exists, ALSO add an integration test file against Neon (skipped when the env var is unset) that seeds, logs in, approves and restores usr_deniz to pending_parent_consent.',
'- The "pending youth cannot read score" test belongs to block 03: do not add a debug gate endpoint for it.',
'Commit message: "feat(api): demo identity, rbac and parent consent gate".',
].join('\n')

BLOCKS['03-signals-score'] = [
'YOUR BLOCK: docs/building-blocks/03-signals-score.md (block 03, foundations, serial, last before the parallel fan-out). You own packages/score and apps/api; packages/shared additively if a schema is missing.',
'- packages/score: computeScore(minutes) exactly per the ARCHITECTURE.md formula (50 + 30*valuableShare + 5*diversity - 40*harmfulShare - 20*max(0, entertainmentShare-0.5)/0.5, clamp 0-100, round). total === 0 -> throw a typed no-data error the API maps to 404 no_data. Reasons: evaluate the 6 conditions in ARCHITECTURE.md table order, rank candidates by absolute contribution to the score (harmful -40*share, entertainment -20*max(0,share-0.5)/0.5, valuable +30*share, diversity +5*diversity for the >=3 and <=1 rows, harmful-zero 0), take the top 3, emit them in table order, pad with the two filler strings so it is always exactly 3. Copy the Turkish strings byte for byte from ARCHITECTURE.md, except fix the obvious typo dengeni; note that in integration_notes.',
'- Vitest in packages/score FIRST: balanced 40/15/20/10/0/5/120/0 -> 80; risky 10/0/0/0/0/0/200/40 -> 38; productive 70/20/20/15/0/0/40/0 -> 93 (exact assertions, docs allow +-1); {} and all-zero -> the no-data path; reasons always 3 non-empty Turkish strings with no English category id leaking; the balanced reasons equal the docs/API.md example array in that exact order. If a fixture is off by more than 1, fix your math against the formula, never the formula against a guess.',
'- API POST /signals/category-summary: youth self; Zod validate, then findForbiddenKey at any depth -> 400 validation_error, then requireActiveYouth -> 403 consent_missing; period YYYY-MM-DD/YYYY-MM-DD with start <= end; unknown minute keys and negatives -> 400; total 0 -> 404 no_data; upsert CategorySummary on (youthId, periodStart, periodEnd), computeScore, store Score, return 201 { id, period, minutes, score } per API.md.',
'- API GET /score/current: youth self and active; parent/teacher must pass youthId and be linked (else 403 forbidden), linked youth not active -> 403 consent_missing; admin any; no rows -> 404 no_data; returns the latest Score with computedAt and period. POST /score/recompute only if it stays around 15 lines.',
'- Tests (Vitest, mocked Prisma so they run without a DB): pending youth POST signals -> 403 consent_missing; pending youth GET /score/current -> 403 consent_missing (the test deferred from block 02); { minutes: { science: 10 }, url: "https://x" } -> 400; nested hostname -> 400; unknown minute key -> 400; negative minutes -> 400; active youth POST balanced -> 201 with value 80, then GET /score/current returns the same value and reasons; GET with no rows -> 404 no_data; parent without youthId -> 400; parent for an unlinked youth -> 403. If DATABASE_URL exists, also run the Neon integration version with usr_deniz (approve, ingest, read, restore).',
'Commit message: "feat(score): rule engine v0.5 and privacy-safe signals ingest".',
].join('\n')

BLOCKS['04-llm-coach'] = [
'YOUR BLOCK: docs/building-blocks/04-llm-coach.md (block 04, fan-out). You run in PARALLEL with blocks 05 (apps/web), 06 (apps/mobile) and 07 (apps/extension) in separate git worktrees. You own apps/api ONLY. Do not edit packages/shared, packages/score, apps/web, apps/mobile, apps/extension or root config; if you truly need a root change, describe it in integration_notes instead.',
'- GET /reports/weekly and POST /tasks/:id/complete are not assigned to any other block: they are yours, per the contract shapes.',
'- GET /coach/recommendation: youth self only (parent/teacher/admin -> 403 forbidden), active (403 consent_missing), latest Score required (404 no_data).',
'- Prompt builder takes ONLY { minutes, score: { value, reasons }, completed_tasks: string[] } assembled from an explicit allow-list so a stray field can never be serialized; unit test asserts the serialized prompt contains no "http" even when the source object carries a sneaky url. Turkish system prompt: coach for ages 13-18, no diagnosis, no shame, JSON only.',
'- HF call with fetch (no SDK): HuggingFace OpenAI-compatible chat completions router, model HF_MODEL_ID, temperature <= 0.4, small max_tokens, AbortSignal.timeout about 20s, no streaming. Parse JSON out of the reply, validate with coachSchema from @nexora/shared, then a policy filter over every string (case-insensitive: teshis/teşhis, depresyon tanısı, bağımlısın, kötü çocuk, http://, https://). Any failure, or unset HF_TOKEN/HF_MODEL_ID, -> fallback. Never log prompts or raw HF bodies.',
'- apps/api/src/coach/fallback.ts: three Turkish entries for bands <50, 50-79, >=80 with three different task titles (the <50 title is "Kısa bir mola ve bir yetişkinle konuş"), never the word bağımlılık; each entry must itself pass coachSchema and the policy filter (test that).',
'- Response: the contract coach shape with source and header X-Nexora-Coach. Persist CoachRecommendation (source, shareText, taskId) and a Task row. Idempotent per score: if a CoachRecommendation already exists for the latest Score (createdAt >= score.computedAt), return it and its task instead of creating another; only when that recommendation is a fallback AND its task is still open may you try the model once more and replace the open task in place. Never replace a completed task.',
'- GET /reports/weekly per the contract: AuthZ matrix, missing youthId for parent/teacher/admin -> 400 validation_error, distribution filled with all 8 keys, trend = the latest score per period for the last <= 4 periods ascending, task = latest task { id, title, status } or null, share_text from the latest CoachRecommendation or null, week query optional (validate the format, select that period when given, latest otherwise). Never any hostname-shaped key.',
'- POST /tasks/:id/complete: youth self, active, the task must belong to the caller (else 404 no_data); sets completed, completedAt, badge degerli_adim; repeating it returns the same result.',
'- Tests (Vitest, mocked Prisma and a stubbed fetch so they run with no DB and no network): HF prose -> 200 source fallback; HF valid JSON -> source model; HF output containing bağımlısın or an https:// link -> fallback; HF_TOKEN unset -> 200 fallback; no score -> 404 no_data; pending consent -> 403; coach schema rejects 2 tips and eta_minutes 0 at the API boundary; prompt builder has no http; the three bands produce three different fallback task titles; report ready/empty/consent_missing shapes; a deep key scan of a ready report JSON finds no url, urls, hostname, hostnames, path or domain key; completing a task flips report task.status to completed; unknown task id -> 404.',
'- If DATABASE_URL exists (rule 6): run your Neon integration test with usr_deniz_productive only, restoring state afterwards. If you need a listening server use PORT=3104, never 3000 (another parallel worker may hold it).',
'Commit message: "feat(api): trendyol-llm coach with fallback, weekly report, task completion".',
].join('\n')

BLOCKS['05-web'] = [
'YOUR BLOCK: docs/building-blocks/05-web.md plus docs/DESIGN.md (Web IA, page copy, parent/teacher panels, tokens, a11y checklist). Block 05, fan-out: you run in PARALLEL with 04 (which is adding coach/report/task routes to apps/api right now), 06 and 07, in separate git worktrees. You own apps/web ONLY. Consume the API over HTTP per docs/API.md and the contract, import types from @nexora/shared read-only, and mock every endpoint in tests: do not wait for block 04 code and do not call it.',
'- TanStack Start (current stable) + Vite + Tailwind + TanStack Query + i18next/react-i18next with a single tr resource. No Next.js. Skip TanStack Form and Table (a persona select and a static report do not need them). Dev server port 5173. VITE_API_URL default http://localhost:3000. Client-side authenticated fetches with credentials: "include" are fine; mark it with a "ponytail:" comment instead of building SSR loaders.',
'- Pin react and react-dom to the exact version the latest stable Expo SDK pins (block 06 is adding Expo to this same workspace; check the SDK bundled versions via context7 or the expo package metadata) and record that version in integration_notes.',
'- Routes: / , /how-it-works , /privacy , /faq (public Header with nav Nasıl çalışır, Gizlilik, SSS, Giriş, and a Footer with KVKK links) and /app/parent , /app/teacher (AppShell with left nav Rapor, Gizlilik, Çıkış and a role badge). Unauthenticated /app/* shows the demo login (persona select Ece / Mert -> POST /auth/login) in place: do not add marketing pages that DESIGN.md does not list. Çıkış clears client state and returns to / (there is no logout endpoint; do not invent one).',
'- Parent panel: youth switcher Dengeli / Riskli / Üretken -> usr_deniz / usr_deniz_risky / usr_deniz_productive, GET /reports/weekly?youthId=. States: loading skeleton; 403 consent_missing -> "Veli onayı bekleniyor" plus a primary "Onayla" button calling POST /consent/parent/approve then refetching (teacher sees the waiting text without the button); empty (empty: true or 404) -> "Bu hafta henüz özet yok."; network/5xx -> message plus a "Tekrar dene" retry control; ready -> score as large text out of 100, the three reasons, distribution over 8 Turkish category labels with numeric minutes as text, trend (2 points is enough, no chart library), task title and status (Açık / Tamamlandı), share_text, and one short shared-goal sentence. KVKK strip "Bu panelde tam bağlantı veya alan adı gösterilmez." Headers: "Çocuğunun haftası" (parent) and "Sınıf özeti (demo)" (teacher).',
'- Copy verbatim from DESIGN.md: landing hero, sub, trust line "Ham URL yok. Mesaj yok. Arama kaydı yok.", the three cards, the four how-it-works steps with one placeholder frame, the /privacy collected-vs-never table as a real HTML table with the veli onayı, geri çekme (30 gün) and tanı koymaz sections, and the four FAQ entries. Turkish only, no English UI strings.',
'- Tokens from DESIGN.md as CSS variables; contrast >= 4.5:1; visible focus ring on dark; labels on every control; score meaning never encoded by color alone; a Google font is optional, a system fallback stack is fine.',
'- Playwright (tests first) in apps/web with the Vite dev server as webServer and the API mocked with page.route (no MSW): landing shows "Ölç → Anla → Koçla → Üret" and "Ham URL yok"; /privacy lists the never-collected items in a table; parent login -> ready report (mock the API.md example) showing 80, three reasons, task and share_text plus the KVKK strip; empty: true and 404 both show the empty copy; 500 shows the error and the retry control refetches; consent_missing shows the approve button, which POSTs approve and then renders the report; the teacher route shows "Sınıf özeti (demo)". Add @axe-core/playwright WCAG 2.1 AA checks with zero violations on /, /privacy and the ready parent report. Run bunx playwright install chromium if needed. Expose the suite as an apps/web "test:e2e" script and name the exact command in integration_notes.',
'- typecheck and lint must stay green for the whole workspace.',
'Commit message: "feat(web): public pages and parent/teacher weekly report".',
].join('\n')

BLOCKS['06-expo'] = [
'YOUR BLOCK: docs/building-blocks/06-expo.md plus docs/DESIGN.md (youth journey, the five screens, states, tokens). Block 06, fan-out: PARALLEL with 04 (apps/api coach/report/tasks), 05 and 07 in separate git worktrees. You own apps/mobile ONLY (replace the stub). Consume HTTP per docs/API.md and the contract, mock it in tests, do not wait for block 04.',
'- Latest stable Expo SDK with TypeScript and Expo Router, created with bunx create-expo-app into apps/mobile, then delete every template screen, asset and dep you do not use. Follow the current Expo monorepo guidance for Bun workspaces; if Expo demonstrably needs a root bunfig.toml linker setting, you may create that one root file and must say so in integration_notes.',
'- API client: EXPO_PUBLIC_API_URL, Bearer token from the login response body held in memory with a "ponytail:" comment about persistence.',
'- Five screens with DESIGN.md Turkish copy verbatim: 1 Onboarding (NEXORA wordmark, sub, Katıl, privacy line, "Verilerim nasıl kullanılır?" opening a short privacy snippet); 2 "Veli onayı bekleniyor" while status is pending_parent_consent, refetching GET /users/me on focus and on AppState foreground plus a manual refresh control; 3 "Bu haftaki dengen" with the large score value, exactly three reasons, a mini 8-category distribution with Turkish labels and numeric minutes, the KVKK line and loading / empty / error+retry states, where consent_missing routes back to screen 2; 4 coach with three tip cards and the task (title, steps, eta in dk) and CTA "Görevi tamamladım" calling POST /tasks/{task_id}/complete; 5 done with the degerli_adim badge, the share_text preview labelled "Velinle paylaşılacak özet" and CTA "Panele yansısın". Screens 3-5 are gated on users/me status active.',
'- Demo persona switch: long-press the wordmark -> Dengeli / Riskli / Üretken re-logs in as deniz_balanced / deniz_risky / deniz_productive. A "Veli onayını simüle et" control that logs in as ece and calls POST /consent/parent/approve may exist ONLY inside if (__DEV__) so it cannot ship in a production profile; test that it is absent when __DEV__ is false.',
'- Dark DESIGN.md tokens, accent ring at any score value (never red/green by score), accessibilityLabel and role on every control, contrast >= 4.5:1.',
'- Tests with jest-expo and @testing-library/react-native (the Expo-native runner is the right rung here even though other packages use Vitest), wired to the apps/mobile "test" script: waiting screen renders while pending and no score is fetched; the score screen renders exactly three reasons; the complete button calls POST /tasks/:id/complete against a mocked fetch; the simulate-approve control is absent without __DEV__; empty and error states render.',
'- Compile proof without a simulator: bunx expo export --platform android must succeed (add web if cheap); record the output line. The Done-when items that need the live API and seed (three personas showing different scores/tips, completing a task flipping report task.status) are deferred_to_integration: put the exact manual command sequence in evidence.',
'Commit message: "feat(mobile): expo youth app, five screens, three personas".',
].join('\n')

BLOCKS['07-extension'] = [
'YOUR BLOCK: docs/building-blocks/07-extension.md. Block 07, fan-out: PARALLEL with 04, 05 and 06 in separate git worktrees. You own apps/extension ONLY (replace the stub).',
'- Plain Manifest V3, no bundler and no framework: manifest.json, a service-worker background module, popup.html/js, options.html/js, and a dictionary module. Keep the logic in small pure functions (categorize(hostname), tick(state, category), buildSummaryBody(state, today)) exported from a module the service worker imports, so Vitest can test them against a fake chrome object.',
'- Hostname handling: derive it with new URL(tab.url).hostname inside a function, map it, drop it. Never store, send or log a url or hostname; any log line carries a category only. Suffix match: host === suffix || host.endsWith("." + suffix). Dictionary is exactly the six block entries; unknown hosts are ignored (no live harmful list: harmful minutes come from the seed).',
'- Accounting: a chrome.alarms 1-minute heartbeat adds one minute to chrome.storage.local "minutes" ({ category: n }) for the focused window active tab when not paused. Stored state is only minutes, periodStart (YYYY-MM-DD, UTC) and paused. Add a "ponytail:" comment for the 1-minute granularity and missing idle detection.',
'- Popup in Turkish: category totals with Turkish labels, "Özeti gönder" POSTing to {apiBase}/signals/category-summary with Authorization Bearer and body { period: periodStart + "/" + today, minutes }; on 201 show the returned score value and reset minutes and periodStart; on 403 consent_missing show "Veli onayı olmadan bu işlem yapılamaz."; other errors get a short Turkish message. Plus Duraklat/Devam et and Temizle controls and the line "Ham bağlantı toplanmaz; yalnızca kategori dakikaları."',
'- Options page: API base URL (default http://localhost:3000) and the bearer token; apps/extension/README.md shows the one curl line that obtains a token from POST /auth/login.',
'- Permissions: tabs, storage, alarms, and host_permissions only for the API origin. No content_scripts, no <all_urls>, no scripting, no webRequest.',
'- Tests (Vitest with a fake chrome): after five fake ticks across wikipedia, youtube and an unknown host the storage dump contains only minutes/periodStart/paused and no string containing http, a dot-domain, wikipedia or youtube; wikipedia and youtube increment the right categories and the unknown host increments nothing; the POST body passes signalsRequestSchema/categoryMinutesSchema from @nexora/shared and findForbiddenKey returns null; pause stops incrementing; a static scan of every source file finds no console call mentioning url or tab.url; the manifest has no <all_urls> and no content_scripts.',
'- Unpacked-load proof: prefer a Playwright test using chromium.launchPersistentContext with --load-extension that waits for the service worker and opens the popup page. If Chrome extension loading genuinely cannot run here, document the manual chrome://extensions Load unpacked step, mark that item not_done and paste the real error as evidence: never claim it works untested.',
'- Live POST item: if DATABASE_URL exists (rule 6), start the API from your worktree on PORT=3107, seed, approve usr_deniz_risky as ece, log in as deniz_risky for a token and run your send function against it expecting 201; restore the state. Otherwise blocked_on_db.',
'Commit message: "feat(extension): mv3 domain-to-category minutes, no url storage".',
].join('\n')

BLOCKS['08-demo-seed'] = [
'YOUR BLOCK: docs/building-blocks/08-demo-seed.md (block 08, serial, last). Blocks 00-07 are merged, verified and green. You may touch apps/api (seed and demo scripts), apps/web (the critical E2E), root package.json scripts, docs/ and README.md. Do not change score math, the privacy reject list, the consent gate or the coach schema.',
'- "bun run --filter nexora-api db:seed" idempotent: run it twice and prove identical state. It upserts the six users, leaves usr_deniz pending_parent_consent with no summary/score/task/coach rows (clearing that youth derived rows), and leaves usr_deniz_risky and usr_deniz_productive active (with ConsentEvent rows by usr_ece) carrying the DESIGN.md minutes and their computed scores, plus one earlier period per active persona so the trend has two points. Derive every score with packages/score, never hand-written numbers. Use the fixed demo period 2026-09-08/2026-09-15 and the preceding week.',
'- "bun run demo:ingest-balanced" logs in as deniz and POSTs the balanced minutes through the real API, failing with a clear message if Deniz is not approved yet.',
'- docs/DEMO.md: the 5-7 minute jury script from the block with exact commands (install, env, migrate, seed, api, web, expo native with the Expo-web fallback stated explicitly, ingest), who clicks what, the expected 80 / 38 / 93, the "güvenli yedek yanıt" line for an HF outage, and how to reset (re-run db:seed). Someone not on the team must be able to follow it with no hidden wiki. Link it from README.md.',
'- Critical E2E (Playwright, real web + real API on Neon, HF_TOKEN unset) in apps/web behind its own script so the mocked suite stays DB-free: seed, log in as Ece on the web, approve Deniz through the UI, ingest the balanced week, fetch the coach as Deniz and complete the task over the API, then assert the parent report shows 80, task Tamamlandı and the share_text, and that the risky and productive switcher entries show 38 and 93.',
'- README.md becomes honest about the built state: install, .env (Neon), migrate, seed, run each app, run the tests, link DEMO.md. Every command you claim must have been run by you.',
'Commit message: "feat(demo): idempotent seed, ingest script, jury script and critical e2e".',
].join('\n')

const REVIEWER = [
'REVIEWER RULES. You are the adversarial reviewer in the NEXORA Phase A workflow and you do not inherit any orchestrator chat. Repo: ' + ROOT + ' (main checkout, branch phase-a). Windows 11, Git Bash and PowerShell, bun 1.3.14.',
'Do NOT edit tracked files, do NOT commit, do NOT add dependencies (running bun install, bunx playwright install, tests and servers is expected). Your job is to find every reason the work is NOT done.',
'Fail closed: a Done-when item without passing evidence, a required test that is missing, skipped, tautological or mocking away the very logic under test, or any AGENTS.md hard-constraint violation is a failure. Report real command output; never assume, never take a worker word for it.',
'Neon only: never start a local database. The Neon URL is in the gitignored root .env: use it, never print it. Start servers in the background and kill them when done.',
'Failure kinds: defect (code or behavior wrong), missing_test (required test absent or not asserting), blocked_on_db (checkable only with a live DATABASE_URL, which does not exist). pass = true only when there are zero defect and zero missing_test failures.',
].join('\n')

const GATE_BODY = [
'SCOPE: foundations gate for blocks 00, 01, 02 and 03. Read AGENTS.md, docs/PRIVACY.md, docs/API.md, docs/ARCHITECTURE.md, docs/DESIGN.md (seed minutes) and those four block files. Four parallel workers start from this commit next, so contract drift in packages/shared or in apps/api auth is a defect, not a nit.',
'1. git status --porcelain must be clean (uncommitted work is invisible to the worktrees that start next) and git log must show the block commits.',
'2. From the repo root: bun install, bun run typecheck, bun run lint, bun run test. All green.',
'3. Audit every Done-when checkbox and every test named in the Tests sections of blocks 00-03: find the test, confirm what it asserts, confirm it ran.',
'4. Score: recompute the three DESIGN.md fixtures from the ARCHITECTURE.md formula with a throwaway bun -e script that does NOT import packages/score, compare with computeScore (80 / 38 / 93), check the balanced reasons equal the docs/API.md example array in order, and check the total === 0 no-data path.',
'5. packages/shared exports everything block 00 lists plus the contract schemas below, strict where docs/API.md says unknown keys are errors.',
'6. Privacy: no url/hostname/path/rawContent-shaped columns in prisma/schema.prisma; forbidden keys rejected at any depth on POST /signals/category-summary; no logging of query strings, bodies or headers.',
'7. Consent and AuthZ: pending youth gets 403 consent_missing on signals and on score; teacher cannot approve; unlinked parent gets 403; the ARCHITECTURE.md matrix holds for every route that exists; both cookie and Bearer authenticate; login returns a token.',
'8. Enumerate every registered Elysia route: anything outside docs/API.md plus GET /health is a defect.',
'9. DB: if the root .env has DATABASE_URL, run the api migrate-deploy script, the Neon integration tests, start the API in the background and curl GET /health expecting {"ok":true,"db":true}, then smoke it live (login deniz -> GET /score/current 403; login ece -> approve usr_deniz; login deniz -> POST the balanced minutes -> 201 value 80 -> GET /score/current 80), then re-run db:seed if that restores the demo state and report the state you leave behind. Kill the server. With no DATABASE_URL these items are blocked_on_db, not defects.',
'Leave the ponytail array empty for this gate.',
].join('\n')

function verifyBody(fanResults, mergeResult) {
  return [
    'SCOPE: full Phase A verification after fan-in, blocks 00 through 07. Read AGENTS.md (Testing bar and hard constraints), docs/PRIVACY.md (Tests that must exist), docs/API.md, docs/ARCHITECTURE.md (AuthZ, formula), docs/DESIGN.md (copy, tokens, a11y checklist) and docs/building-blocks/00 through 07.',
    'Fan-out worker self-reports, including every item they marked deferred_to_integration, which YOU must now verify for real: ' + JSON.stringify(fanResults),
    'Fan-in merge report: ' + JSON.stringify(mergeResult),
    '1. git status clean; git worktree list shows no leftover worktree holding unmerged work.',
    '2. Root: bun install, bun run typecheck, bun run lint, bun run test. Then every extra suite: apps/web Playwright (bunx playwright install chromium if needed), apps/mobile tests plus bunx expo export --platform android, apps/extension tests including its unpacked-load test.',
    '3. Done-when audit item by item for blocks 00-07, plus every row of the AGENTS.md Testing bar and every line of the docs/PRIVACY.md "Tests that must exist" list: each needs a real passing test that actually asserts the behavior.',
    '4. Contract drift between the parallel workers: the paths, bodies, headers, credentials and response fields the web, mobile and extension actually use (token in the login body, task_id, source, empty: true, consent_missing handling, category labels) against the real apps/api routes and @nexora/shared schemas; CORS origins must cover 5173 and 8081.',
    '5. Hard-constraint sweep with grep evidence: HF token or huggingface references in apps/web, apps/mobile or apps/extension; console calls touching url/tab.url/hostname in apps/extension; <all_urls> or content_scripts in the manifest; url/hostname/path columns in prisma; logging of prompts, raw HF bodies or query strings; out-of-scope deps in any package.json (next, @nestjs, pg-boss, pgvector, ollama, llama, aws-sdk s3, bullmq, redis); package-lock.json/yarn.lock/pnpm-lock.yaml anywhere; routes outside docs/API.md plus GET /health; the strings bağımlısın, bağımlılık or kötü çocuk outside the coach policy filter list; English UI strings on the critical screens (consent, score, report, privacy); the Expo simulate-approve control reachable without __DEV__.',
    '6. Live integration (only if the root .env has DATABASE_URL; run the API with HF_TOKEN empty so the fallback path is what the jury sees): migrate deploy, db:seed, start the API on PORT 3000 in the background. For each of usr_deniz, usr_deniz_risky, usr_deniz_productive: approve as ece, POST the DESIGN.md minutes as that youth and expect 80 / 38 / 93; GET /coach/recommendation and expect 200, a valid coachResponseSchema body, header X-Nexora-Coach fallback, and three different task titles across the three personas; GET /reports/weekly?youthId= as ece and expect the ready shape with no url/urls/hostname/hostnames/path/domain key at any depth; POST /tasks/{task_id}/complete as the youth and confirm the report flips to completed; confirm a pending youth gets 403 on signals and coach and that revoke produces consent_missing. Then start the web dev server against this API and confirm through Playwright or the chrome-devtools MCP that /app/parent renders the real report. Kill every server. Without DATABASE_URL all of this is blocked_on_db.',
    '7. ponytail-review of git diff ' + BASE_SHA + '..HEAD, excluding bun.lock, prisma migrations and generated Expo template assets. One finding per location: tag delete | stdlib | native | yagni | shrink, what to cut, what replaces it, and touches_protected = true when it touches input validation at the API boundary, the URL-key reject, the consent gate, score math or fixtures, the coach schema/policy/fallback, WCAG on critical screens, empty/error states, or the tests for any of those. Only real wins (dead code, duplicated helpers, unused deps, speculative abstractions or config, reimplemented stdlib), never taste.',
  ].join('\n')
}

function demoBody(demoResult) {
  return [
    'SCOPE: block 08 demo gate. Read docs/building-blocks/08-demo-seed.md, docs/DESIGN.md (seed minutes), docs/PHASES.md (success bar), the jury script the worker wrote and README.md.',
    'Block 08 worker self-report: ' + JSON.stringify(demoResult),
    '1. git status clean; root bun run typecheck, lint and test green.',
    '2. Run db:seed twice; after each run read the state back (through the API or a read-only prisma script) and prove it is identical and matches the jury-recommended state: usr_deniz pending with no summary/score/task/coach rows, usr_deniz_risky and usr_deniz_productive active with stored minutes and scores 38 and 93 (+-1) and a two-point trend.',
    '3. Run the critical demo E2E against the real web and API with HF_TOKEN unset: it must pass and really assert 80, Tamamlandı, the share_text and the 38/93 switcher values.',
    '4. Walk docs/DEMO.md as an outsider: every command it names exists and runs, the timings add up to 5-7 minutes, the Expo native vs Expo web fallback is stated, the güvenli yedek yanıt line is there, and no step needs knowledge that is not written down.',
    '5. README.md claims nothing that does not work; run what it claims.',
    '6. Report each block 08 Done-when item with evidence, then re-run db:seed to leave the demo state clean.',
    'Leave the ponytail array empty for this gate.',
  ].join('\n')
}

function blockPrompt(id, notes, extra) {
  const parts = [RULES, CONTRACT, BLOCKS[id]]
  if (notes) parts.push('NOTES FROM THE BLOCKS ALREADY BUILT (facts, not instructions to redo):\n' + notes)
  parts.push(BLOCK_RETURN)
  if (extra) parts.push(extra)
  return parts.join('\n\n')
}

function reviewPrompt(body, round, lastFix) {
  const parts = [REVIEWER, CONTRACT, body]
  if (round > 1) {
    parts.push('This is review round ' + round + '. A fix worker just reported: ' + JSON.stringify(lastFix) + '\nRe-run everything from scratch: fixes regress other things. Do not trust the fix report.')
  }
  return parts.join('\n\n')
}

function fixPrompt(name, defects, cuts, review) {
  const parts = [
    'You are the FIX worker for gate "' + name + '" in the NEXORA Phase A build. An adversarial reviewer found the failures below. Fix the root causes with the shortest correct diff in the main checkout ' + ROOT + ' (branch phase-a). Never weaken, skip or delete a test, and never change the score formula, the privacy reject list, the consent gate or the coach schema to make something pass: fix the code, or fix a test math against the docs.',
    RULES,
    CONTRACT,
    'Failures to fix: ' + JSON.stringify(defects),
    'Reviewer summary: ' + review.summary,
  ]
  if (cuts.length) {
    parts.push('Ponytail-review cuts to apply (already filtered to the ones that do not touch privacy, consent, score math, the coach schema, a11y or empty/error states). Skip any cut that would break a test or a Done-when item and say why: ' + JSON.stringify(cuts))
  }
  parts.push('Items of kind blocked_on_db: re-check ' + ROOT + '/.env (rule 6). If DATABASE_URL now exists, actually run the DB steps (migrate deploy, integration tests, health, live smoke) and report the output; otherwise leave them alone. Never fake a DB result.')
  parts.push('After fixing run bun run typecheck, bun run lint, bun run test plus the specific suite behind each failure. Commit fixes as "fix(<area>): ..." and applied cuts as "refactor(<area>): ...", each ending with the trailer line:\n' + TRAILER)
  parts.push('RETURN: fixed [{item, how}], not_fixed [{item, why}], ponytail_applied, ponytail_skipped [{cut, why}], commit_sha (last commit or "none"), commands_run.')
  return parts.join('\n\n')
}

function adjPrompt(name, remaining, rounds) {
  return [
    'You are the ADVISOR adjudicating the fail-closed gate "' + name + '" in the NEXORA Phase A build. After ' + rounds + ' fix round(s) the reviewer still reports the failures below.',
    'For each one, inspect the repo at ' + ROOT + ' yourself (read the files, run the named test or command) and decide: blocking (a genuine Done-when, AGENTS.md Testing-bar, hard-constraint or contract violation) or dismissed (a clear false positive, already fixed, or outside every block Done when and the hard constraints). Default to blocking whenever you are not certain. Do not edit files, do not commit, never print .env values, never start a local database.',
    'Docs: AGENTS.md, docs/PRIVACY.md, docs/API.md, docs/ARCHITECTURE.md, docs/building-blocks/.',
    'Remaining failures: ' + JSON.stringify(remaining),
    'Fix history: ' + JSON.stringify(rounds),
  ].join('\n\n')
}

function gaps(r, allowDeferred) {
  if (!r) return [{ item: 'worker returned null (stopped or died)', status: 'not_done', evidence: '' }]
  const bad = r.done_when.filter(function (d) {
    if (d.status === 'done') return false
    if (d.status === 'blocked_on_db' && !r.db_available) return false
    if (d.status === 'deferred_to_integration' && allowDeferred) return false
    return true
  })
  if (!/^[0-9a-f]{7,40}$/i.test(r.commit_sha || '')) bad.push({ item: 'no commit sha returned', status: 'not_done', evidence: String(r.commit_sha) })
  return bad
}

function defectsOf(v) {
  const f = (v.failures || []).filter(function (x) { return x.kind !== 'blocked_on_db' })
  if (!f.length && v.pass === false) return [{ block: 'unknown', item: 'reviewer set pass=false without listing a failure', kind: 'defect', evidence: v.summary, fix_hint: 'investigate the reviewer summary' }]
  return f
}

async function verifyLoop(name, phaseName, body, maxRounds, allowPonytail) {
  let v = await agent(reviewPrompt(body, 1, null), { label: name + ':review#1', phase: phaseName, schema: VERIFY_SCHEMA, model: 'sonnet' })
  const rounds = []
  let ponytailDone = !allowPonytail
  for (let round = 1; v && round <= maxRounds; round++) {
    const defects = defectsOf(v)
    const cuts = ponytailDone ? [] : (v.ponytail || []).filter(function (p) { return !p.touches_protected })
    if (!defects.length && !cuts.length) break
    log(name + ': round ' + round + ' — ' + defects.length + ' defect(s), ' + cuts.length + ' safe cut(s)')
    const fx = await agent(fixPrompt(name, defects, cuts, v), { label: name + ':fix#' + round, phase: phaseName, schema: FIX_SCHEMA })
    ponytailDone = true
    rounds.push({ review: v.summary, defects: defects.length, fix: fx })
    v = await agent(reviewPrompt(body, round + 1, fx), { label: name + ':review#' + (round + 1), phase: phaseName, schema: VERIFY_SCHEMA, model: 'sonnet' })
  }
  if (!v) return { green: false, last: null, rounds: rounds, remaining: [{ item: 'reviewer returned null' }] }
  let remaining = defectsOf(v)
  let adjudication = null
  if (remaining.length) {
    adjudication = await agent(adjPrompt(name, remaining, rounds), { label: name + ':adjudicate', phase: phaseName, schema: ADJ_SCHEMA, model: 'fable' })
    if (adjudication) remaining = adjudication.blocking
  }
  return { green: remaining.length === 0, last: v, rounds: rounds, adjudication: adjudication, remaining: remaining }
}

const results = {}
const notes = []

function report(status, extra) {
  const blocks = {}
  for (const k of Object.keys(results)) {
    const r = results[k]
    blocks[k] = r ? {
      commit: r.commit_sha,
      db_available: r.db_available,
      done_when: r.done_when.map(function (d) { return d.status + ': ' + d.item }),
      skipped_ponytail: r.skipped_ponytail,
      integration_notes: r.integration_notes,
    } : null
  }
  return Object.assign({ status: status, blocks: blocks }, extra || {})
}

// --- phase 1: foundations, strictly serial -------------------------------
phase('foundations')
const FOUNDATIONS = ['00-monorepo', '01-api', '02-identity-consent', '03-signals-score']
for (const id of FOUNDATIONS) {
  const notesText = notes.join('\n')
  let r = await agent(blockPrompt(id, notesText), { label: id, phase: 'foundations', schema: BLOCK_SCHEMA })
  let g = gaps(r, false)
  if (g.length) {
    log(id + ': ' + g.length + ' Done-when gap(s), one repair attempt')
    const extra = 'REPAIR PASS: a previous attempt on this block ended with these unmet items: ' + JSON.stringify(g) + '\nIts committed work is already in the tree. Continue from the current repo state, finish only what is missing, then commit.'
    r = await agent(blockPrompt(id, notesText, extra), { label: id + ':repair', phase: 'foundations', schema: BLOCK_SCHEMA })
    g = gaps(r, false)
  }
  results[id] = r
  if (g.length) {
    log('FAIL CLOSED at ' + id)
    return report('stopped-at-' + id, { unmet: g })
  }
  notes.push('[' + id + '] ' + r.integration_notes)
  log(id + ' done ' + r.commit_sha.slice(0, 8) + (r.db_available ? '' : ' (DB items blocked: no DATABASE_URL yet)'))
}

const gate = await verifyLoop('foundations-gate', 'foundations', GATE_BODY, 2, false)
if (!gate.green) {
  log('FAIL CLOSED at the foundations gate: fan-out not started')
  return report('stopped-at-foundations-gate', { gate: { summary: gate.last && gate.last.summary, remaining: gate.remaining, rounds: gate.rounds.length } })
}
log('foundations green — fanning out 04-07 in worktrees')

// --- phase 2: fan-out, disjoint trees ------------------------------------
phase('fan-out')
const FAN = ['04-llm-coach', '05-web', '06-expo', '07-extension']
const foundationNotes = notes.join('\n')
const fan = await parallel(FAN.map(function (id) {
  return function () {
    return agent(blockPrompt(id, foundationNotes), { label: id, phase: 'fan-out', schema: BLOCK_SCHEMA, isolation: 'worktree' })
  }
}))
FAN.forEach(function (id, i) { results[id] = fan[i] })
const nullSlots = FAN.filter(function (id, i) { return !fan[i] })
const fanGaps = {}
FAN.forEach(function (id, i) {
  const g = gaps(fan[i], true)
  if (g.length) fanGaps[id] = g
})
if (nullSlots.length) log('null fan-out slot(s): ' + nullSlots.join(', ') + ' — block 08 will not start')

const toMerge = FAN.map(function (id, i) { return { block: id, r: fan[i] } })
  .filter(function (x) { return x.r && /^[0-9a-f]{7,40}$/i.test(x.r.commit_sha) })
if (!toMerge.length) return report('stopped-at-fan-out', { fanGaps: fanGaps, nullSlots: nullSlots })

const mergePrompt = [
  'You are the FAN-IN integrator for the NEXORA Phase A build. Four parallel workers (blocks 04 api coach/report/tasks, 05 web, 06 expo, 07 extension) committed inside separate git worktrees. Merge their commits into the main checkout ' + ROOT + ' on branch phase-a. You do not write feature code.',
  'Worker results: ' + JSON.stringify(toMerge.map(function (x) { return { block: x.block, sha: x.r.commit_sha, branch: x.r.branch, worktree: x.r.worktree_path, notes: x.r.integration_notes } })),
  '1. In ' + ROOT + ': confirm the branch is phase-a and git status is clean apart from ignored files.',
  '2. Merge each sha in order 04, 05, 06, 07 with git merge --no-ff and message "merge: block NN <area>" ending with the trailer line: ' + TRAILER + '. Expect conflicts only in bun.lock, root package.json, bunfig.toml or .gitignore: for bun.lock take either side and regenerate with bun install, for the others take the union so no worker loses a line. A conflict inside apps/* or packages/* means stop and report it in unresolved.',
  '3. bun install at the root. Resolve workspace-level breakage only: duplicate React majors between apps/web and apps/mobile (prefer the version the Expo SDK pins), workspace resolution, missing hoisted binaries. Commit as "chore(repo): integrate fan-out lockfile" with the trailer.',
  '4. Run bun run typecheck, bun run lint and bun run test and record the real results. Do not fix feature bugs: the verify phase owns those. Only fix integration breakage you caused by merging.',
  '5. For each worker worktree path that is not the main checkout: if its HEAD is an ancestor of phase-a (git merge-base --is-ancestor) and git -C <path> status --porcelain is empty, remove it with git worktree remove (--force only when the leftovers are gitignored, e.g. node_modules or a copied .env). Leave anything else in place and say so in notes.',
  'Never push. Never rewrite existing commits. Never print .env values.',
  'RETURN: merged [{block, sha, ok, note}], unresolved [strings], head_sha, removed_worktrees, commands_run, notes.',
].join('\n\n')
const merge = await agent(mergePrompt, { label: 'fan-in:merge', phase: 'fan-out', schema: MERGE_SCHEMA })
if (!merge || merge.unresolved.length) {
  log('FAIL CLOSED at fan-in merge')
  return report('stopped-at-fan-in', { merge: merge, fanGaps: fanGaps, nullSlots: nullSlots })
}
log('merged ' + merge.merged.length + ' block(s) into phase-a at ' + String(merge.head_sha).slice(0, 8))

// --- phase 3: verify, fail closed ----------------------------------------
phase('verify')
const fanSelfReports = FAN.map(function (id, i) {
  return fan[i] ? { block: id, done_when: fan[i].done_when, integration_notes: fan[i].integration_notes, skipped: fan[i].skipped_ponytail } : { block: id, done_when: [], integration_notes: 'WORKER RETURNED NULL', skipped: [] }
})
const verify = await verifyLoop('verify', 'verify', verifyBody(fanSelfReports, merge), 2, true)
const dbReady = !!(verify.last && verify.last.db_available)
if (!verify.green || nullSlots.length || !dbReady) {
  const why = []
  if (!verify.green) why.push('verify not green')
  if (nullSlots.length) why.push('null fan-out slot: ' + nullSlots.join(', '))
  if (!dbReady) why.push('no DATABASE_URL: seed, migrations and the demo E2E cannot be proven')
  log('block 08 not started — ' + why.join('; '))
  return report('stopped-before-demo', {
    reason: why,
    verify: { summary: verify.last && verify.last.summary, remaining: verify.remaining, rounds: verify.rounds.length, ponytail: verify.last && verify.last.ponytail },
    fanGaps: fanGaps,
  })
}

// --- phase 4: demo -------------------------------------------------------
phase('demo')
const demoNotes = notes.concat(fanSelfReports.map(function (f) { return '[' + f.block + '] ' + f.integration_notes })).join('\n') + '\nVERIFY SUMMARY: ' + verify.last.summary
let demo = await agent(blockPrompt('08-demo-seed', demoNotes), { label: '08-demo-seed', phase: 'demo', schema: BLOCK_SCHEMA })
let demoGaps = gaps(demo, false)
if (demoGaps.length) {
  const extra = 'REPAIR PASS: a previous attempt left these items unmet: ' + JSON.stringify(demoGaps) + '\nContinue from the current repo state and finish them.'
  demo = await agent(blockPrompt('08-demo-seed', demoNotes, extra), { label: '08-demo-seed:repair', phase: 'demo', schema: BLOCK_SCHEMA })
  demoGaps = gaps(demo, false)
}
results['08-demo-seed'] = demo
if (demoGaps.length) return report('stopped-at-08', { unmet: demoGaps, verify: { summary: verify.last.summary } })

const demoGate = await verifyLoop('demo-gate', 'demo', demoBody({ done_when: demo.done_when, integration_notes: demo.integration_notes }), 2, false)
return report(demoGate.green ? 'phase-a-complete' : 'demo-gate-failed', {
  verify: { summary: verify.last.summary, ponytail_findings: verify.last.ponytail.length, rounds: verify.rounds.length },
  demo_gate: { green: demoGate.green, summary: demoGate.last && demoGate.last.summary, remaining: demoGate.remaining },
  head: merge.head_sha,
})