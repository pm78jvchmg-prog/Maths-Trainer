/**
 * Sequences & Series, level 8: harder sums of powers.
 *
 * Builds on the three standard results of level 4 (sums of r, r^2 and r^3)
 * without induction or the method of differences. Lesson 1 sums products of
 * consecutive numbers by multiplying out and splitting; lesson 2 writes such
 * a sum as one factorised expression in n; lesson 3 adds up only the even or
 * only the odd terms; lesson 4 runs a sum backwards to find n; lesson 5 pairs
 * the terms of an alternating sum.
 *
 * Every value a learner places or types is whole. A sum is always evaluated
 * from its own terms (`addUp`) rather than from a formula, so a slip in a
 * formula here fails the sweep instead of reaching a learner. Questions that
 * ask for n are built backwards from n, so the total is always reachable,
 * and a ratio question only draws the k that give a whole n. A factorised
 * form is held as a unit fraction and a bracket whose whole numbers share no
 * factor, so there is exactly one right way to place its tiles; every
 * distractor bracket differs from it in one coefficient with the same leading
 * term, so no wrong pair of tiles can come to the same thing.
 */
import type { Rng } from '../../engine/rng';
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { coeffTex, gcd } from './format';
import { orderBank } from './proofOrder';

/* ---------- shared ---------- */

type Power = 1 | 2 | 3;

/** Σr, Σr² or Σr³ from r = 1 to n, by the standard result. */
function powerSum(k: Power, n: number): number {
  if (k === 1) return (n * (n + 1)) / 2;
  if (k === 2) return (n * (n + 1) * (2 * n + 1)) / 6;
  return ((n * (n + 1)) / 2) ** 2;
}


/** The standard result with a number in place of n, before it is worked out. */
function resultAt(k: Power, n: number): string {
  if (k === 1) return `\\frac{1}{2} \\times ${n} \\times ${n + 1}`;
  if (k === 2) return `\\frac{1}{6} \\times ${n} \\times ${n + 1} \\times ${2 * n + 1}`;
  return `\\frac{1}{4} \\times ${n}^2 \\times ${n + 1}^2`;
}

