/**
 * Polynomials level 11: sums of powers of roots.
 *
 * Level 4 found α² + β² and Σ1/α from the coefficients. This level goes on to
 * higher powers. Two routes, taught side by side: identities in the sums of
 * the roots (α³ + β³ = (α + β)³ - 3αβ(α + β), Σα²β = ΣαΣαβ - 3αβγ), and
 * the fact that every root satisfies its own equation, which added over the
 * roots gives aS₃ + bS₂ + cS₁ + 3d = 0 and, multiplied by αⁿ first, a
 * recurrence for every Sₙ = αⁿ + βⁿ (+ γⁿ).
 *
 * Two kinds of polynomial are used. A monic one with whole coefficients is
 * drawn straight from its coefficients, and its roots are usually not whole;
 * its power sums still are, since the recurrence only multiplies and adds
 * whole numbers, which is the point the lessons make. One with a leading
 * coefficient is built outward from whole roots with `fromRoots`, so every
 * sum is whole by construction however it is divided.
 *
 * `powerSums` runs Newton's identities on the coefficients.
 * `rootsPowerSums.test.ts` checks every answer against the roots themselves,
 * found numerically, so a slip in the identities cannot agree with itself.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { fracTex, say } from './format';
import {
  chain,
  choiceSlide,
  coefMark,
  factor,
  fracAnswer,
  fromRoots,
  intOptions,
  nonZero,
  numberBank,
  overLead,
  polyTex,
  sampleRoots,
  signedNum,
  stepBank,
  turned,
  type Poly,
} from './polynomials';

/* ---------- arithmetic ---------- */

/** -0 read as 0, so it never prints as "-0" or fails an equality. */
const tidy = (n: number): number => n + 0;

/** The sums of the roots from the coefficients: [Σα, Σαβ, αβγ], signs alternating. */
export function rootSumsOf(p: Poly): number[] {
  return p.slice(1).map((c, i) => tidy(((i % 2 === 0 ? -1 : 1) * c) / p[0]));
}

/**
 * S₀ to S_top, the sums of the powers of the roots, by Newton's identities:
 * p₀Sₘ + p₁Sₘ₋₁ + … + mpₘ = 0 while m is at most the degree, and the plain
 * recurrence after it.
 */
export function powerSums(p: Poly, top: number): number[] {
  const k = p.length - 1;
  const s = [k];
  for (let m = 1; m <= top; m += 1) {
    let acc = m <= k ? m * p[m] : 0;
    for (let i = 1; i <= Math.min(m - 1, k); i += 1) acc += p[i] * s[m - i];
    s.push(tidy(-acc / p[0]));
  }
  return s;
}

/** A number as a factor, bracketed when negative. */
const br = (n: number): string => factor(String(n));

const LEADS = [2, -2, 3, -3];

const TWO = '$\\alpha$ and $\\beta$';
const THREE = '$\\alpha$, $\\beta$ and $\\gamma$';

/** A sum read off the coefficients, as a line of working: `Σα &= -(-4) = 4`. */
function readSum(label: string, c: number, a: number, minus: boolean, value: number): string {
  if (a === 1 && !minus) return `${label} &= ${value}`;
  return `${label} &= ${overLead(c, a, minus)} = ${value}`;
}

function quadSumsTex(p: Poly): string {
  const [s, e] = rootSumsOf(p);
  return chain(readSum('\\alpha + \\beta', p[1], p[0], true, s), readSum('\\alpha\\beta', p[2], p[0], false, e));
}

function cubicSumsTex(p: Poly): string {
  const [e1, e2, e3] = rootSumsOf(p);
  return chain(
    readSum('\\Sigma\\alpha', p[1], p[0], true, e1),
    readSum('\\Sigma\\alpha\\beta', p[2], p[0], false, e2),
    readSum('\\alpha\\beta\\gamma', p[3], p[0], true, e3),
  );
}

/** A term k·S_sub in a rule: the first unsigned, 1 left off. */
function sTerm(k: number, sub: string, first: boolean): string {
  const body = `S_{${sub}}`;
  const size = Math.abs(k) === 1 ? body : `${Math.abs(k)}${body}`;
  if (first) return k < 0 ? `-${size}` : size;
  return k < 0 ? `- ${size}` : `+ ${size}`;
}

/** The recurrence with these coefficients, as the learner reads it. */
function ruleTex(coeffs: number[]): string {
  const subs = coeffs.length === 2 ? ['n+1', 'n'] : ['n+2', 'n+1', 'n'];
  const lhs = coeffs.length === 2 ? 'S_{n+2}' : 'S_{n+3}';
  return `${lhs} = ${coeffs.map((k, i) => sTerm(k, subs[i], i === 0)).join(' ')}`;
}

/** One line of the recurrence with numbers in: `-3 \times 7 + 2 \times (-4)`. */
function productsTex(coeffs: number[], values: number[]): string {
  return coeffs.map((k, i) => `${i === 0 ? String(k) : signedNum(k)} \\times ${br(values[i])}`).join(' ');
}

/**
 * One row of working, `lhs &= rhs = value`, with the value moved to a line of
 * its own when the row would run past a phone's width. An aligned block cannot
 * wrap, and a row of products such as -2 × 112 + 4 × (-32) is already most
 * of a line.
 */
function row(lhs: string, rhs: string, value: number): string[] {
  const size = rhs.replace(/\\times/g, 'xx').replace(/[\s{}]/g, '').length + String(value).length;
  return size <= ROW_FIT ? [`${lhs} &= ${rhs} = ${value}`] : [`${lhs} &= ${rhs}`, `&= ${value}`];
}

/** Characters of numbers and signs one row holds beside a short label, a times counting two. */
const ROW_FIT = 14;

/** A monic polynomial with whole coefficients, none of them zero. */
function monic(rng: Rng, ...limits: number[]): Poly {
  return [1, ...limits.map((m) => nonZero(rng, m))];
}

function expression(prompt: Block[], lead: string, answer: string, fraction = false): Slide {
  return {
    kind: 'expression',
    prompt,
    lead,
    keypad: fraction ? [{ insert: '/' }] : [],
    answer,
    domain: 'real',
    mode: 'exact',
  };
}

/* ================================================================
 * Lesson 1: two roots
 * ================================================================ */

interface QuadParams {
  /** A quadratic, monic with whole coefficients or built from whole roots. */
  p: Poly;
}

