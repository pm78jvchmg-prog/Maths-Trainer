/**
 * Contest Math, level 7: Combinatorics.
 *
 * Five lessons, each on one counting move: multiply the choices, filling the
 * most restricted place first and splitting into cases when two restrictions
 * clash; sort two overlapping groups into the four regions of a Venn
 * diagram, or ask how big the overlap could be; branch on the first move (or
 * the first die, or the biggest stamp) and add the branches; count too much
 * on purpose and divide by how often each thing was counted; and pair a case
 * with its mirror image, so that half, a third or a sixth of the whole is the
 * answer.
 *
 * Level 1 already asks handshakes, outfits, multiples in a range, fence posts,
 * page digits and a Venn diagram of multiples; nothing here repeats those.
 * Shared helpers are in `contestMath.ts`.
 */
import type { Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { num, numberBank, numberOptions, say, typed } from './contestMath';

/* ---------- small helpers ---------- */

function fact(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

/** n × (n − 1) × … taking k factors. */
function perm(n: number, k: number): number {
  let out = 1;
  for (let i = 0; i < k; i += 1) out *= n - i;
  return out;
}

const choose = (n: number, k: number) => perm(n, k) / fact(k);

/** `2, 5 and 7`. */
function listText(items: (string | number)[]): string {
  const words = items.map(String);
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** Numbers as one TeX line, `1,\ 2,\ 3`, or several lines of `per` when long. */
function texRows(values: number[], per = 6): SolutionStep[] {
  const out: SolutionStep[] = [];
  for (let i = 0; i < values.length; i += per) {
    out.push({ tex: values.slice(i, i + per).join(',\\ ') });
  }
  return out;
}

const DIGIT_WORD: Record<number, string> = { 3: 'three', 4: 'four' };

/* ================================================================
 * Lesson 1: Counting
 * ================================================================ */

/* ---------- numbers from a set of digits, no repeats ---------- */

interface DigitParams {
  digits: number[];
  len: number;
}

const firstChoices = (digits: number[]) => (digits.includes(0) ? digits.length - 1 : digits.length);
const digitCount = ({ digits, len }: DigitParams) => firstChoices(digits) * perm(digits.length - 1, len - 1);

const ONE_TO_NINE = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const cmDigitChoices: Generator<DigitParams> = {
  id: 'cm-digit-choices',
  sample(rng, difficulty) {
    const k = rng.int(4, 7);
    if (difficulty >= 2) {
      const digits = [0, ...rng.sample(ONE_TO_NINE, k - 1)].sort((a, b) => a - b);
      return { digits, len: k >= 5 && rng.chance(0.4) ? 4 : 3 };
    }
    return { digits: rng.sample(ONE_TO_NINE, k).sort((a, b) => a - b), len: 3 };
  },
  render(p) {
    return typed(
      [say(`How many ${DIGIT_WORD[p.len]}-digit numbers can be made from the digits ${listText(p.digits)}, using each digit at most once?`)],
      digitCount(p),
      '\\text{numbers} =',
    );
  },
  choices(p) {
    const k = p.digits.length;
    const answer = digitCount(p);
    if (p.digits.includes(0)) {
      return numberOptions(answer, [perm(k, p.len), perm(k - 1, p.len), (k - 1) * k ** (p.len - 1)], 1, 1);
    }
    return numberOptions(answer, [k ** p.len, perm(k, p.len) / fact(p.len), perm(k - 1, p.len)], 1, 1);
  },
  solution(p) {
    const k = p.digits.length;
    const rest = Array.from({ length: p.len - 1 }, (_, i) => k - 1 - i);
    if (p.digits.includes(0)) {
      return [
        { text: `Fill the most restricted place first. The first digit cannot be 0, so it has ${k - 1} choices.` },
        { text: `The next place may use 0 but not the digit already used, so it also has ${k - 1} choices, and each place after that has one fewer:` },
        { tex: `${[k - 1, ...rest].join(' \\times ')} = ${digitCount(p)}` },
        { text: `Using all ${k} digits in the first place would count numbers starting with 0, which have fewer digits.` },
      ];
    }
    return [
      { text: `The first digit can be any of the ${k}. Each place after that can use any digit not yet used, one fewer each time:` },
      { tex: `${[k, ...rest].join(' \\times ')} = ${digitCount(p)}` },
    ];
  },
};

/* ---------- odd or even: the units digit first ---------- */

interface ParityParams {
  digits: number[];
  want: 'odd' | 'even';
}

const isWanted = (d: number, want: 'odd' | 'even') => (want === 'odd' ? d % 2 === 1 : d % 2 === 0);

function parityCount({ digits, want }: ParityParams): number {
  const k = digits.length;
  if (!digits.includes(0)) return digits.filter((d) => isWanted(d, want)).length * (k - 1) * (k - 2);
  // Even, with a 0: units 0 leaves the front free; a nonzero even units digit does not.
  const e = digits.filter((d) => d !== 0 && d % 2 === 0).length;
  return (k - 1) * (k - 2) + e * (k - 2) * (k - 2);
}

const cmOddEvenDigits: Generator<ParityParams> = {
  id: 'cm-odd-even-digits',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const k = rng.int(5, 6);
        const digits = [0, ...rng.sample(ONE_TO_NINE, k - 1)].sort((a, b) => a - b);
        const e = digits.filter((d) => d !== 0 && d % 2 === 0).length;
        if (e >= 1 && e <= k - 3) return { digits, want: 'even' };
        continue;
      }
      const k = rng.int(4, 6);
      const digits = rng.sample(ONE_TO_NINE, k).sort((a, b) => a - b);
      const want = rng.pick(['odd', 'even'] as const);
      const w = digits.filter((d) => isWanted(d, want)).length;
      if (w >= 1 && w <= k - 1 && 2 * w !== k) return { digits, want };
    }
  },
  render(p) {
    return typed(
      [say(`How many ${p.want} three-digit numbers can be made from the digits ${listText(p.digits)}, using each digit at most once?`)],
      parityCount(p),
      '\\text{numbers} =',
    );
  },
  choices(p) {
    const k = p.digits.length;
    const answer = parityCount(p);
    if (p.digits.includes(0)) {
      const e = p.digits.filter((d) => d !== 0 && d % 2 === 0).length;
      return numberOptions(answer, [(e + 1) * (k - 2) * (k - 2), (e + 1) * (k - 1) * (k - 2), perm(k, 3) / 2], 1, 1);
    }
    const w = p.digits.filter((d) => isWanted(d, p.want)).length;
    return numberOptions(answer, [perm(k, 3) / 2, w * (k - 1) * (k - 1), w * k * (k - 1)], 1, 1);
  },
  solution(p) {
    const k = p.digits.length;
    if (!p.digits.includes(0)) {
      const units = p.digits.filter((d) => isWanted(d, p.want));
      return [
        { text: `Whether a number is ${p.want} depends only on its units digit, so fill that place first: ${listText(units)}, ${units.length} choice${units.length === 1 ? '' : 's'}.` },
        { text: `The hundreds digit is then any of the ${k - 1} left, and the tens any of the ${k - 2} after that:` },
        { tex: `${units.length} \\times ${k - 1} \\times ${k - 2} = ${parityCount(p)}` },
      ];
    }
    const evens = p.digits.filter((d) => d !== 0 && d % 2 === 0);
    const zeroCase = (k - 1) * (k - 2);
    const otherCase = evens.length * (k - 2) * (k - 2);
    return [
      { text: 'The units digit must be even, but 0 is also the one digit that cannot lead, so split into cases.' },
      { text: `Units digit 0: the first digit is any of the other ${k - 1}, and the middle any of the ${k - 2} left.` },
      { tex: `${k - 1} \\times ${k - 2} = ${zeroCase}` },
      { text: `Units digit ${listText(evens)}: the first digit cannot be 0 or the units digit, ${k - 2} choices; the middle may be 0, ${k - 2} choices.` },
      { tex: `${evens.length} \\times ${k - 2} \\times ${k - 2} = ${otherCase}` },
      { tex: `${zeroCase} + ${otherCase} = ${parityCount(p)}` },
    ];
  },
};