/** `+ 4` or `- 4`, for a term written after another. */
function signed(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** `+4` or `-4` as a tile. */
function token(value: number): string {
  return value < 0 ? `${value}` : `+${value}`;
}

/** `+3n`, `-n`: a multiple of n as a tile. */
function perN(value: number): string {
  return `${value < 0 ? '-' : '+'}${coeffTex(Math.abs(value), 'n')}`;
}

/** `+ 3body`, `- body`: a signed term, its coefficient left off when it is 1. */
function signedTerm(c: number, body: string): string {
  const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
  return `${c < 0 ? '-' : '+'} ${size}${body}`;
}

/** A polynomial, highest power first, in the letter v: `3n^2 + 7n + 2`. No braces, so it is safe in tiles. */
function poly(coefs: number[], v = 'n'): string {
  const deg = coefs.length - 1;
  const terms = coefs
    .map((c, i) => {
      const p = deg - i;
      if (c === 0) return '';
      if (p === 0) return `${c}`;
      const body = p === 1 ? v : `${v}^${p}`;
      return c === 1 ? body : c === -1 ? `-${body}` : `${c}${body}`;
    })
    .filter((t) => t !== '');
  if (terms.length === 0) return '0';
  return terms.map((t, i) => (i === 0 ? t : t.startsWith('-') ? ` - ${t.slice(1)}` : ` + ${t}`)).join('');
}

/** A polynomial's value at x, coefficients highest power first. */
function polyAt(coefs: number[], x: number): number {
  return coefs.reduce((acc, c) => acc * x + c, 0);
}

/** Terms joined with their own signs: a term starting `-` is taken away. */
function joined(terms: string[]): string {
  return terms
    .filter((t) => t !== '')
    .map((t, i) => (i === 0 ? t : t.startsWith('-') ? ` - ${t.slice(1)}` : ` + ${t}`))
    .join('');
}

/** One factor of a product: `r` for a shift of 0, `(r + 2)` otherwise. */
function factorTex(shift: number): string {
  return shift === 0 ? 'r' : `(r ${signed(shift)})`;
}

/** A product of consecutive-style factors, shifts in increasing order. */
function productTex(shifts: number[]): string {
  const sorted = [...shifts].sort((a, b) => a - b);
  return sorted
    .filter((s, i) => sorted[i - 1] !== s)
    .map((s) => {
      const times = sorted.filter((t) => t === s).length;
      return times === 1 ? factorTex(s) : `${shift0(s)}^${times}`;
    })
    .join('');
}

/** A factor in brackets even when it is plain r, for raising to a power. */
function shift0(shift: number): string {
  return shift === 0 ? 'r' : `(r ${signed(shift)})`;
}

/** The coefficients, highest power first, of the product of (r + s) over the shifts. */
function expand(shifts: number[]): number[] {
  let coefs = [1];
  for (const s of shifts) {
    const next = new Array(coefs.length + 1).fill(0);
    coefs.forEach((c, i) => {
      next[i] += c;
      next[i + 1] += c * s;
    });
    coefs = next;
  }
  return coefs;
}

/** Four coefficients [r^3, r^2, r, 1], padding a lower-degree polynomial. */
function cubic(coefs: number[]): [number, number, number, number] {
  const padded = [...new Array(Math.max(0, 4 - coefs.length)).fill(0), ...coefs];
  return [padded[0], padded[1], padded[2], padded[3]];
}

/** A coefficient on a named sum: `\sum r^2`, `3\sum r^2`, `-\sum r`, or 0. */
function onSum(c: number, body: string): string {
  if (c === 0) return '';
  if (c === 1) return body;
  if (c === -1) return `-${body}`;
  return `${c}${body}`;
}

/** Σ of a polynomial in r, split into the standard results: `\sum r^3 + 3\sum r^2 + 2\sum r + 6n`. */
function splitSigma(coefs: number[]): string {
  const [c3, c2, c1, c0] = cubic(coefs);
  return joined([onSum(c3, '\\sum r^3'), onSum(c2, '\\sum r^2'), onSum(c1, '\\sum r'), c0 === 0 ? '' : coeffTex(c0, 'n')]);
}

/**
 * A sum over its split into standard results, the split on a row of its own.
 * Four terms with two-figure coefficients run past a 393 px phone on one
 * row, so a split of four terms breaks after its second.
 */
function splitDisplay(head: string, split: string): string {
  const terms = split.split(/ (?=[+-] )/);
  if (terms.length < 4) return `\\begin{gathered} ${head} \\\\ = ${split} \\end{gathered}`;
  return `\\begin{aligned} &${head} \\\\ &= ${terms.slice(0, 2).join(' ')} \\\\ &\\quad ${terms.slice(2).join(' ')} \\end{aligned}`;
}

/** The same split with the values in: `225 + 3 \times 55 + 2 \times 15`. */
function splitNumbers(coefs: number[], n: number): string {
  const [c3, c2, c1, c0] = cubic(coefs);
  const part = (c: number, value: number) => {
    if (c === 0) return '';
    if (c === 1) return `${value}`;
    if (c === -1) return `-${value}`;
    return `${c < 0 ? '-' : ''}${Math.abs(c)} \\times ${value}`;
  };
  return joined([part(c3, powerSum(3, n)), part(c2, powerSum(2, n)), part(c1, powerSum(1, n)), c0 === 0 ? '' : `${c0 * n}`]);
}

/** The standard results a polynomial's sum uses, each worked out at n. */
function resultLines(coefs: number[], n: number): string {
  const [c3, c2, c1] = cubic(coefs);
  const lines: string[] = [];
  ([[c3, 3], [c2, 2], [c1, 1]] as [number, Power][]).forEach(([c, k]) => {
    if (c !== 0) lines.push(`\\sum ${k === 1 ? 'r' : `r^${k}`} &= ${resultAt(k, n)}`, `&= ${powerSum(k, n)}`);
  });
  return chain(...lines);
}

/** A sum of f(r) from lo to hi, added up term by term. */
function addUp(f: (r: number) => number, lo: number, hi: number): number {
  let total = 0;
  for (let r = lo; r <= hi; r += 1) total += f(r);
  return total;
}

/** `\sum_{r=lo}^{hi}` with either end a number or a letter. */
function sumFrom(lo: number | string, hi: number | string): string {
  return `\\sum_{r=${lo}}^{${hi}}`;
}

/** Stacked lines of working, aligned. */
function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** A stable number from a question's own values, for turning options. Never the rng. */
function mix(...values: (number | string | boolean)[]): number {
  let hash = 7;
  for (const value of values) {
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function turned<T>(items: T[], turn: number): T[] {
  const at = turn % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/** The correct number and three wrong ones: the slips first, then near misses. */
function numberOptions(correct: number, slips: number[]): ChoiceOption[] {
  const out: ChoiceOption[] = [{ tex: `${correct}`, answer: `${correct}`, correct: true }];
  const seen = new Set([correct]);
  for (const value of [...slips, correct + 1, correct - 1, correct + 2, correct - 2, correct + 3]) {
    if (out.length === 4) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    out.push({ tex: `${value}`, answer: `${value}` });
  }
  return out;
}

/**
 * A bank of whole numbers for a table or a tree: every answer (repeats kept),
 * then up to four distinct distractors, the likeliest slips first, topped up
 * with near misses so at least two remain. Sorted, never shuffled.
 */
function numberBank(answer: number[], slips: number[], most = 4): string[] {
  const extras: number[] = [];
  for (const value of slips) {
    if (extras.length >= most) break;
    if (!Number.isInteger(value) || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  for (let step = 1; extras.length < 2; step += 1) {
    for (const value of [answer[answer.length - 1] + step, answer[0] - step]) {
      if (extras.length < 2 && !answer.includes(value) && !extras.includes(value)) extras.push(value);
    }
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

const NUMBER = /^-?\d+$/;

/** A tiles bank: every answer token (repeats kept) plus the distinct distractors, sorted. */
function tileBank(answer: string[], distractors: string[], most = 4): string[] {
  const look = (text: string) => text.replace(/\s+/g, '');
  const seen = new Set(answer.map(look));
  const extras = distractors.filter((text) => !seen.has(look(text)) && seen.add(look(text))).slice(0, most);
  const all = [...answer, ...extras];
  if (all.every((t) => NUMBER.test(t))) return all.sort((x, y) => Number(x) - Number(y));
  return all.sort();
}

/** `count` distinct positions from `lo` to `hi`, in order. */
function positions(rng: Rng, lo: number, hi: number, count: number): number[] {
  const all = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return rng.sample(all, count).sort((x, y) => x - y);
}

/** Times and brackets, so a learner can type the working and let the checker add it up. */
const ARITHMETIC_KEYS: KeypadKey[] = [{ insert: '*', label: '×' }, { insert: '(' }, { insert: ')' }];

/** A number typed on the keypad, with a lead naming what it is. */
function typed(prompt: Block[], lead: string, answer: number): Slide {
  return {
    kind: 'expression',
    prompt,
    lead,
    keypad: ARITHMETIC_KEYS,
    answer: `${answer}`,
    domain: 'real',
    mode: 'exact',
  };
}

/**
 * A claim such as `Show that $X = Y$.` as a lead-in and a display, broken
 * before its `=` when long, so a factorised result does not wrap mid-bracket
 * on a phone.
 */
function claimBlocks(claim: string): Block[] {
  const found = /^(.*?)\s*\$([^$]+)\$\.?$/.exec(claim);
  if (!found) return [{ kind: 'prose', text: claim }];
  const [, lead, tex] = found;
  const at = tex.indexOf(' = ');
  const display = at > 0 && tex.length > 40 ? `\\begin{aligned} &${tex.slice(0, at)} \\\\ &= ${tex.slice(at + 3)} \\end{aligned}` : tex;
  return [
    { kind: 'prose', text: lead },
    { kind: 'display', tex: display },
  ];
}

/** An order slide for a line of working: the right lines, then the ones that do not belong. */
function orderWorking(claim: string, lines: string[], distractors: string[]): Slide {
  const { steps, answer } = orderBank(lines, distractors);
  return {
    kind: 'order',
    prompt: [
      ...claimBlocks(claim),
      {
        kind: 'prose',
        text: `Tap the lines of the working in order. ${distractors.length === 1 ? 'One line in the bank does not belong.' : 'Two lines in the bank do not belong.'}`,
      },
    ],
    steps,
    answer,
  };
}

interface Working {
  claim: string;
  lines: string[];
  pool: { text: string; why: string }[];
}

function orderSolution(work: Working, picks: number[]): SolutionStep[] {
  return [
    { text: 'Each line follows from the one before:' },
    ...work.lines.map((text, i) => ({ text: `${i + 1}. ${text}` })),
    // The line and the reason as two steps, without quotation marks: an
    // equation in the line is lifted onto a row of its own, which would
    // strand a closing quote and run the reason on from the equation.
    ...picks.flatMap((i) => [{ text: `Not part of it: ${work.pool[i].text}` }, { text: work.pool[i].why }]),
  ];
}

/* ---------- Lesson 1: products of consecutive numbers ---------- */

/** Draw `count` shifts, sorted, from a list, until `ok` holds. */
function drawShifts(rng: Rng, from: number[], count: number, ok: (shifts: number[]) => boolean): number[] {
  for (;;) {
    const shifts = Array.from({ length: count }, () => rng.pick(from)).sort((a, b) => a - b);
    if (ok(shifts)) return shifts;
  }
}

/** The multiplying out, one bracket at a time, for the worked solution. */
function expandWorking(shifts: number[]): SolutionStep[] {
  const sorted = [...shifts].sort((a, b) => a - b);
  const nonZero = sorted.filter((s) => s !== 0);
  const full = expand(sorted);
  if (sorted.length === 2) return [{ tex: `${productTex(sorted)} = ${poly(full, 'r')}` }];
  // Two brackets first, then the third (plain r where there is one).
  const [a, b] = nonZero.length >= 2 ? nonZero.slice(0, 2) : sorted.slice(0, 2);
  const rest = [...sorted];
  rest.splice(rest.indexOf(a), 1);
  rest.splice(rest.indexOf(b), 1);
  const pair = expand([a, b]);
  return [
    { text: `First $${factorTex(a)}${factorTex(b)} = ${poly(pair, 'r')}$. Then multiply by $${factorTex(rest[0])}$:` },
    { tex: `${productTex(sorted)} = ${poly(full, 'r')}` },
  ];
}

interface ExpandTilesParams {
  shifts: number[];
}

/**
 * A product of three brackets multiplied out and split into standard results,
 * as tiles. Easier draws have a plain r as one factor, so there is no
 * constant; harder ones have three brackets and a constant added n times.
 */
const expandTiles: Generator<ExpandTilesParams> = {
  id: 'seq-l8-expand-tiles',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      return {
        shifts: drawShifts(rng, [-2, -1, 1, 2, 3, 4], 3, (s) => {
          const [, e1, e2] = expand(s);
          return e1 !== 0 && e2 !== 0;
        }),
      };
    }
    const pair = drawShifts(rng, [-3, -2, -1, 1, 2, 3, 4, 5], 2, ([p, q]) => p + q !== 0);
    return { shifts: [0, ...pair].sort((a, b) => a - b) };
  },
  render: ({ shifts }): Slide => {
    const [, e1, e2, e3] = expand(shifts);
    const constant = e3 !== 0;
    const answer = constant ? [token(e1), token(e2), perN(e3)] : [token(e1), token(e2)];
    const slips = constant
      ? [token(e3), perN(-e3), token(-e1), token(-e2), perN(e2)]
      : [token(-e1), token(-e2), token(e1 + e2), token(e1 + 1)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Multiply out, then split this sum into standard results.' },
        { kind: 'display', tex: `${sumFrom(1, 'n')} ${productTex(shifts)}` },
      ],
      template: constant ? '\\sum r^3 {0}\\sum r^2 {1}\\sum r {2}' : '\\sum r^3 {0}\\sum r^2 {1}\\sum r',
      bank: tileBank(answer, slips, 4),
      answer,
    };
  },
  solution: ({ shifts }) => {
    const coefs = expand(shifts);
    return [
      ...expandWorking(shifts),
      ...(coefs[3] !== 0 ? [{ text: `The constant $${coefs[3]}$ is added once for each of the $n$ terms, so it gives $${coeffTex(coefs[3], 'n')}$.` }] : []),
      { tex: splitDisplay(`${sumFrom(1, 'n')} ${productTex(shifts)}`, splitSigma(coefs)) },
    ];
  },
};

interface ExpandTreeParams {
  shifts: number[];
  n: number;
}

/**
 * A product sum to a number, worked as a tree. Two brackets: Σr², Σr, the
 * multiple of Σr and the constant's n copies. Three (one a plain r): Σr³,
 * Σr², Σr, their multiples, then the total.
 */
const expandTree: Generator<ExpandTreeParams> = {
  id: 'seq-l8-expand-tree',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const pair = drawShifts(rng, [-2, -1, 1, 2, 3], 2, ([p, q]) => p < q && p + q !== 0 && p + q !== 1);
      return { shifts: [0, ...pair].sort((a, b) => a - b), n: rng.int(3, 12) };
    }
    return { shifts: drawShifts(rng, [-3, -2, -1, 1, 2, 3, 4], 2, ([p, q]) => p < q && p + q !== 0 && p + q !== 1), n: rng.int(5, 15) };
  },
  render: ({ shifts, n }): Slide => {
    const coefs = expand(shifts);
    const s1 = powerSum(1, n);
    const s2 = powerSum(2, n);
    const multiply: Block[] = [
      { kind: 'prose', text: 'Multiply out, then split the sum:' },
      { kind: 'display', tex: `${productTex(shifts)} = ${poly(coefs, 'r')}` },
    ];
    if (shifts.length === 2) {
      const [, e1, e2] = coefs;
      const answer = [s2, s1, e1 * s1, e2 * n, s2 + e1 * s1 + e2 * n];
      return {
        kind: 'tree',
        prompt: [
          ...multiply,
          {
            kind: 'prose',
            text: `Fill the tree: $\\sum r^2$, $\\sum r$, then $${onSum(e1, '\\sum r')}$, the sum of the $${e2}$s, then the total.`,
          },
        ],
        expression: `${sumFrom(1, n)} ${productTex(shifts)}`,
        nodes: [
          { id: 'squares', from: [] },
          { id: 'sum', from: [] },
          { id: 'scaled', from: ['sum'] },
          { id: 'constant', from: [] },
          { id: 'total', from: ['squares', 'scaled', 'constant'] },
        ],
        bank: numberBank(answer, [e2, s2 + e1 * s1 + e2, -e1 * s1, powerSum(2, n - 1), e2 * (n - 1)]),
        answer: answer.map(String),
      };
    }
    const [, e1, e2] = coefs;
    const s3 = powerSum(3, n);
    const answer = [s3, s2, s1, e1 * s2, e2 * s1, s3 + e1 * s2 + e2 * s1];
    return {
      kind: 'tree',
      prompt: [
        ...multiply,
        {
          kind: 'prose',
          text: `Fill the tree: $\\sum r^3$, $\\sum r^2$, $\\sum r$, then $${onSum(e1, '\\sum r^2')}$ and $${onSum(e2, '\\sum r')}$, then the total.`,
        },
      ],
      expression: `${sumFrom(1, n)} ${productTex(shifts)}`,
      nodes: [
        { id: 'cubes', from: [] },
        { id: 'squares', from: [] },
        { id: 'sum', from: [] },
        { id: 'scaledSquares', from: ['squares'] },
        { id: 'scaledSum', from: ['sum'] },
        { id: 'total', from: ['cubes', 'scaledSquares', 'scaledSum'] },
      ],
      bank: numberBank(answer, [e1 * s1, e2 * s2, powerSum(3, n - 1), s3 + e1 * s2 - e2 * s1, s1 * s1 * 2]),
      answer: answer.map(String),
    };
  },
  solution: ({ shifts, n }) => {
    const coefs = expand(shifts);
    const total = addUp((r) => polyAt(coefs, r), 1, n);
    return [
      ...expandWorking(shifts),
      { tex: splitDisplay(`${sumFrom(1, n)} ${productTex(shifts)}`, splitSigma(coefs).replace(/(\d*)n$/, (_, c: string) => `${c || '1'} \\times ${n}`)) },
      { tex: resultLines(coefs, n) },
      { tex: `\\begin{gathered} ${splitNumbers(coefs, n)} \\\\ = ${total} \\end{gathered}` },
    ];
  },
};

interface ProductSumParams {
  shifts: number[];
  n: number;
}

const PAIRS: number[][] = [
  [-2, -1], [-2, 0], [-2, 1], [-2, 3], [-1, 0], [-1, 1], [-1, 2], [-1, 3],
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [0, 4],
];

const TRIPLES: number[][] = [
  [0, 1, 2], [-1, 0, 1], [0, 1, 3], [0, 2, 3], [-1, 0, 2], [0, 1, 4], [-2, 0, 1], [-1, 0, 3], [0, 2, 4],
];

/** A product sum up to a number, typed. */
const productSum: Generator<ProductSumParams> = {
  id: 'seq-l8-product-sum',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { shifts: rng.pick(TRIPLES), n: rng.int(4, 12) };
    return { shifts: rng.pick(PAIRS), n: rng.int(5, 20) };
  },
  choices: ({ shifts, n }) => {
    const coefs = expand(shifts);
    const [, , c1, c0] = cubic(coefs);
    const f = (r: number) => polyAt(coefs, r);
    const total = addUp(f, 1, n);
    return numberOptions(total, [
      c0 !== 0 ? total - c0 * n + c0 : total - c1 * powerSum(1, n) + c1,
      addUp(f, 1, n - 1),
      total - 2 * c1 * powerSum(1, n),
      addUp(f, 1, n + 1),
    ]);
  },
  render: ({ shifts, n }): Slide => {
    const coefs = expand(shifts);
    return typed(
      [
        { kind: 'prose', text: 'Use the standard results to find this sum.' },
        { kind: 'display', tex: `${sumFrom(1, n)} ${productTex(shifts)}` },
      ],
      '\\text{sum} =',
      addUp((r) => polyAt(coefs, r), 1, n),
    );
  },
  solution: ({ shifts, n }) => {
    const coefs = expand(shifts);
    const total = addUp((r) => polyAt(coefs, r), 1, n);
    const [, , , c0] = cubic(coefs);
    return [
      ...expandWorking(shifts),
      { tex: splitDisplay(`${sumFrom(1, n)} ${productTex(shifts)}`, splitSigma(coefs)) },
      { text: `Put $n = ${n}$ into each standard result${c0 !== 0 ? `; the constant gives $${c0} \\times ${n} = ${c0 * n}$` : ''}:` },
      { tex: resultLines(coefs, n) },
      { tex: `\\begin{gathered} ${splitNumbers(coefs, n)} \\\\ = ${total} \\end{gathered}` },
    ];
  },
};

interface ProductTableParams {
  shifts: number[];
  start: number;
  sumBlanks: number[];
  termBlank: number;
}

/**
 * n, the product term and the running total in a table. At difficulty 2 the
 * first total is blank as well, so it has to come from the standard results.
 */
const productTable: Generator<ProductTableParams> = {
  id: 'seq-l8-product-table',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      return { shifts: [0, 1, rng.pick([2, 3])], start: rng.int(2, 8), sumBlanks: [0, ...positions(rng, 1, 4, 2)], termBlank: rng.int(1, 4) };
    }
    return { shifts: [0, rng.pick([1, 2, 3])], start: rng.int(1, 9), sumBlanks: positions(rng, 1, 4, 2), termBlank: rng.int(1, 4) };
  },
  render: ({ shifts, start, sumBlanks, termBlank }): Slide => {
    const coefs = expand(shifts);
    const u = (r: number) => polyAt(coefs, r);
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = [0, 1, 2, 3, 4].map((i) => {
      const n = start + i;
      const total = addUp(u, 1, n);
      const row: (string | null)[] = [`${n}`];
      if (i === termBlank) {
        answer.push(u(n));
        slips.push(u(n) + n, u(n + 1), u(n - 1));
      }
      row.push(i === termBlank ? null : `${u(n)}`);
      if (sumBlanks.includes(i)) {
        answer.push(total);
        slips.push(total + u(n), total - u(n) + u(n + 1), total - n);
      }
      row.push(sumBlanks.includes(i) ? null : `${total}`);
      return row;
    });
    return {
      kind: 'table',
      prompt: [
        { kind: 'display', tex: `u_r = ${productTex(shifts)} \\qquad S_n = ${sumFrom(1, 'n')} u_r` },
        {
          kind: 'prose',
          text: sumBlanks.includes(0)
            ? 'Fill in the table. The first total needs the standard results; each one after is the one above plus the next term.'
            : 'Fill in the table: each total is the one above plus the next term.',
        },
      ],
      columns: ['n', 'u_n', 'S_n'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ shifts, start, sumBlanks }) => {
    const coefs = expand(shifts);
    const u = (r: number) => polyAt(coefs, r);
    const ns = [0, 1, 2, 3, 4].map((i) => start + i);
    const first: SolutionStep[] = sumBlanks.includes(0)
      ? [
          { text: `Multiply out, $u_r = ${poly(coefs, 'r')}$, so $S_{${start}} = ${splitSigma(coefs).replace(/\\sum/g, `\\sum_{r=1}^{${start}}`)}$:` },
          { tex: resultLines(coefs, start) },
          { tex: `S_{${start}} = ${splitNumbers(coefs, start)} = ${addUp(u, 1, start)}` },
        ]
      : [];
    return [
      ...first,
      { text: `Each term is $u_n = ${productTex(shifts).replace(/r/g, 'n')}$, and each total is the one above plus the next term.` },
      { tex: chain(...ns.slice(1).map((n) => `S_{${n}} &= ${addUp(u, 1, n - 1)} + ${u(n)} = ${addUp(u, 1, n)}`)) },
    ];
  },
};

/* ---------- Lesson 2: answers in factorised form ---------- */

interface FactorParams {
  /** The sum of c3 r^3 + c2 r^2 + c1 r: no constant, so n(n + 1) comes out. */
  c3: number;
  c2: number;
  c1: number;
}

interface Factorised {
  /** Over this, each result carries 1/D n(n + 1): 6 without r^3, 12 with it. */
  D: number;
  /** The bracket over D, highest power first, before anything is taken out. */
  Q: number[];
  /** What comes out of the bracket: gcd of Q with D. */
  g: number;
  /** The unit fraction in front: 1/den. */
  den: number;
  /** The bracket with g taken out. */
  bracket: number[];
}

/** Σ(c3 r^3 + c2 r^2 + c1 r) as 1/den n(n + 1)(bracket), the bracket's whole numbers sharing no factor. */
function factorised({ c3, c2, c1 }: FactorParams): Factorised {
  const D = c3 === 0 ? 6 : 12;
  const Q = c3 === 0 ? [2 * c2, c2 + 3 * c1] : [3 * c3, 3 * c3 + 4 * c2, 2 * c2 + 6 * c1];
  const g = Q.reduce((acc, c) => gcd(acc, Math.abs(c)), D);
  return { D, Q, g, den: D / g, bracket: Q.map((c) => c / g) };
}

/** A factorised form that is worth asking: a fraction in front and a constant in the bracket. */
function usable(p: FactorParams): boolean {
  const f = factorised(p);
  return f.den > 1 && f.bracket[f.bracket.length - 1] !== 0;
}

/** The sum's general term as it sits after the sigma. */
function factorTermTex({ c3, c2, c1 }: FactorParams): string {
  if (c3 === 0 && c2 === 1) return `r(r ${signed(c1)})`;
  return `(${poly(c3 === 0 ? [c2, c1, 0] : [c3, c2, c1, 0], 'r')})`;
}

/** `\frac{1}{6}n(n + 1)(2n + 7)`. */
function factorisedTex(f: Factorised): string {
  return `\\frac{1}{${f.den}}n(n + 1)(${poly(f.bracket)})`;
}

/** The worked solution shared by the factorised-form questions. */
function factorWorking(p: FactorParams): SolutionStep[] {
  const { c3, c2, c1 } = p;
  const f = factorised(p);
  const over = `\\frac{1}{${f.D}}n(n + 1)`;
  const lines: string[] = [];
  // Over 12 a row runs past a 393 px phone, so its second factor drops to a row of its own.
  const times = (factor: string) => (f.D === 12 ? `${over} \\\\ &\\quad \\times ${factor}` : `${over} \\times ${factor}`);
  if (c3 !== 0) lines.push(`\\sum r^3 &= ${times('3n(n + 1)')}`);
  if (c2 !== 0) lines.push(`\\sum r^2 &= ${times(`${f.D === 6 ? '' : '2'}(2n + 1)`)}`);
  if (c1 !== 0) lines.push(`\\sum r &= ${over} \\times ${f.D / 2}`);
  const inside =
    c3 === 0
      ? joined([`${c2 === 1 ? '' : c2}(2n + 1)`, `${3 * c1}`])
      : joined([c3 === 1 ? '3n(n + 1)' : `${3 * c3}n(n + 1)`, c2 === 0 ? '' : `${2 * c2}(2n + 1)`, c1 === 0 ? '' : `${6 * c1}`]);
  return [
    { tex: `\\begin{gathered} ${sumFrom(1, 'n')} ${factorTermTex(p)} \\\\ = ${splitSigma([c3, c2, c1, 0])} \\end{gathered}` },
    { text: `Write each result over $${f.D}$, so that each carries $${over}$:` },
    { tex: chain(...lines) },
    { text: 'Taking that out, the bracket collects the rest:' },
    { tex: `\\begin{gathered} ${inside} \\\\ = ${poly(f.Q)} \\end{gathered}` },
    ...(f.g > 1 ? [{ text: `Take $${f.g}$ out of the bracket, which turns $\\frac{1}{${f.D}}$ into $\\frac{1}{${f.den}}$.` }] : []),
    { tex: `${sumFrom(1, 'n')} ${factorTermTex(p)} = ${factorisedTex(f)}` },
  ];
}

function sampleFactor(rng: Rng, hard: boolean): FactorParams {
  for (;;) {
    const p = hard
      ? { c3: 1, c2: rng.int(0, 3), c1: rng.int(-3, 6) }
      : { c3: 0, c2: rng.int(1, 3), c1: rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]) };
    if (p.c1 === 0 && p.c2 === 0) continue;
    if (usable(p)) return p;
  }
}

