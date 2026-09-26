/**
 * An independent check on the numbers behind Differential Equations, Numerical
 * Solutions.
 *
 * The generators step each method with their own helpers. Here every answer is
 * worked again by a different route: the equation is read back off the TeX the
 * learner sees (mathjs parses `-0.2(x - 20)` and `2x - y + 3` as written), each
 * method is run from the formula as the textbook states it, the model's rows
 * come from the closed form `L + (x_0 - L)(1 - hk)^n`, and the exact solutions
 * of the accuracy lesson are differentiated by mathjs and put back into their
 * equation. At every seed and both difficulties.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import { registry } from '../registry';
import {
  closerFTex,
  dzTex,
  exactP,
  linTex,
  pTex,
  rateTex,
  secondTex,
  type CloserParams,
  type FlowParams,
  type HalveParams,
  type MidParams,
  type ModelParams,
  type ModelStepParams,
  type OrderParams,
  type RatioParams,
  type RecurParams,
  type SecondParams,
  type Start,
} from './deNumerical';

const SEEDS = 60;

/** Draws of one generator at both difficulties, with the slide each renders. */
function draws<P>(id: string): { p: P; slide: Slide; d: number }[] {
  const g = registry[id] as unknown as Generator<P>;
  expect(g, id).toBeDefined();
  const out: { p: P; slide: Slide; d: number }[] = [];
  for (const d of [1, 2]) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const p = g.sample(makeRng(seed), d);
      out.push({ p, slide: g.render(p), d });
    }
  }
  return out;
}

/** A TeX right side as mathjs reads it. */
const fromTex = (tex: string) => math.compile(tex.replace(/\^\{(\d+)\}/g, '^$1'));
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const num = (token: string) => Number(token.replace(/\$/g, ''));

function answerOf(slide: Slide): string[] {
  if (slide.kind === 'expression') return [slide.answer];
  if (slide.kind === 'choice') return [slide.options.find((o) => o.id === slide.correctId)!.label];
  if ('answer' in slide && Array.isArray(slide.answer)) return slide.answer as string[];
  throw new Error(`no answer on ${slide.kind}`);
}

describe('Euler on a model', () => {
  const rate = (p: Pick<ModelParams, 'form' | 'k' | 'L'>) => {
    const compiled = fromTex(rateTex(p));
    return (x: number) => compiled.evaluate({ x }) as number;
  };

  it('rows follow the closed form and settle on the level where the rate is zero', () => {
    for (const { p, slide } of draws<ModelParams>('de-num-model-iterate')) {
      const f = rate(p);
      expect(close(f(p.L), 0)).toBe(true);
      const m = 1 - p.h * p.k;
      expect(m > 0 && m < 1).toBe(true);
      const rows = answerOf(slide);
      for (let n = 1; n <= 4; n += 1) {
        const value = p.L + (p.x0 - p.L) * m ** n;
        expect(rows[n - 1]).toBe(value.toFixed(2));
        // Exact at two places: nothing was rounded.
        expect(close(Number(rows[n - 1]), value)).toBe(true);
      }
      expect(rows[4]).toBe(p.L.toFixed(2));
    }
  });

  it('a typed or chosen estimate is the Euler value at the time asked', () => {
    for (const id of ['de-num-model-value', 'de-num-model-value+choice']) {
      for (const { p, slide } of draws<ModelParams>(id)) {
        const f = rate(p);
        let x = p.x0;
        for (let i = 0; i < p.n; i += 1) x += p.h * f(x);
        expect(close(num(answerOf(slide)[0]), x), `${id} ${JSON.stringify(p)}`).toBe(true);
      }
    }
  });

  it('one step as a tree: the bracket, the rate, the rise and x_1', () => {
    for (const { p, slide } of draws<ModelStepParams>('de-num-model-tree')) {
      const f = rate(p);
      const r = f(p.x0);
      const [gap, rateV, rise, x1] = answerOf(slide).map(Number);
      expect(close(rateV, r)).toBe(true);
      expect(close(rise, p.h * r)).toBe(true);
      expect(close(x1, p.x0 + p.h * r)).toBe(true);
      const bracket = p.form === 'cool' ? p.x0 - p.L : p.form === 'warm' ? p.L - p.x0 : p.k * p.x0;
      expect(close(gap, bracket)).toBe(true);
    }
  });

  it('the collected step agrees with the Euler step at every x', () => {
    for (const { p, slide } of draws<RecurParams>('de-num-model-recur')) {
      const f = rate(p);
      const [m, c] = answerOf(slide).map(Number);
      for (const x of [-3, 0, 7.5, 40]) expect(close(m * x + c, x + p.h * f(x))).toBe(true);
    }
  });

  it('the fate read off the multiplier is what forty steps actually do', () => {
    for (const { p, slide } of draws<FlowParams>('de-num-model-flow')) {
      const f = rate(p);
      const gaps = [p.x0 - p.L];
      let x = p.x0;
      for (let i = 0; i < 12; i += 1) {
        x += p.h * f(x);
        gaps.push(x - p.L);
      }
      const flips = gaps[1] * gaps[0] < 0;
      const grows = Math.abs(gaps[12]) > Math.abs(gaps[0]);
      const [mult, fate] = answerOf(slide);
      expect(close(num(mult), gaps[1] / gaps[0])).toBe(true);
      if (!flips) expect(fate).toContain('steadily');
      else if (!grows) expect(fate).toContain('swinging in');
      else expect(fate).toContain('further');
    }
  });
});

