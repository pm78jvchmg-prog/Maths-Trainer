/**
 * The Binomial and Normal generators, checked against arithmetic of their own.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself. It would pass a P(X = r) with the powers swapped, a cumulative sum
 * that stopped one short, or a Phi table misprinted in the fourth place. So
 * each check here reaches the answer by a route the generator does not take:
 * binomial probabilities by building the distribution one trial at a time
 * (no nCr, no powers), Phi by Simpson's rule on the density (no series), and
 * every normal answer from the numbers the prompt quotes and states, read
 * back out of the prompt text.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Block, Generator, Slide } from '../types';

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

/**
 * B(n, p) built trial by trial: after each trial, r successes can come from r
 * before and a failure, or r - 1 before and a success. No nCr, no powers.
 */
function distribution(n: number, p: number): number[] {
  let row = [1];
  for (let trial = 0; trial < n; trial += 1) {
    const next = new Array(row.length + 1).fill(0);
    row.forEach((chance, r) => {
      next[r] += chance * (1 - p);
      next[r + 1] += chance * p;
    });
    row = next;
  }
  return row;
}

const close = (a: number, b: number, tolerance = 1e-9) => Math.abs(a - b) < tolerance;

/** Phi by Simpson's rule on the density from 0, which knows nothing of erf. */
function simpsonPhi(z: number): number {
  const steps = 2000;
  const h = z / steps;
  const f = (t: number) => Math.exp((-t * t) / 2) / Math.sqrt(2 * Math.PI);
  let total = 0;
  for (let i = 0; i <= steps; i += 1) {
    const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
    total += weight * f(i * h);
  }
  return 0.5 + (total * h) / 3;
}

