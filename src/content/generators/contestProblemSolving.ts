/**
 * Contest Math, level 1: Mathematical Problem-Solving.
 *
 * Five lessons, one per strand a contest draws on — algebra, geometry,
 * counting, number theory, and a last lesson of tricks that need a new idea
 * rather than more working. Each generator is a question that looks longer
 * than it is: the jar puzzle is one subtraction once you see that the
 * difference is the honey, three pair-sums are one addition once you add all
 * three lines, and a gcd of a sum and a factorial is a factorisation once the
 * sum is written as n(n + 1)/2.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { choiceSlide } from './numberProof';
import {
  FRACTION_KEYS,
  factorTex,
  factorise,
  fracAnswer,
  fracTex,
  gcd,
  lcm,
  num,
  numberBank,
  numberOptions,
  say,
  show,
  typed,
} from './contestMath';
import { options } from '../choiceVariant';

/* ================================================================
 * Lesson 1: Algebra
 * ================================================================ */

/* ---------- the jar: full, part-full, empty ---------- */

const CONTAINERS = [
  { thing: 'jar of honey', stuff: 'honey', unit: 'grams', scale: 10 },
  { thing: 'bottle of water', stuff: 'water', unit: 'grams', scale: 10 },
  { thing: 'tin of paint', stuff: 'paint', unit: 'grams', scale: 10 },
  { thing: 'box of cereal', stuff: 'cereal', unit: 'grams', scale: 5 },
];

const PARTS: Record<number, string> = { 2: 'half', 3: 'a third', 4: 'a quarter' };

interface JarParams {
  context: number;
  jar: number;
  contents: number;
  /** 1/k of the contents is left in the part-full container. */
  k: number;
}

const full = (p: JarParams) => p.jar + p.contents;
const part = (p: JarParams) => p.jar + p.contents / p.k;

const cmJar: Generator<JarParams> = {
  id: 'cm-jar',
  sample(rng, difficulty) {
    const context = rng.int(0, CONTAINERS.length - 1);
    const { scale } = CONTAINERS[context];
    const k = difficulty >= 2 ? rng.pick([3, 4]) : 2;
    const jar = scale * rng.int(5, 30);
    const contents = k * scale * rng.int(4, 30);
    return { context, jar, contents, k };
  },
  render(p) {
    const c = CONTAINERS[p.context];
    return typed(
      [
        say(`A full ${c.thing} weighs ${full(p)} ${c.unit}. With only ${PARTS[p.k]} of the ${c.stuff} left in it, it weighs ${part(p)} ${c.unit}.`),
        say(`How many ${c.unit} does the empty ${c.thing.split(' of ')[0]} weigh?`),
      ],
      p.jar,
      '\\text{mass} =',
    );
  },
  choices(p) {
    const gone = full(p) - part(p);
    return numberOptions(p.jar, [gone, part(p) - gone / p.k, full(p) - gone, Math.round(part(p) / 2)], 5, 1);
  },
  solution(p) {
    const c = CONTAINERS[p.context];
    const gone = full(p) - part(p);
    const used = p.k === 2 ? 'half' : p.k === 3 ? 'two thirds' : 'three quarters';
    return [
      { text: `The ${c.thing.split(' of ')[0]} is in both weighings, so the difference is the ${c.stuff} that went:` },
      { tex: `${full(p)} - ${part(p)} = ${gone}` },
      { text: `That is ${used} of the ${c.stuff}, so all of it weighs` },
      { tex: p.k === 2 ? `2 \\times ${gone} = ${p.contents}` : `${gone} \\div ${p.k - 1} \\times ${p.k} = ${p.contents}` },
      { text: `Take the ${c.stuff} away from the full weight:` },
      { tex: `${full(p)} - ${p.contents} = ${p.jar}` },
    ];
  },
};

/* ---------- three pair-sums ---------- */

const MENUS = [
  { place: 'At a café', items: ['a pizza', 'a doughnut', 'a slice of cake'], letters: ['p', 'd', 'c'] },
  { place: 'At a stationer’s', items: ['a pen', 'a ruler', 'a notebook'], letters: ['p', 'r', 'n'] },
  { place: 'At a market stall', items: ['a melon', 'a pineapple', 'a bag of grapes'], letters: ['m', 'p', 'g'] },
  { place: 'At a cinema', items: ['a ticket', 'a drink', 'a box of popcorn'], letters: ['t', 'd', 'p'] },
];

interface PairParams {
  menu: number;
  /** Prices in pence, multiples of 50. */
  prices: [number, number, number];
  /** Which single price is asked at difficulty 2, or -1 for the total. */
  ask: number;
}

const pairSums = ({ prices: [a, b, c] }: PairParams): [number, number, number] => [a + b, a + c, b + c];

const cmPairSums: Generator<PairParams> = {
  id: 'cm-pair-sums',
  sample(rng, difficulty) {
    const menu = rng.int(0, MENUS.length - 1);
    const prices: [number, number, number] = [50 * rng.int(4, 30), 50 * rng.int(1, 12), 50 * rng.int(1, 12)];
    return { menu, prices, ask: difficulty >= 2 ? rng.int(0, 2) : -1 };
  },
  render(p) {
    const m = MENUS[p.menu];
    const [s1, s2, s3] = pairSums(p).map((v) => v / 100);
    const [x, y, z] = m.letters;
    const total = p.prices.reduce((t, v) => t + v, 0) / 100;
    const question =
      p.ask < 0
        ? `How many pounds do ${m.items[0]}, ${m.items[1]} and ${m.items[2]} cost together?`
        : `How many pounds does ${m.items[p.ask]} cost?`;
    return typed(
      [
        say(`${m.place}, $${x}$, $${y}$ and $${z}$ are the prices of ${m.items[0]}, ${m.items[1]} and ${m.items[2]}, in pounds.`),
        show(`\\begin{aligned} ${x} + ${y} &= ${num(s1)} \\\\ ${x} + ${z} &= ${num(s2)} \\\\ ${y} + ${z} &= ${num(s3)} \\end{aligned}`),
        say(question),
      ],
      p.ask < 0 ? total : p.prices[p.ask] / 100,
      '\\text{cost} =',
    );
  },
  choices(p) {
    const sums = pairSums(p).map((v) => v / 100);
    const total = p.prices.reduce((t, v) => t + v, 0) / 100;
    if (p.ask < 0) return numberOptions(total, [2 * total, sums[0] + sums[1], total + 1, total - 1], 0.5, 0.5);
    const own = p.prices[p.ask] / 100;
    return numberOptions(own, [sums[2 - p.ask], total - own, total, own + 1], 0.5, 0.5);
  },
  solution(p) {
    const m = MENUS[p.menu];
    const [x, y, z] = m.letters;
    const sums = pairSums(p).map((v) => v / 100);
    const total = p.prices.reduce((t, v) => t + v, 0) / 100;
    const steps: SolutionStep[] = [
      { text: 'Add all three lines. Each price appears in exactly two of them:' },
      { tex: `2(${x} + ${y} + ${z}) = ${num(sums[0])} + ${num(sums[1])} + ${num(sums[2])}` },
      { tex: `2(${x} + ${y} + ${z}) = ${num(2 * total)}` },
      { tex: `${x} + ${y} + ${z} = ${num(total)}` },
    ];
    if (p.ask >= 0) {
      const other = [0, 1, 2].filter((i) => i !== p.ask);
      const pairSum = (p.prices[other[0]] + p.prices[other[1]]) / 100;
      steps.push(
        { text: `The line without $${m.letters[p.ask]}$ gives the other two together, so take it away:` },
        { tex: `${m.letters[p.ask]} = ${num(total)} - ${num(pairSum)} = ${num(p.prices[p.ask] / 100)}` },
      );
    }
    return steps;
  },
};

/* ---------- pair-sums, the working as tiles ---------- */

const TRIOS = [
  ['Ana', 'Ben', 'Cal'],
  ['Dev', 'Eve', 'Finn'],
  ['Gus', 'Hana', 'Ivo'],
  ['Jo', 'Kit', 'Lev'],
];

interface AgesParams {
  trio: number;
  ages: [number, number, number];
}

