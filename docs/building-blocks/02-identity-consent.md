# Building block 02 — Identity, roles, parent consent

**Phase:** A  
**Depends on:** 01  
**Unlocks:** 03, 05, 06

## Purpose

Demo login, session, RBAC, parent consent gate. Youth cannot ingest signals or fetch coach until `active`.

## Endpoints

Implement exactly ([`../API.md`](../API.md)):

- `POST /auth/login`
- `GET /users/me`
- `POST /consent/parent/approve`
- `POST /consent/parent/revoke` (include if cheap)

## Seed users (upsert on API boot or `bun run db:seed`)

| id | personaKey | role | status (initial) | parentId |
|---|---|---|---|---|
| `usr_deniz` | `deniz_balanced` | youth | `pending_parent_consent` | `usr_ece` |
| `usr_deniz_risky` | `deniz_risky` | youth | `pending_parent_consent` | `usr_ece` |
| `usr_deniz_productive` | `deniz_productive` | youth | `pending_parent_consent` | `usr_ece` |
| `usr_ece` | `ece` | parent | `active` | — |
| `usr_mert` | `mert` | teacher | `active` | — |
| `usr_selin` | `selin` | admin | `active` | — |

Login `persona: "deniz"` maps to `usr_deniz`. Parent `ece` may approve any of the three demo youth ids.

## Session

Signed cookie or JWT (`SESSION_SECRET`). MVP: HTTP-only cookie is preferred for web; Expo may send `Authorization: Bearer`. Support both if needed, keep one user-id in the token.

## AuthZ

Copy the matrix in [`../ARCHITECTURE.md`](../ARCHITECTURE.md). Helper: `requireRole`, `requireActiveYouth`, `requireLinkedParent(youthId)`.

Write `ConsentEvent` on approve/revoke.

## Tests (Vitest, no HF)

1. Login as Deniz → `status=pending_parent_consent`.
2. Deniz cannot hit a protected stub (use `GET /score/current` once 03 exists; until then, a test-only `GET /_debug/gate` is **not** allowed — wait and add the consent test in 03). In this block, test approve: Ece approves `usr_deniz` → status `active`; Mert cannot approve (403).
3. Selin (admin) can approve.
4. Unknown persona → 400 `validation_error`.

## Constraints

- No OAuth, no email, no password.
- No real KVKK legal engine — status flag + audit row only.
- Do not auto-activate youth.

## Done when

- [ ] Four roles can log in via persona key.
- [ ] Youth stays `pending_parent_consent` until parent/admin approve.
- [ ] Approve writes `ConsentEvent`.
- [ ] Playwright (or API integration test) covers login + approve. Web UI can wait for 05; API-level is enough here.