function sampleQuadratic(rng: Rng, difficulty: number, ok: (s: number, e: number) => boolean): QuadParams {
  for (;;) {
    const p = difficulty > 1 ? fromRoots(sampleRoots(rng, 2, 4), rng.pick(LEADS)) : monic(rng, 6, 9);
    const [s, e] = rootSumsOf(p);
    if (s !== 0 && e !== 0 && ok(s, e)) return { p };
  }
}

const cubeOfTwo = (s: number, e: number): number => s ** 3 - 3 * e * s;

function cubeOfTwoSolution(p: Poly): SolutionStep[] {
  const [s, e] = rootSumsOf(p);
  return [
    { text: 'Cubing the sum gives both cubes and $3\\alpha\\beta(\\alpha + \\beta)$ besides, so' },
    { tex: chain('\\alpha^{3} + \\beta^{3} &= (\\alpha + \\beta)^{3}', '&\\quad - 3\\alpha\\beta(\\alpha + \\beta)') },
    { text: 'From the coefficients:' },
    { tex: quadSumsTex(p) },
    {
      tex: chain(
        `\\alpha^{3} + \\beta^{3} &= ${br(s)}^{3}`,
        `&\\quad - 3 \\times ${br(e)} \\times ${br(s)}`,
        `&= ${s ** 3} ${signedNum(-3 * e * s)}`,
        `&= ${cubeOfTwo(s, e)}`,
      ),
    },
  ];
}

/** α³ + β³ from a quadratic's coefficients. */
const powCubeTwo: Generator<QuadParams> = {
  id: 'poly-pow-cube-two',
  sample: (rng, difficulty) => sampleQuadratic(rng, difficulty, (s, e) => Math.abs(cubeOfTwo(s, e)) <= 300),
  choices: ({ p }) => {
    const [s, e] = rootSumsOf(p);
    return intOptions(cubeOfTwo(s, e), [s ** 3 + 3 * e * s, s ** 3 - 3 * e, s ** 3 - e * s, s ** 3]);
  },
  render: ({ p }) => {
    const [s, e] = rootSumsOf(p);
    return expression(
      [say(`${TWO} are the roots of $${polyTex(p)} = 0$. Find $\\alpha^{3} + \\beta^{3}$ without solving.`)],
      '\\alpha^{3} + \\beta^{3} =',
      String(cubeOfTwo(s, e)),
    );
  },
  solution: ({ p }) => cubeOfTwoSolution(p),
};

/** The same through a tree: the two sums, the two pieces, then the difference. */
const powCubeTree: Generator<QuadParams> = {
  id: 'poly-pow-cube-tree',
  sample: (rng, difficulty) => sampleQuadratic(rng, difficulty, (s, e) => Math.abs(cubeOfTwo(s, e)) <= 300),
  render: ({ p }): Slide => {
    const [s, e] = rootSumsOf(p);
    const values = [s, e, s ** 3, 3 * e * s, cubeOfTwo(s, e)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${TWO} are the roots of this quadratic. Top row: $\\alpha + \\beta$, then $\\alpha\\beta$. Next $(\\alpha + \\beta)^{3}$ and $3\\alpha\\beta(\\alpha + \\beta)$. Last $\\alpha^{3} + \\beta^{3}$, the first of those minus the second.`,
        ),
      ],
      expression: `${polyTex(p)} = 0`,
      nodes: [
        { id: 's', from: [] },
        { id: 'e', from: [] },
        { id: 'cube', from: ['s'] },
        { id: 'cross', from: ['s', 'e'] },
        { id: 'total', from: ['cube', 'cross'] },
      ],
      bank: numberBank(values, [-s, -e, -(s ** 3), s ** 3 + 3 * e * s, 3 * e, e * s], String, 3),
      answer: values.map(String),
    };
  },
  solution: ({ p }) => cubeOfTwoSolution(p),
};

interface TwoSymParams extends QuadParams {
  /** 0 for α²β + αβ², 1 for (α - β)². */
  ask: number;
}

const TWO_SYM_LABELS = ['\\alpha^{2}\\beta + \\alpha\\beta^{2}', '(\\alpha - \\beta)^{2}'];

const twoSymValue = (s: number, e: number, ask: number): number => (ask === 0 ? e * s : s * s - 4 * e);

/** α²β + αβ² or (α - β)² from the sum and product. */
const powTwoSym: Generator<TwoSymParams> = {
  id: 'poly-pow-two-sym',
  sample: (rng, difficulty) => {
    const ask = rng.int(0, 1);
    const q = sampleQuadratic(rng, difficulty, (s, e) =>
      ask === 0 ? Math.abs(e * s) <= 200 : s * s - 4 * e > 0 && s * s - 4 * e <= 200,
    );
    return { ...q, ask };
  },
  choices: ({ p, ask }) => {
    const [s, e] = rootSumsOf(p);
    const v = twoSymValue(s, e, ask);
    return ask === 0
      ? intOptions(v, [-v, e + s, e * s * s, e * e * s])
      : intOptions(v, [s * s + 4 * e, s * s - 2 * e, 4 * e - s * s, s * s - 4]);
  },
  render: ({ p, ask }) => {
    const [s, e] = rootSumsOf(p);
    return expression(
      [say(`${TWO} are the roots of $${polyTex(p)} = 0$. Find $${TWO_SYM_LABELS[ask]}$ without solving.`)],
      `${TWO_SYM_LABELS[ask]} =`,
      String(twoSymValue(s, e, ask)),
    );
  },
  solution: ({ p, ask }) => {
    const [s, e] = rootSumsOf(p);
    const v = twoSymValue(s, e, ask);
    const head: SolutionStep[] =
      ask === 0
        ? [{ text: 'Take out the common factor $\\alpha\\beta$:' }, { tex: '\\alpha^{2}\\beta + \\alpha\\beta^{2} = \\alpha\\beta(\\alpha + \\beta)' }]
        : [
            { text: 'Squaring the difference gives both squares less $2\\alpha\\beta$, and the squares are $(\\alpha + \\beta)^{2} - 2\\alpha\\beta$, so' },
            { tex: '(\\alpha - \\beta)^{2} = (\\alpha + \\beta)^{2} - 4\\alpha\\beta' },
          ];
    const last =
      ask === 0
        ? chain(`${TWO_SYM_LABELS[0]} &= ${br(e)} \\times ${br(s)}`, `&= ${v}`)
        : chain(`(\\alpha - \\beta)^{2} &= ${br(s)}^{2} - 4 \\times ${br(e)}`, `&= ${v}`);
    return [...head, { text: 'From the coefficients:' }, { tex: quadSumsTex(p) }, { tex: last }];
  },
};

/* ================================================================
 * Lesson 2: every root satisfies the equation
 * ================================================================ */

interface QuadStepsParams {
  b: number;
  c: number;
  /** The power asked for, from the two before it. */
  n: number;
}

/** S_n = -bS_{n-1} - cS_{n-2}, the two products then their sum. */
const powQuadSteps: Generator<QuadStepsParams> = {
  id: 'poly-pow-quad-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const b = nonZero(rng, hard ? 4 : 5);
      const c = nonZero(rng, hard ? 5 : 6);
      const n = hard ? rng.int(4, 5) : 3;
      const s = powerSums([1, b, c], n);
      if (s[n - 1] === 0 || s[n - 2] === 0 || s.some((v) => Math.abs(v) > 400)) continue;
      return { b, c, n };
    }
  },
  render: ({ b, c, n }): Slide => {
    const p = [1, b, c];
    const s = powerSums(p, n);
    const v0 = -b * s[n - 1];
    const v1 = -c * s[n - 2];
    const total = s[n];
    return {
      kind: 'steps',
      prompt: [
        say(
          `${TWO} are the roots of $${polyTex(p)} = 0$, with $S_{${n - 2}} = ${s[n - 2]}$ and $S_{${n - 1}} = ${s[n - 1]}$. The line below puts the numbers into $S_{${n}} = -bS_{${n - 1}} - cS_{${n - 2}}$. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start: [`${-b} \\times ${br(s[n - 1])}`, `${signedNum(-c)} \\times ${br(s[n - 2])}`],
      reductions: [
        { span: [0, 1], value: String(v0), bank: stepBank(String(v0), String(-v0), String(v0 + s[n - 1]), String(v0 - s[n - 1])) },
        {
          span: [1, 2],
          value: signedNum(v1),
          bank: stepBank(signedNum(v1), signedNum(-v1), signedNum(v1 + s[n - 2]), signedNum(v1 - s[n - 2])),
        },
        { span: [0, 2], value: String(total), bank: stepBank(String(total), String(v0 - v1), String(-total), String(total + 1)) },
      ],
    };
  },
  solution: ({ b, c, n }) => {
    const p = [1, b, c];
    const s = powerSums(p, n);
    return [
      { text: `Each root satisfies $${polyTex(p)} = 0$. Multiplied by $\\alpha^{n}$ and added over both roots, that gives` },
      { tex: ruleTex([-b, -c]) },
      {
        tex: chain(
          `S_{${n}} &= ${productsTex([-b, -c], [s[n - 1], s[n - 2]])}`,
          `&= ${-b * s[n - 1]} ${signedNum(-c * s[n - 2])}`,
          `&= ${s[n]}`,
        ),
      },
    ];
  },
};