/* ---------- neighbours different: stripes, houses, codes ---------- */

interface StripeParams {
  context: number;
  n: number;
  k: number;
  /** Difficulty 2: the first item may not take one particular colour. */
  banned: boolean;
}

const letterUpTo = (k: number) => String.fromCharCode(64 + k);

const STRIPES = [
  {
    setup: (n: number, k: number, banned: boolean) =>
      `A flag has ${n} horizontal stripes, each coloured with one of ${k} colours${banned ? ', one of which is white' : ''}. Stripes that touch must be different colours.${banned ? ' The top stripe may not be white.' : ''}`,
    ask: 'How many different flags are possible?',
    lead: '\\text{flags} =',
    things: 'stripes',
    tableAsk: 'Fill in the number of ways to colour just the top 1, 2, 3, … stripes.',
    first: 'The top stripe',
    later: 'each stripe below',
    colour: 'white',
  },
  {
    setup: (n: number, k: number, banned: boolean) =>
      `A row of ${n} houses is painted, each in one of ${k} colours${banned ? ', one of which is red' : ''}. Next-door houses must be different colours.${banned ? ' The first house may not be red.' : ''}`,
    ask: 'In how many ways can the row be painted?',
    lead: '\\text{ways} =',
    things: 'houses',
    tableAsk: 'Fill in the number of ways to paint just the first 1, 2, 3, … houses.',
    first: 'The first house',
    later: 'each house after it',
    colour: 'red',
  },
  {
    setup: (n: number, k: number, banned: boolean) =>
      `A code is ${n} letters long, each letter one of A to ${letterUpTo(k)}. No letter may appear twice in a row.${banned ? ' The code may not start with A.' : ''}`,
    ask: 'How many codes are possible?',
    lead: '\\text{codes} =',
    things: 'letters',
    tableAsk: 'Fill in the number of ways to write just the first 1, 2, 3, … letters.',
    first: 'The first letter',
    later: 'each letter after it',
    colour: 'A',
  },
];

const stripeFirst = (p: StripeParams) => (p.banned ? p.k - 1 : p.k);
const stripeWays = (p: StripeParams, n = p.n) => stripeFirst(p) * (p.k - 1) ** (n - 1);

function sampleStripes(rng: Rng, difficulty: number): StripeParams {
  return { context: rng.int(0, STRIPES.length - 1), n: rng.int(3, 5), k: rng.int(3, 6), banned: difficulty >= 2 };
}

function stripeSolution(p: StripeParams): SolutionStep[] {
  const c = STRIPES[p.context];
  const steps: SolutionStep[] = [];
  if (p.banned) {
    steps.push({ text: `${c.first} cannot be ${c.colour}: ${p.k - 1} choices.` });
    steps.push({ text: `After that, ${c.later} only has to differ from the one just before it, and ${c.colour} is allowed again: ${p.k - 1} choices each time.` });
  } else {
    steps.push({ text: `${c.first} can be any of the ${p.k}.` });
    steps.push({ text: `After that, ${c.later} only has to differ from the one just before it: ${p.k - 1} choices each time, whatever came before.` });
  }
  steps.push({ tex: `${stripeFirst(p)} \\times ${p.k - 1}^{${p.n - 1}} = ${stripeWays(p)}` });
  return steps;
}

const cmStripes: Generator<StripeParams> = {
  id: 'cm-stripes',
  sample: sampleStripes,
  render(p) {
    const c = STRIPES[p.context];
    return typed([say(c.setup(p.n, p.k, p.banned)), say(c.ask)], stripeWays(p), c.lead);
  },
  choices(p) {
    const { n, k } = p;
    if (p.banned) return numberOptions(stripeWays(p), [k * (k - 1) ** (n - 1), (k - 1) * (k - 2) ** (n - 1), (k - 1) ** (n - 1), k ** n], 1, 1);
    return numberOptions(stripeWays(p), [k ** n, perm(k, n), (k - 1) ** n, k * (k - 1)], 1, 1);
  },
  solution: stripeSolution,
};

const cmStripesTable: Generator<StripeParams> = {
  id: 'cm-stripes-table',
  sample: sampleStripes,
  render(p) {
    const c = STRIPES[p.context];
    const values = Array.from({ length: p.n }, (_, i) => stripeWays(p, i + 1));
    const { k } = p;
    return {
      kind: 'table',
      prompt: [say(c.setup(p.n, p.k, p.banned)), say(c.tableAsk)],
      columns: [`\\text{${c.things}}`, '\\text{ways}'],
      rows: values.map((_, i) => [`${i + 1}`, null]),
      bank: numberBank(values, [k * k, k * (k - 1) * (k - 2), k ** 3, (k - 1) * (k - 2), k ** p.n], 3, 1, 1),
      answer: values.map(num),
    };
  },
  solution(p) {
    const values = Array.from({ length: p.n }, (_, i) => stripeWays(p, i + 1));
    return [
      ...stripeSolution(p).slice(0, 2),
      { text: `So the first one gives ${stripeFirst(p)}, and each one added multiplies by ${p.k - 1}:` },
      ...texRows(values),
    ];
  },
};

/* ================================================================
 * Lesson 2: Venn Diagrams
 * ================================================================ */

const GROUPS = [
  { group: 'students in a class', a: 'play football', b: 'play tennis', A: 'F', B: 'T', both: 'play both', neither: 'play neither', aNoun: 'football', bNoun: 'tennis' },
  { group: 'people in a choir', a: 'speak French', b: 'speak Spanish', A: 'F', B: 'S', both: 'speak both', neither: 'speak neither', aNoun: 'French', bNoun: 'Spanish' },
  { group: 'families on a street', a: 'own a cat', b: 'own a dog', A: 'C', B: 'D', both: 'own both', neither: 'own neither', aNoun: 'cat', bNoun: 'dog' },
  { group: 'people at a meeting', a: 'drink tea', b: 'drink coffee', A: 'T', B: 'C', both: 'drink both', neither: 'drink neither', aNoun: 'tea', bNoun: 'coffee' },
  { group: 'children at a camp', a: 'can swim', b: 'can ride a bike', A: 'S', B: 'R', both: 'can do both', neither: 'can do neither', aNoun: 'swim', bNoun: 'bike' },
];

interface VennParams {
  context: number;
  /** Only A, both, only B, neither. */
  regions: [number, number, number, number];
  /** Difficulty 2: neither is given, and both has to be found. */
  giveNeither: boolean;
}

function sampleVenn(rng: Rng, difficulty: number): VennParams {
  for (;;) {
    const regions: [number, number, number, number] = [rng.int(3, 20), rng.int(2, 12), rng.int(3, 20), rng.int(1, 12)];
    if (new Set(regions).size < 4) continue;
    if (regions[0] === regions[2]) continue;
    return { context: rng.int(0, GROUPS.length - 1), regions, giveNeither: difficulty >= 2 };
  }
}

const vennTotals = ({ regions: [x, both, y, neither] }: VennParams) => ({ N: x + both + y + neither, a: x + both, b: y + both, both, neither });

