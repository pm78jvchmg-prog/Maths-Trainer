/**
 * The other ways of asking a quadratic question.
 *
 * `quadratics.ts` holds one generator per skill, and a lesson built from it
 * asked that one generator five or six times: the same widget, the same
 * sentence, different numbers. Roadmap batch A4 widens the twelve `qd-`
 * lessons, and widening a deck means having something else to put in it —
 * questions about the *same* skill that ask for something different.
 *
 * So each generator here is deliberately a sideways step rather than a harder
 * version of its neighbour:
 *
 * - expanding, asked for one coefficient instead of the whole expansion;
 * - factorising, asked for the second bracket when the first is given;
 * - the discriminant, laid out as a tree of three numbers rather than typed;
 * - the line of symmetry and the least value, dragged to on the curve itself;
 * - and two decisions — which factorising route, which numbers are $a$, $b$
 *   and $c$ — that no amount of arithmetic practice teaches.
 *
 * They live apart from `quadratics.ts` because that file is already long and
 * because these share its formatters rather than its subject matter. The
 * registry lists both arrays, so a lesson references either by id.
 *
 * Two rules inherited from `quadratics.ts` and worth repeating, since both
 * fail loudly in a test and silently in front of a learner: a tiles template
 * is split on `{n}` and each piece rendered alone, so no braces round a digit
 * (`x^2`, never `x^{2}`) and no `\left`/`\right` spanning a blank; and every
 * value inside a `reduce` tree is whole, banks included.
 */
import type { ChoiceOption, Generator, Slide } from '../types';
import { markerWindow, parabolaSvg } from '../figures';
import { options } from '../choiceVariant';
import { bin, num, pow } from '../expr';
import {
  bankOf,
  factorTile,
  isPerfectSquare,
  nonZero,
  offer,
  quadraticTex,
  signedTile,
} from './quadratics';
import { simultaneousGenerators } from './quadraticSimultaneous';
import { inequalityGenerators } from './quadraticInequalities';
import { modellingGenerators } from './quadraticModelling';
import { disguiseGenerators } from './quadraticDisguise';

/**
 * Four whole-number options built from `offer`, the correct one flagged.
 *
 * Distractors computed from a question's own numbers collide — `p + q` equals
 * `p * q` when both are 2 — and a collision here would offer the same number
 * twice, or worse offer the answer twice. `offer` already de-duplicates and
 * pads from just beside the answer, so the only work left is marking which one
 * is right.
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
 * The distractors worth offering are built from the question's own numbers, so
 * they collide with the answers far more often than they look like they will —
 * with `a = 1`, half of them *are* answers. What is left is padded from either
 * side of the total, which keeps every tile a plausible near-miss rather than
 * an obvious spare.
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

/** A bank token for `k` copies of x squared: `x^2`, `4x^2`. */
function squareTile(coefficient: number): string {
  return coefficient === 1 ? 'x^2' : `${coefficient}x^2`;
}

/** Highest common factor, for keeping a "take the common factor out" question honest. */
function hcf(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : hcf(b, a % b);
}

/* ---------- Level 1: expanding ---------- */

interface ProductParams {
  m: number;
  n: number;
  p: number;
  q: number;
}

/**
 * One coefficient of an expansion, rather than the whole expansion.
 *
 * `quad-expand` grades the finished line; this asks only for the middle term's
 * number, which is the part that is actually worked out — the $x^2$ and the
 * constant fall out of multiplying the ends together. Asked as a typed number
 * so the answer cannot be recognised, only computed.
 */
