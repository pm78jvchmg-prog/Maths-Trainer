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
] as unknown as Generator<unknown>[];
