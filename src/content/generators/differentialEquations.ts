/**
 * Differential Equations generators.
 *
 * Level 1 forms a first-order equation from a rate statement and solves it by
 * separating the variables: the general solution with its one constant, then
 * the particular solution a condition picks out, and growth and decay as
 * `dy/dt = ky`. Level 2 models with them: Newton's cooling, growth towards a
 * limit, mixing tanks, long-term behaviour, and checking a solution by
 * substitution. Level 3 solves `dy/dx + Py = Q` with an integrating factor,
 * for a constant P and for P = n/x, built backwards from the solution so
 * that Q's coefficient is always a multiple of what the integral divides by.
 * Level 4 solves `y'' + by' + cy = 0` through its auxiliary equation, drawing
 * the roots first (two real, one repeated, or α ± βi) and building b and c
 * from them, and the constants A and B first when a particular solution is
 * asked, so that y(0) and y'(0) are read off them. Level 5 solves
 * `y'' + by' + cy = f(x)` as complementary function plus particular integral,
 * for a polynomial, exponential or trigonometric f(x) and the resonant case
 * where f(x) is already in the complementary function. The particular
 * integral is drawn first and put through the left side to make f(x), so its
 * coefficients come out whole when the learner compares them. Level 6 is the
 * same equation as motion in t: simple harmonic motion `ẍ = -ω²x` (roots ±ωi,
 * ω drawn first), amplitude, period and greatest speed, the phase form
 * R cos(ωt - α) from a Pythagorean triple, and damping `ẍ + kẋ + ω²x = 0`
 * from negative roots drawn first, so k and ω² are whole.
 *
 * Every number the learner meets is whole by construction. A rate constant
 * that has to be a logarithm is written as one, `k = (ln 2)/3`, so that the
 * solution at a whole multiple of 3 is a whole power of 2 rather than a
 * rounded decimal.
 *
 * Two rules from Integration hold here too. `ln|y|` is never a typed answer:
 * the checker probes negative values, where mathjs hands back a complex log,
 * so it is asked as tiles, steps or a choice. And a form the checker cannot
 * tell apart by value — a separated equation, a differential equation built
 * from words — is asked through a widget that grades the form (PITFALLS 3.4).
 *
 * The oracle in `generators.test.ts` differentiates a `source` in x only, and
 * nothing here is a plain derivative in x. `differentialEquations.test.ts`
 * differentiates each solution with mathjs and checks it satisfies its
 * equation, across seeds and both difficulties. Level 5's typed answers are
 * a number or a particular integral, neither a derivative nor an integral of
 * anything shown, so they declare no `source` or `integrand` either: the
 * course test puts each one back into its equation. Level 6 is in t, so none
 * of its slides declares `source`, `integrand` or `limits`: the course test
 * differentiates each x(t) twice in t and checks each typed value.
 */
import type { Block, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { EXP_KEYS, termAnswer, termTex } from './calculus';
import { coeffTex } from './format';
import {
  OPERATOR_KEYS,
  fracTex,
  gcd,
  mix,
  numberChoices,
  spaced,
  stepBank,
  tokenBank,
  treeBank,
  turned,
} from './parametricImplicit';

/* ---------- Shared helpers ---------- */

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** Leibniz notation for a rate. */
const rate = (top: string, bottom = 't'): string => `\\frac{d${top}}{d${bottom}}`;

/** A coefficient in front of something: 1 and -1 are implied. */
const coef = (c: number): string => (c === 1 ? '' : c === -1 ? '-' : `${c}`);

/** `+ 3` or `- 3`, for appending to a term the learner reads. */
const signed = (c: number): string => (c < 0 ? `- ${-c}` : `+ ${c}`);

/** Lines of working stacked in one display, aligned on their `&`. */
const chain = (...lines: string[]): string => `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;

/** An answer in t, with e. Every letter is spaced so `80e` then `t` is not one symbol. */
const T_EXP_KEYS: KeypadKey[] = [spaced('t'), spaced('e'), ...OPERATOR_KEYS];

/** An integral in y, with the constant. */
const Y_INTEGRAL_KEYS: KeypadKey[] = [spaced('y'), spaced('e'), ...OPERATOR_KEYS, { insert: 'C' }];

/** An integral in x: powers, sines and cosines, e, and the constant. */
const X_INTEGRAL_KEYS: KeypadKey[] = [...EXP_KEYS, { insert: 'sin(' }, { insert: 'cos(' }, { insert: 'C' }];

/** A choice slide written directly, turned by a salt so the answer moves. */
interface Pick {
  label: string;
  tex?: boolean;
  correct?: boolean;
}

function choiceSlide(prompt: Block[], picks: Pick[], salt: number): Slide {
  const seen = new Set<string>();
  const kept = picks.filter((pick) => {
    if (seen.has(pick.label)) return false;
    seen.add(pick.label);
    return true;
  });
  const ordered = turned(kept, salt % kept.length);
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((pick, idx) => ({ id: `opt${idx}`, label: pick.label, tex: pick.tex })),
    correctId: `opt${ordered.findIndex((pick) => pick.correct)}`,
  };
}

/** A decimal as the learner reads it, from a whole numerator and denominator. */
const decimal = (top: number, bottom: number): string => `${top / bottom}`;

/**
 * A rate constant that is a logarithm over a whole time: `ln 2 / 3`.
 *
 * With `k` written this way `e^{kt}` at a whole multiple of `h` is a whole
 * power of `b`, which is what keeps every value in these questions whole.
 */
export interface LnRate {
  b: number;
  h: number;
  /** -1 for decay. */
  sign: number;
}

export function lnTex({ b, h, sign }: LnRate): string {
  const body = h === 1 ? `\\ln ${b}` : `\\frac{\\ln ${b}}{${h}}`;
  return `${sign < 0 ? '-' : ''}${body}`;
}

export function lnAnswer({ b, h, sign }: LnRate): string {
  return `(${sign})*log(${b})/(${h})`;
}

/** `e^{kt}` with a logarithm rate, as the learner reads it. */
const lnExpTex = (k: LnRate, variable = 't'): string =>
  k.h === 1 ? `e^{${k.sign < 0 ? '-' : ''}${variable}\\ln ${k.b}}` : `e^{${lnTex(k)}${variable}}`;

/** k written in front of a bracket or a letter: `\frac{\ln 2}{3}` or `(\ln 2)`. */
const lnFactor = (k: LnRate): string => (k.h === 1 ? `${k.sign < 0 ? '-' : ''}(\\ln ${k.b})` : lnTex(k));

/* ============================================================
 * Level 1, lesson 1: forming a differential equation
 * ============================================================ */

interface Story {
  sym: string;
  subject: string;
  unit: string;
}

const STORIES: Story[] = [
  { sym: 'N', subject: 'The number of bacteria in a dish', unit: 'hour' },
  { sym: 'P', subject: 'The population of a town', unit: 'year' },
  { sym: 'M', subject: 'The mass of a chemical in a reaction', unit: 'minute' },
  { sym: 'V', subject: 'The volume of water in a tank', unit: 'minute' },
  { sym: 'h', subject: 'The height of a pile of sand', unit: 'minute' },
  { sym: 'Q', subject: 'The charge on a capacitor', unit: 'second' },
  { sym: 'F', subject: 'The number of fish in a lake', unit: 'month' },
  { sym: 'R', subject: 'The radius of an oil slick', unit: 'hour' },
  { sym: 'x', subject: 'The length of a crack in a beam', unit: 'day' },
];

type FormKey = 'self' | 'square' | 'root' | 'inverse' | 'time' | 'inverseSquare' | 'product';

interface Form {
  phrase: (s: string) => string;
  tex: (s: string) => string;
  /** The forms a learner is likeliest to write instead. */
  near: FormKey[];
}

const FORMS: Record<FormKey, Form> = {
  self: { phrase: (s) => `proportional to $${s}$`, tex: (s) => s, near: ['square', 'root', 'time'] },
  square: { phrase: (s) => `proportional to the square of $${s}$`, tex: (s) => `${s}^2`, near: ['self', 'root', 'inverseSquare'] },
  root: { phrase: (s) => `proportional to the square root of $${s}$`, tex: (s) => `\\sqrt{${s}}`, near: ['self', 'square', 'inverse'] },
  inverse: { phrase: (s) => `inversely proportional to $${s}$`, tex: (s) => `\\frac{1}{${s}}`, near: ['self', 'inverseSquare', 'root'] },
  time: { phrase: () => 'proportional to the time $t$ that has passed', tex: () => 't', near: ['self', 'product', 'square'] },
  inverseSquare: {
    phrase: (s) => `inversely proportional to the square of $${s}$`,
    tex: (s) => `\\frac{1}{${s}^2}`,
    near: ['inverse', 'square', 'self'],
  },
  product: { phrase: (s) => `proportional to the product of $${s}$ and $t$`, tex: (s) => `${s}t`, near: ['self', 'time', 'square'] },
};

const EASY_FORMS: FormKey[] = ['self', 'square', 'root', 'inverse', 'time'];
const ALL_FORMS: FormKey[] = [...EASY_FORMS, 'inverseSquare', 'product'];

export interface FormParams {
  ctx: number;
  form: FormKey;
  down: boolean;
}

function sampleForm(rng: Rng, difficulty: number): FormParams {
  return {
    ctx: rng.int(0, STORIES.length - 1),
    form: rng.pick(difficulty >= 2 ? ALL_FORMS : EASY_FORMS),
    down: rng.chance(0.5),
  };
}

function formSentence({ ctx, form, down }: FormParams): string {
  const story = STORIES[ctx];
  return `${story.subject}, $${story.sym}$, ${down ? 'decreases' : 'increases'} at a rate ${FORMS[form].phrase(story.sym)}.`;
}

/** The equation as the learner writes it, with k a positive constant. */
export function formedTex({ ctx, form, down }: FormParams): string {
  const s = STORIES[ctx].sym;
  return `${rate(s)} = ${down ? '-' : ''}k${FORMS[form].tex(s)}`;
}

function formSolution(params: FormParams): SolutionStep[] {
  const { ctx, form, down } = params;
  const s = STORIES[ctx].sym;
  return [
    { text: `The rate of change of $${s}$ over time is $${rate(s)}$.` },
    {
      text: `"${FORMS[form].phrase(s).replace(/\$/g, '')}" means a constant times $${FORMS[form].tex(s)}$.`,
    },
    {
      text: down
        ? `$${s}$ is decreasing, so the rate is negative. With $k$ positive, that needs a minus sign.`
        : `$${s}$ is increasing, so the rate is positive, and a positive $k$ gives that as it stands.`,
      tex: formedTex(params),
    },
  ];
}

/** Build the equation from a rate statement, as tiles. */
const deFormTiles: Generator<FormParams> = {
  id: 'de-form-tiles',
  sample: sampleForm,
  render: (params): Slide => {
    const s = STORIES[params.ctx].sym;
    const form = FORMS[params.form];
    const answer = [params.down ? '-k' : 'k', form.tex(s)];
    return {
      kind: 'tiles',
      prompt: [
        prose(`${formSentence(params)} Taking $k$ as a positive constant, build the differential equation.`),
      ],
      template: `${rate(s)} = {0}\\,{1}`,
      bank: tokenBank(answer, [params.down ? 'k' : '-k', ...form.near.map((key) => FORMS[key].tex(s))], 3),
      answer,
    };
  },
  solution: formSolution,
};

/** The sign of k, from the direction the quantity moves. */
export interface SignParams {
  ctx: number;
  /** A power form, or a gap to a level. */
  form: FormKey | 'gap';
  down: boolean;
  /** For a gap: the level, whether y starts above it, whether it moves towards it, and which way the bracket is written. */
  level: number;
  above: boolean;
  towards: boolean;
  flipped: boolean;
}

/** Whether k must be positive for the equation to move the way the prompt says. */
export function signOfK(params: SignParams): number {
  if (params.form !== 'gap') return params.down ? -1 : 1;
  // The bracket's sign at the start, and the direction y moves.
  const bracket = (params.above ? 1 : -1) * (params.flipped ? -1 : 1);
  const moving = params.above === params.towards ? -1 : 1;
  return bracket * moving;
}

export function signTex(params: SignParams): string {
  if (params.form !== 'gap') {
    const s = STORIES[params.ctx].sym;
    return `${rate(s)} = k${FORMS[params.form].tex(s)}`;
  }
  const inside = params.flipped ? `${params.level} - y` : `y - ${params.level}`;
  return `${rate('y')} = k(${inside})`;
}

const deFormSign: Generator<SignParams> = {
  id: 'de-form-sign',
  sample: (rng, difficulty) => {
    const gap = difficulty >= 2 && rng.chance(0.5);
    return {
      ctx: rng.int(0, STORIES.length - 1),
      form: gap ? 'gap' : rng.pick<FormKey>(difficulty >= 2 ? ['self', 'square', 'root', 'inverse', 'inverseSquare', 'product'] : ['self', 'square', 'root', 'inverse']),
      down: rng.chance(0.5),
      level: rng.int(2, 12) * 5,
      above: rng.chance(0.5),
      towards: rng.chance(0.7),
      flipped: rng.chance(0.5),
    };
  },
  render: (params): Slide => {
    const k = signOfK(params);
    const picks: Pick[] = [
      { label: 'k > 0', tex: true, correct: k > 0 },
      { label: 'k < 0', tex: true, correct: k < 0 },
      { label: 'k = 0', tex: true },
    ];
    if (params.form === 'gap') {
      const { level, above, towards } = params;
      return choiceSlide(
        [
          prose('A quantity $y$ is modelled by'),
          display(signTex(params)),
          prose(
            `where $k$ is a constant. $y$ starts ${above ? 'above' : 'below'} $${level}$ and moves ${towards ? 'towards' : 'away from'} it. What must be true of $k$?`,
          ),
        ],
        picks,
        mix(level, above ? 1 : 0, towards ? 1 : 0, params.flipped ? 1 : 0),
      );
    }
    const story = STORIES[params.ctx];
    const positive = params.form === 'product' ? `$${story.sym}$ and $t$ are positive` : `$${story.sym} > 0$`;
    return choiceSlide(
      [
        prose(`${story.subject}, $${story.sym}$, is modelled by`),
        display(signTex(params)),
        prose(`where $k$ is a constant and ${positive}. $${story.sym}$ is ${params.down ? 'decreasing' : 'increasing'}. What must be true of $k$?`),
      ],
      picks,
      mix(params.ctx, params.down ? 1 : 0, ALL_FORMS.indexOf(params.form as FormKey)),
    );
  },
  solution: (params) => {
    const k = signOfK(params);
    if (params.form !== 'gap') {
      const s = STORIES[params.ctx].sym;
      return [
        { text: `$${FORMS[params.form].tex(s)}$ is positive, so $${rate(s)}$ has the same sign as $k$.` },
        {
          text: `$${s}$ is ${params.down ? 'decreasing' : 'increasing'}, so $${rate(s)} ${params.down ? '<' : '>'} 0$, and $k ${k > 0 ? '>' : '<'} 0$.`,
        },
      ];
    }
    const { level, above, towards, flipped } = params;
    const bracket = flipped ? `${level} - y` : `y - ${level}`;
    const bracketSign = (above ? 1 : -1) * (flipped ? -1 : 1);
    const moving = above === towards ? -1 : 1;
    return [
      { text: `With $y$ ${above ? 'above' : 'below'} $${level}$, the bracket $${bracket}$ is ${bracketSign > 0 ? 'positive' : 'negative'}.` },
      {
        text: `Moving ${towards ? 'towards' : 'away from'} $${level}$ from ${above ? 'above' : 'below'} means $y$ is ${moving > 0 ? 'increasing' : 'decreasing'}, so $${rate('y')} ${moving > 0 ? '>' : '<'} 0$.`,
      },
      { text: `A ${bracketSign > 0 ? 'positive' : 'negative'} bracket times $k$ is ${moving > 0 ? 'positive' : 'negative'} only when $k ${k > 0 ? '>' : '<'} 0$.` },
    ];
  },
};

/** Forming the equation as a walk: which derivative, proportional to what, which sign. */
const deFormFlow: Generator<FormParams> = {
  id: 'de-form-flow',
  sample: sampleForm,
  render: (params): Slide => {
    const { ctx, form, down } = params;
    const s = STORIES[ctx].sym;
    const salt = mix(ctx, ALL_FORMS.indexOf(form), down ? 1 : 0);
    const right = FORMS[form];
    const wrong = right.near.slice(0, 2);
    const sign = down ? '-k' : '+k';
    return {
      kind: 'flow',
      prompt: [prose(`${formSentence(params)} Form the differential equation, with $k$ a positive constant.`)],
      subject: `${rate(s)} = \\; ?`,
      steps: [
        {
          id: 'rate',
          ask: `Which derivative is the rate at which $${s}$ changes?`,
          branches: turned(
            [
              { label: `$${rate(s)}$`, to: 'prop' },
              { label: `$${rate('t', s)}$`, outcome: `That is the time taken per unit of $${s}$: the rate turned upside down.` },
              { label: `$${s}$`, outcome: `That is how much there is, not how fast it changes.` },
            ],
            salt % 3,
          ),
        },
        {
          id: 'prop',
          ask: 'The rate is a constant times what?',
          branches: turned(
            [
              { label: `$${right.tex(s)}$`, to: 'sign' },
              ...wrong.map((key) => ({ label: `$${FORMS[key].tex(s)}$`, outcome: `That would be a rate ${FORMS[key].phrase(s)}.` })),
            ],
            (salt >>> 4) % 3,
          ),
        },
        {
          id: 'sign',
          ask: `$${s}$ ${down ? 'decreases' : 'increases'} and $k > 0$. Which goes in front?`,
          branches: turned(
            [
              { label: `$${sign}$`, outcome: `So $${formedTex(params)}$.` },
              {
                label: `$${down ? '+k' : '-k'}$`,
                outcome: `Then $${rate(s)}$ would be ${down ? 'positive' : 'negative'} and $${s}$ would ${down ? 'increase' : 'decrease'}.`,
              },
            ],
            (salt >>> 8) % 2,
          ),
        },
      ],
      answer: [`$${rate(s)}$`, `$${right.tex(s)}$`, `$${sign}$`],
    };
  },
  solution: formSolution,
};

/** The rate at a moment, read straight off a numerical equation. */
export interface RateParams {
  ctx: number;
  form: 'self' | 'root' | 'square' | 'inverse';
  /** The coefficient as top / bottom, positive; `sign` carries the direction. */
  top: number;
  bottom: number;
  sign: number;
  value: number;
}

export function rateValue({ form, top, bottom, sign, value }: RateParams): number {
  const size =
    form === 'self'
      ? (top * value) / bottom
      : form === 'root'
        ? top * Math.sqrt(value)
        : form === 'square'
          ? (top * value * value) / bottom
          : top / value;
  return sign * Math.round(size);
}

export function rateTex(params: RateParams): string {
  const { ctx, form, top, bottom, sign } = params;
  const s = STORIES[ctx].sym;
  const minus = sign < 0 ? '-' : '';
  if (form === 'inverse') return `${rate(s)} = ${minus}\\frac{${top}}{${s}}`;
  const c = form === 'root' ? `${top}` : decimal(top, bottom);
  return `${rate(s)} = ${minus}${c}${FORMS[form].tex(s)}`;
}

const RATE_SELF: [number, number][] = [[1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [1, 20], [1, 4], [3, 4], [2, 100], [6, 100]];
const RATE_SQUARE: [number, number][] = [[1, 100], [2, 100], [1, 50], [1, 10], [1, 20]];

const deFormRate: Generator<RateParams> = {
  id: 'de-form-rate',
  sample: (rng, difficulty) => {
    const form = rng.pick(difficulty >= 2 ? (['self', 'root', 'square', 'inverse'] as const) : (['self', 'root'] as const));
    const sign = rng.chance(difficulty >= 2 ? 0.5 : 0.3) ? -1 : 1;
    const ctx = rng.int(0, STORIES.length - 1);
    if (form === 'self') {
      const [top, bottom] = rng.pick(RATE_SELF);
      return { ctx, form, top, bottom, sign, value: bottom * rng.int(2, Math.floor(600 / bottom)) };
    }
    if (form === 'root') {
      return { ctx, form, top: rng.int(2, 9), bottom: 1, sign, value: rng.int(2, 15) ** 2 };
    }
    if (form === 'square') {
      const [top, bottom] = rng.pick(RATE_SQUARE);
      return { ctx, form, top, bottom, sign, value: 10 * rng.int(1, 6) };
    }
    const value = rng.int(2, 20);
    return { ctx, form, top: value * rng.int(2, 12), bottom: 1, sign, value };
  },
  choices: (params) => {
    const answer = rateValue(params);
    const { form, top, bottom, value } = params;
    const slips =
      form === 'root'
        ? [top * value, answer * 2]
        : form === 'square'
          ? [Math.round((top * value) / bottom), answer * 2]
          : form === 'inverse'
            ? [top * value, value]
            : [value, answer * 2];
    return numberChoices(answer, [-answer, ...slips.map((slip) => Math.sign(answer) * slip)], mix(top, bottom, value));
  },
  render: (params): Slide => {
    const story = STORIES[params.ctx];
    return {
      kind: 'expression',
      prompt: [
        prose(`${story.subject}, $${story.sym}$, is modelled by`),
        display(rateTex(params)),
        prose(`with $t$ in ${story.unit}s. How fast is $${story.sym}$ changing when $${story.sym} = ${params.value}$?`),
      ],
      lead: `${rate(story.sym)} =`,
      keypad: [],
      answer: `${rateValue(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { ctx, form, top, bottom, value } = params;
    const s = STORIES[ctx].sym;
    const answer = rateValue(params);
    const sign = answer < 0 ? '-' : '';
    const working =
      form === 'root'
        ? `${top} \\times \\sqrt{${value}}`
        : form === 'square'
          ? `${decimal(top, bottom)} \\times ${value}^2`
          : form === 'inverse'
            ? `\\frac{${top}}{${value}}`
            : `${decimal(top, bottom)} \\times ${value}`;
    return [
      { text: `The equation gives the rate directly: put $${s} = ${value}$ into the right-hand side.` },
      {
        tex:
          form === 'root'
            ? chain(`&${sign}${working}`, `&= ${sign}${top} \\times ${Math.sqrt(value)}`, `&= ${answer}`)
            : `${sign}${working} = ${answer}`,
      },
      { text: answer < 0 ? `It is negative: $${s}$ is falling by $${-answer}$ per ${STORIES[ctx].unit} at that moment.` : `$${s}$ is rising by $${answer}$ per ${STORIES[ctx].unit} at that moment.` },
    ];
  },
};

/* ============================================================
 * Level 1, lesson 2: separating the variables
 * ============================================================ */

/**
 * The x factor of a separable equation, `f(x)`, chosen so that its integral
 * `F(x)` has whole coefficients: a power term is `c(n + 1)x^n`, integrating
 * to `cx^(n + 1)`.
 */
export type XFactor =
  | { type: 'poly'; c: number; n: number }
  | { type: 'cos'; a: number }
  | { type: 'sin'; a: number }
  | { type: 'exp'; a: number; m: number }
  | { type: 'recip'; a: number };

/** The y factor g(y), as it multiplies f(x) on the right-hand side. */
export type YFactor = 'y' | 'y2' | 'inv' | 'inv2' | 'ey';

const expBody = (m: number): string => `e^{${m === 1 ? '' : m}x}`;

/** f(x) as the learner reads it. */
export function fTex(f: XFactor): string {
  switch (f.type) {
    case 'poly':
      return termTex(f.c * (f.n + 1), f.n);
    case 'cos':
      return `${coef(f.a)}\\cos x`;
    case 'sin':
      return `${coef(f.a)}\\sin x`;
    case 'exp':
      return `${coef(f.a * f.m)}${expBody(f.m)}`;
    case 'recip':
      return `\\frac{${f.a}}{x}`;
  }
}

/** f(x) for mathjs. */
export function fAnswer(f: XFactor): string {
  switch (f.type) {
    case 'poly':
      return termAnswer(f.c * (f.n + 1), f.n);
    case 'cos':
      return `(${f.a})*cos(x)`;
    case 'sin':
      return `(${f.a})*sin(x)`;
    case 'exp':
      return `(${f.a * f.m})*e^(${f.m}*x)`;
    case 'recip':
      return `(${f.a})/x`;
  }
}

/** 1 / f(x), for the slip of dividing by the wrong factor. */
function fInvTex(f: XFactor): string {
  switch (f.type) {
    case 'recip':
      return f.a === 1 ? 'x' : `\\frac{x}{${f.a}}`;
    default:
      return `\\frac{1}{${fTex(f)}}`;
  }
}

/** s times the integral of f, as the learner reads it. */
export function bigFTex(f: XFactor, s = 1): string {
  switch (f.type) {
    case 'poly':
      return termTex(s * f.c, f.n + 1);
    case 'cos':
      return `${coef(s * f.a)}\\sin x`;
    case 'sin':
      return `${coef(-s * f.a)}\\cos x`;
    case 'exp':
      return `${coef(s * f.a)}${expBody(f.m)}`;
    case 'recip':
      return `${coef(s * f.a)}\\ln|x|`;
  }
}

/** s times the integral of f, for mathjs. Never used for `recip`, whose integral is a log. */
export function bigFAnswer(f: XFactor, s = 1): string {
  switch (f.type) {
    case 'poly':
      return termAnswer(s * f.c, f.n + 1);
    case 'cos':
      return `(${s * f.a})*sin(x)`;
    case 'sin':
      return `(${-s * f.a})*cos(x)`;
    case 'exp':
      return `(${s * f.a})*e^(${f.m}*x)`;
    case 'recip':
      return `(${s * f.a})*log(abs(x))`;
  }
}

/** The slip of multiplying by x instead of integrating: f(x) times x, or the wrong trig sign. */
function slipFTex(f: XFactor): string {
  switch (f.type) {
    case 'poly':
      return termTex(f.c * (f.n + 1), f.n + 1);
    case 'cos':
      return `${coef(-f.a)}\\sin x`;
    case 'sin':
      return `${coef(f.a)}\\cos x`;
    case 'exp':
      return `${coef(f.a * f.m * f.m)}${expBody(f.m)}`;
    case 'recip':
      return `-\\frac{${f.a}}{x^2}`;
  }
}

/** The pieces of the right-hand side: a coefficient and the rest of f. */
function fParts(f: XFactor): { k: string; body: string } {
  switch (f.type) {
    case 'poly':
      return { k: `${f.c * (f.n + 1)}`, body: f.n === 0 ? '' : f.n === 1 ? 'x' : `x^{${f.n}}` };
    case 'cos':
      return { k: coef(f.a), body: '\\cos x' };
    case 'sin':
      return { k: coef(f.a), body: '\\sin x' };
    case 'exp':
      return { k: coef(f.a * f.m), body: expBody(f.m) };
    case 'recip':
      return { k: coef(f.a), body: '' };
  }
}

/** The right-hand side f(x)g(y), written the way a textbook would. */
export function sepRhsTex(f: XFactor, g: YFactor): string {
  const { k, body } = fParts(f);
  const yPow = g === 'y' || g === 'inv' ? 'y' : 'y^{2}';
  if (f.type === 'recip') {
    if (g === 'y' || g === 'y2') return `\\frac{${k}${yPow}}{x}`;
    if (g === 'ey') return `\\frac{${k}e^{y}}{x}`;
    return `\\frac{${k || 1}}{x${yPow}}`;
  }
  const trig = f.type === 'cos' || f.type === 'sin';
  if (g === 'y' || g === 'y2') return trig ? `${k}${yPow}${body}` : f.type === 'exp' ? `${k}${yPow}${body}` : `${k}${body}${yPow}`;
  if (g === 'ey') {
    if (f.type === 'exp') return `${k}e^{${f.m === 1 ? '' : f.m}x + y}`;
    return trig ? `${k}e^{y}${body}` : `${k}${body}e^{y}`;
  }
  const top = `${k}${body}` || '1';
  return `\\frac{${top}}{${yPow}}`;
}

/** The right-hand side for mathjs. */
export function sepRhsAnswer(f: XFactor, g: YFactor): string {
  const gy = { y: 'y', y2: 'y^2', inv: '1/y', inv2: '1/y^2', ey: 'e^y' }[g];
  return `(${fAnswer(f)})*(${gy})`;
}

/** 1/g(y), the factor that goes with dy. */
export const Y_PART: Record<YFactor, { tex: string; answer: string; g: string }> = {
  y: { tex: '\\frac{1}{y}', answer: '1/y', g: 'y' },
  y2: { tex: '\\frac{1}{y^{2}}', answer: '1/y^2', g: 'y^{2}' },
  inv: { tex: 'y', answer: 'y', g: '\\frac{1}{y}' },
  inv2: { tex: 'y^{2}', answer: 'y^2', g: '\\frac{1}{y^{2}}' },
  ey: { tex: 'e^{-y}', answer: 'e^(-y)', g: 'e^{y}' },
};

/** The integral of 1/g(y), without its constant. `y` has none that may be typed. */
export const Y_INTEGRAL: Record<YFactor, { tex: string; answer?: string }> = {
  y: { tex: '\\ln|y|' },
  y2: { tex: '-\\frac{1}{y}', answer: '-1/y' },
  inv: { tex: '\\frac{y^{2}}{2}', answer: 'y^2/2' },
  inv2: { tex: '\\frac{y^{3}}{3}', answer: 'y^3/3' },
  ey: { tex: '-e^{-y}', answer: '-e^(-y)' },
};

export interface SepParams {
  f: XFactor;
  g: YFactor;
}

function sampleX(rng: Rng, difficulty: number, types: XFactor['type'][]): XFactor {
  const type = rng.pick(types);
  const a = rng.int(1, difficulty >= 2 ? 6 : 4);
  switch (type) {
    case 'poly': {
      const n = rng.int(difficulty >= 2 ? 0 : 1, 3);
      // A constant factor of 1 would leave nothing of x to separate.
      return { type, c: rng.int(n === 0 ? 2 : 1, difficulty >= 2 ? 5 : 3), n };
    }
    case 'exp':
      return { type, a, m: rng.int(1, 3) };
    default:
      return { type, a };
  }
}

function sampleSep(rng: Rng, difficulty: number): SepParams {
  const hard = difficulty >= 2;
  return {
    f: sampleX(rng, difficulty, hard ? ['poly', 'poly', 'cos', 'sin', 'exp', 'recip'] : ['poly', 'poly', 'cos', 'exp']),
    g: rng.pick<YFactor>(hard ? ['y', 'y2', 'inv', 'inv2', 'ey'] : ['y', 'y2', 'inv', 'inv2']),
  };
}

const sepDe = ({ f, g }: SepParams): string => `${rate('y', 'x')} = ${sepRhsTex(f, g)}`;
const separatedTex = ({ f, g }: SepParams): string => `${Y_PART[g].tex}\\,dy = ${fTex(f)}\\,dx`;

function sepSolution(params: SepParams): SolutionStep[] {
  const { f, g } = params;
  return [
    { text: `The right-hand side is $${fTex(f)}$ times $${Y_PART[g].g}$. Divide both sides by $${Y_PART[g].g}$, so every $y$ sits with $dy$.` },
    { text: 'Then multiply both sides by $dx$.', tex: separatedTex(params) },
  ];
}

/** Separate the variables: place the y factor with dy and the x factor with dx. */
const deSepTiles: Generator<SepParams> = {
  id: 'de-sep-tiles',
  sample: sampleSep,
  render: (params): Slide => {
    const { f, g } = params;
    const answer = [Y_PART[g].tex, fTex(f)];
    return {
      kind: 'tiles',
      prompt: [prose('Separate the variables in'), display(sepDe(params))],
      template: '{0}\\,dy = {1}\\,dx',
      bank: tokenBank(answer, [Y_PART[g].g, fInvTex(f), g === 'y' ? '\\ln y' : Y_PART[g === 'inv' ? 'y' : 'inv'].tex], 3),
      answer,
    };
  },
  solution: sepSolution,
};

/** One right-hand side offered in a "which can be separated" question. */
export interface RhsOption {
  tex: string;
  answer: string;
  separable: boolean;
}

function nonSeparable(a: number, hard: boolean): RhsOption[] {
  const plain: RhsOption[] = [
    { tex: `${a}x + y`, answer: `${a}*x + y`, separable: false },
    { tex: `x^{2} + ${a}y`, answer: `x^2 + ${a}*y`, separable: false },
    { tex: 'x - y^{2}', answer: 'x - y^2', separable: false },
    { tex: 'e^{x} + y', answer: 'e^x + y', separable: false },
    { tex: 'x^{2} + y^{2}', answer: 'x^2 + y^2', separable: false },
    { tex: `\\frac{x + y}{${a}}`, answer: `(x + y)/${a}`, separable: false },
  ];
  if (!hard) return plain;
  return [
    ...plain,
    { tex: 'xy + x + y', answer: 'x*y + x + y', separable: false },
    { tex: '\\ln(xy)', answer: 'log(x*y)', separable: false },
    { tex: '\\sin(x + y)', answer: 'sin(x + y)', separable: false },
    { tex: 'e^{xy}', answer: 'e^(x*y)', separable: false },
  ];
}

function separable(a: number, hard: boolean): RhsOption[] {
  const plain: RhsOption[] = [
    { tex: `${a}xy`, answer: `${a}*x*y`, separable: true },
    { tex: `\\frac{${a}x}{y}`, answer: `${a}*x/y`, separable: true },
    { tex: `${a}y\\cos x`, answer: `${a}*y*cos(x)`, separable: true },
    { tex: `${a}x^{2}y^{2}`, answer: `${a}*x^2*y^2`, separable: true },
    { tex: `\\frac{${a}y}{x}`, answer: `${a}*y/x`, separable: true },
  ];
  if (!hard) return plain;
  return [
    { tex: 'e^{x + y}', answer: 'e^(x + y)', separable: true },
    { tex: `xy + ${a}y`, answer: `x*y + ${a}*y`, separable: true },
    { tex: `x^{2}y - ${a}x^{2}`, answer: `x^2*y - ${a}*x^2`, separable: true },
    { tex: `\\frac{y + ${a}}{x}`, answer: `(y + ${a})/x`, separable: true },
    { tex: 'e^{x - y}', answer: 'e^(x - y)', separable: true },
    { tex: `${a}\\sin x\\cos y`, answer: `${a}*sin(x)*cos(y)`, separable: true },
  ];
}

export interface WhichParams {
  /** True: pick the one that can be separated. False: pick the one that cannot. */
  can: boolean;
  a: number;
  picks: number[];
  odd: number;
  hard: boolean;
}

export function whichOptions({ can, a, picks, odd, hard }: WhichParams): RhsOption[] {
  const yes = separable(a, hard);
  const no = nonSeparable(a, hard);
  const crowd = can ? no : yes;
  const oddOne = (can ? yes : no)[odd % (can ? yes : no).length];
  return [oddOne, ...picks.map((i) => crowd[i % crowd.length])];
}

const deSepWhich: Generator<WhichParams> = {
  id: 'de-sep-which',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const can = hard ? rng.chance(0.5) : true;
    const crowd = can ? nonSeparable(2, hard).length : separable(2, hard).length;
    const pool = Array.from({ length: crowd }, (_, i) => i);
    return { can, a: rng.int(2, 6), picks: rng.sample(pool, 3), odd: rng.int(0, 9), hard };
  },
  render: (params): Slide => {
    const opts = whichOptions(params);
    return choiceSlide(
      [
        prose(
          params.can
            ? 'Which of these differential equations can be solved by separating the variables?'
            : 'Three of these can be solved by separating the variables. Which one cannot?',
        ),
      ],
      opts.map((opt, idx) => ({ label: `${rate('y', 'x')} = ${opt.tex}`, tex: true, correct: idx === 0 })),
      mix(params.a, params.odd, ...params.picks),
    );
  },
  solution: (params) => {
    const [odd] = whichOptions(params);
    return [
      { text: 'An equation separates when its right-hand side is a function of $x$ times a function of $y$.' },
      {
        text: params.can
          ? `$${odd.tex}$ is one, so it separates. Each of the others adds an $x$ part to a $y$ part, which no division can pull apart.`
          : `$${odd.tex}$ adds an $x$ part to a $y$ part, so it cannot be split into a product. Each of the others is a product once it is factorised or written with the laws of indices.`,
      },
    ];
  },
};

/** The separated equation integrated: the y side, then the x side, with one constant. */
export function integratedTex({ f, g }: SepParams): string {
  return `${Y_INTEGRAL[g].tex} = ${bigFTex(f)} + C`;
}

/** The last line of working: y alone where that is tidy, a power of y where it is not. */
export function tidiedTex({ f, g }: SepParams): string {
  switch (g) {
    case 'y':
      return `y = Ae^{${bigFTex(f)}}`;
    case 'y2':
      return `y = -\\frac{1}{${bigFTex(f)} + C}`;
    case 'inv':
      return `y^{2} = ${bigFTex(f, 2)} + C`;
    case 'inv2':
      return `y^{3} = ${bigFTex(f, 3)} + C`;
    case 'ey':
      return `y = -\\ln(C - ${f.type === 'sin' ? `(${bigFTex(f)})` : bigFTex(f)})`;
  }
}

function tidySlips({ f, g }: SepParams): string[] {
  const F = bigFTex(f);
  switch (g) {
    case 'y':
      return [`y = e^{${F}} + C`, `y = A + e^{${F}}`, `y = Ae^{${fTex(f)}}`];
    case 'y2':
      return [`y = \\frac{1}{${F} + C}`, `y = -${f.type === 'sin' ? `(${F})` : F} - C`, `y^{2} = ${F} + C`];
    case 'inv':
      return [`y^{2} = ${F} + C`, `y = ${bigFTex(f, 2)} + C`, `y^{2} = ${fTex(f)} + C`];
    case 'inv2':
      return [`y^{3} = ${F} + C`, `y = ${bigFTex(f, 3)} + C`, `y^{2} = ${bigFTex(f, 2)} + C`];
    case 'ey':
      return [`y = \\ln(${F} + C)`, `y = -\\ln(${F}) + C`, `y = e^{${F}} + C`];
  }
}

function integrateSlips({ f, g }: SepParams): string[] {
  const wrongY: Record<YFactor, string> = {
    y: 'y',
    y2: '\\frac{1}{y}',
    inv: 'y^{2}',
    inv2: 'y^{3}',
    ey: 'e^{-y}',
  };
  return [`${Y_INTEGRAL[g].tex} = ${slipFTex(f)} + C`, `${wrongY[g]} = ${bigFTex(f)} + C`, `${Y_INTEGRAL[g].tex} + C = ${fTex(f)}`];
}

function sampleSepSteps(rng: Rng, difficulty: number): SepParams {
  const hard = difficulty >= 2;
  return {
    f: sampleX(rng, difficulty, hard ? ['poly', 'cos', 'sin'] : ['poly', 'poly', 'cos']),
    g: rng.pick<YFactor>(hard ? ['y', 'y2', 'inv', 'inv2', 'ey'] : ['y', 'y', 'inv', 'inv2']),
  };
}

/** Separate, integrate, tidy: the whole method one line at a time. */
const deSepSteps: Generator<SepParams> = {
  id: 'de-sep-steps',
  sample: sampleSepSteps,
  render: (params): Slide => {
    const { f, g } = params;
    const separated = separatedTex(params);
    const integrated = integratedTex(params);
    const tidied = tidiedTex(params);
    return {
      kind: 'steps',
      prompt: [
        prose(
          'Solve this one step at a time: tap the $=$ to separate the variables, then tap the line each time to integrate and tidy it up.',
        ),
      ],
      start: [rate('y', 'x'), '=', sepRhsTex(f, g)],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: separated,
          bank: stepBank(
            separated,
            `${Y_PART[g].g}\\,dy = ${fTex(f)}\\,dx`,
            `${Y_PART[g].tex}\\,dy = ${fInvTex(f)}\\,dx`,
            `${fTex(f)}\\,dy = ${Y_PART[g].tex}\\,dx`,
          ),
        },
        { span: [0, 1], operator: 0, value: integrated, bank: stepBank(integrated, ...integrateSlips(params)) },
        { span: [0, 1], operator: 0, value: tidied, bank: stepBank(tidied, ...tidySlips(params)) },
      ],
    };
  },
  solution: (params) => {
    const { f, g } = params;
    const tidy: Record<YFactor, string> = {
      y: 'Take $e$ to the power of each side. $e^{C}$ is just another constant, called $A$, and it absorbs the $\\pm$ from $|y|$.',
      y2: 'Multiply by $-1$ and turn both sides upside down.',
      inv: 'Multiply by $2$. Twice an unknown constant is still an unknown constant, so it stays $C$.',
      inv2: 'Multiply by $3$. Three times an unknown constant is still an unknown constant.',
      ey: 'Multiply by $-1$, write $-C$ as a new constant $C$, then take $\\ln$ and multiply by $-1$ again.',
    };
    return [
      ...sepSolution(params),
      { text: 'Integrate both sides. One constant is enough: a constant on each side would combine into one.', tex: integratedTex({ f, g }) },
      { text: tidy[g], tex: tidiedTex({ f, g }) },
    ];
  },
};

/** Integrate one side of a separated equation, typed. Never the side whose integral is ln|y|. */
export interface SepIntegrateParams extends SepParams {
  /** Which side is asked for. */
  side: 'x' | 'y';
  /** Whether the prompt shows the separated form or leaves the separating to the learner. */
  shown: boolean;
}

export function sepIntegrand({ f, g, side }: SepIntegrateParams): { variable: string; integrand: string; answer: string } {
  if (side === 'y') return { variable: 'y', integrand: Y_PART[g].answer, answer: Y_INTEGRAL[g].answer! };
  return { variable: 'x', integrand: fAnswer(f), answer: bigFAnswer(f) };
}

const deSepIntegrate: Generator<SepIntegrateParams> = {
  id: 'de-sep-integrate',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const f = sampleX(rng, difficulty, hard ? ['poly', 'cos', 'sin', 'exp'] : ['poly', 'poly', 'cos', 'exp']);
    const g = rng.pick<YFactor>(hard ? ['y', 'y2', 'inv', 'inv2', 'ey'] : ['y', 'y2', 'inv', 'inv2']);
    // The y side of dy/y is ln|y|, which is never typed.
    const side = g === 'y' ? 'x' : rng.chance(0.6) ? 'y' : 'x';
    return { f, g, side, shown: !hard };
  },
  render: (params): Slide => {
    const { f, g, side, shown } = params;
    const which = side === 'y' ? '$y$' : '$x$';
    const lead = side === 'y' ? `\\int ${Y_PART[g].tex}\\,dy =` : `\\int ${fTex(f)}\\,dx =`;
    return {
      kind: 'expression',
      prompt: shown
        ? [
            prose('Separating the variables in'),
            display(sepDe(params)),
            prose(`gives $${separatedTex(params)}$. Integrate the ${which} side.`),
          ]
        : [prose('Separate the variables in'), display(sepDe(params)), prose(`then integrate the ${which} side.`)],
      lead,
      keypad: side === 'y' ? Y_INTEGRAL_KEYS : X_INTEGRAL_KEYS,
      answer: sepIntegrand(params).answer,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: (params) => {
    const { f, g, side } = params;
    return [
      ...sepSolution(params),
      side === 'y'
        ? { text: 'Integrate the $y$ side.', tex: `\\int ${Y_PART[g].tex}\\,dy = ${Y_INTEGRAL[g].tex} + C` }
        : { text: 'Integrate the $x$ side.', tex: `\\int ${fTex(f)}\\,dx = ${bigFTex(f)} + C` },
    ];
  },
};

/* ============================================================
 * Level 1, lesson 3: the general solution
 * ============================================================ */

/** dy/dt = k t^p y, or dy/dt = y cos t, whose solution is A e^(something). */
export type GrowthRhs =
  | { type: 'const'; top: number; bottom: number; sign: number }
  | { type: 'power'; c: number; p: number; sign: number }
  | { type: 'cos' };

export interface GeneralParams {
  sym: string;
  rhs: GrowthRhs;
}

const GENERAL_SYMS = ['y', 'N', 'P', 'M', 'V'];

type ConstRhs = { top: number; bottom: number; sign: number };

/** The growth constant as a number the learner reads: `0.4`, `-1`. */
const constCoef = (rhs: ConstRhs): string => `${rhs.sign < 0 ? '-' : ''}${decimal(rhs.top, rhs.bottom)}`;

/** The same constant in front of a letter, where 1 and -1 are implied. */
const constK = (rhs: ConstRhs): string => (rhs.top === rhs.bottom ? (rhs.sign < 0 ? '-' : '') : constCoef(rhs));

export function generalDeTex({ sym, rhs }: GeneralParams): string {
  if (rhs.type === 'cos') return `${rate(sym)} = ${sym}\\cos t`;
  if (rhs.type === 'const') return `${rate(sym)} = ${constK(rhs)}${sym}`;
  const lead = rhs.c * (rhs.p + 1) * rhs.sign;
  return `${rate(sym)} = ${coef(lead)}${rhs.p === 1 ? 't' : `t^{${rhs.p}}`}${sym}`;
}

/** The exponent of the general solution, TeX. */
export function exponentTex(rhs: GrowthRhs): string {
  if (rhs.type === 'cos') return '\\sin t';
  if (rhs.type === 'const') return `${constK(rhs)}t`;
  return `${coef(rhs.c * rhs.sign)}t^{${rhs.p + 1}}`;
}

/** The same exponent, for mathjs. */
export function exponentAnswer(rhs: GrowthRhs): string {
  if (rhs.type === 'cos') return 'sin(t)';
  if (rhs.type === 'const') return `(${rhs.sign * (rhs.top / rhs.bottom)})*t`;
  return `(${rhs.c * rhs.sign})*t^(${rhs.p + 1})`;
}

/** The right-hand side for mathjs, in t and the quantity called `y`. */
export function generalRhsAnswer(rhs: GrowthRhs): string {
  if (rhs.type === 'cos') return 'y*cos(t)';
  if (rhs.type === 'const') return `(${rhs.sign * (rhs.top / rhs.bottom)})*y`;
  return `(${rhs.c * (rhs.p + 1) * rhs.sign})*t^(${rhs.p})*y`;
}

/** Growth constants a learner meets in context: whole, tenths and hundredths. */
const K_FRACTIONS: [number, number][] = [
  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10],
  [1, 20], [3, 20], [1, 4], [3, 4], [2, 100], [4, 100], [6, 100],
];

function sampleGeneral(rng: Rng, difficulty: number): GeneralParams {
  const sym = rng.pick(GENERAL_SYMS);
  if (difficulty >= 2 && rng.chance(0.6)) {
    if (rng.chance(0.2)) return { sym, rhs: { type: 'cos' } };
    return { sym, rhs: { type: 'power', c: rng.int(1, 3), p: rng.int(1, 2), sign: rng.sign() } };
  }
  const [top, bottom] = rng.pick(K_FRACTIONS);
  return { sym, rhs: { type: 'const', top, bottom, sign: rng.chance(0.4) ? -1 : 1 } };
}

function generalSolution({ sym, rhs }: GeneralParams): SolutionStep[] {
  const integrand =
    rhs.type === 'const' ? constCoef(rhs) : rhs.type === 'cos' ? '\\cos t' : `${coef(rhs.c * (rhs.p + 1) * rhs.sign)}t^{${rhs.p}}`;
  return [
    { text: `Separate: divide by $${sym}$ and multiply by $dt$.`, tex: `\\frac{1}{${sym}}\\,d${sym} = ${integrand}\\,dt` },
    { text: 'Integrate both sides.', tex: `\\ln|${sym}| = ${exponentTex(rhs)} + C` },
    {
      text: `Take $e$ to the power of each side. $e^{C}$ is a constant, called $A$, and it can be negative too, which covers the $\\pm$ from $|${sym}|$.`,
      tex: `${sym} = Ae^{${exponentTex(rhs)}}`,
    },
  ];
}

/** The general solution of a growth equation, as tiles with A in the bank. */
const deGeneralTiles: Generator<GeneralParams> = {
  id: 'de-general-tiles',
  sample: sampleGeneral,
  render: (params): Slide => {
    const { sym, rhs } = params;
    const exponent = exponentTex(rhs);
    const answer = ['A', `e^{${exponent}}`];
    const flipped =
      rhs.type === 'cos'
        ? '-\\sin t'
        : exponent.startsWith('-')
          ? exponent.slice(1)
          : `-${exponent}`;
    const wrongExponent =
      rhs.type === 'const' ? `e^{${constCoef(rhs)}}` : rhs.type === 'cos' ? 'e^{\\cos t}' : `e^{${coef(rhs.c * (rhs.p + 1) * rhs.sign)}t^{${rhs.p}}}`;
    return {
      kind: 'tiles',
      prompt: [prose('Find the general solution of'), display(generalDeTex(params)), prose('where $A$ is a constant.')],
      template: `${sym} = {0}\\,{1}`,
      bank: tokenBank(answer, [`e^{${flipped}}`, wrongExponent, '\\ln A', rhs.type === 'const' ? constCoef(rhs) : 't'], 3),
      answer,
    };
  },
  solution: generalSolution,
};

/** Integrate both sides of a separated power equation, as a tree of new powers and coefficients. */
export interface PowerSideParams {
  /** b y^m dy = a x^n dx, with b = beta (m + 1) and a = alpha (n + 1). */
  m: number;
  n: number;
  alpha: number;
  beta: number;
}

const deGeneralTree: Generator<PowerSideParams> = {
  id: 'de-general-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    return {
      m: rng.int(1, 3),
      n: rng.int(hard ? 0 : 1, 3),
      alpha: rng.int(1, hard ? 6 : 4) * (hard && rng.chance(0.3) ? -1 : 1),
      beta: rng.int(1, hard ? 5 : 3),
    };
  },
  render: ({ m, n, alpha, beta }): Slide => {
    const b = beta * (m + 1);
    const a = alpha * (n + 1);
    const answer = [m + 1, beta, n + 1, alpha];
    return {
      kind: 'tree',
      prompt: [
        prose(`Separating $${rate('y', 'x')} = \\frac{${termTex(a, n)}}{${termTex(b, m).replace('x', 'y')}}$ gives the equation below. Integrate both sides.`),
        prose('Fill in the new power of $y$ and its coefficient, then the new power of $x$ and its coefficient.'),
      ],
      expression: `${termTex(b, m).replace('x', 'y')}\\,dy = ${termTex(a, n)}\\,dx`,
      nodes: [
        { id: 'yp', from: [] },
        { id: 'yc', from: ['yp'] },
        { id: 'xp', from: [] },
        { id: 'xc', from: ['xp'] },
      ],
      bank: treeBank(answer, [m, n, b, a, b * (m + 1), a * (n + 1)]),
      answer: answer.map(String),
    };
  },
  solution: ({ m, n, alpha, beta }) => {
    const b = beta * (m + 1);
    const a = alpha * (n + 1);
    return [
      { text: `Add one to each power and divide by the new power. On the $y$ side, $y^{${m}}$ becomes $\\frac{y^{${m + 1}}}{${m + 1}}$, so $${b} \\div ${m + 1} = ${beta}$.` },
      { text: `On the $x$ side, $${n === 0 ? `${a}` : `x^{${n}}`}$ becomes ${n === 0 ? `$${a === 1 ? '' : a}x$` : `$\\frac{x^{${n + 1}}}{${n + 1}}$, so $${a} \\div ${n + 1} = ${alpha}$`}.` },
      { text: 'One constant covers both sides.', tex: `${termTex(beta, m + 1).replace('x', 'y')} = ${termTex(alpha, n + 1)} + C` },
    ];
  },
};

/**
 * A general solution left as a power of y: `y^2 = 2F(x) + C`, `y^3 = 3F(x) + C`
 * or `1/y = -F(x) + C`. Typed under `upToConstant`, which forgives the added
 * constant and nothing else — and an added constant is all these differ by.
 */
export type ImplicitForm = 'square' | 'cube' | 'recip';

export interface ImplicitParams {
  f: XFactor;
  form: ImplicitForm;
}

export const IMPLICIT: Record<ImplicitForm, { g: YFactor; lead: string; lhs: string; scale: number }> = {
  square: { g: 'inv', lead: 'y^{2} =', lhs: 'y^2', scale: 2 },
  cube: { g: 'inv2', lead: 'y^{3} =', lhs: 'y^3', scale: 3 },
  recip: { g: 'y2', lead: '\\frac{1}{y} =', lhs: '1/y', scale: -1 },
};

const deGeneralImplicit: Generator<ImplicitParams> = {
  id: 'de-general-implicit',
  sample: (rng, difficulty) => ({
    f: sampleX(rng, difficulty, difficulty >= 2 ? ['poly', 'cos', 'sin', 'exp'] : ['poly', 'poly', 'cos']),
    form: rng.pick<ImplicitForm>(difficulty >= 2 ? ['square', 'cube', 'recip'] : ['square', 'cube']),
  }),
  choices: ({ f, form }) => {
    const { scale } = IMPLICIT[form];
    return options(
      { tex: `${bigFTex(f, scale)} + C`, answer: `${bigFAnswer(f, scale)} + C` },
      { tex: `${bigFTex(f)} + C`, answer: `${bigFAnswer(f)} + C` },
      { tex: `${bigFTex(f, -scale)} + C`, answer: `${bigFAnswer(f, -scale)} + C` },
      { tex: `${fTex(f)} + C`, answer: `${fAnswer(f)} + C` },
    );
  },
  render: ({ f, form }): Slide => ({
    kind: 'expression',
    prompt: [prose('Solve'), display(`${rate('y', 'x')} = ${sepRhsTex(f, IMPLICIT[form].g)}`), prose('giving the answer in the form below.')],
    lead: IMPLICIT[form].lead,
    keypad: X_INTEGRAL_KEYS,
    answer: bigFAnswer(f, IMPLICIT[form].scale),
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: ({ f, form }) => {
    const { g, scale, lead } = IMPLICIT[form];
    return [
      { text: `Separate the variables.`, tex: separatedTex({ f, g }) },
      { text: 'Integrate both sides.', tex: integratedTex({ f, g }) },
      {
        text:
          scale === -1
            ? 'Multiply by $-1$. Minus an unknown constant is still an unknown constant.'
            : `Multiply by $${scale}$. ${scale} times an unknown constant is still an unknown constant.`,
        tex: `${lead} ${bigFTex(f, scale)} + C`,
      },
    ];
  },
};

/* ============================================================
 * Level 1, lesson 4: a particular solution
 * ============================================================ */

/**
 * y = A e^(kt) with k = ±(ln b)/h, so y at a whole multiple of h is A times
 * or divided by a whole power of b. `at` and `to` are those multiples: the
 * condition is given at t = at·h and the question asks about t = to·h.
 */
export interface ExpModelParams {
  sym: string;
  k: LnRate;
  A: number;
  at: number;
  to: number;
}

/** The model's value at t = m·h, whole by construction. */
export function expValue({ k, A }: ExpModelParams, m: number): number {
  return k.sign > 0 ? A * k.b ** m : A / k.b ** m;
}

/** The model for mathjs, in t. */
export function expSolutionAnswer({ k, A }: ExpModelParams): string {
  return `(${A})*e^(${lnAnswer(k)}*t)`;
}

const expDeTex = ({ sym, k }: ExpModelParams): string => `${rate(sym)} = ${lnFactor(k)}${sym}`;

function sampleExpModel(rng: Rng, difficulty: number, opts: { maxA: number; maxPower: number }): ExpModelParams {
  const hard = difficulty >= 2;
  for (;;) {
    const b = rng.pick([2, 2, 3]);
    const k: LnRate = { b, h: rng.int(1, 5), sign: rng.chance(hard ? 0.5 : 0.35) ? -1 : 1 };
    const at = hard ? rng.int(1, 2) : 0;
    const to = rng.int(at === 0 ? 1 : 0, 3);
    if (to === at) continue;
    const top = Math.max(at, to);
    if (b ** top > opts.maxPower) continue;
    // A decaying model starts high enough to divide down to whole numbers.
    const base = rng.int(2, opts.maxA);
    const A = k.sign > 0 ? base : base * b ** top;
    return { sym: rng.pick(GENERAL_SYMS), k, A, at, to };
  }
}

function expSolution(params: ExpModelParams): SolutionStep[] {
  const { sym, k, A, at, to } = params;
  const t1 = at * k.h;
  const t2 = to * k.h;
  const factor = (m: number) => `${k.b}^{${m}}`;
  const steps: SolutionStep[] = [
    { text: `The general solution is $${sym} = Ae^{kt}$. With $k = ${lnTex(k)}$, $e^{kt}$ ${k.sign > 0 ? 'multiplies' : 'divides'} by $${k.b}$ every ${k.h === 1 ? 'unit' : `$${k.h}$ units`} of time.` },
  ];
  if (at === 0) {
    steps.push({ text: `At $t = 0$, $e^{0} = 1$, so $A = ${A}$.` });
  } else {
    steps.push({
      text: `From $t = 0$ to $t = ${t1}$ it ${k.sign > 0 ? 'multiplies' : 'divides'} by $${factor(at)}$, so going back, $A = ${expValue(params, at)} ${k.sign > 0 ? '\\div' : '\\times'} ${k.b ** at} = ${A}$.`,
    });
  }
  steps.push({
    text: `At $t = ${t2}$, ${to === 0 ? 'the value is $A$ itself' : `$e^{kt} = ${k.sign > 0 ? factor(to) : `\\frac{1}{${factor(to)}}`}$`}.`,
    tex: `${sym}(${t2}) = ${expValue(params, to)}`,
  });
  return steps;
}

/** A from the condition, then the value at a later time, as a tree. */
const deParticularTree: Generator<ExpModelParams> = {
  id: 'de-particular-tree',
  sample: (rng, difficulty) => sampleExpModel(rng, difficulty, { maxA: 12, maxPower: 27 }),
  render: (params): Slide => {
    const { sym, k, A, at, to } = params;
    const t1 = at * k.h;
    const t2 = to * k.h;
    const y1 = expValue(params, at);
    const y2 = expValue(params, to);
    const grow = k.sign > 0 ? 'bigger' : 'smaller';
    if (at === 0) {
      const answer = [A, k.b ** to, y2];
      return {
        kind: 'tree',
        prompt: [
          prose(`Solve $${expDeTex(params)}$ with $${sym}(0) = ${A}$, and find $${sym}(${t2})$.`),
          prose(`Fill in $A$, then how many times ${grow} $e^{kt}$ is at $t = ${t2}$ than at $t = 0$, then $${sym}(${t2})$.`),
        ],
        expression: `${sym} = A${lnExpTex(k)}`,
        nodes: [
          { id: 'A', from: [] },
          { id: 'f', from: [] },
          { id: 'v', from: ['A', 'f'] },
        ],
        bank: treeBank(answer, [k.b ** (to + 1), k.b * to, A * k.b ** (to + 1), k.sign > 0 ? A + k.b ** to : A - k.b ** to, to]),
        answer: answer.map(String),
      };
    }
    const answer = [k.b ** at, A, k.b ** to, y2];
    return {
      kind: 'tree',
      prompt: [
        prose(`Solve $${expDeTex(params)}$ with $${sym}(${t1}) = ${y1}$, and find $${sym}(${t2})$.`),
        prose(
          `Fill in how many times ${grow} $e^{kt}$ is at $t = ${t1}$ than at $t = 0$, then $A$, then the same for $t = ${t2}$, then $${sym}(${t2})$.`,
        ),
      ],
      expression: `${sym} = A${lnExpTex(k)}`,
      nodes: [
        { id: 'f1', from: [] },
        { id: 'A', from: ['f1'] },
        { id: 'f2', from: [] },
        { id: 'v', from: ['A', 'f2'] },
      ],
      bank: treeBank(answer, [y1, k.sign > 0 ? y1 * k.b ** at : y1 / k.b ** at, k.b * at, y2 * k.b, y2 + 1]),
      answer: answer.map(String),
    };
  },
  solution: expSolution,
};

/**
 * y at a whole time from a condition, typed. At difficulty 2 some are the
 * separable `dy/dx = ±x/y`, whose solutions are circles and hyperbolas, set on
 * a Pythagorean triple so the root is whole.
 */
export type ValueParams =
  | ({ form: 'exp' } & ExpModelParams)
  | { form: 'hyperbola' | 'circle'; triple: [number, number, number]; fromZero: boolean };

/** Pythagorean triples: legs, then hypotenuse. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [9, 12, 15],
  [12, 9, 15],
  [7, 24, 25],
  [24, 7, 25],
  [20, 21, 29],
  [21, 20, 29],
];

/**
 * The condition and the question for a conic solution: [x given, y given,
 * x asked, y answer]. For `dy/dx = x/y`, y^2 - x^2 is constant, so from
 * (0, b) the curve reaches (a, c). For `dy/dx = -x/y`, x^2 + y^2 is constant,
 * so from (0, c) it reaches (a, b).
 */
export function conicPoints(params: Extract<ValueParams, { form: 'hyperbola' | 'circle' }>): [number, number, number, number] {
  const [a, b, c] = params.triple;
  const start: [number, number] = params.form === 'hyperbola' ? [0, b] : [0, c];
  const end: [number, number] = params.form === 'hyperbola' ? [a, c] : [a, b];
  return params.fromZero ? [...start, end[0], end[1]] : [...end, start[0], start[1]];
}

export function valueAnswer(params: ValueParams): number {
  if (params.form === 'exp') return expValue(params, params.to);
  return conicPoints(params)[3];
}

const deParticularValue: Generator<ValueParams> = {
  id: 'de-particular-value',
  sample: (rng, difficulty) => {
    if (difficulty >= 2 && rng.chance(0.35)) {
      return { form: rng.chance(0.5) ? 'hyperbola' : 'circle', triple: rng.pick(TRIPLES), fromZero: rng.chance(0.5) };
    }
    return { form: 'exp', ...sampleExpModel(rng, difficulty, { maxA: 15, maxPower: 27 }) };
  },
  choices: (params) => {
    const answer = valueAnswer(params);
    if (params.form === 'exp') {
      const { k, at, to } = params;
      const y1 = expValue(params, at);
      return numberChoices(
        answer,
        [k.sign > 0 ? y1 * k.b ** to : y1 / k.b ** to, answer * k.b, k.sign > 0 ? y1 + k.b ** to : answer * k.b ** 2, params.A],
        mix(answer, k.b, k.h, to),
      );
    }
    const [x1, y1, x2] = conicPoints(params);
    return numberChoices(answer, [y1 + x2 - x1, Math.abs(y1 - x2), x2 + y1], mix(answer, x1, y1, x2));
  },
  render: (params): Slide => {
    if (params.form === 'exp') {
      const { sym, k, at, to } = params;
      return {
        kind: 'expression',
        prompt: [prose('Solve'), display(expDeTex(params)), prose(`with $${sym}(${at * k.h}) = ${expValue(params, at)}$, and find $${sym}(${to * k.h})$.`)],
        lead: `${sym}(${to * k.h}) =`,
        keypad: [],
        answer: `${valueAnswer(params)}`,
        domain: 'real',
        mode: 'exact',
      };
    }
    const [x1, y1, x2] = conicPoints(params);
    return {
      kind: 'expression',
      prompt: [
        prose('Solve'),
        display(`${rate('y', 'x')} = ${params.form === 'circle' ? '-' : ''}\\frac{x}{y}`),
        prose(`with $y(${x1}) = ${y1}$ and $y > 0$, and find $y(${x2})$.`),
      ],
      lead: `y(${x2}) =`,
      keypad: [],
      answer: `${valueAnswer(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    if (params.form === 'exp') return expSolution(params);
    const [x1, y1, x2, y2] = conicPoints(params);
    const circle = params.form === 'circle';
    const C = circle ? x1 * x1 + y1 * y1 : y1 * y1 - x1 * x1;
    return [
      { text: 'Separate and integrate.', tex: chain(`y\\,dy &= ${circle ? '-' : ''}x\\,dx`, `\\tfrac{1}{2}y^{2} &= ${circle ? '-' : ''}\\tfrac{1}{2}x^{2} + c`) },
      { text: 'Double, and move the $x$ term over.', tex: circle ? 'x^{2} + y^{2} = C' : 'y^{2} - x^{2} = C' },
      { text: `Put in $x = ${x1}$, $y = ${y1}$.`, tex: `C = ${C}` },
      { text: `At $x = ${x2}$, take the positive root since $y > 0$.`, tex: chain(`y^{2} &= ${C} ${circle ? '-' : '+'} ${x2 * x2} = ${y2 * y2}`, `y &= ${y2}`) },
    ];
  },
};

/** Slide to A: the start value of the solution that passes through a marked point. */
const deParticularSlider: Generator<ExpModelParams> = {
  id: 'de-particular-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const b = rng.pick([2, 2, 3]);
      const k: LnRate = { b, h: rng.int(1, 4), sign: rng.chance(difficulty >= 2 ? 0.5 : 0.3) ? -1 : 1 };
      const at = rng.int(1, 2);
      if (b ** at > 9) continue;
      // The larger of A and the marked value stays under 40, so the slider has few enough steps to drag to.
      const base = rng.int(2, Math.max(2, Math.floor(40 / b ** at)));
      return { sym: rng.pick(GENERAL_SYMS), k, A: k.sign > 0 ? base : base * b ** at, at, to: at };
    }
  },
  render: (params): Slide => {
    const { sym, k, A, at } = params;
    const t1 = at * k.h;
    const y1 = expValue(params, at);
    const top = Math.max(A, y1);
    const span = Math.ceil((top * 1.25) / 5) * 5;
    const window = markerWindow(0, span, 'y');
    const rateK = (k.sign * Math.log(k.b)) / k.h;
    const others = [A * 2, Math.max(1, Math.round(A / 2))].filter((other) => other !== A);
    return {
      kind: 'slider',
      prompt: [
        prose(`The dashed curves are solutions of $${expDeTex(params)}$ for other values of $A$ in $${sym} = A${lnExpTex(k)}$.`),
        prose(`Slide to the $A$ whose solution passes through the marked point $(${t1}, ${y1})$.`),
      ],
      min: 0,
      max: span,
      step: 1,
      answer: A,
      readout: 'A = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: t1 + k.h,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: others.map((other) => ({ f: (t: number) => Math.min(other * Math.exp(rateK * t), span * 2), dashed: true })),
          marks: [{ x: t1, y: y1 }],
          label: `Dashed solution curves and a marked point at t = ${t1}, height ${y1}`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { sym, k, A, at } = params;
    const y1 = expValue(params, at);
    return [
      { text: `$A$ is the value at $t = 0$. The marked point is ${at === 1 ? 'one step' : 'two steps'}${k.h === 1 ? '' : ` of $${k.h}$`} along, and each step ${k.sign > 0 ? 'multiplies' : 'divides'} by $${k.b}$.` },
      { tex: `A = ${y1} ${k.sign > 0 ? '\\div' : '\\times'} ${k.b ** at} = ${A}` },
      { text: `So the solution through the point is $${sym} = ${A}${lnExpTex(k)}$.` },
    ];
  },
};

/** Put the condition into the general solution: substitute, find the constant, write the solution. */
export type ParticularStepsParams =
  | { form: 'exp'; k: number; a: number; t1: 0 | 1 }
  | { form: 'poly'; p: number; n: number; x1: number; y1: number }
  | { form: 'level'; L: number; k: number; y0: number };

/** The constant the condition fixes. */
export function particularConstant(params: ParticularStepsParams): number {
  if (params.form === 'exp') return params.a;
  if (params.form === 'poly') return params.y1 * params.y1 - params.p * params.x1 ** params.n;
  return params.y0 - params.L;
}

const kExp = (k: number): string => `e^{${coef(k)}t}`;

function particularLines(params: ParticularStepsParams): { general: string; condition: string; substituted: string; constant: string; particular: string; slips: string[][] } {
  const c = particularConstant(params);
  if (params.form === 'exp') {
    const { k, a, t1 } = params;
    const at = t1 === 0 ? 'e^{0}' : `e^{${k}}`;
    const given = t1 === 0 ? `${a}` : `${a}e^{${k}}`;
    return {
      general: `y = A${kExp(k)}`,
      condition: `y(${t1}) = ${given}`,
      substituted: `${given} = A${at}`,
      constant: `A = ${a}`,
      particular: `y = ${a}${kExp(k)}`,
      slips: [
        [`${given} = A${t1 === 0 ? `e^{${k}}` : 'e^{0}'}`, `${given} = A + ${at}`, `0 = A${t1 === 0 ? `e^{${a}}` : `e^{${k}}`}`],
        [`A = ${a + 1}`, `A = ${a * k}`, 'A = 1'],
        [`y = ${a} + ${kExp(k)}`, `y = ${kExp(a * k)}`, `y = ${a}${kExp(-k)}`],
      ],
    };
  }
  if (params.form === 'poly') {
    const { p, n, x1, y1 } = params;
    const xn = p * x1 ** n;
    const term = termTex(p, n);
    return {
      general: `y^{2} = ${term} + C`,
      condition: `y(${x1}) = ${y1}`,
      substituted: `${y1 * y1} = ${xn} + C`,
      constant: `C = ${c}`,
      particular: `y^{2} = ${term} ${signed(c)}`,
      slips: [
        [`${y1} = ${xn} + C`, `${y1 * y1} = ${p * x1} + C`, `${x1 * x1} = ${p * y1 ** n} + C`],
        [`C = ${y1 * y1 + xn}`, `C = ${y1 - xn}`, `C = ${-c}`],
        [`y^{2} = ${term} ${signed(-c)}`, `y = ${term} ${signed(c)}`, `y^{2} = ${termTex(p + c, n)}`],
      ],
    };
  }
  const { L, k, y0 } = params;
  return {
    general: `y = ${L} + A${kExp(-k)}`,
    condition: `y(0) = ${y0}`,
    substituted: `${y0} = ${L} + A`,
    constant: `A = ${c}`,
    particular: `y = ${L} ${signed(c)}${kExp(-k)}`,
    slips: [
      [`${y0} = ${L}A`, `${y0} = A`, `${y0} = ${L} + A${kExp(-k)}`],
      [`A = ${y0 + L}`, `A = ${y0}`, `A = ${-c}`],
      [`y = ${y0} + ${L}${kExp(-k)}`, `y = ${L} ${signed(-c)}${kExp(-k)}`, `y = ${c}${kExp(-k)}`],
    ],
  };
}

const deParticularSteps: Generator<ParticularStepsParams> = {
  id: 'de-particular-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const form = rng.pick(hard ? (['exp', 'poly', 'poly', 'level'] as const) : (['exp', 'poly'] as const));
    if (form === 'exp') {
      return { form, k: rng.int(1, 5) * rng.sign(), a: rng.int(2, 20), t1: hard && rng.chance(0.5) ? 1 : 0 };
    }
    if (form === 'level') {
      for (;;) {
        const L = rng.int(2, 9) * 5;
        const y0 = rng.int(1, 20) * 5;
        if (y0 !== L) return { form, L, k: rng.int(1, 4), y0 };
      }
    }
    for (;;) {
      const p = rng.int(1, 5);
      const n = rng.int(2, 3);
      const x1 = rng.int(hard ? -3 : 0, 3);
      const y1 = rng.int(1, 9);
      const c = y1 * y1 - p * x1 ** n;
      if (c !== 0 && (hard || x1 !== 0 || rng.chance(0.4))) return { form, p, n, x1, y1 };
    }
  },
  render: (params): Slide => {
    const lines = particularLines(params);
    const letter = params.form === 'poly' ? 'C' : 'A';
    return {
      kind: 'steps',
      prompt: [
        prose(`A general solution and a condition are below. Tap the comma to put the condition in, then tap the line to find $${letter}$, then again to write the particular solution.`),
      ],
      start: [lines.general, ',', lines.condition],
      reductions: [
        { span: [0, 3], operator: 1, value: lines.substituted, bank: stepBank(lines.substituted, ...lines.slips[0]) },
        { span: [0, 1], operator: 0, value: lines.constant, bank: stepBank(lines.constant, ...lines.slips[1]) },
        { span: [0, 1], operator: 0, value: lines.particular, bank: stepBank(lines.particular, ...lines.slips[2]) },
      ],
    };
  },
  solution: (params) => {
    const lines = particularLines(params);
    const letter = params.form === 'poly' ? 'C' : 'A';
    const where =
      params.form === 'poly' ? `$x = ${params.x1}$ and $y = ${params.y1}$` : params.form === 'exp' ? `$t = ${params.t1}$` : '$t = 0$, where $e^{0} = 1$';
    return [
      { text: `Put ${where} into the general solution.`, tex: lines.substituted },
      { text: `Solve for $${letter}$.`, tex: lines.constant },
      { text: `Write the general solution again with $${letter}$ replaced.`, tex: lines.particular },
    ];
  },
};

/* ============================================================
 * Level 1, lesson 5: growth and decay
 * ============================================================ */

interface GrowthStory {
  sym: string;
  what: string;
  unit: string;
  up: boolean;
}

const GROWTH_STORIES: GrowthStory[] = [
  { sym: 'P', what: 'A population of bacteria', unit: 'hour', up: true },
  { sym: 'V', what: 'The value of an investment', unit: 'year', up: true },
  { sym: 'F', what: 'The number of fish in a new lake', unit: 'month', up: true },
  { sym: 'M', what: 'The mass of a radioactive sample', unit: 'year', up: false },
  { sym: 'D', what: 'The amount of a drug in the blood', unit: 'hour', up: false },
  { sym: 'W', what: 'The number of wolves in a shrinking pack', unit: 'year', up: false },
];

export interface GrowthParams {
  ctx: number;
  /** k as a percentage of the amount per unit of time. */
  percent: number;
  A: number;
}

export const growthK = ({ ctx, percent }: GrowthParams): number => ((GROWTH_STORIES[ctx].up ? 1 : -1) * percent) / 100;

const growthKTex = (params: GrowthParams): string => `${growthK(params)}`;

export const growthSolutionAnswer = (params: GrowthParams): string => `(${params.A})*e^((${growthK(params)})*t)`;

const growthSolutionTex = (params: GrowthParams): string => `${GROWTH_STORIES[params.ctx].sym} = ${params.A}e^{${growthKTex(params)}t}`;

const growthDeTex = (params: GrowthParams): string => {
  const s = GROWTH_STORIES[params.ctx].sym;
  return `${rate(s)} = ${growthKTex(params)}${s}`;
};

const PERCENTS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30];
const STARTS = [40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 750, 800, 1000, 1200];

function sampleGrowth(rng: Rng, difficulty: number): GrowthParams {
  return {
    ctx: rng.int(0, GROWTH_STORIES.length - 1),
    percent: rng.pick(difficulty >= 2 ? PERCENTS : PERCENTS.slice(0, 9)),
    A: rng.pick(STARTS),
  };
}

function growthStatement(params: GrowthParams): string {
  const story = GROWTH_STORIES[params.ctx];
  return `${story.what}, $${story.sym}$, ${story.up ? 'grows' : 'falls'} at a rate equal to ${params.percent}% of its current size, with $t$ in ${story.unit}s. At the start $${story.sym} = ${params.A}$.`;
}

function growthSolution(params: GrowthParams): SolutionStep[] {
  const s = GROWTH_STORIES[params.ctx].sym;
  const k = growthK(params);
  return [
    { text: `${params.percent}% of the amount is $${Math.abs(k)}${s}$, and it is ${k > 0 ? 'growing' : 'falling'}.`, tex: growthDeTex(params) },
    { text: 'Separate and integrate.', tex: `\\ln ${s} = ${k}t + C` },
    { text: `So $${s} = Ae^{${k}t}$, and at $t = 0$ that is $A$.`, tex: growthSolutionTex(params) },
  ];
}

/** Rate statement to particular solution, one line at a time. */
const deGrowthSteps: Generator<GrowthParams> = {
  id: 'de-growth-steps',
  sample: sampleGrowth,
  render: (params): Slide => {
    const s = GROWTH_STORIES[params.ctx].sym;
    const k = growthK(params);
    const half = k / 2;
    const logged = `\\ln ${s} = ${k}t + C`;
    const general = `${s} = Ae^{${k}t}`;
    const particular = growthSolutionTex(params);
    return {
      kind: 'steps',
      prompt: [
        prose(growthStatement(params)),
        prose('Solve it one step at a time: tap the comma to separate and integrate, then tap the line to undo the log, then again to use the start value.'),
      ],
      start: [growthDeTex(params), ',', `${s}(0) = ${params.A}`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: logged,
          bank: stepBank(logged, `\\ln ${s} = ${-k}t + C`, `${s} = ${k}t + C`, `\\ln ${s} = ${half}t^{2} + C`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: general,
          bank: stepBank(general, `${s} = e^{${k}t} + C`, `${s} = A + e^{${k}t}`, `${s} = Ae^{${k}}t`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(particular, `${s} = ${params.A} + e^{${k}t}`, `${s} = ${k}e^{${params.A}t}`, `${s} = ${params.A}e^{${-k}t}`),
        },
      ],
    };
  },
  solution: growthSolution,
};

/** The particular solution, typed as a function of t. */
const deGrowthSolution: Generator<GrowthParams & { words: boolean }> = {
  id: 'de-growth-solution',
  sample: (rng, difficulty) => ({ ...sampleGrowth(rng, difficulty), words: difficulty >= 2 }),
  render: (params): Slide => {
    const story = GROWTH_STORIES[params.ctx];
    return {
      kind: 'expression',
      prompt: params.words
        ? [prose(growthStatement(params)), prose(`Write $${story.sym}$ in terms of $t$.`)]
        : [prose('Solve'), display(growthDeTex(params)), prose(`with $${story.sym}(0) = ${params.A}$, writing $${story.sym}$ in terms of $t$.`)],
      lead: `${story.sym} =`,
      keypad: T_EXP_KEYS,
      answer: growthSolutionAnswer(params),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: growthSolution,
};

/** One option of a "which equation does this solve" question. */
export interface MatchOption {
  tex: string;
  /** The right-hand side for mathjs, in the quantity (as `y`) and t. */
  rhs: string;
  start: number;
  correct?: boolean;
}

export function matchOptions(params: GrowthParams): MatchOption[] {
  const s = GROWTH_STORIES[params.ctx].sym;
  const k = growthK(params);
  const { A } = params;
  const eq = (rhs: string, start: number) => `${rate(s)} = ${rhs},\\ \\ ${s}(0) = ${start}`;
  return [
    { tex: eq(`${k}${s}`, A), rhs: `(${k})*y`, start: A, correct: true },
    { tex: eq(`${-k}${s}`, A), rhs: `(${-k})*y`, start: A },
    { tex: eq(`${A}${s}`, k), rhs: `(${A})*y`, start: k },
    { tex: eq(`${k}t`, A), rhs: `(${k})*t`, start: A },
  ];
}

/** From the solution back to the equation and condition it solves. */
const deGrowthMatch: Generator<GrowthParams> = {
  id: 'de-growth-match',
  sample: sampleGrowth,
  render: (params): Slide => {
    const story = GROWTH_STORIES[params.ctx];
    return choiceSlide(
      [
        prose(`${story.what} is modelled by`),
        display(growthSolutionTex(params)),
        prose('Which differential equation and starting value does it solve?'),
      ],
      matchOptions(params).map((opt) => ({ label: opt.tex, tex: true, correct: opt.correct })),
      mix(params.ctx, params.percent, params.A),
    );
  },
  solution: (params) => {
    const s = GROWTH_STORIES[params.ctx].sym;
    const k = growthK(params);
    return [
      { text: `Differentiating brings the $${k}$ down in front: the rate is $${k}$ times the amount. That is the rate of change lesson in Exponential Models, run the other way.` },
      { tex: chain(`${rate(s)} &= ${k} \\times ${params.A}e^{${k}t}`, `&= ${k}${s}`) },
      { text: `At $t = 0$, $e^{0} = 1$, so it starts at $${params.A}$.` },
    ];
  },
};

/* ============================================================
 * Level 2, lesson 1: Newton's law of cooling
 * ============================================================ */

interface CoolStory {
  sym: string;
  what: string;
  /** Where it is put: a room, or a freezer. */
  place: 'room' | 'freezer';
}

const HOT_STORIES: CoolStory[] = [
  { sym: 'T', what: 'A cup of tea', place: 'room' },
  { sym: 'T', what: 'A bowl of soup', place: 'room' },
  { sym: '\\theta', what: 'A metal bar from a furnace', place: 'room' },
  { sym: 'T', what: 'A cake from the oven', place: 'room' },
  { sym: '\\theta', what: 'A bath of hot water', place: 'room' },
];

const COLD_STORIES: CoolStory[] = [
  { sym: 'T', what: 'A can of drink from the fridge', place: 'room' },
  { sym: '\\theta', what: 'A bottle of milk from the fridge', place: 'room' },
  { sym: 'T', what: 'A jug of water', place: 'freezer' },
];

export interface CoolParams {
  story: CoolStory;
  /** The surroundings. */
  room: number;
  start: number;
}

/** `T - 20`, or `T + 18` for a freezer below zero. */
const gapTex = (sym: string, room: number): string => `${sym} ${signed(-room)}`;

const surroundings = ({ story, room }: CoolParams): string =>
  story.place === 'freezer' ? `a freezer at ${room}°C` : `a room at ${room}°C`;

function sampleCool(rng: Rng, difficulty: number): CoolParams {
  if (difficulty >= 2 && rng.chance(0.4)) {
    const story = rng.pick(COLD_STORIES);
    if (story.place === 'freezer') return { story, room: -rng.int(15, 22), start: rng.int(12, 25) };
    return { story, room: rng.int(16, 25), start: rng.int(2, 8) };
  }
  return { story: rng.pick(HOT_STORIES), room: rng.int(15, 25), start: rng.int(12, 19) * 5 };
}

function coolIntro(params: CoolParams): string {
  const { story, start } = params;
  return `${story.what} at ${start}°C is put in ${surroundings(params)}. Its temperature $${story.sym}$°C changes at a rate proportional to the difference between $${story.sym}$ and the temperature around it.`;
}

/** Newton's law of cooling from words, as tiles. */
const deCoolTiles: Generator<CoolParams> = {
  id: 'de-cool-tiles',
  sample: sampleCool,
  render: (params): Slide => {
    const { story, room, start } = params;
    const answer = ['-k', signed(-room)];
    return {
      kind: 'tiles',
      prompt: [prose(`${coolIntro(params)} Taking $k$ as a positive constant, build the equation.`)],
      template: `${rate(story.sym)} = {0}(${story.sym} {1})`,
      bank: tokenBank(answer, ['k', signed(room), signed(-start), signed(start)], 3),
      answer,
    };
  },
  solution: (params) => {
    const { story, room, start } = params;
    const s = story.sym;
    const warming = start < room;
    return [
      { text: `The difference from the surroundings is $${gapTex(s, room)}$.` },
      {
        text: `It starts ${warming ? 'below' : 'above'} ${room}°C, so $${gapTex(s, room)}$ is ${warming ? 'negative' : 'positive'}, and it ${warming ? 'warms up' : 'cools down'}. A minus sign in front of $k$ makes the rate ${warming ? 'positive' : 'negative'}, as it should be.`,
      },
      { tex: `${rate(s)} = -k(${gapTex(s, room)})` },
      { text: 'The same law, with the same minus sign, covers warming as well as cooling.' },
    ];
  },
};

/** The particular solution T = room + (start - room) e^(-kt). */
export const coolSolutionTex = ({ story, room, start }: CoolParams): string =>
  `${story.sym} = ${room} ${signed(start - room)}e^{-kt}`;

/** Solve Newton's law one line at a time. */
const deCoolSteps: Generator<CoolParams> = {
  id: 'de-cool-steps',
  sample: sampleCool,
  render: (params): Slide => {
    const { story, room, start } = params;
    const s = story.sym;
    const gap = gapTex(s, room);
    const logged = `\\ln|${gap}| = -kt + C`;
    const general = `${gap} = Ae^{-kt}`;
    const particular = coolSolutionTex(params);
    return {
      kind: 'steps',
      prompt: [prose(`Solve Newton's law of cooling for ${story.what.toLowerCase()} at ${start}°C in ${surroundings(params)}: tap the comma to separate and integrate, then tap the line to undo the log, then again to use the start.`)],
      start: [`${rate(s)} = -k(${gap})`, ',', `${s}(0) = ${start}`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: logged,
          bank: stepBank(logged, `\\ln|${gap}| = kt + C`, `\\ln|${s}| = -kt + C`, `${gap} = -kt + C`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: general,
          bank: stepBank(general, `${gap} = e^{-kt} + C`, `${s} = Ae^{-kt}`, `${gap} = Ae^{kt}`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(
            particular,
            `${s} = ${room} ${signed(start)}e^{-kt}`,
            `${s} = ${start} ${signed(room)}e^{-kt}`,
            `${s} = ${room} ${signed(room - start)}e^{-kt}`,
          ),
        },
      ],
    };
  },
  solution: (params) => {
    const { story, room, start } = params;
    const gap = gapTex(story.sym, room);
    return [
      { text: `Separate: divide by $${gap}$ and multiply by $dt$, then integrate.`, tex: `\\ln|${gap}| = -kt + C` },
      { text: 'Take $e$ to the power of each side, with $A = \\pm e^{C}$.', tex: `${gap} = Ae^{-kt}` },
      { text: `At $t = 0$, $${start} ${signed(-room)} = A$, so $A = ${start - room}$.`, tex: coolSolutionTex(params) },
    ];
  },
};

/** k from two readings: the gap shrinks by a whole factor b in h minutes. */
export interface CoolFitParams {
  story: CoolStory;
  room: number;
  /** Gap after h minutes; the gap at the start is b times it. */
  gap: number;
  b: number;
  h: number;
  /** Starts below the room and warms. */
  warming: boolean;
}

export const coolReadings = ({ room, gap, b, warming }: CoolFitParams): [number, number] =>
  warming ? [room - b * gap, room - gap] : [room + b * gap, room + gap];

const deCoolTree: Generator<CoolFitParams> = {
  id: 'de-cool-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const warming = hard && rng.chance(0.3);
      const b = rng.pick(hard ? [2, 3, 4, 5] : [2, 3]);
      const room = rng.int(15, 24);
      const gap = rng.int(warming ? 2 : 5, warming ? 6 : 30);
      if (!warming && room + b * gap > 100) continue;
      // Out of a fridge, so it starts above freezing.
      if (warming && room - b * gap < 2) continue;
      return {
        story: warming ? COLD_STORIES[rng.int(0, 1)] : rng.pick(HOT_STORIES),
        room,
        gap,
        b,
        h: rng.pick(hard ? [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] : [2, 4, 5, 6, 8, 10, 15, 20]),
        warming,
      };
    }
  },
  render: (params): Slide => {
    const { story, room, gap, b, h } = params;
    const s = story.sym;
    const [T0, T1] = coolReadings(params);
    const k = lnTex({ b, h, sign: 1 });
    const numbers = treeBank([b * gap, gap, b], [Math.abs(T0), Math.abs(T1), b * gap - gap, b + 1, room]);
    const kTokens = (
      h === 1
        ? [k, `\\frac{1}{\\ln ${b}}`, `\\ln ${b + 1}`, `e^{${b}}`]
        : [k, `\\frac{${h}}{\\ln ${b}}`, `\\frac{\\ln ${h}}{${b}}`, `\\frac{${b}}{${h}}`]
    ).sort((p, q) => p.localeCompare(q));
    return {
      kind: 'tree',
      prompt: [
        prose(
          `${story.what} is put in a room at ${room}°C. By Newton's law, $${s} = ${room} + Be^{-kt}$, with $t$ in minutes. Its readings are below.`,
        ),
        prose(`Fill in the gap to the room at the start, the gap after ${h} minute${h === 1 ? '' : 's'}, how many times smaller the gap has become, then $k$.`),
      ],
      expression: `${s}(0) = ${T0} \\qquad ${s}(${h}) = ${T1}`,
      nodes: [
        { id: 'g0', from: [] },
        { id: 'g1', from: [] },
        { id: 'r', from: ['g0', 'g1'] },
        { id: 'k', from: ['r'] },
      ],
      // k's wrong forms can coincide with it (h = b = 2 makes ln h / b equal
      // ln b / h), so each token is offered once.
      bank: [...numbers, ...new Set(kTokens)],
      answer: [`${b * gap}`, `${gap}`, `${b}`, k],
    };
  },
  solution: (params) => {
    const { story, room, gap, b, h } = params;
    const s = story.sym;
    const [T0, T1] = coolReadings(params);
    return [
      { text: `The gap to the room is $${s} - ${room}$, and it is $Be^{-kt}$: it shrinks by the same factor over every ${h} minutes. Take the size of each gap.` },
      { tex: chain(`|${T0} - ${room}| &= ${b * gap}`, `|${T1} - ${room}| &= ${gap}`) },
      { text: `So in ${h} minute${h === 1 ? '' : 's'} the gap became $${b}$ times smaller.`, tex: `e^{-${h === 1 ? '' : h}k} = \\frac{1}{${b}}` },
      { text: 'Take $\\ln$ of both sides.', tex: `k = ${lnTex({ b, h, sign: 1 })}` },
    ];
  },
};

/** The temperature at a whole time, with k written as a logarithm. */
export interface CoolValueParams extends CoolParams {
  k: LnRate;
  /** How many periods of h pass. */
  m: number;
}

export function coolValue({ room, start, k, m }: CoolValueParams): number {
  return room + (start - room) / k.b ** m;
}

const deCoolValue: Generator<CoolValueParams> = {
  id: 'de-cool-value',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const b = rng.pick(hard ? [2, 2, 3] : [2]);
      const m = rng.int(1, hard ? 3 : 2);
      const k: LnRate = { b, h: rng.pick([2, 4, 5, 10, 15]), sign: -1 };
      const warming = hard && rng.chance(0.3);
      const room = rng.int(15, 24);
      const gap = b ** m * rng.int(1, warming ? 2 : 10);
      const start = warming ? room - gap : room + gap;
      if (start > 100 || start < 2) continue;
      const story = warming ? COLD_STORIES[rng.int(0, 1)] : rng.pick(HOT_STORIES);
      return { story, room, start, k, m };
    }
  },
  choices: (params) => {
    const { room, start, k, m } = params;
    const answer = coolValue(params);
    const gap = start - room;
    return numberChoices(answer, [gap / k.b ** m, start / k.b ** m, room + gap / k.b ** (m + 1), room + gap / k.b], mix(answer, room, start, m));
  },
  render: (params): Slide => {
    const { story, room, start, k, m } = params;
    const s = story.sym;
    return {
      kind: 'expression',
      prompt: [
        prose(`${story.what} at ${start}°C is put in ${surroundings(params)}. Its temperature follows`),
        display(`${rate(s)} = ${lnFactor(k)}(${gapTex(s, room)})`),
        prose(`with $t$ in minutes. What is its temperature after ${m * k.h} minutes?`),
      ],
      lead: `${s}(${m * k.h}) =`,
      keypad: [],
      answer: `${coolValue(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { story, room, start, k, m } = params;
    const s = story.sym;
    const gap = start - room;
    return [
      { text: 'The solution is the room temperature plus a gap that decays.', tex: `${s} = ${room} ${signed(gap)}e^{${lnTex(k)}t}` },
      { text: `With $k = ${lnTex({ ...k, sign: 1 })}$ the gap ${k.b === 2 ? 'halves' : `divides by $${k.b}$`} every ${k.h} minutes, and ${m * k.h} minutes is ${m} of those.` },
      { tex: `${s} = ${room} ${signed(gap)} \\div ${k.b}^{${m}} = ${coolValue(params)}` },
    ];
  },
};

/* ============================================================
 * Level 2, lesson 2: growth towards a limit, dP/dt = k(L - P)
 * ============================================================ */

interface LimitStory {
  sym: string;
  /** `{L}` stands for the limit. */
  setting: string;
  left: string;
  unit: string;
}

const LIMIT_STORIES: LimitStory[] = [
  { sym: 'W', setting: 'A student is learning a list of {L} words. $W$ is the number learned', left: 'the number of words still to learn', unit: 'day' },
  { sym: 'N', setting: 'A rumour spreads through a school of {L} pupils. $N$ pupils have heard it', left: 'the number who have not heard it yet', unit: 'hour' },
  { sym: 'V', setting: 'A tank that holds {L} litres is being filled. $V$ litres are in it', left: 'the space still left in the tank', unit: 'minute' },
  { sym: 'S', setting: 'A new game has a market of {L} thousand players. $S$ thousand have bought it', left: 'the number who have not bought it yet', unit: 'week' },
  { sym: 'x', setting: 'A factory is training {L} workers on a new machine. $x$ workers are trained', left: 'the number still to train', unit: 'week' },
];

export interface LimitParams {
  ctx: number;
  L: number;
  start: number;
  /** k as a decimal, top / bottom. */
  top: number;
  bottom: number;
}

const LIMIT_K: [number, number][] = [[1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [1, 20], [1, 4], [3, 20]];

function sampleLimit(rng: Rng, above = false): LimitParams {
  const L = rng.int(4, 50) * 10;
  const start = above ? L + rng.int(1, 10) * 10 : rng.int(0, L / 10 - 1) * 10;
  const [top, bottom] = rng.pick(LIMIT_K);
  return { ctx: rng.int(0, LIMIT_STORIES.length - 1), L, start, top, bottom };
}

const limitSetting = ({ ctx, L }: LimitParams): string => LIMIT_STORIES[ctx].setting.replace('{L}', `${L}`);

/** The limit equation from words, as tiles. At difficulty 2 the bracket is built too. */
const deLimitTiles: Generator<LimitParams & { build: boolean }> = {
  id: 'de-limit-tiles',
  sample: (rng, difficulty) => ({ ...sampleLimit(rng), build: difficulty >= 2 }),
  render: (params): Slide => {
    const story = LIMIT_STORIES[params.ctx];
    const s = story.sym;
    const intro = `${limitSetting(params)} after $t$ ${story.unit}s, and $${s} = ${params.start}$ at the start. $${s}$ rises at a rate proportional to ${story.left}. Taking $k$ as a positive constant, build the equation.`;
    if (params.build) {
      const answer = ['k', `${params.L}`, s];
      return {
        kind: 'tiles',
        prompt: [prose(intro)],
        template: `${rate(s)} = {0}({1} - {2})`,
        bank: tokenBank(answer, ['-k', `${params.start}`, 't'], 3),
        answer,
      };
    }
    const answer = ['k', `${params.L}`];
    return {
      kind: 'tiles',
      prompt: [prose(intro)],
      template: `${rate(s)} = {0}({1} - ${s})`,
      bank: tokenBank(answer, ['-k', `${params.start}`, `${params.L - params.start}`, `${params.L / 2}`], 3),
      answer,
    };
  },
  solution: (params) => {
    const story = LIMIT_STORIES[params.ctx];
    const s = story.sym;
    return [
      { text: `With $${params.L}$ in all and $${s}$ done, ${story.left} is $${params.L} - ${s}$.` },
      { text: `$${s}$ rises, and $${params.L} - ${s}$ is positive, so the constant in front is $+k$.`, tex: `${rate(s)} = k(${params.L} - ${s})` },
    ];
  },
};

/** The limit equation's behaviour, as a walk. At difficulty 2 it is written expanded, so the level has to be found first. */
export interface LimitFlowParams extends LimitParams {
  expanded: boolean;
  above: boolean;
}

const deLimitFlow: Generator<LimitFlowParams> = {
  id: 'de-limit-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const above = rng.chance(hard ? 0.4 : 0.25);
    return { ...sampleLimit(rng, above), expanded: hard, above };
  },
  render: (params): Slide => {
    const { L, start, top, bottom, expanded, above } = params;
    const k = decimal(top, bottom);
    const kL = (top * L) / bottom;
    const de = expanded ? `${rate('P')} = ${kL} - ${k}P` : `${rate('P')} = ${k}(${L} - P)`;
    const salt = mix(L, start, top, bottom);
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [];
    const answer: string[] = [];
    if (expanded) {
      const rateAt = (p: number) => Math.round((kL - (top * p) / bottom) * 1000) / 1000;
      steps.push({
        id: 'level',
        ask: 'Where is the rate zero?',
        branches: turned(
          [
            { label: `$P = ${L}$`, to: 'sign' },
            { label: `$P = ${kL}$`, outcome: `At $P = ${kL}$ the rate is $${rateAt(kL)}$.` },
            { label: `$P = ${k}$`, outcome: `At $P = ${k}$ the rate is $${rateAt(top / bottom)}$.` },
          ],
          salt % 3,
        ),
      });
      answer.push(`$P = ${L}$`);
    }
    steps.push(
      {
        id: 'sign',
        ask: `At the start $P = ${start}$. Is the rate positive or negative?`,
        branches: turned(
          [
            { label: above ? 'Negative' : 'Positive', to: 'later' },
            { label: above ? 'Positive' : 'Negative', outcome: `Then $P$ would ${above ? 'rise away from' : 'fall away from'} $${L}$ at the start.` },
          ],
          (salt >>> 3) % 2,
        ),
      },
      {
        id: 'later',
        ask: `As $P$ gets closer to $${L}$, what happens to the rate?`,
        branches: turned(
          [
            { label: 'It shrinks towards 0', outcome: `So $P$ ${above ? 'falls' : 'rises'} quickly at first, then levels off at $${L}$.` },
            { label: 'It grows', outcome: `A growing rate would carry $P$ past $${L}$ faster and faster.` },
            { label: 'It stays the same', outcome: 'A constant rate draws a straight line, which never levels off.' },
          ],
          (salt >>> 6) % 3,
        ),
      },
    );
    answer.push(above ? 'Negative' : 'Positive', 'It shrinks towards 0');
    return {
      kind: 'flow',
      prompt: [prose(`A quantity $P$ follows the equation below, with $P = ${start}$ at the start. What does $P$ do?`)],
      subject: de,
      steps,
      answer,
    };
  },
  solution: (params) => {
    const { L, start, top, bottom, expanded, above } = params;
    const k = decimal(top, bottom);
    const steps: SolutionStep[] = [];
    if (expanded) {
      steps.push({ text: `Take out the $${k}$: the rate is zero where $P = ${L}$.`, tex: chain(`&${(top * L) / bottom} - ${k}P`, `&= ${k}(${L} - P)`) });
    }
    steps.push(
      { text: `At the start $${L} - ${start} = ${L - start}$, which is ${above ? 'negative' : 'positive'}, so $P$ ${above ? 'falls' : 'rises'}.` },
      { text: `The rate is $${k}$ times the gap to $${L}$, so it shrinks as the gap closes: $P$ levels off at $${L}$ without passing it.` },
    );
    return steps;
  },
};

/** The limit equation's particular solution. */
export const limitSolutionTex = ({ ctx, L, start, top, bottom }: LimitParams): string =>
  `${LIMIT_STORIES[ctx].sym} = ${L} ${signed(start - L)}e^{-${decimal(top, bottom)}t}`;

export const limitSolutionAnswer = ({ L, start, top, bottom }: LimitParams): string =>
  `${L} + (${start - L})*e^(-(${top / bottom})*t)`;

/** Solve dP/dt = k(L - P) one line at a time: the minus sign from integrating 1/(L - P) is the trap. */
const deLimitSteps: Generator<LimitParams> = {
  id: 'de-limit-steps',
  sample: (rng, difficulty) => sampleLimit(rng, difficulty >= 2 && rng.chance(0.3)),
  render: (params): Slide => {
    const { ctx, L, start, top, bottom } = params;
    const s = LIMIT_STORIES[ctx].sym;
    const k = decimal(top, bottom);
    const gap = `${L} - ${s}`;
    const logged = `-\\ln|${gap}| = ${k}t + C`;
    const general = `${gap} = Ae^{-${k}t}`;
    const particular = limitSolutionTex(params);
    return {
      kind: 'steps',
      prompt: [prose('Solve this one step at a time: tap the comma to separate and integrate, then tap the line to undo the log, then again to use the start value.')],
      start: [`${rate(s)} = ${k}(${gap})`, ',', `${s}(0) = ${start}`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: logged,
          bank: stepBank(logged, `\\ln|${gap}| = ${k}t + C`, `\\ln|${s}| = ${k}t + C`, `-\\ln|${gap}| = ${(top * L) / bottom}t + C`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: general,
          bank: stepBank(general, `${gap} = Ae^{${k}t}`, `${s} = Ae^{-${k}t}`, `${gap} = e^{-${k}t} + A`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(
            particular,
            `${s} = ${L} ${signed(L - start)}e^{-${k}t}`,
            `${s} = ${L} ${signed(-start)}e^{-${k}t}`,
            `${s} = ${start} ${signed(-L)}e^{-${k}t}`,
          ),
        },
      ],
    };
  },
  solution: (params) => {
    const { ctx, L, start, top, bottom } = params;
    const s = LIMIT_STORIES[ctx].sym;
    const k = decimal(top, bottom);
    return [
      { text: `Separate, then integrate. The integral of $\\frac{1}{${L} - ${s}}$ is $-\\ln|${L} - ${s}|$: the inside differentiates to $-1$.`, tex: `-\\ln|${L} - ${s}| = ${k}t + C` },
      { text: 'Multiply by $-1$ and take $e$ to the power of each side.', tex: `${L} - ${s} = Ae^{-${k}t}` },
      { text: `At $t = 0$, $A = ${L} - ${start} = ${L - start}$. Rearrange for $${s}$.`, tex: limitSolutionTex(params) },
    ];
  },
};

/** Slide to P at a whole number of halvings of the gap. */
export interface LimitSliderParams {
  ctx: number;
  L: number;
  /** The gap at the start, a multiple of 5 times 2^m. */
  gap: number;
  h: number;
  m: number;
  above: boolean;
  hint: boolean;
}

export const limitSliderAnswer = ({ L, gap, m, above }: LimitSliderParams): number => L + (above ? 1 : -1) * (gap / 2 ** m);

const deLimitSlider: Generator<LimitSliderParams> = {
  id: 'de-limit-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const L = rng.pick([40, 50, 60, 80, 100, 120]);
      const m = rng.int(1, 3);
      const gap = 5 * 2 ** m * rng.int(1, 4);
      const above = hard && rng.chance(0.35);
      if (!above && gap > L) continue;
      if (above && gap > 60) continue;
      return { ctx: rng.int(0, LIMIT_STORIES.length - 1), L, gap, h: rng.int(1, 6), m, above, hint: !hard };
    }
  },
  render: (params): Slide => {
    const { L, gap, h, m, above, hint } = params;
    const start = above ? L + gap : L - gap;
    const k: LnRate = { b: 2, h, sign: 1 };
    const span = Math.max(L, start) + 20;
    const window = markerWindow(0, span, 'y');
    const rateK = Math.log(2) / h;
    const tStar = m * h;
    return {
      kind: 'slider',
      prompt: [
        prose(`$P$ follows the equation below, with $P(0) = ${start}$.`),
        display(`${rate('P')} = ${lnFactor(k)}(${L} - P)`),
        prose(`${hint ? `The gap to $${L}$ halves every ${h === 1 ? 'unit' : `${h} units`} of time. ` : ''}Slide to the value of $P$ at $t = ${tStar}$, where the dashed line is.`),
      ],
      min: 0,
      max: span,
      step: 5,
      answer: limitSliderAnswer(params),
      readout: `P(${tStar}) = {v}`,
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: (m + 1) * h,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f: (t: number) => L + (start - L) * Math.exp(-rateK * t) }],
          horizontals: [L],
          verticals: [{ x: tStar, dashed: true }],
          marks: [{ x: 0, y: start }],
          label: `A curve starting at ${start} and levelling off towards ${L}, with a dashed line at t = ${tStar}`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { L, gap, h, m, above } = params;
    return [
      { text: `The solution is $P = ${L} ${above ? '+' : '-'} ${gap}e^{-kt}$: the gap to $${L}$ starts at $${gap}$.` },
      { text: `With $k = ${lnTex({ b: 2, h, sign: 1 })}$ the gap halves every ${h === 1 ? 'unit' : `${h} units`} of time, so by $t = ${m * h}$ it has halved $${m}$ time${m === 1 ? '' : 's'}.`, tex: `${gap} \\div 2^{${m}} = ${gap / 2 ** m}` },
      { tex: `P(${m * h}) = ${L} ${above ? '+' : '-'} ${gap / 2 ** m} = ${limitSliderAnswer(params)}` },
    ];
  },
};

/* ============================================================
 * Level 2, lesson 3: mixing tanks
 * ============================================================ */

/**
 * A well-mixed tank of V litres. Brine at c g/L flows in at r L/min and, at
 * difficulty 2, fresh water at `fresh` L/min too; the mixture flows out at the
 * total rate, so the volume stays at V.
 */
export interface TankParams {
  V: number;
  r: number;
  c: number;
  fresh: number;
  S0: number;
}

const outFlow = ({ r, fresh }: TankParams): number => r + fresh;

/** The rate salt leaves at, (out flow / V) times S, as the learner reads it. */
export function outTex(params: TankParams): string {
  const g = gcd(outFlow(params), params.V);
  const top = outFlow(params) / g;
  const bottom = params.V / g;
  if (bottom === 1) return `${coef(top)}S`;
  return `\\frac{${top === 1 ? '' : top}S}{${bottom}}`;
}

export const tankRhsAnswer = (params: TankParams): string => `${params.r * params.c} - (${outFlow(params)})*S/(${params.V})`;

export const tankLimit = (params: TankParams): number => (params.r * params.c * params.V) / outFlow(params);

function sampleTank(rng: Rng, difficulty: number): TankParams {
  for (;;) {
    const V = rng.pick([50, 100, 200, 250, 400, 500]);
    const r = rng.pick([2, 4, 5, 10]);
    const c = rng.int(1, 8);
    const fresh = difficulty >= 2 && rng.chance(0.5) ? rng.pick([1, 2, 3, 5, 6]) : 0;
    const params = { V, r, c, fresh, S0: 0 };
    if (!Number.isInteger(tankLimit(params))) continue;
    return { ...params, S0: rng.int(0, 4) * 10 };
  }
}

function tankStory(params: TankParams): string {
  const { V, r, c, fresh, S0 } = params;
  const inflow =
    fresh === 0
      ? `Salt water with ${c} g of salt per litre flows in at ${r} litres a minute, and the mixed water flows out at the same rate.`
      : `Salt water with ${c} g of salt per litre flows in at ${r} litres a minute, fresh water flows in at ${fresh} litres a minute, and the mixed water flows out at ${r + fresh} litres a minute.`;
  return `A tank holds ${V} litres of water with ${S0} g of salt in it. ${inflow} $S$ is the salt in the tank, in grams, after $t$ minutes.`;
}

function tankSolution(params: TankParams): SolutionStep[] {
  const { V, r, c } = params;
  const out = outFlow(params);
  return [
    { text: `Salt comes in at ${r} litres a minute times ${c} g a litre: $${r * c}$ g a minute.` },
    { text: `The tank is well mixed, so each litre leaving carries $\\frac{S}{${V}}$ g, and ${out} litres leave a minute.`, tex: `${out} \\times \\frac{S}{${V}} = ${outTex(params)}` },
    { text: 'The rate of change is what comes in minus what goes out.', tex: `${rate('S')} = ${r * c} - ${outTex(params)}` },
  ];
}

/** The mixing equation, as tiles: rate in minus rate out. */
const deMixTiles: Generator<TankParams> = {
  id: 'de-mix-tiles',
  sample: sampleTank,
  render: (params): Slide => {
    const { V, r, c } = params;
    const answer = [`${r * c}`, outTex(params)];
    return {
      kind: 'tiles',
      prompt: [prose(`${tankStory(params)} Build the equation.`)],
      template: `${rate('S')} = {0} - {1}`,
      bank: tokenBank(answer, [`${c}`, `\\frac{S}{${V}}`, `${r}`, `${outFlow(params)}S`, `\\frac{${V}}{S}`], 3),
      answer,
    };
  },
  solution: tankSolution,
};

/** The rates at one moment, as a tree: in, the concentration, out, the net rate. */
export interface TankNowParams extends TankParams {
  /** The concentration in the tank now, g/L; S = q V. */
  q: number;
}

const deMixTree: Generator<TankNowParams> = {
  id: 'de-mix-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleTank(rng, difficulty);
      const q = rng.int(0, base.c + 3);
      if (q !== base.c) return { ...base, fresh: 0, q };
    }
  },
  render: (params): Slide => {
    const { V, r, c, q } = params;
    const S = q * V;
    const answer = [r * c, q, r * q, r * c - r * q];
    return {
      kind: 'tree',
      prompt: [
        prose(`${tankStory(params)} At one moment the tank holds $${S}$ g of salt.`),
        prose('Fill in the rate salt comes in, the grams per litre in the tank, the rate salt goes out, then $\\frac{dS}{dt}$.'),
      ],
      expression: `${rate('S')} = ${r * c} - ${outTex(params)}, \\quad S = ${S}`,
      nodes: [
        { id: 'in', from: [] },
        { id: 'conc', from: [] },
        { id: 'out', from: ['conc'] },
        { id: 'net', from: ['in', 'out'] },
      ],
      bank: treeBank(answer, [c, r, r * c + r * q, S / r, q * c]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { V, r, c, q } = params;
    const net = r * c - r * q;
    return [
      { text: `In: $${r} \\times ${c} = ${r * c}$ g a minute.` },
      { text: `In the tank: $${q * V} \\div ${V} = ${q}$ g a litre, so out: $${r} \\times ${q} = ${r * q}$ g a minute.` },
      { tex: `${rate('S')} = ${r * c} - ${r * q} = ${net}` },
      { text: net > 0 ? 'Positive: the salt is building up.' : 'Negative: the tank is saltier than what flows in, so the salt is going down.' },
    ];
  },
};

/** The amount the tank settles at, where the rates in and out balance. */
const deMixLimit: Generator<TankParams> = {
  id: 'de-mix-limit',
  sample: sampleTank,
  render: (params): Slide => {
    const { V, r, c, S0 } = params;
    const limit = tankLimit(params);
    const grams = (n: number) => `${n}\\text{ g}`;
    const wrong = [c * V, r * c, V, S0 + r * c, (r * c * V) / r, c * outFlow(params)].filter((n) => n !== limit && n > 0);
    return choiceSlide(
      [prose(`${tankStory(params)} In the long run, how much salt will the tank hold?`)],
      [{ label: grams(limit), tex: true, correct: true }, ...[...new Set(wrong)].slice(0, 3).map((n) => ({ label: grams(n), tex: true }))],
      mix(V, r, c, params.fresh, S0),
    );
  },
  solution: (params) => {
    const { V, r, c } = params;
    const limit = tankLimit(params);
    return [
      ...tankSolution(params),
      { text: 'In the long run the salt stops changing: the rate in equals the rate out.', tex: `${r * c} = ${outTex(params)}` },
      { tex: `S = ${limit}` },
      { text: params.fresh === 0 ? `That is ${c} g a litre throughout the ${V} litres: the tank ends up as salty as what flows in.` : 'The fresh water dilutes it, so it ends up less salty than the salt water flowing in.' },
    ];
  },
};

/** The amount of salt at which the net rate takes a given value. */
export interface TankWhenParams extends TankParams {
  S: number;
}

export const tankNet = ({ V, r, c, S }: TankWhenParams): number => r * c - (r * S) / V;

const deMixWhen: Generator<TankWhenParams> = {
  id: 'de-mix-when',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = { ...sampleTank(rng, difficulty), fresh: 0 };
      const unit = base.V / gcd(base.r, base.V);
      const S = unit * rng.int(0, Math.floor((base.c * base.V * 1.5) / unit));
      const params = { ...base, S };
      const net = tankNet(params);
      if (net === 0 || !Number.isInteger(net) || S === base.S0) continue;
      if (difficulty < 2 && net < 0) continue;
      return params;
    }
  },
  choices: (params) => {
    const { V, r, c, S } = params;
    const net = tankNet(params);
    return numberChoices(S, [c * V, ((r * c + net) * V) / r, (Math.abs(net) * V) / r, S + V], mix(S, V, r, c));
  },
  render: (params): Slide => {
    const net = tankNet(params);
    return {
      kind: 'expression',
      prompt: [
        prose(tankStory(params)),
        display(`${rate('S')} = ${params.r * params.c} - ${outTex(params)}`),
        prose(`How much salt is in the tank at the moment $S$ is ${net > 0 ? 'rising' : 'falling'} at ${Math.abs(net)} g a minute?`),
      ],
      lead: 'S =',
      keypad: [],
      answer: `${params.S}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { r, c, S } = params;
    const net = tankNet(params);
    return [
      { text: `${net > 0 ? 'Rising' : 'Falling'} at ${Math.abs(net)} g a minute means $\\frac{dS}{dt} = ${net}$.`, tex: `${r * c} - ${outTex(params)} = ${net}` },
      { tex: `${outTex(params)} = ${r * c - net}` },
      { tex: `S = ${S}` },
    ];
  },
};

/* ============================================================
 * Level 2, lesson 4: long-term behaviour
 * ============================================================ */

/**
 * An equation with one equilibrium, written one of four ways. `stable` forms
 * pull y back to L; `unstable` push it away.
 */
export type LongForm = 'bracket' | 'linear' | 'cool' | 'unstable' | 'linearUnstable';

export interface LongParams {
  form: LongForm;
  L: number;
  /** k or b as a decimal, top / bottom. */
  top: number;
  bottom: number;
  y0: number;
}

const LONG_K: [number, number][] = [[1, 10], [2, 10], [1, 4], [1, 2], [1, 1], [2, 1], [3, 1], [1, 5]];

export const isStable = ({ form }: LongParams): boolean => form !== 'unstable' && form !== 'linearUnstable';

export function longTex({ form, L, top, bottom }: LongParams): string {
  const k = top === bottom ? '' : decimal(top, bottom);
  const kL = (top * L) / bottom;
  switch (form) {
    case 'bracket':
      return `${rate('y')} = ${k}(${L} - y)`;
    case 'linear':
      return `${rate('y')} = ${kL} - ${k}y`;
    case 'cool':
      return `${rate('y')} = -${k}(y - ${L})`;
    case 'unstable':
      return `${rate('y')} = ${k}(y - ${L})`;
    case 'linearUnstable':
      return `${rate('y')} = ${k}y - ${kL}`;
  }
}

/** The right-hand side for mathjs. */
export function longRhsAnswer({ form, L, top, bottom }: LongParams): string {
  const k = top / bottom;
  return isStable({ form, L, top, bottom, y0: 0 }) ? `(${k})*(${L} - y)` : `(${k})*(y - ${L})`;
}

function sampleLong(rng: Rng, difficulty: number, forms: LongForm[]): LongParams {
  for (;;) {
    const [top, bottom] = rng.pick(LONG_K);
    const L = rng.int(1, 12) * (bottom === 1 ? 2 : bottom);
    const y0 = rng.int(0, 12) * 5;
    const form = rng.pick(forms);
    if (y0 === L || L > 50) continue;
    if (difficulty < 2 && form === 'linear' && top === bottom) continue;
    return { form, L, top, bottom, y0 };
  }
}

function longSolution(params: LongParams): SolutionStep[] {
  const { L, y0 } = params;
  const stable = isStable(params);
  const steps: SolutionStep[] = [{ text: `The rate is zero at $y = ${L}$: that is the equilibrium.` }];
  if (params.form === 'linear' || params.form === 'linearUnstable') {
    steps.push({ text: 'Take out the constant to see it.', tex: longTex({ ...params, form: stable ? 'bracket' : 'unstable' }) });
  }
  steps.push(
    stable
      ? { text: `Above $${L}$ the rate is negative and below it positive, so $y$ is always pushed towards $${L}$. From $${y0}$ it settles at $${L}$.` }
      : {
          text: `Above $${L}$ the rate is positive and below it negative, so $y$ is pushed away from $${L}$. Starting ${y0 > L ? 'above' : 'below'} it, $y$ ${y0 > L ? 'grows' : 'falls'} without limit.`,
        },
  );
  return steps;
}

const deLongEquilibrium: Generator<LongParams> = {
  id: 'de-long-equilibrium',
  sample: (rng, difficulty) =>
    sampleLong(rng, difficulty, difficulty >= 2 ? ['bracket', 'linear', 'cool', 'unstable', 'linearUnstable'] : ['bracket', 'linear']),
  render: (params): Slide => {
    const { L, top, bottom, y0 } = params;
    const stable = isStable(params);
    const kL = (top * L) / bottom;
    const grows = y0 > L;
    const up = 'It grows without limit';
    const down = 'It falls without limit';
    const to = (n: number): Pick => ({ label: `y \\to ${n}`, tex: true });
    const picks: Pick[] = stable
      ? [{ ...to(L), correct: true }, to(y0), ...(kL !== L ? [to(kL)] : [to(0)]), { label: grows ? down : up }]
      : [{ label: grows ? up : down, correct: true }, to(L), to(y0), { label: grows ? down : up }];
    return choiceSlide(
      [prose(`$y$ follows the equation below and starts at $y = ${y0}$.`), display(longTex(params)), prose('What happens to $y$ in the long run?')],
      picks,
      mix(L, top, bottom, y0),
    );
  },
  solution: longSolution,
};

/** Slide to the level a solution settles at, from an equation written a - by. */
export interface LongSliderParams extends LongParams {
  /** Written as dy/dt + by = a at difficulty 2. */
  moved: boolean;
}

const deLongSlider: Generator<LongSliderParams> = {
  id: 'de-long-slider',
  sample: (rng, difficulty) => ({ ...sampleLong(rng, difficulty, ['linear']), moved: difficulty >= 2 && rng.chance(0.5) }),
  render: (params): Slide => {
    const { L, top, bottom, y0, moved } = params;
    const k = top / bottom;
    const kTex = top === bottom ? '' : decimal(top, bottom);
    const span = Math.ceil((Math.max(L, y0) + 10) / 5) * 5;
    const window = markerWindow(0, span, 'y');
    // Only the start of the curve: far enough to show which way it heads, not where it ends.
    const shown = 0.9 / k;
    const de = moved ? `${rate('y')} + ${kTex}y = ${(top * L) / bottom}` : longTex(params);
    return {
      kind: 'slider',
      prompt: [
        prose(`$y$ follows the equation below, starting at $y = ${y0}$. The curve shows the start of the solution.`),
        display(de),
        prose('Slide to the level $y$ settles at in the long run.'),
      ],
      min: 0,
      max: span,
      step: 1,
      answer: L,
      readout: 'y = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: shown,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f: (t: number) => L + (y0 - L) * Math.exp(-k * t) }],
          marks: [{ x: 0, y: y0 }],
          label: `The first part of a solution curve starting at ${y0}`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { L, top, bottom } = params;
    const kTex = top === bottom ? '' : decimal(top, bottom);
    const kL = (top * L) / bottom;
    return [
      { text: 'It settles where it stops changing: where the rate is zero.', tex: `${kL} - ${kTex}y = 0` },
      { tex: `y = ${kL} \\div ${top === bottom ? 1 : decimal(top, bottom)} = ${L}` },
      { text: `It is stable: above $${L}$ the rate is negative, below it positive, so every solution closes in on $${L}$.` },
    ];
  },
};

/** Stable or unstable, as a walk: where the rate is zero, its sign just above, and the verdict. */
const deLongFlow: Generator<LongParams> = {
  id: 'de-long-flow',
  sample: (rng, difficulty) =>
    sampleLong(rng, difficulty, difficulty >= 2 ? ['bracket', 'cool', 'linear', 'unstable', 'linearUnstable'] : ['bracket', 'unstable']),
  render: (params): Slide => {
    const { L, top, bottom } = params;
    const stable = isStable(params);
    const k = top / bottom;
    const salt = mix(L, top, bottom, stable ? 1 : 0);
    const at = (y: number) => Math.round((stable ? k * (L - y) : k * (y - L)) * 1000) / 1000;
    const decoy = 2 * L;
    const stableLabel = 'Stable: nearby solutions return to it';
    const unstableLabel = 'Unstable: nearby solutions move away';
    return {
      kind: 'flow',
      prompt: [prose('Is the equilibrium of this equation stable or unstable?')],
      subject: longTex(params),
      steps: [
        {
          id: 'eq',
          ask: 'Where is the rate zero?',
          branches: turned(
            [
              { label: `$y = ${L}$`, to: 'above' },
              { label: '$y = 0$', outcome: `At $y = 0$ the rate is $${at(0)}$.` },
              { label: `$y = ${decoy}$`, outcome: `At $y = ${decoy}$ the rate is $${at(decoy)}$.` },
            ],
            salt % 3,
          ),
        },
        {
          id: 'above',
          ask: `Just above $${L}$, is the rate positive or negative?`,
          branches: turned(
            [
              { label: stable ? 'Negative' : 'Positive', to: 'verdict' },
              { label: stable ? 'Positive' : 'Negative', outcome: `Then $y$ just above $${L}$ would ${stable ? 'rise away from it' : 'fall back to it'}.` },
            ],
            (salt >>> 3) % 2,
          ),
        },
        {
          id: 'verdict',
          ask: `So is $y = ${L}$ stable or unstable?`,
          branches: turned(
            [
              { label: stableLabel, outcome: stable ? `So solutions near $${L}$ settle back on it.` : `A rate pushing up above $${L}$ carries a solution away from it.` },
              { label: unstableLabel, outcome: stable ? `A rate pulling down above $${L}$ carries a solution back to it.` : `So a solution that starts off $${L}$, however slightly, runs away from it.` },
            ],
            (salt >>> 6) % 2,
          ),
        },
      ],
      answer: [`$y = ${L}$`, stable ? 'Negative' : 'Positive', stable ? stableLabel : unstableLabel],
    };
  },
  solution: (params) => longSolution({ ...params, y0: params.L + 1 }),
};

/* ============================================================
 * Level 2, lesson 5: checking a solution
 * ============================================================ */

/**
 * Three families of equation with whole-number checks, and for each a right
 * candidate and three near misses.
 *
 * - `power`: x dy/dx = n y, solved by y = A x^n.
 * - `shift`: dy/dx = k(y - c), solved by y = A e^(kx) + c.
 * - `line`: dy/dx = y + a x, solved by y = -a x - a.
 */
export type VerifyParams =
  | { type: 'power'; n: number; A: number; c: number; pick: number; x0: number }
  | { type: 'shift'; k: number; A: number; c: number; pick: number; x0: number }
  | { type: 'line'; a: number; pick: number; x0: number };

export interface Candidate {
  tex: string;
  /** mathjs, in x. */
  answer: string;
  /** dy/dx, as the learner reads it. */
  dTex: string;
  /** The left-hand side with the candidate put in. */
  lhsTex: string;
  /** The right-hand side with the candidate put in. */
  rhsTex: string;
  good: boolean;
}

const powTex = (c: number, n: number): string => termTex(c, n);
const expX = (k: number): string => `e^{${coef(k)}x}`;

/** A x + B, as the learner reads it. */
const lineTex = (a: number, b: number): string => (a === 0 ? `${b}` : `${termTex(a, 1)}${b === 0 ? '' : ` ${signed(b)}`}`);

export function verifyDeTex(params: VerifyParams): { lhs: string; rhs: string } {
  switch (params.type) {
    case 'power':
      return { lhs: `x${rate('y', 'x')}`, rhs: `${params.n}y` };
    case 'shift':
      return { lhs: rate('y', 'x'), rhs: `${params.k}(y ${signed(-params.c)})` };
    case 'line':
      return { lhs: rate('y', 'x'), rhs: `y ${signed(params.a)}x` };
  }
}

/** The equation for mathjs, as lhs(x, y, dy) and rhs(x, y). */
export function verifyDeAnswer(params: VerifyParams): { lhs: string; rhs: string } {
  switch (params.type) {
    case 'power':
      return { lhs: 'x*dy', rhs: `${params.n}*y` };
    case 'shift':
      return { lhs: 'dy', rhs: `${params.k}*(y - (${params.c}))` };
    case 'line':
      return { lhs: 'dy', rhs: `y + (${params.a})*x` };
  }
}

export function candidates(params: VerifyParams): Candidate[] {
  if (params.type === 'power') {
    const { n, A, c } = params;
    return [
      { tex: `y = ${powTex(A, n)}`, answer: `${A}*x^${n}`, dTex: powTex(n * A, n - 1), lhsTex: powTex(n * A, n), rhsTex: powTex(n * A, n), good: true },
      {
        tex: `y = ${powTex(A, n + 1)}`,
        answer: `${A}*x^${n + 1}`,
        dTex: powTex((n + 1) * A, n),
        lhsTex: powTex((n + 1) * A, n + 1),
        rhsTex: powTex(n * A, n + 1),
        good: false,
      },
      {
        tex: `y = ${powTex(A, n)} ${signed(c)}`,
        answer: `${A}*x^${n} + (${c})`,
        dTex: powTex(n * A, n - 1),
        lhsTex: powTex(n * A, n),
        rhsTex: `${powTex(n * A, n)} ${signed(n * c)}`,
        good: false,
      },
      {
        tex: `y = ${powTex(A, n - 1)}`,
        answer: `${A}*x^${n - 1}`,
        dTex: powTex((n - 1) * A, n - 2),
        lhsTex: powTex((n - 1) * A, n - 1),
        rhsTex: powTex(n * A, n - 1),
        good: false,
      },
    ];
  }
  if (params.type === 'shift') {
    const { k, A, c } = params;
    return [
      { tex: `y = ${A}${expX(k)} ${signed(c)}`, answer: `${A}*e^(${k}*x) + (${c})`, dTex: `${k * A}${expX(k)}`, lhsTex: `${k * A}${expX(k)}`, rhsTex: `${k * A}${expX(k)}`, good: true },
      {
        tex: `y = ${A}${expX(k)} ${signed(-c)}`,
        answer: `${A}*e^(${k}*x) - (${c})`,
        dTex: `${k * A}${expX(k)}`,
        lhsTex: `${k * A}${expX(k)}`,
        rhsTex: `${k * A}${expX(k)} ${signed(-2 * k * c)}`,
        good: false,
      },
      {
        tex: `y = ${A}${expX(-k)} ${signed(c)}`,
        answer: `${A}*e^(${-k}*x) + (${c})`,
        dTex: `${-k * A}${expX(-k)}`,
        lhsTex: `${-k * A}${expX(-k)}`,
        rhsTex: `${k * A}${expX(-k)}`,
        good: false,
      },
      {
        tex: `y = ${A}${expX(k)}`,
        answer: `${A}*e^(${k}*x)`,
        dTex: `${k * A}${expX(k)}`,
        lhsTex: `${k * A}${expX(k)}`,
        rhsTex: `${k * A}${expX(k)} ${signed(-k * c)}`,
        good: false,
      },
    ];
  }
  const { a } = params;
  return [
    { tex: `y = ${lineTex(-a, -a)}`, answer: `${-a}*x - (${a})`, dTex: `${-a}`, lhsTex: `${-a}`, rhsTex: `${-a}`, good: true },
    { tex: `y = ${lineTex(a, a)}`, answer: `${a}*x + (${a})`, dTex: `${a}`, lhsTex: `${a}`, rhsTex: lineTex(2 * a, a), good: false },
    { tex: `y = ${lineTex(-a, 0)}`, answer: `${-a}*x`, dTex: `${-a}`, lhsTex: `${-a}`, rhsTex: '0', good: false },
    { tex: `y = ${lineTex(-a, a)}`, answer: `${-a}*x + (${a})`, dTex: `${-a}`, lhsTex: `${-a}`, rhsTex: `${a}`, good: false },
  ];
}

/** The candidate a single-candidate question is about. */
export const chosen = (params: VerifyParams): Candidate => candidates(params)[params.pick % 4];

function sampleVerify(rng: Rng, difficulty: number, types: VerifyParams['type'][]): VerifyParams {
  const type = rng.pick(types);
  const pick = rng.chance(0.5) ? 0 : rng.int(1, 3);
  const x0 = rng.int(1, 3);
  if (type === 'power') return { type, n: rng.int(2, difficulty >= 2 ? 4 : 3), A: rng.int(2, 5), c: rng.int(1, 6) * rng.sign(), pick, x0 };
  if (type === 'shift') return { type, k: rng.int(2, 4) * (difficulty >= 2 ? rng.sign() : 1), A: rng.int(2, 5), c: rng.int(1, 9) * rng.sign(), pick, x0 };
  return { type, a: rng.int(2, 6) * rng.sign(), pick, x0 };
}

function verifySolution(params: VerifyParams): SolutionStep[] {
  const cand = chosen(params);
  const de = verifyDeTex(params);
  return [
    { text: `Differentiate the candidate $${cand.tex}$.`, tex: `${rate('y', 'x')} = ${cand.dTex}` },
    { text: `Put it into the left-hand side, $${de.lhs}$.`, tex: cand.lhsTex },
    { text: `Put $y$ into the right-hand side, $${de.rhs}$.`, tex: cand.rhsTex },
    { text: cand.good ? 'The two sides agree for every $x$, so it is a solution.' : 'The two sides differ, so it is not a solution.' },
  ];
}

const SOLUTION = '\\text{a solution}';
const NOT_SOLUTION = '\\text{not a solution}';

/** Check a candidate by substitution: the left side, the right side, then the verdict. */
const deVerifySteps: Generator<VerifyParams> = {
  id: 'de-verify-steps',
  sample: (rng, difficulty) => sampleVerify(rng, difficulty, difficulty >= 2 ? ['power', 'shift', 'line'] : ['power', 'shift']),
  render: (params): Slide => {
    const cand = chosen(params);
    const de = verifyDeTex(params);
    const others = candidates(params).filter((other) => other !== cand);
    const verdict = cand.good ? SOLUTION : NOT_SOLUTION;
    return {
      kind: 'steps',
      prompt: [
        prose(`Is $${cand.tex}$ a solution of the equation below? Tap the left-hand side to put the candidate in, then the right-hand side, then the $=$ to decide.`),
      ],
      start: [de.lhs, '=', de.rhs],
      reductions: [
        { span: [0, 1], operator: 0, value: cand.lhsTex, bank: stepBank(cand.lhsTex, cand.dTex, ...others.map((o) => o.lhsTex)) },
        { span: [2, 3], operator: 2, value: cand.rhsTex, bank: stepBank(cand.rhsTex, ...others.map((o) => o.rhsTex), cand.tex.replace('y = ', '')) },
        { span: [0, 3], operator: 1, value: verdict, bank: [SOLUTION, NOT_SOLUTION] },
      ],
    };
  },
  solution: verifySolution,
};

/** The same check in numbers at one value of x, as a tree. */
const deVerifyTree: Generator<VerifyParams> = {
  id: 'de-verify-tree',
  sample: (rng, difficulty) => sampleVerify(rng, difficulty, difficulty >= 2 ? ['power', 'line'] : ['power', 'power', 'line']),
  render: (params): Slide => {
    const cand = chosen(params);
    const de = verifyDeTex(params);
    const x0 = params.x0;
    const [y, dy, lhs, rhs] = verifyNumbers(params);
    const power = params.type === 'power';
    const answer = power ? [y, dy, lhs, rhs] : [y, dy, rhs];
    return {
      kind: 'tree',
      prompt: [
        prose(`Test $${cand.tex}$ in the equation below at $x = ${x0}$.`),
        prose(
          power
            ? `Fill in $y$ and $\\frac{dy}{dx}$ there, then the left-hand side, $${de.lhs}$, and the right-hand side, $${de.rhs}$.`
            : `Fill in $y$ and $\\frac{dy}{dx}$ there, then the right-hand side, $${de.rhs}$.`,
        ),
      ],
      expression: `${de.lhs} = ${de.rhs}`,
      nodes: power
        ? [
            { id: 'y', from: [] },
            { id: 'dy', from: [] },
            { id: 'lhs', from: ['dy'] },
            { id: 'rhs', from: ['y'] },
          ]
        : [
            { id: 'y', from: [] },
            { id: 'dy', from: [] },
            { id: 'rhs', from: ['y'] },
          ],
      bank: treeBank(answer, [y + 1, dy * x0, lhs + x0, rhs - 1, -rhs]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const cand = chosen(params);
    const [y, dy, lhs, rhs] = verifyNumbers(params);
    const de = verifyDeTex(params);
    return [
      { text: `At $x = ${params.x0}$: $y = ${y}$ and $\\frac{dy}{dx} = ${dy}$.` },
      { text: `Left-hand side $${de.lhs}$: $${lhs}$. Right-hand side $${de.rhs}$: $${rhs}$.` },
      {
        text:
          lhs === rhs
            ? `They agree here, which is what a solution needs. One value of $x$ cannot prove it on its own: $${cand.tex}$ has to agree at every $x$, which the algebra shows.`
            : 'They disagree, so it is not a solution: one value of $x$ where the sides differ is enough to rule it out.',
      },
    ];
  },
};

/** [y, dy/dx, lhs, rhs] at x0, for the power and line families. */
export function verifyNumbers(params: VerifyParams): [number, number, number, number] {
  const x = params.x0;
  if (params.type === 'power') {
    const { n, A, c } = params;
    const which = params.pick % 4;
    const p = which === 1 ? n + 1 : which === 3 ? n - 1 : n;
    const shift = which === 2 ? c : 0;
    const y = A * x ** p + shift;
    const dy = p * A * x ** (p - 1);
    return [y, dy, x * dy, n * y];
  }
  if (params.type === 'line') {
    const { a } = params;
    const [m, b] = [[-a, -a], [a, a], [-a, 0], [-a, a]][params.pick % 4];
    const y = m * x + b;
    return [y, m, m, y + a * x];
  }
  throw new Error('verifyNumbers: no whole-number check for the shift family');
}

/** Which of four candidates solves the equation. */
const deVerifyWhich: Generator<VerifyParams> = {
  id: 'de-verify-which',
  sample: (rng, difficulty) => sampleVerify(rng, difficulty, difficulty >= 2 ? ['power', 'shift', 'line'] : ['power', 'shift']),
  render: (params): Slide => {
    const de = verifyDeTex(params);
    return choiceSlide(
      [prose('Which of these is a solution of'), display(`${de.lhs} = ${de.rhs}`)],
      candidates(params).map((cand) => ({ label: cand.tex, tex: true, correct: cand.good })),
      mix(params.pick, params.x0, params.type === 'line' ? params.a : params.A, params.type === 'power' ? params.n : params.type === 'shift' ? params.k : 0),
    );
  },
  solution: (params) => {
    const good = candidates(params)[0];
    const de = verifyDeTex(params);
    return [
      { text: `Differentiate each and put it in. For $${good.tex}$:` },
      { tex: chain(`${de.lhs} &= ${good.lhsTex}`, `${de.rhs} &= ${good.rhsTex}`) },
      { text: 'The two sides agree for every $x$. For each of the others they differ.' },
    ];
  },
};

/** The constant that makes a family of candidates a solution. */
export type ConstantParams =
  | { type: 'shift'; k: number; A: number; c: number }
  | { type: 'power'; n: number; A: number }
  | { type: 'line'; a: number };

export function constantAnswer(params: ConstantParams): number {
  if (params.type === 'shift') return params.c;
  if (params.type === 'power') return params.n;
  return -params.a;
}

export function constantPrompt(params: ConstantParams): { de: string; candidate: string; letter: string } {
  if (params.type === 'shift') {
    const { k, A, c } = params;
    return { de: `${rate('y', 'x')} = ${k}y ${signed(-k * c)}`, candidate: `y = ${A}${expX(k)} + c`, letter: 'c' };
  }
  if (params.type === 'power') return { de: `x${rate('y', 'x')} = ${params.n}y`, candidate: `y = ${params.A}x^{p}`, letter: 'p' };
  return { de: `${rate('y', 'x')} = y ${signed(params.a)}x`, candidate: 'y = mx + m', letter: 'm' };
}

const deVerifyConstant: Generator<ConstantParams> = {
  id: 'de-verify-constant',
  sample: (rng, difficulty) => {
    const type = rng.pick<ConstantParams['type']>(difficulty >= 2 ? ['shift', 'shift', 'line', 'power'] : ['shift', 'power']);
    if (type === 'shift') {
      for (;;) {
        const k = rng.int(2, 5) * (difficulty >= 2 ? rng.sign() : 1);
        const c = rng.int(1, 9) * rng.sign();
        if (c !== k) return { type, k, A: rng.int(2, 6), c };
      }
    }
    if (type === 'power') return { type, n: rng.int(2, 9), A: rng.int(2, 7) };
    return { type, a: rng.int(2, 9) * rng.sign() };
  },
  choices: (params) => {
    const answer = constantAnswer(params);
    const slips = params.type === 'shift' ? [-params.c, params.k * params.c, params.k] : params.type === 'power' ? [params.n - 1, params.n + 1, params.A] : [params.a, 2 * params.a];
    return numberChoices(answer, slips, mix(answer, params.type === 'line' ? params.a : params.A));
  },
  render: (params): Slide => {
    const { de, candidate, letter } = constantPrompt(params);
    return {
      kind: 'expression',
      prompt: [prose(`For which value of $${letter}$ is $${candidate}$ a solution of`), display(de)],
      lead: `${letter} =`,
      keypad: [],
      answer: `${constantAnswer(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { letter } = constantPrompt(params);
    const answer = constantAnswer(params);
    if (params.type === 'shift') {
      const { k, A, c } = params;
      return [
        { text: 'Differentiate the candidate.', tex: `${rate('y', 'x')} = ${k * A}${expX(k)}` },
        { text: 'Put $y$ into the right-hand side.', tex: chain(`&${k}(${A}${expX(k)} + c) ${signed(-k * c)}`, `&= ${k * A}${expX(k)} ${k < 0 ? '-' : '+'} ${Math.abs(k)}c ${signed(-k * c)}`) },
        { text: `The $e$ terms match, so the rest must be zero: $${k}c ${signed(-k * c)} = 0$.`, tex: `c = ${c}` },
      ];
    }
    if (params.type === 'power') {
      const { n, A } = params;
      return [
        { text: 'Differentiate and multiply by $x$.', tex: `x${rate('y', 'x')} = ${A}px^{p}` },
        { text: 'The right-hand side is', tex: `${n}y = ${n * A}x^{p}` },
        { text: `They match when $${A}p = ${n * A}$.`, tex: `p = ${n}` },
      ];
    }
    return [
      { text: 'Differentiate: the gradient of $mx + m$ is $m$.', tex: `${rate('y', 'x')} = m` },
      { text: 'Put $y$ into the right-hand side.', tex: chain(`&mx + m ${signed(params.a)}x`, `&= (m ${signed(params.a)})x + m`) },
      { text: `For that to be $m$ at every $x$, the $x$ term must vanish.`, tex: `${letter} = ${answer}` },
    ];
  },
};

/* ============================================================
 * Level 3: the integrating factor
 * ============================================================ */

/**
 * A linear equation `dy/dx + Py = Q`, built backwards from its solution so
 * that every number in it is whole.
 *
 * - `exp`: P = k and Q = p(m + k)e^{mx}. The factor is e^{kx} and the
 *   solution y = pe^{mx} + Ce^{-kx}; m = 0 makes Q a constant.
 * - `power`: P = k/x and Q = p(k + m + 1)x^m. The factor is x^k and the
 *   solution y = px^{m + 1} + Cx^{-k}.
 *
 * m + k, and k + m + 1, are never zero, so the right side never integrates
 * to a logarithm and p is always a whole number.
 */
export interface LinearDe {
  kind: 'exp' | 'power';
  k: number;
  m: number;
  p: number;
  /**
   * How the equation is shown: `standard` is dy/dx + Py = Q, `scaled` has
   * every term of an `exp` equation times `scale`, `timesX` has every term of
   * a `power` equation times x, and `moved` has Py on the right.
   */
  written: 'standard' | 'scaled' | 'timesX' | 'moved';
  scale: number;
}

/** Q's coefficient: p before the integral divides it back out. */
export const qCoef = ({ kind, k, m, p }: LinearDe): number => p * (kind === 'exp' ? m + k : k + m + 1);

/** c e^{mx}, where m = 0 leaves the number on its own. */
const expTerm = (c: number, m: number): string => (m === 0 ? `${c}` : `${coef(c)}${expX(m)}`);
const expTermAnswer = (c: number, m: number): string => `(${c})*e^((${m})*x)`;

/** x^n as the learner reads it: `x`, `x^{3}`, `\frac{1}{x}`, `\frac{1}{x^{2}}`. */
const powerTex = (n: number): string =>
  n === 1 ? 'x' : n > 0 ? `x^{${n}}` : n === -1 ? '\\frac{1}{x}' : `\\frac{1}{x^{${-n}}}`;

/** Q as the learner reads it, times a whole number when the equation is scaled. */
export function qTex(de: LinearDe, times = 1): string {
  const q = qCoef(de) * times;
  return de.kind === 'exp' ? expTerm(q, de.m) : termTex(q, de.m);
}

export const qAnswer = (de: LinearDe): string =>
  de.kind === 'exp' ? expTermAnswer(qCoef(de), de.m) : `(${qCoef(de)})*x^(${de.m})`;

/** P as a tile or a label: `3`, `-2`, `\frac{3}{x}`, `-\frac{1}{x}`. */
export const pTex = ({ kind, k }: LinearDe): string =>
  kind === 'exp' ? `${k}` : `${k < 0 ? '-' : ''}\\frac{${Math.abs(k)}}{x}`;

export const pAnswer = ({ kind, k }: LinearDe): string => (kind === 'exp' ? `${k}` : `(${k})/x`);

/** The y term after dy/dx: `+ 3y`, `- y`, `+ \frac{2}{x}y`. */
function yTerm(kind: LinearDe['kind'], c: number): string {
  const sign = c < 0 ? '-' : '+';
  const size = Math.abs(c);
  if (kind === 'power') return `${sign} \\frac{${size}}{x}y`;
  return `${sign} ${size === 1 ? '' : size}y`;
}

/** The equation as it is shown. */
export function linearTex(de: LinearDe): string {
  const { kind, k, m, written, scale } = de;
  const dydx = rate('y', 'x');
  switch (written) {
    case 'scaled':
      return `${scale}${dydx} ${yTerm('exp', scale * k)} = ${qTex(de, scale)}`;
    case 'timesX':
      return `x${dydx} ${yTerm('exp', k)} = ${termTex(qCoef(de), m + 1)}`;
    case 'moved':
      return `${dydx} = ${qTex(de)} ${yTerm(kind, -k)}`;
    default:
      return `${dydx} ${yTerm(kind, k)} = ${qTex(de)}`;
  }
}

const standardTex = (de: LinearDe): string => linearTex({ ...de, written: 'standard' });

/** The integrating factor. */
export const factorTex = (de: LinearDe): string => (de.kind === 'exp' ? expX(de.k) : powerTex(de.k));
export const factorAnswer = (de: LinearDe): string => (de.kind === 'exp' ? `e^((${de.k})*x)` : `x^(${de.k})`);

/** The factor found from P, one line: `e^{\int 3\,dx} = e^{3x}`. */
const factorWorking = (de: LinearDe): string =>
  de.kind === 'exp'
    ? `e^{\\int ${de.k}\\,dx} = ${expX(de.k)}`
    : `e^{\\int ${pTex(de)}\\,dx} = e^{${coef(de.k)}\\ln x} = ${powerTex(de.k)}`;

/** The factor times y, the product whose derivative the left side becomes. */
export const productTex = (de: LinearDe): string =>
  de.kind === 'exp'
    ? `y${expX(de.k)}`
    : de.k > 0
      ? `${powerTex(de.k)}y`
      : de.k === -1
        ? '\\frac{y}{x}'
        : `\\frac{y}{x^{${-de.k}}}`;

/** The factor's derivative times y: the slip of taking I' for I. */
const productSlipTex = (de: LinearDe): string => {
  if (de.kind === 'exp') return `${coef(de.k)}y${expX(de.k)}`;
  if (de.k === 1) return 'y';
  if (de.k > 1) return `${termTex(de.k, de.k - 1)}y`;
  return `-\\frac{${-de.k === 1 ? '' : -de.k}y}{x^{${1 - de.k}}}`;
};

/** The factor's derivative, which multiplies y once the equation is multiplied through. */
const factorDerivTex = (de: LinearDe): string => {
  if (de.kind === 'exp') return `${coef(de.k)}${expX(de.k)}`;
  if (de.k > 0) return termTex(de.k, de.k - 1);
  return `-\\frac{${-de.k}}{x^{${1 - de.k}}}`;
};

/** The right side once multiplied by the factor. */
export const multipliedTex = (de: LinearDe): string =>
  de.kind === 'exp' ? expTerm(qCoef(de), de.m + de.k) : termTex(qCoef(de), de.k + de.m);
export const multipliedAnswer = (de: LinearDe): string =>
  de.kind === 'exp' ? expTermAnswer(qCoef(de), de.m + de.k) : `(${qCoef(de)})*x^(${de.k + de.m})`;

/** Its integral, without the constant. */
export const antiTex = (de: LinearDe): string =>
  de.kind === 'exp' ? expTerm(de.p, de.m + de.k) : termTex(de.p, de.k + de.m + 1);
export const antiAnswer = (de: LinearDe): string =>
  de.kind === 'exp' ? expTermAnswer(de.p, de.m + de.k) : `(${de.p})*x^(${de.k + de.m + 1})`;

/** The first part of y: the integral divided by the factor. */
export const partTex = (de: LinearDe): string => (de.kind === 'exp' ? expTerm(de.p, de.m) : termTex(de.p, de.m + 1));
const partAnswer = (de: LinearDe): string =>
  de.kind === 'exp' ? expTermAnswer(de.p, de.m) : `(${de.p})*x^(${de.m + 1})`;

/**
 * The constant divided by the factor. Without a value it is the general
 * `Ce^{-3x}` or `\frac{C}{x^{2}}`; with one it is signed for appending,
 * `- 2e^{-3x}` or `+ \frac{5}{x^{2}}`.
 */
export function cTermTex(de: LinearDe, C?: number, flip = false): string {
  const k = flip ? -de.k : de.k;
  if (C === undefined) {
    if (de.kind === 'exp') return `C${expX(-k)}`;
    return k > 0 ? `\\frac{C}{${powerTex(k)}}` : `C${powerTex(-k)}`;
  }
  const sign = C < 0 ? '-' : '+';
  const size = Math.abs(C);
  if (de.kind === 'exp') return `${sign} ${size === 1 ? '' : size}${expX(-k)}`;
  if (k > 0) return `${sign} \\frac{${size}}{${powerTex(k)}}`;
  return `${sign} ${size === 1 ? '' : size}${powerTex(-k)}`;
}

/** The C term's variable part for mathjs. */
const cFactorAnswer = (de: LinearDe, flip = false): string => {
  const k = flip ? -de.k : de.k;
  return de.kind === 'exp' ? `e^((${-k})*x)` : `x^(${-k})`;
};

export const generalTex = (de: LinearDe): string => `y = ${partTex(de)} + ${cTermTex(de)}`;

/** The general solution for mathjs, with C a number or the letter. */
export const generalAnswer = (de: LinearDe, C: number | string = 'C'): string =>
  `${partAnswer(de)} + (${C})*${cFactorAnswer(de)}`;

function sampleLinear(rng: Rng, difficulty: number, kind: LinearDe['kind'], written: LinearDe['written'] = 'standard'): LinearDe {
  const hard = difficulty >= 2;
  for (;;) {
    const k =
      kind === 'exp'
        ? rng.int(1, hard ? 5 : 4) * (hard && rng.chance(0.35) ? -1 : 1)
        : hard
          ? rng.pick([-2, -1, 1, 2, 3, 4, 5])
          : rng.int(1, 4);
    const m = kind === 'exp' ? rng.pick(hard ? [-3, -2, -1, 0, 1, 2, 3] : [-1, 0, 1, 2]) : rng.int(0, 3);
    const p = rng.int(1, hard ? 6 : 5) * (hard && rng.chance(0.3) ? -1 : 1);
    const de: LinearDe = { kind, k, m, p, written, scale: rng.int(2, 4) };
    const q = qCoef(de);
    if (q === 0 || Math.abs(q) > 40) continue;
    // P and Q as tiles must never be the same tile.
    if (pTex(de) === qTex(de)) continue;
    return de;
  }
}

/** A branch of a flow step. */
interface Branch {
  label: string;
  to?: string;
  outcome?: string;
}

/** A flow step's branches: the right one and up to two slips with labels of their own, turned by a salt. */
function branchesOf(correct: Branch, slips: Branch[], turn: number): Branch[] {
  const seen = new Set([correct.label]);
  const out = [correct];
  for (const slip of slips) {
    if (out.length === 3 || seen.has(slip.label)) continue;
    seen.add(slip.label);
    out.push(slip);
  }
  return turned(out, turn % out.length);
}

/** A salt from everything that shapes an equation, for turning options. */
const deSalt = (de: LinearDe, ...more: number[]): number =>
  mix(de.kind === 'exp' ? 1 : 2, de.k, de.m, de.p, de.scale, ['standard', 'scaled', 'timesX', 'moved'].indexOf(de.written), ...more);

function standardStep(de: LinearDe): SolutionStep[] {
  switch (de.written) {
    case 'scaled':
      return [{ text: `Divide every term by $${de.scale}$ so that $${rate('y', 'x')}$ stands alone.`, tex: standardTex(de) }];
    case 'timesX':
      return [{ text: `Divide every term by $x$ so that $${rate('y', 'x')}$ stands alone.`, tex: standardTex(de) }];
    case 'moved':
      return [{ text: 'Bring the $y$ term over to the left.', tex: standardTex(de) }];
    default:
      return [];
  }
}

/** The whole method: standard form, factor, product, integral, division. */
function linearSteps(de: LinearDe): SolutionStep[] {
  return [
    ...standardStep(de),
    { text: `Here $P = ${pTex(de)}$, so the factor is $e^{\\int P\\,dx}$, with no constant.`, tex: `I = ${factorWorking(de)}` },
    {
      text: 'Multiply every term by it. The left side becomes the derivative of the factor times $y$.',
      tex: `\\frac{d}{dx}(${productTex(de)}) = ${multipliedTex(de)}`,
    },
    { text: 'Integrate both sides. The constant goes on the right.', tex: `${productTex(de)} = ${antiTex(de)} + C` },
    { text: `Divide by $${factorTex(de)}$, the constant as well.`, tex: generalTex(de) },
  ];
}

/* ---------- Level 3, lesson 1: the product rule backwards ---------- */

/** Read P and Q, after putting the equation in standard form. */
const deIfRead: Generator<LinearDe> = {
  id: 'de-if-read',
  sample: (rng, difficulty) => {
    const kind = rng.chance(0.5) ? 'exp' : 'power';
    const written =
      difficulty >= 2
        ? rng.pick<LinearDe['written']>(kind === 'exp' ? ['scaled', 'scaled', 'moved'] : ['timesX', 'timesX', 'moved'])
        : rng.pick<LinearDe['written']>(['standard', 'moved']);
    return sampleLinear(rng, difficulty, kind, written);
  },
  render: (de): Slide => {
    const answer = [pTex(de), qTex(de)];
    const flipped = { ...de, k: -de.k };
    const slips =
      de.written === 'scaled'
        ? [pTex({ ...de, k: de.k * de.scale }), qTex(de, de.scale), pTex(flipped)]
        : de.written === 'timesX'
          ? [`${de.k}`, termTex(qCoef(de), de.m + 1), pTex(flipped)]
          : [pTex(flipped), qTex(de, -1), factorTex(de)];
    return {
      kind: 'tiles',
      prompt: [prose('Written in the form $\\frac{dy}{dx} + Py = Q$, what are $P$ and $Q$?'), display(linearTex(de))],
      template: 'P = {0}, \\quad Q = {1}',
      bank: tokenBank(answer, [...slips, qTex(de, -1), pTex(flipped)], 3),
      answer,
    };
  },
  solution: (de) => [
    ...standardStep(de),
    {
      text:
        de.written === 'standard'
          ? `It is in standard form already. $P$ multiplies $y$, sign and all, and $Q$ is the right side.`
          : `Now $P$ multiplies $y$, sign and all, and $Q$ is the right side.`,
    },
    { tex: `P = ${pTex(de)}, \\quad Q = ${qTex(de)}` },
  ],
};

/** A walk: whether to divide first, then P, then Q. */
const deIfDivide: Generator<LinearDe> = {
  id: 'de-if-divide',
  sample: (rng, difficulty) => {
    const kind = rng.chance(0.5) ? 'exp' : 'power';
    const other = kind === 'exp' ? 'scaled' : 'timesX';
    const written = rng.chance(difficulty >= 2 ? 0.8 : 0.6) ? other : 'standard';
    return sampleLinear(rng, difficulty, kind, written);
  },
  render: (de): Slide => {
    const salt = deSalt(de);
    const dydx = rate('y', 'x');
    const nothing = 'Nothing: read $P$ and $Q$ off';
    const multiply = 'Multiply every term by $x$';
    const divisor = de.written === 'scaled' ? `${de.scale}` : 'x';
    const first =
      de.written === 'standard'
        ? [
            { label: nothing, to: 'p' },
            { label: multiply, outcome: `That puts an $x$ in front of $${dydx}$, which is exactly what the form has not got.` },
            { label: 'Move the $y$ term to the right', outcome: `The form keeps $Py$ on the left, with $${dydx}$.` },
          ]
        : [
            { label: `Divide every term by $${divisor}$`, to: 'p' },
            {
              label: nothing,
              outcome: `$${dydx}$ carries a $${divisor}$ here. $P$ is only read once $${dydx}$ stands alone, or the factor comes out wrong.`,
            },
            {
              label: multiply,
              outcome: `That leaves $${dydx}$ with $${de.written === 'scaled' ? `${de.scale}x` : 'x^{2}'}$ in front of it, not $1$.`,
            },
          ];
    const flipped = { ...de, k: -de.k };
    const pSlips: { label: string; outcome: string }[] = [
      ...(de.written === 'scaled'
        ? [{ label: `$${pTex({ ...de, k: de.k * de.scale })}$`, outcome: 'That is before dividing: the $y$ term has to be divided too.' }]
        : de.written === 'timesX'
          ? [{ label: `$${de.k}$`, outcome: `Dividing by $x$ divides the $y$ term too, so $${de.k}y$ becomes $${pTex(de)}y$.` }]
          : []),
      { label: `$${pTex(flipped)}$`, outcome: '$P$ comes with its sign: it is what multiplies $y$ on the left.' },
      { label: `$${factorTex(de)}$`, outcome: 'That is the integrating factor, which is found from $P$. $P$ itself multiplies $y$.' },
    ];
    const qSlips: { label: string; outcome: string }[] = [
      ...(de.written === 'scaled'
        ? [{ label: `$${qTex(de, de.scale)}$`, outcome: 'The right side has to be divided as well.' }]
        : de.written === 'timesX'
          ? [{ label: `$${termTex(qCoef(de), de.m + 1)}$`, outcome: 'The right side has to be divided by $x$ as well.' }]
          : []),
      { label: `$${qTex(de, -1)}$`, outcome: '$Q$ is the right side as it stands, sign and all.' },
      { label: `$${multipliedTex(de)}$`, outcome: 'That is $Q$ times the factor, which comes later.' },
    ];
    const pLabel = `$${pTex(de)}$`;
    const qLabel = `$${qTex(de)}$`;
    return {
      kind: 'flow',
      prompt: [prose('Put this equation in the form $\\frac{dy}{dx} + Py = Q$.')],
      subject: linearTex(de),
      steps: [
        { id: 'form', ask: 'What has to be done first?', branches: turned(first, salt % 3) },
        {
          id: 'p',
          ask: 'So $P$ is',
          branches: branchesOf({ label: pLabel, to: 'q' }, pSlips, salt >>> 4),
        },
        {
          id: 'q',
          ask: 'And $Q$ is',
          branches: branchesOf({ label: qLabel, outcome: `So the equation is $${standardTex(de)}$.` }, qSlips, salt >>> 8),
        },
      ],
      answer: [first[0].label, pLabel, qLabel],
    };
  },
  solution: (de) => [
    ...(de.written === 'standard'
      ? [{ text: `$${rate('y', 'x')}$ already stands alone, so nothing needs doing first.` }]
      : standardStep(de)),
    { text: 'Read $P$ from the $y$ term and $Q$ from the right side.', tex: `P = ${pTex(de)}, \\quad Q = ${qTex(de)}` },
  ],
};

/** Which product this left side is the derivative of, or the other way round. */
export interface ProductParams {
  kind: 'exp' | 'power';
  k: number;
  /** The factor is a times e^{kx} or a times x^k. */
  a: number;
  /** Show the product and ask for its expansion, rather than the reverse. */
  expand: boolean;
}

/** a e^{kx} or a x^k, and its derivative, as the learner reads them. */
export function productPieces({ kind, k, a }: ProductParams): { I: string; dI: string; Iy: string; dIy: string } {
  if (kind === 'exp') {
    return { I: `${coef(a)}${expX(k)}`, dI: `${coef(a * k)}${expX(k)}`, Iy: `${coef(a)}y${expX(k)}`, dIy: `${coef(a * k)}y${expX(k)}` };
  }
  const dI = termTex(a * k, k - 1);
  return { I: termTex(a, k), dI, Iy: `${termTex(a, k)}y`, dIy: dI === '1' ? 'y' : `${dI}y` };
}

/** The factor and its derivative for mathjs. */
export const productAnswer = ({ kind, k, a }: ProductParams): string => (kind === 'exp' ? `(${a})*e^((${k})*x)` : `(${a})*x^(${k})`);

/** I dy/dx + I' y, with the sign of I' pulled out in front of its term. */
function expanded(I: string, dI: string, sign = 1): string {
  const negative = (dI.startsWith('-') ? -1 : 1) * sign < 0;
  const size = dI.startsWith('-') ? dI.slice(1) : dI;
  return `${I}${rate('y', 'x')} ${negative ? '-' : '+'} ${size === '1' ? '' : size}y`;
}

/** One option of a product question: the product, and its derivative for mathjs in x, y and y'. */
export interface ProductOption {
  tex: string;
  /** For `expand`, the expression in y and dy; otherwise the product in y. */
  answer: string;
  correct?: boolean;
}

export function productOptions(params: ProductParams): ProductOption[] {
  const { kind, k, a } = params;
  const { I, dI, Iy } = productPieces(params);
  const d = (inside: string) => `\\frac{d}{dx}(${inside})`;
  const iAns = productAnswer(params);
  const diAns = kind === 'exp' ? `(${a * k})*e^((${k})*x)` : `(${a * k})*x^(${k - 1})`;
  if (params.expand) {
    const lead = dI === '1' ? '' : dI;
    const plus = dI.startsWith('-') ? `- ${dI.slice(1)}` : `+ ${dI}`;
    return [
      { tex: expanded(I, dI), answer: `${iAns}*dy + ${diAns}*y`, correct: true },
      { tex: expanded(I, dI, -1), answer: `${iAns}*dy - ${diAns}*y` },
      { tex: `${lead}${rate('y', 'x')} + ${I}y`, answer: `${diAns}*dy + ${iAns}*y` },
      { tex: `${I}${rate('y', 'x')} ${plus}`, answer: `${iAns}*dy + ${diAns}` },
      { tex: `${lead}${rate('y', 'x')}`, answer: `${diAns}*dy` },
    ];
  }
  const other = (kk: number, aa = a) => {
    const pieces = productPieces({ kind, k: kk, a: aa, expand: false });
    return { tex: d(pieces.Iy), answer: `${productAnswer({ kind, k: kk, a: aa, expand: false })}*y` };
  };
  const { dIy } = productPieces(params);
  return [
    { tex: d(Iy), answer: `${iAns}*y`, correct: true },
    { tex: d(dIy), answer: `${diAns}*y` },
    kind === 'exp' ? other(-k) : other(k + 1),
    kind === 'exp' ? other(2 * k) : other(k - 1 === 0 ? k + 2 : k - 1),
    { tex: d(`${I}${rate('y', 'x')}`), answer: `${iAns}*dy` },
  ];
}

const deIfProduct: Generator<ProductParams> = {
  id: 'de-if-product',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const kind = rng.chance(0.5) ? 'exp' : 'power';
    const k = kind === 'exp' ? rng.int(1, hard ? 5 : 4) * (hard && rng.chance(0.4) ? -1 : 1) : rng.int(1, hard ? 6 : 4);
    return { kind, k, a: rng.int(1, hard ? 3 : 2), expand: rng.chance(0.5) };
  },
  render: (params): Slide => {
    const { I, dI, Iy } = productPieces(params);
    const picks = productOptions(params)
      .filter((opt, idx, all) => all.findIndex((other) => other.tex === opt.tex) === idx)
      .map((opt) => ({ label: opt.tex, tex: true, correct: opt.correct }));
    const salt = mix(params.kind === 'exp' ? 1 : 2, params.k, params.a, params.expand ? 1 : 0);
    if (params.expand) {
      return choiceSlide(
        [prose('By the product rule, which is this derivative written out?'), display(`\\frac{d}{dx}(${Iy})`)],
        picks.slice(0, 4),
        salt,
      );
    }
    return choiceSlide(
      [prose('This left side is the derivative of a product. Which one?'), display(expanded(I, dI))],
      picks.slice(0, 4),
      salt,
    );
  },
  solution: (params) => {
    const { I, dI, Iy } = productPieces(params);
    return [
      { text: 'The product rule, with $y$ as the second factor:', tex: `\\frac{d}{dx}(uy) = u${rate('y', 'x')} + u'y` },
      { text: `With $u = ${I}$, $u' = ${dI}$.`, tex: `\\frac{d}{dx}(${Iy}) = ${expanded(I, dI)}` },
      {
        text: params.expand
          ? 'The factor stays with $\\frac{dy}{dx}$ and its derivative goes with $y$.'
          : `So the left side is the derivative of $${Iy}$: the factor in front of $\\frac{dy}{dx}$, times $y$.`,
      },
    ];
  },
};

/** Multiply through by the factor: its power, its derivative's, the right side's. */
const deIfMultiplyTree: Generator<LinearDe> = {
  id: 'de-if-multiply-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const de = sampleLinear(rng, difficulty, rng.chance(0.5) ? 'exp' : 'power');
      // A constant Q would make every blank of the exp tree the same number.
      if (de.kind === 'power' || de.m !== 0) return de;
    }
  },
  render: (de): Slide => {
    const { kind, k, m } = de;
    const q = qCoef(de);
    if (kind === 'exp') {
      const answer = [k, k, m + k];
      return {
        kind: 'tree',
        prompt: [
          prose(
            `Multiplying by the factor $e^{ax}$ turns the left side into $e^{ax}\\frac{dy}{dx} + be^{ax}y$, and the right side into $${coef(q)}e^{cx}$.`,
          ),
          prose('Fill in $a$, then $b$, then $c$.'),
        ],
        expression: linearTex(de),
        nodes: [
          { id: 'a', from: [] },
          { id: 'b', from: ['a'] },
          { id: 'c', from: ['a'] },
        ],
        bank: treeBank(answer, [-k, m, m - k, k + 1, m * k]),
        answer: answer.map(String),
      };
    }
    const answer = [k, k, k - 1, k + m];
    return {
      kind: 'tree',
      prompt: [
        prose(`Multiplying by the factor $x^{a}$ turns the left side into $x^{a}\\frac{dy}{dx} + bx^{c}y$, and the right side into $${coef(q)}x^{d}$.`),
        prose('Fill in $a$, then $b$ and $c$, then $d$.'),
      ],
      expression: linearTex(de),
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: ['a'] },
        { id: 'c', from: ['a'] },
        { id: 'd', from: ['a'] },
      ],
      bank: treeBank(answer, [-k, k + 1, m, k * m, k + m + 1]),
      answer: answer.map(String),
    };
  },
  solution: (de) => [
    { text: `$P = ${pTex(de)}$, and the factor is $e^{\\int P\\,dx}$.`, tex: `I = ${factorWorking(de)}` },
    {
      text: `Multiply every term by it. The factor's derivative is $P$ times the factor, and it lands on $y$.`,
      tex: `${expanded(factorTex(de), factorDerivTex(de))} = ${multipliedTex(de)}`,
    },
    { text: 'The right side is $Q$ times the factor: add the powers.', tex: `\\frac{d}{dx}(${productTex(de)}) = ${multipliedTex(de)}` },
  ],
};

/* ---------- Level 3, lesson 2: finding the factor ---------- */

/**
 * P, for finding the factor alone.
 *
 * - `const`: P = k, factor e^{kx}.
 * - `poly`: P = c(j + 1)x^j, factor e^{cx^{j + 1}}.
 * - `log`: P = n/(x + a), or 2nx/(x^2 + a) when `sq`; factor (x + a)^n or
 *   (x^2 + a)^n. With a = 0 and no `sq` it is n/x and x^n.
 */
export type FactorP =
  | { type: 'const'; k: number }
  | { type: 'poly'; c: number; j: number }
  | { type: 'log'; n: number; a: number; sq: boolean };

/** The inside of the logarithm, as the learner reads it and for mathjs. */
const logBase = (P: Extract<FactorP, { type: 'log' }>): { tex: string; answer: string; bracket: string } => {
  const inner = P.sq ? `x^{2} + ${P.a}` : P.a === 0 ? 'x' : `x + ${P.a}`;
  return {
    tex: inner,
    answer: P.sq ? `(x^2 + ${P.a})` : P.a === 0 ? 'x' : `(x + ${P.a})`,
    bracket: P.sq || P.a !== 0 ? `(${inner})` : inner,
  };
};

export function factorPTex(P: FactorP): string {
  switch (P.type) {
    case 'const':
      return `${P.k}`;
    case 'poly':
      return termTex(P.c * (P.j + 1), P.j);
    case 'log': {
      const sign = P.n < 0 ? '-' : '';
      const top = P.sq ? `${2 * Math.abs(P.n)}x` : `${Math.abs(P.n)}`;
      return `${sign}\\frac{${top}}{${logBase(P).tex}}`;
    }
  }
}

export function factorPAnswer(P: FactorP): string {
  switch (P.type) {
    case 'const':
      return `${P.k}`;
    case 'poly':
      return `(${P.c * (P.j + 1)})*x^(${P.j})`;
    case 'log':
      return P.sq ? `(${2 * P.n})*x/(x^2 + ${P.a})` : `(${P.n})/${logBase(P).answer}`;
  }
}

/** The integral of P, without the constant. */
export function factorIntegralTex(P: FactorP): string {
  switch (P.type) {
    case 'const':
      return termTex(P.k, 1);
    case 'poly':
      return termTex(P.c, P.j + 1);
    case 'log':
      return `${coef(P.n)}\\ln ${logBase(P).bracket}`;
  }
}

/** base^n as the learner reads it, with a negative power written as a fraction. */
function logPowerTex(P: Extract<FactorP, { type: 'log' }>, n = P.n): string {
  const { bracket } = logBase(P);
  if (P.a === 0 && !P.sq) return powerTex(n);
  if (n === 1) return logBase(P).tex;
  if (n > 0) return `${bracket}^{${n}}`;
  return n === -1 ? `\\frac{1}{${logBase(P).tex}}` : `\\frac{1}{${bracket}^{${-n}}}`;
}

export function factorOfTex(P: FactorP): string {
  switch (P.type) {
    case 'const':
      return expX(P.k);
    case 'poly':
      return `e^{${termTex(P.c, P.j + 1)}}`;
    case 'log':
      return logPowerTex(P);
  }
}

export function factorOfAnswer(P: FactorP): string {
  switch (P.type) {
    case 'const':
      return `e^((${P.k})*x)`;
    case 'poly':
      return `e^((${P.c})*x^(${P.j + 1}))`;
    case 'log':
      return `${logBase(P).answer}^(${P.n})`;
  }
}

/** A right side to show beside P. It plays no part in the factor. */
const Q_SHOWN = ['x', 'e^{x}', '\\sin x', 'x^{2}', '\\cos x', '1'];

export interface FactorParams {
  P: FactorP;
  /** Which right side is shown, and a whole number the equation is scaled by (1 for none). */
  q: number;
  scale: number;
}

/** The equation. Only a constant P is ever shown scaled. */
export function factorDeTex({ P, q, scale }: FactorParams): string {
  const shown = Q_SHOWN[q % Q_SHOWN.length];
  if (P.type === 'const') {
    const right = scale === 1 ? shown : shown === '1' ? `${scale}` : `${scale}${shown}`;
    return `${scale === 1 ? '' : scale}${rate('y', 'x')} ${yTerm('exp', scale * P.k)} = ${right}`;
  }
  const pt = factorPTex(P);
  const negative = pt.startsWith('-');
  return `${rate('y', 'x')} ${negative ? '-' : '+'} ${negative ? pt.slice(1) : pt}y = ${shown}`;
}

function sampleFactorP(rng: Rng, difficulty: number): FactorP {
  if (difficulty < 2) {
    return rng.chance(0.5)
      ? { type: 'const', k: rng.int(1, 6) * rng.sign() }
      : { type: 'log', n: rng.int(1, 5), a: 0, sq: false };
  }
  const type = rng.pick(['const', 'poly', 'log', 'log'] as const);
  if (type === 'const') return { type, k: rng.int(1, 8) * rng.sign() };
  if (type === 'poly') return { type, c: rng.int(1, 3) * rng.sign(), j: rng.int(1, 2) };
  const sq = rng.chance(0.3);
  return { type, n: sq ? rng.int(1, 3) : rng.pick([-3, -2, -1, 2, 3, 4, 5]), a: sq ? rng.int(1, 9) : rng.int(0, 6), sq };
}

function sampleFactor(rng: Rng, difficulty: number): FactorParams {
  const P = sampleFactorP(rng, difficulty);
  const scale = difficulty >= 2 && P.type === 'const' && rng.chance(0.5) ? rng.int(2, 4) : 1;
  return { P, q: rng.int(0, Q_SHOWN.length - 1), scale };
}

const positiveNote = (P: FactorP): string => (P.type === 'log' ? ', for $x > 0$' : '');

function factorSolution({ P, scale }: FactorParams): SolutionStep[] {
  const steps: SolutionStep[] = [];
  if (scale > 1) steps.push({ text: `Divide every term by $${scale}$ first, so $${rate('y', 'x')}$ stands alone. Then $P = ${factorPTex(P)}$.` });
  else steps.push({ text: `$P$ is what multiplies $y$: $P = ${factorPTex(P)}$.` });
  steps.push({ text: 'Integrate it, leaving out the constant: any multiple of the factor works as well as the factor.', tex: `\\int ${factorPTex(P)}\\,dx = ${factorIntegralTex(P)}` });
  if (P.type === 'log') {
    steps.push({
      text: `A multiple of a logarithm is the logarithm of a power, and $e$ undoes $\\ln$.`,
      tex: `I = e^{${factorIntegralTex(P)}} = ${factorOfTex(P)}`,
    });
  } else {
    steps.push({ tex: `I = ${factorOfTex(P)}` });
  }
  return steps;
}

/** Type the factor. */
const deIfFactor: Generator<FactorParams> = {
  id: 'de-if-factor',
  sample: sampleFactor,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [prose(`Find the integrating factor of`), display(factorDeTex(params)), ...(params.P.type === 'log' ? [prose('for $x > 0$.')] : [])],
    lead: 'I =',
    keypad: EXP_KEYS,
    answer: factorOfAnswer(params.P),
    domain: params.P.type === 'log' ? 'positive' : 'real',
    mode: 'exact',
  }),
  solution: factorSolution,
};

/** A factor from a logarithm, one line at a time: integrate, power inside, e undoes ln. */
const deIfExponentSteps: Generator<FactorParams> = {
  id: 'de-if-exponent-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const sq = hard && rng.chance(0.3);
    const P: FactorP = {
      type: 'log',
      n: sq ? rng.int(1, 3) : hard ? rng.pick([-3, -2, -1, 2, 3, 4, 5, 6]) : rng.int(1, 5),
      a: sq ? rng.int(1, 9) : rng.int(0, hard ? 6 : 5),
      sq,
    };
    return { P, q: rng.int(0, Q_SHOWN.length - 1), scale: 1 };
  },
  render: ({ P }): Slide => {
    if (P.type !== 'log') throw new Error('de-if-exponent-steps asks only logarithm factors');
    const { n } = P;
    const { tex: inner, bracket } = logBase(P);
    const integrated = `I = e^{${factorIntegralTex(P)}}`;
    const inside = `I = e^{\\ln ${bracket}^{${n}}}`;
    const last = `I = ${factorOfTex(P)}`;
    const flip = { ...P, n: -n };
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      {
        span: [0, 3],
        operator: 1,
        value: integrated,
        bank: stepBank(
          integrated,
          `I = e^{${factorPTex(P)}}`,
          `I = e^{${factorIntegralTex(flip)}}`,
          `I = ${factorIntegralTex(P)}`,
          `I = ${expX(n)}`,
        ),
      },
    ];
    if (n !== 1) {
      reductions.push({
        span: [0, 1],
        operator: 0,
        value: inside,
        bank: stepBank(inside, `I = e^{\\ln ${Math.abs(n)}${bracket}}`, `I = e^{\\ln ${bracket}^{${-n}}}`, `I = ${n}e^{\\ln ${bracket}}`),
      });
    }
    reductions.push({
      span: [0, 1],
      operator: 0,
      value: last,
      // With n = 1, n times the bracket is the bracket itself: the right answer, so it cannot be a slip.
      bank: stepBank(last, n === 1 ? `I = ${logPowerTex(P, 2)}` : `I = ${coef(n)}${bracket}`, `I = ${logPowerTex(P, -n)}`, `I = e^{${n === 1 ? inner : `${bracket}^{${n}}`}}`),
    });
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Find the integrating factor for $P = ${factorPTex(P)}$, with $x > 0$. Tap the $=$ to integrate $P$, then tap the line each time to tidy it.`,
        ),
      ],
      start: ['I', '=', `e^{\\int ${factorPTex(P)}\\,dx}`],
      reductions,
    };
  },
  solution: (params) => {
    const { P } = params;
    if (P.type !== 'log') return factorSolution(params);
    const { bracket } = logBase(P);
    return [
      { text: 'Integrate $P$. The top is a multiple of the derivative of the bottom, so it is a logarithm.', tex: `\\int ${factorPTex(P)}\\,dx = ${factorIntegralTex(P)}` },
      ...(P.n === 1 ? [] : [{ text: 'The number in front becomes a power inside the logarithm.', tex: `${factorIntegralTex(P)} = \\ln ${bracket}^{${P.n}}` }]),
      { text: '$e$ to the power of $\\ln$ undoes it.', tex: `I = ${factorOfTex(P)}` },
    ];
  },
};

/** The factor as a walk: P, then its integral, then the factor. */
const deIfShape: Generator<FactorParams> = {
  id: 'de-if-shape',
  sample: sampleFactor,
  render: (params): Slide => {
    const { P, scale } = params;
    const salt = mix(params.q, scale, P.type === 'const' ? P.k : P.type === 'poly' ? 100 + P.c * 10 + P.j : 200 + P.n * 10 + P.a + (P.sq ? 7 : 0));
    const flipped: FactorP = P.type === 'const' ? { ...P, k: -P.k } : P.type === 'poly' ? { ...P, c: -P.c } : { ...P, n: -P.n };
    const pLabel = `$${factorPTex(P)}$`;
    const integral = `$${factorIntegralTex(P)}$`;
    const factor = `$${factorOfTex(P)}$`;
    const pSlips =
      scale > 1 && P.type === 'const'
        ? [
            { label: `$${scale * P.k}$`, outcome: `That is before dividing by $${scale}$: $P$ is read once $\\frac{dy}{dx}$ stands alone.` },
            { label: `$${factorPTex(flipped)}$`, outcome: '$P$ keeps the sign it has on the left.' },
          ]
        : [
            { label: `$${factorPTex(flipped)}$`, outcome: '$P$ keeps the sign it has on the left.' },
            { label: `$${factorOfTex(P)}$`, outcome: 'That is the factor itself, which comes from $P$.' },
          ];
    const intSlips =
      P.type === 'const'
        ? [
            { label: `$${P.k}$`, outcome: `That is $P$ again. Integrating a constant $${P.k}$ gives $${termTex(P.k, 1)}$.` },
            { label: `$${termTex(P.k, 2)}$`, outcome: `That differentiates to $${termTex(2 * P.k, 1)}$, not $${P.k}$.` },
          ]
        : P.type === 'poly'
          ? [
              { label: `$${termTex(P.c * (P.j + 1), P.j + 1)}$`, outcome: 'The new power has to divide in as well.' },
              { label: `$${termTex(P.c * (P.j + 1) * P.j, P.j - 1)}$`, outcome: 'That is the derivative, not the integral.' },
            ]
          : [
              { label: `$${termTex(P.n, 1)}$`, outcome: 'A number over $x$ integrates to a logarithm, not to $x$.' },
              { label: `$${factorIntegralTex(flipped)}$`, outcome: 'The sign of $P$ carries through to its integral.' },
            ];
    const iSlips =
      P.type === 'log'
        ? [
            P.n === 1
              ? { label: `$${logPowerTex(P, 2)}$`, outcome: 'The power is the number in front of $\\ln$, which here is $1$.' }
              : { label: `$${coef(P.n)}${logBase(P).bracket}$`, outcome: `$e^{${coef(P.n)}\\ln u}$ is $u^{${P.n}}$: the number becomes a power, not a multiplier.` },
            { label: `$${logPowerTex(P, -P.n)}$`, outcome: 'The power has the sign of the number in front of $\\ln$.' },
          ]
        : [
            { label: `$e^{${factorIntegralTex(P)} + C}$`, outcome: 'The constant is left out: $e^{C}$ only multiplies the factor, and any multiple works as well.' },
            { label: `$${factorOfTex(flipped)}$`, outcome: 'The factor is $e$ to the integral of $P$ exactly, sign included.' },
          ];
    return {
      kind: 'flow',
      prompt: [prose(`Find the integrating factor of the equation below${positiveNote(P)}.`)],
      subject: factorDeTex(params),
      steps: [
        { id: 'p', ask: 'What is $P$?', branches: branchesOf({ label: pLabel, to: 'int' }, pSlips, salt) },
        { id: 'int', ask: '$\\int P\\,dx$, without a constant, is', branches: branchesOf({ label: integral, to: 'i' }, intSlips, salt >>> 4) },
        {
          id: 'i',
          ask: 'So the factor $e^{\\int P\\,dx}$ is',
          branches: branchesOf({ label: factor, outcome: `Multiplying by $${factorOfTex(P)}$ makes the left side a product's derivative.` }, iSlips, salt >>> 8),
        },
      ],
      answer: [pLabel, integral, factor],
    };
  },
  solution: factorSolution,
};

/** Multiply through: the product on the left and the right side, as tiles. */
const deIfLhs: Generator<LinearDe & { given: boolean }> = {
  id: 'de-if-lhs',
  sample: (rng, difficulty) => {
    const kind = rng.chance(0.5) ? 'exp' : 'power';
    const written = difficulty >= 2 ? rng.pick<LinearDe['written']>(['standard', kind === 'exp' ? 'scaled' : 'timesX']) : 'standard';
    return { ...sampleLinear(rng, difficulty, kind, written), given: difficulty < 2 };
  },
  render: (de): Slide => {
    const answer = [productTex(de), multipliedTex(de)];
    const flipped = { ...de, k: -de.k };
    const rightSlips =
      de.kind === 'exp'
        ? [qTex(de), expTerm(qCoef(de), de.m - de.k), expTerm(qCoef(de), de.m * de.k)]
        : [qTex(de), termTex(qCoef(de), de.m - de.k), termTex(qCoef(de), de.m * de.k)];
    return {
      kind: 'tiles',
      prompt: de.given
        ? [
            prose(`Multiply every term of this equation by its integrating factor, $${factorTex(de)}$, and write the left side as one derivative.`),
            display(linearTex(de)),
          ]
        : [
            prose(`Find the integrating factor of this equation${de.kind === 'power' ? ', for $x > 0$' : ''}, multiply through by it, and write the left side as one derivative.`),
            display(linearTex(de)),
          ],
      template: '\\frac{d}{dx}({0}) = {1}',
      bank: tokenBank(answer, [productSlipTex(de), productTex(flipped), rightSlips[0], rightSlips[1], rightSlips[2]], 4),
      answer,
    };
  },
  solution: (de) => [...standardStep(de), ...linearSteps({ ...de, written: 'standard' }).slice(0, 2)],
};

/* ---------- Level 3, lesson 3: a constant P ---------- */

/** dy/dx + ky = Q one line at a time: multiply, integrate, divide. */
const deIfConstpSteps: Generator<LinearDe> = {
  id: 'de-if-constp-steps',
  sample: (rng, difficulty) => sampleLinear(rng, difficulty, 'exp'),
  render: (de): Slide => {
    const { k, m, p } = de;
    const q = qCoef(de);
    const Iy = productTex(de);
    const product = `\\frac{d}{dx}(${Iy}) = ${multipliedTex(de)}`;
    const integrated = `${Iy} = ${antiTex(de)} + C`;
    const general = generalTex(de);
    return {
      kind: 'steps',
      prompt: [
        prose(
          'Solve with the integrating factor below: tap the comma to multiply through by it, then tap the line to integrate, then again to divide.',
        ),
      ],
      start: [standardTex(de), ',', `I = ${factorTex(de)}`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: product,
          bank: stepBank(
            product,
            `\\frac{d}{dx}(${Iy}) = ${qTex(de)}`,
            `\\frac{d}{dx}(${productSlipTex(de)}) = ${multipliedTex(de)}`,
            `\\frac{d}{dx}(y${expX(-k)}) = ${expTerm(q, m - k)}`,
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: integrated,
          bank: stepBank(integrated, `${Iy} = ${expTerm(q, m + k)} + C`, `${Iy} = ${expTerm(q * (m + k), m + k)} + C`, `${Iy} = ${antiTex(de)}`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: general,
          bank: stepBank(
            general,
            `y = ${partTex(de)} + C`,
            `y = ${expTerm(p, m + 2 * k)} + C${expX(k)}`,
            `y = ${partTex(de)} + C${expX(k)}`,
          ),
        },
      ],
    };
  },
  solution: (de) => linearSteps(de).slice(1),
};

/** The numbers of the constant-P method, as a tree. */
const deIfExponentsTree: Generator<LinearDe> = {
  id: 'de-if-exponents-tree',
  sample: (rng, difficulty) => sampleLinear(rng, difficulty, 'exp'),
  render: (de): Slide => {
    const { k, m, p } = de;
    const q = qCoef(de);
    const answer = [k, m + k, p, -k];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `With the factor $e^{ax}$, the equation becomes $\\frac{d}{dx}(ye^{ax}) = ${coef(q)}e^{bx}$, which integrates to $ye^{ax} = re^{bx} + C$, so $y = r${m === 0 ? '' : expX(m)} + Ce^{sx}$.`,
        ),
        prose('Fill in $a$, then $b$, then $r$, then $s$.'),
      ],
      expression: linearTex(de),
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: ['a'] },
        { id: 'r', from: ['b'] },
        { id: 's', from: ['a'] },
      ],
      bank: treeBank(answer, [q, m - k, -p, q * (m + k), k - m]),
      answer: answer.map(String),
    };
  },
  solution: (de) => linearSteps(de).slice(1),
};

/** The general solution for a constant P, as tiles. */
const deIfGeneral: Generator<LinearDe> = {
  id: 'de-if-general',
  sample: (rng, difficulty) =>
    sampleLinear(rng, difficulty, 'exp', difficulty >= 2 ? rng.pick<LinearDe['written']>(['standard', 'scaled', 'moved']) : 'standard'),
  render: (de): Slide => {
    const { k, m, p } = de;
    const answer = [partTex(de), expX(-k)];
    const q = qCoef(de);
    return {
      kind: 'tiles',
      prompt: [prose('Find the general solution of'), display(linearTex(de))],
      template: 'y = {0} + C{1}',
      bank: tokenBank(
        answer,
        // A multiple of e^{-kx} after the C would be a right answer too, so none is offered.
        [expTerm(q, m), expX(k), expTerm(p, m + k), expX(-(m + k)), expTerm(-p, m), m === 0 ? expTerm(p, k) : expTerm(p, -m)].filter(
          (slip) => !slip.endsWith(expX(-k)),
        ),
        3,
      ),
      answer,
    };
  },
  solution: linearSteps,
};

/** The integral of the multiplied right side, typed. */
const deIfIntegrate: Generator<LinearDe & { given: boolean }> = {
  id: 'de-if-integrate',
  sample: (rng, difficulty) => ({
    ...sampleLinear(rng, difficulty, 'exp', difficulty >= 2 ? rng.pick<LinearDe['written']>(['standard', 'scaled', 'moved']) : 'standard'),
    given: difficulty < 2,
  }),
  render: (de): Slide => ({
    kind: 'expression',
    prompt: de.given
        ? [
            prose(`Multiplying this equation by its factor $${factorTex(de)}$ gives $\\frac{d}{dx}(${productTex(de)}) = ${multipliedTex(de)}$. Integrate.`),
            display(linearTex(de)),
          ]
        : [prose('Solve this equation with an integrating factor, as far as the line below.'), display(linearTex(de))],
    lead: `${productTex(de)} =`,
    keypad: X_INTEGRAL_KEYS,
    answer: antiAnswer(de),
    integrand: multipliedAnswer(de),
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: (de) => linearSteps(de).slice(0, -1),
};

/* ---------- Level 3, lesson 4: P = n/x ---------- */

/** The general solution for P = k/x, as tiles. */
const deIfPowerTiles: Generator<LinearDe> = {
  id: 'de-if-power-tiles',
  sample: (rng, difficulty) => sampleLinear(rng, difficulty, 'power', difficulty >= 2 && rng.chance(0.6) ? 'timesX' : 'standard'),
  render: (de): Slide => {
    const { k, m, p } = de;
    const answer = [partTex(de), cTermTex(de)];
    return {
      kind: 'tiles',
      prompt: [prose('Find the general solution of this equation, for $x > 0$.'), display(linearTex(de))],
      template: 'y = {0} + {1}',
      bank: tokenBank(
        answer,
        [termTex(p, k + m + 1), 'C', cTermTex(de, undefined, true), termTex(qCoef(de), m + 1), `\\frac{C}{${powerTex(Math.abs(k) + 1)}}`, termTex(-p, m + 1)],
        3,
      ),
      answer,
    };
  },
  solution: linearSteps,
};

/** dy/dx + (k/x)y = Q one line at a time. */
const deIfPowerSteps: Generator<LinearDe> = {
  id: 'de-if-power-steps',
  sample: (rng, difficulty) => sampleLinear(rng, difficulty, 'power'),
  render: (de): Slide => {
    const { k, m, p } = de;
    const q = qCoef(de);
    const Iy = productTex(de);
    const product = `\\frac{d}{dx}(${Iy}) = ${multipliedTex(de)}`;
    const integrated = `${Iy} = ${antiTex(de)} + C`;
    const general = generalTex(de);
    return {
      kind: 'steps',
      prompt: [
        prose(
          'Solve for $x > 0$ with the integrating factor below: tap the comma to multiply through by it, then tap the line to integrate, then again to divide.',
        ),
      ],
      start: [standardTex(de), ',', `I = ${factorTex(de)}`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: product,
          bank: stepBank(
            product,
            `\\frac{d}{dx}(${Iy}) = ${qTex(de)}`,
            `\\frac{d}{dx}(${productSlipTex(de)}) = ${multipliedTex(de)}`,
            `\\frac{d}{dx}(${Iy}) = ${termTex(q, k * m)}`,
            `\\frac{d}{dx}(${Iy}) = ${termTex(q, m - k)}`,
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: integrated,
          bank: stepBank(integrated, `${Iy} = ${termTex(q, k + m + 1)} + C`, `${Iy} = ${termTex(q * (k + m), k + m - 1)} + C`, `${Iy} = ${antiTex(de)}`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: general,
          bank: stepBank(general, `y = ${partTex(de)} + C`, `y = ${termTex(p, 2 * k + m + 1)} + ${cTermTex(de, undefined, true)}`, `y = ${partTex(de)} + ${cTermTex(de, undefined, true)}`),
        },
      ],
    };
  },
  solution: (de) => linearSteps(de).slice(1),
};

/** The powers of the P = k/x method, as a tree. */
const deIfPowersTree: Generator<LinearDe> = {
  id: 'de-if-powers-tree',
  sample: (rng, difficulty) => sampleLinear(rng, difficulty, 'power'),
  render: (de): Slide => {
    const { k, m, p } = de;
    const q = qCoef(de);
    const answer = [k, k + m, k + m + 1, p];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Multiplying by the factor $x^{a}$ gives $\\frac{d}{dx}(x^{a}y) = ${coef(q)}x^{b}$, which integrates to $x^{a}y = rx^{n} + C$.`,
        ),
        prose('Fill in $a$, then $b$, then $n$, then $r$.'),
      ],
      expression: `${linearTex(de)}, \\quad x > 0`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: ['a'] },
        { id: 'n', from: ['b'] },
        { id: 'r', from: ['n'] },
      ],
      bank: treeBank(answer, [q, k * m, k + m - 1, m + 1, q * (k + m + 1), -k]),
      answer: answer.map(String),
    };
  },
  solution: (de) => linearSteps(de).slice(1, -1),
};

/** From the integrated line to y: the form of the C term. */
export function cTermOptions(de: LinearDe): { tex: string; answer: string; correct?: boolean }[] {
  const part = partAnswer(de);
  return [
    { tex: generalTex(de), answer: generalAnswer(de), correct: true },
    { tex: `y = ${partTex(de)} + C`, answer: `${part} + C` },
    { tex: `y = ${partTex(de)} + ${cTermTex(de, undefined, true)}`, answer: `${part} + C*${cFactorAnswer(de, true)}` },
    { tex: `y = ${antiTex(de)} + ${cTermTex(de)}`, answer: `${antiAnswer(de)} + C*${cFactorAnswer(de)}` },
  ];
}

const deIfCterm: Generator<LinearDe> = {
  id: 'de-if-cterm',
  sample: (rng, difficulty) => sampleLinear(rng, difficulty, difficulty >= 2 && rng.chance(0.4) ? 'exp' : 'power'),
  render: (de): Slide =>
    choiceSlide(
      [
        prose(`Solving this equation${de.kind === 'power' ? ' for $x > 0$' : ''} reaches $${productTex(de)} = ${antiTex(de)} + C$. So $y$ is`),
        display(standardTex(de)),
      ],
      cTermOptions(de).map((opt) => ({ label: opt.tex, tex: true, correct: opt.correct })),
      deSalt(de),
    ),
  solution: (de) => [
    { text: `Divide every term by the factor, $${factorTex(de)}$ — the constant as well.` },
    { tex: generalTex(de) },
    {
      text:
        de.kind === 'exp'
          ? `$C$ divided by $${factorTex(de)}$ is $${cTermTex(de)}$: the constant term decays or grows with $x$ rather than staying constant.`
          : `$C$ divided by $${factorTex(de)}$ is $${cTermTex(de)}$, so the constant does not sit on its own.`,
    },
  ],
};

/* ---------- Level 3, lesson 5: particular solutions ---------- */

/** A linear equation with a condition y(x0) = y0 and the C it fixes. */
export interface ParticularDe extends LinearDe {
  C: number;
  x0: number;
  /** Where a tree asks for y next. */
  x1: number;
}

/** y at a point, whole by construction: x = 0 for `exp`, 1 or 2 for `power`. */
export function yAt(de: ParticularDe, x: number): number {
  if (de.kind === 'exp') return de.p + de.C;
  const part = de.p * x ** (de.m + 1);
  return de.k > 0 ? part + de.C / x ** de.k : part + de.C * x ** -de.k;
}

function sampleParticular(rng: Rng, difficulty: number, kind: LinearDe['kind'], useTwo: boolean): ParticularDe {
  const hard = difficulty >= 2;
  for (;;) {
    const de = sampleLinear(rng, difficulty, kind);
    if (kind === 'exp') {
      const C = rng.int(1, hard ? 9 : 6) * rng.sign();
      // A condition of y(0) = 0 would leave a slip of C = 0 among the options.
      if (de.p + C === 0) continue;
      return { ...de, C, x0: 0, x1: 0 };
    }
    // Keep 2^k small, so a condition at 2 needs no huge C.
    if (useTwo && de.k > 3) continue;
    const x0 = useTwo ? (rng.chance(0.5) ? 1 : 2) : 1;
    const x1 = x0 === 1 ? 2 : 1;
    const unit = useTwo && de.k > 0 ? 2 ** de.k : 1;
    const C = rng.int(1, hard ? 5 : 4) * rng.sign() * unit;
    const out = { ...de, C, x0, x1 };
    if (yAt(out, x0) === 0) continue;
    return out;
  }
}

const conditionTex = (de: ParticularDe): string => `y(${de.x0}) = ${yAt(de, de.x0)}`;
export const particularTex = (de: ParticularDe): string => `y = ${partTex(de)} ${cTermTex(de, de.C)}`;

/** The general solution with the condition put in, before C is found. */
function substitutedTex(de: ParticularDe): { line: string; partValue: number; cScale: string } {
  const partValue = de.kind === 'exp' ? de.p : de.p * de.x0 ** (de.m + 1);
  const cScale =
    de.kind === 'exp' || de.x0 === 1
      ? 'C'
      : de.k > 0
        ? `\\frac{C}{${de.x0 ** de.k}}`
        : `${de.x0 ** -de.k}C`;
  return { line: `${yAt(de, de.x0)} = ${partValue} + ${cScale}`, partValue, cScale };
}

function particularSteps(de: ParticularDe): SolutionStep[] {
  const { line, partValue } = substitutedTex(de);
  return [
    { text: 'The general solution, by the integrating factor:', tex: generalTex(de) },
    {
      text: de.kind === 'exp' ? 'Put in $x = 0$, where each $e^{0}$ is $1$.' : `Put in $x = ${de.x0}$.`,
      tex: line,
    },
    { text: `Take $${partValue}$ from both sides${de.kind === 'power' && de.x0 === 2 ? ', then undo what multiplies $C$' : ''}.`, tex: `C = ${de.C}` },
    { text: 'Write the general solution again with that $C$.', tex: particularTex(de) },
  ];
}

const sampleEither = (rng: Rng, difficulty: number): ParticularDe =>
  sampleParticular(rng, difficulty, rng.chance(0.5) ? 'exp' : 'power', difficulty >= 2);

/** C from a condition, typed. */
const deIfConstant: Generator<ParticularDe & { shown: boolean }> = {
  id: 'de-if-constant',
  sample: (rng, difficulty) => ({ ...sampleEither(rng, difficulty), shown: difficulty < 2 }),
  choices: (de) => {
    const y0 = yAt(de, de.x0);
    const { partValue } = substitutedTex(de);
    return numberChoices(de.C, [y0, y0 + partValue, -de.C, de.C + 1], mix(de.C, y0, de.k, de.m));
  },
  render: (de): Slide => ({
    kind: 'expression',
    prompt: de.shown
        ? [prose(`The general solution of $${standardTex(de)}$ is`), display(generalTex(de)), prose(`Find $C$ when $${conditionTex(de)}$.`)]
        : [
            prose(`Solve this equation with $${conditionTex(de)}$${de.kind === 'power' ? ', for $x > 0$' : ''}.`),
            display(standardTex(de)),
            prose(`The general solution ends in $${cTermTex(de)}$. Find $C$.`),
          ],
    lead: 'C =',
    keypad: [],
    answer: `${de.C}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: particularSteps,
};

/** Condition in, C out, particular solution written, one line at a time. */
const deIfConditionSteps: Generator<ParticularDe> = {
  id: 'de-if-condition-steps',
  sample: sampleEither,
  render: (de): Slide => {
    const y0 = yAt(de, de.x0);
    const { line, partValue, cScale } = substitutedTex(de);
    const constant = `C = ${de.C}`;
    const particular = particularTex(de);
    return {
      kind: 'steps',
      prompt: [
        prose(
          'A general solution and a condition are below. Tap the comma to put the condition in, then tap the line to find $C$, then again to write the particular solution.',
        ),
      ],
      start: [generalTex(de), ',', conditionTex(de)],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: line,
          bank: stepBank(line, `${partValue} = ${y0} + ${cScale}`, `${y0} = ${qCoef(de)} + ${cScale}`, `0 = ${partValue} + ${cScale}`),
        },
        { span: [0, 1], operator: 0, value: constant, bank: stepBank(constant, `C = ${y0}`, `C = ${-de.C}`, `C = ${y0 + partValue}`) },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(
            particular,
            `y = ${partTex(de)} ${signed(de.C)}`,
            `y = ${partTex(de)} ${cTermTex(de, de.C, true)}`,
            `y = ${partTex(de)} ${cTermTex(de, -de.C)}`,
          ),
        },
      ],
    };
  },
  solution: particularSteps,
};

/** Which particular solution fits: the equation and the condition, both. */
export function fitOptions(de: ParticularDe): { tex: string; answer: string; correct?: boolean }[] {
  const y0 = yAt(de, de.x0);
  const wrongC = y0 !== de.C ? y0 : -de.C;
  const part = partAnswer(de);
  return [
    { tex: particularTex(de), answer: generalAnswer(de, de.C), correct: true },
    { tex: `y = ${partTex(de)} ${cTermTex(de, wrongC)}`, answer: generalAnswer(de, wrongC) },
    { tex: `y = ${partTex(de)} ${cTermTex(de, de.C, true)}`, answer: `${part} + (${de.C})*${cFactorAnswer(de, true)}` },
    { tex: `y = ${antiTex(de)} ${cTermTex(de, de.C)}`, answer: `${antiAnswer(de)} + (${de.C})*${cFactorAnswer(de)}` },
  ];
}

const deIfFit: Generator<ParticularDe> = {
  id: 'de-if-fit',
  sample: sampleEither,
  render: (de): Slide =>
    choiceSlide(
      [
        prose(`Which is the solution of this equation with $${conditionTex(de)}$${de.kind === 'power' ? ', for $x > 0$' : ''}?`),
        display(standardTex(de)),
      ],
      fitOptions(de).map((opt) => ({ label: opt.tex, tex: true, correct: opt.correct })),
      deSalt(de, de.C, de.x0),
    ),
  solution: (de) => [
    ...particularSteps(de),
    { text: 'Each of the others either fails the condition or, once differentiated, fails the equation.' },
  ],
};

/** The coefficient, then C, then y somewhere else, as a tree. */
const deIfValueTree: Generator<ParticularDe> = {
  id: 'de-if-value-tree',
  sample: (rng, difficulty) => sampleParticular(rng, difficulty, 'power', true),
  render: (de): Slide => {
    const y1 = yAt(de, de.x1);
    const answer = [de.p, de.C, y1];
    return {
      kind: 'tree',
      prompt: [
        prose(`For $x > 0$, the general solution of this equation is $y = rx^{${de.m + 1}} + ${cTermTex(de)}$.`),
        prose(`Given $${conditionTex(de)}$, fill in $r$, then $C$, then $y(${de.x1})$.`),
      ],
      expression: standardTex(de),
      nodes: [
        { id: 'r', from: [] },
        { id: 'C', from: ['r'] },
        { id: 'y', from: ['r', 'C'] },
      ],
      bank: treeBank(answer, [qCoef(de), yAt(de, de.x0), -de.C, y1 + de.p, de.p + de.C]),
      answer: answer.map(String),
    };
  },
  solution: (de) => [
    ...particularSteps(de),
    { text: `Put in $x = ${de.x1}$.`, tex: `y(${de.x1}) = ${yAt(de, de.x1)}` },
  ],
};

/* ============================================================
 * Level 4: second order with constant coefficients
 * ============================================================ */

/**
 * `y'' + by' + cy = 0`, built from the roots of its auxiliary equation so
 * that every number in it is whole.
 *
 * - `real`: roots p < q, so b = -(p + q) and c = pq.
 * - `repeated`: the root p twice (q = p), so b = -2p and c = p^2.
 * - `complex`: roots α ± βi with β > 0, held as p = α and q = β, so
 *   b = -2α and c = α^2 + β^2.
 *
 * No real root is zero, so c is never zero and a real solution always has
 * two exponentials rather than a bare constant.
 */
export interface SecondDe {
  kind: 'real' | 'repeated' | 'complex';
  p: number;
  q: number;
  /** `moved` has the y' and y terms on the right; `scaled` has every term times `scale`. */
  written: 'standard' | 'moved' | 'scaled';
  /** 1 unless the equation is scaled, so that nothing unseen feeds a salt. */
  scale: number;
}

export const secondB = ({ kind, p, q }: SecondDe): number => (kind === 'complex' ? -2 * p : -(p + q));
export const secondC = ({ kind, p, q }: SecondDe): number => (kind === 'complex' ? p * p + q * q : p * q);

const D1 = rate('y', 'x');
const D2 = '\\frac{d^2y}{dx^2}';

/**
 * Terms joined as the learner reads them: a zero term dropped, 1 and -1
 * implied in front of a letter, a bare number kept whole.
 */
function terms(list: [number, string][]): string {
  const kept = list.filter(([c]) => c !== 0);
  if (kept.length === 0) return '0';
  return kept
    .map(([c, body], idx) => {
      const size = Math.abs(c);
      const shown = body === '' ? `${size}` : `${size === 1 ? '' : size}${body}`;
      if (idx === 0) return c < 0 ? `-${shown}` : shown;
      return `${c < 0 ? '-' : '+'} ${shown}`;
    })
    .join(' ');
}

/** A term with its sign in front, for a tile: `- 5m`, `+ 6`. Every tile goes through this, so no two spell one term two ways. */
const signedTerm = (c: number, body: string): string =>
  `${c < 0 ? '-' : '+'} ${body !== '' && Math.abs(c) === 1 ? '' : Math.abs(c)}${body}`;

/** `\cos 3x` or `\sin x`. */
const trig = (fn: 'cos' | 'sin', beta: number): string => `\\${fn} ${coef(beta)}x`;

/** y'' + by' + cy = 0 in Leibniz notation, with 1 in front of the second derivative. */
const eqOf = (b: number, c: number): string => `${terms([[1, D2], [b, D1], [c, 'y']])} = 0`;

/** The same with primes, for a line of working. */
const primesOf = (b: number, c: number): string => `${terms([[1, "y''"], [b, "y'"], [c, 'y']])} = 0`;

/** m^2 + bm + c = 0. */
const auxOf = (b: number, c: number, a = 1): string => `${terms([[a, 'm^2'], [a * b, 'm'], [a * c, '']])} = 0`;

export const auxTex = (de: SecondDe): string => auxOf(secondB(de), secondC(de));

/**
 * The equation as it is shown. `primes` writes y'' and y' rather than the
 * fractions, for the line of a steps slide: its fragments are set inline, and
 * two stacked fractions beside `y = e^{mx}` wrap on a phone.
 */
export function secondTex(de: SecondDe, primes = false): string {
  const b = secondB(de);
  const c = secondC(de);
  const [second, first] = primes ? ["y''", "y'"] : [D2, D1];
  if (de.written === 'moved') return `${second} = ${terms([[-b, first], [-c, 'y']])}`;
  const a = de.written === 'scaled' ? de.scale : 1;
  return `${terms([[a, second], [a * b, first], [a * c, 'y']])} = 0`;
}

/** The roots as the learner reads them. */
export function rootsTex({ kind, p, q }: SecondDe): string {
  if (kind === 'real') return `m = ${p}, \\; m = ${q}`;
  if (kind === 'repeated') return `m = ${p} \\text{ (twice)}`;
  return `m = ${p === 0 ? '' : `${p} `}\\pm ${coef(q)}i`;
}

/** A cos βx + B sin βx, with whatever coefficients. */
const waveOf = (A: number | string, B: number | string, beta: number): string =>
  typeof A === 'number' && typeof B === 'number'
    ? terms([[A, trig('cos', beta)], [B, trig('sin', beta)]])
    : `${A}${trig('cos', beta)} + ${B}${trig('sin', beta)}`;

/** The general solution, in A and B. */
export function secondGeneralTex({ kind, p, q }: SecondDe): string {
  if (kind === 'real') return `y = A${expX(p)} + B${expX(q)}`;
  if (kind === 'repeated') return `y = (A + Bx)${expX(p)}`;
  return p === 0 ? `y = ${waveOf('A', 'B', q)}` : `y = ${expX(p)}(${waveOf('A', 'B', q)})`;
}

/** A particular solution, with A and B numbers. */
export function secondParticularTex({ kind, p, q }: SecondDe, A: number, B: number): string {
  if (kind === 'real') return `y = ${terms([[A, expX(p)], [B, expX(q)]])}`;
  if (kind === 'repeated') return `y = (${terms([[A, ''], [B, 'x']])})${expX(p)}`;
  return p === 0 ? `y = ${waveOf(A, B, q)}` : `y = ${expX(p)}(${waveOf(A, B, q)})`;
}

/** The solution for mathjs, with A and B numbers or the letters. */
export function secondAnswer({ kind, p, q }: SecondDe, A: number | string = 'A', B: number | string = 'B'): string {
  if (kind === 'real') return `(${A})*e^((${p})*x) + (${B})*e^((${q})*x)`;
  if (kind === 'repeated') return `((${A}) + (${B})*x)*e^((${p})*x)`;
  return `e^((${p})*x)*((${A})*cos((${q})*x) + (${B})*sin((${q})*x))`;
}

/** y(0) and y'(0) for the solution with constants A and B. */
export function atZero({ kind, p, q }: SecondDe, A: number, B: number): [number, number] {
  if (kind === 'real') return [A + B, p * A + q * B];
  if (kind === 'repeated') return [A, p * A + B];
  return [A, p * A + q * B];
}

const KINDS: SecondDe['kind'][] = ['real', 'repeated', 'complex'];
const WRITTEN: SecondDe['written'][] = ['standard', 'moved', 'scaled'];

const secondSalt = (de: SecondDe, ...more: number[]): number =>
  mix(KINDS.indexOf(de.kind), de.p, de.q, WRITTEN.indexOf(de.written), de.scale, ...more);

const nonzero = (rng: Rng, size: number): number => rng.int(1, size) * rng.sign();

/** The forms an equation is shown in: mostly as it is at difficulty 1. */
const formsFor = (difficulty: number): SecondDe['written'][] =>
  difficulty >= 2 ? ['standard', 'moved', 'scaled'] : ['standard', 'standard', 'moved'];

/**
 * The repeated root has only a dozen values, so its questions take every
 * form at both difficulties: that is what clears the floor of 25.
 */
const repeatedForms = (difficulty: number): SecondDe['written'][] =>
  difficulty >= 2 ? ['standard', 'moved', 'scaled', 'scaled'] : ['standard', 'standard', 'moved', 'scaled'];

function sampleSecond(rng: Rng, difficulty: number, kind: SecondDe['kind'], forms: SecondDe['written'][]): SecondDe {
  const hard = difficulty >= 2;
  const written = rng.pick(forms);
  const scale = written === 'scaled' ? rng.int(2, 3) : 1;
  if (kind === 'repeated') {
    const p = nonzero(rng, hard ? 6 : 5);
    return { kind, p, q: p, written, scale };
  }
  if (kind === 'complex') return { kind, p: rng.int(hard ? -3 : -2, hard ? 3 : 2), q: rng.int(1, hard ? 4 : 3), written, scale };
  for (;;) {
    const one = nonzero(rng, hard ? 6 : 4);
    const two = nonzero(rng, hard ? 6 : 4);
    if (one !== two) return { kind, p: Math.min(one, two), q: Math.max(one, two), written, scale };
  }
}

const sampleAnyKind = (rng: Rng, difficulty: number, forms: SecondDe['written'][]): SecondDe =>
  sampleSecond(rng, difficulty, rng.pick(KINDS), forms);

/** Getting the equation into the form y'' + by' + cy = 0 first, when it is not. */
function toStandard(de: SecondDe): SolutionStep[] {
  const standard = eqOf(secondB(de), secondC(de));
  if (de.written === 'moved') return [{ text: 'Bring every term over to the left.', tex: standard }];
  if (de.written === 'scaled') return [{ text: `Divide every term by $${de.scale}$.`, tex: standard }];
  return [];
}

/** The general solution, start to finish. */
function secondSteps(de: SecondDe): SolutionStep[] {
  const b = secondB(de);
  const c = secondC(de);
  const disc = b * b - 4 * c;
  const shape =
    de.kind === 'real'
      ? 'Two different real roots give a sum of two exponentials.'
      : de.kind === 'repeated'
        ? `A repeated root gives $e^{${coef(de.p)}x}$ and $xe^{${coef(de.p)}x}$.`
        : `Complex roots $\\alpha \\pm \\beta i$ give $e^{\\alpha x}$ times a cosine and a sine of $\\beta x$.`;
  return [
    ...toStandard(de),
    { text: "$y''$ becomes $m^2$, $y'$ becomes $m$ and $y$ becomes $1$.", tex: auxOf(b, c) },
    { text: `The discriminant is $${b < 0 ? `(${b})` : b}^2 - 4 \\times ${c < 0 ? `(${c})` : c} = ${disc}$.`, tex: rootsTex(de) },
    { text: shape, tex: secondGeneralTex(de) },
  ];
}

/** A slip list cut down to the first few that are really different from the answer and from each other. */
function firstDistinct(answer: string, slips: string[], count: number): string[] {
  const out: string[] = [];
  for (const slip of slips) {
    if (out.length === count) break;
    if (slip !== answer && !out.includes(slip)) out.push(slip);
  }
  return out;
}

/* ---------- Level 4, lesson 1: the auxiliary equation ---------- */

/** Put y = e^{mx} in, take out e^{mx}, and drop it. */
const deAuxSubSteps: Generator<SecondDe> = {
  id: 'de-aux-sub-steps',
  sample: (rng, difficulty) => sampleAnyKind(rng, difficulty, difficulty >= 2 ? ['standard', 'scaled', 'scaled'] : ['standard']),
  render: (de): Slide => {
    const a = de.written === 'scaled' ? de.scale : 1;
    const b = secondB(de) * a;
    const c = secondC(de) * a;
    const E = 'e^{mx}';
    const substituted = `${terms([[a, `m^2${E}`], [b, `m${E}`], [c, E]])} = 0`;
    const poly = terms([[a, 'm^2'], [b, 'm'], [c, '']]);
    const factored = `${E}(${poly}) = 0`;
    const aux = `${poly} = 0`;
    return {
      kind: 'steps',
      prompt: [
        prose(
          'Try $y = e^{mx}$ in this equation. Tap the comma to put it in, then tap the line to take out the common factor, then again to drop it.',
        ),
      ],
      start: [secondTex(de, true), ',', `y = ${E}`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: substituted,
          bank: stepBank(
            substituted,
            `${terms([[a, `m${E}`], [b, `m${E}`], [c, E]])} = 0`,
            `${terms([[a, `m^2${E}`], [b, E], [c, E]])} = 0`,
            `${terms([[a, `m^2${E}`], [b, `m${E}`], [c, '']])} = 0`,
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: factored,
          bank: stepBank(
            factored,
            `${E}(${terms([[a, 'm^2'], [b, ''], [c, '']])}) = 0`,
            `${E}(${terms([[a, 'm'], [b, 'm'], [c, '']])}) = 0`,
            `e^{2mx}(${poly}) = 0`,
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: aux,
          bank: stepBank(aux, `${E} = 0`, `${poly} = 1`, `${terms([[a, 'm^2'], [-b, 'm'], [c, '']])} = 0`),
        },
      ],
    };
  },
  solution: (de) => {
    const a = de.written === 'scaled' ? de.scale : 1;
    const poly = terms([[a, 'm^2'], [a * secondB(de), 'm'], [a * secondC(de), '']]);
    return [
      { text: "With $y = e^{mx}$, $y' = me^{mx}$ and $y'' = m^2e^{mx}$." },
      { text: 'Put them in. Every term has $e^{mx}$ in it, so take it out.', tex: `e^{mx}(${poly}) = 0` },
      { text: '$e^{mx}$ is never $0$, so the bracket is. That is the auxiliary equation.', tex: `${poly} = 0` },
    ];
  },
};

/** The auxiliary equation read off, as tiles. */
const deAuxTiles: Generator<SecondDe> = {
  id: 'de-aux-tiles',
  sample: (rng, difficulty) => sampleAnyKind(rng, difficulty, formsFor(difficulty)),
  render: (de): Slide => {
    const b = secondB(de);
    const c = secondC(de);
    const answer = b === 0 ? [signedTerm(c, '')] : [signedTerm(b, 'm'), signedTerm(c, '')];
    // Scaled, the likeliest slip is not dividing through, so those come first.
    const slips = [
      ...(de.written === 'scaled' ? [signedTerm(de.scale * b, 'm'), signedTerm(de.scale * c, '')] : []),
      signedTerm(-b, 'm'),
      signedTerm(-c, ''),
      signedTerm(c, 'm'),
      signedTerm(b, ''),
    ].filter((token) => token !== signedTerm(0, 'm') && token !== signedTerm(0, ''));
    return {
      kind: 'tiles',
      prompt: [prose('Write the auxiliary equation of this equation in the form $m^2 + bm + c = 0$.'), display(secondTex(de))],
      template: b === 0 ? 'm^2 {0} = 0' : 'm^2 {0} {1} = 0',
      bank: tokenBank(answer, slips, 3),
      answer,
    };
  },
  solution: (de) => [
    ...toStandard(de),
    {
      text: "Replace $y''$ with $m^2$, $y'$ with $m$ and $y$ with $1$, keeping every coefficient and its sign.",
      tex: auxTex(de),
    },
  ],
};

/** A root of the auxiliary equation, typed. */
export interface RootParams extends SecondDe {
  larger: boolean;
}

const deAuxRoot: Generator<RootParams> = {
  id: 'de-aux-root',
  sample: (rng, difficulty) => {
    const de = sampleSecond(rng, difficulty, rng.chance(0.75) ? 'real' : 'repeated', formsFor(difficulty));
    return { ...de, larger: de.kind === 'repeated' || rng.chance(0.5) };
  },
  render: (de): Slide => ({
    kind: 'expression',
    prompt: [
      prose(
        `Find ${de.kind === 'repeated' ? 'the repeated root' : de.larger ? 'the larger root' : 'the smaller root'} of the auxiliary equation of`,
      ),
      display(secondTex(de)),
    ],
    lead: 'm =',
    keypad: [],
    answer: `${de.larger ? de.q : de.p}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (de) => [
    ...toStandard(de),
    { text: 'The auxiliary equation:', tex: auxTex(de) },
    {
      text: 'Factorise it.',
      tex: `(m ${signed(-de.p)})${de.kind === 'repeated' ? '^2' : `(m ${signed(-de.q)})`} = 0`,
    },
    { tex: rootsTex(de) },
  ],
};

/** A walk: the auxiliary equation, its discriminant, and the case that picks. */
const deAuxCase: Generator<SecondDe> = {
  id: 'de-aux-case',
  sample: (rng, difficulty) => sampleAnyKind(rng, difficulty, difficulty >= 2 ? ['standard', 'moved', 'moved'] : ['standard', 'standard', 'moved']),
  render: (de): Slide => {
    const b = secondB(de);
    const c = secondC(de);
    const disc = b * b - 4 * c;
    const salt = secondSalt(de);
    const aux = `$${auxOf(b, c)}$`;
    const auxSlips: Branch[] = [
      {
        label: `$${auxOf(-b, c)}$`,
        outcome:
          de.written === 'moved'
            ? 'Moving a term across the $=$ changes its sign, so the $m$ term has the other sign.'
            : "$y'$ becomes $m$ with its coefficient, sign and all.",
      },
      {
        label: `$${auxOf(b, -c)}$`,
        outcome: de.written === 'moved' ? 'Every term moved to the left changes sign, the $y$ term as well.' : '$y$ becomes $1$, keeping its coefficient and sign.',
      },
      { label: `$${auxOf(c, b)}$`, outcome: "$y'$ becomes $m$ and $y$ becomes $1$: the coefficients stay where they were." },
    ];
    const discSlips: Branch[] = [
      { label: `$${b * b + 4 * c}$`, outcome: 'The discriminant is $b^2 - 4c$: take $4c$ away.' },
      { label: `$${-disc}$`, outcome: 'That is $4c - b^2$, the discriminant the wrong way round.' },
      { label: `$${2 * b - 4 * c}$`, outcome: 'Square $b$ rather than doubling it.' },
    ];
    const verdict =
      de.kind === 'real'
        ? `The roots are $m = ${de.p}$ and $m = ${de.q}$.`
        : de.kind === 'repeated'
          ? `The root is $m = ${de.p}$, twice.`
          : `The roots are $${rootsTex(de)}$.`;
    const sign = disc > 0 ? 'positive' : disc === 0 ? 'zero' : 'negative';
    const cases: Branch[] = [
      {
        label: 'Two different real roots',
        outcome: de.kind === 'real' ? verdict : `Two real roots need a positive discriminant, and this one is ${sign}.`,
      },
      {
        label: 'One repeated root',
        outcome: de.kind === 'repeated' ? verdict : `A repeated root needs a discriminant of zero, and this one is ${sign}.`,
      },
      {
        label: 'Two complex roots',
        outcome: de.kind === 'complex' ? verdict : `Complex roots need a negative discriminant, and this one is ${sign}.`,
      },
    ];
    const caseLabel = cases[KINDS.indexOf(de.kind)].label;
    return {
      kind: 'flow',
      prompt: [prose('Find which kind of roots the auxiliary equation of this equation has.')],
      subject: secondTex(de),
      steps: [
        { id: 'aux', ask: 'The auxiliary equation is', branches: branchesOf({ label: aux, to: 'disc' }, auxSlips, salt) },
        { id: 'disc', ask: 'Its discriminant, $b^2 - 4c$, is', branches: branchesOf({ label: `$${disc}$`, to: 'case' }, discSlips, salt >>> 4) },
        { id: 'case', ask: 'So it has', branches: turned(cases, (salt >>> 8) % 3) },
      ],
      answer: [aux, `$${disc}$`, caseLabel],
    };
  },
  solution: (de) => secondSteps(de).slice(0, -1),
};

/* ---------- Level 4, lesson 2: two real roots ---------- */

/** The general solution for two real roots, as tiles. */
const deRealGeneral: Generator<SecondDe> = {
  id: 'de-real-general',
  sample: (rng, difficulty) => sampleSecond(rng, difficulty, 'real', formsFor(difficulty)),
  render: (de): Slide => {
    const { p, q } = de;
    const b = secondB(de);
    const c = secondC(de);
    // An exponent that is one of the roots would be a right answer too, so none is offered.
    const wrongPowers = [-p, -q, b, c, p + q, 2 * p].filter((k) => k !== p && k !== q && k !== 0);
    return {
      kind: 'tiles',
      prompt: [prose('Find the general solution of'), display(secondTex(de))],
      template: 'y = A{0} + B{1}',
      bank: tokenBank([expX(p), expX(q)], [...wrongPowers.map(expX), `x${expX(p)}`], 3),
      answer: [expX(p), expX(q)],
      unordered: true,
    };
  },
  solution: secondSteps,
};

/** The roots from their sum and product, as a tree. */
const deRealRootsTree: Generator<SecondDe> = {
  id: 'de-real-roots-tree',
  sample: (rng, difficulty) => sampleSecond(rng, difficulty, 'real', difficulty >= 2 ? ['standard', 'moved'] : ['standard', 'standard', 'moved']),
  render: (de): Slide => {
    const { p, q } = de;
    const b = secondB(de);
    const c = secondC(de);
    const answer = [-b, c, p, q];
    return {
      kind: 'tree',
      prompt: [
        prose('The roots of the auxiliary equation add to $s$ and multiply to $t$. They are $p$ and $q$, with $p < q$.'),
        prose('Fill in $s$, then $t$, then $p$ and $q$.'),
      ],
      expression: secondTex(de),
      nodes: [
        { id: 's', from: [] },
        { id: 't', from: [] },
        { id: 'p', from: ['s', 't'] },
        { id: 'q', from: ['s', 't'] },
      ],
      bank: treeBank(answer, [b, -c, -p, -q, p * q + 1]),
      answer: answer.map(String),
    };
  },
  solution: (de) => [
    ...toStandard(de),
    { text: 'The auxiliary equation:', tex: auxTex(de) },
    {
      text: `For $m^2 + bm + c$, the roots add to $-b$ and multiply to $c$: here $${-secondB(de)}$ and $${secondC(de)}$.`,
    },
    { text: 'Two whole numbers with that sum and product:', tex: rootsTex(de) },
  ],
};

/** Which general solution, or which equation, as a choice. */
export interface WhichSecond extends SecondDe {
  /** Show the solution and ask for the equation. */
  reverse: boolean;
}

/** Options for a which-solution question on any kind: the answer, then its slips. */
function solutionSlips(de: SecondDe): string[] {
  const { kind, p, q } = de;
  if (kind === 'real') {
    return [
      q === -p ? `y = ${waveOf('A', 'B', q)}` : `y = A${expX(-p)} + B${expX(-q)}`,
      `y = (A + Bx)${expX(p)}`,
      `y = A${expX(p)}${expX(q)}`,
      `y = A${expX(p)} + B${expX(-q)}`,
    ];
  }
  if (kind === 'repeated') {
    return [`y = (A + Bx)${expX(-p)}`, `y = A${expX(p)} + B${expX(-p)}`, `y = (A + Bx^2)${expX(p)}`];
  }
  // Forgetting to halve: the square root of 4c - b^2 is 2β, not β.
  const freq = 2 * q;
  const withFreq = (alpha: number, beta: number): string =>
    alpha === 0 ? `y = ${waveOf('A', 'B', beta)}` : `y = ${expX(alpha)}(${waveOf('A', 'B', beta)})`;
  if (p === 0) return [`y = A${expX(q)} + B${expX(-q)}`, withFreq(0, freq), withFreq(q, q)];
  return [
    withFreq(-p, q),
    withFreq(p, freq),
    ...(Math.abs(p) !== q ? [withFreq(q, Math.abs(p))] : []),
    withFreq(0, q),
    ...(Math.abs(p) !== q ? [`y = A${expX(p + q)} + B${expX(p - q)}`] : []),
  ];
}

/** Equations that are not this one, for asking which has a given solution. */
function equationSlips(de: SecondDe): string[] {
  const b = secondB(de);
  const c = secondC(de);
  const { kind, p, q } = de;
  const slips: [number, number][] =
    kind === 'real'
      ? [[-b, c], [b, -c], [c, b], [-b, -c], [b, q], [q - p, c]]
      : kind === 'repeated'
        ? [[-b, c], [-p, c], [b, -c]]
        : [[-b, c], [b, p * p - q * q], [-p, c], [b, -c], [c, b], [q, c]];
  return slips.filter(([bb, cc]) => bb !== b || cc !== c).map(([bb, cc]) => eqOf(bb, cc));
}

/** A which-question from a generator's own direction and slips. */
function whichSlide(de: WhichSecond): Slide {
  const salt = secondSalt(de, de.reverse ? 1 : 0);
  if (de.reverse) {
    const answer = eqOf(secondB(de), secondC(de));
    return choiceSlide(
      [prose('Which equation has this general solution?'), display(secondGeneralTex(de))],
      [{ label: answer, tex: true, correct: true }, ...firstDistinct(answer, equationSlips(de), 3).map((label) => ({ label, tex: true }))],
      salt,
    );
  }
  const answer = secondGeneralTex(de);
  return choiceSlide(
    [prose('Which is the general solution of'), display(secondTex(de))],
    [{ label: answer, tex: true, correct: true }, ...firstDistinct(answer, solutionSlips(de), 3).map((label) => ({ label, tex: true }))],
    salt,
  );
}

function whichSolution(de: WhichSecond): SolutionStep[] {
  if (!de.reverse) return secondSteps(de);
  return [
    { text: 'Read the roots of the auxiliary equation off the solution.', tex: rootsTex(de) },
    { text: 'The auxiliary equation is the quadratic with those roots.', tex: auxTex(de) },
    { text: "Turn $m^2$ back into $y''$, $m$ into $y'$ and $1$ into $y$.", tex: eqOf(secondB(de), secondC(de)) },
  ];
}

const deRealWhich: Generator<WhichSecond> = {
  id: 'de-real-which',
  sample: (rng, difficulty) => ({
    ...sampleSecond(rng, difficulty, 'real', formsFor(difficulty)),
    reverse: rng.chance(difficulty >= 2 ? 0.5 : 0.3),
  }),
  render: whichSlide,
  solution: whichSolution,
};

/** Auxiliary equation, factorised, general solution, one line at a time. */
const deRealSolveSteps: Generator<SecondDe> = {
  id: 'de-real-solve-steps',
  sample: (rng, difficulty) => sampleSecond(rng, difficulty, 'real', difficulty >= 2 ? ['standard', 'moved', 'moved'] : ['standard', 'standard', 'moved']),
  render: (de): Slide => {
    const { p, q } = de;
    const b = secondB(de);
    const c = secondC(de);
    const factor = (r: number): string => `(m ${signed(-r)})`;
    const aux = auxOf(b, c);
    const factored = `${factor(p)}${factor(q)} = 0`;
    const general = secondGeneralTex(de);
    const symmetric = q === -p;
    return {
      kind: 'steps',
      prompt: [prose('Solve this equation: tap the line for its auxiliary equation, again to factorise that, and again for the general solution.')],
      start: [secondTex(de, true)],
      reductions: [
        { span: [0, 1], operator: 0, value: aux, bank: stepBank(aux, auxOf(-b, c), auxOf(b, -c), auxOf(c, b)) },
        {
          span: [0, 1],
          operator: 0,
          value: factored,
          bank: stepBank(
            factored,
            `${factor(-p)}${factor(q)} = 0`,
            `${factor(p)}${factor(-q)} = 0`,
            ...(symmetric ? [] : [`${factor(-p)}${factor(-q)} = 0`]),
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: general,
          bank: stepBank(
            general,
            `y = (A + Bx)${expX(p)}`,
            `y = A${expX(p)} + B${expX(-q)}`,
            ...(symmetric ? [] : [`y = A${expX(-p)} + B${expX(-q)}`]),
          ),
        },
      ],
    };
  },
  solution: (de) => [
    ...toStandard(de),
    { text: 'The auxiliary equation:', tex: auxTex(de) },
    { text: 'Factorise it.', tex: `(m ${signed(-de.p)})(m ${signed(-de.q)}) = 0` },
    { text: `The roots are $${de.p}$ and $${de.q}$, so`, tex: secondGeneralTex(de) },
  ],
};

/* ---------- Level 4, lesson 3: a repeated root ---------- */

/** The two solutions a repeated root gives, as tiles. */
const deRepGeneral: Generator<SecondDe> = {
  id: 'de-rep-general',
  sample: (rng, difficulty) => sampleSecond(rng, difficulty, 'repeated', repeatedForms(difficulty)),
  render: (de): Slide => {
    const { p } = de;
    const answer = [expX(p), `x${expX(p)}`];
    return {
      kind: 'tiles',
      prompt: [prose('Find the general solution of'), display(secondTex(de))],
      template: 'y = A{0} + B{1}',
      bank: tokenBank(answer, [expX(-p), `x${expX(-p)}`, `x^2${expX(p)}`, expX(2 * p)], 3),
      answer,
      unordered: true,
    };
  },
  solution: (de) => [
    ...secondSteps(de),
    { text: 'Multiplied out, the same solution reads', tex: `y = A${expX(de.p)} + Bx${expX(de.p)}` },
  ],
};

/** Check that Bxe^{px} solves the equation with the repeated root p. */
export interface RepCheckParams {
  p: number;
  B: number;
}

const repDe = (p: number): SecondDe => ({ kind: 'repeated', p, q: p, written: 'standard', scale: 1 });

const deRepCheckSteps: Generator<RepCheckParams> = {
  id: 'de-rep-check-steps',
  sample: (rng, difficulty) =>
    difficulty >= 2 ? { p: nonzero(rng, 6), B: nonzero(rng, 3) } : { p: nonzero(rng, 5), B: rng.int(1, 3) },
  render: ({ p, B }): Slide => {
    const de = repDe(p);
    const E = expX(p);
    const bracket = (constant: number, slope: number): string => `(${terms([[constant, ''], [slope, 'x']])})${E}`;
    const first = `y' = ${bracket(B, B * p)}`;
    const second = `y'' = ${bracket(2 * B * p, B * p * p)}`;
    const zero = primesOf(secondB(de), secondC(de));
    const lhs = zero.replace(/ = 0$/, '');
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Show that $y = ${coef(B)}x${E}$ solves the equation below: tap the line for $y'$, again for $y''$, then again to put all three in.`,
        ),
        display(secondTex(de)),
      ],
      start: [`y = ${coef(B)}x${E}`],
      reductions: [
        {
          span: [0, 1],
          operator: 0,
          value: first,
          bank: stepBank(first, `y' = ${terms([[B * p, `x${E}`]])}`, `y' = ${bracket(B, -B * p)}`, `y' = ${terms([[B, E]])}`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: second,
          bank: stepBank(second, `y'' = ${bracket(B * p, B * p * p)}`, `y'' = ${terms([[B * p * p, `x${E}`]])}`, `y'' = ${bracket(2 * B, B * p * p)}`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: zero,
          bank: stepBank(zero, `${lhs} = ${terms([[-B * p, E]])}`, `${lhs} = ${terms([[2 * B * p, E]])}`, `${lhs} = ${terms([[B * p * p, `x${E}`]])}`),
        },
      ],
    };
  },
  solution: ({ p, B }) => {
    const de = repDe(p);
    const E = expX(p);
    return [
      { text: 'By the product rule:', tex: `y' = (${terms([[B, ''], [B * p, 'x']])})${E}` },
      { text: 'And again:', tex: `y'' = (${terms([[2 * B * p, ''], [B * p * p, 'x']])})${E}` },
      {
        text: `Put them in. The numbers add to $0$ and the $x$ terms add to $0$, so $${coef(B)}x${E}$ is a solution.`,
        tex: primesOf(secondB(de), secondC(de)),
      },
    ];
  },
};

/** A walk: the auxiliary equation, its root, and the shape of the solution. */
const deRepShape: Generator<SecondDe> = {
  id: 'de-rep-shape',
  sample: (rng, difficulty) => sampleSecond(rng, difficulty, 'repeated', repeatedForms(difficulty)),
  render: (de): Slide => {
    const { p } = de;
    const b = secondB(de);
    const c = secondC(de);
    const salt = secondSalt(de);
    const aux = `$${auxOf(b, c)}$`;
    const root = `$m = ${p}$, twice`;
    const shape = `$${secondGeneralTex(de)}$`;
    return {
      kind: 'flow',
      prompt: [prose('Find the general solution of this equation.')],
      subject: secondTex(de),
      steps: [
        {
          id: 'aux',
          ask: `The auxiliary equation${de.written === 'scaled' ? `, divided by $${de.scale}$,` : ''} is`,
          branches: branchesOf(
            { label: aux, to: 'root' },
            [
              { label: `$${auxOf(-b, c)}$`, outcome: "$y'$ becomes $m$ with its sign, which the $m$ term here has the wrong way round." },
              { label: `$${auxOf(b, -c)}$`, outcome: '$y$ becomes $1$ with its sign, which the number here has the wrong way round.' },
            ],
            salt,
          ),
        },
        {
          id: 'root',
          ask: 'It is a perfect square, so its root is',
          branches: branchesOf(
            { label: root, to: 'shape' },
            [
              { label: `$m = ${-p}$, twice`, outcome: `$(m ${signed(-p)})^2 = 0$ at $m = ${p}$: the sign flips out of the bracket.` },
              { label: `$m = ${p}$ and $m = ${-p}$`, outcome: `Those would be the roots of $m^2 - ${p * p} = 0$, which has no $m$ term.` },
            ],
            salt >>> 4,
          ),
        },
        {
          id: 'shape',
          ask: 'So the general solution is',
          branches: branchesOf(
            { label: shape, outcome: `The second solution $x${expX(p)}$ comes in because the root repeats.` },
            [
              { label: `$y = A${expX(p)} + B${expX(p)}$`, outcome: `That is $(A + B)${expX(p)}$: only one constant, and a second-order equation needs two.` },
              { label: `$y = A${expX(p)} + B${expX(-p)}$`, outcome: `$${expX(-p)}$ would need $${-p}$ to be a root as well.` },
            ],
            salt >>> 8,
          ),
        },
      ],
      answer: [aux, root, shape],
    };
  },
  solution: secondSteps,
};

const deRepWhich: Generator<WhichSecond> = {
  id: 'de-rep-which',
  sample: (rng, difficulty) => ({
    ...sampleSecond(rng, difficulty, 'repeated', repeatedForms(difficulty)),
    reverse: rng.chance(difficulty >= 2 ? 0.5 : 0.3),
  }),
  render: whichSlide,
  solution: whichSolution,
};

/* ---------- Level 4, lesson 4: complex roots ---------- */

/** The general solution for complex roots, as tiles, cosine first. */
const deCxGeneral: Generator<SecondDe> = {
  id: 'de-cx-general',
  sample: (rng, difficulty) => sampleSecond(rng, difficulty, 'complex', formsFor(difficulty)),
  render: (de): Slide => {
    const { p: alpha, q: beta } = de;
    // Forgetting to halve: the square root of 4c - b^2 is 2β, not β.
    const freq = 2 * beta;
    const prompt = [prose('Find the general solution of this equation, with the cosine term first.'), display(secondTex(de))];
    if (alpha === 0) {
      const answer = [trig('cos', beta), trig('sin', beta)];
      return {
        kind: 'tiles',
        prompt,
        template: 'y = A{0} + B{1}',
        bank: tokenBank(answer, [expX(beta), trig('cos', freq), trig('sin', freq), expX(-beta)], 3),
        answer,
      };
    }
    const answer = [expX(alpha), trig('cos', beta), trig('sin', beta)];
    const swapped = Math.abs(alpha) !== beta ? [trig('cos', Math.abs(alpha)), trig('sin', Math.abs(alpha))] : [];
    return {
      kind: 'tiles',
      prompt,
      template: 'y = {0}(A{1} + B{2})',
      bank: tokenBank(answer, [expX(beta), expX(-alpha), ...swapped, trig('cos', freq), expX(-2 * alpha)], 3),
      answer,
    };
  },
  solution: secondSteps,
};

/** α or β, typed. */
export interface PartParams extends SecondDe {
  ask: 'alpha' | 'beta';
}

const deCxPart: Generator<PartParams> = {
  id: 'de-cx-part',
  sample: (rng, difficulty) => ({
    ...sampleSecond(rng, difficulty, 'complex', formsFor(difficulty)),
    ask: rng.chance(0.5) ? 'alpha' : 'beta',
  }),
  render: (de): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`The auxiliary equation of this equation has roots $\\alpha \\pm \\beta i$, with $\\beta > 0$. Find $\\${de.ask}$.`),
      display(secondTex(de)),
    ],
    lead: `\\${de.ask} =`,
    keypad: [],
    answer: `${de.ask === 'alpha' ? de.p : de.q}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (de) => {
    const b = secondB(de);
    const c = secondC(de);
    return [
      ...toStandard(de),
      { text: 'The auxiliary equation:', tex: auxTex(de) },
      // With no m term it is already a square plus a number: nothing to complete.
      ...(de.p === 0
        ? []
        : [
            {
              text: 'Complete the square.',
              tex: `(m ${signed(-de.p)})^2 + ${de.q * de.q} = 0`,
            },
          ]),
      {
        text: `So $m = ${de.p === 0 ? '' : `${de.p} `}\\pm ${coeffTex(de.q)}$: $\\alpha = -\\frac{b}{2} = ${de.p}$ and $\\beta = \\frac{\\sqrt{4c - b^2}}{2} = \\frac{\\sqrt{${4 * c - b * b}}}{2} = ${de.q}$.`,
      },
    ];
  },
};

const deCxWhich: Generator<WhichSecond> = {
  id: 'de-cx-which',
  sample: (rng, difficulty) => ({
    ...sampleSecond(rng, difficulty, 'complex', formsFor(difficulty)),
    reverse: rng.chance(difficulty >= 2 ? 0.5 : 0.3),
  }),
  render: whichSlide,
  solution: whichSolution,
};

/** The discriminant, then α, then β, as a tree. */
const deCxTree: Generator<SecondDe> = {
  id: 'de-cx-tree',
  sample: (rng, difficulty) => sampleSecond(rng, difficulty, 'complex', difficulty >= 2 ? ['standard', 'moved'] : ['standard', 'standard', 'moved']),
  render: (de): Slide => {
    const b = secondB(de);
    const c = secondC(de);
    const disc = b * b - 4 * c;
    const answer = [disc, de.p, de.q];
    return {
      kind: 'tree',
      prompt: [
        prose(
          'The roots of the auxiliary equation are $\\alpha \\pm \\beta i$, with $\\beta > 0$. Its discriminant is $D$, then $\\alpha = -\\frac{b}{2}$ and $\\beta = \\frac{\\sqrt{-D}}{2}$.',
        ),
        prose('Fill in $D$, then $\\alpha$, then $\\beta$.'),
      ],
      expression: secondTex(de),
      nodes: [
        { id: 'D', from: [] },
        { id: 'alpha', from: [] },
        { id: 'beta', from: ['D'] },
      ],
      bank: treeBank(answer, [-disc, -de.p, 2 * de.q, de.q * de.q, b]),
      answer: answer.map(String),
    };
  },
  solution: (de) => {
    const b = secondB(de);
    const c = secondC(de);
    return [
      ...toStandard(de),
      { text: 'The auxiliary equation:', tex: auxTex(de) },
      { text: 'Its discriminant is negative:', tex: `D = ${b < 0 ? `(${b})` : b}^2 - 4 \\times ${c} = ${b * b - 4 * c}` },
      { text: 'By the quadratic formula,', tex: `m = \\frac{${-b} \\pm \\sqrt{${b * b - 4 * c}}}{2} = ${de.p} \\pm ${coef(de.q)}i` },
    ];
  },
};

/* ---------- Level 4, lesson 5: particular solutions ---------- */

/** An equation with the constants of its particular solution, read off as y(0) and y'(0). */
export interface SecondIvp extends SecondDe {
  A: number;
  B: number;
  /** For a typed constant: which one is asked. */
  letter: 'A' | 'B';
}

function sampleIvp(rng: Rng, difficulty: number): SecondIvp {
  const hard = difficulty >= 2;
  const de = sampleAnyKind(rng, difficulty, hard ? ['standard', 'moved', 'scaled'] : ['standard', 'standard', 'moved']);
  const A = nonzero(rng, hard ? 6 : 4);
  const B = nonzero(rng, hard ? 6 : 4);
  // Only two real roots make A something to solve for; otherwise y(0) is A.
  const letter = de.kind === 'real' && rng.chance(0.5) ? 'A' : 'B';
  return { ...de, A, B, letter };
}

export const conditionsTex = (de: SecondIvp): string => {
  const [y0, v0] = atZero(de, de.A, de.B);
  return `y(0) = ${y0}, \\; y'(0) = ${v0}`;
};

/** The general solution in words that name A and B without giving the roots away. */
function genericForm({ kind }: SecondDe): string {
  if (kind === 'real') return '$y = Ae^{px} + Be^{qx}$ with $p < q$';
  if (kind === 'repeated') return '$y = (A + Bx)e^{px}$';
  return '$y = e^{\\alpha x}(A\\cos \\beta x + B\\sin \\beta x)$ with $\\beta > 0$';
}

/** y(0) and y'(0) as equations in A and B. */
function conditionEquations(de: SecondIvp, slip: 'none' | 'chain' | 'swap' | 'sign' = 'none'): string {
  const [y0, v0] = atZero(de, de.A, de.B);
  const { kind, p, q } = de;
  const first = kind === 'real' ? 'A + B' : 'A';
  const factor = slip === 'sign' ? -1 : 1;
  const second =
    slip === 'chain'
      ? kind === 'real'
        ? 'A + B'
        : kind === 'repeated'
          ? terms([[p, 'A']])
          : terms([[p, 'A'], [1, 'B']])
      : kind === 'repeated'
        ? terms([[factor * p, 'A'], [1, 'B']])
        : terms([[factor * p, 'A'], [factor * q, 'B']]);
  const [left, right] = slip === 'swap' ? [v0, y0] : [y0, v0];
  return `${first} = ${left}, \\; ${second} = ${right}`;
}

/** The same two equations stacked, for a worked solution, where one line runs off a phone. */
function stackedConditions(de: SecondIvp): string {
  const [first, second] = conditionEquations(de).split(', \\; ');
  return chain(first.replace(' = ', ' &= '), second.replace(' = ', ' &= '));
}

/**
 * Particular solutions that miss the equation or a condition.
 *
 * With the roots fixed, the conditions pick out A and B, so any other pair
 * misses one. Flipping the roots' signs misses the equation, except where the
 * roots are symmetric and the flip only swaps the two terms, so it is left out
 * there.
 */
function ivpSlips(de: SecondIvp): string[] {
  const { kind, p, q, A, B } = de;
  const [y0, v0] = atZero(de, A, B);
  const symmetric = (kind === 'real' && q === -p) || (kind === 'complex' && p === 0);
  const flipped =
    kind === 'real'
      ? `y = ${terms([[A, expX(-p)], [B, expX(-q)]])}`
      : kind === 'repeated'
        ? `y = (${terms([[A, ''], [B, 'x']])})${expX(-p)}`
        : `y = ${expX(-p)}(${waveOf(A, B, q)})`;
  const pairs: [number, number][] = [[B, A], [A, -B], [-A, B], [y0, v0], [-A, -B]];
  const others = pairs
    .filter(([a, b]) => (a !== A || b !== B) && a !== 0 && b !== 0)
    .map(([a, b]) => secondParticularTex(de, a, b));
  return [others[0], ...(symmetric ? [] : [flipped]), ...others.slice(1)];
}

function ivpSteps(de: SecondIvp): SolutionStep[] {
  const { kind, p, q, A, B } = de;
  const [y0, v0] = atZero(de, A, B);
  const derivative =
    kind === 'real'
      ? `y' = ${terms([[p, `A${expX(p)}`], [q, `B${expX(q)}`]])}`
      : kind === 'repeated'
        ? `y' = (${terms([[p, 'A'], [1, 'B'], [p, 'Bx']])})${expX(p)}`
        : undefined;
  const solve =
    kind === 'real'
      ? `Take $${p}$ times the first equation from the second: $${q - p}B = ${v0 - p * y0}$.`
      : kind === 'repeated'
        ? `$A = ${y0}$ straight away, so $B = ${v0} ${signed(-p * A)}$.`
        : p === 0
          ? `$A = ${y0}$ straight away, and $${coef(q)}B = ${v0}$.`
          : `$A = ${y0}$ straight away, so $${coef(q)}B = ${v0} ${signed(-p * A)}$.`;
  return [
    { text: 'The general solution:', tex: secondGeneralTex(de) },
    derivative
      ? { text: 'Differentiate it.', tex: derivative }
      : { text: "Differentiate it by the product rule. At $x = 0$, $e^{0} = 1$, $\\cos 0 = 1$ and $\\sin 0 = 0$, so $y'(0) = \\alpha A + \\beta B$." },
    { text: `Put in $x = 0$ with $y(0) = ${y0}$ and $y'(0) = ${v0}$.`, tex: stackedConditions(de) },
    { text: solve, tex: `A = ${A}, \\; B = ${B}` },
    // Inline, so a wide wave can wrap: displayed, it runs a few pixels off a phone.
    { text: `So the particular solution is $${secondParticularTex(de, A, B)}$.` },
  ];
}

/** A or B from the two conditions, typed. */
const deIvpConstant: Generator<SecondIvp & { shown: boolean }> = {
  id: 'de-ivp-constant',
  sample: (rng, difficulty) => ({ ...sampleIvp(rng, difficulty), shown: difficulty < 2 }),
  render: (de): Slide => ({
    kind: 'expression',
    prompt: de.shown
        ? [
            prose('The general solution of'),
            display(secondTex(de)),
            prose(`is $${secondGeneralTex(de)}$. Find $${de.letter}$ when $${conditionsTex(de)}$.`),
          ]
        : [
            prose(`Solve this equation with $${conditionsTex(de)}$.`),
            display(secondTex(de)),
            prose(`Writing the general solution as ${genericForm(de)}, find $${de.letter}$.`),
          ],
    lead: `${de.letter} =`,
    keypad: [],
    answer: `${de.letter === 'A' ? de.A : de.B}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (de) => [...toStandard(de), ...ivpSteps(de)],
};

/** The roots, then A, then B, as a tree. */
const deIvpTree: Generator<SecondIvp> = {
  id: 'de-ivp-solve-tree',
  sample: sampleIvp,
  render: (de): Slide => {
    const { kind, p, q, A, B } = de;
    const [y0, v0] = atZero(de, A, B);
    const shared = { kind: 'tree' as const, expression: secondTex(de) };
    const lead = prose(`Solve with $${conditionsTex(de)}$, writing the general solution as ${genericForm(de)}.`);
    if (kind === 'real') {
      const answer = [p, q, A, B];
      return {
        ...shared,
        prompt: [lead, prose('Fill in $p$ and $q$, then $A$, then $B$.')],
        nodes: [
          { id: 'p', from: [] },
          { id: 'q', from: [] },
          { id: 'A', from: ['p', 'q'] },
          { id: 'B', from: ['A'] },
        ],
        bank: treeBank(answer, [-p, -q, y0, v0, -A, -B]),
        answer: answer.map(String),
      };
    }
    if (kind === 'repeated') {
      const answer = [p, A, B];
      return {
        ...shared,
        prompt: [lead, prose('Fill in $p$ and $A$, then $B$.')],
        nodes: [
          { id: 'p', from: [] },
          { id: 'A', from: [] },
          { id: 'B', from: ['p', 'A'] },
        ],
        bank: treeBank(answer, [-p, v0, -B, v0 + p * A]),
        answer: answer.map(String),
      };
    }
    const answer = [p, q, A, B];
    return {
      ...shared,
      prompt: [lead, prose('Fill in $\\alpha$ and $\\beta$, then $A$, then $B$.')],
      nodes: [
        { id: 'alpha', from: [] },
        { id: 'beta', from: [] },
        { id: 'A', from: [] },
        { id: 'B', from: ['alpha', 'beta', 'A'] },
      ],
      bank: treeBank(answer, [-p, v0, -B, v0 - p * A]),
      answer: answer.map(String),
    };
  },
  solution: (de) => [...secondSteps(de), ...ivpSteps(de).slice(1)],
};

/** Conditions in, A and B out, particular solution written, one line at a time. */
const deIvpSteps: Generator<SecondIvp> = {
  id: 'de-ivp-conditions-steps',
  sample: (rng, difficulty) => {
    const de = sampleIvp(rng, difficulty);
    return { ...de, written: 'standard', scale: 1 };
  },
  render: (de): Slide => {
    const { A, B } = de;
    const [y0, v0] = atZero(de, A, B);
    const equations = conditionEquations(de);
    const constants = `A = ${A}, \\; B = ${B}`;
    const particular = secondParticularTex(de, A, B);
    return {
      kind: 'steps',
      prompt: [
        prose(
          `This general solution solves $${secondTex(de)}$. Tap the comma to put the conditions in, then tap the line to solve for $A$ and $B$, then again for the particular solution.`,
        ),
      ],
      start: [secondGeneralTex(de), ',', conditionsTex(de)],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: equations,
          bank: stepBank(equations, conditionEquations(de, 'chain'), conditionEquations(de, 'swap'), conditionEquations(de, 'sign')),
        },
        {
          span: [0, 1],
          operator: 0,
          value: constants,
          bank: stepBank(
            constants,
            ...(A !== B ? [`A = ${B}, \\; B = ${A}`] : []),
            `A = ${-A}, \\; B = ${-B}`,
            `A = ${y0}, \\; B = ${v0}`,
            `A = ${A}, \\; B = ${-B}`,
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(particular, ...firstDistinct(particular, ivpSlips(de), 3)),
        },
      ],
    };
  },
  solution: (de) => ivpSteps(de).slice(1),
};

/** Which particular solution meets the equation and both conditions. */
const deIvpFit: Generator<SecondIvp> = {
  id: 'de-ivp-fit',
  sample: sampleIvp,
  render: (de): Slide => {
    const answer = secondParticularTex(de, de.A, de.B);
    return choiceSlide(
      [prose(`Which is the solution of this equation with $${conditionsTex(de)}$?`), display(secondTex(de))],
      [{ label: answer, tex: true, correct: true }, ...firstDistinct(answer, ivpSlips(de), 3).map((label) => ({ label, tex: true }))],
      secondSalt(de, de.A, de.B),
    );
  },
  solution: (de) => [
    ...toStandard(de),
    ...ivpSteps(de),
    { text: 'Each of the others either misses a condition or, put back in, fails the equation.' },
  ],
};

/* ============================================================
 * Level 5: non-homogeneous second order
 * ============================================================ */

/**
 * A particular integral, drawn before its equation: f(x) is what it gives when
 * put into `y'' + by' + cy`, so every coefficient of f(x) is whole.
 *
 * - `poly`: coefficients low power first, `[ν, μ, λ]` for λx^2 + μx + ν.
 * - `exp`: λx^n e^{kx}, where n is how many times k is a root of the
 *   auxiliary equation: 0 unless the question is about resonance.
 * - `trig`: x^n(λ cos ωx + μ sin ωx), with n = 1 only for `y'' + ω^2y`, the
 *   one equation whose complementary function holds cos ωx and sin ωx.
 */
export type Particular =
  | { type: 'poly'; c: number[] }
  | { type: 'exp'; k: number; lambda: number; n: number }
  | { type: 'trig'; w: number; lambda: number; mu: number; n: number };

export interface NonHomDe extends SecondDe {
  pi: Particular;
}

/** f(x): polynomial coefficients low power first, an exponential's coefficient, or a cosine's and a sine's. */
export type Forcing =
  | { type: 'poly'; c: number[] }
  | { type: 'exp'; k: number; F: number }
  | { type: 'trig'; w: number; cos: number; sin: number };

/** k^2 + bk + c, the auxiliary polynomial at k. */
const auxAt = (de: SecondDe, k: number): number => k * k + secondB(de) * k + secondC(de);

/**
 * y'' + by' + cy with y the particular integral. `second` false drops the
 * y'' term, which is the slip of forgetting it; it is only ever asked of a
 * particular integral with n = 0.
 */
export function forcingOf(pi: Particular, b: number, c: number, second = true): Forcing {
  const s = second ? 1 : 0;
  if (pi.type === 'poly') {
    const [n0 = 0, n1 = 0, n2 = 0] = pi.c;
    return { type: 'poly', c: [c * n0 + b * n1 + 2 * s * n2, c * n1 + 2 * b * n2, c * n2].slice(0, pi.c.length) };
  }
  if (pi.type === 'exp') {
    const { k, lambda, n } = pi;
    // With k a root n times, only the n-th derivative of the auxiliary polynomial survives.
    const factor = n === 0 ? s * k * k + b * k + c : n === 1 ? 2 * k + b : 2;
    return { type: 'exp', k, F: lambda * factor };
  }
  const { w, lambda, mu, n } = pi;
  if (n === 1) return { type: 'trig', w, cos: 2 * w * mu, sin: -2 * w * lambda };
  const K = c - s * w * w;
  const M = b * w;
  return { type: 'trig', w, cos: K * lambda + M * mu, sin: K * mu - M * lambda };
}

/** The right side of the equation, built from its particular integral. */
export const forcing = (de: NonHomDe): Forcing => forcingOf(de.pi, secondB(de), secondC(de));

/** A polynomial as the learner reads it, from coefficients low power first. */
const polyOf = (c: number[]): string => terms([[c[2] ?? 0, 'x^{2}'], [c[1] ?? 0, 'x'], [c[0] ?? 0, '']]);

/** `x`, `x^{2}`, or nothing, in front of a particular integral's function. */
const xPower = (n: number): string => (n === 0 ? '' : n === 1 ? 'x' : `x^{${n}}`);

export function forcingTex(f: Forcing): string {
  if (f.type === 'poly') return polyOf(f.c);
  if (f.type === 'exp') return terms([[f.F, expX(f.k)]]);
  return terms([[f.cos, trig('cos', f.w)], [f.sin, trig('sin', f.w)]]);
}

export function forcingAnswer(f: Forcing): string {
  if (f.type === 'poly') return f.c.map((c, j) => (j === 0 ? `(${c})` : `(${c})*x^${j}`)).join(' + ');
  if (f.type === 'exp') return `(${f.F})*e^((${f.k})*x)`;
  return `(${f.cos})*cos((${f.w})*x) + (${f.sin})*sin((${f.w})*x)`;
}

export function piTex(pi: Particular): string {
  if (pi.type === 'poly') return polyOf(pi.c);
  const x = xPower(pi.n);
  if (pi.type === 'exp') return terms([[pi.lambda, `${x}${expX(pi.k)}`]]);
  return terms([[pi.lambda, `${x}${trig('cos', pi.w)}`], [pi.mu, `${x}${trig('sin', pi.w)}`]]);
}

/** The particular integral for mathjs. */
export function piAnswer(pi: Particular): string {
  if (pi.type === 'poly') return pi.c.map((c, j) => (j === 0 ? `(${c})` : `(${c})*x^${j}`)).join(' + ');
  const x = pi.n === 0 ? '' : `x^${pi.n}*`;
  if (pi.type === 'exp') return `(${pi.lambda})*${x}e^((${pi.k})*x)`;
  return `${x}((${pi.lambda})*cos((${pi.w})*x) + (${pi.mu})*sin((${pi.w})*x))`;
}

/** The trial function, with its unknown coefficients as Greek letters. */
export function trialTex(pi: Particular): string {
  if (pi.type === 'poly') return ['\\lambda', '\\lambda x + \\mu', '\\lambda x^{2} + \\mu x + \\nu'][pi.c.length - 1];
  const x = xPower(pi.n);
  if (pi.type === 'exp') return `\\lambda ${x}${expX(pi.k)}`;
  return `\\lambda ${x}${trig('cos', pi.w)} + \\mu ${x}${trig('sin', pi.w)}`;
}

/** The particular integral's value and gradient at x = 0. */
export function piAtZero(pi: Particular): [number, number] {
  if (pi.type === 'poly') return [pi.c[0], pi.c[1] ?? 0];
  if (pi.type === 'exp') return pi.n === 0 ? [pi.lambda, pi.lambda * pi.k] : pi.n === 1 ? [0, pi.lambda] : [0, 0];
  return pi.n === 0 ? [pi.lambda, pi.w * pi.mu] : [0, pi.lambda];
}

/** The same particular integral times s, for the slip of a sign or a factor. */
function scaledPi(pi: Particular, s: number): Particular {
  if (pi.type === 'poly') return { ...pi, c: pi.c.map((c) => s * c) };
  if (pi.type === 'exp') return { ...pi, lambda: s * pi.lambda };
  return { ...pi, lambda: s * pi.lambda, mu: s * pi.mu };
}

/** Its derivative, the same kind of function again. Only for n = 0. */
function derivativeOf(pi: Particular): Particular {
  if (pi.type === 'poly') {
    const c = pi.c.slice(1).map((value, j) => value * (j + 1));
    return { type: 'poly', c: c.length === 0 ? [0] : c };
  }
  if (pi.type === 'exp') return { ...pi, lambda: pi.lambda * pi.k };
  return { ...pi, lambda: pi.w * pi.mu, mu: -pi.w * pi.lambda };
}

/**
 * Slips in differentiating g, the particular integral or its derivative: a
 * sign, a chain-rule factor left off or doubled, a power not brought down.
 */
function derivativeSlips(g: Particular): Particular[] {
  const right = derivativeOf(g);
  if (g.type === 'poly' && right.type === 'poly') {
    if (g.c.length === 1) return [{ type: 'poly', c: [g.c[0]] }, { type: 'poly', c: [-g.c[0]] }, { type: 'poly', c: [0, g.c[0]] }];
    return [
      scaledPi(right, -1),
      { type: 'poly', c: [0, ...right.c] },
      { type: 'poly', c: g.c.slice(1) },
      { type: 'poly', c: [g.c[0], ...right.c.slice(1)] },
    ];
  }
  if (g.type === 'exp' && right.type === 'exp') {
    return [scaledPi(right, -1), g, { ...right, k: -g.k }, scaledPi(right, 2)];
  }
  if (g.type === 'trig' && right.type === 'trig') {
    return [
      scaledPi(right, -1),
      { ...g, lambda: g.mu, mu: -g.lambda },
      { ...right, mu: -right.mu },
      scaledPi(right, 2),
    ];
  }
  return [];
}

/** `+ 3x - 1` or `- 2e^{x}`, for appending a whole expression to a solution. */
const plusTex = (tex: string): string => (tex.startsWith('-') ? `- ${tex.slice(1)}` : `+ ${tex}`);

/**
 * The equation, with its right side. Written with primes, as the level's
 * teaching is: two stacked fractions and a cosine and a sine on the right run
 * off a phone.
 */
export function nonHomTex(de: NonHomDe): string {
  return `${terms([[1, "y''"], [secondB(de), "y'"], [secondC(de), 'y']])} = ${forcingTex(forcing(de))}`;
}

/**
 * A rough width in characters, exponents counted small and the spacing round
 * an operator counted as a character. Measured across every draw of this
 * level in Chromium, a display runs about 13 px a character plus 25.
 */
function roughWidth(tex: string): number {
  const exponents = [...tex.matchAll(/\^\{([^}]*)\}/g)].reduce((sum, m) => sum + m[1].length * 0.7, 0);
  const plain = tex.replace(/\^\{[^}]*\}/g, '').replace(/\\(cos|sin) /g, '$1').replace(/'/g, '');
  const operators = (plain.match(/ [-+=] /g) ?? []).length;
  return plain.replace(/ /g, '').length + exponents + operators * 1.2;
}

/**
 * The equation as it is displayed: broken after the left side when one line
 * would run past 300 px, which a cosine and a sine on the right, or a
 * quadratic, will do on a phone.
 */
export function shownTex(de: NonHomDe): string {
  const line = nonHomTex(de);
  if (roughWidth(line) <= 20) return line;
  const [lhs, rhs] = line.split(' = ');
  return `\\begin{aligned} &${lhs} \\\\ &= ${rhs} \\end{aligned}`;
}

/** The left side in primes, for a line that puts a function in. */
const lhsPrimes = (de: SecondDe): string => terms([[1, "y''"], [secondB(de), "y'"], [secondC(de), 'y']]);

/** The general solution: complementary function plus particular integral. */
export const fullGeneralTex = (de: NonHomDe): string => `${secondGeneralTex(de)} ${plusTex(piTex(de.pi))}`;

/** A particular solution, with A and B numbers. */
export const fullParticularTex = (de: NonHomDe, A: number, B: number): string =>
  `${secondParticularTex(de, A, B)} ${plusTex(piTex(de.pi))}`;

/** y(0) and y'(0) of the whole solution. */
export function fullAtZero(de: NonHomDe, A: number, B: number): [number, number] {
  const [y0, v0] = atZero(de, A, B);
  const [p0, p1] = piAtZero(de.pi);
  return [y0 + p0, v0 + p1];
}

const piNumbers = (pi: Particular): number[] =>
  pi.type === 'poly' ? [1, ...pi.c] : pi.type === 'exp' ? [2, pi.k, pi.lambda, pi.n] : [3, pi.w, pi.lambda, pi.mu, pi.n];

const nhSalt = (de: NonHomDe, ...more: number[]): number => secondSalt(de, ...piNumbers(de.pi), ...more);

/** The kinds of root an equation is drawn with: mostly two real roots at difficulty 1. */
const baseKinds = (difficulty: number): SecondDe['kind'][] =>
  difficulty >= 2 ? ['real', 'repeated', 'complex'] : ['real', 'real', 'real', 'repeated'];

/** The left side, with smaller roots than level 4 so that f(x) stays readable. */
function sampleBase(rng: Rng, difficulty: number, kinds: SecondDe['kind'][]): SecondDe {
  const hard = difficulty >= 2;
  const kind = rng.pick(kinds);
  const shown = { written: 'standard' as const, scale: 1 };
  if (kind === 'repeated') {
    const p = nonzero(rng, hard ? 3 : 2);
    return { kind, p, q: p, ...shown };
  }
  if (kind === 'complex') return { kind, p: rng.int(-2, 2), q: rng.int(1, hard ? 3 : 2), ...shown };
  for (;;) {
    const one = nonzero(rng, hard ? 4 : 3);
    const two = nonzero(rng, hard ? 4 : 3);
    if (one !== two) return { kind, p: Math.min(one, two), q: Math.max(one, two), ...shown };
  }
}

type PiType = 'const' | 'linear' | 'quad' | 'exp' | 'trig' | 'resExp' | 'resTrig';

/** A particular integral of the type asked for that suits this left side, or nothing if it cannot. */
function samplePi(rng: Rng, de: SecondDe, type: PiType, hard: boolean): Particular | undefined {
  const b = secondB(de);
  const c = secondC(de);
  switch (type) {
    case 'const':
      return { type: 'poly', c: [nonzero(rng, hard ? 5 : 4)] };
    case 'linear':
      // With no y' term a linear trial has nothing to compare but two divisions.
      return b === 0 ? undefined : { type: 'poly', c: [rng.int(-4, 4), nonzero(rng, 3)] };
    case 'quad':
      return { type: 'poly', c: [rng.int(-4, 4), rng.int(-4, 4), nonzero(rng, hard ? 3 : 2)] };
    case 'exp': {
      const k = nonzero(rng, 3);
      // No y' term leaves too few slips to offer; k = α would let e^{kx} stand in for the complementary function's factor.
      if (b === 0 || auxAt(de, k) === 0 || (de.kind === 'complex' && k === de.p)) return undefined;
      return { type: 'exp', k, lambda: nonzero(rng, hard ? 4 : 3), n: 0 };
    }
    case 'trig': {
      const w = rng.int(1, hard ? 3 : 2);
      const K = c - w * w;
      const M = b * w;
      // With K or M zero a single cosine or sine would do, and the lesson is that it will not.
      if (K === 0 || M === 0) return undefined;
      const form = rng.pick(['cos', 'sin', 'both'] as const);
      if (form === 'both') return { type: 'trig', w, lambda: nonzero(rng, 3), mu: nonzero(rng, 3), n: 0 };
      // Built so that f(x) has the one term: λ and μ in the ratio that cancels the other.
      const g = gcd(K, M);
      const s = rng.sign();
      const [lambda, mu] = form === 'cos' ? [(s * K) / g, (s * M) / g] : [(-s * M) / g, (s * K) / g];
      return { type: 'trig', w, lambda, mu, n: 0 };
    }
    case 'resExp': {
      if (de.kind === 'complex') return undefined;
      const lambda = nonzero(rng, hard ? 4 : 3);
      if (de.kind === 'repeated') return { type: 'exp', k: de.p, lambda, n: 2 };
      return { type: 'exp', k: rng.chance(0.5) ? de.p : de.q, lambda, n: 1 };
    }
    case 'resTrig': {
      if (de.kind !== 'complex' || de.p !== 0) return undefined;
      const form = rng.pick(['cos', 'sin', 'both'] as const);
      return {
        type: 'trig',
        w: de.q,
        lambda: form === 'cos' ? 0 : nonzero(rng, 3),
        mu: form === 'sin' ? 0 : nonzero(rng, 3),
        n: 1,
      };
    }
  }
}

const piCoefficients = (pi: Particular): number[] => (pi.type === 'poly' ? pi.c : pi.type === 'exp' ? [pi.lambda] : [pi.lambda, pi.mu]);

const forcingCoefficients = (f: Forcing): number[] => (f.type === 'poly' ? f.c : f.type === 'exp' ? [f.F] : [f.cos, f.sin]);

/** Roots that are not these, for a walk's first step: the signs flipped, or doubled. Never the roots themselves. */
function rootSlips(de: SecondDe): SecondDe[] {
  const { kind, p, q } = de;
  if (kind === 'real') return [{ ...de, p: -q, q: -p }, { ...de, p: 2 * p, q: 2 * q }].filter((slip) => slip.p !== p || slip.q !== q);
  if (kind === 'repeated') return [{ ...de, p: -p, q: -p }, { ...de, p: 2 * p, q: 2 * p }];
  return [{ ...de, q: 2 * q }, p === 0 ? { ...de, p: q } : { ...de, p: -p }];
}

function sampleNonHom(rng: Rng, difficulty: number, types: PiType[], kinds = baseKinds(difficulty)): NonHomDe {
  const hard = difficulty >= 2;
  for (;;) {
    const type = rng.pick(types);
    const base: SecondDe =
      type === 'resTrig'
        ? { kind: 'complex', p: 0, q: rng.int(1, 3), written: 'standard', scale: 1 }
        : sampleBase(rng, difficulty, type === 'resExp' ? kinds.filter((kind) => kind !== 'complex') : kinds);
    const pi = samplePi(rng, base, type, hard);
    if (!pi) continue;
    const de = { ...base, pi };
    if (piCoefficients(pi).every((v) => Math.abs(v) <= 8) && forcingCoefficients(forcing(de)).every((v) => Math.abs(v) <= 60)) return de;
  }
}

/** Putting a particular integral in: its derivatives, then the left side. Only for n = 0. */
function substituteSteps(de: NonHomDe): SolutionStep[] {
  const first = derivativeOf(de.pi);
  const second = derivativeOf(first);
  return [
    { text: 'Differentiate twice.', tex: chain(`y' &= ${piTex(first)}`, `y'' &= ${piTex(second)}`) },
    {
      text: `Put $y$, $y'$ and $y''$ into the left side and collect terms. It comes to $${forcingTex(forcing(de))}$, the right side.`,
      tex: shownTex(de),
    },
  ];
}

/* ---------- Level 5, lesson 1: complementary function and particular integral ---------- */

/** A constant right side: the particular integral is the constant that balances it. */
const deNhConstant: Generator<NonHomDe & { hint: boolean }> = {
  id: 'de-nh-constant',
  sample: (rng, difficulty) => ({ ...sampleNonHom(rng, difficulty, ['const']), hint: difficulty < 2 }),
  render: (de): Slide => ({
    kind: 'expression',
    prompt: [
      prose(de.hint ? 'Find a particular integral of' : 'Find the constant particular integral of'),
      display(shownTex(de)),
      ...(de.hint ? [prose('The right side is a constant, so try a constant, $y = \\lambda$.')] : []),
    ],
    lead: 'y =',
    keypad: [],
    answer: piAnswer(de.pi),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (de) => {
    const c = secondC(de);
    const F = forcingTex(forcing(de));
    return [
      { text: "Try $y = \\lambda$. Then $y' = 0$ and $y'' = 0$, so only the $y$ term is left.", tex: `${terms([[c, '\\lambda']])} = ${F}` },
      { text: `Divide by $${c}$.`, tex: `y = ${piTex(de.pi)}` },
    ];
  },
};

/** Check a particular integral by putting it in: y', then y'', then the left side. */
const deNhCheckSteps: Generator<NonHomDe> = {
  id: 'de-nh-check-steps',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, difficulty >= 2 ? ['quad', 'trig'] : ['exp', 'linear']),
  render: (de): Slide => {
    const b = secondB(de);
    const c = secondC(de);
    const first = derivativeOf(de.pi);
    const second = derivativeOf(first);
    const lhs = lhsPrimes(de);
    const firstLine = `y' = ${piTex(first)}`;
    const secondLine = `y'' = ${piTex(second)}`;
    const last = `${lhs} = ${forcingTex(forcing(de))}`;
    const lineSlips = (prefix: string, g: Particular, right: string): string[] =>
      firstDistinct(right, derivativeSlips(g).map((slip) => `${prefix} = ${piTex(slip)}`), 3);
    const lastSlips = [forcingOf(de.pi, -b, c), forcingOf(de.pi, b, c, false), scaledForcing(forcing(de), -1), forcingOf(de.pi, b, -c)].map(
      (f) => `${lhs} = ${forcingTex(f)}`,
    );
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Show that $y = ${piTex(de.pi)}$ is a particular integral of the equation below: tap the line for $y'$, again for $y''$, then again to put all three in.`,
        ),
        display(shownTex(de)),
      ],
      start: [`y = ${piTex(de.pi)}`],
      reductions: [
        { span: [0, 1], operator: 0, value: firstLine, bank: stepBank(firstLine, ...lineSlips("y'", de.pi, firstLine)) },
        { span: [0, 1], operator: 0, value: secondLine, bank: stepBank(secondLine, ...lineSlips("y''", first, secondLine)) },
        { span: [0, 1], operator: 0, value: last, bank: stepBank(last, ...firstDistinct(last, lastSlips, 3)) },
      ],
    };
  },
  solution: substituteSteps,
};

/** f(x) times s. */
function scaledForcing(f: Forcing, s: number): Forcing {
  if (f.type === 'poly') return { ...f, c: f.c.map((c) => s * c) };
  if (f.type === 'exp') return { ...f, F: s * f.F };
  return { ...f, cos: s * f.cos, sin: s * f.sin };
}

/** One solution of the equation with 0 on the right: e^{px}, xe^{px}, or e^{αx}cos βx. */
function cfTermTex({ kind, p, q }: SecondDe): string {
  if (kind === 'real') return expX(p);
  if (kind === 'repeated') return `x${expX(p)}`;
  return p === 0 ? trig('cos', q) : `${expX(p)}${trig('cos', q)}`;
}

/** Which of four functions is a particular integral. */
const deNhWhichPi: Generator<NonHomDe> = {
  id: 'de-nh-which-pi',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, difficulty >= 2 ? ['quad', 'trig', 'exp'] : ['exp', 'linear', 'const']),
  render: (de): Slide => {
    const answer = `y = ${piTex(de.pi)}`;
    const slips = [
      `y = ${forcingTex(forcing(de))}`,
      `y = ${cfTermTex(de)}`,
      `y = ${piTex(scaledPi(de.pi, -1))}`,
      `y = ${piTex(scaledPi(de.pi, 2))}`,
    ];
    return choiceSlide(
      [prose('Which of these is a particular integral of'), display(shownTex(de))],
      [{ label: answer, tex: true, correct: true }, ...firstDistinct(answer, slips, 3).map((label) => ({ label, tex: true }))],
      nhSalt(de),
    );
  },
  solution: (de) => [
    ...substituteSteps(de),
    { text: `A function from the complementary function, such as $${cfTermTex(de)}$, gives $0$ instead; the others give a multiple of the right side, or something else.` },
  ],
};

/** A walk: the auxiliary equation, the complementary function, then the general solution with the particular integral given. */
const deNhGeneralFlow: Generator<NonHomDe> = {
  id: 'de-nh-general-flow',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, difficulty >= 2 ? ['quad', 'trig', 'exp'] : ['exp', 'linear']),
  render: (de): Slide => {
    const b = secondB(de);
    const c = secondC(de);
    const salt = nhSalt(de);
    const aux = `$${auxTex(de)}$`;
    const cf = `$${secondGeneralTex(de)}$`;
    const general = `$${fullGeneralTex(de)}$`;
    const F = forcingTex(forcing(de));
    return {
      kind: 'flow',
      prompt: [prose(`$y = ${piTex(de.pi)}$ is a particular integral of this equation. Find its general solution.`)],
      subject: shownTex(de),
      steps: [
        {
          id: 'aux',
          ask: 'The auxiliary equation, from the left side, is',
          branches: branchesOf(
            { label: aux, to: 'cf' },
            [
              { label: `$${auxOf(-b, c)}$`, outcome: "$y'$ becomes $m$ with its coefficient, sign and all." },
              { label: `$${auxOf(b, -c)}$`, outcome: '$y$ becomes $1$, keeping its coefficient and sign.' },
            ],
            salt,
          ),
        },
        {
          id: 'cf',
          ask: 'Its roots give the complementary function',
          branches: branchesOf(
            { label: cf, to: 'general' },
            firstDistinct(secondGeneralTex(de), solutionSlips(de), 2).map((slip) => ({
              label: `$${slip}$`,
              outcome: `The roots of $${auxTex(de)}$ are $${rootsTex(de)}$, which that does not use.`,
            })),
            salt >>> 4,
          ),
        },
        {
          id: 'general',
          ask: 'So the general solution is',
          branches: branchesOf(
            { label: general, outcome: 'The complementary function carries the two constants, and the particular integral makes the right side.' },
            [
              { label: cf, outcome: 'That solves the equation with $0$ on the right. Add the particular integral.' },
              ...(F !== piTex(de.pi)
                ? [{ label: `$${secondGeneralTex(de)} ${plusTex(F)}$`, outcome: 'That adds the right side itself. Add the particular integral instead.' }]
                : []),
              { label: `$${secondGeneralTex(de)} ${plusTex(piTex(scaledPi(de.pi, -1)))}$`, outcome: 'The particular integral goes in with its own sign.' },
            ],
            salt >>> 8,
          ),
        },
      ],
      answer: [aux, cf, general],
    };
  },
  solution: (de) => [
    { text: 'With $0$ on the right, the auxiliary equation is', tex: auxTex(de) },
    { text: `Its roots are $${rootsTex(de)}$, so the complementary function is`, tex: secondGeneralTex(de) },
    // Inline, so a long solution can wrap: displayed, it runs off a phone.
    { text: `Add the particular integral: $${fullGeneralTex(de)}$.` },
  ],
};

/* ---------- Level 5, lesson 2: a polynomial right side ---------- */

const POLY_TRIALS = ['\\lambda', '\\lambda x + \\mu', '\\lambda x^{2} + \\mu x + \\nu'];

/** Trials of the wrong shape: a power missing, or the wrong degree. None can balance f(x). */
const POLY_SLIPS = [
  ['\\lambda x', '\\lambda x^{2}', `\\lambda ${expX(1)}`],
  ['\\lambda x', '\\lambda', '\\lambda x^{2}'],
  ['\\lambda x^{2}', '\\lambda x^{2} + \\mu', '\\lambda x + \\mu'],
];

/** Which trial function, from the degree of f(x). */
const deNhPolyTrial: Generator<NonHomDe> = {
  id: 'de-nh-poly-trial',
  sample: (rng, difficulty) => {
    for (;;) {
      const de = sampleNonHom(rng, difficulty, difficulty >= 2 ? ['quad', 'quad', 'linear'] : ['linear', 'linear', 'const']);
      // A zero coefficient would let a shorter trial work, and the point is that it cannot.
      if (de.pi.type === 'poly' && de.pi.c.every((c) => c !== 0)) return de;
    }
  },
  render: (de): Slide => {
    const degree = de.pi.type === 'poly' ? de.pi.c.length - 1 : 0;
    return choiceSlide(
      [prose('Which trial function finds a particular integral of'), display(shownTex(de))],
      [
        { label: `y = ${POLY_TRIALS[degree]}`, tex: true, correct: true },
        ...POLY_SLIPS[degree].map((trial) => ({ label: `y = ${trial}`, tex: true })),
      ],
      nhSalt(de),
    );
  },
  solution: (de) => {
    const degree = de.pi.type === 'poly' ? de.pi.c.length - 1 : 0;
    return [
      {
        text:
          degree === 0
            ? 'The right side is a constant, so try a constant: its derivatives are $0$ and only the $y$ term is left.'
            : `The right side has degree $${degree}$, so try a polynomial of degree $${degree}$ with every power below it too: $y'$ and $y''$ bring the lower powers in.`,
        tex: `y = ${POLY_TRIALS[degree]}`,
      },
      { text: 'Here it gives', tex: `y = ${piTex(de.pi)}` },
    ];
  },
};

/** The left side after the polynomial trial goes in, collected by power. `bSign` and `second` make its slips. */
function collectedPoly(degree: number, b: number, c: number, opts: { bSign?: number; second?: boolean } = {}): string {
  const bb = (opts.bSign ?? 1) * b;
  const s = opts.second === false ? 0 : 2;
  const parts: [[number, string][], string][] =
    degree === 1
      ? [
          [[[c, '\\lambda']], 'x'],
          [[[bb, '\\lambda'], [c, '\\mu']], ''],
        ]
      : [
          [[[c, '\\lambda']], 'x^{2}'],
          [[[2 * bb, '\\lambda'], [c, '\\mu']], 'x'],
          [[[s, '\\lambda'], [bb, '\\mu'], [c, '\\nu']], ''],
        ];
  const shown = parts.map(([combo, power]) => {
    const kept = combo.filter(([k]) => k !== 0);
    const inner = terms(kept);
    if (power === '') return kept.length > 1 ? `(${inner})` : inner;
    return kept.length > 1 ? `(${inner})${power}` : `${inner} ${power}`;
  });
  return shown.map((part, idx) => (idx === 0 ? part : plusTex(part))).join(' ');
}

/** Compare coefficients, top power first, as a tree. */
const deNhPolyTree: Generator<NonHomDe> = {
  id: 'de-nh-poly-tree',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, difficulty >= 2 ? ['quad'] : ['linear']),
  render: (de): Slide => {
    const c = secondC(de);
    const coeffs = de.pi.type === 'poly' ? de.pi.c : [];
    const top = forcing(de);
    const F = top.type === 'poly' ? top.c : [];
    const answer = [...coeffs].reverse();
    const quad = coeffs.length === 3;
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Try $y = ${trialTex(de.pi)}$ for a particular integral. Put it in and compare coefficients, highest power of $x$ first.`,
        ),
        prose(quad ? 'Fill in $\\lambda$, then $\\mu$, then $\\nu$.' : 'Fill in $\\lambda$, then $\\mu$.'),
      ],
      expression: shownTex(de),
      nodes: quad
        ? [
            { id: 'lambda', from: [] },
            { id: 'mu', from: ['lambda'] },
            { id: 'nu', from: ['lambda', 'mu'] },
          ]
        : [
            { id: 'lambda', from: [] },
            { id: 'mu', from: ['lambda'] },
          ],
      bank: treeBank(answer, [F[F.length - 1], -answer[0], ...answer.slice(1).map((v) => -v), c * answer[1]]),
      answer: answer.map(String),
    };
  },
  solution: (de) => {
    const b = secondB(de);
    const c = secondC(de);
    const degree = de.pi.type === 'poly' ? de.pi.c.length - 1 : 0;
    const coeffs = de.pi.type === 'poly' ? de.pi.c : [];
    const f = forcing(de);
    const F = f.type === 'poly' ? f.c : [];
    // The collected line split at its powers: x^2, then x, then the number.
    const combos: [number, string][][] =
      degree === 1
        ? [[[c, '\\lambda']], [[b, '\\lambda'], [c, '\\mu']]]
        : [[[c, '\\lambda']], [[2 * b, '\\lambda'], [c, '\\mu']], [[2, '\\lambda'], [b, '\\mu'], [c, '\\nu']]];
    return [
      {
        text: `Put $y = ${trialTex(de.pi)}$ in, collect the powers of $x$, and compare each with the right side, top power first.`,
        tex: chain(...combos.map((combo, idx) => `${terms(combo.filter(([k]) => k !== 0))} &= ${F[degree - idx]}`)),
      },
      { text: 'Each line gives one letter, using the ones found above it.', tex: lettersTex([...coeffs].reverse()) },
      { text: 'So the particular integral is', tex: `y = ${piTex(de.pi)}` },
    ];
  },
};

/** The coefficients line: `\lambda = 2, \; \mu = -1`. */
const lettersTex = (values: number[]): string =>
  values.map((value, idx) => `${['\\lambda', '\\mu', '\\nu'][idx]} = ${value}`).join(', \\; ');

/** Trial in, coefficients compared, particular integral written, one line at a time. */
const deNhPolySteps: Generator<NonHomDe> = {
  id: 'de-nh-poly-steps',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, difficulty >= 2 ? ['quad'] : ['linear']),
  render: (de): Slide => {
    const b = secondB(de);
    const c = secondC(de);
    const coeffs = de.pi.type === 'poly' ? de.pi.c : [];
    const degree = coeffs.length - 1;
    const f = forcing(de);
    const F = f.type === 'poly' ? f.c : [];
    const right = forcingTex(f);
    const collected = `${collectedPoly(degree, b, c)} = ${right}`;
    const values = [...coeffs].reverse();
    const found = lettersTex(values);
    const particular = `y = ${piTex(de.pi)}`;
    const valueSlips: number[][] = [
      values.map((v) => -v),
      [...F].reverse(),
      [values[0], ...values.slice(1).map((v) => -v)],
      values.length > 1 && values[0] !== values[1] ? [values[1], values[0], ...values.slice(2)] : [],
    ].filter((slip) => slip.length === values.length);
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Try $y = ${trialTex(de.pi)}$: tap the line to put it in and collect the powers of $x$, again to compare coefficients, and again for the particular integral of`,
        ),
        display(shownTex(de)),
      ],
      start: [`y = ${trialTex(de.pi)}`],
      reductions: [
        {
          span: [0, 1],
          operator: 0,
          value: collected,
          bank: stepBank(
            collected,
            ...firstDistinct(
              collected,
              [
                collectedPoly(degree, b, c, { bSign: -1 }),
                collectedPoly(degree, b, c, { second: false }),
                collectedPoly(degree, b, -c),
                collectedPoly(degree, b, 1),
              ].map((lhs) => `${lhs} = ${right}`),
              3,
            ),
          ),
        },
        { span: [0, 1], operator: 0, value: found, bank: stepBank(found, ...firstDistinct(found, valueSlips.map(lettersTex), 3)) },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(
            particular,
            ...firstDistinct(particular, [...valueSlips.map((slip) => `y = ${polyOf([...slip].reverse())}`), `y = ${right}`], 3),
          ),
        },
      ],
    };
  },
  solution: (de) => deNhPolyTree.solution(de),
};

/** The keypad for a typed particular integral: powers, e, sine and cosine, and no constant. */
const PI_KEYS: KeypadKey[] = X_INTEGRAL_KEYS.filter((key) => key.insert !== 'C');

/**
 * The polynomial particular integral, typed. It declares no `source` or
 * `integrand`: it is neither a derivative nor an integral of anything shown,
 * so `differentialEquations.test.ts` puts it back into its equation instead.
 */
const deNhPolyPi: Generator<NonHomDe & { hint: boolean }> = {
  id: 'de-nh-poly-pi',
  sample: (rng, difficulty) =>
    difficulty >= 2
      ? { ...sampleNonHom(rng, difficulty, ['quad', 'quad', 'linear']), hint: false }
      : { ...sampleNonHom(rng, difficulty, ['linear']), hint: true },
  render: (de): Slide => ({
    kind: 'expression',
    prompt: de.hint
      ? [prose('Find the particular integral of'), display(shownTex(de)), prose(`Try $y = ${trialTex(de.pi)}$.`)]
      : [prose('Find the polynomial particular integral of'), display(shownTex(de))],
    lead: 'y =',
    keypad: PI_KEYS,
    answer: piAnswer(de.pi),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (de) => deNhPolyTree.solution(de),
};

/* ---------- Level 5, lesson 3: an exponential right side ---------- */

/** The number λe^{kx} comes to on the left, divided by λe^{kx}, written out: `(4 + 6 + 2)`. */
const auxAtWorking = (de: SecondDe, k: number): string =>
  `${k * k} ${signed(secondB(de) * k)} ${signed(secondC(de))} = ${auxAt(de, k)}`;

function nhExpSolution(de: NonHomDe): SolutionStep[] {
  if (de.pi.type !== 'exp') return [];
  const { k, lambda } = de.pi;
  const F = forcing(de);
  return [
    { text: `With $y = \\lambda ${expX(k)}$, $y' = ${terms([[k, `\\lambda ${expX(k)}`]])}$ and $y'' = ${terms([[k * k, `\\lambda ${expX(k)}`]])}$.` },
    {
      text: `Put them in: every term carries $\\lambda ${expX(k)}$, and the numbers in front add to $${auxAtWorking(de, k)}$.`,
      tex: `${terms([[auxAt(de, k), `\\lambda ${expX(k)}`]])} = ${forcingTex(F)}`,
    },
    { text: `So $\\lambda = ${lambda}$, and the particular integral is`, tex: `y = ${piTex(de.pi)}` },
  ];
}

/** λ for the trial λe^{kx}, typed. */
const deNhExpValue: Generator<NonHomDe> = {
  id: 'de-nh-exp-value',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, ['exp']),
  render: (de): Slide => ({
    kind: 'expression',
    prompt: [prose(`Find $\\lambda$ so that $y = ${trialTex(de.pi)}$ is a particular integral of`), display(shownTex(de))],
    lead: '\\lambda =',
    keypad: [],
    answer: `${de.pi.type === 'exp' ? de.pi.lambda : 0}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: nhExpSolution,
};

/** Trial in, λ found, particular integral written, one line at a time. */
const deNhExpSteps: Generator<NonHomDe> = {
  id: 'de-nh-exp-steps',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, ['exp']),
  render: (de): Slide => {
    const { k, lambda } = de.pi.type === 'exp' ? de.pi : { k: 1, lambda: 1 };
    const b = secondB(de);
    const c = secondC(de);
    const f = forcing(de);
    const F = f.type === 'exp' ? f.F : 0;
    const right = forcingTex(f);
    const E = expX(k);
    const line = (factor: number) => `${terms([[factor, `\\lambda ${E}`]])} = ${right}`;
    const substituted = line(auxAt(de, k));
    const factorSlips = [k * k - b * k + c, b * k + c, k + b * k + c, k * k + b * k, -(k * k) + b * k + c].filter((v) => v !== 0);
    const found = `\\lambda = ${lambda}`;
    const particular = `y = ${piTex(de.pi)}`;
    return {
      kind: 'steps',
      prompt: [
        prose(`Try $y = \\lambda ${E}$: tap the line to put it in, again for $\\lambda$, and again for the particular integral of`),
        display(shownTex(de)),
      ],
      start: [`y = \\lambda ${E}`],
      reductions: [
        { span: [0, 1], operator: 0, value: substituted, bank: stepBank(substituted, ...firstDistinct(substituted, factorSlips.map(line), 3)) },
        {
          span: [0, 1],
          operator: 0,
          value: found,
          bank: stepBank(found, ...firstDistinct(found, [F, -lambda, F * auxAt(de, k), F - auxAt(de, k)].map((v) => `\\lambda = ${v}`), 3)),
        },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(
            particular,
            ...firstDistinct(
              particular,
              [terms([[F, E]]), terms([[lambda, expX(-k)]]), terms([[lambda, `x${E}`]]), terms([[-lambda, E]])].map((tex) => `y = ${tex}`),
              3,
            ),
          ),
        },
      ],
    };
  },
  solution: nhExpSolution,
};

/** The general solution with an exponential particular integral, as tiles. */
const deNhExpGeneral: Generator<NonHomDe> = {
  id: 'de-nh-exp-general',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, ['exp']),
  render: (de): Slide => {
    const { kind, p, q } = de;
    const { k, lambda } = de.pi.type === 'exp' ? de.pi : { k: 1, lambda: 1 };
    const f = forcing(de);
    const F = f.type === 'exp' ? f.F : 0;
    const pi = signedTerm(lambda, expX(k));
    const piSlips = [signedTerm(F, expX(k)), signedTerm(-lambda, expX(k)), signedTerm(lambda, `x${expX(k)}`)];
    const prompt = (form: string) => [prose(`Find the general solution, writing the complementary function as ${form}.`), display(shownTex(de))];
    if (kind === 'real') {
      const answer = [expX(p), expX(q), pi];
      return {
        kind: 'tiles',
        prompt: prompt('$Ae^{px} + Be^{qx}$ with $p < q$'),
        template: 'y = A{0} + B{1} {2}',
        bank: tokenBank(answer, [expX(-p), expX(-q), expX(k), ...piSlips], 4),
        answer,
      };
    }
    if (kind === 'repeated') {
      const answer = [expX(p), pi];
      return {
        kind: 'tiles',
        prompt: prompt('$(A + Bx)e^{px}$'),
        template: 'y = (A + Bx){0} {1}',
        bank: tokenBank(answer, [expX(-p), expX(k), ...piSlips], 4),
        answer,
      };
    }
    if (p === 0) {
      const answer = [trig('cos', q), trig('sin', q), pi];
      return {
        kind: 'tiles',
        prompt: prompt('$A\\cos \\beta x + B\\sin \\beta x$'),
        template: 'y = A{0} + B{1} {2}',
        bank: tokenBank(answer, [trig('cos', 2 * q), expX(q), ...piSlips], 4),
        answer,
      };
    }
    const answer = [expX(p), trig('cos', q), trig('sin', q), pi];
    return {
      kind: 'tiles',
      prompt: prompt('$e^{\\alpha x}(A\\cos \\beta x + B\\sin \\beta x)$'),
      template: 'y = {0}(A{1} + B{2}) {3}',
      bank: tokenBank(answer, [expX(-p), trig('cos', 2 * q), ...piSlips], 4),
      answer,
    };
  },
  solution: (de) => [
    { text: 'The complementary function, from the auxiliary equation:', tex: auxTex(de) },
    { text: `Its roots are $${rootsTex(de)}$, so`, tex: secondGeneralTex(de) },
    ...nhExpSolution(de).slice(1),
    { text: `The general solution is the two added: $${fullGeneralTex(de)}$.` },
  ],
};

/** A walk: the roots, the trial that follows from them, then λ. */
const deNhExpFlow: Generator<NonHomDe> = {
  id: 'de-nh-exp-flow',
  sample: (rng, difficulty) => sampleNonHom(rng, difficulty, ['exp']),
  render: (de): Slide => {
    const { k, lambda } = de.pi.type === 'exp' ? de.pi : { k: 1, lambda: 1 };
    const f = forcing(de);
    const F = f.type === 'exp' ? f.F : 0;
    const salt = nhSalt(de);
    const E = expX(k);
    const roots = `$${rootsTex(de)}$`;
    const trial = `$y = \\lambda ${E}$`;
    const value = `$${lambda}$`;
    return {
      kind: 'flow',
      prompt: [prose('Find a particular integral of this equation.')],
      subject: shownTex(de),
      steps: [
        {
          id: 'roots',
          ask: `The auxiliary equation, $${auxTex(de)}$, has roots`,
          branches: branchesOf(
            { label: roots, to: 'trial' },
            rootSlips(de).map((slip) => ({ label: `$${rootsTex(slip)}$`, outcome: 'Put one back in: it does not make the auxiliary equation zero.' })),
            salt,
          ),
        },
        {
          id: 'trial',
          ask: 'So for a particular integral, try',
          branches: branchesOf(
            { label: trial, to: 'value' },
            [
              { label: `$y = \\lambda x${E}$`, outcome: `The extra $x$ is only needed when $${k}$ is a root, and it is not.` },
              { label: '$y = \\lambda$', outcome: 'A constant only balances a constant right side.' },
            ],
            salt >>> 4,
          ),
        },
        {
          id: 'value',
          ask: `Put it in: $\\lambda$ is`,
          branches: branchesOf(
            { label: value, outcome: `So $y = ${piTex(de.pi)}$.` },
            [
              { label: `$${F}$`, outcome: `That is the right side's coefficient. Divide it by $k^2 + bk + c = ${auxAt(de, k)}$ first.` },
              { label: `$${-lambda}$`, outcome: 'Check the sign: the left side has to come to the right side exactly.' },
            ],
            salt >>> 8,
          ),
        },
      ],
      answer: [roots, trial, value],
    };
  },
  solution: (de) => [
    { text: 'The auxiliary equation:', tex: auxTex(de) },
    { text: `Its roots are $${rootsTex(de)}$, and $${de.pi.type === 'exp' ? de.pi.k : 0}$ is not one of them.` },
    ...nhExpSolution(de),
  ],
};

/* ---------- Level 5, lesson 4: a trigonometric right side ---------- */

/** K = c - ω^2 and M = bω: what cos and sin pick up when the trial goes in. */
function trigKM(de: NonHomDe): { K: number; M: number; w: number; lambda: number; mu: number } {
  const { w, lambda, mu } = de.pi.type === 'trig' ? de.pi : { w: 1, lambda: 0, mu: 0 };
  return { K: secondC(de) - w * w, M: secondB(de) * w, w, lambda, mu };
}

/** The two equations comparing cosines and sines, on one line or stacked for a worked solution. */
function trigEquations(K: number, M: number, f: Forcing, stacked = false): string {
  if (f.type !== 'trig') return '';
  const [first, second] = [`${terms([[K, '\\lambda'], [M, '\\mu']])}`, `${terms([[-M, '\\lambda'], [K, '\\mu']])}`];
  return stacked ? chain(`${first} &= ${f.cos}`, `${second} &= ${f.sin}`) : `${first} = ${f.cos}, \\; ${second} = ${f.sin}`;
}

function trigSolution(de: NonHomDe): SolutionStep[] {
  const { K, M, w, lambda, mu } = trigKM(de);
  const f = forcing(de);
  return [
    {
      text: `With $y = ${trialTex(de.pi)}$, $y'' = ${terms([[-w * w, 'y']])}$, so $y''$ and $${terms([[secondC(de), 'y']])}$ together give $${terms([[K, 'y']])}$. The $${terms([[secondB(de), "y'"]])}$ term turns cosines into sines and back.`,
    },
    {
      text: `Compare the cosines and the sines, with $K = c - \\omega^2 = ${K}$ and $M = b\\omega = ${M}$:`,
      tex: trigEquations(K, M, f, true),
    },
    { text: `Solve them together: $${lettersTex([lambda, mu])}$, so`, tex: `y = ${piTex(de.pi)}` },
  ];
}

const sampleTrig = (rng: Rng, difficulty: number): NonHomDe => sampleNonHom(rng, difficulty, ['trig']);

/** Which trial function: both a cosine and a sine, even when f(x) has one of them. */
const deNhTrigTrial: Generator<NonHomDe> = {
  id: 'de-nh-trig-trial',
  sample: sampleTrig,
  render: (de): Slide => {
    const { w } = trigKM(de);
    const f = forcing(de);
    const cosOnly = `y = \\lambda ${trig('cos', w)}`;
    const sinOnly = `y = \\lambda ${trig('sin', w)}`;
    const singles = f.type === 'trig' && f.cos === 0 ? [sinOnly, cosOnly] : [cosOnly, sinOnly];
    return choiceSlide(
      [prose('Which trial function finds a particular integral of'), display(shownTex(de))],
      [
        { label: `y = ${trialTex(de.pi)}`, tex: true, correct: true },
        ...singles.map((label) => ({ label, tex: true })),
        { label: `y = \\lambda x${trig('cos', w)} + \\mu x${trig('sin', w)}`, tex: true },
      ].slice(0, 4),
      nhSalt(de),
    );
  },
  solution: (de) => [
    {
      text: `Differentiating a cosine gives a sine, so the $y'$ term brings a sine in even when the right side has only a cosine, and the other way round. Try both:`,
      tex: `y = ${trialTex(de.pi)}`,
    },
    { text: 'The extra $x$ is only for a cosine and sine already in the complementary function, and these are not.' },
  ],
};

/** K and M, then λ and μ, as a tree. */
const deNhTrigTree: Generator<NonHomDe> = {
  id: 'de-nh-trig-tree',
  sample: sampleTrig,
  render: (de): Slide => {
    const { K, M, w, lambda, mu } = trigKM(de);
    const answer = [K, M, lambda, mu];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Try $y = ${trialTex(de.pi)}$. Put in, it gives $(K\\lambda + M\\mu)${trig('cos', w)} + (K\\mu - M\\lambda)${trig('sin', w)}$, where $K = c - \\omega^2$ and $M = b\\omega$.`,
        ),
        prose('Fill in $K$ and $M$, then $\\lambda$ and $\\mu$.'),
      ],
      expression: shownTex(de),
      nodes: [
        { id: 'K', from: [] },
        { id: 'M', from: [] },
        { id: 'lambda', from: ['K', 'M'] },
        { id: 'mu', from: ['K', 'M'] },
      ],
      bank: treeBank(answer, [secondC(de) + w * w, -M, -lambda, -mu, secondB(de)]),
      answer: answer.map(String),
    };
  },
  solution: trigSolution,
};

/** Trial in, two equations, λ and μ, particular integral, one line at a time. */
const deNhTrigSteps: Generator<NonHomDe> = {
  id: 'de-nh-trig-steps',
  sample: sampleTrig,
  render: (de): Slide => {
    const { K, M, w, lambda, mu } = trigKM(de);
    const f = forcing(de);
    const c = secondC(de);
    const equations = trigEquations(K, M, f);
    const found = lettersTex([lambda, mu]);
    const particular = `y = ${piTex(de.pi)}`;
    const pairs: [number, number][] = [[mu, lambda], [-lambda, -mu], [lambda, -mu], [-lambda, mu]];
    const pairSlips = pairs.filter(([l, m]) => l !== lambda || m !== mu);
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Try $y = ${trialTex(de.pi)}$: tap the line to put it in and compare the cosines and the sines, again to solve for $\\lambda$ and $\\mu$, and again for the particular integral of`,
        ),
        display(shownTex(de)),
      ],
      start: [`y = ${trialTex(de.pi)}`],
      reductions: [
        {
          span: [0, 1],
          operator: 0,
          value: equations,
          bank: stepBank(
            equations,
            ...firstDistinct(equations, [trigEquations(K, -M, f), trigEquations(c + w * w, M, f), trigEquations(c, M, f), trigEquations(M, K, f)], 3),
          ),
        },
        { span: [0, 1], operator: 0, value: found, bank: stepBank(found, ...firstDistinct(found, pairSlips.map(lettersTex), 3)) },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(
            particular,
            ...firstDistinct(
              particular,
              [...pairSlips.map(([l, m]) => `y = ${piTex({ type: 'trig', w, lambda: l, mu: m, n: 0 })}`), `y = ${forcingTex(f)}`],
              3,
            ),
          ),
        },
      ],
    };
  },
  solution: trigSolution,
};

/** λ or μ, typed. */
const deNhTrigPart: Generator<NonHomDe & { letter: 'lambda' | 'mu' }> = {
  id: 'de-nh-trig-part',
  sample: (rng, difficulty) => ({ ...sampleTrig(rng, difficulty), letter: rng.chance(0.5) ? 'lambda' : 'mu' }),
  render: (de): Slide => {
    const { lambda, mu } = trigKM(de);
    return {
      kind: 'expression',
      prompt: [
        prose(`This equation has a particular integral $y = ${trialTex(de.pi)}$. Find $\\${de.letter}$.`),
        display(shownTex(de)),
      ],
      lead: `\\${de.letter} =`,
      keypad: [],
      answer: `${de.letter === 'lambda' ? lambda : mu}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: trigSolution,
};

/* ---------- Level 5, lesson 5: resonance and initial conditions ---------- */

/** The trial with its x, and a wrong one for each kind of resonance. */
function resonantTrials(de: NonHomDe): { right: string; plain: string; wrong: string; plainWhy: string; wrongWhy: string } {
  const { pi } = de;
  if (pi.type === 'exp') {
    const E = expX(pi.k);
    const plain = `\\lambda ${E}`;
    return pi.n === 2
      ? {
          right: `\\lambda x^{2}${E}`,
          plain,
          wrong: `\\lambda x${E}`,
          plainWhy: `$${E}$ is in the complementary function, so it gives $0$ on the left.`,
          wrongWhy: `The root repeats, so $x${E}$ is in the complementary function too: go up to $x^2$.`,
        }
      : {
          right: `\\lambda x${E}`,
          plain,
          wrong: `\\lambda x^{2}${E}`,
          plainWhy: `$${E}$ is in the complementary function, so it gives $0$ on the left.`,
          wrongWhy: `$${pi.k}$ is a root only once, so one factor of $x$ is enough.`,
        };
  }
  const w = pi.type === 'trig' ? pi.w : 1;
  return {
    right: `\\lambda x${trig('cos', w)} + \\mu x${trig('sin', w)}`,
    plain: `\\lambda ${trig('cos', w)} + \\mu ${trig('sin', w)}`,
    wrong: `\\lambda x^{2}${trig('cos', w)} + \\mu x^{2}${trig('sin', w)}`,
    plainWhy: `Both are in the complementary function, so they give $0$ on the left.`,
    wrongWhy: 'The roots do not repeat, so one factor of $x$ is enough.',
  };
}

/** The particular integral a resonant trial gives, worked. */
function resonantSolution(de: NonHomDe): SolutionStep[] {
  const { right } = resonantTrials(de);
  const { pi } = de;
  const F = forcingTex(forcing(de));
  const put =
    pi.type === 'exp'
      ? pi.n === 1
        ? `Put in, the $x${expX(pi.k)}$ terms cancel, leaving $${terms([[2 * pi.k + secondB(de), `\\lambda ${expX(pi.k)}`]])} = ${F}$.`
        : `Put in, the $x^2$ and $x$ terms cancel, leaving $2\\lambda ${expX(pi.k)} = ${F}$.`
      : pi.type === 'trig'
        ? `Put in, the $x$ terms cancel, leaving $${terms([[2 * pi.w, `\\mu ${trig('cos', pi.w)}`], [-2 * pi.w, `\\lambda ${trig('sin', pi.w)}`]])} = ${F}$.`
        : '';
  return [
    { text: `The right side is already part of the complementary function $${secondGeneralTex(de)}$, so multiply the usual trial by $x$${pi.type === 'exp' && pi.n === 2 ? ' twice, since the root repeats' : ''}:`, tex: `y = ${right}` },
    { text: put },
    { text: 'So the particular integral is', tex: `y = ${piTex(pi)}` },
  ];
}

const sampleResonant = (rng: Rng, difficulty: number): NonHomDe =>
  difficulty >= 2 ? sampleNonHom(rng, difficulty, ['resExp', 'resExp', 'resTrig']) : sampleNonHom(rng, difficulty, ['resExp'], ['real']);

/** A walk: the roots, the trial with its x, then the particular integral. */
const deNhResFlow: Generator<NonHomDe> = {
  id: 'de-nh-res-flow',
  sample: sampleResonant,
  render: (de): Slide => {
    const salt = nhSalt(de);
    const { right, plain, wrong, plainWhy, wrongWhy } = resonantTrials(de);
    const roots = `$${rootsTex(de)}$`;
    const trial = `$y = ${right}$`;
    const answer = `$y = ${piTex(de.pi)}$`;
    const { pi } = de;
    // The right side's coefficient left undivided, or the cosine's and sine's coefficients crossed over.
    const unhalved: Particular =
      pi.type === 'exp' ? { ...pi, lambda: forcingCoefficients(forcing(de))[0] } : pi.type === 'trig' ? { ...pi, lambda: pi.mu, mu: pi.lambda } : pi;
    return {
      kind: 'flow',
      prompt: [prose('Find a particular integral of this equation.')],
      subject: shownTex(de),
      steps: [
        {
          id: 'roots',
          ask: `The auxiliary equation, $${auxTex(de)}$, has roots`,
          branches: branchesOf(
            { label: roots, to: 'trial' },
            rootSlips(de).map((slip) => ({ label: `$${rootsTex(slip)}$`, outcome: 'Put one back in: it does not make the auxiliary equation zero.' })),
            salt,
          ),
        },
        {
          id: 'trial',
          ask: 'The right side is in the complementary function, so try',
          branches: branchesOf(
            { label: trial, to: 'pi' },
            [
              { label: `$y = ${plain}$`, outcome: plainWhy },
              { label: `$y = ${wrong}$`, outcome: wrongWhy },
            ],
            salt >>> 4,
          ),
        },
        {
          id: 'pi',
          ask: 'Put it in and compare: the particular integral is',
          branches: branchesOf(
            { label: answer, outcome: 'The $x$ terms cancel, and what is left matches the right side.' },
            [
              { label: `$y = ${piTex(unhalved)}$`, outcome: 'Put it back in: it does not give the right side. Compare the coefficients again.' },
              { label: `$y = ${piTex(scaledPi(pi, -1))}$`, outcome: 'Check the sign: that gives the right side with the opposite sign.' },
            ],
            salt >>> 8,
          ),
        },
      ],
      answer: [roots, trial, answer],
    };
  },
  solution: (de) => [{ text: 'The auxiliary equation:', tex: auxTex(de) }, { text: `Its roots are $${rootsTex(de)}$.` }, ...resonantSolution(de)],
};

/** The coefficient of a resonant trial, typed. For a cosine and sine, the one that is not zero. */
const deNhResValue: Generator<NonHomDe & { letter: 'lambda' | 'mu' }> = {
  id: 'de-nh-res-value',
  sample: (rng, difficulty) => {
    const de = sampleResonant(rng, difficulty);
    const { pi } = de;
    const letter = pi.type === 'trig' && (pi.lambda === 0 || (pi.mu !== 0 && rng.chance(0.5))) ? 'mu' : 'lambda';
    return { ...de, letter };
  },
  render: (de): Slide => {
    const { right } = resonantTrials(de);
    const { pi } = de;
    const value = pi.type === 'exp' ? pi.lambda : pi.type === 'trig' ? (de.letter === 'mu' ? pi.mu : pi.lambda) : 0;
    return {
      kind: 'expression',
      prompt: [
        prose(`The right side of this equation is already part of its complementary function. Try $y = ${right}$ and find $\\${de.letter}$.`),
        display(shownTex(de)),
      ],
      lead: `\\${de.letter} =`,
      keypad: [],
      answer: `${value}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: resonantSolution,
};

/** A particular integral and the constants of the whole solution, drawn first. */
export interface NonHomIvp extends NonHomDe {
  A: number;
  B: number;
}

function sampleNonHomIvp(rng: Rng, difficulty: number): NonHomIvp {
  const de = sampleNonHom(rng, difficulty, difficulty >= 2 ? ['exp', 'quad', 'trig', 'resExp'] : ['exp', 'linear', 'const']);
  return { ...de, A: nonzero(rng, difficulty >= 2 ? 4 : 3), B: nonzero(rng, difficulty >= 2 ? 4 : 3) };
}

export const fullConditionsTex = (de: NonHomIvp): string => {
  const [y0, v0] = fullAtZero(de, de.A, de.B);
  return `y(0) = ${y0}, \\; y'(0) = ${v0}`;
};

/** What the complementary function must give at 0 once the particular integral's share is taken off. */
function cfConditions(de: NonHomIvp): [number, number] {
  const [y0, v0] = fullAtZero(de, de.A, de.B);
  const [p0, p1] = piAtZero(de.pi);
  return [y0 - p0, v0 - p1];
}

function nonHomIvpSteps(de: NonHomIvp): SolutionStep[] {
  const { kind, p, q, A, B } = de;
  const [u, v] = cfConditions(de);
  const [p0, p1] = piAtZero(de.pi);
  const equations = chain(
    `${kind === 'real' ? 'A + B' : 'A'} &= ${u}`,
    `${kind === 'repeated' ? terms([[p, 'A'], [1, 'B']]) : terms([[p, 'A'], [q, 'B']])} &= ${v}`,
  );
  return [
    { text: `The general solution, with the particular integral, is $${fullGeneralTex(de)}$.` },
    {
      text: `At $x = 0$ the particular integral is $${p0}$ with gradient $${p1}$, so the complementary function has to make up the rest of $y(0)$ and $y'(0)$:`,
      tex: equations,
    },
    { text: 'Solve them.', tex: `A = ${A}, \\; B = ${B}` },
    { text: `So the solution is $${fullParticularTex(de, A, B)}$.` },
  ];
}

/** u and v, then A and B, as a tree. */
const deNhIvpTree: Generator<NonHomIvp> = {
  id: 'de-nh-ivp-tree',
  sample: sampleNonHomIvp,
  render: (de): Slide => {
    const { kind, p, q, A, B } = de;
    const [u, v] = cfConditions(de);
    const [y0, v0] = fullAtZero(de, A, B);
    const answer = [u, v, A, B];
    return {
      kind: 'tree',
      prompt: [
        prose(`This equation has general solution $${fullGeneralTex(de)}$. Solve it with $${fullConditionsTex(de)}$.`),
        prose(
          `First $u$ and $v$, the value and gradient the complementary function must have at $0$: $y(0)$ and $y'(0)$ less the particular integral's. Fill in $u$ and $v$, then $A$, then $B$.`,
        ),
      ],
      expression: shownTex(de),
      nodes: [
        { id: 'u', from: [] },
        { id: 'v', from: [] },
        { id: 'A', from: kind === 'real' ? ['u', 'v'] : ['u'] },
        { id: 'B', from: kind === 'real' ? ['u', 'A'] : ['v', 'A'] },
      ],
      bank: treeBank(answer, [y0, v0, -A, -B, kind === 'real' ? p + q : v - A]),
      answer: answer.map(String),
    };
  },
  solution: nonHomIvpSteps,
};

/** Which particular solution meets the equation and both conditions. */
const deNhIvpFit: Generator<NonHomIvp> = {
  id: 'de-nh-ivp-fit',
  sample: sampleNonHomIvp,
  render: (de): Slide => {
    const { kind, p, q, A, B } = de;
    const [y0, v0] = fullAtZero(de, A, B);
    const answer = fullParticularTex(de, A, B);
    // The constants found as if the right side were 0: the particular integral's share left in.
    const ignored: [number, number] | undefined =
      kind === 'real'
        ? (() => {
            const b0 = (v0 - p * y0) / (q - p);
            return Number.isInteger(b0) ? [y0 - b0, b0] : undefined;
          })()
        : kind === 'repeated'
          ? [y0, v0 - p * y0]
          : Number.isInteger((v0 - p * y0) / q)
            ? [y0, (v0 - p * y0) / q]
            : undefined;
    const pairs: [number, number][] = [...(ignored ? [ignored] : []), [B, A], [A, -B], [-A, B]];
    const slips = [
      `${secondParticularTex(de, A, B)}`,
      ...pairs.filter(([a, b]) => a !== 0 && b !== 0).map(([a, b]) => fullParticularTex(de, a, b)),
    ];
    return choiceSlide(
      [prose(`Which is the solution of this equation with $${fullConditionsTex(de)}$?`), display(shownTex(de))],
      [{ label: answer, tex: true, correct: true }, ...firstDistinct(answer, slips, 3).map((label) => ({ label, tex: true }))],
      nhSalt(de, A, B),
    );
  },
  solution: (de) => [
    ...nonHomIvpSteps(de),
    { text: 'Without the particular integral the equation is not met, and any other constants miss a condition.' },
  ],
};

/* ============================================================
 * Level 6: simple harmonic motion
 * ============================================================ */

/**
 * Level 4's equation read as motion: x is a displacement at time t, and the
 * equation is `ẍ + kẋ + ω²x = 0`. Each one is still a `SecondDe` built from its
 * roots. Simple harmonic motion is the pair ±ωi, held as p = 0 and q = ω, so
 * ω² is whole; damping draws negative roots first, so k = secondB and
 * ω² = secondC are whole too.
 *
 * Everything here is in t, so no slide declares `source`, `integrand` or
 * `limits`: the oracle in generators.test.ts differentiates in x. The course
 * test differentiates each quoted x(t) twice in t instead, and holds each
 * amplitude, period and greatest speed to samples of the motion.
 */

/** Level 4's `D1` and `D2`, in t: the dots are rates in time. */
const D1T = '\\dot{x}';
const D2T = '\\ddot{x}';

/** `\cos 3t` or `\sin t`. */
const trigT = (fn: 'cos' | 'sin', w: number): string => `\\${fn} ${coef(w)}t`;

/** A cos ωt + B sin ωt, with numbers or letters. */
const waveOfT = (A: number | string, B: number | string, w: number): string =>
  typeof A === 'number' && typeof B === 'number'
    ? terms([[A, trigT('cos', w)], [B, trigT('sin', w)]])
    : `${A}${trigT('cos', w)} + ${B}${trigT('sin', w)}`;

const expT = (k: number): string => `e^{${coef(k)}t}`;

/** An answer in t with sines and cosines. */
const T_TRIG_KEYS: KeypadKey[] = [spaced('t'), ...OPERATOR_KEYS, { insert: 'sin(' }, { insert: 'cos(' }];

/** The equation of motion as shown: `\ddot{x} + 9x = 0`, `\ddot{x} = -9x`, or every term times the scale. */
export function motionTex(de: SecondDe): string {
  const b = secondB(de);
  const c = secondC(de);
  if (de.written === 'moved') return `${D2T} = ${terms([[-b, D1T], [-c, 'x']])}`;
  const a = de.written === 'scaled' ? de.scale : 1;
  return `${terms([[a, D2T], [a * b, D1T], [a * c, 'x']])} = 0`;
}

/** The same with 1 in front of ẍ and every term on the left. */
const motionStandardTex = (de: SecondDe): string => `${terms([[1, D2T], [secondB(de), D1T], [secondC(de), 'x']])} = 0`;

function motionToStandard(de: SecondDe): SolutionStep[] {
  if (de.written === 'moved') return [{ text: 'Bring every term over to the left.', tex: motionStandardTex(de) }];
  if (de.written === 'scaled') return [{ text: `Divide every term by $${de.scale}$.`, tex: motionStandardTex(de) }];
  return [];
}

const shmOf = (w: number, written: SecondDe['written'] = 'standard', scale = 1): SecondDe => ({
  kind: 'complex',
  p: 0,
  q: w,
  written,
  scale,
});

function sampleShm(rng: Rng, difficulty: number, forms: SecondDe['written'][]): SecondDe {
  const hard = difficulty >= 2;
  const written = rng.pick(forms);
  return shmOf(rng.int(hard ? 2 : 1, hard ? 12 : 9), written, written === 'scaled' ? rng.int(2, 3) : 1);
}

const shmForms = (difficulty: number): SecondDe['written'][] => (difficulty >= 2 ? ['moved', 'scaled'] : ['standard', 'moved', 'scaled']);

/** A multiple of π as the learner reads it, in lowest terms: `\frac{\pi}{2}`, `2\pi`, `\frac{2\pi}{3}`. */
function piMultipleTex(top: number, bottom: number): string {
  const g = gcd(top, bottom);
  const p = top / g;
  const q = bottom / g;
  const head = p === 1 ? '\\pi' : `${p}\\pi`;
  return q === 1 ? head : `\\frac{${head}}{${q}}`;
}

/** The SHM solution steps: the auxiliary equation, its imaginary roots, and the wave. */
function shmSteps(de: SecondDe): SolutionStep[] {
  const w = de.q;
  return [
    ...motionToStandard(de),
    { text: "$\\ddot{x}$ becomes $m^2$ and $x$ becomes $1$.", tex: auxOf(0, w * w) },
    { text: `$m^2 = -${w * w}$, so the roots are imaginary: real part $0$ and $\\beta = ${w}$.`, tex: rootsTex(de) },
    { text: 'With real part $0$ there is no exponential, only a cosine and a sine.', tex: `x = ${waveOfT('A', 'B', w)}` },
  ];
}

/* ---------- Level 6, lesson 1: the equation of simple harmonic motion ---------- */

/** ω read off an equation of SHM, typed. */
const deShmOmega: Generator<SecondDe> = {
  id: 'de-shm-omega',
  sample: (rng, difficulty) => sampleShm(rng, difficulty, shmForms(difficulty)),
  render: (de): Slide => ({
    kind: 'expression',
    prompt: [
      prose('This equation is simple harmonic motion, $\\ddot{x} = -\\omega^2 x$. Find $\\omega$, taking $\\omega > 0$.'),
      display(motionTex(de)),
    ],
    lead: '\\omega =',
    keypad: [],
    answer: `${de.q}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (de) => [
    ...motionToStandard(de),
    { text: 'Compare it with $\\ddot{x} + \\omega^2 x = 0$.', tex: `\\omega^2 = ${de.q * de.q}` },
    { text: 'Take the positive square root.', tex: `\\omega = ${de.q}` },
  ],
};

/** A walk: the auxiliary equation, its roots ±ωi, and the general solution. */
const deShmAux: Generator<SecondDe> = {
  id: 'de-shm-aux',
  sample: (rng, difficulty) => sampleShm(rng, difficulty, shmForms(difficulty)),
  render: (de): Slide => {
    const w = de.q;
    const c = w * w;
    const salt = secondSalt(de);
    const aux = `$${auxOf(0, c)}$`;
    const roots = `$${rootsTex(de)}$`;
    const general = `$x = ${waveOfT('A', 'B', w)}$`;
    return {
      kind: 'flow',
      prompt: [prose('Find the general solution of this equation of motion.')],
      subject: motionTex(de),
      steps: [
        {
          id: 'aux',
          ask: `The auxiliary equation${de.written === 'scaled' ? `, divided by $${de.scale}$,` : ''} is`,
          branches: branchesOf(
            { label: aux, to: 'roots' },
            [
              {
                label: `$${auxOf(0, -c)}$`,
                outcome:
                  de.written === 'moved'
                    ? `Moving $${terms([[-c, 'x']])}$ across the $=$ changes its sign.`
                    : '$x$ becomes $1$, keeping its coefficient and its sign.',
              },
              { label: `$${terms([[1, 'm^2'], [c, 'm']])} = 0$`, outcome: '$m$ stands for one derivative. $x$ itself, with none, becomes $1$.' },
            ],
            salt,
          ),
        },
        {
          id: 'roots',
          ask: 'Its roots are',
          branches: branchesOf(
            { label: roots, to: 'general' },
            [
              { label: `$m = \\pm ${w}$`, outcome: `$m^2 = -${c}$ has no real root: a square is never negative.` },
              ...(c !== w ? [{ label: `$m = \\pm ${c}i$`, outcome: `Take the square root of $${c}$, which is $${w}$.` }] : []),
              { label: `$m = ${coef(w)}i$`, outcome: 'A quadratic has two roots, one with each sign.' },
            ],
            salt >>> 4,
          ),
        },
        {
          id: 'general',
          ask: 'So the general solution is',
          branches: branchesOf(
            { label: general, outcome: `Real part $0$ means no exponential: the motion swings between the same two points for ever.` },
            [
              { label: `$x = A${expT(w)} + B${expT(-w)}$`, outcome: `That is the solution for real roots $\\pm ${w}$, and these roots are imaginary.` },
              ...(c !== w ? [{ label: `$x = ${waveOfT('A', 'B', c)}$`, outcome: `The frequency is the imaginary part of the roots, $${w}$, not $${c}$.` }] : []),
              { label: `$x = ${expT(w)}(${waveOfT('A', 'B', w)})$`, outcome: 'The exponential carries the real part of the roots, which is $0$ here.' },
            ],
            salt >>> 8,
          ),
        },
      ],
      answer: [aux, roots, general],
    };
  },
  solution: shmSteps,
};

/** The general solution of SHM, as tiles. */
const deShmGeneral: Generator<SecondDe> = {
  id: 'de-shm-general',
  sample: (rng, difficulty) => sampleShm(rng, difficulty, shmForms(difficulty)),
  render: (de): Slide => {
    const w = de.q;
    const answer = [trigT('cos', w), trigT('sin', w)];
    return {
      kind: 'tiles',
      prompt: [prose('Find the general solution of this equation of motion.'), display(motionTex(de))],
      template: 'x = A{0} + B{1}',
      bank: tokenBank(answer, [trigT('cos', w * w), expT(w), trigT('sin', w * w), expT(-w), trigT('cos', 2 * w)], 3),
      answer,
      unordered: true,
    };
  },
  solution: shmSteps,
};

/** x = A cos ωt + B sin ωt with numbers: the amplitude-and-phase lessons draw these too. */
export interface WaveParams {
  w: number;
  A: number;
  B: number;
}

/** Differentiate a wave twice and find ẍ = -ω²x, one line at a time. */
const deShmVerifySteps: Generator<WaveParams> = {
  id: 'de-shm-verify-steps',
  sample: (rng, difficulty) => {
    if (difficulty >= 2) return { w: rng.int(2, 6), A: nonzero(rng, 4), B: nonzero(rng, 4) };
    const size = nonzero(rng, 5);
    return rng.chance(0.5) ? { w: rng.int(1, 6), A: size, B: 0 } : { w: rng.int(1, 6), A: 0, B: size };
  },
  render: ({ w, A, B }): Slide => {
    const c = w * w;
    const velocity = `${D1T} = ${waveOfT(w * B, -w * A, w)}`;
    const acceleration = `${D2T} = ${waveOfT(-c * A, -c * B, w)}`;
    const law = `${D2T} = ${terms([[-c, 'x']])}`;
    return {
      kind: 'steps',
      prompt: [
        prose(
          "Show that this is simple harmonic motion: tap the line for $\\dot{x}$, again for $\\ddot{x}$, then again to write $\\ddot{x}$ in terms of $x$.",
        ),
      ],
      start: [`x = ${waveOfT(A, B, w)}`],
      reductions: [
        {
          span: [0, 1],
          operator: 0,
          value: velocity,
          bank: stepBank(
            velocity,
            ...firstDistinct(
              velocity,
              [
                `${D1T} = ${waveOfT(-w * B, w * A, w)}`,
                `${D1T} = ${waveOfT(B, -A, w)}`,
                `${D1T} = ${waveOfT(w * A, w * B, w)}`,
                `${D1T} = ${waveOfT(c * B, -c * A, w)}`,
              ],
              3,
            ),
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: acceleration,
          bank: stepBank(
            acceleration,
            ...firstDistinct(
              acceleration,
              [
                `${D2T} = ${waveOfT(c * A, c * B, w)}`,
                `${D2T} = ${waveOfT(-w * A, -w * B, w)}`,
                `${D2T} = ${waveOfT(-c * B, -c * A, w)}`,
                `${D2T} = ${waveOfT(-2 * w * A, -2 * w * B, w)}`,
              ],
              3,
            ),
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: law,
          bank: stepBank(
            law,
            ...firstDistinct(
              law,
              [`${D2T} = ${terms([[c, 'x']])}`, `${D2T} = ${terms([[-w, 'x']])}`, `${D2T} = ${terms([[-2 * w, 'x']])}`, `${D2T} = ${terms([[-c * w, 'x']])}`],
              3,
            ),
          ),
        },
      ],
    };
  },
  solution: ({ w, A, B }) => {
    const c = w * w;
    return [
      { text: `Differentiate: the chain rule brings out $${w}$, and a cosine turns into minus a sine.`, tex: `${D1T} = ${waveOfT(w * B, -w * A, w)}` },
      { text: `Again, which brings out another $${w}$.`, tex: `${D2T} = ${waveOfT(-c * A, -c * B, w)}` },
      {
        text: `That is $-${c}$ times what $x$ was, so it is simple harmonic motion with $\\omega = ${w}$.`,
        tex: `${D2T} = ${terms([[-c, 'x']])}`,
      },
    ];
  },
};

/* ---------- Level 6, lesson 2: amplitude and period ---------- */

const PERIOD_SHOWN = ['equation', 'solution', 'reverse'] as const;

export interface PeriodParams extends SecondDe {
  shown: (typeof PERIOD_SHOWN)[number];
  /** For a shown solution: its amplitude, and whether it is a sine. */
  a: number;
  sine: boolean;
}

/** The period, 2π/ω, as a choice; or, the other way, the equation with that period. */
const deShmPeriod: Generator<PeriodParams> = {
  id: 'de-shm-period',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const shown = rng.pick<PeriodParams['shown']>(hard ? ['equation', 'solution', 'reverse'] : ['equation', 'solution']);
    const written = shown === 'equation' ? rng.pick<SecondDe['written']>(hard ? ['moved', 'scaled'] : ['standard', 'moved']) : 'standard';
    const w = rng.int(2, hard ? 12 : 8);
    return {
      ...shmOf(w, written, written === 'scaled' ? rng.int(2, 3) : 1),
      shown,
      a: shown === 'solution' ? rng.int(1, hard ? 9 : 6) : 1,
      sine: shown === 'solution' && rng.chance(0.5),
    };
  },
  render: (de): Slide => {
    const w = de.q;
    const salt = secondSalt(de, PERIOD_SHOWN.indexOf(de.shown), de.a, de.sine ? 1 : 0);
    if (de.shown === 'reverse') {
      const answer = `${D2T} = ${terms([[-w * w, 'x']])}`;
      const slips = [w, -w * w, 4 * w * w, 2 * w].map((s) => `${D2T} = ${terms([[-s, 'x']])}`);
      return choiceSlide(
        [prose(`A particle moves with simple harmonic motion of period $${piMultipleTex(2, w)}$. Which equation does it satisfy?`)],
        [{ label: answer, tex: true, correct: true }, ...firstDistinct(answer, slips, 3).map((label) => ({ label, tex: true }))],
        salt,
      );
    }
    const answer = piMultipleTex(2, w);
    const slips = [piMultipleTex(1, w), piMultipleTex(2 * w, 1), piMultipleTex(2, w * w), `\\frac{${w}}{2\\pi}`];
    const prompt =
      de.shown === 'equation'
        ? [prose('Find the period of the motion given by'), display(motionTex(de))]
        : [prose('A particle moves with'), display(`x = ${terms([[de.a, trigT(de.sine ? 'sin' : 'cos', w)]])}`), prose('Find the period of its motion.')];
    return choiceSlide(
      prompt,
      [{ label: answer, tex: true, correct: true }, ...firstDistinct(answer, slips, 3).map((label) => ({ label, tex: true }))],
      salt,
    );
  },
  solution: (de) => {
    const w = de.q;
    if (de.shown === 'reverse') {
      return [
        { text: 'The period is $\\frac{2\\pi}{\\omega}$, so $\\omega$ is $2\\pi$ divided by the period.', tex: `\\omega = 2\\pi \\div ${piMultipleTex(2, w)} = ${w}` },
        { text: 'Then $\\ddot{x} = -\\omega^2 x$:', tex: `${D2T} = ${terms([[-w * w, 'x']])}` },
      ];
    }
    const read =
      de.shown === 'equation'
        ? [...motionToStandard(de), { text: 'Compare it with $\\ddot{x} + \\omega^2 x = 0$.', tex: `\\omega^2 = ${w * w}, \\; \\omega = ${w}` }]
        : [{ text: `The number multiplying $t$ is $\\omega$.`, tex: `\\omega = ${w}` }];
    return [
      ...read,
      { text: 'One full swing takes $\\omega t$ through $2\\pi$:', tex: `T = \\frac{2\\pi}{\\omega} = \\frac{2\\pi}{${w}} = ${piMultipleTex(2, w)}` },
    ];
  },
};

const SPEED_ASKS = ['speed', 'amplitude', 'accel'] as const;

export interface SpeedParams extends SecondDe {
  ask: (typeof SPEED_ASKS)[number];
  /** The amplitude, positive. */
  a: number;
  /** Where it is released from rest: a or -a. */
  from: number;
}

/** A greatest speed aω, an amplitude, or a greatest acceleration aω², typed. */
const deShmSpeed: Generator<SpeedParams> = {
  id: 'de-shm-speed',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const written = rng.pick<SecondDe['written']>(hard ? ['moved', 'scaled'] : ['standard', 'moved']);
    const a = rng.int(hard ? 2 : 1, hard ? 9 : 6);
    return {
      ...shmOf(rng.int(2, hard ? 9 : 6), written, written === 'scaled' ? rng.int(2, 3) : 1),
      ask: rng.pick<SpeedParams['ask']>(hard ? ['speed', 'amplitude', 'accel'] : ['speed', 'amplitude']),
      a,
      from: hard && rng.chance(0.5) ? -a : a,
    };
  },
  render: (de): Slide => {
    const w = de.q;
    const { a, ask } = de;
    const start = ask === 'amplitude' ? `At $t = 0$ it passes through $x = 0$ with speed $${a * w}$.` : `It is released from rest at $x = ${de.from}$.`;
    const question = ask === 'speed' ? 'Find its greatest speed.' : ask === 'amplitude' ? 'Find the amplitude of its motion.' : 'Find the greatest size of its acceleration.';
    return {
      kind: 'expression',
      prompt: [prose('A particle moves with'), display(motionTex(de)), prose(`${start} ${question}`)],
      lead: ask === 'speed' ? 'v_{\\max} =' : ask === 'amplitude' ? 'a =' : '|\\ddot{x}|_{\\max} =',
      keypad: [],
      answer: `${ask === 'speed' ? a * w : ask === 'amplitude' ? a : a * w * w}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (de) => {
    const w = de.q;
    const { a, ask } = de;
    const omega = [...motionToStandard(de), { text: 'Compare it with $\\ddot{x} + \\omega^2 x = 0$.', tex: `\\omega = ${w}` }];
    if (ask === 'amplitude') {
      return [
        ...omega,
        { text: 'The speed is greatest at the centre, where it is $a\\omega$.', tex: `a \\times ${w} = ${a * w}` },
        { tex: `a = ${a}` },
      ];
    }
    const released = { text: `Released from rest, it swings out to $x = ${de.from}$ and back, so the amplitude is $${a}$.`, tex: `x = ${terms([[de.from, trigT('cos', w)]])}` };
    if (ask === 'speed') return [...omega, released, { text: 'The greatest speed, at the centre, is $a\\omega$.', tex: `v_{\\max} = ${a} \\times ${w} = ${a * w}` }];
    return [
      ...omega,
      released,
      { text: 'The acceleration is $-\\omega^2 x$, largest at the ends, where it is $a\\omega^2$.', tex: `${a} \\times ${w * w} = ${a * w * w}` },
    ];
  },
};

/** ω and the amplitude, then the greatest speed and acceleration, as a tree. */
const deShmMotionTree: Generator<SpeedParams> = {
  id: 'de-shm-motion-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const written = rng.pick<SecondDe['written']>(hard ? ['moved', 'scaled'] : ['standard', 'moved']);
    const a = rng.int(hard ? 2 : 1, hard ? 7 : 5);
    return {
      ...shmOf(rng.int(2, hard ? 8 : 6), written, written === 'scaled' ? rng.int(2, 3) : 1),
      ask: 'speed',
      a,
      from: hard && rng.chance(0.5) ? -a : a,
    };
  },
  render: (de): Slide => {
    const w = de.q;
    const { a } = de;
    const answer = [w, a, a * w, a * w * w];
    return {
      kind: 'tree',
      prompt: [
        prose(`A particle moving with this equation is released from rest at $x = ${de.from}$.`),
        prose('Fill in $\\omega$ and the amplitude $a$, then the greatest speed $a\\omega$ and the greatest size of the acceleration, $a\\omega^2$.'),
      ],
      expression: motionTex(de),
      nodes: [
        { id: 'omega', from: [] },
        { id: 'a', from: [] },
        { id: 'speed', from: ['omega', 'a'] },
        { id: 'accel', from: ['omega', 'a'] },
      ],
      bank: treeBank(answer, [w * w, -a, -a * w, a * w * w * w, 2 * a * w, a + w]),
      answer: answer.map(String),
    };
  },
  solution: (de) => {
    const w = de.q;
    const { a } = de;
    return [
      ...motionToStandard(de),
      { text: 'Compare it with $\\ddot{x} + \\omega^2 x = 0$.', tex: `\\omega = ${w}` },
      { text: `Released from rest at $x = ${de.from}$, it swings to the same distance the other side, so the amplitude is $${a}$.` },
      { text: 'The greatest speed is at the centre:', tex: `a\\omega = ${a} \\times ${w} = ${a * w}` },
      { text: 'The greatest acceleration is at the ends:', tex: `a\\omega^2 = ${a} \\times ${w * w} = ${a * w * w}` },
    ];
  },
};

const RELEASES = ['rest', 'centre', 'both'] as const;

export interface ReleaseParams extends SecondDe {
  how: (typeof RELEASES)[number];
  A: number;
  B: number;
}

export const releaseConditionsTex = ({ q, A, B }: ReleaseParams): string => `x(0) = ${A}, \\; \\dot{x}(0) = ${q * B}`;

/** A particular x(t) from how the motion starts, typed. */
const deShmRelease: Generator<ReleaseParams> = {
  id: 'de-shm-release',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const how = rng.pick<ReleaseParams['how']>(hard ? ['rest', 'centre', 'both', 'both'] : ['rest', 'centre']);
    const written = rng.pick<SecondDe['written']>(hard ? ['standard', 'moved', 'scaled'] : ['standard', 'moved']);
    const size = hard ? 6 : 5;
    return {
      ...shmOf(rng.int(2, hard ? 7 : 5), written, written === 'scaled' ? rng.int(2, 3) : 1),
      how,
      A: how === 'centre' ? 0 : hard ? nonzero(rng, size) : rng.int(1, size),
      B: how === 'rest' ? 0 : nonzero(rng, size - 2),
    };
  },
  render: (de): Slide => {
    const w = de.q;
    const words =
      de.how === 'rest'
        ? `It is released from rest at $x = ${de.A}$`
        : de.how === 'centre'
          ? `It passes through $x = 0$ at $t = 0$ with velocity $${w * de.B}$`
          : 'Its motion starts with';
    return {
      kind: 'expression',
      prompt: [prose('A particle moves with'), display(motionTex(de)), prose(`${words}${de.how === 'both' ? '' : ', so'} $${releaseConditionsTex(de)}$. Find $x$ in terms of $t$.`)],
      lead: 'x =',
      keypad: T_TRIG_KEYS,
      answer: `(${de.A})*cos((${w})*t) + (${de.B})*sin((${w})*t)`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (de) => {
    const w = de.q;
    return [
      ...motionToStandard(de),
      { text: 'Simple harmonic motion with', tex: `\\omega = ${w}` },
      { text: 'so its general solution is', tex: `x = ${waveOfT('A', 'B', w)}` },
      { text: `At $t = 0$ the cosine is $1$ and the sine $0$, so $x(0) = A$.`, tex: `A = ${de.A}` },
      { text: `Differentiating, $\\dot{x}(0) = ${w}B = ${w * de.B}$.`, tex: `B = ${de.B}` },
      { text: `So $x = ${waveOfT(de.A, de.B, w)}$.` },
    ];
  },
};

/* ---------- Level 6, lesson 3: phase ---------- */

/** Pythagorean triples, so that R is whole. The first five are the gentler ones. */
const PHASE_TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
  [7, 24, 25],
  [12, 16, 20],
  [20, 21, 29],
];

/** A cos ωt + B sin ωt with A > 0 and R = √(A² + B²) whole. */
export interface PhaseParams extends WaveParams {
  R: number;
  /** For the amplitude question: asked as R or as the amplitude. */
  words: boolean;
  /** For the tiles: the motion given by its start rather than written out. */
  started: boolean;
}

function samplePhase(rng: Rng, difficulty: number): PhaseParams {
  const hard = difficulty >= 2;
  const [p, q, R] = rng.pick(hard ? PHASE_TRIPLES : PHASE_TRIPLES.slice(0, 5));
  const [A, B] = rng.chance(0.5) ? [p, q] : [q, p];
  return {
    w: rng.int(hard ? 2 : 1, hard ? 6 : 4),
    A,
    B: hard && rng.chance(0.4) ? -B : B,
    R,
    words: rng.chance(0.5),
    started: hard && rng.chance(0.5),
  };
}

const phaseSalt = ({ w, A, B, R }: PhaseParams, ...more: number[]): number => mix(w, A, B, R, ...more);

/** `5\cos(2t - \alpha)`. */
const phaseTex = (R: number, w: number, sign = '-', fn = 'cos'): string => `${coef(R)}\\${fn}(${coef(w)}t ${sign} \\alpha)`;

function phaseSteps({ w, A, B, R }: PhaseParams): SolutionStep[] {
  return [
    {
      text: 'Expand the form asked for:',
      tex: chain('&R\\cos(\\omega t - \\alpha)', '&= R\\cos \\alpha \\cos \\omega t', '&\\quad + R\\sin \\alpha \\sin \\omega t'),
    },
    { text: 'Compare the cosines and the sines.', tex: `R\\cos \\alpha = ${A}, \\; R\\sin \\alpha = ${B}` },
    { text: 'Square and add, since $\\cos^2 \\alpha + \\sin^2 \\alpha = 1$:', tex: `R^2 = ${A * A} + ${B * B} = ${R * R}` },
    { text: 'Take the positive root.', tex: `R = ${R}` },
    { text: 'Divide the second by the first:', tex: `\\tan \\alpha = ${fracTex(B, A)}` },
    { text: `So $x = ${phaseTex(R, w)}$, with amplitude $${R}$.` },
  ];
}

/** R, the amplitude of a wave written as a cosine and a sine, typed. */
const deShmPhaseR: Generator<PhaseParams> = {
  id: 'de-shm-phase-r',
  sample: samplePhase,
  render: (params): Slide => {
    const { w, A, B, words } = params;
    const x = `x = ${waveOfT(A, B, w)}`;
    return {
      kind: 'expression',
      prompt: words
        ? [prose('A particle moves with'), display(x), prose('Find the amplitude of its motion.')]
        : [prose(`Write this motion in the form $R\\cos(\\omega t - \\alpha)$ with $R > 0$, and find $R$.`), display(x)],
      lead: words ? 'a =' : 'R =',
      keypad: [],
      answer: `${params.R}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => phaseSteps(params).slice(0, 4),
};

/** tan α, as a choice. */
const deShmPhaseTan: Generator<PhaseParams> = {
  id: 'de-shm-phase-tan',
  sample: samplePhase,
  render: (params): Slide => {
    const { w, A, B, R } = params;
    const answer = fracTex(B, A);
    const slips = [fracTex(A, B), fracTex(B, R), fracTex(-B, A), fracTex(A, R)];
    return choiceSlide(
      [
        prose(`This motion is written as $R\\cos(${coef(w)}t - \\alpha)$ with $R > 0$. Which is $\\tan \\alpha$?`),
        display(`x = ${waveOfT(A, B, w)}`),
      ],
      [{ label: answer, tex: true, correct: true }, ...firstDistinct(answer, slips, 3).map((label) => ({ label, tex: true }))],
      phaseSalt(params),
    );
  },
  solution: (params) => [...phaseSteps(params).slice(0, 2), phaseSteps(params)[4]],
};

/** Compare, find R and tan α, and write the single cosine, one line at a time. */
const deShmPhaseSteps: Generator<PhaseParams> = {
  id: 'de-shm-phase-steps',
  sample: samplePhase,
  render: (params): Slide => {
    const { w, A, B, R } = params;
    const compared = (a: number, b: number): string => `R\\cos \\alpha = ${a}, \\; R\\sin \\alpha = ${b}`;
    const found = (r: number, top: number, bottom: number): string => `R = ${r}, \\; \\tan \\alpha = ${fracTex(top, bottom)}`;
    const single = phaseTex(R, w);
    return {
      kind: 'steps',
      prompt: [
        prose(
          'Write this in the form $R\\cos(\\omega t - \\alpha)$: tap the line to compare it with $R\\cos \\alpha \\cos \\omega t + R\\sin \\alpha \\sin \\omega t$, again for $R$ and $\\tan \\alpha$, and again for the single cosine.',
        ),
      ],
      start: [waveOfT(A, B, w)],
      reductions: [
        { span: [0, 1], operator: 0, value: compared(A, B), bank: stepBank(compared(A, B), compared(B, A), compared(A, -B), compared(-A, B)) },
        {
          span: [0, 1],
          operator: 0,
          value: found(R, B, A),
          bank: stepBank(found(R, B, A), found(R, A, B), found(R * R, B, A), found(Math.abs(A) + Math.abs(B), B, A)),
        },
        {
          span: [0, 1],
          operator: 0,
          value: single,
          bank: stepBank(single, phaseTex(R, w, '+'), phaseTex(R, w, '-', 'sin'), phaseTex(R * R, w)),
        },
      ],
    };
  },
  solution: phaseSteps,
};

/** The single cosine R cos(ωt - α), as tiles; at difficulty 2 from how the motion starts. */
const deShmPhaseTiles: Generator<PhaseParams> = {
  id: 'de-shm-phase-tiles',
  sample: samplePhase,
  render: (params): Slide => {
    const { w, A, B, R, started } = params;
    const answer = [`${R}`, `${coef(w)}t`];
    const prompt = started
      ? [
          prose('A particle moves with'),
          display(motionStandardTex(shmOf(w))),
          prose(`and $x(0) = ${A}, \\; \\dot{x}(0) = ${w * B}$. Write its motion as a single cosine, with $R > 0$.`),
        ]
      : [prose('Write this motion as a single cosine, with $R > 0$.'), display(`x = ${waveOfT(A, B, w)}`)];
    return {
      kind: 'tiles',
      prompt,
      template: 'x = {0}\\cos({1} - \\alpha)',
      bank: tokenBank(answer, [`${R * R}`, `${coef(w * w)}t`, `${Math.abs(A) + Math.abs(B)}`, `${coef(2 * w)}t`, `${Math.abs(A)}`], 4),
      answer,
    };
  },
  solution: (params) => [
    ...(params.started
      ? [
          { text: `With $\\omega = ${params.w}$, $x = A\\cos ${coef(params.w)}t + B\\sin ${coef(params.w)}t$ has $x(0) = A$ and $\\dot{x}(0) = ${params.w}B$.` },
          { tex: `x = ${waveOfT(params.A, params.B, params.w)}` },
        ]
      : []),
    ...phaseSteps(params),
  ],
};

/* ---------- Level 6, lesson 4: damping ---------- */

/**
 * `ẍ + kẋ + ω²x = 0` with k > 0, from negative roots: two different ones
 * (over-damped), one twice (critical), or -p ± qi (under-damped).
 */
function sampleDamped(rng: Rng, difficulty: number, kind: SecondDe['kind'], forms: SecondDe['written'][]): SecondDe {
  const hard = difficulty >= 2;
  const written = rng.pick(forms);
  const scale = written === 'scaled' ? rng.int(2, 3) : 1;
  if (kind === 'repeated') {
    const p = -rng.int(1, hard ? 7 : 5);
    return { kind, p, q: p, written, scale };
  }
  if (kind === 'complex') return { kind, p: -rng.int(1, hard ? 3 : 2), q: rng.int(1, hard ? 5 : 3), written, scale };
  for (;;) {
    const one = -rng.int(1, hard ? 7 : 5);
    const two = -rng.int(1, hard ? 7 : 5);
    if (one !== two) return { kind, p: Math.min(one, two), q: Math.max(one, two), written, scale };
  }
}

/** The three cases, in `KINDS` order. */
const DAMPING = ['Over-damped', 'Critically damped', 'Under-damped'];

const dampingOf = (k: number, c: number): string => DAMPING[k * k > 4 * c ? 0 : k * k === 4 * c ? 1 : 2];

/** A walk: the auxiliary equation, k² - 4ω², and the damping it decides. */
const deDampCase: Generator<SecondDe> = {
  id: 'de-damp-case',
  sample: (rng, difficulty) =>
    sampleDamped(rng, difficulty, rng.pick(KINDS), difficulty >= 2 ? ['standard', 'moved', 'moved'] : ['standard', 'standard', 'moved']),
  render: (de): Slide => {
    const b = secondB(de);
    const c = secondC(de);
    const disc = b * b - 4 * c;
    const salt = secondSalt(de);
    const aux = `$${auxOf(b, c)}$`;
    const sign = disc > 0 ? 'positive' : disc === 0 ? 'zero' : 'negative';
    const verdict =
      de.kind === 'real'
        ? `The roots, $${de.p}$ and $${de.q}$, are both negative: $x$ dies away without swinging.`
        : de.kind === 'repeated'
          ? `The root $${de.p}$ repeats: $x$ dies away as fast as it can without swinging.`
          : `The roots are $${rootsTex(de)}$: $x$ swings, and the swings die away.`;
    const cases = [
      { label: DAMPING[0], outcome: de.kind === 'real' ? verdict : `Over-damping needs $k^2 - 4\\omega^2 > 0$, and this is ${sign}.` },
      { label: DAMPING[1], outcome: de.kind === 'repeated' ? verdict : `Critical damping needs $k^2 - 4\\omega^2 = 0$, and this is ${sign}.` },
      { label: DAMPING[2], outcome: de.kind === 'complex' ? verdict : `Under-damping needs $k^2 - 4\\omega^2 < 0$, and this is ${sign}.` },
    ];
    return {
      kind: 'flow',
      prompt: [prose('Decide how this motion is damped.')],
      subject: motionTex(de),
      steps: [
        {
          id: 'aux',
          ask: 'The auxiliary equation is',
          branches: branchesOf(
            { label: aux, to: 'disc' },
            [
              {
                label: `$${auxOf(-b, c)}$`,
                outcome: de.written === 'moved' ? 'Moving a term across the $=$ changes its sign.' : "$\\dot{x}$ becomes $m$ with its coefficient, sign and all.",
              },
              { label: `$${auxOf(b, -c)}$`, outcome: '$x$ becomes $1$, keeping its coefficient and sign.' },
              { label: `$${auxOf(c, b)}$`, outcome: "$\\dot{x}$ becomes $m$ and $x$ becomes $1$: the coefficients stay where they were." },
            ],
            salt,
          ),
        },
        {
          id: 'disc',
          ask: 'Its discriminant, $k^2 - 4\\omega^2$, is',
          branches: branchesOf(
            { label: `$${disc}$`, to: 'case' },
            [
              { label: `$${b * b + 4 * c}$`, outcome: 'The discriminant takes $4\\omega^2$ away.' },
              { label: `$${-disc}$`, outcome: 'That is $4\\omega^2 - k^2$, the wrong way round.' },
              { label: `$${b * b - 2 * c}$`, outcome: 'It is $4$ times $\\omega^2$, not $2$ times.' },
            ],
            salt >>> 4,
          ),
        },
        { id: 'case', ask: 'So the motion is', branches: turned(cases, (salt >>> 8) % 3) },
      ],
      answer: [aux, `$${disc}$`, DAMPING[KINDS.indexOf(de.kind)]],
    };
  },
  solution: (de) => {
    const b = secondB(de);
    const c = secondC(de);
    return [
      ...motionToStandard(de),
      { text: "$\\ddot{x}$ becomes $m^2$, $\\dot{x}$ becomes $m$ and $x$ becomes $1$.", tex: auxOf(b, c) },
      { text: `$k = ${b}$ and $\\omega^2 = ${c}$:`, tex: `k^2 - 4\\omega^2 = ${b * b} - ${4 * c} = ${b * b - 4 * c}` },
      { text: `${dampingOf(b, c)}: positive is over-damped, zero critical, negative under-damped.`, tex: rootsTex(de) },
    ];
  },
};

export interface LeastKParams {
  w: number;
  /** What multiplies ẍ. */
  m: number;
  critical: boolean;
}

export const leastKTex = ({ w, m }: LeastKParams): string => `${coef(m)}${D2T} + k${D1T} + ${m * w * w}x = 0`;

/** The least k that stops the oscillation, 2mω, typed. */
const deDampLeast: Generator<LeastKParams> = {
  id: 'de-damp-least',
  sample: (rng, difficulty) =>
    difficulty >= 2
      ? { w: rng.int(2, 9), m: rng.int(1, 3), critical: rng.chance(0.5) }
      : { w: rng.int(1, 8), m: rng.int(1, 2), critical: rng.chance(0.5) },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose(
        params.critical
          ? 'Find the value of $k > 0$ that makes this motion critically damped.'
          : 'Find the least value of $k > 0$ for which this motion does not oscillate.',
      ),
      display(leastKTex(params)),
    ],
    lead: 'k =',
    keypad: [],
    answer: `${2 * params.m * params.w}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ w, m }) => [
    ...(m === 1 ? [] : [{ text: `Divide every term by $${m}$.`, tex: `${D2T} + \\frac{k}{${m}}${D1T} + ${w * w}x = 0` }]),
    {
      text: `It oscillates while the auxiliary equation has complex roots, and stops once its discriminant reaches $0$${m === 1 ? '' : `, with $\\frac{k}{${m}}$ in place of $k$`}.`,
      tex: `${m === 1 ? 'k^2' : `\\left(\\frac{k}{${m}}\\right)^2`} = 4 \\times ${w * w} = ${4 * w * w}`,
    },
    { text: `Take the positive root${m === 1 ? '' : ` and multiply by $${m}$`}.`, tex: `k = ${2 * m * w}` },
  ],
};

/** The discriminant, then the roots, as a tree. */
const deDampRootsTree: Generator<SecondDe> = {
  id: 'de-damp-roots-tree',
  sample: (rng, difficulty) =>
    sampleDamped(rng, difficulty, rng.pick(KINDS), difficulty >= 2 ? ['standard', 'moved'] : ['standard', 'standard', 'moved']),
  render: (de): Slide => {
    const b = secondB(de);
    const c = secondC(de);
    const disc = b * b - 4 * c;
    const { kind, p, q } = de;
    const lead = prose('The discriminant of the auxiliary equation is $D = k^2 - 4\\omega^2$.');
    const shared = { kind: 'tree' as const, expression: motionTex(de) };
    if (kind === 'real') {
      const answer = [disc, p, q];
      return {
        ...shared,
        prompt: [lead, prose('Its roots are $p$ and $q$, with $p < q$. Fill in $D$, then $p$ and $q$.')],
        nodes: [
          { id: 'D', from: [] },
          { id: 'p', from: ['D'] },
          { id: 'q', from: ['D'] },
        ],
        bank: treeBank(answer, [-disc, -p, -q, b, c]),
        answer: answer.map(String),
      };
    }
    if (kind === 'repeated') {
      const answer = [disc, p];
      return {
        ...shared,
        prompt: [lead, prose('It has one repeated root $p$. Fill in $D$, then $p$.')],
        nodes: [
          { id: 'D', from: [] },
          { id: 'p', from: ['D'] },
        ],
        bank: treeBank(answer, [-p, b, c, 2 * p, 4 * c]),
        answer: answer.map(String),
      };
    }
    const answer = [disc, p, q];
    return {
      ...shared,
      prompt: [lead, prose('Its roots are $\\alpha \\pm \\beta i$, with $\\beta > 0$. Fill in $D$, then $\\alpha$, then $\\beta$.')],
      nodes: [
        { id: 'D', from: [] },
        { id: 'alpha', from: [] },
        { id: 'beta', from: ['D'] },
      ],
      bank: treeBank(answer, [-disc, -p, 2 * q, q * q, b]),
      answer: answer.map(String),
    };
  },
  solution: (de) => {
    const b = secondB(de);
    const c = secondC(de);
    const disc = b * b - 4 * c;
    return [
      ...motionToStandard(de),
      { text: 'The auxiliary equation:', tex: auxOf(b, c) },
      { text: 'Its discriminant:', tex: `D = ${b}^2 - 4 \\times ${c} = ${disc}` },
      { text: 'By the quadratic formula,', tex: `m = \\frac{${-b} \\pm \\sqrt{${disc}}}{2}` },
      { tex: rootsTex(de) },
    ];
  },
};

export interface WhichDampParams {
  w: number;
  /** The case asked for, as an index into `DAMPING`. */
  ask: number;
  /** The damping constant of the right answer. */
  k: number;
}

const whichDampTex = (k: number, c: number): string => `${terms([[1, D2T], [k, D1T], [c, 'x']])} = 0`;

/** Damping constants to set beside the answer, none in the asked case. */
function otherKs({ w, ask, k }: WhichDampParams): number[] {
  const c = w * w;
  const candidates = [w, 2 * w, c, 4 * w, 2 * w + 2, 2 * w - 1, w + 1, 2 * w + 1, 1];
  const out: number[] = [];
  for (const other of candidates) {
    if (out.length === 3) break;
    if (other <= 0 || other === k || out.includes(other) || DAMPING.indexOf(dampingOf(other, c)) === ask) continue;
    out.push(other);
  }
  return out;
}

/** Which of four equations with the same ω is damped the way asked. */
const deDampWhich: Generator<WhichDampParams> = {
  id: 'de-damp-which',
  sample: (rng, difficulty) => {
    const w = rng.int(2, difficulty >= 2 ? 9 : 6);
    const ask = rng.int(0, 2);
    const k = ask === 0 ? rng.int(2 * w + 1, 2 * w + 5) : ask === 1 ? 2 * w : rng.int(1, 2 * w - 1);
    return { w, ask, k };
  },
  render: (params): Slide => {
    const c = params.w * params.w;
    const answer = whichDampTex(params.k, c);
    return choiceSlide(
      [prose(`Which of these motions is ${DAMPING[params.ask].toLowerCase()}?`)],
      [{ label: answer, tex: true, correct: true }, ...otherKs(params).map((k) => ({ label: whichDampTex(k, c), tex: true }))],
      mix(params.w, params.ask, params.k),
    );
  },
  solution: ({ w, ask, k }) => [
    { text: `Every one has $\\omega^2 = ${w * w}$, so $\\omega = ${w}$ and critical damping is at $k = 2\\omega = ${2 * w}$.` },
    { text: 'Smaller $k$ still oscillates (under-damped); larger $k$ is over-damped.' },
    { text: `${DAMPING[ask]}:`, tex: `k = ${k}, \\quad ${whichDampTex(k, w * w)}` },
  ],
};

/* ---------- Level 6, lesson 5: damped motion ---------- */

/** The general solution in t, in A and B. */
export function motionGeneralTex({ kind, p, q }: SecondDe): string {
  if (kind === 'real') return `x = A${expT(p)} + B${expT(q)}`;
  if (kind === 'repeated') return `x = (A + Bt)${expT(p)}`;
  return p === 0 ? `x = ${waveOfT('A', 'B', q)}` : `x = ${expT(p)}(${waveOfT('A', 'B', q)})`;
}

/** A particular solution in t, with A and B numbers. */
export function motionParticularTex({ kind, p, q }: SecondDe, A: number, B: number): string {
  if (kind === 'real') return `x = ${terms([[A, expT(p)], [B, expT(q)]])}`;
  if (kind === 'repeated') return `x = (${terms([[A, ''], [B, 't']])})${expT(p)}`;
  return p === 0 ? `x = ${waveOfT(A, B, q)}` : `x = ${expT(p)}(${waveOfT(A, B, q)})`;
}

function dampedSteps(de: SecondDe): SolutionStep[] {
  const b = secondB(de);
  const c = secondC(de);
  const shape =
    de.kind === 'real'
      ? 'Two negative roots: two exponentials, both dying away.'
      : de.kind === 'repeated'
        ? `A repeated root gives $${expT(de.p)}$ and $t${expT(de.p)}$.`
        : 'Complex roots $\\alpha \\pm \\beta i$: $e^{\\alpha t}$ times a cosine and a sine of $\\beta t$.';
  return [
    ...motionToStandard(de),
    { text: 'The auxiliary equation:', tex: auxOf(b, c) },
    { text: `Its discriminant is $${b * b - 4 * c}$.`, tex: rootsTex(de) },
    { text: shape, tex: motionGeneralTex(de) },
  ];
}

/** The general solution of a damped equation, as tiles. */
const deDampGeneral: Generator<SecondDe> = {
  id: 'de-damp-general',
  sample: (rng, difficulty) =>
    sampleDamped(
      rng,
      difficulty,
      rng.pick<SecondDe['kind']>(difficulty >= 2 ? KINDS : ['complex', 'complex', 'real', 'repeated']),
      difficulty >= 2 ? ['standard', 'moved', 'scaled'] : ['standard', 'standard', 'moved'],
    ),
  render: (de): Slide => {
    const { kind, p, q } = de;
    const prompt = [prose(`Find the general solution of this damped motion${kind === 'complex' ? ', with the cosine term first' : ''}.`), display(motionTex(de))];
    if (kind === 'real') {
      const answer = [expT(p), expT(q)];
      return {
        kind: 'tiles',
        prompt,
        template: 'x = A{0} + B{1}',
        bank: tokenBank(answer, [expT(-p), expT(-q), `t${expT(p)}`, expT(p + q)], 3),
        answer,
        unordered: true,
      };
    }
    if (kind === 'repeated') {
      const answer = [expT(p), `t${expT(p)}`];
      return {
        kind: 'tiles',
        prompt,
        template: 'x = A{0} + B{1}',
        bank: tokenBank(answer, [expT(-p), `t${expT(-p)}`, `t^2${expT(p)}`, expT(2 * p)], 3),
        answer,
        unordered: true,
      };
    }
    const answer = [expT(p), trigT('cos', q), trigT('sin', q)];
    const swapped = Math.abs(p) !== q ? [trigT('cos', Math.abs(p)), trigT('sin', Math.abs(p))] : [];
    return {
      kind: 'tiles',
      prompt,
      template: 'x = {0}(A{1} + B{2})',
      bank: tokenBank(answer, [expT(-p), expT(-q), ...swapped, trigT('cos', 2 * q)], 3),
      answer,
    };
  },
  solution: dampedSteps,
};

export const motionConditionsTex = (de: SecondIvp): string => {
  const [x0, v0] = atZero(de, de.A, de.B);
  return `x(0) = ${x0}, \\; \\dot{x}(0) = ${v0}`;
};

/** The general solution in words that name A and B without giving the roots away. */
function motionForm({ kind }: SecondDe): string {
  if (kind === 'real') return '$x = Ae^{pt} + Be^{qt}$ with $p < q$';
  if (kind === 'repeated') return '$x = (A + Bt)e^{pt}$';
  return '$x = e^{\\alpha t}(A\\cos \\beta t + B\\sin \\beta t)$ with $\\beta > 0$';
}

function sampleDampedIvp(rng: Rng, difficulty: number): SecondIvp {
  const hard = difficulty >= 2;
  const de = sampleDamped(rng, difficulty, hard ? rng.pick(KINDS) : 'complex', hard ? ['standard', 'moved', 'scaled'] : ['standard', 'moved']);
  const A = nonzero(rng, hard ? 5 : 4);
  const B = nonzero(rng, hard ? 5 : 4);
  return { ...de, A, B, letter: de.kind === 'real' && rng.chance(0.5) ? 'A' : 'B' };
}

function dampedIvpSteps(de: SecondIvp): SolutionStep[] {
  const { kind, p, q, A, B } = de;
  const [x0, v0] = atZero(de, A, B);
  const equations =
    kind === 'real'
      ? chain(`A + B &= ${x0}`, `${terms([[p, 'A'], [q, 'B']])} &= ${v0}`)
      : kind === 'repeated'
        ? chain(`A &= ${x0}`, `${terms([[p, 'A'], [1, 'B']])} &= ${v0}`)
        : chain(`A &= ${x0}`, `${terms([[p, 'A'], [q, 'B']])} &= ${v0}`);
  return [
    { text: 'The general solution:', tex: motionGeneralTex(de) },
    {
      text:
        kind === 'real'
          ? `At $t = 0$ each exponential is $1$, and differentiating brings down $${p}$ and $${q}$:`
          : kind === 'repeated'
            ? `At $t = 0$, $x = A$, and by the product rule $\\dot{x}(0) = ${p}A + B$:`
            : `At $t = 0$, $x = A$, and by the product rule $\\dot{x}(0) = \\alpha A + \\beta B$:`,
      tex: equations,
    },
    { text: 'Solve them.', tex: `A = ${A}, \\; B = ${B}` },
    { text: `So $${motionParticularTex(de, A, B)}$.` },
  ];
}

/** The roots, then A, then B, from x(0) and ẋ(0), as a tree. */
const deDampIvpTree: Generator<SecondIvp> = {
  id: 'de-damp-ivp-tree',
  sample: sampleDampedIvp,
  render: (de): Slide => {
    const { kind, p, q, A, B } = de;
    const [x0, v0] = atZero(de, A, B);
    const shared = { kind: 'tree' as const, expression: motionTex(de) };
    const lead = prose(`Solve with $${motionConditionsTex(de)}$, writing the general solution as ${motionForm(de)}.`);
    if (kind === 'repeated') {
      const answer = [p, A, B];
      return {
        ...shared,
        prompt: [lead, prose('Fill in $p$ and $A$, then $B$.')],
        nodes: [
          { id: 'p', from: [] },
          { id: 'A', from: [] },
          { id: 'B', from: ['p', 'A'] },
        ],
        bank: treeBank(answer, [-p, v0, -B, v0 + p * A]),
        answer: answer.map(String),
      };
    }
    const answer = [p, q, A, B];
    const names = kind === 'real' ? ['p', 'q'] : ['alpha', 'beta'];
    return {
      ...shared,
      prompt: [lead, prose(kind === 'real' ? 'Fill in $p$ and $q$, then $A$, then $B$.' : 'Fill in $\\alpha$ and $\\beta$, then $A$, then $B$.')],
      nodes: [
        { id: names[0], from: [] },
        { id: names[1], from: [] },
        { id: 'A', from: kind === 'real' ? names : [] },
        { id: 'B', from: kind === 'real' ? ['A'] : [...names, 'A'] },
      ],
      bank: treeBank(answer, [-p, -q, x0, v0, -A, -B, v0 - p * A]),
      answer: answer.map(String),
    };
  },
  solution: (de) => [...dampedSteps(de), ...dampedIvpSteps(de).slice(1)],
};

/** A constant from the conditions, or the starting velocity of a particular solution, typed. */
const deDampConstant: Generator<SecondIvp & { velocity: boolean }> = {
  id: 'de-damp-constant',
  sample: (rng, difficulty) => ({ ...sampleDampedIvp(rng, difficulty), velocity: rng.chance(0.4) }),
  render: (de): Slide => {
    if (de.velocity) {
      return {
        kind: 'expression',
        prompt: [prose('A damped particle moves with'), display(motionParticularTex(de, de.A, de.B)), prose('Find its velocity at $t = 0$.')],
        lead: '\\dot{x}(0) =',
        keypad: [],
        answer: `${atZero(de, de.A, de.B)[1]}`,
        domain: 'real',
        mode: 'exact',
      };
    }
    return {
      kind: 'expression',
      prompt: [
        prose(`The general solution of this equation is $${motionGeneralTex(de)}$. Find $${de.letter}$ when $${motionConditionsTex(de)}$.`),
        display(motionTex(de)),
      ],
      lead: `${de.letter} =`,
      keypad: [],
      answer: `${de.letter === 'A' ? de.A : de.B}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (de) => {
    if (!de.velocity) return [...motionToStandard(de), ...dampedIvpSteps(de)];
    const { kind, p, q, A, B } = de;
    const v0 = atZero(de, A, B)[1];
    const how =
      kind === 'real'
        ? `Differentiate each exponential: at $t = 0$ they give $${p} \\times ${A < 0 ? `(${A})` : A}$ and $${q} \\times ${B < 0 ? `(${B})` : B}$.`
        : kind === 'repeated'
          ? `By the product rule, at $t = 0$: $${p} \\times ${A < 0 ? `(${A})` : A} + ${B < 0 ? `(${B})` : B}$.`
          : `By the product rule, at $t = 0$ the exponential gives $${p} \\times ${A < 0 ? `(${A})` : A}$ and the sine gives $${q} \\times ${B < 0 ? `(${B})` : B}$.`;
    return [{ text: how }, { tex: `\\dot{x}(0) = ${v0}` }];
  },
};

const GRAPH_SHOWN = ['undamped', 'under', 'growing', 'still'] as const;

export interface DampGraphParams {
  /** The under-damped roots -p ± qi, which fix ω² = p² + q². */
  p: number;
  q: number;
  /** The non-oscillating roots -d and -ω²/d. */
  d: number;
  shown: (typeof GRAPH_SHOWN)[number];
}

/** The damping constant of each of the four motions. */
function graphKs({ p, q, d }: DampGraphParams): Record<DampGraphParams['shown'], number> {
  const c = p * p + q * q;
  return { undamped: 0, under: 2 * p, growing: -2 * p, still: d + c / d };
}

/** x(t) with x(0) = 1 and ẋ(0) = 0, for drawing. */
function graphCurve({ p, q, d, shown }: DampGraphParams): (t: number) => number {
  const c = p * p + q * q;
  if (shown === 'undamped') return (t) => Math.cos(Math.sqrt(c) * t);
  if (shown === 'under') return (t) => Math.exp(-p * t) * (Math.cos(q * t) + (p / q) * Math.sin(q * t));
  if (shown === 'growing') return (t) => Math.exp(p * t) * (Math.cos(q * t) - (p / q) * Math.sin(q * t));
  const r1 = d;
  const r2 = c / d;
  if (r1 === r2) return (t) => (1 + r1 * t) * Math.exp(-r1 * t);
  return (t) => (r2 * Math.exp(-r1 * t) - r1 * Math.exp(-r2 * t)) / (r2 - r1);
}

/** Which equation a graph of x against t belongs to, the four damped differently. */
const deDampGraph: Generator<DampGraphParams> = {
  id: 'de-damp-graph',
  sample: (rng, difficulty) => {
    const p = rng.int(1, difficulty >= 2 ? 3 : 2);
    // Light damping, q at least 3p, so an under-damped curve visibly swings back past 0 and a growing one does not leave the picture.
    const q = rng.int(3 * p, 3 * p + (difficulty >= 2 ? 4 : 2));
    const c = p * p + q * q;
    const pairs = Array.from({ length: Math.floor(Math.sqrt(c)) }, (_, i) => i + 1).filter((n) => c % n === 0);
    return { p, q, d: rng.pick(pairs), shown: rng.pick([...GRAPH_SHOWN]) };
  },
  render: (params): Slide => {
    const c = params.p * params.p + params.q * params.q;
    const ks = graphKs(params);
    const f = graphCurve(params);
    // A swing and a half, with the window fitted to the curve.
    const span = (3 * Math.PI) / params.q;
    const labels = {
      undamped: 'a steady swing that never dies down',
      under: 'swings that die away',
      growing: 'swings that grow',
      still: 'a curve falling to 0 without crossing it',
    };
    const answer = whichDampTex(ks[params.shown], c);
    return choiceSlide(
      [
        prose('This graph shows $x$ against $t$ for a particle starting at rest at $x = 1$. Which equation does it follow?'),
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: 0,
            xMax: span,
            curves: [{ f }],
            label: `A graph of x against t: ${labels[params.shown]}`,
          }),
        },
      ],
      [
        { label: answer, tex: true, correct: true },
        ...GRAPH_SHOWN.filter((kind) => kind !== params.shown).map((kind) => ({ label: whichDampTex(ks[kind], c), tex: true })),
      ],
      mix(params.p, params.q, params.d, GRAPH_SHOWN.indexOf(params.shown)),
    );
  },
  solution: (params) => {
    const c = params.p * params.p + params.q * params.q;
    const k = graphKs(params)[params.shown];
    const why = {
      undamped: 'The swings keep the same size, so nothing damps them: $k = 0$.',
      under: `The swings shrink, so $k > 0$ but small: $k^2 < 4\\omega^2 = ${4 * c}$.`,
      growing: 'The swings grow, which needs a negative $k$: the "damping" pushes energy in.',
      still: `The curve dies away without crossing $0$, so $k^2 \\ge 4\\omega^2 = ${4 * c}$.`,
    };
    return [{ text: why[params.shown] }, { tex: whichDampTex(k, c) }];
  },
};

/* ---------- Registration ---------- */

export const deGenerators = {
  deFormTiles,
  deFormSign,
  deFormFlow,
  deFormRate,
  deSepTiles,
  deSepWhich,
  deSepSteps,
  deSepIntegrate,
  deGeneralTiles,
  deGeneralTree,
  deGeneralImplicit,
  deParticularTree,
  deParticularValue,
  deParticularSlider,
  deParticularSteps,
  deGrowthSteps,
  deGrowthSolution,
  deGrowthMatch,
  deCoolTiles,
  deCoolSteps,
  deCoolTree,
  deCoolValue,
  deLimitTiles,
  deLimitFlow,
  deLimitSteps,
  deLimitSlider,
  deMixTiles,
  deMixTree,
  deMixLimit,
  deMixWhen,
  deLongEquilibrium,
  deLongSlider,
  deLongFlow,
  deVerifySteps,
  deVerifyTree,
  deVerifyWhich,
  deVerifyConstant,
  deIfRead,
  deIfDivide,
  deIfProduct,
  deIfMultiplyTree,
  deIfFactor,
  deIfExponentSteps,
  deIfShape,
  deIfLhs,
  deIfConstpSteps,
  deIfExponentsTree,
  deIfGeneral,
  deIfIntegrate,
  deIfPowerTiles,
  deIfPowerSteps,
  deIfPowersTree,
  deIfCterm,
  deIfConstant,
  deIfConditionSteps,
  deIfFit,
  deIfValueTree,
  deAuxSubSteps,
  deAuxTiles,
  deAuxRoot,
  deAuxCase,
  deRealGeneral,
  deRealRootsTree,
  deRealWhich,
  deRealSolveSteps,
  deRepGeneral,
  deRepCheckSteps,
  deRepShape,
  deRepWhich,
  deCxGeneral,
  deCxPart,
  deCxWhich,
  deCxTree,
  deIvpConstant,
  deIvpTree,
  deIvpSteps,
  deIvpFit,
  deNhConstant,
  deNhCheckSteps,
  deNhWhichPi,
  deNhGeneralFlow,
  deNhPolyTrial,
  deNhPolyTree,
  deNhPolySteps,
  deNhPolyPi,
  deNhExpValue,
  deNhExpSteps,
  deNhExpGeneral,
  deNhExpFlow,
  deNhTrigTrial,
  deNhTrigTree,
  deNhTrigSteps,
  deNhTrigPart,
  deNhResFlow,
  deNhResValue,
  deNhIvpTree,
  deNhIvpFit,
  deShmOmega,
  deShmAux,
  deShmGeneral,
  deShmVerifySteps,
  deShmPeriod,
  deShmSpeed,
  deShmMotionTree,
  deShmRelease,
  deShmPhaseR,
  deShmPhaseTan,
  deShmPhaseSteps,
  deShmPhaseTiles,
  deDampCase,
  deDampLeast,
  deDampRootsTree,
  deDampWhich,
  deDampGeneral,
  deDampIvpTree,
  deDampConstant,
  deDampGraph,
};

export const differentialEquationGenerators = Object.values(deGenerators) as Generator<never>[];