/**
 * A sum written as one factorised expression, as two tiles: the unit
 * fraction in front and the bracket. The bracket's numbers share no factor,
 * which the prompt says, so there is one right placing.
 */
const factorTiles: Generator<FactorParams> = {
  id: 'seq-l8-factor-tiles',
  sample: (rng, difficulty) => sampleFactor(rng, difficulty > 1),
  render: (p): Slide => {
    const f = factorised(p);
    const b = f.bracket;
    const last = b.length - 1;
    const withAt = (i: number, value: number) => poly(b.map((c, j) => (j === i ? value : c)));
    const fractions = (p.c3 === 0 ? [2, 3, 6, 12] : [4, 12, 6, 2]).filter((d) => d !== f.den).map((d) => `\\frac{1}{${d}}`);
    const brackets = [withAt(last, -b[last]), withAt(last, b[last] + 1), withAt(last - 1, b[last - 1] + 1), withAt(last, b[last] - 1)];
    const answer = [`\\frac{1}{${f.den}}`, poly(b)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write this sum in factorised form. The whole numbers in the last bracket share no common factor.' },
        { kind: 'display', tex: `${sumFrom(1, 'n')} ${factorTermTex(p)}` },
      ],
      template: '{0}n(n + 1)({1})',
      bank: tileBank(answer, [fractions[0], brackets[0], fractions[1], brackets[1], brackets[2]], 4),
      answer,
    };
  },
  solution: (p) => factorWorking(p),
};

