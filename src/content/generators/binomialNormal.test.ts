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
 * back out of the prompt text. Level 3's checks read both statements and the
 * quoted Phi from the prompt, turn each into z themselves, and solve the pair
 * by elimination before comparing; a pair offered as an option is judged by
 * Simpson, not by the table. Level 4 reads n, p and the event from the
 * prompt, finds the matching normal from sums over the distribution, works
 * the continuity correction out bar by bar, and sets each approximation
 * against the exact binomial sum.
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

/* ---------- finding both mu and sigma ---------- */

/** Each `P(X < x) = p` or `P(X > x) = p` a prompt states, as P(X < x). */
function statementsOf(text: string): { x: number; below: number }[] {
  return [...text.matchAll(/P\(X (<|>) ([\d.]+)\) = ([\d.]+)/g)].map((m) => ({
    x: Number(m[2]),
    below: m[1] === '<' ? Number(m[3]) : 1 - Number(m[3]),
  }));
}

/** Every quoted Phi agrees with Simpson's rule to four places. */
function checkQuotes(table: [number, number][], where: string) {
  expect(table.length, `no Phi quoted in: ${where}`).toBeGreaterThan(0);
  for (const [z, value] of table) expect(value, `Phi(${z}) in: ${where}`).toBe(Number(simpsonPhi(z).toFixed(4)));
}

/** z at a value from P(X < x) and the quoted table alone: +u above the mean, -u below it. */
function zFromTable(below: number, table: [number, number][]): number {
  const above = below > 0.5;
  const row = table.find(([, value]) => close(value, above ? below : 1 - below));
  expect(row, `no quoted Phi gives P(X < x) = ${below}`).toBeDefined();
  return above ? row![0] : -row![0];
}

/** mu and sigma from two values and their z, by elimination. */
function solvePair(points: { x: number; z: number }[]): { mu: number; sigma: number } {
  const [a, b] = [...points].sort((p, q) => p.x - q.x);
  const sigma = (b.x - a.x) / (b.z - a.z);
  return { mu: a.x - a.z * sigma, sigma };
}

/** Both statements of a prompt, turned into z from its quoted Phi, and solved. */
function solvedFrom(text: string) {
  const table = quotedPhis(text);
  checkQuotes(table, text);
  const stated = statementsOf(text);
  expect(stated.length, `two statements in: ${text}`).toBe(2);
  const points = stated.map(({ x, below }) => ({ x, z: zFromTable(below, table) }));
  const { mu, sigma } = solvePair(points);
  expect(sigma, `sigma from: ${text}`).toBeGreaterThan(0);
  return { mu, sigma, points, table };
}

/** Whether a pair (mu, sigma) makes a stated P(X < x) true, by Simpson rather than the table. */
function fits(mu: number, sigma: number, { x, below }: { x: number; below: number }): boolean {
  const z = (x - mu) / sigma;
  return Math.abs((z >= 0 ? simpsonPhi(z) : 1 - simpsonPhi(-z)) - below) < 0.0005;
}

const pairOf = (label: string): { mu: number; sigma: number } => {
  const m = /\\mu = (-?[\d.]+), \\; \\sigma = ([\d.]+)/.exec(label);
  expect(m, label).not.toBeNull();
  return { mu: Number(m![1]), sigma: Number(m![2]) };
};

const correctLabel = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error('not a choice slide');
  return slide.options.find((o) => o.id === slide.correctId)!.label;
};

describe('dist-both-sign-flow: the side of the mean and the equation', () => {
  it('reads the sign of z from the stated probability and the quoted Phi', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-sign-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const text = promptText(slide);
      const table = quotedPhis(text);
      checkQuotes(table, text);
      const [{ x, below }] = statementsOf(text);
      const z = zFromTable(below, table);
      expect(slide.answer[0], `seed ${seed}`).toBe(z > 0 ? 'Above the mean' : 'Below the mean');
      expect(Number(/= (-?[\d.]+)\$$/.exec(slide.answer[1])![1]), `seed ${seed}`).toBe(z);
      expect(slide.answer[1], `seed ${seed}`).toContain(`\\frac{${x} - \\mu}`);
    }
  });
});

describe('dist-both-standardise: one equation from one probability', () => {
  it('builds (x - mu) / sigma = z with the z the quoted Phi gives', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-standardise')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const text = promptText(slide);
      const table = quotedPhis(text);
      checkQuotes(table, text);
      const [{ x, below }] = statementsOf(text);
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([x, zFromTable(below, table)]);
    }
  });
});

describe('dist-both-fits: one probability, many pairs', () => {
  it('marks right a pair that fits, and only that one of those offered', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-fits')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const text = promptText(slide);
      checkQuotes(quotedPhis(text), text);
      const [statement] = statementsOf(text);
      for (const option of slide.options) {
        const { mu, sigma } = pairOf(option.label);
        expect(fits(mu, sigma, statement), `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

describe('dist-both-table: P(X < x) and z at both values', () => {
  it('fills each row from the stated probability and the quoted Phi', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const { points } = solvedFrom(promptText(slide));
      const stated = statementsOf(promptText(slide));
      slide.rows.forEach((row, i) => {
        const at = stated.findIndex((s) => s.x === Number(row[0]));
        expect(close(Number(slide.answer[2 * i]), stated[at].below), `seed ${seed}`).toBe(true);
        expect(Number(slide.answer[2 * i + 1]), `seed ${seed}`).toBe(points[at].z);
      });
    }
  });
});

describe('dist-both-equation: x = mu + z sigma for one of the values', () => {
  it('builds the equation for the value it names', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-equation')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const { points } = solvedFrom(promptText(slide));
      const [x, sign, size] = slide.answer;
      const point = points.find((p) => p.x === Number(x));
      expect(point, `seed ${seed}: ${x} is not a stated value`).toBeDefined();
      expect(Number(size) * (sign === '-' ? -1 : 1), `seed ${seed}`).toBe(point!.z);
    }
  });
});

describe('dist-both-pair: the two equations together', () => {
  it('marks right the pair whose coefficients are the two z', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-pair')) {
      const { points } = solvedFrom(promptText(slide));
      const lines = [...correctLabel(slide).matchAll(/([\d.]+) &= \\mu ([+-]) ([\d.]*)\\sigma/g)];
      expect(lines.length, `seed ${seed}`).toBe(2);
      for (const m of lines) {
        const point = points.find((p) => p.x === Number(m[1]));
        expect(point, `seed ${seed}`).toBeDefined();
        expect(Number(m[3] || '1') * (m[2] === '-' ? -1 : 1), `seed ${seed}`).toBe(point!.z);
      }
    }
  });
});

describe('dist-both-solve, dist-both-symmetric and dist-both-proportion: mu or sigma typed', () => {
  it('solves the two statements to the answer', () => {
    for (const id of ['dist-both-solve', 'dist-both-symmetric']) {
      for (const { slide, seed } of draws<unknown>(id)) {
        if (slide.kind !== 'expression') throw new Error('not an expression slide');
        const { mu, sigma } = solvedFrom(promptText(slide));
        expect(close(Number(slide.answer), slide.lead!.includes('mu') ? mu : sigma, 1e-6), `${id} seed ${seed}`).toBe(true);
      }
    }
  });

  it('asks the equal-tails pattern with the two tails really equal', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-symmetric')) {
      const [a, b] = statementsOf(promptText(slide)).sort((p, q) => p.x - q.x);
      expect(close(a.below, 1 - b.below), `seed ${seed}`).toBe(true);
    }
  });

  it('reads a proportion in context as a probability', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-proportion')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const table = quotedPhis(text);
      checkQuotes(table, text);
      const parts = [...text.matchAll(/\$([\d.]+)\\%\$ of [a-z]+ ([a-z ]+?) \$([\d.]+)\$/g)];
      expect(parts.length, text).toBe(2);
      const points = parts.map((m) => {
        const share = Number(m[1]) / 100;
        const below = /less|under|before|shorter/.test(m[2]) ? share : 1 - share;
        return { x: Number(m[3]), z: zFromTable(below, table) };
      });
      const { mu, sigma } = solvePair(points);
      expect(close(Number(slide.answer), slide.lead!.includes('mu') ? mu : sigma, 1e-6), `seed ${seed}: ${text}`).toBe(true);
    }
  });
});

describe('dist-both-working and dist-both-nodes-tree: the elimination', () => {
  it('ends the working on sigma', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-working')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const { sigma } = solvedFrom(promptText(slide));
      expect(close(Number(slide.reductions[slide.reductions.length - 1].value), sigma, 1e-6), `seed ${seed}`).toBe(true);
    }
  });

  it('fills b - a, the gap in z, sigma, z_a sigma and mu', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-nodes-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { mu, sigma, points } = solvedFrom(promptText(slide));
      const [a, b] = [...points].sort((p, q) => p.x - q.x);
      const want = [b.x - a.x, b.z - a.z, sigma, a.z * sigma, mu];
      slide.answer.forEach((value, i) => expect(close(Number(value), want[i], 1e-6), `seed ${seed}, node ${i}`).toBe(true));
    }
  });
});

describe('dist-both-midpoint-slider: equal tails put mu in the middle', () => {
  it('puts the answer at the midpoint of two values with equal tails', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-midpoint-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const [a, b] = statementsOf(promptText(slide)).sort((p, q) => p.x - q.x);
      expect(close(a.below, 1 - b.below), `seed ${seed}`).toBe(true);
      expect(close(slide.answer, (a.x + b.x) / 2), `seed ${seed}`).toBe(true);
      // The handle rests mid-track before it is touched, so that must not be the answer.
      expect(Math.abs((slide.min + slide.max) / 2 - slide.answer), `seed ${seed}`).toBeGreaterThanOrEqual(1.5);
    }
  });
});

describe('dist-both-check-table and dist-both-verify: putting mu and sigma back', () => {
  it('states a found distribution that really solves both statements, and recovers them', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-check-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const text = promptText(slide);
      const found = normalFrom(text);
      const solved = solvedFrom(text);
      expect(close(found.mu, solved.mu, 1e-6) && close(found.sigma, solved.sigma, 1e-6), `seed ${seed}`).toBe(true);
      const stated = statementsOf(text);
      slide.rows.forEach((row, i) => {
        const z = (Number(row[0]) - found.mu) / found.sigma;
        expect(close(Number(slide.answer[2 * i]), z), `seed ${seed}`).toBe(true);
        const below = belowFromTable(z, solved.table);
        expect(close(Number(slide.answer[2 * i + 1]), below), `seed ${seed}`).toBe(true);
        expect(close(below, stated.find((s) => s.x === Number(row[0]))!.below), `seed ${seed}`).toBe(true);
      });
    }
  });

  it('marks right the one pair that makes both statements true', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-verify')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const text = promptText(slide);
      const { mu, sigma } = solvedFrom(text);
      const stated = statementsOf(text);
      for (const option of slide.options) {
        const pair = pairOf(option.label);
        const both = stated.every((s) => fits(pair.mu, pair.sigma, s));
        expect(both, `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
      const right = pairOf(correctLabel(slide));
      expect(close(right.mu, mu, 1e-6) && close(right.sigma, sigma, 1e-6), `seed ${seed}`).toBe(true);
    }
  });
});

