/**
 * Contest Math, level 8: Probability.
 *
 * Four lessons. Probability by Outcomes counts equally likely outcomes, and
 * the trap is always a list of outcomes that are not equally likely: the
 * eleven totals of two dice, the head-counts of five coins, a pair of numbers
 * read without its order. PIE and Complements adds two events and takes the
 * overlap off, and turns "at least one" into one minus "none". Choosing counts
 * with binomial coefficients, where the trap is putting the counters back.
 * Symmetry and Conditional answers without counting (every place in a line
 * is as likely as every other, a die turned over mirrors a total) and
 * conditions by throwing away the outcomes that did not happen.
 *
 * Every answer is an exact fraction in lowest terms, typed with the `/` key.
 * Shared helpers are in `contestMath.ts`.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import { sortByValue, tokenValue } from './probTree';
import { FRACTION_KEYS, fracAnswer, fracTex, gcd, num, numberBank, say, typed } from './contestMath';

/* ================================================================
 * Fractions
 * ================================================================ */

type Frac = [number, number];

function reduce([p, q]: Frac): Frac {
  const g = gcd(p, q) || 1;
  return [p / g, q / g];
}

const ftex = (f: Frac) => fracTex(f[0], f[1]);
const fans = (f: Frac) => fracAnswer(f[0], f[1]);
const plus = (a: Frac, b: Frac): Frac => reduce([a[0] * b[1] + b[0] * a[1], a[1] * b[1]]);
const times = (a: Frac, b: Frac): Frac => reduce([a[0] * b[0], a[1] * b[1]]);
const over = (a: Frac, b: Frac): Frac => reduce([a[0] * b[1], a[1] * b[0]]);
const sameValue = (a: Frac, b: Frac) => a[0] * b[1] === b[0] * a[1];

/** `\frac{12}{36} = \frac{1}{3}`, or just `\frac{5}{36}` when it is already in lowest terms. */
function rawThenLowest([p, q]: Frac): string {
  const raw = `\\frac{${p}}{${q}}`;
  return gcd(p, q) > 1 ? `${raw} = ${fracTex(p, q)}` : raw;
}

/** A probability answer typed on the fraction keypad. */
const typedProb = (prompt: Block[], answer: Frac) =>
  typed(prompt, fans(answer), 'P =', FRACTION_KEYS);

/**
 * Four options: the answer and the first three distinct slips strictly
 * between 0 and 1, topped up with neighbours. Compared in lowest terms, so a
 * slip that works out to the answer is never offered as a second right one.
 */
function probOptions(right: Frac, slips: Frac[]): ChoiceOption[] {
  const [p, q] = reduce(right);
  const seen = new Set([fans(right)]);
  const picked: Frac[] = [];
  const near: Frac[] = [
    [p + 1, q],
    [p - 1, q],
    [2 * p + 1, 2 * q],
    [2 * p - 1, 2 * q],
    [p + 2, q],
    [p - 2, q],
    [3 * p + 1, 3 * q],
  ];
  for (const f of [...slips, ...near]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[0] <= 0 || f[1] <= 0 || f[0] >= f[1]) continue;
    const key = fans(f);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(reduce(f));
  }
  return options({ tex: ftex(right), answer: fans(right) }, ...picked.map((f) => ({ tex: ftex(f), answer: fans(f) })));
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let out = 1;
  for (let i = 1; i <= k; i += 1) out = (out * (n - k + i)) / i;
  return Math.round(out);
}

const binom = (n: number, k: number) => `\\binom{${n}}{${k}}`;

/** "Two fair dice" for six sides, "two fair 8-sided dice" otherwise. */
const diceWords = (count: string, m: number) => (m === 6 ? `${count} fair dice` : `${count} fair ${m}-sided dice, each numbered 1 to ${m},`);

/** Ways two m-sided dice make a total of s. */
const waysTwo = (m: number, s: number) => Math.max(0, Math.min(s - 1, 2 * m + 1 - s));

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const article = (n: number) => (n === 8 || n === 11 || n === 18 ? 'an' : 'a');

/* ================================================================
 * Lesson 1: Probability by Outcomes
 * ================================================================ */

/* ---------- the total of two dice ---------- */

type TotalKind = 'is' | 'mult' | 'prime' | 'square' | 'atleast' | 'atmost';

interface DiceSumParams {
  m: number;
  kind: TotalKind;
  v: number;
}

function totalHolds({ kind, v }: DiceSumParams, s: number): boolean {
  switch (kind) {
    case 'is':
      return s === v;
    case 'mult':
      return s % v === 0;
    case 'prime':
      return [2, 3, 5, 7, 11, 13].includes(s);
    case 'square':
      return [4, 9, 16].includes(s);
    case 'atleast':
      return s >= v;
    case 'atmost':
      return s <= v;
  }
}

const totalWords = ({ kind, v }: DiceSumParams): string =>
  ({
    is: `the total is ${v}`,
    mult: `the total is a multiple of ${v}`,
    prime: 'the total is a prime number',
    square: 'the total is a square number',
    atleast: `the total is at least ${v}`,
    atmost: `the total is at most ${v}`,
  })[kind];

const totalsThatWork = (p: DiceSumParams) => Array.from({ length: 2 * p.m - 1 }, (_, i) => i + 2).filter((s) => totalHolds(p, s));

const diceSumFav = (p: DiceSumParams) => totalsThatWork(p).reduce((t, s) => t + waysTwo(p.m, s), 0);

/** Unordered pairs {a, b} with a total that works: the count that forgets order. */
function unorderedFav(p: DiceSumParams): number {
  let count = 0;
  for (let a = 1; a <= p.m; a += 1) for (let b = a; b <= p.m; b += 1) if (totalHolds(p, a + b)) count += 1;
  return count;
}

const cmPrDiceSum: Generator<DiceSumParams> = {
  id: 'cm-pr-dice-sum',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const m = rng.pick([4, 6, 8]);
      return { m, kind: 'is', v: rng.int(3, 2 * m - 1) };
    }
    for (;;) {
      const m = rng.pick([6, 8]);
      const kind = rng.pick(['mult', 'mult', 'prime', 'square', 'atleast', 'atmost'] as const);
      const v = kind === 'mult' ? rng.int(3, 7) : kind === 'atleast' ? rng.int(m + 2, 2 * m - 1) : kind === 'atmost' ? rng.int(3, m) : 0;
      const p = { m, kind, v };
      if (kind === 'square' && m === 6) continue;
      const fav = diceSumFav(p);
      if (fav === 0 || fav === m * m) continue;
      return p;
    }
  },
  render(p) {
    return typedProb(
      [say(`${diceWords('Two', p.m)} are rolled.`), say(`What is the probability that ${totalWords(p)}?`)],
      reduce([diceSumFav(p), p.m * p.m]),
    );
  },
  choices(p) {
    const fav = diceSumFav(p);
    const sums = totalsThatWork(p).length;
    return probOptions(reduce([fav, p.m * p.m]), [
      [sums, 2 * p.m - 1],
      [unorderedFav(p), (p.m * (p.m + 1)) / 2],
      [unorderedFav(p), p.m * p.m],
      [fav + 1, p.m * p.m],
    ]);
  },
  solution(p) {
    const sums = totalsThatWork(p);
    const ways = sums.map((s) => waysTwo(p.m, s));
    const fav = diceSumFav(p);
    const steps: SolutionStep[] = [
      { text: `Tell the dice apart, first and second. Then there are $${p.m} \\times ${p.m} = ${p.m * p.m}$ equally likely outcomes. The totals are not equally likely, so count outcomes, not totals.` },
    ];
    if (sums.length === 1) {
      const s = sums[0];
      const low = Math.max(1, s - p.m);
      steps.push(
        { text: `A total of ${s} runs from $(${low}, ${s - low})$ to $(${s - low}, ${low})$:` },
        { tex: `${s - low} - ${low} + 1 = ${fav}` },
      );
    } else {
      steps.push(
        { text: `The totals that work are ${sums.slice(0, -1).join(', ')} and ${sums[sums.length - 1]}, which come up in` },
        { tex: sums.length > 6 ? `${ways.slice(0, 3).join(' + ')} + \\cdots + ${ways[ways.length - 1]} = ${fav}` : `${ways.join(' + ')} = ${fav}` },
        { text: 'ways.' },
      );
    }
    steps.push({ tex: `P = ${rawThenLowest([fav, p.m * p.m])}` });
    return steps;
  },
};

/* ---------- the dice table: ways to make each total ---------- */

interface DiceTableParams {
  m: number;
  sums: [number, number, number];
}

