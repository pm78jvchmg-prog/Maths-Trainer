/**
 * Parametric & Implicit Differentiation generators.
 *
 * Two curve models run through the file. A parametric curve holds `x` and `y`
 * as polynomials in `t` (coefficients highest power first), so every point,
 * derivative and tangent is exact integer arithmetic. An implicit curve is a
 * sum of terms `c x^a y^b` equal to a constant, always **built from a whole
 * point** on it, so every gradient, bank and answer the learner meets is whole.
 *
 * The oracle in `generators.test.ts` differentiates a `source` in $x$ only, and
 * nothing here is a plain function of $x$: a parametric gradient is written in
 * $t$ and an implicit one in $x$ and $y$. `parametricImplicit.test.ts` checks
 * both against mathjs's own derivatives of $x(t)$, $y(t)$ and $F(x, y)$.
 *
 * As everywhere, `*Tex` is what the learner reads and `answer` is what mathjs
 * grades; the two are never the same string.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { hashSeed, type Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { ALGEBRA_KEYS, TRIG_KEYS, sumTex, termAnswer, termTex } from './calculus';

/* ---------- Shared helpers ---------- */

/**
 * A variable key that inserts a leading space.
 *
 * The editor joins atoms with nothing between them, and mathjs reads `xy` as
 * one symbol called `xy`, not as `x` times `y` — so a learner typing $2xy$ on
 * a plain keypad would be marked wrong for a right answer. `2 x y` parses as a
 * product, and the space renders as nothing in TeX. Every variable key in this
 * file is spaced for that reason, not only `y`: typing $y$ then $x$ would
 * otherwise make the symbol `yx`.
 */
export const spaced = (letter: string): KeypadKey => ({ insert: ` ${letter}`, label: letter, tex: true });

/** ALGEBRA_KEYS without its bare `x`, for keypads that bring their own variables. */
export const OPERATOR_KEYS: KeypadKey[] = ALGEBRA_KEYS.filter((key) => key.insert !== 'x');

/** An answer in t. */
const T_KEYS: KeypadKey[] = [spaced('t'), ...OPERATOR_KEYS];

/** An answer in t with sines and cosines in it. */
const T_TRIG_KEYS: KeypadKey[] = [spaced('t'), ...TRIG_KEYS.filter((key) => key.insert !== 'x')];

/** An answer in x and y. */
const XY_KEYS: KeypadKey[] = [spaced('x'), spaced('y'), ...OPERATOR_KEYS];

/** A number that may be a fraction. */
const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/** A coefficient in front of something: 1 and -1 are implied. */
const coef = (c: number): string => (c === 1 ? '' : c === -1 ? '-' : `${c}`);

/** `+ 3` or `- 3`, for appending to a term the learner reads. */
const signed = (c: number): string => (c < 0 ? `- ${-c}` : `+ ${c}`);

/** A number that may follow an operator: negatives are bracketed. */
const bracketed = (n: number): string => (n < 0 ? `(${n})` : `${n}`);

/** A point as the learner reads it. */
const pair = (x: number, y: number): string => `(${x}, ${y})`;

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** A stable hash of some numbers, mixed so that small inputs still spread. */
export function mix(...values: number[]): number {
  let hash = 0x9e3779b9;
  for (const value of values) {
    hash = Math.imul(hash ^ (value + 1013), 0x85ebca6b);
    hash ^= hash >>> 13;
  }
  // A full finaliser, so the low bits a slot is taken from depend on every input bit.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** Items turned so the first lands `turn` places along. */
export function turned<T>(items: T[], turn: number): T[] {
  const at = ((turn % items.length) + items.length) % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/**
 * The rotation `choiceVariant` applies to a derived `+choice` slide.
 *
 * Mirrors its private `rotation()`: the options' labels hashed in order. If
 * that changes, only the answer's slot drifts, and the slot count in the
 * browser pass is what would show it.
 */
function derivedTurn(opts: ChoiceOption[]): number {
  let hash = 0;
  for (const option of opts) {
    for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % opts.length;
}

/**
 * Orders the distractors so the derived choice slide puts the answer in slot
 * `salt % n`.
 *
 * Labels here are short numbers and points, and hashing short labels lands the
 * answer in the same one or two slots far more often than chance. Trying the
 * orderings of the distractors until the rotation lands where the salt says is
 * cheap and keeps each question rendering one way.
 */
export function steered(opts: ChoiceOption[], salt: number, spare: Omit<ChoiceOption, 'correct'>[] = []): ChoiceOption[] {
  const [correct, ...given] = opts;
  // The rotation hashes the labels with an odd multiplier, so its parity is
  // fixed by which labels are present, whatever their order: with four
  // options, reordering alone reaches only two of the slots. Spare
  // distractors give other sets to try, the given ones first.
  const seen = new Set(opts.map((o) => o.tex));
  const pool: ChoiceOption[] = [...given];
  for (const option of spare) {
    if (seen.has(option.tex)) continue;
    seen.add(option.tex);
    pool.push(option);
  }
  // Short of four, spares top the question up.
  const n = Math.max(opts.length, Math.min(4, 1 + pool.length));
  const want = salt % n;
  const sets: ChoiceOption[][] = [];
  const choose = (from: number, built: ChoiceOption[]) => {
    if (built.length === n - 1) {
      sets.push(built);
      return;
    }
    for (let i = from; i < pool.length; i += 1) choose(i + 1, [...built, pool[i]]);
  };
  choose(0, []);
  for (const set of sets) {
    const orders: ChoiceOption[][] = [];
    const permute = (left: ChoiceOption[], built: ChoiceOption[]) => {
      if (left.length === 0) orders.push(built);
      for (let i = 0; i < left.length; i += 1) permute([...left.slice(0, i), ...left.slice(i + 1)], [...built, left[i]]);
    };
    permute(set, []);
    for (const order of orders) {
      const candidate = [correct, ...order];
      if ((n - derivedTurn(candidate)) % n === want) return candidate;
    }
  }
  return sets.length > 0 ? [correct, ...sets[0]] : opts;
}

/** Options for a whole-number answer: the slips given, then near misses. */
export function numberChoices(correct: number, wrong: number[], salt: number): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of wrong) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  for (let step = 1; picked.length < 3; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (picked.length === 3 || seen.has(candidate)) continue;
      seen.add(candidate);
      picked.push(candidate);
    }
  }
  const spare: number[] = [];
  for (let step = 1; spare.length < 4; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (!seen.has(candidate)) spare.push(candidate);
    }
  }
  const asOption = (v: number) => ({ tex: `${v}`, answer: `${v}` });
  return steered(options(asOption(correct), ...picked.map(asOption)), salt, spare.map(asOption));
}

/** The same option with its sign turned over: a distractor held in reserve. */
function negated(option: Omit<ChoiceOption, 'correct'>): Omit<ChoiceOption, 'correct'> {
  return {
    tex: option.tex.startsWith('-') ? option.tex.slice(1) : `-${option.tex}`,
    answer: option.answer === undefined ? undefined : `-(${option.answer})`,
  };
}

/** A tiles bank of whole numbers: the answer's, then distinct extras, sorted. */
export function numberBank(answer: number[], distractors: number[], spare = 3): string[] {
  const needed = new Set(answer);
  const extras: number[] = [];
  const add = (value: number) => {
    if (!Number.isInteger(value) || needed.has(value) || extras.includes(value)) return;
    extras.push(value);
  };
  for (const value of distractors) {
    if (extras.length >= spare) break;
    add(value);
  }
  for (let step = 1; extras.length < spare; step += 1) {
    for (const value of answer) {
      add(value + step);
      add(value - step);
    }
  }
  return [...answer, ...extras].sort((a, b) => a - b).map(String);
}

