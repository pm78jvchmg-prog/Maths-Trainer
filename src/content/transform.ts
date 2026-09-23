/**
 * A transformed graph, held as numbers.
 *
 * The `transform` slide asks the learner to move a curve rather than describe
 * one, so three places need the same picture of what a transformation *is*:
 * the widget that draws the live curve, the reducer that grades it, and the
 * generators that write the targets. It lives here, beside `expr.ts`, for the
 * same reason that file does — the reducer imports it, so it cannot sit in the
 * UI.
 *
 * Every transformation is held in one canonical form,
 *
 *   y = ±sy · f(±(x − h) / sx) + k
 *
 * which is what the controls map onto one for one. The stretches and flips act
 * about the curve's own anchor (x = h, y = k) rather than about the axes, so
 * each control does the one thing its label says whatever else has been set:
 * *Move right* moves the curve right, and *Flip ↔* mirrors it where it stands.
 * At the identity those are exactly the reflections in the y-axis and the
 * x-axis, and the readout says what the result is either way.
 *
 * Stretch factors are the *geometric* ones — how much wider or taller the curve
 * gets — so `sx = 2` reads as `f(\tfrac{1}{2}x)`. That is the mapping between
 * picture and equation the topic is about, and a control labelled with the
 * coefficient instead would do the learner's half of the question for them.
 */

/** The base curves a question may start from. */
export type BaseCurve = 'square' | 'cube' | 'abs' | 'sqrt' | 'sin' | 'recip' | 'exp2';

