/**
 * Differential Equations, Level 10: models of populations and money.
 *
 * Five models, each a first-order equation with constant coefficients:
 * continuous interest `dA/dt = rA`, savings with payments in or out
 * `dA/dt = rA ± d`, a harvested population `dP/dt = kP - H`, a drug decaying
 * in the blood `dC/dt = -kC`, and a steady drip `dC/dt = R - kC`.
 *
 * Every number the learner meets is whole or an exact short decimal, by
 * construction. A percentage rate is a decimal such as 0.05, and the level a
 * model balances at is drawn first so the payment or harvest that makes it
 * comes out whole. Where a value at a later time is asked, the rate is a
 * logarithm, `k = ln 2 / h` (the `LnRate` helpers of `differentialEquations.ts`),
 * so `e^{kt}` at a whole number of periods is a whole power of 2; yearly
 * compounding is `k = ln 1.05`, so `e^{kt}` is `1.05^t` and the start is drawn
 * so that the balance is whole.
 *
 * Nothing here is a plain derivative or integral in x, so no slide declares
 * `source` or `integrand`: `deModels.test.ts` puts each solution back into its
 * equation with mathjs and recomputes each value with `Math.exp`.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { markerWindow, plotFigure, plotSvg } from '../figures';
import { lnTex, type LnRate } from './differentialEquations';
import { gcdOrOne } from './format';
import { mix, numberChoices, stepBank, tokenBank, treeBank, turned } from './parametricImplicit';

/* ---------- Shared helpers ---------- */

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** Leibniz notation for a rate in t. */
const rate = (top: string): string => `\\frac{d${top}}{dt}`;

/** `+ 3` or `- 3`, for appending to a term the learner reads. */
const signed = (c: number): string => (c < 0 ? `- ${-c}` : `+ ${c}`);

