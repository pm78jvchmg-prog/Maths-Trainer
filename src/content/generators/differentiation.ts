/**
 * Differentiation generators.
 *
 * Answers are graded by equivalence, so a learner may write 6x, 3*2x or 2x*3
 * and all pass. That freedom is why this course can ask for a typed expression
 * rather than offering multiple choice.
 *
 * Throughout, `*Tex` values are what the learner reads and `answer` is what
 * mathjs grades — the two are never the same string.
 */
import type { Generator, SolutionStep } from '../types';
import {
  ALGEBRA_KEYS,
  TRIG_KEYS,
  EXP_KEYS,
  termTex,
  termAnswer,
  sumTex,
  sumAnswer,
  ddx,
} from './calculus';

/* ---------- Power rule ---------- */

interface PowerParams { coefficient: number; power: number }

export const powerRule: Generator<PowerParams> = {
  id: 'power-rule',
  sample: (rng, difficulty) => ({
    coefficient: rng.int(2, difficulty >= 2 ? 12 : 9),
    // Difficulty 2 admits negative powers, where the exponent gets more negative.
    power: difficulty >= 2 ? rng.pick([-4, -3, -2, 4, 5, 6, 7]) : rng.int(2, 7),
  }),
  render: ({ coefficient, power }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Differentiate with respect to $x$.' },
      { kind: 'display', tex: `y = ${termTex(coefficient, power)}` },
    ],
    lead: '\\frac{dy}{dx} =',
    keypad: ALGEBRA_KEYS,
    answer: termAnswer(coefficient * power, power - 1),
    source: termAnswer(coefficient, power),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ coefficient, power }) => [
    {
      text: 'Bring the power down as a multiplier, then reduce the power by one.',
      tex: `${ddx('ax^{n}')} = anx^{n-1}`,
    },
    {
      text: `Here $a = ${coefficient}$ and $n = ${power}$.`,
      tex: `${coefficient} \\times ${power} = ${coefficient * power}, \\quad ${power} - 1 = ${power - 1}`,
    },
    { text: 'So the derivative is:', tex: termTex(coefficient * power, power - 1) },
  ],
};

/* ---------- Sum rule ---------- */

interface SumRuleParams {
  /** Highest power first; a `power: 0` entry is the constant term. */
  terms: { coefficient: number; power: number }[];
}

export const sumRule: Generator<SumRuleParams> = {
  id: 'sum-rule',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    // Level 2 leaves a gap between the powers (x^5 and x, say) so the learner
    // cannot read the answer off by pattern-matching adjacent terms.
    const highPower = hard ? rng.pick([3, 4, 5]) : rng.pick([2, 3]);
    const lowPower = hard ? rng.pick([1, 2]) : rng.int(1, highPower - 1);

    // Exactly one of the two power terms is negative at level 2, so a sign has
    // to be carried through the differentiation rather than ignored.
    const negateHigh = hard && rng.chance(0.4);
    const highCoefficient = rng.int(2, hard ? 9 : 6) * (negateHigh ? -1 : 1);
    const lowCoefficient = rng.int(2, hard ? 9 : 6) * (hard && !negateHigh ? -1 : 1);

    const terms: SumRuleParams['terms'] = [
      { coefficient: highCoefficient, power: highPower },
      { coefficient: lowCoefficient, power: lowPower },
    ];
    // The constant is the point of level 2: it is visible in the question and
    // absent from the answer.
    if (hard) terms.push({ coefficient: rng.int(2, 9) * rng.sign(), power: 0 });
    return { terms };
  },
  render: ({ terms }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Differentiate with respect to $x$.' },
      {
        kind: 'display',
        tex: `y = ${sumTex(terms.map((term) => termTex(term.coefficient, term.power)))}`,
      },
    ],
    lead: '\\frac{dy}{dx} =',
    keypad: ALGEBRA_KEYS,
    // termAnswer(0, -1) collapses to '0' for the constant, which sumAnswer drops.
    answer: sumAnswer(
      terms.map((term) => termAnswer(term.coefficient * term.power, term.power - 1)),
    ),
    source: sumAnswer(terms.map((term) => termAnswer(term.coefficient, term.power))),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ terms }) => {
    /** Parenthesise a negative multiplier so "×" never sits beside a minus. */
    const braced = (value: number) => (value < 0 ? `\\left(${value}\\right)` : `${value}`);

    const steps: SolutionStep[] = [
      {
        text: `The sum rule lets you differentiate each of the ${terms.length} terms on its own and add the results.`,
        tex: `\\frac{dy}{dx} = ${terms
          .map((term) => ddx(termTex(term.coefficient, term.power)))
          .join(' + ')}`,
      },
    ];

    for (const { coefficient, power } of terms) {
      if (power === 0) {
        steps.push({
          text: `The constant $${coefficient}$ contains no $x$, so changing $x$ does not change it: it differentiates to $0$.`,
          tex: `${ddx(`${coefficient}`)} = 0`,
        });
      } else if (power === 1) {
        steps.push({
          text: `$${termTex(coefficient, 1)}$ has power $1$, so it differentiates to its coefficient $${coefficient}$.`,
          tex: `${ddx(termTex(coefficient, 1))} = ${coefficient}`,
        });
      } else {
        steps.push({
          text: `Multiply $${coefficient}$ by the power $${power}$, then drop the power to $${power - 1}$.`,
          tex: `${ddx(termTex(coefficient, power))} = ${braced(coefficient)} \\times ${power} x^{${power - 1}} = ${termTex(coefficient * power, power - 1)}`,
        });
      }
    }

    const hasConstant = terms.some((term) => term.power === 0);
    steps.push({
      text: hasConstant
        ? 'Add the pieces back together; the $0$ from the constant leaves nothing behind.'
        : 'Add the pieces back together.',
      tex: `\\frac{dy}{dx} = ${sumTex(
        terms.map((term) => termTex(term.coefficient * term.power, term.power - 1)),
      )}`,
    });

    return steps;
  },
};
/* ---------- Trig derivative (chain rule with a linear inside) ---------- */