describe('dist-both-new-prob and dist-both-chain-tree: a new probability from the found mu and sigma', () => {
  const eventOf = (tex: string) => {
    const m = /P\(X (<|>) (\d+)\)/.exec(tex);
    expect(m, tex).not.toBeNull();
    return { above: m![1] === '>', c: Number(m![2]) };
  };

  it('answers the new probability from the quoted Phi, and close to the truth', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-new-prob')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { mu, sigma, table } = solvedFrom(promptText(slide));
      const { above, c } = eventOf(slide.lead!);
      const z = (c - mu) / sigma;
      const below = belowFromTable(z, table);
      expect(close(Number(slide.answer), above ? 1 - below : below), `seed ${seed}`).toBe(true);
      const truth = z >= 0 ? simpsonPhi(z) : 1 - simpsonPhi(-z);
      expect(Math.abs(Number(slide.answer) - (above ? 1 - truth : truth)), `seed ${seed}`).toBeLessThan(0.0002);
    }
  });

  it('fills sigma, mu, z and the probability', () => {
    for (const { slide, seed } of draws<unknown>('dist-both-chain-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { mu, sigma, table } = solvedFrom(promptText(slide));
      const { above, c } = eventOf(slide.expression);
      const z = (c - mu) / sigma;
      const below = belowFromTable(z, table);
      const want = [sigma, mu, z, above ? 1 - below : below];
      slide.answer.forEach((value, i) => expect(close(Number(value), want[i], 1e-6), `seed ${seed}, node ${i}`).toBe(true));
    }
  });
});

/* ---------- level 4: the normal approximation ---------- */

/** B(n, p) row by row is slow at n = 900, and the same few pairs come up again and again. */
const rows = new Map<string, number[]>();
function exact(n: number, p: number): number[] {
  const key = `${n}|${p}`;
  if (!rows.has(key)) rows.set(key, distribution(n, p));
  return rows.get(key)!;
}

/** Mean, variance and third central moment, as sums over the distribution. */
function momentsOf(n: number, p: number) {
  const dist = exact(n, p);
  const mean = dist.reduce((acc, chance, r) => acc + r * chance, 0);
  const variance = dist.reduce((acc, chance, r) => acc + (r - mean) ** 2 * chance, 0);
  const third = dist.reduce((acc, chance, r) => acc + (r - mean) ** 3 * chance, 0);
  return { mean, variance, skew: third / variance ** 1.5 };
}

/** n and p, from `B(n, p)` or from a setting: the first bare number is n, the first `$0.x$` is p. */
function binomialFrom(text: string): { n: number; p: number } {
  const symbols = /B\((\d+), (0\.\d+)\)/.exec(text);
  if (symbols) return { n: Number(symbols[1]), p: Number(symbols[2]) };
  const n = /\b(\d+)\b/.exec(text.replace(/\$[^$]*\$/g, ''));
  const p = /\$(0\.\d+)\$/.exec(text);
  expect(n && p, `no binomial in: ${text}`).toBeTruthy();
  return { n: Number(n![1]), p: Number(p![1]) };
}

/** The whole numbers an event about X takes in, read from its symbols or its words. */
function eventFrom(text: string): (k: number) => boolean {
  let m: RegExpExecArray | null;
  if ((m = /P\((\d+) \\le X \\le (\d+)\)/.exec(text)) || (m = /\$X\$ is between \$(\d+)\$ and \$(\d+)\$ inclusive/.exec(text))) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return (k) => k >= a && k <= b;
  }
  if ((m = /P\(X (\\le|<|\\ge|>|=) (\d+)\)/.exec(text))) {
    const r = Number(m[2]);
    return { '\\le': (k: number) => k <= r, '<': (k: number) => k < r, '\\ge': (k: number) => k >= r, '>': (k: number) => k > r, '=': (k: number) => k === r }[m[1]]!;
  }
  m = /\$X\$ is (at most|fewer than|at least|more than|exactly) \$(\d+)\$/.exec(text);
  expect(m, `no event in: ${text}`).not.toBeNull();
  const r = Number(m![2]);
  return {
    'at most': (k: number) => k <= r,
    'fewer than': (k: number) => k < r,
    'at least': (k: number) => k >= r,
    'more than': (k: number) => k > r,
    exactly: (k: number) => k === r,
  }[m![1]]!;
}

/** The whole numbers in 0..n an event takes in. */
const members = (n: number, inEvent: (k: number) => boolean): number[] => Array.from({ length: n + 1 }, (_, k) => k).filter(inEvent);

/** An event for Y, as `lo < Y < hi` with either end open to infinity. */
interface YEvent {
  lo: number;
  hi: number;
}

/** `P(Y < b)`, `Y > b`, `P(a < Y < b)` and the like, with or without the P( ). */
function yFrom(text: string): YEvent {
  let m: RegExpExecArray | null;
  if ((m = /(-?[\d.]+) < Y < (-?[\d.]+)/.exec(text))) return { lo: Number(m[1]), hi: Number(m[2]) };
  m = /Y (<|>) (-?[\d.]+)/.exec(text);
  expect(m, `no event for Y in: ${text}`).not.toBeNull();
  return m![1] === '<' ? { lo: -Infinity, hi: Number(m![2]) } : { lo: Number(m![2]), hi: Infinity };
}

/**
 * The continuity correction, checked from first principles: the event for Y
 * must take in exactly the whole numbers the event for X does, with every
 * finite end half way between two whole numbers, so each bar is wholly in or
 * wholly out.
 */