/** A tiles bank of TeX tokens: the answer's, then distinct extras, in a stable order. */
export function tokenBank(answer: string[], extras: string[], spare = 3): string[] {
  const out = [...answer];
  const seen = new Set(answer);
  for (const token of extras) {
    if (out.length - answer.length >= spare) break;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/** A tree bank: every answer value (as a multiset), then distinct distractors. */
export function treeBank(answer: number[], distractors: number[]): string[] {
  const extras: number[] = [];
  for (const value of distractors) {
    if (!Number.isInteger(value) || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  for (let step = 1; extras.length < 3; step += 1) {
    for (const value of [answer[answer.length - 1] + step, answer[0] - step]) {
      if (!answer.includes(value) && !extras.includes(value)) extras.push(value);
    }
  }
  return [...answer, ...extras.slice(0, 4)].sort((a, b) => a - b).map(String);
}

/**
 * A steps bank: the value and its near misses, de-duplicated and scattered by
 * a hash of each token, so one question always renders one way.
 */
export function stepBank(value: string, ...candidates: string[]): string[] {
  const bank = [value];
  for (const candidate of candidates) {
    if (!bank.includes(candidate)) bank.push(candidate);
  }
  return bank.sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** A fraction as the learner reads it, lowest terms, sign out front. */
export function fracTex(top: number, bottom: number): string {
  const g = gcd(top, bottom);
  let p = top / g;
  let q = bottom / g;
  if (q < 0) {
    p = -p;
    q = -q;
  }
  if (q === 1) return `${p}`;
  return `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`;
}

/** The same fraction for mathjs. */
function fracAnswer(top: number, bottom: number): string {
  return `(${top})/(${bottom})`;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/** Leibniz notation for a derivative. */
const d = (top: string, bottom: string): string => `\\frac{d${top}}{d${bottom}}`;
const DYDX = d('y', 'x');
const DXDT = d('x', 't');
const DYDT = d('y', 't');

/* ---------- Parametric curves ---------- */

/** x and y as polynomials in t, highest power first. */
export interface ParamCurve {
  x: number[];
  y: number[];
}

/** A polynomial as the learner reads it; never the empty string. */
export function polyTex(coefficients: readonly number[], variable = 't'): string {
  const top = coefficients.length - 1;
  const tex = sumTex(coefficients.map((c, i) => termTex(c, top - i).replace('x', variable)));
  return tex === '' ? '0' : tex;
}

/** The same polynomial for mathjs. */
export function polyAnswer(coefficients: readonly number[], variable = 't'): string {
  const top = coefficients.length - 1;
  const terms = coefficients
    .map((c, i) => termAnswer(c, top - i).replace('x', variable))
    .filter((term) => term !== '0');
  return terms.length === 0 ? '0' : terms.map((term) => `(${term})`).join(' + ');
}

/** The derivative's coefficients, highest power first. */
export function derived(coefficients: readonly number[]): number[] {
  const top = coefficients.length - 1;
  if (top === 0) return [0];
  return coefficients.slice(0, -1).map((c, i) => c * (top - i));
}

/** A polynomial's value, by Horner's rule. */
export function valueAt(coefficients: readonly number[], value: number): number {
  return coefficients.reduce((total, c) => total * value + c, 0);
}

/** A polynomial of a given degree with a non-zero leading coefficient. */
function randomPoly(rng: Rng, degree: number, size: number): number[] {
  const lead = rng.int(1, size) * rng.sign();
  const rest = Array.from({ length: degree }, () => rng.int(-size, size));
  return [lead, ...rest];
}

/** a (t - v)^2 + c, expanded: a quadratic whose derivative vanishes at t = v. */
function vertexPoly(a: number, v: number, c: number): number[] {
  return [a, -2 * a * v, a * v * v + c];
}

/** How wide a TeX string reads, roughly: commands and markup stripped. */
const visible = (tex: string): number => tex.replace(/\\[a-z]+/g, ' ').replace(/[{}^_]/g, '').length;

/** The curve's two equations: side by side when they fit a phone, stacked when not. */
function curveBlocks(curve: ParamCurve): Block[] {
  const x = `x = ${polyTex(curve.x)}`;
  const y = `y = ${polyTex(curve.y)}`;
  if (visible(x) + visible(y) <= 24) return [display(`${x}, \\quad ${y}`)];
  return [display(x), display(y)];
}

/** The mathjs sources for x(t) and y(t), for the independent test. */
export const curveSources = (curve: ParamCurve): { x: string; y: string } => ({
  x: polyAnswer(curve.x),
  y: polyAnswer(curve.y),
});

/** The point at a value of t. */
const pointAt = (curve: ParamCurve, t: number): [number, number] => [valueAt(curve.x, t), valueAt(curve.y, t)];

/** [dx/dt, dy/dt] at a value of t. */
const ratesAt = (curve: ParamCurve, t: number): [number, number] => [
  valueAt(derived(curve.x), t),
  valueAt(derived(curve.y), t),
];

/**
 * A parametric curve drawn on square axes, with no inset.
 *
 * `plotSvg` draws y as a function of x, which a parametric curve usually is
 * not. This one traces (x(t), y(t)) instead. Like `vectorSvg` it maps the
 * window to the very edge of the picture, so a slider's marker, which is placed
 * as a fraction of the figure box, lines up with the drawing at every value.
 */
export function paramSvg(
  f: (t: number) => [number, number],
  opts: { span: number; tMin: number; tMax: number; marks?: [number, number][]; label: string },
): string {
  const SIZE = 220;
  const { span, tMin, tMax, marks = [] } = opts;
  const sx = (v: number) => ((SIZE * (v + span)) / (2 * span)).toFixed(1);
  const sy = (v: number) => ((SIZE * (span - v)) / (2 * span)).toFixed(1);
  const clamp = (v: number) => Math.max(-3 * span, Math.min(3 * span, v));
  const parts = [`<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="${opts.label}">`];
  parts.push(
    `<line x1="0" y1="${sy(0)}" x2="${SIZE}" y2="${sy(0)}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${sx(0)}" y1="0" x2="${sx(0)}" y2="${SIZE}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  );
  const SAMPLES = 240;
  const points: string[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const [x, y] = f(tMin + ((tMax - tMin) * i) / SAMPLES);
    points.push(`${i === 0 ? 'M' : 'L'} ${sx(clamp(x))},${sy(clamp(y))}`);
  }
  parts.push(`<path fill="none" stroke="currentColor" stroke-width="2" d="${points.join(' ')}" />`);
  for (const [x, y] of marks) {
    parts.push(`<circle cx="${sx(x)}" cy="${sy(y)}" r="4" fill="currentColor" stroke="currentColor" stroke-width="2" />`);
  }
  parts.push('</svg>');
  return parts.join('');
}

/** A curve in t, sampled until `accept` says yes. */
function sampleCurve(rng: Rng, degrees: [number[], number[]], size: number): ParamCurve {
  for (;;) {
    const x = randomPoly(rng, rng.pick(degrees[0]), size);
    const y = randomPoly(rng, rng.pick(degrees[1]), size);
    if (x.length === 2 && y.length === 2) continue;
    return { x, y };
  }
}

/* ---------- A point at a value of t ---------- */

export interface PointParams {
  curve: ParamCurve;
  k: number;
}

function samplePoint(rng: Rng, difficulty: number): PointParams {
  const hard = difficulty >= 2;
  for (;;) {
    const curve = sampleCurve(rng, hard ? [[1, 2, 3], [2, 3]] : [[1, 2], [1, 2]], hard ? 4 : 3);
    const k = hard ? rng.int(-3, 3) : rng.int(-2, 3);
    const [x0, y0] = pointAt(curve, k);
    if (k === 0 || Math.abs(x0) > 40 || Math.abs(y0) > 40) continue;
    return { curve, k };
  }
}

/**
 * A point on a parametric curve, placed as tiles.
 *
 * The bank holds the point at $-t$, the slip of squaring a negative $t$ as if
 * it were positive, and the coordinates one step along — and since both
 * coordinates are in the bank, the pair written the wrong way round is always
 * on offer too.
 */
const paramPoint: Generator<PointParams> = {
  id: 'param-point',
  sample: samplePoint,
  choices: ({ curve, k }) => {
    const [x0, y0] = pointAt(curve, k);
    const [xm, ym] = pointAt(curve, -k);
    const [x1, y1] = pointAt(curve, k + 1);
    const all = options(
      { tex: pair(x0, y0) },
      { tex: pair(y0, x0) },
      { tex: pair(xm, ym) },
      { tex: pair(x0, y1) },
      { tex: pair(x1, y1) },
      { tex: pair(x1, y0) },
    );
    return steered(
      all.slice(0, 4),
      mix(x0, y0, k),
      all.slice(4),
    );
  },
  render: ({ curve, k }): Slide => {
    const [x0, y0] = pointAt(curve, k);
    const [xm, ym] = pointAt(curve, -k);
    return {
      kind: 'tiles',
      prompt: [prose('A curve is traced by'), ...curveBlocks(curve), prose(`Which point is reached when $t = ${k}$?`)],
      template: '({0}, {1})',
      bank: numberBank([x0, y0], [xm, ym, valueAt(curve.x, k + 1), valueAt(curve.y, k + 1)]),
      answer: [`${x0}`, `${y0}`],
    };
  },
  solution: ({ curve, k }) => {
    const [x0, y0] = pointAt(curve, k);
    return [
      { text: `Put $t = ${k}$ into each equation. The $x$ equation gives the first coordinate.`, tex: `x = ${x0}` },
      { text: 'The $y$ equation gives the second.', tex: `y = ${y0}` },
      { text: `So the point is $${pair(x0, y0)}$: $x$ first, then $y$.` },
    ];
  },
};

/* ---------- Which t gives a point ---------- */

export interface FindTParams {
  /** Which coordinate is the linear one, a t + b. */
  linear: 'x' | 'y';
  a: number;
  b: number;
  /** The other coordinate. */
  other: number[];
  t0: number;
}

const findCurve = ({ linear, a, b, other }: FindTParams): ParamCurve =>
  linear === 'x' ? { x: [a, b], y: other } : { x: other, y: [a, b] };

function sampleFindT(rng: Rng, difficulty: number, cubic = true): FindTParams {
  const hard = difficulty >= 2;
  for (;;) {
    const params: FindTParams = {
      linear: rng.chance(0.5) ? 'x' : 'y',
      a: hard ? rng.int(1, 3) * rng.sign() : rng.pick([1, 2]),
      b: rng.int(-6, 6),
      other: randomPoly(rng, hard && cubic ? rng.pick([2, 3]) : 2, 3),
      t0: rng.int(-4, 4),
    };
    const [x0, y0] = pointAt(findCurve(params), params.t0);
    if (params.t0 === 0 || Math.abs(x0) > 40 || Math.abs(y0) > 40) continue;
    return params;
  }
}

/**
 * The value of t at a point, found from the coordinate that is linear in t.
 *
 * The distractors are the value with its sign flipped, the coordinate itself,
 * and the linear equation half-solved: the constant moved over but not yet
 * divided by the coefficient of $t$.
 */
const paramFindT: Generator<FindTParams> = {
  id: 'param-find-t',
  sample: sampleFindT,
  choices: (params) => {
    const { linear, a, b, t0 } = params;
    const [x0, y0] = pointAt(findCurve(params), t0);
    const value = linear === 'x' ? x0 : y0;
    return numberChoices(t0, [-t0, value - b, value, t0 + b], mix(t0, a, b));
  },
  render: (params): Slide => {
    const [x0, y0] = pointAt(findCurve(params), params.t0);
    return {
      kind: 'expression',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(findCurve(params)),
        prose(`The point $${pair(x0, y0)}$ lies on it. Which value of $t$ gives that point?`),
      ],
      lead: 't =',
      keypad: [],
      answer: `${params.t0}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { linear, a, b, t0 } = params;
    const curve = findCurve(params);
    const [x0, y0] = pointAt(curve, t0);
    const value = linear === 'x' ? x0 : y0;
    const otherName = linear === 'x' ? 'y' : 'x';
    return [
      {
        text: `The $${linear}$ equation has only one value of $t$ for each $${linear}$, so solve that one.`,
        tex: `${polyTex([a, b])} = ${value}`,
      },
      { tex: `t = ${t0}` },
      {
        text: `Check it in the $${otherName}$ equation: $t = ${t0}$ gives $${otherName} = ${linear === 'x' ? y0 : x0}$, as it should.`,
      },
    ];
  },
};

/* ---------- Is a point on the curve? ---------- */

export interface OnCurveParams extends FindTParams {
  /** Added to the other coordinate: 0 when the point is on the curve. */
  shift: number;
}

/**
 * Whether a point lies on the curve, as a walk: find t from the linear
 * coordinate, put it into the other, compare.
 *
 * Wrong turns end with what they lead to, stated as fact: the grade comes
 * from the path, so an outcome saying "that is wrong" would be a hint.
 */
const paramOnCurve: Generator<OnCurveParams> = {
  id: 'param-on-curve',
  sample: (rng, difficulty) => {
    const base = sampleFindT(rng, difficulty, false);
    return { ...base, a: difficulty >= 2 ? base.a : 1, shift: rng.chance(0.5) ? 0 : rng.int(1, 3) * rng.sign() };
  },
  render: (params): Slide => {
    const { linear, t0, shift } = params;
    const curve = findCurve(params);
    const other: 'x' | 'y' = linear === 'x' ? 'y' : 'x';
    const [x0, y0] = pointAt(curve, t0);
    const P = linear === 'x' ? pair(x0, y0 + shift) : pair(x0 + shift, y0);
    const given = linear === 'x' ? x0 : y0;
    const otherCoeffs = linear === 'x' ? curve.y : curve.x;
    const found = valueAt(otherCoeffs, t0);
    const turn = mix(t0, shift, params.b);
    const tWrong = [-t0, given].filter((v, i, all) => v !== t0 && all.indexOf(v) === i);
    const valueWrong = [valueAt(otherCoeffs, -t0), found + (shift === 0 ? 2 : shift)].filter(
      (v, i, all) => v !== found && all.indexOf(v) === i,
    );
    const onIt = shift === 0;
    return {
      kind: 'flow',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(curve),
        prose(`Is the point $${P}$ on it? Use the $${linear}$ equation to find $t$ first.`),
      ],
      subject: `P = ${P}`,
      steps: [
        {
          id: 't',
          ask: `Which value of $t$ makes $${linear} = ${given}$?`,
          branches: turned(
            [
              { label: `$t = ${t0}$`, to: 'value' },
              ...tWrong.map((v) => ({
                label: `$t = ${v}$`,
                outcome: `Then $${linear} = ${valueAt(linear === 'x' ? curve.x : curve.y, v)}$ there.`,
              })),
            ],
            turn % (tWrong.length + 1),
          ),
        },
        {
          id: 'value',
          ask: `Put $t = ${t0}$ into the $${other}$ equation. What do you get?`,
          branches: turned(
            [
              { label: `$${other} = ${found}$`, to: 'verdict' },
              ...valueWrong.map((v) => ({
                label: `$${other} = ${v}$`,
                outcome: `Then the point on the curve at $t = ${t0}$ has $${other} = ${v}$.`,
              })),
            ],
            (turn >>> 4) % (valueWrong.length + 1),
          ),
        },
        {
          id: 'verdict',
          ask: `So is $${P}$ on the curve?`,
          branches: [
            { label: 'Yes', outcome: `Then $${P}$ is the point where $t = ${t0}$.` },
            { label: 'No', outcome: `Then the curve passes $${linear} = ${given}$ at a different point.` },
          ],
        },
      ],
      answer: [`$t = ${t0}$`, `$${other} = ${found}$`, onIt ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { linear, t0, shift } = params;
    const curve = findCurve(params);
    const other = linear === 'x' ? 'y' : 'x';
    const [x0, y0] = pointAt(curve, t0);
    const found = linear === 'x' ? y0 : x0;
    return [
      { text: `Solve the $${linear}$ equation, which is linear in $t$.`, tex: `t = ${t0}` },
      { text: `Put that into the $${other}$ equation.`, tex: `${other} = ${found}` },
      {
        text:
          shift === 0
            ? `That matches the point, so it is on the curve, at $t = ${t0}$.`
            : `The point has $${other} = ${found + shift}$ instead, so it is not on the curve. Only one value of $t$ gives that $${linear}$, so no other $t$ can rescue it.`,
      },
    ];
  },
};

/* ---------- Where the curve crosses an axis ---------- */

export interface AxisParams {
  /** Which axis is crossed: the y-axis is where x = 0. */
  axis: 'x' | 'y';
  a: number;
  t0: number;
  other: number[];
}

/** The curve, with the coordinate that vanishes written as a(t - t0). */
export const axisCurve = ({ axis, a, t0, other }: AxisParams): ParamCurve =>
  axis === 'y' ? { x: [a, -a * t0], y: other } : { x: other, y: [a, -a * t0] };

/**
 * Where a parametric curve crosses an axis, as a two-row tree: first the t
 * that makes one coordinate zero, then the other coordinate there.
 *
 * The bank carries the other coordinate at $t = 0$ — the reflex of "an
 * intercept is where the variable is zero", applied to the wrong variable.
 */
const paramAxisTree: Generator<AxisParams> = {
  id: 'param-axis-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const params: AxisParams = {
        axis: rng.chance(0.5) ? 'x' : 'y',
        a: hard ? rng.int(1, 3) * rng.sign() : rng.pick([1, 2]),
        t0: rng.int(-3, 4),
        other: randomPoly(rng, hard ? rng.pick([2, 3]) : 2, 3),
      };
      const value = valueAt(params.other, params.t0);
      if (params.t0 === 0 || Math.abs(value) > 40 || value === valueAt(params.other, 0)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { axis, a, t0, other } = params;
    const zeroed = axis === 'y' ? 'x' : 'y';
    const kept = axis === 'y' ? 'y' : 'x';
    const value = valueAt(other, t0);
    return {
      kind: 'tree',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(axisCurve(params)),
        prose(
          `Where does it cross the $${axis}$-axis? The top box is the value of $t$ that makes $${zeroed} = 0$; the box below is $${kept}$ there.`,
        ),
      ],
      expression: `${polyTex([a, -a * t0])} = 0`,
      nodes: [
        { id: 't', from: [] },
        { id: 'v', from: ['t'] },
      ],
      bank: treeBank([t0, value], [-t0, valueAt(other, 0), valueAt(other, -t0), -a * t0]),
      answer: [`${t0}`, `${value}`],
    };
  },
  solution: (params) => {
    const { axis, a, t0, other } = params;
    const zeroed = axis === 'y' ? 'x' : 'y';
    const kept = axis === 'y' ? 'y' : 'x';
    return [
      { text: `On the $${axis}$-axis, $${zeroed} = 0$.`, tex: `${polyTex([a, -a * t0])} = 0` },
      { tex: `t = ${t0}` },
      { text: `Put $t = ${t0}$ into the $${kept}$ equation.`, tex: `${kept} = ${valueAt(other, t0)}` },
      {
        text: `So it crosses at $${axis === 'y' ? pair(0, valueAt(other, t0)) : pair(valueAt(other, t0), 0)}$. Putting $t = 0$ in instead finds where the curve starts, not where it meets the axis.`,
      },
    ];
  },
};

/* ---------- Eliminating t ---------- */

export type EliminateParams =
  | { form: 'linear'; a: number; b: number; y: number[] }
  | { form: 'exp'; k: number; n: number; c: number };

/** t written in x, as the learner reads it inside a bracket. */
function tInX(a: number, b: number): string {
  return a === 1 ? `(x ${signed(-b)})` : `\\left(\\tfrac{x ${signed(-b)}}{${a}}\\right)`;
}

/** y(t) with t replaced by a TeX body, e.g. 2(x - 3)^2 - (x - 3) + 4. */
function substitutedTex(y: number[], body: string): string {
  const top = y.length - 1;
  return sumTex(
    y.map((c, i) => {
      const power = top - i;
      if (c === 0) return '0';
      if (power === 0) return `${c}`;
      return `${coef(c)}${body}${power === 1 ? '' : `^${power}`}`;
    }),
  );
}

/** y(t) with t replaced by a mathjs expression. */
function substitutedAnswer(y: number[], inner: string): string {
  const top = y.length - 1;
  return y.map((c, i) => `(${c})*(${inner})^(${top - i})`).join(' + ');
}

/** The Cartesian equation's right-hand side for mathjs, and the display. */
export function eliminated(params: EliminateParams): { tex: string; answer: string } {
  if (params.form === 'exp') {
    const { k, n, c } = params;
    return { tex: `${coef(k)}x^{${n}} ${signed(c)}`, answer: `(${k})*x^(${n}) + (${c})` };
  }
  const { a, b, y } = params;
  return { tex: substitutedTex(y, tInX(a, b)), answer: substitutedAnswer(y, `(x - (${b}))/(${a})`) };
}

/** x(t) and y(t) for mathjs, for the independent test. */
export function eliminateSources(params: EliminateParams): { x: string; y: string } {
  if (params.form === 'exp') return { x: 'e^t', y: `(${params.k})*e^(${params.n}*t) + (${params.c})` };
  return { x: polyAnswer([params.a, params.b]), y: polyAnswer(params.y) };
}

function eliminateBlocks(params: EliminateParams): Block[] {
  if (params.form === 'exp') {
    const { k, n, c } = params;
    return [display(`x = e^{t}, \\quad y = ${coef(k)}e^{${n}t} ${signed(c)}`)];
  }
  return curveBlocks({ x: [params.a, params.b], y: params.y });
}

/**
 * The Cartesian equation of a parametric curve, typed as y in terms of x.
 *
 * Any correct writing passes, expanded or not: the skill is removing $t$, not
 * a form. The distractors are the three ways of turning $x = at + b$ round
 * wrongly — the sign of $b$ kept, $b$ forgotten, and the division by $a$
 * forgotten — and for $x = e^{t}$, keeping the exponential.
 */
const paramEliminate: Generator<EliminateParams> = {
  id: 'param-eliminate',
  sample: (rng, difficulty) => {
    if (difficulty >= 2 && rng.chance(0.35)) {
      return { form: 'exp', k: rng.int(1, 5), n: rng.pick([2, 3]), c: rng.int(1, 9) * rng.sign() };
    }
    // A cubic keeps x's multiplier at 1: a cubed fraction runs off a phone.
    const cubic = difficulty >= 2 && rng.chance(0.4);
    const a = difficulty >= 2 && !cubic ? rng.pick([1, 2, 3]) : 1;
    const b = rng.int(1, 6) * rng.sign();
    const y = cubic
      ? [rng.int(1, 2), 0, rng.int(-4, 4), rng.int(-5, 5)]
      : [rng.int(1, 3), rng.int(-4, 4), rng.int(-5, 5)];
    return { form: 'linear', a, b, y };
  },
  choices: (params) => {
    const right = eliminated(params);
    if (params.form === 'exp') {
      const { k, n, c } = params;
      return steered(
        options(
          { tex: `y = ${right.tex}`, answer: right.answer },
          { tex: `y = ${coef(k)}e^{${n}x} ${signed(c)}`, answer: `(${k})*e^(${n}*x) + (${c})` },
          { tex: `y = ${coef(k * n)}x ${signed(c)}`, answer: `(${k * n})*x + (${c})` },
          { tex: `y = ${coef(k)}x^{${n + 1}} ${signed(c)}`, answer: `(${k})*x^(${n + 1}) + (${c})` },
        ),
        mix(k, n, c),
        [
          { tex: `y = ${coef(k)}x^{${n}} ${signed(-c)}`, answer: `(${k})*x^(${n}) + (${-c})` },
          { tex: `y = ${coef(k * n)}x^{${n}} ${signed(c)}`, answer: `(${k * n})*x^(${n}) + (${c})` },
        ],
      );
    }
    const { a, b, y } = params;
    const flipped = { tex: `y = ${substitutedTex(y, tInX(a, -b))}`, answer: substitutedAnswer(y, `(x + (${b}))/(${a})`) };
    const wrong =
      a === 1
        ? [
            flipped,
            { tex: `y = ${polyTex(y, 'x')}`, answer: polyAnswer(y, 'x') },
            // Only the squared t replaced, the rest read as if t were x.
            ...(y.length === 3 && y[1] !== 0
              ? [
                  {
                    tex: `y = ${sumTex([`${coef(y[0])}${tInX(1, b)}^2`, termTex(y[1], 1), termTex(y[2], 0)])}`,
                    answer: `(${y[0]})*(x - (${b}))^2 + (${y[1]})*x + (${y[2]})`,
                  },
                ]
              : []),
          ]
        : [
            flipped,
            { tex: `y = ${substitutedTex(y, `(x ${signed(-b)})`)}`, answer: substitutedAnswer(y, `x - (${b})`) },
            { tex: `y = ${substitutedTex(y, `(${a}x ${signed(b)})`)}`, answer: substitutedAnswer(y, `${a}*x + (${b})`) },
          ];
    // The top power's t read as x, the rest replaced properly.
    const top = y.length - 1;
    const rest = substitutedTex(y.slice(1), tInX(a, b));
    const halfDone = rest === ''
      ? []
      : [
          {
            tex: `y = ${sumTex([`${coef(y[0])}x^{${top}}`, rest])}`,
            answer: `(${y[0]})*x^(${top}) + ${substitutedAnswer(y.slice(1), `(x - (${b}))/(${a})`)}`,
          },
        ];
    // The constant's sign slipped.
    const slipped = y[top] === 0
      ? []
      : [
          {
            tex: `y = ${substitutedTex([...y.slice(0, top), -y[top]], tInX(a, b))}`,
            answer: substitutedAnswer([...y.slice(0, top), -y[top]], `(x - (${b}))/(${a})`),
          },
        ];
    return steered(
      options({ tex: `y = ${right.tex}`, answer: right.answer }, ...wrong),
      mix(a, b, ...y),
      [...halfDone, ...slipped],
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose('A curve is traced by'),
      ...eliminateBlocks(params),
      prose('Find its Cartesian equation: $y$ in terms of $x$, with no $t$ left.'),
    ],
    lead: 'y =',
    keypad: ALGEBRA_KEYS,
    answer: eliminated(params).answer,
    domain: params.form === 'exp' ? 'positive' : 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const right = eliminated(params);
    if (params.form === 'exp') {
      const { n } = params;
      return [
        { text: `$e^{${n}t}$ is $(e^{t})^{${n}}$, and $e^{t}$ is $x$.`, tex: `e^{${n}t} = x^{${n}}` },
        { text: 'Replace it, and $t$ has gone.', tex: `y = ${right.tex}` },
      ];
    }
    const { a, b } = params;
    return [
      { text: 'Make $t$ the subject of the $x$ equation.', tex: `t = ${a === 1 ? `x ${signed(-b)}` : `\\frac{x ${signed(-b)}}{${a}}`}` },
      { text: 'Put that in place of every $t$ in the $y$ equation.' },
      { tex: `y = ${right.tex}` },
      { text: 'Expanding is fine but not needed: any correct form is accepted.' },
    ];
  },
};

/* ---------- Choosing how to eliminate t ---------- */

export type EliminateFlowParams =
  | { form: 'linear'; b: number; c: number }
  | { form: 'circle'; r: number; swap: boolean }
  | { form: 'ellipse'; a: number; b: number; swap: boolean };

const trigPair = (p: number, q: number, swap: boolean): string =>
  swap
    ? `x = ${coef(p)}\\sin t, \\quad y = ${coef(q)}\\cos t`
    : `x = ${coef(p)}\\cos t, \\quad y = ${coef(q)}\\sin t`;

function eliminateFlowSubject(params: EliminateFlowParams): string {
  if (params.form === 'linear') return `x = t ${signed(params.b)}, \\quad y = t^{2} ${signed(params.c)}`;
  if (params.form === 'circle') return trigPair(params.r, params.r, params.swap);
  return trigPair(params.a, params.b, params.swap);
}

/** [the right Cartesian equation, three wrong ones]. */
function eliminateFlowResults(params: EliminateFlowParams): string[] {
  if (params.form === 'linear') {
    const { b, c } = params;
    return [
      `y = (x ${signed(-b)})^{2} ${signed(c)}`,
      `y = (x ${signed(b)})^{2} ${signed(c)}`,
      `y = x^{2} ${signed(c - b)}`,
      `y = (x ${signed(-b)})^{2}`,
    ];
  }
  if (params.form === 'circle') {
    const { r } = params;
    return [`x^{2} + y^{2} = ${r * r}`, `x^{2} + y^{2} = ${r}`, `x + y = ${r}`, `x^{2} - y^{2} = ${r * r}`];
  }
  const { a, b } = params;
  return [
    `\\frac{x^{2}}{${a * a}} + \\frac{y^{2}}{${b * b}} = 1`,
    `\\frac{x^{2}}{${b * b}} + \\frac{y^{2}}{${a * a}} = 1`,
    `\\frac{x^{2}}{${a}} + \\frac{y^{2}}{${b}} = 1`,
    `${a * a}x^{2} + ${b * b}y^{2} = 1`,
  ];
}

const MAKE_SUBJECT = 'Make $t$ the subject of the $x$ equation and substitute';
const SQUARE_ADD = 'Rearrange for $\\cos t$ and $\\sin t$, then use $\\sin^{2} t + \\cos^{2} t = 1$';
const DIVIDE = 'Divide the $y$ equation by the $x$ equation';

/**
 * Removing t as two decisions: which method this pair of equations calls for,
 * then what it produces.
 *
 * A linear $x$ can be turned round for $t$; a sine and cosine cannot usefully,
 * and the Pythagorean identity from Trigonometric Functions removes both at
 * once. Dividing is offered because it looks like progress and never is.
 */
const paramEliminateFlow: Generator<EliminateFlowParams> = {
  id: 'param-eliminate-flow',
  sample: (rng, difficulty) => {
    const roll = rng.int(0, difficulty >= 2 ? 2 : 1);
    if (roll === 0) {
      const b = rng.int(1, 6) * rng.sign();
      let c = rng.int(1, 9) * rng.sign();
      // y = x^2 + (c - b) is a distractor, and "+ 0" would read as a typo.
      while (c === b) c = rng.int(1, 9) * rng.sign();
      return { form: 'linear', b, c };
    }
    if (roll === 1) return { form: 'circle', r: rng.int(2, 9), swap: rng.chance(0.5) };
    const a = rng.int(2, 6);
    let b = rng.int(2, 6);
    while (b === a) b = rng.int(2, 6);
    return { form: 'ellipse', a, b, swap: rng.chance(0.5) };
  },
  render: (params): Slide => {
    const linear = params.form === 'linear';
    const results = eliminateFlowResults(params);
    const salt =
      params.form === 'linear'
        ? mix(1, params.b, params.c)
        : params.form === 'circle'
          ? mix(2, params.r, params.swap ? 1 : 0)
          : mix(3, params.a, params.b, params.swap ? 1 : 0);
    const method = linear ? MAKE_SUBJECT : SQUARE_ADD;
    const methods = [
      { label: method, to: 'result' },
      linear
        ? { label: SQUARE_ADD, outcome: 'Then there is no $\\sin t$ or $\\cos t$ to square, and $t$ stays in both equations.' }
        : {
            label: MAKE_SUBJECT,
            outcome: `Then $t$ comes out as an inverse ${params.swap ? 'sine' : 'cosine'}, and putting that inside the other trigonometric function leaves a tangle rather than an equation in $x$ and $y$.`,
          },
      { label: DIVIDE, outcome: `Then $\\frac{y}{x}$ is still a function of $t$, so $t$ has not gone.` },
    ];
    return {
      kind: 'flow',
      prompt: [prose('Find the Cartesian equation of this curve: one equation in $x$ and $y$ with no $t$.')],
      subject: eliminateFlowSubject(params),
      steps: [
        { id: 'method', ask: 'How do you remove $t$?', branches: turned(methods, salt % 3) },
        {
          id: 'result',
          ask: 'Which equation does that give?',
          branches: turned(
            results.map((tex, i) =>
              i === 0
                ? { label: `$${tex}$`, outcome: 'That is the curve with $t$ removed.' }
                : { label: `$${tex}$`, outcome: `Then the curve would be $${tex}$.` },
            ),
            (salt >>> 3) % 4,
          ),
        },
      ],
      answer: [method, `$${results[0]}$`],
    };
  },
  solution: (params) => {
    const result = eliminateFlowResults(params)[0];
    if (params.form === 'linear') {
      const { b } = params;
      return [
        { text: 'The $x$ equation is linear in $t$, so turn it round.', tex: `t = x ${signed(-b)}` },
        { text: 'Substitute into the $y$ equation.', tex: result },
      ];
    }
    const [p, q] = params.form === 'circle' ? [params.r, params.r] : [params.a, params.b];
    const [xf, yf] = params.swap ? ['\\sin', '\\cos'] : ['\\cos', '\\sin'];
    return [
      { text: 'Get each trigonometric function on its own.', tex: `${xf} t = \\frac{x}{${p}}, \\quad ${yf} t = \\frac{y}{${q}}` },
      { text: 'Square and add: the left-hand sides make $\\sin^{2} t + \\cos^{2} t = 1$.' },
      { tex: result },
      ...(params.form === 'circle' ? [{ text: `A circle of radius $${params.r}$ about the origin.` }] : []),
    ];
  },
};

/* ---------- A circle traced by t ---------- */

export interface CircleParams {
  p: number;
  q: number;
  r: number;
  /** x uses sin and y cos, rather than the usual way round. */
  swap: boolean;
}

function circleBlocks({ p, q, r, swap }: CircleParams): Block[] {
  const [xf, yf] = swap ? ['\\sin t', '\\cos t'] : ['\\cos t', '\\sin t'];
  return [display(`x = ${r}${xf} ${signed(p)}, \\quad y = ${r}${yf} ${signed(q)}`)];
}

/**
 * A circle with its centre moved, written in centre-radius form.
 *
 * The bank carries the centre's signs flipped — the slip of reading
 * $x = 3\cos t - 2$ as a circle about $x = -(-2)$ — and the radius unsquared.
 */
const paramCircleTiles: Generator<CircleParams> = {
  id: 'param-circle-tiles',
  sample: (rng, difficulty) => ({
    p: rng.int(1, 6) * rng.sign(),
    q: rng.int(1, 6) * rng.sign(),
    r: difficulty >= 2 ? rng.int(2, 9) : rng.int(2, 6),
    swap: difficulty >= 2 && rng.chance(0.5),
  }),
  render: (params): Slide => {
    const { p, q, r } = params;
    const answer = [signed(-p), signed(-q), `${r * r}`];
    return {
      kind: 'tiles',
      prompt: [prose('This curve is a circle.'), ...circleBlocks(params), prose('Complete its Cartesian equation.')],
      template: '(x {0})^2 + (y {1})^2 = {2}',
      bank: tokenBank(answer, [signed(p), signed(q), `${r}`, `${2 * r}`, `${r * r + 1}`]),
      answer,
    };
  },
  solution: ({ p, q, r, swap }) => {
    const [xf, yf] = swap ? ['\\sin t', '\\cos t'] : ['\\cos t', '\\sin t'];
    return [
      { text: 'Move the constants over, so each trigonometric part is alone.', tex: `x ${signed(-p)} = ${r}${xf}` },
      { tex: `y ${signed(-q)} = ${r}${yf}` },
      { text: `Square and add. The right-hand sides make $${r * r}(\\sin^{2} t + \\cos^{2} t) = ${r * r}$.` },
      { tex: `(x ${signed(-p)})^{2} + (y ${signed(-q)})^{2} = ${r * r}` },
      { text: `A circle with centre $${pair(p, q)}$ and radius $${r}$.` },
    ];
  },
};

/* ---------- An ellipse traced by t ---------- */

export interface EllipseParams {
  a: number;
  b: number;
  swap: boolean;
}

/**
 * $x = a\cos t$, $y = b\sin t$ as a whole-number Cartesian equation,
 * $b^2x^2 + a^2y^2 = a^2b^2$.
 *
 * Both squares are in the bank, so the swap — $a^2$ against $x^2$ — is
 * always on offer, alongside the unsquared lengths.
 */
const paramEllipseTiles: Generator<EllipseParams> = {
  id: 'param-ellipse-tiles',
  sample: (rng, difficulty) => {
    const a = rng.int(2, difficulty >= 2 ? 7 : 6);
    let b = rng.int(2, difficulty >= 2 ? 7 : 6);
    while (b === a) b = rng.int(2, difficulty >= 2 ? 7 : 6);
    return { a, b, swap: rng.chance(0.5) };
  },
  render: ({ a, b, swap }): Slide => {
    const answer = [b * b, a * a, a * a * b * b];
    return {
      kind: 'tiles',
      prompt: [
        prose('This curve is an ellipse.'),
        display(trigPair(a, b, swap)),
        prose('Write its Cartesian equation with whole numbers: multiply through so there are no fractions.'),
      ],
      template: '{0}x^2 + {1}y^2 = {2}',
      bank: numberBank(answer, [a, b, a * a + b * b, a * b]),
      answer: answer.map(String),
    };
  },
  solution: ({ a, b, swap }) => {
    const [xf, yf] = swap ? ['\\sin', '\\cos'] : ['\\cos', '\\sin'];
    return [
      { text: 'Get each trigonometric function on its own.', tex: `${xf} t = \\frac{x}{${a}}` },
      { tex: `${yf} t = \\frac{y}{${b}}` },
      { text: 'Square and add, using $\\sin^{2} t + \\cos^{2} t = 1$.', tex: `\\frac{x^{2}}{${a * a}} + \\frac{y^{2}}{${b * b}} = 1` },
      { text: `Multiply through by $${a * a * b * b}$.`, tex: `${b * b}x^{2} + ${a * a}y^{2} = ${a * a * b * b}` },
    ];
  },
};

/* ---------- The gradient of a parametric curve ---------- */

export interface GradientParams {
  curve: ParamCurve;
}

/** True when dy/dt is a constant multiple of dx/dt, so dy/dx would not depend on t. */
function proportional(curve: ParamCurve): boolean {
  const [a1, b1] = ratesAt(curve, 1);
  const [a2, b2] = ratesAt(curve, 2);
  const [a3, b3] = ratesAt(curve, -1);
  return a1 * b2 === a2 * b1 && a1 * b3 === a3 * b1;
}

function sampleGradient(rng: Rng, difficulty: number): GradientParams {
  const hard = difficulty >= 2;
  for (;;) {
    const curve = sampleCurve(rng, hard ? [[2, 3], [2, 3]] : [[1, 2], [2, 3]], hard ? 4 : 3);
    if (proportional(curve)) continue;
    return { curve };
  }
}

/** dy/dx as a fraction of two polynomials in t. */
const gradientTex = (curve: ParamCurve): string =>
  `\\frac{${polyTex(derived(curve.y))}}{${polyTex(derived(curve.x))}}`;

const gradientAnswer = (curve: ParamCurve): string =>
  `(${polyAnswer(derived(curve.y))})/(${polyAnswer(derived(curve.x))})`;

/**
 * dy/dx for a parametric curve, in terms of t.
 *
 * Differentiate each equation with respect to $t$ and divide — the chain rule
 * between rates from Differentiation, read backwards. The distractors are the
 * division upside down, the two rates multiplied, and the two *equations*
 * divided rather than their derivatives.
 */
const paramGradient: Generator<GradientParams> = {
  id: 'param-gradient',
  sample: sampleGradient,
  choices: ({ curve }) => {
    const dx = derived(curve.x);
    const dy = derived(curve.y);
    return steered(
      options(
        { tex: gradientTex(curve), answer: gradientAnswer(curve) },
        { tex: `\\frac{${polyTex(dx)}}{${polyTex(dy)}}`, answer: `(${polyAnswer(dx)})/(${polyAnswer(dy)})` },
        { tex: `\\frac{${polyTex(curve.y)}}{${polyTex(curve.x)}}`, answer: `(${polyAnswer(curve.y)})/(${polyAnswer(curve.x)})` },
        // Multiplying by dx/dt = ±1 is the same as dividing by it, so that slip is only a slip otherwise.
        ...(dx.length === 1 && Math.abs(dx[0]) === 1
          ? []
          : [{ tex: `(${polyTex(dy)})(${polyTex(dx)})`, answer: `(${polyAnswer(dy)})*(${polyAnswer(dx)})` }]),
      ),
      mix(...curve.x, ...curve.y),
    );
  },
  render: ({ curve }): Slide => ({
    kind: 'expression',
    prompt: [prose('A curve is traced by'), ...curveBlocks(curve), prose('Find its gradient in terms of $t$.')],
    lead: `${DYDX} =`,
    keypad: T_KEYS,
    answer: gradientAnswer(curve),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ curve }) => [
    { text: 'Differentiate each equation with respect to $t$.', tex: `${DXDT} = ${polyTex(derived(curve.x))}` },
    { tex: `${DYDT} = ${polyTex(derived(curve.y))}` },
    { text: `Divide: $${DYDX} = ${DYDT} \\div ${DXDT}$, the chain rule read backwards.` },
    { tex: `${DYDX} = ${gradientTex(curve)}` },
  ],
};

/**
 * The same division assembled from tiles, in the order it is written.
 *
 * The bank holds both rates, so putting $\frac{dx}{dt}$ on top is always
 * possible, and the two equations undifferentiated.
 */
const paramRatioTiles: Generator<GradientParams> = {
  id: 'param-ratio-tiles',
  sample: sampleGradient,
  render: ({ curve }): Slide => {
    const dx = polyTex(derived(curve.x));
    const dy = polyTex(derived(curve.y));
    return {
      kind: 'tiles',
      prompt: [prose('A curve is traced by'), ...curveBlocks(curve), prose('Build its gradient.')],
      template: `${DYDX} = ({0}) \\div ({1})`,
      bank: tokenBank([dy, dx], [polyTex(curve.y), polyTex(curve.x), polyTex(derived(derived(curve.y)))], 2),
      answer: [dy, dx],
    };
  },
  solution: ({ curve }) => [
    { text: 'Differentiate both equations with respect to $t$.', tex: `${DXDT} = ${polyTex(derived(curve.x))}` },
    { tex: `${DYDT} = ${polyTex(derived(curve.y))}` },
    {
      text: `The $dt$s cancel when $${DYDT}$ is divided by $${DXDT}$, which is why that is the way up: $y$'s rate on top.`,
      tex: `${DYDX} = ${gradientTex(curve)}`,
    },
  ],
};

/* ---------- Trigonometric parametric gradients ---------- */

export interface TrigGradientParams {
  /** 'cs': x = a cos t, y = b sin t. 'sc': x = a sin t, y = b cos t. 'ls': x = a t, y = b sin t. 'cq': x = a cos t, y = b t^2. */
  form: 'cs' | 'sc' | 'ls' | 'cq';
  a: number;
  b: number;
}

export function trigSources({ form, a, b }: TrigGradientParams): { x: string; y: string } {
  if (form === 'cs') return { x: `${a}*cos(t)`, y: `${b}*sin(t)` };
  if (form === 'sc') return { x: `${a}*sin(t)`, y: `${b}*cos(t)` };
  if (form === 'ls') return { x: `${a}*t`, y: `${b}*sin(t)` };
  return { x: `${a}*cos(t)`, y: `${b}*t^2` };
}

function trigBlock({ form, a, b }: TrigGradientParams): Block {
  if (form === 'cs') return display(`x = ${coef(a)}\\cos t, \\quad y = ${coef(b)}\\sin t`);
  if (form === 'sc') return display(`x = ${coef(a)}\\sin t, \\quad y = ${coef(b)}\\cos t`);
  if (form === 'ls') return display(`x = ${coef(a)}t, \\quad y = ${coef(b)}\\sin t`);
  return display(`x = ${coef(a)}\\cos t, \\quad y = ${coef(b)}t^{2}`);
}

/** [dx/dt TeX, dy/dt TeX, dy/dx TeX, dy/dx mathjs]. */
function trigGradient({ form, a, b }: TrigGradientParams): [string, string, string, string] {
  if (form === 'cs') {
    return [`-${coef(a)}\\sin t`, `${coef(b)}\\cos t`, `-\\frac{${coef(b)}\\cos t}{${coef(a)}\\sin t}`, `-(${b}*cos(t))/(${a}*sin(t))`];
  }
  if (form === 'sc') {
    return [`${coef(a)}\\cos t`, `-${coef(b)}\\sin t`, `-\\frac{${coef(b)}\\sin t}{${coef(a)}\\cos t}`, `-(${b}*sin(t))/(${a}*cos(t))`];
  }
  if (form === 'ls') {
    return [`${a}`, `${coef(b)}\\cos t`, a === 1 ? `${coef(b)}\\cos t` : `\\frac{${coef(b)}\\cos t}{${a}}`, `(${b}*cos(t))/(${a})`];
  }
  return [`-${coef(a)}\\sin t`, `${2 * b}t`, `-\\frac{${2 * b}t}{${coef(a)}\\sin t}`, `-(${2 * b}*t)/(${a}*sin(t))`];
}

/**
 * dy/dx for a curve traced by sines and cosines.
 *
 * The standard derivatives come from Differentiation; the slips offered are
 * the division upside down and the sign of the derivative of cosine lost.
 */
const paramGradientTrig: Generator<TrigGradientParams> = {
  id: 'param-gradient-trig',
  sample: (rng, difficulty) => {
    const form = difficulty >= 2 ? rng.pick(['cs', 'sc', 'ls', 'cq'] as const) : rng.pick(['cs', 'sc'] as const);
    const a = rng.int(2, 5);
    let b = rng.int(1, 6);
    while (b === a) b = rng.int(1, 6);
    return { form, a, b };
  },
  choices: (params) => {
    const { form, a, b } = params;
    const [, , tex, answer] = trigGradient(params);
    const wrong: Omit<ChoiceOption, 'correct'>[] =
      form === 'cs'
        ? [
            { tex: `\\frac{${coef(b)}\\cos t}{${coef(a)}\\sin t}`, answer: `(${b}*cos(t))/(${a}*sin(t))` },
            { tex: `-\\frac{${coef(a)}\\sin t}{${coef(b)}\\cos t}`, answer: `-(${a}*sin(t))/(${b}*cos(t))` },
            { tex: `\\frac{${coef(b)}\\sin t}{${coef(a)}\\cos t}`, answer: `(${b}*sin(t))/(${a}*cos(t))` },
          ]
        : form === 'sc'
          ? [
              { tex: `\\frac{${coef(b)}\\sin t}{${coef(a)}\\cos t}`, answer: `(${b}*sin(t))/(${a}*cos(t))` },
              { tex: `-\\frac{${coef(a)}\\cos t}{${coef(b)}\\sin t}`, answer: `-(${a}*cos(t))/(${b}*sin(t))` },
              { tex: `\\frac{${coef(b)}\\cos t}{${coef(a)}\\sin t}`, answer: `(${b}*cos(t))/(${a}*sin(t))` },
            ]
          : form === 'ls'
            ? [
                { tex: `-\\frac{${coef(b)}\\cos t}{${a}}`, answer: `-(${b}*cos(t))/(${a})` },
                { tex: `\\frac{${a}}{${coef(b)}\\cos t}`, answer: `(${a})/(${b}*cos(t))` },
                { tex: `${a * b}\\cos t`, answer: `${a * b}*cos(t)` },
              ]
            : [
                { tex: `\\frac{${2 * b}t}{${coef(a)}\\sin t}`, answer: `(${2 * b}*t)/(${a}*sin(t))` },
                { tex: `-\\frac{${coef(a)}\\sin t}{${2 * b}t}`, answer: `-(${a}*sin(t))/(${2 * b}*t)` },
                { tex: `\\frac{${2 * b}t}{${coef(a)}\\cos t}`, answer: `(${2 * b}*t)/(${a}*cos(t))` },
              ];
    return steered(options({ tex, answer }, ...wrong), mix(a, b, form.charCodeAt(0), form.charCodeAt(1)), wrong.map(negated));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [prose('A curve is traced by'), trigBlock(params), prose('Find its gradient in terms of $t$.')],
    lead: `${DYDX} =`,
    keypad: T_TRIG_KEYS,
    answer: trigGradient(params)[3],
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const [dx, dy, dydx] = trigGradient(params);
    return [
      { text: 'Differentiate each equation with respect to $t$.', tex: `${DXDT} = ${dx}` },
      { tex: `${DYDT} = ${dy}` },
      { text: `Divide $${DYDT}$ by $${DXDT}$.`, tex: `${DYDX} = ${dydx}` },
    ];
  },
};

/* ---------- The gradient at a value of t ---------- */

export interface SlopeAtParams {
  curve: ParamCurve;
  k: number;
}

/** A curve and a value of t where dy/dx is a whole number. */
function sampleSlopeAt(rng: Rng, difficulty: number, avoidUnit = false): SlopeAtParams {
  const hard = difficulty >= 2;
  for (;;) {
    const curve = sampleCurve(rng, hard ? [[2, 3], [2, 3]] : [[1, 2], [2, 3]], 3);
    const k = rng.int(-3, 3);
    const [dx, dy] = ratesAt(curve, k);
    const [x0, y0] = pointAt(curve, k);
    if (dx === 0 || dy % dx !== 0) continue;
    const m = dy / dx;
    if (Math.abs(dy) > 60 || Math.abs(dx) > 30 || Math.abs(x0) > 30 || Math.abs(y0) > 40) continue;
    if (avoidUnit && (m === 0 || Math.abs(m) === 1 || y0 - m * x0 === 0 || Math.abs(y0 - m * x0) > 60)) continue;
    if (dx === dy || k === 0) continue;
    return { curve, k };
  }
}

/** [dx/dt, dy/dt, dy/dx] at t = k. */
export function slopeValues({ curve, k }: SlopeAtParams): [number, number, number] {
  const [dx, dy] = ratesAt(curve, k);
  return [dx, dy, dy / dx];
}

/**
 * The gradient at a value of t as a tree: both rates at that moment, then
 * their quotient.
 *
 * The bank holds the coordinates at $t = k$ — a gradient needs the rates, not
 * where the point is — and the quotient upside down where it is whole.
 */
const paramSlopeTree: Generator<SlopeAtParams> = {
  id: 'param-slope-tree',
  sample: (rng, difficulty) => sampleSlopeAt(rng, difficulty),
  render: (params): Slide => {
    const { curve, k } = params;
    const [dx, dy, m] = slopeValues(params);
    const [x0, y0] = pointAt(curve, k);
    return {
      kind: 'tree',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(curve),
        prose(
          `Find its gradient where $t = ${k}$. The top row is $${DYDT}$ and $${DXDT}$ there; the box below is $${DYDX}$.`,
        ),
      ],
      expression: `${DYDX} = ${DYDT} \\div ${DXDT}`,
      nodes: [
        { id: 'dy', from: [] },
        { id: 'dx', from: [] },
        { id: 'm', from: ['dy', 'dx'] },
      ],
      bank: treeBank([dy, dx, m], [x0, y0, dx % dy === 0 ? dx / dy : dy * dx, dy - dx]),
      answer: [dy, dx, m].map(String),
    };
  },
  solution: (params) => {
    const { curve, k } = params;
    const [dx, dy, m] = slopeValues(params);
    return [
      { text: `Differentiate, then put in $t = ${k}$.`, tex: `${DXDT} = ${polyTex(derived(curve.x))} = ${dx}` },
      { tex: `${DYDT} = ${polyTex(derived(curve.y))} = ${dy}` },
      { text: 'Divide.', tex: `${DYDX} = ${dy} \\div ${bracketed(dx)} = ${m}` },
    ];
  },
};

/* ---------- The tangent ---------- */

/**
 * A tangent line y = mx + c assembled from tiles.
 *
 * Shared by the parametric and implicit levels. The gradient blank's bank
 * holds its negative and whatever the caller's slips are; the intercept's holds
 * the sign slip of $y_1 + mx_1$ and $y_1$ itself.
 */
function tangentTiles(prompt: Block[], m: number, x0: number, y0: number, slips: number[]): Slide {
  const c = y0 - m * x0;
  const pick = (values: number[], right: number): number[] =>
    values.filter((v, i) => Number.isInteger(v) && v !== right && v !== 0 && values.indexOf(v) === i).slice(0, 2);
  const bank = [`${m}`, signed(c), ...pick([-m, ...slips], m).map(String), ...pick([y0 + m * x0, y0, -c], c).map(signed)];
  return {
    kind: 'tiles',
    prompt,
    template: 'y = {0}x {1}',
    bank: bank.sort((a, b) => Number(a.replace(/\s/g, '')) - Number(b.replace(/\s/g, '')) || a.localeCompare(b)),
    answer: [`${m}`, signed(c)],
  };
}

function tangentSolution(m: number, x0: number, y0: number, gradientStep: SolutionStep[]): SolutionStep[] {
  const c = y0 - m * x0;
  return [
    ...gradientStep,
    { text: `The tangent passes through $${pair(x0, y0)}$ with gradient $${m}$.`, tex: `y ${signed(-y0)} = ${m}(x ${signed(-x0)})` },
    { text: 'Expand and tidy.', tex: `y = ${m}x ${signed(c)}` },
  ];
}

/** The tangent to a parametric curve at a value of t. */
const paramTangent: Generator<SlopeAtParams> = {
  id: 'param-tangent',
  sample: (rng, difficulty) => sampleSlopeAt(rng, difficulty, true),
  render: (params): Slide => {
    const { curve, k } = params;
    const [dx, dy, m] = slopeValues(params);
    const [x0, y0] = pointAt(curve, k);
    return tangentTiles(
      [prose('A curve is traced by'), ...curveBlocks(curve), prose(`Find the tangent where $t = ${k}$.`)],
      m,
      x0,
      y0,
      [dy, dx],
    );
  },
  solution: (params) => {
    const { curve, k } = params;
    const [dx, dy, m] = slopeValues(params);
    const [x0, y0] = pointAt(curve, k);
    return tangentSolution(m, x0, y0, [
      { text: `At $t = ${k}$ the point is $${pair(x0, y0)}$.` },
      { text: `The rates there are $${DXDT} = ${dx}$ and $${DYDT} = ${dy}$.`, tex: `${DYDX} = ${m}` },
    ]);
  },
};

/* ---------- A trigonometric gradient at a special angle ---------- */

export interface TrigSlopeParams {
  /** 'cs': x = a cos t, y = b sin t. 'sc': x = a sin t, y = b cos t. 'ls': x = a t, y = b sin t. */
  form: 'cs' | 'sc' | 'ls';
  a: number;
  b: number;
  /** Index into ANGLES. */
  angle: number;
}

/** Angles in radians, with the TeX, cos and sin written exactly as ratios over 2. */
export const ANGLES: readonly { tex: string; value: number }[] = [
  { tex: '\\frac{\\pi}{4}', value: Math.PI / 4 },
  { tex: '\\frac{3\\pi}{4}', value: (3 * Math.PI) / 4 },
  { tex: '\\frac{5\\pi}{4}', value: (5 * Math.PI) / 4 },
  { tex: '\\frac{7\\pi}{4}', value: (7 * Math.PI) / 4 },
  { tex: '\\frac{\\pi}{3}', value: Math.PI / 3 },
  { tex: '\\frac{2\\pi}{3}', value: (2 * Math.PI) / 3 },
  { tex: '\\pi', value: Math.PI },
  { tex: '0', value: 0 },
];

export function trigSlopeSources({ form, a, b }: TrigSlopeParams): { x: string; y: string } {
  if (form === 'cs') return { x: `${a}*cos(t)`, y: `${b}*sin(t)` };
  if (form === 'sc') return { x: `${a}*sin(t)`, y: `${b}*cos(t)` };
  return { x: `${a}*t`, y: `${b}*sin(t)` };
}

/** cos t at each angle, in halves: the thirds and π are all a whole number of halves. */
const COS_HALVES = [0, 0, 0, 0, 1, -1, -2, 2];

/** The gradient at the angle, as [numerator, denominator]. */
export function trigSlope({ form, a, b, angle }: TrigSlopeParams): [number, number] {
  if (form === 'ls') return [b * COS_HALVES[angle], 2 * a];
  // -(b/a) cot t and -(b/a) tan t: both are ±1 at the quarter angles, +1 at π/4 and 5π/4.
  const quarterSign = angle === 0 || angle === 2 ? 1 : -1;
  return [-b * quarterSign, a];
}

function trigSlopeBlock({ form, a, b }: TrigSlopeParams): Block {
  if (form === 'cs') return display(`x = ${coef(a)}\\cos t, \\quad y = ${coef(b)}\\sin t`);
  if (form === 'sc') return display(`x = ${coef(a)}\\sin t, \\quad y = ${coef(b)}\\cos t`);
  return display(`x = ${coef(a)}t, \\quad y = ${coef(b)}\\sin t`);
}

/**
 * The gradient of a trigonometric curve at an exact angle.
 *
 * Quarter angles make $\tan t$ and $\cot t$ equal to $\pm 1$, so the gradient
 * is $\pm\frac{b}{a}$; the thirds make $\cos t$ a half. The options are the
 * same ratio with the sign lost and upside down.
 */
const paramTrigSlope: Generator<TrigSlopeParams> = {
  id: 'param-trig-slope',
  sample: (rng, difficulty) => {
    const form = difficulty >= 2 ? rng.pick(['cs', 'sc', 'ls'] as const) : rng.pick(['cs', 'sc'] as const);
    for (;;) {
      const params: TrigSlopeParams = {
        form,
        a: rng.int(1, 6),
        b: rng.int(1, 9),
        angle: form === 'ls' ? rng.int(4, 7) : rng.int(0, 3),
      };
      // A gradient of ±1 is its own reciprocal, and the options would collapse.
      const [top, bottom] = trigSlope(params);
      if (Math.abs(top) === Math.abs(bottom)) continue;
      return params;
    }
  },
  choices: (params) => {
    const [top, bottom] = trigSlope(params);
    return steered(
      options(
        { tex: fracTex(top, bottom), answer: fracAnswer(top, bottom) },
        { tex: fracTex(-top, bottom), answer: fracAnswer(-top, bottom) },
        { tex: fracTex(bottom, top), answer: fracAnswer(bottom, top) },
        { tex: fracTex(-bottom, top), answer: fracAnswer(-bottom, top) },
      ),
      mix(params.a, params.b, params.angle),
      [
        { tex: fracTex(2 * top, bottom), answer: fracAnswer(2 * top, bottom) },
        { tex: fracTex(top, 2 * bottom), answer: fracAnswer(top, 2 * bottom) },
        { tex: fracTex(-2 * top, bottom), answer: fracAnswer(-2 * top, bottom) },
      ],
    );
  },
  render: (params): Slide => {
    const [top, bottom] = trigSlope(params);
    return {
      kind: 'expression',
      prompt: [
        prose('A curve is traced by'),
        trigSlopeBlock(params),
        prose(`Find its gradient where $t = ${ANGLES[params.angle].tex}$. It is an exact number.`),
      ],
      lead: `${DYDX} =`,
      keypad: FRACTION_KEYS,
      answer: fracAnswer(top, bottom),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { form, a, b, angle } = params;
    const [top, bottom] = trigSlope(params);
    const t = ANGLES[angle].tex;
    const general =
      form === 'cs'
        ? `-\\frac{${coef(b)}\\cos t}{${coef(a)}\\sin t}`
        : form === 'sc'
          ? `-\\frac{${coef(b)}\\sin t}{${coef(a)}\\cos t}`
          : a === 1
            ? `${coef(b)}\\cos t`
            : `\\frac{${coef(b)}\\cos t}{${a}}`;
    const fact =
      form === 'ls'
        ? `At $t = ${t}$, $\\cos t = ${fracTex(COS_HALVES[angle], 2)}$.`
        : `At $t = ${t}$, $\\sin t$ and $\\cos t$ are equal in size, and ${angle === 0 || angle === 2 ? 'have the same sign' : 'have opposite signs'}.`;
    return [
      { text: 'Differentiate both and divide.', tex: `${DYDX} = ${general}` },
      { text: fact },
      { tex: `${DYDX} = ${fracTex(top, bottom)}` },
    ];
  },
};

/* ---------- Horizontal and vertical tangents ---------- */

export type TangentKind = 'horizontal' | 'vertical' | 'neither';

export interface KindParams {
  curve: ParamCurve;
  k: number;
  kind: TangentKind;
}

/** A polynomial of degree 2 or 3 whose derivative vanishes at t = k. */
function flatAt(rng: Rng, k: number): number[] {
  if (rng.chance(0.5)) return vertexPoly(rng.int(1, 2) * rng.sign(), k, rng.int(-5, 5));
  const a = rng.int(-2, 2);
  return [1, a, -(3 * k * k + 2 * a * k), rng.int(-5, 5)];
}

/** Degree 2 or 3, with a derivative that does not vanish at t = k. */
function movingAt(rng: Rng, k: number): number[] {
  for (;;) {
    const poly = randomPoly(rng, rng.pick([2, 3]), 3);
    if (valueAt(derived(poly), k) !== 0) return poly;
  }
}

/**
 * Horizontal, vertical or neither, at a value of t.
 *
 * Native choice with the three answers always in the same order: with only
 * three and each correct a third of the time, a fixed order teaches nothing
 * about position.
 */
const paramTangentKind: Generator<KindParams> = {
  id: 'param-tangent-kind',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['horizontal', 'vertical', 'neither'] as const);
    const k = rng.int(difficulty >= 2 ? -3 : -2, 3);
    const flat = flatAt(rng, k);
    const moving = movingAt(rng, k);
    const curve =
      kind === 'horizontal' ? { x: moving, y: flat } : kind === 'vertical' ? { x: flat, y: moving } : { x: moving, y: movingAt(rng, k) };
    return { curve, k, kind };
  },
  render: ({ curve, k }): Slide => ({
    kind: 'choice',
    prompt: [
      prose('A curve is traced by'),
      ...curveBlocks(curve),
      prose(`At the point where $t = ${k}$, is the tangent horizontal, vertical, or neither?`),
    ],
    options: [
      { id: 'horizontal', label: 'Horizontal' },
      { id: 'vertical', label: 'Vertical' },
      { id: 'neither', label: 'Neither' },
    ],
    correctId: (() => {
      const [dx, dy] = ratesAt(curve, k);
      return dy === 0 ? 'horizontal' : dx === 0 ? 'vertical' : 'neither';
    })(),
  }),
  solution: ({ curve, k }) => {
    const [dx, dy] = ratesAt(curve, k);
    return [
      { text: `Differentiate and put in $t = ${k}$.`, tex: `${DXDT} = ${dx}` },
      { tex: `${DYDT} = ${dy}` },
      {
        text:
          dy === 0
            ? `$y$ is momentarily not changing while $x$ is, so $${DYDX} = 0$: the tangent is horizontal.`
            : dx === 0
              ? `$x$ is momentarily not changing while $y$ is, so $${DYDX}$ has a zero underneath: the tangent is vertical.`
              : `Neither rate is zero, so $${DYDX} = ${fracTex(dy, dx)}$: the tangent is neither horizontal nor vertical.`,
      },
    ];
  },
};

export interface FlatParams {
  /** x = ax (t - tx)^2 + cx, y = ay (t - ty)^2 + cy, expanded. */
  ax: number;
  tx: number;
  cx: number;
  ay: number;
  ty: number;
  cy: number;
  /** Asking where the tangent is horizontal, rather than vertical. */
  horizontal: boolean;
}

export const flatCurve = ({ ax, tx, cx, ay, ty, cy }: FlatParams): ParamCurve => ({
  x: vertexPoly(ax, tx, cx),
  y: vertexPoly(ay, ty, cy),
});

/** The t where the asked-about tangent occurs, and where the other one does. */
export const flatT = (params: FlatParams): [number, number] =>
  params.horizontal ? [params.ty, params.tx] : [params.tx, params.ty];

function sampleFlat(rng: Rng, difficulty: number, span = 6): FlatParams {
  const hard = difficulty >= 2;
  for (;;) {
    const params: FlatParams = {
      ax: rng.pick(hard ? [1, 2, -1, -2] : [1, -1]),
      tx: rng.int(-3, 3),
      cx: rng.int(-span, span),
      ay: rng.pick(hard ? [1, 2, -1, -2] : [1, -1]),
      ty: rng.int(-3, 3),
      cy: rng.int(-span, span),
      horizontal: rng.chance(0.5),
    };
    if (params.tx === params.ty) continue;
    const curve = flatCurve(params);
    const [t0] = flatT(params);
    const [x0, y0] = pointAt(curve, t0);
    if (Math.abs(x0) > span || Math.abs(y0) > span) continue;
    return params;
  }
}

/**
 * The value of t where the tangent is horizontal or vertical.
 *
 * Both coordinates are quadratics with their own turning t, so the value for
 * the *other* kind of tangent is always a distractor: setting the wrong
 * derivative to zero is the slip.
 */
const paramFlatT: Generator<FlatParams> = {
  id: 'param-flat-t',
  sample: (rng, difficulty) => sampleFlat(rng, difficulty, 9),
  choices: (params) => {
    const [t0, t1] = flatT(params);
    const [x0, y0] = pointAt(flatCurve(params), t0);
    return numberChoices(t0, [t1, -t0, params.horizontal ? y0 : x0], mix(t0, t1, params.cx, params.cy));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose('A curve is traced by'),
      ...curveBlocks(flatCurve(params)),
      prose(`At which value of $t$ is its tangent ${params.horizontal ? 'horizontal' : 'vertical'}?`),
    ],
    lead: 't =',
    keypad: [],
    answer: `${flatT(params)[0]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const curve = flatCurve(params);
    const [t0] = flatT(params);
    const zero = params.horizontal ? DYDT : DXDT;
    const coeffs = params.horizontal ? curve.y : curve.x;
    return [
      {
        text: params.horizontal
          ? `A horizontal tangent has $${DYDX} = 0$: $y$ stops changing while $x$ keeps going. So set $${DYDT} = 0$.`
          : `A vertical tangent is where $x$ stops changing while $y$ keeps going. So set $${DXDT} = 0$.`,
        tex: `${zero} = ${polyTex(derived(coeffs))} = 0`,
      },
      { tex: `t = ${t0}` },
      {
        text: `Check the other rate is not zero there too: it is $${valueAt(derived(params.horizontal ? curve.x : curve.y), t0)}$.`,
      },
    ];
  },
};

/**
 * Where the tangent is horizontal (or vertical), slid to on the picture.
 *
 * A horizontal tangent is a height, so the marker is a horizontal line; a
 * vertical tangent is a position across, so the marker stands upright. The
 * value slid to is the coordinate there, found by setting the right rate to
 * zero and putting that t back in.
 */
const paramFlatSlider: Generator<FlatParams> = {
  id: 'param-flat-slider',
  // An untouched slider rests at 0, the middle of its track, so 0 is never the answer.
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleFlat(rng, difficulty);
      const [x0, y0] = pointAt(flatCurve(params), flatT(params)[0]);
      if ((params.horizontal ? y0 : x0) !== 0) return params;
    }
  },
  render: (params): Slide => {
    const curve = flatCurve(params);
    const [t0] = flatT(params);
    const [x0, y0] = pointAt(curve, t0);
    const span = 8;
    return {
      kind: 'slider',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(curve),
        prose(
          params.horizontal
            ? 'Slide the line to the height where its tangent is horizontal.'
            : 'Slide the line across to where its tangent is vertical.',
        ),
      ],
      min: -span,
      max: span,
      step: 1,
      answer: params.horizontal ? y0 : x0,
      readout: params.horizontal ? 'y = {v}' : 'x = {v}',
      figure: {
        svg: paramSvg((t) => pointAt(curve, t), {
          span,
          tMin: Math.min(params.tx, params.ty) - 5,
          tMax: Math.max(params.tx, params.ty) + 5,
          label: 'The curve traced as t runs',
        }),
        xMin: -span,
        xMax: span,
        axis: params.horizontal ? 'y' : 'x',
      },
    };
  },
  solution: (params) => {
    const curve = flatCurve(params);
    const [t0] = flatT(params);
    const [x0, y0] = pointAt(curve, t0);
    return params.horizontal
      ? [
          { text: `Horizontal means $${DYDT} = 0$.`, tex: `${polyTex(derived(curve.y))} = 0` },
          { tex: `t = ${t0}` },
          { text: `Put $t = ${t0}$ into the $y$ equation for the height.`, tex: `y = ${y0}` },
        ]
      : [
          { text: `Vertical means $${DXDT} = 0$.`, tex: `${polyTex(derived(curve.x))} = 0` },
          { tex: `t = ${t0}` },
          { text: `Put $t = ${t0}$ into the $x$ equation for the position.`, tex: `x = ${x0}` },
        ];
  },
};

/**
 * Finding a horizontal or vertical tangent as three decisions: which rate is
 * zero, the t that gives, and the point there.
 */
const paramFlatFlow: Generator<FlatParams> = {
  id: 'param-flat-flow',
  sample: (rng, difficulty) => sampleFlat(rng, difficulty, 9),
  render: (params): Slide => {
    const curve = flatCurve(params);
    const [t0, t1] = flatT(params);
    const [x0, y0] = pointAt(curve, t0);
    const salt = mix(t0, t1, params.cx, params.cy);
    const which = params.horizontal ? 'horizontal' : 'vertical';
    const right = params.horizontal ? `Where $${DYDT} = 0$` : `Where $${DXDT} = 0$`;
    const other = params.horizontal ? `Where $${DXDT} = 0$` : `Where $${DYDT} = 0$`;
    const [xs, ys] = pointAt(curve, 0);
    const tWrong = [t1, -t0].filter((v, i, all) => v !== t0 && all.indexOf(v) === i);
    const pointWrong = [pair(y0, x0), pair(t0, params.horizontal ? y0 : x0), pair(-x0, y0)].filter(
      (p, i, all) => p !== pair(x0, y0) && all.indexOf(p) === i,
    );
    return {
      kind: 'flow',
      prompt: [prose('A curve is traced by'), ...curveBlocks(curve), prose(`Find the point where its tangent is ${which}.`)],
      subject: `${DYDX} = ${DYDT} \\div ${DXDT}`,
      steps: [
        {
          id: 'rate',
          ask: `Where is the tangent ${which}?`,
          branches: turned(
            [
              { label: right, to: 't' },
              { label: other, outcome: `Then you find where the tangent is ${params.horizontal ? 'vertical' : 'horizontal'}.` },
              { label: 'Where $t = 0$', outcome: `Then the point is $${pair(xs, ys)}$, where the curve is at the start.` },
            ],
            salt % 3,
          ),
        },
        {
          id: 't',
          ask: 'Solve it. Which value of $t$?',
          branches: turned(
            [
              { label: `$t = ${t0}$`, to: 'point' },
              ...tWrong.map((v) => ({ label: `$t = ${v}$`, outcome: `Then the point is $${pair(...pointAt(curve, v))}$.` })),
            ],
            (salt >>> 3) % (tWrong.length + 1),
          ),
        },
        {
          id: 'point',
          ask: `Put $t = ${t0}$ into both equations. Which point?`,
          branches: turned(
            [
              { label: `$${pair(x0, y0)}$`, outcome: `The tangent is ${which} at $${pair(x0, y0)}$.` },
              ...pointWrong.map((p) => ({ label: `$${p}$`, outcome: `Then the tangent would be ${which} at $${p}$.` })),
            ],
            (salt >>> 6) % (pointWrong.length + 1),
          ),
        },
      ],
      answer: [right, `$t = ${t0}$`, `$${pair(x0, y0)}$`],
    };
  },
  solution: (params) => {
    const curve = flatCurve(params);
    const [t0] = flatT(params);
    const [x0, y0] = pointAt(curve, t0);
    const zero = params.horizontal ? DYDT : DXDT;
    return [
      {
        text: params.horizontal
          ? 'Horizontal: $y$ stops changing, so its rate is zero.'
          : 'Vertical: $x$ stops changing, so its rate is zero.',
        tex: `${zero} = ${polyTex(derived(params.horizontal ? curve.y : curve.x))} = 0`,
      },
      { tex: `t = ${t0}` },
      { text: 'Put it into both equations.', tex: `(x, y) = ${pair(x0, y0)}` },
    ];
  },
};

/* ---------- Implicit curves ---------- */

/** One term, c x^a y^b. */
export interface Term {
  c: number;
  a: number;
  b: number;
}

/** A sum of terms equal to `rhs`, built through the whole point (p, q). */
export interface ImplicitCurve {
  terms: Term[];
  rhs: number;
  p: number;
  q: number;
}

/** One term as the learner reads it. */
function monoTex(c: number, a: number, b: number): string {
  if (c === 0) return '0';
  const vars = `${a === 0 ? '' : a === 1 ? 'x' : `x^{${a}}`}${b === 0 ? '' : b === 1 ? 'y' : `y^{${b}}`}`;
  return vars === '' ? `${c}` : `${coef(c)}${vars}`;
}

/** Like terms added together, zeros dropped, first appearance kept in order. */
function collect(terms: Term[]): Term[] {
  const out: Term[] = [];
  for (const term of terms) {
    const same = out.find((t) => t.a === term.a && t.b === term.b);
    if (same) same.c += term.c;
    else out.push({ ...term });
  }
  return out.filter((t) => t.c !== 0);
}

/** A polynomial in x and y as the learner reads it; never the empty string. */
export function xyTex(terms: Term[]): string {
  const tex = sumTex(terms.map((t) => monoTex(t.c, t.a, t.b)));
  return tex === '' ? '0' : tex;
}

/** The same polynomial for mathjs. */
export function xyAnswer(terms: Term[]): string {
  const kept = terms.filter((t) => t.c !== 0);
  return kept.length === 0 ? '0' : kept.map((t) => `(${t.c})*x^(${t.a})*y^(${t.b})`).join(' + ');
}

const negate = (terms: Term[]): Term[] => terms.map((t) => ({ ...t, c: -t.c }));

/** The partial derivative in x: what differentiating gives without a dy/dx. */
export const partialX = (terms: Term[]): Term[] =>
  collect(terms.filter((t) => t.a > 0).map((t) => ({ c: t.c * t.a, a: t.a - 1, b: t.b })));

/** The partial derivative in y: what multiplies dy/dx. */
export const partialY = (terms: Term[]): Term[] =>
  collect(terms.filter((t) => t.b > 0).map((t) => ({ c: t.c * t.b, a: t.a, b: t.b - 1 })));

export function xyAt(terms: Term[], x: number, y: number): number {
  return terms.reduce((total, t) => total + t.c * x ** t.a * y ** t.b, 0);
}

/** F(x, y) for mathjs, for the independent test. */
export const implicitSource = (curve: ImplicitCurve): string => xyAnswer(curve.terms);

/** The equation as the learner reads it. */
export const equationTex = (curve: ImplicitCurve): string => `${xyTex(curve.terms)} = ${curve.rhs}`;

/** The curve's equation as displays: split after its third term when too wide for a phone. */
function equationBlocks(curve: ImplicitCurve): Block[] {
  const whole = equationTex(curve);
  if (visible(whole) <= 26 || curve.terms.length < 4) return [display(whole)];
  const first = xyTex(curve.terms.slice(0, 3));
  const rest = xyTex(curve.terms.slice(3));
  return [display(first), display(`${rest.startsWith('-') ? rest : `+ ${rest}`} = ${curve.rhs}`)];
}

/**
 * dy/dx = P/Q, tidied for reading: the minus sign taken into the top, the
 * bottom's leading term made positive, a common whole factor cancelled.
 */
function slopeParts(terms: Term[]): { top: Term[]; bottom: Term[] } {
  let top = negate(partialX(terms));
  let bottom = partialY(terms);
  if (bottom.length > 0 && bottom[0].c < 0) {
    top = negate(top);
    bottom = negate(bottom);
  }
  const g = [...top, ...bottom].reduce((acc, t) => gcd(acc, t.c), 0);
  if (g > 1) {
    top = top.map((t) => ({ ...t, c: t.c / g }));
    bottom = bottom.map((t) => ({ ...t, c: t.c / g }));
  }
  return { top, bottom };
}

/** A fraction of two polynomials in x and y, with an all-negative top pulled out front. */
function xyFracTex(top: Term[], bottom: Term[]): string {
  const outside = top.length > 0 && top.every((t) => t.c < 0);
  const shown = outside ? negate(top) : top;
  const bare = bottom.length === 1 && bottom[0].a === 0 && bottom[0].b === 0 && bottom[0].c === 1;
  const body = bare ? xyTex(shown) : `\\frac{${xyTex(shown)}}{${xyTex(bottom)}}`;
  return `${outside ? '-' : ''}${body}`;
}

export function slopeTex(terms: Term[]): string {
  const { top, bottom } = slopeParts(terms);
  return xyFracTex(top, bottom);
}

export const slopeAnswer = (terms: Term[]): string =>
  `-(${xyAnswer(partialX(terms))})/(${xyAnswer(partialY(terms))})`;

/** True when dy/dx is a constant: the "curve" is a family of straight lines. */
function straight(terms: Term[]): boolean {
  const N = partialX(terms);
  const D = partialY(terms);
  const points: [number, number][] = [
    [1, 2],
    [2, -1],
    [3, 1],
    [-2, 3],
  ];
  const ratios = points.map(([x, y]) => [xyAt(N, x, y), xyAt(D, x, y)]);
  return ratios.every(([n, d]) => n * ratios[0][1] === d * ratios[0][0]);
}

/** Exponent pairs [a, b] for each term of a curve. */
type Shape = [number, number][];

const EASY_SHAPES: Shape[] = [
  [
    [2, 0],
    [0, 2],
  ],
  [
    [2, 0],
    [1, 1],
    [0, 2],
  ],
  [
    [2, 0],
    [0, 3],
  ],
  [
    [3, 0],
    [0, 2],
  ],
  [
    [1, 1],
    [0, 2],
  ],
  [
    [2, 0],
    [0, 2],
    [1, 0],
  ],
  [
    [2, 0],
    [0, 2],
    [0, 1],
  ],
];

const HARD_SHAPES: Shape[] = [
  [
    [3, 0],
    [1, 1],
    [0, 3],
  ],
  [
    [2, 1],
    [0, 2],
  ],
  [
    [1, 2],
    [2, 0],
  ],
  [
    [3, 0],
    [1, 1],
    [0, 2],
  ],
  [
    [2, 0],
    [1, 1],
    [0, 2],
    [1, 0],
  ],
  [
    [1, 1],
    [0, 3],
    [1, 0],
  ],
  [
    [2, 1],
    [1, 0],
    [0, 2],
  ],
];

/** Shapes with no term mixing x and y: every y term is a pure power of y. */
const SEPARATE_SHAPES: Shape[] = [
  [
    [3, 0],
    [0, 2],
    [0, 1],
  ],
  [
    [2, 0],
    [0, 3],
    [0, 1],
  ],
  [
    [1, 0],
    [0, 3],
  ],
  [
    [2, 0],
    [0, 4],
  ],
  [
    [3, 0],
    [0, 3],
    [0, 2],
  ],
];

interface CurveOptions {
  shapes: Shape[];
  /** Largest coefficient size. */
  size: number;
  /** Largest coordinate size of the whole point. */
  span: number;
}

/** A curve through a whole point, sampled until `accept` holds. */
function sampleImplicit(rng: Rng, opts: CurveOptions, accept: (curve: ImplicitCurve) => boolean = () => true): ImplicitCurve {
  for (;;) {
    const shape = rng.pick(opts.shapes);
    const terms = shape.map(([a, b], i) => ({ c: i === 0 ? rng.int(1, opts.size) : rng.int(1, opts.size) * rng.sign(), a, b }));
    const p = rng.int(1, opts.span) * rng.sign();
    const q = rng.int(1, opts.span) * rng.sign();
    const rhs = xyAt(terms, p, q);
    if (rhs === 0 || Math.abs(rhs) > 99 || straight(terms)) continue;
    const curve = { terms, rhs, p, q };
    if (accept(curve)) return curve;
  }
}

/** [N, D] at the curve's point: dy/dx there is -N / D. */
export function partsAtPoint({ terms, p, q }: ImplicitCurve): [number, number] {
  return [xyAt(partialX(terms), p, q), xyAt(partialY(terms), p, q)];
}

/** A curve and point with a whole, non-zero-denominator gradient there. */
function wholeGradient(curve: ImplicitCurve, limit = 12): boolean {
  const [n, dd] = partsAtPoint(curve);
  return dd !== 0 && n % dd === 0 && Math.abs(n / dd) <= limit && Math.abs(n) <= 60 && Math.abs(dd) <= 60;
}

/** The gradient at the curve's point. */
export const gradientAtPoint = (curve: ImplicitCurve): number => {
  const [n, dd] = partsAtPoint(curve);
  return -n / dd;
};

const optionsFor = (difficulty: number, span = 3): CurveOptions => ({
  shapes: difficulty >= 2 ? HARD_SHAPES : EASY_SHAPES,
  size: difficulty >= 2 ? 4 : 3,
  span,
});

/* ---------- The derivative of a single term ---------- */

export interface ChainTermParams {
  kind: 'power' | 'sin' | 'cos' | 'exp' | 'ln' | 'xpower';
  k: number;
  n: number;
}

function chainTermTex({ kind, k, n }: ChainTermParams): string {
  if (kind === 'power') return monoTex(k, 0, n);
  if (kind === 'xpower') return monoTex(k, n, 0);
  if (kind === 'sin') return `${coef(k)}\\sin y`;
  if (kind === 'cos') return `${coef(k)}\\cos y`;
  if (kind === 'exp') return `${coef(k)}e^{y}`;
  return `${coef(k)}\\ln y`;
}

/** [the right derivative, three slips], TeX. */
function chainTermOptions({ kind, k, n }: ChainTermParams): string[] {
  if (kind === 'power') {
    return [
      `${monoTex(k * n, 0, n - 1)}${DYDX}`,
      monoTex(k * n, 0, n - 1),
      monoTex(k * n, n - 1, 0),
      `${monoTex(k, 0, n)}${DYDX}`,
    ];
  }
  if (kind === 'xpower') {
    return [
      monoTex(k * n, n - 1, 0),
      `${monoTex(k * n, n - 1, 0)}${DYDX}`,
      `${monoTex(k * n, 0, n - 1)}${DYDX}`,
      monoTex(k, n - 1, 0),
    ];
  }
  if (kind === 'sin') return [`${coef(k)}\\cos y${DYDX}`, `${coef(k)}\\cos y`, `${coef(-k)}\\cos y${DYDX}`, `${coef(k)}\\cos x`];
  if (kind === 'cos') return [`${coef(-k)}\\sin y${DYDX}`, `${coef(k)}\\sin y${DYDX}`, `${coef(-k)}\\sin y`, `${coef(-k)}\\sin x`];
  if (kind === 'exp') return [`${coef(k)}e^{y}${DYDX}`, `${coef(k)}e^{y}`, `${coef(k)}ye^{y - 1}${DYDX}`, `${coef(k)}e^{x}`];
  return [`\\frac{${k}}{y}${DYDX}`, `\\frac{${k}}{y}`, `\\frac{${k}}{x}`, `${coef(k)}\\ln y${DYDX}`];
}

/**
 * The derivative with respect to x of one term, where y is a function of x.
 *
 * The chain rule from Differentiation, applied to a letter: every $y$ term
 * brings a $\frac{dy}{dx}$ and every $x$ term does not. Pure $x$ terms are in
 * the mix so the question is *which* terms get one, not whether to write it.
 * The standard derivatives are Differentiation's; this only uses them.
 */
const implChainTerm: Generator<ChainTermParams> = {
  id: 'impl-chain-term',
  sample: (rng, difficulty) => {
    const kinds =
      difficulty >= 2
        ? (['power', 'sin', 'cos', 'exp', 'ln', 'xpower'] as const)
        : (['power', 'power', 'sin', 'cos', 'exp', 'xpower'] as const);
    const kind = rng.pick(kinds);
    const k = rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1);
    return { kind, k, n: rng.int(2, 5) };
  },
  render: (params): Slide => {
    const labels = chainTermOptions(params);
    const slot = mix(params.k, params.n, params.kind.length, params.kind.charCodeAt(1)) % labels.length;
    const [right, ...wrong] = labels;
    const ordered = [...wrong.slice(0, slot), right, ...wrong.slice(slot)];
    return {
      kind: 'choice',
      prompt: [
        prose('Differentiate with respect to $x$, where $y$ is a function of $x$.'),
        display(`\\frac{d}{dx}\\left(${chainTermTex(params)}\\right)`),
      ],
      options: ordered.map((label, i) => ({ id: `o${i}`, label, tex: true })),
      correctId: `o${slot}`,
    };
  },
  solution: (params) => {
    const [right] = chainTermOptions(params);
    const term = chainTermTex(params);
    if (params.kind === 'xpower') {
      return [
        { text: `$${term}$ has no $y$ in it, so it differentiates exactly as it always has.`, tex: right },
        { text: `A $${DYDX}$ appears only where a $y$ is differentiated.` },
      ];
    }
    return [
      { text: `Differentiate $${term}$ as if $y$ were the variable.` },
      {
        text: `$y$ is itself a function of $x$, so the chain rule multiplies by $${DYDX}$.`,
        tex: `\\frac{d}{dx}\\left(${term}\\right) = ${right}`,
      },
    ];
  },
};

/* ---------- The product rule on a term in x and y ---------- */

export interface ProductParams {
  k: number;
  m: number;
  n: number;
}

/** d/dx(k x^m y^n) = [the x part, the y part with its dy/dx]. */
function productParts({ k, m, n }: ProductParams): [string, string] {
  return [monoTex(k * m, m - 1, n), withDy(k * n, m, n - 1)];
}

/** c x^a y^b dy/dx, reading as plain dy/dx when the rest is 1. */
function withDy(c: number, a: number, b: number): string {
  if (a === 0 && b === 0) return c === 1 ? DYDX : c === -1 ? `-${DYDX}` : `${c}${DYDX}`;
  return `${monoTex(c, a, b)}${DYDX}`;
}

/**
 * A term mixing x and y, differentiated with the product rule, placed as two
 * tiles in either order.
 *
 * The bank holds the $\frac{dy}{dx}$ on the wrong half, the $\frac{dy}{dx}$
 * left off, and the two derivatives multiplied — the product rule forgotten.
 */
const implProductTiles: Generator<ProductParams> = {
  id: 'impl-product-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = { k: rng.int(1, difficulty >= 2 ? 9 : 5), m: rng.int(1, 3), n: rng.int(1, 3) };
      if (difficulty < 2 && params.m === 3 && params.n === 3) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { k, m, n } = params;
    const answer = productParts(params);
    return {
      kind: 'tiles',
      prompt: [
        prose('Differentiate with respect to $x$. Use the product rule, remembering that $y$ is a function of $x$.'),
        display(`\\frac{d}{dx}\\left(${monoTex(k, m, n)}\\right)`),
      ],
      template: '{0} + {1}',
      bank: tokenBank(answer, [`${answer[0]}${DYDX}`, monoTex(k * n, m, n - 1), withDy(k * m * n, m - 1, n - 1)]),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { k, m, n } = params;
    const [u, v] = productParts(params);
    return [
      { text: `Treat $${monoTex(k, m, n)}$ as $${monoTex(k, m, 0)}$ times $${monoTex(1, 0, n)}$.` },
      { text: `Differentiate the $x$ part, keeping the $y$ part.`, tex: u },
      { text: `Keep the $x$ part and differentiate the $y$ part, which brings a $${DYDX}$.`, tex: v },
      { text: 'Add them.', tex: `${u} + ${v}` },
    ];
  },
};

/* ---------- A term's derivative in numbers ---------- */

export interface TermTreeParams extends ProductParams {
  p: number;
  q: number;
  /** dy/dx at the point. */
  g: number;
}

/** [the x part, the y part, the y part times dy/dx, the total], at the point. */
export function termTreeValues({ k, m, n, p, q, g }: TermTreeParams): [number, number, number, number] {
  const u = m === 0 ? 0 : k * m * p ** (m - 1) * q ** n;
  const v = k * n * p ** m * q ** (n - 1);
  return [u, v, v * g, u + v * g];
}

/**
 * d/dx of a term at a point where x, y and dy/dx are known, in numbers.
 *
 * At difficulty 1 the term is a power of $y$ alone, so the tree is the chain
 * rule: differentiate as if $y$ were the variable, then times $\frac{dy}{dx}$.
 * At difficulty 2 it is a product, and the tree is the product rule's two
 * halves with only one of them multiplied.
 */
const implTermTree: Generator<TermTreeParams> = {
  id: 'impl-term-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const product = difficulty >= 2;
      const params: TermTreeParams = {
        k: rng.int(1, product ? 3 : 4),
        m: product ? rng.int(1, 2) : 0,
        n: product ? rng.int(1, 2) : rng.int(2, 4),
        p: rng.int(1, 3) * rng.sign(),
        q: rng.int(1, 3) * rng.sign(),
        g: rng.int(1, 4) * rng.sign(),
      };
      const values = termTreeValues(params);
      if (values.some((v) => Math.abs(v) > 120) || values[3] === 0) continue;
      if (product && values[0] === values[1]) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { k, m, n, p, q, g } = params;
    const [u, v, vg, total] = termTreeValues(params);
    const term = monoTex(k, m, n);
    if (m === 0) {
      return {
        kind: 'tree',
        prompt: [
          prose(
            `At a point on a curve, $y = ${q}$ and $${DYDX} = ${g}$. Find $\\frac{d}{dx}\\left(${term}\\right)$ there. The top box is the derivative of $${term}$ as if $y$ were the variable; the box below is that times $${DYDX}$.`,
          ),
        ],
        expression: `\\frac{d}{dx}\\left(${term}\\right) = ${withDy(k * n, 0, n - 1)}`,
        nodes: [
          { id: 'v', from: [] },
          { id: 'vg', from: ['v'] },
        ],
        bank: treeBank([v, vg], [k * q ** n, v + g, n * q ** (n - 1) * g, v * q]),
        answer: [`${v}`, `${vg}`],
      };
    }
    return {
      kind: 'tree',
      prompt: [
        prose(
          `At the point $${pair(p, q)}$ a curve has $${DYDX} = ${g}$. Find $\\frac{d}{dx}\\left(${term}\\right)$ there. The top row is the $x$ half and the $y$ half of the product rule, before any $${DYDX}$; then the $y$ half times $${DYDX}$; then the total.`,
        ),
      ],
      expression: `\\frac{d}{dx}\\left(${term}\\right)`,
      nodes: [
        { id: 'u', from: [] },
        { id: 'v', from: [] },
        { id: 'vg', from: ['v'] },
        { id: 'total', from: ['u', 'vg'] },
      ],
      bank: treeBank([u, v, vg, total], [u + v, u * g + v, u - vg, v - u]),
      answer: [u, v, vg, total].map(String),
    };
  },
  solution: (params) => {
    const { k, m, n, q, g } = params;
    const [u, v, vg, total] = termTreeValues(params);
    const [du, dv] = m === 0 ? ['', withDy(k * n, 0, n - 1)] : productParts(params);
    if (m === 0) {
      return [
        { text: 'Differentiate as if $y$ were the variable, then multiply by $\\frac{dy}{dx}$.', tex: dv },
        { text: `At $y = ${q}$ the first part is $${v}$.` },
        { tex: `${v} \\times ${bracketed(g)} = ${vg}` },
      ];
    }
    return [
      { text: 'The product rule gives two halves; only the $y$ half carries a $\\frac{dy}{dx}$.', tex: `${du} + ${dv}` },
      { text: `At the point, the $x$ half is $${u}$ and the $y$ half, before the $${DYDX}$, is $${v}$.` },
      { tex: `${u} + ${bracketed(v)} \\times ${bracketed(g)}` },
      { tex: `= ${u} ${signed(vg)} = ${total}` },
    ];
  },
};

/* ---------- The coefficient of dy/dx ---------- */

export interface CurveParams {
  curve: ImplicitCurve;
}

/**
 * Differentiate a whole equation and collect everything multiplying dy/dx.
 *
 * Asked before rearranging because it is the half of implicit differentiation
 * that goes wrong: a $y$ term's $\frac{dy}{dx}$ is easy to lose, and a product
 * term puts only one of its halves here. Typed, since any correct writing of
 * the coefficient is fine.
 */
const implCoefficient: Generator<CurveParams> = {
  id: 'impl-coefficient',
  sample: (rng, difficulty) => ({
    curve: sampleImplicit(rng, { shapes: difficulty >= 2 ? HARD_SHAPES : SEPARATE_SHAPES, size: difficulty >= 2 ? 4 : 5, span: 3 }),
  }),
  render: ({ curve }): Slide => ({
    kind: 'expression',
    prompt: [
      prose(
        `Differentiate every term with respect to $x$. Each term with a $y$ in it brings a $${DYDX}$. Collect those: what multiplies $${DYDX}$ altogether?`,
      ),
      ...equationBlocks(curve),
    ],
    lead: '\\text{coefficient} =',
    keypad: XY_KEYS,
    answer: xyAnswer(partialY(curve.terms)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ curve }) => [
    { text: 'Differentiate term by term. The terms without $y$ give no $\\frac{dy}{dx}$.' },
    ...differentiatedSteps(curve.terms),
    { text: 'Collect everything multiplying $\\frac{dy}{dx}$.', tex: xyTex(partialY(curve.terms)) },
  ],
};

/** Each term's derivative with its sign, as it would be written out: 2x + (y + x dy/dx) - 2y dy/dx. */
function termDerivativeTex(c: number, a: number, b: number): string {
  const xPart = a > 0 ? monoTex(c * a, a - 1, b) : '';
  const yPart = b > 0 ? withDy(c * b, a, b - 1) : '';
  if (xPart && yPart) return yPart.startsWith('-') ? `(${xPart} - ${yPart.slice(1)})` : `(${xPart} + ${yPart})`;
  return xPart || yPart || '0';
}

/** Each term's derivative with the sign that joins it to the line. */
function differentiatedPieces(terms: Term[]): string[] {
  return terms.map((t, i) => {
    const body = termDerivativeTex(i === 0 ? t.c : Math.abs(t.c), t.a, t.b);
    return i === 0 ? body : `${t.c < 0 ? '-' : '+'} ${body}`;
  });
}

/** The whole equation differentiated, term by term, as one line. */
function differentiatedTex(terms: Term[]): string {
  return `${differentiatedPieces(terms).join(' ')} = 0`;
}

/** The differentiated line as displays: one when it fits a phone, two when not. */
function differentiatedBlocks(terms: Term[]): Block[] {
  const whole = differentiatedTex(terms);
  if (visible(whole) <= 30 || terms.length < 3) return [display(whole)];
  const pieces = differentiatedPieces(terms);
  const cut = Math.ceil(pieces.length / 2);
  return [display(pieces.slice(0, cut).join(' ')), display(`${pieces.slice(cut).join(' ')} = 0`)];
}

/** Solution lines differentiating a curve's terms one per line, as the Show me panel is narrow. */
function differentiatedSteps(terms: Term[]): SolutionStep[] {
  return terms.map((t) => ({
    tex: `${monoTex(t.c, t.a, t.b)} \\to ${termDerivativeTex(t.c, t.a, t.b)}`,
  }));
}

/* ---------- dy/dx implicitly ---------- */

function sampleCurveOnly(rng: Rng, difficulty: number): CurveParams {
  return { curve: sampleImplicit(rng, optionsFor(difficulty)) };
}

/** [the right dy/dx, flipped, sign lost, and the product term's dy/dx dropped where there is one]. */
/** dy/dx doubled, or with one term of the top or the bottom lost: spare distractors. */
function droppedTerms(terms: Term[]): Omit<ChoiceOption, 'correct'>[] {
  const { top, bottom } = slopeParts(terms);
  const N = partialX(terms);
  const D = partialY(terms);
  const out: Omit<ChoiceOption, 'correct'>[] = [
    { tex: xyFracTex(top.map((t) => ({ ...t, c: 2 * t.c })), bottom), answer: `-2*(${xyAnswer(N)})/(${xyAnswer(D)})` },
  ];
  if (top.length > 1 && N.length > 1) {
    out.push({ tex: xyFracTex(top.slice(1), bottom), answer: `-(${xyAnswer(N)} - (${xyAnswer([N[0]])}))/(${xyAnswer(D)})` });
  }
  if (bottom.length > 1 && D.length > 1) {
    out.push({ tex: xyFracTex(top, bottom.slice(1)), answer: `-(${xyAnswer(N)})/(${xyAnswer(D)} - (${xyAnswer([D[0]])}))` });
  }
  return out;
}

function diffOptions(terms: Term[]): Omit<ChoiceOption, 'correct'>[] {
  const { top, bottom } = slopeParts(terms);
  const N = partialX(terms);
  const D = partialY(terms);
  const out: Omit<ChoiceOption, 'correct'>[] = [
    { tex: xyFracTex(top, bottom), answer: slopeAnswer(terms) },
    { tex: xyFracTex(bottom, top), answer: `-(${xyAnswer(D)})/(${xyAnswer(N)})` },
    { tex: xyFracTex(negate(top), bottom), answer: `(${xyAnswer(N)})/(${xyAnswer(D)})` },
  ];
  // The product rule's y half read without its dy/dx: it moves from the bottom to the top.
  const mixed = terms.filter((t) => t.a > 0 && t.b > 0);
  if (mixed.length > 0) {
    const moved = mixed.map((t) => ({ c: t.c * t.b, a: t.a, b: t.b - 1 }));
    const slipN = collect([...N, ...moved]);
    const slipD = collect([...D, ...negate(moved)]);
    if (slipD.length > 0 && slipN.length > 0) {
      let sTop = negate(slipN);
      let sBottom = slipD;
      if (sBottom[0].c < 0) {
        sTop = negate(sTop);
        sBottom = negate(sBottom);
      }
      out.push({ tex: xyFracTex(sTop, sBottom), answer: `-(${xyAnswer(slipN)})/(${xyAnswer(slipD)})` });
    }
  }
  return out;
}

/**
 * dy/dx for an implicit curve, typed in terms of x and y.
 *
 * Any correct writing passes. The options offer the division upside down, the
 * minus sign lost in moving the $x$ terms over, and — where a product term is
 * present — its $y$ half differentiated without its $\frac{dy}{dx}$.
 */
const implDiff: Generator<CurveParams> = {
  id: 'impl-diff',
  sample: sampleCurveOnly,
  choices: ({ curve }) => {
    const [right, ...wrong] = diffOptions(curve.terms);
    // Not the sign-lost distractor turned over: that is the answer again.
    const [swapped, , ...rest] = wrong;
    return steered(options(right, ...wrong), mix(curve.rhs, ...curve.terms.map((t) => t.c)), [
      ...[swapped, ...rest].map(negated),
      ...droppedTerms(curve.terms),
    ]);
  },
  render: ({ curve }): Slide => ({
    kind: 'expression',
    prompt: [prose('Find the gradient of this curve in terms of $x$ and $y$.'), ...equationBlocks(curve)],
    lead: `${DYDX} =`,
    keypad: XY_KEYS,
    answer: slopeAnswer(curve.terms),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ curve }) => implicitSolution(curve.terms),
};

/** The worked method for dy/dx, one short line each. */
function implicitSolution(terms: Term[]): SolutionStep[] {
  const N = partialX(terms);
  const D = partialY(terms);
  return [
    { text: 'Differentiate every term with respect to $x$; the constant goes to $0$.' },
    ...differentiatedSteps(terms),
    { text: `Collect the $${DYDX}$ terms on the left and factor it out.`, tex: `${DYDX}(${xyTex(D)})` },
    { text: 'Move the rest to the right, changing each sign.', tex: `= ${xyTex(negate(N))}` },
    { text: 'Divide.', tex: `${DYDX} = ${slopeTex(terms)}` },
  ];
}

/**
 * The same differentiation one term at a time on the line, then the
 * rearrangement in one step.
 *
 * Each term's bank holds its derivative with the $\frac{dy}{dx}$ missing or
 * misplaced; the last step's holds the rearrangement upside down and with its
 * sign lost.
 */
const implDeriveSteps: Generator<CurveParams> = {
  id: 'impl-derive-steps',
  sample: sampleCurveOnly,
  render: ({ curve }): Slide => {
    const { start, termAt, rhsAt, equalsAt } = equationTokens(curve);
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = curve.terms.map((t, i) => {
      const c = i === 0 ? t.c : Math.abs(t.c);
      const right = termDerivativeTex(c, t.a, t.b);
      const slips =
        t.a > 0 && t.b > 0
          ? [`(${monoTex(c * t.a, t.a - 1, t.b)} + ${monoTex(c * t.b, t.a, t.b - 1)})`, withDy(c * t.a * t.b, t.a - 1, t.b - 1)]
          : t.b > 0
            ? [monoTex(c * t.b, t.a, t.b - 1), withDy(c * t.b, t.a, t.b)]
            : [`${right}${DYDX}`, monoTex(c * t.a, t.a, t.b)];
      return { span: [termAt[i], termAt[i] + 1], value: right, bank: stepBank(right, ...slips) };
    });
    const [right, ...wrong] = diffOptions(curve.terms);
    reductions.push({ span: [rhsAt, rhsAt + 1], value: '0', bank: stepBank('0', `${curve.rhs}`, `${curve.rhs}${DYDX}`) });
    reductions.push({
      span: [0, start.length],
      operator: equalsAt,
      value: `${DYDX} = ${right.tex}`,
      bank: stepBank(`${DYDX} = ${right.tex}`, ...wrong.map((option) => `${DYDX} = ${option.tex}`)),
    });
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Differentiate each term with respect to $x$, then rearrange for $${DYDX}$. Tap the step to do next, then choose what it gives.`,
        ),
      ],
      start,
      reductions,
    };
  },
  solution: ({ curve }) => implicitSolution(curve.terms),
};

