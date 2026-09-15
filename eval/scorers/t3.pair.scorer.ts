import { describe, expect, it } from 'vitest';
import { ROOT, bin, isSolved, num, pow, reduceAt, replay, root, targets, toTex } from './expr';

/**
 * Implementation-neutral checks for the two behaviours asked for. Neither names
 * a path convention: the pair step is found by trying every legal target and
 * every plausible value, and passing if any of them produces the line a learner
 * who did `4 - 3` first would see.
 */
describe('two right-hand terms of a chain are one step', () => {
  const chain = bin('-', bin('+', root(num(36)), num(4)), num(3));

  it('offers a step that collapses 4 - 3 and leaves the root alone', () => {
    const reached = targets(chain)
      .filter((t) => t.legal)
      .some((t) =>
        Array.from({ length: 101 }, (_, i) => i - 50).some(
          (v) => toTex(reduceAt(chain, t.path, v)) === '\\sqrt{36} + 1',
        ),
      );
    expect(reached, 'no legal tap produces sqrt(36) + 1').toBe(true);
  });
});

describe('a walk is graded on its values', () => {
  const line = bin('+', num(8), bin('*', num(4), num(3)));

  it('accepts the whole line settled in one tap with the right number', () => {
    expect(replay(line, [{ path: ROOT, value: 20 }]).fault).toBeUndefined();
    expect(isSolved(line, [{ path: ROOT, value: 20 }])).toBe(true);
  });

  it('still refuses the number the wrong order produces', () => {
    expect(replay(line, [{ path: ROOT, value: 36 }]).fault).toBeDefined();
  });

  it('refuses a wrong value on a settled piece', () => {
    const settled = bin('+', num(8), num(12));
    expect(replay(settled, [{ path: ROOT, value: 21 }]).fault).toBeDefined();
  });

  it('leaves an ordinary correct walk correct', () => {
    expect(
      isSolved(line, [
        { path: 'r.r', value: 12 },
        { path: ROOT, value: 20 },
      ]),
    ).toBe(true);
    expect(pow(num(2), num(3))).toBeDefined();
  });
});
