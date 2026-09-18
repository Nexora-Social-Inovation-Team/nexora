import { app } from "./index";

/**
 * Cloudflare Workers entry. Elysia already speaks the fetch signature, so the
 * routes, the error shape and the privacy guards are the same objects the Bun
 * server serves — this file adds no behaviour.
 *
 * `src/index.ts` opens a socket only under `import.meta.main`, which workerd
 * never sets, so importing it here starts no listener.
 */
export default { fetch: app.fetch };
