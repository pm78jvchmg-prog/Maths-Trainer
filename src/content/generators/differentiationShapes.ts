/**
 * Differentiation, asked through the widgets the course never used.
 *
 * Every generator in `differentiation.ts` renders an `expression` slide, and
 * the derived `+choice` forms render a `choice`. Two shapes for eleven
 * lessons is what the owner meant by "the same question over and over": a
 * deck of seven typed derivatives varies its numbers and nothing else.
 *
 * So these ask the same calculus through the widgets that show *working*
 * rather than a final answer — tiles for the pieces of a rule, a tree for a
 * gradient worked out in stages, a slider for a gradient you can see. They
 * are deliberately not second copies of the typed questions: each one grades
 * a step the typed form takes for granted, which is why a lesson can hold
 * both without repeating itself.
 *
 * Two rules from `CLAUDE.md` bite hard in this file and are worth restating:
 *
 * - A tiles **template** is split on `{0}`, `{1}`, … and each literal piece
 *   between the blanks is rendered as TeX on its own. So braces round a digit
 *   anywhere in a template are read as a blank marker — `x^{2}` becomes a
 *   slot — and a `\frac{` opening before a blank leaves an unmatched fragment.
 *   So the templates here carry no powers and no fractions at all: anything
 *   with either goes in the prompt, where it is rendered whole. That also
 *   keeps a template short enough not to wrap on a phone, which strands the
 *   last blank on a row of its own. Bank *tokens* are rendered whole too, so
 *   they keep their braces.
 * - Every backslash is doubled in source. A single one collapses silently and
 *   the learner reads the word "quad" in the middle of a formula.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import { parabolaSvg } from '../figures';
import { termTex, sumTex } from './calculus';

/** A non-zero integer, for sampling where 0 would make a degenerate question. */
function nonZero(value: number, fallback: number): number {
  return value === 0 ? fallback : value;
}

/**
 * The answer's tokens, plus the distractors that are not already among them.
 *
 * Sorted rather than shuffled: `render` has no rng, and a bank whose order
 * varied between draws of the same question would defeat the deck
 * de-duplicator. Sorting also keeps the answers from sitting at the front,
 * where they would be the first tiles a learner reaches for.
 */
function bankOf(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  return [...answer, ...extras].sort();
}

/**
 * The same, for a tree, where the tokens are numbers.
 *
 * Sorted numerically rather than as strings: a bank running -12, -2, 10, 2
 * reads as a mistake, and the sort is only there to keep the answers from
 * clustering at the front.
 *
 * Each distractor below is built from the question's own numbers, so it lands
 * on a value the tree already holds far more often than it looks like it will:
 * a gradient tree whose bracket happened to equal its product dropped four of
 * its five. A bank that is the answer and one spare is not a question — the
 * odd one out can be placed without doing any of the arithmetic — so the floor
 * is topped up with the values either side of the answer, which is what a slip
 * of one actually produces.
 */
const MIN_DISTRACTORS = 3;

