/**
 * Binomial Expansion.
 *
 * Level 1 builds Pascal's triangle and reads expansions off it: `(1 + x)^n`,
 * brackets with numbers in them, the signs a negative term brings, and one
 * term picked out without writing the rest. Level 2 names the triangle's
 * entries: factorials and nCr, nCr as the coefficient of a term, the general
 * term, estimates from the first three terms, and a bracket multiplied by an
 * expansion. Level 3 works backwards: n, k or a from given coefficients,
 * neighbouring coefficients equal or in a ratio, and the sum of the
 * coefficients from x = 1 and x = -1. Level 4 multiplies two expansions:
 * the pairs that make one coefficient, the first three terms of a product,
 * brackets that pair off into (1 - c^2x^2)^n, a trinomial as (1 + u)^n, and
 * equating coefficients across a product. Level 5 sizes the error of a
 * three-term estimate, puts a number in front of x, and expands brackets with
 * a surd in them into a + b√k, alone, in conjugate pairs and with a number.
 * Level 6 lets n be negative or a fraction: the series that never ends, its
 * coefficients, the range |x| < 1 it holds for, and (a + bx)^n with a^n
 * taken out. Level 7 makes estimates with the series: roots, reciprocals, a
 * number taken out first, the size of the error and which x to use, and the
 * series of a partial-fraction split.
 *
 * Up to level 5 every n is a whole number of at most 8 in an expansion (nCr
 * on its own goes to 12); levels 6 and 7 keep their coefficients as exact
 * fractions, and level 7's decimals are written from them exactly. Every
 * coefficient, bank and option is exact.
 *
 * Expansions are asked through tiles or one coefficient at a time, never as a
 * typed expansion: the checker compares values, so a typed `(1 + x)^4` would
 * pass as its own expansion (PITFALLS 3.4).
 */
import type { Rng } from '../../engine/rng';
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import { bin, num, pow, valueOf, type Expr } from '../expr';
import { ALGEBRA_KEYS, sumTex, termAnswer, termTex } from './calculus';
import { coeffTex, fracTex, gcd } from './format';
import { markerWindow, plotSvg } from '../figures';
import { defaultSliderValue } from '../../ui/sliderValue';

/* ---------- shared ---------- */

/** n choose r. Exact: after step i the running value is C(n - r + i, i). */
export function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  let value = 1;
  for (let i = 1; i <= r; i += 1) value = (value * (n - r + i)) / i;
  return value;
}

/** Row n of Pascal's triangle, counting the single 1 at the top as row 0. */
export function pascalRow(n: number): number[] {
  return Array.from({ length: n + 1 }, (_, r) => nCr(n, r));
}

function factorial(n: number): number {
  let value = 1;
  for (let i = 2; i <= n; i += 1) value *= i;
  return value;
}

/** nCr as the learner reads it. */
function ncrTex(n: number | string, r: number | string): string {
  return `{}^{${n}}C_{${r}}`;
}

/**
 * A row of numbers set out with room between them, as the triangle is drawn.
 * Rows from 7 down close the gaps up, or they run off a phone's width.
 */
function rowTex(values: (number | string)[], tight = values.length > 7): string {
  return values.join(tight ? ' \\enspace ' : ' \\quad ');
}

/**
 * Roughly how many characters wide a line of TeX renders: exponents are small
 * and commands print nothing or one symbol. About 22 fit a phone's width.
 */
function texWidth(tex: string): number {
  return tex
    .replace(/\^\{[^{}]*\}|\^./g, '')
    .replace(/\\times/g, 'x')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}&\\]/g, '').length;
}

const LINE = 22;

/** lhs = the terms, broken over lines when it would not fit on one. */
function expansionTex(lhs: string, terms: string[]): string {
  const whole = `${lhs} = ${sumTex(terms)}`;
  if (texWidth(whole) <= LINE) return whole;
  const lines: string[][] = [];
  let line: string[] = [];
  for (const term of terms) {
    if (line.length > 0 && texWidth(`= ${sumTex([...line, term])}`) > LINE) {
      lines.push(line);
      line = [];
    }
    line.push(term);
  }
  lines.push(line);
  return chain(
    `& ${lhs}`,
    ...lines.map((terms, i) => {
      const sum = sumTex(terms);
      if (i === 0) return `&= ${sum}`;
      return `&\\quad ${sum.startsWith('-') ? `- ${sum.slice(1)}` : `+ ${sum}`}`;
    }),
  );
}

/** Short results stacked one per line, lined up on their equals signs. */
function column(lines: [string, string | number][]): string {
  return chain(...lines.map(([left, right]) => `${left} &= ${right}`));
}

/**
 * A stable number from a question's own parameters, for ordering the options
 * of a native choice slide. Not the rng: one question must render one way, or
 * the deck de-duplicator sees two questions where there is one.
 */
function mix(...values: number[]): number {
  let hash = 7;
  for (const value of values) hash = (hash * 31 + Math.round(value * 7) + 101) | 0;
  return Math.abs(hash);
}

function turned<T>(items: T[], turn: number): T[] {
  const at = turn % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/** A native choice's options, the first label correct, turned by the question's own numbers. */
function nativeChoice(labels: string[], salt: number): { options: { id: string; label: string; tex: boolean }[]; correctId: string } {
  const seen = new Set<string>();
  const kept = labels.filter((label) => {
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
  return {
    options: turned(
      kept.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex: true })),
      salt,
    ),
    correctId: 'correct',
  };
}

/** The correct option and up to three distinct wrong ones, compared by label. */
function fourOptions(correct: ChoiceOption, ...wrong: ChoiceOption[]): ChoiceOption[] {
  const seen = new Set([correct.tex]);
  const out: ChoiceOption[] = [{ ...correct, correct: true }];
  for (const option of wrong) {
    if (out.length === 4) break;
    if (seen.has(option.tex)) continue;
    seen.add(option.tex);
    out.push(option);
  }
  return out;
}

function numberOption(value: number): ChoiceOption {
  return { tex: `${value}`, answer: `${value}` };
}

/** A number and three wrong ones: the slips first, then near misses. */
function numberOptions(correct: number, slips: number[], unit = 1): ChoiceOption[] {
  const near = [1, -1, 2, -2, 3, -3].map((k) => correct + k * unit);
  const wrong = [...slips, ...near].filter((value) => Number.isFinite(value) && value !== correct);
  return fourOptions(numberOption(correct), ...wrong.map(numberOption));
}

const NUMBER = /^-?\d+(\.\d+)?$/;

/** Numbers sort by value, anything else by its text, so a bank never reads 1, 10, 2. */
function sortTokens(tokens: string[]): string[] {
  if (tokens.every((token) => NUMBER.test(token))) return [...tokens].sort((x, y) => Number(x) - Number(y));
  return [...tokens].sort();
}

/** A tiles bank: every answer token (repeats kept) plus the distinct distractors. */
function tileBank(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  return sortTokens([...answer, ...extras]);
}

/**
 * A tree bank: the answer plus at least two distractors, topped up from the
 * values just past the largest answer when the question's own slips collide
 * with it, which they do more often than they look like they will.
 */
function treeBank(answer: string[], candidates: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(candidates)].filter((token) => NUMBER.test(token) && !needed.has(token));
  const top = Math.max(...answer.map(Number));
  for (let step = 1; extras.length < 3; step += 1) {
    const candidate = `${top + step}`;
    if (!needed.has(candidate) && !extras.includes(candidate)) extras.push(candidate);
  }
  return sortTokens([...answer, ...extras.slice(0, 4)]);
}

/** Six whole values for a reduce bank: the node's own value, then the slips, then near misses. */
function offer(correct: number, ...near: number[]): string[] {
  const seen = new Set([correct]);
  const out = [correct];
  for (const value of near) {
    if (out.length >= 6) break;
    if (!Number.isInteger(value) || seen.has(value) || Math.abs(value) > 1e7) continue;
    seen.add(value);
    out.push(value);
  }
  for (let step = 1; out.length < 6; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (out.length >= 6) break;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
    }
  }
  return out.sort((x, y) => x - y).map(String);
}

/**
 * A bank for every node of a reduce expression: its own value and the slip
 * its shape invites. A negative power's slip is the sign; a product's is to
 * add instead; a division's is to subtract.
 */
function banksFor(expr: Expr, path = 'r', out: Record<string, string[]> = {}): Record<string, string[]> {
  if (expr.kind === 'num') return out;
  const value = valueOf(expr);
  if (expr.kind === 'binary') {
    const l = valueOf(expr.left);
    const r = valueOf(expr.right);
    const signed = l < 0 || r < 0 ? [-value] : [];
    const slips =
      expr.op === '*'
        ? [...signed, l + r, value + l, value - r]
        : expr.op === '/'
          ? [l - r, value * 2, value + r]
          : expr.op === '+'
            ? [l - r, l * r, value + 1]
            : [l + r, r - l, value - 1];
    out[path] = offer(value, ...slips);
    banksFor(expr.left, `${path}.l`, out);
    banksFor(expr.right, `${path}.r`, out);
  } else if (expr.kind === 'power') {
    const b = valueOf(expr.base);
    const e = valueOf(expr.exponent);
    const signed = b < 0 ? [-value] : [];
    out[path] = offer(value, ...signed, b * e, e ** b, b ** (e + 1));
    banksFor(expr.base, `${path}.b`, out);
    banksFor(expr.exponent, `${path}.e`, out);
  }
  return out;
}

/** A chain of products, left to right: 8 × 7 × 6. */
function productExpr(factors: number[]): Expr {
  return factors.slice(1).reduce<Expr>((acc, factor) => bin('*', acc, num(factor)), num(factors[0]));
}

/** Lines of working stacked and aligned. */
function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/* ---------- brackets ---------- */

/**
 * A bracket (A + B)^n, with A = a x^p and B = b x^q in the order written.
 * p and q are the powers of x each part carries: 1 and 0 for (2x - 3), 0 and 1
 * for (1 + 2x), 1 and -1 for (x + 2/x), 2 and -1 for (x^2 - 3/x).
 */
interface Bracket {
  a: number;
  p: number;
  b: number;
  q: number;
  n: number;
}

/** c x^e as it is written by hand, including x in a denominator. */
function monoTex(c: number, e: number): string {
  if (e >= 0) return termTex(c, e);
  const under = e === -1 ? 'x' : `x^{${-e}}`;
  return c < 0 ? `-\\frac{${-c}}{${under}}` : `\\frac{${c}}{${under}}`;
}

/** The inside of the bracket, without the bracket. */
function insideTex({ a, p, b, q }: Bracket): string {
  return sumTex([monoTex(a, p), monoTex(b, q)]);
}

function bracketTex(br: Bracket): string {
  return `\\left(${insideTex(br)}\\right)^{${br.n}}`;
}

/** One part of the bracket, c x^e, raised to the power k and written with its bracket. */
function partPowTex(c: number, e: number, k: number): string {
  if (e === 0) return c < 0 ? `(${c})^{${k}}` : `${c}^{${k}}`;
  if (e < 0) return `\\left(${monoTex(c, e)}\\right)^{${k}}`;
  if (c === 1) return e === 1 ? `x^{${k}}` : `(x^{${e}})^{${k}}`;
  return `(${monoTex(c, e)})^{${k}}`;
}

/** The term carrying B^r: its coefficient and its power of x. */
function termOf(br: Bracket, r: number): { coef: number; power: number } {
  const { a, p, b, q, n } = br;
  return { coef: nCr(n, r) * a ** (n - r) * b ** r, power: p * (n - r) + q * r };
}

/** The r whose term is a multiple of x^m, if there is one. */
function rFor(br: Bracket, m: number): number | undefined {
  for (let r = 0; r <= br.n; r += 1) if (termOf(br, r).power === m) return r;
  return undefined;
}

/** A bracket of the plain kinds: (ax + b)^n, descending, or (a + bx)^n, ascending. */
function plainBracket(n: number, first: number, second: number, xFirst: boolean): Bracket {
  return xFirst ? { a: first, p: 1, b: second, q: 0, n } : { a: first, p: 0, b: second, q: 1, n };
}

/** The working for one term: the triangle's number times each part to its power. */
function termWorking(br: Bracket, r: number): SolutionStep[] {
  const { a, p, b, q, n } = br;
  const { coef, power } = termOf(br, r);
  const pieces = `${nCr(n, r)} \\times ${partPowTex(a, p, n - r)} \\times ${partPowTex(b, q, r)}`;
  const numbers = `${nCr(n, r)} \\times ${a ** (n - r) < 0 ? `(${a ** (n - r)})` : a ** (n - r)} \\times ${b ** r < 0 ? `(${b ** r})` : b ** r}`;
  return [
    {
      text: `The powers of the two parts add to $${n}$: here $${monoTex(a, p)}$ is to the power $${n - r}$ and $${monoTex(b, q)}$ to the power $${r}$. The number in front comes from row $${n}$ of Pascal's triangle, $${rowTex(pascalRow(n))}$.`,
    },
    { tex: chain(`& ${pieces}`, `&= ${numbers} \\times ${monoTex(1, power) === '1' ? '1' : monoTex(1, power)}`, `&= ${monoTex(coef, power)}`) },
  ];
}

/* ---------- Level 1: Pascal's triangle and (a + b)^n ---------- */

interface WindowParams {
  n: number;
  /** Where in row n the window of given numbers starts. */
  k: number;
  width: number;
}

/**
 * A few neighbouring numbers from one row, and the rows beneath them filled
 * in by adding each pair. Three numbers give two rows, four give three.
 */
const pascalTree: Generator<WindowParams> = {
  id: 'bin-pascal-tree',
  sample: (rng, difficulty) => {
    const width = difficulty > 1 ? 4 : 3;
    const n = rng.int(3, difficulty > 1 ? 9 : 8);
    return { n, k: rng.int(0, n + 1 - width), width };
  },
  render: ({ n, k, width }): Slide => {
    const given = Array.from({ length: width }, (_, i) => nCr(n, k + i));
    const nodes: { id: string; from: string[] }[] = [];
    const answer: string[] = [];
    for (let level = 1; level < width; level += 1) {
      for (let i = 0; i < width - level; i += 1) {
        nodes.push({ id: `r${level}c${i}`, from: level === 1 ? [] : [`r${level - 1}c${i}`, `r${level - 1}c${i + 1}`] });
        answer.push(`${nCr(n + level, k + level + i)}`);
      }
    }
    // The number either side of the window in the next row, and each pair
    // multiplied or copied straight down.
    const slips = [
      nCr(n + 1, k),
      nCr(n + 1, k + width),
      given[0] * given[1],
      given[1] + 1,
      nCr(n + 2, k + 1),
      nCr(n + 1, k + 1) + 1,
    ].filter((v) => v > 0);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `These are ${width} neighbouring numbers from row $${n}$ of Pascal's triangle. Each number below is the sum of the two above it. Fill in the ${width === 3 ? 'two rows' : 'three rows'} beneath, left to right.`,
        },
      ],
      expression: rowTex(given),
      nodes,
      bank: treeBank(answer, slips.map(String)),
      answer,
    };
  },
  solution: ({ n, k, width }) => {
    const steps: SolutionStep[] = [{ text: 'Add each neighbouring pair to get the number between them in the row below.' }];
    for (let level = 1; level < width; level += 1) {
      const sums = Array.from({ length: width - level }, (_, i) => {
        const left = nCr(n + level - 1, k + level - 1 + i);
        const right = nCr(n + level - 1, k + level + i);
        return [`${left} + ${right}`, left + right] as [string, number];
      });
      steps.push({ text: `Row $${n + level}$:`, tex: column(sums) });
    }
    return steps;
  },
};

interface RowParams {
  /** The row shown in full; the row below it has the blanks. */
  n: number;
  /** Positions in row n + 1 left blank, in order. */
  blanks: number[];
}

/** k distinct positions from lo to hi, in order. */
function pickPositions(rng: Rng, lo: number, hi: number, k: number): number[] {
  const all = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return rng
    .shuffle(all)
    .slice(0, k)
    .sort((x, y) => x - y);
}

/**
 * The next row from the one above, with two or three of its numbers missing.
 * The bank holds the number copied straight down, the sum taken one place
 * over, and near misses.
 */
const pascalRowTiles: Generator<RowParams> = {
  id: 'bin-pascal-row',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const n = hard ? rng.int(5, 6) : rng.int(3, 6);
    return { n, blanks: pickPositions(rng, 1, n, hard ? 3 : 2) };
  },
  render: ({ n, blanks }): Slide => {
    const above = pascalRow(n);
    const below = pascalRow(n + 1);
    let blank = 0;
    const template = below.map((value, i) => (blanks.includes(i) ? `{${blank++}}` : `${value}`)).join(' \\quad ');
    const answer = blanks.map((i) => `${below[i]}`);
    const slips = blanks.flatMap((i) => [above[i], above[i - 1], below[i] + 1, below[i] - 1, above[i] * 2]);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Row $${n}$ of Pascal's triangle is below. Fill in the gaps in row $${n + 1}$.` },
        { kind: 'display', tex: rowTex(above) },
      ],
      template,
      bank: tileBank(answer, slips.filter((v) => v > 0).map(String)),
      answer,
    };
  },
  solution: ({ n, blanks }) => {
    const above = pascalRow(n);
    return [
      { text: 'Each number is the sum of the two above it: the one above-left and the one above-right.' },
      { tex: column(blanks.map((i) => [`${above[i - 1]} + ${above[i]}`, above[i - 1] + above[i]])) },
      { text: `So row $${n + 1}$ is $${rowTex(pascalRow(n + 1))}$.` },
    ];
  },
};

type FactKind = 'sum' | 'coefficients' | 'count' | 'largest' | 'which';

interface FactParams {
  kind: FactKind;
  n: number;
}

function factAnswer({ kind, n }: FactParams): number {
  if (kind === 'sum' || kind === 'coefficients') return 2 ** n;
  if (kind === 'count') return n + 1;
  if (kind === 'largest') return nCr(n, Math.floor(n / 2));
  return n;
}

/**
 * What a row of the triangle says about the expansion: how many terms, what
 * the numbers add to (put x = 1), the largest, and a row found from its total.
 */
const rowFacts: Generator<FactParams> = {
  id: 'bin-row-facts',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick<FactKind>(hard ? ['sum', 'coefficients', 'largest', 'which'] : ['sum', 'coefficients', 'count', 'largest']);
    const n =
      kind === 'largest' ? rng.int(hard ? 5 : 4, hard ? 9 : 8) : kind === 'count' ? rng.int(3, 12) : rng.int(hard ? 5 : 3, hard ? 12 : 10);
    return { kind, n };
  },
  choices: (params) => {
    const { kind, n } = params;
    const right = factAnswer(params);
    if (kind === 'sum' || kind === 'coefficients') return numberOptions(right, [2 * n, n * n, 2 ** (n + 1), 2 ** (n - 1)]);
    if (kind === 'count') return numberOptions(right, [n, n + 2, 2 * n]);
    if (kind === 'largest') return numberOptions(right, [nCr(n, Math.floor(n / 2) - 1), nCr(n + 1, Math.floor(n / 2)), n * 2]);
    return numberOptions(right, [n + 1, n - 1, 2 * n]);
  },
  render: (params): Slide => {
    const { kind, n } = params;
    const text: Record<FactKind, string> = {
      sum: `What do the numbers in row $${n}$ of Pascal's triangle add up to?`,
      coefficients: `Add up the coefficients of the expansion of $(1 + x)^{${n}}$.`,
      count: `How many terms does the expansion of $(a + b)^{${n}}$ have?`,
      largest: `What is the largest number in row $${n}$ of Pascal's triangle?`,
      which: `Which row of Pascal's triangle adds up to $${2 ** n}$?`,
    };
    const lead: Record<FactKind, string> = {
      sum: '\\text{total} =',
      coefficients: '\\text{total} =',
      count: '\\text{terms} =',
      largest: '\\text{largest} =',
      which: '\\text{row} =',
    };
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: text[kind] }],
      lead: lead[kind],
      keypad: [],
      answer: `${factAnswer(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { kind, n } = params;
    if (kind === 'count') {
      return [
        { text: `The power of $b$ runs $0, 1, 2, \\dots, ${n}$: one term for each.` },
        { text: `That is $${n + 1}$ terms, one more than the power, and row $${n}$ has $${n + 1}$ numbers.` },
      ];
    }
    if (kind === 'largest') {
      return [
        { text: `Row $${n}$ is $${rowTex(pascalRow(n))}$.` },
        { text: `The numbers rise to the middle and fall again, so the largest is $${factAnswer(params)}$.` },
      ];
    }
    if (kind === 'which') {
      return [
        { text: 'Row $n$ adds up to $2^n$: each row doubles the one above, because every number is used twice below it.' },
        { tex: `${2 ** n} = 2^{${n}}` },
        { text: `So it is row $${n}$.` },
      ];
    }
    return [
      {
        text:
          kind === 'coefficients'
            ? `Put $x = 1$: every term becomes just its coefficient, and $(1 + 1)^{${n}} = 2^{${n}}$.`
            : 'Every number is added into two below it, so each row adds up to twice the row above. Row $0$ is $1$.',
      },
      { tex: `2^{${n}} = ${2 ** n}` },
    ];
  },
};

interface ErrorParams {
  n: number;
  /** The position of the wrong number, left of the middle or on it. */
  at: number;
  /** How far it is out. */
  delta: number;
  /** Harder: the mistake is made on both sides, so symmetry does not give it away. */
  mirrored: boolean;
}

function errorRow({ n, at, delta, mirrored }: ErrorParams): number[] {
  return pascalRow(n).map((value, i) => (i === at || (mirrored && i === n - at) ? value + delta : value));
}

/**
 * One number in a row is wrong: which? On its own a row gives it away by
 * symmetry; with the mistake made twice, the row above has to be used.
 */
const pascalError: Generator<ErrorParams> = {
  id: 'bin-pascal-error',
  sample: (rng, difficulty) => {
    const mirrored = difficulty > 1;
    for (;;) {
      const n = rng.int(mirrored ? 5 : 4, 8);
      const at = rng.int(1, mirrored ? Math.ceil(n / 2) - 1 : n - 1);
      const delta = rng.pick([-3, -2, -1, 1, 2, 3, 5, 10]);
      const params = { n, at, delta, mirrored };
      const shown = errorRow(params);
      // The wrong number must not already be somewhere in the row, or the
      // options would offer it twice.
      const wrong = shown[at];
      if (wrong <= 1 || pascalRow(n).includes(wrong)) continue;
      if (!mirrored && Math.abs(at - n / 2) < 0.1) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { n, at, mirrored } = params;
    const shown = errorRow(params);
    // The row's other numbers, the 1s only when there are too few without them.
    const bigger = [...new Set(shown.filter((v) => v > 1 && v !== shown[at]))];
    const others = bigger.length >= 3 ? bigger : [...bigger, 1];
    const picked = turned(others, mix(n, at)).slice(0, 3).map(String);
    const { options, correctId } = nativeChoice([`${shown[at]}`, ...picked], mix(n, at, params.delta));
    return {
      kind: 'choice',
      prompt: mirrored
        ? [
            {
              kind: 'prose',
              text: `Row $${n - 1}$ of Pascal's triangle is right. Row $${n}$ beneath it has one mistake, copied onto both sides. Which number is wrong?`,
            },
            {
              kind: 'display',
              tex: `\\begin{gathered} ${rowTex(pascalRow(n - 1), shown.length > 7)} \\\\ ${rowTex(shown)} \\end{gathered}`,
            },
          ]
        : [
            { kind: 'prose', text: `One number in this row of Pascal's triangle is wrong. Which one?` },
            { kind: 'display', tex: rowTex(shown) },
          ],
      options,
      correctId,
    };
  },
  solution: (params) => {
    const { n, at, mirrored } = params;
    const shown = errorRow(params);
    const above = pascalRow(n - 1);
    return [
      mirrored
        ? { text: 'The row is symmetrical, so symmetry cannot find this one. Add pairs from the row above instead.' }
        : { text: `A row reads the same both ways. $${shown[at]}$ has no partner at the other end, where $${shown[n - at]}$ sits.` },
      { tex: `${above[at - 1]} + ${above[at]} = ${nCr(n, at)}, \\text{ not } ${shown[at]}` },
      { text: `Row $${n}$ is $${rowTex(pascalRow(n))}$.` },
    ];
  },
};

interface OneXParams {
  n: number;
  /** Positions (powers of x) left blank. */
  blanks: number[];
  /** Harder: the expansion is written from the highest power down. */
  descending: boolean;
}

/** One term of (1 + x)^n in a tiles template: fixed, or a blank before the x. */
function oneXTerm(n: number, power: number, blank: number | undefined): string {
  const x = power === 0 ? '' : power === 1 ? 'x' : `x^${power}`;
  if (blank !== undefined) return `{${blank}}${x}`;
  const c = nCr(n, power);
  if (power === 0) return `${c}`;
  return c === 1 ? x : `${c}${x}`;
}

/**
 * (1 + x)^n with some of its coefficients to place. The bank holds the same
 * position in the neighbouring rows and the power itself, which is what a
 * learner reaches for who has the shape but not the row.
 */
const oneXTiles: Generator<OneXParams> = {
  id: 'bin-one-x-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const n = hard ? rng.int(5, 7) : rng.int(3, 6);
    const count = hard ? 3 : n === 3 ? 2 : rng.int(2, n - 1);
    return { n, blanks: pickPositions(rng, 1, n - 1, count), descending: hard && rng.chance(0.5) };
  },
  render: ({ n, blanks, descending }): Slide => {
    const powers = Array.from({ length: n + 1 }, (_, i) => (descending ? n - i : i));
    const order = powers.filter((power) => blanks.includes(power));
    const template = powers
      .map((power) => oneXTerm(n, power, blanks.includes(power) ? order.indexOf(power) : undefined))
      .join(' + ');
    const answer = order.map((power) => `${nCr(n, power)}`);
    const slips = order.flatMap((power) => [nCr(n - 1, power), nCr(n + 1, power), n * power, nCr(n, power) + 1]);
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Complete the expansion of $(${descending ? 'x + 1' : '1 + x'})^{${n}}$.` }],
      template: `(${descending ? 'x + 1' : '1 + x'})^${n} = ${template}`,
      bank: tileBank(answer, slips.filter((v) => v > 0).map(String)),
      answer,
    };
  },
  solution: ({ n, descending }) => [
    { text: `The coefficients of $(1 + x)^{${n}}$ are row $${n}$ of Pascal's triangle: $${rowTex(pascalRow(n))}$.` },
    { text: 'The power of $x$ counts up by one each term, from $x^0 = 1$.' },
    {
      tex: expansionTex(
        `(${descending ? 'x + 1' : '1 + x'})^{${n}}`,
        Array.from({ length: n + 1 }, (_, i) => termTex(nCr(n, descending ? n - i : i), descending ? n - i : i)),
      ),
    },
  ],
};

interface OneXCoeffParams {
  n: number;
  k: number;
  /** (1 - x)^n rather than (1 + x)^n. */
  minus: boolean;
}

/** The coefficient of x^k in (1 + x)^n or (1 - x)^n, typed. */
const oneXCoeff: Generator<OneXCoeffParams> = {
  id: 'bin-one-x-coeff',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const n = hard ? rng.int(4, 9) : rng.int(3, 8);
    return { n, k: rng.int(1, n - 1), minus: hard && rng.chance(0.5) };
  },
  choices: ({ n, k, minus }) => {
    const sign = minus && k % 2 === 1 ? -1 : 1;
    return numberOptions(sign * nCr(n, k), [
      -sign * nCr(n, k),
      sign * nCr(n, k === n - 1 ? k - 1 : k + 1),
      sign * nCr(n - 1, k),
      n * k,
    ]);
  },
  render: ({ n, k, minus }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `What is the coefficient of $${termTex(1, k)}$ in the expansion of $(1 ${minus ? '-' : '+'} x)^{${n}}$?`,
      },
    ],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${minus && k % 2 === 1 ? -nCr(n, k) : nCr(n, k)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, k, minus }) => {
    const row = pascalRow(n);
    const steps: SolutionStep[] = [
      { text: `Row $${n}$ of Pascal's triangle is $${rowTex(row)}$. Counting from $x^0$, the $x^{${k}}$ term takes the number in position $${k}$: $${row[k]}$.` },
    ];
    if (minus) {
      steps.push({
        text: `The second part is $-x$, so the term carries $(-x)^{${k}}$. An ${k % 2 === 0 ? 'even' : 'odd'} power of a negative is ${k % 2 === 0 ? 'positive' : 'negative'}.`,
      });
    }
    steps.push({ tex: `${minus ? `${row[k]}(-x)^{${k}}` : `${row[k]}x^{${k}}`} = ${termTex(minus && k % 2 === 1 ? -row[k] : row[k], k)}` });
    return steps;
  },
};

interface SignParams {
  br: Bracket;
  /** The power of x in the term asked about. */
  m: number;
}

/** A bracket with one part negative, and a term in it that is not its first or last. */
function sampleSigned(rng: Rng, difficulty: number): SignParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = rng.int(3, hard ? 8 : 7);
    const xFirst = rng.chance(0.5);
    const plain = hard ? rng.int(1, 3) : 1;
    const neg = -rng.int(hard ? 2 : 1, hard ? 5 : 4);
    // x in the first part: (ax - b)^n. x in the second: (a - bx)^n.
    const br = xFirst ? plainBracket(n, plain, neg, true) : plainBracket(n, plain, neg, false);
    const m = rng.int(1, n - 1);
    const r = rFor(br, m)!;
    // Two labels the same would make a fork with one way out.
    if (r === n - r) continue;
    return { br, m };
  }
}

/**
 * Is the x^m term positive or negative? Find the power of the negative part,
 * then whether that power is even or odd. The slip is to count the power of
 * x instead, which is the other part's power whenever x sits in the first.
 */
const signFlow: Generator<SignParams> = {
  id: 'bin-sign-flow',
  sample: sampleSigned,
  render: ({ br, m }): Slide => {
    const { b, q, n } = br;
    const r = rFor(br, m)!;
    const negative = monoTex(b, q);
    const parity = (k: number) => ({
      id: `parity${k}`,
      ask: `Is $${k}$ even or odd?`,
      branches: [
        { label: 'Even', outcome: `An even power of a negative is positive, so the $x^{${m}}$ term is **positive**.` },
        { label: 'Odd', outcome: `An odd power of a negative is negative, so the $x^{${m}}$ term is **negative**.` },
      ],
    });
    const wrong = n - r;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Is the $${termTex(1, m)}$ term of this expansion positive or negative? Decide without working it out.` }],
      subject: bracketTex(br),
      steps: [
        {
          id: 'power',
          ask: `In the $${termTex(1, m)}$ term, what power is $${negative}$ raised to?`,
          branches: turned(
            [
              { label: `$${r}$`, to: `parity${r}` },
              { label: `$${wrong}$`, to: `parity${wrong}` },
            ],
            mix(n, m, b),
          ),
        },
        parity(r),
        parity(wrong),
      ],
      answer: [`$${r}$`, r % 2 === 0 ? 'Even' : 'Odd'],
    };
  },
  solution: ({ br, m }) => {
    const { a, p, b, q, n } = br;
    const r = rFor(br, m)!;
    const { coef } = termOf(br, r);
    return [
      {
        text: `The powers of the two parts add to $${n}$. For $x^{${m}}$, $${monoTex(a, p)}$ is to the power $${n - r}$ and $${monoTex(b, q)}$ to the power $${r}$.`,
      },
      {
        text: `$${r}$ is ${r % 2 === 0 ? 'even' : 'odd'}, so $(${b})^{${r}}$ is ${r % 2 === 0 ? 'positive' : 'negative'}, and the term is ${coef > 0 ? 'positive' : 'negative'}: $${monoTex(coef, m)}$.`,
      },
    ];
  },
};

interface TermParams {
  br: Bracket;
  /** The power of x in the term asked about. */
  m: number;
}

/**
 * (ax + b)^n or (a + bx)^n and one of its middle terms. Easier: one part is x
 * or 1 and the other positive. Harder: both parts carry a number, and the
 * second can be negative.
 */
function samplePlain(rng: Rng, difficulty: number, nMin: number, nMax: number, maxCoef = 3000): TermParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = rng.int(nMin, nMax);
    const a = hard ? rng.int(1, 3) : 1;
    const b = hard ? rng.pick([-4, -3, -2, -1, 2, 3, 4]) : rng.int(2, 4);
    if (hard && a === 1 && Math.abs(b) === 1) continue;
    const br = plainBracket(n, a, b, rng.chance(0.5));
    const { coef, power } = termOf(br, rng.int(1, n - 1));
    if (Math.abs(coef) > maxCoef) continue;
    return { br, m: power };
  }
}

/** A term's coefficient with a slip: the power of the first part's number forgotten. */
function withoutFirstPower(br: Bracket, r: number): number {
  return nCr(br.n, r) * br.b ** r;
}

/**
 * One term, assembled: the number from the triangle, each part raised to its
 * power, and what they make. The bank carries the powers swapped, a negative
 * part with its sign dropped, a number left outside its bracket, and the
 * term with the first part's number forgotten.
 */
const termTiles: Generator<TermParams> = {
  id: 'bin-term-tiles',
  sample: (rng, difficulty) => samplePlain(rng, difficulty, 3, difficulty > 1 ? 6 : 5),
  render: ({ br, m }): Slide => {
    const { a, p, b, q, n } = br;
    const r = rFor(br, m)!;
    const { coef } = termOf(br, r);
    const answer = [`${nCr(n, r)}`, partPowTex(a, p, n - r), partPowTex(b, q, r), monoTex(coef, m)];
    const slips = [
      `${nCr(n, r === 1 ? 2 : r - 1)}`,
      partPowTex(a, p, r),
      partPowTex(b, q, n - r),
      ...(b < 0 ? [partPowTex(-b, q, r)] : []),
      ...(a !== 1 && p === 1 && n - r > 1 ? [termTex(a, n - r)] : []),
      ...(b !== 1 && q === 1 && r > 1 ? [termTex(b, r)] : []),
      monoTex(-coef, m),
      ...(a !== 1 ? [monoTex(withoutFirstPower(br, r), m)] : []),
    ];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Build the $${termTex(1, m)}$ term of $${bracketTex(br)}$: the number from Pascal's triangle, each part of the bracket to its power, and the term they make.`,
        },
      ],
      template: '{0} \\times {1} \\times {2} = {3}',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: ({ br, m }) => termWorking(br, rFor(br, m)!),
};

interface ExpandParams {
  br: Bracket;
}

/**
 * A term's coefficient as a tile: a plus sign only after the first term, and a
 * minus always spelled `- k`. TeX draws `-81` and `- 81` alike, so a bare `-81`
 * for the first blank beside `- 81` for a later one put two identical tiles in
 * the bank, only one of them right where it was dropped.
 */
function signedToken(coef: number, first: boolean): string {
  if (coef < 0) return `- ${-coef}`;
  return first ? `${coef}` : `+ ${coef}`;
}

/** x to a power as it follows a coefficient in a tiles template: no braces round a digit. */
function xAfter(power: number): string {
  return power === 0 ? '' : power === 1 ? 'x' : `x^${power}`;
}

/**
 * The whole expansion of a bracket with numbers in it, every coefficient
 * placed with its sign. Harder brackets put a number on x as well, so its
 * powers multiply in: (2x - 3)^4.
 */
const expandTiles: Generator<ExpandParams> = {
  id: 'bin-expand-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const xFirst = rng.chance(0.5);
      const n = hard ? rng.int(3, 4) : rng.int(3, 5);
      const a = hard ? rng.int(2, 3) : 1;
      const b = hard ? rng.pick([-3, -2, -1, 1, 2, 3]) : rng.pick([-4, -3, -2, -1, 2, 3, 4]);
      // A coefficient of 1 on a power of x would read 1x^4.
      if (!xFirst && Math.abs(b) === 1) continue;
      // Keep the numbers to ones worth placing.
      if ((n === 5 && Math.abs(b) >= 3) || (n === 4 && Math.abs(b) === 4)) continue;
      return { br: plainBracket(n, a, b, xFirst) };
    }
  },
  render: ({ br }): Slide => {
    const { a, n } = br;
    const terms = Array.from({ length: n + 1 }, (_, r) => termOf(br, r));
    const fixedFirst = terms[0].coef === 1;
    let blank = 0;
    const answer: string[] = [];
    const slips: string[] = [];
    const pieces = terms.map(({ coef, power }, r) => {
      if (r === 0 && fixedFirst) return power === 0 ? '1' : `x^${power}`;
      const token = signedToken(coef, r === 0);
      answer.push(token);
      slips.push(signedToken(-coef, r === 0));
      if (a !== 1) slips.push(signedToken(withoutFirstPower(br, r), r === 0));
      slips.push(signedToken(Math.sign(coef) * nCr(n, r), r === 0));
      // The right shape from the wrong row of the triangle.
      slips.push(signedToken((coef / nCr(n, r)) * nCr(n - 1, Math.min(r, n - 1)), r === 0));
      return `{${blank++}}${xAfter(power)}`;
    });
    const template = pieces.join(' ');
    // Enough wrong tiles to make each blank a decision, not so many the bank
    // is a wall of numbers.
    const extras = [...new Set(slips)].filter((token) => !answer.includes(token)).slice(0, answer.length + 1);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Complete the expansion, signs and all.' },
        { kind: 'display', tex: `${bracketTex(br)} =` },
      ],
      template,
      bank: tileBank(answer, extras),
      answer,
    };
  },
  solution: ({ br }) => {
    const { a, p, b, q, n } = br;
    const terms = Array.from({ length: n + 1 }, (_, r) => termOf(br, r));
    return [
      { text: `Row $${n}$ of Pascal's triangle is $${rowTex(pascalRow(n))}$. Each term is one of those times $${monoTex(a, p)}$ and $${monoTex(b, q)}$ to powers adding to $${n}$.` },
      {
        tex: chain(
          ...terms.map(({ coef, power }, r) => `& ${nCr(n, r)} \\times ${partPowTex(a, p, n - r)} \\times ${partPowTex(b, q, r)} = ${monoTex(coef, power)}`),
        ),
      },
      ...(b < 0 ? [{ text: `Odd powers of $${b}$ are negative, so the signs alternate.` }] : []),
      { tex: expansionTex(bracketTex(br), terms.map(({ coef, power }) => monoTex(coef, power))) },
    ];
  },
};

/** The coefficient's arithmetic as a tree: the triangle's number times each part's number to its power. */
function coefficientExpr(br: Bracket, r: number): Expr {
  const { a, b, n } = br;
  const part = (c: number, k: number): Expr | undefined => (c === 1 ? undefined : k === 1 ? num(c) : pow(num(c), num(k)));
  const factors = [part(a, n - r), part(b, r)].filter((f): f is Expr => f !== undefined);
  return factors.reduce<Expr>((acc, factor) => bin('*', acc, factor), num(nCr(n, r)));
}

/**
 * The coefficient of one term, reduced a piece at a time: each power before
 * the products. A negative part's power is where the sign is decided.
 */
const termReduce: Generator<TermParams> = {
  id: 'bin-term-reduce',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = samplePlain(rng, difficulty, 3, 6, 5000);
      const r = rFor(params.br, params.m)!;
      // Something to raise to a power, or there is only one multiplication.
      if ((params.br.a !== 1 && params.br.n - r > 1) || (params.br.b !== 1 && r > 1)) return params;
    }
  },
  choices: ({ br, m }) => {
    const r = rFor(br, m)!;
    const { coef } = termOf(br, r);
    return numberOptions(coef, [
      -coef,
      withoutFirstPower(br, r),
      nCr(br.n, r) * br.a * br.b,
      nCr(br.n, r) * br.a ** r * br.b ** (br.n - r),
    ]);
  },
  render: ({ br, m }): Slide => {
    const expr = coefficientExpr(br, rFor(br, m)!);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `This is the coefficient of $${termTex(1, m)}$ in $${bracketTex(br)}$. Tap the part you would work out next, then choose what it comes to.`,
        },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: ({ br, m }) => termWorking(br, rFor(br, m)!),
};

/** The coefficient of x^m, typed. The choice form offers the sign slipped, a power forgotten and the powers swapped. */
const coeff: Generator<TermParams> = {
  id: 'bin-coeff',
  sample: (rng, difficulty) => samplePlain(rng, difficulty, 3, 6),
  choices: ({ br, m }) => {
    const r = rFor(br, m)!;
    const { coef } = termOf(br, r);
    return numberOptions(coef, [
      -coef,
      withoutFirstPower(br, r),
      nCr(br.n, r) * br.a ** r * br.b ** (br.n - r),
      nCr(br.n, r),
    ]);
  },
  render: ({ br, m }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `What is the coefficient of $${termTex(1, m)}$ in the expansion of $${bracketTex(br)}$?` }],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${termOf(br, rFor(br, m)!).coef}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ br, m }) => termWorking(br, rFor(br, m)!),
};

/**
 * The coefficient split into its pieces: the triangle's number, each part's
 * number to its power, their product, and the coefficient. Both parts carry a
 * number other than 1, so every slot is a real step.
 */
const splitTree: Generator<TermParams> = {
  id: 'bin-split-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n = rng.int(3, hard ? 6 : 5);
      const a = rng.int(2, 3);
      const b = hard ? rng.pick([-4, -3, -2, 2, 3, 4]) : rng.int(2, 4);
      const br = plainBracket(n, a, b, rng.chance(0.5));
      const { coef, power } = termOf(br, rng.int(1, n - 1));
      if (Math.abs(coef) <= 6000) return { br, m: power };
    }
  },
  render: ({ br, m }): Slide => {
    const { a, b, n } = br;
    const r = rFor(br, m)!;
    const ap = a ** (n - r);
    const bp = b ** r;
    const answer = [nCr(n, r), ap, bp, ap * bp, nCr(n, r) * ap * bp].map(String);
    const slips = [-bp, a * (n - r), Math.abs(b) * r, nCr(n, r === 1 ? 2 : r - 1), -ap * bp, a ** r].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Work out the coefficient of $${termTex(1, m)}$ in pieces. Fill in the number from Pascal's triangle, $${a}^{${n - r}}$, $${b < 0 ? `(${b})` : b}^{${r}}$, their product, and the coefficient.`,
        },
      ],
      expression: bracketTex(br),
      nodes: [
        { id: 'row', from: [] },
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'both', from: ['first', 'second'] },
        { id: 'coefficient', from: ['row', 'both'] },
      ],
      bank: treeBank(answer, slips),
      answer,
    };
  },
  solution: ({ br, m }) => termWorking(br, rFor(br, m)!),
};

/**
 * One term picked out and typed whole, x and all. The choice form offers the
 * sign slipped, the first part's number forgotten, and the right number on
 * the wrong power of x.
 */
const pickTerm: Generator<TermParams> = {
  id: 'bin-pick-term',
  sample: (rng, difficulty) => samplePlain(rng, difficulty, difficulty > 1 ? 5 : 4, difficulty > 1 ? 7 : 6, 5000),
  choices: ({ br, m }) => {
    const r = rFor(br, m)!;
    const { coef } = termOf(br, r);
    const option = (c: number, power: number): ChoiceOption => ({ tex: monoTex(c, power), answer: termAnswer(c, power) });
    return fourOptions(
      option(coef, m),
      option(-coef, m),
      option(withoutFirstPower(br, r), m),
      option(coef, br.n - m),
      option(nCr(br.n, r) * br.a ** r * br.b ** (br.n - r), m),
      option(coef + 1, m),
    );
  },
  render: ({ br, m }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `Find the term in $${termTex(1, m)}$ in the expansion of $${bracketTex(br)}$.` }],
    lead: '\\text{term} =',
    keypad: ALGEBRA_KEYS,
    answer: termAnswer(termOf(br, rFor(br, m)!).coef, m),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ br, m }) => termWorking(br, rFor(br, m)!),
};

interface FindKParams {
  n: number;
  r: number;
  k: number;
}

/**
 * The coefficient given, the number in the bracket missing: (1 + kx)^n. An
 * even power loses the sign, so k > 0 is stated then; an odd one keeps it.
 */
const findK: Generator<FindKParams> = {
  id: 'bin-find-k',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const r = rng.pick([2, 3]);
      const n = rng.int(4, 7);
      return { n, r, k: r === 3 ? rng.pick([-4, -3, -2, 2, 3, 4]) : rng.int(2, 5) };
    }
    return { n: rng.int(4, 8), r: rng.pick([1, 2]), k: rng.int(2, 5) };
  },
  choices: ({ n, r, k }) => {
    const value = nCr(n, r) * k ** r;
    return numberOptions(k, [value / nCr(n, r), value / n, -k, k + 1].filter(Number.isInteger));
  },
  render: ({ n, r, k }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `In the expansion of $(1 + kx)^{${n}}$, the coefficient of $${termTex(1, r)}$ is $${nCr(n, r) * k ** r}$. Find $k$${r % 2 === 0 ? ', given that $k > 0$' : ''}.`,
      },
    ],
    lead: 'k =',
    keypad: [],
    answer: `${k}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, r, k }) => {
    const value = nCr(n, r) * k ** r;
    return [
      { text: `The $x^{${r}}$ term is $${nCr(n, r)}(kx)^{${r}}$, from row $${n}$ of Pascal's triangle. Its coefficient is $${nCr(n, r)}k^{${r}}$.` },
      { tex: chain(`${nCr(n, r)}k^{${r}} &= ${value}`, `k^{${r}} &= ${k ** r}`, `k &= ${k}`) },
      ...(r % 2 === 0 ? [{ text: `$k = ${-k}$ squares to the same, which is why $k > 0$ was given.` }] : []),
    ];
  },
};

/* ---------- Level 2: nCr and the general term ---------- */

type FactorialKind = 'fact' | 'quot' | 'ncr' | 'solve';

interface FactorialParams {
  kind: FactorialKind;
  n: number;
  /** The factorial underneath: n!/m!, or m!(n - m)! for nCr. */
  m: number;
}

function factorialValue({ kind, n, m }: FactorialParams): number {
  if (kind === 'fact') return factorial(n);
  if (kind === 'quot') return factorial(n) / factorial(m);
  if (kind === 'ncr') return nCr(n, m);
  return n;
}

/** n × (n - 1) × … down to and including `to`. */
function fallingTex(n: number, to: number): string {
  return Array.from({ length: n - to + 1 }, (_, i) => n - i).join(' \\times ');
}

/**
 * Factorials, and the cancelling that makes a quotient of them small: 7!/5!
 * is 7 × 6. Harder: nCr written as factorials, and n found from n!/(n - 2)!.
 */
const factorialGen: Generator<FactorialParams> = {
  id: 'bin-factorial',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const kind = rng.pick<FactorialKind>(['quot', 'ncr', 'solve']);
      if (kind === 'quot') {
        const n = rng.int(6, 12);
        return { kind, n, m: n - rng.int(2, 3) };
      }
      if (kind === 'ncr') return { kind, n: rng.int(5, 10), m: rng.int(2, 3) };
      return { kind, n: rng.int(4, 12), m: 0 };
    }
    if (rng.chance(0.3)) return { kind: 'fact', n: rng.pick([0, 1, 3, 4, 5, 6, 7, 8]), m: 0 };
    const n = rng.int(4, 10);
    return { kind: 'quot', n, m: Math.max(2, n - rng.int(1, 3)) };
  },
  choices: (params) => {
    const { kind, n, m } = params;
    const right = factorialValue(params);
    if (kind === 'fact') return numberOptions(right, [n, n * (n - 1), factorial(n + 1), n === 0 ? 0 : factorial(n - 1)]);
    if (kind === 'quot') return numberOptions(right, [n - m, factorial(n - m), right / n, right * m]);
    if (kind === 'ncr') return numberOptions(right, [factorial(n) / factorial(n - m), nCr(n, m + 1), right * 2]);
    return numberOptions(right, [n + 1, n - 1, n + 2]);
  },
  render: (params): Slide => {
    const { kind, n, m } = params;
    const display =
      kind === 'fact'
        ? `${n}!`
        : kind === 'quot'
          ? `\\frac{${n}!}{${m}!}`
          : kind === 'ncr'
            ? `\\frac{${n}!}{${m}! \\times ${n - m}!}`
            : `\\frac{n!}{(n - 2)!} = ${n * (n - 1)}`;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: kind === 'solve' ? 'Find the whole number $n$.' : 'Work this out.' },
        { kind: 'display', tex: display },
      ],
      lead: kind === 'solve' ? 'n =' : '\\text{value} =',
      keypad: [],
      answer: `${factorialValue(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { kind, n, m } = params;
    if (kind === 'fact') {
      if (n <= 1) return [{ text: `$${n}! = 1$. $1!$ is just $1$, and $0!$ is defined as $1$ so that $${ncrTex(4, 0)} = \\frac{4!}{0! \\times 4!}$ comes out as $1$.` }];
      return [{ text: `$${n}!$ is every whole number from $${n}$ down to $1$ multiplied together.` }, { tex: `${n}! = ${fallingTex(n, 1)} = ${factorial(n)}` }];
    }
    if (kind === 'quot') {
      return [
        { text: `$${m}!$ is the end of $${n}!$: everything from $${m}$ down cancels, leaving the numbers above it.` },
        { tex: `\\frac{${n}!}{${m}!} = ${fallingTex(n, m + 1)} = ${factorialValue(params)}` },
      ];
    }
    if (kind === 'ncr') {
      const big = Math.max(m, n - m);
      const small = n - big;
      return [
        { text: `Cancel the larger factorial underneath, $${big}!$, against the top.` },
        { tex: `\\frac{${fallingTex(n, big + 1)}}{${fallingTex(small, 1)}} = \\frac{${factorial(n) / factorial(big)}}{${factorial(small)}} = ${nCr(n, m)}` },
        { text: `This is $${ncrTex(n, m)}$.` },
      ];
    }
    return [
      { text: 'Everything from $(n - 2)$ down cancels, leaving $n(n - 1)$: two whole numbers in a row.' },
      { tex: `n(n - 1) = ${n * (n - 1)} = ${n} \\times ${n - 1}` },
      { text: `So $n = ${n}$.` },
    ];
  },
};

interface NcrParams {
  n: number;
  r: number;
  /** 0 asks for nCr plainly; the rest dress it as a count of choices. */
  ctx: number;
}

const NCR_CONTEXTS = [
  (n: number, r: number) => `Work out $${ncrTex(n, r)}$.`,
  (n: number, r: number) => `A team of ${r} is picked from ${n} players. The number of different teams is $${ncrTex(n, r)}$.`,
  (n: number, r: number) => `A pizza takes ${r} toppings chosen from ${n}. The number of different pizzas is $${ncrTex(n, r)}$.`,
  (n: number, r: number) => `${r} of ${n} books go in a bag. The number of different bags is $${ncrTex(n, r)}$.`,
];

/** The smaller of r and n - r, which is how many factors survive the cancelling. */
function shortSide(n: number, r: number): number {
  return Math.min(r, n - r);
}

/**
 * nCr with the factorials cancelled: the top few numbers, divided by s!.
 *
 * s! is written as its value. A product on the right of a division would
 * render without brackets, since a reduce line brackets only a looser
 * operator, and 8 × 7 × 6 ÷ 3 × 2 does not read as what the tree holds.
 */
function ncrExpr(n: number, r: number): Expr {
  const s = shortSide(n, r);
  return bin('/', productExpr(Array.from({ length: s }, (_, i) => n - i)), num(factorial(s)));
}

/**
 * nCr with its factorials cancelled, reduced a piece at a time. Where r is
 * the long side the working uses n - r, which is the symmetry of the row.
 */
const ncrReduce: Generator<NcrParams> = {
  id: 'bin-ncr-reduce',
  sample: (rng, difficulty) => {
    const s = difficulty > 1 ? rng.int(2, 4) : rng.int(2, 3);
    const n = rng.int(2 * s, difficulty > 1 ? 12 : 10);
    return { n, r: rng.chance(0.5) ? s : n - s, ctx: rng.int(0, NCR_CONTEXTS.length - 1) };
  },
  render: ({ n, r, ctx }): Slide => {
    const s = shortSide(n, r);
    const expr = ncrExpr(n, r);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `${NCR_CONTEXTS[ctx](n, r)} ${s === r ? '' : `That equals $${ncrTex(n, s)}$, which is quicker. `}With the factorials cancelled it is the top ${s} numbers of $${n}!$ divided by $${s}! = ${factorial(s)}$. Tap the part you would work out next, then choose what it comes to.`,
        },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: ({ n, r }) => {
    const s = shortSide(n, r);
    return [
      ...(s === r ? [] : [{ text: `Choosing ${r} to take is choosing ${s} to leave, so $${ncrTex(n, r)} = ${ncrTex(n, s)}$.` }]),
      { tex: `${ncrTex(n, s)} = \\frac{${n}!}{${s}! \\times ${n - s}!}` },
      { text: `$${n - s}!$ cancels from the top, leaving ${s} numbers over $${s}!$.` },
      { tex: `\\frac{${fallingTex(n, n - s + 1)}}{${fallingTex(s, 1)}} = \\frac{${factorial(n) / factorial(n - s)}}{${factorial(s)}} = ${nCr(n, s)}` },
    ];
  },
};

interface NcrRowParams {
  n: number;
  rs: number[];
}

/**
 * Row n of the triangle read as nC0, nC1, …: which entry is which. The slip
 * is counting from 1, which lands one place over.
 */
const ncrRowTiles: Generator<NcrRowParams> = {
  id: 'bin-ncr-row',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const n = hard ? rng.int(6, 9) : rng.int(4, 7);
    return { n, rs: pickPositions(rng, 0, n, hard ? 3 : 2) };
  },
  render: ({ n, rs }): Slide => {
    // No braces round a digit in a tiles template: {}^6C_2, not {}^{6}C_{2}.
    const template = rs.map((r, i) => `{}^${n}C_${r} = {${i}}`).join(' \\qquad ');
    const answer = rs.map((r) => `${nCr(n, r)}`);
    const slips = rs.flatMap((r) => [nCr(n, r + 1), nCr(n, r - 1), nCr(n - 1, r), n * r]);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Row $${n}$ of Pascal's triangle is below. Its first number is $${ncrTex(n, 0)}$. Fill in each value.` },
        { kind: 'display', tex: rowTex(pascalRow(n)) },
      ],
      template,
      bank: tileBank(answer, slips.filter((v) => v > 0).map(String)),
      answer,
    };
  },
  solution: ({ n, rs }) => [
    { text: `Count along from $0$: the first number is $${ncrTex(n, 0)}$, the second $${ncrTex(n, 1)}$, and so on to $${ncrTex(n, n)}$.` },
    { tex: column(rs.map((r) => [ncrTex(n, r), nCr(n, r)])) },
  ],
};

type NcrFactKind = 'mirror' | 'edge' | 'rule';

interface NcrFactParams {
  kind: NcrFactKind;
  n: number;
  r: number;
}

/** What the facts ask for: the missing r, or the value of an edge entry. */
function ncrFactAnswer({ kind, n, r }: NcrFactParams): number {
  if (kind === 'mirror') return n - r;
  if (kind === 'rule') return r + 1;
  return nCr(n, r);
}

/**
 * The shape of a row in nCr: the ends are 1 and n, the row reads the same
 * both ways, and two neighbours add to the one below them.
 */
const ncrFacts: Generator<NcrFactParams> = {
  id: 'bin-ncr-facts',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = hard ? rng.pick<NcrFactKind>(['mirror', 'rule', 'rule']) : rng.pick<NcrFactKind>(['mirror', 'edge']);
    for (;;) {
      const n = rng.int(hard ? 7 : 5, hard ? 15 : 12);
      if (kind === 'edge') return { kind, n, r: rng.pick([0, 1, n - 1, n]) };
      const r = rng.int(1, n - 2);
      if (kind === 'mirror' && 2 * r === n) continue;
      return { kind, n, r };
    }
  },
  choices: (params) => {
    const { kind, n, r } = params;
    const right = ncrFactAnswer(params);
    if (kind === 'mirror') return numberOptions(right, [r, n, n - r + 1, n - r - 1]);
    if (kind === 'rule') return numberOptions(right, [r, r + 2, 2 * r + 1]);
    return numberOptions(right, [0, 1, n, n - 1, n + 1]);
  },
  render: (params): Slide => {
    const { kind, n, r } = params;
    const text =
      kind === 'mirror'
        ? `$${ncrTex(n, r)} = {}^{${n}}C_{k}$ for another whole number $k$. What is $k$?`
        : kind === 'rule'
          ? `$${ncrTex(n, r)} + ${ncrTex(n, r + 1)} = {}^{${n + 1}}C_{k}$. What is $k$?`
          : `What is $${ncrTex(n, r)}$?`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text }],
      lead: kind === 'edge' ? '\\text{value} =' : 'k =',
      keypad: [],
      answer: `${ncrFactAnswer(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ kind, n, r }) => {
    if (kind === 'mirror') {
      return [
        { text: `Row $${n}$ reads the same from either end, so $${ncrTex(n, r)} = ${ncrTex(n, n - r)}$: choosing ${r} to take is choosing ${n - r} to leave.` },
        { tex: `${ncrTex(n, r)} = ${ncrTex(n, n - r)} = ${nCr(n, r)}` },
      ];
    }
    if (kind === 'rule') {
      return [
        { text: 'Two neighbours in a row add to the number between them in the row below, one place further along.' },
        { tex: `${ncrTex(n, r)} + ${ncrTex(n, r + 1)} = ${ncrTex(n + 1, r + 1)}` },
        { tex: `${nCr(n, r)} + ${nCr(n, r + 1)} = ${nCr(n + 1, r + 1)}` },
      ];
    }
    return [
      { text: `Row $${n}$ starts $1, ${n}, \\dots$ and ends $\\dots, ${n}, 1$. $${ncrTex(n, r)}$ is ${r === 0 ? 'the first' : r === n ? 'the last' : r === 1 ? 'the second' : 'the second from the end'}.` },
      { tex: `${ncrTex(n, r)} = ${nCr(n, r)}` },
    ];
  },
};

/** The general term, r left as a letter. */
function generalTermTex(br: Bracket, r = 'r'): string {
  const { a, p, b, q, n } = br;
  const part = (c: number, e: number) => (e === 0 && c > 0 ? `${c}` : `\\left(${monoTex(c, e)}\\right)`);
  // A part that is just 1 stays 1 at any power, so it is left out.
  const raised = (c: number, e: number, power: string) => (c === 1 && e === 0 ? '' : ` \\, ${part(c, e)}^{${power}}`);
  return `{}^{${br.n}}C_{${r}}${raised(a, p, `${n} - ${r}`)}${raised(b, q, r)}`;
}

/**
 * Which r? The general term carries the second part to the power r, so the
 * answer depends on which part x sits in: r = m when it is the second, and
 * n - m when it is the first.
 */
const whichRFlow: Generator<TermParams> = {
  id: 'bin-which-r-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = samplePlain(rng, difficulty, 4, 8, 1e9);
      const r = rFor(params.br, params.m)!;
      if (2 * r !== params.br.n) return params;
    }
  },
  render: ({ br, m }): Slide => {
    const { a, p, b, q, n } = br;
    const r = rFor(br, m)!;
    const first = monoTex(a, p);
    const second = monoTex(b, q);
    const xFirst = p !== 0;
    const outcome = (k: number) => `So the $x^{${m}}$ term is $${ncrTex(n, k)} \\, (${first})^{${n - k}} (${second})^{${k}}$.`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `The general term of this expansion is $${generalTermTex(br)}$. Which $r$ gives the $${termTex(1, m)}$ term?`,
        },
      ],
      subject: bracketTex(br),
      steps: [
        {
          id: 'where',
          ask: 'Which part of the bracket carries the $x$?',
          branches: [
            { label: `The first, $${first}$`, to: 'first' },
            { label: `The second, $${second}$`, to: 'second' },
          ],
        },
        {
          id: 'first',
          ask: `Then $${first}$ is raised to the power $${m}$, and its power is $${n} - r$. So:`,
          branches: [
            { label: `$r = ${n - m}$`, outcome: outcome(n - m) },
            { label: `$r = ${m}$`, outcome: outcome(m) },
          ],
        },
        {
          id: 'second',
          ask: `Then $${second}$ is raised to the power $${m}$, and its power is $r$. So:`,
          branches: [
            { label: `$r = ${m}$`, outcome: outcome(m) },
            { label: `$r = ${n - m}$`, outcome: outcome(n - m) },
          ],
        },
      ],
      answer: [xFirst ? `The first, $${first}$` : `The second, $${second}$`, `$r = ${r}$`],
    };
  },
  solution: ({ br, m }) => {
    const { a, p, b, q, n } = br;
    const r = rFor(br, m)!;
    return [
      { text: `In $${generalTermTex(br)}$ the second part, $${monoTex(b, q)}$, has the power $r$ and the first has $${n} - r$.` },
      {
        text:
          p !== 0
            ? `$x$ is in the first part, so its power $${n} - r$ must be $${m}$: $r = ${r}$.`
            : `$x$ is in the second part, so its power $r$ must be $${m}$: $r = ${r}$.`,
      },
      { tex: `${ncrTex(n, r)} \\, (${monoTex(a, p)})^{${n - r}} (${monoTex(b, q)})^{${r}} = ${monoTex(termOf(br, r).coef, m)}` },
    ];
  },
};

/** Up to two values of r either side whose nCr is genuinely different: never the mirror, which is equal. */
function otherR(n: number, r: number): number[] {
  return [r + 1, r - 1, r + 2, r - 2].filter((k) => k >= 0 && k <= n && nCr(n, k) !== nCr(n, r)).slice(0, 2);
}

/**
 * The general term assembled in nCr notation: which nCr, and each part to its
 * power. The mirror nCr is never offered as a wrong tile, since it is equal.
 */
const generalTiles: Generator<TermParams> = {
  id: 'bin-general-tiles',
  sample: (rng, difficulty) => samplePlain(rng, difficulty, 5, 8, 1e9),
  render: ({ br, m }): Slide => {
    const { a, p, b, q, n } = br;
    const r = rFor(br, m)!;
    const answer = [ncrTex(n, r), partPowTex(a, p, n - r), partPowTex(b, q, r)];
    const slips = [
      ...otherR(n, r).map((k) => ncrTex(n, k)),
      partPowTex(a, p, r),
      partPowTex(b, q, n - r),
      ...(b < 0 ? [partPowTex(-b, q, r)] : []),
      ...(a !== 1 && p === 1 && n - r > 1 ? [termTex(a, n - r)] : []),
      ...(b !== 1 && q === 1 && r > 1 ? [termTex(b, r)] : []),
    ];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Write the $${termTex(1, m)}$ term of $${bracketTex(br)}$ as an nCr times each part of the bracket to its power.`,
        },
      ],
      template: '{0} \\times {1} \\times {2}',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: ({ br, m }) => {
    const { a, p, b, q, n } = br;
    const r = rFor(br, m)!;
    return [
      { text: `The general term is $${generalTermTex(br)}$.` },
      { text: `For $x^{${m}}$, $r = ${r}$: $${monoTex(a, p)}$ to the power $${n - r}$ and $${monoTex(b, q)}$ to the power $${r}$.` },
      { tex: `${ncrTex(n, r)} \\times ${partPowTex(a, p, n - r)} \\times ${partPowTex(b, q, r)} = ${monoTex(termOf(br, r).coef, m)}` },
    ];
  },
};

/** The whole coefficient as one line: nCr with its factorials cancelled, times each part's number to its power. */
function generalExpr(br: Bracket, r: number): Expr {
  const { a, b, n } = br;
  const part = (c: number, k: number): Expr | undefined => (c === 1 ? undefined : k === 1 ? num(c) : pow(num(c), num(k)));
  const factors = [part(a, n - r), part(b, r)].filter((f): f is Expr => f !== undefined);
  return factors.reduce<Expr>((acc, factor) => bin('*', acc, factor), ncrExpr(n, r));
}

/**
 * The coefficient from the general term, nCr and all, reduced a piece at a
 * time. Its pick-one form is the same line to evaluate in the head.
 */
const generalReduce: Generator<TermParams> = {
  id: 'bin-general-reduce',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = samplePlain(rng, difficulty, 5, difficulty > 1 ? 8 : 7, 20000);
      const r = rFor(params.br, params.m)!;
      const s = shortSide(params.br.n, r);
      if (s < 2 || s > 3) continue;
      if ((params.br.a !== 1 && params.br.n - r > 1) || (params.br.b !== 1 && r > 1)) return params;
    }
  },
  choices: ({ br, m }) => {
    const r = rFor(br, m)!;
    const { coef } = termOf(br, r);
    const s = shortSide(br.n, r);
    return numberOptions(coef, [-coef, (coef / nCr(br.n, r)) * (factorial(br.n) / factorial(br.n - s)), withoutFirstPower(br, r), coef * 2]);
  },
  render: ({ br, m }): Slide => {
    const r = rFor(br, m)!;
    const expr = generalExpr(br, r);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `The coefficient of $${termTex(1, m)}$ in $${bracketTex(br)}$ uses $${ncrTex(br.n, r)}$, written below with its factorials cancelled. Tap the part you would work out next, then choose what it comes to.`,
        },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: ({ br, m }) => {
    const r = rFor(br, m)!;
    const s = shortSide(br.n, r);
    return [
      { text: `The general term is $${generalTermTex(br)}$, and $x^{${m}}$ needs $r = ${r}$.` },
      { tex: `${ncrTex(br.n, r)} = \\frac{${fallingTex(br.n, br.n - s + 1)}}{${fallingTex(s, 1)}} = ${nCr(br.n, r)}` },
      ...termWorking(br, r).slice(1),
    ];
  },
};

/** The coefficient of x^m with n up to 8, where the row is further down than most people know by heart. */
const coeffNcr: Generator<TermParams> = {
  id: 'bin-coeff-ncr',
  sample: (rng, difficulty) => samplePlain(rng, difficulty, 5, 8, 20000),
  choices: ({ br, m }) => {
    const r = rFor(br, m)!;
    const { coef } = termOf(br, r);
    const [other] = otherR(br.n, r);
    return numberOptions(coef, [
      -coef,
      withoutFirstPower(br, r),
      nCr(br.n, r) * br.a ** r * br.b ** (br.n - r),
      nCr(br.n, other) * br.a ** (br.n - r) * br.b ** r,
    ]);
  },
  render: ({ br, m }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `Find the coefficient of $${termTex(1, m)}$ in the expansion of $${bracketTex(br)}$.` }],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${termOf(br, rFor(br, m)!).coef}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ br, m }) => {
    const r = rFor(br, m)!;
    return [
      { text: `The general term is $${generalTermTex(br)}$. For $x^{${m}}$, $r = ${r}$, and $${ncrTex(br.n, r)} = ${nCr(br.n, r)}$.` },
      ...termWorking(br, r).slice(1),
    ];
  },
};

/** x^m for display, including powers below zero as a fraction. */
function powerTex(m: number): string {
  if (m >= 0) return termTex(1, m);
  return m === -1 ? '\\frac{1}{x}' : `\\frac{1}{x^{${-m}}}`;
}

/**
 * A bracket with x in a denominator: the term independent of x, or harder, a
 * named power. The general term's power of x is set equal to what is wanted,
 * which is what finds r.
 */
const freeTerm: Generator<TermParams> = {
  id: 'bin-free-term',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const b = rng.pick([-3, -2, -1, 1, 2, 3]);
      const shape = rng.int(0, 2);
      const br: Bracket =
        shape === 0
          ? { a: hard ? rng.int(1, 2) : 1, p: 1, b, q: -1, n: rng.pick(hard ? [4, 6, 8] : [4, 6]) }
          : shape === 1
            ? { a: 1, p: 2, b, q: -1, n: rng.pick([3, 6]) }
            : { a: 2, p: 1, b, q: -1, n: 4 };
      const m = hard ? rng.pick([0, 2, -2, 3, -3, 4]) : 0;
      const r = rFor(br, m);
      if (r === undefined || r === 0 || r === br.n) continue;
      if (Math.abs(termOf(br, r).coef) > 20000) continue;
      return { br, m };
    }
  },
  choices: ({ br, m }) => {
    const r = rFor(br, m)!;
    const { coef } = termOf(br, r);
    return numberOptions(coef, [-coef, termOf(br, r - 1).coef, termOf(br, r + 1).coef, nCr(br.n, r)]);
  },
  render: ({ br, m }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text:
          m === 0
            ? `Find the term independent of $x$ in the expansion of $${bracketTex(br)}$.`
            : `Find the coefficient of $${powerTex(m)}$ in the expansion of $${bracketTex(br)}$.`,
      },
    ],
    lead: m === 0 ? '\\text{term} =' : '\\text{coefficient} =',
    keypad: [],
    answer: `${termOf(br, rFor(br, m)!).coef}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ br, m }) => {
    const { a, p, b, q, n } = br;
    const r = rFor(br, m)!;
    const powerOfX = `${p === 1 ? '' : p}(${n} - r) - r`;
    return [
      { text: `The general term is $${generalTermTex(br)}$.` },
      { text: `Its power of $x$ is $${powerOfX}$. ${m === 0 ? 'Independent of $x$ means that power is $0$.' : `Set it equal to $${m}$.`}` },
      { tex: `${powerOfX} = ${m} \\implies r = ${r}` },
      {
        tex: `${ncrTex(n, r)} \\times ${partPowTex(a, 0, n - r)} \\times ${partPowTex(b, 0, r)} = ${nCr(n, r)} \\times ${a ** (n - r)} \\times ${b ** r < 0 ? `(${b ** r})` : b ** r} = ${termOf(br, r).coef}`,
      },
      { text: `The $x$ parts cancel to $${powerTex(q * r + p * (n - r))}$, as they had to.` },
    ];
  },
};

interface FindNParams {
  n: number;
  r: number;
  a: number;
}

/** (1 + ax)^n with its x or x^2 coefficient given: find n. */
const findN: Generator<FindNParams> = {
  id: 'bin-find-n',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { n: rng.int(4, 12), r: 2, a: rng.int(1, 3) };
    return rng.chance(0.5) ? { n: rng.int(4, 12), r: 2, a: 1 } : { n: rng.int(3, 9), r: 1, a: rng.int(2, 5) };
  },
  choices: ({ n }) => numberOptions(n, [n + 1, n - 1, n + 2]),
  render: ({ n, r, a }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `In the expansion of $(1 + ${a === 1 ? '' : a}x)^{n}$, the coefficient of $${termTex(1, r)}$ is $${nCr(n, r) * a ** r}$. Find $n$.`,
      },
    ],
    lead: 'n =',
    keypad: [],
    answer: `${n}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, r, a }) => {
    const value = nCr(n, r) * a ** r;
    if (r === 1) {
      return [
        { text: `The $x$ term is $${ncrTex('n', 1)}(${a}x) = ${a}nx$, since $${ncrTex('n', 1)} = n$.` },
        { tex: `${a}n = ${value} \\implies n = ${n}` },
      ];
    }
    return [
      { text: `The $x^2$ term is $${ncrTex('n', 2)}(${a === 1 ? 'x' : `${a}x`})^2$, and $${ncrTex('n', 2)} = \\frac{n(n - 1)}{2}$.` },
      { tex: chain(`\\frac{n(n - 1)}{2}${a === 1 ? '' : ` \\times ${a * a}`} &= ${value}`, `n(n - 1) &= ${n * (n - 1)}`, `&= ${n} \\times ${n - 1}`) },
      { text: `So $n = ${n}$: two whole numbers in a row that multiply to $${n * (n - 1)}$.` },
    ];
  },
};

interface SeriesParams {
  n: number;
  /** The number in front of the constant: (a + kx)^n. */
  a: number;
  k: number;
}

/**
 * The first three terms of (a + kx)^n in ascending powers. The slip worth
 * offering is k left unsquared in the x^2 term.
 */
const approxTiles: Generator<SeriesParams> = {
  id: 'bin-approx-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { n: rng.int(hard ? 4 : 3, 8), a: hard ? rng.int(1, 2) : 1, k: rng.pick(hard ? [-3, -2, -1, 1, 2, 3] : [-3, -2, -1, 2, 3]) };
  },
  render: ({ n, a, k }): Slide => {
    const c0 = a ** n;
    const c1 = n * a ** (n - 1) * k;
    const c2 = nCr(n, 2) * a ** (n - 2) * k * k;
    const answer = [...(a === 1 ? [] : [`${c0}`]), signedToken(c1, false), signedToken(c2, false)];
    const slips = [
      signedToken(-c1, false),
      signedToken(nCr(n, 2) * a ** (n - 2) * k, false),
      signedToken(-c2, false),
      signedToken(n * k, false),
      // With k = ±1 the slips above all land on the answer, so two more.
      signedToken(n + k, false),
      signedToken(2 * c2, false),
      ...(a === 1 ? [] : [`${a * n}`, `${a}`]),
    ];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Write the first three terms of the expansion of $\\left(${sumTex([`${a}`, termTex(k, 1)])}\\right)^{${n}}$, in ascending powers of $x$.`,
        },
      ],
      template: a === 1 ? '1 {0}x {1}x^2 + \\dots' : '{0} {1}x {2}x^2 + \\dots',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: ({ n, a, k }) => [
    { text: `The terms start $${ncrTex(n, 0)}, ${ncrTex(n, 1)}, ${ncrTex(n, 2)}$: $1, ${n}, ${nCr(n, 2)}$. The second part, $${termTex(k, 1)}$, is squared whole in the third term.` },
    {
      tex: chain(
        `& ${a}^{${n}} = ${a ** n}`,
        `& ${n} \\times ${a}^{${n - 1}} \\times (${termTex(k, 1)}) = ${termTex(n * a ** (n - 1) * k, 1)}`,
        `& ${nCr(n, 2)} \\times ${a}^{${n - 2}} \\times (${termTex(k, 1)})^{2} = ${termTex(nCr(n, 2) * a ** (n - 2) * k * k, 2)}`,
      ),
    },
  ],
};

interface ApproxParams {
  n: number;
  /** x in hundredths: 2 is 0.02, -3 is -0.03. */
  d: number;
}

/** units / scale as a decimal: 1104 / 1000 is 1.104. Exact for the whole numbers used here. */
function dec(units: number, scale: number): string {
  return String(units / scale);
}

/** The three-term estimate, in ten-thousandths. */
function threeTerms({ n, d }: ApproxParams): number {
  return 10000 + 100 * n * d + nCr(n, 2) * d * d;
}

/** The number being raised to the power: 1.02 for d = 2. */
function baseOf(d: number): string {
  return dec(100 + d, 100);
}

/** Options in ten-thousandths, the slips first, then near misses a thousandth apart. */
function decimalOptions(correct: number, slips: number[]): ChoiceOption[] {
  const near = [10, -10, 20, -20, 30].map((k) => correct + k);
  const wrong = [...slips, ...near].filter((units) => units !== correct);
  return fourOptions(
    { tex: dec(correct, 10000), answer: dec(correct, 10000) },
    ...wrong.map((units) => ({ tex: dec(units, 10000), answer: dec(units, 10000) })),
  );
}

/**
 * (1.02)^5 from the first three terms of (1 + x)^5 with x = 0.02. The exact
 * power is a different number, which is the point: the question is the
 * estimate.
 */
const approx: Generator<ApproxParams> = {
  id: 'bin-approx',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const size = rng.int(1, 5);
    return { n: rng.int(hard ? 4 : 3, hard ? 10 : 8), d: hard && rng.chance(0.5) ? -size : size };
  },
  choices: (params) => {
    const { n, d } = params;
    const right = threeTerms(params);
    return decimalOptions(right, [
      10000 + 100 * n * d,
      10000 + 100 * n * d + 100 * nCr(n, 2) * d,
      10000 + 100 * n * d + n * d * d,
      10000 - 100 * n * d + nCr(n, 2) * d * d,
    ]);
  },
  render: ({ n, d }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Use the first three terms of the expansion of $(1 + x)^{${n}}$ to estimate $(${baseOf(d)})^{${n}}$.`,
      },
    ],
    lead: '\\text{estimate} =',
    keypad: [],
    answer: dec(threeTerms({ n, d }), 10000),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { n, d } = params;
    const x = dec(d, 100);
    return [
      { text: `$${baseOf(d)} = 1 + (${x})$, so put $x = ${x}$ into $1 + ${n}x + ${nCr(n, 2)}x^2$.` },
      {
        tex: chain(
          `& 1 + ${n} \\times ${d < 0 ? `(${x})` : x}`,
          `&\\quad + ${nCr(n, 2)} \\times ${d < 0 ? `(${x})` : x}^{2}`,
          `&= 1 + ${d < 0 ? `(${dec(n * d, 100)})` : dec(n * d, 100)} + ${dec(nCr(n, 2) * d * d, 10000)}`,
          `&= ${dec(threeTerms(params), 10000)}`,
        ),
      },
      { text: 'The terms after these are far smaller, because each carries a higher power of a small number.' },
    ];
  },
};

/** A decimal in a line of working: bracketed when negative, unless it opens the line. */
function inLine(value: string): string {
  return value.startsWith('-') ? `(${value})` : value;
}

/**
 * The same estimate worked a step at a time: the square, the two products,
 * and the sums. Each bank holds the decimal point one place out.
 */
const threeTermsSteps: Generator<ApproxParams> = {
  id: 'bin-three-terms-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const size = rng.int(1, 5);
    return { n: rng.int(3, hard ? 10 : 8), d: hard && rng.chance(0.5) ? -size : size };
  },
  render: (params): Slide => {
    const { n, d } = params;
    const c2 = nCr(n, 2);
    const x = inLine(dec(d, 100));
    const square = dec(d * d, 10000);
    const second = dec(c2 * d * d, 10000);
    const first = dec(n * d, 100);
    const partial = dec(100 + n * d, 100);
    const total = dec(threeTerms(params), 10000);
    const bank = (right: string, ...wrong: string[]) => [...new Set([right, ...wrong])].sort();
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Estimate $(${baseOf(d)})^{${n}}$ from $(1 + x)^{${n}} \\approx 1 + ${n}x + ${c2}x^2$ with $x = ${dec(d, 100)}$. Tap the step to do next, then choose what it gives.`,
        },
      ],
      start: ['1', '+', `${n}`, '\\times', x, '+', `${c2}`, '\\times', `${x}^{2}`],
      reductions: [
        {
          span: [8, 9],
          operator: 8,
          value: square,
          bank: bank(square, dec(d * d, 1000), dec(2 * Math.abs(d), 100), dec(d * d, 100000), ...(d < 0 ? [dec(-d * d, 10000)] : [])),
        },
        {
          span: [6, 9],
          operator: 7,
          value: second,
          bank: bank(second, dec(c2 * d * d, 1000), dec(c2 * d * d, 100000), dec(c2 + d * d, 10000)),
        },
        {
          span: [2, 5],
          operator: 3,
          value: inLine(first),
          bank: bank(inLine(first), inLine(dec(-n * d, 100)), inLine(dec(n * d, 1000)), inLine(dec(n * d, 10))),
        },
        {
          span: [0, 3],
          operator: 1,
          value: partial,
          bank: bank(partial, dec(100 - n * d, 100), dec(1000 + n * d, 1000), dec(100 + n * d * 10, 100)),
        },
        {
          span: [0, 3],
          operator: 1,
          value: total,
          bank: bank(total, dec(threeTerms(params) - 2 * c2 * d * d, 10000), dec(10000 + 100 * n * d + 10 * c2 * d * d, 10000), dec(10000 + 100 * n * d + c2 * d * d * 100, 10000)),
        },
      ],
    };
  },
  solution: (params) => {
    const { n, d } = params;
    const c2 = nCr(n, 2);
    return [
      { text: 'The power first, then each product, then the sums.' },
      { tex: `${inLine(dec(d, 100))}^{2} = ${dec(d * d, 10000)}` },
      {
        tex: column([
          [`${n} \\times ${inLine(dec(d, 100))}`, dec(n * d, 100)],
          [`${c2} \\times ${dec(d * d, 10000)}`, dec(c2 * d * d, 10000)],
        ]),
      },
      { tex: `1 + ${inLine(dec(n * d, 100))} + ${dec(c2 * d * d, 10000)} = ${dec(threeTerms(params), 10000)}` },
    ];
  },
};

interface ApproxXParams {
  n: number;
  /** The bracket is (1 + kx)^n. */
  k: number;
  /** x in hundredths. */
  x100: number;
}

/**
 * Which x turns (1 + kx)^n into the power being estimated: solve 1 + kx =
 * the number. The slips are the sign, the change left undivided, and the
 * number itself.
 */
const approxX: Generator<ApproxXParams> = {
  id: 'bin-approx-x',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      n: rng.int(4, 8),
      k: rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]),
      x100: rng.pick(hard ? [1, 2, 3, 5] : [1, 2]),
    };
  },
  choices: ({ k, x100 }) => {
    const option = (hundredths: number): ChoiceOption => ({ tex: `x = ${dec(hundredths, 100)}`, answer: dec(hundredths, 100) });
    return fourOptions(option(x100), option(-x100), option(k * x100), option(100 + k * x100), option(x100 * 10));
  },
  render: ({ n, k, x100 }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `To estimate $(${dec(100 + k * x100, 100)})^{${n}}$ from the expansion of $(${sumTex(['1', termTex(k, 1)])})^{${n}}$, which value of $x$ do you use?`,
      },
    ],
    lead: 'x =',
    keypad: [],
    answer: dec(x100, 100),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ k, x100 }) => [
    { text: `The bracket must equal the number being raised to the power.` },
    { tex: chain(`1 + ${k < 0 ? `(${k})` : k}x &= ${dec(100 + k * x100, 100)}`, `${k < 0 ? `(${k})` : k}x &= ${dec(k * x100, 100)}`, `x &= ${dec(x100, 100)}`) },
  ],
};

interface ProductParams {
  /** The first bracket is (p + qx). */
  p: number;
  q: number;
  /** The expansion is of (1 + bx)^n. */
  b: number;
  n: number;
  /** The power of x asked about. */
  m: number;
}

/** The coefficient of x^j in (1 + bx)^n. */
function inner({ b, n }: ProductParams, j: number): number {
  return nCr(n, j) * b ** j;
}

function productCoefficient(params: ProductParams, m = params.m): number {
  return params.p * inner(params, m) + params.q * inner(params, m - 1);
}

function productTex({ p, q, b, n }: ProductParams): string {
  return `(${sumTex([`${p}`, termTex(q, 1)])})(${sumTex(['1', termTex(b, 1)])})^{${n}}`;
}

/** A bracket times an expansion, with room between the two products that make a term. */
function sampleProduct(rng: Rng, difficulty: number, pAtLeast = 1): ProductParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = rng.int(4, hard ? 7 : 8);
    const params: ProductParams = {
      p: hard ? rng.int(pAtLeast, 3) : Math.max(pAtLeast, 1),
      q: rng.pick(hard ? [-3, -2, -1, 1, 2, 3] : [-2, -1, 2, 3]),
      b: hard ? rng.pick([-2, -1, 2]) : 1,
      n,
      m: rng.int(2, hard ? n : n - 1),
    };
    const value = productCoefficient(params);
    if (value === 0 || Math.abs(value) > 5000) continue;
    return params;
  }
}

/** The working for a product's coefficient: the two ways to make x^m. */
function productWorking(params: ProductParams): SolutionStep[] {
  const { p, q, b, n, m } = params;
  const cm = inner(params, m);
  const cm1 = inner(params, m - 1);
  return [
    {
      text: `$x^{${m}}$ comes two ways: $${p}$ times the $x^{${m}}$ term of $(${sumTex(['1', termTex(b, 1)])})^{${n}}$, and $${termTex(q, 1)}$ times its $x^{${m - 1}}$ term.`,
    },
    {
      tex: column([
        [`${ncrTex(n, m)}${b === 1 ? '' : ` \\times (${b})^{${m}}`}`, cm],
        [`${ncrTex(n, m - 1)}${b === 1 ? '' : ` \\times (${b})^{${m - 1}}`}`, cm1],
      ]),
    },
    { tex: `${p} \\times ${cm < 0 ? `(${cm})` : cm} + ${q < 0 ? `(${q})` : q} \\times ${cm1 < 0 ? `(${cm1})` : cm1} = ${productCoefficient(params)}` },
  ];
}

/** The coefficient of x^m in (p + qx)(1 + bx)^n, typed. */
const productCoeff: Generator<ProductParams> = {
  id: 'bin-product-coeff',
  sample: (rng, difficulty) => sampleProduct(rng, difficulty),
  choices: (params) => {
    const { p, q, m } = params;
    return numberOptions(productCoefficient(params), [
      p * inner(params, m),
      p * inner(params, m) + q * inner(params, m),
      p * inner(params, m) - q * inner(params, m - 1),
      q * inner(params, m - 1),
    ]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `Find the coefficient of $${termTex(1, params.m)}$ in the expansion of $${productTex(params)}$.` }],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${productCoefficient(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: productWorking,
};

/**
 * The same coefficient as a tree: the two coefficients from the expansion,
 * each multiplied by its partner from the first bracket, and the total.
 */
const twoBracketTree: Generator<ProductParams> = {
  id: 'bin-two-bracket-tree',
  sample: (rng, difficulty) => sampleProduct(rng, difficulty, 2),
  render: (params): Slide => {
    const { p, q, m } = params;
    const cm = inner(params, m);
    const cm1 = inner(params, m - 1);
    const answer = [cm, cm1, p * cm, q * cm1, productCoefficient(params)].map(String);
    const slips = [inner(params, m + 1), p * cm1, q * cm, p * cm - q * cm1, -q * cm1].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Find the coefficient of $${termTex(1, m)}$. Fill in the coefficients of $${termTex(1, m)}$ and $${termTex(1, m - 1)}$ in the expansion, then each times its partner from the first bracket, then the total.`,
        },
      ],
      expression: productTex(params),
      nodes: [
        { id: 'high', from: [] },
        { id: 'low', from: [] },
        { id: 'withP', from: ['high'] },
        { id: 'withQ', from: ['low'] },
        { id: 'total', from: ['withP', 'withQ'] },
      ],
      bank: treeBank(answer, slips),
      answer,
    };
  },
  solution: productWorking,
};

/**
 * Which terms pair up to make x^m: from the qx, the expansion must supply
 * x^(m-1); from the constant, x^m. The wrong turns name the power the
 * product would actually have.
 */
const pairFlow: Generator<ProductParams> = {
  id: 'bin-pair-flow',
  sample: (rng, difficulty) => sampleProduct(rng, difficulty),
  render: (params): Slide => {
    const { p, q, n, m } = params;
    const qx = termTex(q, 1);
    const makes = (k: number) => `Then the product is a multiple of $${termTex(1, k)}$.`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Which terms multiply together to make the $${termTex(1, m)}$ term? Take each part of the first bracket in turn.`,
        },
      ],
      subject: productTex(params),
      steps: [
        {
          id: 'withQ',
          ask: `From the first bracket take $${qx}$. Which power of $x$ must the expansion supply?`,
          branches: turned(
            [
              { label: `$${termTex(1, m - 1)}$`, to: 'withP' },
              { label: `$${termTex(1, m)}$`, outcome: makes(m + 1) },
              { label: `$${termTex(1, m + 1)}$`, outcome: makes(m + 2) },
            ],
            mix(n, m, q),
          ),
        },
        {
          id: 'withP',
          ask: `Now take the $${p}$. Which power of $x$ must the expansion supply?`,
          branches: turned(
            [
              { label: `$${termTex(1, m)}$`, outcome: `So the $${termTex(1, m)}$ term is $${p}$ times the expansion's $${termTex(1, m)}$ term plus $${qx}$ times its $${termTex(1, m - 1)}$ term.` },
              { label: `$${termTex(1, m - 1)}$`, outcome: makes(m - 1) },
            ],
            mix(p, m),
          ),
        },
      ],
      answer: [`$${termTex(1, m - 1)}$`, `$${termTex(1, m)}$`],
    };
  },
  solution: productWorking,
};

/** The first three terms of (p + qx)(1 + bx)^n, each coefficient placed. */
const productExpandTiles: Generator<ProductParams> = {
  id: 'bin-product-expand',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const params: ProductParams = {
        p: hard ? rng.int(1, 3) : 1,
        q: rng.pick(hard ? [-3, -2, -1, 1, 2, 3] : [-2, -1, 2, 3]),
        b: hard ? rng.pick([-2, -1, 2, 3]) : rng.pick([1, 2]),
        n: rng.int(3, hard ? 7 : 8),
        m: 2,
      };
      // A term that cancels to nothing leaves a tile of 0 in the answer.
      if (productCoefficient(params, 1) !== 0 && productCoefficient(params, 2) !== 0) return params;
    }
  },
  render: (params): Slide => {
    const { p, q } = params;
    const x1 = productCoefficient(params, 1);
    const x2 = productCoefficient(params, 2);
    const answer = [signedToken(x1, false), signedToken(x2, false)];
    // Each slip leaves out one of the two products, or turns a sign.
    const slips = [
      signedToken(p * inner(params, 1), false),
      signedToken(p * inner(params, 2), false),
      signedToken(q * inner(params, 1), false),
      signedToken(-x1, false),
      signedToken(p * inner(params, 2) + q * inner(params, 2), false),
      signedToken(x1 + q, false),
      signedToken(-x2, false),
      signedToken(x2 + p, false),
      signedToken(2 * x1, false),
    ].slice(0, 4);
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Expand $${productTex(params)}$ as far as the $x^2$ term.` }],
      template: `${p} {0}x {1}x^2 + \\dots`,
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: (params) => {
    const { p, q, b, n } = params;
    const inside = `(${sumTex(['1', termTex(b, 1)])})^{${n}}`;
    return [
      { text: `The expansion starts $${inside} = ${sumTex([0, 1, 2].map((j) => termTex(inner(params, j), j)))} + \\dots$` },
      { text: `Multiply each term by $${p}$, then by $${termTex(q, 1)}$, keeping only powers up to $x^2$, and collect.` },
      {
        tex: sumTex([
          termTex(p, 0),
          termTex(p * inner(params, 1), 1),
          termTex(p * inner(params, 2), 2),
          termTex(q, 1),
          termTex(q * inner(params, 1), 2),
        ]),
      },
      { tex: sumTex([termTex(p, 0), termTex(productCoefficient(params, 1), 1), termTex(productCoefficient(params, 2), 2)]) },
    ];
  },
};

/* ---------- Level 3: unknowns and conditions ---------- */

/*
 * Every question here is drawn from its answer outward: n, k and a first, then
 * the coefficients and conditions they make. A coefficient given in a prompt
 * is kept under 10000, and n stays at 8 or below wherever a coefficient is
 * worked out; where only a condition on neighbouring terms is stated, n goes
 * to 12, as nCr on its own does.
 */

/** p/q in lowest terms, the sign carried on top. */
function reduced(p: number, q: number): [number, number] {
  const g = gcd(p, q) || 1;
  const sign = q < 0 ? -1 : 1;
  return [(sign * p) / g, (sign * q) / g];
}

/** The fraction `fracTex` shows, for mathjs. */
function fracAnswer(p: number, q: number): string {
  const [top, bottom] = reduced(p, q);
  return bottom === 1 ? `${top}` : `${top}/${bottom}`;
}

function fracOption(p: number, q: number): ChoiceOption {
  return { tex: fracTex(p, q), answer: fracAnswer(p, q) };
}

/** A fraction and three wrong ones, the slips first, then a whole one either side, aimed like aimedNumbers. */
function fractionOptions(p: number, q: number, salt: number, slips: [number, number][]): ChoiceOption[] {
  const near: [number, number][] = [
    [p + q, q],
    [p - q, q],
    [p + 2 * q, q],
  ];
  return aimed(
    fracOption(p, q),
    [...slips, ...near].filter(([top, bottom]) => bottom !== 0 && top !== 0).map(([top, bottom]) => fracOption(top, bottom)),
    salt,
  );
}

/** A power of k in a tiles template, where no braces may round a digit. */
function kPow(e: number): string {
  return e === 0 ? '' : e === 1 ? 'k' : `k^${e}`;
}

/** The same power of k in prose, where braces are free. */
function kPowTex(e: number): string {
  return e === 0 ? '' : e === 1 ? 'k' : `k^{${e}}`;
}

/** A power of x named in a sentence. */
function termName(e: number): string {
  return e === 0 ? 'the constant term' : `the coefficient of $${termTex(1, e)}$`;
}

/** A number as a base, bracketed when negative. */
function baseTex(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A coefficient in front of a letter: 1 is left off, -1 leaves its sign. */
function times(c: number, letter: string): string {
  return c === 1 ? letter : c === -1 ? `-${letter}` : `${c}${letter}`;
}

/**
 * mix, finished with murmur's fmix32, for choosing a slot: mix alone keeps its
 * low bits in step with small inputs, so taking it mod 2 or mod 4 put the
 * answer in the same place more often than not.
 */
function spread(...values: number[]): number {
  let h = mix(...values) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Where the answer lands once choiceVariant has turned these options. Mirrors
 * its private rotation(); if that changes, only the slot drifts again.
 */
function landing(options: ChoiceOption[]): number {
  let hash = 0;
  for (const option of options) {
    for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
  }
  const turn = Math.abs(hash) % options.length;
  const at = options.findIndex((option) => option.correct);
  return (at - turn + options.length) % options.length;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

/**
 * The correct option and three wrong ones, chosen and ordered so the derived
 * choice slide shows the answer in the slot the salt names. Order alone cannot
 * always get there: the rotation's parity is fixed by which labels are
 * present, so other wrong options from the pool are tried as well.
 */
function aimed(correct: ChoiceOption, wrong: ChoiceOption[], salt: number): ChoiceOption[] {
  const seen = new Set([correct.tex]);
  const pool = wrong.filter((option) => {
    if (seen.has(option.tex)) return false;
    seen.add(option.tex);
    return true;
  });
  const right = { ...correct, correct: true };
  const size = Math.min(4, pool.length + 1);
  const target = salt % size;
  const choose = (from: number, left: number): ChoiceOption[][] =>
    left === 0 ? [[]] : pool.slice(from, 7).flatMap((option, i) => choose(from + i + 1, left - 1).map((rest) => [option, ...rest]));
  for (const set of choose(0, size - 1)) {
    for (const order of permutations([right, ...set])) if (landing(order) === target) return order;
  }
  return [right, ...pool.slice(0, size - 1)];
}

/** numberOptions, aimed: the slips first in the pool, then near misses. */
function aimedNumbers(correct: number, slips: number[], salt: number): ChoiceOption[] {
  const near = [1, -1, 2, -2, 3, -3].map((k) => correct + k);
  const wrong = [...slips, ...near].filter((value) => Number.isInteger(value) && value !== correct);
  return aimed(numberOption(correct), wrong.map(numberOption), salt);
}

/* --- two unknowns from two coefficients --- */

interface TwoUnknownParams {
  n: number;
  k: number;
}

function sampleTwoUnknowns(rng: Rng, difficulty: number): TwoUnknownParams {
  if (difficulty > 1) return { n: rng.int(4, 8), k: rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]) };
  return { n: rng.int(3, 8), k: rng.int(2, 6) };
}

/** The x and x^2 coefficients of (1 + kx)^n. */
function firstTwo({ n, k }: TwoUnknownParams): { A: number; B: number } {
  return { A: n * k, B: nCr(n, 2) * k * k };
}

function twoUnknownsPrompt(params: TwoUnknownParams): string {
  const { A, B } = firstTwo(params);
  return `In the expansion of $(1 + kx)^{n}$, the coefficient of $x$ is $${A}$ and the coefficient of $x^2$ is $${B}$.`;
}

/** The two equations, k from the first, and the one equation in n that is left. */
function twoUnknownsWorking(params: TwoUnknownParams): SolutionStep[] {
  const { n, k } = params;
  const { A, B } = firstTwo(params);
  const square = A * A;
  return [
    { text: 'The $x$ term is $nkx$ and the $x^2$ term is $\\frac{n(n - 1)}{2}k^2x^2$, so' },
    { tex: chain(`nk &= ${A}`, `\\frac{n(n - 1)}{2}k^2 &= ${B}`) },
    { text: `The first gives $k = \\frac{${A}}{n}$, so $k^2 = \\frac{${square}}{n^2}$. Put that into the second, and one $n$ cancels:` },
    {
      tex: chain(
        `\\frac{${square}(n - 1)}{2n} &= ${B}`,
        `${square}(n - 1) &= ${2 * B}n`,
        `${square - 2 * B}n &= ${square}`,
        `n &= ${n}`,
      ),
    },
    { text: `Then $k = \\frac{${A}}{${n}} = ${k}$.` },
  ];
}

/**
 * Which equation to rearrange, and where k goes once it is found. The wrong
 * turns are the square root the x^2 equation would need, and substituting k
 * back into the equation it came from.
 */
const twoUnknownsFlow: Generator<TwoUnknownParams> = {
  id: 'bin-two-unknowns-flow',
  sample: sampleTwoUnknowns,
  render: (params): Slide => {
    const { n, k } = params;
    const { A, B } = firstTwo(params);
    const linear = `$nk = ${A}$, for $k$`;
    const square = 'The $x^2$ one, for $k$';
    const onward = 'Into the $x^2$ equation';
    const back = `Back into $nk = ${A}$`;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${twoUnknownsPrompt(params)} Plan how to find $n$ and $k$.` }],
      subject: chain(`nk &= ${A}`, `\\frac{n(n - 1)}{2}k^2 &= ${B}`),
      steps: [
        {
          id: 'first',
          ask: 'Two equations, two unknowns. Which do you rearrange first?',
          branches: turned(
            [
              { label: linear, to: 'next' },
              {
                label: square,
                outcome: 'That needs a square root, with $n$ still inside it. The $x$ equation has $k$ to the power $1$, so start there.',
              },
            ],
            spread(n, k),
          ),
        },
        {
          id: 'next',
          ask: `With $k = \\frac{${A}}{n}$, where does it go?`,
          branches: turned(
            [
              {
                label: onward,
                outcome: `That leaves one equation with only $n$ in it, which gives $n = ${n}$, and then $k = \\frac{${A}}{${n}} = ${k}$.`,
              },
              { label: back, outcome: `That gives $${A} = ${A}$: true, and no help. It has to go into the other equation.` },
            ],
            spread(k, n, 3),
          ),
        },
      ],
      answer: [linear, onward],
    };
  },
  solution: twoUnknownsWorking,
};

/** n from the formula the substitution leaves, then k from n. */
const twoUnknownsTree: Generator<TwoUnknownParams> = {
  id: 'bin-n-then-k-tree',
  sample: sampleTwoUnknowns,
  render: (params): Slide => {
    const { n, k } = params;
    const { A, B } = firstTwo(params);
    const square = A * A;
    const answer = [square, 2 * B, square - 2 * B, n, k].map(String);
    // A doubled instead of squared, B not doubled, the bottom added, and k off by a sign or one.
    const slips = [2 * A, B, square + 2 * B, n + 1, n - 1, -k, k + 1];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${twoUnknownsPrompt(params)} Putting $k = \\frac{${A}}{n}$ into the $x^2$ equation and solving gives $n$ below. Fill in $${baseTex(A)}^2$, $2 \\times ${B}$, the bottom of the fraction, $n$ and $k$, in that order.`,
        },
      ],
      expression: chain(`n &= \\frac{${baseTex(A)}^{2}}{${baseTex(A)}^{2} - 2 \\times ${B}}`, `k &= \\frac{${A}}{n}`),
      nodes: [
        { id: 'square', from: [] },
        { id: 'twice', from: [] },
        { id: 'bottom', from: ['square', 'twice'] },
        { id: 'n', from: ['square', 'bottom'] },
        { id: 'k', from: ['n'] },
      ],
      bank: treeBank(answer, slips.map(String)),
      answer,
    };
  },
  solution: twoUnknownsWorking,
};

interface TwoUnknownAskParams extends TwoUnknownParams {
  ask: 'n' | 'k';
}

/** n or k typed. The choice form offers the x^2 coefficient divided by the x one, which is (n - 1)k. */
const twoUnknowns: Generator<TwoUnknownAskParams> = {
  id: 'bin-two-unknowns',
  sample: (rng, difficulty) => ({ ...sampleTwoUnknowns(rng, difficulty), ask: rng.pick<'n' | 'k'>(['n', 'k']) }),
  choices: ({ n, k, ask }) => {
    const { A, B } = firstTwo({ n, k });
    const salt = spread(n, k, ask === 'n' ? 1 : 2);
    if (ask === 'n') return aimedNumbers(n, [n + 1, n - 1, (2 * B) / A], salt);
    return aimedNumbers(k, [-k, (2 * B) / A, A / (n + 1), A / (n - 1)], salt);
  },
  render: ({ n, k, ask }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${twoUnknownsPrompt({ n, k })} Find $${ask}$.` }],
    lead: `${ask} =`,
    keypad: [],
    answer: `${ask === 'n' ? n : k}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, k }) => twoUnknownsWorking({ n, k }),
};

interface NextParams extends TwoUnknownParams {
  /** The power of x asked for next: 3 or 4. */
  r: number;
}

/** With n and k found, the next coefficient: nCr, then k to the power, then their product. */
const nextCoeffSteps: Generator<NextParams> = {
  id: 'bin-next-coeff-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleTwoUnknowns(rng, difficulty);
      const r = rng.pick([3, 4]);
      if (params.n < r + 1) continue;
      if (Math.abs(nCr(params.n, r) * params.k ** r) < 10000) return { ...params, r };
    }
  },
  render: ({ n, k, r }): Slide => {
    const c = nCr(n, r);
    const power = k ** r;
    const value = c * power;
    const bank = (...values: number[]) => sortTokens([...new Set(values.map(String))]);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `${twoUnknownsPrompt({ n, k })} That makes $n = ${n}$ and $k = ${k}$. Now find the coefficient of $x^{${r}}$: tap the step to do next, then choose what it gives.`,
        },
      ],
      start: [ncrTex(n, r), '\\times', `${baseTex(k)}^{${r}}`],
      reductions: [
        { span: [0, 1], value: `${c}`, bank: bank(c, nCr(n, r - 1), n * r, nCr(n + 1, r)) },
        { span: [2, 3], value: `${power}`, bank: bank(power, k * r, k ** (r - 1), -power) },
        { span: [0, 3], operator: 1, value: `${value}`, bank: bank(value, c + power, -value, nCr(n, r - 1) * power) },
      ],
    };
  },
  solution: ({ n, k, r }) => [
    { text: `The $x^{${r}}$ term is $${ncrTex(n, r)}(${k}x)^{${r}}$, so its coefficient is` },
    { tex: chain(`& ${ncrTex(n, r)} \\times ${baseTex(k)}^{${r}}`, `&= ${nCr(n, r)} \\times ${baseTex(k ** r)}`, `&= ${nCr(n, r) * k ** r}`) },
  ],
};

/* --- equal coefficients --- */

interface EqualParams {
  /**
   * n: (1 + x)^n with n unknown, so n = 2r + 1. k: (a + kx)^n with n given,
   * k unknown. nk: (1 + kx)^n with k given, n unknown.
   */
  kind: 'n' | 'k' | 'nk';
  n: number;
  /** The x^r and x^(r + 1) terms are the equal pair. */
  r: number;
  /** The constant in the bracket; 1 unless the kind is k at difficulty 2. */
  a: number;
  /** k as a fraction [top, bottom]; for kind nk it is the whole number given. */
  k: [number, number];
}

/** C(n, r) a^(n - r) and C(n, r + 1) a^(n - r - 1): what multiplies k^r and k^(r + 1). */
function equalSides({ n, r, a }: EqualParams): [number, number] {
  return [nCr(n, r) * a ** (n - r), nCr(n, r + 1) * a ** (n - r - 1)];
}

function sampleEqualK(rng: Rng, a: number): EqualParams {
  for (;;) {
    const n = rng.int(3, 8);
    const r = rng.int(1, n - 1);
    const [left, right] = equalSides({ kind: 'k', n, r, a, k: [1, 1] });
    if (left === right || Math.max(left, right) >= 10000) continue;
    return { kind: 'k', n, r, a, k: reduced(left, right) };
  }
}

function sampleEqualN(rng: Rng): EqualParams {
  const r = rng.int(1, 5);
  return { kind: 'n', n: 2 * r + 1, r, a: 1, k: [1, 1] };
}

/** k given, n unknown: n - r = (r + 1)/k, so k divides r + 1. */
function sampleEqualNK(rng: Rng): EqualParams {
  for (;;) {
    const k = rng.int(2, 5);
    const r = rng.int(1, 11);
    if ((r + 1) % k !== 0) continue;
    const n = r + (r + 1) / k;
    if (n <= 12) return { kind: 'nk', n, r, a: 1, k: [k, 1] };
  }
}

function sampleEqual(rng: Rng, difficulty: number): EqualParams {
  if (difficulty > 1) return rng.chance(0.6) ? sampleEqualK(rng, rng.int(2, 3)) : sampleEqualNK(rng);
  return rng.chance(0.25) ? sampleEqualN(rng) : sampleEqualK(rng, 1);
}

/** The bracket as the prompt writes it: letters for the unknowns. */
function equalBracketTex({ kind, n, a, k }: EqualParams): string {
  if (kind === 'n') return '(1 + x)^{n}';
  if (kind === 'nk') return `(1 + ${k[0]}x)^{n}`;
  return `(${a} + kx)^{${n}}`;
}

function equalPrompt(params: EqualParams): string {
  const { kind, r } = params;
  const pair = `the coefficients of $${termTex(1, r)}$ and $${termTex(1, r + 1)}$ are equal`;
  const find = kind === 'k' ? 'Find $k$, given that $k \\neq 0$.' : 'Find $n$.';
  return `In the expansion of $${equalBracketTex(params)}$, ${pair}. ${find}`;
}

function equalWorking(params: EqualParams): SolutionStep[] {
  const { kind, n, r, a, k } = params;
  if (kind === 'n') {
    return [
      { text: `The condition is $${ncrTex('n', r)} = ${ncrTex('n', r + 1)}$. Cancel the factorials:` },
      { tex: `\\frac{n!}{${r}!\\,(n - ${r})!} = \\frac{n!}{${r + 1}!\\,(n - ${r + 1})!}` },
      { text: `leaves $${r + 1} = n - ${r}$: a row's numbers match in neighbouring pairs only in the middle of an odd row.` },
      { tex: `n = ${2 * r + 1}` },
    ];
  }
  if (kind === 'nk') {
    const [kv] = k;
    return [
      { text: `The coefficients are $${ncrTex('n', r)}${kv}^{${r}}$ and $${ncrTex('n', r + 1)}${kv}^{${r + 1}}$. Dividing the second by the first,` },
      { tex: `\\frac{${ncrTex('n', r + 1)}}{${ncrTex('n', r)}} \\times ${kv} = \\frac{n - ${r}}{${r + 1}} \\times ${kv} = 1` },
      { tex: chain(`n - ${r} &= ${fracTex(r + 1, kv)}`, `n &= ${n}`) },
    ];
  }
  const [left, right] = equalSides(params);
  return [
    {
      text: `The $x^{${r}}$ term is $${ncrTex(n, r)}${a === 1 ? '' : ` \\times ${a}^{${n - r}}`}k^{${r}}x^{${r}}$, and the next is $${ncrTex(n, r + 1)}${a === 1 || n - r - 1 === 0 ? '' : ` \\times ${a}^{${n - r - 1}}`}k^{${r + 1}}x^{${r + 1}}$. Equal coefficients:`,
    },
    { tex: `${coeffTex(left, kPowTex(r))} = ${coeffTex(right, kPowTex(r + 1))}` },
    { text: `Divide by $${kPowTex(r)}$, which is allowed because $k \\neq 0$:` },
    { tex: `k = ${fracTex(left, right)}` },
    ...(k[1] === 1 ? [] : [{ text: 'A fraction is fine: nothing says $k$ is whole.' }]),
  ];
}

/**
 * The condition written out and solved: the two coefficients for k, or the
 * cancelled factorials for n. The bank holds the coefficients without the
 * powers of a, k upside down, and n off by one.
 */
const equalTiles: Generator<EqualParams> = {
  id: 'bin-equal-tiles',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleEqualK(rng, rng.int(2, 3)) : rng.chance(0.3) ? sampleEqualN(rng) : sampleEqualK(rng, 1)),
  render: (params): Slide => {
    const { kind, n, r, a, k } = params;
    if (kind === 'n') {
      const answer = [`${r + 1}`, `${r}`, `${2 * r + 1}`];
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: `In the expansion of $(1 + x)^{n}$, the coefficients of $${termTex(1, r)}$ and $${termTex(1, r + 1)}$ are equal: $${ncrTex('n', r)} = ${ncrTex('n', r + 1)}$. Cancelling the factorials leaves a simple equation. Fill it in and solve it.`,
          },
        ],
        template: '{0} = n - {1}, \\enspace {2} = n',
        bank: tileBank(answer, [`${r}`, `${r + 2}`, `${2 * r}`, `${2 * r + 2}`, `${r - 1}`]),
        answer,
      };
    }
    const [left, right] = equalSides(params);
    const answer = [`${left}`, `${right}`, fracTex(k[0], k[1])];
    const slips = [`${nCr(n, r)}`, `${nCr(n, r + 1)}`, fracTex(k[1], k[0]), `${nCr(n, r > 1 ? r - 1 : r + 2)}`, `${n}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `In the expansion of $(${a} + kx)^{${n}}$, where $k \\neq 0$, the coefficients of $${termTex(1, r)}$ and $${termTex(1, r + 1)}$ are equal. Write the equation that says so, then solve it.`,
        },
      ],
      template: `{0}${kPow(r)} = {1}${kPow(r + 1)}, \\enspace {2} = k`,
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: equalWorking,
};

/** n or k from the condition, typed. The choice form offers k upside down and n off by one. */
const equalCoeff: Generator<EqualParams> = {
  id: 'bin-equal-coeff',
  sample: sampleEqual,
  choices: (params) => {
    const { kind, n, r, k } = params;
    const salt = spread(n, r, params.a, k[0], k[1]);
    if (kind === 'n') return aimedNumbers(n, [2 * r, 2 * r + 2, r + 1], salt);
    if (kind === 'nk') return aimedNumbers(n, [n + 1, n - 1, 2 * r + 1], salt);
    return fractionOptions(k[0], k[1], salt, [
      [k[1], k[0]],
      [nCr(params.n, r), nCr(params.n, r + 1)],
      [-k[0], k[1]],
    ]);
  },
  render: (params): Slide => {
    const { kind, n, k } = params;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: equalPrompt(params) }],
      lead: kind === 'k' ? 'k =' : 'n =',
      keypad: kind === 'k' ? [{ insert: '/' }] : [],
      answer: kind === 'k' ? fracAnswer(k[0], k[1]) : `${n}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: equalWorking,
};

/**
 * The condition, then k from it: two forks, each with the slip that catches
 * people. The powers of k swapped, and k upside down.
 */
const equalFlow: Generator<EqualParams> = {
  id: 'bin-equal-flow',
  sample: (rng, difficulty) => sampleEqualK(rng, difficulty > 1 ? rng.int(3, 4) : rng.pick([1, 1, 2])),
  render: (params): Slide => {
    const { n, r, a } = params;
    const [left, right] = equalSides(params);
    const condition = `$${coeffTex(left, kPowTex(r))} = ${coeffTex(right, kPowTex(r + 1))}$`;
    const swapped = `$${coeffTex(left, kPowTex(r + 1))} = ${coeffTex(right, kPowTex(r))}$`;
    const solved = `$k = ${fracTex(left, right)}$`;
    const flipped = `$k = ${fracTex(right, left)}$`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `In the expansion of $(${a} + kx)^{${n}}$, where $k \\neq 0$, the coefficients of $${termTex(1, r)}$ and $${termTex(1, r + 1)}$ are equal. Find $k$.`,
        },
      ],
      subject: `(${a} + kx)^{${n}}`,
      steps: [
        {
          id: 'condition',
          ask: 'Which equation says the two coefficients are equal?',
          branches: turned(
            [
              { label: condition, to: 'solve' },
              {
                label: swapped,
                outcome: `The power of $k$ always matches the power of $x$: the $${termTex(1, r)}$ term carries $${kPowTex(r)}$.`,
              },
            ],
            spread(n, r, a),
          ),
        },
        {
          id: 'solve',
          ask: `Divide both sides by $${kPowTex(r)}$. What is $k$?`,
          branches: turned(
            [
              // With a 1 on the right, dividing leaves k itself: nothing more to divide by.
              { label: solved, outcome: right === 1 ? `Right: ${solved}.` : `Right: $${right}k = ${left}$, so ${solved}.` },
              {
                label: flipped,
                outcome:
                  right === 1
                    ? `Upside down: dividing leaves $k = ${left}$, not $k = ${fracTex(right, left)}$.`
                    : `Upside down: $${right}k = ${left}$, so $k$ is $${left}$ over $${right}$.`,
              },
            ],
            spread(a, n, r, 5),
          ),
        },
      ],
      answer: [condition, solved],
    };
  },
  solution: equalWorking,
};

interface WhichParams {
  a: number;
  b: number;
  n: number;
  /** The x^r and x^(r + 1) terms are the equal pair. */
  r: number;
  /** Where among the four pairs offered the answer sits. */
  slot: number;
}

/**
 * (a + bx)^n with a pair of equal neighbours: b(n - r) = a(r + 1). The slot is
 * drawn first and the bracket to fit it, since r sits near one end of the
 * expansion as often as not and would otherwise leave that end's slot empty.
 */
function sampleWhich(rng: Rng, difficulty: number): WhichParams {
  const slot = rng.int(0, 3);
  for (;;) {
    const a = difficulty > 1 ? rng.int(2, 5) : rng.int(1, 3);
    const b = rng.int(1, 9);
    const n = rng.int(3, 12);
    if (gcd(a, b) !== 1 || (a === b && a !== 1)) continue;
    const top = b * n - a;
    if (top % (a + b) !== 0) continue;
    const r = top / (a + b);
    // Four pairs, r the slot-th of them: slot pairs below it and the rest above.
    if (r >= slot && n - 1 - r >= 3 - slot) return { a, b, n, r, slot };
  }
}

function pairLabel(e: number): string {
  return e === 0 ? '\\text{the constant and } x' : `${termTex(1, e)} \\text{ and } ${termTex(1, e + 1)}`;
}

/** Which neighbouring pair of terms has equal coefficients: four pairs in a row, in order. */
const equalWhich: Generator<WhichParams> = {
  id: 'bin-equal-which',
  sample: sampleWhich,
  render: ({ a, b, n, r, slot }): Slide => {
    const pairs = [0, 1, 2, 3].map((i) => r - slot + i);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which two neighbouring terms in the expansion of $${bracketTex(plainBracket(n, a, b, false))}$ have equal coefficients?`,
        },
      ],
      options: pairs.map((e) => ({ id: e === r ? 'correct' : `pair${e}`, label: pairLabel(e), tex: true })),
      correctId: 'correct',
    };
  },
  solution: ({ a, b, n, r }) => [
    {
      text: `From the $x^r$ term to the next, $${ncrTex(n, 'r')}$ becomes $${ncrTex(n, 'r + 1')}$, which is $\\frac{${n} - r}{r + 1}$ times as big${
        a === 1 && b === 1 ? '' : a === 1 ? `, and one more factor of $${b}$ comes in` : `, and one factor of $${a}$ is swapped for one of $${b}$`
      }. So the coefficient is multiplied by`,
    },
    { tex: `\\frac{${b === 1 ? `${n} - r` : `${b}(${n} - r)`}}{${a === 1 ? 'r + 1' : `${a}(r + 1)`}}` },
    { text: 'The two are equal when that is $1$:' },
    {
      tex: chain(
        `${times(b, `(${n} - r)`)} &= ${times(a, '(r + 1)')}`,
        `${b * n} - ${times(b, 'r')} &= ${times(a, 'r')} + ${a}`,
        `${times(a + b, 'r')} &= ${b * n - a}`,
        `r &= ${r}`,
      ),
    },
    { text: `So the pair is $${pairLabel(r)}$.` },
  ],
};

/* --- coefficients in a ratio --- */

interface RatioParams {
  n: number;
  k: number;
  /** The coefficient of x^(r + 1) is a multiple of the coefficient of x^r. */
  r: number;
}

/** The multiple: k(n - r)/(r + 1), as [top, bottom] in lowest terms. */
function ratioOf({ n, k, r }: RatioParams): [number, number] {
  return reduced(k * (n - r), r + 1);
}

function sampleRatio(rng: Rng, difficulty: number, negative: boolean): RatioParams {
  for (;;) {
    const hard = difficulty > 1;
    const n = rng.int(hard ? 4 : 3, 8);
    const r = hard ? rng.int(1, 2) : 1;
    const k = hard && negative ? rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]) : rng.int(2, 6);
    const [p, q] = ratioOf({ n, k, r });
    // A multiple of 1 is the equal-coefficients lesson, not this one.
    if (p !== q && n - r >= 1) return { n, k, r };
  }
}

function ratioCondition(params: RatioParams): string {
  const { r } = params;
  const [p, q] = ratioOf(params);
  const multiple = q === 1 ? (p === 2 ? 'twice' : `$${p}$ times`) : `$${fracTex(p, q)}$ times`;
  return `the coefficient of $${termTex(1, r + 1)}$ is ${multiple} the coefficient of $${termTex(1, r)}$`;
}

/** The ratio of neighbouring coefficients, set equal to the multiple, and solved for whichever is unknown. */
function ratioWorking(params: RatioParams, unknown: 'k' | 'n'): SolutionStep[] {
  const { n, k, r } = params;
  const [p, q] = ratioOf(params);
  const kv = unknown === 'k' ? 'k' : baseTex(k);
  const nv = unknown === 'n' ? 'n' : `${n}`;
  const steps: SolutionStep[] = [
    {
      text: `The coefficients are $${ncrTex(nv, r)}${unknown === 'k' ? kPowTex(r) : `${kv}^{${r}}`}$ and $${ncrTex(nv, r + 1)}${unknown === 'k' ? kPowTex(r + 1) : `${kv}^{${r + 1}}`}$. Divide the second by the first: the nCr part leaves $\\frac{n - ${r}}{${r + 1}}$ and one ${unknown === 'k' ? '$k$' : `$${k}$`} is left over.`,
    },
  ];
  if (unknown === 'k') {
    steps.push({ tex: `\\frac{${n - r}k}{${r + 1}} = ${fracTex(p, q)}` }, { tex: chain(`${n - r}k &= ${fracTex((r + 1) * p, q)}`, `k &= ${k}`) });
  } else {
    steps.push(
      { tex: `\\frac{${k}(n - ${r})}{${r + 1}} = ${fracTex(p, q)}` },
      { tex: chain(`n - ${r} &= ${fracTex((r + 1) * p, q * k)}`, `n &= ${n}`) },
    );
  }
  return steps;
}

/** k = (r + 1)p / (q(n - r)), reduced a piece at a time: every piece is whole. */
const ratioReduce: Generator<RatioParams> = {
  id: 'bin-ratio-reduce',
  sample: (rng, difficulty) => sampleRatio(rng, difficulty, false),
  render: (params): Slide => {
    const { n, r } = params;
    const [p, q] = ratioOf(params);
    const top = r + 1 === 1 ? num(p) : bin('*', num(r + 1), num(p));
    const gap = bin('-', num(n), num(r));
    const expr = bin('/', top, q === 1 ? gap : bin('*', num(q), gap));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `In the expansion of $(1 + kx)^{${n}}$, ${ratioCondition(params)}. That says $\\frac{${n - r}k}{${r + 1}} = ${fracTex(p, q)}$, so $k$ is worked out below. Tap the part you would work out next, then choose what it comes to.`,
        },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: (params) => ratioWorking(params, 'k'),
};

/** n = (r + 1)m / k + r for a whole multiple m, one operation at a time. */
const ratioNSteps: Generator<RatioParams> = {
  id: 'bin-ratio-n-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const r = difficulty > 1 ? rng.int(1, 2) : 1;
      const k = rng.int(2, difficulty > 1 ? 6 : 5);
      const n = rng.int(r + 2, 12);
      const [, q] = ratioOf({ n, k, r });
      if (q === 1 && k * (n - r) !== r + 1) return { n, k, r };
    }
  },
  render: (params): Slide => {
    const { n, k, r } = params;
    const [m] = ratioOf(params);
    const top = (r + 1) * m;
    const bank = (...values: number[]) => sortTokens([...new Set(values.map(String))]);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `In the expansion of $(1 + ${k}x)^{n}$, ${ratioCondition(params)}. The condition $\\frac{${k}(n - ${r})}{${r + 1}} = ${m}$ rearranges to the line below. Tap the step to do next, then choose what it gives.`,
        },
      ],
      start: [`${r + 1}`, '\\times', `${m}`, '\\div', `${k}`, '+', `${r}`],
      reductions: [
        { span: [0, 3], operator: 1, value: `${top}`, bank: bank(top, r + 1 + m, top + r + 1, m) },
        { span: [0, 3], operator: 1, value: `${n - r}`, bank: bank(n - r, top - k, n - r + 1, top * k) },
        { span: [0, 3], operator: 1, value: `${n}`, bank: bank(n, n - r, n + 1, n - 1) },
      ],
    };
  },
  solution: (params) => ratioWorking(params, 'n'),
};

interface RatioAskParams extends RatioParams {
  ask: 'k' | 'n';
}

/** k with n given, or n with k given, typed. */
const ratioCoeff: Generator<RatioAskParams> = {
  id: 'bin-ratio-coeff',
  sample: (rng, difficulty) => ({ ...sampleRatio(rng, difficulty, true), ask: rng.pick<'k' | 'n'>(['k', 'n']) }),
  choices: (params) => {
    const { n, k, r, ask } = params;
    const [p, q] = ratioOf(params);
    const salt = spread(n, k, r, ask === 'n' ? 1 : 2);
    if (ask === 'n') return aimedNumbers(n, [n - r, n + 1, n - 1], salt);
    // n used where n - r belongs, and the multiple left upside down.
    return aimedNumbers(k, [((r + 1) * p) / (q * n), (q * (r + 1)) / (p * (n - r)), -k], salt);
  },
  render: (params): Slide => {
    const { n, k, ask } = params;
    const bracket = ask === 'k' ? `(1 + kx)^{${n}}` : `(1 ${k < 0 ? '-' : '+'} ${Math.abs(k)}x)^{n}`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `In the expansion of $${bracket}$, ${ratioCondition(params)}. Find $${ask}$.` }],
      lead: `${ask} =`,
      keypad: [],
      answer: `${ask === 'k' ? k : n}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => ratioWorking(params, params.ask),
};

/** The ratio condition written out with its coefficients, then k. */
const ratioTiles: Generator<RatioParams> = {
  id: 'bin-ratio-tiles',
  sample: (rng, difficulty) => sampleRatio(rng, difficulty, true),
  render: (params): Slide => {
    const { n, k, r } = params;
    const [p, q] = ratioOf(params);
    const answer = [`${nCr(n, r + 1)}`, fracTex(p, q), `${nCr(n, r)}`, `${k}`];
    const slips = [fracTex(q, p), `${nCr(n, r + 2)}`, `${n - r}`, `${-k}`, `${nCr(n, r > 1 ? r - 1 : r + 2)}`, `${k + 1}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `In the expansion of $(1 + kx)^{${n}}$, ${ratioCondition(params)}. Write the equation that says so, then solve it for $k$, given that $k \\neq 0$.`,
        },
      ],
      template: `{0}${kPow(r + 1)} = {1} \\times {2}${kPow(r)}, \\enspace {3} = k`,
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: (params) => ratioWorking(params, 'k'),
};

/* --- the sum of the coefficients --- */

interface SumParams {
  a: number;
  k: number;
  n: number;
}

/** (a + kx)^n with its sum and alternating sum both under 10000. */
function sampleSum(rng: Rng, difficulty: number, positive = false): SumParams {
  for (;;) {
    const hard = difficulty > 1;
    const a = hard ? rng.int(2, 3) : 1;
    const k = positive ? rng.int(1, 5) : rng.pick(hard ? [-4, -3, -2, -1, 1, 2, 3, 4] : [-5, -4, -3, -2, 2, 3, 4, 5]);
    const n = rng.int(3, 8);
    if (a + k === 0 || a - k === 0 || a + k === 1) continue;
    if (Math.abs((a + k) ** n) < 10000 && Math.abs((a - k) ** n) < 10000) return { a, k, n };
  }
}

function sumBracketTex({ a, k, n }: SumParams): string {
  return bracketTex(plainBracket(n, a, k, false));
}

/**
 * The even-power coefficients (or the odd ones) from x = 1 and x = -1: each
 * bracket, each power, then half their sum or difference.
 */
interface SumTreeParams extends SumParams {
  even: boolean;
}

const sumTree: Generator<SumTreeParams> = {
  id: 'bin-sum-tree',
  sample: (rng, difficulty) => ({ ...sampleSum(rng, difficulty), even: rng.chance(0.5) }),
  render: ({ a, k, n, even }): Slide => {
    const plus = a + k;
    const minus = a - k;
    const P = plus ** n;
    const M = minus ** n;
    const half = even ? (P + M) / 2 : (P - M) / 2;
    const answer = [plus, minus, P, M, half].map(String);
    const slips = [a * k, -minus, (P - M) / 2 === half ? (P + M) / 2 : (P - M) / 2, P + M, a ** n + k ** n, -M];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Put $x = 1$ into $${sumBracketTex({ a, k, n })}$ and every term becomes its coefficient. Put $x = -1$ and the odd powers change sign. So the coefficients of the ${even ? 'even powers (the constant, $x^2$, $x^4$, …)' : 'odd powers ($x$, $x^3$, $x^5$, …)'} add up to half the ${even ? 'sum' : 'difference'} of the two. Fill in the tree.`,
        },
      ],
      expression: `\\frac{${baseTex(plus)}^{${n}} ${even ? '+' : '-'} ${baseTex(minus)}^{${n}}}{2}`,
      nodes: [
        { id: 'plus', from: [] },
        { id: 'minus', from: [] },
        { id: 'P', from: ['plus'] },
        { id: 'M', from: ['minus'] },
        { id: 'half', from: ['P', 'M'] },
      ],
      bank: treeBank(answer, slips.filter(Number.isInteger).map(String)),
      answer,
    };
  },
  solution: ({ a, k, n, even }) => {
    const plus = a + k;
    const minus = a - k;
    const P = plus ** n;
    const M = minus ** n;
    return [
      { text: 'With $x = 1$ the expansion adds every coefficient; with $x = -1$ the odd ones are subtracted.' },
      {
        tex: column([
          [`${a === 1 ? '(1 + ' : `(${a} + `}${baseTex(k)})^{${n}}`, `${baseTex(plus)}^{${n}} = ${P}`],
          [`${a === 1 ? '(1 - ' : `(${a} - `}${baseTex(k)})^{${n}}`, `${baseTex(minus)}^{${n}} = ${M}`],
        ]),
      },
      {
        text: even
          ? 'Adding the two doubles the even-power coefficients and cancels the odd ones.'
          : 'Taking one from the other doubles the odd-power coefficients and cancels the even ones.',
      },
      { tex: `\\frac{${P} ${even ? '+' : '-'} ${baseTex(M)}}{2} = ${even ? (P + M) / 2 : (P - M) / 2}` },
    ];
  },
};

interface SumAskParams extends SumParams {
  kind: 'sum' | 'alt' | 'findk';
}

function sumWorking({ a, k, n, kind }: SumAskParams): SolutionStep[] {
  const plus = a + k;
  if (kind === 'findk') {
    const S = plus ** n;
    return [
      { text: `Put $x = 1$: the coefficients add up to $(${a} + k)^{${n}}$.` },
      { tex: chain(`(${a} + k)^{${n}} &= ${S}`, `${a} + k &= ${plus}`, `k &= ${k}`) },
      ...(n % 2 === 0 ? [{ text: `$${a} + k = ${-plus}$ works too, but it makes $k$ negative, and $k > 0$.` }] : []),
    ];
  }
  if (kind === 'sum') {
    return [
      { text: 'Put $x = 1$: every term becomes just its coefficient.' },
      { tex: `(${a} + ${baseTex(k)})^{${n}} = ${baseTex(plus)}^{${n}} = ${plus ** n}` },
    ];
  }
  return [
    { text: 'Put $x = -1$: the odd powers of $x$ turn negative, so the coefficients come in with alternating signs.' },
    { tex: `(${a} - ${baseTex(k)})^{${n}} = ${baseTex(a - k)}^{${n}} = ${(a - k) ** n}` },
  ];
}

/** The sum, the alternating sum, or k from a given sum, typed. */
const sumCoeff: Generator<SumAskParams> = {
  id: 'bin-sum-coeff',
  sample: (rng, difficulty) => {
    const kind = rng.pick<SumAskParams['kind']>(['sum', 'alt', 'findk']);
    return { ...sampleSum(rng, difficulty, kind === 'findk'), kind };
  },
  choices: (params) => {
    const { a, k, n, kind } = params;
    const S = (a + k) ** n;
    const T = (a - k) ** n;
    const salt = spread(a, k, n, kind.length);
    if (kind === 'sum') return aimedNumbers(S, [2 ** n, a ** n + k ** n, T], salt);
    if (kind === 'alt') return aimedNumbers(T, [S, -T, a ** n - k ** n], salt);
    return aimedNumbers(k, [a + k, k + 1, -k], salt);
  },
  render: (params): Slide => {
    const { a, k, n, kind } = params;
    const text =
      kind === 'sum'
        ? `Add up all the coefficients in the expansion of $${sumBracketTex(params)}$.`
        : kind === 'alt'
          ? `In the expansion of $${sumBracketTex(params)}$, add up the coefficients with alternating signs: the constant, minus the $x$ coefficient, plus the $x^2$ coefficient, and so on.`
          : `The coefficients in the expansion of $(${a} + kx)^{${n}}$ add up to $${(a + k) ** n}$. Find $k$${n % 2 === 0 ? ', given that $k > 0$' : ''}.`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text }],
      lead: kind === 'findk' ? 'k =' : '\\text{total} =',
      keypad: [],
      answer: `${kind === 'findk' ? k : kind === 'sum' ? (a + k) ** n : (a - k) ** n}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: sumWorking,
};

interface SumWhichParams extends SumParams {
  alt: boolean;
}

/** Which power is the sum (or the alternating sum): the slips are a^n + k^n, 2^n and the other one. */
const sumWhich: Generator<SumWhichParams> = {
  id: 'bin-sum-which',
  sample: (rng, difficulty) => ({ ...sampleSum(rng, difficulty), alt: rng.chance(0.5) }),
  render: ({ a, k, n, alt }): Slide => {
    const power = (value: number) => `${baseTex(value)}^{${n}}`;
    const separate = `${a === 1 ? '1' : power(a)} ${alt ? '-' : '+'} ${power(Math.abs(k))}`;
    const separateValue = a ** n + (alt ? -1 : 1) * Math.abs(k) ** n;
    // Each option with its value, the answer first: a slip that lands on the
    // answer's value, or on another slip's, is dropped for the spares at the end.
    const candidates: [string, number][] = alt
      ? [[power(a - k), (a - k) ** n], [power(a + k), (a + k) ** n], [separate, separateValue], [`-${power(a + k)}`, -((a + k) ** n)]]
      : [[power(a + k), (a + k) ** n], [`2^{${n}}`, 2 ** n], [separate, separateValue], [power(a - k), (a - k) ** n]];
    candidates.push([`${n} \\times ${baseTex(alt ? a - k : a + k)}`, n * (alt ? a - k : a + k)]);
    candidates.push([`${baseTex(alt ? a - k : a + k)}^{${n - 1}}`, (alt ? a - k : a + k) ** (n - 1)]);
    const labels: string[] = [];
    const seen = new Set<number>();
    for (const [tex, value] of candidates) {
      if (labels.length === 4 || seen.has(value)) continue;
      seen.add(value);
      labels.push(tex);
    }
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: alt
            ? `Which of these is the constant, minus the $x$ coefficient, plus the $x^2$ coefficient, and so on, all the way through the expansion of $${sumBracketTex({ a, k, n })}$?`
            : `Which of these is the sum of all the coefficients in the expansion of $${sumBracketTex({ a, k, n })}$?`,
        },
      ],
      ...nativeChoice(labels, spread(a, k, n, alt ? 1 : 0)),
    };
  },
  solution: ({ a, k, n, alt }) => sumWorking({ a, k, n, kind: alt ? 'alt' : 'sum' }),
};

/** Slide to k: the curve is the sum of the coefficients as k changes. */
const sumSlider: Generator<SumParams> = {
  id: 'bin-sum-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = difficulty > 1 ? rng.int(2, 3) : 1;
      const k = rng.int(1, 5);
      const n = rng.int(2, difficulty > 1 ? 6 : 8);
      if ((a + k) ** n < 10000) return { a, k, n };
    }
  },
  render: ({ a, k, n }): Slide => {
    const S = (a + k) ** n;
    let span = 6;
    while (defaultSliderValue(0, span, 1) === k) span += 1;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The coefficients in the expansion of $(${a} + kx)^{${n}}$ add up to $${S}$. The curve is that sum for each $k$, and the dashed line is $${S}$. Slide to $k$, which is positive.`,
        },
      ],
      min: 0,
      max: span,
      step: 1,
      answer: k,
      readout: 'k = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: S * 1.4,
          curves: [{ f: (t) => Math.min((a + t) ** n, S * 3) }],
          horizontals: [S],
          label: `A curve rising steeply from ${a ** n}, with a dashed line at ${S}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: ({ a, k, n }) => sumWorking({ a, k, n, kind: 'findk' }),
};

/* --- the unknown in front --- */

interface FrontParams {
  a: number;
  b: number;
  n: number;
  /** The power of x whose coefficient is given. */
  r: number;
}

function frontValue({ a, b, n, r }: FrontParams): number {
  return nCr(n, r) * a ** (n - r) * b ** r;
}

/** (a + bx)^n with a as the unknown, written as the prompt writes it. */
function frontBracketTex({ b, n }: FrontParams, power = `${n}`): string {
  return `(a ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x)^{${power}}`;
}

/**
 * a from one coefficient. Easier: the constant, a^n, or the x^(n - 1) term,
 * na, of (a + x)^n. Harder: a middle term with a number on x, or the
 * x^(n - 1) term of (a + bx)^n. An even power of a hides its sign, so a > 0
 * is stated there.
 */
function sampleFront(rng: Rng, difficulty: number, where?: 'constant' | 'top' | 'middle'): FrontParams {
  const hard = difficulty > 1;
  for (;;) {
    const kind = where ?? rng.pick(hard ? ['middle', 'top', 'middle'] : ['constant', 'top']);
    const n = rng.int(3, hard ? 7 : 8);
    const b = hard ? rng.pick([-3, -2, 2, 3]) : 1;
    const r = kind === 'constant' ? 0 : kind === 'top' ? n - 1 : rng.int(1, n - 2);
    const size = rng.int(2, 5);
    const a = (n - r) % 2 === 0 ? size : rng.chance(0.5) ? size : -size;
    const params = { a, b, n, r };
    if (Math.abs(frontValue(params)) < 10000) return params;
  }
}

function frontPrompt(params: FrontParams): string {
  const { r } = params;
  const name = termName(r);
  return `In the expansion of $${frontBracketTex(params)}$, ${name} is $${frontValue(params)}$.`;
}

function frontWorking(params: FrontParams): SolutionStep[] {
  const { a, b, n, r } = params;
  const e = n - r;
  const c = nCr(n, r) * b ** r;
  const steps: SolutionStep[] = [
    {
      text:
        r === 0
          ? `The constant term is $a^{${n}}$.`
          : `The $x^{${r}}$ term is $${ncrTex(n, r)}a^{${e}}(${times(b, 'x')})^{${r}}$, so its coefficient is $${c}${e === 1 ? 'a' : `a^{${e}}`}$.`,
    },
  ];
  if (e === 1) {
    steps.push({ tex: chain(`${c}a &= ${frontValue(params)}`, `a &= ${a}`) });
    return steps;
  }
  steps.push({ tex: chain(...(c === 1 ? [] : [`${c}a^{${e}} &= ${frontValue(params)}`]), `a^{${e}} &= ${a ** e}`, `a &= ${a}`) });
  if (e % 2 === 0) steps.push({ text: `$a = ${-a}$ gives the same even power, which is why $a > 0$ had to be given.` });
  return steps;
}

const frontA: Generator<FrontParams> = {
  id: 'bin-front-a',
  sample: (rng, difficulty) => sampleFront(rng, difficulty),
  choices: (params) => {
    const { a, n, r } = params;
    const c = nCr(n, r) * params.b ** r;
    return aimedNumbers(a, [-a, frontValue(params) / c, frontValue(params) / n], spread(a, params.b, n, r));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${frontPrompt(params)} Find $a$${(params.n - params.r) % 2 === 0 ? ', given that $a > 0$' : ''}.` }],
    lead: 'a =',
    keypad: [],
    answer: `${params.a}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: frontWorking,
};

/**
 * What a can be, with no sign given: both signs when a's power is even, one
 * when it is odd. The fourth option is a's power itself, the root forgotten.
 */
const frontSign: Generator<FrontParams> = {
  id: 'bin-front-sign',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleFront(rng, difficulty, rng.pick(difficulty > 1 ? ['middle', 'constant'] : ['constant', 'middle']));
      if (params.n - params.r >= 2) return params;
    }
  },
  render: (params): Slide => {
    const { a, n, r } = params;
    const e = n - r;
    const size = Math.abs(a);
    const both = `a = \\pm ${size}`;
    const labels = e % 2 === 0 ? [both, `a = ${size}`, `a = ${-size}`, `a = ${a ** e}`] : [`a = ${a}`, `a = ${-a}`, both, `a = ${a ** e}`];
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `${frontPrompt(params)} What can $a$ be?` }],
      ...nativeChoice(labels, spread(a, params.b, n, r)),
    };
  },
  solution: (params) => {
    const { a, n, r } = params;
    const e = n - r;
    const steps = frontWorking(params).filter((step) => !step.text?.startsWith(`$a = ${-a}$`));
    steps.push({
      text:
        e % 2 === 0
          ? `$a^{${e}} = ${a ** e}$ is an even power, so $a = ${Math.abs(a)}$ and $a = ${-Math.abs(a)}$ both work.`
          : `$a^{${e}} = ${a ** e}$ is an odd power, which keeps the sign: only $a = ${a}$ works.`,
    });
    return steps;
  },
};

interface FrontPairParams {
  a: number;
  b: number;
  n: number;
}

/**
 * a and n together, from the constant a^n and the x coefficient nba^(n - 1):
 * dividing leaves nb/a, and the pair with that ratio that also makes a^n.
 */
const frontFlow: Generator<FrontPairParams> = {
  id: 'bin-front-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const a = rng.int(2, hard ? 5 : 4);
      const b = hard ? rng.int(2, 3) : rng.int(1, 2);
      const n = rng.int(3, 8);
      if (a ** n < 10000 && n * b * a ** (n - 1) < 10000) return { a, b, n };
    }
  },
  render: ({ a, b, n }): Slide => {
    const C = a ** n;
    const D = n * b * a ** (n - 1);
    const bn = times(b, 'n');
    const divide = `$\\frac{${bn}}{a} = ${fracTex(D, C)}$`;
    const slip = `$${bn}a = ${fracTex(D, C)}$`;
    const pair = `$a = ${a}$, $n = ${n}$`;
    const doubled = `$a = ${2 * a}$, $n = ${2 * n}$`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `In the expansion of $(a + ${times(b, 'x')})^{n}$, where $a$ and $n$ are positive whole numbers, the constant term is $${C}$ and the coefficient of $x$ is $${D}$.`,
        },
      ],
      subject: chain(`a^{n} &= ${C}`, `${bn}a^{n - 1} &= ${D}`),
      steps: [
        {
          id: 'divide',
          ask: 'Divide the $x$ coefficient by the constant term. What is left?',
          branches: turned(
            [
              { label: divide, to: 'pair' },
              { label: slip, outcome: '$a^{n - 1}$ over $a^n$ leaves one $a$ underneath, not on top.' },
            ],
            spread(a, b, n),
          ),
        },
        {
          id: 'pair',
          ask: `Which pair fits that and also makes $a^n = ${C}$?`,
          branches: turned(
            [
              { label: pair, outcome: `$${a}^{${n}} = ${C}$, and $\\frac{${b === 1 ? n : `${b} \\times ${n}`}}{${a}} = ${fracTex(D, C)}$: both fit.` },
              { label: doubled, outcome: `Same ratio, but $${2 * a}^{${2 * n}}$ is far more than $${C}$.` },
            ],
            spread(n, a, b, 7),
          ),
        },
      ],
      answer: [divide, pair],
    };
  },
  solution: ({ a, b, n }) => {
    const C = a ** n;
    const D = n * b * a ** (n - 1);
    return [
      { text: `The constant is $a^n$ and the $x$ term is $n a^{n - 1}(${times(b, 'x')})$.` },
      { tex: chain(`a^{n} &= ${C}`, `${times(b, 'n')}a^{n - 1} &= ${D}`) },
      { text: 'Divide the second by the first:' },
      { tex: `\\frac{${times(b, 'n')}}{a} = ${fracTex(D, C)}` },
      { text: `Then $a^n = ${C}$ settles which pair: $${a}^{${n}} = ${C}$, so $a = ${a}$ and $n = ${n}$.` },
    ];
  },
};

/** The coefficient written as an equation in a, then a's power, then a. */
const frontTiles: Generator<FrontParams> = {
  id: 'bin-front-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleFront(rng, difficulty, 'middle');
      if (params.b !== 1) return params;
      // (a + x)^n puts a 1 in the equation, which is no tile at all.
      params.b = rng.pick(difficulty > 1 ? [-3, -2, 2, 3] : [2, 3]);
      if (Math.abs(frontValue(params)) < 10000) return params;
    }
  },
  render: (params): Slide => {
    const { a, b, n, r } = params;
    const e = n - r;
    const V = frontValue(params);
    const answer = [`${nCr(n, r)}`, baseTex(b ** r), `${a ** e}`, `${a}`];
    const slips = [`${nCr(n, r - 1)}`, baseTex(b), baseTex(-(b ** r)), `${-a}`, `${a ** e * nCr(n, r)}`, `${a + 1}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${frontPrompt(params)} Write its coefficient as an equation in $a$, then solve it${e % 2 === 0 ? ', given that $a > 0$' : ''}.`,
        },
      ],
      template: `a^${e} \\times {0} \\times {1} = ${V}, \\enspace {2} = a^${e}, \\enspace {3} = a`,
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: frontWorking,
};

/* ---------- Level 4: products of expansions ---------- */

/*
 * Two expansions multiplied: every coefficient of the product is a sum of
 * products, one term from each expansion with their powers adding up. The
 * brackets are drawn first and everything is computed outward from them with
 * nCr, so each coefficient, bank and option is exact and under 10000: m + n at
 * most 8, the numbers on x from -3 to 3 (4 where only a sign is asked), and
 * nothing past x^4.
 */

/** The coefficient of x^j in (1 + cx)^p: nothing once j runs past p. */
function shortCoef(c: number, p: number, j: number): number {
  return nCr(p, j) * c ** j;
}

/** (1 + cx), as the learner reads it. */
function unitBracket(c: number): string {
  return `(${sumTex(['1', termTex(c, 1)])})`;
}

/** A number inside a line of working: bracketed when negative. */
function br(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** An expansion as far as x^k, with dots when it goes on past it. */
function shortExpansion(c: number, p: number, k: number): string {
  const terms = Array.from({ length: Math.min(k, p) + 1 }, (_, j) => termTex(shortCoef(c, p, j), j));
  return expansionTex(`${unitBracket(c)}^{${p}}`, p > k ? [...terms, '\\dots'] : terms);
}

/** A steps bank of four: the value, the slips, then the values just above it, in order. */
function stepBank(format: (value: number) => string, right: number, ...wrong: number[]): string[] {
  const values = [...new Set([right, ...wrong.filter(Number.isInteger)])].slice(0, 4);
  for (let step = 1; values.length < 4; step += 1) if (!values.includes(right + step)) values.push(right + step);
  return values.sort((x, y) => x - y).map(format);
}

/** The first `count` distinct labels, the correct one first. */
function firstDistinct(labels: string[], count = 4): string[] {
  return [...new Set(labels)].slice(0, count);
}

/* --- two expansions, one coefficient --- */

interface PairParams {
  /** The product is (1 + ax)^m (1 + bx)^n. */
  a: number;
  m: number;
  b: number;
  n: number;
  /** The power of x asked about. Never more than n, so the 1 of the first always has a partner. */
  k: number;
}

function pairTex({ a, m, b, n }: PairParams): string {
  return `${unitBracket(a)}^{${m}}${unitBracket(b)}^{${n}}`;
}

/** The powers i taken from the first expansion to make x^k; the second supplies x^(k - i). */
function pairsOf({ m, n, k }: PairParams): number[] {
  const out: number[] = [];
  for (let i = Math.max(0, k - n); i <= Math.min(k, m); i += 1) out.push(i);
  return out;
}

/** Each pair's product, lowest power from the first expansion first. */
function pairProducts(params: PairParams): number[] {
  const { a, m, b, n, k } = params;
  return pairsOf(params).map((i) => shortCoef(a, m, i) * shortCoef(b, n, k - i));
}

function pairCoefficient(params: PairParams, k = params.k): number {
  return pairProducts({ ...params, k }).reduce((sum, value) => sum + value, 0);
}

/**
 * (1 + ax)^m (1 + bx)^n with every pair product and the coefficient of x^k
 * under 10000 and not 0. `short` lets the first bracket stop one power below
 * x^k, which is where the count of pairs drops below k + 1.
 */
function samplePairs(rng: Rng, difficulty: number, k: number, short = false): PairParams {
  const hard = difficulty > 1;
  for (;;) {
    const m = rng.int(short ? Math.max(2, k - 1) : k, 5);
    const n = rng.int(k, 6);
    if (m + n > 8) continue;
    const a = rng.pick(hard ? [-3, -2, -1, 2, 3] : [1, 2, 3]);
    const b = rng.pick(hard ? [-3, -2, -1, 1, 2, 3] : [-2, -1, 1, 2]);
    const params = { a, m, b, n, k };
    const total = pairCoefficient(params);
    if (total === 0 || [...pairProducts(params), total].some((value) => Math.abs(value) >= 10000)) continue;
    return params;
  }
}

/** Each bracket as far as x^k, the pairs, their products and the total. */
function pairWorking(params: PairParams): SolutionStep[] {
  const { a, m, b, n, k } = params;
  const pairs = pairsOf(params);
  const products = pairProducts(params);
  const count = pairs.length;
  return [
    { text: 'Expand each bracket only as far as the power asked for:' },
    { tex: shortExpansion(a, m, k) },
    { tex: shortExpansion(b, n, k) },
    {
      text:
        count < k + 1
          ? `A multiple of $x^{${k}}$ is an $x^{i}$ term of the first times an $x^{${k} - i}$ term of the second. The first stops at $x^{${m}}$, so there are $${count}$ pairs, not $${k + 1}$:`
          : `A multiple of $x^{${k}}$ is an $x^{i}$ term of the first times an $x^{${k} - i}$ term of the second: $${count}$ pairs, $1$ times the $x^{${k}}$ term included.`,
    },
    { tex: column(pairs.map((i, at) => [`${br(shortCoef(a, m, i))} \\times ${br(shortCoef(b, n, k - i))}`, products[at]])) },
    { tex: `${sumTex(products.map(String))} = ${pairCoefficient(params)}` },
  ];
}

/**
 * How many pairs make x^k, and whether the 1 at the front of the first
 * expansion is one of them. The slips are one pair too few or too many, and
 * leaving the 1 out because it carries no x.
 */
const twoExpFlow: Generator<PairParams> = {
  id: 'bin-two-exp-flow',
  sample: (rng, difficulty) => samplePairs(rng, difficulty, rng.int(2, 3), difficulty > 1),
  render: (params): Slide => {
    const { a, m, b, n, k } = params;
    const count = pairsOf(params).length;
    const xk = termTex(1, k);
    const fewer =
      count > 1
        ? [
            {
              label: `$${count - 1}$`,
              outcome: `One short. The first expansion can give every power from $x^{0}$ up to $x^{${Math.min(k, m)}}$, and each has one partner in the second: $${count}$ pairs.`,
            },
          ]
        : [];
    const more = {
      label: `$${count + 1}$`,
      outcome:
        count < k + 1
          ? `The first expansion stops at $x^{${m}}$, so it has no $${xk}$ term to pair with the $1$ of the second.`
          : `The first expansion gives $x^{0}$ up to $${xk}$, one partner each: $${count}$ pairs, not $${count + 1}$.`,
    };
    const partner = `Its $${xk}$ term`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Every term of this product is a term of the first expansion times a term of the second. Plan the $${xk}$ term.`,
        },
      ],
      subject: pairTex(params),
      steps: [
        {
          id: 'count',
          ask: `How many pairs of terms, one from each expansion, multiply to a multiple of $${xk}$?`,
          branches: turned([{ label: `$${count}$`, to: 'constant' }, ...fewer, more], spread(a, m, b, n, k)),
        },
        {
          id: 'constant',
          ask: 'The first expansion starts with $1$. Which term of the second does that $1$ pair with?',
          branches: turned(
            [
              {
                label: partner,
                outcome: `Right: $1$ times the $${xk}$ term is a multiple of $${xk}$, and it is the pair most easily dropped. The $${count}$ products added make the coefficient.`,
              },
              {
                label: 'None: $1$ has no $x$ in it',
                outcome: `$1$ times the $${xk}$ term is still a multiple of $${xk}$. Leaving it out is the usual slip.`,
              },
              { label: 'Its $x$ term', outcome: `$1$ times an $x$ term only makes $x$. The powers have to add to $${k}$.` },
            ],
            spread(k, m, b, 3),
          ),
        },
      ],
      answer: [`$${count}$`, partner],
    };
  },
  solution: pairWorking,
};

/** The three pairs that make x^2 as numbers, then their sum: three branches into one. */
const twoExpTree: Generator<PairParams> = {
  id: 'bin-two-exp-tree',
  sample: (rng, difficulty) => samplePairs(rng, difficulty, 2),
  render: (params): Slide => {
    const { a, m, b, n } = params;
    const products = pairProducts(params);
    const total = pairCoefficient(params);
    const answer = [...products, total].map(String);
    // The 1 or the far end dropped, the x^2 terms alone, and the middle pair's sign.
    const slips = [
      total - products[0],
      total - products[2],
      shortCoef(a, m, 2) + shortCoef(b, n, 2),
      shortCoef(a, m, 1) + shortCoef(b, n, 1),
      -products[1],
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Find the coefficient of $x^2$. Fill in what each pair makes: $1$ times the second expansion\'s $x^2$ term, the two $x$ terms, and the first expansion\'s $x^2$ term times $1$. Then add them.',
        },
      ],
      expression: pairTex(params),
      nodes: [
        { id: 'low', from: [] },
        { id: 'middle', from: [] },
        { id: 'high', from: [] },
        { id: 'total', from: ['low', 'middle', 'high'] },
      ],
      bank: treeBank(answer, slips.map(String)),
      answer,
    };
  },
  solution: pairWorking,
};

/** The coefficient of x^k typed. The choice form offers a pair dropped, the x^k terms added, and them multiplied. */
const twoExpCoeff: Generator<PairParams> = {
  id: 'bin-two-exp-coeff',
  sample: (rng, difficulty) => samplePairs(rng, difficulty, difficulty > 1 ? rng.int(2, 3) : 2, difficulty > 1),
  choices: (params) => {
    const { a, m, b, n, k } = params;
    const total = pairCoefficient(params);
    const products = pairProducts(params);
    return aimedNumbers(
      total,
      [
        total - products[0],
        total - products[products.length - 1],
        shortCoef(a, m, k) + shortCoef(b, n, k),
        shortCoef(a, m, k) * shortCoef(b, n, k),
      ],
      spread(a, m, b, n, k),
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `Find the coefficient of $${termTex(1, params.k)}$ in the expansion of $${pairTex(params)}$.` }],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${pairCoefficient(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: pairWorking,
};

/**
 * The three pairs that make x^2, placed as terms: which term of each
 * expansion goes with which. The bank holds a partner one power out, a sign
 * turned, and a number on x left unsquared.
 */
const twoExpTiles: Generator<PairParams> = {
  id: 'bin-two-exp-tiles',
  sample: (rng, difficulty) => samplePairs(rng, difficulty, 2),
  render: (params): Slide => {
    const { a, m, b, n } = params;
    const first = (j: number) => termTex(shortCoef(a, m, j), j);
    const second = (j: number) => termTex(shortCoef(b, n, j), j);
    const answer = [second(2), first(1), second(1), first(2)];
    const slips = [
      termTex(-shortCoef(a, m, 1), 1),
      termTex(-shortCoef(b, n, 1), 1),
      termTex(nCr(m, 2) * a, 2),
      termTex(nCr(n, 2) * b, 2),
      termTex(shortCoef(b, n, 1), 2),
      termTex(-shortCoef(b, n, 2), 2),
    ];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The $x^2$ term of this product is three pairs of terms multiplied and added, one term of each pair from each expansion. Fill in the pairs.',
        },
        { kind: 'display', tex: pairTex(params) },
      ],
      template: '1 \\times {0} + {1} \\times {2} + {3} \\times 1',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: pairWorking,
};

/* --- the first three terms of a product --- */

/** The x and x^2 coefficients of (1 + ax)^m (1 + bx)^n, and the pieces they are made of. */
function firstThree({ a, m, b, n }: PairParams) {
  const A1 = shortCoef(a, m, 1);
  const A2 = shortCoef(a, m, 2);
  const B1 = shortCoef(b, n, 1);
  const B2 = shortCoef(b, n, 2);
  return { A1, A2, B1, B2, x1: A1 + B1, x2: A2 + A1 * B1 + B2 };
}

/** A product with nothing cancelling in its first three terms. */
function sampleFirstThree(rng: Rng, difficulty: number): PairParams {
  for (;;) {
    const params = samplePairs(rng, difficulty, 2);
    if (firstThree(params).x1 !== 0) return params;
  }
}

function firstThreeTex(x1: number, x2: number): string {
  return sumTex(['1', termTex(x1, 1), termTex(x2, 2)]);
}

function firstThreeWorking(params: PairParams): SolutionStep[] {
  const { A1, A2, B1, B2, x1, x2 } = firstThree(params);
  return [
    { text: 'Each bracket only as far as $x^2$: anything past it can only make higher powers.' },
    { tex: shortExpansion(params.a, params.m, 2) },
    { tex: shortExpansion(params.b, params.n, 2) },
    { text: 'The $x$ term is $x$ from one bracket and $1$ from the other, so the $x$ coefficients add:' },
    { tex: `${sumTex([`${A1}`, `${B1}`])} = ${x1}` },
    { text: 'The $x^2$ term takes both $x^2$ terms, and the two $x$ terms multiplied:' },
    { tex: `${A2} + ${br(A1)} \\times ${br(B1)} + ${B2} = ${x2}` },
    { tex: `${pairTex(params)} = ${firstThreeTex(x1, x2)} + \\dots` },
  ];
}

/** The x and x^2 coefficients placed with their signs. */
const firstThreeTiles: Generator<PairParams> = {
  id: 'bin-first-three-tiles',
  sample: sampleFirstThree,
  render: (params): Slide => {
    const { A1, A2, B1, B2, x1, x2 } = firstThree(params);
    const answer = [signedToken(x1, false), signedToken(x2, false)];
    // The x coefficients multiplied, one subtracted, the cross term left out, and the signs turned.
    const slips = [A2 + B2, -x1, A1 * B1, -x2, A1 - B1].map((value) => signedToken(value, false));
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Expand $${pairTex(params)}$ as far as the $x^2$ term.` }],
      template: '1 {0}x {1}x^2 + \\dots',
      bank: tileBank(answer, slips.slice(0, 4)),
      answer,
    };
  },
  solution: firstThreeWorking,
};

/** The x^2 coefficient from the three pieces: the cross product first, then the sums. */
const firstThreeSteps: Generator<PairParams> = {
  id: 'bin-first-three-steps',
  sample: sampleFirstThree,
  render: (params): Slide => {
    const { A1, A2, B1, B2, x2 } = firstThree(params);
    const cross = A1 * B1;
    const plain = (value: number) => `${value}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: "This is the coefficient of $x^2$ in the product below: the first expansion's $x^2$ coefficient, its $x$ coefficient times the second's, and the second's $x^2$ coefficient. Tap the step to do next, then choose what it gives.",
        },
        { kind: 'display', tex: pairTex(params) },
      ],
      start: [`${A2}`, '+', br(A1), '\\times', br(B1), '+', `${B2}`],
      reductions: [
        { span: [2, 5], operator: 3, value: br(cross), bank: stepBank(br, cross, A1 + B1, -cross, A1 - B1) },
        { span: [0, 3], operator: 1, value: `${A2 + cross}`, bank: stepBank(plain, A2 + cross, A2 - cross, A2 * cross, A2 + cross - 1) },
        { span: [0, 3], operator: 1, value: `${x2}`, bank: stepBank(plain, x2, x2 - 2 * B2, A2 + cross - B2, x2 - 1) },
      ],
    };
  },
  solution: firstThreeWorking,
};

/** The x^2 coefficient built from nCr and the numbers on x, reduced a piece at a time. */
const firstThreeReduce: Generator<PairParams> = {
  id: 'bin-first-three-reduce',
  sample: sampleFirstThree,
  render: (params): Slide => {
    const { a, m, b, n } = params;
    const own = (c: number, p: number): Expr => (Math.abs(c) === 1 ? num(nCr(p, 2)) : bin('*', num(nCr(p, 2)), pow(num(c), num(2))));
    const expr = bin('+', bin('+', own(a, m), bin('*', num(m * a), num(n * b))), own(b, n));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `This is the coefficient of $x^2$ in the product below: $${ncrTex(m, 2)}$ times the first number on $x$ squared, the two $x$ coefficients multiplied, and $${ncrTex(n, 2)}$ times the second number squared. Tap the part you would work out next, then choose what it comes to.`,
        },
        { kind: 'display', tex: pairTex(params) },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: firstThreeWorking,
};

/** Which is the start of the expansion: the cross term dropped, the x coefficients multiplied, or the x^2 terms alone. */
const firstThreeWhich: Generator<PairParams> = {
  id: 'bin-first-three-which',
  sample: sampleFirstThree,
  render: (params): Slide => {
    const { a, m, b, n } = params;
    const { A1, A2, B1, B2, x1, x2 } = firstThree(params);
    const labels = firstDistinct([
      firstThreeTex(x1, x2),
      firstThreeTex(x1, A2 + B2),
      firstThreeTex(A1 * B1, x2),
      firstThreeTex(x1, A1 * B1),
      firstThreeTex(A1 - B1, x2),
      firstThreeTex(x1, A2 * B2),
    ]);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which is the expansion of $${pairTex(params)}$ as far as the $x^2$ term?` }],
      ...nativeChoice(labels, mix(a, m, b, n)),
    };
  },
  solution: firstThreeWorking,
};

/* --- pairing brackets --- */

interface CollapseParams {
  /** (1 + cx)^n (1 - cx)^n, written the other way round when flipped. */
  c: number;
  n: number;
  flip: boolean;
  /** The power of x asked about. */
  j: number;
}

function collapseTex({ c, n, flip }: Pick<CollapseParams, 'c' | 'n' | 'flip'>): string {
  const [first, second] = flip ? [-c, c] : [c, -c];
  return `${unitBracket(first)}^{${n}}${unitBracket(second)}^{${n}}`;
}

/** 1 - c^2 x^2, without its bracket. */
function collapsedInside(c: number): string {
  return sumTex(['1', termTex(-c * c, 2)]);
}

function collapsedTex({ c, n }: Pick<CollapseParams, 'c' | 'n'>): string {
  return `(${collapsedInside(c)})^{${n}}`;
}

function collapseCoefficient({ c, n, j }: CollapseParams): number {
  return j % 2 === 1 ? 0 : nCr(n, j / 2) * (-(c * c)) ** (j / 2);
}

function collapseWorking(params: CollapseParams): SolutionStep[] {
  const { c, n, j } = params;
  const steps: SolutionStep[] = [
    { text: `A difference of two squares: $${unitBracket(c)}${unitBracket(-c)} = ${collapsedInside(c)}$. Both brackets are to the power $${n}$, so they pair off:` },
    { tex: `${collapseTex(params)} = ${collapsedTex(params)}` },
  ];
  if (j % 2 === 1) {
    steps.push({ text: `Every term of $${collapsedTex(params)}$ is a power of $x^2$, so there are no odd powers: the coefficient of $x^{${j}}$ is $0$.` });
    return steps;
  }
  const t = j / 2;
  steps.push(
    { text: `The $x^{${j}}$ term carries $(${termTex(-c * c, 2)})$ to the power $${t}$, and ${t % 2 === 0 ? 'an even' : 'an odd'} power of a negative is ${t % 2 === 0 ? 'positive' : 'negative'}:` },
    { tex: `${ncrTex(n, t)} \\times (${termTex(-c * c, 2)})^{${t}} = ${termTex(collapseCoefficient(params), j)}` },
  );
  return steps;
}

/**
 * Which product pairs off: the same power on both brackets with opposite
 * signs. The wrong ones leave a bracket over, keep one sign, or change the
 * number on x. Asked two ways: which equals the collapsed bracket, and which
 * has no odd powers.
 */
interface WhichCollapseParams {
  c: number;
  n: number;
  /** The unequal power on one bracket. */
  m: number;
  /** A different number on x. */
  d: number;
  even: boolean;
}

const collapseWhich: Generator<WhichCollapseParams> = {
  id: 'bin-collapse-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const c = rng.int(1, hard ? 3 : 2);
      const n = rng.int(2, 8);
      const m = rng.int(2, 8);
      const d = rng.int(1, 3);
      if (m !== n && d !== c) return { c, n, m, d, even: rng.chance(0.5) };
    }
  },
  render: ({ c, n, m, d, even }): Slide => {
    const labels = [
      `${unitBracket(c)}^{${n}}${unitBracket(-c)}^{${n}}`,
      `${unitBracket(c)}^{${m}}${unitBracket(-c)}^{${n}}`,
      `${unitBracket(c)}^{${n}}${unitBracket(c)}^{${n}}`,
      `${unitBracket(c)}^{${n}}${unitBracket(-d)}^{${n}}`,
    ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: even
            ? 'Which of these products has no odd powers of $x$ in its expansion?'
            : `Which of these products is equal to $${collapsedTex({ c, n })}$?`,
        },
      ],
      ...nativeChoice(labels, mix(c, n, m, d, even ? 1 : 0)),
    };
  },
  solution: ({ c, n, m }) => [
    { text: `$${unitBracket(c)}${unitBracket(-c)} = ${collapsedInside(c)}$, a difference of two squares, and it pairs off only when both brackets carry the same power:` },
    { tex: `${collapseTex({ c, n, flip: false })} = ${collapsedTex({ c, n })}` },
    { text: `Every term of that is a power of $x^2$, so no odd powers appear. With powers $${m}$ and $${n}$, a bracket is left over and brings the odd powers back; with the same sign, or a different number on $x$, nothing cancels at all.` },
  ],
};

function sampleCollapse(rng: Rng, difficulty: number, cs: number[], js: number[]): CollapseParams {
  return { c: rng.pick(cs), n: rng.int(difficulty > 1 ? 3 : 2, 8), flip: rng.chance(0.5), j: rng.pick(js) };
}

/** The coefficient of x^j, typed: 0 for an odd power. The choice form offers the sign dropped and one bracket expanded alone. */
const collapseCoeff: Generator<CollapseParams> = {
  id: 'bin-collapse-coeff',
  sample: (rng, difficulty) => sampleCollapse(rng, difficulty, difficulty > 1 ? [1, 2, 3] : [1, 2], difficulty > 1 ? [3, 4, 4] : [2, 3, 4]),
  choices: (params) => {
    const { c, n, j } = params;
    const value = collapseCoefficient(params);
    const slips = [-value, shortCoef(c, n, j), shortCoef(-c, n, j), nCr(n, Math.floor(j / 2)) * c ** j, nCr(n, j)].filter(
      (slip) => Math.abs(slip) < 10000,
    );
    return aimedNumbers(value, slips, spread(c, n, j, params.flip ? 1 : 0));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `Find the coefficient of $${termTex(1, params.j)}$ in the expansion of $${collapseTex(params)}$.` }],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${collapseCoefficient(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: collapseWorking,
};

/**
 * The sign of the x^(2t) term: pair off, find the power of -c^2x^2, then
 * whether it is even. The slips are keeping the plus, and reading the power
 * of x as the power of the bracket's term.
 */
const collapseFlow: Generator<CollapseParams> = {
  id: 'bin-collapse-flow',
  sample: (rng, difficulty) => sampleCollapse(rng, difficulty, difficulty > 1 ? [2, 3, 4] : [1, 2, 3], [2, 4]),
  render: (params): Slide => {
    const { c, n, j } = params;
    const t = j / 2;
    const inside = termTex(-c * c, 2);
    const value = collapseCoefficient(params);
    const collapsed = `$${collapsedTex(params)}$`;
    const parity = (label: 'Even' | 'Odd') =>
      label === 'Even'
        ? `An even power of a negative is positive, so the $x^{${j}}$ term is **positive**: $${termTex(Math.abs(value), j)}$.`
        : `An odd power of a negative is negative, so the $x^{${j}}$ term is **negative**: $${termTex(-Math.abs(value), j)}$.`;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Is the $x^{${j}}$ term of this product positive or negative? Decide without working it out.` }],
      subject: collapseTex(params),
      steps: [
        {
          id: 'collapse',
          ask: 'Pair the brackets off first. What does the product become?',
          branches: turned(
            [
              { label: collapsed, to: 'power' },
              {
                label: `$(${sumTex(['1', termTex(c * c, 2)])})^{${n}}$`,
                outcome: `$${unitBracket(c)}${unitBracket(-c)}$ is a difference of two squares: $${collapsedInside(c)}$. The minus stays.`,
              },
            ],
            spread(c, n, j),
          ),
        },
        {
          id: 'power',
          ask: `The $x^{${j}}$ term carries $(${inside})$ to which power?`,
          branches: turned(
            [
              { label: `$${t}$`, to: 'parity' },
              { label: `$${j}$`, outcome: `Each factor of $${inside}$ brings $x^2$, so its power $${t}$ makes $x^{${j}}$.` },
            ],
            spread(n, c, j, 5),
          ),
        },
        {
          id: 'parity',
          ask: `Is $${t}$ even or odd?`,
          branches: [
            { label: 'Even', outcome: parity('Even') },
            { label: 'Odd', outcome: parity('Odd') },
          ],
        },
      ],
      answer: [collapsed, `$${t}$`, t % 2 === 0 ? 'Even' : 'Odd'],
    };
  },
  solution: collapseWorking,
};

/**
 * The collapsed bracket and the start of its expansion. The bank holds the
 * plus kept, x left unsquared, the number on x left unsquared, and the
 * coefficients with the sign dropped.
 */
const collapseTiles: Generator<CollapseParams> = {
  id: 'bin-collapse-tiles',
  sample: (rng, difficulty) => sampleCollapse(rng, difficulty, difficulty > 1 ? [1, 2, 3] : [1, 2, 3, 4], difficulty > 1 ? [4] : [2]),
  render: (params): Slide => {
    const { c, n, j } = params;
    const value = collapseCoefficient(params);
    const answer = [collapsedInside(c), signedToken(value, false)];
    // Difficulty 2 asks the x^4 coefficient: the sign kept, c squared not
    // raised to the fourth, and the row's place 4 for place 2.
    const slips =
      j === 4
        ? [signedToken(-value, false), signedToken(nCr(n, 2) * c * c, false), signedToken(nCr(n, 4) * c ** 4, false), signedToken(2 * n * c * c, false)]
        : [signedToken(-value, false), signedToken(c === 1 ? -2 * n : -n * c, false)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: j === 4 ? 'Pair the brackets off into one, then find its $x^4$ term.' : 'Pair the brackets off into one, then start its expansion.',
        },
        { kind: 'display', tex: `${collapseTex(params)} =` },
      ],
      template: j === 4 ? `({0})^${n} = \\dots {1}x^4 + \\dots` : `({0})^${n} = 1 {1}x^2 + \\dots`,
      bank: tileBank(answer, [
        sumTex(['1', termTex(c * c, 2)]),
        sumTex(['1', termTex(-c * c, 1)]),
        sumTex(['1', termTex(c === 1 ? -2 : -c, 2)]),
        ...slips,
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { c, n, j } = params;
    return [
      { text: `$${unitBracket(c)}${unitBracket(-c)} = ${collapsedInside(c)}$, and both brackets are to the power $${n}$:` },
      { tex: `${collapseTex(params)} = ${collapsedTex(params)}` },
      { text: `Expand that with $${termTex(-c * c, 2)}$ as the second part. The $x^{${j}}$ term carries it to the power $${j / 2}$:` },
      { tex: `${ncrTex(n, j / 2)} \\times (${termTex(-c * c, 2)})^{${j / 2}} = ${termTex(collapseCoefficient(params), j)}` },
    ];
  },
};

/* --- trinomials --- */

interface TriParams {
  /** The bracket is (1 + px + qx^2)^n. */
  p: number;
  q: number;
  n: number;
  /** The power of x asked about: 2, or 3 at difficulty 2. */
  k: number;
}

function triU({ p, q }: Pick<TriParams, 'p' | 'q'>): string {
  return sumTex([termTex(p, 1), termTex(q, 2)]);
}

function triTex({ p, q, n }: Pick<TriParams, 'p' | 'q' | 'n'>): string {
  return `(${sumTex(['1', termTex(p, 1), termTex(q, 2)])})^{${n}}`;
}

/** Where x^2 comes from: q once in nu, p^2 at the start of nC2 u^2. Where x^3 comes from: 2pq in u^2 and p^3 in u^3. */
function triCoefficient({ p, q, n, k }: TriParams): number {
  if (k === 2) return n * q + nCr(n, 2) * p * p;
  return 2 * p * q * nCr(n, 2) + nCr(n, 3) * p ** 3;
}

function sampleTri(rng: Rng, difficulty: number, k: number): TriParams {
  const hard = difficulty > 1;
  for (;;) {
    const p = rng.pick(hard ? [-3, -2, -1, 1, 2, 3] : [1, 2]);
    const q = rng.pick(hard ? [-3, -2, -1, 1, 2, 3] : [1, 2, 3]);
    const n = rng.int(k === 3 ? 3 : hard ? 3 : 2, 8);
    const params = { p, q, n, k };
    const value = triCoefficient(params);
    if (value !== 0 && Math.abs(value) < 10000 && Math.abs(nCr(n, 3) * p ** 3) < 10000) return params;
  }
}

function triWorking(params: TriParams): SolutionStep[] {
  const { p, q, n, k } = params;
  const u = triU(params);
  const series = ['1', `${n}u`, `${nCr(n, 2)}u^{2}`, ...(n >= 3 ? [`${nCr(n, 3)}u^{3}`] : []), '\\dots'];
  const steps: SolutionStep[] = [
    { text: `Put $u = ${u}$, so the bracket is $(1 + u)^{${n}}$:` },
    { tex: expansionTex(`(1 + u)^{${n}}`, series) },
  ];
  if (k === 2) {
    steps.push(
      { text: `$${n}u$ gives $${n} \\times ${br(q)}$ lots of $x^2$, and $u^2$ starts $${termTex(p * p, 2)}$. Nothing else reaches $x^2$:` },
      { tex: `${n} \\times ${br(q)} + ${nCr(n, 2)} \\times ${p * p} = ${triCoefficient(params)}` },
    );
  } else {
    steps.push(
      { text: `$u^2 = ${sumTex([termTex(p * p, 2), termTex(2 * p * q, 3), termTex(q * q, 4)])}$ gives $${termTex(2 * p * q, 3)}$, and $u^3$ starts $${termTex(p ** 3, 3)}$:` },
      { tex: `${nCr(n, 2)} \\times ${br(2 * p * q)} + ${nCr(n, 3)} \\times ${br(p ** 3)} = ${triCoefficient(params)}` },
    );
  }
  return steps;
}

/** The two sources of x^2: q from nu, and nC2 times p^2 from u^2, then their sum. */
const trinomialTree: Generator<TriParams> = {
  id: 'bin-trinomial-tree',
  sample: (rng, difficulty) => sampleTri(rng, difficulty, 2),
  render: (params): Slide => {
    const { p, q, n } = params;
    const c2 = nCr(n, 2);
    const answer = [n * q, c2, p * p, c2 * p * p, triCoefficient(params)].map(String);
    const slips = [n * p, c2 * p, n + c2, -n * q, 2 * p, triCoefficient(params) - n * q + 1];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Write this as $(1 + u)^{${n}}$ with $u = ${triU(params)}$. Fill in the $x^2$ coefficient from $${n}u$, then $${ncrTex(n, 2)}$, $${br(p)}^2$, the $x^2$ coefficient from $${ncrTex(n, 2)}u^2$, and the total.`,
        },
      ],
      expression: triTex(params),
      nodes: [
        { id: 'once', from: [] },
        { id: 'pairs', from: [] },
        { id: 'square', from: [] },
        { id: 'twice', from: ['pairs', 'square'] },
        { id: 'total', from: ['once', 'twice'] },
      ],
      bank: treeBank(answer, slips.map(String)),
      answer,
    };
  },
  solution: triWorking,
};

/** The x^2 coefficient worked a step at a time: the square, nCr, the product, then the sums. */
const trinomialWorkSteps: Generator<TriParams> = {
  id: 'bin-trinomial-work-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      // A p of 1 squares to nothing worth a step, so it becomes 3.
      const params = { ...sampleTri(rng, difficulty, 2) };
      if (Math.abs(params.p) === 1) params.p *= 3;
      const value = triCoefficient(params);
      if (value !== 0 && Math.abs(value) < 10000) return params;
    }
  },
  render: (params): Slide => {
    const { p, q, n } = params;
    const c2 = nCr(n, 2);
    const square = p * p;
    const plain = (value: number) => `${value}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `This is the coefficient of $x^2$ in the bracket below, with $u = ${triU(params)}$: the $x^2$ from $${n}u$, then the $x^2$ from $${ncrTex(n, 2)}u^2$. Tap the step to do next, then choose what it gives.`,
        },
        { kind: 'display', tex: triTex(params) },
      ],
      start: [`${n}`, '\\times', br(q), '+', ncrTex(n, 2), '\\times', `${br(p)}^{2}`],
      reductions: [
        { span: [6, 7], value: `${square}`, bank: stepBank(br, square, 2 * Math.abs(p), -square, square + 1) },
        { span: [4, 5], value: `${c2}`, bank: stepBank(plain, c2, n, nCr(n + 1, 2), 2 * n) },
        { span: [4, 7], operator: 5, value: `${c2 * square}`, bank: stepBank(plain, c2 * square, c2 + square, c2 * Math.abs(p), c2 * square + 1) },
        { span: [0, 3], operator: 1, value: `${n * q}`, bank: stepBank(plain, n * q, n + q, -n * q, n * q + 1) },
        {
          span: [0, 3],
          operator: 1,
          value: `${triCoefficient(params)}`,
          bank: stepBank(plain, triCoefficient(params), n * q - c2 * square, c2 * square - n * q, triCoefficient(params) + 1),
        },
      ],
    };
  },
  solution: triWorking,
};

/** The x^2 (or at difficulty 2, sometimes x^3) coefficient typed. The choice form offers one source of x^k left out. */
const trinomialCoeff: Generator<TriParams> = {
  id: 'bin-trinomial-coeff',
  sample: (rng, difficulty) => sampleTri(rng, difficulty, difficulty > 1 && rng.chance(0.5) ? 3 : 2),
  choices: (params) => {
    const { p, q, n, k } = params;
    const value = triCoefficient(params);
    const c2 = nCr(n, 2);
    const slips =
      k === 2
        ? [c2 * p * p, n * q, n * q + c2 * p, n * q + 2 * c2 * p * p]
        : [2 * p * q * c2, nCr(n, 3) * p ** 3, p * q * c2 + nCr(n, 3) * p ** 3, 2 * p * q * c2 - nCr(n, 3) * p ** 3];
    return aimedNumbers(value, slips, spread(p, q, n, k));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `Find the coefficient of $${termTex(1, params.k)}$ in the expansion of $${triTex(params)}$.` }],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${triCoefficient(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: triWorking,
};

/** Which is the start of the expansion: q from u forgotten, u^2 forgotten, or p left unsquared. */
const trinomialWhich: Generator<TriParams> = {
  id: 'bin-trinomial-which',
  sample: (rng, difficulty) => sampleTri(rng, difficulty, 2),
  render: (params): Slide => {
    const { p, q, n } = params;
    const c2 = nCr(n, 2);
    const line = (x1: number, x2: number) => firstThreeTex(x1, x2);
    const labels = firstDistinct([
      line(n * p, triCoefficient(params)),
      line(n * p, c2 * p * p),
      line(n * p, n * q),
      line(n * p, n * q + c2 * p),
      line(n * q, triCoefficient(params)),
      line(n * p, n * q + 2 * c2 * p * p),
    ]);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which is the expansion of $${triTex(params)}$ as far as the $x^2$ term?` }],
      ...nativeChoice(labels, mix(p, q, n)),
    };
  },
  solution: (params) => [
    ...triWorking(params),
    { text: `The $x$ term comes only from $${params.n}u$: $${params.n} \\times ${br(params.p)} = ${params.n * params.p}$.` },
    { tex: `${triTex(params)} = ${firstThreeTex(params.n * params.p, triCoefficient(params))} + \\dots` },
  ],
};

/* --- equating across a product --- */

interface IdentityParams {
  /** (1 + x)^m (1 + x)^n = (1 + x)^(m + n), and the x^k coefficient of both. */
  m: number;
  n: number;
  k: number;
}

/**
 * m, n and k with two to `most` pairs making x^k, every one of them a real
 * term: a bracket too short for a power simply drops that pair.
 */
function sampleIdentity(rng: Rng, difficulty: number, most: number): IdentityParams {
  const hard = difficulty > 1;
  for (;;) {
    const k = rng.int(2, 3);
    const m = rng.int(1, 7);
    const n = rng.int(1, 7);
    const total = m + n;
    if (total < (hard ? 5 : 4) || total > (hard ? 8 : k === 3 ? 6 : 8)) continue;
    const count = pairsOf({ a: 1, m, b: 1, n, k }).length;
    if (count >= 2 && count <= most) return { m, n, k };
  }
}

function identityProducts({ m, n, k }: IdentityParams): { i: number; value: number }[] {
  return pairsOf({ a: 1, m, b: 1, n, k }).map((i) => ({ i, value: nCr(m, i) * nCr(n, k - i) }));
}

/** (1 + x)^m, the power left off when it is 1. */
function onePlusX(m: number): string {
  return m === 1 ? '(1 + x)' : `(1 + x)^{${m}}`;
}

function identityWorking(params: IdentityParams): SolutionStep[] {
  const { m, n, k } = params;
  const products = identityProducts(params);
  return [
    { text: `$${onePlusX(m)}${onePlusX(n)} = (1 + x)^{${m + n}}$, so the $x^{${k}}$ coefficient worked either way is the same. On the left it is the pairs, one term from each bracket:` },
    { tex: column(products.map(({ i, value }) => [`${ncrTex(m, i)} \\times ${ncrTex(n, k - i)}`, value])) },
    { tex: `${products.map(({ value }) => value).join(' + ')} = ${nCr(m + n, k)}` },
    { text: `On the right it is one number from row $${m + n}$ of Pascal's triangle:` },
    { tex: `${ncrTex(m + n, k)} = ${nCr(m + n, k)}` },
  ];
}

/**
 * The pairs of (1 + x)^m (1 + x)^n as numbers, and the single nCr from
 * (1 + x)^(m + n) they add up to. The bank's other nCr are one row or one
 * place out, and never the same number written the other way round.
 */
const identityTiles: Generator<IdentityParams> = {
  id: 'bin-identity-tiles',
  sample: (rng, difficulty) => sampleIdentity(rng, difficulty, 3),
  render: (params): Slide => {
    const { m, n, k } = params;
    const products = identityProducts(params);
    const total = m + n;
    const answer = [...products.map(({ value }) => `${value}`), ncrTex(total, k)];
    const rows = [
      [total, k + 1],
      [total - 1, k],
      [total + 1, k],
      [m * n, k],
    ].filter(([row, r]) => nCr(row, r) > 0 && nCr(row, r) !== nCr(total, k));
    const slips = [
      ...rows.map(([row, r]) => ncrTex(row, r)),
      `${nCr(m, k) + nCr(n, k)}`,
      `${nCr(m, 1) * nCr(n, 1) + 1}`,
      `${products[0].value + 1}`,
    ];
    const bank = tileBank(answer, slips);
    const numbers = bank.filter((token) => NUMBER.test(token)).sort((x, y) => Number(x) - Number(y));
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$${onePlusX(m)}${onePlusX(n)} = (1 + x)^{${total}}$, so both sides have the same $x^{${k}}$ coefficient. Fill in what each pair on the left makes, lowest power from $${onePlusX(m)}$ first, then the one number from the right it must equal.`,
        },
      ],
      template: `${products.map((_, at) => `{${at}}`).join(' + ')} = {${products.length}}`,
      bank: [...numbers, ...bank.filter((token) => !NUMBER.test(token))],
      answer,
    };
  },
  solution: identityWorking,
};

/** A sum of nCr products, two to a line. */
function pairSumTex({ m, n, k }: IdentityParams): string {
  const terms = identityProducts({ m, n, k }).map(({ i }) => `${ncrTex(m, i)} \\times ${ncrTex(n, k - i)}`);
  const lines: string[] = [];
  for (let at = 0; at < terms.length; at += 2) lines.push(`${at === 0 ? '&' : '&\\quad +'} ${terms.slice(at, at + 2).join(' + ')}`);
  return chain(...lines);
}

/** The sum of pair products as one number, typed. The choice form offers each bracket's own term, and a place out. */
const identitySum: Generator<IdentityParams> = {
  id: 'bin-identity-sum',
  sample: (rng, difficulty) => sampleIdentity(rng, difficulty, 4),
  choices: (params) => {
    const { m, n, k } = params;
    const right = nCr(m + n, k);
    return aimedNumbers(
      right,
      [nCr(m, k) + nCr(n, k), nCr(m + n, k + 1), nCr(m + n, k - 1), right - identityProducts(params)[0].value],
      spread(m, n, k),
    );
  },
  render: (params): Slide => {
    const { m, n } = params;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Each product pairs a term of $${onePlusX(m)}$ with a term of $${onePlusX(n)}$. What is the sum, as one number?`,
        },
        { kind: 'display', tex: pairSumTex(params) },
      ],
      lead: '\\text{sum} =',
      keypad: [],
      answer: `${nCr(m + n, params.k)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: identityWorking,
};

interface FindAParams {
  /** (1 + ax)^m (1 + bx)^n with a unknown; the x coefficient ma + nb is given. */
  a: number;
  m: number;
  b: number;
  n: number;
}

function sampleFindA(rng: Rng, difficulty: number): FindAParams {
  const hard = difficulty > 1;
  for (;;) {
    const a = rng.pick([-3, -2, -1, 1, 2, 3]);
    const m = hard ? rng.int(2, 4) : 2;
    const b = hard ? rng.pick([-3, -2, -1, 1, 2, 3]) : rng.pick([1, 2]);
    const n = hard ? rng.int(2, 6) : rng.int(3, 6);
    if (m + n > 8) continue;
    const params = { a, m, b, n };
    if (m * a + n * b !== 0 && Math.abs(findASecond(params)) < 10000) return params;
  }
}

/** The x^2 coefficient once a is known: each bracket's own x^2 term, and the two x terms multiplied. */
function findASecond({ a, m, b, n }: FindAParams): number {
  return nCr(m, 2) * a * a + m * a * n * b + nCr(n, 2) * b * b;
}

function findATex({ m, b, n }: FindAParams): string {
  return `(1 + ax)^{${m}}${unitBracket(b)}^{${n}}`;
}

/** ma + nb as the learner writes it, a still a letter. */
function findAExpr({ m, b, n }: FindAParams): string {
  return sumTex([times(m, 'a'), `${n * b}`]);
}

function findAWorking(params: FindAParams): SolutionStep[] {
  const { a, m, b, n } = params;
  const c = m * a + n * b;
  return [
    { text: `The $x$ term is $x$ from one bracket times $1$ from the other: $${m}ax$ from the first and $${termTex(n * b, 1)}$ from the second.` },
    { tex: chain(`${findAExpr(params)} &= ${c}`, `${times(m, 'a')} &= ${c - n * b}`, `a &= ${a}`) },
  ];
}

/** The given x coefficient; `shown` when the product is drawn beneath the prompt. */
function findAPrompt(params: FindAParams, shown = false): string {
  const where = shown ? 'this product' : `$${findATex(params)}$`;
  return `In the expansion of ${where}, the coefficient of $x$ is $${params.m * params.a + params.n * params.b}$.`;
}

/** a typed. The choice form offers the division left undone, the sign not turned, and a turned. */
const findACoeff: Generator<FindAParams> = {
  id: 'bin-find-a-coeff',
  sample: sampleFindA,
  choices: (params) => {
    const { a, m, b, n } = params;
    const c = m * a + n * b;
    return aimedNumbers(a, [c - n * b, (c + n * b) / m, -a, (c - n) / m, c / m], spread(a, m, b, n));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${findAPrompt(params)} Find $a$.` }],
    lead: 'a =',
    keypad: [],
    answer: `${params.a}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: findAWorking,
};

/**
 * Which expression is the x coefficient, then a from it. The wrong turns are
 * multiplying the two parts, forgetting the power's m, and leaving the
 * division undone.
 */
const findAFlow: Generator<FindAParams> = {
  id: 'bin-find-a-flow',
  sample: sampleFindA,
  render: (params): Slide => {
    const { a, m, b, n } = params;
    const nb = n * b;
    const c = m * a + nb;
    const right = `$${findAExpr(params)}$`;
    const solved = `$a = ${a}$`;
    const extra = (c + nb) / m;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${findAPrompt(params, true)} Plan how to find $a$.` }],
      subject: findATex(params),
      steps: [
        {
          id: 'x',
          ask: 'Which expression is the coefficient of $x$?',
          branches: turned(
            [
              { label: right, to: 'solve' },
              {
                label: `$${times(m, 'a')} \\times ${br(nb)}$`,
                outcome: 'An $x$ term is $x$ from one bracket times $1$ from the other, so the two parts add.',
              },
              {
                label: `$${sumTex(['a', `${nb}`])}$`,
                outcome: `The first bracket is to the power $${m}$, so its $x$ term is $${m}ax$, not $ax$.`,
              },
            ],
            spread(a, m, b, n),
          ),
        },
        {
          id: 'solve',
          ask: `$${findAExpr(params)} = ${c}$. What is $a$?`,
          branches: turned(
            [
              { label: solved, outcome: `Right: $${times(m, 'a')} = ${c - nb}$, so $a = ${a}$.` },
              { label: `$a = ${c - nb}$`, outcome: `That is $${times(m, 'a')}$: divide by $${m}$ as well.` },
              ...(Number.isInteger(extra) && extra !== a && extra !== c - nb
                ? [{ label: `$a = ${extra}$`, outcome: `The $${nb}$ moves across with its sign changed: $${times(m, 'a')} = ${c - nb}$.` }]
                : []),
            ],
            spread(n, b, a, m, 9),
          ),
        },
      ],
      answer: [right, solved],
    };
  },
  solution: findAWorking,
};

/** a from the x coefficient, then the x^2 coefficient it unlocks. */
const findATree: Generator<FindAParams> = {
  id: 'bin-find-a-tree',
  sample: sampleFindA,
  render: (params): Slide => {
    const { a, m, b, n } = params;
    const square = nCr(m, 2) * a * a;
    const cross = m * a * n * b;
    const B2 = nCr(n, 2) * b * b;
    const answer = [m * a, a, square, cross, findASecond(params)].map(String);
    const slips = [m * a + 2 * n * b, -a, m * a * a, -cross, square + cross, findASecond(params) - 2 * cross];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${findAPrompt(params, true)} Fill in $${times(m, 'a')}$ and $a$, then the first bracket's own $x^2$ coefficient and the two $x$ coefficients multiplied. The $x^2$ coefficient adds those to the second bracket's own, $${B2}$.`,
        },
      ],
      expression: findATex(params),
      nodes: [
        { id: 'ma', from: [] },
        { id: 'a', from: ['ma'] },
        { id: 'square', from: ['a'] },
        { id: 'cross', from: ['a'] },
        { id: 'total', from: ['square', 'cross'] },
      ],
      bank: treeBank(answer, slips.map(String)),
      answer,
    };
  },
  solution: (params) => {
    const { a, m, b, n } = params;
    return [
      ...findAWorking(params),
      { text: `So the first bracket is $${unitBracket(a)}^{${m}}$. Its own $x^2$ coefficient, the two $x$ coefficients multiplied, and the second's own $x^2$ coefficient:` },
      { tex: `${nCr(m, 2) * a * a} + ${br(m * a)} \\times ${br(n * b)} + ${nCr(n, 2) * b * b} = ${findASecond(params)}` },
    ];
  },
};

/* ---------- Level 5: estimates and surds ---------- */

/*
 * Level 5 starts where level 2's estimate stopped. How big its error is, and
 * so how many decimal places it can be trusted to; a number in front of x, as
 * in (2.01)^5 = (2 + 0.01)^5; and brackets with a surd in them, whose powers
 * gather into a whole part and a multiple of the root. Surd arithmetic itself
 * belongs to Exponents & Radicals and is only pointed at here.
 *
 * The same limits hold: n is at most 8, every coefficient, term and option is
 * exact and under 10000, and a and b in a + b√k come from the row, even
 * powers into a and odd into b, never from a float.
 */

/** The first `count` distinct slips that are not already answer tokens. */
function fewSlips(answer: string[], slips: string[], count = 4): string[] {
  return [...new Set(slips)].filter((token) => !answer.includes(token)).slice(0, count);
}

/** Whole slips under 10000 and not the answer itself, for an aimed choice. */
function wholeSlips(right: number, ...slips: number[]): number[] {
  return slips.filter((value) => Number.isInteger(value) && value !== right && Math.abs(value) < 10000);
}

/* --- how big the error is --- */

interface DropParams {
  n: number;
  /** x in hundredths, as in level 2: -3 is -0.03. */
  d: number;
}

/** The first term the three-term estimate leaves out, nC3 x^3, in millionths. */
function droppedTerm({ n, d }: DropParams): number {
  return nCr(n, 3) * d ** 3;
}

/** How far the three-term estimate is from the power itself: every term past x^2. */
function estimateError({ n, d }: DropParams): number {
  let sum = 0;
  for (let r = 3; r <= n; r += 1) sum += nCr(n, r) * (d / 100) ** r;
  return sum;
}

/** Half a unit in the k-th decimal place: 0.0005 for k = 3. */
function halfUnit(k: number): number {
  return 5 / 10 ** (k + 1);
}

/** halfUnit written out in full: String() would turn 0.0000005 into 5e-7. */
function halfUnitTex(k: number): string {
  return `0.${'0'.repeat(k)}5`;
}

/** A whole unit in the k-th decimal place, written out in full. */
function unitTex(k: number): string {
  return k === 0 ? '1' : `0.${'0'.repeat(k - 1)}1`;
}

/** The most decimal places an error this size leaves accurate: it must be under half a unit in the last one. */
function placesFor(error: number): number {
  let k = 0;
  while (Math.abs(error) < halfUnit(k + 1)) k += 1;
  return k;
}

/**
 * Whether the true error and the first term left out agree on the places, and
 * sit well clear of the boundaries either side, so that "the error is about
 * the first term left out" gives the right answer and not a lucky one.
 */
function clearCut(params: DropParams): boolean {
  const error = Math.abs(estimateError(params));
  const k = placesFor(error);
  return placesFor(droppedTerm(params) / 1e6) === k && error < 0.8 * halfUnit(k) && error > 1.25 * halfUnit(k + 1);
}

function sampleDrop(rng: Rng, difficulty: number): DropParams {
  const hard = difficulty > 1;
  const size = rng.int(1, hard ? 7 : 6);
  return { n: rng.int(hard ? 4 : 3, 8), d: hard && rng.chance(0.5) ? -size : size };
}

function sampleClearDrop(rng: Rng, difficulty: number): DropParams {
  for (;;) {
    const params = sampleDrop(rng, difficulty);
    if (clearCut(params)) return params;
  }
}

function dropPrompt({ n, d }: DropParams): string {
  return `You estimate $(${baseOf(d)})^{${n}}$ from the first three terms of $(1 + x)^{${n}}$, with $x = ${dec(d, 100)}$.`;
}

/** The term left out, worked, and why it is the size of the error. */
function dropWorking(params: DropParams): SolutionStep[] {
  const { n, d } = params;
  const x = inLine(dec(d, 100));
  return [
    { text: `The estimate stops at $x^2$, so the first term it leaves out is $${ncrTex(n, 3)}x^3$, and $${ncrTex(n, 3)} = ${nCr(n, 3)}$.` },
    { tex: `${nCr(n, 3)} \\times ${x}^{3} = ${nCr(n, 3)} \\times ${inLine(dec(d ** 3, 1e6))} = ${dec(droppedTerm(params), 1e6)}` },
    { text: 'Every term after it carries a higher power of a small number, so the error is about this size.' },
  ];
}

interface DropAskParams extends DropParams {
  /** Whether the question names the first term left out, or leaves it to be found. */
  hint: boolean;
}

/**
 * The first term left out, typed as a decimal. The choice form offers the
 * wrong entry of the row, x squared where it is cubed, and the decimal point
 * a place out.
 */
const droppedTermGen: Generator<DropAskParams> = {
  id: 'bin-dropped-term',
  sample: (rng, difficulty) => ({ ...sampleDrop(rng, difficulty), hint: difficulty < 2 }),
  choices: (params) => {
    const { n, d } = params;
    const right = droppedTerm(params);
    const option = (units: number): ChoiceOption => ({ tex: dec(units, 1e6), answer: dec(units, 1e6) });
    const slips = [nCr(n, 2) * d ** 3, 100 * nCr(n, 3) * d * d, 10 * right, n * d ** 3, -right, 100 * right].filter(
      (units) => Number.isInteger(units) && units !== 0 && units !== right,
    );
    return fourOptions(option(right), ...slips.map(option));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${dropPrompt(params)} What is the first term it leaves out, as a decimal?` }],
    lead: params.hint ? `${ncrTex(params.n, 3)}x^3 =` : '\\text{first term dropped} =',
    keypad: [],
    answer: dec(droppedTerm(params), 1e6),
    domain: 'real',
    mode: 'exact',
  }),
  solution: dropWorking,
};

/**
 * The two terms the estimate keeps, the term it leaves out, and the estimate
 * from the first two. The slips are the decimal point a place out, x left
 * unsquared, and the term left out one place out.
 */
const keptSumTree: Generator<DropParams> = {
  id: 'bin-kept-sum-tree',
  sample: sampleDrop,
  render: (params): Slide => {
    const { n, d } = params;
    const c2 = nCr(n, 2);
    const answer = [dec(n * d, 100), dec(c2 * d * d, 10000), dec(droppedTerm(params), 1e6), dec(threeTerms(params), 10000)];
    const slips = [
      dec(n * d, 1000),
      dec(c2 * d, 100),
      dec(c2 * d * d, 1000),
      dec(droppedTerm(params), 1e5),
      dec(10000 + 100 * n * d, 10000),
      dec(threeTerms(params) + 9 * c2 * d * d, 10000),
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Estimate this from $(1 + x)^{${n}} \\approx 1 + ${n}x + ${c2}x^2$ with $x = ${dec(d, 100)}$. Top row, left to right: the $x$ term, the $x^2$ term, and the first term left out, $${termTex(nCr(n, 3), 3)}$. Then the estimate: $1$ plus the two terms kept.`,
        },
      ],
      expression: `(${baseOf(d)})^{${n}}`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'dropped', from: [] },
        { id: 'estimate', from: ['first', 'second'] },
      ],
      bank: treeBank(answer, slips),
      answer,
    };
  },
  solution: (params) => {
    const { n, d } = params;
    const x = inLine(dec(d, 100));
    return [
      {
        tex: column([
          [`${n} \\times ${x}`, dec(n * d, 100)],
          [`${nCr(n, 2)} \\times ${x}^{2}`, dec(nCr(n, 2) * d * d, 10000)],
          [`${nCr(n, 3)} \\times ${x}^{3}`, dec(droppedTerm(params), 1e6)],
        ]),
      },
      { tex: `1 + ${inLine(dec(n * d, 100))} + ${dec(nCr(n, 2) * d * d, 10000)} = ${dec(threeTerms(params), 10000)}` },
      { text: `The estimate is out by about the term left out, $${dec(droppedTerm(params), 1e6)}$.` },
    ];
  },
};

/** The error against half a unit in each place, and the places it leaves. */
function placesWorking(params: DropParams): SolutionStep[] {
  const k = placesFor(estimateError(params));
  const size = dec(Math.abs(droppedTerm(params)), 1e6);
  return [
    ...dropWorking(params),
    {
      text: `An estimate is accurate to $k$ decimal places when its error is under half a unit in place $k$. $${size}$ is under $${halfUnitTex(k)}$ but not under $${halfUnitTex(k + 1)}$, so the estimate is accurate to $${k}$ decimal places.`,
    },
  ];
}

/**
 * How many decimal places the estimate can be trusted to. Difficulty 1 names
 * the term left out; difficulty 2 leaves it to be found. The wrong options
 * are the places either side.
 */
const safePlaces: Generator<DropAskParams> = {
  id: 'bin-safe-places',
  sample: (rng, difficulty) => ({ ...sampleClearDrop(rng, difficulty), hint: difficulty < 2 }),
  render: (params): Slide => {
    const k = placesFor(estimateError(params));
    const labels = [k, k + 1, k - 1, k + 2].filter((places) => places >= 1).map((places) => `${places}`);
    const hint = params.hint ? ` The first term it leaves out is $${dec(droppedTerm(params), 1e6)}$.` : '';
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `${dropPrompt(params)}${hint} To how many decimal places is the estimate accurate?` }],
      ...nativeChoice(labels, mix(params.n, params.d, params.hint ? 1 : 0)),
    };
  },
  solution: placesWorking,
};

interface EnoughParams extends DropParams {
  /** The decimal places asked for. */
  k: number;
}

/**
 * Whether three terms give the power to k places: the term left out, half a
 * unit in place k, and the comparison. The wrong turns are the wrong entry of
 * the row, x squared, and a whole unit taken for half of one.
 */
const enoughFlow: Generator<EnoughParams> = {
  id: 'bin-enough-terms-flow',
  sample: (rng, difficulty) => {
    const params = sampleClearDrop(rng, difficulty);
    const k = placesFor(estimateError(params));
    return { ...params, k: rng.chance(0.5) ? k : k + 1 };
  },
  render: (params): Slide => {
    const { n, d, k } = params;
    const dropped = `$${dec(droppedTerm(params), 1e6)}$`;
    const size = dec(Math.abs(droppedTerm(params)), 1e6);
    const half = `$${halfUnitTex(k)}$`;
    const wrongTerms = [
      {
        label: `$${dec(nCr(n, 2) * d ** 3, 1e6)}$`,
        outcome: `The number in front of $x^3$ is $${ncrTex(n, 3)} = ${nCr(n, 3)}$, the fourth entry of row $${n}$.`,
      },
      { label: `$${dec(nCr(n, 3) * d * d, 10000)}$`, outcome: 'The term left out is the $x^3$ term, so $x$ is cubed, not squared.' },
    ].filter((branch) => branch.label !== dropped);
    const base = baseOf(d);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Can the first three terms of $(1 + x)^{${n}}$, with $x = ${dec(d, 100)}$, give this correct to $${k}$ decimal places? Decide step by step.`,
        },
      ],
      subject: `(${base})^{${n}}`,
      steps: [
        {
          id: 'dropped',
          ask: 'What is the first term the three terms leave out?',
          branches: turned([{ label: dropped, to: 'bound' }, ...wrongTerms], spread(n, d, k)),
        },
        {
          id: 'bound',
          ask: `Accurate to $${k}$ decimal places means an error under half a unit in place $${k}$. What is that?`,
          branches: turned(
            [
              { label: half, to: 'compare' },
              { label: `$${unitTex(k)}$`, outcome: 'That is a whole unit in that place. The error has to be under half of one.' },
              { label: `$${halfUnitTex(k + 1)}$`, outcome: `That is half a unit in place $${k + 1}$, one place too far.` },
            ],
            spread(k, n, d, 7),
          ),
        },
        {
          id: 'compare',
          ask: `Leaving its sign aside, is $${size}$ less than ${half}?`,
          branches: [
            { label: 'Yes', outcome: `Then three terms give $(${base})^{${n}}$ to $${k}$ decimal places.` },
            { label: 'No', outcome: `Then three terms are not enough for $${k}$ decimal places: the $x^3$ term is needed as well.` },
          ],
        },
      ],
      answer: [dropped, half, Math.abs(droppedTerm(params)) / 1e6 < halfUnit(k) ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { k } = params;
    const size = dec(Math.abs(droppedTerm(params)), 1e6);
    const enough = Math.abs(droppedTerm(params)) / 1e6 < halfUnit(k);
    return [
      ...dropWorking(params),
      {
        text: enough
          ? `Half a unit in place $${k}$ is $${halfUnitTex(k)}$, and $${size}$ is under it: three terms are enough.`
          : `Half a unit in place $${k}$ is $${halfUnitTex(k)}$, and $${size}$ is not under it: three terms are not enough.`,
      },
    ];
  },
};

/* --- a number in front --- */

interface NearParams {
  /** The whole number the base is near: the bracket is (a + x)^n, or (a - x)^n when `minus`. */
  a: number;
  n: number;
  /** x in hundredths, always positive. */
  d: number;
  minus: boolean;
}

function sampleNear(rng: Rng, difficulty: number): NearParams {
  const hard = difficulty > 1;
  const a = rng.pick([2, 2, 3]);
  const n = a === 2 ? rng.int(hard ? 4 : 3, 8) : rng.int(3, hard ? 7 : 5);
  return { a, n, d: rng.int(1, hard ? 5 : 4), minus: hard && rng.chance(0.5) };
}

/** The number being raised to the power: 2.01, or 1.98 below 2. */
function nearBase({ a, d, minus }: NearParams): string {
  return dec(100 * a + (minus ? -d : d), 100);
}

function nearBracket({ a, n, minus }: NearParams): string {
  return `(${a} ${minus ? '-' : '+'} x)^{${n}}`;
}

/** The first three coefficients of (a ± x)^n, the sign carried on the x term. */
function nearCoefs({ a, n, minus }: NearParams): [number, number, number] {
  return [a ** n, (minus ? -1 : 1) * n * a ** (n - 1), nCr(n, 2) * a ** (n - 2)];
}

/** The three-term estimate in ten-thousandths. */
function nearUnits(params: NearParams): number {
  const [c0, c1, c2] = nearCoefs(params);
  return 10000 * c0 + 100 * c1 * params.d + c2 * params.d ** 2;
}

function nearWorking(params: NearParams): SolutionStep[] {
  const { a, d, minus } = params;
  const [c0, c1, c2] = nearCoefs(params);
  const x = dec(d, 100);
  const sign = minus ? '-' : '+';
  return [
    { text: `$${nearBase(params)} = ${a} ${sign} ${x}$, so expand $${nearBracket(params)}$ and put $x = ${x}$. The $${a}$ is raised to a power in every term.` },
    { tex: expansionTex(nearBracket(params), [termTex(c0, 0), termTex(c1, 1), termTex(c2, 2), '\\dots']) },
    {
      tex: chain(
        `& ${c0} ${sign} ${Math.abs(c1)} \\times ${x}`,
        `&\\quad + ${c2} \\times ${x}^{2}`,
        `&= ${c0} ${sign} ${dec(Math.abs(c1) * d, 100)} + ${dec(c2 * d * d, 10000)}`,
        `&= ${dec(nearUnits(params), 10000)}`,
      ),
    },
  ];
}

/**
 * Which bracket and which x estimate the power. The slips are the sign of x,
 * a 1 in front where the power sits near 2 or 3, and the decimal point a
 * place out.
 */
const nearSetup: Generator<NearParams> = {
  id: 'bin-near-setup',
  sample: (rng, difficulty) => ({ ...sampleNear(rng, difficulty), minus: rng.chance(difficulty > 1 ? 0.5 : 0.3) }),
  render: (params): Slide => {
    const { a, n, d, minus } = params;
    const x = dec(d, 100);
    const flipped = { ...params, minus: !minus };
    const labels = [
      `${nearBracket(params)}, \\; x = ${x}`,
      `${nearBracket(flipped)}, \\; x = ${x}`,
      `(1 + x)^{${n}}, \\; x = ${dec(100 * (a - 1) + (minus ? -d : d), 100)}`,
      `${nearBracket(params)}, \\; x = ${dec(d, 10)}`,
    ];
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `To estimate $(${nearBase(params)})^{${n}}$ from a binomial expansion, which bracket and which small $x$ do you use?` }],
      ...nativeChoice(labels, mix(a, n, d, minus ? 1 : 0)),
    };
  },
  solution: (params) => [
    { text: `Write the number as the whole number it is near and a small change: $${nearBase(params)} = ${params.a} ${params.minus ? '-' : '+'} ${dec(params.d, 100)}$.` },
    { text: `So the bracket is $${nearBracket(params)}$ with $x = ${dec(params.d, 100)}$. A small $x$ is what makes the later terms small enough to drop.` },
  ],
};

/**
 * The first three terms of (a ± x)^n placed with their signs. The slips are
 * the powers of a forgotten, the sign turned, and a^n written as a times n.
 */
const nearTiles: Generator<NearParams> = {
  id: 'bin-near-tiles',
  sample: sampleNear,
  render: (params): Slide => {
    const { a, n, minus } = params;
    const [c0, c1, c2] = nearCoefs(params);
    const s = minus ? -1 : 1;
    const answer = [signedToken(c0, true), signedToken(c1, false), signedToken(c2, false)];
    const slips = [
      signedToken(s * n, false),
      signedToken(-c1, false),
      signedToken(nCr(n, 2), false),
      signedToken(nCr(n, 2) * a ** (n - 1), false),
      signedToken(-c2, false),
      `${a * n}`,
      `${a ** (n - 1)}`,
    ];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `To estimate $(${nearBase(params)})^{${n}}$, expand $${nearBracket(params)}$ as far as the $x^2$ term.` }],
      template: `(${a} ${minus ? '-' : '+'} x)^${n} = {0} {1}x {2}x^2 + \\dots`,
      bank: tileBank(answer, fewSlips(answer, slips)),
      answer,
    };
  },
  solution: (params) => {
    const { a, n } = params;
    const [c0, c1, c2] = nearCoefs(params);
    const x = params.minus ? '(-x)' : 'x';
    return [
      { text: `Row $${n}$ starts $1, ${n}, ${nCr(n, 2)}$, and the power of $${a}$ drops by one each term as the power of $x$ rises.` },
      {
        tex: chain(
          `& ${a}^{${n}} = ${c0}`,
          `& ${n} \\times ${a}^{${n - 1}} \\times ${x} = ${termTex(c1, 1)}`,
          `& ${nCr(n, 2)} \\times ${a}^{${n - 2}} \\times ${x}^{2} = ${termTex(c2, 2)}`,
        ),
      },
    ];
  },
};

/**
 * Putting x into the three terms, a step at a time: the square, the two
 * products, the sums. Each bank holds the decimal point a place out.
 */
const nearSubstituteSteps: Generator<NearParams> = {
  id: 'bin-near-substitute-steps',
  sample: sampleNear,
  render: (params): Slide => {
    const { d, minus } = params;
    const [c0, c1, c2] = nearCoefs(params);
    const size = Math.abs(c1);
    const x = dec(d, 100);
    const bank = (right: string, ...wrong: string[]) => [...new Set([right, ...wrong])].sort();
    const square = dec(d * d, 10000);
    const second = dec(c2 * d * d, 10000);
    const first = dec(size * d, 100);
    const partial = dec(100 * c0 + (minus ? -1 : 1) * size * d, 100);
    const total = dec(nearUnits(params), 10000);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Estimate $(${nearBase(params)})^{${params.n}}$: put $x = ${x}$ into the first three terms of $${nearBracket(params)}$. Tap the step to do next, then choose what it gives.`,
        },
      ],
      start: [`${c0}`, minus ? '-' : '+', `${size}`, '\\times', x, '+', `${c2}`, '\\times', `${x}^{2}`],
      reductions: [
        { span: [8, 9], operator: 8, value: square, bank: bank(square, dec(d * d, 1000), dec(2 * d, 100), dec(d * d, 100000)) },
        { span: [6, 9], operator: 7, value: second, bank: bank(second, dec(c2 * d * d, 1000), dec(c2 * d * d, 100000), dec(c2 * d, 100)) },
        { span: [2, 5], operator: 3, value: first, bank: bank(first, dec(size * d, 1000), dec(size * d, 10), dec(size + d, 100)) },
        {
          span: [0, 3],
          operator: 1,
          value: partial,
          bank: bank(partial, dec(100 * c0 - (minus ? -1 : 1) * size * d, 100), dec(1000 * c0 + (minus ? -1 : 1) * size * d, 1000), dec(100 * c0 + (minus ? -1 : 1) * size * d * 10, 100)),
        },
        {
          span: [0, 3],
          operator: 1,
          value: total,
          bank: bank(total, dec(nearUnits(params) - 2 * c2 * d * d, 10000), dec(nearUnits(params) + 9 * c2 * d * d, 10000), dec(nearUnits(params) + 99 * c2 * d * d, 10000)),
        },
      ],
    };
  },
  solution: nearWorking,
};

/**
 * The estimate typed. The choice form offers the x^2 term dropped, x left
 * unsquared, the sign turned, and the 1 of level 2 in place of a.
 */
const nearEstimate: Generator<NearParams> = {
  id: 'bin-near-estimate',
  sample: sampleNear,
  choices: (params) => {
    const { n, d } = params;
    const [c0, c1, c2] = nearCoefs(params);
    const right = nearUnits(params);
    return decimalOptions(right, [
      right - c2 * d * d,
      10000 * c0 + 100 * c1 * d + 100 * c2 * d,
      10000 * c0 - 100 * c1 * d + c2 * d * d,
      threeTerms({ n, d: params.minus ? -d : d }),
    ]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Use the first three terms of the expansion of $${nearBracket(params)}$ to estimate $(${nearBase(params)})^{${params.n}}$.`,
      },
    ],
    lead: '\\text{estimate} =',
    keypad: [],
    answer: dec(nearUnits(params), 10000),
    domain: 'real',
    mode: 'exact',
  }),
  solution: nearWorking,
};

/* --- surds --- */

interface SurdParams {
  /** The bracket is (p + q√k)^n, q negative for a minus. */
  p: number;
  q: number;
  k: number;
  n: number;
}

const ROOTS = [2, 3, 5, 6, 7];

/** The r-th term as a whole number, or as the number in front of √k when r is odd: nCr p^(n-r) q^r k^(r div 2). */
function surdTerm({ p, q, k, n }: SurdParams, r: number): number {
  return nCr(n, r) * p ** (n - r) * q ** r * k ** Math.floor(r / 2);
}

/** a + b√k: the even terms gathered into a and the odd into b. */
function surdParts(params: SurdParams): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (let r = 0; r <= params.n; r += 1) {
    if (r % 2 === 0) a += surdTerm(params, r);
    else b += surdTerm(params, r);
  }
  return { a, b };
}

/** Every term, and a and b, exact and under 10000, with neither part zero. */
function surdFits(params: SurdParams): boolean {
  const { a, b } = surdParts(params);
  const terms = Array.from({ length: params.n + 1 }, (_, r) => surdTerm(params, r));
  return a !== 0 && b !== 0 && [a, b, ...terms].every((value) => Math.abs(value) < 10000);
}

function rootTex(k: number): string {
  return `\\sqrt{${k}}`;
}

/** c√k as the learner reads it: a 1 left off, a minus kept. */
function rootTerm(c: number, k: number): string {
  if (c === 0) return '0';
  const size = Math.abs(c);
  return `${c < 0 ? '-' : ''}${size === 1 ? '' : size}${rootTex(k)}`;
}

function surdInside({ p, q, k }: Pick<SurdParams, 'p' | 'q' | 'k'>): string {
  return sumTex([`${p}`, rootTerm(q, k)]);
}

function surdPowTex(params: SurdParams): string {
  return `(${surdInside(params)})^{${params.n}}`;
}

/** The same bracket in a tiles template, where no braces may round a digit. */
function surdPowTemplate({ p, q, k, n }: SurdParams): string {
  return `(${p} ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}\\sqrt${k})^${n}`;
}

function abTex(a: number, b: number, k: number): string {
  return sumTex([`${a}`, rootTerm(b, k)]);
}

/** What a and b come to if every power of √k is taken as 1: the row alone, the root never squared. */
function rootForgotten(params: SurdParams): { a: number; b: number } {
  return surdParts({ ...params, k: 1 });
}

/** q√k to the power r, as it is written in a line of working. */
function rootPowTex(q: number, k: number, r: number): string {
  if (r === 1) return q < 0 ? `(${rootTerm(q, k)})` : rootTerm(q, k);
  return `(${rootTerm(q, k)})^{${r}}`;
}

/** label = the values added = their total, broken over lines where a phone needs it. */
function gatheredTex(label: string, values: number[], total: number): string {
  const one = `${label} = ${sumTex(values.map(String))} = ${total}`;
  if (texWidth(one) <= LINE) return one;
  const sum = expansionTex(label, values.map(String));
  if (sum.includes('\\begin')) return sum.replace(' \\end{aligned}', ` \\\\ &= ${total} \\end{aligned}`);
  return chain(`& ${label}`, `&= ${sumTex(values.map(String))}`, `&= ${total}`);
}

/** Every term worked, then the two groups gathered. */
function surdWorking(params: SurdParams): SolutionStep[] {
  const { p, q, k, n } = params;
  const { a, b } = surdParts(params);
  const lines = Array.from({ length: n + 1 }, (_, r) => r).flatMap((r) => {
    // The power of p as its value, and a first power of the root bare: a line wider than a phone hides its result.
    const front = r === 0 ? [`${p}^{${n}}`] : r === n || p === 1 ? [] : [`${p ** (n - r)}`];
    const parts = [...(r === 0 || r === n ? [] : [`${nCr(n, r)}`]), ...(p === 1 && r === 0 ? [] : front), ...(r === 0 ? [] : [rootPowTex(q, k, r)])];
    const value = surdTerm(params, r);
    const shown = r % 2 === 0 ? `${value}` : rootTerm(value, k);
    if (parts.length === 0) return [`& ${shown}`];
    const product = parts.join(' \\times ');
    return texWidth(`${product} = ${shown}`) > LINE - 2 ? [`& ${product}`, `&\\quad = ${shown}`] : [`& ${product} = ${shown}`];
  });
  const evens = Array.from({ length: n + 1 }, (_, r) => r).filter((r) => r % 2 === 0).map((r) => surdTerm(params, r));
  const odds = Array.from({ length: n + 1 }, (_, r) => r).filter((r) => r % 2 === 1).map((r) => surdTerm(params, r));
  return [
    {
      text: `Row $${n}$ is $${rowTex(pascalRow(n))}$. An even power of $${rootTex(k)}$ is a whole number, since $(${rootTex(k)})^2 = ${k}$; an odd power leaves one $${rootTex(k)}$ over.`,
    },
    { tex: chain(...lines) },
    { text: `The whole numbers make $a$, and the numbers in front of $${rootTex(k)}$ make $b$:` },
    { tex: gatheredTex('a', evens, a) },
    { tex: gatheredTex('b', odds, b) },
    { tex: `${surdPowTex(params)} = ${abTex(a, b, k)}` },
  ];
}

/** (1 ± q√k)^n with everything under 10000. */
function sampleOneSurd(rng: Rng, qs: number[], ks: number[], nMin: number, nMax: number): SurdParams {
  for (;;) {
    const params = { p: 1, q: rng.pick(qs), k: rng.pick(ks), n: rng.int(nMin, nMax) };
    if (surdFits(params)) return params;
  }
}

/**
 * a + b√k placed. The slips are a and b swapped, b's sign turned, and every
 * power of the root taken as 1.
 */
const surdTiles: Generator<SurdParams> = {
  id: 'bin-surd-tiles',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleOneSurd(rng, [-1, -1, 1, 2], ROOTS, 4, 8) : sampleOneSurd(rng, [1], ROOTS, 3, 8)),
  render: (params): Slide => {
    const { a, b } = surdParts(params);
    const forgot = rootForgotten(params);
    const answer = [signedToken(a, true), signedToken(b, false)];
    const slips = [`${Math.abs(b)}`, signedToken(a, false), signedToken(-b, false), `${forgot.a}`, signedToken(forgot.b, false), `${a + Math.abs(b)}`];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Expand and gather the whole numbers and the multiples of $${rootTex(params.k)}$.` }],
      template: `${surdPowTemplate(params)} = {0} {1}\\sqrt${params.k}`,
      bank: tileBank(answer, fewSlips(answer, slips)),
      answer,
    };
  },
  solution: surdWorking,
};

/**
 * The terms of a surd bracket, even powers then odd, gathered into a and b.
 * Four terms at most fit a phone's width in one row, so a bracket starting
 * with 1 leaves that 1 out of the row and a takes it at the end.
 */
function surdTreeSlide(params: SurdParams, lead: string): Slide {
  const { k, n } = params;
  const { a, b } = surdParts(params);
  const one = params.p === 1;
  const evens = Array.from({ length: n + 1 }, (_, r) => r).filter((r) => r % 2 === 0 && !(one && r === 0));
  const odds = Array.from({ length: n + 1 }, (_, r) => r).filter((r) => r % 2 === 1);
  const forgot = rootForgotten(params);
  const answer = [...evens.map((r) => surdTerm(params, r)), ...odds.map((r) => surdTerm(params, r)), a, b].map(String);
  // Each term with its root left unsquared, a and b with every root taken as 1, and the two added.
  const slips = [...evens.filter((r) => r > 0).map((r) => surdTerm({ ...params, k: 1 }, r)), forgot.a, forgot.b, a + b, a - 1, 2 * b].map(String);
  return {
    kind: 'tree',
    prompt: [
      {
        kind: 'prose',
        text: `${lead}Top row, left to right: the whole-number terms, from the even powers of $${rootTex(k)}$, then the numbers on $${rootTex(k)}$ from the odd powers. Then add each group to make $a$ and $b$${one ? ', with the $1$ at the front going into $a$' : ''}.`,
      },
    ],
    expression: `${surdPowTex(params)} = a + b${rootTex(k)}`,
    nodes: [
      ...evens.map((r) => ({ id: `t${r}`, from: [] })),
      ...odds.map((r) => ({ id: `t${r}`, from: [] })),
      { id: 'a', from: evens.map((r) => `t${r}`) },
      { id: 'b', from: odds.map((r) => `t${r}`) },
    ],
    bank: treeBank(answer, slips),
    answer,
  };
}

const surdPowersTree: Generator<SurdParams> = {
  id: 'bin-surd-powers-tree',
  sample: (rng, difficulty) =>
    difficulty > 1 ? sampleOneSurd(rng, [1, 2, 3], [...ROOTS, 10, 11], 3, 4) : sampleOneSurd(rng, [1, 2], [...ROOTS, 10, 11], 3, 4),
  render: (params) => surdTreeSlide(params, ''),
  solution: surdWorking,
};

interface SurdAskParams extends SurdParams {
  ask: 'a' | 'b';
}

function surdAskPrompt(params: SurdAskParams): string {
  return `$${surdPowTex(params)} = a + b${rootTex(params.k)}$, where $a$ and $b$ are whole numbers. Find $${params.ask}$.`;
}

/** a or b typed. The choice form offers the other one, every root taken as 1, and the two added. */
function surdAskGenerator(id: string, sample: (rng: Rng, difficulty: number) => SurdParams): Generator<SurdAskParams> {
  return {
    id,
    sample: (rng, difficulty) => ({ ...sample(rng, difficulty), ask: rng.chance(0.5) ? 'a' : 'b' }),
    choices: (params) => {
      const { a, b } = surdParts(params);
      const forgot = rootForgotten(params);
      const right = params.ask === 'a' ? a : b;
      const wrong = params.ask === 'a' ? [b, forgot.a, a + b, a - params.p ** params.n] : [a, forgot.b, a + b, b * params.k];
      return aimedNumbers(right, wholeSlips(right, ...wrong), spread(params.p, params.q, params.k, params.n, params.ask === 'a' ? 1 : 2));
    },
    render: (params): Slide => {
      const { a, b } = surdParts(params);
      return {
        kind: 'expression',
        prompt: [{ kind: 'prose', text: surdAskPrompt(params) }],
        lead: `${params.ask} =`,
        keypad: [],
        answer: `${params.ask === 'a' ? a : b}`,
        domain: 'real',
        mode: 'exact',
      };
    },
    solution: surdWorking,
  };
}

const surdPart = surdAskGenerator('bin-surd-part', (rng, difficulty) =>
  difficulty > 1 ? sampleOneSurd(rng, [1, 1, 2], ROOTS, 5, 8) : sampleOneSurd(rng, [1], ROOTS, 3, 6),
);

/** One term of a sum of products: a number, and optionally a power to work out first. */
interface ProductTerm {
  coef: number;
  power?: { tex: string; value: number; slips: number[] };
}

/**
 * The steps of a sum of products worked in order: every power, then every
 * product, then the sums left to right, each with a bank of four. A
 * coefficient of 1 is left off, so its term is the power alone.
 */
function sumOfProducts(terms: ProductTerm[]): { start: string[]; reductions: Extract<Slide, { kind: 'steps' }>['reductions'] } {
  const plain = (value: number) => `${value}`;
  const start: string[] = [];
  const starts: number[] = [];
  terms.forEach((term, i) => {
    if (i > 0) start.push('+');
    starts.push(start.length);
    if (term.power && term.coef === 1) start.push(term.power.tex);
    else {
      start.push(`${term.coef}`);
      if (term.power) start.push('\\times', term.power.tex);
    }
  });
  const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [];
  terms.forEach((term, i) => {
    if (!term.power) return;
    const at = starts[i] + (term.coef === 1 ? 0 : 2);
    const value = term.power.value;
    reductions.push({ span: [at, at + 1], value: plain(value), bank: stepBank(plain, value, ...wholeSlips(value, ...term.power.slips)) });
  });
  let shift = 0;
  const values = terms.map((term) => term.coef * (term.power?.value ?? 1));
  terms.forEach((term, i) => {
    if (!term.power || term.coef === 1) return;
    const at = starts[i] - shift;
    const value = values[i];
    reductions.push({
      span: [at, at + 3],
      operator: at + 1,
      value: plain(value),
      bank: stepBank(plain, value, ...wholeSlips(value, term.coef + term.power.value, value + term.coef, value - term.coef)),
    });
    shift += 2;
  });
  let running = values[0];
  for (const value of values.slice(1)) {
    const next = running + value;
    reductions.push({ span: [0, 3], operator: 1, value: plain(next), bank: stepBank(plain, next, ...wholeSlips(next, running * value, next - 1, running - value)) });
    running = next;
  }
  return { start, reductions };
}

/**
 * a gathered from the even powers of √k, or b from the odd ones, one step at
 * a time. The slips on a power are the root never squared away and the power
 * times k.
 */
const surdGatherSteps: Generator<SurdAskParams> = {
  id: 'bin-surd-gather-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { ...sampleOneSurd(rng, [1], [...ROOTS, 10, 11, 13], hard ? 5 : 3, hard ? 6 : 5), ask: rng.chance(0.5) ? 'b' : 'a' };
  },
  render: (params): Slide => {
    const { k, n, ask } = params;
    const rs = Array.from({ length: n + 1 }, (_, r) => r).filter((r) => r % 2 === (ask === 'a' ? 0 : 1));
    const terms: ProductTerm[] = rs.map((r) => {
      const e = ask === 'a' ? r : r - 1;
      if (e === 0) return { coef: nCr(n, r) };
      return { coef: nCr(n, r), power: { tex: `(${rootTex(k)})^{${e}}`, value: k ** (e / 2), slips: [k ** e, k * e, k ** (e / 2) + k] } };
    });
    const { start, reductions } = sumOfProducts(terms);
    const which =
      ask === 'a'
        ? `$a$ is the sum of the terms with even powers of $${rootTex(k)}$, written out below.`
        : `$b$ is the sum of the terms with odd powers of $${rootTex(k)}$, each with one $${rootTex(k)}$ taken out, written out below.`;
    return {
      kind: 'steps',
      prompt: [
        { kind: 'prose', text: `$${surdPowTex(params)} = a + b${rootTex(k)}$. ${which} Tap the step to do next, then choose what it gives.` },
      ],
      start,
      reductions,
    };
  },
  solution: surdWorking,
};

/* --- conjugate pairs --- */

interface ConjParams {
  k: number;
  n: number;
  /** The sum (1 + √k)^n + (1 - √k)^n, or the difference. */
  sum: boolean;
}

function plusTex(k: number, n: number | string): string {
  return `(1 + ${rootTex(k)})^{${n}}`;
}

function minusTex(k: number, n: number | string): string {
  return `(1 - ${rootTex(k)})^{${n}}`;
}

function conjTex({ k, n, sum }: ConjParams): string {
  return `${plusTex(k, n)} ${sum ? '+' : '-'} ${minusTex(k, n)}`;
}

function conjParts({ k, n }: Pick<ConjParams, 'k' | 'n'>): { a: number; b: number } {
  return surdParts({ p: 1, q: 1, k, n });
}

function sampleConj(rng: Rng, nMin: number, nMax: number, ks = ROOTS): ConjParams {
  for (;;) {
    const params = { k: rng.pick(ks), n: rng.int(nMin, nMax), sum: rng.chance(0.5) };
    if (surdFits({ p: 1, q: 1, k: params.k, n: params.n }) && surdFits({ p: 1, q: 1, k: params.k, n: params.n + 1 })) return params;
  }
}

function conjWorking(params: ConjParams): SolutionStep[] {
  const { k, n, sum } = params;
  const { a, b } = conjParts(params);
  return [
    { text: `$${plusTex(k, n)} = ${abTex(a, b, k)}$. In $${minusTex(k, n)}$ only the odd powers of $${rootTex(k)}$ turn negative, so it is $${abTex(a, -b, k)}$.` },
    {
      text: sum
        ? `Added, the multiples of $${rootTex(k)}$ cancel and the whole parts double:`
        : `Subtracted, the whole parts cancel and the multiples of $${rootTex(k)}$ double:`,
    },
    { tex: sum ? `${conjTex(params)} = 2 \\times ${a} = ${2 * a}` : `${conjTex(params)} = 2 \\times ${rootTerm(b, k)} = ${rootTerm(2 * b, k)}` },
  ];
}

interface ConjWhichParams {
  k: number;
  n: number;
  /** Asks which is whole, or which is a multiple of √k with no whole part. */
  whole: boolean;
  /** Offers (√k - 1)^n, which is (1 - √k)^n or its negative by the parity of n. */
  trap: boolean;
}

/**
 * Which combination is whole, or which is a pure multiple of √k. The wrong
 * ones are the other combination, two different powers, and at difficulty 2
 * (√k - 1)^n with the sign that makes it the other combination for this n.
 */
const conjWhich: Generator<ConjWhichParams> = {
  id: 'bin-conjugate-which',
  sample: (rng, difficulty) => {
    const { k, n } = sampleConj(rng, 3, 8);
    return { k, n, whole: rng.chance(0.5), trap: difficulty > 1 };
  },
  render: ({ k, n, whole, trap }): Slide => {
    const plus = plusTex(k, n);
    const S = `${plus} + ${minusTex(k, n)}`;
    const D = `${plus} - ${minusTex(k, n)}`;
    const mismatched = `${plus} + ${minusTex(k, n + 1)}`;
    // (√k - 1)^n is (1 - √k)^n for even n and its negative for odd n, so this
    // sign makes it the other combination from the one asked for.
    const flip = `(${rootTex(k)} - 1)^{${n}}`;
    const flipSign = (n % 2 === 0) === whole ? '-' : '+';
    const fourth = trap ? `${plus} ${flipSign} ${flip}` : `2${plus}`;
    const labels = whole ? [S, D, mismatched, fourth] : [D, S, mismatched, fourth];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: whole ? 'Which of these is a whole number?' : `Which of these is a whole-number multiple of $${rootTex(k)}$, with no whole-number part?`,
        },
      ],
      ...nativeChoice(labels, mix(k, n, whole ? 1 : 0, trap ? 1 : 0)),
    };
  },
  solution: ({ k, n, whole, trap }) => [
    ...conjWorking({ k, n, sum: whole }),
    ...(trap
      ? [
          {
            text: `$(${rootTex(k)} - 1)^{${n}}$ is $${minusTex(k, n)}$ ${n % 2 === 0 ? 'itself, since the power is even' : 'with its sign turned, since the power is odd'}.`,
          },
        ]
      : []),
  ],
};

interface ConjTilesParams {
  k: number;
  n: number;
  /** Whether a + b√k is given, or left to be found. */
  shown: boolean;
}

/**
 * The sum and the difference placed together, the root carried in the tile so
 * that √10 fits a template. The slips are a and b not doubled, and each
 * written in the other's form.
 */
const conjTiles: Generator<ConjTilesParams> = {
  id: 'bin-conjugate-tiles',
  sample: (rng, difficulty) => {
    const { k, n } = sampleConj(rng, 3, difficulty > 1 ? 6 : 8, [...ROOTS, 10, 11]);
    return { k, n, shown: difficulty < 2 };
  },
  render: ({ k, n, shown }): Slide => {
    const { a, b } = conjParts({ k, n });
    const root = (c: number) => rootTerm(c, k);
    const answer = [`${2 * a}`, root(2 * b)];
    const given = shown ? `$${plusTex(k, n)} = ${abTex(a, b, k)}$. ` : '';
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `${given}Fill in the sum of these two, and the difference: the first minus the second.` },
        { kind: 'display', tex: `${plusTex(k, n)}, \\quad ${minusTex(k, n)}` },
      ],
      template: '\\text{sum} = {0} \\quad \\text{difference} = {1}',
      bank: tileBank(answer, fewSlips(answer, [`${a}`, root(b), `${2 * b}`, root(2 * a), '0'])),
      answer,
    };
  },
  solution: ({ k, n }) => [...conjWorking({ k, n, sum: true }), { tex: `${conjTex({ k, n, sum: false })} = ${rootTerm(2 * conjParts({ k, n }).b, k)}` }],
};

/** The sum typed, or the number in front of √k in the difference. The choice form offers it undoubled and the other part. */
const conjValue: Generator<ConjParams> = {
  id: 'bin-conjugate-value',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleConj(rng, 5, 8) : sampleConj(rng, 3, 5)),
  choices: (params) => {
    const { a, b } = conjParts(params);
    const right = params.sum ? 2 * a : 2 * b;
    const wrong = params.sum ? [a, 2 * b, 2 * (a + b), a + b] : [b, 2 * a, 2 * (a + b), a + b];
    return aimedNumbers(right, wholeSlips(right, ...wrong), spread(params.k, params.n, params.sum ? 1 : 2));
  },
  render: (params): Slide => {
    const { a, b } = conjParts(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: params.sum
            ? `Find the value of $${conjTex(params)}$.`
            : `$${conjTex(params)} = c${rootTex(params.k)}$ for a whole number $c$. Find $c$.`,
        },
      ],
      lead: params.sum ? '\\text{value} =' : 'c =',
      keypad: [],
      answer: `${params.sum ? 2 * a : 2 * b}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: conjWorking,
};

/**
 * Why the sum is whole or the difference a multiple of √k: which terms turn
 * negative, what adding or subtracting does to them, and so what is left.
 */
const conjFlow: Generator<ConjParams> = {
  id: 'bin-conjugate-flow',
  sample: (rng, difficulty) => sampleConj(rng, difficulty > 1 ? 5 : 3, difficulty > 1 ? 8 : 6),
  render: (params): Slide => {
    const { k, n, sum } = params;
    const root = rootTex(k);
    const odd = `The odd powers of $${root}$`;
    const cancel = 'They cancel';
    const double = 'They double';
    const whole = 'A whole number';
    const multiple = `A multiple of $${root}$`;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Is this a whole number, or a multiple of $${root}$? Decide without expanding.` }],
      subject: conjTex(params),
      steps: [
        {
          id: 'sign',
          ask: 'Which terms of the second expansion have the opposite sign to the same terms of the first?',
          branches: turned(
            [
              { label: odd, to: 'combine' },
              { label: `The even powers of $${root}$`, outcome: `An even power of $-${root}$ is positive: $(-${root})^2 = ${k}$.` },
              { label: 'Every term', outcome: `Only an odd power of $-${root}$ is negative. The even powers keep their sign.` },
            ],
            spread(k, n, sum ? 1 : 2),
          ),
        },
        {
          id: 'combine',
          ask: sum ? 'The two expansions are added. What happens to those terms?' : 'The second expansion is subtracted. What happens to those terms?',
          branches: [
            sum ? { label: cancel, to: 'result' } : { label: cancel, outcome: 'Subtracting a negative term adds it, so each one doubles.' },
            sum ? { label: double, outcome: 'Each is added to its own negative, so they cancel.' } : { label: double, to: 'result' },
          ],
        },
        {
          id: 'result',
          ask: 'So what is left?',
          branches: turned(
            [
              {
                label: whole,
                outcome: sum
                  ? `Right: only the even powers are left, each a whole number. The value is $${2 * conjParts(params).a}$.`
                  : `The even powers are what cancelled here: every term left carries one $${root}$.`,
              },
              {
                label: multiple,
                outcome: sum
                  ? `The terms carrying $${root}$ are gone: everything left is a whole number.`
                  : `Right: only the odd powers are left, each carrying one $${root}$. The value is $${rootTerm(2 * conjParts(params).b, k)}$.`,
              },
            ],
            spread(n, k, 3),
          ),
        },
      ],
      answer: [odd, sum ? cancel : double, sum ? whole : multiple],
    };
  },
  solution: conjWorking,
};

/* --- a number and a surd --- */

/** (p ± q√k)^n with a number in front, everything under 10000. */
function sampleMixed(rng: Rng, ps: number[], qs: number[], nMin: number, nMax: number): SurdParams {
  for (;;) {
    const params = { p: rng.pick(ps), q: rng.pick(qs), k: rng.pick(ROOTS), n: rng.int(nMin, nMax) };
    if (surdFits(params)) return params;
  }
}

/**
 * (p ± √k)^n as a + b√k. The slips are the powers of p forgotten, a and b
 * swapped, and b's sign turned.
 */
const mixedTiles: Generator<SurdParams> = {
  id: 'bin-mixed-tiles',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleMixed(rng, [2, 3, 4], [1, -1, -1], 3, 6) : sampleMixed(rng, [2, 3], [1], 2, 5)),
  render: (params): Slide => {
    const { a, b } = surdParts(params);
    const forgot = surdParts({ ...params, p: 1 });
    const answer = [signedToken(a, true), signedToken(b, false)];
    const slips = [`${Math.abs(b)}`, signedToken(a, false), signedToken(-b, false), `${forgot.a}`, signedToken(forgot.b, false), `${a + Math.abs(b)}`];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `Expand and gather the whole numbers and the multiples of $${rootTex(params.k)}$. The $${params.p}$ is raised to a power in every term.` }],
      template: `${surdPowTemplate(params)} = {0} {1}\\sqrt${params.k}`,
      bank: tileBank(answer, fewSlips(answer, slips)),
      answer,
    };
  },
  solution: surdWorking,
};

const mixedTermsTree: Generator<SurdParams> = {
  id: 'bin-mixed-terms-tree',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleMixed(rng, [2, 3, 4, 5], [1, 2], 3, 3) : sampleMixed(rng, [2, 3, 4], [1], 2, 3)),
  render: (params) => surdTreeSlide(params, `The $${params.p}$ is raised to a power in every term. `),
  solution: surdWorking,
};

const mixedPart = surdAskGenerator('bin-mixed-part', (rng, difficulty) =>
  difficulty > 1 ? sampleMixed(rng, [2, 3, 4, 5], [1], 3, 6) : sampleMixed(rng, [2, 3], [1], 2, 4),
);

/** Brackets whose product with their conjugate is 1 or -1: (2 + √3)(2 - √3) = 1. */
const UNIT_PAIRS = [
  { p: 2, q: 1, k: 3 },
  { p: 2, q: 1, k: 5 },
  { p: 3, q: 2, k: 2 },
  { p: 5, q: 2, k: 6 },
];

/** p^2 - q^2 k: what (p + q√k)(p - q√k) comes to. */
function unitValue({ p, q, k }: Pick<SurdParams, 'p' | 'q' | 'k'>): number {
  return p * p - q * q * k;
}

/**
 * (p + q√k)^n (p - q√k)^n as ((p + q√k)(p - q√k))^n = (p^2 - q^2 k)^n, a step
 * at a time. The slips are the root left unsquared, the minus read as a plus,
 * and the power one out.
 */
const unitSteps: Generator<SurdParams> = {
  id: 'bin-unit-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const units = hard ? UNIT_PAIRS : UNIT_PAIRS.filter(({ q }) => q === 1);
    for (;;) {
      const n = rng.int(hard ? 3 : 2, hard ? 6 : 5);
      const params = rng.chance(0.35)
        ? { ...rng.pick(units), n }
        : { p: rng.int(2, hard ? 7 : 5), q: hard ? rng.pick([1, 2]) : 1, k: rng.pick(ROOTS), n };
      const m = unitValue(params);
      if (m !== 0 && Math.abs(m) ** params.n < 10000) return params;
    }
  },
  render: (params): Slide => {
    const { p, q, k, n } = params;
    const m = unitValue(params);
    const plain = (value: number) => `${value}`;
    const power = (value: number) => value ** n;
    const root = `${q === 1 ? '' : q}${rootTex(k)}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `The two brackets have the same power, so multiply them first: $(${p} + ${root})(${p} - ${root})$ is a difference of two squares. Tap the step to do next, then choose what it gives.`,
        },
        { kind: 'display', tex: `(${p} + ${root})^{${n}}(${p} - ${root})^{${n}}` },
      ],
      start: ['(', `${p}^{2}`, '-', `(${root})^{2}`, `)^{${n}}`],
      reductions: [
        { span: [1, 2], value: plain(p * p), bank: stepBank(plain, p * p, ...wholeSlips(p * p, 2 * p, p + 2)) },
        { span: [3, 4], value: plain(q * q * k), bank: stepBank(plain, q * q * k, ...wholeSlips(q * q * k, q * k, k * k * q * q, 2 * q * k)) },
        { span: [1, 4], operator: 2, value: plain(m), bank: stepBank(plain, m, ...wholeSlips(m, p * p + q * q * k, -m, m - 1)) },
        {
          span: [0, 3],
          operator: 2,
          value: plain(power(m)),
          bank: stepBank(plain, power(m), ...wholeSlips(power(m), m * n, m ** (n - 1), m ** (n + 1), -power(m))),
        },
      ],
    };
  },
  solution: (params) => {
    const { p, q, k, n } = params;
    const m = unitValue(params);
    const root = `${q === 1 ? '' : q}${rootTex(k)}`;
    return [
      { text: 'Both brackets carry the same power, so they pair off one at a time:' },
      { tex: `(${p} + ${root})^{${n}}(${p} - ${root})^{${n}} = ((${p} + ${root})(${p} - ${root}))^{${n}}` },
      { tex: `(${p} + ${root})(${p} - ${root}) = ${p}^{2} - (${root})^{2} = ${p * p} - ${q * q * k} = ${m}` },
      { tex: `${m < 0 ? `(${m})` : m}^{${n}} = ${m ** n}` },
      ...(Math.abs(m) === 1
        ? [{ text: `The product is $${m ** n}$, so $(${p} - ${root})^{${n}}$ is $${m ** n === 1 ? '' : '-'}\\frac{1}{(${p} + ${root})^{${n}}}$: small, where the other is large.` }]
        : []),
    ];
  },
};

/* ---------- Level 6: the binomial series for rational n ---------- */

/*
 * Level 6 lets n be negative or a fraction. The coefficient of x^r is still
 * n(n - 1)...(n - r + 1)/r!, but the falling product never reaches zero, so the
 * expansion never stops, and it is valid only while the part added to the 1 is
 * smaller than 1 in size. A number in front comes out first, as
 * (a + bx)^n = a^n(1 + bx/a)^n.
 *
 * Every coefficient is an exact fraction held as [top, bottom] in lowest
 * terms, never a float, and a series stops at four terms. n comes from -1, -2,
 * -3, 1/2, -1/2, 1/3 and 3/2, except in the questions about one coefficient's
 * factors, where n is all there is to vary and a wider spread is drawn. a is a
 * square or a cube to suit n, so a^n is exact too. Approximating with the
 * series is the next level: nothing here is a decimal estimate.
 */

type Frac = [number, number];

const NEGATIVE_N: Frac[] = [
  [-1, 1],
  [-2, 1],
  [-3, 1],
];
const FRACTION_N: Frac[] = [
  [1, 2],
  [-1, 2],
  [1, 3],
  [3, 2],
];
const RATIONAL_N: Frac[] = [...NEGATIVE_N, ...FRACTION_N];

/**
 * n for a question about one coefficient's factors: whole n that stop, as the
 * contrast, then negative and fractional n that never do.
 */
const SERIES_N: Frac[] = [
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 1],
  [-1, 1],
  [-2, 1],
  [-3, 1],
  [-4, 1],
  [-5, 1],
  [-6, 1],
  [1, 2],
  [-1, 2],
  [3, 2],
  [-3, 2],
  [5, 2],
  [-5, 2],
  [7, 2],
  [1, 3],
  [-1, 3],
  [2, 3],
  [-2, 3],
  [4, 3],
  [1, 4],
  [-1, 4],
  [3, 4],
  [-3, 4],
];

const ONE: Frac = [1, 1];

function qMul(x: Frac, y: Frac): Frac {
  return reduced(x[0] * y[0], x[1] * y[1]);
}

function qAdd(x: Frac, y: Frac): Frac {
  return reduced(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
}

function qPow(x: Frac, k: number): Frac {
  return reduced(x[0] ** k, x[1] ** k);
}

function qNeg(x: Frac): Frac {
  return [-x[0], x[1]];
}

function qAbs(x: Frac): Frac {
  return [Math.abs(x[0]), x[1]];
}

function qValue(x: Frac): number {
  return x[0] / x[1];
}

function qSame(x: Frac, y: Frac): boolean {
  return x[0] === y[0] && x[1] === y[1];
}

/** The expansion stops only when n is a whole number, 0 or more. */
function stops(n: Frac): boolean {
  return n[1] === 1 && n[0] >= 0;
}

/** The factors n, n - 1, ..., n - r + 1. */
function fallingFactors(n: Frac, r: number): Frac[] {
  return Array.from({ length: r }, (_, i) => reduced(n[0] - i * n[1], n[1]));
}

/** n(n - 1)...(n - r + 1), the top of the number from n. */
function fallingProduct(n: Frac, r: number): Frac {
  return fallingFactors(n, r).reduce(qMul, ONE);
}

/** n(n - 1)...(n - r + 1)/r!: the coefficient of x^r in (1 + x)^n. */
function seriesCoef(n: Frac, r: number): Frac {
  return reduced(fallingProduct(n, r)[0], fallingProduct(n, r)[1] * factorial(r));
}

/** The coefficient of x^r in (1 + bx)^n. */
function termCoef(n: Frac, b: Frac, r: number): Frac {
  return qMul(seriesCoef(n, r), qPow(b, r));
}

const qTex = ([p, q]: Frac): string => fracTex(p, q);
const qAnswer = ([p, q]: Frac): string => fracAnswer(p, q);

/** A factor inside a product: bracketed when negative. */
function qFactor(x: Frac): string {
  return x[0] < 0 ? `(${qTex(x)})` : qTex(x);
}

/** n as a power, -1/2: a stacked fraction is unreadable at superscript size. */
function nPow([p, q]: Frac): string {
  return q === 1 ? `${p}` : `${p}/${q}`;
}

/** bx as the learner reads it: 2x, -x, \frac{x}{3}, -\frac{2x}{3}. */
function bxTex([p, q]: Frac): string {
  const size = Math.abs(p);
  const top = size === 1 ? 'x' : `${size}x`;
  const body = q === 1 ? top : `\\frac{${top}}{${q}}`;
  return p < 0 ? `-${body}` : body;
}

/** (a + bx) without the power. */
function insideOf(a: number, b: Frac): string {
  return sumTex([`${a}`, bxTex(b)]);
}

/** (a + bx)^n, n written as a power. */
function seriesTex(a: number, b: Frac, n: Frac): string {
  return `(${insideOf(a, b)})^{${nPow(n)}}`;
}

/** b to a power in a line of working, bracketed when it is negative or a fraction. */
function bPowTex(b: Frac, r: number): string {
  if (b[1] !== 1) return `\\left(${qTex(b)}\\right)^{${r}}`;
  return b[0] < 0 ? `(${b[0]})^{${r}}` : `${b[0]}^{${r}}`;
}

/** c x^e with a fractional c: -\frac{1}{8}x^{2}. */
function qTermTex(c: Frac, e: number): string {
  if (c[1] === 1) return termTex(c[0], e);
  if (e === 0) return qTex(c);
  return `${qTex(c)}${e === 1 ? 'x' : `x^{${e}}`}`;
}

/**
 * A coefficient as a tile, spelled one way only, as signedToken does it for
 * whole numbers: `- \frac{1}{8}`, `+ \frac{3}{2}`, and a bare `\frac{1}{2}`
 * only for the first term.
 */
function qToken(c: Frac, first: boolean): string {
  if (c[1] === 1) return signedToken(c[0], first);
  const body = `\\frac{${Math.abs(c[0])}}{${c[1]}}`;
  if (c[0] < 0) return `- ${body}`;
  return first ? body : `+ ${body}`;
}

/** The distinct fractions among `values`, in order, leaving out any in `taken`. */
function freshFracs(values: Frac[], taken: Frac[]): Frac[] {
  const out: Frac[] = [];
  for (const value of values) {
    if (value[1] === 0 || !Number.isFinite(value[0])) continue;
    const r = reduced(value[0], value[1]);
    if ([...taken, ...out].some((seen) => qSame(seen, r))) continue;
    out.push(r);
  }
  return out;
}

/** Fractions sorted by size, written for the learner. */
function bySize(values: Frac[]): string[] {
  return [...values].sort((x, y) => qValue(x) - qValue(y)).map(qTex);
}

/** A tree bank of fractions: the answer, repeats kept, then two to four slips, topped up past the largest. */
function qTreeBank(answer: Frac[], slips: Frac[]): Frac[] {
  const extras = freshFracs(slips, answer).slice(0, 4);
  const top = answer.reduce((x, y) => (qValue(y) > qValue(x) ? y : x));
  for (let step = 1; extras.length < 2; step += 1) extras.push(...freshFracs([qAdd(top, [step, 1])], [...answer, ...extras]));
  return [...answer, ...extras];
}

/** A steps bank of four fractions: the value, the slips, then the values just above it. */
function qStepBank(right: Frac, ...wrong: Frac[]): string[] {
  const values = [right, ...freshFracs(wrong, [right])].slice(0, 4);
  for (let step = 1; values.length < 4; step += 1) values.push(...freshFracs([qAdd(right, [step, 1])], values));
  return bySize(values);
}

/** A stable number from some TeX, for ordering the options of a native choice. */
function saltOf(...texts: string[]): number {
  return spread(...texts.map((text) => [...text].reduce((sum, ch, i) => sum + ch.charCodeAt(0) * (i + 1), 0)));
}

/** n(n - 1)...(n - r + 1) ÷ r! with the learner's n, every factor in brackets. */
function fallingTexOf(n: Frac, r: number): string {
  if (r === 1) return qTex(n);
  return `${fallingFactors(n, r)
    .map((f) => `(${qTex(f)})`)
    .join('')} \\div ${r}!`;
}

/** The coefficients of (1 + bx)^n worked one power at a time: the number from n, then b^r. */
function seriesSteps(n: Frac, b: Frac, rs: number[]): SolutionStep[] {
  const plain = qSame(b, ONE);
  const steps: SolutionStep[] = [
    {
      text: plain
        ? `The coefficient of $x^r$ is $\\frac{n(n - 1)\\dots(n - r + 1)}{r!}$, with $n = ${qTex(n)}$.`
        : `The coefficient of $x^r$ is $\\frac{n(n - 1)\\dots(n - r + 1)}{r!}$ times $${bPowTex(b, 1).replace(/\^\{1\}$/, '')}^r$, with $n = ${qTex(n)}$.`,
    },
  ];
  for (const r of rs) {
    const c = seriesCoef(n, r);
    const power = r === 1 ? 'x' : `x^{${r}}`;
    if (r === 1 && !plain) steps.push({ tex: `x: \\enspace ${qFactor(n)} \\times ${qFactor(b)} = ${qTex(termCoef(n, b, 1))}` });
    else steps.push({ tex: `${power}: \\enspace ${fallingTexOf(n, r)} = ${qTex(c)}` });
    if (r > 1 && !plain) steps.push({ tex: `${qFactor(c)} \\times ${bPowTex(b, r)} = ${qTex(termCoef(n, b, r))}` });
  }
  return steps;
}

/** The series written out as far as x^top, with dots. */
function seriesLine(a: number, b: Frac, n: Frac, coefs: Frac[]): string {
  return expansionTex(seriesTex(a, b, n), [...coefs.map((c, r) => qTermTex(c, r)), '\\dots']);
}

/* --- the series that never ends --- */

interface FactorParams {
  n: Frac;
  r: number;
  /** Whether the r! underneath is asked for as well. */
  bottom: boolean;
}

function factorsWorking({ n, r }: FactorParams): SolutionStep[] {
  const [, m1, m2] = fallingFactors(n, 3);
  return [
    { text: `Start at $n = ${qTex(n)}$ and take $1$ off each time: $${r}$ factors on top, $${r}!$ underneath.` },
    { tex: `${fallingTexOf(n, r)} = ${qTex(seriesCoef(n, r))}` },
    {
      text: !stops(n)
        ? `The factors go $${qTex(n)}, ${qTex(m1)}, ${qTex(m2)}, \\dots$ for ever, and none of them is ever $0$: the expansion never ends.`
        : n[0] < r
          ? 'One factor is $0$, so this coefficient and every one after it is $0$: the expansion stops.'
          : `The factors reach $0$ at the $x^{${n[0] + 1}}$ term, so the expansion stops after $${n[0] + 1}$ terms.`,
    },
  ];
}

/**
 * The factors on top of one coefficient, and at difficulty 2 the r! beneath.
 * The slips are the factors rising instead of falling, one factor too many,
 * and n with its sign turned.
 */
const seriesFactorsTiles: Generator<FactorParams> = {
  id: 'bin-series-factors-tiles',
  sample: (rng, difficulty) => ({ n: rng.pick(SERIES_N), r: difficulty > 1 ? 3 : rng.int(2, 3), bottom: difficulty > 1 }),
  render: ({ n, r, bottom }): Slide => {
    const factors = fallingFactors(n, r);
    const answer = factors.map(qTex);
    const slips = [qAdd(n, [n[1], n[1]]), qAdd(n, [2 * n[1], n[1]]), reduced(n[0] - r * n[1], n[1]), qNeg(n), qNeg(factors[1])].map(qTex);
    if (bottom) {
      answer.push(`${factorial(r)}`);
      slips.push(`${r}`, `${factorial(r) + r}`);
    }
    const blanks = factors.map((_, i) => `({${i}})`).join('');
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: bottom
            ? `The coefficient of $x^{${r}}$ in $${seriesTex(1, ONE, n)}$ is $\\frac{n(n - 1)(n - 2)}{3!}$ with $n = ${qTex(n)}$. Fill in the three factors on top, then what $3!$ is.`
            : `The coefficient of $x^{${r}}$ in $${seriesTex(1, ONE, n)}$ is $${r === 2 ? '\\frac{n(n - 1)}{2!}' : '\\frac{n(n - 1)(n - 2)}{3!}'}$ with $n = ${qTex(n)}$. Fill in the factors on top.`,
        },
      ],
      template: bottom ? `${blanks} \\div {${r}}` : blanks,
      bank: tileBank(answer, fewSlips(answer, slips, bottom ? 4 : 3)),
      answer,
    };
  },
  solution: factorsWorking,
};

interface CoefTreeParams {
  n: Frac;
  /** Whether the products before each division get a slot of their own. */
  full: boolean;
}

/**
 * From n to the x^2 and x^3 coefficients, each from the one before: n - 1 and
 * n - 2, then n(n - 1)/2, then that times (n - 2)/3. Difficulty 2 gives each
 * product its own slot before the division. The slips are the factors rising,
 * the division left out, and the sign turned.
 */
const seriesCoefTree: Generator<CoefTreeParams> = {
  id: 'bin-series-build-tree',
  sample: (rng, difficulty) => ({ n: rng.pick(SERIES_N), full: difficulty > 1 }),
  render: ({ n, full }): Slide => {
    const [, m1, m2] = fallingFactors(n, 3);
    const p2 = fallingProduct(n, 2);
    const c2 = seriesCoef(n, 2);
    const p3 = qMul(c2, m2);
    const c3 = seriesCoef(n, 3);
    const answer = full ? [m1, p2, c2, m2, p3, c3] : [m1, m2, c2, c3];
    const slips = [qAdd(n, ONE), qMul(n, qAdd(n, ONE)), qNeg(c2), qNeg(c3), full ? qMul(p2, [2, 1]) : p2, full ? qMul(p3, [3, 1]) : p3];
    const nodes = full
      ? [
          { id: 'n-1', from: [] },
          { id: 'top2', from: ['n-1'] },
          { id: 'x2', from: ['top2'] },
          { id: 'n-2', from: [] },
          { id: 'top3', from: ['x2', 'n-2'] },
          { id: 'x3', from: ['top3'] },
        ]
      : [
          { id: 'n-1', from: [] },
          { id: 'n-2', from: [] },
          { id: 'x2', from: ['n-1'] },
          { id: 'x3', from: ['x2', 'n-2'] },
        ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: full
            ? `Build the $x^2$ and $x^3$ coefficients from $n = ${qTex(n)}$: $n - 1$, then $n(n - 1)$, then that over $2$. Then $n - 2$, the $x^2$ coefficient times it, and that over $3$.`
            : `Build the $x^2$ and $x^3$ coefficients from $n = ${qTex(n)}$. Top row: $n - 1$ and $n - 2$. Then $\\frac{n(n - 1)}{2}$, and the $x^3$ coefficient, which is that times $\\frac{n - 2}{3}$.`,
        },
      ],
      expression: seriesTex(1, ONE, n),
      nodes,
      bank: bySize(qTreeBank(answer, slips)),
      answer: answer.map(qTex),
    };
  },
  solution: ({ n }) => [
    ...seriesSteps(n, ONE, [2, 3]),
    {
      text: `Each coefficient is the one before times the next factor, over the next whole number: $${qTex(seriesCoef(n, 2))} \\times ${qFactor(fallingFactors(n, 3)[2])} \\div 3 = ${qTex(seriesCoef(n, 3))}$.`,
    },
  ],
};

interface StopParams {
  /** The exponents offered, the right one first: TeX and the value it stands for. */
  options: { tex: string; value: Frac }[];
  /** Whether the question asks which one stops, or which one never ends. */
  ask: 'stops' | 'goes';
}

const STOPPING = [
  { tex: '2', value: [2, 1] as Frac },
  { tex: '3', value: [3, 1] as Frac },
  { tex: '4', value: [4, 1] as Frac },
  { tex: '5', value: [5, 1] as Frac },
  { tex: '6', value: [6, 1] as Frac },
];

const STOPPING_DISGUISED = [
  { tex: '6/2', value: [3, 1] as Frac },
  { tex: '8/4', value: [2, 1] as Frac },
  { tex: '12/3', value: [4, 1] as Frac },
  { tex: '\\sqrt{9}', value: [3, 1] as Frac },
  { tex: '\\sqrt{16}', value: [4, 1] as Frac },
  { tex: '-(-3)', value: [3, 1] as Frac },
];

const GOING = [
  { tex: '-1', value: [-1, 1] as Frac },
  { tex: '-2', value: [-2, 1] as Frac },
  { tex: '-3', value: [-3, 1] as Frac },
  { tex: '1/2', value: [1, 2] as Frac },
  { tex: '-1/2', value: [-1, 2] as Frac },
  { tex: '1/3', value: [1, 3] as Frac },
  { tex: '3/2', value: [3, 2] as Frac },
  { tex: '2/3', value: [2, 3] as Frac },
];

const GOING_DISGUISED = [
  { tex: '-4/2', value: [-2, 1] as Frac },
  { tex: '3/6', value: [1, 2] as Frac },
  { tex: '-\\sqrt{4}', value: [-2, 1] as Frac },
  { tex: '1.5', value: [3, 2] as Frac },
  { tex: '0.5', value: [1, 2] as Frac },
  { tex: '-6/3', value: [-2, 1] as Frac },
];

/**
 * Which expansion stops, or which never ends. Difficulty 2 disguises the
 * powers: 6/2 stops, -4/2 does not, and a whole number is not enough if it is
 * negative.
 */
const seriesStops: Generator<StopParams> = {
  id: 'bin-series-stops-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const stopping = hard ? [...STOPPING.slice(0, 3), ...STOPPING_DISGUISED] : STOPPING;
    const going = hard ? [...GOING.slice(0, 5), ...GOING_DISGUISED] : GOING;
    const ask = rng.chance(0.5) ? 'stops' : 'goes';
    const [right, wrong] = ask === 'stops' ? [stopping, going] : [going, stopping];
    return { ask, options: [rng.pick(right), ...rng.sample(wrong, 3)] };
  },
  render: ({ options, ask }): Slide => {
    const labels = options.map(({ tex }) => `(1 + x)^{${tex}}`);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: ask === 'stops' ? 'Which of these expansions stops after a few terms?' : 'Which of these expansions never ends?',
        },
      ],
      ...nativeChoice(labels, saltOf(...labels)),
    };
  },
  solution: ({ options }) => [
    { text: 'The expansion of $(1 + x)^n$ stops only when $n$ is a whole number, $0$ or more: then the factor $n - r$ reaches $0$, and every coefficient after it is $0$.' },
    ...options.map(({ tex, value }) => ({
      text: `$(1 + x)^{${tex}}$: ${tex === nPow(value) ? '' : `$n = ${qTex(value)}$, so it `}${stops(value) ? 'stops' : 'never ends'}.`,
    })),
  ],
};

interface FallingStepsParams {
  n: Frac;
  r: number;
}

/**
 * One coefficient worked from n a step at a time: r!, then the factors
 * multiplied, then the division. The slips are the factors added, the sign
 * turned, and the division left out or done twice.
 */
const seriesCoefSteps: Generator<FallingStepsParams> = {
  id: 'bin-series-coef-steps',
  sample: (rng, difficulty) => ({ n: rng.pick(SERIES_N), r: difficulty > 1 ? 3 : 2 }),
  render: ({ n, r }): Slide => {
    const factors = fallingFactors(n, r);
    const start: string[] = [qTex(n)];
    for (const f of factors.slice(1)) start.push('\\times', qFactor(f));
    start.push('\\div', `${r}!`);
    const fact: Frac = [factorial(r), 1];
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      { span: [start.length - 1, start.length], value: `${factorial(r)}`, bank: qStepBank(fact, [r, 1], [r + 1, 1], [factorial(r) * 2, 1]) },
    ];
    let running = factors[0];
    for (const f of factors.slice(1)) {
      const next = qMul(running, f);
      reductions.push({ span: [0, 3], operator: 1, value: qTex(next), bank: qStepBank(next, qNeg(next), qAdd(running, f), qMul(running, qAdd(f, [-1, 1]))) });
      running = next;
    }
    const c = seriesCoef(n, r);
    reductions.push({ span: [0, 3], operator: 1, value: qTex(c), bank: qStepBank(c, running, qNeg(c), qMul(running, fact), qMul(c, [1, r])) });
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Work out the coefficient of $x^{${r}}$ in $${seriesTex(1, ONE, n)}$, $${r === 2 ? '\\frac{n(n - 1)}{2!}' : '\\frac{n(n - 1)(n - 2)}{3!}'}$ with $n = ${qTex(n)}$. Tap the step to do next, then choose what it gives.`,
        },
      ],
      start,
      reductions,
    };
  },
  solution: ({ n, r }) => seriesSteps(n, ONE, [r]),
};

/* --- negative whole n --- */

interface RationalParams {
  /** The bracket is (1 + bx)^n. */
  n: Frac;
  b: Frac;
}

interface RationalTermParams extends RationalParams {
  r: number;
}

/** Whole b between lo and hi in size, either sign. */
function wholeB(rng: Rng, lo: number, hi: number): Frac {
  return [rng.sign() * rng.int(lo, hi), 1];
}

function coefsOf({ n, b }: RationalParams, top = 3): Frac[] {
  return Array.from({ length: top + 1 }, (_, r) => termCoef(n, b, r));
}

function seriesWorking(params: RationalParams, top = 3): SolutionStep[] {
  const rs = Array.from({ length: top }, (_, i) => i + 1);
  return [...seriesSteps(params.n, params.b, rs), { tex: seriesLine(1, params.b, params.n, coefsOf(params, top)) }];
}

/**
 * The first four terms of (1 + bx)^n for negative whole n, placed with their
 * signs. The slips are the sign turned, b left unraised, and the row of
 * Pascal's triangle for the positive n.
 */
const negativeTiles: Generator<RationalParams> = {
  id: 'bin-negative-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n = rng.pick(NEGATIVE_N);
      const b = hard ? wholeB(rng, 2, 9) : wholeB(rng, 1, 7);
      const coefs = coefsOf({ n, b }).slice(1);
      if (coefs.some(([c]) => Math.abs(c) === 1)) continue;
      if (coefs.every(([c]) => Math.abs(c) <= (hard ? 1000 : 350))) return { n, b };
    }
  },
  render: (params): Slide => {
    const { n, b } = params;
    const coefs = coefsOf(params).slice(1);
    const answer = coefs.map(([c]) => signedToken(c, false));
    const slips = coefs.flatMap(([c], i) => {
      const r = i + 1;
      return [-c, seriesCoef(n, r)[0] * b[0], nCr(-n[0], r) * b[0] ** r, Math.abs(c)]
        .filter((value) => value !== 0)
        .map((value) => signedToken(value, false));
    });
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Expand as far as the $x^3$ term, signs and all.' },
        { kind: 'display', tex: `${seriesTex(1, b, n)} =` },
      ],
      template: '1 {0}x {1}x^2 {2}x^3 + \\dots',
      bank: tileBank(answer, fewSlips(answer, slips)),
      answer,
    };
  },
  solution: (params) => seriesWorking(params),
};

/**
 * One coefficient of (1 + bx)^n for negative whole n, typed. The choice form
 * offers the sign turned, b left unraised, and Pascal's triangle's entry for
 * the positive n.
 */
const negativeCoef: Generator<RationalTermParams> = {
  id: 'bin-negative-coef',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n: Frac = hard ? rng.pick([...NEGATIVE_N, [-4, 1]]) : rng.pick(NEGATIVE_N);
      const b = hard ? wholeB(rng, 2, 5) : wholeB(rng, 1, 3);
      const r = rng.int(2, 3);
      if (Math.abs(termCoef(n, b, r)[0]) <= 2000) return { n, b, r };
    }
  },
  choices: ({ n, b, r }) => {
    const [c] = termCoef(n, b, r);
    return aimedNumbers(c, [-c, seriesCoef(n, r)[0] * b[0], nCr(-n[0], r) * b[0] ** r, termCoef(n, b, r - 1)[0]], spread(n[0], b[0], r));
  },
  render: ({ n, b, r }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `What is the coefficient of $x^{${r}}$ in the expansion of $${seriesTex(1, b, n)}$?` }],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${termCoef(n, b, r)[0]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, b, r }) => seriesSteps(n, b, [r]),
};

const SIGN_LABELS = ['Positive', 'Negative'];

function signLabel(x: Frac): string {
  return x[0] > 0 ? 'Positive' : 'Negative';
}

/**
 * The sign of one term, a fork at a time: the number from n, then b^r, then
 * the term. A negative n puts r negative factors on top, so that number's
 * sign goes with r alone.
 */
const negativeSignsFlow: Generator<RationalTermParams> = {
  id: 'bin-negative-signs-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      n: hard ? rng.pick([...NEGATIVE_N, [-4, 1]]) : rng.pick(NEGATIVE_N),
      b: hard ? wholeB(rng, 2, 5) : wholeB(rng, 1, 3),
      r: hard ? rng.int(1, 3) : rng.int(2, 3),
    };
  },
  render: ({ n, b, r }): Slide => {
    const c = seriesCoef(n, r);
    const bp = qPow(b, r);
    const term = qMul(c, bp);
    const power = r === 1 ? 'x' : `x^{${r}}`;
    const count = r === 1 ? 'one negative factor' : `${r} negative factors`;
    const parity = r % 2 === 0 ? 'an even number of negatives multiply to a positive' : 'an odd number of negatives multiply to a negative';
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Is the $${power}$ term of this expansion positive or negative? Decide one part at a time.` }],
      subject: seriesTex(1, b, n),
      steps: [
        {
          id: 'number',
          ask: `The number from $n$ is $${fallingTexOf(n, r)}$. Is it positive or negative?`,
          branches: SIGN_LABELS.map((label) =>
            label === signLabel(c) ? { label, to: 'power' } : { label, outcome: `It has ${count} on top, and ${parity}.` },
          ),
        },
        {
          id: 'power',
          ask: `And $${bPowTex(b, r)}$?`,
          branches: SIGN_LABELS.map((label) =>
            label === signLabel(bp)
              ? { label, to: 'term' }
              : { label, outcome: b[0] > 0 ? `A positive number to any power is positive.` : `$${b[0]}$ to an ${r % 2 === 0 ? 'even' : 'odd'} power is ${r % 2 === 0 ? 'positive' : 'negative'}.` },
          ),
        },
        {
          id: 'term',
          ask: `So the $${power}$ term is:`,
          branches: SIGN_LABELS.map((label) =>
            label === signLabel(term)
              ? { label, outcome: `Right: it is $${qTermTex(term, r)}$.` }
              : { label, outcome: `Two signs the same make a positive and two different make a negative. The term is $${qTermTex(term, r)}$.` },
          ),
        },
      ],
      answer: [signLabel(c), signLabel(bp), signLabel(term)],
    };
  },
  solution: ({ n, b, r }) => [
    ...seriesSteps(n, b, [r]),
    { text: `With $n$ negative every factor on top is negative, so the number from $n$ has the sign of $(-1)^{${r}}$. The signs of $(1 + x)^{${nPow(n)}}$ alternate, and a negative $b$ turns the odd powers back.` },
  ],
};

/**
 * One coefficient in pieces: the product on top, b^r, the number from n, and
 * the coefficient. The slips are the sign of the product turned, the r!
 * forgotten, and b not raised.
 */
const negativeTree: Generator<RationalTermParams> = {
  id: 'bin-negative-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n: Frac = hard ? rng.pick([...NEGATIVE_N, [-4, 1]]) : rng.pick(NEGATIVE_N);
      const b = wholeB(rng, 2, hard ? 5 : 4);
      const r = rng.int(2, 3);
      if (Math.abs(termCoef(n, b, r)[0]) <= 5000) return { n, b, r };
    }
  },
  render: ({ n, b, r }): Slide => {
    const [top] = fallingProduct(n, r);
    const [bp] = qPow(b, r);
    const [c] = seriesCoef(n, r);
    const answer = [top, bp, c, c * bp].map(String);
    const slips = [-top, -c, c * b[0], -c * bp, top * bp, b[0] * r, Math.abs(top)].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Work out the coefficient of $x^{${r}}$ in pieces. Top row: $n(n - 1)${r === 3 ? '(n - 2)' : ''}$ and $${bPowTex(b, r)}$. Then the number from $n$, over $${r}!$, and the coefficient.`,
        },
      ],
      expression: seriesTex(1, b, n),
      nodes: [
        { id: 'top', from: [] },
        { id: 'power', from: [] },
        { id: 'number', from: ['top'] },
        { id: 'coefficient', from: ['number', 'power'] },
      ],
      bank: treeBank(answer, slips),
      answer,
    };
  },
  solution: ({ n, b, r }) => seriesSteps(n, b, [r]),
};

/* --- fractional n --- */

/** Fractional n: the four of the brief, and at difficulty 2 three more. */
function fractionN(rng: Rng, hard: boolean): Frac {
  return rng.pick(hard ? [...FRACTION_N, [-3, 2], [2, 3], [-1, 3]] : FRACTION_N);
}

/** Whether every coefficient to x^3 is tidy enough to place: none ±1, small tops and bottoms. */
function tidy(coefs: Frac[], top = 200, bottom = 256): boolean {
  return coefs.every(([p, q]) => Math.abs(p) !== q && Math.abs(p) <= top && q <= bottom);
}

/**
 * The x^r coefficient of (1 + bx)^n for fractional n, a step at a time: b^r
 * and r! first, then the product, the division and the power of b. The slips
 * are the factors added, the r! forgotten and the sign turned.
 */
const fractionTermSteps: Generator<RationalTermParams> = {
  id: 'bin-fraction-term-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n = fractionN(rng, hard);
      const b = wholeB(rng, 2, hard ? 6 : 5);
      const r = hard ? 3 : 2;
      if (tidy([termCoef(n, b, r)], 200, 512)) return { n, b, r };
    }
  },
  render: ({ n, b, r }): Slide => {
    const factors = fallingFactors(n, r);
    const start: string[] = [qTex(n)];
    for (const f of factors.slice(1)) start.push('\\times', qFactor(f));
    start.push('\\div', r === 2 ? '2' : '3!', '\\times', bPowTex(b, r));
    const bp = qPow(b, r);
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      { span: [start.length - 1, start.length], value: qTex(bp), bank: qStepBank(bp, qNeg(bp), qMul(b, [r, 1]), qPow(b, r - 1)) },
    ];
    if (r === 3) reductions.push({ span: [start.length - 3, start.length - 2], value: '6', bank: qStepBank([6, 1], [3, 1], [9, 1]) });
    let running = factors[0];
    for (const f of factors.slice(1)) {
      const next = qMul(running, f);
      reductions.push({ span: [0, 3], operator: 1, value: qTex(next), bank: qStepBank(next, qNeg(next), qAdd(running, f)) });
      running = next;
    }
    const c = seriesCoef(n, r);
    reductions.push({ span: [0, 3], operator: 1, value: qTex(c), bank: qStepBank(c, running, qNeg(c), qMul(c, [1, r])) });
    const coef = qMul(c, bp);
    reductions.push({ span: [0, 3], operator: 1, value: qTex(coef), bank: qStepBank(coef, qNeg(coef), qMul(c, b), qMul(running, bp)) });
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `This is the coefficient of $x^{${r}}$ in $${seriesTex(1, b, n)}$: the number from $n = ${qTex(n)}$, times $${bPowTex(b, r)}$. Tap the step to do next, then choose what it gives.`,
        },
      ],
      start,
      reductions,
    };
  },
  solution: ({ n, b, r }) => seriesSteps(n, b, [r]),
};

function sampleFractionSeries(rng: Rng, difficulty: number): RationalParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = fractionN(rng, hard);
    const b: Frac = hard ? [rng.sign() * rng.pick([2, 3, 4, 5, 6, 8]), 1] : wholeB(rng, 1, 5);
    if (tidy(coefsOf({ n, b }).slice(1))) return { n, b };
  }
}

/**
 * The first four terms of (1 + bx)^n for fractional n. The slips are the sign
 * turned, the r! left out, and b left unraised.
 */
const fractionTiles: Generator<RationalParams> = {
  id: 'bin-fraction-tiles',
  sample: sampleFractionSeries,
  render: (params): Slide => {
    const { n, b } = params;
    const coefs = coefsOf(params).slice(1);
    const answer = coefs.map((c) => qToken(c, false));
    const slips = coefs.flatMap((c, i) => {
      const r = i + 1;
      return [qNeg(c), qMul(fallingProduct(n, r), qPow(b, r)), qMul(seriesCoef(n, r), b)].map((value) => qToken(value, false));
    });
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Expand as far as the $x^3$ term, signs and all.' },
        { kind: 'display', tex: `${seriesTex(1, b, n)} =` },
      ],
      // No dots: fraction tiles are wide, and the line would wrap onto a second row.
      template: '1 {0}x {1}x^2 {2}x^3',
      bank: tileBank(answer, fewSlips(answer, slips)),
      answer,
    };
  },
  solution: (params) => seriesWorking(params),
};

/**
 * One coefficient of (1 + bx)^n for fractional n, typed as a fraction. The
 * choice form offers the sign turned, b left unraised, the r! left out, and
 * the factors rising instead of falling.
 */
const fractionCoef: Generator<RationalTermParams> = {
  id: 'bin-fraction-coef',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n = fractionN(rng, hard);
      const b = wholeB(rng, hard ? 2 : 1, hard ? 8 : 4);
      const r = hard ? rng.int(2, 3) : 2;
      if (tidy([termCoef(n, b, r)], 200, 512)) return { n, b, r };
    }
  },
  choices: ({ n, b, r }) => {
    const [p, q] = termCoef(n, b, r);
    const rising = reduced(Array.from({ length: r }, (_, i) => n[0] + i * n[1]).reduce((x, y) => x * y, 1), n[1] ** r * factorial(r));
    return fractionOptions(p, q, spread(n[0], n[1], b[0], r), [
      qNeg([p, q]),
      qMul(seriesCoef(n, r), b),
      qMul(fallingProduct(n, r), qPow(b, r)),
      qMul(rising, qPow(b, r)),
    ]);
  },
  render: ({ n, b, r }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `What is the coefficient of $x^{${r}}$ in the expansion of $${seriesTex(1, b, n)}$? Type it as a fraction.` }],
    lead: '\\text{coefficient} =',
    keypad: [{ insert: '/' }],
    answer: qAnswer(termCoef(n, b, r)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, b, r }) => seriesSteps(n, b, [r]),
};

/**
 * Which three terms start the expansion. The wrong ones divide by 1 where it
 * should be 2!, let the factors rise, leave b unsquared, or turn the sign of
 * the x^2 term.
 */
const fractionWhich: Generator<RationalParams> = {
  id: 'bin-fraction-which',
  sample: sampleFractionSeries,
  render: (params): Slide => {
    const { n, b } = params;
    const [, c1, c2] = coefsOf(params, 2);
    const start = (x1: Frac, x2: Frac) => sumTex(['1', qTermTex(x1, 1), qTermTex(x2, 2)]);
    const labels = firstDistinct([
      start(c1, c2),
      start(c1, qMul(fallingProduct(n, 2), qPow(b, 2))),
      start(c1, qMul(qMul(n, qAdd(n, ONE)), [b[0] ** 2, 2])),
      start(c1, qMul(seriesCoef(n, 2), b)),
      start(c1, qNeg(c2)),
      start(n, c2),
    ]);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which of these is how the expansion of $${seriesTex(1, b, n)}$ starts?` }],
      ...nativeChoice(labels, saltOf(...labels)),
    };
  },
  solution: (params) => seriesWorking(params, 2),
};

/* --- valid for |x| < 1 --- */

/** The largest |x| the series of (1 + bx)^n holds for: 1/|b|. */
function boundOf(b: Frac): Frac {
  return reduced(b[1], Math.abs(b[0]));
}

/** b for a validity question: whole at difficulty 1, a fraction at 2. */
function sampleValidB(rng: Rng, difficulty: number): Frac {
  if (difficulty < 2) return wholeB(rng, 2, 9);
  for (;;) {
    const b = reduced(rng.sign() * rng.int(1, 5), rng.int(2, 6));
    if (b[1] !== 1 && Math.abs(b[0]) !== b[1]) return b;
  }
}

function validWorking(b: Frac, n: Frac): SolutionStep[] {
  const k = boundOf(b);
  return [
    { text: `$(1 + u)^n$ with $n = ${qTex(n)}$ never ends, and the series holds only for $|u| < 1$. Here $u = ${bxTex(b)}$.` },
    { tex: `|${bxTex(b)}| < 1 \\iff |x| < ${qTex(k)}` },
  ];
}

/**
 * The range of x the series holds for, typed. The choice form offers the
 * bound upside down, 1 as for (1 + x)^n, and a whole one out.
 */
const validBound: Generator<RationalParams> = {
  id: 'bin-valid-bound',
  sample: (rng, difficulty) => ({ n: rng.pick(RATIONAL_N), b: sampleValidB(rng, difficulty) }),
  choices: ({ n, b }) => {
    const [p, q] = boundOf(b);
    return fractionOptions(p, q, spread(n[0], n[1], b[0], b[1]), [[q, p], ONE, qMul([p, q], [1, 2])]);
  },
  render: ({ n, b }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `The expansion of $${seriesTex(1, b, n)}$ as a series is valid for $|x| < k$. What is $k$?` }],
    lead: 'k =',
    keypad: [{ insert: '/' }],
    answer: qAnswer(boundOf(b)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, b }) => validWorking(b, n),
};

interface WhichXParams extends RationalParams {
  /** The x offered, the valid one first. */
  xs: Frac[];
}

const INSIDE: Frac[] = [
  [1, 2],
  [-1, 2],
  [2, 3],
  [-2, 3],
  [3, 4],
  [-3, 4],
  [1, 3],
];
const OUTSIDE: Frac[] = [
  [2, 1],
  [-2, 1],
  [3, 2],
  [-3, 2],
  [3, 1],
  [4, 3],
  [-4, 3],
];

/**
 * Which x can go into the series: one inside the range and three outside,
 * none on its edge, where whether the series holds depends on n.
 */
const validWhichX: Generator<WhichXParams> = {
  id: 'bin-valid-which-x',
  sample: (rng, difficulty) => {
    const b = sampleValidB(rng, difficulty);
    const k = boundOf(b);
    const outside = rng.sample(OUTSIDE, 3).map((m) => qMul(k, m));
    return { n: rng.pick(RATIONAL_N), b, xs: [qMul(k, rng.pick(INSIDE)), ...outside] };
  },
  render: ({ n, b, xs }): Slide => {
    const labels = xs.map((x) => `x = ${qTex(x)}`);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `The expansion of $${seriesTex(1, b, n)}$ as a series holds only for some $x$. For which of these does it hold?` }],
      ...nativeChoice(labels, saltOf(...labels)),
    };
  },
  solution: ({ n, b, xs }) => [
    ...validWorking(b, n),
    {
      tex: column(xs.map((x): [string, string] => [`x = ${qTex(x)}: \\enspace |${bxTex(b)}|`, qTex(qAbs(qMul(b, x)))])),
    },
    { text: `Only $x = ${qTex(xs[0])}$ makes $|${bxTex(b)}|$ less than $1$.` },
  ],
};

interface SliderParams {
  n: Frac;
  /** The bound, |x| < k, so b = ±1/k. */
  k: Frac;
  sign: number;
}

const SLIDER_BOUNDS: Frac[] = [
  [1, 2],
  [1, 1],
  [3, 2],
  [2, 1],
  [5, 2],
  [3, 1],
];

/** The first `terms` terms of (1 + bx)^n as a function, for drawing. */
function partialSum(n: Frac, b: number, terms: number): (x: number) => number {
  const coefs: number[] = [1];
  for (let r = 1; r < terms; r += 1) coefs.push((coefs[r - 1] * (qValue(n) - r + 1) * b) / r);
  return (x) => coefs.reduce((sum, c, r) => sum + c * x ** r, 0);
}

/**
 * Slide to the edge of the range: the curve and the first ten terms of its
 * series agree inside it and part outside. The bracket carries 1/k, so the
 * edge is k.
 */
const validSlider: Generator<SliderParams> = {
  id: 'bin-valid-slider',
  sample: (rng, difficulty) => ({
    n: rng.pick(RATIONAL_N),
    k: rng.pick(difficulty > 1 ? SLIDER_BOUNDS : SLIDER_BOUNDS.filter(([, q]) => q === 1)),
    sign: rng.sign(),
  }),
  render: ({ n, k, sign }): Slide => {
    const b = reduced(sign * k[1], k[0]);
    const edge = qValue(k);
    let span = 4;
    while (defaultSliderValue(0, span, 0.5) === edge) span += 0.5;
    const bv = qValue(b);
    const curve = (x: number) => (1 + bv * x) ** qValue(n);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The solid curve is $y = ${seriesTex(1, b, n)}$ and the dashed one the first ten terms of its series. Slide to the edge of the range the series is valid for.`,
        },
      ],
      min: 0,
      max: span,
      step: 0.5,
      answer: edge,
      readout: '|x| < {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: -1,
          yMax: 4,
          curves: [
            { f: curve, breaks: true },
            // In the accent colour, or it is lost under the curve where the two agree.
            { f: partialSum(n, bv, 10), dashed: true, accent: true, breaks: true },
          ],
          label: 'A curve and its series, which agree near 0 and part further out',
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: ({ n, k, sign }) => validWorking(reduced(sign * k[1], k[0]), n),
};

interface ValidFlowParams extends RationalParams {
  x: Frac;
}

/**
 * Whether the series holds at one x: which part must stay under 1, its size
 * there, and the verdict. The wrong turns are |x| alone and the whole
 * bracket.
 */
const validFlow: Generator<ValidFlowParams> = {
  id: 'bin-valid-flow',
  sample: (rng, difficulty) => {
    const b = sampleValidB(rng, difficulty);
    const u = qMul([rng.sign(), 1], rng.pick([...INSIDE.filter(([p]) => p > 0), ...OUTSIDE.filter(([p]) => p > 0)]));
    return { n: rng.pick(RATIONAL_N), b, x: qMul(u, reduced(b[1], b[0])) };
  },
  render: ({ n, b, x }): Slide => {
    const size = qAbs(qMul(b, x));
    const bx = `$${bxTex(b)}$`;
    const sizeLabel = `$${qTex(size)}$`;
    const wrongSizes = [
      { label: `$${qTex(qAbs(x))}$`, outcome: `That is $|x|$ on its own. It is $|${bxTex(b)}|$ that has to be under $1$.` },
      { label: `$${qTex(qAdd(qAbs(b), qAbs(x)))}$`, outcome: `That adds $|x|$ to the number in front; $${bxTex(b)}$ multiplies them.` },
    ].filter((branch, i, all) => branch.label !== sizeLabel && all.findIndex((other) => other.label === branch.label) === i);
    const holds = qValue(size) < 1;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Does the series for this expansion hold at $x = ${qTex(x)}$? Decide step by step.` }],
      subject: seriesTex(1, b, n),
      steps: [
        {
          id: 'part',
          ask: 'The series for $(1 + u)^n$ holds for $|u| < 1$. What is $u$ here?',
          branches: turned(
            [
              { label: bx, to: 'size' },
              { label: '$x$', outcome: `$u$ is all of what is added to the $1$: here $${bxTex(b)}$, not $x$ alone.` },
              { label: `$${insideOf(1, b)}$`, outcome: 'The whole bracket is $1 + u$: $u$ is only the part added to the $1$.' },
            ],
            spread(n[0], b[0], b[1], x[0], x[1]),
          ),
        },
        {
          id: 'size',
          ask: `At $x = ${qTex(x)}$, what is $|${bxTex(b)}|$?`,
          branches: turned([{ label: sizeLabel, to: 'verdict' }, ...wrongSizes], spread(x[0], x[1], b[0], 3)),
        },
        {
          id: 'verdict',
          ask: `Is $${qTex(size)}$ less than $1$?`,
          branches: [
            { label: 'Yes', outcome: `Then $x = ${qTex(x)}$ is inside the range, and the series holds there.` },
            { label: 'No', outcome: `Then $x = ${qTex(x)}$ is outside the range, and the series does not hold there.` },
          ],
        },
      ],
      answer: [bx, sizeLabel, holds ? 'Yes' : 'No'],
    };
  },
  solution: ({ n, b, x }) => [
    ...validWorking(b, n),
    {
      text: `At $x = ${qTex(x)}$, $|${bxTex(b)}| = ${qTex(qAbs(qMul(b, x)))}$, which is ${qValue(qAbs(qMul(b, x))) < 1 ? 'less than $1$: the series holds' : 'more than $1$: the series does not hold'}.`,
    },
  ],
};

/* --- a number in front --- */

interface FrontSeriesParams {
  /** The bracket is (a + bx)^n. */
  a: number;
  b: number;
  n: Frac;
}

interface FrontTermParams extends FrontSeriesParams {
  r: number;
}

/** a^n exactly: a is a square for halves, a cube for thirds. */
function aPow(a: number, n: Frac): Frac {
  const root = Math.round(a ** (1 / n[1]));
  const whole = root ** Math.abs(n[0]);
  return n[0] < 0 ? [1, whole] : [whole, 1];
}

/** b/a, the number on x once a^n is out. */
function frontRatio({ a, b }: FrontSeriesParams): Frac {
  return reduced(b, a);
}

/** The coefficient of x^r in (a + bx)^n: a^n times the number from n times (b/a)^r. */
function frontCoef(params: FrontSeriesParams, r: number): Frac {
  return qMul(aPow(params.a, params.n), termCoef(params.n, frontRatio(params), r));
}

function sampleFrontSeries(rng: Rng, difficulty: number, fits: (params: FrontSeriesParams) => boolean): FrontSeriesParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = rng.pick(RATIONAL_N);
    const a = n[1] === 2 ? rng.pick(hard ? [4, 9, 16, 25] : [4, 9]) : n[1] === 3 ? rng.pick([8, 27]) : rng.pick(hard ? [2, 3, 4, 5] : [2, 3]);
    const b = rng.sign() * rng.int(1, hard ? 5 : 2);
    const params = { a, b, n };
    // b = a would leave (1 + x)^n with nothing to divide.
    if (Math.abs(b) !== a && fits(params)) return params;
  }
}

/** Whether the first terms are tidy: no coefficient ±1, tops under 1000 and bottoms under 1024. */
function frontFits(params: FrontSeriesParams, top = 2): boolean {
  return Array.from({ length: top }, (_, i) => frontCoef(params, i + 1)).every(
    ([p, q]) => Math.abs(p) !== q && Math.abs(p) < 1000 && q <= 1024,
  );
}

function frontSeriesWorking(params: FrontSeriesParams, rs: number[]): SolutionStep[] {
  const { a, b, n } = params;
  const ratio = frontRatio(params);
  const an = aPow(a, n);
  return [
    { text: `Take $${a}$ out of the bracket first, so that it starts with $1$:` },
    { tex: chain(`& ${seriesTex(a, [b, 1], n)}`, `&= ${a}^{${nPow(n)}}${seriesTex(1, ratio, n)}`) },
    { tex: `${a}^{${nPow(n)}} = ${qTex(an)}` },
    ...seriesSteps(n, ratio, rs),
    ...rs.map((r) => ({ tex: `${qFactor(an)} \\times ${qFactor(termCoef(n, ratio, r))} = ${qTex(frontCoef(params, r))}` })),
  ];
}

/**
 * One coefficient of (a + bx)^n with a^n taken out, a step at a time: a^n,
 * (b/a)^r, then the two products. The slips are a times n, a^n upside down,
 * and b/a left unraised.
 */
const frontCoefSteps: Generator<FrontTermParams> = {
  id: 'bin-taken-out-coef-steps',
  sample: (rng, difficulty) => {
    const r = difficulty > 1 ? rng.int(2, 3) : rng.int(1, 2);
    // A number from n of 1 or -1 leaves a product with nothing in it.
    const fits = (params: FrontSeriesParams) => frontFits(params, r) && Math.abs(seriesCoef(params.n, r)[0]) !== seriesCoef(params.n, r)[1];
    return { ...sampleFrontSeries(rng, difficulty, fits), r };
  },
  render: (params): Slide => {
    const { a, b, n, r } = params;
    const ratio = frontRatio(params);
    const an = aPow(a, n);
    const c = seriesCoef(n, r);
    const rp = qPow(ratio, r);
    const ratioTex = r === 1 ? qFactor(ratio) : bPowTex(ratio, r);
    const start = [`${a}^{${nPow(n)}}`, '\\times', qFactor(c), '\\times', ratioTex];
    const first = qMul(an, c);
    const coef = frontCoef(params, r);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `With $${a}^{${nPow(n)}}$ taken out, the coefficient of $${r === 1 ? 'x' : `x^{${r}}`}$ in $${seriesTex(a, [b, 1], n)}$ is $${a}^{${nPow(n)}}$ times the number from $n$, $${qTex(c)}$, times $${ratioTex}$. Tap the step to do next, then choose what it gives.`,
        },
      ],
      start,
      reductions: [
        { span: [0, 1], value: qTex(an), bank: qStepBank(an, qMul([a, 1], n), [an[1], an[0]], qNeg(an)) },
        ...(r === 1 ? [] : [{ span: [4, 5] as [number, number], value: qTex(rp), bank: qStepBank(rp, qMul(ratio, [r, 1]), qNeg(rp), ratio) }]),
        { span: [0, 3], operator: 1, value: qTex(first), bank: qStepBank(first, qNeg(first), qAdd(an, c), c) },
        { span: [0, 3], operator: 1, value: qTex(coef), bank: qStepBank(coef, qNeg(coef), qMul(first, [b ** r, 1]), qMul(c, rp)) },
      ],
    };
  },
  solution: (params) => frontSeriesWorking(params, [params.r]),
};

/**
 * The first three terms of (a + bx)^n. The slips are a^n forgotten, b left
 * undivided by a, the sign turned, and a times n for a^n.
 */
const frontSeriesTiles: Generator<FrontSeriesParams> = {
  id: 'bin-taken-out-tiles',
  sample: (rng, difficulty) => sampleFrontSeries(rng, difficulty, (params) => frontFits(params)),
  render: (params): Slide => {
    const { a, b, n } = params;
    const ratio = frontRatio(params);
    const an = aPow(a, n);
    const coefs = [an, frontCoef(params, 1), frontCoef(params, 2)];
    const answer = coefs.map((c, r) => qToken(c, r === 0));
    const slips = [
      qToken(qMul([a, 1], n), true),
      qToken([an[1], an[0]], true),
      ...[1, 2].flatMap((r) => [termCoef(n, ratio, r), qMul(an, termCoef(n, [b, 1], r)), qNeg(frontCoef(params, r))].map((c) => qToken(c, false))),
    ];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Expand as far as the $x^2$ term, taking the number out of the bracket first.' },
        { kind: 'display', tex: `${seriesTex(a, [b, 1], n)} =` },
      ],
      template: '{0} {1}x {2}x^2 + \\dots',
      bank: tileBank(answer, fewSlips(answer, slips, 5)),
      answer,
    };
  },
  solution: (params) => [
    ...frontSeriesWorking(params, [1, 2]),
    { tex: seriesLine(params.a, [params.b, 1], params.n, [0, 1, 2].map((r) => (r === 0 ? aPow(params.a, params.n) : frontCoef(params, r)))) },
  ],
};

/**
 * a^n and b/a, then the x and x^2 coefficients from them. The slips are a
 * times n, a/b for b/a, and a^n forgotten.
 */
const frontTree: Generator<FrontSeriesParams> = {
  id: 'bin-taken-out-parts-tree',
  sample: (rng, difficulty) => sampleFrontSeries(rng, difficulty, (params) => frontFits(params)),
  render: (params): Slide => {
    const { a, b, n } = params;
    const ratio = frontRatio(params);
    const an = aPow(a, n);
    const answer = [an, ratio, frontCoef(params, 1), frontCoef(params, 2)];
    const slips = [qMul([a, 1], n), reduced(a, b), termCoef(n, ratio, 1), termCoef(n, ratio, 2), qNeg(frontCoef(params, 1)), qMul(an, termCoef(n, [b, 1], 1))];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Take the $${a}$ out of the bracket. Top row: $${a}^{${nPow(n)}}$, and the number on $x$ in the bracket left behind. Then the coefficients of $x$ and $x^2$.`,
        },
      ],
      expression: seriesTex(a, [b, 1], n),
      nodes: [
        { id: 'power', from: [] },
        { id: 'ratio', from: [] },
        { id: 'x', from: ['power', 'ratio'] },
        { id: 'x2', from: ['power', 'ratio'] },
      ],
      bank: bySize(qTreeBank(answer, slips)),
      answer: answer.map(qTex),
    };
  },
  solution: (params) => frontSeriesWorking(params, [1, 2]),
};

/**
 * The range of (a + bx)^n, typed: |x| < a/|b|. The choice form offers it
 * upside down, 1/|b| with the a forgotten, and 1.
 */
const frontRange: Generator<FrontSeriesParams> = {
  id: 'bin-taken-out-range',
  sample: (rng, difficulty) => sampleFrontSeries(rng, difficulty, () => true),
  choices: ({ a, b, n }) => {
    const [p, q] = reduced(a, Math.abs(b));
    return fractionOptions(p, q, spread(a, b, n[0], n[1]), [[q, p], [1, Math.abs(b)], ONE, [a * Math.abs(b), 1]]);
  },
  render: ({ a, b, n }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `The expansion of $${seriesTex(a, [b, 1], n)}$ as a series is valid for $|x| < k$. What is $k$?` }],
    lead: 'k =',
    keypad: [{ insert: '/' }],
    answer: fracAnswer(a, Math.abs(b)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, n }) => {
    const ratio = reduced(b, a);
    return [
      { text: `Take $${a}$ out: $${seriesTex(a, [b, 1], n)} = ${a}^{${nPow(n)}}${seriesTex(1, ratio, n)}$.` },
      { text: `That series holds for $|${bxTex(ratio)}| < 1$.` },
      { tex: `|x| < ${qTex(boundOf(ratio))}` },
    ];
  },
};

/*
 * Level 7 turns the series into numbers: a root such as √1.02 from
 * (1 + x)^{1/2} at x = 0.02, a reciprocal such as 1/0.98² from (1 - x)^{-2},
 * a number taken out first so that √4.08 is 2(1 + 0.02)^{1/2}, how many
 * places an estimate can be trusted to and which x to choose, and the series
 * of a partial-fraction split. The split itself belongs to Algebraic &
 * Partial Fractions (`af-l2-two`) and is given here.
 *
 * Every estimate is the sum of the terms kept, never the true power, and it
 * is exact: x is a hundredth, every coefficient comes from seriesCoef or
 * termCoef as a Frac, and n is chosen so the terms end as decimals (a third
 * only with x a multiple of 0.03). They are written by qDec, which works in
 * whole numbers and never goes through a float. Only √k from a known root
 * does not end, since its front is 10/m; that one is rounded by qRound, to
 * the places its error allows, and only where the estimate and the true root
 * round the same way and sit well clear of a rounding boundary.
 *
 * Nothing here is calculus, so no slide declares `source` or `integrand`:
 * binomialExpansion.test.ts reads each bracket, n and x back off the slide
 * and checks the estimate against the terms it sums itself and against
 * mathjs.
 */

/** Whether p/q ends as a decimal: its bottom has no prime factor but 2 and 5. */
function ends([, q]: Frac): boolean {
  let m = q;
  while (m % 2 === 0) m /= 2;
  while (m % 5 === 0) m /= 5;
  return m === 1;
}

/** A whole number of units in the last of `places` decimal places, written out: 105 at 4 places is 0.0105. */
function pointed(units: bigint, places: number, trim: boolean): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(places + 1, '0');
  const whole = digits.slice(0, digits.length - places);
  let part = digits.slice(digits.length - places);
  if (trim) part = part.replace(/0+$/, '');
  const body = part === '' ? whole : `${whole}.${part}`;
  return negative ? `-${body}` : body;
}

/** A fraction that ends as a decimal, written in full: 1/2000000 is 0.0000005, never 5e-7. */
function qDec(x: Frac): string {
  if (!ends(x)) throw new Error(`${x[0]}/${x[1]} does not end as a decimal`);
  let places = 0;
  while (10n ** BigInt(places) % BigInt(x[1]) !== 0n) places += 1;
  return pointed((BigInt(x[0]) * 10n ** BigInt(places)) / BigInt(x[1]), places, true);
}

/** x rounded to k decimal places, a half away from 0, every place written: 1.41421. */
function qRound(x: Frac, k: number): string {
  const top = BigInt(Math.abs(x[0])) * 10n ** BigInt(k);
  const bottom = BigInt(x[1]);
  const units = top / bottom + (2n * (top % bottom) >= bottom ? 1n : 0n);
  return pointed(x[0] < 0 ? -units : units, k, false);
}

/** How far x sits from a rounding boundary at k places, in units of the k-th place: 0.5 is as clear as it gets. */
function clearance(x: Frac, k: number): number {
  const top = BigInt(Math.abs(x[0])) * 10n ** BigInt(k);
  return Math.abs(Number(top % BigInt(x[1])) / x[1] - 0.5);
}

/** The number of decimal places qDec writes. */
function placesOf(x: Frac): number {
  const written = qDec(x);
  return written.includes('.') ? written.length - written.indexOf('.') - 1 : 0;
}

/** x in hundredths, as a fraction: 3 is 0.03. */
function hundredths(d: number): Frac {
  return reduced(d, 100);
}

/** A decimal in a line of working: bracketed when negative. */
function decFactor(x: Frac): string {
  return x[0] < 0 ? `(${qDec(x)})` : qDec(x);
}

/** A value to add on in a line of working: `+ 0.01` or `- 0.00005`. */
function decSigned(x: Frac): string {
  return x[0] < 0 ? `- ${qDec(qNeg(x))}` : `+ ${qDec(x)}`;
}

function qSum(values: Frac[]): Frac {
  return values.reduce(qAdd, [0, 1]);
}

interface EstimateParams {
  /** The number estimated is front × (1 + bx)^n at this x. */
  n: Frac;
  b: number;
  x: Frac;
  front: Frac;
}

/** 1 + bx at the x put in: the number being raised to the power. */
function baseAt({ b, x }: Pick<EstimateParams, 'b' | 'x'>): Frac {
  return qAdd(ONE, qMul([b, 1], x));
}

/** The terms kept, each exact: 1, then the x term, then the x^2 term. */
function keptTerms({ n, b, x }: EstimateParams, count = 3): Frac[] {
  return Array.from({ length: count }, (_, r) => qMul(termCoef(n, [b, 1], r), qPow(x, r)));
}

/** The estimate: the terms kept, added, times the number in front. */
function keptSum(params: EstimateParams, count = 3): Frac {
  return qMul(params.front, qSum(keptTerms(params, count)));
}

/** The first term left out, front and all: about what the estimate is out by. */
function leftOut(params: EstimateParams, count = 3): Frac {
  return qMul(params.front, qMul(termCoef(params.n, [params.b, 1], count), qPow(params.x, count)));
}

/** What is being estimated, as a float. Only ever used to choose questions, never to write an answer. */
function trueOf({ n, b, x, front }: EstimateParams): number {
  return qValue(front) * (1 + b * qValue(x)) ** qValue(n);
}

/** base^n as the learner reads it: a root, one over a power, or a root of a power. */
function rootPowerTex(base: string, n: Frac): string {
  const [p, q] = n;
  const inner = Math.abs(p) === 1 ? base : `${base}^{${Math.abs(p)}}`;
  const root = q === 1 ? inner : q === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${q}]{${inner}}`;
  return p < 0 ? `\\frac{1}{${root}}` : root;
}

/** The number being estimated: 1 + bx at the x put in, raised to n. */
function targetOf(params: EstimateParams): string {
  return rootPowerTex(qDec(baseAt(params)), params.n);
}

/** A number in front, left off when it is 1. */
function frontTex(front: Frac): string {
  return qSame(front, ONE) ? '' : qTex(front);
}

/** target = front(1 + bx)^n, the relation every estimate is read from. */
function relationTex(params: EstimateParams, target: string): string {
  return `${target} = ${frontTex(params.front)}${seriesTex(1, [params.b, 1], params.n)}`;
}

/** The first three terms of (1 + bx)^n, as the learner reads them. */
function threeTex({ n, b }: Pick<EstimateParams, 'n' | 'b'>): string {
  return sumTex(['1', qTermTex(termCoef(n, [b, 1], 1), 1), qTermTex(termCoef(n, [b, 1], 2), 2)]);
}

/** The three terms written out, then x put into each and the results added. */
function estimateWorking(params: EstimateParams, target: string, places?: number): SolutionStep[] {
  const { n, b, x, front } = params;
  const [, t1, t2] = keptTerms(params);
  const sum = qSum([ONE, t1, t2]);
  const inX = decFactor(x);
  const steps: SolutionStep[] = [
    { text: `$${relationTex(params, target)}$, with $x = ${qDec(x)}$. The first three terms of the series are` },
    { tex: `${seriesTex(1, [b, 1], n)} = ${threeTex(params)} + \\dots` },
    { tex: `${qFactor(termCoef(n, [b, 1], 1))} \\times ${inX} = ${qDec(t1)}` },
    { tex: `${qFactor(termCoef(n, [b, 1], 2))} \\times ${inX}^{2} = ${qDec(t2)}` },
    { tex: `1 ${decSigned(t1)} ${decSigned(t2)} = ${qDec(sum)}` },
  ];
  if (qSame(front, ONE)) return steps;
  const estimate = qMul(front, sum);
  if (places === undefined) return [...steps, { tex: `${qTex(front)} \\times ${qDec(sum)} = ${qDec(estimate)}` }];
  return [
    ...steps,
    { tex: `${qTex(front)} \\times ${qDec(sum)} = ${ends(estimate) ? qDec(estimate) : `${qRound(estimate, places + 2)}\\dots`}` },
    { text: `To $${places}$ decimal places that is $${qRound(estimate, places)}$.` },
  ];
}

/** Four decimal options, the slips first, then a unit either side in the last place. */
function decimalChoices(right: Frac, slips: Frac[], salt: number, places?: number): ChoiceOption[] {
  const write = (value: Frac) => (places === undefined ? qDec(value) : qRound(value, places));
  const unit: Frac = [1, 10 ** (places ?? placesOf(right))];
  const near = [unit, qNeg(unit), qMul(unit, [2, 1])].map((step) => qAdd(right, step));
  const option = (value: Frac): ChoiceOption => ({ tex: write(value), answer: write(value) });
  return aimed(option(right), [...slips, ...near].map(option), salt);
}

/** The usual slips in a three-term estimate: two terms only, the x^2 term's sign turned, its r! left out, the x term's sign turned. */
function estimateSlips(params: EstimateParams): Frac[] {
  const [, t1, t2] = keptTerms(params);
  return [
    qSum([ONE, t1]),
    qSum([ONE, t1, qNeg(t2)]),
    qSum([ONE, t1, t2, t2]),
    qSum([ONE, qNeg(t1), t2]),
  ].map((sum) => qMul(params.front, sum));
}

function estimateSalt({ n, b, x, front }: EstimateParams): number {
  return spread(n[0], n[1], b, x[0], x[1], front[0], front[1]);
}

/**
 * A three-term estimate, typed as the decimal it comes to. The choice form
 * offers two terms only, the x^2 term's sign turned or its r! left out, and
 * a unit either side in the last place.
 */
function estimateGenerator<P extends EstimateParams>(
  id: string,
  sample: (rng: Rng, difficulty: number) => P,
  target: (params: P) => string,
  lead: (params: P) => string,
): Generator<P> {
  return {
    id,
    sample,
    choices: (params) => decimalChoices(keptSum(params), estimateSlips(params), estimateSalt(params)),
    render: (params): Slide => ({
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: lead(params) },
        { kind: 'display', tex: relationTex(params, target(params)) },
        { kind: 'prose', text: `with $x = ${qDec(params.x)}$. Use the first three terms of the series to estimate $${target(params)}$.` },
      ],
      lead: '\\text{estimate} =',
      keypad: [],
      answer: qDec(keptSum(params)),
      domain: 'real',
      mode: 'exact',
    }),
    solution: (params) => estimateWorking(params, target(params)),
  };
}

/** A bank of decimals: the answer, repeats kept, then up to four slips, topped up with the answer's tenfold. */
function decimalBank(answer: Frac[], slips: Frac[]): string[] {
  const extras = freshFracs(slips.filter(ends), answer).slice(0, 4);
  const last = answer[answer.length - 1];
  for (let step = 10; extras.length < 2; step *= 10) extras.push(...freshFracs([qMul(last, [step, 1])], [...answer, ...extras]));
  return [...answer, ...extras].sort((p, q) => qValue(p) - qValue(q)).map(qDec);
}

/**
 * The x term and the x^2 term at the x given, then the estimate. The slips
 * are each term's sign turned, x left unsquared, the r! left out, and the
 * estimate with two terms only.
 */
function termsTree(id: string, sample: (rng: Rng, difficulty: number) => EstimateParams): Generator<EstimateParams> {
  return {
    id,
    sample,
    render: (params): Slide => {
      const [, t1, t2] = keptTerms(params);
      const sum = qSum([ONE, t1, t2]);
      const c2 = termCoef(params.n, [params.b, 1], 2);
      const answer = [t1, t2, sum];
      const slips = [qNeg(t2), qNeg(t1), qMul(c2, params.x), qAdd(t2, t2), qAdd(ONE, t1), qSum([ONE, t1, qNeg(t2)])];
      return {
        kind: 'tree',
        prompt: [
          {
            kind: 'prose',
            text: `Estimate $${targetOf(params)}$ from $${threeTex(params)}$, the first three terms of this series, at $x = ${qDec(params.x)}$. Top row: the $x$ term and the $x^2$ term. Then the estimate.`,
          },
        ],
        expression: seriesTex(1, [params.b, 1], params.n),
        nodes: [
          { id: 'x', from: [] },
          { id: 'x2', from: [] },
          { id: 'estimate', from: ['x', 'x2'] },
        ],
        bank: decimalBank(answer, slips),
        answer: answer.map(qDec),
      };
    },
    solution: (params) => estimateWorking(params, targetOf(params)),
  };
}

/* --- a root from the series --- */

const ROOT_N_EASY: Frac[] = [
  [1, 2],
  [1, 4],
  [-1, 2],
];
const ROOT_N_HARD: Frac[] = [
  [1, 2],
  [1, 3],
  [1, 4],
  [-1, 2],
  [-1, 3],
  [2, 3],
  [-1, 4],
  [3, 2],
  [-3, 2],
];

/** x in hundredths, 1 to `top` in size, a multiple of 0.03 when n is a third so every term ends. */
function sampleX(rng: Rng, n: Frac, top: number, signed: boolean): Frac {
  const step = n[1] === 3 ? 3 : 1;
  const d = step * rng.int(1, Math.floor(top / step));
  return hundredths(signed && rng.chance(0.5) ? -d : d);
}

/** A root of a number near 1: x above 1 only at difficulty 1, either side and more roots at 2. */
function sampleRoot(rng: Rng, difficulty: number, signed = difficulty > 1): EstimateParams {
  const n = rng.pick(difficulty > 1 ? ROOT_N_HARD : ROOT_N_EASY);
  return { n, b: 1, x: sampleX(rng, n, 12, signed), front: ONE };
}

/**
 * Which n and x turn the root into the series. The slips are n upside down,
 * the whole number put in for x, x a place out, and a sign turned.
 */
const rootSetup: Generator<EstimateParams> = {
  id: 'bin-root-setup',
  sample: (rng, difficulty) => sampleRoot(rng, difficulty),
  render: (params): Slide => {
    const { n, x } = params;
    const label = (m: Frac, value: Frac) => `n = ${qTex(m)}, \\enspace x = ${qDec(value)}`;
    const labels = firstDistinct([
      label(n, x),
      label([n[1], n[0]], x),
      label(n, baseAt(params)),
      label(n, qMul(x, [10, 1])),
      label(qNeg(n), x),
      label(n, qNeg(x)),
    ]);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `To estimate $${targetOf(params)}$ as $(1 + x)^n$ from its series, which $n$ and $x$?` }],
      ...nativeChoice(labels, saltOf(...labels)),
    };
  },
  solution: (params) => [
    { text: `A root is a fractional power, and one over it a negative power, as in Exponents & Radicals:` },
    { tex: `${targetOf(params)} = (${qDec(baseAt(params))})^{${nPow(params.n)}}` },
    { text: `$${qDec(baseAt(params))} = 1 ${decSigned(params.x)}$, so it is $(1 + x)^{${nPow(params.n)}}$ with $x = ${qDec(params.x)}$, well inside $|x| < 1$.` },
  ],
};

const rootEstimate = estimateGenerator(
  'bin-root-estimate',
  (rng, difficulty) => sampleRoot(rng, difficulty),
  targetOf,
  () => 'Write the root as a power of $1 + x$:',
);

const rootTermsTree = termsTree('bin-root-terms-tree', (rng, difficulty) => sampleRoot(rng, difficulty));

/**
 * x put into the three terms and worked a step at a time: x^2, the two
 * products, then the two sums. x is above 1 so each term keeps the sign of
 * its coefficient. The slips are a place out either way and doubled.
 */
const rootSubstituteSteps: Generator<EstimateParams> = {
  id: 'bin-root-substitute-steps',
  sample: (rng, difficulty) => sampleRoot(rng, difficulty, false),
  render: (params): Slide => {
    const { n, x } = params;
    const c1 = termCoef(n, ONE, 1);
    const c2 = termCoef(n, ONE, 2);
    const [, t1, t2] = keptTerms(params);
    const sign = (c: Frac) => (c[0] < 0 ? '-' : '+');
    const start = ['1', sign(c1), qTex(qAbs(c1)), '\\times', qDec(x), sign(c2), qTex(qAbs(c2)), '\\times', `${qDec(x)}^{2}`];
    const bank = (right: Frac, ...wrong: Frac[]) => decimalBank([right], [...wrong, qMul(right, [10, 1]), qMul(right, [1, 10]), qMul(right, [2, 1])]);
    const x2 = qPow(x, 2);
    const first = qAdd(ONE, t1);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Estimate $${targetOf(params)}$ from the first three terms of $(1 + x)^{${nPow(n)}}$ at $x = ${qDec(x)}$. Tap the step to do next, then choose what it gives.`,
        },
      ],
      start,
      reductions: [
        { span: [8, 9], value: qDec(x2), bank: bank(x2, qMul(x, [2, 1])) },
        { span: [6, 9], operator: 7, value: qDec(qAbs(t2)), bank: bank(qAbs(t2), qMul(qAbs(c2), x)) },
        { span: [2, 5], operator: 3, value: qDec(qAbs(t1)), bank: bank(qAbs(t1)) },
        { span: [0, 3], operator: 1, value: qDec(first), bank: bank(first, qAdd(ONE, qNeg(t1))) },
        { span: [0, 3], operator: 1, value: qDec(qAdd(first, t2)), bank: bank(qAdd(first, t2), qAdd(first, qNeg(t2))) },
      ],
    };
  },
  solution: (params) => estimateWorking(params, targetOf(params)),
};

/* --- reciprocals --- */

/** One over a power of a number near 1, as (1 + bx)^n with n negative and x above 1. */
function sampleReciprocal(rng: Rng, difficulty: number): EstimateParams {
  const hard = difficulty > 1;
  for (;;) {
    const n: Frac = rng.pick(
      hard
        ? ([
            [-1, 1],
            [-2, 1],
            [-3, 1],
            [-1, 2],
          ] as Frac[])
        : ([
            [-1, 1],
            [-2, 1],
          ] as Frac[]),
    );
    const b = rng.sign() * rng.int(1, hard ? 4 : 2);
    const d = rng.int(1, 5);
    if (Math.abs(b * d) <= (hard ? 16 : 10)) return { n, b, x: hundredths(d), front: ONE };
  }
}

interface RewriteParams {
  n: Frac;
  b: Frac;
  /** The number on top. */
  k: number;
}

/** (1 + bx)^n, a power of 1 written as the bare bracket. */
function bracketPow(b: Frac, n: Frac): string {
  return qSame(n, ONE) ? `(${insideOf(1, b)})` : seriesTex(1, b, n);
}

/** k over (1 + bx)^p, or over a root of it, for a negative n. */
function reciprocalTex({ n, b, k }: RewriteParams): string {
  const inside = insideOf(1, b);
  const p = -n[0];
  const power = p === 1 ? inside : `(${inside})^{${p}}`;
  const bottom = n[1] === 1 ? power : n[1] === 2 ? `\\sqrt{${power}}` : `\\sqrt[${n[1]}]{${power}}`;
  return `\\frac{${k}}{${bottom}}`;
}

/**
 * One over a bracket written as one power. The slips are the power's sign
 * left positive, the bracket's sign turned, n upside down, and the number on
 * top put underneath.
 */
const reciprocalRewrite: Generator<RewriteParams> = {
  id: 'bin-reciprocal-rewrite',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const ns: Frac[] = hard
      ? [
          [-1, 1],
          [-2, 1],
          [-3, 1],
          [-1, 2],
          [-1, 3],
          [-3, 2],
        ]
      : [
          [-1, 1],
          [-2, 1],
          [-3, 1],
          [-1, 2],
        ];
    return { n: rng.pick(ns), b: wholeB(rng, 1, hard ? 6 : 5), k: hard ? rng.int(1, 4) : 1 };
  },
  render: (params): Slide => {
    const { n, b, k } = params;
    const top = k === 1 ? '' : `${k}`;
    const labels = firstDistinct([
      `${top}${bracketPow(b, n)}`,
      `${top}${bracketPow(b, qNeg(n))}`,
      `${top}${bracketPow(qNeg(b), n)}`,
      `${top}${bracketPow(b, [n[1] * Math.sign(n[0]), Math.abs(n[0])])}`,
      ...(k === 1 ? [] : [`\\frac{1}{${k}}${bracketPow(b, n)}`]),
      `${top}${bracketPow(qNeg(b), qNeg(n))}`,
    ]);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Write $${reciprocalTex(params)}$ as one power, ready for the series.` }],
      ...nativeChoice(labels, saltOf(...labels)),
    };
  },
  solution: ({ n, b, k }) => [
    { text: `One over a power is the negative power, and a root is a fractional one, so the bracket moves to the top with the sign of its power turned:` },
    { tex: `${reciprocalTex({ n, b, k })} = ${k === 1 ? '' : k}${bracketPow(b, n)}` },
    { text: 'Nothing inside the bracket changes.' },
  ],
};

/** The first three terms of (1 + bx)^n, with its coefficients given. */
function threeOf(c1: Frac, c2: Frac): string {
  return sumTex(['1', qTermTex(c1, 1), qTermTex(c2, 2)]);
}

/**
 * The estimate set up a fork at a time: the power, the x, and the three
 * terms. The wrong turns are the power's sign, bx for x or the sign of x,
 * and the terms with a sign or the r! slipped.
 */
const reciprocalFlow: Generator<EstimateParams> = {
  id: 'bin-reciprocal-flow',
  sample: sampleReciprocal,
  render: (params): Slide => {
    const { n, b, x } = params;
    const base = qDec(baseAt(params));
    const target = targetOf(params);
    const salt = estimateSalt(params);
    const c1 = termCoef(n, [b, 1], 1);
    const c2 = termCoef(n, [b, 1], 2);
    const bx = qMul([b, 1], x);
    const right = threeOf(c1, c2);
    const powers = [
      { label: `$${base}^{${nPow(n)}}$`, to: 'x' },
      { label: qSame(n, [-1, 1]) ? `$${base}$` : `$${base}^{${nPow(qNeg(n))}}$`, outcome: `That is $${base}$ to a positive power; one over it takes the power's sign away.` },
      {
        label: `$${base}^{${nPow([n[1] * Math.sign(n[0]), Math.abs(n[0])])}}$`,
        outcome: 'Turn only the sign of the power. The power upside down belongs to a root.',
      },
    ].filter((branch, i, all) => all.findIndex((other) => other.label === branch.label) === i);
    const xs = [
      { label: `$${qDec(x)}$`, to: 'terms' },
      ...(Math.abs(b) === 1 ? [] : [{ label: `$${qDec(bx)}$`, outcome: `That is $${bxTex([b, 1])}$. Divide by $${b}$ to get $x$.` }]),
      { label: `$${qDec(qNeg(x))}$`, outcome: `Check the sign: $${insideOf(1, [b, 1])}$ with that $x$ is not $${base}$.` },
      { label: `$${base}$`, outcome: 'That is the whole bracket. $x$ is only in the part added to the $1$.' },
    ].filter((branch, i, all) => all.findIndex((other) => other.label === branch.label) === i);
    const terms = [
      { label: `$${right}$`, outcome: `Right: $${target} \\approx ${qDec(keptSum(params))}$.` },
      { label: `$${threeOf(qNeg(c1), c2)}$`, outcome: `The $x$ term is $n$ times $${bxTex([b, 1])}$, and $n$ is negative.` },
      { label: `$${threeOf(c1, qMul(c2, [2, 1]))}$`, outcome: 'The $x^2$ coefficient is divided by $2!$.' },
      { label: `$${threeOf(c1, qMul(seriesCoef(n, 2), [b, 1]))}$`, outcome: `The number on $x$ is squared in the $x^2$ term.` },
    ].filter((branch, i) => branch.label !== `$${right}$` || i === 0);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Estimate $${target}$ with the series of $${seriesTex(1, [b, 1], n)}$. Decide one step at a time.` }],
      subject: target,
      steps: [
        { id: 'power', ask: `$${target}$ is which power of $${base}$?`, branches: turned(powers, salt) },
        { id: 'x', ask: `So $${insideOf(1, [b, 1])} = ${base}$. What is $x$?`, branches: turned(xs, salt + 1) },
        {
          id: 'terms',
          ask: `Which three terms start the series of $${seriesTex(1, [b, 1], n)}$?`,
          branches: turned(
            terms.filter((branch, i, all) => all.findIndex((other) => other.label === branch.label) === i),
            salt + 2,
          ),
        },
      ],
      answer: [`$${base}^{${nPow(n)}}$`, `$${qDec(x)}$`, `$${right}$`],
    };
  },
  solution: (params) => estimateWorking(params, targetOf(params)),
};

const reciprocalEstimate = estimateGenerator(
  'bin-reciprocal-estimate',
  sampleReciprocal,
  targetOf,
  () => 'Write one over the power as a negative power:',
);

const reciprocalTermsTree = termsTree('bin-reciprocal-terms-tree', sampleReciprocal);

/* --- taking the number out first --- */

interface OutFirstParams extends EstimateParams {
  /** The number taken out: a square for a square root, a cube for a cube root. */
  a: number;
}

function sampleOutFirst(rng: Rng, difficulty: number): OutFirstParams {
  const hard = difficulty > 1;
  const n: Frac = rng.pick(
    hard
      ? ([
          [1, 2],
          [1, 3],
          [-1, 2],
          [-1, 3],
          [1, 4],
        ] as Frac[])
      : ([
          [1, 2],
          [1, 3],
        ] as Frac[]),
  );
  // One over a root of 9 or 27 is a third, and a third times the estimate never ends.
  const squares = n[0] < 0 ? [4, 16, 25] : [4, 9, 16, 25];
  const a = n[1] === 2 ? rng.pick(squares) : n[1] === 3 ? (n[0] < 0 ? 8 : rng.pick([8, 27])) : 16;
  return { n, b: 1, x: sampleX(rng, n, 9, hard), front: aPow(a, n), a };
}

/** The number whose root is asked: a(1 + x), 4.08 for a = 4 and x = 0.02. */
function outFirstTarget(params: OutFirstParams): string {
  return rootPowerTex(qDec(qMul([params.a, 1], baseAt(params))), params.n);
}

function outFirstWorking(params: OutFirstParams): SolutionStep[] {
  const { a, n, x } = params;
  const number = qDec(qMul([a, 1], baseAt(params)));
  return [
    { text: `Take $${a}$ out: $${number} = ${a} \\times ${qDec(baseAt(params))}$, and $${a}^{${nPow(n)}} = ${qTex(params.front)}$.` },
    { tex: relationTex(params, outFirstTarget(params)) },
    { text: `The bracket left is $(1 + x)^{${nPow(n)}}$ with $x = ${qDec(x)}$, far inside $|x| < 1$, so a few terms are plenty.` },
  ];
}

/**
 * The number out and the x left, placed. The slips are the number not
 * rooted or upside down, x not divided by a, the whole number less 1 for x,
 * and x's sign turned.
 */
const outFirstTiles: Generator<OutFirstParams> = {
  id: 'bin-out-first-tiles',
  sample: sampleOutFirst,
  render: (params): Slide => {
    const { a, n, x, front } = params;
    const xToken = (value: Frac) => (value[0] < 0 ? `- ${qDec(qNeg(value))}` : `+ ${qDec(value)}`);
    const answer = [qTex(front), xToken(x)];
    const slips = [
      `${a}`,
      qTex([front[1], front[0]]),
      xToken(qMul([a, 1], x)),
      xToken(qAdd(qMul([a, 1], baseAt(params)), [-1, 1])),
      xToken(qNeg(x)),
    ];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Take the $${a}$ out of the root, so the bracket left starts with $1$.` },
        { kind: 'display', tex: `${outFirstTarget(params)} =` },
      ],
      template: `{0}(1 {1})^{${nPow(n)}}`,
      bank: tileBank(answer, fewSlips(answer, slips)),
      answer,
    };
  },
  solution: outFirstWorking,
};

/**
 * Which way of writing the root both equals it and has a bracket its series
 * holds for. The wrong ones are the whole number less 1 as x, far outside
 * the range, the number taken out unrooted, and x not divided by it.
 */
const outFirstWhich: Generator<OutFirstParams> = {
  id: 'bin-out-first-which',
  sample: sampleOutFirst,
  render: (params): Slide => {
    const { a, n, x, front } = params;
    const written = (lead: string, value: Frac) => `${lead}(1 ${decSigned(value)})^{${nPow(n)}}`;
    const labels = firstDistinct([
      written(qTex(front), x),
      written('', qAdd(qMul([a, 1], baseAt(params)), [-1, 1])),
      written(`${a}`, x),
      written(qTex(front), qMul([a, 1], x)),
      written(qTex([front[1], front[0]]), x),
    ]);
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: `Which of these equals $${outFirstTarget(params)}$ and has a bracket its series holds for?` }],
      ...nativeChoice(labels, saltOf(...labels)),
    };
  },
  solution: (params) => [
    ...outFirstWorking(params),
    {
      text: `Writing it as $(1 ${decSigned(qAdd(qMul([params.a, 1], baseAt(params)), [-1, 1]))})^{${nPow(params.n)}}$ is equal, but that $x$ is outside $|x| < 1$ and its series does not hold.`,
    },
  ],
};

const outFirstEstimate = estimateGenerator(
  'bin-out-first-estimate',
  sampleOutFirst,
  outFirstTarget,
  ({ a }) => `Take the $${a}$ out first:`,
);

/**
 * The number out, the bracket's three terms at x, then the estimate as their
 * product. The slips are the number not rooted or upside down, the bracket
 * with a slipped term, and the number times two terms only.
 */
const outFirstTree: Generator<OutFirstParams> = {
  id: 'bin-out-first-tree',
  sample: sampleOutFirst,
  render: (params): Slide => {
    const { a, n, x, front } = params;
    const bracket = { ...params, front: ONE };
    const sum = keptSum(bracket);
    const answer = [front, sum, qMul(front, sum)];
    const slips = [
      [a, 1] as Frac,
      [front[1], front[0]] as Frac,
      ...estimateSlips(bracket).slice(0, 2),
      qMul([a, 1], sum),
      qMul(front, keptSum(bracket, 2)),
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `$${outFirstTarget(params)} = ${a}^{${nPow(n)}}(1 + x)^{${nPow(n)}}$ at $x = ${qDec(x)}$. Top row: $${a}^{${nPow(n)}}$, and the first three terms of $(1 + x)^{${nPow(n)}}$ added. Then the estimate.`,
        },
      ],
      expression: outFirstTarget(params),
      nodes: [
        { id: 'front', from: [] },
        { id: 'bracket', from: [] },
        { id: 'estimate', from: ['front', 'bracket'] },
      ],
      bank: decimalBank(answer, slips),
      answer: answer.map(qDec),
    };
  },
  solution: (params) => [...outFirstWorking(params).slice(0, 1), ...estimateWorking(params, outFirstTarget(params))],
};

/* --- how good, and which x --- */

/** n whose first four coefficients end as decimals, for any hundredth x. */
function sampleError(rng: Rng, difficulty: number, top = 9): EstimateParams {
  const hard = difficulty > 1;
  const ns: Frac[] = hard
    ? [
        [1, 4],
        [-1, 4],
        [3, 2],
        [-3, 2],
        [-3, 1],
        [1, 2],
        [-1, 2],
      ]
    : [
        [1, 2],
        [-1, 2],
        [-1, 1],
        [-2, 1],
      ];
  for (;;) {
    const n = rng.pick(ns);
    const params = { n, b: 1, x: sampleX(rng, n, top, hard), front: ONE };
    // A term such as 0.0000000546875 is a typing test, not a question.
    if (placesOf(leftOut(params)) <= 9) return params;
  }
}

function errorPrompt(params: EstimateParams): string {
  return `You estimate $${targetOf(params)}$ from the first three terms of $(1 + x)^{${nPow(params.n)}}$, with $x = ${qDec(params.x)}$.`;
}

/** The x^3 term worked, and why it is about the size of the error. */
function errorWorking(params: EstimateParams): SolutionStep[] {
  const c3 = termCoef(params.n, ONE, 3);
  return [
    { text: 'The estimate stops at $x^2$, so the first term it leaves out is the $x^3$ term.' },
    { tex: `x^{3}: \\enspace ${fallingTexOf(params.n, 3)} = ${qTex(c3)}` },
    { tex: `${qFactor(c3)} \\times ${decFactor(params.x)}^{3} = ${qDec(leftOut(params))}` },
    { text: 'Every term after it carries a higher power of a small number, so the estimate is out by about this much.' },
  ];
}

/**
 * The first term left out, typed. The choice form offers its sign turned, x
 * squared where it is cubed, the 3! left out, and the last term kept.
 */
const errorTerm: Generator<EstimateParams> = {
  id: 'bin-error-term',
  sample: (rng, difficulty) => sampleError(rng, difficulty),
  choices: (params) => {
    const dropped = leftOut(params);
    const c3 = termCoef(params.n, ONE, 3);
    return decimalChoices(
      dropped,
      [qNeg(dropped), qMul(c3, qPow(params.x, 2)), qMul(dropped, [6, 1]), keptTerms(params)[2], qMul(dropped, [10, 1])],
      estimateSalt(params),
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: errorPrompt(params) },
      { kind: 'display', tex: relationTex(params, targetOf(params)) },
      { kind: 'prose', text: 'What is the first term the estimate leaves out, as a decimal?' },
    ],
    lead: '\\text{term} =',
    keypad: [],
    answer: qDec(leftOut(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: errorWorking,
};

/**
 * Whether the first term left out and the true error agree on the places,
 * and sit well clear of the boundaries either side, as level 5's clearCut.
 */
function placesAgree(params: EstimateParams): boolean {
  const error = Math.abs(trueOf(params) - qValue(keptSum(params)));
  const dropped = Math.abs(qValue(leftOut(params)));
  const k = placesFor(error);
  const clear = (size: number) => size < 0.8 * halfUnit(k) && size > 1.25 * halfUnit(k + 1);
  return k >= 2 && placesFor(dropped) === k && clear(error) && clear(dropped);
}

/**
 * How many places the estimate can be trusted to, a fork at a time: the
 * first term left out, the half unit it is under, and the places. The wrong
 * turns are the last term kept, x squared for cubed, and a place either side.
 */
const errorPlacesFlow: Generator<EstimateParams> = {
  id: 'bin-error-places-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleError(rng, difficulty, 12);
      if (placesAgree(params)) return params;
    }
  },
  render: (params): Slide => {
    const dropped = leftOut(params);
    const size = qAbs(dropped);
    const k = placesFor(qValue(size));
    const salt = estimateSalt(params);
    const c3 = termCoef(params.n, ONE, 3);
    const unique = <T extends { label: string }>(branches: T[]) =>
      branches.filter((branch, i, all) => all.findIndex((other) => other.label === branch.label) === i);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${errorPrompt(params)} To how many decimal places can the estimate be trusted? Decide step by step.` }],
      subject: `${targetOf(params)} \\approx ${qDec(keptSum(params))}`,
      steps: [
        {
          id: 'term',
          ask: 'What is the first term the estimate leaves out?',
          branches: turned(
            unique([
              { label: `$${qDec(dropped)}$`, to: 'half' },
              { label: `$${qDec(keptTerms(params)[2])}$`, outcome: 'That is the $x^2$ term, which the estimate keeps. The first one left out is the $x^3$ term.' },
              { label: `$${qDec(qMul(c3, qPow(params.x, 2)))}$`, outcome: 'That has $x$ squared. The $x^3$ term has it cubed.' },
            ]),
            salt,
          ),
        },
        {
          id: 'half',
          ask: `Which is the smallest of these half units that $${qDec(size)}$ is still under?`,
          branches: turned(
            [
              { label: `$${halfUnitTex(k)}$`, to: 'places' },
              { label: `$${halfUnitTex(k + 1)}$`, outcome: `$${qDec(size)}$ is bigger than that.` },
              { label: `$${halfUnitTex(k - 1)}$`, outcome: 'It is under that, but it is under a smaller one too.' },
            ],
            salt + 1,
          ),
        },
        {
          id: 'places',
          ask: 'So the estimate can be trusted to how many decimal places?',
          branches: turned(
            [
              { label: `$${k}$`, outcome: `Right: half a unit in place $${k}$ is $${halfUnitTex(k)}$, and the error is smaller.` },
              { label: `$${k + 1}$`, outcome: `The error is bigger than $${halfUnitTex(k + 1)}$, half a unit in place $${k + 1}$.` },
              { label: `$${k - 1}$`, outcome: `It is good to $${k - 1}$ place${k - 1 === 1 ? '' : 's'}, but to one more as well.` },
            ],
            salt + 2,
          ),
        },
      ],
      answer: [`$${qDec(dropped)}$`, `$${halfUnitTex(k)}$`, `$${k}$`],
    };
  },
  solution: (params) => {
    const size = Math.abs(qValue(leftOut(params)));
    const k = placesFor(size);
    return [
      ...errorWorking(params),
      { text: `An estimate is good to $k$ places when its error is under half a unit in place $k$. $${qDec(qAbs(leftOut(params)))}$ is under $${halfUnitTex(k)}$ but not under $${halfUnitTex(k + 1)}$, so it is good to $${k}$ places.` },
    ];
  },
};

interface KnownRoot {
  /** √(1 + d/100) = m√k/10. */
  m: number;
  k: number;
  d: number;
}

function squareFree(k: number): boolean {
  for (let p = 2; p * p <= k; p += 1) if (k % (p * p) === 0) return false;
  return true;
}

/** Every √(m²k/100) with the number under the root between 0.5 and 1.5 and k no square: √0.98 = 7√2/10. */
const KNOWN_ROOTS: KnownRoot[] = [];
for (let m = 2; m <= 9; m += 1) {
  for (let k = 2; m * m * k <= 150; k += 1) {
    if (m * m * k >= 50 && m * m * k !== 100 && squareFree(k)) KNOWN_ROOTS.push({ m, k, d: m * m * k - 100 });
  }
}

/** c√k as the learner reads it: \frac{7\sqrt{2}}{10}, \frac{\sqrt{5}}{2}, 2\sqrt{3}. */
function surdTex([p, q]: Frac, k: number): string {
  const top = `${p === 1 ? '' : p}\\sqrt{${k}}`;
  return q === 1 ? top : `\\frac{${top}}{${q}}`;
}

interface KnownWhichParams extends KnownRoot {
  /** What is asked: the root as a surd, the surd from the root, or the best x for this surd. */
  form: 'value' | 'back' | 'x';
}

/** The entries for one surd, nearest 1 first. */
function rootsFor(k: number): KnownRoot[] {
  return KNOWN_ROOTS.filter((root) => root.k === k).sort((p, q) => Math.abs(p.d) - Math.abs(q.d));
}

/**
 * The known number the bracket holds: a root as a surd, the surd back from
 * the root, or which x gives a surd with the smallest error. The slips are
 * m not rooted, the 10 not rooted, m and k swapped, and the factor upside
 * down.
 */
const knownRootWhich: Generator<KnownWhichParams> = {
  id: 'bin-known-root-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const pool = hard ? KNOWN_ROOTS : KNOWN_ROOTS.filter((root) => Math.abs(root.d) <= 30);
    const root = rng.pick(pool);
    const forms: KnownWhichParams['form'][] = hard && rootsFor(root.k).length >= 3 ? ['value', 'back', 'x'] : ['value', 'back'];
    return { ...root, form: rng.pick(forms) };
  },
  render: (params): Slide => {
    const { m, k, d, form } = params;
    const base = qDec(hundredths(100 + d));
    const surd = surdTex(reduced(m, 10), k);
    if (form === 'x') {
      const choices = rootsFor(k).slice(0, 4);
      const labels = choices.map((root) => `x = ${qDec(hundredths(root.d))}`);
      return {
        kind: 'choice',
        prompt: [
          {
            kind: 'prose',
            text: `Each of these $x$ makes $(1 + x)^{1/2}$ a multiple of $\\sqrt{${k}}$. Which gives the best estimate of $\\sqrt{${k}}$ from three terms of its series?`,
          },
        ],
        ...nativeChoice(labels, saltOf(...labels)),
      };
    }
    const labels =
      form === 'value'
        ? firstDistinct([
            surd,
            surdTex(reduced(m * m, 10), k),
            surdTex(reduced(m, 100), k),
            ...(squareFree(m) ? [surdTex(reduced(k, 10), m)] : []),
            surdTex([m, 1], k),
          ])
        : firstDistinct([
            `${qTex(reduced(10, m))}\\sqrt{${base}}`,
            `${qTex(reduced(m, 10))}\\sqrt{${base}}`,
            `${qTex(reduced(10, m * m))}\\sqrt{${base}}`,
            `${qTex(reduced(100, m))}\\sqrt{${base}}`,
          ]);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: form === 'value' ? `Which of these is $\\sqrt{${base}}$?` : `$\\sqrt{${base}} = ${surd}$. Which of these is $\\sqrt{${k}}$?`,
        },
      ],
      ...nativeChoice(labels, saltOf(...labels)),
    };
  },
  solution: ({ m, k, d, form }) => {
    const base = qDec(hundredths(100 + d));
    const surd = surdTex(reduced(m, 10), k);
    const steps: SolutionStep[] = [
      { tex: `\\sqrt{${base}} = \\frac{\\sqrt{${m * m * k}}}{\\sqrt{100}} = \\frac{${m}\\sqrt{${k}}}{10}${surd === `\\frac{${m}\\sqrt{${k}}}{10}` ? '' : ` = ${surd}`}` },
    ];
    if (form === 'back') steps.push({ tex: `\\sqrt{${k}} = ${qTex(reduced(10, m))}\\sqrt{${base}}` });
    if (form === 'x') {
      const best = rootsFor(k)[0];
      steps.push({
        text: `Each term of the series carries a power of $x$, so the smaller $|x|$ is, the faster the terms shrink. The smallest here is $x = ${qDec(hundredths(best.d))}$.`,
      });
    }
    return steps;
  },
};

interface KnownEstimateParams extends EstimateParams {
  root: KnownRoot;
  /** The surd asked is √(s²k) = s√k. */
  s: number;
  places: number;
}

/** The surd estimated, √(s²k) or one over it. */
function knownTarget({ root, s, n }: KnownEstimateParams): string {
  const inner = `\\sqrt{${s * s * root.k}}`;
  return n[0] < 0 ? `\\frac{1}{${inner}}` : inner;
}

/** How the known root gives the surd, before the relation itself. */
function knownLead({ root, s }: KnownEstimateParams): string {
  const base = qDec(hundredths(100 + root.d));
  const again = s > 1 ? `, and $\\sqrt{${s * s * root.k}} = ${s}\\sqrt{${root.k}}$` : '';
  return `$\\sqrt{${base}} = ${surdTex(reduced(root.m, 10), root.k)}$${again}, so`;
}

/** Roots near 1 whose x is at most 0.12 in size, where three terms give five or six places. */
const NEAR_ROOTS = KNOWN_ROOTS.filter((root) => Math.abs(root.d) <= 12);

function sampleKnown(rng: Rng, difficulty: number): KnownEstimateParams {
  const hard = difficulty > 1;
  for (;;) {
    const root = rng.pick(NEAR_ROOTS);
    const s = hard ? rng.int(1, 3) : rng.pick([1, 2, 3, 4, 5, 10]);
    const n: Frac = hard && rng.chance(0.5) ? [-1, 2] : [1, 2];
    const ratio = reduced(10 * s, root.m);
    const params: KnownEstimateParams = { n, b: 1, x: hundredths(root.d), front: n[0] < 0 ? [ratio[1], ratio[0]] : ratio, root, s, places: 0 };
    const estimate = keptSum(params);
    const exact = trueOf(params);
    // The most places the error allows, stepping down until the estimate and
    // the true surd round alike with neither on a rounding boundary.
    for (let places = Math.min(placesFor(Math.abs(exact - qValue(estimate))), 6); places >= 3; places -= 1) {
      const scaled = exact * 10 ** places;
      if (clearance(estimate, places) < 0.03 || Math.abs((scaled % 1) - 0.5) < 0.03) continue;
      if (qRound(estimate, places) === (Math.round(scaled) / 10 ** places).toFixed(places)) return { ...params, places };
    }
  }
}

/**
 * A surd from a known root, typed to the places the error allows. The choice
 * form offers two terms only, the x^2 term's sign turned, and a unit either
 * side in the last place.
 */
const knownRootEstimate: Generator<KnownEstimateParams> = {
  id: 'bin-known-root-estimate',
  sample: sampleKnown,
  choices: (params) => decimalChoices(keptSum(params), estimateSlips(params).slice(0, 2), estimateSalt(params), params.places),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: knownLead(params) },
      { kind: 'display', tex: relationTex(params, knownTarget(params)) },
      {
        kind: 'prose',
        text: `with $x = ${qDec(params.x)}$. Use the first three terms of the series to estimate $${knownTarget(params)}$, correct to $${params.places}$ decimal places.`,
      },
    ],
    lead: '\\text{estimate} =',
    keypad: [],
    answer: qRound(keptSum(params), params.places),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => estimateWorking(params, knownTarget(params), params.places),
};

/* --- the series of a partial-fraction split --- */

interface SplitParams {
  /** f(x) = A/(1 + ux) + B/(1 + vx). */
  A: number;
  B: number;
  u: number;
  v: number;
  /** The power asked about. */
  r: number;
}

/** The coefficient of x^r: A(-u)^r + B(-v)^r, each part a geometric series. */
function splitCoef({ A, B, u, v }: SplitParams, r: number): number {
  return A * (-u) ** r + B * (-v) ** r;
}

function sampleSplit(rng: Rng, difficulty: number, fits: (params: SplitParams) => boolean = () => true): SplitParams {
  const hard = difficulty > 1;
  for (;;) {
    const size = hard ? 5 : 4;
    const A = (hard ? rng.sign() : 1) * rng.int(1, size);
    const B = (hard ? rng.sign() : 1) * rng.int(1, size);
    const u = rng.sign() * rng.int(1, hard ? 4 : 3);
    const v = rng.sign() * rng.int(1, hard ? 4 : 3);
    const params = { A, B, u, v, r: hard ? rng.int(2, 3) : 2 };
    if (Math.abs(u) !== Math.abs(v) && A + B !== 0 && fits(params)) return params;
  }
}

/** A/(1 + ux) as a term of the split: the sign out in front. */
function partTex(c: number, u: number, first: boolean): string {
  const body = `\\frac{${Math.abs(c)}}{${insideOf(1, [u, 1])}}`;
  if (c < 0) return first ? `-${body}` : ` - ${body}`;
  return first ? body : ` + ${body}`;
}

function splitTex({ A, B, u, v }: SplitParams): string {
  return `${partTex(A, u, true)}${partTex(B, v, false)}`;
}

/** f(x) as one fraction, then split. */
function fractionTex(params: SplitParams): string {
  const { A, B, u, v } = params;
  const top = sumTex([`${A + B}`, termTex(A * v + B * u, 1)]);
  return chain(`f(x) &= \\frac{${top}}{(${insideOf(1, [u, 1])})(${insideOf(1, [v, 1])})}`, `&= ${splitTex(params)}`);
}

function splitWorking(params: SplitParams, rs: number[]): SolutionStep[] {
  const { A, B, u, v } = params;
  const part = (c: number, w: number) => `${c === 1 ? '' : c === -1 ? '-' : c}${seriesTex(1, [w, 1], [-1, 1])}`;
  const power = (w: number, r: number) => (r === 1 ? baseTex(-w) : `${baseTex(-w)}^{${r}}`);
  return [
    { text: 'Each part is a number times $(1 + wx)^{-1}$, whose series is $1 - wx + w^2x^2 - \\dots$: the coefficient of $x^r$ is $(-w)^r$.' },
    { tex: `${partTex(A, u, true)} = ${part(A, u)}` },
    { tex: `${partTex(B, v, true)} = ${part(B, v)}` },
    // One product a line: side by side they run off a phone.
    ...rs.map((r) => ({
      tex: chain(
        `& ${r === 1 ? 'x' : `x^{${r}}`}: \\enspace ${A} \\times ${power(u, r)}`,
        `&\\quad + ${baseTex(B)} \\times ${power(v, r)}`,
        `&= ${splitCoef(params, r)}`,
      ),
    })),
  ];
}

/**
 * The coefficient of x^r in each part, then the two added. The slips are
 * each part with -u taken as u, and each part on its own.
 */
const splitPartsTree: Generator<SplitParams> = {
  id: 'bin-pf-parts-tree',
  sample: (rng, difficulty) => sampleSplit(rng, difficulty),
  render: (params): Slide => {
    const { A, B, u, v, r } = params;
    const first = A * (-u) ** r;
    const second = B * (-v) ** r;
    const answer = [first, second, first + second].map(String);
    const slips = [A * u ** r, B * v ** r, A * u ** r + B * v ** r, first - second, A * u * r, B * v * r].map(String);
    return {
      kind: 'tree',
      prompt: [
        { kind: 'display', tex: fractionTex(params) },
        {
          kind: 'prose',
          text: `Find the coefficient of $x^{${r}}$ in the series of $f(x)$. Top row: its coefficient in each part. Then the two added.`,
        },
      ],
      expression: splitTex(params),
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'sum', from: ['first', 'second'] },
      ],
      bank: treeBank(answer, slips),
      answer,
    };
  },
  solution: (params) => splitWorking(params, [params.r]),
};

/** Whether the first three coefficients can be placed as tiles: none 0 or ±1 past the first. */
function splitTidy(params: SplitParams): boolean {
  return [1, 2].every((r) => Math.abs(splitCoef(params, r)) > 1) && Math.abs(splitCoef(params, 2)) < 200;
}

/**
 * The first three terms of the series of f(x), placed. The slips are the
 * signs of u and v taken as they stand, one part on its own, and the
 * coefficients doubled.
 */
const splitTiles: Generator<SplitParams> = {
  id: 'bin-pf-tiles',
  sample: (rng, difficulty) => sampleSplit(rng, difficulty, splitTidy),
  render: (params): Slide => {
    const { A, B, u, v } = params;
    const answer = [0, 1, 2].map((r) => signedToken(splitCoef(params, r), r === 0));
    const slips = [0, 1, 2].flatMap((r) =>
      [A * u ** r + B * v ** r, A * (-u) ** r, B * (-v) ** r, -splitCoef(params, r)]
        .filter((value) => value !== 0)
        .map((value) => signedToken(value, r === 0)),
    );
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'display', tex: fractionTex(params) },
        { kind: 'prose', text: 'Expand $f(x)$ as far as the $x^2$ term, each part with the series of $(1 + wx)^{-1}$.' },
      ],
      template: 'f(x) = {0} {1}x {2}x^2 + \\dots',
      bank: tileBank(answer, fewSlips(answer, slips, 5)),
      answer,
    };
  },
  solution: (params) => [
    ...splitWorking(params, [1, 2]),
    { tex: `f(x) = ${sumTex([`${splitCoef(params, 0)}`, termTex(splitCoef(params, 1), 1), termTex(splitCoef(params, 2), 2)])} + \\dots` },
  ],
};

/**
 * The coefficient of x^r, typed. The choice form offers the signs of u and
 * v taken as they stand, one part forgotten, and the parts subtracted.
 */
const splitCoefGen: Generator<SplitParams> = {
  id: 'bin-pf-coef',
  sample: (rng, difficulty) => sampleSplit(rng, difficulty),
  choices: (params) => {
    const { A, B, u, v, r } = params;
    const c = splitCoef(params, r);
    return aimedNumbers(c, [A * u ** r + B * v ** r, A * (-u) ** r, B * (-v) ** r, A * (-u) ** r - B * (-v) ** r], spread(A, B, u, v, r));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'display', tex: fractionTex(params) },
      { kind: 'prose', text: `What is the coefficient of $x^{${params.r}}$ in the series of $f(x)$?` },
    ],
    lead: '\\text{coefficient} =',
    keypad: [],
    answer: `${splitCoef(params, params.r)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => splitWorking(params, [params.r]),
};

/**
 * The range the series of f(x) holds for: the smaller of the two parts'
 * ranges. The slips are the larger one, 1 as for (1 + x), and the product
 * and sum of the numbers on x.
 */
const splitRange: Generator<SplitParams> = {
  id: 'bin-pf-range',
  sample: (rng, difficulty) => sampleSplit(rng, difficulty),
  render: (params): Slide => {
    const { u, v } = params;
    const big = Math.max(Math.abs(u), Math.abs(v));
    const small = Math.min(Math.abs(u), Math.abs(v));
    const range = (bound: Frac) => `|x| < ${qTex(bound)}`;
    const labels = firstDistinct([
      range([1, big]),
      range([1, small]),
      range(ONE),
      range([1, big * small]),
      range([1, big + small]),
      range([big, 1]),
      range([small + big, 1]),
    ]);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'display', tex: fractionTex(params) },
        { kind: 'prose', text: 'For which $x$ does the series of $f(x)$ hold?' },
      ],
      ...nativeChoice(labels, saltOf(...labels)),
    };
  },
  solution: ({ A, B, u, v }) => {
    const big = Math.max(Math.abs(u), Math.abs(v));
    return [
      { text: `The series of $${partTex(A, u, true)}$ holds for $|x| < ${qTex([1, Math.abs(u)])}$, and of $${partTex(B, v, true)}$ for $|x| < ${qTex([1, Math.abs(v)])}$.` },
      { text: `The series of $f(x)$ needs both, so it holds for the smaller range: $|x| < ${qTex([1, big])}$.` },
    ];
  },
};

/**
 * A worked line too wide for a phone, broken at its equals signs into an
 * aligned column. Lines already aligned, or with no equals sign at the top
 * level, are left alone: a solution that scrolls sideways hides its result.
 */
function fitLine(tex: string): string {
  if (texWidth(tex) <= LINE || tex.includes('\\begin')) return tex;
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tex.length; i += 1) {
    if (tex[i] === '{') depth += 1;
    if (tex[i] === '}') depth -= 1;
    if (depth === 0 && tex.startsWith(' = ', i)) {
      parts.push(tex.slice(start, i));
      start = i + 3;
    }
  }
  parts.push(tex.slice(start));
  if (parts.length < 2) return tex;
  return chain(`& ${parts[0]}`, ...parts.slice(1).map((part) => `&= ${part}`));
}

function fitted<P>(generator: Generator<P>): Generator<P> {
  return {
    ...generator,
    solution: (params) =>
      generator.solution(params).map((step) => (step.tex ? { ...step, tex: fitLine(step.tex) } : step)),
  };
}

export const binomialGenerators = [
  fitted(pascalTree),
  fitted(pascalRowTiles),
  fitted(rowFacts),
  fitted(pascalError),
  fitted(oneXTiles),
  fitted(oneXCoeff),
  fitted(signFlow),
  fitted(termTiles),
  fitted(expandTiles),
  fitted(termReduce),
  fitted(coeff),
  fitted(splitTree),
  fitted(pickTerm),
  fitted(findK),
  fitted(factorialGen),
  fitted(ncrReduce),
  fitted(ncrRowTiles),
  fitted(ncrFacts),
  fitted(whichRFlow),
  fitted(generalTiles),
  fitted(generalReduce),
  fitted(coeffNcr),
  fitted(freeTerm),
  fitted(findN),
  fitted(approxTiles),
  fitted(approx),
  fitted(threeTermsSteps),
  fitted(approxX),
  fitted(productCoeff),
  fitted(twoBracketTree),
  fitted(pairFlow),
  fitted(productExpandTiles),
  fitted(twoUnknownsFlow),
  fitted(twoUnknownsTree),
  fitted(twoUnknowns),
  fitted(nextCoeffSteps),
  fitted(equalTiles),
  fitted(equalCoeff),
  fitted(equalFlow),
  fitted(equalWhich),
  fitted(ratioReduce),
  fitted(ratioNSteps),
  fitted(ratioCoeff),
  fitted(ratioTiles),
  fitted(sumTree),
  fitted(sumCoeff),
  fitted(sumWhich),
  fitted(sumSlider),
  fitted(frontA),
  fitted(frontSign),
  fitted(frontFlow),
  fitted(frontTiles),
  fitted(twoExpFlow),
  fitted(twoExpTree),
  fitted(twoExpCoeff),
  fitted(twoExpTiles),
  fitted(firstThreeTiles),
  fitted(firstThreeSteps),
  fitted(firstThreeReduce),
  fitted(firstThreeWhich),
  fitted(collapseWhich),
  fitted(collapseCoeff),
  fitted(collapseFlow),
  fitted(collapseTiles),
  fitted(trinomialTree),
  fitted(trinomialWorkSteps),
  fitted(trinomialCoeff),
  fitted(trinomialWhich),
  fitted(identityTiles),
  fitted(identitySum),
  fitted(findACoeff),
  fitted(findAFlow),
  fitted(findATree),
  fitted(droppedTermGen),
  fitted(keptSumTree),
  fitted(safePlaces),
  fitted(enoughFlow),
  fitted(nearSetup),
  fitted(nearTiles),
  fitted(nearSubstituteSteps),
  fitted(nearEstimate),
  fitted(surdTiles),
  fitted(surdPowersTree),
  fitted(surdPart),
  fitted(surdGatherSteps),
  fitted(conjWhich),
  fitted(conjTiles),
  fitted(conjValue),
  fitted(conjFlow),
  fitted(mixedTiles),
  fitted(mixedTermsTree),
  fitted(mixedPart),
  fitted(unitSteps),
  fitted(seriesFactorsTiles),
  fitted(seriesCoefTree),
  fitted(seriesStops),
  fitted(seriesCoefSteps),
  fitted(negativeTiles),
  fitted(negativeCoef),
  fitted(negativeSignsFlow),
  fitted(negativeTree),
  fitted(fractionTermSteps),
  fitted(fractionTiles),
  fitted(fractionCoef),
  fitted(fractionWhich),
  fitted(validBound),
  fitted(validWhichX),
  fitted(validSlider),
  fitted(validFlow),
  fitted(frontCoefSteps),
  fitted(frontSeriesTiles),
  fitted(frontTree),
  fitted(frontRange),
  fitted(rootSetup),
  fitted(rootTermsTree),
  fitted(rootEstimate),
  fitted(rootSubstituteSteps),
  fitted(reciprocalRewrite),
  fitted(reciprocalFlow),
  fitted(reciprocalEstimate),
  fitted(reciprocalTermsTree),
  fitted(outFirstTiles),
  fitted(outFirstWhich),
  fitted(outFirstEstimate),
  fitted(outFirstTree),
  fitted(errorTerm),
  fitted(errorPlacesFlow),
  fitted(knownRootWhich),
  fitted(knownRootEstimate),
  fitted(splitPartsTree),
  fitted(splitTiles),
  fitted(splitCoefGen),
  fitted(splitRange),
];
