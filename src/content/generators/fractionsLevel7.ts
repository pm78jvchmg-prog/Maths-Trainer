/**
 * Algebraic Fractions, level 7: rational equations in context.
 *
 * A rate turns a sentence into a fraction: time is distance over speed, the
 * number bought is money over price, a share is a total over the people
 * sharing it. Lesson 1 writes those fractions and equations from words and
 * solves the ones that stay linear. Lesson 2 is a boat on a river (or a
 * cyclist in the wind), where the two times add to a quadratic and one root
 * is a speed below the current. Lesson 3 is work done together, where rates
 * add: 1/a + 1/b = 1/t. Lesson 4 gives the formulas for resistors in
 * parallel and for a thin lens, which have the same shape. Lesson 5 is a
 * shared cost or a price that changes, C/x - C/(x + k) = d, and the root of
 * its quadratic that cannot be a number of people or a price.
 *
 * Every question is built outward from its answer. A journey is chosen by
 * its speed and the two whole times, and the other root of its quadratic,
 * c(t1 - t2)/(t1 + t2), is only ever drawn whole, so it always sits strictly
 * between -c and c: negative, or below the current. The reciprocal pairs
 * (a, b, t) with 1/a + 1/b = 1/t are listed once and shared by the workers,
 * the resistors and the lens. Only numbers are typed.
 */
import type { Rng } from '../../engine/rng';
import type { Block, Generator, Slide, SolutionStep } from '../types';
import { chain, choiceSlide, firstFour, frac, intOptions, numberBank, show, signed, stepBank, tileBank, turned } from './algebraicFractions';
import { say } from './format';

/* ---------- display ---------- */

/** v + c, v - c, or v alone, in any letter. */
const lb = (v: string, c: number): string => (c === 0 ? v : c > 0 ? `${v} + ${c}` : `${v} - ${-c}`);

/** The same in brackets. */
const lp = (v: string, c: number): string => `(${lb(v, c)})`;

/**
 * A product of brackets held as one group, for use inside a sentence. KaTeX
 * breaks an inline formula after any top-level `+`, so `(v + 3)(v - 3)` could
 * wrap mid-bracket on a phone; braced, it moves to the next line whole.
 */
const held = (tex: string): string => `{${tex}}`;

/** A number times a letter, the 1 dropped. */
const coef = (n: number, v: string): string => (n === 1 ? v : n === -1 ? `-${v}` : `${n}${v}`);

/** One over a number. */
const unit = (n: number): string => `\\frac{1}{${n}}`;

/** top/bottom, then its simplest form when that is different: 3/12 = 1/4, or 6/6 = 1. Every one here simplifies to one over a whole number. */
const reduced = (top: number, bottom: number): string =>
  top === 1 ? unit(bottom) : `${frac(String(top), String(bottom))} = ${top === bottom ? '1' : unit(bottom / top)}`;

/** A polynomial in any letter, highest power first. */
function polyIn(p: number[], v: string): string {
  const n = p.length - 1;
  const terms: string[] = [];
  p.forEach((c, i) => {
    if (c === 0) return;
    const k = n - i;
    const size = Math.abs(c);
    const letter = k === 0 ? '' : k === 1 ? v : `${v}^{${k}}`;
    const body = k === 0 ? `${size}` : `${size === 1 ? '' : size}${letter}`;
    if (terms.length === 0) terms.push(c < 0 ? `-${body}` : body);
    else terms.push(`${c < 0 ? '-' : '+'} ${body}`);
  });
  return terms.join(' ') || '0';
}

/** A resistance, in ohms, for prose. */
const ohms = (n: number): string => `$${n}\\,\\Omega$`;

const typed = (prompt: Block[], lead: string, answer: number): Slide => ({
  kind: 'expression',
  prompt,
  lead,
  keypad: [],
  answer: String(answer),
  domain: 'real',
  mode: 'exact',
});

/* ---------- reciprocal pairs ---------- */

/** Every a < b up to `max` with 1/a + 1/b = 1/t for a whole t, as [a, b, t]. */
function sumPairs(max: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 2; a <= max; a += 1) {
    for (let b = a + 1; b <= max; b += 1) {
      if ((a * b) % (a + b) === 0) out.push([a, b, (a * b) / (a + b)]);
    }
  }
  return out;
}

/** Every a < b up to 60 with 1/a - 1/b = 1/t for a whole t up to 60, as [a, b, t]. */
function differencePairs(): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 2; a <= 60; a += 1) {
    for (let b = a + 1; b <= 60; b += 1) {
      const t = (a * b) / (b - a);
      if (Number.isInteger(t) && t <= 60) out.push([a, b, t]);
    }
  }
  return out;
}

/** Three distinct resistances up to 60 whose parallel total is whole, as [[r1, r2, r3], R]. */
function triples(): [number[], number][] {
  const out: [number[], number][] = [];
  for (let a = 2; a <= 60; a += 1) {
    for (let b = a + 1; b <= 60; b += 1) {
      for (let c = b + 1; c <= 60; c += 1) {
        const s = a * b + b * c + c * a;
        if ((a * b * c) % s === 0) out.push([[a, b, c], (a * b * c) / s]);
      }
    }
  }
  return out;
}

export const SUM_PAIRS = sumPairs(60);
export const DIFFERENCE_PAIRS = differencePairs();
const TRIPLES = triples();

/** A pair from the list, its two members in either order. */
function pickPair(rng: Rng, limit: number): [number, number, number] {
  const [a, b, t] = rng.pick(SUM_PAIRS.filter(([, big]) => big <= limit));
  return rng.chance(0.5) ? [a, b, t] : [b, a, t];
}

/* ================================================================
 * Lesson 1: fractions from words
 * ================================================================ */

type WordCtx = 'journey' | 'shop' | 'share' | 'tank';
const WORD_CTXS: WordCtx[] = ['journey', 'shop', 'share', 'tank'];

interface WordExprParams {
  ctx: WordCtx;
  total: number;
  /** The bottom is x + a; 0 at difficulty 1. */
  a: number;
}

function wordShift(rng: Rng, ctx: WordCtx): number {
  if (ctx === 'journey') return rng.int(1, 4) * 5 * rng.sign();
  if (ctx === 'shop') return rng.int(1, 4) * rng.sign();
  if (ctx === 'share') return rng.chance(0.6) ? rng.int(1, 5) : -rng.int(1, 3);
  return rng.int(2, 12) * rng.sign();
}

function wordExprSentence({ ctx, total, a }: WordExprParams): string {
  const more = a > 0;
  const size = Math.abs(a);
  if (a === 0) {
    if (ctx === 'journey') return `A train travels ${total} km at $x$ km/h. Which expression gives the time it takes, in hours?`;
    if (ctx === 'shop') return `Tickets cost £$x$ each. Which expression gives the number of tickets £${total} buys?`;
    if (ctx === 'share') return `£${total} is shared equally between $x$ people. Which expression gives each person’s share, in pounds?`;
    return `A pump moves $x$ litres of water a minute. Which expression gives the number of minutes it takes to move ${total} litres?`;
  }
  if (ctx === 'journey') {
    return `A car travels at $x$ km/h, and a van travels ${size} km/h ${more ? 'faster' : 'slower'}. Which expression gives the time, in hours, the van takes to drive ${total} km?`;
  }
  if (ctx === 'shop') {
    return `Pens cost £$x$ each, and notebooks cost £${size} ${more ? 'more' : 'less'} than a pen. Which expression gives the number of notebooks £${total} buys?`;
  }
  if (ctx === 'share') {
    return more
      ? `A bill of £${total} is shared equally by $x$ friends and ${size} ${size === 1 ? 'other' : 'others'} who join them. Which expression gives each person’s share, in pounds?`
      : `A bill of £${total} was to be shared by $x$ friends, but ${size} of them ${size === 1 ? 'drops' : 'drop'} out and the rest share it equally. Which expression gives each person’s share, in pounds?`;
  }
  return `Pump A moves $x$ litres a minute, and pump B moves ${size} litres a minute ${more ? 'more' : 'less'}. Which expression gives the number of minutes pump B takes to move ${total} litres?`;
}

