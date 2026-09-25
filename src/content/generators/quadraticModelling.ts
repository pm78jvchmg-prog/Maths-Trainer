/**
 * Modelling with quadratics: the maths from levels 2 to 5, in a situation.
 *
 * Roadmap batch B20, the sixth Quadratics level. Nothing here is new algebra —
 * factorising, completing the square and the vertex were all taught earlier.
 * What is new is that every question starts from something happening (a ball
 * thrown up, a pen fenced off, a shop setting a price) and ends with what a
 * number *means*: a root is when the ball lands, the vertex is the greatest
 * area, a negative time is before the throw and gets thrown away.
 *
 * The five lessons walk that in order: building a model from a situation,
 * reading its graph, finding its greatest or least value, finding when it
 * reaches a given value, and fitting a quadratic to facts about a curve.
 *
 * **Every model is built outward from whole numbers.** A flight is drawn from
 * its landing time and the (negative) time it would have left the ground,
 * $h = -5\left(t + s\right)\left(t - T\right)$, which with $g = 10$ is exactly
 * the $h_0 + vt - 5t^2$ a physics lesson writes down. The pools squeeze the
 * 25-distinct floor, so they vary the context and the phrasing as well as the
 * numbers. Units live in prose only, never in an answer.
 *
 * Rules inherited from `quadratics.ts`: a tiles template is split on `{n}`
 * and each piece rendered alone, so no braces round a digit and no
 * `\left`/`\right` spanning a blank; and every value in a `reduce` tree is
 * whole, banks included.
 *
 * This file is imported by `quadraticShapes.ts` and spread into its array, so
 * the registry picks it up without changing. It must not import from that
 * file in turn.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import type { Expr } from '../expr';
import { hashSeed } from '../../engine/rng';
import { markerWindow, plotSvg, type Curve } from '../figures';
import { options } from '../choiceVariant';
import { bin, num, pow } from '../expr';
import { ALGEBRA_KEYS } from './calculus';
import { bankOf, numberTile, offer, signedTile } from './quadratics';
import { aOrAn } from './format';

/* ---------- Formatting ---------- */

/** ax^2 + bx + c in any letter, written the way it appears on the page. */
function quadIn(a: number, b: number, c: number, v: string): string {
  const lead = a === 1 ? `${v}^{2}` : a === -1 ? `-${v}^{2}` : `${a}${v}^{2}`;
  const middle = b === 0 ? '' : ` ${signedTile(b, v)}`;
  const tail = c === 0 ? '' : ` ${signedTile(c)}`;
  return `${lead}${middle}${tail}`;
}

/** A coefficient in front of brackets: nothing for 1, a bare minus for -1. */
function coefficientTex(a: number): string {
  return a === 1 ? '' : a === -1 ? '-' : `${a}`;
}

/** The turning point's height after the square: ` + 3`, ` - 3`, or nothing for 0 rather than ` + 0`. */
const turningShift = (K: number): string => (K === 0 ? '' : K < 0 ? ` - ${-K}` : ` + ${K}`);

/** A root's bracket in any letter: `(x - 3)`, `(t + 2)`. */
function factorTex(root: number, v = 'x'): string {
  return root === 0 ? v : `(${v} ${signedTile(-root)})`;
}

