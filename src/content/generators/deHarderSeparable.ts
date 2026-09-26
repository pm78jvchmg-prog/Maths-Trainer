/**
 * Differential Equations, Level 9: separable equations with harder integrals.
 *
 * Every question here is `dy/dx = f(x)g(y)` where the separating is the easy
 * part and the x side needs a technique from Integration: a fraction whose
 * top is a multiple of the derivative of its bottom, partial fractions,
 * tan and cot and sec², substitution, and integration by parts. Each
 * technique builds a `SepCase` — the equation, the separated form, the
 * antiderivative as whole-coefficient terms and the tidied solution — and
 * the widgets (steps, tiles, flow, tree, typed, choice) are drawn from it, so
 * a worked solution always describes the learner's own numbers.
 *
 * Coefficients are drawn so that every antiderivative is whole: the top of
 * an f'/f fraction is c times the derivative of the bottom, a partial
 * fraction numerator is built from its whole cover-up constants, and a
 * substitution integrand is c(n + 1) times what the chain rule gives.
 *
 * Two rules from Level 1 hold. `ln|y|` is never typed, and a logarithm is
 * typed only where its argument is always positive (`x² + 4`, `e^x + 2`), so
 * the checker never probes a log of a negative number; partial fractions
 * and tan and cot integrals, whose logs need a modulus, are asked through
 * widgets that grade the form. The typed x-side integrals declare
 * `integrand`, so the sweep differentiates each answer back; everything
 * else is checked in `deHarderSeparable.test.ts`, which puts each tidied
 * solution back into its equation.
 */
import type { Block, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { plotFigure, plotSvg, markerWindow } from '../figures';
import { ALGEBRA_KEYS, EXP_KEYS, termTex } from './calculus';
import { mix, numberChoices, stepBank, tokenBank, treeBank, turned } from './parametricImplicit';

/* ---------- Shared helpers ---------- */

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

const DYDX = '\\frac{dy}{dx}';

/** A coefficient in front of something: 1 and -1 are implied. */
const coef = (c: number): string => (c === 1 ? '' : c === -1 ? '-' : `${c}`);

/** `+ 3` or `- 3`, for appending to a term the learner reads. */
const signed = (c: number): string => (c < 0 ? `- ${-c}` : `+ ${c}`);

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

/** Distinct strings, first kept, the correct one removed. */
function distinctFrom(correct: string, candidates: string[], take: number): string[] {
  const out: string[] = [];
  for (const candidate of candidates) {
    if (candidate === correct || out.includes(candidate)) continue;
    out.push(candidate);
    if (out.length === take) break;
  }
  return out;
}

/** One term of an antiderivative: a whole coefficient times a body. */
export interface Term {
  c: number;
  tex: string;
  answer: string;
}

/** Terms as the learner reads them, each coefficient times `s`. */
export function sumTex(terms: Term[], s = 1): string {
  return terms
    .map((term, idx) => {
      const k = term.c * s;
      const body = `${coef(Math.abs(k))}${term.tex}`;
      if (idx === 0) return `${k < 0 ? '-' : ''}${body}`;
      return `${k < 0 ? ' - ' : ' + '}${body}`;
    })
    .join('');
}

/** The same terms for mathjs. */
export function sumAnswer(terms: Term[], s = 1): string {
  return terms.map((term) => `(${term.c * s})*(${term.answer})`).join(' + ');
}

/** The y factor of the right-hand side, and what separating and integrating make of it. */
export type YForm = 'ln' | 'sq' | 'ey' | 'sec2';

export const Y_SIDE: Record<YForm, { g: string; gAnswer: string; part: string; int: string; wrongInt: string }> = {
  ln: { g: 'y', gAnswer: 'y', part: '\\frac{1}{y}', int: '\\ln|y|', wrongInt: '-\\frac{1}{y^{2}}' },
  sq: { g: '\\frac{1}{y}', gAnswer: '1/y', part: 'y', int: '\\tfrac{1}{2}y^{2}', wrongInt: 'y^{2}' },
  ey: { g: 'e^{-y}', gAnswer: 'e^(-y)', part: 'e^{y}', int: 'e^{y}', wrongInt: 'ye^{y}' },
  sec2: { g: '\\cos^{2} y', gAnswer: 'cos(y)^2', part: '\\sec^{2} y', int: '\\tan y', wrongInt: '\\sec y\\tan y' },
};

/**
 * One separable equation, everything a widget needs from it.
 *
 * `F` is the antiderivative of the x factor `f`, without its constant, and
 * `slips` are antiderivatives a learner might write instead. A form-`ln`
 * case whose `F` is logarithms tidies to a product of powers, given in
 * `lnTidy`; otherwise it tidies to `Ae^F`.
 */
export interface SepCase {
  rhs: string;
  rhsAnswer: string;
  form: YForm;
  f: string;
  fAnswer: string;
  /** Partial fractions only: f rewritten as its split, and wrong splits. */
  split?: { tex: string; slips: string[] };
  F: Term[];
  slips: Term[][];
  lnTidy?: string;
  lnTidyAnswer?: (A: number) => string;
  lnTidySlips?: string[];
}

export const separatedTex = (sc: SepCase): string => `${Y_SIDE[sc.form].part}\\,dy = ${sc.f}\\,dx`;
const splitLineTex = (sc: SepCase, split: string): string => `${Y_SIDE[sc.form].part}\\,dy = \\left(${split}\\right)dx`;
export const integratedTex = (sc: SepCase): string => `${Y_SIDE[sc.form].int} = ${sumTex(sc.F)} + C`;

export function tidyTex(sc: SepCase): string {
  const F = sumTex(sc.F);
  switch (sc.form) {
    case 'ln':
      return `y = ${sc.lnTidy ?? `Ae^{${F}}`}`;
    case 'sq':
      return `y^{2} = ${sumTex(sc.F, 2)} + C`;
    case 'ey':
      return `y = \\ln(${F} + C)`;
    case 'sec2':
      return `y = \\arctan(${F} + C)`;
  }
}

/** The tidied solution for mathjs, with its constant set to `K`: an explicit y(x). */
export function tidyAnswer(sc: SepCase, K: number): string {
  const F = sumAnswer(sc.F);
  switch (sc.form) {
    case 'ln':
      return sc.lnTidyAnswer ? sc.lnTidyAnswer(K) : `(${K})*e^(${F})`;
    case 'sq':
      return `sqrt(2*(${F}) + (${K}))`;
    case 'ey':
      return `log(${F} + (${K}))`;
    case 'sec2':
      return `atan(${F} + (${K}))`;
  }
}

function tidySlips(sc: SepCase): string[] {
  const F = sumTex(sc.F);
  switch (sc.form) {
    case 'ln':
      return sc.lnTidySlips ?? [`y = e^{${F}} + A`, `y = ${F} + A`, `y = Ae^{${sc.f}}`];
    case 'sq':
      return [`y^{2} = ${F} + C`, `y = ${sumTex(sc.F, 2)} + C`, `y^{2} = ${sumTex(sc.F, -2)} + C`];
    case 'ey':
      return [`y = \\ln(${F}) + C`, `y = e^{${F}} + C`, `y = -\\ln(${F} + C)`];
    case 'sec2':
      return [`y = \\tan(${F} + C)`, `y = \\arctan(${F}) + C`, `y = \\cos^{2}(${F} + C)`];
  }
}

const TIDY_WHY: Record<YForm, string> = {
  ln: 'Take $e$ to the power of each side. $e^{C}$ is a constant, called $A$, and it absorbs the $\\pm$ from $|y|$.',
  sq: 'Multiply by $2$. Twice an unknown constant is still an unknown constant, so it stays $C$.',
  ey: 'Take $\\ln$ of each side.',
  sec2: 'Take $\\arctan$ of each side.',
};

const LOG_TIDY_WHY =
  'Write each multiple of a logarithm as the logarithm of a power, combine them, then take $e$ to the power of each side. $e^{C}$ is a constant $A$, which absorbs the $\\pm$ from the moduli.';

/**
 * A modulus written with `\vert` rather than `|`, which draws the same.
 *
 * The steps widget stores an answered stage as `from-to|value` and splits a
 * token at its first `|`, so a value such as `\ln|y| = ...` came back drawn as
 * `y| = ...` once chosen, and `\ln\left|...\right|` as a KaTeX error. Steps
 * tokens carry no literal bar for that reason; displays keep theirs.
 */
function barFree(tex: string): string {
  return tex
    .replace(/\\left\|/g, '\\left\\vert ')
    .replace(/\\right\|/g, '\\right\\vert ')
    .replace(/\|([^|]*)\|/g, '\\vert $1\\vert ');
}

/** A steps slide solving a case: separate, (split), integrate, tidy. */
function solveSteps(sc: SepCase): Slide {
  const separated = separatedTex(sc);
  const integrated = integratedTex(sc);
  const tidied = tidyTex(sc);
  const Y = Y_SIDE[sc.form];
  const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
    {
      span: [0, 3],
      operator: 1,
      value: separated,
      bank: stepBank(separated, `${Y.g}\\,dy = ${sc.f}\\,dx`, `${sc.f}\\,dy = ${Y.part}\\,dx`),
    },
  ];
  if (sc.split) {
    const line = splitLineTex(sc, sc.split.tex);
    reductions.push({
      span: [0, 1],
      operator: 0,
      value: line,
      bank: stepBank(line, ...sc.split.slips.map((slip) => splitLineTex(sc, slip))),
    });
  }
  reductions.push(
    {
      span: [0, 1],
      operator: 0,
      value: integrated,
      bank: stepBank(integrated, ...sc.slips.map((slip) => `${Y.int} = ${sumTex(slip)} + C`), `${Y.wrongInt} = ${sumTex(sc.F)} + C`),
    },
    { span: [0, 1], operator: 0, value: tidied, bank: stepBank(tidied, ...tidySlips(sc)) },
  );
  // Value and bank alike, so the chosen tile still matches the value exactly.
  for (const reduction of reductions) {
    reduction.value = barFree(reduction.value);
    reduction.bank = reduction.bank.map(barFree);
  }
  return {
    kind: 'steps',
    prompt: [
      prose(
        sc.split
          ? 'Tap the $=$ to separate the variables, then tap the line each time to split, integrate and tidy it up.'
          : 'Tap the $=$ to separate the variables, then tap the line each time to integrate and tidy it up.',
      ),
    ],
    start: [DYDX, '=', sc.rhs],
    reductions,
  };
}

const SEPARATE_WHY: Record<YForm, string> = {
  ln: 'Divide by $y$',
  sq: 'Multiply by $y$',
  ey: 'Multiply by $e^{y}$',
  sec2: 'Divide by $\\cos^{2} y$, which makes $\\sec^{2} y$,',
};

function solveSolution(sc: SepCase, why: SolutionStep): SolutionStep[] {
  const steps: SolutionStep[] = [
    { text: `${SEPARATE_WHY[sc.form]} and multiply by $dx$, so every $y$ sits with $dy$.`, tex: separatedTex(sc) },
  ];
  if (sc.split) steps.push({ text: 'Split the fraction into partial fractions.', tex: splitLineTex(sc, sc.split.tex) });
  steps.push(why, { text: 'Integrate both sides, with one constant.', tex: integratedTex(sc) });
  steps.push({ text: sc.form === 'ln' && sc.lnTidy ? LOG_TIDY_WHY : TIDY_WHY[sc.form], tex: tidyTex(sc) });
  return steps;
}