const expandTerm: Generator<ProductParams> = {
  id: 'quad-expand-term',
  choices: ({ m, n, p, q }) =>
    numberChoices(m * q + n * p, p + q, m * p + n * q, p * q, m * n),
  sample: (rng, difficulty) => ({
    m: difficulty > 1 ? rng.int(2, 5) : 1,
    n: difficulty > 1 ? rng.int(1, 3) : 1,
    p: nonZero(rng.int(-9, 9), 3),
    q: nonZero(rng.int(-9, 9), -4),
  }),
  render: ({ m, n, p, q }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Expand these brackets in your head and give the coefficient of $x$ — the number in front of the middle term, sign and all.',
      },
      {
        kind: 'display',
        tex: `\\left(${factorTile(m, p)}\\right)\\left(${factorTile(n, q)}\\right)`,
      },
    ],
    lead: '\\text{coefficient of } x =',
    keypad: [],
    answer: `${m * q + n * p}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ m, n, p, q }) => [
    {
      text: 'The middle term is the only one built from two multiplications: the outside pair and the inside pair, added together.',
    },
    {
      tex: `${m}x \\times ${q < 0 ? `\\left(${q}\\right)` : q} = ${m * q}x \\qquad ${p < 0 ? `\\left(${p}\\right)` : p} \\times ${n}x = ${n * p}x`,
    },
    { tex: `${m * q}x ${signedTile(n * p, 'x')} = ${m * q + n * p}x` },
    {
      text: `So the coefficient is $${m * q + n * p}$. Adding $${p}$ and $${q}$ instead gives $${p + q}$, which is only the same answer when both brackets start with a plain $x$.`,
    },
  ],
};

interface SquareParams {
  m: number;
  p: number;
}

/**
 * Squaring a bracket, placed as three whole terms.
 *
 * The blanks are the terms rather than the numbers inside them, because the
 * mistake worth catching is losing the middle term altogether — a learner who
 * writes $\left(x + 3\right)^2 = x^2 + 9$ has not slipped on a sign, they have
 * squared each piece separately. A bank that offers the doubled term and the
 * undoubled one side by side asks about exactly that.
 */
const expandSquare: Generator<SquareParams> = {
  id: 'quad-expand-square',
  choices: ({ m, p }) =>
    options(
      {
        tex: quadraticTex(m * m, 2 * m * p, p * p),
        answer: `(${m * m})*x^2 + (${2 * m * p})*x + (${p * p})`,
      },
      {
        tex: quadraticTex(m * m, 0, p * p),
        answer: `(${m * m})*x^2 + (${p * p})`,
      },
      {
        tex: quadraticTex(m * m, m * p, p * p),
        answer: `(${m * m})*x^2 + (${m * p})*x + (${p * p})`,
      },
      {
        tex: quadraticTex(m * m, 2 * m * p, -(p * p)),
        answer: `(${m * m})*x^2 + (${2 * m * p})*x + (${-(p * p)})`,
      },
    ),
  sample: (rng, difficulty) => ({
    m: difficulty > 1 ? rng.int(2, 5) : 1,
    // Thirteen either side of zero, so a single bracket still offers more
    // distinct questions than a lesson and a level check can ask for.
    p: nonZero(rng.int(-13, 13), 5),
  }),
  render: ({ m, p }): Slide => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: 'Expand the square.' },
      { kind: 'display', tex: `\\left(${factorTile(m, p)}\\right)^{2}` },
    ],
    template: `{0} {1} {2}`,
    bank: bankOf([squareTile(m * m), signedTile(2 * m * p, 'x'), signedTile(p * p)], [
      signedTile(m * p, 'x'),
      signedTile(2 * p, 'x'),
      signedTile(-(p * p)),
      squareTile(2 * m),
      signedTile(p * p, 'x'),
    ]),
    answer: [squareTile(m * m), signedTile(2 * m * p, 'x'), signedTile(p * p)],
  }),
  solution: ({ m, p }) => [
    {
      text: 'A square is two identical brackets, so it expands exactly like any other pair — there is no shortcut that squares each term.',
    },
    {
      tex: `\\left(${factorTile(m, p)}\\right)\\left(${factorTile(m, p)}\\right)`,
    },
    {
      text: `The outside and inside products are both $${m * p}x$, and together they make $${2 * m * p}x$. That doubling is the whole reason the middle term is there.`,
    },
    { tex: `${quadraticTex(m * m, 2 * m * p, p * p)}` },
    {
      text: `Squaring the two pieces separately would give $${quadraticTex(m * m, 0, p * p)}$, which is short by $${2 * m * p}x$.`,
    },
  ],
};

interface SubstituteParams {
  a: number;
  b: number;
  c: number;
  k: number;
}

/**
 * Substituting a value into a quadratic, one operation at a time.
 *
 * The check a learner should run on any expansion or factorisation — put a
 * number in and see whether both forms agree — and an order-of-operations
 * question in its own right, since the square has to be taken before the
 * multiplication and the multiplication before either addition.
 *
 * Whole throughout, banks included: a third of a unit anywhere turns this into
 * an arithmetic-with-fractions question, which is a different lesson.
 */
const substitute: Generator<SubstituteParams> = {
  // `-steps` rather than a name of its own, so `familyOf` files it with
  // `quad-evaluate-tree`: the same substitution through a different widget is
  // one skill asked twice, not two skills, and a deck should not be able to
  // spend both slots on it and call that variety.
  id: 'quad-evaluate-steps',
  choices: ({ a, b, c, k }) => {
    const total = a * k * k + b * k + c;
    return numberChoices(
      total,
      // Multiplying before squaring, which is the slip the shape invites.
      a * (k * k) + b + k + c,
      // Doubling instead of squaring.
      a * 2 * k + b * k + c,
      // Dropping the constant.
      a * k * k + b * k,
    );
  },
  sample: (rng, difficulty) => ({
    a: difficulty > 1 ? rng.int(2, 4) : 1,
    b: nonZero(rng.int(-9, 9), 3),
    c: nonZero(rng.int(-9, 9), -5),
    k: difficulty > 1 ? rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]) : rng.int(2, 7),
  }),
  render: ({ a, b, c, k }): Slide => {
    const square = pow(num(k), num(2));
    const leading = a === 1 ? square : bin('*', num(a), square);
    const expr = bin('+', bin('+', leading, bin('*', num(b), num(k))), num(c));

    const squared = k * k;
    const scaled = a * squared;
    const middle = b * k;
    const total = scaled + middle + c;

    const banks: Record<string, string[]> = {
      // The last addition: subtracting the constant instead of adding it.
      r: offer(total, scaled + middle - c, scaled + middle, middle + c),
      // The first addition, once both terms are numbers.
      'r.l': offer(scaled + middle, scaled - middle, middle - scaled, scaled * middle),
      // b times k: adding the two instead, and dropping the sign of either.
      'r.l.r': offer(middle, b + k, Math.abs(b) * k, -middle),
    };
    if (a === 1) {
      // k squared: doubling it, and the square of twice k.
      banks['r.l.l'] = offer(squared, 2 * k, k + 2, 2 * k * 2 * k);
    } else {
      banks['r.l.l'] = offer(scaled, a + squared, a * 2 * k, squared);
      banks['r.l.l.r'] = offer(squared, 2 * k, k + 2, 2 * k * 2 * k);
    }

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Substitute $x = ${k}$ and work the value out one piece at a time. Tap the part you would do **next**, then choose what it comes to.`,
        },
        { kind: 'display', tex: `y = ${quadraticTex(a, b, c)}` },
      ],
      expr,
      banks,
    };
  },
  solution: ({ a, b, c, k }) => {
    const squared = k * k;
    const scaled = a * squared;
    const middle = b * k;
    return [
      {
        text: `Replace every $x$ with $${k}$, brackets and all, before doing any arithmetic. A negative value substituted without brackets is where this goes wrong.`,
      },
      {
        tex: `${a === 1 ? '' : `${a} \\times `}\\left(${k}\\right)^{2} ${signedTile(b)} \\times \\left(${k}\\right) ${signedTile(c)}`,
      },
      { tex: `${scaled} ${signedTile(middle)} ${signedTile(c)} = ${scaled + middle + c}` },
      {
        text: `The square comes first: $\\left(${k}\\right)^{2} = ${squared}$, never $${2 * k}$. Doubling instead of squaring is the commonest wrong turn here.`,
      },
    ];
  },
};

