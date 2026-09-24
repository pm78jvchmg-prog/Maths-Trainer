/**
 * Demo generators for the `venn` widget, ahead of the Probability course
 * (roadmap C16). No lesson asks them yet; the property tests still do.
 *
 * - `venn-counts` fills a two-set diagram with counts from a survey. At
 *   difficulty 1 the overlap is stated; at 2 it has to be found, from how many
 *   are in neither set or in at least one.
 * - `venn-probabilities` does the same with probabilities: the overlap stated,
 *   then found from `P(A \cup B)` or from independence.
 *
 * Regions are held as whole numbers (counts, or hundredths) and written once
 * each, so the bank never offers one value two ways.
 */
import type { Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { decimalTex, sortByValue } from './probTree';

/** Only the first set, both, only the second, neither. */
export type Regions = [number, number, number, number];

interface Context {
  /** Who the counts are of, plural, and one of them. */
  group: string;
  one: string;
  a: string;
  b: string;
  /** Verb phrases: "study French", "study both", … */
  verbA: string;
  verbB: string;
  both: string;
  neither: string;
  union: string;
}

const CONTEXTS: Context[] = [
  {
    group: 'students in a year group',
    one: 'student',
    a: 'F',
    b: 'S',
    verbA: 'study French',
    verbB: 'study Spanish',
    both: 'study both',
    neither: 'study neither',
    union: 'study at least one of the two',
  },
  {
    group: 'households on a street',
    one: 'household',
    a: 'C',
    b: 'D',
    verbA: 'have a cat',
    verbB: 'have a dog',
    both: 'have both',
    neither: 'have neither',
    union: 'have at least one of the two',
  },
  {
    group: 'members of a sports club',
    one: 'member',
    a: 'S',
    b: 'R',
    verbA: 'swim',
    verbB: 'run',
    both: 'do both',
    neither: 'do neither',
    union: 'do at least one of the two',
  },
  {
    group: 'people in a café',
    one: 'person',
    a: 'T',
    b: 'C',
    verbA: 'drink tea',
    verbB: 'drink coffee',
    both: 'drink both',
    neither: 'drink neither',
    union: 'drink at least one of the two',
  },
  {
    group: 'pupils in a school',
    one: 'pupil',
    a: 'C',
    b: 'O',
    verbA: 'sing in the choir',
    verbB: 'play in the orchestra',
    both: 'do both',
    neither: 'do neither',
    union: 'do at least one of the two',
  },
];

export interface VennParams {
  scale: 'counts' | 'probabilities';
  /**
   * What the prompt states beside the two set sizes: the overlap, how many
   * are in neither, how many in at least one, or (probabilities only) that
   * the two events are independent.
   */
  statement: 'both' | 'neither' | 'union' | 'independent';
  context: number;
  /** Whole counts, or hundredths. */
  regions: Regions;
  /** Regions drawn on the diagram rather than left blank. */
  given: number[];
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** A region's value as the diagram writes it. */
function write(params: VennParams, value: number): string {
  return params.scale === 'counts' ? String(value) : decimalTex(value, 2);
}

/** Everything the prompt and the working quote, from the four regions. */
function figures({ regions }: VennParams) {
  const [onlyA, both, onlyB, neither] = regions;
  return {
    a: onlyA + both,
    b: both + onlyB,
    both,
    neither,
    union: onlyA + both + onlyB,
    total: sum(regions),
  };
}

const blanksOf = (params: VennParams) => [0, 1, 2, 3].filter((idx) => !params.given.includes(idx));

/**
 * Wrong values worth offering: a set's size put in its "only" region, the
 * overlap not added back, the union put in the overlap.
 */
function bankOf(params: VennParams): string[] | undefined {
  const f = figures(params);
  const answer = blanksOf(params).map((idx) => params.regions[idx]);
  const whole = params.scale === 'counts' ? f.total : 100;
  const candidates = [
    f.a,
    f.b,
    whole - f.a - f.b,
    f.union,
    whole - f.both,
    f.both + 1,
    f.both * 2,
  ];
  const extras: number[] = [];
  for (const value of candidates) {
    if (value <= 0 || value >= whole) continue;
    if (answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
    if (extras.length === 3) break;
  }
  if (extras.length < 2) return undefined;
  return sortByValue([...answer, ...extras].map((value) => write(params, value)));
}

function drawCounts(rng: Rng): Regions {
  return [rng.int(2, 20), rng.int(1, 12), rng.int(2, 20), rng.int(1, 15)];
}

function drawProbabilities(rng: Rng, statement: VennParams['statement']): Regions {
  if (statement === 'independent') {
    const pa = rng.int(1, 9);
    const pb = rng.int(1, 9);
    return [pa * (10 - pb), pa * pb, (10 - pa) * pb, (10 - pa) * (10 - pb)];
  }
  for (;;) {
    const onlyA = 5 * rng.int(1, 10);
    const both = 5 * rng.int(1, 6);
    const onlyB = 5 * rng.int(1, 10);
    const neither = 100 - onlyA - both - onlyB;
    if (neither >= 5) return [onlyA, both, onlyB, neither];
  }
}

function prompt(params: VennParams): string {
  const c = CONTEXTS[params.context];
  const f = figures(params);
  if (params.scale === 'counts') {
    const third =
      params.statement === 'neither'
        ? `${f.neither} ${c.neither}`
        : params.statement === 'union'
          ? `${f.union} ${c.union}`
          : `${f.both} ${c.both}`;
    return `Of ${f.total} ${c.group}, ${f.a} ${c.verbA}, ${f.b} ${c.verbB} and ${third}. $${c.a}$ is the set that ${c.verbA} and $${c.b}$ the set that ${c.verbB}.`;
  }
  const p = (value: number) => decimalTex(value, 2);
  const events = `A ${c.one} is picked at random. $${c.a}$ is the event that they ${c.verbA}, and $${c.b}$ that they ${c.verbB}.`;
  if (params.statement === 'independent') {
    return `${events} $${c.a}$ and $${c.b}$ are independent, with $P(${c.a}) = ${p(f.a)}$ and $P(${c.b}) = ${p(f.b)}$.`;
  }
  const third =
    params.statement === 'union'
      ? `P(${c.a} \\cup ${c.b}) = ${p(f.union)}`
      : `P(${c.a} \\cap ${c.b}) = ${p(f.both)}`;
  return `${events} $P(${c.a}) = ${p(f.a)}$, $P(${c.b}) = ${p(f.b)}$ and $${third}$.`;
}

function render(params: VennParams) {
  const c = CONTEXTS[params.context];
  return {
    kind: 'venn' as const,
    prompt: [
      { kind: 'prose' as const, text: prompt(params) },
      {
        kind: 'prose' as const,
        text:
          params.scale === 'counts'
            ? 'Fill in the number in each region of the diagram.'
            : 'Fill in the probability of each region of the diagram.',
      },
    ],
    sets: [c.a, c.b] as [string, string],
    ...(params.scale === 'counts' ? { total: figures(params).total } : {}),
    regions: params.regions.map((value, idx) => (params.given.includes(idx) ? write(params, value) : null)),
    bank: bankOf(params)!,
    answer: blanksOf(params).map((idx) => write(params, params.regions[idx])),
  };
}

/**
 * The working, from the middle outwards: the overlap first, since both
 * circles need it, then each "only" region, then what is left over.
 */
function solution(params: VennParams): SolutionStep[] {
  const c = CONTEXTS[params.context];
  const f = figures(params);
  const w = (value: number) => write(params, value);
  const [onlyA, both, onlyB, neither] = params.regions;
  const whole = params.scale === 'counts' ? f.total : 100;
  const n = (set: string) => (params.scale === 'counts' ? `n(${set})` : `P(${set})`);
  const steps: SolutionStep[] = [];
  if (params.statement === 'both') {
    steps.push({ text: `Start in the middle, where the circles overlap: $${n(`${c.a} \\cap ${c.b}`)} = ${w(both)}$.` });
  } else if (params.statement === 'independent') {
    steps.push({
      text: `Independent events multiply, so the overlap is`,
      tex: `P(${c.a} \\cap ${c.b}) = ${w(f.a)} \\times ${w(f.b)} = ${w(both)}`,
    });
  } else {
    if (params.statement === 'neither') {
      steps.push({
        text: `Take away those in neither circle to leave those in at least one:`,
        tex: `${w(whole)} - ${w(neither)} = ${w(f.union)}`,
      });
    }
    steps.push({
      text: `Adding the two circles counts the overlap twice, so their total goes over $${n(`${c.a} \\cup ${c.b}`)}$ by exactly the overlap:`,
      tex: `${w(f.a)} + ${w(f.b)} - ${w(f.union)} = ${w(both)}`,
    });
  }
  steps.push(
    { tex: `\\text{only } ${c.a}: ${w(f.a)} - ${w(both)} = ${w(onlyA)}` },
    { tex: `\\text{only } ${c.b}: ${w(f.b)} - ${w(both)} = ${w(onlyB)}` },
  );
  if (params.statement !== 'neither') {
    steps.push({
      text: `What is left over is in neither circle.`,
      tex: `${w(whole)} - ${w(onlyA)} - ${w(both)} - ${w(onlyB)} = ${w(neither)}`,
    });
  }
  steps.push({
    text:
      params.scale === 'counts'
        ? `The four regions add to ${f.total}, everyone counted once.`
        : `The four regions add to $1$.`,
  });
  return steps;
}

export const vennCounts: Generator<VennParams> = {
  id: 'venn-counts',
  sample(rng, difficulty) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const params: VennParams = {
        scale: 'counts',
        statement: difficulty >= 2 ? rng.pick(['neither', 'union'] as const) : 'both',
        context: rng.int(0, CONTEXTS.length - 1),
        regions: drawCounts(rng),
        // At difficulty 1 the overlap is drawn in, as the stated number it is.
        given: difficulty >= 2 ? [] : [1],
      };
      if (bankOf(params)) return params;
    }
    throw new Error('venn-counts: no draw with a fair bank in 200 attempts');
  },
  render,
  solution,
};

export const vennProbabilities: Generator<VennParams> = {
  id: 'venn-probabilities',
  sample(rng, difficulty) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const statement = difficulty >= 2 ? rng.pick(['union', 'independent'] as const) : 'both';
      const params: VennParams = {
        scale: 'probabilities',
        statement,
        context: rng.int(0, CONTEXTS.length - 1),
        regions: drawProbabilities(rng, statement),
        given: [],
      };
      if (bankOf(params)) return params;
    }
    throw new Error('venn-probabilities: no draw with a fair bank in 200 attempts');
  },
  render,
  solution,
};

export const vennGenerators = [vennCounts, vennProbabilities];
