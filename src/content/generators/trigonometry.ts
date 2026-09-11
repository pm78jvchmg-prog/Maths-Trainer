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
] as unknown as Generator<unknown>[];