/** Why the fraction is what it is, one sentence per context. */
const WORD_RULE: Record<WordCtx, string> = {
  journey: 'Time is distance divided by speed.',
  shop: 'The number bought is the money divided by the price of one.',
  share: 'Each share is the total divided by the number of people sharing it.',
  tank: 'The time is the volume divided by the litres moved each minute.',
};

/** What x + a stands for, when it is not x. */
function wordBottom({ ctx, a }: { ctx: WordCtx; a: number }): string {
  const bottom = `$${lb('x', a)}$`;
  if (ctx === 'journey') return `The van’s speed is ${bottom} km/h.`;
  if (ctx === 'shop') return `A notebook costs ${bottom} pounds.`;
  if (ctx === 'share') return `There are ${bottom} people sharing.`;
  return `Pump B moves ${bottom} litres a minute.`;
}

/** An expression for a quantity described in words: a total over a rate. */
const wordExpr: Generator<WordExprParams> = {
  id: 'af7-word-expr',
  sample: (rng, difficulty) => {
    const ctx = rng.pick(WORD_CTXS);
    const total =
      ctx === 'journey' ? rng.int(6, 40) * 10 : ctx === 'shop' ? rng.int(12, 90) : ctx === 'share' ? rng.int(4, 60) * 10 : rng.int(4, 40) * 25;
    return { ctx, total, a: difficulty > 1 ? wordShift(rng, ctx) : 0 };
  },
  render: (params): Slide => {
    const { total, a } = params;
    const right = frac(String(total), lb('x', a));
    const wrong =
      a === 0
        ? [frac('x', String(total)), `${total}x`, `${total} - x`]
        : [frac(lb('x', a), String(total)), `${frac(String(total), 'x')} ${signed(a)}`, frac(String(total), lb('x', -a))];
    return choiceSlide([say(wordExprSentence(params))], firstFour(right, ...wrong));
  },
  solution: (params) => {
    const steps: SolutionStep[] = [{ text: WORD_RULE[params.ctx] }];
    if (params.a !== 0) steps.push({ text: wordBottom(params) });
    steps.push({ tex: frac(String(params.total), lb('x', params.a)) });
    return steps;
  },
};

interface WordValueParams {
  ctx: WordCtx;
  a: number;
  /** The answer. */
  x: number;
  /** What the fraction comes to: hours, notebooks, pounds each or minutes. */
  n: number;
}

const wordValueTotal = ({ a, x, n }: WordValueParams): number => n * (x + a);

function wordValueSentence(params: WordValueParams): string {
  const { ctx, a, n } = params;
  const total = wordValueTotal(params);
  const more = a > 0;
  const size = Math.abs(a);
  if (a === 0) {
    if (ctx === 'journey') return `A train travels ${total} km at $x$ km/h and takes ${n} hours.`;
    if (ctx === 'shop') return `Tickets cost £$x$ each, and £${total} buys ${n} of them.`;
    if (ctx === 'share') return `£${total} is shared equally between $x$ people, and each gets £${n}.`;
    return `A pump moves $x$ litres a minute and takes ${n} minutes to move ${total} litres.`;
  }
  if (ctx === 'journey') {
    return `A van travels ${size} km/h ${more ? 'faster' : 'slower'} than a car doing $x$ km/h. The van drives ${total} km in ${n} hours.`;
  }
  if (ctx === 'shop') return `Notebooks cost £${size} ${more ? 'more' : 'less'} than pens at £$x$ each. £${total} buys ${n} notebooks.`;
  if (ctx === 'share') {
    return more
      ? `A bill of £${total} is shared equally by $x$ friends and ${size} ${size === 1 ? 'other' : 'others'}, and each pays £${n}.`
      : `A bill of £${total} was to be shared by $x$ friends. ${size} of them ${size === 1 ? 'drops' : 'drop'} out, and each of the rest pays £${n}.`;
  }
  return `Pump B moves ${size} litres a minute ${more ? 'more' : 'less'} than pump A, which moves $x$ litres a minute. Pump B moves ${total} litres in ${n} minutes.`;
}

/** Write the equation a sentence describes, one fraction equal to a number, and solve it. */
const wordValue: Generator<WordValueParams> = {
  id: 'af7-word-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const ctx = rng.pick(WORD_CTXS);
      const a = difficulty > 1 ? wordShift(rng, ctx) : 0;
      let x: number;
      let n: number;
      if (ctx === 'journey') {
        x = rng.int(6, 18) * 5;
        n = rng.int(2, 5);
        if (x + a < 20) continue;
      } else if (ctx === 'shop') {
        x = rng.int(2, 12);
        n = rng.int(2, 15);
        if (x + a < 1) continue;
      } else if (ctx === 'share') {
        x = rng.int(3, 15);
        n = rng.int(4, 30);
        if (x + a < 2) continue;
      } else {
        x = rng.int(4, 40);
        n = rng.int(2, 12);
        if (x + a < 2) continue;
      }
      return { ctx, a, x, n };
    }
  },
  render: (params): Slide => typed([say(`${wordValueSentence(params)} Write an equation and solve it to find $x$.`)], 'x =', params.x),
  solution: (params) => {
    const { ctx, a, x, n } = params;
    const total = wordValueTotal(params);
    const lines = [`${frac(String(total), lb('x', a))} &= ${n}`, `${total} &= ${a === 0 ? `${n}x` : `${n}${lp('x', a)}`}`];
    if (a !== 0) lines.push(`${lb('x', a)} &= ${x + a}`);
    lines.push(`x &= ${x}`);
    return [{ text: WORD_RULE[ctx] }, ...(a === 0 ? [] : [{ text: wordBottom(params) }]), { tex: chain(...lines) }];
  },
};

type EqualCtx = 'journey' | 'paint' | 'print';

interface EqualParams {
  ctx: EqualCtx;
  /** The answer: the second thing’s rate. */
  x: number;
  /** The first thing’s rate is x + a. */
  a: number;
  /** Both amounts share this factor: A = k(x + a), B = kx. */
  k: number;
}

const equalA = ({ x, a, k }: EqualParams): number => k * (x + a);
const equalB = ({ x, k }: EqualParams): number => k * x;

function equalSentence(params: EqualParams): string {
  const { ctx, a } = params;
  const A = equalA(params);
  const B = equalB(params);
  const size = Math.abs(a);
  if (ctx === 'journey') {
    const vehicle = a > 0 ? 'train' : 'lorry';
    return `A ${vehicle} travels ${A} km in the same time as a car travels ${B} km. The car drives at $x$ km/h, and the ${vehicle} is ${size} km/h ${a > 0 ? 'faster' : 'slower'}.`;
  }
  if (ctx === 'paint') {
    return `£${A} buys as many tins of paint as £${B} buys tins of varnish. Varnish costs £$x$ a tin, and paint costs £${size} ${a > 0 ? 'more' : 'less'}.`;
  }
  return `Printer P prints ${A} pages in the same time as printer Q prints ${B}. Q prints $x$ pages a minute, and P prints ${size} ${a > 0 ? 'more' : 'fewer'}.`;
}