const cmPrDiceTable: Generator<DiceTableParams> = {
  id: 'cm-pr-dice-table',
  sample(rng, difficulty) {
    const m = difficulty >= 2 ? 8 : 6;
    for (;;) {
      const picked = rng.sample(
        Array.from({ length: 2 * m - 1 }, (_, i) => i + 2),
        3,
      ).sort((a, b) => a - b) as [number, number, number];
      const ways = picked.map((s) => waysTwo(m, s));
      if (new Set(ways).size < 3) continue;
      return { m, sums: picked };
    }
  },
  render({ m, sums }): Slide {
    const ways = sums.map((s) => waysTwo(m, s));
    return {
      kind: 'table',
      prompt: [
        say(`${diceWords('Two', m)} are rolled, one red and one blue.`),
        say('Fill in how many of the equally likely outcomes give each total, and how many outcomes there are in all.'),
      ],
      columns: ['\\text{total}', '\\text{outcomes}'],
      rows: [...sums.map((s) => [`${s}`, null]), ['\\text{all}', null]],
      bank: numberBank([...ways, m * m], [...sums.map((s) => s - 1), 2 * m - 1, 2 * m, ...ways.map((w) => Math.ceil(w / 2))], 3, 1, 1),
      answer: [...ways, m * m].map(num),
    };
  },
  solution({ m, sums }) {
    const steps: SolutionStep[] = [{ text: 'For each total, list the red number from its smallest to its largest:' }];
    for (const s of sums) {
      const low = Math.max(1, s - m);
      steps.push({ tex: `${s}: \\; (${low}, ${s - low}) \\text{ to } (${s - low}, ${low}) \\to ${waysTwo(m, s)}` });
    }
    steps.push({ text: 'Every red number goes with every blue one:' }, { tex: `${m} \\times ${m} = ${m * m}` });
    return steps;
  },
};

/* ---------- the numbers shown, in some order ---------- */

interface OrderParams {
  m: number;
  /** The faces asked for, smallest first: two dice or three. */
  faces: number[];
}

/** Orders of the faces on distinguishable dice. */
function arrangements(faces: number[]): number {
  const counts = new Map<number, number>();
  for (const f of faces) counts.set(f, (counts.get(f) ?? 0) + 1);
  let out = faces.length === 3 ? 6 : 2;
  for (const c of counts.values()) out /= c === 3 ? 6 : c === 2 ? 2 : 1;
  return out;
}

function orderList(faces: number[]): string[] {
  const seen = new Set<string>();
  const perms = faces.length === 2 ? [[0, 1], [1, 0]] : [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const perm of perms) seen.add(`(${perm.map((i) => faces[i]).join(', ')})`);
  return [...seen];
}

const cmPrOrder: Generator<OrderParams> = {
  id: 'cm-pr-order',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const m = rng.pick([6, 8]);
      const [a, b] = rng.sample(Array.from({ length: m }, (_, i) => i + 1), 2).sort((x, y) => x - y);
      return { m, faces: [a, b] };
    }
    const m = rng.pick([4, 6, 6]);
    const pool = Array.from({ length: m }, (_, i) => i + 1);
    if (rng.chance(0.5)) return { m, faces: rng.sample(pool, 3).sort((x, y) => x - y) };
    const [a, b] = rng.sample(pool, 2);
    return { m, faces: [a, a, b].sort((x, y) => x - y) };
  },
  render({ m, faces }) {
    const count = faces.length === 2 ? 'Two' : 'Three';
    const shown = faces.length === 2 ? `one shows a ${faces[0]} and the other a ${faces[1]}` : `they show ${faces[0]}, ${faces[1]} and ${faces[2]} in some order`;
    return typedProb(
      [say(`${diceWords(count, m)} are rolled.`), say(`What is the probability that ${shown}?`)],
      reduce([arrangements(faces), m ** faces.length]),
    );
  },
  choices({ m, faces }) {
    const k = faces.length;
    const all = m ** k;
    const right = arrangements(faces);
    return probOptions(reduce([right, all]), [
      [1, all],
      [k === 3 ? 6 : 1, k === 3 ? all : m],
      [k, m],
      [1, (m * (m + 1) * (k === 3 ? m + 2 : 1)) / (k === 3 ? 6 : 2)],
    ]);
  },
  solution({ m, faces }) {
    const k = faces.length;
    const list = orderList(faces);
    const steps: SolutionStep[] = [
      { text: `Tell the dice apart. There are $${m}^${k} = ${m ** k}$ equally likely outcomes, and the numbers can land on the dice in any order:` },
    ];
    if (list.length <= 3) steps.push({ tex: list.join(', \\; ') });
    else steps.push({ text: 'Any of the three numbers on the first die, either of the other two on the second, the last on the third:' }, { tex: '3 \\times 2 \\times 1 = 6' });
    steps.push({ tex: `P = ${rawThenLowest([list.length, m ** k])}` });
    return steps;
  },
};

/* ---------- heads in a row of coins ---------- */

interface CoinsParams {
  n: number;
  k: number;
  kind: 'exactly' | 'atleast' | 'atmost';
  tails: boolean;
}

const coinCounts = ({ n, k, kind }: CoinsParams) =>
  Array.from({ length: n + 1 }, (_, j) => j).filter((j) => (kind === 'exactly' ? j === k : kind === 'atleast' ? j >= k : j <= k));

const coinFav = (p: CoinsParams) => coinCounts(p).reduce((t, j) => t + choose(p.n, j), 0);

const cmPrCoins: Generator<CoinsParams> = {
  id: 'cm-pr-coins',
  sample(rng, difficulty) {
    const tails = rng.chance(0.5);
    if (difficulty < 2) {
      const n = rng.int(3, 6);
      return { n, k: rng.int(1, n - 1), kind: 'exactly', tails };
    }
    const n = rng.int(4, 6);
    const kind = rng.pick(['atleast', 'atmost'] as const);
    return { n, k: kind === 'atleast' ? rng.int(2, n - 1) : rng.int(1, n - 2), kind, tails };
  },
  render(p) {
    const face = p.k === 1 ? (p.tails ? 'tail' : 'head') : p.tails ? 'tails' : 'heads';
    const what = p.kind === 'exactly' ? `exactly ${p.k}` : p.kind === 'atleast' ? `at least ${p.k}` : `at most ${p.k}`;
    return typedProb([say(`${p.n} fair coins are tossed.`), say(`What is the probability of ${what} ${face}?`)], reduce([coinFav(p), 2 ** p.n]));
  },
  choices(p) {
    const counts = coinCounts(p).length;
    const all = 2 ** p.n;
    return probOptions(reduce([coinFav(p), all]), [
      [counts, p.n + 1],
      [p.kind === 'exactly' ? 1 : coinFav(p) - choose(p.n, p.k), p.kind === 'exactly' ? all : all],
      [p.k, p.n],
      [coinFav(p), 2 * p.n],
    ]);
  },
  solution(p) {
    const face = p.tails ? 'tails' : 'heads';
    const row = Array.from({ length: p.n + 1 }, (_, j) => choose(p.n, j));
    const js = coinCounts(p);
    const fav = coinFav(p);
    const steps: SolutionStep[] = [
      { text: `The $2^{${p.n}} = ${2 ** p.n}$ sequences of heads and tails are equally likely; the numbers of ${face} are not. Row ${p.n} of Pascal's triangle counts the sequences with $0, 1, \\ldots, ${p.n}$ ${face}:` },
      { tex: row.join(', \\; ') },
    ];
    if (js.length > 1) steps.push({ text: `Add the entries for ${js[0]} ${js.length === 2 ? 'and' : 'to'} ${js[js.length - 1]} ${face}:` }, { tex: `${js.map((j) => row[j]).join(' + ')} = ${fav}` });
    steps.push({ tex: `P = ${rawThenLowest([fav, 2 ** p.n])}` });
    return steps;
  },
};

/* ================================================================
 * Lesson 2: PIE and Complements
 * ================================================================ */

/* ---------- a card from a pack: one event or the other ---------- */

const SUITS = ['heart', 'diamond', 'club', 'spade'];
const RANKS = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
const RANK_PLURALS = ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings'];

interface CardParams {
  /** 0-3 a suit, 4 red, 5 black. */
  suit: number;
  /** 0-12 a rank, 13 a face card. */
  rank: number;
  neither: boolean;
}

const suitSize = (s: number) => (s < 4 ? 13 : 26);
const rankSize = (r: number) => (r < 13 ? 4 : 12);
const cardBoth = ({ suit, rank }: CardParams) => (suit < 4 ? 1 : 2) * (rank < 13 ? 1 : 3);

function suitWords(s: number): string {
  if (s < 4) return `a ${SUITS[s]}`;
  return s === 4 ? 'red' : 'black';
}

function rankWords(r: number): string {
  if (r === 13) return 'a face card';
  const name = RANKS[r];
  return name === 'ace' || name === '8' ? `an ${name}` : `a ${name}`;
}

const cardOr = (p: CardParams) => suitSize(p.suit) + rankSize(p.rank) - cardBoth(p);

