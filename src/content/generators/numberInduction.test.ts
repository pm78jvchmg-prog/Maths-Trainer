/**
 * Number & Proof level 4, Proof by Induction: the claims behind the slides.
 *
 * The generic sweep proves each generator agrees with itself. These read the
 * TeX the learner sees with mathjs and check it against the arithmetic: that
 * every claim called true is true, that every false one is false while its
 * step still works, that each step's algebra is an identity, and that an
 * inequality's base case sits where the claim starts holding for good.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { makeRng } from '../../engine/rng';
import { inductionTesting, numberProofGenerators } from './numberProof';

const {
  ODD_C,
  NAT_C,
  INEQ_ALL,
  INEQ_WIDE,
  sumTerm,
  sumRight,
  sumTermTex,
  sumRightTex,
  sumMiddle,
  divisorsOf,
  divTex,
  divRest,
  ineqLeft,
  ineqRight,
  ineqStart,
} = inductionTesting;

/** The learner's TeX as mathjs reads it: `\tfrac{3}{2}k(k + 1)` becomes `(3/2)*k*(k + 1)`. */
function valueOf(tex: string, scope: Record<string, number>): number {
  const text = tex
    .replace(/\\tfrac\{(\d+)\}\{(\d+)\}/g, '($1/$2)')
    .replace(/\\times/g, '*')
    .replace(/\^\{([^}]*)\}/g, '^($1)')
    .replace(/\)\(/g, ')*(')
    .replace(/([0-9a-z)])\(/g, '$1*(')
    .replace(/(\d)([a-z])/g, '$1*$2');
  return Number(evaluate(text, scope));
}

const sums = (shift: number) => [
  ...ODD_C.map((c) => ({ kind: 'sum' as const, series: 'odd' as const, c, shift })),
  ...NAT_C.map((c) => ({ kind: 'sum' as const, series: 'nat' as const, c, shift })),
];

describe('sums', () => {
  it('states a true formula for every sum it calls true', () => {
    for (const claim of sums(0)) {
      let total = 0;
      for (let n = 1; n <= 12; n += 1) {
        expect(valueOf(sumTermTex(claim, 'n'), { n }), `${claim.series} ${claim.c}: term ${n}`).toBe(sumTerm(claim, n));
        total += sumTerm(claim, n);
        expect(valueOf(sumRightTex(claim, 'n'), { n }), `${claim.series} ${claim.c} at n = ${n}`).toBe(total);
        expect(sumRight(claim, n)).toBe(total);
      }
    }
  });

  it('tidies the assumed sum plus the next term into the right side at k + 1', () => {
    for (const shift of [0, -3, -1, 2]) {
      for (const claim of sums(shift)) {
        for (let k = 1; k <= 10; k += 1) {
          const reached = valueOf(sumRightTex(claim, 'k'), { k }) + valueOf(sumTermTex(claim, 'k', 1), { k });
          expect(valueOf(sumMiddle(claim), { k }), `${claim.series} ${claim.c} middle`).toBe(reached);
          expect(valueOf(sumRightTex(claim, 'k', 1), { k }), `${claim.series} ${claim.c} at k + 1`).toBe(reached);
        }
      }
    }
  });

  it('makes every shifted claim false at every n, though its step works', () => {
    for (const shift of [-3, -2, -1, 1, 2, 3]) {
      for (const claim of sums(shift)) {
        let total = 0;
        for (let n = 1; n <= 12; n += 1) {
          total += sumTerm(claim, n);
          expect(sumRight(claim, n), `${claim.series} ${claim.c} ${shift} at n = ${n}`).not.toBe(total);
        }
      }
    }
  });
});

