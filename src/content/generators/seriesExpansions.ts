/**
 * Series Expansions generators.
 *
 * Every function here is one of six standard series with something put in
 * for `u`: `e^u`, `sin u`, `cos u`, `ln(1 + u)`, `1/(1 - u)` and `(1 + u)^N`
 * for a whole `N`. A function is held as that base, the `u = k x^m` put into
 * it and a whole multiplier (`Fn`), so the coefficient of any power of `x` is
 * exact rational arithmetic (`Q`): the coefficient of `u^j` in the base, times
 * `k^j`. Nothing is ever a rounded decimal, so every bank, option and typed
 * answer is a fraction in lowest terms.
 *
 * Taylor series (level 2) use the same machinery in `h = x - a`: each centre
 * is chosen so that `f(a)` is whole, which is what keeps the series exact.
 *
 * A series is a *form*, and the checker compares values (PITFALLS 3.4), so a
 * whole series is only ever asked through tiles, steps, a tree or a choice;
 * `expression` is kept for a single coefficient, term or limit.
 * `seriesExpansions.test.ts` reads the polynomial back off each rendered slide
 * and checks every coefficient against `f^(n)(0)/n!` from mathjs's own
 * derivatives, which is what makes these more than self-consistent.
 *
 * As everywhere, `*Tex` is what the learner reads and `answer` is what mathjs
 * grades; the two are never the same string.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { canonicalSet } from '../numberLine';
import { ALGEBRA_KEYS, sumTex } from './calculus';
import { windowFor } from './numberLine';
import { fracTex, gcd, mix, steered, stepBank, tokenBank, treeBank, turned } from './parametricImplicit';

/* ================================================================
 * Exact fractions
 * ================================================================ */

/** A fraction in lowest terms with a positive denominator. */
export interface Q {
  n: number;
  d: number;
}

export function q(n: number, d = 1): Q {
  if (d === 0) throw new Error('q: zero denominator');
  const g = gcd(n, d);
  const top = ((d < 0 ? -1 : 1) * n) / g;
  return { n: top === 0 ? 0 : top, d: Math.abs(d) / g };
}

const ZERO = q(0);
const ONE = q(1);
const add = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a: Q): Q => q(-a.n, a.d);
const sub = (a: Q, b: Q): Q => add(a, neg(b));
const mul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q): Q => q(a.n * b.d, a.d * b.n);
const abs = (a: Q): Q => q(Math.abs(a.n), a.d);
export const val = (a: Q): number => a.n / a.d;
const eq = (a: Q, b: Q): boolean => a.n === b.n && a.d === b.d;
const isZero = (a: Q): boolean => a.n === 0;

function pow(a: Q, k: number): Q {
  let out = ONE;
  for (let i = 0; i < k; i += 1) out = mul(out, a);
  return out;
}

export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return fact(n) / (fact(k) * fact(n - k));
}

/** A fraction as the learner reads it. */
export const qTex = (a: Q): string => fracTex(a.n, a.d);

/** The same fraction for mathjs: the outer brackets matter (PITFALLS 3.3). */
export const qAns = (a: Q): string => (a.d === 1 ? `${a.n}` : `((${a.n})/(${a.d}))`);

/** A fraction that follows an operator: negatives are bracketed. */
const inLine = (a: Q): string => (a.n < 0 ? `(${qTex(a)})` : qTex(a));

/** A number the learner reads as a decimal, as JavaScript prints it. */
const dec = (x: number): string => `${Math.round(x * 1e6) / 1e6}`;

/* ================================================================
 * Functions and their series
 * ================================================================ */

export type Base = 'exp' | 'sin' | 'cos' | 'ln' | 'geo' | 'pow';

/** `scale` times a standard series with `u = k x^m` put into it. */
export interface Fn {
  base: Base;
  k: Q;
  m: number;
  scale: number;
  /** The whole power of `(1 + u)^N`, for base `pow`. */
  index: number;
}

export const fnOf = (base: Base, k: Q | number, extra: Partial<Omit<Fn, 'base' | 'k'>> = {}): Fn => ({
  base,
  k: typeof k === 'number' ? q(k) : k,
  m: 1,
  scale: 1,
  index: 0,
  ...extra,
});

/** The coefficient of `u^j` in the standard series itself. */
export function unitCoef(base: Base, j: number, index = 0): Q {
  switch (base) {
    case 'exp':
      return q(1, fact(j));
    case 'sin':
      return j % 2 === 1 ? q(((j - 1) / 2) % 2 === 0 ? 1 : -1, fact(j)) : ZERO;
    case 'cos':
      return j % 2 === 0 ? q((j / 2) % 2 === 0 ? 1 : -1, fact(j)) : ZERO;
    case 'ln':
      return j === 0 ? ZERO : q(j % 2 === 1 ? 1 : -1, j);
    case 'geo':
      return ONE;
    case 'pow':
      return q(choose(index, j));
  }
}

/** The coefficient of `x^p` in the Maclaurin series of `f`. */
export function coefOf(f: Fn, p: number): Q {
  if (p < 0 || p % f.m !== 0) return ZERO;
  const j = p / f.m;
  return mul(q(f.scale), mul(unitCoef(f.base, j, f.index), pow(f.k, j)));
}

/** `f^(p)(0)`, which is the coefficient times `p!`. */
export const derivAt = (f: Fn, p: number): Q => mul(coefOf(f, p), q(fact(p)));

/** `k x^m` as the learner reads it: `2x`, `-x^{2}`, `\frac{x}{2}`, `-\frac{3x}{2}`. */
export function uTex(k: Q, m = 1, v = 'x'): string {
  const xp = m === 1 ? v : `${v}^{${m}}`;
  const sign = k.n < 0 ? '-' : '';
  const size = Math.abs(k.n);
  const top = `${size === 1 ? '' : size}${xp}`;
  return k.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${k.d}}`;
}

/** `+ 2x` or `- 2x`: something added on to what came before. */
const plus = (tex: string): string => (tex.startsWith('-') ? `- ${tex.slice(1)}` : `+ ${tex}`);

/** `- 2x` or `+ 2x`: something taken away from what came before. */
const minus = (tex: string): string => (tex.startsWith('-') ? `+ ${tex.slice(1)}` : `- ${tex}`);

/** A whole multiplier in front: 1 and -1 are implied. */
const lead = (c: number): string => (c === 1 ? '' : c === -1 ? '-' : `${c}`);

/** The standard function of `u`, with no multiplier. */
export function baseTex(base: Base, u: string, index = 0): string {
  const arg = /^[a-z0-9\\{}^]*$/i.test(u) && !u.startsWith('-') ? ` ${u}` : `(${u})`;
  switch (base) {
    case 'exp':
      return `e^{${u}}`;
    case 'sin':
      return u.startsWith('\\frac') ? `\\sin${u}` : `\\sin${arg}`;
    case 'cos':
      return u.startsWith('\\frac') ? `\\cos${u}` : `\\cos${arg}`;
    case 'ln':
      return `\\ln(1 ${plus(u)})`;
    case 'geo':
      return `\\frac{1}{1 ${minus(u)}}`;
    case 'pow':
      return `(1 ${plus(u)})^{${index}}`;
  }
}

/** The function as the learner reads it. */
export function fnTex(f: Fn, v = 'x'): string {
  const u = uTex(f.k, f.m, v);
  if (f.base === 'geo') {
    const sign = f.scale < 0 ? '-' : '';
    return `${sign}\\frac{${Math.abs(f.scale)}}{1 ${minus(u)}}`;
  }
  return `${lead(f.scale)}${baseTex(f.base, u, f.index)}`;
}

/** The function for mathjs. Never displayed. */
export function fnSource(f: Fn): string {
  const u = `((${f.k.n})/(${f.k.d}))*x^${f.m}`;
  const body = {
    exp: `exp(${u})`,
    sin: `sin(${u})`,
    cos: `cos(${u})`,
    ln: `log(1 + ${u})`,
    geo: `1/(1 - ${u})`,
    pow: `(1 + ${u})^${f.index}`,
  }[f.base];
  return `(${f.scale})*${body}`;
}

/** One term of a series. */
export interface Term {
  c: Q;
  p: number;
}

/** The first `count` non-zero terms with power at most `cap`. */
export function termsOf(f: Fn, count: number, cap = 6): Term[] {
  const out: Term[] = [];
  for (let p = 0; p <= cap && out.length < count; p += 1) {
    const c = coefOf(f, p);
    if (!isZero(c)) out.push({ c, p });
  }
  return out;
}

/** Whether `f` has a non-zero term beyond power `p`: false only for a finished polynomial. */
function goesOn(f: Fn, p: number): boolean {
  if (f.base !== 'pow') return true;
  return p < f.index * f.m;
}

const powerTex = (p: number, v: string): string => (p === 0 ? '' : p === 1 ? v : `${v}^{${p}}`);

/** `c x^p` as the learner reads it: `-\frac{4}{3}x^{3}`, `x^{2}`, `5`. */
export function monoTex(c: Q, p: number, v = 'x'): string {
  if (p === 0) return qTex(c);
  const size = abs(c);
  return `${c.n < 0 ? '-' : ''}${eq(size, ONE) ? '' : qTex(size)}${powerTex(p, v)}`;
}

/** `+ c x^p` or `- c x^p`, following another term. */
export const signedMono = (c: Q, p: number, v = 'x'): string =>
  c.n < 0 ? `- ${monoTex(neg(c), p, v)}` : `+ ${monoTex(c, p, v)}`;

/**
 * A term standing alone as a tile. A negative is spelled as `signedMono`
 * spells it, since TeX draws `-2x` and `- 2x` alike (PR #83).
 */
export const leadTile = (c: Q, p: number, v = 'x'): string => (c.n < 0 ? signedMono(c, p, v) : monoTex(c, p, v));

/** Terms joined into a series, with `+ \cdots` on the end unless it stops. */
export function seriesTex(terms: Term[], v = 'x', more = true): string {
  if (terms.length === 0) return '0';
  const [first, ...rest] = terms;
  const body = [monoTex(first.c, first.p, v), ...rest.map((t) => signedMono(t.c, t.p, v))].join(' ');
  return more ? `${body} + \\cdots` : body;
}

/** One term for mathjs; `v` is itself mathjs, such as `(x - (4))`. */
export const monoAns = (c: Q, p: number, v = 'x'): string => (p === 0 ? qAns(c) : `${qAns(c)}*${v}^${p}`);

export const seriesAns = (terms: Term[], v = 'x'): string =>
  terms.length === 0 ? '0' : terms.map((t) => `(${monoAns(t.c, t.p, v)})`).join(' + ');

/** The standard series in `u`, as quoted on a slide. */
export function standardTex(base: Base, index = 0): string {
  switch (base) {
    case 'exp':
      return 'e^{u} = 1 + u + \\frac{u^{2}}{2!} + \\frac{u^{3}}{3!} + \\cdots';
    case 'sin':
      return '\\sin u = u - \\frac{u^{3}}{3!} + \\frac{u^{5}}{5!} - \\cdots';
    case 'cos':
      return '\\cos u = 1 - \\frac{u^{2}}{2!} + \\frac{u^{4}}{4!} - \\cdots';
    case 'ln':
      return '\\ln(1 + u) = u - \\frac{u^{2}}{2} + \\frac{u^{3}}{3} - \\cdots';
    case 'geo':
      return '\\frac{1}{1 - u} = 1 + u + u^{2} + u^{3} + \\cdots';
    case 'pow':
      return `(1 + u)^{${index}} = ${seriesTex(termsOf(fnOf('pow', 1, { index }), 4, index), 'u', index > 3)}`;
  }
}

/** A derivative at a point as the learner reads it: `f''(0)`, `f^{(4)}(0)`. */
export function derivName(p: number, at = '0'): string {
  if (p === 0) return `f(${at})`;
  if (p <= 3) return `f${"'".repeat(p)}(${at})`;
  return `f^{(${p})}(${at})`;
}

/* ================================================================
 * Banks and options
 * ================================================================ */

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });

/** A number that may be a fraction. */
const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/** Fractions as tiles: the answer's (as a multiset), then distinct slips, sorted by value. */
export function qBank(answer: Q[], slips: Q[], spare = 3): string[] {
  const taken = answer.map(val);
  const extras: Q[] = [];
  const offer = (c: Q) => {
    const v = val(c);
    if (!Number.isFinite(v) || taken.includes(v) || extras.some((e) => val(e) === v)) return;
    extras.push(c);
  };
  for (const slip of slips) {
    if (extras.length >= spare) break;
    offer(slip);
  }
  for (let step = 1; extras.length < spare; step += 1) {
    for (const c of answer) {
      if (extras.length >= spare) break;
      offer(add(c, q(step)));
      offer(sub(c, q(step)));
    }
  }
  return [...answer, ...extras].sort((a, b) => val(a) - val(b)).map(qTex);
}

/** Term tiles: the answer's, then distinct slips, in a stable order. */
function termBank(answer: string[], slips: string[], spare = 3): string[] {
  return tokenBank(answer, slips.filter((s) => !answer.includes(s)), spare);
}

/**
 * Options for a fraction: the answer, then the slips that really differ from
 * it and from each other, steered so the answer's slot comes from `salt`.
 */
export function qChoices(correct: Q, slips: Q[], salt: number, tex: (c: Q) => string = qTex, ans: (c: Q) => string = qAns): ChoiceOption[] {
  const seen = [val(correct)];
  const kept: Q[] = [];
  for (const slip of [...slips, neg(correct), add(correct, ONE), sub(correct, ONE), mul(correct, q(2))]) {
    const v = val(slip);
    if (!Number.isFinite(v) || seen.some((s) => Math.abs(s - v) < 1e-12)) continue;
    seen.push(v);
    kept.push(slip);
  }
  const asOption = (c: Q) => ({ tex: tex(c), answer: ans(c) });
  return steered(options(asOption(correct), ...kept.slice(0, 3).map(asOption)), salt, kept.slice(3).map(asOption));
}

/** Options for a series or other form: the answer, then distinct slips by value. */
function formChoices(correct: { tex: string; answer?: string; key: string }, slips: { tex: string; answer?: string; key: string }[], salt: number): ChoiceOption[] {
  const seen = new Set([correct.key]);
  const kept: { tex: string; answer?: string }[] = [];
  for (const slip of slips) {
    if (seen.has(slip.key)) continue;
    seen.add(slip.key);
    kept.push({ tex: slip.tex, answer: slip.answer });
  }
  const strip = ({ tex, answer }: { tex: string; answer?: string }) => (answer === undefined ? { tex } : { tex, answer });
  return steered(options(strip(correct), ...kept.slice(0, 3).map(strip)), salt, kept.slice(3).map(strip));
}

/** A series as a choice option, keyed by its coefficients so equal series collide. */
const seriesOption = (terms: Term[], more = true, v = 'x', vAns = 'x') => ({
  tex: seriesTex(terms, v, more),
  answer: seriesAns(terms, vAns),
  key: terms
    .filter((t) => !isZero(t.c))
    .map((t) => `${t.p}:${t.c.n}/${t.c.d}`)
    .join(' '),
});

/** The rotation `choiceVariant` gives a derived slide, so `steered` works for a native one too. */
function rotation(opts: ChoiceOption[]): number {
  let hash = 0;
  for (const option of opts) {
    for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % opts.length;
}

/** A multiple-choice slide from options, ordered by a hash of their labels (PITFALLS 3.10). */
export function choiceSlide(prompt: Block[], opts: ChoiceOption[]): Slide {
  const turn = rotation(opts);
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex: true })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** A stable salt from a function and some numbers. */
const saltOf = (f: Fn, ...more: number[]): number =>
  mix(['exp', 'sin', 'cos', 'ln', 'geo', 'pow'].indexOf(f.base), f.k.n, f.k.d, f.m, f.scale, f.index, ...more);

const nonZero = (rng: Rng, lo: number, hi: number): number => {
  for (;;) {
    const v = rng.int(lo, hi);
    if (v !== 0) return v;
  }
};

/** Slips for one term of a series: a wrong sign, a missing factorial, `k` left unpowered. */
function termSlips(f: Fn, t: Term): Term[] {
  const j = t.p / f.m;
  const bare = mul(q(f.scale), pow(f.k, j));
  const out: Term[] = [{ c: neg(t.c), p: t.p }];
  if (f.base === 'exp' || f.base === 'sin' || f.base === 'cos') out.push({ c: mul(bare, q(Math.sign(val(unitCoef(f.base, j))))), p: t.p });
  if (f.base === 'ln' && j > 1) out.push({ c: mul(t.c, q(j, fact(j))), p: t.p });
  if (j > 1) out.push({ c: mul(q(f.scale), mul(unitCoef(f.base, j, f.index), f.k)), p: t.p });
  if (f.m > 1) out.push({ c: t.c, p: j });
  return out.filter((s) => !isZero(s.c));
}

/* ================================================================
 * Level 1, lesson 1: the Maclaurin series
 * ================================================================ */

interface CoefTreeParams {
  f: Fn;
}

/** Why the derivatives come out as they do, one line per base. */
function derivHint(f: Fn): string {
  const k = qTex(f.k);
  switch (f.base) {
    case 'exp':
      return `Each derivative of $${fnTex(f)}$ brings out another factor of $${k}$, and $e^{0} = 1$.`;
    case 'sin':
    case 'cos':
      return `Each derivative brings out a factor of $${k}$, and $\\sin$ and $\\cos$ take turns: at $0$, $\\sin$ gives $0$ and $\\cos$ gives $1$.`;
    case 'ln':
      return `$\\frac{d}{dx}\\ln(1 + kx) = \\frac{k}{1 + kx}$, and each derivative after that brings out another $-k$ and one more power of $1 + kx$ underneath.`;
    case 'geo':
      return `$\\frac{d}{dx}(1 - kx)^{-1} = k(1 - kx)^{-2}$: each derivative brings out $k$ and the next whole number.`;
    case 'pow':
      return `Each derivative of $(1 + kx)^{${f.index}}$ brings out $k$ and brings the power down by one.`;
  }
}

/** Tree: f'(0), f''(0), f'''(0), then the coefficients of x^2 and x^3. */
const coefTree: Generator<CoefTreeParams> = {
  id: 'ser-coef-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const base = rng.pick<Base>(hard ? ['sin', 'cos', 'ln', 'exp', 'pow'] : ['exp', 'pow', 'geo']);
      const k = hard ? rng.pick([2, -2, 3, -3]) : rng.pick([1, -1, 2, -2, 3]);
      const scale = hard ? nonZero(rng, -3, 3) : rng.int(1, 3);
      const f = fnOf(base, k, { scale, index: base === 'pow' ? rng.int(3, 5) : 0 });
      if (isZero(coefOf(f, 2)) && isZero(coefOf(f, 3))) continue;
      if (Math.abs(val(derivAt(f, 3))) > 200) continue;
      return { f };
    }
  },
  render: ({ f }): Slide => {
    const ds = [1, 2, 3].map((p) => derivAt(f, p));
    const cs = [2, 3].map((p) => coefOf(f, p));
    const slips = [
      ...ds.map(neg),
      ...cs.map(neg),
      div(ds[2], q(3)),
      mul(ds[1], q(2)),
      mul(f.k, q(f.scale)),
    ];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Find the derivatives of $f(x) = ${fnTex(f)}$ at $x = 0$, then the coefficients they give. Top row, left to right: $f'(0)$, $f''(0)$, $f'''(0)$. Underneath: the coefficients of $x^{2}$ and $x^{3}$.`,
        ),
      ],
      expression: 'a_{n} = \\frac{f^{(n)}(0)}{n!}',
      nodes: [
        { id: 'd1', from: [] },
        { id: 'd2', from: [] },
        { id: 'd3', from: [] },
        { id: 'c2', from: ['d2'] },
        { id: 'c3', from: ['d3'] },
      ],
      bank: qBank([...ds, ...cs], slips, 3),
      answer: [...ds, ...cs].map(qTex),
    };
  },
  solution: ({ f }) => {
    const ds = [1, 2, 3].map((p) => derivAt(f, p));
    return [
      { text: derivHint(f) },
      { tex: `f'(0) = ${qTex(ds[0])}, \\quad f''(0) = ${qTex(ds[1])}, \\quad f'''(0) = ${qTex(ds[2])}` },
      { text: 'Divide each by the factorial of its order:' },
      { tex: `a_{2} = \\frac{${qTex(ds[1])}}{2!} = ${qTex(coefOf(f, 2))}, \\quad a_{3} = \\frac{${qTex(ds[2])}}{3!} = ${qTex(coefOf(f, 3))}` },
    ];
  },
};