/** One improved Euler step, straight from the formula as it is written. */
function improved(f: (x: number, y: number) => number, x: number, y: number, h: number): number {
  return y + (h / 2) * (f(x, y) + f(x + h, y + h * f(x, y)));
}

const linOf = (s: Start) => {
  const compiled = fromTex(linTex(s.f));
  return (x: number, y: number) => compiled.evaluate({ x, y }) as number;
};

describe('the improved Euler method', () => {
  it('every form of the step lands on the formula', () => {
    for (const id of ['de-num-heun-tree', 'de-num-heun-tiles', 'de-num-heun-value', 'de-num-heun-value+choice', 'de-num-heun-flow']) {
      for (const { p, slide } of draws<Start>(id)) {
        const f = linOf(p);
        const y1 = improved(f, p.x0, p.y0, p.h);
        const k1 = f(p.x0, p.y0);
        const pred = p.y0 + p.h * k1;
        const k2 = f(p.x0 + p.h, pred);
        const answer = answerOf(slide).map(num);
        if (id === 'de-num-heun-tree') expect(answer.every((v, i) => close(v, [k1, pred, k2, y1][i]))).toBe(true);
        else if (id === 'de-num-heun-tiles') expect(close(answer[0] + answer[1] * (answer[2] + answer[3]), y1)).toBe(true);
        else if (id === 'de-num-heun-flow') expect(answer.every((v, i) => close(v, [pred, k2, y1][i]))).toBe(true);
        else expect(close(answer[0], y1), `${id}`).toBe(true);
        // The prediction matters: an Euler step alone lands somewhere else.
        expect(close(pred, y1)).toBe(false);
      }
    }
  });
});

describe('the midpoint formula', () => {
  /** y_1 by Euler, then y_{r+1} = y_{r-1} + 2h f(x_r, y_r). */
  function midpoint(s: MidParams): number[] {
    const f = linOf(s);
    const ys = [s.y0, s.y0 + s.h * f(s.x0, s.y0)];
    for (let r = 1; r < s.n; r += 1) ys.push(ys[r - 1] + 2 * s.h * f(s.x0 + r * s.h, ys[r]));
    return ys;
  }

  it('the tree, table and value follow the formula', () => {
    for (const id of ['de-num-mid-tree', 'de-num-mid-table', 'de-num-mid-value', 'de-num-mid-value+choice']) {
      for (const { p, slide } of draws<MidParams>(id)) {
        const f = linOf(p);
        const ys = midpoint(p);
        const answer = answerOf(slide).map(num);
        if (id === 'de-num-mid-value' || id === 'de-num-mid-value+choice') {
          expect(close(answer[0], ys[p.n])).toBe(true);
          continue;
        }
        // Tree and table both read gradient, then the next y, row by row.
        const expected: number[] = [];
        for (let i = 0; i <= p.n; i += 1) {
          if (i > 0) expected.push(ys[i]);
          if (i < p.n) expected.push(f(p.x0 + i * p.h, ys[i]));
        }
        expect(answer.length).toBe(expected.length);
        answer.forEach((v, i) => expect(close(v, expected[i]), `${id} ${i}`).toBe(true));
      }
    }
  });

  it('the tiles build the next step from the row before last', () => {
    for (const { p, slide } of draws<MidParams>('de-num-mid-tiles')) {
      const f = linOf(p);
      const ys = midpoint(p);
      const [back, twoH, x, y] = answerOf(slide).map(Number);
      expect(close(back + twoH * f(x, y), ys[p.n])).toBe(true);
      expect(close(twoH, 2 * p.h)).toBe(true);
    }
  });
});