interface FactorConstParams {
  /** Σ(a r^2 + b r) over a sixth, or Σ(a r^3 + b r) over a quarter or a half. */
  cubic: boolean;
  a: number;
  b: number;
}

/** The hidden constant, what is in front, and the rest of the bracket. */
function constParts({ cubic: isCubic, a, b }: FactorConstParams): { k: number; front: string; lead: string } {
  if (!isCubic) return { k: a + 3 * b, front: '\\frac{1}{6}', lead: `${2 * a}n` };
  return a === 1 ? { k: 2 * b, front: '\\frac{1}{4}', lead: 'n^2 + n' } : { k: b, front: '\\frac{1}{2}', lead: 'n^2 + n' };
}

function constTermTex({ cubic: isCubic, a, b }: FactorConstParams): string {
  if (!isCubic && a === 1) return `r(r ${signed(b)})`;
  return `(${poly(isCubic ? [a, 0, b, 0] : [a, b, 0], 'r')})`;
}

/** The constant in a given factorised form, typed. */
const factorConst: Generator<FactorConstParams> = {
  id: 'seq-l8-factor-const',
  sample: (rng, difficulty) => {
    const pick = (lo: number, hi: number) => {
      for (;;) {
        const v = rng.int(lo, hi);
        if (v !== 0) return v;
      }
    };
    if (difficulty > 1) return { cubic: true, a: rng.int(1, 2), b: pick(-9, 15) };
    for (;;) {
      const p = { cubic: false, a: rng.int(1, 3), b: pick(-4, 8) };
      if (constParts(p).k !== 0) return p;
    }
  },
  choices: (p) => {
    const { k } = constParts(p);
    const { a, b } = p;
    return numberOptions(k, p.cubic ? [b === k ? 2 * b : b, 4 * b, -k] : [a + b, 3 * b, 2 * a + 3 * b]);
  },
  render: (p): Slide => {
    const { front, lead } = constParts(p);
    return typed(
      [
        { kind: 'prose', text: 'Find $k$.' },
        { kind: 'display', tex: `${sumFrom(1, 'n')} ${constTermTex(p)} = ${front}n(n + 1)(${lead} + k)` },
      ],
      'k =',
      constParts(p).k,
    );
  },
  solution: (p) => {
    const { cubic: isCubic, a, b } = p;
    const { k, front, lead } = constParts(p);
    if (!isCubic) {
      return [
        { tex: `\\begin{gathered} ${sumFrom(1, 'n')} ${constTermTex(p)} \\\\ = ${splitSigma([a, b, 0])} \\end{gathered}` },
        { text: 'Write both over $6$:' },
        { tex: chain('\\sum r^2 &= \\frac{1}{6}n(n + 1)(2n + 1)', '\\sum r &= \\frac{1}{6}n(n + 1) \\times 3') },
        { text: `Taking out $\\frac{1}{6}n(n + 1)$, the bracket is` },
        { tex: `\\begin{gathered} ${a === 1 ? '' : a}(2n + 1) ${signed(3 * b)} \\\\ = ${lead} ${signed(k)} \\end{gathered}` },
        { text: `So $k = ${k}$.` },
      ];
    }
    const quarter = a === 1;
    return [
      { tex: `\\begin{gathered} ${sumFrom(1, 'n')} ${constTermTex(p)} \\\\ = ${splitSigma([a, 0, b, 0])} \\end{gathered}` },
      { text: `Write both over $${quarter ? 4 : 2}$:` },
      {
        tex: quarter
          ? chain('\\sum r^3 &= \\frac{1}{4}n(n + 1) \\times n(n + 1)', '\\sum r &= \\frac{1}{4}n(n + 1) \\times 2')
          : chain('2\\sum r^3 &= \\frac{1}{2}n(n + 1) \\times n(n + 1)', '\\sum r &= \\frac{1}{2}n(n + 1) \\times 1'),
      },
      { text: `Taking out $${front}n(n + 1)$, the bracket is` },
      { tex: `\\begin{gathered} n(n + 1) ${signed(quarter ? 2 * b : b)} \\\\ = ${lead} ${signed(k)} \\end{gathered}` },
      { text: `So $k = ${k}$.` },
    ];
  },
};

interface FactorOrderParams extends FactorConstParams {
  picks: number[];
}

/** The working that shows a sum's factorised form, line by line. */
function factorProof({ cubic: isCubic, a, b }: FactorConstParams): Working {
  const times = (c: number, body: string) => `${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : `${Math.abs(c)} \\times `}${body}`;
  if (!isCubic) {
    const term = constTermTex({ cubic: false, a, b });
    const split = `${a === 1 ? '' : a}\\sum r^2 ${signedTerm(b, '\\sum r')}`;
    const inFront = a === 1 ? '' : `${a} \\times `;
    const bracket = (c: number) => `${a === 1 ? '' : a}(2n + 1) ${signed(c)}`;
    return {
      claim: `Show that $${sumFrom(1, 'n')} ${term} = \\frac{1}{6}n(n + 1)(${poly([2 * a, a + 3 * b])})$.`,
      lines: [
        `Split the sum: $${split}$.`,
        `Put in the standard results: $${inFront}\\frac{1}{6}n(n + 1)(2n + 1) ${times(b, '\\frac{1}{2}n(n + 1)')}$.`,
        `Write $\\frac{1}{2}$ as $\\frac{3}{6}$ and take out $\\frac{1}{6}n(n + 1)$: the bracket is $${bracket(3 * b)}$.`,
        `That is $\\frac{1}{6}n(n + 1)(${poly([2 * a, a + 3 * b])})$.`,
      ],
      pool: [
        {
          text: `Write $\\frac{1}{2}$ as $\\frac{3}{6}$ and take out $\\frac{1}{6}n(n + 1)$: the bracket is $${bracket(b)}$.`,
          why: `$${b} \\times \\frac{1}{2}$ is $\\frac{${3 * b}}{6}$, so $${3 * b}$ goes in the bracket.`,
        },
        {
          text: `Put in the standard results: $${inFront}\\frac{1}{6}n(n + 1)(2n + 1) ${times(b, 'n(n + 1)')}$.`,
          why: '$\\sum r$ is $\\frac{1}{2}n(n + 1)$, not $n(n + 1)$.',
        },
        {
          text: `Split the sum: $${a === 1 ? '' : a}\\sum r^2 ${signed(b)}$.`,
          why: `The $${b}$ multiplies $r$, so it becomes $${onSum(b, '\\sum r')}$.`,
        },
        {
          text: `Write $\\frac{1}{2}$ as $\\frac{3}{6}$ and take out $\\frac{1}{6}n(n + 1)$: the bracket is $${bracket(-3 * b)}$.`,
          why: 'The sign of the second part does not change when it goes in the bracket.',
        },
      ],
    };
  }
  const term = constTermTex({ cubic: true, a: 1, b });
  const result = `\\frac{1}{4}n(n + 1)(n^2 + n ${signed(2 * b)})`;
  return {
    claim: `Show that $${sumFrom(1, 'n')} ${term} = ${result}$.`,
    lines: [
      `Split the sum: $\\sum r^3 ${signedTerm(b, '\\sum r')}$.`,
      `Put in the standard results: $\\frac{1}{4}n^2(n + 1)^2 ${times(b, '\\frac{1}{2}n(n + 1)')}$.`,
      `Write $\\frac{1}{2}$ as $\\frac{2}{4}$ and take out $\\frac{1}{4}n(n + 1)$: the bracket is $n(n + 1) ${signed(2 * b)}$.`,
      `That is $${result}$.`,
    ],
    pool: [
      {
        text: `Write $\\frac{1}{2}$ as $\\frac{2}{4}$ and take out $\\frac{1}{4}n(n + 1)$: the bracket is $n(n + 1) ${signed(b)}$.`,
        why: `$${b} \\times \\frac{1}{2}$ is $\\frac{${2 * b}}{4}$, so $${2 * b}$ goes in the bracket.`,
      },
      {
        text: `Put in the standard results: $\\frac{1}{4}n^2(n + 1)^2 ${times(b, 'n(n + 1)')}$.`,
        why: '$\\sum r$ is $\\frac{1}{2}n(n + 1)$, not $n(n + 1)$.',
      },
      {
        text: `Write $\\frac{1}{2}$ as $\\frac{2}{4}$ and take out $\\frac{1}{4}n(n + 1)$: the bracket is $n^2(n + 1) ${signed(2 * b)}$.`,
        why: 'Taking $\\frac{1}{4}n(n + 1)$ out of $\\frac{1}{4}n^2(n + 1)^2$ leaves $n(n + 1)$.',
      },
      {
        text: `Split the sum: $\\sum r^3 ${signed(b)}$.`,
        why: `The $${b}$ multiplies $r$, so it becomes $${onSum(b, '\\sum r')}$.`,
      },
    ],
  };
}

