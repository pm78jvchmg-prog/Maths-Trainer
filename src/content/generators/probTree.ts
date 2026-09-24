/**
 * Demo generators for the `probTree` widget, ahead of the Probability course
 * (roadmap C16). No lesson asks them yet; the property tests still do.
 *
 * - `ptree-fill` leaves some branch probabilities blank: counters taken
 *   without replacement (fractions), or a two-stage event with conditional
 *   probabilities (decimals), with two or three first-stage branches.
 * - `ptree-path` shows every probability and asks for one outcome: the path
 *   with a stated probability, or the likeliest or least likely one. Either
 *   way the learner has to multiply along the branches to find it.
 *
 * Every value is held as an exact fraction of whole numbers and written one
 * way per slide: a decimal family writes decimals, the counters write the
 * unsimplified fraction of what is left in the bag. `gradeSequence` compares
 * exact tokens, so a bank never holds two spellings of one value.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';

type ProbTreeSlide = Extract<Slide, { kind: 'probTree' }>;

/* ---------- Values ---------- */

/** An exact probability `num / den`, and how the tree writes it. */
interface Prob {
  num: number;
  den: number;
  style: 'decimal' | 'fraction';
}

/**
 * A whole number of `10^-places` units written as the shortest decimal:
 * `decimalTex(70, 2)` is `0.7`, `decimalTex(135, 3)` is `0.135`. Integer
 * arithmetic throughout, so no float ever decides a digit.
 */
