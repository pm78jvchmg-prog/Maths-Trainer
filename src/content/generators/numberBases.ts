/**
 * Number & Proof, level 7: Number Bases.
 *
 * Place value with a base other than ten: binary read by its place values and
 * by doubling, written by taking away powers of 2 and by repeated division,
 * then bases 3 to 9, octal and hexadecimal (with the grouping shortcut from
 * binary), and finally column addition, subtraction and shifting in binary.
 *
 * A numeral in another base is a digit string, and the checker reads typed
 * answers by value. A typed answer here is therefore only ever a string of
 * the digits 0 to 9: mathjs reads `101101` as the whole number 101101, so two
 * such strings agree exactly when they are the same digits (a leading zero
 * aside, which does not change the numeral). The checker's tolerance is
 * relative (1e-8), so that holds only below 10^8: a typed answer never runs
 * past eight digits, which caps typed binary at 255. Anything with a hex letter goes
 * through tiles or a choice instead, where the grade is the token itself.
 *
 * Choice labels carry their base as a subscript (`1011_2`), which the sweep's
 * option reader declines to read as a value; every distractor is still checked
 * here to be a different number from the answer. `numberBases.test.ts` reads
 * the numerals each prompt states and converts them with `parseInt`, never
 * with the helpers below.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { choiceSlide, fillBank, stackTex } from './numberProof';
import { say } from './format';
import { treeBank } from './parametricImplicit';

/* ---------- shared helpers ---------- */

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

const LETTERS = 'ABCDEF';

/** The digits of n in base b, most significant first. */
function digitsOf(n: number, b: number): number[] {
  if (n === 0) return [0];
  const out: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / b)) out.unshift(x % b);
  return out;
}

/** One digit as a character: 0 to 9, then A to F. */
const digitChar = (d: number) => (d < 10 ? String(d) : LETTERS[d - 10]);

/** One digit as TeX: a letter upright, as it is printed. */
const digitTex = (d: number) => (d < 10 ? String(d) : `\\mathrm{${LETTERS[d - 10]}}`);

/** n written in base b, as plain characters. */
const numeral = (n: number, b: number) => digitsOf(n, b).map(digitChar).join('');

/** The base as a subscript: no braces round a single digit, so it is safe in a tiles template. */
const sub = (b: number) => (b < 10 ? `_${b}` : `_{${b}}`);

/** A numeral with its base, as the learner reads it: `1011_2`, `\mathrm{2F}_{16}`. */
const numTex = (n: number, b: number) => (b > 10 ? `\\mathrm{${numeral(n, b)}}${sub(b)}` : `${numeral(n, b)}${sub(b)}`);

/** A digit string with its base, for strings that are not a tidy numeral (slips). */
const stringTex = (s: string, b: number) => `${s}${sub(b)}`;

/** A binary string in groups of `size` from the right, thin spaces between. */
function grouped(bits: string, size: number): string {
  const out: string[] = [];
  for (let end = bits.length; end > 0; end -= size) out.unshift(bits.slice(Math.max(0, end - size), end));
  return out.join('\\,');
}

/** The binary string padded on the left to whole groups of `size`. */
function padded(bits: string, size: number): string {
  const extra = (size - (bits.length % size)) % size;
  return '0'.repeat(extra) + bits;
}

const baseName = (b: number) => (b === 2 ? 'binary' : b === 8 ? 'octal' : b === 16 ? 'hexadecimal' : `base $${b}$`);

/** A table of place values over digits. */
function placeArray(n: number, b: number): string {
  const ds = digitsOf(n, b);
  const places = ds.map((_, i) => b ** (ds.length - 1 - i));
  // Eight columns run a few pixels past a phone's display box at full size.
  return `${ds.length >= 8 ? '\\small ' : ''}\\begin{array}{${'c'.repeat(ds.length)}} ${places.join(' & ')} \\\\ \\hline ${ds.map(digitTex).join(' & ')} \\end{array}`;
}

/** Terms in rows of `per`, the later rows opening with `+`, for an aligned block. */
function termRows(terms: string[], per: number, first: string): string[] {
  const rows: string[] = [];
  for (let i = 0; i < terms.length; i += per) rows.push(terms.slice(i, i + per).join(' + '));
  return rows.map((row, i) => (i === 0 ? `&${first}${row}` : `&\\quad + ${row}`));
}

