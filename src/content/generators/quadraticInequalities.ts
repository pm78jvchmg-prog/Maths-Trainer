/**
 * Quadratic inequalities: where a parabola sits above or below the axis.
 *
 * Roadmap batch B11, the fifth Quadratics level. Every question here comes
 * back to one picture: a parabola cuts the $x$-axis at its two roots, and on
 * one side of them it is below the axis while on the other it is above. So
 * solving $ax^2 + bx + c < 0$ is two jobs — find the roots, then read off
 * whether the answer lies *between* them or *outside* them — and the five
 * lessons walk that in order: the picture, solving by factorising, the two
 * shapes an answer takes, rearranging first (and the curves that never meet
 * the axis at all), and finally inequalities on an unknown coefficient.
 *
 * **Every root is whole.** The generators are built backwards from the roots,
 * $a\left(x - p\right)\left(x - q\right)$ with $p < q$, so nothing turns into
 * an exercise in surds. That squeezes the 25-distinct floor, so the pools vary
 * the leading coefficient, the roots, the direction and strictness of the
 * inequality, and — for the fixed-stem questions — the phrasing.
 *
 * There is no number-line widget yet (roadmap batch C8 adds one), so an answer
 * is never a drawn interval: it is picked, assembled from tiles, typed as an
 * endpoint, dragged to, or walked through as a decision.
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
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import type { Expr } from '../expr';
import { markerWindow, plotSvg, quadratic, type Curve } from '../figures';
import { options } from '../choiceVariant';
import { bin, num } from '../expr';
import { bankOf, offer, quadraticTex, signedTile } from './quadratics';
import { linearTex } from './quadraticSimultaneous';

/* ---------- The inequality sign ---------- */

type Op = '<' | '>' | '<=' | '>=';

const ALL_OPS: readonly Op[] = ['<', '>', '<=', '>='];
const STRICT_OPS: readonly Op[] = ['<', '>'];

const OP_TEX: Record<Op, string> = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' };
const FLIPPED: Record<Op, Op> = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };
const TOGGLED: Record<Op, Op> = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' };

/** Does the inequality ask for the curve below the axis? */
const asksBelow = (op: Op): boolean => op === '<' || op === '<=';
const isStrict = (op: Op): boolean => op === '<' || op === '>';

/**
 * Is the answer the one piece between the roots?
 *
 * A U-shaped curve is below the axis between its roots; an upside-down one is
 * above it there. So "between" is the case where the shape and the direction
 * agree, and everything else is the two pieces outside.
 */
const isBetween = (a: number, op: Op): boolean => a > 0 === asksBelow(op);

/* ---------- Formatting ---------- */

/** ax^2 + bx + c, with a leading coefficient of -1 written as a bare minus. */
function polyTex(a: number, b: number, c: number): string {
  return a === -1 ? `-${quadraticTex(1, b, c)}` : quadraticTex(a, b, c);
}

/** A leading coefficient in front of brackets: nothing for 1, a bare minus for -1. */
function coefficientTex(a: number): string {
  return a === 1 ? '' : a === -1 ? '-' : `${a}`;
}

/** A root's factor: `(x - 3)`, `(x + 2)`. Roots here are never zero. */
function rootFactor(root: number): string {
  return `\\left(x ${signedTile(-root)}\\right)`;
}

/** A number, bracketed when negative, for a substitution written out. */
function bracketed(value: number): string {
  return value < 0 ? `\\left(${value}\\right)` : `${value}`;
}

/**
 * A solution set, in one of its two shapes.
 *
 * The endpoints are TeX rather than numbers so a question can put a letter in
 * place of the one it asks for.
 */
function setTex(lo: string | number, hi: string | number, strict: boolean, between: boolean, letter = 'x'): string {
  const less = strict ? '<' : '\\le';
  const more = strict ? '>' : '\\ge';
  return between
    ? `${lo} ${less} ${letter} ${less} ${hi}`
    : `${letter} ${less} ${lo} \\text{ or } ${letter} ${more} ${hi}`;
}

/* ---------- A quadratic built from its roots ---------- */

interface IneqParams {
  a: number;
  /** The smaller root. */
  p: number;
  /** The larger root. */
  q: number;
  op: Op;
}

function coefficients({ a, p, q }: { a: number; p: number; q: number }): { b: number; c: number } {
  return { b: -a * (p + q), c: a * p * q };
}

/** The inequality with the quadratic multiplied out: `x^2 - x - 6 < 0`. */
function expandedTex(params: IneqParams): string {
  const { b, c } = coefficients(params);
  return `${polyTex(params.a, b, c)} ${OP_TEX[params.op]} 0`;
}

/** The inequality left in brackets: `(x + 2)(x - 3) < 0`. */
function factorisedTex({ a, p, q, op }: IneqParams): string {
  return `${coefficientTex(a)}${rootFactor(p)}${rootFactor(q)} ${OP_TEX[op]} 0`;
}

/** The answer to an inequality, as the learner writes it. */
function answerTex({ a, p, q, op }: IneqParams): string {
  return setTex(p, q, isStrict(op), isBetween(a, op));
}

/**
 * Two different whole, non-zero roots, at least `gap` apart.
 *
 * The fallback passes every rule any caller sets — `accept` included — so a
 * run of bad luck never produces a degenerate slide.
 */
function drawRoots(
  rng: Rng,
  reach: number,
  gap: number,
  accept?: (p: number, q: number) => boolean,
): { p: number; q: number } {
  for (let tries = 0; tries < 200; tries += 1) {
    const x = rng.int(-reach, reach);
    const y = rng.int(-reach, reach);
    const p = Math.min(x, y);
    const q = Math.max(x, y);
    if (p === 0 || q === 0 || q - p < gap) continue;
    if (!accept || accept(p, q)) return { p, q };
  }
  return { p: -2, q: 3 };
}

/** An inequality sign whose answer is the between shape, for this `a`. */
function betweenOp(a: number, strict: boolean): Op {
  return a > 0 ? (strict ? '<' : '<=') : strict ? '>' : '>=';
}