/** Lines of working stacked in one display, aligned on their `&`. */
const chain = (...lines: string[]): string => `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;

/** A percentage as the decimal rate the equation carries: 5 to 0.05. */
const dec = (pct: number): string => `${pct / 100}`;

/** Pounds in prose, with thousands separated: £12,000. */
export function money(n: number): string {
  const [whole, part] = (Number.isInteger(n) ? `${n}` : n.toFixed(2)).split('.');
  return `£${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${part ? `.${part}` : ''}`;
}

/** k in front of a letter: `\frac{\ln 2}{8}A`, or `(\ln 2)A` when it has no denominator. */
const kTimes = (k: LnRate, sym: string): string =>
  k.h === 1 ? `${k.sign < 0 ? '-' : ''}(\\ln ${k.b})${sym}` : `${lnTex(k)}${sym}`;

/** `a + be^{ct}` with a zero term dropped, for a slip in a bank. */
function levelPlusExp(a: number, b: number, exp: string): string {
  if (b === 0) return `${a}`;
  const size = Math.abs(b) === 1 ? '' : `${Math.abs(b)}`;
  if (a === 0) return `${b < 0 ? '-' : ''}${size}${exp}`;
  return `${a} ${b < 0 ? '-' : '+'} ${size}${exp}`;
}

interface Pick {
  label: string;
  tex?: boolean;
  correct?: boolean;
}

/** A choice slide written directly, turned by a salt so the answer moves. */
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

/** A typed whole-number answer. */
function numberSlide(prompt: Block[], lead: string, answer: number): Slide {
  return { kind: 'expression', prompt, lead, keypad: [], answer: `${answer}`, domain: 'real', mode: 'exact' };
}

/* ============================================================
 * Lesson 1: continuous interest, dA/dt = rA
 * ============================================================ */

const SAVE_STORIES = [
  '{A0} is put in a savings account paying {p}% a year, compounded continuously.',
  'A trust fund of {A0} earns {p}% a year, compounded continuously.',
  '{A0} is invested at {p}% a year, compounded continuously.',
];

const FALL_STORIES = [
  'A car bought for {A0} loses value continuously, at {p}% of its value a year.',
  'A van bought for {A0} loses value continuously, at {p}% of its value a year.',
  'A machine worth {A0} loses value continuously, at {p}% of its value a year.',
];

const fillStory = (template: string, A0: number, pct: number): string =>
  template.replace('{A0}', money(A0)).replace('{p}', `${pct}`);

export interface InterestParams {
  fall: boolean;
  ctx: number;
  A0: number;
  pct: number;
}

const INTEREST_STARTS = [200, 300, 500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000];

/** The signed rate of an interest story, as a number. */
export const interestRate = ({ fall, pct }: InterestParams): number => ((fall ? -1 : 1) * pct) / 100;

/** A = A0 e^{rt} from words, as tiles. */
const deModelInterestTiles: Generator<InterestParams> = {
  id: 'de-model-interest-tiles',
  sample: (rng, difficulty) => {
    const fall = difficulty >= 2 && rng.chance(0.4);
    return fall
      ? { fall, ctx: rng.int(0, FALL_STORIES.length - 1), A0: rng.pick(INTEREST_STARTS.slice(5)), pct: rng.pick([5, 8, 10, 12, 15, 20, 25]) }
      : { fall, ctx: rng.int(0, SAVE_STORIES.length - 1), A0: rng.pick(INTEREST_STARTS), pct: rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15]) };
  },
  render: (params): Slide => {
    const { fall, ctx, A0, pct } = params;
    const sym = fall ? 'V' : 'A';
    const r = dec(pct);
    const exp = fall ? `e^{-${r}t}` : `e^{${r}t}`;
    const answer = [`${A0}`, exp];
    const story = fillStory((fall ? FALL_STORIES : SAVE_STORIES)[ctx], A0, pct);
    return {
      kind: 'tiles',
      prompt: [prose(`${story} Build its ${fall ? 'value' : 'balance'} $${sym}$ in pounds after $t$ years.`)],
      template: `${sym} = {0}\\,{1}`,
      bank: tokenBank(
        answer,
        [fall ? `e^{-${pct}t}` : `e^{${pct}t}`, fall ? `e^{${r}t}` : `e^{-${r}t}`, `${(100 + (fall ? -pct : pct)) / 100}^{t}`, `${(A0 * pct) / 100}`],
        3,
      ),
      answer,
    };
  },
  solution: (params) => {
    const { fall, A0, pct } = params;
    const sym = fall ? 'V' : 'A';
    const k = interestRate(params);
    return [
      {
        text: `Continuously at ${pct}% a year means the ${fall ? 'value falls' : 'balance grows'} at $${dec(pct)}$ of itself a year${fall ? ', so the rate is negative' : ''}.`,
        tex: `${rate(sym)} = ${k}${sym}`,
      },
      { text: `The solution of $\\frac{dy}{dt} = ky$ is the start value times $e^{kt}$, and the start here is ${money(A0)}.`, tex: `${sym} = ${A0}e^{${k}t}` },
    ];
  },
};

/**
 * Whole doublings or halvings: e^{kt} with k = ± ln b / h at t = m h.
 * One shape for money that doubles and a drug that halves.
 */
export interface TimesParams {
  ctx: number;
  start: number;
  b: number;
  h: number;
  m: number;
  grow: boolean;
}

export const timesValue = ({ start, b, m, grow }: TimesParams): number => (grow ? start * b ** m : start / b ** m);

const GROW_SUBJECTS = ['An investment of {X}', 'A savings pot of {X}', 'A fund of {X}'];
const DOSE_SUBJECTS = ['A patient is given {X} mg of a drug.', 'An injection puts {X} mg of a painkiller into the blood.', 'A dose of {X} mg of an antibiotic is given.'];

const halving = (b: number): string => (b === 2 ? 'halved' : b === 3 ? 'fallen to a third' : `divided by ${b}`);
const doubling = (b: number): string => (b === 2 ? 'doubled' : b === 3 ? 'tripled' : `multiplied by ${b}`);

function timesTree(id: string, grow: boolean): Generator<TimesParams> {
  const sym = grow ? 'A' : 'C';
  return {
    id,
    sample: (rng, difficulty) => {
      const hard = difficulty >= 2;
      for (;;) {
        if (grow) {
          const b = hard ? rng.pick([2, 2, 3]) : 2;
          const m = rng.int(1, b === 3 ? 3 : hard ? 4 : 3);
          const start = 100 * rng.int(1, 50);
          if (start * b ** m > 200000) continue;
          return { ctx: rng.int(0, GROW_SUBJECTS.length - 1), start, b, h: rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15]), m, grow };
        }
        const m = rng.int(hard ? 2 : 1, hard ? 5 : 3);
        const start = rng.int(3, 25) * 5 * 2 ** m;
        if (start > 800) continue;
        return { ctx: rng.int(0, DOSE_SUBJECTS.length - 1), start, b: 2, h: rng.int(2, hard ? 12 : 8), m, grow };
      }
    },
    render: (params): Slide => {
      const { ctx, start, b, h, m } = params;
      const k: LnRate = { b, h, sign: grow ? 1 : -1 };
      const T = m * h;
      const value = timesValue(params);
      const answer = [m, b ** m, value];
      const intro = grow
        ? [prose(`${GROW_SUBJECTS[ctx].replace('{X}', money(start))} grows continuously. Its value $A$ pounds after $t$ years follows`)]
        : [prose(`${DOSE_SUBJECTS[ctx].replace('{X}', `${start}`)} The amount $C$ mg left after $t$ hours follows`)];
      return {
        kind: 'tree',
        prompt: [
          ...intro,
          display(`${rate(sym)} = ${kTimes(k, sym)}`),
          prose(
            grow
              ? `Fill in how many times it has ${doubling(b)} by $t = ${T}$, then the number $e^{kt}$ has multiplied it by, then $A(${T})$.`
              : `Fill in how many times it has ${halving(b)} by $t = ${T}$, then the number it has been divided by, then $C(${T})$.`,
          ),
        ],
        expression: `${sym} = ${start}e^{kt} \\qquad t = ${T}`,
        nodes: [
          { id: 'n', from: [] },
          { id: 'f', from: ['n'] },
          { id: 'v', from: ['f'] },
        ],
        bank: treeBank(answer, [
          m + 1,
          b ** (m + 1),
          grow ? start * b ** (m + 1) : start / b ** (m + 1),
          grow ? start * b * m : start - b ** m,
          T,
          b * m,
        ]),
        answer: answer.map(String),
      };
    },
    solution: (params) => {
      const { start, b, h, m } = params;
      const T = m * h;
      const value = timesValue(params);
      return [
        {
          text: `With $k = ${lnTex({ b, h, sign: grow ? 1 : -1 })}$, $e^{kt} = ${b}^{${grow ? '' : '-'}t/${h}}$: the amount ${grow ? doubling(b).replace('ed', 'es') : `is ${halving(b)}`} every ${h} ${grow ? 'years' : 'hours'}.`,
        },
        { text: `$t = ${T}$ is ${m} lot${m === 1 ? '' : 's'} of ${h}.`, tex: `${b}^{${m}} = ${b ** m}` },
        { tex: `${sym}(${T}) = ${start} ${grow ? '\\times' : '\\div'} ${b ** m} = ${value}` },
      ];
    },
  };
}

const deModelDoubleTree = timesTree('de-model-double-tree', true);

/** Yearly compounding as a continuous rate: dA/dt = (ln 1.05)A makes A = A0 × 1.05^t. */
export interface YearlyParams {
  ctx: number;
  A0: number;
  pct: number;
  t: number;
}

const YEARLY_SUBJECTS = ['{X} is saved in an account.', 'A fund starts with {X}.', 'A bond is bought for {X}.'];

export const yearlyValue = ({ A0, pct, t }: YearlyParams): number => (A0 * (100 + pct) ** t) / 100 ** t;

const yearlyFactor = (pct: number): string => `${(100 + pct) / 100}`;

const deModelYearly: Generator<YearlyParams> = {
  id: 'de-model-yearly',
  sample: (rng, difficulty) => {
    for (;;) {
      const pct = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]);
      const t = difficulty >= 2 ? rng.pick([2, 2, 3]) : 1;
      const whole = 100 ** t / gcdOrOne((100 + pct) ** t, 100 ** t);
      // A round sum of money, at least a multiple of 100.
      const unit = (whole * 100) / gcdOrOne(whole, 100);
      if (unit > 20000) continue;
      const A0 = unit * rng.int(1, Math.floor(20000 / unit));
      if (A0 < 200) continue;
      return { ctx: rng.int(0, YEARLY_SUBJECTS.length - 1), A0, pct, t };
    }
  },
  choices: (params) => {
    const { A0, pct, t } = params;
    const value = yearlyValue(params);
    return numberChoices(
      value,
      [A0 + (A0 * pct * t) / 100, yearlyValue({ ...params, t: t + 1 }), t >= 2 ? yearlyValue({ ...params, t: t - 1 }) : A0 + pct, (A0 * pct) / 100],
      mix(A0, pct, t),
    );
  },
  render: (params): Slide => {
    const { ctx, A0, pct, t } = params;
    return numberSlide(
      [
        prose(`${YEARLY_SUBJECTS[ctx].replace('{X}', money(A0))} Its balance $A$ pounds after $t$ years follows`),
        display(`${rate('A')} = (\\ln ${yearlyFactor(pct)})A`),
        prose(`What is the balance after ${t} year${t === 1 ? '' : 's'}?`),
      ],
      `A(${t}) =`,
      yearlyValue(params),
    );
  },
  solution: (params) => {
    const { A0, pct, t } = params;
    const f = yearlyFactor(pct);
    return [
      { text: 'The solution is the start times $e^{kt}$, and $e^{t\\ln a} = a^{t}$.', tex: chain(`A &= ${A0}e^{t\\ln ${f}}`, `&= ${A0} \\times ${f}^{t}`) },
      { text: `That is ${pct}% a year, compounded yearly.`, tex: `A(${t}) = ${A0} \\times ${f}^{${t}} = ${yearlyValue(params)}` },
    ];
  },
};

/** The time a doubling (or halving) value reaches a level, on a slider along t. */
export interface ReachParams {
  ctx: number;
  start: number;
  h: number;
  m: number;
  grow: boolean;
  /** Extra periods drawn beyond the answer. */
  extra: number;
}

const CAR_SUBJECTS = ['A car bought for {X}', 'A van bought for {X}', 'A tractor bought for {X}'];

export const reachTarget = ({ start, m, grow }: ReachParams): number => (grow ? start * 2 ** m : start / 2 ** m);

const deModelReachSlider: Generator<ReachParams> = {
  id: 'de-model-reach-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const grow = !(hard && rng.chance(0.4));
      const m = rng.int(1, hard ? 4 : 3);
      const h = rng.int(2, 12);
      const extra = rng.int(1, 2);
      const start = grow ? 500 * rng.int(1, 10) : 1000 * 2 ** m * rng.int(1, 4);
      if (!grow && start > 40000) continue;
      const params = { ctx: rng.int(0, 2), start, h, m, grow, extra };
      // Not where the handle rests untouched.
      if (Math.round(((m + extra) * h) / 2) === m * h) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { ctx, start, h, m, grow, extra } = params;
    const sym = grow ? 'A' : 'V';
    const k: LnRate = { b: 2, h, sign: grow ? 1 : -1 };
    const target = reachTarget(params);
    const xMax = (m + extra) * h;
    const f = (t: number) => start * 2 ** ((grow ? 1 : -1) * (t / h));
    return {
      kind: 'slider',
      prompt: [
        prose(
          grow
            ? `${GROW_SUBJECTS[ctx].replace('{X}', money(start))} grows continuously. Its value $A$ pounds after $t$ years follows`
            : `${CAR_SUBJECTS[ctx].replace('{X}', money(start))} loses value continuously. Its value $V$ pounds after $t$ years follows`,
        ),
        display(`${rate(sym)} = ${kTimes(k, sym)}`),
        prose(`Slide to the time it ${grow ? 'reaches' : 'falls to'} ${money(target)}, the dashed line.`),
      ],
      min: 0,
      max: xMax,
      step: 1,
      answer: m * h,
      readout: 't = {v}',
      figure: plotFigure(
        plotSvg({
          xMin: 0,
          xMax,
          curves: [{ f }],
          horizontals: [target],
          marks: [{ x: 0, y: start }],
          label: `A curve starting at ${start} and ${grow ? 'rising' : 'falling'}, with a dashed line at ${target}`,
        }),
        'x',
      ),
    };
  },
  solution: (params) => {
    const { start, h, m, grow } = params;
    const target = reachTarget(params);
    const ratio = 2 ** m;
    return [
      { text: `With $k = ${lnTex({ b: 2, h, sign: grow ? 1 : -1 })}$ the value ${grow ? 'doubles' : 'halves'} every ${h} years.` },
      { tex: grow ? `${target} \\div ${start} = ${ratio} = 2^{${m}}` : `${start} \\div ${target} = ${ratio} = 2^{${m}}` },
      { text: `So it takes ${m} ${grow ? 'doubling' : 'halving'}${m === 1 ? '' : 's'}.`, tex: `t = ${m} \\times ${h} = ${m * h}` },
    ];
  },
};

/* ============================================================
 * Lesson 2: saving and spending, dA/dt = rA + d or rA - w
 * ============================================================ */

const FUND_SUBJECTS = ['An account', 'A pension pot', "A charity's fund"];

export interface SaveParams {
  ctx: number;
  pct: number;
  A0: number;
  paidIn: number;
  takenOut: number;
}

/** The constant term: paid in minus taken out. */
export const saveNet = ({ paidIn, takenOut }: SaveParams): number => paidIn - takenOut;

const deModelSaveTiles: Generator<SaveParams> = {
  id: 'de-model-save-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const pct = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const both = difficulty >= 2 && rng.chance(0.5);
      const a = 100 * rng.int(5, 60);
      const b = 100 * rng.int(5, 60);
      const out = rng.chance(0.5);
      const paidIn = both ? a : out ? 0 : a;
      const takenOut = both ? b : out ? a : 0;
      if (paidIn === takenOut) continue;
      return { ctx: rng.int(0, FUND_SUBJECTS.length - 1), pct, A0: 1000 * rng.int(2, 50), paidIn, takenOut };
    }
  },
  render: (params): Slide => {
    const { ctx, pct, A0, paidIn, takenOut } = params;
    const net = saveNet(params);
    const flows =
      paidIn > 0 && takenOut > 0
        ? `${money(paidIn)} a year is paid in and ${money(takenOut)} a year is taken out, both spread evenly through the year.`
        : paidIn > 0
          ? `${money(paidIn)} a year is paid in, spread evenly through the year.`
          : `${money(takenOut)} a year is taken out, spread evenly through the year.`;
    const answer = [dec(pct), signed(net)];
    const extras =
      paidIn > 0 && takenOut > 0
        ? [signed(paidIn), signed(-takenOut), signed(-net), `${pct}`]
        : [signed(-net), `${pct}`, signed((Math.abs(net) * pct) / 100)];
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `${FUND_SUBJECTS[ctx]} holds ${money(A0)} and earns ${pct}% a year, compounded continuously. ${flows} Its balance is $A$ pounds after $t$ years. Build the equation.`,
        ),
      ],
      template: `${rate('A')} = {0}A {1}`,
      bank: tokenBank(answer, extras, 3),
      answer,
    };
  },
  solution: (params) => {
    const { pct, paidIn, takenOut } = params;
    const net = saveNet(params);
    const steps: SolutionStep[] = [{ text: `Interest adds $${dec(pct)}$ of the balance a year: $${dec(pct)}A$.` }];
    if (paidIn > 0 && takenOut > 0) {
      steps.push({ text: 'Money paid in adds to the rate and money taken out takes away from it.', tex: `${paidIn} - ${takenOut} = ${net}` });
    } else {
      steps.push({ text: paidIn > 0 ? `Paying in adds $${paidIn}$ a year.` : `Taking out subtracts $${takenOut}$ a year.` });
    }
    steps.push({ tex: `${rate('A')} = ${dec(pct)}A ${signed(net)}` });
    return steps;
  },
};

/** The balance that stays level, w / r. */
export interface LevelParams {
  ctx: number;
  pct: number;
  L: number;
  words: boolean;
}

export const levelOut = ({ pct, L }: LevelParams): number => (L * pct) / 100;

const deModelSaveLevel: Generator<LevelParams> = {
  id: 'de-model-save-level',
  sample: (rng, difficulty) => ({
    ctx: rng.int(0, FUND_SUBJECTS.length - 1),
    pct: rng.pick([2, 3, 4, 5, 6, 8, 10]),
    L: 1000 * rng.int(5, 150),
    words: difficulty >= 2,
  }),
  choices: (params) => {
    const { pct, L } = params;
    const w = levelOut(params);
    return numberChoices(L, [(w * pct) / 100, w * pct, L / 10, 2 * L], mix(pct, L));
  },
  render: (params): Slide => {
    const { ctx, pct, words } = params;
    const w = levelOut(params);
    const prompt = words
      ? [
          prose(
            `${FUND_SUBJECTS[ctx]} earns ${pct}% a year, compounded continuously, and pays out ${money(w)} a year, spread evenly. How big must it be to pay this out forever, staying exactly level?`,
          ),
        ]
      : [
          prose(`${FUND_SUBJECTS[ctx]} holds $A$ pounds after $t$ years, where`),
          display(`${rate('A')} = ${dec(pct)}A - ${w}`),
          prose('What balance stays exactly level?'),
        ];
    return numberSlide(prompt, 'A =', params.L);
  },
  solution: (params) => {
    const { pct, L } = params;
    const w = levelOut(params);
    return [
      { text: 'A level balance is not changing, so the rate is zero.', tex: chain(`${dec(pct)}A - ${w} &= 0`, `${dec(pct)}A &= ${w}`, `A &= ${w} \\div ${dec(pct)}`, `A &= ${L}`) },
      { text: `The interest on ${money(L)} is exactly the ${money(w)} paid out.` },
    ];
  },
};

/** Solve dA/dt = r(A - L) with A(0) = A0; at difficulty 2 it starts as rA - w. */
export interface SaveStepsParams {
  pct: number;
  L: number;
  A0: number;
  expanded: boolean;
}

export const saveSolutionAnswer = ({ pct, L, A0 }: SaveStepsParams): string => `${L} + (${A0 - L})*e^((${pct / 100})*t)`;

const deModelSaveSteps: Generator<SaveStepsParams> = {
  id: 'de-model-save-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const L = 1000 * rng.int(10, 80);
      const A0 = L + (rng.chance(0.5) ? 1 : -1) * 1000 * rng.int(1, 20);
      if (A0 <= 0) continue;
      return { pct: rng.pick([2, 4, 5, 8, 10]), L, A0, expanded: difficulty >= 2 };
    }
  },
  render: (params): Slide => {
    const { pct, L, A0, expanded } = params;
    const r = dec(pct);
    const w = (L * pct) / 100;
    const exp = `e^{${r}t}`;
    const factored = `${rate('A')} = ${r}(A - ${L})`;
    // Bars as `\vert`: a steps token holding a literal `|` is misread by
    // the widget's `span|value` parsing and drawn wrong once chosen.
    const logged = `\\ln\\left\\vert A - ${L}\\right\\vert = ${r}t + C`;
    const general = `A - ${L} = B${exp}`;
    const particular = `A = ${levelPlusExp(L, A0 - L, exp)}`;
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [];
    if (expanded) {
      reductions.push({
        span: [0, 1],
        operator: 0,
        value: factored,
        bank: stepBank(factored, `${rate('A')} = ${r}(A - ${w})`, `${rate('A')} = ${r}(A + ${L})`, `${rate('A')} = ${r}(A - ${L * 10})`),
      });
    }
    reductions.push(
      {
        span: [0, 3],
        operator: 1,
        value: logged,
        bank: stepBank(logged, `\\ln\\left\\vert A - ${L}\\right\\vert = -${r}t + C`, `\\ln\\vert A\\vert = ${r}t + C`, `A - ${L} = ${r}t + C`),
      },
      {
        span: [0, 1],
        operator: 0,
        value: general,
        bank: stepBank(general, `A - ${L} = Be^{-${r}t}`, `A = B${exp}`, `A - ${L} = ${exp} + B`),
      },
      {
        span: [0, 1],
        operator: 0,
        value: particular,
        bank: stepBank(
          particular,
          `A = ${levelPlusExp(L, L - A0, exp)}`,
          `A = ${levelPlusExp(L, A0, exp)}`,
          `A = ${levelPlusExp(A0, L - A0, exp)}`,
        ),
      },
    );
    return {
      kind: 'steps',
      prompt: [
        prose(
          `A fund holds $A$ pounds after $t$ years. Solve it step by step: ${expanded ? `tap the equation to take out $${r}$, then ` : ''}tap the comma to separate and integrate, then the line to undo the log, then again to use the start.`,
        ),
      ],
      start: [expanded ? `${rate('A')} = ${r}A - ${w}` : factored, ',', `A(0) = ${A0}`],
      reductions,
    };
  },
  solution: (params) => {
    const { pct, L, A0, expanded } = params;
    const r = dec(pct);
    const steps: SolutionStep[] = [];
    if (expanded) steps.push({ text: `Take out $${r}$: $${(L * pct) / 100} \\div ${r} = ${L}$.`, tex: `${rate('A')} = ${r}(A - ${L})` });
    steps.push(
      { text: `Divide by $A - ${L}$, multiply by $dt$ and integrate.`, tex: `\\ln\\left|A - ${L}\\right| = ${r}t + C` },
      { text: 'Take $e$ to the power of each side, with $B = \\pm e^{C}$.', tex: `A - ${L} = Be^{${r}t}` },
      { text: `At $t = 0$, $B = ${A0} - ${L} = ${A0 - L}$.`, tex: `A = ${levelPlusExp(L, A0 - L, `e^{${r}t}`)}` },
    );
    return steps;
  },
};

/**
 * Where a fund or a harvested population ends up: dy/dt = ky - c with k > 0.
 * The level L = c/k is unstable, so a start above it grows and one below it
 * falls to zero.
 */
export interface FateParams {
  ctx: number;
  pct: number;
  L: number;
  y0: number;
}

interface FateWords {
  sym: string;
  /** The whole start sentence, `{y0}` for the start. */
  intro: string[];
  it: string;
  grows: string;
  ends: string;
  stays: string;
  settles: (L: number) => string;
  /** One unit of the quantity: 1000 pounds, 100 animals. */
  unit: number;
}

const FUND_FATE: FateWords = {
  sym: 'A',
  intro: ['A fund starts with {y0}. Its balance $A$ pounds after $t$ years follows', 'A pension pot starts with {y0}. Its balance $A$ pounds after $t$ years follows'],
  it: 'fund',
  grows: 'It grows faster and faster',
  ends: 'It falls faster and faster and runs out',
  stays: 'It stays exactly level',
  settles: (L) => `It levels off at ${money(L)}`,
  unit: 1000,
};

const HARVEST_FATE: FateWords = {
  sym: 'P',
  intro: ['A lake holds {y0} fish. The number $P$ after $t$ years follows', 'A forest park holds {y0} deer. The number $P$ after $t$ years follows'],
  it: 'population',
  grows: 'It grows faster and faster',
  ends: 'It shrinks faster and faster and dies out',
  stays: 'It stays exactly the same size',
  settles: (L) => `It levels off at ${L}`,
  unit: 100,
};

export const fateOut = ({ pct, L }: FateParams): number => (L * pct) / 100;

function fateFlow(id: string, words: FateWords, pcts: number[]): Generator<FateParams> {
  const s = words.sym;
  // A quantity named in a sentence: pounds as money, as every other line about a fund says them.
  const say = (v: number): string => (s === 'A' ? money(v) : `$${v}$`);
  return {
    id,
    sample: (rng, difficulty) => {
      for (;;) {
        const L = words.unit * rng.int(5, 60);
        const level = difficulty >= 2 && rng.chance(0.2);
        const y0 = level ? L : L + (rng.chance(0.5) ? 1 : -1) * words.unit * rng.int(1, 20);
        if (y0 <= 0) continue;
        return { ctx: rng.int(0, words.intro.length - 1), pct: rng.pick(pcts), L, y0 };
      }
    },
    render: (params): Slide => {
      const { ctx, pct, L, y0 } = params;
      const r = pct / 100;
      const out = fateOut(params);
      const at = (y: number) => Math.round(r * y - out);
      const salt = mix(pct, L, y0);
      const start = at(y0);
      const signLabel = start > 0 ? 'Positive' : start < 0 ? 'Negative' : 'Zero';
      const fate = start > 0 ? words.grows : start < 0 ? words.ends : words.stays;
      const fates = [words.grows, words.ends, words.stays, words.settles(L)];
      const why = (label: string): string => {
        if (label === words.settles(L)) return `That needs the rate to shrink as the ${words.it} nears ${say(L)}. Here the gap to ${say(L)} feeds itself and grows.`;
        if (label === words.stays) return `Only a start of exactly ${say(L)} stays put, and this starts at ${say(y0)}.`;
        if (start === 0) return `The rate is zero at the start, so the ${words.it} does not move at all.`;
        return start < 0
          ? `A negative rate makes the ${words.it} fall, and a smaller ${words.it} falls faster still.`
          : `A positive rate makes the ${words.it} grow, and a bigger ${words.it} grows faster still.`;
      };
      return {
        kind: 'flow',
        prompt: [prose(`${words.intro[ctx].replace('{y0}', s === 'A' ? money(y0) : `${y0}`)} the equation below. What happens to it?`)],
        subject: `${rate(s)} = ${dec(pct)}${s} - ${out}`,
        steps: [
          {
            id: 'level',
            ask: 'Where is the rate zero?',
            branches: turned(
              [
                { label: `$${s} = ${L}$`, to: 'sign' },
                { label: `$${s} = ${out}$`, outcome: `At $${s} = ${out}$ the rate is $${at(out)}$.` },
                { label: `$${s} = 0$`, outcome: `At $${s} = 0$ the rate is $${at(0)}$.` },
              ],
              salt % 3,
            ),
          },
          {
            id: 'sign',
            ask: `At the start $${s} = ${y0}$. Is the rate positive, negative or zero?`,
            branches: turned(
              ['Positive', 'Negative', 'Zero'].map((label) =>
                label === signLabel ? { label, to: 'fate' } : { label, outcome: `At $${s} = ${y0}$ the rate is $${dec(pct)} \\times ${y0} - ${out} = ${start}$.` },
              ),
              (salt >>> 3) % 3,
            ),
          },
          {
            id: 'fate',
            ask: `So what happens to the ${words.it}?`,
            branches: turned(
              fates.map((label) =>
                label === fate
                  ? { label, outcome: start === 0 ? `Its rate is zero, so it never changes.` : start > 0 ? `It is above ${say(L)}, so it moves further above it, faster and faster.` : `It is below ${say(L)}, so it moves further below it until it reaches zero.` }
                  : { label, outcome: why(label) },
              ),
              (salt >>> 6) % 4,
            ),
          },
        ],
        answer: [`$${s} = ${L}$`, signLabel, fate],
      };
    },
    solution: (params) => {
      const { pct, L, y0 } = params;
      const out = fateOut(params);
      const start = Math.round((pct / 100) * y0 - out);
      return [
        { text: 'The rate is zero where the growth balances what is taken.', tex: chain(`${dec(pct)}${s} - ${out} &= 0`, `${s} &= ${L}`) },
        { text: 'At the start:', tex: `${dec(pct)} \\times ${y0} - ${out} = ${start}` },
        {
          text:
            start === 0
              ? `The rate is zero, so the ${words.it} stays at ${say(L)}.`
              : start > 0
                ? `Positive, and above ${say(L)} the rate only gets bigger as the ${words.it} grows. ${words.grows}.`
                : `Negative, and below ${say(L)} the rate only gets more negative as the ${words.it} shrinks. ${words.ends}.`,
        },
      ];
    },
  };
}

const deModelSaveFlow = fateFlow('de-model-save-flow', FUND_FATE, [2, 4, 5, 8, 10]);

/* ============================================================
 * Lesson 3: harvesting a population, dP/dt = kP - H
 * ============================================================ */

interface Herd {
  animals: string;
  place: string;
  where: string;
  taken: string;
  added: string;
}

const HERDS: Herd[] = [
  { animals: 'fish', place: 'A lake', where: 'in a lake', taken: 'caught', added: 'released from a hatchery' },
  { animals: 'deer', place: 'A forest park', where: 'in a forest park', taken: 'culled', added: 'brought in from another park' },
  { animals: 'rabbits', place: 'An island', where: 'on an island', taken: 'trapped', added: 'brought over from the mainland' },
  { animals: 'trout', place: 'A fish farm', where: 'on a fish farm', taken: 'taken out for sale', added: 'added as young fish' },
];

const HARVEST_PCTS = [5, 10, 15, 20, 25, 30, 40, 50];

export interface HarvestParams {
  ctx: number;
  pct: number;
  P0: number;
  caught: number;
  added: number;
}

export const harvestNet = ({ caught, added }: HarvestParams): number => added - caught;

const deModelHarvestTiles: Generator<HarvestParams> = {
  id: 'de-model-harvest-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const caught = 10 * rng.int(2, 60);
      const added = difficulty >= 2 && rng.chance(0.5) ? 10 * rng.int(1, 40) : 0;
      if (added === caught) continue;
      return { ctx: rng.int(0, HERDS.length - 1), pct: rng.pick(HARVEST_PCTS), P0: 100 * rng.int(5, 80), caught, added };
    }
  },
  render: (params): Slide => {
    const { ctx, pct, P0, caught, added } = params;
    const herd = HERDS[ctx];
    const net = harvestNet(params);
    const flows =
      added > 0
        ? `${caught} a year are ${herd.taken} and ${added} a year are ${herd.added}, spread through the year.`
        : `${caught} a year are ${herd.taken}, spread through the year.`;
    const answer = [dec(pct), signed(net)];
    const extras = added > 0 ? [signed(-caught), signed(added), signed(-net), `${pct}`] : [signed(-net), `${pct}`, signed(-P0)];
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `${herd.place} holds ${P0} ${herd.animals}. Left alone, their number grows at ${pct}% of itself a year. ${flows} $P$ is the number after $t$ years. Build the equation.`,
        ),
      ],
      template: `${rate('P')} = {0}P {1}`,
      bank: tokenBank(answer, extras, 3),
      answer,
    };
  },
  solution: (params) => {
    const { pct, caught, added } = params;
    const net = harvestNet(params);
    const steps: SolutionStep[] = [{ text: `Growth at ${pct}% of the population is $${dec(pct)}P$ a year.` }];
    if (added > 0) steps.push({ text: 'Animals added count plus, animals taken count minus.', tex: `${added} - ${caught} = ${net}` });
    else steps.push({ text: `Taking ${caught} a year subtracts $${caught}$.` });
    steps.push({ tex: `${rate('P')} = ${dec(pct)}P ${signed(net)}` });
    return steps;
  },
};

/** The population that stays the same size, H / k. */
export interface HarvestLevelParams {
  ctx: number;
  pct: number;
  E: number;
  words: boolean;
}

export const harvestTaken = ({ pct, E }: HarvestLevelParams): number => (E * pct) / 100;

const deModelHarvestLevel: Generator<HarvestLevelParams> = {
  id: 'de-model-harvest-level',
  sample: (rng, difficulty) => ({ ctx: rng.int(0, HERDS.length - 1), pct: rng.pick(HARVEST_PCTS), E: 100 * rng.int(3, 60), words: difficulty >= 2 }),
  choices: (params) => {
    const { pct, E } = params;
    const H = harvestTaken(params);
    return numberChoices(E, [(H * pct) / 100, H * pct, E / 10, 2 * E], mix(pct, E, 7));
  },
  render: (params): Slide => {
    const { ctx, pct, words } = params;
    const herd = HERDS[ctx];
    const H = harvestTaken(params);
    const prompt = words
      ? [
          prose(
            `The ${herd.animals} ${herd.where} grow at ${pct}% of their number a year, and ${H} a year are ${herd.taken}. At what number would the population stay the same size?`,
          ),
        ]
      : [
          prose(`The number $P$ of ${herd.animals} ${herd.where} after $t$ years follows`),
          display(`${rate('P')} = ${dec(pct)}P - ${H}`),
          prose('At what population does it stay the same size?'),
        ];
    return numberSlide(prompt, 'P =', params.E);
  },
  solution: (params) => {
    const { pct, E } = params;
    const H = harvestTaken(params);
    return [
      { text: 'The same size means the rate is zero: growth balances the harvest.', tex: chain(`${dec(pct)}P - ${H} &= 0`, `${dec(pct)}P &= ${H}`, `P &= ${H} \\div ${dec(pct)}`, `P &= ${E}`) },
    ];
  },
};

/** The largest harvest a population can bear: k P0; or, reversed, the smallest population that bears H. */
export interface MaxParams {
  ctx: number;
  pct: number;
  P0: number;
  reverse: boolean;
}

export const maxHarvest = ({ pct, P0 }: MaxParams): number => (P0 * pct) / 100;

const deModelHarvestMax: Generator<MaxParams> = {
  id: 'de-model-harvest-max',
  sample: (rng, difficulty) => ({
    ctx: rng.int(0, HERDS.length - 1),
    pct: rng.pick([5, 10, 20, 25, 40, 50]),
    P0: 100 * rng.int(5, 80),
    reverse: difficulty >= 2 && rng.chance(0.5),
  }),
  render: (params): Slide => {
    const { ctx, pct, P0, reverse } = params;
    const herd = HERDS[ctx];
    const H = maxHarvest(params);
    const correct = reverse ? P0 : H;
    const wrong = reverse ? [(H * pct) / 100, H, P0 / 2, 2 * P0, H * pct] : [P0, 2 * H, H / 2, P0 - H];
    const options = numberChoices(correct, wrong, 0);
    const prompt = reverse
      ? [
          prose(`Left alone, the number $P$ of ${herd.animals} ${herd.where} follows`),
          display(`${rate('P')} = ${dec(pct)}P`),
          prose(`${H} a year are to be ${herd.taken}. What is the smallest population that can bear this without falling?`),
        ]
      : [
          prose(`${herd.place} holds ${P0} ${herd.animals}. Left alone, their number $P$ after $t$ years follows`),
          display(`${rate('P')} = ${dec(pct)}P`),
          prose(`What is the largest number that can be ${herd.taken} a year without the population falling?`),
        ];
    return choiceSlide(
      prompt,
      options.map((option: ChoiceOption) => ({ label: option.tex, tex: true, correct: option.correct })),
      mix(pct, P0, reverse ? 1 : 0),
    );
  },
  solution: (params) => {
    const { pct, P0, reverse } = params;
    const H = maxHarvest(params);
    return reverse
      ? [
          { text: `It does not fall while the growth $${dec(pct)}P$ is at least the ${H} taken.`, tex: chain(`${dec(pct)}P &= ${H}`, `P &= ${H} \\div ${dec(pct)}`, `P &= ${P0}`) },
        ]
      : [
          { text: `Now it grows by $${dec(pct)} \\times ${P0} = ${H}$ a year.` },
          { text: `Catching ${H} a year, the rate at the start is`, tex: `${dec(pct)} \\times ${P0} - ${H} = 0` },
          { text: `Catching more than ${H} makes it negative, and a smaller population then grows more slowly still, so it keeps falling.` },
        ];
  },
};

const deModelHarvestFlow = fateFlow('de-model-harvest-flow', HARVEST_FATE, [10, 20, 25, 40, 50]);

/* ============================================================
 * Lesson 4: a drug in the bloodstream, dC/dt = -kC
 * ============================================================ */

const deModelHalveTree = timesTree('de-model-halve-tree', false);

/** The half-life and k from two readings. */
export interface HalfLifeParams {
  ctx: number;
  C1: number;
  m: number;
  h: number;
}

const halfLifeK = (h: number): string => `\\frac{\\ln 2}{${h}}`;

const deModelHalflifeTree: Generator<HalfLifeParams> = {
  id: 'de-model-halflife-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const m = rng.int(hard ? 2 : 1, hard ? 4 : 3);
      const C1 = 5 * rng.int(1, 12);
      if (C1 * 2 ** m > 800) continue;
      return { ctx: rng.int(0, DOSE_SUBJECTS.length - 1), C1, m, h: rng.int(2, hard ? 12 : 8) };
    }
  },
  render: (params): Slide => {
    const { ctx, C1, m, h } = params;
    const C0 = C1 * 2 ** m;
    const T = m * h;
    const k = halfLifeK(h);
    const numbers = treeBank([2 ** m, m, h], [C0 - C1, T, m + 1, 2 ** (m + 1), h + 1]);
    const kTokens = [...new Set([k, halfLifeK(T), `\\frac{${h}}{\\ln 2}`, `\\frac{\\ln ${2 ** m}}{${h}}`])].sort((p, q) => p.localeCompare(q));
    return {
      kind: 'tree',
      prompt: [
        prose(`${DOSE_SUBJECTS[ctx].replace('{X}', `${C0}`)} After ${T} hours ${C1} mg are left. The amount $C$ mg follows $${rate('C')} = -kC$.`),
        prose('Fill in how many times smaller it got, how many halvings that is, the half-life in hours, then $k$.'),
      ],
      expression: `C(0) = ${C0} \\qquad C(${T}) = ${C1}`,
      nodes: [
        { id: 'r', from: [] },
        { id: 'n', from: ['r'] },
        { id: 'h', from: ['n'] },
        { id: 'k', from: ['h'] },
      ],
      bank: [...numbers, ...kTokens],
      answer: [`${2 ** m}`, `${m}`, `${h}`, k],
    };
  },
  solution: (params) => {
    const { C1, m, h } = params;
    const C0 = C1 * 2 ** m;
    const T = m * h;
    return [
      { tex: `${C0} \\div ${C1} = ${2 ** m} = 2^{${m}}` },
      { text: `So it halved ${m} time${m === 1 ? '' : 's'} in ${T} hours: the half-life is $${T} \\div ${m} = ${h}$ hours.` },
      { text: 'Halving every $h$ hours means $e^{-kh} = \\frac{1}{2}$.', tex: `k = ${halfLifeK(h)}` },
    ];
  },
};

/** The time to fall to a level: m half-lives. */
export interface DoseWhenParams {
  ctx: number;
  C1: number;
  m: number;
  h: number;
  hint: boolean;
}

const deModelDoseWhen: Generator<DoseWhenParams> = {
  id: 'de-model-dose-when',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const m = rng.int(hard ? 2 : 1, hard ? 5 : 3);
      const C1 = 5 * rng.int(1, 10);
      if (C1 * 2 ** m > 800) continue;
      return { ctx: rng.int(0, DOSE_SUBJECTS.length - 1), C1, m, h: rng.int(2, hard ? 12 : 8), hint: !hard };
    }
  },
  choices: (params) => {
    const { m, h } = params;
    return numberChoices(m * h, [m, (m + 1) * h, 2 ** m * h, (m - 1) * h], mix(m, h, params.C1));
  },
  render: (params): Slide => {
    const { ctx, C1, m, h, hint } = params;
    const C0 = C1 * 2 ** m;
    return numberSlide(
      [
        prose(`${DOSE_SUBJECTS[ctx].replace('{X}', `${C0}`)} The amount $C$ mg left after $t$ hours follows`),
        display(`${rate('C')} = -${halfLifeK(h)}C`),
        prose(`${hint ? `It halves every ${h} hours. ` : ''}After how many hours are ${C1} mg left?`),
      ],
      't =',
      m * h,
    );
  },
  solution: (params) => {
    const { C1, m, h } = params;
    const C0 = C1 * 2 ** m;
    return [
      { text: `With $k = ${halfLifeK(h)}$ the amount halves every ${h} hours.` },
      { tex: `${C0} \\div ${C1} = ${2 ** m} = 2^{${m}}` },
      { text: `That is ${m} half-li${m === 1 ? 'fe' : 'ves'}.`, tex: `t = ${m} \\times ${h} = ${m * h}` },
    ];
  },
};

/** A second dose on top of what is left: slide to the amount later on. */
export interface DoseParams {
  ctx: number;
  h: number;
  /** Half-lives before the second dose, then after it. */
  a: number;
  b: number;
  C0: number;
  D: number;
}

export const doseTop = ({ C0, D, a }: DoseParams): number => C0 / 2 ** a + D;
export const doseAnswer = (params: DoseParams): number => doseTop(params) / 2 ** params.b;

const deModelDoseSlider: Generator<DoseParams> = {
  id: 'de-model-dose-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const a = hard ? rng.int(1, 2) : 1;
      const b = hard ? rng.int(1, 2) : 1;
      const unit = 5 * 2 ** b;
      const C0 = unit * 2 ** a * rng.int(1, 8);
      const D = hard && rng.chance(0.6) ? unit * rng.int(1, 12) : C0;
      const params = { ctx: rng.int(0, DOSE_SUBJECTS.length - 1), h: rng.int(2, 8), a, b, C0, D };
      if (C0 > 320 || D > 320) continue;
      const span = Math.ceil((Math.max(C0, doseTop(params)) + 20) / 10) * 10;
      if (Math.round(span / 2 / 5) * 5 === doseAnswer(params)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { ctx, h, a, b, C0, D } = params;
    const T1 = a * h;
    const T2 = (a + b) * h;
    const top = doseTop(params);
    const span = Math.ceil((Math.max(C0, top) + 20) / 10) * 10;
    const window = markerWindow(0, span, 'y');
    const k = Math.log(2) / h;
    const f = (t: number) => (t < T1 ? C0 * Math.exp(-k * t) : top * Math.exp(-k * (t - T1)));
    return {
      kind: 'slider',
      prompt: [
        prose(`${DOSE_SUBJECTS[ctx].replace('{X}', `${C0}`)} The amount $C$ mg in the blood after $t$ hours follows`),
        display(`${rate('C')} = -${halfLifeK(h)}C`),
        prose(`At $t = ${T1}$ a second dose of ${D} mg is given. Slide to the amount at $t = ${T2}$, where the dashed line is.`),
      ],
      min: 0,
      max: span,
      step: 5,
      answer: doseAnswer(params),
      readout: `C(${T2}) = {v}`,
      figure: plotFigure(
        plotSvg({
          xMin: 0,
          xMax: T2 + h,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f }],
          verticals: [{ x: T2, dashed: true }],
          marks: [{ x: 0, y: C0 }],
          label: `A curve falling from ${C0}, jumping up at t = ${T1} when the second dose is given, then falling again, with a dashed line at t = ${T2}`,
        }),
        'y',
      ),
    };
  },
  solution: (params) => {
    const { h, a, b, C0, D } = params;
    const T1 = a * h;
    const T2 = (a + b) * h;
    const left = C0 / 2 ** a;
    const top = doseTop(params);
    return [
      { text: `The amount halves every ${h} hours. By $t = ${T1}$ it has halved ${a} time${a === 1 ? '' : 's'}.`, tex: `${C0} \\div ${2 ** a} = ${left}` },
      { text: 'The second dose adds on top.', tex: `${left} + ${D} = ${top}` },
      { text: `From there it halves again: ${b} time${b === 1 ? '' : 's'} by $t = ${T2}$.`, tex: `${top} \\div ${2 ** b} = ${doseAnswer(params)}` },
    ];
  },
};

/* ============================================================
 * Lesson 5: a steady drip, dC/dt = R - kC
 * ============================================================ */

interface DripStory {
  sym: string;
  /** `{R}` the rate in, `{p}` the percentage removed. */
  text: string;
  unit: string;
  /** `an hour`, `a day`. */
  per: string;
  /** What the letter measures, for a prompt that gives only the equation. */
  noun: string;
}

const DRIP_STORIES: DripStory[] = [
  {
    sym: 'C',
    text: "A drip puts {R} mg of a drug into a patient's blood an hour, and the body removes {p}% of the drug present an hour. $C$ mg are in the blood after $t$ hours.",
    unit: 'hour',
    per: 'an hour',
    noun: 'The amount $C$ mg of a drug in the blood after $t$ hours',
  },
  {
    sym: 'P',
    text: 'A stream carries {R} kg of a chemical into a pond a day, and {p}% of the chemical in the pond breaks down a day. $P$ kg are in the pond after $t$ days.',
    unit: 'day',
    per: 'a day',
    noun: 'The amount $P$ kg of a chemical in a pond after $t$ days',
  },
  {
    sym: 'N',
    text: 'A lake is stocked with {R} fish a year, and {p}% of the fish in it die a year. $N$ fish are in it after $t$ years.',
    unit: 'year',
    per: 'a year',
    noun: 'The number $N$ of fish in a lake after $t$ years',
  },
  {
    sym: 'C',
    text: 'A worker takes in {R} mg of caffeine an hour through the day, and the body clears {p}% of the caffeine present an hour. $C$ mg are in the body after $t$ hours.',
    unit: 'hour',
    per: 'an hour',
    noun: 'The amount $C$ mg of caffeine in the body after $t$ hours',
  },
];

export interface DripParams {
  ctx: number;
  R: number;
  pct: number;
  /** Tiles: the factored form. Level: asked in words. Steps: started away from 0. */
  hard: boolean;
  C0: number;
}

export const dripLevel = ({ R, pct }: DripParams): number => (R * 100) / pct;

function sampleDrip(rng: Rng, difficulty: number): DripParams {
  for (;;) {
    const pct = rng.pick([5, 10, 20, 25, 40, 50]);
    const L = 10 * rng.int(2, 40);
    const R = (L * pct) / 100;
    if (!Number.isInteger(R)) continue;
    const hard = difficulty >= 2;
    const C0 = hard ? L + (rng.chance(0.5) ? 1 : -1) * 10 * rng.int(1, 10) : 0;
    if (C0 < 0 || C0 === L) continue;
    return { ctx: rng.int(0, DRIP_STORIES.length - 1), R, pct, hard, C0 };
  }
}

const dripStory = ({ ctx, R, pct }: DripParams): string => DRIP_STORIES[ctx].text.replace('{R}', `${R}`).replace('{p}', `${pct}`);

const deModelDripTiles: Generator<DripParams> = {
  id: 'de-model-drip-tiles',
  sample: sampleDrip,
  render: (params): Slide => {
    const { ctx, R, pct, hard } = params;
    const s = DRIP_STORIES[ctx].sym;
    const r = dec(pct);
    const L = dripLevel(params);
    if (hard) {
      const answer = [r, `${L}`];
      return {
        kind: 'tiles',
        prompt: [prose(`${dripStory(params)} Build the equation, with the rate taken out as a factor.`)],
        template: `${rate(s)} = {0}({1} - ${s})`,
        bank: tokenBank(answer, [`${R}`, `${pct}`, `${L / 2}`, `${L * 2}`], 3),
        answer,
      };
    }
    const answer = [`${R}`, r];
    return {
      kind: 'tiles',
      prompt: [prose(`${dripStory(params)} Build the equation.`)],
      template: `${rate(s)} = {0} - {1}${s}`,
      bank: tokenBank(answer, [`${pct}`, `${L}`, `${(100 - pct) / 100}`], 3),
      answer,
    };
  },
  solution: (params) => {
    const { ctx, R, pct, hard } = params;
    const s = DRIP_STORIES[ctx].sym;
    const L = dripLevel(params);
    const steps: SolutionStep[] = [
      { text: `In at a steady $${R}$ ${DRIP_STORIES[ctx].per}, out at ${pct}% of what is there, $${dec(pct)}${s}$.`, tex: `${rate(s)} = ${R} - ${dec(pct)}${s}` },
    ];
    if (hard) steps.push({ text: `Take out $${dec(pct)}$: $${R} \\div ${dec(pct)} = ${L}$.`, tex: `${rate(s)} = ${dec(pct)}(${L} - ${s})` });
    return steps;
  },
};

const deModelDripLevel: Generator<DripParams> = {
  id: 'de-model-drip-level',
  sample: sampleDrip,
  choices: (params) => {
    const { R, pct } = params;
    const L = dripLevel(params);
    return numberChoices(L, [(R * pct) / 100, R, R * pct, L / 2, 2 * L], mix(R, pct));
  },
  render: (params): Slide => {
    const { ctx, R, pct, hard } = params;
    const story = DRIP_STORIES[ctx];
    const s = story.sym;
    const prompt = hard
      ? [prose(`${dripStory(params)} What amount does it settle at in the long run?`)]
      : [prose(`${story.noun} follows`), display(`${rate(s)} = ${R} - ${dec(pct)}${s}`), prose('What level does it settle at in the long run?')];
    return numberSlide(prompt, `${s} =`, dripLevel(params));
  },
  solution: (params) => {
    const { ctx, R, pct } = params;
    const s = DRIP_STORIES[ctx].sym;
    const L = dripLevel(params);
    return [
      { text: 'It settles where it stops changing, when what goes out balances what comes in.', tex: chain(`${R} - ${dec(pct)}${s} &= 0`, `${dec(pct)}${s} &= ${R}`, `${s} &= ${R} \\div ${dec(pct)}`, `${s} &= ${L}`) },
      { text: 'Above that level more goes out than comes in, and below it less, so every start settles there.' },
    ];
  },
};

export const dripSolutionAnswer = (params: DripParams): string => {
  const L = dripLevel(params);
  return `${L} + (${params.C0 - L})*e^(-(${params.pct / 100})*t)`;
};

const deModelDripSteps: Generator<DripParams> = {
  id: 'de-model-drip-steps',
  sample: sampleDrip,
  render: (params): Slide => {
    const { ctx, R, pct, C0 } = params;
    const s = DRIP_STORIES[ctx].sym;
    const r = dec(pct);
    const L = dripLevel(params);
    const exp = `e^{-${r}t}`;
    const factored = `${rate(s)} = ${r}(${L} - ${s})`;
    // Bars as `\vert`, as in the saving steps above.
    const logged = `-\\ln\\left\\vert ${L} - ${s}\\right\\vert = ${r}t + K`;
    const general = `${L} - ${s} = A${exp}`;
    const particular = `${s} = ${levelPlusExp(L, C0 - L, exp)}`;
    return {
      kind: 'steps',
      prompt: [
        prose(
          'Solve it step by step: tap the equation to take out the rate, then the comma to separate and integrate, then the line to undo the log, then again to use the start. $K$ is the constant of integration.',
        ),
      ],
      start: [`${rate(s)} = ${R} - ${r}${s}`, ',', `${s}(0) = ${C0}`],
      reductions: [
        {
          span: [0, 1],
          operator: 0,
          value: factored,
          bank: stepBank(factored, `${rate(s)} = ${r}(${R} - ${s})`, `${rate(s)} = ${r}(${s} - ${L})`, `${rate(s)} = ${r}(${L} + ${s})`),
        },
        {
          span: [0, 3],
          operator: 1,
          value: logged,
          bank: stepBank(
            logged,
            `\\ln\\left\\vert ${L} - ${s}\\right\\vert = ${r}t + K`,
            `-\\ln\\vert ${s}\\vert = ${r}t + K`,
            `-\\ln\\left\\vert ${L} - ${s}\\right\\vert = ${R}t + K`,
          ),
        },
        {
          span: [0, 1],
          operator: 0,
          value: general,
          bank: stepBank(general, `${L} - ${s} = Ae^{${r}t}`, `${s} = A${exp}`, `${L} - ${s} = ${exp} + A`),
        },
        {
          span: [0, 1],
          operator: 0,
          value: particular,
          bank: stepBank(
            particular,
            `${s} = ${levelPlusExp(L, L - C0, exp)}`,
            `${s} = ${levelPlusExp(C0, L - C0, exp)}`,
            `${s} = ${levelPlusExp(L, C0 - L, `e^{${r}t}`)}`,
          ),
        },
      ],
    };
  },
  solution: (params) => {
    const { ctx, R, pct, C0 } = params;
    const s = DRIP_STORIES[ctx].sym;
    const r = dec(pct);
    const L = dripLevel(params);
    return [
      { text: `Take out $${r}$: $${R} \\div ${r} = ${L}$.`, tex: `${rate(s)} = ${r}(${L} - ${s})` },
      { text: `Separate and integrate. $\\frac{1}{${L} - ${s}}$ integrates to $-\\ln\\left|${L} - ${s}\\right|$, since the inside differentiates to $-1$.`, tex: `-\\ln\\left|${L} - ${s}\\right| = ${r}t + K` },
      { text: 'Multiply by $-1$ and take $e$ to the power of each side.', tex: `${L} - ${s} = Ae^{-${r}t}` },
      { text: `At $t = 0$, $A = ${L} - ${C0} = ${L - C0}$. Rearrange for $${s}$.`, tex: `${s} = ${levelPlusExp(L, C0 - L, `e^{-${r}t}`)}` },
    ];
  },
};

/** The drip with k = ln 2 / h: the gap to the level halves every h. */
export interface DripSliderParams {
  ctx: number;
  L: number;
  gap: number;
  h: number;
  m: number;
  above: boolean;
}

export const dripSliderAnswer = ({ L, gap, m, above }: DripSliderParams): number => L + (above ? 1 : -1) * (gap / 2 ** m);

const deModelDripSlider: Generator<DripSliderParams> = {
  id: 'de-model-drip-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    for (;;) {
      const L = rng.pick([40, 50, 60, 80, 100, 120, 160]);
      const m = rng.int(1, 3);
      const gap = 5 * 2 ** m * rng.int(1, 4);
      const above = hard && rng.chance(0.35);
      if (!above && gap > L) continue;
      if (above && gap > 80) continue;
      const params = { ctx: rng.int(0, DRIP_STORIES.length - 1), L, gap, h: rng.int(1, 6), m, above };
      const span = Math.max(L, above ? L + gap : L) + 20;
      if (Math.round(span / 2 / 5) * 5 === dripSliderAnswer(params)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { ctx, L, gap, h, m, above } = params;
    const story = DRIP_STORIES[ctx];
    const s = story.sym;
    const start = above ? L + gap : L - gap;
    const span = Math.max(L, start) + 20;
    const window = markerWindow(0, span, 'y');
    const k = Math.log(2) / h;
    const T = m * h;
    const k2: LnRate = { b: 2, h, sign: 1 };
    return {
      kind: 'slider',
      prompt: [
        prose(`${story.noun} follows the equation below, with $${s}(0) = ${start}$.`),
        display(`${rate(s)} = ${h === 1 ? '(\\ln 2)' : lnTex(k2)}(${L} - ${s})`),
        prose(`Slide to the amount at $t = ${T}$, where the dashed line is.`),
      ],
      min: 0,
      max: span,
      step: 5,
      answer: dripSliderAnswer(params),
      readout: `${s}(${T}) = {v}`,
      figure: plotFigure(
        plotSvg({
          xMin: 0,
          xMax: (m + 1) * h,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f: (t: number) => L + (start - L) * Math.exp(-k * t) }],
          horizontals: [L],
          verticals: [{ x: T, dashed: true }],
          marks: [{ x: 0, y: start }],
          label: `A curve starting at ${start} and levelling off towards ${L}, with a dashed line at t = ${T}`,
        }),
        'y',
      ),
    };
  },
  solution: (params) => {
    const { L, gap, h, m, above, ctx } = params;
    const s = DRIP_STORIES[ctx].sym;
    const unit = DRIP_STORIES[ctx].unit;
    return [
      { text: `It settles at $${L}$, and starts $${gap}$ ${above ? 'above' : 'below'} it.`, tex: `${s} = ${L} ${above ? '+' : '-'} ${gap}e^{-kt}` },
      { text: `With $k = ${lnTex({ b: 2, h, sign: 1 })}$ the gap halves every ${h === 1 ? unit : `${h} ${unit}s`}, so by $t = ${m * h}$ it has halved ${m} time${m === 1 ? '' : 's'}.`, tex: `${gap} \\div 2^{${m}} = ${gap / 2 ** m}` },
      { tex: `${s}(${m * h}) = ${L} ${above ? '+' : '-'} ${gap / 2 ** m} = ${dripSliderAnswer(params)}` },
    ];
  },
};

export const deModelGens = {
  deModelInterestTiles,
  deModelDoubleTree,
  deModelYearly,
  deModelReachSlider,
  deModelSaveTiles,
  deModelSaveLevel,
  deModelSaveSteps,
  deModelSaveFlow,
  deModelHarvestTiles,
  deModelHarvestLevel,
  deModelHarvestMax,
  deModelHarvestFlow,
  deModelHalveTree,
  deModelHalflifeTree,
  deModelDoseWhen,
  deModelDoseSlider,
  deModelDripTiles,
  deModelDripLevel,
  deModelDripSteps,
  deModelDripSlider,
};

export const deModelGenerators = Object.values(deModelGens) as Generator<never>[];
