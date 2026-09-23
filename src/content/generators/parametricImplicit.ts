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
const spaced = (letter: string): KeypadKey => ({ insert: ` ${letter}`, label: letter, tex: true });

/** ALGEBRA_KEYS without its bare `x`, for keypads that bring their own variables. */
const OPERATOR_KEYS: KeypadKey[] = ALGEBRA_KEYS.filter((key) => key.insert !== 'x');

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
function mix(...values: number[]): number {
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
function turned<T>(items: T[], turn: number): T[] {
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
function steered(opts: ChoiceOption[], salt: number, spare: Omit<ChoiceOption, 'correct'>[] = []): ChoiceOption[] {
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
function numberChoices(correct: number, wrong: number[], salt: number): ChoiceOption[] {
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
function numberBank(answer: number[], distractors: number[], spare = 3): string[] {
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
function tokenBank(answer: string[], extras: string[], spare = 3): string[] {
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
function treeBank(answer: number[], distractors: number[]): string[] {
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
function stepBank(value: string, ...candidates: string[]): string[] {
  const bank = [value];
  for (const candidate of candidates) {
    if (!bank.includes(candidate)) bank.push(candidate);
  }
  return bank.sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** A fraction as the learner reads it, lowest terms, sign out front. */
function fracTex(top: number, bottom: number): string {
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

function gcd(a: number, b: number): number {
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

/* ---------- Second derivatives: shared helpers ---------- */

const D2YDX2 = '\\frac{d^2y}{dx^2}';
const D2YDT2 = '\\frac{d^2y}{dt^2}';
const D2XDT2 = '\\frac{d^2x}{dt^2}';
const DDT_DYDX = '\\frac{d}{dt}\\left(\\frac{dy}{dx}\\right)';

/** A fraction as [top, bottom]. */
type Frac = [number, number];

/**
 * A polynomial in u = t - k, highest power first, expanded into powers of t.
 *
 * Building a curve around t = k this way puts every rate at k in plain
 * sight: the coefficient of u is the first derivative there and twice the
 * coefficient of u^2 the second, so a point can be made flat, bending or
 * neither on purpose rather than by rejection.
 */
export function shifted(u: readonly number[], k: number): number[] {
  let out: number[] = [];
  for (const c of u) {
    const next = [...out, 0];
    for (let i = 1; i < next.length; i += 1) next[i] -= k * out[i - 1];
    next[next.length - 1] += c;
    out = next;
  }
  while (out.length > 1 && out[0] === 0) out.shift();
  return out.map((v) => v + 0);
}

/**
 * A polynomial in t over `den` times t to a power, in lowest terms: the sign
 * of the bottom moved to the top, and an all-negative top pulled out front.
 */
function ratTex(top: readonly number[], den: number, power = 0): string {
  const g = [...top, den].reduce((acc, v) => gcd(acc, v), 0);
  let p = top.map((v) => v / g);
  let q = den / g;
  if (q < 0) {
    p = p.map((v) => -v);
    q = -q;
  }
  const bottom = `${q === 1 && power > 0 ? '' : q}${power === 0 ? '' : power === 1 ? 't' : `t^{${power}}`}`;
  if (bottom === '1') return polyTex(p);
  const negative = p.every((v) => v <= 0);
  const shown = negative ? p.map((v) => -v + 0) : p;
  return `${negative ? '-' : ''}\\frac{${polyTex(shown)}}{${bottom}}`;
}

/** The same for mathjs. */
function ratAnswer(top: readonly number[], den: number, power = 0): string {
  return `(${polyAnswer(top)})/((${den})*t^(${power}))`;
}

/** n/d times a body: -\frac{3}{4}\sin t. */
function timesTex(n: number, dd: number, body: string): string {
  const c = fracTex(n, dd);
  return c === '1' ? body : c === '-1' ? `-${body}` : `${c}${body}`;
}

/** n over d times a body: -\frac{3}{4\sin^{3} t}. */
function overBodyTex(n: number, dd: number, body: string): string {
  const g = gcd(n, dd);
  let p = n / g;
  let q = dd / g;
  if (q < 0) {
    p = -p;
    q = -q;
  }
  return `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q === 1 ? '' : q}${body}}`;
}

const fracValue = ([n, dd]: Frac): number => n / dd;

/**
 * Options for a fractional answer: the slips given, then near misses, each
 * a different *value* from the answer and from each other, since the grader
 * compares values and two ways of writing one number would both be right.
 */
function fracChoices(right: Frac, wrong: Frac[], salt: number, spare: Frac[] = []): ChoiceOption[] {
  const seen = new Set([fracValue(right)]);
  const keep = (list: Frac[]): Frac[] =>
    list.filter((f) => {
      if (f[1] === 0) return false;
      const v = fracValue(f);
      if (!Number.isFinite(v) || seen.has(v)) return false;
      seen.add(v);
      return true;
    });
  const picked = keep(wrong).slice(0, 3);
  for (let step = 1; picked.length < 3; step += 1) {
    picked.push(...keep([[right[0] + step * right[1], right[1]], [right[0] - step * right[1], right[1]]]).slice(0, 3 - picked.length));
  }
  const spares = keep([...spare, [-2 * right[0], right[1]], [right[0], 2 * right[1]]]);
  const as = ([n, dd]: Frac) => ({ tex: fracTex(n, dd), answer: fracAnswer(n, dd) });
  return steered(options(as(right), ...picked.map(as)), salt, spares.map(as));
}

/**
 * A tree bank of fractions: every answer (as a multiset), then distinct
 * distractors, ordered by value so the bank reads like a number line.
 */
function fracTreeBank(answer: Frac[], distractors: Frac[]): string[] {
  const texts = answer.map(([n, dd]) => fracTex(n, dd));
  const value = new Map<string, number>(answer.map((f, i) => [texts[i], fracValue(f)]));
  const extras: string[] = [];
  const add = (f: Frac) => {
    if (f[1] === 0 || extras.length >= 4) return;
    const tex = fracTex(f[0], f[1]);
    if (texts.includes(tex) || extras.includes(tex)) return;
    extras.push(tex);
    value.set(tex, fracValue(f));
  };
  distractors.forEach(add);
  const last = answer[answer.length - 1];
  for (let step = 1; extras.length < 3; step += 1) {
    add([last[0] + step * last[1], last[1]]);
    add([last[0] - step * last[1], last[1]]);
  }
  return [...texts, ...extras].sort((a, b) => value.get(a)! - value.get(b)! || a.localeCompare(b));
}

/** Whole-number step choices: the value, then the slips, topped up to three. */
function numberStepBank(value: number, ...slips: number[]): string[] {
  const candidates = [...slips];
  for (let step = 1; new Set([value, ...candidates]).size < 3; step += 1) candidates.push(value + step, value - step);
  return stepBank(bracketed(value), ...candidates.map(bracketed));
}

/** The four rates at t = k, and the top of d²y/dx² = (y''x' - y'x'')/x'^3. */
export function secondAt(curve: ParamCurve, k: number) {
  const X1 = valueAt(derived(curve.x), k);
  const Y1 = valueAt(derived(curve.y), k);
  const X2 = valueAt(derived(derived(curve.x)), k);
  const Y2 = valueAt(derived(derived(curve.y)), k);
  return { X1, Y1, X2, Y2, N: Y2 * X1 - Y1 * X2 };
}

/** The quotient-rule working at t = k, one short line each. */
function quotientSolution(curve: ParamCurve, k: number): SolutionStep[] {
  const { X1, Y1, X2, Y2, N } = secondAt(curve, k);
  return [
    { text: `At $t = ${k}$ the four rates are`, tex: `${DXDT} = ${X1}, \\quad ${DYDT} = ${Y1}` },
    { tex: `${D2XDT2} = ${X2}, \\quad ${D2YDT2} = ${Y2}` },
    {
      text: `The quotient rule on $${DYDX} = ${DYDT} \\div ${DXDT}$. Its top is`,
      tex: `${Y2} \\times ${bracketed(X1)} - ${bracketed(Y1)} \\times ${bracketed(X2)} = ${N}`,
    },
    { text: 'and its bottom is', tex: `${bracketed(X1)}^{2} = ${X1 * X1}` },
    { tex: `${DDT_DYDX} = ${fracTex(N, X1 * X1)}` },
    { text: `Then divide by $${DXDT} = ${X1}$.`, tex: `${D2YDX2} = ${fracTex(N, X1 ** 3)}` },
  ];
}

/* ---------- d²y/dx² with x linear in t ---------- */

export interface LinearD2Params {
  /** x = a t + b. */
  a: number;
  b: number;
  y: number[];
}

export const linearD2Curve = ({ a, b, y }: LinearD2Params): ParamCurve => ({ x: [a, b], y });

/**
 * x linear with a multiplier of 2 or more, so dividing by dx/dt once and
 * dividing by it twice give different answers, and a cubic or quartic y, so
 * something is left after differentiating twice.
 */
function sampleLinearD2(rng: Rng, difficulty: number): LinearD2Params {
  const hard = difficulty >= 2;
  for (;;) {
    const a = hard ? rng.int(2, 3) * rng.sign() : rng.int(2, 3);
    const y = randomPoly(rng, hard ? rng.pick([3, 4]) : 3, 3);
    if (y.length === 5 && Math.abs(y[0]) > 2) continue;
    return { a, b: rng.int(-5, 5), y };
  }
}

function linearD2Solution({ a, y }: LinearD2Params): SolutionStep[] {
  const dy = derived(y);
  const ddy = derived(dy);
  return [
    { text: `$${DXDT} = ${a}$, so the gradient is $${DYDT}$ divided by $${a}$.`, tex: `${DYDX} = ${ratTex(dy, a)}` },
    { text: 'Differentiate the gradient with respect to $t$.', tex: `${DDT_DYDX} = ${ratTex(ddy, a)}` },
    { text: `Divide by $${DXDT} = ${a}$ once more, so the $dt$ cancels against a $dx$.`, tex: `${D2YDX2} = ${ratTex(ddy, a * a)}` },
  ];
}

/**
 * d²y/dx² in terms of t, with x linear so the gradient is a polynomial.
 *
 * The options are the last division by $\frac{dx}{dt}$ lost, $\frac{d^2y}{dt^2}$
 * offered as if it were the answer, and the gradient divided by
 * $\frac{dx}{dt}$ without being differentiated first.
 */
const paramD2: Generator<LinearD2Params> = {
  id: 'param-d2',
  sample: sampleLinearD2,
  choices: (params) => {
    const { a, y } = params;
    const dy = derived(y);
    const ddy = derived(dy);
    return steered(
      options(
        { tex: ratTex(ddy, a * a), answer: ratAnswer(ddy, a * a) },
        { tex: ratTex(ddy, a), answer: ratAnswer(ddy, a) },
        { tex: polyTex(ddy), answer: polyAnswer(ddy) },
        { tex: ratTex(dy, a * a), answer: ratAnswer(dy, a * a) },
      ),
      mix(a, params.b, ...y),
      [
        { tex: ratTex(ddy.map((c) => -c), a * a), answer: ratAnswer(ddy.map((c) => -c), a * a) },
        { tex: ratTex(ddy, 2 * a * a), answer: ratAnswer(ddy, 2 * a * a) },
      ],
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [prose('A curve is traced by'), ...curveBlocks(linearD2Curve(params)), prose(`Find $${D2YDX2}$ in terms of $t$.`)],
    lead: `${D2YDX2} =`,
    keypad: T_KEYS,
    answer: ratAnswer(derived(derived(params.y)), params.a * params.a),
    domain: 'real',
    mode: 'exact',
  }),
  solution: linearD2Solution,
};

/**
 * d²y/dx² built from tiles: what is differentiated, then what it is divided by.
 *
 * The bank holds $\frac{d^2y}{dt^2}$, the gradient undifferentiated, and
 * $\frac{d^2x}{dt^2} = 0$ as a divisor, the three halves of the slip of
 * treating the second derivative as a ratio of second derivatives.
 */
const paramD2Tiles: Generator<LinearD2Params> = {
  id: 'param-d2-tiles',
  sample: sampleLinearD2,
  render: (params): Slide => {
    const { a, y } = params;
    const dy = derived(y);
    const ddy = derived(dy);
    const answer = [ratTex(ddy, a), `${a}`];
    return {
      kind: 'tiles',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(linearD2Curve(params)),
        prose(`Its gradient is $${DYDX} = ${ratTex(dy, a)}$. Build $${D2YDX2}$.`),
      ],
      template: `${D2YDX2} = ({0}) \\div ({1})`,
      bank: tokenBank(answer, [polyTex(ddy), ratTex(dy, a), '0', `${a * a}`, `${-a}`], 3),
      answer,
    };
  },
  solution: ({ a, y }) => {
    const ddy = derived(derived(y));
    return [
      { text: 'Differentiate the gradient with respect to $t$.', tex: `${DDT_DYDX} = ${ratTex(ddy, a)}` },
      {
        text: `That is still a rate per unit of $t$. Dividing by $${DXDT} = ${a}$ turns it into one per unit of $x$.`,
        tex: `${D2YDX2} = ${ratTex(ddy, a * a)}`,
      },
    ];
  },
};

/**
 * The route to d²y/dx² as three decisions: what to differentiate, what to do
 * with it, and which expression that gives.
 *
 * With $x$ linear, $\frac{d^2x}{dt^2}$ is zero, so the ratio-of-second-
 * derivatives slip does not merely give a wrong answer; it gives no answer.
 */
const paramD2Flow: Generator<LinearD2Params> = {
  id: 'param-d2-flow',
  sample: sampleLinearD2,
  render: (params): Slide => {
    const { a, y } = params;
    const dy = derived(y);
    const ddy = derived(dy);
    const salt = mix(a, params.b, ...y);
    const results = [ratTex(ddy, a * a), ratTex(ddy, a), polyTex(ddy), ratTex(dy, a * a)];
    const first = `The gradient, $${DYDX}$`;
    const divide = `Divide by $${DXDT}$`;
    return {
      kind: 'flow',
      prompt: [prose('A curve is traced by'), ...curveBlocks(linearD2Curve(params)), prose(`Find $${D2YDX2}$. Its gradient is`)],
      subject: `${DYDX} = ${ratTex(dy, a)}`,
      steps: [
        {
          id: 'what',
          ask: 'What do you differentiate with respect to $t$?',
          branches: turned(
            [
              { label: first, to: 'next' },
              {
                label: '$y$, a second time',
                outcome: `Then you have $${D2YDT2} = ${polyTex(ddy)}$: how $y$'s rate changes with $t$, not how the gradient changes with $x$.`,
              },
              {
                label: '$x$ and $y$ a second time, then divide',
                outcome: `Then $${D2XDT2} = 0$ is underneath, and there is nothing to divide by.`,
              },
            ],
            salt % 3,
          ),
        },
        {
          id: 'next',
          ask: `That gives $${DDT_DYDX} = ${ratTex(ddy, a)}$. What next?`,
          branches: turned(
            [
              { label: divide, to: 'result' },
              { label: 'Stop: that is the answer', outcome: 'Then the answer is a rate per unit of $t$, not per unit of $x$.' },
              { label: `Multiply by $${DXDT}$`, outcome: `Then you are back at $${polyTex(ddy)}$, which is $${D2YDT2}$.` },
            ],
            (salt >>> 3) % 3,
          ),
        },
        {
          id: 'result',
          ask: `Which is $${D2YDX2}$?`,
          branches: turned(
            results.map((tex, i) =>
              i === 0
                ? { label: `$${tex}$`, outcome: `That is $${D2YDX2}$.` }
                : { label: `$${tex}$`, outcome: `Then $${D2YDX2}$ would be $${tex}$.` },
            ),
            (salt >>> 6) % 4,
          ),
        },
      ],
      answer: [first, divide, `$${results[0]}$`],
    };
  },
  solution: linearD2Solution,
};

/* ---------- d²y/dx² for a trigonometric curve ---------- */

export interface TrigD2Params {
  /** 'cs': x = a cos t, y = b sin t. 'sc': x = a sin t, y = b cos t. 'ls': x = a t, y = b sin t. */
  form: 'cs' | 'sc' | 'ls';
  a: number;
  b: number;
}

export const trigD2Sources = ({ form, a, b }: TrigD2Params): { x: string; y: string } =>
  trigSlopeSources({ form, a, b, angle: 0 });

/** [TeX, mathjs] for the right answer, the division lost, the sign lost, the second-derivative ratio; then spares. */
function trigD2Options({ form, a, b }: TrigD2Params): Omit<ChoiceOption, 'correct'>[] {
  const aa = a * a;
  if (form === 'cs') {
    return [
      { tex: overBodyTex(-b, aa, '\\sin^{3} t'), answer: `(${-b})/((${aa})*sin(t)^3)` },
      { tex: overBodyTex(b, a, '\\sin^{2} t'), answer: `(${b})/((${a})*sin(t)^2)` },
      { tex: overBodyTex(b, aa, '\\sin^{3} t'), answer: `(${b})/((${aa})*sin(t)^3)` },
      { tex: timesTex(b, a, '\\tan t'), answer: `(${b})/(${a})*tan(t)` },
      { tex: overBodyTex(-b, a, '\\sin^{3} t'), answer: `(${-b})/((${a})*sin(t)^3)` },
      { tex: overBodyTex(-b, aa, '\\sin^{2} t'), answer: `(${-b})/((${aa})*sin(t)^2)` },
    ];
  }
  if (form === 'sc') {
    return [
      { tex: overBodyTex(-b, aa, '\\cos^{3} t'), answer: `(${-b})/((${aa})*cos(t)^3)` },
      { tex: overBodyTex(-b, a, '\\cos^{2} t'), answer: `(${-b})/((${a})*cos(t)^2)` },
      { tex: overBodyTex(b, aa, '\\cos^{3} t'), answer: `(${b})/((${aa})*cos(t)^3)` },
      { tex: timesTex(b, a, '\\cot t'), answer: `(${b})/(${a})*cot(t)` },
      { tex: overBodyTex(-b, a, '\\cos^{3} t'), answer: `(${-b})/((${a})*cos(t)^3)` },
      { tex: overBodyTex(-b, aa, '\\cos^{2} t'), answer: `(${-b})/((${aa})*cos(t)^2)` },
    ];
  }
  return [
    { tex: timesTex(-b, aa, '\\sin t'), answer: `(${-b})/(${aa})*sin(t)` },
    { tex: timesTex(-b, a, '\\sin t'), answer: `(${-b})/(${a})*sin(t)` },
    { tex: timesTex(b, aa, '\\sin t'), answer: `(${b})/(${aa})*sin(t)` },
    { tex: timesTex(-b, 1, '\\sin t'), answer: `(${-b})*sin(t)` },
    { tex: timesTex(-b, aa, '\\cos t'), answer: `(${-b})/(${aa})*cos(t)` },
    { tex: timesTex(-b, a, '\\cos t'), answer: `(${-b})/(${a})*cos(t)` },
  ];
}

/**
 * d²y/dx² for a curve traced by sines and cosines: on the ellipse
 * $x = a\cos t$, $y = b\sin t$ it is $-\frac{b}{a^2\sin^3 t}$.
 *
 * The derivatives of $\tan t$ and $\cot t$ are Differentiation's. The options
 * are the division lost, the sign lost, and $\frac{d^2y}{dt^2}$ over
 * $\frac{d^2x}{dt^2}$, which for an ellipse is a tangent rather than anything
 * like the answer.
 */
const paramD2Trig: Generator<TrigD2Params> = {
  id: 'param-d2-trig',
  sample: (rng, difficulty) => ({
    form: difficulty >= 2 ? rng.pick(['cs', 'sc', 'ls'] as const) : rng.pick(['cs', 'sc'] as const),
    a: rng.int(2, difficulty >= 2 ? 5 : 4),
    b: rng.int(1, 9),
  }),
  choices: (params) => {
    const [right, ...wrong] = trigD2Options(params);
    return steered(options(right, ...wrong.slice(0, 3)), mix(params.a, params.b, params.form.charCodeAt(0)), wrong.slice(3));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [prose('A curve is traced by'), trigBlock(params), prose(`Find $${D2YDX2}$ in terms of $t$.`)],
    lead: `${D2YDX2} =`,
    keypad: T_TRIG_KEYS,
    answer: trigD2Options(params)[0].answer!,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { form, a, b } = params;
    const [right, lost] = trigD2Options(params);
    if (form === 'ls') {
      return [
        { text: `$${DXDT} = ${a}$, so`, tex: `${DYDX} = ${timesTex(b, a, '\\cos t')}` },
        { text: 'Differentiate that with respect to $t$.', tex: `${DDT_DYDX} = ${lost.tex}` },
        { text: `Divide by $${DXDT} = ${a}$ again.`, tex: `${D2YDX2} = ${right.tex}` },
      ];
    }
    const cs = form === 'cs';
    return [
      {
        text: 'Differentiate both with respect to $t$ and divide.',
        tex: `${DYDX} = ${cs ? timesTex(-b, a, '\\cot t') : timesTex(-b, a, '\\tan t')}`,
      },
      {
        text: cs
          ? 'Differentiate again: the derivative of $\\cot t$ is $-\\operatorname{cosec}^{2} t$.'
          : 'Differentiate again: the derivative of $\\tan t$ is $\\sec^{2} t$.',
        tex: `${DDT_DYDX} = ${lost.tex}`,
      },
      {
        text: `Divide by $${DXDT} = ${cs ? `-${coef(a)}\\sin t` : `${coef(a)}\\cos t`}$.`,
        tex: `${D2YDX2} = ${right.tex}`,
      },
    ];
  },
};

/* ---------- d²y/dx² at a value of t ---------- */

export interface GeneralD2Params {
  curve: ParamCurve;
  k: number;
}

/**
 * A quadratic x, so the quotient rule has both of its halves, and a t where
 * dx/dt is at least 2 in size, so the last division changes the number.
 */
function sampleGeneralD2(rng: Rng, difficulty: number): GeneralD2Params {
  const hard = difficulty >= 2;
  for (;;) {
    const x = hard ? [rng.int(1, 2) * rng.sign(), rng.int(-3, 3), rng.int(-4, 4)] : [1, 0, rng.int(-4, 4)];
    const y = randomPoly(rng, rng.pick([2, 3]), 3);
    const k = hard ? rng.int(-3, 3) : rng.pick([-2, -1, 1, 2]);
    const curve = { x, y };
    const { X1, N } = secondAt(curve, k);
    if (Math.abs(X1) < 2 || N === 0) continue;
    const g = gcd(N, X1 ** 3);
    if (Math.abs(X1 ** 3 / g) > 32 || Math.abs(N / g) > 60) continue;
    const [x0, y0] = pointAt(curve, k);
    if (Math.abs(x0) > 30 || Math.abs(y0) > 40) continue;
    return { curve, k };
  }
}

/**
 * d²y/dx² at a value of t as a tree: the rate of the gradient and dx/dt at
 * that moment, then their quotient.
 *
 * The bank holds $\frac{d^2y}{dt^2} \div \frac{d^2x}{dt^2}$ there, the
 * gradient itself, and the quotient multiplied instead of divided.
 */
const paramD2RatesTree: Generator<GeneralD2Params> = {
  id: 'param-d2-rates-tree',
  sample: sampleGeneralD2,
  render: ({ curve, k }): Slide => {
    const { X1, Y1, X2, Y2, N } = secondAt(curve, k);
    const answer: Frac[] = [[N, X1 * X1], [X1, 1], [N, X1 ** 3]];
    return {
      kind: 'tree',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(curve),
        prose(
          `Its gradient is $${DYDX} = ${gradientTex(curve)}$. Find $${D2YDX2}$ where $t = ${k}$. The top row is $${DDT_DYDX}$ and $${DXDT}$ there; the box below is $${D2YDX2}$.`,
        ),
      ],
      expression: `${D2YDX2} = ${DDT_DYDX} \\div ${DXDT}`,
      nodes: [
        { id: 'g', from: [] },
        { id: 'dx', from: [] },
        { id: 'v', from: ['g', 'dx'] },
      ],
      bank: fracTreeBank(answer, [[Y2, X2], [Y1, X1], [N * X1, X1 * X1], [-N, X1 ** 3], [Y2, 1]]),
      answer: answer.map(([n, dd]) => fracTex(n, dd)),
    };
  },
  solution: ({ curve, k }) => quotientSolution(curve, k),
};

/**
 * The same value worked through the whole formula, one rate at a time:
 * $\frac{d^2y}{dx^2} = \left(\frac{d^2y}{dt^2}\frac{dx}{dt} -
 * \frac{dy}{dt}\frac{d^2x}{dt^2}\right) \div \left(\frac{dx}{dt}\right)^3$.
 *
 * Each rate's bank carries its neighbours in the formula, the cube's the
 * square, and the last step's the division by the square alone, which is the
 * step most often lost.
 */
const paramD2QuotientSteps: Generator<GeneralD2Params> = {
  id: 'param-d2-quotient-steps',
  sample: sampleGeneralD2,
  render: ({ curve, k }): Slide => {
    const { X1, Y1, X2, Y2, N } = secondAt(curve, k);
    const [x0, y0] = pointAt(curve, k);
    const start = ['(', D2YDT2, '\\cdot', DXDT, '-', DYDT, '\\cdot', D2XDT2, ')', '\\div', `\\left(${DXDT}\\right)^{3}`];
    const cube = X1 ** 3;
    const final = fracTex(N, cube);
    return {
      kind: 'steps',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(curve),
        prose(
          `Find $${D2YDX2}$ where $t = ${k}$, putting the rates there into the formula below. Tap the step to do next, then choose what it gives.`,
        ),
      ],
      start,
      reductions: [
        { span: [1, 2], value: bracketed(Y2), bank: numberStepBank(Y2, Y1, X2, y0) },
        { span: [3, 4], value: bracketed(X1), bank: numberStepBank(X1, X2, x0, -X1) },
        { span: [5, 6], value: bracketed(Y1), bank: numberStepBank(Y1, Y2, y0, -Y1) },
        { span: [7, 8], value: bracketed(X2), bank: numberStepBank(X2, X1, 0, -X2) },
        { span: [0, 9], operator: 4, value: `${N}`, bank: stepBank(`${N}`, `${Y2 * X1 + Y1 * X2}`, `${-N}`, `${N + 2}`) },
        { span: [2, 3], value: `${cube}`, bank: stepBank(`${cube}`, `${X1 * X1}`, `${3 * X1}`, `${-cube}`) },
        {
          span: [0, 3],
          operator: 1,
          value: final,
          bank: stepBank(final, fracTex(N, X1 * X1), fracTex(-N, cube), fracTex(cube, N)),
        },
      ],
    };
  },
  solution: ({ curve, k }) => quotientSolution(curve, k),
};

/**
 * The value of d²y/dx² at a value of t, typed as a number.
 *
 * The options carry the last division lost, $\frac{d^2y}{dt^2}$ over
 * $\frac{d^2x}{dt^2}$, and the sign of the quotient rule turned over.
 */
const paramD2At: Generator<GeneralD2Params> = {
  id: 'param-d2-at',
  sample: sampleGeneralD2,
  choices: ({ curve, k }) => {
    const { X1, Y1, X2, Y2, N } = secondAt(curve, k);
    return fracChoices(
      [N, X1 ** 3],
      [[N, X1 * X1], [Y2, X2], [-N, X1 ** 3]],
      mix(k, ...curve.x, ...curve.y),
      [[Y2, X1 * X1], [Y2 * X1 + Y1 * X2, X1 ** 3]],
    );
  },
  render: ({ curve, k }): Slide => {
    const { X1, N } = secondAt(curve, k);
    return {
      kind: 'expression',
      prompt: [prose('A curve is traced by'), ...curveBlocks(curve), prose(`Find the value of $${D2YDX2}$ where $t = ${k}$.`)],
      lead: `${D2YDX2} =`,
      keypad: FRACTION_KEYS,
      answer: fracAnswer(N, X1 ** 3),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ curve, k }) => quotientSolution(curve, k),
};

/* ---------- d²y/dx² in t with x quadratic ---------- */

export interface QuadraticXParams {
  /** x = c t^2 + b. */
  c: number;
  b: number;
  /** y = p t^3 + q t^2 + r t + s. */
  p: number;
  q: number;
  r: number;
  s: number;
}

export const quadraticXCurve = ({ c, b, p, q, r, s }: QuadraticXParams): ParamCurve => ({
  x: [c, 0, b],
  y: [p, q, r, s],
});

/**
 * [the answer, the last division lost, d²y/dt² over d²x/dt², the sign lost; then spares].
 *
 * With $x = ct^2 + b$ the quotient rule collapses: the $q$ terms cancel, and
 * $\frac{d^2y}{dx^2} = \frac{3pt^2 - r}{4c^2t^3}$.
 */
function quadraticXOptions({ c, p, q, r }: QuadraticXParams): Omit<ChoiceOption, 'correct'>[] {
  const top = [3 * p, 0, -r];
  const cc = 4 * c * c;
  return [
    { tex: ratTex(top, cc, 3), answer: ratAnswer(top, cc, 3) },
    { tex: ratTex(top, 2 * c, 2), answer: ratAnswer(top, 2 * c, 2) },
    { tex: ratTex([6 * p, 2 * q], 2 * c), answer: ratAnswer([6 * p, 2 * q], 2 * c) },
    { tex: ratTex(top.map((v) => -v), cc, 3), answer: ratAnswer(top.map((v) => -v), cc, 3) },
    { tex: ratTex([3 * p, 0, r], cc, 3), answer: ratAnswer([3 * p, 0, r], cc, 3) },
    { tex: ratTex(top, cc, 2), answer: ratAnswer(top, cc, 2) },
  ];
}

/**
 * d²y/dx² in terms of t when x is not linear, so the quotient rule does real
 * work: the gradient is $\frac{dy/dt}{2ct}$ and its derivative has two halves.
 */
const paramD2General: Generator<QuadraticXParams> = {
  id: 'param-d2-general',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    return {
      c: hard ? rng.int(1, 2) * rng.sign() : 1,
      b: rng.int(-4, 4),
      p: rng.int(1, hard ? 4 : 3) * rng.sign(),
      q: rng.int(-4, 4),
      r: rng.int(1, hard ? 9 : 6) * rng.sign(),
      s: rng.int(-5, 5),
    };
  },
  choices: (params) => {
    const [right, ...wrong] = quadraticXOptions(params);
    return steered(options(right, ...wrong.slice(0, 3)), mix(params.c, params.p, params.q, params.r, params.s), wrong.slice(3));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [prose('A curve is traced by'), ...curveBlocks(quadraticXCurve(params)), prose(`Find $${D2YDX2}$ in terms of $t$.`)],
    lead: `${D2YDX2} =`,
    keypad: T_KEYS,
    answer: quadraticXOptions(params)[0].answer!,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const curve = quadraticXCurve(params);
    const [right, lost] = quadraticXOptions(params);
    return [
      { text: 'Differentiate both with respect to $t$.', tex: `${DXDT} = ${polyTex(derived(curve.x))}` },
      { tex: `${DYDT} = ${polyTex(derived(curve.y))}` },
      { text: 'So the gradient is', tex: `${DYDX} = ${gradientTex(curve)}` },
      { text: 'The quotient rule, then tidy: the $t$ terms on top cancel.', tex: `${DDT_DYDX} = ${lost.tex}` },
      { text: `Divide by $${DXDT} = ${polyTex(derived(curve.x))}$.`, tex: `${D2YDX2} = ${right.tex}` },
    ];
  },
};

/* ---------- Concavity along a parametric curve ---------- */

export interface TaylorParams {
  k: number;
  /** x and y as polynomials in u = t - k, highest power first. */
  xu: number[];
  yu: number[];
}

export const taylorCurve = ({ k, xu, yu }: TaylorParams): ParamCurve => ({ x: shifted(xu, k), y: shifted(yu, k) });

/** Small enough to read: every expanded coefficient 30 or under. */
const readable = (curve: ParamCurve): boolean => [...curve.x, ...curve.y].every((c) => Math.abs(c) <= 30);

export type Bend = 'up' | 'down' | 'neither';

export interface ConcaveParams extends TaylorParams {
  bend: Bend;
}

/** Which way d²y/dx² says the curve bends at t = k. */
export function bendAt(curve: ParamCurve, k: number): Bend {
  const { X1, N } = secondAt(curve, k);
  const sign = Math.sign(N) * Math.sign(X1);
  return sign > 0 ? 'up' : sign < 0 ? 'down' : 'neither';
}

/**
 * Concave up, concave down, or neither, at a value of t.
 *
 * At difficulty 1 x is linear and the answer is the sign of
 * $\frac{d^2y}{dt^2}$; at difficulty 2 x is quadratic and the whole quotient
 * decides. Native choice in a fixed order: which is right changes, the
 * three words do not.
 */
const paramConcaveChoice: Generator<ConcaveParams> = {
  id: 'param-concave-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const bend = rng.pick(['up', 'down', 'neither'] as const);
    for (;;) {
      const k = rng.int(hard ? -3 : -2, hard ? 3 : 2);
      const a1 = rng.int(1, 3) * rng.sign();
      const a2 = hard ? rng.int(1, 2) * rng.sign() : 0;
      const xu = hard ? [a2, a1, rng.int(-4, 4)] : [a1, rng.int(-4, 4)];
      const m = rng.int(1, 2) * rng.sign();
      let c1 = rng.int(-3, 3);
      let c2 = rng.int(1, 3) * rng.sign();
      if (bend === 'neither') {
        c1 = hard ? a1 * m : c1;
        c2 = hard ? a2 * m : 0;
      }
      const params: ConcaveParams = { k, xu, yu: [rng.int(1, 2) * rng.sign(), c2, c1, rng.int(-4, 4)], bend };
      const curve = taylorCurve(params);
      if (!readable(curve) || bendAt(curve, k) !== bend) continue;
      return params;
    }
  },
  render: (params): Slide => ({
    kind: 'choice',
    prompt: [
      prose('A curve is traced by'),
      ...curveBlocks(taylorCurve(params)),
      prose(`At the point where $t = ${params.k}$, is the curve concave up, concave down, or neither?`),
    ],
    options: [
      { id: 'up', label: 'Concave up' },
      { id: 'down', label: 'Concave down' },
      { id: 'neither', label: 'Neither' },
    ],
    correctId: bendAt(taylorCurve(params), params.k),
  }),
  solution: (params) => {
    const curve = taylorCurve(params);
    const { X1, N } = secondAt(curve, params.k);
    const bend = bendAt(curve, params.k);
    return [
      ...quotientSolution(curve, params.k),
      {
        text:
          bend === 'neither'
            ? `It is zero, so the curve is neither concave up nor concave down there.`
            : `That is ${fracValue([N, X1 ** 3]) > 0 ? 'positive' : 'negative'}, so the curve is concave ${bend} there.`,
      },
    ];
  },
};

/** A horizontal tangent at t = k: dy/dt is zero there and d²y/dt² is not. */
function sampleFlatTaylor(rng: Rng, difficulty: number): TaylorParams {
  const hard = difficulty >= 2;
  for (;;) {
    const k = rng.int(hard ? -3 : -2, hard ? 3 : 2);
    const a1 = rng.int(2, 3) * rng.sign();
    const xu = hard ? [rng.int(1, 2) * rng.sign(), a1, rng.int(-4, 4)] : [a1, rng.int(-4, 4)];
    const c3 = hard ? rng.int(1, 2) * rng.sign() : rng.int(-1, 1);
    const params: TaylorParams = { k, xu, yu: [c3, rng.int(1, hard ? 4 : 3) * rng.sign(), 0, rng.int(-5, 5)] };
    const curve = taylorCurve(params);
    const [x0, y0] = pointAt(curve, k);
    if (!readable(curve) || Math.abs(x0) > 30 || Math.abs(y0) > 30) continue;
    return params;
  }
}

/**
 * d²y/dx² at a horizontal tangent as a tree. There dy/dt is zero, so the
 * quotient rule loses its second half and what is left is
 * $\frac{d^2y}{dt^2} \div \left(\frac{dx}{dt}\right)^2$: the square is
 * positive, and the sign is $\frac{d^2y}{dt^2}$'s.
 *
 * The bank carries the division by $\frac{dx}{dt}$ unsquared and
 * $\frac{d^2x}{dt^2}$ in its place.
 */
const paramTurningTree: Generator<TaylorParams> = {
  id: 'param-turning-tree',
  sample: sampleFlatTaylor,
  render: (params): Slide => {
    const curve = taylorCurve(params);
    const { X1, X2, Y2 } = secondAt(curve, params.k);
    const answer: Frac[] = [[Y2, 1], [X1, 1], [X1 * X1, 1], [Y2, X1 * X1]];
    return {
      kind: 'tree',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(curve),
        prose(
          `Its tangent is horizontal where $t = ${params.k}$. Find $${D2YDX2}$ there. The top row is $${D2YDT2}$ and $${DXDT}$ at that moment; then $\\left(${DXDT}\\right)^{2}$; then $${D2YDX2}$.`,
        ),
      ],
      expression: `${D2YDX2} = ${D2YDT2} \\div \\left(${DXDT}\\right)^{2}`,
      nodes: [
        { id: 'ddy', from: [] },
        { id: 'dx', from: [] },
        { id: 'sq', from: ['dx'] },
        { id: 'v', from: ['ddy', 'sq'] },
      ],
      bank: fracTreeBank(answer, [[Y2, X1], [-Y2, X1 * X1], [X2, 1], [Y2, X2], [2 * X1, 1]]),
      answer: answer.map(([n, dd]) => fracTex(n, dd)),
    };
  },
  solution: (params) => turningSolution(params),
};

function turningSolution(params: TaylorParams): SolutionStep[] {
  const curve = taylorCurve(params);
  const { k } = params;
  const { X1, Y2 } = secondAt(curve, k);
  return [
    {
      text: `At $t = ${k}$, $${DYDT} = 0$, so the quotient rule's second half vanishes.`,
      tex: `${D2YDX2} = ${D2YDT2} \\div \\left(${DXDT}\\right)^{2}`,
    },
    { text: `There $${D2YDT2} = ${Y2}$ and $${DXDT} = ${X1}$.`, tex: `${D2YDX2} = ${Y2} \\div ${X1 * X1} = ${fracTex(Y2, X1 * X1)}` },
    { text: Y2 > 0 ? 'Positive: concave up, so a minimum.' : 'Negative: concave down, so a maximum.' },
  ];
}

/**
 * Maximum or minimum at a horizontal tangent, as three decisions: what
 * decides it, its value there, and the verdict.
 */
const paramNatureFlow: Generator<TaylorParams> = {
  id: 'param-nature-flow',
  sample: sampleFlatTaylor,
  render: (params): Slide => {
    const curve = taylorCurve(params);
    const { k } = params;
    const { X1, Y2 } = secondAt(curve, k);
    const salt = mix(k, ...params.xu, ...params.yu);
    const decide = `The sign of $${D2YDX2}$`;
    const right: Frac = [Y2, X1 * X1];
    const seen = new Set([fracValue(right)]);
    const wrong = ([[Y2, X1], [-Y2, X1 * X1], [Y2, 1], [2 * Y2, X1 * X1]] as Frac[]).filter((f) => {
      const v = fracValue(f);
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    }).slice(0, 2);
    const value = `$${D2YDX2} = ${fracTex(...right)}$`;
    const verdict = Y2 > 0 ? 'A minimum' : 'A maximum';
    return {
      kind: 'flow',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(curve),
        prose(`Its tangent is horizontal where $t = ${k}$. Is that point a maximum or a minimum?`),
      ],
      subject: `t = ${k}`,
      steps: [
        {
          id: 'decide',
          ask: 'What decides it?',
          branches: turned(
            [
              { label: decide, to: 'value' },
              { label: `The sign of $${D2XDT2}$`, outcome: 'Then you learn how $x$ is speeding up, not how the curve bends.' },
              { label: `The sign of $${DYDX}$`, outcome: 'Then you read $0$: the tangent is horizontal, which is where you started.' },
            ],
            salt % 3,
          ),
        },
        {
          id: 'value',
          ask: `What is $${D2YDX2}$ at $t = ${k}$?`,
          branches: turned(
            [
              { label: value, to: 'verdict' },
              ...wrong.map((f) => ({
                label: `$${D2YDX2} = ${fracTex(...f)}$`,
                outcome: `Then the test would run on $${fracTex(...f)}$.`,
              })),
            ],
            (salt >>> 3) % (wrong.length + 1),
          ),
        },
        {
          id: 'verdict',
          ask: 'So the point is',
          branches: [
            { label: 'A maximum', outcome: 'Then the curve bends down there, like the top of a hill.' },
            { label: 'A minimum', outcome: 'Then the curve bends up there, like the bottom of a valley.' },
          ],
        },
      ],
      answer: [decide, value, verdict],
    };
  },
  solution: (params) => turningSolution(params),
};

export interface LowestParams {
  /** x = a t + b. */
  a: number;
  b: number;
  /** y = c((t - m)^3 - 3(t - m)) + e, flat at t = m - 1 and t = m + 1. */
  c: number;
  m: number;
  e: number;
  /** Asking for the maximum rather than the minimum. */
  max: boolean;
}

export const lowestCurve = ({ a, b, c, m, e }: LowestParams): ParamCurve => ({ x: [a, b], y: shifted([c, 0, -3 * c, e], m) });

/** [t, height] of the asked-for turning point. */
export function lowestPoint({ c, m, e, max }: LowestParams): [number, number] {
  // d²y/dt² = 6c(t - m): at t = m + 1 it has c's sign, at m - 1 the other.
  const upAtRight = c > 0;
  const t = max === upAtRight ? m - 1 : m + 1;
  return [t, max ? e + 2 * Math.abs(c) : e - 2 * Math.abs(c)];
}

/**
 * The height of a curve's minimum (or maximum), slid to on the picture.
 *
 * Both turning values of t are given, so the work is deciding which is
 * which from the sign of the second derivative and finding its height.
 */
const paramLowestSlider: Generator<LowestParams> = {
  id: 'param-lowest-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const params: LowestParams = {
        a: rng.int(1, 2) * (hard ? rng.sign() : 1),
        b: rng.int(-4, 4),
        c: rng.int(1, 2) * rng.sign(),
        m: rng.int(-3, 3),
        e: rng.int(-5, 5),
        max: hard && rng.chance(0.5),
      };
      const { a, b, c, m, e } = params;
      const heights = [e - 2 * Math.abs(c), e + 2 * Math.abs(c)];
      const xs = [a * (m - 1) + b, a * (m + 1) + b];
      if (heights.some((h) => Math.abs(h) > 7) || xs.some((x) => Math.abs(x) > 7)) continue;
      // An untouched slider rests at 0, the middle of its track.
      if (lowestPoint(params)[1] === 0) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const curve = lowestCurve(params);
    const { m, max } = params;
    const span = 8;
    return {
      kind: 'slider',
      prompt: [
        prose('A curve is traced by'),
        ...curveBlocks(curve),
        prose(
          `Its tangent is horizontal at $t = ${m - 1}$ and at $t = ${m + 1}$. Slide the line to the height of the ${max ? 'maximum' : 'minimum'} point.`,
        ),
      ],
      min: -span,
      max: span,
      step: 1,
      answer: lowestPoint(params)[1],
      readout: 'y = {v}',
      figure: {
        svg: paramSvg((t) => pointAt(curve, t), { span, tMin: m - 4, tMax: m + 4, label: 'The curve traced as t runs' }),
        xMin: -span,
        xMax: span,
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const curve = lowestCurve(params);
    const { a, m, max } = params;
    const [t, h] = lowestPoint(params);
    const ddy = derived(derived(curve.y));
    const other = t === m - 1 ? m + 1 : m - 1;
    return [
      {
        text: `$${DXDT} = ${a}$, so $${D2YDX2} = ${D2YDT2} \\div ${a * a}$ where the tangent is flat: it has the sign of $${D2YDT2}$.`,
        tex: `${D2YDT2} = ${polyTex(ddy)}`,
      },
      {
        text: `At $t = ${t}$ that is $${valueAt(ddy, t)}$, ${max ? 'negative: the maximum' : 'positive: the minimum'}. At $t = ${other}$ it is $${valueAt(ddy, other)}$.`,
      },
      { text: `Put $t = ${t}$ into the $y$ equation for the height.`, tex: `y = ${h}` },
    ];
  },
};

/* ---------- The second derivative of an implicit curve ---------- */

export interface ConicParams {
  /** A x^2 + B y^2 = A p^2 + B q^2, through the whole point (p, q). */
  A: number;
  B: number;
  p: number;
  q: number;
}

export const conicTerms = ({ A, B }: ConicParams): Term[] => [
  { c: A, a: 2, b: 0 },
  { c: B, a: 0, b: 2 },
];

export const conicRhs = ({ A, B, p, q }: ConicParams): number => A * p * p + B * q * q;

const conicEquation = (params: ConicParams): string => `${xyTex(conicTerms(params))} = ${conicRhs(params)}`;

/**
 * A circle or ellipse at difficulty 1, a hyperbola among them at difficulty 2,
 * always through a whole point off both axes, filtered by `accept`.
 */
function sampleConic(rng: Rng, difficulty: number, accept: (params: ConicParams) => boolean = () => true): ConicParams {
  const hard = difficulty >= 2;
  for (;;) {
    const circle = !hard && rng.chance(0.4);
    const A = circle ? 1 : rng.int(1, hard ? 5 : 4);
    const B = circle ? 1 : rng.int(1, hard ? 5 : 4) * (hard && rng.chance(0.4) ? -1 : 1);
    const params = { A, B, p: rng.int(1, 3) * rng.sign(), q: rng.int(1, 3) * rng.sign() };
    const rhs = conicRhs(params);
    if (rhs <= 0 || rhs > 99 || !accept(params)) continue;
    return params;
  }
}

/** -A/B, the number in front of x/y in the gradient. */
const conicK = ({ A, B }: ConicParams): string => fracTex(-A, B);

/** d²y/dx² in terms of y: -AC / (B^2 y^3). */
const conicSecondTex = ({ A, B, ...rest }: ConicParams): string => overBodyTex(-A * conicRhs({ A, B, ...rest }), B * B, 'y^{3}');

/**
 * The gradient, differentiated again, from tiles: the number in front, then
 * the quotient rule on $\frac{x}{y}$.
 *
 * The bank holds the number upside down and with its sign lost, and the
 * quotient rule's top written the wrong way round or with the wrong sign.
 */
const implD2Tiles: Generator<ConicParams> = {
  id: 'impl-d2-tiles',
  sample: (rng, difficulty) => sampleConic(rng, difficulty),
  render: (params): Slide => {
    const { A, B } = params;
    const quotient = `y - x${DYDX}`;
    const answer = [conicK(params), quotient];
    return {
      kind: 'tiles',
      prompt: [
        prose('This curve'),
        display(conicEquation(params)),
        prose(
          `has gradient $${DYDX} = ${slopeTex(conicTerms(params))}$. Differentiate that again with respect to $x$: keep the number in front of $\\frac{x}{y}$, and use the quotient rule on $\\frac{x}{y}$.`,
        ),
      ],
      template: `${D2YDX2} = {0} \\times ({1}) \\div y^2`,
      bank: tokenBank(
        answer,
        [fracTex(A, B), fracTex(-B, A), `x - y${DYDX}`, `x${DYDX} - y`, `y + x${DYDX}`],
        4,
      ),
      answer,
    };
  },
  solution: (params) => [
    { text: 'Write the gradient as a number times $\\frac{x}{y}$.', tex: `${DYDX} = ${conicK(params)} \\times \\frac{x}{y}` },
    {
      text: `The quotient rule on $\\frac{x}{y}$: the top differentiates to $1$, the bottom to $${DYDX}$.`,
      tex: `\\frac{d}{dx}\\left(\\frac{x}{y}\\right) = \\frac{y - x${DYDX}}{y^{2}}`,
    },
    { tex: `${D2YDX2} = ${conicK(params)} \\times \\frac{y - x${DYDX}}{y^{2}}` },
  ],
};

/** A over B in lowest terms with the sign kept on B: [A', B', C', g]. */
function reducedConic(params: ConicParams): [number, number, number] {
  const g = gcd(params.A, params.B);
  return [params.A / g, params.B / g, conicRhs(params) / g];
}

/** A fraction of two x-y polynomials, with the bottom's sign moved to the top. */
function xyOver(top: Term[], bottom: Term[]): string {
  const flip = bottom[0].c < 0;
  const t = flip ? negate(top) : top;
  const b = flip ? negate(bottom) : bottom;
  return `\\frac{${xyTex(t)}}{${xyTex(b)}}`;
}

/** y + (A/B) x^2 / y, as the learner reads it inside the quotient-rule top. */
function substitutedTop(A: number, B: number, power: number): string {
  const n = Math.abs(A);
  const d = Math.abs(B);
  const inner = `\\frac{${n === 1 ? '' : n}x${power === 1 ? '' : `^{${power}}`}}{${d === 1 ? '' : d}y}`;
  return `\\frac{y ${A * B > 0 ? '+' : '-'} ${inner}}{y^{2}}`;
}

/**
 * The implicit second derivative simplified one move at a time: the gradient
 * put back in, the fraction cleared, the curve's own equation used, and the
 * number in front multiplied through.
 *
 * On a circle it ends at $-\frac{r^2}{y^3}$. Each bank carries the sign of the
 * substituted gradient kept, the bottom not multiplied, the square rather
 * than the cube, and the number in front unsquared.
 */
const implD2SubSteps: Generator<ConicParams> = {
  id: 'impl-d2-sub-steps',
  sample: (rng, difficulty) => sampleConic(rng, difficulty),
  render: (params): Slide => {
    const [A, B, C] = reducedConic(params);
    const k = conicK(params);
    const substituted = substitutedTop(A, B, 2);
    const cleared = xyOver(
      [
        { c: B, a: 0, b: 2 },
        { c: A, a: 2, b: 0 },
      ],
      [{ c: B, a: 0, b: 3 }],
    );
    const used = overBodyTex(C, B, 'y^{3}');
    const final = overBodyTex(-A * C, B * B, 'y^{3}');
    return {
      kind: 'steps',
      prompt: [
        prose('This curve'),
        display(conicEquation(params)),
        prose(
          `has gradient $${DYDX} = ${slopeTex(conicTerms(params))}$, and differentiating again gives the line below. Put the gradient in, clear the fraction, use the curve's equation, then multiply. Tap the step to do next, then choose what it gives.`,
        ),
      ],
      start: [k, '\\times', `\\frac{y - x${DYDX}}{y^{2}}`],
      reductions: [
        {
          span: [2, 3],
          value: substituted,
          bank: stepBank(substituted, substitutedTop(-A, B, 2), substitutedTop(A, B, 1), substitutedTop(B, A, 2)),
        },
        {
          span: [2, 3],
          value: cleared,
          bank: stepBank(
            cleared,
            xyOver(
              [
                { c: B, a: 0, b: 2 },
                { c: A, a: 2, b: 0 },
              ],
              [{ c: B, a: 0, b: 2 }],
            ),
            xyOver(
              [
                { c: B, a: 0, b: 2 },
                { c: -A, a: 2, b: 0 },
              ],
              [{ c: B, a: 0, b: 3 }],
            ),
            xyOver(
              [
                { c: 1, a: 0, b: 2 },
                { c: A, a: 2, b: 0 },
              ],
              [{ c: B, a: 0, b: 3 }],
            ),
          ),
        },
        {
          span: [2, 3],
          value: used,
          bank: stepBank(used, overBodyTex(C, B, 'y^{2}'), overBodyTex(-C, B, 'y^{3}'), overBodyTex(C + 1, B, 'y^{3}')),
        },
        {
          span: [0, 3],
          operator: 1,
          value: final,
          bank: stepBank(final, overBodyTex(A * C, B * B, 'y^{3}'), overBodyTex(-A * C, B, 'y^{3}'), overBodyTex(-A * C, B * B, 'y^{2}')),
        },
      ],
    };
  },
  solution: (params) => {
    const [A, B, C] = reducedConic(params);
    return [
      { text: `Put $${DYDX} = ${slopeTex(conicTerms(params))}$ into the top.`, tex: substitutedTop(A, B, 2) },
      {
        text: `Multiply the top and the bottom by $${monoTex(B, 0, 1)}$.`,
        tex: xyOver(
          [
            { c: B, a: 0, b: 2 },
            { c: A, a: 2, b: 0 },
          ],
          [{ c: B, a: 0, b: 3 }],
        ),
      },
      { text: `The top is the curve's left-hand side${params.A === A ? '' : ` divided by $${params.A / A}$`}, so it is $${C}$.`, tex: overBodyTex(C, B, 'y^{3}') },
      { text: `Multiply by $${conicK(params)}$.`, tex: `${D2YDX2} = ${conicSecondTex(params)}` },
    ];
  },
};

/**
 * The value of an implicit second derivative at a point, typed as a number.
 *
 * The options carry the sign lost, $y^2$ in place of $y^3$, and the number in
 * front left unsquared.
 */
const implD2At: Generator<ConicParams> = {
  id: 'impl-d2-at',
  sample: (rng, difficulty) => sampleConic(rng, difficulty),
  choices: (params) => {
    const { A, B, p, q } = params;
    const C = conicRhs(params);
    return fracChoices(
      [-A * C, B * B * q ** 3],
      [[A * C, B * B * q ** 3], [-A * C, B * B * q * q], [-A * C, B * q ** 3]],
      mix(A, B, p, q),
      [[-C, q ** 3], [-A * p, B * q]],
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [prose(`Find the value of $${D2YDX2}$ at $${pair(params.p, params.q)}$ on this curve.`), display(conicEquation(params))],
    lead: `${D2YDX2} =`,
    keypad: FRACTION_KEYS,
    answer: fracAnswer(-params.A * conicRhs(params), params.B * params.B * params.q ** 3),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { A, B, q } = params;
    const C = conicRhs(params);
    return [
      { text: 'The gradient is', tex: `${DYDX} = ${slopeTex(conicTerms(params))}` },
      {
        text: "Differentiate again, put the gradient back in, and use the curve's equation:",
        tex: `${D2YDX2} = ${conicSecondTex(params)}`,
      },
      { text: `At $y = ${q}$:`, tex: `${D2YDX2} = ${fracTex(-A * C, B * B * q ** 3)}` },
    ];
  },
};

/**
 * The value at a point as a tree, through the unsimplified derivative: the
 * gradient there, then $y - x\frac{dy}{dx}$, then the number in front times
 * that over $y^2$.
 *
 * The point is chosen so the gradient is whole. The bank carries the gradient
 * with its sign lost and the quotient rule's top with the wrong sign.
 */
const implD2PointTree: Generator<ConicParams> = {
  id: 'impl-d2-point-tree',
  sample: (rng, difficulty) =>
    sampleConic(rng, difficulty, ({ A, B, p, q }) => {
      if ((A * p) % (B * q) !== 0) return false;
      const g = -(A * p) / (B * q);
      const top = q - p * g;
      const v: Frac = [-A * top, B * q * q];
      return Math.abs(g) <= 12 && Math.abs(top) <= 40 && top !== 0 && Math.abs(v[1] / gcd(...v)) <= 16;
    }),
  render: (params): Slide => {
    const { A, B, p, q } = params;
    const g = -(A * p) / (B * q) + 0;
    const top = q - p * g;
    const answer: Frac[] = [[g, 1], [top, 1], [-A * top, B * q * q]];
    return {
      kind: 'tree',
      prompt: [
        prose(`The point $${pair(p, q)}$ lies on this curve, which has gradient $${DYDX} = ${slopeTex(conicTerms(params))}$.`),
        display(conicEquation(params)),
        prose(`Find $${D2YDX2}$ there. The top box is $${DYDX}$ at the point; then $y - x${DYDX}$; then $${D2YDX2}$.`),
      ],
      expression: `${D2YDX2} = ${conicK(params)} \\times \\frac{y - x\\tfrac{dy}{dx}}{y^{2}}`,
      nodes: [
        { id: 'g', from: [] },
        { id: 'top', from: ['g'] },
        { id: 'v', from: ['top'] },
      ],
      bank: fracTreeBank(answer, [[-g, 1], [q + p * g, 1], [A * top, B * q * q], [top, q * q], [-A * top, B * q]]),
      answer: answer.map(([n, dd]) => fracTex(n, dd)),
    };
  },
  solution: (params) => {
    const { A, B, p, q } = params;
    const g = -(A * p) / (B * q) + 0;
    const top = q - p * g;
    return [
      { text: `At $${pair(p, q)}$ the gradient is`, tex: `${DYDX} = ${g}` },
      { text: 'The top of the quotient rule there:', tex: `${q} - ${bracketed(p)} \\times ${bracketed(g)} = ${top}` },
      {
        text: `Times $${conicK(params)}$, over $y^{2} = ${q * q}$.`,
        tex: `${D2YDX2} = ${fracTex(-A * top, B * q * q)}`,
      },
    ];
  },
};

/* ---------- Turning points on an implicit curve ---------- */

export interface TurningParams {
  curve: ImplicitCurve;
}

/**
 * A conic (with an x^3 term at difficulty 2) whose tangent is horizontal at a
 * whole point: the x term's coefficient is solved for so that the part
 * without dy/dx vanishes there.
 */
function sampleTurning(rng: Rng, difficulty: number): TurningParams {
  const hard = difficulty >= 2;
  for (;;) {
    const p = rng.int(1, hard ? 3 : 2) * rng.sign();
    const q = rng.int(1, hard ? 3 : 2) * rng.sign();
    const base: Term[] = [
      ...(hard && rng.chance(0.5) ? [{ c: rng.int(1, 2) * rng.sign(), a: 3, b: 0 }] : []),
      { c: rng.int(1, 3) * (hard ? rng.sign() : 1), a: 2, b: 0 },
      { c: rng.int(-2, 2), a: 1, b: 1 },
      { c: rng.int(1, 3) * (hard ? rng.sign() : 1), a: 0, b: 2 },
    ];
    const D = -xyAt(partialX(base), p, q);
    const terms = [...base, { c: D, a: 1, b: 0 }, { c: rng.int(-4, 4), a: 0, b: 1 }].filter((t) => t.c !== 0);
    const rhs = xyAt(terms, p, q);
    const fxx = xyAt(partialX(partialX(terms)), p, q);
    const fy = xyAt(partialY(terms), p, q);
    if (rhs === 0 || Math.abs(rhs) > 99 || Math.abs(D) > 12 || fxx === 0 || fy === 0 || Math.abs(fy) > 20) continue;
    if (straight(terms)) continue;
    return { curve: { terms, rhs, p, q } };
  }
}

/** [N_x, D] at the point, where N and D are the parts without and with dy/dx. */
export function turningParts({ curve }: TurningParams): [number, number] {
  const N = partialX(curve.terms);
  return [xyAt(partialX(N), curve.p, curve.q), xyAt(partialY(curve.terms), curve.p, curve.q)];
}

/** The prompt shared by the turning-point questions: the curve, the point, N and D. */
function turningPrompt({ curve }: TurningParams, ask: string): Block[] {
  return [
    prose(`The tangent to this curve is horizontal at $${pair(curve.p, curve.q)}$.`),
    ...equationBlocks(curve),
    prose(`Differentiating once gives $N + D${DYDX} = 0$, with`),
    display(`N = ${xyTex(partialX(curve.terms))}`),
    display(`D = ${xyTex(partialY(curve.terms))}`),
    prose(ask),
  ];
}

function turningImplicitSolution(params: TurningParams): SolutionStep[] {
  const { curve } = params;
  const [nx, dd] = turningParts(params);
  const v = fracValue([-nx, dd]);
  return [
    {
      text: `Differentiate $N$ with respect to $x$, holding $y$ still: every other term of the second differentiation carries a $${DYDX}$, which is $0$ here.`,
      tex: `N_x = ${xyTex(partialX(partialX(curve.terms)))}`,
    },
    { text: `At $${pair(curve.p, curve.q)}$: $N_x = ${nx}$ and $D = ${dd}$.`, tex: `${D2YDX2} = -\\frac{N_x}{D} = ${fracTex(-nx, dd)}` },
    { text: v < 0 ? 'Negative: concave down, so a local maximum.' : 'Positive: concave up, so a local minimum.' },
  ];
}

/**
 * d²y/dx² at a horizontal tangent of an implicit curve as a tree: $N_x$ and
 * $D$ at the point, then $-\frac{N_x}{D}$.
 *
 * The bank carries the quotient with its sign lost and upside down.
 */
const implTurningTree: Generator<TurningParams> = {
  id: 'impl-turning-tree',
  sample: sampleTurning,
  render: (params): Slide => {
    const [nx, dd] = turningParts(params);
    const { curve } = params;
    const ny = xyAt(partialY(partialX(curve.terms)), curve.p, curve.q);
    const answer: Frac[] = [[nx, 1], [dd, 1], [-nx, dd]];
    return {
      kind: 'tree',
      prompt: turningPrompt(
        params,
        `Find $${D2YDX2}$ there. The top row is $N_x$, which is $N$ differentiated with respect to $x$ with $y$ held still, and $D$, both at the point; the box below is $${D2YDX2}$.`,
      ),
      expression: `${D2YDX2} = -\\frac{N_x}{D}`,
      nodes: [
        { id: 'nx', from: [] },
        { id: 'd', from: [] },
        { id: 'v', from: ['nx', 'd'] },
      ],
      bank: fracTreeBank(answer, [[nx, dd], [-dd, nx], [ny, 1], [0, 1]]),
      answer: answer.map(([n, d0]) => fracTex(n, d0)),
    };
  },
  solution: turningImplicitSolution,
};

/**
 * d²y/dx² at a horizontal tangent of an implicit curve, typed as a number.
 * The options carry the sign lost and the fraction upside down.
 */
const implTurningValue: Generator<TurningParams> = {
  id: 'impl-turning-value',
  sample: sampleTurning,
  choices: (params) => {
    const [nx, dd] = turningParts(params);
    const { curve } = params;
    const ny = xyAt(partialY(partialX(curve.terms)), curve.p, curve.q);
    return fracChoices([-nx, dd], [[nx, dd], [-dd, nx], [-ny, dd]], mix(curve.p, curve.q, curve.rhs, nx, dd));
  },
  render: (params): Slide => {
    const [nx, dd] = turningParts(params);
    return {
      kind: 'expression',
      prompt: turningPrompt(params, `Find the value of $${D2YDX2}$ there.`),
      lead: `${D2YDX2} =`,
      keypad: FRACTION_KEYS,
      answer: fracAnswer(-nx, dd),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: turningImplicitSolution,
};

/**
 * Maximum or minimum on an implicit curve as three decisions: $N_x$ at the
 * point, the second derivative, and the verdict.
 */
const implTurningFlow: Generator<TurningParams> = {
  id: 'impl-turning-flow',
  sample: sampleTurning,
  render: (params): Slide => {
    const [nx, dd] = turningParts(params);
    const { curve } = params;
    const ny = xyAt(partialY(partialX(curve.terms)), curve.p, curve.q);
    const salt = mix(curve.p, curve.q, curve.rhs, nx, dd);
    const nxLabel = (v: number) => `$N_x = ${v}$`;
    const nxWrong = [
      { v: 0, outcome: 'Then you have $N$ itself, which is $0$ there: that only says the tangent is horizontal.' },
      { v: ny, outcome: 'Then you have differentiated $N$ with respect to $y$.' },
      { v: -nx, outcome: `Then $${D2YDX2}$ comes out as $${fracTex(nx, dd)}$.` },
    ].filter((w, i, all) => w.v !== nx && all.findIndex((o) => o.v === w.v) === i).slice(0, 2);
    const right: Frac = [-nx, dd];
    const seen = new Set([fracValue(right)]);
    const valueWrong = ([[nx, dd], [-dd, nx], [-nx, 2 * dd]] as Frac[]).filter((f) => {
      const v = fracValue(f);
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    }).slice(0, 2);
    const value = `$${D2YDX2} = ${fracTex(...right)}$`;
    const verdict = fracValue(right) < 0 ? 'A local maximum' : 'A local minimum';
    return {
      kind: 'flow',
      prompt: turningPrompt(params, 'Is the point a local maximum or a local minimum?'),
      subject: `${D2YDX2} = -\\frac{N_x}{D}`,
      steps: [
        {
          id: 'nx',
          ask: `Differentiate $N$ with respect to $x$, holding $y$ still. What is it at $${pair(curve.p, curve.q)}$?`,
          branches: turned(
            [{ label: nxLabel(nx), to: 'value' }, ...nxWrong.map((w) => ({ label: nxLabel(w.v), outcome: w.outcome }))],
            salt % (nxWrong.length + 1),
          ),
        },
        {
          id: 'value',
          ask: `With $D = ${dd}$ there, what is $${D2YDX2}$?`,
          branches: turned(
            [
              { label: value, to: 'verdict' },
              ...valueWrong.map((f) => ({
                label: `$${D2YDX2} = ${fracTex(...f)}$`,
                outcome: `Then the test would run on $${fracTex(...f)}$.`,
              })),
            ],
            (salt >>> 3) % (valueWrong.length + 1),
          ),
        },
        {
          id: 'verdict',
          ask: `So $${pair(curve.p, curve.q)}$ is`,
          branches: [
            { label: 'A local maximum', outcome: 'Then the curve bends down there.' },
            { label: 'A local minimum', outcome: 'Then the curve bends up there.' },
          ],
        },
      ],
      answer: [nxLabel(nx), value, verdict],
    };
  },
  solution: turningImplicitSolution,
};

export interface TurningKindParams extends StationaryParams {
  /** Asking which point is the maximum, rather than the minimum. */
  max: boolean;
}

/** d²y/dx² at each horizontal tangent, (x0, k x0) first. */
export function stationarySeconds(params: StationaryParams): [number, number] {
  const { A, B, C } = params;
  return stationaryPoints(params).map(([x, y]) => (-2 * A) / (B * x + 2 * C * y)) as [number, number];
}

/**
 * Which of a curve's two horizontal tangents is the maximum (or minimum).
 *
 * The two points sit either side of the origin, so the part multiplying
 * dy/dx takes opposite signs at them and one is always a maximum, the other a
 * minimum; "Both" and "Neither" are there for the learner who has not worked
 * that out.
 */
const implTurningKind: Generator<TurningKindParams> = {
  id: 'impl-turning-kind',
  sample: (rng, difficulty) => ({ ...sampleStationary(rng, difficulty), max: difficulty >= 2 ? rng.chance(0.5) : true }),
  render: (params): Slide => {
    const [[x1, y1], [x2, y2]] = stationaryPoints(params);
    const [s1] = stationarySeconds(params);
    const firstIsMax = s1 < 0;
    return {
      kind: 'choice',
      prompt: [
        prose('This curve'),
        display(stationaryEquation(params)),
        prose(`has horizontal tangents at $${pair(x1, y1)}$ and $${pair(x2, y2)}$. Which is a local ${params.max ? 'maximum' : 'minimum'}?`),
      ],
      options: [
        { id: 'first', label: pair(x1, y1), tex: true },
        { id: 'second', label: pair(x2, y2), tex: true },
        { id: 'both', label: 'Both' },
        { id: 'neither', label: 'Neither' },
      ],
      correctId: firstIsMax === params.max ? 'first' : 'second',
    };
  },
  solution: (params) => {
    const { A } = params;
    const terms = stationaryTerms(params);
    const points = stationaryPoints(params);
    return [
      { text: 'The parts without and with $\\frac{dy}{dx}$ are', tex: `N = ${xyTex(partialX(terms))}, \\quad D = ${xyTex(partialY(terms))}` },
      { text: `So $N_x = ${2 * A}$, and at a horizontal tangent $${D2YDX2} = -\\frac{${2 * A}}{D}$.` },
      ...points.map(([x, y]) => {
        const dd = xyAt(partialY(terms), x, y);
        return {
          text: `At $${pair(x, y)}$, $D = ${dd}$, so $${D2YDX2} = ${fracTex(-2 * A, dd)}$: a local ${-2 * A * dd < 0 ? 'maximum' : 'minimum'}.`,
        };
      }),
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
  paramD2,
  paramD2Tiles,
  paramD2Flow,
  paramD2Trig,
  paramD2RatesTree,
  paramD2QuotientSteps,
  paramD2At,
  paramD2General,
  paramConcaveChoice,
  paramTurningTree,
  paramNatureFlow,
  paramLowestSlider,
  implD2Tiles,
  implD2SubSteps,
  implD2At,
  implD2PointTree,
  implTurningTree,
  implTurningValue,
  implTurningFlow,
  implTurningKind,
};

export const parametricGenerators = Object.values(piGenerators) as Generator<never>[];