const cmPairSumsTiles: Generator<AgesParams> = {
  id: 'cm-pair-sums-tiles',
  sample(rng, difficulty) {
    const hi = difficulty >= 2 ? 60 : 20;
    return { trio: rng.int(0, TRIOS.length - 1), ages: [rng.int(5, hi), rng.int(5, hi), rng.int(5, hi)] };
  },
  render({ trio, ages: [a, b, c] }) {
    const [x, y, z] = TRIOS[trio];
    const total = a + b + c;
    const sum = 2 * total;
    return {
      kind: 'tiles',
      prompt: [
        say(`${x} and ${y} are ${a + b} years old in total, ${x} and ${z} are ${a + c}, and ${y} and ${z} are ${b + c}.`),
        say(`Add the three totals, then find how old ${z} is.`),
      ],
      template: `\\text{sum} = {0}, \\quad \\text{all three} = {1}, \\quad \\text{${z}} = {2}`,
      bank: numberBank([sum, total, c], [total + a + b, total - c, a + b, sum - (a + b)], 3),
      answer: [num(sum), num(total), num(c)],
    };
  },
  solution({ trio, ages: [a, b, c] }) {
    const [x, y, z] = TRIOS[trio];
    const total = a + b + c;
    return [
      { text: 'Each person is in two of the three totals, so their sum counts everyone twice:' },
      { tex: `${a + b} + ${a + c} + ${b + c} = ${2 * total}` },
      { tex: `\\text{all three} = ${2 * total} \\div 2 = ${total}` },
      { text: `${x} and ${y} together are ${a + b}, so ${z} is what is left:` },
      { tex: `${total} - ${a + b} = ${c}` },
    ];
  },
};

/* ---------- workers and rates ---------- */

const CREWS = [
  { who: 'cooks', make: 'bake', things: 'pies', one: 'pie' },
  { who: 'painters', make: 'paint', things: 'fences', one: 'fence' },
  { who: 'machines', make: 'print', things: 'posters', one: 'poster' },
  { who: 'gardeners', make: 'plant', things: 'hedges', one: 'hedge' },
];

interface RateParams {
  crew: number;
  /** Worker-hours per item. */
  m: number;
  w: number;
  n: number;
  W: number;
  N: number;
}

const hoursFor = (m: number, workers: number, items: number) => (m * items) / workers;

const cmWorkRate: Generator<RateParams> = {
  id: 'cm-work-rate',
  sample(rng, difficulty) {
    const crew = rng.int(0, CREWS.length - 1);
    for (;;) {
      const m = rng.int(1, difficulty >= 2 ? 6 : 3);
      const w = rng.int(2, 9);
      const n = rng.int(2, 9);
      const W = rng.int(2, 12);
      const N = rng.int(2, difficulty >= 2 ? 24 : 12);
      const t = hoursFor(m, w, n);
      const T = hoursFor(m, W, N);
      if (!Number.isInteger(t) || !Number.isInteger(T)) continue;
      if (W === w && N === n) continue;
      // The trap answers must be wrong, or the question has no trap.
      if (T === t || T === (t * N) / n) continue;
      return { crew, m, w, n, W, N };
    }
  },
  render(p) {
    const c = CREWS[p.crew];
    const t = hoursFor(p.m, p.w, p.n);
    return typed(
      [
        say(`${p.w} ${c.who} ${c.make} ${p.n} ${c.things} in ${t} hours.`),
        say(`Working at the same rate, how many hours do ${p.W} ${c.who} take to ${c.make} ${p.N} ${c.things}?`),
      ],
      hoursFor(p.m, p.W, p.N),
      '\\text{hours} =',
    );
  },
  choices(p) {
    const t = hoursFor(p.m, p.w, p.n);
    const T = hoursFor(p.m, p.W, p.N);
    return numberOptions(T, [t, (t * p.N) / p.n, (t * p.W) / p.w, (t * p.N * p.W) / (p.n * p.w)], 1, 1);
  },
  solution(p) {
    const c = CREWS[p.crew];
    const t = hoursFor(p.m, p.w, p.n);
    return [
      { text: `Count the work in ${c.who.replace(/s$/, '')}-hours. The first job took` },
      { tex: `${p.w} \\times ${t} = ${p.w * t}` },
      { text: `for ${p.n} ${c.things}, so one ${c.one} takes` },
      { tex: `${p.w * t} \\div ${p.n} = ${p.m}` },
      { text: `${p.N} ${c.things} take $${p.N} \\times ${p.m} = ${p.N * p.m}$ of them, shared between ${p.W}:` },
      { tex: `${p.N * p.m} \\div ${p.W} = ${hoursFor(p.m, p.W, p.N)}` },
    ];
  },
};

/* ---------- fractions a hair under 1 ---------- */

interface CloseParams {
  base: number;
  /** Fraction i is (N - i)/N with N = i * base + offsets[i - 1]. */
  offsets: [number, number, number];
}

const closeFraction = (p: CloseParams, i: number) => {
  const bottom = i * p.base + p.offsets[i - 1];
  return { top: bottom - i, bottom };
};

/** The gap to 1 is i/N; flipped it is base + offset/i, and the biggest flip wins. */
const flipped = (p: CloseParams, i: number) => p.base + p.offsets[i - 1] / i;

const cmCloseFractions: Generator<CloseParams> = {
  id: 'cm-close-fractions',
  sample(rng, difficulty) {
    const base = difficulty >= 2 ? rng.int(1000, 9999) : rng.pick([11, 111, 1111, 101, 1001, 99, 999]) * rng.int(1, 9);
    for (;;) {
      const offsets: [number, number, number] = [0, rng.int(0, 2), rng.int(0, 3)];
      const flips = [1, 2, 3].map((i) => flipped({ base, offsets }, i));
      if (new Set(flips).size < 3) continue;
      return { base, offsets };
    }
  },
  render(p) {
    const labels = [1, 2, 3].map((i) => {
      const { top, bottom } = closeFraction(p, i);
      return `\\dfrac{${top}}{${bottom}}`;
    });
    const best = [1, 2, 3].reduce((b, i) => (flipped(p, i) > flipped(p, b) ? i : b), 1);
    return choiceSlide([say('Which fraction is the largest?')], labels[best - 1], [
      ...labels.filter((_, i) => i !== best - 1),
      '\\text{They are all equal}',
    ]);
  },
  solution(p) {
    const best = [1, 2, 3].reduce((b, i) => (flipped(p, i) > flipped(p, b) ? i : b), 1);
    const steps: SolutionStep[] = [{ text: 'Each fraction is $1$ minus a small piece:' }];
    for (const i of [1, 2, 3]) {
      const { top, bottom } = closeFraction(p, i);
      steps.push({ tex: `\\frac{${top}}{${bottom}} = 1 - \\frac{${i}}{${bottom}}` });
    }
    steps.push({ text: 'The largest fraction takes away the smallest piece. Turn each piece upside down; the smallest piece gives the biggest result:' });
    for (const i of [1, 2, 3]) {
      const { bottom } = closeFraction(p, i);
      const rest = p.offsets[i - 1];
      const mixed = rest === 0 ? `${p.base}` : `${p.base}\\tfrac{${rest / gcd(rest, i)}}{${i / gcd(rest, i)}}`;
      steps.push({ tex: `\\frac{${bottom}}{${i}} = ${mixed}` });
    }
    const { top, bottom } = closeFraction(p, best);
    steps.push({ text: `So $\\frac{${top}}{${bottom}}$ is the largest.` });
    return steps;
  },
};

/* ================================================================
 * Lesson 2: Geometry
 * ================================================================ */

/* ---------- regular polygons ---------- */

const SIDES = [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90];

interface PolygonParams {
  n: number;
  given: 'interior' | 'sides' | 'ratio';
}

const interior = (n: number) => 180 - 360 / n;

const cmPolygonSides: Generator<PolygonParams> = {
  id: 'cm-polygon-sides',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      // The interior angle a whole or half multiple of the exterior one.
      const given = rng.pick(['interior', 'sides', 'ratio'] as const);
      const n = rng.pick(given === 'ratio' ? [5, 6, 8, 9, 10, 12, 15, 18, 20, 24] : SIDES.slice(6));
      return { n, given };
    }
    return { n: rng.pick(SIDES.slice(0, 15)), given: rng.pick(['interior', 'sides'] as const) };
  },
  render({ n, given }) {
    if (given === 'sides') {
      return typed([say(`A regular polygon has ${n} sides. How many degrees is each interior angle?`)], interior(n), '\\text{angle} =');
    }
    if (given === 'ratio') {
      const k = (n - 2) / 2;
      return typed(
        [say(`Each interior angle of a regular polygon is ${num(k)} times each exterior angle. How many sides does it have?`)],
        n,
        '\\text{sides} =',
      );
    }
    return typed([say(`Each interior angle of a regular polygon is $${interior(n)}^\\circ$. How many sides does it have?`)], n, '\\text{sides} =');
  },
  choices({ n, given }) {
    if (given === 'sides') return numberOptions(interior(n), [360 / n, 180 * (n - 2), 180 - 180 / n], 2, 1);
    const k = (n - 2) / 2;
    return numberOptions(n, given === 'ratio' ? [n - 2, n + 2, 2 * k] : [n - 1, n + 1, n * 2], 1, 3);
  },
  solution({ n, given }) {
    const ext = 360 / n;
    if (given === 'sides') {
      return [
        { text: 'The exterior angles of any polygon add to $360^\\circ$, and here all of them are equal:' },
        { tex: `360 \\div ${n} = ${ext}` },
        { text: 'Interior and exterior angles make a straight line:' },
        { tex: `180 - ${ext} = ${interior(n)}` },
      ];
    }
    if (given === 'ratio') {
      const k = (n - 2) / 2;
      return [
        { text: 'Interior and exterior angles make a straight line, so together they are $1 + ' + num(k) + '$ exterior angles:' },
        { tex: `${num(k + 1)} \\times \\text{exterior} = 180` },
        { tex: `\\text{exterior} = ${num(ext)}^\\circ` },
        { text: 'The exterior angles add to $360^\\circ$:' },
        { tex: `360 \\div ${num(ext)} = ${n}` },
      ];
    }
    return [
      { text: 'Interior and exterior angles make a straight line:' },
      { tex: `180 - ${interior(n)} = ${ext}` },
      { text: 'The exterior angles add to $360^\\circ$, so there are' },
      { tex: `360 \\div ${ext} = ${n}` },
    ];
  },
};