export function decimalTex(units: number, places: number): string {
  const scale = 10 ** places;
  const whole = Math.floor(units / scale);
  const frac = String(units % scale).padStart(places, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : String(whole);
}

/** A value token as a number: `\frac{a}{b}`, a decimal or a whole number. */
export function tokenValue(tex: string): number | undefined {
  const frac = /^\\frac\{(\d+)\}\{(\d+)\}$/.exec(tex);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  if (/^\d+(\.\d+)?$/.test(tex)) return Number(tex);
  return undefined;
}

/** Smallest value first; a tie (the same token twice) keeps its spelling order. */
export function sortByValue(tokens: string[]): string[] {
  return [...tokens].sort(
    (a, b) => (tokenValue(a) ?? 0) - (tokenValue(b) ?? 0) || a.localeCompare(b),
  );
}

const dec = (hundredths: number): Prob => ({ num: hundredths, den: 100, style: 'decimal' });
const frac = (top: number, bottom: number): Prob => ({ num: top, den: bottom, style: 'fraction' });

function texOf(p: Prob): string {
  if (p.style === 'fraction') return `\\frac{${p.num}}{${p.den}}`;
  return decimalTex(p.num, Math.round(Math.log10(p.den)));
}

const times = (p: Prob, q: Prob): Prob => ({ num: p.num * q.num, den: p.den * q.den, style: p.style });
const sameValue = (p: Prob, q: Prob) => p.num * q.den === q.num * p.den;
const less = (p: Prob, q: Prob) => p.num * q.den < q.num * p.den;

/* ---------- Contexts ---------- */

interface CountersContext {
  a: string;
  b: string;
  setup: (a: number, b: number) => string;
}

/** Two kinds of thing, two taken without replacement. */
const COUNTERS: CountersContext[] = [
  {
    a: 'R',
    b: 'B',
    setup: (a, b) =>
      `A bag holds ${a} red counters and ${b} blue ones. Two are taken out at random, one after the other, without replacement; $R$ is red and $B$ is blue.`,
  },
  {
    a: 'D',
    b: 'M',
    setup: (a, b) =>
      `A box holds ${a} dark chocolates and ${b} milk ones. Two are picked at random and eaten, one after the other; $D$ is dark and $M$ is milk.`,
  },
  {
    a: 'K',
    b: 'W',
    setup: (a, b) =>
      `A drawer holds ${a} black socks and ${b} white ones. Two are pulled out at random, one after the other; $K$ is black and $W$ is white.`,
  },
  {
    a: 'G',
    b: 'B',
    setup: (a, b) =>
      `A team has ${a} girls and ${b} boys. A captain is picked at random, then a vice-captain from the rest; $G$ is a girl and $B$ a boy.`,
  },
  {
    a: 'L',
    b: 'O',
    setup: (a, b) =>
      `A jar holds ${a} lemon sweets and ${b} orange ones. Two are taken at random, one after the other, and not put back; $L$ is lemon and $O$ is orange.`,
  },
];

interface ConditionalContext {
  a: string;
  b: string;
  setup: string;
}

/** A first event, then a second whose chance depends on it. */
const CONDITIONAL: ConditionalContext[] = [
  { a: 'R', b: 'L', setup: `$R$ is the event that it rains on a school day, and $L$ that Sam is late.` },
  { a: 'T', b: 'M', setup: `$T$ is the event that Priya's train is delayed, and $M$ that she misses her meeting.` },
  { a: 'W', b: 'V', setup: `$W$ is the event that a team wins the toss, and $V$ that it wins the match.` },
  { a: 'F', b: 'P', setup: `$F$ is the event that a patient has flu, and $P$ that their test comes back positive.` },
  { a: 'S', b: 'C', setup: `$S$ is the event that a day is sunny, and $C$ that the café sells out of ice cream.` },
];

interface ThreeContext {
  firsts: [string, string, string];
  b: string;
  setup: string;
  /** Range of the second-stage probability, in hundredths. */
  rate: [number, number];
  /** The second stage does not depend on the first. */
  independent?: boolean;
  /** Whether "most likely" is worth asking: not when one branch dominates every path. */
  most: boolean;
}

/** Three first-stage branches, then an event that may depend on which. */
const THREE: ThreeContext[] = [
  {
    firsts: ['A', 'B', 'C'],
    b: 'D',
    setup: `A factory's three machines, $A$, $B$ and $C$, make all of its items. An item is picked at random, and $D$ is the event that it is faulty.`,
    rate: [1, 15],
    most: false,
  },
  {
    firsts: ['B', 'C', 'W'],
    b: 'L',
    setup: `Ali gets to school by bus, $B$, by car, $C$, or on foot, $W$. $L$ is the event that Ali is late.`,
    rate: [5, 45],
    most: true,
  },
  {
    firsts: ['1', '2', '3'],
    b: 'H',
    setup: `A spinner lands on $1$, $2$ or $3$, and then a biased coin is tossed. $H$ is the event that the coin lands heads.`,
    rate: [15, 85],
    independent: true,
    most: true,
  },
];

/* ---------- The tree ---------- */

export interface ProbTreeParams {
  family: 'counters' | 'conditional' | 'three';
  context: number;
  /**
   * counters: how many of each kind. conditional: `P(A)`, `P(B | A)` and
   * `P(B | A')` in hundredths. three: the first two shares, then `P(B)` under
   * each first-stage branch, all in hundredths (the third share is the rest).
   */
  values: number[];
  /**
   * Blank branches by flat index: the first stage top to bottom, then the
   * second stage top to bottom. Empty in path mode.
   */
  blanks: number[];
  /** Path mode: what is asked, and the leaf (top to bottom) that answers it. */
  ask?: 'product' | 'most' | 'least';
  leaf?: number;
}

interface Branch {
  label: string;
  p: Prob;
}

interface Tree {
  first: Branch[];
  second: Branch[][];
}

const not = (label: string) => `${label}'`;

export function buildTree({ family, context, values }: ProbTreeParams): Tree {
  if (family === 'counters') {
    const { a, b } = COUNTERS[context];
    const [x, y] = values;
    const n = x + y;
    return {
      first: [
        { label: a, p: frac(x, n) },
        { label: b, p: frac(y, n) },
      ],
      second: [
        [
          { label: a, p: frac(x - 1, n - 1) },
          { label: b, p: frac(y, n - 1) },
        ],
        [
          { label: a, p: frac(x, n - 1) },
          { label: b, p: frac(y - 1, n - 1) },
        ],
      ],
    };
  }
  if (family === 'conditional') {
    const { a, b } = CONDITIONAL[context];
    const [pa, given, otherwise] = values;
    const pair = (h: number): Branch[] => [
      { label: b, p: dec(h) },
      { label: not(b), p: dec(100 - h) },
    ];
    return {
      first: [
        { label: a, p: dec(pa) },
        { label: not(a), p: dec(100 - pa) },
      ],
      second: [pair(given), pair(otherwise)],
    };
  }
  const { firsts, b } = THREE[context];
  const [s1, s2, ...rates] = values;
  const shares = [s1, s2, 100 - s1 - s2];
  return {
    first: firsts.map((label, idx) => ({ label, p: dec(shares[idx]) })),
    second: rates.map((h) => [
      { label: b, p: dec(h) },
      { label: not(b), p: dec(100 - h) },
    ]),
  };
}

/** Every branch in flat order: the first stage, then the second, top to bottom. */
function flat(tree: Tree): Branch[] {
  return [...tree.first, ...tree.second.flat()];
}

/** The leaves, top to bottom, with the two branches that reach each. */
function leaves(tree: Tree): { path: [Branch, Branch]; p: Prob }[] {
  return tree.first.flatMap((top, i) =>
    tree.second[i].map((under) => ({ path: [top, under] as [Branch, Branch], p: times(top.p, under.p) })),
  );
}

/** How a branch is written as a probability: `P(R)`, or `P(L' \mid R)` under a first-stage branch. */
function branchName(tree: Tree, index: number): string {
  const k = tree.first.length;
  if (index < k) return `P(${tree.first[index].label})`;
  const group = Math.floor((index - k) / 2);
  const under = tree.second[group][(index - k) % 2];
  return `P(${under.label} \\mid ${tree.first[group].label})`;
}

/**
 * An outcome as a probability. Two draws from one bag share their labels, so
 * `P(R \cap R)` would read as one event; those are written in draw order.
 */
function outcomeName(params: ProbTreeParams, top: Branch, under: Branch): string {
  return params.family === 'counters'
    ? `P(${top.label}${under.label})`
    : `P(${top.label} \\cap ${under.label})`;
}

function slideBranches(tree: Tree, blanks: number[]): ProbTreeSlide['branches'] {
  const k = tree.first.length;
  return tree.first.map((top, i) => ({
    label: top.label,
    p: blanks.includes(i) ? null : texOf(top.p),
    next: tree.second[i].map((under, j) => ({
      label: under.label,
      p: blanks.includes(k + 2 * i + j) ? null : texOf(under.p),
    })),
  }));
}

/* ---------- Fill ---------- */

/**
 * Wrong values worth offering, most telling first: for the counters, the
 * total not reduced after the first draw; for a decimal tree, the given value
 * left uncomplemented and near misses of each answer.
 */
function distractors(params: ProbTreeParams, tree: Tree): Prob[] {
  const all = flat(tree);
  if (params.family === 'counters') {
    const [x, y] = params.values;
    const n = x + y;
    const small = Math.min(x, y);
    const big = Math.max(x, y);
    return [
      frac(x - 1, n),
      frac(y - 1, n),
      frac(x, n),
      frac(y, n),
      ...(small < big ? [frac(small, big)] : []),
      frac(x + 1, n),
    ];
  }
  const out: Prob[] = [];
  const k = tree.first.length;
  for (const index of params.blanks) {
    // The given branches beside this blank: the value a learner copies across
    // rather than taking away from 1.
    const siblings =
      index < k
        ? tree.first.filter((_, i) => i !== index)
        : tree.second[Math.floor((index - k) / 2)].filter((_, j) => j !== (index - k) % 2);
    for (const sibling of siblings) out.push(sibling.p);
    // Only one of three first-stage shares taken away.
    if (index < k && siblings.length === 2) {
      for (const sibling of siblings) out.push(dec(100 - sibling.p.num));
    }
  }
  for (const index of params.blanks) {
    const answer = all[index].p.num;
    out.push(dec(answer + 10), dec(answer - 10), dec(answer + 5), dec(answer - 5));
  }
  return out;
}

function fillBank(params: ProbTreeParams, tree: Tree): string[] | undefined {
  const all = flat(tree);
  const answer = params.blanks.map((index) => all[index].p);
  const extras: Prob[] = [];
  for (const candidate of distractors(params, tree)) {
    if (candidate.num <= 0 || candidate.num >= candidate.den) continue;
    if (answer.some((p) => sameValue(p, candidate))) continue;
    if (extras.some((p) => sameValue(p, candidate))) continue;
    extras.push(candidate);
    if (extras.length === 3) break;
  }
  if (extras.length < 2) return undefined;
  return sortByValue([...answer, ...extras].map(texOf));
}

/** One blank per sibling group, at a random place in it. */
function onePerGroup(rng: Rng, tree: Tree): number[] {
  const k = tree.first.length;
  return [rng.int(0, k - 1), ...tree.second.map((_, i) => k + 2 * i + rng.int(0, 1))];
}

function drawCounters(rng: Rng): number[] {
  for (;;) {
    const x = rng.int(2, 9);
    const y = rng.int(2, 9);
    if (x + y <= 14) return [x, y];
  }
}

function drawThree(rng: Rng, context: number): number[] {
  const { rate, independent } = THREE[context];
  for (;;) {
    const s1 = 5 * rng.int(2, 12);
    const s2 = 5 * rng.int(2, 12);
    if (100 - s1 - s2 < 10) continue;
    const r = () => rng.int(rate[0], rate[1]);
    const first = r();
    return independent ? [s1, s2, first, first, first] : [s1, s2, first, r(), r()];
  }
}

function sampleFill(rng: Rng, difficulty: number): ProbTreeParams {
  if (difficulty >= 2) {
    if (rng.chance(0.4)) {
      // Every branch blank: the whole bag worked out from the counts.
      const context = rng.int(0, COUNTERS.length - 1);
      return { family: 'counters', context, values: drawCounters(rng), blanks: [0, 1, 2, 3, 4, 5] };
    }
    const context = rng.int(0, THREE.length - 1);
    const base: ProbTreeParams = { family: 'three', context, values: drawThree(rng, context), blanks: [] };
    return { ...base, blanks: onePerGroup(rng, buildTree(base)) };
  }
  if (rng.chance(0.5)) {
    // The first draw given; what is left after it is the question.
    const context = rng.int(0, COUNTERS.length - 1);
    return { family: 'counters', context, values: drawCounters(rng), blanks: [2, 3, 4, 5] };
  }
  const context = rng.int(0, CONDITIONAL.length - 1);
  const base: ProbTreeParams = {
    family: 'conditional',
    context,
    values: [5 * rng.int(2, 18), 5 * rng.int(1, 19), 5 * rng.int(1, 19)],
    blanks: [],
  };
  return { ...base, blanks: onePerGroup(rng, buildTree(base)) };
}

function setupOf(params: ProbTreeParams): string {
  if (params.family === 'counters') {
    return COUNTERS[params.context].setup(params.values[0], params.values[1]);
  }
  if (params.family === 'conditional') return CONDITIONAL[params.context].setup;
  return THREE[params.context].setup;
}

export const ptreeFill: Generator<ProbTreeParams> = {
  id: 'ptree-fill',
  sample(rng, difficulty) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const params = sampleFill(rng, difficulty);
      if (fillBank(params, buildTree(params))) return params;
    }
    throw new Error('ptree-fill: no draw with a fair bank in 200 attempts');
  },
  render(params) {
    const tree = buildTree(params);
    const all = flat(tree);
    return {
      kind: 'probTree',
      mode: 'fill',
      prompt: [
        { kind: 'prose', text: setupOf(params) },
        { kind: 'prose', text: 'Fill in the missing probabilities on the tree.' },
      ],
      branches: slideBranches(tree, params.blanks),
      bank: fillBank(params, tree)!,
      answer: params.blanks.map((index) => texOf(all[index].p)),
    };
  },
  solution(params) {
    const tree = buildTree(params);
    if (params.family === 'counters') {
      const [x, y] = params.values;
      const n = x + y;
      const [a, b] = [tree.first[0].label, tree.first[1].label];
      const steps: SolutionStep[] = [];
      if (params.blanks.includes(0)) {
        steps.push({
          text: `At the first draw there are ${n} altogether, ${x} of them $${a}$ and ${y} of them $${b}$.`,
          tex: `P(${a}) = \\frac{${x}}{${n}}, \\quad P(${b}) = \\frac{${y}}{${n}}`,
        });
      }
      steps.push(
        {
          text: `After one $${a}$ is taken, ${n - 1} are left and ${x === 2 ? `just one of them is` : `only ${x - 1} of them are`} $${a}$, so the branches after $${a}$ are $\\frac{${x - 1}}{${n - 1}}$ for $${a}$ and $\\frac{${y}}{${n - 1}}$ for $${b}$.`,
        },
        {
          text: `After one $${b}$ is taken, ${n - 1} are left, ${x} of them $${a}$ and ${y - 1} of them $${b}$: $\\frac{${x}}{${n - 1}}$ and $\\frac{${y - 1}}{${n - 1}}$.`,
        },
        { text: `Each pair of branches from one point adds to $1$, which is a quick check.` },
      );
      return steps;
    }
    const k = tree.first.length;
    const all = flat(tree);
    return [
      { text: `The branches leaving any one point cover every possibility, so they add to $1$.` },
      ...params.blanks.map((index): SolutionStep => {
        const siblings =
          index < k
            ? tree.first.filter((_, i) => i !== index)
            : tree.second[Math.floor((index - k) / 2)].filter((_, j) => j !== (index - k) % 2);
        const taken = siblings.map((s) => ` - ${texOf(s.p)}`).join('');
        return { tex: `${branchName(tree, index)} = 1${taken} = ${texOf(all[index].p)}` };
      }),
    ];
  },
};