function corrects(y: YEvent, n: number, inEvent: (k: number) => boolean): boolean {
  const half = (b: number) => !Number.isFinite(b) || Math.abs(b - Math.floor(b) - 0.5) < 1e-9;
  if (!half(y.lo) || !half(y.hi)) return false;
  return Array.from({ length: n + 1 }, (_, k) => k).every((k) => inEvent(k) === (k > y.lo && k < y.hi));
}

/** The label of the option a choice slide marks correct, and the rest. */
function split(slide: Slide): { right: string; wrong: string[] } {
  if (slide.kind !== 'choice') throw new Error('not a choice slide');
  return {
    right: slide.options.find((o) => o.id === slide.correctId)!.label,
    wrong: slide.options.filter((o) => o.id !== slide.correctId).map((o) => o.label),
  };
}

describe('dist-approx-sum, by counting the whole numbers the event takes in', () => {
  it('starts, ends and counts where the event does', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-sum')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const text = promptText(slide);
      const { n } = binomialFrom(text);
      const ks = members(n, eventFrom(text));
      expect(slide.answer, `seed ${seed}`).toEqual([String(ks[0]), String(ks[ks.length - 1]), String(ks.length)]);
    }
  });
});

describe('dist-approx-bars, against the heights of the bars drawn', () => {
  /** Bar heights read out of the SVG, as shares of the tallest. */
  const heights = (svg: string) => {
    const hs = [...svg.matchAll(/class="plot-shade" [^>]*height="([\d.]+)"/g)].map((m) => Number(m[1]));
    const top = Math.max(...hs);
    return hs.map((h) => h / top);
  };
  const shares = (n: number, p: number) => {
    const dist = exact(n, p);
    const top = Math.max(...dist);
    return dist.map((d) => d / top);
  };
  const gap = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

  it('draws the distribution it marks right, and none of the others', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-bars')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const svg = slide.prompt.find((b) => b.kind === 'diagram');
      expect(svg, `seed ${seed}: no picture`).toBeDefined();
      const drawn = heights((svg as { svg: string }).svg);
      const { right, wrong } = split(slide);
      const { n, p } = binomialFrom(right);
      expect(drawn.length, `seed ${seed}`).toBe(n + 1);
      expect(gap(drawn, shares(n, p)), `seed ${seed}: ${right}`).toBeLessThan(0.02);
      for (const label of wrong) {
        const other = binomialFrom(label);
        expect(gap(drawn, shares(other.n, other.p)), `seed ${seed}: ${label} looks like ${right}`).toBeGreaterThan(0.15);
      }
    }
  });
});

describe('dist-approx-skew, against the skewness of the distribution', () => {
  it('calls a bell a bell and a skew the right way round', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-skew')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { n, p } = binomialFrom(promptText(slide));
      const { skew } = momentsOf(n, p);
      if (slide.answer.length === 1) {
        expect(slide.answer, `seed ${seed}`).toEqual(['Yes']);
        expect(Math.abs(skew), `seed ${seed}: B(${n}, ${p}) skew ${skew}`).toBeLessThan(0.25);
      } else {
        expect(Math.abs(skew), `seed ${seed}: B(${n}, ${p}) skew ${skew}`).toBeGreaterThan(0.3);
        // A long tail to the right is positive skew, which is p below a half.
        expect(slide.answer, `seed ${seed}`).toEqual(['No', skew > 0 ? 'Yes' : 'No']);
      }
    }
  });
});

describe('dist-approx-peak, against the mean of the distribution', () => {
  it('puts the line at the mean', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-peak')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const { n, p } = binomialFrom(promptText(slide));
      expect(close(slide.answer, momentsOf(n, p).mean, 1e-6), `seed ${seed}`).toBe(true);
    }
  });
});

/** np and n(1 - p) as sums over the distribution: the mean successes and the mean failures. */
function sides(n: number, p: number): [number, number] {
  const { mean } = momentsOf(n, p);
  return [mean, n - mean];
}

/** Whether both clear 5, allowing for float dust in the sums. */
const clears = (n: number, p: number) => sides(n, p).every((v) => v > 5 + 1e-6);

describe('when the approximation is allowed, from the mean successes and failures', () => {
  it('walks dist-approx-valid to the right verdict', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-valid')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { n, p } = binomialFrom(promptText(slide));
      const [np, nq] = sides(n, p);
      const want = np > 5 + 1e-6 ? ['Yes', nq > 5 + 1e-6 ? 'Yes' : 'No'] : ['No'];
      expect(slide.answer, `seed ${seed}: B(${n}, ${p})`).toEqual(want);
    }
  });

  it('fills dist-approx-products with np, n(1 - p) and the verdict', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-products')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const { n, p } = binomialFrom(promptText(slide));
      const [np, nq] = sides(n, p);
      expect(close(Number(slide.answer[0]), np, 1e-6) && close(Number(slide.answer[1]), nq, 1e-6), `seed ${seed}`).toBe(true);
      expect(slide.answer[2], `seed ${seed}`).toBe(clears(n, p) ? '\\text{yes}' : '\\text{no}');
    }
  });

  it('marks right the one distribution in dist-approx-which-valid that clears both', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-which-valid')) {
      const { right, wrong } = split(slide);
      const good = binomialFrom(right);
      expect(clears(good.n, good.p), `seed ${seed}: ${right}`).toBe(true);
      for (const label of wrong) {
        const bad = binomialFrom(label);
        expect(clears(bad.n, bad.p), `seed ${seed}: ${label}`).toBe(false);
      }
    }
  });

  it('slides dist-approx-min-n to the first n that clears both, counting up', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-min-n')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const hundredths = Math.round(Number(/B\(n, (0\.\d+)\)/.exec(promptText(slide))![1]) * 100);
      let n = 1;
      while (!(n * hundredths > 500 && n * (100 - hundredths) > 500)) n += 1;
      expect(slide.answer, `seed ${seed}: p = ${hundredths / 100}`).toBe(n);
    }
  });
});

describe('the matching normal, from sums over the distribution', () => {
  /** Mean, variance and sigma, checking the variance is a whole square. */
  const matching = (n: number, p: number, seed: number) => {
    const { mean, variance } = momentsOf(n, p);
    const sigma = Math.round(Math.sqrt(variance));
    expect(close(sigma * sigma, variance, 1e-6), `seed ${seed}: B(${n}, ${p}) has variance ${variance}`).toBe(true);
    return { mean, variance, sigma };
  };

  it('finds the mean, variance or sigma dist-approx-param asks for', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-param')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { n, p } = binomialFrom(promptText(slide));
      const { mean, variance, sigma } = matching(n, p, seed);
      const want = slide.lead === '\\mu =' ? mean : slide.lead === '\\sigma^2 =' ? variance : sigma;
      expect(close(Number(slide.answer), want, 1e-6), `seed ${seed}: ${slide.lead}`).toBe(true);
    }
  });

  it('marks right N(mean, variance) in dist-approx-normal', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-normal')) {
      const { n, p } = binomialFrom(promptText(slide));
      const { mean, variance } = matching(n, p, seed);
      const m = /N\(([\d.]+), ([\d.]+)\)/.exec(split(slide).right)!;
      expect(close(Number(m[1]), mean, 1e-6) && close(Number(m[2]), variance, 1e-6), `seed ${seed}`).toBe(true);
    }
  });

  it('builds dist-approx-build and dist-approx-moments-tree from the mean, variance and sigma', () => {
    for (const id of ['dist-approx-build', 'dist-approx-moments-tree']) {
      for (const { slide, seed } of draws<unknown>(id)) {
        if (slide.kind !== 'tiles' && slide.kind !== 'tree') throw new Error('not a tiles or tree slide');
        const { n, p } = binomialFrom(promptText(slide));
        const { mean, variance, sigma } = matching(n, p, seed);
        expect(slide.answer.map(Number), `${id} seed ${seed}`).toEqual([mean, variance, sigma].map((v) => Number(v.toFixed(6))));
      }
    }
  });
});