/** The working that shows a factorised form, put in order. */
const factorOrder: Generator<FactorOrderParams> = {
  id: 'seq-l8-factor-order',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const picks = rng.sample([0, 1, 2, 3], hard ? 2 : 1).sort((x, y) => x - y);
    if (hard) {
      for (;;) {
        const b = rng.int(-5, 9);
        if (b !== 0) return { cubic: true, a: 1, b, picks };
      }
    }
    for (;;) {
      const p = { cubic: false, a: rng.int(1, 3), b: rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]), picks };
      if (constParts(p).k !== 0) return p;
    }
  },
  render: (p): Slide => {
    const work = factorProof(p);
    return orderWorking(work.claim, work.lines, p.picks.map((i) => work.pool[i].text));
  },
  solution: (p) => orderSolution(factorProof(p), p.picks),
};

interface FactorEvalParams extends FactorParams {
  n: number;
}

/** A factorised form put to use: n + 1, the bracket, the product, then the sum. */
const factorEvalTree: Generator<FactorEvalParams> = {
  id: 'seq-l8-factor-eval-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { ...sampleFactor(rng, hard), n: hard ? rng.int(4, 12) : rng.int(5, 20) };
  },
  render: (p): Slide => {
    const f = factorised(p);
    const { n } = p;
    const bracket = polyAt(f.bracket, n);
    const product = n * (n + 1) * bracket;
    const answer = [n + 1, bracket, product, product / f.den];
    return {
      kind: 'tree',
      prompt: [
        { kind: 'prose', text: 'This sum in factorised form is' },
        { kind: 'display', tex: `${sumFrom(1, 'n')} ${factorTermTex(p)} = ${factorisedTex(f)}` },
        { kind: 'prose', text: `Use it with $n = ${n}$. Fill the tree: $n + 1$, the last bracket, the product $n(n + 1)(\\dots)$, then the sum.` },
      ],
      expression: `${sumFrom(1, n)} ${factorTermTex(p)}`,
      nodes: [
        { id: 'next', from: [] },
        { id: 'bracket', from: [] },
        { id: 'product', from: ['next', 'bracket'] },
        { id: 'sum', from: ['product'] },
      ],
      bank: numberBank(answer, [n * bracket, (n + 1) * bracket, polyAt(f.bracket, n + 1), product / (2 * f.den), (n * bracket) / f.den]),
      answer: answer.map(String),
    };
  },
  solution: (p) => {
    const f = factorised(p);
    const { n } = p;
    const bracket = polyAt(f.bracket, n);
    const product = n * (n + 1) * bracket;
    return [
      { text: `At $n = ${n}$, work out $n + 1$ and the last bracket:` },
      { tex: chain(`n + 1 &= ${n + 1}`, `${poly(f.bracket).replace(/n/g, `(${n})`)} &= ${bracket}`) },
      { tex: chain(`${n} \\times ${n + 1} \\times ${bracket} &= ${product}`, `\\frac{1}{${f.den}} \\times ${product} &= ${product / f.den}`) },
    ];
  },
};

/* ---------- Lesson 3: odd and even terms ---------- */

/** The even terms (2r)^k up to (2n)^k: 2^k times the standard result. */
const evenSum = (k: Power, n: number) => 2 ** k * powerSum(k, n);
/** The odd terms (2r - 1)^k up to (2n - 1)^k: everything to 2n, less the evens. */
const oddSum = (k: Power, n: number) => powerSum(k, 2 * n) - evenSum(k, n);

/** 2^2 + 4^2 + … + (2n)^2 or 1^2 + 3^2 + … + (2n - 1)^2, written out. */
function parityWritten(k: Power, odd: boolean, n: number): string {
  const term = (x: number) => (k === 1 ? `${x}` : `${x}^${k}`);
  const first = odd ? [1, 3, 5] : [2, 4, 6];
  return `${first.map(term).join(' + ')} + \\dots + ${term(odd ? 2 * n - 1 : 2 * n)}`;
}

function paritySigma(k: Power, odd: boolean, n: number | string): string {
  return `${sumFrom(1, n)} (${odd ? '2r - 1' : '2r'})^${k}`;
}

interface ParitySumParams {
  k: Power;
  odd: boolean;
  n: number;
  written: boolean;
}

/** The working for an even or odd sum at a number. */
function parityWorking({ k, odd, n, written }: ParitySumParams): SolutionStep[] {
  const counted: SolutionStep[] = written
    ? [{ text: `The last term is $${odd ? 2 * n - 1 : 2 * n}^${k}$, which is $(${odd ? '2n - 1' : '2n'})^${k}$ with $n = ${n}$: there are $${n}$ terms.` }]
    : [];
  if (!odd) {
    return [
      ...counted,
      { text: `Each term is $(2r)^${k} = ${2 ** k}r^${k}$, so the sum is $${2 ** k}$ times the standard result.` },
      { tex: `${2 ** k} \\times ${powerSum(k, n)} = ${evenSum(k, n)}` },
    ];
  }
  return [
    ...counted,
    { text: `All the terms up to $${2 * n}^${k}$, less the even ones:` },
    { tex: chain(`${sumFrom(1, 2 * n)} r^${k} &= ${powerSum(k, 2 * n)}`, `${2 ** k}${sumFrom(1, n)} r^${k} &= ${2 ** k} \\times ${powerSum(k, n)}`, `&= ${evenSum(k, n)}`) },
    { tex: `${powerSum(k, 2 * n)} - ${evenSum(k, n)} = ${oddSum(k, n)}` },
  ];
}

/** An even or odd power sum, typed. */
const paritySum: Generator<ParitySumParams> = {
  id: 'seq-l8-parity-sum',
  sample: (rng, difficulty) => {
    const written = rng.chance(0.5);
    if (difficulty > 1) {
      if (rng.chance(0.6)) return { k: 3, odd: rng.chance(0.6), n: rng.int(3, 10), written };
      return { k: 2, odd: true, n: rng.int(10, 20), written };
    }
    const odd = rng.chance(0.5);
    return { k: 2, odd, n: odd ? rng.int(4, 15) : rng.int(4, 20), written };
  },
  choices: ({ k, odd, n }) => {
    const value = odd ? oddSum(k, n) : evenSum(k, n);
    return numberOptions(
      value,
      odd
        ? [powerSum(k, 2 * n) - powerSum(k, n), powerSum(k, 2 * n) - 2 * powerSum(k, n), oddSum(k, n + 1)]
        : [2 * powerSum(k, n), powerSum(k, 2 * n), evenSum(k, n - 1)],
    );
  },
  render: (p): Slide =>
    typed(
      [
        { kind: 'prose', text: 'Find this sum.' },
        { kind: 'display', tex: p.written ? parityWritten(p.k, p.odd, p.n) : paritySigma(p.k, p.odd, p.n) },
      ],
      '\\text{sum} =',
      p.odd ? oddSum(p.k, p.n) : evenSum(p.k, p.n),
    ),
  solution: (p) => parityWorking(p),
};

interface SplitOddParams {
  k: Power;
  n: number;
  written: boolean;
}

