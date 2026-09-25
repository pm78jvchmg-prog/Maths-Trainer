/**
 * Arc length and surface area (Further Integration, level 10).
 *
 *   s = ∫ √(1 + (dy/dx)²) dx          s = ∫ √(ẋ² + ẏ²) dt
 *   S = 2π ∫ y √(1 + (dy/dx)²) dx
 *
 * The root rarely comes out, so every curve here is one where it does:
 *
 * - `y = (2m/3) x^{3/2}`, where 1 + (dy/dx)² = 1 + m²x, with limits that make
 *   1 + m²x a square.
 * - The "made to measure" curves `y = c x^{r+1}/(r+1) + x^{1-r}/(4c(r-1))`,
 *   where 1 + (dy/dx)² is (c x^r + x^{-r}/(4c))².
 * - `x = kt², y = k(t - t³/3)` and `x = k(t³ - 3t), y = 3kt²`, whose speeds are
 *   k(1 + t²) and 3k(1 + t²), from (1 - t²)² + (2t)² = (1 + t²)².
 * - For area: cones with a Pythagorean slope, zones of a sphere, and
 *   `y = m√x`.
 *
 * Every typed value declares the raw integrand, before the root is taken out,
 * so the quadrature oracle checks the simplification as well as the sum.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import {
  FRACTION_KEYS,
  PI_KEYS,
  choiceList,
  drawUntil,
  fadd,
  fmul,
  frac,
  fracAns,
  fracTex,
  fsub,
  fval,
  leadTerm,
  mix,
  piAns,
  piTex,
  placed,
  powTex,
  prose,
  tokenBank,
  turned,
  type Frac,
} from './integralKit';

const DYDX = '\\left(\\frac{dy}{dx}\\right)^{2}';

/** A constant added on the end, or nothing. */
const plusConst = (c: number): string => (c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`);

/* ---------- y = (2m/3) x^{3/2} ---------- */

/** The x-values at which 1 + m²x is a square, for m = 1, 2, 3. */
const SQUARE_POINTS: Record<number, number[]> = { 1: [0, 3, 8, 15, 24], 2: [0, 2, 6, 12], 3: [0, 7, 11] };

export interface HalvesParams {
  m: number;
  c: number;
  a: number;
  b: number;
}

const halvesY = ({ m, c }: Pick<HalvesParams, 'm' | 'c'>): string =>
  `y = ${leadTerm(frac(2 * m, 3), 'x^{\\frac{3}{2}}')}${plusConst(c)}`;

const halvesInside = (m: number): string => `1 + ${m === 1 ? '' : m * m}x`;

/** s = 2/(3m²) [(1 + m²x)^{3/2}] from a to b. */
export function halvesLength({ m, a, b }: HalvesParams): Frac {
  const cube = (x: number) => Math.round(Math.sqrt(1 + m * m * x)) ** 3;
  return frac(2 * (cube(b) - cube(a)), 3 * m * m);
}

function sampleHalves(rng: { int(a: number, b: number): number; pick<T>(xs: T[]): T }, difficulty: number): HalvesParams {
  return drawUntil(
    () => {
      const m = rng.int(1, 3);
      const pts = SQUARE_POINTS[m];
      const a = difficulty > 1 ? rng.pick(pts) : 0;
      return { m, c: rng.int(0, 4), a, b: rng.pick(pts) };
    },
    ({ a, b }) => b > a && (difficulty === 1 || a > 0),
    { m: 1, c: 0, a: difficulty > 1 ? 3 : 0, b: 8 },
  );
}

function halvesSolution(p: HalvesParams): SolutionStep[] {
  const { m, a, b } = p;
  const q = (x: number) => Math.round(Math.sqrt(1 + m * m * x));
  return [
    { text: `Here $\\frac{dy}{dx} = ${leadTerm(frac(m), '\\sqrt{x}')}$, so $1 + ${DYDX} = ${halvesInside(m)}$. The constant makes no difference.` },
    { tex: `s = \\int_{${a}}^{${b}} \\sqrt{${halvesInside(m)}} \\, dx` },
    { tex: `= \\left[${leadTerm(frac(2, 3 * m * m), `(${halvesInside(m)})^{\\frac{3}{2}}`)}\\right]_{${a}}^{${b}}` },
    { tex: `= ${fracTex(frac(2, 3 * m * m))}\\left(${q(b)}^{3} - ${q(a)}^{3}\\right)` },
    { tex: `= ${fracTex(halvesLength(p))}` },
  ];
}

const halvesTyped: Generator<HalvesParams> = {
  id: 'int-arc-three-halves',
  sample: (rng, difficulty) => sampleHalves(rng, difficulty),
  choices: (p) => {
    const s = halvesLength(p);
    const q = (x: number) => Math.round(Math.sqrt(1 + p.m * p.m * x));
    // The 1/m² left off, the root not squared back (q² in place of q³), and y(b) - y(a).
    const noM = frac(2 * (q(p.b) ** 3 - q(p.a) ** 3), 3);
    const squares = frac(2 * (q(p.b) ** 2 - q(p.a) ** 2), 3 * p.m * p.m);
    const heights = frac(2 * p.m * (Math.sqrt(p.b) ** 3 - Math.sqrt(p.a) ** 3), 3);
    return choiceList(
      { tex: fracTex(s) },
      { tex: fracTex(noM) },
      { tex: fracTex(squares) },
      ...(Number.isInteger(Math.sqrt(p.b)) && Number.isInteger(Math.sqrt(p.a)) ? [{ tex: fracTex(heights) }] : []),
      { tex: fracTex(fadd(s, frac(1))) },
      { tex: fracTex(fmul(s, frac(2))) },
    );
  },
  render: (p): Slide => {
    const s = halvesLength(p);
    return {
      kind: 'expression',
      prompt: [prose(`Find the length of $${halvesY(p)}$ from $x = ${p.a}$ to $x = ${p.b}$.`)],
      lead: 's =',
      keypad: s.d === 1 ? [] : FRACTION_KEYS,
      answer: `${fval(s)}`,
      alsoAccepts: [fracAns(s)],
      integrand: `sqrt(1 + (${p.m}*sqrt(x))^2)`,
      limits: [p.a, p.b],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: halvesSolution,
};

/* ---------- curves made to measure ---------- */

export interface SquareParams {
  r: 2 | 3;
  /** c, as a fraction: 1/4, 1/2, 1 or 2. */
  c: Frac;
  a: number;
  b: number;
  /** A constant added to y, which changes nothing. */
  k: number;
}

const SQUARE_CS: Frac[] = [frac(1, 4), frac(1, 2), frac(1), frac(2)];

/** q = 1/(4c), the coefficient of x^{-r} in dy/dx. */
const qOf = (c: Frac): Frac => frac(c.d, 4 * c.n);

/** 1/(d x^p) as read, for a unit-numerator fraction 1/d. */
function overX(q: Frac, p: number): string {
  return `\\frac{${q.n}}{${q.d === 1 ? '' : q.d}${powTex(p)}}`;
}

export function squareY({ r, c, k }: Pick<SquareParams, 'r' | 'c' | 'k'>): string {
  return `y = ${leadTerm(fmul(c, frac(1, r + 1)), powTex(r + 1))} + ${overX(fmul(qOf(c), frac(1, r - 1)), r - 1)}${plusConst(k)}`;
}

const squareDy = ({ r, c }: Pick<SquareParams, 'r' | 'c'>): string => `${leadTerm(c, powTex(r))} - ${overX(qOf(c), r)}`;
const squareRoot = ({ r, c }: Pick<SquareParams, 'r' | 'c'>, sign = '+'): string => `${leadTerm(c, powTex(r))} ${sign} ${overX(qOf(c), r)}`;

/** The antiderivative of c x^r + q x^{-r}. */
const squareF = ({ r, c }: Pick<SquareParams, 'r' | 'c'>, sign = '-'): string =>
  `${leadTerm(fmul(c, frac(1, r + 1)), powTex(r + 1))} ${sign} ${overX(fmul(qOf(c), frac(1, r - 1)), r - 1)}`;

function squareAt({ r, c }: Pick<SquareParams, 'r' | 'c'>, x: number): Frac {
  return fsub(fmul(fmul(c, frac(1, r + 1)), frac(x ** (r + 1))), fmul(fmul(qOf(c), frac(1, r - 1)), frac(1, x ** (r - 1))));
}

export const squareLength = (p: SquareParams): Frac => fsub(squareAt(p, p.b), squareAt(p, p.a));

/** The antiderivative with its sign slipped, for a distractor. */
function squarePlusAt({ r, c }: Pick<SquareParams, 'r' | 'c'>, x: number): Frac {
  return fadd(fmul(fmul(c, frac(1, r + 1)), frac(x ** (r + 1))), fmul(fmul(qOf(c), frac(1, r - 1)), frac(1, x ** (r - 1))));
}

const squareDyAns = ({ r, c }: SquareParams): string => `(${c.n}/${c.d})*x^${r} - (${qOf(c).n}/${qOf(c).d})*x^(-${r})`;

function sampleSquare(rng: { int(a: number, b: number): number; pick<T>(xs: T[]): T }, difficulty: number): SquareParams {
  return drawUntil(
    () => {
      const a = difficulty > 1 ? rng.int(1, 3) : 1;
      return { r: rng.pick<2 | 3>([2, 3]), c: rng.pick(SQUARE_CS), a, b: rng.int(a + 1, 4), k: rng.int(0, 2) };
    },
    (p) => Math.abs(squareLength(p).n) <= 5000 && squareLength(p).d <= 400,
    { r: 2, c: frac(1, 2), a: 1, b: 3, k: 0 },
  );
}

function squareSolution(p: SquareParams): SolutionStep[] {
  return [
    { text: `Here $\\frac{dy}{dx} = ${squareDy(p)}$. Squaring, the middle term is $-\\frac{1}{2}$, so adding $1$ turns it to $+\\frac{1}{2}$:` },
    { tex: `1 + ${DYDX} = \\left(${squareRoot(p)}\\right)^{2}` },
    { tex: `s = \\int_{${p.a}}^{${p.b}} \\left(${squareRoot(p)}\\right) dx` },
    { tex: `= \\left[${squareF(p)}\\right]_{${p.a}}^{${p.b}}` },
    { tex: `= ${fracTex(squareLength(p))}` },
  ];
}

const squareSteps: Generator<SquareParams> = {
  id: 'int-arc-square-steps',
  sample: (rng, difficulty) => sampleSquare(rng, difficulty),
  render: (p): Slide => {
    const root = `\\left(${squareRoot(p)}\\right)`;
    const bracket = `\\left[${squareF(p)}\\right]_{${p.a}}^{${p.b}}`;
    const s = squareLength(p);
    return {
      kind: 'steps',
      prompt: [
        prose(`The length of $${squareY(p)}$ from $x = ${p.a}$ to $x = ${p.b}$ is below. Tap the part you would do **next**, then choose what it comes to.`),
      ],
      start: [`s = \\int_{${p.a}}^{${p.b}}`, `\\sqrt{1 + \\left(${squareDy(p)}\\right)^{2}}`, '\\, dx'],
      reductions: [
        {
          span: [1, 2],
          value: root,
          // The root taken of dy/dx itself, and a root that splits over the sum.
          bank: tokenBank([root], [`\\left(${squareDy(p)}\\right)`, `\\left(1 + ${squareDy(p)}\\right)`, `\\left(1 + ${squareRoot(p)}\\right)`]),
        },
        {
          span: [0, 3],
          value: `s = ${bracket}`,
          bank: tokenBank([`s = ${bracket}`], [`s = \\left[${squareF(p, '+')}\\right]_{${p.a}}^{${p.b}}`, `s = \\left[${leadTerm(fmul(p.c, frac(1, p.r + 1)), powTex(p.r + 1))}\\right]_{${p.a}}^{${p.b}}`]),
        },
        {
          span: [0, 1],
          value: `s = ${fracTex(s)}`,
          // F(b) alone, F(b) + F(a), and the sign slip's value.
          bank: tokenBank(
            [`s = ${fracTex(s)}`],
            [
              `s = ${fracTex(squareAt(p, p.b))}`,
              `s = ${fracTex(fadd(squareAt(p, p.b), squareAt(p, p.a)))}`,
              `s = ${fracTex(fsub(squarePlusAt(p, p.b), squarePlusAt(p, p.a)))}`,
            ],
          ),
        },
      ],
    };
  },
  solution: squareSolution,
};

const squareTyped: Generator<SquareParams> = {
  id: 'int-arc-square-value',
  sample: (rng, difficulty) => sampleSquare(rng, difficulty),
  render: (p): Slide => {
    const s = squareLength(p);
    return {
      kind: 'expression',
      prompt: [prose(`Find the length of $${squareY(p)}$ from $x = ${p.a}$ to $x = ${p.b}$.`)],
      lead: 's =',
      keypad: s.d === 1 ? [] : FRACTION_KEYS,
      answer: `${fval(s)}`,
      alsoAccepts: [fracAns(s)],
      integrand: `sqrt(1 + (${squareDyAns(p)})^2)`,
      limits: [p.a, p.b],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: squareSolution,
};

/* ---------- 1 + (dy/dx)², as tiles ---------- */

export interface InsideParams {
  form: 'halves' | 'square';
  m: number;
  c: number;
  sq: SquareParams;
}

const insideTiles: Generator<InsideParams> = {
  id: 'int-arc-integrand-tiles',
  sample: (rng, difficulty) => ({
    form: difficulty > 1 ? 'square' : 'halves',
    m: rng.int(1, 6),
    c: rng.int(0, 4),
    sq: { r: rng.pick<2 | 3>([2, 3]), c: rng.pick(SQUARE_CS), a: 1, b: 2, k: rng.int(0, 3) },
  }),
  render: ({ form, m, c, sq }): Slide => {
    if (form === 'halves') {
      const answer = [halvesInside(m)];
      return {
        kind: 'tiles',
        prompt: [prose(`Here $${halvesY({ m, c })}$. Complete the line.`)],
        template: `1 + \\left(\\tfrac{dy}{dx}\\right)^2 = {0}`,
        bank: tokenBank(answer, [`1 + ${m}x`, `1 + ${m * m}x^{2}`, `${m * m}x`, `1 + ${2 * m}x`, `1 + ${m * m + 1}x`]),
        answer,
      };
    }
    const answer = [`\\left(${squareRoot(sq)}\\right)^{2}`];
    return {
      kind: 'tiles',
      prompt: [prose(`Here $${squareY(sq)}$. Complete the line.`)],
      template: `1 + \\left(\\tfrac{dy}{dx}\\right)^2 = {0}`,
      bank: tokenBank(answer, [`\\left(${squareDy(sq)}\\right)^{2}`, `1 + \\left(${squareRoot(sq)}\\right)^{2}`, `\\left(${squareRoot(sq)}\\right)`]),
      answer,
    };
  },
  solution: ({ form, m, sq }) =>
    form === 'halves'
      ? [
          { text: `Differentiate: $\\frac{dy}{dx} = ${leadTerm(frac(m), '\\sqrt{x}')}$. The constant goes.` },
          { tex: `1 + ${DYDX} = ${halvesInside(m)}` },
        ]
      : [
          { text: `Differentiate: $\\frac{dy}{dx} = ${squareDy(sq)}$.` },
          { text: 'Squared, the middle term is $-\\frac{1}{2}$; adding $1$ makes it $+\\frac{1}{2}$, which is the square with a plus sign.' },
          { tex: `1 + ${DYDX} = \\left(${squareRoot(sq)}\\right)^{2}` },
        ],
};

/* ---------- which integral ---------- */

export interface SetupParams {
  a: number;
  p: number;
  lo: number;
  hi: number;
}

const setupY = ({ a, p }: Pick<SetupParams, 'a' | 'p'>): string => leadTerm(frac(a), powTex(p));

/** 1 + (ap)² x^{2(p-1)}, or a slip of it. */
function underRoot(coefficient: number, power: number): string {
  if (power === 0) return `1 + ${coefficient}`;
  return `1 + ${coefficient === 1 ? '' : coefficient}${powTex(power)}`;
}

const arcSetup: Generator<SetupParams> = {
  id: 'int-arc-setup',
  sample: (rng, difficulty) => {
    const lo = difficulty > 1 ? rng.int(1, 2) : 0;
    return { a: rng.int(1, 4), p: rng.int(2, 4), lo, hi: lo + rng.int(1, 3) };
  },
  render: ({ a, p, lo, hi }): Slide => {
    const int = (body: string) => `\\int_{${lo}}^{${hi}} ${body} \\, dx`;
    const d = a * p;
    return {
      kind: 'choice',
      prompt: [prose(`Which integral gives the length of $y = ${setupY({ a, p })}$ from $x = ${lo}$ to $x = ${hi}$?`)],
      ...placed(
        [
          int(`\\sqrt{${underRoot(d * d, 2 * (p - 1))}}`),
          // dy/dx not squared, y used in place of dy/dx, and the root left off.
          int(`\\sqrt{${underRoot(d, p - 1)}}`),
          int(`\\sqrt{${underRoot(a * a, 2 * p)}}`),
          int(`\\left(${underRoot(d * d, 2 * (p - 1))}\\right)`),
        ],
        mix(a, p, lo, hi),
      ),
    };
  },
  solution: ({ a, p, lo, hi }) => [
    { text: `Differentiate: $\\frac{dy}{dx} = ${leadTerm(frac(a * p), powTex(p - 1))}$, and square it.` },
    { tex: `s = \\int_{${lo}}^{${hi}} \\sqrt{${underRoot(a * a * p * p, 2 * (p - 1))}} \\, dx` },
  ],
};

/* ---------- parametric ---------- */

export interface ParamParams {
  form: 'A' | 'B';
  k: number;
  t: number;
}

/** x(t) and y(t) as read. */
function paramCurve({ form, k }: Pick<ParamParams, 'form' | 'k'>): { x: string; y: string } {
  const kk = k === 1 ? '' : `${k}`;
  if (form === 'A') return { x: `${kk}t^{2}`, y: `${kk}t - ${fracTex(frac(k, 3)) === '1' ? '' : fracTex(frac(k, 3))}t^{3}` };
  return { x: `${kk}t^{3} - ${3 * k}t`, y: `${3 * k}t^{2}` };
}

const paramDx = ({ form, k }: Pick<ParamParams, 'form' | 'k'>, t: number): number => (form === 'A' ? 2 * k * t : 3 * k * t * t - 3 * k);
const paramDy = ({ form, k }: Pick<ParamParams, 'form' | 'k'>, t: number): number => (form === 'A' ? k - k * t * t : 6 * k * t);
const speedScale = ({ form, k }: Pick<ParamParams, 'form' | 'k'>): number => (form === 'A' ? k : 3 * k);

function paramDerivTex({ form, k }: Pick<ParamParams, 'form' | 'k'>): { dx: string; dy: string } {
  const lead = (v: number, body: string) => leadTerm(frac(v), body);
  if (form === 'A') return { dx: lead(2 * k, 't'), dy: `${k} - ${lead(k, 't^{2}')}` };
  return { dx: `${lead(3 * k, 't^{2}')} - ${3 * k}`, dy: lead(6 * k, 't') };
}

const speedTex = (p: Pick<ParamParams, 'form' | 'k'>): string => `${speedScale(p) === 1 ? '' : speedScale(p)}\\left(1 + t^{2}\\right)`;

const SPEED = '\\sqrt{\\left(\\frac{dx}{dt}\\right)^{2} + \\left(\\frac{dy}{dt}\\right)^{2}}';

const paramSpeedTree: Generator<ParamParams> = {
  id: 'int-arc-param-speed-tree',
  sample: (rng) => ({ form: rng.pick<'A' | 'B'>(['A', 'B']), k: rng.int(1, 3), t: rng.pick([1, 2, 3, 4, -1, -2]) }),
  render: (p): Slide => {
    const { x, y } = paramCurve(p);
    const dx = paramDx(p, p.t);
    const dy = paramDy(p, p.t);
    const answer = [dx, dy, dx * dx, dy * dy, dx * dx + dy * dy, speedScale(p) * (1 + p.t * p.t)].map(String);
    return {
      kind: 'tree',
      prompt: [prose(`Here $x = ${x}$ and $y = ${y}$. Find the speed at $t = ${p.t}$.`)],
      expression: SPEED,
      nodes: [
        { id: 'dx', from: [] },
        { id: 'dy', from: [] },
        { id: 'dx2', from: ['dx'] },
        { id: 'dy2', from: ['dy'] },
        { id: 'sum', from: ['dx2', 'dy2'] },
        { id: 'speed', from: ['sum'] },
      ],
      bank: tokenBank(
        answer,
        [dx + dy, dx * dx + dy * dy + 1, 2 * dx, speedScale(p) * (1 + p.t * p.t) + 1, speedScale(p) * p.t * p.t, 2 * dy + 1].map(String),
        3,
      ),
      answer,
    };
  },
  solution: (p) => {
    const d = paramDerivTex(p);
    const dx = paramDx(p, p.t);
    const dy = paramDy(p, p.t);
    return [
      { text: `Differentiate: $\\frac{dx}{dt} = ${d.dx}$ and $\\frac{dy}{dt} = ${d.dy}$. At $t = ${p.t}$ they are $${dx}$ and $${dy}$.` },
      { tex: `\\sqrt{${dx * dx} + ${dy * dy}} = \\sqrt{${dx * dx + dy * dy}}` },
      { tex: `= ${speedScale(p) * (1 + p.t * p.t)}` },
    ];
  },
};

export interface ParamLengthParams {
  form: 'A' | 'B';
  k: number;
  a: number;
  b: number;
}

/** ∫ s(1 + t²) dt from a to b. */
export function paramLength({ form, k, a, b }: ParamLengthParams): Frac {
  const s = form === 'A' ? k : 3 * k;
  const F = (t: number) => frac(s * (3 * t + t ** 3), 3);
  return fsub(F(b), F(a));
}

function paramLengthSolution(p: ParamLengthParams): SolutionStep[] {
  const d = paramDerivTex(p);
  return [
    { text: `Here $\\frac{dx}{dt} = ${d.dx}$ and $\\frac{dy}{dt} = ${d.dy}$. Their squares add to a perfect square:` },
    { tex: `${SPEED} = ${speedTex(p)}` },
    { tex: `s = \\int_{${p.a}}^{${p.b}} ${speedTex(p)} \\, dt` },
    { tex: `= \\left[${speedScale(p) === 1 ? '' : speedScale(p)}\\left(t + \\frac{t^{3}}{3}\\right)\\right]_{${p.a}}^{${p.b}}` },
    { tex: `= ${fracTex(paramLength(p))}` },
  ];
}

const paramLengthTyped: Generator<ParamLengthParams> = {
  id: 'int-arc-param-value',
  sample: (rng, difficulty) => {
    const pair = difficulty > 1 ? rng.pick([[1, 2], [1, 3], [2, 3]]) : [0, rng.int(1, 3)];
    return { form: rng.pick<'A' | 'B'>(['A', 'B']), k: rng.int(1, 5), a: pair[0], b: pair[1] };
  },
  choices: (p) => {
    const s = paramLength(p);
    const scale = p.form === 'A' ? p.k : 3 * p.k;
    // The 1 dropped from 1 + t², the t³ not divided by 3, and x(b) - x(a).
    const noOne = frac(scale * (p.b ** 3 - p.a ** 3), 3);
    const noThird = frac(scale * (p.b - p.a + p.b ** 3 - p.a ** 3));
    const xOnly = p.form === 'A' ? frac(p.k * (p.b ** 2 - p.a ** 2)) : frac(p.k * (p.b ** 3 - 3 * p.b - p.a ** 3 + 3 * p.a));
    return choiceList({ tex: fracTex(s) }, { tex: fracTex(noOne) }, { tex: fracTex(noThird) }, { tex: fracTex(xOnly) }, { tex: fracTex(fadd(s, frac(1))) });
  },
  render: (p): Slide => {
    const { x, y } = paramCurve(p);
    const s = paramLength(p);
    const dx = p.form === 'A' ? `2*${p.k}*x` : `3*${p.k}*x^2 - 3*${p.k}`;
    const dy = p.form === 'A' ? `${p.k} - ${p.k}*x^2` : `6*${p.k}*x`;
    return {
      kind: 'expression',
      prompt: [prose(`Find the length of the curve $x = ${x}$, $y = ${y}$ from $t = ${p.a}$ to $t = ${p.b}$.`)],
      lead: 's =',
      keypad: s.d === 1 ? [] : FRACTION_KEYS,
      answer: `${fval(s)}`,
      alsoAccepts: [fracAns(s)],
      // The dummy letter is x for the oracle; it stands for t.
      integrand: `sqrt((${dx})^2 + (${dy})^2)`,
      limits: [p.a, p.b],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: paramLengthSolution,
};

export interface ParamSetupParams {
  a: number;
  b: number;
  T: number;
}

const paramSetup: Generator<ParamSetupParams> = {
  id: 'int-arc-param-setup',
  sample: (rng) => ({ a: rng.int(1, 4), b: rng.int(1, 4), T: rng.int(1, 3) }),
  render: ({ a, b, T }): Slide => {
    const int = (body: string) => `\\int_{0}^{${T}} ${body} \\, dt`;
    const A = 4 * a * a;
    const B = 9 * b * b;
    return {
      kind: 'choice',
      prompt: [prose(`Which integral gives the length of $x = ${leadTerm(frac(a), 't^{2}')}$, $y = ${leadTerm(frac(b), 't^{3}')}$ from $t = 0$ to $t = ${T}$?`)],
      ...placed(
        [
          int(`\\sqrt{${A}t^{2} + ${B}t^{4}}`),
          // x and y in place of their derivatives, the root left off, and derivatives not squared.
          int(`\\sqrt{${a * a === 1 ? '' : a * a}t^{4} + ${b * b === 1 ? '' : b * b}t^{6}}`),
          int(`\\left(${A}t^{2} + ${B}t^{4}\\right)`),
          int(`\\sqrt{${2 * a}t + ${3 * b}t^{2}}`),
        ],
        mix(a, b, T),
      ),
    };
  },
  solution: ({ a, b, T }) => [
    { text: `Differentiate each: $\\frac{dx}{dt} = ${leadTerm(frac(2 * a), 't')}$ and $\\frac{dy}{dt} = ${leadTerm(frac(3 * b), 't^{2}')}$. Square and add under the root.` },
    { tex: `s = \\int_{0}^{${T}} \\sqrt{${4 * a * a}t^{2} + ${9 * b * b}t^{4}} \\, dt` },
  ],
};

/* ---------- surface area ---------- */

const surfSetup: Generator<SetupParams> = {
  id: 'int-surf-setup',
  sample: (rng, difficulty) => ({ a: rng.int(1, difficulty > 1 ? 4 : 3), p: rng.int(1, 3), lo: 0, hi: rng.int(1, difficulty > 1 ? 4 : 3) }),
  render: ({ a, p, hi }): Slide => {
    const int = (front: string, body: string) => `${front}\\int_{0}^{${hi}} ${body} \\, dx`;
    const y = setupY({ a, p });
    const d = a * p;
    const root = `\\sqrt{${underRoot(d * d, 2 * (p - 1))}}`;
    return {
      kind: 'choice',
      prompt: [prose(`The curve $y = ${y}$ from $x = 0$ to $x = ${hi}$ is turned once about the $x$-axis. Which integral gives the area of the curved surface?`)],
      ...placed(
        [
          int('2\\pi ', `${y}${root}`),
          // The volume instead, the y left out, and dy/dx not squared.
          int('\\pi ', `${leadTerm(frac(a * a), powTex(2 * p))}`),
          int('2\\pi ', root),
          int('2\\pi ', `${y}\\sqrt{${underRoot(d, p - 1)}}`),
        ],
        mix(a, p, hi),
      ),
    };
  },
  solution: ({ a, p, hi }) => [
    { text: 'Each thin band is a circle of radius $y$ times a slant length $ds$, so the area is $2\\pi \\int y \\, ds$.' },
    { tex: `S = 2\\pi \\int_{0}^{${hi}} ${setupY({ a, p })}\\sqrt{${underRoot(a * a * p * p, 2 * (p - 1))}} \\, dx` },
  ],
};

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
];

/** The x-values where 4x + m² is a square, for y = m√x. */
const ROOT_POINTS: Record<number, number[]> = { 1: [0, 2, 6, 12], 2: [0, 3, 8], 3: [0, 4, 10], 4: [0, 5, 12] };

export interface SurfParams {
  form: 'cone' | 'sphere' | 'root';
  /** cone: slope index; sphere: radius; root: m. */
  s: number;
  a: number;
  b: number;
}

/** S as a multiple of π. */
export function surfArea({ form, s, a, b }: SurfParams): Frac {
  if (form === 'cone') {
    const [p, q, r] = TRIPLES[s];
    return frac(p * r * (b * b - a * a), q * q);
  }
  if (form === 'sphere') return frac(2 * s * (b - a));
  const cube = (x: number) => Math.round(Math.sqrt(4 * x + s * s)) ** 3;
  return frac(s * (cube(b) - cube(a)), 6);
}

function surfY({ form, s }: Pick<SurfParams, 'form' | 's'>): string {
  if (form === 'cone') {
    const [p, q] = TRIPLES[s];
    return `y = ${fracTex(frac(p, q))}x`;
  }
  if (form === 'sphere') return `y = \\sqrt{${s * s} - x^{2}}`;
  return `y = ${s === 1 ? '' : s}\\sqrt{x}`;
}

function surfIntegrand({ form, s }: Pick<SurfParams, 'form' | 's'>): string {
  if (form === 'cone') {
    const [p, q] = TRIPLES[s];
    return `2*pi*(${p}/${q})*x*sqrt(1 + (${p}/${q})^2)`;
  }
  if (form === 'sphere') return `2*pi*sqrt(${s * s} - x^2)*sqrt(1 + x^2/(${s * s} - x^2))`;
  return `2*pi*(${s}/2)*sqrt(4*x + ${s * s})`;
}

/** y √(1 + (dy/dx)²), simplified, as read. */
function surfSimplified({ form, s }: Pick<SurfParams, 'form' | 's'>): string {
  if (form === 'cone') {
    const [p, q, r] = TRIPLES[s];
    return `${fracTex(frac(p * r, q * q))}x`;
  }
  if (form === 'sphere') return `${s}`;
  return `${leadTerm(frac(s, 2), '')}\\sqrt{4x + ${s * s}}`;
}

function sampleSurf(rng: { int(a: number, b: number): number; pick<T>(xs: T[]): T }, difficulty: number): SurfParams {
  const form = rng.pick<SurfParams['form']>(difficulty > 1 ? ['root', 'sphere', 'cone'] : ['cone', 'sphere']);
  if (form === 'cone') return { form, s: rng.int(0, 3), a: 0, b: rng.int(1, 4) };
  if (form === 'sphere') {
    const R = rng.int(3, 7);
    return drawUntil(
      () => ({ form, s: R, a: rng.int(-(R - 1), R - 2), b: rng.int(-(R - 2), R - 1) }),
      ({ a, b }) => b > a,
      { form, s: R, a: 0, b: 1 },
    );
  }
  const m = rng.int(1, 4);
  const pts = ROOT_POINTS[m];
  return drawUntil(() => ({ form, s: m, a: rng.pick(pts), b: rng.pick(pts) }), ({ a, b }) => b > a, { form, s: m, a: 0, b: pts[1] });
}

function surfSolution(p: SurfParams): SolutionStep[] {
  const steps: SolutionStep[] = [
    { text: `Work out $y\\sqrt{1 + ${DYDX}}$ first; for $${surfY(p)}$ it simplifies to $${surfSimplified(p)}$.` },
    { tex: `S = 2\\pi \\int_{${p.a}}^{${p.b}} ${surfSimplified(p)} \\, dx` },
  ];
  if (p.form === 'root') {
    const q = (x: number) => Math.round(Math.sqrt(4 * x + p.s * p.s));
    steps.push({ tex: `= ${piTex(frac(p.s, 6))}\\left[(4x + ${p.s * p.s})^{\\frac{3}{2}}\\right]_{${p.a}}^{${p.b}}` });
    steps.push({ tex: `= ${piTex(frac(p.s, 6))}\\left(${q(p.b)}^{3} - ${q(p.a)}^{3}\\right)` });
  }
  steps.push({ tex: `= ${piTex(surfArea(p))}` });
  return steps;
}

const surfTyped: Generator<SurfParams> = {
  id: 'int-surf-value',
  sample: (rng, difficulty) => sampleSurf(rng, difficulty),
  render: (p): Slide => {
    const S = surfArea(p);
    return {
      kind: 'expression',
      prompt: [
        prose(`The curve $${surfY(p)}$ from $x = ${p.a}$ to $x = ${p.b}$ is turned once about the $x$-axis. Find the area of the curved surface.`),
      ],
      lead: 'S =',
      keypad: PI_KEYS,
      answer: `${fval(S) * Math.PI}`,
      alsoAccepts: [piAns(S)],
      integrand: surfIntegrand(p),
      limits: [p.a, p.b],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: surfSolution,
};

export interface SurfTilesParams {
  form: 'cone' | 'line' | 'sphere' | 'root';
  s: number;
}

const surfTiles: Generator<SurfTilesParams> = {
  id: 'int-surf-integrand-tiles',
  sample: (rng) => {
    const form = rng.pick<SurfTilesParams['form']>(['cone', 'line', 'sphere', 'root']);
    return { form, s: form === 'cone' ? rng.int(0, 3) : form === 'line' ? rng.int(2, 7) : form === 'sphere' ? rng.int(2, 12) : rng.int(1, 8) };
  },
  render: ({ form, s }): Slide => {
    let y: string;
    let right: string;
    let wrong: string[];
    if (form === 'line') {
      y = `y = ${s}x`;
      right = `${s}\\sqrt{${1 + s * s}}x`;
      wrong = [`\\sqrt{${1 + s * s}}x`, `${s}\\sqrt{${1 + s}}x`, `${s * s}x`];
    } else if (form === 'cone' || form === 'sphere' || form === 'root') {
      const p: SurfParams = { form, s, a: 0, b: 1 };
      y = surfY(p);
      right = surfSimplified(p);
      if (form === 'cone') {
        const [a, q, r] = TRIPLES[s];
        wrong = [`${fracTex(frac(r, q))}x`, `${fracTex(frac(a * a, q * q))}x`, `${fracTex(frac(a * r, q))}x`];
      } else if (form === 'sphere') {
        wrong = [`\\sqrt{${s * s} - x^{2}}`, `${s * s}`, '1'];
      } else {
        wrong = [`${leadTerm(frac(s, 2), '')}\\sqrt{4x + 1}`, `${s === 1 ? '' : s}\\sqrt{x + ${s * s}}`, `\\sqrt{4x + ${s * s}}`];
      }
    } else {
      throw new Error('unreachable');
    }
    const answer = [right];
    return {
      kind: 'tiles',
      prompt: [prose(`Here $${y}$. Complete the line, simplified.`)],
      template: 'y\\sqrt{1 + \\left(\\tfrac{dy}{dx}\\right)^2} = {0}',
      bank: tokenBank(answer, wrong),
      answer,
    };
  },
  solution: ({ form, s }) => {
    if (form === 'line') {
      return [
        { text: `Here $\\frac{dy}{dx} = ${s}$, so the root is $\\sqrt{${1 + s * s}}$, a number.` },
        { tex: `${s}x \\cdot \\sqrt{${1 + s * s}} = ${s}\\sqrt{${1 + s * s}}x` },
      ];
    }
    const p: SurfParams = { form, s, a: 0, b: 1 };
    if (form === 'sphere') {
      return [
        { text: `Here $\\frac{dy}{dx} = -\\frac{x}{\\sqrt{${s * s} - x^{2}}}$, so $1 + ${DYDX} = \\frac{${s * s}}{${s * s} - x^{2}}$.` },
        { text: `Its root is $\\frac{${s}}{\\sqrt{${s * s} - x^{2}}}$, and times $y$ that leaves $${s}$.` },
      ];
    }
    if (form === 'root') {
      return [
        { text: `Here $\\frac{dy}{dx} = \\frac{${s}}{2\\sqrt{x}}$, so $1 + ${DYDX} = \\frac{4x + ${s * s}}{4x}$.` },
        { text: `Its root is $\\frac{\\sqrt{4x + ${s * s}}}{2\\sqrt{x}}$, and times $${s === 1 ? '' : s}\\sqrt{x}$ that leaves $${surfSimplified(p)}$.` },
      ];
    }
    const [a, q, r] = TRIPLES[s];
    return [
      { text: `Here $\\frac{dy}{dx} = ${fracTex(frac(a, q))}$, so the root is $\\sqrt{1 + \\frac{${a * a}}{${q * q}}} = ${fracTex(frac(r, q))}$.` },
      { tex: `${fracTex(frac(a, q))}x \\cdot ${fracTex(frac(r, q))} = ${surfSimplified(p)}` },
    ];
  },
};

/* ---------- length, area or volume ---------- */

export interface WhichParams {
  want: 'length' | 'area' | 'volume' | 'param';
  a: number;
  p: number;
  hi: number;
}

const whichFlow: Generator<WhichParams> = {
  id: 'int-arc-which-flow',
  sample: (rng) => ({ want: rng.pick<WhichParams['want']>(['length', 'area', 'volume', 'param']), a: rng.int(1, 4), p: rng.int(2, 3), hi: rng.int(1, 3) }),
  render: ({ want, a, p, hi }): Slide => {
    const salt = mix(a, p, hi, want.length);
    const y = setupY({ a, p });
    const d = a * p;
    const forms = {
      length: `\\int \\sqrt{1 + ${DYDX}} \\, dx`,
      param: `\\int \\sqrt{\\left(\\frac{dx}{dt}\\right)^{2} + \\left(\\frac{dy}{dt}\\right)^{2}} \\, dt`,
      area: `2\\pi \\int y\\sqrt{1 + ${DYDX}} \\, dx`,
      volume: '\\pi \\int y^{2} \\, dx',
    };
    const subject = want === 'param' ? `x = t^{2}, \\quad y = ${leadTerm(frac(a), powTex(p, 't'))}` : `y = ${y}, \\quad 0 \\le x \\le ${hi}`;
    const ask = {
      length: 'You want the length of this curve. Which formula?',
      param: 'You want the length of this curve. Which formula?',
      area: 'The curve is turned once about the $x$-axis and you want the area of the curved surface. Which formula?',
      volume: 'The region under the curve is turned once about the $x$-axis and you want the volume. Which formula?',
    }[want];
    const inside =
      want === 'volume'
        ? {
            right: leadTerm(frac(a * a), powTex(2 * p)),
            wrong: [...new Set([leadTerm(frac(a), powTex(2 * p)), leadTerm(frac(a * a), powTex(p)), leadTerm(frac(2 * a), powTex(p)), leadTerm(frac(a * a), powTex(2 * p + 1))])]
              .filter((tex) => tex !== leadTerm(frac(a * a), powTex(2 * p)))
              .slice(0, 2),
            q: 'What is $y^{2}$ here?',
          }
        : want === 'param'
          ? {
              right: `4t^{2} + ${a * a * p * p}${powTex(2 * (p - 1), 't')}`,
              wrong: [`2t + ${a * p}${powTex(p - 1, 't')}`, `t^{4} + ${a * a === 1 ? '' : a * a}${powTex(2 * p, 't')}`],
              q: 'What goes under the root?',
            }
          : {
              right: underRoot(d * d, 2 * (p - 1)),
              wrong: [underRoot(d, p - 1), underRoot(a * a, 2 * p)],
              q: 'What goes under the root?',
            };
    const wrongFormula = 'Not quite: match the formula to what is being measured, and to how the curve is given.';
    return {
      kind: 'flow',
      prompt: [prose('Choose the integral, then fill it in.')],
      subject,
      steps: [
        {
          id: 'formula',
          ask,
          branches: turned(
            (Object.keys(forms) as (keyof typeof forms)[]).map((key) =>
              key === want ? { label: `$${forms[key]}$`, to: 'inside' } : { label: `$${forms[key]}$`, outcome: wrongFormula },
            ),
            salt,
          ),
        },
        {
          id: 'inside',
          ask: inside.q,
          branches: turned(
            [
              { label: `$${inside.right}$`, outcome: 'Yes. The rest is integrating between the limits.' },
              ...inside.wrong.map((tex) => ({ label: `$${tex}$`, outcome: 'Not quite: differentiate, then square.' })),
            ],
            salt + 1,
          ),
        },
      ],
      answer: [`$${forms[want]}$`, `$${inside.right}$`],
    };
  },
  solution: ({ want, a, p }) => {
    const text = {
      length: 'A length along $y = f(x)$ uses $\\int \\sqrt{1 + (dy/dx)^{2}} \\, dx$.',
      param: 'A length along a curve given by $t$ uses $\\int \\sqrt{\\dot{x}^{2} + \\dot{y}^{2}} \\, dt$.',
      area: 'A curved surface uses $2\\pi \\int y \\, ds$.',
      volume: 'A volume uses $\\pi \\int y^{2} \\, dx$.',
    }[want];
    const d = a * p;
    const inside =
      want === 'volume'
        ? `y^{2} = ${leadTerm(frac(a * a), powTex(2 * p))}`
        : want === 'param'
          ? `\\dot{x}^{2} + \\dot{y}^{2} = 4t^{2} + ${d * d}${powTex(2 * (p - 1), 't')}`
          : `1 + ${DYDX} = ${underRoot(d * d, 2 * (p - 1))}`;
    return [{ text }, { tex: inside }];
  },
};

/** This level's generators by name, for `integralKit.test.ts`. */
export const arcLengthByName = {
  halvesTyped,
  squareSteps,
  squareTyped,
  insideTiles,
  arcSetup,
  paramSpeedTree,
  paramLengthTyped,
  paramSetup,
  surfSetup,
  surfTyped,
  surfTiles,
  whichFlow,
};

export const arcLengthGenerators = Object.values(arcLengthByName) as unknown as Generator<unknown>[];

