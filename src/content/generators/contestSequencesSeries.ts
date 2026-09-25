/**
 * Contest Math, level 15: Sequences and Series.
 *
 * Three lessons, each a step past the basics of Level 2 (a term from two
 * others, pairing first with last, writing a geometric sequence out):
 *
 * - arithmetic sequences: terms whose places add to the same number add to
 *   the same total, three terms named `a - d, a, a + d`, a term as the gap
 *   between two sums, and block sums that are themselves arithmetic;
 * - geometric sequences: the middle term is the geometric mean, a sum shifts
 *   into itself when multiplied by the ratio, and a series that goes on for
 *   ever contains a copy of itself;
 * - telescoping series: split each term into a difference so that almost
 *   everything cancels, with fractions, roots and factorials.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import { FRACTION_KEYS, fracAnswer, fracTex, gcd, num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ---------- small helpers of this level ---------- */

/** `3n^{2} - 2n + 5` in the variable `v`, zero terms dropped, a unit coefficient bare. */
function quadTex(p: number, q: number, r: number, v = 'n'): string {
  let out = `${p === 1 ? '' : p}${v}^{2}`;
  if (q !== 0) out += ` ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}${v}`;
  if (r !== 0) out += ` ${r < 0 ? '-' : '+'} ${Math.abs(r)}`;
  return out;
}