/* ---------- Level 1: factorising ---------- */

interface PairParams {
  p: number;
  q: number;
}

/**
 * The second bracket, given the first.
 *
 * Factorising asked from the other end: with one factor on the page the
 * question is no longer "find two numbers" but "what must the other one be",
 * which is division rather than search — and it is the step a learner actually
 * uses when a first factor has been spotted or handed to them by the factor
 * theorem later on.
 */
const missingFactor: Generator<PairParams> = {
  id: 'quad-factor-one',
  choices: ({ p, q }) => numberChoices(q, -q, p, p * q, p + q),
  sample: (rng, difficulty) => ({
    p: nonZero(rng.int(difficulty > 1 ? -12 : -9, difficulty > 1 ? 12 : 9), 3),
    q: nonZero(rng.int(difficulty > 1 ? -12 : -9, difficulty > 1 ? 12 : 9), -5),
  }),
  render: ({ p, q }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'One factor is already there. Find the number in the other.' },
      {
        kind: 'display',
        tex: `${quadraticTex(1, p + q, p * q)} = \\left(x ${signedTile(p)}\\right)\\left(x + k\\right)`,
      },
    ],
    lead: 'k =',
    keypad: [],
    answer: `${q}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ p, q }) => [
    {
      text: `The two constants multiply to give the last term, so $${p} \\times k = ${p * q}$.`,
    },
    { tex: `k = \\frac{${p * q}}{${p}} = ${q}` },
    {
      text: `Check it against the middle term as well: $${p} + \\left(${q}\\right) = ${p + q}$, which matches. Both conditions have to hold, and using only one of them is how a sign slips through.`,
    },
  ],
};

interface RouteParams {
  a: number;
  b: number;
  c: number;
  route: 'common' | 'squares' | 'brackets' | 'none';
}

const ROUTE_COMMON = 'Yes — every term has a factor in common';
const ROUTE_NO_COMMON = 'No common factor';
const ROUTE_SQUARES = 'Yes — no $x$ term, and a square taken away';
const ROUTE_NOT_SQUARES = 'No, there is more to it than that';
const ROUTE_PAIR = 'Yes, there is a pair';
const ROUTE_NO_PAIR = 'No pair works';

/**
 * Which route does this expression factorise by?
 *
 * `quad-choose-method` asks the same question about *solving*, one level on;
 * this one is about the expression in front of you, and it runs the checks in
 * the order that costs least: a common factor takes one glance, a difference
 * of two squares takes two, and hunting for a pair of numbers is the work.
 *
 * A `choice` slide asking "which method?" is a one-in-four guess. Walking the
 * tree makes the learner commit to a reason at every fork, and a wrong turn
 * early leads somewhere visibly different.
 */
const factoriseRoute: Generator<RouteParams> = {
  id: 'quad-factorise-route',
  sample: (rng, difficulty) => {
    const route = rng.pick(['common', 'squares', 'brackets', 'none'] as const);
    if (route === 'common') {
      // A common factor of x, because there is no constant term at all.
      return { a: rng.int(1, difficulty > 1 ? 6 : 4), b: nonZero(rng.int(-9, 9), 6), c: 0, route };
    }
    if (route === 'squares') {
      const k = rng.int(2, difficulty > 1 ? 12 : 9);
      return { a: 1, b: 0, c: -k * k, route };
    }
    if (route === 'brackets') {
      for (let tries = 0; tries < 60; tries += 1) {
        const p = nonZero(rng.int(-9, 9), 3);
        const q = nonZero(rng.int(-9, 9), -4);
        // p + q = 0 would make it a difference of two squares instead, and the
        // first fork it fails would be the wrong one.
        if (p + q !== 0) return { a: 1, b: p + q, c: p * q, route };
      }
      return { a: 1, b: -1, c: -6, route };
    }
    for (let tries = 0; tries < 80; tries += 1) {
      const b = nonZero(rng.int(-9, 9), 5);
      const c = nonZero(rng.int(-9, 9), 3);
      if (!isPerfectSquare(b * b - 4 * c)) return { a: 1, b, c, route };
    }
    return { a: 1, b: 1, c: 1, route };
  },
  render: ({ a, b, c, route }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Work down the questions to decide how this one factorises. Each answer chooses what gets asked next.',
      },
    ],
    subject: quadraticTex(a, b, c),
    steps: [
      {
        id: 'common',
        ask: 'Is there a factor every term shares?',
        branches: [
          { label: ROUTE_COMMON, outcome: 'Take it outside a bracket first, then look again at what is left.' },
          { label: ROUTE_NO_COMMON, to: 'squares' },
        ],
      },
      {
        id: 'squares',
        ask: 'Is it a difference of two squares?',
        branches: [
          { label: ROUTE_SQUARES, outcome: 'Factorise on sight as $(x - k)(x + k)$.' },
          { label: ROUTE_NOT_SQUARES, to: 'pair' },
        ],
      },
      {
        id: 'pair',
        ask: 'Are there two whole numbers that multiply to the constant and add to the coefficient of $x$?',
        branches: [
          { label: ROUTE_PAIR, outcome: 'Split it into two brackets using that pair.' },
          { label: ROUTE_NO_PAIR, outcome: 'It does not factorise with whole numbers — leave it as it is.' },
        ],
      },
    ],
    answer:
      route === 'common'
        ? [ROUTE_COMMON]
        : route === 'squares'
          ? [ROUTE_NO_COMMON, ROUTE_SQUARES]
          : route === 'brackets'
            ? [ROUTE_NO_COMMON, ROUTE_NOT_SQUARES, ROUTE_PAIR]
            : [ROUTE_NO_COMMON, ROUTE_NOT_SQUARES, ROUTE_NO_PAIR],
  }),
  solution: ({ a, b, c, route }) => {
    if (route === 'common') {
      const common = hcf(a, Math.abs(b));
      return [
        {
          text: 'There is no constant term, so every term carries an $x$ — and that is a common factor before anything else is tried.',
        },
        {
          tex: `${quadraticTex(a, b, 0)} = ${common === 1 ? '' : common}x\\left(${factorTile(a / common, b / common)}\\right)`,
        },
        {
          text: 'Reaching for two brackets here would work eventually, but the common factor is one glance and it makes what is left simpler.',
        },
      ];
    }
    if (route === 'squares') {
      const k = Math.round(Math.sqrt(-c));
      return [
        {
          text: 'No $x$ term, and a square being taken away. Nothing else has that shape.',
        },
        { tex: `${quadraticTex(1, 0, c)} = \\left(x - ${k}\\right)\\left(x + ${k}\\right)` },
        {
          text: `Hunting for a pair of numbers adding to zero would land in the same place after more work, since $${k}$ and $-${k}$ are exactly that pair.`,
        },
      ];
    }
    const disc = b * b - 4 * c;
    if (route === 'brackets') {
      return [
        {
          text: `Every term has an $x$ or a constant of its own, and there is an $x$ term, so the first two checks fail. Two whole numbers multiplying to $${c}$ and adding to $${b}$ is the thing to look for.`,
        },
        { tex: `b^{2} - 4ac = \\left(${b}\\right)^{2} - 4 \\times ${c} = ${disc}` },
        {
          text: `The discriminant is $${disc}$, a perfect square, which is precisely the condition for that pair to exist. Spotting the pair by eye is quicker; this is the check when it will not come.`,
        },
      ];
    }
    return [
      {
        text: `No common factor, an $x$ term so not a difference of two squares, and no pair of whole numbers multiplies to $${c}$ while adding to $${b}$.`,
      },
      { tex: `b^{2} - 4ac = \\left(${b}\\right)^{2} - 4 \\times ${c} = ${disc}` },
      {
        text: `$${disc}$ is not a perfect square, so no whole-number brackets exist. It can still be solved with the formula — it just cannot be factorised.`,
      },
    ];
  },
};

interface SpotParams {
  k: number;
  other: number;
  coefficient: number;
}

/**
 * Which of these four is a difference of two squares?
 *
 * Recognition rather than execution. Every distractor is a near miss on one
 * feature — a sum instead of a difference, a constant that is not a square, an
 * $x$ term where there should be none — so picking the right one means having
 * checked all three conditions rather than one.
 */
const spotSquares: Generator<SpotParams> = {
  id: 'quad-squares-spot',
  sample: (rng, difficulty) => ({
    k: rng.int(2, difficulty > 1 ? 12 : 9),
    other: rng.pick([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 18, 20]),
    coefficient: rng.int(2, 9),
  }),
  render: ({ k, other, coefficient }): Slide => {
    // The near-square constant has to be genuinely not a square, and not the
    // right answer's own constant either.
    const near = other === k * k || isPerfectSquare(other) ? other + 1 : other;
    const choices = [
      { id: 'dots', tex: `x^{2} - ${k * k}` },
      { id: 'sum', tex: `x^{2} + ${k * k}` },
      { id: 'near', tex: `x^{2} - ${near}` },
      { id: 'linear', tex: `x^{2} - ${coefficient}x` },
    ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: 'Only one of these is a difference of two squares. Which one?',
        },
      ],
      options: choices.map((choice) => ({ id: choice.id, label: choice.tex, tex: true })),
      correctId: 'dots',
    };
  },
  solution: ({ k, other, coefficient }) => {
    const near = other === k * k || isPerfectSquare(other) ? other + 1 : other;
    return [
      {
        text: `A difference of two squares needs all three: a square, a square taken away from it, and nothing in between. $x^{2} - ${k * k}$ has $x^{2}$ and $${k}^{2}$ with a minus sign, so it factorises on sight.`,
      },
      { tex: `x^{2} - ${k * k} = \\left(x - ${k}\\right)\\left(x + ${k}\\right)` },
      {
        text: `$x^{2} + ${k * k}$ is a *sum*, and nothing real factorises it. $x^{2} - ${near}$ is a difference, but $${near}$ is not a square. $x^{2} - ${coefficient}x$ has an $x$ term, so it is a common factor question instead.`,
      },
    ];
  },
};

interface NumberSquaresParams {
  m: number;
  gap: number;
}

/**
 * The difference of two squares, used on numbers.
 *
 * $43^2 - 37^2$ is a minute of long multiplication or a few seconds of
 * $\left(m - n\right)\left(m + n\right)$, and meeting it here is the first
 * time the identity does something the learner could not already do. It also
 * makes the identity memorable in a way that ten more factorisations do not.
 */
const squaresArithmetic: Generator<NumberSquaresParams> = {
  id: 'quad-squares-arithmetic',
  choices: ({ m, gap }) => {
    const n = m - gap;
    return numberChoices(m * m - n * n, gap * gap, gap, m + n, gap * m);
  },
  sample: (rng, difficulty) => ({
    m: rng.int(difficulty > 1 ? 24 : 12, difficulty > 1 ? 60 : 40),
    gap: rng.int(1, difficulty > 1 ? 7 : 4),
  }),
  render: ({ m, gap }): Slide => {
    const n = m - gap;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: 'The difference of two squares works on numbers too. Use $m^{2} - n^{2} = (m - n)(m + n)$ rather than squaring both.',
        },
      ],
      lead: `${m}^{2} - ${n}^{2} =`,
      keypad: [],
      answer: `${m * m - n * n}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ m, gap }) => {
    const n = m - gap;
    return [
      {
        text: `Take $m = ${m}$ and $n = ${n}$. The identity turns two squarings and a subtraction into one small multiplication.`,
      },
      { tex: `${m}^{2} - ${n}^{2} = \\left(${m} - ${n}\\right)\\left(${m} + ${n}\\right)` },
      { tex: `= ${gap} \\times ${m + n} = ${m * m - n * n}` },
      {
        text: `The gap between the two numbers is $${gap}$, so that is one of the brackets whatever the numbers are — which is why consecutive squares always differ by their sum.`,
      },
    ];
  },
};