const cmPrCards: Generator<CardParams> = {
  id: 'cm-pr-cards',
  sample(rng, difficulty) {
    const suit = rng.int(0, 5);
    const rank = difficulty >= 2 ? rng.pick([...Array.from({ length: 13 }, (_, i) => i), 13, 13, 13]) : rng.int(0, 12);
    return { suit, rank, neither: difficulty >= 2 && rng.chance(0.6) };
  },
  render(p) {
    const event = p.neither
      ? `it is neither ${suitWords(p.suit)} nor ${rankWords(p.rank)}`
      : `it is ${suitWords(p.suit)} or ${rankWords(p.rank)} (or both)`;
    const count = p.neither ? 52 - cardOr(p) : cardOr(p);
    return typedProb(
      [say('One card is drawn at random from a standard pack of 52: four suits of 13, each running ace, 2 to 10, jack, queen, king.'), say(`What is the probability that ${event}?`)],
      reduce([count, 52]),
    );
  },
  choices(p) {
    const A = suitSize(p.suit);
    const B = rankSize(p.rank);
    const both = cardBoth(p);
    if (p.neither) return probOptions(reduce([52 - cardOr(p), 52]), [[52 - A - B, 52], [cardOr(p), 52], [52 - A - B - both, 52], [52 - A, 52]]);
    return probOptions(reduce([cardOr(p), 52]), [[A + B, 52], [A + B + both, 52], [both, 52], [52 - cardOr(p), 52]]);
  },
  solution(p) {
    const A = suitSize(p.suit);
    const B = rankSize(p.rank);
    const both = cardBoth(p);
    const suitName = p.suit < 4 ? `${SUITS[p.suit]}s` : p.suit === 4 ? 'red cards' : 'black cards';
    const rankName = p.rank === 13 ? 'face cards' : RANK_PLURALS[p.rank];
    const steps: SolutionStep[] = [
      { text: `There are ${A} ${suitName} and ${B} ${rankName}, but ${both} ${plural(both, 'card is', 'cards are')} both, and adding counts ${plural(both, 'it', 'them')} twice. Take the overlap off once:` },
      { tex: `${A} + ${B} - ${both} = ${cardOr(p)}` },
    ];
    if (p.neither) steps.push({ text: 'Neither is everything else:' }, { tex: `52 - ${cardOr(p)} = ${52 - cardOr(p)}` });
    const count = p.neither ? 52 - cardOr(p) : cardOr(p);
    steps.push({ tex: `P = ${rawThenLowest([count, 52])}` });
    return steps;
  },
};

/* ---------- multiples of a or b up to N ---------- */

interface PieCountParams {
  N: number;
  a: number;
  b: number;
  neither: boolean;
}

const lcmOf = (a: number, b: number) => (a / gcd(a, b)) * b;

function pieCounts({ N, a, b }: PieCountParams) {
  const fa = Math.floor(N / a);
  const fb = Math.floor(N / b);
  const l = lcmOf(a, b);
  const fl = Math.floor(N / l);
  return { fa, fb, l, fl, either: fa + fb - fl };
}

const cmPrPieCount: Generator<PieCountParams> = {
  id: 'cm-pr-pie-count',
  sample(rng, difficulty) {
    for (;;) {
      const hard = difficulty >= 2;
      const a = rng.int(2, hard ? 6 : 5);
      const b = rng.int(a + 1, hard ? 10 : 7);
      if (!hard && gcd(a, b) !== 1) continue;
      if (hard && b % a === 0) continue;
      const N = rng.int(hard ? 30 : 20, hard ? 100 : 60);
      const p = { N, a, b, neither: hard };
      const c = pieCounts(p);
      if (c.fl === 0) continue;
      // On the harder draws the overlap must not be a multiple of ab, or the lcm trap is not a trap.
      if (hard && gcd(a, b) === 1 && rng.chance(0.7)) continue;
      return p;
    }
  },
  render(p) {
    const c = pieCounts(p);
    const event = p.neither ? `it is a multiple of neither ${p.a} nor ${p.b}` : `it is a multiple of ${p.a} or of ${p.b} (or both)`;
    return typedProb(
      [say(`A whole number from 1 to ${p.N} is picked at random.`), say(`What is the probability that ${event}?`)],
      reduce([p.neither ? p.N - c.either : c.either, p.N]),
    );
  },
  choices(p) {
    const c = pieCounts(p);
    const noOverlap = c.fa + c.fb;
    const productOverlap = c.fa + c.fb - Math.floor(p.N / (p.a * p.b));
    const flip = (x: number): Frac => (p.neither ? [p.N - x, p.N] : [x, p.N]);
    return probOptions(reduce(flip(c.either)), [flip(noOverlap), flip(productOverlap), p.neither ? [c.either, p.N] : [p.N - c.either, p.N], flip(c.either + c.fl)]);
  },
  solution(p) {
    const c = pieCounts(p);
    const steps: SolutionStep[] = [
      { text: `Count the multiples of each, then take off those counted twice: the multiples of both, which are the multiples of the LCM, ${c.l}.` },
      { tex: `${p.N} \\div ${p.a} \\to ${c.fa}, \\quad ${p.N} \\div ${p.b} \\to ${c.fb}` },
      { tex: `${p.N} \\div ${c.l} \\to ${c.fl}` },
      { tex: `${c.fa} + ${c.fb} - ${c.fl} = ${c.either}` },
    ];
    if (p.neither) steps.push({ text: 'Neither is the rest:' }, { tex: `${p.N} - ${c.either} = ${p.N - c.either}` });
    steps.push({ tex: `P = ${rawThenLowest([p.neither ? p.N - c.either : c.either, p.N])}` });
    return steps;
  },
};

/* ---------- a Venn diagram of probabilities ---------- */

const VENN_STORIES = [
  { who: 'A student at a school', A: 'F', B: 'S', a: 'the student studies French', b: 'they study Spanish', neither: 'they study neither', one: 'they study exactly one of the two' },
  { who: 'A member of a sports club', A: 'T', B: 'G', a: 'the member plays tennis', b: 'they play golf', neither: 'they play neither', one: 'they play exactly one of the two' },
  { who: 'A family on a street', A: 'C', B: 'D', a: 'the family has a cat', b: 'it has a dog', neither: 'it has neither', one: 'it has exactly one of the two' },
  { who: 'A guest at a party', A: 'T', B: 'C', a: 'the guest drinks tea', b: 'they drink coffee', neither: 'they drink neither', one: 'they drink exactly one of the two' },
];

interface VennParams {
  story: number;
  /** Hundredths: only A, both, only B, neither. */
  regions: [number, number, number, number];
  /** Difficulty 2 gives P(exactly one) in place of P(neither). */
  one: boolean;
}

const dec = (hundredths: number) => num(hundredths / 100);

/** A bank of decimals: the answers, then distinct slips strictly between 0 and 1. */
function decimalBank(answer: number[], slips: number[], step: number): string[] {
  const out = answer.map(dec);
  const taken = new Set(out);
  const pool = [...slips, ...answer.flatMap((v) => [v + step, v - step, v + 2 * step, v - 2 * step])];
  let spare = 0;
  for (const v of pool) {
    if (spare === 3) break;
    if (v <= 0 || v >= 100 || taken.has(dec(v))) continue;
    taken.add(dec(v));
    out.push(dec(v));
    spare += 1;
  }
  return sortByValue(out);
}