/** `gk + c`, as `k`, `3k - 2`, `2k + 1`. */
function linTex(g: number, c: number, v = 'k'): string {
  const head = `${g === 1 ? '' : g}${v}`;
  return c === 0 ? head : `${head} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
}

const bracket = (v: number) => (v < 0 ? `(${v})` : `${v}`);

/** A number in prose: a negative one set as maths, so its minus sign is a real minus. */
const inl = (v: number) => (v < 0 ? `$${v}$` : `${v}`);

function factorial(n: number): number {
  let out = 1;
  for (let k = 2; k <= n; k += 1) out *= k;
  return out;
}

/** A fraction as an option: TeX and a grading string, in lowest terms. */
const fracOption = ([top, bottom]: [number, number]) => ({ tex: fracTex(top, bottom), answer: fracAnswer(top, bottom) });

/**
 * Four options for a fractional answer: the answer and the first three slips
 * that are positive and differ from it and each other in value, topped up
 * with the answer doubled, halved and plus one.
 */
function fractionOptions(correct: [number, number], slips: [number, number][]): ChoiceOption[] {
  const key = ([t, b]: [number, number]) => fracAnswer(t, b);
  const seen = new Set([key(correct)]);
  const picked: [number, number][] = [];
  const [ct, cb] = correct;
  const topUp: [number, number][] = [[2 * ct, cb], [ct, 2 * cb], [ct + cb, cb], [ct + 2 * cb, cb]];
  for (const slip of [...slips, ...topUp]) {
    if (picked.length === 3) break;
    const [t, b] = slip;
    if (!Number.isFinite(t) || !Number.isFinite(b) || b === 0 || t / b <= 0 || seen.has(key(slip))) continue;
    seen.add(key(slip));
    picked.push(slip);
  }
  return options(fracOption(correct), ...picked.sort((x, y) => x[0] / x[1] - y[0] / y[1]).map(fracOption));
}

/** Fraction tokens for a table bank: the answers and `spare` slips, sorted by value, none repeated. */
function fractionBank(answer: [number, number][], slips: [number, number][], spare: number): string[] {
  const taken = new Set(answer.map(([t, b]) => fracTex(t, b)));
  const all: [number, number][] = [...answer];
  let extra = 0;
  for (const slip of slips) {
    if (extra === spare) break;
    const [t, b] = slip;
    if (b === 0 || t / b <= 0 || taken.has(fracTex(t, b))) continue;
    taken.add(fracTex(t, b));
    all.push(slip);
    extra += 1;
  }
  return all.sort((x, y) => x[0] / x[1] - y[0] / y[1]).map(([t, b]) => fracTex(t, b));
}

/* ================================================================
 * Lesson 1: Arithmetic Sequences
 * ================================================================ */

/* ---------- places that add to the same number ---------- */

interface PairsParams {
  first: number;
  step: number;
  /** How many terms are summed. */
  n: number;
  /** The places given: two whose places add to n + 1, or (difficulty 2) three evenly spaced round the middle. */
  places: number[];
}

const aterm = (first: number, step: number, i: number) => first + (i - 1) * step;

const pairsGiven = (p: PairsParams) => p.places.reduce((s, i) => s + aterm(p.first, p.step, i), 0);

const pairsSum = (p: PairsParams) => (p.n * (2 * p.first + (p.n - 1) * p.step)) / 2;

const cmSsIndexPairs: Generator<PairsParams> = {
  id: 'cm-ss-index-pairs',
  sample(rng, difficulty) {
    for (;;) {
      const first = rng.int(-10, 30);
      const step = rng.int(-6, 9);
      if (step === 0) continue;
      if (difficulty >= 2) {
        const m = rng.int(5, 16);
        const i = rng.int(2, m - 2);
        const p = { first, step, n: 2 * m - 1, places: [i, m, 2 * m - i] };
        if (pairsGiven(p) === 0) continue;
        return p;
      }
      const n = rng.int(9, 30);
      const i = rng.int(2, Math.floor(n / 2) - 1);
      const p = { first, step, n, places: [i, n + 1 - i] };
      if (pairsGiven(p) === 0) continue;
      return p;
    }
  },
  render(p) {
    const given = p.places.map((i) => `u_{${i}}`).join(' + ');
    return typed(
      [say('In an arithmetic sequence,'), show(`${given} = ${pairsGiven(p)}`), say(`What is the sum of the first ${p.n} terms?`)],
      pairsSum(p),
      `S_{${p.n}} =`,
    );
  },
  choices(p) {
    const answer = pairsSum(p);
    const given = pairsGiven(p);
    const slips =
      p.places.length === 3
        ? [(p.n * given) / 2, p.n * given, ((p.n + 1) * given) / 3, ((p.n - 1) * given) / 3]
        : [p.n * given, ((p.n - 1) * given) / 2, ((p.n + 1) * given) / 2];
    return numberOptions(answer, slips, 1, -Infinity);
  },
  solution(p) {
    const given = pairsGiven(p);
    if (p.places.length === 3) {
      const [i, m, j] = p.places;
      return [
        { text: `Terms ${i} and ${j} are ${m - i} steps either side of term ${m}, so they add to twice it:` },
        { tex: `u_{${i}} + u_{${j}} = 2u_{${m}}` },
        { tex: `3u_{${m}} = ${given}` },
        { tex: `u_{${m}} = ${given / 3}` },
        { text: `Term ${m} is the middle of the first ${p.n} terms, so it is their mean:` },
        { tex: `S_{${p.n}} = ${p.n} \\times ${bracket(given / 3)} = ${pairsSum(p)}` },
      ];
    }
    const [i, j] = p.places;
    return [
      { text: `Places ${i} and ${j} add to ${p.n + 1}, the same as places 1 and ${p.n}: going from term ${i} back to term 1 loses what going from term ${j} on to term ${p.n} gains.` },
      { tex: `u_{1} + u_{${p.n}} = u_{${i}} + u_{${j}} = ${given}` },
      { text: `Write the sum forwards and backwards and add the two rows: each of the ${p.n} columns makes ${inl(given)}, which is twice the sum.` },
      { tex: `S_{${p.n}} = \\frac{${p.n} \\times ${bracket(given)}}{2} = ${pairsSum(p)}` },
    ];
  },
};

/* ---------- inserting numbers between two ends ---------- */

interface InsertParams {
  low: number;
  step: number;
  /** How many numbers go in between. */
  k: number;
}

const insertHigh = (p: InsertParams) => p.low + (p.k + 1) * p.step;
const insertSum = (p: InsertParams) => (p.k * (p.low + insertHigh(p))) / 2;

const cmSsInsertTiles: Generator<InsertParams> = {
  id: 'cm-ss-insert-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const k = difficulty >= 2 ? rng.int(6, 14) : rng.int(3, 9);
      const step = difficulty >= 2 ? rng.pick([-1, 1]) * rng.int(2, 9) : rng.int(2, 9);
      const low = difficulty >= 2 ? rng.int(10, 120) : rng.int(1, 30);
      const p = { low, step, k };
      if ((k * (low + insertHigh(p))) % 2 !== 0 || insertSum(p) === step) continue;
      return p;
    }
  },
  render(p) {
    const high = insertHigh(p);
    const fence = (high - p.low) % p.k === 0 ? [(high - p.low) / p.k] : [];
    return {
      kind: 'tiles',
      prompt: [
        say(`Put ${p.k} numbers between ${p.low} and ${inl(high)} so that all ${p.k + 2} numbers make an arithmetic sequence.`),
        say('Find the common difference and the sum of the numbers put in.'),
      ],
      // No comma: on a phone the row wraps before the label, and a comma would
      // open the second line on its own.
      template: 'd = {0} \\quad \\text{sum put in} = {1}',
      bank: numberBank([p.step, insertSum(p)], [...fence, insertSum(p) + p.low + high, p.k * (p.low + high), -p.step], 3, 1, -Infinity),
      answer: [num(p.step), num(insertSum(p))],
    };
  },
  solution(p) {
    const high = insertHigh(p);
    return [
      { text: `${p.k + 2} numbers in a row have ${p.k + 1} gaps between them, not ${p.k}:` },
      { tex: `d = (${high} - ${p.low}) \\div ${p.k + 1} = ${p.step}` },
      { text: `The numbers put in pair up from the outside in, and each pair adds to the same as the two ends:` },
      { tex: `\\text{pair} = ${p.low} + ${bracket(high)} = ${p.low + high}` },
      { tex: `\\text{sum} = \\frac{${p.k} \\times ${bracket(p.low + high)}}{2} = ${insertSum(p)}` },
    ];
  },
};

/* ---------- three terms named round the middle ---------- */

interface ThreeParams {
  mid: number;
  gap: number;
  /** Difficulty 1 gives the product, difficulty 2 the sum of the squares. */
  squares: boolean;
}

const threeFact = (p: ThreeParams) =>
  p.squares ? 3 * p.mid * p.mid + 2 * p.gap * p.gap : p.mid * (p.mid * p.mid - p.gap * p.gap);

const cmSsSymmetricThree: Generator<ThreeParams> = {
  id: 'cm-ss-symmetric-three',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { mid: rng.int(3, 25), gap: rng.int(1, 12), squares: true };
    const mid = rng.int(4, 20);
    return { mid, gap: rng.int(1, mid - 1), squares: false };
  },
  render(p) {
    const what = p.squares ? 'their squares add to' : 'they multiply to';
    return typed(
      [say(`Three numbers in an arithmetic sequence add to ${3 * p.mid}, and ${what} ${threeFact(p)}.`), say('What is the largest of the three?')],
      p.mid + p.gap,
      '\\text{largest} =',
    );
  },
  choices(p) {
    const answer = p.mid + p.gap;
    return numberOptions(answer, [p.mid, p.mid + 2 * p.gap, p.mid - p.gap, 2 * p.mid], 1, -Infinity);
  },
  solution(p) {
    const { mid, gap } = p;
    const steps: SolutionStep[] = [
      { text: 'Name the middle one $a$ and the step $d$, so the three are $a - d$, $a$ and $a + d$. The $d$s cancel in the sum:' },
      { tex: `3a = ${3 * mid}` },
      { tex: `a = ${mid}` },
    ];
    if (p.squares) {
      steps.push(
        { text: 'In the squares the cross terms $-2ad$ and $+2ad$ cancel too:' },
        { tex: '(a - d)^{2} + a^{2} + (a + d)^{2}' },
        { tex: '= 3a^{2} + 2d^{2}' },
        { tex: `${3 * mid * mid} + 2d^{2} = ${threeFact(p)}` },
        { tex: `d^{2} = ${gap * gap}` },
      );
    } else {
      steps.push(
        { text: 'The product is a difference of two squares times $a$:' },
        { tex: `${mid}(${mid * mid} - d^{2}) = ${threeFact(p)}` },
        { tex: `${mid * mid} - d^{2} = ${mid * mid - gap * gap}` },
        { tex: `d^{2} = ${gap * gap}` },
      );
    }
    steps.push({ text: `Either sign of $d$ gives the same three numbers, ${inl(mid - gap)}, ${mid} and ${mid + gap}, so the largest is ${mid + gap}.` });
    return steps;
  },
};

/* ---------- a term from the sum rule ---------- */

interface RuleParams {
  p: number;
  q: number;
  k: number;
}

const ruleS = ({ p, q }: RuleParams, n: number) => p * n * n + q * n;
const ruleTerm = (r: RuleParams, n: number) => ruleS(r, n) - ruleS(r, n - 1);

const cmSsSumRule: Generator<RuleParams> = {
  id: 'cm-ss-sum-rule',
  sample(rng, difficulty) {
    for (;;) {
      const p = difficulty >= 2 ? rng.int(2, 9) : rng.int(1, 6);
      const q = difficulty >= 2 ? rng.int(-12, 12) : rng.int(-5, 9);
      if (q === 0) continue;
      return { p, q, k: difficulty >= 2 ? rng.int(30, 90) : rng.int(10, 40) };
    }
  },
  render(r) {
    return typed(
      [say('The sum of the first $n$ terms of a sequence is'), show(`S_n = ${quadTex(r.p, r.q, 0)}`), say(`What is $u_{${r.k}}$?`)],
      ruleTerm(r, r.k),
      `u_{${r.k}} =`,
    );
  },
  choices(r) {
    const answer = ruleTerm(r, r.k);
    return numberOptions(answer, [ruleS(r, r.k), r.p * r.k + r.q, 2 * r.p * r.k + r.q, ruleTerm(r, r.k + 1)], 1, -Infinity);
  },
  solution(r) {
    const k = r.k;
    return [
      { text: `The first ${k} terms are the first ${k - 1} terms and one more, so term ${k} is the difference of two sums:` },
      { tex: `u_{${k}} = S_{${k}} - S_{${k - 1}}` },
      { tex: `= ${ruleS(r, k)} - ${bracket(ruleS(r, k - 1))}` },
      { tex: `= ${ruleTerm(r, k)}` },
    ];
  },
};

/* ---------- the terms from a table of sums ---------- */

const cmSsSumRuleTable: Generator<RuleParams> = {
  id: 'cm-ss-sum-rule-table',
  sample(rng, difficulty) {
    for (;;) {
      const p = difficulty >= 2 ? rng.int(2, 9) : rng.int(1, 6);
      const q = difficulty >= 2 ? rng.int(-12, 12) : rng.int(-5, 9);
      // A first term of 0 reads as a slip in the table.
      if (q === 0 || p + q === 0) continue;
      return { p, q, k: 4 };
    }
  },
  render(r) {
    const rows = [1, 2, 3, 4];
    const terms = rows.map((n) => ruleTerm(r, n));
    return {
      kind: 'table',
      prompt: [say('The table gives $S_n$, the sum of the first $n$ terms of a sequence. Fill in each term $u_n$.')],
      columns: ['n', 'S_n', 'u_n'],
      rows: rows.map((n) => [String(n), num(ruleS(r, n)), null]),
      bank: numberBank(terms, [ruleS(r, 2), ruleS(r, 3), ruleTerm(r, 5), ruleTerm(r, 0)], 3, 1, -Infinity),
      answer: terms.map(num),
    };
  },
  solution(r) {
    return [
      { text: 'The first term is the first sum. After that each term is what its sum adds to the one before:' },
      { tex: `u_{1} = S_{1} = ${ruleS(r, 1)}` },
      ...[2, 3, 4].map((n) => ({ tex: `u_{${n}} = ${ruleS(r, n)} - ${bracket(ruleS(r, n - 1))} = ${ruleTerm(r, n)}` })),
      { text: `The terms go up by ${2 * r.p} each time: an arithmetic sequence.` },
    ];
  },
};

/* ---------- block sums ---------- */

interface BlockParams {
  first: number;
  step: number;
  /** The length of each block. */
  m: number;
}

const blockS = (p: BlockParams, n: number) => n * p.first + (p.step * n * (n - 1)) / 2;

const cmSsBlockSums: Generator<BlockParams> = {
  id: 'cm-ss-block-sums',
  sample(rng, difficulty) {
    for (;;) {
      const m = difficulty >= 2 ? rng.int(6, 15) : rng.pick([5, 10]);
      const first = difficulty >= 2 ? rng.int(-10, 30) : rng.int(1, 20);
      const step = difficulty >= 2 ? rng.int(-3, 6) : rng.int(1, 5);
      const p = { first, step, m };
      if (step === 0 || blockS(p, m) <= 0 || blockS(p, 2 * m) <= blockS(p, m) || blockS(p, 3 * m) <= 0) continue;
      return p;
    }
  },
  render(p) {
    const { m } = p;
    return typed(
      [
        say(`The first ${m} terms of an arithmetic sequence add to ${blockS(p, m)}, and the first ${2 * m} terms add to ${blockS(p, 2 * m)}.`),
        say(`What do the first ${3 * m} terms add to?`),
      ],
      blockS(p, 3 * m),
      `S_{${3 * m}} =`,
    );
  },
  choices(p) {
    const s1 = blockS(p, p.m);
    const s2 = blockS(p, 2 * p.m);
    return numberOptions(blockS(p, 3 * p.m), [s1 + s2, 2 * s2 - s1, 3 * s1, (3 * s2) / 2], 1, -Infinity);
  },
  solution(p) {
    const { m } = p;
    const b1 = blockS(p, m);
    const b2 = blockS(p, 2 * m) - b1;
    const b3 = 2 * b2 - b1;
    return [
      { text: `Cut the ${3 * m} terms into three blocks of ${m}. Each term of a block is ${m} steps past the one above it, so the block sums go up by the same amount each time:` },
      { tex: `B_{1} = ${b1}` },
      { tex: `B_{2} = ${blockS(p, 2 * m)} - ${b1} = ${b2}` },
      { tex: `B_{3} = ${b2} + (${b2} - ${b1}) = ${b3}` },
      { tex: `S_{${3 * m}} = ${b1} + ${b2} + ${bracket(b3)} = ${blockS(p, 3 * m)}` },
      { text: `That is three times the middle block, ${b2}.` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Geometric Sequences
 * ================================================================ */

/* ---------- the geometric mean ---------- */

interface MeanParams {
  /** The earlier given term's value and place. */
  base: number;
  m: number;
  ratio: number;
  /** Half the gap between the given places. */
  g: number;
  /** Difficulty 2 asks for the term as far past the later one. */
  beyond: boolean;
}

const gTerm = (p: MeanParams, steps: number) => p.base * p.ratio ** steps;

const meanAsked = (p: MeanParams) => (p.beyond ? gTerm(p, 4 * p.g) : gTerm(p, p.g));
const meanPlace = (p: MeanParams) => (p.beyond ? p.m + 4 * p.g : p.m + p.g);

const cmSsGeoMiddle: Generator<MeanParams> = {
  id: 'cm-ss-geo-middle',
  sample(rng, difficulty) {
    for (;;) {
      const beyond = difficulty >= 2;
      const p = { base: rng.int(1, 12), m: rng.int(2, 6), ratio: rng.int(2, 3), g: rng.int(1, beyond ? 2 : 3), beyond };
      if (meanAsked(p) > 400000 || gTerm(p, 2 * p.g) > 100000) continue;
      return p;
    }
  },
  render(p) {
    const n = p.m + 2 * p.g;
    return typed(
      [say(`A geometric sequence of positive terms has $u_{${p.m}} = ${p.base}$ and $u_{${n}} = ${gTerm(p, 2 * p.g)}$.`), say(`What is $u_{${meanPlace(p)}}$?`)],
      meanAsked(p),
      `u_{${meanPlace(p)}} =`,
    );
  },
  choices(p) {
    const lo = p.base;
    const hi = gTerm(p, 2 * p.g);
    const slips = p.beyond ? [2 * hi - lo, gTerm(p, 3 * p.g), hi * hi, gTerm(p, 4 * p.g + 1)] : [(lo + hi) / 2, gTerm(p, p.g + 1), gTerm(p, p.g - 1), hi / 2];
    return numberOptions(meanAsked(p), slips, 1, 1);
  },
  solution(p) {
    const n = p.m + 2 * p.g;
    const lo = p.base;
    const hi = gTerm(p, 2 * p.g);
    if (p.beyond) {
      const far = meanPlace(p);
      return [
        { text: `Places ${p.m} and ${far} are ${2 * p.g} either side of place ${n}, so $u_{${n}}$ is their geometric mean:` },
        { tex: `u_{${n}}^{2} = u_{${p.m}} \\times u_{${far}}` },
        { tex: `${hi}^{2} = ${lo} \\times u_{${far}}` },
        { tex: `u_{${far}} = ${hi * hi} \\div ${lo} = ${meanAsked(p)}` },
      ];
    }
    const mid = meanPlace(p);
    return [
      { text: `Place ${mid} is ${p.g} step${p.g === 1 ? '' : 's'} from each given place, so the same factor takes $u_{${p.m}}$ to $u_{${mid}}$ and $u_{${mid}}$ to $u_{${n}}$. It is the geometric mean:` },
      { tex: `u_{${mid}}^{2} = ${lo} \\times ${hi} = ${lo * hi}` },
      { tex: `u_{${mid}} = \\sqrt{${lo * hi}} = ${meanAsked(p)}` },
      { text: `The average of ${lo} and ${hi} is the arithmetic mean, which is the trap.` },
    ];
  },
};

/* ---------- multiply by the ratio and subtract ---------- */

interface ShiftParams {
  first: number;
  ratio: number;
  /** How many terms. */
  n: number;
}

const shiftLast = (p: ShiftParams) => p.first * p.ratio ** (p.n - 1);
const shiftSum = (p: ShiftParams) => (p.ratio * shiftLast(p) - p.first) / (p.ratio - 1);

function sampleShift(rng: { int(a: number, b: number): number }, difficulty: number): ShiftParams {
  for (;;) {
    const ratio = difficulty >= 2 ? rng.int(3, 5) : 2;
    const first = difficulty >= 2 ? rng.int(1, 9) : rng.int(1, 15);
    const n = difficulty >= 2 ? rng.int(5, 8) : rng.int(6, 12);
    const p = { first, ratio, n };
    if (shiftLast(p) > 200000) continue;
    return p;
  }
}

const shiftTex = (p: ShiftParams) => `${p.first} + ${p.first * p.ratio} + ${p.first * p.ratio ** 2} + \\cdots + ${shiftLast(p)}`;

function shiftSolution(p: ShiftParams): SolutionStep[] {
  const r = p.ratio;
  const last = shiftLast(p);
  return [
    { text: `Call the sum $S$. Multiplying every term by ${r} moves the list one place along:` },
    { tex: `S = ${shiftTex(p)}` },
    { tex: `${r}S = ${p.first * r} + \\cdots + ${last} + ${r * last}` },
    { text: 'Subtract: every term cancels except the new last one and the old first one.' },
    { tex: `${r}S - S = ${r * last} - ${p.first}` },
    { tex: `${r === 2 ? '' : r - 1}S = ${r * last - p.first}` },
    ...(r === 2 ? [] : [{ tex: `S = ${shiftSum(p)}` }]),
  ];
}

const cmSsGeoShiftSum: Generator<ShiftParams> = {
  id: 'cm-ss-geo-shift-sum',
  sample: sampleShift,
  render(p) {
    return typed([say('Add up the series.'), show(shiftTex(p))], shiftSum(p), '\\text{sum} =');
  },
  choices(p) {
    const last = shiftLast(p);
    const arith = (p.n * (p.first + last)) / 2;
    return numberOptions(shiftSum(p), [p.ratio * last - p.first, p.ratio * last, arith, 2 * last, shiftSum(p) - p.first], 1, 1);
  },
  solution: shiftSolution,
};

const cmSsGeoShiftTiles: Generator<ShiftParams> = {
  id: 'cm-ss-geo-shift-tiles',
  sample: sampleShift,
  render(p) {
    const r = p.ratio;
    const last = shiftLast(p);
    return {
      kind: 'tiles',
      prompt: [say(`Call the sum $S$. Multiply it by ${r} and subtract $S$.`), show(`S = ${shiftTex(p)}`)],
      template: `${r}S - S = {0} - {1} \\quad S = {2}`,
      bank: numberBank([r * last, p.first, shiftSum(p)], [last, p.first * r, r * last - p.first + 1, shiftSum(p) + p.first], 3, 1, 1),
      answer: [num(r * last), num(p.first), num(shiftSum(p))],
    };
  },
  solution: shiftSolution,
};

/* ---------- a table from two terms ---------- */

interface GeoTableParams {
  first: number;
  ratio: number;
  shown: [number, number];
}

const gtVal = (p: GeoTableParams, i: number) => p.first * p.ratio ** (i - 1);

const cmSsGeoTable: Generator<GeoTableParams> = {
  id: 'cm-ss-geo-table',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const i = rng.int(1, 2);
      return { first: rng.pick([-1, 1]) * rng.int(1, 12), ratio: -rng.int(2, 3), shown: [i, i + 3] };
    }
    const i = rng.int(1, 3);
    const j = i + rng.int(2, Math.min(3, 5 - i));
    return { first: rng.int(1, 12), ratio: rng.int(2, 3), shown: [i, j] };
  },
  render(p) {
    const [i, j] = p.shown;
    const blanks = [1, 2, 3, 4, 5].filter((n) => !p.shown.includes(n));
    // Filling the gap evenly, as if the sequence were arithmetic, is the trap.
    const even = (n: number) => gtVal(p, i) + ((gtVal(p, j) - gtVal(p, i)) * (n - i)) / (j - i);
    const positive = p.ratio > 0 ? ' of positive terms' : '';
    return {
      kind: 'table',
      prompt: [say(`The table shows a geometric sequence${positive}. Fill in the missing terms.`)],
      columns: ['n', 'u_n'],
      rows: [1, 2, 3, 4, 5].map((n) => [String(n), p.shown.includes(n) ? num(gtVal(p, n)) : null]),
      bank: numberBank(blanks.map((n) => gtVal(p, n)), [...blanks.map(even).filter((v) => Number.isInteger(v) && (p.ratio < 0 || v > 0)),...blanks.map((n) => -gtVal(p, n)), gtVal(p, 6)], 3, 1, -Infinity),
      answer: blanks.map((n) => num(gtVal(p, n))),
    };
  },
  solution(p) {
    const [i, j] = p.shown;
    const gap = j - i;
    const power = gap === 2 ? 'square' : 'cube';
    return [
      { text: `From term ${i} to term ${j} is ${gap} steps, each multiplying by $r$:` },
      { tex: `r^{${gap}} = ${gtVal(p, j)} \\div ${bracket(gtVal(p, i))} = ${p.ratio ** gap}` },
      { text: `The ${power} root gives $r = ${p.ratio}$${gap === 2 ? ', taking the positive root as the terms are positive' : ''}. Multiply by $r$ to go down the table, divide to go up:` },
      { tex: [1, 2, 3, 4, 5].map((n) => num(gtVal(p, n))).join(', \\; ') },
    ];
  },
};

/* ---------- a series that goes on for ever ---------- */

const RATIOS: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [2, 5],
  [3, 5],
  [1, 5],
];

interface InfParams {
  /** The first term, a multiple of q squared so the first three terms are whole. */
  first: number;
  p: number;
  q: number;
  alternating: boolean;
}

const infValue = (s: InfParams): [number, number] => [s.first * s.q, s.alternating ? s.q + s.p : s.q - s.p];

const cmSsGeoInfinite: Generator<InfParams> = {
  id: 'cm-ss-geo-infinite',
  sample(rng, difficulty) {
    const [p, q] = rng.pick(RATIOS);
    return { first: q * q * rng.int(1, 8), p, q, alternating: difficulty >= 2 };
  },
  render(s) {
    const t2 = (s.first * s.p) / s.q;
    const t3 = (s.first * s.p * s.p) / (s.q * s.q);
    const op = s.alternating ? '-' : '+';
    const [top, bottom] = infValue(s);
    return typed(
      [say('The series goes on for ever. What does it add up to?'), show(`${s.first} ${op} ${t2} + ${t3} ${op} \\cdots`)],
      fracAnswer(top, bottom),
      '\\text{sum} =',
      FRACTION_KEYS,
    );
  },
  choices(s) {
    const [top, bottom] = infValue(s);
    const other: [number, number] = [s.first * s.q, s.alternating ? s.q - s.p : s.q + s.p];
    return fractionOptions(
      [top, bottom],
      [other, [s.first * s.p, s.alternating ? s.q + s.p : s.q - s.p], [2 * s.first, 1], [s.first * s.q, s.p]],
    );
  },
  solution(s) {
    const [top, bottom] = infValue(s);
    const r = fracTex(s.p, s.q);
    const sign = s.alternating ? '-' : '+';
    const coeff = fracTex(bottom, s.q);
    return [
      {
        text: s.alternating
          ? `Each term is $-${r}$ times the one before. Everything after the first term is $-${r}$ times the whole series again:`
          : `Each term is $${r}$ of the one before. Everything after the first term is $${r}$ of the whole series again:`,
      },
      { tex: `S = ${s.first} ${sign} ${r}S` },
      { tex: `${coeff}S = ${s.first}` },
      { tex: `S = ${s.first} \\div ${coeff} = ${fracTex(top, bottom)}` },
    ];
  },
};

/* ---------- the bouncing ball ---------- */

const BOUNCES: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [3, 4],
  [2, 5],
  [3, 5],
  [4, 5],
];

interface BounceParams {
  height: number;
  p: number;
  q: number;
}

const bounceTotal = ({ height, p, q }: BounceParams) => (height * (q + p)) / (q - p);

const cmSsBounce: Generator<BounceParams> = {
  id: 'cm-ss-bounce',
  sample(rng, difficulty) {
    for (;;) {
      const [p, q] = rng.pick(BOUNCES);
      const unit = q * (q - p);
      const height = unit * rng.int(1, 60);
      if (height > (difficulty >= 2 ? 240 : 100) || (difficulty >= 2 && height <= 20)) continue;
      return { height, p, q };
    }
  },
  render(b) {
    return typed(
      [
        say(`A ball is dropped from ${b.height} m. After each bounce it rises to $\\frac{${b.p}}{${b.q}}$ of the height it fell from, and it bounces for ever.`),
        say('How far does it travel altogether, up and down, in metres?'),
      ],
      bounceTotal(b),
      '\\text{distance} =',
    );
  },
  choices(b) {
    const { height: h, p, q } = b;
    return numberOptions(bounceTotal(b), [(h * q) / (q - p), (2 * h * q) / (q - p), (h * (q + p)) / q, (h * p) / (q - p)], 1, 1);
  },
  solution(b) {
    const { height: h, p, q } = b;
    const up = (h * p) / q;
    const ups = (h * p) / (q - p);
    return [
      { text: `The first fall of ${h} m happens once. Every bounce after it is travelled twice, up and then down.` },
      { text: `The bounce heights are a series that goes on for ever, starting at ${up} with ratio $\\frac{${p}}{${q}}$:` },
      { tex: `${up} \\div \\left(1 - \\frac{${p}}{${q}}\\right) = ${ups}` },
      { tex: `${h} + 2 \\times ${ups} = ${bounceTotal(b)}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Telescoping Series
 * ================================================================ */

/* ---------- 1/(k(k + 1)) ---------- */

interface UnitParams {
  /** The first k. */
  start: number;
  /** The last k. */
  end: number;
  /** Difficulty 2 writes each denominator multiplied out. */
  disguised: boolean;
}

/** 1/start - 1/(end + 1). */
const unitValue = (p: UnitParams): [number, number] => [p.end + 1 - p.start, p.start * (p.end + 1)];

const cmSsTeleUnit: Generator<UnitParams> = {
  id: 'cm-ss-tele-unit',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const start = rng.int(3, 12);
      return { start, end: start + rng.int(6, 40), disguised: true };
    }
    return { start: 1, end: rng.int(8, 99), disguised: false };
  },
  render(p) {
    const term = (k: number) => (p.disguised ? `\\frac{1}{${k * (k + 1)}}` : `\\frac{1}{${k} \\times ${k + 1}}`);
    const [top, bottom] = unitValue(p);
    return typed(
      [say('Add up the series. Give an exact answer.'), show(`${term(p.start)} + ${term(p.start + 1)} + ${term(p.start + 2)} + \\cdots + ${term(p.end)}`)],
      fracAnswer(top, bottom),
      '\\text{sum} =',
      FRACTION_KEYS,
    );
  },
  choices(p) {
    const { start: s, end: n } = p;
    const slips: [number, number][] = p.disguised
      ? [[n, n + 1], [n - s, s * n], [n + 1 - s, n + 1]]
      : [[n - 1, n], [n + 1, n + 2], [1, n + 1]];
    return fractionOptions(unitValue(p), slips);
  },
  solution(p) {
    const { start: s, end: n } = p;
    const [top, bottom] = unitValue(p);
    const steps: SolutionStep[] = [];
    if (p.disguised) {
      steps.push({ text: `Each bottom is two neighbours multiplied: $${s * (s + 1)} = ${s} \\times ${s + 1}$, and so on up to $${n * (n + 1)} = ${n} \\times ${n + 1}$.` });
    }
    steps.push(
      { text: 'Split each term into a difference:' },
      { tex: '\\frac{1}{k(k + 1)} = \\frac{1}{k} - \\frac{1}{k + 1}' },
      { tex: `\\left(${s === 1 ? '1' : `\\frac{1}{${s}}`} - \\frac{1}{${s + 1}}\\right) + \\left(\\frac{1}{${s + 1}} - \\frac{1}{${s + 2}}\\right) + \\cdots` },
      { tex: `\\cdots + \\left(\\frac{1}{${n}} - \\frac{1}{${n + 1}}\\right)` },
      { text: 'Every fraction in the middle appears once with each sign and cancels, leaving the first and the last:' },
      { tex: `${s === 1 ? '1' : `\\frac{1}{${s}}`} - \\frac{1}{${n + 1}} = ${fracTex(top, bottom)}` },
    );
    return steps;
  },
};