/** An inequality sign whose answer is the outside shape, for this `a`. */
function outsideOp(a: number, strict: boolean): Op {
  return betweenOp(-a, strict);
}

/**
 * The opening two steps of every worked solution: the roots, then the shape.
 */
function rootsAndShape({ a, p, q, op }: IneqParams): SolutionStep[] {
  const { b, c } = coefficients({ a, p, q });
  return [
    { text: 'Find where the curve meets the axis: set the quadratic equal to zero and factorise.' },
    { tex: `${polyTex(a, b, c)} = ${coefficientTex(a)}${rootFactor(p)}${rootFactor(q)} = 0` },
    { text: `So the critical values are $x = ${p}$ and $x = ${q}$.` },
    {
      text:
        a > 0
          ? `The $x^{2}$ coefficient is positive, so the curve is U-shaped: **below** the axis between $${p}$ and $${q}$, above it outside.`
          : `The $x^{2}$ coefficient is negative, so the curve is upside down: **above** the axis between $${p}$ and $${q}$, below it outside.`,
    },
    {
      text: `The inequality asks for ${asksBelow(op) ? 'below' : 'above'} the axis${
        isStrict(op) ? '' : ', or on it — so the roots themselves count'
      }.`,
    },
  ];
}

/* ---------- Pictures ---------- */

const X_MIN = -7;
const X_MAX = 7;

/**
 * The parabola on a fixed window from $-7$ to $7$, roots ringed.
 *
 * Fixed so that where a root sits is a fact about the question rather than
 * about the frame. The ring follows the drawing convention the lessons teach:
 * hollow for a strict inequality, where the root itself is left out, and solid
 * where it counts.
 *
 * `region` picks out the part of the curve an answer is about, in the accent
 * colour, and shades it too when it is the one piece between the roots. That
 * is for teaching figures only: a slider draws its marker in the accent, so a
 * slider figure leaves it off.
 */
export function signFigure(
  { a, p, q }: { a: number; p: number; q: number },
  opts: { strict?: boolean; region?: 'between' | 'outside'; label: string },
): string {
  const { b, c } = coefficients({ a, p, q });
  const f = quadratic(a, b, c);
  const depth = Math.abs(a) * ((q - p) / 2) ** 2;
  const reach = Math.max(depth, 4);
  const [yMin, yMax] = a > 0 ? [-depth * 1.2 - 1, reach] : [-reach, depth * 1.2 + 1];
  const curves: Curve[] = [{ f }];
  if (opts.region === 'between') {
    curves.push({ f: (x) => (x >= p && x <= q ? f(x) : NaN), accent: true, breaks: true });
  } else if (opts.region === 'outside') {
    curves.push({ f: (x) => (x <= p || x >= q ? f(x) : NaN), accent: true, breaks: true });
  }
  return plotSvg({
    xMin: X_MIN,
    xMax: X_MAX,
    yMin,
    yMax,
    curves,
    marks:
      opts.strict === undefined
        ? []
        : [
            { x: p, y: 0, hollow: opts.strict },
            { x: q, y: 0, hollow: opts.strict },
          ],
    shade: opts.region === 'between' ? { f, from: p, to: q } : undefined,
    label: opts.label,
  });
}

/* ---------- Choice helpers ---------- */

/**
 * A native choice slide with the answer in a drawn slot.
 *
 * Drawn in `sample` rather than hashed from the labels: these options are
 * built from the same two roots in every row, and a label hash over them
 * clusters the answer in some slots and never reaches others.
 */
function choiceSlide(prompt: Block[], correct: string, distractors: string[], slot: number): Slide {
  const rest = distractors.filter((label, idx) => label !== correct && distractors.indexOf(label) === idx);
  const at = slot % (rest.length + 1);
  const labels = [...rest.slice(0, at), correct, ...rest.slice(at)];
  return {
    kind: 'choice',
    prompt,
    options: labels.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
    correctId: `opt${at}`,
  };
}

/**
 * Four whole-number options built from `offer`, the correct one flagged.
 *
 * The same helper `quadraticSimultaneous.ts` keeps privately, repeated rather
 * than shared so that neither file needs a new export.
 */
function numberChoices(correct: number, ...near: number[]): ChoiceOption[] {
  return options(
    { tex: `${correct}`, answer: `${correct}` },
    ...offer(correct, ...near)
      .filter((value) => Number(value) !== correct)
      .map((value) => ({ tex: value, answer: value })),
  );
}

const pickA = (rng: Rng, difficulty: number, easy: readonly number[], hard: readonly number[]): number =>
  rng.pick(difficulty > 1 ? hard : easy);

/* ---------- Lesson 1: reading the sign from the graph ---------- */

interface GraphParams extends IneqParams {
  slot: number;
}

/**
 * Which values of $x$ satisfy it? Read off the picture.
 *
 * The factorised form gives the roots and the graph gives the rest: which
 * side of the axis the curve is on between them. The distractors are the
 * other shape, the wrong kind of endpoint, and half an answer — the right
 * piece on one side with the other end forgotten.
 */