function valueBank(answer: number[], distractors: number[]): string[] {
  const needed = new Set(answer);
  const extras: number[] = [];
  const add = (value: number) => {
    if (needed.has(value) || extras.includes(value)) return;
    extras.push(value);
  };
  for (const value of distractors) add(value);
  for (let step = 1; extras.length < MIN_DISTRACTORS; step += 1) {
    for (const value of answer) {
      add(value + step);
      add(value - step);
      if (extras.length >= MIN_DISTRACTORS) break;
    }
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

/** A number as it should read inside a product: negatives get brackets. */
function bracketed(value: number): string {
  return value < 0 ? `\\left(${value}\\right)` : `${value}`;
}

/** A power of $x$ written the way a bank token should be. */
function powerToken(power: number): string {
  if (power === 0) return '1';
  return power === 1 ? 'x' : `x^{${power}}`;
}

/* ---------- Level 1: assembling a derivative from its two pieces ---------- */

interface PowerTilesParams {
  a: number;
  n: number;
}

/**
 * The power rule split into the two things it actually does.
 *
 * `power-rule` asks for the whole derivative typed out, and a learner who
 * multiplies correctly but forgets to reduce the power gets one verdict:
 * wrong. Here the multiplier and the surviving power are separate tiles, so
 * the half that went astray is the half that is left empty — and the bank
 * offers the coefficient un-multiplied and the power un-reduced side by side,
 * which is the pair of slips the rule exists to prevent.
 */
const powerTiles: Generator<PowerTilesParams> = {
  id: 'df-power-tiles',
  sample: (rng, difficulty) =>
    difficulty >= 2 ? { a: rng.int(2, 12), n: rng.int(4, 9) } : { a: rng.int(2, 9), n: rng.int(2, 7) },
  render: ({ a, n }): Slide => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: 'Build the derivative from two tiles: the number that multiplies, and the power of $x$ that is left behind.',
      },
      { kind: 'display', tex: `y = ${termTex(a, n)}` },
    ],
    template: '\\frac{dy}{dx} = {0}{1}',
    bank: bankOf(
      [`${a * n}`, powerToken(n - 1)],
      [`${a}`, `${a + n}`, `${a * (n - 1)}`, powerToken(n), powerToken(n + 1)],
    ),
    answer: [`${a * n}`, powerToken(n - 1)],
  }),
  solution: ({ a, n }): SolutionStep[] => [
    {
      text: 'The power rule does two separate things, and each tile is one of them.',
      tex: '\\frac{d}{dx}\\left(ax^{n}\\right) = anx^{n-1}',
    },
    {
      text: `The power comes down and multiplies what is already there: $${a} \\times ${n} = ${a * n}$.`,
      tex: `a n = ${a} \\times ${n} = ${a * n}`,
    },
    {
      text: `Only then does the power drop by one, from $${n}$ to $${n - 1}$.`,
      tex: `n - 1 = ${n} - 1 = ${n - 1}`,
    },
    {
      text: 'Putting the two together:',
      tex: `\\frac{dy}{dx} = ${termTex(a * n, n - 1)}`,
    },
    {
      text: `Leaving the power alone would give $${termTex(a * n, n)}$, and forgetting to multiply would give $${termTex(a, n - 1)}$. Both are in the bank, and both are wrong by exactly one half of the rule.`,
    },
  ],
};

/* ---------- Level 1: rewriting into index form before differentiating ---------- */

interface IndexRewriteParams {
  a: number;
  n: number;
}

/**
 * The rewrite that has to happen before the power rule can be used at all.
 *
 * `df-index-form` asks for the finished derivative of $a/x^{n}$, which folds
 * two steps into one typed answer: turning the fraction into a negative power,
 * and then differentiating it. A learner who gets that wrong cannot tell which
 * of the two failed. Here both steps are tiles on the same line, so the answer
 * says where it went wrong — and the bank carries the positive power, which is
 * what the fraction looks like if you read it without thinking.
 */
const indexRewrite: Generator<IndexRewriteParams> = {
  id: 'df-index-rewrite',
  sample: (rng, difficulty) =>
    difficulty >= 2 ? { a: rng.int(2, 12), n: rng.int(2, 6) } : { a: rng.int(1, 9), n: rng.int(1, 4) },
  render: ({ a, n }): Slide => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: 'A fraction with $x$ underneath has to become a power of $x$ before the power rule can touch it. Fill in the rewrite, then its derivative.',
      },
      { kind: 'display', tex: `y = \\frac{${a}}{${n === 1 ? 'x' : `x^{${n}}`}}` },
    ],
    template: 'y = {0} \\quad \\Rightarrow \\quad \\frac{dy}{dx} = {1}',
    bank: bankOf(
      [termTex(a, -n), termTex(-a * n, -(n + 1))],
      [
        termTex(a, n),
        termTex(a * n, -(n + 1)),
        termTex(-a, -(n + 1)),
        termTex(-a * n, -n),
      ],
    ),
    answer: [termTex(a, -n), termTex(-a * n, -(n + 1))],
  }),
  solution: ({ a, n }): SolutionStep[] => [
    {
      text: 'Underneath the line means a negative power. Nothing about the fraction changes except how it is written.',
      tex: `\\frac{${a}}{${n === 1 ? 'x' : `x^{${n}}`}} = ${termTex(a, -n)}`,
    },
    {
      text: `Now the power rule applies as usual: multiply by the power $${-n}$, then reduce it by one.`,
      tex: `${a} \\times \\left(${-n}\\right) = ${-a * n}, \\quad ${-n} - 1 = ${-(n + 1)}`,
    },
    {
      text: 'So the derivative in index form is:',
      tex: `\\frac{dy}{dx} = ${termTex(-a * n, -(n + 1))}`,
    },
    {
      text: `Reducing a negative power moves it further from zero, never closer — $${-n}$ went to $${-(n + 1)}$. The bank's $${termTex(-a * n, -n)}$ is the same multiplication with that step skipped.`,
    },
  ],
};

/* ---------- Level 1: a gradient worked out in stages ---------- */

interface GradientTreeParams {
  a: number;
  b: number;
  t: number;
}