/* ---------- a table of partial sums ---------- */

interface PartialParams {
  gap: number;
  /** The far row's k. */
  far: number;
}

const partialS = (p: PartialParams, k: number): [number, number] => [k, p.gap * k + 1];
const partialTerm = (p: PartialParams, k: number) => `\\frac{1}{${p.gap * (k - 1) + 1} \\times ${p.gap * k + 1}}`;

const cmSsTeleTable: Generator<PartialParams> = {
  id: 'cm-ss-tele-table',
  sample(rng, difficulty) {
    return difficulty >= 2 ? { gap: rng.int(2, 5), far: rng.int(20, 99) } : { gap: rng.int(1, 3), far: rng.int(10, 60) };
  },
  render(p) {
    const ks = [1, 2, 3, 4, p.far];
    const answer = ks.slice(1).map((k) => partialS(p, k));
    const slips = ks.slice(1).flatMap((k): [number, number][] => [
      [k, p.gap * k + 1 + p.gap],
      [k + 1, p.gap * k + 1],
      [k - 1, p.gap * k + 1],
    ]);
    const [s1t, s1b] = partialS(p, 1);
    return {
      kind: 'table',
      prompt: [say('$u_k$ is the $k$th term of a series and $S_k$ the sum of its first $k$ terms. Fill in the sums.')],
      columns: ['k', 'u_k', 'S_k'],
      rows: ks.map((k) => [String(k), partialTerm(p, k), k === 1 ? fracTex(s1t, s1b) : null]),
      bank: fractionBank(answer, slips, 3),
      answer: answer.map(([t, b]) => fracTex(t, b)),
    };
  },
  solution(p) {
    const g = p.gap;
    const inFront = g === 1 ? '' : `\\frac{1}{${g}}`;
    const sums = [2, 3, 4].map((k) => `S_{${k}} = ${fracTex(...partialS(p, k))}`).join(', \\qquad ');
    return [
      { text: g === 1 ? 'Split each term into a difference:' : `The bottom numbers differ by ${g}, so each term splits with $\\frac{1}{${g}}$ in front:` },
      { tex: `u_{k} = ${inFront}\\left(\\frac{1}{${linTex(g, 1 - g)}} - \\frac{1}{${linTex(g, 1)}}\\right)` },
      { text: 'Adding, the middle fractions cancel, leaving the first and the last:' },
      { tex: `S_{k} = ${inFront}\\left(1 - \\frac{1}{${linTex(g, 1)}}\\right) = \\frac{k}{${linTex(g, 1)}}` },
      { tex: sums },
      { tex: `S_{${p.far}} = ${fracTex(...partialS(p, p.far))}` },
    ];
  },
};