/** The equation as a line of tokens, one per term, with the signs between them. */
function equationTokens(curve: ImplicitCurve): { start: string[]; termAt: number[]; rhsAt: number; equalsAt: number } {
  const start: string[] = [];
  const termAt: number[] = [];
  curve.terms.forEach((t, i) => {
    if (i > 0) start.push(t.c < 0 ? '-' : '+');
    termAt.push(start.length);
    start.push(monoTex(i === 0 ? t.c : Math.abs(t.c), t.a, t.b));
  });
  const equalsAt = start.length;
  start.push('=');
  const rhsAt = start.length;
  start.push(`${curve.rhs}`);
  return { start, termAt, rhsAt, equalsAt };
}

/**
 * After differentiating, the dy/dx terms gathered: dy/dx(Q) = R, from tiles.
 *
 * The bank carries the two sides swapped and the sign of the moved terms
 * kept, the two slips of the gathering step.
 */
const implCollectTiles: Generator<CurveParams> = {
  id: 'impl-collect-tiles',
  sample: sampleCurveOnly,
  render: ({ curve }): Slide => {
    const N = partialX(curve.terms);
    const D = partialY(curve.terms);
    const answer = [xyTex(D), xyTex(negate(N))];
    return {
      kind: 'tiles',
      prompt: [
        prose('This curve'),
        ...equationBlocks(curve),
        prose('differentiates term by term to'),
        ...differentiatedBlocks(curve.terms),
        prose(`Gather the $${DYDX}$ terms on the left and everything else on the right.`),
      ],
      template: `${DYDX}({0}) = {1}`,
      bank: tokenBank(answer, [xyTex(N), xyTex(negate(D)), xyTex(collect([...D, ...N]))], 2),
      answer,
    };
  },
  solution: ({ curve }) => {
    const N = partialX(curve.terms);
    const D = partialY(curve.terms);
    return [
      { text: `Keep the $${DYDX}$ terms on the left and factor it out.`, tex: `${DYDX}(${xyTex(D)})` },
      { text: 'Move the rest to the right, changing each sign.', tex: `= ${xyTex(negate(N))}` },
      { text: 'Dividing would finish it.', tex: `${DYDX} = ${slopeTex(curve.terms)}` },
    ];
  },
};

