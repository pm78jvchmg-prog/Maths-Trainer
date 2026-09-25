/**
 * Contest Math, level 14: Polynomials.
 *
 * Four lessons: roots (the remainder and factor theorems, p(1) as the sum of
 * the coefficients, whole-number roots dividing the constant), equations
 * (a quartic that is a quadratic in x², two quadratics sharing a root, x + 1/x,
 * a cubic that takes one value three times), Vieta's formulas, and
 * transformations (new roots from old without finding either).
 *
 * The idea in each is to never solve the polynomial: substitute one number,
 * subtract one equation from another, or read the sum and product of the roots
 * straight off the coefficients.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import { FRACTION_KEYS, fracAnswer, fracTex, num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ================================================================
 * Shared pieces
 * ================================================================ */

/** Terms as [coefficient, monomial], `''` for a constant; zero terms dropped. */
function termsTex(terms: [number, string][]): string {
  const out: string[] = [];
  for (const [c, mono] of terms) {
    if (c === 0) continue;
    const abs = Math.abs(c);
    const body = mono === '' ? `${abs}` : abs === 1 ? mono : `${abs}${mono}`;
    if (out.length === 0) out.push(c < 0 ? `-${body}` : body);
    else out.push(c < 0 ? `- ${body}` : `+ ${body}`);
  }
  return out.length ? out.join(' ') : '0';
}

const mono = (power: number, v: string) => (power === 0 ? '' : power === 1 ? v : `${v}^{${power}}`);

/** Coefficients, highest power first, as TeX: `[1, -4, 5, -7]` is `x^{3} - 4x^{2} + 5x - 7`. */
function polyTex(coeffs: number[], v = 'x'): string {
  const deg = coeffs.length - 1;
  return termsTex(coeffs.map((c, i) => [c, mono(deg - i, v)]));
}