/** The odd terms as all the terms to 2n less the even ones, as a tree. */
const splitOddTree: Generator<SplitOddParams> = {
  id: 'seq-l8-split-odd-tree',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { k: 3, n: rng.int(3, 15), written: rng.chance(0.5) };
    return { k: 2, n: rng.int(3, 20), written: rng.chance(0.5) };
  },
  render: ({ k, n, written }): Slide => {
    const all = powerSum(k, 2 * n);
    const half = powerSum(k, n);
    const evens = evenSum(k, n);
    const answer = [all, half, evens, all - evens];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Take the even terms away from all the terms up to $${2 * n}^${k}$. Fill the tree: $${sumFrom(1, 2 * n)} r^${k}$, $${sumFrom(1, n)} r^${k}$, the even terms $${2 ** k}${sumFrom(1, n)} r^${k}$, then the odd terms.`,
        },
      ],
      expression: written ? parityWritten(k, true, n) : paritySigma(k, true, n),
      nodes: [
        { id: 'all', from: [] },
        { id: 'half', from: [] },
        { id: 'evens', from: ['half'] },
        { id: 'odds', from: ['all', 'evens'] },
      ],
      bank: numberBank(answer, [all - half, 2 * half, powerSum(k, 2 * n - 1), 2 ** (k - 1) * half, all - 2 * half]),
      answer: answer.map(String),
    };
  },
  solution: ({ k, n, written }) => parityWorking({ k, odd: true, n, written }),
};

interface OddTilesParams {
  k: Power;
  odd: boolean;
  n: number;
}

/** An even or odd sum written with S(m), the standard result to m, as number tiles. */
const oddTiles: Generator<OddTilesParams> = {
  id: 'seq-l8-odd-tiles',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const odd = rng.chance(0.7);
      return { k: 3, odd, n: odd ? rng.int(3, 25) : rng.int(3, 20) };
    }
    const odd = rng.chance(0.75);
    return { k: 2, odd, n: odd ? rng.int(4, 30) : rng.int(4, 20) };
  },
  render: ({ k, odd, n }): Slide => {
    const factor = 2 ** k;
    const answer = odd ? [`${2 * n}`, `${factor}`, `${n}`] : [`${factor}`, `${n}`];
    const slips = odd ? [2 * n - 1, 2 ** (k - 1), n - 1, 2 * n + 1] : [2, 2 * n, 2 ** (k + 1), n - 1];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Write this sum using $S(m) = ${sumFrom(1, 'm')} r^${k}$.` },
        { kind: 'display', tex: parityWritten(k, odd, n) },
      ],
      template: odd ? 'S({0}) - {1}S({2})' : '{0}S({1})',
      bank: tileBank(answer, slips.map(String), 4),
      answer,
    };
  },
  solution: ({ k, odd, n }) => {
    const last = odd ? 2 * n - 1 : 2 * n;
    const count: SolutionStep = { text: `The last term is $${last}^${k}$, so $n = ${n}$ and there are $${n}$ terms.` };
    if (!odd) {
      return [count, { text: `Each term is $(2r)^${k} = ${2 ** k}r^${k}$, so the sum is $${2 ** k}S(${n})$.` }];
    }
    return [
      count,
      { text: `All the terms up to $${2 * n}^${k}$ are $S(${2 * n})$. The even ones among them are $(2r)^${k}$ for $r = 1$ to $${n}$, which make $${2 ** k}S(${n})$.` },
      { tex: `${parityWritten(k, true, n)} = S(${2 * n}) - ${2 ** k}S(${n})` },
    ];
  },
};

interface OddTableParams {
  start: number;
  sumBlanks: number[];
  termBlank: number;
}

/** The odd squares and their running totals in a table; at difficulty 2 the first total is blank. */
const oddTable: Generator<OddTableParams> = {
  id: 'seq-l8-odd-table',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { start: rng.int(4, 12), sumBlanks: [0, ...positions(rng, 1, 4, 2)], termBlank: rng.int(1, 4) };
    return { start: rng.int(1, 10), sumBlanks: positions(rng, 1, 4, 2), termBlank: rng.int(1, 4) };
  },
  render: ({ start, sumBlanks, termBlank }): Slide => {
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = [0, 1, 2, 3, 4].map((i) => {
      const n = start + i;
      const term = (2 * n - 1) ** 2;
      const total = oddSum(2, n);
      if (i === termBlank) {
        answer.push(term);
        slips.push((2 * n) ** 2, (2 * n + 1) ** 2, 2 * n - 1);
      }
      if (sumBlanks.includes(i)) {
        answer.push(total);
        slips.push(total + term, powerSum(2, 2 * n) - powerSum(2, n), total - term + (2 * n + 1) ** 2);
      }
      return [`${n}`, i === termBlank ? null : `${term}`, sumBlanks.includes(i) ? null : `${total}`];
    });
    return {
      kind: 'table',
      prompt: [
        { kind: 'display', tex: 'T_n = 1^2 + 3^2 + \\dots + (2n - 1)^2' },
        {
          kind: 'prose',
          text: sumBlanks.includes(0)
            ? 'Fill in the table. The first total is all the squares to $(2n)^2$ less the even ones; each one after is the one above plus the next odd square.'
            : 'Fill in the table: each total is the one above plus the next odd square.',
        },
      ],
      columns: ['n', '(2n - 1)^2', 'T_n'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ start, sumBlanks }) => {
    const ns = [0, 1, 2, 3, 4].map((i) => start + i);
    return [
      ...(sumBlanks.includes(0)
        ? [
            { text: `The first total, at $n = ${start}$, is all the squares to $${2 * start}^2$ less the even ones:` },
            { tex: `T_{${start}} = ${powerSum(2, 2 * start)} - 4 \\times ${powerSum(2, start)} = ${oddSum(2, start)}` },
          ]
        : []),
      { text: 'Then add each new odd square to the total above it.' },
      { tex: chain(...ns.slice(1).map((n) => `T_{${n}} &= ${oddSum(2, n - 1)} + ${(2 * n - 1) ** 2} = ${oddSum(2, n)}`)) },
    ];
  },
};

/* ---------- Lesson 4: solving for n ---------- */

type SolveForm = 'lin' | 'odd' | 'cube';

interface SolveParams {
  form: SolveForm;
  n: number;
}

function solveTotal({ form, n }: SolveParams): number {
  if (form === 'lin') return powerSum(1, n);
  if (form === 'odd') return n * n;
  return powerSum(3, n);
}

function solveSubject(p: SolveParams): string {
  const body = p.form === 'lin' ? 'r' : p.form === 'odd' ? '(2r - 1)' : 'r^3';
  return `${sumFrom(1, 'n')} ${body} = ${solveTotal(p)}`;
}

function sampleSolve(rng: Rng, hard: boolean): SolveParams {
  if (hard) return rng.chance(0.5) ? { form: 'cube', n: rng.int(4, 20) } : { form: 'lin', n: rng.int(41, 80) };
  return rng.chance(0.5) ? { form: 'lin', n: rng.int(8, 40) } : { form: 'odd', n: rng.int(6, 30) };
}

/** The working back from a total to n. */
function solveWorking(p: SolveParams): SolutionStep[] {
  const { form, n } = p;
  const total = solveTotal(p);
  if (form === 'odd') {
    return [
      { text: `The sum of the first $n$ odd numbers is $n^2$, so $n^2 = ${total}$.` },
      { tex: `n = \\sqrt{${total}} = ${n}` },
    ];
  }
  const s = powerSum(1, n);
  const pair: SolutionStep[] = [
    { tex: chain(`\\tfrac{1}{2}n(n + 1) &= ${s}`, `n(n + 1) &= ${2 * s}`) },
    { text: `$\\sqrt{${2 * s}} \\approx ${Math.sqrt(2 * s).toFixed(1)}$, so try $n = ${n}$: $${n} \\times ${n + 1} = ${2 * s}$. So $n = ${n}$.` },
  ];
  if (form === 'lin') return pair;
  return [{ text: `$\\sum r^3 = \\left(\\sum r\\right)^2$, so $\\sum r = \\sqrt{${total}} = ${s}$.` }, ...pair];
}

/** A total given, n typed. */
const solveN: Generator<SolveParams> = {
  id: 'seq-l8-solve-n',
  sample: (rng, difficulty) => sampleSolve(rng, difficulty > 1),
  choices: (p) => {
    const { form, n } = p;
    const slips = form === 'cube' ? [powerSum(1, n), n + 1] : form === 'odd' ? [solveTotal(p) / 2, n + 1] : [n + 1, n - 1];
    return numberOptions(n, slips);
  },
  render: (p): Slide =>
    typed(
      [
        { kind: 'prose', text: 'Find $n$.' },
        { kind: 'display', tex: solveSubject(p) },
      ],
      'n =',
      p.n,
    ),
  solution: (p) => solveWorking(p),
};

/** The first move for each kind of total, and the slip beside it. */
function solveMoves(p: SolveParams): { right: string; wrong: string; why: string; slip: number; slipWhy: string } {
  const { form, n } = p;
  const total = solveTotal(p);
  if (form === 'lin') {
    return {
      right: `Double both sides: $n(n + 1) = ${2 * total}$`,
      wrong: 'Take the square root of both sides',
      why: `$\\frac{1}{2}n(n + 1)$ is not a square. Double first: $n(n + 1) = ${2 * total}$, then look for two numbers in a row.`,
      slip: n + 1,
      slipWhy: `$${n + 1} \\times ${n + 2}$ is $${(n + 1) * (n + 2)}$, not $${2 * total}$.`,
    };
  }
  if (form === 'odd') {
    return {
      right: 'The sum is $n^2$: take the square root',
      wrong: 'The sum is $\\frac{1}{2}n(n + 1)$: double it',
      why: 'That is $\\sum r$. The odd numbers add up to $n^2$.',
      slip: n + 1,
      slipWhy: `$${n + 1}^2 = ${(n + 1) ** 2}$, not $${total}$.`,
    };
  }
  return {
    right: 'The sum is $\\left(\\sum r\\right)^2$: take the square root',
    wrong: 'Take the cube root of both sides',
    why: 'A sum of cubes is not the cube of anything useful. It is the square of $\\sum r$.',
    slip: powerSum(1, n),
    slipWhy: `$${powerSum(1, n)}$ is $\\sum r$, not $n$: it is $\\frac{1}{2}n(n + 1)$.`,
  };
}

