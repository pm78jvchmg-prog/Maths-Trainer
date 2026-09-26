/**
 * Integration, asked through the widgets the course was not using.
 *
 * The Integration course had seventeen lessons built from nineteen generators,
 * and every one of those generators answered as a typed expression or a
 * multiple choice. A seven-question deck drawn from two of them reads as the
 * same question seven times however the numbers move, which is the complaint
 * `docs/ROADMAP.md` phase A exists to answer.
 *
 * So this file holds the *shapes* rather than new mathematics: the same skills
 * the course already teaches, asked as tiles to place, trees to fill, a
 * decision to walk and a limit to drag. Each one isolates a step that the
 * typed form bundles — the new index apart from the new coefficient, the
 * choice of $u$ apart from the integral it leads to, the value at each limit
 * apart from the subtraction between them.
 *
 * Two rules from `src/content/types.ts` shape almost every template here and
 * are worth restating, because both fail silently:
 *
 * - A tiles template is split on `{0}`, `{1}`, … , so **any brace group
 *   holding nothing but digits is taken for a blank**. `x^{2}` inside a
 *   template becomes `x^` followed by a tile. Every power written into a
 *   template is therefore bare (`x^2`), or the expression is moved into the
 *   prompt where braces are safe — which is what most of these do, since the
 *   question reads better as an integral above and an answer line below.
 * - Each literal piece between two blanks is rendered as TeX on its own, so
 *   nothing may span a blank: no `\left(` without its `\right)`, no `\frac`
 *   with a blank inside it. Bank tokens are rendered separately and are under
 *   no such restriction, which is why every fraction in these questions lives
 *   in a token rather than in a template.
 */
import type { Block, Generator, Slide } from '../types';
import { options } from '../choiceVariant';
import { plotSvg, plotFigure } from '../figures';
import { termTex } from './calculus';
import { coeffTex } from './format';

/** A non-zero integer: resample-free, since the caller supplies the escape. */
function nonZero(value: number, fallback: number): number {
  return value === 0 ? fallback : value;
}

/** A coefficient in front of a function (`coeffTex`), carrying its own sign so it can follow another term. */
function signedCoefTex(coefficient: number, body: string): string {
  return `${coefficient < 0 ? '-' : '+'} ${coeffTex(Math.abs(coefficient), body)}`;
}

/**
 * A tile bank: the answer's tokens plus every distractor that is not one of
 * them, sorted so the bank does not betray the order the blanks want.
 */
function bankOf(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  return [...answer, ...extras].sort();
}

/**
 * The same for a bank of numbers, kept in numeric order.
 *
 * Padded from just beside the answer when the sampled distractors collapse
 * onto it, so a learner can never find the right tile by spotting the one
 * value that looks unlike the rest.
 */
function numberBank(answer: string[], distractors: number[], atLeast = 3): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  const push = (value: number) => {
    const token = String(value);
    if (needed.has(token) || extras.includes(token)) return;
    extras.push(token);
  };
  for (const value of distractors) if (Number.isInteger(value)) push(value);
  const seed = Number(answer[answer.length - 1]);
  for (let step = 1; extras.length < atLeast; step += 1) {
    push(seed + step);
    push(seed - step);
  }
  return [...answer, ...extras].sort((a, b) => Number(a) - Number(b));
}

/** A limit as it can safely be written inside a tiles template. */
function limitTex(value: number): string {
  // A bare digit needs no braces; anything else does, and a brace group
  // holding a minus sign is not mistaken for a blank marker.
  return value >= 0 && value <= 9 ? `${value}` : `{${value}}`;
}

/** The prompt shared by the questions that show an integral and ask for it. */
function integralPrompt(text: string, tex: string): Block[] {
  return [
    { kind: 'prose', text },
    { kind: 'display', tex },
  ];
}

/* ---------- Level 1: the power rule, taken apart ---------- */

interface TwoTermParams {
  /** Coefficients of the integrand, each a multiple of its new index. */
  a: number;
  m: number;
  b: number;
  n: number;
}

/**
 * Two terms whose integrals both come out with whole coefficients.
 *
 * Sampled as the *answer* first — a coefficient `A` and an index `m` — and
 * multiplied up into the question, which is the only way to guarantee the
 * division by the new index leaves nothing over. A deck of fractions would be
 * a different lesson.
 */
function sampleTwoTerm(
  rng: { int(min: number, max: number): number },
  difficulty: number,
): TwoTermParams {
  const m = rng.int(1, difficulty > 1 ? 4 : 3);
  const n = m + rng.int(1, difficulty > 1 ? 4 : 2);
  const first = rng.int(1, difficulty > 1 ? 7 : 5);
  const second = rng.int(1, difficulty > 1 ? 7 : 5);
  return { a: first * (m + 1), m, b: second * (n + 1), n };
}

const twoTermIntegral = ({ a, m, b, n }: TwoTermParams): string =>
  `\\int \\left(${termTex(a, m)} + ${termTex(b, n)}\\right) \\, dx`;

/**
 * Integrate a two-term polynomial and place the answer's terms.
 *
 * The typed form (`int-sum`) grades the whole answer at once, so a learner who
 * raises both indices correctly and divides one of them wrong sees only that
 * the answer is wrong. Here each term is its own tile, and the distractors are
 * the two standard slips — dividing by nothing and raising by nothing — so the
 * wrong tile names the mistake.
 */
