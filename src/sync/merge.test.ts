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

const streak = (
  count: number,
  lastPlayedDay: string | null,
  charges: number,
  lastPlayedAt: number | null = null,
): StreakState => ({
  streak: count,
  lastPlayedDay,
  charges,
  lastPlayedAt,
});

/** The run itself, leaving out the longest-run and recent-days records. */
const runOf = ({ streak: count, lastPlayedDay, charges, lastPlayedAt }: StreakState): StreakState => ({
  streak: count,
  lastPlayedDay,
  charges,
  lastPlayedAt,
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
    expect(runOf(mergeStreak(streak(4, '2026-09-25', 1), streak(6, '2026-09-25', 2)))).toEqual(
      streak(6, '2026-09-25', 2),
    );
  });

  it('carries a stale device forward rather than keeping it or dropping it', () => {
    // Both saw Monday; the iPad played Tuesday offline.
    expect(runOf(mergeStreak(streak(5, '2026-09-21', 1), streak(6, '2026-09-22', 2)))).toEqual(
      streak(6, '2026-09-22', 2),
    );
  });

  it('joins a long run to a fresh play on the next day', () => {
    // The phone has ten days to Tuesday; a new, never-synced tablet played on
    // Wednesday. Together that is eleven days, not one.
    expect(runOf(mergeStreak(streak(10, '2026-09-22', 2), streak(1, '2026-09-23', 1)))).toEqual(
      streak(11, '2026-09-23', 2),
    );
  });

  it('does not stretch a run across a gap it cannot cover', () => {
    // Ten days to the 10th, nothing again until the 20th: the old run is
    // over. Its unspent charge carries into the new run, as it would have on
    // one device.
    expect(runOf(mergeStreak(streak(10, '2026-09-10', 1), streak(1, '2026-09-20', 1)))).toEqual(
      streak(1, '2026-09-20', 2),
    );
  });

  it('keeps the moment of the last play with the day it belongs to', () => {
    // Same day: the later moment. Different days: the later day's moment,
    // which is what east-travel forgiveness in streak.ts measures from.
    expect(mergeStreak(streak(3, '2026-09-25', 1, 500), streak(3, '2026-09-25', 1, 900)).lastPlayedAt).toBe(900);
    expect(mergeStreak(streak(9, '2026-09-24', 1, 900), streak(1, '2026-09-25', 1, 100)).lastPlayedAt).toBe(100);
    expect(mergeStreak(streak(9, '2026-09-24', 1, 900), streak(1, '2026-09-25', 1)).lastPlayedAt).toBeNull();
  });

  it('keeps whichever device has played when the other never has', () => {
    expect(runOf(mergeStreak(streak(0, null, 0), streak(3, '2026-09-25', 1)))).toEqual(streak(3, '2026-09-25', 1));
    expect(runOf(mergeStreak(streak(3, '2026-09-25', 1), streak(0, null, 0)))).toEqual(streak(3, '2026-09-25', 1));
  });
});

describe('merging the streak view records', () => {
  it('keeps the longer longest run and every recent day either device saw', () => {
    const phone: StreakState = { ...streak(2, '2026-09-24', 1), best: 9, days: { '2026-09-23': 'played', '2026-09-24': 'played' } };
    const tablet: StreakState = { ...streak(3, '2026-09-24', 1), best: 4, days: { '2026-09-22': 'charge', '2026-09-24': 'played' } };
    const merged = mergeStreak(phone, tablet);
    expect(merged.best).toBe(9);
    expect(merged.days).toEqual({ '2026-09-22': 'charge', '2026-09-23': 'played', '2026-09-24': 'played' });
    expect(mergeStreak(tablet, phone)).toEqual(merged);
  });

  it('never lets a charge overwrite a day played on the other device', () => {
    const a: StreakState = { ...streak(1, '2026-09-24', 1), days: { '2026-09-23': 'charge' } };
    const b: StreakState = { ...streak(1, '2026-09-24', 1), days: { '2026-09-23': 'played' } };
    expect(mergeStreak(a, b).days?.['2026-09-23']).toBe('played');
    expect(mergeStreak(b, a).days?.['2026-09-23']).toBe('played');
  });

  it('reads the records back from the network, dropping what is malformed', () => {
    const read = sanitizeSnapshot({
      streak: {
        streak: 2,
        lastPlayedDay: '2026-09-24',
        charges: 1,
        best: 5,
        days: { '2026-09-24': 'played', '2026-09-23': 'charge', yesterday: 'played', '2026-09-22': 'maybe' },
      },
    });
    expect(read.streak.best).toBe(5);
    expect(read.streak.days).toEqual({ '2026-09-23': 'charge', '2026-09-24': 'played' });
    expect(sanitizeSnapshot({ streak: { streak: 1, lastPlayedDay: '2026-09-24', charges: 0, best: -3 } }).streak.best).toBe(0);
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
    streak: streak(4, '2026-09-25', 2),
  });

  it('loses nothing either device held', () => {
    const merged = mergeSnapshots(phone, tablet);
    expect(Object.keys(merged.lessons).sort()).toEqual(['a', 'b', 'c']);
    expect(merged.lessons.b).toEqual(lesson(300, 3, 3, 3));
    expect(merged.abandoned).toEqual({ a: 2, c: 1 });
    expect(runOf(merged.streak)).toEqual(streak(4, '2026-09-25', 2));
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
    expect(runOf(read.streak)).toEqual(streak(0, null, 2));
  });

  it('treats nothing at all as an empty snapshot', () => {
    expect(sanitizeSnapshot(null)).toEqual(emptySnapshot);
    expect(sanitizeSnapshot([1, 2])).toEqual(emptySnapshot);
  });
});
