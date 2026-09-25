/**
 * Simultaneous equations with a quadratic: where a line meets a curve.
 *
 * Roadmap batch B2, the fourth Quadratics level. Every question here is about
 * one picture — a straight line and a parabola, or two parabolas — and one
 * piece of algebra: put the line into the curve, and what comes out is a
 * quadratic whose roots are where the two meet. The five lessons walk that
 * route in order: make a letter the subject, substitute, solve for $x$, pair
 * each $x$ with its $y$, and finally ask the discriminant how many meeting
 * points there are before solving anything.
 *
 * **Every meeting point is whole.** The generators are built backwards from
 * the answer: pick the two $x$ values where the graphs meet (`r` and `t`), a
 * line through them, and the curve that the line cuts there follows. So the
 * combined equation always factorises, and a question never turns into an
 * exercise in surds. The pool is kept above the 25-distinct floor by varying
 * the line as well as the meeting points — the slope and the intercept each
 * change what is on the page even when the roots repeat.
 *
 * Rules inherited from `quadratics.ts`: a tiles template is split on `{n}`
 * and each piece rendered alone, so no braces round a digit (`x^2`, never
 * `x^{2}`) and no `\left`/`\right` spanning a blank; and every value inside a
 * `reduce` tree is whole, banks included.
 *
 * This file is imported by `quadraticShapes.ts` and spread into its array, so
 * the registry picks it up without changing. It must not import from that
 * file in turn.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { markerWindow, plotSvg, quadratic } from '../figures';
import { options } from '../choiceVariant';
import { bin, num } from '../expr';
import { ALGEBRA_KEYS } from './calculus';
import { bankOf, nonZero, offer, quadraticTex, signedTile } from './quadratics';

/* ---------- Formatting ---------- */

/** A coefficient in front of a letter: `x`, `-x`, `3x`. */
function leadTerm(coefficient: number, letter: string): string {
  if (coefficient === 1) return letter;
  if (coefficient === -1) return `-${letter}`;
  return `${coefficient}${letter}`;
}

/** mx + k, written the way it appears on the page: `2x - 5`, `-x`, `4`. */
export function linearTex(m: number, k: number): string {
  if (m === 0) return `${k}`;
  const front = leadTerm(m, 'x');
  return k === 0 ? front : `${front} ${signedTile(k)}`;
}

/**
 * Two equations for y, stacked.
 *
 * Stacked rather than side by side because a phone is 393 pixels wide, and a
 * quadratic and a line on one row with a gap between them scroll sideways —
 * which is where the Matrices batch found its widest displays.
 */
function systemTex(first: string, second: string): string {
  return `\\begin{aligned} y &= ${first} \\\\ y &= ${second} \\end{aligned}`;
}

/**
 * ax^2 + bx + c, with a leading coefficient of -1 written as a bare minus.
 *
 * `quadraticTex` writes any `a` other than 1 in front as a number, which reads
 * `-1x^{2}` for the upside-down curves the sliders draw at difficulty 2.
 */
function quadTex(a: number, b: number, c: number): string {
  return a === -1 ? `-${quadraticTex(1, b, c)}` : quadraticTex(a, b, c);
}

/** The line's value at x = u, written out: `2 \times (-3) + 5`. */
function lineAt(m: number, k: number, u: number): string {
  return `${m} \\times ${bracketed(u)}${k === 0 ? '' : ` ${signedTile(k)}`}`;
}

/** The curve's value at x = u, written out term by term. */
function curveAt(a: number, b: number, c: number, u: number): string {
  const square = `${a === 1 ? '' : `${a} \\times `}${bracketed(u)}^{2}`;
  const middle = b === 0 ? '' : ` ${signedTile(b)} \\times ${bracketed(u)}`;
  const tail = c === 0 ? '' : ` ${signedTile(c)}`;
  return `${square}${middle}${tail}`;
}

/** A leading coefficient in front of brackets: nothing for 1, a bare minus for -1. */
function coefficientTex(a: number): string {
  return a === 1 ? '' : a === -1 ? '-' : `${a}`;
}

/** A root's factor: `(x - 3)`, `(x + 2)`, or plain `x` for a root at zero. */
function rootFactor(root: number): string {
  return root === 0 ? 'x' : `\\left(x ${signedTile(-root)}\\right)`;
}

/** A number, bracketed when negative, for a substitution written out. */
function bracketed(value: number): string {
  return value < 0 ? `\\left(${value}\\right)` : `${value}`;
}

/** A point, as the learner reads it. */
function pointTex(x: number, y: number): string {
  return `\\left(${x}, ${y}\\right)`;
}

/**
 * Four whole-number options built from `offer`, the correct one flagged.
 *
 * The same helper `quadraticShapes.ts` keeps privately. It is repeated here
 * rather than imported because that file imports this one, and a cycle
 * between the two would hand one of them an uninitialised array at load.
 */
function numberChoices(correct: number, ...near: number[]): ChoiceOption[] {
  return options(
    { tex: `${correct}`, answer: `${correct}` },
    ...offer(correct, ...near)
      .filter((value) => Number(value) !== correct)
      .map((value) => ({ tex: value, answer: value })),
  );
}

/**
 * A tree's bank: its answers, then distractors that survive.
 *
 * Distractors built from the question's own numbers collide with the answers
 * far more often than they look like they will, so what is left is topped up
 * from either side of the total until three remain.
 */
function treeBank(answer: string[], preferred: number[], anchor: number): string[] {
  const used = new Set(answer);
  const extras: string[] = [];
  const add = (value: number) => {
    const token = `${value}`;
    if (!Number.isInteger(value) || used.has(token) || extras.includes(token)) return;
    extras.push(token);
  };
  preferred.forEach(add);
  for (let gap = 1; extras.length < 3; gap += 1) {
    add(anchor + gap);
    add(anchor - gap);
  }
  return [...answer, ...extras].sort();
}

/** Signed tiles for the non-zero values only: a `+ 0x` tile is not a term. */
function termTiles(values: number[], letter = ''): string[] {
  return values.filter((value) => value !== 0).map((value) => signedTile(value, letter));
}

/* ---------- A line meeting a curve ---------- */