const cmPrVenn: Generator<VennParams> = {
  id: 'cm-pr-venn',
  sample(rng, difficulty) {
    const unit = difficulty >= 2 ? 5 : 10;
    for (;;) {
      const parts = [rng.int(1, 6), rng.int(1, 4), rng.int(1, 6)].map((x) => x * unit);
      const neither = 100 - parts[0] - parts[1] - parts[2];
      if (neither <= 0) continue;
      const regions = [parts[0], parts[1], parts[2], neither] as VennParams['regions'];
      if (new Set(regions).size < 4) continue;
      return { story: rng.int(0, VENN_STORIES.length - 1), regions, one: difficulty >= 2 };
    }
  },
  render({ story, regions, one }): Slide {
    const s = VENN_STORIES[story];
    const [x, y, z, w] = regions;
    const third = one ? `$${dec(x + z)}$ that ${s.one}` : `$${dec(w)}$ that ${s.neither}`;
    return {
      kind: 'venn',
      prompt: [
        say(`${s.who} is picked at random. The probability is $${dec(x + y)}$ that ${s.a} ($${s.A}$), $${dec(y + z)}$ that ${s.b} ($${s.B}$), and ${third}.`),
        say('Fill in the probability of each region.'),
      ],
      sets: [s.A, s.B],
      regions: [null, null, null, null],
      bank: decimalBank(regions, [x + y, y + z, x + y + z, x + z, 2 * y], one ? 5 : 10),
      answer: regions.map(dec),
    };
  },
  solution({ story, regions, one }) {
    const s = VENN_STORIES[story];
    const [x, y, z, w] = regions;
    const pa = dec(x + y);
    const pb = dec(y + z);
    const steps: SolutionStep[] = [];
    if (one) {
      steps.push(
        { text: `Adding $P(${s.A})$ and $P(${s.B})$ counts the exactly-one part once and the overlap twice, so the overlap is half of what is left over:` },
        { tex: `${pa} + ${pb} - ${dec(x + z)} = ${dec(2 * y)}` },
        { tex: `P(${s.A} \\cap ${s.B}) = ${dec(2 * y)} \\div 2 = ${dec(y)}` },
      );
    } else {
      steps.push(
        { text: 'Everything outside "neither" is in at least one circle:' },
        { tex: `P(${s.A} \\cup ${s.B}) = 1 - ${dec(w)} = ${dec(x + y + z)}` },
        { text: 'Adding the two circles counts the overlap twice, so the excess is the overlap:' },
        { tex: `P(${s.A} \\cap ${s.B}) = ${pa} + ${pb} - ${dec(x + y + z)} = ${dec(y)}` },
      );
    }
    steps.push(
      { text: 'Then take the overlap off each circle:' },
      { tex: `${pa} - ${dec(y)} = ${dec(x)}, \\quad ${pb} - ${dec(y)} = ${dec(z)}` },
    );
    if (one) steps.push({ text: 'What is left of 1 is neither:' }, { tex: `1 - ${dec(x + y + z)} = ${dec(w)}` });
    return steps;
  },
};

/* ---------- at least once: one minus never ---------- */

interface AtLeastParams {
  m: number;
  n: number;
  /** A single face, an even number, or a number above g. */
  event: 'face' | 'even' | 'above';
  v: number;
}

const hits = ({ m, event, v }: AtLeastParams) => (event === 'face' ? 1 : event === 'even' ? m / 2 : m - v);

const missFrac = (p: AtLeastParams) => reduce([p.m - hits(p), p.m]);

function atLeastAnswer(p: AtLeastParams): Frac {
  const [a, b] = missFrac(p);
  return reduce([b ** p.n - a ** p.n, b ** p.n]);
}

