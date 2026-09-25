/**
 * Generators for the `table` widget: a sequence filled in term by term.
 *
 * Two demonstrations, one per way a sequence can be given — an explicit rule,
 * where each term comes from its own `n`, and a recursive one, where each term
 * needs the one before it. No lesson asks either yet; they exist so the widget
 * ships exercised by the property tests, and Sequences & Series (C5) will build
 * its lessons on them.
 *
 * Every value in a table is a whole number, written one way, because the widget
 * grades exact tokens: `-3`, never `−3` or `(-3)`.
 */
import type { Block, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { coeffTex } from './format';

/* ---------- Shared helpers ---------- */

/** `+ 4` or `- 4`, for writing a signed term after another. */
function signed(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** `k x + c` as written by hand, dropping a zero constant. */
function linearTex(k: number, symbol: string, c: number): string {
  const lead = coeffTex(k, symbol);
  return c === 0 ? lead : `${lead} ${signed(c)}`;
}

/** A value in brackets, for substituting into a product: `2(-3)`. */
function bracketed(value: number): string {
  return `(${value})`;
}

/**
 * A table's bank: every value the blanks need, plus distractors.
 *
 * The answers go in as a multiset, since the widget spends bank entries by
 * value and a sequence can repeat one. Distractors are taken in the order
 * given — the likeliest mistakes first — skipping any that equal an answer or
 * each other, up to `most`. The bank is then sorted by value: a shuffle drawn
 * from the rng would let one question render two ways, and the deck
 * de-duplicator compares rendered slides (PITFALLS 3.10).
 */
function tableBank(answer: number[], distractors: number[], most = 4): string[] {
  const extras: number[] = [];
  for (const value of distractors) {
    if (extras.length >= most) break;
    if (!Number.isInteger(value) || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  // Near misses as a last resort, so no draw is left with the answer alone.
  for (let step = 1; extras.length < 2; step += 1) {
    for (const value of [answer[0] + step, answer[0] - step]) {
      if (extras.length < 2 && !answer.includes(value) && !extras.includes(value)) extras.push(value);
    }
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

/** `count` consecutive row indices starting somewhere in [from, rows). */
function run(rng: Rng, from: number, rows: number, count: number): number[] {
  const start = rng.int(from, rows - count);
  return Array.from({ length: count }, (_, idx) => start + idx);
}

/* ---------- Explicit rule: u_n = an + b ---------- */

interface ExplicitParams {
  a: number;
  b: number;
  rows: number;
  /** Row indices (0-based) whose `u_n` is blank. */
  termBlanks: number[];
  /** Row indices whose running sum is blank; empty means no third column. */
  sumBlanks: number[];
}

const explicitTerm = (p: ExplicitParams, n: number) => p.a * n + p.b;
const explicitSum = (p: ExplicitParams, n: number) =>
  Array.from({ length: n }, (_, idx) => explicitTerm(p, idx + 1)).reduce((s, t) => s + t, 0);

const termTableExplicit: Generator<ExplicitParams> = {
  id: 'term-table-explicit',

  sample(rng, difficulty) {
    if (difficulty <= 1) {
      // Consecutive terms of a two-column table.
      const a = rng.pick([-3, -2, 2, 3, 4, 5, 6, 7]);
      const b = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const rows = 5;
      const termBlanks = run(rng, 0, rows, rng.int(2, 3));
      return { a, b, rows, termBlanks, sumBlanks: [] };
    }
    // A running-sum column beside the terms: one term blank, and a run of sums
    // after the first, which is always given so the column has a start.
    const a = rng.pick([-4, -3, -2, 2, 3, 4, 5, 6]);
    const b = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const rows = 5;
    const termBlanks = [rng.int(1, rows - 1)];
    const sumBlanks = run(rng, 1, rows, rng.int(2, 3));
    return { a, b, rows, termBlanks, sumBlanks };
  },

  render(p): Slide {
    const withSums = p.sumBlanks.length > 0;
    const rows: (string | null)[][] = [];
    const answer: number[] = [];
    const distractors: number[] = [];

    for (let idx = 0; idx < p.rows; idx += 1) {
      const n = idx + 1;
      const term = explicitTerm(p, n);
      const row: (string | null)[] = [String(n)];
      if (p.termBlanks.includes(idx)) {
        row.push(null);
        answer.push(term);
      } else {
        row.push(String(term));
      }
      if (withSums) {
        const sum = explicitSum(p, n);
        if (p.sumBlanks.includes(idx)) {
          row.push(null);
          answer.push(sum);
        } else {
          row.push(String(sum));
        }
      }
      rows.push(row);
    }

    // Likeliest slips first: a term one step out, the rule without its
    // constant, the sign dropped; for a sum, one row out, a term skipped, or
    // n times the term as though every term were the same.
    for (const idx of p.termBlanks) {
      const n = idx + 1;
      const term = explicitTerm(p, n);
      distractors.push(explicitTerm(p, n + 1), p.a * n, -term, explicitTerm(p, n - 1));
    }
    for (const idx of p.sumBlanks) {
      const n = idx + 1;
      distractors.push(explicitSum(p, n + 1), explicitSum(p, n - 1) + explicitTerm(p, n + 1), n * explicitTerm(p, n));
    }

    const rule = `u_n = ${linearTex(p.a, 'n', p.b)}`;
    const prompt: Block[] = withSums
      ? [
          { kind: 'prose', text: 'Fill in the table. $S_n$ is the sum of the first $n$ terms.' },
          { kind: 'display', tex: rule },
        ]
      : [
          { kind: 'prose', text: 'Fill in the missing terms of the sequence.' },
          { kind: 'display', tex: rule },
        ];

    return {
      kind: 'table',
      prompt,
      columns: withSums ? ['n', 'u_n', 'S_n'] : ['n', 'u_n'],
      rows,
      bank: tableBank(answer, distractors),
      answer: answer.map(String),
    };
  },

  solution(p) {
    const steps: SolutionStep[] = [
      { text: 'Each term comes from its own $n$, so put each row’s $n$ into the rule.' },
    ];
    for (const idx of p.termBlanks) {
      const n = idx + 1;
      steps.push({
        tex: `u_{${n}} = ${p.a}(${n}) ${signed(p.b)} = ${explicitTerm(p, n)}`,
      });
    }
    if (p.sumBlanks.length > 0) {
      steps.push({ text: 'Each sum is the one above it plus this row’s term.' });
      for (const idx of p.sumBlanks) {
        const n = idx + 1;
        steps.push({
          tex: `S_{${n}} = S_{${n - 1}} + u_{${n}} = ${explicitSum(p, n - 1)} ${signed(explicitTerm(p, n))} = ${explicitSum(p, n)}`,
        });
      }
    }
    return steps;
  },
};

/* ---------- Recursive rule: u_{n+1} = p u_n + q ---------- */

interface RecursiveParams {
  p: number;
  q: number;
  first: number;
  rows: number;
  /** Row indices (0-based) whose term is blank. Row 0 is always given. */
  blanks: number[];
}

function recursiveTerms(r: RecursiveParams): number[] {
  const terms = [r.first];
  while (terms.length < r.rows) terms.push(r.p * terms[terms.length - 1] + r.q);
  return terms;
}

/** Largest term a recursive table may show, so a bank stays readable. */
const RECURSIVE_CAP = 200;

const termTableRecursive: Generator<RecursiveParams> = {
  id: 'term-table-recursive',

  sample(rng, difficulty) {
    const rows = 5;
    // Re-drawn from the same rng until the sequence moves and stays small, so
    // one seed still gives one question.
    for (;;) {
      let p: number;
      let q: number;
      let first: number;
      let blanks: number[];
      if (difficulty <= 1) {
        // Add a constant, or double and adjust: a run of consecutive blanks
        // straight after a given term.
        p = rng.pick([1, 2]);
        q = p === 1
          ? rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7])
          : rng.pick([-3, -2, -1, 1, 2, 3]);
        first = rng.int(1, 6);
        blanks = run(rng, 1, rows, rng.int(2, 3));
      } else {
        // A multiplier that can be negative, and three blanks anywhere after
        // the first row, so a given term often sits between two of them.
        p = rng.pick([-2, 2, 3]);
        q = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
        first = rng.pick([-3, -2, -1, 1, 2, 3, 4]);
        blanks = [...rng.sample([1, 2, 3, 4], 3)].sort((x, y) => x - y);
      }
      const params = { p, q, first, rows, blanks };
      const terms = recursiveTerms(params);
      if (terms[1] === terms[0]) continue;
      if (terms.some((t) => Math.abs(t) > RECURSIVE_CAP)) continue;
      return params;
    }
  },

  render(r): Slide {
    const terms = recursiveTerms(r);
    const answer = r.blanks.map((idx) => terms[idx]);
    const distractors: number[] = [];
    for (const idx of r.blanks) {
      const before = terms[idx - 1];
      // One step too many or too few, the constant forgotten, the sign lost,
      // and the constant applied before the multiplier.
      distractors.push(
        r.p * terms[idx] + r.q,
        r.p * before,
        -terms[idx],
        r.p * (before + r.q),
      );
    }
    return {
      kind: 'table',
      prompt: [
        { kind: 'prose', text: 'Each term comes from the one before it. Fill in the missing terms.' },
        { kind: 'display', tex: `u_{n+1} = ${linearTex(r.p, 'u_n', r.q)}, \\quad u_1 = ${r.first}` },
      ],
      columns: ['n', 'u_n'],
      rows: terms.map((term, idx) => [String(idx + 1), r.blanks.includes(idx) ? null : String(term)]),
      bank: tableBank(answer, distractors),
      answer: answer.map(String),
    };
  },

  solution(r) {
    const terms = recursiveTerms(r);
    const steps: SolutionStep[] = [
      { text: 'Each term needs the one before it, so work down the table from $u_1$.' },
    ];
    for (const idx of r.blanks) {
      const before = terms[idx - 1];
      const product = r.p === 1 ? `${before}` : `${r.p === -1 ? '-' : r.p}${bracketed(before)}`;
      steps.push({
        tex: `u_{${idx + 1}} = ${linearTex(r.p, `u_{${idx}}`, r.q)} = ${product} ${signed(r.q)} = ${terms[idx]}`,
      });
    }
    return steps;
  },
};

export const termTableGenerators = [termTableExplicit, termTableRecursive];