interface CoefTypedParams {
  n: number;
  /** Difficulty 1: the derivatives at 0 are given, f(0) first. */
  derivs?: number[];
  /** Difficulty 2: the function is given and the learner differentiates. */
  f?: Fn;
}

function typedCoef({ n, derivs, f }: CoefTypedParams): Q {
  return derivs ? q(derivs[n], fact(n)) : coefOf(f!, n);
}

function typedDeriv({ n, derivs, f }: CoefTypedParams, p = n): Q {
  return derivs ? q(derivs[p]) : derivAt(f!, p);
}

/** Expression: one coefficient, from given derivatives or from the function. */
const coefTyped: Generator<CoefTypedParams> = {
  id: 'ser-coef-typed',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      for (;;) {
        const derivs = Array.from({ length: 5 }, () => nonZero(rng, -12, 12));
        const n = rng.int(2, 4);
        // A multiple of n! would make the division a formality.
        if (derivs[n] % fact(n) === 0) continue;
        return { n, derivs };
      }
    }
    for (;;) {
      const base = rng.pick<Base>(['exp', 'sin', 'cos', 'ln', 'geo', 'pow']);
      const f = fnOf(base, nonZero(rng, -3, 3), { scale: nonZero(rng, -3, 3), index: base === 'pow' ? rng.int(4, 6) : 0 });
      const n = rng.int(2, 5);
      const c = coefOf(f, n);
      if (isZero(c) || Math.abs(val(derivAt(f, n))) > 1000) continue;
      return { n, f };
    }
  },
  render: (params): Slide => {
    const { n, derivs, f } = params;
    const given = derivs
      ? derivs.map((d, p) => `$${derivName(p)} = ${d}$`).join(', ')
      : '';
    return {
      kind: 'expression',
      prompt: derivs
        ? [
            say(`A function has ${given}.`),
            say(`Its Maclaurin series is $a_{0} + a_{1}x + a_{2}x^{2} + \\cdots$. Find $a_{${n}}$.`),
          ]
        : [say(`Find the coefficient of $x^{${n}}$ in the Maclaurin series of $f(x) = ${fnTex(f!)}$.`)],
      lead: `a_{${n}} =`,
      keypad: FRACTION_KEYS,
      answer: qAns(typedCoef(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { n, f } = params;
    const d = typedDeriv(params);
    const steps: SolutionStep[] = [{ text: `The coefficient of $x^{${n}}$ is $\\frac{${derivName(n)}}{${n}!}$.` }];
    if (f) steps.push({ text: derivHint(f) });
    steps.push({ tex: `a_{${n}} = \\frac{${qTex(d)}}{${fact(n)}} = ${qTex(typedCoef(params))}` });
    return steps;
  },
  choices: (params) => {
    const { n } = params;
    const d = typedDeriv(params);
    return qChoices(
      typedCoef(params),
      [d, div(d, q(n)), div(typedDeriv(params, n - 1), q(fact(n - 1))), neg(typedCoef(params))],
      mix(n, d.n, d.d, params.derivs ? params.derivs[0] : 0),
    );
  },
};

interface FirstTermsParams {
  /** Difficulty 1: f(0) to f'''(0), given. */
  derivs?: number[];
  f?: Fn;
}

function firstTerms({ derivs, f }: FirstTermsParams): Term[] {
  if (derivs) return derivs.map((d, p) => ({ c: q(d, fact(p)), p }));
  return termsOf(f!, 4, 6);
}

/** Tiles: the first four terms of the series, from derivatives or from the function. */
const firstTermsTiles: Generator<FirstTermsParams> = {
  id: 'ser-first-terms-tiles',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      for (;;) {
        const derivs = [nonZero(rng, -6, 6), nonZero(rng, -6, 6), nonZero(rng, -8, 8), nonZero(rng, -12, 12)];
        // The last two should need dividing, or the factorials go unused.
        if (derivs[2] % 2 === 0 && derivs[3] % 6 === 0) continue;
        return { derivs };
      }
    }
    for (;;) {
      const base = rng.pick<Base>(['exp', 'ln', 'geo', 'pow', 'cos']);
      const f = fnOf(base, nonZero(rng, -3, 3), { scale: nonZero(rng, -2, 3), index: base === 'pow' ? rng.int(4, 6) : 0 });
      if (termsOf(f, 4, 6).length < 4) continue;
      return { f };
    }
  },
  render: (params): Slide => {
    const terms = firstTerms(params);
    const answer = terms.map((t, i) => (i === 0 ? leadTile(t.c, t.p) : signedMono(t.c, t.p)));
    const slips: string[] = [];
    for (const [i, t] of terms.entries()) {
      const wrong: Term[] = params.derivs
        ? [
            { c: q(params.derivs[t.p]), p: t.p },
            { c: neg(t.c), p: t.p },
            { c: q(params.derivs[t.p], Math.max(1, t.p)), p: t.p },
          ]
        : termSlips(params.f!, t);
      for (const s of wrong) {
        if (isZero(s.c)) continue;
        slips.push(i === 0 ? leadTile(s.c, s.p) : signedMono(s.c, s.p));
      }
    }
    const prompt = params.derivs
      ? [
          say(
            `A function has ${params.derivs.map((d, p) => `$${derivName(p)} = ${d}$`).join(', ')}. Complete the start of its Maclaurin series.`,
          ),
        ]
      : [say('Complete the first four terms of the Maclaurin series of'), show(`f(x) = ${fnTex(params.f!)}`)];
    return {
      kind: 'tiles',
      prompt,
      template: `f(x) = ${answer.map((_, i) => `{${i}}`).join(' ')} + \\cdots`,
      bank: termBank(answer, slips, 4),
      answer,
    };
  },
  solution: (params) => {
    const terms = firstTerms(params);
    const steps: SolutionStep[] = [{ text: 'Each coefficient is the derivative at $0$ divided by the factorial of its order:' }];
    if (params.f) steps.push({ text: derivHint(params.f) });
    steps.push({ tex: terms.map((t) => `a_{${t.p}} = \\frac{${qTex(mul(t.c, q(fact(t.p))))}}{${t.p}!} = ${qTex(t.c)}`).join(', \\quad ') });
    steps.push({ tex: `f(x) = ${seriesTex(terms)}` });
    return steps;
  },
};

type Rough = 'ln' | 'recip' | 'sqrt' | 'abs' | 'cbrt' | 'root32';

interface WhichParams {
  /** The well-behaved part, if any. */
  good?: Fn;
  /** A part with no Maclaurin series, if any. */
  rough?: Rough;
  a: number;
  shift: number;
}

function roughTex(kind: Rough, a: number): string {
  switch (kind) {
    case 'ln':
      return `\\ln ${a === 1 ? '' : a}x`;
    case 'recip':
      return `\\frac{${a}}{x}`;
    case 'sqrt':
      return `${lead(a)}\\sqrt{x}`;
    case 'abs':
      return `${lead(a)}|x|`;
    case 'cbrt':
      return `${lead(a)}\\sqrt[3]{x}`;
    case 'root32':
      return `${lead(a)}x^{\\frac{3}{2}}`;
  }
}

const whichTex = ({ good, rough, a, shift }: WhichParams): string =>
  sumTex([...(good ? [fnTex(good)] : []), ...(rough ? [roughTex(rough, a)] : []), `${shift}`]);

/** f(0) for a function with a series. */
const whichConst = ({ good, shift }: WhichParams): number => shift + (good ? val(coefOf(good, 0)) : 0);

/** Flow: does f have a Maclaurin series, and if so what does it start with? */
const whichFlow: Generator<WhichParams> = {
  id: 'ser-which-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const good = () => {
      const base = rng.pick<Base>(['exp', 'cos', 'geo', 'pow', 'sin', 'ln']);
      return fnOf(base, nonZero(rng, -3, 3), { scale: hard ? nonZero(rng, -4, 4) : rng.int(1, 4), index: base === 'pow' ? rng.int(2, 4) : 0 });
    };
    const rough = () => rng.pick<Rough>(['ln', 'recip', 'sqrt', 'abs', 'cbrt', 'root32']);
    const shift = rng.int(-4, 4);
    const a = rng.int(1, 4);
    if (rng.chance(0.55)) return { good: good(), a, shift };
    // At difficulty 2 the rough part hides beside a well-behaved one.
    return hard ? { good: good(), rough: rough(), a, shift } : { rough: rough(), a, shift };
  },
  render: (params): Slide => {
    const c = whichConst(params);
    const scale = params.good?.scale ?? 1;
    const wrong = [params.shift, c + scale, c - scale, -c, c + 1, c - 1].filter((v, i, all) => v !== c && all.indexOf(v) === i);
    const values = turned([c, wrong[0], wrong[1]], mix(c, params.shift, scale, params.a));
    const answer = params.rough === 'ln' || params.rough === 'recip' ? ['No'] : params.rough ? ['Yes', 'No'] : ['Yes', 'Yes', `$${c}$`];
    return {
      kind: 'flow',
      prompt: [say('Decide whether this function has a Maclaurin series, and if it does, what the series starts with.')],
      subject: `f(x) = ${whichTex(params)}`,
      steps: [
        {
          id: 'defined',
          ask: 'Is $f(0)$ defined?',
          branches: [
            { label: 'Yes', to: 'derivs' },
            { label: 'No', outcome: 'Then there is no Maclaurin series: it would have to start with $f(0)$.' },
          ],
        },
        {
          id: 'derivs',
          ask: "Are $f'(0)$, $f''(0)$, $f'''(0)$ and all the rest defined?",
          branches: [
            { label: 'Yes', to: 'const' },
            { label: 'No', outcome: 'Then there is no Maclaurin series: every coefficient needs a derivative at $0$.' },
          ],
        },
        {
          id: 'const',
          ask: 'Then it has a Maclaurin series. What is its constant term?',
          branches: values.map((v) => ({ label: `$${v}$`, outcome: `The series starts $f(x) = ${v} + \\cdots$.` })),
        },
      ],
      answer,
    };
  },
  solution: (params) => {
    const { rough } = params;
    if (rough === 'ln' || rough === 'recip') {
      return [{ text: `$${roughTex(rough, params.a)}$ has no value at $x = 0$, so $f(0)$ is undefined and there is no Maclaurin series.` }];
    }
    if (rough) {
      return [
        { text: `$f(0)$ is defined, but $${roughTex(rough, params.a)}$ has a vertical tangent or a corner at $0$, so one of its derivatives there is undefined.` },
        { text: 'A Maclaurin series needs every derivative at $0$, so there is none.' },
      ];
    }
    const c = whichConst(params);
    return [
      { text: 'Every part is a standard function that can be differentiated as often as you like at $0$, so there is a Maclaurin series.' },
      { text: `Its constant term is $f(0)$: put $x = 0$ in, remembering $e^{0} = \\cos 0 = 1$ and $\\sin 0 = \\ln 1 = 0$.` },
      { tex: `f(0) = ${c}` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 2: the series for e^x
 * ================================================================ */

const EXP_EASY_K = [-1, 2, -2, 3, -3];
const EXP_HARD_K = [q(1, 2), q(-1, 2), q(3, 2), q(-3, 2), q(1, 3), q(-1, 3), q(2), q(-2), q(-3)];

interface ExpTilesParams {
  f: Fn;
  count: number;
}

/** Tiles: the terms of a e^{kx} after the constant. */
const expTiles: Generator<ExpTilesParams> = {
  id: 'ser-exp-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const k = hard ? rng.pick(EXP_HARD_K) : q(rng.pick(EXP_EASY_K));
    return { f: fnOf('exp', k, { scale: rng.int(1, hard ? 4 : 3) }), count: hard ? 4 : rng.int(3, 4) };
  },
  render: ({ f, count }): Slide => {
    const terms = termsOf(f, count + 1).slice(1);
    const answer = terms.map((t) => signedMono(t.c, t.p));
    const slips = terms.flatMap((t) => termSlips(f, t)).map((s) => signedMono(s.c, s.p));
    return {
      kind: 'tiles',
      prompt: [say('Use the series for $e^{u}$ to complete the Maclaurin series of'), show(`f(x) = ${fnTex(f)}`)],
      template: `f(x) = ${f.scale} ${terms.map((_, i) => `{${i}}`).join(' ')} + \\cdots`,
      bank: termBank(answer, slips, 4),
      answer,
    };
  },
  solution: ({ f, count }) => {
    const u = uTex(f.k);
    const terms = termsOf(f, count + 1);
    return [
      { text: `Put $u = ${u}$ into $e^{u} = 1 + u + \\frac{u^{2}}{2!} + \\frac{u^{3}}{3!} + \\cdots$. Each power of $u$ raises $${qTex(f.k)}$ to that power too.` },
      { tex: `e^{${u}} = 1 + (${u}) + \\frac{(${u})^{2}}{2!} + \\cdots` },
      ...(f.scale === 1 ? [] : [{ text: `Then multiply every term by $${f.scale}$.` }]),
      { tex: `${fnTex(f)} = ${seriesTex(terms)}` },
    ];
  },
};

interface ExpStepsParams {
  k: Q;
  n: number;
  a: number;
}

/** `(k)^{n}` as a token: brackets only where the base needs them. */
const powerToken = (k: Q, n: number): string => (k.n > 0 && k.d === 1 ? `${k.n}^{${n}}` : `(${qTex(k)})^{${n}}`);

/** Steps: the coefficient a k^n / n!, one piece at a time. */
const expSteps: Generator<ExpStepsParams> = {
  id: 'ser-exp-steps',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      return { a: rng.int(2, 4), k: rng.pick([q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2), q(3, 2)]), n: rng.int(3, 5) };
    }
    for (;;) {
      const k = q(rng.pick([2, -2, 3, -3, 4, -4]));
      const n = rng.int(2, 6);
      if (n === 6 && Math.abs(k.n) > 3) continue;
      return { a: 1, k, n };
    }
  },
  render: ({ k, n, a }): Slide => {
    const kn = pow(k, n);
    const nf = q(fact(n));
    const coef = mul(q(a), div(kn, nf));
    const knSlips = [qTex(mul(k, q(n))), qTex(neg(kn)), qTex(pow(k, n - 1))];
    const nfSlips = [`${n}`, `${fact(n - 1)}`, `${fact(n + 1)}`];
    const prompt = [
      say(`The $x^{${n}}$ term of $${fnTex(fnOf('exp', k, { scale: a }))}$ is $${lead(a)}\\frac{(${uTex(k)})^{${n}}}{${n}!}$. Work out its coefficient: tap the part to do next, then choose what it comes to.`),
    ];
    if (a === 1) {
      return {
        kind: 'steps',
        prompt,
        start: [powerToken(k, n), '\\div', `${n}!`],
        reductions: [
          { span: [0, 1], value: qTex(kn), bank: stepBank(qTex(kn), ...knSlips) },
          { span: [2, 3], value: `${fact(n)}`, bank: stepBank(`${fact(n)}`, ...nfSlips) },
          { span: [0, 3], operator: 1, value: qTex(coef), bank: stepBank(qTex(coef), qTex(div(kn, q(n))), qTex(neg(coef)), qTex(mul(kn, nf))) },
        ],
      };
    }
    const top = mul(q(a), kn);
    return {
      kind: 'steps',
      prompt,
      start: [`${a}`, '\\times', powerToken(k, n), '\\div', `${n}!`],
      reductions: [
        { span: [2, 3], value: qTex(kn), bank: stepBank(qTex(kn), ...knSlips) },
        { span: [4, 5], value: `${fact(n)}`, bank: stepBank(`${fact(n)}`, ...nfSlips) },
        { span: [0, 3], operator: 1, value: qTex(top), bank: stepBank(qTex(top), qTex(add(q(a), kn)), qTex(neg(top)), qTex(mul(q(a + 1), kn))) },
        { span: [0, 3], operator: 1, value: qTex(coef), bank: stepBank(qTex(coef), qTex(div(top, q(n))), qTex(neg(coef)), qTex(div(kn, nf))) },
      ],
    };
  },
  solution: ({ k, n, a }) => {
    const kn = pow(k, n);
    return [
      { text: `Put $u = ${uTex(k)}$ into the $\\frac{u^{${n}}}{${n}!}$ term: the $${qTex(k)}$ is raised to the power $${n}$ as well as the $x$.` },
      { tex: `${powerToken(k, n)} = ${qTex(kn)}, \\quad ${n}! = ${fact(n)}` },
      { tex: `${a === 1 ? '' : `${a} \\times `}\\frac{${qTex(kn)}}{${fact(n)}} = ${qTex(mul(q(a), div(kn, q(fact(n)))))}` },
    ];
  },
};

interface ExpTermParams {
  f: Fn;
  n: number;
}