/** p(x) by Horner's rule. */
function evalPoly(coeffs: number[], x: number): number {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

/** The value of each non-zero term at x, highest power first. */
function termValues(coeffs: number[], x: number): number[] {
  const deg = coeffs.length - 1;
  return coeffs.flatMap((c, i) => (c === 0 ? [] : [c * x ** (deg - i)]));
}

/** `27 - 36 + 15 - 7`. */
function signedJoin(values: number[]): string {
  return values.map((v, i) => (i === 0 ? `${v}` : v < 0 ? `- ${-v}` : `+ ${v}`)).join(' ');
}

const bracket = (v: number) => (v < 0 ? `(${v})` : `${v}`);

/** `x - 3` or `x + 2`, the factor that is zero at `root`. */
const factorTex = (root: number) => (root === 0 ? 'x' : root > 0 ? `x - ${root}` : `x + ${-root}`);

/** The same with brackets, `x` alone left bare. */
const factorBracket = (root: number) => (root === 0 ? 'x' : `(${factorTex(root)})`);

/**
 * Four fractions: the answer and the first three slips of a different value,
 * topped up with the answer plus or minus a whole number.
 */
function fractionOptions(correct: [number, number], slips: [number, number][]): ChoiceOption[] {
  const value = ([p, q]: [number, number]) => p / q;
  const seen = [value(correct)];
  const picked: [number, number][] = [];
  const [p, q] = correct;
  const tops: [number, number][] = [...slips, [p + q, q], [p - q, q], [p + 2 * q, q], [p - 2 * q, q], [p + 3 * q, q]];
  for (const f of tops) {
    if (picked.length === 3) break;
    if (f[1] === 0 || !Number.isFinite(value(f))) continue;
    if (seen.some((v) => Math.abs(v - value(f)) < 1e-9)) continue;
    seen.push(value(f));
    picked.push(f);
  }
  return options(
    { tex: fracTex(p, q), answer: fracAnswer(p, q) },
    ...picked.sort((x, y) => value(x) - value(y)).map(([a, b]) => ({ tex: fracTex(a, b), answer: fracAnswer(a, b) })),
  );
}

/** A non-zero whole number in [lo, hi]. */
function nonZero(rng: { int(a: number, b: number): number }, lo: number, hi: number): number {
  for (;;) {
    const v = rng.int(lo, hi);
    if (v !== 0) return v;
  }
}

/* ================================================================
 * Lesson 1: Roots
 * ================================================================ */

/* ---------- the remainder theorem ---------- */

interface RemainderParams {
  coeffs: number[];
  /** Divide by x - root. */
  root: number;
}

const cmPoRemainder: Generator<RemainderParams> = {
  id: 'cm-po-remainder',
  sample(rng, difficulty) {
    for (;;) {
      const root = difficulty >= 2 ? -rng.int(1, 3) : rng.int(1, 4);
      const coeffs = [rng.int(1, 2), nonZero(rng, -9, 9), rng.int(-9, 9), nonZero(rng, -9, 9)];
      const v = evalPoly(coeffs, root);
      if (v === 0 || Math.abs(v) > 150 || v === evalPoly(coeffs, -root)) continue;
      return { coeffs, root };
    }
  },
  render({ coeffs, root }) {
    return typed(
      [say('Find the remainder when'), show(polyTex(coeffs)), say(`is divided by $${factorTex(root)}$.`)],
      evalPoly(coeffs, root),
      '\\text{remainder} =',
    );
  },
  choices({ coeffs, root }) {
    return numberOptions(evalPoly(coeffs, root), [evalPoly(coeffs, -root), coeffs[3], evalPoly(coeffs, 1)], 1, -Infinity);
  },
  solution({ coeffs, root }) {
    const steps: SolutionStep[] = [
      { text: `$${factorTex(root)}$ is zero when $x = ${root}$, so by the remainder theorem the remainder is $p(${root})$:` },
      { tex: `p(${root}) = ${signedJoin(termValues(coeffs, root))}` },
      { tex: `p(${root}) = ${evalPoly(coeffs, root)}` },
    ];
    if (root < 0) steps.push({ text: `Working out $p(${-root})$ is the trap: $x + ${-root}$ is zero at $x = ${root}$.` });
    return steps;
  },
};

/* ---------- an unknown coefficient from a factor or a remainder ---------- */

interface FindKParams {
  /** p(x) = x^3 + b x^2 + k x + d, divided by x - a, leaving rem. */
  a: number;
  b: number;
  k: number;
  d: number;
  rem: number;
}

const findKPoly = ({ b, d }: FindKParams) => `${polyTex([1, b, 0, 0])} + kx ${d < 0 ? '-' : '+'} ${Math.abs(d)}`;

const cmPoFindK: Generator<FindKParams> = {
  id: 'cm-po-find-k',
  sample(rng, difficulty) {
    for (;;) {
      const a = difficulty >= 2 ? nonZero(rng, -3, 3) : rng.pick([1, 2, 3, -1, -2]);
      const b = rng.int(-6, 6);
      const k = nonZero(rng, -12, 12);
      const rem = difficulty >= 2 ? nonZero(rng, -12, 12) : 0;
      const d = rem - a ** 3 - b * a * a - k * a;
      if (d === 0 || Math.abs(d) > 60) continue;
      return { a, b, k, d, rem };
    }
  },
  render(p) {
    const lead =
      p.rem === 0
        ? say(`For what value of $k$ is $${factorTex(p.a)}$ a factor of the polynomial below?`)
        : say(`The polynomial below leaves a remainder of ${p.rem} when divided by $${factorTex(p.a)}$. Find $k$.`);
    return typed([lead, show(findKPoly(p))], p.k, 'k =');
  },
  choices(p) {
    // Substituting the wrong sign, and (with a remainder) forgetting it.
    const wrongSign = (p.rem - (-p.a) ** 3 - p.b * p.a * p.a - p.d) / -p.a;
    const noRem = (-(p.a ** 3) - p.b * p.a * p.a - p.d) / p.a;
    return numberOptions(p.k, [wrongSign, ...(p.rem !== 0 ? [noRem] : []), -p.k], 1, -Infinity);
  },
  solution(p) {
    const constant = p.a ** 3 + p.b * p.a * p.a + p.d;
    const terms: [number, string][] = [
      [p.a ** 3, ''],
      [p.b * p.a * p.a, ''],
      [p.a, 'k'],
      [p.d, ''],
    ];
    const steps: SolutionStep[] = [
      {
        text:
          p.rem === 0
            ? `A factor means a remainder of $0$, so $p(${p.a}) = 0$:`
            : `By the remainder theorem, $p(${p.a})$ is the remainder, ${p.rem}:`,
      },
      { tex: `${termsTex(terms)} = ${p.rem}` },
    ];
    if (p.a !== 1) steps.push({ tex: `${termsTex([[p.a, 'k']])} = ${p.rem - constant}` });
    steps.push({ tex: `k = ${p.k}` });
    return steps;
  },
};

/* ---------- p(1) is the sum of the coefficients ---------- */

interface SumCoeffsParams {
  f: number[];
  m: number;
  g: number[];
  n: number;
  /** Difficulty 2: only the even powers. */
  even: boolean;
}

const productAt = ({ f, m, g, n }: SumCoeffsParams, x: number) => evalPoly(f, x) ** m * evalPoly(g, x) ** n;

function sumCoeffsAnswer(p: SumCoeffsParams): number {
  return p.even ? (productAt(p, 1) + productAt(p, -1)) / 2 : productAt(p, 1);
}

function smallFactor(rng: Parameters<Generator['sample']>[0]): number[] {
  return rng.chance(0.5) ? [rng.int(1, 3), nonZero(rng, -4, 4)] : [1, nonZero(rng, -5, 5), nonZero(rng, -5, 5)];
}

const cmPoSumCoeffs: Generator<SumCoeffsParams> = {
  id: 'cm-po-sum-coeffs',
  sample(rng, difficulty) {
    for (;;) {
      const f = smallFactor(rng);
      const g = smallFactor(rng);
      if (f.length === g.length && f.every((c, i) => c === g[i])) continue;
      const p = { f, m: rng.int(2, 6), g, n: rng.int(2, 5), even: difficulty >= 2 };
      const at1 = productAt(p, 1);
      const atMinus = productAt(p, -1);
      if (at1 === 0 || Math.abs(at1) > 5000 || Math.abs(atMinus) > 5000) continue;
      if (p.even && (atMinus === 0 || sumCoeffsAnswer(p) === 0 || sumCoeffsAnswer(p) === at1)) continue;
      return p;
    }
  },
  render(p) {
    const what = p.even
      ? 'When this is multiplied out, what do the coefficients of the even powers of $x$ add to? Count the constant term as an even power.'
      : 'When this is multiplied out, what do all its coefficients add to, the constant term included?';
    return typed([show(`(${polyTex(p.f)})^{${p.m}}(${polyTex(p.g)})^{${p.n}}`), say(what)], sumCoeffsAnswer(p), '\\text{sum} =');
  },
  choices(p) {
    const at1 = productAt(p, 1);
    const atMinus = productAt(p, -1);
    const slips = p.even
      ? [at1, (at1 - atMinus) / 2, atMinus]
      : [atMinus, productAt(p, 0), p.f[0] ** p.m * p.g[0] ** p.n];
    return numberOptions(sumCoeffsAnswer(p), slips, 1, -Infinity);
  },
  solution(p) {
    const f1 = evalPoly(p.f, 1);
    const g1 = evalPoly(p.g, 1);
    const at1 = productAt(p, 1);
    const steps: SolutionStep[] = [
      { text: `Call the product $p(x)$. At $x = 1$ every power of $x$ is $1$, so $p(1)$ adds up the coefficients. The brackets become ${f1} and ${g1}:` },
      { tex: `p(1) = ${bracket(f1)}^{${p.m}} \\times ${bracket(g1)}^{${p.n}} = ${at1}` },
    ];
    if (!p.even) return steps;
    const fm = evalPoly(p.f, -1);
    const gm = evalPoly(p.g, -1);
    const atMinus = productAt(p, -1);
    steps.push(
      { text: `At $x = -1$ the even powers are still $1$ but the odd powers are $-1$. The brackets become ${fm} and ${gm}:` },
      { tex: `p(-1) = ${bracket(fm)}^{${p.m}} \\times ${bracket(gm)}^{${p.n}} = ${atMinus}` },
      { text: 'Adding the two cancels the odd powers and counts the even ones twice, so halve it:' },
      { tex: `\\tfrac{1}{2}(${at1} + ${bracket(atMinus)}) = ${sumCoeffsAnswer(p)}` },
    );
    return steps;
  },
};

/* ---------- whole-number roots divide the constant, as tiles ---------- */

interface IntRootsParams {
  roots: [number, number, number];
}

const cubicFromRoots = ([r, s, t]: number[]) => [1, -(r + s + t), r * s + r * t + s * t, -r * s * t];

const cmPoIntegerRoots: Generator<IntRootsParams> = {
  id: 'cm-po-integer-roots',
  sample(rng, difficulty) {
    const pool = difficulty >= 2 ? [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7] : [-4, -3, -2, -1, 1, 2, 3, 4, 5];
    for (;;) {
      const roots = rng.sample(pool, 3).sort((a, b) => a - b) as [number, number, number];
      if (Math.abs(roots[0] * roots[1] * roots[2]) > 120) continue;
      if (difficulty < 2 && Math.min(...roots.map(Math.abs)) > 2) continue;
      return { roots };
    }
  },
  render({ roots }) {
    const coeffs = cubicFromRoots(roots);
    const constant = Math.abs(coeffs[3]);
    const divisors: number[] = [];
    for (let d = 1; d <= constant; d += 1) if (constant % d === 0) divisors.push(d, -d);
    return {
      kind: 'tiles',
      prompt: [say('The equation below has three whole-number solutions. Find them, in any order.'), show(`${polyTex(coeffs)} = 0`)],
      template: 'x = {0}, \\ {1}, \\ {2}',
      bank: numberBank(roots, [...roots.map((r) => -r), ...divisors], 3, 1, -Infinity),
      answer: roots.map(num),
      unordered: true,
    };
  },
  solution({ roots }) {
    const coeffs = cubicFromRoots(roots);
    // The root a learner trying small divisors first meets first.
    const first = [...roots].sort((a, b) => Math.abs(a) - Math.abs(b) || b - a)[0];
    const [u, v] = roots.filter((r) => r !== first);
    return [
      { text: `A whole-number solution divides the constant term, ${Math.abs(coeffs[3])}. Try its divisors, smallest first, until one gives $0$:` },
      { tex: `p(${first}) = ${signedJoin(termValues(coeffs, first))} = 0` },
      { text: `So $${factorTex(first)}$ is a factor. Divide it out:` },
      { tex: `p(x) = ${factorBracket(first)}(${polyTex([1, -(u + v), u * v])})` },
      { text: 'The quadratic factorises too:' },
      { tex: `p(x) = ${roots.map(factorBracket).join('')}` },
      { tex: `x = ${roots.join(', \\ ')}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Equations
 * ================================================================ */

/* ---------- a quartic that is a quadratic in x^2 ---------- */

interface QuarticParams {
  /** Difficulty 1: y = m^2 or n^2. Difficulty 2: y = A or -B. */
  kind: 'both' | 'one';
  m: number;
  n: number;
}

const quarticCoeffs = ({ kind, m, n }: QuarticParams) =>
  kind === 'both' ? [1, 0, -(m * m + n * n), 0, m * m * n * n] : [1, 0, n - m, 0, -m * n];

const quarticAnswer = ({ kind, m, n }: QuarticParams) => (kind === 'both' ? m + n : 2 * m);

const cmPoQuartic: Generator<QuarticParams> = {
  id: 'cm-po-quartic',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const m = rng.int(2, 20);
        const n = rng.int(1, 20);
        if (m === n) continue;
        return { kind: 'one', m, n };
      }
      const m = rng.int(1, 8);
      const n = rng.int(m + 1, 9);
      return { kind: 'both', m, n };
    }
  },
  render(p) {
    const ask = p.kind === 'both' ? 'Find the sum of the positive solutions of' : 'Find the sum of the squares of all the real solutions of';
    return typed([say(ask), show(`${polyTex(quarticCoeffs(p))} = 0`)], quarticAnswer(p), '\\text{sum} =');
  },
  choices(p) {
    const { m, n } = p;
    const slips = p.kind === 'both' ? [m * m + n * n, m * n, n] : [m - n, 2 * (m - n), m];
    return numberOptions(quarticAnswer(p), slips, 1, -Infinity);
  },
  solution(p) {
    const { m, n } = p;
    const c = quarticCoeffs(p);
    if (p.kind === 'both') {
      return [
        { text: 'Only even powers appear, so put $y = x^2$. It is a quadratic in $y$:' },
        { tex: `${polyTex([1, c[2], c[4]], 'y')} = 0` },
        { tex: `(y - ${m * m})(y - ${n * n}) = 0` },
        { text: `So $x^2$ is ${m * m} or ${n * n}, and each gives two solutions:` },
        { tex: `x = \\pm ${m}, \\qquad x = \\pm ${n}` },
        { text: 'The positive ones add to' },
        { tex: `${m} + ${n} = ${m + n}` },
      ];
    }
    return [
      { text: 'Only even powers appear, so put $y = x^2$:' },
      { tex: `${polyTex([1, c[2], c[4]], 'y')} = 0` },
      { tex: `(y - ${m})(y + ${n}) = 0` },
      { text: `A real square is never negative, so $y = -${n}$ gives no real $x$. Only $y = ${m}$ does, with $x = \\pm\\sqrt{${m}}$, and each of those squares to ${m}:` },
      { tex: `${m} + ${m} = ${2 * m}` },
      { text: `Adding both values of $y$, which gives ${m - n}, is the trap: it counts solutions that are not real.` },
    ];
  },
};

/* ---------- two quadratics sharing a root ---------- */

interface SharedParams {
  /** The shared root, the first equation's other root, the second's other root. */
  r: number;
  s: number;
  t: number;
  /** The second equation's leading coefficient. */
  k: number;
}

const sharedFirst = ({ r, s }: SharedParams) => [1, -(r + s), r * s];
const sharedSecond = ({ r, t, k }: SharedParams) => [k, -k * (r + t), k * r * t];

function sampleShared(rng: Parameters<Generator['sample']>[0], k: number, range: number): SharedParams {
  for (;;) {
    const r = nonZero(rng, -6, 6);
    const s = nonZero(rng, -range, range);
    const t = nonZero(rng, -range, range);
    if (s === r || t === r || s === t) continue;
    const p = { r, s, t, k };
    if ([...sharedFirst(p), ...sharedSecond(p)].some((c) => Math.abs(c) > 60)) continue;
    // The linear equation left over: (t - s)x = r(t - s) when the leading terms match.
    if (Math.abs(t - s) < 2 || r === 1 || t - s === r) continue;
    return p;
  }
}

function sharedSolution(p: SharedParams): SolutionStep[] {
  const first = sharedFirst(p);
  const second = sharedSecond(p);
  const steps: SolutionStep[] = [];
  let top = first;
  if (p.k !== 1) {
    top = first.map((c) => c * p.k);
    steps.push({ text: `Multiply the first equation by ${p.k} so both start with $${p.k}x^2$:` }, { tex: `${polyTex(top)} = 0` });
  }
  const diff = top.map((c, i) => c - second[i]);
  steps.push(
    { text: 'Take the second equation away. The $x^2$ terms cancel, and the shared solution still satisfies what is left:' },
    { tex: `${polyTex(diff.slice(1))} = 0` },
    { tex: `${termsTex([[diff[1], 'x']])} = ${-diff[2]}` },
    { tex: `x = ${p.r}` },
  );
  return steps;
}

const cmPoSharedRoot: Generator<SharedParams> = {
  id: 'cm-po-shared-root',
  sample(rng, difficulty) {
    return sampleShared(rng, difficulty >= 2 ? rng.int(2, 3) : 1, difficulty >= 2 ? 9 : 7);
  },
  render(p) {
    return typed(
      [
        say('The two equations below have exactly one solution in common. Find it.'),
        show(`${polyTex(sharedFirst(p))} = 0`),
        show(`${polyTex(sharedSecond(p))} = 0`),
      ],
      p.r,
      'x =',
    );
  },
  choices(p) {
    return numberOptions(p.r, [p.s, p.t, -p.r], 1, -Infinity);
  },
  solution: sharedSolution,
};

const cmPoSharedRootTiles: Generator<SharedParams> = {
  id: 'cm-po-shared-root-tiles',
  sample(rng, difficulty) {
    return sampleShared(rng, 1, difficulty >= 2 ? 9 : 7);
  },
  render(p) {
    const lin = p.t - p.s;
    const right = p.r * (p.t - p.s);
    return {
      kind: 'tiles',
      prompt: [
        say('These two equations share one solution. Take the second from the first, then solve what is left.'),
        show(`${polyTex(sharedFirst(p))} = 0`),
        show(`${polyTex(sharedSecond(p))} = 0`),
      ],
      template: '{0}x = {1}, \\quad x = {2}',
      bank: numberBank([lin, right, p.r], [-lin, -right, -p.r, p.s, p.t], 3, 1, -Infinity),
      answer: [num(lin), num(right), num(p.r)],
    };
  },
  solution: sharedSolution,
};

/* ---------- x + 1/x from an equation ---------- */

interface ReciprocalParams {
  /** x^2 - a x + 1 = 0, so x + 1/x = a. */
  a: number;
  cube: boolean;
}

const reciprocalAnswer = ({ a, cube }: ReciprocalParams) => (cube ? a ** 3 - 3 * a : a * a - 2);

const cmPoReciprocal: Generator<ReciprocalParams> = {
  id: 'cm-po-reciprocal',
  sample(rng, difficulty) {
    const cube = difficulty >= 2;
    const a = rng.int(3, cube ? 20 : 30) * rng.sign();
    return { a, cube };
  },
  render(p) {
    const target = p.cube ? 'x^{3} + \\frac{1}{x^{3}}' : 'x^{2} + \\frac{1}{x^{2}}';
    return typed(
      [say('The number $x$ satisfies the equation below. Without solving it, find the value asked for.'), show(`${polyTex([1, -p.a, 1])} = 0`)],
      reciprocalAnswer(p),
      `${target} =`,
    );
  },
  choices(p) {
    const { a } = p;
    const slips = p.cube ? [a ** 3, a ** 3 - a, a ** 3 + 3 * a] : [a * a, a * a + 2, 2 * a];
    return numberOptions(reciprocalAnswer(p), slips, 1, -Infinity);
  },
  solution(p) {
    const { a } = p;
    const steps: SolutionStep[] = [
      { text: 'Divide by $x$, which is not $0$:' },
      { tex: `x ${a > 0 ? '-' : '+'} ${Math.abs(a)} + \\frac{1}{x} = 0` },
      { tex: `x + \\frac{1}{x} = ${a}` },
    ];
    if (!p.cube) {
      steps.push(
        { text: 'Square both sides. The middle term is $2 \\times x \\times \\frac{1}{x}$, which is $2$:' },
        { tex: `x^{2} + 2 + \\frac{1}{x^{2}} = ${a * a}` },
        { tex: `x^{2} + \\frac{1}{x^{2}} = ${a * a - 2}` },
      );
      return steps;
    }
    steps.push(
      { text: `Cube both sides. The middle terms are $3x + \\frac{3}{x}$, three times the sum, which is $3 \\times ${bracket(a)}$:` },
      { tex: `x^{3} + \\frac{1}{x^{3}} + 3 \\times ${bracket(a)} = ${a ** 3}` },
      { tex: `x^{3} + \\frac{1}{x^{3}} = ${reciprocalAnswer(p)}` },
    );
    return steps;
  },
};

/* ---------- a cubic that takes one value three times ---------- */

interface FixedParams {
  pts: [number, number, number];
  /** p(pt) = value for every pt (difficulty 1), or p(pt) = pt (difficulty 2). */
  value: number;
  linear: boolean;
  at: number;
}

const fixedProduct = ({ pts, at }: FixedParams) => pts.reduce((acc, q) => acc * (at - q), 1);
const fixedAnswer = (p: FixedParams) => fixedProduct(p) + (p.linear ? p.at : p.value);

const cmPoFixedValues: Generator<FixedParams> = {
  id: 'cm-po-fixed-values',
  sample(rng, difficulty) {
    for (;;) {
      const pts = rng.sample([0, 1, 2, 3, 4, 5, 6], 3).sort((a, b) => a - b) as [number, number, number];
      const at = rng.int(-2, 10);
      if (pts.includes(at)) continue;
      const p = { pts, value: nonZero(rng, -9, 12), linear: difficulty >= 2, at };
      if (Math.abs(fixedProduct(p)) > 400) continue;
      return p;
    }
  },
  render(p) {
    const given = p.linear ? p.pts.map((q) => `p(${q}) = ${q}`).join(', \\qquad ') : `${p.pts.map((q) => `p(${q})`).join(' = ')} = ${p.value}`;
    return typed(
      [say('$p(x)$ is a cubic polynomial with leading coefficient $1$, and'), show(given), say(`Find $p(${p.at})$.`)],
      fixedAnswer(p),
      `p(${p.at}) =`,
    );
  },
  choices(p) {
    const prod = fixedProduct(p);
    const slips = p.linear ? [p.at, prod, prod - p.at] : [p.value, prod, prod - p.value];
    return numberOptions(fixedAnswer(p), slips, 1, -Infinity);
  },
  solution(p) {
    const q = `p(x) ${p.linear ? '- x' : p.value < 0 ? `+ ${-p.value}` : `- ${p.value}`}`;
    const factors = p.pts.map(factorBracket).join('');
    const values = p.pts.map((pt) => bracket(p.at - pt)).join(' \\times ');
    const extra = p.linear ? p.at : p.value;
    return [
      {
        text: `$${q}$ is zero at $x = ${p.pts[0]}$, $${p.pts[1]}$ and $${p.pts[2]}$. It is a cubic with leading coefficient $1$, so it is exactly`,
      },
      { tex: `${q} = ${factors}` },
      { text: `Put $x = ${p.at}$, then add back ${p.linear ? `the $x$, which is ${p.at}` : `the ${p.value}`}:` },
      { tex: `p(${p.at}) = ${values} ${extra < 0 ? `- ${-extra}` : `+ ${extra}`}` },
      { tex: `p(${p.at}) = ${fixedAnswer(p)}` },
      {
        text: p.linear
          ? `Answering ${p.at}, as if $p(x)$ were just $x$, is the trap.`
          : `Answering ${p.value} is the trap: a cubic can take one value three times and still move on.`,
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: Vieta's Formulas
 * ================================================================ */

/* ---------- symmetric expressions in the roots of a quadratic ---------- */

interface VietaQuadParams {
  b: number;
  c: number;
  kind: 'squares' | 'reciprocals' | 'cubes';
}

const isSquare = (n: number) => n >= 0 && Number.isInteger(Math.sqrt(n));

const VIETA_QUAD_LEAD = {
  squares: 'r^{2} + s^{2} =',
  reciprocals: '\\frac{1}{r} + \\frac{1}{s} =',
  cubes: 'r^{3} + s^{3} =',
};

const cmPoVietaQuad: Generator<VietaQuadParams> = {
  id: 'cm-po-vieta-quad',
  sample(rng, difficulty) {
    for (;;) {
      const b = nonZero(rng, -9, 9);
      const c = nonZero(rng, -9, 9);
      const disc = b * b - 4 * c;
      // Roots that are real but not whole, so Vieta is the way in.
      if (disc <= 0 || isSquare(disc)) continue;
      const kind = difficulty >= 2 ? 'cubes' : rng.pick(['squares', 'reciprocals'] as const);
      // A reciprocal sum that comes out whole would sit among fraction distractors.
      if (kind === 'reciprocals' && b % c === 0) continue;
      return { b, c, kind };
    }
  },
  render(p) {
    const prompt = [say('The equation below has roots $r$ and $s$. Without solving it, find the value asked for.'), show(`${polyTex([1, p.b, p.c])} = 0`)];
    const S = -p.b;
    const P = p.c;
    if (p.kind === 'reciprocals') {
      return typed(prompt, fracAnswer(S, P), VIETA_QUAD_LEAD.reciprocals, FRACTION_KEYS);
    }
    return typed(prompt, p.kind === 'squares' ? S * S - 2 * P : S ** 3 - 3 * P * S, VIETA_QUAD_LEAD[p.kind]);
  },
  choices(p) {
    const S = -p.b;
    const P = p.c;
    if (p.kind === 'reciprocals') return fractionOptions([S, P], [[P, S], [-S, P], [S, 1]]);
    if (p.kind === 'squares') return numberOptions(S * S - 2 * P, [S * S, S * S + 2 * P, S * S - P], 1, -Infinity);
    return numberOptions(S ** 3 - 3 * P * S, [S ** 3, S ** 3 + 3 * P * S, S ** 3 - P * S], 1, -Infinity);
  },
  solution(p) {
    const S = -p.b;
    const P = p.c;
    const steps: SolutionStep[] = [
      { text: 'The roots add to minus the $x$ coefficient and multiply to the constant:' },
      { tex: `r + s = ${S}, \\qquad rs = ${P}` },
    ];
    if (p.kind === 'squares') {
      steps.push(
        { text: 'Square the sum and take away the cross term:' },
        { tex: 'r^{2} + s^{2} = (r + s)^{2} - 2rs' },
        { tex: `${bracket(S)}^{2} - 2 \\times ${bracket(P)} = ${S * S - 2 * P}` },
      );
    } else if (p.kind === 'reciprocals') {
      steps.push(
        { text: 'Put the two fractions over a common denominator:' },
        { tex: '\\frac{1}{r} + \\frac{1}{s} = \\frac{r + s}{rs}' },
        { tex: `${S} \\div ${bracket(P)} = ${fracTex(S, P)}` },
      );
    } else {
      steps.push(
        { text: 'Cube the sum. Besides $r^3 + s^3$ it holds $3r^2s + 3rs^2$, which is $3rs(r + s)$:' },
        { tex: 'r^{3} + s^{3} = (r + s)^{3} - 3rs(r + s)' },
        { tex: `${bracket(S)}^{3} - 3 \\times ${bracket(P)} \\times ${bracket(S)} = ${S ** 3 - 3 * P * S}` },
      );
    }
    return steps;
  },
};

/* ---------- symmetric expressions in the roots of a cubic ---------- */

interface VietaCubicParams {
  k: number;
  a: number;
  b: number;
  c: number;
  kind: 'squares' | 'reciprocals';
}

const cubicAnswer = (p: VietaCubicParams): [number, number] =>
  p.kind === 'squares' ? [p.a * p.a - 2 * p.b, 1] : [-p.b, p.c];

const cmPoVietaCubic: Generator<VietaCubicParams> = {
  id: 'cm-po-vieta-cubic',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const k = rng.pick([2, 3, 4, 5]);
        const p = { k, a: rng.int(-9, 9), b: nonZero(rng, -12, 12), c: nonZero(rng, -12, 12), kind: 'reciprocals' as const };
        if (p.b % p.c === 0) continue;
        return p;
      }
    }
    return { k: 1, a: nonZero(rng, -9, 9), b: nonZero(rng, -12, 12), c: nonZero(rng, -12, 12), kind: 'squares' };
  },
  render(p) {
    const prompt = [say('The equation below has roots $r$, $s$ and $t$. Without solving it, find the value asked for.'), show(`${polyTex([p.k, p.a, p.b, p.c])} = 0`)];
    const [top, bottom] = cubicAnswer(p);
    if (p.kind === 'squares') return typed(prompt, top, 'r^{2} + s^{2} + t^{2} =');
    return typed(prompt, fracAnswer(top, bottom), '\\frac{1}{r} + \\frac{1}{s} + \\frac{1}{t} =', FRACTION_KEYS);
  },
  choices(p) {
    if (p.kind === 'squares') return numberOptions(p.a * p.a - 2 * p.b, [p.a * p.a, p.a * p.a + 2 * p.b, -p.a], 1, -Infinity);
    return fractionOptions([-p.b, p.c], [[p.b, p.c], [-p.c, p.b], [-p.b, p.k * p.c]]);
  },
  solution(p) {
    if (p.kind === 'squares') {
      return [
        { text: 'The sum of the roots is minus the $x^2$ coefficient, and the pairs add to the $x$ coefficient:' },
        { tex: `r + s + t = ${-p.a}, \\qquad rs + rt + st = ${p.b}` },
        { text: 'Squaring the sum gives every square once and every pair twice:' },
        { tex: 'r^{2} + s^{2} + t^{2} = (r + s + t)^{2} - 2(rs + rt + st)' },
        { tex: `${bracket(-p.a)}^{2} - 2 \\times ${bracket(p.b)} = ${p.a * p.a - 2 * p.b}` },
      ];
    }
    return [
      { text: `Divide by ${p.k} so the $x^3$ coefficient is $1$. The pairs add to the $x$ coefficient and the product is minus the constant:` },
      { tex: `rs + rt + st = ${fracTex(p.b, p.k)}, \\qquad rst = ${fracTex(-p.c, p.k)}` },
      { text: 'Put the three fractions over a common denominator:' },
      { tex: '\\frac{1}{r} + \\frac{1}{s} + \\frac{1}{t} = \\frac{rs + rt + st}{rst}' },
      { text: `The ${p.k} divides the top and the bottom alike, so it cancels:` },
      { tex: `${p.b} \\div ${bracket(-p.c)} = ${fracTex(-p.b, p.c)}` },
    ];
  },
};

/* ---------- a cubic's three Vieta sums, as a table ---------- */

interface VietaTableParams {
  k: number;
  /** r + s + t, rs + rt + st, rst. */
  e: [number, number, number];
}

const cmPoVietaTable: Generator<VietaTableParams> = {
  id: 'cm-po-vieta-table',
  sample(rng, difficulty) {
    for (;;) {
      const e: [number, number, number] = [nonZero(rng, -9, 9), nonZero(rng, -9, 9), nonZero(rng, -9, 9)];
      if (new Set(e.map(Math.abs)).size < 3) continue;
      return { k: difficulty >= 2 ? rng.pick([2, 3, 4]) : 1, e };
    }
  },
  render({ k, e }) {
    const coeffs = [k, -k * e[0], k * e[1], -k * e[2]];
    return {
      kind: 'table',
      prompt: [say('The equation below has roots $r$, $s$ and $t$. Fill in the table without solving it.'), show(`${polyTex(coeffs)} = 0`)],
      columns: ['\\text{expression}', '\\text{value}'],
      rows: [
        ['r + s + t', null],
        ['rs + rt + st', null],
        ['rst', null],
      ],
      bank: numberBank(e, [-e[0], e[2], -e[2], k * e[0], -e[1]], 3, 1, -Infinity),
      answer: e.map(num),
    };
  },
  solution({ k, e }) {
    const steps: SolutionStep[] = [];
    if (k !== 1) {
      steps.push({ text: `Divide through by ${k} first:` }, { tex: `${polyTex([1, -e[0], e[1], -e[2]])} = 0` });
    }
    steps.push(
      { text: 'Multiplied out, a cubic with leading coefficient $1$ and roots $r$, $s$, $t$ is' },
      { tex: 'x^{3} - (r + s + t)x^{2} + (rs + rt + st)x - rst' },
      { text: 'so the signs alternate. Match the coefficients:' },
      { tex: `r + s + t = ${e[0]}, \\qquad rs + rt + st = ${e[1]}` },
      { tex: `rst = ${e[2]}` },
    );
    return steps;
  },
};

/* ---------- a quadratic whose roots are in a ratio or differ by a number ---------- */

interface RootRatioParams {
  kind: 'times' | 'differ';
  r: number;
  /** The multiplier (times) or the gap (differ). */
  j: number;
}

const otherRoot = ({ kind, r, j }: RootRatioParams) => (kind === 'times' ? j * r : r + j);
const ratioSum = (p: RootRatioParams) => p.r + otherRoot(p);
const ratioC = (p: RootRatioParams) => p.r * otherRoot(p);

const TIMES_WORD: Record<number, string> = { 2: 'twice', 3: 'three times', 4: 'four times' };

const cmPoRootRatio: Generator<RootRatioParams> = {
  id: 'cm-po-root-ratio',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const p = { kind: 'differ' as const, r: rng.int(-9, 9), j: rng.int(1, 9) };
        if (ratioSum(p) === 0 || ratioC(p) === 0) continue;
        return p;
      }
      return { kind: 'times', r: nonZero(rng, -8, 8), j: rng.pick([2, 3, 4]) };
    }
  },
  render(p) {
    const ask =
      p.kind === 'times'
        ? `One solution of the equation below is ${TIMES_WORD[p.j]} the other. Find $c$.`
        : `The two solutions of the equation below differ by ${p.j}. Find $c$.`;
    return typed([say(ask), show(`${polyTex([1, -ratioSum(p), 0])} + c = 0`)], ratioC(p), 'c =');
  },
  choices(p) {
    const S = ratioSum(p);
    const slips =
      p.kind === 'times'
        ? [(S * S) / 4, p.r * p.r, otherRoot(p) * otherRoot(p)]
        : [(S * S) / 4, S * S - p.j * p.j, p.r * (p.r - p.j)];
    return numberOptions(ratioC(p), slips, 1, -Infinity);
  },
  solution(p) {
    const S = ratioSum(p);
    const other = otherRoot(p);
    const first: SolutionStep[] =
      p.kind === 'times'
        ? [
            { text: `Call the solutions $r$ and $${p.j}r$. By Vieta they add to ${S}:` },
            { tex: `${p.j + 1}r = ${S}` },
          ]
        : [
            { text: `Call the solutions $r$ and $r + ${p.j}$. By Vieta they add to ${S}:` },
            { tex: `2r + ${p.j} = ${S}` },
            { tex: `2r = ${S - p.j}` },
          ];
    return [
      ...first,
      { tex: `r = ${p.r}` },
      { text: `So the solutions are ${p.r} and ${other}, and $c$ is their product:` },
      { tex: `c = ${bracket(p.r)} \\times ${bracket(other)} = ${ratioC(p)}` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Transformations
 * ================================================================ */

/* ---------- a product of differences is a value of p ---------- */

interface ShiftProductParams {
  coeffs: number[];
  k: number;
  /** (k - r)(k - s)(k - t), or (difficulty 2) (r + k)(s + k)(t + k). */
  plus: boolean;
}

const shiftAnswer = ({ coeffs, k, plus }: ShiftProductParams) => (plus ? -evalPoly(coeffs, -k) : evalPoly(coeffs, k));

const shiftLead = ({ k, plus }: ShiftProductParams) =>
  plus ? `(r + ${k})(s + ${k})(t + ${k}) =` : `(${k} - r)(${k} - s)(${k} - t) =`;

const cmPoShiftProduct: Generator<ShiftProductParams> = {
  id: 'cm-po-shift-product',
  sample(rng, difficulty) {
    for (;;) {
      const plus = difficulty >= 2;
      const k = plus ? rng.int(1, 3) : rng.pick([1, 2, 3, -1, -2]);
      const coeffs = [1, rng.int(-9, 9), rng.int(-9, 9), nonZero(rng, -9, 9)];
      const p = { coeffs, k, plus };
      const v = shiftAnswer(p);
      if (v === 0 || Math.abs(v) > 300) continue;
      return p;
    }
  },
  render(p) {
    return typed(
      [say('The equation below has roots $r$, $s$ and $t$. Without solving it, find the value asked for.'), show(`${polyTex(p.coeffs)} = 0`)],
      shiftAnswer(p),
      shiftLead(p),
    );
  },
  choices(p) {
    const { coeffs, k } = p;
    const slips = p.plus ? [evalPoly(coeffs, -k), evalPoly(coeffs, k), -evalPoly(coeffs, k)] : [-evalPoly(coeffs, k), evalPoly(coeffs, -k), coeffs[3]];
    return numberOptions(shiftAnswer(p), slips, 1, -Infinity);
  },
  solution(p) {
    const { coeffs, k } = p;
    const at = p.plus ? -k : k;
    const value = evalPoly(coeffs, at);
    const steps: SolutionStep[] = [
      { text: 'The leading coefficient is $1$ and the roots are $r$, $s$, $t$, so' },
      { tex: 'p(x) = (x - r)(x - s)(x - t)' },
    ];
    if (p.plus) {
      steps.push(
        { text: `Put $x = -${k}$. Each bracket $(-${k} - r)$ is minus $(r + ${k})$, and three minus signs make one:` },
        { tex: `(r + ${k})(s + ${k})(t + ${k}) = -p(-${k})` },
      );
    } else {
      steps.push({ text: `Put $x = ${k}$:` }, { tex: `(${k} - r)(${k} - s)(${k} - t) = p(${k})` });
    }
    steps.push({ tex: `p(${at}) = ${signedJoin(termValues(coeffs, at))} = ${value}` });
    if (p.plus) steps.push({ tex: `-p(-${k}) = ${-value}` });
    return steps;
  },
};

/* ---------- every root multiplied by k, as a table ---------- */

interface NewRootsParams {
  a: number;
  b: number;
  c: number;
  k: number;
}

const scaledCoeffs = ({ a, b, c, k }: NewRootsParams) => [k * a, k * k * b, k ** 3 * c];

const cmPoNewRootsTable: Generator<NewRootsParams> = {
  id: 'cm-po-new-roots-table',
  sample(rng, difficulty) {
    for (;;) {
      const k = difficulty >= 2 ? rng.pick([-1, -2, -3]) : rng.pick([2, 3]);
      const p = { a: nonZero(rng, -6, 6), b: nonZero(rng, -6, 6), c: nonZero(rng, -6, 6), k };
      const out = scaledCoeffs(p);
      if (new Set(out).size < 3 || out.some((v) => Math.abs(v) > 200)) continue;
      return p;
    }
  },
  render(p) {
    const roots = ['r', 's', 't'].map((x) => (p.k === -1 ? `-${x}` : `${p.k}${x}`));
    return {
      kind: 'table',
      prompt: [
        say('The equation below has roots $r$, $s$ and $t$.'),
        show(`${polyTex([1, p.a, p.b, p.c])} = 0`),
        say(`Fill in the cubic with leading coefficient $1$ whose roots are $${roots[0]}$, $${roots[1]}$ and $${roots[2]}$.`),
      ],
      columns: ['\\text{term}', '\\text{coefficient}'],
      rows: [
        ['x^{3}', '1'],
        ['x^{2}', null],
        ['x', null],
        ['\\text{constant}', null],
      ],
      bank: numberBank(scaledCoeffs(p), [p.a, p.b, p.c, p.k * p.b, p.k * p.c, -p.k * p.a], 3, 1, -Infinity),
      answer: scaledCoeffs(p).map(num),
    };
  },
  solution(p) {
    const [x2, x1, x0] = scaledCoeffs(p);
    const k = bracket(p.k);
    return [
      { text: `Multiplying every root by ${p.k} multiplies their sum by ${p.k}, each product of a pair by $${k}^2$, and the product of all three by $${k}^3$. The coefficients are those sums with alternating signs, so each scales the same way:` },
      { tex: `x^{2}: \\ ${k} \\times ${bracket(p.a)} = ${x2}` },
      { tex: `x: \\ ${k}^{2} \\times ${bracket(p.b)} = ${x1}` },
      { tex: `\\text{constant}: \\ ${k}^{3} \\times ${bracket(p.c)} = ${x0}` },
      { tex: `${polyTex([1, x2, x1, x0])} = 0` },
    ];
  },
};

/* ---------- the sum of the roots of p(ax + b) ---------- */

interface SubSumParams {
  coeffs: number[];
  a: number;
  b: number;
}

/** Roots of p(ax + b) are (r - b)/a, so they add to (S - nb)/a. */
function subSum({ coeffs, a, b }: SubSumParams): [number, number] {
  const n = coeffs.length - 1;
  return [-coeffs[1] - n * b, a];
}

const innerTex = ({ a, b }: SubSumParams) => `${a === 1 ? '' : a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;

const cmPoRootsSumSub: Generator<SubSumParams> = {
  id: 'cm-po-roots-sum-sub',
  sample(rng, difficulty) {
    for (;;) {
      const n = rng.int(3, 4);
      const coeffs = [1, nonZero(rng, -9, 9), ...Array.from({ length: n - 2 }, () => rng.int(-9, 9)), nonZero(rng, -9, 9)];
      const p = { coeffs, a: difficulty >= 2 ? rng.int(2, 3) : 1, b: nonZero(rng, -5, 5) };
      const [top, bottom] = subSum(p);
      if (top === 0 || (difficulty >= 2 && top % bottom === 0)) continue;
      return p;
    }
  },
  render(p) {
    const [top, bottom] = subSum(p);
    return typed(
      [say('Let'), show(`p(x) = ${polyTex(p.coeffs)}`), say('What is the sum of the roots of this equation?'), show(`p(${innerTex(p)}) = 0`)],
      fracAnswer(top, bottom),
      '\\text{sum} =',
      p.a === 1 ? [] : FRACTION_KEYS,
    );
  },
  choices(p) {
    const n = p.coeffs.length - 1;
    const S = -p.coeffs[1];
    const [top, bottom] = subSum(p);
    if (p.a === 1) return numberOptions(top, [S + n * p.b, S - p.b, S], 1, -Infinity);
    return fractionOptions([top, bottom], [[p.a * S + n * p.b, 1], [S + n * p.b, p.a], [S - p.b, p.a]]);
  },
  solution(p) {
    const n = p.coeffs.length - 1;
    const S = -p.coeffs[1];
    const [top, bottom] = subSum(p);
    const inner = innerTex(p);
    const shift = p.b > 0 ? `- ${p.b}` : `+ ${-p.b}`;
    const each = p.a === 1 ? `x = r ${shift}` : `x = \\frac{r ${shift}}{${p.a}}`;
    const total = `${S} ${p.b > 0 ? '-' : '+'} ${n} \\times ${Math.abs(p.b)}`;
    return [
      { text: `By Vieta the ${n} roots of $p$ add to minus the $x^{${n - 1}}$ coefficient, ${S}.` },
      { text: `The new equation holds exactly when $${inner}$ is a root $r$ of $p$, so each new root is` },
      { tex: each },
      { text: `There are ${n} roots, so the shift of ${Math.abs(p.b)} is counted ${n} times:` },
      { tex: p.a === 1 ? `${total} = ${top}` : `\\frac{${total}}{${p.a}} = ${fracTex(top, bottom)}` },
    ];
  },
};

/* ---------- a quadratic whose roots are the squares, as tiles ---------- */

interface SquaredRootsParams {
  b: number;
  c: number;
}

const squaredSum = ({ b, c }: SquaredRootsParams) => b * b - 2 * c;

const cmPoSquaredRootsTiles: Generator<SquaredRootsParams> = {
  id: 'cm-po-squared-roots-tiles',
  sample(rng, difficulty) {
    const range = difficulty >= 2 ? 9 : 6;
    for (;;) {
      const p = { b: nonZero(rng, -range, range), c: nonZero(rng, -range, range) };
      const sum = squaredSum(p);
      // Real roots that are not whole, so Vieta is the way in.
      const disc = p.b * p.b - 4 * p.c;
      if (disc <= 0 || isSquare(disc) || sum <= 0 || sum === p.c * p.c) continue;
      return p;
    }
  },
  render(p) {
    const sum = squaredSum(p);
    const prod = p.c * p.c;
    const S = -p.b;
    return {
      kind: 'tiles',
      prompt: [
        say('The equation below has roots $r$ and $s$.'),
        show(`${polyTex([1, p.b, p.c])} = 0`),
        say('Complete the quadratic with leading coefficient $1$ whose roots are $r^2$ and $s^2$.'),
      ],
      template: 'x^2 - {0}x + {1}',
      bank: numberBank([sum, prod], [S * S, S * S + 2 * p.c, Math.abs(p.c), 2 * Math.abs(p.c)], 3, 1, 1),
      answer: [num(sum), num(prod)],
    };
  },
  solution(p) {
    const S = -p.b;
    const P = p.c;
    return [
      { text: 'By Vieta the roots add to minus the $x$ coefficient and multiply to the constant:' },
      { tex: `r + s = ${S}, \\qquad rs = ${P}` },
      { text: 'The new roots add to' },
      { tex: `r^{2} + s^{2} = ${bracket(S)}^{2} - 2 \\times ${bracket(P)} = ${squaredSum(p)}` },
      { text: 'and multiply to' },
      { tex: `r^{2}s^{2} = (rs)^{2} = ${P * P}` },
      { text: 'A quadratic with leading coefficient $1$ is $x^2$, minus the sum of its roots times $x$, plus their product:' },
      { tex: `x^{2} - ${squaredSum(p)}x + ${P * P}` },
    ];
  },
};

export const contestPolynomialsGenerators = [
  cmPoRemainder,
  cmPoFindK,
  cmPoSumCoeffs,
  cmPoIntegerRoots,
  cmPoQuartic,
  cmPoSharedRoot,
  cmPoSharedRootTiles,
  cmPoReciprocal,
  cmPoFixedValues,
  cmPoVietaQuad,
  cmPoVietaCubic,
  cmPoVietaTable,
  cmPoRootRatio,
  cmPoShiftProduct,
  cmPoNewRootsTable,
  cmPoRootsSumSub,
  cmPoSquaredRootsTiles,
];