const termTiles: Generator<TwoTermParams> = {
  id: 'int-term-tiles',
  sample: sampleTwoTerm,
  render: (params): Slide => {
    const { a, m, b, n } = params;
    const first = a / (m + 1);
    const second = b / (n + 1);
    const answer = [termTex(first, m + 1), termTex(second, n + 1)];
    return {
      kind: 'tiles',
      prompt: integralPrompt(
        'Integrate term by term, then drop each term of the answer into place.',
        twoTermIntegral(params),
      ),
      template: '= {0} + {1} + C',
      bank: bankOf(answer, [
        // Raised the index but never divided by it.
        termTex(a, m + 1),
        termTex(b, n + 1),
        // Divided but never raised.
        termTex(first, m),
        termTex(second, n),
        // Differentiated instead of integrating.
        termTex(a * m, m - 1),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { a, m, b, n } = params;
    const first = a / (m + 1);
    const second = b / (n + 1);
    return [
      {
        text: 'An integral of a sum is the sum of the integrals, so each term goes through the power rule on its own.',
      },
      { tex: `\\int ${termTex(a, m)} \\, dx = \\frac{${termTex(a, m + 1)}}{${m + 1}} = ${termTex(first, m + 1)}` },
      { tex: `\\int ${termTex(b, n)} \\, dx = \\frac{${termTex(b, n + 1)}}{${n + 1}} = ${termTex(second, n + 1)}` },
      { tex: `${twoTermIntegral(params)} = ${termTex(first, m + 1)} + ${termTex(second, n + 1)} + C` },
      {
        text: `Divide by the *new* index every time. Dividing $${a}$ by $${m}$ rather than by $${m + 1}$ is the slip, and differentiating the answer back catches it at once.`,
      },
      {
        text: 'One constant covers the whole answer, however many terms there are: a sum of constants is just another constant.',
      },
    ];
  },
};

/**
 * The power rule as two separate questions: the new index of each term, then
 * the coefficient that follows from it.
 *
 * The tree's shape is the point. The top row can be filled without knowing any
 * arithmetic beyond "add one"; the bottom row cannot be filled at all until
 * the box above it is right, which is exactly the dependency the rule has and
 * exactly the one a learner who divides by the old index has missed.
 */
const powerTree: Generator<TwoTermParams> = {
  id: 'int-power-tree',
  sample: sampleTwoTerm,
  render: (params): Slide => {
    const { a, m, b, n } = params;
    const first = a / (m + 1);
    const second = b / (n + 1);
    const answer = [`${m + 1}`, `${n + 1}`, `${first}`, `${second}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Integrate each term. The top row is the new index of each one; the box below it is the coefficient that term ends up with.',
        },
      ],
      expression: twoTermIntegral(params),
      nodes: [
        { id: 'index-first', from: [] },
        { id: 'index-second', from: [] },
        { id: 'coefficient-first', from: ['index-first'] },
        { id: 'coefficient-second', from: ['index-second'] },
      ],
      bank: numberBank(answer, [m, n, a, b, a * m, b * n]),
      answer,
    };
  },
  solution: (params) => {
    const { a, m, b, n } = params;
    const first = a / (m + 1);
    const second = b / (n + 1);
    return [
      { text: 'Raise the index by one, then divide the coefficient by the index you have just arrived at.' },
      { tex: `${termTex(a, m)} \\longrightarrow x^{${m + 1}} \\longrightarrow \\frac{${a}}{${m + 1}} = ${first}` },
      { tex: `${termTex(b, n)} \\longrightarrow x^{${n + 1}} \\longrightarrow \\frac{${b}}{${n + 1}} = ${second}` },
      { tex: `${twoTermIntegral(params)} = ${termTex(first, m + 1)} + ${termTex(second, n + 1)} + C` },
      {
        text: `The order matters: the index has to move before the division happens, because it is the new index that does the dividing. Dividing $${b}$ by $${n}$ gives ${
          Number.isInteger(b / n) ? `$${b / n}$` : 'a fraction'
        }, which is not this answer.`,
      },
    ];
  },
};

interface CheckParams {
  a: number;
  m: number;
  fault: 'none' | 'index' | 'coefficient' | 'both';
}

/**
 * Check somebody else's integral by differentiating it.
 *
 * The course keeps telling the learner that every integral can be checked, and
 * then never asks them to check one. This does: the answer on the slide is
 * sometimes right and sometimes carries one of the two standard slips, and
 * naming which is a different act from producing the integral yourself.
 */
const checkAnswer: Generator<CheckParams> = {
  id: 'int-check-answer',
  // Difficulty 2 moves to negative indices, matching `int-power`, so the
  // lesson on negative powers can ask this without meeting an index its
  // learner has not been shown. Difficulty 1 stays positive for the same
  // reason, two lessons earlier.
  sample: (rng, difficulty) => {
    const m = difficulty > 1 ? nonZero(rng.int(-7, -2), -3) : rng.int(1, 4);
    return {
      a: rng.int(1, difficulty > 1 ? 9 : 6) * Math.abs(m + 1),
      m,
      fault: rng.pick(['none', 'index', 'coefficient', 'both'] as const),
    };
  },
  render: ({ a, m, fault }): Slide => {
    const right = a / (m + 1);
    const claimed =
      fault === 'none'
        ? termTex(right, m + 1)
        : fault === 'index'
          ? termTex(right, m)
          : fault === 'coefficient'
            ? termTex(a, m + 1)
            : termTex(a * m, m - 1);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: 'Somebody has written this down. Differentiate the right-hand side and compare it with the integrand. What, if anything, is wrong?',
        },
        { kind: 'display', tex: `\\int ${termTex(a, m)} \\, dx = ${claimed} + C` },
      ],
      options: [
        { id: 'none', label: 'Nothing — it is correct' },
        { id: 'index', label: 'The index is wrong' },
        { id: 'coefficient', label: 'The coefficient is wrong' },
        { id: 'both', label: 'The coefficient and the index are both wrong' },
      ],
      correctId: fault,
    };
  },
  solution: ({ a, m, fault }) => {
    const right = a / (m + 1);
    const claimed =
      fault === 'none'
        ? termTex(right, m + 1)
        : fault === 'index'
          ? termTex(right, m)
          : fault === 'coefficient'
            ? termTex(a, m + 1)
            : termTex(a * m, m - 1);
    const back =
      fault === 'none'
        ? termTex(a, m)
        : fault === 'index'
          ? termTex(right * m, m - 1)
          : fault === 'coefficient'
            ? termTex(a * (m + 1), m)
            : termTex(a * m * (m - 1), m - 2);
    return [
      { text: 'Differentiate what is claimed and see whether the integrand comes back.' },
      { tex: `\\frac{d}{dx}\\left(${claimed}\\right) = ${back}` },
      {
        text:
          fault === 'none'
            ? `That is $${termTex(a, m)}$, the integrand we started from, so the answer checks out.`
            : `That is not $${termTex(a, m)}$, so the answer is wrong.`,
      },
      { tex: `\\int ${termTex(a, m)} \\, dx = ${termTex(right, m + 1)} + C` },
      {
        text: 'This check is available on every integral in the course and costs one line. Nothing else in mathematics hands you a verification this cheap.',
      },
    ];
  },
};

interface RewriteParams {
  form: 'fraction' | 'root' | 'rootUnder' | 'rootTimes';
  /** Coefficient of the integrand, chosen so the integral stays whole. */
  a: number;
  /** Index of x underneath, for the fraction form. */
  n: number;
}

/**
 * The three pieces a rewrite question is made of: what the learner is shown,
 * the same thing as a power of $x$, and its integral.
 *
 * Held in one place rather than as three parallel ternary chains, because the
 * whole point of the question is that the three lines correspond, and a
 * mismatch between them would be a question with no right answer.
 */
function rewritePieces({ form, a, n }: RewriteParams): {
  shown: string;
  indexForm: string;
  integrated: string;
} {
  if (form === 'fraction') {
    return {
      shown: `\\frac{${a}}{x^{${n}}}`,
      indexForm: coeffTex(a, `x^{-${n}}`),
      integrated: termTex(-a / (n - 1), -(n - 1)),
    };
  }
  if (form === 'root') {
    return {
      shown: coeffTex(a, '\\sqrt{x}'),
      indexForm: coeffTex(a, 'x^{1/2}'),
      integrated: coeffTex((2 * a) / 3, 'x^{3/2}'),
    };
  }
  if (form === 'rootTimes') {
    return {
      shown: coeffTex(a, 'x\\sqrt{x}'),
      indexForm: coeffTex(a, 'x^{3/2}'),
      integrated: coeffTex((2 * a) / 5, 'x^{5/2}'),
    };
  }
  return {
    shown: `\\frac{${a}}{\\sqrt{x}}`,
    indexForm: coeffTex(a, 'x^{-1/2}'),
    integrated: coeffTex(2 * a, 'x^{1/2}'),
  };
}

/**
 * Rewrite as a power of x, then integrate — both steps, side by side.
 *
 * The lessons on negative and fractional indices both say the same thing: the
 * power rule cannot be applied to a fraction or a root until it has been
 * written as a power. Every typed question in those lessons grades only the
 * second step, so a learner who never quite converts can still be right by
 * pattern-matching. Here the index form is its own tile, and getting it wrong
 * puts the wrong integral within easy reach.
 */
const rewritePower: Generator<RewriteParams> = {
  id: 'int-rewrite-power',
  /**
   * Difficulty picks the *case*, not the size of the numbers, because the two
   * cases belong to different lessons: negative whole indices are taught in
   * "Negative Powers" and fractional ones a lesson later in "Roots and
   * Fractional Powers". A question drawn from the wrong half would be asking
   * about something the learner has not met yet.
   */
  sample: (rng, difficulty) => {
    if (difficulty === 1) {
      const n = rng.int(2, 6);
      // a x^{-n} integrates to -a/(n-1) x^{-(n-1)}, so a is a multiple of n-1.
      return { form: 'fraction' as const, a: rng.int(1, 8) * (n - 1), n };
    }
    const form = rng.pick(['root', 'rootUnder', 'rootTimes'] as const);
    if (form === 'root') {
      // a x^{1/2} integrates to (2a/3) x^{3/2}, so a is a multiple of 3.
      return { form, a: rng.int(1, 8) * 3, n: 0 };
    }
    if (form === 'rootTimes') {
      // a x^{3/2} integrates to (2a/5) x^{5/2}, so a is a multiple of 5.
      return { form, a: rng.int(1, 8) * 5, n: 0 };
    }
    // a x^{-1/2} integrates to 2a x^{1/2}, whole for every a.
    return { form, a: rng.int(2, 12), n: 0 };
  },
  render: (params): Slide => {
    const { form, a, n } = params;
    const { shown, indexForm, integrated } = rewritePieces(params);
    const answer = [indexForm, integrated];
    return {
      kind: 'tiles',
      prompt: integralPrompt(
        'Write the integrand as a power of $x$ first, then integrate it.',
        `\\int ${shown} \\, dx`,
      ),
      template: '\\int {0} \\, dx = {1} + C',
      bank: bankOf(answer, [
        // The index left the way round it was written, which is the whole
        // reason for the rewrite.
        form === 'fraction' ? coeffTex(a, `x^{${n}}`) : coeffTex(a, 'x^{-1/2}'),
        // Raised without dividing, and divided without raising.
        form === 'fraction'
          ? coeffTex(a, `x^{-${n - 1}}`)
          : form === 'root'
            ? coeffTex(a, 'x^{3/2}')
            : form === 'rootTimes'
              ? coeffTex(a, 'x^{5/2}')
              : coeffTex(a, 'x^{1/2}'),
        form === 'fraction'
          ? termTex(a / (n - 1), -(n + 1))
          : form === 'root'
            ? coeffTex((2 * a) / 3, 'x^{1/2}')
            : form === 'rootTimes'
              ? coeffTex((2 * a) / 5, 'x^{3/2}')
              : coeffTex(2 * a, 'x^{3/2}'),
        // The sign of the new index dropped.
        form === 'fraction' ? termTex(a / (n - 1), n - 1) : coeffTex(a, 'x^{-3/2}'),
      ]),
      answer,
    };
  },
  solution: ({ form, a, n }) => {
    if (form === 'fraction') {
      return [
        { text: 'A power of $x$ underneath a fraction is a negative power on the top.' },
        { tex: `\\frac{${a}}{x^{${n}}} = ${coeffTex(a, `x^{-${n}}`)}` },
        {
          text: `Now the power rule applies unchanged: adding one to $-${n}$ gives $-${n - 1}$, and the division is by $-${n - 1}$.`,
        },
        { tex: `\\int ${coeffTex(a, `x^{-${n}}`)} \\, dx = \\frac{${coeffTex(a, `x^{-${n - 1}}`)}}{-${n - 1}} = ${termTex(-a / (n - 1), -(n - 1))} + C` },
        {
          text: 'Both minus signs are real and both have to be carried. Trying to integrate while the term is still a fraction is where the guessing starts.',
        },
      ];
    }
    if (form === 'root') {
      return [
        { text: 'A square root is the power $\\frac{1}{2}$, and the rule has never assumed the index was whole.' },
        { tex: `${coeffTex(a, '\\sqrt{x}')} = ${coeffTex(a, 'x^{1/2}')}` },
        {
          text: `Adding one to $\\frac{1}{2}$ gives $\\frac{3}{2}$, and dividing by $\\frac{3}{2}$ multiplies by $\\frac{2}{3}$: $${a} \\times \\frac{2}{3} = ${(2 * a) / 3}$.`,
        },
        { tex: `\\int ${coeffTex(a, 'x^{1/2}')} \\, dx = ${coeffTex((2 * a) / 3, 'x^{3/2}')} + C` },
        {
          text: 'Dividing by a fraction is multiplying by its reciprocal. Writing the division out before simplifying is what keeps that straight.',
        },
      ];
    }
    if (form === 'rootTimes') {
      return [
        { text: '$x$ multiplied by its own square root adds the indices: $1 + \\frac{1}{2}$.' },
        { tex: `${coeffTex(a, 'x\\sqrt{x}')} = ${coeffTex(a, 'x^{3/2}')}` },
        {
          text: `Adding one to $\\frac{3}{2}$ gives $\\frac{5}{2}$, and dividing by $\\frac{5}{2}$ multiplies by $\\frac{2}{5}$: $${a} \\times \\frac{2}{5} = ${(2 * a) / 5}$.`,
        },
        { tex: `\\int ${coeffTex(a, 'x^{3/2}')} \\, dx = ${coeffTex((2 * a) / 5, 'x^{5/2}')} + C` },
        {
          text: 'Nothing about $\\frac{5}{2}$ is harder than $\\frac{3}{2}$; the arithmetic of the fraction is the whole of the difficulty, and writing the division out handles it.',
        },
      ];
    }
    return [
      { text: 'A root underneath a fraction is a negative fractional power, and both negatives have to survive the rewrite.' },
      { tex: `\\frac{${a}}{\\sqrt{x}} = ${coeffTex(a, 'x^{-1/2}')}` },
      {
        text: `Adding one to $-\\frac{1}{2}$ gives $\\frac{1}{2}$, and dividing by $\\frac{1}{2}$ doubles: $${a} \\times 2 = ${2 * a}$.`,
      },
      { tex: `\\int ${coeffTex(a, 'x^{-1/2}')} \\, dx = ${coeffTex(2 * a, 'x^{1/2}')} + C` },
      {
        text: 'The new index comes out positive here, which surprises people. Adding one to a negative index can land either side of zero, and only $-1$ lands on it.',
      },
    ];
  },
};

interface RuleParams {
  route: 'log' | 'power' | 'standard';
  a: number;
  n: number;
  kind: 'plain' | 'fraction' | 'root' | 'exp' | 'sin' | 'cos';
  /**
   * Whether the standard-results fork is part of the tree.
   *
   * "Negative Powers" asks this question two lessons before $e^{kx}$,
   * $\sin(kx)$ and $\cos(kx)$ are taught, and a fork naming them would put
   * three results the learner has never seen in front of them. At difficulty 1
   * the tree therefore stops at the power rule and says so; at difficulty 2,
   * where the level is complete, all three routes are live.
   */
  full: boolean;
}

/**
 * Which rule does this integrand need?
 *
 * Level 1 teaches four results and one exception, and then asks every question
 * after naming which applies. The exception in particular — that $x^{-1}$ goes
 * to a logarithm rather than through the power rule — is the one fact in the
 * level a learner can hold without ever having to act on it, because no
 * question ever puts an index of $-1$ in front of them and lets them reach for
 * the wrong rule.
 *
 * A `choice` slide asking "which rule?" would be a one-in-three guess. Walking
 * the tree makes the learner commit to a reason at each fork, and the first
 * fork is the exception, where it belongs.
 */
const whichRule: Generator<RuleParams> = {
  id: 'int-which-rule',
  sample: (rng, difficulty) => {
    const full = difficulty > 1;
    const route = full ? rng.pick(['log', 'power', 'standard'] as const) : rng.pick(['log', 'power'] as const);
    if (route === 'log') {
      return { route, a: rng.int(1, full ? 12 : 9), n: 1, kind: 'fraction' as const, full };
    }
    if (route === 'power') {
      const kind = rng.pick(['plain', 'fraction', 'root'] as const);
      return {
        route,
        a: rng.int(1, full ? 9 : 8),
        n: kind === 'fraction' ? rng.int(2, full ? 6 : 5) : rng.int(2, full ? 7 : 6),
        kind,
        full,
      };
    }
    return {
      route,
      a: rng.int(1, 9),
      n: rng.int(2, 8),
      kind: rng.pick(['exp', 'sin', 'cos'] as const),
      full,
    };
  },
  render: ({ route, a, n, kind, full }): Slide => {
    const integrand =
      route === 'log'
        ? `\\frac{${a}}{x}`
        : kind === 'plain'
          ? termTex(a, n)
          : kind === 'fraction'
            ? `\\frac{${a}}{x^{${n}}}`
            : kind === 'root'
              ? coeffTex(a, '\\sqrt{x}')
              : kind === 'exp'
                ? coeffTex(a, `e^{${termTex(n, 1)}}`)
                : coeffTex(a, `\\${kind}\\left(${termTex(n, 1)}\\right)`);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Decide which result this integral needs. Each answer chooses what gets asked next.',
        },
      ],
      subject: `\\int ${integrand} \\, dx`,
      steps: [
        {
          id: 'reciprocal',
          ask: 'Written as a power of $x$, is the index exactly $-1$ — is this a multiple of $\\frac{1}{x}$?',
          branches: [
            { label: 'Yes', outcome: 'The one index the power rule cannot reach. The integral is a logarithm: $\\ln|x| + C$, times the coefficient.' },
            { label: 'No', to: 'power' },
          ],
        },
        {
          id: 'power',
          ask: 'Can it be written as a power of $x$ at all — including a root, or a fraction turned upside down?',
          branches: [
            { label: 'Yes', outcome: 'Rewrite it as a power, then raise the index by one and divide by the new index.' },
            full
              ? { label: 'No', to: 'standard' }
              : { label: 'No', outcome: 'Then the power rule cannot reach it, and neither can the logarithm. It needs one of the standard results still to come in this level.' },
          ],
        },
        ...(full
          ? [
              {
                id: 'standard',
                ask: 'Is it one of the three standard results — $e^{kx}$, $\\sin(kx)$ or $\\cos(kx)$?',
                branches: [
                  { label: 'Yes', outcome: 'Use the standard result, and divide by the coefficient of $x$ inside the function.' },
                  { label: 'No', outcome: 'None of these results reaches it; it needs one of the techniques in Techniques of Integration.' },
                ],
              },
            ]
          : []),
      ],
      answer: route === 'log' ? ['Yes'] : route === 'power' ? ['No', 'Yes'] : ['No', 'No', 'Yes'],
    };
  },
  solution: ({ route, a, n, kind }) => {
    if (route === 'log') {
      return [
        { text: `$\\frac{${a}}{x}$ is $${coeffTex(a, 'x^{-1}')}$, and $-1$ is the single index the power rule cannot reach — adding one to it gives zero, and the rule would divide by zero.` },
        { tex: `\\int \\frac{${a}}{x} \\, dx = ${coeffTex(a, '\\ln|x|')} + C` },
        {
          text: 'The modulus signs matter, because $\\frac{1}{x}$ is defined on both sides of zero and $\\ln x$ is defined on only one.',
        },
        { text: 'Checking the index before starting is what makes this cheap. It is the first thing to look at whenever an index is negative.' },
      ];
    }
    if (route === 'power') {
      const shown =
        kind === 'plain' ? termTex(a, n) : kind === 'fraction' ? `\\frac{${a}}{x^{${n}}}` : coeffTex(a, '\\sqrt{x}');
      const asPower =
        kind === 'plain' ? termTex(a, n) : kind === 'fraction' ? coeffTex(a, `x^{-${n}}`) : coeffTex(a, 'x^{1/2}');
      return [
        { text: `The index is not $-1$, and $${shown}$ is a power of $x$ once it is written as one.` },
        { tex: `${shown} = ${asPower}` },
        { text: 'So the power rule applies: raise the index by one, divide by the new index.' },
        {
          text: 'Fractions and roots both count. Rewriting is part of the method, not a separate decision — the rule only ever sees $x^{n}$.',
        },
      ];
    }
    const shown =
      kind === 'exp' ? coeffTex(a, `e^{${termTex(n, 1)}}`) : coeffTex(a, `\\${kind}\\left(${termTex(n, 1)}\\right)`);
    const integrated =
      kind === 'exp'
        ? `\\frac{${coeffTex(a, `e^{${termTex(n, 1)}}`)}}{${n}}`
        : kind === 'sin'
          ? `-\\frac{${coeffTex(a, `\\cos\\left(${termTex(n, 1)}\\right)`)}}{${n}}`
          : `\\frac{${coeffTex(a, `\\sin\\left(${termTex(n, 1)}\\right)`)}}{${n}}`;
    return [
      { text: `$${shown}$ is not a power of $x$ at all, so neither of the first two routes reaches it; it is one of the three standard results.` },
      { tex: `\\int ${shown} \\, dx = ${integrated} + C` },
      {
        text: `The division by $${n}$ is there because differentiating would produce a factor of $${n}$ by the chain rule, and the integral cancels it in advance.`,
      },
      {
        text:
          kind === 'sin'
            ? 'Sine integrates to *minus* cosine. Under differentiation the minus sign belongs to cosine, and the pair runs the other way round under integration.'
            : 'Differentiating the answer is the check, and it catches a missing division immediately: an extra factor appears where none should be.',
      },
    ];
  },
};

interface StandardParams {
  /** Coefficient of the exponential's antiderivative. */
  first: number;
  k: number;
  /** Coefficient of the trigonometric antiderivative. */
  second: number;
  m: number;
  form: 'sin' | 'cos';
}

/**
 * Assemble the antiderivative of an exponential plus a trigonometric term.
 *
 * Both of the level's traps are in the tiles rather than in the arithmetic:
 * the division by the coefficient inside the function, and the minus sign that
 * appears when sine is the one being integrated. Offering the undivided term
 * and the wrong-signed term as neighbours in the bank is a sharper question
 * than a typed answer, where a learner who writes $\cos$ for $-\cos$ simply
 * sees "wrong" with no indication of which half went astray.
 */
const standardTiles: Generator<StandardParams> = {
  id: 'int-standard-tiles',
  sample: (rng, difficulty) => ({
    first: rng.int(1, difficulty > 1 ? 7 : 5),
    k: rng.int(2, difficulty > 1 ? 7 : 5),
    second: rng.int(1, difficulty > 1 ? 7 : 5),
    m: rng.int(2, difficulty > 1 ? 8 : 6),
    form: rng.pick(['sin', 'cos'] as const),
  }),
  render: ({ first, k, second, m, form }): Slide => {
    const exponential = `e^{${termTex(k, 1)}}`;
    const wave = `\\${form}\\left(${termTex(m, 1)}\\right)`;
    const other = `\\${form === 'sin' ? 'cos' : 'sin'}\\left(${termTex(m, 1)}\\right)`;
    // Integrating sine turns it into minus cosine; cosine into plus sine.
    const sign = form === 'sin' ? -1 : 1;
    const answer = [coeffTex(first, exponential), signedCoefTex(sign * second, other)];
    return {
      kind: 'tiles',
      prompt: integralPrompt(
        'Integrate both terms and place the answer.',
        `\\int \\left(${coeffTex(first * k, exponential)} ${signedCoefTex(second * m, wave)}\\right) \\, dx`,
      ),
      template: '= {0} {1} + C',
      bank: bankOf(answer, [
        // Never divided by the coefficient inside the function.
        coeffTex(first * k, exponential),
        signedCoefTex(sign * second * m, other),
        // The sign of the trigonometric result flipped.
        signedCoefTex(-sign * second, other),
        // The function left as it was, rather than turned into its partner.
        signedCoefTex(sign * second, wave),
        // Multiplied by the coefficient instead of divided by it.
        coeffTex(first * k * k, exponential),
      ]),
      answer,
    };
  },
  solution: ({ first, k, second, m, form }) => {
    const exponential = `e^{${termTex(k, 1)}}`;
    const wave = `\\${form}\\left(${termTex(m, 1)}\\right)`;
    const other = `\\${form === 'sin' ? 'cos' : 'sin'}\\left(${termTex(m, 1)}\\right)`;
    const sign = form === 'sin' ? -1 : 1;
    return [
      { text: 'Each term is its own standard result, and each divides by the coefficient of $x$ inside it.' },
      { tex: `\\int ${coeffTex(first * k, exponential)} \\, dx = \\frac{${coeffTex(first * k, exponential)}}{${k}} = ${coeffTex(first, exponential)}` },
      {
        tex: `\\int ${coeffTex(second * m, wave)} \\, dx = ${
          form === 'sin' ? `-\\frac{${coeffTex(second * m, other)}}{${m}}` : `\\frac{${coeffTex(second * m, other)}}{${m}}`
        } = ${coeffTex(sign * second, other)}`,
      },
      {
        text:
          form === 'sin'
            ? `Sine integrates to *minus* cosine, so the second term arrives with a sign it did not start with.`
            : `Cosine integrates to plus sine, and it is sine — not cosine — that picks up the minus sign under integration.`,
      },
      {
        text: `Both divisions come from the chain rule: differentiating the answer would produce factors of $${k}$ and $${m}$, so the integral removes them in advance.`,
      },
    ];
  },
};

interface ConstantParams {
  /** Coefficient of the gradient, a multiple of the new index. */
  a: number;
  m: number;
  p: number;
  c: number;
}

/**
 * Find the constant of integration from a point the curve passes through.
 *
 * Level 1 says over and over that $C$ is part of the answer rather than
 * decoration, and then never gives the learner a reason to care what it is.
 * This does: the constant is the whole answer here, and it cannot be found
 * without integrating correctly first.
 */
const constantThroughPoint: Generator<ConstantParams> = {
  id: 'int-constant-point',
  choices: ({ a, m, p, c }) => {
    const coefficient = a / (m + 1);
    const atPoint = coefficient * Math.pow(p, m + 1);
    return options(
      { tex: `${c}`, answer: `${c}` },
      { tex: `${-c}`, answer: `${-c}` },
      // Read the point's y value straight off as the constant.
      { tex: `${atPoint + c}`, answer: `${atPoint + c}` },
      // Added the curve's value at the point instead of subtracting it.
      { tex: `${2 * atPoint + c}`, answer: `${2 * atPoint + c}` },
    );
  },
  sample: (rng, difficulty) => {
    const m = rng.int(1, difficulty > 1 ? 4 : 2);
    return {
      a: rng.int(1, difficulty > 1 ? 6 : 4) * (m + 1),
      m,
      p: rng.int(1, difficulty > 1 ? 4 : 3),
      c: nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), 5),
    };
  },
  render: ({ a, m, p, c }): Slide => {
    const coefficient = a / (m + 1);
    const y = coefficient * Math.pow(p, m + 1) + c;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `A curve has gradient $\\frac{dy}{dx} = ${termTex(a, m)}$ and passes through the point $\\left(${p}, ${y}\\right)$. Integrate, then use the point to find the constant of integration.`,
        },
      ],
      lead: 'C =',
      keypad: [],
      answer: `${c}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, m, p, c }) => {
    const coefficient = a / (m + 1);
    const atPoint = coefficient * Math.pow(p, m + 1);
    const y = atPoint + c;
    return [
      { text: 'Integrate the gradient first. The constant is unknown at this stage, which is the point of carrying it.' },
      { tex: `y = \\int ${termTex(a, m)} \\, dx = ${termTex(coefficient, m + 1)} + C` },
      { text: `Now substitute the point: at $x = ${p}$ the curve is at $y = ${y}$.` },
      { tex: `${y} = ${coefficient} \\times ${p}^{${m + 1}} + C = ${atPoint} + C` },
      { tex: `C = ${y} - \\left(${atPoint}\\right) = ${c}` },
      {
        text: 'Every curve with this gradient has the same shape; the point is what picks out which one. Without it there is no single answer at all, which is exactly what the $C$ has been saying all along.',
      },
    ];
  },
};

/* ---------- Level 2: limits, taken apart ---------- */

interface DefiniteShapeParams {
  form: 'power' | 'line';
  /** Coefficient of the antiderivative's leading term. */
  scale: number;
  n: number;
  /** Constant term of the line form. */
  b: number;
  lower: number;
  upper: number;
}

function sampleDefinite(
  rng: { int(min: number, max: number): number; pick<T>(items: readonly T[]): T },
  difficulty: number,
): DefiniteShapeParams {
  const form = rng.pick(['power', 'line'] as const);
  const lower = rng.int(difficulty > 1 ? -3 : 0, 2);
  return {
    form,
    scale: rng.int(1, difficulty > 1 ? 5 : 4),
    n: rng.int(1, difficulty > 1 ? 3 : 2),
    b: nonZero(rng.int(-6, 6), 3),
    lower,
    upper: lower + rng.int(1, difficulty > 1 ? 4 : 3),
  };
}

/** The integrand, and the antiderivative it is evaluated through. */
function definitePieces({ form, scale, n, b }: DefiniteShapeParams): {
  integrand: string;
  antiderivative: string;
  at: (x: number) => number;
} {
  if (form === 'power') {
    return {
      integrand: termTex(scale * (n + 1), n),
      antiderivative: termTex(scale, n + 1),
      at: (x) => scale * Math.pow(x, n + 1),
    };
  }
  return {
    integrand: `${termTex(2 * scale, 1)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`,
    antiderivative: `${termTex(scale, 2)} ${b < 0 ? '-' : '+'} ${termTex(Math.abs(b), 1)}`,
    at: (x) => scale * x * x + b * x,
  };
}

/**
 * Evaluating a definite integral as a tree: the value at each limit, then the
 * one subtraction between them.
 *
 * `int-definite-steps` already reduces this arithmetic, but it hands the
 * learner an antiderivative of one term and walks them through the powers.
 * This asks for $F$ at each limit as a single number — the step a learner
 * actually does in their head — and puts the subtraction in a box of its own,
 * fed by both, so the order of the subtraction is a visible property of the
 * picture rather than a convention to remember.
 */
const definiteTree: Generator<DefiniteShapeParams> = {
  id: 'int-definite-tree',
  sample: sampleDefinite,
  render: (params): Slide => {
    const { lower, upper } = params;
    const { integrand, antiderivative, at } = definitePieces(params);
    const answer = [`${at(upper)}`, `${at(lower)}`, `${at(upper) - at(lower)}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The antiderivative is $F(x) = ${antiderivative}$. Fill the top row with its value at the upper limit and then at the lower limit, and the box below with the result of the integral.`,
        },
      ],
      expression: `\\int_{${lower}}^{${upper}} \\left(${integrand}\\right) \\, dx = \\left[${antiderivative}\\right]_{${lower}}^{${upper}}`,
      nodes: [
        { id: 'upper', from: [] },
        { id: 'lower', from: [] },
        { id: 'total', from: ['upper', 'lower'] },
      ],
      bank: numberBank(answer, [
        at(upper) + at(lower),
        at(lower) - at(upper),
        -at(upper),
        -at(lower),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { lower, upper } = params;
    const { integrand, antiderivative, at } = definitePieces(params);
    return [
      { text: 'Substitute each limit into the antiderivative separately, and subtract only once, at the end.' },
      { tex: `\\int_{${lower}}^{${upper}} \\left(${integrand}\\right) \\, dx = \\left[${antiderivative}\\right]_{${lower}}^{${upper}}` },
      { tex: `= ${at(upper)} - \\left(${at(lower)}\\right) = ${at(upper) - at(lower)}` },
      {
        text:
          at(lower) < 0
            ? `The value at the lower limit is negative here, so the subtraction becomes "minus a negative" and the total grows. Dropping that bracket is how the sign gets lost.`
            : 'Bracket the lower value before subtracting it. It costs nothing when the value is positive and saves the answer when it is not.',
      },
      {
        text: `Upper minus lower, in that order. The other way round gives $${at(lower) - at(upper)}$ — the right size with the wrong sign.`,
      },
    ];
  },
};

/**
 * The square-bracket line: the antiderivative, then the number it comes to.
 *
 * Between "integrate this" and "here is the answer" sits a line of notation
 * that the course shows constantly and never asks for. Writing it is what
 * keeps the two halves of the calculation apart, and a learner who goes
 * straight from the integral to a number is the one who subtracts the limits
 * before integrating them.
 */
const limitsTiles: Generator<DefiniteShapeParams> = {
  id: 'int-limits-tiles',
  sample: sampleDefinite,
  render: (params): Slide => {
    const { lower, upper } = params;
    const { integrand, antiderivative, at } = definitePieces(params);
    const total = at(upper) - at(lower);
    const answer = [antiderivative, `${total}`];
    return {
      kind: 'tiles',
      prompt: integralPrompt(
        'Fill in the square-bracket line, then the number the integral comes to.',
        `\\int_{${lower}}^{${upper}} \\left(${integrand}\\right) \\, dx`,
      ),
      template: `= [ {0} ]_${limitTex(lower)}^${limitTex(upper)} = {1}`,
      bank: bankOf(answer, [
        // The integrand copied through unintegrated.
        integrand,
        // The value at the upper limit alone, and the two standard sign slips.
        `${at(upper)}`,
        `${at(lower) - at(upper)}`,
        `${at(upper) + at(lower)}`,
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { lower, upper } = params;
    const { integrand, antiderivative, at } = definitePieces(params);
    return [
      { text: 'Integrate first and write the result in square brackets with the limits still attached. Nothing has been substituted yet at that stage.' },
      { tex: `\\int_{${lower}}^{${upper}} \\left(${integrand}\\right) \\, dx = \\left[${antiderivative}\\right]_{${lower}}^{${upper}}` },
      { tex: `= ${at(upper)} - \\left(${at(lower)}\\right) = ${at(upper) - at(lower)}` },
      {
        text: 'No constant of integration appears, and that is not an oversight: it would be added at the top and subtracted at the bottom, so it cancels.',
      },
      {
        text: `Writing that middle line is what stops the two halves running together. Substituting before integrating gives ${
          at(upper) - at(lower) === upper - lower ? 'the right answer here by accident' : 'a different number entirely'
        }, and the habit fails as soon as the limits move.`,
      },
    ];
  },
};

interface AreaSliderParams {
  /** Half the gradient, so the area under the line stays whole. */
  half: number;
  answer: number;
}

/**
 * Drag the upper limit until the area is the one asked for.
 *
 * Every other area question in the level runs the calculation forwards: here
 * are two limits, what is the area. This runs it backwards, which is the
 * question a real problem asks — how far along do I have to go to enclose this
 * much — and it cannot be answered by executing a remembered procedure.
 *
 * The line is drawn through the origin so the lower limit is zero and the area
 * is $kb^{2}$, whole for every whole $b$. A slider whose answer sat between
 * two steps would be unanswerable rather than hard.
 */
const areaSlider: Generator<AreaSliderParams> = {
  id: 'int-area-slider',
  sample: (rng, difficulty) => ({
    half: rng.int(1, difficulty > 1 ? 8 : 6),
    answer: rng.int(1, 6),
  }),
  render: ({ half, answer }): Slide => {
    const gradient = 2 * half;
    const area = half * answer * answer;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `Slide the upper limit $b$ until the region under $y = ${termTex(gradient, 1)}$, measured from the origin, has area exactly $${area}$.`,
        },
      ],
      min: 0,
      max: 8,
      step: 1,
      answer,
      readout: 'b = {v}',
      figure: plotFigure(plotSvg({
          xMin: 0,
          xMax: 8,
          yMin: 0,
          yMax: gradient * 8,
          curves: [{ f: (x) => gradient * x }],
          label: `The line y = ${gradient}x from x = 0 to x = 8`,
        })),
    };
  },
  solution: ({ half, answer }) => {
    const gradient = 2 * half;
    const area = half * answer * answer;
    return [
      { text: 'Write the area as an integral with the upper limit left as a letter, and integrate as usual.' },
      { tex: `\\int_{0}^{b} ${termTex(gradient, 1)} \\, dx = \\left[${termTex(half, 2)}\\right]_{0}^{b} = ${termTex(half, 2).replace('x', 'b')}` },
      { text: `Now set that equal to the area you were given and solve for $b$.` },
      { tex: `${half === 1 ? '' : half}b^{2} = ${area} \\quad \\Rightarrow \\quad b = ${answer}` },
      {
        text: `The region is a triangle, so this one can be checked without calculus: base $${answer}$, height $${gradient * answer}$, and half of their product is $${area}$.`,
      },
    ];
  },
};

/* ---------- Level 3: the techniques, set up rather than run ---------- */

interface SubstitutionSetupParams {
  /** Coefficient outside the bracket; even, so half of it stays whole. */
  a: number;
  b: number;
  power: number;
}

/**
 * The substitution itself: $u$, its derivative, and the integral in $u$.
 *
 * `int-substitution` grades the finished answer, so it cannot tell a learner
 * who chose $u$ well and then mishandled the constant from one who chose $u$
 * badly and recovered. Three tiles separate the choice from the bookkeeping,
 * and the bank offers the two wrong choices that actually get made: the
 * bracket without its constant, and the whole coefficient carried across
 * instead of half of it.
 */
const substitutionTiles: Generator<SubstitutionSetupParams> = {
  id: 'int-substitution-tiles',
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty > 1 ? 6 : 4) * 2,
    b: nonZero(rng.int(difficulty > 1 ? -5 : 1, 6), 2),
    power: rng.int(2, difficulty > 1 ? 7 : 5),
  }),
  render: ({ a, b, power }): Slide => {
    const inner = `x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
    const half = a / 2;
    const answer = [inner, '2x', coeffTex(half, `u^{${power}}`)];
    return {
      kind: 'tiles',
      prompt: integralPrompt(
        'Set the substitution up: what $u$ is, what its derivative is, and what the integral becomes once $x$ has gone.',
        `\\int ${termTex(a, 1)}\\left(${inner}\\right)^{${power}} \\, dx`,
      ),
      template: 'u = {0} \\qquad \\frac{du}{dx} = {1} \\qquad \\int {2} \\, du',
      bank: bankOf(answer, [
        // The bracket without its constant, and the whole integrand as u.
        'x^{2}',
        `${termTex(a, 1)}\\left(${inner}\\right)^{${power}}`,
        // Derivative slips: the coefficient outside, and the constant kept.
        termTex(a, 1),
        `2x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`,
        // The coefficient carried across whole rather than halved.
        coeffTex(a, `u^{${power}}`),
        // Integrated a step too early.
        coeffTex(half, `u^{${power + 1}}`),
      ]),
      answer,
    };
  },
  solution: ({ a, b, power }) => {
    const inner = `x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
    const half = a / 2;
    const n = power + 1;
    return [
      {
        text: `Inside the bracket is $${inner}$, whose derivative is $2x$ — and there is an $x$ sitting outside the bracket. That pairing is what makes the substitution available.`,
      },
      { tex: `u = ${inner} \\qquad \\frac{du}{dx} = 2x \\qquad 2x \\, dx = du` },
      {
        text: `The integrand carries $${termTex(a, 1)} \\, dx$, which is $${half}$ lots of $2x \\, dx$, so it becomes $${half} \\, du$.`,
      },
      { tex: `\\int ${termTex(a, 1)}\\left(${inner}\\right)^{${power}} \\, dx = ${coeffTex(half, '')}\\int u^{${power}} \\, du = \\frac{${coeffTex(half, `u^{${n}}`)}}{${n}} + C` },
      {
        text: 'A constant factor left over is no obstacle. An $x$ left over is: it means the substitution has failed and a different $u$ is needed.',
      },
    ];
  },
};

interface PartsSetupParams {
  form: 'exp' | 'sin' | 'cos' | 'log';
  k: number;
  power: number;
}

/**
 * Choosing $u$ and $\frac{dv}{dx}$, which is the whole of integration by parts.
 *
 * The formula is mechanical once the split is made, and every typed question
 * in these two lessons grades the mechanics. What decides whether the method
 * terminates is the split, and the logarithm case reverses the rule the
 * previous lesson gave — so the two are deliberately sampled together here,
 * and the bank always offers the other way round.
 */
const partsTiles: Generator<PartsSetupParams> = {
  id: 'int-parts-tiles',
  // `k` is unused by the logarithm form, so the pool is three forms' worth of
  // coefficients plus one form's worth of powers rather than the product of
  // the two — which is how a narrower range here fell under the
  // 25-distinct-questions floor and had to be widened.
  sample: (rng, difficulty) => {
    const form = rng.pick(['exp', 'sin', 'cos', 'log'] as const);
    return {
      form,
      k: rng.int(2, difficulty > 1 ? 12 : 9),
      power: rng.int(1, difficulty > 1 ? 7 : 5),
    };
  },
  render: ({ form, k, power }): Slide => {
    if (form === 'log') {
      const n = power + 1;
      const answer = ['\\ln x', `x^{${power}}`, `\\frac{x^{${n}}}{${n}}`];
      return {
        kind: 'tiles',
        prompt: integralPrompt(
          'Split this for integration by parts: which factor is $u$, which is $\\frac{dv}{dx}$, and what $v$ comes to.',
          `\\int x^{${power}}\\ln x \\, dx`,
        ),
        template: 'u = {0} \\qquad \\frac{dv}{dx} = {1} \\qquad v = {2}',
        bank: bankOf(answer, [
          // The other way round, which is the rule for every other integrand.
          `\\frac{x^{${n}}}{${power}}`,
          `x^{${n}}`,
          '\\frac{1}{x}',
          `\\frac{x^{${n}}}{${n * n}}`,
        ]),
        answer,
      };
    }
    const body =
      form === 'exp' ? `e^{${termTex(k, 1)}}` : `\\${form}\\left(${termTex(k, 1)}\\right)`;
    const integrated =
      form === 'exp'
        ? `\\frac{e^{${termTex(k, 1)}}}{${k}}`
        : form === 'sin'
          ? `-\\frac{\\cos\\left(${termTex(k, 1)}\\right)}{${k}}`
          : `\\frac{\\sin\\left(${termTex(k, 1)}\\right)}{${k}}`;
    const answer = ['x', body, integrated];
    return {
      kind: 'tiles',
      prompt: integralPrompt(
        'Split this for integration by parts: which factor is $u$, which is $\\frac{dv}{dx}$, and what $v$ comes to.',
        `\\int x${body} \\, dx`,
      ),
      template: 'u = {0} \\qquad \\frac{dv}{dx} = {1} \\qquad v = {2}',
      bank: bankOf(answer, [
        // Choosing u the other way round, which raises the power instead.
        '\\frac{x^{2}}{2}',
        // v without the division the chain rule demands.
        form === 'exp'
          ? `e^{${termTex(k, 1)}}`
          : form === 'sin'
            ? `-\\cos\\left(${termTex(k, 1)}\\right)`
            : `\\sin\\left(${termTex(k, 1)}\\right)`,
        // The sign of the trigonometric integral flipped.
        form === 'sin'
          ? `\\frac{\\cos\\left(${termTex(k, 1)}\\right)}{${k}}`
          : form === 'cos'
            ? `-\\frac{\\sin\\left(${termTex(k, 1)}\\right)}{${k}}`
            : `${k}e^{${termTex(k, 1)}}`,
        '1',
      ]),
      answer,
    };
  },
  solution: ({ form, k, power }) => {
    if (form === 'log') {
      const n = power + 1;
      return [
        {
          text: 'The logarithm is the exception to "the polynomial is always $u$". It has no standard integral to be $\\frac{dv}{dx}$, and its derivative is about as simple as a function gets.',
        },
        { tex: `u = \\ln x \\qquad \\frac{dv}{dx} = x^{${power}} \\qquad \\frac{du}{dx} = \\frac{1}{x} \\qquad v = \\frac{x^{${n}}}{${n}}` },
        { tex: `\\int x^{${power}}\\ln x \\, dx = \\frac{x^{${n}}}{${n}}\\ln x - \\int \\frac{x^{${n}}}{${n}} \\times \\frac{1}{x} \\, dx` },
        { tex: `= \\frac{x^{${n}}}{${n}}\\ln x - \\frac{x^{${n}}}{${n * n}} + C` },
        {
          text: `The $\\frac{1}{x}$ cancels a power of $x$ in the second integral, which is what makes it easy; and the second denominator is the square of the first, $${n}$ and $${n * n}$.`,
        },
      ];
    }
    const body = form === 'exp' ? `e^{${termTex(k, 1)}}` : `\\${form}\\left(${termTex(k, 1)}\\right)`;
    const integrated =
      form === 'exp'
        ? `\\frac{e^{${termTex(k, 1)}}}{${k}}`
        : form === 'sin'
          ? `-\\frac{\\cos\\left(${termTex(k, 1)}\\right)}{${k}}`
          : `\\frac{\\sin\\left(${termTex(k, 1)}\\right)}{${k}}`;
    return [
      { text: 'Choose $u$ to be the factor that gets simpler when differentiated. Differentiating $x$ gives 1, which removes it from the second integral entirely.' },
      { tex: `u = x \\qquad \\frac{dv}{dx} = ${body} \\qquad \\frac{du}{dx} = 1 \\qquad v = ${integrated}` },
      { tex: `\\int x${body} \\, dx = x \\times ${integrated} - \\int ${integrated} \\, dx` },
      {
        text: `The $v$ carries a division by $${k}$, for the usual chain-rule reason. Leaving it out makes every later line wrong by a factor of $${k}$.`,
      },
      {
        text: 'The other way round makes matters worse: $u = ' +
          body +
          '$ puts $\\frac{x^{2}}{2}$ into the second integral, a higher power than before, and applying the method again raises it further.',
      },
    ];
  },
};

interface BracketTreeParams {
  a: number;
  b: number;
  power: number;
}

/**
 * The two divisions a linear bracket needs, and where each comes from.
 *
 * Missing the division by the coefficient inside the bracket is named in the
 * lesson as *the* characteristic error, and the typed question can only report
 * that the answer is wrong. Here the new index and the chain-rule factor are
 * separate boxes feeding one divisor, so an answer that divides by the index
 * alone is visibly half-filled rather than merely incorrect.
 */
const bracketTree: Generator<BracketTreeParams> = {
  id: 'int-bracket-tree',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 7 : 5),
    b: nonZero(rng.int(-6, 6), 4),
    power: rng.int(2, difficulty > 1 ? 7 : 5),
  }),
  render: ({ a, b, power }): Slide => {
    const n = power + 1;
    const bracket = `\\left(${termTex(a, 1)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)`;
    const answer = [`${n}`, `${a}`, `${a * n}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Top row: the new index, and the factor the chain rule would produce if you differentiated the bracket. Below them: the number the answer is divided by.',
        },
      ],
      expression: `\\int ${bracket}^{${power}} \\, dx = \\frac{${bracket}^{${n}}}{?}`,
      nodes: [
        { id: 'index', from: [] },
        { id: 'chain', from: [] },
        { id: 'divisor', from: ['index', 'chain'] },
      ],
      bank: numberBank(answer, [power, a + n, a * power, Math.abs(b)]),
      answer,
    };
  },
  solution: ({ a, b, power }) => {
    const n = power + 1;
    const bracket = `\\left(${termTex(a, 1)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)`;
    return [
      { text: 'Treat the bracket as though it were $x$: raise the index by one and divide by the new index.' },
      { tex: `\\int ${bracket}^{${power}} \\, dx = \\frac{${bracket}^{${n}}}{${n}} \\times \\frac{1}{${a}} + C` },
      {
        text: `Then divide again by $${a}$, the coefficient of $x$ inside the bracket, because differentiating would produce that factor by the chain rule.`,
      },
      { tex: `= \\frac{${bracket}^{${n}}}{${a * n}} + C` },
      {
        text: `So the divisor is $${n} \\times ${a} = ${a * n}$, and the two halves of it come from different places. Missing the second is invisible when the coefficient is 1, which is why such a question proves nothing.`,
      },
    ];
  },
};

interface LimitChangeParams {
  a: number;
  b: number;
  power: number;
  lower: number;
  upper: number;
}

/**
 * Converting the limits when the variable changes.
 *
 * The trap the lesson names — writing the antiderivative in $u$ and then using
 * the $x$ limits on it — is a trap precisely because the working looks right.
 * The only defence is doing the conversion as its own step, the moment $u$
 * appears, which is what this asks for and nothing else in the course does.
 */
const limitChange: Generator<LimitChangeParams> = {
  id: 'int-limits-change',
  sample: (rng, difficulty) => {
    const lower = rng.int(difficulty > 1 ? -3 : 0, 2);
    return {
      a: rng.int(1, difficulty > 1 ? 6 : 4) * 2,
      b: nonZero(rng.int(difficulty > 1 ? -5 : 1, 6), 2),
      power: rng.int(2, difficulty > 1 ? 6 : 4),
      lower,
      upper: lower + rng.int(1, 3),
    };
  },
  render: ({ a, b, power, lower, upper }): Slide => {
    const inner = `x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
    const atLower = lower * lower + b;
    const atUpper = upper * upper + b;
    const answer = [`${atLower}`, `${atUpper}`];
    return {
      kind: 'tiles',
      prompt: integralPrompt(
        `Substituting $u = ${inner}$ changes the variable, so the limits have to change with it. What do they become?`,
        `\\int_{${lower}}^{${upper}} ${termTex(a, 1)}\\left(${inner}\\right)^{${power}} \\, dx`,
      ),
      template: `x = ${lower} \\Rightarrow u = {0} \\qquad x = ${upper} \\Rightarrow u = {1}`,
      bank: numberBank(answer, [
        // The limits carried across unchanged, and the square forgotten.
        lower,
        upper,
        lower + b,
        upper + b,
        lower * lower,
        upper * upper,
      ]),
      answer,
    };
  },
  solution: ({ a, b, power, lower, upper }) => {
    const inner = `x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
    const atLower = lower * lower + b;
    const atUpper = upper * upper + b;
    const half = a / 2;
    return [
      { text: `Put $u = ${inner}$ and work out what $u$ is at each end of the interval.` },
      { tex: `x = ${lower} \\Rightarrow u = \\left(${lower}\\right)^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${atLower}` },
      { tex: `x = ${upper} \\Rightarrow u = \\left(${upper}\\right)^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${atUpper}` },
      { tex: `\\int_{${lower}}^{${upper}} ${termTex(a, 1)}\\left(${inner}\\right)^{${power}} \\, dx = ${half}\\int_{${atLower}}^{${atUpper}} u^{${power}} \\, du` },
      {
        text: `Write the new limits on the integral sign the moment $u$ appears. Leaving $${lower}$ and $${upper}$ there while the variable is $u$ is the error, and the working looks perfectly tidy while it happens.`,
      },
    ];
  },
};

export const integrationShapeGenerators = [
  termTiles,
  powerTree,
  checkAnswer,
  rewritePower,
  whichRule,
  standardTiles,
  constantThroughPoint,
  definiteTree,
  limitsTiles,
  areaSlider,
  substitutionTiles,
  partsTiles,
  bracketTree,
  limitChange,
] as unknown as Generator<unknown>[];