const readGraph: Generator<GraphParams> = {
  id: 'quad-ineq-read-graph',
  sample: (rng, difficulty) => ({
    a: pickA(rng, difficulty, [1], [1, -1]),
    ...drawRoots(rng, 5, 2),
    op: rng.pick(difficulty > 1 ? ALL_OPS : STRICT_OPS),
    slot: rng.int(0, 3),
  }),
  render: (params): Slide => {
    const { a, p, q, op, slot } = params;
    const strict = isStrict(op);
    const between = isBetween(a, op);
    const half = between
      ? `x ${strict ? '<' : '\\le'} ${q}`
      : `x ${strict ? '>' : '\\ge'} ${q}`;
    return choiceSlide(
      [
        {
          kind: 'prose',
          text: `The graph is $y = ${coefficientTex(a)}${rootFactor(p)}${rootFactor(q)}$. Which values of $x$ satisfy the inequality?`,
        },
        { kind: 'display', tex: factorisedTex(params) },
        {
          kind: 'diagram',
          svg: signFigure(params, {
            strict,
            label: `A parabola crossing the x-axis at ${p} and ${q}`,
          }),
        },
      ],
      answerTex(params),
      [setTex(p, q, strict, !between), setTex(p, q, !strict, between), half],
      slot,
    );
  },
  solution: (params) => {
    const { a, p, q, op } = params;
    return [
      { text: `The brackets are zero at $x = ${p}$ and $x = ${q}$, where the curve crosses the axis.` },
      {
        text:
          a > 0
            ? 'The curve is U-shaped, so it dips below the axis between the roots and rises above it outside them.'
            : 'The curve is upside down, so it is above the axis between the roots and below it outside them.',
      },
      {
        text: `$${OP_TEX[op]} 0$ asks for ${asksBelow(op) ? 'below' : 'above'} the axis, which is ${
          isBetween(a, op) ? 'the one piece between the roots' : 'the two pieces outside the roots'
        }.`,
      },
      { tex: answerTex(params) },
      {
        text: isStrict(op)
          ? 'The sign is strict, so the roots themselves — where $y = 0$ — are left out: $<$ rather than $\\le$.'
          : 'The sign allows equality, so the roots themselves count: $\\le$ and $\\ge$ rather than $<$ and $>$.',
      },
    ];
  },
};

interface TestPointParams extends IneqParams {
  /** The value tested. Never a root. */
  u: number;
}

/**
 * Is this value a solution? Substitute and see.
 *
 * The test-point method that backs up every picture: put a number into the
 * factorised form and read the sign of what comes out. Asked as a reduction
 * so the two brackets are worked out before they are multiplied — the order
 * that keeps a negative bracket from losing its sign. At difficulty 2 a
 * leading coefficient multiplies in as well.
 */