/** A number, bracketed when negative, for a substitution written out. */
function bracketed(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A deterministic scatter of a tree bank; see `working.ts`. */
function scatter(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** A tree bank: the answers as a multiset, then distinct distractors. */
function treeBank(answer: string[], distractors: string[]): string[] {
  const extras: string[] = [];
  for (const value of distractors) {
    if (answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  return scatter([...answer, ...extras]);
}

/** Four whole-number options built from `offer`, the correct one flagged. */
function numberChoices(correct: number, ...near: number[]): ChoiceOption[] {
  return options(
    { tex: `${correct}`, answer: `${correct}` },
    ...offer(correct, ...near)
      .filter((value) => Number(value) !== correct)
      .map((value) => ({ tex: value, answer: value })),
  );
}

/**
 * Order a derived choice's options so the answer lands in a slot chosen by
 * the question's own numbers.
 *
 * `choiceVariant` turns the options by a hash of their labels, and with
 * small-number labels that hash favours one slot: before this, the greatest
 * area sat first in 58% of draws. So this tries orderings until the turn puts
 * the answer where the salt says, as `steered` in `complexPlane.ts` does.
 * `turnOf` mirrors `rotation` in `choiceVariant.ts`; if that changes, the
 * answer is still always on offer and only its slot drifts again.
 */
function steered(opts: ChoiceOption[], params: unknown): ChoiceOption[] {
  const turnOf = (list: ChoiceOption[]) => {
    let hash = 0;
    for (const option of list) {
      for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % list.length;
  };
  const n = opts.length;
  const target = hashSeed(JSON.stringify(params)) % n;
  const orders = (list: ChoiceOption[]): ChoiceOption[][] =>
    list.length <= 1
      ? [list]
      : list.flatMap((head, idx) => orders([...list.slice(0, idx), ...list.slice(idx + 1)]).map((rest) => [head, ...rest]));
  for (const order of orders(opts)) {
    const at = order.findIndex((option) => option.correct);
    if ((((at - turnOf(order)) % n) + n) % n === target) return order;
  }
  return opts;
}

/**
 * A native choice slide with the answer in a drawn slot.
 *
 * Drawn in `sample` rather than hashed from the labels, since the labels here
 * are fixed phrases and a hash over them would favour some slots for ever.
 */
function choiceSlide(prompt: Block[], correct: string, distractors: string[], slot: number, tex: boolean): Slide {
  const rest = distractors.filter((label, idx) => label !== correct && distractors.indexOf(label) === idx);
  const at = slot % (rest.length + 1);
  const labels = [...rest.slice(0, at), correct, ...rest.slice(at)];
  return {
    kind: 'choice',
    prompt,
    options: labels.map((label, idx) => ({ id: `opt${idx}`, label, tex })),
    correctId: `opt${at}`,
  };
}

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/* ---------- A flight ---------- */

/**
 * Something launched straight up, with $g = 10$.
 *
 * `s` and `T` are the two roots of $h = 0$, as $-s$ and $T$: the landing time,
 * and how long before the launch it would have left the ground had it been
 * thrown from there. So the start height is $5sT$ and the launch speed
 * $5\left(T - s\right)$, both whole.
 */
interface Flight {
  s: number;
  T: number;
  /** Which situation it is dressed as; an index into `LAUNCHES`. */
  ctx: number;
}

interface Launch {
  noun: string;
  /** The opening sentence, given the start height and the launch speed. */
  opening: (h0: number, v: number) => string;
}

const LAUNCHES: readonly Launch[] = [
  {
    noun: 'ball',
    opening: (h0, v) =>
      h0 === 0
        ? `A ball is thrown straight up from the ground at ${v} m/s.`
        : `A ball is thrown straight up at ${v} m/s from a balcony ${h0} m high.`,
  },
  {
    noun: 'stone',
    opening: (h0, v) =>
      h0 === 0
        ? `A stone is flicked straight up from the beach at ${v} m/s.`
        : `A stone is flicked straight up at ${v} m/s from the top of ${aOrAn(h0)} ${h0} m cliff.`,
  },
  {
    noun: 'rocket',
    opening: (h0, v) =>
      h0 === 0
        ? `A model rocket leaves the ground at ${v} m/s, straight up.`
        : `A model rocket leaves a launch tower ${h0} m tall at ${v} m/s, straight up.`,
  },
  {
    noun: 'flare',
    opening: (h0, v) =>
      h0 === 0
        ? `A flare is fired straight up from a beach at ${v} m/s.`
        : `A flare is fired straight up at ${v} m/s from a lighthouse gallery ${h0} m up.`,
  },
];

const startOf = ({ s, T }: { s: number; T: number }): number => 5 * s * T;
const speedOf = ({ s, T }: { s: number; T: number }): number => 5 * (T - s);

/** `h = 30 + 25t - 5t^{2}`, or without the constant from the ground. */
function flightTex(h0: number, v: number): string {
  return `h = ${h0 === 0 ? '' : `${h0} + `}${v}t - 5t^{2}`;
}

/** The opening sentence and the model, as the top of a prompt. */
function flightIntro(f: Flight): Block[] {
  const h0 = startOf(f);
  const v = speedOf(f);
  return [
    prose(`${LAUNCHES[f.ctx].opening(h0, v)} Its height after $t$ seconds is $h$ metres, where`),
    display(flightTex(h0, v)),
  ];
}

/**
 * The height against time, from the launch to the landing only.
 *
 * `xMin` is 0 and the curve stops where the model stops, so the picture never
 * shows a height before the throw or below the ground. The vertical line at
 * the left edge is the $h$-axis.
 */
export function flightFigure(
  h0: number,
  v: number,
  opts: { xMax?: number; horizontal?: number; marks?: { x: number; y: number; hollow?: boolean }[]; label: string },
): string {
  const f = (t: number) => h0 + v * t - 5 * t * t;
  const land = (v + Math.sqrt(v * v + 20 * h0)) / 10;
  const peak = f(v / 10);
  const curves: Curve[] = [{ f: (t) => (t <= land + 1e-9 ? Math.max(f(t), 0) : NaN), breaks: true }];
  return plotSvg({
    xMin: 0,
    xMax: opts.xMax ?? Math.ceil(land) + 1,
    yMin: -peak * 0.08,
    yMax: peak * 1.15,
    curves,
    verticals: [{ x: 0, dashed: false }],
    horizontals: opts.horizontal === undefined ? [] : [opts.horizontal],
    marks: opts.marks ?? [],
    label: opts.label,
  });
}

/** A flight whose peak time is whole: the two roots differ by an even number. */
function drawEvenFlight(rng: Rng, sMin: number, sMax: number): Flight {
  const s = rng.int(sMin, sMax);
  const T = s + 2 * rng.int(1, Math.max(1, Math.floor((10 - s) / 2)));
  return { s, T, ctx: rng.int(0, LAUNCHES.length - 1) };
}

/** Any flight with a whole landing time up to 10 seconds. */
function drawFlight(rng: Rng, sMin: number, sMax: number): Flight {
  const s = rng.int(sMin, sMax);
  return { s, T: rng.int(s + 1, 10), ctx: rng.int(0, LAUNCHES.length - 1) };
}

/** The landing, worked from the model: set h = 0 and factorise. */
function landingSteps({ s, T }: { s: number; T: number }): SolutionStep[] {
  const h0 = startOf({ s, T });
  const v = speedOf({ s, T });
  return [
    { text: 'It is on the ground when $h = 0$.' },
    { tex: `${v}t - 5t^{2}${h0 === 0 ? '' : ` + ${h0}`} = 0` },
    { text: 'Divide through by $-5$ and factorise.' },
    { tex: `${quadIn(1, -(T - s), -s * T, 't')} = 0` },
    { tex: `${factorTex(T, 't')}${factorTex(-s, 't')} = 0` },
    {
      text:
        s === 0
          ? `So $t = 0$, the moment it is launched, or $t = ${T}$, when it comes back down.`
          : `So $t = ${T}$ or $t = ${-s}$. A negative time is before the launch, so it lands at $t = ${T}$.`,
    },
  ];
}

/* ---------- Lesson 1: building a model ---------- */

/**
 * Put the model together: start height, launch speed, and gravity.
 *
 * The one number not on the page is the 5, half of $g$, so the bank carries
 * the whole 10 beside it. Tiles rather than typing, since what is being
 * graded is where each number goes, and any rearrangement typed in would
 * pass a value check.
 */
const launchTiles: Generator<Flight> = {
  id: 'quad-model-launch-tiles',
  sample: (rng) => {
    // Two-digit numbers only: a tile row any wider wraps on a phone.
    let f = drawFlight(rng, 1, 3);
    while (f.s * f.T > 19) f = drawFlight(rng, 1, 3);
    return f;
  },
  render: (f): Slide => {
    const h0 = startOf(f);
    const v = speedOf(f);
    const answer = [`${h0}`, `${v}`, '5'];
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `${LAUNCHES[f.ctx].opening(h0, v)} Take $g = 10$. Build its height $h$ metres after $t$ seconds.`,
        ),
      ],
      template: 'h = {0} + {1}t - {2}t^2',
      bank: bankOf(answer, ['10', `${2 * v}`, `${h0 / 5}`]),
      answer,
    };
  },
  solution: (f) => {
    const h0 = startOf(f);
    const v = speedOf(f);
    return [
      { text: `It starts at $${h0}$ metres, so that is the constant: the height when $t = 0$.` },
      { text: `Moving up at $${v}$ m/s adds $${v}t$ metres after $t$ seconds.` },
      { text: 'Gravity takes off $\\frac{1}{2} \\times 10 \\times t^{2}$, which is $5t^{2}$: half of $g$, not all of it.' },
      { tex: flightTex(h0, v) },
    ];
  },
};

type AreaCtx = 'pen' | 'wall';

interface AreaParams {
  ctx: AreaCtx;
  /** Half the fence for a pen, the whole fence against a wall. */
  n: number;
}

/** The area of a pen as the learner reads it: `x(10 - x)` or `x(24 - 2x)`. */
function areaTex({ ctx, n }: AreaParams): string {
  return ctx === 'pen' ? `x(${n} - x)` : `x(${n} - 2x)`;
}

function areaStory({ ctx, n }: AreaParams): string {
  return ctx === 'pen'
    ? `A rectangular pen is made from ${2 * n} m of fencing. One side is $x$ m long.`
    : `A rectangular pen against a wall has ${n} m of fencing on its other three sides, the two meeting the wall $x$ m each.`;
}

/** The area model and its standard slips, for the pick-one form. */
function areaChoices({ ctx, n }: AreaParams): ChoiceOption[] {
  return ctx === 'pen'
    ? options(
        { tex: `A = x(${n} - x)`, answer: `x*(${n} - x)` },
        { tex: `A = x(${2 * n} - x)`, answer: `x*(${2 * n} - x)` },
        { tex: `A = x(${n} - 2x)`, answer: `x*(${n} - 2*x)` },
      { tex: `A = 2x + 2(${n} - x)`, answer: `2*x + 2*(${n} - x)` },
      )
    : options(
        { tex: `A = x(${n} - 2x)`, answer: `x*(${n} - 2*x)` },
        { tex: `A = x(${n} - x)`, answer: `x*(${n} - x)` },
        { tex: `A = 2x(${n} - 2x)`, answer: `2*x*(${n} - 2*x)` },
      { tex: `A = 2x + (${n} - 2x)`, answer: `2*x + (${n} - 2*x)` },
      );
}

/**
 * Write the area of a pen from its fence.
 *
 * Typed, because any correct writing of the area is a correct model: the
 * checker compares values, and $x(10 - x)$ and $10x - x^2$ are the same
 * function. The multiple-choice form offers the standard slips — the whole
 * fence as one side, the wall forgotten, and the perimeter itself.
 */
const areaModel: Generator<AreaParams> = {
  id: 'quad-model-area',
  choices: (params) => steered(areaChoices(params), params),
  sample: (rng, difficulty) => {
    const ctx: AreaCtx = rng.pick(difficulty > 1 ? ['pen', 'wall', 'wall'] : ['pen', 'pen', 'wall']);
    return ctx === 'pen'
      ? { ctx, n: rng.int(difficulty > 1 ? 12 : 5, difficulty > 1 ? 40 : 25) }
      : { ctx, n: 2 * rng.int(difficulty > 1 ? 8 : 5, difficulty > 1 ? 30 : 20) };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [prose(`${areaStory(params)} Write its area $A$ square metres in terms of $x$.`)],
    lead: 'A =',
    keypad: ALGEBRA_KEYS,
    answer: params.ctx === 'pen' ? `x*(${params.n} - x)` : `x*(${params.n} - 2*x)`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ ctx, n }) =>
    ctx === 'pen'
      ? [
          { text: `Two sides of $x$ use $2x$ of the fence, leaving $${2 * n} - 2x$ for the other two.` },
          { text: `So each of those is half of that, $${n} - x$.` },
          { tex: `A = x(${n} - x)` },
          { text: `Using the whole $${2 * n}$ for one side is the slip: a rectangle has two of each side.` },
        ]
      : [
          { text: `The two sides against the wall use $2x$, and the wall itself needs no fence.` },
          { text: `So the side facing the wall is what is left: $${n} - 2x$.` },
          { tex: `A = x(${n} - 2x)` },
        ],
};

interface EvalParams extends Flight {
  /** The time asked about, during the flight. */
  k: number;
}

/**
 * The height at a given time, worked one piece at a time.
 *
 * The square is the step that goes wrong: $5t^{2}$ at $t = 3$ is $5 \times 9$,
 * not $15^{2}$. A reduction puts the square strictly before the multiplication
 * that uses it, and the pick-one form offers exactly that slip.
 */
const flightEvaluate: Generator<EvalParams> = {
  id: 'quad-model-evaluate',
  choices: (params) => {
    const h0 = startOf(params);
    const v = speedOf(params);
    const { k } = params;
    const value = h0 + v * k - 5 * k * k;
    return steered(numberChoices(value, h0 + v * k - 25 * k * k, h0 + v * k - 10 * k, h0 + v * k + 5 * k * k), params);
  },
  sample: (rng, difficulty) => {
    const f = drawFlight(rng, difficulty > 1 ? 1 : 0, difficulty > 1 ? 4 : 2);
    const T = Math.max(f.T, 2);
    return { ...f, T, k: rng.int(1, T - 1) };
  },
  render: (params): Slide => {
    const h0 = startOf(params);
    const v = speedOf(params);
    const { k } = params;
    const square = pow(num(k), num(2));
    const gravity = bin('*', num(5), square);
    const lift = bin('*', num(v), num(k));
    const banks: Record<string, string[]> = {};
    let expr: Expr;
    if (h0 === 0) {
      expr = bin('-', lift, gravity);
      banks['r.l'] = offer(v * k, v + k);
      banks.r = offer(v * k - 5 * k * k, v * k - 25 * k * k);
    } else {
      expr = bin('-', bin('+', num(h0), lift), gravity);
      banks['r.l.r'] = offer(v * k, v + k);
      banks['r.l'] = offer(h0 + v * k, h0 * k + v, h0 + v);
      banks.r = offer(h0 + v * k - 5 * k * k, h0 + v * k - 25 * k * k);
    }
    banks['r.r'] = offer(5 * k * k, 25 * k * k, 10 * k);
    banks['r.r.r'] = offer(k * k, 2 * k);
    return {
      kind: 'reduce',
      prompt: [
        ...flightIntro(params),
        prose(`How high is the ${LAUNCHES[params.ctx].noun} after ${k} ${k === 1 ? 'second' : 'seconds'}? Tap the part you would do **next**, then choose what it comes to.`),
      ],
      expr,
      banks,
    };
  },
  solution: (params) => {
    const h0 = startOf(params);
    const v = speedOf(params);
    const { k } = params;
    const value = h0 + v * k - 5 * k * k;
    return [
      { text: `Square first: $${k}^{2} = ${k * k}$, so gravity has taken off $5 \\times ${k * k} = ${5 * k * k}$ metres.` },
      { text: `The climb is $${v} \\times ${k} = ${v * k}$ metres${h0 === 0 ? '' : `, on top of the $${h0}$ it started at`}.` },
      { tex: `h = ${h0 === 0 ? '' : `${h0} + `}${v * k} - ${5 * k * k}` },
      { tex: `h = ${value}` },
      { text: `So it is $${value}$ metres up. Squaring $5 \\times ${k}$ instead would take off $${25 * k * k}$.` },
    ];
  },
};

type Form = 'standard' | 'vertex' | 'factor';
type Meaning = 'start' | 'speed' | 'peakH' | 'peakT' | 'land';

const MEANINGS: Record<Meaning, string> = {
  start: 'The height it is launched from',
  speed: 'The speed it is launched at',
  peakH: 'The greatest height it reaches',
  peakT: 'The time it takes to reach the top',
  land: 'The time it hits the ground',
};

const MEANING_ORDER: readonly Meaning[] = ['start', 'speed', 'peakH', 'peakT', 'land'];

interface MeaningParams extends Flight {
  form: Form;
  asked: Meaning;
  /** Which of the four wrong meanings is left out of the options. */
  drop: number;
  slot: number;
}

/** The model in the form this question writes it, and the number it asks about. */
function meaningModel(params: MeaningParams): { tex: string; value: number } {
  const { s, T, form, asked } = params;
  const h0 = startOf(params);
  const v = speedOf(params);
  if (form === 'vertex') {
    const m = (T - s) / 2;
    const top = 5 * ((T + s) / 2) ** 2;
    return { tex: `h = ${top} - 5(t - ${m})^{2}`, value: asked === 'peakH' ? top : m };
  }
  if (form === 'factor') {
    return { tex: `h = 5(t + ${s})(${T} - t)`, value: T };
  }
  return { tex: flightTex(h0, v), value: asked === 'start' ? h0 : v };
}

/**
 * What does this number in the model tell you?
 *
 * Each form of the model puts a different fact on show: the standard form
 * its start and its speed, the completed square its peak, the factorised form
 * its landing. That is the reason to write a model more than one way, and the
 * reason this asks about the form rather than about the arithmetic.
 */
const meaning: Generator<MeaningParams> = {
  id: 'quad-model-meaning',
  sample: (rng, difficulty) => {
    const form: Form = difficulty > 1 ? rng.pick(['standard', 'vertex', 'factor'] as const) : 'standard';
    const asked: Meaning =
      form === 'vertex' ? rng.pick(['peakH', 'peakT'] as const) : form === 'factor' ? 'land' : rng.pick(['start', 'speed'] as const);
    // The number asked about must not be a 5, or "what does the 5 tell you"
    // could mean gravity's 5 as well: a launch speed of 5, a landing at 5.
    let f = form === 'vertex' ? drawEvenFlight(rng, 1, 4) : drawFlight(rng, 1, 4);
    for (let tries = 0; tries < 50; tries += 1) {
      const clash = (asked === 'speed' && speedOf(f) === 5) || (asked === 'land' && (f.T === 5 || f.T === f.s));
      if (!clash) break;
      f = drawFlight(rng, 1, 4);
    }
    return { ...f, form, asked, drop: rng.int(0, 3), slot: rng.int(0, 3) };
  },
  render: (params): Slide => {
    const { tex, value } = meaningModel(params);
    const wrong = MEANING_ORDER.filter((m) => m !== params.asked);
    const shown = wrong.filter((_, idx) => idx !== params.drop);
    return choiceSlide(
      [
        prose(`The height of a ${LAUNCHES[params.ctx].noun}, $h$ metres after $t$ seconds, is modelled by`),
        display(tex),
        prose(`What does the $${value}$ tell you about the ${LAUNCHES[params.ctx].noun}?`),
      ],
      MEANINGS[params.asked],
      shown.map((m) => MEANINGS[m]),
      params.slot,
      false,
    );
  },
  solution: (params) => {
    const { tex, value } = meaningModel(params);
    const steps: Record<Meaning, string> = {
      start: `Put $t = 0$: every term with a $t$ in it vanishes and $h = ${value}$. So it is the height at the moment of launch.`,
      speed: `The $${value}t$ term is the climb: $${value}$ metres for every second, before gravity takes its share. So it is the launch speed.`,
      peakH: `The squared part is never negative and is taken away, so $h$ is never more than $${value}$, and reaches it when the bracket is zero. So it is the greatest height.`,
      peakT: `The squared bracket is zero at $t = ${value}$, which is when $h$ is at its greatest. So it is the time of the peak.`,
      land: `The bracket $(${value} - t)$ is zero at $t = ${value}$, so $h = 0$ then: that is when it lands.`,
    };
    return [{ tex }, { text: steps[params.asked] }];
  },
};

/* ---------- Lesson 2: reading the graph ---------- */

/**
 * When does it land? Set $h = 0$ and keep the root that makes sense.
 *
 * From a height the other root is negative, and from the ground it is zero —
 * the launch itself. The multiple-choice form offers both, and the positive
 * root with its sign flipped.
 */
const landing: Generator<Flight> = {
  id: 'quad-model-land',
  choices: (f) => steered(f.s === 0 ? numberChoices(f.T, 0, 5 * f.T, 2 * f.T) : numberChoices(f.T, -f.s, f.s, f.T + f.s), f),
  sample: (rng, difficulty) => drawFlight(rng, difficulty > 1 ? 1 : 0, difficulty > 1 ? 5 : 3),
  render: (f): Slide => ({
    kind: 'expression',
    prompt: [
      ...flightIntro(f),
      prose(`After how many seconds does the ${LAUNCHES[f.ctx].noun} hit the ground?`),
      {
        kind: 'diagram',
        svg: flightFigure(startOf(f), speedOf(f), { label: `The height of the ${LAUNCHES[f.ctx].noun} against time` }),
      },
    ],
    lead: 't =',
    keypad: [],
    answer: `${f.T}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (f) => landingSteps(f),
};

const LAND_WINDOW = 12;

/**
 * Slide to the landing on the graph.
 *
 * The marker runs along the time axis, so the question is where the curve
 * comes back down to it. The window is fixed from 0 to 12 so where the
 * landing sits is a fact about the flight rather than about the frame.
 */
const landSlider: Generator<Flight> = {
  id: 'quad-model-land-slider',
  sample: (rng, difficulty) => drawFlight(rng, difficulty > 1 ? 1 : 0, difficulty > 1 ? 5 : 2),
  render: (f): Slide => {
    const h0 = startOf(f);
    const v = speedOf(f);
    return {
      kind: 'slider',
      prompt: [
        ...flightIntro(f),
        prose(`Slide to the time the ${LAUNCHES[f.ctx].noun} hits the ground.`),
      ],
      min: 0,
      max: LAND_WINDOW,
      step: 0.5,
      answer: f.T,
      readout: 't = {v}',
      figure: {
        svg: flightFigure(h0, v, { xMax: LAND_WINDOW, label: `The height of the ${LAUNCHES[f.ctx].noun} against time` }),
        ...markerWindow(0, LAND_WINDOW),
      },
    };
  },
  solution: (f) => landingSteps(f),
};

/**
 * The peak, from the factorised model, as a tree.
 *
 * The two roots are where $h = 0$; the peak is halfway between them, by
 * symmetry; its height is the model at that time. Every flight here has
 * roots an even distance apart, so the halfway time is whole.
 */
const peakTree: Generator<Flight> = {
  id: 'quad-model-peak-tree',
  sample: (rng, difficulty) => drawEvenFlight(rng, difficulty > 1 ? 1 : 0, difficulty > 1 ? 4 : 2),
  render: ({ s, T, ctx }): Slide => {
    const m = (T - s) / 2;
    const top = 5 * (m + s) * (T - m);
    const answer = [`${-s}`, `${T}`, `${m}`, `${top}`];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `The ${LAUNCHES[ctx].noun}'s height is modelled below. Bottom row: the two times when $h = 0$, earlier first. Then the time halfway between them, when it is highest, and its height then.`,
        ),
      ],
      expression: `h = 5${factorTex(-s, 't')}(${T} - t)`,
      nodes: [
        { id: 'left', from: [] },
        { id: 'right', from: [] },
        { id: 'mid', from: ['left', 'right'] },
        { id: 'top', from: ['mid'] },
      ],
      bank: treeBank(answer, [`${s + 1}`, `${-T}`, `${T - s}`, `${5 * m * m}`, `${top + 5}`, `${m + 1}`]),
      answer,
    };
  },
  solution: ({ s, T }) => {
    const m = (T - s) / 2;
    const top = 5 * (m + s) * (T - m);
    return [
      { text: `Each bracket is zero at one root: $t = ${-s}$ and $t = ${T}$.` },
      { text: `A parabola is symmetrical, so the peak is halfway: $\\frac{${-s} + ${T}}{2} = ${m}$.` },
      { tex: `h = 5 \\times ${m + s} \\times ${T - m}` },
      { tex: `h = ${top}` },
      { text: `So it is highest, $${top}$ metres up, after $${m}$ seconds.` },
    ];
  },
};