/** Expression: the x^n term of a e^{kx}, typed. */
const expTerm: Generator<ExpTermParams> = {
  id: 'ser-exp-term',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const k = rng.pick([q(1, 2), q(-1, 2), q(3, 2), q(-3, 2), q(1, 3), q(-2, 3), q(2), q(-2)]);
      return { f: fnOf('exp', k, { scale: nonZero(rng, -3, 3) }), n: rng.int(3, 5) };
    }
    return { f: fnOf('exp', nonZero(rng, -3, 3), { scale: rng.int(1, 3) }), n: rng.int(2, 4) };
  },
  render: ({ f, n }): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the term in $x^{${n}}$ in the Maclaurin series of $f(x) = ${fnTex(f)}$: the coefficient and the power of $x$ together.`)],
    lead: `\\text{the } x^{${n}} \\text{ term} =`,
    keypad: ALGEBRA_KEYS,
    answer: monoAns(coefOf(f, n), n),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ f, n }) => {
    const u = uTex(f.k);
    return [
      { text: `The $u^{${n}}$ term of $e^{u}$ is $\\frac{u^{${n}}}{${n}!}$. Put $u = ${u}$:` },
      { tex: `${lead(f.scale)}\\frac{(${u})^{${n}}}{${n}!} = ${lead(f.scale)}\\frac{${qTex(pow(f.k, n))}x^{${n}}}{${fact(n)}} = ${monoTex(coefOf(f, n), n)}` },
    ];
  },
  choices: ({ f, n }) => {
    const c = coefOf(f, n);
    const noFact = mul(q(f.scale), pow(f.k, n));
    return qChoices(c, [noFact, mul(q(f.scale), div(f.k, q(fact(n)))), mul(q(f.scale), div(pow(f.k, n), q(n)))], saltOf(f, n), (v) => monoTex(v, n), (v) => monoAns(v, n));
  },
};

interface ExpSliderParams {
  k: number;
  deg: number;
  a: number;
}

const SLIDER_LO = -3;
const SLIDER_HI = 12;

const expPoly = ({ k, deg }: { k: number; deg: number }): Term[] => termsOf(fnOf('exp', k), deg + 1, deg);

/** P(a) exactly, with a on the half-lattice. */
function expPolyAt(params: ExpSliderParams): Q {
  const x = q(Math.round(params.a * 2), 2);
  return expPoly(params).reduce((total, t) => add(total, mul(t.c, pow(x, t.p))), ZERO);
}

/** Every (k, degree, a) whose value lands on the slider's half steps, inside the picture. */
const SLIDER_CASES: ExpSliderParams[] = (() => {
  const out: ExpSliderParams[] = [];
  for (const k of [1, -1, 2, -2]) {
    for (let deg = 1; deg <= 3; deg += 1) {
      for (let twice = -6; twice <= 6; twice += 1) {
        if (twice === 0) continue;
        const params = { k, deg, a: twice / 2 };
        const v = expPolyAt(params);
        if ((v.d !== 1 && v.d !== 2) || val(v) <= SLIDER_LO || val(v) >= SLIDER_HI) continue;
        // The two curves have to be apart where the line is, or there is nothing to see.
        if (Math.abs(val(v) - Math.exp(k * params.a)) < 0.3) continue;
        out.push(params);
      }
    }
  }
  return out;
})();

/** Slider: the height of a Maclaurin polynomial of e^{kx}, against the curve itself. */
const expSlider: Generator<ExpSliderParams> = {
  id: 'ser-exp-slider',
  sample: (rng, difficulty) => {
    const pool = SLIDER_CASES.filter((c) => (difficulty > 1 ? c.deg >= 2 || Math.abs(c.k) === 2 : c.deg <= 2 && Math.abs(c.k) === 1));
    return rng.pick(pool);
  },
  render: (params): Slide => {
    const { k, a } = params;
    const terms = expPoly(params);
    const poly = (x: number) => terms.reduce((total, t) => total + val(t.c) * x ** t.p, 0);
    const f = fnOf('exp', k);
    return {
      kind: 'slider',
      prompt: [
        say(
          `The dashed curve is $y = ${fnTex(f)}$ and the solid one its Maclaurin polynomial $P(x) = ${seriesTex(terms, 'x', false)}$. Slide the line to the height of $P$ at $x = ${dec(a)}$.`,
        ),
      ],
      min: SLIDER_LO,
      max: SLIDER_HI,
      step: 0.5,
      answer: val(expPolyAt(params)),
      readout: `P(${dec(a)}) = {v}`,
      figure: {
        svg: plotSvg({
          xMin: -3,
          xMax: 3,
          yMin: SLIDER_LO,
          yMax: SLIDER_HI,
          curves: [
            { f: (x) => Math.exp(k * x), dashed: true },
            { f: poly, accent: true },
          ],
          verticals: [{ x: a, dashed: true }],
          label: `The curve y = e to the ${k}x, dashed, and its Maclaurin polynomial of degree ${params.deg}, with a line at x = ${dec(a)}`,
        }),
        ...markerWindow(SLIDER_LO, SLIDER_HI, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { k, a } = params;
    const terms = expPoly(params);
    const x = q(Math.round(a * 2), 2);
    return [
      { text: `Put $x = ${dec(a)}$ into each term of $P$:` },
      { tex: `P(${dec(a)}) = ${terms.map((t) => inLine(mul(t.c, pow(x, t.p)))).join(' + ')} = ${qTex(expPolyAt(params))}` },
      { text: `The curve itself is at $${fnTex(fnOf('exp', k))} \\approx ${dec(Math.round(Math.exp(k * a) * 100) / 100)}$ there: the gap is what the missing terms add up to.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: sin x and cos x
 * ================================================================ */

interface TrigParams {
  f: Fn;
}

const TRIG_HARD_K = [q(1, 2), q(-1, 2), q(3, 2), q(2), q(-2), q(3), q(-3), q(1, 3)];

/** A sine or cosine, easy or hard. */
function sampleTrig(rng: Rng, hard: boolean): Fn {
  const base = rng.pick<Base>(['sin', 'cos']);
  return hard
    ? fnOf(base, rng.pick(TRIG_HARD_K), { scale: nonZero(rng, -3, 3) })
    : fnOf(base, nonZero(rng, -3, 3), { scale: rng.int(1, 3) });
}

/** Tiles: the first three terms of a sin kx or a cos kx. */
const trigTiles: Generator<TrigParams> = {
  id: 'ser-trig-tiles',
  sample: (rng, difficulty) => ({ f: sampleTrig(rng, difficulty > 1) }),
  render: ({ f }): Slide => {
    const terms = termsOf(f, 3);
    const answer = terms.map((t, i) => (i === 0 ? leadTile(t.c, t.p) : signedMono(t.c, t.p)));
    const other = fnOf(f.base === 'sin' ? 'cos' : 'sin', f.k, { scale: f.scale });
    const slips: string[] = [];
    for (const [i, t] of terms.entries()) {
      for (const s of [...termSlips(f, t), { c: abs(t.c), p: t.p }]) slips.push(i === 0 ? leadTile(s.c, s.p) : signedMono(s.c, s.p));
    }
    for (const t of termsOf(other, 3).slice(1)) slips.push(signedMono(t.c, t.p));
    return {
      kind: 'tiles',
      prompt: [say('Complete the first three terms of the Maclaurin series of'), show(`f(x) = ${fnTex(f)}`)],
      template: 'f(x) = {0} {1} {2} + \\cdots',
      bank: termBank(answer, slips, 4),
      answer,
    };
  },
  solution: ({ f }) => [
    { text: `Put $u = ${uTex(f.k)}$ into the standard series. The signs alternate, and a negative $u$ turns over every odd power as well.` },
    { tex: standardTex(f.base) },
    { tex: `${fnTex(f)} = ${seriesTex(termsOf(f, 3))}` },
  ],
};

interface TrigSignParams {
  f: Fn;
  n: number;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th'];

/** Flow: does the series have an x^n term, which term is it, and what sign? */
const trigSignFlow: Generator<TrigSignParams> = {
  id: 'ser-trig-sign-flow',
  sample: (rng, difficulty) => {
    const base = rng.pick<Base>(['sin', 'cos']);
    const k = nonZero(rng, -3, 3);
    const f = fnOf(base, k, { scale: difficulty > 1 ? nonZero(rng, -3, 3) : 1 });
    return { f, n: rng.int(1, 7) };
  },
  render: ({ f, n }): Slide => {
    const c = coefOf(f, n);
    const place = f.base === 'sin' ? (n + 1) / 2 : n / 2 + 1;
    const ends = (label: 'Positive' | 'Negative') => ({
      label,
      outcome: `So the $x^{${n}}$ term is ${label.toLowerCase()}.`,
    });
    return {
      kind: 'flow',
      prompt: [say(`Decide the sign of the $x^{${n}}$ term in the Maclaurin series of this function, without writing the series out.`)],
      subject: `f(x) = ${fnTex(f)}`,
      steps: [
        {
          id: 'has',
          ask: `Does the series have an $x^{${n}}$ term at all?`,
          branches: [
            { label: 'Yes', to: 'which' },
            { label: 'No', outcome: `Then the coefficient of $x^{${n}}$ is $0$.` },
          ],
        },
        {
          id: 'which',
          ask: 'Counting from the start of the series, which non-zero term is it?',
          branches: ORDINALS.map((label) => ({ label, to: 'sign' })),
        },
        {
          id: 'sign',
          ask: `So, allowing for the signs in $${fnTex(f)}$ itself, is the term positive or negative?`,
          branches: [ends('Positive'), ends('Negative')],
        },
      ],
      answer: isZero(c) ? ['No'] : ['Yes', ORDINALS[place - 1], c.n > 0 ? 'Positive' : 'Negative'],
    };
  },
  solution: ({ f, n }) => {
    const c = coefOf(f, n);
    if (isZero(c)) {
      return [{ text: `The series for $\\${f.base}$ has only ${f.base === 'sin' ? 'odd' : 'even'} powers, so there is no $x^{${n}}$ term.` }];
    }
    const place = f.base === 'sin' ? (n + 1) / 2 : n / 2 + 1;
    return [
      { text: `$\\${f.base}$ has only ${f.base === 'sin' ? 'odd' : 'even'} powers, so $x^{${n}}$ is the ${ORDINALS[place - 1]} term, and the signs go $+, -, +, -$ from the start.` },
      { text: `Then $(${qTex(f.k)})^{${n}}$ and the multiplier $${f.scale}$ bring their own signs:` },
      { tex: `${monoTex(c, n)}` },
    ];
  },
};

interface CycleParams {
  a: number;
  b: number;
  k: number;
}

const cycleTex = ({ a, b, k }: CycleParams): string => {
  const kx = k === 1 ? 'x' : `${k}x`;
  return sumTex([`${lead(a)}\\sin ${kx}`, `${lead(b)}\\cos ${kx}`]);
};

const cycleValues = ({ a, b, k }: CycleParams): number[] => [b, a * k, -b * k * k, -a * k ** 3, b * k ** 4];

/** Tree: the derivatives of a sin kx + b cos kx at 0, each two steps on -k^2 times the last. */
const trigCycleTree: Generator<CycleParams> = {
  id: 'ser-trig-cycle-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { a: nonZero(rng, hard ? -4 : -3, hard ? 4 : 3), b: nonZero(rng, hard ? -4 : -3, hard ? 4 : 3), k: hard ? rng.int(2, 3) : rng.int(1, 2) };
  },
  render: (params): Slide => {
    const { a, b, k } = params;
    const answer = cycleValues(params);
    const slips = [b * k * k, a * k ** 3, -a * k, a * k * k, -b * k ** 4, b * k ** 3, -b];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Fill in the derivatives of $f(x)$ at $x = 0$. Top row: $f(0)$ and $f'(0)$. Each row down is two derivatives on from the one above: $f''(0)$ and $f'''(0)$, then $f^{(4)}(0)$.`,
        ),
      ],
      expression: `f(x) = ${cycleTex(params)}`,
      nodes: [
        { id: 'd0', from: [] },
        { id: 'd1', from: [] },
        { id: 'd2', from: ['d0'] },
        { id: 'd3', from: ['d1'] },
        { id: 'd4', from: ['d2'] },
      ],
      bank: treeBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const [d0, d1, d2, d3, d4] = cycleValues(params);
    const { k } = params;
    return [
      { text: `At $0$, $\\sin$ is $0$ and $\\cos$ is $1$, so $f(0) = ${d0}$, and $f'(0) = ${d1}$ from the $\\cos$ that the $\\sin$ becomes.` },
      { text: `Differentiating twice turns $\\sin kx$ into $-k^{2}\\sin kx$ and the same for $\\cos$, so each derivative is $-${k * k}$ times the one two before it.` },
      { tex: `f''(0) = ${d2}, \\quad f'''(0) = ${d3}, \\quad f^{(4)}(0) = ${d4}` },
    ];
  },
};

/** Choice: which series is the series of a sin kx or a cos kx? */
const trigPick: Generator<TrigParams> = {
  id: 'ser-trig-pick',
  sample: (rng, difficulty) => ({ f: sampleTrig(rng, difficulty > 1) }),
  render: ({ f }): Slide => {
    const terms = termsOf(f, 3);
    const other = fnOf(f.base === 'sin' ? 'cos' : 'sin', f.k, { scale: f.scale });
    const noFactorial = terms.map((t) => ({ c: mul(q(f.scale), mul(pow(f.k, t.p), q(Math.sign(val(unitCoef(f.base, t.p)))))), p: t.p }));
    const allPlus = terms.map((t) => ({ c: mul(abs(t.c), q(Math.sign(f.scale))), p: t.p }));
    const unpowered = terms.map((t) => ({ c: mul(q(f.scale), mul(unitCoef(f.base, t.p), f.k)), p: t.p }));
    const opts = formChoices(
      seriesOption(terms),
      [seriesOption(allPlus), seriesOption(noFactorial), seriesOption(termsOf(other, 3)), seriesOption(unpowered)],
      saltOf(f),
    );
    return choiceSlide([say(`Which is the Maclaurin series of $${fnTex(f)}$?`)], opts);
  },
  solution: ({ f }) => [
    { text: `Start from the standard series and put in $u = ${uTex(f.k)}$. The $\\${f.base}$ series has only ${f.base === 'sin' ? 'odd' : 'even'} powers, and its signs alternate.` },
    { tex: standardTex(f.base) },
    { tex: `${fnTex(f)} = ${seriesTex(termsOf(f, 3))}` },
  ],
};

/* ================================================================
 * Level 1, lesson 4: ln(1 + x)
 * ================================================================ */

interface LogTilesParams {
  /** Difficulty 1: a ln(1 + kx). */
  f?: Fn;
  /** Difficulty 2: ln(a + bx) = ln a + ln(1 + (b/a)x). */
  a?: number;
  b?: number;
  count: number;
}

const logInner = ({ f, a, b }: LogTilesParams): Fn => f ?? fnOf('ln', q(b!, a!));

const logTilesTex = (params: LogTilesParams): string =>
  params.f ? fnTex(params.f) : `\\ln(${params.a} ${plus(uTex(q(params.b!)))})`;

/** Tiles: the series of a ln(1 + kx), or of ln(a + bx) with its ln a. */
const logTiles: Generator<LogTilesParams> = {
  id: 'ser-log-tiles',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      for (;;) {
        const a = rng.int(2, 5);
        const b = nonZero(rng, -3, 3);
        if (Math.abs(b) === a) continue;
        return { a, b, count: rng.int(3, 4) };
      }
    }
    const k = rng.pick([q(1), q(-1), q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2)]);
    return { f: fnOf('ln', k, { scale: rng.int(1, 3) }), count: rng.int(3, 4) };
  },
  render: (params): Slide => {
    const inner = logInner(params);
    const terms = termsOf(inner, params.count);
    const lnA = params.a ? [`\\ln ${params.a}`] : [];
    const answer = [...lnA, ...terms.map((t, i) => (i === 0 && !params.a ? leadTile(t.c, t.p) : signedMono(t.c, t.p)))];
    const slips: string[] = params.a ? [`\\ln ${Math.abs(params.b!)}`, '0'] : [];
    for (const [i, t] of terms.entries()) {
      const spell = (s: Term) => (i === 0 && !params.a ? leadTile(s.c, s.p) : signedMono(s.c, s.p));
      for (const s of termSlips(inner, t)) slips.push(spell(s));
      slips.push(spell({ c: abs(t.c), p: t.p }));
      if (params.a) slips.push(spell({ c: mul(unitCoef('ln', t.p), pow(q(params.b!), t.p)), p: t.p }));
    }
    return {
      kind: 'tiles',
      prompt: [
        say(params.a ? `Take out $\\ln ${params.a}$ first, then use the series for $\\ln(1 + u)$. Complete the Maclaurin series of` : 'Use the series for $\\ln(1 + u)$ to complete the Maclaurin series of'),
        show(`f(x) = ${logTilesTex(params)}`),
      ],
      template: `f(x) = ${answer.map((_, i) => `{${i}}`).join(' ')} + \\cdots`,
      bank: termBank(answer, slips, 4),
      answer,
    };
  },
  solution: (params) => {
    const inner = logInner(params);
    const u = uTex(inner.k);
    const steps: SolutionStep[] = [];
    if (params.a) {
      steps.push({ text: `Take out the constant: $${params.a} ${plus(uTex(q(params.b!)))} = ${params.a}(1 ${plus(u)})$, and the log of a product is a sum.` });
      steps.push({ tex: `${logTilesTex(params)} = \\ln ${params.a} + \\ln(1 ${plus(u)})` });
    }
    steps.push({ text: `Put $u = ${u}$ into $\\ln(1 + u) = u - \\frac{u^{2}}{2} + \\frac{u^{3}}{3} - \\cdots$: the denominators are $1, 2, 3, \\ldots$, not factorials.` });
    steps.push({ tex: `${logTilesTex(params)} = ${params.a ? `\\ln ${params.a} ` : ''}${params.a ? plus(seriesTex(termsOf(inner, params.count))) : seriesTex(termsOf(inner, params.count))}` });
    return steps;
  },
};

interface LogCoefParams {
  n: number;
  /** Difficulty 1: ln(1 + kx). */
  k?: number;
  /** Difficulty 2: ln((1 + ax)(1 + bx)), or ln((1 + ax)/(1 + bx)). */
  a?: number;
  b?: number;
  quotient?: boolean;
}

function logCoef({ n, k, a, b, quotient }: LogCoefParams): Q {
  if (k !== undefined) return coefOf(fnOf('ln', k), n);
  const first = coefOf(fnOf('ln', a!), n);
  const second = coefOf(fnOf('ln', b!), n);
  return quotient ? sub(first, second) : add(first, second);
}

const oneTex = (k: number): string => `1 ${plus(uTex(q(k)))}`;

function logCoefTex({ k, a, b, quotient }: LogCoefParams): string {
  if (k !== undefined) return `\\ln(${oneTex(k)})`;
  return quotient ? `\\ln\\frac{${oneTex(a!)}}{${oneTex(b!)}}` : `\\ln\\big((${oneTex(a!)})(${oneTex(b!)})\\big)`;
}

