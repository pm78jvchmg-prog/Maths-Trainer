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
  // shrink between plays. A best score recorded against the old, larger
  // total must never be allowed to outlive that total.
  it('never persists a best score higher than the current total', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 3, total: 3 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 1, total: 2 });

    const record = useProgress.getState().lessons['lesson-a'];
    expect(record.bestCorrect).toBeLessThanOrEqual(record.total);
    expect(record.bestCorrect).toBe(2);
    expect(record.total).toBe(2);
  });

  it('clamps even when the smaller-total run is itself a new best', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 3, total: 3 });
    useProgress.getState().recordCompletion('lesson-a', { correct: 2, total: 2 });

    const record = useProgress.getState().lessons['lesson-a'];
    expect(record.bestCorrect).toBe(2);
    expect(record.total).toBe(2);
  });

  it('reset clears all lesson records', () => {
    useProgress.getState().recordCompletion('lesson-a', { correct: 1, total: 1 });
    useProgress.getState().reset();

    expect(useProgress.getState().lessons).toEqual({});
  });
});
