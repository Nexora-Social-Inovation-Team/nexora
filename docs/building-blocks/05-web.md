# Building block 05 — Web (marketing + parent/teacher)

**Phase:** A  
**Depends on:** 02, 03; uses 04 for `share_text`  
**Unlocks:** 08

## Purpose

TanStack Start app: public pages + parent/teacher weekly report. Demo login. Empty and error states. KVKK visible.

## Routes

Public: `/` `/how-it-works` `/privacy` `/faq`  
App: `/app/parent` `/app/teacher`  
Optional: `/app/admin`

Copy and layout: [`../DESIGN.md`](../DESIGN.md).

## Implement

- Header / Footer / AppShell.
- Demo login: persona select (Ece, Mert) → `POST /auth/login`.
- Parent panel: `GET /reports/weekly?youthId=`. Youth switcher: balanced / risky / productive (login or query to the three demo ids after they are approved + seeded).
- Show score, 3 reasons, distribution, trend, task status, `share_text`.
- Empty: `empty: true` or 404 → designed empty view, not a crash.
- Error: retry.
- Strip: `Bu panelde tam bağlantı veya alan adı gösterilmez.`
- i18next with `tr` default. Do not ship English UI.

## A11y

- Keyboard login and nav.
- Report numbers available as text.
- `/privacy` table is semantic HTML.

## Tests

Playwright:

1. Landing shows `Ölç → Anla → Koçla → Üret` and `Ham URL yok`.
2. `/privacy` lists never-collected items.
3. Parent login → weekly report happy path against a seeded API (or MSW).
4. Force empty: empty copy visible.
5. Force 500: error + retry control.

## Constraints

- No Next.js.
- No student-by-student hostname table.
- Admin optional; skip rather than block demo.
- Do not call HuggingFace from the browser.

## Done when

- [ ] Four public routes render with the copy deck.
- [ ] Parent weekly report supports ready / empty / error.
- [ ] Teacher route renders the same report chrome with class label.
- [ ] Playwright covers 1–4 above.