/** Expression: the coefficient of x^n in ln(1 + kx), or in a log of a product or quotient. */
const logCoefGen: Generator<LogCoefParams> = {
  id: 'ser-log-coef',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      for (;;) {
        const a = nonZero(rng, -3, 3);
        const b = nonZero(rng, -3, 3);
        const params = { n: rng.int(2, 4), a, b, quotient: rng.chance(0.5) };
        if (a === b || isZero(logCoef(params))) continue;
        return params;
      }
    }
    for (;;) {
      const k = nonZero(rng, -4, 4);
      const n = rng.int(2, 5);
      if (Math.abs(k) === 4 && n > 3) continue;
      return { n, k };
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the coefficient of $x^{${params.n}}$ in the Maclaurin series of $f(x) = ${logCoefTex(params)}$.`)],
    lead: `a_{${params.n}} =`,
    keypad: FRACTION_KEYS,
    answer: qAns(logCoef(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { n, k, a, b, quotient } = params;
    const term = (c: number) => `\\frac{${n % 2 === 1 ? '' : '-'}(${c})^{${n}}}{${n}}`;
    if (k !== undefined) {
      return [
        { text: `The $u^{${n}}$ term of $\\ln(1 + u)$ is $${n % 2 === 1 ? '' : '-'}\\frac{u^{${n}}}{${n}}$. Put $u = ${uTex(q(k))}$:` },
        { tex: `${term(k)} = ${qTex(logCoef(params))}` },
      ];
    }
    return [
      { text: `Split the log first: $${logCoefTex(params)} = \\ln(${oneTex(a!)}) ${quotient ? '-' : '+'} \\ln(${oneTex(b!)})$.` },
      { text: `Each has $x^{${n}}$ coefficient $${n % 2 === 1 ? '' : '-'}\\frac{k^{${n}}}{${n}}$ for its own $k$:` },
      { tex: `${term(a!)} ${quotient ? '-' : '+'} ${term(b!)} = ${qTex(logCoef(params))}` },
    ];
  },
  choices: (params) => {
    const { n, k, a, b } = params;
    const correct = logCoef(params);
    const slips = k !== undefined
      ? [mul(pow(q(k), n), q(1, fact(n))), pow(q(k), n), q(n % 2 === 1 ? -1 : 1).n === 1 ? neg(correct) : div(pow(q(k), n), q(n))]
      : [coefOf(fnOf('ln', a!), n), mul(coefOf(fnOf('ln', a!), n), coefOf(fnOf('ln', b!), n)), params.quotient ? add(coefOf(fnOf('ln', a!), n), coefOf(fnOf('ln', b!), n)) : sub(coefOf(fnOf('ln', a!), n), coefOf(fnOf('ln', b!), n))];
    return qChoices(correct, slips, mix(n, k ?? 9, a ?? 0, b ?? 0, params.quotient ? 1 : 0));
  },
};

type ValidForm = 'ln+' | 'ln-' | 'geo-' | 'geo+';

interface ValidParams {
  form: ValidForm;
  k: number;
  /** The value of u = ±kx at the point asked about. */
  u: Q;
}

/** The function, and the u it is written in: ln(1 + u) or 1/(1 - u). */
function validFn({ form, k }: { form: ValidForm; k: number }): { tex: string; sign: number; ln: boolean } {
  const kx = uTex(q(k));
  switch (form) {
    case 'ln+':
      return { tex: `\\ln(1 + ${kx})`, sign: 1, ln: true };
    case 'ln-':
      return { tex: `\\ln(1 - ${kx})`, sign: -1, ln: true };
    case 'geo-':
      return { tex: `\\frac{1}{1 - ${kx}}`, sign: 1, ln: false };
    case 'geo+':
      return { tex: `\\frac{1}{1 + ${kx}}`, sign: -1, ln: false };
  }
}

const insideLn = (u: Q): boolean => val(u) > -1 && val(u) <= 1;
const insideGeo = (u: Q): boolean => Math.abs(val(u)) < 1;

const U_VALUES = [q(1, 2), q(-1, 2), q(1), q(-1), q(3, 2), q(-3, 2), q(2), q(-2), q(1, 3), q(-2, 3), q(2, 3), q(-1, 3)];

const RANGE_LABELS = ['$-1 < u \\le 1$', '$-1 \\le u < 1$', '$-1 < u < 1$'];

/** Flow: is the series valid at this x? Range of u, then u itself, then inside or not. */
const logValidFlow: Generator<ValidParams> = {
  id: 'ser-log-valid-flow',
  sample: (rng, difficulty) => ({
    form: rng.pick<ValidForm>(difficulty > 1 ? ['ln+', 'ln-', 'geo-', 'geo+'] : ['ln+', 'geo-']),
    k: rng.int(1, 3),
    u: rng.pick(U_VALUES),
  }),
  render: (params): Slide => {
    const { u, k } = params;
    const { tex, sign, ln } = validFn(params);
    const x = div(u, q(sign * k));
    const uLabels = [u, neg(u), x, mul(u, q(2))]
      .filter((v, i, all) => all.findIndex((w) => eq(w, v)) === i)
      .slice(0, 3)
      .map((v) => `$${qTex(v)}$`);
    const ok = ln ? insideLn(u) : insideGeo(u);
    return {
      kind: 'flow',
      prompt: [
        say(
          `Write the function as ${ln ? '$\\ln(1 + u)$' : '$\\frac{1}{1 - u}$'} for some $u$, and decide whether its series can be used at $x = ${qTex(x)}$.`,
        ),
      ],
      subject: `f(x) = ${tex}, \\quad x = ${qTex(x)}`,
      steps: [
        {
          id: 'range',
          ask: `Which values of $u$ does the series for ${ln ? '$\\ln(1 + u)$' : '$\\frac{1}{1 - u}$'} hold for?`,
          branches: turned(RANGE_LABELS, mix(k, u.n, u.d)).map((label) => ({ label, to: 'u' })),
        },
        {
          id: 'u',
          ask: `What is $u$ at $x = ${qTex(x)}$?`,
          branches: turned(uLabels, mix(u.n, u.d, k, 7)).map((label) => ({ label, to: 'inside' })),
        },
        {
          id: 'inside',
          ask: 'Is that value of $u$ inside the range?',
          branches: [
            { label: 'Yes', outcome: 'Then the series converges to $f(x)$ there.' },
            { label: 'No', outcome: 'Then the series does not converge to $f(x)$ there.' },
          ],
        },
      ],
      answer: [RANGE_LABELS[ln ? 0 : 2], `$${qTex(u)}$`, ok ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { u, k } = params;
    const { tex, sign, ln } = validFn(params);
    const x = div(u, q(sign * k));
    const ok = ln ? insideLn(u) : insideGeo(u);
    return [
      { text: `$${tex}$ is ${ln ? '$\\ln(1 + u)$' : '$\\frac{1}{1 - u}$'} with $u = ${uTex(q(sign * k))}$, and that series holds for ${ln ? '$-1 < u \\le 1$' : '$-1 < u < 1$'}.` },
      { tex: `u = ${sign * k === 1 ? '' : sign * k === -1 ? '-' : sign * k}\\left(${qTex(x)}\\right) = ${qTex(u)}` },
      { text: ok ? 'That is inside the range, so the series can be used there.' : `That is outside the range${ln && eq(u, q(-1)) ? ' (the end $u = -1$ is not included, since $\\ln 0$ is undefined)' : ''}, so the series cannot be used there.` },
    ];
  },
};

type RangeForm = 'ln' | 'geo' | 'pow' | 'lnShift';

interface RangeParams {
  form: RangeForm;
  k: Q;
  /** For lnShift: ln(a + bx) with k = b/a. */
  a: number;
}

interface Interval {
  lo: Q;
  hi: Q;
  loIn: boolean;
  hiIn: boolean;
}

/** Where kx sits in -1 < u <= 1 (ln) or -1 < u < 1 (geo), as an interval in x. */
function rangeOf(form: RangeForm, k: Q): Interval | undefined {
  if (form === 'pow') return undefined;
  const r = div(ONE, abs(k));
  const ln = form === 'ln' || form === 'lnShift';
  if (!ln) return { lo: neg(r), hi: r, loIn: false, hiIn: false };
  return k.n > 0 ? { lo: neg(r), hi: r, loIn: false, hiIn: true } : { lo: neg(r), hi: r, loIn: true, hiIn: false };
}

const rangeTex = ({ lo, hi, loIn, hiIn }: Interval): string =>
  `${qTex(lo)} ${loIn ? '\\le' : '<'} x ${hiIn ? '\\le' : '<'} ${qTex(hi)}`;

const ALL_X = '\\text{all real } x';

function rangeFnTex({ form, k, a }: RangeParams): string {
  if (form === 'lnShift') return `\\ln(${a} ${plus(uTex(mul(k, q(a))))})`;
  if (form === 'pow') return fnTex(fnOf('pow', k, { index: 4 }));
  return fnTex(fnOf(form, k));
}

const RANGE_K = [q(1), q(-1), q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2), q(1, 3), q(-1, 3), q(3, 2), q(-3, 2)];

/** Choice: the values of x for which a series is valid. */
const logRange: Generator<RangeParams> = {
  id: 'ser-log-range',
  sample: (rng, difficulty) => {
    if (difficulty > 1 && rng.chance(0.5)) {
      for (;;) {
        const a = rng.int(2, 4);
        const b = nonZero(rng, -3, 3);
        if (Math.abs(b) === a) continue;
        return { form: 'lnShift', k: q(b, a), a };
      }
    }
    return { form: rng.pick<RangeForm>(['ln', 'ln', 'geo', 'geo', 'pow']), k: rng.pick(RANGE_K), a: 1 };
  },
  render: (params): Slide => {
    const { form, k } = params;
    const right = rangeOf(form, k);
    const r = div(ONE, abs(k));
    const slips: Interval[] = [
      { lo: neg(r), hi: r, loIn: false, hiIn: false },
      { lo: neg(r), hi: r, loIn: false, hiIn: true },
      { lo: neg(r), hi: r, loIn: true, hiIn: false },
      { lo: neg(abs(k)), hi: abs(k), loIn: false, hiIn: right?.hiIn ?? false },
      { lo: q(-1), hi: ONE, loIn: false, hiIn: right?.hiIn ?? false },
    ];
    const key = (i: Interval) => `${i.lo.n}/${i.lo.d} ${i.loIn} ${i.hi.n}/${i.hi.d} ${i.hiIn}`;
    const correct = right ? { tex: rangeTex(right), key: key(right) } : { tex: ALL_X, key: 'all' };
    const opts = formChoices(
      correct,
      [...slips.map((s) => ({ tex: rangeTex(s), key: key(s) })), { tex: ALL_X, key: 'all' }],
      mix(k.n, k.d, params.a, ['ln', 'geo', 'pow', 'lnShift'].indexOf(form)),
    );
    return choiceSlide([say(`For which values of $x$ is the Maclaurin series of $${rangeFnTex(params)}$ valid?`)], opts);
  },
  solution: (params) => {
    const { form, k, a } = params;
    const right = rangeOf(form, k);
    if (!right) {
      return [
        { text: `$${rangeFnTex(params)}$ is a polynomial: its expansion stops after the $x^{4}$ term, so it is exact for every $x$.` },
        { tex: ALL_X },
      ];
    }
    const steps: SolutionStep[] = [];
    if (form === 'lnShift') steps.push({ tex: `\\ln(${a} ${plus(uTex(mul(k, q(a))))}) = \\ln ${a} + \\ln(1 ${plus(uTex(k))})` });
    const ln = form !== 'geo';
    steps.push({ text: `The series in $u = ${uTex(k)}$ holds for ${ln ? '$-1 < u \\le 1$' : '$-1 < u < 1$'}. Divide through by $${qTex(k)}$${k.n < 0 ? ', which is negative, so the inequalities turn round' : ''}:` });
    steps.push({ tex: rangeTex(right) });
    return steps;
  },
};

/* ================================================================
 * Level 1, lesson 5: new series from old
 * ================================================================ */

interface SubParams {
  f: Fn;
  /** Multiply the whole series by x^r. */
  r: number;
}

const SUB_CAP = 7;

/** The first three terms of x^r f(x). */
function subTerms({ f, r }: SubParams): Term[] {
  return termsOf(f, 3, SUB_CAP - r).map((t) => ({ c: t.c, p: t.p + r }));
}

function subTex({ f, r }: SubParams): string {
  const x = r === 0 ? '' : r === 1 ? 'x' : `x^{${r}}`;
  if (r === 0) return fnTex(f);
  if (f.base === 'geo') return `\\frac{${lead(f.scale)}${x}}{1 ${minus(uTex(f.k, f.m))}}`;
  return `${lead(f.scale)}${x}${baseTex(f.base, uTex(f.k, f.m), f.index)}`;
}

/** Tiles: a standard series with c x^m put in for u, and at difficulty 2 multiplied by x. */
const subTiles: Generator<SubParams> = {
  id: 'ser-sub-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        const base = rng.pick<Base>(['exp', 'ln', 'geo', 'sin', 'cos', 'pow']);
        const m = base === 'sin' || base === 'cos' ? 1 : rng.pick([2, 3]);
        const k = rng.pick([q(2), q(-2), q(3), q(-1), q(1, 2), q(-1, 2), q(3, 2)]);
        const params = { f: fnOf(base, k, { m, index: base === 'pow' ? rng.int(3, 4) : 0 }), r: m === 1 ? 1 : rng.int(0, 1) };
        if (subTerms(params).length === 3) return params;
        continue;
      }
      const base = rng.pick<Base>(['exp', 'ln', 'geo', 'pow']);
      const k = rng.pick([q(1), q(-1), q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2)]);
      const params = { f: fnOf(base, k, { m: 2, index: base === 'pow' ? rng.int(3, 4) : 0 }), r: 0 };
      if (subTerms(params).length === 3) return params;
    }
  },
  render: (params): Slide => {
    const { f, r } = params;
    const terms = subTerms(params);
    const answer = terms.map((t, i) => (i === 0 ? leadTile(t.c, t.p) : signedMono(t.c, t.p)));
    const slips: string[] = [];
    for (const [i, t] of terms.entries()) {
      const inner = { c: t.c, p: t.p - r };
      const wrong = [...termSlips(f, inner).map((s) => ({ c: s.c, p: s.p + r })), ...(r > 0 ? [inner] : []), { c: t.c, p: t.p + 1 }];
      for (const s of wrong) {
        if (isZero(s.c) || s.p < 0) continue;
        slips.push(i === 0 ? leadTile(s.c, s.p) : signedMono(s.c, s.p));
      }
    }
    const last = terms[terms.length - 1].p - r;
    return {
      kind: 'tiles',
      prompt: [
        say(`Put $u = ${uTex(f.k, f.m)}$ into the series${r > 0 ? ', then multiply by $x$,' : ''} to find the first three terms of $f(x) = ${subTex(params)}$.`),
        show(standardTex(f.base, f.index)),
      ],
      template: `f(x) = {0} {1} {2}${goesOn(f, last) ? ' + \\cdots' : ''}`,
      bank: termBank(answer, slips, 4),
      answer,
    };
  },
  solution: (params) => {
    const { f, r } = params;
    const u = uTex(f.k, f.m);
    const inner = termsOf(f, 3, SUB_CAP - r);
    const steps: SolutionStep[] = [
      { text: `Replace every $u$ with $${u}$: its coefficient is raised to the same power as the $x^{${f.m}}$, so $u^{j}$ becomes $(${qTex(f.k)})^{j}x^{${f.m}j}$.` },
      { tex: `${fnTex({ ...f, scale: 1 })} = ${seriesTex(inner)}` },
    ];
    if (r > 0) steps.push({ text: 'Multiplying by $x$ raises every power by one:' }, { tex: `${subTex(params)} = ${seriesTex(subTerms(params))}` });
    return steps;
  },
};

interface SubTreeParams {
  f: Fn;
  j: number;
}

/** Tree: two coefficients of f(c x^m), each as c^j times the coefficient of u^j. */
const subTree: Generator<SubTreeParams> = {
  id: 'ser-sub-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const base = rng.pick<Base>(hard ? ['exp', 'ln', 'geo', 'pow'] : ['exp', 'ln', 'geo']);
      const m = hard ? rng.pick([2, 3]) : 2;
      const k = hard ? rng.pick([q(1, 2), q(-1, 2), q(2, 3), q(-3, 2), q(-2), q(3)]) : rng.pick([q(2), q(-2), q(3), q(-3), q(-1), q(4)]);
      const j = m === 3 ? 1 : rng.int(1, 2);
      const f = fnOf(base, k, { m, index: base === 'pow' ? rng.int(3, 5) : 0 });
      if (isZero(coefOf(f, m * j)) || isZero(coefOf(f, m * (j + 1)))) continue;
      return { f, j };
    }
  },
  render: ({ f, j }): Slide => {
    const powers = [j, j + 1].map((i) => pow(f.k, i));
    const units = [j, j + 1].map((i) => unitCoef(f.base, i, f.index));
    const results = [j, j + 1].map((i) => coefOf(f, f.m * i));
    const answer = [powers[0], units[0], powers[1], units[1], ...results];
    const slips = [mul(f.k, q(j)), mul(f.k, units[0]), neg(results[0]), neg(results[1]), mul(f.k, units[1]), unitCoef(f.base, j + 2, f.index)];
    const u = uTex(f.k, f.m);
    return {
      kind: 'tree',
      prompt: [
        say(
          `For $f(x) = ${fnTex(f)}$, put $u = ${u}$ into the series for $${baseTex(f.base, 'u', f.index)}$. Top row, left to right: $(${qTex(f.k)})^{${j}}$, the coefficient of $u^{${j}}$, then the same two for $u^{${j + 1}}$. Underneath: the coefficients of $x^{${f.m * j}}$ and $x^{${f.m * (j + 1)}}$.`,
        ),
      ],
      expression: standardTex(f.base, f.index),
      nodes: [
        { id: 'p1', from: [] },
        { id: 'a1', from: [] },
        { id: 'p2', from: [] },
        { id: 'a2', from: [] },
        { id: 'r1', from: ['p1', 'a1'] },
        { id: 'r2', from: ['p2', 'a2'] },
      ],
      bank: qBank(answer, slips, 3),
      answer: answer.map(qTex),
    };
  },
  solution: ({ f, j }) => {
    const u = uTex(f.k, f.m);
    return [j, j + 1].map((i) => ({
      text: `$u^{${i}} = (${u})^{${i}} = ${monoTex(pow(f.k, i), f.m * i)}$, and its coefficient is $${qTex(unitCoef(f.base, i, f.index))}$, so the $x^{${f.m * i}}$ coefficient is $${qTex(pow(f.k, i))} \\times ${inLine(unitCoef(f.base, i, f.index))} = ${qTex(coefOf(f, f.m * i))}$.`,
    }));
  },
};

interface ProductParams {
  f: Fn;
  g: Fn;
  n: number;
}

/** The pairs (i, n - i) whose product is not zero. */
function pairsOf({ f, g, n }: ProductParams): { i: number; a: Q; b: Q }[] {
  const out: { i: number; a: Q; b: Q }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const a = coefOf(f, i);
    const b = coefOf(g, n - i);
    if (!isZero(a) && !isZero(b)) out.push({ i, a, b });
  }
  return out;
}

const productCoef = (params: ProductParams): Q => pairsOf(params).reduce((total, { a, b }) => add(total, mul(a, b)), ZERO);

/** The product as the learner reads it, the exponential or polynomial factor first. */
function productTex({ f, g }: ProductParams): string {
  const rank: Base[] = ['pow', 'exp', 'geo', 'ln', 'sin', 'cos'];
  const [first, second] = rank.indexOf(f.base) <= rank.indexOf(g.base) ? [f, g] : [g, f];
  if (first.base === 'geo') return `\\frac{${fnTex(second)}}{1 ${minus(uTex(first.k))}}`;
  return `${fnTex(first)}${second.base === 'exp' || second.base === 'pow' ? '' : '\\,'}${fnTex(second)}`;
}

function sampleProduct(rng: Rng, hard: boolean): ProductParams {
  const pick = (): Fn => {
    const base = rng.pick<Base>(['exp', 'sin', 'cos', 'ln', 'geo', 'pow']);
    const k = hard ? nonZero(rng, -3, 3) : rng.pick([1, -1, 2, -2]);
    return fnOf(base, k, { index: base === 'pow' ? rng.int(1, 3) : 0 });
  };
  for (;;) {
    const f = pick();
    const g = pick();
    if (f.base === g.base) continue;
    const params = { f, g, n: hard ? 3 : 2 };
    if (pairsOf(params).length < 2 || isZero(productCoef(params))) continue;
    return params;
  }
}

/** Steps: the x^n coefficient of a product, pair by pair. */
const multiplySteps: Generator<ProductParams> = {
  id: 'ser-multiply-steps',
  sample: (rng, difficulty) => sampleProduct(rng, difficulty > 1),
  render: (params): Slide => {
    const { f, g, n } = params;
    const pairs = pairsOf(params);
    const start: string[] = [];
    pairs.forEach(({ a, b }, idx) => {
      if (idx > 0) start.push('+');
      start.push(`${idx === 0 ? qTex(a) : inLine(a)} \\times ${inLine(b)}`);
    });
    const spell = (v: Q, idx: number) => (idx === 0 ? qTex(v) : inLine(v));
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = pairs.map(({ a, b }, idx) => {
      const v = mul(a, b);
      return {
        span: [2 * idx, 2 * idx + 1] as [number, number],
        value: spell(v, idx),
        bank: stepBank(spell(v, idx), spell(add(a, b), idx), spell(neg(v), idx), spell(mul(v, q(2)), idx)),
      };
    });
    let total = mul(pairs[0].a, pairs[0].b);
    for (const { a, b } of pairs.slice(1)) {
      const next = mul(a, b);
      const sum = add(total, next);
      reductions.push({ span: [0, 3], operator: 1, value: qTex(sum), bank: stepBank(qTex(sum), qTex(sub(total, next)), qTex(mul(total, next)), qTex(neg(sum))) });
      total = sum;
    }
    return {
      kind: 'steps',
      prompt: [
        say(`Multiply these two series. The line adds the pairs of terms whose powers make $x^{${n}}$: work out the coefficient of $x^{${n}}$ in $${productTex(params)}$.`),
        show(`${fnTex(f)} = ${seriesTex(termsOf(f, n + 1, n), 'x', goesOn(f, n))}`),
        show(`${fnTex(g)} = ${seriesTex(termsOf(g, n + 1, n), 'x', goesOn(g, n))}`),
      ],
      start,
      reductions,
    };
  },
  solution: (params) => {
    const pairs = pairsOf(params);
    return [
      { text: `A term in $x^{i}$ from the first series times a term in $x^{${params.n}-i}$ from the second makes $x^{${params.n}}$. Pairs with a zero coefficient add nothing.` },
      { tex: `${pairs.map(({ a, b }, idx) => `${idx === 0 ? qTex(a) : inLine(a)} \\times ${inLine(b)}`).join(' + ')} = ${qTex(productCoef(params))}` },
    ];
  },
};

/** Expression: the x^n coefficient of a product, typed. */
const productCoefGen: Generator<ProductParams> = {
  id: 'ser-product-coef',
  sample: (rng, difficulty) => sampleProduct(rng, difficulty > 1),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the coefficient of $x^{${params.n}}$ in the Maclaurin series of $f(x) = ${productTex(params)}$.`)],
    lead: `a_{${params.n}} =`,
    keypad: FRACTION_KEYS,
    answer: qAns(productCoef(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { f, g, n } = params;
    const pairs = pairsOf(params);
    return [
      { text: `Write out both series as far as $x^{${n}}$:` },
      { tex: `${fnTex(f)} = ${seriesTex(termsOf(f, n + 1, n), 'x', goesOn(f, n))}` },
      { tex: `${fnTex(g)} = ${seriesTex(termsOf(g, n + 1, n), 'x', goesOn(g, n))}` },
      { text: `Add up every pair of terms whose powers make $x^{${n}}$:` },
      { tex: `${pairs.map(({ a, b }, idx) => `${idx === 0 ? qTex(a) : inLine(a)} \\times ${inLine(b)}`).join(' + ')} = ${qTex(productCoef(params))}` },
    ];
  },
  choices: (params) => {
    const { f, g, n } = params;
    const pairs = pairsOf(params);
    const correct = productCoef(params);
    const samePower = mul(coefOf(f, n), coefOf(g, n));
    const missing = sub(correct, mul(pairs[pairs.length - 1].a, pairs[pairs.length - 1].b));
    return qChoices(correct, [samePower, missing, add(coefOf(f, n), coefOf(g, n))], saltOf(f, ...[g.base.length, g.k.n, g.index, n]));
  },
};

