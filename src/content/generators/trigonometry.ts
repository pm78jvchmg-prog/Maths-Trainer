/**
 * Trigonometric Functions.
 *
 * The course arrives at sine and cosine through periodic behaviour rather than
 * through triangles, so the early generators are about reading a repeating
 * quantity — period, midline, amplitude, shift — before any trig function is
 * named.
 *
 * Numbers are chosen so that answers stay integers. Angles are restricted to
 * those whose sine or cosine is 0, ±1/2 or ±1, and radii are even, which keeps
 * every height a whole number and avoids asking a learner to type a surd on a
 * phone keypad. Periods are given as counts per second rather than as multiples
 * of pi for the same reason: "2\\pi/3" is an unpleasant thing to enter and an
 * ambiguous thing to grade.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg, wave } from '../figures';
import { bin, num, trig, valueOf, type Expr } from '../expr';
import { gcd } from './format';

/**
 * Plain number entry. The base keypad already supplies digits, signs and the
 * decimal point; a second `.` here used to put two identical keys side by side.
 */
const NUMBER_KEYS: KeypadKey[] = [{ insert: '/' }];

/** The six trig function keys, angles in degrees. Exported for the editor's tests. */
export const TRIG_KEYS: KeypadKey[] = (['sin', 'cos', 'tan', 'asin', 'acos', 'atan'] as const).map(
  (insert) => ({ insert, fn: 'degrees' as const }),
);

/**
 * Number entry plus every trig function, for a question where working out
 * which function applies is the point. All six are offered whichever one the
 * answer needs, so the keypad does not make that choice for the learner.
 */
const FUNCTION_KEYS: KeypadKey[] = [...NUMBER_KEYS, ...TRIG_KEYS];

/** `r sin(` with the caret in the brackets: the function written in, the angle left to the learner. */
const writtenIn = (radius: number, fn: 'sin' | 'cos'): KeypadKey[] => [
  { insert: `${radius}` },
  { insert: fn, fn: 'degrees' },
];

/** Angles whose sine is 0, ±1/2 or ±1, paired with twice that sine. */
const SINE_ANGLES: { degrees: number; twiceSine: number }[] = [
  { degrees: 0, twiceSine: 0 },
  { degrees: 30, twiceSine: 1 },
  { degrees: 90, twiceSine: 2 },
  { degrees: 150, twiceSine: 1 },
  { degrees: 180, twiceSine: 0 },
  { degrees: 210, twiceSine: -1 },
  { degrees: 270, twiceSine: -2 },
  { degrees: 330, twiceSine: -1 },
];

/** Angles whose cosine is 0, ±1/2 or ±1, paired with twice that cosine. */
const COSINE_ANGLES: { degrees: number; twiceCosine: number }[] = [
  { degrees: 0, twiceCosine: 2 },
  { degrees: 60, twiceCosine: 1 },
  { degrees: 90, twiceCosine: 0 },
  { degrees: 120, twiceCosine: -1 },
  { degrees: 180, twiceCosine: -2 },
  { degrees: 240, twiceCosine: -1 },
  { degrees: 270, twiceCosine: 0 },
  { degrees: 300, twiceCosine: 1 },
];

/**
 * Everyday quantities that genuinely repeat, for the opening lesson.
 *
 * Kept long deliberately. This generator's question stem never changes, so the
 * only thing distinguishing one draw from the next is the pair of options —
 * with a short list the lesson reads as the same question asked five times.
 */
const PERIODIC: string[] = [
  'the height of a seat on a turning Ferris wheel',
  'the depth of water at a harbour wall through the tide',
  'the height of a valve on a rolling bicycle wheel',
  'the length of the day through the year',
  'the position of a swinging pendulum',
  'the angle of a clock hand',
  'the voltage in a mains socket',
  'the phase of the moon',
  'the height of a bouncing spring',
  'the air pressure at your ear during a steady note',
  'the position of a piston in a running engine',
  'the brightness of a lighthouse beam from the shore',
  'the temperature in a room with a thermostat cycling',
  'the day of the week',
];

/** Quantities that change but never return, used as distractors. */
const NOT_PERIODIC: string[] = [
  'the total distance a car has driven',
  'the height of a child as they grow',
  'the number of people who have ever lived',
  'the reading on an electricity meter',
  'the age of a tree',
  'the total rainfall recorded since January',
  'the number of words in a book you are writing',
  'the mileage on an odometer',
  'the balance of a savings account that only receives deposits',
  'the amount of sand that has fallen through an hourglass',
];

/**
 * Phrasings of the same question.
 *
 * The stem is otherwise fixed, and a lesson asking it three times with the
 * identical opening line reads as a bug even when the options differ.
 */
const PERIODIC_STEMS: string[] = [
  'Which of these is periodic?',
  'Which of these repeats?',
  'Which of these has a period?',
  'Which of these returns to the same value again and again?',
  'Which of these could be drawn as a repeating graph?',
];

/**
 * A non-zero integer in a range.
 *
 * Vertical shifts must avoid zero: `signedTex(0)` would put a literal "+ 0" in
 * front of the learner, and a question about a shift of nothing teaches
 * nothing.
 */
function nonZeroInt(rng: Rng, min: number, max: number): number {
  const n = rng.int(min, max);
  return n === 0 ? max : n;
}

/** A signed value written the way it would be by hand: +3, -3, never + -3. */
function signedTex(n: number): string {
  return n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`;
}

/* ---------- Level 1: reading a repeating quantity ---------- */

interface PeriodicParams {
  yes: string;
  no: string;
  yesFirst: boolean;
  stem: string;
}

/** Which of two described quantities repeats. */
const isPeriodic: Generator<PeriodicParams> = {
  id: 'trig-is-periodic',
  sample: (rng) => ({
    yes: rng.pick(PERIODIC),
    no: rng.pick(NOT_PERIODIC),
    yesFirst: rng.chance(0.5),
    stem: rng.pick(PERIODIC_STEMS),
  }),
  render: ({ yes, no, yesFirst, stem }) => {
    const options = [
      { id: 'yes', label: yes },
      { id: 'no', label: no },
    ];
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: stem }],
      options: yesFirst ? options : [options[1], options[0]],
      correctId: 'yes',
    };
  },
  solution: ({ yes, no }) => [
    {
      text: `A quantity is periodic when it returns to the same value again and again, at even intervals. That is true of ${yes}.`,
    },
    {
      text: `By contrast, ${no} only ever increases. It never comes back to a value it has already had, so it has no period.`,
    },
  ],
};

interface PeaksParams {
  first: number;
  period: number;
}

/** The period, read off two consecutive peaks. */
const periodFromPeaks: Generator<PeaksParams> = {
  id: 'trig-period-from-peaks',
  choices: ({ first, period }) =>
    options(
      { tex: `${period}`, answer: `${period}` },
      { tex: `${first}`, answer: `${first}` },
      { tex: `${first + period}`, answer: `${first + period}` },
      { tex: `${2 * period}`, answer: `${2 * period}` },
    ),
  sample: (rng, difficulty) => ({
    first: rng.int(1, difficulty > 1 ? 12 : 8),
    period: rng.int(2, difficulty > 1 ? 11 : 8),
  }),
  render: ({ first, period }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A repeating graph has consecutive peaks at $t = ${first}$ and $t = ${first + period}$ seconds. What is its period, in seconds?`,
      },
    ],
    lead: '\\text{period} =',
    keypad: NUMBER_KEYS,
    answer: `${period}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ first, period }) => [
    {
      text: 'The period is the gap between one peak and the next, so subtract the two times.',
    },
    { tex: `${first + period} - ${first} = ${period}` },
    {
      text: `The graph repeats every $${period}$ seconds. Every later peak is at $${first} + ${period}n$ for a whole number $n$.`,
    },
  ],
};

interface CyclesParams {
  period: number;
  cycles: number;
}

/** How many complete cycles fit into a given span. */
const cycleCount: Generator<CyclesParams> = {
  id: 'trig-cycle-count',
  sample: (rng, difficulty) => ({
    period: rng.int(2, difficulty > 1 ? 9 : 7),
    cycles: rng.int(3, difficulty > 1 ? 14 : 11),
  }),
  render: ({ period, cycles }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A wheel completes one turn every $${period}$ seconds. How many complete turns does it make in $${period * cycles}$ seconds?`,
      },
    ],
    lead: '\\text{turns} =',
    keypad: NUMBER_KEYS,
    answer: `${cycles}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ period, cycles }) => [
    { text: 'Divide the total time by the time for one turn.' },
    { tex: `\\frac{${period * cycles}}{${period}} = ${cycles}` },
    {
      text: `That is $${cycles}$ complete turns. Counting turns is the same as counting periods, which is why the period is the natural unit for anything that repeats.`,
    },
  ],
};

interface MidlineParams {
  max: number;
  min: number;
}

/** The midline, halfway between the highest and lowest values. */
const midline: Generator<MidlineParams> = {
  id: 'trig-midline',
  choices: ({ max, min }) =>
    options(
      { tex: `${(max + min) / 2}`, answer: `${(max + min) / 2}` },
      { tex: `${(max - min) / 2}`, answer: `${(max - min) / 2}` },
      { tex: `${max + min}`, answer: `${max + min}` },
      { tex: `${(max + min) / 2 + 1}`, answer: `${(max + min) / 2 + 1}` },
    ),
  sample: (rng, difficulty) => {
    // Both bounds share a parity so their mean is a whole number.
    const half = rng.int(1, difficulty > 1 ? 9 : 5);
    const centre = rng.int(difficulty > 1 ? -6 : 1, difficulty > 1 ? 9 : 8);
    return { max: centre + half, min: centre - half };
  },
  render: ({ max, min }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The water at a harbour wall rises to a maximum depth of $${max}$ m and falls to a minimum of $${min}$ m. What is the midline of the depth?`,
      },
    ],
    lead: '\\text{midline} =',
    keypad: NUMBER_KEYS,
    answer: `${(max + min) / 2}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ max, min }) => [
    {
      text: 'The midline sits halfway between the highest and lowest values, so take their mean.',
    },
    { tex: `\\frac{${max} + (${min})}{2} = \\frac{${max + min}}{2} = ${(max + min) / 2}` },
    {
      text: `The depth oscillates about $${(max + min) / 2}$ m. Note this is an average of the two extremes, not of the depth over time — those agree for a sine wave but not for every periodic shape.`,
    },
  ],
};

/** The amplitude, half the peak-to-trough distance. */
const amplitude: Generator<MidlineParams> = {
  id: 'trig-amplitude',
  // Half the gap, not the whole gap: the distinction the lesson turns on.
  choices: ({ max, min }) =>
    options(
      { tex: `${(max - min) / 2}`, answer: `${(max - min) / 2}` },
      { tex: `${max - min}`, answer: `${max - min}` },
      { tex: `${(max + min) / 2}`, answer: `${(max + min) / 2}` },
      { tex: `${(max - min) / 2 + 1}`, answer: `${(max - min) / 2 + 1}` },
    ),
  sample: (rng, difficulty) => {
    const half = rng.int(1, difficulty > 1 ? 9 : 6);
    const centre = rng.int(difficulty > 1 ? -5 : 0, difficulty > 1 ? 9 : 6);
    return { max: centre + half, min: centre - half };
  },
  render: ({ max, min }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A periodic quantity varies between a maximum of $${max}$ and a minimum of $${min}$. What is its amplitude?`,
      },
    ],
    lead: '\\text{amplitude} =',
    keypad: NUMBER_KEYS,
    answer: `${(max - min) / 2}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ max, min }) => [
    {
      text: 'The amplitude is the distance from the midline to a peak, which is half the full peak-to-trough swing.',
    },
    { tex: `\\frac{${max} - (${min})}{2} = \\frac{${max - min}}{2} = ${(max - min) / 2}` },
    {
      text: `The common slip is to give $${max - min}$, the full swing. Amplitude is measured from the middle, so it is half of that.`,
    },
  ],
};

interface ShiftParams {
  shift: number;
  peak: number;
}

/** Reading a horizontal shift out of f(x - c). */
const horizontalShift: Generator<ShiftParams> = {
  id: 'trig-horizontal-shift',
  sample: (rng, difficulty) => ({
    shift: rng.int(1, difficulty > 1 ? 8 : 5) * (difficulty > 1 ? rng.sign() : 1),
    peak: rng.int(1, 6),
  }),
  render: ({ shift, peak }) => {
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `A periodic function $f$ has a peak at $t = ${peak}$. Where is the matching peak of $f(t ${signedTex(-shift)})$?`,
        },
      ],
      options: [
        { id: 'shifted', label: `t = ${peak + shift}`, tex: true },
        { id: 'wrong-way', label: `t = ${peak - shift}`, tex: true },
        { id: 'unmoved', label: `t = ${peak}`, tex: true },
      ],
      correctId: 'shifted',
    };
  },
  solution: ({ shift, peak }) => [
    {
      text: `Replacing $t$ with $t ${signedTex(-shift)}$ moves the graph ${shift > 0 ? 'right' : 'left'} by $${Math.abs(shift)}$.`,
    },
    { tex: `t ${signedTex(-shift)} = ${peak} \\implies t = ${peak + shift}` },
    {
      text: `The sign reads backwards, which is where most mistakes come from: subtracting inside the bracket shifts the graph in the positive direction, because $t$ now has to be larger to reach the same input.`,
    },
  ],
};

/* ---------- Level 2: sine and cosine from circular motion ---------- */

interface CircleParams {
  radius: number;
  degrees: number;
  twice: number;
  /**
   * `given` writes `r sin(` into the answer box, leaving only the angle to
   * type; an easier first meeting, and only ever at difficulty 1.
   */
  form: 'free' | 'given';
}

/** Half the difficulty-1 draws come with the function already written in. */
const circleForm = (rng: Rng, difficulty: number): CircleParams['form'] =>
  difficulty === 1 && rng.chance(0.5) ? 'given' : 'free';

/** Height of a point on a turning circle: r sin(theta). */
const sineFromCircle: Generator<CircleParams> = {
  id: 'trig-sine-from-circle',
  choices: ({ radius, twice }) =>
    options(
      { tex: `${(radius * twice) / 2}`, answer: `${(radius * twice) / 2}` },
      { tex: `${radius}`, answer: `${radius}` },
      { tex: `${radius * twice}`, answer: `${radius * twice}` },
      { tex: `${-(radius * twice) / 2}`, answer: `${-(radius * twice) / 2}` },
    ),
  sample: (rng, difficulty) => {
    const angle = rng.pick(SINE_ANGLES);
    return {
      radius: rng.int(1, difficulty > 1 ? 6 : 4) * 2,
      degrees: angle.degrees,
      twice: angle.twiceSine,
      form: circleForm(rng, difficulty),
    };
  },
  render: ({ radius, degrees, twice, form }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A point starts at the far right of a circle of radius $${radius}$ centred at the origin, and turns $${degrees}^{\\circ}$ anticlockwise. How high is it above the centre?`,
      },
    ],
    lead: '\\text{height} =',
    keypad: FUNCTION_KEYS,
    ...(form === 'given' && { prefill: writtenIn(radius, 'sin') }),
    answer: `${(radius * twice) / 2}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ radius, degrees, twice }) => [
    {
      text: 'Height above the centre is the radius times the sine of the angle turned. That is what sine *is* here — a height, not a ratio in a triangle.',
    },
    {
      tex: `${radius}\\sin(${degrees}^{\\circ}) = ${radius} \\times ${twice / 2} = ${(radius * twice) / 2}`,
    },
    {
      text:
        twice === 0
          ? 'At this angle the point is level with the centre, so the height is zero — sine passes through zero twice every turn.'
          : `A negative height means the point is below the centre. Sine is positive for the first half turn and negative for the second.`,
    },
  ],
};

/** Horizontal displacement of the same point: r cos(theta). */
const cosineFromCircle: Generator<CircleParams> = {
  id: 'trig-cosine-from-circle',
  choices: ({ radius, twice }) =>
    options(
      { tex: `${(radius * twice) / 2}`, answer: `${(radius * twice) / 2}` },
      { tex: `${radius}`, answer: `${radius}` },
      { tex: `${radius * twice}`, answer: `${radius * twice}` },
      { tex: `${-(radius * twice) / 2}`, answer: `${-(radius * twice) / 2}` },
    ),
  sample: (rng, difficulty) => {
    const angle = rng.pick(COSINE_ANGLES);
    return {
      radius: rng.int(1, difficulty > 1 ? 6 : 4) * 2,
      degrees: angle.degrees,
      twice: angle.twiceCosine,
      form: circleForm(rng, difficulty),
    };
  },
  render: ({ radius, degrees, twice, form }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The same point on a circle of radius $${radius}$ turns $${degrees}^{\\circ}$ anticlockwise from the far right. How far is it to the right of the centre?`,
      },
    ],
    lead: '\\text{displacement} =',
    keypad: FUNCTION_KEYS,
    ...(form === 'given' && { prefill: writtenIn(radius, 'cos') }),
    answer: `${(radius * twice) / 2}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ radius, degrees, twice }) => [
    {
      text: 'Horizontal displacement is the radius times the cosine of the angle. Cosine tracks the same motion as sine, measured across instead of up.',
    },
    {
      tex: `${radius}\\cos(${degrees}^{\\circ}) = ${radius} \\times ${twice / 2} = ${(radius * twice) / 2}`,
    },
    {
      text: `At $0^{\\circ}$ cosine starts at its maximum while sine starts at zero. That quarter-turn head start is the only difference between the two graphs.`,
    },
  ],
};

interface SpeedParams {
  turns: number;
  seconds: number;
}

/** Period from a rate of turning: faster means shorter. */
const periodFromSpeed: Generator<SpeedParams> = {
  id: 'trig-period-from-speed',
  sample: (rng, difficulty) => ({
    turns: rng.int(2, difficulty > 1 ? 12 : 8),
    seconds: rng.int(1, difficulty > 1 ? 5 : 3) * rng.int(2, 7),
  }),
  render: ({ turns, seconds }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A wheel makes $${turns}$ complete turns in $${seconds}$ seconds. How long does one turn take, in seconds?`,
      },
    ],
    lead: '\\text{period} =',
    keypad: NUMBER_KEYS,
    answer: `${seconds}/${turns}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ turns, seconds }) => [
    { text: 'Divide the time taken by the number of turns made in it.' },
    { tex: `\\frac{${seconds}}{${turns}}` },
    {
      text: 'Period and speed are reciprocals: turning twice as fast halves the period. Speeding up squashes the graph horizontally, it does not raise or lower it.',
    },
  ],
};

/** Which of two rates gives the shorter period. */
const speedComparison: Generator<{ slow: number; fast: number; slowFirst: boolean }> = {
  id: 'trig-speed-comparison',
  sample: (rng) => {
    const slow = rng.int(1, 4);
    return { slow, fast: slow + rng.int(1, 4), slowFirst: rng.chance(0.5) };
  },
  render: ({ slow, fast, slowFirst }) => {
    const options = [
      { id: 'fast', label: `${fast} turns per second` },
      { id: 'slow', label: `${slow} turns per second` },
    ];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Which wheel has the shorter period?' },
      ],
      options: slowFirst ? [options[1], options[0]] : options,
      correctId: 'fast',
    };
  },
  solution: ({ slow, fast }) => [
    {
      text: 'The period is the time for one turn, so it is one divided by the rate of turning.',
    },
    { tex: `\\frac{1}{${fast}} < \\frac{1}{${slow}}` },
    {
      text: `Turning faster means each turn takes less time, so $${fast}$ turns per second gives the shorter period. More cycles per second and a shorter period are the same statement.`,
    },
  ],
};

/* ---------- Level 3: putting the transformations together ---------- */

interface WaveParams {
  a: number;
  d: number;
}

/** Maximum and minimum of a sin(x) + d, placed into a template. */
const waveRange: Generator<WaveParams> = {
  id: 'trig-wave-range',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 8 : 5),
    d: nonZeroInt(rng, difficulty > 1 ? -6 : 1, difficulty > 1 ? 9 : 7),
  }),
  render: ({ a, d }) => {
    const max = d + a;
    const min = d - a;
    // Distractors are the classic slips: forgetting the shift, or doubling.
    const bank = [...new Set([`${max}`, `${min}`, `${a}`, `${-a}`, `${d}`, `${2 * a}`])];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The curve $y = ${a}\\sin(x) ${signedTex(d)}$ oscillates between two values. Place them.`,
        },
      ],
      template: `\\text{maximum } = {0} \\quad \\text{minimum } = {1}`,
      bank,
      answer: [`${max}`, `${min}`],
    };
  },
  solution: ({ a, d }) => [
    {
      text: `$\\sin(x)$ runs between $-1$ and $1$, so $${a}\\sin(x)$ runs between $${-a}$ and $${a}$.`,
    },
    { tex: `${d} - ${a} \\le y \\le ${d} + ${a}` },
    {
      text: `Adding $${d}$ lifts the whole curve, giving a maximum of $${d + a}$ and a minimum of $${d - a}$. The amplitude is still $${a}$ — a vertical shift moves the midline, it never changes how far the curve swings.`,
    },
  ],
};

/** Reading amplitude and midline back out of a written function. */
const readParameters: Generator<WaveParams> = {
  id: 'trig-read-parameters',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 9 : 6),
    d: nonZeroInt(rng, difficulty > 1 ? -7 : 1, difficulty > 1 ? 9 : 8),
  }),
  render: ({ a, d }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `What is the amplitude of $y = ${a}\\cos(x) ${signedTex(d)}$?`,
      },
    ],
    lead: '\\text{amplitude} =',
    keypad: NUMBER_KEYS,
    answer: `${a}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, d }) => [
    {
      text: 'The amplitude is the multiplier in front of the trig function. Nothing added on the outside affects it.',
    },
    { tex: `y = ${a}\\cos(x) ${signedTex(d)} \\implies \\text{amplitude} = ${a}` },
    {
      text: `The $${d}$ sets the midline at $y = ${d}$, not the amplitude. Amplitude answers "how far does it swing", midline answers "what does it swing about", and they are independent.`,
    },
  ],
};

interface EvaluateParams {
  a: number;
  d: number;
  degrees: number;
  twice: number;
}

/** Evaluating a sin(x) + d one operation at a time. */
const evaluateWave: Generator<EvaluateParams> = {
  id: 'trig-evaluate-wave',
  sample: (rng, difficulty) => {
    const angle = rng.pick(SINE_ANGLES);
    return {
      a: rng.int(1, difficulty > 1 ? 5 : 3) * 2,
      d: nonZeroInt(rng, difficulty > 1 ? -5 : 1, difficulty > 1 ? 8 : 6),
      degrees: angle.degrees,
      twice: angle.twiceSine,
    };
  },
  render: ({ a, d, degrees, twice }): Slide => {
    const sineValue = twice / 2;
    const scaled = (a * twice) / 2;
    const total = scaled + d;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Evaluate $y = ${a}\\sin(x) ${signedTex(d)}$ at $x = ${degrees}^{\\circ}$, one step at a time.`,
        },
      ],
      start: [`${a}`, '\\times', `\\sin(${degrees}^{\\circ})`, signedTex(d)],
      reductions: [
        {
          span: [2, 3],
          value: `${sineValue}`,
          bank: [...new Set([`${sineValue}`, '1', '0', '-1', '0.5'])],
        },
        {
          span: [0, 3],
          value: `${scaled}`,
          bank: [...new Set([`${scaled}`, `${a}`, `${-scaled}`, `${a * 2}`])],
        },
        {
          span: [0, 2],
          value: `${total}`,
          bank: [...new Set([`${total}`, `${scaled - d}`, `${d}`, `${scaled}`])],
        },
      ],
    };
  },
  solution: ({ a, d, degrees, twice }) => [
    { text: `Work outwards. Take the sine of the angle first, before anything multiplies it.` },
    { tex: `\\sin(${degrees}^{\\circ}) = ${twice / 2}` },
    { text: 'Then multiply by the amplitude, and only then add the vertical shift.' },
    {
      tex: `${a} \\times ${twice / 2} ${signedTex(d)} = ${(a * twice) / 2 + d}`,
    },
    {
      text: `Doing the addition first would be the usual error: $${a}\\sin(x) ${signedTex(d)}$ means multiply *then* add, because the shift is outside the sine.`,
    },
  ],
};


interface WaveSliderParams {
  midline: number;
  amplitude: number;
  period: number;
  shift: number;
  /** Which feature of the wave the question is about. */
  asks: 'period' | 'amplitude' | 'midline';
}

/**
 * Read a feature off a drawn wave by dragging to it.
 *
 * Every other question in this course describes a wave in words and asks for a
 * number. This draws the wave and asks *where* — which is the thing the words
 * were describing all along, and a different skill from arithmetic on two peak
 * times. A learner who has memorised "period is the gap between peaks" still
 * has to find the peaks.
 *
 * The marker tracks the handle across the same figure the teaching slides use,
 * so the answer is checked against the picture rather than against a formula.
 */
const waveSlider: Generator<WaveSliderParams> = {
  id: 'trig-read-graph',
  sample: (rng, difficulty) => ({
    midline: rng.int(difficulty > 1 ? -4 : 0, difficulty > 1 ? 6 : 5),
    amplitude: rng.int(1, difficulty > 1 ? 5 : 4),
    period: rng.int(2, difficulty > 1 ? 10 : 8),
    shift: rng.int(0, difficulty > 1 ? 4 : 2),
    asks: rng.pick(['period', 'amplitude', 'midline'] as const),
  }),
  render: ({ midline, amplitude, period, shift, asks }): Slide => {
    const f = wave(midline, amplitude, period, shift);
    // Two and a bit cycles, so "the next time it happens" is on screen with the
    // first time — which is what makes a period readable at all.
    const xMax = Math.max(period * 2.2, 8);
    const top = midline + amplitude;
    const bottom = midline - amplitude;

    const svg = plotSvg({
      xMin: 0,
      xMax,
      curves: [{ f }],
      horizontals: asks === 'midline' ? [] : [midline],
      yMin: bottom - 1.5,
      yMax: top + 1.5,
      label: 'A repeating quantity',
      marks:
        asks === 'period'
          ? [
              { x: shift + period / 4, y: top },
              { x: shift + period / 4 + period, y: top },
            ]
          : asks === 'amplitude'
            ? [{ x: shift + period / 4, y: top }]
            : [],
    });

    const answer = asks === 'period' ? period : asks === 'amplitude' ? amplitude : midline;
    // Where the marker measures from, so that dragging to the answer lands it
    // on the feature rather than at an arbitrary point on the axis.
    const firstPeak = shift + period / 4;
    const yLow = bottom - 1.5;
    const yHigh = top + 1.5;
    const prompt =
      asks === 'period'
        ? 'The two ringed points are consecutive peaks. Slide to the **period** of this wave.'
        : asks === 'amplitude'
          ? 'The dashed line is the midline and the ringed point is a peak. Slide to the **amplitude**.'
          : 'Slide to the **midline** of this wave — the level it swings evenly either side of.';

    // The slider spans what the question could sensibly be, not what it is: a
    // range that stopped at the answer would give it away at the end stop.
    const min = asks === 'midline' ? -6 : 0;
    const max = asks === 'period' ? 12 : asks === 'amplitude' ? 6 : 8;

    return {
      kind: 'slider',
      prompt: [{ kind: 'prose', text: prompt }],
      min,
      max,
      step: 1,
      answer,
      readout: asks === 'period' ? '\\text{period} = {v}' : asks === 'amplitude' ? 'a = {v}' : 'y = {v}',
      figure:
        asks === 'period'
          ? // Measured from the first ringed peak: drag until the line reaches
            // the second one, and the gap you have spanned is the period.
            { svg, xMin: 0, xMax, origin: firstPeak }
          : asks === 'amplitude'
            ? // Measured up from the midline, so the line meets the peak.
              { svg, xMin: yLow, xMax: yHigh, axis: 'y', origin: midline }
            : // A height, read straight off the vertical scale.
              { svg, xMin: yLow, xMax: yHigh, axis: 'y' },
    };
  },
  solution: ({ midline, amplitude, period, asks }) => {
    if (asks === 'period') {
      return [
        {
          text: 'The period is the gap along the bottom between one feature and the very next time it happens — here, between the two ringed peaks.',
        },
        { tex: `\\text{period} = ${period}` },
        {
          text: 'Pairing a peak with a trough instead would give half of that. The two points have to be at the same place in the cycle, not just the same height.',
        },
      ];
    }
    if (asks === 'amplitude') {
      return [
        {
          text: 'The amplitude is measured from the midline up to a peak, not from the bottom of the wave to the top.',
        },
        { tex: `${midline + amplitude} - ${paren(midline)} = ${amplitude}` },
        {
          text: `The full swing from trough to peak is $${2 * amplitude}$, which is twice the amplitude and the most common wrong answer here.`,
        },
      ];
    }
    return [
      {
        text: 'The midline sits halfway between the highest and lowest the wave reaches, so the curve spends as long above it as below.',
      },
      { tex: `\\frac{${midline + amplitude} + ${paren(midline - amplitude)}}{2} = ${midline}` },
      {
        text: 'It is not where the curve starts, and it is not zero unless the wave happens to be centred there.',
      },
    ];
  },
};


/* ---------- evaluating an exact-value expression ---------- */

/** Angles whose sine and cosine are both whole: 0, ±1. */
const QUADRANT_ANGLES = [0, 90, 180, 270];

interface ExactTrigParams {
  /** Coefficient of the first term. */
  a: number;
  fn: 'sin' | 'cos';
  degrees: number;
  /** The second term's coefficient, or the vertical shift on the `wave` shape. */
  b: number;
  fn2: 'sin' | 'cos';
  degrees2: number;
  shape: 'wave' | 'pair';
}

/** The tree for a shape, so the render and the value agree by construction. */
function exactTrigExpr(p: ExactTrigParams): Expr {
  const first = bin('*', num(p.a), trig(p.fn, num(p.degrees)));
  if (p.shape === 'wave') return bin('+', first, num(p.b));
  return bin('-', first, bin('*', num(p.b), trig(p.fn2, num(p.degrees2))));
}

const exactValue = (fn: 'sin' | 'cos', degrees: number) => valueOf(trig(fn, num(degrees)));

/**
 * Evaluate an expression with exact trig values in it, one piece at a time.
 *
 * `trig-evaluate-wave` asks the same arithmetic as a `steps` slide, which hands
 * the learner the order: each reduction is offered in turn and there is no way
 * to take the addition first. Here the order is the question. Tapping the `+`
 * in $a\sin(\theta) + d$ before the multiplication is possible, and it is the
 * mistake the lesson is about — $2\sin(90^{\circ}) + 3$ is 5, not $2\sin(93)$.
 *
 * Angles are the quadrantal ones only, so every sine and cosine on screen is 0,
 * 1 or -1. Half values would put a bank of halves in front of the learner and
 * turn a question about order into a question about fractions.
 */
const evaluateExactTrig: Generator<ExactTrigParams> = {
  id: 'trig-evaluate-exact',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 9 : 6),
    fn: rng.pick(['sin', 'cos'] as const),
    degrees: rng.pick(QUADRANT_ANGLES),
    b: rng.int(2, difficulty > 1 ? 9 : 6),
    fn2: rng.pick(['sin', 'cos'] as const),
    degrees2: rng.pick(QUADRANT_ANGLES),
    shape: difficulty > 1 ? rng.pick(['wave', 'pair'] as const) : 'wave',
  }),
  render: (params): Slide => {
    const expr = exactTrigExpr(params);

    /** Six whole options around the right one, nearest first, negatives allowed. */
    const offer = (correct: number, ...near: number[]) => {
      const seen = new Set([correct]);
      const out = [correct];
      for (const value of near) {
        if (out.length >= 6) break;
        if (!Number.isInteger(value) || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
      }
      for (let step = 1; out.length < 6; step += 1) {
        for (const candidate of [correct + step, correct - step]) {
          if (out.length >= 6) break;
          if (seen.has(candidate)) continue;
          seen.add(candidate);
          out.push(candidate);
        }
      }
      return out.sort((x, y) => x - y).map(String);
    };

    const banks: Record<string, string[]> = {};
    const walk = (node: Expr, path: string): void => {
      if (node.kind === 'num') return;
      if (node.kind === 'binary') {
        walk(node.left, `${path}.l`);
        walk(node.right, `${path}.r`);
        const l = valueOf(node.left);
        const r = valueOf(node.right);
        banks[path] = offer(valueOf(node), l + r, l - r, l * r, r - l);
        return;
      }
      // Nothing else appears in these expressions, and a silent fall-through
      // would leave a node without a bank rather than say so.
      if (node.kind !== 'trig') throw new Error(`unexpected ${node.kind} node`);
      // The other function's value at the same angle is the slip worth
      // offering: sine and cosine swap 0 and 1 a quarter turn apart.
      const other = exactValue(node.fn === 'sin' ? 'cos' : 'sin', valueOf(node.arg));
      banks[path] = offer(valueOf(node), other, 0, 1, -1);
      walk(node.arg, `${path}.a`);
    };
    walk(expr, 'r');

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Work this out one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      expr,
      banks,
    };
  },
  choices: (params) => {
    const correct = valueOf(exactTrigExpr(params));
    const { a, b, fn, degrees, fn2, degrees2, shape } = params;
    const v1 = exactValue(fn, degrees);
    const v2 = exactValue(fn2, degrees2);
    const other = exactValue(fn === 'sin' ? 'cos' : 'sin', degrees);
    const wrong =
      shape === 'wave'
        ? [a * (v1 + b), a * other + b, a * v1 - b, a + v1 + b]
        : [a * v1 + b * v2, a * v1 - b * other, (a - b) * v1, a * other - b * v2];

    const seen = new Set([correct]);
    const picked: number[] = [];
    for (const value of wrong) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    for (let step = 1; picked.length < 3; step += 1) {
      for (const candidate of [correct + step, correct - step]) {
        if (picked.length === 3) break;
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        picked.push(candidate);
      }
    }
    return options(
      { tex: `${correct}` },
      ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })),
    );
  },
  solution: (params) => {
    const { a, b, fn, degrees, fn2, degrees2, shape } = params;
    const v1 = exactValue(fn, degrees);
    const total = valueOf(exactTrigExpr(params));
    if (shape === 'wave') {
      return [
        {
          text: 'A sine or cosine is a number, so take it first. At a quarter turn and its multiples the value is always 0, 1 or -1.',
        },
        { tex: `\\${fn}\\left(${degrees}^{\\circ}\\right) = ${v1}` },
        { tex: `${a} \\times ${paren(v1)} + ${b} = ${a * v1} + ${b} = ${total}` },
        {
          text: `The multiplication has to happen before the addition, so this is $${total}$ and not $${a * (v1 + b)}$. The $${b}$ sits outside the $\\${fn}$, which is what makes it a shift rather than part of the angle.`,
        },
      ];
    }
    const v2 = exactValue(fn2, degrees2);
    return [
      {
        text: 'Both trig values first — each one is 0, 1 or -1 at these angles — and only then the two multiplications.',
      },
      {
        tex: `\\${fn}\\left(${degrees}^{\\circ}\\right) = ${v1} \\qquad \\${fn2}\\left(${degrees2}^{\\circ}\\right) = ${v2}`,
      },
      { tex: `${a} \\times ${paren(v1)} - ${b} \\times ${paren(v2)} = ${a * v1} - ${paren(b * v2)} = ${total}` },
      {
        text: `Taking the subtraction first would leave $${a * v1 - b}$ multiplied by something, which is a different number. Each product is settled before the minus can touch it.`,
      },
    ];
  },
};

/* ---------- Level 3: reading the period out of the formula ---------- */

/** Degrees in one full turn: the period of sin(t) and cos(t) when t is in degrees. */
const FULL_TURN = 360;
/** Values of b that divide a full turn, so every period is a whole number of degrees. */
const B_VALUES = [2, 3, 4, 5, 6, 8, 9, 10, 12];
/** An unsimplified fraction in mathjs syntax: a writing the lesson promises is accepted. Never displayed. */
const unsimplified = (numerator: number, denominator: number): string => `${numerator}/${denominator}`;

/** The wave written with its multiplier and shift, e.g. "2\\sin(3t) + 4". */
function scaledWaveTex(a: number, fn: 'sin' | 'cos', inner: string, d: number): string {
  return `${a === 1 ? '' : a}\\${fn}(${inner})${d === 0 ? '' : ` ${signedTex(d)}`}`;
}

interface PeriodFromBParams {
  a: number;
  b: number;
  d: number;
  fn: 'sin' | 'cos';
  direction: 'period' | 'findB';
}

/** Reading the period of sin(bt) or cos(bt) from b, and the reverse. */
const periodFromB: Generator<PeriodFromBParams> = {
  id: 'trig-period-from-b',
  sample: (rng, difficulty) => {
    const a = rng.int(1, difficulty > 1 ? 6 : 3);
    const b = rng.pick(B_VALUES);
    const d = difficulty > 1 ? nonZeroInt(rng, -6, 8) : 0;
    const fn = rng.pick(['sin', 'cos'] as const);
    const direction = difficulty > 1 && rng.chance(0.5) ? 'findB' : 'period';
    return { a, b, d, fn, direction };
  },
  choices: ({ b, direction }) => {
    const p = FULL_TURN / b;
    if (direction === 'period') {
      return options(
        { tex: `${p}`, answer: `${p}` },
        { tex: `${2 * p}`, answer: `${2 * p}` },
        { tex: `${b}`, answer: `${b}` },
        { tex: `${FULL_TURN}`, answer: `${FULL_TURN}` },
      );
    }
    return options(
      { tex: `${b}`, answer: `${b}` },
      { tex: `${p}`, answer: `${p}` },
      { tex: `${2 * b}`, answer: `${2 * b}` },
      { tex: `${FULL_TURN}`, answer: `${FULL_TURN}` },
    );
  },
  render: ({ a, b, d, fn, direction }): Slide => {
    const p = FULL_TURN / b;
    if (direction === 'period') {
      return {
        kind: 'expression',
        prompt: [
          {
            kind: 'prose',
            text: `What is the period of $y = ${scaledWaveTex(a, fn, `${b}t`, d)}$? Here $t$ is in degrees.`,
          },
        ],
        lead: '\\text{period} =',
        keypad: NUMBER_KEYS,
        answer: `${p}`,
        alsoAccepts: [unsimplified(FULL_TURN, b)],
        domain: 'real',
        mode: 'exact',
      };
    }
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The curve $y = ${scaledWaveTex(a, fn, 'bt', d)}$ has period $${p}^{\\circ}$. What is $b$?`,
        },
      ],
      lead: 'b =',
      keypad: NUMBER_KEYS,
      answer: `${b}`,
      alsoAccepts: [unsimplified(FULL_TURN, p)],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ b, direction }) => {
    const p = FULL_TURN / b;
    if (direction === 'period') {
      return [
        {
          text: `The $b$ inside the bracket is how many cycles fit into one turn. Sine and cosine repeat every $360^{\\circ}$, so $${b}$ cycles of this curve fit into $360^{\\circ}$.`,
        },
        { tex: `\\text{period} = \\frac{360^{\\circ}}{${b}} = ${p}^{\\circ}` },
        {
          text: 'The multiplier in front sets the height and anything added on the end moves the curve up or down; neither touches the period. Only what is inside the bracket does.',
        },
      ];
    }
    return [
      {
        text: 'Period and $b$ are reciprocals across a full turn: the period is $360^{\\circ}$ divided by $b$, so $b$ is $360^{\\circ}$ divided by the period.',
      },
      { tex: `b = \\frac{360^{\\circ}}{${p}^{\\circ}} = ${b}` },
      {
        text: `So the curve completes $${b}$ full cycles between $0^{\\circ}$ and $360^{\\circ}$. A larger $b$ means a shorter period — the reversal that comes with living inside the bracket.`,
      },
    ];
  },
};

/* ---------- Level 2: symmetries of the circle ---------- */

/** Base angles for the symmetry questions. 45 is left out: its sine and cosine coincide, so the cofunction distractor would equal the answer. */
const BASE_ANGLES = [10, 15, 20, 25, 30, 35, 40, 50, 55, 60, 65, 70, 75, 80];
type Relation = 'supplement' | 'halfTurn' | 'reflex' | 'negative';
const RELATIONS: Relation[] = ['supplement', 'halfTurn', 'reflex', 'negative'];

/** The related angle: 180 - a, 180 + a, 360 - a, -a. */
function relatedAngle(base: number, relation: Relation): number {
  switch (relation) {
    case 'supplement':
      return 180 - base;
    case 'halfTurn':
      return 180 + base;
    case 'reflex':
      return 360 - base;
    case 'negative':
      return -base;
  }
}

/**
 * Whether the function keeps its sign at the related angle, read off the circle:
 * sine is the height (positive above the centre), cosine the displacement (positive to the right).
 */
const KEEPS_SIGN: Record<'sin' | 'cos', Record<Relation, boolean>> = {
  sin: { supplement: true, halfTurn: false, reflex: false, negative: false },
  cos: { supplement: false, halfTurn: false, reflex: true, negative: true },
};

interface RelatedAngleParams {
  base: number;
  fn: 'sin' | 'cos';
  relation: Relation;
  form: 'symbolic' | 'numeric';
}

/**
 * The sine or cosine of an angle, related to that of a base angle by a
 * symmetry of the circle: a reflection or a half turn.
 *
 * No `choices()` on this generator: its symbolic form already renders as a
 * native `choice`, and a derived `+choice` form would render the same
 * question twice.
 */
const relatedAngleGenerator: Generator<RelatedAngleParams> = {
  id: 'trig-related-angle',
  sample: (rng, difficulty) => {
    const base = rng.pick(BASE_ANGLES);
    const fn = rng.pick(['sin', 'cos'] as const);
    const relation = rng.pick(difficulty > 1 ? RELATIONS : RELATIONS.slice(0, 3));
    const form = difficulty > 1 && rng.chance(0.5) ? 'numeric' : 'symbolic';
    return { base, fn, relation, form };
  },
  render: (params): Slide => {
    const { base, fn, relation, form } = params;
    const angle = relatedAngle(base, relation);
    const keeps = KEEPS_SIGN[fn][relation];
    const co = fn === 'sin' ? 'cos' : 'sin';

    if (form === 'symbolic') {
      const opts = [
        { id: 'same', label: `\\${fn}(${base}^{\\circ})`, tex: true },
        { id: 'negated', label: `-\\${fn}(${base}^{\\circ})`, tex: true },
        { id: 'co', label: `\\${co}(${base}^{\\circ})`, tex: true },
        { id: 'coNegated', label: `-\\${co}(${base}^{\\circ})`, tex: true },
      ];
      const turn = (base / 5) % 4;
      const turned = [...opts.slice(turn), ...opts.slice(0, turn)];
      return {
        kind: 'choice',
        prompt: [{ kind: 'prose', text: `Which of these is equal to $\\${fn}(${angle}^{\\circ})$?` }],
        options: turned,
        correctId: keeps ? 'same' : 'negated',
      };
    }

    const shown = Math.abs((fn === 'sin' ? Math.sin : Math.cos)((base * Math.PI) / 180)).toFixed(3);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Given that $\\${fn}(${base}^{\\circ}) \\approx ${shown}$, what is $\\${fn}(${angle}^{\\circ})$? Give it to three decimal places, with its sign.`,
        },
      ],
      lead: `\\${fn}(${angle}^{\\circ}) \\approx`,
      keypad: NUMBER_KEYS,
      answer: `${keeps ? '' : '-'}${shown}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ base, fn, relation, form }) => {
    const angle = relatedAngle(base, relation);
    const keeps = KEEPS_SIGN[fn][relation];
    const how: Record<Relation, string> = {
      supplement:
        'they are reflections of each other in the vertical axis, so the point is at the same height on the other side.',
      halfTurn:
        'the point is diametrically opposite, so both the height and the displacement change sign.',
      reflex:
        'they are reflections in the horizontal axis, so the displacement is the same and the height is flipped.',
      negative: 'a clockwise turn reflects the point in the horizontal axis: same displacement, flipped height.',
    };
    const core = `\\${fn}(${angle}^{\\circ}) = ${keeps ? '' : '-'}\\${fn}(${base}^{\\circ})`;
    const shown = Math.abs((fn === 'sin' ? Math.sin : Math.cos)((base * Math.PI) / 180)).toFixed(3);
    const tex = form === 'numeric' ? `${core} \\approx ${keeps ? '' : '-'}${shown}` : core;
    return [
      { text: `On the circle, $${angle}^{\\circ}$ and $${base}^{\\circ}$ are related by a symmetry: ${how[relation]}` },
      { tex },
      {
        text:
          fn === 'sin'
            ? 'Sine is the height, so it keeps its sign across the vertical axis and flips it across the horizontal one.'
            : 'Cosine is the displacement, so it keeps its sign across the horizontal axis and flips it across the vertical one.',
      },
    ];
  },
};

/* ---------- Level 2: solving for the angle ---------- */

/** The angles at which sine or cosine is +1/2 or -1/2, in [0, 360) and in (-180, 180]. */
const HALF_VALUE_ANGLES = {
  full: { sin: { positive: [30, 150], negative: [210, 330] }, cos: { positive: [60, 300], negative: [120, 240] } },
  signed: { sin: { positive: [30, 150], negative: [-30, -150] }, cos: { positive: [60, -60], negative: [120, -120] } },
} as const;

/** The bank, answer tokens first, sorted so one question renders one way (PITFALLS 3.10). */
const sortedBank = (answer: string[], distractors: string[]): string[] =>
  [...answer, ...distractors.filter((t) => !answer.includes(t))].sort();

interface SolveHeightParams {
  radius: number;
  fn: 'sin' | 'cos';
  positive: boolean;
  form: 'circle' | 'equation';
  signedRange: boolean;
}

/** The three pairs of angles a draw offers: the true solutions, the wrong-sign pair, and the other function's pair. */
function solveHeightRows(
  params: SolveHeightParams,
): { solutions: readonly number[]; wrongSign: readonly number[]; otherFn: readonly number[] } {
  const { fn, positive, signedRange } = params;
  const row = HALF_VALUE_ANGLES[signedRange ? 'signed' : 'full'];
  const solutions = row[fn][positive ? 'positive' : 'negative'];
  const wrongSign = row[fn][positive ? 'negative' : 'positive'];
  const otherFn = row[fn === 'sin' ? 'cos' : 'sin'][positive ? 'positive' : 'negative'];
  return { solutions, wrongSign, otherFn };
}

/** The explanatory third solution step, one per (fn, sign, range) combination. */
function solveHeightExplanation(fn: 'sin' | 'cos', positive: boolean, signedRange: boolean): string {
  if (fn === 'sin' && positive) {
    return 'Sine is $\\tfrac{1}{2}$ at the reference angle $30^{\\circ}$; above the centre the other angle is its reflection in the vertical axis, $180^{\\circ} - 30^{\\circ} = 150^{\\circ}$.';
  }
  if (fn === 'sin') {
    return signedRange
      ? 'Below the centre, named by clockwise turns, they are $-30^{\\circ}$ and $-150^{\\circ}$: the reflections of $30^{\\circ}$ and $150^{\\circ}$ in the horizontal axis.'
      : 'Below the centre the two angles are $180^{\\circ} + 30^{\\circ} = 210^{\\circ}$ and $360^{\\circ} - 30^{\\circ} = 330^{\\circ}$.';
  }
  if (positive) {
    return signedRange
      ? 'Cosine is $\\tfrac{1}{2}$ at $60^{\\circ}$; to the right of the centre the other angle is its reflection in the horizontal axis, $360^{\\circ} - 60^{\\circ} = 300^{\\circ}$, which is $-60^{\\circ}$ when the lower half is named by clockwise turns.'
      : 'Cosine is $\\tfrac{1}{2}$ at $60^{\\circ}$; to the right of the centre the other angle is its reflection in the horizontal axis, $360^{\\circ} - 60^{\\circ} = 300^{\\circ}$.';
  }
  return signedRange
    ? 'To the left of the centre they are $120^{\\circ}$ and $-120^{\\circ}$, reflections of each other in the horizontal axis.'
    : 'To the left of the centre the two angles are $180^{\\circ} - 60^{\\circ} = 120^{\\circ}$ and $180^{\\circ} + 60^{\\circ} = 240^{\\circ}$.';
}

/** Given a height (or displacement) reached, find both angles on the turn. */
const solveHeight: Generator<SolveHeightParams> = {
  id: 'trig-solve-height',
  sample: (rng, difficulty) => {
    const radius = rng.int(1, 8) * 2;
    const fn = rng.pick(['sin', 'cos'] as const);
    const positive = rng.chance(0.5);
    const form = rng.pick(['circle', 'equation'] as const);
    const signedRange = difficulty > 1 && rng.chance(0.5);
    return { radius, fn, positive, form, signedRange };
  },
  choices: (params) => {
    const { solutions, wrongSign, otherFn } = solveHeightRows(params);
    const pair = (p: readonly number[]) => ({ tex: `${p[0]}^{\\circ} \\text{ and } ${p[1]}^{\\circ}` });
    return options(pair(solutions), pair(wrongSign), pair(otherFn), pair([solutions[0], wrongSign[0]]));
  },
  render: (params): Slide => {
    const { radius, fn, positive, form, signedRange } = params;
    const half = radius / 2;
    const value = positive ? half : -half;
    const { solutions, wrongSign, otherFn } = solveHeightRows(params);
    const rangeTex = signedRange ? '-180^{\\circ} < \\theta \\le 180^{\\circ}' : '0^{\\circ} \\le \\theta < 360^{\\circ}';
    const where =
      fn === 'sin' ? (positive ? 'above' : 'below') : positive ? 'to the right of' : 'to the left of';
    const prompt =
      form === 'circle'
        ? `A point starts at the far right of a circle of radius $${radius}$ centred at the origin and turns anticlockwise through an angle $\\theta$. Find both values of $\\theta$ with $${rangeTex}$ at which the point is $${half}$ ${where} the centre.`
        : `Find both solutions of $${radius}\\${fn}(\\theta) = ${value}$ with $${rangeTex}$.`;
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: prompt }],
      template: '\\theta = {0}^{\\circ} \\quad \\text{or} \\quad \\theta = {1}^{\\circ}',
      bank: sortedBank(solutions.map(String), [...wrongSign, ...otherFn].map(String)),
      answer: solutions.map(String),
      unordered: true,
    };
  },
  solution: (params) => {
    const { radius, fn, positive, form, signedRange } = params;
    const half = radius / 2;
    const value = positive ? half : -half;
    const { solutions } = solveHeightRows(params);
    const heightWord = fn === 'sin' ? 'height' : 'displacement';
    const step1 =
      form === 'circle'
        ? `The ${heightWord} is $${radius}\\${fn}(\\theta)$, so $${radius}\\${fn}(\\theta) = ${value}$. Dividing by $${radius}$ leaves $\\${fn}(\\theta) = ${positive ? '' : '-'}\\tfrac{1}{2}$.`
        : `Dividing by $${radius}$ leaves $\\${fn}(\\theta) = ${positive ? '' : '-'}\\tfrac{1}{2}$.`;
    return [
      { text: step1 },
      {
        tex: `\\${fn}(\\theta) = ${positive ? '' : '-'}\\tfrac{1}{2} \\quad \\Rightarrow \\quad \\theta = ${solutions[0]}^{\\circ} \\text{ or } ${solutions[1]}^{\\circ}`,
      },
      { text: solveHeightExplanation(fn, positive, signedRange) },
    ];
  },
};

/* ---------- Level 2: the Pythagorean identity ---------- */

/** Pythagorean triples, so a sine given as a fraction has a cosine that is also a fraction. Exported for the scratch oracle. */
export const IDENTITY_TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
];

/** Sine is the height, positive in the upper half; cosine the displacement, positive on the right. */
const positiveIn = (fn: 'sin' | 'cos', quadrant: number): boolean =>
  fn === 'sin' ? quadrant <= 2 : quadrant === 1 || quadrant === 4;

const QUADRANT_RANGE = [
  '0^{\\circ} < \\theta < 90^{\\circ}',
  '90^{\\circ} < \\theta < 180^{\\circ}',
  '180^{\\circ} < \\theta < 270^{\\circ}',
  '270^{\\circ} < \\theta < 360^{\\circ}',
];

interface IdentityParams {
  index: number;
  givenLeg: 0 | 1;
  given: 'sin' | 'cos';
  quadrant: number;
}

/** A signed fraction n/h, in mathjs-displayable TeX. */
const fracTex = (positive: boolean, n: number, h: number): string =>
  `${positive ? '' : '-'}\\tfrac{${n}}{${h}}`;

/** Find the cosine from the sine (or the reverse) with the Pythagorean identity. */
const pythagorean: Generator<IdentityParams> = {
  id: 'trig-pythagorean',
  sample: (rng, difficulty) => {
    const index = rng.int(0, 5);
    const givenLeg = rng.int(0, 1) as 0 | 1;
    const given = rng.pick(['sin', 'cos'] as const);
    const quadrant = rng.int(1, difficulty > 1 ? 4 : 2);
    return { index, givenLeg, given, quadrant };
  },
  choices: (params) => {
    const { index, givenLeg, given, quadrant } = params;
    const [x, y, h] = IDENTITY_TRIPLES[index];
    const givenNum = givenLeg === 0 ? x : y;
    const askedNum = givenLeg === 0 ? y : x;
    const asked = given === 'sin' ? 'cos' : 'sin';
    const gs = positiveIn(given, quadrant);
    const as = positiveIn(asked, quadrant);
    const frac = (positive: boolean, n: number) => ({
      tex: fracTex(positive, n, h),
      answer: `${positive ? '' : '-'}${n}/${h}`,
    });
    return options(frac(as, askedNum), frac(!as, askedNum), frac(gs, givenNum), frac(as, h - givenNum));
  },
  render: (params): Slide => {
    const { index, givenLeg, given, quadrant } = params;
    const [x, y, h] = IDENTITY_TRIPLES[index];
    const givenNum = givenLeg === 0 ? x : y;
    const askedNum = givenLeg === 0 ? y : x;
    const asked = given === 'sin' ? 'cos' : 'sin';
    const gs = positiveIn(given, quadrant);
    const as = positiveIn(asked, quadrant);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$\\${given}(\\theta) = ${fracTex(gs, givenNum, h)}$ and $${QUADRANT_RANGE[quadrant - 1]}$. What is $\\${asked}(\\theta)$? Give it as a fraction.`,
        },
      ],
      lead: `\\${asked}(\\theta) =`,
      keypad: NUMBER_KEYS,
      answer: `${as ? '' : '-'}${askedNum}/${h}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { index, givenLeg, given, quadrant } = params;
    const [x, y, h] = IDENTITY_TRIPLES[index];
    const givenNum = givenLeg === 0 ? x : y;
    const askedNum = givenLeg === 0 ? y : x;
    const asked = given === 'sin' ? 'cos' : 'sin';
    const gs = positiveIn(given, quadrant);
    const as = positiveIn(asked, quadrant);
    const where =
      asked === 'sin'
        ? as
          ? 'above the centre'
          : 'below the centre'
        : as
          ? 'to the right of the centre'
          : 'to the left of the centre';
    return [
      {
        text: 'The point is on a circle of radius $1$, so its two coordinates satisfy $\\cos^2(\\theta) + \\sin^2(\\theta) = 1$. Square the value you have and subtract it from $1$.',
      },
      {
        tex: `\\${asked}^2(\\theta) = 1 - \\left(${fracTex(gs, givenNum, h)}\\right)^2 = 1 - \\tfrac{${givenNum * givenNum}}{${h * h}} = \\tfrac{${askedNum * askedNum}}{${h * h}}`,
      },
      {
        text: `Taking the square root gives $\\tfrac{${askedNum}}{${h}}$ up to sign, and the quadrant decides the sign: with $${QUADRANT_RANGE[quadrant - 1]}$ the point is ${where}, so $\\${asked}(\\theta)$ is ${as ? 'positive' : 'negative'}.`,
      },
      { tex: `\\${asked}(\\theta) = ${fracTex(as, askedNum, h)}` },
    ];
  },
};

/* ---------- Widening the decks: more shapes for the same skills ---------- */

/**
 * The answer's tokens, plus a guaranteed number of distractors, in numeric
 * order.
 *
 * `sortedBank` above takes the distractors it is given and hopes at least one
 * survives the overlap with the answer — which is fine where the distractors
 * are angles from a table that cannot collide, and not fine where they are
 * arithmetic on the question's own numbers. A midline of twice the amplitude
 * makes `amplitude` equal the trough, and a bank whose every distractor
 * happened to collide would leave the learner with nothing wrong to place.
 * So the preferred slips are tried first and the shortfall is made up from
 * values either side of the first answer.
 */
function bankAround(answer: string[], preferred: number[], extra = 3): string[] {
  const taken = new Set(answer);
  const out: string[] = [];
  for (const value of preferred) {
    if (out.length >= extra) break;
    const token = String(value);
    if (taken.has(token)) continue;
    taken.add(token);
    out.push(token);
  }
  const base = Number(answer[0]);
  for (let step = 1; out.length < extra; step += 1) {
    for (const candidate of [base + step, base - step]) {
      if (out.length >= extra) break;
      const token = String(candidate);
      if (taken.has(token)) continue;
      taken.add(token);
      out.push(token);
    }
  }
  return [...answer, ...out].sort((a, b) => Number(a) - Number(b));
}

/** Everyday events that recur, for questions about *when* rather than *how often*. */
const REPEATING_EVENTS: { repeats: string; occurrence: string; unit: string }[] = [
  { repeats: 'A lighthouse flashes', occurrence: 'flash', unit: 'seconds' },
  { repeats: 'A bus leaves the stop', occurrence: 'departure', unit: 'minutes' },
  { repeats: 'The tide reaches its highest', occurrence: 'high tide', unit: 'hours' },
  { repeats: 'A piston returns to the top of its stroke', occurrence: 'return', unit: 'seconds' },
  { repeats: 'A seat on a Ferris wheel reaches the top', occurrence: 'arrival at the top', unit: 'seconds' },
  { repeats: 'A valve on a bicycle wheel touches the road', occurrence: 'touch', unit: 'seconds' },
  { repeats: 'A pendulum reaches the far side of its swing', occurrence: 'arrival', unit: 'seconds' },
  { repeats: 'A wave crest reaches the harbour wall', occurrence: 'crest', unit: 'seconds' },
  { repeats: 'A garden sprinkler passes the same flower bed', occurrence: 'pass', unit: 'seconds' },
  { repeats: 'A metronome clicks', occurrence: 'click', unit: 'seconds' },
];

interface RepeatTimesParams {
  index: number;
  first: number;
  period: number;
}

/**
 * When does it happen again?
 *
 * The period questions all run the same way round — a graph is described and a
 * number comes out. This runs the other way: the period is given and the
 * learner has to *use* it, which is the thing a period is for. Three blanks in
 * a row also make an off-by-one visible, because the mistake shows up in every
 * one of them rather than in a single answer that is simply marked wrong.
 */
const repeatTimes: Generator<RepeatTimesParams> = {
  id: 'trig-repeat-times',
  sample: (rng, difficulty) => ({
    index: rng.int(0, REPEATING_EVENTS.length - 1),
    first: rng.int(1, difficulty > 1 ? 9 : 6),
    period: rng.int(2, difficulty > 1 ? 11 : 8),
  }),
  render: ({ index, first, period }): Slide => {
    const event = REPEATING_EVENTS[index];
    const answer = [first + period, first + 2 * period, first + 3 * period].map(String);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${event.repeats} every $${period}$ ${event.unit}, and the first ${event.occurrence} is at $t = ${first}$. Fill in the times of the next three.`,
        },
      ],
      template: 't = {0} \\qquad t = {1} \\qquad t = {2}',
      bank: bankAround(answer, [first, period, first + 4 * period, first + period + 1]),
      answer,
    };
  },
  solution: ({ index, first, period }) => [
    {
      text: `Each ${REPEATING_EVENTS[index].occurrence} is $${period}$ after the one before it, so add the period on again and again.`,
    },
    {
      tex: `${first} + ${period} = ${first + period} \\qquad ${first + period} + ${period} = ${first + 2 * period} \\qquad ${first + 2 * period} + ${period} = ${first + 3 * period}`,
    },
    {
      text: `Every one of them is $${first} + ${period}n$ for a whole number $n$. Starting the count at $${first} + ${period}$ rather than at $${first}$ is the usual slip: the first one has already happened.`,
    },
  ],
};

/**
 * Quantities sorted by why they do or do not have a period.
 *
 * Four lists rather than two, because "not periodic" hides two quite different
 * failures — a quantity that never comes back at all, and one that comes back
 * but not on a fixed cycle. A learner who has only met the first thinks
 * "repeats" and "periodic" are the same word.
 */
const FLOW_SUBJECTS: Record<'periodic' | 'none' | 'uneven' | 'dying', string[]> = {
  periodic: [
    'the height of a seat on a turning Ferris wheel',
    'the depth of water at a harbour wall through the tide',
    'the voltage in a mains socket',
    'the position of a piston in a running engine',
    'the angle of a clock hand',
    'the phase of the moon',
    'the length of the day through the year',
    'the brightness of a lighthouse beam from the shore',
  ],
  none: [
    'the total distance a car has driven',
    'the height of a child as they grow',
    'the reading on an electricity meter',
    'the age of a tree',
    'the mileage on an odometer',
    'the total rainfall recorded since January',
    'the number of words written in a diary',
    'the amount of sand that has fallen through an hourglass',
  ],
  uneven: [
    'the number of people in a shop through a week',
    'the rainfall in a town week by week',
    'the height of a ball as it is dribbled by hand',
    'the temperature outside minute by minute',
    'the number of cars crossing a bridge each hour',
    'the queue at a coffee counter during a day',
    'the noise in a classroom over a morning',
    'the speed of a car in city traffic',
  ],
  dying: [
    'the height of a bouncing ball, bounce after bounce',
    'the swing of a pendulum slowed by friction',
    'the sound of a plucked guitar string fading',
    'the ripple height after a stone is dropped in a pond',
    'the bounce of a car on worn suspension',
    'the wobble of a spun coin coming to rest',
    'the shudder of a door after it is slammed',
    'the vibration of a tuning fork dying away',
  ],
};

interface PeriodicFlowParams {
  route: 'periodic' | 'none' | 'uneven' | 'dying';
  index: number;
}

/**
 * Is this periodic, and if not, why not?
 *
 * `trig-is-periodic` asks the same question as a pick-one between two options,
 * which a learner can get right by spotting the odd one out without ever
 * saying what periodic means. Walking the tree makes them commit to a reason
 * at each fork, and the two ways of failing to be periodic come out as two
 * different routes rather than as one shrug.
 */
const periodicFlow: Generator<PeriodicFlowParams> = {
  id: 'trig-periodic-flow',
  sample: (rng) => {
    const route = rng.pick(['periodic', 'none', 'uneven', 'dying'] as const);
    return { route, index: rng.int(0, FLOW_SUBJECTS[route].length - 1) };
  },
  render: ({ route, index }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Work down the questions to decide whether this quantity has a period. Each answer chooses what gets asked next.',
      },
    ],
    subject: `\\text{${FLOW_SUBJECTS[route][index]}}`,
    steps: [
      {
        id: 'returns',
        ask: 'Does it ever come back to a value it has already had?',
        branches: [
          { label: 'Yes, again and again', to: 'even' },
          {
            label: 'No, it only ever moves one way',
            outcome: 'Not periodic. Nothing comes round again, so there is no period to measure.',
          },
        ],
      },
      {
        id: 'even',
        ask: 'Are the gaps between one return and the next always the same length?',
        branches: [
          { label: 'Yes, evenly spaced', to: 'forever' },
          {
            label: 'No, the gaps change',
            outcome: 'It repeats, but not on a fixed cycle, so there is no single period.',
          },
        ],
      },
      {
        id: 'forever',
        ask: 'Does it keep repeating at the same size, or does it fade away?',
        branches: [
          {
            label: 'It keeps going',
            outcome: 'Periodic. The gap between one return and the next is its period.',
          },
          {
            label: 'It fades away',
            outcome: 'Not periodic. Each repeat is smaller than the last, so it never returns to the same value twice.',
          },
        ],
      },
    ],
    answer:
      route === 'none'
        ? ['No, it only ever moves one way']
        : route === 'uneven'
          ? ['Yes, again and again', 'No, the gaps change']
          : route === 'dying'
            ? ['Yes, again and again', 'Yes, evenly spaced', 'It fades away']
            : ['Yes, again and again', 'Yes, evenly spaced', 'It keeps going'],
  }),
  solution: ({ route, index }) => {
    const subject = FLOW_SUBJECTS[route][index];
    if (route === 'none') {
      return [
        { text: `Ask first whether ${subject} ever revisits a value. It does not — it only ever grows.` },
        {
          text: 'A quantity that never comes back cannot repeat, so the later questions about spacing never arise.',
        },
      ];
    }
    if (route === 'uneven') {
      return [
        { text: `${subject[0].toUpperCase()}${subject.slice(1)} does come back to earlier values, so the first answer is yes.` },
        {
          text: 'But the gaps between those returns are not the same length, and a period is a *fixed* gap. Repeating is not enough on its own.',
        },
      ];
    }
    if (route === 'dying') {
      return [
        { text: `${subject[0].toUpperCase()}${subject.slice(1)} returns at even intervals, so the first two answers are yes.` },
        {
          text: 'Each repeat is smaller than the last, though, so it never actually reaches the same value again. The timing repeats; the quantity does not.',
        },
      ];
    }
    return [
      { text: `${subject[0].toUpperCase()}${subject.slice(1)} comes back to the same values, at evenly spaced intervals, and keeps doing so.` },
      { text: 'All three answers are yes, so it is periodic and the gap between returns is its period.' },
    ];
  },
};

interface SwingParams {
  amplitude: number;
  midline: number;
  fn: 'sin' | 'cos';
}

/**
 * The peak, the trough, and the swing between them, as an evaluation tree.
 *
 * Midline and amplitude are taught as two separate readings and are then
 * confused for the rest of the course, usually as "the amplitude is the
 * distance from the bottom to the top". Laying the three values out as a tree
 * puts the swing *underneath* the peak and the trough, so the doubling is
 * something the learner builds rather than a rule to remember.
 */
const waveSwing: Generator<SwingParams> = {
  id: 'trig-wave-swing',
  sample: (rng, difficulty) => ({
    amplitude: rng.int(1, difficulty > 1 ? 7 : 4),
    midline: nonZeroInt(rng, difficulty > 1 ? -5 : 1, difficulty > 1 ? 8 : 6),
    fn: rng.pick(['sin', 'cos'] as const),
  }),
  render: ({ amplitude, midline, fn }): Slide => {
    const answer = [midline + amplitude, midline - amplitude, 2 * amplitude].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Fill the top row with the greatest value this wave reaches and then the least, and underneath them the full swing from one to the other.',
        },
      ],
      expression: `y = ${amplitude}\\${fn}(x) ${signedTex(midline)}`,
      nodes: [
        { id: 'peak', from: [] },
        { id: 'trough', from: [] },
        { id: 'swing', from: ['peak', 'trough'] },
      ],
      bank: bankAround(answer, [amplitude, midline, midline + 2 * amplitude, amplitude - midline]),
      answer,
    };
  },
  solution: ({ amplitude, midline }) => [
    {
      text: `The wave swings $${amplitude}$ either side of its midline, and the midline is the $${midline}$ sitting outside the function.`,
    },
    {
      tex: `${midline} + ${amplitude} = ${midline + amplitude} \\qquad ${midline} - ${amplitude} = ${midline - amplitude}`,
    },
    {
      text: `The full swing is peak minus trough, which is $${2 * amplitude}$ — twice the amplitude, not the amplitude itself. That doubling is the one worth remembering: amplitude is measured from the middle, never from the bottom.`,
    },
  ],
};

/** Quantities with a natural high and low, for reading a swing backwards. */
const SWING_CONTEXTS: { subject: string; unit: string }[] = [
  { subject: 'The depth of water at a harbour wall', unit: 'metres' },
  { subject: 'The height of a seat on a Ferris wheel', unit: 'metres' },
  { subject: 'The temperature in a greenhouse over a day', unit: 'degrees' },
  { subject: 'The height of a piston in an engine', unit: 'centimetres' },
  { subject: 'The number of hours of daylight through the year', unit: 'hours' },
  { subject: 'The reading on a swinging pressure gauge', unit: 'units' },
];

interface DescribeWaveParams {
  index: number;
  midline: number;
  amplitude: number;
}

/**
 * Midline and amplitude from the two extremes, in one question.
 *
 * `trig-midline` and `trig-amplitude` each ask half of this, and a learner who
 * has just done both in a row can answer the second without rereading the
 * question. Asking for both at once is where the two get told apart, because
 * one bank has to supply an average and a half-difference and they are
 * different numbers.
 */
const describeWave: Generator<DescribeWaveParams> = {
  id: 'trig-describe-wave',
  sample: (rng, difficulty) => ({
    index: rng.int(0, SWING_CONTEXTS.length - 1),
    midline: rng.int(difficulty > 1 ? -4 : 2, difficulty > 1 ? 14 : 10),
    amplitude: rng.int(1, difficulty > 1 ? 7 : 5),
  }),
  render: ({ index, midline, amplitude }): Slide => {
    const context = SWING_CONTEXTS[index];
    const high = midline + amplitude;
    const low = midline - amplitude;
    const answer = [String(midline), String(amplitude)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${context.subject} is greatest at $${high}$ ${context.unit} and least at $${low}$ ${context.unit}. Fill in the midline it swings about and the amplitude it swings by.`,
        },
      ],
      template: '\\text{midline: } y = {0} \\qquad \\text{amplitude} = {1}',
      bank: bankAround(answer, [high, low, 2 * amplitude, high + low]),
      answer,
    };
  },
  solution: ({ midline, amplitude }) => [
    { text: 'The midline is halfway between the two extremes, so average them.' },
    {
      tex: `\\frac{${midline + amplitude} + ${paren(midline - amplitude)}}{2} = ${midline}`,
    },
    { text: 'The amplitude is how far one extreme sits from that middle, which is half the gap between them.' },
    {
      tex: `\\frac{${midline + amplitude} - (${midline - amplitude})}{2} = ${amplitude}`,
    },
    {
      text: `Using the whole gap of $${2 * amplitude}$ as the amplitude is the standard mistake, and it is exactly twice the answer.`,
    },
  ],
};

/** The four quarter turns, where both coordinates of the point are whole. */
const QUARTER_TURNS: { degrees: number; sine: number; cosine: number }[] = [
  { degrees: 0, sine: 0, cosine: 1 },
  { degrees: 90, sine: 1, cosine: 0 },
  { degrees: 180, sine: 0, cosine: -1 },
  { degrees: 270, sine: -1, cosine: 0 },
];

interface CircleCoordsParams {
  radius: number;
  index: number;
}

/**
 * Both coordinates of the turning point at once.
 *
 * `trig-sine-from-circle` and `trig-cosine-from-circle` ask for one at a time,
 * and a learner can answer either by remembering which word goes with which
 * function. Asking for the pair makes the trade visible: at a quarter turn one
 * of them is the whole radius exactly when the other is nothing, which is the
 * fact the two graphs are built out of.
 *
 * Quarter turns only, so both coordinates are whole and the question stays
 * about the circle rather than about surds.
 */
const circleCoords: Generator<CircleCoordsParams> = {
  id: 'trig-circle-coords',
  sample: (rng, difficulty) => ({
    radius: rng.int(1, difficulty > 1 ? 10 : 7) * 2,
    index: rng.int(0, QUARTER_TURNS.length - 1),
  }),
  render: ({ radius, index }): Slide => {
    const turn = QUARTER_TURNS[index];
    const answer = [String(radius * turn.sine), String(radius * turn.cosine)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `A point starts at the far right of a circle of radius $${radius}$ centred on the origin and turns anticlockwise through $${turn.degrees}^{\\circ}$. Fill in its height above the centre and its displacement to the right of it.`,
        },
      ],
      template: '\\text{height} = {0} \\qquad \\text{displacement} = {1}',
      bank: bankAround(answer, [radius, -radius, radius / 2, -radius / 2]),
      answer,
    };
  },
  solution: ({ radius, index }) => {
    const turn = QUARTER_TURNS[index];
    return [
      {
        text: `The height is $${radius}\\sin(\\theta)$ and the displacement is $${radius}\\cos(\\theta)$, so put $\\theta = ${turn.degrees}^{\\circ}$ into both.`,
      },
      {
        tex: `${radius}\\sin(${turn.degrees}^{\\circ}) = ${radius * turn.sine} \\qquad ${radius}\\cos(${turn.degrees}^{\\circ}) = ${radius * turn.cosine}`,
      },
      {
        text: 'At a quarter turn the point sits on an axis, so one coordinate is the whole radius and the other is nothing. Which is which is the whole difference between the two functions.',
      },
    ];
  },
};

interface HeightStepsParams {
  radius: number;
  degrees: number;
  twice: number;
  fn: 'sin' | 'cos';
}

/**
 * The height of the turning point, worked out one operation at a time.
 *
 * The typed version of this question takes the trig value and the
 * multiplication in one go, so a learner who multiplies the angle by the
 * radius gets marked wrong with no indication of where it went astray.
 * Splitting it shows the order: the function is applied to the angle first,
 * and only its *value* meets the radius.
 */
const heightSteps: Generator<HeightStepsParams> = {
  id: 'trig-height-steps',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    const angle =
      fn === 'sin'
        ? (() => {
            const picked = rng.pick(SINE_ANGLES);
            return { degrees: picked.degrees, twice: picked.twiceSine };
          })()
        : (() => {
            const picked = rng.pick(COSINE_ANGLES);
            return { degrees: picked.degrees, twice: picked.twiceCosine };
          })();
    return { radius: rng.int(1, difficulty > 1 ? 9 : 6) * 2, fn, ...angle };
  },
  render: ({ radius, degrees, twice, fn }): Slide => {
    const value = twice / 2;
    const total = (radius * twice) / 2;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `A point on a wheel of radius $${radius}$ has turned through $${degrees}^{\\circ}$. Work out its ${fn === 'sin' ? 'height above the centre' : 'displacement to the right of the centre'}, one step at a time.`,
        },
      ],
      start: [`${radius}`, '\\times', `\\${fn}(${degrees}^{\\circ})`],
      reductions: [
        {
          span: [2, 3],
          value: `${value}`,
          bank: ['-1', '-0.5', '0', '0.5', '1'],
        },
        {
          span: [0, 3],
          value: `${total}`,
          bank: bankAround([`${total}`], [radius, -total, radius / 2, degrees]),
        },
      ],
    };
  },
  solution: ({ radius, degrees, twice, fn }) => [
    {
      text: `The $\\${fn}$ is applied to the angle, so settle it before anything else touches it.`,
    },
    { tex: `\\${fn}(${degrees}^{\\circ}) = ${twice / 2}` },
    { text: 'That value is a plain number, and it is what the radius multiplies.' },
    { tex: `${radius} \\times ${twice / 2} = ${(radius * twice) / 2}` },
    {
      text: `Multiplying the radius by the angle instead would give $${radius * degrees}$, which is not a length on a circle of radius $${radius}$ at all.`,
    },
  ],
};

interface EvaluateTreeParams {
  a: number;
  b: number;
  degrees: number;
  degrees2: number;
  fn: 'sin' | 'cos';
  fn2: 'sin' | 'cos';
}

/**
 * A two-term expression, each term settled before they are added.
 *
 * The same arithmetic as `trig-evaluate-exact`, laid out rather than tapped:
 * the two products sit side by side on the top row with the total underneath,
 * so what has to happen before the addition is a shape rather than a rule.
 * Quadrantal angles only, so every value on the tree is whole.
 */
const evaluateTree: Generator<EvaluateTreeParams> = {
  id: 'trig-evaluate-tree',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 9 : 6),
    b: rng.int(2, difficulty > 1 ? 9 : 6),
    degrees: rng.pick(QUADRANT_ANGLES),
    degrees2: rng.pick(QUADRANT_ANGLES),
    fn: rng.pick(['sin', 'cos'] as const),
    fn2: rng.pick(['sin', 'cos'] as const),
  }),
  render: ({ a, b, degrees, degrees2, fn, fn2 }): Slide => {
    const left = a * exactValue(fn, degrees);
    const right = b * exactValue(fn2, degrees2);
    const answer = [left, right, left + right].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Fill the top row with the value of each term, in the order they are written, and their total underneath.',
        },
      ],
      expression: `${a}\\${fn}(${degrees}^{\\circ}) + ${b}\\${fn2}(${degrees2}^{\\circ})`,
      nodes: [
        { id: 'left', from: [] },
        { id: 'right', from: [] },
        { id: 'total', from: ['left', 'right'] },
      ],
      bank: bankAround(answer, [a, b, a + b, left - right]),
      answer,
    };
  },
  solution: ({ a, b, degrees, degrees2, fn, fn2 }) => {
    const v1 = exactValue(fn, degrees);
    const v2 = exactValue(fn2, degrees2);
    return [
      {
        text: 'At a quarter turn and its multiples every sine and cosine is $0$, $1$ or $-1$, so each trig value is a small whole number.',
      },
      {
        tex: `\\${fn}(${degrees}^{\\circ}) = ${v1} \\qquad \\${fn2}(${degrees2}^{\\circ}) = ${v2}`,
      },
      { text: 'Each term is settled on its own before the two are added.' },
      {
        tex: `${a} \\times ${paren(v1)} = ${a * v1} \\qquad ${b} \\times ${paren(v2)} = ${b * v2} \\qquad ${a * v1} + ${paren(b * v2)} = ${a * v1 + b * v2}`,
      },
      {
        text: `Adding the two coefficients first would give $${a + b}$ multiplied by something, which is a different number whenever the two trig values differ.`,
      },
    ];
  },
};

/** Angles spread round the circle, so the sign question has more than four answers. */
const SIGN_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

interface QuadrantFlowParams {
  degrees: number;
  fn: 'sin' | 'cos';
}

/**
 * Is this value positive, negative or zero?
 *
 * Sign is where the circle definition earns its keep, and it is also where the
 * mnemonics take over: a learner who has memorised a quadrant chart can get
 * the answer without ever picturing the point. The tree asks the two questions
 * the chart is a shorthand for — which coordinate is this, and where is the
 * point — so the answer comes from the picture rather than from the chart.
 */
const quadrantFlow: Generator<QuadrantFlowParams> = {
  id: 'trig-quadrant-flow',
  sample: (rng) => ({
    degrees: rng.pick(SIGN_ANGLES),
    fn: rng.pick(['sin', 'cos'] as const),
  }),
  render: ({ degrees, fn }): Slide => {
    const first = fn === 'sin' ? 'Its height above or below the centre' : 'Its displacement to one side of the centre';
    const second =
      fn === 'sin'
        ? degrees === 0 || degrees === 180
          ? 'Exactly level with it'
          : degrees < 180
            ? 'Above it'
            : 'Below it'
        : degrees === 90 || degrees === 270
          ? 'Directly above or below it'
          : degrees < 90 || degrees > 270
            ? 'To the right of it'
            : 'To the left of it';
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Picture the point after turning $${degrees}^{\\circ}$ anticlockwise from the far right of the circle, then work down the questions.`,
        },
      ],
      subject: `\\${fn}(${degrees}^{\\circ})`,
      steps: [
        {
          id: 'coordinate',
          ask: 'Which measurement of the point does this ask for?',
          branches: [
            { label: 'Its height above or below the centre', to: 'height' },
            { label: 'Its displacement to one side of the centre', to: 'across' },
          ],
        },
        {
          id: 'height',
          ask: 'After that turn, where is the point compared with the centre?',
          branches: [
            { label: 'Above it', outcome: 'Positive. Heights above the centre count as positive.' },
            { label: 'Below it', outcome: 'Negative. Heights below the centre count as negative.' },
            { label: 'Exactly level with it', outcome: 'Zero. The point is on the horizontal axis, so it has no height.' },
          ],
        },
        {
          id: 'across',
          ask: 'After that turn, which side of the centre is the point on?',
          branches: [
            { label: 'To the right of it', outcome: 'Positive. Displacements to the right count as positive.' },
            { label: 'To the left of it', outcome: 'Negative. Displacements to the left count as negative.' },
            { label: 'Directly above or below it', outcome: 'Zero. The point is on the vertical axis, so it is no distance to either side.' },
          ],
        },
      ],
      answer: [first, second],
    };
  },
  solution: ({ degrees, fn }) => {
    const value = exactSign(fn, degrees);
    const measurement = fn === 'sin' ? 'height above the centre' : 'displacement to the right of the centre';
    const where =
      fn === 'sin'
        ? degrees === 0 || degrees === 180
          ? 'level with the centre'
          : degrees < 180
            ? 'above the centre'
            : 'below the centre'
        : degrees === 90 || degrees === 270
          ? 'directly above or below the centre'
          : degrees < 90 || degrees > 270
            ? 'to the right of the centre'
            : 'to the left of the centre';
    return [
      { text: `$\\${fn}(\\theta)$ is the ${measurement}, so the question is only ever about where the point has got to.` },
      { text: `A turn of $${degrees}^{\\circ}$ anticlockwise leaves the point ${where}.` },
      {
        text:
          value === 0
            ? `So $\\${fn}(${degrees}^{\\circ})$ is zero — the point is on an axis, and that measurement of it is nothing.`
            : `So $\\${fn}(${degrees}^{\\circ})$ is ${value > 0 ? 'positive' : 'negative'}. No chart is needed for this; the picture gives it directly.`,
      },
    ];
  },
};

/**
 * The sign of a quarter-turn-safe trig value, without going through floats.
 *
 * `Math.sin(Math.PI)` is about $1.2 \times 10^{-16}$ rather than zero, so
 * taking the sign of the computed value would call $\sin(180^{\circ})$
 * positive. The quadrant rules are exact and are what the question is about
 * anyway.
 */
function exactSign(fn: 'sin' | 'cos', degrees: number): -1 | 0 | 1 {
  if (fn === 'sin') {
    if (degrees === 0 || degrees === 180) return 0;
    return degrees < 180 ? 1 : -1;
  }
  if (degrees === 90 || degrees === 270) return 0;
  return degrees < 90 || degrees > 270 ? 1 : -1;
}

interface MatchGraphParams {
  a: number;
  d: number;
  fn: 'sin' | 'cos';
}

/**
 * Which equation drew this graph?
 *
 * Every other question in level 3 hands over an equation and asks for a number.
 * This runs the other way, from the picture to the formula, which is the
 * direction an exam question about a model arrives in — and the direction that
 * catches a learner who can compute an amplitude without recognising one.
 *
 * The distractors are the three confusions the lesson is about: amplitude
 * swapped with midline, the shift taken the wrong way, and the other function
 * with the same numbers.
 */
const matchGraph: Generator<MatchGraphParams> = {
  id: 'trig-match-graph',
  sample: (rng, difficulty) => {
    const a = rng.int(1, difficulty > 1 ? 6 : 4);
    // The midline is kept within reach of the amplitude. The only scale on the
    // figure is the axis at y = 0, so the learner reads the midline off as a
    // multiple of the swing — and a midline of 9 on a swing of 1 is a window
    // in which the wave is a thin ripple near the top and nothing is readable.
    let d = nonZeroInt(rng, difficulty > 1 ? -(a + 3) : 1, a + 3);
    // A midline equal to the amplitude would make the swapped distractor the
    // same equation as the answer, leaving a question with three options and
    // one fewer confusion tested.
    if (d === a) d = a + 1;
    return { a, d, fn: rng.pick(['sin', 'cos'] as const) };
  },
  render: ({ a, d, fn }): Slide => {
    // Written out rather than reached through `wave`, whose shift is the only
    // handle it offers on the phase: a cosine is `wave(d, a, 360, -90)` and a
    // *minus* cosine is `+90`, the same picture turned upside down and none of
    // the four options. Naming the function the answer names is a mistake that
    // cannot be made, where a sign on a shift is one that already was.
    const radians = (x: number) => (x * Math.PI) / 180;
    const f = (x: number) => d + a * (fn === 'sin' ? Math.sin(radians(x)) : Math.cos(radians(x)));
    const svg = plotSvg({
      xMin: 0,
      xMax: 720,
      curves: [{ f }],
      horizontals: [d],
      // The window always holds y = 0, because the axis is the only scale on
      // the figure: without it a midline above the curve's own swing cannot be
      // told from one below, and two of the four options differ by just that.
      yMin: Math.min(0, d - a) - 1.5,
      yMax: Math.max(0, d + a) + 1.5,
      label: 'A wave over two full cycles, with its midline dashed',
    });
    const other = fn === 'sin' ? 'cos' : 'sin';
    const correct = scaledWaveTex(a, fn, 'x', d);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'The dashed line is the midline. Which equation does this graph show?' },
        { kind: 'diagram', svg },
      ],
      options: [
        { id: 'right', label: correct, tex: true },
        { id: 'swapped', label: scaledWaveTex(d, fn, 'x', a), tex: true },
        { id: 'flipped', label: scaledWaveTex(a, fn, 'x', -d), tex: true },
        { id: 'other', label: scaledWaveTex(a, other, 'x', d), tex: true },
      ],
      correctId: 'right',
    };
  },
  solution: ({ a, d, fn }) => [
    {
      text: `The dashed midline sits at $y = ${d}$, and that number is the one added on outside the function.`,
    },
    {
      text: `The curve reaches $${d + a}$ at the top and $${d - a}$ at the bottom, so it swings $${a}$ either side of the midline. That is the amplitude, and it multiplies the function.`,
    },
    { tex: `y = ${scaledWaveTex(a, fn, 'x', d)}` },
    {
      text: `It is a $\\${fn}$ rather than a $\\${fn === 'sin' ? 'cos' : 'sin'}$ because of where the curve starts: ${fn === 'sin' ? 'on the midline, heading upwards' : 'at its peak'}.`,
    },
  ],
};

/* ---------- Level 4: radians ---------- */

/*
 * Everything above measures angles in degrees. This level changes the unit,
 * and the answers change shape with it: most of them are now a multiple of pi,
 * which the learner types with a pi key rather than as a decimal. The checker
 * compares values, so `5pi/6` and `5*pi/6` and `(5/6)pi` are all the same answer.
 */

/** Number entry with a pi key. `/` is what puts the fraction key on the pad; the point is already there. */
const PI_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }, { insert: '/' }];

/** The numerators from `from` to `to` that share no factor with `d`, so n/d is already in lowest terms. */
function coprimeTo(d: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n += 1) if (gcd(n, d) === 1) out.push(n);
  return out;
}

/** A fraction the learner reads, in lowest terms: `\frac{5}{2}`, `3`, `-\frac{1}{4}`. */
function ratioTex(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const top = n / g;
  const bottom = d / g;
  if (bottom === 1) return `${top}`;
  return `${top < 0 ? '-' : ''}\\frac{${Math.abs(top)}}{${bottom}}`;
}

/** n pi / d as the learner reads it, in lowest terms: `\frac{5\pi}{6}`, `\pi`, `-\frac{\pi}{3}`. */
function piTex(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const top = n / g;
  const bottom = d / g;
  if (top === 0) return '0';
  const size = Math.abs(top);
  const pi = size === 1 ? '\\pi' : `${size}\\pi`;
  const sign = top < 0 ? '-' : '';
  return bottom === 1 ? `${sign}${pi}` : `${sign}\\frac{${pi}}{${bottom}}`;
}

/** The same angle for mathjs. Never displayed. */
const piAnswer = (n: number, d: number): string => `${n}*pi/${d}`;

/** A value that is either n/d or n pi / d, carried with both of its writings. */
interface Measure {
  n: number;
  d: number;
  withPi: boolean;
}

const measureTex = (m: Measure): string => (m.withPi ? piTex(m.n, m.d) : ratioTex(m.n, m.d));
const measureAnswer = (m: Measure): string => (m.withPi ? piAnswer(m.n, m.d) : `${m.n}/${m.d}`);
const measureValue = (m: Measure): number => (m.n / m.d) * (m.withPi ? Math.PI : 1);

/**
 * Choice options from measures, keeping only distractors whose *value* differs.
 *
 * `options` drops a repeated label, but two different labels can still be the
 * same number — `2\pi` over a radius of 2 is `\pi`, the very slip one distractor
 * models — and a question with two right answers is the one thing a choice
 * slide cannot be. So values are compared here, before the labels are.
 */
function measureOptions(correct: Measure, ...candidates: Measure[]): ChoiceOption[] {
  const taken = [measureValue(correct)];
  const kept: Measure[] = [];
  for (const candidate of candidates) {
    if (kept.length === 3) break;
    const value = measureValue(candidate);
    if (!Number.isFinite(value) || value <= 0) continue;
    if (taken.some((other) => Math.abs(other - value) < 1e-9)) continue;
    taken.push(value);
    kept.push(candidate);
  }
  return options(
    { tex: measureTex(correct), answer: measureAnswer(correct) },
    ...kept.map((m) => ({ tex: measureTex(m), answer: measureAnswer(m) })),
  );
}

/** The four quarter-turn marks, as the learner reads them. */
const QUARTER_MARKS = ['0', '\\frac{\\pi}{2}', '\\pi', '\\frac{3\\pi}{2}', '2\\pi'];

interface TurnParams {
  /** The fraction of a turn is n/d; for the clock form d is 60 and n the minutes. */
  n: number;
  d: number;
  clock: boolean;
}

const TURN_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12];

/** A fraction of a full turn, in radians: the definition of 2 pi used forwards. */
const radFromTurn: Generator<TurnParams> = {
  id: 'trig-rad-from-turn',
  sample: (rng, difficulty) => {
    if (rng.chance(0.4)) {
      // Whole hours are left out: a full turn is the one answer the teaching
      // slide has already given away.
      const minutes = rng.pick(
        Array.from({ length: difficulty > 1 ? 23 : 11 }, (_, i) => 5 * (i + 1)).filter((m) => m !== 60),
      );
      return { n: minutes, d: 60, clock: true };
    }
    const d = rng.pick(TURN_DENOMINATORS);
    return { n: rng.pick(coprimeTo(d, 1, difficulty > 1 ? 2 * d - 1 : d - 1)), d, clock: false };
  },
  render: ({ n, d, clock }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: clock
          ? `The minute hand of a clock moves for $${n}$ minutes. Through how many radians does it turn?`
          : `How many radians is $\\frac{${n}}{${d}}$ of a full turn?`,
      },
    ],
    lead: '\\text{angle} =',
    keypad: PI_KEYS,
    answer: piAnswer(2 * n, d),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ n, d }) =>
    measureOptions(
      { n: 2 * n, d, withPi: true },
      // A turn taken as pi rather than 2 pi, then twice too much, then the
      // answer left in degrees.
      { n, d, withPi: true },
      { n: 4 * n, d, withPi: true },
      { n: 360 * n, d, withPi: false },
    ),
  solution: ({ n, d, clock }) => [
    {
      text: clock
        ? `The minute hand goes all the way round in $60$ minutes, so $${n}$ minutes is $\\frac{${n}}{60}$ of a turn.`
        : `A full turn is $2\\pi$ radians, because $2\\pi$ radii fit round the circumference exactly.`,
    },
    { tex: `\\frac{${n}}{${d}} \\times 2\\pi = ${piTex(2 * n, d)}` },
    {
      text: `As a check, that is $${ratioTex(360 * n, d)}^{\\circ}$: a quarter of a turn is $\\frac{\\pi}{2}$, half a turn is $\\pi$, and the answer should sit sensibly among those.`,
    },
  ],
};

interface PlaceParams {
  /** The angle in twelfths of pi. */
  k: number;
  fn: 'sin' | 'cos';
  /** Whether all four quarter-turn marks are drawn, or only pi. */
  guides: boolean;
}

/** Twelfths of pi that are not quarter turns, so the angle is never on a drawn mark. */
const OFF_MARK_TWELFTHS = Array.from({ length: 23 }, (_, i) => i + 1).filter((k) => k % 6 !== 0);

/** A radian angle as a distance along the axis: how big is 2 pi / 3, really? */
const radPlace: Generator<PlaceParams> = {
  id: 'trig-rad-place',
  sample: (rng, difficulty) => ({
    k: rng.pick(OFF_MARK_TWELFTHS),
    fn: rng.pick(['sin', 'cos'] as const),
    guides: difficulty <= 1,
  }),
  render: ({ k, fn, guides }): Slide => {
    const xMax = 6.5;
    const svg = plotSvg({
      xMin: 0,
      xMax,
      curves: [{ f: fn === 'sin' ? Math.sin : Math.cos }],
      verticals: (guides ? [1, 2, 3, 4] : [2]).map((q) => ({ x: (q * Math.PI) / 2, dashed: true })),
      yMin: -1.5,
      yMax: 1.5,
      label: `The graph of ${fn} x with x in radians, and dashed lines at quarter turns`,
    });
    // To the nearest step, so the answer is reachable by dragging.
    const answer = Number((Math.round(((k * Math.PI) / 12) * 20) / 20).toFixed(2));
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: guides
            ? `This is $y = \\${fn}(x)$ with $x$ in radians; the dashed lines mark $\\frac{\\pi}{2}$, $\\pi$, $\\frac{3\\pi}{2}$ and $2\\pi$. Slide to $x = ${piTex(k, 12)}$.`
            : `This is $y = \\${fn}(x)$ with $x$ in radians; the dashed line marks $\\pi$. Slide to $x = ${piTex(k, 12)}$.`,
        },
      ],
      min: 0,
      max: xMax,
      step: 0.05,
      tolerance: 0.1,
      answer,
      readout: 'x = {v}',
      figure: { svg, ...markerWindow(0, xMax) },
    };
  },
  solution: ({ k }) => [
    {
      text: 'A radian angle is an ordinary number once $\\pi$ is replaced by about $3.14$.',
    },
    { tex: `${piTex(k, 12)} \\approx ${((k * Math.PI) / 12).toFixed(2)}` },
    {
      text: `It lies between $${QUARTER_MARKS[Math.floor(k / 6)]}$ and $${QUARTER_MARKS[Math.floor(k / 6) + 1]}$, which is the quickest way to tell a slip: a whole turn is only about $6.28$.`,
    },
  ],
};

/** Circles in the wild, each with its question about the angle. */
const ARC_CONTEXTS: { setup: (s: number, r: number) => string; ask: string }[] = [
  {
    setup: (s, r) => `An arc of length $${s}$ cm is marked on a circle of radius $${r}$ cm.`,
    ask: 'What angle does it make at the centre, in radians?',
  },
  {
    setup: (s, r) => `A wheel of radius $${r}$ cm rolls $${s}$ cm along the ground without slipping.`,
    ask: 'Through what angle has it turned, in radians?',
  },
  {
    setup: (s, r) => `A pendulum $${r}$ cm long swings its bob along an arc $${s}$ cm long.`,
    ask: 'Through what angle does it swing, in radians?',
  },
  {
    setup: (s, r) => `A bend on a running track is part of a circle of radius $${r}$ m, and the bend is $${s}$ m long.`,
    ask: 'What angle does the bend turn through, in radians?',
  },
];

interface ArcAngleParams {
  r: number;
  /** Twice the angle, so half-radian angles stay whole in the parameters. */
  twice: number;
  context: number;
}

/** The definition of a radian, used directly: angle = arc / radius. */
const radArcAngle: Generator<ArcAngleParams> = {
  id: 'trig-rad-arc-angle',
  sample: (rng, difficulty) => {
    let r = rng.int(2, difficulty > 1 ? 12 : 9);
    const twice = rng.int(1, difficulty > 1 ? 12 : 8);
    // An odd radius with a half-radian angle would leave the arc a half; an
    // even one keeps every length on screen whole.
    if ((r * twice) % 2 !== 0) r += 1;
    return { r, twice, context: rng.int(0, ARC_CONTEXTS.length - 1) };
  },
  render: ({ r, twice, context }): Slide => {
    const s = (r * twice) / 2;
    const { setup, ask } = ARC_CONTEXTS[context];
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${setup(s, r)} ${ask}` }],
      lead: '\\text{angle} =',
      keypad: NUMBER_KEYS,
      answer: `${s}/${r}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: ({ r, twice }) => {
    const s = (r * twice) / 2;
    return measureOptions(
      { n: s, d: r, withPi: false },
      // Upside down, multiplied instead of divided, and the diameter used.
      { n: r, d: s, withPi: false },
      { n: s * r, d: 1, withPi: false },
      { n: s, d: 2 * r, withPi: false },
      { n: s + r, d: 1, withPi: false },
    );
  },
  solution: ({ r, twice }) => {
    const s = (r * twice) / 2;
    return [
      {
        text: 'An angle in radians counts how many radii fit along the arc. So divide the arc by the radius.',
      },
      { tex: `\\theta = \\frac{s}{r} = \\frac{${s}}{${r}} = ${ratioTex(s, r)}` },
      {
        text: 'The units cancel, which is why a radian has no unit to write: the answer is the same whether the lengths are in centimetres or in miles.',
      },
    ];
  },
};

interface CompareParams {
  /** The radian angle is n/d, times pi when `withPi`. */
  n: number;
  d: number;
  withPi: boolean;
  degrees: number;
  radFirst: boolean;
}

/** Which is bigger, an angle in radians or one in degrees? A sense of scale. */
const radCompare: Generator<CompareParams> = {
  id: 'trig-rad-compare',
  sample: (rng, difficulty) => {
    const withPi = difficulty > 1;
    const d = withPi ? rng.pick([3, 4, 6, 12]) : 1;
    const n = withPi ? rng.pick(coprimeTo(d, 1, 2 * d - 1)) : rng.int(1, 6);
    const exact = withPi ? (180 * n) / d : (180 * n) / Math.PI;
    // Far enough apart that the question is about scale, not about rounding.
    const gap = rng.int(6, 40);
    const below = exact - gap > 4 && rng.chance(0.5);
    return {
      n,
      d,
      withPi,
      degrees: Math.round(below ? exact - gap : exact + gap),
      radFirst: rng.chance(0.5),
    };
  },
  render: ({ n, d, withPi, degrees, radFirst }): Slide => {
    const exact = withPi ? (180 * n) / d : (180 * n) / Math.PI;
    const rad = { id: 'rad', label: `${withPi ? piTex(n, d) : n}\\text{ rad}`, tex: true };
    const deg = { id: 'deg', label: `${degrees}^{\\circ}`, tex: true };
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: 'Which of these two angles is larger?' }],
      options: radFirst ? [rad, deg] : [deg, rad],
      correctId: exact > degrees ? 'rad' : 'deg',
    };
  },
  solution: ({ n, d, withPi, degrees }) => {
    const exact = withPi ? (180 * n) / d : (180 * n) / Math.PI;
    return [
      withPi
        ? { text: 'Half a turn is $\\pi$ radians and also $180^{\\circ}$, so replace $\\pi$ by $180^{\\circ}$.' }
        : { text: 'One radian is $\\frac{180^{\\circ}}{\\pi}$, a little over $57^{\\circ}$: just under a sixth of a turn.' },
      withPi
        ? { tex: `${piTex(n, d)} = ${Math.round(exact)}^{\\circ}` }
        : { tex: `${n}\\text{ rad} \\approx ${n} \\times 57.3^{\\circ} \\approx ${Math.round(exact)}^{\\circ}` },
      {
        text: `So the radian angle is ${exact > degrees ? 'larger' : 'smaller'} than $${degrees}^{\\circ}$. A radian angle usually *looks* small because its number is small; the unit is what is big.`,
      },
    ];
  },
};

interface FromDegreesParams {
  degrees: number;
  wheel: boolean;
}

/** Degrees to radians: multiply by pi/180 and simplify. */
const radFromDegrees: Generator<FromDegreesParams> = {
  id: 'trig-rad-from-degrees',
  sample: (rng, difficulty) => {
    const pool =
      difficulty > 1
        ? [
            ...Array.from({ length: 36 }, (_, i) => 10 * (i + 1)),
            ...Array.from({ length: 20 }, (_, i) => 18 * (i + 1)),
            ...Array.from({ length: 24 }, (_, i) => 15 * (i + 25)),
          ]
        : Array.from({ length: 24 }, (_, i) => 15 * (i + 1));
    return { degrees: rng.pick(pool), wheel: rng.chance(0.5) };
  },
  render: ({ degrees, wheel }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: wheel
          ? `A wheel turns through $${degrees}^{\\circ}$. How many radians is that?`
          : `Write $${degrees}^{\\circ}$ in radians, as a multiple of $\\pi$.`,
      },
    ],
    lead: '\\text{angle} =',
    keypad: PI_KEYS,
    answer: piAnswer(degrees, 180),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ degrees }) =>
    measureOptions(
      { n: degrees, d: 180, withPi: true },
      // Divided by 360 instead of 180, by 90, and the fraction upside down.
      { n: degrees, d: 360, withPi: true },
      { n: degrees, d: 90, withPi: true },
      { n: 180, d: degrees, withPi: true },
      { n: degrees, d: 60, withPi: true },
    ),
  solution: ({ degrees }) => [
    { text: 'Half a turn is $180^{\\circ}$ and also $\\pi$ radians, so each degree is $\\frac{\\pi}{180}$ radians.' },
    { tex: `${degrees}^{\\circ} \\times \\frac{\\pi}{180} = \\frac{${degrees}\\pi}{180} = ${piTex(degrees, 180)}` },
    {
      text: 'Cancel the fraction as far as it goes. The simplified form is the one worth recognising, since the same few angles come up again and again.',
    },
  ],
};

interface ToDegreesParams {
  n: number;
  d: number;
  turntable: boolean;
}

/** Radians to degrees: replace pi by 180 degrees. */
const radToDegrees: Generator<ToDegreesParams> = {
  id: 'trig-rad-to-degrees',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const d = rng.pick([3, 4, 5, 6, 9, 10, 18]);
      return { n: rng.pick(coprimeTo(d, 1, 3 * d)), d, turntable: rng.chance(0.5) };
    }
    // Twelfths of pi, reduced: every multiple of 15 degrees up to a full turn.
    const k = rng.int(1, 24);
    const g = gcd(k, 12);
    return { n: k / g, d: 12 / g, turntable: rng.chance(0.5) };
  },
  render: ({ n, d, turntable }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: turntable
          ? `A turntable turns through $${piTex(n, d)}$ radians. How many degrees is that?`
          : `Write $${piTex(n, d)}$ radians in degrees.`,
      },
    ],
    lead: '\\text{degrees} =',
    keypad: NUMBER_KEYS,
    answer: `${(180 * n) / d}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ n, d }) => {
    const degrees = (180 * n) / d;
    const correct = { tex: `${degrees}^{\\circ}`, answer: `${degrees}` };
    const seen = new Set([degrees]);
    const picked: number[] = [];
    // Pi taken as 360, as 90, the supplement, and a half turn too far.
    for (const value of [2 * degrees, degrees / 2, 360 - degrees, degrees + 180]) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    return options(correct, ...picked.map((value) => ({ tex: `${value}^{\\circ}`, answer: `${value}` })));
  },
  solution: ({ n, d }) => [
    { text: 'Radians to degrees runs the other way: $\\pi$ radians is $180^{\\circ}$, so put $180^{\\circ}$ where the $\\pi$ was.' },
    {
      tex:
        d === 1
          ? `${piTex(n, d)} = ${n} \\times 180^{\\circ} = ${(180 * n) / d}^{\\circ}`
          : n === 1
            ? `${piTex(n, d)} = \\frac{180^{\\circ}}{${d}} = ${180 / d}^{\\circ}`
            : `${piTex(n, d)} = \\frac{${n} \\times 180^{\\circ}}{${d}} = ${(180 * n) / d}^{\\circ}`,
    },
    n === 1
      ? { text: `A single $\\pi$ over $${d}$ is simply $180^{\\circ}$ shared ${d} ways.` }
      : {
          text: `Divide first where you can: $180^{\\circ} \\div ${d} = ${180 / d}^{\\circ}$ is what $${piTex(1, d)}$ is worth, and the angle is $${n}$ of those.`,
        },
  ],
};

interface ConvertTilesParams {
  /** The angle is k pi / d. */
  k: number;
  d: number;
  toRadians: boolean;
}

/** Choosing the conversion factor, then its result: the two decisions in one line. */
const radConvertTiles: Generator<ConvertTilesParams> = {
  id: 'trig-rad-convert-tiles',
  sample: (rng, difficulty) => {
    const d = difficulty > 1 ? rng.pick([5, 9, 10, 12, 18]) : 12;
    return { k: rng.int(1, 2 * d), d, toRadians: rng.chance(0.5) };
  },
  render: ({ k, d, toRadians }): Slide => {
    const degrees = (180 * k) / d;
    const toRad = '\\frac{\\pi}{180}';
    const toDeg = '\\frac{180}{\\pi}';
    if (toRadians) {
      const bank = [...new Set([toRad, toDeg, piTex(k, d), piTex(k, 2 * d), piTex(2 * k, d)])];
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: `Convert $\\theta = ${degrees}^{\\circ}$ to radians: place what to multiply by, then what it comes to.`,
          },
        ],
        // The angle itself stays in the prompt: a template is split on {n}
        // markers, and the fraction's own braces would be taken for blanks.
        template: '\\theta \\times {0} = {1}',
        bank,
        answer: [toRad, piTex(k, d)],
      };
    }
    const results = [degrees, 2 * degrees, degrees % 2 === 0 ? degrees / 2 : degrees + 180];
    const bank = [...new Set([toRad, toDeg, ...results.map((value) => `${value}^{\\circ}`)])];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Convert $\\theta = ${piTex(k, d)}$ to degrees: place what to multiply by, then what it comes to.`,
        },
      ],
      template: '\\theta \\times {0} = {1}',
      bank,
      answer: [toDeg, `${degrees}^{\\circ}`],
    };
  },
  solution: ({ k, d, toRadians }) => {
    const degrees = (180 * k) / d;
    return [
      {
        text: 'Both factors come from one fact, $180^{\\circ} = \\pi$. Pick the one that cancels the unit you start with.',
      },
      toRadians
        ? { tex: `${degrees}^{\\circ} \\times \\frac{\\pi}{180} = ${piTex(k, d)}` }
        : { tex: `${piTex(k, d)} \\times \\frac{180}{\\pi} = ${degrees}^{\\circ}` },
      {
        text: toRadians
          ? 'Going to radians the number should shrink, and a $\\pi$ appears; if it grew, the factor is upside down.'
          : 'Going to degrees the $\\pi$ cancels and the number grows; if a $\\pi$ is left over, the factor is upside down.',
      },
    ];
  },
};

interface UnitTreeParams {
  k: number;
  d: number;
}

/** What pi/d is worth, then k of them: radians to degrees without a formula. */
const radUnitTree: Generator<UnitTreeParams> = {
  id: 'trig-rad-unit-tree',
  sample: (rng, difficulty) => {
    const d = difficulty > 1 ? rng.pick([5, 9, 10, 12, 18, 20]) : rng.pick([3, 4, 5, 6, 9, 12]);
    return { k: rng.pick(coprimeTo(d, 2, difficulty > 1 ? 3 * d : 2 * d - 1)), d };
  },
  render: ({ k, d }): Slide => {
    const unit = 180 / d;
    const total = unit * k;
    const answer = [`${unit}`, `${total}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Fill the top box with $\\frac{\\pi}{${d}}$ in degrees, then build up to the whole angle underneath.`,
        },
      ],
      expression: `\\theta = ${piTex(k, d)}`,
      nodes: [
        { id: 'unit', from: [] },
        { id: 'angle', from: ['unit'] },
      ],
      bank: bankAround(
        answer,
        // One step of pi/d too many or too few, and pi/d taken as twice its size.
        [2 * unit, total + unit, total - unit, 2 * total].filter((value) => Number.isInteger(value)),
      ),
      answer,
    };
  },
  solution: ({ k, d }) => [
    { text: `Half a turn, $\\pi$, is $180^{\\circ}$, so $\\frac{\\pi}{${d}}$ is $180^{\\circ}$ shared ${d} ways.` },
    { tex: `\\frac{\\pi}{${d}} = \\frac{180^{\\circ}}{${d}} = ${180 / d}^{\\circ}` },
    { tex: `${piTex(k, d)} = ${k} \\times ${180 / d}^{\\circ} = ${(180 * k) / d}^{\\circ}` },
  ],
};

/** The exact values a special angle can have, smallest first. */
const EXACT_VALUES: { value: number; tex: string }[] = [
  { value: -1, tex: '-1' },
  { value: -Math.sqrt(3) / 2, tex: '-\\frac{\\sqrt{3}}{2}' },
  { value: -Math.SQRT2 / 2, tex: '-\\frac{\\sqrt{2}}{2}' },
  { value: -0.5, tex: '-\\frac{1}{2}' },
  { value: 0, tex: '0' },
  { value: 0.5, tex: '\\frac{1}{2}' },
  { value: Math.SQRT2 / 2, tex: '\\frac{\\sqrt{2}}{2}' },
  { value: Math.sqrt(3) / 2, tex: '\\frac{\\sqrt{3}}{2}' },
  { value: 1, tex: '1' },
];

/** The table row for the sine or cosine of k pi / 12. */
function exactAt(fn: 'sin' | 'cos', k: number): { value: number; tex: string } {
  const x = (k * Math.PI) / 12;
  const raw = fn === 'sin' ? Math.sin(x) : Math.cos(x);
  const row = EXACT_VALUES.find((entry) => Math.abs(entry.value - raw) < 1e-9);
  if (!row) throw new Error(`${fn}(${k}pi/12) is not a special value`);
  return row;
}

/** Twelfths of pi on the special-angle grid (multiples of pi/6 and pi/4), zero left out. */
const SPECIAL_TWELFTHS = Array.from({ length: 23 }, (_, i) => i + 1).filter((k) => k % 2 === 0 || k % 3 === 0);

/** The slips worth offering for an exact value: the sign, and the other function. */
function exactDistractors(fn: 'sin' | 'cos', k: number, count: number): { value: number; tex: string }[] {
  const right = exactAt(fn, k);
  const other = exactAt(fn === 'sin' ? 'cos' : 'sin', k);
  const flipped = EXACT_VALUES.find((entry) => Math.abs(entry.value + right.value) < 1e-9)!;
  const nearest = [...EXACT_VALUES].sort(
    (a, b) => Math.abs(a.value - right.value) - Math.abs(b.value - right.value),
  );
  const out: { value: number; tex: string }[] = [];
  for (const candidate of [flipped, other, ...nearest]) {
    if (out.length === count) break;
    if (candidate.tex === right.tex || out.some((entry) => entry.tex === candidate.tex)) continue;
    out.push(candidate);
  }
  return out;
}

interface ExactParams {
  fn: 'sin' | 'cos';
  /** The angle in twelfths of pi. */
  k: number;
}

/** sin and cos at a special radian angle, from four exact values. */
const radExactValue: Generator<ExactParams> = {
  id: 'trig-rad-exact-value',
  sample: (rng, difficulty) => {
    const k = rng.pick(SPECIAL_TWELFTHS);
    // Past a full turn, or backwards, at the higher difficulty.
    const wind = difficulty > 1 ? rng.pick([0, 24, -24]) : 0;
    return { fn: rng.pick(['sin', 'cos'] as const), k: k + wind };
  },
  render: ({ fn, k }): Slide => {
    const right = exactAt(fn, k);
    const rows = [right, ...exactDistractors(fn, k, 3)].sort((a, b) => a.value - b.value);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Without a calculator, what is $\\${fn}\\left(${piTex(k, 12)}\\right)$?`,
        },
      ],
      options: rows.map((row) => ({ id: row.tex, label: row.tex, tex: true })),
      correctId: right.tex,
    };
  },
  solution: ({ fn, k }) => {
    const degrees = 15 * k;
    const turned = ((degrees % 360) + 360) % 360;
    return [
      {
        text:
          turned === degrees
            ? 'Convert to degrees, where the special values are already familiar.'
            : `Convert to degrees, then take off or add full turns: $${degrees}^{\\circ}$ lands in the same place as $${turned}^{\\circ}$.`,
      },
      { tex: `${piTex(k, 12)} = ${degrees}^{\\circ}` },
      { tex: `\\${fn}\\left(${turned}^{\\circ}\\right) = ${exactAt(fn, k).tex}` },
    ];
  },
};

interface QuadrantParams {
  fn: 'sin' | 'cos';
  /** The angle in twelfths of pi, never on a quarter-turn mark. */
  k: number;
}

const QUARTER_LABELS = [
  'Between $0$ and $\\frac{\\pi}{2}$',
  'Between $\\frac{\\pi}{2}$ and $\\pi$',
  'Between $\\pi$ and $\\frac{3\\pi}{2}$',
  'Between $\\frac{3\\pi}{2}$ and $2\\pi$',
];
const HEIGHT_LABEL = 'Its height above or below the centre';
const ACROSS_LABEL = 'Its displacement to one side of the centre';

/**
 * Positive or negative, from where a radian angle lands.
 *
 * `trig-quadrant-flow` asks the same thing in degrees, where the quarter-turn
 * marks are 90, 180 and 270 and nobody has to think about them. In radians the
 * placing is the hard part — is $\frac{5\pi}{4}$ past $\pi$? — so that is the
 * first fork here, and the function comes second.
 */
const radQuadrantFlow: Generator<QuadrantParams> = {
  id: 'trig-rad-quadrant-flow',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    k: rng.pick(OFF_MARK_TWELFTHS) + (difficulty > 1 && rng.chance(0.5) ? 24 : 0),
  }),
  render: ({ fn, k }): Slide => {
    const quarter = Math.floor((k % 24) / 6);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Is this positive or negative? Place the angle first, then say what the function measures.',
        },
      ],
      subject: `\\${fn}\\left(${piTex(k, 12)}\\right)`,
      steps: [
        {
          id: 'where',
          ask:
            k > 24
              ? 'Take off one full turn, $2\\pi$. Between which two quarter-turn marks does what is left fall?'
              : 'Between which two quarter-turn marks does the angle fall?',
          branches: QUARTER_LABELS.map((label, i) => ({ label, to: `q${i}` })),
        },
        ...QUARTER_LABELS.map((_, i) => {
          const up = i < 2;
          const toRight = i === 0 || i === 3;
          return {
            id: `q${i}`,
            ask: 'Which measurement of the point does the function give?',
            branches: [
              {
                label: HEIGHT_LABEL,
                outcome: up
                  ? 'Positive. In this quarter the point is above the centre.'
                  : 'Negative. In this quarter the point is below the centre.',
              },
              {
                label: ACROSS_LABEL,
                outcome: toRight
                  ? 'Positive. In this quarter the point is to the right of the centre.'
                  : 'Negative. In this quarter the point is to the left of the centre.',
              },
            ],
          };
        }),
      ],
      answer: [QUARTER_LABELS[quarter], fn === 'sin' ? HEIGHT_LABEL : ACROSS_LABEL],
    };
  },
  solution: ({ fn, k }) => {
    const quarter = Math.floor((k % 24) / 6);
    const positive = fn === 'sin' ? quarter < 2 : quarter === 0 || quarter === 3;
    return [
      {
        text: `The marks are $\\frac{\\pi}{2} = \\frac{6\\pi}{12}$, $\\pi = \\frac{12\\pi}{12}$ and $\\frac{3\\pi}{2} = \\frac{18\\pi}{12}$; writing the angle over $12$ too makes the comparison easy.`,
      },
      {
        // Over twelve already when nothing cancels, and then saying so twice reads as a typo.
        tex: [
          ...new Set([piTex(k, 12), `\\frac{${k}\\pi}{12}`]),
          ...(k > 24 ? [`2\\pi + \\frac{${k - 24}\\pi}{12}`] : []),
        ].join(' = '),
      },
      {
        text: `So it lies between $${QUARTER_MARKS[quarter]}$ and $${QUARTER_MARKS[quarter + 1]}$, and $\\${fn}$ is the point's ${fn === 'sin' ? 'height' : 'sideways displacement'} there: ${positive ? 'positive' : 'negative'}.`,
      },
    ];
  },
};

/** Convert, then read the value: the route from a radian angle to a number. */
const radValueTree: Generator<ExactParams> = {
  id: 'trig-rad-value-tree',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    k: rng.pick(SPECIAL_TWELFTHS) + (difficulty > 1 && rng.chance(0.5) ? 24 : 0),
  }),
  render: ({ fn, k }): Slide => {
    const degrees = 15 * k;
    const right = exactAt(fn, k);
    const wrongDegrees = [...new Set([2 * degrees, degrees + 90, degrees + 180])]
      .filter((value) => value !== degrees)
      .slice(0, 2);
    const bank = [
      `${degrees}`,
      ...wrongDegrees.map(String),
    ].sort((a, b) => Number(a) - Number(b));
    const values = [right, ...exactDistractors(fn, k, 2)].sort((a, b) => a.value - b.value);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Put the angle in degrees in the top box, then the exact value underneath.',
        },
      ],
      expression: `\\${fn}\\left(${piTex(k, 12)}\\right)`,
      nodes: [
        { id: 'degrees', from: [] },
        { id: 'value', from: ['degrees'] },
      ],
      bank: [...bank, ...values.map((row) => row.tex)],
      answer: [`${degrees}`, right.tex],
    };
  },
  solution: ({ fn, k }) => {
    const degrees = 15 * k;
    return [
      { text: 'Replace $\\pi$ by $180^{\\circ}$ to land on an angle whose values you know.' },
      { tex: `${piTex(k, 12)} = ${degrees}^{\\circ}` },
      {
        text: `Then read the ${fn === 'sin' ? 'height' : 'sideways displacement'} of the point at that angle, sign included.`,
      },
      { tex: `\\${fn}\\left(${degrees}^{\\circ}\\right) = ${exactAt(fn, k).tex}` },
    ];
  },
};

type Feature = 'peak' | 'trough' | 'down' | 'up';

/** Where each feature first happens after zero, in quarter turns. */
const FEATURE_QUARTERS: Record<'sin' | 'cos', Record<Feature, number>> = {
  sin: { peak: 1, down: 2, trough: 3, up: 4 },
  cos: { down: 1, trough: 2, up: 3, peak: 4 },
};

const FEATURE_WORDS: Record<Feature, string> = {
  peak: 'reaches its highest point',
  trough: 'reaches its lowest point',
  down: 'crosses the axis going down',
  up: 'crosses the axis going up',
};

interface GraphSliderParams {
  fn: 'sin' | 'cos';
  feature: Feature;
  a: number;
  /** The second time rather than the first, over two turns. */
  second: boolean;
}

/**
 * Where on a radian axis does the wave do this?
 *
 * Level 3 read features off waves with the axis in degrees. In radians the
 * same features sit at pi/2, pi, 3pi/2 — numbers the learner has to know the
 * size of, since the readout only ever says 1.55 or 4.7.
 */
const radGraphSlider: Generator<GraphSliderParams> = {
  id: 'trig-rad-graph-slider',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    feature: rng.pick(['peak', 'trough', 'down', 'up'] as const),
    a: rng.int(1, 4),
    second: difficulty > 1 && rng.chance(0.5),
  }),
  render: ({ fn, feature, a, second }): Slide => {
    // Neither midpoint, where an untouched handle rests, is near a feature.
    const xMax = second ? 13 : 7;
    const trig = fn === 'sin' ? Math.sin : Math.cos;
    const svg = plotSvg({
      xMin: 0,
      xMax,
      curves: [{ f: (x) => a * trig(x) }],
      yMin: -a - 1,
      yMax: a + 1,
      label: `The graph of ${a === 1 ? '' : a} ${fn} x with x in radians`,
    });
    const quarters = FEATURE_QUARTERS[fn][feature] + (second ? 4 : 0);
    const exact = (quarters * Math.PI) / 2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `This is $y = ${a === 1 ? '' : a}\\${fn}(x)$ with $x$ in radians. Slide to where it ${FEATURE_WORDS[feature]} for the ${second ? '**second**' : '**first**'} time after $x = 0$.`,
        },
      ],
      min: 0,
      max: xMax,
      step: 0.05,
      tolerance: 0.1,
      answer: Number((Math.round(exact * 20) / 20).toFixed(2)),
      readout: 'x = {v}',
      figure: { svg, ...markerWindow(0, xMax) },
    };
  },
  solution: ({ fn, feature, second }) => {
    const quarters = FEATURE_QUARTERS[fn][feature] + (second ? 4 : 0);
    return [
      {
        text: `Every feature of $\\sin$ and $\\cos$ sits on a quarter-turn mark, a multiple of $\\frac{\\pi}{2}$. This one is ${quarters} quarter turns along${second ? ', one full turn after the first time' : ''}.`,
      },
      { tex: `x = ${piTex(quarters, 2)} \\approx ${((quarters * Math.PI) / 2).toFixed(2)}` },
      {
        text: `The height of the wave makes no difference to where it happens: stretching upwards leaves every peak and crossing where it was.`,
      },
    ];
  },
};

interface SectorParams {
  r: number;
  /** The angle is n/d, times pi when `withPi`. */
  n: number;
  d: number;
  withPi: boolean;
  /** Given in degrees, to be converted first. Only ever set with `withPi`. */
  inDegrees: boolean;
  context: number;
}

/** A sector's angle as the question states it. */
const sectorAngleTex = (p: SectorParams): string =>
  p.inDegrees ? `${(180 * p.n) / p.d}^{\\circ}` : p.withPi ? piTex(p.n, p.d) : `${p.n}\\text{ rad}`;

/** Radius and angle for a sector question: whole radians, or a tidy multiple of pi. */
function sampleSector(rng: Rng, difficulty: number, contexts: number): SectorParams {
  const r = rng.int(2, difficulty > 1 ? 12 : 9);
  const context = rng.int(0, contexts - 1);
  if (rng.chance(0.35)) return { r, n: rng.int(1, 4), d: 1, withPi: false, inDegrees: false, context };
  const d = rng.pick([2, 3, 4, 6]);
  const n = rng.pick(coprimeTo(d, 1, 2 * d - 1));
  return { r, n, d, withPi: true, inDegrees: difficulty > 1 && rng.chance(0.5), context };
}

const ARC_LENGTH_CONTEXTS: ((r: number, angle: string) => string)[] = [
  (r, angle) => `A sector of a circle of radius $${r}$ cm has angle $${angle}$ at the centre. How long is its curved edge?`,
  (r, angle) => `A pendulum $${r}$ cm long swings through $${angle}$. How far does its bob travel along the arc?`,
  (r, angle) => `A wheel of radius $${r}$ cm turns through $${angle}$. How far does a point on its rim travel?`,
];

/** s = r theta, with theta in radians — or converted to radians first. */
const radArcLength: Generator<SectorParams> = {
  id: 'trig-rad-arc-length',
  sample: (rng, difficulty) => sampleSector(rng, difficulty, ARC_LENGTH_CONTEXTS.length),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `${ARC_LENGTH_CONTEXTS[p.context](p.r, sectorAngleTex(p))} Give it in cm${p.withPi ? ', in terms of $\\pi$' : ''}.`,
      },
    ],
    lead: 's =',
    keypad: PI_KEYS,
    answer: measureAnswer({ n: p.r * p.n, d: p.d, withPi: p.withPi }),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ r, n, d, withPi, inDegrees }) =>
    measureOptions(
      { n: r * n, d, withPi },
      // The area formula, the diameter, and degrees fed straight in.
      { n: r * r * n, d: 2 * d, withPi },
      { n: 2 * r * n, d, withPi },
      ...(inDegrees ? [{ n: (r * 180 * n) / d, d: 1, withPi: false }] : []),
      { n, d: d * r, withPi },
    ),
  solution: (p) => {
    const steps: SolutionStep[] = [];
    if (p.inDegrees) {
      steps.push({ text: 'The formula needs the angle in radians, so convert it first.' });
      steps.push({ tex: `${sectorAngleTex(p)} = ${piTex(p.n, p.d)}` });
    }
    steps.push({
      text: 'An angle of $\\theta$ radians is an arc $\\theta$ radii long, so the arc is the radius times the angle.',
    });
    steps.push({
      tex: `s = r\\theta = ${p.r} \\times ${p.withPi ? piTex(p.n, p.d) : p.n} = ${measureTex({ n: p.r * p.n, d: p.d, withPi: p.withPi })}`,
    });
    return steps;
  },
};

const SECTOR_AREA_CONTEXTS: ((r: number, angle: string) => string)[] = [
  (r, angle) => `A sector of a circle of radius $${r}$ cm has angle $${angle}$ at the centre. What is its area?`,
  (r, angle) => `A slice is cut from a round cake of radius $${r}$ cm, with angle $${angle}$ at the centre. What area of the top does it take?`,
  (r, angle) => `A lawn sprinkler reaches $${r}$ m and sweeps through $${angle}$. What area does it water?`,
];

/** A = r squared theta over 2: the sector's share of the circle. */
const radSectorArea: Generator<SectorParams> = {
  id: 'trig-rad-sector-area',
  sample: (rng, difficulty) => sampleSector(rng, difficulty, SECTOR_AREA_CONTEXTS.length),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `${SECTOR_AREA_CONTEXTS[p.context](p.r, sectorAngleTex(p))}${p.withPi ? ' Give it in terms of $\\pi$.' : ''}`,
      },
    ],
    lead: 'A =',
    keypad: PI_KEYS,
    answer: measureAnswer({ n: p.r * p.r * p.n, d: 2 * p.d, withPi: p.withPi }),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ r, n, d, withPi }) =>
    measureOptions(
      { n: r * r * n, d: 2 * d, withPi },
      // The half forgotten, the arc length instead, and r not squared.
      { n: r * r * n, d, withPi },
      { n: r * n, d, withPi },
      { n: r * n, d: 2 * d, withPi },
    ),
  solution: (p) => {
    const steps: SolutionStep[] = [];
    if (p.inDegrees) {
      steps.push({ text: 'The formula needs the angle in radians, so convert it first.' });
      steps.push({ tex: `${sectorAngleTex(p)} = ${piTex(p.n, p.d)}` });
    }
    steps.push({
      text: 'The whole circle is $\\pi r^2$ over an angle of $2\\pi$, so a sector of angle $\\theta$ takes $\\frac{\\theta}{2\\pi}$ of it, which is $\\frac{1}{2}r^2\\theta$.',
    });
    steps.push({
      tex: `A = \\frac{1}{2} \\times ${p.r}^2 \\times ${p.withPi ? piTex(p.n, p.d) : p.n} = ${measureTex({ n: p.r * p.r * p.n, d: 2 * p.d, withPi: p.withPi })}`,
    });
    return steps;
  },
};

interface SectorTreeParams {
  r: number;
  theta: number;
}

/**
 * Arc, then area from the arc.
 *
 * $A = \frac{1}{2}rs$ is the triangle-area formula with the arc as its base,
 * and building the area on top of the arc says so better than a second formula
 * to remember does.
 */
const radSectorTree: Generator<SectorTreeParams> = {
  id: 'trig-rad-sector-tree',
  sample: (rng, difficulty) => {
    let r = rng.int(2, difficulty > 1 ? 14 : 12);
    const theta = rng.int(1, difficulty > 1 ? 5 : 4);
    // An odd radius and an odd angle would leave half a square centimetre.
    if ((r * theta) % 2 !== 0) r += 1;
    return { r, theta };
  },
  render: ({ r, theta }): Slide => {
    const s = r * theta;
    const area = (r * s) / 2;
    const answer = [`${s}`, `${area}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Put the arc length $s$ in the top box, then the area underneath, using $A = \\frac{1}{2}rs$.',
        },
      ],
      expression: `r = ${r}, \\quad \\theta = ${theta}`,
      nodes: [
        { id: 'arc', from: [] },
        { id: 'area', from: ['arc'] },
      ],
      bank: bankAround(answer, [r * s, 2 * r * theta, r + theta, s / 2].filter((v) => Number.isInteger(v))),
      answer,
    };
  },
  solution: ({ r, theta }) => [
    { tex: `s = r\\theta = ${r} \\times ${theta} = ${r * theta}` },
    {
      text: 'A thin sector is almost a triangle with the arc as its base and the radius as its height, which is where the half comes from.',
    },
    { tex: `A = \\frac{1}{2} r s = \\frac{1}{2} \\times ${r} \\times ${r * theta} = ${(r * r * theta) / 2}` },
  ],
};

interface FormulaFlowParams extends SectorParams {
  wants: 'arc' | 'area';
}

const FLOW_RADIANS = 'Radians';
const FLOW_DEGREES = 'Degrees';
const FLOW_CONVERT = 'Multiply it by $\\frac{\\pi}{180}$';
const FLOW_ARC = 'The length of the curved edge';
const FLOW_AREA = 'The area inside the sector';

/** Which formula, and is the angle ready for it? */
const radFormulaFlow: Generator<FormulaFlowParams> = {
  id: 'trig-rad-formula-flow',
  sample: (rng, difficulty) => {
    // Degrees at every difficulty: spotting them is the first fork.
    const base = sampleSector(rng, 2, 1);
    return { ...base, r: difficulty > 1 ? base.r : Math.min(base.r, 9), wants: rng.pick(['arc', 'area'] as const) };
  },
  render: (p): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: `Find the ${p.wants === 'arc' ? 'length of the curved edge' : 'area'} of this sector. Work down the questions to choose the method.`,
      },
    ],
    subject: `r = ${p.r}\\text{ cm}, \\quad \\theta = ${sectorAngleTex(p)}`,
    steps: [
      {
        id: 'unit',
        ask: 'What unit is the angle in?',
        branches: [
          { label: FLOW_RADIANS, to: 'find' },
          { label: FLOW_DEGREES, to: 'convert' },
        ],
      },
      {
        id: 'convert',
        ask: 'Before a radian formula can be used, what should happen to the angle?',
        branches: [
          { label: FLOW_CONVERT, to: 'find' },
          { label: 'Multiply it by $\\frac{180}{\\pi}$', to: 'find' },
          { label: 'Leave it as it is', to: 'find' },
        ],
      },
      {
        id: 'find',
        ask: 'What does the question want?',
        branches: [
          { label: FLOW_ARC, outcome: 'Use $s = r\\theta$.' },
          { label: FLOW_AREA, outcome: 'Use $A = \\frac{1}{2}r^2\\theta$.' },
        ],
      },
    ],
    answer: [
      ...(p.inDegrees ? [FLOW_DEGREES, FLOW_CONVERT] : [FLOW_RADIANS]),
      p.wants === 'arc' ? FLOW_ARC : FLOW_AREA,
    ],
  }),
  solution: (p) => [
    {
      text: p.inDegrees
        ? `The angle has a degree sign, and both formulas are built on radians, so convert first: $${sectorAngleTex(p)} = ${piTex(p.n, p.d)}$.`
        : `There is no degree sign, so $${sectorAngleTex(p)}$ is already in radians and goes straight in.`,
    },
    {
      text:
        p.wants === 'arc'
          ? `The curved edge is an arc, so $s = r\\theta = ${measureTex({ n: p.r * p.n, d: p.d, withPi: p.withPi })}$ cm.`
          : `The space inside is an area, so $A = \\frac{1}{2}r^2\\theta = ${measureTex({ n: p.r * p.r * p.n, d: 2 * p.d, withPi: p.withPi })}$ square cm.`,
    },
  ],
};

/* ---------- Level 5: tangent and the reciprocal functions ---------- */

/*
 * Tangent is sine over cosine: the gradient of the radius, where sine and
 * cosine were its height and its sideways distance. Secant, cosecant and
 * cotangent are then one over cosine, sine and tangent.
 *
 * The exact values here carry surds (tan 60 is root 3, sec 30 is 2 over
 * root 3), and a surd is a poor thing to type on a phone, so those are chosen,
 * placed as tiles or built in a tree. The typed answers are the fractions and
 * whole numbers the keypad handles well.
 */

type Ratio = 'sin' | 'cos' | 'tan' | 'sec' | 'cosec' | 'cot';
type Reciprocal = 'sec' | 'cosec' | 'cot';

/** How each ratio is written. The UK writes cosec, which KaTeX has no command for. */
const RATIO_TEX: Record<Ratio, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  sec: '\\sec',
  cosec: '\\operatorname{cosec}',
  cot: '\\cot',
};

/** What each ratio is called in a sentence. */
const RATIO_NAME: Record<Ratio, string> = {
  sin: 'sine',
  cos: 'cosine',
  tan: 'tangent',
  sec: 'secant',
  cosec: 'cosecant',
  cot: 'cotangent',
};

/** What is on the bottom when a ratio is written with sine and cosine. */
const DENOMINATOR_OF: Record<'tan' | Reciprocal, 'sin' | 'cos'> = {
  tan: 'cos',
  sec: 'cos',
  cosec: 'sin',
  cot: 'sin',
};

/** sin and cos of a whole number of degrees, with the float dust at a quarter turn swept to exactly zero. */
function sinCos(degrees: number): { s: number; c: number } {
  const x = (degrees * Math.PI) / 180;
  const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  return { s: tidy(Math.sin(x)), c: tidy(Math.cos(x)) };
}

/** Each ratio from sine and cosine, or undefined where that divides by zero. */
const RATIO_FROM: Record<Ratio, (s: number, c: number) => number | undefined> = {
  sin: (s) => s,
  cos: (_, c) => c,
  tan: (s, c) => (c === 0 ? undefined : s / c),
  sec: (_, c) => (c === 0 ? undefined : 1 / c),
  cosec: (s) => (s === 0 ? undefined : 1 / s),
  cot: (s, c) => (s === 0 ? undefined : c / s),
};

function ratioAt(fn: Ratio, degrees: number): number | undefined {
  const { s, c } = sinCos(degrees);
  return RATIO_FROM[fn](s, c);
}

/** Every size a ratio takes at a multiple of 30 or 45 degrees; the negatives are made from these. */
const RATIO_VALUES: { value: number; tex: string }[] = [
  { value: 0, tex: '0' },
  { value: 0.5, tex: '\\frac{1}{2}' },
  { value: 1 / Math.sqrt(3), tex: '\\frac{1}{\\sqrt{3}}' },
  { value: Math.SQRT2 / 2, tex: '\\frac{\\sqrt{2}}{2}' },
  { value: Math.sqrt(3) / 2, tex: '\\frac{\\sqrt{3}}{2}' },
  { value: 1, tex: '1' },
  { value: 2 / Math.sqrt(3), tex: '\\frac{2}{\\sqrt{3}}' },
  { value: Math.SQRT2, tex: '\\sqrt{2}' },
  { value: Math.sqrt(3), tex: '\\sqrt{3}' },
  { value: 2, tex: '2' },
];

/** A special value as the learner reads it, sign included. Throws off the table, so a slip cannot pass as a surd. */
function exactTex(value: number): string {
  const row = RATIO_VALUES.find((entry) => Math.abs(entry.value - Math.abs(value)) < 1e-9);
  if (!row) throw new Error(`${value} is not a special value`);
  return value < 0 && row.value !== 0 ? `-${row.tex}` : row.tex;
}

const UNDEFINED_TEX = '\\text{undefined}';

/** Options sorted smallest first, with `undefined` last, so one question renders one way. */
function sortedExact(values: (number | undefined)[]): (number | undefined)[] {
  return [...values].sort((a, b) => (a === undefined ? 1 : b === undefined ? -1 : a - b));
}

const exactOrUndefined = (value: number | undefined): string =>
  value === undefined ? UNDEFINED_TEX : exactTex(value);

/** An angle held in degrees, written in degrees or in radians. */
const angleTex = (degrees: number, radians: boolean): string =>
  radians ? piTex(degrees, 180) : `${degrees}^{\\circ}`;

/** The multiples of 30 and 45 degrees in one turn, both ends included. */
const SPECIAL_DEGREES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];

/** n/d as the learner reads it: sign in front, lowest terms. */
function signedFracTex(n: number, d: number): string {
  return `${n * d < 0 ? '-' : ''}${ratioTex(Math.abs(n), Math.abs(d))}`;
}

/** A multiplier in front of a function: nothing for 1, a bare minus for -1. */
const coefficientTex = (a: number): string => (a === 1 ? '' : a === -1 ? '-' : `${a}`);

/** The signs of x (cosine) and y (sine) in each quarter of the turn. */
const QUADRANT_SIGNS = [
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
];

interface TripleParams {
  /** Which row of `IDENTITY_TRIPLES`. */
  index: number;
  /** Which leg is across and which is up. */
  swap: boolean;
  /** 1 to 4, anticlockwise from the positive x-axis. */
  quadrant: number;
}

/** A point on a circle whose coordinates and radius are all whole: a Pythagorean triple, placed in a quadrant. */
function pointOf(p: TripleParams): { x: number; y: number; r: number } {
  const [a, b, r] = IDENTITY_TRIPLES[p.index];
  const { x, y } = QUADRANT_SIGNS[p.quadrant - 1];
  return p.swap ? { x: x * b, y: y * a, r } : { x: x * a, y: y * b, r };
}

function sampleTriple(rng: Rng, quadrants: number): TripleParams {
  return { index: rng.int(0, IDENTITY_TRIPLES.length - 1), swap: rng.chance(0.5), quadrant: rng.int(1, quadrants) };
}

/** Every ratio at the point, as a fraction n/d of whole numbers. */
function ratiosAt(p: TripleParams): Record<Ratio, [number, number]> {
  const { x, y, r } = pointOf(p);
  return { sin: [y, r], cos: [x, r], tan: [y, x], sec: [r, x], cosec: [r, y], cot: [x, y] };
}

const fracAnswer = ([n, d]: [number, number]): string => `(${n})/(${d})`;

const ORDINALS = ['', 'first', 'second', 'third', 'fourth'];

/** A curve in degrees, drawn with the pen lifted at every asymptote. */
const DEGREE = Math.PI / 180;

const RATIO_CURVE: Record<'tan' | Reciprocal, (x: number) => number> = {
  tan: (x) => Math.tan(x),
  sec: (x) => 1 / Math.cos(x),
  cosec: (x) => 1 / Math.sin(x),
  cot: (x) => 1 / Math.tan(x),
};

interface TanPointParams extends TripleParams {
  /** Every length multiplied by this, which leaves the gradient alone. */
  scale: number;
  phrasing: number;
}

/** tan as the gradient of the radius: y over x from a point on the circle. */
const tanFromPoint: Generator<TanPointParams> = {
  id: 'trig-tan-from-point',
  sample: (rng, difficulty) => ({
    ...sampleTriple(rng, difficulty > 1 ? 4 : 1),
    scale: rng.int(1, 3),
    phrasing: rng.int(0, 1),
  }),
  render: (p): Slide => {
    const { x, y, r } = pointOf(p);
    const [px, py, pr] = [x * p.scale, y * p.scale, r * p.scale];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text:
            p.phrasing === 0
              ? `A point on a circle of radius $${pr}$ centred at the origin is at $(${px}, ${py})$, an angle $\\theta$ anticlockwise from the positive $x$-axis. What is $\\tan(\\theta)$?`
              : `The radius from the origin to $P(${px}, ${py})$ is $${pr}$ long and makes an angle $\\theta$ with the positive $x$-axis. Find $\\tan(\\theta)$ as a fraction.`,
        },
      ],
      lead: '\\tan(\\theta) =',
      keypad: NUMBER_KEYS,
      answer: `(${py})/(${px})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const { x, y, r } = pointOf(p);
    return options(
      { tex: signedFracTex(y, x), answer: `(${y})/(${x})` },
      // Upside down, the sine instead, and the sign lost.
      { tex: signedFracTex(x, y), answer: `(${x})/(${y})` },
      { tex: signedFracTex(y, r), answer: `(${y})/(${r})` },
      { tex: signedFracTex(-y, x), answer: `(${-y})/(${x})` },
    );
  },
  solution: (p) => {
    const { x, y } = pointOf(p);
    const [px, py] = [x * p.scale, y * p.scale];
    return [
      {
        text: 'Sine is the height over the radius and cosine the sideways distance over the radius, so dividing one by the other cancels the radius.',
      },
      {
        tex: `\\tan(\\theta) = \\frac{\\sin(\\theta)}{\\cos(\\theta)} = \\frac{y}{x} = \\frac{${py}}{${px}} = ${signedFracTex(y, x)}`,
      },
      {
        text:
          x * y > 0
            ? `That is the gradient of the radius. The two coordinates have the same sign, so the gradient is positive.`
            : `That is the gradient of the radius. The two coordinates have opposite signs, so the gradient is negative.`,
      },
    ];
  },
};

interface TanQuotientParams extends TripleParams {
  /** Whether the cosine is stated before the sine. */
  cosFirst: boolean;
}

/** tan = sin / cos, with the two values given: what goes on top, and what it comes to. */
const tanQuotientTiles: Generator<TanQuotientParams> = {
  id: 'trig-tan-quotient-tiles',
  sample: (rng, difficulty) => ({ ...sampleTriple(rng, 4), cosFirst: difficulty > 1 && rng.chance(0.5) }),
  render: (p): Slide => {
    const { x, y, r } = pointOf(p);
    const sinTex = signedFracTex(y, r);
    const cosTex = signedFracTex(x, r);
    const tanTex = signedFracTex(y, x);
    const given = [`$\\sin(\\theta) = ${sinTex}$`, `$\\cos(\\theta) = ${cosTex}$`];
    if (p.cosFirst) given.reverse();
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${given[0]} and ${given[1]}. Build $\\tan(\\theta)$: what is divided, what it is divided by, and what that comes to.`,
        },
      ],
      template: '\\tan(\\theta) = {0} \\div {1} = {2}',
      // Upside down, and the sign lost, beside the three the answer needs.
      bank: [...new Set([sinTex, cosTex, tanTex, signedFracTex(x, y), signedFracTex(-y, x)])].sort(),
      answer: [sinTex, cosTex, tanTex],
    };
  },
  solution: (p) => {
    const { x, y, r } = pointOf(p);
    return [
      { text: 'Tangent is sine divided by cosine, in that order.' },
      {
        tex: `\\tan(\\theta) = ${signedFracTex(y, r)} \\div ${signedFracTex(x, r)} = \\frac{${y}}{${x}} = ${signedFracTex(y, x)}`,
      },
      {
        text: `Both fractions are over $${r}$, so the $${r}$s cancel and only the tops are left. ${x * y > 0 ? 'Same signs divide to a positive.' : 'Opposite signs divide to a negative.'}`,
      },
    ];
  },
};

interface TanUndefinedParams {
  /** In degrees: where cosine is zero. */
  answer: number;
  /** In degrees: three angles where it is not. */
  others: number[];
  radians: boolean;
  phrasing: number;
}

/** Angles where tan has a value, for the wrong options. */
const TAN_DEFINED = SPECIAL_DEGREES.filter((d) => d % 180 !== 90);
const COSINE_ZERO = [90, 270, 450, 630, -90, -270];

const UNDEFINED_PROMPTS = [
  'At which of these angles is $\\tan(\\theta)$ undefined?',
  'For one of these angles the radius is vertical, and $\\tan(\\theta)$ has no value. Which one?',
  'Which of these angles has no tangent?',
];

/** Where tan is undefined: where cosine, on the bottom, is zero. */
const tanUndefined: Generator<TanUndefinedParams> = {
  id: 'trig-tan-undefined',
  sample: (rng, difficulty) => {
    const answer = rng.pick(COSINE_ZERO.slice(0, difficulty > 1 ? 6 : 2));
    // One of the wrong options is always an angle where tan is zero: the
    // numerator vanishing is the confusion worth offering.
    const trap = rng.pick([0, 180, 360]);
    const rest = rng.sample(TAN_DEFINED.filter((d) => d !== trap), 2);
    return {
      answer,
      others: [trap, ...rest],
      radians: rng.chance(0.5),
      phrasing: rng.int(0, UNDEFINED_PROMPTS.length - 1),
    };
  },
  render: ({ answer, others, radians, phrasing }): Slide => ({
    kind: 'choice',
    prompt: [{ kind: 'prose', text: UNDEFINED_PROMPTS[phrasing] }],
    options: [answer, ...others]
      .sort((a, b) => a - b)
      .map((degrees) => ({ id: `${degrees}`, label: angleTex(degrees, radians), tex: true })),
    correctId: `${answer}`,
  }),
  solution: ({ answer, others, radians }) => [
    {
      text: 'Tangent is sine over cosine, so it is undefined exactly where cosine, on the bottom, is zero: where the point is straight above or below the centre and the radius is vertical.',
    },
    { tex: `\\cos\\left(${angleTex(answer, radians)}\\right) = 0` },
    {
      text: `At $${angleTex(others[0], radians)}$ it is the sine on top that is zero, so $\\tan$ is $0$ there, which is a perfectly good value.`,
    },
  ],
};

interface TanSignParams {
  degrees: number;
  radians: boolean;
}

const DEGREE_QUARTERS = [
  'Between $0^{\\circ}$ and $90^{\\circ}$',
  'Between $90^{\\circ}$ and $180^{\\circ}$',
  'Between $180^{\\circ}$ and $270^{\\circ}$',
  'Between $270^{\\circ}$ and $360^{\\circ}$',
];

const SIGN_PAIRS = [
  '$\\sin$ positive and $\\cos$ positive',
  '$\\sin$ positive and $\\cos$ negative',
  '$\\sin$ negative and $\\cos$ negative',
  '$\\sin$ negative and $\\cos$ positive',
];

/** Positive or negative: place the angle, read both signs, divide. */
const tanSignFlow: Generator<TanSignParams> = {
  id: 'trig-tan-sign-flow',
  sample: (rng, difficulty) => {
    if (difficulty > 1 && rng.chance(0.5)) {
      return { degrees: 15 * (rng.pick(OFF_MARK_TWELFTHS) + (rng.chance(0.5) ? 24 : 0)), radians: true };
    }
    const offMark = Array.from({ length: 71 }, (_, i) => 5 * (i + 1)).filter((d) => d % 90 !== 0);
    return { degrees: rng.pick(offMark) + (difficulty > 1 ? 360 : 0), radians: false };
  },
  render: ({ degrees, radians }): Slide => {
    const quarter = Math.floor((degrees % 360) / 90);
    const labels = radians ? QUARTER_LABELS : DEGREE_QUARTERS;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Is this positive or negative? Place the angle, then read the signs of sine and cosine there.',
        },
      ],
      subject: `\\tan\\left(${angleTex(degrees, radians)}\\right)`,
      steps: [
        {
          id: 'where',
          ask:
            degrees > 360
              ? `Take off one full turn, $${radians ? '2\\pi' : '360^{\\circ}'}$. Between which two quarter-turn marks does what is left fall?`
              : 'Between which two quarter-turn marks does the angle fall?',
          branches: labels.map((label) => ({ label, to: 'signs' })),
        },
        {
          id: 'signs',
          ask: 'What are the signs of sine and cosine there?',
          branches: SIGN_PAIRS.map((label, i) => ({
            label,
            outcome:
              i % 2 === 0
                ? 'The same signs, so their quotient $\\tan$ is positive.'
                : 'Opposite signs, so their quotient $\\tan$ is negative.',
          })),
        },
      ],
      answer: [labels[quarter], SIGN_PAIRS[quarter]],
    };
  },
  solution: ({ degrees, radians }) => {
    const turned = degrees % 360;
    const quarter = Math.floor(turned / 90);
    const { x, y } = QUADRANT_SIGNS[quarter];
    return [
      {
        text: `${radians ? `In degrees the angle is $${degrees}^{\\circ}$` : `The angle is $${degrees}^{\\circ}$`}${degrees > 360 ? `, which lands where $${turned}^{\\circ}$ does` : ''}: between $${90 * quarter}^{\\circ}$ and $${90 * quarter + 90}^{\\circ}$.`,
      },
      {
        text: `There the point is ${y > 0 ? 'above' : 'below'} the centre, so $\\sin$ is ${y > 0 ? 'positive' : 'negative'}, and ${x > 0 ? 'to the right of' : 'to the left of'} it, so $\\cos$ is ${x > 0 ? 'positive' : 'negative'}.`,
      },
      {
        tex: `\\tan = \\frac{\\sin}{\\cos} = \\frac{${y > 0 ? '+' : '-'}}{${x > 0 ? '+' : '-'}} = ${x * y > 0 ? '+' : '-'}`,
      },
    ];
  },
};

/** y = a tan(bx), as the learner reads it. */
const tanCurveTex = (a: number, b: number): string =>
  `${coefficientTex(a)}\\tan(${b === 1 ? '' : b}x)`;

interface TanSliderParams {
  a: number;
  b: number;
  feature: 'asymptote' | 'zero';
  nth: number;
  radians: boolean;
}

/** The nth asymptote or the nth crossing of y = a tan(bx) after zero, in degrees. */
const tanFeatureDegrees = ({ b, feature, nth }: TanSliderParams): number =>
  feature === 'asymptote' ? (90 + 180 * (nth - 1)) / b : (180 * nth) / b;

/** Slider settings per unit. The handle rests at the middle, so no answer is allowed near it. */
const tanSliderScale = (radians: boolean) =>
  radians ? { max: 7, step: 0.05, tolerance: 0.1 } : { max: 360, step: 1, tolerance: 3 };

/** Drag to an asymptote or a crossing of y = a tan(bx). */
const tanAsymptoteSlider: Generator<TanSliderParams> = {
  id: 'trig-tan-asymptote-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const p: TanSliderParams = {
        a: nonZeroInt(rng, -3, 3),
        b: rng.int(1, difficulty > 1 ? 6 : 4),
        feature: rng.pick(['asymptote', 'zero'] as const),
        nth: rng.int(1, 3),
        radians: difficulty > 1 && rng.chance(0.5),
      };
      const { max, tolerance } = tanSliderScale(p.radians);
      const value = tanFeatureDegrees(p) * (p.radians ? DEGREE : 1);
      if (value <= max - 3 * tolerance && Math.abs(value - max / 2) > 3 * tolerance) return p;
    }
  },
  render: (p): Slide => {
    const { max, step, tolerance } = tanSliderScale(p.radians);
    const unit = p.radians ? 1 : DEGREE;
    const reach = 3 * Math.abs(p.a);
    const svg = plotSvg({
      xMin: 0,
      xMax: max,
      curves: [{ f: (x) => p.a * Math.tan(p.b * x * unit), breaks: true }],
      yMin: -reach,
      yMax: reach,
      label: `The graph of y = ${p.a === 1 ? '' : p.a === -1 ? '-' : `${p.a} `}tan ${p.b === 1 ? '' : p.b === -1 ? '-' : p.b}x with x in ${p.radians ? 'radians' : 'degrees'}`,
    });
    const value = tanFeatureDegrees(p) * (p.radians ? DEGREE : 1);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text:
            p.feature === 'asymptote'
              ? `This is $y = ${tanCurveTex(p.a, p.b)}$ with $x$ in ${p.radians ? 'radians' : 'degrees'}. Slide to its **${ORDINALS[p.nth]}** asymptote to the right of $x = 0$.`
              : `This is $y = ${tanCurveTex(p.a, p.b)}$ with $x$ in ${p.radians ? 'radians' : 'degrees'}. Slide to where it crosses the $x$-axis for the **${ORDINALS[p.nth]}** time after $x = 0$.`,
        },
      ],
      min: 0,
      max,
      step,
      tolerance,
      answer: Number((Math.round(value / step) * step).toFixed(2)),
      readout: p.radians ? 'x = {v}' : 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, max) },
    };
  },
  solution: (p) => {
    const degrees = tanFeatureDegrees(p);
    const inner = p.feature === 'asymptote' ? 90 + 180 * (p.nth - 1) : 180 * p.nth;
    return [
      {
        text:
          p.feature === 'asymptote'
            ? `$\\tan$ is undefined where the angle inside it is $90^{\\circ}$, $270^{\\circ}$, $450^{\\circ}$ and so on, one every $180^{\\circ}$. The ${ORDINALS[p.nth]} of those is $${inner}^{\\circ}$.`
            : `$\\tan$ is zero where the angle inside it is $180^{\\circ}$, $360^{\\circ}$, $540^{\\circ}$ and so on. The ${ORDINALS[p.nth]} of those after zero is $${inner}^{\\circ}$.`,
      },
      {
        tex:
          p.b === 1
            ? `x = ${angleTex(inner, p.radians)}${p.radians ? ` \\approx ${(inner * DEGREE).toFixed(2)}` : ''}`
            : `${p.b}x = ${inner}^{\\circ} \\quad \\Rightarrow \\quad x = ${angleTex(degrees, p.radians)}${p.radians ? ` \\approx ${(degrees * DEGREE).toFixed(2)}` : ''}`,
      },
      { text: `The $${p.a}$ in front stretches the curve upwards but moves none of these points.` },
    ];
  },
};

interface TanPeriodParams {
  a: number;
  b: number;
  d: number;
  radians: boolean;
}

const TAN_PERIOD_B = [2, 3, 4, 5, 6, 8, 9, 10, 12];

/** y = a tan(bx) + d, as the learner reads it. */
const tanWaveTex = ({ a, b, d }: TanPeriodParams): string =>
  `${tanCurveTex(a, b)}${d > 0 ? ` + ${d}` : d < 0 ? ` - ${-d}` : ''}`;

/** The period of y = a tan(bx) + d: 180 degrees, or pi, divided by b. */
const tanPeriod: Generator<TanPeriodParams> = {
  id: 'trig-tan-period',
  sample: (rng, difficulty) => ({
    a: nonZeroInt(rng, -5, 5),
    b: rng.pick(TAN_PERIOD_B),
    d: rng.int(-4, 4),
    radians: difficulty > 1 && rng.chance(0.5),
  }),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `What is the period of $y = ${tanWaveTex(p)}$, with $x$ in ${p.radians ? 'radians' : 'degrees'}?`,
      },
    ],
    lead: '\\text{period} =',
    keypad: p.radians ? PI_KEYS : NUMBER_KEYS,
    answer: p.radians ? `pi/${p.b}` : `180/${p.b}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ b, radians }) => {
    if (radians) {
      return measureOptions(
        { n: 1, d: b, withPi: true },
        // The sine period, b used upside down, and the gap to the first asymptote.
        { n: 2, d: b, withPi: true },
        { n: b, d: 1, withPi: true },
        { n: 1, d: 2 * b, withPi: true },
      );
    }
    const degrees = (value: number) => ({ tex: `${value}^{\\circ}`, answer: `${value}` });
    return options(degrees(180 / b), degrees(360 / b), degrees(180 * b), degrees(90 / b));
  },
  solution: (p) => [
    {
      text: `$\\tan$ repeats every $${p.radians ? '\\pi' : '180^{\\circ}'}$, half as often as $\\sin$ and $\\cos$. Multiplying $x$ by $${p.b}$ fits $${p.b}$ repeats into that, so each takes a ${p.b === 2 ? 'half' : `${ORDINAL_PARTS[p.b] ?? `${p.b}th`}`} as long.`,
    },
    {
      tex: p.radians
        ? `\\text{period} = \\frac{\\pi}{${p.b}}`
        : `\\text{period} = \\frac{180^{\\circ}}{${p.b}} = ${180 / p.b}^{\\circ}`,
    },
    {
      text: `The $${p.a}$ in front and the $${p.d}$ on the end stretch and lift the curve, but neither changes how often it repeats.`,
    },
  ],
};

/** "a third as long", "a quarter as long": the fractions the period solution names. */
const ORDINAL_PARTS: Record<number, string> = {
  3: 'third',
  4: 'quarter',
  5: 'fifth',
  6: 'sixth',
  8: 'eighth',
  9: 'ninth',
  10: 'tenth',
  12: 'twelfth',
};

interface TanAsymptoteTilesParams {
  a: number;
  b: number;
  radians: boolean;
}

/** Values of b for which the first asymptote and the gap are whole numbers of degrees. */
const ASYMPTOTE_B = [1, 2, 3, 5, 6, 9, 10];

/** Every asymptote of y = a tan(bx) at once: the first, plus whole numbers of the gap. */
const tanAsymptoteTiles: Generator<TanAsymptoteTilesParams> = {
  id: 'trig-tan-asymptote-tiles',
  sample: (rng, difficulty) => ({
    a: nonZeroInt(rng, -5, 5),
    b: rng.pick(ASYMPTOTE_B),
    radians: difficulty > 1 && rng.chance(0.5),
  }),
  render: ({ a, b, radians }): Slide => {
    // In degrees, a fraction of 90: first asymptote, gap, and the two slips
    // (the sine period, and a gap halved twice).
    const token = (numerator: number, denominator: number) =>
      radians ? piTex(numerator, 2 * denominator) : `${(90 * numerator) / denominator}^{\\circ}`;
    const first = token(1, b);
    const gap = token(2, b);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Where are the asymptotes of $y = ${tanCurveTex(a, b)}$, with $x$ in ${radians ? 'radians' : 'degrees'}? Place the first one after $0$, then the gap from one to the next. Here $k$ stands for any whole number.`,
        },
      ],
      template: 'x = {0} + {1} \\times k',
      bank: [...new Set([first, gap, token(4, b), token(1, 2 * b)])].sort(),
      answer: [first, gap],
    };
  },
  solution: ({ b, radians }) => [
    {
      text: `$\\tan$ is undefined wherever the angle inside it is $90^{\\circ}$ plus a whole number of $180^{\\circ}$s, since cosine is zero there.`,
    },
    {
      tex:
        b === 1
          ? `x = ${angleTex(90, radians)} + ${angleTex(180, radians)} \\times k`
          : `${b}x = 90^{\\circ} + 180^{\\circ} \\times k \\quad \\Rightarrow \\quad x = ${angleTex(90 / b, radians)} + ${angleTex(180 / b, radians)} \\times k`,
    },
    {
      text: `The gap between asymptotes is the period, $${angleTex(180 / b, radians)}$, and the first sits halfway through it.`,
    },
  ],
};

interface TanMatchParams {
  a: number;
  /** Index into `MATCH_B`. */
  bIndex: number;
  radians: boolean;
}

const MATCH_B = [0.5, 1, 2, 3, 4];

const matchInnerTex = (b: number): string => (b === 0.5 ? '\\frac{x}{2}' : b === 1 ? 'x' : `${b}x`);

/** Which y = a tan(bx) is this? Read the period off the picture, then b from the period. */
const tanGraphMatch: Generator<TanMatchParams> = {
  id: 'trig-tan-graph-match',
  sample: (rng, difficulty) => ({
    a: nonZeroInt(rng, -3, 3),
    bIndex: rng.int(0, MATCH_B.length - 1),
    radians: difficulty > 1 && rng.chance(0.5),
  }),
  render: ({ a, bIndex, radians }): Slide => {
    const b = MATCH_B[bIndex];
    const unit = radians ? 1 : DEGREE;
    const quarter = radians ? Math.PI / 2 : 90;
    const reach = 3 * Math.abs(a);
    const svg = plotSvg({
      xMin: 0,
      xMax: 4 * quarter,
      curves: [{ f: (x) => a * Math.tan(b * x * unit), breaks: true }],
      verticals: [1, 2, 3].map((q) => ({ x: q * quarter })),
      yMin: -reach,
      yMax: reach,
      label: `The graph of a tangent curve over one turn, with dashed lines every quarter turn`,
    });
    // The four nearest the answer in the list, so the answer is not always at an end.
    const from = Math.min(Math.max(bIndex - 2, 0), MATCH_B.length - 4);
    const offered = MATCH_B.slice(from, from + 4);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `The dashed lines are $${radians ? '\\frac{\\pi}{2}' : '90^{\\circ}'}$ apart, and the picture starts at $x = 0$. Which equation does this graph show?`,
        },
        { kind: 'diagram', svg },
      ],
      options: offered.map((value) => ({
        id: `b${value}`,
        label: `y = ${coefficientTex(a)}\\tan\\left(${matchInnerTex(value)}\\right)`,
        tex: true,
      })),
      correctId: `b${b}`,
    };
  },
  solution: ({ a, bIndex, radians }) => {
    const b = MATCH_B[bIndex];
    const period = 180 / b;
    return [
      {
        text: `Measure the gap from one asymptote to the next, or from one crossing of the axis to the next. Here it is $${angleTex(period, radians)}$.`,
      },
      {
        tex: `\\text{period} = \\frac{${radians ? '\\pi' : '180^{\\circ}'}}{b} = ${angleTex(period, radians)} \\quad \\Rightarrow \\quad b = ${b === 0.5 ? '\\frac{1}{2}' : b}`,
      },
      {
        text: `The curve ${a > 0 ? 'rises' : 'falls'} through each crossing, which is the sign of the $${coefficientTex(a) || '1'}$ in front; every option shares that, so the period is what tells them apart.`,
      },
    ];
  },
};

/** The values tan takes at the special angles. */
const TAN_VALUES = [0, 1 / Math.sqrt(3), 1, Math.sqrt(3)].flatMap((v) => (v === 0 ? [0] : [v, -v]));

interface TanExactParams {
  degrees: number;
  radians: boolean;
  phrasing: number;
}

/** tan at a special angle, exactly, from four options. */
const tanExact: Generator<TanExactParams> = {
  id: 'trig-tan-exact',
  sample: (rng, difficulty) => ({
    degrees: rng.pick(TAN_DEFINED) + (difficulty > 1 ? rng.pick([0, 360, -360]) : 0),
    radians: rng.chance(0.5),
    phrasing: rng.int(0, 1),
  }),
  render: ({ degrees, radians, phrasing }): Slide => {
    const value = ratioAt('tan', degrees)!;
    // The sign, the reciprocal, and undefined, before anything merely nearby.
    const candidates: (number | undefined)[] =
      value === 0 ? [undefined, 1, -1] : [-value, 1 / value, -1 / value, undefined];
    const picked: (number | undefined)[] = [];
    for (const candidate of [...candidates, ...TAN_VALUES]) {
      if (picked.length === 3) break;
      const tex = exactOrUndefined(candidate);
      if (tex === exactTex(value) || picked.some((other) => exactOrUndefined(other) === tex)) continue;
      picked.push(candidate);
    }
    const angle = angleTex(degrees, radians);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text:
            phrasing === 0
              ? `Without a calculator, what is $\\tan\\left(${angle}\\right)$?`
              : `What is the exact value of $\\tan\\left(${angle}\\right)$?`,
        },
      ],
      options: sortedExact([value, ...picked]).map((v) => {
        const tex = exactOrUndefined(v);
        return { id: tex, label: tex, tex: true };
      }),
      correctId: exactTex(value),
    };
  },
  solution: ({ degrees, radians }) => {
    const turned = ((degrees % 360) + 360) % 360;
    const { s, c } = sinCos(turned);
    return [
      {
        text:
          turned === degrees
            ? radians
              ? `In degrees the angle is $${degrees}^{\\circ}$.`
              : 'Divide the sine by the cosine.'
            : `$${angleTex(degrees, radians)}$ lands in the same place as $${turned}^{\\circ}$, a whole turn ${degrees > turned ? 'less' : 'more'}.`,
      },
      { tex: `\\sin(${turned}^{\\circ}) = ${exactTex(s)}, \\quad \\cos(${turned}^{\\circ}) = ${exactTex(c)}` },
      { tex: `\\tan(${turned}^{\\circ}) = ${exactTex(s)} \\div ${exactTex(c)} = ${exactTex(s / c)}` },
    ];
  },
};

interface TanValueTreeParams {
  degrees: number;
  radians: boolean;
  phrasing: number;
}

/** The acute angle a radius makes with the horizontal axis. */
function referenceAngle(degrees: number): number {
  const turned = ((degrees % 360) + 360) % 360;
  const within = turned % 180;
  return within <= 90 ? within : 180 - within;
}

const VALUE_TREE_PROMPTS = [
  'Put the reference angle, the acute angle between the radius and the horizontal axis, in the top box. Then the exact value underneath, sign included.',
  'Top box: the acute angle the radius makes with the horizontal axis. Bottom box: $\\tan$ of the whole angle, exactly.',
];

/** Reference angle first, then the value with its sign: tan at any special angle. */
const tanValueTree: Generator<TanValueTreeParams> = {
  id: 'trig-tan-value-tree',
  sample: (rng, difficulty) => ({
    degrees: rng.pick(TAN_DEFINED.filter((d) => d % 90 !== 0)) + (difficulty > 1 && rng.chance(0.5) ? 360 : 0),
    radians: rng.chance(0.5),
    phrasing: rng.int(0, VALUE_TREE_PROMPTS.length - 1),
  }),
  render: ({ degrees, radians, phrasing }): Slide => {
    const value = ratioAt('tan', degrees)!;
    const reference = referenceAngle(degrees);
    const references = [30, 45, 60].map((d) => angleTex(d, radians));
    // tan 45 comes back a hair under 1, so compare with room for the float.
    const flipped = Math.abs(Math.abs(value) - 1) < 1e-9 ? Math.sign(value) * Math.sqrt(3) : 1 / value;
    const values = sortedExact([value, -value, flipped]).map((v) => exactTex(v!));
    return {
      kind: 'tree',
      prompt: [{ kind: 'prose', text: VALUE_TREE_PROMPTS[phrasing] }],
      expression: `\\tan\\left(${angleTex(degrees, radians)}\\right)`,
      nodes: [
        { id: 'reference', from: [] },
        { id: 'value', from: ['reference'] },
      ],
      bank: [...references, ...new Set(values)],
      answer: [angleTex(reference, radians), exactTex(value)],
    };
  },
  solution: ({ degrees, radians }) => {
    const value = ratioAt('tan', degrees)!;
    const reference = referenceAngle(degrees);
    const quarter = Math.floor((((degrees % 360) + 360) % 360) / 90);
    return [
      {
        text: `The radius at $${angleTex(degrees, radians)}$ makes $${angleTex(reference, radians)}$ with the horizontal axis, so the size of the tangent is $\\tan\\left(${angleTex(reference, radians)}\\right) = ${exactTex(Math.abs(value))}$.`,
      },
      {
        text: `The point is in the ${ORDINALS[quarter + 1]} quarter of the turn, where $\\sin$ and $\\cos$ have ${quarter % 2 === 0 ? 'the same sign, so $\\tan$ is positive' : 'opposite signs, so $\\tan$ is negative'}.`,
      },
      { tex: `\\tan\\left(${angleTex(degrees, radians)}\\right) = ${exactTex(value)}` },
    ];
  },
};

/** The right-hand sides tan x = k is solved for, with the solution between -90 and 90 degrees. */
const TAN_KS: { value: number; tex: string; alpha: number }[] = [
  { value: 1, tex: '1', alpha: 45 },
  { value: -1, tex: '-1', alpha: -45 },
  { value: Math.sqrt(3), tex: '\\sqrt{3}', alpha: 60 },
  { value: -Math.sqrt(3), tex: '-\\sqrt{3}', alpha: -60 },
  { value: 1 / Math.sqrt(3), tex: '\\frac{1}{\\sqrt{3}}', alpha: 30 },
  { value: -1 / Math.sqrt(3), tex: '-\\frac{1}{\\sqrt{3}}', alpha: -30 },
  { value: 0, tex: '0', alpha: 0 },
];

type TanInterval = 'full' | 'signed' | 'radians';

const INTERVAL_TEX: Record<TanInterval, string> = {
  full: '0^{\\circ} \\le x < 360^{\\circ}',
  signed: '-180^{\\circ} < x \\le 180^{\\circ}',
  radians: '0 \\le x < 2\\pi',
};

/** Both solutions of tan x = tan(alpha) in the interval, in degrees, smallest first. */
function tanSolutions(alpha: number, interval: TanInterval): number[] {
  if (interval === 'signed') return alpha > 0 ? [alpha - 180, alpha] : [alpha, alpha + 180];
  return alpha < 0 ? [alpha + 180, alpha + 360] : [alpha, alpha + 180];
}

const inInterval = (degrees: number, interval: TanInterval): boolean =>
  interval === 'signed' ? degrees > -180 && degrees <= 180 : degrees >= 0 && degrees < 360;

interface TanSolveParams {
  k: number;
  interval: TanInterval;
  /** 0 is tan x = k as it stands; above 0 the equation arrives dressed and needs a step first. */
  dressed: number;
  /** Two ways of asking, since the pool of equations is small. */
  phrasing: number;
}

/** The equation as the question writes it. */
function tanEquationTex({ k, dressed }: TanSolveParams): string {
  const { value, tex } = TAN_KS[k];
  if (dressed === 0) return `\\tan(x) = ${tex}`;
  if (Math.abs(value) === Math.sqrt(3)) return `\\tan(x) ${value > 0 ? '-' : '+'} \\sqrt{3} = 0`;
  if (Math.abs(value) === 1 / Math.sqrt(3)) return `\\sqrt{3}\\tan(x) = ${value > 0 ? '1' : '-1'}`;
  return `${dressed + 1}\\tan(x) = ${value * (dressed + 1)}`;
}

/** Both solutions of tan x = k in an interval: one from the table, the other a half turn away. */
const tanSolve: Generator<TanSolveParams> = {
  id: 'trig-tan-solve',
  sample: (rng, difficulty) => ({
    k: rng.int(0, TAN_KS.length - 1),
    interval: difficulty > 1 ? rng.pick(['full', 'signed', 'radians'] as const) : 'full',
    dressed: rng.chance(0.5) ? rng.int(1, 4) : 0,
    phrasing: rng.int(0, 1),
  }),
  render: (p): Slide => {
    const { alpha } = TAN_KS[p.k];
    const radians = p.interval === 'radians';
    const answer = tanSolutions(alpha, p.interval);
    const token = (degrees: number) => (radians ? piTex(degrees, 180) : `${degrees}`);
    // The wrong sign's pair, then the angles a quarter turn off.
    const distractors = [...tanSolutions(-alpha, p.interval), ...answer.map((d) => d + 90), ...answer.map((d) => d - 90)]
      .filter((d) => inInterval(d, p.interval) && !answer.includes(d))
      .slice(0, 3);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text:
            p.phrasing === 0
              ? `Solve $${tanEquationTex(p)}$ for $${INTERVAL_TEX[p.interval]}$.`
              : `Find both angles with $${INTERVAL_TEX[p.interval]}$ for which $${tanEquationTex(p)}$.`,
        },
      ],
      template: radians
        ? 'x = {0} \\quad \\text{or} \\quad x = {1}'
        : 'x = {0}^{\\circ} \\quad \\text{or} \\quad x = {1}^{\\circ}',
      bank: sortedBank(answer.map(token), [...new Set(distractors)].map(token)),
      answer: answer.map(token),
      unordered: true,
    };
  },
  solution: (p) => {
    const { value, tex, alpha } = TAN_KS[p.k];
    const radians = p.interval === 'radians';
    const answer = tanSolutions(alpha, p.interval);
    const steps: SolutionStep[] = [];
    if (p.dressed > 0 && value !== 0) {
      steps.push({ text: `First get $\\tan(x)$ on its own: $${tanEquationTex(p)}$ is $\\tan(x) = ${tex}$.` });
    } else if (p.dressed > 0) {
      steps.push({ text: `Dividing by $${p.dressed + 1}$ leaves $\\tan(x) = 0$.` });
    }
    steps.push({
      text: `From the table, $\\tan(${alpha}^{\\circ}) = ${tex}$. Tangent repeats every $180^{\\circ}$, so every solution is $${alpha}^{\\circ}$ plus a whole number of $180^{\\circ}$s.`,
    });
    steps.push({
      tex: `x = ${answer.map((d) => angleTex(d, radians)).join(' \\quad \\text{or} \\quad x = ')}`,
    });
    steps.push({
      text: `Those are the two that land in $${INTERVAL_TEX[p.interval]}$; any other is outside it.`,
    });
    return steps;
  },
};

interface TanSolveSliderParams {
  k: number;
  nth: number;
  radians: boolean;
  /** A longer stretch of axis, and so a harder picture to read. */
  wide: boolean;
}

/** The nth positive solution of tan x = k, in degrees. */
function nthTanSolution({ k, nth }: TanSolveSliderParams): number {
  const { alpha } = TAN_KS[k];
  return (alpha > 0 ? alpha : alpha + 180) + 180 * (nth - 1);
}

const solveSliderScale = ({ radians, wide }: TanSolveSliderParams) =>
  radians
    ? { max: wide ? 13 : 10, step: 0.05, tolerance: 0.1 }
    : { max: wide ? 720 : 540, step: 1, tolerance: 3 };

/** Where does the line y = k meet y = tan x for the nth time? */
const tanSolveSlider: Generator<TanSolveSliderParams> = {
  id: 'trig-tan-solve-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const p: TanSolveSliderParams = {
        k: rng.int(0, TAN_KS.length - 1),
        nth: rng.int(1, difficulty > 1 ? 4 : 3),
        radians: rng.chance(0.5),
        wide: difficulty > 1,
      };
      const { max, tolerance } = solveSliderScale(p);
      const value = nthTanSolution(p) * (p.radians ? DEGREE : 1);
      if (value <= max - 3 * tolerance && Math.abs(value - max / 2) > 3 * tolerance) return p;
    }
  },
  render: (p): Slide => {
    const { max, step, tolerance } = solveSliderScale(p);
    const unit = p.radians ? 1 : DEGREE;
    const { value: k, tex } = TAN_KS[p.k];
    const svg = plotSvg({
      xMin: 0,
      xMax: max,
      curves: [{ f: (x) => Math.tan(x * unit), breaks: true }],
      horizontals: k === 0 ? [] : [k],
      yMin: -3,
      yMax: 3,
      label: `The graph of y = tan x with x in ${p.radians ? 'radians' : 'degrees'}, and a dashed horizontal line`,
    });
    const value = nthTanSolution(p) * (p.radians ? DEGREE : 1);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text:
            k === 0
              ? `This is $y = \\tan(x)$ with $x$ in ${p.radians ? 'radians' : 'degrees'}. Slide to the **${ORDINALS[p.nth]}** solution of $\\tan(x) = 0$ after $x = 0$.`
              : `This is $y = \\tan(x)$ with $x$ in ${p.radians ? 'radians' : 'degrees'}, and the dashed line is $y = ${tex}$. Slide to the **${ORDINALS[p.nth]}** solution of $\\tan(x) = ${tex}$ after $x = 0$.`,
        },
      ],
      min: 0,
      max,
      step,
      tolerance,
      answer: Number((Math.round(value / step) * step).toFixed(2)),
      readout: p.radians ? 'x = {v}' : 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, max) },
    };
  },
  solution: (p) => {
    const { tex, alpha } = TAN_KS[p.k];
    const first = alpha > 0 ? alpha : alpha + 180;
    const answer = nthTanSolution(p);
    return [
      {
        text:
          alpha > 0
            ? `From the table $\\tan(${alpha}^{\\circ}) = ${tex}$, and that is the first solution after zero.`
            : alpha < 0
              ? `From the table $\\tan(${alpha}^{\\circ}) = ${tex}$. That is before zero, so the first solution after it is half a turn on, $${first}^{\\circ}$.`
              : `$\\tan$ is zero where sine is: at $0$ and every half turn after, so the first time after zero is $180^{\\circ}$.`,
      },
      {
        text: `Each branch of the curve crosses the line once, and the branches are $180^{\\circ}$ apart, so the ${ORDINALS[p.nth]} solution is $${p.nth - 1}$ half turn${p.nth === 2 ? '' : 's'} after the first.`,
      },
      {
        tex: `x = ${first}^{\\circ} + ${p.nth - 1} \\times 180^{\\circ} = ${answer}^{\\circ}${p.radians ? ` = ${piTex(answer, 180)} \\approx ${(answer * DEGREE).toFixed(2)}` : ''}`,
      },
    ];
  },
};

interface RecipExactParams {
  fn: Reciprocal;
  degrees: number;
  radians: boolean;
}

/** Where each reciprocal is a whole number, so the answer can be typed. */
const WHOLE_RECIPROCALS: Record<Reciprocal, number[]> = {
  sec: [0, 60, 120, 180, 240, 300, 360],
  cosec: [30, 90, 150, 210, 270, 330],
  cot: [45, 90, 135, 225, 270, 315],
};

/** sec, cosec or cot at an angle where the answer is whole: one over the cosine, the sine, or the tangent. */
const recipExact: Generator<RecipExactParams> = {
  id: 'trig-recip-exact',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sec', 'cosec', 'cot'] as const);
    return {
      fn,
      degrees: rng.pick(WHOLE_RECIPROCALS[fn]) + (difficulty > 1 ? rng.pick([0, 360, -360]) : 0),
      radians: rng.chance(0.5),
    };
  },
  render: ({ fn, degrees, radians }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Find the exact value, without a calculator.' }],
    lead: `${RATIO_TEX[fn]}\\left(${angleTex(degrees, radians)}\\right) =`,
    keypad: NUMBER_KEYS,
    answer: `${Math.round(ratioAt(fn, degrees)!)}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ fn, degrees }) => {
    const value = Math.round(ratioAt(fn, degrees)!);
    const option = (v: number) => ({ tex: exactTex(v), answer: `${v}` });
    if (value === 0) {
      // cot at a quarter turn: tan is undefined there, and cot is zero.
      return options(option(0), { tex: UNDEFINED_TEX }, option(1), option(-1));
    }
    // The ratio it is one over, the sign lost, and both at once.
    const picked: number[] = [];
    for (const candidate of [1 / value, -value, -1 / value, 2 * value, 0]) {
      if (picked.length === 3) break;
      if (candidate === value || picked.includes(candidate)) continue;
      picked.push(candidate);
    }
    return options(option(value), ...picked.map(option));
  },
  solution: ({ fn, degrees, radians }) => {
    const { s, c } = sinCos(degrees);
    const angle = angleTex(degrees, radians);
    const value = Math.round(ratioAt(fn, degrees)!);
    if (fn === 'cot') {
      return [
        { text: 'Cotangent is cosine over sine, which also works where the tangent itself is undefined.' },
        { tex: `\\cos\\left(${angle}\\right) = ${exactTex(c)}, \\quad \\sin\\left(${angle}\\right) = ${exactTex(s)}` },
        { tex: `\\cot\\left(${angle}\\right) = ${exactTex(c)} \\div ${exactTex(s)} = ${value}` },
      ];
    }
    const base = fn === 'sec' ? c : s;
    const baseFn = fn === 'sec' ? 'cos' : 'sin';
    return [
      { text: `${fn === 'sec' ? 'Secant' : 'Cosecant'} is one over ${RATIO_NAME[baseFn]}, so find the ${RATIO_NAME[baseFn]} first.` },
      { tex: `${RATIO_TEX[baseFn]}\\left(${angle}\\right) = ${exactTex(base)}` },
      {
        tex: `${RATIO_TEX[fn]}\\left(${angle}\\right) = 1 \\div \\left(${exactTex(base)}\\right) = ${value}`,
      },
    ];
  },
};

interface RecipTreeParams {
  fn: Reciprocal;
  degrees: number;
  radians: boolean;
}

/** Angles where the ratio underneath is defined, non-zero and not plus or minus one, so the two boxes differ. */
const recipTreeAngles = (fn: Reciprocal): number[] =>
  SPECIAL_DEGREES.filter((d) => {
    const base = ratioAt(fn === 'sec' ? 'cos' : fn === 'cosec' ? 'sin' : 'tan', d);
    return base !== undefined && base !== 0 && Math.abs(Math.abs(base) - 1) > 1e-9;
  });

/** The base ratio first, then one over it: sec, cosec or cot at any special angle. */
const recipTree: Generator<RecipTreeParams> = {
  id: 'trig-recip-tree',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sec', 'cosec', 'cot'] as const);
    return {
      fn,
      degrees: rng.pick(recipTreeAngles(fn)) + (difficulty > 1 && rng.chance(0.5) ? 360 : 0),
      radians: rng.chance(0.5),
    };
  },
  render: ({ fn, degrees, radians }): Slide => {
    const baseFn = fn === 'sec' ? 'cos' : fn === 'cosec' ? 'sin' : 'tan';
    const otherFn = fn === 'sec' ? 'sin' : 'cos';
    const base = ratioAt(baseFn, degrees)!;
    const value = 1 / base;
    const other = ratioAt(otherFn, degrees)!;
    const answer = [exactTex(base), exactTex(value)];
    // The sign lost on each, and the other ratio in its place.
    const bank = [...new Set([...answer, exactTex(-base), exactTex(-value), exactTex(other)])];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Put $${RATIO_TEX[baseFn]}$ of the angle in the top box, then one over it underneath.`,
        },
      ],
      expression: `${RATIO_TEX[fn]}\\left(${angleTex(degrees, radians)}\\right)`,
      nodes: [
        { id: 'base', from: [] },
        { id: 'value', from: ['base'] },
      ],
      bank: bank.sort(),
      answer,
    };
  },
  solution: ({ fn, degrees, radians }) => {
    const baseFn = fn === 'sec' ? 'cos' : fn === 'cosec' ? 'sin' : 'tan';
    const base = ratioAt(baseFn, degrees)!;
    const angle = angleTex(degrees, radians);
    return [
      { text: `$${RATIO_TEX[fn]}$ is one over $${RATIO_TEX[baseFn]}$.` },
      { tex: `${RATIO_TEX[baseFn]}\\left(${angle}\\right) = ${exactTex(base)}` },
      { tex: `${RATIO_TEX[fn]}\\left(${angle}\\right) = 1 \\div \\left(${exactTex(base)}\\right) = ${exactTex(1 / base)}` },
      { text: 'One over a fraction turns it upside down, and the sign stays as it was.' },
    ];
  },
};

interface RecipDefinedParams {
  fn: 'tan' | Reciprocal;
  degrees: number;
  radians: boolean;
}

const YES_ZERO = 'Yes, it is zero there';
const NOT_ZERO = 'No, it is not zero there';
const BOTTOM_LABELS: Record<'sin' | 'cos', string> = {
  sin: '$\\sin$ of the angle',
  cos: '$\\cos$ of the angle',
};
const BOTTOM_ONE = 'The number $1$';

/** Does it have a value? Write it with sine and cosine and look at the bottom. */
const recipUndefinedFlow: Generator<RecipDefinedParams> = {
  id: 'trig-recip-undefined-flow',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['tan', 'sec', 'cosec', 'cot'] as const);
    const zeros = DENOMINATOR_OF[fn] === 'cos' ? [90, 270] : [0, 180, 360];
    const pool = rng.chance(0.5) ? zeros : SPECIAL_DEGREES.filter((d) => !zeros.includes(d));
    return {
      fn,
      degrees: rng.pick(pool) + (difficulty > 1 && rng.chance(0.5) ? 360 : 0),
      radians: rng.chance(0.5),
    };
  },
  render: ({ fn, degrees, radians }): Slide => {
    const bottom = DENOMINATOR_OF[fn];
    const undefinedHere = ratioAt(fn, degrees) === undefined;
    const name = `$${RATIO_TEX[fn]}\\left(${angleTex(degrees, radians)}\\right)$`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Does this have a value? Write it with sine and cosine, then look at what is on the bottom.',
        },
      ],
      subject: `${RATIO_TEX[fn]}\\left(${angleTex(degrees, radians)}\\right)`,
      steps: [
        {
          id: 'bottom',
          ask: 'Written as a fraction of sine and cosine, what is on the bottom?',
          branches: [
            { label: BOTTOM_LABELS.sin, to: 'zero' },
            { label: BOTTOM_LABELS.cos, to: 'zero' },
            { label: BOTTOM_ONE, to: 'zero' },
          ],
        },
        {
          id: 'zero',
          ask: 'Is that zero at this angle?',
          branches: [
            { label: YES_ZERO, outcome: `Then ${name} is undefined: nothing can be divided by zero.` },
            { label: NOT_ZERO, outcome: `Then ${name} has a value.` },
          ],
        },
      ],
      answer: [BOTTOM_LABELS[bottom], undefinedHere ? YES_ZERO : NOT_ZERO],
    };
  },
  solution: ({ fn, degrees, radians }) => {
    const bottom = DENOMINATOR_OF[fn];
    const top = fn === 'tan' ? '\\sin' : fn === 'cot' ? '\\cos' : '1';
    const angle = angleTex(degrees, radians);
    const { s, c } = sinCos(degrees);
    const bottomValue = bottom === 'sin' ? s : c;
    const value = ratioAt(fn, degrees);
    return [
      { tex: `${RATIO_TEX[fn]} = \\frac{${top}}{${RATIO_TEX[bottom]}}` },
      { tex: `${RATIO_TEX[bottom]}\\left(${angle}\\right) = ${exactTex(bottomValue)}` },
      {
        text:
          value === undefined
            ? `The bottom is zero, so $${RATIO_TEX[fn]}\\left(${angle}\\right)$ is undefined. On its graph this is an asymptote.`
            : `The bottom is not zero, so $${RATIO_TEX[fn]}\\left(${angle}\\right)$ has a value: $${exactTex(value)}$.`,
      },
    ];
  },
};

interface RecipValuesParams extends TripleParams {
  /** Which two of sec, cosec and cot are asked. */
  pair: number;
}

const RECIPROCAL_PAIRS: [Reciprocal, Reciprocal][] = [
  ['sec', 'cosec'],
  ['sec', 'cot'],
  ['cosec', 'cot'],
];

/** From sin and cos as fractions to two of the reciprocals: turn the right fraction over. */
const recipFromValues: Generator<RecipValuesParams> = {
  id: 'trig-recip-from-values',
  sample: (rng) => ({ ...sampleTriple(rng, 4), pair: rng.int(0, RECIPROCAL_PAIRS.length - 1) }),
  render: (p): Slide => {
    const ratios = ratiosAt(p);
    const tex = (fn: Ratio) => signedFracTex(...ratios[fn]);
    const [first, second] = RECIPROCAL_PAIRS[p.pair];
    const answer = [tex(first), tex(second)];
    // The ratios themselves, unturned, and the answers with the sign lost.
    const distractors = [tex('sin'), tex('cos'), tex('tan'), signedFracTex(-ratios[first][0], ratios[first][1])];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$\\sin(\\theta) = ${tex('sin')}$ and $\\cos(\\theta) = ${tex('cos')}$. Place $${RATIO_TEX[first]}(\\theta)$ and $${RATIO_TEX[second]}(\\theta)$.`,
        },
      ],
      template: `${RATIO_TEX[first]}(\\theta) = {0} \\qquad ${RATIO_TEX[second]}(\\theta) = {1}`,
      bank: sortedBank(answer, distractors),
      answer,
    };
  },
  solution: (p) => {
    const ratios = ratiosAt(p);
    const tex = (fn: Ratio) => signedFracTex(...ratios[fn]);
    const how: Record<Reciprocal, string> = {
      sec: `$\\sec(\\theta)$ is one over $\\cos(\\theta)$: turn $${tex('cos')}$ over to get $${tex('sec')}$.`,
      cosec: `$\\operatorname{cosec}(\\theta)$ is one over $\\sin(\\theta)$: turn $${tex('sin')}$ over to get $${tex('cosec')}$.`,
      cot: `$\\cot(\\theta)$ is cosine over sine, and the two denominators cancel: $${tex('cos')} \\div ${tex('sin')} = ${tex('cot')}$.`,
    };
    const [first, second] = RECIPROCAL_PAIRS[p.pair];
    return [{ text: how[first] }, { text: how[second] }, { text: 'Turning a fraction over never changes its sign.' }];
  },
};

interface RecipGraphParams {
  fn: 'tan' | Reciprocal;
  a: number;
  /** Drawn from -180 to 180 rather than from 0 to 360. */
  signed: boolean;
}

const GRAPH_FNS = ['tan', 'sec', 'cosec', 'cot'] as const;

/** What each graph looks like, for the worked solution. */
const GRAPH_FEATURES: Record<'tan' | Reciprocal, string> = {
  tan: 'It passes through the origin and repeats every $180^{\\circ}$, with asymptotes at $90^{\\circ}$ and $270^{\\circ}$, where cosine is zero.',
  sec: 'It is made of U-shaped pieces that never get between the two dashed-off heights, turning back where cosine is $1$ or $-1$ (at $0^{\\circ}$ and $180^{\\circ}$), with asymptotes at $90^{\\circ}$ and $270^{\\circ}$.',
  cosec: 'It is made of U-shaped pieces that turn back where sine is $1$ or $-1$ (at $90^{\\circ}$ and $270^{\\circ}$), with asymptotes at $0^{\\circ}$ and $180^{\\circ}$, where sine is zero.',
  cot: 'Like tangent it runs from one asymptote to the next without turning, but its asymptotes are at $0^{\\circ}$ and $180^{\\circ}$, where sine is zero, and it crosses the axis at $90^{\\circ}$.',
};

/** Which of tan, sec, cosec and cot is this? */
const recipGraphMatch: Generator<RecipGraphParams> = {
  id: 'trig-recip-graph-match',
  sample: (rng, difficulty) => ({
    fn: rng.pick(GRAPH_FNS),
    a: difficulty > 1 ? nonZeroInt(rng, -4, 4) : rng.int(1, 4),
    signed: rng.chance(0.5),
  }),
  render: ({ fn, a, signed }): Slide => {
    const xMin = signed ? -180 : 0;
    const reach = 4 * Math.abs(a);
    const svg = plotSvg({
      xMin,
      xMax: xMin + 360,
      curves: [{ f: (x) => a * RATIO_CURVE[fn](x * DEGREE), breaks: true }],
      verticals: [1, 2, 3].map((q) => ({ x: xMin + 90 * q })),
      yMin: -reach,
      yMax: reach,
      label: 'The graph of one of tan, sec, cosec and cot over one turn, with dashed lines every quarter turn',
    });
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: signed
            ? 'Which function is this? The picture runs from $-180^{\\circ}$ to $180^{\\circ}$ with dashed lines at $-90^{\\circ}$, $0^{\\circ}$ and $90^{\\circ}$.'
            : 'Which function is this? The picture runs from $0^{\\circ}$ to $360^{\\circ}$ with dashed lines at $90^{\\circ}$, $180^{\\circ}$ and $270^{\\circ}$.',
        },
        { kind: 'diagram', svg },
      ],
      options: GRAPH_FNS.map((g) => ({ id: g, label: `y = ${coefficientTex(a)}${RATIO_TEX[g]}(x)`, tex: true })),
      correctId: fn,
    };
  },
  solution: ({ fn, a }) => [
    { text: GRAPH_FEATURES[fn] },
    {
      text:
        fn === 'sec' || fn === 'cosec'
          ? `Multiplied by $${a}$, the pieces turn back at $${a}$ and $${-a}$ instead of at $1$ and $-1$, and nothing of the curve lies between those two heights.`
          : `Multiplied by $${a}$, the curve is stretched ${a < 0 ? 'and turned upside down' : 'upwards'}, but its asymptotes and crossings stay where they were.`,
    },
    { tex: `y = ${coefficientTex(a)}${RATIO_TEX[fn]}(x)` },
  ],
};

interface IdentityFindParams extends TripleParams {
  /** Which ratio is given and which is asked, by index into `IDENTITY_PAIRS`. */
  pair: number;
}

/** Given, asked: the six ways round the three Pythagorean identities go. */
const IDENTITY_PAIRS: [Ratio, Ratio][] = [
  ['sin', 'cos'],
  ['cos', 'sin'],
  ['tan', 'sec'],
  ['sec', 'tan'],
  ['cot', 'cosec'],
  ['cosec', 'cot'],
];

const IDENTITY_LABELS = [
  '$\\sin^2(\\theta) + \\cos^2(\\theta) = 1$',
  '$1 + \\tan^2(\\theta) = \\sec^2(\\theta)$',
  '$1 + \\cot^2(\\theta) = \\operatorname{cosec}^2(\\theta)$',
];

/** The squared step of an identity, from given to asked, as display TeX. */
function identitySquaredTex(p: TripleParams, given: Ratio, asked: Ratio): string {
  const ratios = ratiosAt(p);
  const [gn, gd] = ratios[given].map(Math.abs);
  const [an, ad] = ratios[asked].map(Math.abs);
  const sq = (n: number, d: number) => `\\frac{${n * n}}{${d * d}}`;
  const plusOne = asked === 'sec' || asked === 'cosec';
  const lead = asked === 'sin' || asked === 'cos' ? '1 -' : plusOne ? '1 +' : '';
  const squared = `${RATIO_TEX[asked]}^2(\\theta)`;
  if (lead) return `${squared} = ${lead} ${sq(gn, gd)} = ${sq(an, ad)}`;
  return `${squared} = ${sq(gn, gd)} - 1 = ${sq(an, ad)}`;
}

/** The identity a pair uses, as display TeX without the dollars. */
const identityTex = (pair: number): string => IDENTITY_LABELS[pair >> 1].slice(1, -1);

/** Find one ratio from another with 1 + tan^2 = sec^2 or 1 + cot^2 = cosec^2, and the quadrant for the sign. */
const identityFind: Generator<IdentityFindParams> = {
  id: 'trig-identity-find',
  sample: (rng, difficulty) => ({ ...sampleTriple(rng, difficulty > 1 ? 4 : 2), pair: rng.int(2, 5) }),
  render: (p): Slide => {
    const ratios = ratiosAt(p);
    const [given, asked] = IDENTITY_PAIRS[p.pair];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$${RATIO_TEX[given]}(\\theta) = ${signedFracTex(...ratios[given])}$ and $${QUADRANT_RANGE[p.quadrant - 1]}$. Use an identity to find $${RATIO_TEX[asked]}(\\theta)$, as a fraction.`,
        },
      ],
      lead: `${RATIO_TEX[asked]}(\\theta) =`,
      keypad: NUMBER_KEYS,
      answer: fracAnswer(ratios[asked]),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const [n, d] = ratiosAt(p)[IDENTITY_PAIRS[p.pair][1]];
    const option = (top: number, bottom: number) => ({ tex: signedFracTex(top, bottom), answer: `(${top})/(${bottom})` });
    // The sign from the wrong quadrant, turned over, and both.
    return options(option(n, d), option(-n, d), option(d, n), option(-d, n));
  },
  solution: (p) => {
    const ratios = ratiosAt(p);
    const [given, asked] = IDENTITY_PAIRS[p.pair];
    const [n, d] = ratios[asked];
    const positive = n * d > 0;
    return [
      { text: 'This pair of ratios is linked by one identity:' },
      { tex: identityTex(p.pair) },
      { tex: identitySquaredTex(p, given, asked) },
      {
        text: `So $${RATIO_TEX[asked]}(\\theta) = \\pm${ratioTex(Math.abs(n), Math.abs(d))}$. With $${QUADRANT_RANGE[p.quadrant - 1]}$ it is ${positive ? 'positive' : 'negative'}, so $${RATIO_TEX[asked]}(\\theta) = ${signedFracTex(n, d)}$.`,
      },
    ];
  },
};

interface IdentitySquareParams {
  index: number;
  swap: boolean;
  negative: boolean;
  /** Which identity: from tan to sec squared, or from cot to cosec squared. */
  cot: boolean;
}

/** 1 + tan^2 = sec^2 worked with numbers: square the given value, then add one. */
const identitySquare: Generator<IdentitySquareParams> = {
  id: 'trig-identity-square',
  // The first four triples only: 20, 21, 29 squares to 841 over 441, which
  // turns a question about the identity into one about long multiplication.
  sample: (rng) => ({
    index: rng.int(0, 3),
    swap: rng.chance(0.5),
    negative: rng.chance(0.5),
    cot: rng.chance(0.5),
  }),
  render: ({ index, swap, negative, cot }): Slide => {
    const [p, q, h] = IDENTITY_TRIPLES[index];
    const [n, d] = swap ? [q, p] : [p, q];
    const given = cot ? 'cot' : 'tan';
    const asked = cot ? 'cosec' : 'sec';
    const squared = `\\frac{${n * n}}{${d * d}}`;
    const total = `\\frac{${h * h}}{${d * d}}`;
    // Not squared, squared upside down, the total over the wrong square, and the minus kept.
    const distractors = [`\\frac{${n}}{${d}}`, `\\frac{${d * d}}{${n * n}}`, `\\frac{${h * h}}{${n * n}}`];
    if (negative) distractors.push(`-${squared}`);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$${RATIO_TEX[given]}(\\theta) = ${negative ? '-' : ''}\\frac{${n}}{${d}}$. Complete the line to find $${RATIO_TEX[asked]}^2(\\theta)$.`,
        },
      ],
      template: `${RATIO_TEX[asked]}^2(\\theta) = 1 + {0} = {1}`,
      bank: sortedBank([squared, total], distractors),
      answer: [squared, total],
    };
  },
  solution: ({ index, swap, negative, cot }) => {
    const [p, q, h] = IDENTITY_TRIPLES[index];
    const [n, d] = swap ? [q, p] : [p, q];
    const given = cot ? 'cot' : 'tan';
    const asked = cot ? 'cosec' : 'sec';
    return [
      {
        text: cot
          ? 'Dividing $\\sin^2(\\theta) + \\cos^2(\\theta) = 1$ through by $\\sin^2(\\theta)$ gives $1 + \\cot^2(\\theta) = \\operatorname{cosec}^2(\\theta)$.'
          : 'Dividing $\\sin^2(\\theta) + \\cos^2(\\theta) = 1$ through by $\\cos^2(\\theta)$ gives $\\tan^2(\\theta) + 1 = \\sec^2(\\theta)$.',
      },
      {
        tex: `${RATIO_TEX[asked]}^2(\\theta) = 1 + \\left(${negative ? '-' : ''}\\frac{${n}}{${d}}\\right)^2 = 1 + \\frac{${n * n}}{${d * d}} = \\frac{${h * h}}{${d * d}}`,
      },
      {
        text: `${negative ? 'Squaring gets rid of the minus sign. ' : ''}Writing the $1$ as $\\frac{${d * d}}{${d * d}}$ makes the addition one of tops: $${d * d} + ${n * n} = ${h * h}$. The value of $${RATIO_TEX[given]}(\\theta)$ was only needed squared.`,
      },
    ];
  },
};

interface IdentityFlowParams extends TripleParams {
  pair: number;
}

const POSITIVE = 'Positive';
const NEGATIVE = 'Negative';

/** Which identity, and which sign: the two decisions before any arithmetic. */
const identityFlow: Generator<IdentityFlowParams> = {
  id: 'trig-identity-flow',
  sample: (rng) => ({ ...sampleTriple(rng, 4), pair: rng.int(0, IDENTITY_PAIRS.length - 1) }),
  render: (p): Slide => {
    const ratios = ratiosAt(p);
    const [given, asked] = IDENTITY_PAIRS[p.pair];
    const [n, d] = ratios[asked];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Given $${QUADRANT_RANGE[p.quadrant - 1]}$, find $${RATIO_TEX[asked]}(\\theta)$. Choose the identity first, then settle the sign.`,
        },
      ],
      subject: `${RATIO_TEX[given]}(\\theta) = ${signedFracTex(...ratios[given])}`,
      steps: [
        {
          id: 'identity',
          ask: 'Which identity links the ratio you have to the one you want?',
          branches: IDENTITY_LABELS.map((label) => ({ label, to: 'sign' })),
        },
        {
          id: 'sign',
          ask: `In that quarter of the turn, is $${RATIO_TEX[asked]}(\\theta)$ positive or negative?`,
          branches: [
            { label: POSITIVE, outcome: 'So take the positive square root.' },
            { label: NEGATIVE, outcome: 'So take the negative square root.' },
          ],
        },
      ],
      answer: [IDENTITY_LABELS[p.pair >> 1], n * d > 0 ? POSITIVE : NEGATIVE],
    };
  },
  solution: (p) => {
    const ratios = ratiosAt(p);
    const [given, asked] = IDENTITY_PAIRS[p.pair];
    const [n, d] = ratios[asked];
    const { x, y } = QUADRANT_SIGNS[p.quadrant - 1];
    return [
      {
        text: `$${RATIO_TEX[given]}$ and $${RATIO_TEX[asked]}$ appear together in one identity: $${identityTex(p.pair)}$.`,
      },
      { tex: identitySquaredTex(p, given, asked) },
      {
        text: `In that quarter $\\sin$ is ${y > 0 ? 'positive' : 'negative'} and $\\cos$ is ${x > 0 ? 'positive' : 'negative'}, so $${RATIO_TEX[asked]}(\\theta) = ${signedFracTex(n, d)}$.`,
      },
    ];
  },
};

/*
 * Inverse trigonometric functions. Sine, cosine and tangent each take many
 * angles to the same value, so undoing one means choosing: sin^-1, cos^-1 and
 * tan^-1 answer with the one angle in a restricted range, the principal value.
 *
 * Angles are held in whole degrees and written in either unit, as the rest of
 * this course does. The exact inputs are the special values of levels 4 and 5;
 * the calculator questions near the end use one-decimal inputs instead, since
 * the point there is what to do with the one angle a calculator gives.
 */

type Inverse = 'sin' | 'cos' | 'tan';

const INVERSES: Inverse[] = ['sin', 'cos', 'tan'];

/** How each inverse is written. */
const INVERSE_TEX: Record<Inverse, string> = {
  sin: '\\sin^{-1}',
  cos: '\\cos^{-1}',
  tan: '\\tan^{-1}',
};

/** The other notation, which a textbook or calculator may use instead. */
const ARC_TEX: Record<Inverse, string> = {
  sin: '\\arcsin',
  cos: '\\arccos',
  tan: '\\arctan',
};

/** Every principal value, in degrees, at which an inverse takes a special input. */
const PRINCIPAL: Record<Inverse, number[]> = {
  sin: [-90, -60, -45, -30, 0, 30, 45, 60, 90],
  cos: [0, 30, 45, 60, 90, 120, 135, 150, 180],
  tan: [-60, -45, -30, 0, 30, 45, 60],
};

/** Whether the input behind this principal value is zero or more. */
const nonNegativeInput = (fn: Inverse, degrees: number): boolean => (fn === 'cos' ? degrees <= 90 : degrees >= 0);

/** The special input whose inverse is this angle, as the learner reads it. */
const inputTex = (fn: Inverse, degrees: number): string => exactTex(ratioAt(fn, degrees)!);

/** The range an inverse answers in. tan^-1 never reaches its ends, so its inequalities are strict. */
function rangeTex(fn: Inverse, radians: boolean, v = '\\theta'): string {
  const [lo, hi] = fn === 'cos' ? [0, 180] : [-90, 90];
  const le = fn === 'tan' ? '<' : '\\le';
  return `${angleTex(lo, radians)} ${le} ${v} ${le} ${angleTex(hi, radians)}`;
}

/** Degrees reduced to -180 < d <= 180. */
function signedTurn(degrees: number): number {
  const t = ((degrees % 360) + 360) % 360;
  return t > 180 ? t - 360 : t;
}

/** The inverse of fn(degrees): the angle in the inverse's range with the same value. */
function principalOf(fn: Inverse, degrees: number): number {
  const t = signedTurn(degrees);
  if (fn === 'cos') return Math.abs(t);
  if (fn === 'tan') return t > 90 ? t - 180 : t <= -90 ? t + 180 : t;
  return t > 90 ? 180 - t : t < -90 ? -180 - t : t;
}

/** An angle for mathjs, in the unit asked. Never displayed. */
const angleAnswer = (degrees: number, radians: boolean): string => (radians ? piAnswer(degrees, 180) : `${degrees}`);

/** Choice options from angles in degrees: the answer and the first three candidates that differ from it and each other. */
function angleOptions(correct: number, candidates: number[], radians: boolean): ChoiceOption[] {
  const kept = [...new Set(candidates)].filter((d) => d !== correct).slice(0, 3);
  return options(
    { tex: angleTex(correct, radians), answer: angleAnswer(correct, radians) },
    ...kept.map((d) => ({ tex: angleTex(d, radians), answer: angleAnswer(d, radians) })),
  );
}

/** The slips worth offering beside a principal value: the other angle with that value, the wrong function's answer, the sign lost. */
const INVERSE_SLIPS: Record<Inverse, (d: number) => number[]> = {
  sin: (d) => [180 - d, 90 - d, -d, d + 360],
  cos: (d) => [180 - d, 90 - d, -d, 360 - d],
  tan: (d) => [-d, 90 - d, d + 180, 180 - d, d - 180],
};

/** Why a negative input gives the angle it does. */
function negativeInputText(fn: Inverse, degrees: number, radians: boolean): string {
  if (fn === 'cos') {
    const reference = 180 - degrees;
    return `The input is negative, so the angle is past a quarter turn: $\\cos^{-1}(-x) = ${radians ? '\\pi' : '180^{\\circ}'} - \\cos^{-1}(x)$, and $\\cos^{-1}\\left(${inputTex('cos', reference)}\\right) = ${angleTex(reference, radians)}$.`;
  }
  return `The input is negative, so the angle is below the axis: $${INVERSE_TEX[fn]}(-x) = -${INVERSE_TEX[fn]}(x)$, and $${INVERSE_TEX[fn]}\\left(${inputTex(fn, -degrees)}\\right) = ${angleTex(-degrees, radians)}$.`;
}

interface InverseExactParams {
  fn: Inverse;
  /** The answer, in degrees. */
  degrees: number;
  radians: boolean;
  /** Written arcsin rather than sin^-1. */
  arc: boolean;
  phrasing: number;
}

/** An inverse at a special input, typed in the unit asked; negative inputs only at difficulty 2. */
function inverseExact(id: string, fns: Inverse[]): Generator<InverseExactParams> {
  return {
    id,
    sample: (rng, difficulty) => {
      const fn = rng.pick(fns);
      return {
        fn,
        degrees: rng.pick(PRINCIPAL[fn].filter((d) => difficulty > 1 || nonNegativeInput(fn, d))),
        radians: rng.chance(0.5),
        arc: rng.chance(0.3),
        phrasing: rng.int(0, 2),
      };
    },
    render: ({ fn, degrees, radians, arc, phrasing }): Slide => {
      const v = inputTex(fn, degrees);
      const unit = radians ? 'radians' : 'degrees';
      const text = [
        `Find the exact value, without a calculator. Give it in ${unit}.`,
        `Which angle with $${rangeTex(fn, radians)}$ has ${RATIO_NAME[fn]} $${v}$? Give it in ${unit}.`,
        `What is the principal value, in ${unit}?`,
      ][phrasing];
      return {
        kind: 'expression',
        prompt: [{ kind: 'prose', text }],
        lead: `${(arc ? ARC_TEX : INVERSE_TEX)[fn]}\\left(${v}\\right) =`,
        keypad: radians ? PI_KEYS : NUMBER_KEYS,
        answer: angleAnswer(degrees, radians),
        domain: 'real',
        mode: 'exact',
      };
    },
    choices: ({ fn, degrees, radians }) => angleOptions(degrees, INVERSE_SLIPS[fn](degrees), radians),
    solution: ({ fn, degrees, radians, arc }) => {
      const v = inputTex(fn, degrees);
      const steps: SolutionStep[] = [
        {
          text: `$${(arc ? ARC_TEX : INVERSE_TEX)[fn]}(${v})$ asks for the angle whose ${RATIO_NAME[fn]} is $${v}$, and it answers from its range, $${rangeTex(fn, radians)}$.`,
        },
      ];
      steps.push({
        text: nonNegativeInput(fn, degrees)
          ? `From the table, $${RATIO_TEX[fn]}\\left(${angleTex(degrees, radians)}\\right) = ${v}$, and that angle is in the range.`
          : negativeInputText(fn, degrees, radians),
      });
      steps.push({ tex: `${INVERSE_TEX[fn]}\\left(${v}\\right) = ${angleTex(degrees, radians)}` });
      if (radians) steps.push({ text: `In degrees that is $${degrees}^{\\circ}$.` });
      return steps;
    },
  };
}

/** sin^-1 of a special value: the lesson that introduces the notation. */
const inverseSinExact = inverseExact('trig-inv-sin-exact', ['sin']);

/** cos^-1 and tan^-1 of a special value. */
const inverseCosTanExact = inverseExact('trig-inv-exact', ['cos', 'tan']);

/** Other angles, within two turns either way, with the same value of fn as this one. */
function sameValueAngles(fn: Inverse, degrees: number): number[] {
  const bases = fn === 'sin' ? [degrees, 180 - degrees] : fn === 'cos' ? [degrees, -degrees] : [degrees];
  const period = fn === 'tan' ? 180 : 360;
  const out: number[] = [];
  for (const base of bases) {
    for (let k = -4; k <= 4; k += 1) {
      const d = base + k * period;
      if (d >= -720 && d <= 720 && d !== degrees && !out.includes(d)) out.push(d);
    }
  }
  return out;
}

/** Why many angles share one value. */
const SAME_VALUE_REASON: Record<Inverse, string> = {
  sin: 'Sine repeats every $360^{\\circ}$, and an angle and $180^{\\circ}$ minus it share a sine, so every value is taken again and again.',
  cos: 'Cosine repeats every $360^{\\circ}$, and an angle and its negative share a cosine, so every value is taken again and again.',
  tan: 'Tangent repeats every $180^{\\circ}$, so every value is taken again and again.',
};

interface PrincipalParams {
  fn: Inverse;
  degrees: number;
  /** Three more angles with the same value. */
  others: number[];
  radians: boolean;
}

/** Four angles with one value of sine: which one does sin^-1 give back? */
const inversePrincipal: Generator<PrincipalParams> = {
  id: 'trig-inv-principal',
  sample: (rng, difficulty) => {
    const fn: Inverse = difficulty > 1 ? rng.pick(INVERSES) : 'sin';
    const degrees = rng.pick(PRINCIPAL[fn].filter((d) => difficulty > 1 || nonNegativeInput(fn, d)));
    // The five nearest zero, so the options stay within about a turn of it.
    const nearest = sameValueAngles(fn, degrees)
      .sort((a, b) => Math.abs(a) - Math.abs(b))
      .slice(0, 5);
    return { fn, degrees, others: rng.sample(nearest, 3), radians: rng.chance(0.5) };
  },
  render: ({ fn, degrees, others, radians }): Slide => {
    const v = inputTex(fn, degrees);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `All four of these angles have ${RATIO_NAME[fn]} equal to $${v}$. Which one is $${INVERSE_TEX[fn]}\\left(${v}\\right)$?`,
        },
      ],
      options: [degrees, ...others]
        .sort((a, b) => a - b)
        .map((d) => ({ id: `${d}`, label: angleTex(d, radians), tex: true })),
      correctId: `${degrees}`,
    };
  },
  solution: ({ fn, degrees, radians }) => [
    { text: SAME_VALUE_REASON[fn] },
    {
      text: `$${INVERSE_TEX[fn]}$ gives exactly one of them: the one in its range, $${rangeTex(fn, radians)}$.`,
    },
    { tex: `${INVERSE_TEX[fn]}\\left(${inputTex(fn, degrees)}\\right) = ${angleTex(degrees, radians)}` },
  ],
};

interface CrossingSliderParams {
  fn: Inverse;
  degrees: number;
  radians: boolean;
  /** Two turns rather than one, so more crossings to choose between. */
  wide: boolean;
}

/** Slider settings: one or two turns centred on zero, where the handle rests. */
function crossingScale({ radians, wide }: CrossingSliderParams) {
  // Each window's untouched midpoint, min plus a whole number of steps, has
  // to come out as a clean 0 in floats, or the readout shows the dust.
  const reach = radians ? (wide ? 6.4 : 3.2) : wide ? 360 : 180;
  return radians
    ? { min: -reach, max: reach, step: 0.05, tolerance: 0.1 }
    : { min: -reach, max: reach, step: 1, tolerance: 3 };
}

const INVERSE_BASE: Record<Inverse, (x: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan };

/** Where the line y = k crosses the graph inside the inverse's range. */
const inverseCrossingSlider: Generator<CrossingSliderParams> = {
  id: 'trig-inv-crossing-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const fn: Inverse = difficulty > 1 ? rng.pick(INVERSES) : 'sin';
      const p = { fn, degrees: rng.pick(PRINCIPAL[fn]), radians: rng.chance(0.5), wide: rng.chance(0.5) };
      const { min, max, tolerance } = crossingScale(p);
      const value = p.degrees * (p.radians ? DEGREE : 1);
      if (Math.abs(value) > 3 * tolerance && value > min + 3 * tolerance && value < max - 3 * tolerance) return p;
    }
  },
  render: (p): Slide => {
    const { fn, degrees, radians } = p;
    const { min, max, step, tolerance } = crossingScale(p);
    const unit = radians ? 1 : DEGREE;
    const k = ratioAt(fn, degrees)!;
    const v = exactTex(k);
    const edges = fn === 'cos' ? [0, 180] : [-90, 90];
    const svg = plotSvg({
      xMin: min,
      xMax: max,
      curves: [{ f: (x) => INVERSE_BASE[fn](x * unit), breaks: fn === 'tan' }],
      horizontals: Math.abs(k) < 1e-9 ? [] : [k],
      verticals: edges.map((d) => ({ x: d * (radians ? DEGREE : 1) })),
      yMin: fn === 'tan' ? -3 : -1.5,
      yMax: fn === 'tan' ? 3 : 1.5,
      label: `The graph of y = ${fn} x, with upright dashed lines at the edges of the range of its inverse`,
    });
    const line = Math.abs(k) < 1e-9 ? 'the level line is the $x$-axis itself' : `the level one is $y = ${v}$`;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `This is $y = ${RATIO_TEX[fn]}(x)$ with $x$ in ${radians ? 'radians' : 'degrees'}. The upright dashed lines mark the range of $${INVERSE_TEX[fn]}$ and ${line}. Slide to $${INVERSE_TEX[fn]}\\left(${v}\\right)$.`,
        },
      ],
      min,
      max,
      step,
      tolerance,
      answer: Number((Math.round((degrees * (radians ? DEGREE : 1)) / step) * step).toFixed(2)),
      readout: radians ? 'x = {v}' : 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(min, max) },
    };
  },
  solution: ({ fn, degrees, radians }) => {
    const v = inputTex(fn, degrees);
    return [
      {
        text: `The line $y = ${v}$ crosses the curve more than once, and every crossing is an angle whose ${RATIO_NAME[fn]} is $${v}$.`,
      },
      {
        text: `$${INVERSE_TEX[fn]}$ takes the one crossing inside its range, $${rangeTex(fn, radians)}$, between the upright dashed lines.`,
      },
      { tex: `${INVERSE_TEX[fn]}\\left(${v}\\right) = ${angleTex(degrees, radians)}` },
      ...(radians ? [{ text: `On the slider that is about $${(degrees * DEGREE).toFixed(2)}$.` }] : []),
    ];
  },
};

/** Ways back into an inverse's range: the angle with the same value that lands inside it. */
const PARTNERS: Record<Inverse, { label: string; of: (t: number) => number }[]> = {
  sin: [
    { label: '180^{\\circ} - \\theta', of: (t) => 180 - t },
    { label: '-180^{\\circ} - \\theta', of: (t) => -180 - t },
    { label: '\\theta - 360^{\\circ}', of: (t) => t - 360 },
    { label: '-\\theta', of: (t) => -t },
  ],
  cos: [
    { label: '-\\theta', of: (t) => -t },
    { label: '360^{\\circ} - \\theta', of: (t) => 360 - t },
    { label: '180^{\\circ} - \\theta', of: (t) => 180 - t },
    { label: '\\theta - 360^{\\circ}', of: (t) => t - 360 },
  ],
  tan: [
    { label: '\\theta - 180^{\\circ}', of: (t) => t - 180 },
    { label: '\\theta + 180^{\\circ}', of: (t) => t + 180 },
    { label: '180^{\\circ} - \\theta', of: (t) => 180 - t },
    { label: '-\\theta', of: (t) => -t },
  ],
};

/** The partner of an angle outside the range, with the working written out in degrees. */
function partnerWorking(fn: Inverse, degrees: number): { label: string; tex: string } {
  const target = principalOf(fn, degrees);
  const partner = PARTNERS[fn].find((q) => q.of(degrees) === target)!;
  const theta = degrees < 0 ? `(${degrees}^{\\circ})` : `${degrees}^{\\circ}`;
  return { label: partner.label, tex: `${partner.label.replace('\\theta', theta)} = ${target}^{\\circ}` };
}

interface InverseTilesParams {
  degrees: number;
  radians: boolean;
  phrasing: number;
}

const SINE_TILE_FIRST = [30, 45, 60, 90];
const SINE_TILE_INSIDE = [-90, -60, -45, -30, ...SINE_TILE_FIRST];
const SINE_TILE_OUTSIDE = [120, 135, 150, 210, 225, 240, 300, 315, 330, -120, -135, -150];

const SINE_TILE_PROMPTS: ((angle: string, v: string) => string)[] = [
  (angle, v) => `$\\sin\\left(${angle}\\right) = ${v}$. Write the statement about $\\sin^{-1}$ that goes with it.`,
  (angle, v) => `Sine takes $${angle}$ to $${v}$. Fill in what $\\sin^{-1}$ gives back.`,
  (angle, v) => `Turn this round: $\\sin\\left(${angle}\\right) = ${v}$. What does $\\sin^{-1}$ say?`,
  (angle, v) => `$${v}$ is the sine of $${angle}$. Complete the line with the inverse sine.`,
];

/** A sine statement turned round into a sin^-1 one; past difficulty 1 the angle may be negative or lie outside the range. */
const inverseSinTiles: Generator<InverseTilesParams> = {
  id: 'trig-inv-sin-tiles',
  sample: (rng, difficulty) => ({
    degrees: rng.pick(difficulty > 1 ? [...SINE_TILE_INSIDE, ...SINE_TILE_OUTSIDE] : SINE_TILE_FIRST),
    radians: rng.chance(0.5),
    phrasing: rng.int(0, SINE_TILE_PROMPTS.length - 1),
  }),
  render: ({ degrees, radians, phrasing }): Slide => {
    const k = ratioAt('sin', degrees)!;
    const v = exactTex(k);
    const principal = principalOf('sin', degrees);
    const answer = [v, angleTex(principal, radians)];
    // The angle as given, the sign lost, the cosine's angle, and the value's
    // sign lost or swapped for the cosine.
    const distractors = [
      angleTex(degrees, radians),
      angleTex(-principal, radians),
      angleTex(90 - principal, radians),
      exactTex(-k),
      exactTex(ratioAt('cos', degrees)!),
    ];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: SINE_TILE_PROMPTS[phrasing](angleTex(degrees, radians), v) }],
      template: '\\sin^{-1}({0}) = {1}',
      bank: sortedBank(answer, [...new Set(distractors)]),
      answer,
    };
  },
  solution: ({ degrees, radians }) => {
    const v = exactTex(ratioAt('sin', degrees)!);
    const principal = principalOf('sin', degrees);
    const steps: SolutionStep[] = [
      { text: '$\\sin^{-1}$ runs sine backwards: it takes the value and gives back an angle.' },
    ];
    if (principal === degrees) {
      steps.push({
        text: `$${angleTex(degrees, radians)}$ is already in its range, $${rangeTex('sin', radians)}$, so it is the angle that comes back.`,
      });
    } else {
      steps.push({
        text: `But it only answers in $${rangeTex('sin', radians)}$, and $${angleTex(degrees, radians)}$ is outside that. The angle inside with the same sine is $${partnerWorking('sin', degrees).label}$, which in degrees is`,
      });
      steps.push({ tex: partnerWorking('sin', degrees).tex });
    }
    steps.push({ tex: `\\sin^{-1}\\left(${v}\\right) = ${angleTex(principal, radians)}` });
    return steps;
  },
};

interface RangeFlowParams {
  fn: Inverse;
  degrees: number;
  radians: boolean;
}

/** Principal values strictly inside a quarter, so the part of the range is never on a boundary. */
const RANGE_FLOW_ANGLES: Record<Inverse, number[]> = {
  sin: [-60, -45, -30, 30, 45, 60],
  cos: [30, 45, 60, 120, 135, 150],
  tan: [-60, -45, -30, 30, 45, 60],
};

const spanLabel = (from: number, to: number, radians: boolean): string =>
  `From $${angleTex(from, radians)}$ to $${angleTex(to, radians)}$`;

const PART_OUTCOMES = [
  'That is below the axis, where sine and tangent are negative and cosine is positive.',
  'That is the first quarter, where all three are positive.',
  'That is the second quarter, where sine is positive and cosine and tangent are negative.',
];

/** Place the answer before finding it: which range, then which part of it the sign points to. */
const inverseRangeFlow: Generator<RangeFlowParams> = {
  id: 'trig-inv-range-flow',
  sample: (rng) => {
    const fn = rng.pick(INVERSES);
    return { fn, degrees: rng.pick(RANGE_FLOW_ANGLES[fn]), radians: rng.chance(0.5) };
  },
  render: ({ fn, degrees, radians }): Slide => {
    const ranges = [spanLabel(-90, 90, radians), spanLabel(0, 180, radians), spanLabel(0, 360, radians)];
    const parts = [spanLabel(-90, 0, radians), spanLabel(0, 90, radians), spanLabel(90, 180, radians)];
    const positive = ratioAt(fn, degrees)! > 0;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Place the answer before finding it: which range does it come from, and which part of that range?',
        },
      ],
      subject: `${INVERSE_TEX[fn]}\\left(${inputTex(fn, degrees)}\\right)`,
      steps: [
        {
          id: 'range',
          ask: `Which range does $${INVERSE_TEX[fn]}$ answer in?`,
          branches: ranges.map((label) => ({ label, to: 'part' })),
        },
        {
          id: 'part',
          ask: `The input is ${positive ? 'positive' : 'negative'}. Which part of that range is the angle in?`,
          branches: parts.map((label, i) => ({ label, outcome: PART_OUTCOMES[i] })),
        },
      ],
      answer: [ranges[fn === 'cos' ? 1 : 0], parts[degrees < 0 ? 0 : degrees < 90 ? 1 : 2]],
    };
  },
  solution: ({ fn, degrees, radians }) => {
    const positive = ratioAt(fn, degrees)! > 0;
    return [
      { text: `$${INVERSE_TEX[fn]}$ answers in $${rangeTex(fn, radians)}$.` },
      {
        text: positive
          ? `A positive input means a positive ${RATIO_NAME[fn]}, which in that range happens in the first quarter.`
          : fn === 'cos'
            ? 'A negative cosine means the point is left of the centre, so the angle is past a quarter turn.'
            : `A negative ${RATIO_NAME[fn]} in that range means the angle is below the axis: a negative angle.`,
      },
      { tex: `${INVERSE_TEX[fn]}\\left(${inputTex(fn, degrees)}\\right) = ${angleTex(degrees, radians)}` },
    ];
  },
};

interface NegativeTreeParams {
  fn: Inverse;
  /** The answer, whose input is negative. */
  degrees: number;
  radians: boolean;
  phrasing: number;
}

const NEGATIVE_INPUT: Record<Inverse, number[]> = {
  sin: [-30, -45, -60, -90],
  cos: [120, 135, 150, 180],
  tan: [-30, -45, -60],
};

const NEGATIVE_TREE_PROMPTS = [
  'Drop the minus sign and put the inverse of that positive value in the top box. Then use it for the angle asked for underneath.',
  'Top box: the inverse of the positive value. Bottom box: the inverse of the negative value, worked out from the top box.',
];

/** A negative input via the positive one: minus it for sin and tan, 180 minus it for cos. */
const inverseNegativeTree: Generator<NegativeTreeParams> = {
  id: 'trig-inv-negative-tree',
  sample: (rng) => {
    const fn = rng.pick(INVERSES);
    return {
      fn,
      degrees: rng.pick(NEGATIVE_INPUT[fn]),
      radians: rng.chance(0.5),
      phrasing: rng.int(0, NEGATIVE_TREE_PROMPTS.length - 1),
    };
  },
  render: ({ fn, degrees, radians, phrasing }): Slide => {
    const reference = fn === 'cos' ? 180 - degrees : -degrees;
    const answer = [angleTex(reference, radians), angleTex(degrees, radians)];
    // Each function's rule used for the other, and the angles a half turn off.
    const slips =
      fn === 'cos'
        ? [-reference, 180 + reference, 360 - reference, 90 + reference]
        : [180 - reference, 360 - reference, 180 + reference, reference - 180, 90 - reference];
    const distractors = [...new Set(slips.map((d) => angleTex(d, radians)))]
      .filter((token) => !answer.includes(token))
      .slice(0, 3);
    return {
      kind: 'tree',
      prompt: [{ kind: 'prose', text: NEGATIVE_TREE_PROMPTS[phrasing] }],
      expression: `${INVERSE_TEX[fn]}\\left(${inputTex(fn, degrees)}\\right)`,
      nodes: [
        { id: 'positive', from: [] },
        { id: 'negative', from: ['positive'] },
      ],
      bank: [...answer, ...distractors].sort(),
      answer,
    };
  },
  solution: ({ fn, degrees, radians }) => {
    const reference = fn === 'cos' ? 180 - degrees : -degrees;
    const positive = inputTex(fn, reference);
    return [
      { tex: `${INVERSE_TEX[fn]}\\left(${positive}\\right) = ${angleTex(reference, radians)}` },
      {
        text:
          fn === 'cos'
            ? `A negative cosine is left of the centre, as far past a quarter turn as the positive one falls short of it, so $\\cos^{-1}(-x) = ${radians ? '\\pi' : '180^{\\circ}'} - \\cos^{-1}(x)$.`
            : `A negative ${RATIO_NAME[fn]} is the same size of angle below the axis, so $${INVERSE_TEX[fn]}(-x) = -${INVERSE_TEX[fn]}(x)$.`,
      },
      {
        tex: `${INVERSE_TEX[fn]}\\left(${inputTex(fn, degrees)}\\right) = ${angleTex(degrees, radians)}`,
      },
    ];
  },
};

/** The inverses as curves, with no value off their domain so the pen lifts there. */
const INVERSE_CURVE: Record<Inverse, (x: number) => number> = {
  sin: (x) => (Math.abs(x) > 1 ? NaN : Math.asin(x)),
  cos: (x) => (Math.abs(x) > 1 ? NaN : Math.acos(x)),
  tan: Math.atan,
};

interface InverseGraphParams {
  fn: Inverse;
  a: number;
  /** A wider stretch of the x-axis. Both widths put a sample exactly on x = -1 and x = 1. */
  wide: boolean;
  phrasing: number;
}

const INVERSE_FEATURES: Record<Inverse, string> = {
  sin: 'It exists only from $x = -1$ to $x = 1$, passes through the origin, and ends furthest from the axis at both ends.',
  cos: 'It exists only from $x = -1$ to $x = 1$, starts furthest from the axis at $x = -1$ and comes down to zero at $x = 1$.',
  tan: 'It runs right across the picture, since every number has an inverse tangent, passes through the origin, and levels off at both ends.',
};

/** Which inverse is this? Read the domain and the shape off the picture. */
const inverseGraphMatch: Generator<InverseGraphParams> = {
  id: 'trig-inv-graph-match',
  sample: (rng, difficulty) => ({
    fn: rng.pick(INVERSES),
    a: difficulty > 1 ? nonZeroInt(rng, -3, 3) : rng.int(1, 3),
    wide: rng.chance(0.5),
    phrasing: rng.int(0, 1),
  }),
  render: ({ fn, a, wide, phrasing }): Slide => {
    const w = wide ? 2.5 : 2;
    const reach = 3.6 * Math.abs(a);
    const svg = plotSvg({
      xMin: -w,
      xMax: w,
      curves: [{ f: (x) => a * INVERSE_CURVE[fn](x), breaks: true }],
      verticals: [{ x: 0, dashed: false }],
      marks: fn === 'tan' ? [] : [-1, 1].map((x) => ({ x, y: a * INVERSE_CURVE[fn](x) })),
      yMin: -reach,
      yMax: reach,
      label: 'The graph of a function, with the y-axis drawn as a solid upright line',
    });
    const c = coefficientTex(a);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text:
            phrasing === 0
              ? `The solid upright line is the $y$-axis, and the $x$-axis runs from $${-w}$ to $${w}$. Which equation does this graph show?`
              : `Here is a graph for $x$ from $${-w}$ to $${w}$, with the $y$-axis drawn solid. Which function is it?`,
        },
        { kind: 'diagram', svg },
      ],
      options: [
        ...INVERSES.map((g) => ({ id: g, label: `y = ${c}${INVERSE_TEX[g]}(x)`, tex: true })),
        { id: 'recip', label: `y = \\frac{${a}}{\\sin(x)}`, tex: true },
      ],
      correctId: fn,
    };
  },
  solution: ({ fn, a }) => [
    { text: INVERSE_FEATURES[fn] },
    {
      text:
        a === 1
          ? 'Nothing multiplies it, so the heights are those of the function itself.'
          : `Multiplying by $${a}$ makes every height $${a}$ times as large${a < 0 ? ', which also turns the curve upside down' : ''}.`,
    },
    {
      text: `So it is $y = ${coefficientTex(a)}${INVERSE_TEX[fn]}(x)$. The last option is one over sine, a different function: $\\sin^{-1}(x)$ is never $\\frac{1}{\\sin(x)}$.`,
    },
  ],
};

interface DomainRangeParams {
  fn: 'sin' | 'cos';
  a: number;
  b: number;
  radians: boolean;
  /** Which half is asked: the x that go in, or the y that come out. */
  part: 'domain' | 'range';
  phrasing: number;
}

/**
 * The domain or the range of y = a sin^-1(x / b), or the same with cos^-1.
 * One half per question: both together are four blanks, which no phone fits
 * on a row, and the line broke inside the second inequality wherever it fell.
 * The bank carries the other half's values, so mixing the two up still costs.
 */
const inverseDomainRange: Generator<DomainRangeParams> = {
  id: 'trig-inv-domain-range',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    a: rng.int(1, 6),
    b: difficulty > 1 ? rng.int(1, 4) : 1,
    radians: rng.chance(0.5),
    part: rng.pick(['domain', 'range'] as const),
    phrasing: rng.int(0, 1),
  }),
  render: ({ fn, a, b, radians, part, phrasing }): Slide => {
    const inner = b === 1 ? 'x' : `\\frac{x}{${b}}`;
    const curve = `${coefficientTex(a)}${INVERSE_TEX[fn]}\\left(${inner}\\right)`;
    const [lo, hi] = fn === 'sin' ? [-90 * a, 90 * a] : [0, 180 * a];
    const unit = radians ? 'radians' : 'degrees';
    const domain = [`${-b}`, `${b}`];
    const range = [angleTex(lo, radians), angleTex(hi, radians)];
    if (part === 'domain') {
      // b forgotten, and the range given instead.
      const distractors = [...(b === 1 ? ['0'] : ['-1', '1']), ...range];
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text:
              phrasing === 0
                ? `Give the domain of $y = ${curve}$: every $x$ it accepts.`
                : `Which $x$ can go into $y = ${curve}$?`,
          },
        ],
        template: '{0} \\le x \\le {1}',
        bank: sortedBank(domain, [...new Set(distractors)]),
        answer: domain,
      };
    }
    // The other function's range, a forgotten, and the domain given instead.
    const distractors = [
      ...(fn === 'sin' ? [angleTex(-180 * a, radians), angleTex(180 * a, radians)] : [angleTex(-90 * a, radians), angleTex(90 * a, radians)]),
      ...(a > 1 ? [angleTex(fn === 'sin' ? 90 : 180, radians)] : []),
      ...domain,
    ];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text:
            phrasing === 0
              ? `Give the range of $y = ${curve}$, in ${unit}.`
              : `Which $y$ can come out of $y = ${curve}$? Give $y$ in ${unit}.`,
        },
      ],
      template: '{0} \\le y \\le {1}',
      bank: sortedBank(range, [...new Set(distractors)].filter((t) => !range.includes(t))),
      answer: range,
    };
  },
  solution: ({ fn, a, b, radians, part }) => {
    if (part === 'domain') {
      return [
        {
          text:
            b === 1
              ? `$${INVERSE_TEX[fn]}$ only accepts inputs from $-1$ to $1$, since ${RATIO_NAME[fn]} never leaves that interval. Multiplying the output changes the heights, not the inputs.`
              : `The input to $${INVERSE_TEX[fn]}$ is $\\frac{x}{${b}}$, which has to lie from $-1$ to $1$, so $x$ runs from $${-b}$ to $${b}$.`,
        },
        { tex: `${-b} \\le x \\le ${b}` },
      ];
    }
    const [baseLo, baseHi] = fn === 'sin' ? [-90, 90] : [0, 180];
    return [
      {
        text: `$${INVERSE_TEX[fn]}$ answers from $${angleTex(baseLo, radians)}$ to $${angleTex(baseHi, radians)}$${a > 1 ? `, and multiplying by $${a}$ stretches that to $${angleTex(baseLo * a, radians)}$ to $${angleTex(baseHi * a, radians)}$` : ''}.${b > 1 ? ` Dividing $x$ by $${b}$ widens the graph sideways but leaves the heights alone.` : ''}`,
      },
      { tex: `${angleTex(baseLo * a, radians)} \\le y \\le ${angleTex(baseHi * a, radians)}` },
    ];
  },
};

interface InverseSliderParams {
  fn: Inverse;
  target: 'value' | 'top' | 'bottom';
  /** For a value: the principal value, in degrees, at the input marked. */
  degrees: number;
  phrasing: number;
}

/**
 * Each inverse's picture. x = -1 and x = 1 fall on samples, every edge is a
 * whole number of slider steps, and the untouched midpoint is a clean number.
 */
const INVERSE_WINDOW: Record<Inverse, { xMin: number; xMax: number; yMin: number; yMax: number }> = {
  sin: { xMin: -2, xMax: 2, yMin: -2, yMax: 2 },
  cos: { xMin: -2, xMax: 2, yMin: -1.4, yMax: 3.6 },
  tan: { xMin: -4, xMax: 4, yMin: -2, yMax: 2 },
};

const inverseSliderValue = ({ fn, target, degrees }: InverseSliderParams): number =>
  target === 'value' ? degrees * DEGREE : target === 'bottom' ? -Math.PI / 2 : fn === 'cos' ? Math.PI : Math.PI / 2;

/** Read a height off the graph of an inverse: a value at a marked input, or the top or bottom of its range. */
const inverseGraphSlider: Generator<InverseSliderParams> = {
  id: 'trig-inv-graph-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const fn: Inverse = rng.pick(difficulty > 1 ? INVERSES : (['sin', 'cos'] as const));
      const targets: InverseSliderParams['target'][] =
        fn === 'sin' ? ['value'] : fn === 'cos' ? ['value', 'value', 'top'] : ['value', 'value', 'top', 'bottom'];
      const target = rng.pick(targets);
      const p: InverseSliderParams = {
        fn,
        target,
        degrees: target === 'value' ? rng.pick(PRINCIPAL[fn]) : 0,
        phrasing: rng.int(0, 1),
      };
      const { yMin, yMax } = INVERSE_WINDOW[fn];
      const value = inverseSliderValue(p);
      const tolerance = 0.1;
      if (
        Math.abs(value - (yMin + yMax) / 2) > 3 * tolerance &&
        value >= yMin + 3 * tolerance &&
        value <= yMax - 3 * tolerance
      ) {
        return p;
      }
    }
  },
  render: (p): Slide => {
    const { fn, target, degrees, phrasing } = p;
    const w = INVERSE_WINDOW[fn];
    const input = target === 'value' ? ratioAt(fn, degrees)! : 0;
    const marked = target === 'value' && Math.abs(input) > 1e-9;
    const svg = plotSvg({
      ...w,
      curves: [{ f: INVERSE_CURVE[fn], breaks: true }],
      verticals: [{ x: 0, dashed: false }, ...(marked ? [{ x: input }] : [])],
      label: `The graph of y equals inverse ${RATIO_NAME[fn]} of x, with the y-axis drawn solid`,
    });
    const curve = `$y = ${INVERSE_TEX[fn]}(x)$`;
    let text: string;
    if (target === 'value') {
      const v = exactTex(input);
      const where = marked
        ? `where the dashed line $x = ${v}$ meets the curve`
        : 'where the curve crosses the $y$-axis';
      text =
        phrasing === 0
          ? `This is ${curve}, with $y$ in radians. Slide to the height ${where}.`
          : `Read $${INVERSE_TEX[fn]}\\left(${v}\\right)$ off the graph of ${curve}: slide to the height ${where}. Here $y$ is in radians.`;
    } else if (fn === 'cos') {
      text =
        phrasing === 0
          ? `This is ${curve}, with $y$ in radians. Slide to the greatest value it takes.`
          : `Slide to the top of the range of ${curve}, with $y$ in radians.`;
    } else {
      const way = target === 'top' ? 'grows' : 'becomes more and more negative';
      text =
        phrasing === 0
          ? `This is ${curve}, with $y$ in radians. As $x$ ${way}, the curve levels off towards a height it never reaches. Slide to that height.`
          : `As $x$ ${way}, ${curve} gets ever closer to one height. Slide to it, with $y$ in radians.`;
    }
    return {
      kind: 'slider',
      prompt: [{ kind: 'prose', text }],
      min: w.yMin,
      max: w.yMax,
      step: 0.05,
      tolerance: 0.1,
      answer: Number((Math.round(inverseSliderValue(p) / 0.05) * 0.05).toFixed(2)),
      readout: 'y = {v}',
      figure: { svg, ...markerWindow(w.yMin, w.yMax, 'y'), axis: 'y' },
    };
  },
  solution: (p) => {
    const { fn, target, degrees } = p;
    if (target === 'value') {
      const v = inputTex(fn, degrees);
      return [
        { text: `The height of the curve above $x = ${v}$ is $${INVERSE_TEX[fn]}\\left(${v}\\right)$ itself.` },
        { tex: `${INVERSE_TEX[fn]}\\left(${v}\\right) = ${angleTex(degrees, true)}` },
        { text: `That is about $${(degrees * DEGREE).toFixed(2)}$ on the vertical axis.` },
      ];
    }
    if (fn === 'cos') {
      return [
        { text: '$\\cos^{-1}$ answers from $0$ to $\\pi$, and it reaches the top at $x = -1$, since $\\cos(\\pi) = -1$.' },
        { tex: 'y = \\pi \\approx 3.14' },
      ];
    }
    return [
      {
        text: `$\\tan^{-1}$ answers strictly between $-\\frac{\\pi}{2}$ and $\\frac{\\pi}{2}$: tangent only reaches every value as the angle nears a quarter turn either way, so the curve has horizontal asymptotes there.`,
      },
      { tex: `y = ${target === 'top' ? '' : '-'}\\frac{\\pi}{2} \\approx ${target === 'top' ? '' : '-'}1.57` },
    ];
  },
};

/** Inputs no sine or cosine ever reaches. */
const OUTSIDE_INPUTS: { tex: string; value: number }[] = [
  { tex: '2', value: 2 },
  { tex: '\\frac{3}{2}', value: 1.5 },
  { tex: '\\frac{5}{4}', value: 1.25 },
  { tex: '\\sqrt{3}', value: Math.sqrt(3) },
  { tex: '\\frac{4}{3}', value: 4 / 3 },
  { tex: '3', value: 3 },
  { tex: '-2', value: -2 },
  { tex: '-\\frac{3}{2}', value: -1.5 },
  { tex: '-\\sqrt{2}', value: -Math.SQRT2 },
  { tex: '-\\frac{5}{3}', value: -5 / 3 },
];

/** Inputs every inverse accepts. */
const INSIDE_INPUTS = ['0', '1', '-1', '\\frac{1}{2}', '-\\frac{1}{2}', '\\frac{\\sqrt{3}}{2}', '-\\frac{\\sqrt{2}}{2}', '\\frac{3}{5}', '-\\frac{4}{5}'];

/** Inputs beyond 1 that only tan^-1 accepts: the trap. */
const TAN_ONLY_INPUTS = ['2', '-3', '10', '\\sqrt{3}', '\\frac{5}{2}', '-5', '100'];

const DEFINED_OPTIONS: { fn: Inverse; tex: string }[] = [
  ...(['sin', 'cos'] as const).flatMap((fn) => INSIDE_INPUTS.map((tex) => ({ fn, tex }))),
  ...INSIDE_INPUTS.map((tex) => ({ fn: 'tan' as const, tex })),
];
const TAN_TRAPS = TAN_ONLY_INPUTS.map((tex) => ({ fn: 'tan' as const, tex }));

interface UndefinedParams {
  badFn: 'sin' | 'cos';
  /** Index into `OUTSIDE_INPUTS`. */
  bad: number;
  /** Indices into `DEFINED_OPTIONS`, then optionally one into `TAN_TRAPS`. */
  good: number[];
  trap: number | null;
  phrasing: number;
}

const inverseOptionTex = (fn: Inverse, tex: string): string => `${INVERSE_TEX[fn]}\\left(${tex}\\right)`;

/** Which of these has no value? sin^-1 and cos^-1 only accept inputs from -1 to 1. */
const inverseUndefined: Generator<UndefinedParams> = {
  id: 'trig-inv-undefined',
  sample: (rng, difficulty) => {
    // Until tan^-1 has been graphed, the options stay inside what every inverse accepts.
    const trap = difficulty > 1 ? rng.int(0, TAN_TRAPS.length - 1) : null;
    const good = rng.sample(
      DEFINED_OPTIONS.map((_, i) => i),
      trap === null ? 3 : 2,
    );
    return {
      badFn: rng.pick(['sin', 'cos'] as const),
      bad: rng.int(0, difficulty > 1 ? OUTSIDE_INPUTS.length - 1 : 5),
      good,
      trap,
      phrasing: rng.int(0, 1),
    };
  },
  render: ({ badFn, bad, good, trap, phrasing }): Slide => {
    const wrong = inverseOptionTex(badFn, OUTSIDE_INPUTS[bad].tex);
    const others = [...good.map((i) => DEFINED_OPTIONS[i]), ...(trap === null ? [] : [TAN_TRAPS[trap]])].map((o) =>
      inverseOptionTex(o.fn, o.tex),
    );
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text:
            phrasing === 0
              ? 'Which of these has no value?'
              : 'One of these asks for an angle that does not exist. Which one?',
        },
      ],
      options: [wrong, ...others].sort().map((label) => ({ id: label, label, tex: true })),
      correctId: wrong,
    };
  },
  solution: ({ badFn, bad, trap }) => {
    const { tex, value } = OUTSIDE_INPUTS[bad];
    const steps: SolutionStep[] = [
      {
        text: 'Sine and cosine only ever take values from $-1$ to $1$, so $\\sin^{-1}$ and $\\cos^{-1}$ only accept inputs in that interval.',
      },
      {
        text: `$${tex}$ is ${value > 0 ? 'more than $1$' : 'less than $-1$'}, so no angle has that ${RATIO_NAME[badFn]}, and $${inverseOptionTex(badFn, tex)}$ has no value.`,
      },
    ];
    if (trap !== null) {
      steps.push({
        text: `Tangent takes every value, so $${inverseOptionTex('tan', TAN_TRAPS[trap].tex)}$ is a perfectly good angle.`,
      });
    }
    return steps;
  },
};

interface UndoParams {
  fn: Inverse;
  /** The angle inside, in degrees. */
  degrees: number;
  radians: boolean;
  phrasing: number;
}

/** Angles an inverse is applied to, beyond its range as well as inside it. */
function undoPool(fn: Inverse, step: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let d = Math.ceil(from / step) * step; d <= to; d += step) {
    // tan has no value at a quarter turn. At 270 degrees sin^-1, and at 180
    // degrees tan^-1, could come back by two routes, which would make the
    // flow's answer ambiguous.
    if (fn === 'tan' && ((d % 180) + 180) % 180 === 90) continue;
    if ((fn === 'sin' && d === 270) || (fn === 'tan' && d === 180)) continue;
    out.push(d);
  }
  return out;
}

/** Where the undo questions draw from, per difficulty. */
function undoAngle(rng: Rng, fn: Inverse, difficulty: number, step: number): number {
  if (difficulty === 1 && fn === 'sin') return rng.pick(undoPool(fn, step, 5, 175));
  return rng.pick(undoPool(fn, step, -175, fn === 'tan' ? 265 : 355));
}

const insideTex = (fn: Inverse, degrees: number, radians: boolean): string =>
  `${INVERSE_TEX[fn]}\\left(${RATIO_TEX[fn]}\\left(${angleTex(degrees, radians)}\\right)\\right)`;

/** sin^-1(sin theta) is theta only inside the range; outside it, the angle in range with the same sine. */
const inverseUndo: Generator<UndoParams> = {
  id: 'trig-inv-undo',
  sample: (rng, difficulty) => {
    const fn: Inverse = difficulty > 1 ? rng.pick(INVERSES) : 'sin';
    const radians = difficulty > 1 && rng.chance(0.5);
    return { fn, degrees: undoAngle(rng, fn, difficulty, radians ? 15 : 5), radians, phrasing: rng.int(0, 1) };
  },
  render: ({ fn, degrees, radians, phrasing }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text:
          phrasing === 0
            ? `Find the exact value, in ${radians ? 'radians' : 'degrees'}.`
            : `Careful which angle comes back. Give it in ${radians ? 'radians' : 'degrees'}.`,
      },
    ],
    lead: `${insideTex(fn, degrees, radians)} =`,
    keypad: radians ? PI_KEYS : NUMBER_KEYS,
    answer: angleAnswer(principalOf(fn, degrees), radians),
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ fn, degrees, radians }) =>
    angleOptions(
      principalOf(fn, degrees),
      [degrees, -degrees, 180 - degrees, degrees - 360, 180 - principalOf(fn, degrees)],
      radians,
    ),
  solution: ({ fn, degrees, radians }) => {
    const principal = principalOf(fn, degrees);
    const angle = angleTex(degrees, radians);
    if (principal === degrees) {
      return [
        {
          text: `$${angle}$ is inside the range of $${INVERSE_TEX[fn]}$, $${rangeTex(fn, radians)}$, so the inverse simply undoes the ${RATIO_NAME[fn]}.`,
        },
        { tex: `${insideTex(fn, degrees, radians)} = ${angle}` },
      ];
    }
    return [
      {
        text: `$${angle}$ is outside the range of $${INVERSE_TEX[fn]}$, $${rangeTex(fn, radians)}$, so the answer is not $${angle}$ itself but the angle inside the range with the same ${RATIO_NAME[fn]}.`,
      },
      { text: `With $\\theta = ${degrees}^{\\circ}$ that is $${partnerWorking(fn, degrees).label}$:` },
      { tex: partnerWorking(fn, degrees).tex },
      { tex: `${insideTex(fn, degrees, radians)} = ${angleTex(principal, radians)}` },
    ];
  },
};

const INSIDE_RANGE = 'Yes, it is inside';
const OUTSIDE_RANGE = 'No, it is outside';

interface UndoFlowParams {
  fn: Inverse;
  degrees: number;
}

/** Inside the range or not, and if not, which partner angle lands in it. */
const inverseUndoFlow: Generator<UndoFlowParams> = {
  id: 'trig-inv-undo-flow',
  sample: (rng, difficulty) => {
    const fn: Inverse = difficulty > 1 ? rng.pick(INVERSES) : 'sin';
    return { fn, degrees: rng.pick(undoPool(fn, 5, -175, fn === 'tan' ? 265 : 355)) };
  },
  render: ({ fn, degrees }): Slide => {
    const inside = principalOf(fn, degrees) === degrees;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Does the inverse simply undo the function here? Check the range first.',
        },
      ],
      subject: insideTex(fn, degrees, false),
      steps: [
        {
          id: 'inside',
          ask: `Is $${degrees}^{\\circ}$ inside the range of $${INVERSE_TEX[fn]}$, $${rangeTex(fn, false)}$?`,
          branches: [
            { label: INSIDE_RANGE, outcome: 'Then the two cancel, and the answer is the angle you started with.' },
            { label: OUTSIDE_RANGE, to: 'partner' },
          ],
        },
        {
          id: 'partner',
          ask: `Which angle has the same ${RATIO_NAME[fn]} as $\\theta = ${degrees}^{\\circ}$ and lies inside the range?`,
          branches: PARTNERS[fn].map((q) => ({ label: `$${q.label}$`, outcome: `That comes to $${q.of(degrees)}^{\\circ}$.` })),
        },
      ],
      answer: inside ? [INSIDE_RANGE] : [OUTSIDE_RANGE, `$${partnerWorking(fn, degrees).label}$`],
    };
  },
  solution: ({ fn, degrees }) => {
    const principal = principalOf(fn, degrees);
    if (principal === degrees) {
      return [
        { text: `$${degrees}^{\\circ}$ is inside $${rangeTex(fn, false)}$, so nothing needs moving.` },
        { tex: `${insideTex(fn, degrees, false)} = ${degrees}^{\\circ}` },
      ];
    }
    return [
      { text: `$${degrees}^{\\circ}$ is outside $${rangeTex(fn, false)}$. ${SAME_VALUE_REASON[fn]}` },
      { text: `The one inside the range is $${partnerWorking(fn, degrees).label}$:` },
      { tex: partnerWorking(fn, degrees).tex },
      { tex: `${insideTex(fn, degrees, false)} = ${principal}^{\\circ}` },
    ];
  },
};

interface TriangleParams {
  /** Which row of `IDENTITY_TRIPLES`; the first five only. */
  index: number;
  swap: boolean;
  /** Index into `COMPOSE_PAIRS`. */
  pair: number;
  /** A negative input, which moves the angle out of the first quarter. */
  negative: boolean;
  phrasing: number;
}

/** [outer, inner]: the function taken of an inverse of another. */
const COMPOSE_PAIRS: [Inverse, Inverse][] = [
  ['cos', 'sin'],
  ['tan', 'sin'],
  ['sin', 'cos'],
  ['tan', 'cos'],
  ['sin', 'tan'],
  ['cos', 'tan'],
];

/**
 * The right-angled triangle behind theta = inner^-1(r), and sin, cos and tan
 * of theta as signed fractions. A negative sine or tangent puts theta below
 * the axis, where cosine is still positive; a negative cosine puts it past a
 * quarter turn, where sine is still positive.
 */
function composeRatios(p: TriangleParams) {
  const [a, b, hyp] = IDENTITY_TRIPLES[p.index];
  const [opp, adj] = p.swap ? [b, a] : [a, b];
  const inner = COMPOSE_PAIRS[p.pair][1];
  const sy = p.negative && inner !== 'cos' ? -1 : 1;
  const sx = p.negative && inner === 'cos' ? -1 : 1;
  const ratio: Record<Inverse, [number, number]> = {
    sin: [sy * opp, hyp],
    cos: [sx * adj, hyp],
    tan: [sy * opp, sx * adj],
  };
  return { opp, adj, hyp, ratio };
}

function sampleTriangle(rng: Rng, difficulty: number): TriangleParams {
  return {
    index: rng.int(0, 4),
    swap: rng.chance(0.5),
    pair: rng.int(0, COMPOSE_PAIRS.length - 1),
    negative: difficulty > 1 && rng.chance(0.5),
    phrasing: rng.int(0, 1),
  };
}

/** The part of the question inside the outer function. */
function composeInnerTex(p: TriangleParams): string {
  const { ratio } = composeRatios(p);
  const inner = COMPOSE_PAIRS[p.pair][1];
  return `${INVERSE_TEX[inner]}\\left(${signedFracTex(...ratio[inner])}\\right)`;
}

/** The triangle working shared by the typed and the tree forms. */
function triangleSolution(p: TriangleParams): SolutionStep[] {
  const { opp, adj, hyp, ratio } = composeRatios(p);
  const [outer, inner] = COMPOSE_PAIRS[p.pair];
  const given =
    inner === 'sin'
      ? `opposite side $${opp}$ and hypotenuse $${hyp}$`
      : inner === 'cos'
        ? `adjacent side $${adj}$ and hypotenuse $${hyp}$`
        : `opposite side $${opp}$ and adjacent side $${adj}$`;
  const third =
    inner === 'sin'
      ? `\\sqrt{${hyp}^2 - ${opp}^2} = ${adj}`
      : inner === 'cos'
        ? `\\sqrt{${hyp}^2 - ${adj}^2} = ${opp}`
        : `\\sqrt{${opp}^2 + ${adj}^2} = ${hyp}`;
  const missing = inner === 'sin' ? 'adjacent side' : inner === 'cos' ? 'opposite side' : 'hypotenuse';
  const steps: SolutionStep[] = [
    {
      text: `Let $\\theta = ${composeInnerTex(p)}$. Ignoring the sign for now, draw a right-angled triangle with ${given}. Pythagoras gives the ${missing}:`,
    },
    { tex: third },
  ];
  if (p.negative) {
    steps.push({
      text:
        inner === 'cos'
          ? 'The cosine is negative, so $\\theta$ is past a quarter turn: sine is positive there, and tangent negative.'
          : `The ${RATIO_NAME[inner]} is negative, so $\\theta$ is below the axis: cosine is positive there, and sine and tangent negative.`,
    });
  }
  steps.push({
    tex: `${RATIO_TEX[outer]}\\left(${composeInnerTex(p)}\\right) = ${signedFracTex(...ratio[outer])}`,
  });
  return steps;
}

/** cos(sin^-1(3/5)) = 4/5: a function of an inverse of another, from a right-angled triangle. */
const inverseTriangle: Generator<TriangleParams> = {
  id: 'trig-inv-triangle',
  sample: sampleTriangle,
  render: (p): Slide => {
    const { ratio } = composeRatios(p);
    const outer = COMPOSE_PAIRS[p.pair][0];
    const inside = composeInnerTex(p);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text:
            p.phrasing === 0
              ? 'Find the exact value, as a fraction.'
              : `Let $\\theta = ${inside}$. Find $${RATIO_TEX[outer]}(\\theta)$ exactly, as a fraction.`,
        },
      ],
      lead: `${RATIO_TEX[outer]}\\left(${inside}\\right) =`,
      keypad: NUMBER_KEYS,
      answer: fracAnswer(ratio[outer]),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const { ratio } = composeRatios(p);
    const [outer, inner] = COMPOSE_PAIRS[p.pair];
    const [n, d] = ratio[outer];
    const option = (top: number, bottom: number) => ({ tex: signedFracTex(top, bottom), answer: `(${top})/(${bottom})` });
    // Upside down, the sign lost, and the input handed back as if the two cancelled.
    return options(option(n, d), option(d, n), option(-n, d), option(...ratio[inner]));
  },
  solution: triangleSolution,
};

/** The same, one step at a time: the missing side, then the ratio. */
const inverseSideTree: Generator<TriangleParams> = {
  id: 'trig-inv-side-tree',
  sample: sampleTriangle,
  render: (p): Slide => {
    const { opp, adj, hyp, ratio } = composeRatios(p);
    const [outer, inner] = COMPOSE_PAIRS[p.pair];
    const missing = inner === 'sin' ? adj : inner === 'cos' ? opp : hyp;
    const given = inner === 'sin' ? [opp, hyp] : inner === 'cos' ? [adj, hyp] : [opp, adj];
    const [n, d] = ratio[outer];
    const answer = [`${missing}`, signedFracTex(n, d)];
    // The sides already known, the ratio upside down, and its sign flipped.
    const distractors = [...given.map(String), signedFracTex(d, n), signedFracTex(-n, d)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text:
            p.phrasing === 0
              ? 'Top box: the missing side of the right-angled triangle for this angle. Bottom box: the value asked for.'
              : 'Draw the triangle the inner inverse describes. Put its third side in the top box, then the exact value underneath.',
        },
      ],
      expression: `${RATIO_TEX[outer]}\\left(${composeInnerTex(p)}\\right)`,
      nodes: [
        { id: 'side', from: [] },
        { id: 'value', from: ['side'] },
      ],
      bank: [...answer, ...new Set(distractors.filter((t) => !answer.includes(t)))].sort(),
      answer,
    };
  },
  solution: triangleSolution,
};

/** Inputs to tan x = k, in tenths, since tangent reaches past 1. */
const TAN_TENTHS = [2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 20, 25, 30, 40, 50];

/** What a calculator gives for the inverse, in tenths of a degree. */
function principalTenths(fn: Inverse, tenths: number): number {
  const x = tenths / 10;
  const angle = fn === 'sin' ? Math.asin(x) : fn === 'cos' ? Math.acos(x) : Math.atan(x);
  return Math.round((angle * 1800) / Math.PI);
}

/** Tenths of a degree brought into 0 <= x < 360. */
const intoTurn = (tenths: number): number => ((tenths % 3600) + 3600) % 3600;

/** Both solutions of fn(x) = k with 0 <= x < 360, in tenths of a degree, smallest first. */
function generalTenths(fn: Inverse, alpha: number): number[] {
  const both = fn === 'sin' ? [alpha, 1800 - alpha] : fn === 'cos' ? [alpha, 3600 - alpha] : [alpha, alpha + 1800];
  return both.map(intoTurn).sort((a, b) => a - b);
}

const tenthsTex = (tenths: number): string => (tenths / 10).toFixed(1);

/** The second-solution rule for each function, as the learner reads it. */
const SECOND_RULE: Record<Inverse, string> = {
  sin: 'Sine is symmetric about $90^{\\circ}$, so if $\\alpha$ is a solution, so is $180^{\\circ} - \\alpha$.',
  cos: 'Cosine is symmetric about $0^{\\circ}$, so if $\\alpha$ is a solution, so is $-\\alpha$, which is $360^{\\circ} - \\alpha$ once a turn is added.',
  tan: 'Tangent repeats every $180^{\\circ}$, so if $\\alpha$ is a solution, so is $\\alpha + 180^{\\circ}$.',
};

interface GeneralParams {
  fn: Inverse;
  /** k in tenths. */
  k: number;
}

/**
 * Draws for the tiles and the flow. At difficulty 1 the tiles keep to sine and
 * cosine, whose rules are taught first; a negative cosine is fine there, since
 * its calculator angle is still inside the interval.
 */
function sampleGeneral(fns: Inverse[]) {
  return (rng: Rng, difficulty: number): GeneralParams => {
    const fn = rng.pick(difficulty > 1 ? INVERSES : fns);
    const size = fn === 'tan' ? rng.pick(TAN_TENTHS) : rng.int(1, 9);
    const negative = difficulty > 1 ? rng.chance(0.5) : fn === 'cos' && fns.length < 3 && rng.chance(0.5);
    return { fn, k: negative ? -size : size };
  };
}

const kTex = (tenths: number): string => `${tenths / 10}`;

/** The worked solution shared by the tiles and the flow. */
function generalSolution({ fn, k }: GeneralParams): SolutionStep[] {
  const alpha = principalTenths(fn, k);
  const steps: SolutionStep[] = [
    { tex: `\\alpha = ${INVERSE_TEX[fn]}(${kTex(k)}) = ${tenthsTex(alpha)}^{\\circ}` },
    { text: SECOND_RULE[fn] },
  ];
  if (alpha < 0) {
    steps.push({
      text: `$${tenthsTex(alpha)}^{\\circ}$ itself is negative, outside the interval, so add $360^{\\circ}$ to it: $${tenthsTex(alpha + 3600)}^{\\circ}$ has the same ${RATIO_NAME[fn]}.`,
    });
  }
  const [x1, x2] = generalTenths(fn, alpha);
  steps.push({ tex: `x = ${tenthsTex(x1)}^{\\circ} \\quad \\text{or} \\quad x = ${tenthsTex(x2)}^{\\circ}` });
  return steps;
}

/** Both solutions in a turn, from the one angle a calculator gives. */
const inverseGeneralTiles: Generator<GeneralParams> = {
  id: 'trig-inv-general-tiles',
  sample: sampleGeneral(['sin', 'cos']),
  render: ({ fn, k }): Slide => {
    const alpha = principalTenths(fn, k);
    const answer = generalTenths(fn, alpha).map(tenthsTex);
    // The calculator's angle as it stands, the minus sign dropped, and the
    // other functions' rules.
    const slips = [
      tenthsTex(alpha),
      tenthsTex(Math.abs(alpha)),
      ...[1800 - alpha, 3600 - alpha, alpha + 1800].map((t) => tenthsTex(intoTurn(t))),
    ];
    const distractors = [...new Set(slips)].filter((t) => !answer.includes(t)).slice(0, 3);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `A calculator gives $${INVERSE_TEX[fn]}(${kTex(k)}) = ${tenthsTex(alpha)}^{\\circ}$, to one decimal place. Solve $${RATIO_TEX[fn]}(x) = ${kTex(k)}$ for $0^{\\circ} \\le x < 360^{\\circ}$.`,
        },
      ],
      template: 'x = {0}^{\\circ} \\; \\text{or} \\; {1}^{\\circ}',
      bank: sortedBank(answer, distractors),
      answer,
      unordered: true,
    };
  },
  solution: generalSolution,
};

const KEEP_IT = 'Yes, keep it as one solution';
const MOVE_IT = 'No, it is negative';
const ADD_TURN = 'Add $360^{\\circ}$';
const DROP_SIGN = 'Take off the minus sign';
const RULE_LABEL: Record<Inverse, string> = {
  sin: '$180^{\\circ} - \\alpha$',
  cos: '$360^{\\circ} - \\alpha$',
  tan: '$\\alpha + 180^{\\circ}$',
};
const RULE_OF: Record<Inverse, (alpha: number) => number> = {
  sin: (alpha) => 1800 - alpha,
  cos: (alpha) => 3600 - alpha,
  tan: (alpha) => alpha + 1800,
};

/** From the calculator's angle to both solutions: keep it or move it, then which rule finds the other. */
const inverseGeneralFlow: Generator<GeneralParams> = {
  id: 'trig-inv-general-flow',
  sample: sampleGeneral(INVERSES),
  render: ({ fn, k }): Slide => {
    const alpha = principalTenths(fn, k);
    const a = `${tenthsTex(alpha)}^{\\circ}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Solve for $0^{\\circ} \\le x < 360^{\\circ}$. A calculator gives $\\alpha = ${INVERSE_TEX[fn]}(${kTex(k)}) = ${a}$.`,
        },
      ],
      subject: `${RATIO_TEX[fn]}(x) = ${kTex(k)}`,
      steps: [
        {
          id: 'keep',
          ask: `Is $${a}$ itself between $0^{\\circ}$ and $360^{\\circ}$?`,
          branches: [
            { label: KEEP_IT, to: 'rule' },
            { label: MOVE_IT, to: 'shift' },
          ],
        },
        {
          id: 'shift',
          ask: `How does $${a}$ come into the interval without changing its ${RATIO_NAME[fn]}?`,
          branches: [
            { label: ADD_TURN, to: 'rule' },
            { label: DROP_SIGN, to: 'rule' },
          ],
        },
        {
          id: 'rule',
          ask: 'Which rule gives another solution from $\\alpha$?',
          branches: INVERSES.map((g) => ({
            label: RULE_LABEL[g],
            outcome: `That comes to $${tenthsTex(RULE_OF[g](alpha))}^{\\circ}$.`,
          })),
        },
      ],
      answer: alpha >= 0 ? [KEEP_IT, RULE_LABEL[fn]] : [MOVE_IT, ADD_TURN, RULE_LABEL[fn]],
    };
  },
  solution: generalSolution,
};

interface SecondParams {
  fn: Inverse;
  /** The principal value is n/d of a half turn: whole degrees when d is 180. */
  n: number;
  d: number;
  radians: boolean;
  /** The interval -180 < x <= 180 rather than 0 <= x < 360. */
  signed: boolean;
}

const SECOND_DENOMINATORS = [5, 6, 7, 8, 9, 10, 12];

/** The other solution, in the same half-turn units. */
function otherSolution({ fn, n, d, signed }: SecondParams): number {
  if (!signed) return fn === 'sin' ? d - n : fn === 'cos' ? 2 * d - n : n + d;
  if (fn === 'cos') return -n;
  if (fn === 'sin') return n > 0 ? d - n : -d - n;
  return n > 0 ? n - d : n + d;
}

const halfTurnTex = (m: number, d: number, radians: boolean): string =>
  radians ? piTex(m, d) : `${(180 * m) / d}^{\\circ}`;
const halfTurnAnswer = (m: number, d: number, radians: boolean): string =>
  radians ? piAnswer(m, d) : `${(180 * m) / d}`;

function secondIntervalTex(radians: boolean, signed: boolean): string {
  if (signed) return radians ? '-\\pi < x \\le \\pi' : '-180^{\\circ} < x \\le 180^{\\circ}';
  return radians ? '0 \\le x < 2\\pi' : '0^{\\circ} \\le x < 360^{\\circ}';
}

/** Given the principal value, the one other solution in the interval. */
const inverseSecondSolution: Generator<SecondParams> = {
  id: 'trig-inv-second-solution',
  sample: (rng, difficulty) => {
    const fn: Inverse = difficulty > 1 ? rng.pick(INVERSES) : 'sin';
    const signed = difficulty > 1 && rng.chance(0.5);
    const radians = rng.chance(0.5);
    for (;;) {
      const d = radians ? rng.pick(SECOND_DENOMINATORS) : 180;
      const n = rng.int(-d, d);
      if (radians && gcd(n, d) !== 1) continue;
      const lo = fn === 'cos' || !signed ? 0 : -d / 2;
      const hi = fn === 'cos' ? d : d / 2;
      // In degrees, keep clear of zero and the ends of the range: a principal
      // value of one degree reads as a slip rather than a question.
      const margin = radians ? 0 : 10;
      if (n > lo + margin && n < hi - margin && Math.abs(n) >= margin) return { fn, n, d, radians, signed };
    }
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `$${INVERSE_TEX[p.fn]}(k) = ${halfTurnTex(p.n, p.d, p.radians)}$ for some number $k$. Find the other solution of $${RATIO_TEX[p.fn]}(x) = k$ with $${secondIntervalTex(p.radians, p.signed)}$.`,
      },
    ],
    lead: 'x =',
    keypad: p.radians ? PI_KEYS : NUMBER_KEYS,
    answer: halfTurnAnswer(otherSolution(p), p.d, p.radians),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const correct = otherSolution(p);
    // Every other function's rule, in either interval.
    const candidates = [p.d - p.n, 2 * p.d - p.n, p.n + p.d, -p.n, p.n - p.d, -p.d - p.n];
    const kept = [...new Set(candidates)].filter((m) => m !== correct && m !== p.n).slice(0, 3);
    const option = (m: number) => ({ tex: halfTurnTex(m, p.d, p.radians), answer: halfTurnAnswer(m, p.d, p.radians) });
    return options(option(correct), ...kept.map(option));
  },
  solution: (p) => {
    const { fn, n, d, radians, signed } = p;
    const m = otherSolution(p);
    const half = radians ? '\\pi' : '180^{\\circ}';
    const turn = radians ? '2\\pi' : '360^{\\circ}';
    const alpha = halfTurnTex(n, d, radians);
    const rule =
      fn === 'cos'
        ? signed
          ? `-${alpha}`
          : `${turn} - ${alpha}`
        : fn === 'sin'
          ? n > 0 || !signed
            ? `${half} - ${alpha}`
            : `-${half} - \\left(${alpha}\\right)`
          : n > 0
            ? signed
              ? `${alpha} - ${half}`
              : `${alpha} + ${half}`
            : `${alpha} + ${half}`;
    return [
      { text: SECOND_RULE[fn] },
      {
        text: `In $${secondIntervalTex(radians, signed)}$ that other angle is:`,
      },
      // Cosine's rule in a signed interval is just a sign change, and writing
      // it out as -α = -α says nothing.
      { tex: fn === 'cos' && signed ? `x = ${halfTurnTex(m, d, radians)}` : `${rule} = ${halfTurnTex(m, d, radians)}` },
    ];
  },
};

interface SolutionsSliderParams {
  fn: 'sin' | 'cos';
  /** k in tenths. */
  k: number;
  radians: boolean;
}

const solutionsScale = (radians: boolean) =>
  radians ? { max: 6.4, step: 0.05, tolerance: 0.1 } : { max: 360, step: 1, tolerance: 3 };

/** The calculator's angle, and the other solution, in the unit of the picture. */
function solutionsPair({ fn, k, radians }: SolutionsSliderParams): { alpha: number; other: number } {
  const x = k / 10;
  if (radians) {
    const alpha = Math.round((fn === 'sin' ? Math.asin(x) : Math.acos(x)) * 100) / 100;
    return { alpha, other: (fn === 'sin' ? Math.PI : 2 * Math.PI) - alpha };
  }
  const alpha = principalTenths(fn, k) / 10;
  return { alpha, other: (fn === 'sin' ? 180 : 360) - alpha };
}

/** The ringed crossing is the calculator's; slide to the other one in the turn. */
const inverseSolutionsSlider: Generator<SolutionsSliderParams> = {
  id: 'trig-inv-solutions-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const fn = rng.pick(['sin', 'cos'] as const);
      const p = { fn, k: fn === 'cos' && difficulty > 1 ? nonZeroInt(rng, -9, 9) : rng.int(1, 9), radians: rng.chance(0.5) };
      const { max, tolerance } = solutionsScale(p.radians);
      const { other } = solutionsPair(p);
      if (Math.abs(other - max / 2) > 3 * tolerance && other > 3 * tolerance && other < max - 3 * tolerance) return p;
    }
  },
  render: (p): Slide => {
    const { max, step, tolerance } = solutionsScale(p.radians);
    const { alpha, other } = solutionsPair(p);
    const unit = p.radians ? 1 : DEGREE;
    const svg = plotSvg({
      xMin: 0,
      xMax: max,
      curves: [{ f: (x) => INVERSE_BASE[p.fn](x * unit) }],
      horizontals: [p.k / 10],
      marks: [{ x: alpha, y: p.k / 10, hollow: true }],
      yMin: -1.5,
      yMax: 1.5,
      label: `The graph of y = ${p.fn} x over one turn, a dashed level line, and one crossing ringed`,
    });
    const alphaTex = p.radians ? `${alpha}` : `${alpha.toFixed(1)}^{\\circ}`;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `This is $y = ${RATIO_TEX[p.fn]}(x)$ with $x$ in ${p.radians ? 'radians' : 'degrees'}, and the dashed line is $y = ${kTex(p.k)}$. The ringed crossing is the calculator's answer, $${INVERSE_TEX[p.fn]}(${kTex(p.k)}) = ${alphaTex}$. Slide to the other solution in the same turn.`,
        },
      ],
      min: 0,
      max,
      step,
      tolerance,
      answer: Number((Math.round(other / step) * step).toFixed(2)),
      readout: p.radians ? 'x = {v}' : 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, max) },
    };
  },
  solution: (p) => {
    const { alpha, other } = solutionsPair(p);
    const whole = p.fn === 'sin' ? (p.radians ? '\\pi' : '180^{\\circ}') : p.radians ? '2\\pi' : '360^{\\circ}';
    return [
      {
        text:
          p.fn === 'sin'
            ? 'The sine curve is symmetric about the peak in the middle of its first hump, so the two crossings are the same distance from each end of that hump.'
            : 'The cosine curve is symmetric about the trough halfway through the turn, so the two crossings are the same distance from each end of the turn.',
      },
      {
        tex: `x = ${whole} - ${p.radians ? alpha : `${alpha.toFixed(1)}^{\\circ}`} ${p.radians ? '\\approx' : '='} ${p.radians ? other.toFixed(2) : `${other.toFixed(1)}^{\\circ}`}`,
      },
    ];
  },
};

/* ---------- Level 7: modelling with trigonometric functions ---------- */

/*
 * A model here is d ± a sin(bt) or d ± a cos(bt), with t in the situation's own
 * time unit and bt in degrees, the way level 3 wrote a wave. Every period
 * divides 360, so b is whole, and is a multiple of 12, so every time a question
 * asks about (a peak, a trough, a crossing at half the amplitude) is whole as
 * well. Units live in the prose; every answer is a bare number.
 */

/** Where the quantity is at t = 0, which decides the function and its sign. */
type Start = 'rise' | 'peak' | 'trough' | 'fall';
const STARTS: Start[] = ['rise', 'peak', 'trough', 'fall'];
const START_FN: Record<Start, 'sin' | 'cos'> = { rise: 'sin', fall: 'sin', peak: 'cos', trough: 'cos' };
const START_SIGN: Record<Start, 1 | -1> = { rise: 1, peak: 1, trough: -1, fall: -1 };
const START_WORDS: Record<Start, string> = {
  rise: 'on its midline and rising',
  peak: 'at its greatest',
  trough: 'at its least',
  fall: 'on its midline and falling',
};

/**
 * Twice the sine and cosine at the angles where they are 0, ±1/2 or ±1, from a
 * table rather than from Math.sin, whose 0.49999999999999994 would otherwise
 * reach a bank as a tile of its own.
 */
const TWICE_RATIO: Record<'sin' | 'cos', Record<number, number>> = {
  sin: { 0: 0, 30: 1, 90: 2, 150: 1, 180: 0, 210: -1, 270: -2, 330: -1 },
  cos: { 0: 2, 60: 1, 90: 0, 120: -1, 180: -2, 240: -1, 270: 0, 300: 1 },
};

/** Half of a whole number of halves, as the learner reads it: 1/2, -1, 0. */
const HALVES_TEX: Record<number, string> = {
  [-2]: '-1',
  [-1]: '-\\frac{1}{2}',
  0: '0',
  1: '\\frac{1}{2}',
  2: '1',
};

const FN_NAME: Record<'sin' | 'cos', string> = { sin: 'sine', cos: 'cosine' };

interface ModelContext {
  /** Opens a sentence: "The depth of water at a harbour wall". */
  subject: string;
  symbol: string;
  /** The quantity's unit, in prose only. */
  unit: string;
  /** The same unit for exactly one. */
  unitOne: string;
  /** What t counts, completing "t in hours ...". */
  clock: string;
  timeUnit: string;
  /** One of the time unit, for "every hour". */
  timeOne: string;
  /** Periods on offer: multiples of 12 that divide 360. */
  periods: number[];
  midlines: [number, number];
  amplitudes: [number, number];
  /** Can go below zero, so offered only at difficulty 2. */
  signed?: boolean;
}

/**
 * The situations a model is built for.
 *
 * Kept varied on purpose. Most of these questions have a fixed stem, and the
 * situation is most of what tells one draw from the next.
 */
const MODEL_CONTEXTS: ModelContext[] = [
  {
    subject: 'The depth of water at a harbour wall',
    symbol: 'h',
    unit: 'metres',
    unitOne: 'metre',
    clock: 'after midnight',
    timeUnit: 'hours',
    timeOne: 'hour',
    periods: [12],
    midlines: [5, 10],
    amplitudes: [1, 4],
  },
  {
    subject: 'The height of a seat on a Ferris wheel',
    symbol: 'h',
    unit: 'metres',
    unitOne: 'metre',
    clock: 'after the ride starts',
    timeUnit: 'minutes',
    timeOne: 'minute',
    periods: [12, 24, 36],
    midlines: [12, 40],
    amplitudes: [10, 36],
  },
  {
    subject: 'The temperature in a greenhouse',
    symbol: 'T',
    unit: 'degrees Celsius',
    unitOne: 'degree Celsius',
    clock: 'after midnight',
    timeUnit: 'hours',
    timeOne: 'hour',
    periods: [24],
    midlines: [14, 24],
    amplitudes: [2, 8],
  },
  {
    subject: 'The number of hours of daylight in a northern town',
    symbol: 'D',
    unit: 'hours',
    unitOne: 'hour',
    clock: 'into the year',
    timeUnit: 'months',
    timeOne: 'month',
    periods: [12],
    midlines: [11, 13],
    amplitudes: [2, 6],
  },
  {
    subject: 'The height of a buoy above the sea bed',
    symbol: 'h',
    unit: 'metres',
    unitOne: 'metre',
    clock: 'after the first reading',
    timeUnit: 'seconds',
    timeOne: 'second',
    periods: [12, 24],
    midlines: [8, 15],
    amplitudes: [1, 4],
  },
  {
    subject: 'The height of a paddle on a water wheel above the river bed',
    symbol: 'h',
    unit: 'metres',
    unitOne: 'metre',
    clock: 'after you start watching',
    timeUnit: 'seconds',
    timeOne: 'second',
    periods: [12, 24, 36, 60],
    midlines: [4, 9],
    amplitudes: [2, 5],
  },
  {
    subject: 'The water level in a tidal river',
    symbol: 'L',
    unit: 'metres',
    unitOne: 'metre',
    clock: 'after noon',
    timeUnit: 'hours',
    timeOne: 'hour',
    periods: [12],
    midlines: [3, 8],
    amplitudes: [1, 3],
  },
  {
    subject: 'The temperature on a winter day in a mountain town',
    symbol: 'T',
    unit: 'degrees Celsius',
    unitOne: 'degree Celsius',
    clock: 'after midnight',
    timeUnit: 'hours',
    timeOne: 'hour',
    periods: [24],
    midlines: [-4, 3],
    amplitudes: [2, 7],
    signed: true,
  },
  {
    subject: 'The temperature inside a freezer as its motor cycles',
    symbol: 'T',
    unit: 'degrees Celsius',
    unitOne: 'degree Celsius',
    clock: 'after the motor starts',
    timeUnit: 'minutes',
    timeOne: 'minute',
    periods: [12, 24, 36],
    midlines: [-20, -14],
    amplitudes: [1, 4],
    signed: true,
  },
];

interface ModelParams {
  ctx: number;
  d: number;
  a: number;
  period: number;
  start: Start;
}

/**
 * A model for one of the situations. Below zero only at difficulty 2; above it
 * the least value stays at least 1, so a depth or a height never goes negative.
 * `even` keeps the amplitude even, for a question that evaluates at half of it.
 */
function sampleModel(rng: Rng, difficulty: number, starts: Start[], even = false): ModelParams {
  const pool = MODEL_CONTEXTS.map((_, i) => i).filter((i) => difficulty > 1 || !MODEL_CONTEXTS[i].signed);
  const ctx = rng.pick(pool);
  const c = MODEL_CONTEXTS[ctx];
  let d = rng.int(c.midlines[0], c.midlines[1]);
  // A midline of 0 would put a literal "0 +" at the front of the model.
  if (d === 0) d = c.midlines[1];
  const top = c.signed ? c.amplitudes[1] : Math.min(c.amplitudes[1], d - 1);
  let a = rng.int(c.amplitudes[0], top);
  if (even && a % 2 === 1) a = a + 1 <= top ? a + 1 : a - 1;
  return { ctx, d, a, period: rng.pick(c.periods), start: rng.pick(starts) };
}

/** A bank from the answer and its slips, each slip offered once. */
const modelBank = (answer: string[], slips: string[]): string[] =>
  sortedBank(answer, [...new Set(slips)].filter((t) => !answer.includes(t)).slice(0, 5));

const ctxOf = (p: ModelParams): ModelContext => MODEL_CONTEXTS[p.ctx];
/** A value with its unit, in prose: $1$ metre, $7.5$ metres. */
const qty = (c: ModelContext, n: number): string => `$${n}$ ${n === 1 ? c.unitOne : c.unit}`;
const lowerFirst = (text: string): string => text[0].toLowerCase() + text.slice(1);
const modelB = (p: ModelParams): number => 360 / p.period;

/** d + a fn(inner), signs written by hand: 6 - 3\cos(30t), never 6 + -3. */
function waveRhs(d: number, amplitude: number, fn: 'sin' | 'cos', inner: string): string {
  const size = Math.abs(amplitude);
  return `${d} ${amplitude < 0 ? '-' : '+'} ${size === 1 ? '' : size}\\${fn}(${inner})`;
}

/** The right-hand side of the model, with the bracket's contents given. */
const modelRhs = (p: ModelParams, inner = `${modelB(p)}t`): string =>
  waveRhs(p.d, START_SIGN[p.start] * p.a, START_FN[p.start], inner);

const modelTex = (p: ModelParams): string => `${ctxOf(p).symbol} = ${modelRhs(p)}`;

/** The model as a curve, for drawing. */
const modelCurve =
  (p: ModelParams) =>
  (t: number): number =>
    p.d + START_SIGN[p.start] * p.a * Math[START_FN[p.start]](modelB(p) * t * DEGREE);

/** The model at a time whose angle is on the table, exactly. */
function modelExact(p: ModelParams, t: number): number {
  const twice = TWICE_RATIO[START_FN[p.start]][turnOf(modelB(p) * t)];
  if (twice === undefined) throw new Error(`no exact value at t = ${t}`);
  return p.d + (START_SIGN[p.start] * p.a * twice) / 2;
}

/** Degrees brought into 0 <= x < 360. */
const turnOf = (degrees: number): number => ((degrees % 360) + 360) % 360;

/** A negative number bracketed where it follows an operator. */
const paren = (n: number): string => (n < 0 ? `(${n})` : `${n}`);

/** The quarter of a cycle, 0 to 3, at which each start reaches its greatest and its least. */
const QUARTER_OF: Record<Start, { peak: number; trough: number }> = {
  rise: { peak: 1, trough: 3 },
  peak: { peak: 0, trough: 2 },
  fall: { peak: 3, trough: 1 },
  trough: { peak: 2, trough: 0 },
};

/** The first time after t = 0 that the model is at its greatest or its least. */
function firstExtreme(p: ModelParams, which: 'peak' | 'trough'): number {
  const quarter = QUARTER_OF[p.start][which];
  return ((quarter === 0 ? 4 : quarter) * p.period) / 4;
}

/** A y window holding the curve and the axis, since the axis is the only scale drawn. */
function modelWindow(p: ModelParams): { yMin: number; yMax: number } {
  const lo = Math.min(0, p.d - p.a);
  const hi = Math.max(0, p.d + p.a);
  const pad = 0.15 * (hi - lo);
  return { yMin: lo - pad, yMax: hi + pad };
}

/** Two cycles of the model from t = 0, with the midline dashed and t = 0 drawn solid. */
function modelSvg(p: ModelParams, label: string): string {
  return plotSvg({
    xMin: 0,
    xMax: 2 * p.period,
    curves: [{ f: modelCurve(p), accent: true }],
    horizontals: [p.d],
    verticals: [{ x: 0, dashed: false }],
    ...modelWindow(p),
    label,
  });
}

/** Where the quarters of a cycle sit for a start: the sentence the solutions lean on. */
function quarterStory(p: ModelParams): string {
  const fn = START_FN[p.start];
  const sign = START_SIGN[p.start];
  const opener = `$${sign < 0 ? '-' : ''}\\${fn}$ starts ${START_WORDS[p.start]}`;
  const { peak, trough } = QUARTER_OF[p.start];
  const at = (q: number) => (q === 0 ? 'at the start of each cycle' : `${['', 'a quarter', 'half', 'three quarters'][q]} of the way through`);
  return `${opener}, so it is greatest ${at(peak)} and least ${at(trough)}.`;
}

interface BuildParams extends ModelParams {
  /** The half cycle, greatest to least, is given rather than the period. */
  halfGiven: boolean;
}

/** From a description to d + a sin(bt): a midline and rising start, so the function is given away and the numbers are not. */
const modelBuild: Generator<BuildParams> = {
  id: 'trig-model-build',
  sample: (rng, difficulty) => ({
    ...sampleModel(rng, difficulty, ['rise']),
    halfGiven: difficulty > 1 && rng.chance(0.5),
  }),
  render: (p): Slide => {
    const c = ctxOf(p);
    const b = modelB(p);
    const high = p.d + p.a;
    const low = p.d - p.a;
    const timing = p.halfGiven
      ? `it takes $${p.period / 2}$ ${c.timeUnit} to fall from its greatest to its least`
      : `it repeats every $${p.period}$ ${c.timeUnit}`;
    // The bracket's tile carries its t, which leaves the template one short
    // fragment after the last blank rather than a "t)" to wrap.
    const answer = [`${p.d}`, `${p.a}`, `${b}t`];
    const slips = [`${p.period}t`, `${2 * b}t`, ...[high, 2 * p.a, low].map(String)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} rises and falls between $${low}$ and $${high}$ ${c.unit}, and ${timing}. At $t = 0$ it is on its midline and rising. What is its model, with $t$ in ${c.timeUnit}?`,
        },
        // The model's name sits above the blanks: three blanks and a prefix
        // did not fit one row on a phone, and the closing bracket wrapped
        // onto a row of its own.
        { kind: 'display', tex: `${c.symbol} = d + a\\sin(bt)` },
      ],
      template: '{0} + {1}\\sin({2})',
      bank: modelBank(answer, slips),
      answer,
    };
  },
  choices: (p) => {
    const s = ctxOf(p).symbol;
    const b = modelB(p);
    const eq = (d: number, a: number, inner: number) => ({ tex: `${s} = ${waveRhs(d, a, 'sin', `${inner}t`)}` });
    return options(
      eq(p.d, p.a, b),
      eq(p.a, p.d, b),
      eq(p.d, p.a, p.period),
      eq(p.d, 2 * p.a, b),
      eq(p.d + p.a, p.a, b),
    ).slice(0, 4);
  },
  solution: (p) => {
    const high = p.d + p.a;
    const low = p.d - p.a;
    const c = ctxOf(p);
    return [
      { text: 'The midline is halfway between the extremes, and the amplitude is how far either one is from it.' },
      { tex: `d = \\frac{${high} + ${paren(low)}}{2} = ${p.d}` },
      { tex: `a = \\frac{${high} - ${paren(low)}}{2} = ${p.a}` },
      ...(p.halfGiven
        ? [{ text: `Greatest to least is half a cycle, so a whole cycle takes $2 \\times ${p.period / 2} = ${p.period}$ ${c.timeUnit}.` }]
        : []),
      { text: `$b$ is how many degrees the bracket turns through per ${c.timeOne}, so one cycle of $${p.period}$ ${c.timeUnit} is one full turn.` },
      { tex: `b = \\frac{360}{${p.period}} = ${modelB(p)}` },
      { text: `Sine starts on its midline and rising, which is what this does at $t = 0$, so $${modelTex(p)}$.` },
    ];
  },
};

interface ModelBParams extends ModelParams {
  form: 'period' | 'cycles' | 'reverse';
  /** Cycles completed in the stated stretch, for the `cycles` form. */
  cycles: number;
}

/** b from the period, or from so many cycles in so long; at difficulty 2 also the period back from b. */
const modelFindB: Generator<ModelBParams> = {
  id: 'trig-model-b',
  sample: (rng, difficulty) => ({
    ...sampleModel(rng, difficulty, STARTS),
    form: difficulty > 1 ? rng.pick(['cycles', 'reverse'] as const) : rng.pick(['period', 'cycles'] as const),
    cycles: rng.int(2, 3),
  }),
  render: (p): Slide => {
    const c = ctxOf(p);
    const b = modelB(p);
    if (p.form === 'reverse') {
      return {
        kind: 'expression',
        prompt: [
          {
            kind: 'prose',
            text: `${c.subject} is modelled by $${modelTex(p)}$, with $t$ in ${c.timeUnit} ${c.clock}. How many ${c.timeUnit} does one full cycle take?`,
          },
        ],
        lead: '\\text{period} =',
        keypad: NUMBER_KEYS,
        answer: `${p.period}`,
        alsoAccepts: [`360/${b}`],
        domain: 'real',
        mode: 'exact',
      };
    }
    const timing =
      p.form === 'period'
        ? `repeats every $${p.period}$ ${c.timeUnit}`
        : `goes through $${p.cycles}$ full cycles every $${p.cycles * p.period}$ ${c.timeUnit}`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} ${timing}. It is modelled by $${c.symbol} = ${modelRhs(p, 'bt')}$, with $t$ in ${c.timeUnit}. What is $b$?`,
        },
      ],
      lead: 'b =',
      keypad: NUMBER_KEYS,
      answer: `${b}`,
      alsoAccepts: [`360/${p.period}`],
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const b = modelB(p);
    const option = (n: number) => ({ tex: `${n}`, answer: `${n}` });
    if (p.form === 'reverse') return options(option(p.period), option(b), option(p.period / 2), option(2 * p.period));
    const long = p.form === 'cycles' ? p.cycles * p.period : 360;
    return options(option(b), option(p.period), option(2 * b), option(long));
  },
  solution: (p) => {
    const c = ctxOf(p);
    const b = modelB(p);
    const steps: SolutionStep[] = [];
    if (p.form === 'cycles') {
      steps.push({
        text: `$${p.cycles}$ cycles in $${p.cycles * p.period}$ ${c.timeUnit} is one cycle every $${p.period}$ ${c.timeUnit}: divide by $${p.cycles}$ first.`,
      });
    }
    steps.push({ text: 'One cycle is one full turn of the bracket, $360^{\\circ}$, so $b$ times the period is 360.' });
    steps.push({
      tex: p.form === 'reverse' ? `\\text{period} = \\frac{360}{${b}} = ${p.period}` : `b = \\frac{360}{${p.period}} = ${b}`,
    });
    return steps;
  },
};

interface ExtremesTreeParams extends ModelParams {
  phrasing: number;
}

const EXTREMES_PROMPTS = [
  (c: ModelContext, low: number, high: number) =>
    `${c.subject} swings between $${low}$ and $${high}$ ${c.unit}. Top row: the two added, then the gap between them. Bottom row: halve each, for the midline and then the amplitude.`,
  (c: ModelContext, low: number, high: number) =>
    `Readings of ${lowerFirst(c.subject)} run from $${low}$ up to $${high}$ ${c.unit}. Fill in their sum and their gap, then halve each: the midline $d$, then the amplitude $a$.`,
];

/** The midline and amplitude from the extremes, built as a sum and a gap, each halved. */
const modelExtremesTree: Generator<ExtremesTreeParams> = {
  id: 'trig-model-extremes-tree',
  sample: (rng, difficulty) => ({
    ...sampleModel(rng, difficulty, ['rise']),
    phrasing: rng.int(0, EXTREMES_PROMPTS.length - 1),
  }),
  render: (p): Slide => {
    const high = p.d + p.a;
    const low = p.d - p.a;
    const answer = [high + low, high - low, p.d, p.a].map(String);
    return {
      kind: 'tree',
      prompt: [{ kind: 'prose', text: EXTREMES_PROMPTS[p.phrasing](ctxOf(p), low, high) }],
      expression: `\\text{greatest } ${high}, \\quad \\text{least } ${low}`,
      nodes: [
        { id: 'sum', from: [] },
        { id: 'gap', from: [] },
        { id: 'midline', from: ['sum'] },
        { id: 'amplitude', from: ['gap'] },
      ],
      // Halving the wrong one, not halving at all, and the extremes themselves.
      bank: bankAround(answer, [high, low, (high - low) * 2, high + low + 2]),
      answer,
    };
  },
  solution: (p) => {
    const high = p.d + p.a;
    const low = p.d - p.a;
    return [
      { text: 'The midline is the average of the greatest and least values.' },
      { tex: `d = \\frac{${high} + ${paren(low)}}{2}` },
      { tex: `= \\frac{${high + low}}{2} = ${p.d}` },
      { text: 'The amplitude is half the gap between them: the whole gap is the swing from top to bottom, twice the amplitude.' },
      { tex: `a = \\frac{${high} - ${paren(low)}}{2}` },
      { tex: `= \\frac{${high - low}}{2} = ${p.a}` },
    ];
  },
};

type ReadAsk = 'greatest' | 'least' | 'period' | 'firstPeak';

interface ReadParams extends ModelParams {
  asks: ReadAsk;
}

const READ_LEAD: Record<ReadAsk, string> = {
  greatest: '\\text{greatest} =',
  least: '\\text{least} =',
  period: '\\text{period} =',
  firstPeak: 't =',
};

function readAnswer(p: ReadParams): number {
  if (p.asks === 'greatest') return p.d + p.a;
  if (p.asks === 'least') return p.d - p.a;
  if (p.asks === 'period') return p.period;
  return firstExtreme(p, 'peak');
}

/** Reading a model back: its greatest and least values, its period, when it first peaks. */
const modelRead: Generator<ReadParams> = {
  id: 'trig-model-read',
  sample: (rng, difficulty) => ({
    ...sampleModel(rng, difficulty, difficulty > 1 ? STARTS : ['rise', 'peak']),
    asks: rng.pick(['greatest', 'least', 'period', 'firstPeak'] as const),
  }),
  render: (p): Slide => {
    const c = ctxOf(p);
    const question: Record<ReadAsk, string> = {
      greatest: `What is the greatest value it reaches, in ${c.unit}?`,
      least: `What is the least value it falls to, in ${c.unit}?`,
      period: `How many ${c.timeUnit} does one full cycle take?`,
      firstPeak: 'When, after $t = 0$, is it first at its greatest?',
    };
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} is modelled by $${modelTex(p)}$, with $t$ in ${c.timeUnit} ${c.clock}. ${question[p.asks]}`,
        },
      ],
      lead: READ_LEAD[p.asks],
      keypad: NUMBER_KEYS,
      answer: `${readAnswer(p)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const option = (n: number) => ({ tex: `${n}`, answer: `${n}` });
    const right = readAnswer(p);
    const quarter = p.period / 4;
    const slips: Record<ReadAsk, number[]> = {
      greatest: [p.a, p.d, p.d + 2 * p.a, 2 * p.a, p.d - p.a],
      least: [-p.a, p.d, p.d - 2 * p.a, p.a - p.d, p.d + p.a],
      period: [modelB(p), p.period / 2, 2 * p.period],
      firstPeak: [quarter, 2 * quarter, 3 * quarter, 4 * quarter],
    };
    return options(option(right), ...slips[p.asks].filter((n) => n !== right).map(option)).slice(0, 4);
  },
  solution: (p) => {
    const b = modelB(p);
    if (p.asks === 'period') {
      return [
        { text: `The bracket turns through $${b}^{\\circ}$ each unit of $t$, and one cycle is a full turn.` },
        { tex: `\\text{period} = \\frac{360}{${b}} = ${p.period}` },
      ];
    }
    if (p.asks === 'firstPeak') {
      return [
        { text: quarterStory(p) },
        { tex: `t = ${(4 * firstExtreme(p, 'peak')) / p.period} \\times \\frac{${p.period}}{4} = ${firstExtreme(p, 'peak')}` },
      ];
    }
    const up = p.asks === 'greatest';
    return [
      { text: `The ${FN_NAME[START_FN[p.start]]} runs from $-1$ to $1$, so the model swings $${p.a}$ either side of its midline, $${p.d}$.` },
      { tex: `${p.d} ${up ? '+' : '-'} ${p.a} = ${up ? p.d + p.a : p.d - p.a}` },
    ];
  },
};

interface PeakSliderParams extends ModelParams {
  asks: 'peak' | 'trough';
}

/** Drag along two drawn cycles to the first time the model is greatest, or least. */
const modelPeakSlider: Generator<PeakSliderParams> = {
  id: 'trig-model-peak-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = {
        ...sampleModel(rng, difficulty, difficulty > 1 ? STARTS : ['rise', 'peak', 'trough']),
        asks: rng.pick(['peak', 'trough'] as const),
      };
      // The untouched handle rests at one period, so that is never the answer.
      if (firstExtreme(p, p.asks) !== p.period) return p;
    }
  },
  render: (p): Slide => {
    const c = ctxOf(p);
    const max = 2 * p.period;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `This is $${modelTex(p)}$ for ${lowerFirst(c.subject)}, over its first two cycles, with $t$ in ${c.timeUnit} ${c.clock}. The dashed line is the midline. Slide to the first time after $t = 0$ that it is at its ${p.asks === 'peak' ? 'greatest' : 'least'}.`,
        },
      ],
      min: 0,
      max,
      step: 1,
      tolerance: p.period / 24,
      answer: firstExtreme(p, p.asks),
      readout: 't = {v}',
      figure: {
        svg: modelSvg(p, `Two cycles of the model from t = 0, with its midline dashed`),
        ...markerWindow(0, max),
      },
    };
  },
  solution: (p) => {
    const t = firstExtreme(p, p.asks);
    return [
      { text: quarterStory(p) },
      { text: `One cycle is $${p.period}$ ${ctxOf(p).timeUnit}, so a quarter of a cycle is $${p.period / 4}$.` },
      { tex: `t = ${(4 * t) / p.period} \\times ${p.period / 4} = ${t}` },
    ];
  },
};

interface ValueTreeParams extends ModelParams {
  t: number;
}

/** The model at one time: the angle in the bracket, its sine or cosine, then the value. */
const modelValueTree: Generator<ValueTreeParams> = {
  id: 'trig-model-value-tree',
  sample: (rng, difficulty) => {
    const p = sampleModel(rng, difficulty, difficulty > 1 ? STARTS : ['rise', 'peak'], true);
    const angles = Object.keys(TWICE_RATIO[START_FN[p.start]]).map(Number).filter((angle) => angle > 0);
    const angle = rng.pick(angles);
    // At difficulty 2 the time can fall in the second cycle, past a full turn.
    const later = difficulty > 1 && rng.chance(0.5) ? p.period : 0;
    return { ...p, t: (angle * p.period) / 360 + later };
  },
  render: (p): Slide => {
    const c = ctxOf(p);
    const b = modelB(p);
    const fn = START_FN[p.start];
    const angle = b * p.t;
    const twice = TWICE_RATIO[fn][turnOf(angle)];
    const value = modelExact(p, p.t);
    const answer = [`${angle}^{\\circ}`, HALVES_TEX[twice], `${value}`];
    const term = value - p.d;
    const other = TWICE_RATIO[fn === 'sin' ? 'cos' : 'sin'][turnOf(angle)];
    const slips = [
      `${b + p.t}^{\\circ}`,
      ...(twice === 0 ? [] : [HALVES_TEX[-twice]]),
      ...(other === undefined || other === twice ? [] : [HALVES_TEX[other]]),
      `${p.d - term}`,
      `${term}`,
      // The greatest value, as if the function were always 1, and the time taken as the angle.
      `${p.d + p.a}`,
      `${p.t}^{\\circ}`,
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} is modelled by $${modelTex(p)}$, with $t$ in ${c.timeUnit} ${c.clock}. Find $${c.symbol}$ at $t = ${p.t}$: the angle in the bracket, its ${FN_NAME[fn]}, then $${c.symbol}$.`,
        },
      ],
      expression: `${c.symbol} = ${modelRhs(p, `${b} \\times ${p.t}`)}`,
      nodes: [
        { id: 'angle', from: [] },
        { id: 'ratio', from: ['angle'] },
        { id: 'value', from: ['ratio'] },
      ],
      bank: modelBank(answer, slips),
      answer,
    };
  },
  solution: (p) => {
    const b = modelB(p);
    const fn = START_FN[p.start];
    const angle = b * p.t;
    const twice = TWICE_RATIO[fn][turnOf(angle)];
    return [
      { tex: `${b} \\times ${p.t} = ${angle}^{\\circ}` },
      ...(angle >= 360
        ? [{ text: `That is past a full turn, and $${angle - 360}^{\\circ}$ has the same ${FN_NAME[fn]}.` }]
        : []),
      { tex: `\\${fn}(${angle}^{\\circ}) = ${HALVES_TEX[twice]}` },
      {
        tex: `${ctxOf(p).symbol} = ${p.d} ${START_SIGN[p.start] < 0 ? '-' : '+'} ${p.a} \\times ${twice < 0 ? `\\left(${HALVES_TEX[twice]}\\right)` : HALVES_TEX[twice]} = ${modelExact(p, p.t)}`,
      },
    ];
  },
};

const AT_GREATEST = 'At the greatest value';
const ON_MIDLINE = 'On the midline';
const AT_LEAST = 'At the least value';
const RISING = 'Rising';
const FALLING = 'Falling';

/** Where the quantity starts decides the function: midline rising, peak, trough or midline falling. */
const modelStartFlow: Generator<ModelParams> = {
  id: 'trig-model-start-flow',
  sample: (rng, difficulty) => sampleModel(rng, difficulty, difficulty > 1 ? STARTS : ['rise', 'peak', 'trough']),
  render: (p): Slide => {
    const c = ctxOf(p);
    const high = p.d + p.a;
    const low = p.d - p.a;
    const v0 = p.start === 'peak' ? high : p.start === 'trough' ? low : p.d;
    const moving = p.start === 'rise' ? ' and rising' : p.start === 'fall' ? ' and falling' : '';
    const rhs = (start: Start) => modelRhs({ ...p, start });
    const where = p.start === 'peak' ? AT_GREATEST : p.start === 'trough' ? AT_LEAST : ON_MIDLINE;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} varies between $${low}$ and $${high}$ ${c.unit}, repeating every $${p.period}$ ${c.timeUnit}. At $t = 0$ it is ${qty(c, v0)}${moving}. Choose its model.`,
        },
      ],
      subject: `${c.symbol}(0) = ${v0}`,
      steps: [
        {
          id: 'where',
          ask: `Where is $${v0}$ in the swing from $${low}$ to $${high}$?`,
          branches: [
            { label: AT_GREATEST, to: 'fn' },
            { label: ON_MIDLINE, to: 'way' },
            { label: AT_LEAST, to: 'fn' },
          ],
        },
        {
          id: 'way',
          ask: 'Which way is it heading at $t = 0$?',
          branches: [
            { label: RISING, to: 'fn' },
            { label: FALLING, to: 'fn' },
          ],
        },
        {
          id: 'fn',
          ask: 'Which model starts there?',
          branches: STARTS.map((start) => ({
            label: `$${rhs(start)}$`,
            outcome: `That starts ${START_WORDS[start]}.`,
          })),
        },
      ],
      answer:
        where === ON_MIDLINE
          ? [ON_MIDLINE, p.start === 'rise' ? RISING : FALLING, `$${rhs(p.start)}$`]
          : [where, `$${rhs(p.start)}$`],
    };
  },
  solution: (p) => [
    {
      text: `Midline $\\frac{${p.d + p.a} + ${paren(p.d - p.a)}}{2} = ${p.d}$, amplitude $${p.a}$, and $b = \\frac{360}{${p.period}} = ${modelB(p)}$.`,
    },
    {
      text: 'Sine starts on its midline rising, and minus sine on it falling. Cosine starts at its greatest, and minus cosine at its least.',
    },
    { text: `At $t = 0$ this one is ${START_WORDS[p.start]}, so:` },
    { tex: modelTex(p) },
  ],
};

/** Which of the four starts is the drawn curve? */
const modelGraphMatch: Generator<ModelParams> = {
  id: 'trig-model-graph-match',
  sample: (rng, difficulty) => sampleModel(rng, difficulty, difficulty > 1 ? STARTS : ['rise', 'peak', 'trough']),
  render: (p): Slide => {
    const c = ctxOf(p);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `This graph shows ${lowerFirst(c.subject)} over two cycles, with $t$ in ${c.timeUnit} ${c.clock}. The dashed line is the midline and the solid upright is $t = 0$. Which model fits?`,
        },
        { kind: 'diagram', svg: modelSvg(p, 'Two cycles of a repeating quantity from t = 0, with its midline dashed') },
      ],
      options: STARTS.map((start) => ({ id: start, label: modelTex({ ...p, start }), tex: true })),
      correctId: p.start,
    };
  },
  solution: (p) => [
    { text: `Every option has the right midline, amplitude and period, so only the start tells them apart. At $t = 0$ the curve is ${START_WORDS[p.start]}.` },
    { text: quarterStory(p) },
    { tex: modelTex(p) },
  ],
};

interface ModelShiftParams extends ModelParams {
  /** The first time after 0 that the quantity is greatest. */
  c: number;
  /** The time of a least value is given instead, half a cycle from c. */
  fromLeast: boolean;
}

/** A peak time that is not a quarter of a cycle, so the curve has to be shifted rather than chosen. */
function shiftedPeak(rng: Rng, period: number): number {
  const quarter = period / 4;
  const c = rng.int(1, period - 1);
  return c % quarter === 0 ? c + 1 : c;
}

const leastTime = (p: ModelShiftParams): number => (p.c + p.period / 2) % p.period;

/** A cosine moved to start at a peak that is not at t = 0: b and c in d + a cos(b(t - c)). */
const modelShiftTiles: Generator<ModelShiftParams> = {
  id: 'trig-model-shift-tiles',
  sample: (rng, difficulty) => {
    const p = sampleModel(rng, difficulty, ['peak']);
    return { ...p, c: shiftedPeak(rng, p.period), fromLeast: difficulty > 1 && rng.chance(0.5) };
  },
  render: (p): Slide => {
    const ctx = ctxOf(p);
    const b = modelB(p);
    const high = p.d + p.a;
    const low = p.d - p.a;
    const told = p.fromLeast
      ? `is least, ${qty(ctx, low)}, at $t = ${leastTime(p)}$ and greatest, ${qty(ctx, high)}, half a cycle away`
      : `is greatest, ${qty(ctx, high)}, at $t = ${p.c}$, and least, ${qty(ctx, low)}, half a cycle later`;
    const answer = [`${b}`, `${p.c}`];
    const slips = [p.period, b * p.c, p.period - p.c, leastTime(p)].map(String);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${ctx.subject} ${told}. One cycle takes $${p.period}$ ${ctx.timeUnit}. Complete the model below, shifting a cosine to the first time after $t = 0$ that it is greatest.`,
        },
        // The model sits above the blanks rather than around them: with its
        // blanks inside the brackets it broke across two rows on a phone,
        // with the second blank stranded under the first.
        { kind: 'display', tex: `${ctx.symbol} = ${waveRhs(p.d, p.a, 'cos', 'b(t - c)')}` },
      ],
      template: 'b = {0} \\qquad c = {1}',
      bank: modelBank(answer, slips),
      answer,
    };
  },
  solution: (p) => {
    const b = modelB(p);
    return [
      { tex: `b = \\frac{360}{${p.period}} = ${b}` },
      ...(p.fromLeast
        ? [{ text: `It is greatest half a cycle, $${p.period / 2}$, from the least at $t = ${leastTime(p)}$, and the first such time after $0$ is $t = ${p.c}$.` }]
        : []),
      { text: `Cosine is greatest when its bracket is zero. Writing the bracket as $${b}(t - ${p.c})$ makes that happen at $t = ${p.c}$ instead of at $t = 0$.` },
      { tex: `${ctxOf(p).symbol} = ${waveRhs(p.d, p.a, 'cos', `${b}(t - ${p.c})`)}` },
    ];
  },
};

interface WhenParams extends ModelParams {
  /** Twice the value the sine or cosine must take: 1 or -1. */
  half: 1 | -1;
}

/** The level being solved for: the model with its sine or cosine at plus or minus a half. */
const whenLevel = (p: WhenParams): number => p.d + (START_SIGN[p.start] * p.a * p.half) / 2;

/** The two angles in one turn where the function takes that half. */
function halfAngles(fn: 'sin' | 'cos', half: 1 | -1): [number, number] {
  const table = TWICE_RATIO[fn];
  const found = Object.keys(table)
    .map(Number)
    .filter((angle) => table[angle] === half);
  return [found[0], found[1]];
}

/** The partner the other function's rule would wrongly give: 360 - a for sine, 180 - a for cosine. */
const wrongPartner = (fn: 'sin' | 'cos', angle: number): number => turnOf(fn === 'sin' ? 360 - angle : 180 - angle);

function sampleWhen(rng: Rng, difficulty: number): WhenParams {
  return {
    ...sampleModel(rng, difficulty, difficulty > 1 ? STARTS : ['rise', 'peak']),
    half: rng.pick([1, -1] as const),
  };
}

/** The times in one cycle, 0 <= t < period, when the model is at that level. */
const whenTimes = (p: WhenParams): [number, number] =>
  halfAngles(START_FN[p.start], START_SIGN[p.start] === 1 ? p.half : (-p.half as 1 | -1)).map(
    (angle) => (angle * p.period) / 360,
  ) as [number, number];

/** The value the function must take once the level is moved across: the level's half, undone by the sign. */
const needed = (p: WhenParams): 1 | -1 => (START_SIGN[p.start] === 1 ? p.half : (-p.half as 1 | -1));

/** When is the model at a level? The value the function needs, both angles, both times, as a tree. */
const modelWhenTree: Generator<WhenParams> = {
  id: 'trig-model-when-tree',
  sample: sampleWhen,
  render: (p): Slide => {
    const c = ctxOf(p);
    const fn = START_FN[p.start];
    const s = needed(p);
    const [first, second] = halfAngles(fn, s);
    const [t1, t2] = whenTimes(p);
    const answer = [HALVES_TEX[s], `${first}^{\\circ}`, `${second}^{\\circ}`, `${t1}`, `${t2}`];
    const wrong = wrongPartner(fn, first);
    const slips = [HALVES_TEX[-s], `${wrong}^{\\circ}`, `${(wrong * p.period) / 360}`, `${t1 + p.period}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `When in the first cycle, $0 \\le t < ${p.period}$, is ${lowerFirst(c.subject)} exactly ${qty(c, whenLevel(p))}? Top: the value the ${FN_NAME[fn]} must take. Then both angles from $0^{\\circ}$ to $360^{\\circ}$, then each time.`,
        },
      ],
      expression: `${modelRhs(p)} = ${whenLevel(p)}`,
      nodes: [
        { id: 'ratio', from: [] },
        { id: 'first', from: ['ratio'] },
        { id: 'second', from: ['ratio'] },
        { id: 't1', from: ['first'] },
        { id: 't2', from: ['second'] },
      ],
      bank: modelBank(answer, slips),
      answer,
    };
  },
  solution: (p) => whenSolution(p),
};

/** Where the two angles in a turn come from, for each function and each sign of the half. */
const HALF_ANGLE_TEXT: Record<'sin' | 'cos', Record<1 | -1, string>> = {
  sin: {
    1: 'In one turn sine is $\\frac{1}{2}$ at $30^{\\circ}$ and at $180^{\\circ} - 30^{\\circ} = 150^{\\circ}$.',
    [-1]: 'In one turn sine is $-\\frac{1}{2}$ at $180^{\\circ} + 30^{\\circ} = 210^{\\circ}$ and at $360^{\\circ} - 30^{\\circ} = 330^{\\circ}$.',
  },
  cos: {
    1: 'In one turn cosine is $\\frac{1}{2}$ at $60^{\\circ}$ and at $360^{\\circ} - 60^{\\circ} = 300^{\\circ}$.',
    [-1]: 'In one turn cosine is $-\\frac{1}{2}$ at $180^{\\circ} - 60^{\\circ} = 120^{\\circ}$ and at $180^{\\circ} + 60^{\\circ} = 240^{\\circ}$.',
  },
};

/** The working shared by the tree and the tiles: rearrange, both angles, divide by b. */
function whenSolution(p: WhenParams, window?: { from: number; times: number[] }): SolutionStep[] {
  const fn = START_FN[p.start];
  const b = modelB(p);
  const s = needed(p);
  const [first, second] = halfAngles(fn, s);
  const k = whenLevel(p);
  const steps: SolutionStep[] = [
    { text: `Take $${p.d}$ off both sides, then divide by $${START_SIGN[p.start] * p.a}$.` },
    { tex: `${START_SIGN[p.start] < 0 ? '-' : ''}${p.a === 1 ? '' : p.a}\\${fn}(${b}t) = ${k - p.d}` },
    { tex: `\\${fn}(${b}t) = ${HALVES_TEX[s]}` },
    { text: HALF_ANGLE_TEXT[fn][s] },
    { tex: `t = \\frac{${first}}{${b}} = ${(first * p.period) / 360}` },
    { tex: `t = \\frac{${second}}{${b}} = ${(second * p.period) / 360}` },
  ];
  if (window && window.from > 0) {
    steps.push({
      text: `Those are in the first cycle. Adding $${p.period}$, a whole cycle, where one falls before $t = ${window.from}$ gives the two in the window: $t = ${window.times[0]}$ and $t = ${window.times[1]}$.`,
    });
  }
  return steps;
}

interface WhenTilesParams extends WhenParams {
  /** Where the window of one cycle starts. */
  from: number;
}

/** Both times in a window one cycle long, which from difficulty 2 straddles two cycles. */
function windowTimes(p: WhenTilesParams): number[] {
  return whenTimes(p)
    .flatMap((t) => [t, t + p.period, t + 2 * p.period])
    .filter((t) => t >= p.from && t < p.from + p.period)
    .sort((x, y) => x - y);
}

/** When is the model at a level, in a window one cycle long: two times, one of them maybe a cycle on. */
const modelWhenTiles: Generator<WhenTilesParams> = {
  id: 'trig-model-when-tiles',
  sample: (rng, difficulty) => {
    const p = sampleWhen(rng, difficulty);
    const from = difficulty > 1 ? (rng.int(1, 4) * p.period) / 4 : 0;
    return { ...p, from };
  },
  render: (p): Slide => {
    const c = ctxOf(p);
    const answer = windowTimes(p).map(String);
    const fn = START_FN[p.start];
    const [first] = halfAngles(fn, needed(p));
    const wrong = (wrongPartner(fn, first) * p.period) / 360;
    const slips = [...whenTimes(p), ...whenTimes(p).map((t) => t + p.period), wrong, wrong + p.period].map(String);
    const distractors = [...new Set(slips)].filter((t) => !answer.includes(t)).slice(0, 3);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} is modelled by $${modelTex(p)}$, with $t$ in ${c.timeUnit} ${c.clock}. For $${p.from} \\le t < ${p.from + p.period}$, when is it exactly ${qty(c, whenLevel(p))}?`,
        },
      ],
      template: 't = {0} \\; \\text{or} \\; t = {1}',
      bank: sortedBank(answer, distractors),
      answer,
      unordered: true,
    };
  },
  solution: (p) => whenSolution(p, { from: p.from, times: windowTimes(p) }),
};

type CountLevel = 'greatest' | 'least' | 'midline' | 'half' | 'beyond';

interface CountParams extends ModelParams {
  level: CountLevel;
  cycles: number;
  /** Which side of the midline a `half` or `beyond` level is on. */
  up: boolean;
}

function countLevel(p: CountParams): number {
  const side = p.up ? 1 : -1;
  if (p.level === 'greatest') return p.d + p.a;
  if (p.level === 'least') return p.d - p.a;
  if (p.level === 'midline') return p.d;
  if (p.level === 'half') return p.d + (side * p.a) / 2;
  return p.d + side * (p.a + 1);
}

function countAnswer(p: CountParams): number {
  if (p.level === 'beyond') return 0;
  return p.level === 'greatest' || p.level === 'least' ? p.cycles : 2 * p.cycles;
}

/** How many times in so many cycles is the model at a level? Twice a cycle, once at an extreme, never beyond one. */
const modelCount: Generator<CountParams> = {
  id: 'trig-model-count',
  sample: (rng, difficulty) => ({
    ...sampleModel(rng, difficulty, difficulty > 1 ? STARTS : ['rise', 'peak']),
    level: rng.pick(['greatest', 'least', 'midline', 'half', 'half', 'beyond'] as const),
    cycles: rng.int(1, difficulty > 1 ? 3 : 2),
    up: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const c = ctxOf(p);
    const counts = [0, p.cycles, 2 * p.cycles, 4 * p.cycles];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} is modelled by $${modelTex(p)}$, with $t$ in ${c.timeUnit} ${c.clock}. For $0 \\le t < ${p.cycles * p.period}$, how many times is it exactly ${qty(c, countLevel(p))}?`,
        },
      ],
      options: counts.map((n) => ({ id: `n${n}`, label: `${n}`, tex: true })),
      correctId: `n${countAnswer(p)}`,
    };
  },
  solution: (p) => {
    const cycles = `$${p.cycles}$ cycle${p.cycles === 1 ? '' : 's'}`;
    const why: Record<CountLevel, string> = {
      greatest: 'It reaches its greatest value once in each cycle.',
      least: 'It falls to its least value once in each cycle.',
      midline: 'It crosses its midline twice in each cycle, once going up and once coming down.',
      half: 'A level between the least and the greatest is crossed twice in each cycle, once going up and once coming down.',
      beyond: `$${countLevel(p)}$ is outside $${p.d - p.a}$ to $${p.d + p.a}$, so it is never reached at all.`,
    };
    return [
      { text: `The window is $\\frac{${p.cycles * p.period}}{${p.period}} = ${p.cycles}$ period${p.cycles === 1 ? '' : 's'}: ${cycles}.` },
      { text: why[p.level] },
      { tex: `\\text{count} = ${countAnswer(p)}` },
    ];
  },
};

interface AboveParams extends WhenParams {
  above: boolean;
}

/** How long in each cycle the model is above the level, or below it. */
function aboveAnswer(p: AboveParams): number {
  const [t1, t2] = whenTimes(p);
  const between = t2 - t1;
  const aboveBetween = modelCurve(p)((t1 + t2) / 2) > whenLevel(p);
  const aboveFor = aboveBetween ? between : p.period - between;
  return p.above ? aboveFor : p.period - aboveFor;
}

/** For how long in each cycle is the quantity above a level? The gap between the two times, or the rest of the cycle. */
const modelAbove: Generator<AboveParams> = {
  id: 'trig-model-above',
  sample: (rng, difficulty) => ({ ...sampleWhen(rng, difficulty), above: rng.chance(0.5) }),
  render: (p): Slide => {
    const c = ctxOf(p);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} is modelled by $${modelTex(p)}$, with $t$ in ${c.timeUnit} ${c.clock}. For how many ${c.timeUnit} in each cycle is it ${p.above ? 'above' : 'below'} ${qty(c, whenLevel(p))}?`,
        },
      ],
      lead: '\\text{time} =',
      keypad: NUMBER_KEYS,
      answer: `${aboveAnswer(p)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const right = aboveAnswer(p);
    const [t1, t2] = whenTimes(p);
    const option = (n: number) => ({ tex: `${n}`, answer: `${n}` });
    const slips = [p.period - right, t2, t1, p.period / 2, p.period / 6].filter((n) => n !== right);
    return options(option(right), ...slips.map(option)).slice(0, 4);
  },
  solution: (p) => {
    const [t1, t2] = whenTimes(p);
    const right = aboveAnswer(p);
    const inside = right === t2 - t1;
    return [
      { text: `It is exactly $${whenLevel(p)}$ at $t = ${t1}$ and $t = ${t2}$ in the first cycle.` },
      {
        text: inside
          ? `Between those two times it is ${p.above ? 'above' : 'below'} that level.`
          : `Between those two times it is ${p.above ? 'below' : 'above'} that level, so the answer is the rest of the cycle.`,
      },
      { tex: inside ? `${t2} - ${t1} = ${right}` : `${p.period} - (${t2} - ${t1}) = ${right}` },
    ];
  },
};

interface PeriodTreeParams extends ModelParams {
  /** When the first of the two readings is. */
  first: number;
  leastFirst: boolean;
}

/** The period from a greatest and the least after it: the gap is half a cycle, and then b. */
const modelPeriodTree: Generator<PeriodTreeParams> = {
  id: 'trig-model-period-tree',
  sample: (rng, difficulty) => {
    const p = sampleModel(rng, difficulty, ['peak']);
    return { ...p, first: rng.int(1, p.period - 1), leastFirst: difficulty > 1 && rng.chance(0.5) };
  },
  render: (p): Slide => {
    const c = ctxOf(p);
    const second = p.first + p.period / 2;
    const [w1, w2] = p.leastFirst ? ['least', 'greatest'] : ['greatest', 'least'];
    const b = modelB(p);
    const answer = [p.period / 2, p.period, b];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} is at its ${w1} at $t = ${p.first}$ and next at its ${w2} at $t = ${second}$, with $t$ in ${c.timeUnit}. Fill in the gap between the two, then the period, then $b$ for a model $${c.symbol} = d + a\\cos(bt)$.`,
        },
      ],
      expression: `\\text{${w1 === 'greatest' ? 'high' : 'low'} } t = ${p.first}, \\quad \\text{${w2 === 'greatest' ? 'high' : 'low'} } t = ${second}`,
      nodes: [
        { id: 'gap', from: [] },
        { id: 'period', from: ['gap'] },
        { id: 'b', from: ['period'] },
      ],
      // The gap taken as the period, and the later reading taken as either.
      bank: bankAround(answer.map(String), [2 * b, second, 2 * p.period, p.period / 4]),
      answer: answer.map(String),
    };
  },
  solution: (p) => {
    const second = p.first + p.period / 2;
    return [
      { text: 'From one extreme to the next, greatest to least or least to greatest, is half a cycle.' },
      { tex: `${second} - ${p.first} = ${p.period / 2}` },
      { tex: `\\text{period} = 2 \\times ${p.period / 2} = ${p.period}` },
      { tex: `b = \\frac{360}{${p.period}} = ${modelB(p)}` },
    ];
  },
};

type FitAsk = 'a' | 'b' | 'c' | 'd';

interface FitParams extends ModelParams {
  /** The first reading's time; it is a greatest unless `leastFirst`. */
  first: number;
  leastFirst: boolean;
  asks: FitAsk;
}

/** The fitted c: the first time after 0 that the quantity is greatest. */
const fitC = (p: FitParams): number => (p.leastFirst ? p.first + p.period / 2 : p.first) % p.period;

function fitAnswer(p: FitParams): number {
  return { a: p.a, b: modelB(p), c: fitC(p), d: p.d }[p.asks];
}

/** One of a, b, c and d in d + a cos(b(t - c)), from a greatest and the least after it, or the other way round. */
const modelFit: Generator<FitParams> = {
  id: 'trig-model-fit',
  sample: (rng, difficulty) => {
    const p = sampleModel(rng, difficulty, ['peak']);
    const leastFirst = difficulty > 1 && rng.chance(0.5);
    const first = leastFirst ? shiftedPeak(rng, p.period) : rng.int(1, p.period / 2 - 1);
    return {
      ...p,
      first,
      leastFirst,
      asks: rng.pick(difficulty > 1 ? (['a', 'b', 'c', 'd'] as const) : (['a', 'b', 'd'] as const)),
    };
  },
  render: (p): Slide => {
    const c = ctxOf(p);
    const high = p.d + p.a;
    const low = p.d - p.a;
    const [w1, v1, w2, v2] = p.leastFirst ? ['least', low, 'greatest', high] : ['greatest', high, 'least', low];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${c.subject} is at its ${w1}, ${qty(c, v1 as number)}, at $t = ${p.first}$, and next at its ${w2}, ${qty(c, v2 as number)}, at $t = ${p.first + p.period / 2}$, with $t$ in ${c.timeUnit}. Fit $${c.symbol} = d + a\\cos(b(t - c))$, with $c$ the first time after $t = 0$ that it is greatest.`,
        },
      ],
      lead: `${p.asks} =`,
      keypad: NUMBER_KEYS,
      answer: `${fitAnswer(p)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const right = fitAnswer(p);
    const option = (n: number) => ({ tex: `${n}`, answer: `${n}` });
    const b = modelB(p);
    const slips: Record<FitAsk, number[]> = {
      a: [2 * p.a, p.d, p.d + p.a],
      b: [2 * b, p.period, p.period / 2],
      c: [p.first + p.period / 2, p.first, fitC(p) + p.period, p.period - fitC(p)],
      d: [p.a, p.d + p.a, 2 * p.a],
    };
    return options(option(right), ...slips[p.asks].filter((n) => n !== right).map(option)).slice(0, 4);
  },
  solution: (p) => {
    const high = p.d + p.a;
    const low = p.d - p.a;
    const second = p.first + p.period / 2;
    if (p.asks === 'd') return [{ text: 'The midline is the average of the greatest and the least.' }, { tex: `d = \\frac{${high} + ${paren(low)}}{2} = ${p.d}` }];
    if (p.asks === 'a') return [{ text: 'The amplitude is half the gap between the greatest and the least.' }, { tex: `a = \\frac{${high} - ${paren(low)}}{2} = ${p.a}` }];
    if (p.asks === 'b') {
      return [
        { text: 'A greatest to the next least is half a cycle.' },
        { tex: `\\text{period} = 2(${second} - ${p.first}) = ${p.period}` },
        { tex: `b = \\frac{360}{${p.period}} = ${modelB(p)}` },
      ];
    }
    const greatestAt = p.leastFirst ? second : p.first;
    return [
      { text: `It is greatest at $t = ${greatestAt}$, and every period of $${p.period}$ from there.` },
      ...(greatestAt >= p.period
        ? [{ text: `That is past a whole cycle, so take one period off to find the first greatest after $t = 0$.` }, { tex: `c = ${greatestAt} - ${p.period} = ${fitC(p)}` }]
        : [{ tex: `c = ${fitC(p)}` }]),
    ];
  },
};

interface FitSliderParams extends ModelParams {
  /** The first peak, in twelfths of a period. */
  twelfth: number;
  asks: 'peak' | 'midline';
}

/** Readings every twelfth of a cycle, as dots with no curve: slide to the first peak, or to the midline. */
const modelFitSlider: Generator<FitSliderParams> = {
  id: 'trig-model-fit-slider',
  sample: (rng, difficulty) => ({
    ...sampleModel(rng, difficulty, ['peak']),
    twelfth: rng.pick([1, 2, 4, 5, 7, 8, 10, 11]),
    asks: difficulty > 1 && rng.chance(0.5) ? 'midline' : 'peak',
  }),
  render: (p): Slide => {
    const ctx = ctxOf(p);
    const step = p.period / 12;
    const c = p.twelfth * step;
    const f = (t: number) => p.d + p.a * Math.cos(modelB(p) * (t - c) * DEGREE);
    const readings = Array.from({ length: 25 }, (_, j) => ({ x: j * step, y: f(j * step) }));
    const every = step === 1 ? `every ${ctx.timeOne}` : `every $${step}$ ${ctx.timeUnit}`;
    const intro = `Readings of ${lowerFirst(ctx.subject)}, taken ${every} over two cycles, with $t$ in ${ctx.timeUnit} ${ctx.clock}.`;
    if (p.asks === 'peak') {
      const max = 2 * p.period;
      const svg = plotSvg({
        xMin: 0,
        xMax: max,
        curves: [],
        marks: readings,
        verticals: [{ x: 0, dashed: false }],
        ...modelWindow(p),
        label: 'Readings over two cycles, drawn as dots',
      });
      return {
        kind: 'slider',
        prompt: [
          {
            kind: 'prose',
            text: `${intro} To fit $${ctx.symbol} = d + a\\cos(b(t - c))$, slide to $c$: the first time after $t = 0$ that it is greatest.`,
          },
        ],
        min: 0,
        max,
        step,
        answer: c,
        readout: 'c = {v}',
        figure: { svg, ...markerWindow(0, max) },
      };
    }
    // The window is lopsided on purpose: its middle, where an untouched handle
    // rests, sits a whole number above the midline rather than on it.
    const min = p.d - p.a - 2;
    const max = p.d + 2 * p.a + 2;
    const svg = plotSvg({
      xMin: 0,
      xMax: 2 * p.period,
      curves: [],
      marks: readings,
      yMin: min,
      yMax: max,
      label: 'Readings over two cycles, drawn as dots',
    });
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${intro} To fit $${ctx.symbol} = d + a\\cos(b(t - c))$, slide to the midline $d$.`,
        },
      ],
      min,
      max,
      step: 1,
      answer: p.d,
      readout: 'd = {v}',
      figure: { svg, ...markerWindow(min, max, 'y'), axis: 'y' },
    };
  },
  solution: (p) => {
    const c = (p.twelfth * p.period) / 12;
    if (p.asks === 'peak') {
      return [
        { text: 'A cosine is greatest when its bracket is zero, which in $\\cos(b(t - c))$ is at $t = c$.' },
        { text: `The highest reading in the first cycle is at $t = ${c}$, so $c = ${c}$.` },
      ];
    }
    return [
      { text: `The readings reach $${p.d + p.a}$ at the highest and $${p.d - p.a}$ at the lowest.` },
      { tex: `d = \\frac{${p.d + p.a} + ${paren(p.d - p.a)}}{2} = ${p.d}` },
    ];
  },
};

export const trigonometryGenerators = [
  isPeriodic,
  periodFromPeaks,
  cycleCount,
  midline,
  amplitude,
  horizontalShift,
  sineFromCircle,
  cosineFromCircle,
  periodFromSpeed,
  speedComparison,
  waveRange,
  readParameters,
  evaluateWave,
  waveSlider,
  evaluateExactTrig,
  periodFromB,
  relatedAngleGenerator,
  solveHeight,
  pythagorean,
  repeatTimes,
  periodicFlow,
  waveSwing,
  describeWave,
  circleCoords,
  heightSteps,
  evaluateTree,
  quadrantFlow,
  matchGraph,
  radFromTurn,
  radPlace,
  radArcAngle,
  radCompare,
  radFromDegrees,
  radToDegrees,
  radConvertTiles,
  radUnitTree,
  radExactValue,
  radQuadrantFlow,
  radValueTree,
  radGraphSlider,
  radArcLength,
  radSectorArea,
  radSectorTree,
  radFormulaFlow,
  tanFromPoint,
  tanQuotientTiles,
  tanUndefined,
  tanSignFlow,
  tanAsymptoteSlider,
  tanPeriod,
  tanAsymptoteTiles,
  tanGraphMatch,
  tanExact,
  tanValueTree,
  tanSolve,
  tanSolveSlider,
  recipExact,
  recipTree,
  recipUndefinedFlow,
  recipFromValues,
  recipGraphMatch,
  identityFind,
  identitySquare,
  identityFlow,
  inverseSinExact,
  inverseCosTanExact,
  inversePrincipal,
  inverseCrossingSlider,
  inverseSinTiles,
  inverseRangeFlow,
  inverseNegativeTree,
  inverseGraphMatch,
  inverseDomainRange,
  inverseGraphSlider,
  inverseUndefined,
  inverseUndo,
  inverseUndoFlow,
  inverseTriangle,
  inverseSideTree,
  inverseGeneralTiles,
  inverseGeneralFlow,
  inverseSecondSolution,
  inverseSolutionsSlider,
  modelBuild,
  modelFindB,
  modelExtremesTree,
  modelRead,
  modelPeakSlider,
  modelValueTree,
  modelStartFlow,
  modelGraphMatch,
  modelShiftTiles,
  modelWhenTree,
  modelWhenTiles,
  modelCount,
  modelAbove,
  modelPeriodTree,
  modelFit,
  modelFitSlider,
] as unknown as Generator<unknown>[];
