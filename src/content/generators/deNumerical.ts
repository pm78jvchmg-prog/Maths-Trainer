/**
 * Differential Equations, Level 7: numerical solutions.
 *
 * Euler's method itself is Numerical Methods' "Euler's Method": one tangent
 * step, stepping on, f with y in it, against the exact answer. This level
 * starts from there and goes further.
 *
 * - Euler on a model (`de-num-model-*`): cooling, warming and a mixing tank,
 *   `dx/dt = k(L - x)` in one of its dresses. The step collects up into
 *   `x_{n+1} = m x_n + c` with `m = 1 - hk`, which is why the estimates settle
 *   on L, and why too long a step makes them swing or blow up.
 * - The improved Euler method (`de-num-heun-*`): k_1 at the start, a predicted
 *   y at the end, k_2 there, and the average of the two.
 * - The midpoint formula (`de-num-mid-*`): `y_{r+1} = y_{r-1} + 2h f(x_r, y_r)`,
 *   started by one Euler step.
 * - Second-order equations (`de-num-second-*`): `z = dy/dx` turns one
 *   second-order equation into two first-order ones, and Euler steps both.
 * - Step size and accuracy (`de-num-halve`, `-closer-flow`, `-ratio-slider`,
 *   `-order-choice`): halving h roughly halves Euler's error and quarters the
 *   improved method's, checked against an exact solution y = p(x) whose
 *   equation `dy/dx = y + p'(x) - p(x)` an integrating factor solves.
 *
 * Every value the learner works out is an exact short decimal. That is chosen,
 * not rounded: a model's multiplier `1 - hk` and its starting gap are drawn
 * together so that four rows of an iteration table stop at two places, and
 * every other draw is refused unless each value it writes terminates within
 * four places. So `iterate` rows are exact tokens with no rounding to argue
 * over, and typed answers are exact.
 *
 * No slide declares `source`, `integrand` or `limits`: every number here is an
 * estimate, not a derivative or an integral, and the oracle would mark it
 * against the exact value. `deNumerical.test.ts` recomputes each answer from
 * the parameters by its own route (closed forms, the formula as the textbook
 * writes it, mathjs for the exact solutions).
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { plotFigure, plotSvg } from '../figures';
import { say } from './format';
import { ITERATES, written } from './iterationTable';
import { fmt } from './numericalMethods';
import { turned } from './parametricImplicit';

/* ---------- Shared helpers ---------- */

const show = (tex: string): Block => ({ kind: 'display', tex });

/** Float dust off a value built from exact decimals. */
export const clean = (value: number) => Number(value.toFixed(9));