/** Working for a numeral in base b turned into denary. */
function toDenarySteps(n: number, b: number): SolutionStep[] {
  const ds = digitsOf(n, b);
  const places = ds.map((_, i) => b ** (ds.length - 1 - i));
  const used = ds.map((d, i) => ({ d, p: places[i] })).filter(({ d }) => d > 0);
  const rows =
    b === 2
      ? termRows(used.map(({ p }) => String(p)), 3, '')
      : [
          ...termRows(used.map(({ d, p }) => `${d} \\times ${p}`), 2, ''),
          ...(used.length > 1 ? termRows(used.map(({ d, p }) => String(d * p)), 3, '= ') : []),
        ];
  const letters = ds.filter((d) => d >= 10);
  return [
    { text: 'Write each place value above its digit:' },
    { tex: placeArray(n, b) },
    {
      text:
        b === 2
          ? 'Add the place values that have a $1$ under them:'
          : `Each digit is worth the digit times its place value${letters.length > 0 ? `, with ${[...new Set(letters)].map((d) => `$${digitTex(d)} = ${d}$`).join(' and ')}` : ''}:`,
    },
    { tex: `\\begin{aligned} ${rows.join(' \\\\ ')} \\\\ &= ${n} \\end{aligned}` },
  ];
}

/** Working for n divided by b again and again, then read upward. */
function divisionSteps(n: number, b: number): SolutionStep[] {
  const lines: string[] = [];
  for (let x = n; x > 0; x = Math.floor(x / b)) {
    lines.push(`${x} = ${Math.floor(x / b)} \\times ${b} + ${digitTex(x % b)}`);
  }
  return [
    { text: `Divide by $${b}$ again and again, keeping each remainder:` },
    { tex: `\\begin{gathered} ${lines.join(' \\\\ ')} \\end{gathered}` },
    {
      text: `Read the remainders from the **bottom up**: $${n} = ${numTex(n, b)}$.${b === 16 ? ' A remainder from $10$ to $15$ is written as a letter.' : ''}`,
    },
  ];
}

/** Numbers near a value, for topping up a set of slips that collided. */
function near(value: number, count: number): number[] {
  const out: number[] = [];
  for (let gap = 1; out.length < count; gap += 1) out.push(value + gap, value - gap);
  return out.slice(0, count);
}

/** Four whole-number options: the answer and the first three distinct slips in [min, max]. */
function intOptions(correct: number, slips: number[], min = 0, max = 999): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of [...slips, ...near(correct, 12)]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || value < min || value > max || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  return options(
    { tex: String(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: String(value), answer: String(value) })),
  );
}

/** Is s a numeral in base b with no leading zero? */
const isNumeral = (s: string, b: number) =>
  s.length > 0 && (s === '0' || s[0] !== '0') && [...s].every((c) => parseInt(c, 16) < b);

/**
 * Four numeral options in base b (at most 9): the answer, then the first three
 * slips that are proper numerals worth something else, topped up with the
 * numerals of nearby numbers.
 */
function numeralOptions(n: number, b: number, slips: string[]): ChoiceOption[] {
  const correct = numeral(n, b);
  const values = new Set([n]);
  const picked: string[] = [];
  const fallback = near(n, 12).filter((v) => v > 0).map((v) => numeral(v, b));
  for (const s of [...slips, ...fallback]) {
    if (picked.length === 3) break;
    if (!isNumeral(s, b)) continue;
    const value = parseInt(s, b);
    if (values.has(value)) continue;
    values.add(value);
    picked.push(s);
  }
  return options(
    { tex: stringTex(correct, b), answer: correct },
    ...picked.sort((x, y) => parseInt(x, b) - parseInt(y, b)).map((s) => ({ tex: stringTex(s, b), answer: s })),
  );
}

/** A typed answer: digits only, no extra keys, compared by value. */
function typed(prompt: string[], lead: string, answer: string) {
  return {
    kind: 'expression' as const,
    prompt: prompt.map(say),
    lead,
    keypad: [],
    answer,
    domain: 'real' as const,
    mode: 'exact' as const,
  };
}

/** A whole number in [lo, hi] meeting `ok`. */
function drawWhere(rng: Rng, lo: number, hi: number, ok: (n: number) => boolean = () => true): number {
  for (;;) {
    const n = rng.int(lo, hi);
    if (ok(n)) return n;
  }
}

const reversed = (s: string) => [...s].reverse().join('').replace(/^0+(?=.)/, '');

const bitCount = (n: number) => digitsOf(n, 2).filter((d) => d === 1).length;

/* ================================================================
 * Lesson 1: reading binary
 * ================================================================ */

interface WorthParams {
  n: number;
  /** Places from the right, 0 for the units. */
  pos: number;
}