interface TrigParams {
  fn: 'sin' | 'cos';
  /** Coefficient outside the trig function; 1 at difficulty 1. */
  outer: number;
  /** Coefficient of $x$ inside — this is the chain rule factor. */
  inner: number;
  /** Constant added inside; 0 at difficulty 1. */
  shift: number;
}

export const trigDerivative: Generator<TrigParams> = {
  id: 'trig-derivative',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    // Level 2 is harder in structure, not size: a coefficient outside and a
    // constant inside, so the learner must separate the two multipliers and
    // notice the constant contributes nothing to du/dx.
    outer: difficulty >= 2 ? rng.int(2, 8) : rng.int(1, 4),
    inner: difficulty >= 2 ? rng.int(2, 7) : rng.int(2, 9),
    shift: difficulty >= 2 ? rng.sign() * rng.int(1, 6) : 0,
  }),
  render: ({ fn, outer, inner, shift }) => {
    const innerTex = sumTex([termTex(inner, 1), termTex(shift, 0)]);
    const innerAnswer = sumAnswer([termAnswer(inner, 1), termAnswer(shift, 0)]);
    const outerTex = outer === 1 ? '' : outer === -1 ? '-' : `${outer}`;
    // d/dx sin(u) = cos(u) u', d/dx cos(u) = -sin(u) u'.
    const derivativeFn = fn === 'sin' ? 'cos' : 'sin';
    const derivativeCoefficient = fn === 'sin' ? outer * inner : -outer * inner;

    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = ${outerTex}\\${fn}\\left(${innerTex}\\right)` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: TRIG_KEYS,
      answer: `(${derivativeCoefficient}) * ${derivativeFn}(${innerAnswer})`,
      source: `(${outer}) * ${fn}(${innerAnswer})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ fn, outer, inner, shift }) => {
    const innerTex = sumTex([termTex(inner, 1), termTex(shift, 0)]);
    const derivativeFn = fn === 'sin' ? 'cos' : 'sin';
    const derivativeCoefficient = fn === 'sin' ? outer * inner : -outer * inner;
    const resultCoefTex =
      derivativeCoefficient === 1 ? '' : derivativeCoefficient === -1 ? '-' : `${derivativeCoefficient}`;

    return [
      {
        text: 'The inside of the bracket is not just $x$, so this needs the chain rule: differentiate the outside, then multiply by the derivative of the inside.',
        tex: `${ddx(`\\${fn}(u)`)} = ${fn === 'sin' ? '\\cos(u)' : '-\\sin(u)'}\\,\\frac{du}{dx}`,
      },
      {
        text:
          shift === 0
            ? `Here the inside is $u = ${innerTex}$, so the chain rule factor is $${inner}$.`
            : `Here the inside is $u = ${innerTex}$. The constant differentiates to zero, so the chain rule factor is just $${inner}$.`,
        tex: `u = ${innerTex}, \\quad \\frac{du}{dx} = ${inner}`,
      },
      {
        text:
          fn === 'sin'
            ? `Differentiating the outside turns $\\sin$ into $\\cos$, and the inside $${innerTex}$ is carried through unchanged.`
            : `Differentiating the outside turns $\\cos$ into $-\\sin$ — that minus sign is the one people drop. The inside $${innerTex}$ is carried through unchanged.`,
        tex: `\\frac{dy}{dx} = ${outer === 1 ? '' : outer}\\left(${fn === 'sin' ? '' : '-'}\\${derivativeFn}\\left(${innerTex}\\right)\\right) \\times ${inner}`,
      },
      {
        text:
          outer === 1
            ? `There is no coefficient outside, so the chain rule factor $${inner}$ is the whole multiplier.`
            : `Now collect the multipliers: the outer coefficient $${outer}$ times the chain rule factor $${inner}$.`,
        tex: `${fn === 'cos' ? '-' : ''}${outer} \\times ${inner} = ${derivativeCoefficient}`,
      },
      {
        text: 'So the derivative is:',
        tex: `\\frac{dy}{dx} = ${resultCoefTex}\\${derivativeFn}\\left(${innerTex}\\right)`,
      },
    ];
  },
};