/* ---------- Path ---------- */

/** The leaf a question points at, or undefined when the answer would not be unique. */
function pathLeaf(tree: Tree, ask: NonNullable<ProbTreeParams['ask']>, leaf: number): number | undefined {
  const outcomes = leaves(tree).map((entry) => entry.p);
  if (ask === 'product') {
    const target = outcomes[leaf];
    return outcomes.every((p, idx) => idx === leaf || !sameValue(p, target)) ? leaf : undefined;
  }
  const order = outcomes.map((_, idx) => idx).sort((i, j) =>
    less(outcomes[i], outcomes[j]) ? -1 : less(outcomes[j], outcomes[i]) ? 1 : 0,
  );
  const [best, next] = ask === 'least' ? [order[0], order[1]] : [order.at(-1)!, order.at(-2)!];
  // Clear by at least half a hundredth, so the choice never turns on a digit
  // in the fourth place.
  const gap = Math.abs(outcomes[best].num / outcomes[best].den - outcomes[next].num / outcomes[next].den);
  return gap >= 0.005 ? best : undefined;
}

function samplePath(rng: Rng, difficulty: number): ProbTreeParams {
  if (difficulty >= 2) {
    const context = rng.int(0, THREE.length - 1);
    const asks: NonNullable<ProbTreeParams['ask']>[] = THREE[context].most
      ? ['product', 'most', 'least']
      : ['product', 'least'];
    return {
      family: 'three',
      context,
      values: drawThree(rng, context),
      blanks: [],
      ask: rng.pick(asks),
      leaf: rng.int(0, 5),
    };
  }
  if (rng.chance(0.4)) {
    // Both the same kind: the two mixed paths share a probability, so only
    // these two can be pointed at by value.
    return {
      family: 'counters',
      context: rng.int(0, COUNTERS.length - 1),
      values: drawCounters(rng),
      blanks: [],
      ask: 'product',
      leaf: rng.pick([0, 3]),
    };
  }
  return {
    family: 'conditional',
    context: rng.int(0, CONDITIONAL.length - 1),
    values: [5 * rng.int(2, 18), 5 * rng.int(1, 19), 5 * rng.int(1, 19)],
    blanks: [],
    ask: 'product',
    leaf: rng.int(0, 3),
  };
}