/* ---------- The gradient at a point ---------- */

function sampleAtPoint(rng: Rng, difficulty: number, unit = true): CurveParams {
  return {
    curve: sampleImplicit(rng, optionsFor(difficulty), (curve) => {
      if (!wholeGradient(curve)) return false;
      if (unit) return true;
      const g = gradientAtPoint(curve);
      return g !== 0 && Math.abs(g) !== 1 && curve.q - g * curve.p !== 0 && Math.abs(curve.q - g * curve.p) <= 40;
    }),
  };
}

/**
 * The collected derivative, N + D dy/dx = 0, as two solution lines.
 *
 * On one line it runs past the edge of a phone for most curves, so the two
 * parts are shown one under the other.
 */
const collectedSteps = (terms: Term[]): SolutionStep[] => [
  { text: `Differentiate and collect. The part without $${DYDX}$ is`, tex: xyTex(partialX(terms)) },
  { text: `and the part multiplying $${DYDX}$ is`, tex: xyTex(partialY(terms)) },
];

/**
 * The gradient at a point as a tree: the two collected pieces there, then
 * their quotient with its sign.
 *
 * The bank carries the quotient with the sign lost and the pieces added.
 */
const implSlopeTree: Generator<CurveParams> = {
  id: 'impl-slope-tree',
  sample: (rng, difficulty) => sampleAtPoint(rng, difficulty),
  render: ({ curve }): Slide => {
    const [n, dd] = partsAtPoint(curve);
    const g = -n / dd;
    return {
      kind: 'tree',
      prompt: [
        prose(`The curve below passes through $${pair(curve.p, curve.q)}$.`),
        ...equationBlocks(curve),
        prose(
          `Differentiating and rearranging gives the gradient underneath. The top row is the top and the bottom of that fraction at the point; the box below is $${DYDX}$.`,
        ),
      ],
      expression: `${DYDX} = -\\frac{${xyTex(partialX(curve.terms))}}{${xyTex(partialY(curve.terms))}}`,
      nodes: [
        { id: 'n', from: [] },
        { id: 'd', from: [] },
        { id: 'g', from: ['n', 'd'] },
      ],
      bank: treeBank([n, dd, g], [-g, n % dd === 0 && dd % n === 0 ? -dd / n : n + dd, curve.p, curve.q, n - dd]),
      answer: [n, dd, g].map(String),
    };
  },
  solution: ({ curve }) => pointSolution(curve),
};