const testPoint: Generator<TestPointParams> = {
  id: 'quad-ineq-test-point',
  choices: ({ a, p, q, u }) => {
    const value = a * (u - p) * (u - q);
    return numberChoices(value, -value, a * (u + p) * (u + q), a * ((u - p) + (u - q)));
  },
  sample: (rng, difficulty) => {
    const { p, q } = drawRoots(rng, 5, 2);
    let u = rng.int(-6, 6);
    while (u === p || u === q) u += 1;
    return { a: pickA(rng, difficulty, [1], [2, -1, 3, -2]), p, q, u, op: rng.pick(ALL_OPS) };
  },
  render: (params): Slide => {
    const { a, p, q, u } = params;
    const left = bin('-', num(u), num(p));
    const right = bin('-', num(u), num(q));
    const l = u - p;
    const r = u - q;
    const value = a * l * r;
    const banks: Record<string, string[]> = {};
    let expr: Expr;
    if (a === 1) {
      expr = bin('*', left, right);
      banks['r.l'] = offer(l, u + p, p - u);
      banks['r.r'] = offer(r, u + q, q - u);
      banks.r = offer(value, -value, l + r);
    } else {
      expr = bin('*', bin('*', num(a), left), right);
      banks['r.l.r'] = offer(l, u + p, p - u);
      banks['r.l'] = offer(a * l, -a * l, a + l);
      banks['r.r'] = offer(r, u + q, q - u);
      banks.r = offer(value, -value, a * l + r);
    }
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Is $x = ${u}$ a solution? Put it into the brackets and work out the value, one piece at a time — its sign is the answer.`,
        },
        { kind: 'display', tex: factorisedTex(params) },
      ],
      expr,
      banks,
    };
  },
  solution: (params) => {
    const { a, p, q, u, op } = params;
    const value = a * (u - p) * (u - q);
    const works = asksBelow(op) ? value < 0 : value > 0;
    const prefix = a === 1 ? '' : `${bracketed(a)} \\times `;
    return [
      { text: `Substitute $x = ${u}$ into each bracket first.` },
      {
        tex: `${prefix}\\left(${u} - ${bracketed(p)}\\right)\\left(${u} - ${bracketed(q)}\\right) = ${prefix}${bracketed(u - p)} \\times ${bracketed(u - q)} = ${value}`,
      },
      {
        text: `$${value}$ is ${value < 0 ? 'negative' : 'positive'}, and the inequality asks for ${
          asksBelow(op) ? 'a negative value' : 'a positive value'
        }${isStrict(op) ? '' : ' or zero'}. So $x = ${u}$ ${works ? '**is**' : 'is **not**'} a solution.`,
      },
    ];
  },
};

/**
 * The last whole number in, dragged to on the picture.
 *
 * Asked about whole numbers rather than about the roots, because that is
 * where strictness bites: with $<$ the root itself is out, so the largest
 * whole number in $-2 < x < 3$ is $2$, and with $\le$ it is $3$. For the
 * outside shape the question is the first whole number in the right-hand
 * piece. The rings on the picture are hollow or solid to match.
 */
const endSlider: Generator<IneqParams> = {
  id: 'quad-ineq-end-slider',
  sample: (rng, difficulty) => {
    const a = pickA(rng, difficulty, [1], [1, -1, 2]);
    for (let tries = 0; tries < 200; tries += 1) {
      const { p, q } = drawRoots(rng, 5, 2);
      const op = rng.pick(ALL_OPS);
      const params = { a, p, q, op };
      const answer = endAnswer(params);
      if (answer !== 0) return params;
    }
    return { a, p: -2, q: 3, op: betweenOp(a, true) };
  },
  render: (params): Slide => {
    const { a, op } = params;
    const { b, c } = coefficients(params);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: isBetween(a, op)
            ? 'Slide to the **largest** whole number that satisfies the inequality.'
            : 'Part of the answer runs off to the right. Slide to the **smallest** whole number in that part.',
        },
        { kind: 'display', tex: a === 1 ? factorisedTex(params) : expandedTex(params) },
      ],
      min: X_MIN,
      max: X_MAX,
      step: 1,
      answer: endAnswer(params),
      readout: 'x = {v}',
      figure: {
        svg: signFigure(params, {
          strict: isStrict(op),
          label: `The curve y = ${polyTex(a, b, c)}, crossing the x-axis twice`,
        }),
        ...markerWindow(X_MIN, X_MAX),
      },
    };
  },
  solution: (params) => {
    const { a, q, op } = params;
    const answer = endAnswer(params);
    return [
      ...rootsAndShape(params),
      { tex: answerTex(params) },
      {
        text: isBetween(a, op)
          ? isStrict(op)
            ? `The answer stops just short of $${q}$, which is left out, so the largest whole number in it is $${answer}$.`
            : `The answer runs up to $${q}$ and includes it, so the largest whole number in it is $${answer}$.`
          : isStrict(op)
            ? `The right-hand part starts just after $${q}$, which is left out, so its smallest whole number is $${answer}$.`
            : `The right-hand part starts at $${q}$ and includes it, so its smallest whole number is $${answer}$.`,
      },
    ];
  },
};

function endAnswer({ a, q, op }: IneqParams): number {
  const strict = isStrict(op);
  if (isBetween(a, op)) return strict ? q - 1 : q;
  return strict ? q + 1 : q;
}

/**
 * How many whole numbers satisfy it?
 *
 * Only the one-piece answer has a count, so this is always the between shape.
 * The two slips are the other kind of endpoint — counting the roots in when
 * they are out, or out when they are in — and the plain difference $q - p$.
 */
const countIntegers: Generator<IneqParams> = {
  id: 'quad-ineq-count',
  choices: (params) => {
    const { p, q, op } = params;
    const n = countOf(params);
    // Doubling the count is not a slip anyone makes; it is there because with
    // only the three near misses the options are n and its neighbours, and
    // their label hash put the answer in the first row nine times in ten.
    return numberChoices(n, isStrict(op) ? q - p + 1 : q - p - 1, q - p, 2 * n);
  },
  sample: (rng, difficulty) => {
    const a = pickA(rng, difficulty, [1], [1, -1, 2]);
    const strict = rng.chance(0.5);
    return { a, ...drawRoots(rng, 5, 2), op: betweenOp(a, strict) };
  },
  render: (params): Slide => {
    const { a, p, q, op } = params;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'How many whole numbers satisfy this inequality? Call the count $n$.' },
        { kind: 'display', tex: a === 1 ? factorisedTex(params) : expandedTex(params) },
        {
          kind: 'diagram',
          svg: signFigure(params, {
            strict: isStrict(op),
            label: `A parabola crossing the x-axis at ${p} and ${q}`,
          }),
        },
      ],
      lead: 'n =',
      keypad: [],
      answer: `${countOf(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { p, q, op } = params;
    const n = countOf(params);
    const first = isStrict(op) ? p + 1 : p;
    const last = isStrict(op) ? q - 1 : q;
    return [
      ...rootsAndShape(params),
      { tex: answerTex(params) },
      {
        text: `The whole numbers in it run from $${first}$ to $${last}$${
          isStrict(op) ? `, since $${p}$ and $${q}$ themselves are left out` : `, both ends included`
        }.`,
      },
      { text: `That is $${last} - ${bracketed(first)} + 1 = ${n}$ whole numbers.` },
    ];
  },
};

function countOf({ p, q, op }: IneqParams): number {
  return isStrict(op) ? q - p - 1 : q - p + 1;
}

/* ---------- Lesson 2: solving by factorising ---------- */

/**
 * Solve, when the answer is the one piece between the roots.
 *
 * Tiles rather than a pick, so both the numbers and the signs are placed:
 * the roots read off the brackets without flipping them sit in the bank, and
 * so do the other inequality signs.
 */
const betweenTiles: Generator<IneqParams> = {
  id: 'quad-ineq-between-tiles',
  sample: (rng, difficulty) => {
    const a = pickA(rng, difficulty, [1], [1, -1, 2, -2, 3]);
    return { a, ...drawRoots(rng, 6, 1), op: betweenOp(a, rng.chance(0.5)) };
  },
  render: (params): Slide => {
    const { p, q, op } = params;
    const less = isStrict(op) ? '<' : '\\le';
    const answer = [`${p}`, less, less, `${q}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Solve the inequality. The answer is one piece: write it with the smaller number first.',
        },
        { kind: 'display', tex: expandedTex(params) },
      ],
      template: '{0} {1} x {2} {3}',
      bank: bankOf(answer, [`${-p}`, `${-q}`, isStrict(op) ? '\\le' : '<', '>']),
      answer,
    };
  },
  solution: (params) => [...rootsAndShape(params), { tex: answerTex(params) }],
};

/**
 * Solve, when the answer is the two pieces outside the roots.
 *
 * The same bank of slips, and one more: the two signs point opposite ways —
 * $x < p$ on the left, $x > q$ on the right — and placing them the same way
 * round is the mistake this shape invites.
 */
const outsideTiles: Generator<IneqParams> = {
  id: 'quad-ineq-outside-tiles',
  sample: (rng, difficulty) => {
    const a = pickA(rng, difficulty, [1], [1, -1, 2, -2, 3]);
    return { a, ...drawRoots(rng, 6, 1), op: outsideOp(a, rng.chance(0.5)) };
  },
  render: (params): Slide => {
    const { p, q, op } = params;
    const strict = isStrict(op);
    const answer = [strict ? '<' : '\\le', `${p}`, strict ? '>' : '\\ge', `${q}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Solve the inequality. The answer is two pieces: fill in the sign and the number for each.',
        },
        { kind: 'display', tex: expandedTex(params) },
      ],
      template: 'x {0} {1} \\text{ or } x {2} {3}',
      bank: bankOf(answer, [`${-p}`, `${-q}`, strict ? '\\le' : '<', strict ? '\\ge' : '>']),
      answer,
    };
  },
  solution: (params) => [
    ...rootsAndShape(params),
    { tex: answerTex(params) },
    {
      text: `Each piece points away from the roots: $x$ smaller than $${params.p}$, or $x$ bigger than $${params.q}$.`,
    },
  ],
};