/**
 * A curve and a line built backwards from where they meet.
 *
 * The curve is $y = ax^2 + bx + c$ and the line $y = mx + k$. Taking the line
 * from the curve leaves $a\left(x - r\right)\left(x - t\right)$, so the curve's
 * own coefficients are whatever makes that true:
 * $b = m - a\left(r + t\right)$ and $c = k + art$.
 */
interface MeetParams {
  a: number;
  r: number;
  t: number;
  m: number;
  k: number;
}

function curveOf({ a, r, t, m, k }: MeetParams): { b: number; c: number } {
  return { b: m - a * (r + t), c: k + a * r * t };
}

/** The combined equation's x and constant coefficients: curve minus line. */
function combinedOf(params: MeetParams): { p: number; q: number } {
  const { a, r, t } = params;
  return { p: -a * (r + t), q: a * r * t };
}

function meetSystemTex(params: MeetParams): string {
  const { b, c } = curveOf(params);
  return systemTex(quadTex(params.a, b, c), linearTex(params.m, params.k));
}

interface MeetRules {
  a: readonly number[];
  reach: number;
  slopes: readonly number[];
  intercepts: readonly number[];
  accept?: (params: MeetParams) => boolean;
}

/**
 * Draw a meeting from the ranges given, retrying until `accept` holds.
 *
 * `r` and `t` are always different — a line through one point of a curve is
 * the tangency lesson's business, and asked here it would make "the other
 * point" the same point. The fallback is a fixed draw that passes every rule
 * any caller sets, so a run of bad luck never produces a degenerate slide.
 */
function drawMeet(rng: Rng, rules: MeetRules): MeetParams {
  for (let tries = 0; tries < 200; tries += 1) {
    const r = rng.int(-rules.reach, rules.reach);
    const t = rng.int(-rules.reach, rules.reach);
    if (r === t) continue;
    const params: MeetParams = {
      a: rng.pick(rules.a),
      r,
      t,
      m: rng.pick(rules.slopes),
      k: rng.pick(rules.intercepts),
    };
    if (!rules.accept || rules.accept(params)) return params;
  }
  return { a: rules.a[0], r: -2, t: 3, m: 2, k: 1 };
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const nonZeroRange = (from: number, to: number): number[] =>
  range(from, to).filter((value) => value !== 0);

/* ---------- Lesson 1: substituting ---------- */

interface SubjectParams {
  /** Coefficient of x. */
  p: number;
  /** Coefficient of y. */
  q: number;
  /** The right-hand side. */
  s: number;
  /** Which term is written first. */
  order: 'x' | 'y';
}

/**
 * Make $y$ the subject of the straight line.
 *
 * The step before any substitution, and the one that goes wrong silently: a
 * sign lost moving $3x$ across makes every later line correct working on the
 * wrong equation. At difficulty 2 the $y$ carries a coefficient, so the whole
 * right-hand side has to be divided — and dividing only the constant is the
 * slip worth provoking.
 */
const makeSubject: Generator<SubjectParams> = {
  id: 'quad-sim-subject',
  sample: (rng, difficulty) => {
    const order = rng.pick(['x', 'y'] as const);
    if (difficulty > 1) {
      const q = rng.pick([2, 3, -2]);
      return { p: q * nonZero(rng.int(-4, 4), 2), q, s: q * rng.int(-6, 6), order };
    }
    return {
      p: nonZero(rng.int(-6, 6), 3),
      q: rng.pick([1, -1]),
      s: rng.int(-9, 9),
      order,
    };
  },
  render: ({ p, q, s, order }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Before the line can go into the curve, it has to say what $y$ is. Make $y$ the subject.',
      },
      {
        kind: 'display',
        tex:
          order === 'x'
            ? `${leadTerm(p, 'x')} ${signedTile(q, 'y')} = ${s}`
            : `${leadTerm(q, 'y')} ${signedTile(p, 'x')} = ${s}`,
      },
    ],
    lead: 'y =',
    keypad: ALGEBRA_KEYS,
    answer: `((${s}) - (${p})*x)/(${q})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, q, s }) => {
    const steps: SolutionStep[] = [
      {
        text: `Move the $x$ term to the other side, changing its sign as it crosses.`,
      },
      { tex: `${leadTerm(q, 'y')} = ${linearTex(-p, s)}` },
    ];
    if (q !== 1) {
      steps.push(
        {
          text: `Then divide **every** term by $${q}$, not just the number. Dividing only one of them is the slip this step invites.`,
        },
        { tex: `y = ${linearTex(-p / q, s / q)}` },
      );
    }
    steps.push({
      text: `So $y = ${linearTex(-p / q, s / q)}$. Check it by putting $x = 0$ back into the original: both give $y = ${s / q}$.`,
    });
    return steps;
  },
};

/**
 * Substitute the line into the curve and collect the terms.
 *
 * Asked as tiles because the form is the answer: the checker grades by value,
 * and $x^2 + 5x + 6$ typed in is "equal" to the curve minus the line only as a
 * function — there is no way to type the wrong side of the equals sign. The
 * bank holds the one slip that matters, *adding* the line instead of taking
 * it away, and the same terms with every sign flipped.
 */
const substituteLine: Generator<MeetParams> = {
  id: 'quad-sim-substitute',
  choices: (params) => {
    const { a, m, k } = params;
    const { b, c } = curveOf(params);
    const { p, q } = combinedOf(params);
    const form = (x: number, n: number) => ({
      tex: `${quadTex(a, x, n)} = 0`,
      answer: `(${a})*x^2 + (${x})*x + (${n})`,
    });
    // Not `(b + m, q)` as the fourth: with it every number appears an even
    // number of times across the four labels, their hash is always even, and
    // the answer landed in only two of the four rows.
    return options(form(p, q), form(b + m, c + k), form(p, c + k), form(-p, -q));
  },
  sample: (rng, difficulty) =>
    drawMeet(rng, {
      a: difficulty > 1 ? [2, 3] : [1],
      reach: 5,
      slopes: nonZeroRange(-4, 4),
      intercepts: nonZeroRange(-6, 6),
      // Both terms of the answer present, so neither blank is a "nothing".
      accept: ({ r, t }) => r !== 0 && t !== 0 && r + t !== 0,
    }),
  render: (params): Slide => {
    const { a, m, k } = params;
    const { b, c } = curveOf(params);
    const { p, q } = combinedOf(params);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Put the line into the curve, then collect every term on one side so the equation ends in $= 0$.',
        },
        { kind: 'display', tex: meetSystemTex(params) },
      ],
      template: `${a === 1 ? 'x^2' : `${a}x^2`} {0} {1} = 0`,
      bank: bankOf(
        [signedTile(p, 'x'), signedTile(q)],
        [...termTiles([b + m, -p], 'x'), ...termTiles([c + k, -q])],
      ),
      answer: [signedTile(p, 'x'), signedTile(q)],
    };
  },
  solution: (params) => {
    const { a, m, k } = params;
    const { b, c } = curveOf(params);
    const { p, q } = combinedOf(params);
    return [
      {
        text: 'Both equations say what $y$ is, so where the graphs meet the two right-hand sides are equal.',
      },
      { tex: `${quadTex(a, b, c)} = ${linearTex(m, k)}` },
      {
        text: `Take the line's terms across. Each changes sign: $${leadTerm(m, 'x')}$ becomes $${leadTerm(-m, 'x')}$ and $${k}$ becomes $${-k}$.`,
      },
      { tex: `${quadTex(a, p, q)} = 0` },
      {
        text: `Adding them instead gives $${quadTex(a, b + m, c + k)}$, which looks just as plausible. The line is being *taken away* from the curve, so its terms must change sign.`,
      },
    ];
  },
};