/** Whether a value is an exact decimal of at most `dp` places. */
export function short(value: number, dp = 4): boolean {
  if (!Number.isFinite(value)) return false;
  const scaled = value * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** A number as a factor or an argument, bracketed when negative. */
const paren = (value: number): string => (value < 0 ? `(${fmt(value)})` : fmt(value));

/** Lines of working stacked on their `&`. */
const aligned = (...lines: string[]): string => `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;

/** `+ 3` or `- 3`, for a number added on at the end of a line. */
const plus = (value: number): string => (value < 0 ? `- ${fmt(-value)}` : `+ ${fmt(value)}`);

/** Terms as they are read: `2x - 0.5y + 3`. A letter's coefficient of 1 is dropped. */
export function sumTex(terms: [number, string][]): string {
  const out: string[] = [];
  for (const [c, letter] of terms) {
    if (c === 0) continue;
    const size = Math.abs(c);
    const body = letter === '' ? fmt(size) : `${size === 1 ? '' : fmt(size)}${letter}`;
    out.push(out.length === 0 ? (c < 0 ? `-${body}` : body) : c < 0 ? `- ${body}` : `+ ${body}`);
  }
  return out.length === 0 ? '0' : out.join(' ');
}

/** The same terms with numbers put in for the letters: `2 \times 0.2 - 1.2 + 3`. A `null` value is a constant. */
function subPieces(terms: [number, number | null][]): string[] {
  const out: string[] = [];
  for (const [c, value] of terms) {
    if (c === 0) continue;
    const size = Math.abs(c);
    let body: string;
    if (value === null) body = fmt(size);
    else if (size === 1) body = out.length === 0 && c > 0 ? fmt(value) : paren(value);
    else body = `${fmt(size)} \\times ${paren(value)}`;
    // `-x` at `x = 0` opens the line as `0`, not as `-0`.
    if (out.length === 0) out.push(c < 0 && !(size === 1 && value === 0) ? `-${body}` : body);
    else out.push(c < 0 ? `- ${body}` : `+ ${body}`);
  }
  return out.length === 0 ? ['0'] : out;
}

const subTex = (terms: [number, number | null][]) => subPieces(terms).join(' ');

/** Characters of what is read, roughly: `\times` counts as one, markup as none. */
const readWidth = (piece: string) => piece.replace(/\\times/g, 'x').replace(/\\frac/g, '').replace(/[\\{}^_ ]/g, '').length;

/**
 * Substituted terms, as many to a line as fit a phone beside a name of
 * `nameWidth` characters: about 18 beside a short name like `k_1`, fewer
 * beside a long one like `f(2.8, -1.92)`, whose column starts further right.
 */
function wrapped(pieces: string[], nameWidth = 3): string[] {
  const budget = Math.min(18, Math.max(10, 23 - nameWidth));
  const lines: string[][] = [];
  for (const piece of pieces) {
    const last = lines[lines.length - 1];
    if (last && [...last, piece].reduce((sum, p) => sum + readWidth(p) + 1, 0) <= budget) last.push(piece);
    else lines.push([piece]);
  }
  return lines.map((line) => line.join(' '));
}

/**
 * A value worked out: its name, the substitution (wrapped to fit a phone),
 * then what it comes to, written once when the substitution already is it.
 * `given` is an optional middle line such as `f(1, 3)`.
 */
function evaluated(name: string, pieces: string[], value: number, given?: string): string {
  const lines = wrapped(pieces, readWidth(name));
  const out = given ? [`${name} &= ${given}`, `&= ${lines[0]}`] : [`${name} &= ${lines[0]}`];
  out.push(...lines.slice(1).map((line) => `&\\quad ${line}`));
  if (!(lines.length === 1 && lines[0] === fmt(value))) out.push(`&= ${fmt(value)}`);
  return aligned(...out);
}

/** Numbers sorted by value, never shuffled (PITFALLS 3.10). */
const byValue = (tokens: string[]) => [...tokens].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));

/**
 * A bank of numbers: the answer as a multiset, then `spare` slips that differ
 * from every answer, topped up with near misses of the last value.
 */
function bankOf(answer: string[], slips: (number | undefined)[], spare = 3, unit = 1): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  const add = (token: string) => {
    if (extras.length < spare && !needed.has(token) && !extras.includes(token)) extras.push(token);
  };
  for (const slip of slips) if (slip !== undefined && Number.isFinite(slip)) add(fmt(clean(slip)));
  const last = Number(answer[answer.length - 1]);
  for (let k = 1; extras.length < spare; k += 1) {
    add(fmt(clean(last + k * unit)));
    add(fmt(clean(last - k * unit)));
  }
  return byValue([...answer, ...extras]);
}

/** A tiles bank: the answer's tokens (all different), then distinct distractors, sorted. */
function tileBank(answer: string[], slips: number[], unit = 1): string[] {
  const extras: string[] = [];
  const add = (token: string) => {
    if (!answer.includes(token) && !extras.includes(token)) extras.push(token);
  };
  for (const slip of slips) if (Number.isFinite(slip)) add(fmt(clean(slip)));
  for (let k = 1; extras.length < 2; k += 1) add(fmt(clean(Number(answer[0]) + k * unit)));
  return byValue([...answer, ...extras.slice(0, 4)]);
}

/** A native choice slide, turned by a hash of `key` so the answer moves but never between sittings. */
function choiceSlide(prompt: Block[], opts: ChoiceOption[], key: string): Slide {
  const ordered = turned(opts, hashSeed(key) % opts.length);
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex: true })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** Numeric options: the right value first, then the slips that differ from it and each other. */
function numberOptions(correct: number, slips: number[]): ChoiceOption[] {
  const as = (value: number) => ({ tex: fmt(clean(value)), answer: fmt(clean(value)) });
  return options(as(correct), ...slips.filter((slip) => Number.isFinite(slip)).map(as)).slice(0, 4);
}

/** A typed numeric answer. */
function typed(prompt: Block[], lead: string, answer: number): Slide {
  return { kind: 'expression', prompt, lead, keypad: [], answer: fmt(answer), domain: 'real', mode: 'exact' };
}

/* ================================================================
 * Lesson 1: Euler on a model
 * ================================================================ */

/**
 * `dx/dt = k(L - x)` dressed as a model: a drink cooling to the room, a cold
 * drink warming to it, or salt in a tank, `a - kx` with `a = kL`.
 */
export type ModelForm = 'cool' | 'warm' | 'tank';

export interface ModelParams {
  form: ModelForm;
  k: number;
  L: number;
  x0: number;
  h: number;
  /** Steps asked for. */
  n: number;
}

/** The coefficient k in front of a bracket or a letter: 1 is implied. */
const kTex = (k: number) => (k === 1 ? '' : fmt(k));

/** The rate as the model writes it, in terms of `v`. */
export function rateTex({ form, k, L }: Pick<ModelParams, 'form' | 'k' | 'L'>, v = 'x'): string {
  if (form === 'cool') return `-${kTex(k)}(${v} - ${L})`;
  if (form === 'warm') return `${kTex(k)}(${L} - ${v})`;
  return `${fmt(clean(k * L))} - ${kTex(k)}${v}`;
}

/** The rate with a number put in for x. */
function rateSub({ form, k, L }: Pick<ModelParams, 'form' | 'k' | 'L'>, x: number): string {
  if (form === 'cool') return `-${kTex(k)}(${fmt(x)} - ${L})`;
  if (form === 'warm') return `${kTex(k)}(${L} - ${fmt(x)})`;
  return `${fmt(clean(k * L))} - ${k === 1 ? '' : `${fmt(k)} \\times `}${fmt(x)}`;
}

/** The rate at x: k(L - x), whichever way it is dressed. */
export const modelRate = ({ k, L }: Pick<ModelParams, 'k' | 'L'>, x: number) => clean(k * (L - x));

/** The model's story, its equation and its start, as the opening of a prompt. */
function modelPrompt(p: Pick<ModelParams, 'form' | 'k' | 'L' | 'x0'>, withStart = true): Block[] {
  const story = {
    cool: `A drink cools in a room at ${p.L}°C. Its temperature, $x$°C after $t$ minutes, satisfies`,
    warm: `A cold drink warms up in a room at ${p.L}°C. Its temperature, $x$°C after $t$ minutes, satisfies`,
    tank: 'Brine runs into and out of a tank. The salt in it, $x$ kg after $t$ minutes, satisfies',
  }[p.form];
  return [say(story), show(`\\frac{dx}{dt} = ${rateTex(p)}`), ...(withStart ? [say(`with $x = ${fmt(p.x0)}$ when $t = 0$.`)] : [])];
}

/** Euler's method on the model: x_{i+1} = x_i + h k(L - x_i), n times. */
export function modelRun(p: ModelParams): number[] {
  const xs = [p.x0];
  for (let i = 0; i < p.n; i += 1) xs.push(clean(xs[i] + p.h * modelRate(p, xs[i])));
  return xs;
}

/** The step collected up: x_{n+1} = m x_n + c. */
export const collected = ({ k, L, h }: Pick<ModelParams, 'k' | 'L' | 'h'>) => ({ m: clean(1 - h * k), c: clean(h * k * L) });

/** The step's working, collected up: `x_{n+1} = x_n + 1 \times 0.2(20 - x_n) = 0.8x_n + 4`. */
function collectLines(p: ModelParams): SolutionStep {
  const { m, c } = collected(p);
  return {
    tex: aligned('x_{n+1} &= x_n', `&\\quad + ${fmt(p.h)} \\times (${rateTex(p, 'x_n')})`, `&= ${fmt(m)}x_n + ${fmt(c)}`),
  };
}

/** Each row from the one before: `x_2 = 0.8 \times 40 + 4 = 36`. */
function rowLines(p: ModelParams, xs: number[]): SolutionStep[] {
  const { m, c } = collected(p);
  return xs.slice(1).map((x, i) => ({ tex: `x_{${i + 1}} = ${fmt(m)} \\times ${paren(xs[i])} + ${fmt(c)} = ${fmt(x)}` }));
}

/** Multipliers `1 - hk` whose powers keep four rows at two places, with the (h, k) pairs that give each. */
const MULTIPLIERS: Record<string, { unit: number; hk: [number, number][] }> = {
  '0.5': { unit: 4, hk: [[1, 0.5], [2, 0.25], [0.5, 1]] },
  '0.6': { unit: 25, hk: [[1, 0.4], [2, 0.2], [0.5, 0.8]] },
  '0.8': { unit: 25, hk: [[1, 0.2], [2, 0.1], [0.5, 0.4]] },
  '0.75': { unit: 64, hk: [[1, 0.25], [0.5, 0.5]] },
};

/**
 * A model whose first `n` Euler rows are exact to two places: the starting
 * gap `x_0 - L` is a multiple of whatever makes `gap × m^4` terminate there.
 */
function sampleRows(rng: Rng, difficulty: number, n: number): ModelParams {
  const hard = difficulty > 1;
  for (;;) {
    const key = rng.pick(hard ? ['0.6', '0.75', '0.8', '0.5'] : ['0.5', '0.8']);
    const { unit, hk } = MULTIPLIERS[key];
    const [h, k] = rng.pick(hk);
    const form: ModelForm = rng.pick(hard ? ['cool', 'warm', 'tank'] : ['cool', 'warm']);
    const gap = unit * (unit === 4 ? rng.int(2, 10) : unit === 25 ? rng.int(1, 3) : 1);
    const L = form === 'tank' ? rng.int(2, 16) * 5 : form === 'cool' ? rng.int(15, 24) : rng.int(18, 30);
    const down = form === 'cool' ? true : form === 'warm' ? false : rng.next() < 0.5;
    const x0 = down ? L + gap : L - gap;
    if (x0 < 0 || x0 > 100) continue;
    const p: ModelParams = { form, k, L, x0, h, n };
    if (!short(k * L, 2) || !modelRun(p).every((x) => short(x, 2))) continue;
    return p;
  }
}

/** Two places, as the iteration table writes every value. */
const twoDp = (value: number) => value.toFixed(2);

/** The model run in the iteration table, then the value it settles on. */
function iterateWork(p: ModelParams) {
  const xs = modelRun(p);
  const rows = xs.slice(1).map((x) => written(x, 2)!);
  const answer = [...rows, twoDp(p.L)];
  const gap = p.x0 - p.L;
  const { m } = collected(p);
  const slips = [
    p.x0 + p.k * (p.L - p.x0), // h forgotten
    p.L + gap * (1 + p.h * p.k), // the step taken the wrong way
    p.L + gap * m ** 5, // one row too far
    p.x0, // the start, offered as the limit
    xs[1] + 1,
    xs[ITERATES] - 1,
  ]
    .map(clean)
    .filter((value) => short(value, 2))
    .map(twoDp);
  const extras: string[] = [];
  for (const token of slips) if (!answer.includes(token) && !extras.includes(token) && extras.length < 3) extras.push(token);
  return { xs, answer, bank: byValue([...answer, ...extras]) };
}

/** The Euler rows of a model in the iteration table, and where they settle. */
const modelIterate: Generator<ModelParams> = {
  id: 'de-num-model-iterate',
  sample: (rng, difficulty) => sampleRows(rng, difficulty, ITERATES),
  render: (p): Slide => {
    const { answer, bank } = iterateWork(p);
    const t = p.h === 1 ? 'n' : `${fmt(p.h)}n`;
    return {
      kind: 'iterate',
      prompt: [
        ...modelPrompt(p),
        say(
          `Run Euler's method with $h = ${fmt(p.h)}$: $x_n$ is the estimate at $t = ${t}$. Write each $x_n$ to 2 decimal places, then the value the estimates settle on.`,
        ),
      ],
      start: fmt(p.x0),
      conclusion: 'limit',
      bank,
      answer,
    };
  },
  solution: (p) => {
    const xs = modelRun(p);
    const { m, c } = collected(p);
    return [
      { text: `Collect the step up first, so each row is one multiplication and one addition:` },
      collectLines(p),
      ...rowLines(p, xs),
      {
        text: `The gap to $${p.L}$ is multiplied by $${fmt(m)}$ each step, so it shrinks away: the estimates settle where the rate is zero. There $x = ${fmt(m)}x + ${fmt(c)}$, so $x = ${p.L}$, written $${twoDp(p.L)}$.`,
      },
    ];
  },
};