const SHAPE_UP = 'Positive: U-shaped';
const SHAPE_DOWN = 'Negative: upside down';
const SIDE_BELOW = 'Below the axis';
const SIDE_ABOVE = 'Above the axis';

/**
 * Between the roots or outside them? Two questions decide it.
 *
 * Which way up is the curve, and which side of the axis does the inequality
 * want. Asked as a walk rather than two options, because a learner who
 * guesses "between" for every `<` is right exactly as long as the curve is
 * U-shaped — and the first fork is where that habit gets caught.
 */
const regionFlow: Generator<IneqParams> = {
  id: 'quad-ineq-region-flow',
  sample: (rng, difficulty) => ({
    a: pickA(rng, difficulty, [1, -1], [1, -1, 2, -2, 3, -3]),
    ...drawRoots(rng, 6, 1),
    op: rng.pick(ALL_OPS),
  }),
  render: (params): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Is the answer the piece between the roots, or the two pieces outside them? Work down the questions.',
      },
    ],
    subject: expandedTex(params),
    steps: [
      {
        id: 'shape',
        ask: 'Is the coefficient of $x^{2}$ positive or negative?',
        branches: [
          { label: SHAPE_UP, to: 'up' },
          { label: SHAPE_DOWN, to: 'down' },
        ],
      },
      {
        id: 'up',
        ask: 'A U-shaped curve is below the axis between its roots. Which side does the inequality ask for?',
        branches: [
          { label: SIDE_BELOW, outcome: '**Between** the roots: the answer is one piece.' },
          { label: SIDE_ABOVE, outcome: '**Outside** the roots: the answer is two pieces.' },
        ],
      },
      {
        id: 'down',
        ask: 'An upside-down curve is above the axis between its roots. Which side does the inequality ask for?',
        branches: [
          { label: SIDE_BELOW, outcome: '**Outside** the roots: the answer is two pieces.' },
          { label: SIDE_ABOVE, outcome: '**Between** the roots: the answer is one piece.' },
        ],
      },
    ],
    answer: [params.a > 0 ? SHAPE_UP : SHAPE_DOWN, asksBelow(params.op) ? SIDE_BELOW : SIDE_ABOVE],
  }),
  solution: (params) => [...rootsAndShape(params), { tex: answerTex(params) }],
};

interface EndpointParams extends IneqParams {
  side: 'left' | 'right';
}

/**
 * One critical value, typed, with the shape of the answer given.
 *
 * The other end is on the page, so what is being asked is the factorising
 * and the sign — a root read off $\left(x + 4\right)$ as $4$ is the slip, and
 * it sits among the options of the multiple-choice form.
 */