function vennFacts(p: VennParams): string {
  const c = GROUPS[p.context];
  const { N, a, b, both, neither } = vennTotals(p);
  const last = p.giveNeither ? `${neither} ${c.neither}` : `${both} ${c.both}`;
  return `Of the ${N} ${c.group}, ${a} ${c.a}, ${b} ${c.b} and ${last}.`;
}

function vennSolution(p: VennParams): SolutionStep[] {
  const { N, a, b, both, neither } = vennTotals(p);
  const [x, , y] = p.regions;
  const steps: SolutionStep[] = [];
  if (p.giveNeither) {
    steps.push({ text: `Start outside: ${neither} are in neither, so the rest are in at least one.` });
    steps.push({ tex: `${N} - ${neither} = ${N - neither}` });
    steps.push({ text: `Adding the two groups counts the overlap twice, so the excess is the overlap:` });
    steps.push({ tex: `\\text{both} = ${a} + ${b} - ${N - neither} = ${both}` });
  } else {
    steps.push({ text: `Start in the middle: ${both} are in both. Each group includes them, so take them off:` });
  }
  const c = GROUPS[p.context];
  steps.push({ tex: `\\text{only } ${c.A} = ${a} - ${both} = ${x}` });
  steps.push({ tex: `\\text{only } ${c.B} = ${b} - ${both} = ${y}` });
  if (!p.giveNeither) {
    steps.push({ text: 'Everyone left over is in neither:' });
    steps.push({ tex: `${N} - ${x} - ${both} - ${y} = ${neither}` });
  }
  return steps;
}

const cmVennSurvey: Generator<VennParams> = {
  id: 'cm-venn-survey',
  sample: sampleVenn,
  render(p) {
    const c = GROUPS[p.context];
    const { N, a, b } = vennTotals(p);
    return {
      kind: 'venn',
      prompt: [
        say(vennFacts(p)),
        say(`$${c.A}$ holds those who ${c.a} and $${c.B}$ those who ${c.b}. Fill in how many are in each region.`),
      ],
      sets: [c.A, c.B],
      total: N,
      regions: [null, null, null, null],
      bank: numberBank(p.regions, [a, b, N - a - b, a + b - N], 3),
      answer: p.regions.map(num),
    };
  },
  solution: vennSolution,
};

const cmVennCount: Generator<VennParams> = {
  id: 'cm-venn-count',
  sample: sampleVenn,
  render(p) {
    const c = GROUPS[p.context];
    const { both, neither } = vennTotals(p);
    if (p.giveNeither) return typed([say(vennFacts(p)), say(`How many ${c.both}?`)], both, '\\text{both} =');
    return typed([say(vennFacts(p)), say(`How many ${c.neither}?`)], neither, '\\text{neither} =');
  },
  choices(p) {
    const { N, a, b, both, neither } = vennTotals(p);
    if (p.giveNeither) return numberOptions(both, [a + b - N, neither, N - neither, a + b - N + 2 * neither], 1, 0);
    return numberOptions(neither, [N - a - b, N - a - b + 2 * both, a + b - both, N - both], 1, 0);
  },
  solution(p) {
    const { N, a, b, both, neither } = vennTotals(p);
    if (p.giveNeither) return vennSolution(p).slice(0, 4);
    return [
      { text: `Adding the two groups counts the ${both} in both twice, so the number in at least one is` },
      { tex: `${a} + ${b} - ${both} = ${a + b - both}` },
      { tex: `\\text{neither} = ${N} - ${a + b - both} = ${neither}` },
    ];
  },
};

/* ---------- the biggest and smallest the overlap can be ---------- */

type ExtremeAsk = 'leastBoth' | 'mostBoth' | 'mostNeither' | 'leastNeither';

interface ExtremeParams {
  context: number;
  N: number;
  a: number;
  b: number;
  ask: ExtremeAsk;
}

function extremeAnswer({ N, a, b, ask }: ExtremeParams): number {
  if (ask === 'leastBoth') return a + b - N;
  if (ask === 'mostBoth') return Math.min(a, b);
  if (ask === 'mostNeither') return N - Math.max(a, b);
  return N - a - b;
}

const cmVennExtremes: Generator<ExtremeParams> = {
  id: 'cm-venn-extremes',
  sample(rng, difficulty) {
    const ask: ExtremeAsk = difficulty >= 2 ? rng.pick(['mostNeither', 'leastNeither'] as const) : rng.pick(['leastBoth', 'mostBoth'] as const);
    for (;;) {
      const N = rng.int(20, 60);
      const a = rng.int(5, N - 2);
      const b = rng.int(5, N - 2);
      if (a === b) continue;
      if (ask === 'leastBoth' || ask === 'mostBoth') {
        if (a + b < N + 2) continue;
      } else if (ask === 'leastNeither') {
        if (a + b > N - 2) continue;
      }
      return { context: rng.int(0, GROUPS.length - 1), N, a, b, ask };
    }
  },
  render(p) {
    const c = GROUPS[p.context];
    const size = p.ask.startsWith('least') ? 'smallest' : 'largest';
    const who = p.ask.endsWith('Both') ? c.both : c.neither;
    return typed(
      [say(`Of the ${p.N} ${c.group}, ${p.a} ${c.a} and ${p.b} ${c.b}.`), say(`What is the ${size} possible number who ${who}?`)],
      extremeAnswer(p),
      p.ask.endsWith('Both') ? '\\text{both} =' : '\\text{neither} =',
    );
  },
  choices(p) {
    const { N, a, b } = p;
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    const slips: Record<ExtremeAsk, number[]> = {
      leastBoth: [0, small, N - big],
      mostBoth: [a + b - N, big, N - big],
      mostNeither: [N - a - b, N - small, 0, small],
      leastNeither: [0, N - big, N - small],
    };
    return numberOptions(extremeAnswer(p), slips[p.ask], 1, 0);
  },
  solution(p) {
    const { N, a, b } = p;
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    const answer = extremeAnswer(p);
    if (p.ask === 'leastBoth') {
      return [
        { text: `Together the groups have ${a + b} places, more than the ${N} people, so they must overlap. The overlap is smallest when nobody is in neither:` },
        { tex: `${a} + ${b} - ${N} = ${answer}` },
      ];
    }
    if (p.ask === 'mostBoth') {
      return [
        { text: `The overlap cannot be bigger than the smaller group. It is largest when all ${small} of the smaller group are inside the larger one, which leaves ${N - big} in neither:` },
        { tex: `\\text{both} = ${small}` },
      ];
    }
    if (p.ask === 'mostNeither') {
      return [
        { text: 'Neither is largest when as few as possible are in either group: the smaller group sits inside the larger one, so only the larger group counts.' },
        { tex: `${N} - ${big} = ${answer}` },
      ];
    }
    return [
      { text: `Neither is smallest when the groups do not overlap at all, which they can, since ${a} + ${b} is less than ${N}:` },
      { tex: `${N} - ${a} - ${b} = ${answer}` },
    ];
  },
};

/* ---------- a two-way table ---------- */

const TWO_WAY = [
  {
    rows: ['girls', 'boys'],
    cols: ['walk', 'bus'],
    facts: (N: number, R1: number, C1: number) => `A class has ${N} pupils. ${R1} are girls and the rest boys; ${C1} walk to school and the rest come by bus.`,
    given: (p: number) => `${p} of the girls walk.`,
    givenS: (s: number) => `${s} of the boys come by bus.`,
  },
  {
    rows: ['adult', 'child'],
    cols: ['seated', 'standing'],
    facts: (N: number, R1: number, C1: number) => `A concert sold ${N} tickets. ${R1} were adult tickets and the rest child tickets; ${C1} were seated and the rest standing.`,
    given: (p: number) => `${p} adult tickets were seated.`,
    givenS: (s: number) => `${s} child tickets were standing.`,
  },
  {
    rows: ['junior', 'senior'],
    cols: ['swim', 'run'],
    facts: (N: number, R1: number, C1: number) => `A club has ${N} members. ${R1} are juniors and the rest seniors; ${C1} swim and the rest run.`,
    given: (p: number) => `${p} of the juniors swim.`,
    givenS: (s: number) => `${s} of the seniors run.`,
  },
];