interface QuadTableParams {
  b: number;
  c: number;
  /** The last row of the table. */
  top: number;
}

/** A table of S_n for a monic quadratic, S_0 and S_1 given. */
const powQuadTable: Generator<QuadTableParams> = {
  id: 'poly-pow-quad-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const b = nonZero(rng, hard ? 4 : 3);
      const c = nonZero(rng, hard ? 6 : 4);
      const top = hard ? 5 : 4;
      const s = powerSums([1, b, c], top);
      // A period-three sequence such as x^2 + x + 1 fills every blank alike.
      if (s.some((v) => Math.abs(v) > 400) || new Set(s.slice(2)).size < top - 1) continue;
      return { b, c, top };
    }
  },
  render: ({ b, c, top }): Slide => {
    const p = [1, b, c];
    const s = powerSums(p, top);
    const answer = s.slice(2);
    const slips: number[] = [-b * s[1] - c];
    for (let n = 2; n <= top; n += 1) slips.push(b * s[n - 1] - c * s[n - 2], -b * s[n - 1] + c * s[n - 2]);
    return {
      kind: 'table',
      prompt: [
        say(
          top === 4
            ? `${TWO} are the roots of $${polyTex(p)} = 0$. Their power sums follow $${ruleTex([-b, -c])}$. Fill in the table.`
            : `${TWO} are the roots of $${polyTex(p)} = 0$. Fill in the table of $S_n = \\alpha^{n} + \\beta^{n}$.`,
        ),
      ],
      columns: ['n', 'S_n'],
      rows: s.map((v, n) => [String(n), n <= 1 ? String(v) : null]),
      bank: numberBank(answer, slips, String, 3),
      answer: answer.map(String),
    };
  },
  solution: ({ b, c, top }) => {
    const p = [1, b, c];
    const s = powerSums(p, top);
    return [
      { text: `Start from $S_0 = 2$, one for each root, and $S_1 = ${s[1]}$, the sum of the roots. Then run the rule:` },
      { tex: ruleTex([-b, -c]) },
      {
        tex: chain(
          ...Array.from({ length: top - 1 }, (_, i) => {
            const n = i + 2;
            return row(`S_{${n}}`, productsTex([-b, -c], [s[n - 1], s[n - 2]]), s[n]);
          }).flat(),
        ),
      },
    ];
  },
};

interface RuleParams {
  /** Monic, degree 2 or 3, every coefficient non-zero. */
  p: Poly;
}

/** Which recurrence the power sums follow: the signs of the coefficients flip. */
const powRecurrence: Generator<RuleParams> = {
  id: 'poly-pow-recurrence',
  sample: (rng, difficulty) => ({ p: difficulty > 1 ? monic(rng, 5, 6, 9) : monic(rng, 6, 9) }),
  render: ({ p }): Slide => {
    const right = p.slice(1).map((c) => -c);
    const variants =
      right.length === 2
        ? [right.map((k) => -k), [right[0], -right[1]], [-right[0], right[1]]]
        : [right.map((k) => -k), [right[0], -right[1], right[2]], [-right[0], right[1], -right[2]]];
    const opts: ChoiceOption[] = options({ tex: ruleTex(right) }, ...variants.map((v) => ({ tex: ruleTex(v) })));
    return choiceSlide(
      [say(`${right.length === 2 ? TWO : THREE} are the roots of $${polyTex(p)} = 0$. Which rule do their power sums $S_n$ follow?`)],
      opts,
    );
  },
  solution: ({ p }) => {
    const right = p.slice(1).map((c) => -c);
    const k = p.length - 1;
    const rhs = polyTex(right).replace(/x/g, '\\alpha');
    return [
      { text: `Each root satisfies the equation, so for $\\alpha$:` },
      { tex: `\\alpha^{${k}} = ${rhs}` },
      { text: `Multiply by $\\alpha^{n}$, write the same for every root and add. Each coefficient changes sign on the way across:` },
      { tex: ruleTex(right) },
    ];
  },
};