const endpoint: Generator<EndpointParams> = {
  id: 'quad-ineq-endpoint',
  choices: ({ p, q, side }) => {
    const [k, other] = side === 'left' ? [p, q] : [q, p];
    return numberChoices(k, -k, -other, k + (side === 'left' ? -1 : 1));
  },
  sample: (rng, difficulty) => ({
    a: pickA(rng, difficulty, [1], [-1, 2, -2, 3]),
    ...drawRoots(rng, 6, 1),
    op: rng.pick(ALL_OPS),
    side: rng.pick(['left', 'right'] as const),
  }),
  render: (params): Slide => {
    const { a, p, q, op, side } = params;
    const shape = setTex(side === 'left' ? 'k' : p, side === 'left' ? q : 'k', isStrict(op), isBetween(a, op));
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `Solve the inequality. Its answer has the form $${shape}$ — find $k$.` },
        { kind: 'display', tex: expandedTex(params) },
      ],
      lead: 'k =',
      keypad: [],
      answer: `${side === 'left' ? p : q}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => [
    ...rootsAndShape(params),
    { tex: answerTex(params) },
    { text: `So $k = ${params.side === 'left' ? params.p : params.q}$.` },
  ],
};

/* ---------- Lesson 3: the two shapes of answer ---------- */

/**
 * Which is the answer? Four sets built from the same two roots.
 *
 * Every distractor is one slip away: the other shape, the other kind of
 * endpoint, and the roots with their signs flipped — read straight off the
 * brackets. Pairs of roots that are each other's negatives are skipped,
 * since flipping them changes nothing.
 */
const whichSet: Generator<GraphParams> = {
  id: 'quad-ineq-which-set',
  sample: (rng, difficulty) => ({
    a: pickA(rng, difficulty, [1], [-1, -2, 2, 3]),
    ...drawRoots(rng, 6, 1, (p, q) => p + q !== 0),
    op: rng.pick(ALL_OPS),
    slot: rng.int(0, 3),
  }),
  render: (params): Slide => {
    const { a, p, q, op, slot } = params;
    const strict = isStrict(op);
    const between = isBetween(a, op);
    return choiceSlide(
      [
        { kind: 'prose', text: 'Which of these is the solution?' },
        { kind: 'display', tex: expandedTex(params) },
      ],
      answerTex(params),
      [setTex(p, q, strict, !between), setTex(p, q, !strict, between), setTex(-q, -p, strict, between)],
      slot,
    );
  },
  solution: (params) => [...rootsAndShape(params), { tex: answerTex(params) }],
};

/**
 * Make the $x^2$ term positive: multiply through by $-1$.
 *
 * The step that turns an upside-down question into a U-shaped one, and the
 * rule it rests on is the one learners know from linear inequalities and
 * forget here: multiplying by a negative number turns the sign round. Every
 * term changes sign too, so the bank holds the unchanged terms and the
 * unturned sign.
 */
const negate: Generator<IneqParams> = {
  id: 'quad-ineq-negate',
  sample: (rng, difficulty) => ({
    a: -pickA(rng, difficulty, [1], [1, 2, 3]),
    ...drawRoots(rng, 6, 1, (p, q) => p + q !== 0),
    op: rng.pick(ALL_OPS),
  }),
  render: (params): Slide => {
    const { a, op } = params;
    const { b, c } = coefficients(params);
    const answer = [signedTile(-b, 'x'), signedTile(-c), OP_TEX[FLIPPED[op]]];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Multiply every term by $-1$, so the $x^{2}$ term is positive. What does the inequality become?',
        },
        { kind: 'display', tex: expandedTex(params) },
      ],
      template: `${a === -1 ? 'x^2' : `${-a}x^2`} {0} {1} {2} 0`,
      bank: bankOf(answer, [signedTile(b, 'x'), signedTile(c), OP_TEX[op]]),
      answer,
    };
  },
  solution: (params) => {
    const { a, op } = params;
    const { b, c } = coefficients(params);
    return [
      { text: 'Multiplying by $-1$ changes the sign of every term.' },
      { tex: `${polyTex(-a, -b, -c)} \\quad ? \\quad 0` },
      {
        text: `And multiplying an inequality by a negative number turns it round: $${OP_TEX[op]}$ becomes $${OP_TEX[FLIPPED[op]]}$. Try it on $2 < 3$: times $-1$ gives $-2 > -3$.`,
      },
      { tex: `${polyTex(-a, -b, -c)} ${OP_TEX[FLIPPED[op]]} 0` },
      { text: 'Both say exactly the same thing about $x$, and the second is the U-shaped curve.' },
    ];
  },
};

/* ---------- Lesson 4: rearranging first ---------- */

interface RearrangeParams extends IneqParams {
  /** The x coefficient on the left before rearranging. */
  e: number;
}

/**
 * Bring everything to one side before reading anything off.
 *
 * $x^2 > 3x + 4$ cannot be solved where it stands: the roots and the shape
 * both belong to $x^2 - 3x - 4$. Every term crossing the sign changes sign,
 * and the bank holds the terms carried across unchanged and the inequality
 * turned round when nothing was multiplied by a negative.
 */
const rearrange: Generator<RearrangeParams> = {
  id: 'quad-ineq-rearrange',
  sample: (rng, difficulty) => {
    const a = pickA(rng, difficulty, [1], [1, 2]);
    const { p, q } = drawRoots(rng, 6, 1, (x, y) => x + y !== 0);
    const { b } = coefficients({ a, p, q });
    let e = difficulty > 1 ? rng.int(-5, 5) : 0;
    // The line on the right must keep its x term, or nothing crosses.
    while (difficulty > 1 && (e === 0 || e === b)) e += 1;
    return { a, p, q, op: rng.pick(ALL_OPS), e };
  },
  render: (params): Slide => {
    const { a, op, e } = params;
    const { b, c } = coefficients(params);
    const answer = [signedTile(b, 'x'), signedTile(c), OP_TEX[op]];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Before anything can be read off, every term has to be on one side. Rearrange so the right-hand side is $0$.',
        },
        { kind: 'display', tex: `${quadraticTex(a, e, 0)} ${OP_TEX[op]} ${linearTex(e - b, -c)}` },
      ],
      template: `${a === 1 ? 'x^2' : `${a}x^2`} {0} {1} {2} 0`,
      bank: bankOf(answer, [signedTile(-b, 'x'), signedTile(-c), OP_TEX[FLIPPED[op]]]),
      answer,
    };
  },
  solution: (params) => {
    const { a, op, e } = params;
    const { b, c } = coefficients(params);
    const m = e - b;
    return [
      {
        text: `Take $${linearTex(m, -c)}$ from both sides. Each term changes sign as it crosses: $${linearTex(m, 0)}$ becomes $${linearTex(-m, 0)}$ and $${-c}$ becomes $${c}$.`,
      },
      { tex: `${polyTex(a, b, c)} ${OP_TEX[op]} 0` },
      {
        text: 'The inequality sign stays as it is: adding or taking away the same thing on both sides never turns it round. Only multiplying or dividing by a negative does.',
      },
    ];
  },
};

interface AlwaysParams {
  a: number;
  b: number;
  c: number;
  op: Op;
}

const DISC_NEGATIVE = 'Yes, it is negative';
const DISC_NOT_NEGATIVE = 'No, it is not';
const CURVE_UP = 'U-shaped: $a > 0$';
const CURVE_DOWN = 'Upside down: $a < 0$';
const TRUE_ALWAYS = 'For every $x$';
const TRUE_NEVER = 'For no $x$ at all';

/**
 * A curve that never meets the axis: always true, or never.
 *
 * With a negative discriminant there are no roots to find, and the answer is
 * all or nothing — which way up the curve is decides which. Most draws are
 * built that way, from a vertex off the axis on the side the curve opens
 * towards; a third cross the axis, so the first fork is a real question.
 */
const alwaysFlow: Generator<AlwaysParams> = {
  id: 'quad-ineq-always',
  sample: (rng, difficulty) => {
    const a = pickA(rng, difficulty, [1, -1], [1, -1, 2, -2]);
    const op = rng.pick(ALL_OPS);
    if (rng.chance(1 / 3)) {
      const { p, q } = drawRoots(rng, 4, 1);
      return { a, ...coefficients({ a, p, q }), op };
    }
    // a(x - h)^2 + k, with k on the side the curve opens towards.
    const h = rng.int(-4, 4);
    const k = Math.sign(a) * rng.int(1, 6);
    return { a, b: -2 * a * h, c: a * h * h + k, op };
  },
  render: ({ a, b, c, op }): Slide => {
    const negative = b * b - 4 * a * c < 0;
    const holds = a > 0 !== asksBelow(op);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Before looking for roots, ask whether there are any. Work down the questions.',
        },
      ],
      subject: `${polyTex(a, b, c)} ${OP_TEX[op]} 0`,
      steps: [
        {
          id: 'disc',
          ask: 'Is the discriminant $b^{2} - 4ac$ negative?',
          branches: [
            { label: DISC_NEGATIVE, to: 'shape' },
            {
              label: DISC_NOT_NEGATIVE,
              outcome: 'The curve meets the axis, so the answer depends on $x$: find the roots and work from them.',
            },
          ],
        },
        {
          id: 'shape',
          ask: 'Then the curve never meets the axis. Which way up is it?',
          branches: [
            { label: CURVE_UP, to: 'up' },
            { label: CURVE_DOWN, to: 'down' },
          ],
        },
        {
          id: 'up',
          ask: 'So the whole curve sits above the axis. The inequality is true…',
          branches: [
            { label: TRUE_ALWAYS, outcome: 'Every value of $x$ satisfies it.' },
            { label: TRUE_NEVER, outcome: 'No value of $x$ satisfies it.' },
          ],
        },
        {
          id: 'down',
          ask: 'So the whole curve sits below the axis. The inequality is true…',
          branches: [
            { label: TRUE_ALWAYS, outcome: 'Every value of $x$ satisfies it.' },
            { label: TRUE_NEVER, outcome: 'No value of $x$ satisfies it.' },
          ],
        },
      ],
      answer: negative
        ? [DISC_NEGATIVE, a > 0 ? CURVE_UP : CURVE_DOWN, holds ? TRUE_ALWAYS : TRUE_NEVER]
        : [DISC_NOT_NEGATIVE],
    };
  },
  solution: ({ a, b, c, op }) => {
    const disc = b * b - 4 * a * c;
    const steps: SolutionStep[] = [
      { text: 'The discriminant says whether the curve meets the axis at all.' },
      { tex: `${bracketed(b)}^{2} - 4 \\times ${bracketed(a)} \\times ${bracketed(c)} = ${b * b} - ${bracketed(4 * a * c)} = ${disc}` },
    ];
    if (disc >= 0) {
      steps.push({
        text: `$${disc}$ is not negative, so the curve does meet the axis: the answer depends on $x$, and the roots are where to start.`,
      });
      return steps;
    }
    const holds = a > 0 !== asksBelow(op);
    steps.push(
      {
        text: `Negative, so there are no roots: the curve never touches the axis. The $x^{2}$ coefficient is ${
          a > 0 ? 'positive, so it sits entirely above it' : 'negative, so it sits entirely below it'
        }.`,
      },
      {
        text: `The inequality asks for ${asksBelow(op) ? 'below' : 'above'} the axis, so it is true for ${
          holds ? '**every** $x$' : '**no** $x$ at all'
        }.`,
      },
    );
    return steps;
  },
};

/* ---------- Lesson 5: inequalities on a parameter ---------- */

type RootCondition = 'two' | 'none' | 'real';

const CONDITION_TEXT: Record<RootCondition, string> = {
  two: 'two different real roots',
  none: 'no real roots',
  real: 'real roots (at least one)',
};

const CONDITION_OP: Record<RootCondition, Op> = { two: '>', none: '<', real: '>=' };

interface ParamDiscParams {
  a: number;
  c: number;
  condition: RootCondition;
}

/**
 * Turn "how many roots" into an inequality in $k$.
 *
 * The discriminant used as a condition: two roots is $b^2 - 4ac > 0$, none is
 * $< 0$, and "real roots" allows the repeated one, so $\ge 0$. With $k$ as the
 * $x$ coefficient the discriminant is $k^2 - 4ac$, and the bank holds $4ac$
 * added rather than taken away, and the signs for the neighbouring conditions.
 */
const paramDisc: Generator<ParamDiscParams> = {
  id: 'quad-ineq-param-disc',
  sample: (rng, difficulty) => ({
    a: pickA(rng, difficulty, [1, 2], [3, 4, 5]),
    c: rng.int(1, 10),
    condition: rng.pick(['two', 'none', 'real'] as const),
  }),
  render: ({ a, c, condition }): Slide => {
    const op = CONDITION_OP[condition];
    const answer = [signedTile(-4 * a * c), OP_TEX[op]];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `This equation has ${CONDITION_TEXT[condition]}. Write that as an inequality in $k$, using the discriminant.`,
        },
        { kind: 'display', tex: `${a === 1 ? '' : a}x^{2} + kx + ${c} = 0` },
      ],
      template: 'k^2 {0} {1} 0',
      bank: bankOf(answer, [signedTile(4 * a * c), signedTile(-a * c), OP_TEX[FLIPPED[op]], OP_TEX[TOGGLED[op]]]),
      answer,
    };
  },
  solution: ({ a, c, condition }) => {
    const op = CONDITION_OP[condition];
    return [
      { text: `Here $a = ${a}$, $b = k$ and $c = ${c}$, so the discriminant is` },
      { tex: `b^{2} - 4ac = k^{2} - 4 \\times ${a} \\times ${c} = k^{2} - ${4 * a * c}` },
      {
        text:
          condition === 'two'
            ? 'Two different roots need it strictly positive.'
            : condition === 'none'
              ? 'No real roots needs it negative.'
              : 'Real roots allows the repeated one, where it is zero, so it must be positive **or zero**.',
      },
      { tex: `k^{2} - ${4 * a * c} ${OP_TEX[op]} 0` },
    ];
  },
};

/**
 * Pairs $(a, c)$ with $ac$ a perfect square, so the critical values of $k$
 * are whole: $k^2 = 4ac$ at $k = \pm 2\sqrt{ac}$.
 */
const SQUARE_PAIRS_EASY: readonly [number, number][] = [
  [1, 1], [1, 4], [1, 9], [1, 16], [4, 1], [9, 1], [2, 2], [2, 8], [8, 2], [3, 3],
];
const SQUARE_PAIRS_HARD: readonly [number, number][] = [
  [1, 25], [1, 36], [4, 9], [9, 4], [2, 18], [18, 2], [3, 12], [12, 3], [5, 5], [4, 4], [16, 1],
];

interface ParamRangeParams {
  a: number;
  c: number;
  condition: RootCondition;
  /** Asked about the equation, or about the curve meeting the axis. */
  framing: 'equation' | 'curve';
  slot: number;
}

const CURVE_TEXT: Record<RootCondition, string> = {
  two: 'crosses the $x$-axis twice',
  none: 'never meets the $x$-axis',
  real: 'meets the $x$-axis at least once',
};

/**
 * The range of $k$, from four candidates.
 *
 * $k^2 > 36$ is a quadratic inequality in its own right, so this is the whole
 * level folded back on itself: the critical values are $\pm 6$, and the curve
 * $y = k^2 - 36$ is U-shaped, so "$> 0$" is the two pieces outside. The
 * slips are the other shape, the other kind of endpoint, and $\pm 36$ — the
 * square root never taken.
 */
const paramRange: Generator<ParamRangeParams> = {
  id: 'quad-ineq-param-range',
  sample: (rng, difficulty) => {
    const [a, c] = rng.pick(difficulty > 1 ? SQUARE_PAIRS_HARD : SQUARE_PAIRS_EASY);
    return {
      a,
      c,
      condition: rng.pick(['two', 'none', 'real'] as const),
      framing: rng.pick(['equation', 'curve'] as const),
      slot: rng.int(0, 3),
    };
  },
  render: ({ a, c, condition, framing, slot }): Slide => {
    const edge = 2 * Math.sqrt(a * c);
    const strict = condition !== 'real';
    const between = condition === 'none';
    const quad = `${a === 1 ? '' : a}x^{2} + kx + ${c}`;
    return choiceSlide(
      [
        {
          kind: 'prose',
          text:
            framing === 'equation'
              ? `For which values of $k$ does this equation have ${CONDITION_TEXT[condition]}?`
              : `For which values of $k$ does this curve ${CURVE_TEXT[condition]}?`,
        },
        { kind: 'display', tex: framing === 'equation' ? `${quad} = 0` : `y = ${quad}` },
      ],
      setTex(-edge, edge, strict, between, 'k'),
      [
        setTex(-edge, edge, strict, !between, 'k'),
        setTex(-edge, edge, !strict, between, 'k'),
        setTex(-4 * a * c, 4 * a * c, strict, between, 'k'),
      ],
      slot,
    );
  },
  solution: ({ a, c, condition }) => {
    const edge = 2 * Math.sqrt(a * c);
    const op = CONDITION_OP[condition];
    return [
      { text: `The discriminant is $k^{2} - 4 \\times ${a} \\times ${c} = k^{2} - ${4 * a * c}$, and ${CONDITION_TEXT[condition]} needs` },
      { tex: `k^{2} - ${4 * a * c} ${OP_TEX[op]} 0` },
      {
        text: `That is a quadratic inequality in $k$. Its critical values are where $k^{2} = ${4 * a * c}$: $k = -${edge}$ and $k = ${edge}$ — square roots, not $\\pm ${4 * a * c}$.`,
      },
      {
        text: `$y = k^{2} - ${4 * a * c}$ is U-shaped, so it is ${
          condition === 'none' ? 'below the axis between them' : 'above the axis outside them'
        }.`,
      },
      { tex: setTex(-edge, edge, condition !== 'real', condition === 'none', 'k') },
    ];
  },
};

interface CriticalParams {
  a: number;
  b: number;
  condition: RootCondition;
}

/** (a, b) with b^2 divisible by 4a, so the critical constant is whole. */
const CRITICAL_EASY: readonly [number, number][] = [2, 4, 6, 8, 10, 12].flatMap((b) => [
  [1, b],
  [1, -b],
] as [number, number][]);
const CRITICAL_HARD: readonly [number, number][] = [
  [2, 4], [2, -4], [2, 8], [2, -8], [2, 12], [2, -12], [3, 6], [3, -6], [3, 12], [3, -12], [4, 8], [4, -8],
];

/**
 * The value of the constant where the roots change.
 *
 * With $k$ as the constant term the discriminant is $b^2 - 4ak$, which is
 * linear in $k$: one critical value, $k = b^2 / 4a$, and the roots are real on
 * one side of it and not on the other. The slips are forgetting the 4, a
 * negative constant from misreading the sign, and half of $b$ never squared.
 */
const paramCritical: Generator<CriticalParams> = {
  id: 'quad-ineq-param-critical',
  choices: ({ a, b }) => {
    const critical = (b * b) / (4 * a);
    // Half of b is the number completing the square reaches for, and
    // squaring it is the step that gets forgotten.
    return numberChoices(critical, -critical, (b * b) / (2 * a), b / 2);
  },
  sample: (rng, difficulty) => {
    const [a, b] = rng.pick(difficulty > 1 ? CRITICAL_HARD : CRITICAL_EASY);
    return { a, b, condition: rng.pick(['two', 'none', 'real'] as const) };
  },
  render: ({ a, b, condition }): Slide => {
    const op = condition === 'two' ? '<' : condition === 'none' ? '>' : '\\le';
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `This equation has ${CONDITION_TEXT[condition]} exactly when $k ${op} K$. Find $K$.`,
        },
        { kind: 'display', tex: `${a === 1 ? '' : a}x^{2} ${signedTile(b, 'x')} + k = 0` },
      ],
      lead: 'K =',
      keypad: [],
      answer: `${(b * b) / (4 * a)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, condition }) => {
    const critical = (b * b) / (4 * a);
    return [
      { text: `Here $a = ${a}$, $b = ${b}$ and $c = k$, so the discriminant is` },
      { tex: `${bracketed(b)}^{2} - 4 \\times ${a} \\times k = ${b * b} - ${4 * a}k` },
      { text: 'The roots change where it is zero, so solve that for $k$.' },
      { tex: `${b * b} - ${4 * a}k = 0 \\implies k = \\frac{${b * b}}{${4 * a}} = ${critical}` },
      {
        text: `Bigger $k$ makes the discriminant smaller, so ${CONDITION_TEXT[condition]} ${
          condition === 'none' ? `means $k > ${critical}$` : condition === 'two' ? `means $k < ${critical}$` : `means $k \\le ${critical}$`
        }. So $K = ${critical}$.`,
      },
    ];
  },
};

export const inequalityGenerators = [
  readGraph,
  testPoint,
  endSlider,
  countIntegers,
  betweenTiles,
  outsideTiles,
  regionFlow,
  endpoint,
  whichSet,
  negate,
  rearrange,
  alwaysFlow,
  paramDisc,
  paramRange,
  paramCritical,
] as unknown as Generator<unknown>[];
