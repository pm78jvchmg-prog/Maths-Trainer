/**
 * Contest Math, level 21: More Advanced Combinatorics.
 *
 * Five lessons, each a counting move a step past Level 7 and Level 11:
 *
 * - constructive counting: build the object in an order that makes the rule
 *   automatic (place the others first and drop the kept-apart ones into the
 *   gaps; choose a set of digits and let the order be forced; four points
 *   make exactly one crossing);
 * - complementary counting: count what you do not want and take it away
 *   (numbers with no 7, routes through a closed corner, teams with no girls);
 * - binomial coefficients: a coefficient is a choice of brackets, a row of
 *   Pascal's triangle adds to a power of 2, and a diagonal adds up to the
 *   entry below it (the hockey stick);
 * - inclusion–exclusion with three sets and more: multiples of three
 *   numbers, derangements, and sharing different things so nobody is empty;
 * - balls and urns: minimums handed out first, odd parts halved, upper
 *   limits taken off by inclusion–exclusion, and a slack variable for "at
 *   most".
 *
 * Level 11 already asks routes through a checkpoint (`cm-grid-paths`) and the
 * plain share of sweets with or without a minimum of one (`cm-share-sweets`);
 * the questions here start where those stop. Shared helpers are in
 * `contestMath.ts`.
 */