const baseBinWorth: Generator<WorthParams> = {
  id: 'base-bin-worth',
  sample(rng, difficulty) {
    const n = difficulty >= 2 ? rng.int(32, 255) : rng.int(8, 31);
    const ones = range(1, digitsOf(n, 2).length - 1).filter((p) => (n >> p) & 1);
    const pos = ones.length > 0 ? rng.pick(ones) : digitsOf(n, 2).length - 1;
    return { n, pos };
  },
  choices({ n, pos }) {
    return intOptions(2 ** pos, [pos, 2 ** (pos + 1), 2 ** (pos - 1), 2 * pos, n], 1);
  },
  render({ n, pos }) {
    const bits = numeral(n, 2);
    const at = bits.length - 1 - pos;
    const tex = `${bits.slice(0, at)}\\underline{1}${bits.slice(at + 1)}_2`;
    return typed([`What is the underlined digit of $${tex}$ worth in denary?`], '\\text{worth} =', String(2 ** pos));
  },
  solution({ n, pos }) {
    return [
      { text: 'The place values double from the right: $1, 2, 4, 8, \\dots$' },
      { tex: placeArray(n, 2) },
      {
        text: `The underlined digit is in the $${2 ** pos}$ column, ${pos} ${pos === 1 ? 'place' : 'places'} from the right, and it is a $1$: it is worth $${2 ** pos}$.`,
      },
    ];
  },
};

interface TableParams {
  n: number;
  b: number;
}

/** What each digit is worth, then the total, as a table. */
function worthTable(id: string, sample: (rng: Rng, difficulty: number) => TableParams): Generator<TableParams> {
  return {
    id,
    sample,
    render({ n, b }) {
      const ds = digitsOf(n, b);
      const places = ds.map((_, i) => b ** (ds.length - 1 - i));
      const worths = ds.map((d, i) => d * places[i]);
      const answer = [...worths, n];
      const slips = [
        ...ds.map((d, i) => d + places[i]),
        ...places,
        n + 1,
        n - 1,
        parseInt(reversed(numeral(n, b)), b),
        ds.reduce((s, d) => s + d, 0),
      ];
      return {
        kind: 'table',
        prompt: [say(`Fill in what each digit of $${numTex(n, b)}$ is worth, then the total in denary.`)],
        columns: ['\\text{place}', '\\text{digit}', '\\text{worth}'],
        rows: [...ds.map((d, i) => [String(places[i]), String(d), null]), ['\\text{total}', '', null]],
        bank: treeBank(answer, slips),
        answer: answer.map(String),
      };
    },
    solution({ n, b }) {
      const ds = digitsOf(n, b);
      const places = ds.map((_, i) => b ** (ds.length - 1 - i));
      return [
        { text: 'Each digit is worth the digit times its place value:' },
        ...ds.map((d, i) => ({ tex: `${d} \\times ${places[i]} = ${d * places[i]}` })),
        { text: `Adding those, $${numTex(n, b)} = ${n}$.` },
      ];
    },
  };
}

const baseBinTable = worthTable('base-bin-table', (rng, difficulty) => ({
  n: difficulty >= 2 ? rng.int(41, 127) : rng.int(9, 40),
  b: 2,
}));

/** A numeral in base b turned into denary, typed. */
function toDenary(id: string, sample: (rng: Rng, difficulty: number) => TableParams): Generator<TableParams> {
  return {
    id,
    sample,
    choices({ n, b }) {
      const s = numeral(n, b);
      const plain = /^\d+$/.test(s) ? Number(s) : -1;
      return intOptions(n, [n * b, parseInt(reversed(s), b), plain, digitsOf(n, b).reduce((t, d) => t + d, 0), n + b, n - 1], 1);
    },
    render({ n, b }) {
      return typed([`Write $${numTex(n, b)}$ in denary.`], `${numTex(n, b)} =`, String(n));
    },
    solution: ({ n, b }) => toDenarySteps(n, b),
  };
}

const baseBinToDen = toDenary('base-bin-to-den', (rng, difficulty) => ({
  n: difficulty >= 2 ? rng.int(64, 255) : rng.int(9, 63),
  b: 2,
}));

interface DoubleParams {
  n: number;
}

/** Running totals reading left to right: double, then add the next digit. */
function runningTotals(n: number): number[] {
  const out: number[] = [];
  for (const d of digitsOf(n, 2)) out.push(out.length === 0 ? d : 2 * out[out.length - 1] + d);
  return out;
}

const baseBinDouble: Generator<DoubleParams> = {
  id: 'base-bin-double',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? rng.int(41, 200) : rng.int(9, 40) };
  },
  render({ n }) {
    const ds = digitsOf(n, 2);
    const run = runningTotals(n);
    const answer = run.slice(1);
    const slips = run.flatMap((r, i) => (i === 0 ? [] : [2 * run[i - 1], run[i - 1] + ds[i], r + 1, 2 * r]));
    return {
      kind: 'table',
      prompt: [
        say(`Read $${numeral(n, 2)}_2$ from the left: double the running total, then add the next digit.`),
      ],
      columns: ['\\text{digit}', '\\text{running total}'],
      rows: ds.map((d, i) => [String(d), i === 0 ? '1' : null]),
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution({ n }) {
    const ds = digitsOf(n, 2);
    const run = runningTotals(n);
    return [
      { text: 'Start with the first digit, $1$. Then for each digit after it:' },
      ...run.slice(1).map((r, i) => ({ tex: `2 \\times ${run[i]} + ${ds[i + 1]} = ${r}` })),
      { text: `So $${numeral(n, 2)}_2 = ${n}$.` },
    ];
  },
};

/** Which binary numeral is a given number: reading each option. */
const baseBinWhich: Generator<DoubleParams> = {
  id: 'base-bin-which',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? rng.int(64, 255) : rng.int(9, 63) };
  },
  render({ n }) {
    const s = numeral(n, 2);
    const opts = numeralOptions(n, 2, [
      reversed(s),
      numeral(n ^ 2, 2),
      numeral(n + 1, 2),
      numeral(n ^ (1 << (s.length - 2)), 2),
      numeral(n - 1, 2),
    ]);
    const labels = opts.map((o) => o.tex);
    return choiceSlide([say(`Which of these binary numbers is $${n}$?`)], labels[0], labels.slice(1));
  },
  solution({ n }) {
    return [{ text: `Read each option by its place values. The right one is $${numTex(n, 2)}$:` }, ...toDenarySteps(n, 2).slice(1)];
  },
};