interface TwoCurvesParams {
  a: number;
  b1: number;
  c1: number;
  p: number;
  q: number;
}

/**
 * Two parabolas meeting.
 *
 * The same move with no line in sight: two expressions for $y$, set equal. The
 * second curve always has one more $x^2$ than the first, so collecting on its
 * side leaves a plain $x^2$ — and taking the curves the wrong way round is the
 * mistake the flipped-sign tiles are there to catch.
 */
const twoCurves: Generator<TwoCurvesParams> = {
  id: 'quad-sim-two-curves',
  choices: ({ b1, c1, p, q }) => {
    const form = (x: number, n: number) => ({
      tex: `${quadTex(1, x, n)} = 0`,
      answer: `x^2 + (${x})*x + (${n})`,
    });
    return options(form(p, q), form(-p, -q), form(2 * b1 + p, 2 * c1 + q), form(p, -q));
  },
  sample: (rng, difficulty) => {
    let r = 0;
    let t = 0;
    for (let tries = 0; tries < 60 && (r === 0 || t === 0 || r === t || r + t === 0); tries += 1) {
      r = rng.int(-5, 5);
      t = rng.int(-5, 5);
    }
    if (r === 0 || t === 0 || r === t || r + t === 0) {
      r = 2;
      t = -3;
    }
    return {
      a: difficulty > 1 ? rng.pick([2, 3, 4]) : 1,
      b1: nonZero(rng.int(-6, 6), 2),
      c1: nonZero(rng.int(-9, 9), -4),
      p: -(r + t),
      q: r * t,
    };
  },
  render: ({ a, b1, c1, p, q }): Slide => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: 'Two curves this time. Set them equal and collect every term on the side of the second, which has more $x^{2}$.',
      },
      {
        kind: 'display',
        tex: systemTex(quadTex(a, b1, c1), quadTex(a + 1, b1 + p, c1 + q)),
      },
    ],
    template: `x^2 {0} {1} = 0`,
    bank: bankOf(
      [signedTile(p, 'x'), signedTile(q)],
      [...termTiles([-p, 2 * b1 + p], 'x'), ...termTiles([-q, 2 * c1 + q])],
    ),
    answer: [signedTile(p, 'x'), signedTile(q)],
  }),
  solution: ({ a, b1, c1, p, q }) => [
    {
      text: 'Two expressions for the same $y$, so they are equal where the curves meet.',
    },
    { tex: `${quadTex(a + 1, b1 + p, c1 + q)} = ${quadTex(a, b1, c1)}` },
    {
      text: `Take the first curve from the second, term by term: $x^{2}$ terms, then $x$ terms, then numbers.`,
    },
    { tex: `${quadTex(1, p, q)} = 0` },
    {
      text: `Collecting on the other side gives $${quadTex(-1, -p, -q)} = 0$ — the same equation times $-1$, and just as true, but a leading minus sign is one more thing to carry through the factorising.`,
    },
  ],
};

interface RouteParams {
  /** Coefficient of x in the linear equation. */
  p: number;
  /** Coefficient of y in the linear equation. */
  q: number;
  s: number;
  /** The curve's constant, so the pair differs as a whole. */
  c: number;
  route: 'equal' | 'y' | 'x';
}

const ROUTE_BOTH = 'Yes, both start $y =$';
const ROUTE_NOT_BOTH = 'No';
const ROUTE_Y_CLEAN = 'Yes, $y$ comes out cleanly';
const ROUTE_Y_FRACTION = 'No, that would mean fractions';

/**
 * Which way into the substitution?
 *
 * Three set-ups, one question: are both equations already in the form
 * $y = \ldots$ (set them equal), can the line be turned round for $y$ without
 * fractions (do that and substitute), or is $x$ the cleaner letter to free?
 * The last is real — $x + 2y = 7$ gives $x$ in one move and $y$ only in
 * halves — and is the one the other widgets never ask about.
 */