type Feature = 'root' | 'intercept' | 'peakX' | 'peakY';

const FEATURE_ORDER: readonly Feature[] = ['root', 'intercept', 'peakX', 'peakY'];

interface FeatureParams {
  ctx: 'flight' | 'profit';
  /** Flight: the roots are -s and T. Profit: the roots are s and T. */
  s: number;
  T: number;
  noun: number;
  asked: Feature;
  phrasing: number;
  slot: number;
}

const FLIGHT_ASKS: Record<Feature, readonly string[]> = {
  root: ['When does the {n} hit the ground?', 'How long is the {n} in the air?'],
  intercept: ['How high is the {n} at the moment it is launched?', 'What height does the {n} start from?'],
  peakX: ['When is the {n} at its highest?', 'How long does the {n} take to reach the top?'],
  peakY: ['How high does the {n} go?', 'What is the greatest height of the {n}?'],
};

const PROFIT_ASKS: Record<Feature, readonly string[]> = {
  root: ['At what price does the stall break even?', 'Which price makes the stall exactly zero profit, the higher of the two?'],
  intercept: ['How much does the stall lose if it gives the items away?', 'What are the stall’s fixed costs, the loss at a price of zero?'],
  peakX: ['What price gives the stall the most profit?', 'Which price should the stall charge to make as much as possible?'],
  peakY: ['What is the most profit the stall can make?', 'How much does the stall make at its best price?'],
};

