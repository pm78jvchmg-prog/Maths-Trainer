/**
 * Proof-ordering questions, for the `order` widget.
 *
 * The learner is shown a claim and builds its proof from a bank of steps, some
 * of which belong to no valid proof. Two demo generators ship with the widget,
 * ahead of the Number & Proof course that will ask them:
 *
 * - `proof-order-direct`: a direct algebraic proof — a sum of consecutive
 *   integers, the difference of two squares, the square of an odd number, a
 *   pair of odd numbers.
 * - `proof-order-cases`: a disproof by counterexample (`n^2 + n + 41` is not
 *   always prime) or a proof by exhaustion over remainders.
 *
 * Three rules shape every proof here.
 *
 * 1. **The order is forced.** The grader wants one exact sequence, so no two
 *    steps may be able to swap: each one leans on the line above it, and case
 *    splits are written "First … Next … Finally" so that the words carry the
 *    order even where the mathematics would not.
 * 2. **A distractor can never stand in for a step.** Each is false (an algebra
 *    slip, a wrong opening, a conclusion that does not follow), or true but
 *    unable to replace anything (one worked example, a fact the proof never
 *    uses). Every real step is needed, so swapping one out always leaves a gap.
 * 3. **The bank order comes from the step text**, never from the rng and never
 *    from the answer — see `orderBank`.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import { hashSeed } from '../../engine/rng';
import { say } from './format';

/* ---------- Shared shape ---------- */

/** A step that belongs to no valid proof, and why. */
interface Distractor {
  text: string;
  /** Shown in the worked solution only. May contain $inline maths$. */
  why: string;
}

interface Proof {
  /** The claim, as the learner reads it. */
  claim: string;
  /** The steps in their one correct order. */
  steps: string[];
  /** Every distractor this claim can offer; a draw takes one or two. */
  pool: Distractor[];
}

/**
 * The bank a slide shows: every step, in an order fixed by the text alone.
 *
 * Sorting by a hash of each step is stable across draws, which the deck
 * de-duplicator needs (a per-draw shuffle would let one question render two
 * ways, PITFALLS 3.10), and reads as random. If the proof's own steps happen to
 * come out in the answer's order anyway, the bank is reversed, which puts them
 * in the opposite order — so the bank can never be read off as the answer.
 *
 * Ids are handed out by bank position, so nothing about an id says where it
 * belongs in the proof.
 */
export function orderBank(
  proof: string[],
  distractors: string[],
): { steps: { id: string; text: string }[]; answer: string[] } {
  let bank = [...proof, ...distractors].sort((a, b) => hashSeed(a) - hashSeed(b));
  const proofOrder = bank.filter((text) => proof.includes(text));
  if (proofOrder.every((text, idx) => text === proof[idx])) bank = bank.reverse();
  const steps = bank.map((text, idx) => ({ id: `s${idx}`, text }));
  const idOf = new Map(steps.map((step) => [step.text, step.id]));
  return { steps, answer: proof.map((text) => idOf.get(text) as string) };
}

/** `+ 3`, `- 3`, or nothing for zero, for appending to a term the learner reads. */
function plus(n: number): string {
  if (n === 0) return '';
  return n > 0 ? ` + ${n}` : ` - ${-n}`;
}

/** How many distractors ride along at each difficulty. */
function distractorCount(difficulty: number): number {
  return difficulty >= 2 ? 2 : 1;
}

/** The slide every proof generator renders, from the proof and its draw. */
function orderSlide(proof: Proof, picks: number[]): Slide {
  const distractors = picks.map((idx) => proof.pool[idx].text);
  const { steps, answer } = orderBank(proof.steps, distractors);
  const extra =
    distractors.length === 1
      ? 'One step in the bank does not belong.'
      : 'Two steps in the bank do not belong.';
  return {
    kind: 'order',
    prompt: [say(proof.claim), say(`Tap the steps of the proof in order. ${extra}`)],
    steps,
    answer,
  };
}

/** The worked solution: the proof in order, then why each extra step is out. */
function orderSolution(proof: Proof, picks: number[]): SolutionStep[] {
  return [
    { text: 'Each step uses the one before it, so the proof runs:' },
    ...proof.steps.map((text, idx) => ({ text: `${idx + 1}. ${text}` })),
    ...picks.map((idx) => ({
      text: `Not part of it: “${proof.pool[idx].text}” ${proof.pool[idx].why}`,
    })),
  ];
}

