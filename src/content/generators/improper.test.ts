/**
 * An independent check on the values behind the improper-integrals level.
 *
 * The quadrature oracle in `generators.test.ts` reads finite limits only, and
 * would integrate straight through a pole, so nothing in that level declares
 * `integrand` or `limits` and every value would otherwise go unchecked. Here
 * each generator's integral (its `ImproperSpec`, the integrand in mathjs
 * syntax) is integrated numerically, out towards infinity or in towards the
 * pole, and compared with the answer read back off the rendered slide: the
 * value typed, the tiles placed, the option marked correct, the route taken.
 *
 * The integration never touches an infinite or singular end. Each piece of
 * the interval is split at its middle and each half is written as x = end ±
 * e^s, which turns an end at infinity or at a pole into a long but smooth run
 * in s that Simpson's rule handles; the cut-off sits at e^s = 10^-30 or 10^30.
 * Converging and diverging are told apart by doing that twice, at 10^±15 and
 * 10^±30: a convergent integral barely moves between the two, a divergent one
 * moves by at least ln(10^7), about 16 (the smaller figure is for a pole away
 * from 0; see `towardsEnd`).
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import {
  expTailSpec,
  halvesSpec,
  improperGenerators as g,
  pFlowSpec,
  poleTreeSpec,
  powerTailSpec,
  rootPoleSpec,
  rootTailSpec,
  tailSliderSpec,
  trapSpec,
  twoSidedSpec,
  verdictSpec,
  whichSpec,
  type ExpTailParams,
  type HalvesParams,
  type ImproperSpec,
  type PFlowParams,
  type PoleTreeParams,
  type PowerTailParams,
  type RootPoleParams,
  type RootTailParams,
  type TailSliderParams,
  type TrapParams,
  type TwoSidedParams,
  type VerdictParams,
  type WhichParams,
} from './integration';

const SEEDS = 60;
const STEPS = 3000;

function draws<P>(generator: Generator<P>): { params: P; slide: Slide; seed: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed };
    }),
  );
}

type Fn = (x: number) => number;

function compile(f: string): Fn {
  const code = math.compile(f);
  return (x) => {
    const value = code.evaluate({ x });
    return typeof value === 'number' ? value : NaN;
  };
}

/** Simpson's rule for a smooth g over [from, to]. */
function simpson(g: Fn, from: number, to: number): number {
  const h = (to - from) / STEPS;
  let total = 0;
  for (let i = 0; i <= STEPS; i += 1) {
    const weight = i === 0 || i === STEPS ? 1 : i % 2 === 1 ? 4 : 2;
    total += weight * g(from + i * h);
  }
  return (total * h) / 3;
}

/**
 * The integral of f between `anchor` and `end`, whichever order they come in.
 * `end` may be infinite or a pole; `cut` is how close to it (or how far out)
 * the integral stops, as a power of ten.
 */
function towardsEnd(f: Fn, anchor: number, end: number, cut: number): number {
  if (Number.isFinite(end)) {
    // x = end + side * e^s, s from ln(10^-cut) up to ln |anchor - end|. Beside
    // an end other than 0, x itself cannot be written closer to the end than
    // about 10^-15, so the cut-offs there are 10^-7 and 10^-14 instead.
    const side = anchor > end ? 1 : -1;
    const top = Math.log(Math.abs(anchor - end));
    const usable = end === 0 ? cut : (cut * 14) / 30;
    return simpson((s) => f(end + side * Math.exp(s)) * Math.exp(s), -usable * Math.LN10, top);
  }
  // x = anchor + side * (e^s - 1), s from 0 out to ln(10^cut).
  const side = end > 0 ? 1 : -1;
  return simpson((s) => f(anchor + side * (Math.exp(s) - 1)) * Math.exp(s), 0, cut * Math.LN10);
}

/**
 * The integral over the spec's interval, one piece per split, each cut off at
 * 10^±cut. Kept as pieces because an improper integral converges only when
 * every piece does: 1/x^3 from -1 to 2 has two infinite halves that cancel
 * when cut off symmetrically, and adding them first would hide that.
 */
function pieces(spec: ImproperSpec, cut: number): number[] {
  const f = compile(spec.f);
  const points = [spec.lower, ...(spec.splits ?? []), spec.upper];
  const out: number[] = [];
  for (let i = 0; i + 1 < points.length; i += 1) {
    const [a, b] = [points[i], points[i + 1]];
    const middle = Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : Number.isFinite(a) ? a + 1 : Number.isFinite(b) ? b - 1 : 0;
    // Each half runs from the middle towards one end, so either end may be infinite or a pole.
    out.push(towardsEnd(f, middle, a, cut), towardsEnd(f, middle, b, cut));
  }
  return out;
}

