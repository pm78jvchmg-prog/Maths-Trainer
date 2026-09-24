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
 * against the area under the normal curve by Simpson's rule. Level 3 reads
 * the cumulatives quoted at each value of p back out of the prompt, finds
 * each region by scanning them, takes every size and P(Type II) from those
 * quoted values, checks every quoted `\Phi` by Simpson's rule, and works each
 * mean-test P(Type II) again from the numbers the prompt states.
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

/* ---------- level 3: Type I and Type II errors ---------- */

/** The cumulatives quoted under each "If $p = ...$:" line, read back out of the prompt. */
function quotedAt(slide: Slide): Map<string, Map<number, string>> {
  const out = new Map<string, Map<number, string>>();
  if (slide.kind === 'teach') return out;
  slide.prompt.forEach((block, i) => {
    if (block.kind !== 'prose') return;
    const heading = /^If \$p = ([\d.]+)\$:$/.exec(block.text);
    if (!heading) return;
    const next = slide.prompt[i + 1];
    if (next?.kind !== 'display') throw new Error(`no table under ${block.text}`);
    const values = new Map<number, string>();
    for (const match of next.tex.matchAll(/P\(X \\le (\d+)\) &= (\d\.\d{4})/g)) values.set(Number(match[1]), match[2]);
    out.set(heading[1], values);
  });
  return out;
}

/** One quoted cumulative, in ten-thousandths, failing loudly if the prompt left it out. */
function read(slide: Slide, p: number, k: number): number {
  const value = quotedAt(slide).get(String(p))?.get(k);
  if (value === undefined) throw new Error(`P(X <= ${k}) is not quoted at p = ${p}`);
  return tenK(value);
}

const LEVEL3_BINOMIAL = [
  'hyp-error-line',
  'hyp-size',
  'hyp-size-sum',
  'hyp-size-table',
  'hyp-beta',
  'hyp-beta-choice',
  'hyp-beta-flow',
  'hyp-power',
  'hyp-power-pair-tree',
  'hyp-trade-table',
];

interface SceneParams {
  n: number;
  p0: number;
  p1: number;
  p2?: number;
  tail: 'up' | 'down';
  level: number;
  c: number;
}

describe('level 3: every quoted cumulative, at every p', () => {
  it.each(LEVEL3_BINOMIAL)('%s quotes each P(X <= k) as the terms add up, at the claim or an alternative', (id) => {
    let checked = 0;
    for (const { params, slide, seed } of draws<SceneParams>(id)) {
      for (const [p, values] of quotedAt(slide)) {
        expect([params.p0, params.p1, params.p2].map(String), `${id} seed ${seed}: quotes at p = ${p}`).toContain(p);
        for (const [k, value] of values) {
          expect(value, `${id} seed ${seed}: P(X <= ${k}) for B(${params.n}, ${p})`).toBe(cumulative(params.n, Number(p), k));
          expect(value === '0.0000' || value === '1.0000', `${id} seed ${seed}: quoted ${value}`).toBe(false);
          checked += 1;
        }
      }
    }
    expect(checked, `${id} quoted nothing`).toBeGreaterThan(0);
  });
});

/** Where a test with this region fails to reject: the counts outside it. */
const outside = (tail: 'up' | 'down', c: number): string => (tail === 'up' ? `X \\le ${c - 1}` : `X \\ge ${c + 1}`);

/** P(Type I) of a one-tailed region, from the values quoted at the claim. */
const alphaFrom = (slide: Slide, { p0, tail }: SceneParams, c: number): number =>
  tail === 'up' ? 10000 - read(slide, p0, c - 1) : read(slide, p0, c);

/** P(Type II) of a one-tailed region, from the values quoted at the truth. */
const betaFrom = (slide: Slide, tail: 'up' | 'down', c: number, p: number): number =>
  tail === 'up' ? read(slide, p, c - 1) : 10000 - read(slide, p, c);

