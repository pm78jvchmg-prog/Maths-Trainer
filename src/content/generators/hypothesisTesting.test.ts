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
 * against the area under the normal curve by Simpson's rule.
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