/** The y factor put onto a right-hand side that is `sign` times `body` (body has no leading minus). */
function withY(form: Exclude<YForm, 'ln'>, sign: number, body: string): string {
  const minus = sign < 0 ? '-' : '';
  if (form === 'sq') return `${minus}\\frac{${body}}{y}`;
  if (form === 'ey') return `${minus}\\frac{${body}}{e^{y}}`;
  return `${minus}${body}\\cos^{2} y`;
}

function rhsAnswerOf(form: YForm, fAnswer: string): string {
  return `(${fAnswer})*(${Y_SIDE[form].gAnswer})`;
}

/* ============================================================
 * Lesson 1: a fraction whose top is the derivative of its bottom
 * ============================================================ */

/** The bottom f(x) of an f'/f fraction, always positive. */
export type FpBottom =
  | { type: 'sq'; a: number }
  | { type: 'exp'; m: number; a: number }
  | { type: 'shift'; b: number; d: number };

export interface FpParams {
  bottom: FpBottom;
  /** The top is c times the derivative of the bottom. */
  c: number;
  /** y on the bottom of the right-hand side, so y dy rather than dy/y. */
  inv: boolean;
}

export function bottomTex(bottom: FpBottom): string {
  switch (bottom.type) {
    case 'sq':
      return `x^{2} + ${bottom.a}`;
    case 'exp':
      return `e^{${bottom.m === 1 ? '' : bottom.m}x} + ${bottom.a}`;
    case 'shift':
      return `x^{2} ${bottom.b < 0 ? '-' : '+'} ${2 * Math.abs(bottom.b)}x + ${bottom.d}`;
  }
}

export function bottomAnswer(bottom: FpBottom): string {
  switch (bottom.type) {
    case 'sq':
      return `x^2 + ${bottom.a}`;
    case 'exp':
      return `e^(${bottom.m}*x) + ${bottom.a}`;
    case 'shift':
      return `x^2 + (${2 * bottom.b})*x + ${bottom.d}`;
  }
}

/** f'(x) as the learner reads it. */
export function derivTex(bottom: FpBottom): string {
  switch (bottom.type) {
    case 'sq':
      return '2x';
    case 'exp':
      return bottom.m === 1 ? 'e^{x}' : `${bottom.m}e^{${bottom.m}x}`;
    case 'shift':
      return `2x ${signed(2 * bottom.b)}`;
  }
}

export function derivAnswer(bottom: FpBottom): string {
  switch (bottom.type) {
    case 'sq':
      return '2*x';
    case 'exp':
      return `${bottom.m}*e^(${bottom.m}*x)`;
    case 'shift':
      return `2*x + (${2 * bottom.b})`;
  }
}

/** The number in front of f'(x): what the top's coefficient is divided by. */
const derivCoef = (bottom: FpBottom): number => (bottom.type === 'exp' ? bottom.m : 2);

/** f(x) at a point, for the value questions. */
export function bottomAt(bottom: FpBottom, x: number): number {
  switch (bottom.type) {
    case 'sq':
      return x * x + bottom.a;
    case 'exp':
      return Math.exp(bottom.m * x) + bottom.a;
    case 'shift':
      return x * x + 2 * bottom.b * x + bottom.d;
  }
}

/** |c| times f'(x), the top without its sign; `withY` puts a y in it. */
function fpTop(bottom: FpBottom, size: number, y = ''): string {
  switch (bottom.type) {
    case 'sq':
      return `${termTex(2 * size, 1)}${y}`;
    case 'exp':
      return `${coef(size * bottom.m)}${y}e^{${bottom.m === 1 ? '' : bottom.m}x}`;
    case 'shift':
      return y ? `(${2 * size}x ${signed(2 * size * bottom.b)})${y}` : `${2 * size}x ${signed(2 * size * bottom.b)}`;
  }
}

/** (bottom)^c as the tidy solution writes it after A. */
function fpPowerTex(bottom: FpBottom, c: number): string {
  const b = bottomTex(bottom);
  if (c === 1) return `A(${b})`;
  if (c > 1) return `A(${b})^{${c}}`;
  if (c === -1) return `\\frac{A}{${b}}`;
  return `\\frac{A}{(${b})^{${-c}}}`;
}

export function fpCase({ bottom, c, inv }: FpParams): SepCase {
  const b = bottomTex(bottom);
  const minus = c < 0 ? '-' : '';
  const size = Math.abs(c);
  const f = `${minus}\\frac{${fpTop(bottom, size)}}{${b}}`;
  const fAnswer = `(${c})*(${derivAnswer(bottom)})/(${bottomAnswer(bottom)})`;
  const log = (k: number): Term[] => [{ c: k, tex: `\\ln(${b})`, answer: `log(${bottomAnswer(bottom)})` }];
  const form: YForm = inv ? 'sq' : 'ln';
  const rhs = inv ? `${minus}\\frac{${fpTop(bottom, size)}}{(${b})y}` : `${minus}\\frac{${fpTop(bottom, size, 'y')}}{${b}}`;
  const bare = c === 1 ? b : c > 1 ? `(${b})^{${c}}` : c === -1 ? `\\frac{1}{${b}}` : `\\frac{1}{(${b})^{${-c}}}`;
  return {
    rhs,
    rhsAnswer: rhsAnswerOf(form, fAnswer),
    form,
    f,
    fAnswer,
    F: log(c),
    slips: [log(c * derivCoef(bottom)), log(-c), log(c === 1 ? 2 : 1)],
    lnTidy: fpPowerTex(bottom, c),
    lnTidyAnswer: (A) => `(${A})*(${bottomAnswer(bottom)})^(${c})`,
    lnTidySlips: [`y = ${bare} + A`, `y = ${sumTex(log(c))} + A`, `y = Ae^{${coef(c)}(${b})}`],
  };
}

function sampleBottom(rng: Rng, hard: boolean): FpBottom {
  const type = rng.pick(hard ? (['sq', 'exp', 'shift'] as const) : (['sq', 'exp'] as const));
  if (type === 'sq') return { type, a: rng.int(1, 9) };
  if (type === 'exp') return { type, m: hard ? rng.int(1, 2) : 1, a: rng.int(1, 9) };
  const b = rng.pick([-3, -2, -1, 1, 2, 3]);
  return { type, b, d: b * b + rng.int(1, 6) };
}

function sampleFp(rng: Rng, difficulty: number, allowInv = false): FpParams {
  const hard = difficulty >= 2;
  return {
    bottom: sampleBottom(rng, hard),
    c: hard ? rng.pick([-2, -1, 1, 2, 3]) : rng.int(1, 3),
    inv: allowInv && hard && rng.chance(0.35),
  };
}

function fpWhy({ bottom, c }: FpParams): SolutionStep {
  const b = bottomTex(bottom);
  return {
    text: `The bottom, $${b}$, differentiates to $${derivTex(bottom)}$, and the top is $${c}$ times that. So the $x$ side integrates to $${c}$ times $\\ln(${b})$, with no modulus since $${b}$ is always positive.`,
  };
}

const fpBodyAnswer = (p: FpParams): string => sumAnswer(fpCase(p).F);