/** The window a transform slide is drawn and graded over. */
export interface Window {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Transform {
  /** Horizontal translation: positive moves the curve right. */
  h: number;
  /** Vertical translation: positive moves the curve up. */
  k: number;
  /** Horizontal scale factor: 2 makes the curve twice as wide. */
  sx: number;
  /** Vertical scale factor: 2 makes the curve twice as tall. */
  sy: number;
  /** Mirrored left to right, about x = h. */
  fx: boolean;
  /** Mirrored top to bottom, about y = k. */
  fy: boolean;
}

export const IDENTITY: Transform = { h: 0, k: 0, sx: 1, sy: 1, fx: false, fy: false };

/**
 * The stretch factors a control steps through, one rung per tap.
 *
 * Symmetric about 1 so a stretch can be undone by the opposite tap, and held as
 * `[numerator, denominator]` so a factor is written `\tfrac{1}{3}` rather than
 * `0.333…` on screen and `1/3` in the answer string.
 */
export const SCALE_LADDER: readonly (readonly [number, number])[] = [
  [1, 4],
  [1, 3],
  [1, 2],
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
];

/** How far a translation control reaches either way. */
export const SHIFT_LIMIT = 5;

/** The rung of the ladder a factor sits on, or -1 when it is off the ladder. */
export function rungOf(factor: number): number {
  return SCALE_LADDER.findIndex(([n, d]) => Math.abs(n / d - factor) < 1e-9);
}

/** The factor on a given rung, clamped to the ladder's ends. */
export function factorAt(rung: number): number {
  const [n, d] = SCALE_LADDER[Math.max(0, Math.min(SCALE_LADDER.length - 1, rung))];
  return n / d;
}

interface BaseInfo {
  f: (x: number) => number;
  /** What `f(x)` is, as TeX the learner reads. */
  tex: string;
  window: Window;
  /** Whether the curve has a vertical asymptote, so the pen must lift. */
  asymptote: boolean;
}

/**
 * The family a generator draws from.
 *
 * Windows are per curve because one size does not fit: `sin x` has an
 * amplitude of 1, and on the twelve-unit height that suits a parabola it is a
 * ripple eleven pixels tall.
 */
export const BASES: Record<BaseCurve, BaseInfo> = {
  square: {
    f: (x) => x * x,
    tex: 'x^2',
    window: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    asymptote: false,
  },
  cube: {
    f: (x) => x * x * x,
    tex: 'x^3',
    window: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    asymptote: false,
  },
  abs: {
    f: (x) => Math.abs(x),
    tex: '|x|',
    window: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    asymptote: false,
  },
  sqrt: {
    // Undefined rather than zero to the left, so the curve starts where it
    // does and a learner's curve with the wrong domain cannot grade correct.
    f: (x) => (x >= 0 ? Math.sqrt(x) : Number.NaN),
    tex: '\\sqrt{x}',
    window: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    asymptote: false,
  },
  sin: {
    f: (x) => Math.sin(x),
    tex: '\\sin x',
    window: { xMin: -6, xMax: 6, yMin: -4, yMax: 4 },
    asymptote: false,
  },
  recip: {
    f: (x) => 1 / x,
    tex: '\\frac{1}{x}',
    window: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    asymptote: true,
  },
  exp2: {
    f: (x) => 2 ** x,
    tex: '2^x',
    window: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    asymptote: false,
  },
};

/** The transformed function, as something to evaluate. */
export function transformed(base: BaseCurve, t: Transform): (x: number) => number {
  const { f } = BASES[base];
  const outer = (t.fy ? -1 : 1) * t.sy;
  const inner = (t.fx ? -1 : 1) / t.sx;
  return (x) => outer * f(inner * (x - t.h)) + t.k;
}

/**
 * Where a transform slide is graded: thirteen fixed points across the window.
 *
 * Fixed, so a verdict never depends on a random draw. Each sits at the middle
 * of its thirteenth of the window, which keeps them off the whole numbers a
 * shift can land an asymptote on — except the centre, and there both curves
 * are either undefined together or the learner's is wrong.
 */
export function samplePoints(window: Window): number[] {
  const width = window.xMax - window.xMin;
  return Array.from({ length: 13 }, (_, i) => window.xMin + ((i + 0.5) * width) / 13);
}

/**
 * Whether two transformations draw the same curve.
 *
 * The comparison is of curves, never of parameters: for an even `f`, a flip
 * left to right changes nothing, and a learner who drew the right curve is
 * right however they got there. So both are evaluated at the same fixed points
 * and must agree wherever either is defined — one defined where the other is
 * not is a different domain, and so a different curve.
 */
export function sameCurve(base: BaseCurve, a: Transform, b: Transform, window: Window): boolean {
  const f = transformed(base, a);
  const g = transformed(base, b);
  let compared = 0;
  for (const x of samplePoints(window)) {
    const u = f(x);
    const v = g(x);
    const uOk = Number.isFinite(u);
    const vOk = Number.isFinite(v);
    if (!uOk && !vOk) continue;
    if (uOk !== vOk) return false;
    if (Math.abs(u - v) > 1e-6 * Math.max(1, Math.abs(v))) return false;
    compared += 1;
  }
  // Two curves undefined across the whole window have agreed about nothing.
  return compared >= 2;
}

/** A factor as the answer string writes it: `2`, `1/3`. */
function factorString(factor: number): string {
  const rung = rungOf(factor);
  if (rung === -1) return String(factor);
  const [n, d] = SCALE_LADDER[rung];
  return d === 1 ? String(n) : `${n}/${d}`;
}

/**
 * One string, `h=2,k=1,sx=1,sy=2,fx=0,fy=1`.
 *
 * A string so the session's `Answer` union does not grow a member for one
 * widget — the same trick `reduce` plays with its `path=value` moves.
 */
export function encodeTransform(t: Transform): string {
  return [
    `h=${t.h}`,
    `k=${t.k}`,
    `sx=${factorString(t.sx)}`,
    `sy=${factorString(t.sy)}`,
    `fx=${t.fx ? 1 : 0}`,
    `fy=${t.fy ? 1 : 0}`,
  ].join(',');
}

function parseNumber(text: string): number {
  const [n, d, ...rest] = text.split('/');
  if (rest.length > 0 || n.trim() === '') return Number.NaN;
  return d === undefined ? Number(n) : Number(n) / Number(d);
}

/** The inverse of `encodeTransform`; undefined for anything malformed. */
export function parseTransform(text: string): Transform | undefined {
  const fields = new Map<string, string>();
  for (const part of text.split(',')) {
    const at = part.indexOf('=');
    if (at < 1) return undefined;
    fields.set(part.slice(0, at).trim(), part.slice(at + 1).trim());
  }
  const keys = ['h', 'k', 'sx', 'sy', 'fx', 'fy'];
  if (fields.size !== keys.length || keys.some((key) => !fields.has(key))) return undefined;

  const h = parseNumber(fields.get('h')!);
  const k = parseNumber(fields.get('k')!);
  const sx = parseNumber(fields.get('sx')!);
  const sy = parseNumber(fields.get('sy')!);
  const fx = fields.get('fx');
  const fy = fields.get('fy');
  if (![h, k, sx, sy].every(Number.isFinite) || sx <= 0 || sy <= 0) return undefined;
  if (!['0', '1'].includes(fx!) || !['0', '1'].includes(fy!)) return undefined;
  return { h, k, sx, sy, fx: fx === '1', fy: fy === '1' };
}

/** A positive factor as TeX: `2`, `\tfrac{1}{3}`. */
export function factorTex(factor: number): string {
  const rung = rungOf(factor);
  if (rung === -1) return String(factor);
  const [n, d] = SCALE_LADDER[rung];
  return d === 1 ? String(n) : `\\tfrac{${n}}{${d}}`;
}

/**
 * The equation a transformation draws, as the learner reads it.
 *
 * `y = 2f(x - 3) + 1`, `y = -f(x)`, `y = f(\tfrac{1}{2}x)`. The inside of the
 * bracket is written as a coefficient times `(x - h)` because that is the form
 * the controls build; a coefficient of 1 is left off, and a shift of 0 drops
 * the bracket round `x`.
 */
export function transformTex(t: Transform, name = 'f'): string {
  const signed = (value: number, text: string) => (value < 0 ? `-${text}` : text);

  const innerFactor = 1 / t.sx;
  const innerCoef = innerFactor === 1 ? '' : factorTex(innerFactor);
  const innerSign = t.fx ? '-' : '';
  const shifted =
    t.h === 0 ? 'x' : t.h > 0 ? `x - ${t.h}` : `x + ${-t.h}`;
  const inside =
    t.h === 0
      ? `${innerSign}${innerCoef}x`
      : innerCoef === '' && innerSign === ''
        ? shifted
        : `${innerSign}${innerCoef}(${shifted})`;

  const outerCoef = t.sy === 1 ? '' : factorTex(t.sy);
  const outer = signed(t.fy ? -1 : 1, `${outerCoef}${name}(${inside})`);
  const tail = t.k === 0 ? '' : t.k > 0 ? ` + ${t.k}` : ` - ${-t.k}`;
  return `y = ${outer}${tail}`;
}

/** Whether a transformation can be reached with the widget's controls. */
export function reachable(t: Transform): boolean {
  return (
    Number.isInteger(t.h) &&
    Number.isInteger(t.k) &&
    Math.abs(t.h) <= SHIFT_LIMIT &&
    Math.abs(t.k) <= SHIFT_LIMIT &&
    rungOf(t.sx) !== -1 &&
    rungOf(t.sy) !== -1
  );
}