function featureLabel(feature: Feature, across: string, up: string): string {
  return {
    root: `Where the curve meets the ${across}-axis`,
    intercept: `Where the curve meets the ${up}-axis`,
    peakX: `How far along the turning point is`,
    peakY: `How high the turning point is`,
  }[feature];
}

/**
 * Which feature of the graph answers this?
 *
 * The step before any algebra: a question in words names a point on the
 * curve, and knowing which one decides whether you want a root, the
 * intercept or the vertex. Two situations, so "the $x$-axis" is not always
 * the answer's axis.
 */
const feature: Generator<FeatureParams> = {
  id: 'quad-model-feature',
  sample: (rng, difficulty) => {
    const ctx = difficulty > 1 ? rng.pick(['flight', 'profit'] as const) : 'flight';
    const s = rng.int(1, 4);
    return {
      ctx,
      s,
      T: rng.int(s + 2, s + 8),
      noun: rng.int(0, LAUNCHES.length - 1),
      asked: rng.pick(FEATURE_ORDER),
      phrasing: rng.int(0, 1),
      slot: rng.int(0, 3),
    };
  },
  render: (params): Slide => {
    const { ctx, s, T, asked, phrasing, slot } = params;
    const flight = ctx === 'flight';
    const [across, up] = flight ? ['t', 'h'] : ['x', 'P'];
    const noun = LAUNCHES[params.noun].noun;
    const question = (flight ? FLIGHT_ASKS : PROFIT_ASKS)[asked][phrasing].replace('{n}', noun);
    const intro: Block[] = flight
      ? [
          prose(`A ${noun}'s height is $h$ metres after $t$ seconds, where`),
          display(flightTex(startOf({ s, T }), speedOf({ s, T }))),
          {
            kind: 'diagram',
            svg: flightFigure(startOf({ s, T }), speedOf({ s, T }), { label: `The height of the ${noun} against time` }),
          },
        ]
      : [
          prose('A stall makes $P$ pounds profit a day when it charges $x$ pounds an item, where'),
          display(`P = ${quadIn(-1, s + T, -s * T, 'x')}`),
          { kind: 'diagram', svg: profitFigure(s, T, 1, T + 2) },
        ];
    return choiceSlide(
      [...intro, prose(`${question} Which feature of the graph gives the answer?`)],
      featureLabel(asked, across, up),
      FEATURE_ORDER.filter((f) => f !== asked).map((f) => featureLabel(f, across, up)),
      slot,
      false,
    );
  },
  solution: ({ ctx, asked }) => {
    const flight = ctx === 'flight';
    const text: Record<Feature, string> = {
      root: flight
        ? 'Hitting the ground means $h = 0$: where the curve meets the time axis, after the launch.'
        : 'Breaking even means $P = 0$: where the curve meets the $x$-axis.',
      intercept: flight
        ? 'The launch is at $t = 0$: where the curve meets the height axis.'
        : 'A price of zero is $x = 0$: where the curve meets the $P$-axis, below zero because the costs still have to be paid.',
      peakX: flight
        ? 'The highest point is the turning point, and *when* is its time, how far along it is.'
        : 'The most profit is at the turning point, and the price is how far along it is.',
      peakY: flight
        ? 'The greatest height is how high the turning point is.'
        : 'The most profit is how high the turning point is.',
    };
    return [{ text: text[asked] }];
  },
};