/** Every prose and display string of a prompt, joined. */
const promptText = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt.map((block: Block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** Every `\Phi(z) = value` a prompt quotes. */
function quotedPhis(text: string): [number, number][] {
  return [...text.matchAll(/\\Phi\((\d+(?:\.\d+)?)\) &?= (0\.\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

/** Mean and standard deviation, read from the prompt in either of its two forms. */
function normalFrom(text: string): { mu: number; sigma: number } {
  const words = /mean \$(-?[\d.]+)\$ and standard deviation \$([\d.]+)\$/.exec(text);
  if (words) return { mu: Number(words[1]), sigma: Number(words[2]) };
  const symbols = /N\((-?[\d.]+), (\d+)\)/.exec(text);
  expect(symbols, `no distribution in: ${text}`).not.toBeNull();
  return { mu: Number(symbols![1]), sigma: Math.sqrt(Number(symbols![2])) };
}

describe('the quoted Phi values', () => {
  it('match Simpson to four places at every z a question can quote', () => {
    const phi = registry['dist-normal-prob'] as unknown as Generator<unknown>;
    expect(phi).toBeDefined();
    for (let seed = 0; seed < 400; seed += 1) {
      for (const difficulty of DIFFICULTIES) {
        const slide = phi.render(phi.sample(makeRng(seed), difficulty));
        for (const [z, value] of quotedPhis(promptText(slide))) {
          expect(value, `Phi(${z})`).toBe(Number(simpsonPhi(z).toFixed(4)));
        }
      }
    }
  });

  it('puts every percentage point in the table within rounding of its probability', () => {
    for (const [z, p] of [
      [1.645, 0.95],
      [1.96, 0.975],
      [2.326, 0.99],
      [2.576, 0.995],
    ]) {
      expect(Math.abs(simpsonPhi(z) - p), `Phi(${z})`).toBeLessThan(0.0005);
    }
  });
});

/* ---------- the binomial distribution ---------- */

interface PointParams {
  n: number;
  p: number;
  r: number;
}

describe('dist-pmf, against a distribution built trial by trial', () => {
  it('gives P(X = r)', () => {
    for (const { params, slide, seed } of draws<PointParams>('dist-pmf')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      expect(close(Number(slide.answer), distribution(params.n, params.p)[params.r]), `seed ${seed}`).toBe(true);
    }
  });

  it('builds the tree from the three factors and their product', () => {
    for (const { params, slide, seed } of draws<PointParams>('dist-pmf-factors')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const [c, a, b, product] = slide.answer.map(Number);
      expect(close(c * a * b, product), `seed ${seed}`).toBe(true);
      expect(close(product, distribution(params.n, params.p)[params.r]), `seed ${seed}`).toBe(true);
    }
  });

  it('ends the working on P(X = r)', () => {
    for (const { params, slide, seed } of draws<PointParams>('dist-pmf-working')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const last = slide.reductions[slide.reductions.length - 1].value;
      expect(close(Number(last), distribution(params.n, params.p)[params.r]), `seed ${seed}`).toBe(true);
    }
  });
});

describe('cumulative probabilities, against the same distribution', () => {
  it('fills a table whose blanks match the distribution and its running total', () => {
    for (const { params, slide, seed } of draws<{ n: number; p: number }>('dist-table-fill')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const dist = distribution(params.n, params.p);
      let blank = 0;
      slide.rows.forEach((row, r) => {
        const running = dist.slice(0, r + 1).reduce((a, b) => a + b, 0);
        row.slice(1).forEach((cell, column) => {
          const value = cell ?? slide.answer[blank++];
          expect(close(Number(value), column === 0 ? dist[r] : running), `seed ${seed}, row ${r}`).toBe(true);
        });
      });
    }
  });

  it('reads P(X <= r) and P(X < r) the way the lead writes them', () => {
    for (const { params, slide, seed } of draws<{ n: number; p: number }>('dist-cumulative')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const m = /P\(X (<|\\le) (\d+)\)/.exec(slide.lead!);
      expect(m, slide.lead).not.toBeNull();
      const top = m![1] === '<' ? Number(m![2]) - 1 : Number(m![2]);
      const want = distribution(params.n, params.p)
        .slice(0, top + 1)
        .reduce((a, b) => a + b, 0);
      expect(close(Number(slide.answer), want), `seed ${seed}`).toBe(true);
    }
  });

  it('finds P(X >= k) and its cousins by adding the matching end of the distribution', () => {
    for (const { params, slide, seed } of draws<{ n: number; p: number }>('dist-at-least')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const m = /P\(X (<|>|\\le|\\ge) (\d+)\)/.exec(slide.lead!);
      expect(m, slide.lead).not.toBeNull();
      const k = Number(m![2]);
      const inEvent = { '<': (r: number) => r < k, '>': (r: number) => r > k, '\\le': (r: number) => r <= k, '\\ge': (r: number) => r >= k }[m![1]]!;
      const want = distribution(params.n, params.p).reduce((acc, chance, r) => (inEvent(r) ? acc + chance : acc), 0);
      expect(close(Number(slide.answer), want), `seed ${seed}`).toBe(true);
    }
  });

  it('works the complement down to P(X >= k)', () => {
    for (const { params, slide, seed } of draws<{ n: number; p: number; k: number }>('dist-at-least-working')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const want = distribution(params.n, params.p).reduce((acc, chance, r) => (r >= params.k ? acc + chance : acc), 0);
      expect(close(Number(slide.reductions[slide.reductions.length - 1].value), want), `seed ${seed}`).toBe(true);
    }
  });

  it('fills the missing table value so the table adds up to 1', () => {
    for (const { slide, seed } of draws<unknown>('dist-table-missing')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const given = promptText(slide)
        .split('\\hline')[1]
        .replace('\\end{array}', '')
        .split('\\\\')
        .map((row) => row.split('&')[1].trim())
        .filter((cell) => cell !== '?')
        .map(Number);
      expect(close(given.reduce((a, b) => a + b, Number(slide.answer)), 1), `seed ${seed}`).toBe(true);
    }
  });
});

describe('mean and variance, as sums over the distribution', () => {
  const moments = (n: number, p: number) => {
    const dist = distribution(n, p);
    const mean = dist.reduce((acc, chance, r) => acc + r * chance, 0);
    const square = dist.reduce((acc, chance, r) => acc + r * r * chance, 0);
    return { mean, variance: square - mean * mean };
  };

  it('gives E(X) and Var(X)', () => {
    for (const { params, slide, seed } of draws<{ n: number; p: number; ask: 'mean' | 'var' }>('dist-mean-variance')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { mean, variance } = moments(params.n, params.p);
      expect(close(Number(slide.answer), params.ask === 'mean' ? mean : variance, 1e-6), `seed ${seed}`).toBe(true);
    }
  });

  it('recovers n or p from the mean and variance it states', () => {
    for (const { params, slide, seed } of draws<{ n: number; p: number; ask: 'n' | 'p' }>('dist-from-moments')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const [mean, variance] = [...promptText(slide).matchAll(/\$(\d+(?:\.\d+)?)\$/g)].map((m) => Number(m[1]));
      const answer = Number(slide.answer);
      const n = params.ask === 'n' ? answer : params.n;
      const p = params.ask === 'p' ? answer : params.p;
      const actual = moments(n, p);
      expect(close(actual.mean, mean, 1e-6) && close(actual.variance, variance, 1e-6), `seed ${seed}`).toBe(true);
    }
  });
});

/* ---------- the normal distribution ---------- */

/** P(X < x) from the quoted table alone, by symmetry below the mean. */
function belowFromTable(z: number, table: [number, number][]): number {
  const row = table.find(([at]) => close(at, Math.abs(z)));
  expect(row, `Phi(${Math.abs(z)}) is not quoted`).toBeDefined();
  return z >= 0 ? row![1] : 1 - row![1];
}

describe('normal probabilities, from the quoted table and the prompt alone', () => {
  it('standardises x from the mean and standard deviation the prompt gives', () => {
    for (const { slide, seed } of draws<unknown>('dist-z-score')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const { mu, sigma } = normalFrom(text);
      const x = Number(/Standardise \$x = (-?[\d.]+)\$/.exec(text)![1]);
      expect(close(Number(slide.answer), (x - mu) / sigma), `seed ${seed}`).toBe(true);
    }
  });

  it('answers P(X < a), P(X > a) and P(a < X < b) from the quoted Phi, and close to the truth', () => {
    for (const { slide, seed } of draws<unknown>('dist-normal-prob')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const { mu, sigma } = normalFrom(text);
      const table = quotedPhis(text);
      const lead = slide.lead!;
      const z = (x: string) => (Number(x) - mu) / sigma;
      let fromTable: number;
      let truth: number;
      const trueBelow = (t: number) => (t >= 0 ? simpsonPhi(t) : 1 - simpsonPhi(-t));
      let m: RegExpExecArray | null;
      if ((m = /^P\(X < ([\d.]+)\)/.exec(lead))) {
        fromTable = belowFromTable(z(m[1]), table);
        truth = trueBelow(z(m[1]));
      } else if ((m = /^P\(X > ([\d.]+)\)/.exec(lead))) {
        fromTable = 1 - belowFromTable(z(m[1]), table);
        truth = 1 - trueBelow(z(m[1]));
      } else {
        m = /^P\(([\d.]+) < X < ([\d.]+)\)/.exec(lead);
        expect(m, lead).not.toBeNull();
        fromTable = belowFromTable(z(m![2]), table) - belowFromTable(z(m![1]), table);
        truth = trueBelow(z(m![2])) - trueBelow(z(m![1]));
      }
      expect(close(Number(slide.answer), fromTable), `seed ${seed}: ${lead}`).toBe(true);
      expect(Math.abs(Number(slide.answer) - truth), `seed ${seed}: ${lead}`).toBeLessThan(0.0002);
    }
  });

  it('fills each row of the table with z and P(X < x)', () => {
    for (const { slide, seed } of draws<unknown>('dist-normal-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const text = promptText(slide);
      const { mu, sigma } = normalFrom(text);
      const table = quotedPhis(text);
      slide.rows.slice(1).forEach((row, i) => {
        const z = (Number(row[0]) - mu) / sigma;
        expect(close(Number(slide.answer[2 * i]), z), `seed ${seed}`).toBe(true);
        expect(close(Number(slide.answer[2 * i + 1]), belowFromTable(z, table)), `seed ${seed}`).toBe(true);
      });
    }
  });

  it('puts a at the percentage point the stated probability calls for', () => {
    for (const { slide, seed } of draws<unknown>('dist-inverse-x')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const { mu, sigma } = normalFrom(text);
      const z = (Number(slide.answer) - mu) / sigma;
      const below = simpsonPhi(Math.abs(z));
      const lower = z >= 0 ? below : 1 - below;
      let m: RegExpExecArray | null;
      if ((m = /P\(X > a\) = ([\d.]+)/.exec(text))) expect(Math.abs(1 - lower - Number(m[1])), `seed ${seed}`).toBeLessThan(0.0005);
      else if ((m = /P\(X < a\) = ([\d.]+)/.exec(text))) expect(Math.abs(lower - Number(m[1])), `seed ${seed}`).toBeLessThan(0.0005);
      else {
        m = /middle ([\d.]+)% .* with \$a\$ the (upper|lower) end/.exec(text);
        expect(m, text).not.toBeNull();
        expect(z > 0, `seed ${seed}`).toBe(m![2] === 'upper');
        expect(Math.abs(2 * below - 1 - Number(m![1]) / 100), `seed ${seed}`).toBeLessThan(0.001);
      }
    }
  });

  it('finds a mu or sigma that makes the stated probability true', () => {
    for (const { slide, seed } of draws<unknown>('dist-find-parameter')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const answer = Number(slide.answer);
      const mu = slide.lead!.includes('mu') ? answer : Number(/N\((-?[\d.]+), \\sigma\^2\)/.exec(text)![1]);
      const sigma = slide.lead!.includes('sigma') ? answer : Math.sqrt(Number(/N\(\\mu, (\d+)\)/.exec(text)![1]));
      const m = /P\(X (<|>) ([\d.]+)\) = ([\d.]+)/.exec(text);
      expect(m, text).not.toBeNull();
      const z = (Number(m![2]) - mu) / sigma;
      const lower = z >= 0 ? simpsonPhi(z) : 1 - simpsonPhi(-z);
      const stated = Number(m![3]);
      expect(Math.abs((m![1] === '<' ? lower : 1 - lower) - stated), `seed ${seed}: ${text}`).toBeLessThan(0.0005);
    }
  });
});
