/**
 * Differential Equations generators.
 *
 * Level 1 forms a first-order equation from a rate statement and solves it by
 * separating the variables: the general solution with its one constant, then
 * the particular solution a condition picks out, and growth and decay as
 * `dy/dt = ky`. Level 2 models with them: Newton's cooling, growth towards a
 * limit, mixing tanks, long-term behaviour, and checking a solution by
 * substitution.
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
 * equation, across seeds and both difficulties.
 */
import type { Block, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { EXP_KEYS, termAnswer, termTex } from './calculus';
import {
  OPERATOR_KEYS,
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
      { text: `$A$ is the value at $t = 0$. The marked point is $${at === 1 ? 'one' : 'two'}$ ${k.h === 1 ? 'step' : `step${at === 1 ? '' : 's'} of $${k.h}$`} along, and each step ${k.sign > 0 ? 'multiplies' : 'divides'} by $${k.b}$.` },
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
      bank: [...numbers, ...kTokens],
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
};

export const differentialEquationGenerators = Object.values(deGenerators) as Generator<never>[];