/**
 * Substituting into a derivative, laid out as the tree the arithmetic really is.
 *
 * `evaluate-derivative` asks for the number at the end, and every order of
 * working produces the same typed answer, so the order is invisible. The tree
 * makes it the question: the two pieces on the top row are the ones that can
 * be done straight away, and neither of the rows below can be filled until
 * they are.
 *
 * $f(x) = ax^{3} + bx^{2}$ is deliberately only two terms, so the tree stays
 * four nodes and fits a phone in one row of two.
 */
const gradientTree: Generator<GradientTreeParams> = {
  id: 'df-gradient-tree',
  sample: (rng, difficulty) =>
    difficulty >= 2
      ? { a: rng.int(1, 5), b: nonZero(rng.int(-6, 6), 3), t: nonZero(rng.int(-4, 4), -2) }
      : { a: rng.int(1, 4), b: rng.int(1, 5), t: rng.int(1, 4) },
  render: ({ a, b, t }): Slide => {
    const square = t * t;
    const linear = 2 * b * t;
    const cubicTerm = 3 * a * square;
    const total = cubicTerm + linear;

    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The derivative of $f(x) = ${sumTex([termTex(a, 3), termTex(b, 2)])}$ has been found and $x = ${t}$ put into it. Fill the tree: the top row is what can be done straight away.`,
        },
      ],
      expression: `f'(${t}) = ${3 * a} \\times ${bracketed(t)}^{2} + ${bracketed(2 * b)} \\times ${bracketed(t)}`,
      nodes: [
        { id: 'square', from: [] },
        { id: 'linear', from: [] },
        { id: 'cubicTerm', from: ['square'] },
        { id: 'total', from: ['cubicTerm', 'linear'] },
      ],
      bank: valueBank(
        [square, linear, cubicTerm, total],
        [2 * t, 3 * a * t, a * square, cubicTerm - linear, square + linear],
      ),
      answer: [square, linear, cubicTerm, total].map(String),
    };
  },
  solution: ({ a, b, t }): SolutionStep[] => {
    const square = t * t;
    const linear = 2 * b * t;
    const cubicTerm = 3 * a * square;
    return [
      {
        text: 'Differentiate first, term by term, and leave the answer as a function of $x$.',
        tex: `f'(x) = ${sumTex([termTex(3 * a, 2), termTex(2 * b, 1)])}`,
      },
      {
        text: `The power is taken before the multiplication, so $${t}$ is squared on its own first.`,
        tex: `${bracketed(t)}^{2} = ${square}`,
      },
      {
        text: 'That, and the other product, are the two nodes on the top row.',
        tex: `${3 * a} \\times ${square} = ${cubicTerm}, \\quad ${bracketed(2 * b)} \\times ${bracketed(t)} = ${linear}`,
      },
      {
        text: 'Only once both are known does the addition at the bottom have anything to add.',
        tex: `f'(${t}) = ${cubicTerm} + ${bracketed(linear)} = ${cubicTerm + linear}`,
      },
      {
        text:
          t < 0
            ? `$${t}$ is negative, but squaring it gives the positive $${square}$ — carrying the minus sign through the square is the slip the top row is there to catch.`
            : `Multiplying $${3 * a}$ in before squaring would square it too, giving $${(3 * a * t) ** 2}$ rather than $${cubicTerm}$.`,
      },
    ];
  },
};

/* ---------- Level 1: finding a flat tangent by eye ---------- */

interface StationaryParams {
  a: number;
  v: number;
  c: number;
}

/**
 * Where the gradient is zero, answered by dragging to it on the curve.
 *
 * Every other question in this level turns a derivative into symbols or a
 * number. This one asks what a derivative of zero *looks like*, and the
 * figure is the point: the handle carries a line across the curve, and the
 * learner stops where the curve stops climbing. Solving $f'(x) = 0$ gets
 * there too, and the worked solution does it that way.
 *
 * The curve is a parabola with $a = \pm 1$ so that the drawing keeps its
 * shape inside the window, and the turning point is sampled as a whole
 * number: a slider answer between two steps is unanswerable rather than hard.
 */
