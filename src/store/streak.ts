/**
 * Daily streak, persisted on the device.
 *
 * The rest of the app deliberately carries no engagement mechanics — no XP,
 * no leagues, no persistent points total. The streak is the one exception the
 * owner asked for, and it is kept deliberately forgiving: a charge is banked
 * when a streak starts and is spent automatically to cover a missed day, so
 * one busy day does not undo a month.
 *
 * Days are the *device's local calendar* days, not 24-hour windows. Playing at
 * 23:50 and again at 00:10 is two days and counts twice; playing twice in one
 * afternoon counts once. A calendar day is held as 'YYYY-MM-DD' so that two of
 * them can be compared and subtracted without a timezone or DST ever entering
 * the arithmetic.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Never more than two banked, whatever happens. */
export const MAX_CHARGES = 2;

/**
 * How far back a timezone can move the calendar. Local offsets run from UTC-12
 * to UTC+14, so crossing the whole span shows a day up to two before the one
 * just left. A play dated further back than this is a wrong clock, not travel.
 */
const TRAVEL_DAYS = 2;

/**
 * How long a far-back clock is given to come right again. While it lasts the
 * day it replaced is remembered, so the clock returning does not read as a
 * year missed; after it, the new dates are taken as the true ones.
 */
const REPLACED_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Slack in the real time that has to pass before a calendar day counts as
 * missed. A day the clocks go forward is 23 hours long, so without it a whole
 * missed day could pass in under 24 hours.
 */
const CLOCK_SLACK_MS = 3 * 60 * 60 * 1000;

/** The last play before the clock jumped far back, kept until it comes right. */
export interface ReplacedDay {
  /** The last play's day as it stood before the jump. */
  day: string;
  /** The streak at that point. */
  streak: number;
  /** The day the last play was re-dated to. */
  since: string;
}

export interface StreakState {
  /** Consecutive days played, 0 before the first play. */
  streak: number;
  /**
   * The latest local calendar day counted, 'YYYY-MM-DD', or null. It never
   * moves back for a timezone, so travelling west cannot count a day twice.
   */
  lastPlayedDay: string | null;
  /** Banked charges, each one covering a single missed day. */
  charges: number;
  /**
   * When the last counted play happened, in epoch milliseconds, which no
   * timezone moves. Absent in streaks saved before it was kept.
   */
  lastPlayedAt?: number | null;
  /** See `ReplacedDay`; absent unless the clock jumped far back. */
  replaced?: ReplacedDay | null;
}

// The optional fields are written out so that `reset`, which zustand merges
// into the stored state, clears them too.
export const emptyStreak: StreakState = {
  streak: 0,
  lastPlayedDay: null,
  charges: 0,
  lastPlayedAt: null,
  replaced: null,
};

