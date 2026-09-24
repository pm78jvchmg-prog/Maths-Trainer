/**
 * The Data, Averages and Spread generators, checked against arithmetic of their own.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * median taken from the jumbled list, a frequency-table mean divided by the
 * number of rows, or a variance with the square in the wrong place. So each
 * check here reaches the answer by a route the generator does not take:
 * frequency and grouped tables are expanded back into the raw list they
 * stand for, the median is found by counting from both ends, quartiles as
 * the medians of the two halves, the variance from the definition
 * `\sum (x - \bar{x})^2 / n` rather than the shortcut the course teaches,
 * and correlation from the least-squares line rather than from Pearson's
 * formula.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import type { Answer } from '../../engine/session';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';
import { defaultSliderValue } from '../../ui/sliderValue';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

function draws<P>(id: string) {
  const generator = registry[id] as unknown as Generator<P>;
  expect(generator, `no generator ${id}`).toBeDefined();
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed, difficulty };
    }),
  );
}

/** The verdict the reducer gives an answer to this one slide. */
function verdict(slide: Slide, answer: Answer) {
  const lesson = { id: 'da-test', title: 'Test', slides: [], skillCheck: [{ type: 'literal' as const, slide }] };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

/* ---------- plain arithmetic, written out again ---------- */

function add(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

/** Sorted by insertion, not by `Array.sort`. */
function inOrder(xs: number[]): number[] {
  const out: number[] = [];
  for (const x of xs) {
    let i = 0;
    while (i < out.length && out[i] <= x) i += 1;
    out.splice(i, 0, x);
  }
  return out;
}

/** The median by striking values off both ends until one or two are left. */
function middle(xs: number[]): number {
  const s = inOrder(xs);
  while (s.length > 2) {
    s.shift();
    s.pop();
  }
  return s.length === 1 ? s[0] : (s[0] + s[1]) / 2;
}

/** The mode by counting, and whether it is the only value with that count. */
function modal(xs: number[]): { value: number; unique: boolean } {
  let best = NaN;
  let bestCount = 0;
  let tied = false;
  for (const x of new Set(xs)) {
    const c = xs.filter((y) => y === x).length;
    if (c > bestCount) {
      best = x;
      bestCount = c;
      tied = false;
    } else if (c === bestCount) tied = true;
  }
  return { value: best, unique: !tied };
}

/** Quartiles as the medians of the values below and above the median. */
function quartilesByHalves(xs: number[]): { q1: number; q2: number; q3: number } {
  const s = inOrder(xs);
  const mid = (s.length - 1) / 2;
  return { q1: middle(s.slice(0, mid)), q2: s[mid], q3: middle(s.slice(mid + 1)) };
}

/** The variance from its definition: the mean squared distance from the mean. */
function spread(xs: number[]): number {
  const m = add(xs) / xs.length;
  return add(xs.map((x) => (x - m) * (x - m))) / xs.length;
}

/** A frequency table expanded into the list it stands for. */
function expand(xs: number[], fs: number[]): number[] {
  return xs.flatMap((x, i) => Array.from({ length: fs[i] }, () => x));
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const num = (token: string) => Number(token);
const correctLabel = (slide: Slide) => {
  if (slide.kind !== 'choice') throw new Error('not a choice slide');
  return slide.options.find((o) => o.id === slide.correctId)!.label;
};
const onePlace = (v: number) => close(Math.round(v * 10) / 10, v);

/* ---------- level 1: averages ---------- */

describe('dat-mean', () => {
  it('shares out the total, a whole number at difficulty 1 and a decimal at 2', () => {
    for (const { params, slide, difficulty, seed } of draws<{ values: number[] }>('dat-mean')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const m = add(params.values) / params.values.length;
      expect(num(slide.answer), `seed ${seed}`).toBeCloseTo(m, 9);
      expect(Number.isInteger(m), `seed ${seed}`).toBe(difficulty === 1);
      expect(onePlace(m)).toBe(true);
    }
  });
});

describe('dat-median-mode', () => {
  it('finds the middle from both ends, or the one most common value', () => {
    for (const { params, slide, seed } of draws<{ values: number[]; ask: 'median' | 'mode' }>('dat-median-mode')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      if (params.ask === 'median') {
        expect(num(slide.answer), `seed ${seed}`).toBe(middle(params.values));
        // The unsorted middle is never already the answer.
        expect(params.values[Math.floor(params.values.length / 2)]).not.toBe(middle(params.values));
      } else {
        const { value, unique } = modal(params.values);
        expect(unique, `seed ${seed}: tied mode in ${params.values}`).toBe(true);
        expect(num(slide.answer), `seed ${seed}`).toBe(value);
      }
    }
  });
});

describe('dat-sum-tree', () => {
  it('ends on the mean, from pairs that add to the total', () => {
    for (const { params, slide, seed } of draws<{ values: number[] }>('dat-sum-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { values } = params;
      const answer = slide.answer.map(num);
      expect(answer[answer.length - 1], `seed ${seed}`).toBeCloseTo(add(values) / values.length, 9);
      expect(answer[answer.length - 2]).toBe(add(values));
      expect(add(answer.slice(0, -2))).toBe(add(values));
      expect(verdict(slide, slide.answer)).toBe('correct');
    }
  });
});

describe('dat-which-average', () => {
  it('sends categories to the mode, a far value to the median, and the rest to the mean', () => {
    type P = { kind: string; values: number[]; purpose: boolean };
    for (const { params, slide, seed } of draws<P>('dat-which-average')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const path = params.purpose && params.kind !== 'common' ? slide.answer.slice(1) : slide.answer;
      if (params.kind === 'common') expect(slide.answer).toEqual(['Yes']);
      else if (params.kind === 'category') expect(path).toEqual(['Categories']);
      else {
        // Far means an end at least twice as far from its neighbour as the rest are wide.
        const s = inOrder(params.values);
        const n = s.length;
        const far = s[n - 1] - s[n - 2] > 2 * (s[n - 2] - s[0]) || s[1] - s[0] > 2 * (s[n - 1] - s[1]);
        expect(far, `seed ${seed}: ${s}`).toBe(params.kind === 'outlier');
        expect(path).toEqual(['Numbers', far ? 'Yes' : 'No']);
      }
    }
  });
});

describe('dat-missing and dat-total-tiles', () => {
  it('fills the gap so the list has the mean the prompt states', () => {
    for (const id of ['dat-missing', 'dat-total-tiles']) {
      for (const { params, slide, seed } of draws<{ known: number[]; x: number }>(id)) {
        const n = params.known.length + 1;
        const stated = Number(/mean of (?:these )?\d+ values is \$([\d.]+)\$/.exec((slide as { prompt: { kind: string; text?: string }[] }).prompt[0].text!)![1]);
        expect(close(add([...params.known, params.x]) / n, stated), `${id} seed ${seed}`).toBe(true);
        if (slide.kind === 'expression') expect(num(slide.answer)).toBe(params.x);
        if (slide.kind === 'tiles') {
          expect(num(slide.answer[2])).toBe(params.x);
          expect(close(n * num(slide.answer[0]) - num(slide.answer[1]), params.x)).toBe(true);
        }
      }
    }
  });
});

describe('dat-combined-tree', () => {
  it('weights each mean by its group, and is never the mean of the two means', () => {
    type P = { nA: number; mA: number; nB: number; mB: number };
    for (const { params, slide, seed } of draws<P>('dat-combined-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const list = [...Array(params.nA).fill(params.mA), ...Array(params.nB).fill(params.mB)];
      const m = add(list) / list.length;
      expect(num(slide.answer[4]), `seed ${seed}`).toBeCloseTo(m, 9);
      expect(close(m, (params.mA + params.mB) / 2)).toBe(false);
      expect(onePlace(m)).toBe(true);
    }
  });
});

describe('dat-add-value-steps', () => {
  it('ends on the mean of the changed list', () => {
    type P = { n: number; m: number; v: number; op: 'add' | 'remove' };
    for (const { params, slide, seed } of draws<P>('dat-add-value-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      // A list of n values with mean m that holds v when v is to be taken out.
      const list: number[] =
        params.op === 'add'
          ? [...Array(params.n).fill(params.m), params.v]
          : [...Array(params.n - 1).fill((params.n * params.m - params.v) / (params.n - 1))];
      const m = add(list) / list.length;
      expect(num(slide.reductions[slide.reductions.length - 1].value), `seed ${seed}`).toBeCloseTo(m, 9);
    }
  });
});

/* ---------- level 1: frequency tables and grouped data ---------- */

type Freq = { xs: number[]; fs: number[] };

describe('dat-fx-table', () => {
  it('fills each row with value times frequency, and the total of the expanded list', () => {
    for (const { params, slide, seed } of draws<Freq>('dat-fx-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      params.xs.forEach((x, i) => expect(num(slide.answer[i]), `seed ${seed}`).toBe(add(Array(params.fs[i]).fill(x))));
      expect(num(slide.answer[params.xs.length])).toBe(add(expand(params.xs, params.fs)));
      expect(verdict(slide, slide.answer)).toBe('correct');
    }
  });
});

describe('dat-freq-mean and dat-freq-formula-tiles', () => {
  it('is the mean of the expanded list', () => {
    for (const id of ['dat-freq-mean', 'dat-freq-formula-tiles']) {
      for (const { params, slide, seed } of draws<Freq>(id)) {
        const list = expand(params.xs, params.fs);
        const m = add(list) / list.length;
        const given = slide.kind === 'expression' ? slide.answer : slide.kind === 'tiles' ? slide.answer[2] : '';
        expect(num(given), `${id} seed ${seed}`).toBeCloseTo(m, 9);
        if (slide.kind === 'tiles') expect(num(slide.answer[1])).toBe(list.length);
      }
    }
  });
});

describe('dat-freq-choice', () => {
  it('marks the mode or the median of the expanded list', () => {
    for (const { params, slide, seed } of draws<Freq & { ask: 'mode' | 'median' }>('dat-freq-choice')) {
      const list = expand(params.xs, params.fs);
      const right = params.ask === 'mode' ? modal(list) : { value: middle(list), unique: true };
      expect(right.unique, `seed ${seed}`).toBe(true);
      expect(num(correctLabel(slide)), `seed ${seed}`).toBe(right.value);
    }
  });
});

type Grouped = { bounds: number[]; fs: number[] };
const mids = ({ bounds }: Grouped) => bounds.slice(1).map((hi, i) => bounds[i] + (hi - bounds[i]) / 2);

describe('dat-midpoint-table', () => {
  it('writes each class halfway between its ends', () => {
    for (const { params, slide } of draws<Grouped>('dat-midpoint-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      expect(slide.answer.map(num)).toEqual(mids(params));
    }
  });
});

describe('dat-grouped-mean and dat-grouped-steps', () => {
  it('is the mean of the list with every value moved to its midpoint', () => {
    for (const id of ['dat-grouped-mean', 'dat-grouped-steps']) {
      for (const { params, slide, seed } of draws<Grouped>(id)) {
        const list = expand(mids(params), params.fs);
        const m = add(list) / list.length;
        const given = slide.kind === 'expression' ? slide.answer : slide.kind === 'steps' ? slide.reductions[slide.reductions.length - 1].value : '';
        expect(num(given), `${id} seed ${seed}`).toBeCloseTo(m, 9);
      }
    }
  });
});

describe('dat-modal-class', () => {
  it('marks the class with the most values, or the one the middle value falls in', () => {
    for (const { params, slide, seed } of draws<Grouped & { ask: 'modal' | 'median' }>('dat-modal-class')) {
      // Every value stands at its class index; the answer is a class, so that is enough.
      const list = expand(params.fs.map((_, i) => i), params.fs);
      const i = params.ask === 'modal' ? modal(list).value : middle(list);
      expect(Number.isInteger(i), `seed ${seed}`).toBe(true);
      const label = correctLabel(slide);
      expect(label, `seed ${seed}`).toBe(`${params.bounds[i]} \\le x < ${params.bounds[i + 1]}`);
    }
  });
});

/* ---------- level 1: scatter diagrams ---------- */

type Point = [number, number];

/** The least-squares line through some points, and how much of y it explains. */
function fit(points: Point[]) {
  const n = points.length;
  const mx = add(points.map((p) => p[0])) / n;
  const my = add(points.map((p) => p[1])) / n;
  const b = add(points.map(([x, y]) => (x - mx) * (y - my))) / add(points.map(([x]) => (x - mx) ** 2));
  const a = my - b * mx;
  const residual = add(points.map(([x, y]) => (y - a - b * x) ** 2));
  const totalSq = add(points.map(([, y]) => (y - my) ** 2));
  return { a, b, r2: 1 - residual / totalSq };
}

describe('dat-correlation', () => {
  it('names the direction the fitted line takes, and how tightly the points follow it', () => {
    type P = { points: Point[]; sign: number; strength: string; graded: boolean };
    for (const { params, slide, seed } of draws<P>('dat-correlation')) {
      const { b, r2 } = fit(params.points);
      const label = correctLabel(slide);
      if (r2 < 0.07) {
        expect(label, `seed ${seed}`).toBe('No correlation');
        continue;
      }
      expect(label.toLowerCase(), `seed ${seed}`).toContain(b > 0 ? 'positive' : 'negative');
      if (params.graded) expect(label, `seed ${seed}`).toMatch(r2 >= 0.8 ? /^Strong/ : /^Weak/);
      else expect(r2, `seed ${seed}`).toBeGreaterThanOrEqual(0.8);
    }
  });
});

describe('dat-scatter-slider', () => {
  it('points at the one point the rest fit worst, or where the line reaches the height asked', () => {
    type P = { points: Point[]; mode: string; target: number; a: number; b: number };
    for (const { params, slide, seed } of draws<P>('dat-scatter-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      if (params.mode === 'line') {
        const y = Number(/y = (-?[\d.]+)\$/.exec((slide.prompt[0] as { text: string }).text)![1]);
        expect(close(params.a + params.b * slide.answer, y), `seed ${seed}`).toBe(true);
        continue;
      }
      // Leaving the odd one out makes the rest fit far better than leaving out any other.
      const without = (x: number) => fit(params.points.filter((p) => p[0] !== x)).r2;
      const best = params.points.map((p) => p[0]).reduce((u, v) => (without(v) > without(u) ? v : u));
      expect(best, `seed ${seed}`).toBe(slide.answer);
    }
  });
});

describe('dat-line-estimate', () => {
  it('puts the x into the line, inside the data', () => {
    for (const { params, slide } of draws<{ points: Point[]; a: number; b: number; x: number }>('dat-line-estimate')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      expect(num(slide.answer)).toBeCloseTo(params.a + params.b * params.x, 9);
      expect(params.x).toBeGreaterThan(params.points[0][0]);
      expect(params.x).toBeLessThan(params.points[params.points.length - 1][0]);
    }
  });
});

describe('dat-reliable-flow', () => {
  it('rejects extrapolation, and inside the data trusts only a close fit', () => {
    for (const { params, slide, seed } of draws<{ points: Point[]; x: number; strong: boolean }>('dat-reliable-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const xs = params.points.map((p) => p[0]);
      const inside = params.x > Math.min(...xs) && params.x < Math.max(...xs);
      if (!inside) expect(slide.answer).toEqual(['No']);
      else expect(slide.answer, `seed ${seed}`).toEqual(['Yes', fit(params.points).r2 >= 0.8 ? 'Yes' : 'No']);
    }
  });
});

/* ---------- level 2: range, quartiles, outliers ---------- */

describe('dat-range, dat-range-tiles', () => {
  it('is the largest take the smallest, found by sorting', () => {
    for (const id of ['dat-range', 'dat-range-tiles']) {
      for (const { params, slide } of draws<{ values: number[] }>(id)) {
        const s = inOrder(params.values);
        const r = s[s.length - 1] - s[0];
        if (slide.kind === 'expression') expect(num(slide.answer)).toBe(r);
        if (slide.kind === 'tiles') expect(slide.answer.map(num)).toEqual([s[s.length - 1], s[0], r]);
      }
    }
  });
});

describe('dat-remove-choice', () => {
  it('marks the range of what is left', () => {
    for (const { params, slide } of draws<{ values: number[]; at: number }>('dat-remove-choice')) {
      const s = inOrder(params.values.filter((_, i) => i !== params.at));
      expect(num(correctLabel(slide))).toBe(s[s.length - 1] - s[0]);
    }
  });
});

describe('dat-range-flow', () => {
  it('says the range changes exactly when taking the value out changes it', () => {
    for (const { params, slide, seed } of draws<{ values: number[]; v: number }>('dat-range-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const rest = [...params.values];
      rest.splice(rest.indexOf(params.v), 1);
      const before = inOrder(params.values);
      const after = inOrder(rest);
      const changes = before[before.length - 1] - before[0] !== after[after.length - 1] - after[0];
      const end = params.v === before[0] || params.v === before[before.length - 1];
      expect(slide.answer, `seed ${seed}`).toEqual(end ? ['Yes', changes ? 'No' : 'Yes'] : ['No']);
      if (!end) expect(changes).toBe(false);
    }
  });
});

describe('quartiles', () => {
  it('are the medians of the two halves, in the table, the tree, the typed IQR and the choice', () => {
    for (const { params, slide, seed } of draws<{ values: number[] }>('dat-quartile-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const n = params.values.length;
      expect((n - 3) % 4).toBe(0);
      const { q1, q2, q3 } = quartilesByHalves(params.values);
      const p = (n + 1) / 4;
      expect(slide.answer.map(num), `seed ${seed}`).toEqual([p, q1, 2 * p, q2, 3 * p, q3]);
    }
    for (const { params, slide } of draws<{ values: number[] }>('dat-quartiles-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { q1, q3 } = quartilesByHalves(params.values);
      expect(slide.answer.map(num)).toEqual([q1, q3, q3 - q1]);
    }
    for (const { params, slide } of draws<{ values: number[] }>('dat-iqr')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { q1, q3 } = quartilesByHalves(params.values);
      expect(num(slide.answer)).toBe(q3 - q1);
    }
    for (const { params, slide } of draws<{ n: number; which: 1 | 2 | 3; values: number[] }>('dat-quartile-choice')) {
      const label = num(correctLabel(slide));
      if (params.values.length === 0) {
        // A list of the positions themselves has the positions as its quartiles.
        const positions = Array.from({ length: params.n }, (_, i) => i + 1);
        const q = quartilesByHalves(positions);
        expect(label).toBe([q.q1, q.q2, q.q3][params.which - 1]);
      } else {
        const q = quartilesByHalves(params.values);
        expect(label).toBe(params.which === 1 ? q.q1 : q.q3);
      }
    }
  });
});

describe('fences and outliers', () => {
  it('puts each fence 1.5 IQR beyond its quartile', () => {
    for (const id of ['dat-fence-steps', 'dat-fence-tiles']) {
      for (const { params, slide, seed } of draws<{ q1: number; q3: number; side: 'upper' | 'lower' }>(id)) {
        const step = (params.q3 - params.q1) * 3 / 2;
        const fence = params.side === 'upper' ? params.q3 + step : params.q1 - step;
        const given = slide.kind === 'steps' ? slide.reductions[2].value : slide.kind === 'tiles' ? slide.answer[2] : '';
        expect(num(given), `${id} seed ${seed}`).toBeCloseTo(fence, 9);
      }
    }
  });

  it('counts the values beyond the fences, none of them close enough to one to be in doubt', () => {
    for (const { params, slide, seed } of draws<{ values: number[] }>('dat-outlier-count')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { q1, q3 } = quartilesByHalves(params.values);
      const lo = q1 - 1.5 * (q3 - q1);
      const hi = q3 + 1.5 * (q3 - q1);
      expect(num(slide.answer), `seed ${seed}`).toBe(params.values.filter((x) => x < lo || x > hi).length);
      for (const x of params.values) expect(Math.min(Math.abs(x - lo), Math.abs(x - hi))).toBeGreaterThanOrEqual(1);
    }
  });

  it('walks to the right verdict for one value', () => {
    for (const { params, slide, seed } of draws<{ q1: number; q3: number; v: number }>('dat-outlier-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const lo = params.q1 - 1.5 * (params.q3 - params.q1);
      const hi = params.q3 + 1.5 * (params.q3 - params.q1);
      const want = params.v > hi ? ['Yes'] : params.v < lo ? ['No', 'Yes'] : ['No', 'No'];
      expect(slide.answer, `seed ${seed}`).toEqual(want);
    }
  });
});

/* ---------- level 2: variance and standard deviation ---------- */

/** n, the sum and the sum of squares, read back out of a prompt. */
function sums(slide: Slide): { n: number; sx: number; sx2: number } | undefined {
  if (slide.kind === 'teach') return undefined;
  const text = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
  const hit = /For (\d+) values, \$\\sum x = (-?\d+)\$ and \$\\sum x\^2 = (\d+)\$/.exec(text);
  return hit ? { n: Number(hit[1]), sx: Number(hit[2]), sx2: Number(hit[3]) } : undefined;
}

describe('variance', () => {
  it('matches the mean squared distance from the mean, and the sums the prompt states', () => {
    for (const id of ['dat-var-tree', 'dat-var-formula-steps', 'dat-variance', 'dat-sd', 'dat-sd-tiles']) {
      for (const { params, slide, seed } of draws<{ values: number[] }>(id)) {
        const v = spread(params.values);
        expect(Number.isInteger(v) && v > 0, `${id} seed ${seed}: variance ${v}`).toBe(true);
        const stated = sums(slide);
        if (stated) {
          expect(stated.n).toBe(params.values.length);
          expect(stated.sx).toBe(add(params.values));
          expect(stated.sx2).toBe(add(params.values.map((x) => x * x)));
        }
        const root = Math.sqrt(v);
        if (slide.kind === 'tree') expect(num(slide.answer[3])).toBe(v);
        if (slide.kind === 'steps') expect(num(slide.reductions[3].value)).toBe(v);
        if (slide.kind === 'expression') expect(num(slide.answer)).toBe(id === 'dat-sd' ? root : v);
        if (slide.kind === 'tiles') expect(slide.answer.slice(2).map(num)).toEqual([v, root]);
        if (id === 'dat-sd' || id === 'dat-sd-tiles') expect(Number.isInteger(root), `${id} seed ${seed}`).toBe(true);
      }
    }
  });

  it('squares each value in the table, and totals the squares rather than squaring the total', () => {
    for (const { params, slide } of draws<{ values: number[] }>('dat-x2-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const squares = params.values.map((x) => Math.abs(x) * Math.abs(x));
      expect(slide.answer.map(num)).toEqual([...squares, add(squares)]);
      expect(verdict(slide, slide.answer)).toBe('correct');
    }
  });

  it('accepts the standard deviation typed as a root', () => {
    for (const { params, slide, seed } of draws<{ values: number[] }>('dat-sd').slice(0, 40)) {
      expect(verdict(slide, `sqrt(${spread(params.values)})`), `seed ${seed}`).toBe('correct');
    }
  });
});

describe('comparing two groups', () => {
  type P = { context: number; mA: number; sA: number; mB: number; sB: number; squared: boolean };

  it('marks the statement naming the higher mean and the smaller standard deviation', () => {
    for (const { params, slide, seed } of draws<P>('dat-compare-choice')) {
      const label = correctLabel(slide);
      const [first, second] = label.replace(' has the higher mean, and ', '|').replace(' is more consistent.', '').split('|');
      const table = (slide as { prompt: { kind: string; tex?: string }[] }).prompt[1].tex!;
      const [a, b] = [...table.matchAll(/\\text\{([^}]+)\}/g)]
        .map((hit) => hit[1])
        .filter((word) => !['Mean', 'SD', 'Spread'].includes(word));
      expect(first, `seed ${seed}`).toBe(params.mA > params.mB ? a : b);
      expect(second, `seed ${seed}`).toBe(params.sA < params.sB ? a : b);
    }
  });

  it('at difficulty 2, gives one spread as a variance that compares the wrong way unrooted', () => {
    for (const { params } of draws<P>('dat-compare-flow').filter((d) => d.difficulty === 2)) {
      expect(params.squared).toBe(true);
      expect(Math.sign(params.sB * params.sB - params.sA)).not.toBe(Math.sign(params.sB - params.sA));
    }
  });
});

/* ---------- level 4: cumulative frequency ---------- */

type Pt = [number, number];

/** The corners of the curve: the lowest boundary at nought, then each upper boundary at everything counted so far. */
function corners({ bounds, fs }: Grouped): Pt[] {
  const pts: Pt[] = [[bounds[0], 0]];
  fs.forEach((f, i) => pts.push([bounds[i + 1], pts[i][1] + f]));
  return pts;
}

/** Across at height `h` to the first straight join that reaches it, then down. */
function xAtHeight(pts: Pt[], h: number): number {
  for (let j = 0; j + 1 < pts.length; j += 1) {
    const [x0, y0] = pts[j];
    const [x1, y1] = pts[j + 1];
    if (h > y0 && h <= y1) return x0 + ((x1 - x0) * (h - y0)) / (y1 - y0);
  }
  throw new Error(`no join reaches ${h}`);
}

/** Up at `x` to the straight join above it, then across. */
function heightAtX(pts: Pt[], x: number): number {
  for (let j = 0; j + 1 < pts.length; j += 1) {
    const [x0, y0] = pts[j];
    const [x1, y1] = pts[j + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  throw new Error(`${x} is off the curve`);
}

/** The class each value of a grouped table falls in, one entry per value. */
const classOfEach = (fs: number[]) => expand(fs.map((_, i) => i), fs);

/** How many values sit in classes wholly below `b`, by walking the expanded list. */
function countUnder({ bounds, fs }: Grouped, b: number): number {
  return classOfEach(fs).filter((i) => bounds[i + 1] <= b).length;
}

/**
 * Reads a curve back off its own picture: the scale's numbers give the
 * mapping from pixels to data, and every ringed point is turned back into
 * data by it. So a curve that plots midpoints, or the wrong totals, or a
 * scale that does not match where plotSvg drew, all show up here.
 */
function readFigure(svg: string) {
  const texts = [...svg.matchAll(/<text data-axis="(\w)" x="([\d.-]+)" y="([\d.-]+)"[^>]*text-anchor="(\w+)">([\d.]+)<\/text>/g)];
  // The corner label stands aside from its tick, so only centred labels set the scale.
  const across = texts.filter((t) => t[1] === 'x' && t[4] === 'middle').map((t) => ({ at: Number(t[2]), value: Number(t[5]) }));
  const up = texts.filter((t) => t[1] === 'y').map((t) => ({ at: Number(t[3]) - 3.5, value: Number(t[5]) }));
  const map = (scale: { at: number; value: number }[]) => {
    const a = scale[0];
    const b = scale[scale.length - 1];
    return { toData: (px: number) => a.value + ((px - a.at) * (b.value - a.value)) / (b.at - a.at), toPx: (v: number) => a.at + ((v - a.value) * (b.at - a.at)) / (b.value - a.value) };
  };
  const x = map(across);
  const y = map(up);
  const rings = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].map((m): Pt => [x.toData(Number(m[1])), y.toData(Number(m[2]))]);
  return { x, y, rings, labels: texts.filter((t) => t[1] === 'x').map((t) => Number(t[5])) };
}

const diagramOf = (slide: Slide): string => {
  const block = (slide as { prompt: { kind: string; svg?: string }[] }).prompt.find((b) => b.kind === 'diagram');
  if (block?.svg) return block.svg;
  if (slide.kind === 'slider' && slide.figure) return slide.figure.svg;
  throw new Error('no curve on this slide');
};

/** Whether a drawn curve's rings are the table's corners, to within a fifth of a square. */
function ringsMatch(svg: string, g: Grouped) {
  const { rings, labels } = readFigure(svg);
  const pts = corners(g);
  expect(labels).toEqual(g.bounds);
  expect(rings.length).toBe(pts.length);
  const across = Math.min(...g.bounds.slice(1).map((b, i) => b - g.bounds[i])) / 2;
  rings.forEach(([rx, ry], j) => {
    expect(Math.abs(rx - pts[j][0])).toBeLessThan(across / 5);
    expect(Math.abs(ry - pts[j][1])).toBeLessThan(pts[pts.length - 1][1] / 60 + 0.2);
  });
}

/** Where a slider's marker sits for its answer, as a fraction across or down the picture. */
function markerAt(slide: Slide): number {
  if (slide.kind !== 'slider' || !slide.figure) throw new Error('not a slider with a figure');
  const { xMin, xMax } = slide.figure;
  return (slide.answer - xMin) / (xMax - xMin);
}

const VIEW = { width: 280, height: 220 };

describe('the curve sliders', () => {
  it('never rest their handle within reach of the answer', () => {
    for (const id of ['dat-cf-below-slider', 'dat-cf-quartile-slider', 'dat-pct-slider']) {
      for (const { slide, seed, difficulty } of draws<Grouped>(id)) {
        if (slide.kind !== 'slider') throw new Error('not a slider slide');
        const rest = defaultSliderValue(slide.min, slide.max, slide.step);
        expect(Math.abs(rest - slide.answer), `${id} seed ${seed} d${difficulty}`).toBeGreaterThan(slide.tolerance ?? slide.step / 2);
      }
    }
  });
});

describe('cumulative frequency tables', () => {
  it('fills the running totals by adding down, with a hidden frequency as the difference at difficulty 2', () => {
    type P = Grouped & { hidden: number };
    for (const { params, slide, difficulty, seed } of draws<P>('dat-cf-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      let t = 0;
      const expected = params.fs.map((f, i) => {
        t += f;
        return i === params.hidden ? t - (t - f) : t;
      });
      expect(slide.answer.map(num), `seed ${seed}`).toEqual(expected);
      expect(t).toBe(add(params.fs));
      expect(params.hidden >= 0).toBe(difficulty === 2);
      expect(verdict(slide, slide.answer)).toBe('correct');
    }
  });

  it('plots each class at its upper boundary against its running total', () => {
    type P = Grouped & { at: number; given: boolean };
    for (const { params, slide, seed } of draws<P>('dat-cf-point')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const upper = params.bounds[params.at + 1];
      const counted = countUnder(params, upper);
      expect(correctLabel(slide), `seed ${seed}`).toBe(`(${upper}, ${counted})`);
      expect(new Set(slide.options.map((o) => o.label)).size).toBe(4);
    }
  });

  it('recovers each frequency as the growth in the printed running totals', () => {
    for (const { params, slide, seed } of draws<Grouped>('dat-cf-back')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const printed = slide.rows.map((row) => Number(row[2]));
      const growth = printed.map((c, i) => c - (i === 0 ? 0 : printed[i - 1]));
      expect(slide.answer.map(num), `seed ${seed}`).toEqual(growth);
      expect(growth).toEqual(params.fs);
    }
  });

  it('counts the values below a boundary, or at least it at difficulty 2', () => {
    type P = Grouped & { at: number; above: boolean };
    for (const { params, slide, difficulty, seed } of draws<P>('dat-cf-count')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const b = params.bounds[params.at];
      const below = countUnder(params, b);
      const atLeast = classOfEach(params.fs).filter((i) => params.bounds[i] >= b).length;
      expect(num(slide.answer), `seed ${seed}`).toBe(difficulty === 2 ? atLeast : below);
    }
  });
});

describe('reading the curve', () => {
  // Drawn while the file is collected, which is untimed: six generators at
  // every seed are more rendering than one test's budget should carry.
  const pictured = ['dat-cf-between', 'dat-cf-above', 'dat-cf-positions', 'dat-cf-iqr', 'dat-pct-range', 'dat-pct-rank'].flatMap(
    (id) => draws<Grouped>(id),
  );

  it('draws every ring at an upper boundary and its running total, under a scale that matches', () => {
    for (const { params, slide } of pictured) ringsMatch(diagramOf(slide), params);
  });

  it('slides up to the height of the curve at x, halfway along a class at difficulty 1', () => {
    type P = Grouped & { x: number; guided: boolean };
    for (const { params, slide, difficulty, seed } of draws<P>('dat-cf-below-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const pts = corners(params);
      const h = heightAtX(pts, params.x);
      expect(slide.answer, `seed ${seed}`).toBe(h);
      expect(Number.isInteger(h)).toBe(true);
      const j = params.bounds.findIndex((b) => b > params.x) - 1;
      const halfway = (params.bounds[j] + params.bounds[j + 1]) / 2 === params.x;
      expect(halfway, `seed ${seed}`).toBe(difficulty === 1);
      expect(params.bounds.includes(params.x)).toBe(false);
      // The marker, as a fraction down the picture, sits where the curve is at that height.
      const { y } = readFigure(slide.figure!.svg);
      expect(Math.abs((1 - markerAt(slide)) * VIEW.height - y.toPx(h))).toBeLessThan(0.6);
      ringsMatch(slide.figure!.svg, params);
    }
  });

  it('takes the reading at the bottom from the reading at the top', () => {
    type P = Grouped & { a: number; b: number };
    for (const { params, slide, seed } of draws<P>('dat-cf-between')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const pts = corners(params);
      const [hb, ha] = [heightAtX(pts, params.b), heightAtX(pts, params.a)];
      expect(slide.answer.map(num), `seed ${seed}`).toEqual([hb, ha, hb - ha]);
      expect(params.a).toBeLessThan(params.b);
    }
  });

  it('takes the reading from n for how many are more', () => {
    type P = Grouped & { x: number };
    for (const { params, slide, seed } of draws<P>('dat-cf-above')) {
      const n = add(params.fs);
      expect(num(correctLabel(slide)), `seed ${seed}`).toBe(n - heightAtX(corners(params), params.x));
    }
  });

  it('names the mistake the picture actually shows', () => {
    type P = Grouped & { plot: string };
    for (const { params, slide, seed } of draws<P>('dat-cf-check')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { rings } = readFigure(diagramOf(slide));
      const width = params.bounds[1] - params.bounds[0];
      const falls = rings.some(([, ry], j) => j > 0 && ry < rings[j - 1][1] - 0.5);
      const offBoundary = rings.some(([rx]) => params.bounds.every((b) => Math.abs(rx - b) > width / 10));
      const fromZero = Math.abs(rings[0][0] - params.bounds[0]) < width / 10 && Math.abs(rings[0][1]) < 0.5;
      const verdictFromPicture = falls ? ['No'] : offBoundary ? ['Yes', 'No'] : fromZero ? ['Yes', 'Yes', 'Yes'] : ['Yes', 'Yes', 'No'];
      expect(slide.answer, `seed ${seed} ${params.plot}`).toEqual(verdictFromPicture);
    }
  });
});

describe('median, quartiles and percentiles from the curve', () => {
  type Q = Grouped & { pct: number; guided: boolean };

  /** Checks an x slider against the corners and its own picture. */
  function slidesAcross(id: string, grid: (d: number) => boolean) {
    for (const { params, slide, difficulty, seed } of draws<Q>(id)) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const n = add(params.fs);
      const x = xAtHeight(corners(params), (params.pct * n) / 100);
      expect(slide.answer, `seed ${seed}`).toBeCloseTo(x, 9);
      const squares = (x - params.bounds[0]) / ((params.bounds[1] - params.bounds[0]) / 2);
      expect(close(squares, Math.round(squares)), `seed ${seed}: on a grid line`).toBe(grid(difficulty));
      const { x: scale } = readFigure(slide.figure!.svg);
      expect(Math.abs(markerAt(slide) * VIEW.width - scale.toPx(x))).toBeLessThan(0.6);
      ringsMatch(slide.figure!.svg, params);
    }
  }

  it('slides to the median on a grid line at difficulty 1, and to any quartile between the lines at 2', () => {
    slidesAcross('dat-cf-quartile-slider', (d) => d === 1);
    for (const { params, difficulty } of draws<Q>('dat-cf-quartile-slider')) {
      expect(add(params.fs) % 4).toBe(0);
      if (difficulty === 1) expect(params.pct).toBe(50);
    }
  });

  it('reads quartiles at n/4, n/2 and 3n/4, never the list rule', () => {
    for (const { params, slide, seed } of draws<Grouped>('dat-cf-positions')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const n = add(params.fs);
      const pts = corners(params);
      const expected = [1, 2, 3].flatMap((q) => [(q * n) / 4, xAtHeight(pts, (q * n) / 4)]);
      slide.answer.map(num).forEach((v, j) => expect(v, `seed ${seed}`).toBeCloseTo(expected[j], 9));
    }
    for (const { params, slide, seed } of draws<Grouped>('dat-cf-iqr')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const n = add(params.fs);
      const pts = corners(params);
      const [q1, q3] = [xAtHeight(pts, n / 4), xAtHeight(pts, (3 * n) / 4)];
      const expected = [n / 4, (3 * n) / 4, q1, q3, q3 - q1];
      slide.answer.map(num).forEach((v, j) => expect(v, `seed ${seed}`).toBeCloseTo(expected[j], 9));
    }
    for (const { params, slide, seed } of draws<{ n: number; pct: number }>('dat-cf-rule')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const q = params.pct / 25;
      expect(num(correctLabel(slide)), `seed ${seed}`).toBe((q * params.n) / 4);
      expect(slide.options.map((o) => num(o.label))).toContain((q * (params.n + 1)) / 4);
    }
  });

  it('puts the pth percentile at pn/100, and slides to it', () => {
    for (const { params, slide, seed } of draws<{ n: number; pct: number }>('dat-pct-position')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const expected = [params.pct, params.n, (params.pct / 100) * params.n];
      slide.answer.map(num).forEach((v, j) => expect(v, `seed ${seed}`).toBeCloseTo(expected[j], 9));
    }
    slidesAcross('dat-pct-slider', (d) => d === 1);
  });

  it('finds the 10th to 90th range from both readings', () => {
    for (const { params, slide, seed } of draws<Grouped>('dat-pct-range')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const n = add(params.fs);
      const pts = corners(params);
      const [a, b] = [xAtHeight(pts, n / 10), xAtHeight(pts, (9 * n) / 10)];
      const expected = [n / 10, a, (9 * n) / 10, b, b - a];
      slide.answer.map(num).forEach((v, j) => expect(v, `seed ${seed}`).toBeCloseTo(expected[j], 9));
    }
  });

  it('turns a reading into a percentage of n', () => {
    for (const { params, slide, seed } of draws<Grouped & { x: number }>('dat-pct-rank')) {
      const h = heightAtX(corners(params), params.x);
      expect(num(correctLabel(slide)), `seed ${seed}`).toBeCloseTo((h / add(params.fs)) * 100, 9);
    }
  });
});

describe('interpolating inside a class', () => {
  type I = Grouped & { pct: number };

  it('names the class holding the value at that position, counted along the expanded data', () => {
    for (const { params, slide, seed } of draws<I>('dat-interp-class')) {
      const pos = (params.pct * add(params.fs)) / 100;
      const i = classOfEach(params.fs)[Math.ceil(pos) - 1];
      expect(correctLabel(slide), `seed ${seed}`).toBe(`${params.bounds[i]} \\le x < ${params.bounds[i + 1]}`);
    }
  });

  it('fills lower boundary, position, count before, frequency, width and the estimate', () => {
    for (const { params, slide, seed } of draws<I>('dat-interp-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const pos = (params.pct * add(params.fs)) / 100;
      const i = classOfEach(params.fs)[Math.ceil(pos) - 1];
      const before = countUnder(params, params.bounds[i]);
      const expected = [params.bounds[i], pos, before, params.fs[i], params.bounds[i + 1] - params.bounds[i], xAtHeight(corners(params), pos)];
      slide.answer.map(num).forEach((v, j) => expect(v, `seed ${seed}`).toBeCloseTo(expected[j], 9));
      expect(verdict(slide, slide.answer)).toBe('correct');
    }
  });

  it('works the estimate one operation at a time, each step the arithmetic of the line before', () => {
    for (const { params, slide, seed } of draws<I>('dat-interp-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const [lo, , , pos, , before, , , width, , f] = slide.start.map(Number);
      const d = pos - before;
      const expected = [d, d * width, (d * width) / f, lo + (d * width) / f];
      slide.reductions.forEach((r, j) => expect(num(r.value), `seed ${seed} step ${j}`).toBeCloseTo(expected[j], 9));
      expect(expected[3]).toBeCloseTo(xAtHeight(corners(params), (params.pct * add(params.fs)) / 100), 9);
      for (const r of slide.reductions) expect(r.bank).toContain(r.value);
    }
  });

  it('types the estimate, exact, with the median over equal classes at difficulty 1', () => {
    for (const { params, slide, difficulty, seed } of draws<I>('dat-interp-value')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const x = xAtHeight(corners(params), (params.pct * add(params.fs)) / 100);
      expect(num(slide.answer), `seed ${seed}`).toBeCloseTo(x, 9);
      expect(close(Math.round(x * 100) / 100, x)).toBe(true);
      const widths = params.bounds.slice(1).map((b, i) => b - params.bounds[i]);
      if (difficulty === 1) {
        expect(params.pct).toBe(50);
        expect(new Set(widths).size).toBe(1);
      }
    }
    // Difficulty 2 has one class twice as wide, so a width cannot be carried down the table.
    const mixed = draws<I>('dat-interp-value').filter(
      ({ params, difficulty }) => difficulty === 2 && new Set(params.bounds.slice(1).map((b, i) => b - params.bounds[i])).size === 2,
    );
    expect(mixed.length).toBe(SEEDS);
  });
});