const stationarySlider: Generator<StationaryParams> = {
  id: 'df-stationary-slider',
  sample: (rng, difficulty) => ({
    a: rng.pick([1, -1]),
    v: rng.int(-4, 4),
    c: difficulty >= 2 ? rng.int(-9, 9) : rng.int(-5, 5),
  }),
  render: ({ a, v, c }): Slide => {
    const b = -2 * a * v;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'One point on this curve has a horizontal tangent. Work out where its gradient is zero, and slide to that value of $x$.',
        },
        { kind: 'display', tex: `y = ${sumTex([termTex(a, 2), termTex(b, 1), termTex(c, 0)])}` },
      ],
      min: -5,
      max: 5,
      step: 1,
      answer: v,
      readout: 'x = {v}',
      figure: {
        svg: parabolaSvg(a, b, c, {
          xMin: -5,
          xMax: 5,
          label: 'A curve with one horizontal tangent',
        }),
        xMin: -5,
        xMax: 5,
      },
    };
  },
  solution: ({ a, v, c }): SolutionStep[] => {
    const b = -2 * a * v;
    return [
      {
        text: 'A horizontal tangent is a gradient of zero, so differentiate and set the result to zero.',
        tex: `\\frac{dy}{dx} = ${sumTex([termTex(2 * a, 1), termTex(b, 0)])}`,
      },
      {
        text: 'Solving that equation gives the one $x$ where the curve stops rising or falling.',
        tex: `${sumTex([termTex(2 * a, 1), termTex(b, 0)])} = 0 \\quad \\Rightarrow \\quad x = ${v}`,
      },
      {
        text: `Moving $c$ slides the whole curve up or down without moving that point, which is why $${c}$ never appears in the working.`,
      },
      {
        text:
          a > 0
            ? 'The curve opens upwards, so this is its lowest point: the gradient is negative to its left and positive to its right.'
            : 'The curve opens downwards, so this is its highest point: the gradient is positive to its left and negative to its right.',
      },
    ];
  },
};

/* ---------- Level 2: the four pieces of the product rule ---------- */

interface ProductPiecesParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * The product rule with the two derivatives left blank.
 *
 * `product-rule` asks for the expanded answer, where a slip in $u'$ and a
 * slip in the expansion look identical on the page. The rule's own shape is
 * printed here and only the two derivatives are missing, so this grades the
 * step the solution to `product-rule` says to do first: write all four pieces
 * down before assembling anything.
 */
const productPieces: Generator<ProductPiecesParams> = {
  id: 'df-product-tiles',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty >= 2 ? 5 : 3),
    b: rng.int(1, 5) * (difficulty >= 2 ? rng.sign() : 1),
    c: rng.int(1, difficulty >= 2 ? 4 : 2),
    d: rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1),
  }),
  render: ({ a, b, c, d }): Slide => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 2), termTex(d, 0)]);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The product rule is already written out. Fill in the two derivatives it needs: $u\'$ first, then $v\'$.',
        },
        {
          kind: 'display',
          tex: `y = \\left(${u}\\right)\\left(${v}\\right)`,
        },
        // The assembled rule stays in the prompt rather than in the template.
        // A template carrying both brackets *and* both blanks wraps on a
        // phone, and a wrapped tiles line puts the second slot on a row of its
        // own with the operator stranded at the end of the first.
        {
          kind: 'display',
          tex: `\\frac{dy}{dx} = u'\\left(${v}\\right) + \\left(${u}\\right)v'`,
        },
      ],
      template: "u' = {0}, \\quad v' = {1}",
      bank: bankOf(
        [`${a}`, termTex(2 * c, 1)],
        [`${b}`, `${a + b}`, `${2 * c}`, termTex(c, 1), termTex(2 * c, 2), termTex(a, 1)],
      ),
      answer: [`${a}`, termTex(2 * c, 1)],
    };
  },
  solution: ({ a, b, c, d }): SolutionStep[] => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 2), termTex(d, 0)]);
    return [
      {
        text: 'Each factor is differentiated in turn while the other is left alone.',
        tex: "\\frac{d}{dx}(uv) = u'v + uv'",
      },
      {
        text: `$u = ${u}$ differentiates to the coefficient of $x$, and the constant $${b}$ contributes nothing.`,
        tex: `u' = ${a}`,
      },
      {
        text: `$v = ${v}$ needs the power rule: the $${c === 1 ? '' : c}x^{2}$ brings its power down.`,
        tex: `v' = ${termTex(2 * c, 1)}`,
      },
      {
        text: 'Which is what fills the two slots:',
        tex: `\\frac{dy}{dx} = ${a}\\left(${v}\\right) + \\left(${u}\\right)\\left(${termTex(2 * c, 1)}\\right)`,
      },
      {
        text: `The bank offers $${termTex(c, 1)}$, which is $v$ with its power dropped but never multiplied — half of the power rule, the half that is easiest to leave out.`,
      },
    ];
  },
};

/* ---------- Level 2: a product-rule gradient at a point ---------- */

interface ProductTreeParams {
  a: number;
  b: number;
  c: number;
  d: number;
  t: number;
}