const substitutionRoute: Generator<RouteParams> = {
  id: 'quad-sim-route',
  sample: (rng, difficulty) => {
    const route = rng.pick(['equal', 'y', 'x'] as const);
    const c = rng.int(difficulty > 1 ? -9 : -5, difficulty > 1 ? 9 : 5);
    const s = rng.int(-9, 9);
    if (route === 'x') {
      // x alone, y with a coefficient that does not divide cleanly.
      return { p: rng.pick([1, -1]), q: rng.pick([2, 3, -2, -3]), s: s % 2 === 0 ? s + 1 : s, c, route };
    }
    return { p: nonZero(rng.int(-5, 5), 2), q: rng.pick([1, -1]), s, c, route };
  },
  render: ({ p, q, s, c, route }): Slide => {
    const curve = quadTex(1, 0, c);
    const line =
      route === 'equal'
        ? `y = ${linearTex(-p, s)}`
        : `${leadTerm(p, 'x')} ${signedTile(q, 'y')} = ${s}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Before any algebra: which way into this pair? Each answer chooses what gets asked next.',
        },
      ],
      subject: `\\begin{aligned} y &= ${curve} \\\\ ${line.replace('=', '&=')} \\end{aligned}`,
      steps: [
        {
          id: 'both',
          ask: 'Do both equations already say what $y$ is?',
          branches: [
            {
              label: ROUTE_BOTH,
              outcome: 'Set the two right-hand sides equal to each other. No rearranging needed.',
            },
            { label: ROUTE_NOT_BOTH, to: 'clean' },
          ],
        },
        {
          id: 'clean',
          ask: 'Can the straight line be rearranged for $y$ without fractions?',
          branches: [
            {
              label: ROUTE_Y_CLEAN,
              outcome: 'Make $y$ the subject of the line, then substitute it into the curve.',
            },
            {
              label: ROUTE_Y_FRACTION,
              outcome: 'Make $x$ the subject instead, and substitute that — the result is a quadratic in $y$.',
            },
          ],
        },
      ],
      answer:
        route === 'equal'
          ? [ROUTE_BOTH]
          : route === 'y'
            ? [ROUTE_NOT_BOTH, ROUTE_Y_CLEAN]
            : [ROUTE_NOT_BOTH, ROUTE_Y_FRACTION],
    };
  },
  solution: ({ p, q, s, route }): SolutionStep[] => {
    if (route === 'equal') {
      return [
        { text: 'Both lines begin $y =$, so the substitution is already done: the two right-hand sides are equal where the graphs meet.' },
        { tex: `x^{2} + \\ldots = ${linearTex(-p, s)}` },
      ];
    }
    if (route === 'y') {
      return [
        {
          text: `The $y$ in the straight line has a coefficient of $${q}$, so moving the $x$ term across gives $y$ in one step, with whole numbers.`,
        },
        { tex: `y = ${linearTex(-p / q, s / q)}` },
        { text: 'That goes straight into the curve in place of $y$.' },
      ];
    }
    return [
      {
        text: `Solving for $y$ means dividing every term by $${q}$, and $${leadTerm(p, 'x')}$ does not divide by it — fractions from the first line on. The $x$ stands almost alone, so free that instead.`,
      },
      { tex: `x = ${p === 1 ? '' : '-'}\\left(${s} ${signedTile(-q, 'y')}\\right)` },
      {
        text: 'Substituting that for $x$ gives a quadratic in $y$. Solving it finds the $y$ values first, and the line gives each its $x$.',
      },
    ];
  },
};

/* ---------- Lesson 2: solving for x ---------- */

/**
 * Where do they meet? Both $x$ values, placed as tiles.
 *
 * The bank carries the two slips that come after correct algebra: the roots
 * read off the brackets without flipping their signs, and a $y$ value offered
 * as if it were an $x$ — which is what a learner who solved correctly and then
 * answered the wrong question would place.
 */
const meetingXs: Generator<MeetParams> = {
  id: 'quad-sim-x-values',
  sample: (rng, difficulty) =>
    drawMeet(rng, {
      a: difficulty > 1 ? [2, 3] : [1],
      reach: 6,
      slopes: range(-4, 4),
      intercepts: range(-6, 6),
    }),
  render: (params): Slide => {
    const { r, t, m, k } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Find the $x$-coordinates of the points where the line meets the curve.' },
        { kind: 'display', tex: meetSystemTex(params) },
      ],
      template: `x = {0} \\quad \\text{or} \\quad x = {1}`,
      bank: bankOf([`${r}`, `${t}`], [`${-r}`, `${-t}`, `${r + t}`, `${m * r + k}`]),
      answer: [`${r}`, `${t}`],
      unordered: true,
    };
  },
  solution: (params) => {
    const { a, r, t } = params;
    const { p, q } = combinedOf(params);
    const shared = coefficientTex(a);
    return [
      { text: 'Put the line into the curve and collect everything on one side.' },
      { tex: `${quadTex(a, p, q)} = 0` },
      ...(a === 1
        ? []
        : [
            {
              text: `Every term divides by $${a}$, so take it out first — it cannot be zero, so it plays no part in the roots.`,
            },
          ]),
      { tex: `${shared}${rootFactor(r)}${rootFactor(t)} = 0` },
      {
        text: `So $x = ${r}$ or $x = ${t}$. Each bracket gives the root with its sign flipped, and those two values are where the graphs cross.`,
      },
    ];
  },
};

/**
 * One meeting point is given; find the other.
 *
 * Division rather than search: with one root in hand the combined quadratic
 * has a known factor, or — quicker — the two roots add to $-b/a$. It is also
 * the situation a question sets up on purpose, when one point is easy to see
 * on a sketch and the other is not.
 */
const otherMeeting: Generator<MeetParams> = {
  id: 'quad-sim-other-x',
  choices: ({ r, t }) => numberChoices(t, -t, -r, r + t),
  sample: (rng, difficulty) =>
    drawMeet(rng, {
      a: difficulty > 1 ? [2, 3] : [1],
      reach: 6,
      slopes: nonZeroRange(-4, 4),
      intercepts: range(-6, 6),
      accept: ({ r }) => r !== 0,
    }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The line meets the curve where $x = ${params.r}$. Find the $x$-coordinate of the other point where they meet.`,
      },
      { kind: 'display', tex: meetSystemTex(params) },
    ],
    lead: '\\text{other } x =',
    keypad: [],
    answer: `${params.t}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { a, r, t } = params;
    const { p, q } = combinedOf(params);
    return [
      { text: 'Substituting the line into the curve gives the equation both meeting points must satisfy.' },
      { tex: `${quadTex(a, p, q)} = 0` },
      {
        text: `$x = ${r}$ is one root, so $${rootFactor(r)}$ is a factor. The other bracket is whatever multiplies it back to the quadratic.`,
      },
      { tex: `${quadTex(a, p, q)} = ${coefficientTex(a)}${rootFactor(r)}${rootFactor(t)}` },
      {
        text: `So the other point is at $x = ${t}$. As a check, the two roots add to $-\\frac{b}{a} = ${r + t}$, and $${r} + ${bracketed(t)} = ${r + t}$.`,
      },
    ];
  },
};

/* ---------- Lesson 3: pairing the solutions ---------- */

/**
 * Each $x$ with its own $y$.
 *
 * Solving gives two $x$ values and no $y$ values, and a pair of equations is
 * not solved until every letter has a value in every solution. The template
 * fixes the $x$ of each point, so the only way to place a $y$ is against the
 * $x$ it came from — and the bank holds both $y$ values, so pairing them the
 * wrong way round is a real option, which is the mistake being taught.
 */
const pairSolutions: Generator<MeetParams> = {
  id: 'quad-sim-pair',
  sample: (rng, difficulty) =>
    drawMeet(rng, {
      a: difficulty > 1 ? [2, 3] : [1],
      reach: 5,
      slopes: nonZeroRange(difficulty > 1 ? -5 : -3, difficulty > 1 ? 5 : 3),
      intercepts: nonZeroRange(-6, 6),
      accept: ({ r, t }) => r < t && r !== 0 && t !== 0,
    }),
  render: (params): Slide => {
    const { r, t, m, k } = params;
    const yr = m * r + k;
    const yt = m * t + k;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The line meets the curve at $x = ${r}$ and $x = ${t}$. Complete both points.`,
        },
        { kind: 'display', tex: meetSystemTex(params) },
      ],
      template: `(${r}, {0}) \\quad \\text{and} \\quad (${t}, {1})`,
      bank: bankOf([`${yr}`, `${yt}`], [`${k}`, `${m * r - k}`, `${-m * r + k}`, `${m * t - k}`]),
      answer: [`${yr}`, `${yt}`],
    };
  },
  solution: (params) => {
    const { r, t, m, k } = params;
    const yr = m * r + k;
    const yt = m * t + k;
    return [
      {
        text: 'Put each $x$ into the **line**. The curve gives the same $y$ — both equations are true at a meeting point — but the line is less arithmetic.',
      },
      { text: `First $x = ${r}$, then $x = ${t}$:` },
      { tex: `y = ${lineAt(m, k, r)} = ${yr}` },
      { tex: `y = ${lineAt(m, k, t)} = ${yt}` },
      {
        text: `So the points are $${pointTex(r, yr)}$ and $${pointTex(t, yt)}$. Keep each $y$ with the $x$ that made it: $${pointTex(r, yt)}$ is on neither graph.`,
      },
    ];
  },
};