/** A profit curve P = a(x - p)(q - x), from x = 0 to `xMax`. */
function profitFigure(p: number, q: number, a: number, xMax: number): string {
  const f = (x: number) => a * (x - p) * (q - x);
  const top = f((p + q) / 2);
  return plotSvg({
    xMin: 0,
    xMax,
    yMin: Math.max(f(0), -top * 1.5) - top * 0.08,
    yMax: top * 1.2,
    curves: [{ f, breaks: true }],
    verticals: [{ x: 0, dashed: false }],
    label: 'Profit against price, a hill crossing the price axis twice',
  });
}

/* ---------- Lesson 3: the greatest or least value ---------- */

interface CostParams {
  /** Where the least cost is. */
  h: number;
  /** The least cost. */
  k: number;
  ctx: number;
}

const COST_STORIES: readonly string[] = [
  'Making $x$ hundred chairs a week costs a workshop $C$ thousand pounds, with $C$ below.',
  'Running a machine at speed setting $x$ costs $C$ pounds an hour, with $C$ below.',
  'A bakery making $x$ hundred loaves a day spends $C$ tens of pounds, with $C$ below.',
];

/**
 * The least cost, by completing the square.
 *
 * $C = \left(x - h\right)^{2} + k$ is smallest when the bracket is zero,
 * so completing the square reads off the least cost and where it happens in
 * one go. Both $h$ and $k$ are positive: a negative number of chairs or a
 * negative cost would make a poor model.
 */
const costSteps: Generator<CostParams> = {
  id: 'quad-model-cost-steps',
  sample: (rng, difficulty) => ({
    h: rng.int(1, difficulty > 1 ? 9 : 6),
    k: rng.int(1, difficulty > 1 ? 30 : 20),
    ctx: rng.int(0, COST_STORIES.length - 1),
  }),
  render: ({ h, k, ctx }): Slide => {
    const square = h * h;
    const c = square + k;
    const bracket = `(x - ${h})^{2}`;
    const opened = `${bracket} - ${square}`;
    const finished = `${bracket} + ${k}`;
    return {
      kind: 'steps',
      prompt: [
        prose(
          `${COST_STORIES[ctx]} Complete the square for the least cost. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start: [`x^{2} - ${2 * h}x`, '+', `${c}`],
      reductions: [
        {
          span: [0, 1],
          value: opened,
          bank: scatter([opened, bracket, `(x - ${2 * h})^{2} - ${4 * square}`, `${bracket} + ${square}`, `(x + ${h})^{2} - ${square}`]),
        },
        {
          span: [0, 3],
          value: finished,
          bank: scatter([finished, `${bracket} + ${c + square}`, `${bracket} - ${k}`, `${bracket} + ${c}`, `(x - ${2 * h})^{2} + ${k}`]),
        },
      ],
    };
  },
  solution: ({ h, k }) => [
    { text: `Halve the $${2 * h}$: that goes in the bracket, and its square comes straight back off.` },
    { tex: `x^{2} - ${2 * h}x = (x - ${h})^{2} - ${h * h}` },
    { tex: `C = (x - ${h})^{2} + ${k}` },
    { text: `A square is never negative, so $C$ is least when the bracket is zero, at $x = ${h}$. The least cost is $${k}$.` },
  ],
};

interface MaxAreaParams {
  ctx: AreaCtx;
  n: number;
}

function maxArea({ ctx, n }: MaxAreaParams): { best: number; area: number; root: number } {
  return ctx === 'pen' ? { best: n / 2, area: (n * n) / 4, root: n } : { best: n / 4, area: (n * n) / 8, root: n / 2 };
}

/**
 * The greatest area, from the roots.
 *
 * The area is zero when $x = 0$ and when the other bracket is, so the best
 * side is halfway between — the vertex by symmetry, with no completing the
 * square needed. The slips are the best side itself, and the square of the
 * fence without the halving.
 */
const maxValue: Generator<MaxAreaParams> = {
  id: 'quad-model-max-value',
  choices: (params) => {
    const { ctx, n } = params;
    const { best, area } = maxArea(params);
    return steered(
      ctx === 'pen'
        ? numberChoices(area, best, n * n, (n * n) / 2)
        : numberChoices(area, best, (n * n) / 4, (n * n) / 16),
      params,
    );
  },
  sample: (rng, difficulty) => {
    const ctx: AreaCtx = rng.pick(['pen', 'wall']);
    return ctx === 'pen'
      ? { ctx, n: 2 * rng.int(difficulty > 1 ? 10 : 3, difficulty > 1 ? 30 : 20) }
      : { ctx, n: 4 * rng.int(difficulty > 1 ? 4 : 2, difficulty > 1 ? 20 : 12) };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`${areaStory(params)} Its area is $A$ square metres, where`),
      display(`A = ${areaTex(params)}`),
      prose('What is the greatest area the pen can have?'),
    ],
    lead: '\\text{greatest area} =',
    keypad: [],
    answer: `${maxArea(params).area}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { ctx, n } = params;
    const { best, area, root } = maxArea(params);
    return [
      { text: `$A = 0$ when $x = 0$ and when $x = ${root}$, the two ends of what the model allows.` },
      { text: `The greatest area is halfway between, at $x = ${best}$.` },
      { tex: `A = ${best}(${n} - ${ctx === 'pen' ? best : 2 * best})` },
      { tex: `A = ${area}` },
      { text: `So the greatest area is $${area}$ square metres${ctx === 'pen' ? `: a square, $${best}$ by $${best}$` : ''}.` },
    ];
  },
};

type BestCtx = 'pen' | 'wall' | 'profit';

interface BestParams {
  ctx: BestCtx;
  /** The fence for pen and wall; the lower break-even price for profit. */
  n: number;
  /** The higher break-even price, for profit only. */
  q: number;
}

const BEST_WINDOW = 24;

function bestOf({ ctx, n, q }: BestParams): number {
  return ctx === 'pen' ? n / 2 : ctx === 'wall' ? n / 4 : (n + q) / 2;
}

/**
 * Slide to the input that gives the best output.
 *
 * The answer is a position along the axis — the side length, or the price —
 * not the greatest value itself, which is the distinction the lesson keeps
 * coming back to. The window is fixed at 0 to 24.
 */
const bestSlider: Generator<BestParams> = {
  id: 'quad-model-best-slider',
  sample: (rng, difficulty) => {
    const ctx: BestCtx = rng.pick(difficulty > 1 ? ['wall', 'profit', 'profit'] : ['pen', 'wall', 'profit']);
    if (ctx === 'pen') return { ctx, n: 2 * rng.int(3, 11), q: 0 };
    if (ctx === 'wall') return { ctx, n: 4 * rng.int(2, 11), q: 0 };
    const p = rng.int(1, 10);
    return { ctx, n: p, q: p + 2 * rng.int(2, Math.floor((BEST_WINDOW - 2 - p) / 2)) };
  },
  render: (params): Slide => {
    const { ctx, n, q } = params;
    const area = ctx !== 'profit';
    const f = ctx === 'pen' ? (x: number) => x * (n - x) : ctx === 'wall' ? (x: number) => x * (n - 2 * x) : (x: number) => (x - n) * (q - x);
    const end = ctx === 'pen' ? n : n / 2;
    const top = f(bestOf(params));
    const curve: Curve = area ? { f: (x) => (x <= end + 1e-9 ? f(x) : NaN), breaks: true } : { f, breaks: true };
    return {
      kind: 'slider',
      prompt: area
        ? [
            prose(`${areaStory({ ctx, n })} Its area is $A$ square metres, where`),
            display(`A = ${areaTex({ ctx, n })}`),
            prose('Slide to the $x$ that gives the greatest area.'),
          ]
        : [
            prose('A stall makes $P$ pounds profit a day when it charges $x$ pounds an item, where'),
            display(`P = (x - ${n})(${q} - x)`),
            prose('Slide to the price that makes the most profit.'),
          ],
      min: 0,
      max: BEST_WINDOW,
      step: 1,
      answer: bestOf(params),
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: BEST_WINDOW,
          yMin: area ? -top * 0.08 : -top * 0.6,
          yMax: top * 1.2,
          curves: [curve],
          verticals: [{ x: 0, dashed: false }],
          label: area ? 'Area against side length, a hill starting from zero' : 'Profit against price, a hill crossing the price axis twice',
        }),
        ...markerWindow(0, BEST_WINDOW),
      },
    };
  },
  solution: (params) => {
    const { ctx, n, q } = params;
    const best = bestOf(params);
    const [lo, hi] = ctx === 'pen' ? [0, n] : ctx === 'wall' ? [0, n / 2] : [n, q];
    return [
      {
        text: `The ${ctx === 'profit' ? 'profit' : 'area'} is zero at $x = ${lo}$ and $x = ${hi}$, where a bracket is zero.`,
      },
      { text: 'The curve is symmetrical, so the top of the hill is halfway between.' },
      { tex: `x = \\frac{${lo} + ${hi}}{2} = ${best}` },
    ];
  },
};