/* ================================================================
 * Level 2, lesson 1: Taylor series about x = a
 * ================================================================ */

export type TKind = 'poly' | 'ln' | 'recip' | 'sqrt' | 'exp' | 'sinPi' | 'cosPi' | 'sinHalf' | 'cosHalf';

/**
 * A function with a centre where it is whole.
 *
 * `ln(x + s)` about `1 - s`, `c/(x + s)` about a point where `x + s = r`,
 * `c√(x + s)` where `x + s = r²`, `c e^(x - a)` about `a`, `c sin x` and
 * `c cos x` about `π` or `π/2`, and a cubic about any whole point.
 */
export interface Taylor {
  kind: TKind;
  /** The whole centre; unused for the trigonometric kinds. */
  a: number;
  /** `r` for `recip`, the square root of `a + s` for `sqrt`. */
  r: number;
  c: number;
  /** A cubic's coefficients in x, highest first. */
  poly: number[];
}

const tay = (kind: TKind, a: number, extra: Partial<Omit<Taylor, 'kind' | 'a'>> = {}): Taylor => ({ kind, a, r: 1, c: 1, poly: [], ...extra });

/** The shift inside: `x + s`. */
function shiftOf(t: Taylor): number {
  if (t.kind === 'ln') return 1 - t.a;
  if (t.kind === 'recip') return t.r - t.a;
  if (t.kind === 'sqrt') return t.r * t.r - t.a;
  return -t.a;
}

const isTrig = (t: Taylor): boolean => t.kind === 'sinPi' || t.kind === 'cosPi' || t.kind === 'sinHalf' || t.kind === 'cosHalf';

/** The centre as the learner reads it. */
export function centreTex(t: Taylor): string {
  if (t.kind === 'sinPi' || t.kind === 'cosPi') return '\\pi';
  if (isTrig(t)) return '\\frac{\\pi}{2}';
  return `${t.a}`;
}

/** The centre as a number, for the test. */
export const centreOf = (t: Taylor): number => (t.kind === 'sinPi' || t.kind === 'cosPi' ? Math.PI : isTrig(t) ? Math.PI / 2 : t.a);

/** `(x - 4)`, `(x + 1)`, `(x - \pi)`: what each power is taken of. */
export function hTex(t: Taylor): string {
  if (isTrig(t)) return `(x - ${centreTex(t)})`;
  return t.a < 0 ? `(x + ${-t.a})` : `(x - ${t.a})`;
}

/** The same the wrong way round: the commonest slip. */
function hSlipTex(t: Taylor): string {
  if (isTrig(t)) return `(x + ${centreTex(t)})`;
  return t.a < 0 ? `(x - ${-t.a})` : `(x + ${t.a})`;
}

/** `x + 2`, `x - 3`, or `x`. */
const xPlus = (s: number): string => (s === 0 ? 'x' : `x ${s < 0 ? '-' : '+'} ${Math.abs(s)}`);

/** A cubic's coefficients about a: a polynomial rewritten in powers of (x - a). */
function shifted(poly: number[], a: number): number[] {
  // Repeated synthetic division by (x - a), lowest coefficient first out.
  let rest = [...poly];
  const out: number[] = [];
  while (rest.length > 0) {
    const next: number[] = [];
    let carry = 0;
    for (const coefficient of rest) {
      carry = carry * a + coefficient;
      next.push(carry);
    }
    out.push(next.pop()!);
    rest = next;
  }
  return out;
}

const BINOM_HALF = [q(1), q(1, 2), q(-1, 8), q(1, 16), q(-5, 128)];

/** The coefficient of (x - a)^n. */
export function tcoef(t: Taylor, n: number): Q {
  const c = q(t.c);
  switch (t.kind) {
    case 'poly':
      return q(shifted(t.poly, t.a)[n] ?? 0);
    case 'ln':
      return n === 0 ? ZERO : mul(c, q(n % 2 === 1 ? 1 : -1, n));
    case 'recip':
      return mul(c, q(n % 2 === 0 ? 1 : -1, t.r ** (n + 1)));
    case 'sqrt':
      return mul(c, mul(BINOM_HALF[n] ?? ZERO, q(t.r, t.r ** (2 * n))));
    case 'exp':
      return mul(c, q(1, fact(n)));
    case 'sinPi':
      return mul(c, neg(unitCoef('sin', n)));
    case 'cosPi':
      return mul(c, neg(unitCoef('cos', n)));
    case 'sinHalf':
      return mul(c, unitCoef('cos', n));
    case 'cosHalf':
      return mul(c, neg(unitCoef('sin', n)));
  }
}

/** f^(n)(a). */
const tderiv = (t: Taylor, n: number): Q => mul(tcoef(t, n), q(fact(n)));

/** The function as the learner reads it. */
export function taylorTex(t: Taylor): string {
  const s = shiftOf(t);
  switch (t.kind) {
    case 'poly':
      return seriesTex(t.poly.map((c, i) => ({ c: q(c), p: t.poly.length - 1 - i })).filter((term) => !isZero(term.c)), 'x', false);
    case 'ln':
      return `${lead(t.c)}\\ln ${s === 0 ? 'x' : `(${xPlus(s)})`}`;
    case 'recip':
      return `${t.c < 0 ? '-' : ''}\\frac{${Math.abs(t.c)}}{${xPlus(s)}}`;
    case 'sqrt':
      return `${lead(t.c)}\\sqrt{${xPlus(s)}}`;
    case 'exp':
      return `${lead(t.c)}e^{${xPlus(s)}}`;
    case 'sinPi':
    case 'sinHalf':
      return `${lead(t.c)}\\sin x`;
    case 'cosPi':
    case 'cosHalf':
      return `${lead(t.c)}\\cos x`;
  }
}

/** The function for mathjs. Never displayed. */
export function taylorSource(t: Taylor): string {
  const s = shiftOf(t);
  switch (t.kind) {
    case 'poly':
      return t.poly.map((c, i) => `(${c})*x^${t.poly.length - 1 - i}`).join(' + ');
    case 'ln':
      return `(${t.c})*log(x + (${s}))`;
    case 'recip':
      return `(${t.c})/(x + (${s}))`;
    case 'sqrt':
      return `(${t.c})*sqrt(x + (${s}))`;
    case 'exp':
      return `(${t.c})*exp(x + (${s}))`;
    case 'sinPi':
    case 'sinHalf':
      return `(${t.c})*sin(x)`;
    case 'cosPi':
    case 'cosHalf':
      return `(${t.c})*cos(x)`;
  }
}

/** The first `count` non-zero terms in powers of (x - a), up to `cap`. */
function taylorTerms(t: Taylor, count: number, cap = 5): Term[] {
  const out: Term[] = [];
  for (let p = 0; p <= cap && out.length < count; p += 1) {
    const c = tcoef(t, p);
    if (!isZero(c)) out.push({ c, p });
  }
  return out;
}

/** A Taylor function, easy or hard. `wholeDerivs` keeps f', f'', f''' readable in a tree. */
function sampleTaylor(rng: Rng, hard: boolean): Taylor {
  const kind = rng.pick<TKind>(hard ? ['sqrt', 'recip', 'sinPi', 'cosPi', 'sinHalf', 'cosHalf', 'poly', 'ln'] : ['poly', 'ln', 'exp', 'recip']);
  switch (kind) {
    case 'poly': {
      for (;;) {
        const poly = [nonZero(rng, -2, 2), rng.int(-4, 4), rng.int(-5, 5), rng.int(-6, 6)];
        const a = nonZero(rng, -3, 3);
        const t = tay('poly', a, { poly });
        if (taylorTerms(t, 4, 3).length >= 3) return t;
      }
    }
    case 'ln':
      return tay('ln', rng.int(-3, 4), { c: hard ? nonZero(rng, -3, 3) : rng.int(1, 3) });
    case 'recip': {
      const r = hard ? rng.pick([2, -2, 1, -1]) : rng.pick([1, -1]);
      return tay('recip', nonZero(rng, -3, 4), { r, c: r * (hard ? nonZero(rng, -3, 3) : rng.int(1, 3)) });
    }
    case 'sqrt': {
      const r = rng.int(1, 2);
      return tay('sqrt', rng.pick([r * r, r * r - 1, r * r + 2, r * r - 3, 1 + r]), { r, c: rng.pick([1, 2, 4]) });
    }
    case 'exp':
      return tay('exp', nonZero(rng, -3, 3), { c: rng.int(1, 4) });
    default:
      return tay(kind, 0, { c: nonZero(rng, -3, 3) });
  }
}

interface TaylorParams {
  t: Taylor;
}

/** Tree: f'(a), f''(a), f'''(a), then the coefficients of (x - a)^2 and (x - a)^3. */
const taylorTree: Generator<TaylorParams> = {
  id: 'ser-taylor-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const t = sampleTaylor(rng, difficulty > 1);
      if (isZero(tcoef(t, 2)) && isZero(tcoef(t, 3))) continue;
      return { t };
    }
  },
  render: ({ t }): Slide => {
    const ds = [1, 2, 3].map((n) => tderiv(t, n));
    const cs = [2, 3].map((n) => tcoef(t, n));
    const slips = [...ds.map(neg), ...cs.map(neg), div(ds[2], q(3)), mul(ds[1], q(2)), q(t.c)];
    const a = centreTex(t);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Find the derivatives of $f(x) = ${taylorTex(t)}$ at $x = ${a}$, then the Taylor coefficients about $x = ${a}$. Top row, left to right: $${derivName(1, a)}$, $${derivName(2, a)}$, $${derivName(3, a)}$. Underneath: the coefficients of $${hTex(t)}^{2}$ and $${hTex(t)}^{3}$.`,
        ),
      ],
      expression: `a_{n} = \\frac{f^{(n)}(${a})}{n!}`,
      nodes: [
        { id: 'd1', from: [] },
        { id: 'd2', from: [] },
        { id: 'd3', from: [] },
        { id: 'c2', from: ['d2'] },
        { id: 'c3', from: ['d3'] },
      ],
      bank: qBank([...ds, ...cs], slips, 3),
      answer: [...ds, ...cs].map(qTex),
    };
  },
  solution: ({ t }) => {
    const a = centreTex(t);
    const ds = [1, 2, 3].map((n) => tderiv(t, n));
    return [
      { text: `Differentiate three times and put $x = ${a}$ into each:` },
      { tex: `${derivName(1, a)} = ${qTex(ds[0])}, \\quad ${derivName(2, a)} = ${qTex(ds[1])}, \\quad ${derivName(3, a)} = ${qTex(ds[2])}` },
      { text: 'Each coefficient is the derivative over the factorial of its order:' },
      { tex: `a_{2} = \\frac{${qTex(ds[1])}}{2!} = ${qTex(tcoef(t, 2))}, \\quad a_{3} = \\frac{${qTex(ds[2])}}{3!} = ${qTex(tcoef(t, 3))}` },
    ];
  },
};

/** Tiles: the first terms of a Taylor series, in powers of (x - a). */
const taylorTiles: Generator<TaylorParams> = {
  id: 'ser-taylor-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const t = sampleTaylor(rng, difficulty > 1);
      if (taylorTerms(t, 4).length >= 3) return { t };
    }
  },
  render: ({ t }): Slide => {
    const h = hTex(t);
    const terms = taylorTerms(t, 4);
    const answer = terms.map((term, i) => (i === 0 ? leadTile(term.c, term.p, h) : signedMono(term.c, term.p, h)));
    const slips: string[] = [];
    for (const [i, term] of terms.entries()) {
      const spell = (c: Q, p: number, v: string) => (i === 0 ? leadTile(c, p, v) : signedMono(c, p, v));
      if (term.p > 0) slips.push(spell(term.c, term.p, hSlipTex(t)));
      slips.push(spell(neg(term.c), term.p, h));
      if (term.p > 1) slips.push(spell(tderiv(t, term.p), term.p, h));
    }
    const done = t.kind === 'poly' && terms[terms.length - 1].p === 3;
    return {
      kind: 'tiles',
      prompt: [say(`Complete the Taylor series of $f(x) = ${taylorTex(t)}$ about $x = ${centreTex(t)}$.`)],
      template: `f(x) = ${answer.map((_, i) => `{${i}}`).join(' ')}${done ? '' : ' + \\cdots'}`,
      bank: termBank(answer, slips, 4),
      answer,
    };
  },
  solution: ({ t }) => {
    const a = centreTex(t);
    const terms = taylorTerms(t, 4);
    return [
      { text: `Each coefficient is $\\frac{f^{(n)}(${a})}{n!}$, and each power is of $${hTex(t)}$, not of $x$:` },
      { tex: terms.map((term) => `\\frac{${qTex(tderiv(t, term.p))}}{${term.p}!} = ${qTex(term.c)}`).join(', \\quad ') },
      { tex: `f(x) = ${seriesTex(terms, hTex(t), !(t.kind === 'poly' && terms[terms.length - 1].p === 3))}` },
    ];
  },
};

interface TaylorCoefParams {
  t: Taylor;
  n: number;
}

/** Expression: one Taylor coefficient, typed. */
const taylorCoef: Generator<TaylorCoefParams> = {
  id: 'ser-taylor-coef',
  sample: (rng, difficulty) => {
    for (;;) {
      const t = sampleTaylor(rng, difficulty > 1);
      const n = rng.int(2, t.kind === 'sqrt' ? 3 : 4);
      if (isZero(tcoef(t, n))) continue;
      return { t, n };
    }
  },
  render: ({ t, n }): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the coefficient of $${hTex(t)}^{${n}}$ in the Taylor series of $f(x) = ${taylorTex(t)}$ about $x = ${centreTex(t)}$.`)],
    lead: `a_{${n}} =`,
    keypad: FRACTION_KEYS,
    answer: qAns(tcoef(t, n)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ t, n }) => [
    { text: `The coefficient of $${hTex(t)}^{${n}}$ is $\\frac{${derivName(n, centreTex(t))}}{${n}!}$.` },
    { tex: `${derivName(n, centreTex(t))} = ${qTex(tderiv(t, n))}` },
    { tex: `a_{${n}} = \\frac{${qTex(tderiv(t, n))}}{${fact(n)}} = ${qTex(tcoef(t, n))}` },
  ],
  choices: ({ t, n }) => {
    const c = tcoef(t, n);
    return qChoices(c, [tderiv(t, n), div(tderiv(t, n), q(n)), tcoef(t, n - 1)], mix(t.a, t.r, t.c, n, ...t.poly));
  },
};