/** An estimate a few steps on, typed. */
const modelValue: Generator<ModelParams> = {
  id: 'de-num-model-value',
  sample: (rng, difficulty) => sampleRows(rng, difficulty, difficulty > 1 ? 3 : 2),
  render: (p): Slide => {
    const T = fmt(clean(p.n * p.h));
    return typed(
      [...modelPrompt(p), say(`Use Euler's method with $h = ${fmt(p.h)}$ to estimate $x$ when $t = ${T}$.`)],
      `x(${T}) \\approx`,
      modelRun(p)[p.n],
    );
  },
  choices: (p) => {
    const xs = modelRun(p);
    const gap = p.x0 - p.L;
    return numberOptions(xs[p.n], [
      p.L + gap * (1 - p.k) ** p.n, // h forgotten every step
      xs[p.n - 1], // one step short
      p.x0 + p.n * p.h * modelRate(p, p.x0), // the first rate held all the way
      p.L + gap * (1 + p.h * p.k) ** p.n, // the step taken the wrong way
    ]);
  },
  solution: (p) => {
    const xs = modelRun(p);
    return [
      { text: `$t = ${fmt(clean(p.n * p.h))}$ is ${p.n} steps of $${fmt(p.h)}$. Collected up, each step is` },
      collectLines(p),
      ...rowLines(p, xs),
    ];
  },
};

/** One step of a model, as the bracket, the rate, the rise and the new value. */
export interface ModelStepParams {
  form: ModelForm;
  k: number;
  L: number;
  x0: number;
  h: number;
}

/** The first node of the step's tree: the bracket, or `kx` for a tank. */
export function stepGap({ form, k, L, x0 }: ModelStepParams): number {
  if (form === 'cool') return clean(x0 - L);
  if (form === 'warm') return clean(L - x0);
  return clean(k * x0);
}

function sampleStep(rng: Rng, difficulty: number): ModelStepParams {
  const hard = difficulty > 1;
  for (;;) {
    const form: ModelForm = rng.pick(hard ? ['cool', 'warm', 'tank'] : ['cool', 'warm']);
    const k = rng.pick(hard ? [0.05, 0.1, 0.2, 0.4, 0.25] : [0.1, 0.2, 0.25, 0.4, 0.5]);
    const h = rng.pick(hard ? [0.5, 2, 5] : [1, 2]);
    const L = form === 'tank' ? rng.int(2, 16) * 5 : rng.int(15, 25);
    const gap = hard ? rng.int(6, 140) / 2 : rng.int(5, 70);
    const x0 = form === 'cool' ? L + gap : form === 'warm' ? L - gap : rng.next() < 0.5 ? L + gap : L - gap;
    if (x0 < 0 || h * k > 0.5) continue;
    const p = { form, k, L, x0, h };
    const rate = modelRate(p, x0);
    const values = [stepGap(p), rate, h * rate, x0 + h * rate, k * L];
    if (rate === 0 || !values.every((v) => short(v, 3))) continue;
    return p;
  }
}

const modelTree: Generator<ModelStepParams> = {
  id: 'de-num-model-tree',
  sample: sampleStep,
  render: (p): Slide => {
    const gap = stepGap(p);
    const rate = modelRate(p, p.x0);
    const rise = clean(p.h * rate);
    const x1 = clean(p.x0 + rise);
    const top = p.form === 'cool' ? `x_0 - ${p.L}` : p.form === 'warm' ? `${p.L} - x_0` : `${kTex(p.k)}x_0`;
    const answer = [gap, rate, rise, x1].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        ...modelPrompt(p),
        say(`One Euler step, $h = ${fmt(p.h)}$. Top: $${top}$; then the rate; then $h$ times it; last, $x_1$.`),
      ],
      expression: `x_1 = x_0 + h\\,\\frac{dx}{dt}`,
      nodes: [
        { id: 'gap', from: [] },
        { id: 'rate', from: ['gap'] },
        { id: 'rise', from: ['rate'] },
        { id: 'x1', from: ['rise'] },
      ],
      bank: bankOf(answer, [p.x0 + rate, p.x0 - rise, -rate, p.L + rise, p.h * gap], 3, p.h),
      answer,
    };
  },
  solution: (p) => {
    const rate = modelRate(p, p.x0);
    const x1 = clean(p.x0 + p.h * rate);
    return [
      { text: 'The rate where the step starts, then that rate times the step:' },
      { tex: evaluated('\\frac{dx}{dt}', [rateSub(p, p.x0)], rate) },
      { tex: aligned(`x_1 &= ${fmt(p.x0)} + ${fmt(p.h)} \\times ${paren(rate)}`, `&= ${fmt(x1)}`) },
    ];
  },
};

/** The step collected up, `x_{n+1} = m x_n + c`, as tiles. */
export interface RecurParams {
  form: ModelForm;
  k: number;
  L: number;
  h: number;
}

const modelRecur: Generator<RecurParams> = {
  id: 'de-num-model-recur',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const form: ModelForm = rng.pick(hard ? ['cool', 'warm', 'tank', 'tank'] : ['cool', 'warm']);
      const k = rng.pick([0.1, 0.2, 0.25, 0.4, 0.5]);
      const h = rng.pick(hard ? [0.5, 1, 2] : [1, 2]);
      const L = form === 'tank' ? rng.int(2, 16) * 5 : rng.int(15, 25);
      const p = { form, k, L, h };
      const { m, c } = collected(p);
      if (h * k > 0.8 || m === c || !short(c, 3)) continue;
      return p;
    }
  },
  render: (p): Slide => {
    const { m, c } = collected(p);
    const answer = [fmt(m), fmt(c)];
    const hk = clean(p.h * p.k);
    return {
      kind: 'tiles',
      prompt: [
        ...modelPrompt({ ...p, x0: 0 }, false),
        say(`Euler's method with $h = ${fmt(p.h)}$. Complete its step, collected up.`),
      ],
      template: 'x_{n+1} = {0}x_n + {1}',
      bank: tileBank(answer, [1 + hk, hk, 1 - p.k, p.k * p.L, c + p.L], 0.5),
      answer,
    };
  },
  solution: (p) => {
    const { m, c } = collected(p);
    return [
      { text: 'Put the rate at $x_n$ into the step, then multiply out and collect the $x_n$ terms:' },
      collectLines({ ...p, x0: 0, n: 1 }),
      { text: `$x_n - ${fmt(clean(p.h * p.k))}x_n = ${fmt(m)}x_n$, and the number left over is $${fmt(c)}$.` },
    ];
  },
};

/** Where Euler's estimates go, read off the multiplier `m = 1 - hk`. */
export type Fate = 'steady' | 'in' | 'out';

export interface FlowParams {
  form: 'cool' | 'tank';
  k: number;
  h: number;
  L: number;
  x0: number;
}

export const fateOf = (m: number): Fate => (m > 0 ? 'steady' : m > -1 ? 'in' : 'out');

const FATE_LABEL: Record<Fate, (L: number) => string> = {
  steady: (L) => `They close in on $${L}$ steadily`,
  in: (L) => `They overshoot $${L}$, swinging in`,
  out: (L) => `They swing further and further from $${L}$`,
};

const FATE_OUTCOME: Record<Fate, string> = {
  steady: 'A multiplier between $0$ and $1$ shrinks the gap and keeps its sign.',
  in: 'A multiplier between $-1$ and $0$ flips the gap to the other side each step, and shrinks it.',
  out: 'A multiplier below $-1$ flips the gap each step and makes it bigger.',
};

const modelFlow: Generator<FlowParams> = {
  id: 'de-num-model-flow',
  sample: (rng, difficulty) => {
    const want = rng.pick<Fate>(['steady', 'in', 'out']);
    for (;;) {
      const k = rng.pick([0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.5, 2]);
      const h = rng.pick([0.5, 1, 2, 3, 4, 5]);
      const m = clean(1 - h * k);
      if (m === 0 || m === -1 || m < -3 || fateOf(m) !== want) continue;
      const form = difficulty > 1 ? 'tank' : 'cool';
      const L = form === 'tank' ? rng.int(2, 12) * 5 : rng.int(15, 25);
      const x0 = L + rng.int(2, 10) * rng.pick([4, 5]);
      // The first two estimates are quoted in the working, so both stop at two places.
      if (!short(k * L, 2) || !short((x0 - L) * m * m, 2)) continue;
      return { form, k, h, L, x0 };
    }
  },
  render: (p): Slide => {
    const { m } = collected(p);
    const hk = clean(p.h * p.k);
    const key = `${p.form}|${p.k}|${p.h}|${p.L}|${p.x0}`;
    const fate = fateOf(m);
    const mults = [m, clean(1 + hk), clean(-hk)].map((v) => `$${fmt(v)}$`);
    const fates: Fate[] = ['steady', 'in', 'out'];
    const turn = hashSeed(key);
    return {
      kind: 'flow',
      prompt: [...modelPrompt(p), say(`Euler's method runs with $h = ${fmt(p.h)}$.`)],
      subject: `\\begin{gathered} \\frac{dx}{dt} = ${rateTex(p)} \\\\ x_0 = ${fmt(p.x0)},\\ h = ${fmt(p.h)} \\end{gathered}`,
      steps: [
        {
          id: 'mult',
          ask: 'Collected up as a number times $x_n$ plus a number, the step multiplies $x_n$ by',
          branches: turned(mults, turn % 3).map((label) => ({ label, to: 'fate' })),
        },
        {
          id: 'fate',
          ask: 'So, step by step, the estimates',
          branches: turned(fates, (turn >> 3) % 3).map((f) => ({ label: FATE_LABEL[f](p.L), outcome: FATE_OUTCOME[f] })),
        },
      ],
      answer: [mults[0], FATE_LABEL[fate](p.L)],
    };
  },
  solution: (p) => {
    const { m, c } = collected(p);
    const x1 = clean(m * p.x0 + c);
    const x2 = clean(m * x1 + c);
    return [
      collectLines({ ...p, n: 1 }),
      {
        text: `The gap to $${p.L}$ is multiplied by $${fmt(m)}$ every step. From $${fmt(p.x0)}$ the estimates run $${fmt(x1)}$, then $${fmt(x2)}$.`,
      },
      { text: FATE_OUTCOME[fateOf(m)] },
    ];
  },
};