type Verdict = { converges: true; value: number } | { converges: false };

function judge(spec: ImproperSpec): Verdict {
  const near = pieces(spec, 15);
  const far = pieces(spec, 30);
  for (let i = 0; i < far.length; i += 1) {
    const moved = Math.abs(far[i] - near[i]);
    if (!Number.isFinite(far[i]) || !Number.isFinite(near[i]) || moved > 1) return { converges: false };
    expect(moved, `${spec.f} neither settles nor runs away`).toBeLessThan(1e-3 * Math.max(1, Math.abs(far[i])));
  }
  return { converges: true, value: far.reduce((sum, piece) => sum + piece, 0) };
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-5 * Math.max(1, Math.abs(a), Math.abs(b));

/** A label such as `\text{Converges to } -\frac{3}{2}`, read back as a verdict. */
function readVerdict(label: string): Verdict {
  if (label.includes('Diverges')) return { converges: false };
  const tail = label.replace('\\text{Converges to }', '').trim();
  const fraction = tail.match(/^(-?)\\frac\{(\d+)\}\{(\d+)\}$/);
  const value = fraction ? (fraction[1] ? -1 : 1) * (Number(fraction[2]) / Number(fraction[3])) : Number(tail);
  expect(Number.isNaN(value), `unreadable option ${label}`).toBe(false);
  return { converges: true, value };
}

function chosen(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error(`expected a choice slide, got ${slide.kind}`);
  const right = slide.options.find((option) => option.id === slide.correctId);
  if (!right) throw new Error('no correct option');
  return right.label;
}

function expectValue(spec: ImproperSpec, claimed: number, where: string) {
  const verdict = judge(spec);
  expect(verdict.converges, `${where}: ${spec.f} diverges, but ${claimed} is claimed`).toBe(true);
  if (verdict.converges) expect(close(verdict.value, claimed), `${where}: ${spec.f} comes to ${verdict.value}, not ${claimed}`).toBe(true);
}

function expectVerdict(spec: ImproperSpec, claimed: Verdict, where: string) {
  const verdict = judge(spec);
  expect(verdict.converges, `${where}: ${spec.f} convergence`).toBe(claimed.converges);
  if (verdict.converges && claimed.converges) {
    expect(close(verdict.value, claimed.value), `${where}: ${spec.f} comes to ${verdict.value}, not ${claimed.value}`).toBe(true);
  }
}

const typed = (slide: Slide): number => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression slide, got ${slide.kind}`);
  return Number(slide.answer);
};

describe('improper integrals, checked numerically', () => {
  it('can tell a convergent integral from a divergent one', () => {
    // The instrument first, so a verdict below means something.
    expectValue({ f: '1 / x^2', lower: 1, upper: Infinity }, 1, 'known');
    expectValue({ f: '1 / sqrt(x)', lower: 0, upper: 4 }, 4, 'known');
    expectValue({ f: 'exp(-abs(x))', lower: -Infinity, upper: Infinity, splits: [0] }, 2, 'known');
    expectValue({ f: '1 / cbrt(x)^2', lower: -1, upper: 8, splits: [0] }, 9, 'known');
    expectValue({ f: '3 / sqrt(x - 2)', lower: 2, upper: 6 }, 12, 'known');
    expect(judge({ f: '1 / x^3', lower: -1, upper: 1, splits: [0] }).converges).toBe(false);
    expect(judge({ f: '1 / (x + 3)', lower: -3, upper: 0 }).converges).toBe(false);
    expect(judge({ f: '1 / x', lower: 1, upper: Infinity }).converges).toBe(false);
    expect(judge({ f: '1 / x', lower: 0, upper: 1 }).converges).toBe(false);
    expect(judge({ f: '1 / x^2', lower: -1, upper: 1, splits: [0] }).converges).toBe(false);
    expect(judge({ f: 'exp(x)', lower: 0, upper: Infinity }).converges).toBe(false);
  });

  it('types the value of k/x^n from a to infinity', () => {
    for (const { params, slide, seed } of draws(g.powerTail as Generator<PowerTailParams>)) {
      expectValue(powerTailSpec(params), typed(slide), `seed ${seed}`);
    }
  });

  it('ends the worked steps on the same value', () => {
    for (const { params, slide, seed } of draws(g.workSteps as Generator<PowerTailParams>)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      expectValue(powerTailSpec(params), Number(slide.reductions[slide.reductions.length - 1].value), `seed ${seed}`);
    }
  });

  it('types the value of an exponential tail', () => {
    for (const { params, slide, seed } of draws(g.expTail as Generator<ExpTailParams>)) {
      expectValue(expTailSpec(params), typed(slide), `seed ${seed}`);
    }
  });

  it('puts the slider where the area levels off', () => {
    for (const { params, slide, seed } of draws(g.tailSlider as Generator<TailSliderParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      expectValue(tailSliderSpec(params), slide.answer, `seed ${seed}`);
    }
  });

  it('types the value of a fractional power from a to infinity', () => {
    for (const { params, slide, seed } of draws(g.rootTail as Generator<RootTailParams>)) {
      expectValue(rootTailSpec(params), typed(slide), `seed ${seed}`);
    }
  });

  it('types the value of a root unbounded at the lower limit', () => {
    for (const { params, slide, seed } of draws(g.rootPole as Generator<RootPoleParams>)) {
      expectValue(rootPoleSpec(params), typed(slide), `seed ${seed}`);
    }
  });

  it('ends the pole tree on the value of the integral', () => {
    for (const { params, slide, seed } of draws(g.poleTree as Generator<PoleTreeParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      expectValue(poleTreeSpec(params), Number(slide.answer[slide.answer.length - 1]), `seed ${seed}`);
    }
  });

  it('types the value of a two-sided exponential', () => {
    for (const { params, slide, seed } of draws(g.twoSided as Generator<TwoSidedParams>)) {
      expectValue(twoSidedSpec(params), typed(slide), `seed ${seed}`);
    }
  });

  it('fills the halves tree with each half and their sum', () => {
    for (const { params, slide, seed } of draws(g.halvesTree as Generator<HalvesParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const spec = halvesSpec(params);
      const [, , left, right, total] = slide.answer.map(Number);
      expectValue({ ...spec, upper: 0, splits: [] }, left, `seed ${seed} left half`);
      expectValue({ ...spec, lower: 0, splits: [] }, right, `seed ${seed} right half`);
      expectValue(spec, total, `seed ${seed}`);
    }
  });

  it('marks the right verdict on a p-integral or an exponential', () => {
    for (const { params, slide, seed } of draws(g.verdict as Generator<VerdictParams>)) {
      expectVerdict(verdictSpec(params), readVerdict(chosen(slide)), `seed ${seed}`);
    }
  });

  it('marks the right verdict on a pole inside the interval', () => {
    for (const { params, slide, seed } of draws(g.trap as Generator<TrapParams>)) {
      expectVerdict(trapSpec(params), readVerdict(chosen(slide)), `seed ${seed}`);
    }
  });

  it('routes the p-rule flow to the right verdict', () => {
    for (const { params, slide, seed } of draws(g.pFlow as Generator<PFlowParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const last = slide.answer[slide.answer.length - 1];
      expect(judge(pFlowSpec(params)).converges, `seed ${seed}`).toBe(last === 'Yes');
    }
  });

  it('calls an integral improper exactly when it is', () => {
    // Proper means the integrand stays bounded between finite limits; the
    // others have an infinite limit or a pole in the closed interval.
    for (const { params, slide, seed } of draws(g.whichFlow as Generator<WhichParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const { f, lower, upper, pole } = whichSpec(params);
      const fn = compile(f);
      const infinite = !Number.isFinite(lower) || !Number.isFinite(upper);
      const blows = !infinite && pole >= lower && pole <= upper;
      if (!infinite && !blows) {
        const samples = Array.from({ length: 201 }, (_, i) => fn(lower + ((upper - lower) * i) / 200));
        expect(samples.every(Number.isFinite), `seed ${seed}: ${f} is not bounded on [${lower}, ${upper}]`).toBe(true);
      } else if (blows) {
        expect(Math.abs(fn(pole + 1e-12)), `seed ${seed}: ${f} does not blow up at ${pole}`).toBeGreaterThan(1e3);
      }
      const route = slide.answer.join(' ');
      expect(route, `seed ${seed}`).toBe(infinite ? 'Yes' : blows ? 'No Yes' : 'No No');
    }
  });
});