type CentreKind = 'sqrt' | 'cbrt' | 'ln' | 'recip' | 'sin';

interface CentreParams {
  kind: CentreKind;
  /** The whole root near the value, for roots. */
  r: number;
  /** How far the value is from the easy point, in tenths. */
  tenths: number;
}

/** Choice: the best point to expand about, to estimate a value. */
const taylorCentre: Generator<CentreParams> = {
  id: 'ser-taylor-centre',
  sample: (rng, difficulty) => {
    const kind = rng.pick<CentreKind>(difficulty > 1 ? ['cbrt', 'ln', 'sin', 'sqrt', 'recip'] : ['sqrt', 'recip', 'ln']);
    const tenths = rng.pick(kind === 'sqrt' || kind === 'cbrt' ? [-20, -10, 10, 20, 30, -30, 5] : [-2, -1, 1, 2, 3, -3]);
    return { kind, r: kind === 'sqrt' ? rng.int(4, 12) : kind === 'cbrt' ? rng.int(2, 5) : 1, tenths };
  },
  render: ({ kind, r, tenths }): Slide => {
    const off = tenths / 10;
    const opt = (tex: string) => ({ tex: `x = ${tex}`, key: tex });
    let what: string;
    let fn: string;
    let correct: { tex: string; key: string };
    let slips: { tex: string; key: string }[];
    if (kind === 'sqrt' || kind === 'cbrt') {
      const power = kind === 'sqrt' ? 2 : 3;
      const v = r ** power + off;
      what = kind === 'sqrt' ? `\\sqrt{${dec(v)}}` : `\\sqrt[3]{${dec(v)}}`;
      fn = kind === 'sqrt' ? '\\sqrt{x}' : '\\sqrt[3]{x}';
      correct = opt(`${r ** power}`);
      slips = [opt('0'), opt(dec(v)), opt(`${(r + 1) ** power}`), opt(`${(r - 1) ** power}`)];
    } else if (kind === 'sin') {
      const v = 3.1 + off / 2;
      what = `\\sin ${dec(v)}`;
      fn = '\\sin x';
      correct = opt('\\pi');
      slips = [opt('0'), opt(dec(v)), opt('\\frac{\\pi}{2}'), opt('3')];
    } else {
      const v = 1 + off / 10;
      what = kind === 'ln' ? `\\ln ${dec(v)}` : `\\frac{1}{${dec(v)}}`;
      fn = kind === 'ln' ? '\\ln x' : '\\frac{1}{x}';
      correct = opt('1');
      slips = [opt('0'), opt(dec(v)), opt('2'), opt('e')];
    }
    const opts = formChoices(correct, slips, mix(['sqrt', 'cbrt', 'ln', 'recip', 'sin'].indexOf(kind), r, tenths));
    return choiceSlide([say(`To estimate $${what}$ from a few terms of a Taylor series of $${fn}$, which point is best to expand about?`)], opts);
  },
  solution: ({ kind, r }) => {
    const easy = kind === 'sqrt' ? `${r * r}` : kind === 'cbrt' ? `${r ** 3}` : kind === 'sin' ? '\\pi' : '1';
    return [
      { text: 'Expand about a point where the function and all its derivatives are known exactly, and as close to the value as possible: the smaller $x - a$, the faster the terms shrink.' },
      { text: `Here that is $x = ${easy}$.${kind === 'sqrt' || kind === 'cbrt' || kind === 'recip' || kind === 'ln' ? ' The function has no Taylor series about $0$ at all.' : ''}` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 2: estimating a value
 * ================================================================ */

interface EstimateParams {
  f: Fn;
  /** The x the series is evaluated at. */
  h: Q;
  /** How many non-zero terms are used. */
  count: number;
}

/** The value asked about, as the learner reads it: e^{1/2}, ln(3/2), sin(1/3). */
function estimateTex({ f, h }: EstimateParams): string {
  const x = mul(f.k, h);
  switch (f.base) {
    case 'exp':
      return `e^{${qTex(x)}}`;
    case 'ln':
      return `\\ln ${qTex(add(ONE, x))}`;
    case 'sin':
      return `\\sin ${qTex(x)}`;
    case 'cos':
      return `\\cos ${qTex(x)}`;
    default:
      return fnTex(f);
  }
}

/** The non-zero terms of the series, each evaluated at h. */
function termValues(params: EstimateParams, count = params.count): { term: Term; value: Q }[] {
  return termsOf(params.f, count, 12).map((term) => ({ term, value: mul(term.c, pow(params.h, term.p)) }));
}

const ESTIMATE_H: Record<string, Q[]> = {
  exp: [q(1, 2), q(-1, 2), q(1, 3), q(-1, 3), q(1, 4), q(-1, 4), q(1, 5), q(1), q(-1), q(2), q(2, 3), q(-2, 3), q(3, 2)],
  ln: [q(1, 2), q(-1, 2), q(1, 3), q(-1, 3), q(1, 4), q(-1, 4), q(1, 5), q(-1, 5), q(2, 3), q(3, 4), q(1)],
  sin: [q(1, 2), q(1, 3), q(1), q(-1, 2), q(2, 3), q(1, 4), q(3, 2), q(-1), q(-1, 3), q(-2, 3)],
  cos: [q(1, 2), q(1, 3), q(1), q(2, 3), q(1, 4), q(3, 2), q(2), q(-2, 3), q(-3, 2)],
};

function sampleEstimate(rng: Rng, hard: boolean): EstimateParams {
  const base = rng.pick<Base>(['exp', 'ln', 'sin', 'cos']);
  // Four terms of sin or cos run into denominators in the thousands.
  const count = hard && (base === 'exp' || base === 'ln') ? 4 : 3;
  const h = rng.pick(ESTIMATE_H[base]);
  // Difficulty 2 keeps to the awkward points: negative, or past a half.
  if (hard && count === 3 && h.n > 0 && val(h) <= 0.5) return sampleEstimate(rng, hard);
  return { f: fnOf(base, 1), h, count };
}

/** Tree: each term's value at h, then the estimate they add up to. */
const estimateTree: Generator<EstimateParams> = {
  id: 'ser-estimate-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleEstimate(rng, difficulty > 1);
      // Denominators past a thousand stop being arithmetic and start being a chore.
      if (termValues(params).some(({ value }) => value.d > 1000)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const values = termValues(params);
    const total = values.reduce((sum, { value }) => add(sum, value), ZERO);
    const answer = [...values.map(({ value }) => value), total];
    const slips = [
      ...values.map(({ value }) => neg(value)),
      ...values.map(({ term }) => pow(params.h, term.p)),
      sub(total, mul(values[values.length - 1].value, q(2))),
      add(total, ONE),
    ];
    const poly = seriesTex(values.map(({ term }) => term), 'x', false);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Estimate $${estimateTex(params)}$ from the first ${params.count === 3 ? 'three' : 'four'} terms of the series for $${fnTex(params.f)}$, at $x = ${qTex(params.h)}$. Top row, left to right: each term's value. Underneath: their sum, the estimate.`,
        ),
      ],
      expression: `${fnTex(params.f)} \\approx ${poly}`,
      nodes: [...values.map((_, i) => ({ id: `t${i}`, from: [] as string[] })), { id: 'sum', from: values.map((_, i) => `t${i}`) }],
      bank: qBank(answer, slips, 3),
      answer: answer.map(qTex),
    };
  },
  solution: (params) => {
    const values = termValues(params);
    const total = values.reduce((sum, { value }) => add(sum, value), ZERO);
    return [
      { text: `Put $x = ${qTex(params.h)}$ into each term, keeping every value as a fraction:` },
      { tex: values.map(({ value }) => inLine(value)).join(' + ') + ` = ${qTex(total)}` },
      { text: `So $${estimateTex(params)} \\approx ${qTex(total)}$, which is $${dec(val(total))}$ to six decimal places.` },
    ];
  },
};

/** Expression: the first term left out, which estimates the error. */
const droppedTerm: Generator<EstimateParams> = {
  id: 'ser-dropped-term',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const params = sampleEstimate(rng, hard);
      params.count = hard ? rng.int(2, 4) : rng.int(2, 3);
      const next = termValues(params, params.count + 1)[params.count].value;
      if (next.d > 20000) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const used = termValues(params).map(({ term }) => term);
    return {
      kind: 'expression',
      prompt: [
        say(`$${estimateTex(params)}$ is estimated by putting $x = ${qTex(params.h)}$ into`),
        show(`${fnTex(params.f)} \\approx ${seriesTex(used, 'x', false)}`),
        say('Find the value of the first term left out: it estimates the error.'),
      ],
      lead: '\\text{first term dropped} =',
      keypad: FRACTION_KEYS,
      answer: qAns(termValues(params, params.count + 1)[params.count].value),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const next = termValues(params, params.count + 1)[params.count];
    return [
      { text: `The next non-zero term of the series is $${monoTex(next.term.c, next.term.p)}$.` },
      { tex: `${monoTex(next.term.c, next.term.p).replace(/x/g, `\\left(${qTex(params.h)}\\right)`)} = ${qTex(next.value)}` },
      { text: 'The terms after it are smaller still, so the error is about this size.' },
    ];
  },
  choices: (params) => {
    const all = termValues(params, params.count + 2);
    const next = all[params.count];
    const last = all[params.count - 1].value;
    const noFactorial = pow(params.h, next.term.p);
    return qChoices(next.value, [last, noFactorial, all[params.count + 1]?.value ?? neg(next.value)], mix(params.h.n, params.h.d, params.count, next.term.p));
  },
};

interface EnoughParams {
  f: Fn;
  h: Q;
  /** The error bound is 1/10^places. */
  places: number;
}

/** The fewest non-zero terms whose first left-out term is smaller than the bound. */
function termsNeeded({ f, h, places }: EnoughParams): number {
  const bound = 1 / 10 ** places;
  const values = termValues({ f, h, count: 12 }, 12);
  for (let n = 1; n < values.length; n += 1) {
    if (Math.abs(val(values[n].value)) < bound) return n;
  }
  return values.length;
}

/** Choice: how many terms make the first term left out smaller than 0.01 or 0.001? */
const estimatePick: Generator<EnoughParams> = {
  id: 'ser-estimate-pick',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = rng.pick<Base>(difficulty > 1 ? ['exp', 'sin', 'cos', 'ln'] : ['exp', 'cos']);
      const h = rng.pick(base === 'ln' ? [q(1, 2), q(1, 3), q(-1, 3), q(1, 4)] : [q(1, 2), q(1), q(2), q(-1, 2), q(1, 3), q(-1), q(3, 2)]);
      const params = { f: fnOf(base, 1), h, places: rng.int(2, 3) };
      const n = termsNeeded(params);
      if (n < 2 || n > 9) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const n = termsNeeded(params);
    const opts = qChoices(q(n), [q(n + 1), q(n - 1), q(n + 2)], mix(params.h.n, params.h.d, params.places, n));
    return choiceSlide(
      [
        say(
          `The series for $${fnTex(params.f)}$ is used at $x = ${qTex(params.h)}$ to estimate $${estimateTex({ ...params, count: 1 })}$. What is the fewest non-zero terms to use, so that the first term left out is smaller than $${dec(1 / 10 ** params.places)}$ in size?`,
        ),
      ],
      opts,
    );
  },
  solution: (params) => {
    const n = termsNeeded(params);
    const values = termValues({ ...params, count: n + 1 }, n + 1);
    return [
      { text: `Work out the terms at $x = ${qTex(params.h)}$ until one is small enough:` },
      { tex: values.map(({ value }) => qTex(value)).join(', \\; ') },
      { text: `The term after the first $${n}$ is $${qTex(values[n].value)}$, which is smaller than $${dec(1 / 10 ** params.places)}$ in size; the one before it is not. So $${n}$ terms.` },
    ];
  },
};

interface ErrorSliderParams {
  base: Base;
  /** The power of the first term left out. */
  p: number;
  /** Where that term reaches the bound, a multiple of 0.25. */
  x: number;
}

const ERROR_X = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75];

/** The polynomial kept, for the prompt. */
function keptBefore(base: Base, p: number): Term[] {
  return termsOf(fnOf(base, 1), 8, p - 1);
}

