# Privacy and KVKK contract

This is a hard engineering contract. Violating it is a bug, not a product decision.

Youth accounts are for ages 13–18. A minor account **must not** become `active` or persist signals/scores/coach output until a parent has approved.

## Collected (consented summaries only)

| Data | Example | Who sees it |
|---|---|---|
| Category-minute summaries | `{ science: 40, entertainment: 120 }` | Youth; parent/teacher as aggregates |
| Score + reasons | `{ value: 72, reasons: [3 Turkish strings] }` | Youth; parent/teacher |
| Task / badge progress | task id, completed_at | Youth; parent/teacher (progress, not raw activity) |
| Parent consent state | `pending_parent_consent` / `active` / `revoked` | Youth, parent, admin |
| Demo identity | display name, role | The signed-in user |

Minutes are **category totals**, never a list of visits.

## Never collected, stored, logged, or transmitted

- Raw URLs or full host+path
- Page HTML/text
- Messages (DM, comments, captions)
- Search queries
- Form fields / passwords
- Screenshots of feeds
- Precise GPS
- Contact lists

The extension may **read the registrable domain in memory** to map `youtube.com` → `entertainment`. It must not persist the URL or hostname in API payloads, database columns, or logs.

Parent and teacher UIs show **category trends**, never hostnames.

## Consent gate

```
youth registers  →  status = pending_parent_consent
parent approves  →  status = active          → signals/score/coach allowed
parent revokes   →  status = revoked         → no new processing; deletion clock starts
```

Rules:

- `POST /signals/category-summary`, score recompute, and coach generation **fail** with `consent_missing` unless `status === 'active'`.
- Consent is revocable. MVP implements `POST /consent/parent/revoke` as optional but should exist if time allows.
- Withdrawn-consent data: deletion process within **30 days**. Phase A: a deletion request row + job stub is enough; do not pretend GDPR erasure is fully automated.
- Explain data categories separately in the privacy UI (`docs/DESIGN.md` copy).

## Logging and observability

- Log request ids, user ids, role, status codes, durations.
- Do **not** log URL, hostname, User-Agent page URLs, prompt dumps that contain anything beyond category summaries, or raw HF payloads with PII (there should be no PII in prompts anyway).
- Sentry/OTel in Phase A: only if it cannot capture URLs. Prefer off until the redaction story is real.

## Roles and minimization

| Role | May see |
|---|---|
| Youth | Own summaries, score, coach, tasks |
| Parent | Linked youth: weekly category distribution, score, reasons, shared goal, coach `share_text` |
| Teacher | Class aggregates; individual youth only if consent allows (MVP: demo-linked youth, still category-only) |
| Admin | Consent state, audit of approve/revoke/delete — not category contents unless needed for support, and never URLs |

## Safety language

- The product **does not diagnose** mental health or issue a definite risk verdict.
- If `harmful` share is high, copy uses **support-suggestion** language and a path to a trusted adult / professional — see `DESIGN.md`.
- Coach prompts and fallbacks must follow the same rule.

## Audit

Persist:

- consent approve / revoke (who, when)
- account status transitions
- deletion requests (Phase A stub)

Do not persist raw extension events.

## Tests that must exist before demo

- Youth without parent approval cannot ingest signals or fetch coach.
- `POST /signals/category-summary` rejects bodies that contain `url`, `urls`, `hostname`, `path`, `title`, or `content` fields.
- Weekly report JSON has no hostname keys.