/** Draws which distractors ride along, once the proof's pool is known. */
function pickDistractors(
  rng: { sample<T>(items: readonly T[], n: number): T[] },
  proof: Proof,
  difficulty: number,
): number[] {
  const indices = proof.pool.map((_, idx) => idx);
  return rng.sample(indices, distractorCount(difficulty)).sort((a, b) => a - b);
}

/* ---------- Direct algebraic proofs ---------- */

type DirectParams =
  | { family: 'consecutive'; k: 3 | 5 | 7; difficulty: number; picks: number[] }
  | { family: 'diffSquares'; a: number; difficulty: number; picks: number[] }
  | { family: 'oddSquare'; c: number; difficulty: number; picks: number[] }
  | { family: 'oddPair'; a: number; difficulty: number; picks: number[] };

const NUMBER_WORDS: Record<number, string> = { 3: 'three', 5: 'five', 7: 'seven' };

/** The sum of k consecutive integers is a multiple of k, for odd k. */
function consecutiveProof(k: 3 | 5 | 7, difficulty: number): Proof {
  const m = (k - 1) / 2;
  const total = k * m;
  const list =
    k === 3 ? '$n$, $n + 1$ and $n + 2$' : `$n$, $n + 1$, $\\dots$, $n + ${k - 1}$`;
  const evens =
    k === 3 ? '$n$, $n + 2$ and $n + 4$' : `$n$, $n + 2$, $\\dots$, $n + ${2 * (k - 1)}$`;
  const constants = Array.from({ length: k - 1 }, (_, idx) => idx + 1).join(' + ');
  const firstK = k === 3 ? '1 + 2 + 3' : `1 + 2 + \\dots + ${k}`;
  const open = `Call the smallest of them $n$, so the integers are ${list}.`;
  const factor = `Factorising, $${k}n + ${total} = ${k}(n + ${m})$.`;
  const close = `$n + ${m}$ is an integer, so the sum is a multiple of $${k}$.`;
  const middle =
    difficulty >= 2
      ? [
          `There are $${k}$ of them, so the $n$ terms add up to $${k}n$.`,
          `The rest add up to $${constants} = ${total}$, so the sum is $${k}n + ${total}$.`,
        ]
      : [`Adding them gives $${k}n + ${total}$.`];
  const slip =
    difficulty >= 2
      ? `The rest add up to $${constants} = ${total - 1}$, so the sum is $${k}n + ${total - 1}$.`
      : `Adding them gives $${k}n + ${total - 1}$.`;
  return {
    claim: `Prove that the sum of any ${NUMBER_WORDS[k]} consecutive integers is a multiple of $${k}$.`,
    steps: [open, ...middle, factor, close],
    pool: [
      {
        text: `Call the smallest of them $n$, so the integers are ${evens}.`,
        why: 'Those go up in twos, so they are not consecutive.',
      },
      { text: slip, why: `The constants add up to $${total}$, not $${total - 1}$.` },
      {
        text: `Factorising, $${k}n + ${total} = ${k}(n + ${total})$.`,
        why: `$${k}(n + ${total})$ multiplies out to $${k}n + ${k * total}$, not $${k}n + ${total}$.`,
      },
      {
        text: `Checking $n = 1$: $${firstK} = ${(k * (k + 1)) / 2}$, a multiple of $${k}$.`,
        why: 'One example is not a proof: it says nothing about any other starting number.',
      },
      {
        text: `$n + ${m}$ is an integer, so the sum is even.`,
        why: `That does not follow, and it is not always true: starting from $n = ${1 - m}$ the sum is $${k}$.`,
      },
    ],
  };
}