/** Slider: the largest x at which the first term left out is at most a bound. */
const estimateSlider: Generator<ErrorSliderParams> = {
  id: 'ser-estimate-slider',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const base = rng.pick<Base>(['sin', 'cos', 'exp']);
      const p = base === 'sin' ? rng.pick([3, 5]) : base === 'cos' ? rng.pick([2, 4, 6]) : rng.int(3, 5);
      return { base, p, x: rng.pick(ERROR_X) };
    }
    return { base: 'exp', p: rng.int(2, 4), x: rng.pick(ERROR_X) };
  },
  render: ({ base, p, x }): Slide => {
    const bound = div(pow(q(Math.round(x * 4), 4), p), q(fact(p)));
    const term = (t: number) => t ** p / fact(p);
    const yMax = term(3) * 1.08;
    return {
      kind: 'slider',
      prompt: [
        say(
          `Near $0$, $${baseTex(base, 'x')} \\approx ${seriesTex(keptBefore(base, p), 'x', false)}$. The first term left out has size $\\frac{x^{${p}}}{${p}!}$, drawn here for $x \\ge 0$, and it estimates the error. Slide to the largest $x$ at which it is at most $${qTex(bound)}$.`,
        ),
      ],
      min: 0,
      max: 3,
      step: 0.25,
      answer: x,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 3,
          yMin: 0,
          yMax,
          curves: [{ f: term, accent: true }],
          horizontals: [val(bound)],
          label: `The curve y = x to the ${p} over ${p} factorial for x from 0 to 3, with a horizontal line at the bound`,
        }),
        ...markerWindow(0, 3),
      },
    };
  },
  solution: ({ p, x }) => {
    const bound = div(pow(q(Math.round(x * 4), 4), p), q(fact(p)));
    return [
      { text: `Set the term equal to the bound and multiply by $${p}! = ${fact(p)}$:` },
      { tex: `x^{${p}} = ${fact(p)} \\times ${inLine(bound)} = ${qTex(mul(bound, q(fact(p))))}` },
      { text: `So $x = ${dec(x)}$. The term grows with $x$, so it is at most the bound for every $x$ up to there.` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 3: limits by series
 * ================================================================ */

interface LimitParams {
  f1: Fn;
  /** Taken away, when there are two functions. */
  f2?: Fn;
  /** 1, or -1 for `1 - cos x` and `x - sin x`, where f1 is taken away from its own start. */
  s: number;
  /** The lowest power left on top once everything below it cancels. */
  p: number;
  b: number;
  /** The power of x underneath. */
  m: number;
}

/** The top's coefficients, before anything is cancelled. */
function limitTop({ f1, f2, s }: LimitParams, p: number): Q {
  const one = mul(q(s), coefOf(f1, p));
  return f2 ? sub(one, coefOf(f2, p)) : one;
}

/** The terms below x^p that the numerator takes off, so the top starts at x^p. */
function correction(params: LimitParams): Term[] {
  const out: Term[] = [];
  for (let j = 0; j < params.p; j += 1) {
    const c = limitTop(params, j);
    if (!isZero(c)) out.push({ c, p: j });
  }
  return out;
}

const negTex = (tex: string): string => (tex.startsWith('-') ? tex.slice(1) : `-${tex}`);

/** The numerator as the learner reads it: `e^{2x} - 1 - 2x`, `1 - \cos 3x`, `e^{x} - \cos 2x - x`. */
function numeratorTex(params: LimitParams): string {
  const { f1, f2, s } = params;
  const taken = correction(params).map((t) => negTex(monoTex(t.c, t.p)));
  if (s < 0 && !f2) return sumTex([...correction(params).map((t) => monoTex(neg(t.c), t.p)), negTex(fnTex(f1))]);
  return sumTex([fnTex(f1), ...(f2 ? [negTex(fnTex(f2))] : []), ...taken]);
}

/** The same for mathjs. Never displayed. */
export function numeratorSource(params: LimitParams): string {
  const { f1, f2, s } = params;
  const parts = [`(${s})*(${fnSource(f1)})`, ...(f2 ? [`-(${fnSource(f2)})`] : []), ...correction(params).map((t) => `-(${monoAns(t.c, t.p)})`)];
  return parts.join(' ');
}

const denominatorTex = ({ b, m }: LimitParams): string => `${b === 1 ? '' : b}${m === 1 ? 'x' : `x^{${m}}`}`;

const limitTex = (params: LimitParams): string => `\\lim_{x \\to 0} \\frac{${numeratorTex(params)}}{${denominatorTex(params)}}`;

/** The leading coefficient of the top. */
const leading = (params: LimitParams): Q => limitTop(params, params.p);

const limitValue = (params: LimitParams): Q => div(leading(params), q(params.b));

const SINGLE_LIMITS: { base: Base; s: number; p: number }[] = [
  { base: 'exp', s: 1, p: 1 },
  { base: 'sin', s: 1, p: 1 },
  { base: 'ln', s: 1, p: 1 },
  { base: 'cos', s: -1, p: 2 },
  { base: 'exp', s: 1, p: 2 },
  { base: 'sin', s: -1, p: 3 },
  { base: 'ln', s: -1, p: 2 },
  { base: 'geo', s: 1, p: 2 },
];

/** One function with its start taken off, over b x^p. */
function sampleSingleLimit(rng: Rng, hard: boolean): LimitParams {
  const pick = rng.pick(hard ? SINGLE_LIMITS.slice(3) : SINGLE_LIMITS.slice(0, 5));
  const b = hard ? rng.int(1, 4) : 1;
  return { f1: fnOf(pick.base, nonZero(rng, hard ? -3 : -4, hard ? 3 : 4)), s: pick.s, p: pick.p, b, m: pick.p };
}

/** Two functions, the terms below x^p cancelled, over b x^p. */
function sampleDoubleLimit(rng: Rng, hard: boolean): LimitParams {
  for (;;) {
    const f1 = fnOf(rng.pick<Base>(['exp', 'sin', 'cos', 'ln', 'geo']), nonZero(rng, -3, 3));
    const f2 = fnOf(rng.pick<Base>(['exp', 'sin', 'cos', 'ln', 'geo']), nonZero(rng, -3, 3));
    if (f1.base === f2.base && eq(f1.k, f2.k)) continue;
    const params: LimitParams = { f1, f2, s: 1, p: hard ? rng.int(2, 3) : rng.int(1, 2), b: hard ? rng.int(1, 3) : 1, m: 0 };
    params.m = params.p;
    if (isZero(coefOf(f1, params.p)) || isZero(coefOf(f2, params.p)) || isZero(leading(params))) continue;
    if (correction(params).length > 2) continue;
    return params;
  }
}

/** Expression: a limit by series, typed. */
const limitGen: Generator<LimitParams> = {
  id: 'ser-limit',
  sample: (rng, difficulty) => sampleSingleLimit(rng, difficulty > 1),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say('Use the Maclaurin series of the top to find this limit.')],
    lead: `${limitTex(params)} =`,
    keypad: FRACTION_KEYS,
    answer: qAns(limitValue(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [
    { text: 'Put the series in for the function. Everything below the lowest power on top cancels:' },
    { tex: `${numeratorTex(params)} = ${seriesTex(termsAfterCancel(params))}` },
    { text: `Divide by $${denominatorTex(params)}$: every later term still has an $x$ in it, so it goes to $0$.` },
    { tex: `${limitTex(params)} = ${qTex(limitValue(params))}` },
  ],
  choices: (params) => {
    const { f1, p, b, s } = params;
    const correct = limitValue(params);
    return qChoices(correct, [div(mul(q(s), pow(f1.k, p)), q(b)), leading(params), ZERO], mix(f1.k.n, p, b, s, f1.base.length));
  },
};

/** The top's first two non-zero terms once the start has cancelled. */
function termsAfterCancel(params: LimitParams): Term[] {
  const out: Term[] = [];
  for (let j = params.p; j <= params.p + 4 && out.length < 2; j += 1) {
    const c = limitTop(params, j);
    if (!isZero(c)) out.push({ c, p: j });
  }
  return out;
}

/** `\frac{2^{2}}{2!}`, `-\frac{(-3)^{3}}{3!}`: the x^p coefficient of one function, unworked. */
function coefFormulaTex(f: Fn, p: number): string {
  const kp = powerToken(f.k, p);
  const unit = unitCoef(f.base, p);
  const sign = unit.n < 0 ? '-' : '';
  if (f.base === 'geo') return kp;
  return `${sign}\\frac{${kp}}{${f.base === 'ln' ? p : `${p}!`}}`;
}

/** Steps: the x^p coefficient of each function, their difference, then over b. */
const limitSumSteps: Generator<LimitParams> = {
  id: 'ser-limit-sum-steps',
  sample: (rng, difficulty) => sampleDoubleLimit(rng, difficulty > 1),
  render: (params): Slide => {
    const { f1, f2, p, b } = params;
    const v1 = coefOf(f1, p);
    const v2 = coefOf(f2!, p);
    const t2 = coefFormulaTex(f2!, p);
    const second = t2.startsWith('-') ? `(${t2})` : t2;
    const diff = sub(v1, v2);
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [];
    const start = b === 1 ? [coefFormulaTex(f1, p), '-', second] : ['(', coefFormulaTex(f1, p), '-', second, ')', '\\div', `${b}`];
    const o = b === 1 ? 0 : 1;
    reductions.push({ span: [o, o + 1], value: qTex(v1), bank: stepBank(qTex(v1), qTex(neg(v1)), qTex(pow(f1.k, p)), qTex(mul(v1, q(2)))) });
    reductions.push({ span: [o + 2, o + 3], value: inLine(v2), bank: stepBank(inLine(v2), inLine(neg(v2)), inLine(pow(f2!.k, p)), inLine(mul(v2, q(2)))) });
    reductions.push({
      span: [0, b === 1 ? 3 : 5],
      operator: o + 1,
      value: qTex(diff),
      bank: stepBank(qTex(diff), qTex(add(v1, v2)), qTex(sub(v2, v1)), qTex(mul(v1, v2))),
    });
    if (b !== 1) {
      const value = div(diff, q(b));
      reductions.push({ span: [0, 3], operator: 1, value: qTex(value), bank: stepBank(qTex(value), qTex(mul(diff, q(b))), qTex(neg(value)), qTex(sub(diff, q(b)))) });
    }
    return {
      kind: 'steps',
      prompt: [
        say(`Find the limit below. Below $x^{${p}}$ everything on top cancels, so the answer is the $x^{${p}}$ coefficient of each function, subtracted${b === 1 ? '' : `, then divided by $${b}$`}. Work it out.`),
        show(limitTex(params)),
      ],
      start,
      reductions,
    };
  },
  solution: (params) => {
    const { f1, f2, p, b } = params;
    return [
      { text: `The $x^{${p}}$ coefficient of $${fnTex(f1)}$ is $${coefFormulaTex(f1, p)} = ${qTex(coefOf(f1, p))}$, and of $${fnTex(f2!)}$ it is $${qTex(coefOf(f2!, p))}$.` },
      { text: `Everything below $x^{${p}}$ cancels with the terms taken off, so the top is $${monoTex(leading(params), p)} + \\cdots$.` },
      { tex: `${limitTex(params)} = \\frac{${qTex(leading(params))}}{${b}} = ${qTex(limitValue(params))}` },
    ];
  },
};

interface LimitFlowParams extends LimitParams {
  /** When set, the bottom is x + direct and nothing is 0/0. */
  direct?: number;
}

const LIMIT_OUTCOMES = ['is $0$', 'does not exist'];

/** Flow: 0/0 or not, the top's first power, then compare with the bottom. */
const limitFlow: Generator<LimitFlowParams> = {
  id: 'ser-limit-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const base = hard && rng.chance(0.4) ? sampleDoubleLimit(rng, true) : sampleSingleLimit(rng, hard);
    if (rng.chance(0.15)) return { ...base, direct: rng.int(1, 4) };
    const m = Math.max(1, base.p + rng.pick([-1, 0, 1]));
    return { ...base, m };
  },
  render: (params): Slide => {
    const { p, m, direct } = params;
    const value = limitValue(params);
    const labels = [LIMIT_OUTCOMES[0], `is $${qTex(value)}$`, LIMIT_OUTCOMES[1]];
    const right = p > m ? labels[0] : p === m ? labels[1] : labels[2];
    const bottom = direct ? `x + ${direct}` : denominatorTex(params);
    return {
      kind: 'flow',
      prompt: [say('Decide how to find this limit, and what it is.')],
      subject: `\\lim_{x \\to 0} \\frac{${numeratorTex(params)}}{${bottom}}`,
      steps: [
        {
          id: 'zero',
          ask: 'Put $x = 0$ into the top and the bottom. Do both come to $0$?',
          branches: [
            { label: 'Yes', to: 'lead' },
            { label: 'No', outcome: 'Then no series is needed: put $x = 0$ straight in.' },
          ],
        },
        {
          id: 'lead',
          ask: 'Expand the top as a series. Which power of $x$ does it start with?',
          branches: ['$x$', '$x^{2}$', '$x^{3}$'].map((label) => ({ label, to: 'compare' })),
        },
        {
          id: 'compare',
          ask: `Divide by $${bottom}$. So the limit`,
          branches: turned(labels, mix(p, m, value.n, value.d)).map((label) => ({ label, outcome: `So the limit ${label}.` })),
        },
      ],
      answer: direct ? ['No'] : ['Yes', p === 1 ? '$x$' : `$x^{${p}}$`, right],
    };
  },
  solution: (params) => {
    const { p, m, direct, b } = params;
    if (direct) {
      return [
        { text: `The bottom is $${direct}$ at $x = 0$, not $0$, so this is not $\\frac{0}{0}$: substitute directly.` },
        { tex: `\\frac{0}{${direct}} = 0` },
      ];
    }
    const lead = monoTex(leading(params), p);
    return [
      { text: `Both are $0$ at $x = 0$. The top's series starts $${lead} + \\cdots$.` },
      {
        text:
          p > m
            ? `Dividing by $${denominatorTex(params)}$ leaves a power of $x$ on top, so the limit is $0$.`
            : p === m
              ? `The powers match, so the limit is the ratio of the coefficients: $\\frac{${qTex(leading(params))}}{${b}} = ${qTex(limitValue(params))}$.`
              : `Dividing by $${denominatorTex(params)}$ leaves a power of $x$ underneath, which grows without limit near $0$: the limit does not exist.`,
      },
    ];
  },
};

/** Choice: what the top is roughly equal to, for small x. */
const leadingTerm: Generator<LimitParams> = {
  id: 'ser-leading-term',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleDoubleLimit(rng, true) : sampleSingleLimit(rng, false)),
  render: (params): Slide => {
    const { p, f1, s } = params;
    const c = leading(params);
    const one = (co: Q, power: number) => seriesOption([{ c: co, p: power }], false);
    const opts = formChoices(
      one(c, p),
      [one(c, p + 1), one(neg(c), p), one(mul(q(s), pow(f1.k, p)), p), one(c, Math.max(1, p - 1)), one(mul(c, q(2)), p)],
      mix(p, c.n, c.d, f1.k.n, s),
    );
    return choiceSlide([say(`For $x$ close to $0$, which is $${numeratorTex(params)}$ roughly equal to?`)], opts);
  },
  solution: (params) => [
    { text: 'Expand every function as a series. Everything below the lowest surviving power cancels:' },
    { tex: `${numeratorTex(params)} = ${seriesTex(termsAfterCancel(params))}` },
    { text: `For small $x$ the later powers are far smaller, so it is roughly $${monoTex(leading(params), params.p)}$.` },
  ],
};

/* ================================================================
 * Level 2, lesson 4: integrating a series
 * ================================================================ */

interface IntegrateParams {
  f: Fn;
}

const INT_CAP = 7;

/** The integrand's first three non-zero terms whose integrals stay at x^7 or below. */
const integrandTerms = (f: Fn): Term[] => termsOf(f, 3, INT_CAP - 1);

/** Each term integrated from 0 to x. */
const integrated = (f: Fn): Term[] => integrandTerms(f).map((t) => ({ c: div(t.c, q(t.p + 1)), p: t.p + 1 }));

function sampleIntegrand(rng: Rng, hard: boolean): Fn {
  for (;;) {
    const base = rng.pick<Base>(hard ? ['exp', 'geo', 'sin', 'cos', 'ln'] : ['exp', 'geo', 'cos', 'sin']);
    const m = base === 'ln' ? 1 : base === 'geo' ? 2 : rng.pick(hard ? [2, 2, 1] : [1, 2]);
    const k = hard ? rng.pick([q(2), q(-2), q(1, 2), q(-1, 2), q(3), q(-1), q(-3)]) : rng.pick([q(1), q(-1), q(2), q(-2), q(3), q(-3)]);
    const f = fnOf(base, k, { m });
    if (integrandTerms(f).length === 3) return f;
  }
}

/** Tiles: ∫_0^x f(t) dt, term by term. */
const intTiles: Generator<IntegrateParams> = {
  id: 'ser-int-tiles',
  sample: (rng, difficulty) => ({ f: sampleIntegrand(rng, difficulty > 1) }),
  render: ({ f }): Slide => {
    const terms = integrated(f);
    const answer = terms.map((t, i) => (i === 0 ? leadTile(t.c, t.p) : signedMono(t.c, t.p)));
    const slips: string[] = [];
    for (const [i, t] of integrandTerms(f).entries()) {
      const spell = (s: Term) => (i === 0 ? leadTile(s.c, s.p) : signedMono(s.c, s.p));
      slips.push(spell({ c: t.c, p: t.p + 1 }));
      if (t.p > 0) slips.push(spell({ c: div(t.c, q(t.p)), p: t.p + 1 }));
      slips.push(spell({ c: div(t.c, q(t.p + 1)), p: t.p }));
      slips.push(spell({ c: neg(div(t.c, q(t.p + 1))), p: t.p + 1 }));
    }
    return {
      kind: 'tiles',
      prompt: [say(`Integrate the series of $f(t) = ${fnTex(f, 't')}$ term by term to complete`), show(`f(t) = ${seriesTex(integrandTerms(f), 't')}`)],
      template: '\\int_0^x f(t)\\,dt = {0} {1} {2} + \\cdots',
      bank: termBank(answer, slips, 4),
      answer,
    };
  },
  solution: ({ f }) => [
    { text: 'Integrate each term from $0$ to $x$: $t^{n}$ becomes $\\frac{x^{n+1}}{n+1}$, and nothing is added at $t = 0$.' },
    { tex: `\\int_0^x f(t)\\,dt = ${seriesTex(integrated(f))}` },
  ],
};

interface IntStepsParams {
  f: Fn;
  h: Q;
}

/** A term's value at h, written unworked: `\frac{1}{10}(\frac{1}{2})^{5}`. */
function atTex(c: Q, p: number, h: Q): string {
  const x = h.d === 1 && h.n > 0 ? `${h.n}` : `(${qTex(h)})`;
  const power = p === 1 ? x : `${x}^{${p}}`;
  return eq(c, ONE) ? power : `${qTex(c)}${power}`;
}

/** Steps: ∫_0^h f(t) dt from three integrated terms, each evaluated, then added. */
const intSteps: Generator<IntStepsParams> = {
  id: 'ser-int-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const f = sampleIntegrand(rng, hard);
      const h = rng.pick(hard ? [q(1, 2), q(1, 3), q(1), q(2, 3)] : [q(1), q(1, 2)]);
      if (integrated(f).some((t) => mul(t.c, pow(h, t.p)).d > 5000)) continue;
      return { f, h };
    }
  },
  render: ({ f, h }): Slide => {
    const terms = integrated(f);
    const values = terms.map((t) => mul(t.c, pow(h, t.p)));
    const start: string[] = [atTex(terms[0].c, terms[0].p, h)];
    for (const t of terms.slice(1)) start.push(t.c.n < 0 ? '-' : '+', atTex(abs(t.c), t.p, h));
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = values.map((v, i) => {
      const shown = i === 0 ? v : abs(v);
      return {
        span: [2 * i, 2 * i + 1] as [number, number],
        value: qTex(shown),
        bank: stepBank(qTex(shown), qTex(neg(shown)), qTex(pow(h, terms[i].p)), qTex(mul(shown, q(terms[i].p)))),
      };
    });
    let total = values[0];
    for (const v of values.slice(1)) {
      const next = add(total, v);
      reductions.push({ span: [0, 3], operator: 1, value: qTex(next), bank: stepBank(qTex(next), qTex(sub(total, v)), qTex(neg(next)), qTex(add(next, ONE))) });
      total = next;
    }
    return {
      kind: 'steps',
      prompt: [
        say(`Estimate $\\int_0^{${qTex(h)}} ${fnTex(f, 't')}\\,dt$ from the first three terms of its series. The line puts $x = ${qTex(h)}$ into each term; work it out.`),
        show(`\\int_0^x ${fnTex(f, 't')}\\,dt = ${seriesTex(terms)}`),
      ],
      start,
      reductions,
    };
  },
  solution: ({ f, h }) => {
    const terms = integrated(f);
    const values = terms.map((t) => mul(t.c, pow(h, t.p)));
    const total = values.reduce(add, ZERO);
    return [
      { text: `Put $x = ${qTex(h)}$ into each term of the integrated series:` },
      { tex: values.map((v, i) => (i === 0 ? qTex(v) : inLine(v))).join(' + ') + ` = ${qTex(total)}` },
      { text: `So the integral is about $${qTex(total)} \\approx ${dec(val(total))}$, although the integrand itself has no antiderivative you could write down.` },
    ];
  },
};

/** Tree: the integrand's coefficients on top, the integral's underneath. */
const intTree: Generator<IntegrateParams> = {
  id: 'ser-int-terms-tree',
  sample: (rng, difficulty) => ({ f: sampleIntegrand(rng, difficulty > 1) }),
  render: ({ f }): Slide => {
    const before = integrandTerms(f);
    const after = integrated(f);
    const answer = [...before.map((t) => t.c), ...after.map((t) => t.c)];
    const slips = [...before.map((t) => (t.p > 0 ? div(t.c, q(t.p)) : neg(t.c))), ...after.map((t) => neg(t.c)), ...before.map((t) => mul(t.c, q(t.p + 1)))];
    const ps = before.map((t) => t.p);
    return {
      kind: 'tree',
      prompt: [
        say(
          `Integrate $f(t) = ${fnTex(f, 't')}$ term by term. Top row, left to right: the coefficients of $${ps.map((p) => powerTex(p, 't') || '1').join('$, $')}$ in its series. Underneath: the coefficients of $${ps.map((p) => powerTex(p + 1, 'x')).join('$, $')}$ in $\\int_0^x f(t)\\,dt$.`,
        ),
      ],
      expression: `\\int_0^x t^{n}\\,dt = \\frac{x^{n+1}}{n+1}`,
      nodes: [...before.map((_, i) => ({ id: `a${i}`, from: [] as string[] })), ...before.map((_, i) => ({ id: `b${i}`, from: [`a${i}`] }))],
      bank: qBank(answer, slips, 3),
      answer: answer.map(qTex),
    };
  },
  solution: ({ f }) => [
    { tex: `f(t) = ${seriesTex(integrandTerms(f), 't')}` },
    { text: 'Each $t^{n}$ integrates to $\\frac{x^{n+1}}{n+1}$, so each coefficient is divided by its new power:' },
    { tex: `\\int_0^x f(t)\\,dt = ${seriesTex(integrated(f))}` },
  ],
};

interface IntCoefParams {
  f: Fn;
  /** Which of the three integrated terms: 1 or 2. */
  which: number;
}

/** Expression: one coefficient of the integrated series, typed. */
const intCoef: Generator<IntCoefParams> = {
  id: 'ser-int-coef',
  sample: (rng, difficulty) => ({ f: sampleIntegrand(rng, difficulty > 1), which: rng.int(1, 2) }),
  render: ({ f, which }): Slide => {
    const t = integrated(f)[which];
    return {
      kind: 'expression',
      prompt: [say(`Find the coefficient of $x^{${t.p}}$ in the series of $\\int_0^x ${fnTex(f, 't')}\\,dt$.`)],
      lead: `a_{${t.p}} =`,
      keypad: FRACTION_KEYS,
      answer: qAns(t.c),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ f, which }) => {
    const before = integrandTerms(f)[which];
    const after = integrated(f)[which];
    return [
      { text: `The $x^{${after.p}}$ term comes from the $t^{${before.p}}$ term of the integrand, $${monoTex(before.c, before.p, 't')}$.` },
      { tex: `\\int_0^x ${monoTex(before.c, before.p, 't')}\\,dt = ${monoTex(after.c, after.p)}` },
    ];
  },
  choices: ({ f, which }) => {
    const before = integrandTerms(f)[which];
    const after = integrated(f)[which];
    return qChoices(after.c, [before.c, div(before.c, q(before.p)), mul(before.c, q(after.p))], saltOf(f, which));
  },
};

/* ================================================================
 * Level 2, lesson 5: where a series is valid
 * ================================================================ */

type LineForm = 'ln' | 'geo' | 'lnShift' | 'geoShift' | 'lnTaylor' | 'recipTaylor';