/* ---------- Product rule ---------- */

interface ProductParams { a: number; b: number; c: number; d: number }

export const productRule: Generator<ProductParams> = {
  id: 'product-rule',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty >= 2 ? 5 : 3),
    b: rng.int(1, 5) * (difficulty >= 2 ? rng.sign() : 1),
    c: rng.int(1, difficulty >= 2 ? 4 : 2),
    d: rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1),
  }),
  render: ({ a, b, c, d }) => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 2), termTex(d, 0)]);
    // u v' + v u' = (ax+b)(2cx) + (cx^2+d)(a), expanded to 3ac x^2 + 2bc x + ad.
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate using the product rule.' },
        { kind: 'display', tex: `y = \\left(${u}\\right)\\left(${v}\\right)` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: ALGEBRA_KEYS,
      // Expanded, but an unexpanded answer is equally accepted: the checker
      // compares values, not the shape they were written in.
      answer: sumAnswer([
        termAnswer(3 * a * c, 2),
        termAnswer(2 * b * c, 1),
        termAnswer(a * d, 0),
      ]),
      source: `(${sumAnswer([termAnswer(a, 1), termAnswer(b, 0)])}) * (${sumAnswer([termAnswer(c, 2), termAnswer(d, 0)])})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, d }) => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 2), termTex(d, 0)]);
    return [
      {
        text: 'Differentiate each factor in turn, keeping the other one intact.',
        tex: "\\frac{d}{dx}(uv) = u'v + uv'",
      },
      {
        text: 'Write down all four pieces before assembling anything — most slips here are bookkeeping, not calculus.',
        tex: `u = ${u}, \\quad v = ${v}, \\quad u' = ${a}, \\quad v' = ${termTex(2 * c, 1)}`,
      },
      {
        text: 'Now substitute into the rule.',
        tex: `\\frac{dy}{dx} = ${a}\\left(${v}\\right) + \\left(${u}\\right)\\left(${termTex(2 * c, 1)}\\right)`,
      },
      {
        text: 'Expanding and collecting like terms gives:',
        tex: sumTex([
          termTex(3 * a * c, 2),
          termTex(2 * b * c, 1),
          termTex(a * d, 0),
        ]),
      },
      {
        text: 'Leaving it unexpanded is fine too — both forms are marked correct.',
      },
    ];
  },
};

/* ---------- Quotient rule ---------- */

interface QuotientParams { a: number; b: number; c: number; d: number }

export const quotientRule: Generator<QuotientParams> = {
  id: 'quotient-rule',
  sample: (rng, difficulty) => {
    // ad - bc must be non-zero, or the function is constant and the derivative
    // collapses to 0 — a question with nothing in it to get right.
    for (;;) {
      const a = rng.int(1, difficulty >= 2 ? 5 : 3);
      const b = rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1);
      const c = rng.int(1, difficulty >= 2 ? 4 : 2);
      const d = rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1);
      if (a * d - b * c !== 0) return { a, b, c, d };
    }
  },
  render: ({ a, b, c, d }) => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 1), termTex(d, 0)]);
    const vAnswer = sumAnswer([termAnswer(c, 1), termAnswer(d, 0)]);
    // (u'v - uv')/v^2 collapses neatly: (ad - bc)/(cx + d)^2.
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate using the quotient rule.' },
        { kind: 'display', tex: `y = \\frac{${u}}{${v}}` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: ALGEBRA_KEYS,
      answer: `(${a * d - b * c}) / ((${vAnswer})^2)`,
      source: `(${sumAnswer([termAnswer(a, 1), termAnswer(b, 0)])}) / (${vAnswer})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, d }) => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 1), termTex(d, 0)]);
    return [
      {
        text: 'The derivative of the top comes first, and the whole thing sits over the denominator squared.',
        tex: "\\frac{d}{dx}\\left(\\frac{u}{v}\\right) = \\frac{u'v - uv'}{v^{2}}",
      },
      {
        text: 'Identify the four pieces.',
        tex: `u = ${u}, \\quad v = ${v}, \\quad u' = ${a}, \\quad v' = ${c}`,
      },
      {
        text: 'Substituting gives a numerator that simplifies a long way.',
        tex: `\\frac{${a}\\left(${v}\\right) - \\left(${u}\\right)${c}}{\\left(${v}\\right)^{2}}`,
      },
      {
        text: `The $x$ terms in the numerator cancel, leaving $${a} \\times ${d} - ${b} \\times ${c} = ${a * d - b * c}$.`,
        tex: `\\frac{dy}{dx} = \\frac{${a * d - b * c}}{\\left(${v}\\right)^{2}}`,
      },
    ];
  },
};