/** The leaf the question points at, once `sample` has settled it. */
function answerLeaf(params: ProbTreeParams): number {
  return pathLeaf(buildTree(params), params.ask!, params.leaf!)!;
}

function askText(params: ProbTreeParams, tree: Tree): string {
  if (params.ask === 'most') return 'Which single outcome is the most likely?';
  if (params.ask === 'least') return 'Which single outcome is the least likely?';
  return `Which outcome has probability $${texOf(leaves(tree)[answerLeaf(params)].p)}$?`;
}

export const ptreePath: Generator<ProbTreeParams> = {
  id: 'ptree-path',
  sample(rng, difficulty) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const params = samplePath(rng, difficulty);
      const leaf = pathLeaf(buildTree(params), params.ask!, params.leaf!);
      if (leaf !== undefined) return { ...params, leaf };
    }
    throw new Error('ptree-path: no draw with a single answer in 200 attempts');
  },
  render(params) {
    const tree = buildTree(params);
    const { path } = leaves(tree)[answerLeaf(params)];
    return {
      kind: 'probTree',
      mode: 'path',
      prompt: [
        { kind: 'prose', text: setupOf(params) },
        { kind: 'prose', text: `${askText(params, tree)} Tap its branch at each stage.` },
      ],
      branches: slideBranches(tree, []),
      bank: [],
      answer: path.map((branch) => branch.label),
    };
  },
  solution(params) {
    const tree = buildTree(params);
    const outcomes = leaves(tree);
    const chosen = outcomes[answerLeaf(params)];
    const [top, under] = chosen.path;
    const verdict =
      params.ask === 'most'
        ? 'is the largest'
        : params.ask === 'least'
          ? 'is the smallest'
          : `is $${texOf(chosen.p)}$`;
    return [
      { text: `The probability of an outcome is the product of the branches along its path.` },
      ...outcomes.map(
        ({ path: [a, b], p }): SolutionStep => ({
          tex: `${outcomeName(params, a, b)} = ${texOf(a.p)} \\times ${texOf(b.p)} = ${texOf(p)}`,
        }),
      ),
      {
        text: `Only $${outcomeName(params, top, under)}$ ${verdict}, so the path is $${top.label}$ then $${under.label}$.`,
      },
    ];
  },
};

export const probTreeGenerators = [ptreeFill, ptreePath];