/* ================================================================
 * Lesson 3: three roots
 * ================================================================ */

interface CubicParams {
  /** A cubic, monic with whole coefficients or built from whole roots. */
  p: Poly;
}

function sampleCubic(rng: Rng, difficulty: number, ok: (s: number[]) => boolean): CubicParams {
  for (;;) {
    const p = difficulty > 1 ? fromRoots(sampleRoots(rng, 3, 3), rng.pick(LEADS)) : monic(rng, 3, 4, 4);
    const [e1, e2] = rootSumsOf(p);
    const s = powerSums(p, 3);
    if (e1 === 0 || e2 === 0 || s[2] === 0 || !ok(s)) continue;
    return { p };
  }
}

const smallS3 = (s: number[]) => Math.abs(s[3]) <= 200;

/** S₃ in the sums of the roots: aS₃ + bS₂ + cS₁ + 3d = 0 divided by a. */
const S3_RULE = 'S_3 = \\Sigma\\alpha\\,S_2 - \\Sigma\\alpha\\beta\\,S_1 + 3\\alpha\\beta\\gamma';

/** `S3_RULE` with the numbers in, one term to a line where the products run long. */
function s3Working(e1: number, e2: number, e3: number, s: number[]): string {
  return chain(
    `S_3 &= ${e1} \\times ${br(s[2])} ${signedNum(-e2)} \\times ${br(e1)}`,
    `&\\quad ${signedNum(3 * e3)}`,
    `&= ${s[3]}`,
  );
}

function cubicS3Solution(p: Poly): SolutionStep[] {
  const [a, b, c, d] = p;
  const [e1, e2] = rootSumsOf(p);
  const s = powerSums(p, 3);
  return [
    { text: 'Each root satisfies the equation. Adding the three versions, $d$ comes in once per root:' },
    { tex: 'aS_3 + bS_2 + cS_1 + 3d = 0' },
    { text: `From the coefficients, $\\Sigma\\alpha = ${e1}$ and $\\Sigma\\alpha\\beta = ${e2}$. So $S_1 = ${e1}$ and` },
    { tex: chain(`S_2 &= (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta`, `&= ${br(e1)}^{2} - 2 \\times ${br(e2)}`, `&= ${s[2]}`) },
    { text: 'Putting those in:' },
    {
      tex: chain(
        `${coefMark(a)}S_3 &= ${-b * s[2]} ${signedNum(-c * s[1])} ${signedNum(-3 * d)}`,
        `&= ${a * s[3]}`,
        ...(a === 1 ? [] : [`S_3 &= ${s[3]}`]),
      ),
    },
  ];
}