/** Which move, then which n: the square-root trick and its cousins. */
const solveFlow: Generator<SolveParams> = {
  id: 'seq-l8-solve-flow',
  sample: (rng, difficulty) => sampleSolve(rng, difficulty > 1),
  render: (p): Slide => {
    const { n } = p;
    const m = solveMoves(p);
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Work back from the total to $n$.' }],
      subject: solveSubject(p),
      steps: [
        {
          id: 'move',
          ask: 'What is the first move?',
          branches: turned([{ label: m.right, to: 'value' }, { label: m.wrong, outcome: m.why }], mix(p.form, n)),
        },
        {
          id: 'value',
          ask: 'So what is $n$?',
          branches: turned(
            [
              { label: `$${n}$`, outcome: `Yes: $n = ${n}$.` },
              { label: `$${m.slip}$`, outcome: m.slipWhy },
            ],
            mix(n, p.form, 'value'),
          ),
        },
      ],
      answer: [m.right, `$${n}$`],
    };
  },
  solution: (p) => solveWorking(p),
};

type RatioForm = 'sq' | 'cube' | 'prod';

interface RatioParams {
  form: RatioForm;
  k: number;
}

/** n from Σr² = kΣr, Σr³ = kΣr or Σr(r + 1) = kΣr. */
function ratioN({ form, k }: RatioParams): number {
  if (form === 'sq') return (3 * k - 1) / 2;
  if (form === 'prod') return (3 * k - 4) / 2;
  return (Math.sqrt(8 * k + 1) - 1) / 2;
}

function ratioSubject({ form, k }: RatioParams): string {
  const left = form === 'sq' ? 'r^2' : form === 'cube' ? 'r^3' : 'r(r + 1)';
  return `${sumFrom(1, 'n')} ${left} = ${k}${sumFrom(1, 'n')} r`;
}

function sampleRatio(rng: Rng, hard: boolean): RatioParams {
  if (!hard) return { form: 'sq', k: 2 * rng.int(1, 30) + 1 };
  if (rng.chance(0.5)) return { form: 'cube', k: powerSum(1, rng.int(3, 25)) };
  return { form: 'prod', k: 2 * rng.int(2, 20) };
}

function ratioWork(p: RatioParams): Working {
  const { form, k } = p;
  const n = ratioN(p);
  const claim = `Solve for $n$: $${ratioSubject(p)}$`;
  const divide = 'Divide both sides by $\\frac{1}{2}n(n + 1)$, which is not zero:';
  if (form === 'sq') {
    return {
      claim,
      lines: [
        `Put in the standard results: $\\frac{1}{6}n(n + 1)(2n + 1) = ${k} \\times \\frac{1}{2}n(n + 1)$.`,
        `${divide} $\\frac{1}{3}(2n + 1) = ${k}$.`,
        `Multiply by $3$: $2n + 1 = ${3 * k}$.`,
        `So $n = ${n}$.`,
      ],
      pool: [
        { text: `${divide} $\\frac{1}{6}(2n + 1) = ${k}$.`, why: '$\\frac{1}{6} \\div \\frac{1}{2}$ is $\\frac{1}{3}$.' },
        { text: `Put in the standard results: $\\frac{1}{6}n(n + 1)(2n + 1) = ${k}n(n + 1)$.`, why: '$\\sum r$ is $\\frac{1}{2}n(n + 1)$.' },
        { text: `Multiply by $3$: $2n + 1 = ${k + 3}$.`, why: `Multiplying $${k}$ by $3$ gives $${3 * k}$.` },
        { text: `So $n = ${(3 * k + 1) / 2}$.`, why: `$2n + 1$ is $${3 * k}$, so take $1$ away before halving.` },
      ],
    };
  }
  if (form === 'cube') {
    return {
      claim,
      lines: [
        `Put in the standard results: $\\frac{1}{4}n^2(n + 1)^2 = ${k} \\times \\frac{1}{2}n(n + 1)$.`,
        `${divide} $\\frac{1}{2}n(n + 1) = ${k}$.`,
        `Double: $n(n + 1) = ${2 * k}$.`,
        `So $n = ${n}$, since $${n} \\times ${n + 1} = ${2 * k}$.`,
      ],
      pool: [
        { text: `${divide} $\\frac{1}{4}n(n + 1) = ${k}$.`, why: '$\\frac{1}{4} \\div \\frac{1}{2}$ is $\\frac{1}{2}$, and one $n(n + 1)$ is left.' },
        { text: `Put in the standard results: $\\frac{1}{4}n^2(n + 1)^2 = ${k}n(n + 1)$.`, why: '$\\sum r$ is $\\frac{1}{2}n(n + 1)$.' },
        { text: `Double: $n(n + 1) = ${k + 2}$.`, why: `Doubling $${k}$ gives $${2 * k}$.` },
        { text: `So $n = ${n + 1}$.`, why: `$${n + 1} \\times ${n + 2}$ is $${(n + 1) * (n + 2)}$, not $${2 * k}$.` },
      ],
    };
  }
  return {
    claim,
    lines: [
      `Put in the results: $\\frac{1}{3}n(n + 1)(n + 2) = ${k} \\times \\frac{1}{2}n(n + 1)$.`,
      `${divide} $\\frac{2}{3}(n + 2) = ${k}$.`,
      `Multiply by $\\frac{3}{2}$: $n + 2 = ${(3 * k) / 2}$.`,
      `So $n = ${n}$.`,
    ],
    pool: [
      { text: `${divide} $\\frac{1}{6}(n + 2) = ${k}$.`, why: '$\\frac{1}{3} \\div \\frac{1}{2}$ is $\\frac{2}{3}$.' },
      { text: `Put in the results: $\\frac{1}{3}n(n + 1)(n + 2) = ${k}n(n + 1)$.`, why: '$\\sum r$ is $\\frac{1}{2}n(n + 1)$.' },
      { text: `Multiply by $\\frac{3}{2}$: $n + 2 = ${3 * k}$.`, why: `$\\frac{3}{2} \\times ${k}$ is $${(3 * k) / 2}$.` },
      { text: `So $n = ${(3 * k) / 2 + 2}$.`, why: `$n + 2$ is $${(3 * k) / 2}$, so take $2$ away.` },
    ],
  };
}

/** An equation between two sums, solved for n, typed. */
const ratioNAsk: Generator<RatioParams> = {
  id: 'seq-l8-ratio-n',
  sample: (rng, difficulty) => sampleRatio(rng, difficulty > 1),
  choices: (p) => {
    const n = ratioN(p);
    const { form, k } = p;
    if (form === 'sq') return numberOptions(n, [3 * k - 1, (3 * k + 1) / 2, (k - 1) / 2]);
    if (form === 'prod') return numberOptions(n, [(3 * k) / 2 + 2, 3 * k - 4, (3 * k) / 2]);
    return numberOptions(n, [n + 1, k, 2 * k]);
  },
  render: (p): Slide =>
    typed(
      [
        { kind: 'prose', text: 'Find $n$.' },
        { kind: 'display', tex: ratioSubject(p) },
      ],
      'n =',
      ratioN(p),
    ),
  solution: (p) => {
    const work = ratioWork(p);
    return work.lines.map((text) => ({ text }));
  },
};

interface RatioOrderParams extends RatioParams {
  picks: number[];
}

/** The same equation's working, put in order. */
const ratioOrder: Generator<RatioOrderParams> = {
  id: 'seq-l8-ratio-order',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { ...sampleRatio(rng, hard), picks: rng.sample([0, 1, 2, 3], hard ? 2 : 1).sort((x, y) => x - y) };
  },
  render: (p): Slide => {
    const work = ratioWork(p);
    return orderWorking(work.claim, work.lines, p.picks.map((i) => work.pool[i].text));
  },
  solution: (p) => orderSolution(ratioWork(p), p.picks),
};

/* ---------- Lesson 5: alternating sums ---------- */

interface AltParams {
  /** Squares, or the plain numbers. */
  sq: boolean;
  /** How many terms. */
  count: number;
  /** The first term is added; otherwise it is taken away. */
  plusFirst: boolean;
  /** Shown in sigma form rather than written out. */
  sigma: boolean;
}

/** Whether term r is added: the odd terms when the first is added, the even ones otherwise. */
function added(r: number, plusFirst: boolean): boolean {
  return plusFirst ? r % 2 === 1 : r % 2 === 0;
}

/** The alternating sum, added up term by term. */
function altValue({ sq, count, plusFirst }: AltParams): number {
  return addUp((r) => (added(r, plusFirst) ? 1 : -1) * (sq ? r * r : r), 1, count);
}

/** The pairs only, without the last term when the count is odd. */
function pairsValue(p: AltParams): number {
  return altValue({ ...p, count: p.count - (p.count % 2) });
}

function altTex(p: AltParams): string {
  const { sq, count, plusFirst, sigma } = p;
  if (sigma) return `${sumFrom(1, count)} (-1)^{${plusFirst ? 'r + 1' : 'r'}} ${sq ? 'r^2' : 'r'}`;
  const term = (r: number) => (sq ? `${r}^2` : `${r}`);
  const sign = (r: number) => (added(r, plusFirst) ? '+' : '-');
  const head = `${plusFirst ? '' : '-'}${term(1)} ${sign(2)} ${term(2)} ${sign(3)} ${term(3)}`;
  return `${head} ${sign(4)} \\dots ${sign(count)} ${term(count)}`;
}