/** Integrate the x side, typed: c ln(f(x)), whose argument is always positive. */
const fpInt: Generator<FpParams> = {
  id: 'de-hsep-fp-int',
  sample: (rng, difficulty) => sampleFp(rng, difficulty),
  choices: (params) => {
    const sc = fpCase(params);
    const b = bottomTex(params.bottom);
    const ba = bottomAnswer(params.bottom);
    const opt = (terms: Term[]) => ({ tex: `${sumTex(terms)} + C`, answer: `${sumAnswer(terms)} + C` });
    return options(
      opt(sc.F),
      ...[sc.slips[0], sc.slips[1]].map(opt),
      { tex: `${params.c < 0 ? '-' : ''}\\frac{${Math.abs(params.c)}}{${b}} + C`, answer: `(${params.c})/(${ba}) + C` },
      opt(sc.slips[2]),
    ).slice(0, 4);
  },
  render: (params): Slide => {
    const sc = fpCase(params);
    return {
      kind: 'expression',
      prompt: [prose('Separating'), display(`${DYDX} = ${sc.rhs}`), prose('leaves this integral on the $x$ side. Find it.')],
      lead: `\\int ${sc.f}\\,dx =`,
      keypad: EXP_KEYS,
      answer: fpBodyAnswer(params),
      integrand: sc.fAnswer,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: (params) => {
    const sc = fpCase(params);
    return [fpWhy(params), { tex: `\\int ${sc.f}\\,dx = ${sumTex(sc.F)} + C` }];
  },
};

/** Solve an f'/f equation one line at a time. */
const fpSteps: Generator<FpParams> = {
  id: 'de-hsep-fp-steps',
  sample: (rng, difficulty) => sampleFp(rng, difficulty, true),
  render: (params) => solveSteps(fpCase(params)),
  solution: (params) => solveSolution(fpCase(params), fpWhy(params)),
};

/** The general solution y = A f(x)^c, as tiles. Powers written as indices, negative ones too. */
const fpGeneral: Generator<FpParams> = {
  id: 'de-hsep-fp-general',
  sample: (rng, difficulty) => sampleFp(rng, difficulty),
  render: (params): Slide => {
    const { bottom, c } = params;
    const b = bottomTex(bottom);
    const pow = (k: number) => (k === 1 ? `(${b})` : `(${b})^{${k}}`);
    const answer = ['A', pow(c)];
    return {
      kind: 'tiles',
      prompt: [prose('Find the general solution of'), display(`${DYDX} = ${fpCase(params).rhs}`), prose('where $A$ is a constant.')],
      template: 'y = {0}\\,{1}',
      bank: tokenBank(answer, [pow(c * derivCoef(bottom)), pow(-c), `e^{${b}}`, '\\ln A', pow(c + 1)], 3),
      answer,
    };
  },
  solution: (params) => {
    const sc = fpCase(params);
    const b = bottomTex(params.bottom);
    return [
      { text: 'Separate the variables.', tex: separatedTex(sc) },
      fpWhy(params),
      { text: 'Integrate both sides.', tex: integratedTex(sc) },
      params.c === 1
        ? { text: 'Take $e$ to the power of each side. $e^{C}$ is the constant $A$.', tex: `y = A(${b})` }
        : { text: `Write $${sumTex(sc.F)}$ as $\\ln(${b})^{${params.c}}$, then take $e$ to the power of each side. $e^{C}$ is the constant $A$.`, tex: `y = A(${b})^{${params.c}}` },
    ];
  },
};

/** The f'/f shortcut as a walk: the derivative of the bottom, the multiple, the integral. */
const fpFlow: Generator<FpParams> = {
  id: 'de-hsep-fp-flow',
  sample: (rng, difficulty) => sampleFp(rng, difficulty),
  render: (params): Slide => {
    const { bottom, c } = params;
    const sc = fpCase(params);
    const b = bottomTex(bottom);
    const d = derivTex(bottom);
    const salt = mix(c, bottom.type === 'sq' ? bottom.a : bottom.type === 'exp' ? bottom.a * 10 + bottom.m : bottom.b * 10 + bottom.d);
    const derivSlips =
      bottom.type === 'exp'
        ? [bottom.m === 1 ? 'xe^{x - 1}' : `e^{${bottom.m}x}`, `${d} + ${bottom.a}`]
        : bottom.type === 'sq'
          ? [`\\frac{x^{3}}{3} + ${termTex(bottom.a, 1)}`, `2x + ${bottom.a}`]
          : [`2x ${signed(2 * bottom.b + bottom.d)}`, `x ${signed(2 * bottom.b)}`];
    const top = c * derivCoef(bottom);
    const multSlips = distinctFrom(`${c}`, [`${top}`, `${-c}`, `${2 * c}`], 2);
    const right = `${sumTex(sc.F)} + C`;
    const intSlips = [`\\frac{${c}}{${b}} + C`, `${coef(c)}\\ln(${d}) + C`];
    const answer = [`$${d}$`, `$${c}$`, `$${right}$`];
    return {
      kind: 'flow',
      prompt: [prose('Integrate using the derivative of the bottom.')],
      subject: `\\int ${sc.f}\\,dx`,
      steps: [
        {
          id: 'deriv',
          ask: `What does the bottom, $${b}$, differentiate to?`,
          branches: turned(
            [
              { label: answer[0], to: 'mult' },
              { label: `$${derivSlips[0]}$`, outcome: 'Differentiate each term of the bottom again, one at a time.' },
              { label: `$${derivSlips[1]}$`, outcome: 'A constant on its own differentiates to $0$.' },
            ],
            salt % 3,
          ),
        },
        {
          id: 'mult',
          ask: 'The top is how many times that derivative?',
          branches: turned(
            [
              { label: answer[1], to: 'int' },
              ...multSlips.map((slip) => ({
                label: `$${slip}$`,
                outcome:
                  Number(slip) === -c
                    ? 'Check the signs of the top and of the derivative.'
                    : "Divide the top by the derivative, including the derivative's own number.",
              })),
            ],
            (salt >>> 4) % 3,
          ),
        },
        {
          id: 'int',
          ask: 'So the integral is',
          branches: turned(
            [
              { label: answer[2], outcome: `So $\\int ${sc.f}\\,dx = ${right}$. The bottom is always positive, so no modulus is needed.` },
              { label: `$${intSlips[0]}$`, outcome: 'The derivative over the function integrates to a logarithm, not another fraction.' },
              { label: `$${intSlips[1]}$`, outcome: 'The logarithm is of the bottom itself, not of its derivative.' },
            ],
            (salt >>> 8) % 3,
          ),
        },
      ],
      answer,
    };
  },
  solution: (params) => {
    const sc = fpCase(params);
    return [fpWhy(params), { tex: `\\int ${sc.f}\\,dx = ${sumTex(sc.F)} + C` }];
  },
};

/* ============================================================
 * Lesson 2: partial fractions
 * ============================================================ */

/**
 * `dy/dx = N(x) y / ((x - p)(x - q))` with N built from whole cover-up
 * constants: N = α(x - q) + β(x - p), so the split is α/(x - p) + β/(x - q)
 * and the solution y = A(x - p)^α (x - q)^β.
 */
export interface PfParams {
  p: number;
  q: number;
  alpha: number;
  beta: number;
  /** The bottom multiplied out, so it has to be factorised first. */
  expanded: boolean;
}

/** `x - 3`, `x + 2`, or `x` for a root at 0. */
const fac = (r: number): string => (r === 0 ? 'x' : `x ${signed(-r)}`);
const bracket = (r: number): string => (r === 0 ? 'x' : `(${fac(r)})`);

/** The top N(x) = (α + β)x - (αq + βp). */
export const pfTop = ({ p, q, alpha, beta }: PfParams): [number, number] => [alpha + beta, -(alpha * q + beta * p)];

/** N at a value of x. */
export const pfTopAt = (params: PfParams, x: number): number => {
  const [a1, a0] = pfTop(params);
  return a1 * x + a0;
};

/** The top as the learner reads it, and the sign taken out in front when it leads with a minus. */
function pfTopTex(params: PfParams): { sign: number; tex: string; monomial: boolean; constant: boolean } {
  let [a1, a0] = pfTop(params);
  const lead = a1 !== 0 ? a1 : a0;
  const sign = lead < 0 ? -1 : 1;
  a1 *= sign;
  a0 *= sign;
  if (a1 === 0) return { sign, tex: `${a0}`, monomial: false, constant: true };
  if (a0 === 0) return { sign, tex: termTex(a1, 1), monomial: true, constant: false };
  return { sign, tex: `${termTex(a1, 1)} ${signed(a0)}`, monomial: false, constant: false };
}

export function pfBottomTex({ p, q, expanded }: PfParams): string {
  if (!expanded) return `${bracket(p)}${bracket(q)}`;
  const s = -(p + q);
  const pr = p * q;
  return `x^{2}${s === 0 ? '' : ` ${s < 0 ? '-' : '+'} ${coef(Math.abs(s))}x`}${pr === 0 ? '' : ` ${signed(pr)}`}`;
}

const pfFactored = (params: PfParams): string => pfBottomTex({ ...params, expanded: false });

/** Two cover-up constants as a split: α/(x - p) + β/(x - q). */
function splitTex(alpha: number, p: number, beta: number, q: number): string {
  const first = `${alpha < 0 ? '-' : ''}\\frac{${Math.abs(alpha)}}{${fac(p)}}`;
  return `${first} ${beta < 0 ? '-' : '+'} \\frac{${Math.abs(beta)}}{${fac(q)}}`;
}

// `\left|...\right|` keeps the modulus in one piece: a bare `|x + 3|` let a
// wrapped tile or display break after its `+`, leaving `3|` on the next line.
const logTerm = (k: number, r: number): Term => ({ c: k, tex: `\\ln\\left|${fac(r)}\\right|`, answer: `log(abs(x - (${r})))` });

/** A(x - p)^α (x - q)^β written as a fraction, without the `y =`. `A` may be a number or omitted. */
export function powersTex(pairs: [number, number][], lead: string): string {
  const piece = (r: number, e: number) => (r === 0 ? (e === 1 ? 'x' : `x^{${e}}`) : e === 1 ? `(${fac(r)})` : `(${fac(r)})^{${e}}`);
  const ups = pairs.filter(([, e]) => e > 0).sort((a, b) => (a[0] === 0 ? -1 : b[0] === 0 ? 1 : 0));
  const downs = pairs.filter(([, e]) => e < 0);
  const num = lead === '' && ups.length === 1 && ups[0][1] === 1 ? fac(ups[0][0]) : `${lead}${ups.map(([r, e]) => piece(r, e)).join('')}` || '1';
  if (downs.length === 0) return num;
  const den = downs.length === 1 && downs[0][1] === -1 ? fac(downs[0][0]) : downs.map(([r, e]) => piece(r, -e)).join('');
  return `\\frac{${num}}{${den}}`;
}

export function pfCase(params: PfParams): SepCase {
  const { p, q, alpha, beta } = params;
  const top = pfTopTex(params);
  const minus = top.sign < 0 ? '-' : '';
  const bottom = pfBottomTex(params);
  const [a1, a0] = pfTop(params);
  const fAnswer = `((${a1})*x + (${a0}))/((x - (${p}))*(x - (${q})))`;
  const topY = top.tex === '1' ? 'y' : top.constant || top.monomial ? `${top.tex}y` : `(${top.tex})y`;
  const F = [logTerm(alpha, p), logTerm(beta, q)];
  const nP = alpha * (p - q);
  const nQ = beta * (q - p);
  const noSplitFlip = [logTerm(-alpha, p), logTerm(-beta, q)];
  return {
    rhs: `${minus}\\frac{${topY}}{${bottom}}`,
    rhsAnswer: rhsAnswerOf('ln', fAnswer),
    form: 'ln',
    f: `${minus}\\frac{${top.tex}}{${bottom}}`,
    fAnswer,
    split: {
      tex: splitTex(alpha, p, beta, q),
      slips: [splitTex(-alpha, p, -beta, q), splitTex(nP, p, nQ, q), splitTex(beta, p, alpha, q)],
    },
    F,
    slips: [noSplitFlip, [logTerm(nP, p), logTerm(nQ, q)], [logTerm(beta, p), logTerm(alpha, q)]],
    lnTidy: powersTex([[p, alpha], [q, beta]], 'A'),
    lnTidyAnswer: (A) => `(${A})*(x - (${p}))^(${alpha})*(x - (${q}))^(${beta})`,
    lnTidySlips: pfTidySlips(params),
  };
}

function pfTidySlips({ p, q, alpha, beta }: PfParams): string[] {
  return [
    `y = ${powersTex([[p, -alpha], [q, -beta]], 'A')}`,
    `y = ${powersTex([[p, alpha], [q, beta]], '')} + A`,
    `y = ${powersTex([[p, beta], [q, alpha]], 'A')}`,
    `y = ${powersTex([[p, Math.abs(alpha)], [q, Math.abs(beta)]], 'A')}`,
  ];
}

const PF_PAIRS: [number, number][] = [[1, -1], [-1, 1], [2, -1], [-1, 2], [1, -2], [-2, 1], [2, 1], [1, 2]];

function samplePf(rng: Rng, difficulty: number): PfParams {
  const hard = difficulty >= 2;
  for (;;) {
    let p = rng.int(-5, 5);
    let q = rng.int(-5, 5);
    if (p === q) continue;
    let [alpha, beta] = hard ? rng.pick(PF_PAIRS) : [1, -1];
    // A factor of x reads best written first.
    if (q === 0) [p, q, alpha, beta] = [q, p, beta, alpha];
    const params = { p, q, alpha, beta, expanded: hard && rng.chance(0.5) };
    const [a1, a0] = pfTop(params);
    if (Math.abs(a1) > 12 || Math.abs(a0) > 20 || (a1 === 0 && a0 === 0)) continue;
    return params;
  }
}

function pfWhy(params: PfParams): SolutionStep {
  const { p, q, alpha, beta } = params;
  return {
    text: `Cover up $${fac(p)}$ and put $x = ${p}$ into the rest: $\\frac{${pfTopAt(params, p)}}{${p - q}} = ${alpha}$. Cover up $${fac(q)}$ and put $x = ${q}$: $\\frac{${pfTopAt(params, q)}}{${q - p}} = ${beta}$. Each piece integrates to a logarithm.`,
  };
}

/** Solve a partial-fractions equation one line at a time. */
const pfSteps: Generator<PfParams> = {
  id: 'de-hsep-pf-steps',
  sample: samplePf,
  render: (params) => solveSteps(pfCase(params)),
  solution: (params) => solveSolution(pfCase(params), pfWhy(params)),
};

/** The cover-up constants, as a tree: the top at each root, then the constant. */
const pfCover: Generator<PfParams> = {
  id: 'de-hsep-pf-cover-tree',
  sample: samplePf,
  render: (params): Slide => {
    const { p, q, alpha, beta } = params;
    // The top with its own sign, so "the top at x = p" is the number the tree asks for.
    const [a1, a0] = pfTop(params);
    const rawTop = a1 === 0 ? `${a0}` : a0 === 0 ? termTex(a1, 1) : `${termTex(a1, 1)} ${signed(a0)}`;
    const topP = pfTopAt(params, p);
    const topQ = pfTopAt(params, q);
    const answer = [topP, alpha, topQ, beta];
    return {
      kind: 'tree',
      prompt: [
        prose(`Split the fraction by covering up. Put $x = ${p}$ into the top, then divide by what is left of the bottom to get $A$. Do the same at $x = ${q}$ for $B$.`),
      ],
      expression: `\\frac{${rawTop}}{${pfFactored(params)}} = \\frac{A}{${fac(p)}} + \\frac{B}{${fac(q)}}`,
      nodes: [
        { id: 'np', from: [] },
        { id: 'a', from: ['np'] },
        { id: 'nq', from: [] },
        { id: 'b', from: ['nq'] },
      ],
      bank: treeBank(answer, [-alpha, -beta, p - q, q - p, topP * (p - q), topQ + 1]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { p, q, alpha, beta } = params;
    return [
      { text: `At $x = ${p}$ the top is $${pfTopAt(params, p)}$, and what is left of the bottom is $${p} ${signed(-q)} = ${p - q}$.`, tex: `A = \\frac{${pfTopAt(params, p)}}{${p - q}} = ${alpha}` },
      { text: `At $x = ${q}$ the top is $${pfTopAt(params, q)}$, and what is left of the bottom is $${q} ${signed(-p)} = ${q - p}$.`, tex: `B = \\frac{${pfTopAt(params, q)}}{${q - p}} = ${beta}` },
    ];
  },
};

/** The general solution, picked from four: the powers the wrong way up, a lost A, swapped powers. */
const pfGeneral: Generator<PfParams> = {
  id: 'de-hsep-pf-general',
  sample: samplePf,
  render: (params): Slide => {
    const sc = pfCase(params);
    const right = tidyTex(sc);
    return choiceSlide(
      [prose('Find the general solution of'), display(`${DYDX} = ${sc.rhs}`), prose('where $A$ is a constant.')],
      [{ label: right, tex: true, correct: true }, ...distinctFrom(right, pfTidySlips(params), 3).map((label) => ({ label, tex: true }))],
      mix(params.p, params.q, params.alpha, params.beta, params.expanded ? 1 : 0),
    );
  },
  solution: (params) => solveSolution(pfCase(params), pfWhy(params)),
};

/** Deciding how to integrate the fraction: not f'/f, factorise, split. */
const pfFlow: Generator<PfParams> = {
  id: 'de-hsep-pf-flow',
  sample: samplePf,
  render: (params): Slide => {
    const { p, q, alpha, beta, expanded } = params;
    const sc = pfCase(params);
    const salt = mix(p, q, alpha, beta);
    const split = splitTex(alpha, p, beta, q);
    const splitSlips = distinctFrom(split, sc.split!.slips, 2);
    const factored = pfFactored(params);
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [
      {
        id: 'fprime',
        ask: `The bottom differentiates to $${p + q === 0 ? '2x' : `2x ${signed(-(p + q))}`}$. Is the top a multiple of that?`,
        branches: turned(
          [
            { label: 'No', to: expanded ? 'factor' : 'split' },
            { label: 'Yes', outcome: 'Compare the $x$ terms and the numbers: no single multiple turns one into the other.' },
          ],
          salt % 2,
        ),
      },
    ];
    const answer = ['No'];
    if (expanded) {
      const flipped = `${bracket(-p)}${bracket(-q)}`;
      const half = `${bracket(p)}${bracket(-q)}`;
      const slips = distinctFrom(factored, [flipped, half, `${bracket(-p)}${bracket(q)}`], 2);
      steps.push({
        id: 'factor',
        ask: `Factorise the bottom, $${pfBottomTex(params)}$.`,
        branches: turned(
          [
            { label: `$${factored}$`, to: 'split' },
            ...slips.map((slip) => ({ label: `$${slip}$`, outcome: 'Multiply the brackets out to check: they do not give the bottom back.' })),
          ],
          (salt >>> 4) % 3,
        ),
      });
      answer.push(`$${factored}$`);
    }
    steps.push({
      id: 'split',
      ask: 'Split it into partial fractions.',
      branches: turned(
        [
          { label: `$${split}$`, outcome: `So the integral is $${sumTex(sc.F)} + C$.` },
          ...splitSlips.map((slip) => ({ label: `$${slip}$`, outcome: 'Put the two fractions back over one bottom: the top does not come back.' })),
        ],
        (salt >>> 8) % 3,
      ),
    });
    answer.push(`$${split}$`);
    return {
      kind: 'flow',
      prompt: [prose('Decide how to integrate the $x$ side.')],
      subject: `\\int ${sc.f}\\,dx`,
      steps,
      answer,
    };
  },
  solution: (params) => {
    const sc = pfCase(params);
    return [
      { text: 'The top is not a multiple of the derivative of the bottom, so the shortcut does not apply. The bottom factorises, so split it.' },
      { text: `Factorised, the bottom is $${pfFactored(params)}$.` },
      pfWhy(params),
      { tex: `\\int ${sc.f}\\,dx = ${sumTex(sc.F)} + C` },
    ];
  },
};

/* ============================================================
 * Lesson 3: trigonometric integrals
 * ============================================================ */

/**
 * tan: dy/dx = ck y tan kx, y = A sec^c kx. cot: y = A sin^c kx. sec2: the
 * x factor is ck sec² kx, integrating to c tan kx, with y or 1/y. cos2y: the
 * y factor is cos² y, so sec² y goes with dy and y = arctan(cx^k + C).
 */
export type TrigKind = 'tan' | 'cot' | 'sec2' | 'cos2y';

export interface TrigParams {
  kind: TrigKind;
  c: number;
  /** The multiple of x inside the trig function; for cos2y, the power of x after integrating. */
  k: number;
  /** sec2 only: y on the bottom, so y dy. */
  inv: boolean;
}

const ang = (k: number): string => (k === 1 ? 'x' : `${k}x`);
const angAnswer = (k: number): string => `${k}*x`;
const trigPow = (fn: string, e: number, k: number): string => (e === 1 ? `\\${fn} ${ang(k)}` : `\\${fn}^{${e}} ${ang(k)}`);

export function trigCase({ kind, c, k, inv }: TrigParams): SepCase {
  const a = ang(k);
  const aa = angAnswer(k);
  const ck = c * k;
  if (kind === 'cos2y') {
    const f = k === 1 ? `${c}` : termTex(ck, k - 1);
    const fAnswer = `(${ck})*x^(${k - 1})`;
    const pow = (m: number): Term[] => [{ c: m, tex: k === 1 ? 'x' : `x^{${k}}`, answer: `x^(${k})` }];
    const body = k === 1 ? `${Math.abs(c)}` : termTex(Math.abs(ck), k - 1);
    return {
      rhs: withY('sec2', ck, body === '1' ? '' : body),
      rhsAnswer: rhsAnswerOf('sec2', fAnswer),
      form: 'sec2',
      f,
      fAnswer,
      F: pow(c),
      slips: k === 1 ? [pow(-c), [{ c, tex: 'x^{2}', answer: 'x^2' }]] : [pow(ck), pow(-c), [{ c, tex: `x^{${k + 1}}`, answer: `x^(${k + 1})` }]],
    };
  }
  if (kind === 'sec2') {
    const fBody = `${coef(Math.abs(ck))}\\sec^{2} ${a}`;
    const f = `${ck < 0 ? '-' : ''}${fBody}`;
    const fAnswer = `(${ck})*sec(${aa})^2`;
    const tanT = (m: number): Term[] => [{ c: m, tex: `\\tan ${a}`, answer: `tan(${aa})` }];
    const form: YForm = inv ? 'sq' : 'ln';
    const F = tanT(c);
    return {
      rhs: inv ? withY('sq', ck, fBody) : `${coef(ck)}y\\sec^{2} ${a}`,
      rhsAnswer: rhsAnswerOf(form, fAnswer),
      form,
      f,
      fAnswer,
      F,
      slips: [k > 1 ? tanT(ck) : tanT(2 * c), tanT(-c), [{ c, tex: `\\sec ${a}`, answer: `sec(${aa})` }]],
      lnTidySlips: [`y = e^{${sumTex(F)}} + A`, `y = A${sumTex(F)}`, `y = Ae^{${coef(c)}\\sec^{2} ${a}}`],
    };
  }
  const fn = kind === 'tan' ? 'tan' : 'cot';
  const other = kind === 'tan' ? 'cos' : 'sin';
  const f = `${coef(ck)}\\${fn} ${a}`;
  const fAnswer = `(${ck})*${fn}(${aa})`;
  const logOf = (m: number, g: string): Term => ({ c: m, tex: `\\ln|\\${g} ${a}|`, answer: `log(abs(${g}(${aa})))` });
  const main = kind === 'tan' ? 'sec' : 'sin';
  const F = [logOf(c, main)];
  const tidy = kind === 'tan' && c < 0 ? `A${trigPow('cos', -c, k)}` : `A${trigPow(main, c, k)}`;
  const bare = kind === 'tan' && c < 0 ? trigPow('cos', -c, k) : trigPow(main, c, k);
  const wrong = kind === 'tan' && c < 0 ? trigPow('sec', -c, k) : trigPow(other, c, k);
  return {
    rhs: `${coef(ck)}y\\${fn} ${a}`,
    rhsAnswer: rhsAnswerOf('ln', fAnswer),
    form: 'ln',
    f,
    fAnswer,
    F,
    slips: [[logOf(-c, main)], [logOf(k > 1 ? ck : 2 * c, main)], [logOf(c, kind === 'tan' ? 'sin' : 'cos')]],
    lnTidy: tidy,
    lnTidyAnswer: (A) => `(${A})*${main}(${aa})^(${c})`,
    lnTidySlips: [`y = A${wrong}`, `y = ${bare} + A`, `y = Ae^{${bare}}`],
  };
}

function sampleTrig(rng: Rng, difficulty: number, kinds: TrigKind[], allowInv = false): TrigParams {
  const hard = difficulty >= 2;
  const kind = rng.pick(kinds);
  if (kind === 'cos2y') {
    // dy/dx = cos² y alone would leave 1 dx on the x side.
    const k = rng.int(1, 3);
    return { kind, c: rng.pick(k === 1 ? [-3, -2, 2, 3] : [-3, -2, -1, 1, 2, 3]), k, inv: false };
  }
  const c = kind === 'tan' && hard ? rng.pick([-3, -2, -1, 1, 2, 3]) : kind === 'sec2' && hard ? rng.pick([-3, -2, -1, 1, 2, 3, 4]) : rng.int(1, 3);
  return { kind, c, k: rng.int(1, 3), inv: allowInv && kind === 'sec2' && hard && rng.chance(0.5) };
}

const TRIG_EASY: TrigKind[] = ['tan', 'cot', 'sec2'];
const TRIG_ALL: TrigKind[] = ['tan', 'cot', 'sec2', 'sec2', 'cos2y'];

function trigWhy({ kind, c, k }: TrigParams): SolutionStep {
  const a = ang(k);
  if (kind === 'tan') {
    return {
      text: `$\\tan ${a} = \\frac{\\sin ${a}}{\\cos ${a}}$, and $\\cos ${a}$ differentiates to $-${coef(k)}\\sin ${a}$. So $\\int ${coef(c * k)}\\tan ${a}\\,dx = ${coef(-c)}\\ln|\\cos ${a}| = ${coef(c)}\\ln|\\sec ${a}|$.`,
    };
  }
  if (kind === 'cot') {
    return {
      text: `$\\cot ${a} = \\frac{\\cos ${a}}{\\sin ${a}}$, and $\\sin ${a}$ differentiates to $${coef(k)}\\cos ${a}$. So $\\int ${coef(c * k)}\\cot ${a}\\,dx = ${coef(c)}\\ln|\\sin ${a}|$.`,
    };
  }
  if (kind === 'sec2') {
    return { text: `$\\tan ${a}$ differentiates to $${coef(k)}\\sec^{2} ${a}$, so $\\int ${coef(c * k)}\\sec^{2} ${a}\\,dx = ${coef(c)}\\tan ${a}$.` };
  }
  return { text: `$\\frac{1}{\\cos^{2} y} = \\sec^{2} y$, which integrates to $\\tan y$. The $x$ side is a power of $x$: add one to the power and divide by it.` };
}

/** Solve a trigonometric equation one line at a time. */
const trigSteps: Generator<TrigParams> = {
  id: 'de-hsep-trig-steps',
  sample: (rng, difficulty) => sampleTrig(rng, difficulty, difficulty >= 2 ? TRIG_ALL : TRIG_EASY, true),
  render: (params) => solveSteps(trigCase(params)),
  solution: (params) => solveSolution(trigCase(params), trigWhy(params)),
};

/** The general solution A times a trig power, or A e^(c tan kx), as tiles. */
const trigGeneral: Generator<TrigParams> = {
  id: 'de-hsep-trig-general',
  sample: (rng, difficulty) => sampleTrig(rng, difficulty, TRIG_EASY),
  render: (params): Slide => {
    const { kind, c, k } = params;
    const sc = trigCase(params);
    const a = ang(k);
    let body: string;
    let extras: string[];
    if (kind === 'sec2') {
      body = `e^{${coef(c)}\\tan ${a}}`;
      extras = [`e^{${coef(c)}\\sec ${a}}`, `e^{${coef(-c)}\\tan ${a}}`, `${coef(c)}\\tan ${a}`, `e^{${coef(k > 1 ? c * k : 2 * c)}\\tan ${a}}`];
    } else {
      body = sc.lnTidy!.slice(1);
      const main = kind === 'tan' ? (c < 0 ? 'cos' : 'sec') : 'sin';
      const swap = kind === 'tan' ? (c < 0 ? 'sec' : 'cos') : 'cos';
      const e = Math.abs(c);
      extras = [trigPow(swap, e, k), trigPow(main, e + 1, k), `e^{${trigPow(main, e, k)}}`, trigPow(kind === 'tan' ? 'tan' : 'cot', e, k)];
    }
    const answer = ['A', body];
    return {
      kind: 'tiles',
      prompt: [prose('Find the general solution of'), display(`${DYDX} = ${sc.rhs}`), prose('where $A$ is a constant.')],
      template: 'y = {0}\\,{1}',
      bank: tokenBank(answer, [...extras, '\\ln A'], 3),
      answer,
    };
  },
  solution: (params) => solveSolution(trigCase(params), trigWhy(params)),
};

export interface TrigIntParams {
  c: number;
  k: number;
  inv: boolean;
}

const secCase = ({ c, k, inv }: TrigIntParams): SepCase => trigCase({ kind: 'sec2', c, k, inv });

/** Integrate a sec² x side, typed: c tan kx. */
const trigInt: Generator<TrigIntParams> = {
  id: 'de-hsep-trig-int',
  sample: (rng, difficulty) => ({
    c: rng.pick(difficulty >= 2 ? [-4, -3, -2, -1, 1, 2, 3, 4, 5] : [-2, -1, 1, 2, 3, 4, 5]),
    k: rng.int(1, difficulty >= 2 ? 4 : 3),
    inv: rng.chance(0.4),
  }),
  choices: (params) => {
    const sc = secCase(params);
    const opt = (terms: Term[]) => ({ tex: `${sumTex(terms)} + C`, answer: `${sumAnswer(terms)} + C` });
    return options(opt(sc.F), ...sc.slips.map(opt));
  },
  render: (params): Slide => {
    const sc = secCase(params);
    return {
      kind: 'expression',
      prompt: [prose('Separating'), display(`${DYDX} = ${sc.rhs}`), prose('leaves this integral on the $x$ side. Find it.')],
      lead: `\\int ${sc.f}\\,dx =`,
      keypad: [...ALGEBRA_KEYS, { insert: 'tan(' }],
      answer: sumAnswer(sc.F),
      integrand: sc.fAnswer,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: (params) => {
    const sc = secCase(params);
    return [trigWhy({ kind: 'sec2', ...params }), { tex: `\\int ${sc.f}\\,dx = ${sumTex(sc.F)} + C` }];
  },
};

export interface TrigFlowParams {
  kind: 'tan' | 'cot';
  c: number;
  k: number;
}

/** ∫ ck tan kx dx or ∫ ck cot kx dx as a walk: the fraction, the derivative of its bottom, the integral. */
const trigFlow: Generator<TrigFlowParams> = {
  id: 'de-hsep-trig-flow',
  sample: (rng) => ({ kind: rng.pick(['tan', 'cot'] as const), c: rng.int(1, 5), k: rng.int(1, 3) }),
  render: ({ kind, c, k }): Slide => {
    const a = ang(k);
    const salt = mix(c, k, kind === 'tan' ? 1 : 2);
    const tan = kind === 'tan';
    const frac = tan ? `\\frac{\\sin ${a}}{\\cos ${a}}` : `\\frac{\\cos ${a}}{\\sin ${a}}`;
    const bottom = tan ? `\\cos ${a}` : `\\sin ${a}`;
    const deriv = tan ? `-${coef(k)}\\sin ${a}` : `${coef(k)}\\cos ${a}`;
    const derivSlips = tan ? [`${coef(k)}\\sin ${a}`, k === 1 ? '-\\cos x' : `-\\sin ${a}`] : [`-${coef(k)}\\cos ${a}`, k === 1 ? '\\sin x' : `\\cos ${a}`];
    const main = tan ? 'sec' : 'sin';
    const right = `${coef(c)}\\ln|\\${main} ${a}| + C`;
    const intSlips = [
      `${coef(c)}\\ln|\\cos ${a}| + C`,
      k > 1 ? `${coef(c * k)}\\ln|\\${main} ${a}| + C` : `${coef(c)}\\${tan ? 'sec^{2}' : 'sin'} ${a} + C`,
    ];
    const answer = [`$${frac}$`, `$${deriv}$`, `$${right}$`];
    return {
      kind: 'flow',
      prompt: [prose('Integrate by writing it as a fraction.')],
      subject: `\\int ${coef(c * k)}\\${kind} ${a}\\,dx`,
      steps: [
        {
          id: 'frac',
          ask: `Write $\\${kind} ${a}$ as a fraction.`,
          branches: turned(
            [
              { label: answer[0], to: 'deriv' },
              { label: `$${tan ? `\\frac{\\cos ${a}}{\\sin ${a}}` : `\\frac{\\sin ${a}}{\\cos ${a}}`}$`, outcome: `That fraction is $\\${tan ? 'cot' : 'tan'} ${a}$.` },
              { label: `$\\frac{1}{${tan ? `\\cos ${a}` : `\\sin ${a}`}}$`, outcome: `That fraction is $\\${tan ? 'sec' : 'operatorname{cosec}'} ${a}$.` },
            ],
            salt % 3,
          ),
        },
        {
          id: 'deriv',
          ask: `What does the bottom, $${bottom}$, differentiate to?`,
          branches: turned(
            [
              { label: answer[1], to: 'int' },
              ...derivSlips.map((slip) => ({ label: `$${slip}$`, outcome: 'Check the sign, and the number the chain rule brings out of the bracket.' })),
            ],
            (salt >>> 4) % 3,
          ),
        },
        {
          id: 'int',
          ask: 'So the integral is',
          branches: turned(
            [
              {
                label: answer[2],
                outcome: tan
                  ? `The top is $${-c}$ times the derivative of the bottom, so the integral is $${coef(-c)}\\ln|\\cos ${a}| + C$, which is $${right}$.`
                  : `The top is $${c}$ times the derivative of the bottom, so the integral is $${right}$.`,
              },
              ...intSlips.map((slip) => ({ label: `$${slip}$`, outcome: 'Divide the top by the derivative of the bottom, sign and all, and take the logarithm of the bottom.' })),
            ],
            (salt >>> 8) % 3,
          ),
        },
      ],
      answer,
    };
  },
  solution: ({ kind, c, k }) => [trigWhy({ kind, c, k, inv: false })],
};

/* ============================================================
 * Lesson 4: substitution and parts
 * ============================================================ */

/**
 * chain: 2c(n + 1)x(x² + a)^n → c(x² + a)^(n + 1). expsq: 2cx e^(x²) → c e^(x²).
 * sincos: c(n + 1) sin x cosⁿ x → -c cos^(n + 1) x. xexp: cx e^(mx), m = ±1.
 * xcos: cx cos x. xsin: cx sin x. The last three by parts.
 */
export type SpKind = 'chain' | 'expsq' | 'sincos' | 'xexp' | 'xcos' | 'xsin';

export interface SpParams {
  kind: SpKind;
  c: number;
  a: number;
  n: number;
  m: number;
  form: YForm;
}

/** The x factor split as a whole coefficient and the rest, with a slot for y after `pre`. */
function spFactor({ kind, c, a, n, m }: SpParams): { k: number; pre: string; post: string; answer: string } {
  switch (kind) {
    case 'chain': {
      const k = 2 * c * (n + 1);
      return { k, pre: 'x', post: n === 1 ? `(x^{2} + ${a})` : `(x^{2} + ${a})^{${n}}`, answer: `(${k})*x*(x^2 + ${a})^(${n})` };
    }
    case 'expsq':
      return { k: 2 * c, pre: 'x', post: 'e^{x^{2}}', answer: `(${2 * c})*x*e^(x^2)` };
    case 'sincos': {
      const k = c * (n + 1);
      return { k, pre: '', post: `\\sin x\\cos${n === 1 ? '' : `^{${n}}`} x`, answer: `(${k})*sin(x)*cos(x)^(${n})` };
    }
    case 'xexp':
      return { k: c, pre: 'x', post: `e^{${m < 0 ? '-' : ''}x}`, answer: `(${c})*x*e^((${m})*x)` };
    case 'xcos':
      return { k: c, pre: 'x', post: '\\cos x', answer: `(${c})*x*cos(x)` };
    case 'xsin':
      return { k: c, pre: 'x', post: '\\sin x', answer: `(${c})*x*sin(x)` };
  }
}

function spTerms({ kind, c, a, n, m }: SpParams): { F: Term[]; slips: Term[][] } {
  switch (kind) {
    case 'chain': {
      const body = (e: number): Term => ({ c, tex: `(x^{2} + ${a})^{${e}}`, answer: `(x^2 + ${a})^(${e})` });
      const F = body(n + 1);
      return { F: [F], slips: [[{ ...F, c: 2 * c }], [{ ...F, c: -c }], [body(n + 2)]] };
    }
    case 'expsq': {
      const F: Term = { c, tex: 'e^{x^{2}}', answer: 'e^(x^2)' };
      return { F: [F], slips: [[{ ...F, c: 2 * c }], [{ c, tex: 'x^{2}e^{x^{2}}', answer: 'x^2*e^(x^2)' }], [{ ...F, c: -c }]] };
    }
    case 'sincos': {
      const cos: Term = { c: -c, tex: `\\cos^{${n + 1}} x`, answer: `cos(x)^(${n + 1})` };
      return {
        F: [cos],
        slips: [[{ ...cos, c }], [{ ...cos, c: -c * (n + 1) }], [{ c: -c, tex: `\\sin^{${n + 1}} x`, answer: `sin(x)^(${n + 1})` }]],
      };
    }
    case 'xexp': {
      const e = m < 0 ? '-x' : 'x';
      const xe = (k: number): Term => ({ c: k, tex: `xe^{${e}}`, answer: `x*e^(${m}*x)` });
      const ex = (k: number): Term => ({ c: k, tex: `e^{${e}}`, answer: `e^(${m}*x)` });
      return m > 0
        ? { F: [xe(c), ex(-c)], slips: [[xe(c), ex(c)], [xe(c)], [{ c, tex: 'x^{2}e^{x}', answer: 'x^2*e^x' }]] }
        : { F: [xe(-c), ex(-c)], slips: [[xe(-c), ex(c)], [xe(c), ex(c)], [xe(-c)]] };
    }
    case 'xcos': {
      const xs = (k: number): Term => ({ c: k, tex: 'x\\sin x', answer: 'x*sin(x)' });
      const co = (k: number): Term => ({ c: k, tex: '\\cos x', answer: 'cos(x)' });
      return { F: [xs(c), co(c)], slips: [[xs(c), co(-c)], [xs(c)], [{ c, tex: 'x^{2}\\sin x', answer: 'x^2*sin(x)' }]] };
    }
    case 'xsin': {
      const xc = (k: number): Term => ({ c: k, tex: 'x\\cos x', answer: 'x*cos(x)' });
      const si = (k: number): Term => ({ c: k, tex: '\\sin x', answer: 'sin(x)' });
      return { F: [xc(-c), si(c)], slips: [[xc(-c), si(-c)], [xc(c), si(c)], [xc(-c)]] };
    }
  }
}

export function spCase(params: SpParams): SepCase {
  const { k, pre, post, answer } = spFactor(params);
  const body = `${coef(Math.abs(k))}${pre}${post}`;
  const f = `${k < 0 ? '-' : ''}${body}`;
  const { F, slips } = spTerms(params);
  const { form } = params;
  const rhs = form === 'ln' ? `${coef(k)}${pre}y${post}` : withY(form, k, body);
  return { rhs, rhsAnswer: rhsAnswerOf(form, answer), form, f, fAnswer: answer, F, slips };
}

const SP_FORMS: Record<SpKind, YForm[]> = {
  chain: ['sq', 'ey'],
  expsq: ['ey', 'sq'],
  sincos: ['sq', 'ey'],
  xexp: ['ln', 'ey'],
  xcos: ['sq', 'ln'],
  xsin: ['sq', 'ey'],
};

function sampleSp(rng: Rng, difficulty: number, kinds: SpKind[]): SpParams {
  const hard = difficulty >= 2;
  const kind = rng.pick(kinds);
  const form = rng.pick(SP_FORMS[kind]);
  switch (kind) {
    case 'chain':
      return { kind, c: rng.int(1, 3), a: rng.int(1, 5), n: rng.int(1, hard ? 3 : 2), m: 1, form };
    case 'expsq':
      return { kind, c: rng.pick([-3, -2, -1, 1, 2, 3, 4, 5]), a: 0, n: 1, m: 1, form };
    case 'sincos':
      return { kind, c: rng.int(1, 4), a: 0, n: rng.int(1, 3), m: 1, form };
    default:
      return { kind, c: hard ? rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6]) : rng.int(1, 8), a: 0, n: 1, m: kind === 'xexp' ? rng.sign() : 1, form };
  }
}

const uPow = (n: number): string => (n === 1 ? 'u' : `u^{${n}}`);

function spWhy(params: SpParams): SolutionStep {
  const { kind, c, a, n, m } = params;
  const sc = spCase(params);
  const F = sumTex(sc.F);
  const times = c === 1 ? 'So' : `Times $${c}$,`;
  switch (kind) {
    case 'chain':
      return { text: `Substitute $u = x^{2} + ${a}$, so $du = 2x\\,dx$ and the integral is $\\int ${coef(c * (n + 1))}${uPow(n)}\\,du = ${coef(c)}u^{${n + 1}}$. So the $x$ side is $${F}$.` };
    case 'expsq':
      return { text: `Substitute $u = x^{2}$, so $du = 2x\\,dx$ and the integral is $\\int ${coef(c)}e^{u}\\,du = ${coef(c)}e^{u}$. So the $x$ side is $${F}$.` };
    case 'sincos':
      return { text: `Substitute $u = \\cos x$, so $du = -\\sin x\\,dx$ and the integral is $\\int -${c * (n + 1)}${uPow(n)}\\,du = -${coef(c)}u^{${n + 1}}$. So the $x$ side is $${F}$.` };
    case 'xexp':
      return {
        text: `By parts with $u = x$ and $\\frac{dv}{dx} = ${m < 0 ? 'e^{-x}' : 'e^{x}'}$, so $v = ${m < 0 ? '-e^{-x}' : 'e^{x}'}$: $\\int xe^{${m < 0 ? '-x' : 'x'}}\\,dx = ${m < 0 ? '-xe^{-x} - e^{-x}' : 'xe^{x} - e^{x}'}$. ${times} the $x$ side is $${F}$.`,
      };
    case 'xcos':
      return { text: `By parts with $u = x$ and $\\frac{dv}{dx} = \\cos x$, so $v = \\sin x$: $\\int x\\cos x\\,dx = x\\sin x + \\cos x$. ${times} the $x$ side is $${F}$.` };
    case 'xsin':
      return { text: `By parts with $u = x$ and $\\frac{dv}{dx} = \\sin x$, so $v = -\\cos x$: $\\int x\\sin x\\,dx = -x\\cos x + \\sin x$. ${times} the $x$ side is $${F}$.` };
  }
}

const SP_KEYS: KeypadKey[] = [...EXP_KEYS, { insert: 'sin(' }, { insert: 'cos(' }];

function spIntGenerator(id: string, easy: SpKind[], hard: SpKind[]): Generator<SpParams> {
  return {
    id,
    sample: (rng, difficulty) => sampleSp(rng, difficulty, difficulty >= 2 ? hard : easy),
    choices: (params) => {
      const sc = spCase(params);
      const opt = (terms: Term[]) => ({ tex: `${sumTex(terms)} + C`, answer: `${sumAnswer(terms)} + C` });
      return options(opt(sc.F), ...sc.slips.map(opt));
    },
    render: (params): Slide => {
      const sc = spCase(params);
      return {
        kind: 'expression',
        prompt: [prose('Separating'), display(`${DYDX} = ${sc.rhs}`), prose('leaves this integral on the $x$ side. Find it.')],
        lead: `\\int ${sc.f}\\,dx =`,
        keypad: SP_KEYS,
        answer: sumAnswer(sc.F),
        integrand: sc.fAnswer,
        domain: 'real',
        mode: 'upToConstant',
      };
    },
    solution: (params) => {
      const sc = spCase(params);
      return [spWhy(params), { tex: `\\int ${sc.f}\\,dx = ${sumTex(sc.F)} + C` }];
    },
  };
}

/** The x side by substitution, typed. */
const subInt = spIntGenerator('de-hsep-sub-int', ['chain', 'expsq'], ['chain', 'expsq', 'sincos']);

/** The x side by parts, typed. */
const partsInt = spIntGenerator('de-hsep-parts-int', ['xexp', 'xcos', 'xsin'], ['xexp', 'xcos', 'xsin']);

/** Solve a substitution or parts equation one line at a time. */
const spSteps: Generator<SpParams> = {
  id: 'de-hsep-sp-steps',
  sample: (rng, difficulty) => sampleSp(rng, difficulty, difficulty >= 2 ? ['chain', 'expsq', 'sincos', 'xexp', 'xcos', 'xsin'] : ['chain', 'xexp', 'xcos']),
  render: (params) => solveSteps(spCase(params)),
  solution: (params) => solveSolution(spCase(params), spWhy(params)),
};

/** Which technique integrates the x side. */
export type WhichParams = { tech: 'pf'; pf: PfParams } | { tech: 'sub' | 'parts'; sp: SpParams };

export const TECHNIQUES = {
  pf: 'Partial fractions',
  sub: 'Substitution',
  parts: 'Integration by parts',
  fp: 'The top is a multiple of the derivative of the bottom',
} as const;

export const whichCase = (params: WhichParams): SepCase => (params.tech === 'pf' ? pfCase(params.pf) : spCase(params.sp));

const techWhich: Generator<WhichParams> = {
  id: 'de-hsep-which',
  sample: (rng, difficulty) => {
    const tech = rng.pick(['pf', 'sub', 'parts'] as const);
    if (tech === 'pf') return { tech, pf: samplePf(rng, difficulty) };
    return { tech, sp: sampleSp(rng, difficulty, tech === 'sub' ? ['chain', 'expsq', 'sincos'] : ['xexp', 'xcos', 'xsin']) };
  },
  render: (params): Slide => {
    const sc = whichCase(params);
    const salt = params.tech === 'pf' ? mix(params.pf.p, params.pf.q, params.pf.alpha) : mix(params.sp.c, params.sp.a, params.sp.n, params.sp.m, params.sp.kind.length);
    return choiceSlide(
      [prose('Separating the variables leaves this integral on the $x$ side.'), display(`\\int ${sc.f}\\,dx`), prose('Which method integrates it?')],
      (['pf', 'sub', 'parts', 'fp'] as const).map((tech) => ({ label: TECHNIQUES[tech], correct: tech === params.tech })),
      salt,
    );
  },
  solution: (params) => {
    const sc = whichCase(params);
    const reason =
      params.tech === 'pf'
        ? 'The bottom factorises into two different brackets and the top is not a multiple of its derivative, so split it into partial fractions.'
        : params.tech === 'sub'
          ? 'One part is a function of an inside, and the derivative of that inside is the other part, so substitute for the inside.'
          : 'It is $x$ times something that integrates cleanly, so integrate by parts with $u = x$, which differentiates away.';
    const why = params.tech === 'pf' ? pfWhy(params.pf) : spWhy(params.sp);
    return [{ text: reason }, why, { tex: `\\int ${sc.f}\\,dx = ${sumTex(sc.F)} + C` }];
  },
};

/* ============================================================
 * Lesson 5: particular solutions
 * ============================================================ */

/** y = A f(x)^c through a point, then its value elsewhere, as a tree. f is x² + a or e^x + a. */
export interface ThroughParams {
  exp: boolean;
  a: number;
  c: number;
  A: number;
  x0: number;
  /** For exp, x1 stands for x = ln x1. */
  x1: number;
}

const throughBottom = ({ exp, a }: ThroughParams): FpBottom => (exp ? { type: 'exp', m: 1, a } : { type: 'sq', a });

/** f at the question's points, whole by construction: e^(ln k) = k. */
export function throughValues(params: ThroughParams): { f0: number; f1: number; y0: number; y1: number } {
  const { exp, a, c, A, x0, x1 } = params;
  const f0 = exp ? 1 + a : x0 * x0 + a;
  const f1 = exp ? x1 + a : x1 * x1 + a;
  return { f0, f1, y0: A * f0 ** c, y1: A * f1 ** c };
}

const throughPowTex = (params: ThroughParams): string => {
  const b = bottomTex(throughBottom(params));
  return params.c === 1 ? b : `(${b})^{${params.c}}`;
};

const throughX1Tex = ({ exp, x1 }: ThroughParams): string => (exp ? `\\ln ${x1}` : `${x1}`);

const throughTree: Generator<ThroughParams> = {
  id: 'de-hsep-through-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const exp = hard && rng.chance(0.4);
    const c = hard ? rng.int(1, 2) : 1;
    const a = rng.int(1, exp ? 4 : 5);
    const A = rng.int(2, hard ? 6 : 5);
    if (exp) return { exp, a, c, A, x0: 0, x1: rng.int(2, 5) };
    for (;;) {
      const x0 = rng.int(0, 2);
      const x1 = rng.int(0, 3);
      if (x0 !== x1) return { exp, a, c, A, x0, x1 };
    }
  },
  render: (params): Slide => {
    const { c, A, x0 } = params;
    const { f0, f1, y0, y1 } = throughValues(params);
    const sc = fpCase({ bottom: throughBottom(params), c, inv: false });
    const answer = [f0 ** c, A, f1 ** c, y1];
    return {
      kind: 'tree',
      prompt: [
        prose(`Solve $${DYDX} = ${sc.rhs}$ with $y(${x0}) = ${y0}$, and find $y(${throughX1Tex(params)})$.`),
        prose(`Fill in $${throughPowTex(params)}$ at $x = ${x0}$, then $A$, then the same at $x = ${throughX1Tex(params)}$, then $y$ there.`),
      ],
      expression: `y = ${sc.lnTidy}`,
      nodes: [
        { id: 'f0', from: [] },
        { id: 'A', from: ['f0'] },
        { id: 'f1', from: [] },
        { id: 'v', from: ['A', 'f1'] },
      ],
      bank: treeBank(answer, [f0, f1, y0 * f1 ** c, A + f1 ** c, y1 + A, y0]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { c, A, x0 } = params;
    const { f0, f1, y0, y1 } = throughValues(params);
    const sc = fpCase({ bottom: throughBottom(params), c, inv: false });
    const b = bottomTex(throughBottom(params));
    const pow = (v: number) => (c === 1 ? `${v}` : `${v}^{${c}}`);
    return [
      { text: 'The general solution is', tex: `y = ${sc.lnTidy}` },
      { text: `At $x = ${x0}$, $${b} = ${f0}$, so $${y0} = A \\times ${pow(f0)}$.`, tex: `A = ${A}` },
      { text: `At $x = ${throughX1Tex(params)}$, $${b} = ${f1}$.`, tex: `y = ${A} \\times ${pow(f1)} = ${y1}` },
    ];
  },
};

/** A value from a condition, typed. */
export type ValueParams =
  | { kind: 'pf'; p: number; q: number; A: number; x0: number; x1: number }
  | { kind: 'tan'; c: number; A: number; forward: boolean }
  | { kind: 'cot'; c: number; A: number; forward: boolean }
  | { kind: 'inv'; a: number; A: number; x0: number; x1: number };

/** y at the given point, and the point asked about: [given x TeX, given y, asked x TeX, answer]. */
export function valuePoints(params: ValueParams): { at: string; y0: number; to: string; y1: number } {
  switch (params.kind) {
    case 'pf': {
      const { p, q, A, x0, x1 } = params;
      return { at: `${x0}`, y0: (A * (x0 - p)) / (x0 - q), to: `${x1}`, y1: (A * (x1 - p)) / (x1 - q) };
    }
    case 'inv': {
      const { a, A, x0, x1 } = params;
      return { at: `${x0}`, y0: A / (x0 * x0 + a), to: `${x1}`, y1: A / (x1 * x1 + a) };
    }
    case 'tan': {
      const { c, A, forward } = params;
      const far = A * 2 ** c;
      return forward ? { at: '0', y0: A, to: '\\frac{\\pi}{3}', y1: far } : { at: '\\frac{\\pi}{3}', y0: far, to: '0', y1: A };
    }
    case 'cot': {
      const { c, A, forward } = params;
      const near = A / 2 ** c;
      return forward ? { at: '\\frac{\\pi}{2}', y0: A, to: '\\frac{\\pi}{6}', y1: near } : { at: '\\frac{\\pi}{6}', y0: near, to: '\\frac{\\pi}{2}', y1: A };
    }
  }
}

/** The equation each value question solves, as a SepCase. */
export function valueCase(params: ValueParams): SepCase {
  switch (params.kind) {
    case 'pf':
      return pfCase({ p: params.p, q: params.q, alpha: 1, beta: -1, expanded: false });
    case 'inv':
      return fpCase({ bottom: { type: 'sq', a: params.a }, c: -1, inv: false });
    case 'tan':
      return trigCase({ kind: 'tan', c: params.c, k: 1, inv: false });
    case 'cot':
      return trigCase({ kind: 'cot', c: params.c, k: 1, inv: false });
  }
}

function sampleValue(rng: Rng, difficulty: number): ValueParams {
  const hard = difficulty >= 2;
  const kind = rng.pick(hard ? (['pf', 'tan', 'cot', 'inv'] as const) : (['pf', 'tan', 'inv'] as const));
  if (kind === 'tan' || kind === 'cot') {
    const c = hard ? rng.int(1, 2) : 1;
    const base = rng.int(2, 12);
    return { kind, c, A: kind === 'cot' ? base * 2 ** c : base, forward: rng.chance(0.5) };
  }
  for (;;) {
    if (kind === 'inv') {
      const a = rng.int(1, 5);
      const x0 = rng.int(0, 3);
      const x1 = rng.int(0, 3);
      const A = rng.int(1, 8) * (x0 * x0 + a);
      const params: ValueParams = { kind, a, A, x0, x1 };
      const { y1 } = valuePoints(params);
      if (x0 !== x1 && Number.isInteger(y1) && A <= 120) return params;
      continue;
    }
    const p = rng.int(-4, 4);
    const q = rng.int(-4, 4);
    const x0 = rng.int(-3, 8);
    const x1 = rng.int(-3, 8);
    const A = rng.int(1, 12) * rng.sign();
    if (p === q || q === 0 || x0 === x1 || [p, q].includes(x0) || [p, q].includes(x1)) continue;
    const params: ValueParams = { kind, p, q, A, x0, x1 };
    const { y0, y1 } = valuePoints(params);
    if (Number.isInteger(y0) && Number.isInteger(y1) && y0 !== 0 && y1 !== 0 && y0 !== y1 && Math.abs(y0) <= 40 && Math.abs(y1) <= 40) return params;
  }
}

/** A number bracketed when negative, for a product written out. */
const br = (v: number): string => (v < 0 ? `(${v})` : `${v}`);

function valueSolution(params: ValueParams): SolutionStep[] {
  const sc = valueCase(params);
  const { at, y0, to, y1 } = valuePoints(params);
  const general = tidyTex(sc);
  switch (params.kind) {
    case 'pf': {
      const { p, q, A, x0, x1 } = params;
      return [
        { text: 'The general solution is', tex: general },
        { text: `Put in $x = ${x0}$, $y = ${y0}$.`, tex: `${y0} = \\frac{A \\times ${br(x0 - p)}}{${x0 - q}}, \\quad A = ${A}` },
        { text: `At $x = ${x1}$:`, tex: `y = \\frac{${A} \\times ${br(x1 - p)}}{${x1 - q}} = ${y1}` },
      ];
    }
    case 'inv': {
      const { a, A, x0, x1 } = params;
      return [
        { text: 'The general solution is', tex: general },
        { text: `Put in $x = ${x0}$, $y = ${y0}$.`, tex: `${y0} = \\frac{A}{${x0 * x0 + a}}, \\quad A = ${A}` },
        { text: `At $x = ${x1}$:`, tex: `y = \\frac{${A}}{${x1 * x1 + a}} = ${y1}` },
      ];
    }
    case 'tan': {
      const { c, A } = params;
      const pw = c === 1 ? '2' : `2^{${c}}`;
      return [
        { text: `The general solution is $${general}$. $\\sec 0 = 1$ and $\\sec\\frac{\\pi}{3} = 2$.` },
        { text: `Put in $x = ${at}$, $y = ${y0}$.`, tex: `A = ${A}` },
        { text: `At $x = ${to}$:`, tex: `y = ${A} \\times ${to === '0' ? '1' : pw} = ${y1}` },
      ];
    }
    case 'cot': {
      const { c, A } = params;
      const pw = c === 1 ? '\\tfrac{1}{2}' : `(\\tfrac{1}{2})^{${c}}`;
      return [
        { text: `The general solution is $${general}$. $\\sin\\frac{\\pi}{2} = 1$ and $\\sin\\frac{\\pi}{6} = \\frac{1}{2}$.` },
        { text: `Put in $x = ${at}$, $y = ${y0}$.`, tex: `A = ${A}` },
        { text: `At $x = ${to}$:`, tex: `y = ${A} \\times ${to === '\\frac{\\pi}{2}' ? '1' : pw} = ${y1}` },
      ];
    }
  }
}

const valueGen: Generator<ValueParams> = {
  id: 'de-hsep-value',
  sample: sampleValue,
  choices: (params) => {
    const { y0, y1 } = valuePoints(params);
    const A = params.A;
    const wrong =
      params.kind === 'tan'
        ? [params.forward ? A * 2 : y0 / 2, params.forward ? A + 2 ** params.c : y0 * 2 ** params.c, y1 * 2]
        : params.kind === 'cot'
          ? [params.forward ? A / 2 : y0 * 2, params.forward ? A * 2 ** params.c : y0 / 2 ** params.c, y1 + 1]
          : [A, y0, -y1, y1 * 2];
    return numberChoices(y1, wrong, mix(y1, y0, A));
  },
  render: (params): Slide => {
    const sc = valueCase(params);
    const { at, y0, to } = valuePoints(params);
    return {
      kind: 'expression',
      prompt: [prose('Solve'), display(`${DYDX} = ${sc.rhs}`), prose(`with $y(${at}) = ${y0}$, and find $y(${to})$.`)],
      lead: `y(${to}) =`,
      keypad: [],
      answer: `${valuePoints(params).y1}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: valueSolution,
};

/** General solution and a condition, put through step by step. */
export type IvpParams =
  | { kind: 'fp'; a: number; c: number; x0: number; A: number }
  | { kind: 'pf'; p: number; q: number; x0: number; A: number }
  | { kind: 'tan'; c: number; A: number }
  | { kind: 'sq'; sp: SpParams; x0: number; y0: number };

/** The equation, and the particular solution for mathjs. */
export function ivpCase(params: IvpParams): SepCase {
  switch (params.kind) {
    case 'fp':
      return fpCase({ bottom: { type: 'sq', a: params.a }, c: params.c, inv: false });
    case 'pf':
      return pfCase({ p: params.p, q: params.q, alpha: 1, beta: -1, expanded: false });
    case 'tan':
      return trigCase({ kind: 'tan', c: params.c, k: 1, inv: false });
    case 'sq':
      return spCase(params.sp);
  }
}

/** The constant the condition fixes. */
export function ivpConstant(params: IvpParams): number {
  if (params.kind !== 'sq') return params.A;
  const { sp, x0, y0 } = params;
  return y0 * y0 - 2 * sp.c * (x0 * x0 + sp.a) ** (sp.n + 1);
}

export function ivpLines(params: IvpParams): { condition: string; substituted: string; constant: string; particular: string; slips: string[][] } {
  const sc = ivpCase(params);
  const K = ivpConstant(params);
  switch (params.kind) {
    case 'fp': {
      const { a, c, x0, A } = params;
      const f0 = x0 * x0 + a;
      const y0 = c > 0 ? A * f0 ** c : A / f0;
      const b = bottomTex({ type: 'sq', a });
      const sub = c === 1 ? `${y0} = ${f0}A` : c > 1 ? `${y0} = ${f0}^{${c}}A` : `${y0} = \\frac{A}{${f0}}`;
      const part = c === 1 ? `y = ${A}(${b})` : c > 1 ? `y = ${A}(${b})^{${c}}` : `y = \\frac{${A}}{${b}}`;
      return {
        condition: `y(${x0}) = ${y0}`,
        substituted: sub,
        constant: `A = ${A}`,
        particular: part,
        slips: [
          [c === -1 ? `${y0} = ${f0}A` : `${y0} = \\frac{A}{${f0}}`, `${y0} = A + ${f0}`, `${y0} = ${x0}A`],
          [`A = ${c === -1 ? y0 + f0 : y0 * f0}`, `A = ${y0 - f0}`, `A = ${y0}`].filter((s) => s !== `A = ${A}`),
          [c === -1 ? `y = ${A}(${b})` : `y = \\frac{${A}}{${b}}`, `y = ${y0}(${b})`, `y = ${A} + (${b})`],
        ],
      };
    }
    case 'pf': {
      const { p, q, x0, A } = params;
      const n = x0 - p;
      const d = x0 - q;
      const y0 = (A * n) / d;
      return {
        condition: `y(${x0}) = ${y0}`,
        substituted: `${y0} = \\frac{${coef(n)}A}{${d}}`,
        constant: `A = ${A}`,
        particular: `y = ${powersTex([[p, 1], [q, -1]], `${A}`)}`,
        slips: [
          [`${y0} = \\frac{${coef(d)}A}{${n}}`, `${y0} = ${coef(n * d)}A`, `${y0} = \\frac{A}{${n * d}}`],
          [`A = ${y0 * n}`, `A = ${y0 * d * n}`, `A = ${y0}`].filter((s) => s !== `A = ${A}`),
          [`y = ${powersTex([[p, -1], [q, 1]], `${A}`)}`, `y = ${powersTex([[p, 1], [q, -1]], '')} + ${A}`, `y = ${powersTex([[p, 1], [q, -1]], `${y0}`)}`],
        ],
      };
    }
    case 'tan': {
      const { c, A } = params;
      const y0 = A * 2 ** c;
      const main = c === 1 ? '\\sec x' : `\\sec^{${c}} x`;
      return {
        condition: `y(\\tfrac{\\pi}{3}) = ${y0}`,
        substituted: `${y0} = ${c === 1 ? '2' : `2^{${c}}`}A`,
        constant: `A = ${A}`,
        particular: `y = ${A}${main}`,
        slips: [
          [`${y0} = \\tfrac{1}{2}A`, `${y0} = A`, `${y0} = ${c === 1 ? '3' : `3^{${c}}`}A`],
          [`A = ${y0 * 2 ** c}`, `A = ${y0}`, `A = ${y0 - 2 ** c}`].filter((s) => s !== `A = ${A}`),
          [`y = ${A}${c === 1 ? '\\cos x' : `\\cos^{${c}} x`}`, `y = ${y0}${main}`, `y = ${main} + ${A}`],
        ],
      };
    }
    case 'sq': {
      const { sp, x0, y0 } = params;
      const Fx0 = 2 * sp.c * (x0 * x0 + sp.a) ** (sp.n + 1);
      const F2 = sumTex(sc.F, 2);
      return {
        condition: `y(${x0}) = ${y0}`,
        substituted: `${y0 * y0} = ${Fx0} + C`,
        constant: `C = ${K}`,
        particular: `y^{2} = ${F2} ${signed(K)}`,
        slips: [
          [`${y0} = ${Fx0} + C`, `${y0 * y0} = ${Fx0 / 2} + C`, `${y0 * y0} = C`],
          [`C = ${y0 * y0 + Fx0}`, `C = ${y0 - Fx0}`, `C = ${-K}`].filter((s) => s !== `C = ${K}`),
          [`y^{2} = ${F2} ${signed(-K)}`, `y = ${F2} ${signed(K)}`, `y^{2} = ${sumTex(sc.F)} ${signed(K)}`],
        ],
      };
    }
  }
}

function sampleIvp(rng: Rng, difficulty: number): IvpParams {
  const hard = difficulty >= 2;
  const kind = rng.pick(hard ? (['fp', 'pf', 'tan', 'sq', 'sq'] as const) : (['fp', 'pf', 'tan'] as const));
  switch (kind) {
    case 'fp': {
      const c = rng.pick(hard ? [-1, 1, 2] : [-1, 1]);
      const a = rng.int(1, 5);
      const x0 = rng.int(0, 2);
      // A reciprocal solution needs A a multiple of the bottom there, so y is whole.
      const A = c === -1 ? rng.int(1, 6) * (x0 * x0 + a) : rng.int(2, c === 2 ? 5 : 12);
      return { kind, a, c, x0, A };
    }
    case 'tan':
      return { kind, c: rng.int(1, 2), A: rng.int(2, 12) };
    case 'sq': {
      for (;;) {
        const sp: SpParams = { kind: 'chain', c: rng.int(1, 2), a: rng.int(1, 3), n: rng.int(1, 2), m: 1, form: 'sq' };
        const x0 = rng.int(0, 1);
        const y0 = rng.int(1, 12);
        const params: IvpParams = { kind, sp, x0, y0 };
        if (ivpConstant(params) !== 0 && Math.abs(ivpConstant(params)) <= 200) return params;
      }
    }
    case 'pf': {
      for (;;) {
        const p = rng.int(-4, 4);
        const q = rng.int(-4, 4);
        if (p === q || q === 0) continue;
        const x0 = Math.max(p, q) + rng.int(1, 4);
        const A = rng.int(1, 12);
        if (x0 - p === x0 - q) continue;
        // A bracket worth 1 at x0 prints the substitution as a fraction over 1,
        // and makes the "times" slip the same value as the right line.
        if (x0 - p === 1 || x0 - q === 1) continue;
        if (Number.isInteger((A * (x0 - p)) / (x0 - q))) return { kind, p, q, x0, A };
      }
    }
  }
}

const ivpSteps: Generator<IvpParams> = {
  id: 'de-hsep-ivp-steps',
  sample: sampleIvp,
  render: (params): Slide => {
    const sc = ivpCase(params);
    const lines = ivpLines(params);
    const letter = params.kind === 'sq' ? 'C' : 'A';
    return {
      kind: 'steps',
      prompt: [
        prose(`The general solution of $${DYDX} = ${sc.rhs}$ and a condition are below. Tap the comma to put the condition in, then tap the line to find $${letter}$, then again for the particular solution.`),
      ],
      start: [tidyTex(sc), ',', lines.condition],
      reductions: [
        { span: [0, 3], operator: 1, value: lines.substituted, bank: stepBank(lines.substituted, ...lines.slips[0]) },
        { span: [0, 1], operator: 0, value: lines.constant, bank: stepBank(lines.constant, ...lines.slips[1]) },
        { span: [0, 1], operator: 0, value: lines.particular, bank: stepBank(lines.particular, ...lines.slips[2]) },
      ],
    };
  },
  solution: (params) => {
    const lines = ivpLines(params);
    const letter = params.kind === 'sq' ? 'C' : 'A';
    const where =
      params.kind === 'tan'
        ? 'Put $x = \\frac{\\pi}{3}$ into the general solution: $\\sec\\frac{\\pi}{3} = 2$.'
        : 'Put the condition into the general solution.';
    return [
      { text: where, tex: lines.substituted },
      { text: `Solve for $${letter}$.`, tex: lines.constant },
      { text: `Write the general solution again with $${letter}$ replaced.`, tex: lines.particular },
    ];
  },
};

/** Slide to where the solution through a marked point crosses the y-axis. y = A(x² + a) or A/(x² + a). */
export interface SliderParams {
  a: number;
  c: number;
  A: number;
  x1: number;
}

export const sliderAt = ({ a, c, A }: SliderParams, x: number): number => (c > 0 ? A * (x * x + a) : A / (x * x + a));

const hsepSlider: Generator<SliderParams> = {
  id: 'de-hsep-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const c = difficulty >= 2 && rng.chance(0.5) ? -1 : 1;
      const a = rng.int(1, 4);
      const x1 = rng.int(1, 3);
      const A = c > 0 ? rng.int(1, 3) : rng.int(1, 6) * a * (x1 * x1 + a);
      const params = { a, c, A, x1 };
      const y0 = sliderAt(params, 0);
      const y1 = sliderAt(params, x1);
      if (Number.isInteger(y0) && Number.isInteger(y1) && Math.max(y0, y1) <= 40) return params;
    }
  },
  render: (params): Slide => {
    const { a, c, x1 } = params;
    const sc = fpCase({ bottom: { type: 'sq', a }, c, inv: false });
    const y0 = sliderAt(params, 0);
    const y1 = sliderAt(params, x1);
    const top = Math.max(y0, y1);
    const span = Math.ceil((top * 1.25) / 5) * 5;
    const window = markerWindow(0, span, 'y');
    const others = [params.A * 2, params.A / 2].filter((other) => sliderAt({ ...params, A: other }, 0) !== y0);
    return {
      kind: 'slider',
      prompt: [
        prose(`The dashed curves are solutions of $${DYDX} = ${sc.rhs}$ for other values of $A$.`),
        prose(`Slide to the height where the solution through the marked point $(${x1}, ${y1})$ crosses the $y$-axis.`),
      ],
      min: 0,
      max: span,
      step: 1,
      answer: y0,
      readout: 'y(0) = {v}',
      figure: plotFigure(
        plotSvg({
          xMin: -4,
          xMax: 4,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: others.map((other) => ({ f: (x: number) => Math.min(sliderAt({ ...params, A: other }, x), span * 2), dashed: true })),
          marks: [{ x: x1, y: y1 }],
          label: `Dashed solution curves and a marked point at x = ${x1}, height ${y1}`,
        }),
        'y',
      ),
    };
  },
  solution: (params) => {
    const { a, c, A, x1 } = params;
    const sc = fpCase({ bottom: { type: 'sq', a }, c, inv: false });
    const y1 = sliderAt(params, x1);
    const f1 = x1 * x1 + a;
    return [
      { text: 'The general solution is', tex: tidyTex(sc) },
      { text: `At $x = ${x1}$, $x^{2} + ${a} = ${f1}$.`, tex: c > 0 ? `${y1} = ${f1}A, \\quad A = ${A}` : `${y1} = \\frac{A}{${f1}}, \\quad A = ${A}` },
      { text: `At $x = 0$, $x^{2} + ${a} = ${a}$.`, tex: c > 0 ? `y(0) = ${A} \\times ${a} = ${sliderAt(params, 0)}` : `y(0) = \\frac{${A}}{${a}} = ${sliderAt(params, 0)}` },
    ];
  },
};

export const deHarderSeparableGenerators = [
  fpInt,
  fpSteps,
  fpGeneral,
  fpFlow,
  pfSteps,
  pfCover,
  pfGeneral,
  pfFlow,
  trigSteps,
  trigGeneral,
  trigInt,
  trigFlow,
  subInt,
  partsInt,
  spSteps,
  techWhich,
  throughTree,
  valueGen,
  ivpSteps,
  hsepSlider,
] as Generator<never>[];