/* ---------- Chain rule ---------- */

interface ChainParams { a: number; b: number; power: number; innerPower: number }

export const chainRule: Generator<ChainParams> = {
  id: 'chain-rule',
  sample: (rng, difficulty) => ({
    a: difficulty >= 2 ? 1 : rng.int(2, 5),
    b: rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1),
    power: difficulty >= 2 ? rng.pick([3, 4, -2]) : rng.int(2, 4),
    // Difficulty 2 puts a quadratic inside, so the chain factor is a function
    // of x rather than a bare constant.
    innerPower: difficulty >= 2 ? 2 : 1,
  }),
  render: ({ a, b, power, innerPower }) => {
    const inner = sumTex([termTex(a, innerPower), termTex(b, 0)]);
    const innerAnswer = sumAnswer([termAnswer(a, innerPower), termAnswer(b, 0)]);
    // n(inner)^(n-1) * inner', where inner' = a * innerPower * x^(innerPower-1).
    const chainFactor = termAnswer(a * innerPower, innerPower - 1);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = \\left(${inner}\\right)^{${power}}` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: ALGEBRA_KEYS,
      answer: `(${power}) * ((${innerAnswer})^(${power - 1})) * (${chainFactor})`,
      source: `(${innerAnswer})^(${power})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, power, innerPower }) => {
    const inner = sumTex([termTex(a, innerPower), termTex(b, 0)]);
    const innerDerivative = termTex(a * innerPower, innerPower - 1);
    return [
      {
        text: 'Differentiate the outside as usual, then multiply by the derivative of what was inside.',
        tex: "\\frac{d}{dx}f(g(x)) = f'(g(x)) \\cdot g'(x)",
      },
      {
        text: `Here the inside is $u = ${inner}$.`,
        tex: `u = ${inner}, \\quad \\frac{du}{dx} = ${innerDerivative}`,
      },
      {
        text: `Differentiating the outside brings the power ${power} down and reduces it to ${power - 1}.`,
        tex: `${power}\\left(${inner}\\right)^{${power - 1}}`,
      },
      {
        text: 'Now multiply by the derivative of the inside — the step that is easiest to forget.',
        tex: `\\frac{dy}{dx} = ${power}\\left(${inner}\\right)^{${power - 1}} \\times ${innerDerivative}`,
      },
    ];
  },
};

/* ---------- Exponentials and logarithms ---------- */

interface ExpLogParams { form: 'exp' | 'lnScaled' | 'lnInner'; a: number; k: number }