function pointSolution(curve: ImplicitCurve): SolutionStep[] {
  const [n, dd] = partsAtPoint(curve);
  return [
    ...collectedSteps(curve.terms),
    { text: `Put in $x = ${curve.p}$ and $y = ${curve.q}$.`, tex: `${n} + ${bracketed(dd)}${DYDX} = 0` },
    { text: 'Solve for the gradient.', tex: `${DYDX} = ${-n / dd}` },
  ];
}

/**
 * A term's derivative at the point, as a token: 6, 4 dy/dx, or (3 + 2 dy/dx).
 * With `bare`, the dy/dx is left off, which is the slip a bank offers.
 */
function termAtPointTex(c: number, a: number, b: number, x: number, y: number, bare = false): string {
  const xPart = a > 0 ? c * a * x ** (a - 1) * y ** b : undefined;
  const yPart = b > 0 ? c * b * x ** a * y ** (b - 1) : undefined;
  const dy = (v: number) => (bare ? `${v}` : v === 1 ? DYDX : v === -1 ? `-${DYDX}` : `${v}${DYDX}`);
  if (xPart !== undefined && yPart !== undefined) {
    return `(${xPart} ${yPart < 0 ? '-' : '+'} ${dy(Math.abs(yPart))})`;
  }
  if (xPart !== undefined) return bracketed(xPart);
  return yPart! < 0 ? `(${dy(yPart!)})` : dy(yPart!);
}

