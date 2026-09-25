import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAX_CHARGES,
  emptyStreak,
  localDay,
  playOn,
  resolveStreak,
  useStreak,
  type StreakState,
} from './streak';

/** Play a run of days in order, starting from nothing. */
function run(days: string[], from: StreakState = emptyStreak): StreakState {
  return days.reduce(playOn, from);
}

describe('daily streak', () => {
  it('starts at one and banks a charge', () => {
    const state = run(['2026-09-22']);

    expect(state.streak).toBe(1);
    expect(state.charges).toBe(1);
    expect(state.lastPlayedDay).toBe('2026-09-22');
  });

  it('increments on each consecutive day', () => {
    const state = run(['2026-09-22', '2026-09-23', '2026-09-24']);

    expect(state.streak).toBe(3);
  });

  it('counts a second play on the same day only once', () => {
    const state = run(['2026-09-22', '2026-09-22', '2026-09-22']);

    expect(state.streak).toBe(1);
    // And the charge is not re-earned by replaying the day it was earned on.
    expect(state.charges).toBe(1);
  });

  it('spends a charge to cover one missed day', () => {
    const before = run(['2026-09-20', '2026-09-21', '2026-09-22']);
    expect(before.charges).toBe(1);

    // 23rd missed, back on the 24th.
    const after = playOn(before, '2026-09-24');

    expect(after.streak).toBe(4);
    expect(after.charges).toBe(0);
  });

  it('resets after two missed days with no charge left', () => {
    const spent = playOn(run(['2026-09-20', '2026-09-21']), '2026-09-23');
    expect(spent.streak).toBe(3);
    expect(spent.charges).toBe(0);

    // 24th and 25th missed, back on the 26th, nothing banked to cover them.
    const after = playOn(spent, '2026-09-26');

    expect(after.streak).toBe(1);
  });

  it('resets after a missed day when no charge is banked', () => {
    const spent = playOn(run(['2026-09-20']), '2026-09-22');
    expect(spent.charges).toBe(0);

    const after = playOn(spent, '2026-09-24');

    expect(after.streak).toBe(1);
  });

  it('spends two charges to cover two missed days', () => {
    const banked: StreakState = { streak: 9, lastPlayedDay: '2026-09-20', charges: 2 };

    const after = playOn(banked, '2026-09-23');

    expect(after.streak).toBe(10);
    expect(after.charges).toBe(0);
  });

  it('earns a charge again when a streak restarts after a break', () => {
    // Start with nothing banked, so the charge counted here is the one the
    // restart earns rather than one carried over from the streak that died.
    const dead = playOn({ streak: 9, lastPlayedDay: '2026-09-01', charges: 0 }, '2026-09-10');

    expect(dead.streak).toBe(1);
    expect(dead.charges).toBe(1);
  });

  it('never banks more than two charges', () => {
    // Four separate streaks, each start earning a charge.
    const state = run(['2026-09-01', '2026-09-10', '2026-09-20', '2026-10-01']);

    expect(state.charges).toBe(MAX_CHARGES);
    expect(state.charges).toBe(2);
  });

  it('does not burn charges that cannot save the streak', () => {
    const banked: StreakState = { streak: 9, lastPlayedDay: '2026-09-20', charges: 1 };

    // Three days missed, one charge — it cannot cover them, so it survives to
    // protect the streak that starts today.
    const after = playOn(banked, '2026-09-24');

    expect(after.streak).toBe(1);
    expect(after.charges).toBe(MAX_CHARGES);
  });

  it('carries across a month and a year boundary', () => {
    const state = run(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);

    expect(state.streak).toBe(4);
  });

  it('does not count a day twice when the clock moves back', () => {
    // A trip west, or the clock set back: the 23rd arrives after the 24th.
    const before = run(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24']);
    expect(before.streak).toBe(5);

    const behind = playOn(before, '2026-09-23');
    // Nothing changes: not the count, and not the day the next play builds on.
    expect(behind).toEqual(before);

    // Back on the 24th, which was already counted.
    expect(playOn(behind, '2026-09-24').streak).toBe(5);
  });

  it('re-dates a play recorded with the clock a year ahead, without adding a day', () => {
    // The last play was recorded while the clock read a year ahead; it is now
    // put right. Before the clock-moved-back fix this play added a day (4) —
    // the same double count as the timezone case. The first form of that fix
    // ignored every play dated before the last, which froze the streak at 3
    // until 2027-09-24 came round. Now the bad date is replaced by today's and
    // nothing is added.
    const ahead: StreakState = { streak: 3, lastPlayedDay: '2027-09-24', charges: 1 };

    const corrected = playOn(ahead, '2026-09-25');
    expect(corrected).toEqual({ streak: 3, lastPlayedDay: '2026-09-25', charges: 1 });

    // And the streak moves again the next day, rather than a year later.
    expect(playOn(corrected, '2026-09-26').streak).toBe(4);
  });
});

describe('resolveStreak', () => {
  it('reads as alive on the day after the last play, spending nothing', () => {
    const state = run(['2026-09-22']);

    expect(resolveStreak(state, '2026-09-23')).toEqual(state);
  });

  it('reports the streak as dead once the charges cannot cover the gap', () => {
    const state = run(['2026-09-22']);

    // Two days missed, one charge.
    expect(resolveStreak(state, '2026-09-25').streak).toBe(0);
  });

  it('shows the charge that a missed day will cost, without spending it twice', () => {
    const state = run(['2026-09-22']);

    const viewed = resolveStreak(state, '2026-09-24');
    expect(viewed.streak).toBe(1);
    expect(viewed.charges).toBe(0);
    // Reading did not mutate: the stored state still has its charge.
    expect(state.charges).toBe(1);
  });

  it('is empty before the first play', () => {
    expect(resolveStreak(emptyStreak, '2026-09-22')).toEqual(emptyStreak);
  });

  it('reads a last play dated ahead the way the next play will record it', () => {
    // A timezone crossed westward: the last play is dated tomorrow, and stays.
    const west: StreakState = { streak: 5, lastPlayedDay: '2026-09-24', charges: 1 };
    expect(resolveStreak(west, '2026-09-23')).toEqual(west);
    expect(playOn(west, '2026-09-23')).toEqual(resolveStreak(west, '2026-09-23'));

    // A clock that was a year ahead: the streak stands, re-dated to today.
    const ahead: StreakState = { streak: 3, lastPlayedDay: '2027-09-24', charges: 1 };
    expect(resolveStreak(ahead, '2026-09-25')).toEqual({ ...ahead, lastPlayedDay: '2026-09-25' });
    expect(playOn(ahead, '2026-09-25')).toEqual(resolveStreak(ahead, '2026-09-25'));
  });
});

describe('localDay', () => {
  it('pads month and day', () => {
    expect(localDay(new Date(2026, 0, 5, 13, 30))).toBe('2026-01-05');
  });

  it('uses the local calendar day, not UTC', () => {
    const date = new Date(2026, 8, 22, 23, 50);
    expect(localDay(date)).toBe('2026-09-22');
  });
});

describe('streak store', () => {
  beforeEach(() => {
    useStreak.getState().reset();
  });

  it('records a play through the store', () => {
    useStreak.getState().recordPlay(new Date(2026, 8, 22, 9, 0));
    useStreak.getState().recordPlay(new Date(2026, 8, 22, 21, 0));
    useStreak.getState().recordPlay(new Date(2026, 8, 23, 8, 0));

    expect(useStreak.getState().streak).toBe(2);
    expect(useStreak.getState().charges).toBe(1);
  });

  it('defaults to now', () => {
    useStreak.getState().recordPlay();

    expect(useStreak.getState().streak).toBe(1);
    expect(useStreak.getState().lastPlayedDay).toBe(localDay(new Date()));
  });
});