/** S_3 through a tree: the three sums, then S_2, then S_3. */
const powS3Tree: Generator<CubicParams> = {
  id: 'poly-pow-s3-tree',
  sample: (rng, difficulty) => sampleCubic(rng, difficulty, smallS3),
  render: ({ p }): Slide => {
    const [e1, e2, e3] = rootSumsOf(p);
    const s = powerSums(p, 3);
    const values = [e1, e2, e3, s[2], s[3]];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${THREE} are the roots of this cubic. Top row: $\\Sigma\\alpha$, $\\Sigma\\alpha\\beta$ and $\\alpha\\beta\\gamma$. The next row is $S_2 = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta$, and the last is $${S3_RULE}$.`,
        ),
      ],
      expression: `${polyTex(p)} = 0`,
      nodes: [
        { id: 'e1', from: [] },
        { id: 'e2', from: [] },
        { id: 'e3', from: [] },
        { id: 's2', from: ['e1', 'e2'] },
        { id: 's3', from: ['s2', 'e3'] },
      ],
      bank: numberBank(values, [-e1, -e2, -e3, e1 * e1 + 2 * e2, s[3] - 2 * e3, e1 * s[2] + e2 * e1 + 3 * e3], String, 3),
      answer: values.map(String),
    };
  },
  solution: ({ p }) => {
    const [e1, e2, e3] = rootSumsOf(p);
    const s = powerSums(p, 3);
    return [
      { text: 'Read the three sums off the coefficients:' },
      { tex: cubicSumsTex(p) },
      { tex: chain(`S_2 &= (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta`, `&= ${br(e1)}^{2} - 2 \\times ${br(e2)} = ${s[2]}`) },
      { text: 'Adding the equation over the three roots and dividing by $a$ gives $S_3$ in the sums:' },
      { tex: S3_RULE },
      { tex: s3Working(e1, e2, e3, s) },
    ];
  },
};

/** S_3 for a cubic, typed. */
const powCubicS3: Generator<CubicParams> = {
  id: 'poly-pow-cubic-s3',
  sample: (rng, difficulty) => sampleCubic(rng, difficulty, smallS3),
  choices: ({ p }) => {
    const [e1, e2, e3] = rootSumsOf(p);
    const s = powerSums(p, 3);
    return intOptions(s[3], [s[3] - 2 * e3, e1 * s[2] + e2 * e1 + 3 * e3, s[3] - 6 * e3, -s[3]]);
  },
  render: ({ p }) => {
    const s = powerSums(p, 3);
    return expression(
      [say(`${THREE} are the roots of $${polyTex(p)} = 0$. Find $S_3 = \\alpha^{3} + \\beta^{3} + \\gamma^{3}$.`)],
      'S_3 =',
      String(s[3]),
    );
  },
  solution: ({ p }) => cubicS3Solution(p),
};

interface CubicStepsParams {
  /** Monic, whole coefficients, none zero. */
  p: Poly;
  /** 3, from S_2 and S_1, or 4 from the three before it. */
  n: number;
}

/** S_3 = -bS_2 - cS_1 - 3d, or S_4 = -bS_3 - cS_2 - dS_1, worked a piece at a time. */
const powCubicSteps: Generator<CubicStepsParams> = {
  id: 'poly-pow-cubic-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = hard ? monic(rng, 3, 3, 3) : monic(rng, 3, 4, 4);
      const n = hard ? 4 : 3;
      const s = powerSums(p, n);
      if (s.slice(1, n).some((v) => v === 0) || s.some((v) => Math.abs(v) > 300)) continue;
      return { p, n };
    }
  },
  render: ({ p, n }): Slide => {
    const [, b, c, d] = p;
    const s = powerSums(p, n);
    const coeffs = n === 3 ? [-b, -c] : [-b, -c, -d];
    const products = coeffs.map((k, i) => k * s[n - 1 - i]);
    const start = coeffs.map((k, i) => `${i === 0 ? String(k) : signedNum(k)} \\times ${br(s[n - 1 - i])}`);
    if (n === 3) start.push(signedNum(-3 * d));
    const show = (v: number, i: number) => (i === 0 ? String(v) : signedNum(v));
    const reductions = products.map((v, i) => {
      const base = s[n - 1 - i];
      return {
        span: [i, i + 1] as [number, number],
        value: show(v, i),
        bank: stepBank(show(v, i), show(-v, i), show(v + base, i), show(v - base, i)),
      };
    });
    const total = s[n];
    const flip = n === 3 ? total + 6 * d : total + 2 * products[0];
    reductions.push({
      span: [0, 3],
      value: String(total),
      bank: stepBank(String(total), String(flip), String(-total), String(total + 1)),
    });
    const given = Array.from({ length: n - 1 }, (_, i) => `$S_{${i + 1}} = ${s[i + 1]}$`);
    const rule = n === 3 ? 'S_3 = -bS_2 - cS_1 - 3d' : 'S_4 = -bS_3 - cS_2 - dS_1';
    return {
      kind: 'steps',
      prompt: [
        say(
          `${THREE} are the roots of $${polyTex(p)} = 0$, with ${given.slice(0, -1).join(', ')} and ${given[given.length - 1]}. The line below puts the numbers into $${rule}$. Tap the part you would do **next**, then choose what it comes to.`,
        ),
      ],
      start,
      reductions,
    };
  },
  solution: ({ p, n }) => {
    const [, b, c, d] = p;
    const s = powerSums(p, n);
    const coeffs = n === 3 ? [-b, -c] : [-b, -c, -d];
    const products = coeffs.map((k, i) => k * s[n - 1 - i]);
    const values = n === 3 ? [...products, -3 * d] : products;
    return [
      {
        text:
          n === 3
            ? 'Each root satisfies the equation; adding the three versions, with $a = 1$:'
            : 'Each root satisfies the equation; multiplying by $\\alpha$ and adding over the roots:',
      },
      { tex: n === 3 ? 'S_3 = -bS_2 - cS_1 - 3d' : 'S_4 = -bS_3 - cS_2 - dS_1' },
      {
        tex: chain(
          `S_{${n}} &= ${productsTex(coeffs.slice(0, 2), [s[n - 1], s[n - 2]])}`,
          `&\\quad ${n === 3 ? signedNum(-3 * d) : `${signedNum(-d)} \\times ${br(s[1])}`}`,
          `&= ${values.map((v, i) => (i === 0 ? String(v) : signedNum(v))).join(' ')}`,
          `&= ${s[n]}`,
        ),
      },
    ];
  },
};

/* ================================================================
 * Lesson 4: higher powers
 * ================================================================ */

interface CubicTableParams {
  p: Poly;
  top: number;
}

/** A table of S_n for a monic cubic: S_0, S_1, S_2 given, the rest by the recurrence. */
const powCubicTable: Generator<CubicTableParams> = {
  id: 'poly-pow-cubic-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = hard ? monic(rng, 3, 3, 3) : monic(rng, 2, 2, 2);
      const top = hard ? 5 : 4;
      const s = powerSums(p, top);
      if (s.some((v) => Math.abs(v) > 500) || new Set(s.slice(3)).size < top - 2) continue;
      return { p, top };
    }
  },
  render: ({ p, top }): Slide => {
    const [, b, c, d] = p;
    const s = powerSums(p, top);
    const answer = s.slice(3);
    const slips: number[] = [-b * s[2] - c * s[1] - d];
    for (let n = 3; n <= top; n += 1) {
      slips.push(b * s[n - 1] - c * s[n - 2] - d * s[n - 3], -b * s[n - 1] - c * s[n - 2] + d * s[n - 3]);
    }
    return {
      kind: 'table',
      prompt: [
        say(
          `${THREE} are the roots of $${polyTex(p)} = 0$. Fill in the table of $S_n$, using $S_{n+3} = {-bS_{n+2} - cS_{n+1} - dS_n}$.`,
        ),
      ],
      columns: ['n', 'S_n'],
      rows: s.map((v, n) => [String(n), n <= 2 ? String(v) : null]),
      bank: numberBank(answer, slips, String, 3),
      answer: answer.map(String),
    };
  },
  solution: ({ p, top }) => {
    const [, b, c, d] = p;
    const s = powerSums(p, top);
    return [
      { text: 'Each coefficient changes sign on the way across:' },
      { tex: ruleTex([-b, -c, -d]) },
      { text: `Starting from $S_0 = 3$, $S_1 = ${s[1]}$ and $S_2 = ${s[2]}$:` },
      {
        tex: chain(
          ...Array.from({ length: top - 2 }, (_, i) => {
            const n = i + 3;
            const parts = [-b * s[n - 1], -c * s[n - 2], -d * s[n - 3]];
            return row(`S_{${n}}`, parts.map((v, j) => (j === 0 ? String(v) : signedNum(v))).join(' '), s[n]);
          }).flat(),
        ),
      },
    ];
  },
};

interface HigherParams {
  /** Monic, degree 2 or 3, whole coefficients. */
  p: Poly;
  n: number;
}

function powersLabel(degree: number, n: number): string {
  const letters = degree === 2 ? ['\\alpha', '\\beta'] : ['\\alpha', '\\beta', '\\gamma'];
  return letters.map((l) => `${l}^{${n}}`).join(' + ');
}

/** S_4 or S_5 of a monic quadratic, or of a monic cubic, by running the recurrence. */
const powHigher: Generator<HigherParams> = {
  id: 'poly-pow-higher',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = hard ? monic(rng, 3, 3, 3) : monic(rng, 4, 5);
      const n = rng.int(4, 5);
      const s = powerSums(p, n);
      if (s[n] === 0 || s.some((v) => Math.abs(v) > 500)) continue;
      return { p, n };
    }
  },
  choices: ({ p, n }) => {
    const s = powerSums(p, n);
    const k = p.length - 1;
    const last = p[k] * s[n - k];
    return intOptions(s[n], [-s[n], s[n] + 2 * last, s[n] + 2 * p[1] * s[n - 1], s[n - 1]]);
  },
  render: ({ p, n }) => {
    const k = p.length - 1;
    const s = powerSums(p, n);
    return expression(
      [say(`${k === 2 ? TWO : THREE} are the roots of $${polyTex(p)} = 0$. Find $S_{${n}} = ${powersLabel(k, n)}$.`)],
      `S_{${n}} =`,
      String(s[n]),
    );
  },
  solution: ({ p, n }) => {
    const k = p.length - 1;
    const s = powerSums(p, n);
    const coeffs = p.slice(1).map((c) => -c);
    const lines = Array.from({ length: n - k + 1 }, (_, i) => {
      const m = i + k;
      const parts = coeffs.map((q, j) => q * s[m - 1 - j]);
      // S_k itself has k times the constant, not the constant times S_0.
      if (m === k) parts[k - 1] = -k * p[k];
      return row(`S_{${m}}`, parts.map((v, j) => (j === 0 ? String(v) : signedNum(v))).join(' '), s[m]);
    }).flat();
    return [
      { text: 'Each coefficient changes sign on the way across:' },
      { tex: ruleTex(coeffs) },
      {
        text:
          k === 2
            ? `Start from $S_0 = 2$ and $S_1 = ${s[1]}$:`
            : `Start from $S_0 = 3$, $S_1 = ${s[1]}$ and $S_2 = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta = ${s[2]}$:`,
      },
      { tex: chain(...lines) },
    ];
  },
};

/* ================================================================
 * Lesson 5: other symmetric expressions
 * ================================================================ */

/** A cubic whose sums are whole and none zero, kept to a readable size. */
function sampleSymCubic(rng: Rng, difficulty: number, rootMax: number, ok: (e: number[]) => boolean): CubicParams {
  for (;;) {
    const p = difficulty > 1 ? fromRoots(sampleRoots(rng, 3, rootMax), rng.pick(LEADS)) : monic(rng, 4, 5, 6);
    const e = rootSumsOf(p);
    if (e.some((v) => v === 0) || p.some((c) => Math.abs(c) > 120) || !ok(e)) continue;
    return { p };
  }
}

const sqBeta = ([e1, e2, e3]: number[]): number => e1 * e2 - 3 * e3;

const SQ_BETA = '\\Sigma\\alpha^{2}\\beta';

function sqBetaSolution(p: Poly): SolutionStep[] {
  const e = rootSumsOf(p);
  const [e1, e2, e3] = e;
  return [
    { text: '$\\Sigma\\alpha \\times \\Sigma\\alpha\\beta$ gives each of the six terms once and $\\alpha\\beta\\gamma$ three times, so' },
    { tex: `${SQ_BETA} = \\Sigma\\alpha\\,\\Sigma\\alpha\\beta - 3\\alpha\\beta\\gamma` },
    { text: 'From the coefficients:' },
    { tex: cubicSumsTex(p) },
    { tex: sqBetaWorking(e1, e2, e3) },
  ];
}

/** The two pieces of Σα²β, then their difference, as the tree builds it. */
function sqBetaWorking(e1: number, e2: number, e3: number): string {
  return chain(
    `\\Sigma\\alpha\\,\\Sigma\\alpha\\beta &= ${br(e1)} \\times ${br(e2)} = ${e1 * e2}`,
    `3\\alpha\\beta\\gamma &= 3 \\times ${br(e3)} = ${3 * e3}`,
    `${SQ_BETA} &= ${e1 * e2} - ${br(3 * e3)}`,
    `&= ${sqBeta([e1, e2, e3])}`,
  );
}

/** Σα²β, the six terms α²β + α²γ + …, typed. */
const powSqBeta: Generator<CubicParams> = {
  id: 'poly-pow-sq-beta',
  sample: (rng, difficulty) => sampleSymCubic(rng, difficulty, 4, (e) => Math.abs(sqBeta(e)) <= 300),
  choices: ({ p }) => {
    const e = rootSumsOf(p);
    const [e1, e2, e3] = e;
    return intOptions(sqBeta(e), [e1 * e2 + 3 * e3, e1 * e2 - e3, e1 * e2, -sqBeta(e)]);
  },
  render: ({ p }) =>
    expression(
      [say(`${THREE} are the roots of $${polyTex(p)} = 0$. Find $${SQ_BETA}$, the sum of the six terms like $\\alpha^{2}\\beta$.`)],
      `${SQ_BETA} =`,
      String(sqBeta(rootSumsOf(p))),
    ),
  solution: ({ p }) => sqBetaSolution(p),
};

/** The same through a tree. */
const powSqBetaTree: Generator<CubicParams> = {
  id: 'poly-pow-sq-beta-tree',
  sample: (rng, difficulty) => sampleSymCubic(rng, difficulty, 4, (e) => Math.abs(sqBeta(e)) <= 300),
  render: ({ p }): Slide => {
    const e = rootSumsOf(p);
    const [e1, e2, e3] = e;
    const values = [e1, e2, e3, e1 * e2, 3 * e3, sqBeta(e)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${THREE} are the roots of this cubic. Top row: $\\Sigma\\alpha$, $\\Sigma\\alpha\\beta$ and $\\alpha\\beta\\gamma$. Next $\\Sigma\\alpha\\,\\Sigma\\alpha\\beta$ and $3\\alpha\\beta\\gamma$. Last $${SQ_BETA}$, the first of those minus the second.`,
        ),
      ],
      expression: `${polyTex(p)} = 0`,
      nodes: [
        { id: 'e1', from: [] },
        { id: 'e2', from: [] },
        { id: 'e3', from: [] },
        { id: 'prod', from: ['e1', 'e2'] },
        { id: 'three', from: ['e3'] },
        { id: 'total', from: ['prod', 'three'] },
      ],
      bank: numberBank(values, [-e1, -e2, -e3, e1 * e2 + 3 * e3, -3 * e3, e1 * e2 - e3], String, 3),
      answer: values.map(String),
    };
  },
  solution: ({ p }) => sqBetaSolution(p),
};