/**
 * The gradient at a point, differentiating and substituting in one pass: each
 * term becomes a number (and a multiple of dy/dx) straight away, and the last
 * step solves the line.
 *
 * Substituting before rearranging keeps every number whole. Each term's bank
 * carries the point's coordinates swapped, and the dy/dx left off.
 */
const implAtSteps: Generator<CurveParams> = {
  id: 'impl-at-steps',
  sample: (rng, difficulty) => sampleAtPoint(rng, difficulty),
  render: ({ curve }): Slide => {
    const { p, q } = curve;
    const { start, termAt, rhsAt, equalsAt } = equationTokens(curve);
    const g = gradientAtPoint(curve);
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = curve.terms.map((t, i) => {
      const c = i === 0 ? t.c : Math.abs(t.c);
      const right = termAtPointTex(c, t.a, t.b, p, q);
      const swapped = termAtPointTex(c, t.a, t.b, q, p);
      const bare = t.b > 0 ? termAtPointTex(c, t.a, t.b, p, q, true) : `${right}${DYDX}`;
      return { span: [termAt[i], termAt[i] + 1], value: right, bank: stepBank(right, swapped, bare, termAtPointTex(c + 1, t.a, t.b, p, q)) };
    });
    reductions.push({ span: [rhsAt, rhsAt + 1], value: '0', bank: stepBank('0', `${curve.rhs}`, `${curve.rhs}${DYDX}`) });
    const [n, dd] = partsAtPoint(curve);
    reductions.push({
      span: [0, start.length],
      operator: equalsAt,
      value: `${DYDX} = ${g}`,
      bank: stepBank(`${DYDX} = ${g}`, `${DYDX} = ${-g}`, `${DYDX} = ${n + dd}`, `${DYDX} = ${g + 1}`),
    });
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Find the gradient at $${pair(p, q)}$. Differentiate each term and put $x = ${p}$, $y = ${q}$ in straight away, then solve. Tap the step to do next, then choose what it gives.`,
        ),
      ],
      start,
      reductions,
    };
  },
  solution: ({ curve }) => pointSolution(curve),
};

/**
 * The gradient at a point, typed as a number. The options carry the sign
 * lost and the division upside down.
 */
const implGrad: Generator<CurveParams> = {
  id: 'impl-grad',
  sample: (rng, difficulty) => sampleAtPoint(rng, difficulty),
  choices: ({ curve }) => {
    const [n, dd] = partsAtPoint(curve);
    const g = -n / dd;
    return numberChoices(g, [-g, n !== 0 && dd % n === 0 ? -dd / n : n, dd], mix(curve.p, curve.q, curve.rhs));
  },
  render: ({ curve }): Slide => ({
    kind: 'expression',
    prompt: [prose(`Find the gradient of this curve at $${pair(curve.p, curve.q)}$.`), ...equationBlocks(curve)],
    lead: `${DYDX} =`,
    keypad: [],
    answer: `${gradientAtPoint(curve)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ curve }) => pointSolution(curve),
};

