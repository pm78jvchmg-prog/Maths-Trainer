import { describe, expect, it } from 'vitest';
import * as expr from './expr';
import { ROOT, bin, isSolved, num, pow, replay, root, targets, toTex, type Expr } from './expr';

/**
 * Implementation-neutral checks for the two behaviours asked for.
 *
 * The pair step is found by *reachability*, not by an API. The first version
 * applied every legal target through `reduceAt` and so pinned a signature:
 * rep 3 routes a partial-chain tap through `applyRun(expr, run, value)`
 * instead, satisfied the requirement, and was invisible to it. A correct
 * implementation is free to add a step type with its own applier, so this
 * tries every exported function of the module in both shapes — `f(expr, path,
 * value)` and `f(expr, handle, value)`, where the handle is whatever another
 * export returns for that path — and passes if any of them produces the line a
 * learner who did `4 - 3` first would see.
 */
const VALUES = Array.from({ length: 101 }, (_, i) => i - 50);
const PAIR_LINE = '\\sqrt{36} + 1';

/** Every way this module might let a tap at `path` be applied with a value. */
function appliers(chain: Expr, path: string): ((value: number) => unknown)[] {
  const fns = Object.values(expr).filter((v): v is (...args: never[]) => unknown =>
    typeof v === 'function',
  );
  const handles: unknown[] = [path];
  for (const fn of fns) {
    try {
      const handle = (fn as (e: Expr, p: string) => unknown)(chain, path);
      if (handle && typeof handle === 'object') handles.push(handle);
    } catch {
      /* not a path lookup */
    }
  }
  return fns.flatMap((fn) =>
    handles.map(
      (handle) => (value: number) =>
        (fn as (e: Expr, h: unknown, v: number) => unknown)(chain, handle, value),
    ),
  );
}

describe('two right-hand terms of a chain are one step', () => {
  const chain = bin('-', bin('+', root(num(36)), num(4)), num(3));

  it('offers a step that collapses 4 - 3 and leaves the root alone', () => {
    const reached = targets(chain)
      .filter((t) => t.legal)
      .some((t) =>
        appliers(chain, t.path).some((apply) =>
          VALUES.some((v) => {
            try {
              return toTex(apply(v) as Expr) === PAIR_LINE;
            } catch {
              return false;
            }
          }),
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