/**
 * $u'v + uv'$ evaluated at a point, one bracket at a time.
 *
 * The product rule's two terms are genuinely independent until the very last
 * step, and a tree is the only widget in the app that can show that: the top
 * row holds the two bracket values, the middle row the two products built
 * from them, and nothing joins until the bottom. A learner who multiplies the
 * two derivatives together — the classic wrong move — has no node to put the
 * result in.
 */
const productTree: Generator<ProductTreeParams> = {
  id: 'df-product-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const a = rng.int(2, hard ? 5 : 4);
      const b = rng.int(1, 6) * (hard ? rng.sign() : 1);
      const c = rng.int(2, hard ? 5 : 4);
      const d = rng.int(1, 6) * (hard ? rng.sign() : 1);
      const t = hard ? nonZero(rng.int(-3, 3), 2) : rng.int(1, 3);
      // A zero bracket collapses one whole branch of the tree to nothing,
      // which leaves the learner a node with no arithmetic in it.
      if (a * t + b !== 0 && c * t + d !== 0) return { a, b, c, d, t };
    }
  },
  render: ({ a, b, c, d, t }): Slide => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 1), termTex(d, 0)]);
    const uAt = a * t + b;
    const vAt = c * t + d;
    const first = a * vAt;
    const second = uAt * c;

    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The product rule is already applied to $y = \\left(${u}\\right)\\left(${v}\\right)$. Fill the tree for the gradient at $x = ${t}$: brackets first, then the two products, then the sum.`,
        },
      ],
      // No "at x = t" tail here: the prompt has just said it, and the line is
      // already at the width a phone can show without scrolling sideways.
      expression: `\\frac{dy}{dx} = ${a}\\left(${v}\\right) + \\left(${u}\\right)${c}`,
      nodes: [
        { id: 'vAt', from: [] },
        { id: 'uAt', from: [] },
        { id: 'first', from: ['vAt'] },
        { id: 'second', from: ['uAt'] },
        { id: 'total', from: ['first', 'second'] },
      ],
      bank: valueBank(
        [vAt, uAt, first, second, first + second],
        [a * c, first - second, uAt * vAt, a * uAt, c * vAt],
      ),
      answer: [vAt, uAt, first, second, first + second].map(String),
    };
  },
  solution: ({ a, b, c, d, t }): SolutionStep[] => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 1), termTex(d, 0)]);
    const uAt = a * t + b;
    const vAt = c * t + d;
    const first = a * vAt;
    const second = uAt * c;
    return [
      {
        text: `Both brackets are evaluated at $x = ${t}$ before anything is multiplied.`,
        tex: `${v} = ${vAt}, \\quad ${u} = ${uAt}`,
      },
      {
        text: 'Each term of the product rule keeps one bracket whole and one differentiated.',
        tex: `u'v = ${a} \\times ${bracketed(vAt)} = ${first}`,
      },
      { tex: `uv' = ${bracketed(uAt)} \\times ${c} = ${second}` },
      {
        text: 'Only at the last step do the two terms meet.',
        tex: `\\left.\\frac{dy}{dx}\\right|_{x=${t}} = ${first} + ${bracketed(second)} = ${first + second}`,
      },
      {
        text: `Multiplying the two derivatives instead would give $${a} \\times ${c} = ${a * c}$, which is in the bank and belongs to no node — there is no branch of this tree where the derivatives ever meet each other.`,
      },
    ];
  },
};

/* ---------- Level 2: the order the quotient rule cares about ---------- */

interface QuotientPiecesParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** A factor written the way it reads: a coefficient of 1 is left off. */
function factorTex(coefficient: number, inner: string): string {
  if (coefficient === 1) return `(${inner})`;
  if (coefficient === -1) return `-(${inner})`;
  return `${coefficient}(${inner})`;
}

/**
 * The quotient rule's numerator, where the two terms cannot be swapped.
 *
 * The product rule is symmetric and this one is not, which is the single
 * thing about it worth practising and the single thing a typed answer hides:
 * a learner who writes the numerator backwards gets a sign error at the end
 * and no clue where it came from. Here both terms are on offer and the
 * subtraction is already printed, so putting them the wrong way round is
 * exactly the mistake the slide is asking about.
 */