/* ================================================================
 * Lessons 2 and 3: f(x, y) = ax + by + c
 * ================================================================ */

/** A right side linear in x and y. */
export interface Lin {
  a: number;
  b: number;
  c: number;
}

export const linAt = ({ a, b, c }: Lin, x: number, y: number) => clean(a * x + b * y + c);
export const linTex = ({ a, b, c }: Lin) => sumTex([[a, 'x'], [b, 'y'], [c, '']]);
const linSub = ({ a, b, c }: Lin, x: number, y: number) => subPieces([[a, x], [b, y], [c, null]]);

/** A first-order problem started at (x0, y0) with step h. */
export interface Start {
  f: Lin;
  x0: number;
  y0: number;
  h: number;
}

function sampleStart(rng: Rng, difficulty: number): Start {
  const hard = difficulty > 1;
  const f: Lin = {
    a: rng.int(hard ? -3 : -2, hard ? 3 : 2),
    b: rng.pick(hard ? [1, -1, 2, -2, 0.5, -0.5] : [1, -1, 2]),
    c: rng.int(hard ? -3 : -2, 3),
  };
  return {
    f,
    x0: hard ? rng.pick([0, 0.5, 1, 2]) : rng.int(0, 1),
    y0: rng.int(hard ? -2 : 1, hard ? 6 : 5),
    h: rng.pick(hard ? [0.1, 0.2, 0.4] : [0.2, 0.5]),
  };
}

const startText = ({ f, x0, y0 }: Start) => `$\\frac{dy}{dx} = ${linTex(f)}$, with $y = ${fmt(y0)}$ when $x = ${fmt(x0)}$`;

/** `k_1 = f(0, 1) = 0 + 1 = 1`, one step to a line. */
const gradLine = (name: string, f: Lin, x: number, y: number): string =>
  evaluated(name, linSub(f, x, y), linAt(f, x, y), `f(${fmt(x)}, ${fmt(y)})`);

/* ---------- Lesson 2: the improved Euler method ---------- */

/** One improved Euler step: k_1, the predicted y, k_2 there, and the average. */
export function heun({ f, x0, y0, h }: Start) {
  const x1 = clean(x0 + h);
  const k1 = linAt(f, x0, y0);
  const p = clean(y0 + h * k1);
  const k2 = linAt(f, x1, p);
  const y1 = clean(y0 + (h / 2) * (k1 + k2));
  return { x1, k1, p, k2, y1, stale: linAt(f, x1, y0), whole: clean(y0 + h * (k1 + k2)), end: clean(y0 + h * k2) };
}

/** A draw whose step is exact, needs its prediction, and keeps its slips apart. */
function sampleHeun(rng: Rng, difficulty: number): Start {
  for (;;) {
    const s = sampleStart(rng, difficulty);
    const w = heun(s);
    const values = [w.k1, w.p, w.k2, w.y1, w.stale, w.whole, w.end, s.h / 2];
    if (!values.every((v) => short(v, 4) && Math.abs(v) <= 50)) continue;
    if (w.k1 === 0 || w.k1 === w.k2 || s.f.a === 0) continue;
    if (new Set([w.y1, w.p, w.whole, w.end]).size < 4) continue;
    return s;
  }
}

function heunSolution(s: Start): SolutionStep[] {
  const w = heun(s);
  const half = fmt(clean(s.h / 2));
  return [
    { text: 'The gradient where the step starts:' },
    { tex: gradLine('k_1', s.f, s.x0, s.y0) },
    { text: `Euler's step predicts $y$ at $x_1 = ${fmt(w.x1)}$:` },
    { tex: aligned(`y_0 + hk_1 &= ${fmt(s.y0)} + ${fmt(s.h)} \\times ${paren(w.k1)}`, `&= ${fmt(w.p)}`) },
    { text: 'The gradient at the predicted point:' },
    { tex: gradLine('k_2', s.f, w.x1, w.p) },
    { text: 'Then the average of the two gradients:' },
    { tex: aligned(`y_1 &= ${fmt(s.y0)} + ${half}(${fmt(w.k1)} ${plus(w.k2)})`, `&= ${fmt(s.y0)} + ${half} \\times ${paren(clean(w.k1 + w.k2))}`, `&= ${fmt(w.y1)}`) },
  ];
}

const heunTree: Generator<Start> = {
  id: 'de-num-heun-tree',
  sample: sampleHeun,
  render: (s): Slide => {
    const w = heun(s);
    const answer = [w.k1, w.p, w.k2, w.y1].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `${startText(s)}. One step of the improved Euler method, $h = ${fmt(s.h)}$. Top: $k_1$; then the predicted $y$ at $x_1$; then $k_2$; last, $y_1$.`,
        ),
      ],
      expression: 'y_1 = y_0 + \\tfrac{h}{2}(k_1 + k_2)',
      nodes: [
        { id: 'k1', from: [] },
        { id: 'p', from: ['k1'] },
        { id: 'k2', from: ['p'] },
        { id: 'y1', from: ['k2'] },
      ],
      bank: bankOf(answer, [w.stale, w.whole, w.end, (w.k1 + w.k2) / 2], 3, s.h),
      answer,
    };
  },
  solution: heunSolution,
};

const heunTiles: Generator<Start> = {
  id: 'de-num-heun-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const s = sampleHeun(rng, difficulty);
      const w = heun(s);
      if (new Set([s.y0, s.h / 2, w.k1, w.k2].map(fmt)).size === 4) return s;
    }
  },
  render: (s): Slide => {
    const w = heun(s);
    const answer = [s.y0, clean(s.h / 2), w.k1, w.k2].map(fmt);
    return {
      kind: 'tiles',
      prompt: [say(`${startText(s)}. Complete one step of the improved Euler method with $h = ${fmt(s.h)}$.`)],
      template: 'y_1 = {0} + {1}({2} + {3})',
      bank: tileBank(answer, [s.h, w.p, w.stale, w.y1, 2 * s.h], s.h),
      answer,
    };
  },
  solution: heunSolution,
};

const heunValue: Generator<Start> = {
  id: 'de-num-heun-value',
  sample: sampleHeun,
  render: (s): Slide => {
    const w = heun(s);
    return typed(
      [say(`${startText(s)}. Use one step of the improved Euler method, $h = ${fmt(s.h)}$, to estimate $y$ when $x = ${fmt(w.x1)}$.`)],
      `y(${fmt(w.x1)}) \\approx`,
      w.y1,
    );
  },
  choices: (s) => {
    const w = heun(s);
    return numberOptions(w.y1, [w.p, w.end, w.whole]);
  },
  solution: heunSolution,
};