/* ---------- bottoms that differ by more than one ---------- */

interface GapParams {
  /** Difficulty 1: a/(a + g) steps; difficulty 2: k(k + 2) for k = first to n. */
  first: number;
  gap: number;
  n: number;
  skip: boolean;
}

/** 1/2 (1/a + 1/(a + 1) - 1/(n + 1) - 1/(n + 2)), unreduced. */
function skipValue(a: number, n: number): [number, number] {
  const top = (2 * a + 1) * (n + 1) * (n + 2) - a * (a + 1) * (2 * n + 3);
  return [top, 2 * a * (a + 1) * (n + 1) * (n + 2)];
}

/**
 * The k(k + 2) sums a phone can take as a typed fraction: a start of 1 or 2
 * and the ends whose answer, in lowest terms, has a bottom of at most 600.
 */
const SKIP_DRAWS: [number, number][] = [];
for (const a of [1, 2]) {
  for (let n = a + 5; n <= 45; n += 1) {
    const [top, bottom] = skipValue(a, n);
    if (bottom / gcd(top, bottom) <= 600) SKIP_DRAWS.push([a, n]);
  }
}

function gapValue(p: GapParams): [number, number] {
  if (p.skip) return skipValue(p.first, p.n);
  const last = p.first + p.n * p.gap;
  return [p.n, p.first * last];
}

