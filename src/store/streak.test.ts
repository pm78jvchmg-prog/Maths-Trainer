import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MAX_CHARGES,
  backfillCharges,
  emptyStreak,
  countedOn,
  localDay,
  playOn,
  playOnAt,
  RECENT_DAYS,
  bestStreak,
  recentDays,
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

  it('earns a charge on every day played, up to two', () => {
    // The owner's streak sat at one charge for good when only a streak's first
    // day earned one.
    const days = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23'];
    expect(days.map((_, index) => run(days.slice(0, index + 1)).charges)).toEqual([1, 2, 2, 2]);
    expect(playOn({ streak: 3, lastPlayedDay: '2026-09-22', charges: 1 }, '2026-09-23').charges).toBe(2);
  });

  it('spends a charge to cover one missed day, then earns one for the day played', () => {
    const before: StreakState = { streak: 3, lastPlayedDay: '2026-09-22', charges: 1 };

    // 23rd missed, back on the 24th.
    const after = playOn(before, '2026-09-24');

    expect(after.streak).toBe(4);
    expect(after.charges).toBe(1);
    expect(resolveStreak(before, '2026-09-24').charges).toBe(0);
  });

  it('resets after two missed days with no charge left', () => {
    const spent: StreakState = { streak: 3, lastPlayedDay: '2026-09-23', charges: 0 };

    // 24th and 25th missed, back on the 26th, nothing banked to cover them.
    const after = playOn(spent, '2026-09-26');

    expect(after.streak).toBe(1);
  });

  it('resets after a missed day when no charge is banked', () => {
    const spent: StreakState = { streak: 2, lastPlayedDay: '2026-09-22', charges: 0 };

    const after = playOn(spent, '2026-09-24');

    expect(after.streak).toBe(1);
  });

  it('spends two charges to cover two missed days', () => {
    const banked: StreakState = { streak: 9, lastPlayedDay: '2026-09-20', charges: 2 };

    const after = playOn(banked, '2026-09-23');

    expect(after.streak).toBe(10);
    // Both spent, and one earned back by the play.
    expect(after.charges).toBe(1);
  });

  it('earns a charge again when a streak restarts after a break', () => {
    // Start with nothing banked, so the charge counted here is the one the
    // restart earns rather than one carried over from the streak that died.
    const dead = playOn({ streak: 9, lastPlayedDay: '2026-09-01', charges: 0 }, '2026-09-10');

    expect(dead.streak).toBe(1);
    expect(dead.charges).toBe(1);
  });

  it('never banks more than two charges', () => {
    const state = run(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-20']);

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
});

describe('the clock moving between plays', () => {
  const HOUR = 60 * 60 * 1000;
  /** An instant, in epoch milliseconds, `hours` after 2026-09-20 00:00 UTC. */
  const at = (hours: number) => Date.UTC(2026, 8, 20) + hours * HOUR;

  const fiveDays = run(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24']);

  it('does not count a day twice when travelling west', () => {
    // Played on the 24th in Sydney, then flew to London, where it is the 23rd.
    expect(fiveDays.streak).toBe(5);
    const west = playOn(fiveDays, '2026-09-23');
    expect(west).toEqual(fiveDays);

    // The 24th comes round again in London: it was counted in Sydney.
    const again = playOn(west, '2026-09-24');
    expect(again.streak).toBe(5);

    // And the day after carries on as normal.
    expect(playOn(again, '2026-09-25').streak).toBe(6);
  });

  it('does not count a day twice across midnight going west', () => {
    // 00:10 on the 24th, then a flight lands at 23:50 on the 23rd.
    const east = playOnAt(fiveDays, '2026-09-24', at(96 + 0.2));
    const west = playOnAt(east, '2026-09-23', at(96 + 3));

    expect(west.streak).toBe(5);
    expect(west.lastPlayedDay).toBe('2026-09-24');
    expect(playOnAt(west, '2026-09-24', at(96 + 13)).streak).toBe(5);
  });

  it('treats two days back, the whole width of the timezones, as travel', () => {
    const west = playOn(fiveDays, '2026-09-22');
    expect(west).toEqual(fiveDays);
    expect(playOn(west, '2026-09-25').streak).toBe(6);
  });

  it('shows the day as done on the home screen after travelling west', () => {
    expect(countedOn(fiveDays, '2026-09-23')).toBe(true);
    expect(countedOn(fiveDays, '2026-09-24')).toBe(true);
    expect(countedOn(fiveDays, '2026-09-25')).toBe(false);
    expect(countedOn(emptyStreak, '2026-09-25')).toBe(false);
  });

  it('does not spend a charge on a day the clock skipped travelling east', () => {
    // 22:00 on the 23rd in Los Angeles, landing in Sydney at 06:00 on the 25th:
    // fifteen hours later, and the 24th never happened here.
    const la = playOnAt({ streak: 1, lastPlayedDay: '2026-09-22', charges: 0 }, '2026-09-23', at(77));
    expect(la.charges).toBe(1);

    expect(resolveStreak(la, '2026-09-25', at(92))).toEqual(la);
    const sydney = playOnAt(la, '2026-09-25', at(92));
    expect(sydney.streak).toBe(3);
    // Nothing spent, and one earned.
    expect(sydney.charges).toBe(2);
  });

  it('does not end a streak with no charges over a day the clock skipped', () => {
    const bare: StreakState = { streak: 4, lastPlayedDay: '2026-09-23', charges: 0, lastPlayedAt: at(77) };
    expect(playOnAt(bare, '2026-09-25', at(92)).streak).toBe(5);
  });

  it('still spends a charge on a day genuinely missed, even one minute past', () => {
    // 23:59 on the 23rd, then 00:00 on the 25th: the 24th went by unplayed.
    const late = playOnAt({ streak: 1, lastPlayedDay: '2026-09-22', charges: 0 }, '2026-09-23', at(72 + 23.98));
    const after = playOnAt(late, '2026-09-25', at(96 + 24));
    expect(after.streak).toBe(3);
    // One spent, one earned.
    expect(after.charges).toBe(1);
  });

  it('still spends a charge on a missed day that the clocks shortened to 23 hours', () => {
    // 23:50 on the 23rd; the 24th is 23 hours long; 00:10 on the 25th is
    // 23 hours 20 minutes of real time later.
    const late = playOnAt({ streak: 1, lastPlayedDay: '2026-09-22', charges: 0 }, '2026-09-23', at(72 + 23 + 5 / 6));
    const after = playOnAt(late, '2026-09-25', at(72 + 23 + 5 / 6 + 23 + 1 / 3));
    expect(after.charges).toBe(1);
  });

  it('re-dates a play recorded with the clock a year ahead, without adding a day', () => {
    // Fixed in the first reverted attempt by ignoring every play dated before
    // the last, which froze the streak at 3 until 2027-09-24 came round.
    const ahead: StreakState = { streak: 3, lastPlayedDay: '2027-09-24', charges: 1 };

    const corrected = playOn(ahead, '2026-09-25');
    expect(corrected.streak).toBe(3);
    expect(corrected.lastPlayedDay).toBe('2026-09-25');
    expect(corrected.charges).toBe(1);

    expect(playOn(corrected, '2026-09-26').streak).toBe(4);
  });

  it('keeps the streak when a clock set a year back is put right', () => {
    // The second reverted attempt re-dated the last play to the wrong year and
    // forgot the real one, so putting the clock right read as a year missed.
    const wrong = playOn(fiveDays, '2025-09-25');
    expect(wrong.streak).toBe(5);
    const stillWrong = playOn(wrong, '2025-09-26');
    expect(stillWrong.streak).toBe(6);

    // Put right on the third day: the 25th and 26th were played, if misdated.
    const right = playOn(stillWrong, '2026-09-27');
    expect(right.streak).toBe(7);
    expect(right.charges).toBe(fiveDays.charges);
    expect(playOn(right, '2026-09-28').streak).toBe(8);
  });

  it('counts a day once when the clock goes wrong and is put right the same day', () => {
    const wrong = playOn(fiveDays, '2025-09-25');

    // Put right on the 25th: one day, played twice.
    expect(playOn(wrong, '2026-09-25').streak).toBe(6);

    // Put right straight back to the 24th, already counted.
    const back = playOn(wrong, '2026-09-24');
    expect(back.streak).toBe(5);
    expect(back.lastPlayedDay).toBe('2026-09-24');
    expect(back.replaced).toBeNull();
    expect(playOn(back, '2026-09-25').streak).toBe(6);
  });

  it('still ends the streak for a real break after the clock went wrong', () => {
    const wrong = playOn(fiveDays, '2025-09-25');

    // Put right a week later with nothing played in between.
    expect(playOn(wrong, '2026-10-01').streak).toBe(1);
  });

  it('forgets the replaced day once the new dates have run two weeks', () => {
    const corrected = playOn({ streak: 3, lastPlayedDay: '2027-09-24', charges: 1 }, '2026-09-25');
    expect(corrected.replaced?.day).toBe('2027-09-24');

    const days = Array.from({ length: 16 }, (_, i) => localDay(new Date(2026, 8, 26 + i)));
    const later = run(days, corrected);
    expect(later.streak).toBe(19);
    expect(later.replaced).toBeNull();
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

describe('the streak view', () => {
  const kinds = (state: StreakState, today: string, alsoPlayed: string[] = []) =>
    recentDays(state, today, undefined, alsoPlayed).map((entry) => entry.kind);

  it('marks the days played and the day a charge covered', () => {
    // Played 20th and 21st, missed the 22nd, back on the 23rd: one charge spent.
    const state = run(['2026-09-20', '2026-09-21', '2026-09-23']);
    expect(state.days).toEqual({ '2026-09-20': 'played', '2026-09-21': 'played', '2026-09-22': 'charge', '2026-09-23': 'played' });
    expect(kinds(state, '2026-09-23')).toEqual(['missed', 'played', 'played', 'charge', 'played']);
  });

  it('leaves a missed day grey when no charge was left to cover it', () => {
    const state = run(['2026-09-20', '2026-09-22', '2026-09-25']);
    // The 21st took the only charge and the 22nd earned one back; that could
    // not cover both the 23rd and 24th, so the run restarted.
    expect(state.streak).toBe(1);
    expect(kinds(state, '2026-09-25')).toEqual(['charge', 'played', 'missed', 'missed', 'played']);
  });

  it('shows today open until it is played', () => {
    const state = run(['2026-09-22', '2026-09-23']);
    expect(kinds(state, '2026-09-24')).toEqual(['missed', 'missed', 'played', 'played', 'today']);
  });

  it('shows a missed day the next play will cover as covered, as the charge count does', () => {
    const state = run(['2026-09-22', '2026-09-23']);
    expect(resolveStreak(state, '2026-09-25').charges).toBe(1);
    expect(kinds(state, '2026-09-25')).toEqual(['missed', 'played', 'played', 'charge', 'today']);
  });

  it('shows the gap grey once the run has lapsed', () => {
    const state = run(['2026-09-22']);
    expect(kinds(state, '2026-09-26')).toEqual(['played', 'missed', 'missed', 'missed', 'today']);
  });

  it('counts days lessons were finished on from before the log was kept', () => {
    const old: StreakState = { streak: 2, lastPlayedDay: '2026-09-23', charges: 1 };
    expect(kinds(old, '2026-09-23', ['2026-09-22'])).toEqual(['missed', 'missed', 'missed', 'played', 'played']);
  });

  it('keeps only the latest days', () => {
    const days = Array.from({ length: 20 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`);
    const state = run(days);
    expect(Object.keys(state.days ?? {})).toHaveLength(RECENT_DAYS);
    expect(Object.keys(state.days ?? {}).sort()[0]).toBe('2026-09-07');
  });

  it('remembers the longest run after it lapses', () => {
    const state = run(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10']);
    expect(state.streak).toBe(1);
    expect(state.best).toBe(3);
    expect(bestStreak(state, '2026-09-10')).toBe(3);
    // A streak saved before `best` was kept counts its own run.
    expect(bestStreak({ streak: 7, lastPlayedDay: '2026-09-10', charges: 1 }, '2026-09-10')).toBe(7);
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
    expect(useStreak.getState().charges).toBe(2);
  });

  it('backfills the charges a streak saved under the old rule missed', () => {
    expect(backfillCharges({ streak: 4, lastPlayedDay: '2026-09-25', charges: 1 }).charges).toBe(2);
    expect(backfillCharges({ streak: 2, lastPlayedDay: '2026-09-25', charges: 0 }).charges).toBe(1);
    const fresh: StreakState = { streak: 1, lastPlayedDay: '2026-09-25', charges: 1 };
    expect(backfillCharges(fresh)).toBe(fresh);
    expect(backfillCharges(emptyStreak)).toBe(emptyStreak);
  });

  // The owner's phone: a 4 day streak holding one charge, saved before the
  // store had a version. It must load with two, with nothing pressed.
  it('corrects a streak saved under the old rule when the app opens', async () => {
    const old = { streak: 4, lastPlayedDay: '2026-09-25', charges: 1, lastPlayedAt: 5, best: 4, days: {} };
    const saved = new Map<string, string>([['maths-trainer:streak:v1', JSON.stringify({ state: old, version: 0 })]]);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => saved.get(key) ?? null,
        setItem: (key: string, value: string) => void saved.set(key, value),
        removeItem: (key: string) => void saved.delete(key),
      },
    });
    vi.resetModules();
    try {
      const { useStreak: loaded } = await import('./streak');
      expect(loaded.getState()).toMatchObject({ ...old, charges: 2 });

      // Saved at the new version, so opening again adds nothing.
      loaded.getState().recordPlay(new Date(2026, 8, 25, 20, 0));
      const stored = JSON.parse(saved.get('maths-trainer:streak:v1') ?? '{}');
      expect(stored.version).toBe(1);
      expect(stored.state.charges).toBe(2);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it('clears everything on reset', () => {
    useStreak.getState().recordPlay(new Date(2026, 8, 22, 9, 0));
    useStreak.getState().reset();

    const { streak, lastPlayedDay, charges, lastPlayedAt, replaced, best, days } = useStreak.getState();
    expect({ streak, lastPlayedDay, charges, lastPlayedAt, replaced, best, days }).toEqual(emptyStreak);
  });

  it('defaults to now', () => {
    useStreak.getState().recordPlay();

    expect(useStreak.getState().streak).toBe(1);
    expect(useStreak.getState().lastPlayedDay).toBe(localDay(new Date()));
  });
});
