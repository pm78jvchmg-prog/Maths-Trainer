import { describe, it, expect } from 'vitest';
import { tapOnQuestion } from './questionTap';

describe('a tap on the question after a wrong answer', () => {
  it('keeps the option the same tap chose, rather than wiping it', () => {
    // The two-tap bug: the option's click set the draft, then bubbled to the
    // question, whose handler cleared the draft it had just been given.
    const tap = tapOnQuestion({ feedback: 'incorrect', canRetry: true, draft: 'a', answered: 'b' });
    expect(tap.draft).toBe('b');
  });

  it('leaves the verdict to the edit the widget already made', () => {
    // `edit` has cleared the wrong verdict; a `tryAgain` on top would be a
    // second action for one tap.
    const tap = tapOnQuestion({ feedback: 'incorrect', canRetry: true, draft: 'a', answered: 'b' });
    expect(tap.retry).toBe(false);
  });

  it('keeps an array answer as the widget built it', () => {
    const tap = tapOnQuestion({
      feedback: 'incorrect',
      canRetry: true,
      draft: ['3', ''],
      answered: ['3', '4'],
    });
    expect(tap.draft).toEqual(['3', '4']);
  });

  it('clears the verdict on a bare tap and keeps the old answer to change', () => {
    // A tap beside the slider used to send the handle back to rest, and one
    // on a tiles or tree slide left a string where the widget holds an array.
    const tap = tapOnQuestion({ feedback: 'incorrect', canRetry: true, draft: '-5', answered: undefined });
    expect(tap).toEqual({ retry: true, draft: '-5' });

    const tiles = tapOnQuestion({
      feedback: 'incorrect',
      canRetry: true,
      draft: ['3', '4'],
      answered: undefined,
    });
    expect(tiles).toEqual({ retry: true, draft: ['3', '4'] });
  });

  it('does nothing in a level check, where the answer is final', () => {
    const tap = tapOnQuestion({ feedback: 'incorrect', canRetry: false, draft: 'a', answered: undefined });
    expect(tap).toEqual({ retry: false, draft: 'a' });
  });

  it('retries nothing when there is no wrong verdict to clear', () => {
    for (const feedback of ['idle', 'correct', 'revealed', 'invalid'] as const) {
      expect(tapOnQuestion({ feedback, canRetry: true, draft: 'a', answered: undefined })).toEqual({
        retry: false,
        draft: 'a',
      });
    }
    expect(
      tapOnQuestion({ feedback: 'idle', canRetry: true, draft: 'a', answered: 'b' }),
    ).toEqual({ retry: false, draft: 'b' });
  });
});