describe('the continuity correction, bar by bar', () => {
  it('marks right in dist-cc-choice the one event for Y that takes in the same bars', () => {
    for (const { slide, seed } of draws<unknown>('dist-cc-choice')) {
      const text = promptText(slide);
      const { n } = binomialFrom(text);
      const inEvent = eventFrom(text);
      const { right, wrong } = split(slide);
      expect(corrects(yFrom(right), n, inEvent), `seed ${seed}: ${right}`).toBe(true);
      for (const label of wrong) expect(corrects(yFrom(label), n, inEvent), `seed ${seed}: ${label}`).toBe(false);
    }
  });

  it('walks dist-cc-flow through the whole numbers, then the corrected event', () => {
    for (const { slide, seed } of draws<unknown>('dist-cc-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const text = promptText(slide);
      const { n } = binomialFrom(text);
      const inEvent = eventFrom(text);
      const m = /X (\\le|\\ge) (\d+)/.exec(slide.answer[0])!;
      const k = Number(m[2]);
      const stated = (j: number) => (m[1] === '\\le' ? j <= k : j >= k);
      expect(members(n, stated), `seed ${seed}: ${slide.answer[0]}`).toEqual(members(n, inEvent));
      expect(corrects(yFrom(slide.answer[1]), n, inEvent), `seed ${seed}: ${slide.answer[1]}`).toBe(true);
    }
  });

  it('shades in dist-cc-line the corrected event, with open ends', () => {
    for (const { slide, seed } of draws<unknown>('dist-cc-line')) {
      if (slide.kind !== 'numberLine') throw new Error('not a number line slide');
      const text = promptText(slide);
      const { n } = binomialFrom(text);
      const m = /^\((-inf|[\d.]+),(inf|[\d.]+)\)$/.exec(slide.answer);
      expect(m, `seed ${seed}: ${slide.answer} is not one open piece`).not.toBeNull();
      const y = { lo: m![1] === '-inf' ? -Infinity : Number(m![1]), hi: m![2] === 'inf' ? Infinity : Number(m![2]) };
      expect(corrects(y, n, eventFrom(text)), `seed ${seed}: ${slide.answer}`).toBe(true);
    }
  });

  it('gives in dist-cc-boundary the end of the bars the event takes in', () => {
    for (const { slide, seed } of draws<unknown>('dist-cc-boundary')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const { n } = binomialFrom(text);
      const ks = members(n, eventFrom(text));
      const shape = /approximated by \$P\((a < Y < b|Y < b|Y > b)\)\$/.exec(text)![1];
      const lower = shape === 'Y > b' || (shape === 'a < Y < b' && slide.lead === 'a =');
      const want = lower ? ks[0] - 0.5 : ks[ks.length - 1] + 0.5;
      expect(Number(slide.answer), `seed ${seed}: ${shape}`).toBe(want);
    }
  });
});

/**
 * How far a corrected normal approximation may sit from the exact binomial
 * sum. Every pair here has np and n(1 - p) at 9 or more, and the worst draw
 * over these seeds is off by about 0.012.
 */
const APPROXIMATION = 0.015;

describe('the whole route, against the exact binomial sum', () => {
  /**
   * Everything a route question should come to, worked from the prompt:
   * n and p, the matching normal from sums over the distribution, the
   * corrected ends from the bars the event takes in, z at each end, and the
   * probability read from the quoted Phi values alone. Every quoted Phi is
   * checked against Simpson on the way.
   */
  function route(text: string, seed: number) {
    const { n, p } = binomialFrom(text);
    const { mean, variance } = momentsOf(n, p);
    const sigma = Math.sqrt(variance);
    const inEvent = eventFrom(text);
    const ks = members(n, inEvent);
    const lo = ks[0] > 0 ? ks[0] - 0.5 : -Infinity;
    const hi = ks[ks.length - 1] < n ? ks[ks.length - 1] + 0.5 : Infinity;
    const table = quotedPhis(text);
    for (const [z, value] of table) expect(value, `seed ${seed}: Phi(${z})`).toBe(Number(simpsonPhi(z).toFixed(4)));
    const zOf = (b: number) => (b - mean) / sigma;
    const upTo = (b: number) => (Number.isFinite(b) ? belowFromTable(zOf(b), table) : 1);
    // Only a question that asks for the probability quotes Phi.
    const fromTable = table.length === 0 ? NaN : upTo(hi) - (Number.isFinite(lo) ? upTo(lo) : 0);
    const truth = ks.reduce((acc, k) => acc + exact(n, p)[k], 0);
    return { mean, sigma, lo, hi, zOf, fromTable, truth };
  }

  it('answers dist-approx-prob from the quoted Phi, within reach of the exact sum', () => {
    let worst = 0;
    for (const { slide, seed } of draws<unknown>('dist-approx-prob')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { fromTable, truth } = route(promptText(slide), seed);
      expect(close(Number(slide.answer), fromTable), `seed ${seed}`).toBe(true);
      worst = Math.max(worst, Math.abs(fromTable - truth));
      expect(Math.abs(fromTable - truth), `seed ${seed}: approximation ${fromTable}, exact ${truth}`).toBeLessThan(APPROXIMATION);
    }
    expect(worst).toBeGreaterThan(0);
  });

  it('fills dist-approx-route-tree with the corrected end, its z and the probability', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-route-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { lo, hi, zOf, fromTable, truth } = route(promptText(slide), seed);
      const b = Number.isFinite(lo) ? lo : hi;
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([b, Number(zOf(b).toFixed(6)), Number(fromTable.toFixed(6))]);
      expect(Math.abs(fromTable - truth), `seed ${seed}`).toBeLessThan(APPROXIMATION);
    }
  });

  it('corrects then standardises in dist-approx-standardise-steps', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-standardise-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const { lo, hi, zOf } = route(promptText(slide), seed);
      const b = Number.isFinite(lo) ? lo : hi;
      expect(Number(slide.reductions[0].value), `seed ${seed}`).toBe(b);
      expect(close(Number(slide.reductions[slide.reductions.length - 1].value), zOf(b)), `seed ${seed}`).toBe(true);
    }
  });

  it('plans dist-approx-plan through the matching normal, the correction and the right side of Phi', () => {
    for (const { slide, seed } of draws<unknown>('dist-approx-plan')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const text = promptText(slide);
      const { n } = binomialFrom(text);
      const { mean, sigma, zOf } = route(text, seed);
      const normal = /N\(([\d.]+), ([\d.]+)\)/.exec(slide.answer[0])!;
      expect([Number(normal[1]), Number(normal[2])], `seed ${seed}`).toEqual([mean, sigma * sigma].map((v) => Number(v.toFixed(6))));
      const y = yFrom(slide.answer[1]);
      expect(corrects(y, n, eventFrom(text)), `seed ${seed}: ${slide.answer[1]}`).toBe(true);
      // Which form is right, from the area itself rather than any rule about signs.
      const b = Number.isFinite(y.lo) ? y.lo : y.hi;
      const z = zOf(b);
      const area = Number.isFinite(y.lo) ? 1 - (z >= 0 ? simpsonPhi(z) : 1 - simpsonPhi(-z)) : z >= 0 ? simpsonPhi(z) : 1 - simpsonPhi(-z);
      const u = simpsonPhi(Math.abs(z));
      const form = slide.answer[2].startsWith('$1 - ') ? 1 - u : u;
      expect(close(form, area, 1e-6), `seed ${seed}: ${slide.answer[2]} for ${slide.answer[1]}`).toBe(true);
    }
  });
});

/* ---------- level 5: sums and differences of independent normals ---------- */

/** Mean and variance of every `L \sim N(m, v)` a prompt states, by letter. */
function normalsFrom(text: string): Record<string, { mean: number; variance: number }> {
  const out: Record<string, { mean: number; variance: number }> = {};
  for (const m of text.matchAll(/([A-Z]) \\sim N\((-?[\d.]+), ([\d.]+)\)/g)) {
    out[m[1]] ??= { mean: Number(m[2]), variance: Number(m[3]) };
  }
  return out;
}

/** The coefficients of `W = aX + bY + c` as the prompt writes it, read term by term. */
function combinationFrom(text: string): { a: number; b: number; c: number } {
  const m = /\$W = ([^$]+)\$/.exec(text);
  expect(m, `no W in: ${text}`).not.toBeNull();
  const out = { a: 0, b: 0, c: 0 };
  for (const [, sign, digits, letter] of m![1].replace(/\s/g, '').matchAll(/([+-]?)(\d*)([XY]?)/g)) {
    if (!digits && !letter) continue;
    const k = (sign === '-' ? -1 : 1) * (digits ? Number(digits) : 1);
    if (letter === 'X') out.a += k;
    else if (letter === 'Y') out.b += k;
    else out.c += k;
  }
  return out;
}

