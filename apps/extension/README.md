# nexora-extension (Manifest V3)

Counts **category minutes** on device. A hostname is read from the active tab, mapped through
`dictionary.js` and dropped: no URL, hostname or page content is ever stored, sent or logged.
`chrome.storage.local` holds `minutes`, `periodStart` and `paused` only (settings live in
`chrome.storage.sync`). Unknown hosts are ignored — there is no live "harmful" list; harmful
minutes come from the seed.

## Load unpacked

1. `chrome://extensions` (or `edge://extensions`) → enable **Developer mode**.
2. **Load unpacked** → pick `apps/extension`.
3. Open the extension **Options** page, set the API address (default `http://localhost:3000`) and paste a token.

## Get a token

Start the API (`bun run --filter nexora-api dev`), then:

```bash
curl -s -X POST http://localhost:3000/auth/login -H "content-type: application/json" -d '{"persona":"deniz_risky"}'
```

Copy `token` from the response into the options page. The youth must be **active** (a parent
approved consent) or the popup answers `Veli onayı olmadan bu işlem yapılamaz.`

## Popup

Turkish category totals, **Özeti gönder** (POST `/signals/category-summary` → shows the returned
score and starts a new period), **Duraklat / Devam et**, **Temizle**.

## Tests

```bash
bun run --filter nexora-extension test      # vitest: accounting, privacy, payload, manifest
bun run --filter nexora-extension test:e2e  # playwright: load unpacked + open the popup
```

Permissions are `tabs`, `storage`, `alarms` and host access to the API origin only — no
`<all_urls>`, no content scripts, no `scripting`, no `webRequest`. Changing the API address to a
different origin also needs that origin added to `host_permissions` in `manifest.json`.