const heunFlow: Generator<Start> = {
  id: 'de-num-heun-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const s = sampleHeun(rng, difficulty);
      const w = heun(s);
      const predictions = new Set([w.p, clean(s.y0 + w.k1), clean(s.y0 + (s.h / 2) * w.k1)]);
      const gradients = new Set([w.k2, w.stale, linAt(s.f, s.x0, w.p)]);
      if (predictions.size === 3 && gradients.size === 3) return s;
    }
  },
  render: (s): Slide => {
    const w = heun(s);
    const key = hashSeed(`${linTex(s.f)}|${s.x0}|${s.y0}|${s.h}`);
    const lab = (v: number) => `$${fmt(v)}$`;
    const predictions = [w.p, clean(s.y0 + w.k1), clean(s.y0 + (s.h / 2) * w.k1)].map(lab);
    const gradients = [w.k2, w.stale, linAt(s.f, s.x0, w.p)].map(lab);
    const ends = [
      { label: lab(w.y1), outcome: 'The average of the two gradients, over the whole step.' },
      { label: lab(w.whole), outcome: 'That adds both gradients times $h$: twice the rise. The step uses their average.' },
      { label: lab(w.end), outcome: 'That uses only the gradient at the end. The method averages it with the one at the start.' },
    ];
    return {
      kind: 'flow',
      prompt: [say(`${startText(s)}. One step of the improved Euler method, $h = ${fmt(s.h)}$, where $k_1 = f(${fmt(s.x0)}, ${fmt(s.y0)}) = ${fmt(w.k1)}$.`)],
      subject: `\\begin{gathered} \\frac{dy}{dx} = ${linTex(s.f)} \\\\ y(${fmt(s.x0)}) = ${fmt(s.y0)},\\ h = ${fmt(s.h)} \\end{gathered}`,
      steps: [
        { id: 'predict', ask: `Euler's prediction of $y$ at $x_1 = ${fmt(w.x1)}$ is`, branches: turned(predictions, key % 3).map((label) => ({ label, to: 'k2' })) },
        { id: 'k2', ask: 'Then $k_2$, the gradient at the predicted point, is', branches: turned(gradients, (key >> 2) % 3).map((label) => ({ label, to: 'end' })) },
        { id: 'end', ask: 'So $y_1$ is', branches: turned(ends, (key >> 4) % 3) },
      ],
      answer: [predictions[0], gradients[0], ends[0].label],
    };
  },
  solution: heunSolution,
};

/* ---------- Lesson 3: the midpoint formula ---------- */

export interface MidParams extends Start {
  /** Steps taken: y_1 by Euler, then the midpoint formula up to y_n. */
  n: number;
}

/** y_1 by one Euler step, then y_{r+1} = y_{r-1} + 2h f(x_r, y_r). */
export function midRun({ f, x0, y0, h, n }: MidParams) {
  const xs = Array.from({ length: n + 1 }, (_, i) => clean(x0 + i * h));
  const ys = [y0, clean(y0 + h * linAt(f, x0, y0))];
  for (let r = 1; r < n; r += 1) ys.push(clean(ys[r - 1] + 2 * h * linAt(f, xs[r], ys[r])));
  const gs = xs.map((x, i) => linAt(f, x, ys[i]));
  return { xs, ys, gs };
}

/** Euler all the way, the slip of never switching to the midpoint formula. */
export function eulerAll({ f, x0, y0, h, n }: MidParams): number {
  let y = y0;
  for (let i = 0; i < n; i += 1) y = clean(y + h * linAt(f, x0 + i * h, y));
  return y;
}

function sampleMid(rng: Rng, difficulty: number, n: number): MidParams {
  for (;;) {
    const s = { ...sampleStart(rng, difficulty), n };
    const { ys, gs } = midRun(s);
    if (![...ys, ...gs].every((v) => short(v, 4) && Math.abs(v) <= 60)) continue;
    if (gs[0] === 0 || gs[0] === gs[1] || s.f.b === 0 || ys[n] === eulerAll(s)) continue;
    return s;
  }
}

function midLines(s: MidParams): SolutionStep[] {
  const { xs, ys, gs } = midRun(s);
  const two = fmt(clean(2 * s.h));
  const steps: SolutionStep[] = [
    { text: 'One Euler step starts it off:' },
    { tex: evaluated(`f(${fmt(xs[0])}, ${fmt(ys[0])})`, linSub(s.f, xs[0], ys[0]), gs[0]) },
    { tex: aligned(`y_1 &= ${fmt(ys[0])} + ${fmt(s.h)} \\times ${paren(gs[0])}`, `&= ${fmt(ys[1])}`) },
  ];
  for (let r = 1; r < s.n; r += 1) {
    steps.push({ text: `Then the gradient at $x_{${r}}$ carries $y_{${r - 1}}$ over $2h = ${two}$:` });
    steps.push({ tex: evaluated(`f(${fmt(xs[r])}, ${fmt(ys[r])})`, linSub(s.f, xs[r], ys[r]), gs[r]) });
    steps.push({ tex: aligned(`y_{${r + 1}} &= ${fmt(ys[r - 1])} + ${two} \\times ${paren(gs[r])}`, `&= ${fmt(ys[r + 1])}`) });
  }
  return steps;
}

/** Rows n, x_n, y_n reached so far, as a small table in a prompt. */
function reached(xs: number[], ys: number[], upTo: number): string {
  const rows = xs.slice(0, upTo + 1).map((x, i) => `${i} & ${fmt(x)} & ${fmt(ys[i])}`);
  return `\\begin{array}{c|c|c} n & x_n & y_n \\\\ \\hline ${rows.join(' \\\\ ')} \\end{array}`;
}

const midTree: Generator<MidParams> = {
  id: 'de-num-mid-tree',
  sample: (rng, difficulty) => sampleMid(rng, difficulty, 2),
  render: (s): Slide => {
    const { xs, ys, gs } = midRun(s);
    const answer = [gs[0], ys[1], gs[1], ys[2]].map(fmt);
    return {
      kind: 'tree',
      prompt: [
        say(
          `${startText(s)}, and $h = ${fmt(s.h)}$. Top: $f(x_0, y_0)$; then $y_1$ by one Euler step; then $f(x_1, y_1)$; last, $y_2$ by the midpoint formula.`,
        ),
      ],
      expression: 'y_2 = y_0 + 2h\\,f(x_1, y_1)',
      nodes: [
        { id: 'g0', from: [] },
        { id: 'y1', from: ['g0'] },
        { id: 'g1', from: ['y1'] },
        { id: 'y2', from: ['g1'] },
      ],
      bank: bankOf(answer, [ys[1] + s.h * gs[1], ys[1] + 2 * s.h * gs[1], ys[0] + s.h * gs[1], linAt(s.f, xs[1], ys[0])], 3, s.h),
      answer,
    };
  },
  solution: midLines,
};

/** The next midpoint step as tiles: y_{r-1}, 2h, and the point the gradient is taken at. */
const midTiles: Generator<MidParams> = {
  id: 'de-num-mid-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const s = sampleMid(rng, difficulty, difficulty > 1 ? 3 : 2);
      const { xs, ys } = midRun(s);
      const r = s.n - 1;
      if (new Set([ys[r - 1], 2 * s.h, xs[r], ys[r]].map((v) => fmt(clean(v)))).size === 4) return s;
    }
  },
  render: (s): Slide => {
    const { xs, ys } = midRun(s);
    const r = s.n - 1;
    const answer = [ys[r - 1], clean(2 * s.h), xs[r], ys[r]].map(fmt);
    return {
      kind: 'tiles',
      prompt: [
        say(`${startText(s)}. The midpoint formula, started by one Euler step with $h = ${fmt(s.h)}$, has reached`),
        show(reached(xs, ys, r)),
        say('Complete the next step.'),
      ],
      template: `y_${r + 1} = {0} + {1} \\times f({2}, {3})`,
      bank: tileBank(answer, [s.h, xs[r + 1], xs[r - 1], ys[r] + 1], s.h),
      answer,
    };
  },
  solution: (s) => {
    const { xs, ys } = midRun(s);
    const r = s.n - 1;
    return [
      { text: `The formula steps from $y_{${r - 1}}$, two rows back, over $2h$, with the gradient at the row between:` },
      { tex: `y_{${r + 1}} = y_{${r - 1}} + 2h\\,f(x_{${r}}, y_{${r}})` },
      { tex: `y_{${r + 1}} = ${fmt(ys[r - 1])} + ${fmt(clean(2 * s.h))} \\times f(${fmt(xs[r])}, ${fmt(ys[r])})` },
    ];
  },
};

/** The run as a table: each row's gradient, then the next y. */
const midTable: Generator<MidParams> = {
  id: 'de-num-mid-table',
  sample: (rng, difficulty) => sampleMid(rng, difficulty, difficulty > 1 ? 3 : 2),
  render: (s): Slide => {
    const { xs, ys, gs } = midRun(s);
    const rows = xs.map((x, i) => [String(i), fmt(x), i === 0 ? fmt(ys[0]) : null, i < s.n ? null : '']);
    const answer = xs.flatMap((_, i) => [...(i > 0 ? [ys[i]] : []), ...(i < s.n ? [gs[i]] : [])]).map(fmt);
    const r = s.n - 1;
    return {
      kind: 'table',
      prompt: [
        say(
          `${startText(s)}. Fill in the table with $h = ${fmt(s.h)}$: $y_1$ by one Euler step, then the midpoint formula. Each row's gradient, then the next $y$.`,
        ),
      ],
      columns: ['n', 'x_n', 'y_n', 'f(x_n, y_n)'],
      rows,
      bank: bankOf(answer, [eulerAll(s), ys[r] + 2 * s.h * gs[r], ys[r - 1] + s.h * gs[r], ys[1] + s.h * gs[1]], 3, s.h),
      answer,
    };
  },
  solution: midLines,
};