interface ShiftParams {
  /** Monic, whole coefficients. */
  p: Poly;
  /** The shift: (α + k)(β + k)(γ + k). */
  k: number;
}

/** (α + k)(β + k)(γ + k), braced so a display breaks either side of it and never inside a bracket. */
const shiftLabel = (k: number): string =>
  `{${['\\alpha', '\\beta', '\\gamma'].map((l) => `(${l} ${signedNum(k)})`).join('')}}`;

/** p(x) at a whole x, as a line of working: each term's value, added. */
function valueWorking(p: Poly, x: number): string {
  const n = p.length - 1;
  const parts = p.map((c, i) => c * x ** (n - i)).map((v) => tidy(v));
  return parts.map((v, i) => (i === 0 ? String(v) : signedNum(v))).join(' ');
}

const valueOf = (p: Poly, x: number): number => tidy(p.reduce((acc, c) => acc * x + c, 0));

/** (α + k)(β + k)(γ + k) as -p(-k). */
const powShiftProduct: Generator<ShiftParams> = {
  id: 'poly-pow-shift-product',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = hard ? monic(rng, 5, 5, 5) : monic(rng, 5, 6, 9);
      const k = hard ? rng.pick([2, -1, -2]) : 1;
      const v = -valueOf(p, -k);
      if (v === 0 || Math.abs(v) > 200) continue;
      return { p, k };
    }
  },
  choices: ({ p, k }) => {
    const v = -valueOf(p, -k);
    const [e1, e2, e3] = rootSumsOf(p);
    return intOptions(v, [valueOf(p, -k), valueOf(p, k), -valueOf(p, k), k ** 3 + k * k * e1 + k * e2 - e3]);
  },
  render: ({ p, k }) =>
    expression(
      [say(`${THREE} are the roots of $${polyTex(p)} = 0$. Find $${shiftLabel(k)}$.`)],
      `${shiftLabel(k)} =`,
      String(-valueOf(p, -k)),
    ),
  solution: ({ p, k }) => {
    const x = -k;
    const pv = valueOf(p, x);
    return [
      {
        text: `A monic cubic is ${'$'}{(x - \\alpha)(x - \\beta)(x - \\gamma)}$. At ${'$'}{x = ${x}}$ each bracket is minus one of those asked for, and three minus signs make a minus, so the product is $-p(${x})$:`,
      },
      { tex: chain(`p(${x}) &= ${valueWorking(p, x)}`, `&= ${pv}`) },
      { tex: `${shiftLabel(k)} = ${-pv}` },
    ];
  },
};