/** (n + a)^2 - (n - a)^2 = 4an. */
function diffSquaresProof(a: number, difficulty: number): Proof {
  const twoA = 2 * a;
  const sq = a * a;
  const m = 4 * a;
  const first = `n^2 + ${twoA}n + ${sq}`;
  const second = `n^2 - ${twoA}n + ${sq}`;
  const whole = `(n + ${a})^2 - (n - ${a})^2`;
  const cancel = `The $n^2$ and $${sq}$ terms cancel, leaving $${m}n$.`;
  const unbracket = `Removing the brackets, that is $${first} - n^2 + ${twoA}n - ${sq}$.`;
  const example = `(1 + ${a})^2 - (1 - ${a})^2 = ${(1 + a) ** 2} - ${(1 - a) ** 2} = ${m}`;
  return {
    claim: `Prove that $${whole}$ is a multiple of $${m}$ for every integer $n$.`,
    steps: [
      `Expanding the first square, $${whole} = (${first}) - (n - ${a})^2$.`,
      `Expanding the second, that is $(${first}) - (${second})$.`,
      ...(difficulty >= 2 ? [unbracket] : []),
      cancel,
      `$n$ is an integer, so $${m}n$ is a multiple of $${m}$.`,
    ],
    pool: [
      {
        text: `Expanding the second, that is $(${first}) - (n^2 - ${sq})$.`,
        why: `$(n - ${a})^2$ has a middle term: it is $${second}$.`,
      },
      {
        text: `The $n^2$ and $${sq}$ terms cancel, leaving $${m}n + ${2 * sq}$.`,
        why: `The constants are $+${sq}$ and $-${sq}$, so they cancel rather than add.`,
      },
      {
        text: 'Factorise as a difference of two squares, $A^2 - B^2 = (A + B)(A - B)$.',
        why: 'True, and another way in, but this proof expands the squares and never uses it.',
      },
      {
        text: `Checking $n = 1$: $${example}$.`,
        why: 'One example is not a proof: it says nothing about any other $n$.',
      },
      {
        text: `$n$ is an integer, so $${m}n$ is always positive.`,
        why: `Not true — for $n = -1$ it is $-${m}$ — and not what the claim asks.`,
      },
    ],
  };
}

/** If n is odd, n^2 + c is even for odd c and odd for even c. */
function oddSquareProof(c: number, difficulty: number): Proof {
  const parity = c % 2 === 1 ? 'even' : 'odd';
  const other = parity === 'even' ? 'odd' : 'even';
  const c1 = 1 + c;
  const m = parity === 'even' ? c1 / 2 : c / 2;
  const inner = `2k^2 + 2k + ${m}`;
  const form = parity === 'even' ? `2(${inner})` : `2(${inner}) + 1`;
  const expr = `n^2 + ${c}`;
  const square =
    difficulty >= 2
      ? [
          'Then $n^2 = (2k + 1)^2 = 4k^2 + 4k + 1$.',
          `So $${expr} = 4k^2 + 4k + ${c1}$.`,
        ]
      : [`Then $${expr} = (2k + 1)^2 + ${c} = 4k^2 + 4k + ${c1}$.`];
  const slip =
    difficulty >= 2
      ? 'Then $n^2 = (2k + 1)^2 = 4k^2 + 1$.'
      : `Then $${expr} = (2k + 1)^2 + ${c} = 4k^2 + ${c1}$.`;
  return {
    claim: `Prove that if $n$ is odd, then $${expr}$ is ${parity}.`,
    steps: [
      '$n$ is odd, so $n = 2k + 1$ for some integer $k$.',
      ...square,
      `That is $${form}$.`,
      `$${inner}$ is an integer, so $${expr}$ is ${parity}.`,
    ],
    pool: [
      {
        text: '$n$ is odd, so $n = 2k$ for some integer $k$.',
        why: '$2k$ is even. An odd number is one more than that, $2k + 1$.',
      },
      {
        text: slip,
        why: 'Squaring a bracket gives a middle term: $(2k + 1)^2 = 4k^2 + 4k + 1$.',
      },
      {
        text: `Checking $n = 3$: $3^2 + ${c} = ${9 + c}$, which is ${parity}.`,
        why: 'One example is not a proof: it says nothing about any other odd $n$.',
      },
      {
        text: `$${inner}$ is an integer, so $${expr}$ is ${other}.`,
        why: `$${form}$ is ${parity}, so this contradicts the line above it.`,
      },
      {
        text: 'Every odd square ends in $1$, $5$ or $9$.',
        why: 'True, but the proof never uses it.',
      },
    ],
  };
}