/* ---------- angles in a ratio ---------- */

interface RatioParams {
  parts: number[];
  /** Which angle is asked: the largest, the smallest, or the difference between them. */
  ask: 'largest' | 'smallest' | 'difference';
}

const RATIO_ASK = { largest: 'the largest angle', smallest: 'the smallest angle', difference: 'the difference between the largest and smallest angles' };

function sampleRatio(rng: Rng, count: number, total: number): number[] {
  for (;;) {
    const parts = Array.from({ length: count }, () => rng.int(1, 9));
    const sum = parts.reduce((t, v) => t + v, 0);
    if (total % sum !== 0) continue;
    if (new Set(parts).size < count) continue;
    if (parts.reduce((g, v) => gcd(g, v), 0) !== 1) continue;
    return parts;
  }
}

function ratioAnswer(parts: number[], total: number, ask: RatioParams['ask']): number {
  const one = total / parts.reduce((t, v) => t + v, 0);
  const hi = Math.max(...parts) * one;
  const lo = Math.min(...parts) * one;
  return ask === 'largest' ? hi : ask === 'smallest' ? lo : hi - lo;
}

const cmAngleRatio: Generator<RatioParams> = {
  id: 'cm-angle-ratio',
  sample(rng, difficulty) {
    return {
      parts: sampleRatio(rng, 3, 180),
      ask: difficulty >= 2 ? rng.pick(['smallest', 'difference'] as const) : 'largest',
    };
  },
  render({ parts, ask }) {
    return typed(
      [say(`The angles of a triangle are in the ratio $${parts.join(' : ')}$. How many degrees is ${RATIO_ASK[ask]}?`)],
      ratioAnswer(parts, 180, ask),
      '\\text{angle} =',
    );
  },
  choices({ parts, ask }) {
    const sum = parts.reduce((t, v) => t + v, 0);
    const one = 180 / sum;
    const answer = ratioAnswer(parts, 180, ask);
    return numberOptions(answer, [Math.max(...parts) * 20, ratioAnswer(parts, 360, ask), one, answer + one], 5, 1);
  },
  solution({ parts, ask }) {
    const sum = parts.reduce((t, v) => t + v, 0);
    const one = 180 / sum;
    const hi = Math.max(...parts);
    const lo = Math.min(...parts);
    const steps: SolutionStep[] = [
      { text: 'The angles of a triangle add to $180^\\circ$. Count the parts:' },
      { tex: `${parts.join(' + ')} = ${sum}` },
      { tex: `\\text{one part} = 180 \\div ${sum} = ${one}^\\circ` },
    ];
    if (ask === 'largest') steps.push({ tex: `${hi} \\times ${one} = ${hi * one}` });
    if (ask === 'smallest') steps.push({ tex: `${lo} \\times ${one} = ${lo * one}` });
    if (ask === 'difference') steps.push({ text: `The largest has ${hi} parts and the smallest ${lo}, so they differ by ${hi - lo} parts:` }, { tex: `${hi - lo} \\times ${one} = ${(hi - lo) * one}` });
    return steps;
  },
};

/* ---------- a quadrilateral's angles in a ratio, as tiles ---------- */

interface QuadParams {
  parts: number[];
}

const cmAngleRatioTiles: Generator<QuadParams> = {
  id: 'cm-angle-ratio-tiles',
  sample(rng) {
    return { parts: sampleRatio(rng, 4, 360) };
  },
  render({ parts }) {
    const sum = parts.reduce((t, v) => t + v, 0);
    const one = 360 / sum;
    const hi = Math.max(...parts) * one;
    return {
      kind: 'tiles',
      prompt: [say(`The angles of a quadrilateral are in the ratio $${parts.join(' : ')}$.`), say('Fill in the working.')],
      template: `\\text{parts} = {0}, \\quad \\text{one part} = {1}^\\circ, \\quad \\text{largest} = {2}^\\circ`,
      bank: numberBank([sum, one, hi], [180 / sum, Math.max(...parts) * (180 / sum), sum + 1, 360 - hi], 3),
      answer: [num(sum), num(one), num(hi)],
    };
  },
  solution({ parts }) {
    const sum = parts.reduce((t, v) => t + v, 0);
    const one = 360 / sum;
    const hi = Math.max(...parts);
    return [
      { text: 'The angles of a quadrilateral add to $360^\\circ$. Count the parts:' },
      { tex: `${parts.join(' + ')} = ${sum}` },
      { tex: `\\text{one part} = 360 \\div ${sum} = ${one}^\\circ` },
      { tex: `\\text{largest} = ${hi} \\times ${one} = ${hi * one}^\\circ` },
    ];
  },
};

/* ---------- clock hands ---------- */

interface ClockParams {
  h: number;
  m: number;
}

const hourHand = ({ h, m }: ClockParams) => 30 * (h % 12) + m / 2;
const minuteHand = ({ m }: ClockParams) => 6 * m;
function clockAngle(p: ClockParams): number {
  const gap = Math.abs(hourHand(p) - minuteHand(p));
  return Math.min(gap, 360 - gap);
}
const clockTime = ({ h, m }: ClockParams) => `${h}:${String(m).padStart(2, '0')}`;

const cmClockAngle: Generator<ClockParams> = {
  id: 'cm-clock-angle',
  sample(rng, difficulty) {
    for (;;) {
      const h = rng.int(1, 12);
      const m = difficulty >= 2 ? 2 * rng.int(1, 29) : 10 * rng.int(1, 5);
      const p = { h, m };
      // Hands on top of each other, or a straight line, is no question.
      if (clockAngle(p) === 0 || clockAngle(p) === 180) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [say(`How many degrees is the smaller angle between the hands of a clock at ${clockTime(p)}?`)],
      clockAngle(p),
      '\\text{angle} =',
    );
  },
  choices(p) {
    const naive = Math.abs(30 * (p.h % 12) - minuteHand(p));
    return numberOptions(clockAngle(p), [Math.min(naive, 360 - naive), 360 - clockAngle(p), clockAngle(p) + p.m / 2, Math.abs(clockAngle(p) - p.m / 2)], 5, 1);
  },
  solution(p) {
    const hr = hourHand(p);
    const mn = minuteHand(p);
    const gap = Math.abs(hr - mn);
    const steps: SolutionStep[] = [
      { text: 'Measure both hands clockwise from 12. The minute hand turns $6^\\circ$ a minute:' },
      { tex: `${p.m} \\times 6 = ${mn}` },
      { text: `The hour hand turns $30^\\circ$ an hour and keeps moving, $\\tfrac{1}{2}^\\circ$ a minute:` },
      { tex: `${p.h % 12} \\times 30 + ${p.m} \\div 2 = ${num(hr)}` },
      { tex: `${num(Math.max(hr, mn))} - ${num(Math.min(hr, mn))} = ${num(gap)}` },
    ];
    if (gap > 180) steps.push({ text: 'That is the larger angle. The smaller one is' }, { tex: `360 - ${num(gap)} = ${num(360 - gap)}` });
    return steps;
  },
};

/* ---------- the staircase perimeter ---------- */

interface StairParams {
  w: number;
  h: number;
  steps: number;
  /** Difficulty 2: a rectangular notch of this depth cut into the top edge. */
  notch: number;
}