/** The tangent to an implicit curve at its point. */
const implTangentTiles: Generator<CurveParams> = {
  id: 'impl-tangent-tiles',
  sample: (rng, difficulty) => sampleAtPoint(rng, difficulty, false),
  render: ({ curve }): Slide => {
    const [n, dd] = partsAtPoint(curve);
    const g = -n / dd;
    return tangentTiles(
      [prose(`Find the tangent to this curve at $${pair(curve.p, curve.q)}$.`), ...equationBlocks(curve)],
      g,
      curve.p,
      curve.q,
      [n, dd],
    );
  },
  solution: ({ curve }) =>
    tangentSolution(gradientAtPoint(curve), curve.p, curve.q, [
      ...collectedSteps(curve.terms),
      { text: `At $${pair(curve.p, curve.q)}$ that gives the gradient.`, tex: `${DYDX} = ${gradientAtPoint(curve)}` },
    ]),
};

/* ---------- Horizontal tangents on an implicit curve ---------- */

export interface StationaryParams {
  /** A x^2 + B xy + C y^2 = S x0^2, whose horizontal tangents lie on y = kx. */
  A: number;
  B: number;
  C: number;
  k: number;
  x0: number;
}

export const stationaryTerms = ({ A, B, C }: StationaryParams): Term[] =>
  [
    { c: A, a: 2, b: 0 },
    { c: B, a: 1, b: 1 },
    { c: C, a: 0, b: 2 },
  ].filter((t) => t.c !== 0);

