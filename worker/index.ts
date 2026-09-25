/**
 * The one piece of server the app has: a small store that lets two devices
 * share progress.
 *
 * Everything else is still static files from ./dist; wrangler.jsonc routes only
 * /api/* here. There are no accounts. A sync group is a random 128-bit id held
 * by each device, and a short pairing code, shown on one device and typed on
 * the other, is how the second device learns it. The code is single-use and
 * lives fifteen minutes; the id is the long-lived secret and never leaves the
 * devices except in these requests.
 *
 * The store never reads a snapshot. It holds one JSON document per group with
 * a version number, and a write names the version it was merged against; a
 * write against an old version is refused, and the device fetches again,
 * merges again (in the app, src/sync/merge.ts) and retries. KV has no
 * transactions, so two writes landing in the same instant can still pass the
 * check together, but nothing is lost when they do: every merge is a union,
 * and the device whose write was overtaken finds its progress missing from the
 * shared copy on its next sync and writes it again.
 *
 * Storage is a Workers KV namespace declared in wrangler.jsonc with no id,
 * which wrangler creates on the first build, so there is nothing to set up in
 * the Cloudflare dashboard. (A Durable Object was the first choice, but its
 * migration cannot be uploaded by the preview build every pull request runs.)
 */

interface KVNamespace {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Env {
  SYNC: KVNamespace;
}

/** A snapshot is a few hundred lessons at most; this is far above that. */
const MAX_BODY = 512 * 1024;
const CODE_LIFETIME_SECONDS = 15 * 60;
/** No 0/O, 1/I/L: the code is read off one screen and typed on another. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const ID = /^[0-9a-f]{32}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomCode(): string {
  // Rejection sampling, so every letter is equally likely.
  const out: string[] = [];
  while (out.length < CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < 256 - (256 % CODE_ALPHABET.length) && out.length < CODE_LENGTH) {
        out.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]);
      }
    }
  }
  return out.join('');
}

/** What was typed, with spaces, dashes and case forgiven. */
function normaliseCode(typed: string): string {
  return typed.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('too large');
  return JSON.parse(text);
}

interface StoredDoc {
  version: number;
  data: unknown;
}

interface StoredCode {
  id: string;
  expires: number;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;

  // POST /api/sync/code  { id? } -> { id, code, expires }
  // A device with no group yet gets one made here.
  if (path === '/api/sync/code' && request.method === 'POST') {
    const body = (await readJson(request)) as { id?: unknown };
    const id = typeof body?.id === 'string' && ID.test(body.id) ? body.id : randomId();
    let code = randomCode();
    while (await env.SYNC.get(`code:${code}`, 'json')) code = randomCode();
    const expires = Date.now() + CODE_LIFETIME_SECONDS * 1000;
    // KV expires the key itself; `expires` is checked too, since KV only
    // promises to remove it some time after.
    await env.SYNC.put(`code:${code}`, JSON.stringify({ id, expires } satisfies StoredCode), {
      expirationTtl: CODE_LIFETIME_SECONDS,
    });
    return json({ id, code, expires });
  }

  // POST /api/sync/join  { code } -> { id }
  if (path === '/api/sync/join' && request.method === 'POST') {
    const body = (await readJson(request)) as { code?: unknown };
    const code = typeof body?.code === 'string' ? normaliseCode(body.code) : '';
    if (code.length !== CODE_LENGTH) return json({ error: 'unknown code' }, 404);
    const key = `code:${code}`;
    const stored = (await env.SYNC.get(key, 'json')) as StoredCode | null;
    if (!stored) return json({ error: 'unknown code' }, 404);
    await env.SYNC.delete(key);
    if (stored.expires < Date.now()) return json({ error: 'expired code' }, 404);
    return json({ id: stored.id });
  }

  // GET  /api/sync/doc/<id>                      -> { version, data }
  // PUT  /api/sync/doc/<id>  { version, data }   -> { version } | 409 { version, data }
  const doc = /^\/api\/sync\/doc\/([0-9a-f]{32})$/.exec(path);
  if (doc) {
    const key = `doc:${doc[1]}`;
    const current = ((await env.SYNC.get(key, 'json')) as StoredDoc | null) ?? { version: 0, data: null };
    if (request.method === 'GET') return json(current);
    if (request.method === 'PUT') {
      const body = (await readJson(request)) as { version?: unknown; data?: unknown };
      if (typeof body?.version !== 'number' || typeof body.data !== 'object' || body.data === null) {
        return json({ error: 'bad request' }, 400);
      }
      if (body.version !== current.version) return json(current, 409);
      const next: StoredDoc = { version: current.version + 1, data: body.data };
      await env.SYNC.put(key, JSON.stringify(next));
      return json({ version: next.version });
    }
  }

  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleApi(request, env);
    } catch {
      return json({ error: 'bad request' }, 400);
    }
  },
};
