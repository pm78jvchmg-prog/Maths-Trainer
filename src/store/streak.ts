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

export interface StreakState {
  /** Consecutive days played, 0 before the first play. */
  streak: number;
  /** Local calendar day of the last play, 'YYYY-MM-DD', or null. */
  lastPlayedDay: string | null;
  /** Banked charges, each one covering a single missed day. */
  charges: number;
}

export const emptyStreak: StreakState = { streak: 0, lastPlayedDay: null, charges: 0 };

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
  const day = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / day);
}

/**
 * Where the streak stands on `today`, *before* any play is recorded.
 *
 * This is the one place the gap is interpreted, so what the home screen shows
 * and what the next play builds on cannot drift apart. It is pure: reading the
 * streak spends nothing, and a charge is only actually deducted when the play
 * that needed it is recorded.
 */
export function resolveStreak(state: StreakState, today: string): StreakState {
  if (!state.lastPlayedDay) return { ...emptyStreak, charges: state.charges };

  const gap = daysApart(state.lastPlayedDay, today);
  // gap 0 is a second play today; gap 1 is today continuing yesterday. Neither
  // has missed a day yet. A negative gap means the device clock moved back —
  // treat it as the same day rather than punishing it.
  if (gap <= 1) return state;

  const missed = gap - 1;
  // One charge per missed day. Charges that cannot cover the gap are not
  // burned on a lost cause; they carry into the next streak.
  if (missed <= state.charges) return { ...state, charges: state.charges - missed };
  return { ...state, streak: 0 };
}

/** The streak after playing on `today`. */
export function playOn(state: StreakState, today: string): StreakState {
  // Twice in one day is one day. Without this the resolved gap of 0 would
  // increment again. A day *before* the last play (the clock or the timezone
  // moved back) is a day already counted, the reading `resolveStreak` gives it:
  // recording it would add one and pull `lastPlayedDay` backwards, so the next
  // day forward would count again.
  if (state.lastPlayedDay && daysApart(state.lastPlayedDay, today) <= 0) return state;

  const base = resolveStreak(state, today);
  const starting = base.streak === 0;

  return {
    streak: base.streak + 1,
    lastPlayedDay: today,
    // Starting a streak earns a charge — including a restart after a break.
    charges: starting ? Math.min(MAX_CHARGES, base.charges + 1) : base.charges,
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
      recordPlay: (now = new Date()) => set((state) => playOn(state, localDay(now))),
      reset: () => set({ ...emptyStreak }),
    }),
    { name: 'maths-trainer:streak:v1' },
  ),
);
