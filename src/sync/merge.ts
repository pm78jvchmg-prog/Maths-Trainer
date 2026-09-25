/**
 * Merging progress from two devices.
 *
 * Sync never overwrites: whatever either device holds is folded into one
 * snapshot, and every rule here is a "keep the better of the two" so that the
 * same merge run again, in either order, or with a third device, lands on the
 * same answer. That is what lets two devices played on the same day, one of
 * them offline, catch up without either losing a lesson.
 *
 * Pure, and the only place the rules live. The server stores what it is sent
 * and nothing more; it never interprets a snapshot.
 */
import type { LessonRecord } from '../store/progress';
import { MAX_CHARGES, playOn } from '../store/streak';
import type { StreakState } from '../store/streak';

export interface Snapshot {
  lessons: Record<string, LessonRecord>;
  abandoned: Record<string, number>;
  streak: StreakState;
}

export const emptySnapshot: Snapshot = {
  lessons: {},
  abandoned: {},
  streak: { streak: 0, lastPlayedDay: null, charges: 0 },
};

const whole = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A snapshot from somewhere else, reduced to what this app can read. Anything
 * malformed is dropped rather than trusted: a bad record from the network must
 * not be able to break the home screen.
 */
export function sanitizeSnapshot(input: unknown): Snapshot {
  if (!isRecord(input)) return emptySnapshot;

  const lessons: Record<string, LessonRecord> = {};
  if (isRecord(input.lessons)) {
    for (const [id, raw] of Object.entries(input.lessons)) {
      if (!isRecord(raw)) continue;
      const { completedAt, bestCorrect, total, timesPlayed } = raw;
      if (!whole(completedAt) || !whole(bestCorrect) || !whole(total) || !whole(timesPlayed)) continue;
      lessons[id] = { completedAt, bestCorrect: Math.min(bestCorrect, total), total, timesPlayed };
    }
  }

  const abandoned: Record<string, number> = {};
  if (isRecord(input.abandoned)) {
    for (const [id, count] of Object.entries(input.abandoned)) {
      if (whole(count)) abandoned[id] = count;
    }
  }

  let streak = emptySnapshot.streak;
  if (isRecord(input.streak)) {
    const raw = input.streak;
    const day = typeof raw.lastPlayedDay === 'string' && DAY.test(raw.lastPlayedDay) ? raw.lastPlayedDay : null;
    streak = {
      streak: whole(raw.streak) && day ? raw.streak : 0,
      lastPlayedDay: day,
      charges: whole(raw.charges) ? Math.min(raw.charges, MAX_CHARGES) : 0,
    };
  }

  return { lessons, abandoned, streak };
}

/**
 * One lesson played on two devices.
 *
 * A best only means something against the check it was set on, which is the
 * rule `recordCompletion` follows too: when the two records were set against
 * different totals, the later one's total and best stand, since that is the
 * check as the content has it now. Plays are the higher count rather than the
 * sum, because after the first sync both devices hold the same plays and a
 * sum would count them twice.
 */
export function mergeLesson(a: LessonRecord, b: LessonRecord): LessonRecord {
  const completedAt = Math.max(a.completedAt, b.completedAt);
  const timesPlayed = Math.max(a.timesPlayed, b.timesPlayed);
  if (a.total === b.total) {
    return { completedAt, bestCorrect: Math.max(a.bestCorrect, b.bestCorrect), total: a.total, timesPlayed };
  }
  // Ties broken on the numbers themselves so the order of the arguments can
  // never change the answer.
  const later =
    a.completedAt !== b.completedAt
      ? a.completedAt > b.completedAt ? a : b
      : a.total !== b.total
        ? a.total > b.total ? a : b
        : a;
  return { completedAt, bestCorrect: later.bestCorrect, total: later.total, timesPlayed };
}

/**
 * Two devices' streaks.
 *
 * Not field by field: a long run ending on Monday and a fresh one-day run on
 * Wednesday do not make a long run ending on Wednesday. Instead the earlier
 * device's streak is played forward to the later day with `playOn`, exactly as
 * if that play had happened on the same device, charges and gaps included,
 * and the better of that and the later device's own run is kept. The day
 * logic itself stays in `streak.ts`.
 */
export function mergeStreak(a: StreakState, b: StreakState): StreakState {
  if (!a.lastPlayedDay || !b.lastPlayedDay) {
    const played = a.lastPlayedDay ? a : b.lastPlayedDay ? b : a;
    return { ...played, charges: Math.max(a.charges, b.charges) };
  }

  if (a.lastPlayedDay === b.lastPlayedDay) {
    return {
      ...a,
      streak: Math.max(a.streak, b.streak),
      lastPlayedDay: a.lastPlayedDay,
      charges: Math.max(a.charges, b.charges),
    };
  }

  const [earlier, later] = a.lastPlayedDay < b.lastPlayedDay ? [a, b] : [b, a];
  const carried = playOn(earlier, later.lastPlayedDay as string);
  return {
    ...later,
    streak: Math.max(carried.streak, later.streak),
    lastPlayedDay: later.lastPlayedDay,
    charges: Math.max(carried.charges, later.charges),
  };
}

export function mergeSnapshots(a: Snapshot, b: Snapshot): Snapshot {
  const lessons: Record<string, LessonRecord> = { ...a.lessons };
  for (const [id, record] of Object.entries(b.lessons)) {
    lessons[id] = lessons[id] ? mergeLesson(lessons[id], record) : record;
  }

  const abandoned: Record<string, number> = { ...a.abandoned };
  for (const [id, count] of Object.entries(b.abandoned)) {
    abandoned[id] = Math.max(abandoned[id] ?? 0, count);
  }

  return { lessons, abandoned, streak: mergeStreak(a.streak, b.streak) };
}

/** Key order ignored, so two equal snapshots compare equal however built. */
export function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
