import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../engine/equivalence';

/**
 * The working keys only help if the checker marks typed working by its value.
 * These are the owner's own example and two like it, written the way the
 * keypad serialises them (a degree-mode sine is `sind`).
 */
describe('typed working on mechanics answers', () => {
  const grade = (typed: string, answer: string) =>
    checkAnswer(typed, answer, { domain: 'real', mode: 'exact' }).status;

  it('accepts a calculation whose value is the answer', () => {
    expect(grade('(18*9.8 - 10*9.8*0.6)/28', '4.2')).toBe('correct');
    expect(grade('4*9.8/14', '2.8')).toBe('correct');
    expect(grade('20*sind(30)', '10')).toBe('correct');
  });

  it('still marks a wrong calculation wrong', () => {
    expect(grade('(18*9.8 - 10*9.8*0.8)/28', '4.2')).toBe('incorrect');
  });
});