type VertexCtx = 'pen' | 'wall' | 'flight';

interface VertexParams extends Flight {
  form: VertexCtx;
  /**
   * The fence: twice an even number for a pen, a multiple of 4 against a
   * wall, so the best side is whole either way.
   */
  n: number;
}

/** The best side and the greatest area of a pen. */
function penVertex({ form, n }: VertexParams): { best: number; area: number } {
  return form === 'pen' ? { best: n / 2, area: (n * n) / 4 } : { best: n / 4, area: (n * n) / 8 };
}

/**
 * Write the model with its peak on show.
 *
 * $A = x\left(10 - x\right) = 25 - \left(x - 5\right)^{2}$: the greatest area
 * and the side that gives it, both readable at a glance. Tiles, because the
 * form is the point — a typed answer would accept the question copied back.
 * The numbers stay at three digits or fewer, since a tile row wider than the
 * phone wraps its closing bracket onto a line of its own.
 */
const vertexTiles: Generator<VertexParams> = {
  id: 'quad-model-vertex-tiles',
  sample: (rng, difficulty) => {
    const form: VertexCtx = rng.pick(difficulty > 1 ? ['wall', 'flight', 'flight'] : ['pen', 'pen', 'wall']);
    const n = form === 'pen' ? 2 * rng.int(2, 22) : 4 * rng.int(2, difficulty > 1 ? 14 : 10);
    return { ...drawEvenFlight(rng, 0, 4), form, n };
  },
  render: (params): Slide => {
    if (params.form !== 'flight') {
      const { form, n } = params;
      const { best, area } = penVertex(params);
      const answer = [`${area}`, `${best}`];
      return {
        kind: 'tiles',
        prompt: [
          prose(`${areaStory({ ctx: form, n })} Its area is $A = ${areaTex({ ctx: form, n })}$ square metres. Write it with its greatest value on show.`),
        ],
        template: form === 'pen' ? 'A = {0} - (x - {} {1})^2' : 'A = {0} - 2(x - {} {1})^2',
        bank: bankOf(answer, [`${2 * best}`, `${-best}`, `${-area}`, `${best * best}`]),
        answer,
      };
    }
    const { s, T } = params;
    const m = (T - s) / 2;
    const top = 5 * ((T + s) / 2) ** 2;
    const answer = [`${top}`, `${m}`];
    return {
      kind: 'tiles',
      prompt: [...flightIntro(params), prose('Write the model with its greatest height on show.')],
      template: 'h = {0} - 5(t - {} {1})^2',
      bank: bankOf(answer, [`${5 * m * m}`, `${T + s}`, `${T}`, `${2 * m}`]),
      answer,
    };
  },
  solution: (params) => {
    if (params.form !== 'flight') {
      const { form, n } = params;
      const { best, area } = penVertex(params);
      const lead = form === 'pen' ? '' : '2';
      return [
        { tex: `A = ${n}x - ${lead}x^{2}` },
        {
          text: `Take out $-${lead || 1}$ and complete the square inside: $x^{2} - ${2 * best}x = (x - ${best})^{2} - ${best * best}$.`,
        },
        { tex: `A = ${area} - ${lead}(x - ${best})^{2}` },
        { text: `So the greatest area is $${area}$, when $x = ${best}$.` },
      ];
    }
    const { s, T } = params;
    const m = (T - s) / 2;
    const top = 5 * ((T + s) / 2) ** 2;
    return [
      { text: `Take out $-5$: $h = -5(t^{2} - ${T - s}t${s === 0 ? '' : ` - ${s * T}`})$.` },
      { text: `Complete the square inside: $t^{2} - ${T - s}t = (t - ${m})^{2} - ${m * m}$.` },
      { tex: `h = ${top} - 5(t - ${m})^{2}` },
      { text: `So it is highest, $${top}$ metres, at $t = ${m}$.` },
    ];
  },
};

/* ---------- Lesson 4: when it reaches a value ---------- */

type Reach = 'up' | 'down' | 'only' | 'long';

/**
 * A flight that passes a given height at two whole times.
 *
 * Built from those times: $h - H = -5\left(t - t_1\right)\left(t - t_2\right)$
 * gives $v = 5\left(t_1 + t_2\right)$ and $H = h_0 + 5t_1t_2$. For `only`,
 * $t_1$ is negative — the height was passed before the launch, from below a
 * start that is already above it.
 */
interface ReachParams {
  h0: number;
  t1: number;
  t2: number;
  ctx: number;
  ask: Reach;
}

const reachSpeed = ({ t1, t2 }: ReachParams): number => 5 * (t1 + t2);
const reachHeight = ({ h0, t1, t2 }: ReachParams): number => h0 + 5 * t1 * t2;

function drawReach(rng: Rng, asks: readonly Reach[], avoidUnitSum = false): ReachParams {
  const ask = rng.pick(asks);
  const ctx = rng.int(0, LAUNCHES.length - 1);
  for (let tries = 0; tries < 200; tries += 1) {
    if (ask === 'only') {
      const t1 = -rng.int(1, 3);
      const t2 = rng.int(-t1 + 1, 7);
      if (avoidUnitSum && t1 + t2 === 1) continue;
      return { h0: 5 * (-t1 * t2 + rng.int(1, 6)), t1, t2, ctx, ask };
    }
    const t1 = rng.int(1, 4);
    const t2 = rng.int(t1 + 1, 8);
    return { h0: 5 * rng.int(0, 8), t1, t2, ctx, ask };
  }
  return { h0: 15, t1: -1, t2: 3, ctx, ask };
}

function reachQuestion(params: ReachParams): string {
  const H = reachHeight(params);
  const noun = LAUNCHES[params.ctx].noun;
  return {
    up: `When does the ${noun} first reach ${H} m?`,
    down: `When is the ${noun} ${H} m up again, on its way back down?`,
    only: `When is the ${noun} ${H} m above the ground?`,
    long: `For how many seconds is the ${noun} more than ${H} m up?`,
  }[params.ask];
}

function reachIntro(params: ReachParams): Block[] {
  const v = reachSpeed(params);
  return [
    prose(`${LAUNCHES[params.ctx].opening(params.h0, v)} Its height after $t$ seconds is $h$ metres, where`),
    display(flightTex(params.h0, v)),
  ];
}

function reachAnswer({ t1, t2, ask }: ReachParams): number {
  return ask === 'up' ? t1 : ask === 'long' ? t2 - t1 : t2;
}

/** Set h = H, rearrange, factorise, then say which root the question wants. */
function reachSteps(params: ReachParams): SolutionStep[] {
  const { h0, t1, t2, ask } = params;
  const H = reachHeight(params);
  const v = reachSpeed(params);
  const last: Record<Reach, string> = {
    up: `Both times are after the launch. On the way up is the earlier one: $t = ${t1}$.`,
    down: `Both times are after the launch. On the way down is the later one: $t = ${t2}$.`,
    only: `$t = ${t1}$ is before the launch, so it does not count. The answer is $t = ${t2}$.`,
    long: `It goes above $${H}$ m at $t = ${t1}$ and comes back down through it at $t = ${t2}$: $${t2} - ${t1} = ${t2 - t1}$ seconds.`,
  };
  return [
    { text: `Set $h = ${H}$ and bring everything to one side.` },
    { tex: `${h0 === 0 ? '' : `${h0} + `}${v}t - 5t^{2} = ${H}` },
    { text: 'Divide through by $-5$ and factorise.' },
    { tex: `${quadIn(1, -(t1 + t2), t1 * t2, 't')} = 0` },
    { tex: `${factorTex(t1, 't')}${factorTex(t2, 't')} = 0` },
    { text: last[ask] },
  ];
}