const cmPrAtLeastOne: Generator<AtLeastParams> = {
  id: 'cm-pr-at-least-one',
  sample(rng, difficulty) {
    const n = difficulty >= 2 ? 3 : 2;
    const m = rng.pick([4, 6, 8, 10]);
    const event = rng.pick(['face', 'face', 'even', 'above'] as const);
    const v = event === 'face' ? rng.int(1, m) : event === 'above' ? rng.int(2, m - 2) : 0;
    return { m, n, event, v };
  },
  render(p) {
    const die = p.m === 6 ? 'A fair die' : `A fair ${p.m}-sided die, numbered 1 to ${p.m},`;
    const what = p.event === 'face' ? `${article(p.v)} ${p.v}` : p.event === 'even' ? 'an even number' : `a number above ${p.v}`;
    const times = p.n === 2 ? 'twice' : 'three times';
    return typedProb([say(`${die} is rolled ${times}.`), say(`What is the probability of rolling ${what} at least once?`)], atLeastAnswer(p));
  },
  choices(p) {
    const w = hits(p);
    const [a, b] = missFrac(p);
    const [c, d] = reduce([w, p.m]);
    return probOptions(atLeastAnswer(p), [
      [p.n * w, p.m],
      [a ** p.n, b ** p.n],
      [c ** p.n, d ** p.n],
      [d ** p.n - c ** p.n, d ** p.n],
    ]);
  },
  solution(p) {
    const [a, b] = missFrac(p);
    const none: Frac = [a ** p.n, b ** p.n];
    const ans = atLeastAnswer(p);
    const w = hits(p);
    return [
      { text: `"At least once" has many cases; its complement, "never", has one. Each roll misses with probability` },
      { tex: `\\frac{${p.m - w}}{${p.m}}${gcd(p.m - w, p.m) > 1 ? ` = ${ftex([a, b])}` : ''}` },
      { text: 'and the rolls are independent, so' },
      { tex: `P(\\text{never}) = \\left(${ftex([a, b])}\\right)^{${p.n}} = ${ftex(none)}` },
      { tex: `P = 1 - ${ftex(none)} = ${ftex(ans)}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Choosing
 * ================================================================ */

/* ---------- a team with exactly j of one kind ---------- */

const GROUPS = [
  { setup: (k: number, g: number, b: number) => `A team of ${k} is chosen at random from ${g} girls and ${b} boys.`, A: ['girl', 'girls'], B: ['boy', 'boys'] },
  { setup: (k: number, g: number, b: number) => `${k} sweets are taken at random from a bag of ${g} lemon and ${b} orange sweets.`, A: ['lemon sweet', 'lemon sweets'], B: ['orange sweet', 'orange sweets'] },
  { setup: (k: number, g: number, b: number) => `${k} cards are drawn at random from a pile of ${g} red and ${b} black cards.`, A: ['red card', 'red cards'], B: ['black card', 'black cards'] },
];

interface CommitteeParams {
  group: number;
  g: number;
  b: number;
  k: number;
  j: number;
}

const committeeFav = ({ g, b, k, j }: CommitteeParams) => choose(g, j) * choose(b, k - j);
const committeeAll = ({ g, b, k }: CommitteeParams) => choose(g + b, k);

function sampleCommittee(rng: Parameters<Generator<CommitteeParams>['sample']>[0], difficulty: number, inner: boolean): CommitteeParams {
  const k = difficulty >= 2 ? 3 : 2;
  for (;;) {
    const g = rng.int(k, difficulty >= 2 ? 7 : 7);
    const b = rng.int(k, 7);
    if (g === b) continue;
    const j = inner ? rng.int(1, k - 1) : rng.int(0, k);
    return { group: rng.int(0, GROUPS.length - 1), g, b, k, j };
  }
}

const countWords = (p: CommitteeParams) => {
  const G = GROUPS[p.group];
  return p.j === 0 ? `no ${G.A[1]}` : `exactly ${p.j} ${plural(p.j, G.A[0], G.A[1])}`;
};

const cmPrCommittee: Generator<CommitteeParams> = {
  id: 'cm-pr-committee',
  sample(rng, difficulty) {
    return sampleCommittee(rng, difficulty, false);
  },
  render(p) {
    return typedProb(
      [say(GROUPS[p.group].setup(p.k, p.g, p.b)), say(`What is the probability of getting ${countWords(p)}?`)],
      reduce([committeeFav(p), committeeAll(p)]),
    );
  },
  choices(p) {
    const n = p.g + p.b;
    const ways = choose(p.k, p.j);
    const fav = committeeFav(p);
    const all = committeeAll(p);
    return probOptions(reduce([fav, all]), [
      [ways * p.g ** p.j * p.b ** (p.k - p.j), n ** p.k],
      [p.g ** p.j * p.b ** (p.k - p.j), n ** p.k],
      [fav, all * ways],
      [choose(p.g, p.j) + choose(p.b, p.k - p.j), all],
    ]);
  },
  solution(p) {
    const G = GROUPS[p.group];
    const n = p.g + p.b;
    const fav = committeeFav(p);
    const all = committeeAll(p);
    const steps: SolutionStep[] = [
      { text: `Every set of ${p.k} is equally likely, and there are` },
      { tex: `${binom(n, p.k)} = ${all}` },
      { text: `For ${countWords(p)}, choose the ${G.A[1]} and the ${G.B[1]} separately and multiply:` },
      { tex: `${binom(p.g, p.j)} \\times ${binom(p.b, p.k - p.j)} = ${choose(p.g, p.j)} \\times ${choose(p.b, p.k - p.j)} = ${fav}` },
      { tex: `P = ${rawThenLowest([fav, all])}` },
    ];
    return steps;
  },
};

/* ---------- the same count, as a table ---------- */

const cmPrCommitteeTable: Generator<CommitteeParams> = {
  id: 'cm-pr-committee-table',
  sample(rng, difficulty) {
    for (;;) {
      const p = sampleCommittee(rng, difficulty, true);
      const values = [choose(p.g, p.j), choose(p.b, p.k - p.j), committeeFav(p), committeeAll(p)];
      if (new Set(values).size === 4) return p;
    }
  },
  render(p): Slide {
    const G = GROUPS[p.group];
    const n = p.g + p.b;
    const cA = choose(p.g, p.j);
    const cB = choose(p.b, p.k - p.j);
    const fav = committeeFav(p);
    const all = committeeAll(p);
    return {
      kind: 'table',
      prompt: [say(G.setup(p.k, p.g, p.b)), say(`Count the ways of getting ${countWords(p)}, and all the ways of choosing ${p.k}.`)],
      columns: ['\\text{choose}', '\\text{ways}'],
      rows: [
        [`${p.j} \\text{ of the } ${p.g} \\text{ ${G.A[1]}}`, null],
        [`${p.k - p.j} \\text{ of the } ${p.b} \\text{ ${G.B[1]}}`, null],
        [`\\text{both together}`, null],
        [`${p.k} \\text{ of all } ${n}`, null],
      ],
      bank: numberBank([cA, cB, fav, all], [cA + cB, p.g * (p.g - 1), n * (n - 1), all - fav, p.g * p.b].filter((v) => v > 0), 3, 1, 1),
      answer: [cA, cB, fav, all].map(num),
    };
  },
  solution(p) {
    const n = p.g + p.b;
    return [
      { tex: `${binom(p.g, p.j)} = ${choose(p.g, p.j)}, \\quad ${binom(p.b, p.k - p.j)} = ${choose(p.b, p.k - p.j)}` },
      { text: 'Each choice from one group goes with each choice from the other, so multiply:' },
      { tex: `${choose(p.g, p.j)} \\times ${choose(p.b, p.k - p.j)} = ${committeeFav(p)}` },
      { tex: `${binom(n, p.k)} = ${committeeAll(p)}` },
    ];
  },
};

/* ---------- two particular people chosen ---------- */

const PAIRS = [
  ['Ana', 'Ben'],
  ['Dev', 'Eve'],
  ['Gus', 'Hana'],
  ['Jo', 'Kit'],
];

interface BothParams {
  pair: number;
  n: number;
  k: number;
  kind: 'both' | 'one' | 'neither';
}

function bothCount({ n, k, kind }: BothParams): number {
  if (kind === 'both') return choose(n - 2, k - 2);
  if (kind === 'one') return 2 * choose(n - 2, k - 1);
  return choose(n - 2, k);
}

const cmPrBothChosen: Generator<BothParams> = {
  id: 'cm-pr-both-chosen',
  sample(rng, difficulty) {
    const n = rng.int(5, 12);
    const k = rng.int(2, n - 2);
    return { pair: rng.int(0, PAIRS.length - 1), n, k, kind: difficulty >= 2 ? rng.pick(['one', 'neither'] as const) : 'both' };
  },
  render(p) {
    const [A, B] = PAIRS[p.pair];
    const event = p.kind === 'both' ? `both ${A} and ${B} are chosen` : p.kind === 'one' ? `exactly one of ${A} and ${B} is chosen` : `neither ${A} nor ${B} is chosen`;
    return typedProb(
      [say(`A club has ${p.n} members, ${A} and ${B} among them. ${p.k} of them are chosen at random to go on a trip.`), say(`What is the probability that ${event}?`)],
      reduce([bothCount(p), choose(p.n, p.k)]),
    );
  },
  choices(p) {
    const { n, k } = p;
    const right = reduce([bothCount(p), choose(n, k)]);
    if (p.kind === 'both') return probOptions(right, [[k * k, n * n], [k, n], [1, choose(n, 2)], [k - 1, n]]);
    if (p.kind === 'one') return probOptions(right, [[2 * k, n], [bothCount(p) / 2, choose(n, k)], [2 * k * (n - k), n * n], [k, n]]);
    return probOptions(right, [[(n - k) ** 2, n * n], [n - k, n], [choose(n, k) - choose(n - 2, k - 2), choose(n, k)], [n - k - 1, n]]);
  },
  solution(p) {
    const [A, B] = PAIRS[p.pair];
    const { n, k } = p;
    const all = choose(n, k);
    const fav = bothCount(p);
    const steps: SolutionStep[] = [{ text: `Every group of ${k} is equally likely:` }, { tex: `${binom(n, k)} = ${all}` }];
    if (p.kind === 'both') {
      steps.push({ text: `With ${A} and ${B} both in, the other ${k - 2} places come from the other ${n - 2} members:` }, { tex: `${binom(n - 2, k - 2)} = ${fav}` });
    } else if (p.kind === 'one') {
      steps.push(
        { text: `Pick which of the two goes (2 ways), then the other ${k - 1} places from the ${n - 2} members who are neither:` },
        { tex: `2 \\times ${binom(n - 2, k - 1)} = 2 \\times ${choose(n - 2, k - 1)} = ${fav}` },
      );
    } else {
      steps.push({ text: `All ${k} places come from the other ${n - 2} members:` }, { tex: `${binom(n - 2, k)} = ${fav}` });
    }
    steps.push({ tex: `P = ${rawThenLowest([fav, all])}` });
    return steps;
  },
};

/* ---------- two from a bag, as a tree ---------- */

const BAGS = [
  { thing: 'counters', A: 'red', B: 'blue', a: 'R', b: 'B' },
  { thing: 'marbles', A: 'green', B: 'yellow', a: 'G', b: 'Y' },
  { thing: 'beads', A: 'white', B: 'black', a: 'W', b: 'K' },
];

interface BagTreeParams {
  bag: number;
  r: number;
  b: number;
  hard: boolean;
}

const cmPrBagTree: Generator<BagTreeParams> = {
  id: 'cm-pr-bag-tree',
  sample(rng, difficulty) {
    for (;;) {
      const r = rng.int(2, 9);
      const b = rng.int(2, 9);
      if (Math.abs(r - b) < 2 || r + b > 12) continue;
      return { bag: rng.int(0, BAGS.length - 1), r, b, hard: difficulty >= 2 };
    }
  },
  render({ bag, r, b, hard }): Slide {
    const s = BAGS[bag];
    const n = r + b;
    const f = (top: number, bottom: number) => `\\frac{${top}}{${bottom}}`;
    const first = [f(r, n), f(b, n)];
    const second = [f(r - 1, n - 1), f(b, n - 1), f(r, n - 1), f(b - 1, n - 1)];
    const answer = hard ? [...first, ...second] : second;
    const candidates = [f(r, n), f(b, n), f(r - 1, n), f(b - 1, n), f(r + 1, n - 1), f(b + 1, n - 1), f(r - 2, n - 1), f(b - 2, n - 1)];
    const values = answer.map((t) => tokenValue(t)!);
    const spares: string[] = [];
    for (const t of candidates) {
      if (spares.length === 3) break;
      const v = tokenValue(t)!;
      if (v <= 0 || v >= 1 || [...values, ...spares.map((x) => tokenValue(x)!)].some((u) => Math.abs(u - v) < 1e-9)) continue;
      spares.push(t);
    }
    return {
      kind: 'probTree',
      mode: 'fill',
      prompt: [
        say(`A bag holds ${r} ${s.A} and ${b} ${s.B} ${s.thing}. Two are taken out, one after the other, without putting the first back.`),
        say(`Fill in the ${hard ? '' : 'missing '}probabilities, writing each as what is in the bag at that moment.`),
      ],
      branches: [
        { label: s.a, p: hard ? null : first[0], next: [{ label: s.a, p: null }, { label: s.b, p: null }] },
        { label: s.b, p: hard ? null : first[1], next: [{ label: s.a, p: null }, { label: s.b, p: null }] },
      ],
      bank: sortByValue([...answer, ...spares]),
      answer,
    };
  },
  solution({ bag, r, b, hard }) {
    const s = BAGS[bag];
    const n = r + b;
    const steps: SolutionStep[] = [];
    if (hard) steps.push({ text: `First draw, from all ${n}:` }, { tex: `P(${s.a}) = \\frac{${r}}{${n}}, \\quad P(${s.b}) = \\frac{${b}}{${n}}` });
    steps.push(
      { text: `After a ${s.A} one, ${n - 1} are left, ${r - 1} of them ${s.A}:` },
      { tex: `\\frac{${r - 1}}{${n - 1}}, \\quad \\frac{${b}}{${n - 1}}` },
      { text: `After a ${s.B} one, ${n - 1} are left, ${b - 1} of them ${s.B}:` },
      { tex: `\\frac{${r}}{${n - 1}}, \\quad \\frac{${b - 1}}{${n - 1}}` },
    );
    return steps;
  },
};

/* ---------- two socks the same colour ---------- */

const DRAWERS = [
  { thing: 'socks', where: 'A drawer holds', colours: ['black', 'white', 'grey'] },
  { thing: 'pens', where: 'A pencil case holds', colours: ['blue', 'red', 'green'] },
  { thing: 'balls', where: 'A box holds', colours: ['red', 'yellow', 'green'] },
];

interface SameColourParams {
  drawer: number;
  counts: number[];
  different: boolean;
}

function sameColourFav({ counts, different }: SameColourParams): number {
  const n = counts.reduce((t, c) => t + c, 0);
  const same = counts.reduce((t, c) => t + choose(c, 2), 0);
  return different ? choose(n, 2) - same : same;
}

const cmPrSameColour: Generator<SameColourParams> = {
  id: 'cm-pr-same-colour',
  sample(rng, difficulty) {
    const drawer = rng.int(0, DRAWERS.length - 1);
    if (difficulty < 2) return { drawer, counts: [rng.int(2, 9), rng.int(2, 9)], different: rng.chance(0.3) };
    return { drawer, counts: [rng.int(2, 6), rng.int(2, 6), rng.int(2, 6)], different: rng.chance(0.3) };
  },
  render(p) {
    const d = DRAWERS[p.drawer];
    const list = p.counts.map((c, i) => `${c} ${d.colours[i]}`);
    const listText = list.length === 2 ? `${list[0]} and ${list[1]}` : `${list[0]}, ${list[1]} and ${list[2]}`;
    const n = p.counts.reduce((t, c) => t + c, 0);
    return typedProb(
      [say(`${d.where} ${listText} ${d.thing}. Two are taken out at random.`), say(`What is the probability that they are ${p.different ? 'different colours' : 'the same colour'}?`)],
      reduce([sameColourFav(p), choose(n, 2)]),
    );
  },
  choices(p) {
    const n = p.counts.reduce((t, c) => t + c, 0);
    const all = choose(n, 2);
    const fav = sameColourFav(p);
    const sq = p.counts.reduce((t, c) => t + c * c, 0);
    const withReplacement: Frac = p.different ? [n * n - sq, n * n] : [sq, n * n];
    return probOptions(reduce([fav, all]), [withReplacement, [choose(p.counts[0], 2), all], [all - fav, all]]);
  },
  solution(p) {
    const d = DRAWERS[p.drawer];
    const n = p.counts.reduce((t, c) => t + c, 0);
    const all = choose(n, 2);
    const same = p.counts.reduce((t, c) => t + choose(c, 2), 0);
    const steps: SolutionStep[] = [
      { text: `Every pair of the ${n} ${d.thing} is equally likely:` },
      { tex: `${binom(n, 2)} = ${all}` },
      { text: 'A matching pair comes from one colour:' },
      { tex: `${p.counts.map((c) => binom(c, 2)).join(' + ')} = ${p.counts.map((c) => choose(c, 2)).join(' + ')} = ${same}` },
    ];
    if (p.different) steps.push({ text: 'Every other pair is mixed:' }, { tex: `${all} - ${same} = ${all - same}` });
    steps.push({ tex: `P = ${rawThenLowest([sameColourFav(p), all])}` });
    return steps;
  },
};

/* ================================================================
 * Lesson 4: Symmetry and Conditional
 * ================================================================ */

/* ---------- places in a random line ---------- */

const TRIOS = [
  ['Ana', 'Ben', 'Cal'],
  ['Dev', 'Eve', 'Finn'],
  ['Gus', 'Hana', 'Ivo'],
  ['Jo', 'Kit', 'Lev'],
];

type LineKind = 'end' | 'firstk' | 'before' | 'next' | 'order3' | 'between';

interface LineParams {
  trio: number;
  race: boolean;
  n: number;
  k: number;
  kind: LineKind;
}

function lineAnswer({ n, k, kind }: LineParams): Frac {
  const table: Record<LineKind, Frac> = { end: [2, n], firstk: [k, n], before: [1, 2], next: [2, n], order3: [1, 6], between: [1, 3] };
  return reduce(table[kind]);
}

const cmPrLineUp: Generator<LineParams> = {
  id: 'cm-pr-line-up',
  sample(rng, difficulty) {
    const n = rng.int(4, 11);
    const kind = difficulty >= 2 ? rng.pick(['next', 'next', 'order3', 'between'] as const) : rng.pick(['end', 'firstk', 'firstk', 'before'] as const);
    return { trio: rng.int(0, TRIOS.length - 1), race: rng.chance(0.5), n, k: rng.int(2, n - 2), kind };
  },
  render(p) {
    const [A, B, C] = TRIOS[p.trio];
    const three = p.kind === 'order3' || p.kind === 'between';
    const named = three ? `${A}, ${B} and ${C}` : p.kind === 'end' || p.kind === 'firstk' ? A : `${A} and ${B}`;
    const setup = p.race
      ? `${p.n} runners, ${named} among them, finish a race in a random order, with no ties.`
      : `${p.n} friends, ${named} among them, stand in a line in a random order.`;
    const event: Record<LineKind, [string, string]> = {
      end: [`${A} is at one of the two ends of the line`, `${A} finishes first or last`],
      firstk: [`${A} is one of the first ${p.k} in the line`, `${A} finishes in the top ${p.k}`],
      before: [`${A} is somewhere in front of ${B}`, `${A} finishes ahead of ${B}`],
      next: [`${A} and ${B} are next to each other`, `${A} and ${B} finish one straight after the other, in either order`],
      order3: [`${A}, ${B} and ${C} are in that order from the front, not necessarily together`, `${A}, ${B} and ${C} finish in that order, not necessarily together`],
      between: [`${B} is somewhere between ${A} and ${C}`, `${B} finishes somewhere between ${A} and ${C}`],
    };
    return typedProb([say(setup), say(`What is the probability that ${event[p.kind][p.race ? 1 : 0]}?`)], lineAnswer(p));
  },
  choices(p) {
    const { n, k } = p;
    const slips: Record<LineKind, Frac[]> = {
      end: [[1, n], [1, n - 1], [2, n * (n - 1)], [2, n - 1]],
      firstk: [[1, n], [k, n - 1], [1, k], [k, 2 * n]],
      before: [[1, n], [1, n - 1], [1, 3], [n - 1, n]],
      next: [[1, n], [1, n - 1], [2, n * (n - 1)], [2, n - 1]],
      order3: [[1, 3], [1, n * (n - 1) * (n - 2)], [1, 2], [1, n]],
      between: [[1, 2], [1, 6], [2, 3], [1, n]],
    };
    return probOptions(lineAnswer(p), slips[p.kind]);
  },
  solution(p) {
    const [A, B, C] = TRIOS[p.trio];
    const { n, k } = p;
    const ans = lineAnswer(p);
    switch (p.kind) {
      case 'end':
      case 'firstk': {
        const places = p.kind === 'end' ? 2 : k;
        return [
          { text: `${A} is as likely to be in any one of the ${n} places as any other, so count places, not orders. ${places} of them work:` },
          { tex: `P = ${rawThenLowest([places, n])}` },
        ];
      }
      case 'before':
        return [
          { text: `Swap ${A} and ${B} in any order and you get an order where the other one is in front. The orders pair off, one of each kind, so` },
          { tex: 'P = \\frac{1}{2}' },
          { text: `The number of others, ${n - 2}, does not matter.` },
        ];
      case 'next':
        return [
          { text: `${A} and ${B} take two of the ${n} places, and every pair of places is equally likely:` },
          { tex: `${binom(n, 2)} = ${choose(n, 2)}` },
          { text: `${n - 1} of those pairs are side by side:` },
          { tex: `P = ${rawThenLowest([n - 1, choose(n, 2)])}` },
        ];
      case 'order3':
        return [
          { text: `Only the order of the three among themselves matters, and by symmetry all $3! = 6$ orders of ${A}, ${B} and ${C} are equally likely. One of them is the one asked for:` },
          { tex: `P = ${ftex(ans)}` },
        ];
      case 'between':
        return [
          { text: `Look only at ${A}, ${B} and ${C}. Each of the three is equally likely to be the middle one of them, whatever the other ${n - 3} do:` },
          { tex: `P = ${ftex(ans)}` },
        ];
    }
  },
};

/* ---------- one die beats another ---------- */

const PLAYERS = [
  ['Ana', 'Ben'],
  ['Mia', 'Leo'],
  ['Zoe', 'Sam'],
  ['Ivy', 'Raj'],
];

type BeatKind = 'more' | 'atleast' | 'sumMore' | 'sumAtLeast' | 'three' | 'threeLow';

interface BeatParams {
  pair: number;
  m: number;
  kind: BeatKind;
}

function beatAnswer({ m, kind }: BeatParams): Frac {
  if (kind === 'more' || kind === 'sumMore') return reduce([m - 1, 2 * m]);
  if (kind === 'atleast' || kind === 'sumAtLeast') return reduce([m + 1, 2 * m]);
  return [1, 2];
}

const cmPrBeats: Generator<BeatParams> = {
  id: 'cm-pr-beats',
  sample(rng, difficulty) {
    const m = rng.pick([4, 6, 8, 10, 12, 16, 20]);
    const kind = difficulty >= 2 ? rng.pick(['sumMore', 'sumAtLeast', 'three', 'threeLow'] as const) : rng.pick(['more', 'atleast'] as const);
    return { pair: rng.int(0, PLAYERS.length - 1), m, kind };
  },
  render(p) {
    const [A, B] = PLAYERS[p.pair];
    const { m } = p;
    const die = m === 6 ? 'a fair die' : `a fair ${m}-sided die, numbered 1 to ${m}`;
    const dice = (count: string) => diceWords(count, m);
    const lines: Record<BeatKind, [string, string]> = {
      more: [`${A} and ${B} each roll ${die}.`, `What is the probability that ${A} rolls a higher number than ${B}?`],
      atleast: [`${A} and ${B} each roll ${die}.`, `What is the probability that ${A}'s number is at least as big as ${B}'s?`],
      sumMore: [`${dice('Two')} are rolled.`, `What is the probability that the total is more than ${m + 1}?`],
      sumAtLeast: [`${dice('Two')} are rolled.`, `What is the probability that the total is at least ${m + 1}?`],
      three: [`${dice('Three')} are rolled.`, `What is the probability that the total is at least ${(3 * m + 4) / 2}?`],
      threeLow: [`${dice('Three')} are rolled.`, `What is the probability that the total is at most ${(3 * m + 2) / 2}?`],
    };
    const [setup, question] = lines[p.kind];
    return typedProb([say(setup), say(question)], beatAnswer(p));
  },
  choices(p) {
    const { m } = p;
    const three = p.kind === 'three' || p.kind === 'threeLow';
    if (three) return probOptions([1, 2], [[m - 1, 2 * m], [m + 1, 2 * m], [(3 * m) / 2, 3 * m - 2], [1, m]]);
    return probOptions(beatAnswer(p), [[1, 2], [p.kind === 'more' || p.kind === 'sumMore' ? m + 1 : m - 1, 2 * m], [1, m], [m - 1, m]]);
  },
  solution(p) {
    const [A, B] = PLAYERS[p.pair];
    const { m } = p;
    const ans = beatAnswer(p);
    if (p.kind === 'more' || p.kind === 'atleast') {
      const steps: SolutionStep[] = [
        { text: `A tie is ${m} of the ${m * m} outcomes:` },
        { tex: `P(\\text{tie}) = \\frac{${m}}{${m * m}} = \\frac{1}{${m}}` },
        { text: `Swapping the two dice turns "${A} higher" into "${B} higher", so the rest splits evenly:` },
        { tex: `P(\\text{${A} higher}) =\\frac{1}{2}\\left(1 - \\frac{1}{${m}}\\right) = ${ftex(reduce([m - 1, 2 * m]))}` },
      ];
      if (p.kind === 'atleast') steps.push({ text: 'At least as big also takes in the tie:' }, { tex: `${ftex(reduce([m - 1, 2 * m]))} + \\frac{1}{${m}} = ${ftex(ans)}` });
      return steps;
    }
    if (p.kind === 'sumMore' || p.kind === 'sumAtLeast') {
      const steps: SolutionStep[] = [
        { text: `Turn each die over in your head: a face $a$ becomes $${m + 1} - a$, equally likely. That sends a total $s$ to $${2 * m + 2} - s$, so totals above ${m + 1} are exactly as likely as totals below it.` },
        { text: `The middle total, ${m + 1}, comes up ${m} ways in ${m * m}:` },
        { tex: `P(\\text{total} = ${m + 1}) = \\frac{1}{${m}}` },
        { tex: `P(\\text{above}) = \\frac{1}{2}\\left(1 - \\frac{1}{${m}}\\right) = ${ftex(reduce([m - 1, 2 * m]))}` },
      ];
      if (p.kind === 'sumAtLeast') steps.push({ text: `At least ${m + 1} takes in the middle total too:` }, { tex: `${ftex(reduce([m - 1, 2 * m]))} + \\frac{1}{${m}} = ${ftex(ans)}` });
      return steps;
    }
    return [
      { text: `Turn every die over: a face $a$ becomes $${m + 1} - a$. That sends a total $s$ to $${3 * m + 3} - s$, so totals the same distance above and below $${num((3 * m + 3) / 2)}$ are equally likely.` },
      { text: `No total can be ${num((3 * m + 3) / 2)} itself, so every total is either at most ${(3 * m + 2) / 2} or at least ${(3 * m + 4) / 2}, and the two halves match:` },
      { tex: 'P = \\frac{1}{2}' },
    ];
  },
};

/* ---------- given something about two dice ---------- */

type CondKind = 'one' | 'redEven' | 'diff' | 'redMin' | 'sum' | 'sumMin';
type EventKind = 'both' | 'has' | 'double' | 'sumEven' | 'redMore' | 'sumMin';

interface CondParams {
  cond: CondKind;
  cv: number;
  event: EventKind;
  ev: number;
}

const OUTCOMES: [number, number][] = [];
for (let r = 1; r <= 6; r += 1) for (let b = 1; b <= 6; b += 1) OUTCOMES.push([r, b]);

function condHolds(kind: CondKind, v: number, [r, b]: [number, number]): boolean {
  switch (kind) {
    case 'one':
      return r === v || b === v;
    case 'redEven':
      return r % 2 === 0;
    case 'diff':
      return r !== b;
    case 'redMin':
      return r >= v;
    case 'sum':
      return r + b === v;
    case 'sumMin':
      return r + b >= v;
  }
}

function eventHolds(kind: EventKind, v: number, [r, b]: [number, number]): boolean {
  switch (kind) {
    case 'both':
      return r === v && b === v;
    case 'has':
      return r === v || b === v;
    case 'double':
      return r === b;
    case 'sumEven':
      return (r + b) % 2 === 0;
    case 'redMore':
      return r > b;
    case 'sumMin':
      return r + b >= v;
  }
}

const condWords = ({ cond, cv }: CondParams): string =>
  ({
    one: `at least one die shows ${article(cv)} ${cv}`,
    redEven: 'the red die shows an even number',
    diff: 'the two dice show different numbers',
    redMin: `the red die shows ${cv} or more`,
    sum: `the total is ${cv}`,
    sumMin: `the total is at least ${cv}`,
  })[cond];

const eventWords = ({ event, ev }: CondParams): string =>
  ({
    both: `both dice show ${article(ev)} ${ev}`,
    has: `at least one die shows ${article(ev)} ${ev}`,
    double: 'the two dice show the same number',
    sumEven: 'the total is even',
    redMore: 'the red die shows more than the blue',
    sumMin: `the total is at least ${ev}`,
  })[event];

const eventHave = ({ event, ev }: CondParams): string =>
  ({
    both: `both dice showing ${article(ev)} ${ev}`,
    has: `at least one ${ev}`,
    double: 'a double',
    sumEven: 'an even total',
    redMore: 'red higher than blue',
    sumMin: `a total of at least ${ev}`,
  })[event];

function condSets(p: CondParams) {
  const C = OUTCOMES.filter((o) => condHolds(p.cond, p.cv, o));
  const E = OUTCOMES.filter((o) => eventHolds(p.event, p.ev, o));
  const EC = C.filter((o) => eventHolds(p.event, p.ev, o));
  return { C, E, EC };
}

const cmPrCondDice: Generator<CondParams> = {
  id: 'cm-pr-cond-dice',
  sample(rng, difficulty) {
    for (;;) {
      const cond = difficulty >= 2 ? rng.pick(['sum', 'sumMin'] as const) : rng.pick(['one', 'one', 'redEven', 'diff', 'redMin'] as const);
      const event = difficulty >= 2 ? rng.pick(['has', 'double', 'sumEven', 'redMore', 'both'] as const) : rng.pick(['both', 'has', 'double', 'sumEven', 'redMore', 'sumMin'] as const);
      const cv = cond === 'one' ? rng.int(1, 6) : cond === 'redMin' ? rng.int(3, 5) : cond === 'sum' ? rng.int(4, 10) : cond === 'sumMin' ? rng.int(8, 11) : 0;
      const ev = event === 'sumMin' ? rng.int(7, 11) : event === 'both' || event === 'has' ? rng.int(1, 6) : 0;
      const p = { cond, cv, event, ev };
      const { C, E, EC } = condSets(p);
      if (EC.length === 0 || EC.length === C.length) continue;
      // Conditioning has to change the answer, or the given is decoration.
      if (sameValue([EC.length, C.length], [E.length, 36])) continue;
      return p;
    }
  },
  render(p) {
    const { C, EC } = condSets(p);
    return typedProb(
      [say('Two fair dice, one red and one blue, are rolled.'), say(`Given that ${condWords(p)}, what is the probability that ${eventWords(p)}?`)],
      reduce([EC.length, C.length]),
    );
  },
  choices(p) {
    const { C, E, EC } = condSets(p);
    return probOptions(reduce([EC.length, C.length]), [[EC.length, 36], [E.length, 36], [EC.length, E.length], [C.length - EC.length, C.length]]);
  },
  solution(p) {
    const { C, EC } = condSets(p);
    const pairs = (list: [number, number][]) => list.map(([r, b]) => `(${r}, ${b})`).join(', \\,');
    const steps: SolutionStep[] = [{ text: `Given that ${condWords(p)}, throw away every other outcome. The ones kept are still equally likely.` }];
    switch (p.cond) {
      case 'one':
        steps.push({ text: `Red shows ${article(p.cv)} ${p.cv} in 6 outcomes and blue in 6, and the double ${p.cv} is in both:` }, { tex: `6 + 6 - 1 = 11` });
        break;
      case 'redEven':
        steps.push({ text: 'Red has 3 even faces, each with any of 6 on blue:' }, { tex: '3 \\times 6 = 18' });
        break;
      case 'diff':
        steps.push({ text: 'Take away the 6 doubles:' }, { tex: '36 - 6 = 30' });
        break;
      case 'redMin':
        steps.push({ text: `Red has ${7 - p.cv} faces of ${p.cv} or more, each with any of 6 on blue:` }, { tex: `${7 - p.cv} \\times 6 = ${C.length}` });
        break;
      case 'sum':
        steps.push({ text: `The outcomes with a total of ${p.cv}, red first:` }, { tex: pairs(C) });
        break;
      case 'sumMin': {
        const sums = Array.from({ length: 13 - p.cv }, (_, i) => p.cv + i);
        steps.push({ text: `Totals from ${p.cv} to 12 come up in` }, { tex: `${sums.map((s) => waysTwo(6, s)).join(' + ')} = ${C.length}` }, { text: 'ways.' });
        break;
      }
    }
    if (EC.length <= 5) steps.push({ text: `Of those, the ones where ${eventWords(p)}:` }, { tex: pairs(EC) });
    else steps.push({ text: `Of those, ${EC.length} have ${eventHave(p)}.` });
    steps.push({ tex: `P = ${rawThenLowest([EC.length, C.length])}` });
    return steps;
  },
};

/* ---------- which bag? a tree, then turned round ---------- */

interface BagsParams {
  /** Bag A is used on a die roll of 1 to k; 0 means a fair coin decides. */
  k: number;
  /** The tree leaves the first stage blank too. */
  hard?: boolean;
  a: number;
  rA: number;
  b: number;
  rB: number;
}

const bagChance = ({ k }: BagsParams): [Frac, Frac] => (k === 0 ? [[1, 2], [1, 2]] : [reduce([k, 6]), reduce([6 - k, 6])]);

function bagsSetup(p: BagsParams): string[] {
  const pick =
    p.k === 0
      ? 'A fair coin is tossed: on heads a counter is taken at random from bag A, on tails from bag B.'
      : `A fair die is rolled: on ${p.k === 1 ? 'a 1' : `1 to ${p.k}`} a counter is taken at random from bag A, otherwise from bag B.`;
  return [`Bag A holds ${p.a} counters, ${p.rA} red and ${p.a - p.rA} green. Bag B holds ${p.b}, ${p.rB} red and ${p.b - p.rB} green.`, pick];
}

function sampleBags(rng: Parameters<Generator<BagsParams>['sample']>[0], k: number): BagsParams {
  for (;;) {
    const a = rng.int(3, 8);
    const b = rng.int(3, 8);
    const rA = rng.int(1, a - 1);
    const rB = rng.int(1, b - 1);
    const p = { k, a, rA, b, rB };
    const [pA, pB] = bagChance(p);
    const values: Frac[] = [...(k === 0 ? [] : [pA, pB]), [rA, a], [a - rA, a], [rB, b], [b - rB, b]];
    const distinct = values.every((x, i) => values.every((y, j) => i === j || !sameValue(x, y)));
    if (!distinct) continue;
    return p;
  }
}

const bagsJoint = (p: BagsParams): [Frac, Frac] => {
  const [pA, pB] = bagChance(p);
  return [times(pA, [p.rA, p.a]), times(pB, [p.rB, p.b])];
};

const cmPrBagsTree: Generator<BagsParams> = {
  id: 'cm-pr-bags-tree',
  sample(rng, difficulty) {
    return { ...sampleBags(rng, rng.pick([1, 2, 4, 5])), hard: difficulty >= 2 };
  },
  render(p): Slide {
    const [pA, pB] = bagChance(p);
    const f = (top: number, bottom: number) => `\\frac{${top}}{${bottom}}`;
    const first = [ftex(pA), ftex(pB)];
    const second = [f(p.rA, p.a), f(p.a - p.rA, p.a), f(p.rB, p.b), f(p.b - p.rB, p.b)];
    const answer = p.hard ? [...first, ...second] : second;
    const candidates = [f(p.rA, p.b), f(p.rB, p.a), f(p.rA + p.rB, p.a + p.b), ftex(reduce([p.k + 1, 6])), ftex(reduce([Math.max(p.k - 1, 1), 6])), f(p.rA, p.a + p.b), f(p.rB, p.a + p.b)];
    const taken = [...first, ...second].map((t) => tokenValue(t)!);
    const spares: string[] = [];
    for (const t of candidates) {
      if (spares.length === 3) break;
      const v = tokenValue(t);
      if (v === undefined || v <= 0 || v >= 1 || taken.some((u) => Math.abs(u - v) < 1e-9)) continue;
      taken.push(v);
      spares.push(t);
    }
    return {
      kind: 'probTree',
      mode: 'fill',
      prompt: [...bagsSetup(p).map(say), say(p.hard ? 'Fill in the tree: the bag first, then the colour.' : 'Fill in the colour branches of the tree.')],
      branches: [
        { label: 'A', p: p.hard ? null : first[0], next: [{ label: 'R', p: null }, { label: 'G', p: null }] },
        { label: 'B', p: p.hard ? null : first[1], next: [{ label: 'R', p: null }, { label: 'G', p: null }] },
      ],
      bank: sortByValue([...answer, ...spares]),
      answer,
    };
  },
  solution(p) {
    const [pA, pB] = bagChance(p);
    return [
      { text: p.k === 0 ? 'The coin makes each bag equally likely:' : `${p.k} of the 6 faces ${p.k === 1 ? 'sends' : 'send'} you to bag A:` },
      { tex: `P(A) = ${ftex(pA)}, \\quad P(B) = ${ftex(pB)}` },
      { text: 'Then each branch is the colour out of that bag alone:' },
      { tex: `\\text{A: } \\frac{${p.rA}}{${p.a}}, \\; \\frac{${p.a - p.rA}}{${p.a}}` },
      { tex: `\\text{B: } \\frac{${p.rB}}{${p.b}}, \\; \\frac{${p.b - p.rB}}{${p.b}}` },
    ];
  },
};

const bayesAnswer = (p: BagsParams): Frac => {
  const [jA, jB] = bagsJoint(p);
  return over(jA, plus(jA, jB));
};

const cmPrBagsBayes: Generator<BagsParams> = {
  id: 'cm-pr-bags-bayes',
  sample(rng, difficulty) {
    for (;;) {
      const p = sampleBags(rng, difficulty >= 2 ? rng.pick([1, 2, 4, 5]) : 0);
      // Counting red counters across both bags must be the trap, not the answer.
      if (sameValue(bayesAnswer(p), [p.rA, p.rA + p.rB])) continue;
      return p;
    }
  },
  render(p) {
    return typedProb([...bagsSetup(p).map(say), say('The counter taken is red. What is the probability that it came from bag A?')], bayesAnswer(p));
  },
  choices(p) {
    const [pA] = bagChance(p);
    const [jA, jB] = bagsJoint(p);
    return probOptions(bayesAnswer(p), [[p.rA, p.a], [p.rA, p.rA + p.rB], jA, pA, plus(jA, jB)]);
  },
  solution(p) {
    const [pA, pB] = bagChance(p);
    const [jA, jB] = bagsJoint(p);
    const R = plus(jA, jB);
    return [
      { text: 'Multiply along the two branches that end in red:' },
      { tex: `P(A \\cap R) = ${ftex(pA)} \\times \\frac{${p.rA}}{${p.a}} = ${ftex(jA)}` },
      { tex: `P(B \\cap R) = ${ftex(pB)} \\times \\frac{${p.rB}}{${p.b}} = ${ftex(jB)}` },
      { text: 'Given red, keep only those two branches. Bag A is its share of them:' },
      { tex: `P(R) = ${ftex(jA)} + ${ftex(jB)} = ${ftex(R)}` },
      { tex: `P(A \\mid R) = ${ftex(jA)} \\div ${ftex(R)} = ${ftex(bayesAnswer(p))}` },
    ];
  },
};

export const contestProbabilityGenerators = [
  cmPrDiceSum,
  cmPrDiceTable,
  cmPrOrder,
  cmPrCoins,
  cmPrCards,
  cmPrPieCount,
  cmPrVenn,
  cmPrAtLeastOne,
  cmPrCommittee,
  cmPrCommitteeTable,
  cmPrBothChosen,
  cmPrBagTree,
  cmPrSameColour,
  cmPrLineUp,
  cmPrBeats,
  cmPrCondDice,
  cmPrBagsTree,
  cmPrBagsBayes,
];