describe('second-order equations step by step', () => {
  it('the right dz/dx satisfies the equation and no distractor does', () => {
    for (const { p, slide } of draws<SecondParams>('de-num-second-split')) {
      if (slide.kind !== 'choice') throw new Error('split is a choice');
      const lhs = (F: number, x: number, y: number, z: number) => p.lead * F + p.p * z + p.q * y - (p.r * x + p.s);
      for (const option of slide.options) {
        const rhs = fromTex(option.label.replace('\\frac{dz}{dx} = ', ''));
        const agrees = [
          [0.3, 1.7, -2.1],
          [2, -1, 0.5],
        ].every(([x, y, z]) => close(lhs(rhs.evaluate({ x, y, z }) as number, x, y, z), 0));
        expect(agrees, option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('two Euler steps on y and z, each from the same row', () => {
    for (const id of ['de-num-second-tree', 'de-num-second-table', 'de-num-second-value', 'de-num-second-value+choice']) {
      for (const { p, slide } of draws<SecondParams>(id)) {
        // Read the second-order equation off the TeX and solve it for y''.
        const eq = secondTex(p).replace('\\frac{d^2y}{dx^2}', ' Y2 ').replace('\\frac{dy}{dx}', ' z ');
        const [left, right] = eq.split(' = ');
        const L = math.compile(left);
        const R = math.compile(right);
        const f = (x: number, y: number, z: number) => {
          const at0 = (L.evaluate({ Y2: 0, x, y, z }) as number) - (R.evaluate({ x }) as number);
          const at1 = (L.evaluate({ Y2: 1, x, y, z }) as number) - (R.evaluate({ x }) as number);
          return -at0 / (at1 - at0);
        };
        // The split display agrees with the equation.
        const dz = fromTex(dzTex(p));
        expect(close(dz.evaluate({ x: 0.7, y: -1.3, z: 2.2 }) as number, f(0.7, -1.3, 2.2))).toBe(true);
        const ys = [p.y0];
        const zs = [p.z0];
        const fs: number[] = [];
        for (let i = 0; i < 2; i += 1) {
          fs.push(f(p.x0 + i * p.h, ys[i], zs[i]));
          ys.push(ys[i] + p.h * zs[i]);
          zs.push(zs[i] + p.h * fs[i]);
        }
        const answer = answerOf(slide).map(num);
        const expected =
          id === 'de-num-second-tree' ? [fs[0], ys[1], zs[1], ys[2]] : id === 'de-num-second-table' ? [ys[1], zs[1], ys[2], zs[2]] : [ys[2]];
        answer.forEach((v, i) => expect(close(v, expected[i]), `${id} ${i}`).toBe(true));
      }
    }
  });
});

describe('step size and accuracy', () => {
  it('halving h halves an Euler error and quarters an improved one', () => {
    for (const id of ['de-num-halve-value', 'de-num-halve-value+choice']) {
      for (const { p, slide } of draws<HalveParams>(id)) {
        const factor = p.method === 'euler' ? 2 : 4;
        const expected = p.mode === 'error' ? p.E / factor : p.Y + p.E / factor;
        expect(close(num(answerOf(slide)[0]), expected)).toBe(true);
      }
    }
    for (const { p, slide } of draws<RatioParams>('de-num-ratio-slider')) {
      if (slide.kind !== 'slider') throw new Error('a slider');
      expect(close(slide.answer, p.E / (p.method === 'euler' ? 2 : 4))).toBe(true);
    }
  });

  it('the order read off two errors is the power that divides them', () => {
    for (const { p, slide } of draws<OrderParams>('de-num-order-choice')) {
      const [first, second] = (slide.kind === 'choice' ? slide.prompt : [])
        .flatMap((b) => (b.kind === 'prose' ? [...b.text.matchAll(/size \$([\d.]+)\$|and \$([\d.]+)\$/g)] : []))
        .map((m) => Number(m[1] ?? m[2]));
      const order = Math.round(Math.log(first / second) / Math.log(p.ratio));
      expect(close(first / second, p.ratio ** order)).toBe(true);
      expect(answerOf(slide)[0]).toBe(order === 1 ? '\\text{error} \\propto h' : '\\text{error} \\propto h^2');
    }
  });

  it('the exact solution solves its equation, and the closer estimate is picked', () => {
    for (const { p, slide } of draws<CloserParams>('de-num-closer-flow')) {
      const exact = pTex(p).replace(/\^\{(\d+)\}/g, '^$1');
      const slope = math.derivative(exact, 'x');
      const f = fromTex(closerFTex(p));
      const P = math.compile(exact);
      for (const x of [-1.3, 0, 0.4, 2]) {
        const y = P.evaluate({ x }) as number;
        expect(close(slope.evaluate({ x }) as number, f.evaluate({ x, y }) as number)).toBe(true);
      }
      expect(close(P.evaluate({ x: 0 }) as number, p.ga)).toBe(true);
      const g = (x: number, y: number) => f.evaluate({ x, y }) as number;
      const euler = p.ga + p.h * g(0, p.ga);
      const other =
        p.mode === 'methods'
          ? improved(g, 0, p.ga, p.h)
          : (() => {
              const y1 = p.ga + (p.h / 2) * g(0, p.ga);
              return y1 + (p.h / 2) * g(p.h / 2, y1);
            })();
      const Y = exactP(p, p.h);
      const [exactLabel, nearer, error] = answerOf(slide);
      expect(close(num(exactLabel), Y)).toBe(true);
      const eulerCloser = Math.abs(euler - Y) < Math.abs(other - Y);
      expect(nearer === "Euler's method" || nearer === `$h = ${p.h}$`).toBe(eulerCloser);
      expect(close(num(error), (eulerCloser ? euler : other) - Y)).toBe(true);
    }
  });
});