interface WhichPointParams extends MeetParams {
  /** Which of the two meeting points the options are built around. */
  pick: 0 | 1;
  /** Where the right answer sits among the four. */
  slot: number;
}

/**
 * Which of these is a meeting point?
 *
 * Four coordinate pairs built from the same numbers, one of them right: a
 * point with the other point's $y$, the same point written backwards, and one
 * with the sign of $x$ flipped. The other genuine meeting point is never
 * offered, so exactly one option is right. Checking a pair in both equations
 * is a legitimate way through and is itself the skill — a solution is a point
 * that satisfies both.
 *
 * The right answer's slot is drawn with the question rather than hashed from
 * the labels, because four labels built from the same few numbers hash to
 * only a couple of rotations — the answer-slot bias the Matrices batch found.
 * It is part of the parameters, so one question still renders one way.
 */
const whichPoint: Generator<WhichPointParams> = {
  id: 'quad-sim-which-point',
  sample: (rng, difficulty) => {
    const pick = rng.pick([0, 1] as const);
    const slot = rng.int(0, 3);
    const base = drawMeet(rng, {
      a: difficulty > 1 ? [2, 3] : [1],
      reach: 5,
      slopes: nonZeroRange(-4, 4),
      intercepts: range(-6, 6),
      accept: (params) => {
        const [u, v] = pick === 0 ? [params.r, params.t] : [params.t, params.r];
        const yu = params.m * u + params.k;
        const yv = params.m * v + params.k;
        // Written backwards must not be the same point, nor the other real one.
        return u !== 0 && yu !== u && !(yu === v && u === yv);
      },
    });
    return { ...base, pick, slot };
  },
  render: (params): Slide => {
    const { r, t, m, k, pick, slot } = params;
    const [u, v] = pick === 0 ? [r, t] : [t, r];
    const yu = m * u + k;
    const yv = m * v + k;
    const wrong = [
      { id: 'mixed', label: pointTex(u, yv), tex: true },
      { id: 'swapped', label: pointTex(yu, u), tex: true },
      { id: 'sign', label: pointTex(-u, yu), tex: true },
    ];
    const right = { id: 'meet', label: pointTex(u, yu), tex: true };
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Only one of these is a point where the line meets the curve. Which one?' },
        { kind: 'display', tex: meetSystemTex(params) },
      ],
      options: [...wrong.slice(0, slot), right, ...wrong.slice(slot)],
      correctId: 'meet',
    };
  },
  solution: (params) => {
    const { a, r, t, m, k, pick } = params;
    const { b, c } = curveOf(params);
    const u = pick === 0 ? r : t;
    const yu = m * u + k;
    return [
      {
        text: 'A meeting point has to satisfy **both** equations. Solving finds it; so does testing each option in both.',
      },
      { text: `Put $x = ${u}$ into the line:` },
      { tex: `${lineAt(m, k, u)} = ${yu}` },
      { text: 'And into the curve:' },
      { tex: curveAt(a, b, c, u) },
      { tex: `= ${yu}` },
      {
        text: `Both give $y = ${yu}$ at $x = ${u}$, so $${pointTex(u, yu)}$ is on both graphs. The other meeting point, at $x = ${u === r ? t : r}$, is not among the options.`,
      },
    ];
  },
};

interface LineValueParams {
  m: number;
  r: number;
  k: number;
}