export const expLogDerivative: Generator<ExpLogParams> = {
  id: 'exp-log-derivative',
  sample: (rng, difficulty) => ({
    // lnInner is the instructive case: ln(kx) differentiates to 1/x whatever k is.
    form: difficulty >= 2
      ? rng.pick(['exp', 'lnScaled', 'lnInner'] as const)
      : rng.pick(['exp', 'lnScaled'] as const),
    a: difficulty >= 2 ? rng.int(2, 9) : rng.int(1, 4),
    k: difficulty >= 2 ? rng.int(2, 8) : rng.int(1, 6),
  }),
  render: ({ form, a, k }) => {
    const outer = a === 1 ? '' : `${a}`;
    if (form === 'exp') {
      const exponent = k === 1 ? 'x' : termTex(k, 1);
      return {
        kind: 'expression',
        prompt: [
          { kind: 'prose', text: 'Differentiate with respect to $x$.' },
          { kind: 'display', tex: `y = ${outer}e^{${exponent}}` },
        ],
        lead: '\\frac{dy}{dx} =',
        keypad: EXP_KEYS,
        answer: `(${a * k}) * e^((${k}) * x)`,
        source: `(${a}) * e^((${k}) * x)`,
        domain: 'real',
        mode: 'exact',
      };
    }
    // Both log forms differentiate to a multiple of 1/x.
    const body = form === 'lnScaled' ? 'x' : termTex(k, 1);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = ${outer}\\ln\\left(${body}\\right)` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: EXP_KEYS,
      answer: `(${a}) / x`,
      source: form === 'lnScaled' ? `(${a}) * log(x)` : `(${a}) * log((${k}) * x)`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ form, a, k }) => {
    if (form === 'exp') {
      const exponent = k === 1 ? 'x' : termTex(k, 1);
      return [
        {
          text: '$e^{x}$ is its own derivative, so all that changes is the chain rule factor from the exponent.',
          tex: `${ddx('e^{u}')} = e^{u}\\,\\frac{du}{dx}`,
        },
        {
          text: `Here $u = ${exponent}$, so $\\frac{du}{dx} = ${k}$.`,
          tex: `\\frac{dy}{dx} = ${a === 1 ? '' : a} \\times ${k} \\times e^{${exponent}} = ${termTex(a * k, 0)}e^{${exponent}}`,
        },
      ];
    }
    if (form === 'lnScaled') {
      return [
        {
          text: 'The natural logarithm differentiates to a reciprocal, with no logarithm left in the answer.',
          tex: `${ddx('\\ln x')} = \\frac{1}{x}`,
        },
        {
          text: `The constant multiplier $${a}$ simply carries through.`,
          tex: `\\frac{dy}{dx} = \\frac{${a}}{x}`,
        },
      ];
    }
    return [
      {
        text: `A log of a product splits into a sum: $\\ln(${k}x) = \\ln ${k} + \\ln x$.`,
        tex: `\\ln\\left(${termTex(k, 1)}\\right) = \\ln ${k} + \\ln x`,
      },
      {
        text: `$\\ln ${k}$ is just a constant, so it differentiates to zero — the $${k}$ disappears entirely.`,
        tex: `\\frac{dy}{dx} = ${a === 1 ? '' : a} \\times \\frac{1}{x} = \\frac{${a}}{x}`,
      },
    ];
  },
};

/* ---------- Evaluating a derivative at a point ---------- */

interface EvaluateParams { a: number; b: number; c: number; at: number }

export const evaluateDerivative: Generator<EvaluateParams> = {
  id: 'evaluate-derivative',
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty >= 2 ? 4 : 2),
    b: rng.int(1, 5) * (difficulty >= 2 ? rng.sign() : 1),
    c: rng.int(1, 8) * (difficulty >= 2 ? rng.sign() : 1),
    // Small evaluation points keep the arithmetic tidy and the answer an integer.
    at: rng.int(1, 3) * (difficulty >= 2 ? rng.sign() : 1),
  }),
  render: ({ a, b, c, at }) => {
    const fn = sumTex([termTex(a, 3), termTex(b, 2), termTex(c, 1)]);
    // f'(x) = 3a x^2 + 2b x + c, evaluated at `at`.
    const value = 3 * a * at * at + 2 * b * at + c;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The gradient of a curve at a point is the value of its derivative there. Find $f'(${at})$.`,
        },
        { kind: 'display', tex: `f(x) = ${fn}` },
      ],
      lead: `f'(${at}) =`,
      keypad: ALGEBRA_KEYS,
      answer: `${value}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, at }) => {
    const derivative = sumTex([termTex(3 * a, 2), termTex(2 * b, 1), termTex(c, 0)]);
    const value = 3 * a * at * at + 2 * b * at + c;
    return [
      {
        text: 'Differentiate first, leaving the answer as a function of $x$.',
        tex: `f'(x) = ${derivative}`,
      },
      {
        text: `Only now substitute $x = ${at}$.`,
        tex: `f'(${at}) = ${3 * a}\\left(${at}\\right)^{2} + ${2 * b}\\left(${at}\\right) + ${c}`,
      },
      {
        text: 'So the gradient of the tangent at that point is:',
        tex: `${value}`,
      },
    ];
  },
};

export const differentiationGenerators = [
  powerRule,
  sumRule,
  productRule,
  quotientRule,
  chainRule,
  trigDerivative,
  expLogDerivative,
  evaluateDerivative,
];