/**
 * E, Var and sigma of W worked from the prompt alone: the coefficients read
 * from `W = ...`, each distribution read from its `N(m, v)`, and the rules
 * E(aX + bY + c) = aE(X) + bE(Y) + c and Var = a^2 Var(X) + b^2 Var(Y).
 */
function momentsFromPrompt(text: string) {
  const normals = normalsFrom(text);
  const { a, b, c } = combinationFrom(text);
  const x = normals.X;
  const y = normals.Y ?? { mean: 0, variance: 0 };
  expect(x, `no X in: ${text}`).toBeDefined();
  if (b !== 0) expect(normals.Y, `no Y in: ${text}`).toBeDefined();
  const mean = a * x.mean + b * y.mean + c;
  const variance = a * a * x.variance + b * b * y.variance;
  return { a, b, c, x, y, mean, variance, sd: Math.sqrt(variance) };
}

/** Which moment an expression slide's lead asks for. */
function askedFrom(lead: string): 'mean' | 'var' | 'sd' {
  if (lead.startsWith('\\mathrm{E}')) return 'mean';
  if (lead.startsWith('\\mathrm{Var}')) return 'var';
  expect(lead.startsWith('\\sigma')).toBe(true);
  return 'sd';
}

/** The distribution a correct option names, as numbers. */
function correctNormal(slide: Slide): { mean: number; variance: number } {
  if (slide.kind !== 'choice') throw new Error('not a choice slide');
  const label = slide.options.find((o) => o.id === slide.correctId)!.label;
  const m = /N\((-?[\d.]+), ([\d.]+)\)/.exec(label)!;
  return { mean: Number(m[1]), variance: Number(m[2]) };
}

/** The last number after `=` in a flow label: what that route comes to. */
const labelValue = (label: string): number => Number(/= (-?[\d.]+)\$/.exec(label)?.[1] ?? /\$(-?[\d.]+)\$/.exec(label)![1]);