const midValue: Generator<MidParams> = {
  id: 'de-num-mid-value',
  sample: (rng, difficulty) => sampleMid(rng, difficulty, difficulty > 1 ? 3 : 2),
  render: (s): Slide => {
    const { xs, ys } = midRun(s);
    const X = fmt(xs[s.n]);
    return typed(
      [say(`${startText(s)}. Use the midpoint formula with $h = ${fmt(s.h)}$, started by one Euler step, to estimate $y$ when $x = ${X}$.`)],
      `y(${X}) \\approx`,
      ys[s.n],
    );
  },
  choices: (s) => {
    const { ys, gs } = midRun(s);
    const r = s.n - 1;
    return numberOptions(ys[s.n], [eulerAll(s), ys[r] + 2 * s.h * gs[r], ys[r - 1] + s.h * gs[r]]);
  },
  solution: midLines,
};

/* ================================================================
 * Lesson 4: second-order equations step by step
 * ================================================================ */

/** `lead y'' + p y' + q y = r x + s`, started at (x0, y0) with y'(x0) = z0. */
export interface SecondParams {
  lead: number;
  p: number;
  q: number;
  r: number;
  s: number;
  x0: number;
  y0: number;
  z0: number;
  h: number;
}

/** dz/dx = f(x, y, z), with every coefficient divided by the lead. */
export const secondF = ({ lead, p, q, r, s }: SecondParams, x: number, y: number, z: number) =>
  clean((r * x + s - p * z - q * y) / lead);

export const dzTex = ({ lead, p, q, r, s }: SecondParams) =>
  sumTex([[clean(r / lead), 'x'], [clean(s / lead), ''], [clean(-p / lead), 'z'], [clean(-q / lead), 'y']]);

const D2 = '\\frac{d^2y}{dx^2}';
const D1 = '\\frac{dy}{dx}';

export const secondTex = ({ lead, p, q, r, s }: SecondParams) =>
  `${sumTex([[lead, D2], [p, D1], [q, 'y']])} = ${sumTex([[r, 'x'], [s, '']])}`;

/** Euler on both: y_{r+1} = y_r + h z_r and z_{r+1} = z_r + h f(x_r, y_r, z_r). */
export function secondRun(sp: SecondParams, n = 2) {
  const xs = [sp.x0];
  const ys = [sp.y0];
  const zs = [sp.z0];
  const fs: number[] = [];
  for (let i = 0; i < n; i += 1) {
    fs.push(secondF(sp, xs[i], ys[i], zs[i]));
    xs.push(clean(xs[i] + sp.h));
    ys.push(clean(ys[i] + sp.h * zs[i]));
    zs.push(clean(zs[i] + sp.h * fs[i]));
  }
  return { xs, ys, zs, fs };
}

function sampleSecond(rng: Rng, difficulty: number): SecondParams {
  const hard = difficulty > 1;
  const nz = (lo: number, hi: number) => {
    for (;;) {
      const v = rng.int(lo, hi);
      if (v !== 0) return v;
    }
  };
  for (;;) {
    const lead = hard ? rng.pick([2, 4]) : 1;
    const unit = hard ? lead / 2 : 1;
    const sp: SecondParams = {
      lead,
      p: nz(-4, 5) * unit,
      q: nz(-4, 5) * unit,
      r: rng.int(-3, 3) * unit,
      s: rng.int(-3, 3) * unit,
      x0: hard ? rng.int(0, 1) : 0,
      y0: rng.int(-2, 4),
      z0: rng.int(-2, 3),
      h: rng.pick(hard ? [0.1, 0.2, 0.5] : [0.1, 0.2]),
    };
    const run = secondRun(sp);
    const values = [...run.ys, ...run.zs, ...run.fs, ...slipsOf(sp)];
    if (!values.every((v) => short(v, 4) && Math.abs(v) <= 60)) continue;
    if (sp.p === sp.q || (sp.r === 0 && sp.s === 0) || run.fs[0] === 0 || sp.z0 === 0) continue;
    return sp;
  }
}

/** The ways y_2 goes wrong: z held at z_0, y stepped with the new z, and z_2 read as y. */
function slipsOf(sp: SecondParams): number[] {
  const run = secondRun(sp);
  const held = clean(sp.y0 + 2 * sp.h * sp.z0);
  // z updated first, then used for y: y_1 = y_0 + h z_1, and so on.
  let y = sp.y0;
  let z = sp.z0;
  for (let i = 0; i < 2; i += 1) {
    const f = secondF(sp, sp.x0 + i * sp.h, y, z);
    z = clean(z + sp.h * f);
    y = clean(y + sp.h * z);
  }
  return [held, y, run.zs[2]];
}

/** The problem as the prompt states it: already split at difficulty 1, second order at 2. */
function secondPrompt(sp: SecondParams): Block[] {
  const start = `with $y = ${fmt(sp.y0)}$ and $\\frac{dy}{dx} = ${fmt(sp.z0)}$ when $x = ${fmt(sp.x0)}$`;
  if (sp.lead === 1) {
    return [
      say(`With $z = \\frac{dy}{dx}$, an equation for $y$ has become`),
      show(`\\frac{dy}{dx} = z \\qquad \\frac{dz}{dx} = ${dzTex(sp)}`),
      say(`${start}.`),
    ];
  }
  return [show(secondTex(sp)), say(`${start}.`)];
}

function secondLines(sp: SecondParams, steps = 2): SolutionStep[] {
  const run = secondRun(sp, steps);
  const out: SolutionStep[] = [];
  if (sp.lead !== 1) {
    out.push({ text: `Divide by $${sp.lead}$ and put $z = \\frac{dy}{dx}$:` }, { tex: `\\frac{dy}{dx} = z \\qquad \\frac{dz}{dx} = ${dzTex(sp)}` });
  }
  const { lead, p, q, r, s } = sp;
  for (let i = 0; i < steps; i += 1) {
    const sub = subPieces([
      [clean(r / lead), run.xs[i]],
      [clean(s / lead), null],
      [clean(-p / lead), run.zs[i]],
      [clean(-q / lead), run.ys[i]],
    ]);
    out.push({ text: `Step ${i + 1}, both from row ${i}: $y$ moves by $h$ times $z$, and $z$ by $h$ times $\\frac{dz}{dx}$.` });
    out.push({ tex: evaluated(`\\frac{dz}{dx}`, sub, run.fs[i], `f(${fmt(run.xs[i])}, ${fmt(run.ys[i])}, ${fmt(run.zs[i])})`) });
    out.push({
      tex: aligned(
        `y_{${i + 1}} &= ${fmt(run.ys[i])} + ${fmt(sp.h)} \\times ${paren(run.zs[i])}`,
        `&= ${fmt(run.ys[i + 1])}`,
        `z_{${i + 1}} &= ${fmt(run.zs[i])} + ${fmt(sp.h)} \\times ${paren(run.fs[i])}`,
        `&= ${fmt(run.zs[i + 1])}`,
      ),
    });
  }
  return out;
}

/** Splitting: which dz/dx the second-order equation becomes. */
const secondSplit: Generator<SecondParams> = {
  id: 'de-num-second-split',
  sample: (rng, difficulty) => {
    for (;;) {
      const sp = sampleSecond(rng, difficulty);
      if (new Set(splitOptions(sp).map((o) => o.tex)).size === 4) return sp;
    }
  },
  render: (sp): Slide =>
    choiceSlide(
      [show(secondTex(sp)), say('With $z = \\frac{dy}{dx}$, so that $\\frac{dy}{dx} = z$, which is $\\frac{dz}{dx}$?')],
      splitOptions(sp),
      secondTex(sp),
    ),
  solution: (sp) => [
    { text: `Write $\\frac{dy}{dx}$ as $z$ and $${D2}$ as $\\frac{dz}{dx}$:` },
    { tex: `${sumTex([[sp.lead, '\\frac{dz}{dx}'], [sp.p, 'z'], [sp.q, 'y']])} = ${sumTex([[sp.r, 'x'], [sp.s, '']])}` },
    { text: `Keep $\\frac{dz}{dx}$ on the left, move the rest across${sp.lead === 1 ? '' : `, and divide by $${sp.lead}$`}:` },
    { tex: `\\frac{dz}{dx} = ${dzTex(sp)}` },
  ],
};