interface CommonFactorParams {
  k: number;
  m: number;
  n: number;
  p: number;
  terms: 2 | 3;
}

/**
 * Taking a common factor out.
 *
 * The step that comes before every other factorisation and the one most often
 * skipped: $6x^2 + 9x$ handed straight to a two-bracket method comes out
 * clumsily, if at all. Two shapes, one per difficulty — a factor of $kx$ from
 * two terms, and a numeric factor from three — because which factor is
 * available is the judgement being practised, not the division.
 */
const commonFactor: Generator<CommonFactorParams> = {
  id: 'quad-common-factor',
  // The obvious distractor — a half-taken factor like `x(6x + 9)` — cannot be
  // offered here. The checker grades by value, and an under-factorised form is
  // *equal* to the answer, so a test rightly refuses it as a distractor. The
  // tiles form catches that mistake instead, by grading the form: `x` and the
  // number sit in the bank as separate tokens, and placing one without the
  // other is wrong there.
  choices: ({ k, m, n, p, terms }) =>
    terms === 2
      ? options(
          {
            tex: `${k}x\\left(${factorTile(m, n)}\\right)`,
            answer: `(${k})*x*((${m})*x + (${n}))`,
          },
          {
            tex: `${k}\\left(${factorTile(m, n)}\\right)`,
            answer: `(${k})*((${m})*x + (${n}))`,
          },
          {
            tex: `${k}x\\left(${factorTile(k * m, n)}\\right)`,
            answer: `(${k})*x*((${k * m})*x + (${n}))`,
          },
          {
            tex: `${k}x\\left(${factorTile(m, k * n)}\\right)`,
            answer: `(${k})*x*((${m})*x + (${k * n}))`,
          },
        )
      : options(
          {
            tex: `${k}\\left(${quadraticTex(m, n, p)}\\right)`,
            answer: `(${k})*((${m})*x^2 + (${n})*x + (${p}))`,
          },
          {
            tex: `${k}x\\left(${quadraticTex(m, n, p)}\\right)`,
            answer: `(${k})*x*((${m})*x^2 + (${n})*x + (${p}))`,
          },
          {
            tex: `${k}\\left(${quadraticTex(m, n, k * p)}\\right)`,
            answer: `(${k})*((${m})*x^2 + (${n})*x + (${k * p}))`,
          },
          {
            tex: `${k}\\left(${quadraticTex(k * m, n, p)}\\right)`,
            answer: `(${k})*((${k * m})*x^2 + (${n})*x + (${p}))`,
          },
        ),
  sample: (rng, difficulty) => {
    const terms: 2 | 3 = difficulty > 1 ? 3 : 2;
    const k = rng.int(2, 6);
    for (let tries = 0; tries < 80; tries += 1) {
      const m = rng.int(1, 5);
      const n = nonZero(rng.int(-9, 9), 3);
      const p = nonZero(rng.int(-9, 9), -2);
      // The factor taken out has to be the whole of what is common, or there
      // is a second right answer sitting inside the bracket.
      const shared = terms === 2 ? hcf(m, n) : hcf(hcf(m, n), p);
      if (shared === 1) return { k, m, n, p, terms };
    }
    return { k, m: 1, n: 3, p: -2, terms };
  },
  render: ({ k, m, n, p, terms }): Slide => {
    const inner = terms === 2 ? factorTile(m, n) : quadraticTex(m, n, p);
    const outer = terms === 2 ? `${k}x` : `${k}`;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Take out the largest factor every term shares.' },
        {
          kind: 'display',
          tex:
            terms === 2
              ? quadraticTex(k * m, k * n, 0)
              : quadraticTex(k * m, k * n, k * p),
        },
      ],
      template: `{0}({1})`,
      bank: bankOf([outer, inner], [
        `${k}`,
        'x',
        `${k * m}x`,
        terms === 2 ? factorTile(m, k * n) : quadraticTex(m, n, k * p),
        terms === 2 ? factorTile(k * m, n) : quadraticTex(k * m, n, p),
      ]),
      answer: [outer, inner],
    };
  },
  solution: ({ k, m, n, p, terms }) => {
    if (terms === 2) {
      return [
        {
          text: `Both terms are divisible by $${k}$, and both carry an $x$, so the whole of $${k}x$ comes out.`,
        },
        { tex: `${quadraticTex(k * m, k * n, 0)} = ${k}x\\left(${factorTile(m, n)}\\right)` },
        {
          text: `Divide each term by $${k}x$ rather than by $${k}$ alone: $${k * m}x^{2} \\div ${k}x = ${m}x$, and $${k * n}x \\div ${k}x = ${n}$. Leaving the $x$ behind is the usual half-done answer.`,
        },
      ];
    }
    return [
      {
        text: `All three terms divide by $${k}$, but the constant has no $x$ in it, so only the number comes out.`,
      },
      { tex: `${quadraticTex(k * m, k * n, k * p)} = ${k}\\left(${quadraticTex(m, n, p)}\\right)` },
      {
        text: 'Check by multiplying back through the bracket. A term left undivided is the mistake this catches, and it shows up immediately.',
      },
    ];
  },
};

