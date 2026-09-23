/**
 * Number & Proof level 3, Logic and Implication: the claims behind the slides.
 *
 * The generic sweep proves each generator agrees with itself. These check the
 * statements it builds against an independent reading: every "true" and
 * "false" an arrow slide relies on, and every counterexample a converse slide
 * asks for, re-derived by evaluating the TeX the learner reads with mathjs.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { makeRng } from '../../engine/rng';
import { logicTesting } from './numberProof';
import { canonicalPieces, formatSet } from '../numberLine';

const { ONE_WAY, BOTH_WAYS, NEITHER_WAY, samplePair, pairOf, implies, converseCase, lineCase } = logicTesting;

/** A statement as mathjs reads it: `x \\ge 3` becomes `x >= 3`, `|x|` becomes `abs(x)`. */
function holdsAt(tex: string, x: number): boolean {
  const text = tex
    .replace(/\\ge/g, '>=')
    .replace(/\\le/g, '<=')
    .replace(/\\ne/g, '!=')
    .replace(/\|x\|/g, 'abs(x)')
    .replace(/x\(/g, 'x * (')
    .replace(/(^|[^<>!])=/g, '$1==');
  return Boolean(evaluate(text, { x }));
}

const GRID = Array.from({ length: 81 }, (_, i) => (i - 40) / 2);

describe('statement pairs', () => {
  const families = [
    ...ONE_WAY.map((family) => [family, true, false] as const),
    ...BOTH_WAYS.map((family) => [family, true, true] as const),
    ...NEITHER_WAY.map((family) => [family, false, false] as const),
  ];

  it.each(families)('%s runs forward %s and back %s', (family, forward, back) => {
    for (let seed = 0; seed < 200; seed += 1) {
      const params = samplePair(makeRng(seed), family);
      const { p, q, whole } = pairOf(params);
      expect(implies(p, q, whole), JSON.stringify(params)).toBe(forward);
      expect(implies(q, p, whole), JSON.stringify(params)).toBe(back);
    }
  });

  it('writes each negation as the opposite of its statement', () => {
    for (const family of [...ONE_WAY, ...BOTH_WAYS, ...NEITHER_WAY]) {
      for (let seed = 0; seed < 50; seed += 1) {
        const { p, q, whole } = pairOf(samplePair(makeRng(seed), family));
        if (whole) continue;
        for (const s of [p, q]) {
          for (const x of GRID) {
            expect(holdsAt(s.tex, x), `${s.tex} at ${x}`).toBe(s.holds(x));
            expect(holdsAt(s.neg, x), `${s.neg} at ${x}`).toBe(!s.holds(x));
          }
        }
      }
    }
  });
});

describe('prf-counter-converse', () => {
  it('asks for the one value that breaks the converse', () => {
    const cases = [
      ...['square', 'factor', 'zero', 'abs'].map((family) => ({ family, difficulty: 1 })),
      ...['quad', 'factor', 'square'].map((family) => ({ family, difficulty: 2 })),
    ];
    for (const { family } of cases) {
      for (let a = -9; a <= 9; a += 1) {
        for (let b = -7; b <= 7; b += 1) {
          if (a === 0 || a === b) continue;
          const params = { family: family as 'square', a, b };
          const { q, counter } = converseCase(params);
          const breakers = GRID.filter((x) => holdsAt(q, x) && x !== a);
          expect(breakers, `${q} with x = ${a}`).toEqual([counter]);
          expect(holdsAt(q, a), `${q} must follow from x = ${a}`).toBe(true);
        }
      }
    }
  });
});

describe('prf-counter-line', () => {
  it('shades exactly where the converse breaks', () => {
    for (const family of ['above', 'below', 'square', 'sqLess'] as const) {
      for (const closed of [false, true]) {
        for (let a = 1; a <= 5; a += 1) {
          const b = family === 'above' ? a - 3 : a + 3;
          const { p, q, piece } = lineCase({ family, a, b, closed, min: -10, max: 10 });
          expect(formatSet(canonicalPieces([piece]))).toBeTruthy();
          for (const x of GRID) {
            // The statement itself holds everywhere.
            if (holdsAt(p, x)) expect(holdsAt(q, x), `${p} => ${q} at ${x}`).toBe(true);
            const breaks = holdsAt(q, x) && !holdsAt(p, x);
            const inside =
              (x > piece.lo || (piece.loClosed && x === piece.lo)) &&
              (x < piece.hi || (piece.hiClosed && x === piece.hi));
            expect(inside, `${family} closed=${closed} a=${a} at ${x}`).toBe(breaks);
          }
        }
      }
    }
  });
});