const NEG_YES = 'Yes, one is negative';
const NEG_NO = 'No, both are positive';
const KEEP_ONE = 'Only the positive time';
const KEEP_BOTH = 'Both times';
const EARLIER = 'The earlier time';
const LATER = 'The later time';

/**
 * Two roots, one answer: which one?
 *
 * The algebra gives two times whenever a flight passes a height, and the
 * situation decides what they mean — one may be before the launch, and if
 * not, one is on the way up and the other on the way down. Walked as
 * decisions so that "take the positive one" is not a habit that answers
 * every question.
 */
const reachFlow: Generator<ReachParams> = {
  id: 'quad-model-reach-flow',
  sample: (rng, difficulty) => drawReach(rng, difficulty > 1 ? ['up', 'down', 'only', 'only'] : ['up', 'down', 'only']),
  render: (params): Slide => {
    const { t1, t2, ask } = params;
    const noun = LAUNCHES[params.ctx].noun;
    return {
      kind: 'flow',
      prompt: [
        ...reachIntro(params),
        prose(`${reachQuestion(params)} Solving gives $t = ${t1}$ or $t = ${t2}$. Which answers it?`),
      ],
      subject: `h = ${reachHeight(params)}`,
      steps: [
        {
          id: 'sign',
          ask: 'Is either of the two times negative?',
          branches: [
            { label: NEG_YES, to: 'neg' },
            { label: NEG_NO, to: 'pos' },
          ],
        },
        {
          id: 'neg',
          ask: 'A negative time is before the launch. What does that leave?',
          branches: [
            { label: KEEP_ONE, outcome: 'One answer: the positive time.' },
            { label: KEEP_BOTH, outcome: 'Two answers: both times.' },
          ],
        },
        {
          id: 'pos',
          ask: `The ${noun} passes this height going up, then again coming down. Which does the question want?`,
          branches: [
            { label: EARLIER, outcome: 'The smaller root: on the way up.' },
            { label: LATER, outcome: 'The larger root: on the way down.' },
          ],
        },
      ],
      answer: ask === 'only' ? [NEG_YES, KEEP_ONE] : [NEG_NO, ask === 'up' ? EARLIER : LATER],
    };
  },
  solution: (params) => reachSteps(params),
};

/**
 * Set the model equal to a height and tidy it into a quadratic to solve.
 *
 * Two moves: everything to one side, then divide by $-5$. The bank carries
 * the result of skipping either — the launch speed undivided, the height
 * never subtracted — and each coefficient with its sign flipped.
 */