/* ---------- Level 2: solving ---------- */

interface RootsParams {
  r: number;
  t: number;
}

/**
 * The second root, given the first.
 *
 * The two roots sit at equal distances either side of the line of symmetry, so
 * one root and the equation between them fix the other without any factorising
 * at all. It is the quickest route in an exam and the one that makes the
 * symmetry of a parabola something the learner uses rather than knows.
 */
const otherRoot: Generator<RootsParams> = {
  id: 'quad-other-root',
  choices: ({ r, t }) => numberChoices(t, -t, r, -r, -(r + t)),
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 9 : 6;
    const r = nonZero(rng.int(-reach, reach), 3);
    let t = nonZero(rng.int(-reach, reach), -4);
    if (t === r) t = r > 0 ? r - 1 || -1 : r + 1 || 1;
    return { r, t };
  },
  render: ({ r, t }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `One root of this equation is $x = ${r}$. Give the other.`,
      },
      { kind: 'display', tex: `${quadraticTex(1, -(r + t), r * t)} = 0` },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${t}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ r, t }) => [
    {
      text: `The two roots multiply to give the constant term, so the other one is $${r * t} \\div ${r}$.`,
    },
    { tex: `${r} \\times x = ${r * t} \\implies x = ${t}` },
    {
      text: `They also add to $${r + t}$, which is the middle coefficient with its sign flipped — a second check that costs nothing and catches a sign slip straight away.`,
    },
    {
      text: `And they sit either side of the line of symmetry at $x = ${(r + t) / 2}$, at equal distance from it. That is the same fact seen on the graph.`,
    },
  ],
};