/* ================================================================
 * Lesson 2: writing in binary
 * ================================================================ */

interface NParams {
  n: number;
}

const powerBelow = (n: number) => 2 ** Math.floor(Math.log2(n));

const baseBiggestPower: Generator<NParams> = {
  id: 'base-biggest-power',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? rng.int(101, 999) : rng.int(5, 100) };
  },
  choices({ n }) {
    const p = powerBelow(n);
    return intOptions(p, [2 * p, p / 2, n - p, Math.floor(Math.log2(n))], 1);
  },
  render({ n }) {
    return typed([`What is the biggest power of $2$ that is not more than $${n}$?`], '\\text{power} =', String(powerBelow(n)));
  },
  solution({ n }) {
    const p = powerBelow(n);
    const list = [];
    for (let q = 1; q <= p; q *= 2) list.push(q);
    return [
      { text: 'Double from $1$ until the next doubling would pass the number:' },
      { tex: stackTex(list.join(', ')) },
      {
        text:
          p === n
            ? `$${n}$ is itself a power of $2$, so the answer is $${n}$.`
            : `The next one, $${2 * p}$, is more than $${n}$, so the biggest is $${p}$.`,
      },
    ];
  },
};

/** The powers of 2 taken from n, biggest first, and what is left after each. */
function takeAway(n: number): { power: number; left: number }[] {
  const out: { power: number; left: number }[] = [];
  for (let left = n; left > 0; ) {
    const power = powerBelow(left);
    left -= power;
    out.push({ power, left });
  }
  return out;
}

