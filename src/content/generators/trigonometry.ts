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
import type { Generator, KeypadKey, Slide } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { plotSvg, wave } from '../figures';
import { bin, num, trig, valueOf, type Expr } from '../expr';

/** Plain number entry. The base keypad already supplies digits and signs. */
const NUMBER_KEYS: KeypadKey[] = [{ insert: '.' }, { insert: '/' }];

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
}

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
    };
  },
  render: ({ radius, degrees, twice }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A point starts at the far right of a circle of radius $${radius}$ centred at the origin, and turns $${degrees}^{\\circ}$ anticlockwise. How high is it above the centre?`,
      },
    ],
    lead: '\\text{height} =',
    keypad: NUMBER_KEYS,
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
    };
  },
  render: ({ radius, degrees, twice }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The same point on a circle of radius $${radius}$ turns $${degrees}^{\\circ}$ anticlockwise from the far right. How far is it to the right of the centre?`,
      },
    ],
    lead: '\\text{displacement} =',
    keypad: NUMBER_KEYS,
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
        { tex: `${midline + amplitude} - ${midline} = ${amplitude}` },
        {
          text: `The full swing from trough to peak is $${2 * amplitude}$, which is twice the amplitude and the most common wrong answer here.`,
        },
      ];
    }
    return [
      {
        text: 'The midline sits halfway between the highest and lowest the wave reaches, so the curve spends as long above it as below.',
      },
      { tex: `\\frac{${midline + amplitude} + ${midline - amplitude}}{2} = ${midline}` },
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
        { tex: `${a} \\times ${v1} + ${b} = ${a * v1} + ${b} = ${total}` },
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
      { tex: `${a} \\times ${v1} - ${b} \\times ${v2} = ${a * v1} - ${b * v2} = ${total}` },
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
      tex: `\\frac{${midline + amplitude} + ${midline - amplitude}}{2} = ${midline}`,
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
        tex: `${a} \\times ${v1} = ${a * v1} \\qquad ${b} \\times ${v2} = ${b * v2} \\qquad ${a * v1} + ${b * v2} = ${a * v1 + b * v2}`,
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
] as unknown as Generator<unknown>[];