interface TwoWayParams {
  context: number;
  /** Top left, top right, bottom left, bottom right. */
  cells: [number, number, number, number];
  /** Difficulty 2: the bottom-right cell is given instead of the top-left. */
  giveCorner: boolean;
}

function twoWayTotals({ cells: [p, q, r, s] }: TwoWayParams) {
  return { p, q, r, s, R1: p + q, R2: r + s, C1: p + r, C2: q + s, N: p + q + r + s };
}

const cmTwoWayTable: Generator<TwoWayParams> = {
  id: 'cm-two-way-table',
  sample(rng, difficulty) {
    for (;;) {
      const cells: [number, number, number, number] = [rng.int(2, 18), rng.int(2, 18), rng.int(2, 18), rng.int(2, 18)];
      const t = twoWayTotals({ context: 0, cells, giveCorner: false });
      const all = [t.p, t.q, t.r, t.s, t.R1, t.R2, t.C1, t.C2, t.N];
      if (new Set(all).size < all.length) continue;
      return { context: rng.int(0, TWO_WAY.length - 1), cells, giveCorner: difficulty >= 2 };
    }
  },
  render(params) {
    const c = TWO_WAY[params.context];
    const { p, q, r, s, R1, R2, C1, C2, N } = twoWayTotals(params);
    const row = (label: string) => `\\text{${label}}`;
    const rows = params.giveCorner
      ? [
          [row(c.rows[0]), null, null, `${R1}`],
          [row(c.rows[1]), null, `${s}`, null],
          [row('total'), `${C1}`, null, `${N}`],
        ]
      : [
          [row(c.rows[0]), `${p}`, null, `${R1}`],
          [row(c.rows[1]), null, null, null],
          [row('total'), `${C1}`, null, `${N}`],
        ];
    const answer = params.giveCorner ? [p, q, r, R2, C2] : [q, r, s, R2, C2];
    return {
      kind: 'table',
      prompt: [say(`${c.facts(N, R1, C1)} ${params.giveCorner ? c.givenS(s) : c.given(p)}`), say('Fill in the table.')],
      columns: ['', `\\text{${c.cols[0]}}`, `\\text{${c.cols[1]}}`, '\\text{total}'],
      rows,
      bank: numberBank(answer, [N - p, R1 + C1 - N, C1 + s, R1 - s, N - s], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(params) {
    const c = TWO_WAY[params.context];
    const { p, q, r, s, R1, R2, C1, C2, N } = twoWayTotals(params);
    const cell = (i: number, j: number) => `\\text{${c.rows[i]}, ${c.cols[j]}}`;
    const intro: SolutionStep = { text: 'Every row and every column adds up to its total, so each blank is a subtraction. Start where only one blank is left.' };
    if (params.giveCorner) {
      return [
        intro,
        { tex: `\\text{${c.rows[1]}} = ${N} - ${R1} = ${R2}` },
        { tex: `${cell(1, 0)} = ${R2} - ${s} = ${r}` },
        { tex: `${cell(0, 0)} = ${C1} - ${r} = ${p}` },
        { tex: `${cell(0, 1)} = ${R1} - ${p} = ${q}` },
        { tex: `\\text{${c.cols[1]}} = ${N} - ${C1} = ${C2}` },
      ];
    }
    return [
      intro,
      { tex: `${cell(0, 1)} = ${R1} - ${p} = ${q}` },
      { tex: `${cell(1, 0)} = ${C1} - ${p} = ${r}` },
      { tex: `\\text{${c.rows[1]}} = ${N} - ${R1} = ${R2}` },
      { tex: `${cell(1, 1)} = ${R2} - ${r} = ${s}` },
      { tex: `\\text{${c.cols[1]}} = ${N} - ${C1} = ${C2}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Branch Diagrams
 * ================================================================ */

/* ---------- stairs: branch on the first move ---------- */

const STAIRS = [
  { setup: (n: number, moves: string) => `A staircase has ${n} steps. Mia climbs it taking ${moves} steps at a time.`, ask: 'In how many different ways can she climb it?' },
  { setup: (n: number, moves: string) => `A frog starts on the bank and wants to reach stone number ${n} in a row of stepping stones. Each hop takes it ${moves} stones forward.`, ask: 'In how many different ways can it get there?' },
  { setup: (n: number, moves: string) => `A robot has to move exactly ${n} squares along a track, ${moves} squares at each move.`, ask: 'In how many different ways can it do this?' },
  {
    setup: (n: number, moves: string) => `The number ${n} is written as a sum of ${moves.replace(/(\d)/g, '$1s').replace(' or ', ' and ')}. Order matters, so 1 + 2 and 2 + 1 count as different.`,
    ask: 'In how many ways can this be done?',
  },
];

interface StairParams {
  context: number;
  n: number;
  /** Longest move: 2 or 3. */
  longest: number;
}

/** Ways to cover 0..n with moves of 1 up to `longest`. */
function stairWays(n: number, longest: number): number[] {
  const w = [1];
  for (let i = 1; i <= n; i += 1) {
    let total = 0;
    for (let s = 1; s <= longest && s <= i; s += 1) total += w[i - s];
    w.push(total);
  }
  return w;
}

const movesText = (longest: number) => (longest === 3 ? '1, 2 or 3' : '1 or 2');

const cmStairs: Generator<StairParams> = {
  id: 'cm-stairs',
  sample(rng, difficulty) {
    const longest = difficulty >= 2 ? 3 : 2;
    return { context: rng.int(0, STAIRS.length - 1), n: difficulty >= 2 ? rng.int(4, 11) : rng.int(3, 11), longest };
  },
  render(p) {
    const c = STAIRS[p.context];
    return typed([say(c.setup(p.n, movesText(p.longest))), say(c.ask)], stairWays(p.n, p.longest)[p.n], '\\text{ways} =');
  },
  choices(p) {
    const w = stairWays(p.n + 1, p.longest);
    const other = stairWays(p.n, p.longest === 3 ? 2 : 3)[p.n];
    return numberOptions(w[p.n], [2 ** (p.n - 1), w[p.n - 1], w[p.n + 1], other], 1, 1);
  },
  solution(p) {
    const w = stairWays(p.n, p.longest).slice(1);
    const before = p.longest === 3 ? 'three' : 'two';
    return [
      { text: `Branch on the first move: it leaves ${p.longest === 3 ? 'one, two or three' : 'one or two'} fewer to go. So each count is the sum of the ${before} before it, starting from 1 to go:` },
      ...texRows(w),
      { text: `The count for ${p.n} is ${w[p.n - 1]}.` },
    ];
  },
};

/* ---------- stamps: cases by the biggest one ---------- */

interface StampParams {
  /** The small stamps: 1 and `mid` when there are three, or `mid` and `big` alone. */
  mid: number;
  big: number;
  total: number;
  withOnes: boolean;
}

/** With 1p stamps too: for each number of big stamps, 0 up to rest ÷ mid of the middle ones. */
function stampRows({ mid, big, total }: StampParams): { rest: number; ways: number }[] {
  const out: { rest: number; ways: number }[] = [];
  for (let j = 0; j * big <= total; j += 1) {
    const rest = total - j * big;
    out.push({ rest, ways: Math.floor(rest / mid) + 1 });
  }
  return out;
}

function stampWays(p: StampParams): number {
  if (p.withOnes) return stampRows(p).reduce((sum, row) => sum + row.ways, 0);
  let count = 0;
  for (let j = 0; j * p.big <= p.total; j += 1) if ((p.total - j * p.big) % p.mid === 0) count += 1;
  return count;
}

const TWO_STAMPS: [number, number][] = [
  [2, 5],
  [3, 5],
  [2, 7],
  [3, 7],
  [4, 7],
  [3, 8],
  [5, 8],
];

function sampleThreeStamps(rng: Rng, most: number): StampParams {
  const mid = rng.pick([2, 3]);
  const big = rng.pick([5, 10]);
  return { mid, big, total: rng.int(2 * big, (most + 1) * big - 1), withOnes: true };
}

const stampSetup = (p: StampParams) =>
  p.withOnes
    ? `Stamps worth 1p, ${p.mid}p and ${p.big}p are used to make exactly ${p.total}p.`
    : `Stamps worth ${p.mid}p and ${p.big}p are used to make exactly ${p.total}p.`;

const ORDER_NOTE = 'Only how many of each stamp is used matters.';

function stampSolution(p: StampParams): SolutionStep[] {
  const rows = stampRows(p);
  if (p.withOnes) {
    return [
      { text: `List the cases by the number of ${p.big}p stamps. Whatever is left can take any number of ${p.mid}p stamps from 0 up to rest ÷ ${p.mid}, and 1p stamps fill the gap:` },
      ...rows.map((row, j) => ({ tex: `${j} \\times ${p.big}\\text{p}: \\ \\text{rest } ${row.rest} \\to ${row.ways}` })),
      { tex: `${rows.map((row) => row.ways).join(' + ')} = ${stampWays(p)}` },
    ];
  }
  const good = rows.filter((row) => row.rest % p.mid === 0).map((row) => row.rest);
  return [
    { text: `List the cases by the number of ${p.big}p stamps, from 0 up to ${rows.length - 1}. What is left over has to be made of ${p.mid}p stamps:` },
    ...texRows(rows.map((row) => row.rest), 5),
    { text: `Only the multiples of ${p.mid} work: ${listText(good)}. So there are ${good.length} ways.` },
  ];
}

const cmStampWays: Generator<StampParams> = {
  id: 'cm-stamp-ways',
  sample(rng, difficulty) {
    if (difficulty >= 2) return sampleThreeStamps(rng, 3);
    for (;;) {
      const [mid, big] = rng.pick(TWO_STAMPS);
      const total = rng.int(20, 45);
      const p = { mid, big, total, withOnes: false };
      if (stampWays(p) >= 2) return p;
    }
  },
  render(p) {
    return typed([say(`${stampSetup(p)} ${ORDER_NOTE}`), say('In how many ways can this be done?')], stampWays(p), '\\text{ways} =');
  },
  choices(p) {
    const answer = stampWays(p);
    const rows = stampRows(p);
    if (p.withOnes) return numberOptions(answer, [answer - rows.length, rows[0].ways, rows.length, answer + 1], 1, 1);
    return numberOptions(answer, [rows.length, Math.floor(p.total / p.mid), answer + 1, answer - 1], 1, 1);
  },
  solution: stampSolution,
};

const cmStampTable: Generator<StampParams> = {
  id: 'cm-stamp-table',
  sample(rng, difficulty) {
    return sampleThreeStamps(rng, difficulty >= 2 ? 4 : 3);
  },
  render(p) {
    const rows = stampRows(p);
    const values = [...rows.map((row) => row.ways), stampWays(p)];
    return {
      kind: 'table',
      prompt: [
        say(`${stampSetup(p)} ${ORDER_NOTE}`),
        say(`Fill in the number of ways for each number of ${p.big}p stamps, then the total.`),
      ],
      columns: [`${p.big}\\text{p stamps}`, '\\text{ways}'],
      rows: [...rows.map((_, j) => [`${j}`, null]), ['\\text{total}', null]],
      bank: numberBank(values, [rows[0].ways - 1, rows.length, stampWays(p) - rows.length], 3, 1, 1),
      answer: values.map(num),
    };
  },
  solution: stampSolution,
};

/* ---------- dice totals: branch on the first die ---------- */

interface DiceParams {
  sides: number[];
  t: number;
}

function diceCount(sides: number[], t: number): number {
  if (sides.length === 0) return t === 0 ? 1 : 0;
  const [first, ...rest] = sides;
  let total = 0;
  for (let a = 1; a <= first; a += 1) total += diceCount(rest, t - a);
  return total;
}

/** The same total counted as unordered handfuls, the trap. */
function unorderedCount(sides: number[], t: number): number {
  const m = Math.max(...sides);
  const seen = new Set<string>();
  const walk = (i: number, picked: number[]) => {
    if (i === sides.length) {
      if (picked.reduce((x, y) => x + y, 0) === t) seen.add([...picked].sort((x, y) => x - y).join(','));
      return;
    }
    for (let a = 1; a <= Math.min(m, sides[i]); a += 1) walk(i + 1, [...picked, a]);
  };
  walk(0, []);
  return seen.size;
}

const DICE_PAIRS: [number, number][] = [
  [4, 4],
  [4, 6],
  [6, 4],
  [6, 6],
  [6, 8],
  [8, 6],
  [8, 8],
  [4, 8],
];

const cmDiceTotal: Generator<DiceParams> = {
  id: 'cm-dice-total',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const m = rng.pick([4, 6, 8]);
      return { sides: [m, m, m], t: rng.int(5, 3 * m - 2) };
    }
    const sides = rng.pick(DICE_PAIRS);
    return { sides: [...sides], t: rng.int(3, sides[0] + sides[1] - 1) };
  },
  render({ sides, t }) {
    const outcomes = sides.reduce((x, y) => x * y, 1);
    const dice =
      sides.length === 3
        ? `Three fair ${sides[0]}-sided dice, red, blue and green, each numbered 1 to ${sides[0]}, are rolled.`
        : sides[0] === sides[1]
          ? `A red and a blue ${sides[0]}-sided die, each numbered 1 to ${sides[0]}, are rolled.`
          : `A red ${sides[0]}-sided die and a blue ${sides[1]}-sided die, each numbered from 1, are rolled.`;
    return typed([say(dice), say(`In how many of the ${outcomes} outcomes is the total ${t}?`)], diceCount(sides, t), '\\text{outcomes} =');
  },
  choices({ sides, t }) {
    const answer = diceCount(sides, t);
    const slips = [unorderedCount(sides, t), sides.length === 3 ? diceCount(sides.slice(1), t) : t - 1, answer + 1, answer - 1];
    return numberOptions(answer, slips, 1, 1);
  },
  solution({ sides, t }) {
    const answer = diceCount(sides, t);
    if (sides.length === 3) {
      const cases = Array.from({ length: sides[0] }, (_, i) => ({ a: i + 1, n: diceCount(sides.slice(1), t - i - 1) })).filter((c) => c.n > 0);
      return [
        { text: `Branch on the red die. For each value it shows, the blue and green dice must make up the rest of ${t}, and that is a two-dice count:` },
        { tex: cases.map((c) => `${c.a} \\to ${c.n}`).join(' \\qquad ') },
        { tex: `${cases.map((c) => c.n).join(' + ')} = ${answer}` },
        { text: 'Different colours make, say, 1, 2, 3 and 3, 2, 1 different outcomes, which is why they are all counted.' },
      ];
    }
    const pairs: string[] = [];
    for (let a = 1; a <= sides[0]; a += 1) if (t - a >= 1 && t - a <= sides[1]) pairs.push(`(${a}, ${t - a})`);
    const rows: SolutionStep[] = [];
    for (let i = 0; i < pairs.length; i += 4) rows.push({ tex: pairs.slice(i, i + 4).join(',\\ ') });
    return [
      { text: `Branch on the red die. Each value it shows leaves one number the blue die must show, and that number has to be between 1 and ${sides[1]}. Written (red, blue):` },
      ...rows,
      { text: `That is ${answer}. The dice are different colours, so a pair like (1, 2) and (2, 1) are two different outcomes.` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Over-Counting
 * ================================================================ */

/* ---------- arrangements with repeated letters ---------- */

const PAIR_WORDS = ['APPLE', 'HELLO', 'PIZZA', 'SPOON', 'HAPPY', 'FUNNY', 'SILLY', 'JELLY', 'KITTEN', 'RABBIT', 'BALLET', 'CARROT', 'DINNER', 'SUMMER', 'BUTTER', 'MOMENT'];

const REPEAT_WORDS = [
  'BANANA',
  'PEPPER',
  'LETTER',
  'COFFEE',
  'TOFFEE',
  'BALLOON',
  'LEVEL',
  'REFER',
  'SASSY',
  'EERIE',
  'MAMMAL',
  'PAPAYA',
  'SEESAW',
  'GOOGLE',
  'ASSESS',
  'PUPPY',
  'TATTOO',
  'COCOA',
  'ACACIA',
  'TEETH',
  'GEESE',
  'ELEVEN',
  'CHEESE',
  'DEADEN',
  'REDDER',
  'BUBBLE',
  'DADDY',
  'SUCCESS',
  'LITTLE',
];

interface ArrangeParams {
  /** A word, or a row of flags written as R, B and G. */
  word: string;
  flags: boolean;
}

/** How often each letter appears, in order of first appearance. */
function letterCounts(word: string): [string, number][] {
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts.entries()];
}

const repeats = (word: string) => letterCounts(word).filter(([, c]) => c > 1);

function arrangements(word: string): number {
  return letterCounts(word).reduce((out, [, c]) => out / fact(c), fact(word.length));
}

const FLAG_NAMES: Record<string, string> = { R: 'red', B: 'blue', G: 'green' };

function flagText(word: string): string {
  const parts = letterCounts(word).map(([ch, c]) => `${c} ${FLAG_NAMES[ch]} flag${c === 1 ? '' : 's'}`);
  return listText(parts);
}

const cmArrangements: Generator<ArrangeParams> = {
  id: 'cm-arrangements',
  sample(rng, difficulty) {
    if (rng.chance(0.4)) {
      if (difficulty >= 2) {
        for (;;) {
          const [r, b, g] = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)];
          const n = r + b + g;
          if (n < 5 || n > 7 || Math.max(r, b, g) < 2) continue;
          return { word: 'R'.repeat(r) + 'B'.repeat(b) + 'G'.repeat(g), flags: true };
        }
      }
      for (;;) {
        const [r, b] = [rng.int(2, 5), rng.int(2, 5)];
        if (r + b > 8) continue;
        return { word: 'R'.repeat(r) + 'B'.repeat(b), flags: true };
      }
    }
    return { word: rng.pick(difficulty >= 2 ? REPEAT_WORDS : PAIR_WORDS), flags: false };
  },
  render(p) {
    if (p.flags) {
      return typed(
        [say(`${flagText(p.word)} are hung in a row. Flags of the same colour are identical.`), say('How many different rows are possible?')],
        arrangements(p.word),
        '\\text{rows} =',
      );
    }
    return typed([say(`How many different arrangements are there of the letters of the word ${p.word}?`)], arrangements(p.word), '\\text{arrangements} =');
  },
  choices(p) {
    const answer = arrangements(p.word);
    const n = p.word.length;
    const biggest = Math.max(...letterCounts(p.word).map(([, c]) => c));
    return numberOptions(answer, [fact(n), fact(n) / fact(biggest), fact(n - 1), answer / 2, 3 * answer], 1, 1);
  },
  solution(p) {
    const n = p.word.length;
    const groups = repeats(p.word);
    const den = groups.reduce((out, [, c]) => out * fact(c), 1);
    const name = (ch: string) => (p.flags ? `${FLAG_NAMES[ch]} flags` : `${ch}s`);
    const what = p.flags ? 'flags' : 'letters';
    const denTex = groups.map(([, c]) => `${c}!`).join(' \\times ');
    return [
      { text: `If all ${n} ${what} were different there would be ${n}! orders.` },
      { text: `Swapping the ${listText(groups.map(([ch]) => name(ch)))} among themselves changes nothing, so each ${p.flags ? 'row' : 'arrangement'} was counted ${den} times. Divide:` },
      { tex: `\\frac{${n}!}{${denTex}} = \\frac{${fact(n)}}{${den}} = ${arrangements(p.word)}` },
    ];
  },
};

/* ---------- round the table ---------- */

const ROUND = [
  { who: 'friends', verb: 'sit at a round table', how: 'sit' },
  { who: 'children', verb: 'stand in a ring to play a game', how: 'stand' },
  { who: 'guests', verb: 'sit round a circular dinner table', how: 'sit' },
  { who: 'players', verb: 'sit round a campfire', how: 'sit' },
  { who: 'knights', verb: 'sit at a round table', how: 'sit' },
  { who: 'dancers', verb: 'stand in a circle', how: 'stand' },
];

const PAIRS = [
  ['Ann', 'Ben'],
  ['Cal', 'Dee'],
  ['Eve', 'Finn'],
  ['Gus', 'Hana'],
];

interface RoundParams {
  context: number;
  n: number;
  rule: 'any' | 'together' | 'apart';
  pair: number;
}

function roundCount({ n, rule }: RoundParams): number {
  if (rule === 'any') return fact(n - 1);
  if (rule === 'together') return 2 * fact(n - 2);
  return fact(n - 1) - 2 * fact(n - 2);
}

const ROTATE_NOTE = 'Two arrangements count as the same if one is the other with everyone moved round the same number of places.';

const cmRoundTable: Generator<RoundParams> = {
  id: 'cm-round-table',
  sample(rng, difficulty) {
    const context = rng.int(0, ROUND.length - 1);
    if (difficulty >= 2) return { context, n: rng.int(5, 8), rule: rng.pick(['together', 'apart'] as const), pair: rng.int(0, PAIRS.length - 1) };
    return { context, n: rng.int(4, 8), rule: 'any', pair: 0 };
  },
  render(p) {
    const c = ROUND[p.context];
    const [x, y] = PAIRS[p.pair];
    const lines = [say(`${p.n} ${c.who}${p.rule === 'any' ? '' : `, including ${x} and ${y},`} ${c.verb}. ${ROTATE_NOTE}`)];
    if (p.rule !== 'any') lines.push(say(`${x} and ${y} must ${p.rule === 'together' ? '' : 'not '}be next to each other.`));
    lines.push(say(`In how many different ways can they ${c.how}?`));
    return typed(lines, roundCount(p), '\\text{ways} =');
  },
  choices(p) {
    const { n } = p;
    const slips: Record<RoundParams['rule'], number[]> = {
      any: [fact(n), fact(n - 1) / 2, fact(n - 2)],
      together: [fact(n - 2), 2 * fact(n - 1), fact(n - 1)],
      apart: [fact(n - 1) - fact(n - 2), fact(n) - 2 * fact(n - 1), 2 * fact(n - 2)],
    };
    return numberOptions(roundCount(p), slips[p.rule], 1, 1);
  },
  solution(p) {
    const { n } = p;
    const [x, y] = PAIRS[p.pair];
    const all: SolutionStep[] = [
      { text: `In a row there are ${n}! orders. Round the circle each arrangement turns up ${n} times, once for each way of moving everyone round, so divide by ${n}:` },
      { tex: `${n}! \\div ${n} = ${n - 1}! = ${fact(n - 1)}` },
    ];
    if (p.rule === 'any') return all;
    const glue: SolutionStep[] = [
      { text: `Glue ${x} and ${y} into one block. That leaves ${n - 1} units round the circle, in ${n - 2}! ways, and the block can be ${x} then ${y} or ${y} then ${x}:` },
      { tex: `2 \\times ${n - 2}! = 2 \\times ${fact(n - 2)} = ${2 * fact(n - 2)}` },
    ];
    if (p.rule === 'together') return glue;
    return [
      ...all,
      ...glue,
      { text: 'Apart is everything except together:' },
      { tex: `${fact(n - 1)} - ${2 * fact(n - 2)} = ${roundCount(p)}` },
    ];
  },
};

/* ---------- teams: count in order, then divide ---------- */

const TEAMS: { setup: (n: number, k: number) => string; ask: string; lead: string }[] = [
  { setup: (n: number, k: number) => `A team of ${k} is picked from ${n} players.`, ask: 'How many different teams are possible?', lead: 'teams' },
  { setup: (n: number) => `${n} points are marked on a circle.`, ask: '', lead: 'shapes' },
  { setup: (n: number, k: number) => `A pizza comes with any ${k} different toppings from the ${n} on the menu.`, ask: 'How many different pizzas can be ordered?', lead: 'pizzas' },
  { setup: (n: number, k: number) => `Jo picks ${k} of her ${n} books to take on holiday.`, ask: 'How many different choices does she have?', lead: 'choices' },
  { setup: (n: number, k: number) => `A committee of ${k} is chosen from a club of ${n} members.`, ask: 'How many different committees are possible?', lead: 'committees' },
];

const SHAPE = { 3: 'triangles', 4: 'quadrilaterals' } as Record<number, string>;
const K_WORD = { 3: 'three', 4: 'four' } as Record<number, string>;

interface TeamParams {
  context: number;
  n: number;
  k: number;
}

const teamLead = (p: TeamParams) => (p.context === 1 ? SHAPE[p.k] : TEAMS[p.context].lead);

function teamAsk(p: TeamParams): string {
  if (p.context === 1) return `How many ${SHAPE[p.k]} have ${K_WORD[p.k]} of the points as corners?`;
  return TEAMS[p.context].ask;
}

function sampleTeams(rng: Rng, difficulty: number): TeamParams {
  const k = difficulty >= 2 ? 4 : 3;
  return { context: rng.int(0, TEAMS.length - 1), n: rng.int(k + 2, 12), k };
}

function teamSolution(p: TeamParams): SolutionStep[] {
  const { n, k } = p;
  const ordered = perm(n, k);
  const factors = Array.from({ length: k }, (_, i) => n - i).join(' \\times ');
  const kFactors = Array.from({ length: k }, (_, i) => k - i).join(' \\times ');
  return [
    { text: `Picked one at a time, in order, there are` },
    { tex: `${factors} = ${ordered}` },
    { text: `But each group of ${k} turns up once for every order of its members:` },
    { tex: `${k}! = ${kFactors} = ${fact(k)}` },
    { tex: `${ordered} \\div ${fact(k)} = ${choose(n, k)}` },
  ];
}

const cmTeams: Generator<TeamParams> = {
  id: 'cm-teams',
  sample: sampleTeams,
  render(p) {
    return typed([say(TEAMS[p.context].setup(p.n, p.k)), say(teamAsk(p))], choose(p.n, p.k), `\\text{${teamLead(p)}} =`);
  },
  choices(p) {
    const { n, k } = p;
    return numberOptions(choose(n, k), [perm(n, k), perm(n, k) / k, choose(n, k - 1), 2 * choose(n, k)], 1, 1);
  },
  solution: teamSolution,
};

const cmTeamsTiles: Generator<TeamParams> = {
  id: 'cm-teams-tiles',
  sample: sampleTeams,
  render(p) {
    const { n, k } = p;
    const answer = [perm(n, k), fact(k), choose(n, k)];
    return {
      kind: 'tiles',
      prompt: [
        say(`${TEAMS[p.context].setup(n, k)} ${teamAsk(p)}`),
        say(`Count them picked in order, divide by how many times each one was counted, and finish the line.`),
      ],
      template: `\\text{${teamLead(p)}} = {0} \\div {1} = {2}`,
      bank: numberBank(answer, [k, perm(n, k) / k, fact(k + 1), n ** k, choose(n, k) * 2], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution: teamSolution,
};

/* ================================================================
 * Lesson 5: Symmetry
 * ================================================================ */

/* ---------- who is ahead of whom ---------- */

const QUEUES = [
  { setup: (n: number, names: string) => `${n} people, including ${names}, stand in a queue.`, ahead: 'somewhere ahead of' },
  { setup: (n: number, names: string) => `${n} runners, including ${names}, finish a race with no ties.`, ahead: 'finishing ahead of' },
  { setup: (n: number, names: string) => `${n} friends, including ${names}, stand in a row for a photo.`, ahead: 'somewhere to the left of' },
  { setup: (n: number, names: string) => `${n} pupils, including ${names}, each give a talk, one after another.`, ahead: 'speaking before' },
];

const TRIOS = [
  ['Ann', 'Ben', 'Cara'],
  ['Dev', 'Ella', 'Fay'],
  ['Gus', 'Hal', 'Ivy'],
];

interface AheadParams {
  context: number;
  n: number;
  names: number;
  rule: 'pair' | 'chain' | 'first';
}

const aheadDivisor = { pair: 2, chain: 6, first: 3 };
const aheadCount = (p: AheadParams) => fact(p.n) / aheadDivisor[p.rule];

const cmAheadOf: Generator<AheadParams> = {
  id: 'cm-ahead-of',
  sample(rng, difficulty) {
    return {
      context: rng.int(0, QUEUES.length - 1),
      n: rng.int(4, 7),
      names: rng.int(0, TRIOS.length - 1),
      rule: difficulty >= 2 ? rng.pick(['chain', 'first'] as const) : 'pair',
    };
  },
  render(p) {
    const c = QUEUES[p.context];
    const [x, y, z] = TRIOS[p.names];
    if (p.rule === 'pair') {
      return typed([say(c.setup(p.n, `${x} and ${y}`)), say(`How many of the possible orders have ${x} ${c.ahead} ${y}?`)], aheadCount(p), '\\text{orders} =');
    }
    const ask =
      p.rule === 'chain'
        ? `How many of the possible orders have ${x} ${c.ahead} ${y}, and ${y} ${c.ahead} ${z}?`
        : `How many of the possible orders have ${x} ${c.ahead} both ${y} and ${z}?`;
    return typed([say(c.setup(p.n, listText([x, y, z]))), say(ask)], aheadCount(p), '\\text{orders} =');
  },
  choices(p) {
    const f = fact(p.n);
    const slips = {
      pair: [f, fact(p.n - 1), f / 2 - fact(p.n - 1), fact(p.n - 2)],
      chain: [f / 2, f / 3, fact(p.n - 1)],
      first: [f / 6, f / 2, (2 * f) / 3],
    };
    return numberOptions(aheadCount(p), slips[p.rule], 1, 1);
  },
  solution(p) {
    const [x, y, z] = TRIOS[p.names];
    const f = fact(p.n);
    if (p.rule === 'pair') {
      return [
        { text: `There are ${p.n}! orders in all. Swap ${x} and ${y} in any order and you get another one with them the other way round, so the orders pair up: exactly half have ${x} first of the two.` },
        { tex: `${p.n}! \\div 2 = ${f} \\div 2 = ${aheadCount(p)}` },
      ];
    }
    const which =
      p.rule === 'chain'
        ? `Exactly one of those, ${x}, ${y}, ${z}, is the one asked for, so it is a sixth of all orders.`
        : `${x} comes first of the three in two of them (${x}, ${y}, ${z} and ${x}, ${z}, ${y}), so it is a third of all orders.`;
    return [
      { text: `There are ${p.n}! orders in all. By symmetry, the 3! = 6 orders of ${x}, ${y} and ${z} among themselves are equally common. ${which}` },
      { tex: `${p.n}! \\div ${aheadDivisor[p.rule]} = ${f} \\div ${aheadDivisor[p.rule]} = ${aheadCount(p)}` },
    ];
  },
};

/* ---------- two dice compared ---------- */

const PAIRED = [
  { setup: (m: number) => `A red and a blue ${m}-sided die, each numbered 1 to ${m}, are rolled.`, first: 'red', second: 'blue' },
  { setup: (m: number) => `Two spinners, a red one and a blue one, are each numbered 1 to ${m}, and both are spun.`, first: 'red', second: 'blue' },
  { setup: (m: number) => `A red pack and a blue pack of cards are each numbered 1 to ${m}. One card is drawn from each pack.`, first: 'red', second: 'blue' },
];

interface CompareParams {
  context: number;
  m: number;
  ask: 'bigger' | 'above' | 'below';
}

const compareCount = ({ m }: CompareParams) => (m * m - m) / 2;

const cmDiceCompare: Generator<CompareParams> = {
  id: 'cm-dice-compare',
  sample(rng, difficulty) {
    return { context: rng.int(0, PAIRED.length - 1), m: rng.int(4, 12), ask: difficulty >= 2 ? rng.pick(['above', 'below'] as const) : 'bigger' };
  },
  render(p) {
    const c = PAIRED[p.context];
    const question =
      p.ask === 'bigger'
        ? `In how many of the ${p.m * p.m} outcomes is the ${c.first} number bigger than the ${c.second}?`
        : `In how many of the ${p.m * p.m} outcomes is the total ${p.ask === 'above' ? 'more' : 'less'} than ${p.m + 1}?`;
    return typed([say(c.setup(p.m)), say(question)], compareCount(p), '\\text{outcomes} =');
  },
  choices(p) {
    const { m } = p;
    return numberOptions(compareCount(p), [(m * m) / 2, (m * m + m) / 2, m - 1, m * (m - 1)], 1, 1);
  },
  solution(p) {
    const { m } = p;
    const c = PAIRED[p.context];
    if (p.ask === 'bigger') {
      return [
        { text: `Of the ${m * m} outcomes, ${m} are ties. Swapping the two numbers turns an outcome with ${c.first} bigger into one with ${c.second} bigger, so the rest split exactly in half:` },
        { tex: `(${m * m} - ${m}) \\div 2 = ${compareCount(p)}` },
      ];
    }
    return [
      { text: `Change each number $x$ to $${m + 1} - x$ on both. A total $T$ becomes $${2 * (m + 1)} - T$, so totals above ${m + 1} pair up exactly with totals below it.` },
      { text: `A total of exactly ${m + 1} happens in ${m} ways (1 and ${m}, 2 and ${m - 1}, and so on), and the rest split in half:` },
      { tex: `(${m * m} - ${m}) \\div 2 = ${compareCount(p)}` },
    ];
  },
};

/* ---------- the sum of every arrangement of some digits ---------- */

interface PermSumParams {
  digits: number[];
}

/** How many times each digit sits in the units place. */
const timesEach = ({ digits }: PermSumParams) => (digits.length === 3 ? 2 : 6);
const digitTotal = ({ digits }: PermSumParams) => digits.reduce((x, y) => x + y, 0);
const permSum = (p: PermSumParams) => timesEach(p) * digitTotal(p) * 111;

function samplePermSum(rng: Rng, difficulty: number): PermSumParams {
  return { digits: rng.sample(ONE_TO_NINE, difficulty >= 2 ? 4 : 3).sort((a, b) => a - b) };
}

function permSumPrompt(p: PermSumParams): string {
  if (p.digits.length === 3) return `Every three-digit number that uses each of the digits ${listText(p.digits)} exactly once is written down.`;
  return `Every three-digit number made of three different digits from ${listText(p.digits)} is written down.`;
}

function permSumSolution(p: PermSumParams): SolutionStep[] {
  const t = timesEach(p);
  const S = digitTotal(p);
  const why =
    p.digits.length === 3
      ? `There are 6 numbers. A digit is in the units place whenever the other two digits fill the front, which they can in 2 ways, so each digit is in the units place twice.`
      : `There are 4 × 3 × 2 = 24 numbers. A digit is in the units place whenever the front two places are filled from the other three digits, in 3 × 2 = 6 ways.`;
  return [
    { text: why },
    { tex: `\\text{units column} = ${t} \\times (${p.digits.join(' + ')}) = ${t * S}` },
    { text: 'The tens and hundreds columns add up to the same, and 1 + 10 + 100 = 111:' },
    { tex: `${t * S} \\times 111 = ${permSum(p)}` },
  ];
}

const cmPermSum: Generator<PermSumParams> = {
  id: 'cm-perm-sum',
  sample: samplePermSum,
  render(p) {
    return typed([say(permSumPrompt(p)), say('What is the sum of all of them?')], permSum(p), '\\text{sum} =');
  },
  choices(p) {
    const S = digitTotal(p);
    if (p.digits.length === 3) return numberOptions(permSum(p), [6 * S * 111, S * 111, 2 * S * 100, 3 * S * 111], 111, 1);
    return numberOptions(permSum(p), [2 * S * 111, 8 * S * 111, 6 * S * 100, 4 * S * 111], 111, 1);
  },
  solution: permSumSolution,
};

const cmPermSumTiles: Generator<PermSumParams> = {
  id: 'cm-perm-sum-tiles',
  sample: samplePermSum,
  render(p) {
    const t = timesEach(p);
    const S = digitTotal(p);
    const answer = [t, t * S, permSum(p)];
    return {
      kind: 'tiles',
      prompt: [
        say(`${permSumPrompt(p)} Find the sum of all of them.`),
        say('Fill in how many times each digit is in the units place, the total of the units column, and the sum.'),
      ],
      template: '\\text{per digit} = {0}, \\quad \\text{column} = {1}, \\quad \\text{sum} = {2}',
      bank: numberBank(answer, [t === 2 ? 6 : 2, 3, S, t * S * 100, (t + 1) * S, S * 111], 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution: permSumSolution,
};

export const contestCountingGenerators = [
  cmDigitChoices,
  cmOddEvenDigits,
  cmStripes,
  cmStripesTable,
  cmVennSurvey,
  cmVennCount,
  cmVennExtremes,
  cmTwoWayTable,
  cmStairs,
  cmStampWays,
  cmStampTable,
  cmDiceTotal,
  cmArrangements,
  cmRoundTable,
  cmTeams,
  cmTeamsTiles,
  cmAheadOf,
  cmDiceCompare,
  cmPermSum,
  cmPermSumTiles,
];