const basePowersTable: Generator<NParams> = {
  id: 'base-powers-table',
  sample(rng, difficulty) {
    const [lo, hi] = difficulty >= 2 ? [64, 255] : [9, 63];
    return { n: drawWhere(rng, lo, hi, (n) => bitCount(n) >= 2) };
  },
  render({ n }) {
    const run = takeAway(n);
    const answer = run.flatMap(({ power, left }) => [power, left]);
    const slips = run.flatMap(({ power, left }) => [2 * power, left + power, power / 2, left + 1]);
    return {
      kind: 'table',
      prompt: [
        say(`Take the biggest power of $2$ you can from $${n}$, then again from what is left, until nothing is left.`),
      ],
      columns: ['\\text{power taken}', '\\text{remaining}'],
      rows: run.map(() => [null, null]),
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution({ n }) {
    const run = takeAway(n);
    let from = n;
    const lines = run.map(({ power, left }) => {
      const line = `${from} - ${power} = ${left}`;
      from = left;
      return line;
    });
    return [
      { tex: `\\begin{gathered} ${lines.join(' \\\\ ')} \\end{gathered}` },
      { text: 'So the number is the sum of the powers taken:' },
      {
        tex: `\\begin{aligned} ${n} ${termRows(run.map(({ power }) => String(power)), 3, '= ').join(' \\\\ ')} \\end{aligned}`,
      },
      { text: `A $1$ goes under each of those powers and a $0$ under the rest: $${n} = ${numTex(n, 2)}$.` },
    ];
  },
};

/** n divided by b again and again: each row's number and its remainder. */
function divisionRows(n: number, b: number): { x: number; r: number }[] {
  const out: { x: number; r: number }[] = [];
  for (let x = n; x > 0; x = Math.floor(x / b)) out.push({ x, r: x % b });
  return out;
}

function divideTable(id: string, sample: (rng: Rng, difficulty: number) => TableParams): Generator<TableParams> {
  return {
    id,
    sample,
    render({ n, b }) {
      const rows = divisionRows(n, b);
      const answer = rows.flatMap(({ x, r }, i) => (i === 0 ? [r] : [x, r]));
      const slips = rows.flatMap(({ x }) => [Math.ceil(x / b), x - b, Math.floor(x / b) + 1]);
      return {
        kind: 'table',
        prompt: [
          say(
            `Divide $${n}$ by $${b}$ again and again. Each number is the one above divided by $${b}$, rounded down, with its remainder beside it. Stop at a number below $${b}$.`,
          ),
        ],
        columns: ['\\text{number}', '\\text{remainder}'],
        rows: rows.map((_, i) => [i === 0 ? String(n) : null, null]),
        bank: treeBank(answer, slips),
        answer: answer.map(String),
      };
    },
    solution: ({ n, b }) => divisionSteps(n, b),
  };
}

const baseHalvingTable = divideTable('base-halving-table', (rng, difficulty) => ({
  n: difficulty >= 2 ? rng.int(41, 127) : rng.int(9, 40),
  b: 2,
}));

/** Denary into base b (at most 9), typed as a digit string. */
function fromDenary(id: string, sample: (rng: Rng, difficulty: number) => TableParams): Generator<TableParams> {
  return {
    id,
    sample,
    choices({ n, b }) {
      const s = numeral(n, b);
      const dropZero = s.includes('0') ? s.replace(/0(?=[^0]*$)/, '') : `${s}0`;
      return numeralOptions(n, b, [reversed(s), dropZero, numeral(n + b, b), numeral(n - 1, b)]);
    },
    render({ n, b }) {
      return typed([`Write $${n}$ in ${baseName(b)}.`], b === 2 ? '\\text{binary:}' : `\\text{base } ${b}\\text{:}`, numeral(n, b));
    },
    solution: ({ n, b }) => divisionSteps(n, b),
  };
}

const baseDenToBin = fromDenary('base-den-to-bin', (rng, difficulty) => ({
  n: difficulty >= 2 ? rng.int(64, 255) : rng.int(9, 63),
  b: 2,
}));

/* ================================================================
 * Lesson 3: other bases
 * ================================================================ */

/** A base from 3 to 9 and a number with between `lo` and `hi` digits in it, under `cap`. */
function inBase(rng: Rng, bases: number[], lo: number, hi: number, cap: number, floor = 5): TableParams {
  for (;;) {
    const b = rng.pick(bases);
    const n = rng.int(Math.max(floor, b ** (lo - 1)), Math.min(cap, b ** hi - 1));
    const length = digitsOf(n, b).length;
    if (length >= lo && length <= hi) return { n, b };
  }
}

const BASES = range(3, 9);

const baseWorthTable = worthTable('base-worth-table', (rng, difficulty) =>
  difficulty >= 2 ? inBase(rng, BASES, 4, 4, 999) : inBase(rng, BASES, 3, 3, 200),
);

const baseToDen = toDenary('base-to-den', (rng, difficulty) =>
  difficulty >= 2 ? inBase(rng, BASES, 3, 4, 999, 50) : inBase(rng, BASES, 2, 3, 150),
);

const baseDivideTable = divideTable('base-divide-table', (rng, difficulty) =>
  difficulty >= 2 ? inBase(rng, BASES, 3, 4, 500, 100) : inBase(rng, BASES, 2, 3, 99, 10),
);

const baseFromDen = fromDenary('base-from-den', (rng, difficulty) =>
  difficulty >= 2 ? inBase(rng, BASES, 3, 4, 700, 100) : inBase(rng, BASES, 2, 3, 99, 10),
);

interface ValidParams {
  b: number;
  /** The numeral that is allowed first, then three that are not. */
  nums: string[];
}

const baseValidDigits: Generator<ValidParams> = {
  id: 'base-valid-digits',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const b = hard ? rng.int(5, 9) : rng.int(3, 6);
      const length = hard ? 4 : 3;
      const draw = (top: number) => range(1, length).map((i) => (i === 1 ? rng.int(1, top) : rng.int(0, top)));
      const good = draw(b - 1).join('');
      const bad: string[] = [];
      // The first slip holds the digit b itself, the commonest mistake;
      // the others hold something from b up to 9.
      for (let k = 0; k < 3; k += 1) {
        const ds = draw(b - 1);
        const at = rng.int(0, length - 1);
        ds[at] = k === 0 ? b : rng.int(b, 9);
        bad.push(ds.join(''));
      }
      const all = [good, ...bad];
      if (new Set(all).size !== 4) continue;
      return { b, nums: all };
    }
  },
  render({ b, nums }) {
    return choiceSlide([say(`Which of these could be a number written in base $${b}$?`)], nums[0], nums.slice(1));
  },
  solution({ b, nums }) {
    const [good, ...bad] = nums;
    return [
      { text: `Base $${b}$ uses only the digits $0$ to $${b - 1}$.` },
      ...bad.map((s) => {
        const big = [...s].map(Number).filter((d) => d >= b);
        return { text: `$${s}$ has the digit $${Math.max(...big)}$, which is not allowed.` };
      }),
      { text: `Every digit of $${good}$ is below $${b}$, so it is the one.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: octal and hexadecimal
 * ================================================================ */

const hasLetter = (n: number) => digitsOf(n, 16).some((d) => d >= 10);

const baseHexToDen = toDenary('base-hex-to-den', (rng, difficulty) => ({
  n: difficulty >= 2 ? drawWhere(rng, 256, 999, hasLetter) : drawWhere(rng, 26, 255, hasLetter),
  b: 16,
}));

/** Hex digit tokens for a bank. */
const hexTokens = (ds: number[]) => ds.map(digitTex);

const baseDenToHex: Generator<NParams> = {
  id: 'base-den-to-hex',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? drawWhere(rng, 256, 999, hasLetter) : drawWhere(rng, 26, 255, hasLetter) };
  },
  render({ n }) {
    const ds = digitsOf(n, 16);
    const answer = hexTokens(ds);
    const distractors = [
      ...ds.filter((d) => d >= 10).map(String),
      ...ds.map((d) => digitTex((d + 1) % 16)),
      ...ds.map((d) => digitTex((d + 15) % 16)),
      ...digitsOf(n, 10).map(String),
    ];
    const blanks = ds.map((_, i) => `{${i}}`).join('');
    return {
      kind: 'tiles',
      prompt: [
        say(
          ds.length > 2
            ? `Write $${n}$ in hexadecimal. Divide by $16$ again and again; a remainder from $10$ to $15$ is a letter.`
            : `Write $${n}$ in hexadecimal. Divide by $16$; a remainder from $10$ to $15$ is a letter.`,
        ),
      ],
      template: `${n} = ${blanks}\\ \\text{in hex}`,
      bank: fillBank(answer, distractors, 2, 4),
      answer,
    };
  },
  solution: ({ n }) => divisionSteps(n, 16),
};

interface GroupParams {
  n: number;
  b: 8 | 16;
}

const groupSize = (b: 8 | 16) => (b === 8 ? 3 : 4);

/** Group a binary string from the left instead, without padding: the slip. */
function groupedFromLeft(bits: string, size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += size) out.push(parseInt(bits.slice(i, i + size), 2));
  return out;
}

function binaryGroups(id: string, b: 8 | 16): Generator<GroupParams> {
  return {
    id,
    sample(rng, difficulty) {
      const hard = difficulty >= 2;
      const n =
        b === 16
          ? hard
            ? rng.int(256, 1023)
            : rng.int(20, 255)
          : hard
            ? rng.int(64, 511)
            : rng.int(9, 63);
      return { n, b };
    },
    render({ n, b }) {
      const size = groupSize(b);
      const bits = numeral(n, 2);
      const ds = digitsOf(n, b);
      const answer = ds.map(digitTex);
      const slips = [
        ...groupedFromLeft(bits, size).filter((d) => d < b).map(digitTex),
        ...ds.filter((d) => d >= 10).map(String),
        ...ds.map((d) => digitTex((d + 1) % b)),
        ...ds.map((d) => digitTex((d + b - 1) % b)),
      ];
      const blanks = ds.map((_, i) => `{${i}}`).join('');
      return {
        kind: 'tiles',
        prompt: [
          say(
            `Write $${bits}_2$ in ${b === 8 ? 'octal' : 'hexadecimal'}: split it into groups of ${size === 3 ? 'three' : 'four'} digits from the **right**, and write each group as one digit.`,
          ),
        ],
        template: `${bits}_2 = ${blanks}\\ \\text{in ${b === 8 ? 'octal' : 'hex'}}`,
        bank: fillBank(answer, slips, 2, 4),
        answer,
      };
    },
    solution({ n, b }) {
      const size = groupSize(b);
      const bits = padded(numeral(n, 2), size);
      const groups: string[] = [];
      for (let i = 0; i < bits.length; i += size) groups.push(bits.slice(i, i + size));
      return [
        {
          text: `Group from the right in ${size === 3 ? 'threes' : 'fours'}, padding the left group with zeros:`,
        },
        { tex: groups.join('\\ \\ ') },
        { text: 'Each group is one digit:' },
        ...groups.map((g) => ({ tex: `${g} \\to ${digitTex(parseInt(g, 2))}` })),
        { text: `So $${numeral(n, 2)}_2 = ${numTex(n, b)}$.` },
      ];
    },
  };
}

const baseBinToHex = binaryGroups('base-bin-to-hex', 16);
const baseBinToOct = binaryGroups('base-bin-to-oct', 8);

const baseHexToBin: Generator<NParams> = {
  id: 'base-hex-to-bin',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? drawWhere(rng, 256, 999, hasLetter) : rng.int(20, 255) };
  },
  render({ n }) {
    const ds = digitsOf(n, 16);
    const correct = numeral(n, 2);
    // Slips: a group's leading zeros dropped, the groups swapped, a group's
    // bits read backwards, and a digit one out.
    const unpadded = ds.map((d) => d.toString(2)).join('');
    const swapped = parseInt([...ds].reverse().map(digitChar).join(''), 16);
    const flipped = parseInt(ds.map((d) => [...padded(d.toString(2), 4)].reverse().join('')).join(''), 2);
    const candidates = [parseInt(unpadded, 2), swapped, flipped, n + 1, n - 1, n + 16, n - 16, n + 2];
    const wrong: string[] = [];
    const seen = new Set([n]);
    for (const value of candidates) {
      if (wrong.length === 3) break;
      if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
      seen.add(value);
      wrong.push(numeral(value, 2));
    }
    const label = (bits: string) => `${grouped(bits, 4)}_2`;
    return choiceSlide([say(`Which binary number is $${numTex(n, 16)}$?`)], label(correct), wrong.map(label));
  },
  solution({ n }) {
    const ds = digitsOf(n, 16);
    return [
      { text: 'Each hex digit is exactly four binary digits, zeros kept:' },
      ...ds.map((d) => ({ tex: `${d > 9 ? `${digitTex(d)} = ${d}` : d} \\to ${padded(d.toString(2), 4)}` })),
      { text: 'Put the groups side by side and drop any zeros at the very front:' },
      { tex: `\\begin{gathered} ${numTex(n, 16)} \\\\ = ${grouped(numeral(n, 2), 4)}_2 \\end{gathered}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: adding in binary
 * ================================================================ */

interface PairParams {
  a: number;
  b: number;
}

/** Carries into each column from the right (index 0 the units), and the sum's digits. */
function columnAdd(a: number, b: number): { carries: number[]; sum: number[]; width: number } {
  const width = digitsOf(a + b, 2).length;
  const carries = [0];
  const sum: number[] = [];
  for (let i = 0; i < width; i += 1) {
    const total = ((a >> i) & 1) + ((b >> i) & 1) + carries[i];
    sum.push(total % 2);
    carries.push(total >> 1);
  }
  return { carries: carries.slice(0, width), sum, width };
}

const baseAddTable: Generator<PairParams> = {
  id: 'base-add-table',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const a = hard ? rng.int(16, 31) : rng.int(8, 15);
      const b = hard ? rng.int(5, 31) : rng.int(3, 15);
      if ((a & b) === 0) continue;
      return { a, b };
    }
  },
  render({ a, b }) {
    const { carries, sum, width } = columnAdd(a, b);
    // Columns left to right: the most significant first.
    const cols = range(0, width - 1).reverse();
    const cell = (x: number, i: number) => (i < digitsOf(x, 2).length ? String((x >> i) & 1) : '');
    const carryRow = cols.map((i) => (i === 0 ? '' : null));
    const answer = [...cols.filter((i) => i > 0).map((i) => String(carries[i])), ...cols.map((i) => String(sum[i]))];
    // A 2 or a 3 is what a column adds to before the carry is taken out.
    const bank = [...answer, '2', '3'].sort();
    return {
      kind: 'table',
      prompt: [
        say(`Add $${numeral(a, 2)}_2 + ${numeral(b, 2)}_2$ in columns, from the right. Fill in each carry, then each digit of the sum.`),
      ],
      columns: ['', ...cols.map((i) => String(2 ** i))],
      rows: [
        ['', ...cols.map((i) => cell(a, i))],
        ['+', ...cols.map((i) => cell(b, i))],
        ['\\scriptsize\\text{carry}', ...carryRow],
        ['\\scriptsize\\text{sum}', ...cols.map(() => null)],
      ],
      bank,
      answer,
    };
  },
  solution({ a, b }) {
    const { carries, sum, width } = columnAdd(a, b);
    const steps: SolutionStep[] = [{ text: 'Column by column from the right, adding in any carry:' }];
    for (let i = 0; i < width; i += 1) {
      const parts = [(a >> i) & 1, (b >> i) & 1, carries[i]];
      const total = parts[0] + parts[1] + parts[2];
      steps.push({
        text: `The $${2 ** i}$ column: $${parts.join(' + ')} = ${total}$, so write $${sum[i]}$${total >= 2 ? ' and carry $1$' : ''}.`,
      });
    }
    steps.push({ text: `So $${numeral(a, 2)}_2 + ${numeral(b, 2)}_2 = ${numeral(a + b, 2)}_2$: $${a} + ${b} = ${a + b}$.` });
    return steps;
  },
};

const baseBinAdd: Generator<PairParams> = {
  id: 'base-bin-add',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const a = hard ? rng.int(16, 63) : rng.int(4, 15);
      const b = hard ? rng.int(5, 63) : rng.int(3, 15);
      if ((a & b) === 0) continue;
      return { a, b };
    }
  },
  choices({ a, b }) {
    return numeralOptions(a + b, 2, [numeral(a ^ b, 2), numeral(a | b, 2), numeral(a + b + 1, 2), numeral(a + b - 1, 2)]);
  },
  render({ a, b }) {
    const line = `${numeral(a, 2)}_2 + ${numeral(b, 2)}_2`;
    return typed([`Work out $${line}$ in binary.`], `${line} =`, numeral(a + b, 2));
  },
  solution: (params) => baseAddTable.solution(params),
};