/**
 * The line gives the $y$: $m \times r + k$, one piece at a time.
 *
 * The back-substitution step on its own, asked where its one trap lives — a
 * negative $x$ times a negative slope. The multiplication is the node with a
 * bank of sign slips; the addition after it is ordinary.
 */
const lineValue: Generator<LineValueParams> = {
  id: 'quad-sim-line-y',
  choices: ({ m, r, k }) => numberChoices(m * r + k, -m * r + k, m * r - k, m + r + k),
  sample: (rng, difficulty) => ({
    m: rng.pick(difficulty > 1 ? [-7, -6, -5, -4, -3, 3, 4, 5, 6, 7] : [-4, -3, -2, 2, 3, 4]),
    r: nonZero(rng.int(-6, 6), -2),
    k: nonZero(rng.int(-9, 9), 4),
  }),
  render: ({ m, r, k }): Slide => {
    const product = m * r;
    const total = product + k;
    const expr =
      k > 0
        ? bin('+', bin('*', num(m), num(r)), num(k))
        : bin('-', bin('*', num(m), num(r)), num(-k));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `The line $y = ${linearTex(m, k)}$ meets the curve where $x = ${r}$. Put that into the line to find the matching $y$. Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      expr,
      banks: {
        'r.l': offer(product, -product, m + r, product + (product > 0 ? 1 : -1) * 2),
        r: offer(total, -product + k, product - k, m + r + k),
      },
    };
  },
  solution: ({ m, r, k }) => [
    {
      text: 'The multiplication comes first, and its sign is the whole difficulty: two negatives make a positive, one makes a negative.',
    },
    { tex: `${m} \\times ${bracketed(r)} = ${m * r}` },
    { tex: `${m * r} ${signedTile(k)} = ${m * r + k}` },
    {
      text: `So the meeting point is $${pointTex(r, m * r + k)}$. The line is always the easier equation to substitute back into — the curve would give the same $y$ with a square to work out on the way.`,
    },
  ],
};

/* ---------- Lesson 4: where a line meets a curve ---------- */

/**
 * A parabola and a line drawn together, both in the text colour.
 *
 * Not the accent colour for the line, which is what the teaching figures use:
 * a slider draws its marker in the accent, and a level line the same colour
 * as the straight line it is being dragged across reads as one more line on
 * the graph rather than as the handle.
 */
function meetFigure(
  params: { a: number; b: number; c: number; m: number; k: number },
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  label: string,
): string {
  const { a, b, c, m, k } = params;
  return plotSvg({
    ...window,
    curves: [{ f: quadratic(a, b, c) }, { f: (x: number) => m * x + k }],
    label,
  });
}

/**
 * The right-hand meeting point, dragged to on the picture.
 *
 * The picture is fixed from $-6$ to $6$ whatever the numbers, so where the
 * crossing sits is the answer and not a property of the frame. The right-hand
 * crossing is never at zero, which is where an untouched slider rests.
 */
const meetSlider: Generator<MeetParams> = {
  id: 'quad-sim-meet-slider',
  sample: (rng, difficulty) =>
    drawMeet(rng, {
      a: difficulty > 1 ? [-1, 2] : [1],
      reach: 5,
      slopes: range(-3, 3),
      intercepts: range(-4, 4),
      accept: ({ r, t, m, k }) =>
        r < t && t !== 0 && Math.abs(m * r + k) <= 12 && Math.abs(m * t + k) <= 12,
    }),
  render: (params): Slide => {
    const { a, r, t, m, k } = params;
    const { b, c } = curveOf(params);
    const yr = m * r + k;
    const yt = m * t + k;
    const turn = quadratic(a, b, c)(-b / (2 * a));
    const lo = Math.min(yr, yt, turn) - 2;
    const hi = Math.max(yr, yt, turn) + 2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'The line crosses the curve twice. Slide to the $x$-coordinate of the crossing further to the **right** — solve for it, or read it off the picture.',
        },
        { kind: 'display', tex: meetSystemTex(params) },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: t,
      readout: 'x = {v}',
      figure: {
        svg: meetFigure(
          { a, b, c, m, k },
          { xMin: -6, xMax: 6, yMin: lo, yMax: Math.max(hi, lo + 8) },
          'A parabola and a straight line crossing it twice',
        ),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: (params) => {
    const { a, r, t } = params;
    const { p, q } = combinedOf(params);
    return [
      { text: 'The crossings are where the two equations agree, so put the line into the curve.' },
      { tex: `${quadTex(a, p, q)} = 0` },
      { tex: `${coefficientTex(a)}${rootFactor(r)}${rootFactor(t)} = 0` },
      {
        text: `The roots are $${r}$ and $${t}$, the two places the line cuts the curve. The one further right is $x = ${t}$.`,
      },
    ];
  },
};

/**
 * The height of the left-hand meeting point, dragged to on the picture.
 *
 * The $y$ half of a solution, found where the learner can see it: drag the
 * level line until it passes through the crossing. The window is fixed at
 * $\pm 10$, so the height on the picture is the answer and not the frame's.
 */
const heightSlider: Generator<MeetParams> = {
  id: 'quad-sim-height-slider',
  sample: (rng, difficulty) =>
    drawMeet(rng, {
      a: difficulty > 1 ? [-1, 2] : [1],
      reach: 5,
      slopes: nonZeroRange(-3, 3),
      intercepts: range(-4, 4),
      accept: ({ r, t, m, k }) => {
        const yr = m * r + k;
        const yt = m * t + k;
        return r < t && yr !== 0 && Math.abs(yr) <= 9 && Math.abs(yt) <= 9;
      },
    }),
  render: (params): Slide => {
    const { a, m, k, r } = params;
    const { b, c } = curveOf(params);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'Slide the level line to the height where the line meets the curve on the **left**.',
        },
        { kind: 'display', tex: meetSystemTex(params) },
      ],
      min: -10,
      max: 10,
      step: 1,
      answer: m * r + k,
      readout: 'y = {v}',
      figure: {
        svg: meetFigure(
          { a, b, c, m, k },
          { xMin: -6, xMax: 6, yMin: -10, yMax: 10 },
          'A parabola and a straight line crossing it twice',
        ),
        ...markerWindow(-10, 10, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { a, r, t, m, k } = params;
    const { p, q } = combinedOf(params);
    return [
      { text: 'Find where they cross first: put the line into the curve.' },
      { tex: `${quadTex(a, p, q)} = 0` },
      { tex: `x = ${r} \\quad \\text{or} \\quad x = ${t}` },
      { text: `The left-hand crossing is at $x = ${r}$. Its height comes from the line.` },
      { tex: `y = ${lineAt(m, k, r)} = ${m * r + k}` },
    ];
  },
};

/* ---------- Lesson 5: tangency ---------- */

interface CountParams {
  a: number;
  p: number;
  q: number;
  m: number;
  k: number;
  kind: 'two' | 'one' | 'none';
}

const COUNT_NEGATIVE = 'Yes, it is negative';
const COUNT_NOT_NEGATIVE = 'No, it is not';
const COUNT_ZERO = 'Yes, exactly zero';
const COUNT_POSITIVE = 'No, it is positive';

/** Coefficients of a quadratic whose discriminant has the sign asked for. */
function drawCombined(
  rng: Rng,
  a: number,
  kind: CountParams['kind'],
): { p: number; q: number } {
  if (kind === 'one') {
    // a(x - x0)^2: a repeated root at x0.
    const x0 = nonZero(rng.int(-4, 4), 2);
    return { p: -2 * a * x0, q: a * x0 * x0 };
  }
  const p = rng.int(-7, 7);
  const edge = (p * p) / (4 * a);
  if (kind === 'none') return { p, q: Math.floor(edge) + rng.int(1, 6) };
  // Two roots: q strictly below the edge, and not zero, so the constant stays.
  const q = Math.ceil(edge) - rng.int(1, 8);
  return { p, q: q === 0 ? -1 : q };
}

/**
 * How many times does the line meet the curve?
 *
 * Asked as a walk rather than three options, because the answer comes from a
 * sign and the sign comes from a calculation: is the discriminant negative,
 * and if not, is it zero. The draw picks the case first and builds the
 * combined quadratic to match, so all three turn up equally often — a pool
 * drawn at random would be almost all "twice".
 */
const meetingCount: Generator<CountParams> = {
  id: 'quad-sim-count',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['two', 'one', 'none'] as const);
    const a = difficulty > 1 ? rng.pick([2, 3]) : 1;
    const { p, q } = drawCombined(rng, a, kind);
    return { a, p, q, m: nonZero(rng.int(-4, 4), 1), k: rng.int(-5, 5), kind };
  },
  render: ({ a, p, q, m, k, kind }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'How many times does the line meet the curve? Put the line into the curve, then work down the questions.',
      },
    ],
    subject: systemTex(quadTex(a, p + m, q + k), linearTex(m, k)),
    steps: [
      {
        id: 'negative',
        ask: 'Is the discriminant $b^{2} - 4ac$ of the combined quadratic negative?',
        branches: [
          { label: COUNT_NEGATIVE, outcome: 'No real roots, so the line **misses** the curve altogether.' },
          { label: COUNT_NOT_NEGATIVE, to: 'zero' },
        ],
      },
      {
        id: 'zero',
        ask: 'Is it exactly zero?',
        branches: [
          { label: COUNT_ZERO, outcome: 'One repeated root: the line is a **tangent**, touching the curve once.' },
          { label: COUNT_POSITIVE, outcome: 'Two different roots: the line **crosses** the curve twice.' },
        ],
      },
    ],
    answer:
      kind === 'none'
        ? [COUNT_NEGATIVE]
        : kind === 'one'
          ? [COUNT_NOT_NEGATIVE, COUNT_ZERO]
          : [COUNT_NOT_NEGATIVE, COUNT_POSITIVE],
  }),
  solution: ({ a, p, q, kind }) => {
    const disc = p * p - 4 * a * q;
    return [
      { text: 'Substitute and collect terms to get one quadratic.' },
      { tex: `${quadTex(a, p, q)} = 0` },
      { text: 'Its discriminant, $b^{2} - 4ac$:' },
      { tex: `${bracketed(p)}^{2} - 4 \\times ${a} \\times ${bracketed(q)} = ${disc}` },
      {
        text:
          kind === 'none'
            ? 'Negative, so the quadratic has no real roots: there is no $x$ where the two equations agree, and the graphs never meet.'
            : kind === 'one'
              ? 'Zero, so there is exactly one root, repeated: the line touches the curve at a single point without crossing it. That is what a tangent is.'
              : 'Positive, so there are two different roots, one for each place the line cuts through the curve.',
      },
    ];
  },
};

/**
 * The combined quadratic's discriminant, laid out as a tree.
 *
 * The first two slots are the combined equation's coefficients — so the tree
 * checks the substitution as well as the arithmetic — then $b^2$ and $4ac$
 * worked out apart before they meet, which is the discipline that keeps a
 * negative constant from going wrong.
 */
interface DiscTreeParams {
  a: number;
  p: number;
  q: number;
  m: number;
  k: number;
}

const discriminantTree: Generator<DiscTreeParams> = {
  id: 'quad-sim-disc-tree',
  sample: (rng, difficulty) => ({
    a: difficulty > 1 ? rng.pick([2, 3]) : 1,
    p: nonZero(rng.int(-8, 8), 3),
    q: nonZero(rng.int(-8, 8), -2),
    m: nonZero(rng.int(-4, 4), 2),
    k: rng.int(-6, 6),
  }),
  render: ({ a, p, q, m, k }): Slide => {
    const pSquared = p * p;
    const fourAQ = 4 * a * q;
    const disc = pSquared - fourAQ;
    const answer = [`${p}`, `${q}`, `${pSquared}`, `${fourAQ}`, `${disc}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Put the line into the curve, keeping $${a === 1 ? 'x^{2}' : `${a}x^{2}`}$ at the front. Fill the tree: $b$ and $c$, then $b^{2}$ and $4ac$, then the discriminant.`,
        },
        { kind: 'display', tex: systemTex(quadTex(a, p + m, q + k), linearTex(m, k)) },
      ],
      expression: 'b^{2} - 4ac',
      nodes: [
        { id: 'b', from: [] },
        { id: 'c', from: [] },
        { id: 'bsq', from: ['b'] },
        { id: 'fourac', from: ['c'] },
        { id: 'disc', from: ['bsq', 'fourac'] },
      ],
      bank: treeBank(answer, [p + 2 * m, q + 2 * k, -p, -q, pSquared + fourAQ], disc),
      answer,
    };
  },
  solution: ({ a, p, q, m, k }) => {
    const disc = p * p - 4 * a * q;
    return [
      { text: 'Take the line away from the curve, term by term.' },
      { tex: `${quadTex(a, p + m, q + k)} - \\left(${linearTex(m, k)}\\right)` },
      { tex: `= ${quadTex(a, p, q)}` },
      { text: `So $b = ${p}$ and $c = ${q}$ in the equation that matters — not the curve's own coefficients.` },
      { tex: `${bracketed(p)}^{2} - 4 \\times ${a} \\times ${bracketed(q)}` },
      { tex: `= ${p * p} - ${bracketed(4 * a * q)} = ${disc}` },
      {
        text:
          disc > 0
            ? 'Positive: the line crosses the curve twice.'
            : disc === 0
              ? 'Zero: the line touches the curve once, as a tangent.'
              : 'Negative: the line and the curve never meet.',
      },
    ];
  },
};

