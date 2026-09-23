/**
 * Trigonometric Identities & Equations.
 *
 * Trigonometric Functions already teaches the pieces this course works with:
 * sin^2 + cos^2 = 1 (tf-l2), tan as sine over cosine, the reciprocals and
 * 1 + tan^2 = sec^2 (tf-l5), and every solution of sin x = k (tf-l6). Nothing
 * here re-teaches them. Level 1 *uses* them: to rewrite an expression, to pick
 * the identity a problem calls for, to turn an equation into a quadratic in one
 * function, and to turn sine and cosine into tangent. Level 2 adds the compound
 * and double-angle formulae, and level 3 writes a sin x + b cos x as
 * R sin(x + alpha). There alpha is a table angle wherever an angle is typed or
 * slid to; a Pythagorean triple's alpha, to one decimal place, is only ever an
 * option or a tile, and a surd R is only ever a tile. Level 4 runs the
 * double-angle formulae back to x/2 and on to 3x. Its half-angle values are
 * drawn backwards from the half angle's triangle so they come out whole, 15 and
 * 22.5 degrees appear only in a prompt or an option, and a 3x equation that is
 * typed or slid keeps to 0 and +-1.
 *
 * Every angle is a multiple of 30 or 45 degrees (or half of one, where a double
 * angle is being undone), every value is 0, +-1/2, +-1 or a surd, and every
 * bank is whole. Surds are never typed: a phone keypad makes
 * (sqrt(6) + sqrt(2))/4 a chore to enter and a trap to bracket, so exact surd
 * values are placed from a bank or picked from options, and the typed answers
 * are fractions and angles.
 *
 * Rewriting an expression is never a typed question either. The checker
 * compares values, so it would accept the question copied straight back
 * (PITFALLS 3.4); a rewrite is asked through `steps`, `tiles`, `flow` or a
 * native `choice`, which grade the form.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { orderBank } from './proofOrder';

/* ---------- Shared helpers ---------- */

/** Fraction entry; the base keypad supplies digits, signs and the point. */
const NUMBER_KEYS: KeypadKey[] = [{ insert: '/' }];

/** Angles in radians, as multiples of pi. */
const PI_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }, { insert: '/' }];

/** The letters a rewrite is written in, so one form is not always about x. */
const VARS = ['x', '\\theta', 'A'];

type Fn = 'sin' | 'cos' | 'tan';

type Rat = [number, number];

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/** n/d in lowest terms with the sign on top. */
function rat(n: number, d: number): Rat {
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return [(sign * n) / g, (sign * d) / g];
}

const ratValue = ([n, d]: Rat): number => n / d;

/** A fraction as the learner reads it: sign in front, lowest terms. */
const ratTex = ([n, d]: Rat): string =>
  d === 1 ? `${n}` : `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`;

/** The same value for mathjs. Never displayed. */
const ratAnswer = ([n, d]: Rat): string => (d === 1 ? `${n}` : `(${n})/(${d})`);

/** A value in a line of working, bracketed when negative so no "- -" appears. Solutions only, never tiles. */
const br = (tex: string): string => (tex.startsWith('-') ? `\\left(${tex}\\right)` : tex);

/** A coefficient in front of a function: nothing for 1. */
const co = (k: number): string => (k === 1 ? '' : `${k}`);

const deg = (d: number): string => `${d}^{\\circ}`;

/** Degrees as a multiple of pi, as the learner reads it. */
function piTex(degrees: number): string {
  // Doubled so a half degree (22.5, a double angle undone) stays a whole fraction.
  const [n, d] = rat(Math.round(degrees * 2), 360);
  if (n === 0) return '0';
  const top = `${n < 0 ? '-' : ''}${Math.abs(n) === 1 ? '' : Math.abs(n)}\\pi`;
  return d === 1 ? top : `${n < 0 ? '-' : ''}\\frac{${Math.abs(n) === 1 ? '' : Math.abs(n)}\\pi}{${d}}`;
}

/** Degrees as a multiple of pi, for mathjs. Never displayed. */
function piAnswer(degrees: number): string {
  const [n, d] = rat(Math.round(degrees * 2), 360);
  return `(${n}*pi)/(${d})`;
}

const angleTex = (degrees: number, radians: boolean): string => (radians ? piTex(degrees) : deg(degrees));

const angleAnswer = (degrees: number, radians: boolean): string =>
  radians ? piAnswer(degrees) : `${degrees}`;

/** sin, cos or tan of a whole number of degrees, with float dust swept to zero; undefined where tan has no value. */
function trigAt(fn: Fn, degrees: number): number | undefined {
  const r = (degrees * Math.PI) / 180;
  const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  const s = tidy(Math.sin(r));
  const c = tidy(Math.cos(r));
  if (fn === 'sin') return s;
  if (fn === 'cos') return c;
  return c === 0 ? undefined : tidy(s / c);
}

/** Every size a ratio takes at a multiple of 30 or 45 degrees. */
const SPECIAL: { value: number; tex: string }[] = [
  { value: 0, tex: '0' },
  { value: 0.5, tex: '\\frac{1}{2}' },
  { value: Math.SQRT2 / 2, tex: '\\frac{\\sqrt{2}}{2}' },
  { value: Math.sqrt(3) / 2, tex: '\\frac{\\sqrt{3}}{2}' },
  { value: 1, tex: '1' },
  { value: 1 / Math.sqrt(3), tex: '\\frac{1}{\\sqrt{3}}' },
  { value: Math.sqrt(3), tex: '\\sqrt{3}' },
  { value: 1.5, tex: '\\frac{3}{2}' },
  { value: 2, tex: '2' },
  { value: 3, tex: '3' },
];

/** A special value as the learner reads it. Throws off the table, so a slip cannot pass as a surd. */
function specialTex(value: number): string {
  const row = SPECIAL.find((entry) => Math.abs(entry.value - Math.abs(value)) < 1e-9);
  if (!row) throw new Error(`${value} is not a special value`);
  return value < 0 && row.value !== 0 ? `-${row.tex}` : row.tex;
}

/** The multiples of 30 and 45 degrees in one turn, from 0 up to but not including 360. */
const TURN = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

/** Every angle in 0 <= x < 360 where fn takes this value, smallest first. */
function solutionsOf(fn: Fn, value: number): number[] {
  return TURN.filter((d) => {
    const v = trigAt(fn, d);
    return v !== undefined && Math.abs(v - value) < 1e-9;
  });
}


/** A signed term: '3\\sin x' first, '+ 3\\sin x' or '- \\sin x' after. A bare number when the body is empty. */
function signed(coef: number, body: string, first = false): string {
  const size = Math.abs(coef);
  const mag = body === '' ? `${size}` : `${size === 1 ? '' : size}${body}`;
  if (first) return coef < 0 ? `-${mag}` : mag;
  return `${coef < 0 ? '-' : '+'} ${mag}`;
}

/** Terms joined with their signs, dropping zeros. */
function polyTex(terms: [number, string][]): string {
  const kept = terms.filter(([c]) => c !== 0);
  if (kept.length === 0) return '0';
  return kept.map(([c, body], i) => signed(c, body, i === 0)).join(' ');
}

/** A deterministic scatter: stable per token, so one question renders one way (PITFALLS 3.10). */
function scatter(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => hashSeed(a) - hashSeed(b) || (a < b ? -1 : 1));
}

/** The answer tokens as a multiset, plus up to `extra` distractors not already among them. */
function bankOf(answer: string[], distractors: string[], extra = 3): string[] {
  const picked: string[] = [];
  for (const token of distractors) {
    if (answer.includes(token) || picked.includes(token)) continue;
    picked.push(token);
    if (picked.length === extra) break;
  }
  return scatter([...answer, ...picked]);
}

/** A slot spread evenly from a question's parameters. */
const saltOf = (params: unknown): number => hashSeed(JSON.stringify(params));

/**
 * A native choice slide, the answer at a slot fixed by the question's own
 * numbers. Distractors that collide with the answer or each other are dropped.
 */
function choiceSlide(prompt: Block[], correct: string, distractors: string[], salt: number): Slide {
  const rest = [...new Set(distractors)].filter((tex) => tex !== correct).slice(0, 3);
  const slot = salt % (rest.length + 1);
  const ordered = [...rest.slice(0, slot), correct, ...rest.slice(slot)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
    correctId: `opt${slot}`,
  };
}

/** Choice options from fractions: the answer, then whichever slips differ from it in value. */
function ratOptions(correct: Rat, slips: Rat[]): ChoiceOption[] {
  const seen = [ratValue(correct)];
  const kept: Rat[] = [];
  for (const slip of slips) {
    const value = ratValue(slip);
    if (!Number.isFinite(value) || seen.some((v) => Math.abs(v - value) < 1e-9)) continue;
    seen.push(value);
    kept.push(slip);
    if (kept.length === 3) break;
  }
  return options(
    { tex: ratTex(correct), answer: ratAnswer(correct) },
    ...kept.map((slip) => ({ tex: ratTex(slip), answer: ratAnswer(slip) })),
  );
}

/** Choice options from angles in degrees: the answer and up to three others that differ. */
function angleOptions(correct: number, candidates: number[], radians: boolean): ChoiceOption[] {
  const kept = [...new Set(candidates)].filter((d) => d !== correct).slice(0, 3);
  return options(
    { tex: angleTex(correct, radians), answer: angleAnswer(correct, radians) },
    ...kept.map((d) => ({ tex: angleTex(d, radians), answer: angleAnswer(d, radians) })),
  );
}

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** The three Pythagorean-type identities and the quotient one, written in a given letter. */
const identity = {
  pyth: (v: string) => `\\sin^2 ${v} + \\cos^2 ${v} = 1`,
  tan: (v: string) => `1 + \\tan^2 ${v} = \\sec^2 ${v}`,
  cot: (v: string) => `1 + \\cot^2 ${v} = \\operatorname{cosec}^2 ${v}`,
  quot: (v: string) => `\\tan ${v} = \\frac{\\sin ${v}}{\\cos ${v}}`,
};

/* ---------- Level 1, lesson 1: rewriting with an identity ---------- */

interface SimplifyParams {
  form: number;
  k: number;
  v: number;
  phrasing: number;
}

interface StepsForm {
  hard: boolean;
  start: (c: string, k: number, v: string) => string[];
  reductions: (c: string, k: number, v: string) => { span: [number, number]; value: string; bank: string[] }[];
  why: (c: string, k: number, v: string) => SolutionStep[];
}

/** Simplifications that take two moves: an identity on one piece, then a cancellation across the line. */
const SIMPLIFY_FORMS: StepsForm[] = [
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\cos^2 ${v})`, '\\div', `\\sin ${v}`],
    reductions: (c, _k, v) => [
      { span: [0, 1], value: `${c}\\sin^2 ${v}`, bank: [`${c}\\cos^2 ${v}`, `${c}\\tan^2 ${v}`, `${c}(1 + \\sin^2 ${v})`] },
      { span: [0, 3], value: `${c}\\sin ${v}`, bank: [`${c}\\cos ${v}`, `${c}\\tan ${v}`, `${c}\\sin^2 ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `From $${identity.pyth(v)}$, taking $\\cos^2 ${v}$ from both sides gives $1 - \\cos^2 ${v} = \\sin^2 ${v}$.` },
      { tex: `${c}(1 - \\cos^2 ${v}) \\div \\sin ${v} = ${c}\\sin^2 ${v} \\div \\sin ${v} = ${c}\\sin ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\sin^2 ${v})`, '\\div', `\\cos ${v}`],
    reductions: (c, _k, v) => [
      { span: [0, 1], value: `${c}\\cos^2 ${v}`, bank: [`${c}\\sin^2 ${v}`, `${c}\\tan^2 ${v}`, `${c}(1 + \\cos^2 ${v})`] },
      { span: [0, 3], value: `${c}\\cos ${v}`, bank: [`${c}\\sin ${v}`, `${c}\\tan ${v}`, `${c}\\cos^2 ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `From $${identity.pyth(v)}$, taking $\\sin^2 ${v}$ from both sides gives $1 - \\sin^2 ${v} = \\cos^2 ${v}$.` },
      { tex: `${c}(1 - \\sin^2 ${v}) \\div \\cos ${v} = ${c}\\cos^2 ${v} \\div \\cos ${v} = ${c}\\cos ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\sin^2 ${v})`, '\\div', `\\cos^2 ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${c}\\cos^2 ${v}`, bank: [`${c}\\sin^2 ${v}`, `${c}\\tan^2 ${v}`, `${c}(1 + \\cos^2 ${v})`] },
      { span: [0, 3], value: `${k}`, bank: [`-${k}`, `${c}\\cos ${v}`, `${c}\\tan^2 ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `$1 - \\sin^2 ${v} = \\cos^2 ${v}$, from $${identity.pyth(v)}$.` },
      { tex: `${c}\\cos^2 ${v} \\div \\cos^2 ${v} = ${k}` },
      { text: 'Everything that depended on the angle has cancelled, so the value is the same whatever the angle.' },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\cos^2 ${v})`, '\\div', `\\sin^2 ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${c}\\sin^2 ${v}`, bank: [`${c}\\cos^2 ${v}`, `${c}\\tan^2 ${v}`, `${c}(1 + \\sin^2 ${v})`] },
      { span: [0, 3], value: `${k}`, bank: [`-${k}`, `${c}\\sin ${v}`, `${c}\\cot^2 ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `$1 - \\cos^2 ${v} = \\sin^2 ${v}$, from $${identity.pyth(v)}$.` },
      { tex: `${c}\\sin^2 ${v} \\div \\sin^2 ${v} = ${k}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`(\\sin^2 ${v} + \\cos^2 ${v})`, '\\times', `${c}\\cos ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: '1', bank: ['0', '2', `\\tan^2 ${v}`] },
      { span: [0, 3], value: `${c}\\cos ${v}`, bank: [`${c}\\sin ${v}`, `${c}\\cos^2 ${v}`, `${k + 1}\\cos ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `The bracket is the identity itself: $${identity.pyth(v)}$.` },
      { tex: `1 \\times ${c}\\cos ${v} = ${c}\\cos ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}(\\sec^2 ${v} - 1)`, '\\div', `\\tan ${v}`],
    reductions: (c, _k, v) => [
      { span: [0, 1], value: `${c}\\tan^2 ${v}`, bank: [`${c}\\sin^2 ${v}`, `${c}\\cos^2 ${v}`, `${c}(\\sec^2 ${v} + 1)`] },
      { span: [0, 3], value: `${c}\\tan ${v}`, bank: [`${c}\\sec ${v}`, `${c}\\sin ${v}`, `${c}\\tan^2 ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `From $${identity.tan(v)}$, taking $1$ from both sides gives $\\sec^2 ${v} - 1 = \\tan^2 ${v}$.` },
      { tex: `${c}\\tan^2 ${v} \\div \\tan ${v} = ${c}\\tan ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}(1 + \\tan^2 ${v})`, '\\times', `\\cos^2 ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${c}\\sec^2 ${v}`, bank: [`${c}\\operatorname{cosec}^2 ${v}`, `${c}\\sin^2 ${v}`, `${c}\\cot^2 ${v}`] },
      { span: [0, 3], value: `${k}`, bank: [`-${k}`, `${c}\\sin^2 ${v}`, `${c}\\cos ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `$${identity.tan(v)}$, and $\\sec ${v} = \\frac{1}{\\cos ${v}}$, so $\\sec^2 ${v} \\times \\cos^2 ${v} = 1$.` },
      { tex: `${c}\\sec^2 ${v} \\times \\cos^2 ${v} = ${k}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`\\tan ${v}`, '\\times', `${c}\\cos ${v}`],
    reductions: (c, k, v) => [
      {
        span: [0, 1],
        value: `\\frac{\\sin ${v}}{\\cos ${v}}`,
        bank: [`\\frac{\\cos ${v}}{\\sin ${v}}`, `\\sin ${v}\\cos ${v}`, `\\frac{1}{\\cos ${v}}`],
      },
      { span: [0, 3], value: `${c}\\sin ${v}`, bank: [`${c}\\cos ${v}`, `${c}\\sin ${v}\\cos^2 ${v}`, `${k}`] },
    ],
    why: (c, _k, v) => [
      { text: `Write the tangent as $${identity.quot(v)}$.` },
      { tex: `\\frac{\\sin ${v}}{\\cos ${v}} \\times ${c}\\cos ${v} = ${c}\\sin ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}(\\operatorname{cosec}^2 ${v} - 1)`, '\\div', `\\cot ${v}`],
    reductions: (c, _k, v) => [
      { span: [0, 1], value: `${c}\\cot^2 ${v}`, bank: [`${c}\\tan^2 ${v}`, `${c}\\cos^2 ${v}`, `${c}\\sec^2 ${v}`] },
      { span: [0, 3], value: `${c}\\cot ${v}`, bank: [`${c}\\tan ${v}`, `${c}\\cot^2 ${v}`, `${c}\\operatorname{cosec} ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `From $${identity.cot(v)}$, taking $1$ from both sides gives $\\operatorname{cosec}^2 ${v} - 1 = \\cot^2 ${v}$.` },
      { tex: `${c}\\cot^2 ${v} \\div \\cot ${v} = ${c}\\cot ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}\\sin ${v}`, '\\div', `\\tan ${v}`],
    reductions: (c, _k, v) => [
      {
        span: [2, 3],
        value: `\\frac{\\sin ${v}}{\\cos ${v}}`,
        bank: [`\\frac{\\cos ${v}}{\\sin ${v}}`, `\\sin ${v}\\cos ${v}`, `\\frac{1}{\\sin ${v}}`],
      },
      { span: [0, 3], value: `${c}\\cos ${v}`, bank: [`${c}\\sin ${v}`, `${c}\\tan ${v}`, `${c}\\sin^2 ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `Write the tangent as $${identity.quot(v)}$. Dividing by a fraction multiplies by it upside down.` },
      { tex: `${c}\\sin ${v} \\times \\frac{\\cos ${v}}{\\sin ${v}} = ${c}\\cos ${v}` },
    ],
  },
];

const SIMPLIFY_PROMPTS = [
  'Simplify, one step at a time: use an identity first, then cancel.',
  'Rewrite the piece an identity can change, then finish the simplifying.',
  'Work this down to one simple term.',
];

/** A two-move simplification: an identity on one piece, then a cancellation. */
const simplifySteps: Generator<SimplifyParams> = {
  id: 'tid-simplify-steps',
  sample: (rng, difficulty) => {
    const forms = SIMPLIFY_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return {
      form: rng.pick(forms).i,
      k: rng.int(1, 6),
      v: rng.int(0, VARS.length - 1),
      phrasing: rng.int(0, SIMPLIFY_PROMPTS.length - 1),
    };
  },
  render: ({ form, k, v, phrasing }): Slide => {
    const f = SIMPLIFY_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    return {
      kind: 'steps',
      prompt: [prose(SIMPLIFY_PROMPTS[phrasing])],
      start: f.start(c, k, letter),
      reductions: f.reductions(c, k, letter).map((r) => ({ ...r, bank: scatter([r.value, ...r.bank]) })),
    };
  },
  solution: ({ form, k, v }) => SIMPLIFY_FORMS[form].why(co(k), k, VARS[v]),
};

interface RearrangeParams {
  form: number;
  k: number;
  v: number;
}

interface RearrangeForm {
  hard: boolean;
  template: (c: string, k: number, v: string) => string;
  answer: (c: string, k: number, v: string) => string[];
  unordered?: boolean;
  from: 'pyth' | 'tan' | 'cot' | 'quot';
}

/** The identities, rearranged and scaled. */
const REARRANGE_FORMS: RearrangeForm[] = [
  { hard: false, from: 'pyth', template: (c, _k, v) => `${c}\\sin^2 ${v} = {0} - {1}`, answer: (c, k, v) => [`${k}`, `${c}\\cos^2 ${v}`] },
  { hard: false, from: 'pyth', template: (c, _k, v) => `${c}\\cos^2 ${v} = {0} - {1}`, answer: (c, k, v) => [`${k}`, `${c}\\sin^2 ${v}`] },
  {
    hard: false,
    from: 'pyth',
    template: (_c, k) => `{0} + {1} = ${k}`,
    answer: (c, _k, v) => [`${c}\\sin^2 ${v}`, `${c}\\cos^2 ${v}`],
    unordered: true,
  },
  { hard: false, from: 'pyth', template: (c, k, v) => `${k} - {0} = ${c}\\cos^2 ${v}`, answer: (c, _k, v) => [`${c}\\sin^2 ${v}`] },
  { hard: false, from: 'pyth', template: (c, k, v) => `${c}\\sin^2 ${v} - ${k} = {0}`, answer: (c, _k, v) => [`-${c}\\cos^2 ${v}`] },
  { hard: true, from: 'tan', template: (c, _k, v) => `${c}\\tan^2 ${v} = {0} - {1}`, answer: (c, k, v) => [`${c}\\sec^2 ${v}`, `${k}`] },
  {
    hard: true,
    from: 'tan',
    template: (c, _k, v) => `${c}\\sec^2 ${v} = {0} + {1}`,
    answer: (c, k, v) => [`${k}`, `${c}\\tan^2 ${v}`],
    unordered: true,
  },
  {
    hard: true,
    from: 'cot',
    template: (c, _k, v) => `${c}\\cot^2 ${v} = {0} - {1}`,
    answer: (c, k, v) => [`${c}\\operatorname{cosec}^2 ${v}`, `${k}`],
  },
  {
    hard: true,
    from: 'cot',
    template: (c, k, v) => `${c}\\operatorname{cosec}^2 ${v} - {0} = ${k}`,
    answer: (c, _k, v) => [`${c}\\cot^2 ${v}`],
  },
  { hard: true, from: 'quot', template: (c, _k, v) => `${c}\\tan ${v} = {0} \\div {1}`, answer: (c, _k, v) => [`${c}\\sin ${v}`, `\\cos ${v}`] },
];

/** Rearrange an identity into the form a problem needs. */
const rearrangeTiles: Generator<RearrangeParams> = {
  id: 'tid-rearrange-tiles',
  sample: (rng, difficulty) => {
    const forms = REARRANGE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, k: rng.int(1, 9), v: rng.int(0, VARS.length - 1) };
  },
  render: ({ form, k, v }): Slide => {
    const f = REARRANGE_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    const answer = f.answer(c, k, letter);
    const distractors = [
      `${c}\\sin^2 ${letter}`,
      `${c}\\cos^2 ${letter}`,
      `${c}\\tan^2 ${letter}`,
      `-${c}\\sin^2 ${letter}`,
      `-${k}`,
      `${c}\\sec^2 ${letter}`,
      `${c}\\cos ${letter}`,
      `\\sin ${letter}`,
    ];
    const hint = {
      pyth: `$${identity.pyth(letter)}$`,
      tan: `$${identity.tan(letter)}$`,
      cot: `$${identity.cot(letter)}$`,
      quot: 'tangent as sine over cosine',
    }[f.from];
    return {
      kind: 'tiles',
      prompt: [prose(`Complete the line. It is ${hint}, rearranged${k === 1 ? '' : ` and multiplied by $${k}$`}.`)],
      template: f.template(c, k, letter),
      bank: bankOf(answer, distractors),
      answer,
      ...(f.unordered ? { unordered: true } : {}),
    };
  },
  solution: ({ form, k, v }) => {
    const f = REARRANGE_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    const answer = f.answer(c, k, letter);
    let line = f.template(c, k, letter);
    answer.forEach((token, i) => {
      line = line.replace(`{${i}}`, token);
    });
    const start = {
      pyth: identity.pyth(letter),
      tan: identity.tan(letter),
      cot: identity.cot(letter),
      quot: identity.quot(letter),
    }[f.from];
    return [
      { text: `Start from the identity:` },
      { tex: start },
      {
        text:
          k === 1
            ? 'Move terms across so the side you want stands alone.'
            : `Multiply every term by $${k}$, then move terms across so the side you want stands alone.`,
      },
      { tex: line },
    ];
  },
};

interface SimplifyChoiceParams {
  form: number;
  k: number;
  v: number;
}

interface ChoiceForm {
  hard: boolean;
  expr: (c: string, k: number, v: string) => string;
  right: (c: string, k: number, v: string) => string;
  wrong: (c: string, k: number, v: string) => string[];
  why: (c: string, k: number, v: string) => string;
}

const SIMPLIFY_CHOICE_FORMS: ChoiceForm[] = [
  {
    hard: false,
    expr: (c, _k, v) => `${c}(1 - \\sin^2 ${v})`,
    right: (c, _k, v) => `${c}\\cos^2 ${v}`,
    wrong: (c, k, v) => [`${c}\\sin^2 ${v}`, `${c}\\cos ${v}`, `${k} + ${c}\\cos^2 ${v}`],
    why: (_c, _k, v) => `$1 - \\sin^2 ${v} = \\cos^2 ${v}$.`,
  },
  {
    hard: false,
    expr: (c, _k, v) => `${c}\\sin^2 ${v} + ${c}\\cos^2 ${v}`,
    right: (_c, k) => `${k}`,
    wrong: (c, k, v) => [`${2 * k}`, `${c}\\tan^2 ${v}`, '0'],
    why: (c, k, v) => `Take out the $${k}$: $${c}(\\sin^2 ${v} + \\cos^2 ${v}) = ${c} \\times 1$.`,
  },
  {
    hard: false,
    expr: (c, _k, v) => `\\dfrac{${c}(1 - \\cos^2 ${v})}{\\sin ${v}}`,
    right: (c, _k, v) => `${c}\\sin ${v}`,
    wrong: (c, k, v) => [`${c}\\cos ${v}`, `${c}\\sin^2 ${v}`, `\\dfrac{${k}}{\\sin ${v}}`],
    why: (c, _k, v) => `The top is $${c}\\sin^2 ${v}$, and one $\\sin ${v}$ cancels.`,
  },
  {
    hard: false,
    expr: (c, k, v) => `${c}\\cos^2 ${v} - ${k}`,
    right: (c, _k, v) => `-${c}\\sin^2 ${v}`,
    wrong: (c, _k, v) => [`${c}\\sin^2 ${v}`, `-${c}\\cos^2 ${v}`, `${c}\\tan^2 ${v}`],
    why: (c, k, v) => `Take out $-${k}$: $-${c}(1 - \\cos^2 ${v}) = -${c}\\sin^2 ${v}$.`,
  },
  {
    hard: false,
    expr: (c, _k, v) => `\\dfrac{${c}\\sin^2 ${v}}{1 - \\sin^2 ${v}}`,
    right: (c, _k, v) => `${c}\\tan^2 ${v}`,
    wrong: (c, _k, v) => [`${c}\\cot^2 ${v}`, `${c}\\sin^2 ${v}`, `${c}\\sec^2 ${v}`],
    why: (c, _k, v) => `The bottom is $\\cos^2 ${v}$, and $\\frac{\\sin^2 ${v}}{\\cos^2 ${v}} = \\tan^2 ${v}$, so it is $${c}\\tan^2 ${v}$.`,
  },
  {
    hard: false,
    expr: (c, _k, v) => `${c}(1 - \\cos ${v})(1 + \\cos ${v})`,
    right: (c, _k, v) => `${c}\\sin^2 ${v}`,
    wrong: (c, _k, v) => [`${c}\\cos^2 ${v}`, `${c}(1 - \\cos^2 ${v})^2`, `-${c}\\sin^2 ${v}`],
    why: (c, _k, v) => `The brackets multiply to $1 - \\cos^2 ${v}$, the difference of two squares, which is $\\sin^2 ${v}$; so it is $${c}\\sin^2 ${v}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `${c}(\\sec^2 ${v} - 1)\\cos^2 ${v}`,
    right: (c, _k, v) => `${c}\\sin^2 ${v}`,
    wrong: (c, _k, v) => [`${c}\\tan^2 ${v}`, `${c}\\cos^2 ${v}`, `${c}\\sec^2 ${v}`],
    why: (c, _k, v) => `$\\sec^2 ${v} - 1 = \\tan^2 ${v}$, and $\\tan^2 ${v}\\cos^2 ${v} = \\sin^2 ${v}$, so it is $${c}\\sin^2 ${v}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `${c}\\tan ${v}\\cos ${v}`,
    right: (c, _k, v) => `${c}\\sin ${v}`,
    wrong: (c, _k, v) => [`${c}\\sin ${v}\\cos^2 ${v}`, `${c}\\cos ${v}`, `${c}`],
    why: (c, _k, v) => `$\\tan ${v} = \\frac{\\sin ${v}}{\\cos ${v}}$, and the cosines cancel, leaving $${c}\\sin ${v}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `${c}(1 + \\tan^2 ${v})\\cos^2 ${v}`,
    right: (_c, k) => `${k}`,
    wrong: (c, _k, v) => [`${c}\\sin^2 ${v}`, `${c}\\sec^2 ${v}`, `${c}\\cos^4 ${v}`],
    why: (c, k, v) => `$1 + \\tan^2 ${v} = \\sec^2 ${v} = \\frac{1}{\\cos^2 ${v}}$, so the cosines cancel and $${c}\\sec^2 ${v}\\cos^2 ${v} = ${k}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `\\dfrac{${c}\\sin ${v}}{\\tan ${v}}`,
    right: (c, _k, v) => `${c}\\cos ${v}`,
    wrong: (c, _k, v) => [`${c}\\sin ${v}`, `${c}\\sec ${v}`, `${c}\\sin^2 ${v}`],
    why: (c, _k, v) => `Dividing by $\\frac{\\sin ${v}}{\\cos ${v}}$ multiplies by $\\frac{\\cos ${v}}{\\sin ${v}}$, leaving $${c}\\cos ${v}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `${c}(\\operatorname{cosec}^2 ${v} - \\cot^2 ${v})`,
    right: (_c, k) => `${k}`,
    wrong: (c, k, v) => [`${c}\\sin^2 ${v}`, `-${k}`, `${c}\\tan^2 ${v}`],
    why: (_c, k, v) => `From $${identity.cot(v)}$, the bracket is $1$, so it is $${k}$.`,
  },
];

const SIMPLIFY_CHOICE_STEMS = [
  'Which of these is the same as',
  'Which is this written more simply?',
  'Pick the simplest equal expression.',
];

/** Which simpler expression is this equal to? */
const simplifyChoice: Generator<SimplifyChoiceParams & { stem: number }> = {
  id: 'tid-simplify-choice',
  sample: (rng, difficulty) => {
    const forms = SIMPLIFY_CHOICE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return {
      form: rng.pick(forms).i,
      k: rng.int(1, 6),
      v: rng.int(0, VARS.length - 1),
      stem: rng.int(0, SIMPLIFY_CHOICE_STEMS.length - 1),
    };
  },
  render: (p): Slide => {
    const f = SIMPLIFY_CHOICE_FORMS[p.form];
    const c = co(p.k);
    const v = VARS[p.v];
    return choiceSlide(
      [prose(SIMPLIFY_CHOICE_STEMS[p.stem]), display(f.expr(c, p.k, v))],
      f.right(c, p.k, v),
      f.wrong(c, p.k, v),
      saltOf(p),
    );
  },
  solution: ({ form, k, v }) => {
    const f = SIMPLIFY_CHOICE_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    return [{ text: f.why(c, k, letter) }, { tex: `${f.expr(c, k, letter)} = ${f.right(c, k, letter)}` }];
  },
};

interface ValueParams {
  form: number;
  p: number;
  q: number;
  k: number;
  b: number;
  v: number;
}

interface ValueForm {
  hard: boolean;
  given: 'sin' | 'cos' | 'tan';
  expr: (p: ValueParams, v: string) => string;
  /** The value, as a fraction over q^2 (or p^2 for the tan^2 form). */
  value: (p: ValueParams) => Rat;
  slips: (p: ValueParams) => Rat[];
  why: (p: ValueParams, v: string) => SolutionStep[];
}

const sq = (n: number) => n * n;

const VALUE_FORMS: ValueForm[] = [
  {
    hard: false,
    given: 'sin',
    expr: ({ k }, v) => `${k} - ${k}\\cos^2 ${v}`,
    value: ({ k, p, q }) => rat(k * sq(p), sq(q)),
    slips: ({ k, p, q }) => [rat(k * p, q), rat(k * (sq(q) - sq(p)), sq(q)), rat(sq(p), sq(q))],
    why: ({ k, p, q }, v) => [
      { text: `Take out the $${k}$ and use $1 - \\cos^2 ${v} = \\sin^2 ${v}$:` },
      { tex: `${k} - ${k}\\cos^2 ${v} = ${k}\\sin^2 ${v} = ${k} \\times \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(k * sq(p), sq(q)))}` },
    ],
  },
  {
    hard: false,
    given: 'cos',
    expr: ({ k }, v) => `${k} - ${k}\\sin^2 ${v}`,
    value: ({ k, p, q }) => rat(k * sq(p), sq(q)),
    slips: ({ k, p, q }) => [rat(k * p, q), rat(k * (sq(q) - sq(p)), sq(q)), rat(sq(p), sq(q))],
    why: ({ k, p, q }, v) => [
      { text: `Take out the $${k}$ and use $1 - \\sin^2 ${v} = \\cos^2 ${v}$:` },
      { tex: `${k} - ${k}\\sin^2 ${v} = ${k}\\cos^2 ${v} = ${k} \\times \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(k * sq(p), sq(q)))}` },
    ],
  },
  {
    hard: false,
    given: 'sin',
    expr: ({ k }, v) => `${co(k)}\\cos^2 ${v}`,
    value: ({ k, p, q }) => rat(k * (sq(q) - sq(p)), sq(q)),
    slips: ({ k, p, q }) => [rat(k * sq(p), sq(q)), rat(k * (q - p), q), rat(k * (sq(q) + sq(p)), sq(q))],
    why: ({ k, p, q }, v) => [
      { text: `$\\cos^2 ${v} = 1 - \\sin^2 ${v}$, so there is no need to find the angle:` },
      { tex: `\\cos^2 ${v} = 1 - \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(sq(q) - sq(p), sq(q)))}` },
      ...(k === 1 ? [] : [{ tex: `${k}\\cos^2 ${v} = ${ratTex(rat(k * (sq(q) - sq(p)), sq(q)))}` }]),
    ],
  },
  {
    hard: false,
    given: 'cos',
    expr: ({ k }, v) => `${co(k)}\\sin^2 ${v}`,
    value: ({ k, p, q }) => rat(k * (sq(q) - sq(p)), sq(q)),
    slips: ({ k, p, q }) => [rat(k * sq(p), sq(q)), rat(k * (q - p), q), rat(k * (sq(q) + sq(p)), sq(q))],
    why: ({ k, p, q }, v) => [
      { text: `$\\sin^2 ${v} = 1 - \\cos^2 ${v}$, so there is no need to find the angle:` },
      { tex: `\\sin^2 ${v} = 1 - \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(sq(q) - sq(p), sq(q)))}` },
      ...(k === 1 ? [] : [{ tex: `${k}\\sin^2 ${v} = ${ratTex(rat(k * (sq(q) - sq(p)), sq(q)))}` }]),
    ],
  },
  {
    hard: true,
    given: 'sin',
    expr: ({ k, b }, v) => `${k}\\sin^2 ${v} + ${b}\\cos^2 ${v}`,
    value: ({ k, b, p, q }) => rat(b * sq(q) + (k - b) * sq(p), sq(q)),
    slips: ({ k, b, p, q }) => [rat(k * sq(p) + b * sq(p), sq(q)), rat(k + b, 1), rat(k * sq(q) + (b - k) * sq(p), sq(q))],
    why: ({ k, b, p, q }, v) => [
      { text: `Write $\\cos^2 ${v}$ as $1 - \\sin^2 ${v}$, so everything is in terms of the sine you know:` },
      { tex: `${k}\\sin^2 ${v} + ${b}(1 - \\sin^2 ${v}) = ${b} + ${signed(k - b, `\\sin^2 ${v}`, true)}` },
      { tex: `= ${b} + ${k - b === 1 ? '' : k - b === -1 ? '-' : k - b}\\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(b * sq(q) + (k - b) * sq(p), sq(q)))}` },
    ],
  },
  {
    hard: true,
    given: 'tan',
    expr: ({ k }, v) => `${co(k)}\\sec^2 ${v}`,
    value: ({ k, p, q }) => rat(k * (sq(q) + sq(p)), sq(q)),
    slips: ({ k, p, q }) => [rat(k * sq(p), sq(q)), rat(k * (sq(q) - sq(p)), sq(q)), rat(k * (q + p), q)],
    why: ({ k, p, q }, v) => [
      { text: `$\\sec^2 ${v} = 1 + \\tan^2 ${v}$:` },
      { tex: `\\sec^2 ${v} = 1 + \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(sq(q) + sq(p), sq(q)))}` },
      ...(k === 1 ? [] : [{ tex: `${k}\\sec^2 ${v} = ${ratTex(rat(k * (sq(q) + sq(p)), sq(q)))}` }]),
    ],
  },
  {
    hard: true,
    given: 'cos',
    expr: ({ k }, v) => `${co(k)}\\tan^2 ${v}`,
    value: ({ k, p, q }) => rat(k * (sq(q) - sq(p)), sq(p)),
    slips: ({ k, p, q }) => [rat(k * (sq(q) - sq(p)), sq(q)), rat(k * sq(q), sq(p)), rat(k * (sq(q) + sq(p)), sq(p))],
    why: ({ k, p, q }, v) => [
      { text: `$\\tan^2 ${v} = \\sec^2 ${v} - 1$, and $\\sec ${v} = \\frac{1}{\\cos ${v}} = \\frac{${q}}{${p}}$:` },
      { tex: `\\tan^2 ${v} = \\left(\\frac{${q}}{${p}}\\right)^2 - 1 = ${ratTex(rat(sq(q) - sq(p), sq(p)))}` },
      ...(k === 1 ? [] : [{ tex: `${k}\\tan^2 ${v} = ${ratTex(rat(k * (sq(q) - sq(p)), sq(p)))}` }]),
    ],
  },
];

const GIVEN_TEX: Record<'sin' | 'cos' | 'tan', string> = { sin: '\\sin', cos: '\\cos', tan: '\\tan' };

/** A value found through an identity, without ever finding the angle. */
const valueFromIdentity: Generator<ValueParams> = {
  id: 'tid-value-from-identity',
  sample: (rng, difficulty) => {
    const forms = VALUE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    const form = rng.pick(forms).i;
    for (;;) {
      const q = rng.int(2, 7);
      const p = rng.int(1, q - 1);
      if (gcd(p, q) !== 1) continue;
      const k = rng.int(1, 5);
      let b = rng.int(1, 5);
      if (b === k) b = k === 5 ? 1 : k + 1;
      return { form, p, q, k, b, v: rng.int(0, VARS.length - 1) };
    }
  },
  render: (params): Slide => {
    const f = VALUE_FORMS[params.form];
    const v = VARS[params.v];
    return {
      kind: 'expression',
      prompt: [
        prose(
          `Given that $${GIVEN_TEX[f.given]} ${v} = \\frac{${params.p}}{${params.q}}$, find the exact value without finding $${v}$.`,
        ),
      ],
      lead: `${f.expr(params, v)} =`,
      keypad: NUMBER_KEYS,
      answer: ratAnswer(f.value(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (params) => {
    const f = VALUE_FORMS[params.form];
    return ratOptions(f.value(params), f.slips(params));
  },
  solution: (params) => VALUE_FORMS[params.form].why(params, VARS[params.v]),
};

/* ---------- Level 1, lesson 2: choosing the identity ---------- */

type IdentityKey = 'pyth' | 'tan' | 'quot' | 'cot';

interface WhichForm {
  hard: boolean;
  uses: IdentityKey;
  expr: (c: string, v: string) => string;
  result: (c: string, v: string) => string;
}

const WHICH_FORMS: WhichForm[] = [
  { hard: false, uses: 'pyth', expr: (c, v) => `${c}(1 - \\cos^2 ${v})`, result: (c, v) => `${c}\\sin^2 ${v}` },
  { hard: false, uses: 'tan', expr: (c, v) => `${c}(\\sec^2 ${v} - 1)`, result: (c, v) => `${c}\\tan^2 ${v}` },
  { hard: false, uses: 'quot', expr: (c, v) => `${c}\\tan ${v}\\cos ${v}`, result: (c, v) => `${c}\\sin ${v}` },
  { hard: false, uses: 'cot', expr: (c, v) => `${c}(\\operatorname{cosec}^2 ${v} - 1)`, result: (c, v) => `${c}\\cot^2 ${v}` },
  { hard: false, uses: 'pyth', expr: (c, v) => `${c}(\\sin^2 ${v} - 1)`, result: (c, v) => `-${c}\\cos^2 ${v}` },
  { hard: true, uses: 'quot', expr: (c, v) => `\\dfrac{${c}\\sin ${v}}{\\tan ${v}}`, result: (c, v) => `${c}\\cos ${v}` },
  { hard: true, uses: 'tan', expr: (c, v) => `${c}(1 + \\tan^2 ${v})`, result: (c, v) => `${c}\\sec^2 ${v}` },
  { hard: true, uses: 'cot', expr: (c, v) => `${c}(1 + \\cot^2 ${v})`, result: (c, v) => `${c}\\operatorname{cosec}^2 ${v}` },
  { hard: true, uses: 'pyth', expr: (c, v) => `${c}(\\cos^2 ${v} - 1)`, result: (c, v) => `-${c}\\sin^2 ${v}` },
];

const IDENTITY_ORDER: IdentityKey[] = ['pyth', 'tan', 'quot', 'cot'];

interface WhichParams {
  form: number;
  k: number;
  v: number;
}

/** Which identity does this expression call for, and what does it become? */
const whichIdentityFlow: Generator<WhichParams> = {
  id: 'tid-which-identity-flow',
  sample: (rng, difficulty) => {
    const forms = WHICH_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, k: rng.int(1, 9), v: rng.int(0, VARS.length - 1) };
  },
  render: ({ form, k, v }): Slide => {
    const f = WHICH_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    const labels = IDENTITY_ORDER.map((key) => `$${identity[key](letter)}$`);
    const right = f.result(c, letter);
    const others = WHICH_FORMS.map((g) => g.result(c, letter)).filter((r) => r !== right);
    // The results of the forms nearest this one: same letter and coefficient, a different function.
    const wrong = [...new Set(others)].sort((a, b) => hashSeed(a + form) - hashSeed(b + form)).slice(0, 3);
    const results = [right, ...wrong].sort((a, b) => hashSeed(a) - hashSeed(b));
    return {
      kind: 'flow',
      prompt: [prose('Choose the identity that simplifies this, then say what it becomes.')],
      subject: f.expr(c, letter),
      steps: [
        {
          id: 'identity',
          ask: 'Which identity does this call for?',
          branches: labels.map((label) => ({ label, to: 'result' })),
        },
        {
          id: 'result',
          ask: 'So it simplifies to',
          branches: results.map((r) => ({ label: `$${r}$`, outcome: 'One term, one function.' })),
        },
      ],
      answer: [labels[IDENTITY_ORDER.indexOf(f.uses)], `$${right}$`],
    };
  },
  solution: ({ form, k, v }) => {
    const f = WHICH_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    const reason: Record<IdentityKey, string> = {
      pyth: `A $1$ beside a squared sine or cosine is the Pythagorean identity, $${identity.pyth(letter)}$.`,
      tan: `A $\\sec^2$ or $\\tan^2$ beside a $1$ is $${identity.tan(letter)}$.`,
      quot: `A tangent next to a sine or cosine wants writing as $${identity.quot(letter)}$.`,
      cot: `A $\\operatorname{cosec}^2$ or $\\cot^2$ beside a $1$ is $${identity.cot(letter)}$.`,
    };
    return [{ text: reason[f.uses] }, { tex: `${f.expr(c, letter)} = ${f.result(c, letter)}` }];
  },
};

interface ConstantParams {
  form: number;
  a: number;
  b: number;
  angle: number;
}

interface ConstantForm {
  hard: boolean;
  expr: (a: number, b: number, t: string) => string;
  value: (a: number, b: number) => number;
  slips: (a: number, b: number) => number[];
  why: (a: number, b: number, t: string) => string;
}

const CONSTANT_FORMS: ConstantForm[] = [
  {
    hard: false,
    expr: (a, _b, t) => `${a}\\sin^2 ${t} + ${a}\\cos^2 ${t}`,
    value: (a) => a,
    slips: (a) => [2 * a, 0, a * a],
    why: (a, _b, t) => `Take out the $${a}$: the bracket is $\\sin^2 ${t} + \\cos^2 ${t} = 1$.`,
  },
  {
    hard: false,
    expr: (a, b, t) => `${a}\\cos^2 ${t} + ${b} + ${a}\\sin^2 ${t}`,
    value: (a, b) => a + b,
    slips: (a, b) => [b, 2 * a + b, a * b],
    why: (a, b, t) => `The two squared terms make $${a}(\\sin^2 ${t} + \\cos^2 ${t}) = ${a}$, and the $${b}$ is added on.`,
  },
  {
    hard: false,
    expr: (a, b, t) => `${a}\\sin^2 ${t} - ${b} + ${a}\\cos^2 ${t}`,
    value: (a, b) => a - b,
    slips: (a, b) => [a + b, -b, 2 * a - b],
    why: (a, b, t) => `The two squared terms make $${a}(\\sin^2 ${t} + \\cos^2 ${t}) = ${a}$, and then $${b}$ is taken off.`,
  },
  {
    hard: true,
    expr: (a, _b, t) => `${a}\\sec^2 ${t} - ${a}\\tan^2 ${t}`,
    value: (a) => a,
    slips: (a) => [-a, 2 * a, 0],
    why: (a, _b, t) => `$\\sec^2 ${t} - \\tan^2 ${t} = 1$, from $1 + \\tan^2 = \\sec^2$, so it is $${a}$.`,
  },
  {
    hard: true,
    expr: (a, _b, t) => `${a}\\operatorname{cosec}^2 ${t} - ${a}\\cot^2 ${t}`,
    value: (a) => a,
    slips: (a) => [-a, 2 * a, 0],
    why: (a, _b, t) => `$\\operatorname{cosec}^2 ${t} - \\cot^2 ${t} = 1$, from $1 + \\cot^2 = \\operatorname{cosec}^2$, so it is $${a}$.`,
  },
  {
    hard: true,
    expr: (a, _b, t) => `${a}(1 + \\tan^2 ${t})\\cos^2 ${t}`,
    value: (a) => a,
    slips: (a) => [2 * a, 0, a + 1],
    why: (a, _b, t) => `$1 + \\tan^2 ${t} = \\sec^2 ${t} = \\frac{1}{\\cos^2 ${t}}$, so the cosines cancel and it is $${a}$.`,
  },
  {
    hard: true,
    expr: (a, _b, t) => `${a}(\\sin ${t} + \\cos ${t})^2 + ${a}(\\sin ${t} - \\cos ${t})^2`,
    value: (a) => 2 * a,
    slips: (a) => [a, 4 * a, 0],
    why: (a, _b, t) =>
      `Expanding, the $2\\sin ${t}\\cos ${t}$ terms cancel and each bracket leaves $\\sin^2 ${t} + \\cos^2 ${t} = 1$, so it is $${a} \\times 2$.`,
  },
];

/** Angles with no table value, so a calculator is no help and the identity is the only way. */
const AWKWARD_ANGLES = [10, 20, 25, 35, 40, 50, 55, 65, 70, 80];

/** An expression whose value is the same at every angle. */
const constantValue: Generator<ConstantParams> = {
  id: 'tid-constant-value',
  sample: (rng, difficulty) => {
    const forms = CONSTANT_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    const a = rng.int(2, 9);
    let b = rng.int(1, 9);
    if (b === a) b = a === 9 ? 1 : a + 1;
    return { form: rng.pick(forms).i, a, b, angle: rng.pick(AWKWARD_ANGLES) };
  },
  render: ({ form, a, b, angle }): Slide => ({
    kind: 'expression',
    prompt: [prose('Find the exact value. No calculator is needed.')],
    lead: `${CONSTANT_FORMS[form].expr(a, b, deg(angle))} =`,
    keypad: NUMBER_KEYS,
    answer: `${CONSTANT_FORMS[form].value(a, b)}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ form, a, b }) => {
    const f = CONSTANT_FORMS[form];
    const right = f.value(a, b);
    const kept = [...new Set(f.slips(a, b))].filter((n) => n !== right).slice(0, 3);
    return options({ tex: `${right}`, answer: `${right}` }, ...kept.map((n) => ({ tex: `${n}`, answer: `${n}` })));
  },
  solution: ({ form, a, b, angle }) => {
    const f = CONSTANT_FORMS[form];
    return [
      { text: f.why(a, b, deg(angle)) },
      { tex: `${f.expr(a, b, deg(angle))} = ${f.value(a, b)}` },
      { text: `It would be the same at any angle: $${deg(angle)}$ never mattered.` },
    ];
  },
};

/* ---------- Level 1, lesson 3: equations that are quadratics in disguise ---------- */

/** Roots as fractions. Inside -1..1 a sine or cosine can take them; outside it cannot. */
const VALID_ROOTS: Rat[] = [
  [1, 2],
  [-1, 2],
  [0, 1],
  [1, 1],
  [-1, 1],
];
const TWO_SOLUTION_ROOTS: Rat[] = [
  [1, 2],
  [-1, 2],
  [0, 1],
];
const INVALID_ROOTS: Rat[] = [
  [2, 1],
  [-2, 1],
  [3, 1],
  [-3, 1],
  [3, 2],
  [-3, 2],
];

/** (d1 s - n1)(d2 s - n2) = A s^2 + B s + C. */
function quadratic(r1: Rat, r2: Rat): [number, number, number] {
  const [n1, d1] = r1;
  const [n2, d2] = r2;
  return [d1 * d2, -(d1 * n2 + d2 * n1), n1 * n2];
}

const sameRat = (a: Rat, b: Rat) => a[0] * b[1] === b[0] * a[1];

/** A quadratic in fn x: 2\\sin^2 x - \\sin x - 1. */
function quadTex(A: number, B: number, C: number, fn: string, v = 'x'): string {
  return polyTex([
    [A, `\\${fn}^2 ${v}`],
    [B, `\\${fn} ${v}`],
    [C, ''],
  ]);
}

/** The equation, either with everything on the left or with the square alone on the left. */
function quadEquationTex(A: number, B: number, C: number, fn: string, rearranged: boolean): string {
  if (!rearranged) return `${quadTex(A, B, C, fn)} = 0`;
  const right = polyTex([
    [-B, `\\${fn} x`],
    [-C, ''],
  ]);
  return `${quadTex(A, 0, 0, fn)} = ${right}`;
}

/** A factor as written: (2\\sin x - 1), or \\sin x alone for a root of zero. */
function factorTex([n, d]: Rat, fn: string): string {
  if (n === 0) return `\\${fn} x`;
  return `(${d === 1 ? '' : d}\\${fn} x ${n > 0 ? '-' : '+'} ${Math.abs(n)})`;
}

interface QuadTreeParams {
  fn: 'sin' | 'cos';
  roots: [Rat, Rat];
  rearranged: boolean;
}

function sortedRoots(roots: [Rat, Rat]): [Rat, Rat] {
  return [...roots].sort((a, b) => ratValue(a) - ratValue(b)) as [Rat, Rat];
}

const QUAD_TREE_PROMPTS = [
  `Factorise to find the two values of {f} (smaller first on the top row). Then, under each, every solution with $0^{\\circ} \\le x < 360^{\\circ}$, smallest first. A value outside $-1$ to $1$ gives no angle.`,
  `Top row: the two values {f} can take, smaller first. Underneath: the angles from $0^{\\circ}$ up to $360^{\\circ}$ they give, smallest first. A value beyond $\\pm 1$ has nothing under it.`,
];

/** Solve a quadratic in sin x or cos x: two values, then the angles each one gives. */
const quadraticTree: Generator<QuadTreeParams & { phrasing: number }> = {
  id: 'tid-quadratic-tree',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    let roots: [Rat, Rat];
    if (difficulty > 1) {
      for (;;) {
        const pair = rng.sample(VALID_ROOTS, 2) as [Rat, Rat];
        if (!sameRat(pair[0], pair[1])) {
          roots = pair;
          break;
        }
      }
    } else {
      roots = [rng.pick(TWO_SOLUTION_ROOTS), rng.pick(INVALID_ROOTS)];
    }
    return { fn, roots: sortedRoots(roots), rearranged: rng.chance(0.5), phrasing: rng.int(0, QUAD_TREE_PROMPTS.length - 1) };
  },
  render: ({ fn, roots, rearranged, phrasing }): Slide => {
    const [A, B, C] = quadratic(roots[0], roots[1]);
    const rootToken = (r: Rat) => `\\${fn} x = ${ratTex(r)}`;
    const nodes: { id: string; from: string[] }[] = [
      { id: 'r0', from: [] },
      { id: 'r1', from: [] },
    ];
    const answer = [rootToken(roots[0]), rootToken(roots[1])];
    roots.forEach((r, i) => {
      solutionsOf(fn, ratValue(r)).forEach((d, j) => {
        nodes.push({ id: `s${i}${j}`, from: [`r${i}`] });
        answer.push(deg(d));
      });
    });
    const other = fn === 'sin' ? 'cos' : 'sin';
    const distractors = [
      ...roots.map((r) => rootToken([-r[0], r[1]])),
      ...roots.flatMap((r) => (Math.abs(ratValue(r)) <= 1 ? solutionsOf(other, ratValue(r)).map(deg) : [])),
      ...roots.flatMap((r) => (Math.abs(ratValue(r)) <= 1 ? solutionsOf(fn, -ratValue(r)).map(deg) : [])),
    ];
    return {
      kind: 'tree',
      prompt: [prose(QUAD_TREE_PROMPTS[phrasing].replace('{f}', `$\\${fn} x$`))],
      expression: quadEquationTex(A, B, C, fn, rearranged),
      nodes,
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: ({ fn, roots, rearranged }) => {
    const [A, B, C] = quadratic(roots[0], roots[1]);
    const steps: SolutionStep[] = [];
    if (rearranged) {
      steps.push({ text: 'Bring everything to one side first:' }, { tex: `${quadTex(A, B, C, fn)} = 0` });
    }
    steps.push(
      { text: `It is a quadratic in $\\${fn} x$, so it factorises like any other quadratic:` },
      { tex: `${factorTex(roots[0], fn)}${factorTex(roots[1], fn)} = 0` },
      { tex: `\\${fn} x = ${ratTex(roots[0])} \\quad \\text{or} \\quad \\${fn} x = ${ratTex(roots[1])}` },
    );
    for (const r of roots) {
      const sols = solutionsOf(fn, ratValue(r));
      steps.push({
        text:
          sols.length === 0
            ? `$\\${fn} x = ${ratTex(r)}$ has no solutions: $\\${fn} x$ never goes beyond $-1$ to $1$.`
            : `$\\${fn} x = ${ratTex(r)}$ gives $x = ${sols.map(deg).join(' \\text{ or } ')}$.`,
      });
    }
    return steps;
  },
};

interface DisguisedParams {
  target: 'sin' | 'cos' | 'tan';
  roots: [Rat, Rat];
}

/** Roots for a disguised quadratic: no zero root and no opposite pair, so all three terms are there. */
function disguisedRoots(rng: Rng, target: 'sin' | 'cos' | 'tan'): [Rat, Rat] {
  for (;;) {
    const r1 = rng.pick(target === 'tan' ? ([[1, 1], [-1, 1], [1, 2], [-1, 2], [2, 1], [-2, 1], [3, 1], [-3, 1]] as Rat[]) : VALID_ROOTS);
    const r2 = rng.pick([...VALID_ROOTS, ...INVALID_ROOTS]);
    if (r1[0] === 0 || r2[0] === 0 || sameRat(r1, r2) || ratValue(r1) === -ratValue(r2)) continue;
    const [A, , C] = quadratic(r1, r2);
    const constant = target === 'tan' ? C - A : A + C;
    if (constant === 0) continue;
    return sortedRoots([r1, r2]);
  }
}

/** What the disguised equation shows: A cos^2 x - B sin x - (A + C) = 0 for a sine target, and so on. */
function disguisedTex({ target, roots }: DisguisedParams): string {
  const [A, B, C] = quadratic(roots[0], roots[1]);
  if (target === 'sin') {
    return `${polyTex([
      [A, '\\cos^2 x'],
      [-B, '\\sin x'],
      [-(A + C), ''],
    ])} = 0`;
  }
  if (target === 'cos') {
    return `${polyTex([
      [A, '\\sin^2 x'],
      [-B, '\\cos x'],
      [-(A + C), ''],
    ])} = 0`;
  }
  return `${polyTex([
    [A, '\\sec^2 x'],
    [B, '\\tan x'],
    [C - A, ''],
  ])} = 0`;
}

const DISGUISE_HINT: Record<'sin' | 'cos' | 'tan', string> = {
  sin: '$\\cos^2 x = 1 - \\sin^2 x$',
  cos: '$\\sin^2 x = 1 - \\cos^2 x$',
  tan: '$\\sec^2 x = 1 + \\tan^2 x$',
};

/** Rewrite a two-function equation as a quadratic in one function. */
const disguisedTiles: Generator<DisguisedParams> = {
  id: 'tid-disguised-tiles',
  sample: (rng, difficulty) => {
    const target = difficulty > 1 ? rng.pick(['sin', 'cos', 'tan'] as const) : rng.pick(['sin', 'cos'] as const);
    return { target, roots: disguisedRoots(rng, target) };
  },
  render: (p): Slide => {
    const [A, B, C] = quadratic(p.roots[0], p.roots[1]);
    const f = p.target;
    const other = f === 'sin' ? 'cos' : f === 'cos' ? 'sin' : 'sec';
    const answer = [signed(A, `\\${f}^2 x`, true), signed(B, `\\${f} x`), signed(C, '')];
    const distractors = [
      signed(-B, `\\${f} x`),
      signed(-C, ''),
      signed(A, `\\${other}^2 x`, true),
      signed(C + 2 * A, ''),
      signed(-A, `\\${f}^2 x`, true),
    ];
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `Use ${DISGUISE_HINT[f]} to write this as a quadratic in $\\${f} x$, with the squared term positive.`,
        ),
        display(disguisedTex(p)),
      ],
      template: '{0} {1} {2} = 0',
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const [A, B, C] = quadratic(p.roots[0], p.roots[1]);
    const f = p.target;
    const steps: SolutionStep[] = [{ text: `Replace using ${DISGUISE_HINT[f]}, so only $\\${f} x$ is left.` }];
    if (f === 'tan') {
      steps.push(
        { tex: `${A === 1 ? '' : A}(1 + \\tan^2 x) ${signed(B, '\\tan x')} ${signed(C - A, '')} = 0` },
        { text: `Multiply out the bracket and collect the numbers: $${A} ${signed(C - A, '')} = ${C}$.` },
      );
    } else {
      const other = f === 'sin' ? 'cos' : 'sin';
      steps.push(
        { tex: `${A === 1 ? '' : A}(1 - \\${f}^2 x) ${signed(-B, `\\${f} x`)} ${signed(-(A + C), '')} = 0` },
        {
          text: `Multiply out and collect the numbers, then multiply through by $-1$ so the $\\${f}^2 x$ term is positive. (The $\\${other}^2$ has gone, which was the point.)`,
        },
      );
    }
    steps.push({ tex: `${quadTex(A, B, C, f)} = 0` });
    return steps;
  },
};

interface CountParams {
  fn: Fn;
  roots: [Rat, Rat];
  factorised: boolean;
}

/** How many solutions a root gives in one turn. */
function countFor(fn: Fn, r: Rat): number {
  if (fn === 'tan') return 2;
  const v = Math.abs(ratValue(r));
  if (v > 1) return 0;
  return v === 1 ? 1 : 2;
}

const COUNT_ROOTS: Rat[] = [...VALID_ROOTS, ...INVALID_ROOTS];

/** How many solutions in one turn? Each value of the function is its own small question. */
const solutionCount: Generator<CountParams> = {
  id: 'tid-solution-count',
  sample: (rng, difficulty) => {
    const fn = rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const));
    for (;;) {
      const pair = rng.sample(COUNT_ROOTS, 2) as [Rat, Rat];
      if (sameRat(pair[0], pair[1])) continue;
      return { fn, roots: sortedRoots(pair), factorised: difficulty === 1 || rng.chance(0.3) };
    }
  },
  render: (p): Slide => {
    const [A, B, C] = quadratic(p.roots[0], p.roots[1]);
    const equation = p.factorised
      ? `${factorTex(p.roots[0], p.fn)}${factorTex(p.roots[1], p.fn)} = 0`
      : `${quadTex(A, B, C, p.fn)} = 0`;
    const right = countFor(p.fn, p.roots[0]) + countFor(p.fn, p.roots[1]);
    const near = [0, 1, 2, 3, 4].filter((n) => n !== right).sort((a, b) => Math.abs(a - right) - Math.abs(b - right));
    return choiceSlide(
      [prose('How many solutions does this have with $0^{\\circ} \\le x < 360^{\\circ}$?'), display(equation)],
      `${right}`,
      near.map(String),
      saltOf(p),
    );
  },
  solution: (p) => {
    const steps: SolutionStep[] = [];
    if (!p.factorised) {
      steps.push({ tex: `${factorTex(p.roots[0], p.fn)}${factorTex(p.roots[1], p.fn)} = 0` });
    }
    for (const r of p.roots) {
      const n = countFor(p.fn, r);
      const why =
        p.fn === 'tan'
          ? 'tangent takes every value twice in a turn'
          : n === 0
            ? `$\\${p.fn} x$ never goes beyond $-1$ to $1$`
            : n === 1
              ? `the curve only touches $${ratTex(r)}$ at its ${ratValue(r) > 0 ? 'peak' : 'trough'}`
              : 'the level line crosses the curve twice in a turn';
      steps.push({ text: `$\\${p.fn} x = ${ratTex(r)}$: ${n} solution${n === 1 ? '' : 's'}, since ${why}.` });
    }
    steps.push({ text: `In total, $${countFor(p.fn, p.roots[0]) + countFor(p.fn, p.roots[1])}$.` });
    return steps;
  },
};

interface SolutionSliderParams {
  fn: 'sin' | 'cos';
  roots: [Rat, Rat];
  largest: boolean;
  factorised: boolean;
}

const DEGREE = Math.PI / 180;

/** Every solution of the pair of roots in 0 <= x < 360, smallest first. */
function allSolutions(fn: 'sin' | 'cos', roots: Rat[]): number[] {
  return roots.flatMap((r) => (Math.abs(ratValue(r)) <= 1 ? solutionsOf(fn, ratValue(r)) : [])).sort((a, b) => a - b);
}

/** The factored equation's graph: drag to the smallest or largest solution. */
const solutionSlider: Generator<SolutionSliderParams> = {
  id: 'tid-solution-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const fn = rng.pick(['sin', 'cos'] as const);
      const roots: [Rat, Rat] =
        difficulty > 1
          ? (rng.sample(VALID_ROOTS, 2) as [Rat, Rat])
          : [rng.pick(TWO_SOLUTION_ROOTS), rng.pick(INVALID_ROOTS.filter((r) => Math.abs(ratValue(r)) <= 2))];
      if (sameRat(roots[0], roots[1])) continue;
      const p = { fn, roots: sortedRoots(roots), largest: rng.chance(0.5), factorised: rng.chance(0.5) };
      const sols = allSolutions(fn, p.roots);
      const answer = p.largest ? sols[sols.length - 1] : sols[0];
      // The untouched slider rests at 180; never make that the answer, nor the left end.
      if (answer === 180 || answer === 0) continue;
      return p;
    }
  },
  render: (p): Slide => {
    const [A, B, C] = quadratic(p.roots[0], p.roots[1]);
    const sols = allSolutions(p.fn, p.roots);
    const answer = p.largest ? sols[sols.length - 1] : sols[0];
    const equation = p.factorised
      ? `${factorTex(p.roots[0], p.fn)}${factorTex(p.roots[1], p.fn)} = 0`
      : `${quadTex(A, B, C, p.fn)} = 0`;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (x) => (p.fn === 'sin' ? Math.sin(x * DEGREE) : Math.cos(x * DEGREE)), accent: true }],
      horizontals: p.roots.map(ratValue),
      yMin: -2.4,
      yMax: 2.4,
      label: `The graph of y = ${p.fn} x from 0 to 360 degrees, with dashed level lines at the two values the equation allows`,
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `The dashed lines are the two values of $\\${p.fn} x$ that solve the equation. Slide to the ${p.largest ? 'largest' : 'smallest'} solution with $0^{\\circ} < x < 360^{\\circ}$.`,
        ),
        display(equation),
      ],
      min: 0,
      max: 360,
      step: 15,
      answer,
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: (p) => {
    const sols = allSolutions(p.fn, p.roots);
    const answer = p.largest ? sols[sols.length - 1] : sols[0];
    return [
      { tex: `\\${p.fn} x = ${ratTex(p.roots[0])} \\quad \\text{or} \\quad \\${p.fn} x = ${ratTex(p.roots[1])}` },
      ...p.roots.map((r) => ({
        text:
          Math.abs(ratValue(r)) > 1
            ? `The line at $${ratTex(r)}$ misses the curve entirely: no solutions.`
            : `The line at $${ratTex(r)}$ meets the curve at $${solutionsOf(p.fn, ratValue(r)).map(deg).join(', ')}$.`,
      })),
      { text: `The ${p.largest ? 'largest' : 'smallest'} of all of them is $${deg(answer)}$.` },
    ];
  },
};

/* ---------- Level 1, lesson 4: equations in tan ---------- */

/** Tangent values at multiples of 30 and 45 degrees, with the equation that produces each. */
const TAN_FORMS: { t: number; sinCoef: string; cosCoef: string }[] = [
  { t: 1, sinCoef: '', cosCoef: '' },
  { t: Math.sqrt(3), sinCoef: '', cosCoef: '\\sqrt{3}' },
  { t: 1 / Math.sqrt(3), sinCoef: '\\sqrt{3}', cosCoef: '' },
  { t: -1, sinCoef: '', cosCoef: '' },
  { t: -Math.sqrt(3), sinCoef: '', cosCoef: '\\sqrt{3}' },
  { t: -1 / Math.sqrt(3), sinCoef: '\\sqrt{3}', cosCoef: '' },
];

interface TanEqParams {
  form: number;
  k: number;
  /** Written with everything on one side. */
  moved: boolean;
}

/** a sin x = b cos x, or a sin x - b cos x = 0, with a k in front of both. */
function tanEquationTex({ form, k, moved }: TanEqParams): string {
  const { t, sinCoef, cosCoef } = TAN_FORMS[form];
  const s = `${co(k)}${sinCoef}\\sin x`;
  const c = `${co(k)}${cosCoef}\\cos x`;
  if (t > 0) return moved ? `${s} - ${c} = 0` : `${s} = ${c}`;
  return moved ? `${s} + ${c} = 0` : `${s} = -${c}`;
}

/** The angle in 0 <= x < 180 with this tangent. */
function tanPrincipal(t: number): number {
  const a = Math.round(Math.atan(t) / DEGREE);
  return a < 0 ? a + 180 : a;
}

interface TanSolveParams extends TanEqParams {
  /** 0: 0 <= x < 180 in degrees; 1: 180 <= x < 360; 2: 0 <= x < pi in radians. */
  interval: number;
}

const TAN_INTERVALS = [
  { tex: '0^{\\circ} \\le x < 180^{\\circ}', shift: 0, radians: false },
  { tex: '180^{\\circ} \\le x < 360^{\\circ}', shift: 180, radians: false },
  { tex: '0 \\le x < \\pi', shift: 0, radians: true },
];

/** a sin x = b cos x has one solution in any half turn: divide by cos x and read it off. */
const tanSolve: Generator<TanSolveParams> = {
  id: 'tid-tan-solve',
  sample: (rng, difficulty) => ({
    form: rng.int(0, TAN_FORMS.length - 1),
    k: rng.int(1, 5),
    moved: rng.chance(0.5),
    interval: difficulty > 1 ? rng.int(0, 2) : 0,
  }),
  render: (p): Slide => {
    const interval = TAN_INTERVALS[p.interval];
    const x = tanPrincipal(TAN_FORMS[p.form].t) + interval.shift;
    return {
      kind: 'expression',
      prompt: [
        prose(`Solve for $${interval.tex}$.${interval.radians ? ' Give the answer in radians.' : ''}`),
        display(tanEquationTex(p)),
      ],
      lead: 'x =',
      keypad: interval.radians ? PI_KEYS : NUMBER_KEYS,
      answer: angleAnswer(x, interval.radians),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const interval = TAN_INTERVALS[p.interval];
    const alpha = tanPrincipal(TAN_FORMS[p.form].t);
    const x = alpha + interval.shift;
    // The reciprocal's angle (cos over sin), the sign lost, and the other half turn.
    const recip = tanPrincipal(1 / TAN_FORMS[p.form].t) + interval.shift;
    const lost = 180 - alpha + interval.shift;
    return angleOptions(x, [recip, lost, x + (interval.shift === 0 ? 180 : -180)], interval.radians);
  },
  solution: (p) => {
    const { t } = TAN_FORMS[p.form];
    const interval = TAN_INTERVALS[p.interval];
    const alpha = tanPrincipal(t);
    const x = alpha + interval.shift;
    return [
      { text: 'Get the sine and cosine on opposite sides, then divide both sides by $\\cos x$. Since $\\frac{\\sin x}{\\cos x} = \\tan x$:' },
      { tex: `\\tan x = ${specialTex(t)}` },
      {
        text:
          interval.shift === 0
            ? `Tangent takes each value once in every half turn, and in $${interval.tex}$ that angle is $${angleTex(x, interval.radians)}$.`
            : `The angle in the first half turn is $${deg(alpha)}$; tangent repeats every $180^{\\circ}$, so the one in this interval is $${deg(alpha)} + 180^{\\circ} = ${deg(x)}$.`,
      },
    ];
  },
};

/** Both solutions of a sin x = b cos x in one turn, placed from a bank. */
const tanSolveTiles: Generator<TanEqParams & { radians: boolean }> = {
  id: 'tid-tan-solve-tiles',
  sample: (rng, difficulty) => ({
    form: rng.int(0, TAN_FORMS.length - 1),
    k: rng.int(1, 4),
    moved: rng.chance(0.5),
    radians: difficulty > 1 && rng.chance(0.5),
  }),
  render: (p): Slide => {
    const alpha = tanPrincipal(TAN_FORMS[p.form].t);
    const answer = [alpha, alpha + 180].map((d) => angleTex(d, p.radians));
    const recip = tanPrincipal(1 / TAN_FORMS[p.form].t);
    const distractors = [180 - alpha, 360 - alpha, recip, recip + 180, alpha + 90, alpha + 270]
      .map((d) => ((d % 360) + 360) % 360)
      .map((d) => angleTex(d, p.radians));
    return {
      kind: 'tiles',
      prompt: [
        prose(`Find both solutions with ${p.radians ? '$0 \\le x < 2\\pi$' : '$0^{\\circ} \\le x < 360^{\\circ}$'}.`),
        display(tanEquationTex(p)),
      ],
      template: 'x = {0} \\quad \\text{or} \\quad x = {1}',
      bank: bankOf(answer, distractors),
      answer,
      unordered: true,
    };
  },
  solution: (p) => {
    const { t } = TAN_FORMS[p.form];
    const alpha = tanPrincipal(t);
    return [
      { text: 'Divide both sides by $\\cos x$ to get a single tangent:' },
      { tex: `\\tan x = ${specialTex(t)}` },
      {
        text: `One solution is $${angleTex(alpha, p.radians)}$. Tangent repeats every half turn, so the other is $${angleTex(alpha, p.radians)} + ${p.radians ? '\\pi' : deg(180)} = ${angleTex(alpha + 180, p.radians)}$.`,
      },
    ];
  },
};

interface DivideParams {
  /** 0: a sin x = b cos x; 1: sin x cos x = k cos x; 2: m sin x cos x = r sin x; 3: m sin^2 x = r sin x. */
  type: number;
  form: number;
  k: number;
  /** For types 1 to 3: which special value the second factor gives. */
  value: number;
}

const HALF_VALUES: Rat[] = [
  [1, 2],
  [-1, 2],
];

/** The equation for a divide-or-factorise question. */
function divideEquation(p: DivideParams): { tex: string; div: string; tanTex?: string; pair?: string; slipPair?: string; divided?: string } {
  if (p.type === 0) {
    return { tex: tanEquationTex({ form: p.form, k: p.k, moved: false }), div: '\\cos x', tanTex: specialTex(TAN_FORMS[p.form].t) };
  }
  const r = HALF_VALUES[p.value];
  const m = 2 * p.k;
  const rhs = (fn: string) => `${signed(r[0] * p.k, fn, true)}`;
  if (p.type === 1) {
    return {
      tex: `${m}\\sin x\\cos x = ${rhs('\\cos x')}`,
      div: '\\cos x',
      pair: `$\\cos x = 0$ or $\\sin x = ${ratTex(r)}$`,
      slipPair: `$\\cos x = 0$ or $\\sin x = ${ratTex([-r[0], r[1]])}$`,
      divided: `$\\sin x = ${ratTex(r)}$`,
    };
  }
  if (p.type === 2) {
    return {
      tex: `${m}\\sin x\\cos x = ${rhs('\\sin x')}`,
      div: '\\sin x',
      pair: `$\\sin x = 0$ or $\\cos x = ${ratTex(r)}$`,
      slipPair: `$\\sin x = 0$ or $\\cos x = ${ratTex([-r[0], r[1]])}$`,
      divided: `$\\cos x = ${ratTex(r)}$`,
    };
  }
  return {
    tex: `${m}\\sin^2 x = ${rhs('\\sin x')}`,
    div: '\\sin x',
    pair: `$\\sin x = 0$ or $\\sin x = ${ratTex(r)}$`,
    slipPair: `$\\sin x = 1$ or $\\sin x = ${ratTex(r)}$`,
    divided: `$\\sin x = ${ratTex(r)}$`,
  };
}

/** Divide, or factorise? Dividing by something that can be zero throws solutions away. */
const divideFlow: Generator<DivideParams> = {
  id: 'tid-divide-flow',
  sample: (rng, difficulty) => ({
    type: difficulty > 1 ? rng.int(0, 3) : rng.pick([0, 0, 1, 2]),
    form: rng.int(0, TAN_FORMS.length - 1),
    k: rng.int(1, 4),
    value: rng.int(0, HALF_VALUES.length - 1),
  }),
  render: (p): Slide => {
    const eq = divideEquation(p);
    const divide = `Divide both sides by $${eq.div}$`;
    const factor = `Take $${eq.div}$ out as a factor`;
    const square = 'Square both sides';
    const t = TAN_FORMS[p.form].t;
    const dividedLabels =
      p.type === 0
        ? [`$\\tan x = ${specialTex(t)}$`, `$\\tan x = ${specialTex(1 / t)}$`, `$\\tan x = ${specialTex(-t)}$`]
        : [eq.divided!, `$\\tan x = ${ratTex(HALF_VALUES[p.value])}$`, '$\\tan x = 1$'];
    const factorLabels =
      p.type === 0
        ? ['$\\sin x = 0$ or $\\cos x = 0$', `$\\sin x = 0$ or $\\tan x = ${specialTex(t)}$`]
        : [eq.pair!, eq.slipPair!];
    const answer = p.type === 0 ? [divide, dividedLabels[0]] : [factor, eq.pair!];
    return {
      kind: 'flow',
      prompt: [prose('Choose the first move, then what it leaves you to solve.')],
      subject: eq.tex,
      steps: [
        {
          id: 'first',
          ask: 'What is the safest first move?',
          branches: [
            { label: divide, to: 'divided' },
            { label: factor, to: 'factored' },
            { label: square, outcome: 'Squaring can add solutions the equation never had.' },
          ],
        },
        {
          id: 'divided',
          ask: 'That leaves',
          branches: [...new Set(dividedLabels)]
            .sort((a, b) => hashSeed(a) - hashSeed(b))
            .map((label) => ({ label, outcome: 'One equation in one function.' })),
        },
        {
          id: 'factored',
          ask: 'It splits into',
          branches: [...new Set(factorLabels)]
            .sort((a, b) => hashSeed(a) - hashSeed(b))
            .map((label) => ({ label, outcome: 'Two simpler equations to solve.' })),
        },
      ],
      answer,
    };
  },
  solution: (p) => {
    const eq = divideEquation(p);
    if (p.type === 0) {
      return [
        {
          text: 'Here $\\cos x$ cannot be zero at a solution: if it were, $\\sin x$ would be $\\pm 1$ and the two sides could not match. So dividing by it is safe.',
        },
        { tex: `\\tan x = ${eq.tanTex}` },
      ];
    }
    return [
      {
        text: `$${eq.div}$ is on both sides, and it can be zero. Dividing by it would lose every solution with $${eq.div} = 0$, so take it out as a factor instead.`,
      },
      { text: `That gives ${eq.pair}.` },
    ];
  },
};

/** One tangent crossing: drag to the solution in the second half turn, or the first. */
const tanSlider: Generator<TanEqParams & { second: boolean }> = {
  id: 'tid-tan-slider',
  sample: (rng) => ({
    form: rng.int(0, TAN_FORMS.length - 1),
    k: rng.int(1, 4),
    moved: rng.chance(0.5),
    second: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const { t } = TAN_FORMS[p.form];
    const alpha = tanPrincipal(t);
    const answer = p.second ? alpha + 180 : alpha;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (x) => Math.tan(x * DEGREE), accent: true, breaks: true }],
      horizontals: [t],
      yMin: -4,
      yMax: 4,
      label: 'The graph of y = tan x from 0 to 360 degrees, with a dashed level line crossing each branch',
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `Turn this into an equation in $\\tan x$; the dashed line is its value. Slide to the solution ${p.second ? 'between $180^{\\circ}$ and $360^{\\circ}$' : 'between $0^{\\circ}$ and $180^{\\circ}$'}.`,
        ),
        display(tanEquationTex(p)),
      ],
      min: 0,
      max: 360,
      step: 15,
      answer,
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: (p) => {
    const { t } = TAN_FORMS[p.form];
    const alpha = tanPrincipal(t);
    return [
      { text: 'Divide by $\\cos x$:' },
      { tex: `\\tan x = ${specialTex(t)}` },
      {
        text: p.second
          ? `In the first half turn that is $${deg(alpha)}$, and tangent repeats every $180^{\\circ}$, so here it is $${deg(alpha + 180)}$.`
          : `In the first half turn the angle with that tangent is $${deg(alpha)}$.`,
      },
    ];
  },
};

/* ---------- Level 2, lesson 1: sin(A + B) and cos(A + B) ---------- */

/** A special value's TeX, or undefined when the value is off the table. */
function tryTex(value: number): string | undefined {
  try {
    return specialTex(value);
  } catch {
    return undefined;
  }
}

/** sin and cos of a special angle, as the learner reads them. */
const sinTex = (degrees: number): string => specialTex(trigAt('sin', degrees)!);
const cosTex = (degrees: number): string => specialTex(trigAt('cos', degrees)!);

interface ExpandParams {
  fn: 'sin' | 'cos';
  plus: boolean;
  alpha: number;
  v: number;
}

const EXPAND_EASY = [30, 45, 60];
const EXPAND_ALL = [30, 45, 60, 90, 120, 135, 150];

/** sin(x + a) or cos(x - a) with a a table angle, expanded into numbers times sin x and cos x. */
const expandTiles: Generator<ExpandParams> = {
  id: 'tid-expand-tiles',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    plus: rng.chance(0.5),
    alpha: rng.pick(difficulty > 1 ? EXPAND_ALL : EXPAND_EASY),
    v: rng.int(0, VARS.length - 1),
  }),
  render: ({ fn, plus, alpha, v }): Slide => {
    const x = VARS[v];
    const op = plus ? '+' : '-';
    // cos(x + a) = cos x cos a - sin x sin a: the sign flips for cosine.
    const inner = fn === 'sin' ? op : plus ? '-' : '+';
    const [first, second] = fn === 'sin' ? ['\\sin', '\\cos'] : ['\\cos', '\\sin'];
    const answer = [cosTex(alpha), sinTex(alpha)];
    const distractors = [
      specialTex(-trigAt('cos', alpha)!),
      specialTex(-trigAt('sin', alpha)!),
      '\\frac{1}{2}',
      '\\frac{\\sqrt{3}}{2}',
      '\\frac{\\sqrt{2}}{2}',
      '1',
    ];
    return {
      kind: 'tiles',
      prompt: [prose(`Expand with the compound-angle formula and fill in the exact values.`)],
      template: `\\${fn}(${x} ${op} ${deg(alpha)}) = {0}${first} ${x} ${inner} {1}${second} ${x}`,
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  solution: ({ fn, plus, alpha, v }) => {
    const x = VARS[v];
    const op = plus ? '+' : '-';
    const inner = fn === 'sin' ? op : plus ? '-' : '+';
    const formula =
      fn === 'sin'
        ? `\\sin(A ${op} B) = \\sin A\\cos B ${op} \\cos A\\sin B`
        : `\\cos(A ${op} B) = \\cos A\\cos B ${inner} \\sin A\\sin B`;
    const [first, second] = fn === 'sin' ? ['\\sin', '\\cos'] : ['\\cos', '\\sin'];
    return [
      { tex: formula },
      { text: `With $A = ${x}$ and $B = ${deg(alpha)}$, where $\\cos ${deg(alpha)} = ${cosTex(alpha)}$ and $\\sin ${deg(alpha)} = ${sinTex(alpha)}$:` },
      { tex: `\\${fn}(${x} ${op} ${deg(alpha)}) = ${cosTex(alpha)}${first} ${x} ${inner} ${sinTex(alpha)}${second} ${x}` },
    ];
  },
};

interface CollapseParams {
  /** 0: sin A cos B + cos A sin B; 1: the same with a minus; 2: cos A cos B - sin A sin B; 3: with a plus. */
  form: number;
  a: number;
  b: number;
}

/** Whether a collapse form is a sum, and which function it collapses to. */
const COLLAPSE = [
  { fn: 'sin' as const, sum: true },
  { fn: 'sin' as const, sum: false },
  { fn: 'cos' as const, sum: true },
  { fn: 'cos' as const, sum: false },
];

function collapseTex({ form, a, b }: CollapseParams): string {
  const A = deg(a);
  const B = deg(b);
  if (form === 0) return `\\sin ${A}\\cos ${B} + \\cos ${A}\\sin ${B}`;
  if (form === 1) return `\\sin ${A}\\cos ${B} - \\cos ${A}\\sin ${B}`;
  if (form === 2) return `\\cos ${A}\\cos ${B} - \\sin ${A}\\sin ${B}`;
  return `\\cos ${A}\\cos ${B} + \\sin ${A}\\sin ${B}`;
}

const collapseTarget = ({ form, a, b }: CollapseParams): number => (COLLAPSE[form].sum ? a + b : a - b);

const COLLAPSE_EASY = [30, 45, 60, 90];
const COLLAPSE_ALL = [30, 45, 60, 90, 120, 135, 150];
const COLLAPSE_PARTS = [5, 10, 20, 25, 35, 40, 50, 55, 65, 70, 80, 85];

/** Recognise an expansion and fold it back into one sine or cosine of a table angle. */
const collapseTiles: Generator<CollapseParams> = {
  id: 'tid-collapse-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const form = rng.int(0, 3);
      const target = rng.pick(difficulty > 1 ? COLLAPSE_ALL : COLLAPSE_EASY);
      const b = rng.pick(COLLAPSE_PARTS);
      const a = COLLAPSE[form].sum ? target - b : target + b;
      if (a <= 0 || a >= 180 || a === b || a % 15 === 0) continue;
      return { form, a, b };
    }
  },
  render: (p): Slide => {
    const { fn } = COLLAPSE[p.form];
    const other = fn === 'sin' ? 'cos' : 'sin';
    const target = collapseTarget(p);
    const wrongAngle = COLLAPSE[p.form].sum ? Math.abs(p.a - p.b) : p.a + p.b;
    const answer = [`\\${fn} ${deg(target)}`, specialTex(trigAt(fn, target)!)];
    const distractors = [
      `\\${fn} ${deg(wrongAngle)}`,
      `\\${other} ${deg(target)}`,
      specialTex(trigAt(other, target)!),
      specialTex(-trigAt(fn, target)!),
      '\\frac{1}{2}',
      '\\frac{\\sqrt{2}}{2}',
    ];
    return {
      kind: 'tiles',
      prompt: [prose('Write this as one sine or cosine, then give its exact value.'), display(collapseTex(p))],
      template: '{0} = {1}',
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const { fn, sum } = COLLAPSE[p.form];
    const target = collapseTarget(p);
    const shape =
      fn === 'sin'
        ? `\\sin A\\cos B ${sum ? '+' : '-'} \\cos A\\sin B = \\sin(A ${sum ? '+' : '-'} B)`
        : `\\cos A\\cos B ${sum ? '-' : '+'} \\sin A\\sin B = \\cos(A ${sum ? '+' : '-'} B)`;
    return [
      { text: 'It has the shape of a compound-angle formula read backwards:' },
      { tex: shape },
      {
        tex: `${collapseTex(p)} = \\${fn}(${deg(p.a)} ${sum ? '+' : '-'} ${deg(p.b)}) = \\${fn} ${deg(target)} = ${specialTex(trigAt(fn, target)!)}`,
      },
    ];
  },
};

interface FormulaParams {
  fn: 'sin' | 'cos' | 'tan';
  plus: boolean;
  pair: number;
  reverse: boolean;
}

const LETTER_PAIRS: [string, string][] = [
  ['A', 'B'],
  ['x', 'y'],
  ['\\alpha', '\\beta'],
  ['P', 'Q'],
  ['\\theta', '\\phi'],
];

/** The expansion of fn(a +- b), with the sign given explicitly so a slip can be built by flipping it. */
function expansion(fn: 'sin' | 'cos' | 'tan', plus: boolean, a: string, b: string): string {
  const op = plus ? '+' : '-';
  const flip = plus ? '-' : '+';
  if (fn === 'sin') return `\\sin ${a}\\cos ${b} ${op} \\cos ${a}\\sin ${b}`;
  if (fn === 'cos') return `\\cos ${a}\\cos ${b} ${flip} \\sin ${a}\\sin ${b}`;
  return `\\dfrac{\\tan ${a} ${op} \\tan ${b}}{1 ${flip} \\tan ${a}\\tan ${b}}`;
}

/** Which expansion is right? Or, read backwards, which single term is this? */
const formulaChoice: Generator<FormulaParams> = {
  id: 'tid-formula-choice',
  sample: (rng, difficulty) => ({
    fn: rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const)),
    plus: rng.chance(0.5),
    pair: rng.int(0, LETTER_PAIRS.length - 1),
    reverse: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const [a, b] = LETTER_PAIRS[p.pair];
    const op = p.plus ? '+' : '-';
    const flipOp = p.plus ? '-' : '+';
    const compact = `\\${p.fn}(${a} ${op} ${b})`;
    if (p.reverse) {
      const others: string[] =
        p.fn === 'tan'
          ? [`\\tan(${a} ${flipOp} ${b})`, `\\tan ${a} ${op} \\tan ${b}`, `\\sin(${a} ${op} ${b})`]
          : [
              `\\${p.fn}(${a} ${flipOp} ${b})`,
              `\\${p.fn === 'sin' ? 'cos' : 'sin'}(${a} ${op} ${b})`,
              `\\${p.fn === 'sin' ? 'cos' : 'sin'}(${a} ${flipOp} ${b})`,
            ];
      return choiceSlide(
        [prose('Which single term is this equal to?'), display(expansion(p.fn, p.plus, a, b))],
        compact,
        others,
        saltOf(p),
      );
    }
    const slips: string[] =
      p.fn === 'sin'
        ? [expansion('sin', !p.plus, a, b), `\\cos ${a}\\cos ${b} ${op} \\sin ${a}\\sin ${b}`, `\\sin ${a} ${op} \\sin ${b}`]
        : p.fn === 'cos'
          ? [expansion('cos', !p.plus, a, b), `\\sin ${a}\\cos ${b} ${op} \\cos ${a}\\sin ${b}`, `\\cos ${a} ${op} \\cos ${b}`]
          : [
              `\\dfrac{\\tan ${a} ${op} \\tan ${b}}{1 ${op} \\tan ${a}\\tan ${b}}`,
              expansion('tan', !p.plus, a, b),
              `\\tan ${a} ${op} \\tan ${b}`,
            ];
    return choiceSlide(
      [prose('Which is the expansion of'), display(compact)],
      expansion(p.fn, p.plus, a, b),
      slips,
      saltOf(p),
    );
  },
  solution: (p) => {
    const [a, b] = LETTER_PAIRS[p.pair];
    const op = p.plus ? '+' : '-';
    const note = {
      sin: 'Sine mixes the functions, sine-cosine then cosine-sine, and keeps the sign of the angle.',
      cos: 'Cosine keeps the functions together, cosines then sines, and flips the sign.',
      tan: 'Tangent keeps the sign on top and flips it underneath.',
    }[p.fn];
    return [{ text: note }, { tex: `\\${p.fn}(${a} ${op} ${b}) = ${expansion(p.fn, p.plus, a, b)}` }];
  },
};

/** Pythagorean triples: an acute angle with sine a/h has cosine b/h. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
];

interface Acute {
  triple: number;
  swap: boolean;
  given: 'sin' | 'cos';
}

/** sin and cos of an acute angle from a triple, as fractions. */
function acuteRatios({ triple, swap }: Acute): { sin: Rat; cos: Rat } {
  const [p, q, h] = TRIPLES[triple];
  const [a, b] = swap ? [q, p] : [p, q];
  return { sin: [a, h], cos: [b, h] };
}

interface CompoundTreeParams {
  A: Acute;
  B: Acute;
  fn: 'sin' | 'cos';
  plus: boolean;
}

function compoundValue({ A, B, fn, plus }: CompoundTreeParams): Rat {
  const a = acuteRatios(A);
  const b = acuteRatios(B);
  const d = a.sin[1] * b.sin[1];
  const sc = a.sin[0] * b.cos[0];
  const cs = a.cos[0] * b.sin[0];
  const cc = a.cos[0] * b.cos[0];
  const ss = a.sin[0] * b.sin[0];
  if (fn === 'sin') return rat(plus ? sc + cs : sc - cs, d);
  return rat(plus ? cc - ss : cc + ss, d);
}

function sampleAcute(rng: Rng, given?: 'sin' | 'cos'): Acute {
  return { triple: rng.int(0, TRIPLES.length - 1), swap: rng.chance(0.5), given: given ?? rng.pick(['sin', 'cos'] as const) };
}

const missing = (given: 'sin' | 'cos') => (given === 'sin' ? 'cos' : 'sin');

/** Given one ratio of each acute angle, find the other two and then sin or cos of the sum or difference. */
const compoundTree: Generator<CompoundTreeParams> = {
  id: 'tid-compound-tree',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { A: sampleAcute(rng), B: sampleAcute(rng), fn: rng.pick(['sin', 'cos'] as const), plus: rng.chance(0.5) }
      : { A: sampleAcute(rng, 'sin'), B: sampleAcute(rng, 'cos'), fn: rng.pick(['sin', 'cos'] as const), plus: true },
  render: (p): Slide => {
    const a = acuteRatios(p.A);
    const b = acuteRatios(p.B);
    const mA = missing(p.A.given);
    const mB = missing(p.B.given);
    const value = compoundValue(p);
    const answer = [ratTex(a[mA]), ratTex(b[mB]), ratTex(value)];
    const other = compoundValue({ ...p, plus: !p.plus });
    const swapped = compoundValue({ ...p, fn: p.fn === 'sin' ? 'cos' : 'sin' });
    const distractors = [
      ratTex(a[p.A.given]),
      ratTex(b[p.B.given]),
      ratTex(other),
      ratTex(swapped),
      ratTex([-value[0], value[1]]),
    ];
    const op = p.plus ? '+' : '-';
    return {
      kind: 'tree',
      prompt: [
        prose(
          `$\\${p.A.given} A = ${ratTex(a[p.A.given])}$ and $\\${p.B.given} B = ${ratTex(b[p.B.given])}$, with $A$ and $B$ both acute. Top row: $\\${mA} A$, then $\\${mB} B$. Underneath: $\\${p.fn}(A ${op} B)$.`,
        ),
      ],
      expression: `\\${p.fn}(A ${op} B) = ${expansion(p.fn, p.plus, 'A', 'B')}`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'r', from: ['a', 'b'] },
      ],
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const a = acuteRatios(p.A);
    const b = acuteRatios(p.B);
    const mA = missing(p.A.given);
    const mB = missing(p.B.given);
    const op = p.plus ? '+' : '-';
    const [pa, qa, ha] = TRIPLES[p.A.triple];
    const [pb, qb, hb] = TRIPLES[p.B.triple];
    const t = (x: Rat) => ratTex(x);
    const line =
      p.fn === 'sin'
        ? `${t(a.sin)} \\times ${t(b.cos)} ${op} ${t(a.cos)} \\times ${t(b.sin)}`
        : `${t(a.cos)} \\times ${t(b.cos)} ${p.plus ? '-' : '+'} ${t(a.sin)} \\times ${t(b.sin)}`;
    return [
      {
        text: `Each angle is acute, so its other ratio is positive, and comes from a right-angled triangle: the sides ${pa}, ${qa}, ${ha} for $A$ and ${pb}, ${qb}, ${hb} for $B$.`,
      },
      { tex: `\\${mA} A = ${t(a[mA])} \\qquad \\${mB} B = ${t(b[mB])}` },
      { tex: `\\${p.fn}(A ${op} B) = ${line} = ${t(compoundValue(p))}` },
    ];
  },
};

/* ---------- Level 2, lesson 2: tan(A + B) ---------- */

interface TanCompoundParams {
  a: Rat;
  b: Rat;
  plus: boolean;
}

const TAN_EASY: Rat[] = [1, 2, 3, 4, 5, 6].map((n) => [n, 1] as Rat);
const TAN_ALL: Rat[] = [
  ...[-4, -3, -2, -1, 1, 2, 3, 4, 5].map((n) => [n, 1] as Rat),
  [1, 2],
  [-1, 2],
  [1, 3],
  [2, 3],
  [3, 2],
];

/** (a + b)/(1 - ab), or (a - b)/(1 + ab), as a numerator and denominator before reducing. */
function tanParts({ a, b, plus }: TanCompoundParams): { top: Rat; bottom: Rat; value: Rat } {
  const [an, ad] = a;
  const [bn, bd] = b;
  const top = rat(plus ? an * bd + bn * ad : an * bd - bn * ad, ad * bd);
  const bottom = rat(plus ? ad * bd - an * bn : ad * bd + an * bn, ad * bd);
  return { top, bottom, value: rat(top[0] * bottom[1], top[1] * bottom[0]) };
}

function sampleTanCompound(rng: Rng, difficulty: number): TanCompoundParams {
  for (;;) {
    const pool = difficulty > 1 ? TAN_ALL : TAN_EASY;
    const p = { a: rng.pick(pool), b: rng.pick(pool), plus: difficulty > 1 ? rng.chance(0.5) : true };
    const { top, bottom } = tanParts(p);
    if (bottom[0] === 0 || top[0] === 0 || sameRat(p.a, p.b)) continue;
    return p;
  }
}

const tanFormulaTex = (plus: boolean) =>
  plus
    ? '\\tan(A + B) = \\dfrac{\\tan A + \\tan B}{1 - \\tan A\\tan B}'
    : '\\tan(A - B) = \\dfrac{\\tan A - \\tan B}{1 + \\tan A\\tan B}';

function tanCompoundSolution(p: TanCompoundParams): SolutionStep[] {
  const { top, bottom, value } = tanParts(p);
  const op = p.plus ? '+' : '-';
  const flip = p.plus ? '-' : '+';
  const b = br(ratTex(p.b));
  return [
    { tex: tanFormulaTex(p.plus) },
    { tex: `\\text{top} = ${ratTex(p.a)} ${op} ${b} = ${ratTex(top)} \\qquad \\text{bottom} = 1 ${flip} ${br(ratTex(p.a))} \\times ${b} = ${ratTex(bottom)}` },
    { tex: `\\tan(A ${op} B) = ${ratTex(top)} \\div ${br(ratTex(bottom))} = ${ratTex(value)}` },
  ];
}

/** tan(A + B) from tan A and tan B, typed. */
const tanCompound: Generator<TanCompoundParams> = {
  id: 'tid-tan-compound',
  sample: (rng, difficulty) => sampleTanCompound(rng, difficulty),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose(`$\\tan A = ${ratTex(p.a)}$ and $\\tan B = ${ratTex(p.b)}$. Find the exact value.`)],
    lead: `\\tan(A ${p.plus ? '+' : '-'} B) =`,
    keypad: NUMBER_KEYS,
    answer: ratAnswer(tanParts(p).value),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { top, value } = tanParts(p);
    const wrongSign = tanParts({ ...p, plus: !p.plus }).value;
    const flippedBottom = rat(top[0] * p.a[1] * p.b[1], top[1] * (p.a[1] * p.b[1] + (p.plus ? 1 : -1) * p.a[0] * p.b[0]));
    return ratOptions(value, [top, flippedBottom, wrongSign, [-value[0], value[1]]]);
  },
  solution: tanCompoundSolution,
};

/** The same computation laid out: top and bottom of the formula, then the quotient. */
const tanCompoundTree: Generator<TanCompoundParams> = {
  id: 'tid-tan-compound-tree',
  sample: (rng, difficulty) => sampleTanCompound(rng, difficulty),
  render: (p): Slide => {
    const { top, bottom, value } = tanParts(p);
    const answer = [ratTex(top), ratTex(bottom), ratTex(value)];
    const other = tanParts({ ...p, plus: !p.plus });
    const distractors = [
      ratTex(other.top),
      ratTex(other.bottom),
      ratTex(rat(bottom[0] * top[1], bottom[1] * top[0])),
      ratTex([-value[0], value[1]]),
      ratTex(rat(p.a[0] * p.b[0], p.a[1] * p.b[1])),
    ];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `$\\tan A = ${ratTex(p.a)}$ and $\\tan B = ${ratTex(p.b)}$. Top row: the top of the formula, then the bottom. Underneath: their quotient.`,
        ),
      ],
      expression: tanFormulaTex(p.plus),
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'q', from: ['top', 'bottom'] },
      ],
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: tanCompoundSolution,
};

interface TanShiftParams {
  plus: boolean;
  k: Rat;
  phrasing: number;
}

/** tan x from tan(x + 45) = k or tan(x - 45) = k. */
function tanShiftValue({ plus, k }: TanShiftParams): Rat {
  const [n, d] = k;
  // tan(x + 45) = (t + 1)/(1 - t) = k gives t = (k - 1)/(k + 1); the minus version gives (1 + k)/(1 - k).
  return plus ? rat(n - d, n + d) : rat(d + n, d - n);
}

const SHIFT_FRACTIONS: Rat[] = [
  [1, 2],
  [-1, 2],
  [1, 3],
  [-1, 3],
  [2, 3],
  [3, 2],
  [-3, 2],
  [1, 4],
];

const TAN_SHIFT_PROMPTS = [
  'Expand the left-hand side with the formula for $\\tan(A \\pm B)$, then rearrange for $\\tan x$.',
  'Find the exact value of $\\tan x$.',
];

/** Undo a compound angle: tan(x + 45) = k, so tan x = ? */
const tanShiftSolve: Generator<TanShiftParams> = {
  id: 'tid-tan-shift-solve',
  sample: (rng, difficulty) => {
    for (;;) {
      const plus = rng.chance(0.5);
      const k: Rat =
        difficulty > 1 && rng.chance(0.6) ? rng.pick(SHIFT_FRACTIONS) : [rng.int(-9, 9), 1];
      // k = -1 (plus) or k = 1 (minus) would divide by zero; k = +-1 the other way round gives tan x = 0 or undefined.
      if (Math.abs(ratValue(k)) === 1) continue;
      return { plus, k, phrasing: rng.int(0, TAN_SHIFT_PROMPTS.length - 1) };
    }
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose(TAN_SHIFT_PROMPTS[p.phrasing]), display(`\\tan(x ${p.plus ? '+' : '-'} 45^{\\circ}) = ${ratTex(p.k)}`)],
    lead: '\\tan x =',
    keypad: NUMBER_KEYS,
    answer: ratAnswer(tanShiftValue(p)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const [n, d] = p.k;
    const value = tanShiftValue(p);
    return ratOptions(value, [
      tanShiftValue({ ...p, plus: !p.plus }),
      rat(value[1], value[0]),
      rat(n - d, d),
      [-value[0], value[1]],
    ]);
  },
  solution: (p) => {
    const t = tanShiftValue(p);
    const k = ratTex(p.k);
    return p.plus
      ? [
          { text: 'With $\\tan 45^{\\circ} = 1$, write $t$ for $\\tan x$:' },
          { tex: `\\frac{t + 1}{1 - t} = ${k}` },
          { tex: `t + 1 = ${k}(1 - t) \\quad \\Rightarrow \\quad ${ratTex(addRat(p.k, [1, 1]))}\\,t = ${ratTex(addRat(p.k, [-1, 1]))}` },
          { tex: `\\tan x = ${ratTex(t)}` },
        ]
      : [
          { text: 'With $\\tan 45^{\\circ} = 1$, write $t$ for $\\tan x$:' },
          { tex: `\\frac{t - 1}{1 + t} = ${k}` },
          { tex: `t - 1 = ${k}(1 + t) \\quad \\Rightarrow \\quad ${ratTex(addRat([1, 1], [-p.k[0], p.k[1]]))}\\,t = ${ratTex(addRat([1, 1], p.k))}` },
          { tex: `\\tan x = ${ratTex(t)}` },
        ];
  },
};

interface TanExpandParams {
  alpha: number;
  plus: boolean;
  v: number;
}

const TAN_EXPAND_EASY = [30, 45, 60, 135];
const TAN_EXPAND_ALL = [30, 45, 60, 120, 135, 150];
const TAN_EXPAND_VARS = ['x', '\\theta', 'A', 'B'];

/** Top and bottom of tan(v +- alpha), cleared of fractions for 30 and 150 degrees. */
function tanExpandParts({ alpha, plus }: TanExpandParams, v: string): { top: string; bottom: string; slipTop: string; slipBottom: string } {
  const tau = trigAt('tan', alpha)!;
  const e = (plus ? 1 : -1) * Math.sign(tau);
  const up = e > 0 ? '+' : '-';
  const down = e > 0 ? '-' : '+';
  const size = Math.abs(tau);
  if (Math.abs(size - 1) < 1e-9) {
    return {
      top: `\\tan ${v} ${up} 1`,
      bottom: `1 ${down} \\tan ${v}`,
      slipTop: `\\tan ${v} ${down} 1`,
      slipBottom: `1 ${up} \\tan ${v}`,
    };
  }
  if (size > 1) {
    return {
      top: `\\tan ${v} ${up} \\sqrt{3}`,
      bottom: `1 ${down} \\sqrt{3}\\tan ${v}`,
      slipTop: `\\tan ${v} ${down} \\sqrt{3}`,
      slipBottom: `1 ${up} \\sqrt{3}\\tan ${v}`,
    };
  }
  return {
    top: `\\sqrt{3}\\tan ${v} ${up} 1`,
    bottom: `\\sqrt{3} ${down} \\tan ${v}`,
    slipTop: `\\sqrt{3}\\tan ${v} ${down} 1`,
    slipBottom: `\\sqrt{3} ${up} \\tan ${v}`,
  };
}

/** tan(x + 60) and friends as one fraction in tan x. */
const tanExpandTiles: Generator<TanExpandParams> = {
  id: 'tid-tan-expand-tiles',
  sample: (rng, difficulty) => ({
    alpha: rng.pick(difficulty > 1 ? TAN_EXPAND_ALL : TAN_EXPAND_EASY),
    plus: rng.chance(0.5),
    v: rng.int(0, difficulty > 1 ? 2 : 3),
  }),
  render: (p): Slide => {
    const v = TAN_EXPAND_VARS[p.v];
    const parts = tanExpandParts(p, v);
    const answer = [parts.top, parts.bottom];
    const cleared = Math.abs(Math.abs(trigAt('tan', p.alpha)!) * Math.sqrt(3) - 1) < 1e-9;
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `Expand with the formula for $\\tan(A \\pm B)$, putting in $\\tan ${deg(p.alpha)} = ${specialTex(trigAt('tan', p.alpha)!)}$.${cleared ? ' Then multiply top and bottom by $\\sqrt{3}$ to clear the fraction.' : ''}`,
        ),
      ],
      template: `\\tan(${v} ${p.plus ? '+' : '-'} ${deg(p.alpha)}) = ({0}) \\div ({1})`,
      bank: bankOf(answer, [parts.slipTop, parts.slipBottom, parts.bottom.replace('1', '2')]),
      answer,
    };
  },
  solution: (p) => {
    const v = TAN_EXPAND_VARS[p.v];
    const parts = tanExpandParts(p, v);
    const tau = specialTex(trigAt('tan', p.alpha)!);
    const op = p.plus ? '+' : '-';
    return [
      { tex: tanFormulaTex(p.plus).replace(/A/g, v).replace(/B/g, deg(p.alpha)) },
      {
        text: `Put in $\\tan ${deg(p.alpha)} = ${tau}$ and tidy the signs${Math.abs(Math.abs(trigAt('tan', p.alpha)!) * Math.sqrt(3) - 1) < 1e-9 ? ', then multiply top and bottom by $\\sqrt{3}$' : ''}.`,
      },
      { tex: `\\tan(${v} ${op} ${deg(p.alpha)}) = \\frac{${parts.top}}{${parts.bottom}}` },
    ];
  },
};

/* ---------- Level 2, lesson 3: exact values from compound angles ---------- */

/** An angle between table angles, and every way to split it into a 45-type and a 30-type table angle. */
const HALF_TABLE = [15, 75, 105, 165];
const HALF_TABLE_ALL = [15, 75, 105, 165, 195, 255, 285, 345];

function splitsOf(angle: number): { p: number; q: number; plus: boolean }[] {
  const forty = [45, 135, 225, 315];
  const thirty = [30, 60, 120, 150, 210, 240, 300, 330];
  const out: { p: number; q: number; plus: boolean }[] = [];
  for (const f of forty) {
    for (const t of thirty) {
      if (f + t === angle) out.push({ p: Math.max(f, t), q: Math.min(f, t), plus: true });
      if (f - t === angle) out.push({ p: f, q: t, plus: false });
      if (t - f === angle) out.push({ p: t, q: f, plus: false });
    }
  }
  return out;
}

/** The value of fn(angle) as (s6 sqrt 6 + s2 sqrt 2)/4, with the signs found numerically and checked. */
function quarterSigns(fn: 'sin' | 'cos', angle: number): [number, number] {
  const value = trigAt(fn, angle)!;
  for (const s6 of [1, -1]) {
    for (const s2 of [1, -1]) {
      if (Math.abs((s6 * Math.sqrt(6) + s2 * Math.sqrt(2)) / 4 - value) < 1e-9) return [s6, s2];
    }
  }
  throw new Error(`${fn} ${angle} is not a (sqrt 6 +- sqrt 2)/4 value`);
}

/** (s6 sqrt 6 + s2 sqrt 2)/4 as the learner reads it, a positive term first. */
function quarterTex([s6, s2]: [number, number]): string {
  if (s6 > 0 && s2 > 0) return '\\frac{\\sqrt{6} + \\sqrt{2}}{4}';
  if (s6 > 0) return '\\frac{\\sqrt{6} - \\sqrt{2}}{4}';
  if (s2 > 0) return '\\frac{\\sqrt{2} - \\sqrt{6}}{4}';
  return '-\\frac{\\sqrt{6} + \\sqrt{2}}{4}';
}

const quarterAnswer = ([s6, s2]: [number, number]): string => `((${s6})*sqrt(6) + (${s2})*sqrt(2))/4`;

interface ExactTilesParams {
  fn: 'sin' | 'cos';
  angle: number;
  split: number;
}

/** sin 75 exactly: split into table angles, expand, and place the surds. */
const exactTiles: Generator<ExactTilesParams> = {
  id: 'tid-exact-tiles',
  sample: (rng, difficulty) => {
    const angle = rng.pick(difficulty > 1 ? HALF_TABLE_ALL : HALF_TABLE);
    return { fn: rng.pick(['sin', 'cos'] as const), angle, split: rng.int(0, splitsOf(angle).length - 1) };
  },
  render: (p): Slide => {
    const [s6, s2] = quarterSigns(p.fn, p.angle);
    const s = splitsOf(p.angle)[p.split];
    const answer = [s6 > 0 ? '\\sqrt{6}' : '-\\sqrt{6}', s2 > 0 ? '+ \\sqrt{2}' : '- \\sqrt{2}'];
    const distractors = [
      s6 > 0 ? '-\\sqrt{6}' : '\\sqrt{6}',
      s2 > 0 ? '- \\sqrt{2}' : '+ \\sqrt{2}',
      '\\sqrt{2}',
      '+ \\sqrt{3}',
    ];
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `Find the exact value of $\\${p.fn} ${deg(p.angle)}$, using $${deg(p.angle)} = ${deg(s.p)} ${s.plus ? '+' : '-'} ${deg(s.q)}$. Put the $\\sqrt{6}$ term first.`,
        ),
      ],
      template: `\\${p.fn} ${deg(p.angle)} = \\tfrac14({0} {1})`,
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  choices: (p) => {
    const signs = quarterSigns(p.fn, p.angle);
    const others: [number, number][] = [
      [signs[0], -signs[1]],
      [-signs[0], signs[1]],
      [-signs[0], -signs[1]],
    ];
    return options(
      { tex: quarterTex(signs), answer: quarterAnswer(signs) },
      ...others.map((o) => ({ tex: quarterTex(o), answer: quarterAnswer(o) })),
    );
  },
  solution: (p) => exactSolution(p.fn, splitsOf(p.angle)[p.split]),
};

/** The working for fn(p +- q), each product written out. */
function exactSolution(fn: 'sin' | 'cos', s: { p: number; q: number; plus: boolean }): SolutionStep[] {
  const op = s.plus ? '+' : '-';
  const inner = fn === 'sin' ? op : s.plus ? '-' : '+';
  const [f1, g1, f2, g2] = fn === 'sin' ? ['sin', 'cos', 'cos', 'sin'] : ['cos', 'cos', 'sin', 'sin'];
  const t1 = surdProduct(f1 as 'sin' | 'cos', s.p, g1 as 'sin' | 'cos', s.q);
  const t2 = surdProduct(f2 as 'sin' | 'cos', s.p, g2 as 'sin' | 'cos', s.q);
  const total = surdCombine(t1, t2, inner === '+' ? 1 : -1);
  return [
    { tex: `\\${fn}(${deg(s.p)} ${op} ${deg(s.q)}) = \\${f1} ${deg(s.p)}\\${g1} ${deg(s.q)} ${inner} \\${f2} ${deg(s.p)}\\${g2} ${deg(s.q)}` },
    {
      tex: `= ${specialTex(trigAt(f1 as Fn, s.p)!)} \\times ${br(specialTex(trigAt(g1 as Fn, s.q)!))} ${inner} ${br(specialTex(trigAt(f2 as Fn, s.p)!))} \\times ${br(specialTex(trigAt(g2 as Fn, s.q)!))}`,
    },
    { tex: `= ${surdTex(t1)} ${inner} ${br(surdTex(t2))} = ${surdSumTex(total)}` },
  ];
}

/**
 * Exact arithmetic on values like sqrt(3)/2: a sum of rationals times square roots of
 * square-free numbers, keyed by the number under the root.
 */
type SurdSum = Map<number, Rat>;

/** sin or cos of 0, 30, 45, 60 or 90 degrees (or any multiple), as a coefficient and a root. */
function tableSurd(fn: Fn, degrees: number): SurdSum {
  const value = trigAt(fn, degrees)!;
  const size = Math.abs(value);
  const sign = Math.sign(value);
  const out: SurdSum = new Map();
  if (size < 1e-9) return out;
  if (Math.abs(size - 1) < 1e-9) out.set(1, [sign, 1]);
  else if (Math.abs(size - 0.5) < 1e-9) out.set(1, [sign, 2]);
  else if (Math.abs(size - Math.SQRT2 / 2) < 1e-9) out.set(2, [sign, 2]);
  else if (Math.abs(size - Math.sqrt(3) / 2) < 1e-9) out.set(3, [sign, 2]);
  else throw new Error(`${fn} ${degrees} is not a sine or cosine table value`);
  return out;
}

const addRat = (a: Rat, b: Rat): Rat => rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);

/** The product of two single-root values. */
function surdProduct(f: 'sin' | 'cos', p: number, g: 'sin' | 'cos', q: number): SurdSum {
  const x = tableSurd(f, p);
  const y = tableSurd(g, q);
  const out: SurdSum = new Map();
  for (const [m1, r1] of x) {
    for (const [m2, r2] of y) {
      let m = m1 * m2;
      let k = 1;
      // Pull square factors out from under the root; only 4 and 9 can occur here.
      for (const s of [2, 3]) {
        while (m % (s * s) === 0) {
          m /= s * s;
          k *= s;
        }
      }
      const term = rat(r1[0] * r2[0] * k, r1[1] * r2[1]);
      out.set(m, out.has(m) ? addRat(out.get(m)!, term) : term);
    }
  }
  return out;
}

function surdCombine(a: SurdSum, b: SurdSum, sign: number): SurdSum {
  const out: SurdSum = new Map(a);
  for (const [m, r] of b) {
    const term: Rat = [sign * r[0], r[1]];
    out.set(m, out.has(m) ? addRat(out.get(m)!, term) : term);
  }
  for (const [m, r] of [...out]) if (r[0] === 0) out.delete(m);
  return out;
}

const surdValue = (s: SurdSum): number => [...s].reduce((t, [m, [n, d]]) => t + (n / d) * Math.sqrt(m), 0);

/** One term: \\frac{\\sqrt{6}}{4}, -\\frac{1}{2}, 2\\sqrt{3}. */
function surdTex(s: SurdSum): string {
  const terms = [...s];
  if (terms.length === 0) return '0';
  if (terms.length > 1) return surdSumTex(s);
  const [m, [n, d]] = terms[0];
  if (m === 1) return ratTex([n, d]);
  const sign = n < 0 ? '-' : '';
  const k = Math.abs(n) === 1 ? '' : `${Math.abs(n)}`;
  return d === 1 ? `${sign}${k}\\sqrt{${m}}` : `${sign}\\frac{${k}\\sqrt{${m}}}{${d}}`;
}

/** Several roots over a common denominator, a positive term first: \\frac{\\sqrt{6} + \\sqrt{2}}{4}. */
function surdSumTex(s: SurdSum): string {
  const terms = [...s].sort((a, b) => b[0] - a[0]);
  if (terms.length <= 1) return surdTex(s);
  const common = terms.reduce((l, [, [, d]]) => (l * d) / gcd(l, d), 1);
  const nums = terms.map(([m, [n, d]]) => ({ m, n: (n * common) / d }));
  const negate = nums.every(({ n }) => n < 0);
  const ordered = [...nums.filter(({ n }) => (negate ? -n : n) > 0), ...nums.filter(({ n }) => (negate ? -n : n) < 0)];
  const top = polyTex(ordered.map(({ m, n }) => [negate ? -n : n, m === 1 ? '' : `\\sqrt{${m}}`]));
  const body = common === 1 ? top : `\\frac{${top}}{${common}}`;
  return negate ? `-${common === 1 ? `(${top})` : body}` : body;
}

interface ExactStepsParams {
  fn: 'sin' | 'cos';
  p: number;
  q: number;
  plus: boolean;
  phrasing: number;
}

const EXACT_PAIRS_EASY: [number, number, boolean][] = [
  [30, 30, true],
  [45, 30, true],
  [45, 45, true],
  [60, 30, true],
  [60, 45, true],
  [60, 60, true],
  [45, 30, false],
  [60, 30, false],
  [60, 45, false],
];
const EXACT_PAIRS_ALL: [number, number, boolean][] = [
  ...EXACT_PAIRS_EASY,
  [90, 30, true],
  [90, 45, true],
  [90, 60, true],
  [90, 30, false],
  [90, 45, false],
  [90, 60, false],
];

const EXACT_STEPS_PROMPTS = [
  'Expand, then work out each product and add them.',
  'Put in the table values one product at a time, then combine.',
];

/** Each product of table values first, then the two combined. */
const exactSteps: Generator<ExactStepsParams> = {
  id: 'tid-exact-steps',
  sample: (rng, difficulty) => {
    const [p, q, plus] = rng.pick(difficulty > 1 ? EXACT_PAIRS_ALL : EXACT_PAIRS_EASY);
    return { fn: rng.pick(['sin', 'cos'] as const), p, q, plus, phrasing: rng.int(0, EXACT_STEPS_PROMPTS.length - 1) };
  },
  render: ({ fn, p, q, plus, phrasing }): Slide => {
    const op = plus ? '+' : '-';
    const inner = fn === 'sin' ? op : plus ? '-' : '+';
    const [f1, g1, f2, g2] = (fn === 'sin' ? ['sin', 'cos', 'cos', 'sin'] : ['cos', 'cos', 'sin', 'sin']) as ('sin' | 'cos')[];
    const t1 = surdProduct(f1, p, g1, q);
    const t2 = surdProduct(f2, p, g2, q);
    const sign = inner === '+' ? 1 : -1;
    const total = surdCombine(t1, t2, sign);
    const target = plus ? p + q : p - q;
    if (Math.abs(surdValue(total) - trigAt(fn, target)!) > 1e-9) throw new Error(`exact steps disagree at ${fn} ${target}`);
    const products = [
      surdProduct('sin', p, 'sin', q),
      surdProduct('cos', p, 'cos', q),
      surdProduct('sin', p, 'cos', q),
      surdProduct('cos', p, 'sin', q),
    ].map(surdTex);
    const combos = [surdCombine(t1, t2, -sign), surdCombine(t2, t1, -1), surdCombine(surdCombine(new Map(), t1, -1), t2, -sign)].map(
      surdSumTex,
    );
    const bank = (value: string, extra: string[]) => scatter([value, ...[...new Set(extra)].filter((t) => t !== value).slice(0, 3)]);
    return {
      kind: 'steps',
      prompt: [prose(`$\\${fn} ${deg(target)} = \\${fn}(${deg(p)} ${op} ${deg(q)})$. ${EXACT_STEPS_PROMPTS[phrasing]}`)],
      start: [`\\${f1} ${deg(p)}\\${g1} ${deg(q)}`, inner, `\\${f2} ${deg(p)}\\${g2} ${deg(q)}`],
      reductions: [
        { span: [0, 1], value: surdTex(t1), bank: bank(surdTex(t1), [...products, '\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}']) },
        { span: [2, 3], value: surdTex(t2), bank: bank(surdTex(t2), [...products, '\\frac{\\sqrt{2}}{2}', '\\frac{1}{4}']) },
        { span: [0, 3], value: surdSumTex(total), bank: bank(surdSumTex(total), [...combos, '\\frac{\\sqrt{6}}{2}', '1']) },
      ],
    };
  },
  solution: ({ fn, p, q, plus }) => exactSolution(fn, { p, q, plus }),
};

interface TanExactParams {
  fn: 'tan' | 'cot';
  angle: number;
  radians: boolean;
  phrasing: number;
}

/** tan of the angle as a + b sqrt 3 with a = +-2, b = +-1, signs found numerically. */
function tanSigns({ fn, angle }: TanExactParams): [number, number] {
  const t = trigAt('tan', angle)!;
  const value = fn === 'tan' ? t : 1 / t;
  for (const a of [2, -2]) {
    for (const b of [1, -1]) {
      if (Math.abs(a + b * Math.sqrt(3) - value) < 1e-9) return [a, b];
    }
  }
  throw new Error(`${fn} ${angle} is not 2 +- sqrt 3`);
}

function twoRootThreeTex([a, b]: [number, number]): string {
  if (a > 0) return `2 ${b > 0 ? '+' : '-'} \\sqrt{3}`;
  return b > 0 ? '\\sqrt{3} - 2' : '-2 - \\sqrt{3}';
}

const TAN_EXACT_PROMPTS = ['Find the exact value.', 'Which is the exact value?'];

/** tan 75 = 2 + sqrt 3 and its relatives: a compound angle, then rationalising. */
const tanExactChoice: Generator<TanExactParams> = {
  id: 'tid-tan-exact-choice',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['tan', 'cot'] as const),
    angle: rng.pick(difficulty > 1 ? HALF_TABLE_ALL : HALF_TABLE),
    radians: rng.chance(0.5),
    phrasing: rng.int(0, TAN_EXACT_PROMPTS.length - 1),
  }),
  render: (p): Slide => {
    const signs = tanSigns(p);
    const all: [number, number][] = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
    ];
    const fnTex = p.fn === 'tan' ? '\\tan' : '\\cot';
    return choiceSlide(
      [prose(TAN_EXACT_PROMPTS[p.phrasing]), display(`${fnTex} ${angleTex(p.angle, p.radians)}`)],
      twoRootThreeTex(signs),
      all.filter(([a, b]) => a !== signs[0] || b !== signs[1]).map(twoRootThreeTex),
      saltOf(p),
    );
  },
  solution: (p) => {
    const signs = tanSigns(p);
    const reduced = p.angle % 180;
    const s = splitsOf(reduced)[0];
    const steps: SolutionStep[] = [];
    if (reduced !== p.angle) {
      steps.push({ text: `Tangent repeats every half turn, so this is the same as at $${deg(reduced)}$.` });
    }
    steps.push(
      { text: `$${deg(reduced)} = ${deg(s.p)} ${s.plus ? '+' : '-'} ${deg(s.q)}$, so use the formula for $\\tan(A ${s.plus ? '+' : '-'} B)$ with $\\tan ${deg(s.p)} = ${specialTex(trigAt('tan', s.p)!)}$ and $\\tan ${deg(s.q)} = ${specialTex(trigAt('tan', s.q)!)}$.` },
      { text: 'Multiply top and bottom by $\\sqrt{3}$, then by the conjugate of the bottom, to clear the roots from the denominator.' },
      { tex: `\\tan ${deg(reduced)} = ${twoRootThreeTex(tanSigns({ ...p, fn: 'tan', angle: reduced }))}` },
    );
    if (p.fn === 'cot') {
      steps.push({
        text: 'Cotangent is one over tangent. Since $(2 + \\sqrt{3})(2 - \\sqrt{3}) = 1$, turning one of these over gives the other, with the same sign.',
      });
    }
    steps.push({ tex: `${p.fn === 'tan' ? '\\tan' : '\\cot'} ${angleTex(p.angle, p.radians)} = ${twoRootThreeTex(signs)}` });
    return steps;
  },
};

/* ---------- Level 2, lesson 4: the double-angle formulae ---------- */

interface DoubleValueParams {
  triple: number;
  swap: boolean;
  given: 'sin' | 'cos' | 'tan';
  /** 1 to 4. */
  quadrant: number;
  ask: 'sin' | 'cos' | 'tan';
}

const QUADRANT_TEXT = [
  '',
  '$x$ is acute',
  '$90^{\\circ} < x < 180^{\\circ}$',
  '$180^{\\circ} < x < 270^{\\circ}$',
  '$270^{\\circ} < x < 360^{\\circ}$',
];

/** sin x and cos x with the quadrant's signs, as fractions. */
function signedRatios({ triple, swap, quadrant }: DoubleValueParams): { s: Rat; c: Rat } {
  const [p, q, h] = TRIPLES[triple];
  const [a, b] = swap ? [q, p] : [p, q];
  const sSign = quadrant <= 2 ? 1 : -1;
  const cSign = quadrant === 1 || quadrant === 4 ? 1 : -1;
  return { s: [sSign * a, h], c: [cSign * b, h] };
}

function doubleValue(p: DoubleValueParams): Rat {
  const { s, c } = signedRatios(p);
  const h2 = s[1] * s[1];
  if (p.ask === 'sin') return rat(2 * s[0] * c[0], h2);
  if (p.ask === 'cos') return rat(c[0] * c[0] - s[0] * s[0], h2);
  return rat(2 * s[0] * c[0], c[0] * c[0] - s[0] * s[0]);
}

function givenRatio(p: DoubleValueParams): Rat {
  const { s, c } = signedRatios(p);
  if (p.given === 'sin') return s;
  if (p.given === 'cos') return c;
  return rat(s[0], c[0]);
}

/** sin 2x, cos 2x or tan 2x from one ratio of x and where x lies. */
const doubleValue_: Generator<DoubleValueParams> = {
  id: 'tid-double-value',
  sample: (rng, difficulty) => ({
    triple: rng.int(0, TRIPLES.length - 1),
    swap: rng.chance(0.5),
    given: rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const)),
    quadrant: difficulty > 1 ? rng.int(2, 4) : 1,
    ask: rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const)),
  }),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose(`Given that $\\${p.given} x = ${ratTex(givenRatio(p))}$ and ${QUADRANT_TEXT[p.quadrant]}, find the exact value.`)],
    lead: `\\${p.ask} 2x =`,
    keypad: NUMBER_KEYS,
    answer: ratAnswer(doubleValue(p)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { s, c } = signedRatios(p);
    const value = doubleValue(p);
    const h = s[1];
    return ratOptions(value, [
      [-value[0], value[1]],
      p.ask === 'sin' ? rat(2 * s[0], h) : p.ask === 'cos' ? rat(s[0] * s[0] - c[0] * c[0], h * h) : rat(2 * s[0], c[0]),
      p.ask === 'tan' ? rat(2 * s[0] * c[0], h * h) : rat(2 * c[0], h),
      rat(value[1], value[0]),
    ]);
  },
  solution: (p) => {
    const { s, c } = signedRatios(p);
    const [pp, qq, h] = TRIPLES[p.triple];
    const steps: SolutionStep[] = [
      {
        text: `A right-angled triangle with sides ${pp}, ${qq}, ${h} gives the sizes of the ratios; ${QUADRANT_TEXT[p.quadrant]} fixes their signs.`,
      },
      { tex: `\\sin x = ${ratTex(s)} \\qquad \\cos x = ${ratTex(c)}` },
    ];
    if (p.ask === 'sin') steps.push({ tex: `\\sin 2x = 2\\sin x\\cos x = 2 \\times ${br(ratTex(s))} \\times ${br(ratTex(c))} = ${ratTex(doubleValue(p))}` });
    else if (p.ask === 'cos') steps.push({ tex: `\\cos 2x = \\cos^2 x - \\sin^2 x = ${ratTex(rat(c[0] * c[0], h * h))} - ${ratTex(rat(s[0] * s[0], h * h))} = ${ratTex(doubleValue(p))}` });
    else {
      const t = rat(s[0], c[0]);
      steps.push(
        { tex: `\\tan x = ${ratTex(t)}` },
        { tex: `\\tan 2x = \\frac{2\\tan x}{1 - \\tan^2 x} = ${ratTex(doubleValue(p))}` },
      );
    }
    return steps;
  },
};

interface DoubleTilesParams {
  form: number;
  m: number;
  v: number;
}

interface DoubleForm {
  hard: boolean;
  template: (H: string, D: string) => string;
  answer: (H: string, D: string) => string[];
  wrong: (H: string, D: string, Q: string) => string[];
  says: string;
}

const DOUBLE_FORMS: DoubleForm[] = [
  {
    hard: false,
    template: (H, D) => `\\sin ${D} = 2\\sin ${H}\\,{0}`,
    answer: (H) => [`\\cos ${H}`],
    wrong: (H, D) => [`\\cos ${D}`, `\\sin ${H}`, `\\cos^2 ${H}`],
    says: '\\sin 2A = 2\\sin A\\cos A',
  },
  {
    hard: false,
    template: (_H, D) => `\\cos ${D} = 1 - {0}`,
    answer: (H) => [`2\\sin^2 ${H}`],
    wrong: (H, D) => [`2\\sin^2 ${D}`, `\\sin^2 ${H}`, `2\\cos^2 ${H}`],
    says: '\\cos 2A = 1 - 2\\sin^2 A',
  },
  {
    hard: false,
    template: (_H, D) => `\\cos ${D} = {0} - 1`,
    answer: (H) => [`2\\cos^2 ${H}`],
    wrong: (H, D) => [`2\\cos^2 ${D}`, `\\cos^2 ${H}`, `2\\sin^2 ${H}`],
    says: '\\cos 2A = 2\\cos^2 A - 1',
  },
  {
    hard: false,
    template: (_H, D) => `\\cos ${D} = {0} - {1}`,
    answer: (H) => [`\\cos^2 ${H}`, `\\sin^2 ${H}`],
    wrong: (H, D) => [`\\cos^2 ${D}`, `\\sin^2 ${D}`, `2\\sin^2 ${H}`],
    says: '\\cos 2A = \\cos^2 A - \\sin^2 A',
  },
  {
    hard: false,
    template: (H) => `{0} = 2\\sin ${H}\\cos ${H}`,
    answer: (_H, D) => [`\\sin ${D}`],
    wrong: (H, D, Q) => [`\\sin ${H}`, `2\\sin ${D}`, `\\cos ${D}`, `\\sin ${Q}`],
    says: '\\sin 2A = 2\\sin A\\cos A',
  },
  {
    hard: false,
    template: (H) => `{0} = 1 - 2\\sin^2 ${H}`,
    answer: (_H, D) => [`\\cos ${D}`],
    wrong: (H, D) => [`\\cos ${H}`, `\\sin ${D}`, `\\cos^2 ${H}`],
    says: '\\cos 2A = 1 - 2\\sin^2 A',
  },
  {
    hard: true,
    template: (H, D) => `\\tan ${D} = {0} \\div (1 - \\tan^2 ${H})`,
    answer: (H) => [`2\\tan ${H}`],
    wrong: (H, D) => [`\\tan ${H}`, `2\\tan ${D}`, `\\tan^2 ${H}`],
    says: '\\tan 2A = \\frac{2\\tan A}{1 - \\tan^2 A}',
  },
  {
    hard: true,
    template: (H) => `\\sin^2 ${H} = \\tfrac12(1 - {0})`,
    answer: (_H, D) => [`\\cos ${D}`],
    wrong: (H, D) => [`\\cos ${H}`, `\\sin ${D}`, `\\cos^2 ${H}`],
    says: '\\cos 2A = 1 - 2\\sin^2 A',
  },
  {
    hard: true,
    template: (H) => `\\cos^2 ${H} = \\tfrac12({0})`,
    answer: (_H, D) => [`1 + \\cos ${D}`],
    wrong: (H, D) => [`1 - \\cos ${D}`, `1 + \\cos ${H}`, `\\cos ${D}`],
    says: '\\cos 2A = 2\\cos^2 A - 1',
  },
];

/** A double-angle formula completed, including for 2 times a multiple: cos 6x from sin 3x. */
const doubleTiles: Generator<DoubleTilesParams> = {
  id: 'tid-double-tiles',
  sample: (rng, difficulty) => {
    const forms = DOUBLE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, m: rng.int(1, 4), v: rng.int(0, VARS.length - 1) };
  },
  render: ({ form, m, v }): Slide => {
    const f = DOUBLE_FORMS[form];
    const x = VARS[v];
    const H = m === 1 ? x : `${m}${x}`;
    const D = `${2 * m}${x}`;
    const Q = `${4 * m}${x}`;
    const answer = f.answer(H, D);
    return {
      kind: 'tiles',
      prompt: [prose(m === 1 ? 'Complete the double-angle formula.' : `Complete the double-angle formula. Here the single angle is $${H}$.`)],
      template: f.template(H, D),
      bank: bankOf(answer, f.wrong(H, D, Q)),
      answer,
    };
  },
  solution: ({ form, m, v }) => {
    const f = DOUBLE_FORMS[form];
    const x = VARS[v];
    const H = m === 1 ? x : `${m}${x}`;
    const D = `${2 * m}${x}`;
    let line = f.template(H, D);
    f.answer(H, D).forEach((token, i) => {
      line = line.replace(`{${i}}`, token);
    });
    return [
      { text: 'The formula is' },
      { tex: f.says },
      { text: m === 1 ? `with $A = ${x}$.` : `with $A = ${H}$, so $2A = ${D}$: the single angle is always half the double one.` },
      { tex: line },
    ];
  },
};

interface DoubleCollapseParams {
  form: number;
  a: number;
  radians: boolean;
}

const DOUBLE_COLLAPSE = [
  { hard: false, fn: 'sin' as Fn, tex: (a: string) => `2\\sin ${a}\\cos ${a}` },
  { hard: false, fn: 'cos' as Fn, tex: (a: string) => `\\cos^2 ${a} - \\sin^2 ${a}` },
  { hard: false, fn: 'cos' as Fn, tex: (a: string) => `1 - 2\\sin^2 ${a}` },
  { hard: false, fn: 'cos' as Fn, tex: (a: string) => `2\\cos^2 ${a} - 1` },
  { hard: true, fn: 'tan' as Fn, tex: (a: string) => `\\dfrac{2\\tan ${a}}{1 - \\tan^2 ${a}}` },
];

const COLLAPSE_HALVES = [15, 22.5, 30, 60, 67.5, 75];
const COLLAPSE_HALVES_ALL = [15, 22.5, 30, 60, 67.5, 75, 105, 112.5, 150, 165];

/** A double-angle formula read backwards: 2 sin 15 cos 15 is sin 30. */
const doubleCollapseChoice: Generator<DoubleCollapseParams> = {
  id: 'tid-double-collapse-choice',
  sample: (rng, difficulty) => {
    const forms = DOUBLE_COLLAPSE.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return {
      form: rng.pick(forms).i,
      a: rng.pick(difficulty > 1 ? COLLAPSE_HALVES_ALL : COLLAPSE_HALVES),
      radians: rng.chance(0.5),
    };
  },
  render: (p): Slide => {
    const f = DOUBLE_COLLAPSE[p.form];
    const value = trigAt(f.fn, 2 * p.a)!;
    const other: Fn = f.fn === 'sin' ? 'cos' : 'sin';
    const candidates = [
      -value,
      trigAt(other, 2 * p.a)!,
      -trigAt(other, 2 * p.a)!,
      0.5,
      Math.sqrt(3) / 2,
      Math.SQRT2 / 2,
      1,
    ];
    const wrong = candidates.map(tryTex).filter((t): t is string => t !== undefined);
    return choiceSlide(
      [prose('What is the exact value?'), display(f.tex(angleTex(p.a, p.radians)))],
      specialTex(value),
      wrong,
      saltOf(p),
    );
  },
  solution: (p) => {
    const f = DOUBLE_COLLAPSE[p.form];
    const a = angleTex(p.a, p.radians);
    const two = angleTex(2 * p.a, p.radians);
    return [
      { text: `This is the double-angle formula for $\\${f.fn} 2A$, read backwards, with $A = ${a}$.` },
      { tex: `${f.tex(a)} = \\${f.fn} ${two} = ${specialTex(trigAt(f.fn, 2 * p.a)!)}` },
    ];
  },
};

interface DoubleStepsParams {
  form: number;
  k: number;
  v: number;
}

const DOUBLE_STEPS: StepsForm[] = [
  {
    hard: false,
    start: (c, _k, v) => [`${c}\\sin 2${v}`, '\\div', `2\\cos ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\sin ${v}\\cos ${v}`, bank: [`${k}\\sin ${v}\\cos ${v}`, `${2 * k}\\sin ${v}`, `${c}\\cos 2${v}`] },
      { span: [0, 3], value: `${c}\\sin ${v}`, bank: [`${2 * k}\\sin ${v}`, `${c}\\cos ${v}`, `${c}\\tan ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `$\\sin 2${v} = 2\\sin ${v}\\cos ${v}$.` },
      { tex: `${2 * k}\\sin ${v}\\cos ${v} \\div 2\\cos ${v} = ${c}\\sin ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\cos 2${v})`, '\\div', `\\sin ${v}`],
    reductions: (_c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\sin^2 ${v}`, bank: [`${k}\\sin^2 ${v}`, `${2 * k}\\cos^2 ${v}`, `-${2 * k}\\sin^2 ${v}`] },
      { span: [0, 3], value: `${2 * k}\\sin ${v}`, bank: [`${k}\\sin ${v}`, `${2 * k}\\cos ${v}`, `${2 * k}\\sin^2 ${v}`] },
    ],
    why: (_c, k, v) => [
      { text: `$\\cos 2${v} = 1 - 2\\sin^2 ${v}$, so $1 - \\cos 2${v} = 2\\sin^2 ${v}$.` },
      { tex: `${2 * k}\\sin^2 ${v} \\div \\sin ${v} = ${2 * k}\\sin ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 + \\cos 2${v})`, '\\div', `\\cos ${v}`],
    reductions: (_c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\cos^2 ${v}`, bank: [`${k}\\cos^2 ${v}`, `${2 * k}\\sin^2 ${v}`, `${2 * k}\\cos^2 ${v} - ${k}`] },
      { span: [0, 3], value: `${2 * k}\\cos ${v}`, bank: [`${k}\\cos ${v}`, `${2 * k}\\sin ${v}`, `${2 * k}\\cos^2 ${v}`] },
    ],
    why: (_c, k, v) => [
      { text: `$\\cos 2${v} = 2\\cos^2 ${v} - 1$, so $1 + \\cos 2${v} = 2\\cos^2 ${v}$.` },
      { tex: `${2 * k}\\cos^2 ${v} \\div \\cos ${v} = ${2 * k}\\cos ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}\\sin 2${v}`, '\\div', `\\sin ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\sin ${v}\\cos ${v}`, bank: [`${k}\\sin ${v}\\cos ${v}`, `${2 * k}\\sin ${v}`, `${c}\\cos 2${v}`] },
      { span: [0, 3], value: `${2 * k}\\cos ${v}`, bank: [`${c}\\cos ${v}`, `${2 * k}\\sin ${v}`, `${c}\\cos 2${v}`] },
    ],
    why: (_c, k, v) => [
      { text: `$\\sin 2${v} = 2\\sin ${v}\\cos ${v}$.` },
      { tex: `${2 * k}\\sin ${v}\\cos ${v} \\div \\sin ${v} = ${2 * k}\\cos ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}\\cos 2${v}`, '\\div', `(\\cos ${v} - \\sin ${v})`],
    reductions: (c, _k, v) => [
      {
        span: [0, 1],
        value: `${c}(\\cos ${v} - \\sin ${v})(\\cos ${v} + \\sin ${v})`,
        bank: [`${c}(\\cos ${v} - \\sin ${v})^2`, `${c}(1 - 2\\sin ${v})`, `${c}(\\cos ${v} + \\sin ${v})^2`],
      },
      { span: [0, 3], value: `${c}(\\cos ${v} + \\sin ${v})`, bank: [`${c}(\\cos ${v} - \\sin ${v})`, `${c}`, `${c}\\cos 2${v}`] },
    ],
    why: (c, _k, v) => [
      {
        text: `$\\cos 2${v} = \\cos^2 ${v} - \\sin^2 ${v}$, a difference of two squares: it is $(\\cos ${v} - \\sin ${v})(\\cos ${v} + \\sin ${v})$, so the bracket $\\cos ${v} - \\sin ${v}$ cancels.`,
      },
      { tex: `${c}\\cos 2${v} \\div (\\cos ${v} - \\sin ${v}) = ${c}(\\cos ${v} + \\sin ${v})` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}(1 - \\cos 2${v})`, '\\div', `\\sin 2${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\sin^2 ${v}`, bank: [`${k}\\sin^2 ${v}`, `${2 * k}\\cos^2 ${v}`, `${c}\\sin 2${v}`] },
      { span: [2, 3], value: `2\\sin ${v}\\cos ${v}`, bank: [`2\\sin ${v}`, `\\sin ${v}\\cos ${v}`, `2\\cos^2 ${v}`] },
      { span: [0, 3], value: `${c}\\tan ${v}`, bank: [`${c}\\cot ${v}`, `${2 * k}\\tan ${v}`, `${c}\\sin ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `Rewrite both: $1 - \\cos 2${v} = 2\\sin^2 ${v}$ and $\\sin 2${v} = 2\\sin ${v}\\cos ${v}$.` },
      { tex: `\\frac{${2 * k}\\sin^2 ${v}}{2\\sin ${v}\\cos ${v}} = ${c}\\frac{\\sin ${v}}{\\cos ${v}} = ${c}\\tan ${v}` },
    ],
  },
];

/** Simplify with a double-angle formula: rewrite the double angle, then cancel. */
const doubleSteps: Generator<DoubleStepsParams> = {
  id: 'tid-double-steps',
  sample: (rng, difficulty) => {
    const forms = DOUBLE_STEPS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, k: rng.int(1, 6), v: rng.int(0, VARS.length - 1) };
  },
  render: ({ form, k, v }): Slide => {
    const f = DOUBLE_STEPS[form];
    const c = co(k);
    const letter = VARS[v];
    return {
      kind: 'steps',
      prompt: [prose('Rewrite the double angle with the formula that makes things cancel, then simplify.')],
      start: f.start(c, k, letter),
      reductions: f.reductions(c, k, letter).map((r) => ({ ...r, bank: scatter([r.value, ...r.bank.filter((b) => b !== r.value)]) })),
    };
  },
  solution: ({ form, k, v }) => DOUBLE_STEPS[form].why(co(k), k, VARS[v]),
};

/* ---------- Level 2, lesson 5: equations with a double angle ---------- */

interface DoubleEqFlowParams {
  /** 0: cos 2x against sin x; 1: cos 2x against cos x; 2: sin 2x against cos x; 3: sin 2x against sin x. */
  type: number;
  a: number;
  b: number;
  /** For types 2 and 3: the multiple of the single function, from K_VALUES. */
  kIndex: number;
}

const K_VALUES = [
  { value: 1, tex: '' },
  { value: -1, tex: '-' },
  { value: Math.sqrt(3), tex: '\\sqrt{3}' },
  { value: Math.SQRT2, tex: '\\sqrt{2}' },
];

const FORM_LABELS = [
  '$\\cos 2x = 1 - 2\\sin^2 x$',
  '$\\cos 2x = 2\\cos^2 x - 1$',
  '$\\cos 2x = \\cos^2 x - \\sin^2 x$',
  '$\\sin 2x = 2\\sin x\\cos x$',
];

/** 2 sin x - k, as written inside a factor. */
function minusK(fn: string, kIndex: number): string {
  const k = K_VALUES[kIndex];
  if (k.value === -1) return `2\\${fn} x + 1`;
  return `2\\${fn} x - ${k.tex === '' ? '1' : k.tex}`;
}

function doubleEqTex(p: DoubleEqFlowParams): string {
  if (p.type === 0) return `\\cos 2x = ${polyTex([[p.a, '\\sin x'], [p.b, '']])}`;
  if (p.type === 1) return `\\cos 2x = ${polyTex([[p.a, '\\cos x'], [p.b, '']])}`;
  const k = K_VALUES[p.kIndex].tex;
  return `\\sin 2x = ${k}\\${p.type === 2 ? 'cos' : 'sin'} x`;
}

/** Which version of cos 2x (or sin 2x) turns this into one function, and what does it become? */
const doubleEqFlow: Generator<DoubleEqFlowParams> = {
  id: 'tid-double-eq-flow',
  sample: (rng) => {
    const type = rng.int(0, 3);
    let a = rng.int(-4, 4);
    if (a === 0) a = 3;
    return { type, a, b: rng.int(-3, 3), kIndex: rng.int(0, K_VALUES.length - 1) };
  },
  render: (p): Slide => {
    const { a, b } = p;
    let right: string;
    let slips: string[];
    let form: string;
    if (p.type === 0) {
      form = FORM_LABELS[0];
      right = `$${quadTex(2, a, b - 1, 'sin')} = 0$`;
      slips = [`$${quadTex(2, -a, b - 1, 'sin')} = 0$`, `$${quadTex(2, a, b + 1, 'sin')} = 0$`, `$${quadTex(2, a, b, 'sin')} = 0$`];
    } else if (p.type === 1) {
      form = FORM_LABELS[1];
      right = `$${quadTex(2, -a, -(1 + b), 'cos')} = 0$`;
      slips = [`$${quadTex(2, a, -(1 + b), 'cos')} = 0$`, `$${quadTex(2, -a, 1 - b, 'cos')} = 0$`, `$${quadTex(2, -a, -b, 'cos')} = 0$`];
    } else {
      form = FORM_LABELS[3];
      const [f, g] = p.type === 2 ? ['cos', 'sin'] : ['sin', 'cos'];
      right = `$\\${f} x(${minusK(g, p.kIndex)}) = 0$`;
      slips = [`$${minusK(g, p.kIndex)} = 0$`, `$\\${g} x(${minusK(f, p.kIndex)}) = 0$`, `$\\${f} x(${minusK(g, p.kIndex)}) = 1$`];
    }
    const results = [right, ...[...new Set(slips)].filter((s) => s !== right)].sort((x, y) => hashSeed(x) - hashSeed(y));
    return {
      kind: 'flow',
      prompt: [prose('Pick the version of the double-angle formula that leaves one function, then say what the equation becomes.')],
      subject: doubleEqTex(p),
      steps: [
        { id: 'form', ask: 'Which version do you use?', branches: FORM_LABELS.map((label) => ({ label, to: 'becomes' })) },
        {
          id: 'becomes',
          ask: 'Bring everything to one side. The equation becomes',
          branches: results.map((label) => ({ label, outcome: 'Ready to factorise and solve.' })),
        },
      ],
      answer: [form, right],
    };
  },
  solution: (p) => {
    if (p.type === 0) {
      return [
        { text: 'The other side has $\\sin x$ in it, so use the version of $\\cos 2x$ with only sines: $1 - 2\\sin^2 x$.' },
        { tex: `1 - 2\\sin^2 x = ${polyTex([[p.a, '\\sin x'], [p.b, '']])}` },
        { tex: `${quadTex(2, p.a, p.b - 1, 'sin')} = 0` },
      ];
    }
    if (p.type === 1) {
      return [
        { text: 'The other side has $\\cos x$ in it, so use the version with only cosines: $2\\cos^2 x - 1$.' },
        { tex: `2\\cos^2 x - 1 = ${polyTex([[p.a, '\\cos x'], [p.b, '']])}` },
        { tex: `${quadTex(2, -p.a, -(1 + p.b), 'cos')} = 0` },
      ];
    }
    const [f, g] = p.type === 2 ? ['cos', 'sin'] : ['sin', 'cos'];
    return [
      { text: `Write $\\sin 2x = 2\\sin x\\cos x$. Both sides then share a factor of $\\${f} x$.` },
      {
        text: `Take it out rather than dividing by it: dividing would lose the solutions where $\\${f} x = 0$.`,
      },
      { tex: `\\${f} x(${minusK(g, p.kIndex)}) = 0` },
    ];
  },
};

interface DoubleEqSliderParams {
  eq: number;
  pick: number;
}

/** Equations with a double angle, each as the special values its factors give. */
const DOUBLE_EQS: { hard: boolean; lhs: 'sin' | 'cos'; k: number; kTex: string; rhs: 'sin' | 'cos'; parts: [Fn, number][] }[] = [
  { hard: false, lhs: 'sin', k: 1, kTex: '', rhs: 'sin', parts: [['sin', 0], ['cos', 0.5]] },
  { hard: false, lhs: 'sin', k: 1, kTex: '', rhs: 'cos', parts: [['cos', 0], ['sin', 0.5]] },
  { hard: false, lhs: 'sin', k: -1, kTex: '-', rhs: 'sin', parts: [['sin', 0], ['cos', -0.5]] },
  { hard: false, lhs: 'sin', k: -1, kTex: '-', rhs: 'cos', parts: [['cos', 0], ['sin', -0.5]] },
  { hard: false, lhs: 'cos', k: 1, kTex: '', rhs: 'cos', parts: [['cos', 1], ['cos', -0.5]] },
  { hard: false, lhs: 'cos', k: -1, kTex: '-', rhs: 'cos', parts: [['cos', 0.5], ['cos', -1]] },
  { hard: false, lhs: 'cos', k: 1, kTex: '', rhs: 'sin', parts: [['sin', 0.5], ['sin', -1]] },
  { hard: false, lhs: 'cos', k: -1, kTex: '-', rhs: 'sin', parts: [['sin', -0.5], ['sin', 1]] },
  { hard: true, lhs: 'sin', k: Math.sqrt(3), kTex: '\\sqrt{3}', rhs: 'cos', parts: [['cos', 0], ['sin', Math.sqrt(3) / 2]] },
  { hard: true, lhs: 'sin', k: Math.SQRT2, kTex: '\\sqrt{2}', rhs: 'sin', parts: [['sin', 0], ['cos', Math.SQRT2 / 2]] },
  { hard: false, lhs: 'sin', k: Math.sqrt(3), kTex: '\\sqrt{3}', rhs: 'sin', parts: [['sin', 0], ['cos', Math.sqrt(3) / 2]] },
  { hard: false, lhs: 'sin', k: Math.SQRT2, kTex: '\\sqrt{2}', rhs: 'cos', parts: [['cos', 0], ['sin', Math.SQRT2 / 2]] },
];

/** Every solution with 0 < x < 360, smallest first. */
function doubleEqSolutions(eq: number): number[] {
  const out = new Set<number>();
  for (const [fn, value] of DOUBLE_EQS[eq].parts) for (const d of solutionsOf(fn, value)) if (d > 0) out.add(d);
  return [...out].sort((a, b) => a - b);
}

const ORDINALS = ['smallest', 'second smallest', 'third smallest', 'fourth smallest'];

/** Where the two curves cross: slide to one particular solution. */
const doubleEqSlider: Generator<DoubleEqSliderParams> = {
  id: 'tid-double-eq-slider',
  sample: (rng, difficulty) => {
    const eqs = DOUBLE_EQS.map((e, i) => ({ e, i })).filter(({ e }) => difficulty > 1 || !e.hard);
    const eq = rng.pick(eqs).i;
    return { eq, pick: rng.int(0, doubleEqSolutions(eq).length - 1) };
  },
  render: ({ eq, pick }): Slide => {
    const e = DOUBLE_EQS[eq];
    const sols = doubleEqSolutions(eq);
    const last = pick === sols.length - 1;
    const f = (fn: 'sin' | 'cos') => (fn === 'sin' ? Math.sin : Math.cos);
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [
        { f: (x) => f(e.lhs)(2 * x * DEGREE), accent: true },
        { f: (x) => e.k * f(e.rhs)(x * DEGREE) },
      ],
      yMin: -2,
      yMax: 2,
      label: `The graphs of y = ${e.lhs} 2x and the right-hand side from 0 to 360 degrees, crossing at the solutions`,
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `The coloured curve is the left-hand side and the other is the right. Solve, and slide to the ${last ? 'largest' : ORDINALS[pick]} solution with $0^{\\circ} < x < 360^{\\circ}$.`,
        ),
        display(`\\${e.lhs} 2x = ${e.kTex}\\${e.rhs} x`),
      ],
      // Stopping at 330 puts the untouched handle at 165, which is never a solution here.
      min: 0,
      max: 330,
      step: 15,
      answer: sols[pick],
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: ({ eq, pick }) => {
    const e = DOUBLE_EQS[eq];
    const sols = doubleEqSolutions(eq);
    const parts = e.parts.map(([fn, v]) => `\\${fn} x = ${specialTex(v)}`).join(' \\quad \\text{or} \\quad ');
    return [
      {
        text:
          e.lhs === 'sin'
            ? `Write $\\sin 2x = 2\\sin x\\cos x$ and take out the common factor.`
            : `Write $\\cos 2x$ in terms of $\\${e.rhs} x$ alone and factorise the quadratic.`,
      },
      { tex: parts },
      { text: `So $x = ${sols.map(deg).join(', ')}$, and the one asked for is $${deg(sols[pick])}$.` },
    ];
  },
};

interface DoubleQuadParams {
  target: 'sin' | 'cos';
  r1: Rat;
  r2: Rat;
  hint: boolean;
}

const HALF_ROOTS: Rat[] = [
  [1, 2],
  [-1, 2],
  [3, 2],
  [-3, 2],
];
const WHOLE_ROOTS: Rat[] = [1, -1, 2, -2, 3, -3].map((n) => [n, 1] as Rat);

/** cos 2x + q sin x + r = 0, which is a quadratic in sin x once cos 2x = 1 - 2 sin^2 x. */
const doubleQuadTiles: Generator<DoubleQuadParams> = {
  id: 'tid-double-quadratic-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const r1 = rng.pick(HALF_ROOTS);
      const r2 = rng.pick(WHOLE_ROOTS);
      const [, , C] = quadratic(r1, r2);
      // No constant term is a different shape; and at least one root a sine or cosine can take.
      if (C + 1 === 0 || (Math.abs(ratValue(r1)) > 1 && Math.abs(ratValue(r2)) > 1)) continue;
      return { target: rng.pick(['sin', 'cos'] as const), r1, r2, hint: difficulty === 1 };
    }
  },
  render: (p): Slide => {
    const [A, B, C] = quadratic(p.r1, p.r2);
    const f = p.target;
    const shown =
      f === 'sin'
        ? `\\cos 2x ${signed(-B, '\\sin x')} ${signed(-(C + 1), '')} = 0`
        : `\\cos 2x ${signed(B, '\\cos x')} ${signed(C + 1, '')} = 0`;
    const answer = [signed(A, `\\${f}^2 x`, true), signed(B, `\\${f} x`), signed(C, '')];
    const distractors = [signed(-B, `\\${f} x`), signed(-C, ''), `\\${f}^2 x`, signed(C + 2, ''), signed(A, `\\${f === 'sin' ? 'cos' : 'sin'}^2 x`, true)];
    const hint = f === 'sin' ? '$\\cos 2x = 1 - 2\\sin^2 x$' : '$\\cos 2x = 2\\cos^2 x - 1$';
    return {
      kind: 'tiles',
      prompt: [
        prose(
          p.hint
            ? `Use ${hint} to write this as a quadratic in $\\${f} x$, with the squared term positive.`
            : `Write this as a quadratic in $\\${f} x$, with the squared term positive.`,
        ),
        display(shown),
      ],
      template: '{0} {1} {2} = 0',
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const [A, B, C] = quadratic(p.r1, p.r2);
    const f = p.target;
    return f === 'sin'
      ? [
          { text: 'The other term is in $\\sin x$, so use $\\cos 2x = 1 - 2\\sin^2 x$:' },
          { tex: `1 - 2\\sin^2 x ${signed(-B, '\\sin x')} ${signed(-(C + 1), '')} = 0` },
          { text: 'Collect the numbers and multiply through by $-1$:' },
          { tex: `${quadTex(A, B, C, 'sin')} = 0` },
        ]
      : [
          { text: 'The other term is in $\\cos x$, so use $\\cos 2x = 2\\cos^2 x - 1$:' },
          { tex: `2\\cos^2 x - 1 ${signed(B, '\\cos x')} ${signed(C + 1, '')} = 0` },
          { tex: `${quadTex(A, B, C, 'cos')} = 0` },
        ];
  },
};

interface DoubleTreeParams {
  fn: Fn;
  value: number;
  /** 0: 0 <= x < 180; 1: 180 <= x < 360. */
  half: number;
  radians: boolean;
}

const TREE_VALUES: Record<Fn, number[]> = {
  sin: [0, 0.5, -0.5, Math.SQRT2 / 2, -Math.SQRT2 / 2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2],
  cos: [0, 0.5, -0.5, Math.SQRT2 / 2, -Math.SQRT2 / 2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2],
  tan: [0, 1, -1, Math.sqrt(3), -Math.sqrt(3), 1 / Math.sqrt(3), -1 / Math.sqrt(3)],
};

/** The two values of 2x in its doubled interval, smallest first. */
const doubledAngles = ({ fn, value, half }: DoubleTreeParams): number[] => solutionsOf(fn, value).map((d) => d + 360 * half);

/** Solve fn 2x = k: the interval doubles, so find 2x first, then halve. */
const doubleEqTree: Generator<DoubleTreeParams> = {
  id: 'tid-double-eq-tree',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos', 'tan'] as const);
    return { fn, value: rng.pick(TREE_VALUES[fn]), half: rng.int(0, 1), radians: difficulty > 1 };
  },
  render: (p): Slide => {
    const twos = doubledAngles(p);
    const a = (d: number) => angleTex(d, p.radians);
    const answer = [...twos.map((d) => `2x = ${a(d)}`), ...twos.map((d) => `x = ${a(d / 2)}`)];
    const base = solutionsOf(p.fn, p.value);
    const distractors = [
      ...twos.map((d) => `x = ${a(2 * d)}`),
      ...base.map((d) => `x = ${a(d)}`),
      ...base.map((d) => `2x = ${a(d + 360 * (1 - p.half))}`),
      `2x = ${a(twos[0] + 180)}`,
    ];
    const range = p.half === 0 ? [0, 180] : [180, 360];
    const rangeTex = `${a(range[0])} \\le x < ${a(range[1])}`;
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Solve for $${rangeTex}$. That makes $${a(2 * range[0])} \\le 2x < ${a(2 * range[1])}$. Top row: the two values of $2x$, smaller first. Underneath each: the $x$ it gives.`,
        ),
      ],
      expression: `\\${p.fn} 2x = ${specialTex(p.value)}`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'xa', from: ['a'] },
        { id: 'xb', from: ['b'] },
      ],
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const twos = doubledAngles(p);
    const a = (d: number) => angleTex(d, p.radians);
    const base = solutionsOf(p.fn, p.value);
    return [
      { text: `If $x$ runs over half a turn, $2x$ runs over a whole one, so look for every $2x$ in that doubled range.` },
      { text: `$\\${p.fn} \\theta = ${specialTex(p.value)}$ at $\\theta = ${base.map(a).join(', ')}$ in the first turn${p.half === 1 ? `; add a full turn to land in the range` : ''}.` },
      { tex: `2x = ${twos.map(a).join(' \\text{ or } ')}` },
      { tex: `x = ${twos.map((d) => a(d / 2)).join(' \\text{ or } ')}` },
    ];
  },
};

/* ---------- Level 3: the form R sin(x + α) ---------- */

/**
 * The four forms, with R > 0 and α acute. Each expands to R cos α times its own
 * function, then R sin α times the other function with `sign` between them:
 * R sin(x + α) = R cos α sin x + R sin α cos x, and
 * R cos(x - α) = R cos α cos x + R sin α sin x.
 *
 * So two positive terms added fit two forms (R sin(x + α) and R cos(x - α),
 * with different α) and a minus fits exactly one. Every question here names
 * the form it wants, and never offers both of a tie as options.
 */
const R_FORMS: { fn: 'sin' | 'cos'; plus: boolean; sign: '+' | '-' }[] = [
  { fn: 'sin', plus: true, sign: '+' },
  { fn: 'sin', plus: false, sign: '-' },
  { fn: 'cos', plus: false, sign: '+' },
  { fn: 'cos', plus: true, sign: '-' },
];

/** Forms with both terms added, and with a minus. `form ^ 1` is the same function with the other sign. */
const PLUS_FORMS = [0, 2];
const SIN_FORMS = [0, 1];
const ALL_FORMS = [0, 1, 2, 3];

const R_VARS = ['x', '\\theta'];

const otherFn = (fn: 'sin' | 'cos'): 'sin' | 'cos' => (fn === 'sin' ? 'cos' : 'sin');

/** A coefficient: its value, and its TeX standing alone ('1' for one). */
interface Coef {
  value: number;
  tex: string;
}

const wholeCoef = (n: number): Coef => ({ value: n, tex: `${n}` });

/** A coefficient in front of a function: nothing for 1. */
const front = (c: Coef): string => (c.tex === '1' ? '' : c.tex);

/** `C` times the form's own function, then `S` times the other with the form's sign. Swapped writes the other term first. */
function rExprTex(form: number, C: Coef, S: Coef, v: string, swapped = false): string {
  const f = R_FORMS[form];
  const own = `${front(C)}\\${f.fn} ${v}`;
  const other = `${front(S)}\\${otherFn(f.fn)} ${v}`;
  return swapped ? `${f.sign === '-' ? '-' : ''}${other} + ${own}` : `${own} ${f.sign} ${other}`;
}

/** R sin(x + α) and its kin, with R and α as given TeX. */
function rFormTex(form: number, r: string, v: string, alpha: string): string {
  const f = R_FORMS[form];
  return `${r}\\${f.fn}(${v} ${f.plus ? '+' : '-'} ${alpha})`;
}

/**
 * An expansion as three rows: the left side, its first term, then the second
 * term under it. Written out rather than left to `fit`, which keeps a short
 * left side on the first row, and a bracket beside an equals sign and a
 * product is already too wide for a phone.
 */
const stacked = (lhs: string, first: string, sign: string, second: string): string =>
  `\\begin{aligned} &${lhs} \\\\ &= ${first} \\\\ &\\quad ${sign} ${second} \\end{aligned}`;

/** Why a sign pattern fits the form named, for a worked solution. */
function formReason(form: number, v: string): string {
  const f = R_FORMS[form];
  return f.sign === '+'
    ? `Both terms are added. $${rFormTex(form, 'R', v, '\\alpha')}$ expands with a plus between two positive terms:`
    : `There is a minus, and $${rFormTex(form, 'R', v, '\\alpha')}$ puts it in front of the $\\${otherFn(f.fn)}$ term:`;
}

/** Whole coefficients from a Pythagorean triple, so R is whole: 6 sin x + 8 cos x has R = 10. */
interface WholePair {
  C: number;
  S: number;
  R: number;
}

/** How far each row of TRIPLES is scaled, so every coefficient stays small enough to square in the head. */
const PAIR_SCALES: { easy: number[]; all: number[] }[] = [
  { easy: [1, 2, 3], all: [1, 2, 3, 4] },
  { easy: [1], all: [1, 2] },
  { easy: [], all: [1] },
  { easy: [], all: [1] },
];

function wholePairs(difficulty: number): WholePair[] {
  const out: WholePair[] = [];
  TRIPLES.forEach(([p, q, h], t) => {
    for (const k of difficulty > 1 ? PAIR_SCALES[t].all : PAIR_SCALES[t].easy) {
      out.push({ C: k * p, S: k * q, R: k * h }, { C: k * q, S: k * p, R: k * h });
    }
  });
  return out;
}

/** α in degrees to one decimal place, from R sin α and R cos α. Only ever a choice label or a bank tile. */
const alphaDp = (S: number, C: number): number => Math.round((Math.atan2(S, C) / DEGREE) * 10) / 10;

const dpTex = (degrees: number): string => `${degrees.toFixed(1)}^{\\circ}`;

/**
 * Coefficients from the table: (k√3, k) gives α = 30° and (k, k√3) gives
 * α = 60°, both with R = 2k; (k, k) gives α = 45° with R = k√2.
 */
interface TablePair {
  kind: number;
  k: number;
}

function tableCoefs({ kind, k }: TablePair): { C: Coef; S: Coef; R: Coef; alpha: number; tan: string } {
  const root3: Coef = { value: k * Math.sqrt(3), tex: `${co(k)}\\sqrt{3}` };
  const plain = wholeCoef(k);
  if (kind === 0) return { C: root3, S: plain, R: wholeCoef(2 * k), alpha: 30, tan: '\\frac{1}{\\sqrt{3}}' };
  if (kind === 1) return { C: plain, S: root3, R: wholeCoef(2 * k), alpha: 60, tan: '\\sqrt{3}' };
  return { C: plain, S: plain, R: { value: k * Math.SQRT2, tex: `${co(k)}\\sqrt{2}` }, alpha: 45, tan: '1' };
}

const squareOf = (c: Coef): number => Math.round(c.value * c.value);

function sampleTable(rng: Rng, maxK: number): TablePair {
  return { kind: rng.int(0, 2), k: rng.int(1, maxK) };
}

/** Two different whole coefficients, neither of them zero. */
function sampleCoefs(rng: Rng, max: number): { C: number; S: number } {
  const C = rng.int(1, max);
  let S = rng.int(1, max - 1);
  if (S >= C) S += 1;
  return { C, S };
}

/** The lines that match coefficients and read off tan α, shared by several solutions. */
function matchSteps(form: number, v: string, C: string, S: string): SolutionStep[] {
  return [
    { text: formReason(form, v) },
    {
      tex: stacked(
        rFormTex(form, 'R', v, '\\alpha'),
        `R\\cos\\alpha\\,\\${R_FORMS[form].fn} ${v}`,
        R_FORMS[form].sign,
        `R\\sin\\alpha\\,\\${otherFn(R_FORMS[form].fn)} ${v}`,
      ),
    },
    { text: `Match the $\\${R_FORMS[form].fn}$ terms, then the $\\${otherFn(R_FORMS[form].fn)}$ terms:` },
    { tex: `R\\cos\\alpha = ${C} \\qquad R\\sin\\alpha = ${S}` },
  ];
}

/* Lesson 1: matching the expansion. */

interface RExpandParams {
  form: number;
  R: number;
  v: number;
  signed: boolean;
}

/** Expand R sin(x + α) with R a number and α a letter. The harder draws put the sign on the tile. */
const rExpandTiles: Generator<RExpandParams> = {
  id: 'tid-r-expand-tiles',
  sample: (rng, difficulty) => ({
    form: rng.pick(difficulty > 1 ? ALL_FORMS : PLUS_FORMS),
    R: rng.int(2, difficulty > 1 ? 15 : 12),
    v: rng.int(0, R_VARS.length - 1),
    signed: difficulty > 1,
  }),
  render: ({ form, R, v, signed }): Slide => {
    const f = R_FORMS[form];
    const x = R_VARS[v];
    const other = otherFn(f.fn);
    const cosA = `${R}\\cos\\alpha`;
    const sinA = `${R}\\sin\\alpha`;
    const flip = f.sign === '+' ? '-' : '+';
    const answer = signed ? [cosA, `${f.sign} ${sinA}`] : [cosA, sinA];
    const distractors = signed
      ? [`${flip} ${sinA}`, `${f.sign} ${cosA}`, `${flip} ${cosA}`, sinA]
      : ['\\cos\\alpha', '\\sin\\alpha', `${R}\\tan\\alpha`];
    return {
      kind: 'tiles',
      prompt: [
        prose('Expand with the compound-angle formula, keeping the number in front.'),
        display(`${rFormTex(form, `${R}`, x, '\\alpha')} =`),
      ],
      template: signed ? `{0}\\${f.fn} ${x} {1}\\${other} ${x}` : `{0}\\${f.fn} ${x} ${f.sign} {1}\\${other} ${x}`,
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  solution: ({ form, R, v }) => {
    const f = R_FORMS[form];
    const x = R_VARS[v];
    const other = otherFn(f.fn);
    return [
      { text: `The compound-angle formula, with $${x}$ first and $\\alpha$ second:` },
      { tex: stacked(`\\${f.fn}(${x} ${f.plus ? '+' : '-'} \\alpha)`, `\\${f.fn} ${x}\\cos\\alpha`, f.sign, `\\${other} ${x}\\sin\\alpha`) },
      { text: `Multiply by $${R}$, and write each term as a number times a function of $${x}$:` },
      {
        tex: stacked(rFormTex(form, `${R}`, x, '\\alpha'), `${R}\\cos\\alpha\\,\\${f.fn} ${x}`, f.sign, `${R}\\sin\\alpha\\,\\${other} ${x}`),
      },
    ];
  },
};

interface RPairParams {
  form: number;
  C: number;
  S: number;
  v: number;
  swapped: boolean;
}

function samplePair(rng: Rng, forms: number[], swapChance: number, max: number): RPairParams {
  const { C, S } = sampleCoefs(rng, max);
  return { form: rng.pick(forms), C, S, v: rng.int(0, R_VARS.length - 1), swapped: rng.chance(swapChance) };
}

const pairExpr = (p: RPairParams): string => rExprTex(p.form, wholeCoef(p.C), wholeCoef(p.S), R_VARS[p.v], p.swapped);

/** The forms offered for a pair: the one it is, and every form that cannot fit its signs. Never the other half of a tie. */
function formsOffered(form: number): number[] {
  return R_FORMS[form].sign === '+' ? [form, 1, 3].sort((a, b) => a - b) : ALL_FORMS;
}

/** Which form fits the signs, then tan α from the matched coefficients. */
const rFormFlow: Generator<RPairParams> = {
  id: 'tid-r-form-flow',
  sample: (rng, difficulty) => samplePair(rng, ALL_FORMS, difficulty > 1 ? 0.5 : 0, 9),
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const offered = formsOffered(p.form);
    const labels = offered.map((i) => `$${rFormTex(i, 'R', x, '\\alpha')}$`);
    const tans = [rat(p.S, p.C), rat(p.C, p.S), rat(-p.S, p.C), rat(-p.C, p.S)].map((r) => `$${ratTex(r)}$`);
    return {
      kind: 'flow',
      prompt: [prose('Write this with $R > 0$ and $\\alpha$ acute: pick the form its signs fit, then find $\\tan\\alpha$.')],
      subject: pairExpr(p),
      steps: [
        { id: 'form', ask: 'Which form can it be written in?', branches: labels.map((label) => ({ label, to: 'tan' })) },
        {
          id: 'tan',
          ask: 'Matching coefficients, $\\tan\\alpha$ is',
          branches: scatter(tans).map((label) => ({ label, outcome: '$R\\sin\\alpha$ over $R\\cos\\alpha$ leaves $\\tan\\alpha$.' })),
        },
      ],
      answer: [labels[offered.indexOf(p.form)], `$${ratTex(rat(p.S, p.C))}$`],
    };
  },
  solution: (p) => {
    const x = R_VARS[p.v];
    const simple = ratTex(rat(p.S, p.C));
    const raw = `\\frac{${p.S}}{${p.C}}`;
    return [
      ...matchSteps(p.form, x, `${p.C}`, `${p.S}`),
      { tex: `\\tan\\alpha = \\frac{R\\sin\\alpha}{R\\cos\\alpha} = ${raw}${raw === simple ? '' : ` = ${simple}`}` },
    ];
  },
};

interface RMatchParams extends RPairParams {
  sinFirst: boolean;
}

/** Match coefficients: R cos α and R sin α, placed as numbers. */
const rMatchTiles: Generator<RMatchParams> = {
  id: 'tid-r-match-tiles',
  sample: (rng, difficulty) => ({
    ...samplePair(rng, difficulty > 1 ? ALL_FORMS : PLUS_FORMS, difficulty > 1 ? 0.5 : 0, 9),
    sinFirst: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const answer = p.sinFirst ? [`${p.S}`, `${p.C}`] : [`${p.C}`, `${p.S}`];
    const distractors = [`-${p.S}`, `-${p.C}`, `${p.C + p.S}`, `${Math.abs(p.C - p.S)}`];
    return {
      kind: 'tiles',
      prompt: [prose(`Write this as $${rFormTex(p.form, 'R', x, '\\alpha')}$ and match the coefficients.`), display(pairExpr(p))],
      template: p.sinFirst ? 'R\\sin\\alpha = {0} \\quad R\\cos\\alpha = {1}' : 'R\\cos\\alpha = {0} \\quad R\\sin\\alpha = {1}',
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  choices: (p) => {
    const pair = (c: number, s: number) => `R\\cos\\alpha = ${c},\\; R\\sin\\alpha = ${s}`;
    return options({ tex: pair(p.C, p.S) }, { tex: pair(p.S, p.C) }, { tex: pair(p.C, -p.S) }, { tex: pair(-p.C, p.S) });
  },
  solution: (p) => {
    const steps = matchSteps(p.form, R_VARS[p.v], `${p.C}`, `${p.S}`);
    if (R_FORMS[p.form].sign === '-') {
      steps.push({ text: 'The minus belongs to the form, so both matched values are positive.' });
    }
    return steps;
  },
};

interface RTreeParams {
  form: number;
  v: number;
  whole: WholePair | null;
  table: TablePair | null;
}

function treeCoefs(p: RTreeParams): { C: Coef; S: Coef; R: Coef } {
  if (p.table) return tableCoefs(p.table);
  const { C, S, R } = p.whole!;
  return { C: wholeCoef(C), S: wholeCoef(S), R: wholeCoef(R) };
}

/** Square and add: the two coefficients squared, then R^2, then R. */
const rSquaredTree: Generator<RTreeParams> = {
  id: 'tid-r-squared-tree',
  sample: (rng, difficulty) => {
    const form = rng.pick(difficulty > 1 ? ALL_FORMS : PLUS_FORMS);
    const v = rng.int(0, R_VARS.length - 1);
    if (difficulty > 1 && rng.chance(0.5)) return { form, v, whole: null, table: sampleTable(rng, 3) };
    return { form, v, whole: rng.pick(wholePairs(difficulty)), table: null };
  },
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const { C, S, R } = treeCoefs(p);
    const c2 = squareOf(C);
    const s2 = squareOf(S);
    const r2 = c2 + s2;
    const answer = [`${c2}`, `${s2}`, `${r2}`, R.tex];
    const slips = p.table
      ? p.table.kind === 2
        ? [`${2 * p.table.k}`, `${4 * p.table.k * p.table.k}`]
        : [`${co(p.table.k)}\\sqrt{2}`, `${2 * r2}`]
      : [`${C.value + S.value}`, `${2 * R.value}`];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Written as $${rFormTex(p.form, 'R', x, '\\alpha')}$ with $R > 0$. Top row: $(R\\cos\\alpha)^2$, then $(R\\sin\\alpha)^2$. Underneath: $R^2$, then $R$.`,
        ),
      ],
      expression: rExprTex(p.form, C, S, x),
      nodes: [
        { id: 'c', from: [] },
        { id: 's', from: [] },
        { id: 'r2', from: ['c', 's'] },
        { id: 'r', from: ['r2'] },
      ],
      bank: bankOf(answer, [`-${s2}`, ...slips, `${Math.abs(c2 - s2)}`], 4),
      answer,
    };
  },
  solution: (p) => {
    const x = R_VARS[p.v];
    const { C, S, R } = treeCoefs(p);
    const c2 = squareOf(C);
    const s2 = squareOf(S);
    const root = `\\sqrt{${c2 + s2}}`;
    return [
      {
        text: `Matching coefficients, $R\\cos\\alpha = ${C.tex}$ and $R\\sin\\alpha = ${S.tex}$${R_FORMS[p.form].sign === '-' ? ': the minus belongs to the form' : ''}. Squaring and adding uses $\\cos^2\\alpha + \\sin^2\\alpha = 1$:`,
      },
      { tex: `R^2 = (${C.tex})^2 + (${S.tex})^2 = ${c2} + ${s2} = ${c2 + s2}` },
      { tex: `R = ${root}${root === R.tex ? '' : ` = ${R.tex}`}` },
      { text: `So $${rExprTex(p.form, C, S, x)}$ is $${rFormTex(p.form, R.tex, x, '\\alpha')}$ for some acute $\\alpha$.` },
    ];
  },
};

/* Lesson 2: finding R and α. */

interface RWholeParams {
  form: number;
  pair: WholePair;
  v: number;
  swapped: boolean;
}

function sampleWhole(rng: Rng, difficulty: number, easyForms = PLUS_FORMS): RWholeParams {
  return {
    form: rng.pick(difficulty > 1 ? ALL_FORMS : easyForms),
    pair: rng.pick(wholePairs(difficulty)),
    v: rng.int(0, R_VARS.length - 1),
    swapped: difficulty > 1 && rng.chance(0.5),
  };
}

const wholeExpr = (p: RWholeParams): string =>
  rExprTex(p.form, wholeCoef(p.pair.C), wholeCoef(p.pair.S), R_VARS[p.v], p.swapped);

/** The lines finding R from a whole pair. */
function rSteps(p: RWholeParams): SolutionStep[] {
  const { C, S, R } = p.pair;
  return [
    ...matchSteps(p.form, R_VARS[p.v], `${C}`, `${S}`),
    { tex: `R = \\sqrt{${C}^2 + ${S}^2} = \\sqrt{${C * C + S * S}} = ${R}` },
  ];
}

/** R, typed. */
const rValue: Generator<RWholeParams> = {
  id: 'tid-r-value',
  sample: (rng, difficulty) => sampleWhole(rng, difficulty),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`Write this as $${rFormTex(p.form, 'R', R_VARS[p.v], '\\alpha')}$ with $R > 0$. Find $R$.`),
      display(wholeExpr(p)),
    ],
    lead: 'R =',
    keypad: NUMBER_KEYS,
    answer: `${p.pair.R}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { C, S, R } = p.pair;
    return options(
      { tex: `${R}`, answer: `${R}` },
      { tex: `${R * R}`, answer: `${R * R}` },
      { tex: `${C + S}`, answer: `${C + S}` },
      { tex: `${Math.abs(C - S)}`, answer: `${Math.abs(C - S)}` },
    );
  },
  solution: (p) => [
    ...rSteps(p),
    { text: 'Squaring and adding works because $\\cos^2\\alpha + \\sin^2\\alpha = 1$: the $\\alpha$ drops out and $R^2$ is left.' },
  ],
};

/** tan α as a fraction, typed. Any coefficients: R need not be whole for this. */
const rTanAlpha: Generator<RPairParams> = {
  id: 'tid-r-tan-alpha',
  sample: (rng, difficulty) =>
    difficulty > 1 ? samplePair(rng, ALL_FORMS, 0.5, 12) : samplePair(rng, SIN_FORMS, 0, 9),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`Write this as $${rFormTex(p.form, 'R', R_VARS[p.v], '\\alpha')}$ with $R > 0$ and $\\alpha$ acute. Find $\\tan\\alpha$.`),
      display(pairExpr(p)),
    ],
    lead: '\\tan\\alpha =',
    keypad: NUMBER_KEYS,
    answer: ratAnswer(rat(p.S, p.C)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const simple = ratTex(rat(p.S, p.C));
    const raw = `\\frac{${p.S}}{${p.C}}`;
    return [
      ...matchSteps(p.form, R_VARS[p.v], `${p.C}`, `${p.S}`),
      { text: 'Divide the second by the first: the $R$ cancels.' },
      { tex: `\\tan\\alpha = \\frac{R\\sin\\alpha}{R\\cos\\alpha} = ${raw}${raw === simple ? '' : ` = ${simple}`}` },
    ];
  },
};

/** α to one decimal place, worked on the line: the fraction, its lowest terms, then the angle. */
const rAlphaSteps: Generator<RWholeParams> = {
  id: 'tid-r-alpha-steps',
  sample: (rng, difficulty) => ({ ...sampleWhole(rng, difficulty), swapped: false }),
  render: (p): Slide => {
    const { C, S, R } = p.pair;
    const g = gcd(C, S);
    const a = alphaDp(S, C);
    const frac = (n: number, d: number) => `\\frac{${n}}{${d}}`;
    const reductions: { span: [number, number]; value: string; bank: string[] }[] = [
      { span: [2, 3], value: frac(S, C), bank: [frac(C, S), `-${frac(S, C)}`, frac(S, R)] },
    ];
    if (g > 1) {
      reductions.push({ span: [2, 3], value: frac(S / g, C / g), bank: [frac(C / g, S / g), frac(S, C / g), frac(S / g, C)] });
    }
    reductions.push({
      span: [0, 3],
      value: `\\alpha = ${dpTex(a)}`,
      bank: [`\\alpha = ${dpTex(alphaDp(C, S))}`, `\\alpha = ${dpTex(Math.round((180 - a) * 10) / 10)}`, `\\alpha = -${dpTex(a)}`],
    });
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Write this as $${rFormTex(p.form, 'R', R_VARS[p.v], '\\alpha')}$ with $R > 0$ and $\\alpha$ acute. Find $\\alpha$ to one decimal place, a step at a time.`,
        ),
        display(wholeExpr(p)),
      ],
      start: ['\\tan\\alpha', '=', '\\dfrac{R\\sin\\alpha}{R\\cos\\alpha}'],
      reductions: reductions.map((r) => ({ ...r, bank: scatter([r.value, ...r.bank]) })),
    };
  },
  solution: (p) => {
    const { C, S } = p.pair;
    const simple = ratTex(rat(S, C));
    const raw = `\\frac{${S}}{${C}}`;
    return [
      ...matchSteps(p.form, R_VARS[p.v], `${C}`, `${S}`),
      { tex: `\\tan\\alpha = ${raw}${raw === simple ? '' : ` = ${simple}`}` },
      { text: 'Both matched values are positive, so $\\alpha$ is acute: exactly the angle a calculator gives.' },
      { tex: `\\alpha = \\tan^{-1} ${simple} = ${dpTex(alphaDp(S, C))}` },
    ];
  },
};

/** The whole conversion, picked from four. */
const rConvertChoice: Generator<RWholeParams> = {
  id: 'tid-r-convert-choice',
  sample: (rng, difficulty) => sampleWhole(rng, difficulty),
  render: (p): Slide => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const a = dpTex(alphaDp(S, C));
    return choiceSlide(
      [
        prose(`Write this in the form $${rFormTex(p.form, 'R', x, '\\alpha')}$, with $R > 0$ and $\\alpha$ acute.`),
        display(wholeExpr(p)),
      ],
      rFormTex(p.form, `${R}`, x, a),
      [
        rFormTex(p.form, `${R}`, x, dpTex(alphaDp(C, S))),
        rFormTex(p.form ^ 1, `${R}`, x, a),
        rFormTex(p.form, `${R * R}`, x, a),
      ],
      saltOf(p),
    );
  },
  solution: (p) => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const a = dpTex(alphaDp(S, C));
    return [
      ...rSteps(p),
      { tex: `\\tan\\alpha = ${ratTex(rat(S, C))} \\quad \\Rightarrow \\quad \\alpha = ${a}` },
      { text: 'Put the two back into the form:' },
      { tex: `${wholeExpr(p)} = ${rFormTex(p.form, `${R}`, x, a)}` },
    ];
  },
};

/* Lesson 3: table angles. */

interface RTableParams {
  form: number;
  table: TablePair;
  v: number;
  radians: boolean;
}

function sampleTableParams(rng: Rng, difficulty: number): RTableParams {
  return {
    form: rng.pick(difficulty > 1 ? ALL_FORMS : SIN_FORMS),
    table: sampleTable(rng, 4),
    v: rng.int(0, R_VARS.length - 1),
    radians: difficulty > 1 && rng.chance(0.5),
  };
}

function tableSteps(p: RTableParams): SolutionStep[] {
  const { C, S, R, alpha, tan } = tableCoefs(p.table);
  const x = R_VARS[p.v];
  const root = `\\sqrt{${squareOf(C) + squareOf(S)}}`;
  const ratio = `\\frac{${S.tex}}{${C.tex}}`;
  return [
    ...matchSteps(p.form, x, C.tex, S.tex),
    { tex: `R = \\sqrt{(${C.tex})^2 + (${S.tex})^2} = ${root}${root === R.tex ? '' : ` = ${R.tex}`}` },
    { tex: `\\tan\\alpha = ${ratio}${ratio === tan ? '' : ` = ${tan}`}` },
    { text: `That is a table value: $\\alpha = ${angleTex(alpha, p.radians)}$, exactly.` },
    { tex: `${rExprTex(p.form, C, S, x)} = ${rFormTex(p.form, R.tex, x, angleTex(alpha, p.radians))}` },
  ];
}

/** R (a surd, placed from the bank) and α (a table angle) for a table pair. */
const rExactTiles: Generator<RTableParams> = {
  id: 'tid-r-exact-tiles',
  sample: (rng, difficulty) => sampleTableParams(rng, difficulty),
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const f = R_FORMS[p.form];
    const x = R_VARS[p.v];
    const { k, kind } = p.table;
    const answer = [R.tex, angleTex(alpha, p.radians)];
    const rSlips = kind === 2 ? [`${2 * k}`, `${2 * k * k}`] : [`${4 * k * k}`, `${co(k)}\\sqrt{2}`];
    const angleSlips = [30, 45, 60].filter((d) => d !== alpha).map((d) => angleTex(d, p.radians));
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `Write this as $${rFormTex(p.form, 'R', x, '\\alpha')}$ with $R > 0$ and $\\alpha$ acute${p.radians ? ', in radians' : ''}.`,
        ),
        display(rExprTex(p.form, C, S, x)),
      ],
      template: `{0}\\${f.fn}(${x} ${f.plus ? '+' : '-'} {1})`,
      bank: bankOf(answer, [...rSlips, ...angleSlips], 4),
      answer,
    };
  },
  solution: (p) => tableSteps(p),
};

/** α alone, typed: a table angle, in degrees or radians. */
const rExactAlpha: Generator<RTableParams> = {
  id: 'tid-r-exact-alpha',
  sample: (rng, difficulty) => sampleTableParams(rng, difficulty),
  render: (p): Slide => {
    const { C, S, alpha } = tableCoefs(p.table);
    const x = R_VARS[p.v];
    return {
      kind: 'expression',
      prompt: [
        prose(
          `Write this as $${rFormTex(p.form, 'R', x, '\\alpha')}$ with $R > 0$ and $\\alpha$ acute. Find $\\alpha$ ${p.radians ? 'in radians' : 'in degrees'}.`,
        ),
        display(rExprTex(p.form, C, S, x)),
      ],
      lead: '\\alpha =',
      keypad: p.radians ? PI_KEYS : NUMBER_KEYS,
      answer: angleAnswer(alpha, p.radians),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => tableSteps(p),
};

/** The other way: R sin(x + α) with table values, expanded back to a sin x + b cos x. */
const rExpandExactChoice: Generator<RTableParams> = {
  id: 'tid-r-expand-exact-choice',
  sample: (rng, difficulty) => sampleTableParams(rng, difficulty),
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const x = R_VARS[p.v];
    const { k, kind } = p.table;
    // The halves of the table values forgotten: R times sqrt 3 and R, or R sqrt 2 twice.
    const unhalved: [Coef, Coef] =
      kind === 2
        ? [
            { value: k * Math.SQRT2, tex: `${co(k)}\\sqrt{2}` },
            { value: k * Math.SQRT2, tex: `${co(k)}\\sqrt{2}` },
          ]
        : [
            { value: 2 * k * Math.sqrt(3), tex: `${2 * k}\\sqrt{3}` },
            wholeCoef(2 * k),
          ];
    const orderedUnhalved: [Coef, Coef] = kind === 1 ? [unhalved[1], unhalved[0]] : unhalved;
    return choiceSlide(
      [prose('Which expression is this equal to?'), display(rFormTex(p.form, R.tex, x, angleTex(alpha, p.radians)))],
      rExprTex(p.form, C, S, x),
      [
        rExprTex(p.form, S, C, x),
        rExprTex(p.form ^ 1, C, S, x),
        rExprTex(p.form, orderedUnhalved[0], orderedUnhalved[1], x),
        rExprTex(p.form, wholeCoef(2 * k), wholeCoef(2 * k), x),
      ],
      saltOf(p),
    );
  },
  solution: (p) => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const x = R_VARS[p.v];
    const f = R_FORMS[p.form];
    const a = angleTex(alpha, p.radians);
    return [
      { text: 'Expand with the compound-angle formula:' },
      {
        tex: stacked(rFormTex(p.form, R.tex, x, a), `${R.tex}\\cos ${a}\\,\\${f.fn} ${x}`, f.sign, `${R.tex}\\sin ${a}\\,\\${otherFn(f.fn)} ${x}`),
      },
      {
        text: `With $\\cos ${a} = ${cosTex(alpha)}$ and $\\sin ${a} = ${sinTex(alpha)}$, the coefficients are $${R.tex} \\times ${cosTex(alpha)} = ${C.tex}$ and $${R.tex} \\times ${sinTex(alpha)} = ${S.tex}$.`,
      },
      { tex: `${rFormTex(p.form, R.tex, x, a)} = ${rExprTex(p.form, C, S, x)}` },
    ];
  },
};

/* Lesson 4: maximum and minimum. */

/** Where the bracket of a form reaches the angle that gives its greatest or least value, inside the range x = 0 to 360 puts it in. */
function extremeBracket(form: number, alpha: number, greatest: boolean): number {
  const f = R_FORMS[form];
  const target = f.fn === 'sin' ? (greatest ? 90 : 270) : greatest ? 0 : 180;
  const lo = f.plus ? alpha : -alpha;
  return target < lo ? target + 360 : target >= lo + 360 ? target - 360 : target;
}

/** The x in 0 <= x < 360 where a form is greatest or least. */
function extremeAt(form: number, alpha: number, greatest: boolean): number {
  const u = extremeBracket(form, alpha, greatest);
  return R_FORMS[form].plus ? u - alpha : u + alpha;
}

/** "+ 3" or "- 3" after an expression, or nothing. */
const plusConst = (c: number): string => (c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`);

/** The greatest or least value, R moved by the constant: "greatest = 5 + 2 = 7", or just "greatest = 5". */
function extremeLine(greatest: boolean, R: number, c: number): string {
  const lead = `${greatest ? '\\text{greatest}' : '\\text{least}'} = ${greatest ? R : -R}`;
  return c === 0 ? lead : `${lead}${plusConst(c)} = ${c + (greatest ? R : -R)}`;
}

interface RMaxParams extends RWholeParams {
  c: number;
  greatest: boolean;
}

function maxValueOf(p: RMaxParams): number {
  return p.c + (p.greatest ? p.pair.R : -p.pair.R);
}

/** The greatest or least value of a sin x + b cos x (+ c), typed. */
const rMaxValue: Generator<RMaxParams> = {
  id: 'tid-r-max-value',
  sample: (rng, difficulty) => {
    const base = sampleWhole(rng, difficulty);
    let c = difficulty > 1 ? rng.int(-9, 8) : 0;
    if (difficulty > 1 && c >= 0) c += 1;
    return { ...base, c, greatest: rng.chance(0.5) };
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`Find the ${p.greatest ? 'greatest' : 'least'} value of $f(${R_VARS[p.v]})$ as $${R_VARS[p.v]}$ varies.`),
      display(`f(${R_VARS[p.v]}) = ${wholeExpr(p)}${plusConst(p.c)}`),
    ],
    lead: p.greatest ? 'f_{\\max} =' : 'f_{\\min} =',
    keypad: NUMBER_KEYS,
    answer: `${maxValueOf(p)}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { C, S, R } = p.pair;
    const s = p.greatest ? 1 : -1;
    const n = (value: number) => ({ tex: `${value}`, answer: `${value}` });
    return options(n(p.c + s * R), n(p.c - s * R), n(p.c + s * (C + S)), n(p.c + s * R * R));
  },
  solution: (p) => {
    const x = R_VARS[p.v];
    const { R } = p.pair;
    const form = rFormTex(p.form, `${R}`, x, '\\alpha');
    return [
      { text: `Written as $${form}$, with $R = \\sqrt{${p.pair.C}^2 + ${p.pair.S}^2} = ${R}$.` },
      { text: `A sine or cosine runs from $-1$ to $1$, so $${form}$ runs from $${-R}$ to $${R}$.` },
      {
        tex: extremeLine(p.greatest, R, p.c),
      },
    ];
  },
};

interface RWhereParams {
  form: number;
  R: number;
  alpha: number;
  c: number;
  greatest: boolean;
  v: number;
}

/** Where a converted form is greatest or least, and the value there. */
const rMaxTiles: Generator<RWhereParams> = {
  id: 'tid-r-max-tiles',
  sample: (rng, difficulty) => {
    let c = difficulty > 1 ? rng.int(-5, 4) : 0;
    if (difficulty > 1 && c >= 0) c += 1;
    return {
      form: rng.pick(difficulty > 1 ? ALL_FORMS : SIN_FORMS),
      R: rng.int(2, 9),
      alpha: rng.pick([30, 45, 60]),
      c,
      greatest: rng.chance(0.5),
      v: rng.int(0, R_VARS.length - 1),
    };
  },
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const f = R_FORMS[p.form];
    const where = extremeAt(p.form, p.alpha, p.greatest);
    const value = p.c + (p.greatest ? p.R : -p.R);
    const target = f.fn === 'sin' ? (p.greatest ? 90 : 270) : p.greatest ? 0 : 180;
    const wrongWay = (((f.plus ? target + p.alpha : target - p.alpha) % 360) + 360) % 360;
    const distractors = [
      `${p.c - (p.greatest ? p.R : -p.R)}`,
      deg(extremeAt(p.form, p.alpha, !p.greatest)),
      deg(wrongWay),
      deg(target),
    ];
    return {
      kind: 'tiles',
      prompt: [
        prose(`For $0^{\\circ} \\le ${x} < 360^{\\circ}$, find the ${p.greatest ? 'greatest' : 'least'} value and where it happens.`),
        display(`${rFormTex(p.form, `${p.R}`, x, deg(p.alpha))}${plusConst(p.c)}`),
      ],
      template: `\\text{${p.greatest ? 'max' : 'min'} } {0} \\text{ at } ${x} = {1}`,
      bank: bankOf([`${value}`, deg(where)], distractors, 4),
      answer: [`${value}`, deg(where)],
    };
  },
  solution: (p) => {
    const x = R_VARS[p.v];
    const f = R_FORMS[p.form];
    const op = f.plus ? '+' : '-';
    const u = extremeBracket(p.form, p.alpha, p.greatest);
    const where = extremeAt(p.form, p.alpha, p.greatest);
    return [
      {
        text: `$\\${f.fn}$ is ${p.greatest ? 'greatest, at $1$' : 'least, at $-1$'}, when its angle is $${deg(u)}$ (inside the range $${x} ${op} ${deg(p.alpha)}$ covers).`,
      },
      { tex: `${x} ${op} ${deg(p.alpha)} = ${deg(u)} \\quad \\Rightarrow \\quad ${x} = ${deg(where)}` },
      { tex: extremeLine(p.greatest, p.R, p.c) },
    ];
  },
};

interface RPeakParams {
  form: number;
  table: TablePair;
  greatest: boolean;
  c: number;
}

const bracketFn = (form: number, alpha: number) => (x: number): number => {
  const f = R_FORMS[form];
  const u = (x + (f.plus ? alpha : -alpha)) * DEGREE;
  return f.fn === 'sin' ? Math.sin(u) : Math.cos(u);
};

/** The wave drawn: slide to its peak or its trough. */
const rPeakSlider: Generator<RPeakParams> = {
  id: 'tid-r-peak-slider',
  sample: (rng, difficulty) => ({
    form: rng.pick(difficulty > 1 ? ALL_FORMS : SIN_FORMS),
    table: sampleTable(rng, 3),
    greatest: rng.chance(0.5),
    c: difficulty > 1 ? rng.int(-2, 2) : 0,
  }),
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const wave = bracketFn(p.form, alpha);
    const pad = 0.3 * R.value + 0.5;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (x) => p.c + R.value * wave(x), accent: true }],
      horizontals: [p.c + R.value, p.c - R.value],
      yMin: p.c - R.value - pad,
      yMax: p.c + R.value + pad,
      label: 'The graph of the expression from 0 to 360 degrees, a wave between two dashed lines at its greatest and least values',
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `Write it in the form $${rFormTex(p.form, 'R', 'x', '\\alpha')}$, then slide to where it is ${p.greatest ? 'greatest' : 'least'}, with $0^{\\circ} < x < 360^{\\circ}$.`,
        ),
        display(`y = ${rExprTex(p.form, C, S, 'x')}${plusConst(p.c)}`),
      ],
      min: 0,
      max: 360,
      step: 15,
      answer: extremeAt(p.form, alpha, p.greatest),
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: (p) => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const f = R_FORMS[p.form];
    const op = f.plus ? '+' : '-';
    const u = extremeBracket(p.form, alpha, p.greatest);
    return [
      { tex: `${rExprTex(p.form, C, S, 'x')} = ${rFormTex(p.form, R.tex, 'x', deg(alpha))}` },
      { text: `$\\${f.fn}$ is ${p.greatest ? '$1$, its greatest,' : '$-1$, its least,'} when its angle is $${deg(u)}$:` },
      { tex: `x ${op} ${deg(alpha)} = ${deg(u)} \\quad \\Rightarrow \\quad x = ${deg(extremeAt(p.form, alpha, p.greatest))}` },
    ];
  },
};

interface RExtremeParams extends RWholeParams {
  c: number;
  greatest: boolean;
  /** The expression under a number, so the fraction is greatest where the expression is least. */
  reciprocal: boolean;
  m: number;
}

/** R's candidates as flow labels: R, R^2, and the two sums a careless square root gives. */
function rCandidates({ C, S, R }: WholePair): string[] {
  return scatter([`$${R}$`, `$${R * R}$`, `$${C + S}$`, `$${Math.abs(C - S)}$`]);
}

/** The first n distinct labels. */
function distinctLabels(labels: string[], n = 4): string[] {
  return [...new Set(labels)].slice(0, n);
}

/** Greatest or least value, one decision at a time: R, then (for a fraction) which end of the bottom, then the value. */
const rExtremeFlow: Generator<RExtremeParams> = {
  id: 'tid-r-extreme-flow',
  sample: (rng, difficulty) => {
    const base = { ...sampleWhole(rng, difficulty), swapped: false };
    if (difficulty > 1) {
      return { ...base, c: base.pair.R + rng.int(1, 4), greatest: rng.chance(0.5), reciprocal: true, m: rng.int(1, 12) };
    }
    return { ...base, c: rng.int(-6, 9), greatest: rng.chance(0.5), reciprocal: false, m: 1 };
  },
  render: (p): Slide => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const word = p.greatest ? 'greatest' : 'least';
    const rStep = {
      id: 'R',
      ask: `Written as $${rFormTex(p.form, 'R', x, '\\alpha')}$, $R$ is`,
      branches: rCandidates(p.pair).map((label) => ({ label, to: p.reciprocal ? 'bottom' : 'value' })),
    };
    if (!p.reciprocal) {
      const s = p.greatest ? 1 : -1;
      const right = `$${p.c + s * R}$`;
      const values = distinctLabels([right, `$${p.c - s * R}$`, `$${p.c + s * (C + S)}$`, `$${s * R}$`, `$${p.c + s * R * R}$`]);
      return {
        kind: 'flow',
        prompt: [prose(`Find the ${word} value, one decision at a time.`)],
        subject: `${wholeExpr(p)}${plusConst(p.c)}`,
        steps: [
          rStep,
          { id: 'value', ask: `So the ${word} value is`, branches: scatter(values).map((label) => ({ label, outcome: 'Sine and cosine never go past $1$ or below $-1$.' })) },
        ],
        answer: [`$${R}$`, right],
      };
    }
    const value = (bottom: number): string => `$${ratTex(rat(p.m, bottom))}$`;
    const right = value(p.greatest ? p.c - R : p.c + R);
    const bottoms = [p.c - R, p.c + R, p.c, p.c - C - S].filter((b) => b !== 0);
    const values = distinctLabels([right, ...bottoms.map(value)]);
    const ends = ['as small as it gets', 'as large as it gets'];
    return {
      kind: 'flow',
      prompt: [prose(`Find the ${word} value of this fraction, one decision at a time.`)],
      subject: `\\dfrac{${p.m}}{${p.c} + ${wholeExpr(p)}}`,
      steps: [
        rStep,
        { id: 'bottom', ask: `The fraction is ${word} when the bottom is`, branches: ends.map((label) => ({ label, to: 'value' })) },
        { id: 'value', ask: `So the ${word} value is`, branches: scatter(values).map((label) => ({ label, outcome: 'The top is fixed, so the bottom decides.' })) },
      ],
      answer: [`$${R}$`, ends[p.greatest ? 0 : 1], right],
    };
  },
  solution: (p) => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const form = rFormTex(p.form, `${R}`, x, '\\alpha');
    const steps: SolutionStep[] = [
      { text: `$R = \\sqrt{${C}^2 + ${S}^2} = ${R}$, so the expression is $${form}$, which runs from $${-R}$ to $${R}$.` },
    ];
    if (!p.reciprocal) {
      steps.push({ tex: extremeLine(p.greatest, R, p.c) });
      return steps;
    }
    const bottom = p.greatest ? p.c - R : p.c + R;
    steps.push(
      { text: `So the bottom runs from $${p.c} - ${R} = ${p.c - R}$ to $${p.c} + ${R} = ${p.c + R}$, always positive.` },
      {
        text: p.greatest
          ? 'A fixed top over a smaller bottom is a bigger fraction, so the greatest value comes with the smallest bottom.'
          : 'A fixed top over a larger bottom is a smaller fraction, so the least value comes with the largest bottom.',
      },
      { tex: `\\frac{${p.m}}{${bottom}}${ratTex(rat(p.m, bottom)) === `\\frac{${p.m}}{${bottom}}` ? '' : ` = ${ratTex(rat(p.m, bottom))}`}` },
    );
    return steps;
  },
};

/* Lesson 5: solving a sin x + b cos x = c. */

interface RSolveParams {
  form: number;
  table: TablePair;
  /** fn(x ± α) = value: a signed special value. */
  value: number;
}

/** The right-hand side c = R times the value, as the learner reads it, or undefined when it is not tidy. */
function rhsTex({ kind, k }: TablePair, value: number): string | undefined {
  const size = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  if (kind < 2) {
    if (near(size, 0.5)) return `${sign}${k}`;
    if (near(size, Math.SQRT2 / 2)) return `${sign}${co(k)}\\sqrt{2}`;
    if (near(size, Math.sqrt(3) / 2)) return `${sign}${co(k)}\\sqrt{3}`;
    return undefined;
  }
  if (near(size, Math.SQRT2 / 2)) return `${sign}${k}`;
  if (near(size, 0.5) && k % 2 === 0) return `${sign}${co(k / 2)}\\sqrt{2}`;
  return undefined;
}

const SOLVE_VALUES = [0.5, Math.SQRT2 / 2, Math.sqrt(3) / 2];

function sampleSolve(rng: Rng, difficulty: number): RSolveParams {
  for (;;) {
    const table = sampleTable(rng, 3);
    const value = rng.pick(SOLVE_VALUES) * (difficulty > 1 && rng.chance(0.5) ? -1 : 1);
    if (rhsTex(table, value) === undefined) continue;
    return { form: rng.pick(difficulty > 1 ? ALL_FORMS : SIN_FORMS), table, value };
  }
}

/** The bracket's solutions over the range x = 0 to 360 sends it through, then x itself, both smallest first. */
function shiftedSolutions(form: number, alpha: number, value: number): { u: number[]; x: number[] } {
  const f = R_FORMS[form];
  const lo = f.plus ? alpha : -alpha;
  const u = solutionsOf(f.fn, value)
    .map((s) => (s < lo ? s + 360 : s >= lo + 360 ? s - 360 : s))
    .sort((a, b) => a - b);
  return { u, x: u.map((w) => (f.plus ? w - alpha : w + alpha)) };
}

const solveEquation = (p: RSolveParams): string => {
  const { C, S } = tableCoefs(p.table);
  return `${rExprTex(p.form, C, S, 'x')} = ${rhsTex(p.table, p.value)}`;
};

const bracketTex = (form: number, alpha: number): string => `x ${R_FORMS[form].plus ? '+' : '-'} ${deg(alpha)}`;

const angleList = (angles: number[]): string => angles.map(deg).join(', ');

function solveSteps(p: RSolveParams): SolutionStep[] {
  const { R, alpha } = tableCoefs(p.table);
  const f = R_FORMS[p.form];
  const { u, x } = shiftedSolutions(p.form, alpha, p.value);
  const raw = solutionsOf(f.fn, p.value);
  const shifted = raw.some((s, i) => s !== u[i]);
  return [
    { text: 'Convert the left-hand side first:' },
    { tex: solveEquation(p) },
    { tex: `${rFormTex(p.form, R.tex, 'x', deg(alpha))} = ${rhsTex(p.table, p.value)}` },
    { tex: `\\${f.fn}(${bracketTex(p.form, alpha)}) = ${specialTex(p.value)}` },
    {
      text: `As $x$ runs from $0^{\\circ}$ to $360^{\\circ}$, $${bracketTex(p.form, alpha)}$ runs from $${deg(f.plus ? alpha : -alpha)}$ to $${deg(f.plus ? 360 + alpha : 360 - alpha)}$.${shifted ? ` So the table's $${angleList(raw)}$ becomes $${angleList(u)}$.` : ''}`,
    },
    { tex: `${bracketTex(p.form, alpha)} = ${angleList(u)}` },
    { tex: `x = ${angleList(x)}` },
  ];
}

/** The whole solution as a line of working: convert, divide by R, solve for the bracket, undo the shift. */
const rSolveSteps: Generator<RSolveParams> = {
  id: 'tid-r-solve-steps',
  sample: (rng, difficulty) => sampleSolve(rng, difficulty),
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const f = R_FORMS[p.form];
    const rhs = rhsTex(p.table, p.value)!;
    const { u, x } = shiftedSolutions(p.form, alpha, p.value);
    const br = bracketTex(p.form, alpha);
    const rSquared = `${squareOf(R)}`;
    const slipValues = SPECIAL.filter((row) => row.value > 0 && row.value < 1 && Math.abs(row.value - Math.abs(p.value)) > 1e-9);
    const raw = solutionsOf(f.fn, p.value);
    const wrongWay = x.map((w) => (((f.plus ? w + 2 * alpha : w - 2 * alpha) % 360) + 360) % 360).sort((a, b) => a - b);
    const reductions: { span: [number, number]; value: string; bank: string[] }[] = [
      {
        span: [0, 1],
        value: rFormTex(p.form, R.tex, 'x', deg(alpha)),
        bank: [
          rFormTex(p.form, rSquared, 'x', deg(alpha)),
          rFormTex(p.form, R.tex, 'x', deg(90 - alpha)),
          rFormTex(p.form ^ 1, R.tex, 'x', deg(alpha)),
        ],
      },
      {
        span: [0, 3],
        value: `\\${f.fn}(${br}) = ${specialTex(p.value)}`,
        bank: [
          `\\${f.fn}(${br}) = ${specialTex(-p.value)}`,
          `\\${f.fn}(${br}) = ${p.value < 0 ? '-' : ''}${slipValues[0].tex}`,
          `\\${f.fn}(${br}) = ${p.value < 0 ? '-' : ''}${slipValues[1].tex}`,
        ],
      },
      {
        span: [0, 1],
        value: `${br} = ${angleList(u)}`,
        bank: [
          `${br} = ${angleList(raw)}`,
          `${br} = ${angleList(solutionsOf(otherFn(f.fn), p.value))}`,
          `${br} = ${angleList(solutionsOf(f.fn, -p.value))}`,
        ],
      },
      {
        span: [0, 1],
        value: `x = ${angleList(x)}`,
        bank: [`x = ${angleList(wrongWay)}`, `x = ${angleList(u)}`],
      },
    ];
    return {
      kind: 'steps',
      prompt: [prose('Solve for $0^{\\circ} \\le x < 360^{\\circ}$, a line at a time.')],
      start: [rExprTex(p.form, C, S, 'x'), '=', rhs],
      reductions: reductions.map((r) => ({ ...r, bank: scatter([...new Set([r.value, ...r.bank])]) })),
    };
  },
  solution: (p) => solveSteps(p),
};

interface RSolveAngleParams extends RSolveParams {
  largest: boolean;
  radians: boolean;
}

/** One solution, typed: the smallest or the largest. */
const rSolveAngle: Generator<RSolveAngleParams> = {
  id: 'tid-r-solve-angle',
  sample: (rng, difficulty) => ({
    ...sampleSolve(rng, difficulty),
    largest: rng.chance(0.5),
    radians: difficulty > 1 && rng.chance(0.5),
  }),
  render: (p): Slide => {
    const { alpha } = tableCoefs(p.table);
    const { x } = shiftedSolutions(p.form, alpha, p.value);
    const answer = p.largest ? x[x.length - 1] : x[0];
    return {
      kind: 'expression',
      prompt: [
        prose(
          `Solve for $${p.radians ? '0 \\le x < 2\\pi' : '0^{\\circ} \\le x < 360^{\\circ}'}$ and give the ${p.largest ? 'largest' : 'smallest'} solution${p.radians ? ', in radians' : ''}.`,
        ),
        display(solveEquation(p)),
      ],
      lead: 'x =',
      keypad: p.radians ? PI_KEYS : NUMBER_KEYS,
      answer: angleAnswer(answer, p.radians),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const { alpha } = tableCoefs(p.table);
    const { u, x } = shiftedSolutions(p.form, alpha, p.value);
    const i = p.largest ? x.length - 1 : 0;
    const f = R_FORMS[p.form];
    const wrongWay = (((f.plus ? x[i] + 2 * alpha : x[i] - 2 * alpha) % 360) + 360) % 360;
    return angleOptions(x[i], [u[i], x[x.length - 1 - i], wrongWay], p.radians);
  },
  solution: (p) => {
    const { alpha } = tableCoefs(p.table);
    const { x } = shiftedSolutions(p.form, alpha, p.value);
    const answer = p.largest ? x[x.length - 1] : x[0];
    return [
      ...solveSteps(p),
      { text: `The ${p.largest ? 'largest' : 'smallest'} is $${angleTex(answer, p.radians)}$.` },
    ];
  },
};

interface RCountParams extends RWholeParams {
  /** A constant on the left, taken across before comparing with R. */
  d: number;
  /** R sin(x + α) = shifted. */
  shifted: number;
}

const countOf = (p: RCountParams): number => {
  const size = Math.abs(p.shifted);
  return size > p.pair.R ? 0 : size === p.pair.R ? 1 : 2;
};

/** How many solutions: R first, then the right-hand side against it. */
const rCountFlow: Generator<RCountParams> = {
  id: 'tid-r-count-flow',
  sample: (rng, difficulty) => {
    const base = { ...sampleWhole(rng, difficulty), swapped: false };
    const { R } = base.pair;
    const count = rng.int(0, 2);
    const sign = rng.chance(0.5) ? 1 : -1;
    const shifted = count === 2 ? rng.int(-(R - 1), R - 1) : count === 1 ? sign * R : sign * (R + rng.int(1, 4));
    let d = difficulty > 1 ? rng.int(-5, 4) : 0;
    if (difficulty > 1 && d >= 0) d += 1;
    return { ...base, d, shifted };
  },
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const counts = ['0', '1', '2', '3'].map((n) => `$${n}$`);
    return {
      kind: 'flow',
      prompt: [prose(`How many solutions has this with $0^{\\circ} \\le ${x} < 360^{\\circ}$?`)],
      subject: `${wholeExpr(p)}${plusConst(p.d)} = ${p.shifted + p.d}`,
      steps: [
        {
          id: 'R',
          ask: `Written as $${rFormTex(p.form, 'R', x, '\\alpha')}$, $R$ is`,
          branches: rCandidates(p.pair).map((label) => ({ label, to: 'count' })),
        },
        {
          id: 'count',
          ask: 'So the number of solutions is',
          branches: counts.map((label) => ({ label, outcome: 'A wave of height $R$ meets a level line twice a turn, once, or never.' })),
        },
      ],
      answer: [`$${p.pair.R}$`, `$${countOf(p)}$`],
    };
  },
  solution: (p) => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const f = R_FORMS[p.form];
    const n = countOf(p);
    const steps: SolutionStep[] = [{ text: `$R = \\sqrt{${C}^2 + ${S}^2} = ${R}$.` }];
    if (p.d !== 0) steps.push({ text: `Take the $${p.d}$ across first:` });
    steps.push(
      { tex: `${rFormTex(p.form, `${R}`, x, '\\alpha')} = ${p.shifted}` },
      { tex: `\\${f.fn}(${x} ${f.plus ? '+' : '-'} \\alpha) = ${ratTex(rat(p.shifted, R))}` },
      {
        text:
          n === 0
            ? `That is beyond $-1$ to $1$, which no sine or cosine reaches: no solutions.`
            : n === 1
              ? `That is the very ${p.shifted > 0 ? 'top' : 'bottom'} of the wave, reached once a turn: one solution.`
              : 'That is strictly between $-1$ and $1$, and a full turn crosses each such level twice: two solutions.',
      },
    );
    return steps;
  },
};

interface RSolveSliderParams extends RSolveParams {
  largest: boolean;
}

/** The equation's two sides drawn: slide to one of the solutions. */
const rSolveSlider: Generator<RSolveSliderParams> = {
  id: 'tid-r-solve-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = { ...sampleSolve(rng, difficulty), largest: difficulty > 1 && rng.chance(0.5) };
      const { alpha } = tableCoefs(p.table);
      const { x } = shiftedSolutions(p.form, alpha, p.value);
      const answer = p.largest ? x[x.length - 1] : x[0];
      // The untouched slider rests at 180; never make that the answer, nor either end.
      if (answer === 180 || answer === 0) continue;
      return p;
    }
  },
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const { x } = shiftedSolutions(p.form, alpha, p.value);
    const wave = bracketFn(p.form, alpha);
    const pad = 0.3 * R.value + 0.5;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (t) => R.value * wave(t), accent: true }],
      horizontals: [R.value * p.value],
      yMin: -R.value - pad,
      yMax: R.value + pad,
      label: 'The graph of the left-hand side from 0 to 360 degrees, with a dashed level line at the right-hand side',
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `The dashed line is the right-hand side. Solve, and slide to the ${p.largest ? 'largest' : 'smallest'} solution with $0^{\\circ} < x < 360^{\\circ}$.`,
        ),
        display(`${rExprTex(p.form, C, S, 'x')} = ${rhsTex(p.table, p.value)}`),
      ],
      min: 0,
      max: 360,
      step: 15,
      answer: p.largest ? x[x.length - 1] : x[0],
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: (p) => {
    const { alpha } = tableCoefs(p.table);
    const { x } = shiftedSolutions(p.form, alpha, p.value);
    return [...solveSteps(p), { text: `The ${p.largest ? 'largest' : 'smallest'} is $${deg(p.largest ? x[x.length - 1] : x[0])}$.` }];
  },
};

/* ---------- Level 4: half-angle and multiple-angle formulae ---------- */

/*
 * The double-angle formulae read with A = x/2: cos x = 1 - 2 sin^2(x/2), and so
 * on. Every half angle is written `\tfrac{x}2`, with no braces round the 2, so a
 * tiles template never tears it at a `{2}`.
 */

/** A half angle as the learner reads it. */
const halfOf = (v: string): string => `\\tfrac{${v}}2`;

/** A whole angle and its half: x/2, and on to 3x as the half of 6x. */
const HALF_PAIRS: [string, string][] = [
  ['x', halfOf('x')],
  ['\\theta', halfOf('\\theta')],
  ['A', halfOf('A')],
  ['3x', halfOf('3x')],
  ['6x', '3x'],
];

/** 1 - r and 1 + r with a fraction r, as a line of working reads them: no "- -". */
const oneMinus = (r: Rat): string => `1 ${r[0] < 0 ? '+' : '-'} ${ratTex([Math.abs(r[0]), r[1]])}`;
const onePlus = (r: Rat): string => `1 ${r[0] < 0 ? '-' : '+'} ${ratTex([Math.abs(r[0]), r[1]])}`;

/** Where x lies, and so where x/2 lies. The half-range's signs come from its middle. */
const HALF_RANGES: { lo: number; hi: number }[] = [
  { lo: 0, hi: 180 },
  { lo: 180, hi: 360 },
  { lo: 360, hi: 540 },
  { lo: 540, hi: 720 },
  { lo: -180, hi: 0 },
  { lo: -360, hi: -180 },
];

const rangeTex = (range: number, v: string): string =>
  `${deg(HALF_RANGES[range].lo)} < ${v} < ${deg(HALF_RANGES[range].hi)}`;

/** The sign sin, cos or tan takes over the half-range. */
function halfSign(fn: Fn, range: number): number {
  const { lo, hi } = HALF_RANGES[range];
  return Math.sign(trigAt(fn, (lo + hi) / 4)!);
}

const HALF_LETTERS = ['x', '\\theta', 'A', 'B'];

/* Lesson 1: the half-angle formulae. */

interface HalfTileParams {
  form: number;
  pair: number;
}

interface HalfTileForm {
  hard: boolean;
  template: (F: string, H: string) => string;
  answer: (F: string, H: string) => string[];
  wrong: (F: string, H: string) => string[];
  unordered?: boolean;
  why: (F: string, H: string) => string;
}

const fromCosSin = (F: string, H: string) => `From $\\cos ${F} = 1 - 2\\sin^2 ${H}$, with $${H}$ half of $${F}$.`;
const fromCosCos = (F: string, H: string) => `From $\\cos ${F} = 2\\cos^2 ${H} - 1$, with $${H}$ half of $${F}$.`;

const HALF_TILE_FORMS: HalfTileForm[] = [
  {
    hard: false,
    template: (_F, H) => `\\sin^2 ${H} = \\tfrac12(1 - {0})`,
    answer: (F) => [`\\cos ${F}`],
    wrong: (F, H) => [`\\cos ${H}`, `\\sin ${F}`, `\\cos^2 ${H}`],
    why: (F, H) => `${fromCosSin(F, H)} Make $\\sin^2 ${H}$ the subject: $2\\sin^2 ${H} = 1 - \\cos ${F}$, then halve.`,
  },
  {
    hard: false,
    template: (_F, H) => `\\cos^2 ${H} = \\tfrac12({0})`,
    answer: (F) => [`1 + \\cos ${F}`],
    wrong: (F, H) => [`1 - \\cos ${F}`, `1 + \\cos ${H}`, `2 + \\cos ${F}`],
    why: (F, H) => `${fromCosCos(F, H)} Make $\\cos^2 ${H}$ the subject: $2\\cos^2 ${H} = 1 + \\cos ${F}$, then halve.`,
  },
  {
    hard: false,
    template: (F) => `\\cos ${F} = 1 - {0}`,
    answer: (_F, H) => [`2\\sin^2 ${H}`],
    wrong: (F, H) => [`2\\sin^2 ${F}`, `\\sin^2 ${H}`, `2\\cos^2 ${H}`],
    why: (F, H) => `It is $\\cos 2A = 1 - 2\\sin^2 A$ with $A = ${H}$, so $2A = ${F}$.`,
  },
  {
    hard: false,
    template: (F) => `\\cos ${F} = {0} - 1`,
    answer: (_F, H) => [`2\\cos^2 ${H}`],
    wrong: (F, H) => [`2\\cos^2 ${F}`, `\\cos^2 ${H}`, `2\\sin^2 ${H}`],
    why: (F, H) => `It is $\\cos 2A = 2\\cos^2 A - 1$ with $A = ${H}$, so $2A = ${F}$.`,
  },
  {
    hard: false,
    template: (F, H) => `\\sin ${F} = 2\\sin ${H}\\,{0}`,
    answer: (_F, H) => [`\\cos ${H}`],
    wrong: (F, H) => [`\\cos ${F}`, `\\sin ${H}`, `\\cos^2 ${H}`],
    why: (F, H) => `It is $\\sin 2A = 2\\sin A\\cos A$ with $A = ${H}$, so $2A = ${F}$.`,
  },
  {
    hard: false,
    template: (F) => `1 - \\cos ${F} = {0}`,
    answer: (_F, H) => [`2\\sin^2 ${H}`],
    wrong: (F, H) => [`2\\cos^2 ${H}`, `\\sin^2 ${H}`, `2\\sin^2 ${F}`],
    why: (F, H) => `${fromCosSin(F, H)} Take $\\cos ${F}$ across and $2\\sin^2 ${H}$ the other way.`,
  },
  {
    hard: false,
    template: (F) => `1 + \\cos ${F} = {0}`,
    answer: (_F, H) => [`2\\cos^2 ${H}`],
    wrong: (F, H) => [`2\\sin^2 ${H}`, `\\cos^2 ${H}`, `2\\cos^2 ${F}`],
    why: (F, H) => `${fromCosCos(F, H)} Add $1$ to both sides.`,
  },
  {
    hard: true,
    template: (F, H) => `\\tan ${H} = {0} \\div (1 + \\cos ${F})`,
    answer: (F) => [`\\sin ${F}`],
    wrong: (F, H) => [`\\sin ${H}`, `\\cos ${F}`, `1 - \\cos ${F}`],
    why: (F, H) =>
      `Multiply the top and bottom of $\\frac{\\sin ${H}}{\\cos ${H}}$ by $2\\cos ${H}$: the top becomes $2\\sin ${H}\\cos ${H} = \\sin ${F}$ and the bottom $2\\cos^2 ${H} = 1 + \\cos ${F}$.`,
  },
  {
    hard: true,
    template: (F, H) => `\\tan ${H} = (1 - \\cos ${F}) \\div {0}`,
    answer: (F) => [`\\sin ${F}`],
    wrong: (F, H) => [`\\sin ${H}`, `\\cos ${F}`, `1 + \\cos ${F}`],
    why: (F, H) =>
      `Multiply the top and bottom of $\\frac{\\sin ${H}}{\\cos ${H}}$ by $2\\sin ${H}$: the top becomes $2\\sin^2 ${H} = 1 - \\cos ${F}$ and the bottom $2\\sin ${H}\\cos ${H} = \\sin ${F}$.`,
  },
  {
    hard: true,
    template: (F, H) => `\\tan^2 ${H} = (1 - \\cos ${F}) \\div ({0})`,
    answer: (F) => [`1 + \\cos ${F}`],
    wrong: (F, H) => [`1 - \\cos ${F}`, `1 + \\cos ${H}`, `\\cos ${F}`],
    why: (F, H) =>
      `Divide $\\sin^2 ${H} = \\tfrac12(1 - \\cos ${F})$ by $\\cos^2 ${H} = \\tfrac12(1 + \\cos ${F})$; the halves cancel.`,
  },
  {
    hard: true,
    template: (F) => `\\cos ${F} = {0} - {1}`,
    answer: (_F, H) => [`\\cos^2 ${H}`, `\\sin^2 ${H}`],
    wrong: (F, H) => [`\\cos^2 ${F}`, `\\sin^2 ${F}`, `2\\sin^2 ${H}`],
    why: (F, H) => `It is $\\cos 2A = \\cos^2 A - \\sin^2 A$ with $A = ${H}$, so $2A = ${F}$.`,
  },
  {
    hard: true,
    template: (_F, H) => `\\sin^2 ${H} - \\cos^2 ${H} = {0}`,
    answer: (F) => [`-\\cos ${F}`],
    wrong: (F, H) => [`\\cos ${F}`, `-\\cos ${H}`, `\\sin ${F}`],
    why: (F, H) => `$\\cos^2 ${H} - \\sin^2 ${H} = \\cos ${F}$, and this is the same thing the other way round, so it is $-\\cos ${F}$.`,
  },
];

/** A half-angle formula completed. */
const halfTiles: Generator<HalfTileParams> = {
  id: 'tid-half-tiles',
  sample: (rng, difficulty) => {
    const forms = HALF_TILE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, pair: rng.int(0, HALF_PAIRS.length - 1) };
  },
  render: ({ form, pair }): Slide => {
    const f = HALF_TILE_FORMS[form];
    const [F, H] = HALF_PAIRS[pair];
    const answer = f.answer(F, H);
    return {
      kind: 'tiles',
      prompt: [prose(`Complete the formula. The whole angle is $${F}$ and the half angle $${H}$.`)],
      template: f.template(F, H),
      bank: bankOf(answer, f.wrong(F, H)),
      answer,
      ...(f.unordered ? { unordered: true } : {}),
    };
  },
  solution: ({ form, pair }) => {
    const f = HALF_TILE_FORMS[form];
    const [F, H] = HALF_PAIRS[pair];
    let line = f.template(F, H);
    f.answer(F, H).forEach((token, i) => {
      line = line.replace(`{${i}}`, token);
    });
    return [{ text: f.why(F, H) }, { tex: line }];
  },
};

interface HalfStepsParams {
  form: number;
  k: number;
  pair: number;
}

interface HalfStepsForm {
  hard: boolean;
  start: (c: string, F: string, H: string) => string[];
  reductions: (k: number, F: string, H: string) => { span: [number, number]; value: string; bank: string[] }[];
  why: (k: number, F: string, H: string) => SolutionStep[];
}

const HALF_STEPS: HalfStepsForm[] = [
  {
    hard: false,
    start: (c, F, H) => [`${c}(1 - \\cos ${F})`, '\\div', `\\sin ${H}`],
    reductions: (k, _F, H) => [
      { span: [0, 1], value: `${2 * k}\\sin^2 ${H}`, bank: [`${co(k)}\\sin^2 ${H}`, `${2 * k}\\cos^2 ${H}`, `${2 * k}\\sin ${H}`] },
      { span: [0, 3], value: `${2 * k}\\sin ${H}`, bank: [`${co(k)}\\sin ${H}`, `${2 * k}\\cos ${H}`, `${2 * k}\\sin^2 ${H}`] },
    ],
    why: (k, F, H) => [
      { text: `$\\cos ${F} = 1 - 2\\sin^2 ${H}$, so $1 - \\cos ${F} = 2\\sin^2 ${H}$.` },
      { tex: `${2 * k}\\sin^2 ${H} \\div \\sin ${H} = ${2 * k}\\sin ${H}` },
    ],
  },
  {
    hard: false,
    start: (c, F, H) => [`${c}(1 + \\cos ${F})`, '\\div', `\\cos ${H}`],
    reductions: (k, _F, H) => [
      { span: [0, 1], value: `${2 * k}\\cos^2 ${H}`, bank: [`${co(k)}\\cos^2 ${H}`, `${2 * k}\\sin^2 ${H}`, `${2 * k}\\cos ${H}`] },
      { span: [0, 3], value: `${2 * k}\\cos ${H}`, bank: [`${co(k)}\\cos ${H}`, `${2 * k}\\sin ${H}`, `${2 * k}\\cos^2 ${H}`] },
    ],
    why: (k, F, H) => [
      { text: `$\\cos ${F} = 2\\cos^2 ${H} - 1$, so $1 + \\cos ${F} = 2\\cos^2 ${H}$.` },
      { tex: `${2 * k}\\cos^2 ${H} \\div \\cos ${H} = ${2 * k}\\cos ${H}` },
    ],
  },
  {
    hard: false,
    start: (c, F, H) => [`${c}\\sin ${F}`, '\\div', `\\cos ${H}`],
    reductions: (k, F, H) => [
      { span: [0, 1], value: `${2 * k}\\sin ${H}\\cos ${H}`, bank: [`${co(k)}\\sin ${H}\\cos ${H}`, `${2 * k}\\sin ${H}`, `${co(k)}\\cos ${F}`] },
      { span: [0, 3], value: `${2 * k}\\sin ${H}`, bank: [`${co(k)}\\sin ${H}`, `${2 * k}\\cos ${H}`, `${2 * k}\\tan ${H}`] },
    ],
    why: (k, F, H) => [
      { text: `$\\sin ${F} = 2\\sin ${H}\\cos ${H}$, the double-angle formula with $${H}$ as the single angle.` },
      { tex: `${2 * k}\\sin ${H}\\cos ${H} \\div \\cos ${H} = ${2 * k}\\sin ${H}` },
    ],
  },
  {
    hard: false,
    start: (c, F, H) => [`${c}\\sin ${F}`, '\\div', `\\sin ${H}`],
    reductions: (k, F, H) => [
      { span: [0, 1], value: `${2 * k}\\sin ${H}\\cos ${H}`, bank: [`${co(k)}\\sin ${H}\\cos ${H}`, `${2 * k}\\cos ${H}`, `${co(k)}\\cos ${F}`] },
      { span: [0, 3], value: `${2 * k}\\cos ${H}`, bank: [`${co(k)}\\cos ${H}`, `${2 * k}\\sin ${H}`, `${2 * k}\\cot ${H}`] },
    ],
    why: (k, F, H) => [
      { text: `$\\sin ${F} = 2\\sin ${H}\\cos ${H}$, the double-angle formula with $${H}$ as the single angle.` },
      { tex: `${2 * k}\\sin ${H}\\cos ${H} \\div \\sin ${H} = ${2 * k}\\cos ${H}` },
    ],
  },
  {
    hard: true,
    start: (c, F) => [`${c}(1 - \\cos ${F})`, '\\div', `\\sin ${F}`],
    reductions: (k, F, H) => [
      { span: [0, 1], value: `${2 * k}\\sin^2 ${H}`, bank: [`${co(k)}\\sin^2 ${H}`, `${2 * k}\\cos^2 ${H}`, `${co(k)}\\sin^2 ${F}`] },
      { span: [2, 3], value: `2\\sin ${H}\\cos ${H}`, bank: [`2\\sin ${H}`, `\\sin ${H}\\cos ${H}`, `2\\cos^2 ${H}`] },
      { span: [0, 3], value: `${co(k)}\\tan ${H}`, bank: [`${co(k)}\\cot ${H}`, `${2 * k}\\tan ${H}`, `${co(k)}\\sin ${H}`] },
    ],
    why: (k, F, H) => [
      { text: `Rewrite both: $1 - \\cos ${F} = 2\\sin^2 ${H}$ and $\\sin ${F} = 2\\sin ${H}\\cos ${H}$.` },
      { tex: `\\frac{${2 * k}\\sin^2 ${H}}{2\\sin ${H}\\cos ${H}} = ${co(k)}\\tan ${H}` },
    ],
  },
  {
    hard: true,
    start: (c, F) => [`${c}\\sin ${F}`, '\\div', `(1 + \\cos ${F})`],
    reductions: (k, F, H) => [
      { span: [0, 1], value: `${2 * k}\\sin ${H}\\cos ${H}`, bank: [`${co(k)}\\sin ${H}\\cos ${H}`, `${2 * k}\\sin ${H}`, `${co(k)}\\cos ${F}`] },
      { span: [2, 3], value: `2\\cos^2 ${H}`, bank: [`2\\sin^2 ${H}`, `\\cos^2 ${H}`, `1 + 2\\cos^2 ${H}`] },
      { span: [0, 3], value: `${co(k)}\\tan ${H}`, bank: [`${co(k)}\\cot ${H}`, `${2 * k}\\tan ${H}`, `${co(k)}\\sin ${H}`] },
    ],
    why: (k, F, H) => [
      { text: `Rewrite both: $\\sin ${F} = 2\\sin ${H}\\cos ${H}$ and $1 + \\cos ${F} = 2\\cos^2 ${H}$.` },
      { tex: `\\frac{${2 * k}\\sin ${H}\\cos ${H}}{2\\cos^2 ${H}} = ${co(k)}\\tan ${H}` },
    ],
  },
  {
    hard: true,
    start: (c, F) => [`${c}(1 - \\cos ${F})`, '\\div', `(1 + \\cos ${F})`],
    reductions: (k, _F, H) => [
      { span: [0, 1], value: `${2 * k}\\sin^2 ${H}`, bank: [`${co(k)}\\sin^2 ${H}`, `${2 * k}\\cos^2 ${H}`, `-${2 * k}\\sin^2 ${H}`] },
      { span: [2, 3], value: `2\\cos^2 ${H}`, bank: [`2\\sin^2 ${H}`, `\\cos^2 ${H}`, `1 + 2\\cos^2 ${H}`] },
      { span: [0, 3], value: `${co(k)}\\tan^2 ${H}`, bank: [`${co(k)}\\cot^2 ${H}`, `${co(k)}\\tan ${H}`, `${2 * k}\\tan^2 ${H}`] },
    ],
    why: (k, F, H) => [
      { text: `Rewrite both: $1 - \\cos ${F} = 2\\sin^2 ${H}$ and $1 + \\cos ${F} = 2\\cos^2 ${H}$.` },
      { tex: `\\frac{${2 * k}\\sin^2 ${H}}{2\\cos^2 ${H}} = ${co(k)}\\tan^2 ${H}` },
    ],
  },
  {
    hard: true,
    start: (c, F) => [`${c}(1 + \\cos ${F})`, '\\div', `\\sin ${F}`],
    reductions: (k, F, H) => [
      { span: [0, 1], value: `${2 * k}\\cos^2 ${H}`, bank: [`${co(k)}\\cos^2 ${H}`, `${2 * k}\\sin^2 ${H}`, `${co(k)}\\cos^2 ${F}`] },
      { span: [2, 3], value: `2\\sin ${H}\\cos ${H}`, bank: [`2\\sin ${H}`, `\\sin ${H}\\cos ${H}`, `2\\sin^2 ${H}`] },
      { span: [0, 3], value: `${co(k)}\\cot ${H}`, bank: [`${co(k)}\\tan ${H}`, `${2 * k}\\cot ${H}`, `${co(k)}\\cos ${H}`] },
    ],
    why: (k, F, H) => [
      { text: `Rewrite both: $1 + \\cos ${F} = 2\\cos^2 ${H}$ and $\\sin ${F} = 2\\sin ${H}\\cos ${H}$.` },
      { tex: `\\frac{${2 * k}\\cos^2 ${H}}{2\\sin ${H}\\cos ${H}} = ${co(k)}\\cot ${H}` },
    ],
  },
];

/** Simplify with a half-angle rewrite: the whole angle becomes its half, then cancel. */
const halfSimplifySteps: Generator<HalfStepsParams> = {
  id: 'tid-half-simplify-steps',
  sample: (rng, difficulty) => {
    const forms = HALF_STEPS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, k: rng.int(1, 6), pair: rng.int(0, 2) };
  },
  render: ({ form, k, pair }): Slide => {
    const f = HALF_STEPS[form];
    const [F, H] = HALF_PAIRS[pair];
    return {
      kind: 'steps',
      prompt: [prose(`Rewrite in the half angle $${H}$ so that something cancels, then simplify.`)],
      start: f.start(co(k), F, H),
      reductions: f.reductions(k, F, H).map((r) => ({ ...r, bank: scatter([...new Set([r.value, ...r.bank])]) })),
    };
  },
  solution: ({ form, k, pair }) => {
    const [F, H] = HALF_PAIRS[pair];
    return HALF_STEPS[form].why(k, F, H);
  },
};

interface RewriteParams {
  form: number;
  k: number;
  pair: number;
}

/** The four versions of the double-angle formulae, each read with the half angle as the single one. */
const halfFormulae = (F: string, H: string): string[] => [
  `$\\cos ${F} = 1 - 2\\sin^2 ${H}$`,
  `$\\cos ${F} = 2\\cos^2 ${H} - 1$`,
  `$\\cos ${F} = \\cos^2 ${H} - \\sin^2 ${H}$`,
  `$\\sin ${F} = 2\\sin ${H}\\cos ${H}$`,
];

interface RewriteForm {
  hard: boolean;
  evenK?: boolean;
  subject: (k: number, F: string, H: string) => string;
  formula: number;
  right: (k: number, F: string, H: string) => string;
  slips: (k: number, F: string, H: string) => string[];
}

const REWRITE_FORMS: RewriteForm[] = [
  {
    hard: false,
    subject: (k, F) => `${k} - ${co(k)}\\cos ${F}`,
    formula: 0,
    right: (k, _F, H) => `${2 * k}\\sin^2 ${H}`,
    slips: (k, _F, H) => [`${co(k)}\\sin^2 ${H}`, `${2 * k}\\cos^2 ${H}`, `-${2 * k}\\sin^2 ${H}`],
  },
  {
    hard: false,
    subject: (k, F) => `${k} + ${co(k)}\\cos ${F}`,
    formula: 1,
    right: (k, _F, H) => `${2 * k}\\cos^2 ${H}`,
    slips: (k, _F, H) => [`${co(k)}\\cos^2 ${H}`, `${2 * k}\\sin^2 ${H}`, `-${2 * k}\\cos^2 ${H}`],
  },
  {
    hard: false,
    subject: (k, F) => `${co(k)}\\sin ${F}`,
    formula: 3,
    right: (k, _F, H) => `${2 * k}\\sin ${H}\\cos ${H}`,
    slips: (k, _F, H) => [`${co(k)}\\sin ${H}\\cos ${H}`, `${2 * k}\\sin ${H}`, `${2 * k}\\sin^2 ${H}`],
  },
  {
    hard: false,
    subject: (k, F) => `${co(k)}\\cos ${F} - ${k}`,
    formula: 0,
    right: (k, _F, H) => `-${2 * k}\\sin^2 ${H}`,
    slips: (k, _F, H) => [`${2 * k}\\sin^2 ${H}`, `-${2 * k}\\cos^2 ${H}`, `-${co(k)}\\sin^2 ${H}`],
  },
  {
    hard: true,
    subject: (k, _F, H) => `${co(k)}\\cos^2 ${H} - ${co(k)}\\sin^2 ${H}`,
    formula: 2,
    right: (k, F) => `${co(k)}\\cos ${F}`,
    slips: (k, F) => [`-${co(k)}\\cos ${F}`, `${co(k)}\\sin ${F}`, `${k}`],
  },
  {
    hard: true,
    evenK: true,
    subject: (k, _F, H) => `${co(k)}\\sin ${H}\\cos ${H}`,
    formula: 3,
    right: (k, F) => `${co(k / 2)}\\sin ${F}`,
    slips: (k, F) => [`${co(k)}\\sin ${F}`, `${co(2 * k)}\\sin ${F}`, `${co(k / 2)}\\cos ${F}`],
  },
  {
    hard: true,
    subject: (k, _F, H) => `${k} - ${co(2 * k)}\\sin^2 ${H}`,
    formula: 0,
    right: (k, F) => `${co(k)}\\cos ${F}`,
    slips: (k, F) => [`-${co(k)}\\cos ${F}`, `${co(2 * k)}\\cos ${F}`, `${co(k)}\\sin ${F}`],
  },
];

/** Which version of the formula rewrites this in one step, and what it becomes. */
const halfRewriteFlow: Generator<RewriteParams> = {
  id: 'tid-half-rewrite-flow',
  sample: (rng, difficulty) => {
    const forms = REWRITE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    const form = rng.pick(forms).i;
    const k = REWRITE_FORMS[form].evenK ? rng.pick([2, 4, 6]) : rng.int(1, 6);
    return { form, k, pair: rng.int(0, HALF_PAIRS.length - 1) };
  },
  render: ({ form, k, pair }): Slide => {
    const f = REWRITE_FORMS[form];
    const [F, H] = HALF_PAIRS[pair];
    const formulae = halfFormulae(F, H);
    const right = `$${f.right(k, F, H)}$`;
    const results = scatter([...new Set([right, ...f.slips(k, F, H).map((s) => `$${s}$`)])].slice(0, 4));
    return {
      kind: 'flow',
      prompt: [prose(`Rewrite this in one step with a double-angle formula, where $${H}$ is the single angle and $${F}$ the double.`)],
      subject: f.subject(k, F, H),
      steps: [
        { id: 'formula', ask: 'Which version does it in one step?', branches: formulae.map((label) => ({ label, to: 'becomes' })) },
        {
          id: 'becomes',
          ask: 'So it becomes',
          branches: results.map((label) => ({ label, outcome: 'One formula swapped in, and nothing left over.' })),
        },
      ],
      answer: [formulae[f.formula], right],
    };
  },
  solution: ({ form, k, pair }) => {
    const f = REWRITE_FORMS[form];
    const [F, H] = HALF_PAIRS[pair];
    const reason = [
      `The constant has to cancel, so use the version with a $1$ in it and only sines: $\\cos ${F} = 1 - 2\\sin^2 ${H}$.`,
      `The constant has to cancel, so use the version with a $1$ in it and only cosines: $\\cos ${F} = 2\\cos^2 ${H} - 1$.`,
      `$\\cos^2 ${H} - \\sin^2 ${H}$ is exactly one side of $\\cos ${F} = \\cos^2 ${H} - \\sin^2 ${H}$.`,
      `$\\sin ${F} = 2\\sin ${H}\\cos ${H}$ links a sine of $${F}$ to the product of the half angle's sine and cosine.`,
    ][f.formula];
    return [{ text: reason }, { tex: `${f.subject(k, F, H)} = ${f.right(k, F, H)}` }];
  },
};

interface HalfSignParams {
  fn: Fn;
  range: number;
  v: number;
}

/** The size of sin, cos or tan of half the angle, from cos of the whole one. */
function halfRoot(fn: Fn, v: string): string {
  if (fn === 'sin') return `\\sqrt{\\dfrac{1 - \\cos ${v}}{2}}`;
  if (fn === 'cos') return `\\sqrt{\\dfrac{1 + \\cos ${v}}{2}}`;
  return `\\sqrt{\\dfrac{1 - \\cos ${v}}{1 + \\cos ${v}}}`;
}

/** The root with the wrong fraction under it: cos's for sin, and tan's upside down. */
function flippedRoot(fn: Fn, v: string): string {
  if (fn === 'sin') return halfRoot('cos', v);
  if (fn === 'cos') return halfRoot('sin', v);
  return `\\sqrt{\\dfrac{1 + \\cos ${v}}{1 - \\cos ${v}}}`;
}

/** The half-angle formula's sign: which root, and plus or minus, for where x lies. */
const halfSignChoice: Generator<HalfSignParams> = {
  id: 'tid-half-sign-choice',
  sample: (rng, difficulty) => ({
    fn: rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const)),
    range: rng.int(0, difficulty > 1 ? HALF_RANGES.length - 1 : 3),
    v: rng.int(0, HALF_LETTERS.length - 1),
  }),
  render: (p): Slide => {
    const v = HALF_LETTERS[p.v];
    const root = halfRoot(p.fn, v);
    const other = flippedRoot(p.fn, v);
    const sign = halfSign(p.fn, p.range);
    const correct = sign > 0 ? root : `-${root}`;
    return choiceSlide(
      [prose(`Given that $${rangeTex(p.range, v)}$, which is $\\${p.fn} ${halfOf(v)}$?`)],
      correct,
      [sign > 0 ? `-${root}` : root, sign > 0 ? other : `-${other}`, sign > 0 ? `-${other}` : other],
      saltOf(p),
    );
  },
  solution: (p) => {
    const v = HALF_LETTERS[p.v];
    const { lo, hi } = HALF_RANGES[p.range];
    const sign = halfSign(p.fn, p.range);
    const root = halfRoot(p.fn, v);
    const size = {
      sin: `$\\cos ${v} = 1 - 2\\sin^2 ${halfOf(v)}$ gives $\\sin^2 ${halfOf(v)} = \\frac{1 - \\cos ${v}}{2}$.`,
      cos: `$\\cos ${v} = 2\\cos^2 ${halfOf(v)} - 1$ gives $\\cos^2 ${halfOf(v)} = \\frac{1 + \\cos ${v}}{2}$.`,
      tan: `$\\tan^2 ${halfOf(v)}$ is $\\sin^2$ over $\\cos^2$, so the halves cancel: $\\frac{1 - \\cos ${v}}{1 + \\cos ${v}}$.`,
    }[p.fn];
    return [
      { text: size },
      {
        text: `Halve the range: $${deg(lo / 2)} < ${halfOf(v)} < ${deg(hi / 2)}$, where $\\${p.fn}$ is ${sign > 0 ? 'positive' : 'negative'}.`,
      },
      { tex: `\\${p.fn} ${halfOf(v)} = ${sign > 0 ? root : `-${root}`}` },
    ];
  },
};

/* Lesson 2: half-angle values from cos x. */

/**
 * Half-angle values come out whole only when drawn backwards: the half angle's
 * triangle first, then cos x = (b^2 - a^2)/c^2 from it, so sin(x/2) = a/c,
 * cos(x/2) = b/c and tan(x/2) = a/b.
 */
const HALF_TRIPLES: [number, number, number][] = [...TRIPLES, [20, 21, 29]];

interface HalfValueParams {
  triple: number;
  swap: boolean;
  range: number;
  v: number;
}

/** Easy draws keep x between 0 and 180 degrees; harder ones put x/2 in each quadrant. */
const VALUE_RANGES_HARD = [0, 1, 4, 2];

function halfValues({ triple, swap, range }: HalfValueParams): { s: Rat; c: Rat; t: Rat; cosFull: Rat; a: number; b: number; h: number } {
  const [p, q, h] = HALF_TRIPLES[triple];
  const [a, b] = swap ? [q, p] : [p, q];
  const sSign = halfSign('sin', range);
  const cSign = halfSign('cos', range);
  return { s: [sSign * a, h], c: [cSign * b, h], t: rat(sSign * cSign * a, b), cosFull: rat(b * b - a * a, h * h), a, b, h };
}

function sampleHalfValue(rng: Rng, difficulty: number, letters: number): HalfValueParams {
  return {
    triple: rng.int(0, HALF_TRIPLES.length - 1),
    swap: rng.chance(0.5),
    range: difficulty > 1 ? rng.pick(VALUE_RANGES_HARD) : 0,
    v: rng.int(0, letters - 1),
  };
}

const HALF_VALUE_LETTERS = ['x', '\\theta'];

/** The worked route to one half-angle value: the formula, the fraction, the root, the sign. */
function halfValueSteps(p: HalfValueParams, ask: Fn, v: string): SolutionStep[] {
  const { s, c, t, cosFull, a, b, h } = halfValues(p);
  const H = halfOf(v);
  const { lo, hi } = HALF_RANGES[p.range];
  const value = { sin: s, cos: c, tan: t }[ask];
  const sign = halfSign(ask, p.range);
  const square =
    ask === 'sin'
      ? `\\sin^2 ${H} = \\frac{1 - \\cos ${v}}{2} = \\frac{${oneMinus(cosFull)}}{2} = ${ratTex(rat(a * a, h * h))}`
      : ask === 'cos'
        ? `\\cos^2 ${H} = \\frac{1 + \\cos ${v}}{2} = \\frac{${onePlus(cosFull)}}{2} = ${ratTex(rat(b * b, h * h))}`
        : `\\tan^2 ${H} = \\frac{1 - \\cos ${v}}{1 + \\cos ${v}} = \\frac{${oneMinus(cosFull)}}{${onePlus(cosFull)}} = ${ratTex(rat(a * a, b * b))}`;
  return [
    { tex: square },
    {
      text: `$${deg(lo)} < ${v} < ${deg(hi)}$, so $${deg(lo / 2)} < ${H} < ${deg(hi / 2)}$, where $\\${ask}$ is ${sign > 0 ? 'positive' : 'negative'}.`,
    },
    { tex: `\\${ask} ${H} = ${ratTex(value)}` },
  ];
}

interface HalfAskParams extends HalfValueParams {
  ask: Fn;
}

/** sin, cos or tan of x/2, typed as a fraction, from cos x and where x lies. */
const halfValue: Generator<HalfAskParams> = {
  id: 'tid-half-value',
  sample: (rng, difficulty) => ({ ...sampleHalfValue(rng, difficulty, HALF_VALUE_LETTERS.length), ask: rng.pick(['sin', 'cos', 'tan'] as const) }),
  render: (p): Slide => {
    const v = HALF_VALUE_LETTERS[p.v];
    const { s, c, t, cosFull } = halfValues(p);
    const value = { sin: s, cos: c, tan: t }[p.ask];
    return {
      kind: 'expression',
      prompt: [prose(`Given that $\\cos ${v} = ${ratTex(cosFull)}$ and $${rangeTex(p.range, v)}$, find the exact value.`)],
      lead: `\\${p.ask} ${halfOf(v)} =`,
      keypad: NUMBER_KEYS,
      answer: ratAnswer(value),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const { s, c, t, a, b, h } = halfValues(p);
    const value = { sin: s, cos: c, tan: t }[p.ask];
    const sign = value[0] < 0 ? -1 : 1;
    const other: Rat = p.ask === 'sin' ? [sign * b, h] : p.ask === 'cos' ? [sign * a, h] : [sign * b, a];
    const squared: Rat = p.ask === 'tan' ? rat(sign * a * a, b * b) : rat(sign * Math.abs(value[0]) ** 2, h * h);
    return ratOptions(value, [[-value[0], value[1]], other, squared, [-other[0], other[1]]]);
  },
  solution: (p) => halfValueSteps(p, p.ask, HALF_VALUE_LETTERS[p.v]),
};

/** sin^2 and cos^2 of x/2 first, then their roots with the right signs, then tan. */
const halfSquareTree: Generator<HalfValueParams> = {
  id: 'tid-half-square-tree',
  sample: (rng, difficulty) => sampleHalfValue(rng, difficulty, HALF_LETTERS.length),
  render: (p): Slide => {
    const v = HALF_LETTERS[p.v];
    const H = halfOf(v);
    const { s, c, t, cosFull, a, b, h } = halfValues(p);
    const answer = [ratTex(rat(a * a, h * h)), ratTex(rat(b * b, h * h)), ratTex(s), ratTex(c), ratTex(t)];
    const distractors = [
      ratTex([-s[0], s[1]]),
      ratTex([-c[0], c[1]]),
      ratTex([-t[0], t[1]]),
      ratTex(rat(2 * a * a, h * h)),
      ratTex(rat(t[1], t[0])),
      ratTex(cosFull),
    ];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `$\\cos ${v} = ${ratTex(cosFull)}$ and $${rangeTex(p.range, v)}$. Top row: $\\sin^2 ${H}$, then $\\cos^2 ${H}$. Under each: its root, signed for where $${H}$ lies. Bottom: $\\tan ${H}$.`,
        ),
      ],
      expression: `\\tan ${H} = \\dfrac{\\sin ${H}}{\\cos ${H}}`,
      nodes: [
        { id: 's2', from: [] },
        { id: 'c2', from: [] },
        { id: 's', from: ['s2'] },
        { id: 'c', from: ['c2'] },
        { id: 't', from: ['s', 'c'] },
      ],
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const v = HALF_LETTERS[p.v];
    const H = halfOf(v);
    const { s, c, t, cosFull, a, b, h } = halfValues(p);
    const { lo, hi } = HALF_RANGES[p.range];
    return [
      { tex: `\\sin^2 ${H} = \\frac{${oneMinus(cosFull)}}{2} = ${ratTex(rat(a * a, h * h))}` },
      { tex: `\\cos^2 ${H} = \\frac{${onePlus(cosFull)}}{2} = ${ratTex(rat(b * b, h * h))}` },
      {
        text: `$${deg(lo / 2)} < ${H} < ${deg(hi / 2)}$ fixes the signs: $\\sin ${H}$ is ${s[0] > 0 ? 'positive' : 'negative'} and $\\cos ${H}$ ${c[0] > 0 ? 'positive' : 'negative'}.`,
      },
      { tex: `\\sin ${H} = ${ratTex(s)} \\qquad \\cos ${H} = ${ratTex(c)}` },
      { tex: `\\tan ${H} = ${ratTex(s)} \\div ${br(ratTex(c))} = ${ratTex(t)}` },
    ];
  },
};

interface HalfRootParams extends HalfValueParams {
  fn: 'sin' | 'cos';
}

/** One half-angle value a line at a time: formula, substitute, simplify, then the root with its sign. */
const halfRootSteps: Generator<HalfRootParams> = {
  id: 'tid-half-root-steps',
  sample: (rng, difficulty) => ({ ...sampleHalfValue(rng, difficulty, HALF_VALUE_LETTERS.length), fn: rng.pick(['sin', 'cos'] as const) }),
  render: (p): Slide => {
    const v = HALF_VALUE_LETTERS[p.v];
    const H = halfOf(v);
    const { s, c, cosFull, a, b, h } = halfValues(p);
    const isSin = p.fn === 'sin';
    const op = isSin ? '-' : '+';
    const flip = isSin ? '+' : '-';
    const sub = isSin ? oneMinus(cosFull) : onePlus(cosFull);
    const subSlip = isSin ? onePlus(cosFull) : oneMinus(cosFull);
    const [n, m] = isSin ? [a, b] : [b, a];
    const value = isSin ? s : c;
    const reductions: { span: [number, number]; value: string; bank: string[] }[] = [
      {
        span: [0, 1],
        value: `\\pm\\sqrt{\\dfrac{1 ${op} \\cos ${v}}{2}}`,
        bank: [`\\pm\\sqrt{\\dfrac{1 ${flip} \\cos ${v}}{2}}`, `\\pm\\sqrt{1 ${op} \\cos ${v}}`, `\\pm\\dfrac{1 ${op} \\cos ${v}}{2}`],
      },
      {
        span: [0, 1],
        value: `\\pm\\sqrt{\\dfrac{${sub}}{2}}`,
        bank: [`\\pm\\sqrt{\\dfrac{${subSlip}}{2}}`, `\\pm\\sqrt{${sub}}`],
      },
      {
        span: [0, 1],
        value: `\\pm\\sqrt{${ratTex(rat(n * n, h * h))}}`,
        bank: [`\\pm\\sqrt{${ratTex(rat(m * m, h * h))}}`, `\\pm\\sqrt{${ratTex(rat(2 * n * n, h * h))}}`],
      },
      {
        span: [0, 1],
        value: ratTex(value),
        bank: [ratTex([-value[0], value[1]]), ratTex([Math.sign(value[0]) * m, h]), ratTex(rat(n * n, h * h))],
      },
    ];
    return {
      kind: 'steps',
      prompt: [
        prose(`Given that $\\cos ${v} = ${ratTex(cosFull)}$ and $${rangeTex(p.range, v)}$, find $\\${p.fn} ${H}$ a line at a time.`),
      ],
      start: [`\\${p.fn} ${H}`],
      reductions: reductions.map((r) => ({ ...r, bank: scatter([...new Set([r.value, ...r.bank])]) })),
    };
  },
  solution: (p) => halfValueSteps(p, p.fn, HALF_VALUE_LETTERS[p.v]),
};

interface HalfSignFlowParams extends HalfValueParams {
  fn: Fn;
}

/** The quadrants x/2 can land in, as flow labels. */
const HALF_QUADRANTS: [number, number][] = [
  [0, 90],
  [90, 180],
  [180, 270],
  [270, 360],
  [-90, 0],
];

/** Where x/2 lies first, then the value with the sign that goes with it. */
const halfSignFlow: Generator<HalfSignFlowParams> = {
  id: 'tid-half-sign-flow',
  sample: (rng, difficulty) => ({
    triple: rng.int(0, HALF_TRIPLES.length - 1),
    swap: rng.chance(0.5),
    range: difficulty > 1 ? rng.int(0, 4) : rng.int(0, 1),
    v: rng.int(0, HALF_VALUE_LETTERS.length - 1),
    fn: rng.pick(['sin', 'cos', 'tan'] as const),
  }),
  render: (p): Slide => {
    const v = HALF_VALUE_LETTERS[p.v];
    const H = halfOf(v);
    const { s, c, t, cosFull, a, b, h } = halfValues(p);
    const { lo, hi } = HALF_RANGES[p.range];
    const where = (q: [number, number]) => `$${deg(q[0])}$ and $${deg(q[1])}$`;
    const right: [number, number] = [lo / 2, hi / 2];
    const quadrants = [right, ...HALF_QUADRANTS.filter((q) => q[0] !== right[0])].slice(0, 4).sort((x, y) => x[0] - y[0]);
    const value = { sin: s, cos: c, tan: t }[p.fn];
    const size: Rat = { sin: [a, h], cos: [b, h], tan: [a, b] }[p.fn] as Rat;
    const swapped: Rat = { sin: [b, h], cos: [a, h], tan: [b, a] }[p.fn] as Rat;
    const values = scatter([size, [-size[0], size[1]] as Rat, swapped, [-swapped[0], swapped[1]] as Rat].map((r) => `$${ratTex(r)}$`));
    return {
      kind: 'flow',
      prompt: [prose(`Given that $${rangeTex(p.range, v)}$, find $\\${p.fn} ${H}$ one decision at a time.`)],
      subject: `\\cos ${v} = ${ratTex(cosFull)}`,
      steps: [
        { id: 'where', ask: `First, $${H}$ lies between`, branches: quadrants.map((q) => ({ label: where(q), to: 'value' })) },
        {
          id: 'value',
          ask: `So $\\${p.fn} ${H}$ is`,
          branches: values.map((label) => ({ label, outcome: 'The formula gives the size; where the half angle lies gives the sign.' })),
        },
      ],
      answer: [where(right), `$${ratTex(value)}$`],
    };
  },
  solution: (p) => halfValueSteps(p, p.fn, HALF_VALUE_LETTERS[p.v]),
};

/* Lesson 3: exact values at 15 and 22.5 degrees, and the other halves of table angles. */

/**
 * Half of a table angle. `m` is the surd in cos 2θ = sigma * sqrt(m) / 2, and
 * `q` the quadrant θ is in: the first four are acute, the rest obtuse, where
 * cos and tan turn negative. These angles are only ever shown, never typed.
 */
interface HalfTable {
  deg: number;
  m: 2 | 3;
  sigma: 1 | -1;
  q: 1 | 2;
}

const HALF_TABLE_ANGLES: HalfTable[] = [
  { deg: 15, m: 3, sigma: 1, q: 1 },
  { deg: 22.5, m: 2, sigma: 1, q: 1 },
  { deg: 67.5, m: 2, sigma: -1, q: 1 },
  { deg: 75, m: 3, sigma: -1, q: 1 },
  { deg: 105, m: 3, sigma: -1, q: 2 },
  { deg: 112.5, m: 2, sigma: -1, q: 2 },
  { deg: 157.5, m: 2, sigma: 1, q: 2 },
  { deg: 165, m: 3, sigma: 1, q: 2 },
];

const ACUTE_HALVES = 4;

type ExactFn = 'sin2' | 'cos2' | 'sin' | 'cos' | 'tan';

const EXACT_FNS: ExactFn[] = ['tan', 'sin2', 'cos2', 'sin', 'cos'];

/** 2 plus or minus sqrt(m), as it sits under a root or over 4. */
const twoPm = (sign: number, m: number): string => `2 ${sign < 0 ? '-' : '+'} \\sqrt{${m}}`;

/**
 * One exact value at a half-table angle, as the learner reads it and as a
 * number. The number is worked from the same surds, not from Math.sin, so a
 * test comparing the two checks the formula rather than itself.
 */
function exactValue(e: HalfTable, fn: ExactFn): { tex: string; value: number } {
  const r = Math.sqrt(e.m);
  const neg = e.q === 2 ? -1 : 1;
  switch (fn) {
    case 'sin2':
      return { tex: `\\dfrac{${twoPm(-e.sigma, e.m)}}{4}`, value: (2 - e.sigma * r) / 4 };
    case 'cos2':
      return { tex: `\\dfrac{${twoPm(e.sigma, e.m)}}{4}`, value: (2 + e.sigma * r) / 4 };
    case 'sin':
      return { tex: `\\tfrac12\\sqrt{${twoPm(-e.sigma, e.m)}}`, value: Math.sqrt(2 - e.sigma * r) / 2 };
    case 'cos':
      return {
        tex: `${neg < 0 ? '-' : ''}\\tfrac12\\sqrt{${twoPm(e.sigma, e.m)}}`,
        value: (neg * Math.sqrt(2 + e.sigma * r)) / 2,
      };
    case 'tan': {
      const [lead, lv] = e.m === 3 ? ['2', 2] : ['\\sqrt{2}', Math.SQRT2];
      const [tail, tv] = e.m === 3 ? ['\\sqrt{3}', Math.sqrt(3)] : ['1', 1];
      const coef = -e.sigma * neg;
      return { tex: `${neg < 0 ? '-' : ''}${lead} ${coef < 0 ? '-' : '+'} ${tail}`, value: neg * lv + coef * tv };
    }
  }
}

/** The angle, and its double, as the learner reads them. */
const exactAngle = (e: HalfTable, radians: boolean): string => angleTex(e.deg, radians);

const EXACT_NAMES: Record<ExactFn, string> = {
  sin2: '\\sin^2',
  cos2: '\\cos^2',
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
};

/** The half-angle line that gives each value, with θ the half and 2θ the table angle. */
function exactFormula(fn: ExactFn, A: string, D: string): string {
  if (fn === 'sin2' || fn === 'sin') return `\\sin^2 ${A} = \\tfrac12(1 - \\cos ${D})`;
  if (fn === 'cos2' || fn === 'cos') return `\\cos^2 ${A} = \\tfrac12(1 + \\cos ${D})`;
  return `\\tan ${A} = \\dfrac{\\sin ${D}}{1 + \\cos ${D}}`;
}

/** The worked value: formula, table value substituted, answer. */
function halfExactSolution(e: HalfTable, fn: ExactFn, radians: boolean): SolutionStep[] {
  const A = exactAngle(e, radians);
  const D = angleTex(2 * e.deg, radians);
  const cTex = specialTex(trigAt('cos', 2 * e.deg)!);
  const sTex = specialTex(trigAt('sin', 2 * e.deg)!);
  const cos2 = trigAt('cos', 2 * e.deg)!;
  const plus = (sign: number) => `1 ${sign * cos2 < 0 ? '-' : '+'} ${specialTex(Math.abs(cos2))}`;
  const steps: SolutionStep[] = [{ text: `$${A}$ is half of $${D}$, and $\\cos ${D} = ${cTex}$, $\\sin ${D} = ${sTex}$.` }];
  if (fn === 'tan') {
    steps.push(
      { tex: `\\tan ${A} = \\dfrac{\\sin ${D}}{1 + \\cos ${D}} = \\dfrac{${sTex}}{${plus(1)}}` },
      { text: 'Multiply top and bottom by 2, then by the bottom with its sign changed, to clear the surd underneath:' },
      { tex: `\\tan ${A} = ${exactValue(e, 'tan').tex}` },
    );
    return steps;
  }
  const square: ExactFn = fn === 'sin' || fn === 'sin2' ? 'sin2' : 'cos2';
  steps.push({
    tex: `${EXACT_NAMES[square]} ${A} = \\tfrac12(${plus(square === 'sin2' ? -1 : 1)}) = ${exactValue(e, square).tex}`,
  });
  if (fn === 'sin' || fn === 'cos') {
    steps.push(
      {
        text:
          fn === 'cos' && e.q === 2
            ? `$${A}$ is obtuse, so its cosine is negative: take the negative root, and $\\sqrt{4} = 2$ comes out of the bottom.`
            : `Take the positive root; $\\sqrt{4} = 2$ comes out of the bottom.`,
      },
      { tex: `${EXACT_NAMES[fn]} ${A} = ${exactValue(e, fn).tex}` },
    );
  }
  return steps;
}

interface HalfExactTilesParams {
  e: number;
  fn: ExactFn;
  radians: boolean;
}

/** Surd tiles for one value: 2 minus sqrt 3 over 4, sqrt 2 minus 1, half the root of 2 plus sqrt 2. */
const halfExactTiles: Generator<HalfExactTilesParams> = {
  id: 'tid-half-exact-tiles',
  sample: (rng, difficulty) => ({
    e: rng.int(0, difficulty > 1 ? HALF_TABLE_ANGLES.length - 1 : ACUTE_HALVES - 1),
    fn: rng.pick(EXACT_FNS),
    radians: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const e = HALF_TABLE_ANGLES[p.e];
    const A = p.radians ? '\\theta' : deg(e.deg);
    const other = e.m === 3 ? 2 : 3;
    const neg = e.q === 2 ? -1 : 1;
    let template: string;
    let answer: string[];
    let wrong: string[];
    if (p.fn === 'tan') {
      const lead = `${neg < 0 ? '-' : ''}${e.m === 3 ? '2' : '\\sqrt{2}'}`;
      const coef = -e.sigma * neg;
      const body = e.m === 3 ? '\\sqrt{3}' : '';
      template = `\\tan ${A} = {0} {1}`;
      answer = [lead, signed(coef, body)];
      wrong = [
        `${neg < 0 ? '' : '-'}${e.m === 3 ? '2' : '\\sqrt{2}'}`,
        e.m === 3 ? '\\sqrt{2}' : '2',
        signed(-coef, body),
        signed(coef, e.m === 3 ? '' : '\\sqrt{3}'),
      ];
    } else if (p.fn === 'sin2' || p.fn === 'cos2') {
      const s = p.fn === 'sin2' ? -e.sigma : e.sigma;
      template = `${EXACT_NAMES[p.fn]} ${A} = \\tfrac14(2 {0})`;
      answer = [signed(s, `\\sqrt{${e.m}}`)];
      wrong = [signed(-s, `\\sqrt{${e.m}}`), signed(s, `\\sqrt{${other}}`), signed(-s, `\\sqrt{${other}}`)];
    } else {
      const inner = p.fn === 'sin' ? -e.sigma : e.sigma;
      const sign = p.fn === 'cos' ? neg : 1;
      const root = (i: number, m: number, sg: number) => `${sg < 0 ? '-' : ''}\\tfrac12\\sqrt{${twoPm(i, m)}}`;
      template = `${EXACT_NAMES[p.fn]} ${A} = {0}`;
      answer = [root(inner, e.m, sign)];
      wrong = [root(-inner, e.m, sign), root(inner, other, sign), root(inner, e.m, -sign), root(-inner, other, sign)];
    }
    const hint = p.radians ? `Here $\\theta = ${piTex(e.deg)}$. ` : '';
    return {
      kind: 'tiles',
      prompt: [prose(`${hint}Complete the exact value, from the half-angle formula with the whole angle $${angleTex(2 * e.deg, p.radians)}$.`)],
      template,
      bank: bankOf(answer, wrong),
      answer,
    };
  },
  solution: (p) => halfExactSolution(HALF_TABLE_ANGLES[p.e], p.fn, p.radians),
};

interface HalfExactChoiceParams {
  e: number;
  fn: 'sin' | 'cos' | 'tan';
  radians: boolean;
  reverse: boolean;
}

/** Pick the exact value of a half-table angle, or the angle a value belongs to. */
const halfExactChoice: Generator<HalfExactChoiceParams> = {
  id: 'tid-half-exact-choice',
  sample: (rng, difficulty) => ({
    e: rng.int(0, difficulty > 1 ? HALF_TABLE_ANGLES.length - 1 : ACUTE_HALVES - 1),
    fn: rng.pick(['sin', 'cos', 'tan'] as const),
    radians: rng.chance(0.5),
    reverse: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const e = HALF_TABLE_ANGLES[p.e];
    const pool = HALF_TABLE_ANGLES.slice(0, p.e < ACUTE_HALVES ? ACUTE_HALVES : HALF_TABLE_ANGLES.length);
    const target = exactValue(e, p.fn);
    if (p.reverse) {
      const others = pool.filter((row) => Math.abs(exactValue(row, p.fn).value - target.value) > 1e-9);
      return choiceSlide(
        [prose(`For which angle is $\\${p.fn} \\theta$ exactly this?`), display(target.tex)],
        exactAngle(e, p.radians),
        others.map((row) => exactAngle(row, p.radians)),
        saltOf(p),
      );
    }
    // The nearest slips first: the sibling with the other sign inside, the other surd, then anything else.
    const sibling = HALF_TABLE_ANGLES.find((row) => row.m === e.m && row.q === e.q && row.sigma !== e.sigma)!;
    const cousin = HALF_TABLE_ANGLES.find((row) => row.m !== e.m && row.q === e.q && row.sigma === e.sigma)!;
    const candidates = [
      exactValue(sibling, p.fn),
      exactValue(cousin, p.fn),
      ...(['sin', 'cos', 'tan'] as const).map((fn) => exactValue(e, fn)),
      ...HALF_TABLE_ANGLES.map((row) => exactValue(row, p.fn)),
    ].filter((c) => Math.abs(c.value - target.value) > 1e-9);
    return choiceSlide(
      [prose(`Which is the exact value of $\\${p.fn} ${exactAngle(e, p.radians)}$?`)],
      target.tex,
      candidates.map((c) => c.tex),
      saltOf(p),
    );
  },
  solution: (p) => halfExactSolution(HALF_TABLE_ANGLES[p.e], p.fn, p.radians),
};

interface HalfExactStepsParams {
  e: number;
  form: 'sin2' | 'cos2' | 'tan1' | 'tan2';
  radians: boolean;
}

/** The exact value worked a line at a time: pick the formula, put the table value in, tidy. */
const halfExactSteps: Generator<HalfExactStepsParams> = {
  id: 'tid-half-exact-steps',
  sample: (rng, difficulty) => ({
    e: rng.int(0, difficulty > 1 ? HALF_TABLE_ANGLES.length - 1 : ACUTE_HALVES - 1),
    form: rng.pick(['sin2', 'cos2', 'tan1', 'tan2'] as const),
    radians: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const e = HALF_TABLE_ANGLES[p.e];
    const A = exactAngle(e, p.radians);
    const D = angleTex(2 * e.deg, p.radians);
    const cos2 = trigAt('cos', 2 * e.deg)!;
    const sin2 = trigAt('sin', 2 * e.deg)!;
    const cSize = specialTex(Math.abs(cos2));
    const sTex = specialTex(sin2);
    const other = e.m === 3 ? 2 : 3;
    const slipSize = specialTex(e.m === 3 ? Math.SQRT2 / 2 : Math.sqrt(3) / 2);
    /** 1 plus or minus the size of cos 2θ, the sign already worked out. */
    const one = (sign: number, size = cSize) => `1 ${sign < 0 ? '-' : '+'} ${size}`;
    const cSign = Math.sign(cos2);
    let reductions: { span: [number, number]; value: string; bank: string[] }[];
    let start: string;
    if (p.form === 'sin2' || p.form === 'cos2') {
      const s = p.form === 'sin2' ? -1 : 1;
      const name = EXACT_NAMES[p.form];
      start = `${name} ${A}`;
      reductions = [
        {
          span: [0, 1],
          value: `\\tfrac12(1 ${s < 0 ? '-' : '+'} \\cos ${D})`,
          bank: [`\\tfrac12(1 ${s < 0 ? '+' : '-'} \\cos ${D})`, `\\tfrac12(1 ${s < 0 ? '-' : '+'} \\cos ${A})`, `1 ${s < 0 ? '-' : '+'} 2\\cos ${D}`],
        },
        {
          span: [0, 1],
          value: `\\tfrac12(${one(s * cSign)})`,
          bank: [`\\tfrac12(${one(-s * cSign)})`, `\\tfrac12(${one(s * cSign, slipSize)})`],
        },
        {
          span: [0, 1],
          value: exactValue(e, p.form).tex,
          bank: [`\\dfrac{${twoPm(-s * cSign, e.m)}}{4}`, `\\dfrac{${twoPm(s * cSign, other)}}{4}`, `\\dfrac{${twoPm(s * cSign, e.m)}}{2}`],
        },
      ];
    } else {
      const minus = p.form === 'tan2';
      const formula = minus ? `\\dfrac{1 - \\cos ${D}}{\\sin ${D}}` : `\\dfrac{\\sin ${D}}{1 + \\cos ${D}}`;
      const substituted = minus ? `\\dfrac{${one(-cSign)}}{${sTex}}` : `\\dfrac{${sTex}}{${one(cSign)}}`;
      const slipSub = minus ? `\\dfrac{${one(cSign)}}{${sTex}}` : `\\dfrac{${sTex}}{${one(-cSign)}}`;
      start = `\\tan ${A}`;
      reductions = [
        {
          span: [0, 1],
          value: formula,
          bank: [
            minus ? `\\dfrac{1 + \\cos ${D}}{\\sin ${D}}` : `\\dfrac{\\sin ${D}}{1 - \\cos ${D}}`,
            minus ? `\\dfrac{\\sin ${D}}{1 - \\cos ${D}}` : `\\dfrac{\\cos ${D}}{1 + \\sin ${D}}`,
            minus ? `\\dfrac{1 - \\cos ${A}}{\\sin ${A}}` : `\\dfrac{\\sin ${A}}{1 + \\cos ${A}}`,
          ],
        },
        { span: [0, 1], value: substituted, bank: [slipSub] },
      ];
      // Doubling top and bottom: sin 2θ doubles to +-1 or +-sqrt 2, and 1 + cos 2θ to 2 + sqrt m.
      const top = (sign: number) => (e.m === 3 ? `${sign < 0 ? '-' : ''}1` : `${sign < 0 ? '-' : ''}\\sqrt{2}`);
      const sSign = Math.sign(sin2);
      const cleared = minus ? `\\dfrac{${twoPm(-cSign, e.m)}}{${top(sSign)}}` : `\\dfrac{${top(sSign)}}{${twoPm(cSign, e.m)}}`;
      const clearedSlip = minus ? `\\dfrac{${twoPm(cSign, e.m)}}{${top(sSign)}}` : `\\dfrac{${top(sSign)}}{${twoPm(-cSign, e.m)}}`;
      // (1 - cos 2θ) / sin 2θ at a 30-degree family has 1 or -1 underneath: nothing left to rationalise.
      if (!(minus && e.m === 3)) {
        reductions.push({ span: [0, 1], value: cleared, bank: [clearedSlip, minus ? `\\dfrac{${twoPm(-cSign, e.m)}}{2}` : `\\dfrac{${top(sSign)}}{2}`] });
      }
      const sibling = HALF_TABLE_ANGLES.find((row) => row.m === e.m && row.q === e.q && row.sigma !== e.sigma)!;
      const cousin = HALF_TABLE_ANGLES.find((row) => row.m !== e.m && row.q === e.q && row.sigma === e.sigma)!;
      reductions.push({
        span: [0, 1],
        value: exactValue(e, 'tan').tex,
        bank: [exactValue(sibling, 'tan').tex, exactValue(cousin, 'tan').tex],
      });
    }
    return {
      kind: 'steps',
      prompt: [prose(`Find the exact value a line at a time, using the half-angle formula with the whole angle $${D}$.`)],
      start: [start],
      reductions: reductions.map((r) => ({ ...r, bank: scatter([...new Set([r.value, ...r.bank])]) })),
    };
  },
  solution: (p) => {
    const e = HALF_TABLE_ANGLES[p.e];
    if (p.form === 'sin2' || p.form === 'cos2') return halfExactSolution(e, p.form, p.radians);
    const A = exactAngle(e, p.radians);
    const D = angleTex(2 * e.deg, p.radians);
    const sTex = specialTex(trigAt('sin', 2 * e.deg)!);
    const cos2 = trigAt('cos', 2 * e.deg)!;
    const cSize = specialTex(Math.abs(cos2));
    const minus = p.form === 'tan2';
    const line = minus
      ? `\\tan ${A} = \\dfrac{1 - \\cos ${D}}{\\sin ${D}} = \\dfrac{1 ${cos2 < 0 ? '+' : '-'} ${cSize}}{${sTex}}`
      : `\\tan ${A} = \\dfrac{\\sin ${D}}{1 + \\cos ${D}} = \\dfrac{${sTex}}{1 ${cos2 < 0 ? '-' : '+'} ${cSize}}`;
    return [
      { text: `$${A}$ is half of $${D}$, where $\\sin ${D} = ${sTex}$ and $\\cos ${D} = ${specialTex(cos2)}$.` },
      { tex: line },
      {
        text:
          minus && e.m === 3
            ? 'Multiply top and bottom by 2 and the bottom is $\\pm 1$, so nothing is left to tidy.'
            : 'Multiply top and bottom by 2, then clear the surd from the bottom by multiplying by it with its sign changed.',
      },
      { tex: `\\tan ${A} = ${exactValue(e, 'tan').tex}` },
    ];
  },
};

interface HalfSurdTreeParams {
  e: number;
  /** 0: tan from sin 2θ over 1 + cos 2θ; 1: tan from 1 - cos 2θ over sin 2θ; 2: sin; 3: cos. */
  shape: number;
  radians: boolean;
}

/** The exact value built from the table: cos 2θ and sin 2θ on top, the value underneath. */
const halfSurdTree: Generator<HalfSurdTreeParams> = {
  id: 'tid-half-surd-tree',
  sample: (rng, difficulty) => ({
    e: rng.int(0, difficulty > 1 ? HALF_TABLE_ANGLES.length - 1 : ACUTE_HALVES - 1),
    shape: rng.int(0, 3),
    radians: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const e = HALF_TABLE_ANGLES[p.e];
    const A = exactAngle(e, p.radians);
    const D = angleTex(2 * e.deg, p.radians);
    const cos2 = trigAt('cos', 2 * e.deg)!;
    const sin2 = trigAt('sin', 2 * e.deg)!;
    const cTex = specialTex(cos2);
    const sTex = specialTex(sin2);
    const cSign = Math.sign(cos2);
    const other = e.m === 3 ? 2 : 3;
    const half = (sign: number, m = e.m) => `\\dfrac{${twoPm(sign, m)}}{2}`;
    const sibling = HALF_TABLE_ANGLES.find((row) => row.m === e.m && row.q === e.q && row.sigma !== e.sigma)!;
    if (p.shape < 2) {
      const minus = p.shape === 1;
      const d = half(minus ? -cSign : cSign);
      const answer = [sTex, cTex, d, exactValue(e, 'tan').tex];
      const distractors = [
        specialTex(-sin2),
        specialTex(-cos2),
        half(minus ? cSign : -cSign),
        half(minus ? -cSign : cSign, other),
        exactValue(sibling, 'tan').tex,
      ];
      return {
        kind: 'tree',
        prompt: [
          prose(
            `Top row: $\\sin ${D}$, then $\\cos ${D}$. Under $\\cos ${D}$: $1 ${minus ? '-' : '+'} \\cos ${D}$. Bottom: $\\tan ${A}$, from the two above it.`,
          ),
        ],
        expression: minus ? `\\tan ${A} = \\dfrac{1 - \\cos ${D}}{\\sin ${D}}` : `\\tan ${A} = \\dfrac{\\sin ${D}}{1 + \\cos ${D}}`,
        nodes: [
          { id: 's', from: [] },
          { id: 'c', from: [] },
          { id: 'd', from: ['c'] },
          { id: 't', from: minus ? ['d', 's'] : ['s', 'd'] },
        ],
        bank: bankOf(answer, distractors, 4),
        answer,
      };
    }
    const fn: ExactFn = p.shape === 2 ? 'sin' : 'cos';
    const square: ExactFn = p.shape === 2 ? 'sin2' : 'cos2';
    const answer = [cTex, exactValue(e, square).tex, exactValue(e, fn).tex];
    const flipped: ExactFn = p.shape === 2 ? 'cos' : 'sin';
    const distractors = [
      specialTex(-cos2),
      exactValue(e, p.shape === 2 ? 'cos2' : 'sin2').tex,
      exactValue(e, flipped).tex,
      `-${exactValue(e, fn).tex}`.replace(/^--/, ''),
      exactValue(sibling, square).tex,
    ];
    return {
      kind: 'tree',
      prompt: [prose(`Top: $\\cos ${D}$. Then $${EXACT_NAMES[square]} ${A}$ from it, then $${EXACT_NAMES[fn]} ${A}$ itself.`)],
      expression: exactFormula(square, A, D),
      nodes: [
        { id: 'c', from: [] },
        { id: 'q', from: ['c'] },
        { id: 'r', from: ['q'] },
      ],
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const e = HALF_TABLE_ANGLES[p.e];
    const fn: ExactFn = p.shape < 2 ? 'tan' : p.shape === 2 ? 'sin' : 'cos';
    return halfExactSolution(e, fn, p.radians);
  },
};

/* Lesson 4: the triple-angle formulae. */

const TRIPLE_LETTERS = ['x', '\\theta', 'A', 't'];

/** The single angle, the double and the triple: x, 2x, 3x, or 2x, 4x, 6x. */
function tripleAngles(v: string, m: number): { X: string; D: string; T: string } {
  return { X: m === 1 ? v : `${m}${v}`, D: `${2 * m}${v}`, T: `${3 * m}${v}` };
}

interface TripleStepsParams {
  fn: 'sin' | 'cos';
  v: number;
  m: number;
  /** 0: expand (2A + A); 1: expand (A + 2A). */
  route: number;
  /** Name the formulae to use: the easier draw. */
  hint: boolean;
}

/** The triple-angle formula derived: expand sin(2x + x), then everything into one function. */
const tripleSteps: Generator<TripleStepsParams> = {
  id: 'tid-triple-steps',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    v: rng.int(0, TRIPLE_LETTERS.length - 1),
    m: rng.int(1, difficulty > 1 ? 3 : 2),
    route: rng.int(0, 1),
    hint: difficulty === 1,
  }),
  render: (p): Slide => {
    const { X, D, T } = tripleAngles(TRIPLE_LETTERS[p.v], p.m);
    const first = p.route === 0;
    type R = { span: [number, number]; value: string; bank: string[] };
    let start: string[];
    let expansion: string;
    let reductions: R[];
    if (p.fn === 'sin') {
      const double: R = {
        span: [0, 1],
        value: `2\\sin ${X}\\cos^2 ${X}`,
        bank: [`2\\sin ${X}\\cos ${X}`, `\\sin ${X}\\cos^2 ${X}`, `2\\sin^2 ${X}\\cos ${X}`],
      };
      const doubleSines: R = {
        span: [0, 1],
        value: `2\\sin ${X} - 2\\sin^3 ${X}`,
        bank: [`2\\sin ${X} + 2\\sin^3 ${X}`, `2\\sin ${X} - 2\\sin^2 ${X}`, `2 - 2\\sin^3 ${X}`],
      };
      const single: R = {
        span: [0, 1],
        value: `\\sin ${X} - 2\\sin^3 ${X}`,
        bank: [`\\sin ${X} + 2\\sin^3 ${X}`, `\\sin ${X} - 2\\sin^2 ${X}`, `2\\sin^3 ${X} - \\sin ${X}`],
      };
      const at = (r: R, i: number): R => ({ ...r, span: [i, i + 1] });
      if (first) {
        expansion = `\\sin ${D}\\cos ${X} + \\cos ${D}\\sin ${X}`;
        start = [`\\sin ${D}\\cos ${X}`, '+', `\\cos ${D}\\sin ${X}`];
        reductions = [double, doubleSines, at(single, 2)];
      } else {
        expansion = `\\sin ${X}\\cos ${D} + \\cos ${X}\\sin ${D}`;
        start = [`\\sin ${X}\\cos ${D}`, '+', `\\cos ${X}\\sin ${D}`];
        reductions = [single, at(double, 2), at(doubleSines, 2)];
      }
      reductions.push({
        span: [0, 3],
        value: `3\\sin ${X} - 4\\sin^3 ${X}`,
        bank: [`3\\sin ${X} + 4\\sin^3 ${X}`, `\\sin ${X} - 4\\sin^3 ${X}`, `4\\sin^3 ${X} - 3\\sin ${X}`],
      });
    } else {
      expansion = first ? `\\cos ${D}\\cos ${X} - \\sin ${D}\\sin ${X}` : `\\cos ${X}\\cos ${D} - \\sin ${X}\\sin ${D}`;
      start = first ? [`\\cos ${D}\\cos ${X}`, '-', `\\sin ${D}\\sin ${X}`] : [`\\cos ${X}\\cos ${D}`, '-', `\\sin ${X}\\sin ${D}`];
      reductions = [
        {
          span: [0, 1],
          value: `2\\cos^3 ${X} - \\cos ${X}`,
          bank: [`2\\cos^3 ${X} + \\cos ${X}`, `2\\cos^2 ${X} - \\cos ${X}`, `\\cos^3 ${X} - \\cos ${X}`],
        },
        {
          span: [2, 3],
          value: `2\\sin^2 ${X}\\cos ${X}`,
          bank: [`2\\sin ${X}\\cos ${X}`, `\\sin^2 ${X}\\cos ${X}`, `2\\sin ${X}\\cos^2 ${X}`],
        },
        {
          span: [2, 3],
          value: `(2\\cos ${X} - 2\\cos^3 ${X})`,
          bank: [`(2\\cos ${X} + 2\\cos^3 ${X})`, `(2 - 2\\cos^3 ${X})`, `(2\\cos^3 ${X} - 2\\cos ${X})`],
        },
        {
          span: [0, 3],
          value: `4\\cos^3 ${X} - 3\\cos ${X}`,
          bank: [`3\\cos ${X} - 4\\cos^3 ${X}`, `4\\cos^3 ${X} - \\cos ${X}`, `\\cos ${X}`],
        },
      ];
    }
    const hint =
      p.hint
        ? p.fn === 'sin'
          ? ` Use $\\sin 2A = 2\\sin A\\cos A$, $\\cos 2A = 1 - 2\\sin^2 A$ and $\\cos^2 A = 1 - \\sin^2 A$.`
          : ` Use $\\cos 2A = 2\\cos^2 A - 1$, $\\sin 2A = 2\\sin A\\cos A$ and $\\sin^2 A = 1 - \\cos^2 A$.`
        : '';
    return {
      kind: 'steps',
      prompt: [
        prose(`Write $\\${p.fn} ${T}$ in terms of $\\${p.fn} ${X}$ alone, a piece at a time.${hint}`),
        display(`\\${p.fn} ${T} = ${expansion}`),
      ],
      start,
      reductions: reductions.map((r) => ({ ...r, bank: scatter([...new Set([r.value, ...r.bank])]) })),
    };
  },
  solution: (p) => {
    const { X, D, T } = tripleAngles(TRIPLE_LETTERS[p.v], p.m);
    if (p.fn === 'sin') {
      return [
        { text: `Split $${T}$ as $${D} + ${X}$ and expand, then write the double angles in the single one.` },
        { tex: `\\begin{aligned} &\\sin ${D}\\cos ${X} \\\\ &= 2\\sin ${X}\\cos^2 ${X} \\\\ &= 2\\sin ${X}(1 - \\sin^2 ${X}) \\end{aligned}` },
        { tex: `\\begin{aligned} &\\cos ${D}\\sin ${X} \\\\ &= (1 - 2\\sin^2 ${X})\\sin ${X} \\end{aligned}` },
        { tex: `\\sin ${T} = 3\\sin ${X} - 4\\sin^3 ${X}` },
      ];
    }
    return [
      { text: `Split $${T}$ as $${D} + ${X}$ and expand, then write the double angles in the single one.` },
      { tex: `\\begin{aligned} &\\cos ${D}\\cos ${X} \\\\ &= (2\\cos^2 ${X} - 1)\\cos ${X} \\end{aligned}` },
      { tex: `\\begin{aligned} &\\sin ${D}\\sin ${X} \\\\ &= 2\\sin^2 ${X}\\cos ${X} \\\\ &= 2(1 - \\cos^2 ${X})\\cos ${X} \\end{aligned}` },
      { text: 'Take the second from the first; the minus sign turns both of its terms over.' },
      { tex: `\\cos ${T} = 4\\cos^3 ${X} - 3\\cos ${X}` },
    ];
  },
};

interface TripleTilesParams {
  form: number;
  v: number;
  m: number;
}

interface TripleTileForm {
  hard: boolean;
  template: (X: string, T: string) => string;
  answer: (X: string, T: string) => string[];
  wrong: (X: string, T: string) => string[];
  unordered?: boolean;
  why: (X: string, T: string) => string;
}

const TRIPLE_TILE_FORMS: TripleTileForm[] = [
  {
    hard: false,
    template: (_X, T) => `\\sin ${T} = {0} - {1}`,
    answer: (X) => [`3\\sin ${X}`, `4\\sin^3 ${X}`],
    wrong: (X) => [`4\\sin ${X}`, `3\\sin^3 ${X}`, `4\\cos^3 ${X}`],
    why: (X, T) => `It is $\\sin 3A = 3\\sin A - 4\\sin^3 A$ with $A = ${X}$, so $3A = ${T}$.`,
  },
  {
    hard: false,
    template: (_X, T) => `\\cos ${T} = {0} - {1}`,
    answer: (X) => [`4\\cos^3 ${X}`, `3\\cos ${X}`],
    wrong: (X) => [`3\\cos^3 ${X}`, `4\\cos ${X}`, `3\\sin ${X}`],
    why: (X, T) => `It is $\\cos 3A = 4\\cos^3 A - 3\\cos A$ with $A = ${X}$, so $3A = ${T}$.`,
  },
  {
    hard: false,
    template: (X, T) => `\\sin ${T} = \\sin ${X}({0} - {1})`,
    answer: (X) => ['3', `4\\sin^2 ${X}`],
    wrong: (X) => ['4', `3\\sin^2 ${X}`, `4\\sin^3 ${X}`],
    why: (X) => `Take the common factor $\\sin ${X}$ out of $3\\sin ${X} - 4\\sin^3 ${X}$.`,
  },
  {
    hard: false,
    template: (X, T) => `\\cos ${T} = \\cos ${X}({0} - {1})`,
    answer: (X) => [`4\\cos^2 ${X}`, '3'],
    wrong: (X) => ['4', `3\\cos^2 ${X}`, `4\\cos^3 ${X}`],
    why: (X) => `Take the common factor $\\cos ${X}$ out of $4\\cos^3 ${X} - 3\\cos ${X}$.`,
  },
  {
    hard: false,
    template: (X) => `4\\sin^3 ${X} = {0} - {1}`,
    answer: (X, T) => [`3\\sin ${X}`, `\\sin ${T}`],
    wrong: (X, T) => [`\\cos ${T}`, `3\\cos ${X}`, `4\\sin ${X}`],
    why: (X, T) => `From $\\sin ${T} = 3\\sin ${X} - 4\\sin^3 ${X}$, move $4\\sin^3 ${X}$ one way and $\\sin ${T}$ the other.`,
  },
  {
    hard: false,
    template: (X) => `4\\cos^3 ${X} = {0} + {1}`,
    answer: (X, T) => [`\\cos ${T}`, `3\\cos ${X}`],
    wrong: (X, T) => [`\\sin ${T}`, `3\\sin ${X}`, `4\\cos ${X}`],
    unordered: true,
    why: (X, T) => `From $\\cos ${T} = 4\\cos^3 ${X} - 3\\cos ${X}$, add $3\\cos ${X}$ to both sides.`,
  },
  {
    hard: true,
    template: (X) => `\\sin^3 ${X} = \\tfrac14({0} - {1})`,
    answer: (X, T) => [`3\\sin ${X}`, `\\sin ${T}`],
    wrong: (X, T) => [`4\\sin ${X}`, `\\cos ${T}`, `3\\cos ${X}`],
    why: (X, T) => `From $\\sin ${T} = 3\\sin ${X} - 4\\sin^3 ${X}$: $4\\sin^3 ${X} = 3\\sin ${X} - \\sin ${T}$, then divide by $4$.`,
  },
  {
    hard: true,
    template: (X) => `\\cos^3 ${X} = \\tfrac14({0} + {1})`,
    answer: (X, T) => [`\\cos ${T}`, `3\\cos ${X}`],
    wrong: (X, T) => [`\\sin ${T}`, `4\\cos ${X}`, `3\\sin ${X}`],
    unordered: true,
    why: (X, T) => `From $\\cos ${T} = 4\\cos^3 ${X} - 3\\cos ${X}$: $4\\cos^3 ${X} = \\cos ${T} + 3\\cos ${X}$, then divide by $4$.`,
  },
  {
    hard: true,
    template: (X, T) => `\\dfrac{\\sin ${T}}{\\sin ${X}} = {0} - {1}`,
    answer: (X) => [`4\\cos^2 ${X}`, '1'],
    wrong: (X) => ['3', `4\\sin^2 ${X}`, `3\\cos^2 ${X}`],
    why: (X) => `Dividing gives $3 - 4\\sin^2 ${X}$, and $\\sin^2 ${X} = 1 - \\cos^2 ${X}$ turns it into $3 - 4 + 4\\cos^2 ${X}$.`,
  },
  {
    hard: true,
    template: (X, T) => `\\dfrac{\\cos ${T}}{\\cos ${X}} = {0} - {1}`,
    answer: (X) => ['1', `4\\sin^2 ${X}`],
    wrong: (X) => ['3', `4\\cos^2 ${X}`, `3\\sin^2 ${X}`],
    why: (X) => `Dividing gives $4\\cos^2 ${X} - 3$, and $\\cos^2 ${X} = 1 - \\sin^2 ${X}$ turns it into $4 - 4\\sin^2 ${X} - 3$.`,
  },
];

/** A triple-angle formula completed, or rearranged. */
const tripleTiles: Generator<TripleTilesParams> = {
  id: 'tid-triple-tiles',
  sample: (rng, difficulty) => {
    const forms = TRIPLE_TILE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, v: rng.int(0, 2), m: rng.int(1, 2) };
  },
  render: ({ form, v, m }): Slide => {
    const f = TRIPLE_TILE_FORMS[form];
    const { X, T } = tripleAngles(TRIPLE_LETTERS[v], m);
    const answer = f.answer(X, T);
    return {
      kind: 'tiles',
      prompt: [prose(m === 1 ? 'Complete the line.' : `Complete the line. Here the single angle is $${X}$.`)],
      template: f.template(X, T),
      bank: bankOf(answer, f.wrong(X, T)),
      answer,
      ...(f.unordered ? { unordered: true } : {}),
    };
  },
  solution: ({ form, v, m }) => {
    const f = TRIPLE_TILE_FORMS[form];
    const { X, T } = tripleAngles(TRIPLE_LETTERS[v], m);
    let line = f.template(X, T);
    f.answer(X, T).forEach((token, i) => {
      line = line.replace(`{${i}}`, token);
    });
    return [{ text: f.why(X, T) }, { tex: line }];
  },
};

interface TripleValueParams {
  /** Only 3-4-5 and 5-12-13: cubing puts c^3 underneath. */
  triple: number;
  swap: boolean;
  given: 'sin' | 'cos';
  ask: 'sin' | 'cos';
  quadrant: number;
  v: number;
}

const TRIPLE_VALUE_LETTERS = ['x', '\\theta', 'A'];

function quadrantTex(quadrant: number, v: string): string {
  return [
    '',
    `$${v}$ is acute`,
    `$90^{\\circ} < ${v} < 180^{\\circ}$`,
    `$180^{\\circ} < ${v} < 270^{\\circ}$`,
    `$270^{\\circ} < ${v} < 360^{\\circ}$`,
  ][quadrant];
}

function tripleRatios(p: TripleValueParams): { s: Rat; c: Rat; h: number } {
  const [a0, b0, h] = TRIPLES[p.triple];
  const [a, b] = p.swap ? [b0, a0] : [a0, b0];
  const sSign = p.quadrant <= 2 ? 1 : -1;
  const cSign = p.quadrant === 1 || p.quadrant === 4 ? 1 : -1;
  return { s: [sSign * a, h], c: [cSign * b, h], h };
}

/** sin 3x = 3s - 4s^3 and cos 3x = 4c^3 - 3c, over h^3. */
function tripleOf(fn: 'sin' | 'cos', p: TripleValueParams): Rat {
  const { s, c, h } = tripleRatios(p);
  if (fn === 'sin') return rat(3 * s[0] * h * h - 4 * s[0] ** 3, h ** 3);
  return rat(4 * c[0] ** 3 - 3 * c[0] * h * h, h ** 3);
}

/** sin 3x or cos 3x as a fraction, from one ratio of x. */
const tripleValue: Generator<TripleValueParams> = {
  id: 'tid-triple-value',
  sample: (rng, difficulty) => ({
    triple: rng.int(0, 1),
    swap: rng.chance(0.5),
    given: rng.pick(['sin', 'cos'] as const),
    ask: rng.pick(['sin', 'cos'] as const),
    quadrant: difficulty > 1 ? rng.int(2, 4) : 1,
    v: rng.int(0, TRIPLE_VALUE_LETTERS.length - 1),
  }),
  render: (p): Slide => {
    const v = TRIPLE_VALUE_LETTERS[p.v];
    const r = tripleRatios(p);
    const given = p.given === 'sin' ? r.s : r.c;
    return {
      kind: 'expression',
      prompt: [prose(`Given that $\\${p.given} ${v} = ${ratTex(given)}$ and ${quadrantTex(p.quadrant, v)}, find the exact value.`)],
      lead: `\\${p.ask} 3${v} =`,
      keypad: NUMBER_KEYS,
      answer: ratAnswer(tripleOf(p.ask, p)),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const { s, c, h } = tripleRatios(p);
    const value = tripleOf(p.ask, p);
    const x = p.ask === 'sin' ? s[0] : c[0];
    const plus: Rat = p.ask === 'sin' ? rat(3 * x * h * h + 4 * x ** 3, h ** 3) : rat(4 * x ** 3 + 3 * x * h * h, h ** 3);
    return ratOptions(value, [[-value[0], value[1]], plus, tripleOf(p.ask === 'sin' ? 'cos' : 'sin', p), [-plus[0], plus[1]]]);
  },
  solution: (p) => {
    const v = TRIPLE_VALUE_LETTERS[p.v];
    const { s, c, h } = tripleRatios(p);
    const [a0, b0] = TRIPLES[p.triple];
    const need = p.ask === 'sin' ? s : c;
    const steps: SolutionStep[] = [];
    if (p.given !== p.ask) {
      steps.push(
        { text: `The sides ${a0}, ${b0}, ${h} give the sizes; ${quadrantTex(p.quadrant, v)} gives the signs.` },
        { tex: `\\${p.ask} ${v} = ${ratTex(need)}` },
      );
    }
    const n = ratTex(need);
    const line =
      p.ask === 'sin'
        ? `\\sin 3${v} = 3\\sin ${v} - 4\\sin^3 ${v} = 3 \\times ${br(n)} - 4 \\times ${br(n)}^3`
        : `\\cos 3${v} = 4\\cos^3 ${v} - 3\\cos ${v} = 4 \\times ${br(n)}^3 - 3 \\times ${br(n)}`;
    steps.push({ tex: line }, { tex: `\\${p.ask} 3${v} = ${ratTex(tripleOf(p.ask, p))}` });
    return steps;
  },
};

interface TripleChoiceParams {
  form: number;
  v: number;
  m: number;
  stem: number;
}

interface TripleChoiceForm {
  hard: boolean;
  expr: (X: string, T: string) => string;
  right: (X: string, T: string) => string;
  wrong: (X: string, T: string) => string[];
  why: (X: string, T: string) => string;
}

const TRIPLE_CHOICE_FORMS: TripleChoiceForm[] = [
  {
    hard: false,
    expr: (_X, T) => `\\sin ${T}`,
    right: (X) => `3\\sin ${X} - 4\\sin^3 ${X}`,
    wrong: (X) => [`4\\sin^3 ${X} - 3\\sin ${X}`, `3\\sin ${X} + 4\\sin^3 ${X}`, `3\\sin^3 ${X} - 4\\sin ${X}`],
    why: (X, T) => `Split $${T}$ into the double angle plus $${X}$, expand, and write everything in $\\sin ${X}$.`,
  },
  {
    hard: false,
    expr: (_X, T) => `\\cos ${T}`,
    right: (X) => `4\\cos^3 ${X} - 3\\cos ${X}`,
    wrong: (X) => [`3\\cos ${X} - 4\\cos^3 ${X}`, `4\\cos^3 ${X} + 3\\cos ${X}`, `3\\cos^3 ${X} - 4\\cos ${X}`],
    why: (X, T) => `Split $${T}$ into the double angle plus $${X}$, expand, and write everything in $\\cos ${X}$.`,
  },
  {
    hard: false,
    expr: (X) => `3\\sin ${X} - 4\\sin^3 ${X}`,
    right: (_X, T) => `\\sin ${T}`,
    wrong: (X, T) => [`-\\sin ${T}`, `\\cos ${T}`, `\\sin^3 ${X}`],
    why: (X, T) => `It is the triple-angle formula for sine with $A = ${X}$, so $3A = ${T}$.`,
  },
  {
    hard: false,
    expr: (X) => `4\\cos^3 ${X} - 3\\cos ${X}`,
    right: (_X, T) => `\\cos ${T}`,
    wrong: (X, T) => [`-\\cos ${T}`, `\\sin ${T}`, `\\cos^3 ${X}`],
    why: (X, T) => `It is the triple-angle formula for cosine with $A = ${X}$, so $3A = ${T}$.`,
  },
  {
    hard: false,
    expr: (X, T) => `\\dfrac{\\sin ${T}}{\\sin ${X}}`,
    right: (X) => `4\\cos^2 ${X} - 1`,
    wrong: (X) => [`3 - 4\\cos^2 ${X}`, `4\\sin^2 ${X} - 1`, `3 - 4\\sin ${X}`],
    why: (X) => `The top is $\\sin ${X}(3 - 4\\sin^2 ${X})$, so the quotient is $3 - 4\\sin^2 ${X} = 3 - 4(1 - \\cos^2 ${X}) = 4\\cos^2 ${X} - 1$.`,
  },
  {
    hard: false,
    expr: (X, T) => `\\dfrac{\\cos ${T}}{\\cos ${X}}`,
    right: (X) => `1 - 4\\sin^2 ${X}`,
    wrong: (X) => [`4\\sin^2 ${X} - 1`, `1 - 4\\cos^2 ${X}`, `4\\cos ${X} - 3`],
    why: (X) => `The top is $\\cos ${X}(4\\cos^2 ${X} - 3)$, so the quotient is $4\\cos^2 ${X} - 3 = 4(1 - \\sin^2 ${X}) - 3 = 1 - 4\\sin^2 ${X}$.`,
  },
  {
    hard: true,
    expr: (X) => `4\\sin^3 ${X}`,
    right: (X, T) => `3\\sin ${X} - \\sin ${T}`,
    wrong: (X, T) => [`\\sin ${T} - 3\\sin ${X}`, `3\\sin ${X} + \\sin ${T}`, `\\sin ${T}`],
    why: (X, T) => `Rearrange $\\sin ${T} = 3\\sin ${X} - 4\\sin^3 ${X}$ for $4\\sin^3 ${X}$.`,
  },
  {
    hard: true,
    expr: (X) => `4\\cos^3 ${X}`,
    right: (X, T) => `\\cos ${T} + 3\\cos ${X}`,
    wrong: (X, T) => [`\\cos ${T} - 3\\cos ${X}`, `3\\cos ${X} - \\cos ${T}`, `\\cos ${T}`],
    why: (X, T) => `Rearrange $\\cos ${T} = 4\\cos^3 ${X} - 3\\cos ${X}$ for $4\\cos^3 ${X}$.`,
  },
  {
    hard: true,
    expr: (X, T) => `\\sin ${T} + 4\\sin^3 ${X}`,
    right: (X) => `3\\sin ${X}`,
    wrong: (X) => [`-3\\sin ${X}`, `\\sin ${X}`, `8\\sin^3 ${X}`],
    why: (X, T) => `$\\sin ${T} = 3\\sin ${X} - 4\\sin^3 ${X}$, so adding $4\\sin^3 ${X}$ leaves $3\\sin ${X}$.`,
  },
  {
    hard: true,
    expr: (X, T) => `\\cos ${T} + 3\\cos ${X}`,
    right: (X) => `4\\cos^3 ${X}`,
    wrong: (X) => [`-4\\cos^3 ${X}`, `\\cos^3 ${X}`, `4\\cos ${X}`],
    why: (X, T) => `$\\cos ${T} = 4\\cos^3 ${X} - 3\\cos ${X}$, so adding $3\\cos ${X}$ leaves $4\\cos^3 ${X}$.`,
  },
];

const TRIPLE_CHOICE_STEMS = ['Which of these is the same as', 'Which is equal to this at every angle?', 'Pick the equal expression.'];

/** Which expression is this equal to, through a triple-angle formula? */
const tripleChoice: Generator<TripleChoiceParams> = {
  id: 'tid-triple-choice',
  sample: (rng, difficulty) => {
    const forms = TRIPLE_CHOICE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, v: rng.int(0, 2), m: rng.int(1, 2), stem: rng.int(0, TRIPLE_CHOICE_STEMS.length - 1) };
  },
  render: (p): Slide => {
    const f = TRIPLE_CHOICE_FORMS[p.form];
    const { X, T } = tripleAngles(TRIPLE_LETTERS[p.v], p.m);
    return choiceSlide([prose(TRIPLE_CHOICE_STEMS[p.stem]), display(f.expr(X, T))], f.right(X, T), f.wrong(X, T), saltOf(p));
  },
  solution: ({ form, v, m }) => {
    const f = TRIPLE_CHOICE_FORMS[form];
    const { X, T } = tripleAngles(TRIPLE_LETTERS[v], m);
    return [{ text: f.why(X, T) }, { tex: `${f.expr(X, T)} = ${f.right(X, T)}` }];
  },
};

/* Lesson 5: equations in x/2 and 3x. */

/**
 * fn(x/2) = k or fn(3x) = k with 0 <= x < top. Solve for the whole bracket over
 * its own range, then undo the halving or the tripling. A 3x equation that is
 * typed or slid keeps k to 0 and +-1: sin 3x = 1/2 gives x = 10 degrees, which
 * is off the 30-and-45 lattice every typed angle here sits on.
 */
interface MultiEq {
  kind: 'half' | 'triple';
  fn: Fn;
  value: number;
  /** x runs over 0 <= x < top. */
  top: number;
}

/** An equation with the difficulty it is first asked at. */
type TaggedEq = MultiEq & { hard: boolean };

/** The bracket, x/2 or 3x, in a given letter. */
const bracketOf = (kind: 'half' | 'triple', v: string): string => (kind === 'half' ? halfOf(v) : `3${v}`);

/** How far the bracket runs while x runs up to top. */
const bracketTop = (eq: MultiEq): number => (eq.kind === 'half' ? eq.top / 2 : 3 * eq.top);

/** Every bracket angle below its top where fn takes the value, smallest first. */
function bracketSolutions(eq: MultiEq): number[] {
  const out: number[] = [];
  const top = bracketTop(eq);
  for (let turn = 0; turn * 360 < top; turn += 1) {
    for (const d of solutionsOf(eq.fn, eq.value)) if (d + 360 * turn < top) out.push(d + 360 * turn);
  }
  return out;
}

const xOf = (eq: MultiEq, u: number): number => (eq.kind === 'half' ? 2 * u : u / 3);

const xSolutions = (eq: MultiEq): number[] => bracketSolutions(eq).map((u) => xOf(eq, u));

const eqTex = (eq: MultiEq, v: string): string => `\\${eq.fn} ${bracketOf(eq.kind, v)} = ${specialTex(eq.value)}`;

const xRangeTex = (eq: MultiEq, v: string): string => `0^{\\circ} \\le ${v} < ${deg(eq.top)}`;

/** Every special value a sine or cosine takes, and some it cannot reach. */
const SC_VALUES = [0, 0.5, -0.5, Math.SQRT2 / 2, -Math.SQRT2 / 2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2, 1, -1, 1.5];
const TAN_VALUES = [0, 1, -1, Math.sqrt(3), -Math.sqrt(3), 1 / Math.sqrt(3), -1 / Math.sqrt(3)];

/** 3x equations whose answers stay on the 30-degree lattice. */
const TRIPLE_TYPED: [Fn, number][] = [
  ['sin', 0],
  ['sin', 1],
  ['sin', -1],
  ['cos', 0],
  ['cos', 1],
  ['cos', -1],
];

const MULTI_LETTERS = ['x', '\\theta'];

/** Solve the whole bracket over its own range, then undo it: the working every question here shares. */
function multiSteps(eq: MultiEq, v: string): SolutionStep[] {
  const U = bracketOf(eq.kind, v);
  const us = bracketSolutions(eq);
  const xs = us.map((u) => xOf(eq, u));
  const undo = eq.kind === 'half' ? 'Double each one' : 'Divide each one by $3$';
  const steps: SolutionStep[] = [
    {
      text: `As $${v}$ runs from $0^{\\circ}$ up to $${deg(eq.top)}$, $${U}$ runs from $0^{\\circ}$ up to $${deg(bracketTop(eq))}$.`,
    },
  ];
  if (us.length === 0) {
    steps.push({ text: `$\\${eq.fn}$ never equals $${specialTex(eq.value)}$ there, so there are no solutions.` });
    return steps;
  }
  steps.push(
    { tex: `${U} = ${angleList(us)}` },
    { text: `${undo}:` },
    { tex: `${v} = ${angleList(xs)}` },
  );
  return steps;
}

interface MultiFlowParams {
  kind: 'half' | 'triple';
  fn: Fn;
  vi: number;
  /** Harder draws change x's range from the usual 0 to 360. */
  top: number;
  v: number;
}

const multiFlowEq = (p: MultiFlowParams): MultiEq => ({
  kind: p.kind,
  fn: p.fn,
  value: (p.fn === 'tan' ? TAN_VALUES : SC_VALUES)[p.vi],
  top: p.top,
});

/** How many solutions: first the bracket's range, then the count over it. */
const multiEqFlow: Generator<MultiFlowParams> = {
  id: 'tid-multi-eq-flow',
  sample: (rng, difficulty) => {
    const kind = rng.pick(['half', 'triple'] as const);
    const fn = rng.pick(['sin', 'cos', 'tan'] as const);
    const tops = kind === 'half' ? [360, 720] : [360, 180];
    return {
      kind,
      fn,
      vi: rng.int(0, (fn === 'tan' ? TAN_VALUES : SC_VALUES).length - 1),
      top: difficulty > 1 ? rng.pick(tops) : 360,
      v: rng.int(0, MULTI_LETTERS.length - 1),
    };
  },
  render: (p): Slide => {
    const eq = multiFlowEq(p);
    const v = MULTI_LETTERS[p.v];
    const U = bracketOf(eq.kind, v);
    const top = bracketTop(eq);
    const tops = [...new Set([top, eq.top, eq.kind === 'half' ? 2 * eq.top : eq.top / 3, eq.kind === 'half' ? eq.top / 4 : (3 * eq.top) / 2])]
      .sort((a, b) => a - b)
      .map((t) => `$${deg(t)}$`);
    const count = xSolutions(eq).length;
    const naive = solutionsOf(eq.fn, eq.value).filter((d) => d < eq.top).length;
    const counts = [count, naive, 2 * count, count + 1, 0, 1, 2, 3, 4, 6];
    const offered = [...new Set(counts)].slice(0, 4).sort((a, b) => a - b).map((n) => `$${n}$`);
    return {
      kind: 'flow',
      prompt: [prose(`How many solutions has this with $${xRangeTex(eq, v)}$?`)],
      subject: eqTex(eq, v),
      steps: [
        {
          id: 'range',
          ask: `As $${v}$ runs up to $${deg(eq.top)}$, $${U}$ runs up to`,
          branches: tops.map((label) => ({ label, to: 'count' })),
        },
        {
          id: 'count',
          ask: 'So the number of solutions is',
          branches: offered.map((label) => ({ label, outcome: 'Count over the range of the whole bracket, not of $x$.' })),
        },
      ],
      answer: [`$${deg(top)}$`, `$${count}$`],
    };
  },
  solution: (p) => multiSteps(multiFlowEq(p), MULTI_LETTERS[p.v]),
};

/** Equations whose solutions from 0 to 360 are all multiples of 15 degrees. */
const SLIDER_EQS: TaggedEq[] = [
  ...(['sin', 'cos', 'tan'] as const).flatMap((fn) =>
    (fn === 'tan' ? TAN_VALUES : SC_VALUES).map((value) => ({ kind: 'half' as const, fn, value, top: 360, hard: false })),
  ),
  ...TRIPLE_TYPED.map(([fn, value]) => ({ kind: 'triple' as const, fn, value, top: 360, hard: false })),
  { kind: 'triple', fn: 'tan', value: 0, top: 360, hard: true } as TaggedEq,
].filter((eq) => sliderEnds(eq, 2).length > 0);

/** Every solution strictly inside 0 to 360. */
function openSolutions(eq: MultiEq): number[] {
  return xSolutions(eq).filter((x) => x > 0 && x < 360);
}

interface MultiSliderParams {
  eq: number;
  /** 0: the smallest; 1: the largest; 2: the second smallest, asked only of harder draws. */
  end: number;
}

const SLIDER_WORDS = ['smallest', 'largest', 'second smallest'];

/** The solution each word names. */
function sliderPick(eq: MultiEq, end: number): number {
  const all = openSolutions(eq);
  return end === 0 ? all[0] : end === 1 ? all[all.length - 1] : all[1];
}

/** The words a slider may ask with: never one naming 180, where an untouched handle rests. */
function sliderEnds(eq: MultiEq, difficulty: number): number[] {
  const all = openSolutions(eq);
  if (all.length === 0) return [];
  const ends = all.length === 1 ? [0] : [0, 1, ...(difficulty > 1 && all.length > 2 ? [2] : [])];
  return ends.filter((end) => sliderPick(eq, end) !== 180);
}

/** The curve and the level drawn: slide to one solution, named by its place. */
const multiEqSlider: Generator<MultiSliderParams> = {
  id: 'tid-multi-eq-slider',
  sample: (rng, difficulty) => {
    const eqs = SLIDER_EQS.map((e, i) => ({ e, i })).filter(({ e }) => (difficulty > 1 || !e.hard) && sliderEnds(e, difficulty).length > 0);
    const eq = rng.pick(eqs).i;
    return { eq, end: rng.pick(sliderEnds(SLIDER_EQS[eq], difficulty)) };
  },
  render: ({ eq, end }): Slide => {
    const e = SLIDER_EQS[eq];
    const all = xSolutions(e).filter((x) => x > 0 && x < 360);
    const f = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[e.fn];
    const scale = e.kind === 'half' ? 0.5 : 3;
    const tall = e.fn === 'tan' ? 3 : 2;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (x) => f(scale * x * DEGREE), accent: true, ...(e.fn === 'tan' ? { breaks: true } : {}) }],
      horizontals: [e.value],
      yMin: -tall,
      yMax: tall,
      label: `The graph of the left-hand side from 0 to 360 degrees, with a dashed level line at the right-hand side`,
    });
    const which = all.length === 1 ? 'the solution' : `the ${SLIDER_WORDS[end]} solution`;
    return {
      kind: 'slider',
      prompt: [prose(`The dashed line is the right-hand side. Solve, and slide to ${which} with $0^{\\circ} < x < 360^{\\circ}$.`), display(eqTex(e, 'x'))],
      min: 0,
      max: 360,
      step: 15,
      answer: sliderPick(e, end),
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: ({ eq, end }) => {
    const e = SLIDER_EQS[eq];
    const all = xSolutions(e).filter((x) => x > 0 && x < 360);
    const pick = sliderPick(e, end);
    return [
      ...multiSteps(e, 'x'),
      { text: all.length === 1 ? `So $x = ${deg(pick)}$.` : `Leaving out $0^{\\circ}$, the ${SLIDER_WORDS[end]} is $${deg(pick)}$.` },
    ];
  },
};

interface MultiStepsParams {
  eq: number;
  v: number;
}

/** Equations worked on a line: the first turn, the bracket's whole range, then x. */
const STEPS_EQS: TaggedEq[] = [
  ...(['sin', 'cos', 'tan'] as const).flatMap((fn) =>
    (fn === 'tan' ? TAN_VALUES : SC_VALUES).flatMap((value) =>
      [360, 720].map((top) => ({ kind: 'half' as const, fn, value, top, hard: value < 0 || top === 720 || (fn === 'tan' && value !== 0 && value !== 1) })),
    ),
  ),
  ...TRIPLE_TYPED.map(([fn, value]) => ({ kind: 'triple' as const, fn, value, top: 180, hard: value < 0 })),
  { kind: 'triple', fn: 'tan', value: 0, top: 180, hard: true } as TaggedEq,
].filter((eq) => xSolutions(eq).length > 0);

/** Solve fn(x/2) = k or fn(3x) = k a line at a time: the table's angles, the bracket's range, then x. */
const multiEqSteps: Generator<MultiStepsParams> = {
  id: 'tid-multi-eq-steps',
  sample: (rng, difficulty) => {
    const eqs = STEPS_EQS.map((e, i) => ({ e, i })).filter(({ e }) => difficulty > 1 || !e.hard);
    return { eq: rng.pick(eqs).i, v: rng.int(0, MULTI_LETTERS.length - 1) };
  },
  render: ({ eq, v: vi }): Slide => {
    const e = STEPS_EQS[eq];
    const v = MULTI_LETTERS[vi];
    const U = bracketOf(e.kind, v);
    const first = solutionsOf(e.fn, e.value);
    const us = bracketSolutions(e);
    const xs = us.map((u) => xOf(e, u));
    const list = (angles: number[]) => (angles.length === 0 ? '\\text{none}' : angleList(angles));
    const other: Fn = e.fn === 'sin' ? 'cos' : 'sin';
    const reductions: { span: [number, number]; value: string; bank: string[] }[] = [
      {
        span: [0, 3],
        value: `${U} = ${list(first)}`,
        bank: [
          `${U} = ${list(solutionsOf(other, e.value))}`,
          `${U} = ${list(solutionsOf(e.fn, -e.value))}`,
          `${U} = ${list(first.slice(0, 1))}`,
          `${U} = ${list(first.map((d) => (360 - d) % 360).sort((a, b) => a - b))}`,
        ],
      },
    ];
    // Only where the bracket's range is not one turn does the list change: more turns for 3x, fewer angles for x/2.
    if (us.join() !== first.join()) {
      const turns = (n: number) => Array.from({ length: n }, (_, t) => first.map((d) => d + 360 * t)).flat();
      const wrong = e.kind === 'half' ? [first, first.map((d) => d + 360)] : [first, turns(2), turns(3)];
      reductions.push({ span: [0, 1], value: `${U} = ${list(us)}`, bank: wrong.map((w) => `${U} = ${list(w)}`) });
    }
    const backwards = us.map((u) => (e.kind === 'half' ? u / 2 : 3 * u));
    reductions.push({
      span: [0, 1],
      value: `${v} = ${list(xs)}`,
      bank: [`${v} = ${list(backwards)}`, `${v} = ${list(us)}`],
    });
    return {
      kind: 'steps',
      prompt: [prose(`Solve for $${xRangeTex(e, v)}$, a line at a time: the angles in one turn, then every one in range, then $${v}$.`)],
      start: [`\\${e.fn} ${U}`, '=', specialTex(e.value)],
      reductions: reductions.map((r) => ({ ...r, bank: scatter([...new Set([r.value, ...r.bank])]) })),
    };
  },
  solution: ({ eq, v }) => multiSteps(STEPS_EQS[eq], MULTI_LETTERS[v]),
};

interface MultiAngleParams {
  eq: number;
  largest: boolean;
  radians: boolean;
  v: number;
}

/** Equations with at least one solution from 0 to 360 whose every solution can be typed. */
const ANGLE_EQS: TaggedEq[] = [
  ...(['sin', 'cos', 'tan'] as const).flatMap((fn) =>
    (fn === 'tan' ? TAN_VALUES : SC_VALUES).map((value) => ({ kind: 'half' as const, fn, value, top: 360, hard: false })),
  ),
  ...TRIPLE_TYPED.map(([fn, value]) => ({ kind: 'triple' as const, fn, value, top: 360, hard: false })),
  { kind: 'triple', fn: 'tan', value: 0, top: 360, hard: true } as TaggedEq,
].filter((eq) => xSolutions(eq).length > 0);

/** One solution typed: the smallest or the largest. */
const multiEqAngle: Generator<MultiAngleParams> = {
  id: 'tid-multi-eq-angle',
  sample: (rng, difficulty) => {
    const eqs = ANGLE_EQS.map((e, i) => ({ e, i })).filter(({ e }) => difficulty > 1 || !e.hard);
    const eq = rng.pick(eqs).i;
    return {
      eq,
      largest: xSolutions(ANGLE_EQS[eq]).length > 1 && rng.chance(0.5),
      radians: difficulty > 1 && rng.chance(0.5),
      v: rng.int(0, MULTI_LETTERS.length - 1),
    };
  },
  render: (p): Slide => {
    const e = ANGLE_EQS[p.eq];
    const v = MULTI_LETTERS[p.v];
    const xs = xSolutions(e);
    const answer = p.largest ? xs[xs.length - 1] : xs[0];
    const range = p.radians ? `0 \\le ${v} < 2\\pi` : xRangeTex(e, v);
    const which = xs.length === 1 ? 'the solution' : `the ${p.largest ? 'largest' : 'smallest'} solution`;
    return {
      kind: 'expression',
      prompt: [prose(`Solve for $${range}$ and give ${which}${p.radians ? ', in radians' : ''}.`), display(eqTex(e, v))],
      lead: `${v} =`,
      keypad: p.radians ? PI_KEYS : NUMBER_KEYS,
      answer: angleAnswer(answer, p.radians),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const e = ANGLE_EQS[p.eq];
    const us = bracketSolutions(e);
    const xs = us.map((u) => xOf(e, u));
    const i = p.largest ? xs.length - 1 : 0;
    const backwards = e.kind === 'half' ? us[i] / 2 : (3 * us[i]) % 360;
    return angleOptions(xs[i], [us[i] % 360, backwards, xs[xs.length - 1 - i], (xs[i] + 180) % 360], p.radians);
  },
  solution: (p) => {
    const e = ANGLE_EQS[p.eq];
    const v = MULTI_LETTERS[p.v];
    const xs = xSolutions(e);
    const answer = p.largest ? xs[xs.length - 1] : xs[0];
    return [...multiSteps(e, v), { text: `The one asked for is $${v} = ${angleTex(answer, p.radians)}$.` }];
  },
};

/* ---------- Level 5: proving identities ---------- */

/**
 * A proof here starts from one side and rewrites it, one move at a time, until
 * it is the other side. Every generator in this level draws from four banks of
 * such proofs (short ones, fractions, squares and brackets, double angles) and
 * asks about them through a different widget: the moves one tap at a time
 * (`steps`), the lines in order (`order`), a missing line (`tiles`), the next
 * line or the first wrong one (`choice`), and what a move leans on (`flow`).
 *
 * A proof is held as fragments, as a `steps` line is, and every line of it is
 * the fragments joined, so one description serves every widget and
 * `trigIdentities.test.ts` can check each line against the one above.
 */

/** What a move leans on, for the flow that asks which. */
type Lean = 'pyth' | 'tan' | 'cot' | 'recip' | 'quot' | 'double' | 'algebra';

interface Move {
  /** Half-open range of the line this move rewrites. */
  span: [number, number];
  /** What that range becomes. */
  value: string;
  /** Wrong rewrites of the same range, spelled the way `value` is. */
  slips: string[];
  lean: Lean;
  /** What the move does, as an instruction with a capital. */
  say: string;
}

/** A missing line for `tiles`: whole tokens round literal operators, never a blank inside a fraction. */
interface Gap {
  hard: boolean;
  /** Where the gap sits among the lines. */
  at: number;
  /** True when the gap stands for line `at` itself; false when it is an extra line before it. */
  replace: boolean;
  template: string;
  answer: string[];
  spares: string[];
  unordered?: boolean;
}

interface Proof {
  hard: boolean;
  /** The side the proof starts from, as fragments. */
  start: string[];
  /** The side it ends on. */
  end: string;
  moves: Move[];
  gaps?: Gap[];
  /** A step that works on both sides at once, which a proof never takes. */
  across: string;
}

type ProofForm = (v: string) => Proof;

const frac = (top: string, bottom: string): string => `\\frac{${top}}{${bottom}}`;

/** Every function of one angle a proof here needs, written in the given letter. */
function fns(v: string) {
  return {
    s: `\\sin ${v}`,
    c: `\\cos ${v}`,
    t: `\\tan ${v}`,
    se: `\\sec ${v}`,
    cs: `\\operatorname{cosec} ${v}`,
    ct: `\\cot ${v}`,
    s2: `\\sin^2 ${v}`,
    c2: `\\cos^2 ${v}`,
    t2: `\\tan^2 ${v}`,
    se2: `\\sec^2 ${v}`,
    cs2: `\\operatorname{cosec}^2 ${v}`,
    ct2: `\\cot^2 ${v}`,
    s4: `\\sin^4 ${v}`,
    c4: `\\cos^4 ${v}`,
    S: `\\sin 2${v}`,
    C: `\\cos 2${v}`,
  };
}

/** Each line of a proof: the start, then the line after every move. */
function proofLines(p: Proof): string[] {
  let line = p.start;
  const lines = [line.join(' ')];
  for (const m of p.moves) {
    line = [...line.slice(0, m.span[0]), m.value, ...line.slice(m.span[1])];
    lines.push(line.join(' '));
  }
  return lines;
}

/** Line `i + 1` with move `i` swapped for one of its slips. */
function slippedLine(p: Proof, i: number, slip: string): string {
  let upTo = p.start;
  for (let j = 0; j <= i; j++) {
    const m = p.moves[j];
    upTo = [...upTo.slice(0, m.span[0]), j === i ? slip : m.value, ...upTo.slice(m.span[1])];
  }
  return upTo.join(' ');
}

const claimOf = (p: Proof): string => `${p.start.join(' ')} = ${p.end}`;

/** Lines as a column of working, each row after the first starting "=". */
const workingTex = (rows: string[]): string =>
  `\\begin{aligned} & ${rows[0]} ${rows
    .slice(1)
    .map((row) => `\\\\ &= ${row}`)
    .join(' ')} \\end{aligned}`;

/** The two lines of a solution every proof shares: what each move did, then the chain. */
function proofSolution(p: Proof): SolutionStep[] {
  return [
    { text: p.moves.map((m) => `${m.say}.`).join(' ') },
    { tex: proofLines(p).join(' = ') },
  ];
}

/* The short proofs of lesson 1: one identity, then a cancellation. */
const BASIC_PROOFS: ProofForm[] = [
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [f.t, f.c],
      end: f.s,
      moves: [
        { span: [0, 1], value: frac(f.s, f.c), slips: [frac(f.c, f.s), frac('1', f.c), `${f.s} ${f.c}`], lean: 'quot', say: `Write $${f.t}$ as $${frac(f.s, f.c)}$` },
        { span: [0, 2], value: f.s, slips: [f.c, f.t, `${f.s} ${f.c2}`], lean: 'algebra', say: `Cancel the $${f.c}$` },
      ],
      across: `Divide both sides by $${f.c}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [f.ct, f.s],
      end: f.c,
      moves: [
        { span: [0, 1], value: frac(f.c, f.s), slips: [frac(f.s, f.c), frac('1', f.s), `${f.c} ${f.s}`], lean: 'quot', say: `Write $${f.ct}$ as $${frac(f.c, f.s)}$` },
        { span: [0, 2], value: f.c, slips: [f.s, f.ct, `${f.c} ${f.s2}`], lean: 'algebra', say: `Cancel the $${f.s}$` },
      ],
      across: `Divide both sides by $${f.s}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [f.se2, '-', f.t2],
      end: '1',
      moves: [
        { span: [0, 1], value: `(1 + ${f.t2})`, slips: [`(1 - ${f.t2})`, `(${f.t2} - 1)`, `(1 + ${f.t})`], lean: 'tan', say: `Write $${f.se2}$ as $1 + ${f.t2}$` },
        { span: [0, 3], value: '1', slips: ['0', '-1', `1 + 2${f.t2}`], lean: 'algebra', say: `The $${f.t2}$ terms cancel` },
      ],
      across: `Add $${f.t2}$ to both sides.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [f.cs2, '-', f.ct2],
      end: '1',
      moves: [
        { span: [0, 1], value: `(1 + ${f.ct2})`, slips: [`(1 - ${f.ct2})`, `(${f.ct2} - 1)`, `(1 + ${f.ct})`], lean: 'cot', say: `Write $${f.cs2}$ as $1 + ${f.ct2}$` },
        { span: [0, 3], value: '1', slips: ['0', '-1', `1 + 2${f.ct2}`], lean: 'algebra', say: `The $${f.ct2}$ terms cancel` },
      ],
      across: `Add $${f.ct2}$ to both sides.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [f.s, f.cs],
      end: '1',
      moves: [
        { span: [1, 2], value: frac('1', f.s), slips: [frac('1', f.c), frac(f.c, f.s), f.s], lean: 'recip', say: `Write $${f.cs}$ as $${frac('1', f.s)}$` },
        { span: [0, 2], value: '1', slips: ['0', f.s, frac('1', f.s2)], lean: 'algebra', say: `Cancel the $${f.s}$` },
      ],
      across: `Divide both sides by $${f.s}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [`(1 - ${f.c2})`, f.cs2],
      end: '1',
      moves: [
        { span: [0, 1], value: f.s2, slips: [f.c2, `-${f.s2}`, f.t2], lean: 'pyth', say: `Use $${identity.pyth(v)}$ on the bracket` },
        { span: [1, 2], value: frac('1', f.s2), slips: [frac('1', f.c2), frac(f.c2, f.s2), f.s2], lean: 'recip', say: `Write $${f.cs2}$ as $${frac('1', f.s2)}$` },
        { span: [0, 2], value: '1', slips: ['0', '-1', f.s2], lean: 'algebra', say: `Cancel the $${f.s2}$` },
      ],
      across: `Divide both sides by $${f.cs2}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [f.t, f.cs],
      end: f.se,
      moves: [
        { span: [0, 1], value: frac(f.s, f.c), slips: [frac(f.c, f.s), frac('1', f.c), `${f.s} ${f.c}`], lean: 'quot', say: `Write $${f.t}$ as $${frac(f.s, f.c)}$` },
        { span: [1, 2], value: frac('1', f.s), slips: [frac('1', f.c), frac(f.c, f.s), f.s], lean: 'recip', say: `Write $${f.cs}$ as $${frac('1', f.s)}$` },
        { span: [0, 2], value: frac('1', f.c), slips: [frac('1', f.s), frac(f.s, f.c), f.c], lean: 'algebra', say: `Cancel the $${f.s}$` },
        { span: [0, 1], value: f.se, slips: [f.cs, f.c, f.t], lean: 'recip', say: `$${frac('1', f.c)}$ is $${f.se}$` },
      ],
      across: `Divide both sides by $${f.t}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [`(1 + ${f.t2})`, f.c2],
      end: '1',
      moves: [
        { span: [0, 1], value: f.se2, slips: [f.cs2, f.t2, f.se], lean: 'tan', say: `Use $${identity.tan(v)}$` },
        { span: [0, 1], value: frac('1', f.c2), slips: [frac('1', f.s2), frac('1', f.c), f.c2], lean: 'recip', say: `Write $${f.se2}$ as $${frac('1', f.c2)}$` },
        { span: [0, 2], value: '1', slips: ['0', '-1', f.c2], lean: 'algebra', say: `Cancel the $${f.c2}$` },
      ],
      across: `Divide both sides by $${f.c2}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [f.s2, f.se2],
      end: f.t2,
      moves: [
        { span: [1, 2], value: frac('1', f.c2), slips: [frac('1', f.s2), f.c2, frac('1', f.c)], lean: 'recip', say: `Write $${f.se2}$ as $${frac('1', f.c2)}$` },
        { span: [0, 2], value: frac(f.s2, f.c2), slips: [frac(f.c2, f.s2), frac(f.s2, f.c), `${f.s2} ${f.c2}`], lean: 'algebra', say: 'Write it as one fraction' },
        { span: [0, 1], value: f.t2, slips: [f.ct2, f.t, f.se2], lean: 'quot', say: `$${frac(f.s, f.c)}$ is $${f.t}$, so this is its square` },
      ],
      across: `Divide both sides by $${f.s2}$.`,
    };
  },
];

/* Lesson 2: fractions, over a common denominator first. */
const FRACTION_PROOFS: ProofForm[] = [
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [f.se, '-', f.c],
      end: `${f.s} ${f.t}`,
      moves: [
        { span: [0, 1], value: frac('1', f.c), slips: [frac('1', f.s), frac(f.s, f.c), f.c2], lean: 'recip', say: `Write $${f.se}$ as $${frac('1', f.c)}$` },
        { span: [0, 3], value: frac(`1 - ${f.c2}`, f.c), slips: [frac(`1 - ${f.c}`, f.c), frac(`1 - ${f.c2}`, f.c2), frac(`1 + ${f.c2}`, f.c)], lean: 'algebra', say: `Put both terms over $${f.c}$` },
        { span: [0, 1], value: frac(f.s2, f.c), slips: [frac(f.c2, f.c), frac(f.s, f.c), frac(`-${f.s2}`, f.c)], lean: 'pyth', say: `Use $${identity.pyth(v)}$ on the top` },
        { span: [0, 1], value: `${f.s} ${f.t}`, slips: [`${f.s} ${f.ct}`, `${f.c} ${f.t}`, f.t2], lean: 'quot', say: `Split off one $${f.s}$: $${frac(f.s, f.c)}$ is $${f.t}$` },
      ],
      gaps: [{ hard: false, at: 4, replace: false, template: '= {0} \\times {1}', answer: [f.s, frac(f.s, f.c)], spares: [f.c, frac(f.c, f.s), f.s2], unordered: true }],
      across: `Multiply both sides by $${f.c}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [f.cs, '-', f.s],
      end: `${f.c} ${f.ct}`,
      moves: [
        { span: [0, 1], value: frac('1', f.s), slips: [frac('1', f.c), frac(f.c, f.s), f.s2], lean: 'recip', say: `Write $${f.cs}$ as $${frac('1', f.s)}$` },
        { span: [0, 3], value: frac(`1 - ${f.s2}`, f.s), slips: [frac(`1 - ${f.s}`, f.s), frac(`1 - ${f.s2}`, f.s2), frac(`1 + ${f.s2}`, f.s)], lean: 'algebra', say: `Put both terms over $${f.s}$` },
        { span: [0, 1], value: frac(f.c2, f.s), slips: [frac(f.s2, f.s), frac(f.c, f.s), frac(`-${f.c2}`, f.s)], lean: 'pyth', say: `Use $${identity.pyth(v)}$ on the top` },
        { span: [0, 1], value: `${f.c} ${f.ct}`, slips: [`${f.c} ${f.t}`, `${f.s} ${f.ct}`, f.ct2], lean: 'quot', say: `Split off one $${f.c}$: $${frac(f.c, f.s)}$ is $${f.ct}$` },
      ],
      gaps: [{ hard: false, at: 4, replace: false, template: '= {0} \\times {1}', answer: [f.c, frac(f.c, f.s)], spares: [f.s, frac(f.s, f.c), f.c2], unordered: true }],
      across: `Multiply both sides by $${f.s}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const sc = `${f.s} ${f.c}`;
    return {
      hard: true,
      start: [f.t, '+', f.ct],
      end: `${f.se} ${f.cs}`,
      moves: [
        { span: [0, 1], value: frac(f.s, f.c), slips: [frac(f.c, f.s), frac('1', f.c), sc], lean: 'quot', say: `Write $${f.t}$ as $${frac(f.s, f.c)}$` },
        { span: [2, 3], value: frac(f.c, f.s), slips: [frac(f.s, f.c), frac('1', f.s), `${f.c} ${f.s}`], lean: 'quot', say: `Write $${f.ct}$ as $${frac(f.c, f.s)}$` },
        {
          span: [0, 3],
          value: frac(`${f.s2} + ${f.c2}`, sc),
          slips: [frac(`${f.s} + ${f.c}`, sc), frac(`${f.s2} + ${f.c2}`, `${f.s} + ${f.c}`), frac(`${f.s2} - ${f.c2}`, sc)],
          lean: 'algebra',
          say: `Put both over $${sc}$`,
        },
        { span: [0, 1], value: frac('1', sc), slips: [frac('2', sc), frac('1', `${f.s} + ${f.c}`), sc], lean: 'pyth', say: `The top is $${f.s2} + ${f.c2} = 1$` },
        { span: [0, 1], value: `${f.se} ${f.cs}`, slips: [sc, `${f.se} + ${f.cs}`, `${f.t} ${f.ct}`], lean: 'recip', say: `$${frac('1', f.c)}$ is $${f.se}$ and $${frac('1', f.s)}$ is $${f.cs}$` },
      ],
      gaps: [
        { hard: false, at: 2, replace: true, template: '= {0} + {1}', answer: [frac(f.s, f.c), frac(f.c, f.s)], spares: [frac('1', f.c), frac('1', f.s), sc], unordered: true },
        { hard: true, at: 5, replace: false, template: '= {0} \\times {1}', answer: [frac('1', f.s), frac('1', f.c)], spares: [f.s, f.c, sc], unordered: true },
      ],
      across: `Multiply both sides by $${sc}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const bottom = `(1 - ${f.s})(1 + ${f.s})`;
    return {
      hard: true,
      start: [frac('1', `1 - ${f.s}`), '+', frac('1', `1 + ${f.s}`)],
      end: `2${f.se2}`,
      moves: [
        {
          span: [0, 3],
          value: frac(`1 + ${f.s} + 1 - ${f.s}`, bottom),
          slips: [frac('2', `(1 - ${f.s}) + (1 + ${f.s})`), frac(`1 + ${f.s} - 1 + ${f.s}`, bottom), frac('1', bottom)],
          lean: 'algebra',
          say: `Put both over $${bottom}$`,
        },
        { span: [0, 1], value: frac('2', `1 - ${f.s2}`), slips: [frac('2', `1 + ${f.s2}`), frac(`2${f.s}`, `1 - ${f.s2}`), frac('2', `1 - ${f.s}`)], lean: 'algebra', say: 'Tidy the top and multiply out the bottom' },
        { span: [0, 1], value: frac('2', f.c2), slips: [frac('2', f.s2), frac('2', `-${f.c2}`), frac('1', f.c2)], lean: 'pyth', say: `Use $${identity.pyth(v)}$ on the bottom` },
        { span: [0, 1], value: `2${f.se2}`, slips: [`2${f.c2}`, f.se2, `2${f.cs2}`], lean: 'recip', say: `$${frac('1', f.c2)}$ is $${f.se2}$` },
      ],
      gaps: [{ hard: true, at: 4, replace: false, template: '= {0} \\times {1}', answer: ['2', frac('1', f.c2)], spares: [frac('1', f.s2), f.c2, frac('1', '2')], unordered: true }],
      across: `Multiply both sides by $${bottom}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const bottom = `(1 - ${f.c})(1 + ${f.c})`;
    return {
      hard: true,
      start: [frac('1', `1 - ${f.c}`), '+', frac('1', `1 + ${f.c}`)],
      end: `2${f.cs2}`,
      moves: [
        {
          span: [0, 3],
          value: frac(`1 + ${f.c} + 1 - ${f.c}`, bottom),
          slips: [frac('2', `(1 - ${f.c}) + (1 + ${f.c})`), frac(`1 + ${f.c} - 1 + ${f.c}`, bottom), frac('1', bottom)],
          lean: 'algebra',
          say: `Put both over $${bottom}$`,
        },
        { span: [0, 1], value: frac('2', `1 - ${f.c2}`), slips: [frac('2', `1 + ${f.c2}`), frac(`2${f.c}`, `1 - ${f.c2}`), frac('2', `1 - ${f.c}`)], lean: 'algebra', say: 'Tidy the top and multiply out the bottom' },
        { span: [0, 1], value: frac('2', f.s2), slips: [frac('2', f.c2), frac('2', `-${f.s2}`), frac('1', f.s2)], lean: 'pyth', say: `Use $${identity.pyth(v)}$ on the bottom` },
        { span: [0, 1], value: `2${f.cs2}`, slips: [`2${f.s2}`, f.cs2, `2${f.se2}`], lean: 'recip', say: `$${frac('1', f.s2)}$ is $${f.cs2}$` },
      ],
      gaps: [{ hard: true, at: 4, replace: false, template: '= {0} \\times {1}', answer: ['2', frac('1', f.s2)], spares: [frac('1', f.c2), f.s2, frac('1', '2')], unordered: true }],
      across: `Multiply both sides by $${bottom}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const sc = `${f.s} ${f.c}`;
    return {
      hard: false,
      start: [frac(`1 - ${f.s2}`, sc)],
      end: f.ct,
      moves: [
        { span: [0, 1], value: frac(f.c2, sc), slips: [frac(f.s2, sc), frac(`-${f.c2}`, sc), frac(f.c, sc)], lean: 'pyth', say: `Use $${identity.pyth(v)}$ on the top` },
        { span: [0, 1], value: frac(f.c, f.s), slips: [frac(f.s, f.c), frac(f.c2, f.s), frac('1', f.s)], lean: 'algebra', say: `Cancel a $${f.c}$` },
        { span: [0, 1], value: f.ct, slips: [f.t, f.cs, sc], lean: 'quot', say: `$${frac(f.c, f.s)}$ is $${f.ct}$` },
      ],
      across: `Multiply both sides by $${sc}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [f.se, '\\div', f.t],
      end: f.cs,
      moves: [
        { span: [0, 1], value: frac('1', f.c), slips: [frac('1', f.s), f.c, frac(f.s, f.c)], lean: 'recip', say: `Write $${f.se}$ as $${frac('1', f.c)}$` },
        { span: [2, 3], value: frac(f.s, f.c), slips: [frac(f.c, f.s), frac('1', f.c), f.s], lean: 'quot', say: `Write $${f.t}$ as $${frac(f.s, f.c)}$` },
        { span: [0, 3], value: frac('1', f.s), slips: [frac(f.s, f.c2), frac(f.c, f.s), frac('1', f.c2)], lean: 'algebra', say: 'Dividing by a fraction multiplies by it upside down, and the $\\cos$ cancels' },
        { span: [0, 1], value: f.cs, slips: [f.se, f.s, f.ct], lean: 'recip', say: `$${frac('1', f.s)}$ is $${f.cs}$` },
      ],
      gaps: [
        { hard: false, at: 2, replace: true, template: '= {0} \\div {1}', answer: [frac('1', f.c), frac(f.s, f.c)], spares: [frac(f.c, f.s), frac('1', f.s), f.s] },
        { hard: false, at: 3, replace: false, template: '= {0} \\times {1}', answer: [frac('1', f.c), frac(f.c, f.s)], spares: [frac(f.s, f.c), frac('1', f.s), f.c], unordered: true },
      ],
      across: `Multiply both sides by $${f.t}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [frac('1', f.c), '-', frac(f.s2, f.c)],
      end: f.c,
      moves: [
        { span: [0, 3], value: frac(`1 - ${f.s2}`, f.c), slips: [frac(`1 + ${f.s2}`, f.c), frac(`1 - ${f.s2}`, f.c2), frac(`1 - ${f.s}`, f.c)], lean: 'algebra', say: `They share $${f.c}$ underneath, so combine the tops` },
        { span: [0, 1], value: frac(f.c2, f.c), slips: [frac(f.s2, f.c), frac(`-${f.c2}`, f.c), frac('1', f.c)], lean: 'pyth', say: `Use $${identity.pyth(v)}$ on the top` },
        { span: [0, 1], value: f.c, slips: [f.c2, f.s, '1'], lean: 'algebra', say: `Cancel a $${f.c}$` },
      ],
      across: `Multiply both sides by $${f.c}$.`,
    };
  },
];

/* Lesson 3: squares and brackets, multiplied out before an identity. */
const SQUARE_PROOFS: ProofForm[] = [
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [`(1 - ${f.s})`, `(1 + ${f.s})`],
      end: f.c2,
      moves: [
        { span: [0, 2], value: `1 - ${f.s2}`, slips: [`1 + ${f.s2}`, `1 - ${f.s}`, `1 - 2${f.s} + ${f.s2}`], lean: 'algebra', say: 'Multiply out: the middle terms cancel' },
        { span: [0, 1], value: f.c2, slips: [f.s2, `-${f.c2}`, `1 + ${f.c2}`], lean: 'pyth', say: `Use $${identity.pyth(v)}$` },
      ],
      gaps: [{ hard: false, at: 1, replace: true, template: '= {0} - {1}', answer: ['1', f.s2], spares: [`2${f.s}`, f.c2, f.s] }],
      across: `Divide both sides by $1 + ${f.s}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [`(1 - ${f.c})`, `(1 + ${f.c})`],
      end: f.s2,
      moves: [
        { span: [0, 2], value: `1 - ${f.c2}`, slips: [`1 + ${f.c2}`, `1 - ${f.c}`, `1 - 2${f.c} + ${f.c2}`], lean: 'algebra', say: 'Multiply out: the middle terms cancel' },
        { span: [0, 1], value: f.s2, slips: [f.c2, `-${f.s2}`, `1 + ${f.s2}`], lean: 'pyth', say: `Use $${identity.pyth(v)}$` },
      ],
      gaps: [{ hard: false, at: 1, replace: true, template: '= {0} - {1}', answer: ['1', f.c2], spares: [`2${f.c}`, f.s2, f.c] }],
      across: `Divide both sides by $1 + ${f.c}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [`(${f.se} - 1)`, `(${f.se} + 1)`],
      end: f.t2,
      moves: [
        { span: [0, 2], value: `${f.se2} - 1`, slips: [`${f.se2} + 1`, `${f.se} - 1`, `${f.se2} - 2${f.se} + 1`], lean: 'algebra', say: 'Multiply out: the middle terms cancel' },
        { span: [0, 1], value: f.t2, slips: [f.ct2, `1 + ${f.t2}`, `-${f.t2}`], lean: 'tan', say: `Rearrange $${identity.tan(v)}$` },
      ],
      gaps: [{ hard: false, at: 1, replace: true, template: '= {0} - {1}', answer: [f.se2, '1'], spares: [`2${f.se}`, f.t2, f.se] }],
      across: `Divide both sides by $${f.se} + 1$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [`(${f.cs} - 1)`, `(${f.cs} + 1)`],
      end: f.ct2,
      moves: [
        { span: [0, 2], value: `${f.cs2} - 1`, slips: [`${f.cs2} + 1`, `${f.cs} - 1`, `${f.cs2} - 2${f.cs} + 1`], lean: 'algebra', say: 'Multiply out: the middle terms cancel' },
        { span: [0, 1], value: f.ct2, slips: [f.t2, `1 + ${f.ct2}`, `-${f.ct2}`], lean: 'cot', say: `Rearrange $${identity.cot(v)}$` },
      ],
      gaps: [{ hard: false, at: 1, replace: true, template: '= {0} - {1}', answer: [f.cs2, '1'], spares: [`2${f.cs}`, f.ct2, f.cs] }],
      across: `Divide both sides by $${f.cs} + 1$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const sc = `2${f.s} ${f.c}`;
    return {
      hard: true,
      start: [`(${f.s} + ${f.c})^2`],
      end: `1 + ${sc}`,
      moves: [
        {
          span: [0, 1],
          value: `${f.s2} + ${sc} + ${f.c2}`,
          slips: [`${f.s2} + ${f.c2}`, `${f.s2} + ${f.s} ${f.c} + ${f.c2}`, `${f.s2} - ${sc} + ${f.c2}`],
          lean: 'algebra',
          say: 'Multiply out the square',
        },
        { span: [0, 1], value: `1 + ${sc}`, slips: [`2 + ${sc}`, `1 + ${f.s} ${f.c}`, `1 - ${sc}`], lean: 'pyth', say: `Use $${identity.pyth(v)}$` },
      ],
      gaps: [{ hard: true, at: 1, replace: true, template: '= {0} + {1} + {2}', answer: [f.s2, sc, f.c2], spares: [`${f.s} ${f.c}`, `2${f.s2}`, `2${f.c}`], unordered: true }],
      across: `Take the square root of both sides.`,
    };
  },
  (v) => {
    const f = fns(v);
    const sc = `2${f.s} ${f.c}`;
    return {
      hard: true,
      start: [`(${f.s} - ${f.c})^2`],
      end: `1 - ${sc}`,
      moves: [
        {
          span: [0, 1],
          value: `${f.s2} - ${sc} + ${f.c2}`,
          slips: [`${f.s2} - ${f.c2}`, `${f.s2} - ${f.s} ${f.c} + ${f.c2}`, `${f.s2} + ${sc} + ${f.c2}`],
          lean: 'algebra',
          say: 'Multiply out the square',
        },
        { span: [0, 1], value: `1 - ${sc}`, slips: [`2 - ${sc}`, `1 - ${f.s} ${f.c}`, `1 + ${sc}`], lean: 'pyth', say: `Use $${identity.pyth(v)}$` },
      ],
      across: `Take the square root of both sides.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [`(1 + ${f.t2})`, `(1 - ${f.s2})`],
      end: '1',
      moves: [
        { span: [0, 1], value: f.se2, slips: [f.cs2, f.t2, f.se], lean: 'tan', say: `Use $${identity.tan(v)}$` },
        { span: [1, 2], value: f.c2, slips: [f.s2, `-${f.c2}`, `(1 + ${f.c2})`], lean: 'pyth', say: `Use $${identity.pyth(v)}$` },
        { span: [0, 2], value: '1', slips: ['0', '-1', f.c2], lean: 'recip', say: `$${f.se2}$ is $${frac('1', f.c2)}$, so the two cancel` },
      ],
      across: `Divide both sides by $1 + ${f.t2}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [`(${f.cs} - ${f.ct})`, `(${f.cs} + ${f.ct})`],
      end: '1',
      moves: [
        { span: [0, 2], value: `${f.cs2} - ${f.ct2}`, slips: [`${f.cs2} + ${f.ct2}`, `${f.cs} - ${f.ct}`, `${f.cs2} - 2${f.cs} ${f.ct} - ${f.ct2}`], lean: 'algebra', say: 'Multiply out: the middle terms cancel' },
        { span: [0, 1], value: '1', slips: ['0', '-1', `1 + 2${f.ct2}`], lean: 'cot', say: `Rearrange $${identity.cot(v)}$` },
      ],
      gaps: [{ hard: true, at: 1, replace: true, template: '= {0} - {1}', answer: [f.cs2, f.ct2], spares: [f.cs, f.ct, `2${f.cs} ${f.ct}`] }],
      across: `Divide both sides by $${f.cs} + ${f.ct}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [`(${f.se} - ${f.t})`, `(${f.se} + ${f.t})`],
      end: '1',
      moves: [
        { span: [0, 2], value: `${f.se2} - ${f.t2}`, slips: [`${f.se2} + ${f.t2}`, `${f.se} - ${f.t}`, `${f.se2} - 2${f.se} ${f.t} - ${f.t2}`], lean: 'algebra', say: 'Multiply out: the middle terms cancel' },
        { span: [0, 1], value: '1', slips: ['0', '-1', `1 + 2${f.t2}`], lean: 'tan', say: `Rearrange $${identity.tan(v)}$` },
      ],
      gaps: [{ hard: true, at: 1, replace: true, template: '= {0} - {1}', answer: [f.se2, f.t2], spares: [f.se, f.t, `2${f.se} ${f.t}`] }],
      across: `Divide both sides by $${f.se} + ${f.t}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [f.c4, '-', f.s4],
      end: `${f.c2} - ${f.s2}`,
      moves: [
        {
          span: [0, 3],
          value: `(${f.c2} - ${f.s2})(${f.c2} + ${f.s2})`,
          slips: [`(${f.c2} - ${f.s2})^2`, `(${f.c} - ${f.s})^2`, `(${f.c2} + ${f.s2})^2`],
          lean: 'algebra',
          say: 'Factorise: a difference of two squares',
        },
        { span: [0, 1], value: `${f.c2} - ${f.s2}`, slips: [`${f.c2} + ${f.s2}`, '1', `${f.s2} - ${f.c2}`], lean: 'pyth', say: `The second bracket is $${f.c2} + ${f.s2} = 1$` },
      ],
      across: `Divide both sides by $${f.c2} + ${f.s2}$.`,
    };
  },
];

/** A side of a claim at an angle, piece by piece, for the tree that evaluates both sides. */
interface Piece {
  tex: string;
  at: (x: number) => number;
}

interface SidesTree {
  left: Piece[];
  right: Piece[];
  /** Each side from its pieces' values. */
  l: (vals: number[]) => number;
  r: (vals: number[]) => number;
}

interface DoubleProof extends Proof {
  tree?: SidesTree;
}

const sin = Math.sin;
const cos = Math.cos;

/** The pieces a double-angle claim is evaluated through, in the given letter. */
function pieces(v: string) {
  const f = fns(v);
  return {
    s: { tex: f.s, at: (x: number) => sin(x) },
    c: { tex: f.c, at: (x: number) => cos(x) },
    t: { tex: f.t, at: (x: number) => sin(x) / cos(x) },
    S: { tex: f.S, at: (x: number) => sin(2 * x) },
    onePlusC: { tex: `1 + ${f.C}`, at: (x: number) => 1 + cos(2 * x) },
    oneMinusC: { tex: `1 - ${f.C}`, at: (x: number) => 1 - cos(2 * x) },
  };
}

const ratio = ([a, b]: number[]): number => a / b;

/* Lesson 4: double angles, swapped for single ones. */
const DOUBLE_PROOFS: ((v: string) => DoubleProof)[] = [
  (v) => {
    const f = fns(v);
    const P = pieces(v);
    const sc2 = `2${f.s} ${f.c}`;
    return {
      hard: false,
      start: [frac(f.S, `1 + ${f.C}`)],
      end: f.t,
      moves: [
        { span: [0, 1], value: frac(sc2, `1 + ${f.C}`), slips: [frac(`2${f.s}`, `1 + ${f.C}`), frac(`${f.s} ${f.c}`, `1 + ${f.C}`), frac(`${f.c2} - ${f.s2}`, `1 + ${f.C}`)], lean: 'double', say: `Use $${f.S} = ${sc2}$ on the top` },
        { span: [0, 1], value: frac(sc2, `2${f.c2}`), slips: [frac(sc2, `2${f.s2}`), frac(sc2, `1 + 2${f.c2}`), frac(sc2, f.c2)], lean: 'double', say: `Use $${f.C} = 2${f.c2} - 1$, so the $1$s cancel` },
        { span: [0, 1], value: frac(f.s, f.c), slips: [frac(f.c, f.s), frac(`2${f.s}`, f.c), frac(f.s, f.c2)], lean: 'algebra', say: `Cancel $2${f.c}$` },
        { span: [0, 1], value: f.t, slips: [f.ct, `2${f.t}`, f.se], lean: 'quot', say: `$${frac(f.s, f.c)}$ is $${f.t}$` },
      ],
      tree: { left: [P.S, P.onePlusC], right: [P.s, P.c], l: ratio, r: ratio },
      across: `Multiply both sides by $1 + ${f.C}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const P = pieces(v);
    const sc2 = `2${f.s} ${f.c}`;
    return {
      hard: false,
      start: [frac(`1 - ${f.C}`, f.S)],
      end: f.t,
      moves: [
        { span: [0, 1], value: frac(`2${f.s2}`, f.S), slips: [frac(`2${f.c2}`, f.S), frac(f.s2, f.S), frac(`-2${f.s2}`, f.S)], lean: 'double', say: `Use $${f.C} = 1 - 2${f.s2}$, so the $1$s cancel` },
        { span: [0, 1], value: frac(`2${f.s2}`, sc2), slips: [frac(`2${f.s2}`, `2${f.s}`), frac(`2${f.s2}`, `${f.s} ${f.c}`), frac(`2${f.s2}`, `${f.c2} - ${f.s2}`)], lean: 'double', say: `Use $${f.S} = ${sc2}$ on the bottom` },
        { span: [0, 1], value: frac(f.s, f.c), slips: [frac(f.c, f.s), frac(f.s2, f.c), frac(`2${f.s}`, f.c)], lean: 'algebra', say: `Cancel $2${f.s}$` },
        { span: [0, 1], value: f.t, slips: [f.ct, `2${f.t}`, f.t2], lean: 'quot', say: `$${frac(f.s, f.c)}$ is $${f.t}$` },
      ],
      tree: { left: [P.oneMinusC, P.S], right: [P.s, P.c], l: ratio, r: ratio },
      across: `Multiply both sides by $${f.S}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const P = pieces(v);
    const sc2 = `2${f.s} ${f.c}`;
    return {
      hard: true,
      start: [frac(f.S, `1 - ${f.C}`)],
      end: f.ct,
      moves: [
        { span: [0, 1], value: frac(sc2, `1 - ${f.C}`), slips: [frac(`2${f.c}`, `1 - ${f.C}`), frac(`${f.s} ${f.c}`, `1 - ${f.C}`), frac(`${f.c2} - ${f.s2}`, `1 - ${f.C}`)], lean: 'double', say: `Use $${f.S} = ${sc2}$ on the top` },
        { span: [0, 1], value: frac(sc2, `2${f.s2}`), slips: [frac(sc2, `2${f.c2}`), frac(sc2, `-2${f.s2}`), frac(sc2, `1 - 2${f.s2}`)], lean: 'double', say: `Use $${f.C} = 1 - 2${f.s2}$, so the $1$s cancel` },
        { span: [0, 1], value: frac(f.c, f.s), slips: [frac(f.s, f.c), frac(`2${f.c}`, f.s), frac(f.c, f.s2)], lean: 'algebra', say: `Cancel $2${f.s}$` },
        { span: [0, 1], value: f.ct, slips: [f.t, `2${f.ct}`, f.cs], lean: 'quot', say: `$${frac(f.c, f.s)}$ is $${f.ct}$` },
      ],
      tree: { left: [P.S, P.oneMinusC], right: [P.c, P.s], l: ratio, r: ratio },
      across: `Multiply both sides by $1 - ${f.C}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const P = pieces(v);
    const sc2 = `2${f.s} ${f.c}`;
    return {
      hard: true,
      start: [frac(`1 + ${f.C}`, f.S)],
      end: f.ct,
      moves: [
        { span: [0, 1], value: frac(`2${f.c2}`, f.S), slips: [frac(`2${f.s2}`, f.S), frac(f.c2, f.S), frac(`-2${f.c2}`, f.S)], lean: 'double', say: `Use $${f.C} = 2${f.c2} - 1$, so the $1$s cancel` },
        { span: [0, 1], value: frac(`2${f.c2}`, sc2), slips: [frac(`2${f.c2}`, `2${f.c}`), frac(`2${f.c2}`, `${f.s} ${f.c}`), frac(`2${f.c2}`, `${f.c2} - ${f.s2}`)], lean: 'double', say: `Use $${f.S} = ${sc2}$ on the bottom` },
        { span: [0, 1], value: frac(f.c, f.s), slips: [frac(f.s, f.c), frac(f.c2, f.s), frac(`2${f.c}`, f.s)], lean: 'algebra', say: `Cancel $2${f.c}$` },
        { span: [0, 1], value: f.ct, slips: [f.t, `2${f.ct}`, f.ct2], lean: 'quot', say: `$${frac(f.c, f.s)}$ is $${f.ct}$` },
      ],
      tree: { left: [P.onePlusC, P.S], right: [P.c, P.s], l: ratio, r: ratio },
      across: `Multiply both sides by $${f.S}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const P = pieces(v);
    const sc2 = `2${f.s} ${f.c}`;
    return {
      hard: false,
      start: [frac(f.S, f.s)],
      end: `2${f.c}`,
      moves: [
        { span: [0, 1], value: frac(sc2, f.s), slips: [frac(`2${f.s}`, f.s), frac(`${f.s} ${f.c}`, f.s), frac(`2${f.c2}`, f.s)], lean: 'double', say: `Use $${f.S} = ${sc2}$` },
        { span: [0, 1], value: `2${f.c}`, slips: [f.c, `2${f.s}`, `2${f.c2}`], lean: 'algebra', say: `Cancel the $${f.s}$` },
      ],
      tree: { left: [P.S, P.s], right: [P.c], l: ratio, r: ([a]) => 2 * a },
      across: `Multiply both sides by $${f.s}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const P = pieces(v);
    const sc2 = `2${f.s} ${f.c}`;
    return {
      hard: false,
      start: [frac(f.S, f.c)],
      end: `2${f.s}`,
      moves: [
        { span: [0, 1], value: frac(sc2, f.c), slips: [frac(`2${f.c}`, f.c), frac(`${f.s} ${f.c}`, f.c), frac(`2${f.s2}`, f.c)], lean: 'double', say: `Use $${f.S} = ${sc2}$` },
        { span: [0, 1], value: `2${f.s}`, slips: [f.s, `2${f.c}`, `2${f.s2}`], lean: 'algebra', say: `Cancel the $${f.c}$` },
      ],
      tree: { left: [P.S, P.c], right: [P.s], l: ratio, r: ([a]) => 2 * a },
      across: `Multiply both sides by $${f.c}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const P = pieces(v);
    return {
      hard: true,
      start: [frac(`1 - ${f.C}`, `1 + ${f.C}`)],
      end: f.t2,
      moves: [
        { span: [0, 1], value: frac(`2${f.s2}`, `1 + ${f.C}`), slips: [frac(`2${f.c2}`, `1 + ${f.C}`), frac(f.s2, `1 + ${f.C}`), frac(`-2${f.s2}`, `1 + ${f.C}`)], lean: 'double', say: `Use $${f.C} = 1 - 2${f.s2}$ on the top` },
        { span: [0, 1], value: frac(`2${f.s2}`, `2${f.c2}`), slips: [frac(`2${f.s2}`, f.c2), frac(`2${f.s2}`, `-2${f.c2}`), frac(`2${f.s2}`, `1 + 2${f.c2}`)], lean: 'double', say: `Use $${f.C} = 2${f.c2} - 1$ on the bottom` },
        { span: [0, 1], value: f.t2, slips: [f.ct2, `2${f.t2}`, f.t], lean: 'quot', say: `Cancel the $2$s: $${frac(f.s2, f.c2)}$ is $${f.t2}$` },
      ],
      tree: { left: [P.oneMinusC, P.onePlusC], right: [P.t], l: ratio, r: ([a]) => a * a },
      across: `Multiply both sides by $1 + ${f.C}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const sc2 = `2${f.s} ${f.c}`;
    return {
      hard: true,
      start: [`(${f.s} + ${f.c})^2`],
      end: `1 + ${f.S}`,
      moves: [
        { span: [0, 1], value: `${f.s2} + ${sc2} + ${f.c2}`, slips: [`${f.s2} + ${f.c2}`, `${f.s2} + ${f.s} ${f.c} + ${f.c2}`, `${f.s2} - ${sc2} + ${f.c2}`], lean: 'algebra', say: 'Multiply out the square' },
        { span: [0, 1], value: `1 + ${sc2}`, slips: [`2 + ${sc2}`, `1 + ${f.s} ${f.c}`, `1 - ${sc2}`], lean: 'pyth', say: `Use $${identity.pyth(v)}$` },
        { span: [0, 1], value: `1 + ${f.S}`, slips: [`1 + ${f.C}`, `1 + 2${f.S}`, `2${f.S}`], lean: 'double', say: `$${sc2}$ is $${f.S}$` },
      ],
      across: `Take the square root of both sides.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: true,
      start: [f.c4, '-', f.s4],
      end: f.C,
      moves: [
        {
          span: [0, 3],
          value: `(${f.c2} - ${f.s2})(${f.c2} + ${f.s2})`,
          slips: [`(${f.c2} - ${f.s2})^2`, `(${f.c} - ${f.s})^2`, `(${f.c2} + ${f.s2})^2`],
          lean: 'algebra',
          say: 'Factorise: a difference of two squares',
        },
        { span: [0, 1], value: `${f.c2} - ${f.s2}`, slips: [`${f.c2} + ${f.s2}`, '1', `${f.s2} - ${f.c2}`], lean: 'pyth', say: `The second bracket is $${f.c2} + ${f.s2} = 1$` },
        { span: [0, 1], value: f.C, slips: [f.S, `-${f.C}`, `1 - ${f.C}`], lean: 'double', say: `$${f.c2} - ${f.s2}$ is $${f.C}$` },
      ],
      across: `Divide both sides by $${f.c2} + ${f.s2}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    const P = pieces(v);
    const sc2 = `2${f.s} ${f.c}`;
    return {
      hard: false,
      start: [f.t, f.S],
      end: `2${f.s2}`,
      moves: [
        { span: [0, 1], value: frac(f.s, f.c), slips: [frac(f.c, f.s), frac('1', f.c), `${f.s} ${f.c}`], lean: 'quot', say: `Write $${f.t}$ as $${frac(f.s, f.c)}$` },
        { span: [1, 2], value: sc2, slips: [`2${f.s}`, `${f.s} ${f.c}`, `(${f.c2} - ${f.s2})`], lean: 'double', say: `Use $${f.S} = ${sc2}$` },
        { span: [0, 2], value: `2${f.s2}`, slips: [`2${f.c2}`, f.s2, `2${f.s}`], lean: 'algebra', say: `Cancel the $${f.c}$` },
      ],
      tree: { left: [P.t, P.S], right: [P.s], l: ([a, b]) => a * b, r: ([a]) => 2 * a * a },
      across: `Divide both sides by $${f.t}$.`,
    };
  },
  (v) => {
    const f = fns(v);
    return {
      hard: false,
      start: [f.C, '+', `2${f.s2}`],
      end: '1',
      moves: [
        { span: [0, 1], value: `(1 - 2${f.s2})`, slips: [`(2${f.s2} - 1)`, `(1 - ${f.s2})`, `(2${f.c2} - 2)`], lean: 'double', say: `Use the form $${f.C} = 1 - 2${f.s2}$` },
        { span: [0, 3], value: '1', slips: ['0', '-1', `1 - 4${f.s2}`], lean: 'algebra', say: `The $${f.s2}$ terms cancel` },
      ],
      across: `Take $2${f.s2}$ from both sides.`,
    };
  },
  (v) => {
    const f = fns(v);
    const sum = `${f.c} + ${f.s}`;
    return {
      hard: true,
      start: [frac(f.C, sum)],
      end: `${f.c} - ${f.s}`,
      moves: [
        { span: [0, 1], value: frac(`${f.c2} - ${f.s2}`, sum), slips: [frac(`${f.s2} - ${f.c2}`, sum), frac(`${f.c} - ${f.s}`, sum), frac(`1 - 2${f.c2}`, sum)], lean: 'double', say: `Use $${f.C} = ${f.c2} - ${f.s2}$` },
        {
          span: [0, 1],
          value: frac(`(${f.c} - ${f.s})(${sum})`, sum),
          slips: [frac(`(${f.c} - ${f.s})^2`, sum), frac(`(${sum})^2`, sum), frac(`(${f.s} - ${f.c})(${sum})`, sum)],
          lean: 'algebra',
          say: 'Factorise the top: a difference of two squares',
        },
        { span: [0, 1], value: `${f.c} - ${f.s}`, slips: [sum, `${f.s} - ${f.c}`, `(${f.c} - ${f.s})^2`], lean: 'algebra', say: `Cancel $${sum}$` },
      ],
      across: `Multiply both sides by $${sum}$.`,
    };
  },
];

const PROOF_VARS = VARS;

/** The forms a difficulty may draw, by index. */
const formsFor = (forms: ((v: string) => Proof)[], difficulty: number): number[] =>
  forms.map((make, i) => ({ hard: make('x').hard, i })).filter(({ hard }) => difficulty > 1 || !hard).map(({ i }) => i);

interface ProofParams {
  form: number;
  v: number;
  phrasing: number;
}

const STEPS_PROMPTS = [
  'Start from the left side and rewrite it one piece at a time until it is the right side.',
  'Work from the left side to the right, one identity or one piece of algebra at a time.',
  'Show the left side equals the right: tap each piece as it is rewritten.',
];

/** Prove an identity move by move, from the left side to the right. */
function proofSteps(id: string, forms: ((v: string) => Proof)[]): Generator<ProofParams> {
  return {
    id,
    sample: (rng, difficulty) => ({
      form: rng.pick(formsFor(forms, difficulty)),
      v: rng.int(0, PROOF_VARS.length - 1),
      phrasing: rng.int(0, STEPS_PROMPTS.length - 1),
    }),
    render: ({ form, v, phrasing }): Slide => {
      const p = forms[form](PROOF_VARS[v]);
      return {
        kind: 'steps',
        prompt: [prose(`Prove $${claimOf(p)}$.`), prose(STEPS_PROMPTS[phrasing])],
        start: p.start,
        reductions: p.moves.map((m) => ({ span: m.span, value: m.value, bank: scatter([m.value, ...m.slips.slice(0, 3)]) })),
      };
    },
    solution: ({ form, v }) => proofSolution(forms[form](PROOF_VARS[v])),
  };
}

/** Why a step is not part of a proof, for the worked solution. */
interface OrderExtra {
  text: string;
  why: string;
}

function proofOrderParts(p: Proof, v: string): { steps: string[]; pool: OrderExtra[] } {
  const lines = proofLines(p);
  const steps = [
    `Start from the left side, $${lines[0]}$.`,
    ...p.moves.map((m, i) => `${m.say}: $= ${lines[i + 1]}$.`),
    'That is the right side, so the identity is proved.',
  ];
  const last = p.moves.length - 1;
  const pool: OrderExtra[] = [
    {
      text: `${p.moves[0].say}: $= ${slippedLine(p, 0, p.moves[0].slips[0])}$.`,
      why: `That line does not equal the one above it: the move gives $${p.moves[0].value}$, not $${p.moves[0].slips[0]}$.`,
    },
    {
      text: `${p.moves[last].say}: $= ${slippedLine(p, last, p.moves[last].slips[0])}$.`,
      why: `That line does not equal the one above it: the move gives $${p.moves[last].value}$, not $${p.moves[last].slips[0]}$.`,
    },
    { text: p.across, why: 'That works on both sides at once, which assumes the very thing being proved. A proof rewrites one side only.' },
    {
      text: `Check $${v} = ${deg(45)}$: both sides agree there, so the identity holds.`,
      why: 'One angle is not a proof. Agreeing at one angle says nothing about the others.',
    },
  ];
  return { steps, pool };
}

interface ProofOrderParams {
  form: number;
  v: number;
  picks: number[];
}

/** Put the lines of a proof in order, with one or two lines that do not belong. */
function proofOrder(id: string, forms: ((v: string) => Proof)[]): Generator<ProofOrderParams> {
  const parts = ({ form, v }: ProofOrderParams) => {
    const p = forms[form](PROOF_VARS[v]);
    return { p, ...proofOrderParts(p, PROOF_VARS[v]) };
  };
  return {
    id,
    sample: (rng, difficulty) => ({
      form: rng.pick(formsFor(forms, difficulty)),
      v: rng.int(0, PROOF_VARS.length - 1),
      picks: rng.sample([0, 1, 2, 3], difficulty > 1 ? 2 : 1).sort((a, b) => a - b),
    }),
    render: (params): Slide => {
      const { p, steps, pool } = parts(params);
      const { steps: bank, answer } = orderBank(
        steps,
        params.picks.map((i) => pool[i].text),
      );
      return {
        kind: 'order',
        prompt: [
          prose(`Prove $${claimOf(p)}$.`),
          prose(`Tap the steps of the proof in order. ${params.picks.length === 1 ? 'One step does not belong.' : 'Two steps do not belong.'}`),
        ],
        steps: bank,
        answer,
      };
    },
    solution: (params) => {
      const { steps, pool } = parts(params);
      return [
        { text: 'Each line rewrites one piece of the line above, so the proof runs:' },
        ...steps.map((text, i) => ({ text: `${i + 1}. ${text}` })),
        ...params.picks.map((i) => ({ text: `Not part of it: “${pool[i].text}” ${pool[i].why}` })),
      ];
    },
  };
}

interface NextLineParams {
  form: number;
  move: number;
  v: number;
  phrasing: number;
}

const NEXT_PROMPTS = ['Which line comes next?', 'What is the next line of the proof?'];

/** The working so far, then four candidates for the next line. */
function proofNextChoice(id: string, forms: ((v: string) => Proof)[]): Generator<NextLineParams> {
  return {
    id,
    sample: (rng, difficulty) => {
      const form = rng.pick(formsFor(forms, difficulty));
      return {
        form,
        move: rng.int(0, forms[form]('x').moves.length - 1),
        v: rng.int(0, PROOF_VARS.length - 1),
        phrasing: rng.int(0, NEXT_PROMPTS.length - 1),
      };
    },
    render: (params): Slide => {
      const { form, move, v, phrasing } = params;
      const p = forms[form](PROOF_VARS[v]);
      const lines = proofLines(p);
      const m = p.moves[move];
      return choiceSlide(
        [prose(`Proving $${claimOf(p)}$, the working so far is:`), display(workingTex(lines.slice(0, move + 1))), prose(NEXT_PROMPTS[phrasing])],
        `= ${lines[move + 1]}`,
        m.slips.map((slip) => `= ${slippedLine(p, move, slip)}`),
        saltOf(params),
      );
    },
    solution: ({ form, move, v }) => {
      const p = forms[form](PROOF_VARS[v]);
      const lines = proofLines(p);
      return [{ text: `${p.moves[move].say}.` }, { tex: `${lines[move]} = ${lines[move + 1]}` }];
    },
  };
}

interface GapParams {
  gap: number;
  v: number;
  phrasing: number;
}

const GAP_PROMPTS = ['Fill the missing line of the proof.', 'One line of this proof is missing. Build it from the tiles.', 'Complete the proof: what goes in the gap?'];

/** Every gap a set of forms offers, as [form, gap] pairs. */
const gapsOf = (forms: ((v: string) => Proof)[], difficulty: number): [number, number][] =>
  forms.flatMap((make, form) =>
    (make('x').gaps ?? []).map((g, gap): [number, number, boolean] => [form, gap, g.hard]),
  ).filter(([, , hard]) => difficulty > 1 || !hard).map(([form, gap]) => [form, gap]);

/** A proof with one line missing, built from tiles. */
function proofTiles(id: string, forms: ((v: string) => Proof)[]): Generator<GapParams> {
  const all = gapsOf(forms, 2);
  const parts = ({ gap, v }: GapParams) => {
    const [form, index] = all[gap];
    const p = forms[form](PROOF_VARS[v]);
    const g = (p.gaps as Gap[])[index];
    const lines = proofLines(p);
    const shown = [...lines.slice(0, g.at), '\\;?', ...lines.slice(g.replace ? g.at + 1 : g.at)];
    return { p, g, lines, shown };
  };
  return {
    id,
    sample: (rng, difficulty) => {
      const offered = gapsOf(forms, difficulty);
      const [form, index] = rng.pick(offered);
      return {
        gap: all.findIndex(([f, i]) => f === form && i === index),
        v: rng.int(0, PROOF_VARS.length - 1),
        phrasing: rng.int(0, GAP_PROMPTS.length - 1),
      };
    },
    render: (params): Slide => {
      const { p, g, shown } = parts(params);
      return {
        kind: 'tiles',
        prompt: [prose(`Proving $${claimOf(p)}$:`), display(workingTex(shown)), prose(GAP_PROMPTS[params.phrasing])],
        template: g.template,
        bank: bankOf(g.answer, g.spares, 3),
        answer: g.answer,
        ...(g.unordered ? { unordered: true } : {}),
      };
    },
    solution: (params) => {
      const { g, lines } = parts(params);
      const filled = g.answer.reduce((tex, token, i) => tex.replace(`{${i}}`, token), g.template).replace(/^= /, '');
      const full = [...lines.slice(0, g.at), filled, ...lines.slice(g.replace ? g.at + 1 : g.at)];
      return [{ text: `The missing line is $${filled}$, equal to the line above it.` }, { tex: full.join(' = ') }];
    },
  };
}

const basicProofSteps = proofSteps('tid-proof-basic-steps', BASIC_PROOFS);
const basicProofOrder = proofOrder('tid-proof-basic-order', BASIC_PROOFS);
const basicProofChoice = proofNextChoice('tid-proof-basic-choice', BASIC_PROOFS);
const fractionProofSteps = proofSteps('tid-proof-fraction-steps', FRACTION_PROOFS);
const fractionProofTiles = proofTiles('tid-proof-fraction-tiles', FRACTION_PROOFS);
const fractionProofOrder = proofOrder('tid-proof-fraction-order', FRACTION_PROOFS);
const fractionProofChoice = proofNextChoice('tid-proof-fraction-choice', FRACTION_PROOFS);
const squareProofSteps = proofSteps('tid-proof-square-steps', SQUARE_PROOFS);
const squareProofTiles = proofTiles('tid-proof-square-tiles', SQUARE_PROOFS);
const squareProofOrder = proofOrder('tid-proof-square-order', SQUARE_PROOFS);
const doubleProofSteps = proofSteps('tid-proof-double-steps', DOUBLE_PROOFS);
const doubleProofOrder = proofOrder('tid-proof-double-order', DOUBLE_PROOFS);
const doubleProofChoice = proofNextChoice('tid-proof-double-choice', DOUBLE_PROOFS);

interface StartParams {
  form: number;
  v: number;
  flip: boolean;
}

/** Which side a proof starts from, and what its first line is. */
const proofStartFlow: Generator<StartParams> = {
  id: 'tid-proof-start-flow',
  sample: (rng, difficulty) => ({
    form: rng.pick(formsFor(BASIC_PROOFS, difficulty)),
    v: rng.int(0, PROOF_VARS.length - 1),
    flip: rng.int(0, 1) === 1,
  }),
  render: ({ form, v, flip }): Slide => {
    const p = BASIC_PROOFS[form](PROOF_VARS[v]);
    const lines = proofLines(p);
    const busy = lines[0];
    const [left, right] = flip ? [p.end, busy] : [busy, p.end];
    const sides = [`The left side, $${left}$`, `The right side, $${right}$`];
    const first = `$= ${lines[1]}$`;
    const offered = scatter([first, ...p.moves[0].slips.slice(0, 2).map((slip) => `$= ${slippedLine(p, 0, slip)}$`), p.across]);
    return {
      kind: 'flow',
      prompt: [prose('Prove this identity. Pick the side to start from, then its first line.')],
      subject: flip ? `${p.end} = ${busy}` : claimOf(p),
      steps: [
        { id: 'side', ask: 'Which side do you start from?', branches: sides.map((label) => ({ label, to: 'first' })) },
        {
          id: 'first',
          ask: 'What is its first line?',
          branches: offered.map((label) => ({ label, outcome: 'Each line rewrites one piece of the side you started from.' })),
        },
      ],
      answer: [sides[flip ? 1 : 0], first],
    };
  },
  solution: ({ form, v, flip }) => {
    const p = BASIC_PROOFS[form](PROOF_VARS[v]);
    const lines = proofLines(p);
    return [
      {
        text: `Start from the busier side, $${lines[0]}$, which is on the ${flip ? 'right' : 'left'}: it has more to rewrite. Never work across the equals sign.`,
      },
      { text: `${p.moves[0].say}.` },
      { tex: lines.join(' = ') },
    ];
  },
};

/** What each kind of move leans on, as a branch label in the given letter. */
function leanLabel(lean: Lean, v: string): string {
  const f = fns(v);
  switch (lean) {
    case 'pyth':
      return `$${identity.pyth(v)}$`;
    case 'tan':
      return `$${identity.tan(v)}$`;
    case 'cot':
      return `$${identity.cot(v)}$`;
    case 'recip':
      return `$${f.se} = ${frac('1', f.c)}$`;
    case 'quot':
      return `$${identity.quot(v)}$`;
    case 'double':
      return `$${f.S} = 2${f.s} ${f.c}$`;
    case 'algebra':
      return 'No identity: just algebra';
  }
}

const SQUARE_LEANS: Lean[] = ['pyth', 'tan', 'cot', 'recip', 'algebra'];

interface LeanParams {
  form: number;
  move: number;
  v: number;
  phrasing: number;
}

const LEAN_PROMPTS = [
  'The working has reached the line below. What does its next line need?',
  'Here is the latest line. Say what the next move leans on, then what it gives.',
  'Carry the proof on from this line.',
];

/** Which identity, if any, the next line of a squares proof needs, and what it gives. */
const proofIdentityFlow: Generator<LeanParams> = {
  id: 'tid-proof-identity-flow',
  sample: (rng, difficulty) => {
    const form = rng.pick(formsFor(SQUARE_PROOFS, difficulty));
    return {
      form,
      move: rng.int(0, SQUARE_PROOFS[form]('x').moves.length - 1),
      v: rng.int(0, PROOF_VARS.length - 1),
      phrasing: rng.int(0, LEAN_PROMPTS.length - 1),
    };
  },
  render: (params): Slide => {
    const { form, move, v, phrasing } = params;
    const letter = PROOF_VARS[v];
    const p = SQUARE_PROOFS[form](letter);
    const lines = proofLines(p);
    const m = p.moves[move];
    const others = SQUARE_LEANS.filter((lean) => lean !== m.lean)
      .sort((a, b) => hashSeed(`${a}${saltOf(params)}`) - hashSeed(`${b}${saltOf(params)}`))
      .slice(0, 3);
    const leans = scatter([m.lean, ...others].map((lean) => leanLabel(lean, letter)));
    const right = `$= ${lines[move + 1]}$`;
    const results = scatter([right, ...m.slips.slice(0, 3).map((slip) => `$= ${slippedLine(p, move, slip)}$`)]);
    return {
      kind: 'flow',
      prompt: [prose(`Proving $${claimOf(p)}$.`), prose(LEAN_PROMPTS[phrasing])],
      subject: lines[move],
      steps: [
        { id: 'lean', ask: 'What does the next line need?', branches: leans.map((label) => ({ label, to: 'next' })) },
        { id: 'next', ask: 'So the next line is', branches: results.map((label) => ({ label, outcome: 'One move, and the line still equals the one above.' })) },
      ],
      answer: [leanLabel(m.lean, letter), right],
    };
  },
  solution: ({ form, move, v }) => {
    const p = SQUARE_PROOFS[form](PROOF_VARS[v]);
    const lines = proofLines(p);
    return [{ text: `${p.moves[move].say}.` }, { tex: `${lines[move]} = ${lines[move + 1]}` }];
  },
};

/** Exact values a side or a piece may take at a table angle, for tree tiles and order steps. */
const EXACT: { value: number; tex: string }[] = [
  ...SPECIAL,
  { value: Math.SQRT2, tex: '\\sqrt{2}' },
  { value: 1 / 3, tex: '\\frac{1}{3}' },
  { value: 2 / Math.sqrt(3), tex: '\\frac{2}{\\sqrt{3}}' },
];

/** A value as the learner reads it, or undefined when it is not on the table. */
function exactTex(value: number): string | undefined {
  if (!Number.isFinite(value)) return undefined;
  const row = EXACT.find((entry) => Math.abs(entry.value - Math.abs(value)) < 1e-9);
  if (!row) return undefined;
  return value < 0 && row.value !== 0 ? `-${row.tex}` : row.tex;
}

const TABLE_ANGLES = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/** Every value a sides tree fills in at this angle, or undefined when one is off the table. */
function treeValues(tree: SidesTree, degrees: number): string[] | undefined {
  const x = rad(degrees);
  const lv = tree.left.map((piece) => piece.at(x));
  const rv = tree.right.map((piece) => piece.at(x));
  const all = [...lv, ...rv, tree.l(lv), tree.r(rv)];
  const texs = all.map((value) => (Math.abs(value) > 1e6 ? undefined : exactTex(value)));
  if (texs.some((tex) => tex === undefined)) return undefined;
  if (Math.abs(tree.l(lv) - tree.r(rv)) > 1e-9) return undefined;
  return texs as string[];
}

const TREE_FORMS = DOUBLE_PROOFS.map((make, i) => ({ i, tree: make('x').tree })).filter((row) => row.tree !== undefined);

/** Per tree form, the angles whose every value is exact, split by difficulty. */
const TREE_ANGLES = TREE_FORMS.map(({ tree }) => TABLE_ANGLES.filter((d) => treeValues(tree as SidesTree, d) !== undefined));

interface SidesParams {
  form: number;
  angle: number;
  v: number;
}

/** Both sides of a double-angle identity at a table angle, piece by piece. */
const proofSidesTree: Generator<SidesParams> = {
  id: 'tid-proof-sides-tree',
  sample: (rng, difficulty) => {
    const rows = TREE_FORMS.map((row, k) => ({ k, hard: DOUBLE_PROOFS[row.i]('x').hard, angles: TREE_ANGLES[k].filter((d) => difficulty > 1 || d < 90) }))
      .filter((row) => (difficulty > 1 || !row.hard) && row.angles.length > 0);
    const row = rng.pick(rows);
    return { form: row.k, angle: rng.pick(row.angles), v: rng.int(0, PROOF_VARS.length - 1) };
  },
  render: ({ form, angle, v }): Slide => {
    const letter = PROOF_VARS[v];
    const p = DOUBLE_PROOFS[TREE_FORMS[form].i](letter);
    const tree = p.tree as SidesTree;
    const answer = treeValues(tree, angle) as string[];
    const distractors = answer
      .filter((tex) => tex !== '0')
      .map((tex) => (tex.startsWith('-') ? tex.slice(1) : `-${tex}`))
      .concat(['0', '2', '\\frac{1}{2}', '\\sqrt{3}']);
    const list = (texs: string[]) => texs.map((tex) => `$${tex}$`).join(', ');
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Put $${letter} = ${deg(angle)}$ into both sides. Top row: ${list(tree.left.map((q) => q.tex))}, then ${list(tree.right.map((q) => q.tex))}. Bottom row: the left side, then the right side.`,
        ),
      ],
      expression: claimOf(p),
      nodes: [
        ...tree.left.map((_, i) => ({ id: `l${i}`, from: [] })),
        ...tree.right.map((_, i) => ({ id: `r${i}`, from: [] })),
        { id: 'L', from: tree.left.map((_, i) => `l${i}`) },
        { id: 'R', from: tree.right.map((_, i) => `r${i}`) },
      ],
      bank: bankOf(answer, distractors, 3),
      answer,
    };
  },
  solution: ({ form, angle, v }) => {
    const letter = PROOF_VARS[v];
    const p = DOUBLE_PROOFS[TREE_FORMS[form].i](letter);
    const tree = p.tree as SidesTree;
    const values = treeValues(tree, angle) as string[];
    const nl = tree.left.length;
    const nr = tree.right.length;
    return [
      { text: `At $${letter} = ${deg(angle)}$: ${[...tree.left, ...tree.right].map((q, i) => `$${q.tex} = ${values[i]}$`).join(', ')}.` },
      { text: `So the left side is $${values[nl + nr]}$ and the right side is $${values[nl + nr + 1]}$: they agree, as an identity must.` },
      { text: 'Agreeing at one angle is a useful check on the working, but it is not a proof.' },
    ];
  },
};

/* ---------- Lesson 5: identity or not ---------- */

type Verdict = 'identity' | 'equation' | 'never';

interface Claim {
  hard: boolean;
  kind: Verdict;
  lhs: (v: string) => string;
  rhs: (v: string) => string;
  L: (x: number) => number;
  R: (x: number) => number;
}

const tan = (x: number): number => Math.sin(x) / Math.cos(x);
const sec = (x: number): number => 1 / Math.cos(x);

const CLAIMS: Claim[] = [
  { hard: false, kind: 'identity', lhs: (v) => fns(v).S, rhs: (v) => `2${fns(v).s} ${fns(v).c}`, L: (x) => sin(2 * x), R: (x) => 2 * sin(x) * cos(x) },
  { hard: false, kind: 'identity', lhs: (v) => fns(v).C, rhs: (v) => `1 - 2${fns(v).s2}`, L: (x) => cos(2 * x), R: (x) => 1 - 2 * sin(x) ** 2 },
  { hard: false, kind: 'identity', lhs: (v) => `${fns(v).t} ${fns(v).c}`, rhs: (v) => fns(v).s, L: (x) => tan(x) * cos(x), R: (x) => sin(x) },
  { hard: false, kind: 'identity', lhs: (v) => `${fns(v).se2} - ${fns(v).t2}`, rhs: () => '1', L: (x) => sec(x) ** 2 - tan(x) ** 2, R: () => 1 },
  { hard: false, kind: 'identity', lhs: (v) => `(1 - ${fns(v).s})(1 + ${fns(v).s})`, rhs: (v) => fns(v).c2, L: (x) => (1 - sin(x)) * (1 + sin(x)), R: (x) => cos(x) ** 2 },
  { hard: true, kind: 'identity', lhs: (v) => fns(v).C, rhs: (v) => `2${fns(v).c2} - 1`, L: (x) => cos(2 * x), R: (x) => 2 * cos(x) ** 2 - 1 },
  { hard: true, kind: 'identity', lhs: (v) => frac(fns(v).S, fns(v).s), rhs: (v) => `2${fns(v).c}`, L: (x) => sin(2 * x) / sin(x), R: (x) => 2 * cos(x) },
  { hard: false, kind: 'equation', lhs: (v) => fns(v).S, rhs: (v) => `2${fns(v).s}`, L: (x) => sin(2 * x), R: (x) => 2 * sin(x) },
  { hard: false, kind: 'equation', lhs: (v) => fns(v).C, rhs: (v) => `2${fns(v).c} - 1`, L: (x) => cos(2 * x), R: (x) => 2 * cos(x) - 1 },
  { hard: false, kind: 'equation', lhs: (v) => `${fns(v).s} + ${fns(v).c}`, rhs: () => '1', L: (x) => sin(x) + cos(x), R: () => 1 },
  { hard: false, kind: 'equation', lhs: (v) => fns(v).C, rhs: (v) => fns(v).c2, L: (x) => cos(2 * x), R: (x) => cos(x) ** 2 },
  { hard: false, kind: 'equation', lhs: (v) => fns(v).S, rhs: (v) => fns(v).s, L: (x) => sin(2 * x), R: (x) => sin(x) },
  { hard: true, kind: 'equation', lhs: (v) => `\\tan 2${v}`, rhs: (v) => `2${fns(v).t}`, L: (x) => tan(2 * x), R: (x) => 2 * tan(x) },
  { hard: true, kind: 'equation', lhs: (v) => `(${fns(v).s} + ${fns(v).c})^2`, rhs: () => '1', L: (x) => (sin(x) + cos(x)) ** 2, R: () => 1 },
  { hard: false, kind: 'never', lhs: (v) => `${fns(v).s2} + ${fns(v).c2}`, rhs: () => '2', L: (x) => sin(x) ** 2 + cos(x) ** 2, R: () => 2 },
  { hard: false, kind: 'never', lhs: (v) => `${fns(v).se2} - ${fns(v).t2}`, rhs: () => '0', L: (x) => sec(x) ** 2 - tan(x) ** 2, R: () => 0 },
  { hard: true, kind: 'never', lhs: (v) => `${fns(v).s} + ${fns(v).c}`, rhs: () => '2', L: (x) => sin(x) + cos(x), R: () => 2 },
  { hard: true, kind: 'never', lhs: (v) => `${fns(v).C} + 2${fns(v).s2}`, rhs: () => '0', L: (x) => cos(2 * x) + 2 * sin(x) ** 2, R: () => 0 },
  { hard: true, kind: 'never', lhs: (v) => `(1 - ${fns(v).s})(1 + ${fns(v).s})`, rhs: (v) => `1 + ${fns(v).c2}`, L: (x) => (1 - sin(x)) * (1 + sin(x)), R: (x) => 1 + cos(x) ** 2 },
];

const claimTex = (c: Claim, v: string): string => `${c.lhs(v)} = ${c.rhs(v)}`;

/** Both sides at an angle, or undefined where either has no value. */
function sidesAt(c: Claim, degrees: number): [number, number] | undefined {
  const x = rad(degrees);
  const l = c.L(x);
  const r = c.R(x);
  if (!Number.isFinite(l) || !Number.isFinite(r) || Math.abs(l) > 1e6 || Math.abs(r) > 1e6) return undefined;
  // At a pole two huge terms can cancel to a tidy wrong number: sec^2 - tan^2
  // comes out 0 at 90 degrees. A side that jumps just beside the angle has no value there.
  if (Math.abs(c.L(x + 1e-6) - l) > 1e-3 || Math.abs(c.R(x + 1e-6) - r) > 1e-3) return undefined;
  return [Math.abs(l) < 1e-12 ? 0 : l, Math.abs(r) < 1e-12 ? 0 : r];
}

const agree = ([l, r]: [number, number]): boolean => Math.abs(l - r) < 1e-9;

/** A value as a fraction with a small bottom, or undefined for a surd. */
function smallRat(value: number): Rat | undefined {
  for (let d = 1; d <= 4; d++) {
    const n = Math.round(value * d);
    if (Math.abs(value * d - n) < 1e-9 && Math.abs(value) <= 4) return rat(n, d);
  }
  return undefined;
}

const claimsFor = (difficulty: number): number[] => CLAIMS.map((c, i) => ({ c, i })).filter(({ c }) => difficulty > 1 || !c.hard).map(({ i }) => i);

interface SideValueParams {
  claim: number;
  angle: number;
  right: boolean;
  v: number;
}

/** Every (angle, side) where a claim's side comes out a plain fraction. */
function sideValueSlots(claim: number, difficulty: number): { angle: number; right: boolean }[] {
  const angles = TURN.filter((d) => difficulty > 1 || d <= 90);
  return angles.flatMap((angle) => {
    const both = sidesAt(CLAIMS[claim], angle);
    if (!both) return [];
    return [false, true].filter((right) => smallRat(both[right ? 1 : 0]) !== undefined && (right ? CLAIMS[claim].rhs('x') : CLAIMS[claim].lhs('x')).includes('\\')).map((right) => ({ angle, right }));
  });
}

/** Test a claim at one angle: what does one side come to? */
const proofSideValue: Generator<SideValueParams> = {
  id: 'tid-proof-side-value',
  sample: (rng, difficulty) => {
    const claims = claimsFor(difficulty).filter((i) => sideValueSlots(i, difficulty).length > 0);
    const claim = rng.pick(claims);
    const slot = rng.pick(sideValueSlots(claim, difficulty));
    return { claim, angle: slot.angle, right: slot.right, v: rng.int(0, PROOF_VARS.length - 1) };
  },
  render: ({ claim, angle, right, v }): Slide => {
    const c = CLAIMS[claim];
    const letter = PROOF_VARS[v];
    const value = (sidesAt(c, angle) as [number, number])[right ? 1 : 0];
    return {
      kind: 'expression',
      prompt: [
        prose(`Test $${claimTex(c, letter)}$ at $${letter} = ${deg(angle)}$.`),
        prose(`What does the ${right ? 'right' : 'left'} side, $${right ? c.rhs(letter) : c.lhs(letter)}$, come to there?`),
      ],
      lead: `\\text{${right ? 'Right' : 'Left'} side} =`,
      keypad: NUMBER_KEYS,
      answer: ratAnswer(smallRat(value) as Rat),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ claim, angle, right, v }) => {
    const c = CLAIMS[claim];
    const letter = PROOF_VARS[v];
    const [l, r] = sidesAt(c, angle) as [number, number];
    const value = right ? r : l;
    const other = right ? l : r;
    return [
      { text: `Put $${letter} = ${deg(angle)}$ into $${right ? c.rhs(letter) : c.lhs(letter)}$ and use the table values.` },
      { tex: `${right ? c.rhs(letter) : c.lhs(letter)} = ${ratTex(smallRat(value) as Rat)}` },
      {
        text: agree([l, r])
          ? 'The other side comes to the same, so the claim survives this test, though one angle proves nothing.'
          : `The other side comes to $${exactTex(other) ?? 'something else'}$, so the claim fails here: it is not an identity.`,
      },
    ];
  },
};

interface VerdictParams {
  claim: number;
  angle: number;
  v: number;
}

const OUTCOME: Record<Verdict, string> = {
  identity: 'An identity: true at every angle.',
  equation: 'An equation: true at some angles only.',
  never: 'Never true, at any angle.',
};

/** Test angles for a claim: at difficulty 1 an identity is tested where it agrees and anything else where it fails. */
function verdictAngles(claim: number, difficulty: number): number[] {
  const c = CLAIMS[claim];
  return TURN.filter((d) => {
    const both = sidesAt(c, d);
    if (!both) return false;
    return difficulty > 1 || d <= 90 && (c.kind === 'identity' || !agree(both));
  });
}

/** Test at one angle, then decide: identity, equation, or never. */
const proofVerdictFlow: Generator<VerdictParams> = {
  id: 'tid-proof-verdict-flow',
  sample: (rng, difficulty) => {
    const claim = rng.pick(claimsFor(difficulty));
    return { claim, angle: rng.pick(verdictAngles(claim, difficulty)), v: rng.int(0, PROOF_VARS.length - 1) };
  },
  render: ({ claim, angle, v }): Slide => {
    const c = CLAIMS[claim];
    const letter = PROOF_VARS[v];
    const same = agree(sidesAt(c, angle) as [number, number]);
    const yesAll = 'Yes, so it is an identity';
    const noSome = 'No, so it is an equation';
    const yesSome = 'Yes, so it is an equation';
    const noNever = 'No, so it is never true';
    const pick = same ? (c.kind === 'identity' ? yesAll : noSome) : c.kind === 'equation' ? yesSome : noNever;
    return {
      kind: 'flow',
      prompt: [prose(`Is this an identity, an equation true at some angles, or never true? Start by testing $${letter} = ${deg(angle)}$.`)],
      subject: claimTex(c, letter),
      steps: [
        {
          id: 'test',
          ask: `At $${letter} = ${deg(angle)}$, do the two sides agree?`,
          branches: [
            { label: 'Yes, they agree there', to: 'agree' },
            { label: 'No, they differ there', to: 'differ' },
          ],
        },
        {
          id: 'agree',
          ask: 'So it might be an identity. Does it hold at every angle?',
          branches: [
            { label: yesAll, outcome: OUTCOME.identity },
            { label: noSome, outcome: OUTCOME.equation },
          ],
        },
        {
          id: 'differ',
          ask: 'So it is not an identity. Does it hold at any angle at all?',
          branches: [
            { label: yesSome, outcome: OUTCOME.equation },
            { label: noNever, outcome: OUTCOME.never },
          ],
        },
      ],
      answer: [same ? 'Yes, they agree there' : 'No, they differ there', pick],
    };
  },
  solution: ({ claim, angle, v }) => {
    const c = CLAIMS[claim];
    const letter = PROOF_VARS[v];
    const [l, r] = sidesAt(c, angle) as [number, number];
    const at = `At $${letter} = ${deg(angle)}$ the left side is $${exactTex(l) ?? l.toFixed(3)}$ and the right side $${exactTex(r) ?? r.toFixed(3)}$.`;
    const why: Record<Verdict, string> = {
      identity: 'Rewriting one side with identities turns it into the other, so it holds at every angle.',
      equation: 'It holds at some angles and fails at others, so it is an equation to solve, not an identity.',
      never: 'Rewriting shows the two sides can never be equal, so no angle satisfies it.',
    };
    return [{ text: at }, { text: why[c.kind] }];
  },
};

interface DisproveParams {
  claim: number;
  angle: number;
  v: number;
  picks: number[];
}

/** Angles that disprove a claim with exact values on both sides. */
function disproofAngles(claim: number, difficulty: number): number[] {
  return TURN.filter((d) => {
    if (d === 0 || (difficulty === 1 && d > 90)) return false;
    const both = sidesAt(CLAIMS[claim], d);
    return both !== undefined && !agree(both) && exactTex(both[0]) !== undefined && exactTex(both[1]) !== undefined;
  });
}

function disproofParts({ claim, angle, v }: DisproveParams): { steps: string[]; pool: OrderExtra[] } {
  const c = CLAIMS[claim];
  const letter = PROOF_VARS[v];
  const [l, r] = sidesAt(c, angle) as [number, number];
  const L = exactTex(l) as string;
  const R = exactTex(r) as string;
  const slipValue = [-r, 2 * r, r + 1, 0, 1, 2, -1].find((w) => Math.abs(w - r) > 1e-9 && Math.abs(w - l) > 1e-9 && exactTex(w) !== undefined) as number;
  const agreeAt = TURN.find((d) => {
    const both = sidesAt(c, d);
    return both !== undefined && agree(both);
  });
  const pool: OrderExtra[] = [
    {
      text: 'To disprove it, the two sides must differ at every angle.',
      why: 'One angle where they differ is enough to show it is not true for every angle.',
    },
    {
      text: `Next, the right side, $${c.rhs(letter)}$, comes to $${exactTex(slipValue)}$.`,
      why: `At $${letter} = ${deg(angle)}$ the right side is $${R}$.`,
    },
    {
      text: `$${L} \\ne ${R}$, so the claim is never true.`,
      why:
        c.kind === 'never'
          ? 'It happens to be never true, but one angle cannot show that: it only shows the claim is not an identity.'
          : `That does not follow, and it is false: the sides agree at $${letter} = ${deg(agreeAt as number)}$.`,
    },
    agreeAt !== undefined
      ? {
          text: `At $${letter} = ${deg(agreeAt)}$ the two sides agree, so it is an identity after all.`,
          why: 'Agreeing at one angle proves nothing; one angle where they differ settles it.',
        }
      : {
          text: 'Checking one more angle where the sides differ would prove it is an identity.',
          why: 'Angles where the sides differ can only ever disprove.',
        },
  ];
  return {
    steps: [
      `One angle where the two sides differ is enough, so try $${letter} = ${deg(angle)}$.`,
      `First, the left side, $${c.lhs(letter)}$, comes to $${L}$.`,
      `Next, the right side, $${c.rhs(letter)}$, comes to $${R}$.`,
      `$${L} \\ne ${R}$, so the claim is not an identity.`,
    ],
    pool,
  };
}

/** Disprove a claim with one angle: the steps in order. */
const proofDisproveOrder: Generator<DisproveParams> = {
  id: 'tid-proof-disprove-order',
  sample: (rng, difficulty) => {
    const claims = claimsFor(difficulty).filter((i) => CLAIMS[i].kind !== 'identity' && disproofAngles(i, difficulty).length > 0);
    const claim = rng.pick(claims);
    return {
      claim,
      angle: rng.pick(disproofAngles(claim, difficulty)),
      v: rng.int(0, PROOF_VARS.length - 1),
      picks: rng.sample([0, 1, 2, 3], difficulty > 1 ? 2 : 1).sort((a, b) => a - b),
    };
  },
  render: (params): Slide => {
    const { steps, pool } = disproofParts(params);
    const { steps: bank, answer } = orderBank(
      steps,
      params.picks.map((i) => pool[i].text),
    );
    return {
      kind: 'order',
      prompt: [
        prose(`Show that $${claimTex(CLAIMS[params.claim], PROOF_VARS[params.v])}$ is not an identity.`),
        prose(`Tap the steps in order. ${params.picks.length === 1 ? 'One step does not belong.' : 'Two steps do not belong.'}`),
      ],
      steps: bank,
      answer,
    };
  },
  solution: (params) => {
    const { steps, pool } = disproofParts(params);
    return [
      ...steps.map((text, i) => ({ text: `${i + 1}. ${text}` })),
      ...params.picks.map((i) => ({ text: `Not part of it: “${pool[i].text}” ${pool[i].why}` })),
    ];
  },
};

/** Every bank of proofs, for the question that finds the wrong line. */
const PROOF_BANKS: ((v: string) => Proof)[][] = [BASIC_PROOFS, FRACTION_PROOFS, SQUARE_PROOFS, DOUBLE_PROOFS];

interface WrongParams {
  bank: number;
  form: number;
  move: number;
  slip: number;
  v: number;
}

/** The proof with one move slipped, and the lines offered as options. */
function wrongParts({ bank, form, move, slip, v }: WrongParams) {
  const p = PROOF_BANKS[bank][form](PROOF_VARS[v]);
  const lines = proofLines(p);
  const shown = [...lines];
  shown[move + 1] = slippedLine(p, move, p.moves[move].slips[slip]);
  const from = Math.max(1, Math.min(move, shown.length - 4));
  return { p, lines, shown, offered: shown.slice(from, from + 4), wrong: shown[move + 1] };
}

/** A slip that is not already a line of the proof, so every option reads differently. */
function slipsFor(p: Proof, move: number): number[] {
  const lines = proofLines(p);
  return p.moves[move].slips
    .map((slip, i) => ({ i, line: slippedLine(p, move, slip) }))
    .filter(({ line }) => !lines.includes(line))
    .map(({ i }) => i);
}

/** A proof with one wrong line: which is the first that does not equal the line above? */
const proofWrongChoice: Generator<WrongParams> = {
  id: 'tid-proof-wrong-choice',
  sample: (rng, difficulty) => {
    const bank = rng.int(0, PROOF_BANKS.length - 1);
    const form = rng.pick(formsFor(PROOF_BANKS[bank], difficulty));
    const p = PROOF_BANKS[bank][form]('x');
    const move = rng.int(0, p.moves.length - 1);
    return { bank, form, move, slip: rng.pick(slipsFor(p, move)), v: rng.int(0, PROOF_VARS.length - 1) };
  },
  render: (params): Slide => {
    const { p, shown, offered, wrong } = wrongParts(params);
    return {
      kind: 'choice',
      prompt: [
        prose(`This is meant to prove $${claimOf(p)}$, but one line is wrong:`),
        display(workingTex(shown)),
        prose('Which is the first line that does not equal the line above it?'),
      ],
      options: offered.map((line, i) => ({ id: `opt${i}`, label: `= ${line}`, tex: true })),
      correctId: `opt${offered.indexOf(wrong)}`,
    };
  },
  solution: (params) => {
    const { p, lines, wrong } = wrongParts(params);
    const m = p.moves[params.move];
    return [
      { text: `$= ${wrong}$ is the slip. ${m.say} gives $${m.value}$, not $${m.slips[params.slip]}$.` },
      { text: 'The working should run:' },
      { tex: lines.join(' = ') },
    ];
  },
};

/* ---------- Fitting a phone ---------- */

/**
 * Roughly how many characters wide a line of TeX renders, counting a fraction
 * as its wider half and a function name as its letters. Only good enough to
 * tell a line that fits a phone from one that would scroll sideways.
 */
function texWidth(tex: string): number {
  let s = tex;
  for (;;) {
    const next = s.replace(/\\d?t?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) => `${a.length > b.length ? a : b}xx`);
    if (next === s) break;
    s = next;
  }
  return s
    .replace(/\^\{\\circ\}/g, 'o')
    .replace(/\\operatorname\{cosec\}/g, 'cosec')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\(left|right)/g, 'x')
    .replace(/\\(,|;|!)/g, '')
    .replace(/\\qquad/g, 'xxxx')
    .replace(/\\quad/g, 'xx')
    .replace(/\\([a-zA-Z]+)/g, (_m, w: string) => (w.length > 3 ? 'xx' : w))
    .replace(/[=+]| - /g, 'xx')
    .replace(/[{}\s^_]/g, '').length;
}

/** The widest line, by `texWidth`, that sits on a 393-pixel screen without scrolling. */
const FIT = 22;

/** Splits at `sep` wherever it is outside every bracket and brace. */
function splitTop(tex: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tex.length; i++) {
    const ch = tex[i];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    else if (depth === 0 && tex.startsWith(sep, i)) {
      out.push(tex.slice(start, i).trim());
      start = i + sep.length;
      i += sep.length - 1;
    }
  }
  out.push(tex.slice(start).trim());
  return out;
}

/**
 * Breaks a long run of terms before an operator, packing terms greedily. A sum
 * breaks before a plus or minus first; only a piece still too wide after that
 * breaks inside a product, so `a \\times b + c \\times d` never splits `c` from `d`.
 */
function breakTerms(
  tex: string,
  limit = FIT - 5,
  groups: string[][] = [[' + ', ' - '], [' \\times ', ' \\div ']],
): string[] {
  if (texWidth(tex) <= limit || groups.length === 0) return [tex];
  let terms = [tex];
  for (const op of groups[0]) {
    terms = terms.flatMap((term) => {
      const [head, ...tail] = splitTop(term, op);
      return [head, ...tail.map((t) => `${op.trim()} ${t}`)];
    });
  }
  const lines: string[] = [];
  for (const term of terms) {
    const last = lines.length - 1;
    if (last >= 0 && texWidth(`${lines[last]} ${term}`) <= limit) lines[last] = `${lines[last]} ${term}`;
    else lines.push(term);
  }
  return lines.flatMap((line) => breakTerms(line, limit, groups.slice(1)));
}

/**
 * One `L = R1 = R2` chain as aligned rows, each `=` under the last. A long
 * left-hand side gets a row of its own, so it does not push every row right.
 */
function chainRows(tex: string, prefix: string): string[] {
  const [lhs, ...rhs] = splitTop(tex, ' = ');
  const pieces = (side: string, lead: string, limit = FIT - 5) =>
    breakTerms(side, limit).map((piece, j) => (j === 0 ? `${lead}${piece}` : `& \\quad {} ${piece}`));
  if (rhs.length === 0) return pieces(tex, `& ${prefix}`, FIT);
  if (texWidth(`${prefix}${tex}`) <= FIT) return [`${prefix}${lhs} &= ${rhs.join(' = ')}`];
  const own = texWidth(lhs) > FIT / 2 || (rhs.length === 1 && breakTerms(rhs[0]).length === 1);
  return [
    ...(own ? pieces(lhs, `& ${prefix}`, FIT) : []),
    ...rhs.flatMap((side, i) => pieces(side, i === 0 && !own ? `${prefix}${lhs} &= ` : '&= ')),
  ];
}

/**
 * A line of working too wide for a phone, stacked: a chain of equals signs one
 * per row, two statements side by side one above the other, and a long sum
 * broken before a plus or minus. A line that already fits is left alone.
 */
function fit(tex: string): string {
  if (tex.includes('\\begin') || texWidth(tex) <= FIT) return tex;
  const rows: string[] = [];
  for (const part of splitTop(tex, '\\qquad')) {
    // Two statements joined by an arrow or an "or": each gets its own row,
    // the joining word leading the second.
    const pieces = [{ tex: part, lead: '' }];
    for (const [sep, lead] of [
      ['\\quad \\Rightarrow \\quad', '\\Rightarrow\\; '],
      ['\\quad \\text{or} \\quad', '\\text{or}\\; '],
    ]) {
      const next = pieces.splice(0).flatMap((piece) =>
        texWidth(piece.tex) <= FIT
          ? [piece]
          : splitTop(piece.tex, sep).map((t, i) => ({ tex: t, lead: i === 0 ? piece.lead : lead })),
      );
      pieces.push(...next);
    }
    for (const piece of pieces) rows.push(...chainRows(piece.tex, piece.lead));
  }
  return rows.length === 1 ? tex : `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
}

/** The same generator, with every display and every line of working fitted to a phone. */
function fitted<P>(generator: Generator<P>): Generator<P> {
  return {
    ...generator,
    render: (params) => {
      const slide = generator.render(params);
      if (!('prompt' in slide)) return slide;
      if (slide.kind === 'expression' && slide.lead && texWidth(slide.lead) > FIT) {
        // Stacked in place, so the lead still ends in the equals sign the
        // input sits after, and a choice form built from it still finds it.
        const body = slide.lead.replace(/\s*=\s*$/, '').trim();
        return { ...slide, lead: `${fit(body)} =` };
      }
      return {
        ...slide,
        ...(slide.kind === 'tree' ? { expression: fit(slide.expression) } : {}),
        prompt: slide.prompt.map((block): Block => (block.kind === 'display' ? { ...block, tex: fit(block.tex) } : block)),
      };
    },
    solution: (params) => generator.solution(params).map((step) => (step.tex ? { ...step, tex: fit(step.tex) } : step)),
  };
}

export const trigIdentityGenerators = [
  fitted(simplifySteps),
  fitted(rearrangeTiles),
  fitted(simplifyChoice),
  fitted(valueFromIdentity),
  fitted(whichIdentityFlow),
  fitted(constantValue),
  fitted(quadraticTree),
  fitted(disguisedTiles),
  fitted(solutionCount),
  fitted(solutionSlider),
  fitted(tanSolve),
  fitted(tanSolveTiles),
  fitted(divideFlow),
  fitted(tanSlider),
  fitted(expandTiles),
  fitted(collapseTiles),
  fitted(formulaChoice),
  fitted(compoundTree),
  fitted(tanCompound),
  fitted(tanCompoundTree),
  fitted(tanShiftSolve),
  fitted(tanExpandTiles),
  fitted(exactTiles),
  fitted(exactSteps),
  fitted(tanExactChoice),
  fitted(doubleValue_),
  fitted(doubleTiles),
  fitted(doubleCollapseChoice),
  fitted(doubleSteps),
  fitted(doubleEqFlow),
  fitted(doubleEqSlider),
  fitted(doubleQuadTiles),
  fitted(doubleEqTree),
  fitted(rExpandTiles),
  fitted(rFormFlow),
  fitted(rMatchTiles),
  fitted(rSquaredTree),
  fitted(rValue),
  fitted(rTanAlpha),
  fitted(rAlphaSteps),
  fitted(rConvertChoice),
  fitted(rExactTiles),
  fitted(rExactAlpha),
  fitted(rExpandExactChoice),
  fitted(rMaxValue),
  fitted(rMaxTiles),
  fitted(rPeakSlider),
  fitted(rExtremeFlow),
  fitted(rSolveSteps),
  fitted(rSolveAngle),
  fitted(rCountFlow),
  fitted(rSolveSlider),
  fitted(halfTiles),
  fitted(halfSimplifySteps),
  fitted(halfRewriteFlow),
  fitted(halfSignChoice),
  fitted(halfValue),
  fitted(halfSquareTree),
  fitted(halfRootSteps),
  fitted(halfSignFlow),
  fitted(halfExactTiles),
  fitted(halfExactChoice),
  fitted(halfExactSteps),
  fitted(halfSurdTree),
  fitted(tripleSteps),
  fitted(tripleTiles),
  fitted(tripleValue),
  fitted(tripleChoice),
  fitted(multiEqFlow),
  fitted(multiEqSlider),
  fitted(multiEqSteps),
  fitted(multiEqAngle),
  fitted(basicProofSteps),
  fitted(basicProofOrder),
  fitted(basicProofChoice),
  fitted(proofStartFlow),
  fitted(fractionProofSteps),
  fitted(fractionProofTiles),
  fitted(fractionProofOrder),
  fitted(fractionProofChoice),
  fitted(squareProofSteps),
  fitted(squareProofTiles),
  fitted(squareProofOrder),
  fitted(proofIdentityFlow),
  fitted(doubleProofSteps),
  fitted(doubleProofOrder),
  fitted(doubleProofChoice),
  fitted(proofSidesTree),
  fitted(proofSideValue),
  fitted(proofVerdictFlow),
  fitted(proofWrongChoice),
  fitted(proofDisproveOrder),
];
