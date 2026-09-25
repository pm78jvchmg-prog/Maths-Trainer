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
 * merges again (in the app, src/sync/merge.ts) and retries. The check and the
 * write are one SQL statement, so two devices writing at once cannot both pass.
 *
 * Storage is a D1 database declared in wrangler.jsonc by name with no id.
 * wrangler creates it on the first build and finds it by name on every build
 * after, so there is nothing to set up in the Cloudflare dashboard, and the
 * tables are made here on first use. Two stores were tried first and both
 * broke the pull request's preview build: a Durable Object's migration cannot
 * go through `wrangler versions upload`, and a KV namespace with no id is
 * created afresh by every build until production has the binding, which fails
 * the second time on the name already taken.
 */

interface D1Result {
  meta: { changes: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

interface Env {
  DB: D1Database;
}

/** A snapshot is a few hundred lessons at most; this is far above that. */
const MAX_BODY = 512 * 1024;
const CODE_LIFETIME = 15 * 60 * 1000;
/** No 0/O, 1/I/L: the code is read off one screen and typed on another. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const ID = /^[0-9a-f]{32}$/;

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS sync_docs (id TEXT PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sync_codes (code TEXT PRIMARY KEY, id TEXT NOT NULL, expires INTEGER NOT NULL)',
];

/** Tables are made once per database per Worker instance, on first use. */
const ready = new WeakMap<D1Database, Promise<unknown>>();
function ensureSchema(db: D1Database): Promise<unknown> {
  let made = ready.get(db);
  if (!made) {
    made = db.batch(SCHEMA.map((sql) => db.prepare(sql))).catch((error: unknown) => {
      ready.delete(db);
      throw error;
    });
    ready.set(db, made);
  }
  return made;
}

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

async function handleApi(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/sync/')) return json({ error: 'not found' }, 404);
  const db = env.DB;
  await ensureSchema(db);

  // POST /api/sync/code  { id? } -> { id, code, expires }
  // A device with no group yet gets one made here.
  if (path === '/api/sync/code' && request.method === 'POST') {
    const body = (await readJson(request)) as { id?: unknown };
    const id = typeof body?.id === 'string' && ID.test(body.id) ? body.id : randomId();
    const now = Date.now();
    const expires = now + CODE_LIFETIME;
    // Expired codes are cleared as new ones are made; there are only ever a
    // handful, since one is made each time a device is paired.
    await db.prepare('DELETE FROM sync_codes WHERE expires < ?').bind(now).run();
    for (;;) {
      const code = randomCode();
      const made = await db
        .prepare('INSERT INTO sync_codes (code, id, expires) VALUES (?, ?, ?) ON CONFLICT(code) DO NOTHING')
        .bind(code, id, expires)
        .run();
      if (made.meta.changes === 1) return json({ id, code, expires });
    }
  }

  // POST /api/sync/join  { code } -> { id }
  // Single use: the code is deleted by the same statement that reads it.
  if (path === '/api/sync/join' && request.method === 'POST') {
    const body = (await readJson(request)) as { code?: unknown };
    const code = typeof body?.code === 'string' ? normaliseCode(body.code) : '';
    if (code.length !== CODE_LENGTH) return json({ error: 'unknown code' }, 404);
    const found = await db
      .prepare('DELETE FROM sync_codes WHERE code = ? RETURNING id, expires')
      .bind(code)
      .first<{ id: string; expires: number }>();
    if (!found || found.expires < Date.now()) return json({ error: 'unknown code' }, 404);
    return json({ id: found.id });
  }

  // GET  /api/sync/doc/<id>                      -> { version, data }
  // PUT  /api/sync/doc/<id>  { version, data }   -> { version } | 409 { version, data }
  const doc = /^\/api\/sync\/doc\/([0-9a-f]{32})$/.exec(path);
  if (doc) {
    const id = doc[1];
    const read = async () => {
      const row = await db.prepare('SELECT version, data FROM sync_docs WHERE id = ?').bind(id).first<{ version: number; data: string }>();
      return row ? { version: row.version, data: JSON.parse(row.data) as unknown } : { version: 0, data: null };
    };
    if (request.method === 'GET') return json(await read());
    if (request.method === 'PUT') {
      const body = (await readJson(request)) as { version?: unknown; data?: unknown };
      if (typeof body?.version !== 'number' || typeof body.data !== 'object' || body.data === null) {
        return json({ error: 'bad request' }, 400);
      }
      const data = JSON.stringify(body.data);
      // The version check and the write are one statement, so two devices
      // writing at once cannot both pass it.
      const written =
        body.version === 0
          ? await db
              .prepare('INSERT INTO sync_docs (id, version, data) VALUES (?, 1, ?) ON CONFLICT(id) DO NOTHING')
              .bind(id, data)
              .run()
          : await db
              .prepare('UPDATE sync_docs SET version = version + 1, data = ? WHERE id = ? AND version = ?')
              .bind(data, id, body.version)
              .run();
      if (written.meta.changes !== 1) return json(await read(), 409);
      return json({ version: body.version + 1 });
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
