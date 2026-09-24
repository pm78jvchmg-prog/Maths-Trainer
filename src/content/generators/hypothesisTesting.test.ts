/**
 * The Hypothesis Testing generators, checked against arithmetic of their own.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * quoted cumulative that is wrong, a critical region one count off, or a z
 * built on σ/n. So each check here reaches the answer by a route the
 * generator does not take: binomial probabilities by the ratio of successive
 * terms rather than by nCr, every quoted value in every prompt read back out
 * of the TeX and recomputed, regions found by scanning those quoted values,
 * z from σ and √n written out again, and the four critical values checked
 * against the area under the normal curve by Simpson's rule. Level 4's
 * critical values of r are found again from the density of r under `H_0` by
 * quadrature, and every decision is rederived from the quoted r, its sign and
 * the quoted critical value.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import type { Answer } from '../../engine/session';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

/** Every P(X = r) for X ~ B(n, p), each from the one before: no nCr anywhere. */
function pmf(n: number, p: number): number[] {
  const out = [(1 - p) ** n];
  for (let r = 0; r < n; r += 1) out.push((out[r] * (n - r) * p) / ((r + 1) * (1 - p)));
  return out;
}

/** P(X <= k), to four places, as a table would print it. */
function cumulative(n: number, p: number, k: number): string {
  const terms = pmf(n, p);
  let total = 0;
  for (let r = 0; r <= k; r += 1) total += terms[r];
  return (Math.round(total * 10000) / 10000).toFixed(4);
}

/** Ten-thousandths, so sums and differences of quoted values stay exact. */
const tenK = (text: string): number => Math.round(Number(text) * 10000);

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
  const lesson = { id: 'ht-test', title: 'Test', slides: [], skillCheck: [{ type: 'literal' as const, slide }] };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

/** Every piece of TeX a slide shows before it is answered. */
function shownTex(slide: Slide): string {
  const parts: string[] = [];
  if (slide.kind !== 'teach') {
    for (const block of slide.prompt) {
      if (block.kind === 'display') parts.push(block.tex);
      if (block.kind === 'prose') parts.push(block.text);
    }
  }
  if (slide.kind === 'flow') {
    parts.push(slide.subject);
    for (const step of slide.steps) {
      parts.push(step.ask);
      for (const branch of step.branches) parts.push(branch.label, branch.outcome ?? '');
    }
  }
  return parts.join(' \n ');
}

/** The quoted P(X <= k) and P(X >= k) in a slide, read back out of its TeX. */
function quotedIn(slide: Slide): { le: Map<number, string>; ge: Map<number, string> } {
  const tex = shownTex(slide);
  const le = new Map<number, string>();
  const ge = new Map<number, string>();
  for (const match of tex.matchAll(/P\(X \\le (\d+)\) &?= (\d\.\d{4})/g)) le.set(Number(match[1]), match[2]);
  for (const match of tex.matchAll(/P\(X \\ge (\d+)\) &?= (\d\.\d{4})/g)) ge.set(Number(match[1]), match[2]);
  if (slide.kind === 'table' && slide.columns[1] === 'P(X \\le x)') {
    for (const row of slide.rows) le.set(Number(row[0]), row[1] as string);
  }
  return { le, ge };
}

/** The binomial generators: every one has `n` and `p` among its parameters. */
const BINOMIAL = [
  'hyp-upper-tree',
  'hyp-point-prob',
  'hyp-pvalue-table',
  'hyp-pvalue',
  'hyp-decision-flow',
  'hyp-region-line',
  'hyp-region-table',
  'hyp-actual-level',
  'hyp-region-choice',
  'hyp-two-flow',
  'hyp-two-region-line',
  'hyp-two-level',
];

describe('every quoted binomial probability', () => {
  it.each(BINOMIAL)('%s quotes P(X <= k) and P(X >= k) as the terms themselves add up', (id) => {
    let checked = 0;
    for (const { params, slide, seed } of draws<{ n: number; p: number }>(id)) {
      const { n, p } = params;
      const { le, ge } = quotedIn(slide);
      for (const [k, value] of le) {
        expect(value, `${id} seed ${seed}: P(X <= ${k}) for B(${n}, ${p})`).toBe(cumulative(n, p, k));
        expect(value === '0.0000' || value === '1.0000', `${id} seed ${seed}: quoted ${value}`).toBe(false);
        checked += 1;
      }
      for (const [k, value] of ge) {
        expect(tenK(value), `${id} seed ${seed}: P(X >= ${k})`).toBe(10000 - tenK(cumulative(n, p, k - 1)));
        checked += 1;
      }
    }
    expect(checked, `${id} quoted nothing`).toBeGreaterThan(0);
  });
});