interface TangentParams {
  a: number;
  /** Where the line touches. */
  x0: number;
  m: number;
  c: number;
}

/** The curve's x coefficient, built so that the line of slope m touches at x0. */
function tangentCurve({ a, x0, m, c }: TangentParams): { b: number; k: number } {
  return { b: m - 2 * a * x0, k: c - a * x0 * x0 };
}

/**
 * Find the intercept that makes the line a tangent.
 *
 * The discriminant used as a condition rather than a test: set it to zero and
 * solve for the unknown. The pool is built from the touching point, so every
 * answer is whole — the combined equation is $a\left(x - x_0\right)^2$ by
 * construction.
 */
const tangentIntercept: Generator<TangentParams> = {
  id: 'quad-sim-tangent-k',
  choices: (params) => {
    const { a, x0, c } = params;
    const { k } = tangentCurve(params);
    return numberChoices(k, c + a * x0 * x0, -k, c - a * a * x0 * x0);
  },
  sample: (rng, difficulty) => ({
    a: difficulty > 1 ? rng.pick([2, 3]) : 1,
    x0: nonZero(rng.int(-4, 4), 1),
    m: nonZero(rng.int(-4, 4), 2),
    c: rng.int(-6, 6),
  }),
  render: (params): Slide => {
    const { a, m, c } = params;
    const { b } = tangentCurve(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: 'This line is a tangent to the curve: it touches it exactly once. Find $k$.',
        },
        { kind: 'display', tex: systemTex(quadTex(a, b, c), `${leadTerm(m, 'x')} + k`) },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${tangentCurve(params).k}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, m, c } = params;
    const { b, k } = tangentCurve(params);
    const p = b - m;
    return [
      { text: 'Put the line into the curve and collect terms, leaving $k$ as it is.' },
      { tex: `${quadTex(a, p, 0)} + \\left(${c} - k\\right) = 0` },
      { text: 'Touching once means one repeated root, so the discriminant is zero.' },
      { tex: `${bracketed(p)}^{2} - 4 \\times ${a} \\times \\left(${c} - k\\right) = 0` },
      { tex: `${c} - k = \\frac{${p * p}}{${4 * a}} = ${(p * p) / (4 * a)} \\implies k = ${k}` },
    ];
  },
};