/** Two odd numbers 2a apart, a odd, sum to a multiple of 4. */
function oddPairProof(a: number, difficulty: number): Proof {
  const gap = 2 * a;
  const sum = 2 + gap;
  const q = (1 + a) / 2;
  const claim =
    a === 1
      ? 'Prove that the sum of two consecutive odd numbers is a multiple of $4$.'
      : `Prove that the sum of two odd numbers that differ by $${gap}$ is a multiple of $4$.`;
  const larger = a === 1 ? 'The next odd number is' : 'The larger is';
  const open =
    difficulty >= 2
      ? [
          'Write the smaller as $2n + 1$, where $n$ is an integer.',
          `${larger} $${gap}$ more, so it is $2n + ${1 + gap}$.`,
        ]
      : [`Write the smaller as $2n + 1$, where $n$ is an integer, so the larger is $2n + ${1 + gap}$.`];
  const wrongOpen =
    difficulty >= 2
      ? 'Write the smaller as $2n$, where $n$ is an integer.'
      : `Write the smaller as $2n$, where $n$ is an integer, so the larger is $2n + ${gap}$.`;
  return {
    claim,
    steps: [
      ...open,
      `Their sum is $4n + ${sum}$.`,
      `Factorising, $4n + ${sum} = 4(n + ${q})$.`,
      `$n + ${q}$ is an integer, so the sum is a multiple of $4$.`,
    ],
    pool: [
      { text: wrongOpen, why: '$2n$ is even. An odd number is $2n + 1$.' },
      {
        text: `Their sum is $4n + ${sum - 1}$.`,
        why: `The constants are $1$ and $${1 + gap}$, which make $${sum}$.`,
      },
      {
        text: `Factorising, $4n + ${sum} = 2(2n + ${sum / 2})$, so the sum is even.`,
        why: 'True, but even is not enough: the claim is about multiples of $4$.',
      },
      {
        text: `Checking $1 + ${1 + gap} = ${sum}$, a multiple of $4$.`,
        why: 'One example is not a proof: it says nothing about any other pair.',
      },
    ],
  };
}

function directProof(params: DirectParams): Proof {
  switch (params.family) {
    case 'consecutive':
      return consecutiveProof(params.k, params.difficulty);
    case 'diffSquares':
      return diffSquaresProof(params.a, params.difficulty);
    case 'oddSquare':
      return oddSquareProof(params.c, params.difficulty);
    case 'oddPair':
      return oddPairProof(params.a, params.difficulty);
  }
}

const proofOrderDirect: Generator<DirectParams> = {
  id: 'proof-order-direct',
  sample(rng, difficulty) {
    const family = rng.pick(['consecutive', 'diffSquares', 'oddSquare', 'oddPair'] as const);
    const base = (() => {
      switch (family) {
        case 'consecutive':
          return { family, k: rng.pick([3, 5, 7] as const), difficulty, picks: [] };
        case 'diffSquares':
          return { family, a: rng.int(1, 9), difficulty, picks: [] };
        case 'oddSquare':
          return { family, c: rng.int(1, 9), difficulty, picks: [] };
        case 'oddPair':
          return { family, a: rng.pick([1, 3, 5, 7, 9]), difficulty, picks: [] };
      }
    })();
    return { ...base, picks: pickDistractors(rng, directProof(base), difficulty) };
  },
  render(params) {
    return orderSlide(directProof(params), params.picks);
  },
  solution(params) {
    return orderSolution(directProof(params), params.picks);
  },
};

/* ---------- Counterexample and exhaustion ---------- */

type CasesParams =
  | { family: 'primeQuadratic'; p: number; difficulty: number; picks: number[] }
  | { family: 'primeLinear'; a: number; b: number; difficulty: number; picks: number[] }
  | { family: 'modThree'; c: number; difficulty: number; picks: number[] }
  | { family: 'modFour'; c: number; difficulty: number; picks: number[] };

const OPEN_COUNTEREXAMPLE =
  'The claim is about every positive integer $n$, so one value of $n$ where it fails disproves it.';

/** The two distractors every counterexample shares. */
const COUNTEREXAMPLE_POOL: Distractor[] = [
  {
    text: 'To disprove it, we must show it fails for every positive integer $n$.',
    why: 'One value where it fails is enough to show that "for every $n$" is false.',
  },
  {
    text: 'Checking a few values of $n$ and finding primes would prove the claim.',
    why: 'No number of examples proves a claim about every $n$ — and this one is false.',
  },
];