function stairSvg({ w, h, steps, notch }: StairParams): string {
  const W = 240;
  const H = 150;
  const scale = Math.min(W / w, H / h);
  const x0 = 45;
  const y0 = 20;
  const X = (v: number) => (x0 + v * scale).toFixed(1);
  const Y = (v: number) => (y0 + (h - v) * scale).toFixed(1);
  const pts: [number, number][] = [
    [0, 0],
    [w, 0],
  ];
  if (notch > 0) {
    // A plain rectangle with a notch cut down from the middle of the top.
    const a = w / 3;
    const b = (2 * w) / 3;
    pts.push([w, h], [b, h], [b, h - notch], [a, h - notch], [a, h], [0, h]);
  } else {
    for (let i = 1; i <= steps; i += 1) {
      const x = w - (w * (i - 1)) / steps;
      const y = (h * i) / steps;
      pts.push([x, y], [x - w / steps, y]);
    }
    pts[pts.length - 1] = [0, h];
  }
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${X(x)} ${Y(y)}`).join(' ') + ' Z';
  const label = notch > 0 ? `A ${w} by ${h} rectangle with a notch ${notch} deep` : `A staircase ${w} wide and ${h} tall`;
  const parts = [
    `<svg viewBox="0 0 300 ${(h * scale + 45).toFixed(0)}" width="100%" role="img" aria-label="${label}">`,
    `<path class="plot-shade" d="${d}" />`,
    `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" />`,
    `<text x="${X(w / 2)}" y="${(y0 + h * scale + 16).toFixed(1)}" font-size="13" fill="currentColor" text-anchor="middle">${w} cm</text>`,
    `<text x="${(x0 - 6).toFixed(1)}" y="${Y(h / 2)}" font-size="13" fill="currentColor" text-anchor="end">${h} cm</text>`,
  ];
  if (notch > 0) {
    parts.push(`<text x="${X(w / 2)}" y="${Y(h - notch - 0.12 * h)}" font-size="12" fill="currentColor" text-anchor="middle" dominant-baseline="hanging">${notch} cm deep</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

const stairPerimeter = ({ w, h, notch }: StairParams) => 2 * (w + h) + 2 * notch;

const cmStaircasePerimeter: Generator<StairParams> = {
  id: 'cm-staircase-perimeter',
  sample(rng, difficulty) {
    const w = rng.int(6, 20);
    const h = rng.int(5, 14);
    if (difficulty >= 2) return { w: 3 * rng.int(3, 8), h, steps: 0, notch: rng.int(2, h - 2) };
    return { w, h, steps: rng.int(3, 5), notch: 0 };
  },
  render(p) {
    const shape = p.notch > 0 ? 'This shape is a rectangle with a notch cut out of its top edge.' : 'Every corner of this staircase is a right angle.';
    return typed(
      [say(shape), { kind: 'diagram', svg: stairSvg(p) }, say('What is its perimeter, in centimetres?')],
      stairPerimeter(p),
      '\\text{perimeter} =',
    );
  },
  choices(p) {
    return numberOptions(stairPerimeter(p), [2 * (p.w + p.h), p.w + p.h, p.w * p.h, stairPerimeter(p) + p.notch], 2, 1);
  },
  solution(p) {
    if (p.notch > 0) {
      return [
        { text: 'Push the bottom of the notch back up to the top edge. The outline becomes the rectangle:' },
        { tex: `2 \\times (${p.w} + ${p.h}) = ${2 * (p.w + p.h)}` },
        { text: `The notch adds its two sides, each ${p.notch} cm:` },
        { tex: `${2 * (p.w + p.h)} + 2 \\times ${p.notch} = ${stairPerimeter(p)}` },
      ];
    }
    return [
      { text: 'Slide every step outwards. The steps’ tops add up to the full width, and their sides to the full height.' },
      { text: 'So the perimeter is the same as the rectangle’s:' },
      { tex: `2 \\times (${p.w} + ${p.h}) = ${stairPerimeter(p)}` },
    ];
  },
};

/* ---------- a square inside a square ---------- */

interface TiltParams {
  a: number;
  b: number;
  /** Difficulty 2 gives the big square's side and one piece. */
  givenSide: boolean;
}

function tiltSvg({ a, b, givenSide }: TiltParams): string {
  const s = a + b;
  const size = 150;
  const k = size / s;
  const x0 = 75;
  const y0 = 22;
  const P = (x: number, y: number) => `${(x0 + x * k).toFixed(1)} ${(y0 + y * k).toFixed(1)}`;
  const inner = `M ${P(a, 0)} L ${P(s, a)} L ${P(b, s)} L ${P(0, b)} Z`;
  const label = (x: number, y: number, text: string, anchor = 'middle') =>
    `<text x="${(x0 + x * k).toFixed(1)}" y="${(y0 + y * k).toFixed(1)}" font-size="13" fill="currentColor" text-anchor="${anchor}">${text}</text>`;
  const parts = [
    `<svg viewBox="0 0 300 200" width="100%" role="img" aria-label="A square tilted inside a larger square">`,
    `<rect x="${x0}" y="${y0}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" />`,
    `<path class="plot-shade" d="${inner}" />`,
    `<path d="${inner}" fill="none" stroke="currentColor" stroke-width="2" />`,
    label(a / 2, -0.06 * s, givenSide ? `${a}` : `${a}`),
  ];
  if (givenSide) {
    parts.push(label(-0.08 * s, s / 2 + 0.03 * s, `${s}`, 'end'));
  } else {
    parts.push(label(a + b / 2, -0.06 * s, `${b}`));
  }
  parts.push('</svg>');
  return parts.join('');
}

const cmTiltedSquare: Generator<TiltParams> = {
  id: 'cm-tilted-square',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(1, 12);
      const b = rng.int(1, 12);
      if (a === b) continue;
      return { a, b, givenSide: difficulty >= 2 };
    }
  },
  render(p) {
    const setup = p.givenSide
      ? `A square is drawn inside a square of side ${p.a + p.b}, its corners on the sides of the big one. One corner cuts the top side ${p.a} from the left.`
      : `A square is drawn inside a larger square, its corners on the sides. Each corner cuts a side into pieces of ${p.a} and ${p.b}.`;
    return typed([say(setup), { kind: 'diagram', svg: tiltSvg(p) }, say('What is the area of the shaded square?')], p.a ** 2 + p.b ** 2, '\\text{area} =');
  },
  choices({ a, b }) {
    const area = a * a + b * b;
    return numberOptions(area, [(a + b) ** 2, (a + b) ** 2 - a * b, 2 * a * b, area + 2 * a * b], 1, 1);
  },
  solution({ a, b, givenSide }) {
    const s = a + b;
    const steps: SolutionStep[] = [];
    if (givenSide) steps.push({ text: `The four corner pieces are equal, so each side splits into $${a}$ and $${s} - ${a} = ${b}$.` });
    steps.push(
      { text: 'The big square is the shaded square plus four right triangles, each with legs $' + a + '$ and $' + b + '$:' },
      { tex: `${s}^2 = ${s * s}` },
      { tex: `4 \\times \\tfrac{1}{2} \\times ${a} \\times ${b} = ${2 * a * b}` },
      { tex: `${s * s} - ${2 * a * b} = ${a * a + b * b}` },
    );
    return steps;
  },
};

/* ================================================================
 * Lesson 3: Combinatorics
 * ================================================================ */

/* ---------- handshakes ---------- */

interface ShakeParams {
  n: number;
  /** Difficulty 2 gives the count and asks how many people. */
  reverse: boolean;
  context: number;
}

const SHAKES = [
  { people: 'people at a party', act: 'shakes hands with every other person once', count: 'handshakes', back: 'At a party, everyone shakes hands with everyone else once', who: 'people' },
  { people: 'teams in a league', act: 'plays every other team once', count: 'matches', back: 'In a league, every team plays every other team once', who: 'teams' },
];

const pairs = (n: number) => (n * (n - 1)) / 2;

const cmHandshakes: Generator<ShakeParams> = {
  id: 'cm-handshakes',
  sample(rng, difficulty) {
    return { n: rng.int(difficulty >= 2 ? 8 : 5, difficulty >= 2 ? 40 : 30), reverse: difficulty >= 2 && rng.chance(0.6), context: rng.int(0, 1) };
  },
  render({ n, reverse, context }) {
    const c = SHAKES[context];
    if (reverse) {
      return typed([say(`${c.back}. There are ${pairs(n)} ${c.count} in all. How many ${c.who} are there?`)], n, `\\text{${c.who}} =`);
    }
    return typed([say(`There are ${n} ${c.people}. Each one ${c.act}. How many ${c.count} are there?`)], pairs(n), `\\text{${c.count}} =`);
  },
  choices({ n, reverse }) {
    if (reverse) return numberOptions(n, [n - 1, n + 1, 2 * n], 1, 2);
    return numberOptions(pairs(n), [n * (n - 1), n * n, pairs(n + 1), pairs(n - 1)], 1, 1);
  },
  solution({ n, reverse }) {
    if (reverse) {
      return [
        { text: 'With $n$ in the group, each of the $n$ meets $n - 1$ others, and every meeting is counted twice:' },
        { tex: `\\tfrac{1}{2} n(n - 1) = ${pairs(n)}` },
        { tex: `n(n - 1) = ${2 * pairs(n)}` },
        { text: `Look for two numbers one apart that multiply to ${2 * pairs(n)}:` },
        { tex: `${n} \\times ${n - 1} = ${2 * pairs(n)}` },
        { text: `So there are ${n}.` },
      ];
    }
    return [
      { text: `Each of the ${n} meets ${n - 1} others, but that counts every meeting twice, once from each side:` },
      { tex: `${n} \\times ${n - 1} \\div 2 = ${pairs(n)}` },
    ];
  },
};

/* ---------- counting multiples in a range ---------- */

interface MultipleParams {
  k: number;
  from: number;
  to: number;
}

const countMultiples = ({ k, from, to }: MultipleParams) => Math.floor(to / k) - Math.floor((from - 1) / k);

const cmCountMultiples: Generator<MultipleParams> = {
  id: 'cm-count-multiples',
  sample(rng, difficulty) {
    const k = rng.int(3, difficulty >= 2 ? 19 : 9);
    const from = difficulty >= 2 ? rng.int(20, 300) : rng.int(1, 30);
    const to = from + rng.int(40, difficulty >= 2 ? 700 : 150);
    return { k, from, to };
  },
  render(p) {
    return typed([say(`How many whole numbers from ${p.from} to ${p.to}, including both, are multiples of ${p.k}?`)], countMultiples(p), '\\text{multiples} =');
  },
  choices(p) {
    const answer = countMultiples(p);
    return numberOptions(answer, [Math.floor((p.to - p.from) / p.k), Math.floor(p.to / p.k), answer + 1, Math.ceil((p.to - p.from + 1) / p.k)], 1, 1);
  },
  solution(p) {
    const top = Math.floor(p.to / p.k);
    const below = Math.floor((p.from - 1) / p.k);
    return [
      { text: `Multiples of ${p.k} up to ${p.to}: divide, and keep the whole part.` },
      { tex: `${p.to} = ${p.k} \\times ${top} + ${p.to - p.k * top}` },
      { text: `Take away those below ${p.from}, that is up to ${p.from - 1}:` },
      { tex: `${p.from - 1} = ${p.k} \\times ${below} + ${p.from - 1 - p.k * below}` },
      { tex: `${top} - ${below} = ${top - below}` },
    ];
  },
};

/* ---------- fence posts ---------- */

interface PostParams {
  shape: 'line' | 'loop' | 'log';
  length: number;
  gap: number;
}

const POSTS = {
  line: (p: PostParams) => p.length / p.gap + 1,
  loop: (p: PostParams) => p.length / p.gap,
  log: (p: PostParams) => (p.length - 1) * p.gap,
};

const cmFencePosts: Generator<PostParams> = {
  id: 'cm-fence-posts',
  sample(rng, difficulty) {
    const shape = difficulty >= 2 ? rng.pick(['loop', 'log'] as const) : 'line';
    if (shape === 'log') return { shape, length: rng.int(3, 15), gap: rng.int(2, 9) };
    const gap = rng.int(2, 8);
    return { shape, length: gap * rng.int(5, 40), gap };
  },
  render(p) {
    if (p.shape === 'log') {
      return typed([say(`A log is sawn into ${p.length} pieces. Each cut takes ${p.gap} minutes. How many minutes does the sawing take?`)], POSTS.log(p), '\\text{minutes} =');
    }
    if (p.shape === 'loop') {
      return typed([say(`Posts are put ${p.gap} m apart all the way round a field with a perimeter of ${p.length} m. How many posts are there?`)], POSTS.loop(p), '\\text{posts} =');
    }
    return typed([say(`A straight fence ${p.length} m long has a post at each end and a post every ${p.gap} m. How many posts are there?`)], POSTS.line(p), '\\text{posts} =');
  },
  choices(p) {
    const answer = POSTS[p.shape](p);
    if (p.shape === 'log') return numberOptions(answer, [p.length * p.gap, (p.length + 1) * p.gap], p.gap, 1);
    return numberOptions(answer, [p.length / p.gap - 1, p.length / p.gap, p.length / p.gap + 1, p.length / p.gap + 2], 1, 1);
  },
  solution(p) {
    if (p.shape === 'log') {
      return [
        { text: `Cutting a log into ${p.length} pieces takes one cut fewer than the pieces:` },
        { tex: `${p.length} - 1 = ${p.length - 1}` },
        { tex: `${p.length - 1} \\times ${p.gap} = ${POSTS.log(p)}` },
      ];
    }
    const gaps = p.length / p.gap;
    if (p.shape === 'loop') {
      return [
        { tex: `\\text{gaps} = ${p.length} \\div ${p.gap} = ${gaps}` },
        { text: 'Round a closed loop the last gap ends at the first post, so there are as many posts as gaps.' },
        { tex: `\\text{posts} = ${gaps}` },
      ];
    }
    return [
      { tex: `\\text{gaps} = ${p.length} \\div ${p.gap} = ${gaps}` },
      { text: 'Along a line there is one more post than gaps, counting the one at the start:' },
      { tex: `${gaps} + 1 = ${gaps + 1}` },
    ];
  },
};

/* ---------- outfits ---------- */

interface OutfitParams {
  tops: number;
  bottoms: number;
  extras: number;
  /** Difficulty 2: the extra is optional, so "none" is one more choice. */
  optional: boolean;
  context: number;
}

const OUTFITS = [
  { a: 'shirts', b: 'pairs of trousers', c: 'hats', whole: 'outfits', optional: 'a hat is optional' },
  { a: 'starters', b: 'main courses', c: 'desserts', whole: 'meals', optional: 'dessert is optional' },
  { a: 'frames', b: 'wheel sets', c: 'bells', whole: 'bikes', optional: 'a bell is optional' },
];

const outfitCount = (p: OutfitParams) => p.tops * p.bottoms * (p.extras + (p.optional ? 1 : 0));

const cmOutfits: Generator<OutfitParams> = {
  id: 'cm-outfits',
  sample(rng, difficulty) {
    return {
      tops: rng.int(2, 9),
      bottoms: rng.int(2, 7),
      extras: rng.int(2, 6),
      optional: difficulty >= 2,
      context: rng.int(0, OUTFITS.length - 1),
    };
  },
  render(p) {
    const c = OUTFITS[p.context];
    const rule = p.optional ? `one of each, except that ${c.optional}` : 'one of each';
    return typed([say(`There are ${p.tops} ${c.a}, ${p.bottoms} ${c.b} and ${p.extras} ${c.c}. How many different ${c.whole} can be made, taking ${rule}?`)], outfitCount(p), `\\text{${c.whole}} =`);
  },
  choices(p) {
    return numberOptions(outfitCount(p), [p.tops + p.bottoms + p.extras, p.tops * p.bottoms * p.extras, p.tops * p.bottoms * (p.extras + 1), p.tops * p.bottoms], 1, 1);
  },
  solution(p) {
    const c = OUTFITS[p.context];
    const steps: SolutionStep[] = [{ text: 'Each choice can go with every other, so multiply the number of ways at each step.' }];
    if (p.optional) {
      steps.push({ text: `Leaving out the ${c.c.replace(/s$/, '')} is one more way, so that step has $${p.extras} + 1 = ${p.extras + 1}$ ways:` });
      steps.push({ tex: `${p.tops} \\times ${p.bottoms} \\times ${p.extras + 1} = ${outfitCount(p)}` });
    } else {
      steps.push({ tex: `${p.tops} \\times ${p.bottoms} \\times ${p.extras} = ${outfitCount(p)}` });
    }
    return steps;
  },
};

/* ---------- digits used to number pages ---------- */

interface PageParams {
  pages: number;
}

function digitsUpTo(n: number): number {
  let total = 0;
  for (let len = 1, start = 1; start <= n; len += 1, start *= 10) {
    total += (Math.min(n, start * 10 - 1) - start + 1) * len;
  }
  return total;
}

const cmPageDigits: Generator<PageParams> = {
  id: 'cm-page-digits',
  sample(rng, difficulty) {
    return { pages: difficulty >= 2 ? rng.int(101, 999) : rng.int(20, 99) };
  },
  render({ pages }) {
    return typed([say(`The pages of a book are numbered from 1 to ${pages}. How many digits are printed altogether?`)], digitsUpTo(pages), '\\text{digits} =');
  },
  choices({ pages }) {
    const answer = digitsUpTo(pages);
    return numberOptions(answer, [pages * (pages >= 100 ? 3 : 2), answer - 9, answer + (pages >= 100 ? 3 : 2), 2 * pages], 1, 1);
  },
  solution({ pages }) {
    const steps: SolutionStep[] = [
      { text: 'Split the pages by how many digits their numbers have.' },
      { tex: `1 \\text{ to } 9: 9 \\times 1 = 9` },
    ];
    if (pages >= 100) {
      steps.push({ tex: `10 \\text{ to } 99: 90 \\times 2 = 180` });
      steps.push({ tex: `100 \\text{ to } ${pages}: ${pages - 99} \\times 3 = ${3 * (pages - 99)}` });
      steps.push({ tex: `9 + 180 + ${3 * (pages - 99)} = ${digitsUpTo(pages)}` });
    } else {
      steps.push({ tex: `10 \\text{ to } ${pages}: ${pages - 9} \\times 2 = ${2 * (pages - 9)}` });
      steps.push({ tex: `9 + ${2 * (pages - 9)} = ${digitsUpTo(pages)}` });
    }
    return steps;
  },
};

const cmPageDigitsTable: Generator<PageParams> = {
  id: 'cm-page-digits-table',
  sample(rng) {
    return { pages: rng.int(101, 999) };
  },
  render({ pages }) {
    const three = 3 * (pages - 99);
    const total = digitsUpTo(pages);
    return {
      kind: 'table',
      prompt: [say(`A book’s pages are numbered from 1 to ${pages}. Fill in how many digits each group of pages uses.`)],
      columns: ['\\text{Pages}', '\\text{Digits used}'],
      rows: [
        ['1 \\text{ to } 9', null],
        ['10 \\text{ to } 99', null],
        [`100 \\text{ to } ${pages}`, null],
        ['\\text{Total}', null],
      ],
      bank: numberBank([9, 180, three, total], [90, pages - 99, three + 3, total - 9, 3 * pages], 3),
      answer: [9, 180, three, total].map(num),
    };
  },
  solution({ pages }) {
    const three = 3 * (pages - 99);
    return [
      { tex: `1 \\text{ to } 9: 9 \\times 1 = 9` },
      { tex: `10 \\text{ to } 99: 90 \\times 2 = 180` },
      { text: `From 100 to ${pages} there are $${pages} - 99 = ${pages - 99}$ pages, each with three digits:` },
      { tex: `${pages - 99} \\times 3 = ${three}` },
      { tex: `9 + 180 + ${three} = ${digitsUpTo(pages)}` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Number Theory
 * ================================================================ */

/* ---------- plus or minus signs: odd or even? ---------- */

interface SignsParams {
  from: number;
  to: number;
}

const rangeSum = ({ from, to }: SignsParams) => ((from + to) * (to - from + 1)) / 2;

function signsRow({ from, to }: SignsParams): string {
  const terms = to - from + 1;
  // `\allowbreak` between terms: seven two-digit terms are wider than a phone,
  // and nothing else in the row gives the line a place to break.
  if (terms <= 7) return Array.from({ length: terms }, (_, i) => `\\square\\, ${from + i}`).join(' \\allowbreak ');
  return `\\square\\, ${from} \\; \\square\\, ${from + 1} \\; \\square\\, ${from + 2} \\; \\cdots \\; \\square\\, ${to}`;
}

const cmParitySigns: Generator<SignsParams> = {
  id: 'cm-parity-signs',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const from = rng.int(2, 30);
      return { from, to: from + rng.int(4, 40) };
    }
    return { from: 1, to: rng.int(4, 30) };
  },
  render(p) {
    const parity = rangeSum(p) % 2 === 0 ? 'Even' : 'Odd';
    return choiceSlide(
      [
        say('Each box is filled with a $+$ or a $-$ sign, and the line is worked out.'),
        show(`${signsRow(p)} = \\; ?`),
        say('Is the result odd or even?'),
      ],
      parity,
      ['Odd', 'Even', 'It depends on the signs chosen'],
      true,
    );
  },
  solution(p) {
    const s = rangeSum(p);
    return [
      { text: 'Changing $+n$ to $-n$ changes the total by $2n$, which is even, so it never changes odd or even.' },
      { text: 'So every choice of signs has the same parity as all plus signs:' },
      { tex: `${p.from} + ${p.from + 1} + \\cdots + ${p.to} = ${s}` },
      { text: `${s} is ${s % 2 === 0 ? 'even' : 'odd'}, whatever the signs.` },
    ];
  },
};

/* ---------- last digit of a power ---------- */

interface LastDigitParams {
  base: number;
  power: number;
}

function cycleOf(base: number): number[] {
  const out: number[] = [];
  let d = base % 10;
  while (!out.includes(d)) {
    out.push(d);
    d = (d * base) % 10;
  }
  return out;
}

const lastDigit = ({ base, power }: LastDigitParams) => {
  const cycle = cycleOf(base);
  return cycle[(power - 1) % cycle.length];
};

const cmLastDigit: Generator<LastDigitParams> = {
  id: 'cm-last-digit',
  sample(rng, difficulty) {
    const units = rng.pick([2, 3, 4, 7, 8, 9]);
    const base = difficulty >= 2 ? 10 * rng.int(1, 9) + units : units;
    return { base, power: rng.int(difficulty >= 2 ? 50 : 10, difficulty >= 2 ? 999 : 60) };
  },
  render(p) {
    return typed([say(`What is the last digit of $${p.base}^{${p.power}}$?`)], lastDigit(p), '\\text{last digit} =');
  },
  choices(p) {
    const cycle = cycleOf(p.base);
    return numberOptions(lastDigit(p), [...cycle, p.base % 10, (p.power * p.base) % 10], 1, 0);
  },
  solution(p) {
    const cycle = cycleOf(p.base);
    const r = p.power % cycle.length;
    return [
      { text: `Only the last digit, ${p.base % 10}, affects the last digit of the answer. Its powers end in` },
      { tex: cycle.join(', ') + ', \\ldots' },
      { text: `That repeats every ${cycle.length}. Divide the power by ${cycle.length}:` },
      { tex: `${p.power} = ${cycle.length} \\times ${Math.floor(p.power / cycle.length)} + ${r}` },
      { text: r === 0 ? `A remainder of 0 lands on the end of the cycle, so the last digit is ${lastDigit(p)}.` : `Remainder ${r} is place ${r} in the cycle, so the last digit is ${lastDigit(p)}.` },
    ];
  },
};

/* ---------- a missing digit for divisibility ---------- */

interface MissingParams {
  digits: number[];
  /** Index of the hidden digit. */
  hole: number;
  by: 9 | 11;
}

const digitSum = (digits: number[]) => digits.reduce((t, v) => t + v, 0);
const alternating = (digits: number[]) => digits.reduce((t, v, i) => t + (i % 2 === 0 ? v : -v), 0);

const cmMissingDigit: Generator<MissingParams> = {
  id: 'cm-missing-digit',
  sample(rng, difficulty) {
    const by = difficulty >= 2 ? 11 : 9;
    for (;;) {
      const length = rng.int(4, 6);
      const digits = Array.from({ length }, (_, i) => rng.int(i === 0 ? 1 : 0, 9));
      const hole = rng.int(1, length - 1);
      const test = by === 9 ? digitSum(digits) % 9 === 0 : alternating(digits) % 11 === 0;
      if (!test) continue;
      // Exactly one digit may fill the hole.
      const fits = Array.from({ length: 10 }, (_, d) => {
        const trial = [...digits];
        trial[hole] = d;
        return by === 9 ? digitSum(trial) % 9 === 0 : alternating(trial) % 11 === 0;
      }).filter(Boolean).length;
      if (fits !== 1) continue;
      return { digits, hole, by };
    }
  },
  render(p) {
    const shown = p.digits.map((d, i) => (i === p.hole ? '\\square' : String(d))).join('');
    return typed([say(`The number below is a multiple of ${p.by}. Which digit goes in the box?`), show(shown)], p.digits[p.hole], '\\square =');
  },
  choices(p) {
    const d = p.digits[p.hole];
    return numberOptions(d, [(d + 3) % 10, (d + 6) % 10, 9 - d, (d + 1) % 10], 1, 0);
  },
  solution(p) {
    const others = p.digits.filter((_, i) => i !== p.hole);
    const d = p.digits[p.hole];
    if (p.by === 9) {
      const s = digitSum(others);
      return [
        { text: 'A number is a multiple of 9 when its digits add to a multiple of 9. The digits shown add to' },
        { tex: `${others.join(' + ')} = ${s}` },
        { text: `The next multiple of 9 is ${s + d}, so the box holds` },
        { tex: `${s + d} - ${s} = ${d}` },
      ];
    }
    const signed = p.digits.map((v, i) => (i === p.hole ? '\\square' : String(v)));
    const expr = signed.map((v, i) => (i === 0 ? v : `${i % 2 === 0 ? '+' : '-'} ${v}`)).join(' ');
    const rest = alternating(p.digits.map((v, i) => (i === p.hole ? 0 : v)));
    const sign = p.hole % 2 === 0 ? '+' : '-';
    return [
      { text: 'A number is a multiple of 11 when its digits, taken with signs $+, -, +, \\ldots$ from the left, come to a multiple of 11:' },
      { tex: expr },
      { tex: `${rest} ${sign} \\square` },
      { text: `The box must bring this to a multiple of 11, and only ${d} does:` },
      { tex: `${rest} ${sign} ${d} = ${rest + (sign === '+' ? d : -d)}` },
    ];
  },
};

/* ---------- gcd of a triangular number and a factorial ---------- */

interface GcdParams {
  n: number;
}

const triangle = (n: number) => (n * (n + 1)) / 2;

/** How many times p divides n!. */
function legendre(n: number, p: number): number {
  let count = 0;
  for (let q = p; q <= n; q *= p) count += Math.floor(n / q);
  return count;
}

function gcdWithFactorial(value: number, n: number): number {
  return factorise(value).reduce((acc, [p, e]) => acc * p ** Math.min(e, legendre(n, p)), 1);
}

const cmGcdSumFactorial: Generator<GcdParams> = {
  id: 'cm-gcd-sum-factorial',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? rng.int(20, 60) : rng.int(5, 36) };
  },
  render({ n }) {
    return typed(
      [
        say('Two numbers are defined by'),
        show(`a = 1 + 2 + 3 + \\cdots + ${n}`),
        show(`b = 1 \\times 2 \\times 3 \\times \\cdots \\times ${n}`),
        say('What is the highest common factor of $a$ and $b$?'),
      ],
      gcdWithFactorial(triangle(n), n),
      '\\text{HCF} =',
    );
  },
  choices({ n }) {
    const s = triangle(n);
    const answer = gcdWithFactorial(s, n);
    return numberOptions(answer, [s, n, s / n, n + 1, 2 * answer], 1, 1);
  },
  solution({ n }) {
    const s = triangle(n);
    const answer = gcdWithFactorial(s, n);
    const steps: SolutionStep[] = [
      { text: 'Pair the numbers from the ends to add them:' },
      { tex: `a = \\tfrac{1}{2} \\times ${n} \\times ${n + 1} = ${s}` },
      { tex: `${s} = ${factorTex(s)}` },
      { text: `$b$ is a product of every number up to ${n}, so it holds every prime up to ${n}, most of them many times.` },
    ];
    const missing = factorise(s).filter(([p, e]) => legendre(n, p) < e);
    if (missing.length === 0) {
      steps.push({ text: `Every prime power in $a$ divides $b$, so the whole of $a$ divides $b$. The HCF is ${s}.` });
    } else {
      steps.push({ text: `${missing.map(([p]) => p).join(' and ')} ${missing.length === 1 ? 'is' : 'are'} bigger than ${n}, so ${missing.length === 1 ? 'it does' : 'they do'} not divide $b$. Leave ${missing.length === 1 ? 'it' : 'them'} out:` });
      steps.push({ tex: `\\text{HCF} = ${s} \\div ${s / answer} = ${answer}` });
    }
    return steps;
  },
};

/* ---------- multiples of two numbers on a Venn diagram ---------- */

interface VennMultiplesParams {
  a: number;
  b: number;
  n: number;
  /** Regions drawn in rather than left blank: 0 only-A, 1 both, 2 only-B, 3 neither. */
  given: number[];
}

function vennCounts({ a, b, n }: VennMultiplesParams): [number, number, number, number] {
  const A = Math.floor(n / a);
  const B = Math.floor(n / b);
  const both = Math.floor(n / lcm(a, b));
  return [A - both, both, B - both, n - A - B + both];
}

const cmVennMultiples: Generator<VennMultiplesParams> = {
  id: 'cm-venn-multiples',
  sample(rng, difficulty) {
    for (;;) {
      const a = rng.int(2, 9);
      const b = rng.int(2, 12);
      if (a >= b || b % a === 0 || lcm(a, b) > 40) continue;
      const n = rng.int(30, difficulty >= 2 ? 150 : 60);
      const regions = vennCounts({ a, b, n, given: [] });
      if (regions.some((r) => r === 0)) continue;
      const given = difficulty >= 2 ? [] : [rng.pick([0, 2, 3])];
      return { a, b, n, given };
    }
  },
  render(p) {
    const regions = vennCounts(p);
    const blanks = [0, 1, 2, 3].filter((i) => !p.given.includes(i));
    const [A, both, B] = [Math.floor(p.n / p.a), regions[1], Math.floor(p.n / p.b)];
    return {
      kind: 'venn',
      prompt: [
        say(`The whole numbers from 1 to ${p.n} are sorted onto the diagram. $A$ holds the multiples of ${p.a} and $B$ the multiples of ${p.b}.`),
        say('Fill in how many numbers are in each region.'),
      ],
      sets: ['A', 'B'],
      total: p.n,
      regions: regions.map((v, i) => (p.given.includes(i) ? num(v) : null)),
      bank: numberBank(
        blanks.map((i) => regions[i]),
        [A, B, both + 1, Math.floor(p.n / (p.a * p.b)), p.n - A - B],
        3,
      ),
      answer: blanks.map((i) => num(regions[i])),
    };
  },
  solution(p) {
    const [onlyA, both, onlyB, neither] = vennCounts(p);
    const l = lcm(p.a, p.b);
    const A = Math.floor(p.n / p.a);
    const B = Math.floor(p.n / p.b);
    return [
      { text: `A number is in both when it is a multiple of ${p.a} and of ${p.b}, that is of their LCM, ${l}:` },
      { tex: `${p.n} \\div ${l} \\to ${both}` },
      { text: `There are ${A} multiples of ${p.a}, and ${both} of them are also in $B$:` },
      { tex: `\\text{only } A = ${A} - ${both} = ${onlyA}` },
      { text: `There are ${B} multiples of ${p.b}:` },
      { tex: `\\text{only } B = ${B} - ${both} = ${onlyB}` },
      { text: 'The rest are in neither:' },
      { tex: `${p.n} - ${onlyA} - ${both} - ${onlyB} = ${neither}` },
    ];
  },
};

/* ================================================================
 * Lesson 5: Math Requires Creativity
 * ================================================================ */

/* ---------- a chain of averages ---------- */

type Gap = 'b-c' | 'c-a' | 'd-b' | 'b-a' | 'd-c';

interface ChainParams {
  d: number;
  ask: Gap;
}

/** With a = 0 and d − a = D: c = D/3, b = 2D/3, d = D. */
const chainValue = (D: number, v: 'a' | 'b' | 'c' | 'd') => ({ a: 0, b: (2 * D) / 3, c: D / 3, d: D })[v];
const chainGap = ({ d, ask }: ChainParams) => chainValue(d, ask[0] as 'b') - chainValue(d, ask[2] as 'a');

const cmAverageChain: Generator<ChainParams> = {
  id: 'cm-average-chain',
  sample(rng, difficulty) {
    return {
      d: 3 * rng.int(4, 60),
      ask: difficulty >= 2 ? rng.pick(['c-a', 'd-b', 'b-a', 'd-c'] as const) : 'b-c',
    };
  },
  render(p) {
    return typed(
      [
        say('Four numbers $a$, $b$, $c$ and $d$ have $a < b$ and $c < d$.'),
        say('The mean of $a$ and $b$ is $c$. The mean of $c$ and $d$ is $b$.'),
        say(`If $d - a = ${p.d}$, what is $${p.ask.replace('-', ' - ')}$?`),
      ],
      chainGap(p),
      `${p.ask.replace('-', ' - ')} =`,
    );
  },
  choices(p) {
    const answer = chainGap(p);
    return numberOptions(answer, [p.d / 3, (2 * p.d) / 3, p.d / 2, p.d / 4], 1, 1);
  },
  solution(p) {
    const D = p.d;
    const [x, , y] = p.ask;
    return [
      { text: 'Adding the same amount to all four numbers keeps every mean and every difference, so take $a = 0$.' },
      { tex: `c = \\tfrac{1}{2}(0 + b) = \\tfrac{1}{2} b` },
      { tex: `b = \\tfrac{1}{2}\\left(\\tfrac{1}{2} b + d\\right)` },
      { tex: `4b = b + 2d` },
      { tex: `d = \\tfrac{3}{2} b` },
      { text: `Now $d - a = d = ${D}$, so` },
      { tex: `b = ${num((2 * D) / 3)}, \\quad c = ${num(D / 3)}` },
      { tex: `${x} - ${y} = ${num(chainValue(D, x as 'a'))} - ${num(chainValue(D, y as 'a'))} = ${num(chainGap(p))}` },
    ];
  },
};

/* ---------- telescoping products ---------- */

interface TeleParams {
  kind: 'plus' | 'minus' | 'squares';
  n: number;
}

function teleValue({ kind, n }: TeleParams): [number, number] {
  if (kind === 'plus') return [n + 1, 2];
  if (kind === 'minus') return [1, n];
  return [n + 1, 2 * n];
}

function teleTex({ kind, n }: TeleParams): string {
  if (kind === 'squares') return `\\left(1 - \\tfrac{1}{2^2}\\right) \\cdots \\left(1 - \\tfrac{1}{${n}^2}\\right)`;
  const s = kind === 'plus' ? '+' : '-';
  return `\\left(1 ${s} \\tfrac{1}{2}\\right)\\left(1 ${s} \\tfrac{1}{3}\\right) \\cdots \\left(1 ${s} \\tfrac{1}{${n}}\\right)`;
}

const cmTelescopingProduct: Generator<TeleParams> = {
  id: 'cm-telescoping-product',
  sample(rng, difficulty) {
    const kind = difficulty >= 2 ? rng.pick(['minus', 'squares'] as const) : 'plus';
    return { kind, n: rng.int(6, kind === 'squares' ? 60 : 99) };
  },
  render(p) {
    const [top, bottom] = teleValue(p);
    return typed([say('Work out the product. Give an exact answer.'), show(teleTex(p))], fracAnswer(top, bottom), '\\text{product} =', FRACTION_KEYS);
  },
  choices(p) {
    const [top, bottom] = teleValue(p);
    const right = fracTex(top, bottom);
    const slips: [number, number][] =
      p.kind === 'plus' ? [[p.n, 2], [p.n + 1, p.n], [p.n + 2, 2]] : p.kind === 'minus' ? [[1, p.n + 1], [1, p.n - 1], [p.n - 1, p.n]] : [[p.n + 1, p.n], [p.n - 1, 2 * p.n], [1, p.n]];
    const seen = new Set([right]);
    const wrong = slips
      .map(([a, b]) => ({ tex: fracTex(a, b), answer: fracAnswer(a, b) }))
      .filter((o) => !seen.has(o.tex) && (seen.add(o.tex), true));
    return options({ tex: right, answer: fracAnswer(top, bottom) }, ...wrong);
  },
  solution(p) {
    const [top, bottom] = teleValue(p);
    const n = p.n;
    if (p.kind === 'plus') {
      return [
        { text: 'Write each bracket as one fraction:' },
        { tex: `\\frac{3}{2} \\times \\frac{4}{3} \\times \\cdots \\times \\frac{${n + 1}}{${n}}` },
        { text: 'Each top cancels the next bottom, leaving the last top over the first bottom:' },
        { tex: `\\frac{${n + 1}}{2}` },
      ];
    }
    if (p.kind === 'minus') {
      return [
        { text: 'Write each bracket as one fraction:' },
        { tex: `\\frac{1}{2} \\times \\frac{2}{3} \\times \\cdots \\times \\frac{${n - 1}}{${n}}` },
        { text: 'Each bottom cancels the next top, leaving the first top over the last bottom:' },
        { tex: `\\frac{1}{${n}}` },
      ];
    }
    return [
      { text: 'Each bracket is a difference of two squares:' },
      { tex: `1 - \\frac{1}{k^2} = \\frac{k - 1}{k} \\times \\frac{k + 1}{k}` },
      { text: 'The first halves multiply to $\\frac{1}{' + n + '}$, and the second halves to $\\frac{' + (n + 1) + '}{2}$:' },
      { tex: `\\frac{1}{${n}} \\times \\frac{${n + 1}}{2} = ${fracTex(top, bottom)}` },
    ];
  },
};

/* ---------- differences of squares, fast ---------- */

interface SquaresParams {
  mid: number;
  k: number;
}

const cmDiffSquares: Generator<SquaresParams> = {
  id: 'cm-diff-squares',
  sample(rng, difficulty) {
    const mid = difficulty >= 2 ? 1000 * rng.int(1, 9) + rng.pick([0, 0, 500]) : 100 * rng.int(1, 9) + rng.pick([0, 0, 50]);
    return { mid, k: rng.int(1, difficulty >= 2 ? 30 : 9) };
  },
  render({ mid, k }) {
    return typed([say('Work this out without a calculator.')], 4 * mid * k, `${mid + k}^2 - ${mid - k}^2 =`);
  },
  choices({ mid, k }) {
    const answer = 4 * mid * k;
    return numberOptions(answer, [2 * mid * k, 4 * k * k, answer + 4 * k * k, (2 * k) ** 2], 100, 1);
  },
  solution({ mid, k }) {
    return [
      { text: 'A difference of two squares factorises:' },
      { tex: `A^2 - B^2 = (A + B)(A - B)` },
      { tex: `${mid + k} + ${mid - k} = ${2 * mid}` },
      { tex: `${mid + k} - ${mid - k} = ${2 * k}` },
      { tex: `${2 * mid} \\times ${2 * k} = ${4 * mid * k}` },
    ];
  },
};

const cmDiffSquaresTiles: Generator<SquaresParams> = {
  id: 'cm-diff-squares-tiles',
  sample(rng, difficulty) {
    const mid = difficulty >= 2 ? 10 * rng.int(11, 99) : 10 * rng.int(2, 9) + rng.pick([0, 5]);
    return { mid, k: rng.int(1, 9) };
  },
  render({ mid, k }) {
    const product = mid * mid - k * k;
    return {
      kind: 'tiles',
      prompt: [say('Write the product as a difference of two squares, then finish it.')],
      template: `${mid - k} \\times ${mid + k} = {0}^2 - {1}^2 = {2}`,
      bank: numberBank([mid, k, product], [mid - k, mid + k, mid * mid + k * k, 2 * k], 3),
      answer: [num(mid), num(k), num(product)],
    };
  },
  solution({ mid, k }) {
    return [
      { text: `${mid - k} and ${mid + k} sit ${k} either side of ${mid}:` },
      { tex: `(${mid} - ${k})(${mid} + ${k}) = ${mid}^2 - ${k}^2` },
      { tex: `${mid * mid} - ${k * k} = ${mid * mid - k * k}` },
    ];
  },
};

/* ---------- alternating sums ---------- */

interface AltParams {
  kind: 'up' | 'down' | 'odd';
  n: number;
}

function altTerms({ kind, n }: AltParams): number[] {
  if (kind === 'down') return Array.from({ length: n }, (_, i) => n - i);
  if (kind === 'odd') return Array.from({ length: n }, (_, i) => 2 * i + 1);
  return Array.from({ length: n }, (_, i) => i + 1);
}

const altSum = (p: AltParams) => altTerms(p).reduce((t, v, i) => t + (i % 2 === 0 ? v : -v), 0);

function altTex(p: AltParams): string {
  const t = altTerms(p);
  const sign = (i: number) => (i % 2 === 0 ? '+' : '-');
  const last = t.length - 1;
  return `${t[0]} - ${t[1]} + ${t[2]} - ${t[3]} + \\cdots ${sign(last)} ${t[last]}`;
}

const cmAlternatingSum: Generator<AltParams> = {
  id: 'cm-alternating-sum',
  sample(rng, difficulty) {
    return { kind: difficulty >= 2 ? rng.pick(['down', 'odd'] as const) : 'up', n: rng.int(10, 120) };
  },
  render(p) {
    return typed([say('Work out the sum. The signs alternate all the way.'), show(altTex(p))], altSum(p), '\\text{sum} =');
  },
  choices(p) {
    const answer = altSum(p);
    return numberOptions(answer, [-answer, answer + (answer > 0 ? -1 : 1), p.n, Math.floor(p.n / 2)], 1, -Infinity);
  },
  solution(p) {
    const t = altTerms(p);
    const pairsCount = Math.floor(t.length / 2);
    const pairValue = t[0] - t[1];
    const steps: SolutionStep[] = [
      { text: 'Group the terms in pairs from the start:' },
      { tex: `(${t[0]} - ${t[1]}) + (${t[2]} - ${t[3]}) + \\cdots` },
      { text: `Each pair is ${pairValue}, and there are ${pairsCount} full pairs:` },
      { tex: `${pairsCount} \\times ${pairValue < 0 ? `(${pairValue})` : pairValue} = ${pairsCount * pairValue}` },
    ];
    if (t.length % 2 === 1) {
      steps.push({ text: `The last term, ${t[t.length - 1]}, has no partner and is added on:` });
      steps.push({ tex: `${pairsCount * pairValue} + ${t[t.length - 1]} = ${altSum(p)}` });
    }
    return steps;
  },
};

export const contestProblemSolvingGenerators = [
  cmJar,
  cmPairSums,
  cmPairSumsTiles,
  cmWorkRate,
  cmCloseFractions,
  cmPolygonSides,
  cmAngleRatio,
  cmAngleRatioTiles,
  cmClockAngle,
  cmStaircasePerimeter,
  cmTiltedSquare,
  cmHandshakes,
  cmCountMultiples,
  cmFencePosts,
  cmOutfits,
  cmPageDigits,
  cmPageDigitsTable,
  cmParitySigns,
  cmLastDigit,
  cmMissingDigit,
  cmGcdSumFactorial,
  cmVennMultiples,
  cmAverageChain,
  cmTelescopingProduct,
  cmDiffSquares,
  cmDiffSquaresTiles,
  cmAlternatingSum,
];
