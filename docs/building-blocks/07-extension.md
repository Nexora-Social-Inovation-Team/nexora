# Building block 07 — Browser extension (Manifest V3)

**Phase:** A  
**Depends on:** 03  
**Unlocks:** 08 (optional for jury if seed is used; still required as a deliverable)

## Purpose

Real minimal Chrome/Edge extension: **domain-level** minutes, local category dictionary, POST `{ minutes }` only.

## Behavior

1. On tab activation / heartbeat, read **hostname** in the service worker (not full URL into storage).
2. Map hostname → `CategoryId` via dictionary.
3. Accumulate minutes in `chrome.storage.session` or `local` as `{ category: number }` — **never store the hostname list**.
4. User action “Özeti gönder” (and/or daily alarm) → `POST /signals/category-summary` with session token the user pasted once, or a short-lived device token from demo login. MVP: options page field for API base URL + bearer token.
5. Pause / clear controls.

## Dictionary (minimum 5)

| hostname suffix | category |
|---|---|
| `wikipedia.org` | `science` |
| `khanacademy.org` | `science` |
| `youtube.com` | `entertainment` |
| `instagram.com` | `entertainment` |
| `tiktok.com` | `entertainment` |
| `kultur.gov.tr` | `culture` |

Unknown host → **ignore** (do not invent `harmful` from random sites). Do not ship a “harmful URL list” in MVP; harmful minutes come from **seed**, not the live dictionary.

## Permissions

Minimum: `tabs` or `activeTab` + `storage` + `alarms` if used. Host permissions: API origin only (`http://localhost:3000/*` in dev). **Do not** request `<all_urls>` content-script access to page HTML.

No content script that reads `document.body`.

## Privacy tests

- Storage dump after 5 minutes of fake ticks contains only category keys, not hostnames.
- POST body matches `categoryMinutesSchema` and has no `url` key.
- Pause stops incrementing.

## Constraints

- Full URL must not appear in logs (`console.log` of `tab.url` is a **bug** — log category only).
- Firefox is out of scope.
- Not a blocker for the 5–7 min demo if seed is ready; still ship the extension as a jury artifact (load unpacked).

## Done when

- [ ] Unpacked load in Chrome.
- [ ] Visiting wikipedia vs youtube changes the local minute counts.
- [ ] POST succeeds against local API for an **active** youth token.
- [ ] Storage has no URL strings (automated test or a documented `jq` inspection step).

**Verified live on Neon — 2026-09-17:** `sendSummary()` from `core.js` POSTed to the live API on `http://localhost:3000` — 403 `consent_missing` for a pending youth, 400 `validation_error` for a body carrying a `url` key, 201 with score 80 for an **active** youth token. The weekly report it feeds carries no `url` / `hostname` / `path` / `domain` key at any depth.