/** Disprove "n^2 + n + p is always prime" with n = p. */
function primeQuadraticProof(p: number, difficulty: number): Proof {
  const expr = `n^2 + n + ${p}`;
  const product = `${p} \\times ${p + 2}`;
  const substitute = `${p}^2 + ${p} + ${p}`;
  const evaluate =
    difficulty >= 2
      ? [
          `Then $${expr} = ${substitute}$.`,
          `Taking out the common factor, that is $${p}(${p} + 1 + 1) = ${product}$.`,
        ]
      : [`Then $${expr} = ${substitute} = ${product}$.`];
  const slip =
    difficulty >= 2
      ? `Taking out the common factor, that is $${p}(${p} + 1) = ${p} \\times ${p + 1}$.`
      : `Then $${expr} = ${substitute} = ${p} \\times ${p + 1}$.`;
  return {
    claim: `Disprove the claim that $${expr}$ is prime for every positive integer $n$.`,
    steps: [
      OPEN_COUNTEREXAMPLE,
      `So look for one: take $n = ${p}$, which makes every term a multiple of $${p}$.`,
      ...evaluate,
      `$${product}$ is not prime, so the claim is false.`,
    ],
    pool: [
      ...COUNTEREXAMPLE_POOL,
      {
        text: slip,
        why: `$${substitute}$ has three terms, so the factor left is $${p} + 1 + 1 = ${p + 2}$.`,
      },
      {
        text: `$${product}$ is odd, so the claim is false.`,
        why: `Odd numbers can be prime. What makes it not prime is the factor $${p}$.`,
      },
    ],
  };
}

/** Disprove "an + b is always prime" with n = b. */
function primeLinearProof(a: number, b: number, difficulty: number): Proof {
  const expr = `${a}n + ${b}`;
  const product = `${b} \\times ${a + 1}`;
  const substitute = `${a} \\times ${b} + ${b}`;
  const evaluate =
    difficulty >= 2
      ? [
          `Then $${expr} = ${substitute}$.`,
          `Taking out the common factor, that is $${b}(${a} + 1) = ${product}$.`,
        ]
      : [`Then $${expr} = ${substitute} = ${product}$.`];
  const slip =
    difficulty >= 2
      ? `Taking out the common factor, that is $${b} \\times ${a}$.`
      : `Then $${expr} = ${substitute} = ${b} \\times ${a}$.`;
  return {
    claim: `Disprove the claim that $${expr}$ is prime for every positive integer $n$.`,
    steps: [
      OPEN_COUNTEREXAMPLE,
      `So look for one: take $n = ${b}$, which makes both terms multiples of $${b}$.`,
      ...evaluate,
      `$${product}$ is not prime, so the claim is false.`,
    ],
    pool: [
      ...COUNTEREXAMPLE_POOL,
      {
        text: slip,
        why: `The second $${b}$ leaves a $1$ behind when the factor comes out: $${b}(${a} + 1)$.`,
      },
      {
        text: `$${product}$ is odd, so the claim is false.`,
        why: `Odd numbers can be prime. What makes it not prime is the factor $${b}$.`,
      },
    ],
  };
}

/** `3(3k^2 + 2k + 1) + 2`, dropping a zero constant inside the bracket. */
function divided(by: number, inside: string, constant: number, remainder: number): string {
  return `${by}(${inside}${plus(constant)}) + ${remainder}`;
}

/** n^2 + c is never a multiple of 3, for c = 1 (mod 3): three cases. */
function modThreeProof(c: number): Proof {
  const expr = `n^2 + ${c}`;
  const q0 = (c - 1) / 3;
  const q1 = (c - 1) / 3;
  const q2 = (c + 2) / 3;
  return {
    claim: `Prove that $${expr}$ is never a multiple of $3$, for any integer $n$.`,
    steps: [
      'Every integer $n$ is $3k$, $3k + 1$ or $3k + 2$ for some integer $k$, so there are three cases.',
      `First, if $n = 3k$, then $${expr} = 9k^2 + ${c} = ${divided(3, '3k^2', q0, 1)}$.`,
      `Next, if $n = 3k + 1$, then $${expr} = 9k^2 + 6k + ${c + 1} = ${divided(3, '3k^2 + 2k', q1, 2)}$.`,
      `Finally, if $n = 3k + 2$, then $${expr} = 9k^2 + 12k + ${c + 4} = ${divided(3, '3k^2 + 4k', q2, 2)}$.`,
      `No case leaves remainder $0$ on division by $3$, so $${expr}$ is never a multiple of $3$.`,
    ],
    pool: [
      {
        text: 'Every integer $n$ is $3k$ or $3k + 1$ for some integer $k$, so there are two cases.',
        why: 'That misses every $n$ of the form $3k + 2$, such as $2$ and $5$.',
      },
      {
        text: `First, if $n = 3k$, then $${expr} = 3k^2 + ${c}$.`,
        why: '$(3k)^2$ squares the $3$ as well: it is $9k^2$.',
      },
      {
        text: `Checking $n = 1$, $2$ and $3$ gives $${c + 1}$, $${c + 4}$ and $${c + 9}$, none a multiple of $3$, which proves it.`,
        why: 'Three examples are not every integer. The three cases are what cover them all.',
      },
      {
        text: `Every case leaves remainder $1$, so $${expr}$ is never a multiple of $3$.`,
        why: 'Two of the cases leave remainder $2$. What matters is that none leaves $0$.',
      },
    ],
  };
}