const EQUAL_RULE: Record<EqualCtx, string> = {
  journey: 'Time is distance divided by speed.',
  paint: 'The number of tins is the money divided by the price of one tin.',
  print: 'Time is the number of pages divided by the pages printed each minute.',
};

/** What x + a and x stand for, in words. */
function equalRates(ctx: EqualCtx, a: number): string {
  const first = `$${lb('x', a)}$`;
  if (ctx === 'journey') return `The ${a > 0 ? 'train' : 'lorry'} drives at ${first} km/h and the car at $x$ km/h.`;
  if (ctx === 'paint') return `A tin of paint costs ${first} pounds and a tin of varnish $x$.`;
  return `P prints ${first} pages a minute and Q prints $x$.`;
}

const EQUAL_WHAT: Record<EqualCtx, string> = {
  journey: 'the two times',
  paint: 'the two numbers of tins',
  print: 'the two times',
};

function sampleEqual(rng: Rng, difficulty: number): EqualParams {
  for (;;) {
    const ctx = rng.pick<EqualCtx>(['journey', 'paint', 'print']);
    const sign = difficulty > 1 ? rng.sign() : 1;
    if (ctx === 'journey') {
      const x = rng.int(4, 16) * 5;
      const a = rng.int(1, 4) * 5 * sign;
      if (x + a < 20) continue;
      return { ctx, x, a, k: rng.int(2, 5) };
    }
    if (ctx === 'paint') {
      const x = rng.int(2, 9);
      const a = rng.int(1, 3) * sign;
      if (x + a < 1) continue;
      return { ctx, x, a, k: rng.int(3, 12) };
    }
    const x = rng.int(4, 20) * 2;
    const a = rng.int(2, 10) * sign;
    if (x + a < 4) continue;
    return { ctx, x, a, k: rng.int(2, 6) };
  }
}

/** Two quantities that are equal, each a fraction: which equation says so? */
const equalSetup: Generator<EqualParams> = {
  id: 'af7-equal-setup',
  sample: sampleEqual,
  render: (params): Slide => {
    const { a, ctx } = params;
    const A = String(equalA(params));
    const B = String(equalB(params));
    return choiceSlide(
      [say(`${equalSentence(params)} Which equation says ${EQUAL_WHAT[ctx]} are equal?`)],
      firstFour(
        `${frac(A, lb('x', a))} = ${frac(B, 'x')}`,
        `${frac(A, 'x')} = ${frac(B, lb('x', a))}`,
        `${frac(A, lb('x', -a))} = ${frac(B, 'x')}`,
        `${frac(A, lb('x', a))} = ${frac('x', B)}`,
      ),
    );
  },
  solution: (params) => {
    const { ctx, a } = params;
    const A = String(equalA(params));
    const B = String(equalB(params));
    return [
      { text: EQUAL_RULE[ctx] },
      { text: `${equalRates(ctx, a)} Each amount goes over its own rate:` },
      { tex: `${frac(A, lb('x', a))} = ${frac(B, 'x')}` },
    ];
  },
};

/** Solve the equation that says two fractions are equal, a step at a time. */
const equalSteps: Generator<EqualParams> = {
  id: 'af7-equal-steps',
  sample: sampleEqual,
  render: (params): Slide => {
    const { x, a, ctx } = params;
    const A = equalA(params);
    const B = equalB(params);
    const left = `${A}x`;
    const right = `${B}x ${signed(B * a)}`;
    const answer = `x = ${x}`;
    return {
      kind: 'steps',
      prompt: [
        say(equalSentence(params)),
        say(
          `Setting ${EQUAL_WHAT[ctx]} equal gives the equation below. Solve it: tap the part you would do **next**, then choose what it becomes.`,
        ),
      ],
      start: [frac(String(A), lb('x', a)), '=', frac(String(B), 'x')],
      reductions: [
        { span: [0, 1], value: left, bank: stepBank(left, `${A}${lp('x', a)}`, `${B}x`) },
        { span: [2, 3], value: right, bank: stepBank(right, `${B}x ${signed(a)}`, `${A}x ${signed(A * a)}`, `${B}x ${signed(-B * a)}`) },
        { span: [0, 3], operator: 1, value: answer, bank: stepBank(answer, `x = ${-x}`, `x = ${x + a}`, `x = ${x - a}`) },
      ],
    };
  },
  solution: (params) => {
    const { x, a } = params;
    const A = equalA(params);
    const B = equalB(params);
    return [
      { text: `Multiply both sides by $${held(`x${lp('x', a)}`)}$. Each side becomes its own top times the other side’s bottom:` },
      { tex: chain(`${A}x &= ${B}${lp('x', a)}`, `${A}x &= ${B}x ${signed(B * a)}`, `${coef(A - B, 'x')} &= ${B * a}`, `x &= ${x}`) },
      { text: `Check it makes sense: $${lb('x', a)} = ${x + a}$, which is positive.` },
    ];
  },
};

/* ================================================================
 * Lesson 2: journeys with a current or a wind
 * ================================================================ */

interface JourneyParams {
  ctx: 'boat' | 'bike';
  /** The current or the wind, km/h. */
  c: number;
  /** The speed in still water or still air: the answer. */
  V: number;
  /** Hours with the current, and against it. */
  t1: number;
  t2: number;
}

const journeyD1 = ({ V, c, t1 }: JourneyParams): number => t1 * (V + c);
const journeyD2 = ({ V, c, t2 }: JourneyParams): number => t2 * (V - c);
const journeyT = ({ t1, t2 }: JourneyParams): number => t1 + t2;
/** The other root of the quadratic: strictly between -c and c, never 0. */
const journeyW = ({ c, t1, t2 }: JourneyParams): number => (c * (t1 - t2)) / (t1 + t2);

function sampleJourney(rng: Rng, difficulty: number): JourneyParams {
  for (;;) {
    const c = difficulty > 1 ? rng.int(3, 6) : rng.int(2, 4);
    const V = rng.int(c + 2, difficulty > 1 ? 20 : 12);
    const t1 = rng.int(1, 6);
    const t2 = rng.int(1, 6);
    if ((c * (t1 - t2)) % (t1 + t2) !== 0) continue;
    const w = (c * (t1 - t2)) / (t1 + t2);
    if (w === 0 || V + w < 2) continue;
    return { ctx: rng.pick<'boat' | 'bike'>(['boat', 'bike']), c, V, t1, t2 };
  }
}

function journeySentence(params: JourneyParams): string {
  const d1 = journeyD1(params);
  const d2 = journeyD2(params);
  const T = journeyT(params);
  if (params.ctx === 'boat') {
    return `A boat travels ${d1} km downstream and then ${d2} km upstream, taking ${T} hours in all. The current flows at ${params.c} km/h, and the boat’s speed in still water is $v$ km/h.`;
  }
  return `A cyclist rides ${d1} km with a ${params.c} km/h wind behind her, then ${d2} km into the wind, taking ${T} hours in all. Her speed in still air is $v$ km/h.`;
}

const journeyWords = (ctx: JourneyParams['ctx']) =>
  ctx === 'boat'
    ? { with: 'downstream', against: 'upstream', flow: 'current', speed: 'the boat’s speed in still water' }
    : { with: 'with the wind', against: 'into the wind', flow: 'wind speed', speed: 'her speed in still air' };

function journeyEquation(params: JourneyParams): string {
  const { c } = params;
  return `${frac(String(journeyD1(params)), lb('v', c))} + ${frac(String(journeyD2(params)), lb('v', -c))} = ${journeyT(params)}`;
}