/**
 * Where does the tangent touch? Dragged to on the picture.
 *
 * The repeated root, seen: the combined quadratic is a perfect square, and
 * the place it is zero is the one place the line and curve share. Fixed
 * window, never at zero.
 */
const touchSlider: Generator<TangentParams> = {
  id: 'quad-sim-touch-slider',
  sample: (rng, difficulty) => ({
    a: difficulty > 1 ? rng.pick([-1, 2]) : 1,
    x0: nonZero(rng.int(-4, 4), 2),
    m: nonZero(rng.int(-3, 3), 1),
    c: rng.int(-4, 4),
  }),
  render: (params): Slide => {
    const { a, x0, m, c } = params;
    const { b, k } = tangentCurve(params);
    const y0 = m * x0 + k;
    const turn = quadratic(a, b, c)(-b / (2 * a));
    const lo = Math.min(y0, turn) - 4;
    const hi = Math.max(y0, turn) + 4;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'This line is a tangent to the curve. Slide to the $x$-coordinate of the point where it touches.',
        },
        { kind: 'display', tex: systemTex(quadTex(a, b, c), linearTex(m, k)) },
      ],
      min: -5,
      max: 5,
      step: 1,
      answer: x0,
      readout: 'x = {v}',
      figure: {
        svg: meetFigure(
          { a, b, c, m, k },
          { xMin: -5, xMax: 5, yMin: lo, yMax: Math.max(hi, lo + 10) },
          'A parabola with a straight line touching it once',
        ),
        ...markerWindow(-5, 5),
      },
    };
  },
  solution: (params) => {
    const { a, x0, m } = params;
    const { b, k } = tangentCurve(params);
    return [
      { text: 'Put the line into the curve and collect terms.' },
      { tex: `${quadTex(a, b - m, 0)} ${signedTile(a * x0 * x0)} = 0` },
      { text: 'A tangent gives a repeated root, so this is a perfect square.' },
      { tex: `${coefficientTex(a)}${rootFactor(x0)}^{2} = 0 \\implies x = ${x0}` },
      { text: `So the line touches at $x = ${x0}$, where $y = ${m * x0 + k}$.` },
    ];
  },
};

export const simultaneousGenerators = [
  makeSubject,
  substituteLine,
  twoCurves,
  substitutionRoute,
  meetingXs,
  otherMeeting,
  pairSolutions,
  whichPoint,
  lineValue,
  meetSlider,
  heightSlider,
  meetingCount,
  discriminantTree,
  tangentIntercept,
  touchSlider,
] as unknown as Generator<unknown>[];