/** n^2 + c is never a multiple of 4, for c = 1 or 2 (mod 4): even or odd. */
function modFourProof(c: number, difficulty: number): Proof {
  const expr = `n^2 + ${c}`;
  const r0 = c % 4;
  const q0 = (c - r0) / 4;
  const r1 = (c + 1) % 4;
  const q1 = (c + 1 - r1) / 4;
  const evenCase =
    q0 === 0
      ? `If $n = 2k$, then $${expr} = 4k^2 + ${c}$, which leaves remainder $${r0}$ on division by $4$.`
      : `If $n = 2k$, then $${expr} = 4k^2 + ${c} = ${divided(4, 'k^2', q0, r0)}$, which leaves remainder $${r0}$ on division by $4$.`;
  const oddForm = divided(4, 'k^2 + k', q1, r1);
  const oddCase =
    difficulty >= 2
      ? [
          `Otherwise $n = 2k + 1$, and $${expr} = 4k^2 + 4k + ${c + 1}$.`,
          `That is $${oddForm}$, which leaves remainder $${r1}$.`,
        ]
      : [`Otherwise $n = 2k + 1$, and $${expr} = 4k^2 + 4k + ${c + 1} = ${oddForm}$, which leaves remainder $${r1}$.`];
  return {
    claim: `Prove that $${expr}$ is never a multiple of $4$, for any integer $n$.`,
    steps: [
      'Every integer $n$ is even or odd, so $n = 2k$ or $n = 2k + 1$ for some integer $k$.',
      evenCase,
      ...oddCase,
      `Neither case leaves remainder $0$, so $${expr}$ is never a multiple of $4$.`,
    ],
    pool: [
      {
        text: 'Every integer $n$ is even or odd, so $n = 2k$ or $n = 2k + 2$ for some integer $k$.',
        why: '$2k + 2$ is even too. An odd number is $2k + 1$.',
      },
      {
        text: `Otherwise $n = 2k + 1$, and $${expr} = 4k^2 + ${c + 1}$.`,
        why: '$(2k + 1)^2$ has a middle term: it is $4k^2 + 4k + 1$.',
      },
      {
        text: `Checking $n = 0$, $1$ and $2$ gives $${c}$, $${c + 1}$ and $${c + 4}$, none a multiple of $4$, which proves it.`,
        why: 'Three examples are not every integer. The two cases are what cover them all.',
      },
      {
        text: `Both cases leave an odd remainder, so $${expr}$ is never a multiple of $4$.`,
        why: `The remainders are $${r0}$ and $${r1}$, and one of them is even. What matters is that neither is $0$.`,
      },
    ],
  };
}

function casesProof(params: CasesParams): Proof {
  switch (params.family) {
    case 'primeQuadratic':
      return primeQuadraticProof(params.p, params.difficulty);
    case 'primeLinear':
      return primeLinearProof(params.a, params.b, params.difficulty);
    case 'modThree':
      return modThreeProof(params.c);
    case 'modFour':
      return modFourProof(params.c, params.difficulty);
  }
}

const PRIMES = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];

const proofOrderCases: Generator<CasesParams> = {
  id: 'proof-order-cases',
  sample(rng, difficulty) {
    const family = rng.pick(['primeQuadratic', 'primeLinear', 'modThree', 'modFour'] as const);
    const base = (() => {
      switch (family) {
        case 'primeQuadratic':
          return { family, p: rng.pick(PRIMES), difficulty, picks: [] };
        case 'primeLinear':
          return {
            family,
            a: rng.pick([2, 4, 6, 8, 10]),
            b: rng.pick([3, 5, 7]),
            difficulty,
            picks: [],
          };
        case 'modThree':
          return { family, c: rng.pick([1, 4, 7, 10, 13]), difficulty, picks: [] };
        case 'modFour':
          return { family, c: rng.pick([1, 2, 5, 6, 9, 10]), difficulty, picks: [] };
      }
    })();
    return { ...base, picks: pickDistractors(rng, casesProof(base), difficulty) };
  },
  render(params) {
    return orderSlide(casesProof(params), params.picks);
  },
  solution(params) {
    return orderSolution(casesProof(params), params.picks);
  },
};

export const proofOrderGenerators = [proofOrderDirect, proofOrderCases];
