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