/** The quadratic, from clearing to dividing through, as aligned lines. */
function journeyClearing(params: JourneyParams): string {
  const { c, V } = params;
  const d1 = journeyD1(params);
  const d2 = journeyD2(params);
  const T = journeyT(params);
  const w = journeyW(params);
  return chain(
    `&${d1}${lp('v', -c)} + ${d2}${lp('v', c)}`,
    `&\\quad = ${T}(v^{2} - ${c * c})`,
    `&${polyIn([d1 + d2, (d2 - d1) * c], 'v')} = ${polyIn([T, 0, -T * c * c], 'v')}`,
    `&${polyIn([T, -(d1 + d2), (d1 - d2) * c - T * c * c], 'v')} = 0`,
    `&${polyIn([1, -(V + w), V * w], 'v')} = 0`,
  );
}

/** Which equation gives the total time of a journey with and against a current. */
const journeySetup: Generator<JourneyParams> = {
  id: 'af7-journey-setup',
  sample: sampleJourney,
  render: (params): Slide => {
    const { c } = params;
    const d1 = String(journeyD1(params));
    const d2 = String(journeyD2(params));
    const T = journeyT(params);
    return choiceSlide(
      [say(`${journeySentence(params)} Which equation gives the total time?`)],
      firstFour(
        journeyEquation(params),
        // With the same distance each way the swap is the same equation, so take the times away instead.
        d1 === d2 ? `${frac(d1, lb('v', c))} - ${frac(d2, lb('v', -c))} = ${T}` : `${frac(d1, lb('v', -c))} + ${frac(d2, lb('v', c))} = ${T}`,
        `${frac(String(journeyD1(params) + journeyD2(params)), 'v')} = ${T}`,
        `${frac(lb('v', c), d1)} + ${frac(lb('v', -c), d2)} = ${T}`,
      ),
    );
  },
  solution: (params) => {
    const words = journeyWords(params.ctx);
    return [
      { text: `${words.with[0].toUpperCase()}${words.with.slice(1)} the speed is $${lb('v', params.c)}$, and ${words.against} it is $${lb('v', -params.c)}$.` },
      { text: 'Each time is distance over speed, and the two times add to the whole trip:' },
      { tex: journeyEquation(params) },
    ];
  },
};

