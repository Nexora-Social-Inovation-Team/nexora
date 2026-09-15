# API contract v0.5

Base URL (dev): `http://localhost:3000` (exact port is set in the API app).

Transport: REST JSON. Validate every request and response with **Zod**. Publish OpenAPI from Elysia.

Auth (MVP): demo login returns a session cookie or JWT. All `/users`, `/consent`, `/signals`, `/score`, `/coach`, `/reports`, `/tasks` routes require a valid session except `POST /auth/login`.

## Shared types

```ts
type Role = "youth" | "parent" | "teacher" | "admin";

type AccountStatus = "pending_parent_consent" | "active" | "revoked";

type CategoryId =
  | "science"
  | "arts"
  | "sports"
  | "culture"
  | "entrepreneurship"
  | "national_memory"
  | "entertainment"
  | "harmful";

type CategoryMinutes = Partial<Record<CategoryId, number>>; // minutes, >= 0, integers preferred

type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "consent_missing"
  | "no_data"
  | "validation_error"
  | "upstream_unavailable";

type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string; // Turkish, safe to show
  };
};
```

Error HTTP mapping:

| code | status |
|---|---|
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `consent_missing` | 403 |
| `no_data` | 404 |
| `validation_error` | 400 |
| `upstream_unavailable` | 503 |

`message` examples:

- `consent_missing`: `"Veli onayı olmadan bu işlem yapılamaz."`
- `no_data`: `"Henüz kategori özeti yok."`

## Endpoints

### `POST /auth/login`

Demo-only. Accepts a persona or email-less role switch for the jury.

Request:

```json
{
  "persona": "deniz"
}
```

`persona`: `deniz` | `ece` | `mert` | `selin` | `deniz_balanced` | `deniz_risky` | `deniz_productive`

`deniz` aliases `deniz_balanced`.

Response `200`:

```json
{
  "user": {
    "id": "usr_deniz",
    "role": "youth",
    "status": "pending_parent_consent",
    "displayName": "Deniz",
    "linkedYouthId": null
  }
}
```

Parent `ece` has `"linkedYouthId": "usr_deniz"`. Teacher `mert` likewise for the demo class (one youth is enough in MVP).

### `GET /users/me`

Response `200`: same `user` object as login.

### `POST /consent/parent/approve`

Caller must be `parent` linked to the youth, or `admin`.

Request:

```json
{
  "youthId": "usr_deniz"
}
```

Response `200`:

```json
{
  "youthId": "usr_deniz",
  "status": "active",
  "approvedAt": "2026-09-15T10:00:00.000Z"
}
```

If the caller is not the linked parent: `403 forbidden`.

### `POST /consent/parent/revoke` (optional MVP)

Request: `{ "youthId": "usr_deniz" }`

Response `200`: `{ "youthId": "usr_deniz", "status": "revoked", "revokedAt": "..." }`

After revoke, signals/score/coach return `consent_missing`.

### `POST /signals/category-summary`

Youth session, `status === 'active'`. Extension and seed scripts call this.

Request:

```json
{
  "period": "2026-09-08/2026-09-15",
  "minutes": {
    "science": 40,
    "arts": 15,
    "sports": 20,
    "culture": 10,
    "entrepreneurship": 0,
    "national_memory": 5,
    "entertainment": 120,
    "harmful": 0
  }
}
```

- `period` is an inclusive date range `YYYY-MM-DD/YYYY-MM-DD` (ISO week-ish is fine; do not invent time zones beyond UTC dates).
- Unknown keys in `minutes` → `validation_error`.
- Presence of `url`, `urls`, `hostname`, `hostnames`, `path`, `title`, `content` at any depth → `400 validation_error` (privacy contract).
- Negative minutes → `validation_error`.

Response `201`:

```json
{
  "id": "sig_123",
  "period": "2026-09-08/2026-09-15",
  "minutes": {
    "science": 40,
    "entertainment": 120
  },
  "score": {
    "value": 80,
    "reasons": [
      "Eğlence kategorisi sürenin çoğunu kaplıyor.",
      "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
      "Birden fazla değerli kategoride zaman geçirmişsin."
    ]
  }
}
```

Ingest **recomputes and stores** the current score (same rules as `GET /score/current`).

`403 consent_missing` if not active.