export function splitOptions(sp: SecondParams): ChoiceOption[] {
  const { lead, p, q, r, s } = sp;
  const d = (v: number) => clean(v / lead);
  const as = (terms: [number, string][]) => {
    const tex = sumTex(terms);
    return { tex: `\\frac{dz}{dx} = ${tex}`, answer: terms.map(([c, v]) => `(${c})${v ? `*${v}` : ''}`).join(' + ') };
  };
  return options(
    as([[d(r), 'x'], [d(s), ''], [d(-p), 'z'], [d(-q), 'y']]),
    as([[d(r), 'x'], [d(s), ''], [d(p), 'z'], [d(q), 'y']]),
    as([[d(r), 'x'], [d(s), ''], [d(-q), 'z'], [d(-p), 'y']]),
    lead === 1 ? as([[-r, 'x'], [-s, ''], [-p, 'z'], [-q, 'y']]) : as([[r, 'x'], [s, ''], [-p, 'z'], [-q, 'y']]),
  );
}

const secondTree: Generator<SecondParams> = {
  id: 'de-num-second-tree',
  sample: sampleSecond,
  render: (sp): Slide => {
    const run = secondRun(sp);
    const answer = [run.fs[0], run.ys[1], run.zs[1], run.ys[2]].map(fmt);
    const [held, early] = slipsOf(sp);
    return {
      kind: 'tree',
      prompt: [
        ...secondPrompt(sp),
        say(`Euler's method on both, $h = ${fmt(sp.h)}$. Top: $\\frac{dz}{dx}$ at the start, and $y_1$; then $z_1$; last, $y_2$.`),
      ],
      expression: 'y_2 = y_1 + h z_1',
      nodes: [
        { id: 'f0', from: [] },
        { id: 'y1', from: [] },
        { id: 'z1', from: ['f0'] },
        { id: 'y2', from: ['y1', 'z1'] },
      ],
      bank: bankOf(answer, [held, early, sp.z0 + run.fs[0], sp.y0 + sp.h * run.fs[0]], 3, sp.h),
      answer,
    };
  },
  solution: secondLines,
};

const secondTable: Generator<SecondParams> = {
  id: 'de-num-second-table',
  sample: sampleSecond,
  render: (sp): Slide => {
    const run = secondRun(sp);
    const rows = run.xs.map((x, i) => [String(i), fmt(x), i === 0 ? fmt(sp.y0) : null, i === 0 ? fmt(sp.z0) : null]);
    const answer = [1, 2].flatMap((i) => [run.ys[i], run.zs[i]]).map(fmt);
    const [held, early] = slipsOf(sp);
    return {
      kind: 'table',
      prompt: [...secondPrompt(sp), say(`Fill in two steps of Euler's method on $y$ and $z$ together, $h = ${fmt(sp.h)}$.`)],
      columns: ['n', 'x_n', 'y_n', 'z_n'],
      rows,
      bank: bankOf(answer, [held, early, sp.z0 + run.fs[0], run.ys[1] + sp.h * run.fs[1]], 3, sp.h),
      answer,
    };
  },
  solution: secondLines,
};

const secondValue: Generator<SecondParams> = {
  id: 'de-num-second-value',
  sample: sampleSecond,
  render: (sp): Slide => {
    const run = secondRun(sp);
    const X = fmt(run.xs[2]);
    return typed(
      [...secondPrompt(sp), say(`Use Euler's method on $y$ and $z$ with $h = ${fmt(sp.h)}$ to estimate $y$ when $x = ${X}$.`)],
      `y(${X}) \\approx`,
      run.ys[2],
    );
  },
  choices: (sp) => numberOptions(secondRun(sp).ys[2], slipsOf(sp)),
  solution: secondLines,
};

/* ================================================================
 * Lesson 5: step size and accuracy
 * ================================================================ */

export type Method = 'euler' | 'heun';

const METHOD_NAME: Record<Method, string> = { euler: "Euler's method", heun: 'The improved Euler method' };

/** Halving h divides Euler's error by about 2 and the improved method's by about 4. */
export const halving = (method: Method) => (method === 'euler' ? 2 : 4);

export interface HalveParams {
  method: Method;
  mode: 'error' | 'estimate';
  h: number;
  /** The error with step h: estimate minus exact. */
  E: number;
  /** The exact value, for the estimate mode. */
  Y: number;
  X: number;
}

const ERRORS = [0.08, 0.12, 0.16, 0.24, 0.32, 0.4, 0.48, 0.64, 0.8, 1.2];

export const halveAnswer = ({ method, mode, E, Y }: HalveParams) => clean((mode === 'error' ? 0 : Y) + E / halving(method));

const halveValue: Generator<HalveParams> = {
  id: 'de-num-halve-value',
  sample: (rng, difficulty) => ({
    method: rng.pick<Method>(['euler', 'heun']),
    mode: difficulty > 1 ? 'estimate' : 'error',
    h: rng.pick([0.1, 0.2, 0.4, 0.5]),
    E: rng.pick(ERRORS) * rng.sign(),
    Y: rng.int(3, 24) / 2,
    X: rng.int(1, 2),
  }),
  render: (q): Slide => {
    const half = fmt(clean(q.h / 2));
    const by = `${METHOD_NAME[q.method]} with $h = ${fmt(q.h)}$`;
    if (q.mode === 'error') {
      return typed(
        [say(`${by} estimates $y(${q.X})$ with an error of $${fmt(q.E)}$. Roughly what is the error with $h = ${half}$?`)],
        '\\text{error} \\approx',
        halveAnswer(q),
      );
    }
    return typed(
      [say(`The exact value is $y(${q.X}) = ${fmt(q.Y)}$. ${by} estimates it as $${fmt(clean(q.Y + q.E))}$. Roughly what does it give with $h = ${half}$?`)],
      `y(${q.X}) \\approx`,
      halveAnswer(q),
    );
  },
  choices: (q) => {
    const other = halving(q.method === 'euler' ? 'heun' : 'euler');
    const base = q.mode === 'error' ? 0 : q.Y;
    return numberOptions(halveAnswer(q), [base + q.E, base + q.E / other, q.mode === 'error' ? 2 * q.E : q.Y - q.E / halving(q.method)]);
  },
  solution: (q) => {
    const f = halving(q.method);
    const rule = q.method === 'euler' ? "Euler's error is roughly proportional to $h$, so halving $h$ halves it" : "The improved method's error is roughly proportional to $h^2$, so halving $h$ quarters it";
    const err = clean(q.E / f);
    return [
      { text: `${rule}:` },
      { tex: `\\text{error} \\approx \\frac{${fmt(q.E)}}{${f}} = ${fmt(err)}` },
      ...(q.mode === 'estimate'
        ? [
            { text: 'The error is the estimate minus the exact value, so the new estimate is the exact value plus it:' },
            { tex: `${fmt(q.Y)} ${plus(err)} = ${fmt(halveAnswer(q))}` },
          ]
        : []),
    ];
  },
};

/** The exact solution y = p(x), p = al x^2 + be x + ga, of dy/dx = y + p'(x) - p(x). */
export interface CloserParams {
  al: number;
  be: number;
  ga: number;
  h: number;
  /** Euler against the improved method at h, or Euler at h against Euler at h/2. */
  mode: 'methods' | 'steps';
}

export const exactP = ({ al, be, ga }: CloserParams, x: number) => clean(al * x * x + be * x + ga);
export const closerF = (c: CloserParams, x: number, y: number) => clean(y + 2 * c.al * x + c.be - exactP(c, x));
export const pTex = ({ al, be, ga }: CloserParams) => sumTex([[al, 'x^{2}'], [be, 'x'], [ga, '']]);
export const closerFTex = ({ al, be, ga }: CloserParams) => sumTex([[1, 'y'], [-al, 'x^{2}'], [2 * al - be, 'x'], [be - ga, '']]);

/** The two estimates of y(h), each from (0, ga). */
export function closerEstimates(c: CloserParams): [number, number] {
  const f = (x: number, y: number) => closerF(c, x, y);
  const euler = clean(c.ga + c.h * f(0, c.ga));
  if (c.mode === 'methods') {
    const k1 = f(0, c.ga);
    const k2 = f(c.h, clean(c.ga + c.h * k1));
    return [euler, clean(c.ga + (c.h / 2) * (k1 + k2))];
  }
  const half = clean(c.h / 2);
  const y1 = clean(c.ga + half * f(0, c.ga));
  return [euler, clean(y1 + half * f(half, y1))];
}

const closerLabels = (c: CloserParams): [string, string] =>
  c.mode === 'methods' ? ["Euler's method", 'The improved method'] : [`$h = ${fmt(c.h)}$`, `$h = ${fmt(clean(c.h / 2))}$`];