/**
 * A root, dragged to on the curve.
 *
 * The larger root specifically, so the answer is one value: a slider grading
 * only one of two correct places would mark a learner wrong for reading the
 * graph properly, which is worse than asking a slightly narrower question.
 */
const rootSlider: Generator<RootsParams> = {
  id: 'quad-root-slider',
  sample: (rng, difficulty) => {
    const reach = difficulty > 1 ? 6 : 5;
    const [r, t] = rng.sample(
      Array.from({ length: 2 * reach + 1 }, (_, i) => i - reach),
      2,
    );
    return r < t ? { r, t } : { r: t, t: r };
  },
  render: ({ r, t }): Slide => {
    const b = -(r + t);
    const c = r * t;
    const reach = Math.max(Math.abs(r), Math.abs(t), 5);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'The curve below crosses the $x$-axis twice. Slide to the **larger** of its two roots.',
        },
      ],
      min: -reach,
      max: reach,
      step: 1,
      answer: t,
      readout: 'x = {v}',
      figure: {
        svg: parabolaSvg(1, b, c, { xMin: -reach, xMax: reach }),
        ...markerWindow(-reach, reach),
      },
    };
  },
  solution: ({ r, t }) => [
    {
      text: 'A root is where the curve meets the horizontal axis — where $y$ is zero, not where the curve turns.',
    },
    { tex: `${quadraticTex(1, -(r + t), r * t)} = \\left(x ${signedTile(-r)}\\right)\\left(x ${signedTile(-t)}\\right)` },
    {
      text: `The crossings are at $x = ${r}$ and $x = ${t}$, so the larger is $${t}$. The turning point sits midway between them, at $x = ${(r + t) / 2}$.`,
    },
  ],
};

interface VertexParams {
  a: number;
  p: number;
  q: number;
}

/**
 * The least value the curve reaches.
 *
 * Completing the square asked for its point rather than its form. A learner
 * who can produce $\left(x + p\right)^2 + q$ and still not say what the
 * smallest $y$ is has learnt the manipulation and not the reason for it, and
 * nothing in `quad-complete-square` would show that.
 */