import type { Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ================================================================
 * Shared pieces
 * ================================================================ */

function fact(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

/** n × (n − 1) × … taking k factors. */
function perm(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let out = 1;
  for (let i = 0; i < k; i += 1) out *= n - i;
  return out;
}

/** n choose k, exactly, for the small values asked here; 0 outside the triangle. */
function choose(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return 0;
  let out = 1;
  for (let i = 1; i <= k; i += 1) out = (out * (n - k + i)) / i;
  return Math.round(out);
}

const binom = (n: number | string, k: number | string) => `\\binom{${n}}{${k}}`;

/** `5 \\times 4 \\times 3`, the k factors of perm(n, k). */
const permTex = (n: number, k: number) =>
  Array.from({ length: k }, (_, i) => `${n - i}`).join(' \\times ');

/** c^e as TeX: a negative base in brackets, a first power written bare. */
function powTex(c: number, e: number): string {
  const base = c < 0 ? `(${c})` : `${c}`;
  return e === 1 ? base : `${base}^{${e}}`;
}

/** `x^{3}`, `x` for the first power, `1` for the zeroth. */
const xPow = (k: number) => (k === 0 ? '1' : k === 1 ? 'x' : `x^{${k}}`);

/** A number times something in TeX, a negative number in brackets. */
const factor = (v: number) => (v < 0 ? `(${v})` : `${v}`);

const distinct = (values: number[]) => new Set(values).size === values.length;

const WORD: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three', 4: 'four' };

/** Numbers too big to be a believable slip are dropped before they reach the options. */
const sane = (values: number[], limit: number) => values.filter((v) => Math.abs(v) <= limit);

/* ================================================================
 * Lesson 1: Constructive Counting
 * ================================================================ */

/* ---------- keep them apart: the others first, then the gaps ---------- */

const APART_ROWS = [
  {
    setup: (n: number, k: number) => `A row has ${n} chairs. ${k} of them are to be chosen so that no two chosen chairs are next to each other.`,
    ask: (k: number) => `In how many ways can the ${k} chairs be chosen?`,
    items: 'chairs',
  },
  {
    setup: (n: number, k: number) => `A street has ${n} houses in a row. ${k} of them are to be painted red, and no two red houses may be next door to each other.`,
    ask: () => 'In how many ways can the red houses be chosen?',
    items: 'houses',
  },
  {
    setup: (n: number, k: number) => `A row of ${n} lamps has exactly ${k} switched on, and no two lamps that are on sit side by side.`,
    ask: () => 'How many different patterns are possible?',
    items: 'lamps',
  },
];

const APART_PEOPLE = [
  {
    setup: (m: number, k: number) => `${m} boys and ${k} girls stand in a line. No two girls stand next to each other.`,
    ask: 'In how many orders can they stand?',
    others: 'boys',
    special: 'girls',
  },
  {
    setup: (m: number, k: number) => `${m} different novels and ${k} different atlases go on a shelf, with no two atlases side by side.`,
    ask: 'In how many orders can the books go?',
    others: 'novels',
    special: 'atlases',
  },
  {
    setup: (m: number, k: number) => `${m} adults and ${k} children queue for a ride, with no two children next to each other.`,
    ask: 'In how many orders can they queue?',
    others: 'adults',
    special: 'children',
  },
];

interface ApartParams {
  context: number;
  /** Difficulty 2: m different others and k different special ones, in order. */
  people: boolean;
  /** Difficulty 1: n places in the row, k of them chosen. */
  n: number;
  k: number;
  m: number;
}

function sampleApart(rng: Rng, difficulty: number): ApartParams {
  if (difficulty >= 2) {
    const m = rng.int(3, 6);
    const k = rng.int(2, Math.min(4, m));
    return { context: rng.int(0, APART_PEOPLE.length - 1), people: true, n: m + k, k, m };
  }
  for (;;) {
    const n = rng.int(7, 13);
    const k = rng.int(2, 4);
    if (n - k + 1 < k + 1) continue;
    return { context: rng.int(0, APART_ROWS.length - 1), people: false, n, k, m: n - k };
  }
}

const apartWays = (p: ApartParams) => (p.people ? fact(p.m) * perm(p.m + 1, p.k) : choose(p.n - p.k + 1, p.k));

function apartSolution(p: ApartParams): SolutionStep[] {
  const { n, k, m } = p;
  if (p.people) {
    const c = APART_PEOPLE[p.context];
    return [
      { text: `Put the ${m} ${c.others} in order first:` },
      { tex: `${m}! = ${fact(m)}` },
      { text: `They leave ${m + 1} gaps, counting both ends. Put the ${c.special} in different gaps, which keeps them apart. The ${c.special} are different, so the order they take the gaps in matters:` },
      { tex: `${permTex(m + 1, k)} = ${perm(m + 1, k)}` },
      { text: 'Every order of the first group goes with every placing of the second:' },
      { tex: `${fact(m)} \\times ${perm(m + 1, k)} = ${apartWays(p)}` },
    ];
  }
  const c = APART_ROWS[p.context];
  return [
    { text: `Line up the ${n - k} ${c.items} that are not chosen first. The chosen ones go in the gaps between them or at the two ends, at most one to a gap, which keeps them apart:` },
    { tex: `${n - k} + 1 = ${n - k + 1}` },
    { text: `Choose ${k} of those ${n - k + 1} gaps:` },
    { tex: `${binom(n - k + 1, k)} = ${apartWays(p)}` },
  ];
}

const cmAcNoAdjacent: Generator<ApartParams> = {
  id: 'cm-ac-no-adjacent',
  sample: sampleApart,
  render(p) {
    if (p.people) {
      const c = APART_PEOPLE[p.context];
      return typed([say(c.setup(p.m, p.k)), say(c.ask)], apartWays(p), '\\text{orders} =');
    }
    const c = APART_ROWS[p.context];
    return typed([say(c.setup(p.n, p.k)), say(c.ask(p.k))], apartWays(p), '\\text{ways} =');
  },
  choices(p) {
    const { n, k, m } = p;
    if (p.people) {
      return numberOptions(apartWays(p), [fact(m) * choose(m + 1, k), fact(m) * perm(m - 1, k), fact(m) * perm(m, k), perm(m + 1, k) * fact(k)], 1, 1);
    }
    return numberOptions(apartWays(p), [choose(n, k), choose(n - k - 1, k), choose(n - k, k), choose(n - 1, k)], 1, 1);
  },
  solution: apartSolution,
};

const cmAcGapsTable: Generator<ApartParams> = {
  id: 'cm-ac-gaps-table',
  sample(rng, difficulty) {
    for (;;) {
      const p = sampleApart(rng, difficulty);
      const values = p.people ? [fact(p.m), p.m + 1, perm(p.m + 1, p.k), apartWays(p)] : [p.n - p.k, p.n - p.k + 1, apartWays(p)];
      if (distinct(values)) return p;
    }
  },
  render(p) {
    const { n, k, m } = p;
    if (p.people) {
      const c = APART_PEOPLE[p.context];
      const answer = [fact(m), m + 1, perm(m + 1, k), apartWays(p)];
      return {
        kind: 'table',
        prompt: [say(c.setup(m, k)), say(`Count the orders in steps: the ${c.others} first, then the gaps they leave, then the ${c.special} in those gaps.`)],
        columns: ['\\text{step}', '\\text{count}'],
        rows: [
          [`\\text{order the ${c.others}}`, null],
          ['\\text{gaps}', null],
          [`\\text{place the ${c.special}}`, null],
          ['\\text{orders}', null],
        ],
        bank: numberBank(answer, [m, m + 2, fact(m + 1), choose(m + 1, k), perm(m, k), fact(m) * choose(m + 1, k)], 3, 1, 1),
        answer: answer.map(num),
      };
    }
    const c = APART_ROWS[p.context];
    const answer = [n - k, n - k + 1, apartWays(p)];
    return {
      kind: 'table',
      prompt: [say(c.setup(n, k)), say(`Count in steps: the ${c.items} not chosen, the gaps they leave (ends included), then the ways to choose.`)],
      columns: ['\\text{step}', '\\text{count}'],
      rows: [
        ['\\text{not chosen}', null],
        ['\\text{gaps}', null],
        ['\\text{ways}', null],
      ],
      bank: numberBank(answer, [n, n - k - 1, choose(n, k), choose(n - k, k), choose(n - k + 1, k - 1)], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution: apartSolution,
};

/* ---------- digits in order: choose the set, the order is forced ---------- */

interface OrderedDigitsParams {
  k: number;
  /** The largest digit allowed. */
  top: number;
  /** Difficulty 2: 0 is allowed as well. */
  zero: boolean;
  up: boolean;
}

/** How many digits the set can really be chosen from. */
const digitPool = ({ top, zero, up }: OrderedDigitsParams) => (zero && !up ? top + 1 : top);

const orderedCount = (p: OrderedDigitsParams) => choose(digitPool(p), p.k);

const cmAcIncreasingDigits: Generator<OrderedDigitsParams> = {
  id: 'cm-ac-increasing-digits',
  sample(rng, difficulty) {
    const up = rng.chance(0.5);
    if (difficulty >= 2) {
      const top = rng.int(4, 9);
      return { k: rng.int(2, Math.min(6, top - 1)), top, zero: true, up };
    }
    const top = rng.int(5, 9);
    return { k: rng.int(2, Math.min(5, top - 1)), top, zero: false, up };
  },
  render(p) {
    const from = p.zero ? 0 : 1;
    return typed(
      [
        say(`How many ${p.k}-digit numbers use only the digits ${from} to ${p.top}, with the digits getting ${p.up ? 'larger' : 'smaller'} from left to right?`),
      ],
      orderedCount(p),
      '\\text{numbers} =',
    );
  },
  choices(p) {
    const { k, top } = p;
    const pool = digitPool(p);
    const other = p.zero ? (p.up ? top + 1 : top) : top + 1;
    return numberOptions(orderedCount(p), [choose(other, k), perm(pool, k), choose(pool, k - 1), choose(pool - 1, k)], 1, 1);
  },
  solution(p) {
    const { k, top } = p;
    const steps: SolutionStep[] = [
      { text: `Choose which ${k} different digits appear. Once the set is chosen there is only one way to write it in ${p.up ? 'increasing' : 'decreasing'} order, so each set gives exactly one number.` },
    ];
    if (p.zero && p.up) {
      steps.push({ text: `In increasing order a $0$ would have to come first, and a number cannot start with $0$. So the set comes from $1$ to $${top}$:` });
    } else if (p.zero) {
      steps.push({ text: `In decreasing order a $0$ can only come last, which is allowed. So the set comes from all ${top + 1} digits $0$ to $${top}$:` });
    }
    steps.push({ tex: `${binom(digitPool(p), k)} = ${orderedCount(p)}` });
    return steps;
  },
};

/* ---------- four points, one crossing ---------- */

interface CrossingParams {
  n: number;
  /** 0: a polygon's diagonals (or chords); 1: points on a circle or a pizza. */
  context: number;
  /** Difficulty 2: count the regions, not the crossings. */
  regions: boolean;
}

const crossings = (n: number) => choose(n, 4);

const regionCount = (n: number) => 1 + choose(n, 2) + choose(n, 4);

const cmAcDiagonalCrossings: Generator<CrossingParams> = {
  id: 'cm-ac-diagonal-crossings',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { n: rng.int(6, 20), context: rng.int(0, 1), regions: true };
    return { n: rng.int(5, 20), context: rng.int(0, 1), regions: false };
  },
  render({ n, context, regions }) {
    if (regions) {
      if (context === 0) {
        return typed(
          [
            say(`${n} points are marked on a circle, and every pair of them is joined by a chord. No three chords meet at one point inside the circle.`),
            say('Into how many regions do the chords cut the inside of the circle?'),
          ],
          regionCount(n),
          '\\text{regions} =',
        );
      }
      return typed(
        [
          say(`${n} points are marked round the edge of a round pizza, and a straight cut is made between every pair of them. No three cuts meet at one point.`),
          say('How many pieces does the pizza end up in?'),
        ],
        regionCount(n),
        '\\text{pieces} =',
      );
    }
    if (context === 0) {
      return typed(
        [
          say(`Every diagonal of a convex polygon with ${n} sides is drawn, and no three diagonals meet at one point inside it.`),
          say('At how many points inside the polygon do two diagonals cross?'),
        ],
        crossings(n),
        '\\text{points} =',
      );
    }
    return typed(
      [
        say(`${n} points are marked on a circle, and every pair of them is joined by a chord. No three chords meet at one point inside the circle.`),
        say('At how many points inside the circle do two chords cross?'),
      ],
      crossings(n),
      '\\text{points} =',
    );
  },
  choices({ n, context, regions }) {
    if (regions) {
      const small = n <= 10 ? [2 ** (n - 1)] : [];
      return numberOptions(regionCount(n), [...small, choose(n, 2) + choose(n, 4), 1 + choose(n, 2), crossings(n) + n], 1, 1);
    }
    const lines = context === 0 ? (n * (n - 3)) / 2 : choose(n, 2);
    return numberOptions(crossings(n), sane([choose(lines, 2), choose(n, 3), lines, 2 * crossings(n)], 200000), 1, 1);
  },
  solution({ n, context, regions }) {
    const four: SolutionStep[] = [
      { text: `Any 4 of the ${n} points make a quadrilateral, and its two diagonals cross exactly once inside. Every crossing comes from one such set of 4: the ends of the two lines that cross. So count the sets of 4:` },
      { tex: `${binom(n, 4)} = ${crossings(n)}` },
    ];
    if (!regions) {
      if (context === 0) four[0] = { text: `Any 4 of the ${n} corners make a quadrilateral, and its two diagonals cross exactly once inside. Every crossing comes from one such set of 4: the ends of the two diagonals that cross. So count the sets of 4:` };
      return four;
    }
    const cut = context === 0 ? 'chord' : 'cut';
    return [
      { text: `Draw the ${cut}s one at a time. A ${cut} crossing $c$ of those already drawn is split into $c + 1$ pieces, and each piece divides one region in two. So each ${cut} adds one region, plus one for every crossing on it. Starting from one region:` },
      { tex: `\\text{regions} = {1 + \\text{${cut}s} + \\text{crossings}}` },
      { text: `Each pair of points makes a ${cut}, and each set of 4 points makes a crossing:` },
      { tex: `${binom(n, 2)} = ${choose(n, 2)}, \\qquad ${binom(n, 4)} = ${crossings(n)}` },
      { tex: `1 + ${choose(n, 2)} + ${crossings(n)} = ${regionCount(n)}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Complementary Counting
 * ================================================================ */

/* ---------- at least one: all, less none ---------- */

const REPEAT_CODES = [
  {
    setup: (a: number, n: number) => `A lock has ${a} buttons, numbered 1 to ${a}. A code is ${n} presses, and a button may be pressed more than once.`,
    ask: 'How many codes press some button more than once?',
    unit: 'press',
  },
  {
    setup: (a: number, n: number) => `A code is ${n} letters long, each letter one of the first ${a} letters of the alphabet, and letters may repeat.`,
    ask: 'How many codes use some letter more than once?',
    unit: 'letter',
  },
];

interface DigitParams {
  /**
   * 'digit': contains d at least once. 'parity': contains an even digit
   * (d = 0) or an odd one (d = 1). 'repeat': some symbol used twice.
   */
  kind: 'digit' | 'parity' | 'repeat';
  n: number;
  d: number;
  /** For 'repeat': -1 for n-digit numbers, else a code context. */
  context: number;
  /** Alphabet size for a code. */
  a: number;
}

const bigNumbers = (n: number) => 9 * 10 ** (n - 1);

function withoutCount(p: DigitParams): number {
  if (p.kind === 'digit') return p.d === 0 ? 9 ** p.n : 8 * 9 ** (p.n - 1);
  // No even digit: all five odd digits everywhere. No odd digit: 2, 4, 6 or 8 first.
  if (p.kind === 'parity') return p.d === 0 ? 5 ** p.n : 4 * 5 ** (p.n - 1);
  return p.context < 0 ? 9 * perm(9, p.n - 1) : perm(p.a, p.n);
}

const allCount = (p: DigitParams) => (p.kind === 'repeat' && p.context >= 0 ? p.a ** p.n : bigNumbers(p.n));

const containsCount = (p: DigitParams) => allCount(p) - withoutCount(p);

const cmAcContainsDigit: Generator<DigitParams> = {
  id: 'cm-ac-contains-digit',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      if (rng.chance(0.2)) return { kind: 'repeat', n: rng.int(3, 5), d: 0, context: -1, a: 10 };
      const a = rng.int(5, 9);
      return { kind: 'repeat', n: rng.int(3, 5), d: 0, context: rng.int(0, REPEAT_CODES.length - 1), a };
    }
    if (rng.chance(0.3)) return { kind: 'parity', n: rng.int(3, 5), d: rng.int(0, 1), context: -1, a: 10 };
    return { kind: 'digit', n: rng.int(3, 5), d: rng.int(0, 9), context: -1, a: 10 };
  },
  render(p) {
    if (p.kind === 'digit') {
      return typed([say(`How many ${p.n}-digit whole numbers contain the digit ${p.d} at least once?`)], containsCount(p), '\\text{numbers} =');
    }
    if (p.kind === 'parity') {
      return typed([say(`How many ${p.n}-digit whole numbers have at least one ${p.d === 0 ? 'even' : 'odd'} digit?`)], containsCount(p), '\\text{numbers} =');
    }
    if (p.context < 0) {
      return typed([say(`How many ${p.n}-digit whole numbers have at least two digits the same?`)], containsCount(p), '\\text{numbers} =');
    }
    const c = REPEAT_CODES[p.context];
    return typed([say(c.setup(p.a, p.n)), say(c.ask)], containsCount(p), '\\text{codes} =');
  },
  choices(p) {
    const { n, d, a } = p;
    if (p.kind === 'digit') {
      const places = d === 0 ? (n - 1) * 9 * 10 ** (n - 2) : 10 ** (n - 1) + (n - 1) * 9 * 10 ** (n - 2);
      const other = d === 0 ? bigNumbers(n) - 8 * 9 ** (n - 1) : bigNumbers(n) - 9 ** n;
      return numberOptions(containsCount(p), [places, other, 10 ** n - 9 ** n, withoutCount(p)], 1, 1);
    }
    if (p.kind === 'parity') {
      // Forgetting the first digit cannot be 0, and the other parity's answer.
      const slip = d === 0 ? 10 ** n - 5 ** n : bigNumbers(n) - 5 ** n;
      const otherParity = d === 0 ? bigNumbers(n) - 4 * 5 ** (n - 1) : bigNumbers(n) - 5 ** n;
      return numberOptions(containsCount(p), [slip, otherParity, withoutCount(p), 10 ** n - 5 ** n], 1, 1);
    }
    if (p.context < 0) {
      return numberOptions(containsCount(p), [withoutCount(p), 10 ** n - perm(10, n), bigNumbers(n) - 9 * 9 ** (n - 1), bigNumbers(n) - perm(10, n)], 1, 1);
    }
    return numberOptions(containsCount(p), [withoutCount(p), a ** n - a * (a - 1) ** (n - 1), a ** n - choose(a, n), a ** n - perm(a, n) - a], 1, 1);
  },
  solution(p) {
    const { n, d, a } = p;
    const total = allCount(p);
    const without = withoutCount(p);
    const steps: SolutionStep[] = [];
    if (p.kind === 'digit') {
      steps.push(
        { text: `Count the numbers with no ${d} and take them away from all ${n}-digit numbers. The first digit is 1 to 9 and the others 0 to 9:` },
        { tex: `9 \\times 10^{${n - 1}} = ${total}` },
      );
      if (d === 0) {
        steps.push({ text: 'With no $0$, every digit has $9$ choices, $1$ to $9$:' }, { tex: `9^{${n}} = ${without}` });
      } else {
        steps.push(
          { text: `With no ${d}, the first digit avoids both $0$ and $${d}$, so $8$ choices, and every other digit avoids $${d}$, so $9$ choices:` },
          { tex: `8 \\times 9^{${n - 1}} = ${without}` },
        );
      }
    } else if (p.kind === 'parity') {
      const want = d === 0 ? 'even' : 'odd';
      steps.push(
        { text: `Count the numbers with no ${want} digit and take them away from all ${n}-digit numbers:` },
        { tex: `9 \\times 10^{${n - 1}} = ${total}` },
      );
      if (d === 0) {
        steps.push(
          { text: 'With no even digit, every digit is one of $1, 3, 5, 7, 9$:' },
          { tex: `5^{${n}} = ${without}` },
        );
      } else {
        steps.push(
          { text: 'With no odd digit, every digit is one of $0, 2, 4, 6, 8$, but the first cannot be $0$, so it has only $4$ choices:' },
          { tex: `4 \\times 5^{${n - 1}} = ${without}` },
        );
      }
    } else if (p.context < 0) {
      steps.push(
        { text: `Count the numbers with every digit different and take them away from all ${n}-digit numbers:` },
        { tex: `9 \\times 10^{${n - 1}} = ${total}` },
        { text: 'All different: the first digit is $1$ to $9$, then $9$ digits are left for the next place (including $0$), then $8$, and so on:' },
        { tex: `9 \\times ${permTex(9, n - 1)} = ${without}` },
      );
    } else {
      const c = REPEAT_CODES[p.context];
      steps.push(
        { text: `Count the codes with every ${c.unit} different and take them away from all codes:` },
        { tex: `${a}^{${n}} = ${total}` },
        { text: 'All different:' },
        { tex: `${permTex(a, n)} = ${without}` },
      );
    }
    steps.push({ tex: `${total} - ${without} = ${containsCount(p)}` });
    return steps;
  },
};

/* ---------- routes that miss a closed corner ---------- */

const f1 = (v: number) => v.toFixed(1);

const line = (x1: number, y1: number, x2: number, y2: number, width = 2) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="currentColor" stroke-width="${width}" />`;

/** A point's name, italic like the $A$ and $B$ the prose sets in maths. */
const label = (x: number, y: number, text: string) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="16" font-style="italic" fill="currentColor" text-anchor="middle" dominant-baseline="middle">${text}</text>`;

const spot = (x: number, y: number) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="currentColor" />`;

/**
 * A closed corner: a disc in the page colour that cuts the street lines off
 * short of the crossing, ringed, with a cross inside. Drawn straight over the
 * lines, the old ring and cross read as a blurred asterisk at phone size.
 */
const closedMark = (x: number, y: number) =>
  [
    `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="var(--bg)" stroke="currentColor" stroke-width="2" />`,
    line(x - 4, y - 4, x + 4, y + 4, 2.5),
    line(x - 4, y + 4, x + 4, y - 4, 2.5),
  ].join('');

/**
 * A grid of streets `a` blocks across and `b` up, A bottom left and B top
 * right, with each closed corner ringed and crossed. A closed corner's letter
 * sits in the middle of the block up and to the left of it, clear of every
 * line and of any other letter.
 */
function closedGridSvg(a: number, b: number, closed: [number, number][]): string {
  const s = Math.min(240 / a, 130 / b, 44);
  const w = a * s;
  const h = b * s;
  const x0 = (300 - w) / 2;
  const y0 = 26;
  const X = (i: number) => x0 + i * s;
  const Y = (j: number) => y0 + h - j * s;
  const parts: string[] = [];
  for (let i = 0; i <= a; i += 1) parts.push(line(X(i), Y(0), X(i), Y(b)));
  for (let j = 0; j <= b; j += 1) parts.push(line(X(0), Y(j), X(a), Y(j)));
  parts.push(spot(X(0), Y(0)), spot(X(a), Y(b)), label(X(0) - 13, Y(0) + 13, 'A'), label(X(a) + 13, Y(b) - 13, 'B'));
  closed.forEach(([i, j], idx) => {
    parts.push(closedMark(X(i), Y(j)), label(X(i) - s / 2, Y(j) - s / 2, idx === 0 ? 'P' : 'Q'));
  });
  const desc = `A grid of streets ${a} blocks across and ${b} blocks up, with ${closed.length === 1 ? 'corner P' : 'corners P and Q'} closed`;
  return [`<svg viewBox="0 0 300 ${Math.round(h + 52)}" width="100%" role="img" aria-label="${desc}">`, ...parts, '</svg>'].join('');
}

interface AvoidParams {
  a: number;
  b: number;
  /** One closed corner, or two with the second up and to the right of the first. */
  closed: [number, number][];
}

const routesBetween = ([i1, j1]: [number, number], [i2, j2]: [number, number]) => choose(i2 - i1 + (j2 - j1), i2 - i1);

function avoidParts({ a, b, closed }: AvoidParams) {
  const A: [number, number] = [0, 0];
  const B: [number, number] = [a, b];
  const total = routesBetween(A, B);
  const through = closed.map((c) => routesBetween(A, c) * routesBetween(c, B));
  const both = closed.length === 2 ? routesBetween(A, closed[0]) * routesBetween(closed[0], closed[1]) * routesBetween(closed[1], B) : 0;
  const answer = total - through.reduce((t, v) => t + v, 0) + both;
  return { total, through, both, answer };
}

const cmAcGridAvoid: Generator<AvoidParams> = {
  id: 'cm-ac-grid-avoid',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const a = rng.int(4, 6);
        const b = rng.int(3, 5);
        if (a + b > 10) continue;
        const P: [number, number] = [rng.int(1, a - 1), rng.int(1, b - 1)];
        const Q: [number, number] = [rng.int(P[0], a - 1), rng.int(P[1], b - 1)];
        if (P[0] === Q[0] && P[1] === Q[1]) continue;
        return { a, b, closed: [P, Q] };
      }
      const a = rng.int(3, 6);
      const b = rng.int(2, 5);
      if (a + b > 10) continue;
      return { a, b, closed: [[rng.int(1, a - 1), rng.int(1, b - 1)]] };
    }
  },
  render(p) {
    const two = p.closed.length === 2;
    return typed(
      [
        say(`A grid of streets is ${p.a} blocks across and ${p.b} blocks up. A route runs along the streets from $A$ to $B$, only ever going right or up.`),
        { kind: 'diagram', svg: closedGridSvg(p.a, p.b, p.closed) },
        say(two ? 'The corners $P$ and $Q$ are closed. How many routes avoid both of them?' : 'The corner $P$ is closed. How many routes avoid it?'),
      ],
      avoidParts(p).answer,
      '\\text{routes} =',
    );
  },
  choices(p) {
    const { total, through, both, answer } = avoidParts(p);
    if (p.closed.length === 2) {
      return numberOptions(answer, [total - through[0] - through[1], answer + both, total - through[0], total - through[1]], 1, 1);
    }
    const [i, j] = p.closed[0];
    return numberOptions(answer, [through[0], total, total - choose(i + j, i), total - routesBetween(p.closed[0], [p.a, p.b])], 1, 1);
  },
  solution(p) {
    const { a, b } = p;
    const { total, through, both, answer } = avoidParts(p);
    const steps: SolutionStep[] = [
      { text: 'Count every route, then take away the ones through a closed corner.' },
      { text: `Every route is ${a} moves right and ${b} up, in any order:` },
      { tex: `${binom(a + b, a)} = ${total}` },
    ];
    const names = ['P', 'Q'];
    p.closed.forEach(([i, j], idx) => {
      steps.push(
        { text: `Through $${names[idx]}$: ${i} right and ${j} up to reach it, then ${a - i} right and ${b - j} up to $B$:` },
        { tex: `${binom(i + j, i)} \\times ${binom(a - i + (b - j), a - i)} = ${routesBetween([0, 0], [i, j])} \\times ${routesBetween([i, j], [a, b])} = ${through[idx]}` },
      );
    });
    if (p.closed.length === 2) {
      const [P, Q] = p.closed;
      steps.push(
        { text: 'A route through both $P$ and $Q$ was taken off twice, so add those back once. From $A$ to $P$, $P$ to $Q$, then $Q$ to $B$:' },
        { tex: `${routesBetween([0, 0], P)} \\times ${routesBetween(P, Q)} \\times ${routesBetween(Q, [a, b])} = ${both}` },
        { tex: `${total} - ${through[0]} - ${through[1]} + ${both} = ${answer}` },
      );
    } else {
      steps.push({ tex: `${total} - ${through[0]} = ${answer}` });
    }
    return steps;
  },
};

/* ---------- at least one girl: all teams, less the teams with none ---------- */

const TEAMS = [
  { pick: 'A team', of: 'boys', from: (x: number, y: number) => `${x} boys and ${y} girls`, oneA: 'boy', oneB: 'girl', noB: 'no girls', unit: 'teams' },
  { pick: 'A committee', of: 'students', from: (x: number, y: number) => `${x} students and ${y} teachers`, oneA: 'student', oneB: 'teacher', noB: 'no teachers', unit: 'committees' },
  { pick: 'A selection', of: 'milk', from: (x: number, y: number) => `${x} different milk chocolates and ${y} different dark chocolates`, oneA: 'milk chocolate', oneB: 'dark chocolate', noB: 'no dark ones', unit: 'selections', noBLabel: 'no dark' },
];

interface TeamParams {
  context: number;
  /** The group that may be left out entirely at difficulty 1. */
  nA: number;
  /** The group at least one of which is wanted. */
  nB: number;
  k: number;
  /** Difficulty 2: at least one from each group. */
  each: boolean;
}

function sampleTeam(rng: Rng, difficulty: number): TeamParams {
  const context = rng.int(0, TEAMS.length - 1);
  const nA = rng.int(4, 9);
  const nB = rng.int(3, 7);
  if (difficulty >= 2) {
    const k = rng.int(3, Math.min(5, nA, nB));
    return { context, nA, nB, k, each: true };
  }
  return { context, nA, nB, k: rng.int(3, Math.min(5, nA)), each: false };
}

function teamParts({ nA, nB, k, each }: TeamParams) {
  const all = choose(nA + nB, k);
  const bad = each ? choose(nA, k) + choose(nB, k) : choose(nA, k);
  return { all, bad, want: all - bad };
}

const teamSetup = (p: TeamParams) => `${TEAMS[p.context].pick} of ${p.k} is chosen from ${TEAMS[p.context].from(p.nA, p.nB)}.`;

const teamAsk = (p: TeamParams) => {
  const c = TEAMS[p.context];
  return p.each
    ? `How many ${c.unit} include at least one ${c.oneA} and at least one ${c.oneB}?`
    : `How many ${c.unit} include at least one ${c.oneB}?`;
};

function teamSolution(p: TeamParams): SolutionStep[] {
  const c = TEAMS[p.context];
  const { nA, nB, k } = p;
  const { all, bad, want } = teamParts(p);
  const steps: SolutionStep[] = [
    { text: `Count all the ${c.unit}, then take away the ones that break the rule. From all ${nA + nB}:` },
    { tex: `${binom(nA + nB, k)} = ${all}` },
  ];
  if (p.each) {
    steps.push(
      { text: `A ${c.unit.replace(/s$/, '')} that breaks the rule is all from one group:` },
      { tex: `${binom(nA, k)} + ${binom(nB, k)} = ${choose(nA, k)} + ${choose(nB, k)} = ${bad}` },
    );
  } else {
    steps.push({ text: `With ${c.noB}, all ${k} come from the other ${nA}:` }, { tex: `${binom(nA, k)} = ${bad}` });
  }
  steps.push({ tex: `${all} - ${bad} = ${want}` });
  return steps;
}

const cmAcCommittee: Generator<TeamParams> = {
  id: 'cm-ac-committee',
  sample: sampleTeam,
  render(p) {
    const c = TEAMS[p.context];
    return typed([say(teamSetup(p)), say(teamAsk(p))], teamParts(p).want, `\\text{${c.unit}} =`);
  },
  choices(p) {
    const { nA, nB, k } = p;
    const n = nA + nB;
    const { all, want } = teamParts(p);
    if (p.each) {
      return numberOptions(want, [nA * nB * choose(n - 2, k - 2), all - choose(nA, k), all - choose(nB, k), all], 1, 1);
    }
    return numberOptions(want, [nB * choose(n - 1, k - 1), all, nB * choose(nA, k - 1), all - choose(nB, k)], 1, 1);
  },
  solution: teamSolution,
};

const cmAcCommitteeTiles: Generator<TeamParams> = {
  id: 'cm-ac-committee-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const p = sampleTeam(rng, difficulty);
      const { all, bad, want } = teamParts(p);
      if (distinct([all, bad, want])) return p;
    }
  },
  render(p) {
    const c = TEAMS[p.context];
    const { nA, nB, k } = p;
    const n = nA + nB;
    const { all, bad, want } = teamParts(p);
    const badLabel = p.each ? '\\text{one kind}' : `\\text{${c.noBLabel ?? c.noB}}`;
    return {
      kind: 'tiles',
      prompt: [
        say(teamSetup(p)),
        say(`${teamAsk(p)} Count all the ${c.unit}, then the ones that break the rule, then the ones wanted.`),
      ],
      template: `\\text{all} = {0} \\quad ${badLabel} = {1} \\quad \\text{wanted} = {2}`,
      bank: numberBank([all, bad, want], [nB * choose(n - 1, k - 1), choose(nB, k), choose(n, k - 1), choose(nA, k - 1)], 3, 1, 1),
      answer: [num(all), num(bad), num(want)],
    };
  },
  solution: teamSolution,
};

/* ================================================================
 * Lesson 3: Binomial Coefficients
 * ================================================================ */

/* ---------- one coefficient: a choice of brackets ---------- */

type CoeffForm = 'plain' | 'x/x' | 'x2/x' | 'x/x2';

interface CoeffParams {
  form: CoeffForm;
  n: number;
  /** For 'plain', the power of x asked about. */
  k: number;
  c: number;
}

/** How many brackets give the second term, for the term asked about. */
function coeffPick(p: CoeffParams): number {
  if (p.form === 'plain') return p.n - p.k;
  if (p.form === 'x/x') return p.n / 2;
  if (p.form === 'x2/x') return (2 * p.n) / 3;
  return p.n / 3;
}

const coeffValue = (p: CoeffParams) => choose(p.n, coeffPick(p)) * p.c ** coeffPick(p);

function coeffBracket(p: CoeffParams): string {
  const sign = p.c < 0 ? '-' : '+';
  const c = Math.abs(p.c);
  if (p.form === 'plain') return `(x ${sign} ${c})^{${p.n}}`;
  const first = p.form === 'x2/x' ? 'x^{2}' : 'x';
  const bottom = p.form === 'x/x2' ? 'x^{2}' : 'x';
  return `\\left(${first} ${sign} \\frac{${c}}{${bottom}}\\right)^{${p.n}}`;
}

/** The power of x in the term taking the second part from r brackets. */
function powerOfX(p: CoeffParams): string {
  const { n } = p;
  if (p.form === 'x/x') return `(${n} - r) - r = ${n} - 2r`;
  if (p.form === 'x2/x') return `2(${n} - r) - r = ${2 * n} - 3r`;
  return `(${n} - r) - 2r = ${n} - 3r`;
}

const cmAcBinomCoeff: Generator<CoeffParams> = {
  id: 'cm-ac-binom-coeff',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const form = rng.pick(['x/x', 'x2/x', 'x/x2'] as const);
      const n = form === 'x/x' ? rng.pick([4, 6, 8]) : rng.pick([3, 6, 9]);
      return { form, n, k: 0, c: rng.pick([2, 3, -2, -3]) };
    }
    const n = rng.int(4, 8);
    return { form: 'plain', n, k: rng.int(1, n - 1), c: rng.pick([2, 3, 4, 5, -2, -3]) };
  },
  render(p) {
    if (p.form === 'plain') {
      return typed(
        [say(`What is the coefficient of $${xPow(p.k)}$ in the expansion of $${coeffBracket(p)}$?`)],
        coeffValue(p),
        '\\text{coefficient} =',
      );
    }
    return typed(
      [say('What is the constant term (the term with no $x$) when this is expanded?'), show(coeffBracket(p))],
      coeffValue(p),
      '\\text{term} =',
    );
  },
  choices(p) {
    const { n, c } = p;
    const r = coeffPick(p);
    const ans = coeffValue(p);
    if (p.form === 'plain') {
      return numberOptions(ans, [choose(n, r), choose(n, r) * c ** p.k, choose(n, r) * Math.abs(c) ** r, c ** r], 1, -1e9);
    }
    const wrongR = p.form === 'x/x' ? n / 2 - 1 : p.form === 'x2/x' ? n / 3 : (2 * n) / 3;
    return numberOptions(ans, [choose(n, r), choose(n, r) * c ** (n - r), choose(n, wrongR) * c ** wrongR, -ans], 1, -1e9);
  },
  solution(p) {
    const { n, c } = p;
    const r = coeffPick(p);
    const ans = coeffValue(p);
    const value = `${binom(n, r)} \\times ${powTex(c, r)} = ${choose(n, r)} \\times ${factor(c ** r)} = ${ans}`;
    if (p.form === 'plain') {
      return [
        { text: `The term in $${xPow(p.k)}$ takes $x$ from ${p.k} of the ${n} brackets and $${c}$ from the other ${r}. There are $${binom(n, p.k)}$ ways to choose which brackets give the $x$, so the coefficient is` },
        { tex: `${binom(n, p.k)} \\times ${powTex(c, r)} = ${choose(n, r)} \\times ${factor(c ** r)} = ${ans}` },
      ];
    }
    const second = `${c < 0 ? '-' : ''}\\frac{${Math.abs(c)}}{${p.form === 'x/x2' ? 'x^{2}' : 'x'}}`;
    const first = p.form === 'x2/x' ? 'x^{2}' : 'x';
    return [
      { text: `Take $${second}$ from $r$ of the ${n} brackets and $${first}$ from the other $${n} - r$. The power of $x$ in that term is` },
      { tex: powerOfX(p) },
      { text: 'It is zero when' },
      { tex: `r = ${r}` },
      { text: `There are $${binom(n, r)}$ ways to choose those brackets, so the constant term is` },
      { tex: value },
    ];
  },
};

/* ---------- a whole expansion, in a table ---------- */

interface ExpansionParams {
  n: number;
  c: number;
  /** The powers of x left blank, smallest first. */
  blanks: number[];
}

const expCoeff = (p: ExpansionParams, k: number) => choose(p.n, k) * p.c ** k;

const cmAcExpansionTable: Generator<ExpansionParams> = {
  id: 'cm-ac-expansion-table',
  sample(rng, difficulty) {
    const n = rng.int(4, 6);
    const c = difficulty >= 2 ? rng.pick([-2, -3]) : rng.pick([2, 3, 4]);
    const want = difficulty >= 2 ? 4 : 3;
    for (;;) {
      const blanks = rng.sample(Array.from({ length: n }, (_, i) => i + 1), want).sort((x, y) => x - y);
      const p = { n, c, blanks };
      if (distinct(blanks.map((k) => expCoeff(p, k)))) return p;
    }
  },
  render(p) {
    const { n, c, blanks } = p;
    const rows: (string | null)[][] = [];
    for (let k = 0; k <= n; k += 1) rows.push([xPow(k), blanks.includes(k) ? null : num(expCoeff(p, k))]);
    const answer = blanks.map((k) => expCoeff(p, k));
    const slips = blanks.flatMap((k) => [choose(n, k), choose(n, k) * c ** (k - 1), -expCoeff(p, k), choose(n, k) * c]);
    return {
      kind: 'table',
      prompt: [say(`Expand $(1 ${c < 0 ? '-' : '+'} ${Math.abs(c)}x)^{${n}}$. Fill in the missing coefficients.`)],
      columns: ['\\text{term}', '\\text{coefficient}'],
      rows,
      bank: numberBank(answer, slips, 3, 1, -1e9),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const { n, c, blanks } = p;
    const steps: SolutionStep[] = [
      { text: `The term in $x^{k}$ takes $${c}x$ from $k$ of the ${n} brackets and $1$ from the rest, so its coefficient is $\\binom{${n}}{k} \\times ${c < 0 ? `(${c})` : c}^{k}$.` },
    ];
    if (c < 0) steps.push({ text: 'An odd power of a negative number is negative, so the signs alternate.' });
    for (const k of blanks) {
      steps.push({ tex: `${xPow(k)}{:}\\quad ${binom(n, k)} \\times ${powTex(c, k)} = ${choose(n, k)} \\times ${factor(c ** k)} = ${expCoeff(p, k)}` });
    }
    return steps;
  },
};

/* ---------- the hockey stick: a diagonal adds up to the entry below ---------- */

interface StickParams {
  k: number;
  /** First top number in the sum; m = k starts at the edge of the triangle. */
  m: number;
  n: number;
}

const stickSum = ({ k, m, n }: StickParams) => choose(n + 1, k + 1) - choose(m, k + 1);

const cmAcHockeyStick: Generator<StickParams> = {
  id: 'cm-ac-hockey-stick',
  sample(rng, difficulty) {
    const k = rng.int(2, 3);
    if (difficulty >= 2) {
      const m = rng.int(k + 1, k + 4);
      return { k, m, n: rng.int(m + 4, k === 2 ? 18 : 16) };
    }
    return { k, m: k, n: rng.int(6, k === 2 ? 20 : 18) };
  },
  render(p) {
    const { k, m, n } = p;
    return typed(
      [say('Work out the sum.'), show(`${binom(m, k)} + ${binom(m + 1, k)} + ${binom(m + 2, k)} + \\cdots + ${binom(n, k)}`)],
      stickSum(p),
      '\\text{sum} =',
    );
  },
  choices(p) {
    const { k, m, n } = p;
    if (m > k) {
      const full = choose(n + 1, k + 1);
      return numberOptions(stickSum(p), [full, full - choose(m + 1, k + 1), full - choose(m - 1, k + 1), choose(n, k + 1) - choose(m, k + 1)], 1, 1);
    }
    return numberOptions(stickSum(p), [choose(n + 1, k), choose(n, k + 1), choose(n + 2, k + 1), choose(n + 1, k + 2)], 1, 1);
  },
  solution(p) {
    const { k, m, n } = p;
    const steps: SolutionStep[] = [
      { text: `Pascal’s rule adds two neighbours in a row to give the entry below them. Start at the edge of the triangle, writing $${binom(k, k)}$ as $${binom(k + 1, k + 1)}$ (both are $1$), and fold in one term at a time:` },
      { tex: `${binom(k + 1, k + 1)} + ${binom(k + 1, k)} = ${binom(k + 2, k + 1)}` },
      { tex: `${binom(k + 2, k + 1)} + ${binom(k + 2, k)} = ${binom(k + 3, k + 1)}` },
      { text: `and so on, so the sum from $${binom(k, k)}$ to $${binom(n, k)}$ is $${binom(n + 1, k + 1)}$.` },
    ];
    if (m === k) {
      steps.push({ tex: `${binom(n + 1, k + 1)} = ${stickSum(p)}` });
      return steps;
    }
    steps.push(
      { text: `This sum starts at $${binom(m, k)}$. The missing terms, from $${binom(k, k)}$ to $${binom(m - 1, k)}$, add up to $${binom(m, k + 1)}$ in the same way, so take them off:` },
      { tex: `${binom(n + 1, k + 1)} - ${binom(m, k + 1)} = ${choose(n + 1, k + 1)} - ${choose(m, k + 1)} = ${stickSum(p)}` },
    );
    return steps;
  },
};

/* ---------- a row of Pascal's triangle, added up ---------- */

type RowForm = 'all' | 'even' | 'inner' | 'weighted' | 'chair';

interface RowParams {
  form: RowForm;
  n: number;
}

function rowValue({ form, n }: RowParams): number {
  if (form === 'all') return 2 ** n;
  if (form === 'even') return 2 ** (n - 1);
  if (form === 'inner') return 2 ** n - 2;
  return n * 2 ** (n - 1);
}

function rowTex({ form, n }: RowParams): string {
  if (form === 'all') return `${binom(n, 0)} + ${binom(n, 1)} + ${binom(n, 2)} + \\cdots + ${binom(n, n)}`;
  if (form === 'even') return `${binom(n, 0)} + ${binom(n, 2)} + ${binom(n, 4)} + \\cdots + ${binom(n, n % 2 === 0 ? n : n - 1)}`;
  if (form === 'inner') return `${binom(n, 1)} + ${binom(n, 2)} + ${binom(n, 3)} + \\cdots + ${binom(n, n - 1)}`;
  // Braced in two halves so a line too long for a phone breaks in the middle.
  return `{${binom(n, 1)} + 2${binom(n, 2)}} + {3${binom(n, 3)} + \\cdots + ${n}${binom(n, n)}}`;
}

const cmAcRowSum: Generator<RowParams> = {
  id: 'cm-ac-row-sum',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { form: rng.pick(['weighted', 'chair'] as const), n: rng.int(4, 17) };
    return { form: rng.pick(['all', 'even', 'inner'] as const), n: rng.int(5, 14) };
  },
  render(p) {
    if (p.form === 'chair') {
      return typed(
        [
          say(`A club has ${p.n} members. A committee of any size (at least one person) is formed from them, and one of its members is made its chair.`),
          say('In how many ways can this be done?'),
        ],
        rowValue(p),
        '\\text{ways} =',
      );
    }
    return typed([say('Work out the sum.'), show(rowTex(p))], rowValue(p), '\\text{sum} =');
  },
  choices(p) {
    const { n } = p;
    const ans = rowValue(p);
    if (p.form === 'all') return numberOptions(ans, [2 ** (n - 1), 2 ** n - 1, 2 ** (n + 1), n * n], 1, 1);
    if (p.form === 'even') return numberOptions(ans, [2 ** n, 2 ** (n - 2), 2 ** (n - 1) - 1, 2 ** (n - 1) + 1], 1, 1);
    if (p.form === 'inner') return numberOptions(ans, [2 ** n, 2 ** n - 1, 2 ** (n - 1), 2 ** n - n], 1, 1);
    return numberOptions(ans, [2 ** n - 1, n * 2 ** n, (n - 1) * 2 ** (n - 1), n * 2 ** (n - 2)], 1, 1);
  },
  solution(p) {
    const { n } = p;
    const subsets = { text: `$\\binom{${n}}{k}$ counts the groups of $k$ chosen from ${n} things. Adding every size counts every group once, and each of the ${n} things is either in or out:` };
    if (p.form === 'all') return [subsets, { tex: `2^{${n}} = ${rowValue(p)}` }];
    if (p.form === 'inner') {
      return [
        subsets,
        { tex: `2^{${n}} = ${2 ** n}` },
        { text: `This sum leaves out the two ends, $${binom(n, 0)}$ and $${binom(n, n)}$, each $1$:` },
        { tex: `${2 ** n} - 2 = ${rowValue(p)}` },
      ];
    }
    if (p.form === 'even') {
      return [
        subsets,
        { tex: `2^{${n}} = ${2 ** n}` },
        { text: 'Expanding this gives the even terms minus the odd terms:' },
        { tex: `(1 - 1)^{${n}} = 0` },
        { text: 'So the even terms make exactly half of the row:' },
        { tex: `${2 ** n} \\div 2 = ${rowValue(p)}` },
      ];
    }
    const lead: SolutionStep[] = p.form === 'chair'
      ? [
        { text: `A committee of $k$ and then its chair can be chosen in $k${binom(n, 'k')}$ ways, so the answer is the sum` },
        { tex: rowTex({ form: 'weighted', n }) },
        { text: 'Count it the other way round instead:' },
      ]
      : [{ text: `$k${binom(n, 'k')}$ counts the committees of $k$ from ${n} people with one member picked as chair. Count those the other way round:` }];
    return [
      ...lead,
      { text: `pick the chair first, in ${n} ways, then any group of the other ${n - 1} to join them:` },
      { tex: `${n} \\times 2^{${n - 1}} = ${n} \\times ${2 ** (n - 1)} = ${rowValue(p)}` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Principle of Inclusion-Exclusion
 * ================================================================ */

/* ---------- multiples of three numbers ---------- */

const COPRIME_TRIPLES: [number, number, number][] = [
  [2, 3, 5],
  [2, 3, 7],
  [2, 5, 7],
  [3, 5, 7],
  [2, 3, 11],
  [3, 4, 5],
];

/** Triples sharing factors, so the pairs are LCMs, not products. */
const SHARED_TRIPLES: [number, number, number][] = [
  [4, 6, 9],
  [6, 10, 15],
  [4, 6, 10],
  [6, 9, 15],
  [4, 6, 15],
  [4, 10, 25],
];

interface PieParams {
  a: number;
  b: number;
  c: number;
  N: number;
  /** 'any': divisible by at least one. 'none': by none of them. */
  ask: 'any' | 'none';
}

const lcm2 = (x: number, y: number): number => {
  let [p, q] = [x, y];
  while (q) [p, q] = [q, p % q];
  return (x / p) * y;
};

function pieParts({ a, b, c, N }: PieParams) {
  const f = (d: number) => Math.floor(N / d);
  const singles = [f(a), f(b), f(c)];
  const pairLcm = [lcm2(a, b), lcm2(a, c), lcm2(b, c)];
  const pairs = pairLcm.map(f);
  const allLcm = lcm2(lcm2(a, b), c);
  const all = f(allLcm);
  const sum = (v: number[]) => v.reduce((t, x) => t + x, 0);
  const any = sum(singles) - sum(pairs) + all;
  // The trap: pairs counted with products rather than LCMs.
  const productAny = sum(singles) - f(a * b) - f(a * c) - f(b * c) + f(a * b * c);
  return { singles, pairLcm, pairs, allLcm, all, any, none: N - any, productAny, sum };
}

function samplePie(rng: Rng, difficulty: number): PieParams {
  const [a, b, c] = rng.pick(difficulty >= 2 ? SHARED_TRIPLES : COPRIME_TRIPLES);
  const top = lcm2(lcm2(a, b), c);
  const N = difficulty >= 2 ? rng.int(Math.max(100, top), 600) : rng.int(Math.max(60, top), 400);
  return { a, b, c, N, ask: rng.chance(0.5) ? 'any' : 'none' };
}

const pieQuestion = (p: PieParams) =>
  p.ask === 'any'
    ? `How many of the whole numbers from 1 to ${p.N} are divisible by ${p.a}, ${p.b} or ${p.c}?`
    : `How many of the whole numbers from 1 to ${p.N} are divisible by none of ${p.a}, ${p.b} and ${p.c}?`;

function pieSolution(p: PieParams): SolutionStep[] {
  const { a, b, c, N } = p;
  const { singles, pairLcm, pairs, allLcm, all, any, none, sum } = pieParts(p);
  const shared = pairLcm.some((v, i) => v !== [a * b, a * c, b * c][i]);
  const steps: SolutionStep[] = [
    { text: `Count the multiples of each, take off the ones counted twice, then add back the ones taken off too often. Multiples of ${a}, ${b} and ${c} up to ${N}:` },
    { tex: `${singles.join(' + ')} = ${sum(singles)}` },
    {
      text: shared
        ? `A number divisible by two of them is a multiple of their LCM, not of their product: ${pairLcm[0]}, ${pairLcm[1]} and ${pairLcm[2]}.`
        : `A number divisible by two of them is a multiple of their product: ${pairLcm[0]}, ${pairLcm[1]} and ${pairLcm[2]}.`,
    },
    { tex: `${pairs.join(' + ')} = ${sum(pairs)}` },
    { text: `A multiple of all three is a multiple of ${allLcm}, and there are ${all}. So the count divisible by at least one of them is` },
    { tex: `${sum(singles)} - ${sum(pairs)} + ${all} = ${any}` },
  ];
  if (p.ask === 'none') steps.push({ text: 'The rest are divisible by none of them:' }, { tex: `${N} - ${any} = ${none}` });
  return steps;
}

const cmAcPieMultiples: Generator<PieParams> = {
  id: 'cm-ac-pie-multiples',
  sample: samplePie,
  render(p) {
    const { any, none } = pieParts(p);
    return typed([say(pieQuestion(p))], p.ask === 'any' ? any : none, '\\text{numbers} =');
  },
  choices(p) {
    const { N } = p;
    const { singles, pairs, all, any, none, productAny, sum } = pieParts(p);
    const noAddBack = sum(singles) - sum(pairs);
    if (p.ask === 'any') return numberOptions(any, [sum(singles), noAddBack, none, productAny, any - all], 1, 1);
    return numberOptions(none, [N - sum(singles), N - noAddBack, any, N - productAny, none + all], 1, 0);
  },
  solution: pieSolution,
};

const cmAcPieTable: Generator<PieParams> = {
  id: 'cm-ac-pie-table',
  sample(rng, difficulty) {
    // 6, 10 and 15 make every pair and the triple a multiple of 30: four equal
    // blanks read as a broken table, so a value may fill at most two of them.
    for (;;) {
      const p = samplePie(rng, difficulty);
      const { pairs, all } = pieParts(p);
      const values = [...pairs, all];
      if (values.every((v) => values.filter((w) => w === v).length <= 2)) return p;
    }
  },
  render(p) {
    const { a, b, c } = p;
    const { singles, pairs, all, any, none } = pieParts(p);
    const final = p.ask === 'any' ? any : none;
    const answer = [...pairs, all, final];
    const f = (d: number) => Math.floor(p.N / d);
    const slips = [f(a * b), f(a * c), f(b * c), f(a * b * c), p.ask === 'any' ? none : any, final + all, final - all];
    return {
      kind: 'table',
      prompt: [say(pieQuestion(p)), say('Fill in the table on the way: how many are divisible by each number, each pair, and all three.')],
      columns: ['\\text{divisible by}', '\\text{how many}'],
      rows: [
        [`${a}`, num(singles[0])],
        [`${b}`, num(singles[1])],
        [`${c}`, num(singles[2])],
        [`${a} \\text{ and } ${b}`, null],
        [`${a} \\text{ and } ${c}`, null],
        [`${b} \\text{ and } ${c}`, null],
        ['\\text{all three}', null],
        [p.ask === 'any' ? '\\text{at least one}' : '\\text{none of them}', null],
      ],
      bank: numberBank(answer, slips, 3, 1, 0),
      answer: answer.map(num),
    };
  },
  solution: pieSolution,
};

/* ---------- derangements: nobody gets their own ---------- */

const DERANGE = [
  {
    setup: (n: number) => `${n} letters are written to ${n} different people, each with its own addressed envelope. The letters go into the envelopes at random, one in each.`,
    none: 'In how many ways does no letter go into its own envelope?',
    some: (j: number) => (j === 1 ? 'In how many ways does exactly one letter go into its own envelope?' : `In how many ways do exactly ${WORD[j]} letters go into their own envelopes?`),
    who: 'letters',
  },
  {
    setup: (n: number) => `${n} guests leave their hats at a cloakroom, and each is handed back one of the ${n} hats at random.`,
    none: 'In how many ways does nobody get their own hat back?',
    some: (j: number) => (j === 1 ? 'In how many ways does exactly one guest get their own hat back?' : `In how many ways do exactly ${WORD[j]} guests get their own hats back?`),
    who: 'guests',
  },
  {
    setup: (n: number) => `${n} friends each draw one name from a hat holding all ${n} of their names.`,
    none: 'In how many ways does nobody draw their own name?',
    some: (j: number) => (j === 1 ? 'In how many ways does exactly one of them draw their own name?' : `In how many ways do exactly ${WORD[j]} of them draw their own names?`),
    who: 'friends',
  },
  {
    setup: (n: number) => `A teacher hands ${n} marked tests back to ${n} students at random, one each.`,
    none: 'In how many ways does no student get their own test?',
    some: (j: number) => (j === 1 ? 'In how many ways does exactly one student get their own test?' : `In how many ways do exactly ${WORD[j]} students get their own tests?`),
    who: 'students',
  },
  {
    setup: (n: number) => `${n} keys are hung back on ${n} labelled hooks at random, one to a hook.`,
    none: 'In how many ways is no key on its own hook?',
    some: (j: number) => (j === 1 ? 'In how many ways is exactly one key on its own hook?' : `In how many ways are exactly ${WORD[j]} keys on their own hooks?`),
    who: 'keys',
  },
  {
    setup: (n: number) => `${n} runners each leave a water bottle on a table, and after the race each picks up one of the ${n} bottles at random.`,
    none: 'In how many ways does no runner pick up their own bottle?',
    some: (j: number) => (j === 1 ? 'In how many ways does exactly one runner pick up their own bottle?' : `In how many ways do exactly ${WORD[j]} runners pick up their own bottles?`),
    who: 'runners',
  },
];

/** D_n, the arrangements of n with none in its own place. */
const DERANGED = [1, 0, 1, 2, 9, 44, 265, 1854, 14833];

interface DerangeParams {
  context: number;
  n: number;
  /** How many are right; 0 at difficulty 1. */
  j: number;
}

const derangeWays = ({ n, j }: DerangeParams) => choose(n, j) * DERANGED[n - j];

/**
 * n! − n!/1! + n!/2! − … as TeX, each term n!/k!, and its value. From seven
 * terms on the line is wider than a phone, so the first four are braced into
 * one group and the rest into another: the line can then break only between
 * the groups or after the `=`, never after a lone minus sign.
 */
function derangeSeries(n: number): string {
  const terms = Array.from({ length: n + 1 }, (_, k) => fact(n) / fact(k));
  const signed = terms.map((t, k) => (k === 0 ? `${t}` : `${k % 2 ? '-' : '+'} ${t}`));
  if (signed.length < 7) return `${signed.join(' ')} = ${DERANGED[n]}`;
  // The fifth term, k = 4, is always added, so its + can sit between the groups.
  return `{${signed.slice(0, 4).join(' ')}} + {${signed.slice(4).join(' ').slice(2)}} = ${DERANGED[n]}`;
}

const cmAcDerangements: Generator<DerangeParams> = {
  id: 'cm-ac-derangements',
  sample(rng, difficulty) {
    const context = rng.int(0, DERANGE.length - 1);
    if (difficulty >= 2) return { context, n: rng.int(5, 8), j: rng.int(1, 3) };
    return { context, n: rng.int(3, 7), j: 0 };
  },
  render(p) {
    const c = DERANGE[p.context];
    return typed([say(c.setup(p.n)), say(p.j === 0 ? c.none : c.some(p.j))], derangeWays(p), '\\text{ways} =');
  },
  choices(p) {
    const { n, j } = p;
    if (j === 0) return numberOptions(derangeWays(p), [fact(n) - n, fact(n - 1), fact(n) - fact(n - 1), n * DERANGED[n - 1]], 1, 1);
    return numberOptions(derangeWays(p), [choose(n, j) * fact(n - j), DERANGED[n - j], choose(n, j) * DERANGED[n - j - 1], fact(n) - derangeWays(p)], 1, 1);
  },
  solution(p) {
    const { n, j } = p;
    const m = n - j;
    const series: SolutionStep[] = [
      { text: `Start from all $${m}!$ orders of ${m}. Fixing $k$ chosen ones in their own places leaves $(${m} - k)!$ orders of the rest, and there are $\\binom{${m}}{k}$ ways to choose them, so $\\frac{${m}!}{k!}$ in all. Inclusion–exclusion takes these off and adds them back in turn:` },
      { tex: derangeSeries(m) },
    ];
    if (j === 0) return series;
    return [
      { text: `Choose which ${j} are right:` },
      { tex: `${binom(n, j)} = ${choose(n, j)}` },
      { text: `The other ${m} must all be wrong, which is the count with none right for ${m}.` },
      ...series,
      { tex: `${choose(n, j)} \\times ${DERANGED[m]} = ${derangeWays(p)}` },
    ];
  },
};

/* ---------- sharing different things, nobody left empty ---------- */

const ONTO = [
  { setup: (n: number, k: number) => `${n} different prizes are given out to ${k} children, and every child gets at least one.`, ask: 'In how many ways can the prizes be given out?', things: 'prizes', takers: 'children', taker: 'child' },
  { setup: (n: number, k: number) => `${n} different jobs are shared among ${k} workers, and every worker gets at least one.`, ask: 'In how many ways can the jobs be shared?', things: 'jobs', takers: 'workers', taker: 'worker' },
  { setup: (n: number, k: number) => `${n} guests are put into ${k} different rooms, and no room is left empty.`, ask: 'In how many ways can the guests be put in rooms?', things: 'guests', takers: 'rooms', taker: 'room' },
  { setup: (n: number, k: number) => `${n} different photos are put into ${k} different albums, and no album is left empty.`, ask: 'In how many ways can the photos be put in albums?', things: 'photos', takers: 'albums', taker: 'album' },
];

interface OntoParams {
  context: number;
  n: number;
  k: number;
}

const ontoTerms = ({ n, k }: OntoParams) => Array.from({ length: k }, (_, i) => (i % 2 ? -1 : 1) * choose(k, i) * (k - i) ** n);

const ontoWays = (p: OntoParams) => ontoTerms(p).reduce((t, v) => t + v, 0);

const cmAcOnto: Generator<OntoParams> = {
  id: 'cm-ac-onto',
  sample(rng, difficulty) {
    return { context: rng.int(0, ONTO.length - 1), n: difficulty >= 2 ? rng.int(4, 10) : rng.int(4, 11), k: difficulty >= 2 ? 4 : 3 };
  },
  render(p) {
    const c = ONTO[p.context];
    return typed([say(c.setup(p.n, p.k)), say(c.ask)], ontoWays(p), '\\text{ways} =');
  },
  choices(p) {
    const { n, k } = p;
    const t = ontoTerms(p);
    const ans = ontoWays(p);
    if (k === 3) return numberOptions(ans, [t[0] + t[1], 3 ** n - 3, choose(n - 1, 2), 3 ** n - 3 * 2 ** n + 6], 1, 1);
    return numberOptions(ans, [t[0] + t[1] + t[2], 4 ** n - 4, choose(n - 1, 3), 4 ** n - 4 * 3 ** n + 4 * 2 ** n - 4], 1, 1);
  },
  solution(p) {
    const c = ONTO[p.context];
    const { n, k } = p;
    const t = ontoTerms(p);
    const sym = [`${k}^{${n}}`, `${k} \\times ${k - 1}^{${n}}`, `${choose(k, 2)} \\times ${k - 2}^{${n}}`, `${k}`];
    const formula = sym
      .slice(0, k)
      .map((s, i) => (k === 3 && i === 2 ? '3' : s))
      .map((s, i) => (i === 0 ? s : `${i % 2 ? '-' : '+'} ${s}`))
      .join(' ');
    const values = t.map((v, i) => (i === 0 ? `${v}` : `${v < 0 ? '-' : '+'} ${Math.abs(v)}`)).join(' ');
    return [
      { text: `Each of the ${n} ${c.things} can go to any of the ${k} ${c.takers}: $${k}^{${n}}$ ways with no rule. Take off the ways that leave out a given ${c.taker} (${k} choices of which, then $${k - 1}^{${n}}$ ways). Ways leaving out two were taken off twice, so add them back${k === 4 ? ', and take off those leaving out three' : ''}:` },
      { tex: formula },
      { tex: `${values} = ${ontoWays(p)}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: Balls and Urns
 * ================================================================ */

/* ---------- minimums first, then share freely ---------- */

const NAMES = [
  ['Ann', 'Ben', 'Cal', 'Dee'],
  ['Eli', 'Fay', 'Gus', 'Hal'],
  ['Ivy', 'Jon', 'Kim', 'Lou'],
];

const SHARE_THINGS = [
  { things: 'identical sweets', unit: 'sweets' },
  { things: 'identical marbles', unit: 'marbles' },
  { things: 'identical stickers', unit: 'stickers' },
];

interface MinParams {
  names: number;
  thing: number;
  /** Each person's minimum, one per person. */
  mins: number[];
  /** What is left once the minimums are handed out. */
  r: number;
}

const minTotal = (p: MinParams) => p.mins.reduce((t, v) => t + v, 0) + p.r;

const minWays = (p: MinParams) => choose(p.r + p.mins.length - 1, p.mins.length - 1);

function minSetup(p: MinParams): string {
  const who = NAMES[p.names].slice(0, p.mins.length);
  const rules = p.mins.map((m, i) => (m === 0 ? `${who[i]} may get none` : i === 0 ? `${who[i]} gets at least ${m}` : `${who[i]} at least ${m}`));
  const people = `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}`;
  const ruleText = `${rules.slice(0, -1).join(', ')} and ${rules[rules.length - 1]}`;
  return `${minTotal(p)} ${SHARE_THINGS[p.thing].things} are shared out between ${people}, all of them handed out. ${ruleText.charAt(0).toUpperCase()}${ruleText.slice(1)}.`;
}

function sampleMins(rng: Rng, people: number, rLow: number): MinParams {
  for (;;) {
    const mins = Array.from({ length: people }, () => rng.int(0, 4));
    if (mins.filter((m) => m > 0).length < 2) continue;
    if (new Set(mins).size < 2) continue;
    // The first named person carries the "gets", so give them a real minimum.
    if (mins[0] === 0) continue;
    return { names: rng.int(0, NAMES.length - 1), thing: rng.int(0, SHARE_THINGS.length - 1), mins, r: rng.int(rLow, 12) };
  }
}

function minSolution(p: MinParams): SolutionStep[] {
  const k = p.mins.length;
  const given = p.mins.filter((m) => m > 0);
  const unit = SHARE_THINGS[p.thing].unit;
  return [
    { text: 'Hand out the minimums first:' },
    { tex: `${minTotal(p)} - ${given.length > 1 ? `(${given.join(' + ')})` : given[0]} = ${p.r}` },
    { text: `The ${p.r} ${unit} left are shared with no rule. Lay them in a row with ${k - 1} dividers between the ${k} shares: that is ${p.r + k - 1} places, and choosing where the dividers go settles the share.` },
    { tex: `${binom(p.r + k - 1, k - 1)} = ${minWays(p)}` },
  ];
}

interface UrnParams {
  kind: 'min' | 'odd';
  min: MinParams;
  /** For 'odd': how many unknowns, and their total. */
  k: number;
  n: number;
}

const oddHalf = ({ k, n }: UrnParams) => (n - k) / 2;

const urnWays = (p: UrnParams) => (p.kind === 'min' ? minWays(p.min) : choose(oddHalf(p) + p.k - 1, p.k - 1));

const LETTERS3 = ['x', 'y', 'z'];
const LETTERS4 = ['w', 'x', 'y', 'z'];

const cmAcUrnsMinimum: Generator<UrnParams> = {
  id: 'cm-ac-urns-minimum',
  sample(rng, difficulty) {
    const min = sampleMins(rng, 3, 1);
    if (difficulty >= 2) {
      const k = rng.chance(0.5) ? 3 : 4;
      const n = k === 3 ? 2 * rng.int(4, 22) + 1 : 2 * rng.int(5, 20);
      return { kind: 'odd', min, k, n };
    }
    return { kind: 'min', min, k: 3, n: minTotal(min) };
  },
  render(p) {
    if (p.kind === 'min') return typed([say(minSetup(p.min)), say('In how many ways can they be shared out?')], urnWays(p), '\\text{ways} =');
    const letters = p.k === 3 ? LETTERS3 : LETTERS4;
    return typed(
      [
        say('How many solutions does this equation have with every unknown an odd positive whole number? Solutions in a different order count separately.'),
        show(`${letters.join(' + ')} = ${p.n}`),
      ],
      urnWays(p),
      '\\text{solutions} =',
    );
  },
  choices(p) {
    if (p.kind === 'min') {
      const { r } = p.min;
      const n = minTotal(p.min);
      return numberOptions(urnWays(p), [choose(n + 2, 2), choose(n - 1, 2), choose(r + 1, 2), choose(r + 2, 3)], 1, 1);
    }
    const { k, n } = p;
    const q = oddHalf(p);
    return numberOptions(urnWays(p), [choose(n - 1, k - 1), choose(q - 1, k - 1), choose(q + k - 1, k), choose(Math.floor(n / 2) + k - 1, k - 1)], 1, 1);
  },
  solution(p) {
    if (p.kind === 'min') return minSolution(p.min);
    const { k, n } = p;
    const q = oddHalf(p);
    const small = k === 3 ? ['a', 'b', 'c'] : ['a', 'b', 'c', 'd'];
    return [
      { text: `An odd positive number is one more than an even number from $0$ up, so write each unknown as $2a + 1$, $2b + 1$, and so on, with $${small.join(', ')}$ whole numbers from $0$ up. Then` },
      { tex: `2(${small.join(' + ')}) + ${k} = ${n}` },
      { tex: `${small.join(' + ')} = ${q}` },
      { text: `Share ${q} among ${k} with no rule: a row of ${q} stars and ${k - 1} dividers.` },
      { tex: `${binom(q + k - 1, k - 1)} = ${urnWays(p)}` },
    ];
  },
};

const cmAcUrnsTiles: Generator<MinParams> = {
  id: 'cm-ac-urns-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const p = sampleMins(rng, difficulty >= 2 ? 4 : 3, 2);
      const k = p.mins.length;
      if (distinct([p.r, p.r + k - 1, minWays(p)])) return p;
    }
  },
  render(p) {
    const k = p.mins.length;
    const n = minTotal(p);
    const answer = [p.r, p.r + k - 1, minWays(p)];
    return {
      kind: 'tiles',
      prompt: [
        say(minSetup(p)),
        say(`Hand out the minimums first. Then fill in how many are still to share, how many places a row of those and the ${k - 1} dividers takes, and the number of ways.`),
      ],
      template: '\\text{to share} = {0} \\quad \\text{places} = {1} \\quad \\text{ways} = {2}',
      bank: numberBank(answer, [n, n + k - 1, p.r + k, choose(p.r + k - 1, k), choose(p.r + k, k - 1), choose(n + k - 1, k - 1)], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution: minSolution,
};

/* ---------- an upper limit: take off the shares that go over ---------- */

interface CapParams {
  /** 0: three dice; 1: sweets between three children. */
  context: number;
  /** The most any one can be. */
  m: number;
  T: number;
}

function capParts({ m, T }: CapParams) {
  const free = choose(T - 1, 2);
  const over1 = choose(T - 1 - m, 2);
  const over2 = choose(T - 1 - 2 * m, 2);
  return { free, over1, over2, answer: free - 3 * over1 + 3 * over2 };
}

const cmAcDiceCap: Generator<CapParams> = {
  id: 'cm-ac-dice-cap',
  sample(rng, difficulty) {
    const context = rng.int(0, 1);
    const m = context === 0 ? rng.pick([4, 6, 8, 10, 12]) : rng.int(4, 12);
    const T = difficulty >= 2 ? rng.int(2 * m + 3, 3 * m - 1) : rng.int(m + 3, 2 * m + 2);
    return { context, m, T };
  },
  render(p) {
    const { answer } = capParts(p);
    if (p.context === 0) {
      return typed(
        [
          say(`Three dice, one red, one blue and one green, each have faces numbered 1 to ${p.m}.`),
          say(`In how many of the outcomes do the three dice add up to ${p.T}?`),
        ],
        answer,
        '\\text{outcomes} =',
      );
    }
    return typed(
      [
        say(`${p.T} identical sweets are shared between three children, all of them handed out, so that each child gets at least 1 and at most ${p.m}.`),
        say('In how many ways can this be done?'),
      ],
      answer,
      '\\text{ways} =',
    );
  },
  choices(p) {
    const { free, over1, over2, answer } = capParts(p);
    if (over2 > 0) return numberOptions(answer, [free - 3 * over1, answer - 2 * over2, answer + 3 * over2, free - over1], 1, 1);
    return numberOptions(answer, [free, free - over1, free - 2 * over1, free - 3 * choose(p.T - 2 - p.m, 2)], 1, 1);
  },
  solution(p) {
    const { m, T } = p;
    const { free, over1, over2, answer } = capParts(p);
    const extra = T - 3 - 2 * m;
    const steps: SolutionStep[] = [
      {
        text: p.context === 0
          ? `Take 1 off every die, so each now shows 0 to ${m - 1}, and the three add up to`
          : `Give each child 1 first. Each can then get 0 to ${m - 1} more, and the extra shares add up to`,
      },
      { tex: `${T} - 3 = ${T - 3}` },
      { text: `With no upper limit, share ${T - 3} among 3: a row of ${T - 3} stars and 2 dividers.` },
      { tex: `${binom(T - 1, 2)} = ${free}` },
      {
        text: p.context === 0
          ? `Take off the shares where one die is over ${m - 1}: give that die ${m} first and share the other ${T - 3 - m} freely, for each of the 3 dice:`
          : `Take off the shares where one child gets more than ${m - 1} extra: give that child ${m} extra first and share the other ${T - 3 - m} freely, for each of the 3 children:`,
      },
      { tex: `3 \\times ${binom(T - 1 - m, 2)} = 3 \\times ${over1} = ${3 * over1}` },
    ];
    if (over2 > 0) {
      steps.push(
        {
          text: `Here two can be over at once, and those shares were taken off twice. ${extra === 0 ? `Giving two of them ${m} each leaves nothing to share, so there is 1 way for each of the 3 pairs. Add those back:` : `Give two of them ${m} each and share the other ${extra} freely, for each of the 3 pairs, and add those back:`}`,
        },
        { tex: `3 \\times ${binom(T - 1 - 2 * m, 2)} = 3 \\times ${over2} = ${3 * over2}` },
        { tex: `${free} - ${3 * over1} + ${3 * over2} = ${answer}` },
      );
    } else {
      steps.push({ text: `Two cannot both be over ${m - 1}, as that alone is more than ${T - 3}.` }, { tex: `${free} - ${3 * over1} = ${answer}` });
    }
    return steps;
  },
};

/* ---------- terms of an expansion, and a slack variable ---------- */

interface TermsParams {
  /** 'letters': (a + b + c)^n; 'ineq': x + y + z ≤ n; 'one': (1 + x + y + z)^n. */
  form: 'letters' | 'ineq' | 'one';
  /** How many letters for 'letters'. */
  k: number;
  n: number;
}

/** How many unknowns share n, counting the slack. */
const shareOf = (p: TermsParams) => (p.form === 'letters' ? p.k : 4);

const termsCount = (p: TermsParams) => choose(p.n + shareOf(p) - 1, shareOf(p) - 1);

const cmAcTerms: Generator<TermsParams> = {
  id: 'cm-ac-terms',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { form: rng.pick(['ineq', 'one'] as const), k: 3, n: rng.int(4, 18) };
    const k = rng.chance(0.5) ? 3 : 4;
    return { form: 'letters', k, n: k === 3 ? rng.int(3, 20) : rng.int(3, 14) };
  },
  render(p) {
    if (p.form === 'ineq') {
      return typed(
        [say('How many solutions does this have with $x$, $y$ and $z$ whole numbers, each $0$ or more?'), show(`x + y + z \\le ${p.n}`)],
        termsCount(p),
        '\\text{solutions} =',
      );
    }
    const bracket = p.form === 'one' ? '1 + x + y + z' : p.k === 3 ? 'a + b + c' : 'a + b + c + d';
    return typed(
      [say(`How many different terms does the expansion of $(${bracket})^{${p.n}}$ have, once like terms are collected?`)],
      termsCount(p),
      '\\text{terms} =',
    );
  },
  choices(p) {
    const { n } = p;
    const s = shareOf(p);
    if (p.form === 'letters') {
      const power = p.k ** n <= 100000 ? [p.k ** n] : [];
      return numberOptions(termsCount(p), [...power, n + 1, choose(n + s - 1, s), choose(n + s - 2, s - 1), choose(n - 1, s - 1)], 1, 1);
    }
    return numberOptions(termsCount(p), [choose(n + 2, 2), choose(n + 3, 2), choose(n + 2, 3), choose(n + 4, 3)], 1, 1);
  },
  solution(p) {
    const { n } = p;
    const s = shareOf(p);
    const tail: SolutionStep[] = [{ tex: `${binom(n + s - 1, s - 1)} = ${termsCount(p)}` }];
    if (p.form === 'letters') {
      const letters = p.k === 3 ? 'a^{i} b^{j} c^{l}' : 'a^{i} b^{j} c^{l} d^{m}';
      return [
        { text: `Each term is $${letters}$ with the powers adding up to ${n}. So a term is a way to share ${n} among ${p.k} letters, where a letter may get none: a row of ${n} stars and ${p.k - 1} dividers.` },
        ...tail,
      ];
    }
    if (p.form === 'one') {
      return [
        { text: `Each term is $x^{a} y^{b} z^{c}$ with $a + b + c$ at most ${n}; the $1$ takes up what is left. Treat the $1$ as a fourth letter, $1^{w}$, so that` },
        { tex: `w + a + b + c = ${n}` },
        { text: `and share ${n} among 4, a row of ${n} stars and 3 dividers:` },
        ...tail,
      ];
    }
    return [
      { text: 'Add a fourth unknown $w$ for what is left over:' },
      { tex: `w = ${n} - x - y - z` },
      { text: 'It is $0$ or more, so each solution of the inequality is exactly one solution of' },
      { tex: `x + y + z + w = ${n}` },
      { text: `so share ${n} among 4, a row of ${n} stars and 3 dividers:` },
      ...tail,
    ];
  },
};

export const contestAdvancedCountingGenerators = [
  cmAcNoAdjacent,
  cmAcGapsTable,
  cmAcIncreasingDigits,
  cmAcDiagonalCrossings,
  cmAcContainsDigit,
  cmAcGridAvoid,
  cmAcCommittee,
  cmAcCommitteeTiles,
  cmAcBinomCoeff,
  cmAcExpansionTable,
  cmAcHockeyStick,
  cmAcRowSum,
  cmAcPieMultiples,
  cmAcPieTable,
  cmAcDerangements,
  cmAcOnto,
  cmAcUrnsMinimum,
  cmAcUrnsTiles,
  cmAcDiceCap,
  cmAcTerms,
];
