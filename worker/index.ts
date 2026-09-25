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
 * a version number, and a write names the version it was merged against, so
 * two devices writing at once cannot silently overwrite each other: the second
 * is refused, fetches again, merges again (in the app, src/sync/merge.ts) and
 * retries.
 *
 * Storage is a SQLite-backed Durable Object, declared entirely in
 * wrangler.jsonc, so a deploy creates it with nothing to set up in the
 * Cloudflare dashboard.
 */

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T>(options: { prefix: string }): Promise<Map<string, T>>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStub;
}

interface Env {
  SYNC: DurableObjectNamespace;
}

/** A snapshot is a few hundred lessons at most; this is far above that. */
const MAX_BODY = 512 * 1024;
const CODE_LIFETIME = 15 * 60 * 1000;
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

/**
 * One instance per sync group holds that group's document, and one instance
 * named "codes" holds the pairing codes. A Durable Object handles one request
 * at a time, which is what makes the version check and a code's single use
 * safe without any locking here.
 */
export class SyncStore {
  private storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/doc') {
      const current = (await this.storage.get<StoredDoc>('doc')) ?? { version: 0, data: null };
      if (request.method === 'GET') return json(current);
      const body = (await request.json()) as { version: number; data: unknown };
      if (body.version !== current.version) return json(current, 409);
      const next = { version: current.version + 1, data: body.data };
      await this.storage.put('doc', next);
      return json({ version: next.version });
    }

    if (url.pathname === '/code/new') {
      const { id } = (await request.json()) as { id: string };
      const now = Date.now();
      // Expired codes are cleared as new ones are made; there are only ever a
      // handful, since one is made each time a device is paired.
      for (const [key, value] of await this.storage.list<StoredCode>({ prefix: 'code:' })) {
        if (value.expires < now) await this.storage.delete(key);
      }
      let code = randomCode();
      while (await this.storage.get(`code:${code}`)) code = randomCode();
      await this.storage.put(`code:${code}`, { id, expires: now + CODE_LIFETIME });
      return json({ code, expires: now + CODE_LIFETIME });
    }

    if (url.pathname === '/code/redeem') {
      const { code } = (await request.json()) as { code: string };
      const key = `code:${code}`;
      const stored = await this.storage.get<StoredCode>(key);
      if (!stored) return json({ error: 'unknown code' }, 404);
      await this.storage.delete(key);
      if (stored.expires < Date.now()) return json({ error: 'expired code' }, 404);
      return json({ id: stored.id });
    }

    return json({ error: 'not found' }, 404);
  }
}

function stub(env: Env, name: string): DurableObjectStub {
  return env.SYNC.get(env.SYNC.idFromName(name));
}

const internal = (path: string, method: string, body?: unknown) =>
  new Request(`https://sync${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/sync/code  { id? } -> { id, code, expires }
  // A device with no group yet gets one made here.
  if (path === '/api/sync/code' && request.method === 'POST') {
    const body = (await readJson(request)) as { id?: unknown };
    const id = typeof body?.id === 'string' && ID.test(body.id) ? body.id : randomId();
    const made = (await (await stub(env, 'codes').fetch(internal('/code/new', 'POST', { id }))).json()) as {
      code: string;
      expires: number;
    };
    return json({ id, ...made });
  }

  // POST /api/sync/join  { code } -> { id }
  if (path === '/api/sync/join' && request.method === 'POST') {
    const body = (await readJson(request)) as { code?: unknown };
    const code = typeof body?.code === 'string' ? normaliseCode(body.code) : '';
    if (code.length !== CODE_LENGTH) return json({ error: 'unknown code' }, 404);
    return stub(env, 'codes').fetch(internal('/code/redeem', 'POST', { code }));
  }

  // GET  /api/sync/doc/<id>                      -> { version, data }
  // PUT  /api/sync/doc/<id>  { version, data }   -> { version } | 409 { version, data }
  const doc = /^\/api\/sync\/doc\/([0-9a-f]{32})$/.exec(path);
  if (doc) {
    // The group's own instance, named by its id. "codes" can never collide:
    // it is not 32 hex digits.
    const group = stub(env, doc[1]);
    if (request.method === 'GET') return group.fetch(internal('/doc', 'GET'));
    if (request.method === 'PUT') {
      const body = (await readJson(request)) as { version?: unknown; data?: unknown };
      if (typeof body?.version !== 'number' || typeof body.data !== 'object' || body.data === null) {
        return json({ error: 'bad request' }, 400);
      }
      return group.fetch(internal('/doc', 'PUT', { version: body.version, data: body.data }));
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