const leastValue: Generator<VertexParams> = {
  id: 'quad-min-value',
  choices: ({ a, p, q }) => numberChoices(q, -q, -p, a * p * p + q, p),
  sample: (rng, difficulty) => ({
    a: difficulty > 1 ? rng.int(2, 4) : 1,
    p: nonZero(rng.int(-6, 6), 2),
    q: nonZero(rng.int(-9, 9), -4),
  }),
  render: ({ a, p, q }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Give the least value this curve ever reaches.',
      },
      { kind: 'display', tex: `y = ${quadraticTex(a, 2 * a * p, a * p * p + q)}` },
    ],
    lead: 'y_{\\min} =',
    keypad: [],
    answer: `${q}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, p, q }) => [
    {
      text: 'Complete the square. Once the $x$ appears only inside a bracket that is squared, the smallest value is in plain sight.',
    },
    {
      tex: `y = ${a === 1 ? '' : a}\\left(x ${signedTile(p)}\\right)^{2} ${signedTile(q)}`,
    },
    {
      text: `A square is never negative, so the least the first part can be is zero — at $x = ${-p}$. Everything left is the $${q}$.`,
    },
    {
      text: `So the least value is $${q}$, reached once. The $x$ that gets there is $${-p}$, which is a different question and the answer people give by mistake.`,
    },
  ],
};

/**
 * The least value, dragged to on the curve.
 *
 * The marker is a horizontal line, because the answer is a height rather than
 * a position along the bottom: drag until the line meets the foot of the
 * curve. Its typed sibling asks for the same number from the algebra, and
 * meeting both is what joins "complete the square" to "the bottom of the dip".
 */
const vertexSlider: Generator<VertexParams> = {
  id: 'quad-vertex-slider',
  /**
   * `a` earns its place rather than adding difficulty: the frame follows the
   * dip, so a curve drawn from `p` alone looks *identical* whatever `p` is —
   * the same picture translated back to the middle. Only the steepness and the
   * height left it anything to vary, and twelve heights alone is under the
   * floor of twenty-five distinct questions.
   */
  sample: (rng) => ({
    a: rng.int(1, 3),
    p: nonZero(rng.int(-4, 4), 2),
    q: nonZero(rng.int(-6, 6), -3),
  }),
  render: ({ a, p, q }): Slide => {
    const b = 2 * a * p;
    const c = a * p * p + q;
    // The window is fixed rather than built around the answer, so where the
    // dip sits on the picture is not a clue to what it is worth.
    const low = -8;
    const high = 8;
    // Centred on the dip rather than on zero, so the curve does not sit in one
    // corner with the other half of the frame empty — and narrowed as the
    // curve steepens, so the arms leave the frame at about the same place.
    const centre = -p;
    const half = a === 1 ? 4 : a === 2 ? 3 : 2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: 'Slide the line down to the **lowest point** the curve reaches, and read off the value there.',
        },
      ],
      min: low,
      max: high,
      step: 1,
      answer: q,
      readout: 'y = {v}',
      figure: {
        svg: parabolaSvg(a, b, c, {
          xMin: centre - half,
          xMax: centre + half,
          yMin: low,
          yMax: high,
        }),
        ...markerWindow(low, high, 'y'),
        axis: 'y',
      },
    };
  },
  solution: ({ a, p, q }) => [
    {
      text: 'The lowest point of a parabola is its turning point, and the value there is what completing the square leaves outside the bracket.',
    },
    {
      tex: `y = ${quadraticTex(a, 2 * a * p, a * p * p + q)} = ${a === 1 ? '' : a}\\left(x ${signedTile(p)}\\right)^{2} ${signedTile(q)}`,
    },
    {
      text: `The bracket is zero at $x = ${-p}$ and positive everywhere else, so the curve never goes below $y = ${q}$.`,
    },
  ],
};

/* ---------- Level 2: the formula ---------- */

interface CoefficientParams {
  a: number;
  b: number;
  c: number;
  rearranged: boolean;
}

/**
 * Naming $a$, $b$ and $c$.
 *
 * Every formula question is lost or won here, and it is invisible in an answer
 * that only shows the roots. Half the draws come rearranged, with the constant
 * on the far side, because reading $c$ off an equation that is not yet in
 * standard form is where the sign actually goes missing.
 */
const formulaValues: Generator<CoefficientParams> = {
  id: 'quad-formula-values',
  choices: ({ a, b, c }) =>
    options(
      { tex: `a = ${a}, \\; b = ${b}, \\; c = ${c}` },
      { tex: `a = ${a}, \\; b = ${b}, \\; c = ${-c}` },
      { tex: `a = ${a}, \\; b = ${-b}, \\; c = ${c}` },
      { tex: `a = ${-a}, \\; b = ${-b}, \\; c = ${-c}` },
    ),
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty > 1 ? 6 : 4),
    b: nonZero(rng.int(-9, 9), 5),
    c: nonZero(rng.int(-9, 9), -3),
    rearranged: difficulty > 1 ? rng.chance(0.7) : rng.chance(0.3),
  }),
  render: ({ a, b, c, rearranged }): Slide => {
    // Strictly greater than every answer in size, so it can never collide with
    // one and leave the bank without a distractor.
    const far = Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) + 1;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Name the three coefficients, ready for the formula. Signs matter.',
        },
        {
          kind: 'display',
          tex: rearranged
            ? `${quadraticTex(a, b, 0)} = ${-c}`
            : `${quadraticTex(a, b, c)} = 0`,
        },
      ],
      template: `a = {0}, \\quad b = {1}, \\quad c = {2}`,
      bank: bankOf([`${a}`, `${b}`, `${c}`], [`${-a}`, `${-b}`, `${-c}`, `${far}`, `${-far}`]),
      answer: [`${a}`, `${b}`, `${c}`],
    };
  },
  solution: ({ a, b, c, rearranged }) => [
    {
      text: rearranged
        ? `Get everything on one side first: $${quadraticTex(a, b, 0)} = ${-c}$ becomes $${quadraticTex(a, b, c)} = 0$ once the $${-c}$ is moved across.`
        : 'The equation is already in standard form, so the three numbers can be read straight off — each with the sign in front of it.',
    },
    { tex: `a = ${a} \\qquad b = ${b} \\qquad c = ${c}` },
    {
      text: `The sign belongs to the coefficient, not to the formula. $b = ${b}$ here, so $-b = ${-b}$ when it goes in.`,
    },
    {
      text: rearranged
        ? 'Reading $c$ off before rearranging is the mistake this question exists for: it gives the number the right size and the wrong sign.'
        : 'A missing term means a coefficient of zero, not a term you can ignore.',
    },
  ],
};

interface DiscriminantParams {
  a: number;
  b: number;
  c: number;
}

/**
 * The discriminant as a tree.
 *
 * `quad-discriminant` asks for the number and `quad-discriminant-steps` walks
 * the reduction; this lays the calculation out as its parts and asks for every
 * one of them at once. The shape is the teaching: $b^2$ and $4ac$ are worked
 * out separately and only then combined, which is exactly the discipline that
 * stops $-4ac$ with a negative $c$ from going wrong.
 */
const discriminantTree: Generator<DiscriminantParams> = {
  id: 'quad-discriminant-tree',
  sample: (rng, difficulty) => ({
    a: difficulty > 1 ? rng.int(2, 5) : 1,
    b: nonZero(rng.int(-9, 9), 4),
    c: nonZero(rng.int(-9, 9), -3),
  }),
  render: ({ a, b, c }): Slide => {
    const bSquared = b * b;
    const fourA = 4 * a;
    const product = 4 * a * c;
    const total = bSquared - product;

    // One extra row where a is not 1: 4a is worth its own slot there, and is
    // busywork when it is just 4.
    const split = a > 1;
    const nodes = split
      ? [
          { id: 'bsq', from: [] },
          { id: 'foura', from: [] },
          { id: 'fourac', from: ['foura'] },
          { id: 'disc', from: ['bsq', 'fourac'] },
        ]
      : [
          { id: 'bsq', from: [] },
          { id: 'fourac', from: [] },
          { id: 'disc', from: ['bsq', 'fourac'] },
        ];
    const answer = split
      ? [`${bSquared}`, `${fourA}`, `${product}`, `${total}`]
      : [`${bSquared}`, `${product}`, `${total}`];

    return {
      kind: 'tree',
      prompt: [
        {
          // The slots carry no labels — the widget fills them in order — so the
          // order has to be named here or the learner is guessing which half
          // goes on the left.
          kind: 'prose',
          text: split
            ? 'Fill the tree in order: $b^{2}$, then $4a$, then $4ac$, then what the two halves make together.'
            : 'Fill the tree in order: $b^{2}$, then $4ac$, then what the two halves make together.',
        },
        { kind: 'display', tex: `${quadraticTex(a, b, c)} = 0` },
      ],
      expression: 'b^{2} - 4ac',
      nodes,
      bank: treeBank(
        answer,
        [bSquared + product, 4 * a * Math.abs(c), 2 * b, a * c, 2 * b * 2 * b],
        total,
      ),
      answer,
    };
  },
  solution: ({ a, b, c }) => {
    const bSquared = b * b;
    const product = 4 * a * c;
    return [
      {
        text: `Read the coefficients off with their signs: $a = ${a}$, $b = ${b}$, $c = ${c}$.`,
      },
      {
        tex: `b^{2} = \\left(${b}\\right)^{2} = ${bSquared} \\qquad 4ac = 4 \\times ${a} \\times \\left(${c}\\right) = ${product}`,
      },
      { tex: `b^{2} - 4ac = ${bSquared} - \\left(${product}\\right) = ${bSquared - product}` },
      {
        text:
          c < 0
            ? `$c$ is negative, so $4ac$ comes out negative and subtracting it *adds* it on. Two sign changes in a row, which is why the two halves are worked out apart before they meet.`
            : `Squaring $b$ gives a positive number whatever its sign, so $\\left(${b}\\right)^{2} = ${bSquared}$ either way.`,
      },
    ];
  },
};

export const quadraticShapeGenerators = [
  expandTerm,
  expandSquare,
  substitute,
  missingFactor,
  factoriseRoute,
  spotSquares,
  squaresArithmetic,
  commonFactor,
  otherRoot,
  rootSlider,
  leastValue,
  vertexSlider,
  formulaValues,
  discriminantTree,
  // Level 4, simultaneous equations: kept in a file of its own and listed
  // here so the registry needs no new import.
  ...simultaneousGenerators,
  // Level 5, quadratic inequalities, the same way.
  ...inequalityGenerators,
  // Level 6, modelling with quadratics, the same way.
  ...modellingGenerators,
  // Level 7, quadratics in disguise, the same way.
  ...disguiseGenerators,
] as unknown as Generator<unknown>[];