/** Borrows in a - b column by column: the digits of the difference. */
function columnSubtract(a: number, b: number): { borrowed: boolean[]; diff: number[] } {
  const width = digitsOf(a, 2).length;
  const borrowed: boolean[] = [];
  const diff: number[] = [];
  let borrow = 0;
  for (let i = 0; i < width; i += 1) {
    let top = ((a >> i) & 1) - borrow;
    const bottom = (b >> i) & 1;
    borrow = top < bottom ? 1 : 0;
    if (borrow) top += 2;
    borrowed.push(borrow === 1);
    diff.push(top - bottom);
  }
  return { borrowed, diff };
}

const baseBinSubtract: Generator<PairParams> = {
  id: 'base-bin-subtract',
  sample(rng, difficulty) {
    const hard = difficulty >= 2;
    for (;;) {
      const a = hard ? rng.int(32, 63) : rng.int(8, 15);
      const b = rng.int(hard ? 5 : 3, a - 1);
      // At least one borrow: a column with 0 on top and 1 below.
      if ((~a & b) === 0) continue;
      return { a, b };
    }
  },
  choices({ a, b }) {
    return numeralOptions(a - b, 2, [numeral(a ^ b, 2), numeral(a - b + 1, 2), numeral(a - b - 1, 2), numeral(a + b, 2)]);
  },
  render({ a, b }) {
    const line = `${numeral(a, 2)}_2 - ${numeral(b, 2)}_2`;
    return typed([`Work out $${line}$ in binary.`], `${line} =`, numeral(a - b, 2));
  },
  solution({ a, b }) {
    const { borrowed } = columnSubtract(a, b);
    const columns = borrowed.map((did, i) => (did ? `$${2 ** i}$` : '')).filter(Boolean);
    return [
      { text: 'Subtract column by column from the right. Where the top digit is too small, borrow $1$ from the next column: it is worth $10_2$, which is $2$, here.' },
      { text: `A borrow happens in the ${columns.join(', ')} ${columns.length === 1 ? 'column' : 'columns'}.` },
      { tex: `\\begin{gathered} ${numeral(a, 2)}_2 - ${numeral(b, 2)}_2 \\\\ = ${numeral(a - b, 2)}_2 \\end{gathered}` },
      { text: `Check in denary: $${a} - ${b} = ${a - b}$, and $${numeral(a - b, 2)}_2 = ${a - b}$.` },
    ];
  },
};