describe('level 5 lesson 1: aX + b, from the prompt alone', () => {
  const ids = ['dist-lin-moment', 'dist-lin-normal', 'dist-lin-spread-tree', 'dist-lin-effect-flow'];

  it('writes every variance as a perfect square, so sigma is whole', () => {
    for (const id of ids) {
      for (const { slide, seed } of draws<unknown>(id)) {
        const { variance, b } = momentsFromPrompt(promptText(slide));
        expect(b, `${id} seed ${seed}`).toBe(0);
        expect(Number.isInteger(Math.sqrt(variance)), `${id} seed ${seed}`).toBe(true);
      }
    }
  });

  it('gives E, Var or sigma of aX + b in dist-lin-moment', () => {
    for (const { slide, seed } of draws<unknown>('dist-lin-moment')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const moments = momentsFromPrompt(promptText(slide));
      const want = { mean: moments.mean, var: moments.variance, sd: moments.sd }[askedFrom(slide.lead!)];
      expect(Number(slide.answer), `seed ${seed}`).toBe(want);
    }
  });

  it('names N(aE(X) + b, a^2 Var(X)) in dist-lin-normal, and only there', () => {
    for (const { slide, seed } of draws<unknown>('dist-lin-normal')) {
      const { mean, variance } = momentsFromPrompt(promptText(slide));
      expect(correctNormal(slide), `seed ${seed}`).toEqual({ mean, variance });
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const matching = slide.options.filter((o) => o.label.endsWith(`N(${mean}, ${variance})`));
      expect(matching.length, `seed ${seed}`).toBe(1);
    }
  });

  it('fills dist-lin-spread-tree with a^2, the variance and |a| sigma', () => {
    for (const { slide, seed } of draws<unknown>('dist-lin-spread-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { a, x, variance, sd } = momentsFromPrompt(promptText(slide));
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([a * a, variance, sd]);
      expect(sd, `seed ${seed}`).toBe(Math.abs(a) * Math.sqrt(x.variance));
    }
  });

  it('walks dist-lin-effect-flow to the right mean, variance and sigma', () => {
    for (const { slide, seed } of draws<unknown>('dist-lin-effect-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { mean, variance, sd } = momentsFromPrompt(promptText(slide));
      expect(slide.answer.map(labelValue), `seed ${seed}`).toEqual([mean, variance, sd]);
    }
  });
});

describe('level 5 lesson 2: X + Y and X - Y, from the prompt alone', () => {
  it('gives E, Var or sigma of X + Y or X - Y in dist-sum-moment', () => {
    for (const { slide, seed } of draws<unknown>('dist-sum-moment')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const moments = momentsFromPrompt(promptText(slide));
      expect([moments.a, Math.abs(moments.b), moments.c], `seed ${seed}`).toEqual([1, 1, 0]);
      const want = { mean: moments.mean, var: moments.variance, sd: moments.sd }[askedFrom(slide.lead!)];
      expect(Number(slide.answer), `seed ${seed}`).toBe(want);
    }
  });

  it('adds the variances in dist-sum-normal even for a difference', () => {
    for (const { slide, seed } of draws<unknown>('dist-sum-normal')) {
      const { x, y, mean, variance } = momentsFromPrompt(promptText(slide));
      expect(correctNormal(slide), `seed ${seed}`).toEqual({ mean, variance });
      expect(variance, `seed ${seed}`).toBe(x.variance + y.variance);
    }
  });

  it('builds Var(X) + Var(Y) and sigma in dist-sum-var-tiles', () => {
    for (const { slide, seed } of draws<unknown>('dist-sum-var-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const { x, y, variance, sd } = momentsFromPrompt(promptText(slide));
      expect(slide.answer, `seed ${seed}`).toEqual([String(x.variance), '+', String(y.variance), String(variance), String(sd)]);
      expect(Number.isInteger(sd), `seed ${seed}`).toBe(true);
    }
  });

  it('fills each row of dist-sum-table from the combination its label names', () => {
    for (const { slide, seed } of draws<unknown>('dist-sum-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const { X, Y } = normalsFrom(promptText(slide));
      slide.rows.forEach((row, i) => {
        const m = /^([XY]) ([+-]) ([XY])$/.exec(row[0]!)!;
        const first = m[1] === 'X' ? X : Y;
        const second = m[3] === 'X' ? X : Y;
        const mean = m[2] === '+' ? first.mean + second.mean : first.mean - second.mean;
        expect(slide.answer.slice(2 * i, 2 * i + 2).map(Number), `seed ${seed}: ${row[0]}`).toEqual([mean, X.variance + Y.variance]);
      });
    }
  });
});

describe('level 5 lesson 3: aX + bY, from the prompt alone', () => {
  it('gives E, Var or sigma of aX + bY + c in dist-combo-moment', () => {
    for (const { slide, seed } of draws<unknown>('dist-combo-moment')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const moments = momentsFromPrompt(promptText(slide));
      expect(Number.isInteger(moments.sd), `seed ${seed}`).toBe(true);
      const want = { mean: moments.mean, var: moments.variance, sd: moments.sd }[askedFrom(slide.lead!)];
      expect(Number(slide.answer), `seed ${seed}`).toBe(want);
    }
  });

  it('names N(E, Var) in dist-combo-normal, and only there', () => {
    for (const { slide, seed } of draws<unknown>('dist-combo-normal')) {
      const { mean, variance } = momentsFromPrompt(promptText(slide));
      expect(correctNormal(slide), `seed ${seed}`).toEqual({ mean, variance });
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      expect(slide.options.filter((o) => o.label.endsWith(`N(${mean}, ${variance})`)).length, `seed ${seed}`).toBe(1);
    }
  });

  it('reduces a^2 Var(X) + b^2 Var(Y) step by step in dist-combo-var-steps', () => {
    for (const { slide, seed } of draws<unknown>('dist-combo-var-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const { a, b, x, y, variance } = momentsFromPrompt(promptText(slide));
      expect(slide.reductions.map((r) => Number(r.value)), `seed ${seed}`).toEqual([a * a * x.variance, b * b * y.variance, variance]);
    }
  });

  it('builds W ~ N(E, Var) and sigma in dist-combo-build', () => {
    for (const { slide, seed } of draws<unknown>('dist-combo-build')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const { mean, variance, sd } = momentsFromPrompt(promptText(slide));
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([mean, variance, sd]);
    }
  });
});

describe('level 5 lesson 4: a total of n copies against one copy times n', () => {
  /** n and whether the quantity is one copy scaled, from the definition the prompt writes. */
  function totalFrom(text: string) {
    const copies = /X_1 \+ X_2 \+ \\dots \+ X_\{(\d+)\}/.exec(text);
    const scaled = /S = (\d+)X/.exec(text);
    const m = /N\((-?[\d.]+), ([\d.]+)\)/.exec(text)!;
    return { copies: copies && Number(copies[1]), scaled: scaled && Number(scaled[1]), mean: Number(m[1]), variance: Number(m[2]) };
  }

  /** A total of n adds n variances; one copy times n multiplies its variance by n^2. */
  const momentsOf = (n: number, scaled: boolean, mean: number, variance: number) => {
    const v = (scaled ? n * n : n) * variance;
    return { mean: n * mean, var: v, sd: Math.sqrt(v) };
  };

  it('gives E, Var or sigma of the total or the scaled copy in dist-total-moment', () => {
    for (const { slide, seed } of draws<unknown>('dist-total-moment')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const t = totalFrom(promptText(slide));
      const scaled = t.scaled !== null;
      const moments = momentsOf((t.scaled ?? t.copies)!, scaled, t.mean, t.variance);
      expect(Number.isInteger(moments.sd), `seed ${seed}`).toBe(true);
      expect(Number(slide.answer), `seed ${seed}`).toBe(moments[askedFrom(slide.lead!)]);
    }
  });

  it('names the right normal in dist-total-normal', () => {
    for (const { slide, seed } of draws<unknown>('dist-total-normal')) {
      const t = totalFrom(promptText(slide));
      const moments = momentsOf((t.scaled ?? t.copies)!, t.scaled !== null, t.mean, t.variance);
      expect(correctNormal(slide), `seed ${seed}`).toEqual({ mean: moments.mean, variance: moments.var });
    }
  });

  it('fills dist-total-table with both variances and both sigmas', () => {
    for (const { slide, seed } of draws<unknown>('dist-total-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const t = totalFrom(promptText(slide));
      expect(t.copies, `seed ${seed}`).toBe(t.scaled);
      const total = momentsOf(t.copies!, false, t.mean, t.variance);
      const scaled = momentsOf(t.copies!, true, t.mean, t.variance);
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([total.var, total.sd, scaled.var, scaled.sd]);
    }
  });

  it('routes dist-total-flow by whether one value was measured once', () => {
    for (const { slide, seed } of draws<unknown>('dist-total-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const text = promptText(slide);
      const scaled = /\bonce\b/.test(text);
      const n = Number(/\b(\d+)\b/.exec(text.replace(/\$[^$]*\$/g, ''))![1]);
      const { mean, variance } = normalsFrom(text).X;
      const moments = momentsOf(n, scaled, mean, variance);
      expect(slide.answer[0].includes(scaled ? `$${n}X$` : `X_{${n}}`), `seed ${seed}: ${slide.answer[0]}`).toBe(true);
      expect(labelValue(slide.answer[1]), `seed ${seed}`).toBe(moments.var);
      if (slide.answer.length > 2) expect(labelValue(slide.answer[2]), `seed ${seed}`).toBe(moments.sd);
    }
  });
});

describe('level 5 lesson 5: a probability from the combination', () => {
  /** P(Z < z) the true way, by Simpson. */
  const trueBelow = (t: number) => (t >= 0 ? simpsonPhi(t) : 1 - simpsonPhi(-t));

  /** Check every quoted Phi against Simpson, then read P(W < k) or P(W > k) from the quotes. */
  function fromQuotes(text: string, z: number, op: string, seed: number) {
    const table = quotedPhis(text);
    for (const [at, value] of table) expect(value, `seed ${seed}: Phi(${at})`).toBe(Number(simpsonPhi(at).toFixed(4)));
    const fromTable = op === '<' ? belowFromTable(z, table) : 1 - belowFromTable(z, table);
    const truth = op === '<' ? trueBelow(z) : 1 - trueBelow(z);
    return { fromTable, truth };
  }

  it('answers dist-combo-prob from its own standardising and the quoted Phi', () => {
    for (const { slide, seed } of draws<unknown>('dist-combo-prob')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const { mean, sd } = momentsFromPrompt(text);
      expect(Number.isInteger(sd), `seed ${seed}`).toBe(true);
      const [, op, k] = /^P\(W ([<>]) (-?[\d.]+)\)/.exec(slide.lead!)!;
      const { fromTable, truth } = fromQuotes(text, (Number(k) - mean) / sd, op, seed);
      expect(close(Number(slide.answer), fromTable), `seed ${seed}`).toBe(true);
      expect(Math.abs(Number(slide.answer) - truth), `seed ${seed}`).toBeLessThan(0.001);
    }
  });

  /** D = X - Y from the two stated normals; P(X > Y) is P(D > 0). */
  function difference(text: string) {
    const { X, Y } = normalsFrom(text);
    const mean = X.mean - Y.mean;
    const sd = Math.sqrt(X.variance + Y.variance);
    const [, op] = /P\(X ([<>]) Y\)/.exec(text)!;
    return { mean, sd, op, z: (0 - mean) / sd, variance: X.variance + Y.variance };
  }

  it('answers dist-bigger-prob as P(D > 0) or P(D < 0) for D = X - Y', () => {
    for (const { slide, seed } of draws<unknown>('dist-bigger-prob')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const { sd, op, z } = difference(`${text} ${slide.lead}`);
      expect(Number.isInteger(sd), `seed ${seed}`).toBe(true);
      const { fromTable, truth } = fromQuotes(text, z, op, seed);
      expect(close(Number(slide.answer), fromTable), `seed ${seed}`).toBe(true);
      expect(Math.abs(Number(slide.answer) - truth), `seed ${seed}`).toBeLessThan(0.001);
    }
  });

  it('fills dist-diff-route-tree with E(D), sigma of D, the z of 0 and the probability', () => {
    for (const { slide, seed } of draws<unknown>('dist-diff-route-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const text = promptText(slide);
      const { mean, sd, op, z } = difference(text);
      const { fromTable, truth } = fromQuotes(text, z, op, seed);
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([mean, sd, Number(z.toFixed(6)), Number(fromTable.toFixed(6))]);
      expect(Math.abs(fromTable - truth), `seed ${seed}`).toBeLessThan(0.001);
    }
  });

  it('plans dist-diff-plan through N(E(D), Var(X) + Var(Y)), the event and the right side of Phi', () => {
    for (const { slide, seed } of draws<unknown>('dist-diff-plan')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const text = promptText(slide);
      const { mean, variance, op, z } = difference(text);
      const normal = /N\((-?[\d.]+), ([\d.]+)\)/.exec(slide.answer[0])!;
      expect([Number(normal[1]), Number(normal[2])], `seed ${seed}`).toEqual([mean, variance]);
      expect(slide.answer[1], `seed ${seed}`).toBe(`$D ${op} 0$`);
      // Which form is right, from the area itself rather than any rule about signs.
      const area = op === '<' ? trueBelow(z) : 1 - trueBelow(z);
      const u = simpsonPhi(Math.abs(z));
      const form = slide.answer[2].startsWith('$1 - ') ? 1 - u : u;
      expect(close(form, area, 1e-6), `seed ${seed}: ${slide.answer[2]}`).toBe(true);
    }
  });
});

/* ---------- level 6: the distribution of the sample mean ---------- */

/**
 * mu and sigma of X and the sample size n, read from the prompt, and the
 * moments of the mean worked out here: E(Xbar) = mu, Var(Xbar) = sigma^2 / n,
 * sigma_Xbar = sigma / sqrt(n).
 */
function sampleFrom(text: string) {
  const { mu, sigma } = normalFrom(text);
  const m = /sample of \$(\d+)\$/.exec(text);
  expect(m, `no sample size in: ${text}`).not.toBeNull();
  const n = Number(m![1]);
  return { mu, sigma, n, variance: (sigma * sigma) / n, se: sigma / Math.sqrt(n) };
}

/** P(Z < z) the true way, by Simpson. */
const simpsonBelow = (t: number) => (t >= 0 ? simpsonPhi(t) : 1 - simpsonPhi(-t));

/** The percentage-point table a prompt quotes, as Phi to z, each held to Simpson. */
function percentagePoints(text: string): Map<number, number> {
  const rows = [...text.matchAll(/(0\.\d+) & (\d\.\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
  expect(rows.length, `no percentage points in: ${text}`).toBe(4);
  for (const [p, z] of rows) expect(Math.abs(simpsonPhi(z) - p), `z = ${z}`).toBeLessThan(0.0005);
  return new Map(rows);
}

describe('level 6 lesson 1: a total divided by n, from the prompt alone', () => {
  it('gives E, Var or sigma of the sample mean in dist-mean-moment', () => {
    for (const { slide, seed } of draws<unknown>('dist-mean-moment')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { mu, variance, se } = sampleFrom(promptText(slide));
      expect(Number.isInteger(se), `seed ${seed}`).toBe(true);
      expect(Number(slide.answer), `seed ${seed}`).toBe({ mean: mu, var: variance, sd: se }[askedFrom(slide.lead!)]);
    }
  });

  it('fills dist-mean-from-total-tree with the total, then the total over n', () => {
    for (const { slide, seed } of draws<unknown>('dist-mean-from-total-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { mu, sigma, n } = sampleFrom(promptText(slide));
      const [eT, vT] = [n * mu, n * sigma * sigma];
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([eT, vT, eT / n, vT / (n * n)]);
    }
  });

  it('fills each row of dist-mean-table from the quantity its label names', () => {
    for (const { slide, seed } of draws<unknown>('dist-mean-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const { mu, sigma, n, variance, se } = sampleFrom(promptText(slide));
      const width = slide.columns.length - 1;
      const want: Record<string, number[]> = {
        T: [n * mu, n * sigma * sigma, Math.sqrt(n) * sigma],
        '\\bar{X}': [mu, variance, se],
      };
      slide.rows.forEach((row, i) => {
        expect(slide.answer.slice(width * i, width * (i + 1)).map(Number), `seed ${seed}: ${row[0]}`).toEqual(want[row[0]!].slice(0, width));
      });
    }
  });

  it('walks dist-mean-scale-flow from Var(T) through 1/n^2 to Var and sigma of the mean', () => {
    for (const { slide, seed } of draws<unknown>('dist-mean-scale-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { sigma, n, variance, se } = sampleFrom(promptText(slide));
      expect(labelValue(slide.answer[0]), `seed ${seed}`).toBe(n * sigma * sigma);
      expect(slide.answer[1], `seed ${seed}`).toBe(`$\\frac{1}{${n}^2}$`);
      expect(labelValue(slide.answer[2]), `seed ${seed}`).toBe(variance);
      if (slide.answer.length > 3) expect(labelValue(slide.answer[3]), `seed ${seed}`).toBe(se);
    }
  });
});

describe('level 6 lesson 2: the mean is N(mu, sigma^2 / n), from the prompt alone', () => {
  it('names N(mu, sigma^2 / n) in dist-xbar-normal, and only there', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-normal')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const { mu, variance } = sampleFrom(promptText(slide));
      expect(correctNormal(slide), `seed ${seed}`).toEqual({ mean: mu, variance });
      expect(slide.options.filter((o) => o.label.endsWith(`N(${mu}, ${variance})`)).length, `seed ${seed}`).toBe(1);
    }
  });

  it('builds the normal and sigma / sqrt(n) in dist-xbar-build', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-build')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const { mu, variance, se } = sampleFrom(promptText(slide));
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([mu, variance, se]);
    }
  });

  it('gives sigma / sqrt(n) in dist-xbar-sd, or sigma back from the mean', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-sd')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      if (slide.lead === '\\sigma =') {
        const m = /\\bar\{X\} \\sim N\((\d+), (\d+)\)/.exec(text)!;
        const n = Number(/sample of \$(\d+)\$/.exec(text)![1]);
        expect(Number(slide.answer), `seed ${seed}`).toBe(Math.sqrt(Number(m[2]) * n));
      } else {
        expect(slide.lead, `seed ${seed}`).toBe('\\sigma_{\\bar{X}} =');
        expect(Number(slide.answer), `seed ${seed}`).toBe(sampleFrom(text).se);
      }
    }
  });

  it('walks dist-xbar-slip-flow to the variance, sigma / sqrt(n) and the normal', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-slip-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { mu, variance, se } = sampleFrom(promptText(slide));
      expect(labelValue(slide.answer[0]), `seed ${seed}`).toBe(variance);
      expect(labelValue(slide.answer[1]), `seed ${seed}`).toBe(se);
      expect(slide.answer[2], `seed ${seed}`).toBe(`$N(${mu}, ${variance})$`);
    }
  });
});

describe('level 6 lesson 3: how the spread shrinks with n', () => {
  it('fills dist-shrink-table with sigma / sqrt(n) for the n on each row', () => {
    for (const { slide, seed } of draws<unknown>('dist-shrink-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const { sigma } = normalFrom(promptText(slide));
      const withVar = slide.columns.length === 3;
      const want = slide.rows.flatMap((row) => {
        const n = Number(row[0]);
        return withVar ? [(sigma * sigma) / n, sigma / Math.sqrt(n)] : [sigma / Math.sqrt(n)];
      });
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual(want);
      // The rows fall: a bigger sample never has the wider mean.
      const sds = want.filter((_, i) => !withVar || i % 2 === 1);
      expect([...sds].sort((a, b) => b - a), `seed ${seed}`).toEqual(sds);
    }
  });

  it('marks the factor sigma_Xbar really changes by in dist-shrink-factor', () => {
    for (const { slide, seed } of draws<unknown>('dist-shrink-factor')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const text = promptText(slide);
      const n1 = Number(/sample of \$(\d+)\$/.exec(text)![1]);
      const n2 = Number(/changed to \$(\d+)\$/.exec(text)![1]);
      const ratio = Math.sqrt(n1) / Math.sqrt(n2);
      const label = slide.options.find((o) => o.id === slide.correctId)!.label;
      const m = /(divided|multiplied) by \} (?:\\sqrt\{(\d+)\}|(\d+))/.exec(label)!;
      const size = m[2] ? Math.sqrt(Number(m[2])) : Number(m[3]);
      expect(close(m[1] === 'divided' ? 1 / size : size, ratio), `seed ${seed}: ${label}`).toBe(true);
    }
  });

  it('puts the n of dist-shrink-n back: it meets the target and one fewer does not', () => {
    for (const { slide, seed } of draws<unknown>('dist-shrink-n')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = promptText(slide);
      const { sigma } = normalFrom(text);
      const n = Number(slide.answer);
      const byVar = /\\mathrm\{Var\}\(\\bar\{X\}\) \\le (\d+)/.exec(text);
      // In squares, so no square root decides a boundary: sigma^2 / n <= w, or sigma^2 / n <= t^2.
      const limit = byVar ? Number(byVar[1]) : Number(/at most \$(\d+)\$/.exec(text)![1]) ** 2;
      expect(sigma * sigma <= limit * n, `seed ${seed}: n = ${n}`).toBe(true);
      expect(sigma * sigma > limit * (n - 1), `seed ${seed}: n - 1 = ${n - 1} also works`).toBe(true);
    }
  });

  it('walks dist-shrink-flow to k^2 times the sample and the spread it gives', () => {
    for (const { slide, seed } of draws<unknown>('dist-shrink-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const text = promptText(slide);
      const { sigma } = normalFrom(text);
      const n1 = Number(/sample of \$(\d+)\$/.exec(text)![1]);
      const target = Number(/cut to \$(\d+)\$/.exec(text)![1]);
      const k = sigma / Math.sqrt(n1) / target;
      expect(labelValue(slide.answer[0]), `seed ${seed}`).toBe(k * k);
      const n2 = labelValue(slide.answer[1]);
      expect(n2, `seed ${seed}`).toBe(n1 * k * k);
      expect(sigma / Math.sqrt(n2), `seed ${seed}`).toBe(target);
      expect(labelValue(slide.answer[2]), `seed ${seed}`).toBe(target);
    }
  });
});

describe('level 6 lesson 4: a probability for a sample mean', () => {
  /** P(Z < z) read from the quotes, each quote held to Simpson first. */
  function tableBelow(text: string, z: number, seed: number): number {
    const table = quotedPhis(text);
    for (const [at, value] of table) expect(value, `seed ${seed}: Phi(${at})`).toBe(Number(simpsonPhi(at).toFixed(4)));
    return belowFromTable(z, table);
  }

  /** P(Xbar < k), P(Xbar > k) or P(a < Xbar < b) from an event, the quotes and Simpson. */
  function probabilityOf(text: string, event: string, seed: number) {
    const { mu, se } = sampleFrom(text);
    const z = (x: string) => (Number(x) - mu) / se;
    let m = /^P\(\\bar\{X\} ([<>]) (\d+)\)/.exec(event);
    if (m) {
      const lower = tableBelow(text, z(m[2]), seed);
      const truth = simpsonBelow(z(m[2]));
      return m[1] === '<' ? { fromTable: lower, truth } : { fromTable: 1 - lower, truth: 1 - truth };
    }
    m = /^P\((\d+) < \\bar\{X\} < (\d+)\)/.exec(event);
    expect(m, event).not.toBeNull();
    return {
      fromTable: tableBelow(text, z(m![2]), seed) - tableBelow(text, z(m![1]), seed),
      truth: simpsonBelow(z(m![2])) - simpsonBelow(z(m![1])),
    };
  }

  it('answers dist-xbar-prob by standardising with sigma / sqrt(n)', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-prob')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const { fromTable, truth } = probabilityOf(promptText(slide), slide.lead!, seed);
      expect(close(Number(slide.answer), fromTable), `seed ${seed}`).toBe(true);
      expect(Math.abs(Number(slide.answer) - truth), `seed ${seed}`).toBeLessThan(0.001);
    }
  });

  it('fills dist-xbar-route-tree with sigma / sqrt(n), the z and the probability', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-route-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const text = promptText(slide);
      const { mu, se } = sampleFrom(text);
      const k = Number(/(\d+)\)$/.exec(slide.expression)![1]);
      const { fromTable, truth } = probabilityOf(text, slide.expression, seed);
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([se, Number(((k - mu) / se).toFixed(6)), Number(fromTable.toFixed(6))]);
      expect(Math.abs(fromTable - truth), `seed ${seed}`).toBeLessThan(0.001);
    }
  });

  it('standardises with sigma / sqrt(n), never sigma, in dist-xbar-standardise', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-standardise')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const text = promptText(slide);
      const { mu, se } = sampleFrom(text);
      const k = Number(/Standardise \$\\bar\{X\} = (\d+)\$/.exec(text)![1]);
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual([k, mu, se, Number(((k - mu) / se).toFixed(6))]);
    }
  });

  it('fills dist-one-vs-mean with one value standardised by sigma and the mean by sigma / sqrt(n)', () => {
    for (const { slide, seed } of draws<unknown>('dist-one-vs-mean')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const text = promptText(slide);
      const { mu, sigma, se } = sampleFrom(text);
      const [, op, k] = /([<>]) (\d+)\)$/.exec(slide.columns[2])!;
      const want: number[] = [];
      for (const sd of [sigma, se]) {
        const z = (Number(k) - mu) / sd;
        const lower = tableBelow(text, z, seed);
        const value = op === '<' ? lower : 1 - lower;
        const truth = op === '<' ? simpsonBelow(z) : 1 - simpsonBelow(z);
        expect(Math.abs(value - truth), `seed ${seed}`).toBeLessThan(0.001);
        want.push(Number(z.toFixed(6)), Number(value.toFixed(6)));
      }
      expect(slide.rows.map((row) => row[0]), `seed ${seed}`).toEqual(['X', '\\bar{X}']);
      expect(slide.answer.map(Number), `seed ${seed}`).toEqual(want);
      // The mean strays less: its tail beyond k is always the smaller.
      const tail = (p: number) => Math.min(p, 1 - p);
      expect(tail(want[3]) < tail(want[1]), `seed ${seed}`).toBe(true);
    }
  });
});