/** `1` for k = 1, otherwise `\frac{1}{k}`. */
const unitFrac = (k: number) => (k === 1 ? '1' : `\\frac{1}{${k}}`);

const cmSsTeleGap: Generator<GapParams> = {
  id: 'cm-ss-tele-gap',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const [first, n] = rng.pick(SKIP_DRAWS);
      return { first, gap: 2, n, skip: true };
    }
    return { first: rng.int(1, 5), gap: rng.int(2, 4), n: rng.int(6, 30), skip: false };
  },
  render(p) {
    let tex: string;
    if (p.skip) {
      const term = (k: number) => `\\frac{1}{${k} \\times ${k + 2}}`;
      tex = `${term(p.first)} + ${term(p.first + 1)} + ${term(p.first + 2)} + \\cdots + ${term(p.n)}`;
    } else {
      const b = (i: number) => p.first + i * p.gap;
      tex = `\\frac{1}{${b(0)} \\times ${b(1)}} + \\frac{1}{${b(1)} \\times ${b(2)}} + \\cdots + \\frac{1}{${b(p.n - 1)} \\times ${b(p.n)}}`;
    }
    const [top, bottom] = gapValue(p);
    return typed([say('Add up the series. Give an exact answer.'), show(tex)], fracAnswer(top, bottom), '\\text{sum} =', FRACTION_KEYS);
  },
  choices(p) {
    const [top, bottom] = gapValue(p);
    if (p.skip) {
      const { first: a, n } = p;
      // One survivor at each end, the sum that never stops, and the half forgotten.
      return fractionOptions(
        [top, bottom],
        [[n + 2 - a, 2 * a * (n + 2)], [2 * a + 1, 2 * a * (a + 1)], [2 * top, bottom]],
      );
    }
    const last = p.first + p.n * p.gap;
    return fractionOptions([top, bottom], [[p.gap * p.n, p.first * last], [p.n - 1, p.first * (last - p.gap)], [p.n, last]]);
  },
  solution(p) {
    const [top, bottom] = gapValue(p);
    if (p.skip) {
      const { first: a, n } = p;
      return [
        { text: 'The bottom numbers differ by 2, so each term splits with $\\frac{1}{2}$ in front:' },
        { tex: '\\frac{1}{k(k + 2)} = \\frac{1}{2}\\left(\\frac{1}{k} - \\frac{1}{k + 2}\\right)' },
        { text: 'Each fraction cancels with the one two terms later, so two survive at each end:' },
        { tex: `\\frac{1}{2}\\left(${unitFrac(a)} + \\frac{1}{${a + 1}} - \\frac{1}{${n + 1}} - \\frac{1}{${n + 2}}\\right)` },
        { tex: `= ${fracTex(top, bottom)}` },
      ];
    }
    const g = p.gap;
    const a = p.first;
    const last = a + p.n * g;
    return [
      { text: `The bottom numbers differ by ${g}, so each term splits with $\\frac{1}{${g}}$ in front:` },
      { tex: `\\frac{1}{${a} \\times ${a + g}} = \\frac{1}{${g}}\\left(${a === 1 ? '1' : `\\frac{1}{${a}}`} - \\frac{1}{${a + g}}\\right)` },
      { text: 'Adding, the middle fractions cancel, leaving the first and the last:' },
      { tex: `\\frac{1}{${g}}\\left(${a === 1 ? '1' : `\\frac{1}{${a}}`} - \\frac{1}{${last}}\\right) = ${fracTex(top, bottom)}` },
    ];
  },
};

