/**
 * Contest Math, level 2: Equations and Ratios.
 *
 * Five lessons: percentages and ratios, one-unknown equations from words,
 * arithmetic and geometric sequences, equations whose data is a ratio, and
 * ratios of lengths, areas and volumes with no numbers for the shape itself.
 * The idea in each is to name one unknown well: the third-placed score, the
 * size of one ratio part, the common difference.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { Generator, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import { FRACTION_KEYS, fracAnswer, fracTex, gcd, num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ================================================================
 * Lesson 1: Ratios and Percentages
 * ================================================================ */

/* ---------- up by p%, down by q% ---------- */

interface ChainParams {
  up: number;
  down: number;
  /** Difficulty 2: down first, then up. */
  downFirst: boolean;
}

/** The overall change, in percent. */
const netChange = ({ up, down }: ChainParams) => Number((((100 + up) * (100 - down)) / 100 - 100).toFixed(4));

const cmPercentChain: Generator<ChainParams> = {
  id: 'cm-percent-chain',
  sample(rng, difficulty) {
    for (;;) {
      const up = difficulty >= 2 ? 5 * rng.int(1, 12) : 10 * rng.int(1, 6);
      const down = difficulty >= 2 ? 5 * rng.int(1, 12) : 10 * rng.int(1, 6);
      const p = { up, down, downFirst: difficulty >= 2 && rng.chance(0.5) };
      if (netChange(p) === 0 || !Number.isInteger(netChange(p) * 4)) continue;
      return p;
    }
  },
  render(p) {
    const steps = p.downFirst
      ? `cut by ${p.down}%, then the new price is raised by ${p.up}%`
      : `raised by ${p.up}%, then the new price is cut by ${p.down}%`;
    return typed(
      [say(`A price is ${steps}.`), say('By what percentage has the price changed overall? Give a rise as positive and a fall as negative.')],
      netChange(p),
      '\\text{change (\\%)} =',
    );
  },
  choices(p) {
    const net = netChange(p);
    return numberOptions(net, [p.up - p.down, -net, net + 1, net - 1], 0.25, -Infinity);
  },
  solution(p) {
    const a = (100 + p.up) / 100;
    const b = (100 - p.down) / 100;
    return [
      { text: `A rise of ${p.up}% multiplies by ${num(a)}, and a cut of ${p.down}% by ${num(b)}. The order makes no difference:` },
      { tex: `${num(a)} \\times ${num(b)} = ${num(a * b)}` },
      { text: `So the price ends at ${num(100 * a * b)}% of where it started:` },
      { tex: `${num(100 * a * b)} - 100 = ${num(netChange(p))}` },
    ];
  },
};

/* ---------- x% of y is y% of x ---------- */

interface SwapParams {
  x: number;
  y: number;
}

const cmPercentSwap: Generator<SwapParams> = {
  id: 'cm-percent-swap',
  sample(rng, difficulty) {
    const easy = difficulty >= 2 ? [4, 8, 12, 16, 20, 25, 40, 50, 75] : [10, 20, 25, 50];
    for (;;) {
      const y = rng.pick(easy);
      const x = rng.int(difficulty >= 2 ? 13 : 11, difficulty >= 2 ? 99 : 60);
      if ((x * y) % 100 !== 0 && difficulty < 2) continue;
      if (!Number.isInteger((x * y) / 25)) continue;
      if (x === y || easy.includes(x)) continue;
      return { x, y };
    }
  },
  render({ x, y }) {
    return typed([say(`Work out ${x}% of ${y} without a calculator.`)], (x * y) / 100, '\\text{value} =');
  },
  choices({ x, y }) {
    const v = (x * y) / 100;
    return numberOptions(v, [v * 10, v / 10, x + y - 100 > 0 ? x + y - 100 : v + 2, v + 1], 0.5, 0);
  },
  solution({ x, y }) {
    return [
      { text: `$${x}\\%$ of ${y} means $${x} \\times ${y} \\div 100$, and so does ${y}% of ${x}. Swap them:` },
      { tex: `${x}\\% \\text{ of } ${y} = ${y}\\% \\text{ of } ${x}` },
      { tex: `${y}\\% \\text{ of } ${x} = ${num((x * y) / 100)}` },
    ];
  },
};

/* ---------- a ratio and a difference ---------- */

interface ShareParams {
  a: number;
  b: number;
  unit: number;
  ask: 'total' | 'larger';
}

const cmRatioShare: Generator<ShareParams> = {
  id: 'cm-ratio-share',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, 11);
      const b = rng.int(1, a - 1);
      if (gcd(a, b) !== 1) continue;
      return { a, b, unit: rng.int(2, difficulty >= 2 ? 40 : 15) * (difficulty >= 2 ? 3 : 1), ask: difficulty >= 2 ? 'larger' : 'total' };
    }
  },
  render({ a, b, unit, ask }) {
    return typed(
      [
        say(`Marbles are shared between Sam and Tia in the ratio $${a} : ${b}$. Sam gets ${(a - b) * unit} more than Tia.`),
        say(ask === 'total' ? 'How many marbles are there in all?' : 'How many does Sam get?'),
      ],
      ask === 'total' ? (a + b) * unit : a * unit,
      ask === 'total' ? '\\text{marbles} =' : '\\text{Sam} =',
    );
  },
  choices({ a, b, unit, ask }) {
    const d = (a - b) * unit;
    const answer = ask === 'total' ? (a + b) * unit : a * unit;
    return numberOptions(answer, [(a + b) * d, a * d, b * unit, (a + b) * unit, d * 2], 1, 1);
  },
  solution({ a, b, unit, ask }) {
    const steps: SolutionStep[] = [
      { text: `Sam has ${a} parts and Tia ${b}, so the difference is ${a - b} part${a - b === 1 ? '' : 's'}:` },
    ];
    if (a - b > 1) steps.push({ tex: `${a - b} \\text{ parts} = ${(a - b) * unit}` });
    steps.push({ tex: `1 \\text{ part} = ${unit}` });
    if (ask === 'total') steps.push({ tex: `${a + b} \\text{ parts} = ${(a + b) * unit}` });
    else steps.push({ tex: `\\text{Sam} = ${a} \\times ${unit} = ${a * unit}` });
    return steps;
  },
};

