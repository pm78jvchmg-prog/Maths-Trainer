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
 * coefficients from x = 1 and x = -1.
 *
 * Every question here has a whole-number n of at most 8 in an expansion (nCr
 * on its own goes to 12), so every coefficient, bank and option is exact. The
 * binomial series for negative and fractional n is a later level.
 *
 * Expansions are asked through tiles or one coefficient at a time, never as a
 * typed expansion: the checker compares values, so a typed `(1 + x)^4` would
 * pass as its own expansion (PITFALLS 3.4).
 */
import type { Rng } from '../../engine/rng';
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import { bin, num, pow, valueOf, type Expr } from '../expr';
import { ALGEBRA_KEYS, sumTex, termAnswer, termTex } from './calculus';
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

/** A term's coefficient as a tile: bare for the first term, signed after it. */
function signedToken(coef: number, first: boolean): string {
  if (first) return `${coef}`;
  return coef < 0 ? `- ${-coef}` : `+ ${coef}`;
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

function gcd(x: number, y: number): number {
  return y === 0 ? Math.abs(x) : gcd(y, x % y);
}

/** p/q in lowest terms, the sign carried on top. */
function reduced(p: number, q: number): [number, number] {
  const g = gcd(p, q) || 1;
  const sign = q < 0 ? -1 : 1;
  return [(sign * p) / g, (sign * q) / g];
}

/** A fraction as the learner reads it: whole when it is whole, the sign out in front. */
function fracTex(p: number, q: number): string {
  const [top, bottom] = reduced(p, q);
  if (bottom === 1) return `${top}`;
  return top < 0 ? `-\\frac{${-top}}{${bottom}}` : `\\frac{${top}}{${bottom}}`;
}

/** The same fraction for mathjs. */
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
    { tex: `${left}${kPowTex(r)} = ${right}${kPowTex(r + 1)}` },
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
    const condition = `$${left}${kPowTex(r)} = ${right}${kPowTex(r + 1)}$`;
    const swapped = `$${left}${kPowTex(r + 1)} = ${right}${kPowTex(r)}$`;
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
              { label: solved, outcome: `Right: $${right}k = ${left}$, so ${solved}.` },
              { label: flipped, outcome: `Upside down: $${right}k = ${left}$, so $k$ is $${left}$ over $${right}$.` },
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
    const labels = alt ? [power(a - k), power(a + k), separate, `-${power(a + k)}`] : [power(a + k), `2^{${n}}`, separate, power(a - k)];
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
];
