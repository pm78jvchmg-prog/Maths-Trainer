/**
 * Independent checks for the values in Further Integration levels 9 to 11
 * that the sweep's oracles cannot reach.
 *
 * The sweep differentiates typed antiderivatives and integrates typed
 * definite values by quadrature. That leaves the improper integrals (no finite
 * limit to hand to quadrature) and every value that reaches the learner as a
 * tree or tile token, which the sweep only checks against the generator's own
 * answer. Each is worked out again here by a different route.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { fval } from './integralKit';
import { gammaIntegrand, gammaValue, reductionByName, wallis, type GammaParams } from './integrationReduction';
import { arcLengthByName, type ParamParams } from './integrationArcLength';
import { arsinhRatio, catenaryLength, hypValue, inverseByName, type HypValueParams } from './integrationInverse';
import { parseExpression } from '../../engine/expression';

/** Simpson's rule on [a, b] with n (even) strips. */
function simpson(f: (x: number) => number, a: number, b: number, n = 4000): number {
  const h = (b - a) / n;
  let total = f(a) + f(b);
  for (let i = 1; i < n; i += 1) total += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (total * h) / 3;
}

const seeds = Array.from({ length: 150 }, (_, i) => i);

describe('reduction formulae', () => {
  it('gives each ∫_0^∞ x^n e^{-kx} the value quadrature finds', () => {
    // Cut off where the tail is far below the tolerance: e^{-x/k} with k ≤ 6
    // and n ≤ 9 is negligible past x = 60k.
    for (const seed of seeds) {
      for (const difficulty of [1, 2]) {
        const p = reductionByName.gammaTyped.sample(makeRng(seed), difficulty) as GammaParams;
        const parsed = parseExpression(gammaIntegrand(p));
        if (!parsed.ok) throw new Error(gammaIntegrand(p));
        const f = (x: number) => parsed.node.evaluate({ x }) as number;
        const end = p.form === 'times' ? 80 / p.k : 80 * p.k;
        const numeric = simpson(f, 0, end, 20000);
        expect(Math.abs(numeric - fval(gammaValue(p))), JSON.stringify(p)).toBeLessThan(1e-6 * Math.max(1, numeric));
      }
    }
  });

  it('gives each ∫_0^{π/2} sin^n x the value quadrature finds', () => {
    for (let n = 0; n <= 12; n += 1) {
      const w = wallis(n);
      const exact = fval(w.f) * (w.pi ? Math.PI : 1);
      expect(Math.abs(simpson((x) => Math.sin(x) ** n, 0, Math.PI / 2) - exact), `n = ${n}`).toBeLessThan(1e-9);
      expect(Math.abs(simpson((x) => Math.cos(x) ** n, 0, Math.PI / 2) - exact), `cos, n = ${n}`).toBeLessThan(1e-9);
    }
  });
});

describe('arc length', () => {
  it('ends every speed tree on the root of the sum of squares', () => {
    for (const seed of seeds) {
      const g = arcLengthByName.paramSpeedTree;
      const p = g.sample(makeRng(seed), 1) as ParamParams;
      const slide = g.render(p);
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const [dx, dy, dx2, dy2, sum, speed] = slide.answer.map(Number);
      expect(dx2).toBe(dx * dx);
      expect(dy2).toBe(dy * dy);
      expect(sum).toBe(dx2 + dy2);
      expect(speed * speed, JSON.stringify(p)).toBe(sum);
    }
  });
});

describe('hyperbolic functions', () => {
  it('works out cosh and sinh of k ln m as Math does', () => {
    for (const seed of seeds) {
      for (const difficulty of [1, 2]) {
        const p = inverseByName.hypTree.sample(makeRng(seed), difficulty) as HypValueParams;
        const slide = inverseByName.hypTree.render(p);
        if (slide.kind !== 'tree') throw new Error('not a tree');
        // The expression names the argument; rebuild x from e^x, the first answer.
        const [num, den] = slide.answer[0].match(/\d+/g)!.map(Number);
        const x = Math.log(den === undefined ? num : num / den);
        const expected = p.fn === 'cosh' ? Math.cosh(x) : Math.sinh(x);
        expect(Math.abs(fval(hypValue(p)) - expected), JSON.stringify(p)).toBeLessThan(1e-12);
      }
    }
  });

  it('gives a hanging chain the length quadrature finds', () => {
    for (let c = 1; c <= 6; c += 1) {
      for (let m = 2; m <= 6; m += 1) {
        const end = c * Math.log(m);
        const numeric = simpson((x) => Math.sqrt(1 + Math.sinh(x / c) ** 2), 0, end);
        expect(Math.abs(numeric - fval(catenaryLength({ c, m, both: false })))).toBeLessThan(1e-9);
      }
    }
  });

  it('writes arsinh and arcosh of each triple as the logarithm Math gives', () => {
    const triples = [
      [3, 4, 5],
      [4, 3, 5],
      [5, 12, 13],
      [12, 5, 13],
      [8, 15, 17],
      [15, 8, 17],
      [7, 24, 25],
      [24, 7, 25],
    ];
    triples.forEach(([p, q, r], t) => {
      expect(Math.abs(Math.log(fval(arsinhRatio({ t }))) - Math.asinh(p / q))).toBeLessThan(1e-12);
      expect(Math.abs(Math.log((r + p) / q) - Math.acosh(r / q))).toBeLessThan(1e-12);
    });
    for (const seed of seeds) {
      const g = inverseByName.hypLogTree;
      const slide = g.render(g.sample(makeRng(seed), 1));
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const read = (tex: string) => {
        const [a, b] = tex.match(/\d+/g)!.map(Number);
        return b === undefined ? a : a / b;
      };
      const [u, root, sum, value] = slide.answer;
      const isSinh = slide.expression.includes('+');
      const uv = read(u);
      expect(Math.abs(read(root) - Math.sqrt(uv * uv + (isSinh ? 1 : -1)))).toBeLessThan(1e-12);
      expect(Math.abs(read(sum) - uv - read(root))).toBeLessThan(1e-12);
      expect(Math.abs(Math.log(read(value)) - (isSinh ? Math.asinh(uv) : Math.acosh(uv)))).toBeLessThan(1e-12);
    }
  });
});