/* ---------- combining two ratios, as tiles ---------- */

interface CombineParams {
  a: number;
  b1: number;
  b2: number;
  c: number;
}

function combined({ a, b1, b2, c }: CombineParams): [number, number, number] {
  const l = (b1 * b2) / gcd(b1, b2);
  const x = [a * (l / b1), l, c * (l / b2)];
  const g = gcd(gcd(x[0], x[1]), x[2]);
  return [x[0] / g, x[1] / g, x[2] / g];
}

const cmRatioCombine: Generator<CombineParams> = {
  id: 'cm-ratio-combine',
  sample(rng) {
    for (;;) {
      const p = { a: rng.int(1, 9), b1: rng.int(2, 9), b2: rng.int(2, 9), c: rng.int(1, 9) };
      if (gcd(p.a, p.b1) !== 1 || gcd(p.b2, p.c) !== 1 || p.b1 === p.b2) continue;
      if (combined(p).some((v) => v > 60)) continue;
      return p;
    }
  },
  render(p) {
    const [x, y, z] = combined(p);
    return {
      kind: 'tiles',
      prompt: [say(`Apples to bananas are $${p.a} : ${p.b1}$, and bananas to cherries are $${p.b2} : ${p.c}$.`), say('Write all three as one ratio in its simplest form.')],
      template: '\\text{apples : bananas : cherries} = {0} : {1} : {2}',
      bank: numberBank([x, y, z], [p.a, p.b1, p.b2, p.c, p.a * p.b2, p.c * p.b1], 3),
      answer: [num(x), num(y), num(z)],
    };
  },
  solution(p) {
    const l = (p.b1 * p.b2) / gcd(p.b1, p.b2);
    const [x, y, z] = combined(p);
    const steps: SolutionStep[] = [
      { text: `Bananas are ${p.b1} parts in one ratio and ${p.b2} in the other. Scale both so bananas are ${l}:` },
      { tex: `${p.a} : ${p.b1} = ${(p.a * l) / p.b1} : ${l}` },
      { tex: `${p.b2} : ${p.c} = ${l} : ${(p.c * l) / p.b2}` },
      { tex: `${(p.a * l) / p.b1} : ${l} : ${(p.c * l) / p.b2}` },
    ];
    if (y !== l) steps.push({ text: 'Divide through by the common factor:' }, { tex: `${x} : ${y} : ${z}` });
    return steps;
  },
};

/* ---------- reverse percentages ---------- */

interface ReverseParams {
  original: number;
  pct: number;
  rise: boolean;
}

const after = ({ original, pct, rise }: ReverseParams) => (original * (100 + (rise ? pct : -pct))) / 100;