describe('level 3: naming the two mistakes', () => {
  /** The table of errors, written out once more. */
  const named = (h0True: boolean, rejected: boolean) =>
    h0True && rejected ? 'A Type I error' : !h0True && !rejected ? 'A Type II error' : 'No error: the test got it right';

  it('names the mistake from the truth and the decision', () => {
    for (const { slide, seed } of draws('hyp-error-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const text = shownTex(slide);
      const h0True = text.includes('as claimed');
      const rejected = /rejects \$H_0\$|finds evidence/.test(text);
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(right, `seed ${seed}`).toBe(named(h0True, rejected));
    }
  });

  it('takes the flow to the same verdict, deciding from the p-value where one is quoted', () => {
    let quoted = 0;
    for (const { slide, seed } of draws('hyp-error-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const text = shownTex(slide);
      const h0True = text.includes('as claimed');
      const pv = /p-value is \$(\d\.\d{4})\$/.exec(text);
      const level = Number(/at the (\d+)% level/.exec(text)![1]);
      const rejected = pv ? tenK(pv[1]) < level * 100 : /, rejects \$H_0\$/.test(text);
      if (pv) quoted += 1;
      expect(slide.answer, `seed ${seed}`).toEqual([h0True ? 'Yes' : 'No', rejected ? 'Yes' : 'No']);
      const end = slide.steps.find((s) => s.id === (h0True ? 'held' : 'false'))!.branches.find((b) => b.label === slide.answer[1])!;
      expect(end.outcome!.startsWith(named(h0True, rejected).replace('No error: the test got it right', 'No error')), `seed ${seed}: ${end.outcome}`).toBe(true);
    }
    expect(quoted).toBe(SEEDS);
  });

  it('writes each error as its event and its truth, with the region the table gives', () => {
    for (const { params, slide, seed } of draws<SceneParams & { which: 'I' | 'II' }>('hyp-error-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const { n, p0, tail, level, which } = params;
      const c = scanRegion(n, p0, tail, level);
      expect(shownTex(slide), `seed ${seed}`).toContain(tail === 'up' ? `X \\ge ${c}` : `X \\le ${c}`);
      const expected =
        which === 'I'
          ? [tail === 'up' ? '\\ge' : '\\le', `${c}`, '=', String(p0)]
          : [tail === 'up' ? '\\le' : '\\ge', `${tail === 'up' ? c - 1 : c + 1}`, tail === 'up' ? '>' : '<', String(p0)];
      expect(slide.answer, `seed ${seed}`).toEqual(expected);
    }
  });

  it('shades the region for a Type I error and everything outside it for a Type II error', () => {
    for (const { params, slide, seed } of draws<SceneParams & { which: 'I' | 'II' }>('hyp-error-line')) {
      if (slide.kind !== 'numberLine') throw new Error('not a number line');
      const { n, p0, tail, level, which } = params;
      const c = scanRegion(n, p0, tail, level);
      const region = tail === 'up' ? `[${c},inf)` : `(-inf,${c}]`;
      const rest = tail === 'up' ? `(-inf,${c - 1}]` : `[${c + 1},inf)`;
      expect(slide.answer, `seed ${seed}`).toBe(which === 'I' ? region : rest);
      expect(shownTex(slide).includes('Type I error') === (which === 'I'), `seed ${seed}`).toBe(true);
    }
  });
});

interface RuleParams {
  n: number;
  p0: number;
  tail: 'up' | 'down' | 'two';
  a: number;
  b: number;
}

describe('level 3: the size of a test', () => {
  /** The rule's size from the quoted values, with the rule read from the prompt's words. */
  function sizeFromPrompt(slide: Slide, { p0, tail, a, b }: RuleParams, seed: number): number {
    const text = shownTex(slide);
    let size = 0;
    if (tail !== 'up') {
      expect(text, `seed ${seed}`).toContain(`${a} or fewer`);
      size += read(slide, p0, a);
    }
    if (tail !== 'down') {
      expect(text, `seed ${seed}`).toContain(`${b} or more`);
      size += 10000 - read(slide, p0, b - 1);
    }
    return size;
  }

  it('types the probability of the stated rule under the claim', () => {
    for (const { params, slide, seed } of draws<RuleParams>('hyp-size')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      expect(tenK(slide.answer), `seed ${seed}`).toBe(sizeFromPrompt(slide, params, seed));
    }
  });

  it('reduces to the same size one step at a time, reading each cumulative from the table', () => {
    for (const { params, slide, seed } of draws<RuleParams>('hyp-size-sum')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const values = slide.reductions.map((r) => r.value);
      expect(tenK(values[values.length - 1]), `seed ${seed}`).toBe(sizeFromPrompt(slide, params, seed));
      expect(tenK(values[values.length - 2]), `seed ${seed}`).toBe(10000 - read(slide, params.p0, params.b - 1));
      if (values.length === 4) {
        expect(tenK(values[0])).toBe(read(slide, params.p0, params.a));
        expect(tenK(values[1])).toBe(read(slide, params.p0, params.b - 1));
      }
    }
  });

  it('marks the region, under the claimed p, as the probability of a Type I error', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-size-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const c = scanRegion(params.n, params.p0, params.tail, params.level);
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(right, `seed ${seed}`).toBe(`P(${params.tail === 'up' ? `X \\ge ${c}` : `X \\le ${c}`} \\mid p = ${params.p0})`);
    }
  });

  it('fills each level with the region the scan finds and its size, which falls as the level does', () => {
    for (const { params, slide, seed } of draws<SceneParams & { levels: number[]; given: boolean }>('hyp-size-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const cs = params.levels.map((level) => scanRegion(params.n, params.p0, params.tail, level));
      const alphas = cs.map((c) => alphaFrom(slide, params, c));
      const expected = cs.flatMap((c, i) => [...(params.given ? [] : [`${c}`]), (alphas[i] / 10000).toFixed(4)]);
      expect(slide.answer, `seed ${seed}`).toEqual(expected);
      alphas.forEach((alpha, i) => expect(alpha).toBeLessThanOrEqual(params.levels[i] * 100));
      expect(alphas[0] > alphas[1] && alphas[1] > alphas[2], `seed ${seed}: ${alphas}`).toBe(true);
    }
  });
});

describe('level 3: Type II errors and power', () => {
  it('types P(Type II) from the table at the true p, outside the region the scan finds', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-beta')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const c = scanRegion(params.n, params.p0, params.tail, params.level);
      expect(tenK(slide.answer), `seed ${seed}`).toBe(betaFrom(slide, params.tail, c, params.p1));
      // The truth really is on H_1's side, so H_0 is false.
      expect(params.tail === 'up' ? params.p1 > params.p0 : params.p1 < params.p0).toBe(true);
    }
  });

  it('types the power as one minus that', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-power')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const c = scanRegion(params.n, params.p0, params.tail, params.level);
      expect(tenK(slide.answer), `seed ${seed}`).toBe(10000 - betaFrom(slide, params.tail, c, params.p1));
    }
  });

  it('marks outside the region, at the true p, as P(Type II)', () => {
    for (const { params, slide, seed } of draws<SceneParams & { numbers: boolean }>('hyp-beta-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const c = scanRegion(params.n, params.p0, params.tail, params.level);
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      const expected = params.numbers
        ? (betaFrom(slide, params.tail, c, params.p1) / 10000).toFixed(4)
        : `P(${outside(params.tail, c)} \\mid p = ${params.p1})`;
      expect(right, `seed ${seed}`).toBe(expected);
    }
  });

  it('walks the flow to the counts outside the region and their probability at the true p', () => {
    for (const { params, slide, seed } of draws<SceneParams>('hyp-beta-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const c = scanRegion(params.n, params.p0, params.tail, params.level);
      const beta = betaFrom(slide, params.tail, c, params.p1);
      expect(slide.answer, `seed ${seed}`).toEqual(['Outside the critical region', `$${outside(params.tail, c)}$`, `$${(beta / 10000).toFixed(4)}$`]);
    }
  });

  it('gives the further alternative the smaller P(Type II) and the larger power', () => {
    for (const { params, slide, seed } of draws<SceneParams & { p2: number }>('hyp-power-pair-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const c = scanRegion(params.n, params.p0, params.tail, params.level);
      const b1 = betaFrom(slide, params.tail, c, params.p1);
      const b2 = betaFrom(slide, params.tail, c, params.p2);
      expect(slide.answer.map(tenK), `seed ${seed}`).toEqual([b1, b2, 10000 - b1, 10000 - b2]);
      expect(Math.abs(params.p2 - params.p0)).toBeGreaterThan(Math.abs(params.p1 - params.p0));
      expect(b2, `seed ${seed}`).toBeLessThan(b1);
    }
  });

  it('trades the errors: the stricter level has the smaller size and the bigger P(Type II)', () => {
    for (const { params, slide, seed } of draws<SceneParams & { levels: number[]; given: boolean }>('hyp-trade-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const cs = params.levels.map((level) => scanRegion(params.n, params.p0, params.tail, level));
      const alphas = cs.map((c) => alphaFrom(slide, params, c));
      const betas = cs.map((c) => betaFrom(slide, params.tail, c, params.p1));
      const expected = cs.flatMap((c, i) => [...(params.given ? [] : [`${c}`]), ...[alphas[i], betas[i]].map((v) => (v / 10000).toFixed(4))]);
      expect(slide.answer, `seed ${seed}`).toEqual(expected);
      expect(alphas[1] < alphas[0] && betas[1] > betas[0], `seed ${seed}`).toBe(true);
    }
  });

  interface ChangeParams {
    n: number;
    p0: number;
    tail: 'up' | 'down';
    change: string;
    from: number;
    to: number;
    pFrom: number;
    pTo: number;
    beta: boolean;
  }

  it('says which way each error moves, as the regions and the terms work out', () => {
    const word = (before: number, after: number, same: string) => (after > before ? 'rises' : after < before ? 'falls' : same);
    for (const { params, slide, seed } of draws<ChangeParams>('hyp-power-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const { n, p0, tail, from, to, pFrom, pTo, beta } = params;
      const [c1, c2] = [from, to].map((level) => scanRegion(n, p0, tail, level));
      const inRegion = (c: number, p: number) => {
        const terms = pmf(n, p);
        return terms.reduce((sum, t, r) => sum + ((tail === 'up' ? r >= c : r <= c) ? t : 0), 0);
      };
      const alpha = word(inRegion(c1, p0), inRegion(c2, p0), 'is unchanged');
      const power = word(inRegion(c1, pFrom), inRegion(c2, pTo), 'is unchanged');
      const second = beta ? `P(Type II) ${power === 'rises' ? 'falls' : 'rises'}` : `the power ${power}`;
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(right, `seed ${seed}`).toBe(`P(Type I) ${alpha} and ${second}`);
    }
  });
});

describe('level 3: errors in the test of a mean', () => {
  /** Phi(z) by Simpson's rule, from the tail area above. */
  const Phi = (z: number): number => 1 - tailArea(z);
  const CRITICAL: Record<string, number> = { '5': 1.645, '1': 2.326 };

  /** Every quoted Phi agrees with the area under the curve to four places. */
  function checkPhi(slide: Slide, seed: number): Map<string, string> {
    const quoted = new Map<string, string>();
    for (const match of shownTex(slide).matchAll(/\\Phi\(([\d.]+)\) &= (\d\.\d{4})/g)) {
      expect(match[2], `seed ${seed}: Phi(${match[1]})`).toBe((Math.round(Phi(Number(match[1])) * 10000) / 10000).toFixed(4));
      quoted.set(match[1], match[2]);
    }
    expect(quoted.size, `seed ${seed}: no Phi quoted`).toBeGreaterThan(0);
    return quoted;
  }

  /** The test as the prompt states it. */
  function testFromPrompt(slide: Slide) {
    const text = shownTex(slide);
    const up = text.includes('has increased');
    expect(up || text.includes('has decreased')).toBe(true);
    return {
      mu: Number(/claimed to be \$(\d+)\$/.exec(text)![1]),
      sigma: Number(/standard deviation \$(\d+)\$/.exec(text)![1]),
      truth: Number(/In fact the mean is \$(-?[\d.]+)\$/.exec(text)![1]),
      c: CRITICAL[/at the (\d+)% level/.exec(text)![1]],
      up,
    };
  }

  /** P(Type II) for sample size n: the sample mean on the wrong side of the boundary when the truth holds. */
  function betaAt(t: ReturnType<typeof testFromPrompt>, n: number): { z: number; beta: number } {
    const se = t.sigma / Math.sqrt(n);
    const boundary = t.up ? t.mu + t.c * se : t.mu - t.c * se;
    const z = (boundary - t.truth) / se;
    return { z, beta: t.up ? Phi(z) : 1 - Phi(z) };
  }

  it('types P(Type II) as the normal tail at the boundary under the true mean', () => {
    for (const { slide, seed } of draws('hyp-mean-beta')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const quoted = checkPhi(slide, seed);
      const t = testFromPrompt(slide);
      const { z, beta } = betaAt(t, Number(/random sample of \$(\d+)\$/.exec(shownTex(slide))![1]));
      expect(tenK(slide.answer), `seed ${seed}`).toBe(Math.round(beta * 10000));
      // And it is a quoted value, or one minus one.
      const at = tenK(quoted.get(String(Math.round(Math.abs(z) * 1000) / 1000))!);
      expect([at, 10000 - at], `seed ${seed}`).toContain(tenK(slide.answer));
    }
  });

  it('fills the tree with the boundary, its z under the true mean, and the tail', () => {
    for (const { slide, seed } of draws('hyp-mean-miss-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      checkPhi(slide, seed);
      const t = testFromPrompt(slide);
      const n = Number(/random sample of \$(\d+)\$/.exec(shownTex(slide))![1]);
      const { z, beta } = betaAt(t, n);
      const se = t.sigma / Math.sqrt(n);
      expect(Math.abs(Number(slide.answer[0]) - (t.up ? t.mu + t.c * se : t.mu - t.c * se)), `seed ${seed}`).toBeLessThan(1e-9);
      expect(Math.abs(Number(slide.answer[1]) - z), `seed ${seed}`).toBeLessThan(1e-9);
      expect(tenK(slide.answer[2]), `seed ${seed}`).toBe(Math.round(beta * 10000));
    }
  });

  it('shrinks P(Type II) as n grows, at a fixed level', () => {
    for (const { slide, seed } of draws<{ given: boolean }>('hyp-beta-n-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      checkPhi(slide, seed);
      const t = testFromPrompt(slide);
      const rows = slide.rows.map((row) => betaAt(t, Number(row[0])));
      const answer = [...slide.answer];
      rows.forEach(({ z, beta }, i) => {
        const zCell = slide.rows[i][1] ?? answer.shift()!;
        expect(Math.abs(Number(zCell) - z), `seed ${seed} row ${i}`).toBeLessThan(1e-9);
        expect(tenK(answer.shift()!), `seed ${seed} row ${i}`).toBe(Math.round(beta * 10000));
      });
      expect(rows[0].beta > rows[1].beta && rows[1].beta > rows[2].beta, `seed ${seed}`).toBe(true);
    }
  });

  it('says which way each error moves when n, the level or the truth changes', () => {
    for (const { params, slide, seed } of draws<{ n: number; n2: number; level: number; level2: number; dh: number; dh2: number }>('hyp-mean-error-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const t = testFromPrompt(slide);
      const text = shownTex(slide);
      const before = betaAt(t, params.n).beta;
      const moved = /turns out to be \$(-?[\d.]+)\$/.exec(text);
      const after = betaAt({ ...t, c: CRITICAL[String(params.level2)], truth: moved ? Number(moved[1]) : t.truth }, params.n2).beta;
      const alpha = params.level2 === params.level ? 'stays the same' : params.level2 < params.level ? 'falls' : 'rises';
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(right, `seed ${seed}`).toBe(`P(Type I) ${alpha} and P(Type II) ${after > before ? 'rises' : 'falls'}`);
    }
  });
});