const reachTiles: Generator<ReachParams> = {
  id: 'quad-model-reach-tiles',
  sample: (rng, difficulty) => drawReach(rng, difficulty > 1 ? ['up', 'only'] : ['up'], true),
  render: (params): Slide => {
    const { h0, t1, t2 } = params;
    const H = reachHeight(params);
    const v = reachSpeed(params);
    const answer = [signedTile(-(t1 + t2)), signedTile(t1 * t2)];
    return {
      kind: 'tiles',
      prompt: [
        ...reachIntro(params),
        prose(`Set $h = ${H}$ and rearrange into this form.`),
      ],
      template: 't^2 {0}t {1} = 0',
      bank: bankOf(answer, [
        signedTile(t1 + t2),
        signedTile(-t1 * t2),
        signedTile(-v),
        signedTile(H - h0),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { h0, t1, t2 } = params;
    const H = reachHeight(params);
    const v = reachSpeed(params);
    return [
      { tex: `${h0 === 0 ? '' : `${h0} + `}${v}t - 5t^{2} = ${H}` },
      { text: `Take $${H}$ from both sides.` },
      { tex: `${quadIn(-5, v, h0 - H, 't')} = 0` },
      { text: `Divide every term by $-5$, signs included: $${v} \\div (-5) = ${-v / 5}$ and $${h0 - H} \\div (-5) = ${(H - h0) / 5}$.` },
      { tex: `${quadIn(1, -(t1 + t2), t1 * t2, 't')} = 0` },
    ];
  },
};

/**
 * When is it at this height? A typed time, after deciding which root.
 *
 * At difficulty 2 it can also ask how long the flight spends above the
 * height — the gap between the roots, which is neither of them.
 */
const reachTime: Generator<ReachParams> = {
  id: 'quad-model-reach-time',
  choices: (params) => {
    const { t1, t2, ask } = params;
    const opts =
      ask === 'up'
        ? numberChoices(t1, t2, t2 - t1, t1 + t2)
        : ask === 'down'
          ? numberChoices(t2, t1, t2 - t1, t1 + t2)
          : ask === 'only'
            ? numberChoices(t2, t1, -t1, t2 - t1)
            : numberChoices(t2 - t1, t1, t2, t1 + t2);
    return steered(opts, params);
  },
  sample: (rng, difficulty) =>
    drawReach(rng, difficulty > 1 ? ['down', 'only', 'long', 'long'] : ['up', 'down', 'only']),
  render: (params): Slide => {
    const H = reachHeight(params);
    return {
      kind: 'expression',
      prompt: [
        ...reachIntro(params),
        prose(reachQuestion(params)),
        {
          kind: 'diagram',
          svg: flightFigure(params.h0, reachSpeed(params), {
            horizontal: H,
            label: `The height against time, with a dashed line at ${H} m`,
          }),
        },
      ],
      lead: params.ask === 'long' ? '\\text{time} =' : 't =',
      keypad: [],
      answer: `${reachAnswer(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => reachSteps(params),
};

/* ---------- Lesson 5: fitting a quadratic ---------- */

type FitCtx = 'arch' | 'cable' | 'curve';

interface FitVertexParams {
  ctx: FitCtx;
  a: number;
  m: number;
  K: number;
  /** The given point's x, relative to the turning point. */
  d: number;
}

function fitPoint({ a, m, K, d }: FitVertexParams): { x0: number; y0: number } {
  return { x0: m + d, y0: K + a * d * d };
}

/**
 * Find $a$ from the turning point and one more point.
 *
 * $y = a\left(x - m\right)^{2} + K$ has the turning point built in, so one
 * more point leaves only $a$ to find. The slips: the square forgotten, and
 * the rise not divided at all.
 */
const fitVertex: Generator<FitVertexParams> = {
  id: 'quad-model-fit-vertex',
  choices: (params) => {
    const { a, d } = params;
    return steered(numberChoices(a, -a, a * d, a * d * d), params);
  },
  sample: (rng, difficulty) => {
    const ctx: FitCtx = difficulty > 1 ? rng.pick(['arch', 'curve', 'curve'] as const) : rng.pick(['arch', 'cable'] as const);
    const m = rng.int(2, 6);
    if (ctx === 'arch') {
      const a = -rng.int(1, 5);
      return { ctx, a, m, K: -a * m * m, d: -m };
    }
    if (ctx === 'cable') return { ctx, a: rng.int(1, 4), m, K: rng.int(2, 12), d: -m };
    let a = rng.int(-5, 5);
    if (a === 0) a = 2;
    let d = rng.int(-3, 3);
    if (d === 0 || d === 1 || d === -1) d = d === -1 ? -2 : 2;
    return { ctx, a, m, K: rng.int(-10, 20), d };
  },
  render: (params): Slide => {
    const { ctx, m, K } = params;
    const { x0, y0 } = fitPoint(params);
    const story =
      ctx === 'arch'
        ? `An arch's highest point is $${K}$ m up, $${m}$ m along from one foot, which is at the origin.`
        : ctx === 'cable'
          ? `A cable hangs between two posts. Its lowest point is $(${m}, ${K})$ and it is tied to the left post at $(0, ${y0})$, in metres.`
          : `A quadratic model has its turning point at $(${m}, ${K})$ and passes through $(${x0}, ${y0})$.`;
    return {
      kind: 'expression',
      prompt: [
        prose(`${story} So it has the form below. Find $a$.`),
        display(`y = a(x - ${m})^{2}${turningShift(K)}`),
      ],
      lead: 'a =',
      keypad: [],
      answer: `${params.a}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, m, K, d } = params;
    const { x0, y0 } = fitPoint(params);
    return [
      { text: `Put the point $(${x0}, ${y0})$ in.` },
      { tex: `${y0} = a(${x0} - ${m})^{2}${turningShift(K)}` },
      { tex: `${y0 - K} = ${coefficientTex(d * d)}a` },
      { tex: `a = ${a}` },
      { text: `Forgetting to square $${bracketed(d)}$ would give $${(y0 - K) / d}$.` },
    ];
  },
};

interface FitRootsParams {
  a: number;
  r1: number;
  r2: number;
  x0: number;
  phrasing: number;
}

function fitY({ a, r1, r2, x0 }: FitRootsParams): number {
  return a * (x0 - r1) * (x0 - r2);
}

function drawFitRoots(rng: Rng, leads: readonly number[]): FitRootsParams {
  for (let tries = 0; tries < 200; tries += 1) {
    const a = rng.pick(leads);
    const r1 = rng.int(-6, 5);
    const r2 = rng.int(r1 + 1, 8);
    const x0 = rng.int(-4, 9);
    if (r1 === 0 || r2 === 0 || r1 + r2 === 0) continue;
    if (x0 === r1 || x0 === r2) continue;
    return { a, r1, r2, x0, phrasing: rng.int(0, 2) };
  }
  return { a: 2, r1: -1, r2: 4, x0: 2, phrasing: 0 };
}

function fitRootsStory(params: FitRootsParams): string {
  const { r1, r2, x0 } = params;
  const y0 = fitY(params);
  return [
    `A quadratic curve crosses the $x$-axis at $x = ${r1}$ and $x = ${r2}$, and passes through $(${x0}, ${y0})$.`,
    `A model has roots $${r1}$ and $${r2}$, and gives $y = ${y0}$ when $x = ${x0}$.`,
    `A parabola meets the $x$-axis at $(${r1}, 0)$ and $(${r2}, 0)$ and goes through $(${x0}, ${y0})$.`,
  ][params.phrasing];
}

/**
 * From the roots and a point to $y = ax^{2} + bx + c$.
 *
 * The roots give the brackets, the point gives $a$, and expanding gives $b$
 * and $c$ — with $a$ multiplied through, which is the step the bank's slips
 * leave out.
 */
const fitAbc: Generator<FitRootsParams> = {
  id: 'quad-model-fit-abc',
  sample: (rng, difficulty) => drawFitRoots(rng, difficulty > 1 ? [2, -2, 3, -3, 4, -4] : [2, 3, -2]),
  render: (params): Slide => {
    const { a, r1, r2 } = params;
    const b = -a * (r1 + r2);
    const c = a * r1 * r2;
    const answer = [numberTile(a), signedTile(b), signedTile(c)];
    return {
      kind: 'tiles',
      prompt: [prose(`${fitRootsStory(params)} Write its equation as $y = ax^{2} + bx + c$.`)],
      template: 'y = {0}x^2 {1}x {2}',
      bank: bankOf(answer, [numberTile(-a), signedTile(-b), signedTile(-c), signedTile(-(r1 + r2)), signedTile(r1 * r2)]),
      answer,
    };
  },
  solution: (params) => {
    const { a, r1, r2, x0 } = params;
    const y0 = fitY(params);
    const product = (x0 - r1) * (x0 - r2);
    return [
      { tex: `y = a${factorTex(r1)}${factorTex(r2)}` },
      { text: `At $x = ${x0}$ the brackets multiply to $${bracketed(x0 - r1)} \\times ${bracketed(x0 - r2)} = ${product}$, so $${coefficientTex(product)}a = ${y0}$ and $a = ${a}$.` },
      { text: 'Expand the brackets, then multiply every term by $a$.' },
      { tex: `y = ${coefficientTex(a)}(${quadIn(1, -(r1 + r2), r1 * r2, 'x')})` },
      { tex: `y = ${quadIn(a, -a * (r1 + r2), a * r1 * r2, 'x')}` },
    ];
  },
};

/**
 * Finding $a$ from the roots and a point, as a tree.
 *
 * Each bracket at the point, their product, then $a$ as the point's height
 * divided by that product. The shape is the working: two strands meeting,
 * then one division.
 */
const fitATree: Generator<FitRootsParams> = {
  id: 'quad-model-fit-a-tree',
  sample: (rng, difficulty) => drawFitRoots(rng, difficulty > 1 ? [2, -2, 3, -3, 4, -4, 5, -5] : [1, 2, 3, -1, -2]),
  render: (params): Slide => {
    const { a, r1, r2, x0 } = params;
    const first = x0 - r1;
    const second = x0 - r2;
    const product = first * second;
    const y0 = fitY(params);
    const answer = [`${first}`, `${second}`, `${product}`, `${a}`];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `${fitRootsStory(params)} Find $a$: each bracket at $x = ${x0}$, their product, then $a$ from $y = ${y0}$.`,
        ),
      ],
      expression: `y = a${factorTex(r1)}${factorTex(r2)}`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'product', from: ['first', 'second'] },
        { id: 'a', from: ['product'] },
      ],
      bank: treeBank(answer, [`${x0 + r1}`, `${x0 + r2}`, `${-product}`, `${-a}`, `${first + second}`, `${a + 1}`]),
      answer,
    };
  },
  solution: (params) => {
    const { a, r1, r2, x0 } = params;
    const first = x0 - r1;
    const second = x0 - r2;
    const y0 = fitY(params);
    return [
      { text: `At $x = ${x0}$: $${x0} - ${bracketed(r1)} = ${first}$ and $${x0} - ${bracketed(r2)} = ${second}$.` },
      { text: `Their product is $${first * second}$, so` },
      { tex: `${y0} = ${coefficientTex(first * second)}a` },
      { tex: `a = ${a}` },
    ];
  },
};

type SpanCtx = 'tunnel' | 'bridge' | 'jet';

interface SpanParams {
  ctx: SpanCtx;
  a: number;
  /** The span between the two feet: always even. */
  w: number;
  slot: number;
}

const spanHeight = ({ a, w }: SpanParams): number => (a * w * w) / 4;

/**
 * Which equation fits a span and a height?
 *
 * Feet at $0$ and $w$ give $y = ax\left(w - x\right)$, and the height in the
 * middle fixes $a$. The wrong options are the half-span in the bracket, the
 * height used as the coefficient, and a U-shaped curve with the right vertex.
 */
const spanChoice: Generator<SpanParams> = {
  id: 'quad-model-fit-span',
  sample: (rng, difficulty) => ({
    ctx: rng.pick(['tunnel', 'bridge', 'jet'] as const),
    a: rng.int(1, difficulty > 1 ? 4 : 2),
    w: 2 * rng.int(2, difficulty > 1 ? 7 : 6),
    slot: rng.int(0, 3),
  }),
  render: (params): Slide => {
    const { ctx, a, w, slot } = params;
    const H = spanHeight(params);
    const half = w / 2;
    const story = {
      tunnel: `A tunnel entrance is ${w} m wide at the ground and ${H} m high in the middle.`,
      bridge: `A bridge arch spans ${w} m between its feet and rises ${H} m at its centre.`,
      jet: `A jet of water leaves the ground, lands ${w} m away and is ${H} m high at the top.`,
    }[ctx];
    return choiceSlide(
      [prose(`${story} With $x$ metres measured from where it starts, which equation gives its height $y$ metres?`)],
      `y = ${coefficientTex(a)}x(${w} - x)`,
      [
        `y = ${coefficientTex(a)}x(${half} - x)`,
        `y = ${H}x(${w} - x)`,
        `y = ${coefficientTex(a)}(x - ${half})^{2} + ${H}`,
      ],
      slot,
      true,
    );
  },
  solution: (params) => {
    const { a, w } = params;
    const H = spanHeight(params);
    const half = w / 2;
    return [
      { text: `The feet are where $y = 0$: at $x = 0$ and $x = ${w}$. So the model is $y = ax(${w} - x)$.` },
      { text: `The top is halfway, at $x = ${half}$, where $y = ${half} \\times ${half}a = ${half * half}a$.` },
      { tex: `${half * half}a = ${H}` },
      { tex: `a = ${a}` },
      { text: `A $+(x - ${half})^{2}$ curve is U-shaped: its turning point is a lowest point, not a top.` },
    ];
  },
};

export const modellingGenerators = [
  launchTiles,
  areaModel,
  flightEvaluate,
  meaning,
  landing,
  landSlider,
  peakTree,
  feature,
  costSteps,
  maxValue,
  bestSlider,
  vertexTiles,
  reachFlow,
  reachTiles,
  reachTime,
  fitVertex,
  fitAbc,
  fitATree,
  spanChoice,
] as unknown as Generator<unknown>[];