### `GET /score/current`

Youth: own score. Parent/teacher: linked youth via `?youthId=usr_deniz` (required for those roles).

Response `200`:

```json
{
  "youthId": "usr_deniz",
  "value": 80,
  "reasons": [
    "Eğlence kategorisi sürenin çoğunu kaplıyor.",
    "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
    "Birden fazla değerli kategoride zaman geçirmişsin."
  ],
  "computedAt": "2026-09-15T10:05:00.000Z",
  "period": "2026-09-08/2026-09-15"
}
```

`404 no_data` if no summary yet. `403 consent_missing` if youth not active (parent may still see a waiting state via `GET /users/me` / report empty state — do not leak summaries).

### `POST /score/recompute` (optional)

Re-runs the rule engine on the latest summary. Same response as `GET /score/current`.

### `GET /coach/recommendation`

Requires active youth and an existing score. Builds a constrained prompt from **summary-only** fields (see `ARCHITECTURE.md`). Calls HuggingFace Trendyol-LLM. Parses JSON with Zod.

Response `200`:

```json
{
  "tips": [
    "Bu hafta eğlence süren yüksek; yarın 15 dakikalık bir bilim videosu seç.",
    "Skorunun nedenlerini kendin seçtiğin bir hedefe bağla.",
    "Ürettiğin kısa bir içerik, tüketimi dengeler."
  ],
  "task": {
    "title": "15 dakikalık bilim molası",
    "steps": [
      "İlgini çeken bir bilim konusunu seç.",
      "15 dakika boyunca yalnızca o konuya bak.",
      "Bir cümleyle ne öğrendiğini yaz."
    ],
    "eta_minutes": 15
  },
  "share_text": "Deniz bu hafta eğlence süresini dengelemek için kısa bir bilim görevi seçti."
}
```

Rules:

- `tips` length **exactly 3**.
- `task.steps` length 2–5.
- `eta_minutes` integer 5–30.
- `share_text` one sentence, parent-safe, no diagnosis, no URLs.
- Invalid or unsafe model output → **do not 500**. Return a canned fallback that still matches this schema, and set header `X-Nexora-Coach: fallback` (or a `source: "fallback"` field).

`404 no_data` without a score. `403 consent_missing` if not active. `503 upstream_unavailable` only if you choose not to fallback; **prefer fallback**.

### `GET /reports/weekly`

Parent or teacher (youth may also read own report).

Query: `youthId` (required for parent/teacher), optional `week=YYYY-MM-DD` (week start).

Response `200`:

```json
{
  "youthId": "usr_deniz",
  "period": "2026-09-08/2026-09-15",
  "score": {
    "value": 80,
    "reasons": [
      "Eğlence kategorisi sürenin çoğunu kaplıyor.",
      "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
      "Birden fazla değerli kategoride zaman geçirmişsin."
    ]
  },
  "distribution": {
    "science": 40,
    "arts": 15,
    "sports": 20,
    "culture": 10,
    "entrepreneurship": 0,
    "national_memory": 5,
    "entertainment": 120,
    "harmful": 0
  },
  "trend": [
    { "period": "2026-09-01/2026-09-08", "value": 58 },
    { "period": "2026-09-08/2026-09-15", "value": 80 }
  ],
  "task": {
    "id": "task_abc",
    "title": "15 dakikalık bilim molası",
    "status": "open"
  },
  "share_text": "Deniz bu hafta eğlence süresini dengelemek için kısa bir bilim görevi seçti."
}
```

Empty: `200` with `score: null`, `distribution: {}`, `trend: []`, and `empty: true` **or** `404 no_data`. **Web must handle both empty and error.** Prefer `200` + `empty: true` for the panel empty state.

Never include hostnames.

### `POST /tasks/:id/complete`

Youth. Marks the current coach task complete; weekly report `task.status` becomes `"completed"`.

Response `200`:

```json
{
  "id": "task_abc",
  "status": "completed",
  "completedAt": "2026-09-15T11:00:00.000Z",
  "badge": "degerli_adim"
}
```

Unknown id → `404 no_data`.

## Out of contract

Do not add: social login, password reset, file upload, admin CRUD, webhook receivers, GraphQL, feed ingest, URL ingest.

Health (allowed extra): `GET /health` → `{ "ok": true }`.