/** The pairing, in words and lines, with the learner's numbers. */
function altWorking(p: AltParams): SolutionStep[] {
  const { sq, count, plusFirst, sigma } = p;
  const m = Math.floor(count / 2);
  const odd = count % 2 === 1;
  const flip = plusFirst ? '' : '-';
  const steps: SolutionStep[] = [];
  if (sigma) steps.push({ text: `This is $${altTex({ ...p, sigma: false })}$: $${count}$ terms, the first ${plusFirst ? 'added' : 'taken away'}.` });
  if (!plusFirst) steps.push({ text: `Every sign is the other way round from $${altTex({ ...p, plusFirst: true, sigma: false })}$, so work that out and change the sign at the end.` });
  if (sq) {
    steps.push({ text: `Pair the terms from the start. With the first added, pair $k$ is $(2k - 1)^2 - (2k)^2 = -(4k - 1)$.` });
    steps.push({
      tex: `\\begin{gathered} -\\left(4${sumFrom(1, m).replace('r', 'k')} k - ${m}\\right) \\\\ = -(4 \\times ${powerSum(1, m)} - ${m}) = ${-m * (2 * m + 1)} \\end{gathered}`,
    });
  } else {
    steps.push({ text: `Pair the terms from the start. With the first added, each pair is $(2k - 1) - 2k$, which is $-1$, and there are $${m}$ pairs: $${-m}$.` });
  }
  if (odd) {
    const last = sq ? count * count : count;
    const pairs = sq ? -m * (2 * m + 1) : -m;
    steps.push({ text: `There are $${count}$ terms, so the last one, $${sq ? `${count}^2 = ${last}` : count}$, has no partner. Add it back:` });
    steps.push({ tex: `${pairs} + ${last} = ${pairs + last}` });
  }
  if (!plusFirst) steps.push({ text: `Changing the sign, the sum is $${flip}(${altValue({ ...p, plusFirst: true })}) = ${altValue(p)}$.` });
  return steps;
}

/** An alternating sum, typed. */
const altSum: Generator<AltParams> = {
  id: 'seq-l8-alt-sum',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const sq = rng.chance(0.6);
      const m = sq ? rng.int(3, 20) : rng.int(5, 40);
      return { sq, count: 2 * m + (rng.chance(0.5) ? 1 : 0), plusFirst: rng.chance(0.5), sigma: rng.chance(0.5) };
    }
    return { sq: true, count: 2 * rng.int(3, 30), plusFirst: true, sigma: false };
  },
  choices: (p) => {
    const value = altValue(p);
    const last = (p.sq ? p.count * p.count : p.count) * (added(p.count, p.plusFirst) ? 1 : -1);
    return numberOptions(value, [-value, p.count % 2 === 1 ? pairsValue(p) : value - last, value + last]);
  },
  render: (p): Slide =>
    typed(
      [
        { kind: 'prose', text: 'Find this sum by pairing the terms.' },
        { kind: 'display', tex: altTex(p) },
      ],
      '\\text{sum} =',
      altValue(p),
    ),
  solution: (p) => altWorking(p),
};

interface AltTableParams {
  start: number;
  pairBlanks: number[];
  sumBlanks: number[];
}

/** Pair k of 1² − 2² + 3² − … and the running total of the pairs, in a table. */
const altPairTable: Generator<AltTableParams> = {
  id: 'seq-l8-alt-pair-table',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { start: rng.int(3, 15), pairBlanks: positions(rng, 1, 4, 1), sumBlanks: [0, ...positions(rng, 1, 4, 2)] };
    return { start: rng.int(1, 10), pairBlanks: positions(rng, 0, 4, 2), sumBlanks: positions(rng, 1, 4, 2) };
  },
  render: ({ start, pairBlanks, sumBlanks }): Slide => {
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = [0, 1, 2, 3, 4].map((i) => {
      const k = start + i;
      const pair = -(4 * k - 1);
      const total = -k * (2 * k + 1);
      if (pairBlanks.includes(i)) {
        answer.push(pair);
        slips.push(-4 * k, -(4 * k + 1), 4 * k - 1);
      }
      if (sumBlanks.includes(i)) {
        answer.push(total);
        slips.push(-k * (2 * k - 1), total - pair, -total);
      }
      return [`${k}`, pairBlanks.includes(i) ? null : `${pair}`, sumBlanks.includes(i) ? null : `${total}`];
    });
    return {
      kind: 'table',
      prompt: [
        { kind: 'prose', text: 'Pair the terms of $1^2 - 2^2 + 3^2 - 4^2 + \\dots$ from the start:' },
        { kind: 'display', tex: 'p_k = (2k - 1)^2 - (2k)^2 \\qquad T_k = p_1 + \\dots + p_k' },
        { kind: 'prose', text: `Fill in the table.${sumBlanks.includes(0) ? ' The first total is $-k(2k + 1)$.' : ''}` },
      ],
      columns: ['k', 'p_k', 'T_k'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ start, sumBlanks }) => {
    const ks = [0, 1, 2, 3, 4].map((i) => start + i);
    return [
      { text: 'Each pair is $(2k - 1)^2 - (2k)^2 = -(4k - 1)$.' },
      { tex: chain(...ks.map((k) => `p_{${k}} &= -(4 \\times ${k} - 1) = ${-(4 * k - 1)}`)) },
      ...(sumBlanks.includes(0) ? [{ tex: `T_{${start}} = -${start} \\times ${2 * start + 1} = ${-start * (2 * start + 1)}` }] : []),
      { text: 'Each total is the one above plus the next pair.' },
      { tex: chain(...ks.slice(1).map((k) => `T_{${k}} &= ${-(k - 1) * (2 * k - 1)} ${signed(-(4 * k - 1))} = ${-k * (2 * k + 1)}`)) },
    ];
  },
};

interface AltTreeParams {
  /** Pairs. */
  m: number;
  /** One more term after the pairs. */
  odd: boolean;
}

/** 1² − 2² + … by pairing, as a tree: Σk, 4Σk, the pairs, and the last term when there is one. */
const altTree: Generator<AltTreeParams> = {
  id: 'seq-l8-alt-tree',
  sample: (rng, difficulty) => (difficulty > 1 ? { m: rng.int(3, 30), odd: true } : { m: rng.int(4, 30), odd: false }),
  render: ({ m, odd }): Slide => {
    const tri = powerSum(1, m);
    const four = 4 * tri;
    const pairs = -(four - m);
    const last = (2 * m + 1) ** 2;
    const answer = odd ? [tri, four, pairs, last, pairs + last] : [tri, four, pairs];
    const nodes = odd
      ? [
          { id: 'tri', from: [] },
          { id: 'four', from: ['tri'] },
          { id: 'pairs', from: ['four'] },
          { id: 'last', from: [] },
          { id: 'sum', from: ['pairs', 'last'] },
        ]
      : [
          { id: 'tri', from: [] },
          { id: 'four', from: ['tri'] },
          { id: 'pairs', from: ['four'] },
        ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Pair the terms: pair $k$ is $-(4k - 1)$, and there are $${m}$ pairs. Fill the tree: $\\sum k$ for $k = 1$ to $${m}$, then $4\\sum k$, then the pairs' total $-(4\\sum k - ${m})$${odd ? ', the last term, then the sum' : ''}.`,
        },
      ],
      expression: altTex({ sq: true, count: odd ? 2 * m + 1 : 2 * m, plusFirst: true, sigma: false }),
      nodes,
      bank: numberBank(answer, [-four, -(four + m), m * (m + 1), -m * (2 * m - 1), (2 * m) ** 2, pairs - last]),
      answer: answer.map(String),
    };
  },
  solution: ({ m, odd }) => altWorking({ sq: true, count: odd ? 2 * m + 1 : 2 * m, plusFirst: true, sigma: false }),
};

/** Do all the terms pair up, or all but the last? Then the value. */
const altFlow: Generator<AltParams> = {
  id: 'seq-l8-alt-flow',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const sq = rng.chance(0.5);
      return { sq, count: sq ? rng.int(7, 30) : rng.int(9, 60), plusFirst: rng.chance(0.5), sigma: false };
    }
    return { sq: true, count: rng.int(6, 40), plusFirst: true, sigma: false };
  },
  render: (p): Slide => {
    const odd = p.count % 2 === 1;
    const value = altValue(p);
    const all = 'Every term has a partner';
    const most = 'All but the last term have a partner';
    const right = odd ? most : all;
    const slip = odd ? pairsValue(p) : -value;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Pair the terms from the start to add this up.' }],
      subject: altTex(p),
      steps: [
        {
          id: 'pairs',
          ask: 'How do the terms pair up?',
          branches: turned(
            [
              { label: right, to: 'value' },
              {
                label: odd ? all : most,
                outcome: odd
                  ? `There are $${p.count}$ terms, an odd number, so the last one is left over.`
                  : `There are $${p.count}$ terms, an even number, so every term has a partner.`,
              },
            ],
            mix(p.count, p.sq, 'pairs'),
          ),
        },
        {
          id: 'value',
          ask: 'So what is the sum?',
          branches: turned(
            [
              { label: `$${value}$`, outcome: `Yes: the sum is $${value}$.` },
              {
                label: `$${slip}$`,
                outcome: odd
                  ? `That is the pairs alone. Add the last term back.`
                  : `The sign is the other way: ${p.plusFirst ? 'each pair takes away more than it adds' : 'each pair adds more than it takes away'}.`,
              },
            ],
            mix(p.count, value, p.plusFirst),
          ),
        },
      ],
      answer: [right, `$${value}$`],
    };
  },
  solution: (p) => altWorking(p),
};

export const sequencesPowersHarderGenerators = [
  expandTiles,
  expandTree,
  productSum,
  productTable,
  factorTiles,
  factorConst,
  factorOrder,
  factorEvalTree,
  paritySum,
  splitOddTree,
  oddTiles,
  oddTable,
  solveN,
  solveFlow,
  ratioNAsk,
  ratioOrder,
  altSum,
  altPairTable,
  altTree,
  altFlow,
];