/** The quoted P(X <= k) for B(n, p), for every k that rounds strictly inside (0, 1). */
function table(n: number, p: number): Map<number, number> {
  const out = new Map<number, number>();
  for (let k = 0; k < n; k += 1) {
    const value = tenK(cumulative(n, p, k));
    if (value > 0 && value < 10000) out.set(k, value);
  }
  return out;
}

/** The critical value of a one-tailed test, scanning the quoted table. */
function scanRegion(n: number, p: number, tail: 'up' | 'down', level: number): number {
  const quoted = table(n, p);
  const cap = level * 100;
  if (tail === 'up') {
    for (let c = 1; c <= n; c += 1) {
      const below = quoted.get(c - 1);
      if (below !== undefined && 10000 - below <= cap) return c;
    }
  } else {
    for (let c = n - 1; c >= 0; c -= 1) {
      const at = quoted.get(c);
      if (at !== undefined && at <= cap) return c;
    }
  }
  throw new Error('no region');
}

interface RegionParams {
  n: number;
  p: number;
  tail: 'up' | 'down';
  level: number;
  c: number;
}

describe('critical regions, found by scanning the table', () => {
  it('shades the region the table gives, as a ray from its end', () => {
    for (const { params, slide, seed } of draws<RegionParams>('hyp-region-line')) {
      if (slide.kind !== 'numberLine') throw new Error('not a number line');
      const c = scanRegion(params.n, params.p, params.tail, params.level);
      expect(slide.answer, `seed ${seed}`).toBe(params.tail === 'up' ? `[${c},inf)` : `(-inf,${c}]`);
      expect(slide.min).toBe(-1);
      expect(slide.max).toBe(params.n + 1);
    }
  });

  it('marks the region the table gives as the right option', () => {
    for (const { params, slide, seed } of draws<RegionParams>('hyp-region-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const c = scanRegion(params.n, params.p, params.tail, params.level);
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(right, `seed ${seed}`).toBe(params.tail === 'up' ? `X \\ge ${c}` : `X \\le ${c}`);
    }
  });

  it('gives the probability of that region as the actual level', () => {
    for (const { params, slide, seed } of draws<RegionParams>('hyp-actual-level')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const c = scanRegion(params.n, params.p, params.tail, params.level);
      const quoted = table(params.n, params.p);
      const level = params.tail === 'up' ? 10000 - quoted.get(c - 1)! : quoted.get(c)!;
      expect(tenK(slide.answer), `seed ${seed}`).toBe(level);
      expect(level).toBeLessThanOrEqual(params.level * 100);
    }
  });

  it('fills each candidate tail, and ends the table on the region the scan finds', () => {
    for (const { params, slide, seed } of draws<RegionParams & { k: number }>('hyp-region-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const quoted = table(params.n, params.p);
      const c = scanRegion(params.n, params.p, 'up', params.level);
      const expected = [params.k, params.k + 1, params.k + 2, c].map((x) => ((10000 - quoted.get(x - 1)!) / 10000).toFixed(4));
      expect(slide.answer, `seed ${seed}`).toEqual(expected);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
      const swapped = [slide.answer[1], slide.answer[0], ...slide.answer.slice(2)];
      if (swapped[0] !== swapped[1]) expect(verdict(slide, swapped), `seed ${seed}`).toBe('incorrect');
    }
  });

  interface TwoParams {
    n: number;
    p: number;
    level: number;
  }

  /** Both ends of a two-tailed region, each tail within half the level. */
  function scanTwo({ n, p, level }: TwoParams): [number, number] {
    const quoted = table(n, p);
    const half = level * 50;
    let a = -1;
    for (let k = 0; k < n; k += 1) if ((quoted.get(k) ?? Infinity) <= half) a = k;
    let b = n + 1;
    for (let k = n; k >= 1; k -= 1) {
      const below = quoted.get(k - 1);
      if (below !== undefined && 10000 - below <= half) b = k;
    }
    return [a, b];
  }

  it('shades both tails of a two-tailed region', () => {
    for (const { params, slide, seed } of draws<TwoParams>('hyp-two-region-line')) {
      if (slide.kind !== 'numberLine') throw new Error('not a number line');
      const [a, b] = scanTwo(params);
      expect(slide.answer, `seed ${seed}`).toBe(`(-inf,${a}]|[${b},inf)`);
    }
  });

  it('adds both tails for the actual level of a two-tailed test', () => {
    for (const { params, slide, seed } of draws<TwoParams>('hyp-two-level')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const [a, b] = scanTwo(params);
      const quoted = table(params.n, params.p);
      expect(tenK(slide.answer), `seed ${seed}`).toBe(quoted.get(a)! + 10000 - quoted.get(b - 1)!);
      expect(tenK(slide.answer)).toBeLessThanOrEqual(params.level * 100);
    }
  });
});

interface PValueParams {
  n: number;
  p: number;
  x: number;
  tail: 'up' | 'down';
  level: number;
}

describe('p-values and decisions', () => {
  it('types the tail H_1 points at', () => {
    for (const { params, slide, seed } of draws<PValueParams>('hyp-pvalue')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { n, p, x, tail } = params;
      const expected = tail === 'up' ? 10000 - tenK(cumulative(n, p, x - 1)) : tenK(cumulative(n, p, x));
      expect(tenK(slide.answer), `seed ${seed}`).toBe(expected);
      // The observation really is on H_1's side of what H_0 expects.
      expect(tail === 'up' ? x > n * p : x < n * p, `seed ${seed}`).toBe(true);
    }
  });

  it('rejects exactly when the quoted p-value is below the level', () => {
    let rejects = 0;
    const cases = draws<PValueParams>('hyp-decision-flow');
    for (const { params, slide, seed } of cases) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const { n, p, x, tail, level } = params;
      const pv = tail === 'up' ? 10000 - tenK(cumulative(n, p, x - 1)) : tenK(cumulative(n, p, x));
      const reject = pv < level * 100;
      if (reject) rejects += 1;
      expect(slide.answer[slide.answer.length - 1], `seed ${seed}`).toBe(reject ? 'Yes' : 'No');
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
    // Neither verdict is free.
    expect(rejects).toBeGreaterThan(cases.length * 0.3);
    expect(rejects).toBeLessThan(cases.length * 0.7);
  });

  it('compares a two-tailed test with half the level', () => {
    for (const { params, slide, seed } of draws<PValueParams>('hyp-two-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const { n, p, x, level } = params;
      const pv = x > n * p ? 10000 - tenK(cumulative(n, p, x - 1)) : tenK(cumulative(n, p, x));
      expect(slide.answer[2], `seed ${seed}`).toBe(pv < level * 50 ? 'Yes' : 'No');
    }
  });

  it('fills the upper-tail column from the row above', () => {
    for (const { params, slide, seed } of draws<{ n: number; p: number }>('hyp-pvalue-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const blanks = slide.rows.filter((row) => row[2] === null).map((row) => Number(row[0]));
      const expected = blanks.map((x) => ((10000 - tenK(cumulative(params.n, params.p, x - 1))) / 10000).toFixed(4));
      expect(slide.answer, `seed ${seed}`).toEqual(expected);
    }
  });
});

/* ---------- the normal model ---------- */

/** Simpson's rule for the area under the standard normal curve beyond `z`. */
function tailArea(z: number): number {
  const f = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
  const hi = 12;
  const steps = 4000;
  const h = (hi - z) / steps;
  let total = 0;
  for (let i = 0; i <= steps; i += 1) {
    const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
    total += weight * f(z + i * h);
  }
  return (total * h) / 3;
}

describe('the four critical values', () => {
  it('cut off the tails they are quoted for', () => {
    const quoted: [number, number][] = [
      [1.645, 0.05],
      [1.96, 0.025],
      [2.326, 0.01],
      [2.576, 0.005],
    ];
    for (const [z, area] of quoted) expect(Math.abs(tailArea(z) - area), `${z}`).toBeLessThan(0.0002);
  });

  it('fill the critical-value table by level and direction', () => {
    const byArea: Record<string, string> = { '5': '1.645', '2.5': '1.96', '1': '2.326', '0.5': '2.576' };
    for (const { slide, seed } of draws('hyp-critical-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      slide.rows.forEach((row, i) => {
        const level = Number((row[0] as string).replace('\\%', ''));
        const h1 = row[1] as string;
        const two = h1.includes('\\ne');
        const value = byArea[String(two ? level / 2 : level)];
        const expected = two ? `\\pm ${value}` : h1.includes('<') ? `-${value}` : value;
        expect(slide.answer[i], `seed ${seed}: ${h1} at ${level}%`).toBe(expected);
      });
    }
  });
});

interface MeanParams {
  mu: number;
  n: number;
  s: number;
  zh: number;
  tail: 'up' | 'down' | 'two';
  level: number;
}

/** z from the numbers the learner reads in the prompt. */
function zFromPrompt(slide: Slide): number {
  const tex = shownTex(slide);
  const mu = Number(/claimed to be \$(\d+)\$/.exec(tex)![1]);
  const sigma = Number(/standard deviation \$(\d+)\$/.exec(tex)![1]);
  const n = Number(/sample of \$(\d+)\$/.exec(tex)![1]);
  const xbar = Number(/\\bar\{x\} = (-?[\d.]+)\$/.exec(tex)![1]);
  return (xbar - mu) / (sigma / Math.sqrt(n));
}

describe('the z statistic', () => {
  it('is the typed answer, from the numbers in the prompt, to at most two places', () => {
    for (const { slide, seed } of draws<MeanParams>('hyp-z')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const z = zFromPrompt(slide);
      expect(Math.abs(Number(slide.answer) - z), `seed ${seed}`).toBeLessThan(1e-9);
      expect(slide.answer, `seed ${seed}`).toMatch(/^-?\d+(\.\d{1,2})?$/);
    }
  });

  it('ends the steps and the tree on the same z', () => {
    for (const id of ['hyp-standardise-steps', 'hyp-z-tree']) {
      for (const { slide, seed } of draws<MeanParams>(id)) {
        const z = zFromPrompt(slide);
        const last = slide.kind === 'steps' ? slide.reductions[2].value : slide.kind === 'tree' ? slide.answer[2] : '';
        expect(Math.abs(Number(last) - z), `${id} seed ${seed}`).toBeLessThan(1e-9);
      }
    }
  });

  it('puts the slider answer on z, to the tenth the slider moves in', () => {
    for (const { slide, seed } of draws<MeanParams>('hyp-z-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      expect(Math.abs(slide.answer - zFromPrompt(slide)), `seed ${seed}`).toBeLessThan(1e-9);
    }
  });

  it('decides by whether z is in the critical region', () => {
    const critical = (level: number, two: boolean) =>
      (two ? { 10: 1.645, 5: 1.96, 1: 2.576 } : { 5: 1.645, 1: 2.326 })[level as 1 | 5]!;
    for (const { params, slide, seed } of draws<MeanParams>('hyp-mean-decision-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const z = (params.zh * params.s) / 100 / params.s;
      const c = critical(params.level, params.tail === 'two');
      const inside = params.tail === 'up' ? z > c : params.tail === 'down' ? z < -c : Math.abs(z) > c;
      expect(slide.answer[1], `seed ${seed}`).toBe(inside ? 'Yes' : 'No');
    }
  });
});

describe('the critical sample mean', () => {
  it('sits exactly on the critical value of z', () => {
    for (const { params, slide, seed } of draws<MeanParams>('hyp-mean-xbar')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const se = (params.s * Math.sqrt(params.n)) / Math.sqrt(params.n);
      const z = (Number(slide.answer) - params.mu) / se;
      const one = { 5: 1.645, 1: 2.326 } as Record<number, number>;
      const two = { 10: 1.645, 5: 1.96, 1: 2.576 } as Record<number, number>;
      const c = params.tail === 'two' ? two[params.level] : one[params.level];
      expect(Math.abs(z - (params.tail === 'down' ? -c : c)), `seed ${seed}`).toBeLessThan(1e-9);
    }
  });
});

/* ---------- level 4: testing a correlation ---------- */

/** Simpson's rule for `f` over [a, b]. */
function simpson(f: (x: number) => number, a: number, b: number, steps = 2000): number {
  const h = (b - a) / steps;
  let total = 0;
  for (let i = 0; i <= steps; i += 1) total += (i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (total * h) / 3;
}

/**
 * P(R > c) when rho = 0, for a sample of n. The density of r is proportional
 * to (1 - r^2)^((n - 4)/2); putting r = sin t turns it into cos(t)^(n - 3),
 * which is smooth to both ends, so Simpson's rule is accurate. The generator
 * takes none of this route: it quotes a stored table.
 */
function upperTailOfR(n: number, c: number): number {
  const f = (t: number) => Math.cos(t) ** (n - 3);
  return simpson(f, Math.asin(c), Math.PI / 2) / simpson(f, -Math.PI / 2, Math.PI / 2);
}

const ownCritical = new Map<string, number>();

/** The one-tailed critical value of r for n at `level`%, by bisection on the tail. */
function criticalR(n: number, level: number): number {
  const key = `${n}|${level}`;
  if (!ownCritical.has(key)) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 45; i += 1) {
      const mid = (lo + hi) / 2;
      if (upperTailOfR(n, mid) > level / 100) lo = mid;
      else hi = mid;
    }
    ownCritical.set(key, (lo + hi) / 2);
  }
  return ownCritical.get(key)!;
}

/** Every table excerpt a slide quotes, as `n|level` to the four-place value. */
function excerptsIn(slide: Slide): Map<string, string> {
  const out = new Map<string, string>();
  const tex = shownTex(slide);
  for (const match of tex.matchAll(/\\begin\{array\}\{c\|c+\} (.*?) \\end\{array\}/g)) {
    const [head, body] = match[1].split(' \\\\ \\hline ');
    const levels = head.split(' & ').slice(1).map((cell) => Number(cell.replace('\\%', '')));
    for (const row of body.split(' \\\\ ')) {
      const [n, ...values] = row.split(' & ');
      values.forEach((value, i) => out.set(`${n}|${levels[i]}`, value));
    }
  }
  return out;
}

/** The quoted critical value for n at a one-tailed level, in ten-thousandths. */
function quotedCritical(slide: Slide, n: number, level: number): number {
  const value = excerptsIn(slide).get(`${n}|${level}`);
  expect(value, `no quoted value for n = ${n} at ${level}%`).toBeDefined();
  return tenK(value!);
}

/** The r a slide quotes, in ten-thousandths. */
function quotedR(slide: Slide): number {
  const match = /r = (-?\d\.\d{4})/.exec(shownTex(slide));
  expect(match, 'no r quoted').not.toBeNull();
  return tenK(match![1]);
}

type Tail = 'up' | 'down' | 'two';

const columnOf = (level: number, tail: Tail): number => (tail === 'two' ? level / 2 : level);

/** Whether r rejects H_0: rho = 0, by its sign and its size against c. */
function rejects(r: number, tail: Tail, c: number): boolean {
  if (tail === 'two') return Math.abs(r) > c;
  return tail === 'up' ? r > c : r < -c;
}

const LEVEL_4 = [
  'hyp-rho-flow',
  'hyp-rho-tiles',
  'hyp-rho-choice',
  'hyp-rho-h1-table',
  'hyp-pmcc-lookup',
  'hyp-pmcc-table',
  'hyp-pmcc-trend-choice',
  'hyp-pmcc-flow',
  'hyp-rho-decision-flow',
  'hyp-rho-region-choice',
  'hyp-rho-region-tiles',
  'hyp-rho-critical-slider',
  'hyp-rho-two-flow',
  'hyp-rho-two-tiles',
  'hyp-rho-column',
  'hyp-rho-two-table',
  'hyp-rho-n-slider',
  'hyp-rho-shift-flow',
  'hyp-rho-which-rejects',
  'hyp-rho-cause-choice',
];

describe('every quoted critical value of r', () => {
  /** Every value quoted anywhere in level 4, gathered once. */
  const seen = new Map<string, string>();
  for (const id of LEVEL_4) {
    for (const { slide } of draws(id)) for (const [key, value] of excerptsIn(slide)) seen.set(key, value);
  }

  it('matches the tail area of r under H_0, found by quadrature', () => {
    for (const [key, value] of seen) {
      const [n, level] = key.split('|').map(Number);
      expect(value, key).toMatch(/^0\.\d{4}$/);
      expect(Math.abs(Number(value) - criticalR(n, level)), `n = ${n} at ${level}%`).toBeLessThan(0.00005 + 1e-6);
    }
    // The excerpts between them reach most of the table.
    expect(seen.size).toBeGreaterThan(100);
    expect(seen.get('10|5')).toBe('0.5494');
  });

  it('falls down each column and rises across each row', () => {
    const levels = [10, 5, 2.5, 1, 0.5];
    for (let n = 4; n <= 30; n += 1) {
      for (const level of levels) {
        const here = seen.get(`${n}|${level}`);
        const below = seen.get(`${n + 1}|${level}`);
        const right = seen.get(`${n}|${levels[levels.indexOf(level) + 1]}`);
        if (here && below) expect(Number(below), `n = ${n + 1} at ${level}%`).toBeLessThan(Number(here));
        if (here && right) expect(Number(right), `n = ${n}, right of ${level}%`).toBeGreaterThan(Number(here));
      }
    }
  });

  it.each(LEVEL_4)('%s quotes r to four places, never as far as one', (id) => {
    for (const { slide, seed } of draws(id)) {
      for (const match of shownTex(slide).matchAll(/r = (-?\d\.\d+)/g)) {
        expect(match[1], `${id} seed ${seed}`).toMatch(/^-?0\.\d{4}$/);
        expect(Math.abs(Number(match[1])), `${id} seed ${seed}`).toBeLessThan(1);
      }
    }
  });
});

/** H_1 as the plain wording names it; undefined when it is in the scenario's own words. */
function tailNamed(text: string): Tail | undefined {
  if (/suspects positive correlation/.test(text)) return 'up';
  if (/suspects negative correlation/.test(text)) return 'down';
  if (/are correlated\.|not which way/.test(text)) return 'two';
  return undefined;
}

const OPS: Record<Tail, string> = { up: '>', down: '<', two: '\\ne' };

interface ClaimParams {
  tail: Tail;
  rh: number;
}

describe('hyp-rho-flow', () => {
  it('reaches H_1 from the suspicion, with H_0 always rho = 0', () => {
    for (const { params, slide, seed } of draws<ClaimParams>('hyp-rho-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const tail = tailNamed(shownTex(slide)) ?? params.tail;
      expect(tail, `seed ${seed}`).toBe(params.tail);
      const rest = tail === 'two' ? ['No'] : ['Yes', tail === 'up' ? 'Positive' : 'Negative'];
      expect(slide.answer.slice(-rest.length), `seed ${seed}`).toEqual(rest);
      if (slide.answer.length > rest.length) expect(slide.answer[0]).toContain('\\rho = 0');
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });
});

describe('hyp-rho-tiles', () => {
  it('writes both hypotheses about rho, with zero on each side', () => {
    for (const { params, slide, seed } of draws<ClaimParams>('hyp-rho-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const tail = tailNamed(shownTex(slide)) ?? params.tail;
      expect(slide.answer, `seed ${seed}`).toEqual(['0', OPS[tail], '0']);
      expect(slide.bank, `seed ${seed}: the sample's r is on offer as a slip`).toContain((quotedR(slide) / 10000).toFixed(4));
    }
  });
});

describe('hyp-rho-choice', () => {
  it('picks rho = 0 against the suspicion, whichever way the sample leans', () => {
    for (const { params, slide, seed } of draws<ClaimParams>('hyp-rho-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const tail = tailNamed(shownTex(slide)) ?? params.tail;
      const right = slide.options.find((o) => o.id === slide.correctId)!;
      expect(right.label, `seed ${seed}`).toBe(`H_0: \\rho = 0, \\; H_1: \\rho ${OPS[tail]} 0`);
    }
  });
});

describe('hyp-rho-h1-table', () => {
  it('gives each study the H_1 its suspicion names', () => {
    for (const { params, slide, seed } of draws<{ tails: Tail[] }>('hyp-rho-h1-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const studies = slide.prompt.filter((b) => b.kind === 'prose' && /^\*\*[A-D]\.\*\*/.test(b.text));
      expect(studies.length).toBe(slide.answer.length);
      studies.forEach((block, i) => {
        const tail = (block.kind === 'prose' && tailNamed(block.text)) || params.tails[i];
        expect(slide.answer[i], `seed ${seed} study ${i}`).toBe(`\\rho ${OPS[tail]} 0`);
      });
    }
  });
});

interface LookupParams {
  n: number;
  level: number;
}

describe('hyp-pmcc-lookup', () => {
  it('types the quoted entry at row n and the level\'s column', () => {
    for (const { params, slide, seed } of draws<LookupParams>('hyp-pmcc-lookup')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      expect(slide.keypad).toEqual([]);
      expect(tenK(slide.answer), `seed ${seed}`).toBe(quotedCritical(slide, params.n, params.level));
    }
  });
});

describe('hyp-pmcc-table', () => {
  it('fills each row from its own cell of the quoted excerpt', () => {
    for (const { slide, seed } of draws('hyp-pmcc-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      slide.rows.forEach((row, i) => {
        const level = Number((row[1] as string).replace('\\%', ''));
        expect(tenK(slide.answer[i]), `seed ${seed} row ${i}`).toBe(quotedCritical(slide, Number(row[0]), level));
      });
    }
  });
});

describe('hyp-pmcc-trend-choice', () => {
  it('offers one value on the side the trend allows, and it is the table\'s', () => {
    for (const { params, slide, seed } of draws<{ n1: number; l1: number; n2: number; l2: number }>('hyp-pmcc-trend-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const { n1, l1, n2, l2 } = params;
      const given = quotedCritical(slide, n1, l1);
      // Larger n, or a looser level, lowers the value; the draws never pull both ways.
      const falls = n2 > n1 || l2 > l1;
      if (n2 !== n1 && l2 !== l1) expect(n2 > n1, `seed ${seed}`).toBe(l2 > l1);
      for (const option of slide.options) {
        const onSide = falls ? tenK(option.label) < given : tenK(option.label) > given;
        expect(onSide, `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
      const right = slide.options.find((o) => o.id === slide.correctId)!;
      expect(Math.abs(Number(right.label) - criticalR(n2, l2)), `seed ${seed}`).toBeLessThan(0.00005 + 1e-6);
    }
  });
});

describe('hyp-pmcc-flow', () => {
  it('reads n as the pairs and the level\'s own column', () => {
    for (const { params, slide, seed } of draws<LookupParams>('hyp-pmcc-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const pairs = Number(/for each of (\d+) /.exec(shownTex(slide))![1]);
      expect(slide.answer, `seed ${seed}`).toEqual([`$${pairs}$, one per pair`, `${params.level}%`]);
      const leaf = slide.steps[1].branches.find((b) => b.label === `${params.level}%`)!;
      const c = quotedCritical(slide, pairs, params.level);
      expect(leaf.outcome, `seed ${seed}`).toContain(`r > ${(c / 10000).toFixed(4)}`);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });
});

interface SceneParams {
  n: number;
  tail: Tail;
  level: number;
}

describe('hyp-rho-decision-flow', () => {
  it('rejects only for an r of H_1\'s sign beyond the critical value', () => {
    let rejected = 0;
    let wrongWay = 0;
    const cases = draws<SceneParams>('hyp-rho-decision-flow');
    for (const { params, slide, seed } of cases) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const r = quotedR(slide);
      const c = quotedCritical(slide, params.n, params.level);
      const signOk = params.tail === 'up' ? r > 0 : r < 0;
      const reject = rejects(r, params.tail, c);
      if (!signOk) wrongWay += 1;
      if (reject) rejected += 1;
      expect(slide.answer, `seed ${seed}`).toEqual(signOk ? ['Yes', reject ? 'Yes' : 'No'] : ['No']);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
    expect(wrongWay).toBeGreaterThan(cases.length * 0.1);
    expect(rejected).toBeGreaterThan(cases.length * 0.25);
    expect(rejected).toBeLessThan(cases.length * 0.6);
  });
});

/** The region for r as the generators write it, from a value in ten-thousandths. */
function regionOf(tail: Tail, c: number): string {
  const v = (c / 10000).toFixed(4);
  if (tail === 'up') return `r > ${v}`;
  if (tail === 'down') return `r < -${v}`;
  return `|r| > ${v}`;
}

describe('hyp-rho-region-choice', () => {
  it('is the quoted value, on H_1\'s side', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-rho-region-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const right = slide.options.find((o) => o.id === slide.correctId)!;
      expect(right.label, `seed ${seed}`).toBe(regionOf(params.tail, quotedCritical(slide, params.n, params.level)));
    }
  });
});

describe('hyp-rho-region-tiles', () => {
  it('fills the direction and the signed quoted value', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-rho-region-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const c = (quotedCritical(slide, params.n, params.level) / 10000).toFixed(4);
      expect(slide.answer, `seed ${seed}`).toEqual(params.tail === 'up' ? ['>', c] : ['<', `-${c}`]);
    }
  });
});

describe('hyp-rho-critical-slider', () => {
  it('lands on the quoted critical value, signed by H_1, to the nearest hundredth', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-rho-critical-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const c = quotedCritical(slide, params.n, params.level) / 10000;
      const signed = params.tail === 'up' ? c : -c;
      expect(Math.abs(slide.answer - signed), `seed ${seed}`).toBeLessThan(0.005);
      expect(slide.step).toBe(0.01);
    }
  });
});

describe('hyp-rho-two-flow', () => {
  it('reads half the level and compares |r|', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-rho-two-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const half = params.level / 2;
      const c = quotedCritical(slide, params.n, half);
      expect(slide.answer, `seed ${seed}`).toEqual([`${half}%`, Math.abs(quotedR(slide)) > c ? 'Yes' : 'No']);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });
});

describe('hyp-rho-two-tiles', () => {
  it('puts the half-level value at both ends', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-rho-two-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const c = (quotedCritical(slide, params.n, params.level / 2) / 10000).toFixed(4);
      expect(slide.answer, `seed ${seed}`).toEqual([`-${c}`, c]);
    }
  });
});

describe('hyp-rho-column', () => {
  it('types the level for one tail and half of it for two', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-rho-column')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const level = Number(/at the (\d+(?:\.\d+)?)% level/.exec(shownTex(slide))![1]);
      const tail = tailNamed(shownTex(slide)) ?? (/\\rho \\ne 0/.test(shownTex(slide)) ? 'two' : params.tail);
      expect(Number(slide.answer), `seed ${seed}`).toBe(columnOf(level, tail));
    }
  });
});

describe('hyp-rho-two-table', () => {
  it('fills each row from the column its tails read, signed as the region is', () => {
    for (const { slide, seed } of draws('hyp-rho-two-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      slide.rows.forEach((row, i) => {
        const tail: Tail = (row[1] as string).includes('\\ne') ? 'two' : (row[1] as string).includes('<') ? 'down' : 'up';
        const level = Number((row[2] as string).replace('\\%', ''));
        const c = (quotedCritical(slide, Number(row[0]), columnOf(level, tail)) / 10000).toFixed(4);
        const expected = tail === 'two' ? `\\pm ${c}` : tail === 'down' ? `-${c}` : c;
        expect(slide.answer[i], `seed ${seed} row ${i}`).toBe(expected);
      });
    }
  });
});

describe('hyp-rho-n-slider', () => {
  it('slides to the smallest n whose critical value |r| clears', () => {
    for (const { params, slide, seed } of draws<{ tail: Tail; level: number }>('hyp-rho-n-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const r = quotedR(slide);
      const col = columnOf(params.level, params.tail);
      if (params.tail !== 'two') expect(Math.sign(r), `seed ${seed}`).toBe(params.tail === 'up' ? 1 : -1);
      let smallest = 0;
      for (let n = 4; n <= 30 && smallest === 0; n += 1) if (criticalR(n, col) * 10000 < Math.abs(r)) smallest = n;
      expect(slide.answer, `seed ${seed}`).toBe(smallest);
      // The answer's own row, and the one before it, are quoted.
      expect(quotedCritical(slide, smallest, col), `seed ${seed}`).toBeLessThan(Math.abs(r));
      expect(quotedCritical(slide, smallest - 1, col), `seed ${seed}`).toBeGreaterThan(Math.abs(r));
    }
  });
});

describe('hyp-rho-shift-flow', () => {
  it('moves the critical value as the table does, then decides against it', () => {
    let flips = 0;
    const cases = draws<{ n1: number; l1: number; n2: number; l2: number }>('hyp-rho-shift-flow');
    for (const { params, slide, seed } of cases) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const r = quotedR(slide);
      const c1 = quotedCritical(slide, params.n1, params.l1);
      const c2 = quotedCritical(slide, params.n2, params.l2);
      expect(r, `seed ${seed}: positive, for H_1: rho > 0`).toBeGreaterThan(0);
      expect(slide.answer, `seed ${seed}`).toEqual([c2 > c1 ? 'Larger' : 'Smaller', rejects(r, 'up', c2) ? 'Yes' : 'No']);
      if (rejects(r, 'up', c1) !== rejects(r, 'up', c2)) flips += 1;
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
    expect(flips).toBeGreaterThan(cases.length * 0.3);
  });
});

describe('hyp-rho-which-rejects', () => {
  it('has exactly one setting where r clears the critical value', () => {
    for (const { params, slide, seed } of draws<{ tail: Tail }>('hyp-rho-which-rejects')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const r = quotedR(slide);
      for (const option of slide.options) {
        const [, n, level] = /n = (\d+), \\; (\d+(?:\.\d+)?)\\%/.exec(option.label)!;
        const c = quotedCritical(slide, Number(n), columnOf(Number(level), params.tail));
        expect(rejects(r, params.tail, c), `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

describe('hyp-rho-cause-choice', () => {
  it('claims evidence exactly when r rejects, and never cause or proof', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-rho-cause-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const r = quotedR(slide);
      const reject = rejects(r, params.tail, quotedCritical(slide, params.n, params.level));
      const right = slide.options.find((o) => o.id === slide.correctId)!;
      expect(right.label.startsWith(reject ? 'There is evidence' : 'There is not enough evidence'), `seed ${seed}`).toBe(true);
      expect(right.label, `seed ${seed}`).not.toMatch(/proves|makes|no effect|no correlation/);
    }
  });
});