/** Σ1/α² = ((Σαβ)² - 2αβγΣα) / (αβγ)², as a fraction where it is not whole. */
const powRecipSquares: Generator<CubicParams> = {
  id: 'poly-pow-recip-squares',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? sampleSymCubic(rng, 2, 3, ([e1, e2, e3]) => Math.abs(e3) <= 6 && e2 * e2 !== 2 * e1 * e3)
      : (() => {
          for (;;) {
            const p = monic(rng, 4, 5, 3);
            const [e1, e2, e3] = rootSumsOf(p);
            if (e2 * e2 !== 2 * e1 * e3) return { p };
          }
        })(),
  choices: ({ p }) => {
    const [e1, e2, e3] = rootSumsOf(p);
    const n = e2 * e2 - 2 * e1 * e3;
    const d = e3 * e3;
    const slips: [number, number][] = [
      [e2 * e2, d],
      [e2 * e2 + 2 * e1 * e3, d],
      [n, e3],
      [e1 * e1 - 2 * e2, d],
    ];
    return options(
      { tex: fracTex(n, d), answer: fracAnswer(n, d) },
      ...slips.filter(([a, b]) => a * d !== b * n).map(([a, b]) => ({ tex: fracTex(a, b), answer: fracAnswer(a, b) })),
    ).slice(0, 4);
  },
  render: ({ p }) => {
    const [e1, e2, e3] = rootSumsOf(p);
    return expression(
      [
        say(
          `${THREE} are the roots of $${polyTex(p)} = 0$. Find $\\frac{1}{\\alpha^{2}} + \\frac{1}{\\beta^{2}} + \\frac{1}{\\gamma^{2}}$, as a fraction if it is not whole.`,
        ),
      ],
      '\\Sigma\\frac{1}{\\alpha^{2}} =',
      fracAnswer(e2 * e2 - 2 * e1 * e3, e3 * e3),
      true,
    );
  },
  solution: ({ p }) => {
    const [e1, e2, e3] = rootSumsOf(p);
    return [
      { text: 'Squaring $\\Sigma\\frac{1}{\\alpha}$ gives each square once and each pair twice. Over $(\\alpha\\beta\\gamma)^{2}$ that comes to' },
      { tex: RECIP_SQUARES },
      { text: 'From the coefficients:' },
      { tex: cubicSumsTex(p) },
      { tex: recipWorking(e1, e2, e3) },
    ];
  },
};

const RECIP_SQUARES =
  '\\Sigma\\frac{1}{\\alpha^{2}} = \\frac{(\\Sigma\\alpha\\beta)^{2} - 2\\alpha\\beta\\gamma\\,\\Sigma\\alpha}{(\\alpha\\beta\\gamma)^{2}}';

/**
 * Σ1/α² with the numbers in: the top's two pieces, then the fraction. Put in
 * whole, the top alone is wider than a phone.
 */
function recipWorking(e1: number, e2: number, e3: number): string {
  const top = e2 * e2 - 2 * e1 * e3;
  const bottom = e3 * e3;
  const simple = fracTex(top, bottom);
  const raw = `\\frac{${top}}{${bottom}}`;
  return chain(
    `2\\alpha\\beta\\gamma\\,\\Sigma\\alpha &= 2 \\times ${br(e3)} \\times ${br(e1)}`,
    `&= ${2 * e1 * e3}`,
    `\\Sigma\\frac{1}{\\alpha^{2}} &= \\frac{${br(e2)}^{2} - ${br(2 * e1 * e3)}}{${br(e3)}^{2}}`,
    // Over 1 the fraction is only its top; otherwise show it before cancelling.
    `&= ${bottom === 1 || simple === raw ? simple : `${raw} = ${simple}`}`,
  );
}

/* ---------- choosing the identity ---------- */

interface WhichParams {
  /** Monic, whole coefficients, none zero. */
  p: Poly;
  /** 0 for S_3, 1 for Σα²β, 2 for Σ1/α², 3 for (α + 1)(β + 1)(γ + 1). */
  target: number;
}

const TARGET_NAMES = ['S_3', SQ_BETA, '\\Sigma\\frac{1}{\\alpha^{2}}', shiftLabel(1)];

interface Candidate {
  /** The right-hand side offered, TeX. */
  rhs: string;
  /** What it comes to here, as [numerator, denominator]. */
  value: [number, number];
  /** Why it is wrong, for the two that are. */
  why?: string;
}