/* ---------- roots ---------- */

interface RootParams {
  /** The first root is of low², the last reaches high². */
  low: number;
  high: number;
  /** Difficulty 2: steps of 2 over odd numbers. */
  two: boolean;
}

const rootValue = (p: RootParams) => (p.two ? (p.high - p.low) / 2 : p.high - p.low);

const rootTex = (v: number) => (v === 1 ? '1' : `\\sqrt{${v}}`);

const cmSsTeleRoots: Generator<RootParams> = {
  id: 'cm-ss-tele-roots',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const low = rng.pick([1, 3, 5]);
      return { low, high: low + 2 * rng.int(2, 18), two: true };
    }
    const low = rng.int(1, 3);
    return { low, high: low + rng.int(3, 17), two: false };
  },
  render(p) {
    const s = p.two ? 2 : 1;
    const a = p.low * p.low;
    const z = p.high * p.high;
    const term = (k: number) => `\\frac{1}{${rootTex(k)} + \\sqrt{${k + s}}}`;
    return typed(
      [say('Add up the series.'), show(`${term(a)} + ${term(a + s)} + \\cdots + ${term(z - s)}`)],
      rootValue(p),
      '\\text{sum} =',
    );
  },
  choices(p) {
    const answer = rootValue(p);
    const count = (p.high * p.high - p.low * p.low) / (p.two ? 2 : 1);
    const slips = p.two ? [p.high - p.low, answer + 1, count, answer - 1] : [count, answer - 1, answer + 1, answer / 2];
    return numberOptions(answer, slips, 1, 1);
  },
  solution(p) {
    const s = p.two ? 2 : 1;
    const a = p.low * p.low;
    const z = p.high * p.high;
    const steps: SolutionStep[] = [
      { text: `Multiply the top and bottom by $\\sqrt{k + ${s}} - \\sqrt{k}$. The bottom becomes a difference of squares, $(k + ${s}) - k = ${s}$:` },
      {
        tex: `\\frac{1}{\\sqrt{k} + \\sqrt{k + ${s}}} = ${s === 2 ? '\\frac{1}{2}\\left(\\sqrt{k + 2} - \\sqrt{k}\\right)' : '\\sqrt{k + 1} - \\sqrt{k}'}`,
      },
      { text: 'Adding, each root cancels with the next term, leaving the last and the first:' },
      { tex: s === 2 ? `\\frac{1}{2}\\left(\\sqrt{${z}} - ${rootTex(a)}\\right)` : `\\sqrt{${z}} - ${rootTex(a)}` },
    ];
    steps.push({ tex: s === 2 ? `\\frac{1}{2}(${p.high} - ${p.low}) = ${rootValue(p)}` : `${p.high} - ${p.low} = ${rootValue(p)}` });
    return steps;
  },
};

