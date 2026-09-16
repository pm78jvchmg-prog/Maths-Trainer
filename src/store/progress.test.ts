import { describe, it, expect, beforeEach } from 'vitest';
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
    useProgress.getState().reset();

    expect(useProgress.getState().lessons).toEqual({});
  });
});