function candidates(p: Poly, target: number): Candidate[] {
  const [e1, e2, e3] = rootSumsOf(p);
  const s = powerSums(p, 3);
  switch (target) {
    case 0:
      return [
        { rhs: S3_RULE.replace('S_3 = ', ''), value: [s[3], 1] },
        { rhs: '\\Sigma\\alpha\\,S_2 - \\Sigma\\alpha\\beta\\,S_1 + \\alpha\\beta\\gamma', value: [s[3] - 2 * e3, 1], why: 'The constant comes in once for each root: $3\\alpha\\beta\\gamma$.' },
        { rhs: '(\\Sigma\\alpha)^{3} - 3\\Sigma\\alpha\\,\\Sigma\\alpha\\beta', value: [e1 ** 3 - 3 * e1 * e2, 1], why: 'That is the two-root identity. With three roots it needs $+ 3\\alpha\\beta\\gamma$ as well.' },
      ];
    case 1:
      return [
        { rhs: '\\Sigma\\alpha\\,\\Sigma\\alpha\\beta - 3\\alpha\\beta\\gamma', value: [e1 * e2 - 3 * e3, 1] },
        { rhs: '\\Sigma\\alpha\\,\\Sigma\\alpha\\beta - \\alpha\\beta\\gamma', value: [e1 * e2 - e3, 1], why: 'The product $\\Sigma\\alpha\\,\\Sigma\\alpha\\beta$ holds $\\alpha\\beta\\gamma$ three times, not once.' },
        { rhs: '\\Sigma\\alpha\\,\\Sigma\\alpha\\beta + 3\\alpha\\beta\\gamma', value: [e1 * e2 + 3 * e3, 1], why: 'The extra $\\alpha\\beta\\gamma$ terms are taken away, not added.' },
      ];
    case 2:
      return [
        { rhs: RECIP_SQUARES.replace('\\Sigma\\frac{1}{\\alpha^{2}} = ', ''), value: [e2 * e2 - 2 * e1 * e3, e3 * e3] },
        { rhs: '\\frac{(\\Sigma\\alpha\\beta)^{2}}{(\\alpha\\beta\\gamma)^{2}}', value: [e2 * e2, e3 * e3], why: 'That is $(\\Sigma\\frac{1}{\\alpha})^{2}$, which still holds the pairs twice.' },
        { rhs: '\\frac{(\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta}{(\\alpha\\beta\\gamma)^{2}}', value: [e1 * e1 - 2 * e2, e3 * e3], why: 'That is $\\Sigma\\alpha^{2}$ over the square of the product, which is not the same thing.' },
      ];
    default:
      return [
        { rhs: '1 + \\Sigma\\alpha + \\Sigma\\alpha\\beta + \\alpha\\beta\\gamma', value: [-valueOf(p, -1), 1] },
        { rhs: 'p(-1)', value: [valueOf(p, -1), 1], why: 'Each of the three brackets flips sign in $p(-1)$, so the product is $-p(-1)$.' },
        { rhs: 'p(1)', value: [valueOf(p, 1), 1], why: 'That is $(1 - \\alpha)(1 - \\beta)(1 - \\gamma)$.' },
      ];
  }
}

const valueTex = ([n, d]: [number, number]): string => fracTex(n, d);

/** Which identity gives a symmetric expression, then what it comes to. */
const powWhichFlow: Generator<WhichParams> = {
  id: 'poly-pow-which-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = hard ? monic(rng, 4, 5, 5) : monic(rng, 3, 4, 3);
      const target = rng.int(0, 3);
      const [right] = candidates(p, target);
      const [n, d] = right.value;
      if (n === 0 || Math.abs(n / d) > 200 || Math.abs(d) > 100) continue;
      if (powerSums(p, 2)[2] === 0) continue;
      return { p, target };
    }
  },
  render: ({ p, target }): Slide => {
    const all = candidates(p, target);
    const [right] = all;
    const name = TARGET_NAMES[target];
    const subject = `p(x) = ${polyTex(p)}`;
    // Three values that differ: each identity's, topped up with near values.
    const worth = ([n, d]: [number, number]) => n / d;
    const values: [number, number][] = [];
    for (const v of [...all.map((c) => c.value), [right.value[0] + right.value[1], right.value[1]] as [number, number], [right.value[0] - right.value[1], right.value[1]] as [number, number]]) {
      if (values.length < 3 && !values.some((u) => Math.abs(worth(u) - worth(v)) < 1e-9)) values.push(v);
    }
    return {
      kind: 'flow',
      prompt: [say(`${THREE} are the roots of $p(x) = 0$. Find $${name}$. Each answer chooses what gets asked next.`)],
      subject,
      steps: [
        {
          id: 'which',
          ask: `What is $${name}$ in terms of the sums of the roots?`,
          branches: turned(
            all.map((c, i) =>
              i === 0 ? { label: `$${c.rhs}$`, to: 'value' } : { label: `$${c.rhs}$`, outcome: c.why! },
            ),
            `${subject}|${target}|which`,
          ),
        },
        {
          id: 'value',
          ask: `So what is $${name}$ here?`,
          branches: turned(
            values.map((v, i) =>
              i === 0
                ? { label: `$${valueTex(v)}$`, outcome: `$${name} = ${valueTex(v)}$, from the coefficients alone.` }
                : { label: `$${valueTex(v)}$`, outcome: 'Read the three sums off again: $-b$, $c$, $-d$ for a monic cubic.' },
            ),
            `${subject}|${target}|value`,
          ),
        },
      ],
      answer: [`$${right.rhs}$`, `$${valueTex(right.value)}$`],
    };
  },
  solution: ({ p, target }) => {
    const [e1, e2, e3] = rootSumsOf(p);
    const s = powerSums(p, 3);
    const [right] = candidates(p, target);
    const name = TARGET_NAMES[target];
    const work = [
      s3Working(e1, e2, e3, s),
      sqBetaWorking(e1, e2, e3),
      recipWorking(e1, e2, e3),
      `${name} = 1 ${signedNum(e1)} ${signedNum(e2)} ${signedNum(e3)} = ${right.value[0]}`,
    ][target];
    return [
      { tex: `${name} = {${right.rhs}}` },
      { text: 'From the coefficients:' },
      { tex: cubicSumsTex(p) },
      ...(target === 0
        ? [
            { text: `So $S_1 = ${e1}$ and` },
            { tex: chain(`S_2 &= (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta`, `&= ${br(e1)}^{2} - 2 \\times ${br(e2)} = ${s[2]}`) },
          ]
        : []),
      { tex: work },
    ];
  },
};

export const rootsPowerSumsGenerators = [
  powCubeTwo,
  powCubeTree,
  powTwoSym,
  powQuadSteps,
  powQuadTable,
  powRecurrence,
  powS3Tree,
  powCubicS3,
  powCubicSteps,
  powCubicTable,
  powHigher,
  powSqBeta,
  powSqBetaTree,
  powShiftProduct,
  powRecipSquares,
  powWhichFlow,
] as Generator<unknown>[];
