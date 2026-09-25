/**
 * Keeping this device's progress in step with the user's other devices.
 *
 * Local storage stays the source the app reads, so every lesson still works
 * with no signal. Sync is a background catch-up on top: when the app opens,
 * when it comes back to the foreground, when the network returns, and shortly
 * after any lesson is recorded, this device fetches the shared copy, merges it
 * with its own (src/sync/merge.ts, never an overwrite), keeps the result, and
 * sends it back if it holds anything the shared copy did not.
 *
 * A failed request changes nothing. The next trigger simply tries again.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProgress } from '../store/progress';
import { useStreak } from '../store/streak';
import { mergeSnapshots, sameSnapshot, sanitizeSnapshot } from './merge';
import type { Snapshot } from './merge';

type Status = 'idle' | 'syncing' | 'synced' | 'offline';

interface SyncState {
  /** The sync group this device belongs to, or null when not paired. */
  groupId: string | null;
  /** When this device last completed a sync, ms since epoch. */
  lastSynced: number | null;
  status: Status;
}

export const useSync = create<SyncState>()(
  persist(
    (): SyncState => ({ groupId: null, lastSynced: null, status: 'idle' }),
    {
      name: 'maths-trainer:sync:v1',
      partialize: ({ groupId, lastSynced }) => ({ groupId, lastSynced }),
    },
  ),
);

/** What this device holds now, in the shape that is shared. */
export function localSnapshot(): Snapshot {
  const { lessons, abandoned } = useProgress.getState();
  // The streak's `replaced` is about this device's clock alone, so it stays
  // out of what is shared; `setState` merging leaves the local copy in place.
  const { streak, lastPlayedDay, charges, lastPlayedAt, best, days } = useStreak.getState();
  return {
    lessons,
    abandoned,
    streak: { streak, lastPlayedDay, charges, lastPlayedAt: lastPlayedAt ?? null, best: best ?? 0, days: days ?? {} },
  };
}

/** Set while a merged snapshot is written back, so writing it is not itself a change to sync. */
let applying = false;

function applySnapshot(merged: Snapshot) {
  if (sameSnapshot(merged, localSnapshot())) return;
  applying = true;
  try {
    useProgress.setState({ lessons: merged.lessons, abandoned: merged.abandoned });
    useStreak.setState({ ...merged.streak });
  } finally {
    applying = false;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
  });
  return { status: response.status, body: (await response.json()) as T };
}

let running: Promise<void> | null = null;
let again = false;

/**
 * One round of fetch, merge, keep, send. Calls made while a round is running
 * fold into one more round after it, never two at once.
 */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await syncRound();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function syncRound() {
  const groupId = useSync.getState().groupId;
  if (!groupId) return;
  useSync.setState({ status: 'syncing' });
  try {
    // A refused write means another device wrote in between; fetch its
    // version and merge again. Three tries is plenty for two devices.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const got = await request<{ version: number; data: unknown }>(`/api/sync/doc/${groupId}`);
      if (got.status !== 200) throw new Error(`sync fetch ${got.status}`);
      const remote = sanitizeSnapshot(got.body.data);
      const merged = mergeSnapshots(localSnapshot(), remote);
      applySnapshot(merged);
      if (got.body.data !== null && sameSnapshot(merged, remote)) break;
      const put = await request(`/api/sync/doc/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({ version: got.body.version, data: merged }),
      });
      if (put.status === 200) break;
      if (put.status !== 409) throw new Error(`sync write ${put.status}`);
    }
    // Unpaired while the round ran: leave the status as it was set.
    if (useSync.getState().groupId === groupId) {
      useSync.setState({ status: 'synced', lastSynced: Date.now() });
    }
  } catch {
    if (useSync.getState().groupId === groupId) useSync.setState({ status: 'offline' });
  }
}

/**
 * A code for another device to type, valid for fifteen minutes. A device not
 * yet paired starts a group here, and its own progress becomes the first copy.
 */
export async function makePairingCode(): Promise<{ code: string; expires: number }> {
  const { body, status } = await request<{ id: string; code: string; expires: number }>('/api/sync/code', {
    method: 'POST',
    body: JSON.stringify({ id: useSync.getState().groupId }),
  });
  if (status !== 200) throw new Error(`code ${status}`);
  useSync.setState({ groupId: body.id });
  void syncNow();
  return { code: body.code, expires: body.expires };
}

/** Join the group another device's code names; false for a wrong or expired code. */
export async function joinWithCode(code: string): Promise<boolean> {
  const { body, status } = await request<{ id?: string }>('/api/sync/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  if (status === 404) return false;
  if (status !== 200 || !body.id) throw new Error(`join ${status}`);
  useSync.setState({ groupId: body.id, lastSynced: null });
  await syncNow();
  return true;
}

/** This device stops syncing. Its progress stays exactly as it is. */
export function unpair() {
  useSync.setState({ groupId: null, lastSynced: null, status: 'idle' });
}

let debounce: ReturnType<typeof setTimeout> | undefined;

function soon() {
  if (applying || !useSync.getState().groupId) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => void syncNow(), 1500);
}

let installed = false;

/** Wire the triggers. Called once at startup. */
export function installSync() {
  if (installed) return;
  installed = true;
  useProgress.subscribe(soon);
  useStreak.subscribe(soon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
  window.addEventListener('online', () => void syncNow());
  void syncNow();
}