interface ShiftParams {
  a: number;
  k: number;
}

const baseShift: Generator<ShiftParams> = {
  id: 'base-shift',
  sample(rng, difficulty) {
    if (difficulty < 2) return { a: rng.int(5, 31), k: 1 };
    // Eight binary digits at most, like every typed answer here.
    const k = rng.int(2, 3);
    return { a: rng.int(5, 255 >> k), k };
  },
  choices({ a, k }) {
    const s = numeral(a, 2);
    return numeralOptions(a * 2 ** k, 2, [`${s}${'0'.repeat(k + 1)}`, `${s}${'0'.repeat(k - 1)}`, `${s}1${'0'.repeat(k - 1)}`, s]);
  },
  render({ a, k }) {
    const line = `${numeral(a, 2)}_2 \\times 1${'0'.repeat(k)}_2`;
    return typed([`Work out $${line}$ in binary.`], `${line} =`, numeral(a * 2 ** k, 2));
  },
  solution({ a, k }) {
    return [
      { text: `$1${'0'.repeat(k)}_2 = ${2 ** k}$, and multiplying by $2$ moves every digit one place left.` },
      { text: `So write ${k === 1 ? 'one $0$' : `${k === 2 ? 'two' : 'three'} $0$s`} on the end:` },
      {
        tex: `\\begin{gathered} ${numeral(a, 2)}_2 \\times 1${'0'.repeat(k)}_2 \\\\ = ${numeral(a * 2 ** k, 2)}_2 \\end{gathered}`,
      },
      { text: `Check in denary: $${a} \\times ${2 ** k} = ${a * 2 ** k}$.` },
    ];
  },
};

export const numberBasesGenerators = [
  baseBinWorth,
  baseBinTable,
  baseBinToDen,
  baseBinDouble,
  baseBinWhich,
  baseBiggestPower,
  basePowersTable,
  baseHalvingTable,
  baseDenToBin,
  baseWorthTable,
  baseToDen,
  baseDivideTable,
  baseFromDen,
  baseValidDigits,
  baseHexToDen,
  baseDenToHex,
  baseBinToHex,
  baseBinToOct,
  baseHexToBin,
  baseAddTable,
  baseBinAdd,
  baseBinSubtract,
  baseShift,
];