const quotientPieces: Generator<QuotientPiecesParams> = {
  id: 'df-quotient-tiles',
  sample: (rng, difficulty) => {
    // ad - bc = 0 makes the function a constant, whose derivative has nothing
    // in it to get right — the same guard `quotient-rule` samples under.
    for (;;) {
      const a = rng.int(1, difficulty >= 2 ? 5 : 3);
      const b = rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1);
      const c = rng.int(1, difficulty >= 2 ? 4 : 2);
      const d = rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1);
      if (a * d - b * c !== 0) return { a, b, c, d };
    }
  },
  render: ({ a, b, c, d }): Slide => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 1), termTex(d, 0)]);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The numerator of the quotient rule is $u\'v - uv\'$, and the order of those two terms is not negotiable. Place them.',
        },
        { kind: 'display', tex: `y = \\frac{${u}}{${v}}` },
        // Where the numerator is going, kept out of the template for the same
        // reason the product rule's is: a template holding the fraction as
        // well as both terms wraps on a phone.
        {
          kind: 'display',
          tex: `\\frac{dy}{dx} = \\frac{N}{\\left(${v}\\right)^{2}}`,
        },
      ],
      template: 'N = {0} - {1}',
      bank: bankOf(
        [factorTex(a, v), factorTex(c, u)],
        [factorTex(c, v), factorTex(a, u), factorTex(b, v), factorTex(d, u)],
      ),
      answer: [factorTex(a, v), factorTex(c, u)],
    };
  },
  solution: ({ a, b, c, d }): SolutionStep[] => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 1), termTex(d, 0)]);
    return [
      {
        text: 'The derivative of the top comes first, and the whole thing sits over the denominator squared.',
        tex: "\\frac{d}{dx}\\left(\\frac{u}{v}\\right) = \\frac{u'v - uv'}{v^{2}}",
      },
      {
        text: 'Write the four pieces down before assembling anything.',
        tex: `u = ${u}, \\quad v = ${v}, \\quad u' = ${a}, \\quad v' = ${c}`,
      },
      {
        text: `So $u'v$ is $${a}$ times the *bottom*, and $uv'$ is the *top* times $${c}$ — each term pairs a derivative with the other function, never with its own.`,
        tex: `N = ${factorTex(a, v)} - ${factorTex(c, u)}`,
      },
      {
        text: `Swapping them negates the whole numerator: the $x$ terms still cancel, but $${a * d - b * c}$ comes out as $${b * c - a * d}$, and nothing later in the working would show it.`,
        tex: `\\frac{dy}{dx} = \\frac{${a * d - b * c}}{\\left(${v}\\right)^{2}}`,
      },
    ];
  },
};

/* ---------- Level 3: the two numbers the chain rule needs ---------- */

interface ChainPiecesParams {
  a: number;
  b: number;
  n: number;
}

/**
 * The chain rule with the outer power and the inner derivative left blank.
 *
 * Forgetting the inner derivative is the whole failure mode of the chain
 * rule, and `chain-rule` can only report it as a wrong answer. With the
 * structure printed and both numbers missing, the second slot is visibly
 * empty until the learner has asked what was inside the bracket — which is
 * the question the rule is.
 */
const chainPieces: Generator<ChainPiecesParams> = {
  id: 'df-chain-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const a = rng.int(2, hard ? 9 : 7);
      const n = hard ? rng.int(4, 6) : rng.int(3, 5);
      // a = n would put one number in both slots, so a learner could fill them
      // from a single reading and never separate the two ideas.
      if (a !== n) {
        return { a, b: nonZero(rng.int(hard ? -9 : -6, hard ? 9 : 6), 4), n };
      }
    }
  },
  render: ({ a, b, n }): Slide => {
    const inner = sumTex([termTex(a, 1), termTex(b, 0)]);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Differentiate the outside, then multiply by the derivative of the inside. Both of those numbers are missing.',
        },
        { kind: 'display', tex: `y = \\left(${inner}\\right)^{${n}}` },
      ],
      template: `\\frac{dy}{dx} = {0}(${inner})^${n - 1} \\times {1}`,
      bank: bankOf(
        [`${n}`, `${a}`],
        [`${n - 1}`, `${a * n}`, `${b}`, '1', `${a + b}`],
      ),
      answer: [`${n}`, `${a}`],
    };
  },
  solution: ({ a, b, n }): SolutionStep[] => {
    const inner = sumTex([termTex(a, 1), termTex(b, 0)]);
    return [
      {
        text: 'Treat the bracket as a single object, differentiate the power, then come back for what was inside.',
        tex: "\\frac{d}{dx}f(g(x)) = f'(g(x)) \\cdot g'(x)",
      },
      {
        text: `The outside is a power of ${n}, so it comes down as a multiplier and the power drops to ${n - 1}.`,
        tex: `${n}\\left(${inner}\\right)^{${n - 1}}`,
      },
      {
        text: `The inside is $u = ${inner}$, and its derivative is the coefficient of $x$ — the constant $${b}$ contributes nothing.`,
        tex: `\\frac{du}{dx} = ${a}`,
      },
      {
        text: 'Both slots filled:',
        tex: `\\frac{dy}{dx} = ${n}\\left(${inner}\\right)^{${n - 1}} \\times ${a} = ${termTex(a * n, 0)}\\left(${inner}\\right)^{${n - 1}}`,
      },
      {
        text: `Leaving the second slot at $1$ is what "forgetting the chain rule" looks like written down — the answer would be out by a factor of $${a}$ everywhere.`,
      },
    ];
  },
};