/* ---------- factorials ---------- */

interface FactParams {
  start: number;
  end: number;
  /** k/(k + 1)! instead of k × k!. */
  fraction: boolean;
}

/**
 * Every (start, end) with at least two terms and end at most 8, so the answer,
 * 9! at most, stays within six digits.
 */
const PRODUCT_RANGES: [number, number][] = [];
for (let s = 1; s <= 7; s += 1) for (let n = s + 1; n <= 8; n += 1) PRODUCT_RANGES.push([s, n]);
/** End at most 5, so the typed fraction's bottom is 6! = 720 at most. */
const FRACTION_RANGES: [number, number][] = [];
for (let s = 1; s <= 4; s += 1) for (let n = s + 1; n <= 5; n += 1) FRACTION_RANGES.push([s, n]);

const factProduct = (p: FactParams) => factorial(p.end + 1) - factorial(p.start);
/** 1/start! - 1/(end + 1)!. */
const factFraction = (p: FactParams): [number, number] => [factorial(p.end + 1) / factorial(p.start) - 1, factorial(p.end + 1)];

function factTerms(p: FactParams): string[] {
  const term = (k: number) => (p.fraction ? `\\frac{${k}}{${k + 1}!}` : `${k} \\times ${k}!`);
  if (p.end - p.start + 1 <= 3) return Array.from({ length: p.end - p.start + 1 }, (_, i) => term(p.start + i));
  return [term(p.start), term(p.start + 1), '\\cdots', term(p.end)];
}