describe('level 6 lesson 5: working back from a sample mean', () => {
  /** The stated probability, and the k or c it asks for, held to Simpson and to the table. */
  function checkCritical(text: string, value: number, seed: number) {
    const { mu, se } = sampleFrom(text);
    const table = percentagePoints(text);
    let m = /P\(\\bar\{X\} ([<>]) k\) = (0\.\d+)/.exec(text);
    if (m) {
      const z = (value - mu) / se;
      const tail = Number(m[2]);
      const area = m[1] === '>' ? 1 - simpsonBelow(z) : simpsonBelow(z);
      expect(Math.abs(area - tail), `seed ${seed}: k = ${value}`).toBeLessThan(0.0005);
      expect(close(Math.abs(z), table.get(1 - tail)!, 1e-9), `seed ${seed}: z = ${z}`).toBe(true);
      return z;
    }
    m = /P\((\d+) - c < \\bar\{X\} < (\d+) \+ c\) = (0\.\d+)/.exec(text);
    expect(m, text).not.toBeNull();
    expect(Number(m![1]), `seed ${seed}`).toBe(mu);
    const level = Number(m![3]);
    const z = value / se;
    expect(Math.abs(2 * simpsonPhi(z) - 1 - level), `seed ${seed}: c = ${value}`).toBeLessThan(0.001);
    expect(close(z, table.get(Number((1 - (1 - level) / 2).toFixed(4)))!, 1e-9), `seed ${seed}: z = ${z}`).toBe(true);
    return z;
  }

  it('finds k or c in dist-xbar-critical from sigma / sqrt(n) and the table', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-critical')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      checkCritical(promptText(slide), Number(slide.answer), seed);
    }
  });

  it('fills dist-xbar-cutoff-tree with sigma / sqrt(n), the signed z and k', () => {
    for (const { slide, seed } of draws<unknown>('dist-xbar-cutoff-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const text = `${promptText(slide)} ${slide.expression}`;
      const [se, z, k] = slide.answer.map(Number);
      expect(se, `seed ${seed}`).toBe(sampleFrom(text).se);
      expect(close(checkCritical(text, k, seed), z, 1e-9), `seed ${seed}`).toBe(true);
    }
  });

  /** mu, sigma, d and the level from a smallest-n prompt, and the z the table gives for that level. */
  function sizeFrom(text: string) {
    const { mu, sigma } = normalFrom(text);
    const abs = /P\(\|\\bar\{X\} - (\d+)\| < (\d+)\) \\ge (0\.\d+)/.exec(text);
    const range = /P\((\d+) < \\bar\{X\} < (\d+)\) \\ge (0\.\d+)/.exec(text);
    expect(abs ?? range, text).not.toBeNull();
    const d = abs ? Number(abs[2]) : (Number(range![2]) - Number(range![1])) / 2;
    if (abs) expect(Number(abs[1])).toBe(mu);
    else expect(Number(range![1]) + d).toBe(mu);
    const level = Number((abs ?? range)![3]);
    const z = percentagePoints(text).get(Number((1 - (1 - level) / 2).toFixed(4)))!;
    expect(z, `no percentage point for ${level}`).toBeDefined();
    return { sigma, d, level, z };
  }

  /** Whether d is at least z standard deviations of the mean of n, in whole numbers: n d^2 >= (z sigma)^2. */
  const enough = (n: number, { sigma, d, z }: { sigma: number; d: number; z: number }) =>
    n * d * d * 1e6 >= (Math.round(z * 1000) * sigma) ** 2;

  it('puts the n of dist-min-n back: it reaches the level and one fewer does not', () => {
    for (const { slide, seed } of draws<unknown>('dist-min-n')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const size = sizeFrom(promptText(slide));
      const n = Number(slide.answer);
      expect(enough(n, size), `seed ${seed}: n = ${n}`).toBe(true);
      expect(enough(n - 1, size), `seed ${seed}: n - 1 = ${n - 1} also works`).toBe(false);
      const reached = 2 * simpsonPhi((size.d * Math.sqrt(n)) / size.sigma) - 1;
      expect(reached, `seed ${seed}`).toBeGreaterThan(size.level - 0.001);
    }
  });

  it('plans dist-min-n-flow through the right z, sqrt(n) and the smallest n', () => {
    for (const { slide, seed } of draws<unknown>('dist-min-n-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const size = sizeFrom(promptText(slide));
      expect(slide.answer[0], `seed ${seed}`).toBe(`$${size.z}$`);
      const root = /^\$\\sqrt\{n\} \\ge ([\d.]+)\$$/.exec(slide.answer[1]);
      expect(root, `seed ${seed}: ${slide.answer[1]}`).not.toBeNull();
      expect(close(Number(root![1]), (size.z * size.sigma) / size.d), `seed ${seed}`).toBe(true);
      const n = labelValue(slide.answer[2]);
      expect(enough(n, size) && !enough(n - 1, size), `seed ${seed}: n = ${n}`).toBe(true);
    }
  });
});