/* ---------- Level 3: a chain-rule gradient, stage by stage ---------- */

interface ChainTreeParams {
  a: number;
  b: number;
  n: number;
  t: number;
}

/**
 * $n(ax + b)^{n-1} \times a$ at a point, worked from the inside out.
 *
 * A chain of four nodes rather than a branching tree, which is the shape of
 * the rule itself: the bracket has to be evaluated before it can be raised to
 * a power, and that power before either multiplier is applied. Every node has
 * exactly one parent, so the picture is a ladder and the learner climbs it.
 */
const chainTree: Generator<ChainTreeParams> = {
  id: 'df-chain-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const a = rng.int(2, hard ? 5 : 4);
    const t = hard ? rng.pick([-2, -1, 1, 2, 3]) : rng.int(1, 3);
    // The bracket's value is sampled and `b` derived from it, so the
    // intermediate powers stay small enough to be worth working out by hand.
    const inner = hard ? rng.pick([2, 3, 4, 5, -2, -3]) : rng.pick([2, 3, 4, -2, -3]);
    return { a, b: inner - a * t, n: hard ? rng.pick([3, 4]) : 3, t };
  },
  render: ({ a, b, n, t }): Slide => {
    const innerTex = sumTex([termTex(a, 1), termTex(b, 0)]);
    const inner = a * t + b;
    const raised = inner ** (n - 1);
    const scaled = n * raised;
    const total = scaled * a;

    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The chain rule has already been applied to $y = \\left(${innerTex}\\right)^{${n}}$. Find the gradient at $x = ${t}$: the bracket first, then its power, then the two multipliers.`,
        },
      ],
      // Same as the product tree: the "at x = t" is in the prompt, and a phone
      // has no width to spare for saying it twice.
      expression: `\\frac{dy}{dx} = ${n}\\left(${innerTex}\\right)^{${n - 1}} \\times ${a}`,
      nodes: [
        { id: 'inner', from: [] },
        { id: 'raised', from: ['inner'] },
        { id: 'scaled', from: ['raised'] },
        { id: 'total', from: ['scaled'] },
      ],
      bank: valueBank(
        [inner, raised, scaled, total],
        [inner ** n, inner * n, raised * a, scaled + a, n * a],
      ),
      answer: [inner, raised, scaled, total].map(String),
    };
  },
  solution: ({ a, b, n, t }): SolutionStep[] => {
    const innerTex = sumTex([termTex(a, 1), termTex(b, 0)]);
    const inner = a * t + b;
    const raised = inner ** (n - 1);
    const scaled = n * raised;
    return [
      {
        text: `Start inside the bracket, with $x = ${t}$.`,
        tex: `${innerTex} = ${inner}`,
      },
      {
        text: `Raise that to the reduced power, ${n - 1}.`,
        tex: `${bracketed(inner)}^{${n - 1}} = ${raised}`,
      },
      {
        text: `Now the power that came down from outside.`,
        tex: `${n} \\times ${raised} = ${scaled}`,
      },
      {
        text: 'And finally the derivative of the inside, which is the multiplier the chain rule exists to remember.',
        tex: `${scaled} \\times ${a} = ${scaled * a}`,
      },
      {
        text: `Raising the bracket to $${n}$ rather than $${n - 1}$ gives $${inner ** n}$, which is in the bank and one power too many — the outside was differentiated, so its power must already have dropped.`,
      },
    ];
  },
};

/* ---------- Level 4: the standard derivatives, as a pair of tiles ---------- */

interface StandardParams {
  form: 'sin' | 'cos' | 'exp' | 'ln';
  a: number;
  k: number;
}

/**
 * $\sin$, $\cos$, $e^{kx}$ and $\ln(kx)$, split into what changes and what carries.
 *
 * Two things happen at once in every one of these: the function turns into a
 * different function (or stays put), and a factor of $k$ appears from the
 * chain rule. `trig-derivative` and `exp-log-derivative` ask for both in one
 * typed answer. Separating them into a coefficient tile and a function tile
 * puts the minus sign of $\cos$ and the missing $k$ in different slots, so a
 * learner can be right about one and wrong about the other.
 */
const standardTiles: Generator<StandardParams> = {
  id: 'df-standard-tiles',
  sample: (rng, difficulty) => ({
    form: rng.pick(['sin', 'cos', 'exp', 'ln'] as const),
    // Never 1: a coefficient tile reading "1" in front of a function is not
    // how anyone writes it, and the slide would be teaching bad notation.
    a: difficulty >= 2 ? rng.int(2, 12) : rng.int(2, 9),
    k: difficulty >= 2 ? rng.int(2, 9) : rng.int(2, 6),
  }),
  render: ({ form, a, k }): Slide => {
    const kx = termTex(k, 1);
    const subject =
      form === 'exp'
        ? `${a}e^{${kx}}`
        : form === 'ln'
          ? `${a}\\ln\\left(${kx}\\right)`
          : `${a}\\${form}\\left(${kx}\\right)`;

    const coefficient = form === 'ln' ? `${a}` : form === 'cos' ? `-${a * k}` : `${a * k}`;
    const fn =
      form === 'ln'
        ? '\\frac{1}{x}'
        : form === 'exp'
          ? `e^{${kx}}`
          : `\\${form === 'sin' ? 'cos' : 'sin'}\\left(${kx}\\right)`;

    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Two tiles: what the function becomes, and what multiplies it once the chain rule has been applied to the inside.',
        },
        { kind: 'display', tex: `y = ${subject}` },
      ],
      template: '\\frac{dy}{dx} = {0}{1}',
      // The distractors are the two halves of the question gone wrong: a
      // coefficient with the chain rule's k left out or its sign dropped, and
      // the function left as it was rather than differentiated.
      bank: bankOf(
        [coefficient, fn],
        [
          `${a * k}`,
          `-${a * k}`,
          `${a}`,
          `${k}`,
          form === 'ln'
            ? `\\frac{${k}}{x}`
            : form === 'exp'
              ? 'e^{x}'
              : `\\${form}\\left(${kx}\\right)`,
          form === 'ln' ? `\\frac{1}{${kx}}` : '\\frac{1}{x}',
        ],
      ),
      answer: [coefficient, fn],
    };
  },
  solution: ({ form, a, k }): SolutionStep[] => {
    const kx = termTex(k, 1);
    if (form === 'ln') {
      return [
        {
          text: 'The derivative of a logarithm is one over its argument, multiplied by the derivative of that argument.',
          tex: `\\frac{d}{dx}\\ln(u) = \\frac{1}{u} \\cdot \\frac{du}{dx}`,
        },
        {
          text: `Here $u = ${kx}$, so the two $${k}$s cancel and the $k$ never survives.`,
          tex: `\\frac{${k}}{${kx}} = \\frac{1}{x}`,
        },
        {
          text: 'So only the outer coefficient is left:',
          tex: `\\frac{dy}{dx} = \\frac{${a}}{x}`,
        },
        {
          text: `This is the one standard derivative where the inner $${k}$ does *not* appear in the answer, which is why $\\frac{${k}}{x}$ is on offer.`,
        },
      ];
    }
    const becomes =
      form === 'sin'
        ? '\\cos'
        : form === 'cos'
          ? '-\\sin'
          : 'e^{u}';
    return [
      {
        text: 'The outside gives a standard derivative, and the inside gives a multiplier.',
        tex:
          form === 'exp'
            ? '\\frac{d}{dx}e^{u} = e^{u} \\cdot \\frac{du}{dx}'
            : `\\frac{d}{dx}\\${form}(u) = ${becomes}(u) \\cdot \\frac{du}{dx}`,
      },
      {
        text: `The inside is $u = ${kx}$, so that multiplier is $${k}$.`,
        tex: `\\frac{du}{dx} = ${k}`,
      },
      {
        text:
          form === 'cos'
            ? `Differentiating $\\cos$ brings a minus sign with it, so the coefficient is $${a} \\times ${k}$ made negative.`
            : `Collect the multipliers: the outer $${a}$ and the inner $${k}$.`,
        tex: `${form === 'cos' ? '-' : ''}${a} \\times ${k} = ${form === 'cos' ? -a * k : a * k}`,
      },
      {
        text: 'Which gives:',
        tex: `\\frac{dy}{dx} = ${form === 'cos' ? `-${a * k}\\sin\\left(${kx}\\right)` : form === 'sin' ? `${a * k}\\cos\\left(${kx}\\right)` : `${a * k}e^{${kx}}`}`,
      },
    ];
  },
};

export const differentiationShapeGenerators = [
  powerTiles,
  indexRewrite,
  gradientTree,
  stationarySlider,
  productPieces,
  productTree,
  quotientPieces,
  chainPieces,
  chainTree,
  standardTiles,
];