interface LineParams {
  form: LineForm;
  /** u = k x for the Maclaurin forms. */
  k: Q;
  /** The shift a in ln(a + x) and 1/(a - x), or the centre of a Taylor form. */
  a: number;
  min: number;
  max: number;
  step: number;
}

/** The function and the words for its series. */
function lineFn({ form, k, a }: Pick<LineParams, 'form' | 'k' | 'a'>): { tex: string; about: string } {
  switch (form) {
    case 'ln':
      return { tex: fnTex(fnOf('ln', k)), about: 'Maclaurin series' };
    case 'geo':
      return { tex: fnTex(fnOf('geo', k)), about: 'Maclaurin series' };
    case 'lnShift':
      return { tex: `\\ln(${a} ${plus(uTex(mul(k, q(a))))})`, about: 'Maclaurin series' };
    case 'geoShift':
      return { tex: `\\frac{1}{${a} ${minus(uTex(mul(k, q(a))))}}`, about: 'Maclaurin series' };
    case 'lnTaylor':
      return { tex: `\\ln ${xPlus(1 - a) === 'x' ? 'x' : `(${xPlus(1 - a)})`}`, about: `Taylor series about $x = ${a}$` };
    case 'recipTaylor':
      return { tex: `\\frac{1}{${xPlus(1 - a)}}`, about: `Taylor series about $x = ${a}$` };
  }
}

/** Where the series holds, as an interval in x. */
function lineRange({ form, k, a }: Pick<LineParams, 'form' | 'k' | 'a'>): Interval {
  if (form === 'lnTaylor') return { lo: q(a - 1), hi: q(a + 1), loIn: false, hiIn: true };
  if (form === 'recipTaylor') return { lo: q(a - 1), hi: q(a + 1), loIn: false, hiIn: false };
  return rangeOf(form === 'geo' || form === 'geoShift' ? 'geo' : 'ln', k)!;
}

const setOf = ({ lo, hi, loIn, hiIn }: Interval): string =>
  canonicalSet(`${loIn ? '[' : '('}${val(lo)},${val(hi)}${hiIn ? ']' : ')'}`)!;

function sampleLine(rng: Rng, hard: boolean): Omit<LineParams, 'min' | 'max' | 'step'> {
  const form = rng.pick<LineForm>(hard ? ['lnShift', 'geoShift', 'lnTaylor', 'recipTaylor', 'ln', 'geo'] : ['ln', 'geo', 'lnTaylor', 'recipTaylor']);
  if (form === 'lnShift' || form === 'geoShift') {
    const a = rng.int(2, 4);
    return { form, k: q(rng.sign(), a), a };
  }
  if (form === 'lnTaylor' || form === 'recipTaylor') return { form, k: ONE, a: rng.int(-2, 3) };
  return { form, k: rng.pick([q(1), q(-1), q(2), q(-2), q(1, 2), q(-1, 2), q(1, 3), q(-1, 3)]), a: 1 };
}

/** Number line: shade the values of x where the series is valid. */
const validLine: Generator<LineParams> = {
  id: 'ser-valid-line',
  sample: (rng, difficulty) => {
    const base = sampleLine(rng, difficulty > 1);
    const range = lineRange(base);
    const half = range.lo.d !== 1 || range.hi.d !== 1;
    const step = half ? 0.5 : 1;
    const { min, max } = windowFor(rng, val(range.lo), val(range.hi), half ? 6 : 10, step);
    return { ...base, min, max, step };
  },
  render: (params): Slide => {
    const { tex, about } = lineFn(params);
    return {
      kind: 'numberLine',
      prompt: [say(`Draw the values of $x$ for which the ${about} of $${tex}$ is valid. Mind which ends are included.`)],
      min: params.min,
      max: params.max,
      step: params.step,
      answer: setOf(lineRange(params)),
    };
  },
  solution: (params) => {
    const range = lineRange(params);
    const { tex } = lineFn(params);
    const taylor = params.form === 'lnTaylor' || params.form === 'recipTaylor';
    return [
      {
        text: taylor
          ? `About $x = ${params.a}$ the series is in $h = x ${params.a < 0 ? '+' : '-'} ${Math.abs(params.a)}$, and $${tex}$ becomes ${params.form === 'lnTaylor' ? '$\\ln(1 + h)$, valid for $-1 < h \\le 1$' : '$\\frac{1}{1 + h}$, valid for $-1 < h < 1$'}.`
          : `Write it with $u = ${uTex(params.k)}$ and use where the standard series holds: ${params.form.startsWith('ln') ? '$-1 < u \\le 1$' : '$-1 < u < 1$'}.`,
      },
      { tex: rangeTex(range) },
      { text: `${range.loIn ? 'A filled' : 'A hollow'} dot at $${qTex(range.lo)}$, ${range.hiIn ? 'a filled' : 'a hollow'} dot at $${qTex(range.hi)}$, and the stretch between shaded.` },
    ];
  },
};

interface RangeFlowParams {
  ln: boolean;
  a: number;
  b: number;
}

/** Flow: take out a, find u, where u may go, and so where x may go. */
const rangeFlow: Generator<RangeFlowParams> = {
  id: 'ser-range-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = rng.int(2, difficulty > 1 ? 6 : 5);
      const b = nonZero(rng, -3, 3);
      if (Math.abs(b) === a || a === b * b || (difficulty > 1 && b === 1)) continue;
      return { ln: rng.chance(0.5), a, b };
    }
  },
  render: ({ ln, a, b }): Slide => {
    const k = q(b, a);
    const tex = ln ? `\\ln(${a} ${plus(uTex(q(b)))})` : `\\frac{1}{${a} ${minus(uTex(q(b)))}}`;
    const uLabels = [uTex(k), uTex(q(a, b)), uTex(q(b))].map((u) => `$u = ${u}$`);
    const right = rangeOf(ln ? 'ln' : 'geo', k)!;
    const r = div(ONE, abs(k));
    const xLabels = [
      rangeTex(right),
      rangeTex({ ...right, lo: neg(abs(k)), hi: abs(k) }),
      rangeTex({ lo: neg(r), hi: r, loIn: !right.loIn, hiIn: !right.hiIn }),
    ].map((t) => `$${t}$`);
    return {
      kind: 'flow',
      prompt: [say(`Find where the Maclaurin series of this function is valid, by taking out $${a}$ first.`)],
      subject: `f(x) = ${tex}`,
      steps: [
        {
          id: 'u',
          ask: `Take out $${a}$. Which standard function of which $u$ is left?`,
          branches: turned(uLabels, mix(a, b, 1)).map((label) => ({ label, to: 'urange' })),
        },
        {
          id: 'urange',
          ask: `The series for ${ln ? '$\\ln(1 + u)$' : '$\\frac{1}{1 - u}$'} holds for`,
          branches: turned(RANGE_LABELS, mix(a, b, 2)).map((label) => ({ label, to: 'xrange' })),
        },
        {
          id: 'xrange',
          ask: 'So the series in $x$ is valid for',
          branches: turned(xLabels, mix(a, b, 3)).map((label) => ({ label, outcome: `So the series is valid for ${label}.` })),
        },
      ],
      answer: [uLabels[0], RANGE_LABELS[ln ? 0 : 2], xLabels[0]],
    };
  },
  solution: ({ ln, a, b }) => {
    const k = q(b, a);
    const u = uTex(k);
    return [
      {
        tex: ln
          ? `\\ln(${a} ${plus(uTex(q(b)))}) = \\ln ${a} + \\ln(1 ${plus(u)})`
          : `\\frac{1}{${a} ${minus(uTex(q(b)))}} = \\frac{1}{${a}} \\times \\frac{1}{1 ${minus(u)}}`,
      },
      { text: `So $u = ${u}$, and the series holds for ${ln ? '$-1 < u \\le 1$' : '$-1 < u < 1$'}. Solve for $x$${b < 0 ? ', turning the inequalities round when dividing by a negative' : ''}:` },
      { tex: rangeTex(rangeOf(ln ? 'ln' : 'geo', k)!) },
    ];
  },
};

interface PickParams {
  form: LineForm;
  k: Q;
  a: number;
  /** A salt choosing the one value inside. */
  pick: number;
}

/** Choice: which of four values of x the series can be used at. */
const validPick: Generator<PickParams> = {
  id: 'ser-valid-pick',
  sample: (rng, difficulty) => ({ ...sampleLine(rng, difficulty > 1), pick: rng.int(0, 5) }),
  render: (params): Slide => {
    const range = lineRange(params);
    const mid = div(add(range.lo, range.hi), q(2));
    const half = div(sub(range.hi, range.lo), q(2));
    const inside = (x: Q) =>
      (range.loIn ? val(x) >= val(range.lo) : val(x) > val(range.lo)) && (range.hiIn ? val(x) <= val(range.hi) : val(x) < val(range.hi));
    const candidates = [
      range.lo,
      range.hi,
      add(mid, div(half, q(2))),
      sub(mid, div(half, q(2))),
      add(range.hi, half),
      sub(range.lo, half),
      add(range.hi, q(1, 2)),
      sub(range.lo, q(1, 2)),
    ];
    const ins = candidates.filter(inside);
    const outs = candidates.filter((x) => !inside(x));
    const right = ins[params.pick % ins.length];
    const opt = (x: Q) => ({ tex: `x = ${qTex(x)}`, key: `${x.n}/${x.d}` });
    const opts = formChoices(opt(right), outs.map(opt), mix(right.n, right.d, params.a, params.k.n, params.k.d));
    const { tex, about } = lineFn(params);
    return choiceSlide([say(`At which of these values of $x$ can the ${about} of $${tex}$ be used?`)], opts);
  },
  solution: (params) => {
    const range = lineRange(params);
    return [
      { text: `The series is valid for $${rangeTex(range)}$.` },
      { text: `Check each value against that, including whether an end is allowed: ${range.loIn ? `$${qTex(range.lo)}$ is` : `$${qTex(range.lo)}$ is not`} and ${range.hiIn ? `$${qTex(range.hi)}$ is` : `$${qTex(range.hi)}$ is not`}.` },
    ];
  },
};

/** Tiles: write the range of validity, ends and signs. */
const validTiles: Generator<Omit<LineParams, 'min' | 'max' | 'step'>> = {
  id: 'ser-valid-tiles',
  sample: (rng, difficulty) => sampleLine(rng, difficulty > 1),
  render: (params): Slide => {
    const range = lineRange(params);
    const rel = (inside: boolean) => (inside ? '\\le' : '<');
    const answer = [qTex(range.lo), rel(range.loIn), rel(range.hiIn), qTex(range.hi)];
    const width = sub(range.hi, range.lo);
    const slips = [rel(!range.loIn), rel(!range.hiIn), qTex(neg(range.hi)), qTex(neg(range.lo)), qTex(add(range.hi, width)), qTex(sub(range.lo, width)), '0'];
    const { tex, about } = lineFn(params);
    return {
      kind: 'tiles',
      prompt: [say(`Complete the values of $x$ for which the ${about} of $${tex}$ is valid.`)],
      template: '{0} {1} x {2} {3}',
      bank: termBank(answer, slips, 3),
      answer,
    };
  },
  solution: (params) => validLine.solution({ ...params, min: 0, max: 0, step: 1 }).slice(0, 2),
};

/** The generators by name, for `seriesExpansions.test.ts`. */
export const seriesByName = {
  coefTree,
  coefTyped,
  firstTermsTiles,
  whichFlow,
  expTiles,
  expSteps,
  expTerm,
  expSlider,
  trigTiles,
  trigSignFlow,
  trigCycleTree,
  trigPick,
  logTiles,
  logCoefGen,
  logValidFlow,
  logRange,
  subTiles,
  subTree,
  multiplySteps,
  productCoefGen,
  taylorTree,
  taylorTiles,
  taylorCoef,
  taylorCentre,
  estimateTree,
  droppedTerm,
  estimatePick,
  estimateSlider,
  limitGen,
  limitSumSteps,
  limitFlow,
  leadingTerm,
  intTiles,
  intSteps,
  intTree,
  intCoef,
  validLine,
  rangeFlow,
  validPick,
  validTiles,
};

/* ---------- Fitting a phone ---------- */

/**
 * Roughly how many characters wide a line of TeX renders, counting a fraction
 * as its wider half and a function name as its letters. The same measure as
 * Trig Identities' `fit`: only good enough to tell a line that fits a phone
 * from one that would scroll sideways.
 */
function texWidth(tex: string): number {
  let s = tex;
  for (;;) {
    const next = s.replace(/\\d?t?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) => `${a.length > b.length ? a : b}xx`);
    if (next === s) break;
    s = next;
  }
  return s
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\(left|right)/g, 'x')
    .replace(/\\(,|;|!)/g, '')
    .replace(/\\qquad/g, 'xxxx')
    .replace(/\\quad/g, 'xx')
    .replace(/\\([a-zA-Z]+)/g, (_m, w: string) => (w.length > 3 ? 'xx' : w))
    .replace(/[=+]| - /g, 'xx')
    .replace(/[{}\s^_]/g, '').length;
}

/** The widest line, by `texWidth`, that sits on a 393-pixel screen without scrolling. */
const FIT = 22;

/** Splits at `sep` wherever it is outside every bracket and brace. */
function splitTop(tex: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tex.length; i += 1) {
    const ch = tex[i];
    if (ch === '{' || ch === '(') depth += 1;
    else if (ch === '}' || ch === ')') depth -= 1;
    else if (depth === 0 && tex.startsWith(sep, i)) {
      out.push(tex.slice(start, i).trim());
      start = i + sep.length;
      i += sep.length - 1;
    }
  }
  out.push(tex.slice(start).trim());
  return out;
}

/** Packs pieces greedily into lines no wider than `limit`, joined by `join`. */
function pack(pieces: string[], join: string, limit: number): string[] {
  const lines: string[] = [];
  for (const piece of pieces) {
    const last = lines.length - 1;
    if (last >= 0 && texWidth(`${lines[last]}${join}${piece}`) <= limit) lines[last] = `${lines[last]}${join}${piece}`;
    else lines.push(piece);
  }
  return lines;
}

/**
 * Breaks a long run of terms before an operator: a sum before a plus or
 * minus first, and only a piece still too wide after that inside a product,
 * so `a \times b + c \times d` never splits `c` from `d`.
 */
function breakTerms(tex: string, limit = FIT - 5, groups: string[][] = [[' + ', ' - '], [' \\times ']]): string[] {
  if (texWidth(tex) <= limit || groups.length === 0) return [tex];
  let terms = [tex];
  for (const op of groups[0]) {
    terms = terms.flatMap((term) => {
      const [head, ...tail] = splitTop(term, op);
      return [head, ...tail.map((t) => `${op.trim()} ${t}`)];
    });
  }
  return pack(terms, ' ', limit).flatMap((line) => breakTerms(line, limit, groups.slice(1)));
}

/** One `L = R1 = R2` chain as aligned rows, each `=` under the last. */
function chainRows(tex: string): string[] {
  const [lhs, ...rhs] = splitTop(tex, ' = ');
  const pieces = (side: string, lead: string, limit = FIT - 5) =>
    breakTerms(side, limit).map((piece, j) => (j === 0 ? `${lead}${piece}` : `& \\quad {} ${piece}`));
  if (rhs.length === 0) return pieces(tex, '& ', FIT);
  // A short left-hand side shares the first row, so that row has less room.
  const beside = Math.max(8, FIT - 3 - texWidth(lhs));
  if (texWidth(tex) <= FIT) return [`${lhs} &= ${rhs.join(' = ')}`];
  const own = texWidth(lhs) > FIT / 2 || (rhs.length === 1 && breakTerms(rhs[0]).length === 1);
  return [...(own ? pieces(lhs, '& ', FIT) : []), ...rhs.flatMap((side, i) => (i === 0 && !own ? pieces(side, `${lhs} &= `, beside) : pieces(side, '&= ')))];
}

/**
 * A fraction whose top is too wide, with the top stacked over two or more
 * lines. A limit's numerator is a whole sum of series, and a fraction cannot
 * be broken at its equals sign.
 */
function stackFractions(tex: string): string {
  let out = '';
  let i = 0;
  while (i < tex.length) {
    if (!tex.startsWith('\\frac{', i)) {
      out += tex[i];
      i += 1;
      continue;
    }
    const top = braced(tex, i + 5);
    const bottom = braced(tex, top.end);
    const rows = texWidth(top.body) > FIT - 4 ? breakTerms(top.body, FIT - 6) : [top.body];
    const body = rows.length > 1 ? `\\begin{gathered} ${rows.join(' \\\\ ')} \\end{gathered}` : top.body;
    out += `\\frac{${body}}{${bottom.body}}`;
    i = bottom.end;
  }
  return out;
}

/** The body of the `{...}` group opening at `open`, and where it ends. */
function braced(tex: string, open: number): { body: string; end: number } {
  let depth = 0;
  for (let i = open; i < tex.length; i += 1) {
    if (tex[i] === '{') depth += 1;
    if (tex[i] === '}') {
      depth -= 1;
      if (depth === 0) return { body: tex.slice(open + 1, i), end: i + 1 };
    }
  }
  return { body: tex.slice(open + 1), end: tex.length };
}

/**
 * A line of working too wide for a phone, stacked: a list one group of items
 * per row, a chain of equals signs one per row, and a long sum broken before a
 * plus or minus. A line that already fits is left alone.
 */
function fit(tex: string): string {
  if (tex.includes('\\begin') || texWidth(tex) <= FIT) return tex;
  // A list of values: as many to a row as fit.
  if (splitTop(tex, ', \\;').length > 1 && !tex.includes(' = ')) {
    const rows = pack(splitTop(tex, ', \\;'), ', \\; ', FIT);
    return `\\begin{gathered} ${rows.map((row, i) => (i < rows.length - 1 ? `${row},` : row)).join(' \\\\ ')} \\end{gathered}`;
  }
  const rows = splitTop(tex, ', \\quad').flatMap((part) => chainRows(part));
  const stacked = rows.map((row) => (texWidth(row) > FIT ? stackFractions(row) : row));
  return stacked.length === 1 && !stacked[0].includes('&') ? stacked[0] : `\\begin{aligned} ${stacked.join(' \\\\ ')} \\end{aligned}`;
}

/** The same generator, with every display and every line of working fitted to a phone. */
function fitted<P>(generator: Generator<P>): Generator<P> {
  return {
    ...generator,
    render: (params) => {
      const slide = generator.render(params);
      if (!('prompt' in slide)) return slide;
      return {
        ...slide,
        ...(slide.kind === 'flow' ? { subject: fit(slide.subject) } : {}),
        ...(slide.kind === 'tree' ? { expression: fit(slide.expression) } : {}),
        prompt: slide.prompt.map((block): Block => (block.kind === 'display' ? { ...block, tex: fit(block.tex) } : block)),
      };
    },
    solution: (params) => generator.solution(params).map((step) => (step.tex ? { ...step, tex: fit(step.tex) } : step)),
  };
}

export const seriesExpansionGenerators = Object.values(seriesByName).map((generator) => fitted(generator as Generator<never>));