export const stationaryRhs = ({ A, B, C, k, x0 }: StationaryParams): number => (A + B * k + C * k * k) * x0 * x0;

const stationaryEquation = (params: StationaryParams): string =>
  `${xyTex(stationaryTerms(params))} = ${stationaryRhs(params)}`;

function sampleStationary(rng: Rng, difficulty: number): StationaryParams {
  for (;;) {
    const k = rng.int(1, difficulty >= 2 ? 3 : 2) * rng.sign();
    const B = rng.int(1, 4) * -Math.sign(k);
    if ((k * B) % 2 !== 0) continue;
    const A = (-k * B) / 2;
    const C = rng.int(1, difficulty >= 2 ? 4 : 3);
    const x0 = rng.int(1, 3);
    const params = { A, B, C, k, x0 };
    const S = A + B * k + C * k * k;
    if (A < 1 || A > 6 || S <= 0 || B + 2 * C * k === 0) continue;
    if (stationaryRhs(params) > 150) continue;
    return params;
  }
}

/** A line y = m x through the origin, m as a fraction top / bottom. */
function lineTex(top: number, bottom: number): string {
  const m = fracTex(top, bottom);
  return m === '1' ? 'y = x' : m === '-1' ? 'y = -x' : `y = ${m}x`;
}

/**
 * The line through the origin that every horizontal tangent of the curve
 * touches: the top of dy/dx set to zero.
 *
 * The bottom set to zero instead — the line of the vertical tangents — is a
 * distractor, with the sign lost and the ratio upside down.
 */
const implFlatLine: Generator<StationaryParams> = {
  id: 'impl-flat-line',
  sample: sampleStationary,
  choices: (params) => {
    const { A, B, C, k } = params;
    return steered(
      options(
        { tex: lineTex(k, 1), answer: `(${k})*x` },
        { tex: lineTex(-k, 1), answer: `(${-k})*x` },
        { tex: lineTex(-B, 2 * C), answer: `(${-B})/(${2 * C})*x` },
        { tex: lineTex(-B, 2 * A), answer: `(${-B})/(${2 * A})*x` },
      ),
      mix(A, B, C, k),
      [
        { tex: lineTex(B, 2 * C), answer: `(${B})/(${2 * C})*x` },
        { tex: lineTex(B, 2 * A), answer: `(${B})/(${2 * A})*x` },
        { tex: lineTex(2 * k, 1), answer: `(${2 * k})*x` },
      ],
    );
  },
  render: (params): Slide => {
    const terms = stationaryTerms(params);
    return {
      kind: 'expression',
      prompt: [
        prose('This curve'),
        display(stationaryEquation(params)),
        prose(`has gradient`),
        display(`${DYDX} = ${slopeTex(terms)}`),
        prose('Its horizontal tangents all touch it on one straight line through the origin. Which line?'),
      ],
      lead: 'y =',
      keypad: ALGEBRA_KEYS,
      answer: `(${params.k})*x`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const terms = stationaryTerms(params);
    const { top } = slopeParts(terms);
    return [
      { text: `A horizontal tangent has $${DYDX} = 0$, so the top of the fraction is zero.`, tex: `${xyTex(top)} = 0` },
      { tex: lineTex(params.k, 1) },
      { text: 'The bottom must not be zero there too, or the gradient is not defined at all.' },
    ];
  },
};

/** The points with horizontal tangents: (x0, k x0) and (-x0, -k x0). */
export const stationaryPoints = ({ k, x0 }: StationaryParams): [[number, number], [number, number]] => [
  [x0, k * x0],
  [-x0, -k * x0],
];

/**
 * The horizontal tangent on the right-hand side of the origin, placed as a
 * point. The bank carries the other point's coordinates and the square of x,
 * the square root forgotten.
 */
const implFlatPoint: Generator<StationaryParams> = {
  id: 'impl-flat-point',
  sample: sampleStationary,
  render: (params): Slide => {
    const terms = stationaryTerms(params);
    const { k, x0 } = params;
    return {
      kind: 'tiles',
      prompt: [
        prose('This curve'),
        display(stationaryEquation(params)),
        prose('has gradient'),
        display(`${DYDX} = ${slopeTex(terms)}`),
        prose('It has two horizontal tangents. Find where the one with $x > 0$ touches the curve.'),
      ],
      template: '({0}, {1})',
      bank: numberBank([x0, k * x0], [-k * x0, x0 * x0, k * x0 * x0, -x0]),
      answer: [`${x0}`, `${k * x0}`],
    };
  },
  solution: (params) => stationarySolution(params),
};

function stationarySolution(params: StationaryParams): SolutionStep[] {
  const { A, B, C, k, x0 } = params;
  const terms = stationaryTerms(params);
  const { top } = slopeParts(terms);
  const S = A + B * k + C * k * k;
  return [
    { text: 'Horizontal: the top of the gradient is zero.', tex: `${xyTex(top)} = 0` },
    { tex: lineTex(k, 1) },
    { text: `Put $${lineTex(k, 1)}$ into the curve's equation.`, tex: `${S}x^{2} = ${stationaryRhs(params)}` },
    { tex: `x = \\pm ${x0}` },
    { text: `So the points are $${pair(x0, k * x0)}$ and $${pair(-x0, -k * x0)}$.` },
  ];
}

/**
 * Finding the horizontal tangents of an implicit curve as three decisions:
 * which part of dy/dx is zero, the line that gives, and the points it meets
 * the curve at.
 */
const implStationaryFlow: Generator<StationaryParams> = {
  id: 'impl-stationary-flow',
  sample: sampleStationary,
  render: (params): Slide => {
    const { A, B, C, k, x0 } = params;
    const terms = stationaryTerms(params);
    const salt = mix(A, B, C, k, x0);
    const [[x1, y1], [x2, y2]] = stationaryPoints(params);
    const right = `$${pair(x1, y1)}$ and $${pair(x2, y2)}$`;
    const lineWrong = [lineTex(-k, 1), lineTex(-B, 2 * C), 'y = 0'].filter(
      (tex, i, all) => tex !== lineTex(k, 1) && all.indexOf(tex) === i,
    );
    const pointsWrong = [
      `$${pair(x1, -y1)}$ and $${pair(x2, -y2)}$`,
      x0 === 1 ? `$${pair(2, 2 * k)}$ and $${pair(-2, -2 * k)}$` : `$${pair(x0 * x0, k * x0 * x0)}$ and $${pair(-x0 * x0, -k * x0 * x0)}$`,
    ];
    return {
      kind: 'flow',
      prompt: [
        prose('Find where this curve has horizontal tangents.'),
        display(stationaryEquation(params)),
        display(`${DYDX} = ${slopeTex(terms)}`),
      ],
      subject: `${DYDX} = 0`,
      steps: [
        {
          id: 'where',
          ask: 'Where is the tangent horizontal?',
          branches: turned(
            [
              { label: 'Where the top of the fraction is zero', to: 'line' },
              { label: 'Where the bottom of the fraction is zero', outcome: 'Then the gradient is undefined there: those tangents are vertical.' },
              { label: 'Where $x = 0$', outcome: 'Then you find where the curve crosses the $y$-axis.' },
            ],
            salt % 3,
          ),
        },
        {
          id: 'line',
          ask: 'Setting it to zero gives which line?',
          branches: turned(
            [
              { label: `$${lineTex(k, 1)}$`, to: 'points' },
              ...lineWrong.map((tex) => ({ label: `$${tex}$`, outcome: `Then the tangents would sit on $${tex}$.` })),
            ],
            (salt >>> 3) % (lineWrong.length + 1),
          ),
        },
        {
          id: 'points',
          ask: `Put $${lineTex(k, 1)}$ into the curve's equation. Where are the tangents?`,
          branches: turned(
            [
              { label: right, outcome: `The horizontal tangents touch at ${right}.` },
              ...pointsWrong.map((label) => ({ label, outcome: `Then the tangents would touch at ${label}.` })),
            ],
            (salt >>> 6) % 3,
          ),
        },
      ],
      answer: ['Where the top of the fraction is zero', `$${lineTex(k, 1)}$`, right],
    };
  },
  solution: (params) => stationarySolution(params),
};

/* ---------- Horizontal, vertical or neither, on an implicit curve ---------- */

export interface ImplicitKindParams {
  curve: ImplicitCurve;
}

/**
 * Horizontal, vertical or neither, at a point on a conic.
 *
 * The linear terms are solved for so that the point sits exactly where the
 * top or the bottom of dy/dx vanishes, and both are always present, so the
 * shape of the equation gives nothing away.
 */
const implTangentKind: Generator<ImplicitKindParams> = {
  id: 'impl-tangent-kind',
  sample: (rng, difficulty) => {
    for (;;) {
      const kind = rng.pick(['horizontal', 'vertical', 'neither'] as const);
      const p = rng.int(1, difficulty >= 2 ? 3 : 2) * rng.sign();
      const q = rng.int(1, difficulty >= 2 ? 3 : 2) * rng.sign();
      const A = rng.int(1, 3);
      const B = rng.int(-2, 2);
      const C = rng.int(1, 3);
      let D = rng.int(1, 5) * rng.sign();
      let E = rng.int(1, 5) * rng.sign();
      if (kind === 'horizontal') D = -(2 * A * p + B * q);
      if (kind === 'vertical') E = -(B * p + 2 * C * q);
      if (D === 0 || E === 0) continue;
      const terms = [
        { c: A, a: 2, b: 0 },
        { c: B, a: 1, b: 1 },
        { c: C, a: 0, b: 2 },
        { c: D, a: 1, b: 0 },
        { c: E, a: 0, b: 1 },
      ].filter((t) => t.c !== 0);
      const curve = { terms, rhs: xyAt(terms, p, q), p, q };
      const [n, dd] = partsAtPoint(curve);
      if (kind === 'horizontal' && dd === 0) continue;
      if (kind === 'vertical' && n === 0) continue;
      if (kind === 'neither' && (n === 0 || dd === 0)) continue;
      if (Math.abs(curve.rhs) > 99) continue;
      return { curve };
    }
  },
  render: ({ curve }): Slide => {
    const [n, dd] = partsAtPoint(curve);
    return {
      kind: 'choice',
      prompt: [
        prose(`The point $${pair(curve.p, curve.q)}$ lies on this curve. Is the tangent there horizontal, vertical, or neither?`),
        ...equationBlocks(curve),
      ],
      options: [
        { id: 'horizontal', label: 'Horizontal' },
        { id: 'vertical', label: 'Vertical' },
        { id: 'neither', label: 'Neither' },
      ],
      correctId: n === 0 ? 'horizontal' : dd === 0 ? 'vertical' : 'neither',
    };
  },
  solution: ({ curve }) => {
    const [n, dd] = partsAtPoint(curve);
    return [
      ...collectedSteps(curve.terms),
      { text: `At $${pair(curve.p, curve.q)}$ the part without $${DYDX}$ is $${n}$ and the part multiplying it is $${dd}$.` },
      {
        text:
          n === 0
            ? `So $${DYDX} = 0$: the tangent is horizontal.`
            : dd === 0
              ? `So $${DYDX}$ would need dividing by zero: the tangent is vertical.`
              : `So $${DYDX} = ${fracTex(-n, dd)}$: neither.`,
      },
    ];
  },
};

/* ---------- Registration ---------- */

/** By name, for `parametricImplicit.test.ts`. */
export const piGenerators = {
  paramPoint,
  paramFindT,
  paramOnCurve,
  paramAxisTree,
  paramEliminate,
  paramEliminateFlow,
  paramCircleTiles,
  paramEllipseTiles,
  paramGradient,
  paramRatioTiles,
  paramGradientTrig,
  paramSlopeTree,
  paramTangent,
  paramTrigSlope,
  paramTangentKind,
  paramFlatT,
  paramFlatSlider,
  paramFlatFlow,
  implChainTerm,
  implProductTiles,
  implTermTree,
  implCoefficient,
  implDiff,
  implDeriveSteps,
  implCollectTiles,
  implSlopeTree,
  implAtSteps,
  implGrad,
  implTangentTiles,
  implFlatLine,
  implFlatPoint,
  implStationaryFlow,
  implTangentKind,
};

export const parametricGenerators = Object.values(piGenerators) as Generator<never>[];
