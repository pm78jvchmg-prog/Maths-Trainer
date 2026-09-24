import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProgress } from './progress';

describe('progress store', () => {
  beforeEach(() => {
    useProgress.getState().reset();
  });

  it('records a first completion as-is', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 2, total: 3 });

    const record = useProgress.getState().lessons['lesson-a'];
    expect(record.bestCorrect).toBe(2);
    expect(record.total).toBe(3);
    expect(record.timesPlayed).toBe(1);
  });

  it('keeps the best run across replays', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 1, total: 3 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 3, total: 3 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 2, total: 3 });

    const record = useProgress.getState().lessons['lesson-a'];
    expect(record.bestCorrect).toBe(3);
    expect(record.timesPlayed).toBe(3);
  });

  // Content is edited daily, so a lesson's skill check or level check can
  // shrink between plays. A best recorded against the old, larger total is
  // retired rather than clamped onto the new one: clamping reported 2 here,
  // a perfect run of a check the learner had just scored one out of two on.
  it('retires a best set against a larger total, rather than clamping it', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 3, total: 3 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 1, total: 2 });

    const record = useProgress.getState().lessons['lesson-a'];
    expect(record.bestCorrect).toBeLessThanOrEqual(record.total);
    expect(record.bestCorrect).toBe(1);
    expect(record.total).toBe(2);
  });

  // The same edit, where the new run happens to be a perfect one. The stored
  // best is still this run's, not the old total's.
  it('takes the new run when the smaller-total run is itself a new best', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 3, total: 3 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 2, total: 2 });

    const record = useProgress.getState().lessons['lesson-a'];
    expect(record.bestCorrect).toBe(2);
    expect(record.total).toBe(2);
  });

  // The direction that shipped with the four new Differentiation lessons:
  // three level checks grew, so a best set on the shorter check would have
  // been carried onto the longer one. A 12/12 run must not resurface as
  // "Best 12/15" against a check the learner has only ever scored 9 on.
  it('retires a best set against a smaller total when the check grows', () => {
    useProgress.getState().recordCompletion('df-l1:check', { correct: 12, total: 12 });
    useProgress.getState().recordCompletion('df-l1:check', { correct: 9, total: 15 });

    const record = useProgress.getState().lessons['df-l1:check'];
    expect(record.bestCorrect).toBe(9);
    expect(record.total).toBe(15);
  });

  // A best still survives a replay of the same assessment, which is the whole
  // point of keeping one.
  it('keeps the best across a total that changed and changed back', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 3, total: 3 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 1, total: 4 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 4, total: 4 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 2, total: 4 });

    const record = useProgress.getState().lessons['lesson-a'];
    expect(record.bestCorrect).toBe(4);
    expect(record.total).toBe(4);
  });

  it('reset clears all lesson records', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 1, total: 1 });
    useProgress.getState().recordAbandon('lesson-a');
    useProgress.getState().reset();

    expect(useProgress.getState().lessons).toEqual({});
    expect(useProgress.getState().abandoned).toEqual({});
  });

  // Leaving a check before its summary is counted, and that is all it does:
  // a lesson record is what marks a lesson finished and feeds mastery, so an
  // abandoned run must neither create one nor touch one that exists.
  it('counts an abandoned check without touching any lesson record', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 2, total: 3 });
    const before = useProgress.getState().lessons['lesson-a'];

    useProgress.getState().recordAbandon('lesson-a');
    useProgress.getState().recordAbandon('lesson-a');
    useProgress.getState().recordAbandon('df-l1:check');

    const state = useProgress.getState();
    expect(state.abandoned).toEqual({ 'lesson-a': 2, 'df-l1:check': 1 });
    expect(state.lessons['lesson-a']).toBe(before);
    expect(state.lessons['df-l1:check']).toBeUndefined();
    expect(Object.keys(state.lessons)).toEqual(['lesson-a']);
  });

  // Progress saved on the phone before the count existed has no `abandoned`
  // field at all. It must still load, keep every record, and count from zero.
  // The store is imported afresh over a stand-in localStorage holding such a
  // save, so this is the real persist config hydrating, not a copy of it.
  it('loads progress saved before abandoned attempts were counted', async () => {
    const record = { completedAt: 1, bestCorrect: 2, total: 3, timesPlayed: 4 };
    const saved = new Map<string, string>([
      ['maths-trainer:v1', JSON.stringify({ state: { lessons: { 'lesson-a': record } }, version: 0 })],
    ]);
    // zustand's default storage is `window.localStorage`, and the suite runs
    // in node, where there is no window at all.
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => saved.get(key) ?? null,
        setItem: (key: string, value: string) => void saved.set(key, value),
        removeItem: (key: string) => void saved.delete(key),
      },
    });
    vi.resetModules();
    try {
      const { useProgress: loaded } = await import('./progress');

      expect(loaded.getState().lessons).toEqual({ 'lesson-a': record });
      expect(loaded.getState().abandoned).toEqual({});

      loaded.getState().recordAbandon('lesson-a');
      expect(loaded.getState().abandoned).toEqual({ 'lesson-a': 1 });
      expect(loaded.getState().lessons).toEqual({ 'lesson-a': record });
      expect(JSON.parse(saved.get('maths-trainer:v1') ?? '{}').state.abandoned).toEqual({ 'lesson-a': 1 });
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