const cmReversePercent: Generator<ReverseParams> = {
  id: 'cm-reverse-percent',
  sample(rng, difficulty) {
    for (;;) {
      const pct = difficulty >= 2 ? rng.pick([12, 15, 16, 24, 35, 40, 45, 60, 75]) : rng.pick([10, 20, 25, 30, 50]);
      const original = rng.int(4, 60) * 20;
      const p = { original, pct, rise: rng.chance(0.5) };
      if (!Number.isInteger(after(p))) continue;
      return p;
    }
  },
  render(p) {
    const how = p.rise ? `After a rise of ${p.pct}%` : `In a ${p.pct}% off sale`;
    return typed([say(`${how}, a bike costs £${after(p)}.`), say('What did it cost before?')], p.original, '\\text{£} =');
  },
  choices(p) {
    const now = after(p);
    const naive = p.rise ? (now * (100 - p.pct)) / 100 : (now * (100 + p.pct)) / 100;
    return numberOptions(p.original, [naive, now, p.original + 10], 10, 1);
  },
  solution(p) {
    const f = (100 + (p.rise ? p.pct : -p.pct)) / 100;
    return [
      { text: `The price now is ${num(100 * f)}% of the old price, so multiply the old price by ${num(f)} to get it. Undo that by dividing:` },
      { tex: `${after(p)} \\div ${num(f)} = ${p.original}` },
      { text: `${p.rise ? 'Taking' : 'Adding'} ${p.pct}% of the new price is the trap: that percentage is of the old price, not the new one.` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Simple Equations
 * ================================================================ */

/* ---------- brackets on both sides ---------- */

interface BracketParams {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  x: number;
}

const cmBracketsEquation: Generator<BracketParams> = {
  id: 'cm-brackets-equation',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, 9);
      const c = rng.int(2, 9);
      const e = rng.int(1, 6);
      const b = rng.int(1, 9);
      const d = rng.int(1, 9);
      const k = a - c - e;
      if (k === 0) continue;
      const top = a * b + c * d;
      if (top % k !== 0) continue;
      const x = top / k;
      if (difficulty < 2 && x <= 0) continue;
      if (Math.abs(x) > 60 || x === 0) continue;
      return { a, b, c, d, e, x };
    }
  },
  render(p) {
    return typed([say('Solve for $x$.'), show(`${p.a}(x - ${p.b}) = ${p.c}(x + ${p.d}) + ${p.e === 1 ? '' : p.e}x`)], p.x, 'x =');
  },
  choices(p) {
    return numberOptions(p.x, [-p.x, p.x + 1, (p.a * p.b - p.c * p.d) / (p.a - p.c - p.e), p.x - 2], 1, -Infinity);
  },
  solution(p) {
    const k = p.a - p.c - p.e;
    const top = p.a * p.b + p.c * p.d;
    return [
      { text: 'Multiply out both brackets:' },
      { tex: `${p.a}x - ${p.a * p.b} = ${p.c}x + ${p.c * p.d} + ${p.e === 1 ? '' : p.e}x` },
      { text: 'Collect $x$ on the left and numbers on the right:' },
      { tex: `${p.a}x - ${p.c + p.e}x = ${p.c * p.d} + ${p.a * p.b}` },
      ...(k === 1 ? [] : [{ tex: `${k === -1 ? '-' : k}x = ${top}` }]),
      { tex: `x = ${p.x}` },
    ];
  },
};

/* ---------- three scores ---------- */

interface ScoresParams {
  third: number;
  times: number;
  more: number;
  context: number;
}

const SCORES = [
  { who: 'gymnasts', what: 'points', first: 'first-placed gymnast', second: 'second', third: 'third' },
  { who: 'runners', what: 'laps', verb: 'ran', base: 'run', first: 'fastest runner', second: 'second-fastest', third: 'third-fastest' },
  { who: 'bakers', what: 'cakes', verb: 'sold', base: 'sell', first: 'top baker', second: 'second baker', third: 'third baker' },
];

const firstScore = (p: ScoresParams) => p.times * p.third + p.more;
const totalScore = (p: ScoresParams) => firstScore(p) + p.times * p.third + p.third;

const cmThreeScores: Generator<ScoresParams> = {
  id: 'cm-three-scores',
  sample(rng, difficulty) {
    return {
      third: rng.int(10, difficulty >= 2 ? 90 : 40) * (difficulty >= 2 ? 1 : 5),
      times: rng.int(2, difficulty >= 2 ? 4 : 3),
      more: 5 * rng.int(2, 20),
      context: rng.int(0, SCORES.length - 1),
    };
  },
  render(p) {
    const c = SCORES[p.context];
    return typed(
      [
        say(`The ${c.first} ${c.verb} ${p.more} more ${c.what} than the ${c.second}. The ${c.second} ${c.verb} ${p.times === 2 ? 'twice' : p.times === 3 ? 'three times' : 'four times'} as many as the ${c.third}.`),
        say(`Together the three ${c.verb} ${totalScore(p)}. How many did the ${c.first} ${c.base}?`),
      ],
      firstScore(p),
      '\\text{first} =',
    );
  },
  choices(p) {
    return numberOptions(firstScore(p), [p.times * p.third, p.third, Math.round(totalScore(p) / 3), firstScore(p) + p.more], 5, 1);
  },
  solution(p) {
    const t = p.times;
    return [
      { text: 'Name the smallest score, the third, as $t$. Then the second is' },
      { tex: `${t}t` },
      { text: 'and the first is' },
      { tex: `${t}t + ${p.more}` },
      { text: 'All three add to the total:' },
      { tex: `t + ${t}t + ${t}t + ${p.more} = ${totalScore(p)}` },
      { tex: `${2 * t + 1}t = ${totalScore(p) - p.more}` },
      { tex: `t = ${p.third}` },
      { tex: `\\text{first} = ${t} \\times ${p.third} + ${p.more} = ${firstScore(p)}` },
    ];
  },
};

/* ---------- the same scores, set up as tiles ---------- */

const cmThreeScoresTiles: Generator<ScoresParams> = {
  id: 'cm-three-scores-tiles',
  sample(rng) {
    return { third: rng.int(8, 60), times: rng.int(2, 4), more: rng.int(3, 30), context: rng.int(0, SCORES.length - 1) };
  },
  render(p) {
    const c = SCORES[p.context];
    const total = totalScore(p);
    return {
      kind: 'tiles',
      prompt: [
        say(`The ${c.first} ${c.verb} ${p.more} more ${c.what} than the ${c.second}, who ${c.verb} ${p.times} times as many as the ${c.third}. The total was ${total}.`),
        say(`Call the ${c.third}’s score $t$ and fill in the working.`),
      ],
      template: `{0}t + ${p.more} = ${total}, \\quad t = {1}, \\quad \\text{first} = {2}`,
      bank: numberBank([2 * p.times + 1, p.third, firstScore(p)], [p.times + 1, 2 * p.times, p.times * p.third, firstScore(p) - p.more], 3),
      answer: [num(2 * p.times + 1), num(p.third), num(firstScore(p))],
    };
  },
  solution: (p) => cmThreeScores.solution(p),
};

/* ---------- half the way at one speed, half at another ---------- */

interface LegsParams {
  u: number;
  v: number;
  minutes: number;
}

/** Time is inversely proportional to speed over equal distances. */
const secondLeg = ({ u, v, minutes }: LegsParams) => (minutes * u) / (u + v);

const cmHalfwaySpeeds: Generator<LegsParams> = {
  id: 'cm-halfway-speeds',
  sample(rng, difficulty) {
    for (;;) {
      const u = 5 * rng.int(2, difficulty >= 2 ? 14 : 8);
      const v = 5 * rng.int(2, difficulty >= 2 ? 14 : 8);
      if (u >= v || gcd(u, v) === u) continue;
      const minutes = rng.int(6, 90);
      if (!Number.isInteger(secondLeg({ u, v, minutes }))) continue;
      return { u, v, minutes };
    }
  },
  render(p) {
    return typed(
      [
        say(`Gita drives to work. She drives at ${p.u} mph to a café exactly halfway, then at ${p.v} mph the rest of the way.`),
        say(`She drives for ${p.minutes} minutes in all. How many minutes does the second half take?`),
      ],
      secondLeg(p),
      '\\text{minutes} =',
    );
  },
  choices(p) {
    const answer = secondLeg(p);
    return numberOptions(answer, [p.minutes / 2, p.minutes - answer, (p.minutes * p.v) / (p.u + p.v) === answer ? answer + 1 : answer - 1], 1, 1);
  },
  solution(p) {
    const g = gcd(p.u, p.v);
    const first = p.minutes - secondLeg(p);
    return [
      { text: 'The two halves are the same distance, so the times go the other way to the speeds:' },
      { tex: `\\text{time}_1 : \\text{time}_2 = ${p.v} : ${p.u} = ${p.v / g} : ${p.u / g}` },
      { text: `Share the ${p.minutes} minutes in that ratio, ${(p.u + p.v) / g} parts:` },
      { tex: `1 \\text{ part} = ${p.minutes} \\div ${(p.u + p.v) / g} = ${num((p.minutes * g) / (p.u + p.v))}` },
      { tex: `\\text{time}_2 = ${p.u / g} \\times ${num((p.minutes * g) / (p.u + p.v))} = ${num(secondLeg(p))}` },
      { text: `Check: the first half takes ${num(first)} minutes, longer, since it is slower.` },
    ];
  },
};

/* ---------- mixtures ---------- */

interface MixParams {
  low: number;
  high: number;
  target: number;
  weight: number;
}

const lowNeeded = ({ low, high, target, weight }: MixParams) => (weight * (high - target)) / (high - low);

const cmMixture: Generator<MixParams> = {
  id: 'cm-mixture',
  sample(rng, difficulty) {
    for (;;) {
      const low = 5 * rng.int(1, 10);
      const high = 5 * rng.int(low / 5 + 2, 19);
      const target = 5 * rng.int(low / 5 + 1, high / 5 - 1);
      const weight = rng.int(2, difficulty >= 2 ? 30 : 12) * 5;
      const p = { low, high, target, weight };
      if (!Number.isInteger(lowNeeded(p))) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [
        say(`A shop sells two trail mixes: one is ${p.low}% nuts and the other ${p.high}% nuts.`),
        say(`How many kilograms of the ${p.low}% mix are needed to make ${p.weight} kg that is ${p.target}% nuts?`),
      ],
      lowNeeded(p),
      '\\text{kg} =',
    );
  },
  choices(p) {
    const answer = lowNeeded(p);
    return numberOptions(answer, [p.weight - answer, p.weight / 2, (p.weight * (p.target - p.low)) / (p.high - p.low) + 1], 1, 1);
  },
  solution(p) {
    const a = lowNeeded(p);
    return [
      { text: `Say $x$ kg of the ${p.low}% mix, so ${p.weight} − $x$ kg of the ${p.high}% mix. Count the nuts:` },
      { tex: `${p.low / 100}x + ${p.high / 100}(${p.weight} - x) = ${num((p.target * p.weight) / 100)}` },
      { text: 'Multiply through by 100 to clear the decimals:' },
      { tex: `${p.low}x + ${p.high * p.weight} - ${p.high}x = ${p.target * p.weight}` },
      { tex: `${p.high - p.low}x = ${(p.high - p.target) * p.weight}` },
      { tex: `x = ${num(a)}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Sequences and Series
 * ================================================================ */

/* ---------- a term from two others ---------- */

interface ArithParams {
  first: number;
  step: number;
  m: number;
  n: number;
  k: number;
}

const term = (p: ArithParams, i: number) => p.first + (i - 1) * p.step;

const cmArithTerm: Generator<ArithParams> = {
  id: 'cm-arith-term',
  sample(rng, difficulty) {
    for (;;) {
      const first = rng.int(-20, 30);
      const step = rng.int(-9, 12);
      if (step === 0) continue;
      const m = rng.int(2, 9);
      const n = m + rng.int(2, 8);
      const k = difficulty >= 2 ? rng.int(40, 150) : rng.int(n + 2, 30);
      return { first, step, m, n, k };
    }
  },
  render(p) {
    return typed(
      [say(`In an arithmetic sequence the ${ordinal(p.m)} term is ${term(p, p.m)} and the ${ordinal(p.n)} term is ${term(p, p.n)}.`), say(`What is the ${ordinal(p.k)} term?`)],
      term(p, p.k),
      `\\text{term } ${p.k} =`,
    );
  },
  choices(p) {
    const answer = term(p, p.k);
    return numberOptions(answer, [answer - p.step, answer + p.step, p.k * p.step, term(p, p.n) + (p.k - p.n) * (p.step + 1)], 1, -Infinity);
  },
  solution(p) {
    const gap = p.n - p.m;
    return [
      { text: `From term ${p.m} to term ${p.n} is ${gap} steps:` },
      { tex: `${term(p, p.n)} - ${bracket(term(p, p.m))} = ${term(p, p.n) - term(p, p.m)}` },
      { tex: `d = ${term(p, p.n) - term(p, p.m)} \\div ${gap} = ${p.step}` },
      { text: `From term ${p.n} to term ${p.k} is ${p.k - p.n} more steps:` },
      { tex: `${term(p, p.n)} + ${p.k - p.n} \\times ${bracket(p.step)} = ${term(p, p.k)}` },
    ];
  },
};

function ordinal(n: number): string {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${tail}`;
}

const bracket = (v: number) => (v < 0 ? `(${v})` : `${v}`);

/* ---------- summing an arithmetic series ---------- */

interface SeriesParams {
  first: number;
  step: number;
  last: number;
}

const count = (p: SeriesParams) => (p.last - p.first) / p.step + 1;
const seriesSum = (p: SeriesParams) => (count(p) * (p.first + p.last)) / 2;

const cmArithSum: Generator<SeriesParams> = {
  id: 'cm-arith-sum',
  sample(rng, difficulty) {
    const step = rng.int(2, difficulty >= 2 ? 9 : 5);
    const first = rng.int(1, 20);
    const n = rng.int(difficulty >= 2 ? 20 : 8, difficulty >= 2 ? 60 : 25);
    return { first, step, last: first + (n - 1) * step };
  },
  render(p) {
    return typed([say('Add up the series.'), show(`${p.first} + ${p.first + p.step} + ${p.first + 2 * p.step} + \\cdots + ${p.last}`)], seriesSum(p), '\\text{sum} =');
  },
  choices(p) {
    const answer = seriesSum(p);
    return numberOptions(answer, [((count(p) - 1) * (p.first + p.last)) / 2, count(p) * (p.first + p.last), ((count(p) + 1) * (p.first + p.last)) / 2], 1, 1);
  },
  solution(p) {
    return [
      { text: 'Count the terms: the gap from first to last, in steps, plus one.' },
      { tex: `(${p.last} - ${p.first}) \\div ${p.step} + 1 = ${count(p)}` },
      { text: 'Pair the first with the last, the second with the second-last, and so on. Each pair makes the same total:' },
      { tex: `${p.first} + ${p.last} = ${p.first + p.last}` },
      { tex: `\\text{sum} = \\tfrac{1}{2} \\times ${count(p)} \\times ${p.first + p.last} = ${seriesSum(p)}` },
    ];
  },
};

/* ---------- filling a sequence table ---------- */

interface TableParams {
  first: number;
  step: number;
  /** Positions 1..6 whose values are shown; the rest are blank. */
  shown: [number, number];
}

const cmSequenceTable: Generator<TableParams> = {
  id: 'cm-sequence-table',
  sample(rng) {
    for (;;) {
      const first = rng.int(-10, 30);
      const step = rng.int(-8, 9);
      if (step === 0 || Math.abs(step) === 1) continue;
      const i = rng.int(1, 3);
      const j = rng.int(i + 2, 6);
      return { first, step, shown: [i, j] };
    }
  },
  render(p) {
    const val = (i: number) => p.first + (i - 1) * p.step;
    const blanks = [1, 2, 3, 4, 5, 6].filter((i) => !p.shown.includes(i));
    return {
      kind: 'table',
      prompt: [say('The table shows an arithmetic sequence. Fill in the missing terms.')],
      columns: ['n', 'u_n'],
      rows: [1, 2, 3, 4, 5, 6].map((i) => [String(i), p.shown.includes(i) ? num(val(i)) : null]),
      bank: numberBank(
        blanks.map(val),
        blanks.map((i) => val(i) + 1).concat([val(7), val(0)]),
        3,
        1,
        -Infinity,
      ),
      answer: blanks.map((i) => num(val(i))),
    };
  },
  solution(p) {
    const val = (i: number) => p.first + (i - 1) * p.step;
    const [i, j] = p.shown;
    return [
      { text: `From term ${i} to term ${j} is ${j - i} steps:` },
      { tex: `d = (${bracket(val(j))} - ${bracket(val(i))}) \\div ${j - i} = ${p.step}` },
      { text: 'Add $d$ to go down the table, take it away to go up:' },
      { tex: [1, 2, 3, 4, 5, 6].map(val).join(', ') },
    ];
  },
};

/* ---------- sums of odd and even numbers ---------- */

interface OddParams {
  kind: 'odd' | 'even' | 'difference';
  n: number;
}

const oddValue = ({ kind, n }: OddParams) => (kind === 'odd' ? n * n : kind === 'even' ? n * (n + 1) : n);

const cmOddSums: Generator<OddParams> = {
  id: 'cm-odd-sums',
  sample(rng, difficulty) {
    return { kind: difficulty >= 2 ? rng.pick(['even', 'difference'] as const) : 'odd', n: rng.int(10, 99) };
  },
  render({ kind, n }) {
    // The difference is two displays, so neither bracket breaks across a line.
    const shown =
      kind === 'odd'
        ? [show(`1 + 3 + 5 + \\cdots + ${2 * n - 1}`)]
        : kind === 'even'
          ? [show(`2 + 4 + 6 + \\cdots + ${2 * n}`)]
          : [show(`(2 + 4 + \\cdots + ${2 * n})`), show(`-\\,(1 + 3 + \\cdots + ${2 * n - 1})`)];
    return typed([say('Work out'), ...shown], oddValue({ kind, n }), '\\text{value} =');
  },
  choices(p) {
    const v = oddValue(p);
    return numberOptions(v, [p.n * p.n, p.n * (p.n + 1), (2 * p.n - 1) * (2 * p.n - 1), 2 * p.n, p.n * (p.n - 1)], 1, 1);
  },
  solution({ kind, n }) {
    if (kind === 'difference') {
      return [
        { text: `Both brackets have ${n} terms. Pair them up: each even number is one more than the odd number before it.` },
        { tex: `(2 - 1) + \\cdots + (${2 * n} - ${2 * n - 1})` },
        { tex: `${n} \\times 1 = ${n}` },
      ];
    }
    const steps: SolutionStep[] = [{ text: `There are ${n} terms. Pair the first with the last:` }];
    if (kind === 'odd') {
      steps.push({ tex: `1 + ${2 * n - 1} = ${2 * n}` }, { tex: `\\tfrac{1}{2} \\times ${n} \\times ${2 * n} = ${n * n}` }, { text: `The first ${n} odd numbers always add to $${n}^2$.` });
    } else {
      steps.push({ tex: `2 + ${2 * n} = ${2 * n + 2}` }, { tex: `\\tfrac{1}{2} \\times ${n} \\times ${2 * n + 2} = ${n * (n + 1)}` });
    }
    return steps;
  },
};

/* ---------- when does a geometric sequence pass a number? ---------- */

interface GeoParams {
  first: number;
  ratio: number;
  bound: number;
}

function firstPast({ first, ratio, bound }: GeoParams): number {
  let t = first;
  let i = 1;
  while (t <= bound) {
    t *= ratio;
    i += 1;
  }
  return i;
}

const cmGeoPast: Generator<GeoParams> = {
  id: 'cm-geo-past',
  sample(rng, difficulty) {
    for (;;) {
      const first = rng.int(1, 9);
      const ratio = rng.int(2, difficulty >= 2 ? 5 : 3);
      const bound = difficulty >= 2 ? rng.int(1000, 99999) : rng.int(100, 3000);
      const p = { first, ratio, bound };
      // A term landing exactly on the bound makes "more than" a trap about words, not maths.
      let t = first;
      let clash = false;
      while (t <= bound) {
        if (t === bound) clash = true;
        t *= ratio;
      }
      if (clash) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [say(`A sequence starts at ${p.first} and each term is ${p.ratio} times the one before.`), say(`Which term is the first to be more than ${p.bound}?`)],
      firstPast(p),
      '\\text{term number} =',
    );
  },
  choices(p) {
    const answer = firstPast(p);
    return numberOptions(answer, [answer - 1, answer + 1, answer + 2], 1, 1);
  },
  solution(p) {
    const terms: number[] = [];
    let t = p.first;
    while (terms.length < firstPast(p)) {
      terms.push(t);
      t *= p.ratio;
    }
    const last = terms.slice(-2);
    return [
      { text: `Term $n$ is ${p.first} times ${p.ratio} to the power $n - 1$. Write out the terms either side of ${p.bound}:` },
      { tex: `u_{${terms.length - 1}} = ${last[0]}` },
      { tex: `u_{${terms.length}} = ${last[1]}` },
      { text: `So term ${terms.length} is the first past ${p.bound}.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Equations with Ratios
 * ================================================================ */

/* ---------- a ratio that changes ---------- */

interface ChangeParams {
  a: number;
  b: number;
  unit: number;
  add: number;
}

function newRatio({ a, b, unit, add }: ChangeParams): [number, number] {
  const x = a * unit + add;
  const y = b * unit + add;
  const g = gcd(x, y);
  return [x / g, y / g];
}

const cmRatioChange: Generator<ChangeParams> = {
  id: 'cm-ratio-change',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, 7);
      const b = rng.int(1, a - 1);
      if (gcd(a, b) !== 1) continue;
      const unit = rng.int(2, difficulty >= 2 ? 15 : 8);
      const add = rng.int(1, 20);
      const [c, d] = newRatio({ a, b, unit, add });
      if (c > 12 || d > 12 || (c === a && d === b)) continue;
      return { a, b, unit, add };
    }
  },
  render(p) {
    const [c, d] = newRatio(p);
    return typed(
      [
        say(`A jar holds red and blue counters in the ratio $${p.a} : ${p.b}$.`),
        say(`After ${p.add} more of each colour are added, the ratio is $${c} : ${d}$. How many red counters were there at first?`),
      ],
      p.a * p.unit,
      '\\text{red} =',
    );
  },
  choices(p) {
    const red = p.a * p.unit;
    return numberOptions(red, [red + p.add, p.b * p.unit, p.unit, red * 2], 1, 1);
  },
  solution(p) {
    const [c, d] = newRatio(p);
    const k = p.a * d - p.b * c;
    return [
      { text: `Say there were $${p.a}k$ red and $${p.b === 1 ? '' : p.b}k$ blue. After adding ${p.add} of each:` },
      { tex: `\\frac{${p.a}k + ${p.add}}{${p.b}k + ${p.add}} = \\frac{${c}}{${d}}` },
      { text: 'Cross-multiply:' },
      { tex: `${d}(${p.a}k + ${p.add}) = ${c}(${p.b}k + ${p.add})` },
      { tex: `${p.a * d}k + ${d * p.add} = ${p.b * c}k + ${c * p.add}` },
      ...(k === 1 ? [] : [{ tex: `${k}k = ${(c - d) * p.add}` }]),
      { tex: `k = ${p.unit}, \\quad \\text{red} = ${p.a} \\times ${p.unit} = ${p.a * p.unit}` },
    ];
  },
};

/* ---------- ages ---------- */

interface AgeParams {
  child: number;
  now: number;
  years: number;
}

function laterTimes({ child, now, years }: AgeParams): number {
  return (child * now + years) / (child + years);
}

const cmAgeRatio: Generator<AgeParams> = {
  id: 'cm-age-ratio',
  sample(rng, difficulty) {
    for (;;) {
      const child = rng.int(3, difficulty >= 2 ? 20 : 12);
      const now = rng.int(3, 8);
      const years = rng.int(2, 30);
      const later = laterTimes({ child, now, years });
      if (!Number.isInteger(later) || later < 2 || later === now) continue;
      if (child * now > 70) continue;
      return { child, now, years };
    }
  },
  render(p) {
    return typed(
      [say(`Mo is ${p.now} times as old as her son. In ${p.years} years she will be ${laterTimes(p)} times as old as him.`), say('How old is Mo now?')],
      p.child * p.now,
      '\\text{Mo} =',
    );
  },
  choices(p) {
    const mo = p.child * p.now;
    return numberOptions(mo, [p.child, mo + p.years, p.child + p.years, p.now * (p.child + p.years)], 1, 1);
  },
  solution(p) {
    const later = laterTimes(p);
    return [
      { text: `Call the son’s age $s$, so Mo is $${p.now}s$. In ${p.years} years:` },
      { tex: `${p.now}s + ${p.years} = ${later}(s + ${p.years})` },
      { tex: `${p.now}s + ${p.years} = ${later}s + ${later * p.years}` },
      ...(p.now - later === 1 ? [] : [{ tex: `${p.now - later}s = ${later * p.years - p.years}` }]),
      { tex: `s = ${p.child}` },
      { tex: `\\text{Mo} = ${p.now} \\times ${p.child} = ${p.now * p.child}` },
    ];
  },
};

/* ---------- a ratio inside an expression ---------- */

interface ExprRatioParams {
  p: number;
  q: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

function exprValue({ p, q, a, b, c, d }: ExprRatioParams): [number, number] {
  return [a * p + b * q, c * p + d * q];
}

const cmRatioExpression: Generator<ExprRatioParams> = {
  id: 'cm-ratio-expression',
  sample(rng) {
    for (;;) {
      const p = rng.int(1, 9);
      const q = rng.int(1, 9);
      if (gcd(p, q) !== 1 || p === q) continue;
      const params = { p, q, a: rng.int(1, 5), b: rng.int(1, 5), c: rng.int(1, 5), d: rng.int(-4, 5) };
      const [top, bottom] = exprValue(params);
      // a : b equal to c : d makes the value the same for every ratio.
      if (bottom === 0 || params.d === 0 || top === bottom || params.a * params.d === params.b * params.c) continue;
      return params;
    }
  },
  render(r) {
    const [top, bottom] = exprValue(r);
    const lin = (m: number, n: number) => `${m === 1 ? '' : m}x ${n < 0 ? '-' : '+'} ${Math.abs(n) === 1 ? '' : Math.abs(n)}y`;
    return typed(
      [say(`$x$ and $y$ are in the ratio $${r.p} : ${r.q}$.`), say('Find the value of'), show(`\\frac{${lin(r.a, r.b)}}{${lin(r.c, r.d)}}`)],
      fracAnswer(top, bottom),
      '\\text{value} =',
      FRACTION_KEYS,
    );
  },
  choices(r) {
    const [top, bottom] = exprValue(r);
    const right = fracTex(top, bottom);
    const [t2, b2] = exprValue({ ...r, p: r.q, q: r.p });
    const slips: [number, number][] = [[t2, b2], [bottom, top], [r.a + r.b, r.c + r.d], [r.a, r.c], [r.b, r.d], [top + bottom, bottom]];
    const seen = new Set([right]);
    const wrong = slips
      .filter(([, b]) => b !== 0)
      .map(([a, b]) => ({ tex: fracTex(a, b), answer: fracAnswer(a, b) }))
      .filter((o) => !seen.has(o.tex) && (seen.add(o.tex), true));
    return options({ tex: right, answer: fracAnswer(top, bottom) }, ...wrong.slice(0, 3));
  },
  solution(r) {
    const [top, bottom] = exprValue(r);
    return [
      { text: `Only the ratio matters, so take $x = ${r.p}$ and $y = ${r.q}$:` },
      { tex: `${r.a} \\times ${r.p} + ${bracket(r.b)} \\times ${r.q} = ${top}` },
      { tex: `${r.c} \\times ${r.p} + ${bracket(r.d)} \\times ${r.q} = ${bottom}` },
      { tex: `\\frac{${top}}{${bottom}} = ${fracTex(top, bottom)}` },
    ];
  },
};

/* ---------- working together ---------- */

interface TogetherParams {
  a: number;
  b: number;
}

const cmWorkTogether: Generator<TogetherParams> = {
  id: 'cm-work-together',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, difficulty >= 2 ? 30 : 40);
      const b = rng.int(a + 1, difficulty >= 2 ? 60 : 120);
      if (difficulty < 2 && (a * b) % (a + b) !== 0) continue;
      return { a, b };
    }
  },
  render({ a, b }) {
    return typed(
      [say(`One tap fills a bath in ${a} minutes, and another fills it in ${b} minutes.`), say('How many minutes do they take together? Give an exact answer.')],
      fracAnswer(a * b, a + b),
      '\\text{minutes} =',
      FRACTION_KEYS,
    );
  },
  choices({ a, b }) {
    const right = fracTex(a * b, a + b);
    const slips: [number, number][] = [[a + b, 2], [a + b, 1], [a * b, a + b + 1]];
    const seen = new Set([right]);
    const wrong = slips
      .map(([x, y]) => ({ tex: fracTex(x, y), answer: fracAnswer(x, y) }))
      .filter((o) => !seen.has(o.tex) && (seen.add(o.tex), true));
    return options({ tex: right, answer: fracAnswer(a * b, a + b) }, ...wrong);
  },
  solution({ a, b }) {
    return [
      { text: 'Add the rates, not the times. Each minute the taps fill' },
      { tex: `\\frac{1}{${a}} + \\frac{1}{${b}} = \\frac{${a + b}}{${a * b}}` },
      { text: 'of the bath, so the whole bath takes the reciprocal:' },
      { tex: `\\frac{${a * b}}{${a + b}}${gcd(a * b, a + b) === 1 ? '' : ` = ${fracTex(a * b, a + b)}`}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: Non-numeric Geometric Ratios
 * ================================================================ */

/* ---------- scaling lengths, areas, volumes ---------- */

interface ScaleParams {
  p: number;
  q: number;
  given: number;
  kind: 'area' | 'volume';
}

const scaled = ({ p, q, given, kind }: ScaleParams) => (given * (kind === 'area' ? q * q : q * q * q)) / (kind === 'area' ? p * p : p * p * p);

const SOLIDS = ['cones', 'cylinders', 'prisms', 'pyramids'];

const cmScaleFactor: Generator<ScaleParams> = {
  id: 'cm-scale-factor',
  sample(rng, difficulty) {
    for (;;) {
      const p = rng.int(1, 5);
      const q = rng.int(p + 1, 7);
      if (gcd(p, q) !== 1) continue;
      const kind = difficulty >= 2 ? 'volume' : 'area';
      const power = kind === 'area' ? p * p : p ** 3;
      const given = power * rng.int(1, 12);
      return { p, q, given, kind };
    }
  },
  render(s) {
    const shapes = s.kind === 'area' ? 'triangles' : SOLIDS[(s.given + s.p) % SOLIDS.length];
    return typed(
      [
        say(`Two similar ${shapes} have lengths in the ratio $${s.p} : ${s.q}$.`),
        say(`The smaller one has ${s.kind === 'area' ? 'an area' : 'a volume'} of ${s.given}. What is the ${s.kind} of the larger one?`),
      ],
      scaled(s),
      `\\text{${s.kind}} =`,
    );
  },
  choices(s) {
    const answer = scaled(s);
    return numberOptions(answer, [(s.given * s.q) / s.p, (s.given * s.q * s.q) / (s.p * s.p), (s.given * s.q ** 3) / s.p ** 3, answer * 2], 1, 1);
  },
  solution(s) {
    const n = s.kind === 'area' ? 2 : 3;
    return [
      { text: `Lengths scale by $\\tfrac{${s.q}}{${s.p}}$, so ${s.kind === 'area' ? 'areas, made of two lengths,' : 'volumes, made of three lengths,'} scale by its ${s.kind === 'area' ? 'square' : 'cube'}:` },
      { tex: `\\left(\\tfrac{${s.q}}{${s.p}}\\right)^${n} = ${fracTex(s.q ** n, s.p ** n)}` },
      { tex: `${s.given} \\times ${fracTex(s.q ** n, s.p ** n)} = ${num(scaled(s))}` },
    ];
  },
};

/* ---------- the length, area and volume ratios, as tiles ---------- */

interface TripleParams {
  p: number;
  q: number;
}

const cmScaleTiles: Generator<TripleParams> = {
  id: 'cm-scale-tiles',
  sample(rng) {
    for (;;) {
      const p = rng.int(1, 6);
      const q = rng.int(2, 9);
      if (gcd(p, q) !== 1 || p === q) continue;
      return { p, q };
    }
  },
  render({ p, q }) {
    return {
      kind: 'tiles',
      prompt: [say(`Two similar solids have surface areas in the ratio $${p * p} : ${q * q}$.`), say('Fill in the ratio of their lengths and of their volumes.')],
      template: `\\text{lengths } {0} : {1}, \\quad \\text{volumes } {2} : {3}`,
      bank: numberBank([p, q, p ** 3, q ** 3], [p * p, q * q, 2 * p, 3 * q], 3),
      answer: [num(p), num(q), num(p ** 3), num(q ** 3)],
    };
  },
  solution({ p, q }) {
    return [
      { text: 'Areas are lengths squared, so the lengths are the square roots:' },
      { tex: `\\sqrt{${p * p}} : \\sqrt{${q * q}} = ${p} : ${q}` },
      { text: 'Volumes are lengths cubed:' },
      { tex: `${p}^3 : ${q}^3 = ${p ** 3} : ${q ** 3}` },
    ];
  },
};

/* ---------- a triangle in a rectangle ---------- */

interface HalfParams {
  area: number;
  shape: 'rectangle' | 'parallelogram';
}

const cmHalfRectangle: Generator<HalfParams> = {
  id: 'cm-half-rectangle',
  sample(rng, difficulty) {
    return { area: 2 * rng.int(10, 150), shape: difficulty >= 2 ? 'parallelogram' : 'rectangle' };
  },
  render({ area, shape }) {
    return typed(
      [
        say(`A ${shape} has an area of ${area}. A point is marked anywhere on its top side and joined to the two bottom corners.`),
        say('What is the area of the triangle this makes?'),
      ],
      area / 2,
      '\\text{area} =',
    );
  },
  choices({ area }) {
    return numberOptions(area / 2, [area / 4, area / 3, area], 1, 1);
  },
  solution({ area, shape }) {
    return [
      { text: `The triangle’s base is the ${shape}’s bottom side, and its height is the ${shape}’s height, wherever the point is.` },
      { tex: `\\text{triangle} = \\tfrac{1}{2} \\times \\text{base} \\times \\text{height}` },
      { text: `That is half the ${shape}:` },
      { tex: `\\tfrac{1}{2} \\times ${area} = ${area / 2}` },
    ];
  },
};

/* ---------- joining midpoints ---------- */

interface MidParams {
  times: number;
  area: number;
}

const cmMidpointTriangles: Generator<MidParams> = {
  id: 'cm-midpoint-triangles',
  sample(rng, difficulty) {
    const times = rng.int(1, difficulty >= 2 ? 4 : 2);
    return { times, area: 4 ** times * rng.int(1, 30) };
  },
  render({ times, area }) {
    const how = times === 2 ? 'twice' : `${times} times`;
    return typed(
      [
        say(`A triangle has an area of ${area}. Joining the midpoints of its sides makes a smaller triangle inside it.`),
        say(times === 1 ? 'What is the area of the smaller triangle?' : `This is done ${how}, each time inside the newest triangle. What is the area of the smallest triangle?`),
      ],
      area / 4 ** times,
      '\\text{area} =',
    );
  },
  choices({ times, area }) {
    return numberOptions(area / 4 ** times, [area / 2 ** times, area / 4 ** (times + 1), area / 3 ** times], 1, 1);
  },
  solution({ times, area }) {
    return [
      { text: 'The midpoint triangle has sides half as long, so its area is a quarter:' },
      { tex: `\\left(\\tfrac{1}{2}\\right)^2 = \\tfrac{1}{4}` },
      { text: times === 1 ? 'So:' : `Done ${times} times:` },
      { tex: `${area} \\times \\left(\\tfrac{1}{4}\\right)^{${times}} = ${area / 4 ** times}` },
    ];
  },
};

/* ---------- a square in a circle in a square ---------- */

interface NestParams {
  outer: number;
  depth: number;
}

const cmNestedSquares: Generator<NestParams> = {
  id: 'cm-nested-squares',
  sample(rng, difficulty) {
    const depth = difficulty >= 2 ? rng.int(2, 3) : 1;
    return { depth, outer: 2 ** depth * rng.int(3, 40) };
  },
  render({ outer, depth }) {
    const chain = depth === 1 ? 'a circle is drawn touching all four sides, and a square is drawn inside the circle with its corners on it' : `a circle is drawn touching all four sides and a square inside that circle, corners on it. This is repeated ${depth === 2 ? 'once more' : 'twice more'}, inside the newest square`;
    return typed([say(`A square has an area of ${outer}. Inside it ${chain}.`), say('What is the area of the smallest square?')], outer / 2 ** depth, '\\text{area} =');
  },
  choices({ outer, depth }) {
    return numberOptions(outer / 2 ** depth, [outer / 4 ** depth, outer / 2 ** (depth + 1), outer / 2 ** (depth - 1)], 1, 1);
  },
  solution({ outer, depth }) {
    return [
      { text: 'Turn the inner square 45° in your head. Its corners touch the outer square’s sides, and its diagonals cut the outer square into 8 triangles, 4 of them its own.' },
      { text: 'So each inner square is half the square around it:' },
      { tex: `${outer} \\times \\left(\\tfrac{1}{2}\\right)^{${depth}} = ${outer / 2 ** depth}` },
    ];
  },
};

export const contestEquationsRatiosGenerators = [
  cmPercentChain,
  cmPercentSwap,
  cmRatioShare,
  cmRatioCombine,
  cmReversePercent,
  cmBracketsEquation,
  cmThreeScores,
  cmThreeScoresTiles,
  cmHalfwaySpeeds,
  cmMixture,
  cmArithTerm,
  cmArithSum,
  cmSequenceTable,
  cmOddSums,
  cmGeoPast,
  cmRatioChange,
  cmAgeRatio,
  cmRatioExpression,
  cmWorkTogether,
  cmScaleFactor,
  cmScaleTiles,
  cmHalfRectangle,
  cmMidpointTriangles,
  cmNestedSquares,
];