describe('divisibility', () => {
  const claims = Array.from({ length: 14 }, (_, i) => i + 3).flatMap((b) =>
    divisorsOf(b - 1).flatMap((d) => Array.from({ length: 11 }, (_, i) => i - 1).filter((c) => c !== 0).map((c) => ({ kind: 'div' as const, b, c, d }))),
  );

  it('rewrites the case n = k + 1 around the case n = k', () => {
    for (const claim of claims) {
      for (let k = 1; k <= 5; k += 1) {
        const up = valueOf(divTex(claim, 'k + 1'), { k });
        expect(up, `${claim.b}, ${claim.c}`).toBe(claim.b * valueOf(divTex(claim, 'k'), { k }) + divRest(claim));
        expect(Math.abs(divRest(claim) % claim.d), 'the rest is a multiple of d').toBe(0);
      }
    }
  });

  it('is true at every n exactly when the base case is', () => {
    for (const claim of claims) {
      const base = (claim.b + claim.c) % claim.d === 0;
      for (let n = 1; n <= 6; n += 1) {
        const value = valueOf(divTex(claim, `${n}`), {});
        expect(value % claim.d === 0, `${divTex(claim, 'n')} by ${claim.d} at n = ${n}`).toBe(base);
      }
    }
  });
});

describe('inequalities', () => {
  const holds = (claim: (typeof INEQ_ALL)[number], n: number) =>
    valueOf(ineqLeft(claim, `${n}`), {}) > valueOf(ineqRight(claim, `${n}`), {});

  it('puts the base case where the claim starts holding for good', () => {
    for (const claim of [...INEQ_ALL, ...INEQ_WIDE]) {
      const N = ineqStart(claim);
      expect(N, `${claim.shape} ${claim.b} ${claim.a}`).toBeGreaterThanOrEqual(2);
      expect(holds(claim, N - 1), `${claim.shape} ${claim.a} at ${N - 1}`).toBe(false);
      for (let n = N; n <= 14; n += 1) expect(holds(claim, n), `${claim.shape} ${claim.a} at ${n}`).toBe(true);
      // The base case prints both sides, and nothing on the page reaches 1000.
      expect(valueOf(ineqLeft(claim, `${N}`), {})).toBeLessThan(1000);
    }
  });

  it('writes the claim at k + 1 as the claim with k + 1 in place of n', () => {
    for (const claim of [...INEQ_ALL, ...INEQ_WIDE]) {
      for (let k = 1; k <= 6; k += 1) {
        const n = k + 1;
        expect(valueOf(ineqLeft(claim, 'k + 1'), { k })).toBe(valueOf(ineqLeft(claim, 'n'), { n }));
        expect(valueOf(ineqRight(claim, 'k + 1'), { k })).toBe(valueOf(ineqRight(claim, 'n'), { n }));
      }
    }
  });

  it('closes each step with a fact that holds for every k from the base case', () => {
    // The last line of each step: what the hypothesis gives is at least the
    // right side at k + 1.
    const finish: Record<string, (k: number, b: number, a: number) => boolean> = {
      powLin: (k, b, a) => b * a * k >= a * (k + 1),
      factPow: (k) => (k + 1) * 2 ** k > 2 ** (k + 1),
      factLin: (k, _b, a) => (k + 1) * a * k >= a * (k + 1),
      powSq: (k) => 2 * k * k > (k + 1) ** 2,
      factSq: (k) => (k + 1) * k * k >= (k + 1) ** 2,
    };
    for (const claim of [...INEQ_ALL, ...INEQ_WIDE]) {
      for (let k = ineqStart(claim); k <= 15; k += 1) {
        expect(finish[claim.shape](k, claim.b, claim.a), `${claim.shape} ${claim.a} at k = ${k}`).toBe(true);
      }
    }
  });
});

describe('level 4 slides', () => {
  const induction = numberProofGenerators.filter((g) => g.id.startsWith('prf-ind-'));

  it('keeps every number on the page under 1000', () => {
    expect(induction.length).toBeGreaterThan(0);
    for (const generator of induction) {
      for (const difficulty of [1, 2]) {
        for (let seed = 0; seed < 200; seed += 1) {
          const slide = generator.render(generator.sample(makeRng(seed), difficulty) as never);
          const numbers = (JSON.stringify(slide).match(/\d+/g) ?? []).map(Number);
          expect(Math.max(...numbers), `${generator.id} seed ${seed}`).toBeLessThan(1000);
        }
      }
    }
  });
});
