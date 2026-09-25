import { describe, it, expect } from 'vitest';
import { emptySnapshot, mergeLesson, mergeSnapshots, mergeStreak, sameSnapshot, sanitizeSnapshot } from './merge';
import type { Snapshot } from './merge';
import type { LessonRecord } from '../store/progress';
import type { StreakState } from '../store/streak';

const lesson = (completedAt: number, bestCorrect: number, total: number, timesPlayed: number): LessonRecord => ({
  completedAt,
  bestCorrect,
  total,
  timesPlayed,
});

const streak = (count: number, lastPlayedDay: string | null, charges: number): StreakState => ({
  streak: count,
  lastPlayedDay,
  charges,
});

const snap = (partial: Partial<Snapshot>): Snapshot => ({ ...emptySnapshot, ...partial });

describe('merging a lesson played on two devices', () => {
  it('keeps the better best, the later finish and the higher play count', () => {
    expect(mergeLesson(lesson(100, 2, 3, 1), lesson(200, 1, 3, 4))).toEqual(lesson(200, 2, 3, 4));
  });

  it('takes the later best when the check changed length between them', () => {
    // 3/3 on a check that has since grown to 5 is not "Best 3/5".
    expect(mergeLesson(lesson(100, 3, 3, 1), lesson(200, 2, 5, 1))).toEqual(lesson(200, 2, 5, 1));
    expect(mergeLesson(lesson(200, 2, 5, 1), lesson(100, 3, 3, 1))).toEqual(lesson(200, 2, 5, 1));
  });

  it('does not depend on argument order even on a tie', () => {
    const a = lesson(100, 3, 3, 2);
    const b = lesson(100, 4, 5, 1);
    expect(mergeLesson(a, b)).toEqual(mergeLesson(b, a));
  });
});

describe('merging two streaks', () => {
  it('takes the longer run on the same day, and the higher charges', () => {
    expect(mergeStreak(streak(4, '2026-09-25', 1), streak(6, '2026-09-25', 2))).toEqual(
      streak(6, '2026-09-25', 2),
    );
  });

  it('carries a stale device forward rather than keeping it or dropping it', () => {
    // Both saw Monday; the iPad played Tuesday offline.
    expect(mergeStreak(streak(5, '2026-09-21', 1), streak(6, '2026-09-22', 1))).toEqual(
      streak(6, '2026-09-22', 1),
    );
  });

  it('joins a long run to a fresh play on the next day', () => {
    // The phone has ten days to Tuesday; a new, never-synced tablet played on
    // Wednesday. Together that is eleven days, not one.
    expect(mergeStreak(streak(10, '2026-09-22', 2), streak(1, '2026-09-23', 1))).toEqual(
      streak(11, '2026-09-23', 2),
    );
  });

  it('does not stretch a run across a gap it cannot cover', () => {
    // Ten days to the 10th, nothing again until the 20th: the old run is
    // over. Its unspent charge carries into the new run, as it would have on
    // one device.
    expect(mergeStreak(streak(10, '2026-09-10', 1), streak(1, '2026-09-20', 1))).toEqual(
      streak(1, '2026-09-20', 2),
    );
  });

  it('keeps whichever device has played when the other never has', () => {
    expect(mergeStreak(streak(0, null, 0), streak(3, '2026-09-25', 1))).toEqual(streak(3, '2026-09-25', 1));
    expect(mergeStreak(streak(3, '2026-09-25', 1), streak(0, null, 0))).toEqual(streak(3, '2026-09-25', 1));
  });
});

describe('merging whole snapshots', () => {
  const phone = snap({
    lessons: { a: lesson(100, 2, 3, 1), b: lesson(150, 3, 3, 2) },
    abandoned: { a: 1 },
    streak: streak(3, '2026-09-24', 1),
  });
  const tablet = snap({
    lessons: { b: lesson(300, 1, 3, 3), c: lesson(250, 1, 3, 1) },
    abandoned: { a: 2, c: 1 },
    streak: streak(4, '2026-09-25', 1),
  });

  it('loses nothing either device held', () => {
    const merged = mergeSnapshots(phone, tablet);
    expect(Object.keys(merged.lessons).sort()).toEqual(['a', 'b', 'c']);
    expect(merged.lessons.b).toEqual(lesson(300, 3, 3, 3));
    expect(merged.abandoned).toEqual({ a: 2, c: 1 });
    expect(merged.streak).toEqual(streak(4, '2026-09-25', 1));
  });

  it('is the same in either order, and merging again changes nothing', () => {
    const once = mergeSnapshots(phone, tablet);
    expect(sameSnapshot(once, mergeSnapshots(tablet, phone))).toBe(true);
    expect(sameSnapshot(mergeSnapshots(once, phone), once)).toBe(true);
    expect(sameSnapshot(mergeSnapshots(once, tablet), once)).toBe(true);
    expect(sameSnapshot(mergeSnapshots(once, once), once)).toBe(true);
  });
});

describe('reading a snapshot from the network', () => {
  it('drops what it cannot read instead of trusting it', () => {
    const read = sanitizeSnapshot({
      lessons: {
        good: lesson(1, 2, 3, 1),
        noTotal: { completedAt: 1, bestCorrect: 2, timesPlayed: 1 },
        negative: lesson(1, -1, 3, 1),
        text: 'nope',
      },
      abandoned: { a: 2, b: 'x' },
      streak: { streak: 5, lastPlayedDay: 'yesterday', charges: 9 },
    });
    expect(read.lessons).toEqual({ good: lesson(1, 2, 3, 1) });
    expect(read.abandoned).toEqual({ a: 2 });
    expect(read.streak).toEqual(streak(0, null, 2));
  });

  it('treats nothing at all as an empty snapshot', () => {
    expect(sanitizeSnapshot(null)).toEqual(emptySnapshot);
    expect(sanitizeSnapshot([1, 2])).toEqual(emptySnapshot);
  });
});