const cmSsTeleFactorial: Generator<FactParams> = {
  id: 'cm-ss-tele-factorial',
  sample(rng, difficulty) {
    if (difficulty >= 2 && rng.chance(0.5)) {
      const [start, end] = rng.pick(FRACTION_RANGES);
      return { start, end, fraction: true };
    }
    const pool = difficulty >= 2 ? PRODUCT_RANGES.filter(([s]) => s >= 2) : PRODUCT_RANGES;
    const [start, end] = rng.pick(pool);
    return { start, end, fraction: false };
  },
  render(p) {
    const tex = factTerms(p).join(' + ');
    if (p.fraction) {
      const [top, bottom] = factFraction(p);
      return typed([say('Add up the series. Give an exact answer.'), show(tex)], fracAnswer(top, bottom), '\\text{sum} =', FRACTION_KEYS);
    }
    return typed([say('Add up the series.'), show(tex)], factProduct(p), '\\text{sum} =');
  },
  choices(p) {
    const { start: s, end: n } = p;
    if (p.fraction) {
      const big = factorial(n + 1);
      return fractionOptions(factFraction(p), [
        [big - 1, big],
        [factorial(n) / factorial(s) - 1, factorial(n)],
        [1, factorial(s)],
      ]);
    }
    return numberOptions(factProduct(p), [factorial(n + 1) - 1, factorial(n + 1), factorial(n + 1) - factorial(s + 1), factorial(n) - factorial(s)], 1, 1);
  },
  solution(p) {
    const { start: s, end: n } = p;
    if (p.fraction) {
      const [top, bottom] = factFraction(p);
      return [
        { text: 'Write the top as $(k + 1) - 1$ and split:' },
        { tex: '\\frac{k}{(k + 1)!} = \\frac{k + 1}{(k + 1)!} - \\frac{1}{(k + 1)!}' },
        { tex: '= \\frac{1}{k!} - \\frac{1}{(k + 1)!}' },
        { text: 'Adding, the middle fractions cancel, leaving the first and the last:' },
        { tex: `\\frac{1}{${s}!} - \\frac{1}{${n + 1}!} = ${s === 1 ? '1' : `\\frac{1}{${factorial(s)}}`} - \\frac{1}{${factorial(n + 1)}}` },
        { tex: `= ${fracTex(top, bottom)}` },
      ];
    }
    return [
      { text: 'Write $k$ as $(k + 1) - 1$:' },
      { tex: 'k \\times k! = (k + 1)! - k!' },
      { text: 'Adding, the middle factorials cancel, leaving the last and the first:' },
      { tex: `${n + 1}! - ${s}! = ${factorial(n + 1)} - ${factorial(s)}` },
      { tex: `= ${factProduct(p)}` },
    ];
  },
};

export const contestSequencesSeriesGenerators = [
  cmSsIndexPairs,
  cmSsInsertTiles,
  cmSsSymmetricThree,
  cmSsSumRule,
  cmSsSumRuleTable,
  cmSsBlockSums,
  cmSsGeoMiddle,
  cmSsGeoShiftSum,
  cmSsGeoShiftTiles,
  cmSsGeoTable,
  cmSsGeoInfinite,
  cmSsBounce,
  cmSsTeleUnit,
  cmSsTeleTable,
  cmSsTeleGap,
  cmSsTeleRoots,
  cmSsTeleFactorial,
];
