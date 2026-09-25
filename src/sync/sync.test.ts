// @vitest-environment happy-dom
/**
 * The app's sync client against the real Worker (worker/index.ts), run
 * in-process over an in-memory stand-in for Durable Object storage. The other
 * device is played by direct requests to the same Worker.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker, { SyncStore } from '../../worker/index';
import { useProgress } from '../store/progress';
import { useStreak } from '../store/streak';
import { joinWithCode, makePairingCode, syncNow, unpair, useSync } from './sync';
import { sanitizeSnapshot } from './merge';

function memoryStorage() {
  const data = new Map<string, unknown>();
  return {
    get: async <T,>(key: string) => structuredClone(data.get(key)) as T | undefined,
    put: async (key: string, value: unknown) => void data.set(key, structuredClone(value)),
    delete: async (key: string) => data.delete(key),
    list: async <T,>({ prefix }: { prefix: string }) =>
      new Map([...data].filter(([key]) => key.startsWith(prefix)) as [string, T][]),
  };
}

let objects: Map<string, SyncStore>;
const env = {
  SYNC: {
    idFromName: (name: string) => name,
    get: (id: unknown) => {
      const name = id as string;
      if (!objects.has(name)) objects.set(name, new SyncStore({ storage: memoryStorage() }));
      return objects.get(name)!;
    },
  },
};

/** A request as the other device would make it. */
async function api(path: string, init?: RequestInit) {
  const response = await worker.fetch(new Request(`https://app.test${path}`, init), env);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

const record = (completedAt: number, bestCorrect: number) => ({ completedAt, bestCorrect, total: 3, timesPlayed: 1 });

beforeEach(() => {
  objects = new Map();
  vi.stubGlobal('fetch', (path: string, init?: RequestInit) =>
    worker.fetch(new Request(`https://app.test${path}`, init), env),
  );
  useProgress.setState({ lessons: {}, abandoned: {} });
  useStreak.setState({ streak: 0, lastPlayedDay: null, charges: 0 });
  unpair();
});

describe('pairing and syncing', () => {
  it('shares this device’s progress, then takes in the other device’s', async () => {
    useProgress.setState({ lessons: { a: record(100, 2) } });

    const { code } = await makePairingCode();
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    await syncNow();
    const id = useSync.getState().groupId!;
    expect(id).toMatch(/^[0-9a-f]{32}$/);

    // The other device types the code, in lower case with a dash, and gets
    // the same group. The code then no longer works.
    const joined = await api('/api/sync/join', {
      method: 'POST',
      body: JSON.stringify({ code: `${code.slice(0, 4)}-${code.slice(4)}`.toLowerCase() }),
    });
    expect(joined).toEqual({ status: 200, body: { id } });
    expect((await api('/api/sync/join', { method: 'POST', body: JSON.stringify({ code }) })).status).toBe(404);

    // It finds this device's lesson there, and writes back one of its own.
    const doc = await api(`/api/sync/doc/${id}`);
    const shared = sanitizeSnapshot(doc.body.data);
    expect(shared.lessons.a).toEqual(record(100, 2));
    const written = await api(`/api/sync/doc/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        version: doc.body.version,
        data: { ...shared, lessons: { ...shared.lessons, b: record(200, 3) } },
      }),
    });
    expect(written.status).toBe(200);

    await syncNow();
    expect(useProgress.getState().lessons).toEqual({ a: record(100, 2), b: record(200, 3) });
    expect(useSync.getState().status).toBe('synced');
  });

  it('joins with a code and merges both sides, losing neither', async () => {
    // Another device makes the group and its first copy.
    const made = await api('/api/sync/code', { method: 'POST', body: '{}' });
    const id = made.body.id as string;
    await api(`/api/sync/doc/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        version: 0,
        data: { lessons: { a: record(100, 1) }, abandoned: {}, streak: { streak: 2, lastPlayedDay: '2026-09-24', charges: 1 } },
      }),
    });

    useProgress.setState({ lessons: { a: record(50, 3), c: record(60, 1) } });
    useStreak.setState({ streak: 1, lastPlayedDay: '2026-09-25', charges: 1 });

    expect(await joinWithCode(made.body.code as string)).toBe(true);
    expect(useSync.getState().groupId).toBe(id);
    expect(useProgress.getState().lessons).toEqual({
      a: { completedAt: 100, bestCorrect: 3, total: 3, timesPlayed: 1 },
      c: record(60, 1),
    });
    expect(useStreak.getState()).toMatchObject({ streak: 3, lastPlayedDay: '2026-09-25', charges: 1 });

    const shared = sanitizeSnapshot((await api(`/api/sync/doc/${id}`)).body.data);
    expect(shared.lessons).toEqual(useProgress.getState().lessons);
  });

  it('refuses a wrong code and leaves the device unpaired', async () => {
    expect(await joinWithCode('ABCD-EFGH')).toBe(false);
    expect(await joinWithCode('short')).toBe(false);
    expect(useSync.getState().groupId).toBeNull();
  });

  it('refuses a write made against an old version', async () => {
    const id = (await api('/api/sync/code', { method: 'POST', body: '{}' })).body.id as string;
    const put = (version: number) =>
      api(`/api/sync/doc/${id}`, { method: 'PUT', body: JSON.stringify({ version, data: {} }) });
    expect((await put(0)).status).toBe(200);
    expect((await put(0)).status).toBe(409);
    expect((await put(1)).status).toBe(200);
  });

  it('keeps working offline and says so', async () => {
    useProgress.setState({ lessons: { a: record(100, 2) } });
    await makePairingCode();
    await syncNow();
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    useProgress.setState({ lessons: { a: record(100, 2), b: record(300, 1) } });
    await syncNow();
    expect(useSync.getState().status).toBe('offline');
    expect(Object.keys(useProgress.getState().lessons)).toEqual(['a', 'b']);
  });

  it('ignores a group id that is not one', async () => {
    expect((await api('/api/sync/doc/codes')).status).toBe(404);
    expect((await api('/api/sync/doc/../codes')).status).toBe(404);
  });
});