/** The device's local calendar day for `date`. */
export function localDay(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Whole calendar days from `from` to `to`.
 *
 * Both are mapped onto UTC midnight before subtracting, so the clocks going
 * forward cannot turn a day into 23 hours and lose it.
 */
function daysApart(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/**
 * Where the streak stands on `today`, *before* any play is recorded, `now`
 * being the same moment in epoch milliseconds when it is known.
 *
 * This is the one place the gap is interpreted, so what the home screen shows
 * and what the next play builds on cannot drift apart. It is pure: reading the
 * streak spends nothing, and a charge is only actually deducted when the play
 * that needed it is recorded.
 *
 * The clock can move either way between plays, and each direction has to be
 * read so it neither counts a day twice nor costs one:
 *
 * - **Back a day or two** (travelling west): `today` was already counted.
 *   Nothing changes, and the last day stays where it was — pulling it back is
 *   what used to let the next day count again.
 * - **Back further** (the clock was set wrong): the last play is re-dated to
 *   today, so the streak is not frozen until the wrong date comes round, and
 *   the day it replaced is remembered.
 * - **Forward, skipping a day** (travelling east): a day the calendar jumped
 *   over is not a missed day. `now` shows how much real time has passed, which
 *   no timezone changes.
 * - **Forward, back to the replaced day** (the wrong clock put right): the
 *   gap is measured from the remembered day, less the days played meanwhile.
 */
export function resolveStreak(state: StreakState, today: string, now?: number): StreakState {
  if (!state.lastPlayedDay) return { ...emptyStreak, charges: state.charges };

  const gap = daysApart(state.lastPlayedDay, today);
  // gap 0 is a second play today, and a gap back a day or two is a timezone
  // crossed westward: a day already counted. gap 1 is today continuing
  // yesterday. None of them has missed a day.
  if (gap >= -TRAVEL_DAYS && gap <= 1) return state;

  if (gap < -TRAVEL_DAYS) {
    return {
      ...state,
      lastPlayedDay: today,
      replaced: state.replaced ?? { day: state.lastPlayedDay, streak: state.streak, since: today },
    };
  }

  let missed = gap - 1;

  const replaced = state.replaced;
  if (replaced) {
    const back = daysApart(replaced.day, today);
    // The clock has come right, to a day already counted before it went wrong.
    if (back >= -TRAVEL_DAYS && back <= 0) {
      return { ...state, lastPlayedDay: replaced.day, replaced: null };
    }
    if (back >= 1) {
      // Days played on the wrong clock were real days, the one it was re-dated
      // on included (it counted nothing), so they fill that much of the gap.
      const playedMeanwhile = state.streak - replaced.streak + 1;
      missed = Math.max(0, Math.min(missed, back - 1 - playedMeanwhile));
    }
  }

  // A calendar day cannot be missed in less than a day of real time, so any
  // the clock skipped over are forgiven. Without a time for the last play,
  // from a streak saved before one was kept, the calendar decides alone.
  if (now !== undefined && state.lastPlayedAt != null) {
    const realDays = Math.floor((now - state.lastPlayedAt + CLOCK_SLACK_MS) / DAY_MS);
    missed = Math.min(missed, Math.max(0, realDays));
  }

  if (missed === 0) return state;
  // One charge per missed day. Charges that cannot cover the gap are not
  // burned on a lost cause; they carry into the next streak.
  if (missed <= state.charges) return { ...state, charges: state.charges - missed };
  return { ...state, streak: 0, replaced: null };
}

/**
 * Whether `today` is already counted, in the reading `resolveStreak` gives it:
 * the home screen's "done for today". A day west of the last play is.
 */
export function countedOn(state: StreakState, today: string, now?: number): boolean {
  const base = resolveStreak(state, today, now);
  return base.lastPlayedDay !== null && daysApart(base.lastPlayedDay, today) <= 0;
}

/**
 * The streak after playing on `today`, going by the calendar alone.
 *
 * Deliberately two arguments, so `days.reduce(playOn, …)` cannot hand it an
 * array index as a time; `playAt` is the form that knows the time.
 */
export function playOn(state: StreakState, today: string): StreakState {
  return playOnAt(state, today);
}

/** The streak after a play at `at`, on its local calendar day. */
export function playAt(state: StreakState, at: Date): StreakState {
  return playOnAt(state, localDay(at), at.getTime());
}

/** `playOn` knowing the moment, `now` in epoch milliseconds, as well as the day. */
export function playOnAt(state: StreakState, today: string, now?: number): StreakState {
  // Twice in one day is one day. Without this the resolved gap of 0 would
  // increment again.
  if (state.lastPlayedDay === today) return state;

  const base = resolveStreak(state, today, now);

  // A day already counted adds nothing: a day west of the last play, or the
  // wrong clock re-dated or put right, which comes back from `resolveStreak`
  // with the day it settled on. Recording it would add one and pull
  // `lastPlayedDay` back, so the next day forward would count again.
  if (base.lastPlayedDay && daysApart(base.lastPlayedDay, today) <= 0) {
    return base === state ? state : { ...base, lastPlayedAt: now ?? base.lastPlayedAt };
  }

  const starting = base.streak === 0;
  const replaced =
    base.replaced && daysApart(base.replaced.since, today) <= REPLACED_WINDOW_DAYS ? base.replaced : null;

  return {
    streak: base.streak + 1,
    lastPlayedDay: today,
    // Starting a streak earns a charge — including a restart after a break.
    charges: starting ? Math.min(MAX_CHARGES, base.charges + 1) : base.charges,
    lastPlayedAt: now ?? null,
    replaced,
  };
}

interface StreakStore extends StreakState {
  /** Record that a lesson was finished. Safe to call more than once a day. */
  recordPlay: (now?: Date) => void;
  reset: () => void;
}

export const useStreak = create<StreakStore>()(
  persist(
    (set) => ({
      ...emptyStreak,
      recordPlay: (now = new Date()) => set((state) => playAt(state, now)),
      reset: () => set({ ...emptyStreak }),
    }),
    { name: 'maths-trainer:streak:v1' },
  ),
);