const closerFlow: Generator<CloserParams> = {
  id: 'de-num-closer-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const c: CloserParams = {
        al: rng.pick([1, 2, -1, -2, 3]),
        be: rng.int(-2, 3),
        ga: rng.int(0, 4),
        h: rng.pick([0.2, 0.4, 0.5]),
        mode: difficulty > 1 ? 'steps' : 'methods',
      };
      const Y = exactP(c, c.h);
      const [a, b] = closerEstimates(c);
      const errs = [clean(a - Y), clean(b - Y)];
      const slope = clean(2 * c.al * c.h + c.be);
      if (![Y, a, b, ...errs, slope].every((v) => short(v, 4))) continue;
      if (Math.abs(errs[0]) === Math.abs(errs[1]) || errs.includes(0)) continue;
      if (new Set([Y, slope, a]).size < 3) continue;
      return c;
    }
  },
  render: (c): Slide => {
    const X = fmt(c.h);
    const Y = exactP(c, c.h);
    const est = closerEstimates(c);
    const errs = est.map((e) => clean(e - Y));
    const near = Math.abs(errs[0]) < Math.abs(errs[1]) ? 0 : 1;
    const names = closerLabels(c);
    const lab = (v: number) => `$${fmt(v)}$`;
    const key = hashSeed(`${pTex(c)}|${c.h}|${c.mode}`);
    const exacts = [Y, clean(2 * c.al * c.h + c.be), est[0]].map(lab);
    const verdicts = [
      { label: lab(errs[near]), outcome: 'The estimate minus the exact value, for the closer estimate.' },
      { label: lab(errs[1 - near]), outcome: 'That is the error of the other estimate.' },
      { label: lab(clean(-errs[near])), outcome: 'The error is the estimate minus the exact value, not the other way round.' },
    ];
    const told =
      c.mode === 'methods'
        ? `One step, $h = ${X}$, estimates $y(${X})$ as $${fmt(est[0])}$ by Euler's method and $${fmt(est[1])}$ by the improved method.`
        : `Euler's method estimates $y(${X})$ as $${fmt(est[0])}$ with $h = ${X}$, and $${fmt(est[1])}$ with $h = ${fmt(clean(c.h / 2))}$.`;
    return {
      kind: 'flow',
      prompt: [say(`$\\frac{dy}{dx} = ${closerFTex(c)}$, with $y = ${c.ga}$ when $x = 0$, has the exact solution $y = ${pTex(c)}$. ${told}`)],
      subject: `\\begin{gathered} y = ${pTex(c)} \\\\ ${fmt(est[0])} \\text{ and } ${fmt(est[1])} \\end{gathered}`,
      steps: [
        { id: 'exact', ask: `The exact value $y(${X})$ is`, branches: turned(exacts, key % 3).map((label) => ({ label, to: 'closer' })) },
        { id: 'closer', ask: 'The closer estimate comes from', branches: turned([...names], (key >> 2) % 2).map((label) => ({ label, to: 'error' })) },
        { id: 'error', ask: 'Its error is', branches: turned(verdicts, (key >> 4) % 3) },
      ],
      answer: [exacts[0], names[near], verdicts[0].label],
    };
  },
  solution: (c) => {
    const X = fmt(c.h);
    const Y = exactP(c, c.h);
    const est = closerEstimates(c);
    // Letters stay in maths italic, so `h` here is the `h` of every other line.
    const names =
      c.mode === 'methods'
        ? ['\\text{Euler}', '\\text{improved}']
        : [`h = ${fmt(c.h)}`, `h = ${fmt(clean(c.h / 2))}`];
    // One piece per estimate, so each stacks and breaks on its own on a phone.
    const error = (at: number) => `${names[at]}: \\quad ${fmt(est[at])} - ${paren(Y)} = ${fmt(clean(est[at] - Y))}`;
    return [
      { text: 'Put $x$ into the exact solution:' },
      { tex: `y(${X}) = ${subTex([[c.al, c.h * c.h], [c.be, c.h], [c.ga, null]])} = ${fmt(Y)}` },
      { text: 'Each error is the estimate minus the exact value:' },
      { tex: `${error(0)} \\qquad ${error(1)}` },
      { text: 'The smaller error, ignoring its sign, is the closer estimate.' },
    ];
  },
};

/** The error at h drawn as a point; the learner slides to the error at h/2. */
export interface RatioParams {
  method: Method;
  h: number;
  E: number;
}

const RATIO_ERRORS = [0.4, 0.8, 1.2, 1.6, 2, 2.4, 3.2, 4];

const ratioSlider: Generator<RatioParams> = {
  id: 'de-num-ratio-slider',
  sample: (rng, difficulty) => ({
    method: difficulty > 1 ? rng.pick<Method>(['euler', 'heun']) : 'euler',
    h: rng.pick([0.1, 0.2, 0.4, 0.5]),
    E: rng.pick(RATIO_ERRORS),
  }),
  render: (q): Slide => {
    const half = clean(q.h / 2);
    const top = clean(1.2 * q.E);
    const svg = plotSvg({
      xMin: 0,
      xMax: clean(1.25 * q.h),
      yMin: 0,
      yMax: top,
      curves: [],
      marks: [{ x: q.h, y: q.E }, { x: 0, y: 0, hollow: true }],
      verticals: [{ x: half, dashed: true }],
      label: `The size of the error against the step h: a point at h = ${fmt(q.h)} with error ${fmt(q.E)}, and a dashed line at h = ${fmt(half)}`,
    });
    return {
      kind: 'slider',
      prompt: [
        say(
          `${METHOD_NAME[q.method]} with $h = ${fmt(q.h)}$ gives an error of size $${fmt(q.E)}$, marked. Slide the level to the size of error you expect with $h = ${fmt(half)}$, the dashed line.`,
        ),
      ],
      min: 0,
      max: top,
      step: clean(q.E / 20),
      answer: clean(q.E / halving(q.method)),
      readout: '\\text{error} = {v}',
      figure: plotFigure(svg, 'y'),
    };
  },
  solution: (q) => [
    {
      text:
        q.method === 'euler'
          ? "Euler's error is roughly proportional to $h$: half the step, half the error."
          : "The improved method's error is roughly proportional to $h^2$: half the step, a quarter of the error.",
    },
    { tex: `\\frac{${fmt(q.E)}}{${halving(q.method)}} = ${fmt(clean(q.E / halving(q.method)))}` },
  ],
};

/** Two errors at h and h/ratio; which power of h they follow. */
export interface OrderParams {
  h: number;
  ratio: 2 | 3;
  order: 1 | 2;
  E: number;
  X: number;
}

export const orderSecond = ({ E, ratio, order }: OrderParams) => clean(E / ratio ** order);

const ORDER_LABELS = ['\\text{error} \\propto h', '\\text{error} \\propto h^2', '\\text{error} \\propto h^3'];

const orderChoice: Generator<OrderParams> = {
  id: 'de-num-order-choice',
  sample: (rng, difficulty) => {
    const ratio: 2 | 3 = difficulty > 1 ? 3 : 2;
    return {
      ratio,
      order: rng.pick([1, 2] as const),
      h: ratio === 3 ? rng.pick([0.3, 0.6, 0.9, 1.5]) : rng.pick([0.1, 0.2, 0.4, 0.5]),
      E: ratio === 3 ? rng.pick([0.18, 0.27, 0.36, 0.45, 0.54, 0.72, 0.81, 0.9, 1.08, 1.8]) : rng.pick(ERRORS),
      X: rng.int(1, 3),
    };
  },
  render: (q): Slide =>
    choiceSlide(
      [
        say(
          `A method estimates $y(${q.X})$ with an error of size $${fmt(q.E)}$ when $h = ${fmt(q.h)}$, and $${fmt(orderSecond(q))}$ when $h = ${fmt(clean(q.h / q.ratio))}$. How does its error depend on $h$?`,
        ),
      ],
      ORDER_LABELS.map((tex, i) => ({ tex, correct: i + 1 === q.order })),
      `${q.h}|${q.ratio}|${q.order}|${q.E}|${q.X}`,
    ),
  solution: (q) => [
    { text: `The step was divided by ${q.ratio}. Divide the errors:` },
    { tex: `\\frac{${fmt(q.E)}}{${fmt(orderSecond(q))}} = ${q.ratio ** q.order}` },
    {
      text:
        q.order === 1
          ? `Divided by ${q.ratio} as well: the error follows $h$, as Euler's does.`
          : `Divided by $${q.ratio}^2 = ${q.ratio ** 2}$: the error follows $h^2$, as the improved method's and the midpoint formula's do.`,
    },
  ],
};

export const deNumericalGenerators = [
  modelIterate,
  modelValue,
  modelTree,
  modelRecur,
  modelFlow,
  heunTree,
  heunTiles,
  heunValue,
  heunFlow,
  midTree,
  midTiles,
  midTable,
  midValue,
  secondSplit,
  secondTree,
  secondTable,
  secondValue,
  halveValue,
  closerFlow,
  ratioSlider,
  orderChoice,
];