/** Check a given speed: the two times, and their total. */
const journeyCheckTree: Generator<JourneyParams> = {
  id: 'af7-journey-check-tree',
  sample: sampleJourney,
  render: (params): Slide => {
    const { c, V, t1, t2 } = params;
    const words = journeyWords(params.ctx);
    const T = journeyT(params);
    const answer = [t1, t2, T];
    return {
      kind: 'tree',
      prompt: [
        say(journeySentence(params)),
        say(`Check that $v = ${V}$ fits. Top row: the time ${words.with} and the time ${words.against}, in hours. Below: the total.`),
      ],
      expression: `${frac(String(journeyD1(params)), `${V} + ${c}`)} + ${frac(String(journeyD2(params)), `${V} - ${c}`)}`,
      nodes: [
        { id: 'with', from: [] },
        { id: 'against', from: [] },
        { id: 'total', from: ['with', 'against'] },
      ],
      bank: numberBank(answer, [T + 1, Math.abs(t1 - t2), t1 * t2, T - 1]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { c, V, t1, t2 } = params;
    const words = journeyWords(params.ctx);
    return [
      { text: `${words.with[0].toUpperCase()}${words.with.slice(1)} the speed is $${V} + ${c} = ${V + c}$ km/h, and ${words.against} it is $${V} - ${c} = ${V - c}$ km/h.` },
      { tex: chain(`${frac(String(journeyD1(params)), String(V + c))} &= ${t1}`, `${frac(String(journeyD2(params)), String(V - c))} &= ${t2}`) },
      { text: `In all $${t1} + ${t2} = ${journeyT(params)}$ hours, which matches, so $v = ${V}$ fits.` },
    ];
  },
};

/** Clear the fractions and read off the quadratic. */
const journeyQuadTiles: Generator<JourneyParams> = {
  id: 'af7-journey-quad-tiles',
  sample: sampleJourney,
  render: (params): Slide => {
    const { c, V } = params;
    const w = journeyW(params);
    const T = journeyT(params);
    const answer = [signed(-(V + w)), signed(V * w)];
    return {
      kind: 'tiles',
      prompt: [
        say(`Multiply every term by $${held(`${lp('v', c)}${lp('v', -c)}`)}$, collect everything on one side and divide through by ${T}. Fill in the quadratic.`),
        show(journeyEquation(params)),
      ],
      template: 'v^2 {0}v {1} = 0',
      bank: tileBank(answer, [
        signed(V + w),
        signed(-V * w),
        signed(-(journeyD1(params) + journeyD2(params))),
        signed(V - w),
        signed(-c * c),
      ]),
      answer,
    };
  },
  solution: (params) => [
    { text: `Multiply every term by $${held(`${lp('v', params.c)}${lp('v', -params.c)}`)}$. Each fraction keeps the bracket it is missing:` },
    { tex: journeyClearing(params) },
    { text: `The last line is the one before divided by ${journeyT(params)}.` },
  ],
};

/** Both roots solve the equation; only one can be the speed. */
const journeyRejectFlow: Generator<JourneyParams> = {
  id: 'af7-journey-reject-flow',
  sample: sampleJourney,
  render: (params): Slide => {
    const { c, V } = params;
    const w = journeyW(params);
    const words = journeyWords(params.ctx);
    const reasons = ['Yes', 'No: it is negative', `No: it is below the ${words.flow}`];
    const finals = [`$v = ${V}$ km/h`, `$v = ${w}$ km/h`, 'Either value'];
    const reason = w < 0 ? reasons[1] : reasons[2];
    return {
      kind: 'flow',
      prompt: [
        say(journeySentence(params)),
        say(`Solving gives the equation below, so $v = ${V}$ or $v = ${w}$. The ${words.flow} is ${c} km/h. Check each root against the story.`),
      ],
      subject: `${lp('v', -V)}${lp('v', -w)} = 0`,
      steps: [
        {
          id: 'root',
          ask: `Can ${words.speed} be $v = ${w}$?`,
          branches: turned(reasons, `${V}|${w}|${c}`).map((label) => ({ label, to: 'answer' })),
        },
        {
          id: 'answer',
          ask: `So what is ${words.speed}?`,
          branches: turned(finals, `${w}|${V}`).map((label) => ({
            label,
            outcome: label === 'Either value' ? 'Both roots would stand.' : `So the speed is ${label}.`,
          })),
        },
      ],
      answer: [reason, finals[0]],
    };
  },
  solution: (params) => {
    const { c, V } = params;
    const w = journeyW(params);
    const words = journeyWords(params.ctx);
    return [
      w < 0
        ? { text: `$v = ${w}$ is negative, and a speed cannot be negative. Reject it.` }
        : {
            text: `$v = ${w}$ is below the ${words.flow} of ${c} km/h: ${words.against} the speed would be $${w} - ${c} = ${w - c}$ km/h, going backwards. Reject it.`,
          },
      { text: `At $v = ${V}$ both speeds, $${V + c}$ and $${V - c}$ km/h, are positive, so it stands.` },
      { tex: `v = ${V}` },
    ];
  },
};

/** The whole journey: set up, clear, factorise and reject, then type the speed. */
const journeySolve: Generator<JourneyParams> = {
  id: 'af7-journey-solve',
  sample: sampleJourney,
  choices: (params) => {
    const { c, V } = params;
    const w = journeyW(params);
    return intOptions(V, [w, V + c, V - c, -w]);
  },
  render: (params): Slide => typed([say(`${journeySentence(params)} Find $v$.`)], 'v =', params.V),
  solution: (params) => {
    const { c, V } = params;
    const w = journeyW(params);
    const words = journeyWords(params.ctx);
    return [
      { tex: journeyEquation(params) },
      { text: `Multiply every term by $${held(`${lp('v', c)}${lp('v', -c)}`)}$ and collect:` },
      { tex: journeyClearing(params) },
      { tex: `${lp('v', -V)}${lp('v', -w)} = 0` },
      {
        text:
          w < 0
            ? `$v = ${w}$ is negative, so reject it.`
            : `$v = ${w}$ is below the ${words.flow} of ${c} km/h, so ${words.against} it would go backwards. Reject it.`,
      },
      { tex: `v = ${V}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: working together
 * ================================================================ */

type WorkCtx = 'pipes' | 'painters' | 'printers';
const WORK_CTXS: WorkCtx[] = ['pipes', 'painters', 'printers'];

interface TogetherParams {
  ctx: WorkCtx | 'bath' | 'leak';
  a: number;
  b: number;
  t: number;
  /** b takes away from a rather than adding to it. */
  drain: boolean;
}

function sampleTogether(rng: Rng, difficulty: number): TogetherParams {
  if (difficulty > 1) {
    const [a, b, t] = rng.pick(DIFFERENCE_PAIRS);
    return { ctx: rng.pick<'bath' | 'leak'>(['bath', 'leak']), a, b, t, drain: true };
  }
  const [a, b, t] = pickPair(rng, 30);
  return { ctx: rng.pick(WORK_CTXS), a, b, t, drain: false };
}

const togetherUnit = ({ ctx }: TogetherParams): string => (ctx === 'printers' || ctx === 'bath' ? 'minute' : 'hour');

function togetherSentence({ ctx, a, b }: TogetherParams): string {
  if (ctx === 'pipes') return `Pipe A fills a tank in ${a} hours, and pipe B fills it in ${b} hours.`;
  if (ctx === 'painters') return `Ana can paint a fence in ${a} hours, and Ben can paint it in ${b} hours.`;
  if (ctx === 'printers') return `Printer A prints a batch of leaflets in ${a} minutes, and printer B prints it in ${b} minutes.`;
  if (ctx === 'bath') return `A tap fills a bath in ${a} minutes. With the plug out, a full bath drains in ${b} minutes.`;
  return `Pipe A fills a tank in ${a} hours, but a leak would empty the full tank in ${b} hours.`;
}

function togetherQuestion(params: TogetherParams): string {
  const u = togetherUnit(params);
  if (params.ctx === 'bath') return 'With the tap on and the plug out, how long does the empty bath take to fill, in minutes?';
  if (params.ctx === 'leak') return 'With the leak, how long does the empty tank take to fill, in hours?';
  return `How long do they take working together, in ${u}s?`;
}

const togetherSum = ({ a, b, drain }: TogetherParams): string => `${unit(a)} ${drain ? '-' : '+'} ${unit(b)}`;

function togetherWorking(params: TogetherParams): SolutionStep[] {
  const { a, b, t, drain } = params;
  const u = togetherUnit(params);
  const l = (a * b) / gcdOf(a, b);
  return [
    {
      text: drain
        ? `In one ${u} the tap fills $${unit(a)}$ and the drain empties $${unit(b)}$, so the rates subtract:`
        : `In one ${u} the first does $${unit(a)}$ of the job and the second $${unit(b)}$, so the rates add:`,
    },
    {
      tex: chain(
        `&${togetherSum(params)}`,
        `=\\;&${frac(String(l / a), String(l))} ${drain ? '-' : '+'} ${frac(String(l / b), String(l))}`,
        `=\\;&${reduced(drain ? l / a - l / b : l / a + l / b, l)}`,
      ),
    },
    { text: `So $${unit(t)}$ of the job is done each ${u}, and all of it takes ${t} ${u}s.` },
  ];
}

function gcdOf(a: number, b: number): number {
  return b === 0 ? a : gcdOf(b, a % b);
}

/** The rates, their sum and the time, as a tree. */
const togetherTree: Generator<TogetherParams> = {
  id: 'af7-together-tree',
  sample: sampleTogether,
  render: (params): Slide => {
    const { a, b, t, drain } = params;
    const u = togetherUnit(params);
    const answer = [unit(a), unit(b), unit(t), String(t)];
    return {
      kind: 'tree',
      prompt: [
        say(togetherSentence(params)),
        say(
          drain
            ? `Top row: the part filled and the part emptied in one ${u}. Then the part filled in one ${u} with both running, simplified. Last: the time it takes, in ${u}s.`
            : `Top row: the part of the job each does in one ${u}. Then the part done in one ${u} together, simplified. Last: the time it takes, in ${u}s.`,
        ),
      ],
      expression: togetherSum(params),
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'rate', from: ['first', 'second'] },
        { id: 'time', from: ['rate'] },
      ],
      bank: tileBank(answer, drain
        ? [unit(b - a), unit(a + b), String(b - a), String(a + b)]
        : [unit(a + b), `\\frac{2}{${a + b}}`, String(a + b), String(Math.abs(b - a))]),
      answer,
    };
  },
  solution: togetherWorking,
};

/** The time together, typed. */
const togetherTime: Generator<TogetherParams> = {
  id: 'af7-together-time',
  sample: sampleTogether,
  choices: ({ a, b, t, drain }) =>
    intOptions(t, drain ? [b - a, a + b, (a + b) / 2, 2 * t] : [a + b, (a + b) / 2, Math.abs(b - a), 2 * t]),
  render: (params): Slide => typed([say(`${togetherSentence(params)} ${togetherQuestion(params)}`)], 't =', params.t),
  solution: togetherWorking,
};

interface AloneParams {
  ctx: WorkCtx;
  /** The known time alone. */
  a: number;
  /** The unknown time alone: the answer. */
  b: number;
  /** The time together. */
  t: number;
}

function sampleAlone(rng: Rng, difficulty: number): AloneParams {
  const [a, b, t] = pickPair(rng, difficulty > 1 ? 60 : 30);
  return { ctx: rng.pick(WORK_CTXS), a, b, t };
}

function aloneSentence({ ctx, a, t }: AloneParams): string {
  if (ctx === 'pipes') return `Together, pipes A and B fill a tank in ${t} hours. Pipe A alone takes ${a} hours. Let pipe B alone take $x$ hours.`;
  if (ctx === 'painters') return `Together, Ana and Ben paint a fence in ${t} hours. Ana alone takes ${a} hours. Let Ben alone take $x$ hours.`;
  return `Together, two printers print a batch of leaflets in ${t} minutes. The first alone takes ${a} minutes. Let the second alone take $x$ minutes.`;
}

function aloneWorking({ a, b, t }: AloneParams): string {
  const l = (a * t) / gcdOf(a, t);
  return chain(
    `${unit(a)} + \\frac{1}{x} &= ${unit(t)}`,
    `\\frac{1}{x} &= ${unit(t)} - ${unit(a)}`,
    `&= ${frac(String(l / t), String(l))} - ${frac(String(l / a), String(l))}`,
    `&= ${reduced(l / t - l / a, l)}`,
    `x &= ${b}`,
  );
}

/** One worker’s time alone from the time together, a step at a time. */
const aloneSteps: Generator<AloneParams> = {
  id: 'af7-alone-steps',
  sample: sampleAlone,
  render: (params): Slide => {
    const { a, b, t } = params;
    const answer = `x = ${b}`;
    return {
      kind: 'steps',
      prompt: [say(aloneSentence(params)), say('Find $x$: tap the part you would do **next**, then choose what it becomes.')],
      start: ['\\frac{1}{x}', '=', unit(t), '-', unit(a)],
      reductions: [
        { span: [2, 5], operator: 3, value: unit(b), bank: stepBank(unit(b), unit(a - t), unit(a + t), `-${unit(b)}`) },
        { span: [0, 3], operator: 1, value: answer, bank: stepBank(answer, `x = ${a - t}`, `x = ${unit(b)}`, `x = ${a + t}`) },
      ],
    };
  },
  solution: (params) => [
    { text: 'The two rates add to the rate together, so take the known rate from both sides:' },
    { tex: aloneWorking(params) },
  ],
};

interface LongerParams {
  ctx: WorkCtx;
  /** The quicker time alone: the answer. */
  a: number;
  /** The slower, a + k. */
  b: number;
  t: number;
}

function sampleLonger(rng: Rng, difficulty: number): LongerParams {
  const [a, b, t] = rng.pick(SUM_PAIRS.filter(([, big]) => big <= (difficulty > 1 ? 60 : 30)));
  return { ctx: rng.pick(WORK_CTXS), a, b, t };
}

function longerSentence({ ctx, a, b, t }: LongerParams): string {
  const k = b - a;
  if (ctx === 'pipes') return `Pipe B takes ${k} hours longer than pipe A to fill a tank. Together they fill it in ${t} hours. Let pipe A alone take $x$ hours.`;
  if (ctx === 'painters') return `Ben takes ${k} hours longer than Ana to paint a fence. Together they paint it in ${t} hours. Let Ana alone take $x$ hours.`;
  return `Printer B takes ${k} minutes longer than printer A to print a batch. Together they take ${t} minutes. Let printer A alone take $x$ minutes.`;
}

const longerEquation = ({ a, b, t }: LongerParams): string => `\\frac{1}{x} + \\frac{1}{${lb('x', b - a)}} = ${unit(t)}`;

/** One time given in terms of the other: the equation becomes a quadratic. */
const longerSolve: Generator<LongerParams> = {
  id: 'af7-longer-solve',
  sample: sampleLonger,
  render: (params): Slide => typed([say(`${longerSentence(params)} Find $x$.`)], 'x =', params.a),
  solution: (params) => {
    const { a, b, t } = params;
    const k = b - a;
    const other = -(t * k) / a;
    return [
      { text: 'The two rates add to the rate together:' },
      { tex: longerEquation(params) },
      { text: `Multiply every term by $${held(`${t}x${lp('x', k)}`)}$:` },
      {
        // Left-aligned, as the journey and sharing working are: aligned on
        // the = signs the widest left side and the widest right side add up,
        // and at difficulty 2 that ran past a 393 px screen.
        tex: chain(
          `&${t}${lp('x', k)} + ${t}x = x${lp('x', k)}`,
          `&${polyIn([2 * t, t * k], 'x')} = ${polyIn([1, k, 0], 'x')}`,
          `&0 = ${polyIn([1, k - 2 * t, -t * k], 'x')}`,
          `&0 = ${lp('x', -a)}${lp('x', -other)}`,
        ),
      },
      { text: `A time cannot be negative, so reject $x = ${other}$.` },
      { tex: `x = ${a}` },
    ];
  },
};

interface WorkSetupParams {
  alone: AloneParams | null;
  longer: LongerParams | null;
}

/** Which equation a working-together story gives. */
const togetherSetup: Generator<WorkSetupParams> = {
  id: 'af7-together-setup',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { alone: null, longer: sampleLonger(rng, 2) } : { alone: sampleAlone(rng, 1), longer: null },
  render: ({ alone, longer }): Slide => {
    if (alone) {
      const { a, t } = alone;
      return choiceSlide(
        [say(`${aloneSentence(alone)} Which equation is true?`)],
        firstFour(
          `${unit(a)} + \\frac{1}{x} = ${unit(t)}`,
          `${a} + x = ${t}`,
          `${unit(a)} + \\frac{1}{x} = ${t}`,
          `${unit(a)} - \\frac{1}{x} = ${unit(t)}`,
        ),
      );
    }
    const { a, b, t } = longer!;
    const k = b - a;
    return choiceSlide(
      [say(`${longerSentence(longer!)} Which equation is true?`)],
      firstFour(
        longerEquation(longer!),
        `\\frac{1}{x} + \\frac{1}{${k}} = ${unit(t)}`,
        `x + ${lp('x', k)} = ${t}`,
        `\\frac{1}{x} + \\frac{1}{${lb('x', k)}} = ${t}`,
      ),
    );
  },
  solution: ({ alone, longer }) => {
    if (alone) {
      return [
        { text: `In one unit of time the first does $${unit(alone.a)}$ of the job, the second $\\frac{1}{x}$, and both together $${unit(alone.t)}$. The rates add:` },
        { tex: `${unit(alone.a)} + \\frac{1}{x} = ${unit(alone.t)}` },
      ];
    }
    const k = longer!.b - longer!.a;
    return [
      { text: `The slower one takes $${lb('x', k)}$, so its rate is $\\frac{1}{${lb('x', k)}}$. The rates add to the rate together:` },
      { tex: longerEquation(longer!) },
    ];
  },
};

/* ================================================================
 * Lesson 4: resistors in parallel and the lens formula
 * ================================================================ */

interface ParallelParams {
  /** The resistances, in the order given. */
  rs: number[];
  R: number;
}

const PARALLEL_TWO = '\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2}';
const PARALLEL_THREE = '\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\frac{1}{R_3}';

const listed = (rs: number[]): string =>
  rs.length === 2 ? `${ohms(rs[0])} and ${ohms(rs[1])}` : `${ohms(rs[0])}, ${ohms(rs[1])} and ${ohms(rs[2])}`;

/** The total of resistors in parallel, reciprocal by reciprocal. */
const parallelTree: Generator<ParallelParams> = {
  id: 'af7-parallel-tree',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const [rs, R] = rng.pick(TRIPLES);
      return { rs: turned(rs, `${rs.join('|')}|${rng.int(0, 2)}`), R };
    }
    const [a, b, t] = pickPair(rng, 45);
    return { rs: [a, b], R: t };
  },
  render: ({ rs, R }): Slide => {
    const answer = [...rs.map(unit), unit(R), String(R)];
    const total = rs.reduce((s, r) => s + r, 0);
    return {
      kind: 'tree',
      prompt: [
        say(`Resistors of ${listed(rs)} are joined in parallel.`),
        show(rs.length === 2 ? PARALLEL_TWO : PARALLEL_THREE),
        say('Top row: one over each resistance. Then their sum, simplified. Last: the total resistance $R$, in ohms.'),
      ],
      expression: rs.map(unit).join(' + '),
      nodes: [
        ...rs.map((_, i) => ({ id: `r${i}`, from: [] as string[] })),
        { id: 'sum', from: rs.map((_, i) => `r${i}`) },
        { id: 'R', from: ['sum'] },
      ],
      bank: tileBank(answer, [unit(total), String(total), `\\frac{${rs.length}}{${total}}`, String(R + 1)]),
      answer,
    };
  },
  solution: ({ rs, R }) => {
    const l = rs.reduce((acc, r) => (acc * r) / gcdOf(acc, r), 1);
    return [
      { text: 'Put the fractions over a common bottom and add:' },
      {
        tex: chain(
          `\\frac{1}{R} &= ${rs.map(unit).join(' + ')}`,
          `&= ${rs.map((r) => frac(String(l / r), String(l))).join(' + ')}`,
          `&= ${reduced(rs.reduce((s, r) => s + l / r, 0), l)}`,
        ),
      },
      { text: `So $R = ${R}\\,\\Omega$, less than the smallest resistor, as it always is in parallel.` },
    ];
  },
};

interface MissingParams {
  R1: number;
  R2: number;
  R: number;
}

function sampleMissing(rng: Rng, difficulty: number): MissingParams {
  const [R1, R2, R] = pickPair(rng, difficulty > 1 ? 60 : 45);
  return { R1, R2, R };
}

function missingWorking({ R1, R2, R }: MissingParams): string {
  const l = (R1 * R) / gcdOf(R1, R);
  return chain(
    `\\frac{1}{R_2} &= ${unit(R)} - ${unit(R1)}`,
    `&= ${frac(String(l / R), String(l))} - ${frac(String(l / R1), String(l))}`,
    `&= ${reduced(l / R - l / R1, l)}`,
    `R_2 &= ${R2}`,
  );
}

/** A missing resistor from the total, typed. */
const parallelMissing: Generator<MissingParams> = {
  id: 'af7-parallel-missing',
  sample: sampleMissing,
  choices: ({ R1, R2, R }) => intOptions(R2, [R1 - R, R1 + R, 2 * R, R2 + R]),
  render: ({ R1, R }): Slide =>
    typed(
      [
        say(`A ${ohms(R1)} resistor and a second resistor, $R_2$, are joined in parallel. Their total resistance is ${ohms(R)}. Find $R_2$, in ohms.`),
        show(PARALLEL_TWO),
      ],
      'R_2 =',
      (R1 * R) / (R1 - R),
    ),
  solution: (params) => [
    { text: `Put in $R = ${params.R}$ and $R_1 = ${params.R1}$, then take $${unit(params.R1)}$ from both sides:` },
    { tex: missingWorking(params) },
  ],
};

const LENS = '\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}';

interface LensParams {
  u: number;
  v: number;
  f: number;
}

function sampleLens(rng: Rng, difficulty: number): LensParams {
  const [u, v, f] = pickPair(rng, difficulty > 1 ? 60 : 45);
  return { u, v, f };
}

/** The focal length from the two distances, typed. */
const lensFocal: Generator<LensParams> = {
  id: 'af7-lens-focal',
  sample: sampleLens,
  choices: ({ u, v, f }) => intOptions(f, [u + v, (u + v) / 2, Math.abs(u - v), 2 * f]),
  render: ({ u, v, f }): Slide =>
    typed(
      [
        say(`An object stands ${u} cm from a lens, and its image forms ${v} cm from the lens. Find the focal length $f$, in cm.`),
        show(LENS),
      ],
      'f =',
      f,
    ),
  solution: ({ u, v, f }) => {
    const l = (u * v) / gcdOf(u, v);
    return [
      { text: `Put in $u = ${u}$ and $v = ${v}$ and add:` },
      {
        tex: chain(
          `\\frac{1}{f} &= ${unit(u)} + ${unit(v)}`,
          `&= ${frac(String(l / u), String(l))} + ${frac(String(l / v), String(l))}`,
          `&= ${reduced(l / u + l / v, l)}`,
          `f &= ${f}`,
        ),
      },
    ];
  },
};

function lensWorking({ u, v, f }: LensParams): string {
  const l = (u * f) / gcdOf(u, f);
  return chain(
    `\\frac{1}{v} &= ${unit(f)} - ${unit(u)}`,
    `&= ${frac(String(l / f), String(l))} - ${frac(String(l / u), String(l))}`,
    `&= ${reduced(l / f - l / u, l)}`,
    `v &= ${v}`,
  );
}

/** The image distance from the focal length and the object distance, a step at a time. */
const lensSteps: Generator<LensParams> = {
  id: 'af7-lens-steps',
  sample: sampleLens,
  render: ({ u, v, f }): Slide => {
    const answer = `v = ${v}`;
    return {
      kind: 'steps',
      prompt: [
        say(`A lens has focal length ${f} cm, and an object stands ${u} cm from it.`),
        show(LENS),
        say('Taking $\\frac{1}{u}$ from both sides gives the line below. Find the image distance $v$: tap the part you would do **next**, then choose what it becomes.'),
      ],
      start: ['\\frac{1}{v}', '=', unit(f), '-', unit(u)],
      reductions: [
        { span: [2, 5], operator: 3, value: unit(v), bank: stepBank(unit(v), unit(u - f), unit(u + f), `-${unit(v)}`) },
        { span: [0, 3], operator: 1, value: answer, bank: stepBank(answer, `v = ${u - f}`, `v = ${unit(v)}`, `v = ${u + f}`) },
      ],
    };
  },
  solution: (params) => [
    { text: `Put in $f = ${params.f}$ and $u = ${params.u}$, then take $${unit(params.u)}$ from both sides:` },
    { tex: lensWorking(params) },
  ],
};

interface WhichParams {
  lens: boolean;
  /** The total (R or f), a known part (R1 or u), and the answer (R2 or v). */
  total: number;
  known: number;
  answer: number;
}

/** Which line finds the missing part: the total’s reciprocal minus the known one. */
const formulaWhich: Generator<WhichParams> = {
  id: 'af7-formula-which',
  sample: (rng, difficulty) => {
    const [known, answer, total] = pickPair(rng, difficulty > 1 ? 60 : 45);
    return { lens: difficulty > 1, total, known, answer };
  },
  render: ({ lens, total, known }): Slide => {
    const left = lens ? '\\frac{1}{v} =' : '\\frac{1}{R_2} =';
    const prompt = lens
      ? [say(`A lens has focal length ${total} cm, and an object stands ${known} cm from it.`), show(LENS), say('Which line gives the image distance $v$?')]
      : [say(`Two resistors in parallel have a total resistance of ${ohms(total)}. One is ${ohms(known)}.`), show(PARALLEL_TWO), say('Which line gives the other, $R_2$?')];
    return choiceSlide(
      prompt,
      firstFour(
        `${left} ${unit(total)} - ${unit(known)}`,
        `${left} ${unit(known)} - ${unit(total)}`,
        `${left} ${unit(total)} + ${unit(known)}`,
        `${left} \\frac{1}{${known} - ${total}}`,
      ),
    );
  },
  solution: ({ lens, total, known, answer }) => {
    const whole = lens ? 'f' : 'R';
    const part = lens ? 'u' : 'R_1';
    const missing = lens ? 'v' : 'R_2';
    return [
      { text: `Take $\\frac{1}{${part}}$ from both sides of the formula:` },
      { tex: `\\frac{1}{${missing}} = \\frac{1}{${whole}} - \\frac{1}{${part}}` },
      { text: 'With the numbers in:' },
      { tex: `\\frac{1}{${missing}} = ${unit(total)} - ${unit(known)} = ${unit(answer)}` },
      { text: 'Fractions are not taken away by taking away their bottoms.' },
    ];
  },
};

/* ================================================================
 * Lesson 5: prices and sharing
 * ================================================================ */

type ShareCtx = 'bus' | 'price' | 'drive';

interface ShareParams {
  ctx: ShareCtx;
  /** The answer. */
  X: number;
  k: number;
  d: number;
  /** For `price`, what is bought. */
  item: string;
}

const shareC = ({ X, k, d }: ShareParams): number => (d * X * (X + k)) / k;

const ITEMS = ['books', 'plants', 'tickets', 'shirts'];

function sampleShare(rng: Rng, difficulty: number): ShareParams {
  for (;;) {
    const ctx = rng.pick<ShareCtx>(difficulty > 1 ? ['bus', 'price', 'drive'] : ['bus', 'price']);
    let X: number;
    let k: number;
    let d: number;
    if (ctx === 'bus') {
      X = rng.int(3, 20);
      k = rng.int(2, 6);
      d = rng.int(1, 12);
    } else if (ctx === 'price') {
      X = rng.int(2, 15);
      k = rng.int(2, 5);
      d = rng.int(1, 10);
    } else {
      X = rng.int(4, 18) * 5;
      k = rng.pick([5, 10, 15, 20]);
      d = rng.int(1, 3);
    }
    if ((d * X) % k !== 0 || k === d) continue;
    const params = { ctx, X, k, d, item: rng.pick(ITEMS) };
    if (shareC(params) > (ctx === 'drive' ? 900 : 600)) continue;
    return params;
  }
}

function shareSentence(params: ShareParams): string {
  const { ctx, k, d, item } = params;
  const C = shareC(params);
  if (ctx === 'bus') {
    return `A group hires a minibus for £${C} and shares the cost equally. If ${k} more people came, each would pay £${d} less. Let $x$ be the number of people in the group.`;
  }
  if (ctx === 'price') {
    return `Sam spends £${C} on ${item} at £$x$ each. Had each cost £${k} more, he would have bought ${d} fewer.`;
  }
  return `A coach travels ${C} km at $x$ km/h. Going ${k} km/h faster would save ${d} hour${d === 1 ? '' : 's'}.`;
}

const SHARE_ASK: Record<ShareCtx, string> = {
  bus: 'How many people are in the group?',
  price: 'Find the price of one, $x$, in pounds.',
  drive: 'Find its speed, $x$, in km/h.',
};

function shareEquation(params: ShareParams): string {
  const C = String(shareC(params));
  return `${frac(C, 'x')} - ${frac(C, lb('x', params.k))} = ${params.d}`;
}

function shareClearing(params: ShareParams): string {
  const { X, k, d } = params;
  const C = shareC(params);
  // The first line's two sides on two lines, as in the journey working: with a
  // three-digit cost it ran past a 393 px screen on one.
  return chain(
    `&${C}${lp('x', k)} - ${C}x`,
    `&\\quad = ${d === 1 ? '' : d}x${lp('x', k)}`,
    `&${C * k} = ${polyIn([d, d * k, 0], 'x')}`,
    `&0 = ${polyIn([1, k, -X * (X + k)], 'x')}`,
  );
}

/** Which equation a shared cost or a changed price gives. */
const shareSetup: Generator<ShareParams> = {
  id: 'af7-share-setup',
  sample: sampleShare,
  render: (params): Slide => {
    const { k, d } = params;
    const C = String(shareC(params));
    return choiceSlide(
      [say(`${shareSentence(params)} Which equation is true?`)],
      firstFour(
        shareEquation(params),
        `${frac(C, lb('x', k))} - ${frac(C, 'x')} = ${d}`,
        `${frac(C, 'x')} - ${frac(C, lb('x', d))} = ${k}`,
        `${frac(C, 'x')} - ${frac(C, lb('x', -k))} = ${d}`,
      ),
    );
  },
  solution: (params) => {
    const { ctx, k, d } = params;
    const what = ctx === 'bus' ? 'Each share' : ctx === 'price' ? 'The number bought' : 'The time';
    const C = shareC(params);
    return [
      { text: `${what} is $${frac(String(C), 'x')}$ now and $${frac(String(C), lb('x', k))}$ after the change.` },
      { text: `The first is the larger, and it is larger by ${d}, so the first minus the second is ${d}:` },
      { tex: shareEquation(params) },
    ];
  },
};

/** Clear the fractions and read off the quadratic. */
const shareQuadTiles: Generator<ShareParams> = {
  id: 'af7-share-quad-tiles',
  sample: sampleShare,
  render: (params): Slide => {
    const { X, k, d } = params;
    const C = shareC(params);
    const answer = [signed(k), signed(-X * (X + k))];
    return {
      kind: 'tiles',
      prompt: [
        say(
          d === 1
            ? `Multiply every term by $${held(`x${lp('x', k)}`)}$ and collect everything on one side. Fill in the quadratic.`
            : `Multiply every term by $${held(`x${lp('x', k)}`)}$, collect everything on one side and divide through by ${d}. Fill in the quadratic.`,
        ),
        show(shareEquation(params)),
      ],
      template: 'x^2 {0}x {1} = 0',
      bank: tileBank(answer, [signed(-k), signed(X * (X + k)), signed(-C * k), signed(d * k), signed(-C)]),
      answer,
    };
  },
  solution: (params) => [
    { text: `Multiply every term by $${held(`x${lp('x', params.k)}`)}$. Each fraction keeps the bracket it is missing:` },
    { tex: shareClearing(params) },
    ...(params.d === 1 ? [] : [{ text: `The last line is the one before, moved to one side and divided by ${params.d}.` }]),
  ],
};

/** The whole problem, typed. */
const shareSolve: Generator<ShareParams> = {
  id: 'af7-share-solve',
  sample: sampleShare,
  choices: ({ X, k, d }) => intOptions(X, [-(X + k), X + k, X + d, X - k]),
  render: (params): Slide => typed([say(`${shareSentence(params)} ${SHARE_ASK[params.ctx]}`)], 'x =', params.X),
  solution: (params) => {
    const { X, k } = params;
    return [
      { tex: shareEquation(params) },
      { text: `Multiply every term by $${held(`x${lp('x', k)}`)}$ and collect:` },
      { tex: shareClearing(params) },
      { tex: `0 = ${lp('x', -X)}${lp('x', X + k)}` },
      { text: `$x = -${X + k}$ is negative, so reject it.` },
      { tex: `x = ${X}` },
    ];
  },
};

const SHARE_PARTS: Record<ShareCtx, [string, string]> = {
  bus: ['each share now', 'each share with the extra people'],
  price: ['how many he bought', 'how many at the higher price'],
  drive: ['the time now', 'the time going faster'],
};

/** Check a given answer: both fractions and their difference. */
const shareCheckTree: Generator<ShareParams> = {
  id: 'af7-share-check-tree',
  sample: sampleShare,
  render: (params): Slide => {
    const { ctx, X, k, d } = params;
    const C = shareC(params);
    const first = C / X;
    const second = C / (X + k);
    const answer = [first, second, d];
    const [one, two] = SHARE_PARTS[ctx];
    return {
      kind: 'tree',
      prompt: [say(shareSentence(params)), say(`Check that $x = ${X}$ fits. Top row: ${one}, and ${two}. Below: the difference.`)],
      expression: `${frac(String(C), String(X))} - ${frac(String(C), `${X} + ${k}`)}`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'diff', from: ['first', 'second'] },
      ],
      bank: numberBank(answer, [first + second, C / k, d + 1, k]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { X, k, d } = params;
    const C = shareC(params);
    return [
      { tex: chain(`${frac(String(C), String(X))} &= ${C / X}`, `${frac(String(C), String(X + k))} &= ${C / (X + k)}`) },
      { text: `The difference is $${C / X} - ${C / (X + k)} = ${d}$, as the story says, so $x = ${X}$ fits.` },
    ];
  },
};

export const fractionsLevel7Generators = [
  wordExpr,
  wordValue,
  equalSetup,
  equalSteps,
  journeySetup,
  journeyCheckTree,
  journeyQuadTiles,
  journeyRejectFlow,
  journeySolve,
  togetherTree,
  togetherTime,
  aloneSteps,
  longerSolve,
  togetherSetup,
  parallelTree,
  parallelMissing,
  lensFocal,
  lensSteps,
  formulaWhich,
  shareSetup,
  shareQuadTiles,
  shareSolve,
  shareCheckTree,
];
