/**
 * Sequences & Series.
 *
 * Level 1 is sequences: rules that give a term from its position or from the
 * term before, arithmetic and geometric sequences and their nth terms, what
 * the differences between terms say about a sequence, and recurrence
 * relations. Level 2 is series: sigma notation, the arithmetic and geometric
 * sums, the sum to infinity, and series met in words (savings, a bouncing
 * ball, a rising salary). Level 3 asks where a sequence goes, level 4 adds
 * up powers and telescoping sums, and level 5 proves sum formulae and the
 * closed forms of recurrences by induction (its own note is at its section).
 *
 * Every value a learner places or types is whole, apart from a common ratio
 * asked for as a fraction. A sum to infinity is built backwards from a whole
 * S and a ratio such as 1/2 or 2/3, so that the first term S(1 - r) is whole
 * too, and the question asks for S or r rather than for later terms.
 *
 * Two things the checker cannot do shape which widget asks what. It compares
 * values at real points, so a rule with a negative ratio, whose (-2)^(n-1)
 * goes complex off the integers, is placed as tiles or picked, never typed.
 * And mathjs has no sigma, so a sum is written in sigma form with tiles and
 * evaluated by reducing it written out.
 */
import type { Rng } from '../../engine/rng';
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { bin, num, pow, valueOf, type Expr } from '../expr';
import { markerWindow, plotSvg } from '../figures';
import { sumTex, termTex } from './calculus';
import { lin, orderSlide, orderSolution, pickDistractors, polyTex as kPoly, type Distractor, type Proof } from './numberProof';

/* ---------- shared ---------- */

/** `+ 4` or `- 4`, for a term written after another. */
function signed(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** `$22$nd`: a position written as an ordinal in prose. */
function ordinal(k: number): string {
  const tens = k % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] ?? 'th';
  return `$${k}$${suffix}`;
}

/** `+4` or `-4` as a tile: one spelling per value, so a tile and a plain `-4` never disagree. */
function token(value: number): string {
  return value < 0 ? `${value}` : `+${value}`;
}

/** A number in brackets when it is negative, for substituting: `3 \times (-2)`. */
function br(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A power of `n` as written by hand, reusing the course-wide term formatter. */
function nTerm(coefficient: number, power: number): string {
  return termTex(coefficient, power).replace(/x/g, 'n');
}

/** A coefficient written in front of a number being multiplied: nothing for 1, `3 \times ` otherwise. */
function times(a: number): string {
  if (a === 1) return '';
  if (a === -1) return '-';
  return `${a} \\times `;
}

/** an + b. */
function linearTex(a: number, b: number): string {
  return sumTex([nTerm(a, 1), `${b}`]);
}

/** an^2 + bn + c. */
function quadTex(a: number, b: number, c: number): string {
  return sumTex([nTerm(a, 2), nTerm(b, 1), `${c}`]);
}

/** A list of terms, as a sequence is written. */
function listTex(values: (number | string)[], more = true): string {
  return `${values.join(', \\; ')}${more ? ', \\; \\dots' : ''}`;
}

/** A finished list of terms, three to a line so six negative terms still fit a phone. */
function listLines(values: (number | string)[]): string {
  const lines = [];
  for (let i = 0; i < values.length; i += 3) lines.push(values.slice(i, i + 3).join(', \\; '));
  return `\\begin{gathered} ${lines.join(', \\\\ ')} \\end{gathered}`;
}

function gcd(x: number, y: number): number {
  let a = Math.abs(x);
  let b = Math.abs(y);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** p/q as the learner reads it, reduced, with a whole number left whole. */
function fracTex(p: number, q: number): string {
  const g = gcd(p, q) * (q < 0 ? -1 : 1);
  const [n, d] = [p / g, q / g];
  if (d === 1) return `${n}`;
  return n < 0 ? `-\\frac{${-n}}{${d}}` : `\\frac{${n}}{${d}}`;
}

/** The same fraction for the grader; the outer brackets matter (PITFALLS 3.3). */
function fracAnswer(p: number, q: number): string {
  return `((${p})/(${q}))`;
}

/** Stacked lines of working, aligned. */
function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** A stable number from a question's own values, for turning options. Never the rng (PITFALLS 3.10). */
function mix(...values: (number | string)[]): number {
  let hash = 7;
  for (const value of values) {
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function turned<T>(items: T[], turn: number): T[] {
  const at = turn % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/** A native choice's options, the first label correct, turned by the question's own values. */
function nativeChoice(labels: string[], salt: number, tex = true): { options: { id: string; label: string; tex: boolean }[]; correctId: string } {
  const kept = [...new Set(labels)];
  return {
    options: turned(
      kept.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex })),
      salt,
    ),
    correctId: 'correct',
  };
}

/** The correct number and three wrong ones: the slips first, then near misses. */
function numberOptions(correct: number, slips: number[]): ChoiceOption[] {
  const out: ChoiceOption[] = [{ tex: `${correct}`, answer: `${correct}`, correct: true }];
  const seen = new Set([correct]);
  for (const value of [...slips, correct + 1, correct - 1, correct + 2, correct - 2, correct + 3]) {
    if (out.length === 4) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    out.push({ tex: `${value}`, answer: `${value}` });
  }
  return out;
}

/**
 * A bank of whole numbers for a table or a tree: every answer (repeats kept,
 * since a value can be needed twice), then up to four distinct distractors,
 * the likeliest slips first, topped up with near misses so at least two
 * remain. Sorted by value, never shuffled (PITFALLS 3.10).
 */
function numberBank(answer: number[], slips: number[], most = 4): string[] {
  const extras: number[] = [];
  for (const value of slips) {
    if (extras.length >= most) break;
    if (!Number.isInteger(value) || answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  for (let step = 1; extras.length < 2; step += 1) {
    for (const value of [answer[answer.length - 1] + step, answer[0] - step]) {
      if (extras.length < 2 && !answer.includes(value) && !extras.includes(value)) extras.push(value);
    }
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

const NUMBER = /^-?\d+$/;

/** A tiles bank: every answer token (repeats kept) plus the distinct distractors, sorted. */
function tileBank(answer: string[], distractors: string[], most = 5): string[] {
  // Tiles grade on exact strings, so two tokens that only differ in spacing
  // would look like one tile and grade as two. Keep the first of each look.
  const look = (text: string) => text.replace(/\s+/g, '');
  const seen = new Set(answer.map(look));
  const extras = distractors
    .filter((text) => !seen.has(look(text)) && seen.add(look(text)))
    .slice(0, most);
  const all = [...answer, ...extras];
  if (all.every((token) => NUMBER.test(token))) return all.sort((x, y) => Number(x) - Number(y));
  return all.sort();
}

/** A steps bank: distinct lines, sorted so one question renders one way. */
function stepsBank(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/** `count` distinct positions from `lo` to `hi`, in order. */
function positions(rng: Rng, lo: number, hi: number, count: number): number[] {
  const all = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return rng.sample(all, count).sort((x, y) => x - y);
}

/** A table's cells: each value given, or null where it is one of the blanks. */
function column(values: number[], blanks: number[]): (string | null)[] {
  return values.map((value, i) => (blanks.includes(i) ? null : `${value}`));
}

/** A number typed on the keypad, with a lead naming what it is. */
function typed(prompt: Block[], lead: string, answer: number | string, keypad: KeypadKey[] = []): Slide {
  return { kind: 'expression', prompt, lead, keypad, answer: `${answer}`, domain: 'real', mode: 'exact' };
}

const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/* ---------- Level 1, lesson 1: rules for sequences ---------- */

type RuleMode = 'linear' | 'quadratic' | 'add' | 'affine';

interface RuleTableParams {
  mode: RuleMode;
  a: number;
  b: number;
  start: number;
  blanks: number[];
}

function ruleTerms({ mode, a, b, start }: RuleTableParams, count = 5): number[] {
  if (mode === 'linear') return Array.from({ length: count }, (_, i) => a * (i + 1) + b);
  if (mode === 'quadratic') return Array.from({ length: count }, (_, i) => a * (i + 1) ** 2 + b);
  const terms = [start];
  while (terms.length < count) {
    const last = terms[terms.length - 1];
    terms.push(mode === 'add' ? last + a : a * last + b);
  }
  return terms;
}

function ruleWords({ mode, a, b }: RuleTableParams): string {
  if (mode === 'add') return a > 0 ? `add $${a}$` : `take away $${-a}$`;
  return b > 0 ? `multiply by $${a}$, then add $${b}$` : `multiply by $${a}$, then take away $${-b}$`;
}

/**
 * Fill in a sequence from its rule. A position-to-term rule gives each blank
 * from its own n, so any row can be missing; a term-to-term rule needs the
 * row above, so the first term is always given and, at difficulty 1, no two
 * neighbouring terms are missing.
 */
const ruleTable: Generator<RuleTableParams> = {
  id: 'seq-rule-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const explicit = rng.chance(0.5);
      if (explicit) {
        const mode: RuleMode = hard ? 'quadratic' : 'linear';
        const a = hard ? rng.pick([1, 2, 3, -1]) : rng.pick([-4, -3, -2, 2, 3, 4, 5, 6, 7]);
        const b = rng.int(-9, 9);
        return { mode, a, b, start: 0, blanks: positions(rng, 0, 4, hard ? 3 : 2) };
      }
      const mode: RuleMode = hard ? 'affine' : 'add';
      const a = hard ? rng.pick([2, 3]) : rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]);
      const b = hard ? rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) : 0;
      const start = hard ? rng.int(-3, 5) : rng.int(-5, 20);
      const blanks = hard ? positions(rng, 1, 4, 3) : rng.pick([[1, 3], [1, 4], [2, 4]]);
      const params = { mode, a, b, start, blanks };
      const terms = ruleTerms(params);
      if (terms[1] === terms[0] || terms.some((t) => Math.abs(t) > 300)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { mode, a, b, blanks } = params;
    const terms = ruleTerms(params);
    const answer = blanks.map((i) => terms[i]);
    const slips: number[] = [];
    for (const i of blanks) {
      const n = i + 1;
      if (mode === 'linear') slips.push(a * n, a * (n + 1) + b, n + a + b, a * (n - 1) + b);
      else if (mode === 'quadratic') slips.push((a * n) ** 2 + b, a * 2 * n + b, a * n ** 2, a * (n + 1) ** 2 + b);
      else if (mode === 'add') slips.push(terms[i] + a, terms[i] - 1, terms[i] + 1, terms[i] - a);
      else slips.push(a * terms[i - 1], a * (terms[i - 1] + b), terms[i] + b, a * terms[i] + b);
    }
    const explicit = mode === 'linear' || mode === 'quadratic';
    const prompt: Block[] = explicit
      ? [
          { kind: 'prose', text: 'This rule gives each term straight from its position $n$. Fill in the missing terms.' },
          { kind: 'display', tex: `u_n = ${mode === 'linear' ? linearTex(a, b) : quadTex(a, 0, b)}` },
        ]
      : [
          {
            kind: 'prose',
            text: `The first term is $${params.start}$. To get each next term, ${ruleWords(params)}. Fill in the missing terms.`,
          },
        ];
    return {
      kind: 'table',
      prompt,
      columns: ['n', 'u_n'],
      rows: terms.map((_, i) => [`${i + 1}`, column(terms, blanks)[i]]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { mode, a, b, blanks } = params;
    const terms = ruleTerms(params);
    if (mode === 'linear' || mode === 'quadratic') {
      return [
        { text: 'Each term comes from its own position, so put each missing $n$ into the rule.' },
        {
          tex: chain(
            ...blanks.map((i) =>
              mode === 'linear'
                ? `u_{${i + 1}} &= ${a} \\times ${i + 1} ${signed(b)} = ${terms[i]}`
                : `u_{${i + 1}} &= ${times(a)}${i + 1}^{2} ${signed(b)} = ${terms[i]}`,
            ),
          ),
        },
      ];
    }
    return [
      { text: `Each term comes from the one before it: ${ruleWords(params)}. Work down the table from the first term.` },
      {
        tex: chain(
          ...terms.slice(1).map((t, j) =>
            mode === 'add' ? `${terms[j]} ${signed(a)} &= ${t}` : `${a} \\times ${br(terms[j])} ${signed(b)} &= ${t}`,
          ),
        ),
      },
    ];
  },
};

type RuleKind = 'position' | 'term';

interface RuleKindParams {
  want: RuleKind;
  /** The rules offered, the correct one first. */
  labels: string[];
}

/** One rule of each kind, built from the rng; the tricky shapes only when `hard`. */
function ruleOf(rng: Rng, kind: RuleKind, shape: number): string {
  const k = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7]);
  const m = rng.pick([2, 3, 4, 5]);
  const c = rng.pick([-6, -3, -1, 1, 2, 4, 5]);
  if (kind === 'position') {
    if (shape === 0) return `u_n = ${linearTex(rng.pick([2, 3, 4, 5, -2, -3]), c)}`;
    if (shape === 1) return `u_n = ${quadTex(1, 0, c)}`;
    if (shape === 2) return `u_n = ${nTerm(m, 2)}`;
    return `u_{n+1} = ${linearTex(m, c)}`;
  }
  if (shape === 0) return `u_{n+1} = u_n ${signed(k)}`;
  if (shape === 1) return `u_{n+1} = ${m}u_n`;
  if (shape === 2) return `u_{n+1} = ${m}u_n ${signed(c)}`;
  if (shape === 3) return `u_n = u_{n-1} ${signed(k)}`;
  return `u_{n+1} = u_n + ${nTerm(m, 1)}`;
}

/**
 * Which of four rules is position-to-term (or term-to-term)? The harder
 * draws hide the kind behind the subscript: `u_{n+1} = 3n + 1` has no earlier
 * term on the right, so it is position-to-term, and `u_n = u_{n-1} + 4` is
 * term-to-term.
 */
const ruleKind: Generator<RuleKindParams> = {
  id: 'seq-rule-kind',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const want: RuleKind = rng.pick(['position', 'term']);
    const other: RuleKind = want === 'position' ? 'term' : 'position';
    const shapes = (kind: RuleKind) =>
      kind === 'position' ? (hard ? [0, 1, 2, 3] : [0, 1, 2]) : hard ? [0, 1, 2, 3, 4] : [0, 1, 2];
    for (;;) {
      const right = ruleOf(rng, want, rng.pick(shapes(want)));
      const wrong = rng.sample(shapes(other), 3).map((shape) => ruleOf(rng, other, shape));
      const labels = [right, ...wrong];
      if (new Set(labels).size === 4) return { want, labels };
    }
  },
  render: ({ want, labels }): Slide => {
    const { options, correctId } = nativeChoice(labels, mix(...labels));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which of these is a **${want === 'position' ? 'position-to-term' : 'term-to-term'}** rule?`,
        },
      ],
      options,
      correctId,
    };
  },
  solution: ({ want, labels }) => [
    {
      text: 'Look at the right-hand side. If an earlier term such as $u_n$ or $u_{n-1}$ appears there, the rule is term-to-term: it needs the term before. If only $n$ appears, it is position-to-term, whatever the subscript on the left.',
    },
    { text: `So the ${want === 'position' ? 'position-to-term' : 'term-to-term'} rule is $${labels[0]}$.` },
  ],
};

interface MethodParams {
  kind: RuleKind;
  a: number;
  b: number;
  /** For a quadratic position rule, the n^2 coefficient; 0 otherwise. */
  sq: number;
  start: number;
  k: number;
}

function methodRule({ kind, a, b, sq, start }: MethodParams): string {
  if (kind === 'position') return `u_n = ${sq ? quadTex(sq, 0, b) : linearTex(a, b)}`;
  return `u_{n+1} = ${a === 1 ? 'u_n' : `${a}u_n`} ${signed(b)}, \\quad u_1 = ${start}`;
}

/**
 * Find u_k for a large k: which route does the rule allow? A position rule
 * takes n = k straight in; a term-to-term rule has no n to substitute and
 * must be walked from the first term.
 */
const methodFlow: Generator<MethodParams> = {
  id: 'seq-method-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind: RuleKind = rng.pick(['position', 'term']);
    const k = rng.int(hard ? 30 : 12, hard ? 100 : 60);
    if (kind === 'position') {
      const sq = hard && rng.chance(0.5) ? rng.pick([1, 2]) : 0;
      return { kind, a: rng.pick([2, 3, 4, 5, 6, -2, -3]), b: rng.int(-9, 9), sq, start: 0, k };
    }
    return {
      kind,
      a: hard ? rng.pick([2, 3]) : 1,
      b: rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6]),
      sq: 0,
      start: rng.int(-3, 9),
      k,
    };
  },
  render: (params): Slide => {
    const { kind, k } = params;
    const sub = `Put $n = ${k}$ into the rule`;
    const walk = 'Work along from $u_1$';
    const methodStep = (id: string, right: boolean) => ({
      id,
      ask: `How do you find $u_{${k}}$?`,
      branches: turned(
        [
          {
            label: sub,
            outcome: right
              ? `Substitute: the rule gives any term straight from its position, so $u_{${k}}$ needs nothing else.`
              : `There is no $n$ on the right to substitute: this rule needs $u_{${k - 1}}$ before it can give $u_{${k}}$.`,
          },
          {
            label: walk,
            outcome: right
              ? `Apply the rule again and again, from $u_1$ up to $u_{${k}}$: it only ever gives the next term.`
              : `That gets there, but after $${k - 1}$ steps. A position rule gives $u_{${k}}$ in one.`,
          },
        ],
        mix(k, params.b),
      ),
    });
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `You need $u_{${k}}$ from this rule. Decide how to get it.` }],
      subject: methodRule(params),
      steps: [
        {
          id: 'kind',
          ask: 'What kind of rule is this?',
          branches: turned(
            [
              { label: 'Position-to-term', to: 'position' },
              { label: 'Term-to-term', to: 'term' },
            ],
            mix(k),
          ),
        },
        methodStep('position', kind === 'position'),
        methodStep('term', kind === 'term'),
      ],
      answer: kind === 'position' ? ['Position-to-term', sub] : ['Term-to-term', walk],
    };
  },
  solution: (params) => {
    const { kind, a, b, sq, k } = params;
    if (kind === 'position') {
      const value = sq ? sq * k * k + b : a * k + b;
      return [
        { text: `Only $n$ appears on the right of $${methodRule(params)}$, so it is position-to-term.` },
        { tex: sq ? `u_{${k}} = ${times(sq)}${k}^{2} ${signed(b)} = ${value}` : `u_{${k}} = ${a} \\times ${k} ${signed(b)} = ${value}` },
      ];
    }
    return [
      { text: `The right of $${methodRule(params)}$ needs $u_n$, the term before, so it is term-to-term.` },
      { text: `It gives $u_2$ from $u_1$, then $u_3$ from $u_2$, and so on: $${k - 1}$ steps to reach $u_{${k}}$.` },
    ];
  },
};

interface TermParams {
  a: number;
  b: number;
  c: number;
  quad: boolean;
  k: number;
}

const termValue = ({ a, b, c, quad }: TermParams, n: number) => (quad ? a * n * n + b * n + c : a * n + c);

/** A term from a position-to-term rule, typed. Harder rules carry an n^2. */
const termOf: Generator<TermParams> = {
  id: 'seq-term',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      return { a: rng.pick([1, 2, 3, -1]), b: rng.int(-5, 5), c: rng.int(-9, 9), quad: true, k: rng.int(5, 15) };
    }
    return { a: rng.pick([-4, -3, -2, 2, 3, 4, 5, 6, 7, 8]), b: 0, c: rng.int(-9, 12), quad: false, k: rng.int(10, 60) };
  },
  choices: (params) => {
    const { k, a, quad } = params;
    return numberOptions(termValue(params, k), [
      termValue(params, k - 1),
      termValue(params, k + 1),
      quad ? (a * k) ** 2 + params.b * k + params.c : a * k,
    ]);
  },
  render: (params): Slide =>
    typed(
      [
        { kind: 'prose', text: `A sequence has $n$th term $u_n = ${params.quad ? quadTex(params.a, params.b, params.c) : linearTex(params.a, params.c)}$. Find $u_{${params.k}}$.` },
      ],
      `u_{${params.k}} =`,
      termValue(params, params.k),
    ),
  solution: (params) => {
    const { a, b, c, quad, k } = params;
    return [
      { text: `Put $n = ${k}$ into the rule.` },
      {
        tex: chain(
          quad
            ? `u_{${k}} &= ${times(a)}${k}^{2} ${b ? `${signed(b)} \\times ${k}` : ''} ${signed(c)}`
            : `u_{${k}} &= ${a} \\times ${k} ${signed(c)}`,
          `&= ${termValue(params, k)}`,
        ),
      },
      ...(quad ? [{ text: `Square $${k}$ first${a === 1 ? '' : `, before multiplying by $${a}$`}: $${k}^{2} = ${k * k}$.` }] : []),
    ];
  },
};

/* ---------- Level 1, lesson 2: arithmetic sequences ---------- */

interface ApTreeParams {
  a: number;
  d: number;
  p: number;
  q: number;
  /** A later term to find as well, harder draws only. */
  k: number;
}

const ap = (a: number, d: number, n: number) => a + (n - 1) * d;

/** Two terms of an arithmetic sequence: the rise between them, d, then a (and a later term). */
const apTree: Generator<ApTreeParams> = {
  id: 'seq-ap-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const p = rng.int(2, hard ? 5 : 3);
    const q = p + rng.int(2, hard ? 6 : 4);
    const d = hard ? rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]) : rng.int(2, 7);
    const a = rng.int(hard ? -10 : -5, 12);
    return { a, d, p, q, k: hard ? rng.int(15, 40) : 0 };
  },
  render: ({ a, d, p, q, k }): Slide => {
    const up = ap(a, d, p);
    const uq = ap(a, d, q);
    const nodes = [
      { id: 'gap', from: [] },
      { id: 'd', from: ['gap'] },
      { id: 'a', from: ['d'] },
      ...(k ? [{ id: 'later', from: ['a', 'd'] }] : []),
    ];
    const answer = [uq - up, d, a, ...(k ? [ap(a, d, k)] : [])];
    const slips = [
      up - p * d,
      up + (p - 1) * d,
      uq - up === 0 ? 1 : Math.round((uq - up) / (q - p + 1)),
      -d,
      a + d,
      ...(k ? [a + k * d, ap(a, d, k - 1)] : []),
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `An arithmetic sequence has these two terms. Fill the tree: how far it moves from $u_{${p}}$ to $u_{${q}}$, the common difference $d$, the first term $a$${k ? `, then $u_{${k}}$` : ''}.`,
        },
      ],
      expression: `u_{${p}} = ${up}, \\quad u_{${q}} = ${uq}`,
      nodes,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, d, p, q, k }) => [
    { text: `From $u_{${p}}$ to $u_{${q}}$ is $${q - p}$ steps of $d$.` },
    { tex: chain(`${q - p}d &= ${ap(a, d, q)} - ${br(ap(a, d, p))} = ${(q - p) * d}`, `d &= ${d}`) },
    { text: `$u_{${p}} = a + ${p - 1}d$, so step back from $u_{${p}}$.` },
    { tex: `a = ${ap(a, d, p)} - ${p - 1} \\times ${br(d)} = ${a}` },
    ...(k ? [{ tex: chain(`u_{${k}} &= ${a} + ${k - 1} \\times ${br(d)}`, `&= ${ap(a, d, k)}`) }] : []),
  ],
};

interface ApParams {
  a: number;
  d: number;
}

/** u_n = a + (n - 1)d from the first terms, then simplified. */
const apNthTiles: Generator<ApParams> = {
  id: 'seq-ap-nth-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const d = hard ? rng.pick([-8, -7, -6, -5, -4, -3, -2, 3, 4, 5, 6, 7, 8, 9]) : rng.int(2, 9);
      const a = hard ? rng.int(-6, 25) : rng.int(-3, 15);
      if (a === d || a === 0) continue;
      return { a, d };
    }
  },
  render: ({ a, d }): Slide => {
    const answer = [`${a}`, token(d), `${d}`, token(a - d)];
    const slips = [`${a + d}`, token(-d), `${-d}`, token(a), token(d - a), token(a + d), `${a}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write the $n$th term of this arithmetic sequence as $a + (n - 1)d$, then simplify it.' },
        { kind: 'display', tex: listTex([0, 1, 2, 3].map((i) => a + i * d)) },
      ],
      template: 'u_n = {0} {1}(n - 1) = {2}n {3}',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: ({ a, d }) => [
    { text: `The first term is $a = ${a}$, and each term is $${Math.abs(d)}$ ${d > 0 ? 'more' : 'less'} than the one before${d > 0 ? '' : `, so $d = ${d}$`}.` },
    { tex: chain(`u_n &= ${a} ${signed(d)}(n - 1)`, `&= ${a} ${signed(d)}n ${signed(-d)}`, `&= ${linearTex(d, a - d)}`) },
  ],
};

interface ApTermParams {
  a: number;
  d: number;
  k: number;
}

/** The kth term of an arithmetic sequence given by its first terms. */
const apTerm: Generator<ApTermParams> = {
  id: 'seq-ap-term',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      a: rng.int(hard ? -10 : 1, hard ? 60 : 20),
      d: hard ? rng.pick([-9, -7, -6, -4, -3, -2, 3, 4, 6, 7, 8, 11]) : rng.int(2, 9),
      k: rng.int(hard ? 20 : 10, hard ? 100 : 50),
    };
  },
  choices: ({ a, d, k }) => numberOptions(ap(a, d, k), [a + k * d, k * d, ap(a, d, k - 1), a * k]),
  render: ({ a, d, k }): Slide =>
    typed(
      [
        { kind: 'prose', text: `Find the ${ordinal(k)} term of this arithmetic sequence.` },
        { kind: 'display', tex: listTex([0, 1, 2, 3].map((i) => a + i * d)) },
      ],
      `u_{${k}} =`,
      ap(a, d, k),
    ),
  solution: ({ a, d, k }) => [
    { text: `$a = ${a}$ and $d = ${d}$. The ${ordinal(k)} term is $${k - 1}$ steps on from the first, not $${k}$.` },
    { tex: chain(`u_{${k}} &= ${a} + ${k - 1} \\times ${br(d)}`, `&= ${a} ${signed((k - 1) * d)}`, `&= ${ap(a, d, k)}`) },
  ],
};

interface WhichParams {
  a: number;
  d: number;
  n: number;
}

/** Which term is it? a + (n - 1)d = value, solved for n. */
const whichTerm: Generator<WhichParams> = {
  id: 'seq-which-term',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      return rng.chance(0.5)
        ? { a: rng.int(60, 150), d: -rng.int(2, 9), n: rng.int(8, 30) }
        : { a: rng.int(-20, -1), d: rng.int(3, 12), n: rng.int(12, 40) };
    }
    return { a: rng.int(1, 20), d: rng.int(2, 9), n: rng.int(10, 40) };
  },
  choices: ({ a, d, n }) => numberOptions(n, [n - 1, n + 1, Math.round(ap(a, d, n) / d)]),
  render: ({ a, d, n }): Slide =>
    typed(
      [
        { kind: 'prose', text: `Which term of this arithmetic sequence is $${ap(a, d, n)}$?` },
        { kind: 'display', tex: listTex([0, 1, 2, 3].map((i) => a + i * d)) },
      ],
      'n =',
      n,
    ),
  solution: ({ a, d, n }) => [
    { text: `$a = ${a}$ and $d = ${d}$, so $u_n = ${linearTex(d, a - d)}$. Set that equal to $${ap(a, d, n)}$.` },
    { tex: chain(`${linearTex(d, a - d)} &= ${ap(a, d, n)}`, `${nTerm(d, 1)} &= ${ap(a, d, n) - (a - d)}`, `n &= ${n}`) },
  ],
};

interface ApTableParams {
  a: number;
  d: number;
  given: number[];
}

/** An arithmetic sequence with gaps: find d from the terms given, then fill both ways. */
const apTable: Generator<ApTableParams> = {
  id: 'seq-ap-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const d = hard ? rng.pick([-7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]) : rng.int(2, 8);
    const a = rng.int(hard ? -12 : -4, 15);
    if (hard) {
      const i = rng.int(1, 2);
      return { a, d, given: [i, i + rng.int(2, 3)] };
    }
    return { a, d, given: [0, 1, rng.int(2, 5)] };
  },
  render: ({ a, d, given }): Slide => {
    const terms = Array.from({ length: 6 }, (_, i) => ap(a, d, i + 1));
    const blanks = terms.map((_, i) => i).filter((i) => !given.includes(i));
    const answer = blanks.map((i) => terms[i]);
    const slips = blanks.flatMap((i) => [terms[i] + d, terms[i] - 1, terms[i] + 1, -terms[i]]);
    return {
      kind: 'table',
      prompt: [{ kind: 'prose', text: 'This sequence is arithmetic. Fill in the missing terms.' }],
      columns: ['n', 'u_n'],
      rows: terms.map((_, i) => [`${i + 1}`, column(terms, blanks)[i]]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, d, given }) => {
    const [i, j] = given;
    return [
      j - i === 1
        ? { text: `The common difference is $u_{${j + 1}} - u_{${i + 1}} = ${ap(a, d, j + 1)} - ${br(ap(a, d, i + 1))} = ${d}$.` }
        : {
            text: `From $u_{${i + 1}}$ to $u_{${j + 1}}$ is $${j - i}$ steps: $${j - i}d = ${ap(a, d, j + 1)} - ${br(ap(a, d, i + 1))} = ${(j - i) * d}$, so $d = ${d}$.`,
          },
      { text: d > 0 ? `Add $${d}$ to go down the table and take it away to go up.` : `Take $${-d}$ away to go down the table and add it to go up.` },
      { tex: listLines(Array.from({ length: 6 }, (_, n) => ap(a, d, n + 1))) },
    ];
  },
};

/* ---------- Level 1, lesson 3: geometric sequences ---------- */

interface GpTreeParams {
  a: number;
  r: number;
  p: number;
  /** 1 for neighbouring terms, 3 for terms three apart. */
  gap: number;
  k: number;
}

const gp = (a: number, r: number, n: number) => a * r ** (n - 1);

/** Two terms of a geometric sequence: r (through r^3 when three apart), a, then a later term. */
const gpTree: Generator<GpTreeParams> = {
  id: 'seq-gp-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const gap = hard ? 3 : 1;
      const r = hard ? rng.pick([2, 3, -2, -3]) : rng.pick([2, 3, 4, 5, -2, -3]);
      const a = hard ? rng.pick([1, 2, 3, 4, 5, -1, -2, -3]) : rng.int(1, 6);
      const p = hard ? rng.int(1, 2) : rng.int(2, 3);
      const k = rng.int(p + gap + 1, hard ? p + gap + 2 : 7);
      if (Math.abs(gp(a, r, k)) > 5000) continue;
      return { a, r, p, gap, k };
    }
  },
  render: ({ a, r, p, gap, k }): Slide => {
    const up = gp(a, r, p);
    const uq = gp(a, r, p + gap);
    const three = gap === 3;
    const nodes = [
      ...(three ? [{ id: 'cube', from: [] as string[] }] : []),
      { id: 'r', from: three ? ['cube'] : [] },
      { id: 'a', from: ['r'] },
      { id: 'later', from: ['a', 'r'] },
    ];
    const answer = [...(three ? [r ** 3] : []), r, a, gp(a, r, k)];
    const slips = [uq - up, -r, up * r, a * r, gp(a, r, k + 1), gp(a, r, k - 1), r * r, ...(three ? [uq - up] : [])];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: three
            ? `A geometric sequence has these two terms. Fill the tree: what $u_{${p + 3}}$ is divided by $u_{${p}}$ (that is $r^3$), the common ratio $r$, the first term $a$, then $u_{${k}}$.`
            : `A geometric sequence has these two terms. Fill the tree: the common ratio $r$, the first term $a$, then $u_{${k}}$.`,
        },
      ],
      expression: `u_{${p}} = ${up}, \\quad u_{${p + gap}} = ${uq}`,
      nodes,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, r, p, gap, k }) => [
    gap === 3
      ? { tex: chain(`r^3 &= ${gp(a, r, p + 3)} \\div ${br(gp(a, r, p))} = ${r ** 3}`, `r &= ${r}`) }
      : { tex: `r = ${gp(a, r, p + 1)} \\div ${br(gp(a, r, p))} = ${r}` },
    { text: p === 1 ? `$u_1$ is the first term, so $a = ${a}$.` : `$u_{${p}} = ar^{${p - 1}}$, so divide back down to $u_1$.` },
    ...(p === 1 ? [] : [{ tex: `a = ${gp(a, r, p)} \\div ${br(r)}${p - 1 > 1 ? `^{${p - 1}}` : ''} = ${a}` }]),
    { tex: chain(`u_{${k}} &= ar^{${k - 1}}`, `&= ${a} \\times ${br(r)}^{${k - 1}}`, `&= ${gp(a, r, k)}`) },
  ],
};

interface GpTilesParams {
  a: number;
  /** The ratio p/q, q = 1 for a whole ratio. */
  rp: number;
  rq: number;
  k: number;
}

/** (p/q)^power as the learner reads it in a tile: 2^{n-1}, (-2)^{n-1}, (1/2)^{n-1}. */
function ratioPowTex(p: number, q: number, power: string): string {
  if (q === 1) return p < 0 ? `(${p})^{${power}}` : `${p}^{${power}}`;
  return `\\left(${fracTex(p, q)}\\right)^{${power}}`;
}

/** u_n = ar^(n-1) placed as tiles from the first terms, then a term from it. */
const gpNthTiles: Generator<GpTilesParams> = {
  id: 'seq-gp-nth-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const k = rng.int(5, hard ? 6 : 7);
      if (hard && rng.chance(0.5)) {
        const rq = rng.pick([2, 3]);
        const a = rq ** (k - 1) * rng.pick([1, 2, 3, 5]);
        if (a > 2000) continue;
        return { a, rp: 1, rq, k };
      }
      const rp = hard ? rng.pick([-2, -3, -4]) : rng.pick([2, 3, 4, 5]);
      const a = rng.int(1, hard ? 5 : 6);
      if (Math.abs(a * rp ** (k - 1)) > 20000) continue;
      return { a, rp, rq: 1, k };
    }
  },
  render: ({ a, rp, rq, k }): Slide => {
    const uk = (a * rp ** (k - 1)) / rq ** (k - 1);
    const answer = [`${a}`, ratioPowTex(rp, rq, 'n-1'), `${uk}`];
    const slips = [
      `${(a * rp) / rq}`,
      ratioPowTex(rp, rq, 'n'),
      ratioPowTex(rq, rp, 'n-1'),
      `${(a * rp ** k) / rq ** k}`,
      `${(a * rp ** (k - 2)) / rq ** (k - 2)}`,
      ...(rp < 0 ? [`${-uk}`] : []),
    ].filter((token) => !/\./.test(token));
    const first = [0, 1, 2].map((i) => fracTex(a * rp ** i, rq ** i));
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Write the $n$th term of this geometric sequence as $ar^{n-1}$, then use it to find $u_${k}$.` },
        { kind: 'display', tex: listTex(first) },
      ],
      template: `u_n = {0} \\times {1} \\qquad u_${k} = {2}`,
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: ({ a, rp, rq, k }) => [
    { text: `The first term is $a = ${a}$, and each term is the one before times $r = ${fracTex(rp, rq)}$.` },
    { tex: `u_n = ${a} \\times ${ratioPowTex(rp, rq, 'n-1')}` },
    { tex: `u_${k} = ${a} \\times ${ratioPowTex(rp, rq, `${k - 1}`)} = ${(a * rp ** (k - 1)) / rq ** (k - 1)}` },
  ],
};

interface GpTableParams {
  a: number;
  /** A whole ratio, or 0 for a halving sequence. */
  r: number;
  given: number[];
}

function gpTerms({ a, r }: GpTableParams): number[] {
  return Array.from({ length: 6 }, (_, i) => (r === 0 ? a / 2 ** i : a * r ** i));
}

/** A geometric sequence with gaps. Harder draws give two middle terms, so the table is also filled upwards. */
const gpTable: Generator<GpTableParams> = {
  id: 'seq-gp-table',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const r = rng.pick([-2, -3, 0, 3]);
      const a = r === 0 ? 32 * rng.pick([1, 3, 5, 7]) : rng.pick([1, 2, 3, 4, -1, -2, -3]);
      const i = rng.int(1, 3);
      return { a, r, given: [i, i + 1] };
    }
    const r = rng.pick([2, 3, -2]);
    const a = r === 3 ? rng.int(1, 3) : rng.int(1, 6);
    return { a, r, given: [0, 1, rng.int(2, 5)] };
  },
  render: (params): Slide => {
    const terms = gpTerms(params);
    const blanks = terms.map((_, i) => i).filter((i) => !params.given.includes(i));
    const answer = blanks.map((i) => terms[i]);
    const ratio = terms[1] / terms[0];
    const slips = blanks.flatMap((i) => [terms[i] * ratio, -terms[i], terms[i] + (terms[1] - terms[0]), terms[i] * 2]);
    return {
      kind: 'table',
      prompt: [{ kind: 'prose', text: 'This sequence is geometric. Fill in the missing terms.' }],
      columns: ['n', 'u_n'],
      rows: terms.map((_, i) => [`${i + 1}`, column(terms, blanks)[i]]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const terms = gpTerms(params);
    const [i] = params.given;
    const [p, q] = params.r === 0 ? [1, 2] : [params.r, 1];
    return [
      { text: `The common ratio is $u_{${i + 2}} \\div u_{${i + 1}} = ${terms[i + 1]} \\div ${br(terms[i])} = ${fracTex(p, q)}$.` },
      { text: `Multiply by $${fracTex(p, q)}$ to go down the table${i > 0 ? `, and divide by it to go up` : ''}.` },
      { tex: listLines(terms) },
    ];
  },
};

interface GpTermParams {
  a: number;
  r: number;
  k: number;
}

/** The kth term of a geometric sequence given by its first terms. */
const gpTerm: Generator<GpTermParams> = {
  id: 'seq-gp-term',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r = hard ? rng.pick([-2, -3, 2, 3, 4]) : rng.pick([2, 3]);
      const a = rng.int(1, hard ? 7 : 6);
      const k = rng.int(hard ? 6 : 5, hard ? 10 : 8);
      if (Math.abs(gp(a, r, k)) > 30000) continue;
      return { a, r, k };
    }
  },
  choices: ({ a, r, k }) => numberOptions(gp(a, r, k), [a * r ** k, gp(a, r, k - 1), (a * r) ** (k - 1), -gp(a, r, k), a * r * (k - 1)]),
  render: ({ a, r, k }): Slide =>
    typed(
      [
        { kind: 'prose', text: `Find the ${ordinal(k)} term of this geometric sequence.` },
        { kind: 'display', tex: listTex([0, 1, 2].map((i) => a * r ** i)) },
      ],
      `u_{${k}} =`,
      gp(a, r, k),
    ),
  solution: ({ a, r, k }) => [
    { text: `$a = ${a}$ and $r = ${r}$. The ${ordinal(k)} term has $r$ multiplied in $${k - 1}$ times.` },
    { tex: chain(`u_{${k}} &= ${a} \\times ${br(r)}^{${k - 1}}`, `&= ${a} \\times ${br(r ** (k - 1))}`, `&= ${gp(a, r, k)}`) },
    { text: 'If the terms had grown by a percentage instead, the ratio would be the multiplier, as in the growth lesson of Exponents & Radicals.' },
  ],
};

/* ---------- Level 1, lesson 4: terms and differences ---------- */

interface QuadParams {
  a: number;
  b: number;
  c: number;
}

const quadAt = ({ a, b, c }: QuadParams, n: number) => a * n * n + b * n + c;

/** A quadratic whose first terms are neither all equal nor too big to read. */
function sampleQuad(rng: Rng, hard: boolean): QuadParams {
  for (;;) {
    const a = hard ? rng.pick([2, 3, -1, -2]) : 1;
    const b = rng.int(hard ? -6 : -3, hard ? 6 : 4);
    const c = rng.int(hard ? -9 : -5, hard ? 9 : 6);
    const terms = [1, 2, 3, 4, 5, 6].map((n) => quadAt({ a, b, c }, n));
    if (terms.some((t) => Math.abs(t) > 150)) continue;
    return { a, b, c };
  }
}

interface DiffTableParams extends QuadParams {
  hard: boolean;
}

/**
 * Terms and first differences side by side. The differences go up by the
 * same amount each row, which is what fills the table. Easier draws give the
 * first three terms; harder ones only two, with two differences further on.
 */
const diffTable: Generator<DiffTableParams> = {
  id: 'seq-diff-table',
  sample: (rng, difficulty) => ({ ...sampleQuad(rng, difficulty > 1), hard: difficulty > 1 }),
  render: (params): Slide => {
    const terms = [1, 2, 3, 4, 5].map((n) => quadAt(params, n));
    const diffs = terms.slice(0, -1).map((t, i) => terms[i + 1] - t);
    const termBlanks = params.hard ? [2, 3, 4] : [3, 4];
    const diffBlanks = params.hard ? [0, 3] : [2, 3];
    const rows: (string | null)[][] = [];
    const answer: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const row: (string | null)[] = [`${i + 1}`];
      if (termBlanks.includes(i)) {
        row.push(null);
        answer.push(terms[i]);
      } else row.push(`${terms[i]}`);
      if (i === 4) row.push('');
      else if (diffBlanks.includes(i)) {
        row.push(null);
        answer.push(diffs[i]);
      } else row.push(`${diffs[i]}`);
      rows.push(row);
    }
    const second = 2 * params.a;
    const slips = [
      ...diffs.map((d) => d + second),
      ...terms.map((t, i) => t + diffs[Math.min(i, 3)] - second),
      ...terms.map((t) => t + 1),
    ];
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: 'The last column is the difference from each term to the next. Those differences go up by the same amount every row. Fill in the table.',
        },
      ],
      columns: ['n', 'u_n', 'u_{n+1} - u_n'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const terms = [1, 2, 3, 4, 5].map((n) => quadAt(params, n));
    const diffs = terms.slice(0, -1).map((t, i) => terms[i + 1] - t);
    return [
      { text: `The differences change by $${2 * params.a}$ each row (the second difference), so they run:` },
      { tex: diffs.join(', \\; ') },
      { text: 'Each term is the one above plus the difference beside it, so the terms are:' },
      { tex: terms.join(', \\; ') },
    ];
  },
};

interface DiffStepsParams extends QuadParams {
  quad: boolean;
}

/**
 * The nth term from differences, one step at a time. Easier draws are
 * linear: the difference, what is left over, the rule. Harder draws are
 * quadratic: first and second differences, the n^2 coefficient, what is left
 * after taking an^2 away, and the rule.
 */
const diffSteps: Generator<DiffStepsParams> = {
  id: 'seq-diff-steps',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      for (;;) {
        const a = rng.pick([1, 2]);
        const b = rng.int(-4, 5);
        const c = rng.int(-6, 6);
        if (b === 0 && c === 0) continue;
        return { a, b, c, quad: true };
      }
    }
    for (;;) {
      const b = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]);
      const c = rng.int(-8, 10);
      if (c === 0) continue;
      return { a: 0, b, c, quad: false };
    }
  },
  render: (params): Slide => {
    const { a, b, c, quad } = params;
    const terms = [1, 2, 3, 4, 5].map((n) => quadAt(params, n));
    const start = [listTex(terms)];
    const prompt: Block[] = [
      {
        kind: 'prose',
        text: 'Find the $n$th term of this sequence one step at a time: tap the line to take the next step, then choose what it gives.',
      },
    ];
    if (!quad) {
      const off = b < 0 ? `u_n + ${nTerm(-b, 1)}` : `u_n - ${nTerm(b, 1)}`;
      return {
        kind: 'steps',
        prompt,
        start,
        reductions: [
          {
            span: [0, 1],
            value: `\\text{difference} = ${b}`,
            bank: stepsBank([`\\text{difference} = ${b}`, `\\text{difference} = ${-b}`, `\\text{difference} = ${terms[0]}`, `\\text{difference} = ${2 * b}`]),
          },
          {
            span: [0, 1],
            value: `${off} = ${c}`,
            bank: stepsBank([`${off} = ${c}`, `${off} = ${-c}`, `${off} = ${terms[0]}`, `${off} = ${c + b}`]),
          },
          {
            span: [0, 1],
            value: `u_n = ${linearTex(b, c)}`,
            bank: stepsBank([`u_n = ${linearTex(b, c)}`, `u_n = ${linearTex(c, b)}`, `u_n = ${linearTex(b, -c)}`, `u_n = ${linearTex(b, terms[0])}`]),
          },
        ],
      };
    }
    const diffs = terms.slice(0, -1).map((t, i) => terms[i + 1] - t);
    const rest = [1, 2, 3, 4, 5].map((n) => b * n + c);
    const lead = nTerm(a, 2);
    return {
      kind: 'steps',
      prompt,
      start,
      reductions: [
        {
          span: [0, 1],
          value: `\\text{1st differences: } ${diffs.join(', ')}`,
          bank: stepsBank([
            `\\text{1st differences: } ${diffs.join(', ')}`,
            `\\text{1st differences: } ${diffs.map((d) => -d).join(', ')}`,
            `\\text{1st differences: } ${diffs.map((d) => d + 1).join(', ')}`,
          ]),
        },
        {
          span: [0, 1],
          value: `\\text{2nd difference: } ${2 * a}`,
          bank: stepsBank([`\\text{2nd difference: } ${2 * a}`, `\\text{2nd difference: } ${diffs[0]}`, `\\text{2nd difference: } ${a}`, `\\text{2nd difference: } ${2 * a + 1}`]),
        },
        {
          span: [0, 1],
          value: `u_n = ${lead} + \\dots`,
          bank: stepsBank([`u_n = ${lead} + \\dots`, `u_n = ${nTerm(2 * a, 2)} + \\dots`, `u_n = ${nTerm(a + 2, 2)} + \\dots`, `u_n = ${nTerm(2 * a, 1)} + \\dots`]),
        },
        {
          span: [0, 1],
          value: `u_n - ${lead}: \\; ${rest.join(', ')}`,
          bank: stepsBank([
            `u_n - ${lead}: \\; ${rest.join(', ')}`,
            `u_n - ${lead}: \\; ${[1, 2, 3, 4, 5].map((n) => quadAt(params, n) - 2 * a * n * n).join(', ')}`,
            `u_n - ${lead}: \\; ${rest.map((v) => v + 1).join(', ')}`,
          ]),
        },
        {
          span: [0, 1],
          value: `u_n = ${quadTex(a, b, c)}`,
          bank: stepsBank([`u_n = ${quadTex(a, b, c)}`, `u_n = ${quadTex(a, c, b)}`, `u_n = ${quadTex(a, b, -c)}`, `u_n = ${quadTex(2 * a, b, c)}`]),
        },
      ],
    };
  },
  solution: (params) => {
    const { a, b, c, quad } = params;
    const terms = [1, 2, 3, 4, 5].map((n) => quadAt(params, n));
    if (!quad) {
      return [
        { text: `The terms ${b > 0 ? 'go up' : 'go down'} by $${Math.abs(b)}$ each time, so $u_n$ starts with $${nTerm(b, 1)}$.` },
        { text: `$${nTerm(b, 1)}$ gives $${[1, 2, 3, 4, 5].map((n) => b * n).join(', ')}$; each term is $${Math.abs(c)}$ ${c > 0 ? 'more' : 'less'} than that.` },
        { tex: `u_n = ${linearTex(b, c)}` },
      ];
    }
    const diffs = terms.slice(0, -1).map((t, i) => terms[i + 1] - t);
    return [
      { tex: chain(`&\\text{1st differences: } ${diffs.join(', ')}`, `&\\text{2nd difference: } ${2 * a}`) },
      { text: `The $n^2$ coefficient is half the second difference: $${a}$.` },
      { text: `Take $${nTerm(a, 2)}$ from each term: $${[1, 2, 3, 4, 5].map((n) => b * n + c).join(', ')}$, which is $${linearTex(b, c)}$.` },
      { tex: `u_n = ${quadTex(a, b, c)}` },
    ];
  },
};

type Pattern = 'arithmetic' | 'geometric' | 'square' | 'fibonacci' | 'alternate' | 'growing' | 'powerPlus';

interface ClassifyParams {
  pattern: Pattern;
  terms: number[];
}

const CLASS_LABEL = { arithmetic: '\\text{Arithmetic}', geometric: '\\text{Geometric}', neither: '\\text{Neither}' } as const;

function classOf(pattern: Pattern): keyof typeof CLASS_LABEL {
  if (pattern === 'arithmetic' || pattern === 'geometric') return pattern;
  return 'neither';
}

/** Arithmetic, geometric or neither? Harder draws add negative ratios and near-misses. */
const classify: Generator<ClassifyParams> = {
  id: 'seq-classify',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const pattern: Pattern = rng.pick(
      hard
        ? ['arithmetic', 'geometric', 'geometric', 'square', 'fibonacci', 'alternate', 'growing', 'powerPlus']
        : ['arithmetic', 'arithmetic', 'geometric', 'geometric', 'square', 'fibonacci', 'growing'],
    );
    const five = (f: (i: number) => number) => [0, 1, 2, 3, 4].map(f);
    if (pattern === 'arithmetic') {
      const a = rng.int(-10, 30);
      const d = hard ? rng.pick([-7, -5, -4, -3, 3, 4, 6, 9]) : rng.int(2, 9);
      return { pattern, terms: five((i) => a + i * d) };
    }
    if (pattern === 'geometric') {
      const r = hard ? rng.pick([-2, -3, 2, 3]) : rng.pick([2, 3]);
      const a = rng.int(1, hard ? 5 : 6) * (hard && rng.chance(0.3) ? -1 : 1);
      if (hard && rng.chance(0.3)) {
        const top = rng.pick([1, 3, 5]) * 16;
        return { pattern, terms: five((i) => top / 2 ** i) };
      }
      return { pattern, terms: five((i) => a * r ** i) };
    }
    if (pattern === 'square') {
      const c = rng.int(-4, 9);
      const s = rng.int(1, 3);
      return { pattern, terms: five((i) => (i + s) ** 2 + c) };
    }
    if (pattern === 'fibonacci') {
      const terms = [rng.int(1, 5), rng.int(1, 7)];
      while (terms.length < 5) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
      return { pattern, terms };
    }
    if (pattern === 'alternate') {
      const [p, q] = rng.sample([2, 3, 4, 5, 6], 2);
      const terms = [rng.int(1, 10)];
      while (terms.length < 5) terms.push(terms[terms.length - 1] + (terms.length % 2 === 1 ? p : q));
      return { pattern, terms };
    }
    if (pattern === 'growing') {
      const start = rng.int(1, 12);
      const step = rng.int(1, 3);
      const terms = [start];
      while (terms.length < 5) terms.push(terms[terms.length - 1] + step * terms.length);
      return { pattern, terms };
    }
    const c = rng.pick([-1, 1, 2, 3, 5]);
    const base = rng.pick([2, 3]);
    return { pattern, terms: five((i) => base ** (i + 1) + c) };
  },
  render: ({ pattern, terms }): Slide => {
    const right = classOf(pattern);
    const labels = [CLASS_LABEL[right], ...Object.values(CLASS_LABEL).filter((label) => label !== CLASS_LABEL[right])];
    const { options, correctId } = nativeChoice(labels, mix(...terms));
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Is this sequence arithmetic, geometric, or neither?' },
        { kind: 'display', tex: `${terms.join(', \\, ')}, \\, \\dots` },
      ],
      options,
      correctId,
    };
  },
  solution: ({ pattern, terms }) => {
    const diffs = terms.slice(1).map((t, i) => t - terms[i]);
    const steps: SolutionStep[] = [{ text: 'Take each term from the next:' }, { tex: diffs.join(', \\; ') }];
    if (pattern === 'arithmetic') {
      steps.push({ text: `The difference is always $${diffs[0]}$, so it is arithmetic.` });
      return steps;
    }
    steps.push({ text: 'The differences are not all the same, so it is not arithmetic. Try dividing each term by the one before.' });
    if (pattern === 'geometric') {
      steps.push({ text: `Each term is the one before times $${fracTex(terms[1], terms[0])}$, so it is geometric.` });
      return steps;
    }
    const ratios = terms.slice(1).map((t, i) => (terms[i] === 0 ? '\\text{--}' : fracTex(t, terms[i])));
    steps.push({ tex: `\\text{ratios: } ${ratios.join(', \\; ')}` });
    steps.push({ text: 'The ratios are not all the same either, so it is neither.' });
    return steps;
  },
};

/** The next term of a quadratic sequence, from its differences. */
const nextTerm: Generator<QuadParams> = {
  id: 'seq-next-term',
  sample: (rng, difficulty) => sampleQuad(rng, difficulty > 1),
  choices: (params) => {
    const terms = [1, 2, 3, 4, 5, 6].map((n) => quadAt(params, n));
    const last = terms[4] - terms[3];
    return numberOptions(terms[5], [terms[4] + last, terms[4] + last + 4 * params.a, terms[5] + 2 * params.a]);
  },
  render: (params): Slide =>
    typed(
      [
        { kind: 'prose', text: 'Use the differences between terms to find the next term of this sequence.' },
        { kind: 'display', tex: listTex([1, 2, 3, 4, 5].map((n) => quadAt(params, n))) },
      ],
      'u_6 =',
      quadAt(params, 6),
    ),
  solution: (params) => {
    const terms = [1, 2, 3, 4, 5, 6].map((n) => quadAt(params, n));
    const diffs = terms.slice(1).map((t, i) => t - terms[i]);
    return [
      { text: 'Take each term from the next:' },
      { tex: diffs.slice(0, 4).join(', \\; ') },
      { text: `They change by $${2 * params.a}$ each time, so the next difference is $${diffs[4]}$.` },
      { tex: `u_6 = ${terms[4]} ${signed(diffs[4])} = ${terms[5]}` },
    ];
  },
};

/* ---------- Level 1, lesson 5: recurrence relations ---------- */

type RecForm = 'affine' | 'plusN' | 'doubleMinusN' | 'swap';

interface RecTableParams {
  form: RecForm;
  p: number;
  q: number;
  start: number;
  blanks: number[];
}

/** u_{n+1} from u_n and n. */
function recNext({ form, p, q }: RecTableParams, u: number, n: number): number {
  if (form === 'affine') return p * u + q;
  if (form === 'plusN') return u + p * n;
  if (form === 'doubleMinusN') return 2 * u - n;
  return q - u;
}

function recTerms(params: RecTableParams, count = 5): number[] {
  const terms = [params.start];
  while (terms.length < count) terms.push(recNext(params, terms[terms.length - 1], terms.length));
  return terms;
}

function recRuleTex({ form, p, q }: RecTableParams): string {
  if (form === 'affine') return `u_{n+1} = ${p === 1 ? 'u_n' : p === -1 ? '-u_n' : `${p}u_n`} ${signed(q)}`;
  if (form === 'plusN') return `u_{n+1} = u_n + ${p === 1 ? '' : p}n`;
  if (form === 'doubleMinusN') return 'u_{n+1} = 2u_n - n';
  return `u_{n+1} = ${q} - u_n`;
}

/**
 * A recurrence run down a table from u_1. Easier draws never leave two
 * neighbouring terms blank, so each blank follows from a term on screen;
 * harder ones bring n into the rule, where the slip is using n + 1.
 */
const recTable: Generator<RecTableParams> = {
  id: 'seq-rec-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const form: RecForm = hard ? rng.pick(['affine', 'plusN', 'doubleMinusN', 'swap']) : 'affine';
      const p = form === 'affine' ? rng.pick(hard ? [-2, -1, 3] : [1, 2, 3]) : form === 'plusN' ? rng.int(1, 3) : 2;
      const q = form === 'swap' ? rng.int(3, 15) : rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
      const start = rng.int(-3, 8);
      const blanks = hard ? positions(rng, 1, 4, 3) : rng.pick([[1, 3], [1, 4], [2, 4]]);
      const params = { form, p, q, start, blanks };
      const terms = recTerms(params);
      if (terms[1] === terms[0] || new Set(terms).size < 2 || terms.some((t) => Math.abs(t) > 250)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const terms = recTerms(params);
    const answer = params.blanks.map((i) => terms[i]);
    const slips = params.blanks.flatMap((i) => [
      recNext(params, terms[i - 1], i + 1),
      recNext(params, terms[i], i + 1),
      params.p * terms[i - 1],
      -terms[i],
    ]);
    return {
      kind: 'table',
      prompt: [
        { kind: 'prose', text: 'Each term comes from the one before it. Fill in the missing terms.' },
        { kind: 'display', tex: `${recRuleTex(params)}, \\quad u_1 = ${params.start}` },
      ],
      columns: ['n', 'u_n'],
      rows: terms.map((_, i) => [`${i + 1}`, column(terms, params.blanks)[i]]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const terms = recTerms(params);
    const { form, p, q } = params;
    const line = (u: number, n: number) => {
      if (form === 'affine') return `${p === 1 ? '' : `${p} \\times `}${br(u)} ${signed(q)}`;
      if (form === 'plusN') return `${br(u)} + ${p === 1 ? '' : `${p} \\times `}${n}`;
      if (form === 'doubleMinusN') return `2 \\times ${br(u)} - ${n}`;
      return `${q} - ${br(u)}`;
    };
    return [
      { text: `Put each term into the rule to get the next. With $n$ in the rule, $u_{n+1}$ uses the $n$ of the term before it.` },
      { tex: chain(...terms.slice(1).map((t, i) => `u_{${i + 2}} &= ${line(terms[i], i + 1)} = ${t}`)) },
    ];
  },
};

interface RecTilesParams {
  m: number;
  k: number;
  start: number;
  /** Add k first, then multiply: u_{n+1} = m(u_n + k). */
  addFirst: boolean;
}

/** Write a recurrence from words. Harder draws add before multiplying, so the constant is multiplied too. */
const recTiles: Generator<RecTilesParams> = {
  id: 'seq-rec-tiles',
  sample: (rng, difficulty) => ({
    m: rng.pick([2, 3, 4, 5]),
    k: rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]),
    start: rng.int(1, 9),
    addFirst: difficulty > 1,
  }),
  render: ({ m, k, start, addFirst }): Slide => {
    const constant = addFirst ? m * k : k;
    const answer = [`${m}u_n`, token(constant), `${start}`];
    const slips = [`${m}u_{n+1}`, `${m}n`, token(-constant), token(addFirst ? k : m * k), `${m * start + constant}`, `${start + 1}`];
    const change = k > 0 ? `add $${k}$` : `take away $${-k}$`;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: addFirst
            ? `To get each term, take the one before, ${change}, then multiply by $${m}$. The first term is $${start}$. Write this as a recurrence relation.`
            : `To get each term, multiply the one before by $${m}$, then ${change}. The first term is $${start}$. Write this as a recurrence relation.`,
        },
      ],
      template: 'u_{n+1} = {0} {1}, \\quad u_1 = {2}',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: ({ m, k, start, addFirst }) =>
    addFirst
      ? [
          { tex: `u_{n+1} = ${m}(u_n ${signed(k)})` },
          { text: `The whole bracket is multiplied by $${m}$, the $${k}$ as well.` },
          { tex: `u_{n+1} = ${m}u_n ${signed(m * k)}, \\quad u_1 = ${start}` },
        ]
      : [{ text: `Multiply $u_n$ by $${m}$, then ${k > 0 ? 'add' : 'take away'} $${Math.abs(k)}$.` }, { tex: `u_{n+1} = ${m}u_n ${signed(k)}, \\quad u_1 = ${start}` }],
};

interface RecTreeParams {
  p: number;
  q: number;
  start: number;
  /** Harder: carry on to u_4. */
  more: boolean;
}

/**
 * p and q in u_{n+1} = pu_n + q from three terms. Subtracting the two
 * equations u_3 = pu_2 + q and u_2 = pu_1 + q leaves u_3 - u_2 = p(u_2 - u_1).
 */
const recTree: Generator<RecTreeParams> = {
  id: 'seq-rec-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = rng.pick(hard ? [-2, -1, 2, 3, 4] : [2, 3, 4]);
      const q = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]);
      const start = rng.int(hard ? -4 : 1, 7);
      const u2 = p * start + q;
      const u4 = p * (p * u2 + q) + q;
      if (u2 === start || Math.abs(u4) > 400) continue;
      return { p, q, start, more: hard };
    }
  },
  render: ({ p, q, start, more }): Slide => {
    const u2 = p * start + q;
    const u3 = p * u2 + q;
    const u4 = p * u3 + q;
    const answer = [u3 - u2, u2 - start, p, q, ...(more ? [u4] : [])];
    const slips = [u2 - u3, -p, u2 - p * u2, start - q, q + p, u3 - p, p * u3, u4 + q];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `These terms follow $u_{n+1} = pu_n + q$. Fill the tree: $u_3 - u_2$, $u_2 - u_1$, then $p$ (the first divided by the second), then $q$${more ? ', then $u_4$' : ''}.`,
        },
      ],
      expression: `u_1 = ${start}, \\quad u_2 = ${u2}, \\quad u_3 = ${u3}`,
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'p', from: ['top', 'bottom'] },
        { id: 'q', from: ['p'] },
        ...(more ? [{ id: 'next', from: ['p', 'q'] }] : []),
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ p, q, start, more }) => {
    const u2 = p * start + q;
    const u3 = p * u2 + q;
    return [
      { tex: chain(`u_3 &= pu_2 + q`, `u_2 &= pu_1 + q`) },
      { text: 'Subtracting takes $q$ away: $u_3 - u_2 = p(u_2 - u_1)$.' },
      { tex: chain(`${u3 - u2} &= p \\times ${br(u2 - start)}`, `p &= ${p}`) },
      { tex: chain(`q &= u_2 - pu_1`, `&= ${u2} - ${br(p)} \\times ${br(start)}`, `&= ${q}`) },
      ...(more ? [{ tex: `u_4 = ${p} \\times ${br(u3)} ${signed(q)} = ${p * u3 + q}` }] : []),
    ];
  },
};

type RecFlowForm = 'swap' | 'add' | 'double' | 'swing';

interface RecFlowParams {
  form: RecFlowForm;
  start: number;
  c: number;
}

function recFlowTerms({ form, start, c }: RecFlowParams): number[] {
  const terms = [start];
  while (terms.length < 4) {
    const u = terms[terms.length - 1];
    terms.push(form === 'swap' ? c - u : form === 'add' ? u + c : form === 'double' ? 2 * u - c : c - 2 * u);
  }
  return terms;
}

function recFlowRule({ form, c }: RecFlowParams): string {
  if (form === 'swap') return `u_{n+1} = ${c} - u_n`;
  if (form === 'add') return `u_{n+1} = u_n ${signed(c)}`;
  if (form === 'double') return `u_{n+1} = 2u_n - ${c}`;
  return `u_{n+1} = ${c} - 2u_n`;
}

type Behaviour = 'periodic' | 'increasing' | 'decreasing' | 'neither';

function behaviourOf(terms: number[]): Behaviour {
  if (terms[2] === terms[0]) return 'periodic';
  if (terms[1] > terms[0] && terms[2] > terms[1]) return 'increasing';
  if (terms[1] < terms[0] && terms[2] < terms[1]) return 'decreasing';
  return 'neither';
}

/** Periodic, increasing, decreasing, or up and down? Worked out from the first terms. */
const recFlow: Generator<RecFlowParams> = {
  id: 'seq-rec-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const form: RecFlowForm = rng.pick(hard ? ['swap', 'double', 'swing', 'add'] : ['swap', 'add', 'double']);
      const start = rng.int(-2, 9);
      const c = form === 'add' ? rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]) : rng.int(1, 12);
      const params = { form, start, c };
      const terms = recFlowTerms(params);
      if (terms[1] === terms[0] || terms.some((t) => Math.abs(t) > 200)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const behaviour = behaviourOf(recFlowTerms(params));
    const direction = {
      id: 'direction',
      ask: 'How do $u_1$, $u_2$ and $u_3$ compare?',
      branches: [
        { label: 'Each bigger than the last', outcome: 'The sequence is **increasing**.' },
        { label: 'Each smaller than the last', outcome: 'The sequence is **decreasing**.' },
        { label: 'Up, then down (or down, then up)', outcome: 'It is **neither** increasing nor decreasing: it swings.' },
      ],
    };
    const labels = {
      increasing: 'Each bigger than the last',
      decreasing: 'Each smaller than the last',
      neither: 'Up, then down (or down, then up)',
    };
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Work out the first few terms, starting from $u_1 = ${params.start}$, and decide how the sequence behaves.` }],
      subject: `${recFlowRule(params)}, \\quad u_1 = ${params.start}`,
      steps: [
        {
          id: 'repeat',
          ask: 'Is $u_3$ the same as $u_1$?',
          branches: [
            { label: 'Yes', outcome: 'It repeats every two terms: the sequence is **periodic**, with period $2$.' },
            { label: 'No', to: 'direction' },
          ],
        },
        direction,
      ],
      answer: behaviour === 'periodic' ? ['Yes'] : ['No', labels[behaviour]],
    };
  },
  solution: (params) => {
    const terms = recFlowTerms(params);
    const behaviour = behaviourOf(terms);
    const words = {
      periodic: `$u_3 = u_1$, so it goes back and forth: periodic, with period $2$.`,
      increasing: 'Each term is bigger than the last: increasing.',
      decreasing: 'Each term is smaller than the last: decreasing.',
      neither: 'It goes up and down, so it is neither increasing nor decreasing.',
    };
    return [{ text: 'The first four terms are:' }, { tex: terms.join(', \\; ') }, { text: words[behaviour] }];
  },
};

/* ---------- Level 2, lesson 1: sigma notation ---------- */

/** a r + b in the letter r, as a sum's general term is written. */
function rTex(a: number, b: number): string {
  return sumTex([termTex(a, 1).replace(/x/g, 'r'), `${b}`]);
}

function sigmaTex(lo: number, hi: number): string {
  return `\\sum_{r=${lo}}^{${hi}}`;
}

type GeneralForm = 'linear' | 'square' | 'power';

interface General {
  form: GeneralForm;
  a: number;
  b: number;
}

function generalAt({ form, a, b }: General, r: number): number {
  if (form === 'linear') return a * r + b;
  if (form === 'square') return r * r + b;
  return a * b ** r;
}

/** The general term as it sits after a sigma, bracketed where it is a sum. */
function generalTex({ form, a, b }: General, bracket = true): string {
  const wrap = (tex: string) => (bracket ? `(${tex})` : tex);
  if (form === 'linear') return b === 0 ? termTex(a, 1).replace(/x/g, 'r') : wrap(rTex(a, b));
  if (form === 'square') return b === 0 ? 'r^2' : wrap(`r^2 ${signed(b)}`);
  return a === 1 ? `${b}^r` : `${a} \\times ${b}^r`;
}

interface SigmaParams extends General {
  lo: number;
  hi: number;
}

/** The series written out: its first three terms and its last. */
function writtenOut(params: SigmaParams): string {
  const { lo, hi } = params;
  const first = [lo, lo + 1, lo + 2].map((r) => generalAt(params, r));
  return `${sumTex(first.map(String))} + \\dots ${signed(generalAt(params, hi))}`;
}

/**
 * A series written out, to be put into sigma form from a bank of sigmas and
 * general terms. No wrong pair in the bank describes the same sum: a sigma
 * shifted by one is only ever offered with a count that no longer matches.
 */
const sigmaTiles: Generator<SigmaParams> = {
  id: 'seq-sigma-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      if (hard && rng.chance(0.4)) {
        const lo = rng.int(0, 1);
        return { form: 'power', a: rng.pick([1, 3, 5]), b: rng.pick([2, 3]), lo, hi: lo + rng.int(4, 6) };
      }
      const lo = hard ? rng.pick([0, 2, 3]) : 1;
      const a = rng.int(2, hard ? 7 : 5);
      const b = rng.pick(hard ? [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6] : [-3, -2, -1, 1, 2, 3, 4, 5, 6]);
      if (a * lo + b <= 0) continue;
      return { form: 'linear', a, b, lo, hi: lo + rng.int(4, hard ? 10 : 11) };
    }
  },
  render: (params): Slide => {
    const { form, a, b, lo, hi } = params;
    const general = generalTex(params, false);
    const answer = [sigmaTex(lo, hi), general];
    const slips =
      form === 'linear'
        ? [
            sigmaTex(lo, generalAt(params, hi)),
            sigmaTex(lo, hi - 1),
            sigmaTex(lo, hi + 1),
            sigmaTex(lo === 0 ? 1 : 0, hi),
            termTex(a, 1).replace(/x/g, 'r'),
            rTex(a, b + a),
            rTex(a, -b),
            ...(b > 1 ? [rTex(b, a)] : []),
          ]
        : [
            sigmaTex(lo, generalAt(params, hi)),
            sigmaTex(lo, hi - 1),
            sigmaTex(lo === 0 ? 1 : 0, hi),
            `${b}^r`,
            `${a * b}^r`,
            a === 1 ? `2 \\times ${b}^r` : `${a} \\times ${b}^{r-1}`,
          ];
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: 'Write this series in sigma notation: the limits of $r$, then the general term.' }],
      template: `${writtenOut(params)} = {0}({1})`,
      bank: tileBank(answer, slips.filter((token) => !answer.includes(token)), 6),
      answer,
    };
  },
  solution: (params) => {
    const { form, a, b, lo, hi } = params;
    return [
      form === 'linear'
        ? { text: `The terms go up by $${a}$, so the general term starts $${termTex(a, 1).replace(/x/g, 'r')}$. At $r = ${lo}$ that gives $${a * lo}$, and the first term is $${generalAt(params, lo)}$, so add $${b}$.` }
        : { text: `Each term is $${b}$ times the one before, starting from $${generalAt(params, lo)}$ at $r = ${lo}$: the general term is $${generalTex(params)}$.` },
      { text: `The last term, $${generalAt(params, hi)}$, is at $r = ${hi}$, so $r$ runs from $${lo}$ to $${hi}$.` },
      { tex: `\\begin{gathered} ${writtenOut(params)} \\\\ = ${sigmaTex(lo, hi)} ${generalTex(params)} \\end{gathered}` },
    ];
  },
};

/** Six whole values for a reduce bank: the node's own value, then the slips, then near misses. */
function offer(correct: number, ...near: number[]): string[] {
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
      if (out.length >= 6 || seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
    }
  }
  return out.sort((x, y) => x - y).map(String);
}

/** A bank for every node of a reduce expression, from the slip its shape invites. */
function banksFor(expr: Expr, path = 'r', out: Record<string, string[]> = {}): Record<string, string[]> {
  if (expr.kind === 'num') return out;
  const value = valueOf(expr);
  if (expr.kind === 'binary') {
    const l = valueOf(expr.left);
    const r = valueOf(expr.right);
    const slips = expr.op === '*' ? [l + r, value + l, value - r] : expr.op === '+' ? [l - r, l * r, value + 1] : [l + r, r - l, value - 1];
    out[path] = offer(value, ...slips);
    banksFor(expr.left, `${path}.l`, out);
    banksFor(expr.right, `${path}.r`, out);
  } else if (expr.kind === 'power') {
    const b = valueOf(expr.base);
    const e = valueOf(expr.exponent);
    out[path] = offer(value, b * e, e ** b, b ** (e + 1));
    banksFor(expr.base, `${path}.b`, out);
    banksFor(expr.exponent, `${path}.e`, out);
  }
  return out;
}

/** One term of a written-out sum as a tree: 3 × 2, 3 × 2 + 1, 2^2 + 1, 2^3. */
function termExpr({ form, a, b }: General, r: number): Expr {
  if (form === 'linear') {
    const product = bin('*', num(a), num(r));
    return b === 0 ? product : bin(b < 0 ? '-' : '+', product, num(Math.abs(b)));
  }
  if (form === 'square') {
    const square = pow(num(r), num(2));
    return b === 0 ? square : bin(b < 0 ? '-' : '+', square, num(Math.abs(b)));
  }
  return pow(num(b), num(r));
}

function sigmaTotal(params: SigmaParams): number {
  let total = 0;
  for (let r = params.lo; r <= params.hi; r += 1) total += generalAt(params, r);
  return total;
}

/** A short sum in sigma form, written out and reduced a piece at a time. */
const sigmaReduce: Generator<SigmaParams> = {
  id: 'seq-sigma-reduce',
  sample: (rng, difficulty) => {
    const lo = rng.int(1, 2);
    if (difficulty > 1) {
      const form: GeneralForm = rng.pick(['linear', 'square', 'power']);
      if (form === 'linear') return { form, a: rng.int(2, 5), b: rng.pick([-3, -2, -1, 1, 2, 3, 4]), lo, hi: lo + 2 };
      if (form === 'square') return { form, a: 1, b: rng.pick([-2, -1, 1, 2, 3, 5]), lo: rng.int(1, 3), hi: 0 };
      return { form, a: 1, b: rng.pick([2, 3]), lo, hi: lo + 3 };
    }
    if (rng.chance(0.5)) return { form: 'square', a: 1, b: 0, lo: rng.int(1, 5), hi: 0 };
    return { form: 'linear', a: rng.int(2, 9), b: 0, lo, hi: lo + rng.int(2, 3) };
  },
  choices: (params) => {
    const total = sigmaTotal({ ...params, hi: hiOf(params) });
    const p = { ...params, hi: hiOf(params) };
    return numberOptions(total, [total - generalAt(p, p.hi), total + generalAt(p, p.hi + 1), total - generalAt(p, p.lo) + generalAt(p, p.lo - 1)]);
  },
  render: (params): Slide => {
    const p = { ...params, hi: hiOf(params) };
    let expr = termExpr(p, p.lo);
    for (let r = p.lo + 1; r <= p.hi; r += 1) expr = bin('+', expr, termExpr(p, r));
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Written out, $${sigmaTex(p.lo, p.hi)} ${generalTex(p)}$ is the sum below. Tap the part you would work out next, then choose what it comes to.`,
        },
      ],
      expr,
      banks: banksFor(expr),
    };
  },
  solution: (params) => {
    const p = { ...params, hi: hiOf(params) };
    const values = Array.from({ length: p.hi - p.lo + 1 }, (_, i) => generalAt(p, p.lo + i));
    return [
      { text: `Put $r = ${p.lo}, ${p.lo + 1}, \\dots, ${p.hi}$ into $${generalTex(p, false)}$ in turn, then add.` },
      { tex: chain(`${sigmaTex(p.lo, p.hi)} ${generalTex(p)} &= ${sumTex(values.map(String))}`, `&= ${sigmaTotal(p)}`) },
    ];
  },
};

/** A square sum runs over three values of r; the others store their own end. */
function hiOf(params: SigmaParams): number {
  return params.form === 'square' ? params.lo + 2 : params.hi;
}

type CountParams = SigmaParams;

/** How many terms does a sigma have? One more than top minus bottom. */
const sigmaCount: Generator<CountParams> = {
  id: 'seq-sigma-count',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const lo = hard ? rng.int(2, 15) : rng.int(0, 1);
    const hi = lo + rng.int(hard ? 5 : 4, hard ? 45 : 39);
    const form: GeneralForm = rng.pick(['linear', 'square', 'power']);
    if (form === 'linear') return { form, a: rng.int(2, 7), b: rng.int(-5, 6), lo, hi };
    if (form === 'square') return { form, a: 1, b: rng.int(-3, 4), lo, hi };
    return { form, a: rng.pick([1, 2, 5]), b: rng.pick([2, 3]), lo, hi };
  },
  choices: ({ lo, hi }) => numberOptions(hi - lo + 1, [hi - lo, hi, hi - lo + 2]),
  render: (params): Slide =>
    typed(
      [{ kind: 'prose', text: `How many terms are in $${sigmaTex(params.lo, params.hi)} ${generalTex(params)}$?` }],
      '\\text{terms} =',
      params.hi - params.lo + 1,
    ),
  solution: ({ lo, hi }) => [
    { text: `$r$ takes every whole value from $${lo}$ to $${hi}$, both ends included.` },
    { tex: `${hi} - ${lo} + 1 = ${hi - lo + 1}` },
    ...(lo === 1 ? [] : [{ text: `Only a sum starting at $r = 1$ has as many terms as its top number; this one starts at $${lo}$.` }]),
  ],
};

/** Write out the first three terms of a sigma and its last. */
const sigmaTerms: Generator<SigmaParams> = {
  id: 'seq-sigma-terms',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const lo = hard ? rng.pick([0, 2, 3]) : 1;
      const form: GeneralForm = hard ? rng.pick(['linear', 'square', 'power']) : 'linear';
      const hi = lo + rng.int(hard ? 4 : 5, hard ? 7 : 14);
      const params: SigmaParams =
        form === 'linear'
          ? { form, a: rng.int(2, 7), b: rng.int(-4, 6), lo, hi }
          : form === 'square'
            ? { form, a: 1, b: rng.int(-3, 5), lo, hi }
            : { form, a: rng.pick([1, 3, 5]), b: rng.pick([2, 3]), lo, hi: lo + rng.int(3, 5) };
      if (generalAt(params, lo) <= 0 || new Set([lo, lo + 1, lo + 2, params.hi].map((r) => generalAt(params, r))).size < 4) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { lo, hi } = params;
    const answer = [lo, lo + 1, lo + 2, hi].map((r) => `${generalAt(params, r)}`);
    const slips = [lo - 1, lo + 3, hi - 1, hi + 1].map((r) => generalAt(params, r));
    if (params.form === 'linear') slips.push(params.a * lo, params.a * hi);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write out the first three terms of this sum, and its last term.' },
        { kind: 'display', tex: `${sigmaTex(lo, hi)} ${generalTex(params)}` },
      ],
      template: '{0} + {1} + {2} + \\dots + {3}',
      bank: tileBank(answer, slips.filter((v) => v > 0 && Number.isInteger(v)).map(String), 4),
      answer,
    };
  },
  solution: (params) => {
    const { lo, hi } = params;
    const general = generalTex(params, false);
    return [
      { text: `Put each value of $r$ into $${general}$, starting at $r = ${lo}$${lo === 1 ? '' : ', not at 1'}.` },
      { tex: chain(...[lo, lo + 1, lo + 2, hi].map((r) => `r = ${r}: &\\quad ${generalAt(params, r)}`)) },
    ];
  },
};

/* ---------- Level 2, lesson 2: arithmetic series ---------- */

interface ApSumParams {
  a: number;
  d: number;
  n: number;
}

const apSum = ({ a, d, n }: ApSumParams, count = n) => (count * (2 * a + (count - 1) * d)) / 2;

function sampleApSum(rng: Rng, hard: boolean): ApSumParams {
  return {
    a: rng.int(hard ? -10 : 1, hard ? 40 : 20),
    d: hard ? rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7]) : rng.int(2, 9),
    n: rng.int(hard ? 8 : 6, hard ? 30 : 20),
  };
}

/** S_n = n/2 (2a + (n - 1)d), filled in as a tree. */
const apSumTree: Generator<ApSumParams> = {
  id: 'seq-ap-total-tree',
  sample: (rng, difficulty) => sampleApSum(rng, difficulty > 1),
  render: (params): Slide => {
    const { a, d, n } = params;
    const bracket = 2 * a + (n - 1) * d;
    const answer = [2 * a, (n - 1) * d, bracket, apSum(params)];
    const slips = [n * d, 2 * a + n * d, a + (n - 1) * d, n * bracket, apSum(params, n - 1), a * 2 + d];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `An arithmetic series has first term $a = ${a}$ and common difference $d = ${d}$. Fill the tree for the sum of its first $${n}$ terms: $2a$, $(n - 1)d$, the bracket, then $S_{${n}}$.`,
        },
      ],
      expression: `S_{${n}} = \\frac{${n}}{2}\\left(2 \\times ${br(a)} + ${n - 1} \\times ${br(d)}\\right)`,
      nodes: [
        { id: 'twoA', from: [] },
        { id: 'rest', from: [] },
        { id: 'bracket', from: ['twoA', 'rest'] },
        { id: 'sum', from: ['bracket'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { a, d, n } = params;
    const bracket = 2 * a + (n - 1) * d;
    return [
      { tex: `S_n = \\frac{n}{2}\\left(2a + (n - 1)d\\right)` },
      { tex: chain(`S_{${n}} &= \\frac{${n}}{2}\\left(${2 * a} ${signed((n - 1) * d)}\\right)`, `&= \\frac{${n}}{2} \\times ${br(bracket)}`, `&= ${apSum(params)}`) },
      { text: `$(n - 1)d$, not $nd$: the first term has no $d$ added to it.` },
    ];
  },
};

interface ApStepsParams extends ApSumParams {
  /** Harder: the last term is not given, so the full formula is worked. */
  full: boolean;
}

/** Four distinct values for a steps bank: the right one first, then slips, then near misses. */
function valueBank(correct: number, ...slips: number[]): string[] {
  const out = [correct];
  for (const value of [...slips, correct + 1, correct - 1, correct + 2, correct - 2]) {
    if (out.length === 4) break;
    if (Number.isInteger(value) && !out.includes(value)) out.push(value);
  }
  return out.sort((x, y) => x - y).map(String);
}

/**
 * An arithmetic sum worked out one operation at a time. Easier draws give
 * the last term and use n/2 (a + l); harder ones the full n/2 (2a + (n - 1)d).
 */
const apSeriesSteps: Generator<ApStepsParams> = {
  id: 'seq-ap-series-steps',
  sample: (rng, difficulty) => ({ ...sampleApSum(rng, difficulty > 1), full: difficulty > 1 }),
  render: (params): Slide => {
    const { a, d, n, full } = params;
    const l = a + (n - 1) * d;
    const S = apSum(params);
    if (!full) {
      const pair = a + l;
      return {
        kind: 'steps',
        prompt: [
          {
            kind: 'prose',
            text: `An arithmetic series has $${n}$ terms: the first is $${a}$ and the last is $${l}$. Its sum $\\frac{n}{2}(a + l)$ is written out below. Tap the operation to do next, then choose what it gives.`,
          },
        ],
        start: [`${n}`, '\\times', `(${a}`, l < 0 ? '-' : '+', `${Math.abs(l)})`, '\\div', '2'],
        reductions: [
          { span: [2, 5], operator: 3, value: `${pair}`, bank: valueBank(pair, a - l, l - a) },
          { span: [0, 3], operator: 1, value: `${n * pair}`, bank: valueBank(n * pair, n + pair, pair * (n - 1)) },
          { span: [0, 3], operator: 1, value: `${S}`, bank: valueBank(S, n * pair * 2, n * pair - 2) },
        ],
      };
    }
    const bracket = 2 * a + (n - 1) * d;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `An arithmetic series has first term $${a}$, common difference $${d}$ and $${n}$ terms. Its sum $\\frac{n}{2}(2a + (n - 1)d)$ is written out below. Tap the operation to do next, then choose what it gives.`,
        },
      ],
      start: [`${n}`, '\\times', '(', '2', '\\times', br(a), '+', `${n - 1}`, '\\times', br(d), ')', '\\div', '2'],
      reductions: [
        { span: [3, 6], operator: 4, value: `${2 * a}`, bank: valueBank(2 * a, 2 + a, a) },
        { span: [5, 8], operator: 6, value: `${(n - 1) * d}`, bank: valueBank((n - 1) * d, n * d, n - 1 + d) },
        { span: [2, 7], operator: 4, value: `${bracket}`, bank: valueBank(bracket, 2 * a - (n - 1) * d, bracket + d) },
        { span: [0, 3], operator: 1, value: `${n * bracket}`, bank: valueBank(n * bracket, n + bracket, (n - 1) * bracket) },
        { span: [0, 3], operator: 1, value: `${S}`, bank: valueBank(S, n * bracket * 2, S + n) },
      ],
    };
  },
  solution: (params) => {
    const { a, d, n, full } = params;
    const l = a + (n - 1) * d;
    if (!full) {
      return [
        { text: 'Brackets first, then multiply, then halve.' },
        { tex: chain(`S_{${n}} &= \\frac{${n}}{2}(${a} ${signed(l)})`, `&= ${n} \\times ${br(a + l)} \\div 2`, `&= ${apSum(params)}`) },
      ];
    }
    return [
      { text: 'Inside the bracket, the two multiplications come before the addition.' },
      { tex: chain(`S_{${n}} &= \\frac{${n}}{2}(${2 * a} ${signed((n - 1) * d)})`, `&= ${n} \\times ${br(2 * a + (n - 1) * d)} \\div 2`, `&= ${apSum(params)}`) },
    ];
  },
};

interface ApSumAskParams extends ApSumParams {
  /** Harder: the series is given up to its last term, so n is found first. */
  byLast: boolean;
}

/** The sum of an arithmetic series, typed. */
const apSumAsk: Generator<ApSumAskParams> = {
  id: 'seq-ap-sum',
  sample: (rng, difficulty) => ({ ...sampleApSum(rng, difficulty > 1), byLast: difficulty > 1 && rng.chance(0.6) }),
  choices: (params) => {
    const { a, d, n } = params;
    const l = a + (n - 1) * d;
    return numberOptions(apSum(params), [n * (a + l), apSum(params, n - 1), apSum(params, n + 1), (n * (2 * a + n * d)) / 2]);
  },
  render: (params): Slide => {
    const { a, d, n, byLast } = params;
    const first = [0, 1, 2].map((i) => `${a + i * d}`);
    const l = a + (n - 1) * d;
    return byLast
      ? typed(
          [
            { kind: 'prose', text: 'Find the sum of this arithmetic series.' },
            { kind: 'display', tex: `${sumTex(first)} + \\dots ${signed(l)}` },
          ],
          '\\text{sum} =',
          apSum(params),
        )
      : typed(
          [
            { kind: 'prose', text: `Find the sum of the first $${n}$ terms of this arithmetic series.` },
            { kind: 'display', tex: `${sumTex(first)} + \\dots` },
          ],
          `S_{${n}} =`,
          apSum(params),
        );
  },
  solution: (params) => {
    const { a, d, n, byLast } = params;
    const l = a + (n - 1) * d;
    return [
      ...(byLast
        ? [
            { text: `First find how many terms: $${a} + (n - 1) \\times ${br(d)} = ${l}$.` },
            { tex: `n - 1 = ${n - 1}, \\quad n = ${n}` },
          ]
        : []),
      { text: `$2a = 2 \\times ${br(a)} = ${2 * a}$ and $(n - 1)d = ${n - 1} \\times ${br(d)} = ${(n - 1) * d}$.` },
      { tex: chain(`S_{${n}} &= \\frac{${n}}{2}\\left(${2 * a} ${signed((n - 1) * d)}\\right)`, `&= \\frac{${n}}{2} \\times ${br(2 * a + (n - 1) * d)}`, `&= ${apSum(params)}`) },
    ];
  },
};

interface ApSumTableParams {
  a: number;
  d: number;
  hard: boolean;
  termBlanks: number[];
  sumBlanks: number[];
}

/**
 * Terms and running totals side by side. Easier draws give the first two
 * terms; harder ones give u_1 and S_2 only, so u_2 comes from S_2 - S_1.
 */
const apSumTable: Generator<ApSumTableParams> = {
  id: 'seq-ap-sum-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const d = hard ? rng.pick([-4, -3, -2, 2, 3, 4, 5, 6]) : rng.int(2, 7);
    const a = rng.int(hard ? -6 : 1, 12);
    if (hard) return { a, d, hard, termBlanks: [1, ...positions(rng, 2, 4, 2)], sumBlanks: positions(rng, 2, 4, 2) };
    return { a, d, hard, termBlanks: positions(rng, 2, 4, 2), sumBlanks: positions(rng, 1, 4, 2) };
  },
  render: ({ a, d, termBlanks, sumBlanks }): Slide => {
    const terms = [1, 2, 3, 4, 5].map((n) => ap(a, d, n));
    const sums = terms.map((_, i) => terms.slice(0, i + 1).reduce((s, t) => s + t, 0));
    const rows: (string | null)[][] = [];
    const answer: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const row: (string | null)[] = [`${i + 1}`];
      for (const [values, blanks] of [
        [terms, termBlanks],
        [sums, sumBlanks],
      ] as const) {
        if (blanks.includes(i)) {
          row.push(null);
          answer.push(values[i]);
        } else row.push(`${values[i]}`);
      }
      rows.push(row);
    }
    const slips = [...sums.map((s, i) => s + terms[Math.min(i + 1, 4)]), ...terms.map((t) => t + d), ...sums.map((_, i) => (i + 1) * terms[i])];
    return {
      kind: 'table',
      prompt: [
        { kind: 'prose', text: 'This sequence is arithmetic, and $S_n$ is the sum of its first $n$ terms. Fill in the table.' },
      ],
      columns: ['n', 'u_n', 'S_n'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, d, hard }) => {
    const terms = [1, 2, 3, 4, 5].map((n) => ap(a, d, n));
    const sums = terms.map((_, i) => terms.slice(0, i + 1).reduce((s, t) => s + t, 0));
    return [
      ...(hard ? [{ text: `$u_2 = S_2 - S_1 = ${sums[1]} - ${br(sums[0])} = ${terms[1]}$, so $d = ${d}$.` }] : [{ text: `$d = ${terms[1]} - ${br(terms[0])} = ${d}$.` }]),
      { text: 'Each term adds $d$; each running total adds the term beside it.' },
      { tex: chain(`u_n &: ${terms.join(', ')}`, `S_n &: ${sums.join(', ')}`) },
    ];
  },
};

/* ---------- Level 2, lesson 3: geometric series ---------- */

interface GpSumParams {
  a: number;
  r: number;
  n: number;
}

const gpSum = ({ a, r }: GpSumParams, n: number) => (a * (r ** n - 1)) / (r - 1);

function sampleGpSum(rng: Rng, hard: boolean, cap = 6000): GpSumParams {
  for (;;) {
    const r = hard ? rng.pick([-2, -3, 4, 5]) : rng.pick([2, 3]);
    const a = rng.int(1, hard ? 5 : 6);
    const n = rng.int(4, hard ? 6 : 7);
    if (Math.abs(a * r ** n) > cap) continue;
    return { a, r, n };
  }
}

/** S_n = a(r^n - 1)/(r - 1), filled in as a tree. */
const gpSumTree: Generator<GpSumParams> = {
  id: 'seq-gp-total-tree',
  sample: (rng, difficulty) => sampleGpSum(rng, difficulty > 1),
  render: (params): Slide => {
    const { a, r, n } = params;
    const top = a * (r ** n - 1);
    const answer = [r ** n, top, r - 1, gpSum(params, n)];
    const slips = [r ** (n - 1), a * r ** n - 1, a * (r ** n + 1), r + 1, gpSum(params, n - 1), a * r ** n, 1 - r];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `A geometric series has first term $a = ${a}$ and common ratio $r = ${r}$. Fill the tree for the sum of its first $${n}$ terms: $r^{${n}}$, the top $a(r^{${n}} - 1)$, the bottom $r - 1$, then $S_{${n}}$.`,
        },
      ],
      expression: `S_{${n}} = \\frac{${a === 1 ? '' : a}\\left(${br(r)}^{${n}} - 1\\right)}{${r} - 1}`,
      nodes: [
        { id: 'power', from: [] },
        { id: 'top', from: ['power'] },
        { id: 'bottom', from: [] },
        { id: 'sum', from: ['top', 'bottom'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { a, r, n } = params;
    return [
      { tex: `S_n = \\frac{a(r^n - 1)}{r - 1}` },
      { tex: chain(`S_{${n}} &= \\frac{${a}(${br(r ** n)} - 1)}{${r} - 1}`, `&= \\frac{${a * (r ** n - 1)}}{${r - 1}}`, `&= ${gpSum(params, n)}`) },
    ];
  },
};

/** A geometric sum worked out one operation at a time: the power first, then each bracket. */
const gpSeriesSteps: Generator<GpSumParams> = {
  id: 'seq-gp-series-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleGpSum(rng, difficulty > 1);
      if (difficulty > 1 || params.r !== 2 || rng.chance(0.4)) return params;
    }
  },
  render: (params): Slide => {
    const { a, r, n } = params;
    const power = r ** n;
    const top = power - 1;
    const bottom = r - 1;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `The sum of the first $${n}$ terms of a geometric series with $a = ${a}$ and $r = ${r}$ is $\\frac{a(r^n - 1)}{r - 1}$, written out below. Tap the operation to do next, then choose what it gives.`,
        },
      ],
      start: [`${a}`, '\\times', '(', `${br(r)}^{${n}}`, '-', '1', ')', '\\div', '(', `${r}`, '-', '1', ')'],
      reductions: [
        { span: [3, 4], value: `${power}`, bank: valueBank(power, r * n, r ** (n - 1), -power) },
        { span: [2, 7], operator: 4, value: `${top}`, bank: valueBank(top, power + 1, a * power - 1) },
        { span: [4, 9], operator: 6, value: `${bottom}`, bank: valueBank(bottom, r + 1, 1 - r) },
        { span: [0, 3], operator: 1, value: `${a * top}`, bank: valueBank(a * top, a + top, a * power) },
        { span: [0, 3], operator: 1, value: `${gpSum(params, n)}`, bank: valueBank(gpSum(params, n), a * top * bottom, a * top - bottom) },
      ],
    };
  },
  solution: (params) => {
    const { a, r, n } = params;
    return [
      { text: `The power first: $${br(r)}^{${n}} = ${r ** n}$. Then each bracket, then multiply and divide.` },
      { tex: chain(`S_{${n}} &= ${a} \\times ${br(r ** n - 1)} \\div ${br(r - 1)}`, `&= ${gpSum(params, n)}`) },
    ];
  },
};

interface GpSumAskParams extends GpSumParams {
  byLast: boolean;
}

/** The sum of a geometric series, typed. */
const gpSumAsk: Generator<GpSumAskParams> = {
  id: 'seq-gp-sum',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r = hard ? rng.pick([-2, -3, 2, 3]) : rng.pick([2, 3]);
      const a = rng.int(1, hard ? 5 : 6);
      const n = rng.int(hard ? 5 : 4, hard ? 8 : 7);
      if (Math.abs(a * r ** n) > 20000) continue;
      return { a, r, n, byLast: hard && r > 0 };
    }
  },
  choices: (params) => {
    const S = gpSum(params, params.n);
    return numberOptions(S, [params.a * (params.r ** params.n - 1), gpSum(params, params.n - 1), gpSum(params, params.n + 1), params.a * params.r ** params.n]);
  },
  render: (params): Slide => {
    const { a, r, n, byLast } = params;
    const first = [0, 1, 2].map((i) => `${a * r ** i}`);
    return byLast
      ? typed(
          [
            { kind: 'prose', text: 'Find the sum of this geometric series.' },
            { kind: 'display', tex: `${sumTex(first)} + \\dots ${signed(a * r ** (n - 1))}` },
          ],
          '\\text{sum} =',
          gpSum(params, n),
        )
      : typed(
          [
            { kind: 'prose', text: `Find the sum of the first $${n}$ terms of this geometric series.` },
            { kind: 'display', tex: `${sumTex(first)} + \\dots` },
          ],
          `S_{${n}} =`,
          gpSum(params, n),
        );
  },
  solution: (params) => {
    const { a, r, n, byLast } = params;
    return [
      ...(byLast ? [{ text: `The last term is $${a} \\times ${r}^{n-1} = ${a * r ** (n - 1)}$, so $${r}^{n-1} = ${r ** (n - 1)}$ and $n = ${n}$.` }] : []),
      { text: `$a = ${a}$ and $r = ${r}$.` },
      { tex: chain(`S_{${n}} &= \\frac{${a}(${br(r)}^{${n}} - 1)}{${r} - 1}`, `&= \\frac{${a * (r ** n - 1)}}{${r - 1}} = ${gpSum(params, n)}`) },
    ];
  },
};

interface GpFormulaParams {
  a: number;
  r: number;
  k: number;
}

/** A geometric series put into the sum formula as tiles, then one sum from it. */
const gpFormulaTiles: Generator<GpFormulaParams> = {
  id: 'seq-gp-formula-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r = hard ? rng.pick([-2, -3, 4]) : rng.pick([2, 3, 4, 5]);
      const a = rng.int(1, hard ? 5 : 7);
      const k = rng.int(3, hard ? 6 : 5);
      if (Math.abs(a * r ** k) > 8000) continue;
      return { a, r, k };
    }
  },
  render: ({ a, r, k }): Slide => {
    const S = (a * (r ** k - 1)) / (r - 1);
    const answer = [`${a}`, ratioPowTex(r, 1, 'n'), `${r - 1}`, `${S}`];
    const slips = [
      ratioPowTex(r, 1, 'n-1'),
      ...(a > 1 ? [`${a}^{n}`] : []),
      `${r + 1}`,
      `${1 - r}`,
      `${a * r}`,
      `${(a * (r ** (k - 1) - 1)) / (r - 1)}`,
      `${a * (r ** k - 1)}`,
    ];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Put this geometric series into $S_n = \\frac{a(r^n - 1)}{r - 1}$, then find the sum of its first $${k}$ terms.` },
        { kind: 'display', tex: `${sumTex([0, 1, 2].map((i) => `${a * r ** i}`))} + \\dots` },
      ],
      template: `S_n = {0}({1} - 1) \\div ({2}) \\qquad S_${k} = {3}`,
      bank: tileBank(answer, slips, 5),
      answer,
    };
  },
  solution: ({ a, r, k }) => [
    { text: `$a = ${a}$ and each term is the one before times $r = ${r}$, so $r - 1 = ${r - 1}$.` },
    { tex: `S_n = ${a}(${ratioPowTex(r, 1, 'n')} - 1) \\div (${r - 1})` },
    { tex: chain(`S_${k} &= ${a}(${br(r ** k)} - 1) \\div (${r - 1})`, `&= ${(a * (r ** k - 1)) / (r - 1)}`) },
  ],
};

/* ---------- Level 2, lesson 4: the sum to infinity ---------- */

interface RatioSeries {
  /** First term. */
  a: number;
  p: number;
  q: number;
}

/** The first three terms written out, fractions and signs as the learner reads them. */
function ratioSeriesTex({ a, p, q }: RatioSeries): string {
  return `${sumTex([0, 1, 2].map((i) => fracTex(a * p ** i, q ** i)))} + \\dots`;
}

const CONVERGING: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [2, 5],
];
const DIVERGING: [number, number][] = [
  [2, 1],
  [3, 1],
  [3, 2],
  [4, 3],
  [5, 2],
];
const NEGATIVE: [number, number][] = [
  [-1, 2],
  [-1, 3],
  [-2, 3],
  [-3, 4],
];
const NEGATIVE_OUT: [number, number][] = [
  [-2, 1],
  [-3, 2],
  [-3, 1],
];

/** A first term that keeps the first three terms whole. */
function wholeStart(rng: Rng, q: number): number {
  return q * q * rng.int(1, q > 3 ? 2 : 4) * (rng.chance(0.2) ? -1 : 1);
}

/** Does it converge? Find r, then ask whether |r| < 1. The slip is the ratio upside down. */
const convergeFlow: Generator<RatioSeries> = {
  id: 'seq-converge-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [p, q] = rng.pick(hard ? [...NEGATIVE, ...NEGATIVE_OUT, [3, 4], [3, 2]] : [...CONVERGING, ...DIVERGING]);
    return { a: wholeStart(rng, q), p, q };
  },
  render: (params): Slide => {
    const { a, p, q } = params;
    const right = `$r = ${fracTex(p, q)}$`;
    const wrong = `$r = ${fracTex(q, p)}$`;
    const sizeStep = (id: string, rp: number, rq: number) => ({
      id,
      ask: `Is $\\left|${fracTex(rp, rq)}\\right| < 1$?`,
      branches: [
        { label: 'Yes', outcome: `The terms shrink towards $0$, so the series converges: $S_\\infty = \\frac{a}{1 - r} = ${fracTex(a * rq, rq - rp)}$.` },
        { label: 'No', outcome: 'The terms do not shrink, so the sums grow without settling: there is no sum to infinity.' },
      ],
    });
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Does this geometric series have a sum to infinity?' }],
      subject: ratioSeriesTex(params),
      steps: [
        {
          id: 'ratio',
          ask: 'What is the common ratio $r$?',
          branches: turned(
            [
              { label: right, to: 'right' },
              { label: wrong, to: 'wrong' },
            ],
            mix(a, p, q),
          ),
        },
        sizeStep('right', p, q),
        sizeStep('wrong', q, p),
      ],
      answer: [right, Math.abs(p) < Math.abs(q) ? 'Yes' : 'No'],
    };
  },
  solution: ({ a, p, q }) => [
    { text: `Divide a term by the one before it: $r = ${fracTex(a * p, q)} \\div ${br(a)} = ${fracTex(p, q)}$.` },
    Math.abs(p) < Math.abs(q)
      ? { text: `$|r| < 1$, so it converges, to $\\frac{${a}}{1 - ${p < 0 ? `\\left(${fracTex(p, q)}\\right)` : fracTex(p, q)}} = ${fracTex(a * q, q - p)}$.` }
      : { text: '$|r| \\geq 1$, so the terms never shrink and there is no sum to infinity.' },
  ],
};

interface WhichConvergesParams {
  /** Ask for the one that converges, or the one that does not. */
  want: 'converges' | 'diverges';
  series: RatioSeries[];
}

/** Four geometric series: which one has a sum to infinity (or which has none)? */
const whichConverges: Generator<WhichConvergesParams> = {
  id: 'seq-which-converges',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const want = hard && rng.chance(0.5) ? 'diverges' : 'converges';
    const inside = hard ? [...CONVERGING, ...NEGATIVE] : CONVERGING;
    const outside = hard ? [...DIVERGING, ...NEGATIVE_OUT, [-1, 1] as [number, number]] : DIVERGING;
    const [rightPool, wrongPool] = want === 'converges' ? [inside, outside] : [outside, inside];
    const ratios = [rng.pick(rightPool), ...rng.sample(wrongPool, 3)];
    return { want, series: ratios.map(([p, q]) => ({ a: wholeStart(rng, q), p, q })) };
  },
  render: ({ want, series }): Slide => {
    const labels = series.map(ratioSeriesTex);
    const { options, correctId } = nativeChoice(labels, mix(...labels));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: want === 'converges' ? 'Which of these geometric series has a sum to infinity?' : 'Which of these geometric series has **no** sum to infinity?',
        },
      ],
      options,
      correctId,
    };
  },
  solution: ({ want, series }) => [
    { text: 'A geometric series has a sum to infinity only when $|r| < 1$. Find each ratio.' },
    { tex: chain(...series.map(({ a, p, q }) => `${sumTex([fracTex(a, 1), fracTex(a * p, q)])} + \\dots &: r = ${fracTex(p, q)}`)) },
    { text: `So the one ${want === 'converges' ? 'with' : 'without'} a sum to infinity is $${ratioSeriesTex(series[0])}$.` },
  ],
};

interface InfinityParams {
  S: number;
  p: number;
  q: number;
  /** What is asked: the sum, or the ratio from the sum. */
  ask: 'S' | 'r';
}

/** First term of a series with sum S and ratio p/q: S(1 - r), whole by construction. */
const infinityStart = ({ S, p, q }: InfinityParams) => (S * (q - p)) / q;

/** The sum to infinity, or the ratio from it. Built backwards from a whole S. */
const sumInfinity: Generator<InfinityParams> = {
  id: 'seq-sum-infinity',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [p, q] = rng.pick(hard ? [...CONVERGING, ...NEGATIVE] : CONVERGING);
    const S = q * rng.int(2, q > 3 ? 12 : 20);
    const ask = hard && rng.chance(0.5) ? 'r' : 'S';
    return { S, p, q, ask };
  },
  render: (params): Slide => {
    const { S, p, q, ask } = params;
    const a = infinityStart(params);
    if (ask === 'r') {
      return typed(
        [
          {
            kind: 'prose',
            text: `A geometric series has first term $${a}$ and sum to infinity $${S}$. Find its common ratio $r$.`,
          },
        ],
        'r =',
        fracAnswer(p, q),
        FRACTION_KEYS,
      );
    }
    return typed(
      [
        { kind: 'prose', text: 'Find the sum to infinity of this geometric series.' },
        { kind: 'display', tex: ratioSeriesTex({ a, p, q }) },
      ],
      'S_\\infty =',
      S,
    );
  },
  solution: (params) => {
    const { S, p, q, ask } = params;
    const a = infinityStart(params);
    if (ask === 'r') {
      return [
        { tex: chain(`\\frac{a}{1 - r} &= S`, `\\frac{${a}}{1 - r} &= ${S}`, `1 - r &= ${fracTex(a, S)}`, `r &= ${fracTex(p, q)}`) },
      ];
    }
    return [
      { text: `$a = ${a}$ and $r = ${fracTex(p, q)}$; $|r| < 1$, so the sum to infinity exists.` },
      { tex: `S_\\infty = \\frac{a}{1 - r} = \\frac{${a}}{${fracTex(q - p, q)}} = ${S}` },
    ];
  },
};

interface PartialParams {
  S: number;
  p: number;
  q: number;
}

/** Partial sums as dots closing in on the sum to infinity: slide to the height they approach. */
const partialSlider: Generator<PartialParams> = {
  id: 'seq-partial-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [p, q] = rng.pick(hard ? NEGATIVE : [[1, 2], [2, 3], [3, 4], [1, 3]]);
    return { S: q * rng.int(hard ? 3 : 2, hard ? 12 : 15), p, q };
  },
  render: ({ S, p, q }): Slide => {
    const a = (S * (q - p)) / q;
    const partial = (n: number) => S * (1 - (p / q) ** n);
    const highest = Math.max(S, ...[1, 2, 3].map(partial));
    const max = Math.ceil((highest * 1.25) / 5) * 5;
    const window = markerWindow(0, max, 'y');
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The dots are the partial sums $S_1, S_2, S_3, \\dots$ of $${ratioSeriesTex({ a, p, q })}$. Slide to its sum to infinity: the height the dots close in on.`,
        },
      ],
      min: 0,
      max,
      step: 1,
      answer: S,
      readout: 'S_\\infty = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 9,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [],
          marks: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ x: n, y: partial(n) })),
          label: `Partial sums settling towards a height, first at ${a}`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: ({ S, p, q }) => [
    { text: `$a = ${(S * (q - p)) / q}$ and $r = ${fracTex(p, q)}$.` },
    { tex: `S_\\infty = \\frac{a}{1 - r} = \\frac{${(S * (q - p)) / q}}{${fracTex(q - p, q)}} = ${S}` },
    ...(p < 0 ? [{ text: 'With a negative ratio the partial sums land above and below the limit in turn, closing in from both sides.' }] : []),
  ],
};

/* ---------- Level 2, lesson 5: series in context ---------- */

interface Story {
  /** The question in words, with {a}, {d}, {n} and {l} filled in. */
  text: (a: number, d: number, n: number) => string;
  /** Harder draws only, such as a stack whose rows get shorter. */
  down?: boolean;
}

const AP_STORIES: Story[] = [
  { text: (a, d, n) => `Mia saves £$${a}$ in the first month, then £$${d}$ more each month than the month before. How much has she saved after $${n}$ months?` },
  { text: (a, d, n) => `A theatre has $${a}$ seats in the front row and $${d}$ more in each row behind it. How many seats are in the first $${n}$ rows?` },
  { text: (a, d, n) => `A salary starts at £$${a}$ thousand a year and rises by £$${d}$ thousand every year. How much, in thousands, is earned over the first $${n}$ years?` },
  { text: (a, d, n) => `A runner runs $${a}$ km in the first week of training, then $${d}$ km more each week. How far do they run in the first $${n}$ weeks?` },
  { text: (a, d, n) => `Logs are stacked in $${n}$ rows, with $${a}$ in the bottom row and $${-d}$ fewer in each row above. How many logs are there?`, down: true },
  { text: (a, d, n) => `A shop sells $${a}$ tickets on the first day of a sale and $${-d}$ fewer each day after. How many tickets does it sell in the first $${n}$ days?`, down: true },
];

interface ContextTreeParams {
  story: number;
  a: number;
  d: number;
  n: number;
}

/** An arithmetic series in words: the last term, first plus last, then the total. */
const contextTree: Generator<ContextTreeParams> = {
  id: 'seq-context-ap-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const pool = AP_STORIES.map((story, i) => ({ story, i })).filter(({ story }) => hard || !story.down);
    for (;;) {
      const { story, i } = rng.pick(pool);
      const n = rng.int(hard ? 8 : 5, hard ? 20 : 12);
      if (story.down) {
        const d = -rng.int(1, 3);
        const a = rng.int(-d * n + 1, -d * n + 15);
        return { story: i, a, d, n };
      }
      return { story: i, a: rng.int(3, 40), d: rng.int(2, 12), n };
    }
  },
  render: ({ story, a, d, n }): Slide => {
    const l = a + (n - 1) * d;
    const answer = [l, a + l, (n * (a + l)) / 2];
    const slips = [a + n * d, l + d, n * (a + l), a + l + d, (n * (a + l)) / 2 - l, l - d];
    return {
      kind: 'tree',
      prompt: [
        { kind: 'prose', text: `${AP_STORIES[story].text(a, d, n)} Fill the tree: the last term $l$, then $a + l$, then the total.` },
      ],
      expression: `S_{${n}} = \\frac{${n}}{2}(a + l)`,
      nodes: [
        { id: 'last', from: [] },
        { id: 'pair', from: ['last'] },
        { id: 'total', from: ['pair'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, d, n }) => {
    const l = a + (n - 1) * d;
    return [
      { text: `Each step ${d > 0 ? 'adds' : 'takes away'} the same amount, so this is an arithmetic series with $a = ${a}$, $d = ${d}$, $n = ${n}$.` },
      { tex: `l = ${a} + ${n - 1} \\times ${br(d)} = ${l}` },
      { tex: `S_{${n}} = \\frac{${n}}{2}(${a} + ${br(l)}) = ${(n * (a + l)) / 2}` },
    ];
  },
};

type GpStory = 'bounce' | 'spread' | 'bounceTotal' | 'grains';

interface ContextParams {
  story: GpStory;
  /** Starting amount: the drop height, or the first count. */
  h: number;
  p: number;
  q: number;
  n: number;
}

/** A geometric series in words, typed: a bounce height, a total spread, a total distance. */
const contextGp: Generator<ContextParams> = {
  id: 'seq-context',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const story: GpStory = rng.pick(hard ? ['bounceTotal', 'grains', 'bounce'] : ['bounce', 'spread']);
    if (story === 'bounce') {
      const [p, q] = rng.pick([[1, 2], [2, 3], [3, 4], [3, 5]] as [number, number][]);
      const n = rng.int(2, q === 2 ? 4 : 3);
      return { story, h: q ** n * rng.int(1, q === 2 ? 5 : 2), p, q, n };
    }
    if (story === 'bounceTotal') {
      const [p, q] = rng.pick([[1, 2], [2, 3], [3, 4], [1, 3], [2, 5]] as [number, number][]);
      return { story, h: (q - p) * q * rng.int(1, 4), p, q, n: 0 };
    }
    if (story === 'spread') return { story, h: rng.pick([2, 3]), p: 0, q: 0, n: rng.int(4, 7) };
    return { story, h: rng.int(1, 5), p: rng.pick([2, 3]), q: 1, n: rng.int(5, 8) };
  },
  render: (params): Slide => {
    const { story, h, p, q, n } = params;
    const words = {
      bounce: `A ball is dropped from a height of $${h}$ m. After each bounce it rises to $${fracTex(p, q)}$ of the height it fell from. How high, in metres, does it rise after bounce $${n}$?`,
      bounceTotal: `A ball is dropped from a height of $${h}$ m. After each bounce it rises to $${fracTex(p, q)}$ of the height it fell from, then falls again. How far, in metres, does it travel before it comes to rest?`,
      spread: `On day 1, one person tells $${h}$ people a secret. Each day after, everyone who heard it the day before tells $${h}$ new people. How many people have heard it by the end of day $${n}$?`,
      grains: `One square of a board gets $${h}$ grain${h === 1 ? '' : 's'} of rice, and each square after it gets $${p}$ times as many as the one before. How many grains are on the first $${n}$ squares?`,
    };
    return typed([{ kind: 'prose', text: words[story] }], story === 'bounce' ? '\\text{height} =' : '\\text{total} =', contextValue(params));
  },
  solution: (params) => {
    const { story, h, p, q, n } = params;
    if (story === 'bounce') {
      return [
        { text: `Each bounce multiplies the height by $${fracTex(p, q)}$, so after bounce $${n}$ the height is $${h} \\times \\left(${fracTex(p, q)}\\right)^{${n}}$.` },
        { tex: `${h} \\times ${fracTex(p ** n, q ** n)} = ${contextValue(params)}` },
      ];
    }
    if (story === 'bounceTotal') {
      const up = (h * p) / (q - p);
      return [
        { text: `It falls $${h}$ m first. Every rise after that is also fallen again, so the rises count twice.` },
        { tex: chain(`\\text{rises} &= ${fracTex(h * p, q)} + \\dots`, `&= \\frac{${fracTex(h * p, q)}}{1 - ${fracTex(p, q)}} = ${up}`) },
        { tex: `${h} + 2 \\times ${up} = ${contextValue(params)}` },
      ];
    }
    const a = h;
    const r = story === 'spread' ? h : p;
    return [
      { text: `Each ${story === 'spread' ? 'day' : 'square'} is $${r}$ times the one before, starting from $${a}$: a geometric series with $n = ${n}$.` },
      { tex: `S_{${n}} = \\frac{${a}(${r}^{${n}} - 1)}{${r} - 1} = ${contextValue(params)}` },
    ];
  },
};

function contextValue({ story, h, p, q, n }: ContextParams): number {
  if (story === 'bounce') return (h * p ** n) / q ** n;
  if (story === 'bounceTotal') return h + (2 * h * p) / (q - p);
  if (story === 'spread') return (h * (h ** n - 1)) / (h - 1);
  return (h * (p ** n - 1)) / (p - 1);
}

type Want = 'term' | 'total' | 'forever';

interface FlowStory {
  kind: 'ap' | 'gp';
  want: Want;
  text: (x: number, y: number, n: number) => string;
  /** The first few values, for the subject line. */
  values: (x: number, y: number) => string[];
  hard?: boolean;
  /** The values y may take, where the default would give a fraction of a pound. */
  ys?: number[];
}

const FLOW_STORIES: FlowStory[] = [
  { kind: 'ap', want: 'term', text: (x, y, n) => `A gym charges £$${x}$ in the first month and £$${y}$ more each month after. What is the charge in month $${n}$?`, values: (x, y) => [x, x + y, x + 2 * y].map(String) },
  { kind: 'ap', want: 'total', text: (x, y, n) => `A gym charges £$${x}$ in the first month and £$${y}$ more each month after. How much is paid over the first $${n}$ months?`, values: (x, y) => [x, x + y, x + 2 * y].map(String) },
  { kind: 'ap', want: 'total', text: (x, y, n) => `A stack of cans has $${x}$ in its top row and $${y}$ more in each row below. How many cans are in $${n}$ rows?`, values: (x, y) => [x, x + y, x + 2 * y].map(String) },
  { kind: 'ap', want: 'term', text: (x, y, n) => `A plant is $${x}$ cm tall and grows $${y}$ cm each week. How tall is it in week $${n}$?`, values: (x, y) => [x, x + y, x + 2 * y].map(String) },
  { kind: 'gp', want: 'term', text: (x, y, n) => `A colony of $${x}$ bacteria multiplies by $${y}$ every hour. How many are there after $${n}$ hours?`, values: (x, y) => [x, x * y, x * y * y].map(String) },
  { kind: 'gp', want: 'total', text: (x, y, n) => `Sam reads $${x}$ pages in the first week and $${y}$ times as many each week after. How many pages in the first $${n}$ weeks?`, values: (x, y) => [x, x * y, x * y * y].map(String) },
  { kind: 'gp', want: 'total', text: (x, y, n) => `A chain message is sent to $${x}$ people, and each day $${y}$ times as many new people get it. How many get it in the first $${n}$ days?`, values: (x, y) => [x, x * y, x * y * y].map(String) },
  { kind: 'gp', want: 'term', text: (x, y, n) => `A car worth £$${x * 1000}$ loses $\\frac{1}{${y}}$ of its value each year. What is it worth after $${n}$ years?`, values: (x, y) => [x * 1000, (x * 1000 * (y - 1)) / y].map(String), hard: true, ys: [2, 4, 5] },
  { kind: 'gp', want: 'forever', text: (x, y) => `A ball dropped from $${x}$ m rises to $\\frac{1}{${y}}$ of its height after each bounce. How far does it travel before it stops?`, values: (x, y) => [`${x}`, fracTex(x, y), fracTex(x, y * y)], hard: true },
  { kind: 'gp', want: 'forever', text: (x, y) => `Each day a snail crawls $\\frac{1}{${y}}$ as far as the day before, starting with $${x}$ m. How far can it ever crawl in total?`, values: (x, y) => [`${x}`, fracTex(x, y), fracTex(x, y * y)], hard: true },
];

interface ContextFlowParams {
  story: number;
  x: number;
  y: number;
  n: number;
}

const WANT_LABEL: Record<Want, string> = { term: 'One value', total: 'A total', forever: 'A total that goes on for ever' };

/** Arithmetic or geometric, and a term or a total? Picks the formula a story in words calls for. */
const contextFlow: Generator<ContextFlowParams> = {
  id: 'seq-context-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const pool = FLOW_STORIES.map((story, i) => ({ story, i })).filter(({ story }) => (hard ? true : !story.hard));
    const { story, i } = rng.pick(pool);
    const n = rng.int(5, 20);
    if (story.want === 'forever') return { story: i, x: rng.pick([2, 3, 4, 6, 8, 9, 12]), y: rng.pick([2, 3, 4]), n };
    if (story.kind === 'gp') return { story: i, x: rng.int(2, story.hard ? 20 : 9), y: rng.pick(story.ys ?? [2, 3, 4, 5]), n };
    return { story: i, x: rng.int(5, 40), y: rng.int(2, 9), n };
  },
  render: ({ story, x, y, n }): Slide => {
    const s = FLOW_STORIES[story];
    const outcomes = {
      apTerm: 'Use $u_n = a + (n - 1)d$.',
      apTotal: 'Use $S_n = \\frac{n}{2}\\left(2a + (n - 1)d\\right)$.',
      gpTerm: 'Use $u_n = ar^{n-1}$.',
      gpTotal: 'Use $S_n = \\frac{a(r^n - 1)}{r - 1}$.',
      gpForever: 'Use $S_\\infty = \\frac{a}{1 - r}$, since $|r| < 1$.',
    };
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `${s.text(x, y, n)} Decide which formula to use.` }],
      subject: `${s.values(x, y).join(', \\; ')}, \\; \\dots`,
      steps: [
        {
          id: 'change',
          ask: 'From one value to the next, is the same amount added, or is it multiplied by the same number?',
          branches: turned(
            [
              { label: 'Added', to: 'ap' },
              { label: 'Multiplied', to: 'gp' },
            ],
            mix(x, y, n),
          ),
        },
        {
          id: 'ap',
          ask: 'What does the question want?',
          branches: [
            { label: WANT_LABEL.term, outcome: outcomes.apTerm },
            { label: WANT_LABEL.total, outcome: outcomes.apTotal },
          ],
        },
        {
          id: 'gp',
          ask: 'What does the question want?',
          branches: [
            { label: WANT_LABEL.term, outcome: outcomes.gpTerm },
            { label: WANT_LABEL.total, outcome: outcomes.gpTotal },
            { label: WANT_LABEL.forever, outcome: outcomes.gpForever },
          ],
        },
      ],
      answer: [s.kind === 'ap' ? 'Added' : 'Multiplied', WANT_LABEL[s.want]],
    };
  },
  solution: ({ story, x, y, n }) => {
    const s = FLOW_STORIES[story];
    const change = s.kind === 'ap' ? `The same amount, $${y}$, is added each time: arithmetic.` : `Each value is the one before times the same number: geometric.`;
    const want =
      s.want === 'term'
        ? `The question asks for one value, the $${n}$th, not a total.`
        : s.want === 'total'
          ? `The question asks for everything added up over $${n}$ steps: a sum.`
          : 'The question asks for a total with no end, and the ratio is less than 1: a sum to infinity.';
    return [{ text: `${change} ${want}` }, { text: `Values: $${s.values(x, y).join(', ')}, \\dots$` }];
  },
};

interface ExceedParams {
  geo: boolean;
  a: number;
  /** The common difference, or the ratio for a geometric draw. */
  d: number;
  n: number;
  target: number;
  span: number;
}

const exceedTotal = ({ geo, a, d }: ExceedParams, k: number) => (geo ? (a * (d ** k - 1)) / (d - 1) : (k * (2 * a + (k - 1) * d)) / 2);

/** Slide to the first step at which a running total passes a target. */
const firstExceed: Generator<ExceedParams> = {
  id: 'seq-first-exceed',
  sample: (rng, difficulty) => {
    const geo = difficulty > 1;
    for (;;) {
      const a = geo ? rng.int(1, 6) : rng.int(5, 30);
      const d = geo ? rng.pick([2, 3]) : rng.int(2, 10);
      const n = rng.int(geo ? 4 : 5, geo ? 7 : 10);
      const params = { geo, a, d, n, target: 0, span: n + rng.int(2, 4) };
      const before = exceedTotal(params, n - 1);
      const after = exceedTotal(params, n);
      const tens = Array.from({ length: 200 }, (_, i) => (i + 1) * 10).filter((v) => v > before && v < after);
      const target = tens.length > 0 ? rng.pick(tens) : before + 1;
      if (target >= after) continue;
      return { ...params, target };
    }
  },
  render: (params): Slide => {
    const { geo, a, d, target, span } = params;
    const top = target * 1.6;
    const story = geo
      ? `A chain message reaches $${a}$ people on day 1, and each day $${d}$ times as many new people as the day before. The dots show how many have had it in total by each day; the dashed line is $${target}$. Slide to the first day the total is more than $${target}$.`
      : `Ella saves £$${a}$ in week 1, and each week she saves £$${d}$ more than the week before. The dots show her total savings after each week; the dashed line is £$${target}$. Slide to the first week her total is more than £$${target}$.`;
    return {
      kind: 'slider',
      prompt: [{ kind: 'prose', text: story }],
      min: 0,
      max: span,
      step: 1,
      answer: params.n,
      readout: geo ? '\\text{day } {v}' : '\\text{week } {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: span,
          yMin: 0,
          yMax: top,
          curves: [],
          marks: Array.from({ length: span }, (_, i) => ({ x: i + 1, y: exceedTotal(params, i + 1) })).filter((mark) => mark.y <= top),
          horizontals: [target],
          label: `Running totals rising past a dashed line at ${target}`,
        }),
        ...markerWindow(0, span),
      },
    };
  },
  solution: (params) => {
    const { geo, n, target } = params;
    return [
      { text: geo ? 'The total is a geometric series: add each day on until it passes the target.' : 'The total is an arithmetic series: add each week on until it passes the target.' },
      { tex: chain(`S_{${n - 1}} &= ${exceedTotal(params, n - 1)}`, `S_{${n}} &= ${exceedTotal(params, n)}`) },
      { text: `So it first passes $${target}$ at step $${n}$.` },
    ];
  },
};

/* ---------- Level 3: sequences and their limits ---------- */

/*
 * Level 3 asks where a sequence is going. Most of it is the recurrence
 * u_{n+1} = pu_n + q, whose terms close in on L = q / (1 - p) exactly when
 * |p| < 1, because each step multiplies the gap u_n - L by p.
 *
 * Every tabled term is whole. A question draws L first, as a multiple of p's
 * bottom so that q = L(1 - p) is whole too, then starts the terms at L plus a
 * power of that bottom: L + 16 for p = 1/2 gives five whole terms before the
 * gap runs out of halves.
 */

/** A ratio p = a/b, reduced, with b > 0; b is 1 for a whole p. */
type Ratio = [number, number];

/** Ratios whose recurrences settle, positive and then negative. */
const SETTLE: Ratio[] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5]];
const SETTLE_NEG: Ratio[] = [[-1, 2], [-1, 3], [-2, 3], [-1, 4], [-3, 4], [-2, 5]];

const NONZERO9 = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const NONZERO12 = [-12, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** p times a symbol, as written by hand: `\frac{1}{2}L`, `-u_n`, `2v_n`. */
function pTimes(a: number, b: number, symbol: string): string {
  if (a === b) return symbol;
  if (a === -b) return `-${symbol}`;
  return `${fracTex(a, b)}${symbol}`;
}

/** u_{n+1} = pu_n + q. */
function affineTex(a: number, b: number, q: number, letter = 'u'): string {
  return `${letter}_{n+1} = ${pTimes(a, b, `${letter}_n`)} ${signed(q)}`;
}

/** A rule over its starting terms: two lines, so that neither runs off a phone. */
function startTex(rule: string, first: string): string {
  return `\\begin{gathered} ${rule} \\\\ ${first} \\end{gathered}`;
}

/** p ready to be substituted: bracketed when negative. */
function pBr(a: number, b: number): string {
  return a < 0 ? `(${fracTex(a, b)})` : fracTex(a, b);
}

/** L + g p^k for k = 0, 1, …: the terms of a rule with limit L and first term L + g. */
function towards(L: number, g: number, a: number, b: number, count: number): number[] {
  return Array.from({ length: count }, (_, k) => L + (g * a ** k) / b ** k);
}

/** How many terms a table of p = a/b can hold before the gap stops dividing. */
function rowsFor(b: number): number {
  return b >= 4 ? 4 : 5;
}

/** A first gap that b divides into whole numbers for `rows - 1` steps. */
function wholeGap(rng: Rng, b: number, rows: number): number {
  return b ** (rows - 1) * (b === 2 ? rng.pick([1, 2]) : 1) * (rng.chance(0.3) ? -1 : 1);
}

/** A coefficient before a bracket in working: nothing for 1, `-` for -1. */
function lead(k: number): string {
  if (k === 1) return '';
  if (k === -1) return '-';
  return `${k}`;
}

/** The correct fraction and up to three wrong ones, distinct by value. */
function fractionOptions([p, q]: Ratio, slips: Ratio[]): ChoiceOption[] {
  const out: ChoiceOption[] = [{ tex: fracTex(p, q), answer: fracAnswer(p, q), correct: true }];
  const seen = new Set([fracTex(p, q)]);
  const near: Ratio[] = [[p + q, q], [p - q, q], [p + 2 * q, q]];
  for (const [x, y] of [...slips, ...near]) {
    if (out.length === 4) break;
    if (y === 0) continue;
    const tex = fracTex(x, y);
    if (seen.has(tex)) continue;
    seen.add(tex);
    out.push({ tex, answer: fracAnswer(x, y) });
  }
  return out;
}

/* ---------- Level 3, lesson 1: increasing, decreasing and periodic ---------- */

type Trend = 'increasing' | 'decreasing' | 'neither';

/** What the signs of u_{n+1} - u_n, for n = 1, 2, …, say about the sequence. */
function trendOf(differences: number[]): Trend {
  if (differences.every((d) => d > 0)) return 'increasing';
  if (differences.every((d) => d < 0)) return 'decreasing';
  return 'neither';
}

const TREND_WORDS: Record<Trend, string> = {
  increasing: 'positive for every $n \\geq 1$, so each term is bigger than the one before: the sequence is **increasing**.',
  decreasing: 'negative for every $n \\geq 1$, so each term is smaller than the one before: the sequence is **decreasing**.',
  neither: 'negative for some $n$ and positive for others, so the terms turn round: the sequence is **neither** increasing nor decreasing.',
};

const TREND_LABEL: Record<Trend, string> = {
  increasing: 'Always positive',
  decreasing: 'Always negative',
  neither: 'It changes sign',
};

interface DiffTilesParams {
  a: number;
  b: number;
  c: number;
}

/** u_{n+1} - u_n for an^2 + bn + c, which is 2an + (a + b), at n = 1 to 60. */
function quadDifferences({ a, b }: { a: number; b: number }): number[] {
  return Array.from({ length: 60 }, (_, i) => 2 * a * (i + 1) + a + b);
}

/** Expanding a(n + 1)^2 + b(n + 1) + c, the working both difference questions share. */
function quadShift({ a, b, c }: DiffTilesParams): SolutionStep[] {
  return [
    {
      text: `${c ? `The $${c}$ cancels when $u_n$ is taken away. ` : ''}Putting $n + 1$ in place of $n$, $(n + 1)^2 - n^2 = 2n + 1$ and $(n + 1) - n = 1$, so:`,
    },
    { tex: chain(`u_{n+1} - u_n &= ${lead(a)}(2n + 1) ${signed(b)}`, `&= ${linearTex(2 * a, a + b)}`) },
  ];
}

/**
 * u_{n+1} - u_n for a quadratic rule, placed as tiles. The slips are the ones
 * made expanding (n + 1)^2: dropping its 2n, or its 1.
 */
const diffTiles: Generator<DiffTilesParams> = {
  id: 'seq-diff-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const a = rng.pick(hard ? [-3, -2, 2, 3] : [-1, 1]);
      const b = rng.pick(NONZERO9);
      const c = rng.int(-9, 9);
      if (a + b === 0 || quadDifferences({ a, b }).includes(0)) continue;
      return { a, b, c };
    }
  },
  render: ({ a, b, c }): Slide => {
    const answer = [nTerm(2 * a, 1), token(a + b)];
    const slips = [nTerm(a, 1), nTerm(-2 * a, 1), token(b), token(-(a + b)), token(2 * a + b), token(a - b)].filter(
      (tile) => tile !== '+0',
    );
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Find $u_{n+1} - u_n$ for this sequence, simplified.' },
        { kind: 'display', tex: `u_n = ${quadTex(a, b, c)}` },
      ],
      template: 'u_{n+1} - u_n = {0} {1}',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: (params) => [
    ...quadShift(params),
    { text: `At $n = 1$ it is $${3 * params.a + params.b}$. It is ${TREND_WORDS[trendOf(quadDifferences(params))]}` },
  ],
};

type MonoForm = 'quad' | 'power' | 'recip';

interface MonoParams {
  form: MonoForm;
  a: number;
  b: number;
  c: number;
}

function monoRule({ form, a, b, c }: MonoParams): string {
  if (form === 'quad') return `u_n = ${quadTex(a, b, c)}`;
  if (form === 'power') return `u_n = ${times(a)}2^n ${signed(c)}`;
  return `u_n = ${c} ${a < 0 ? '-' : '+'} \\frac{${Math.abs(a)}}{n}`;
}

/** u_{n+1} - u_n written right, written with the usual slip, and its values for n = 1 to 60. */
function monoDifference({ form, a, b }: MonoParams): { right: string; slip: string; values: number[] } {
  const ns = Array.from({ length: 60 }, (_, i) => i + 1);
  if (form === 'quad') return { right: linearTex(2 * a, a + b), slip: linearTex(2 * a, b), values: quadDifferences({ a, b }) };
  if (form === 'power') return { right: `${times(a)}2^n`, slip: `${2 * a}`, values: ns.map((n) => a * 2 ** n) };
  const over = `\\frac{${Math.abs(a)}}{n(n + 1)}`;
  return {
    right: a > 0 ? `-${over}` : over,
    slip: a > 0 ? over : `-${over}`,
    values: ns.map((n) => -a / (n * (n + 1))),
  };
}

/**
 * Increasing, decreasing or neither, read from the sign of u_{n+1} - u_n.
 * The first fork asks for the difference, beside the slip of dropping the 1
 * from (n + 1)^2 (or treating 2^{n+1} - 2^n as 2, or losing the sign of a
 * fraction); the second asks what sign it has for every n.
 */
const monotoneFlow: Generator<MonoParams> = {
  id: 'seq-monotone-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const form: MonoForm = rng.pick(hard ? ['quad', 'quad', 'power', 'recip'] : ['quad', 'quad', 'power']);
      const c = rng.pick(NONZERO9);
      let a: number;
      let b = 0;
      if (form === 'quad') {
        a = rng.pick(hard ? [-3, -2, 2, 3] : [-1, 1]);
        b = rng.pick(NONZERO9);
      } else if (form === 'power') a = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
      else a = rng.pick(NONZERO12);
      const params = { form, a, b, c };
      if (monoDifference(params).values.includes(0)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { right, slip, values } = monoDifference(params);
    const rightLabel = `$u_{n+1} - u_n = ${right}$`;
    const slipLabel = `$u_{n+1} - u_n = ${slip}$`;
    const signStep = (id: string) => ({
      id,
      ask: 'What sign is it, for $n \\geq 1$?',
      branches: [
        { label: TREND_LABEL.increasing, outcome: 'Each term is bigger than the one before: the sequence is **increasing**.' },
        { label: TREND_LABEL.decreasing, outcome: 'Each term is smaller than the one before: the sequence is **decreasing**.' },
        { label: TREND_LABEL.neither, outcome: 'The terms go one way and then the other: the sequence is **neither**.' },
      ],
    });
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Is this sequence increasing, decreasing, or neither? Work out $u_{n+1} - u_n$ first.' }],
      subject: monoRule(params),
      steps: [
        {
          id: 'difference',
          ask: 'What is $u_{n+1} - u_n$?',
          branches: turned(
            [
              { label: rightLabel, to: 'right' },
              { label: slipLabel, to: 'slip' },
            ],
            mix(params.form, params.a, params.b, params.c),
          ),
        },
        signStep('right'),
        signStep('slip'),
      ],
      answer: [rightLabel, TREND_LABEL[trendOf(values)]],
    };
  },
  solution: (params) => {
    const { form, a } = params;
    const { right, values } = monoDifference(params);
    const verdict = { text: `It is ${TREND_WORDS[trendOf(values)]}` };
    if (form === 'quad') return [...quadShift(params), verdict];
    if (form === 'power') {
      return [
        { text: '$2^{n+1}$ is $2 \\times 2^n$, so taking $2^n$ away leaves one $2^n$. The constant cancels.' },
        { tex: chain(`u_{n+1} - u_n &= ${lead(a)}(2^{n+1} - 2^n)`, `&= ${right}`) },
        verdict,
      ];
    }
    return [
      {
        text: `Over a common denominator, $\\frac{1}{n + 1} - \\frac{1}{n} = -\\frac{1}{n(n + 1)}$. The constant cancels, and that fraction is multiplied by $${a}$:`,
      },
      { tex: `u_{n+1} - u_n = ${right}` },
      verdict,
    ];
  },
};

type PeriodForm = 'recip' | 'sign' | 'swap' | 'skip' | 'three';

interface PeriodParams {
  form: PeriodForm;
  x: number;
  y: number;
  k: number;
}

const PERIOD: Record<PeriodForm, number> = { recip: 2, sign: 2, swap: 6, skip: 4, three: 3 };

/**
 * The terms of a periodic rule. `recip` is u_{n+1} = k / u_n from u_1 = x,
 * `sign` is u_n = k + y(-1)^n, and the rest run from u_1 = x and u_2 = y using
 * the two terms before: u_{n+1} - u_n (period 6), -u_n (period 4) and
 * -u_{n+1} - u_n (period 3).
 */
function periodTerms({ form, x, y, k }: PeriodParams, count: number): number[] {
  if (form === 'sign') return Array.from({ length: count }, (_, i) => k + y * (-1) ** (i + 1));
  const terms = form === 'recip' ? [x] : [x, y];
  while (terms.length < count) {
    const u = terms[terms.length - 2];
    const v = terms[terms.length - 1];
    terms.push(form === 'recip' ? k / v : form === 'swap' ? v - u : form === 'skip' ? -u : -v - u);
  }
  return terms.slice(0, count);
}

function periodRule({ form, x, y, k }: PeriodParams): string {
  if (form === 'recip') return startTex(`u_{n+1} = ${k < 0 ? '-' : ''}\\frac{${Math.abs(k)}}{u_n}`, `u_1 = ${x}`);
  if (form === 'sign') return `u_n = ${k} ${y < 0 ? '-' : '+'} ${lead(Math.abs(y))}(-1)^n`;
  const rule = form === 'swap' ? 'u_{n+1} - u_n' : form === 'skip' ? '-u_n' : '-u_{n+1} - u_n';
  return startTex(`u_{n+2} = ${rule}`, `u_1 = ${x}, \\; u_2 = ${y}`);
}

/** The smallest shift that maps the list onto itself. */
function smallestPeriod(terms: number[]): number {
  for (let p = 1; p < terms.length; p += 1) {
    if (terms.every((t, i) => i + p >= terms.length || terms[i + p] === t)) return p;
  }
  return terms.length;
}

/** First-order rules repeating every two terms, or (harder) rules on the two terms before. */
function samplePeriod(rng: Rng, hard: boolean): PeriodParams {
  for (;;) {
    const form: PeriodForm = rng.pick(hard ? ['swap', 'skip', 'three'] : ['recip', 'sign']);
    let x = 0;
    let y = 0;
    let k = 0;
    if (form === 'recip') {
      x = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
      y = rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]);
      k = x * y;
    } else if (form === 'sign') {
      k = rng.int(-5, 12);
      y = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    } else {
      x = rng.int(-6, 9);
      y = rng.int(-6, 9);
    }
    const params = { form, x, y, k };
    const terms = periodTerms(params, 12);
    if (k === 0 && form === 'sign') continue;
    if (terms.includes(0) || smallestPeriod(terms) !== PERIOD[form]) continue;
    return params;
  }
}

/** How the terms of a periodic rule are worked, for a worked solution. */
function periodHow({ form, x, y, k }: PeriodParams): string {
  if (form === 'recip') return `Divide $${k}$ by each term to get the next: $${k} \\div ${br(x)} = ${y}$, then $${k} \\div ${br(y)} = ${x}$, which is where it started.`;
  if (form === 'sign') return `$(-1)^n$ is $-1$ when $n$ is odd and $1$ when $n$ is even, so the odd terms are all $${k - y}$ and the even terms all $${k + y}$.`;
  if (form === 'swap') return 'Each term is the one before it minus the one before that.';
  if (form === 'skip') return 'Each term is minus the term two places before it.';
  return 'Each term is minus the sum of the two before it.';
}

interface PeriodTableParams extends PeriodParams {
  blanks: number[];
}

/** A periodic sequence run down a table. Harder rules use the two terms before, so u_2 is given too. */
const periodTable: Generator<PeriodTableParams> = {
  id: 'seq-period-table',
  sample: (rng, difficulty) => {
    const params = samplePeriod(rng, difficulty > 1);
    const from = params.form === 'recip' || params.form === 'sign' ? 1 : 2;
    return { ...params, blanks: positions(rng, from, 5, 3) };
  },
  render: (params): Slide => {
    const terms = periodTerms(params, 6);
    const answer = params.blanks.map((i) => terms[i]);
    const slips = params.blanks.flatMap((i) => {
      const [u, v] = [terms[i - 2] ?? 0, terms[i - 1]];
      if (params.form === 'recip') return [params.k * v, -v, params.k - v];
      if (params.form === 'sign') return [params.k, params.y, -params.y, -terms[i]];
      return [-terms[i], u + v, u - v, v];
    });
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text:
            params.form === 'sign'
              ? 'This rule gives each term from its position $n$. Fill in the missing terms and look for a repeat.'
              : 'Fill in the missing terms, each from the terms before it, and look for a repeat.',
        },
        { kind: 'display', tex: periodRule(params) },
      ],
      columns: ['n', 'u_n'],
      rows: terms.map((_, i) => [`${i + 1}`, column(terms, params.blanks)[i]]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const period = PERIOD[params.form];
    return [
      { text: periodHow(params) },
      { tex: listLines([...periodTerms(params, 7), '\\dots']) },
      { text: `The terms repeat every $${period}$: $u_{n+${period}} = u_n$, so the sequence is periodic with period $${period}$.` },
    ];
  },
};

interface PeriodAskParams extends PeriodParams {
  ask: 'period' | 'term';
  /** The far-off position asked about. */
  far: number;
}

/** The period of a repeating rule, or a far-off term found from it. */
const periodChoice: Generator<PeriodAskParams> = {
  id: 'seq-period',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      ...samplePeriod(rng, hard),
      ask: hard && rng.chance(0.5) ? 'period' : 'term',
      far: rng.int(hard ? 30 : 15, hard ? 150 : 99),
    };
  },
  render: (params): Slide => {
    const period = PERIOD[params.form];
    const cycle = periodTerms(params, period);
    let labels: string[];
    let text: string;
    if (params.ask === 'period') {
      labels = [period, ...[2, 3, 4, 6].filter((p) => p !== period)].map(String);
      text = 'This sequence repeats. What is its period, the smallest $k$ with $u_{n+k} = u_n$?';
    } else {
      const at = (params.far - 1) % period;
      const near = [cycle[(at + 1) % period], cycle[(at + period - 1) % period], ...cycle];
      labels = numberOptions(cycle[at], near).map((option) => option.tex);
      text = `This sequence repeats. Find $u_{${params.far}}$.`;
    }
    const { options, correctId } = nativeChoice(labels, mix(...labels, params.far));
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text },
        { kind: 'display', tex: periodRule(params) },
      ],
      options,
      correctId,
    };
  },
  solution: (params) => {
    const period = PERIOD[params.form];
    const terms = periodTerms(params, period + 2);
    const steps: SolutionStep[] = [
      { text: periodHow(params) },
      { tex: listLines([...terms, '\\dots']) },
      { text: `$u_{${period + 1}} = u_1$, so the terms repeat every $${period}$: the period is $${period}$.` },
    ];
    if (params.ask === 'term') {
      const at = (params.far - 1) % period;
      steps.push({
        text: `$${params.far} = ${period} \\times ${Math.floor((params.far - 1) / period)} + ${at + 1}$, so $u_{${params.far}} = u_{${at + 1}} = ${terms[at]}$.`,
      });
    }
    return steps;
  },
};

/* ---------- Level 3, lesson 2: the limit of a recurrence ---------- */

interface LimitTableParams {
  a: number;
  b: number;
  L: number;
  /** u_1 - L. */
  g: number;
  blanks: number[];
}

/** The terms of a converging recurrence, filled in down a table. */
const limitTable: Generator<LimitTableParams> = {
  id: 'seq-limit-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const pool: Ratio[] = hard ? [[-1, 2], [-1, 3], [2, 3], [-2, 3], [3, 4], [1, 4]] : [[1, 2], [1, 3]];
    for (;;) {
      const [a, b] = rng.pick(pool);
      const rows = rowsFor(b);
      const L = b * rng.pick([-3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
      const g = wholeGap(rng, b, rows);
      if (towards(L, g, a, b, rows).some((t) => Math.abs(t) > 150)) continue;
      return { a, b, L, g, blanks: positions(rng, 1, rows - 1, hard ? 3 : 2) };
    }
  },
  render: ({ a, b, L, g, blanks }): Slide => {
    const q = (L * (b - a)) / b;
    const terms = towards(L, g, a, b, rowsFor(b));
    const answer = blanks.map((i) => terms[i]);
    const slips = blanks.flatMap((i) => {
      const before = terms[i - 1];
      return [(a * before) / b, (a * (before + q)) / b, before + q, before - q, L];
    });
    return {
      kind: 'table',
      prompt: [
        { kind: 'prose', text: 'Fill in the missing terms, each from the one before, and watch where they are heading.' },
        { kind: 'display', tex: startTex(affineTex(a, b, q), `u_1 = ${L + g}`) },
      ],
      columns: ['n', 'u_n'],
      rows: terms.map((_, i) => [`${i + 1}`, column(terms, blanks)[i]]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, b, L, g }) => {
    const q = (L * (b - a)) / b;
    const terms = towards(L, g, a, b, rowsFor(b));
    return [
      { text: `Multiply each term by $${fracTex(a, b)}$, then ${q > 0 ? 'add' : 'take away'} $${Math.abs(q)}$.` },
      { tex: chain(...terms.slice(1).map((t, i) => `u_{${i + 2}} &= ${fracTex(a, b)} \\times ${br(terms[i])} ${signed(q)} = ${t}`)) },
      {
        text: `Their gaps to $${L}$ go $${listTex(terms.map((t) => t - L), false)}$, ${a < 0 ? 'changing sign and ' : ''}shrinking every step: the terms are closing in on $${L}$.`,
      },
    ];
  },
};

interface FixedPointParams {
  a: number;
  b: number;
  m: number;
}

/** L = q ÷ (1 - p), worked one operation at a time. The fraction arithmetic is the skill. */
const fixedPointSteps: Generator<FixedPointParams> = {
  id: 'seq-fixed-point-steps',
  sample: (rng, difficulty) => {
    const pool: Ratio[] = difficulty > 1 ? [...SETTLE_NEG, [2, 3], [3, 4], [2, 5], [3, 5]] : SETTLE;
    const [a, b] = rng.pick(pool);
    return { a, b, m: rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) };
  },
  render: ({ a, b, m }): Slide => {
    const L = b * m;
    const q = m * (b - a);
    const oneMinus = fracTex(b - a, b);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `The terms of $${affineTex(a, b, q)}$ settle on a limit $L$. Once they have, $u_{n+1}$ and $u_n$ are both $L$:`,
        },
        { kind: 'display', tex: `L = ${pTimes(a, b, 'L')} ${signed(q)}` },
        {
          kind: 'prose',
          text: 'Gathering the $L$ terms on one side turns this into the line below. Tap the operation to do next, then choose what it gives.',
        },
      ],
      start: [`${q}`, '\\div', '(', '1', '-', pBr(a, b), ')'],
      reductions: [
        {
          span: [2, 7],
          operator: 4,
          value: oneMinus,
          bank: stepsBank([oneMinus, fracTex(b + a, b), fracTex(a - b, b), fracTex(b, b - a)]),
        },
        { span: [0, 3], operator: 1, value: `${L}`, bank: valueBank(L, (q * (b - a)) / b, (q * b) / (b + a), -L, q) },
      ],
    };
  },
  solution: ({ a, b, m }) => {
    const L = b * m;
    const q = m * (b - a);
    return [
      {
        tex: chain(
          `L &= ${pTimes(a, b, 'L')} ${signed(q)}`,
          `L ${a < 0 ? '+' : '-'} ${pTimes(Math.abs(a), b, 'L')} &= ${q}`,
          `${fracTex(b - a, b)}L &= ${q}`,
        ),
      },
      { text: `Dividing by a fraction is multiplying by it upside down: $L = ${q} \\times ${fracTex(b, b - a)} = ${L}$.` },
    ];
  },
};

type LimitForm = 'plain' | 'over' | 'minus';

interface LimitParams {
  form: LimitForm;
  a: number;
  b: number;
  L: number;
  /** u_1. */
  s: number;
}

/** The constant the rule is written with: q in pu_n + q, c in (u_n + c)/b, k in k - (a/b)u_n. */
function limitConstant({ form, b, a, L }: LimitParams): number {
  return form === 'over' ? L * (b - 1) : (L * (b - a)) / b;
}

function limitRuleTex(params: LimitParams): string {
  const { form, a, b } = params;
  const c = limitConstant(params);
  if (form === 'over') return `u_{n+1} = \\frac{u_n ${signed(c)}}{${b}}`;
  if (form === 'minus') return `u_{n+1} = ${c} - \\frac{${lead(-a)}u_n}{${b}}`;
  return affineTex(a, b, c);
}

/** The limit of a converging recurrence, typed. Harder rules hide p inside a fraction. */
const limitAsk: Generator<LimitParams> = {
  id: 'seq-limit',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form: LimitForm = hard ? rng.pick(['plain', 'over', 'minus']) : 'plain';
    let ratio: Ratio;
    if (form === 'over') ratio = [1, rng.pick([2, 3, 4, 5])];
    else if (form === 'minus') ratio = rng.pick<Ratio>([[-1, 2], [-1, 3], [-2, 3], [-1, 4], [-3, 4]]);
    else ratio = rng.pick(hard ? SETTLE_NEG : SETTLE);
    const [a, b] = ratio;
    const L = (form === 'over' ? 1 : b) * rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const s = L + rng.pick([-12, -9, -6, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
    return { form, a, b, L, s };
  },
  choices: (params) => {
    const { a, b, L, s } = params;
    const c = limitConstant(params);
    return numberOptions(L, [c, (c * b) / (b + a), s, -L]);
  },
  render: (params): Slide =>
    typed(
      [
        { kind: 'prose', text: 'This sequence converges. Find its limit $L$.' },
        { kind: 'display', tex: startTex(limitRuleTex(params), `u_1 = ${params.s}`) },
      ],
      'L =',
      params.L,
    ),
  solution: (params) => {
    const { form, a, b, L } = params;
    const c = limitConstant(params);
    const settle = { text: `At the limit $u_{n+1}$ and $u_n$ are both $L$. (The terms do settle: $|p| = ${fracTex(Math.abs(a), b)} < 1$.)` };
    if (form === 'over') {
      return [
        settle,
        { tex: chain(`L &= \\frac{L ${signed(c)}}{${b}}`, `${b}L &= L ${signed(c)}`, `${lead(b - 1)}L &= ${c}`, `L &= ${L}`) },
      ];
    }
    if (form === 'minus') {
      return [settle, { tex: chain(`L &= ${c} - \\frac{${lead(-a)}L}{${b}}`, `${fracTex(b - a, b)}L &= ${c}`, `L &= ${L}`) }];
    }
    return [settle, { tex: chain(`L &= ${pTimes(a, b, 'L')} ${signed(c)}`, `${fracTex(b - a, b)}L &= ${c}`, `L &= ${L}`) }];
  },
};

interface BackParams {
  a: number;
  b: number;
  m: number;
  s: number;
}

/**
 * The limit run backwards: from L and p, the missing q, then the next term.
 * L and u_1 are multiples of p's bottom, so every node is whole.
 */
const limitBackTree: Generator<BackParams> = {
  id: 'seq-limit-back-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const [a, b] = rng.pick(difficulty > 1 ? SETTLE_NEG : SETTLE);
      const m = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
      const s = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      if (s === m) continue;
      return { a, b, m, s };
    }
  },
  render: ({ a, b, m, s }): Slide => {
    const L = b * m;
    const q = m * (b - a);
    const answer = [a * m, q, a * s, a * s + q];
    const slips = [L + a * m, a * m - L, L, b * s + q, a * s - q, a * s + L];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `This sequence converges to $L = ${L}$, but $q$ is missing. Fill the tree: $${pTimes(a, b, 'L')}$, then $q$, then $${pTimes(a, b, 'u_1')}$, then $u_2$.`,
        },
      ],
      expression: startTex(`u_{n+1} = ${pTimes(a, b, 'u_n')} + q`, `u_1 = ${b * s}`),
      nodes: [
        { id: 'pL', from: [] },
        { id: 'q', from: ['pL'] },
        { id: 'pu', from: [] },
        { id: 'next', from: ['pu', 'q'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, b, m, s }) => {
    const L = b * m;
    const q = m * (b - a);
    return [
      { text: 'At the limit both terms are $L$, so $L = pL + q$, which gives $q = L - pL$.' },
      { tex: chain(`${pTimes(a, b, 'L')} &= ${fracTex(a, b)} \\times ${br(L)} = ${a * m}`, `q &= ${L} - ${br(a * m)} = ${q}`) },
      { tex: `u_2 = ${fracTex(a, b)} \\times ${br(b * s)} ${signed(q)} = ${a * s + q}` },
    ];
  },
};

/* ---------- Level 3, lesson 3: converge, oscillate or diverge ---------- */

type Fate = 'steady' | 'swing' | 'adds' | 'flips' | 'grows' | 'wild';

/** What u_{n+1} = pu_n + q does in the long run, from p = a/b alone. */
function fateOf(a: number, b: number): Fate {
  if (Math.abs(a) < b) return a > 0 ? 'steady' : 'swing';
  if (a === b) return 'adds';
  if (a === -b) return 'flips';
  return a > 0 ? 'grows' : 'wild';
}

const FATE_PATH: Record<Fate, string[]> = {
  steady: ['$|p| < 1$', 'Positive'],
  swing: ['$|p| < 1$', 'Negative'],
  adds: ['$|p| = 1$', '$p = 1$'],
  flips: ['$|p| = 1$', '$p = -1$'],
  grows: ['$|p| > 1$', 'Positive'],
  wild: ['$|p| > 1$', 'Negative'],
};

type FateForm = 'plain' | 'over' | 'times';

interface FateFlowParams {
  form: FateForm;
  a: number;
  b: number;
  c: number;
  s: number;
}

/**
 * The rule as written, with q times b (whole in every form). `over` is
 * (u_n + c)/b or (c - u_n)/b; `times` is |p|(u_n - c) or |p|(c - u_n).
 */
function fateRule({ form, a, b, c }: FateFlowParams): { tex: string; qb: number } {
  if (form === 'over') {
    return { tex: a > 0 ? `u_{n+1} = \\frac{u_n ${signed(c)}}{${b}}` : `u_{n+1} = \\frac{${c} - u_n}{${b}}`, qb: c };
  }
  if (form === 'times') return { tex: a > 0 ? `u_{n+1} = ${a}(u_n ${signed(-c)})` : `u_{n+1} = ${-a}(${c} - u_n)`, qb: -a * c };
  return { tex: affineTex(a, b, c), qb: c * b };
}

/** Converge, oscillate or diverge, decided from p before anything is solved. */
const fateFlow: Generator<FateFlowParams> = {
  id: 'seq-fate-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const form: FateForm = hard ? rng.pick(['plain', 'over', 'times']) : 'plain';
      let ratio: Ratio;
      if (form === 'over') ratio = [rng.pick([-1, 1]), rng.pick([2, 3, 4, 5])];
      else if (form === 'times') ratio = [rng.pick([-3, -2, 2, 3]), 1];
      else {
        ratio = rng.pick<Ratio>(
          hard
            ? [[-1, 2], [-2, 3], [3, 2], [-3, 2], [-1, 1], [1, 1], [-4, 3], [3, 4]]
            : [[1, 2], [1, 3], [2, 3], [-1, 2], [-1, 3], [1, 1], [-1, 1], [2, 1], [3, 1], [-2, 1]],
        );
      }
      const [a, b] = ratio;
      const params = { form, a, b, c: rng.pick(NONZERO12), s: rng.int(-5, 15) };
      // Starting on the fixed point would sit still, whatever p is.
      if (a !== b && params.s * (b - a) === fateRule(params).qb) continue;
      return params;
    }
  },
  render: (params): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Read this rule as $u_{n+1} = pu_n + q$, then use $p$ to decide what the terms do in the long run.' }],
    subject: startTex(fateRule(params).tex, `u_1 = ${params.s}`),
    steps: [
      {
        id: 'size',
        ask: 'How big is $|p|$?',
        branches: [
          { label: '$|p| < 1$', to: 'small' },
          { label: '$|p| = 1$', to: 'one' },
          { label: '$|p| > 1$', to: 'big' },
        ],
      },
      {
        id: 'small',
        ask: 'Is $p$ positive or negative?',
        branches: [
          { label: 'Positive', outcome: 'The gap to the limit shrinks every step: the terms **converge**, closing in from one side.' },
          { label: 'Negative', outcome: 'The gap shrinks and changes sign every step: the terms **converge**, landing either side of the limit in turn.' },
        ],
      },
      {
        id: 'one',
        ask: 'Which is it?',
        branches: [
          { label: '$p = 1$', outcome: 'Each step adds the same $q$, so the terms never settle: they **diverge**.' },
          { label: '$p = -1$', outcome: 'Each step flips the term to the other side: two values repeat for ever, **periodic** with period $2$.' },
        ],
      },
      {
        id: 'big',
        ask: 'Is $p$ positive or negative?',
        branches: [
          { label: 'Positive', outcome: 'The gap grows every step: the terms run away to one side and **diverge**.' },
          { label: 'Negative', outcome: 'The gap grows and changes sign: the terms swing either side, further each time, and **diverge**.' },
        ],
      },
    ],
    answer: FATE_PATH[fateOf(params.a, params.b)],
  }),
  solution: (params) => {
    const { form, a, b, c, s } = params;
    const { qb } = fateRule(params);
    const qTex = form === 'over' ? fracTex(c, b) : `${qb / b}`;
    const L = a === b ? '' : fracTex(qb, b - a);
    const steps: SolutionStep[] = [];
    if (form !== 'plain') {
      steps.push({ text: `Multiplied out, the rule is $u_{n+1} = ${pTimes(a, b, 'u_n')} ${qb < 0 ? '-' : '+'} ${qTex.replace(/^-/, '')}$.` });
    }
    const words: Record<Fate, string> = {
      steady: `$p = ${fracTex(a, b)}$, so $|p| < 1$ and the terms close in on $L = ${L}$ from one side.`,
      swing: `$p = ${fracTex(a, b)}$, so $|p| < 1$ and the terms close in on $L = ${L}$, landing either side of it in turn.`,
      adds: `$p = 1$: every step ${qb > 0 ? 'adds' : 'takes away'} $${qTex.replace(/^-/, '')}$, so the terms never settle.`,
      flips: `$p = -1$: from $${s}$ the terms flip to $${qb / b - s}$ and back again, for ever.`,
      grows: `$p = ${fracTex(a, b)}$, so $|p| > 1$ and the gap to $${L}$ grows every step. $L = ${L}$ solves $L = pL + q$, but the terms never reach it.`,
      wild: `$p = ${fracTex(a, b)}$, so $|p| > 1$: the terms swing either side of $${L}$, further each time. $L = ${L}$ solves $L = pL + q$, but the terms never reach it.`,
    };
    steps.push({ text: words[fateOf(a, b)] });
    return steps;
  },
};

interface FateSliderParams {
  a: number;
  b: number;
  m: number;
  g: number;
}

/** Terms as dots settling on a height; slide to it. Negative p lands them either side. */
const fateSlider: Generator<FateSliderParams> = {
  id: 'seq-fate-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const [a, b] = rng.pick(difficulty > 1 ? SETTLE_NEG : SETTLE);
      const m = rng.int(1, Math.floor(30 / b));
      const L = b * m;
      const g = rng.int(1 - L, 30);
      if (L < 4 || g === 0 || towards(L, g, a, b, 8).some((t) => t < 0.5)) continue;
      return { a, b, m, g };
    }
  },
  render: ({ a, b, m, g }): Slide => {
    const L = b * m;
    const terms = towards(L, g, a, b, 8);
    const max = Math.ceil((Math.max(L, ...terms) * 1.25) / 5) * 5;
    const window = markerWindow(0, max, 'y');
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The dots are the first eight terms of $${affineTex(a, b, m * (b - a))}$, from $u_1 = ${L + g}$. Slide to the height they close in on.`,
        },
      ],
      min: 0,
      max,
      step: 1,
      answer: L,
      readout: 'L = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 9,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [],
          marks: terms.map((y, i) => ({ x: i + 1, y })),
          label: `Terms of a sequence settling towards a height, the first at ${L + g}`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: ({ a, b, m, g }) => {
    const L = b * m;
    const q = m * (b - a);
    return [
      { text: 'At the limit $u_{n+1}$ and $u_n$ are both $L$.' },
      { tex: chain(`L &= ${pTimes(a, b, 'L')} ${signed(q)}`, `${fracTex(b - a, b)}L &= ${q}`, `L &= ${L}`) },
      {
        text:
          a < 0
            ? 'With $p$ negative the dots land above and below the limit in turn, closing in from both sides.'
            : `With $p$ positive the dots close in from ${g > 0 ? 'above' : 'below'}, never crossing it.`,
      },
    ];
  },
};

interface FateChoiceParams {
  a: number;
  b: number;
  /** The fixed point, q / (1 - p); unused when p = 1. */
  L: number;
  q: number;
  s: number;
}

/** What the terms do. The trap is the fixed point offered as a limit when |p| >= 1. */
const fateChoice: Generator<FateChoiceParams> = {
  id: 'seq-fate',
  sample: (rng, difficulty) => {
    const pool: Ratio[] =
      difficulty > 1
        ? [[-1, 2], [-1, 3], [-2, 3], [-3, 4], [-2, 1], [-3, 1], [-1, 1], [3, 2], [1, 1]]
        : [[1, 2], [1, 3], [2, 3], [3, 4], [2, 1], [3, 1], [-1, 1], [1, 1]];
    for (;;) {
      const [a, b] = rng.pick(pool);
      const s = rng.int(-5, 20);
      if (a === b) {
        const q = rng.pick(NONZERO9);
        if (s === q) continue;
        return { a, b, L: 0, q, s };
      }
      const L = b * rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const q = (L * (b - a)) / b;
      if (s === L || q === L) continue;
      return { a, b, L, q, s };
    }
  },
  render: ({ a, b, L, q, s }): Slide => {
    const to = (value: number) => `\\text{Converges to } ${value}`;
    const diverges = '\\text{Diverges}';
    const periodic = '\\text{Periodic, period } 2';
    const fate = fateOf(a, b);
    const labels =
      fate === 'steady' || fate === 'swing'
        ? [to(L), diverges, periodic, to(q)]
        : fate === 'flips'
          ? [periodic, to(L), diverges, to(q)]
          : fate === 'adds'
            ? [diverges, periodic, to(s), to(q)]
            : [diverges, to(L), periodic, to(q)];
    const { options, correctId } = nativeChoice(labels, mix(...labels, s));
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'What happens to the terms of this sequence as $n$ gets larger?' },
        { kind: 'display', tex: startTex(affineTex(a, b, q), `u_1 = ${s}`) },
      ],
      options,
      correctId,
    };
  },
  solution: ({ a, b, L, q, s }) => {
    const p = `$p = ${fracTex(a, b)}$`;
    const words: Record<Fate, string> = {
      steady: `${p}, so $|p| < 1$: the gap to the limit shrinks every step and the terms converge. $L = ${pTimes(a, b, 'L')} ${signed(q)}$ gives $L = ${L}$.`,
      swing: `${p}, so $|p| < 1$: the gap shrinks every step, changing sign, and the terms converge. $L = ${pTimes(a, b, 'L')} ${signed(q)}$ gives $L = ${L}$.`,
      adds: `${p}: every step ${q > 0 ? 'adds' : 'takes away'} $${Math.abs(q)}$, so the terms go $${s}, ${s + q}, ${s + 2 * q}, \\dots$ and never settle. They diverge.`,
      flips: `${p}: the terms go $${s}, ${q - s}, ${s}, ${q - s}, \\dots$, repeating every two. $L = ${L}$ solves $L = pL + q$, but the terms only jump over it.`,
      grows: `${p}, so $|p| > 1$: the gap to $${L}$ grows every step and the terms diverge. $L = ${L}$ does solve $L = pL + q$, but the terms never get there.`,
      wild: `${p}, so $|p| > 1$: the terms swing either side of $${L}$, further each time, and diverge. $L = ${L}$ does solve $L = pL + q$, but the terms never get there.`,
    };
    return [{ text: words[fateOf(a, b)] }];
  },
};

interface FateTableParams {
  /** u's ratio, which settles. */
  a: number;
  b: number;
  /** v's ratio, whole, which does not. */
  c: number;
  L: number;
  g: number;
  blanksU: number[];
  blanksV: number[];
}

/**
 * Two rules with the same fixed point and the same first term, side by side:
 * one closes in on L, the other runs away from it or flips about it.
 */
const fateTable: Generator<FateTableParams> = {
  id: 'seq-fate-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [a, b] = rng.pick<Ratio>(hard ? [[-1, 2], [-1, 3], [2, 3]] : [[1, 2], [1, 3]]);
    const rows = b === 2 ? 5 : 4;
    return {
      a,
      b,
      c: rng.pick(hard ? [2, -2, -1] : [2, -1]),
      L: b * rng.pick([-3, -2, -1, 1, 2, 3, 4, 5, 6]),
      g: b ** (rows - 1) * (rng.chance(0.3) ? -1 : 1),
      blanksU: positions(rng, 1, rows - 1, 2),
      blanksV: positions(rng, 1, rows - 1, hard ? 2 : 1),
    };
  },
  render: ({ a, b, c, L, g, blanksU, blanksV }): Slide => {
    const rows = b === 2 ? 5 : 4;
    const qU = (L * (b - a)) / b;
    const qV = L * (1 - c);
    const u = towards(L, g, a, b, rows);
    const v = towards(L, g, c, 1, rows);
    const answer: number[] = [];
    u.forEach((_, i) => {
      if (blanksU.includes(i)) answer.push(u[i]);
      if (blanksV.includes(i)) answer.push(v[i]);
    });
    const slips = [
      ...blanksU.flatMap((i) => [(a * u[i - 1]) / b, u[i - 1] + qU, 2 * L - u[i]]),
      ...blanksV.flatMap((i) => [c * v[i - 1], v[i - 1] + qV, -v[i], 2 * L - v[i]]),
    ];
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: `Both rules have the fixed point $L = ${L}$, and both start at $${L + g}$. Fill in the table, then see which sequence closes in on $${L}$.`,
        },
        { kind: 'display', tex: `\\begin{gathered} ${affineTex(a, b, qU)} \\\\ ${affineTex(c, 1, qV, 'v')} \\end{gathered}` },
      ],
      columns: ['n', 'u_n', 'v_n'],
      rows: u.map((_, i) => [`${i + 1}`, blanksU.includes(i) ? null : `${u[i]}`, blanksV.includes(i) ? null : `${v[i]}`]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, b, c, L, g }) => {
    const rows = b === 2 ? 5 : 4;
    const qU = (L * (b - a)) / b;
    const qV = L * (1 - c);
    const u = towards(L, g, a, b, rows);
    const v = towards(L, g, c, 1, rows);
    return [
      { text: `Work each column down from $${L + g}$.` },
      { tex: chain(...u.slice(1).map((t, i) => `u_{${i + 2}} &= ${fracTex(a, b)} \\times ${br(u[i])} ${signed(qU)} = ${t}`)) },
      { tex: chain(...v.slice(1).map((t, i) => `v_{${i + 2}} &= ${times(c)}${br(v[i])} ${signed(qV)} = ${t}`)) },
      {
        text: `$u_n$ has $|p| = ${fracTex(Math.abs(a), b)}$, less than $1$, so its gap to $${L}$ shrinks and it converges. $v_n$ has $|p| = ${Math.abs(c)}$, so ${
          c === -1 ? 'it flips between two values for ever' : 'its gap doubles every step and it diverges'
        }.`,
      },
    ];
  },
};

/* ---------- Level 3, lesson 4: limits of position-to-term rules ---------- */

interface DivideParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * The limit of (an + b)/(cn + d), with top and bottom already divided by n:
 * each bracket goes to what it heads for, then the two are divided.
 */
const divideSteps: Generator<DivideParams> = {
  id: 'seq-divide-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const c = rng.pick(hard ? [2, 3, 4, 5] : [1, 2, 3]);
      const a = hard ? rng.pick(NONZERO9) : c * rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
      const b = rng.pick(NONZERO9);
      const d = rng.pick(NONZERO9);
      if ((hard && a % c === 0) || d <= -c || a * d === b * c) continue;
      return { a, b, c, d };
    }
  },
  render: ({ a, b, c, d }): Slide => {
    const small = (k: number) => `\\frac{${Math.abs(k)}}{n}`;
    const sign = (k: number) => (k < 0 ? '-' : '+');
    const limit = fracTex(a, c);
    const finals = [...new Set([limit, fracTex(c, a), fracTex(b, d), fracTex(a + b, c + d), fracTex(a + c, c)])].slice(0, 4);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Find the limit of $u_n = \\frac{${linearTex(a, b)}}{${linearTex(c, d)}}$. Dividing its top and bottom by $n$ gives the line below, and as $n$ grows $${small(b)}$ and $${small(d)}$ both head for $0$. Tap the operation to do next, then choose what it heads for.`,
        },
      ],
      start: ['(', `${a}`, sign(b), small(b), ')', '\\div', '(', `${c}`, sign(d), small(d), ')'],
      reductions: [
        { span: [0, 5], operator: 2, value: `${a}`, bank: valueBank(a, a + b, b, 0) },
        { span: [2, 7], operator: 4, value: `${c}`, bank: valueBank(c, c + d, d, 0) },
        { span: [0, 3], operator: 1, value: limit, bank: stepsBank(finals) },
      ],
    };
  },
  solution: ({ a, b, c, d }) => [
    {
      tex: `u_n = \\frac{${linearTex(a, b)}}{${linearTex(c, d)}} = \\frac{${a} ${b < 0 ? '-' : '+'} \\frac{${Math.abs(b)}}{n}}{${c} ${d < 0 ? '-' : '+'} \\frac{${Math.abs(d)}}{n}}`,
    },
    { text: `As $n$ grows the two small fractions head for $0$, leaving $${a} \\div ${c}$.` },
    { tex: `\\lim_{n \\to \\infty} u_n = ${fracTex(a, c)}` },
  ],
};

type PosForm = 'ratio' | 'half' | 'recip' | 'square' | 'lower';

interface PosParams {
  form: PosForm;
  a: number;
  b: number;
  c: number;
  d: number;
}

function posTex({ form, a, b, c, d }: PosParams): string {
  if (form === 'ratio') return `\\frac{${linearTex(a, b)}}{${linearTex(c, d)}}`;
  if (form === 'half') return `${a} ${b < 0 ? '-' : '+'} \\frac{${Math.abs(b)}}{2^n}`;
  if (form === 'recip') return `${a} ${b < 0 ? '-' : '+'} \\frac{${Math.abs(b)}}{n}`;
  if (form === 'square') return `\\frac{${sumTex([`${b}`, nTerm(a, 2)])}}{${sumTex([nTerm(c, 2), nTerm(d, 1)])}}`;
  return `\\frac{${linearTex(a, b)}}{${sumTex([nTerm(c, 2), `${d}`])}}`;
}

function posLimit({ form, a, c }: PosParams): Ratio {
  if (form === 'ratio' || form === 'square') return [a, c];
  if (form === 'lower') return [0, 1];
  return [a, 1];
}

/** The limit of a position-to-term rule, typed. Harder rules carry n^2, or a bottom that outgrows the top. */
const posLimitAsk: Generator<PosParams> = {
  id: 'seq-pos-limit',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const form: PosForm = rng.pick(hard ? ['ratio', 'square', 'lower'] : ['ratio', 'half', 'recip']);
      const c = rng.pick([1, 2, 3, 4, 5]);
      const a = form === 'ratio' && !hard ? c * rng.pick([-3, -2, -1, 1, 2, 3, 4]) : rng.pick(NONZERO9);
      const b = rng.pick(NONZERO9);
      const d = rng.pick(NONZERO9);
      const bottom = (n: number) =>
        form === 'ratio' ? c * n + d : form === 'square' ? c * n * n + d * n : form === 'lower' ? c * n * n + d : 1;
      if (Array.from({ length: 30 }, (_, i) => bottom(i + 1)).includes(0)) continue;
      if (form === 'ratio' && (a * d === b * c || (hard && a % c === 0))) continue;
      return { form, a, b, c, d };
    }
  },
  choices: (params) => {
    const { form, a, b, c, d } = params;
    const slips: Ratio[] =
      form === 'half'
        ? [[2 * a + b, 2], [b, 1], [0, 1]]
        : form === 'recip'
          ? [[a + b, 1], [b, 1], [0, 1]]
          : form === 'lower'
            ? [[a, c], [b, d], [a + b, c + d]]
            : [[c, a], [b, d], [a + b, c + d], [0, 1]];
    return fractionOptions(posLimit(params), slips);
  },
  render: (params): Slide => {
    const [p, q] = posLimit(params);
    return typed(
      [{ kind: 'prose', text: `Find the limit of $u_n = ${posTex(params)}$ as $n$ grows.` }],
      '\\lim_{n \\to \\infty} u_n =',
      q === 1 ? p : fracAnswer(p, q),
      FRACTION_KEYS,
    );
  },
  solution: (params) => {
    const { form, a, b, c, d } = params;
    const [p, q] = posLimit(params);
    const limit = { tex: `\\lim_{n \\to \\infty} u_n = ${fracTex(p, q)}` };
    if (form === 'half') return [{ text: `$2^n$ doubles every step, so $\\frac{${Math.abs(b)}}{2^n}$ heads for $0$ and $u_n$ heads for $${a}$.` }, limit];
    if (form === 'recip') return [{ text: `$\\frac{${Math.abs(b)}}{n}$ shrinks towards $0$ as $n$ grows, so $u_n$ heads for $${a}$.` }, limit];
    if (form === 'ratio') {
      return [
        { tex: `u_n = \\frac{${a} ${b < 0 ? '-' : '+'} \\frac{${Math.abs(b)}}{n}}{${c} ${d < 0 ? '-' : '+'} \\frac{${Math.abs(d)}}{n}}` },
        { text: `Dividing top and bottom by $n$ leaves fractions over $n$ that head for $0$, so $u_n$ heads for $${a} \\div ${c}$.` },
        limit,
      ];
    }
    if (form === 'square') {
      return [
        { text: `Divide the top and the bottom by $n^2$, the highest power. $\\frac{${b}}{n^2}$ and $\\frac{${d}}{n}$ head for $0$, which leaves $\\frac{${a}}{${c}}$.` },
        limit,
      ];
    }
    return [
      { text: `The bottom has the higher power. Divide the top and the bottom by $n^2$: the top becomes $\\frac{${a}}{n} + \\frac{${b}}{n^2}$, which heads for $0$, while the bottom heads for $${c}$.` },
      limit,
    ];
  },
};

interface Item {
  tex: string;
  /** Where it goes, for the worked solution. TeX. */
  note: string;
}

/** A position-to-term rule that converges, of a kind picked by `kind`. */
function convergingItem(rng: Rng, kind: number): Item {
  const k = rng.pick(NONZERO9);
  const m = rng.int(2, 9);
  if (kind === 0) {
    const c = rng.pick([1, 2, 3]);
    const a = rng.pick(NONZERO9);
    const d = rng.int(1, 9);
    return { tex: `\\frac{${linearTex(a, rng.pick(NONZERO9))}}{${linearTex(c, d)}}`, note: `\\to ${fracTex(a, c)}` };
  }
  if (kind === 1) return { tex: `${k} + \\frac{${m}}{n}`, note: `\\to ${k}` };
  if (kind === 2) return { tex: `${k} - \\frac{${m}}{2^n}`, note: `\\to ${k}` };
  if (kind === 3) return { tex: `\\frac{${lead(m - 1)}(-1)^n}{n}`, note: '\\to 0' };
  if (kind === 4) {
    const a = rng.pick(NONZERO9);
    const c = rng.pick([1, 2, 3, 4]);
    return { tex: `\\frac{${sumTex([nTerm(a, 2), `${rng.pick(NONZERO9)}`])}}{${sumTex([nTerm(c, 2), `${rng.int(1, 9)}`])}}`, note: `\\to ${fracTex(a, c)}` };
  }
  return { tex: `\\frac{${linearTex(rng.pick(NONZERO9), rng.pick(NONZERO9))}}{n^{2} + ${rng.int(1, 9)}}`, note: '\\to 0' };
}

/** A position-to-term rule that does not converge, of a kind picked by `kind`. */
function divergingItem(rng: Rng, kind: number): Item {
  const k = rng.pick(NONZERO9);
  const m = rng.int(2, 9);
  if (kind === 0) {
    const a = rng.pick(NONZERO9);
    return { tex: linearTex(a, rng.pick(NONZERO9)), note: `\\text{ ${a > 0 ? 'grows' : 'falls'} without limit}` };
  }
  if (kind === 1) return { tex: `\\frac{n^{2} ${signed(rng.pick(NONZERO9))}}{n + ${rng.int(1, 9)}}`, note: '\\text{ grows without limit}' };
  if (kind === 2) return { tex: `${m} \\times 2^n ${signed(rng.pick(NONZERO9))}`, note: '\\text{ grows without limit}' };
  if (kind === 3) return { tex: `${k} + ${lead(m - 1)}(-1)^n`, note: `\\text{ flips between } ${k - m + 1} \\text{ and } ${k + m - 1}` };
  if (kind === 4) return { tex: `${lead(m - 1)}(-1)^n n`, note: '\\text{ swings further each time}' };
  return { tex: `\\frac{${nTerm(m, 2)}}{${linearTex(rng.pick([1, 2, 3]), rng.int(1, 9))}}`, note: '\\text{ grows without limit}' };
}

interface PosConvergeParams {
  want: 'converges' | 'diverges';
  /** The right one first. */
  items: Item[];
}

/** Which of four position-to-term rules converges (or does not)? */
const posConverge: Generator<PosConvergeParams> = {
  id: 'seq-pos-converge',
  sample: (rng, difficulty) => {
    const kinds = difficulty > 1 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2];
    const want = rng.chance(0.5) ? 'converges' : 'diverges';
    const [right, wrong] = want === 'converges' ? [convergingItem, divergingItem] : [divergingItem, convergingItem];
    for (;;) {
      const items = [right(rng, rng.pick(kinds)), ...rng.sample(kinds, 3).map((kind) => wrong(rng, kind))];
      if (new Set(items.map((item) => item.tex)).size === 4) return { want, items };
    }
  },
  render: ({ want, items }): Slide => {
    const labels = items.map((item) => `u_n = ${item.tex}`);
    const { options, correctId } = nativeChoice(labels, mix(...labels));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: want === 'converges' ? 'Which of these sequences converges?' : 'Which of these sequences does **not** converge?',
        },
      ],
      options,
      correctId,
    };
  },
  solution: ({ want, items }) => [
    { text: 'Ask where each one heads as $n$ grows: a fraction over $n$ or $2^n$ heads for $0$, a power of $n$ on top grows, and $(-1)^n$ on its own never settles.' },
    ...items.map((item) => ({ tex: `\\begin{gathered} u_n = ${item.tex} \\\\ u_n ${item.note} \\end{gathered}` })),
    { text: `So the one that ${want === 'converges' ? 'converges' : 'does not converge'} is $u_n = ${items[0].tex}$.` },
  ],
};

interface PowerParams {
  top: number;
  bottom: number;
  A: number;
  B: number;
  C: number;
  D: number;
  /** An n term on a quadratic top, or 0. */
  E: number;
  /** Write the top constant first, so the leading term is not the first one read. */
  flip: boolean;
}

function polyTex(leading: number, degree: number, constant: number, middle = 0, flip = false): string {
  const terms = [nTerm(leading, degree), degree === 2 ? nTerm(middle, 1) : '0', `${constant}`];
  return sumTex(flip ? terms.reverse() : terms);
}

const powerOf = (k: number) => (k === 1 ? 'n' : `n^{${k}}`);

/** Compare the highest powers top and bottom: diverges, heads for 0, or the ratio of the leading numbers. */
const powerFlow: Generator<PowerParams> = {
  id: 'seq-power-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const [top, bottom] = rng.pick<[number, number]>([[1, 1], [2, 2], [2, 1], [1, 2], [2, 2]]);
      const A = rng.pick(NONZERO9);
      const B = rng.pick(NONZERO9);
      const C = rng.pick([-3, -2, 1, 2, 3, 4, 5]);
      const D = rng.pick(NONZERO9);
      const E = hard && top === 2 ? rng.int(-5, 5) : 0;
      const flip = hard && rng.chance(0.5);
      if (Array.from({ length: 30 }, (_, i) => C * (i + 1) ** bottom + D).includes(0)) continue;
      if (top === bottom && E === 0 && A * D === B * C) continue;
      return { top, bottom, A, B, C, D, E, flip };
    }
  },
  render: ({ top, bottom, A, B, C, D, E, flip }): Slide => {
    const right = `$${fracTex(A, C)}$`;
    const offered = [...new Set([fracTex(A, C), fracTex(B, D), fracTex(A + B + E, C + D), fracTex(C, A), fracTex(A + C, C)])]
      .slice(0, 3)
      .map((tex) => `$${tex}$`);
    const answer = top > bottom ? ['Higher on the top'] : top < bottom ? ['Higher on the bottom'] : ['The same on both', right];
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Where does this sequence go as $n$ gets larger?' }],
      subject: `u_n = \\frac{${polyTex(A, top, B, E, flip)}}{${polyTex(C, bottom, D)}}`,
      steps: [
        {
          id: 'compare',
          ask: 'Compare the highest power of $n$ on the top with the highest on the bottom.',
          branches: [
            { label: 'Higher on the top', outcome: 'The top outgrows the bottom, so $u_n$ runs off without limit: it **diverges**.' },
            { label: 'The same on both', to: 'same' },
            { label: 'Higher on the bottom', outcome: 'The bottom outgrows the top, so $u_n$ heads for $0$.' },
          ],
        },
        {
          id: 'same',
          ask: 'Divide the top and the bottom by that power. What does $u_n$ head for?',
          branches: turned(
            offered.map((label) => ({ label, outcome: `Every other piece heads for $0$, so $u_n$ heads for ${label}.` })),
            mix(A, B, C, D, E),
          ),
        },
      ],
      answer,
    };
  },
  solution: ({ top, bottom, A, C }) => {
    const powers = { text: `The top's highest power is $${powerOf(top)}$ and the bottom's is $${powerOf(bottom)}$.` };
    if (top > bottom) return [powers, { text: 'The top grows faster than the bottom, so $u_n$ has no limit: it diverges.' }];
    if (top < bottom) {
      return [powers, { text: `Dividing top and bottom by $${powerOf(bottom)}$ sends the whole top to $0$ while the bottom heads for $${C}$, so $u_n \\to 0$.` }];
    }
    return [
      powers,
      { text: `Dividing top and bottom by $${powerOf(top)}$ leaves $${A}$ on top and $${C}$ below once the rest head for $0$, so $u_n \\to ${fracTex(A, C)}$.` },
    ];
  },
};

/* ---------- Level 3, lesson 5: how close, how soon ---------- */

interface GapTableParams {
  a: number;
  b: number;
  L: number;
  g: number;
  /** [row, column] of each blank: column 1 is u_n, column 2 its gap to L. */
  blanks: [number, number][];
}

/** A table with a third column, u_n - L, which is multiplied by p every row. */
const gapTable: Generator<GapTableParams> = {
  id: 'seq-gap-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const [a, b] = rng.pick<Ratio>(hard ? [[-1, 2], [-1, 3], [2, 3], [3, 4]] : [[1, 2], [1, 3]]);
      const rows = rowsFor(b);
      const L = b * rng.pick([-3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
      const g = wholeGap(rng, b, rows);
      const cells: [number, number][] = [];
      for (let r = 1; r < rows; r += 1) cells.push([r, 1], [r, 2]);
      const blanks = rng.sample(cells, hard ? 4 : 3).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      if (!hard && new Set(blanks.map(([r]) => r)).size < blanks.length) continue;
      if (towards(L, g, a, b, rows).some((t) => Math.abs(t) > 150)) continue;
      return { a, b, L, g, blanks };
    }
  },
  render: ({ a, b, L, g, blanks }): Slide => {
    const q = (L * (b - a)) / b;
    const terms = towards(L, g, a, b, rowsFor(b));
    const gaps = terms.map((t) => t - L);
    const blank = (r: number, col: number) => blanks.some(([x, y]) => x === r && y === col);
    const answer = blanks.map(([r, col]) => (col === 1 ? terms[r] : gaps[r]));
    const slips = blanks.flatMap(([r, col]) =>
      col === 1 ? [terms[r - 1] + q, (a * terms[r - 1]) / b, L - gaps[r]] : [-gaps[r], terms[r], (b * gaps[r - 1]) / a, gaps[r - 1] - gaps[r]],
    );
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: `This sequence has limit $L = ${L}$. The last column is how far each term is from it. Fill in the missing values.`,
        },
        { kind: 'display', tex: startTex(affineTex(a, b, q), `u_1 = ${L + g}`) },
      ],
      columns: ['n', 'u_n', 'u_n - L'],
      rows: terms.map((t, r) => [`${r + 1}`, blank(r, 1) ? null : `${t}`, blank(r, 2) ? null : `${gaps[r]}`]),
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, b, L, g }) => {
    const gaps = towards(L, g, a, b, rowsFor(b)).map((t) => t - L);
    return [
      { text: `Take $L$ from both sides of $L = ${pTimes(a, b, 'L')} + q$ and the rule: $u_{n+1} - L = ${fracTex(a, b)}(u_n - L)$. Each gap is $${fracTex(a, b)}$ times the one before.` },
      { tex: listTex(gaps, false) },
      { text: `Add $${L}$ back to each gap for the terms themselves.` },
    ];
  },
};

interface GapTreeParams {
  /** ±1: p is 1/b or -1/b. */
  a: number;
  b: number;
  m: number;
  g: number;
  /** The term asked for. */
  k: number;
}

/** A far term found from the gap: u_k - L = (u_1 - L)p^{k-1}, with no terms worked in between. */
const gapTree: Generator<GapTreeParams> = {
  id: 'seq-gap-tree',
  sample: (rng, difficulty) => {
    const a = difficulty > 1 ? -1 : 1;
    const b = rng.pick([2, 3]);
    const k = b === 2 ? rng.int(4, 7) : rng.int(4, 5);
    const g = b ** (k - 1) * rng.pick(b === 2 && k < 7 ? [1, 2, 3, -1, -2] : [1, 2, -1]);
    return { a, b, m: rng.pick([-3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]), g, k };
  },
  render: ({ a, b, m, g, k }): Slide => {
    const L = b * m;
    const q = m * (b - a);
    const f = (b / a) ** (k - 1);
    const gk = g / f;
    const answer = [g, f, gk, L + gk];
    const slips = [f * b, f / b, -f, -gk, L - gk, L + g - gk, gk * b, -g];
    const divisor = a > 0 ? `${b}^{${k - 1}}` : `(-${b})^{${k - 1}}`;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `This sequence converges to $L = ${L}$. Each step multiplies the gap $u_n - L$ by $${fracTex(a, b)}$, so $${k - 1}$ steps divide it by $${divisor}$. Fill the tree: $u_1 - L$, then $${divisor}$, then $u_{${k}} - L$, then $u_{${k}}$.`,
        },
      ],
      expression: startTex(affineTex(a, b, q), `u_1 = ${L + g}`),
      nodes: [
        { id: 'first', from: [] },
        { id: 'factor', from: [] },
        { id: 'gap', from: ['first', 'factor'] },
        { id: 'term', from: ['gap'] },
      ],
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ a, b, m, g, k }) => {
    const L = b * m;
    const f = (b / a) ** (k - 1);
    return [
      {
        text: `The gap to $L = ${L}$ is multiplied by $${fracTex(a, b)}$ every step, so after $${k - 1}$ steps it has been divided by $\\left(${fracTex(b, a)}\\right)^{${k - 1}} = ${f}$.`,
      },
      {
        tex: chain(
          `u_1 - L &= ${L + g} - ${br(L)} = ${g}`,
          `u_{${k}} - L &= ${g} \\div ${br(f)} = ${g / f}`,
          `u_{${k}} &= ${L} ${signed(g / f)} = ${L + g / f}`,
        ),
      },
    ];
  },
};

interface RateParams {
  pa: Ratio;
  pb: Ratio;
  qa: number;
  qb: number;
}

const sizeOf = ([a, b]: Ratio) => Math.abs(a) / b;

/** Which of two rules closes in faster: the smaller |p|, whatever the signs. Harder pairs may not both converge. */
const rateFlow: Generator<RateParams> = {
  id: 'seq-rate-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const settle = hard ? [...SETTLE, ...SETTLE_NEG] : SETTLE;
    const away: Ratio[] = [[2, 1], [-2, 1], [3, 2], [-3, 2], [5, 4]];
    for (;;) {
      let pa = rng.pick(settle);
      let pb = rng.pick(settle);
      // About a third of hard pairs have a rule that runs away; about a third
      // of the rest mirror p, so only the sign differs.
      const twist = !hard ? 'none' : rng.chance(0.3) ? 'away' : rng.chance(0.3) ? 'mirror' : 'none';
      if (twist === 'away') {
        if (rng.chance(0.5)) pa = rng.pick(away);
        else pb = rng.pick(away);
      } else if (twist === 'mirror') pb = [-pa[0], pa[1]];
      if (pa[0] === pb[0] && pa[1] === pb[1]) continue;
      if (!hard && sizeOf(pa) === sizeOf(pb)) continue;
      return { pa, pb, qa: rng.pick(NONZERO12), qb: rng.pick(NONZERO12) };
    }
  },
  render: ({ pa, pb, qa, qb }): Slide => {
    const [ca, cb] = [sizeOf(pa) < 1, sizeOf(pb) < 1];
    const which = sizeOf(pa) < sizeOf(pb) ? '$A$' : sizeOf(pb) < sizeOf(pa) ? '$B$' : 'Neither: the same';
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Compare how these two sequences behave in the long run.' }],
      subject: `\\begin{gathered} A: \\; ${affineTex(pa[0], pa[1], qa)} \\\\ B: \\; ${affineTex(pb[0], pb[1], qb, 'v')} \\end{gathered}`,
      steps: [
        {
          id: 'both',
          ask: 'Do both sequences converge?',
          branches: [
            { label: 'Yes', to: 'which' },
            { label: 'No: only $A$ does', outcome: 'Then $B$ has $|p| \\geq 1$: its gap never shrinks, so it has no limit to close in on.' },
            { label: 'No: only $B$ does', outcome: 'Then $A$ has $|p| \\geq 1$: its gap never shrinks, so it has no limit to close in on.' },
          ],
        },
        {
          id: 'which',
          ask: 'Which one closes in on its limit faster?',
          branches: [
            { label: '$A$', outcome: 'So $A$ reaches any closeness to its limit in fewer steps.' },
            { label: '$B$', outcome: 'So $B$ reaches any closeness to its limit in fewer steps.' },
            { label: 'Neither: the same', outcome: 'So both gaps shrink by the same factor each step, whatever the signs.' },
          ],
        },
      ],
      answer: ca && cb ? ['Yes', which] : ca ? ['No: only $A$ does'] : ['No: only $B$ does'],
    };
  },
  solution: ({ pa, pb }) => {
    const size = ([a, b]: Ratio) => fracTex(Math.abs(a), b);
    const [ca, cb] = [sizeOf(pa) < 1, sizeOf(pb) < 1];
    let verdict: string;
    if (!ca || !cb) verdict = `Only $${ca ? 'A' : 'B'}$ has $|p| < 1$, so only it converges.`;
    else if (sizeOf(pa) === sizeOf(pb)) verdict = 'The two sizes are equal, so the gaps shrink at the same rate: the sign of $p$ only decides which side the terms land on.';
    else verdict = `$${sizeOf(pa) < sizeOf(pb) ? 'A' : 'B'}$ has the smaller $|p|$, so its gap shrinks faster, whatever the sign of $p$.`;
    return [
      { text: `Each step multiplies the gap to the limit by $p$, so what matters is $|p|$: $${size(pa)}$ for $A$ and $${size(pb)}$ for $B$.` },
      { text: verdict },
    ];
  },
};

/** How close is close: the tolerances a gap question asks for. */
const WITHIN = [
  { tex: '1', num: 1, den: 1 },
  { tex: '0.5', num: 1, den: 2 },
  { tex: '0.1', num: 1, den: 10 },
  { tex: '0.05', num: 1, den: 20 },
  { tex: '0.01', num: 1, den: 100 },
];

interface GapFirstParams {
  a: number;
  b: number;
  m: number;
  g: number;
  /** Index into WITHIN. */
  t: number;
}

/** The first n with |g p^{n-1}| < t, found exactly; 0 when a gap lands on t, which the wording cannot settle. */
function firstWithin({ a, b, g, t }: GapFirstParams): number {
  const { num, den } = WITHIN[t];
  for (let n = 1; n <= 40; n += 1) {
    const gap = Math.abs(g) * Math.abs(a) ** (n - 1) * den;
    const bound = num * b ** (n - 1);
    if (gap === bound) return 0;
    if (gap < bound) return n;
  }
  return 0;
}

/** How many steps until the terms are within a tolerance of the limit. */
const gapFirst: Generator<GapFirstParams> = {
  id: 'seq-gap-first',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const [a, b] = rng.pick<Ratio>(hard ? [[-1, 2], [2, 3], [3, 4], [-1, 3], [-2, 3], [1, 4]] : [[1, 2], [1, 3]]);
      const params = {
        a,
        b,
        m: rng.pick([-3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]),
        g: rng.int(5, 120) * (rng.chance(0.3) ? -1 : 1),
        t: rng.pick(hard ? [2, 3, 4] : [0, 1, 2]),
      };
      const n = firstWithin(params);
      const x = Math.log(WITHIN[params.t].num / WITHIN[params.t].den / Math.abs(params.g)) / Math.log(Math.abs(a) / b);
      if (n < 3 || n > 16 || Math.abs(x - Math.round(x)) < 0.01) continue;
      return params;
    }
  },
  choices: (params) => {
    const n = firstWithin(params);
    return numberOptions(n, [n - 1, n + 1, n + 2]);
  },
  render: (params): Slide => {
    const { a, b, m, g, t } = params;
    const L = b * m;
    return typed(
      [
        {
          kind: 'prose',
          text: `This sequence converges to $L = ${L}$. Which is the first term within $${WITHIN[t].tex}$ of $L$, so that $|u_n - L| < ${WITHIN[t].tex}$? Give its position $n$.`,
        },
        { kind: 'display', tex: startTex(affineTex(a, b, m * (b - a)), `u_1 = ${L + g}`) },
      ],
      'n =',
      firstWithin(params),
    );
  },
  solution: (params) => {
    const { a, b, g, t } = params;
    const n = firstWithin(params);
    const size = fracTex(Math.abs(a), b);
    const tol = WITHIN[t].tex;
    const x = Math.log(WITHIN[t].num / WITHIN[t].den / Math.abs(g)) / Math.log(Math.abs(a) / b);
    const gapAt = (k: number) => String(Number((Math.abs(g) * (Math.abs(a) / b) ** (k - 1)).toPrecision(3)));
    return [
      {
        text: `The gap starts at $u_1 - L = ${g}$ and is multiplied by $${fracTex(a, b)}$ every step, so $|u_n - L| = ${Math.abs(g)} \\times \\left(${size}\\right)^{n-1}$.`,
      },
      {
        tex: [
          '\\begin{gathered}',
          `${Math.abs(g)} \\times \\left(${size}\\right)^{n-1} < ${tol} \\\\`,
          `n - 1 > \\frac{\\ln(${tol} \\div ${Math.abs(g)})}{\\ln ${size}} \\\\`,
          `n - 1 > ${x.toFixed(2)}`,
          '\\end{gathered}',
        ].join(' '),
      },
      {
        text: `So $n - 1 = ${n - 1}$ and $n = ${n}$. Check: $|u_{${n - 1}} - L| \\approx ${gapAt(n - 1)}$, not yet below $${tol}$, and $|u_{${n}} - L| \\approx ${gapAt(n)}$.`,
      },
    ];
  },
};

/* ---------- Level 4: sums of powers and the method of differences ---------- */

type Power = 1 | 2 | 3;

/** Σr, Σr² or Σr³ from r = 1 to n, by the standard result. */
function powerSum(k: Power, n: number): number {
  if (k === 1) return (n * (n + 1)) / 2;
  if (k === 2) return (n * (n + 1) * (2 * n + 1)) / 6;
  return ((n * (n + 1)) / 2) ** 2;
}

/** A slip on each standard result: no halving, a third for a sixth, Σr left unsquared. */
function resultSlip(k: Power, n: number): number {
  if (k === 1) return n * (n + 1);
  if (k === 2) return (n * (n + 1) * (2 * n + 1)) / 3;
  return (n * (n + 1)) / 2;
}

/** r, r^2 or r^3, as the general term after a sigma. */
function powerTex(k: Power): string {
  return k === 1 ? 'r' : `r^${k}`;
}

/** The standard results, as the learner reads them. */
const RESULT_TEX: Record<Power, string> = {
  1: '\\frac{1}{2}n(n + 1)',
  2: '\\frac{1}{6}n(n + 1)(2n + 1)',
  3: '\\frac{1}{4}n^2(n + 1)^2',
};

/** The standard result with a number in place of n, before it is worked out. */
function resultAt(k: Power, n: number): string {
  if (k === 1) return `\\frac{1}{2} \\times ${n} \\times ${n + 1}`;
  if (k === 2) return `\\frac{1}{6} \\times ${n} \\times ${n + 1} \\times ${2 * n + 1}`;
  return `\\frac{1}{4} \\times ${n}^2 \\times ${n + 1}^2`;
}

/** 1^k + 2^k + … + n^k written out, as the sum is met on paper. */
function powersWritten(k: Power, n: number): string {
  const term = (r: number) => (k === 1 ? `${r}` : `${r}^${k}`);
  return `${term(1)} + ${term(2)} + ${term(3)} + \\dots + ${term(n)}`;
}

/** A sum of f(r) from lo to hi, added up term by term. */
function addUp(f: (r: number) => number, lo: number, hi: number): number {
  let total = 0;
  for (let r = lo; r <= hi; r += 1) total += f(r);
  return total;
}

/** `\sum_{r=lo}^{hi}` with either end a number or a letter. */
function sumFrom(lo: number | string, hi: number | string): string {
  return `\\sum_{r=${lo}}^{${hi}}`;
}

/** a n + b, or the plain number b when a is 0. */
function topTex(a: number, b: number): string {
  return a === 0 ? `${b}` : linearTex(a, b);
}

/** a r^2 + b r + c in the letter r, zero terms left out. */
function quadRTex(a: number, b: number, c: number): string {
  return sumTex([termTex(a, 2), termTex(b, 1), `${c}`]).replace(/x/g, 'r');
}

/** `+ 3body`, `- body`: a signed term, its coefficient left off when it is 1. */
function signedTerm(c: number, body: string): string {
  const size = Math.abs(c) === 1 ? '' : `${Math.abs(c)}`;
  return `${c < 0 ? '-' : '+'} ${size}${body}`;
}

/* Level 4, lesson 1: the standard results */

interface PowerTilesParams {
  k: Power;
  /** The top of the sum as a n + b; a = 0 is a plain number. */
  a: number;
  b: number;
}

const TOPS: [number, number][] = [
  [2, 0], [3, 0], [4, 0], [1, 1], [1, -1], [1, 2], [1, 3], [2, 1], [2, -1], [2, 2], [3, 1], [3, -1],
];

const PRODUCT_TEMPLATE: Record<Power, string> = {
  1: '\\frac12({0})({1})',
  2: '\\frac16({0})({1})({2})',
  3: '\\frac14({0})^2({1})^2',
};

/**
 * A standard result as a product, its factors placed as tiles. Easier draws
 * stop at a number; harder ones stop at 2n or n + 1, so every n in the result
 * becomes that. The factors may go in any order, which is why this is
 * unordered: every blank is a factor, so a reordering is the same product.
 */
const powerSumTiles: Generator<PowerTilesParams> = {
  id: 'seq-power-sum-tiles',
  sample: (rng, difficulty) => {
    const k = rng.pick<Power>([1, 2, 3]);
    if (difficulty > 1) {
      const [a, b] = rng.pick(TOPS);
      return { k, a, b };
    }
    return { k, a: 0, b: k === 1 ? rng.int(5, 40) : k === 2 ? rng.int(4, 15) : rng.int(3, 12) };
  },
  render: ({ k, a, b }): Slide => {
    // m + shift, or 2m + shift, where m is the top of the sum.
    const m = (shift: number, times = 1) => topTex(times * a, times * b + shift);
    const answer = k === 2 ? [m(0), m(1), m(1, 2)] : [m(0), m(1)];
    const slips = [m(-1), m(-1, 2), m(2), ...(a === 0 ? [] : ['n', 'n + 1', '2n + 1']), m(0, 2), m(1, 2)];
    const top = topTex(a, b);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text:
            a === 0
              ? `Write this sum as a product, using the standard result for $\\sum ${powerTex(k)}$.`
              : `Put $${top}$ in place of $n$ in the standard result for $\\sum ${powerTex(k)}$, to write this sum as a product.`,
        },
        { kind: 'display', tex: `${sumFrom(1, top)} ${powerTex(k)}` },
      ],
      template: PRODUCT_TEMPLATE[k],
      bank: tileBank(answer, slips, 4),
      answer,
      unordered: true,
    };
  },
  solution: ({ k, a, b }) => {
    const m = (shift: number, times = 1) => topTex(times * a, times * b + shift);
    const product = { 1: `\\frac{1}{2}(${m(0)})(${m(1)})`, 2: `\\frac{1}{6}(${m(0)})(${m(1)})(${m(1, 2)})`, 3: `\\frac{1}{4}(${m(0)})^2(${m(1)})^2` }[k];
    const steps: SolutionStep[] = [{ text: `The standard result is $${sumFrom(1, 'n')} ${powerTex(k)} = ${RESULT_TEX[k]}$.` }];
    if (a === 0) {
      steps.push({ text: `Here $n = ${b}$, so $n + 1 = ${b + 1}$${k === 2 ? ` and $2n + 1 = ${2 * b + 1}$` : ''}.` });
      steps.push({ tex: `\\begin{gathered} ${sumFrom(1, b)} ${powerTex(k)} = ${product} \\\\ = ${powerSum(k, b)} \\end{gathered}` });
    } else {
      steps.push({
        text: `Every $n$ becomes $${m(0)}$, so $n + 1$ becomes $${m(1)}$${k === 2 ? ` and $2n + 1$ becomes $2(${m(0)}) + 1 = ${m(1, 2)}$` : ''}.`,
      });
      // The sixth's three factors do not fit one phone line, so the last two go below.
      const shown = k === 2 ? `\\frac{1}{6}(${m(0)}) \\\\ \\times (${m(1)})(${m(1, 2)})` : product;
      steps.push({ tex: `\\begin{gathered} ${sumFrom(1, m(0))} ${powerTex(k)} \\\\ = ${shown} \\end{gathered}` });
    }
    return steps;
  },
};

interface PowerSumParams {
  k: Power;
  n: number;
  /** Shown written out, 1^2 + 2^2 + … + n^2, rather than in sigma form. */
  written: boolean;
}

/** Σr, Σr² or Σr³ up to a number, typed. */
const powerSumAsk: Generator<PowerSumParams> = {
  id: 'seq-power-sum',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const k = hard ? rng.pick<Power>([2, 3]) : rng.pick<Power>([1, 2]);
    const n = k === 1 ? rng.int(10, 40) : k === 2 ? (hard ? rng.int(10, 20) : rng.int(5, 12)) : rng.int(4, 12);
    return { k, n, written: rng.chance(0.5) };
  },
  choices: ({ k, n }) => numberOptions(powerSum(k, n), [resultSlip(k, n), powerSum(k, n - 1), powerSum(k, n + 1)]),
  render: ({ k, n, written }): Slide =>
    typed(
      [
        { kind: 'prose', text: written ? 'Use a standard result to add these up.' : 'Use a standard result to find this sum.' },
        { kind: 'display', tex: written ? powersWritten(k, n) : `${sumFrom(1, n)} ${powerTex(k)}` },
      ],
      '\\text{sum} =',
      powerSum(k, n),
    ),
  solution: ({ k, n, written }) => [
    ...(written ? [{ text: `This is $${sumFrom(1, n)} ${powerTex(k)}$.` }] : []),
    { text: `Use $${sumFrom(1, 'n')} ${powerTex(k)} = ${RESULT_TEX[k]}$ with $n = ${n}$.` },
    { tex: `\\begin{gathered} ${resultAt(k, n)} \\\\ = ${powerSum(k, n)} \\end{gathered}` },
  ],
};

interface PowerTableParams {
  k: Power;
  /** The first n in the table. */
  start: number;
  /** Rows (0 to 4) whose running total is a blank. */
  sumBlanks: number[];
  /** The row whose term is a blank, where there is a term column. */
  termBlank: number;
}

/**
 * n, n^k and the running total S_n in a table. A total is the one above plus
 * the next term; at difficulty 2 the first total is blank too, so it has to
 * come from the standard result.
 */
const powerSumTable: Generator<PowerTableParams> = {
  id: 'seq-power-sum-table',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const k = rng.pick<Power>([2, 3]);
      return { k, start: k === 2 ? rng.int(3, 10) : rng.int(2, 7), sumBlanks: [0, ...positions(rng, 1, 4, 2)], termBlank: rng.int(1, 4) };
    }
    const k = rng.pick<Power>([1, 2]);
    return { k, start: rng.int(1, 8), sumBlanks: positions(rng, 1, 4, k === 1 ? 3 : 2), termBlank: rng.int(1, 4) };
  },
  render: ({ k, start, sumBlanks, termBlank }): Slide => {
    const ns = [0, 1, 2, 3, 4].map((i) => start + i);
    const withTerms = k > 1;
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = ns.map((n, i) => {
      const term = n ** k;
      const total = powerSum(k, n);
      const row: (string | null)[] = [`${n}`];
      if (withTerms) {
        if (i === termBlank) {
          answer.push(term);
          slips.push(k * n, (n + 1) ** k, n ** (k + 1));
        }
        row.push(i === termBlank ? null : `${term}`);
      }
      if (sumBlanks.includes(i)) {
        answer.push(total);
        slips.push(total - term + (n + 1) ** k, total + term, resultSlip(k, n), total - n);
      }
      row.push(sumBlanks.includes(i) ? null : `${total}`);
      return row;
    });
    const where = `$S_n = ${sumFrom(1, 'n')} ${powerTex(k)}$`;
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: sumBlanks.includes(0)
            ? `Fill in the table, where ${where}. The first total needs the standard result; each one after is the one above plus the next term.`
            : `Fill in the table, where ${where}: each total is the one above plus the next term.`,
        },
      ],
      columns: withTerms ? ['n', `n^${k}`, 'S_n'] : ['n', 'S_n'],
      rows,
      bank: numberBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ k, start, sumBlanks }) => {
    const ns = [0, 1, 2, 3, 4].map((i) => start + i);
    return [
      ...(sumBlanks.includes(0) ? [{ text: `The first total is the standard result at $n = ${start}$:` }, { tex: chain(`S_{${start}} &= ${resultAt(k, start)}`, `&= ${powerSum(k, start)}`) }] : []),
      { text: 'Then add each new term to the total above it.' },
      { tex: chain(...ns.slice(1).map((n) => `S_{${n}} &= ${powerSum(k, n - 1)} + ${n ** k} = ${powerSum(k, n)}`)) },
    ];
  },
};

interface FormulaParams {
  k: Power;
  n: number;
}

/** The standard result at n, as a tree: n × (n + 1) ÷ 2, and so on. */
function formulaParts({ k, n }: FormulaParams): { expr: Expr; division: Expr; at: string } {
  const pair = bin('*', num(n), bin('+', num(n), num(1)));
  if (k === 1) {
    const division = bin('/', pair, num(2));
    return { expr: division, division, at: 'r' };
  }
  if (k === 2) {
    const division = bin('/', bin('*', pair, bin('+', bin('*', num(2), num(n)), num(1))), num(6));
    return { expr: division, division, at: 'r' };
  }
  const division = bin('/', pair, num(2));
  return { expr: pow(division, num(2)), division, at: 'r.b' };
}

/** A standard result with its n filled in, reduced a piece at a time. */
const formulaReduce: Generator<FormulaParams> = {
  id: 'seq-formula-reduce',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const k = rng.pick<Power>([2, 3]);
      return { k, n: k === 2 ? rng.int(4, 20) : rng.int(2, 12) };
    }
    const k = rng.pick<Power>([1, 2]);
    return { k, n: k === 1 ? rng.int(5, 30) : rng.int(3, 12) };
  },
  render: (params): Slide => {
    const { k, n } = params;
    const { expr, division, at } = formulaParts(params);
    const banks = banksFor(expr);
    if (division.kind === 'binary') {
      // The halving or the sixth: the likely slips are forgetting it or taking a third.
      const whole = valueOf(division.left);
      const value = valueOf(division);
      banks[at] = offer(value, whole, whole / 3, whole / 2, value + n, value - n);
    }
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `The standard result $${sumFrom(1, 'n')} ${powerTex(k)} = ${RESULT_TEX[k]}$ at $n = ${n}$ is written out below. Tap the part you would work out next, then choose what it comes to.`,
        },
      ],
      expr,
      banks,
    };
  },
  solution: ({ k, n }) => {
    if (k === 1) return [{ tex: chain(`${n} \\times ${n + 1} &= ${n * (n + 1)}`, `${n * (n + 1)} \\div 2 &= ${powerSum(1, n)}`) }];
    if (k === 2) {
      return [
        { text: 'Brackets first, then multiply along, then divide by 6.' },
        { tex: chain(`${n} \\times ${n + 1} &= ${n * (n + 1)}`, `${n * (n + 1)} \\times ${2 * n + 1} &= ${n * (n + 1) * (2 * n + 1)}`, `${n * (n + 1) * (2 * n + 1)} \\div 6 &= ${powerSum(2, n)}`) },
      ];
    }
    return [
      { text: 'Work out $\\sum r$ inside the bracket first, then square it.' },
      { tex: chain(`${n} \\times ${n + 1} \\div 2 &= ${powerSum(1, n)}`, `${powerSum(1, n)}^2 &= ${powerSum(3, n)}`) },
    ];
  },
};

/* Level 4, lesson 2: sums built from the standard results */

interface SplitTreeParams {
  /** Σ(ar + b), or Σ r(r + b). */
  form: 'linear' | 'product';
  a: number;
  b: number;
  n: number;
}

/** A sum split into standard results, worked as a tree. */
const splitTree: Generator<SplitTreeParams> = {
  id: 'seq-split-tree',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { form: 'product', a: 1, b: rng.pick([-3, -2, 2, 3, 4, 5]), n: rng.int(4, 12) };
    return { form: 'linear', a: rng.int(2, 6), b: rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]), n: rng.int(5, 20) };
  },
  render: ({ form, a, b, n }): Slide => {
    const s1 = powerSum(1, n);
    if (form === 'linear') {
      const answer = [s1, a * s1, b * n, a * s1 + b * n];
      return {
        kind: 'tree',
        prompt: [
          {
            kind: 'prose',
            text: `Split the sum into standard results. Fill the tree: $\\sum r$, then $${a}\\sum r$, then the sum of the $${b}$s, then the total.`,
          },
        ],
        expression: `${sumFrom(1, n)} (${rTex(a, b)})`,
        nodes: [
          { id: 'sum', from: [] },
          { id: 'scaled', from: ['sum'] },
          { id: 'constant', from: [] },
          { id: 'total', from: ['scaled', 'constant'] },
        ],
        bank: numberBank(answer, [b, a * s1 + b, powerSum(1, n - 1), n * (n + 1), a * powerSum(1, n - 1)]),
        answer: answer.map(String),
      };
    }
    const s2 = powerSum(2, n);
    const answer = [s2, s1, b * s1, s2 + b * s1];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Multiply out, $r(r ${signed(b)}) = r^2 ${signed(b)}r$, and split the sum. Fill the tree: $\\sum r^2$, $\\sum r$, then $${b}\\sum r$, then the total.`,
        },
      ],
      expression: `${sumFrom(1, n)} r(r ${signed(b)})`,
      nodes: [
        { id: 'squares', from: [] },
        { id: 'sum', from: [] },
        { id: 'scaled', from: ['sum'] },
        { id: 'total', from: ['squares', 'scaled'] },
      ],
      bank: numberBank(answer, [b * n, s2 + b * n, powerSum(2, n - 1), s2 + b, s1 * s1]),
      answer: answer.map(String),
    };
  },
  solution: ({ form, a, b, n }) => {
    const s1 = powerSum(1, n);
    if (form === 'linear') {
      return [
        { tex: `\\begin{gathered} ${sumFrom(1, n)} (${rTex(a, b)}) \\\\ = ${a}${sumFrom(1, n)} r + ${sumFrom(1, n)} ${br(b)} \\end{gathered}` },
        { text: `$\\sum r = \\frac{1}{2} \\times ${n} \\times ${n + 1} = ${s1}$. Adding $${b}$ once for each of the $${n}$ terms gives $${b} \\times ${n} = ${b * n}$, not $${b}$.` },
        { tex: `${a} \\times ${s1} ${signed(b * n)} = ${a * s1 + b * n}` },
      ];
    }
    const s2 = powerSum(2, n);
    return [
      { tex: `\\begin{gathered} ${sumFrom(1, n)} r(r ${signed(b)}) \\\\ = ${sumFrom(1, n)} r^2 ${signed(b)}${sumFrom(1, n)} r \\end{gathered}` },
      { tex: chain(`\\sum r^2 &= ${resultAt(2, n)}`, `&= ${s2}`, `\\sum r &= ${resultAt(1, n)}`, `&= ${s1}`) },
      { tex: `${s2} ${signed(b)} \\times ${s1} = ${s2 + b * s1}` },
    ];
  },
};

type SplitForm = 'lin' | 'sqConst' | 'sqLin' | 'pq' | 'square';

interface SplitTilesParams {
  form: SplitForm;
  a: number;
  b: number;
}

/** The general term of a split sum, as it sits after the sigma. */
function splitTermTex({ form, a, b }: SplitTilesParams): string {
  if (form === 'lin') return `(${rTex(a, b)})`;
  if (form === 'sqConst') return `(${quadRTex(a, 0, b)})`;
  if (form === 'sqLin') return `(${quadRTex(a, b, 0)})`;
  if (form === 'pq') return `(r ${signed(a)})(r ${signed(b)})`;
  return `(${rTex(a, b)})^2`;
}

/** Coefficients of r^2, r and 1 in the general term, multiplied out. */
function splitCoefficients({ form, a, b }: SplitTilesParams): [number, number, number] {
  if (form === 'lin') return [0, a, b];
  if (form === 'sqConst') return [a, 0, b];
  if (form === 'sqLin') return [a, b, 0];
  if (form === 'pq') return [1, a + b, a * b];
  return [a * a, 2 * a * b, b * b];
}

/**
 * A sum split into multiples of the standard results, placed as tiles. The
 * constant is the slip: added n times over, it is bn, never b.
 */
const splitTiles: Generator<SplitTilesParams> = {
  id: 'seq-split-tiles',
  sample: (rng, difficulty) => {
    const big = [-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9];
    if (difficulty > 1) {
      if (rng.chance(0.5)) return { form: 'square', a: rng.int(2, 3), b: rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]) };
      for (;;) {
        const a = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
        const b = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
        if (Math.abs(a + b) > 1) return { form: 'pq', a, b };
      }
    }
    const form = rng.pick<SplitForm>(['lin', 'sqConst', 'sqLin']);
    return { form, a: rng.int(2, 9), b: rng.pick(big) };
  },
  render: (params): Slide => {
    const { form, a, b } = params;
    const [x2, x1, x0] = splitCoefficients(params);
    const per = (value: number) => `${token(value)}n`;
    let template: string;
    let answer: string[];
    let slips: string[];
    if (form === 'lin') {
      template = '{0}\\sum r {1}';
      answer = [`${a}`, per(b)];
      slips = [token(b), per(-b), `${2 * a}`, per(a + b)];
    } else if (form === 'sqConst') {
      template = '{0}\\sum r^2 {1}';
      answer = [`${a}`, per(b)];
      slips = [token(b), per(-b), `${a * a}`, per(a + b)];
    } else if (form === 'sqLin') {
      template = '{0}\\sum r^2 {1}\\sum r';
      answer = [`${a}`, token(b)];
      slips = [per(b), token(-b), token(a), `${a + b > 0 ? a + b : 2 * a}`];
    } else if (form === 'pq') {
      template = '\\sum r^2 {0}\\sum r {1}';
      answer = [token(x1), per(x0)];
      slips = [token(x0), token(-x1), per(-x0), per(x1)];
    } else {
      template = '{0}\\sum r^2 {1}\\sum r {2}';
      answer = [`${x2}`, token(x1), per(x0)];
      slips = [`${a}`, token(a * b), token(x0), per(b), `${2 * a}`];
    }
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: form === 'pq' || form === 'square' ? 'Multiply out, then split this sum into standard results.' : 'Split this sum into standard results.',
        },
        { kind: 'display', tex: `${sumFrom(1, 'n')} ${splitTermTex(params)}` },
      ],
      template,
      bank: tileBank(answer, slips, 4),
      answer,
    };
  },
  solution: (params) => {
    const [x2, x1, x0] = splitCoefficients(params);
    const expanded = quadRTex(x2, x1, x0);
    const parts = sumTex([
      x2 === 0 ? '0' : `${x2 === 1 ? '' : x2}\\sum r^2`,
      x1 === 0 ? '0' : `${x1 === 1 ? '' : x1 === -1 ? '-' : x1}\\sum r`,
      x0 === 0 ? '0' : `${x0}n`,
    ]);
    return [
      ...(params.form === 'pq' || params.form === 'square' ? [{ tex: `${splitTermTex(params)} = ${expanded}` }] : []),
      { text: 'Each power of $r$ keeps its number in front, and a constant added once for each of the $n$ terms comes to that constant times $n$.' },
      { tex: `\\begin{gathered} ${sumFrom(1, 'n')} (${expanded}) \\\\ = ${parts} \\end{gathered}` },
    ];
  },
};

interface BuiltParams {
  /** Σ(ar + b), Σ r(r + b) or Σ r^2(r + b). */
  form: 'lin' | 'prod' | 'cube';
  a: number;
  b: number;
  n: number;
}

function builtTerm({ form, a, b }: BuiltParams): (r: number) => number {
  if (form === 'lin') return (r) => a * r + b;
  if (form === 'prod') return (r) => r * (r + b);
  return (r) => r * r * (r + b);
}

function builtTex({ form, a, b }: BuiltParams): string {
  if (form === 'lin') return `(${rTex(a, b)})`;
  if (form === 'prod') return `r(r ${signed(b)})`;
  return `r^2(r ${signed(b)})`;
}

/** A sum built from the standard results, typed. */
const builtSum: Generator<BuiltParams> = {
  id: 'seq-built-sum',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      if (rng.chance(0.5)) return { form: 'cube', a: 1, b: rng.pick([-2, -1, 1, 2, 3]), n: rng.int(3, 10) };
      return { form: 'prod', a: 1, b: rng.pick([-3, -2, -1, 1, 2, 3, 4, 5]), n: rng.int(5, 15) };
    }
    return { form: 'lin', a: rng.int(2, 7), b: rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]), n: rng.int(6, 25) };
  },
  choices: (params) => {
    const { form, a, b, n } = params;
    const total = addUp(builtTerm(params), 1, n);
    if (form === 'lin') return numberOptions(total, [a * powerSum(1, n) + b, total - b, a * powerSum(1, n - 1) + b * n]);
    if (form === 'prod') return numberOptions(total, [powerSum(2, n) + b * n, powerSum(2, n) + b, powerSum(2, n) + powerSum(1, n)]);
    return numberOptions(total, [powerSum(3, n) + b * n, powerSum(3, n) + b * powerSum(1, n), powerSum(3, n) + powerSum(2, n)]);
  },
  render: (params): Slide =>
    typed(
      [
        { kind: 'prose', text: 'Use the standard results to find this sum.' },
        { kind: 'display', tex: `${sumFrom(1, params.n)} ${builtTex(params)}` },
      ],
      '\\text{sum} =',
      addUp(builtTerm(params), 1, params.n),
    ),
  solution: (params) => {
    const { form, a, b, n } = params;
    const total = addUp(builtTerm(params), 1, n);
    if (form === 'lin') {
      return [
        { tex: `\\begin{gathered} ${sumFrom(1, n)} (${rTex(a, b)}) \\\\ = ${a}\\sum r ${signed(b)} \\times ${n} \\end{gathered}` },
        { tex: `${a} \\times ${powerSum(1, n)} ${signed(b * n)} = ${total}` },
      ];
    }
    const [hi, lo]: Power[] = form === 'prod' ? [2, 1] : [3, 2];
    return [
      { tex: `${builtTex(params)} = ${form === 'prod' ? `r^2 ${signedTerm(b, 'r')}` : `r^3 ${signedTerm(b, 'r^2')}`}` },
      { tex: chain(`\\sum ${powerTex(hi)} &= ${powerSum(hi, n)}`, `\\sum ${powerTex(lo)} &= ${powerSum(lo, n)}`) },
      { tex: `${powerSum(hi, n)} ${signed(b)} \\times ${powerSum(lo, n)} = ${total}` },
    ];
  },
};

interface FactorParams {
  /** Σ(ar^2 + br) over a sixth, or Σ(ar + b) over a half. */
  quad: boolean;
  a: number;
  b: number;
}

/**
 * A sum written as one expression in n by taking out the common factor:
 * n/2 from Σ(ar + b), or n(n + 1)/6 from Σ(ar^2 + br). Two blanks, the
 * number in front of n and the constant, so the form is what is graded.
 */
const factorTiles: Generator<FactorParams> = {
  id: 'seq-factor-tiles',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      for (;;) {
        const a = rng.int(1, 4);
        const b = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5]);
        if (a + 3 * b !== 0) return { quad: true, a, b };
      }
    }
    return { quad: false, a: rng.pick([3, 5, 7, 9]), b: rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]) };
  },
  render: ({ quad, a, b }): Slide => {
    const keep = (values: number[]) => values.filter((v) => v !== 0);
    const answer = quad ? [`${2 * a}`, token(a + 3 * b)] : [`${a}`, token(a + 2 * b)];
    const slips = quad
      ? [`${a}`, `${3 * a}`, ...keep([a + b, 3 * b, 2 * a + 3 * b]).map(token)]
      : [`${2 * a}`, ...keep([2 * b, a + b, b]).map(token)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Take out the common factor to write this sum as one expression in $n$.' },
        { kind: 'display', tex: `${sumFrom(1, 'n')} (${quad ? quadRTex(a, b, 0) : rTex(a, b)})` },
      ],
      template: quad ? '\\frac16 n(n + 1)({0}n {1})' : '\\frac12 n({0}n {1})',
      bank: tileBank(answer, slips, 4),
      answer,
    };
  },
  solution: ({ quad, a, b }) => {
    if (!quad) {
      return [
        { tex: `\\begin{gathered} ${sumFrom(1, 'n')} (${rTex(a, b)}) \\\\ = ${a} \\times \\frac{1}{2}n(n + 1) ${signedTerm(b, 'n')} \\end{gathered}` },
        { text: `Both parts have a factor $\\frac{1}{2}n$: the second is $\\frac{1}{2}n \\times ${br(2 * b)}$.` },
        { tex: chain(`&= \\frac{1}{2}n\\big(${a}(n + 1) ${signed(2 * b)}\\big)`, `&= \\frac{1}{2}n(${linearTex(a, a + 2 * b)})`) },
      ];
    }
    return [
      { tex: `\\begin{gathered} ${sumFrom(1, 'n')} (${quadRTex(a, b, 0)}) \\\\ = ${a === 1 ? '' : a}\\sum r^2 ${signedTerm(b, `\\sum r`)} \\end{gathered}` },
      { text: `$\\sum r^2 = \\frac{1}{6}n(n + 1)(2n + 1)$ and $\\sum r = \\frac{1}{6}n(n + 1) \\times 3$, so take out $\\frac{1}{6}n(n + 1)$. What is left in the bracket is` },
      { tex: `${a === 1 ? '' : a}(2n + 1) ${signed(3 * b)} = ${linearTex(2 * a, a + 3 * b)}` },
      { text: 'so the sum is' },
      { tex: `\\frac{1}{6}n(n + 1)(${linearTex(2 * a, a + 3 * b)})` },
    ];
  },
};

/* Level 4, lesson 3: sums that do not start at 1 */

interface FromParams {
  k: Power;
  m: number;
  n: number;
}

/** A starting point and an end for a power sum, n kept small enough for r^3. */
function sampleFrom(rng: Rng, hard: boolean): FromParams {
  const k = hard ? rng.pick<Power>([2, 3]) : rng.pick<Power>([1, 2]);
  const m = hard ? rng.int(4, 9) : rng.int(3, 9);
  const top = k === 1 ? 30 : k === 2 ? 16 : 12;
  return { k, m, n: rng.int(Math.min(m + 3, top), top) };
}

/** From m to n is everything up to n, less everything up to m - 1. */
const fromBelow = ({ k, m, n }: FromParams) => powerSum(k, n) - powerSum(k, m - 1);

/**
 * Which total to take away, then what it is: the right total leads to
 * S_{m-1}, the slip to S_m. Both forks then ask for that total's value.
 */
const subtractFlow: Generator<FromParams> = {
  id: 'seq-subtract-flow',
  sample: (rng, difficulty) => sampleFrom(rng, difficulty > 1),
  render: (params): Slide => {
    const { k, m, n } = params;
    const right = `$S_{${m - 1}}$`;
    const wrong = `$S_{${m}}$`;
    const valueStep = (id: string, x: number) => ({
      id,
      ask: `What is $S_{${x}}$?`,
      branches: turned(
        [powerSum(k, x), resultSlip(k, x)].map((value) => ({
          label: `$${value}$`,
          outcome: `So the sum is $S_{${n}} - S_{${x}} = ${powerSum(k, n)} - ${value} = ${powerSum(k, n) - value}$.`,
        })),
        mix(k, x, n),
      ),
    });
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Work this sum out from totals that start at $r = 1$, where $S_x = ${sumFrom(1, 'x')} ${powerTex(k)}$ and $S_{${n}} = ${powerSum(k, n)}$.`,
        },
      ],
      subject: `${sumFrom(m, n)} ${powerTex(k)}`,
      steps: [
        {
          id: 'which',
          ask: `Which total do you take away from $S_{${n}}$?`,
          branches: turned(
            [
              { label: right, to: 'right' },
              { label: wrong, to: 'wrong' },
            ],
            mix(m, n, k),
          ),
        },
        valueStep('right', m - 1),
        valueStep('wrong', m),
      ],
      answer: [right, `$${powerSum(k, m - 1)}$`],
    };
  },
  solution: (params) => {
    const { k, m, n } = params;
    return [
      { text: `$S_{${n}}$ runs from $r = 1$. The terms before $r = ${m}$ are $r = 1$ to $${m - 1}$, so take away $S_{${m - 1}}$, not $S_{${m}}$: that would remove $r = ${m}$ as well.` },
      { tex: chain(`S_{${m - 1}} &= ${resultAt(k, m - 1)}`, `&= ${powerSum(k, m - 1)}`) },
      { tex: `${sumFrom(m, n)} ${powerTex(k)} = ${powerSum(k, n)} - ${powerSum(k, m - 1)} = ${fromBelow(params)}` },
    ];
  },
};

interface FromAskParams extends FromParams {
  /** Harder draws sometimes use a linear term, a r + b. */
  linear: boolean;
  a: number;
  b: number;
}

function fromTerm({ k, linear, a, b }: FromAskParams): (r: number) => number {
  return linear ? (r) => a * r + b : (r) => r ** k;
}

/** A sum from m to n, typed. */
const fromAsk: Generator<FromAskParams> = {
  id: 'seq-from-m',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    if (hard && rng.chance(0.35)) {
      const m = rng.int(5, 12);
      return { k: 1, m, n: rng.int(m + 6, 30), linear: true, a: rng.int(2, 6), b: rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5]) };
    }
    return { ...sampleFrom(rng, hard), linear: false, a: 1, b: 0 };
  },
  choices: (params) => {
    const { m, n } = params;
    const f = fromTerm(params);
    const total = addUp(f, m, n);
    return numberOptions(total, [total - f(m), addUp(f, 1, n), total + f(m - 1)]);
  },
  render: (params): Slide =>
    typed(
      [
        { kind: 'prose', text: 'Find this sum.' },
        { kind: 'display', tex: `${sumFrom(params.m, params.n)} ${params.linear ? `(${rTex(params.a, params.b)})` : powerTex(params.k)}` },
      ],
      '\\text{sum} =',
      addUp(fromTerm(params), params.m, params.n),
    ),
  solution: (params) => {
    const { k, m, n, linear, a, b } = params;
    const f = fromTerm(params);
    const upTo = (x: number) => addUp(f, 1, x);
    return [
      { text: `Everything from $r = 1$ to $${n}$, less everything from $r = 1$ to $${m - 1}$.` },
      linear
        ? { tex: chain(`\\text{to } ${n}: &\\; ${a} \\times ${powerSum(1, n)} ${signed(b)} \\times ${n}`, `&\\; = ${upTo(n)}`, `\\text{to } ${m - 1}: &\\; ${a} \\times ${powerSum(1, m - 1)} ${signed(b)} \\times ${m - 1}`, `&\\; = ${upTo(m - 1)}`) }
        : { tex: chain(`S_{${n}} &= ${resultAt(k, n)}`, `&= ${powerSum(k, n)}`, `S_{${m - 1}} &= ${resultAt(k, m - 1)}`, `&= ${powerSum(k, m - 1)}`) },
      { tex: `${upTo(n)} - ${upTo(m - 1)} = ${upTo(n) - upTo(m - 1)}` },
    ];
  },
};

/** A sum from m to n as a tree: the total to the top, the part to drop, the difference. */
const dropTree: Generator<FromParams> = {
  id: 'seq-drop-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const k = hard ? rng.pick<Power>([2, 3]) : rng.pick<Power>([1, 2]);
    const m = hard ? rng.int(5, 10) : rng.int(2, 8);
    const top = k === 1 ? 30 : k === 2 ? 20 : 12;
    return { k, m, n: rng.int(Math.min(m + 2, top), top) };
  },
  render: (params): Slide => {
    const { k, m, n } = params;
    const answer = [powerSum(k, n), powerSum(k, m - 1), fromBelow(params)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Fill the tree: the sum from $r = 1$ up to the top, the total of the terms that are not wanted, then the difference.',
        },
      ],
      expression: `${sumFrom(m, n)} ${powerTex(k)}`,
      nodes: [
        { id: 'top', from: [] },
        { id: 'drop', from: [] },
        { id: 'sum', from: ['top', 'drop'] },
      ],
      bank: numberBank(answer, [powerSum(k, m), powerSum(k, n) - powerSum(k, m), powerSum(k, n - 1), resultSlip(k, n)]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { k, m, n } = params;
    return [
      { text: `The unwanted terms are $r = 1$ to $${m - 1}$: $r = ${m}$ is part of the sum.` },
      { tex: chain(`S_{${n}} &= ${resultAt(k, n)}`, `&= ${powerSum(k, n)}`, `S_{${m - 1}} &= ${resultAt(k, m - 1)}`, `&= ${powerSum(k, m - 1)}`) },
      { tex: `${sumFrom(m, n)} ${powerTex(k)} = ${powerSum(k, n)} - ${powerSum(k, m - 1)} = ${fromBelow(params)}` },
    ];
  },
};

interface FromSlipParams {
  k: Power;
  /** Numbers, or limits in n: the bottom n + c, the top a n + b. */
  symbolic: boolean;
  m: number;
  n: number;
  a: number;
  b: number;
}

/** Which difference of totals is the sum from m to n? The slip S_n - S_m is always offered. */
const fromSlip: Generator<FromSlipParams> = {
  id: 'seq-from-m-slip',
  sample: (rng, difficulty) => {
    const k = rng.pick<Power>([1, 2, 3]);
    if (difficulty > 1) return { k, symbolic: true, m: rng.int(1, 3), n: 0, a: rng.int(2, 3), b: rng.int(-1, 1) };
    const m = rng.int(2, 12);
    return { k, symbolic: false, m, n: rng.int(m + 5, 30), a: 0, b: 0 };
  },
  render: ({ k, symbolic, m, n, a, b }): Slide => {
    // Bottom and top of the sum, and a total's subscript shifted by `by`.
    const bottom = (by: number) => (symbolic ? topTex(1, m + by) : `${m + by}`);
    const top = (by: number) => (symbolic ? topTex(a, b + by) : `${n + by}`);
    const labels = [
      `S_{${top(0)}} - S_{${bottom(-1)}}`,
      `S_{${top(0)}} - S_{${bottom(0)}}`,
      `S_{${top(-1)}} - S_{${bottom(-1)}}`,
      `S_{${top(1)}} - S_{${bottom(0)}}`,
    ];
    const { options, correctId } = nativeChoice(labels, mix(k, m, n, a, b));
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Here $S_x = ${sumFrom(1, 'x')} ${powerTex(k)}$. Which of these is the sum below?` },
        { kind: 'display', tex: `${sumFrom(bottom(0), top(0))} ${powerTex(k)}` },
      ],
      options,
      correctId,
    };
  },
  solution: ({ k, symbolic, m, n, a, b }) => {
    const bottom = (by: number) => (symbolic ? topTex(1, m + by) : `${m + by}`);
    const top = symbolic ? topTex(a, b) : `${n}`;
    return [
      { text: `$S_{${top}}$ adds every term from $r = 1$ to $r = ${top}$. The terms before the bottom of the sum run from $r = 1$ to $r = ${bottom(-1)}$.` },
      { tex: `${sumFrom(bottom(0), top)} ${powerTex(k)} = S_{${top}} - S_{${bottom(-1)}}` },
      { text: `Taking away $S_{${bottom(0)}}$ would remove the first term, $r = ${bottom(0)}$, as well.` },
    ];
  },
};

/* Level 4, lesson 4: telescoping sums */

/** A fraction p/q, held as a pair so sums of unit fractions stay exact. */
type Frac = [number, number];

function reduced([p, q]: Frac): Frac {
  const g = gcd(p, q) * (q < 0 ? -1 : 1);
  return [p / g, q / g];
}

const plus = ([a, b]: Frac, [c, d]: Frac): Frac => reduced([a * d + c * b, b * d]);
const minus = (x: Frac, [c, d]: Frac): Frac => plus(x, [-c, d]);
const scaled = (k: number, [a, b]: Frac): Frac => reduced([k * a, b]);
const qTex = ([p, q]: Frac) => fracTex(p, q);
const qAnswer = ([p, q]: Frac) => fracAnswer(p, q);

/** 1/d + 1/e + … as one fraction. */
function units(denominators: number[]): Frac {
  return denominators.reduce<Frac>((total, d) => plus(total, [1, d]), [0, 1]);
}

/** d consecutive whole numbers from `from`. */
function run(from: number, count: number): number[] {
  return Array.from({ length: count }, (_, j) => from + j);
}

/** 1/d, with 1/1 written as 1. */
function unitTex(d: number): string {
  return d === 1 ? '1' : `\\frac{1}{${d}}`;
}

/** 1/(n + c) for the letter n. */
function unitN(c: number): string {
  return `\\frac{1}{${c === 0 ? 'n' : `n + ${c}`}}`;
}

/** (r + c)(r + c + g), or r(r + g) when c is 0. */
function pairDen(c: number, g: number): string {
  return c === 0 ? `r(r + ${g})` : `(r + ${c})(r + ${c + g})`;
}

/** 1/(r + c) - 1/(r + c + g): the split, which this level gives rather than asks. */
function splitTex(c: number, g: number): string {
  return `\\frac{1}{${c === 0 ? 'r' : `r + ${c}`}} - \\frac{1}{r + ${c + g}}`;
}

/** Σ from lo to hi of (1/(r + c) - 1/(r + c + g)): the first g fractions, less the last g. */
function telescoped(lo: number, hi: number, c: number, g: number): Frac {
  return minus(units(run(lo + c, g)), units(run(hi + c + 1, g)));
}

/**
 * A bank of fractions for a table or a tree: every answer (repeats kept),
 * then distinct slips, topped up with near misses so at least two remain.
 * Sorted by value, never shuffled.
 */
function fracBank(answer: Frac[], slips: Frac[], most = 4): string[] {
  const value = new Map<string, number>();
  const note = (f: Frac) => {
    const r = reduced(f);
    const tex = qTex(r);
    value.set(tex, r[0] / r[1]);
    return tex;
  };
  const tokens = answer.map(note);
  const extras: string[] = [];
  const offerOne = (f: Frac) => {
    if (f[1] === 0 || f[0] <= 0) return;
    const tex = note(f);
    if (!tokens.includes(tex) && !extras.includes(tex)) extras.push(tex);
  };
  for (const f of slips) if (extras.length < most) offerOne(f);
  const last = reduced(answer[answer.length - 1]);
  for (let step = 1; extras.length < 2; step += 1) offerOne([last[0] + step, last[1]]);
  return [...tokens, ...extras].sort((x, y) => value.get(x)! - value.get(y)!);
}

/** The correct fraction and three wrong ones, for a derived choice. */
function fracOptions(correct: Frac, slips: Frac[]): ChoiceOption[] {
  const right = reduced(correct);
  const out: ChoiceOption[] = [{ tex: qTex(right), answer: qAnswer(right), correct: true }];
  const seen = new Set([qTex(right)]);
  for (const f of [...slips, plus(right, [1, 1]), scaled(2, right)]) {
    if (out.length === 4) break;
    const r = reduced(f);
    if (r[0] <= 0 || seen.has(qTex(r))) continue;
    seen.add(qTex(r));
    out.push({ tex: qTex(r), answer: qAnswer(r) });
  }
  return out;
}

interface TelescopeStepsParams {
  c: number;
  /** The gap in the split: 1/(r + c) - 1/(r + c + g). */
  g: 1 | 2;
  n: number;
}

/** A bracket of what is left: the surviving fractions at the front, less those at the back. */
function leftTex(front: number[], back: number[]): string {
  return `(${front.map(unitTex).join(' + ')} - ${back.map(unitTex).join(' - ')})`;
}

/**
 * A telescoping sum written out, its first three terms and its last, then
 * collapsed a step at a time: each new term cancels the fraction the last
 * one left, until only the ends survive and come to one fraction.
 */
const telescopeSteps: Generator<TelescopeStepsParams> = {
  id: 'seq-telescope-steps',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { c: rng.int(0, 4), g: 2, n: rng.int(6, 12) } : { c: rng.int(0, 4), g: 1, n: rng.int(5, 12) },
  render: ({ c, g, n }): Slide => {
    const term = (r: number) => leftTex([r + c], [r + c + g]);
    const total = telescoped(1, n, c, g);
    const last = stepsBank([qTex(total), qTex(telescoped(1, n - 1, c, g)), qTex(telescoped(1, n + 1, c, g)), qTex(units(run(c + 1, g)))]);
    const lead =
      g === 1
        ? `Each term of $${sumFrom(1, n)} \\frac{1}{${pairDen(c, 1)}}$ splits as $${splitTex(c, 1)}$.`
        : `Each term of $${sumFrom(1, n)} \\frac{2}{${pairDen(c, 2)}}$ splits as $${splitTex(c, 2)}$.`;
    const prompt: Block[] = [
      { kind: 'prose', text: `${lead} The sum is written out below. Tap where terms join, then choose what is left once fractions cancel.` },
    ];
    if (g === 1) {
      const A = c + 1;
      return {
        kind: 'steps',
        prompt,
        start: [term(1), '+', term(2), '+', term(3), '+', '\\dots', '+', term(n)],
        reductions: [
          { span: [0, 3], operator: 1, value: leftTex([A], [c + 3]), bank: stepsBank([leftTex([A], [c + 3]), leftTex([A], [c + 2]), leftTex([c + 2], [c + 3]), `(${unitTex(A)} + ${unitTex(c + 3)})`]) },
          { span: [0, 3], operator: 1, value: leftTex([A], [c + 4]), bank: stepsBank([leftTex([A], [c + 4]), leftTex([A], [c + 3]), leftTex([c + 3], [c + 4]), `(${unitTex(A)} + ${unitTex(c + 4)})`]) },
          { span: [0, 5], operator: 1, value: leftTex([A], [n + c + 1]), bank: stepsBank([leftTex([A], [n + c + 1]), leftTex([A], [n + c]), leftTex([A], [n + c + 2]), leftTex([n + c], [n + c + 1])]) },
          { span: [0, 1], operator: 0, value: qTex(total), bank: last },
        ],
      };
    }
    const front = [c + 1, c + 2];
    return {
      kind: 'steps',
      prompt,
      start: [term(1), '+', term(2), '+', term(3), '+', '\\dots', '+', term(n - 1), '+', term(n)],
      reductions: [
        { span: [0, 3], operator: 1, value: leftTex(front, [c + 3, c + 4]), bank: stepsBank([leftTex(front, [c + 3, c + 4]), leftTex([c + 1], [c + 4]), leftTex(front, [c + 4]), leftTex([c + 1], [c + 3])]) },
        { span: [0, 3], operator: 1, value: leftTex(front, [c + 4, c + 5]), bank: stepsBank([leftTex(front, [c + 4, c + 5]), leftTex(front, [c + 3, c + 5]), leftTex(front, [c + 5]), leftTex([c + 1], [c + 4, c + 5])]) },
        { span: [0, 7], operator: 1, value: leftTex(front, [n + c + 1, n + c + 2]), bank: stepsBank([leftTex(front, [n + c + 1, n + c + 2]), leftTex(front, [n + c, n + c + 1]), leftTex(front, [n + c + 2]), leftTex([c + 1], [n + c + 1, n + c + 2])]) },
        { span: [0, 1], operator: 0, value: qTex(total), bank: last },
      ],
    };
  },
  solution: ({ c, g, n }) => {
    const front = run(c + 1, g);
    const back = run(n + c + 1, g);
    return [
      { text: `Each term takes away a fraction that ${g === 1 ? 'the next term' : 'the term two further on'} adds back, so everything in the middle cancels.` },
      { tex: `\\begin{gathered} ${leftTex([c + 1], [c + 1 + g])} + ${leftTex([c + 2], [c + 2 + g])} \\\\ + \\dots + ${leftTex([n + c], [n + c + g])} \\end{gathered}` },
      { text: `What survives is ${g === 1 ? 'the first fraction and the last' : 'the first two fractions and the last two'}:` },
      { tex: `${leftTex(front, back).slice(1, -1)} = ${qTex(telescoped(1, n, c, g))}` },
    ];
  },
};

interface SurvivorParams {
  g: 1 | 2 | 3;
  /** The bottom of the sum. */
  m: number;
  c: number;
}

/** What survives a telescoping sum to n, placed as two tiles: the front fractions, then the back. */
const telescopeTiles: Generator<SurvivorParams> = {
  id: 'seq-telescope-tiles',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      return rng.chance(0.75) ? { g: 2, m: rng.int(1, 4), c: rng.int(0, 5) } : { g: 3, m: rng.int(1, 2), c: rng.int(0, 3) };
    }
    return { g: 1, m: rng.int(1, 4), c: rng.int(0, 6) };
  },
  render: ({ g, m, c }): Slide => {
    const frontOf = (from: number, count: number) => run(from, count).map(unitTex).join(' + ');
    // The back fractions are all taken away, so they are written that way: one tile, minus signs inside.
    const backOf = (from: number, count: number) => run(from, count).map(unitN).join(' - ');
    const answer = [frontOf(m + c, g), backOf(c + 1, g)];
    const slips = [
      backOf(c, g),
      frontOf(m + c + 1, g),
      ...(m + c > 1 ? [frontOf(m + c - 1, g)] : []),
      backOf(c + 2, g),
      ...(g > 1 ? [frontOf(m + c, g - 1), backOf(c + 1, g - 1)] : [frontOf(m + c, 2)]),
    ];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write out the first few terms and the last few. What is left once the rest cancel?' },
        { kind: 'display', tex: `${sumFrom(m, 'n')} \\left(${splitTex(c, g)}\\right)` },
      ],
      template: '{0} - {1}',
      bank: tileBank(answer, slips, 4),
      answer,
    };
  },
  solution: ({ g, m, c }) => {
    const term = (r: number, shift: number) => `\\left(${unitTex(r)} - ${unitTex(shift)}\\right)`;
    const first = run(m, 2).map((r) => term(r + c, r + c + g));
    return [
      { text: `The first terms, from $r = ${m}$:` },
      { tex: `${first.join(' + ')} + \\dots` },
      { text: `Each fraction taken away comes back ${g === 1 ? 'one term' : `${g} terms`} later, so it cancels. The last ${g === 1 ? 'term' : `${g} terms`} take away fractions nothing adds back.` },
      { tex: `\\begin{gathered} ${sumFrom(m, 'n')} \\left(${splitTex(c, g)}\\right) \\\\ = ${run(m + c, g).map(unitTex).join(' + ')} \\\\ - ${run(c + 1, g).map(unitN).join(' - ')} \\end{gathered}` },
    ];
  },
};

interface PartialTableParams {
  a: number;
  c: number;
  /** The last row's n, far enough down that the rows above cannot be added on to it. */
  far: number;
  /** Rows (1 to 4) whose partial sum is a blank. */
  blanks: number[];
}

/**
 * A telescoping sum's terms and partial sums. The first rows can be added up
 * one by one; the far row can only come from what survives the cancelling.
 */
const telescopeTable: Generator<PartialTableParams> = {
  id: 'seq-telescope-table',
  sample: (rng, difficulty) => {
    const far = rng.pick([9, 10, 11, 14, 15, 19, 20, 24, 29, 30]);
    if (difficulty > 1) return { a: rng.int(1, 6), c: rng.int(1, 3), far, blanks: [1, 2, 3, 4] };
    return { a: rng.int(1, 6), c: 0, far, blanks: [...positions(rng, 1, 3, 2), 4] };
  },
  render: ({ a, c, far, blanks }): Slide => {
    const ns = [1, 2, 3, 4, far];
    const u = (n: number) => scaled(a, [1, (n + c) * (n + c + 1)]);
    const S = (n: number) => scaled(a, telescoped(1, n, c, 1));
    const answer = blanks.map((i) => S(ns[i]));
    const slips = blanks.flatMap((i) => [S(ns[i] + 1), u(ns[i]), scaled(a, [1, ns[i] + c + 1])]);
    const factor = a === 1 ? '' : `${a}`;
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: `Here $u_r = \\frac{${a}}{${pairDen(c, 1)}} = ${factor}\\left(${splitTex(c, 1)}\\right)$. Fill in the partial sums $S_n = u_1 + u_2 + \\dots + u_n$.`,
        },
      ],
      columns: ['n', 'u_n', 'S_n'],
      rows: ns.map((n, i) => [`${n}`, qTex(u(n)), blanks.includes(i) ? null : qTex(S(n))]),
      bank: fracBank(answer, slips),
      answer: answer.map(qTex),
    };
  },
  solution: ({ a, c, far }) => {
    const factor = a === 1 ? '' : `${a}`;
    return [
      { text: 'Everything between the first fraction and the last cancels:' },
      { tex: `S_n = ${factor}\\left(${unitTex(c + 1)} - ${unitN(c + 1)}\\right)` },
      { text: 'Put each $n$ in:' },
      { tex: chain(...[2, 3, 4, far].map((n) => `S_{${n}} &= ${factor}\\left(${unitTex(c + 1)} - \\frac{1}{${n + c + 1}}\\right) = ${qTex(scaled(a, telescoped(1, n, c, 1)))}`)) },
    ];
  },
};

interface TelescopeSumParams {
  g: 1 | 2;
  c: number;
  n: number;
}

/** A finite telescoping sum with its split given, typed as a fraction. */
const telescopeSum: Generator<TelescopeSumParams> = {
  id: 'seq-telescope-sum',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { g: 2, c: rng.int(0, 3), n: rng.int(5, 15) } : { g: 1, c: rng.int(0, 2), n: rng.int(5, 20) },
  choices: ({ g, c, n }) =>
    fracOptions(telescoped(1, n, c, g), [telescoped(1, n - 1, c, g), telescoped(1, n + 1, c, g), units(run(c + 1, g))]),
  render: ({ g, c, n }): Slide =>
    typed(
      [
        { kind: 'prose', text: `Use $\\frac{${g}}{${pairDen(c, g)}} = ${splitTex(c, g)}$ to find this sum.` },
        { kind: 'display', tex: `${sumFrom(1, n)} \\frac{${g}}{${pairDen(c, g)}}` },
      ],
      '\\text{sum} =',
      qAnswer(telescoped(1, n, c, g)),
      FRACTION_KEYS,
    ),
  solution: ({ g, c, n }) => [
    { text: `Written out, each fraction taken away is added back ${g === 1 ? 'by the next term' : 'two terms later'}, so only the ends survive.` },
    { tex: `${leftTex([c + 1], [c + 1 + g])} + \\dots + ${leftTex([n + c], [n + c + g])}` },
    { tex: `\\begin{gathered} ${leftTex(run(c + 1, g), run(n + c + 1, g)).slice(1, -1)} \\\\ = ${qTex(telescoped(1, n, c, g))} \\end{gathered}` },
  ],
};

/* Level 4, lesson 5: to infinity */

type LeftoverForm = 'frac' | 'pair' | 'root' | 'log';

interface LeftoverParams {
  form: LeftoverForm;
  a: number;
  b: number;
}

/** A partial sum the method of differences gives, the part with n in it, and its limit if it has one. */
function leftoverOf({ form, a, b }: LeftoverParams): { sum: string; part: string; limit?: Frac; first?: Frac; offers: string[] } {
  if (form === 'frac') {
    const limit = reduced([a, b]);
    const part = `\\frac{${a}}{n + ${b}}`;
    return { sum: `${qTex(limit)} - ${part}`, part, limit, first: minus(limit, [a, b + 1]), offers: [] };
  }
  if (form === 'pair') {
    const limit = units([b, b + 1]);
    const part = `\\frac{1}{n + ${b}} + \\frac{1}{n + ${b + 1}}`;
    return { sum: `${qTex(limit)} - ${unitN(b)} - ${unitN(b + 1)}`, part, limit, first: minus(limit, units([b + 1, b + 2])), offers: [] };
  }
  if (form === 'root') {
    const part = `\\sqrt{n + ${a * a}}`;
    return { sum: `${part} - ${a}`, part, offers: [`${-a}`, `${a}`] };
  }
  const part = `\\ln(n + ${b})`;
  return b === 1 ? { sum: part, part, offers: ['0', '\\ln 2'] } : { sum: `${part} - \\ln ${b}`, part, offers: [`-\\ln ${b}`, `\\ln ${b}`] };
}

const TENDS_TO_ZERO = 'It tends to $0$';
const GROWS = 'It grows without limit';

/**
 * Does the leftover die? A partial sum from the method of differences, and
 * two forks: what the part with n in it does, then what the sum to infinity
 * is. A root or a logarithm grows, so there is no sum to infinity.
 */
const leftoverFlow: Generator<LeftoverParams> = {
  id: 'seq-leftover-flow',
  sample: (rng, difficulty) => {
    const form = difficulty > 1 ? rng.pick<LeftoverForm>(['frac', 'pair', 'root', 'log']) : rng.pick<LeftoverForm>(['frac', 'frac', 'root', 'log']);
    if (form === 'frac') {
      const b = rng.int(1, 6);
      return { form, a: difficulty > 1 ? rng.int(1, 6) : b * rng.int(1, 4), b };
    }
    if (form === 'root') return { form, a: rng.int(1, 4), b: 0 };
    return { form, a: 1, b: rng.int(1, form === 'pair' ? 5 : 6) };
  },
  render: (params): Slide => {
    const { sum, part, limit, first, offers } = leftoverOf(params);
    const labels = limit ? [qTex(limit), qTex(first!), qTex(plus(limit, minus(limit, first!)))] : offers;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'The method of differences gives this partial sum. Does the series have a sum to infinity?' }],
      subject: `S_n = ${sum}`,
      steps: [
        {
          id: 'fate',
          ask: `As $n \\to \\infty$, what does $${part}$ do?`,
          branches: turned(
            [
              { label: TENDS_TO_ZERO, to: 'value' },
              { label: GROWS, outcome: 'Then $S_n$ grows without limit too, so the series has no sum to infinity.' },
            ],
            mix(sum),
          ),
        },
        {
          id: 'value',
          ask: 'So what is the sum to infinity?',
          branches: turned(
            labels.map((label) => ({ label: `$${label}$`, outcome: `So $S_\\infty = ${label}$.` })),
            mix(sum, part),
          ),
        },
      ],
      answer: limit ? [TENDS_TO_ZERO, `$${qTex(limit)}$`] : [GROWS],
    };
  },
  solution: (params) => {
    const { part, limit } = leftoverOf(params);
    if (limit) {
      return [
        { text: `A fixed number over something that grows without limit tends to $0$, so $${part} \\to 0$.` },
        { tex: `S_\\infty = ${qTex(limit)} - 0 = ${qTex(limit)}` },
      ];
    }
    return [
      { text: `$${part}$ keeps growing as $n$ does, ${params.form === 'root' ? 'slowly, but without limit' : 'very slowly, but without limit'}.` },
      { text: 'So $S_n$ never settles, and the series has no sum to infinity.' },
    ];
  },
};

interface ToInfinityParams {
  g: 1 | 2 | 3;
  a: number;
  p: number;
}

/** The split as it is given: for a gap of 2 or 3 it carries a 1/g in front. */
function givenSplit(p: number, g: number): string {
  return g === 1 ? `\\frac{1}{${pairDen(p, 1)}} = ${splitTex(p, 1)}` : `\\frac{1}{${pairDen(p, g)}} = \\frac{1}{${g}}\\left(${splitTex(p, g)}\\right)`;
}

/** a/g times the fractions that never cancel. */
const toInfinity = ({ g, a, p }: ToInfinityParams): Frac => {
  const survivors = units(run(p + 1, g));
  return reduced([a * survivors[0], g * survivors[1]]);
};

/** A sum to infinity by the method of differences, typed as a fraction. */
const infinitySum: Generator<ToInfinityParams> = {
  id: 'seq-infinity-sum',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { g: rng.pick<1 | 2 | 3>([2, 3]), a: rng.int(1, 6), p: rng.int(0, 3) } : { g: 1, a: rng.int(1, 6), p: rng.int(0, 4) },
  render: (params): Slide =>
    typed(
      [
        { kind: 'prose', text: `Use $${givenSplit(params.p, params.g)}$ to find the sum to infinity.` },
        { kind: 'display', tex: `${sumFrom(1, '\\infty')} \\frac{${params.a}}{${pairDen(params.p, params.g)}}` },
      ],
      'S_\\infty =',
      qAnswer(toInfinity(params)),
      FRACTION_KEYS,
    ),
  solution: (params) => {
    const { g, a, p } = params;
    const survivors = run(p + 1, g);
    return [
      { text: `Up to $n$, only the first ${g === 1 ? 'fraction survives' : `${g} fractions survive`} at the front, and the last ${g === 1 ? 'one' : g} at the back, which ${g === 1 ? 'tends' : 'all tend'} to $0$.` },
      { tex: `S_\\infty = ${qTex([a, g]) === '1' ? '' : qTex([a, g])}\\left(${survivors.map(unitTex).join(' + ')}\\right) = ${qTex(toInfinity(params))}` },
    ];
  },
};

/** The fractions that never cancel, their total, then the sum to infinity, as a tree. */
const survivorTree: Generator<ToInfinityParams> = {
  id: 'seq-survivor-tree',
  sample: (rng, difficulty) =>
    difficulty > 1 ? { g: 3, a: rng.int(1, 6), p: rng.int(0, 4) } : { g: 2, a: rng.int(1, 6), p: rng.int(0, 5) },
  render: (params): Slide => {
    const { g, a, p } = params;
    const survivors = run(p + 1, g);
    const total = units(survivors);
    const leaves = survivors.map((d) => ({ id: `d${d}`, from: [] as string[] }));
    const answer: Frac[] = [...survivors.map((d): Frac => [1, d]), total, toInfinity(params)];
    const factor = qTex([a, g]);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Here $${givenSplit(p, g)}$. Fill the tree: the fractions that never cancel, largest first, then their total, then the sum to infinity.`,
        },
      ],
      expression: `\\begin{gathered} ${sumFrom(1, '\\infty')} \\frac{${a}}{${pairDen(p, g)}} \\\\ = ${factor === '1' ? '' : factor}${sumFrom(1, '\\infty')} \\left(${splitTex(p, g)}\\right) \\end{gathered}`,
      nodes: [...leaves, { id: 'total', from: leaves.map((leaf) => leaf.id) }, { id: 'sum', from: ['total'] }],
      bank: fracBank(answer, [[1, p + g + 1], scaled(a, total), scaled(g, total), units(survivors.slice(1)), [a, p + 1]]),
      answer: answer.map(qTex),
    };
  },
  solution: (params) => {
    const { g, a, p } = params;
    const survivors = run(p + 1, g);
    return [
      { text: `Each fraction taken away comes back $${g}$ terms later, so the front $${g}$ fractions never cancel; the ones at the far end tend to $0$.` },
      { tex: `${survivors.map(unitTex).join(' + ')} = ${qTex(units(survivors))}` },
      { tex: `S_\\infty = ${qTex([a, g])} \\times ${qTex(units(survivors))} = ${qTex(toInfinity(params))}` },
    ];
  },
};

interface SliderLimitParams {
  K: number;
  p: number;
}

/** Partial sums of a telescoping series, drawn as dots: slide to the height they close in on. */
const telescopeSlider: Generator<SliderLimitParams> = {
  id: 'seq-telescope-slider',
  sample: (rng, difficulty) => ({ K: rng.int(3, 12), p: difficulty > 1 ? rng.int(3, 7) : rng.int(0, 3) }),
  render: ({ K, p }): Slide => {
    const a = K * (p + 1);
    const partial = (n: number) => K - a / (n + p + 1);
    // Room above the limit, and never so little that the handle starts on it.
    let max = 5 * Math.ceil((K * 1.3) / 5);
    while (Math.abs(max / 2 - K) < 1) max += 5;
    const window = markerWindow(0, max, 'y');
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The dots are the partial sums $S_1, S_2, S_3, \\dots$ of $${sumFrom(1, '\\infty')} \\frac{${a}}{${pairDen(p, 1)}}$, where $\\frac{${a}}{${pairDen(p, 1)}} = ${a}\\left(${splitTex(p, 1)}\\right)$. Slide to its sum to infinity.`,
        },
      ],
      min: 0,
      max,
      step: 1,
      answer: K,
      readout: 'S_\\infty = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 9,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [],
          marks: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ x: n, y: partial(n) })),
          label: `Partial sums rising towards a height, the first at ${partial(1).toFixed(1)}`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: ({ K, p }) => {
    const a = K * (p + 1);
    return [
      { text: 'Everything cancels except the first fraction and the last:' },
      { tex: `S_n = ${a}\\left(${unitTex(p + 1)} - ${unitN(p + 1)}\\right)` },
      { text: `As $n \\to \\infty$ the last fraction tends to $0$, so $S_\\infty = ${a} \\times ${unitTex(p + 1)} = ${K}$.` },
      ...(p > 2 ? [{ text: 'The dots climb slowly, so reading the picture alone would stop short: the limit comes from the algebra.' }] : []),
    ];
  },
};

/* ---------- Level 5: proof by induction for series ---------- */

/*
 * Level 5 proves what levels 2 and 4 used. Every claim is a sum from r = 1
 * with a closed form (or, in lesson 5, one starting later), or a recurrence
 * with a closed form, and each is proved one way: a base case, an assumption
 * at n = k, and a step. For a sum the step adds the (k + 1)th term,
 * S_{k+1} = S_k + u_{k+1}, and tidies the result into the closed form at
 * n = k + 1; for a recurrence it puts the assumed u_k into the rule.
 *
 * A closed form, or a line of the step, is never typed: the checker compares
 * values, so it would accept any expression equal to the one asked for.
 * Forms go through tiles, steps, order, flow or choice, and only whole numbers
 * are typed. Every number on a slide is whole and under 1000.
 *
 * Nothing here is calculus, so no slide declares `source`. The claims are
 * held to the terms added up, and the recurrences to their rules iterated
 * from the start, in `sequencesSeries.test.ts`.
 */

type IndForm = 'nat' | 'odd' | 'lin' | 'rp' | 'cube' | 'geo';

/**
 * A sum with a closed form: Σ cr, Σ c(2r - 1), Σ(ar + b) with a odd,
 * Σ cr(r + p), Σ cr^3, and Σ e(m - 1)m^{r-1} = e(m^n - 1).
 */
type SeriesClaim =
  | { form: 'nat'; c: number }
  | { form: 'odd'; c: number }
  | { form: 'lin'; a: number; b: number }
  | { form: 'rp'; c: number; p: number }
  | { form: 'cube'; c: number }
  | { form: 'geo'; m: number; e: number };

type PolyClaim = Exclude<SeriesClaim, { form: 'geo' }>;

/** A factor (an + b)^e of a closed form. */
interface IndFactor {
  a: number;
  b: number;
  e: number;
}

/** A closed form that is not geometric: P/Q times its factors. */
interface IndShape {
  P: number;
  Q: number;
  factors: IndFactor[];
}

const IND_LIMIT = 1000;

/** A number bank whose distractors stay under 1000 too. */
const smallBank = (answer: number[], slips: number[]) => numberBank(answer, slips.filter((value) => Math.abs(value) < IND_LIMIT));

/** b for Σ(ar + b), keeping the first term and a + 2b positive. */
const LIN_B: Record<number, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7, 8],
  3: [-1, 1, 2, 3, 4, 5, 6],
  5: [-2, -1, 1, 2, 3, 4, 5],
  7: [-3, -2, -1, 1, 2, 3, 4],
  9: [-4, -3, -2, -1, 1, 2, 3],
};

/** (m, e) for Σ e(m - 1)m^{r-1}: the first term stays under 13. */
const IND_GEO: [number, number][] = [
  [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9],
  [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6],
  [4, 1], [4, 2], [4, 3],
  [5, 1], [5, 2],
];

/**
 * A claim of one of `forms`. `big` widens the ranges: larger a for Σ(ar + b),
 * and c up to 6 with p up to 5 for Σ cr(r + p).
 */
function sampleClaim(rng: Rng, forms: IndForm[], big = false): SeriesClaim {
  const form = rng.pick(forms);
  if (form === 'lin') {
    const a = rng.pick(big ? [5, 7, 9] : [1, 3, 5, 7]);
    return { form, a, b: rng.pick(LIN_B[a]) };
  }
  if (form === 'rp') return { form, c: rng.int(1, big ? 6 : 3), p: rng.int(0, big ? 5 : 2) };
  if (form === 'cube') return { form, c: rng.int(1, 4) };
  if (form === 'geo') {
    const [m, e] = rng.pick(IND_GEO);
    return { form, m, e };
  }
  return { form, c: rng.int(1, 9) };
}

/** Draws until `ok` holds, which is how every value is kept under 1000. */
function drawUntil<T>(draw: () => T, ok: (value: T) => boolean): T {
  for (;;) {
    const value = draw();
    if (ok(value)) return value;
  }
}

/** The rth term. */
function indTerm(s: SeriesClaim, r: number): number {
  switch (s.form) {
    case 'nat':
      return s.c * r;
    case 'odd':
      return s.c * (2 * r - 1);
    case 'lin':
      return s.a * r + s.b;
    case 'rp':
      return s.c * r * (r + s.p);
    case 'cube':
      return s.c * r ** 3;
    case 'geo':
      return s.e * (s.m - 1) * s.m ** (r - 1);
  }
}

/** The closed form at n, which the tests hold to the terms added up. */
function indSum(s: SeriesClaim, n: number): number {
  if (s.form === 'geo') return s.e * (s.m ** n - 1);
  const { P, Q, factors } = indShape(s);
  return (P * factors.reduce((product, { a, b, e }) => product * (a * n + b) ** e, 1)) / Q;
}

function indShape(s: PolyClaim): IndShape {
  const n: IndFactor = { a: 1, b: 0, e: 1 };
  const next: IndFactor = { a: 1, b: 1, e: 1 };
  let raw: IndShape;
  if (s.form === 'nat') raw = { P: s.c, Q: 2, factors: [n, next] };
  else if (s.form === 'odd') raw = { P: s.c, Q: 1, factors: [{ a: 1, b: 0, e: 2 }] };
  else if (s.form === 'lin') raw = { P: 1, Q: 2, factors: [n, { a: s.a, b: s.a + 2 * s.b, e: 1 }] };
  else if (s.form === 'rp') {
    // Σ cr(r + p) = c/6 n(n + 1)(2n + 1 + 3p), and the last bracket halves when p is odd.
    raw =
      s.p % 2 === 0
        ? { P: s.c, Q: 6, factors: [n, next, { a: 2, b: 1 + 3 * s.p, e: 1 }] }
        : { P: s.c, Q: 3, factors: [n, next, { a: 1, b: (1 + 3 * s.p) / 2, e: 1 }] };
  } else raw = { P: s.c, Q: 4, factors: [{ a: 1, b: 0, e: 2 }, { a: 1, b: 1, e: 2 }] };
  const g = gcd(raw.P, raw.Q);
  return { P: raw.P / g, Q: raw.Q / g, factors: raw.factors };
}

/** P/Q in front of a product: nothing, `3`, or `\frac16`, written without braces as tiles need. */
function indCoef({ P, Q }: IndShape): string {
  if (Q === 1) return P === 1 ? '' : `${P}`;
  return P < 10 && Q < 10 ? `\\frac${P}${Q}` : `\\frac{${P}}{${Q}}`;
}

/** A factor at v + shift: `n`, `k^2`, `(k + 1)`, `(2k + 3)`. */
function indFactorTex({ a, b, e }: IndFactor, v: string, shift: number): string {
  const inner = lin(a, a * shift + b, v);
  const body = inner === v ? v : `(${inner})`;
  return e === 1 ? body : `${body}^${e}`;
}

/** A shape written out, each factor at its own shift. */
function shapeTex(shape: IndShape, v: string, shifts: number[]): string {
  const product = shape.factors.map((factor, i) => indFactorTex(factor, v, shifts[i])).join('');
  const coef = indCoef(shape);
  return coef.startsWith('\\frac') && !product.startsWith('(') ? `${coef} ${product}` : `${coef}${product}`;
}

/** The closed form at n = v + shift: `\frac12 n(n + 1)`, `\frac12(k + 1)(k + 2)`, `3(2^{k+1} - 1)`. */
function closedTex(s: SeriesClaim, v: string, shift = 0): string {
  if (s.form === 'geo') {
    const power = shift === 0 ? `${s.m}^${v}` : `${s.m}^{${v}+${shift}}`;
    return s.e === 1 ? `${power} - 1` : `${s.e}(${power} - 1)`;
  }
  const shape = indShape(s);
  return shapeTex(shape, v, shape.factors.map(() => shift));
}

/** The closed form plus a constant, the constant folded into a geometric sum's `- 1`: `2^n + 2`, not `2^n - 1 + 3`. */
function closedPlus(s: SeriesClaim, v: string, t: number, shift = 0): string {
  if (t === 0) return closedTex(s, v, shift);
  if (s.form === 'geo' && s.e === 1) {
    const power = shift === 0 ? `${s.m}^${v}` : `${s.m}^{${v}+${shift}}`;
    return t === 1 ? power : `${power} ${signed(t - 1)}`;
  }
  return `${closedTex(s, v, shift)} ${signed(t)}`;
}

/** A whole multiplier in front of a letter or a bracket: nothing for 1. */
const multTex = (c: number) => (c === 1 ? '' : `${c}`);

/** The first term of a geometric claim, as it sits in front of a power: nothing, or `3 \times `. */
const geoLead = ({ m, e }: { m: number; e: number }) => (e * (m - 1) === 1 ? '' : `${e * (m - 1)} \\times `);

/** The general term after the sigma, in r. */
function indTermR(s: SeriesClaim): string {
  switch (s.form) {
    case 'nat':
      return `${multTex(s.c)}r`;
    case 'odd':
      return `${multTex(s.c)}(2r - 1)`;
    case 'lin':
      return `(${lin(s.a, s.b, 'r')})`;
    case 'rp':
      return s.p === 0 ? `${multTex(s.c)}r^2` : `${multTex(s.c)}r(r + ${s.p})`;
    case 'cube':
      return `${multTex(s.c)}r^3`;
    case 'geo':
      return `${geoLead(s)}${s.m}^{r-1}`;
  }
}

/** The term at r = k + shift, tidied: `u_{k+1}` is shift 1. Safe to write after a plus sign. */
function indTermK(s: SeriesClaim, shift: number): string {
  const at = (extra: number, e = 1) => indFactorTex({ a: 1, b: extra, e }, 'k', shift);
  switch (s.form) {
    case 'nat':
      return `${multTex(s.c)}${at(0)}`;
    case 'odd':
      return `${multTex(s.c)}(${lin(2, 2 * shift - 1)})`;
    case 'lin':
      return `(${lin(s.a, s.a * shift + s.b)})`;
    case 'rp':
      return s.p === 0 ? `${multTex(s.c)}${at(0, 2)}` : `${multTex(s.c)}${at(0)}${at(s.p)}`;
    case 'cube':
      return `${multTex(s.c)}${at(0, 3)}`;
    case 'geo': {
      const power = shift === 1 ? `${s.m}^k` : shift === 0 ? `${s.m}^{k-1}` : `${s.m}^{k+${shift - 1}}`;
      return `${geoLead(s)}${power}`;
    }
  }
}

/** u_{k+1} as first written, r = k + 1 put straight in, where that needs tidying. */
function indRawNext(s: SeriesClaim): string | undefined {
  switch (s.form) {
    case 'odd':
      return `${multTex(s.c)}(2(k + 1) - 1)`;
    case 'lin':
      return `(${multTex(s.a)}(k + 1) ${signed(s.b)})`;
    case 'rp':
      return s.p === 0 ? undefined : `${multTex(s.c)}(k + 1)(k + 1 + ${s.p})`;
    case 'geo':
      return `${geoLead(s)}${s.m}^{(k+1)-1}`;
    default:
      return undefined;
  }
}

function indMul(p: number[], q: number[]): number[] {
  const out: number[] = Array(p.length + q.length - 1).fill(0);
  p.forEach((x, i) => q.forEach((y, j) => (out[i + j] += x * y)));
  return out;
}

function indAdd(p: number[], q: number[]): number[] {
  const size = Math.max(p.length, q.length);
  const pad = (x: number[]) => [...Array(size - x.length).fill(0), ...x];
  const [x, y] = [pad(p), pad(q)];
  return x.map((value, i) => value + y[i]);
}

/** Factors at k + shift multiplied out, highest power first. */
function indExpand(factors: IndFactor[], shift: number): number[] {
  let out = [1];
  for (const { a, b, e } of factors) for (let i = 0; i < e; i += 1) out = indMul(out, [a, a * shift + b]);
  return out;
}

/** The common factor the step takes out: `(k + 1)`, or `(k + 1)^2` for cubes. */
const commonTex = (s: SeriesClaim) => (s.form === 'cube' ? '(k + 1)^2' : '(k + 1)');

/**
 * What is left in the bracket once the common factor is out of S_k + u_{k+1},
 * multiplied out: for Σr^2 it is 2k^2 + 7k + 6. Only for sums whose closed
 * form carries n + 1.
 */
function indInner(s: PolyClaim): number[] {
  return indExpand(indShape(s).factors.slice(1), 1);
}

/**
 * The line between S_k + u_{k+1} and the closed form at k + 1, where there is
 * one: the common factor taken out, the whole thing multiplied out, or the
 * powers of m gathered. Σ cr goes straight to its answer.
 */
function indMiddle(s: SeriesClaim): string | undefined {
  if (s.form === 'geo') return s.e === 1 ? `${s.m} \\times ${s.m}^k - 1` : `${s.e}(${s.m} \\times ${s.m}^k - 1)`;
  if (s.form === 'nat') return undefined;
  const shape = indShape(s);
  const coef = indCoef(shape);
  if (s.form === 'rp' || s.form === 'cube') return `${coef}${commonTex(s)}(${kPoly(indInner(s))})`;
  const all = kPoly(indExpand(shape.factors, 1));
  return coef === '' ? all : `${coef}(${all})`;
}

/** `\sum_{r=1}^{top} u_r`. */
const upTo = (s: SeriesClaim, top: number | string) => `${sumFrom(1, top)} ${indTermR(s)}`;

/** The claim, `\sum_{r=1}^{n} u_r = F(n)`. */
const claimTex = (s: SeriesClaim) => `${upTo(s, 'n')} = ${closedTex(s, 'n')}`;

/** The right side at n = 1, worked: `\frac16 \times 1 \times 2 \times 3 = 1`. */
function indRightAtOne(s: SeriesClaim): string {
  const value = indSum(s, 1);
  if (s.form === 'geo') return s.e === 1 ? `${s.m} - 1 = ${value}` : `${s.e}(${s.m} - 1) = ${value}`;
  const shape = indShape(s);
  const parts = shape.factors.map(({ a, b, e }) => (e === 1 ? `${a + b}` : `${a + b}^${e}`));
  return `${[indCoef(shape), ...parts].filter(Boolean).join(' \\times ')} = ${value}`;
}

/** A form in k with its value, for comparing a slip with the right answer. */
interface KForm {
  tex: string;
  at: (k: number) => number;
}

/** Forms that differ from `right` at some k from 1 to 6, first of each spelling kept. */
function wrongOnly(right: (k: number) => number, forms: KForm[]): KForm[] {
  const seen = new Set<string>();
  return forms.filter((form) => {
    if (seen.has(form.tex)) return false;
    seen.add(form.tex);
    return [1, 2, 3, 4, 5, 6].some((k) => Math.abs(form.at(k) - right(k)) > 1e-9);
  });
}

/**
 * Where the step might wrongly think it has to arrive: the closed form at
 * k + 1 with each bracket's constant raised by 1 instead of by its slope,
 * with only the first n moved on, one place too far, or the sum up to k
 * plus 1 or plus u_k.
 */
function targetSlips(s: SeriesClaim): KForm[] {
  const sumTo = (k: number) => indSum(s, k);
  const plain: KForm[] = [
    { tex: `${closedTex(s, 'k')} + 1`, at: (k) => sumTo(k) + 1 },
    { tex: closedTex(s, 'k', 2), at: (k) => sumTo(k + 2) },
    { tex: `${closedTex(s, 'k')} + ${indTermK(s, 0)}`, at: (k) => sumTo(k) + indTerm(s, k) },
  ];
  if (s.form === 'geo') {
    plain.push({ tex: s.e === 1 ? `${s.m}^{k+1}` : `${s.e} \\times ${s.m}^{k+1}`, at: (k) => s.e * s.m ** (k + 1) });
    return wrongOnly((k) => sumTo(k + 1), plain);
  }
  const shape = indShape(s);
  const valueOfShape = (factors: IndFactor[], shifts: number[], k: number) =>
    (shape.P * factors.reduce((product, { a, b, e }, i) => product * (a * (k + shifts[i]) + b) ** e, 1)) / shape.Q;
  // Each bracket's constant raised by 1: (2n + 1) becomes (2k + 2), not (2k + 3).
  const raised = shape.factors.map(({ a, b, e }) => ({ a, b: b + 1 - a, e }));
  const first = shape.factors.map((_, i) => (i === 0 ? 1 : 0));
  return wrongOnly(
    (k) => sumTo(k + 1),
    [
      { tex: shapeTex({ ...shape, factors: raised }, 'k', raised.map(() => 1)), at: (k) => valueOfShape(raised, raised.map(() => 1), k) },
      { tex: shapeTex(shape, 'k', first), at: (k) => valueOfShape(shape.factors, first, k) },
      ...plain,
    ],
  );
}

type RootClaim = Extract<SeriesClaim, { form: 'nat' | 'rp' | 'cube' }>;

/**
 * S_k = coef (k + 1)^E rest(k), and u_{k+1} = coef (k + 1)^E added(k): what
 * each part leaves once the common factor is out. The bracket is their sum.
 */
function innerParts(s: RootClaim): { rest: number[]; added: number[]; perTerm: number[]; perTermK: number[] } {
  const shape = indShape(s);
  const rest = indExpand(shape.factors.filter((_, i) => i !== 1), 0);
  // u_{k+1} over (k + 1)^E, and u_k's matching part, before the fraction is taken out.
  const perTerm = s.form === 'nat' ? [s.c] : s.form === 'rp' ? [s.c, s.c * (1 + s.p)] : [s.c, s.c];
  const perTermK = s.form === 'nat' ? [s.c] : s.form === 'rp' ? [s.c, s.c * s.p] : [s.c, 0];
  return { rest, added: perTerm.map((x) => (x * shape.Q) / shape.P), perTerm, perTermK };
}

/** The forms in the bracket once the common factor is out, the right one first, then the slips. */
function innerForms(s: RootClaim): number[][] {
  const shape = indShape(s);
  const { rest, perTerm, perTermK } = innerParts(s);
  const over = (poly: number[]) => poly.map((x) => (x * shape.Q) / shape.P);
  return [
    indInner(s),
    // u_{k+1} not multiplied up to match the fraction, or multiplied by the wrong number.
    indAdd(rest, perTerm),
    indAdd(rest, perTerm.map((x) => x * shape.Q)),
    // Part of u_k in place of u_{k+1}.
    indAdd(rest, over(perTermK)),
    // S_{k+1}'s rest in place of S_k's.
    indAdd(indExpand(shape.factors.filter((_, i) => i !== 1), 1), over(perTerm)),
  ];
}

/** The inner forms as distinct TeX, the right one first, dropping any that are not whole or match it. */
function innerTex(s: RootClaim): string[] {
  const [right, ...slips] = innerForms(s);
  const same = (p: number[], q: number[]) => p.length === q.length && p.every((x, i) => x === q[i]);
  const kept = slips.filter((poly) => poly.every(Number.isInteger) && !same(poly, right));
  return [...new Set([right, ...kept].map((poly) => kPoly(poly)))];
}

/** A proof of a sum's closed form, for the order widget. `hard` adds the middle line. */
function seriesProof(s: SeriesClaim, hard: boolean): Proof {
  const next = indTermK(s, 1);
  const middle = hard ? indMiddle(s) : undefined;
  const middleLine = () => {
    if (s.form === 'geo') return `That is $${middle}$.`;
    if (s.form === 'rp' || s.form === 'cube') return `Taking out $${commonTex(s)}$, that is $${middle}$.`;
    return `Multiplying out, that is $${middle}$.`;
  };
  const pool: Distractor[] = [
    {
      text: `Assume $${upTo(s, 'k+1')} = ${closedTex(s, 'k', 1)}$ for some whole number $k \\ge 1$.`,
      why: 'That assumes what the step has to show.',
    },
    {
      text: `Then $${upTo(s, 'k+1')} = ${closedTex(s, 'k')} + ${indTermK(s, 0)}$.`,
      why: `The term added at $n = k + 1$ is $${next}$, not $u_k$ again.`,
    },
    {
      text: `Then $${upTo(s, 'k+1')} = ${closedTex(s, 'k', 1)} + ${next}$.`,
      why: `The sum up to $k$ is $${closedTex(s, 'k')}$; $${closedTex(s, 'k', 1)}$ is where the step is heading.`,
    },
    { text: 'It also holds at $n = 2$ and at $n = 3$, so it holds for every $n$.', why: 'Checking more values is not a proof.' },
  ];
  return {
    claim: `Prove by induction that $${claimTex(s)}$ for every whole number $n \\ge 1$.`,
    steps: [
      `Base case: at $n = 1$ the left side is $u_1 = ${indTerm(s, 1)}$, and the right side is $${indRightAtOne(s)}$.`,
      `Assume $${upTo(s, 'k')} = ${closedTex(s, 'k')}$ for some whole number $k \\ge 1$.`,
      `Then $${upTo(s, 'k+1')} = ${closedTex(s, 'k')} + ${next}$.`,
      ...(middle ? [middleLine()] : []),
      `${middle ? 'And that' : 'That'} is $${closedTex(s, 'k', 1)}$, the right side at $n = k + 1$.`,
      'It holds at $n = 1$, and whenever it holds at $n = k$ it holds at $n = k + 1$: so it holds for every $n \\ge 1$.',
    ],
    pool,
  };
}

interface SeriesOrderParams {
  s: SeriesClaim;
  hard: boolean;
  picks: number[];
}

/** A proof-ordering generator over the claims of `easy` forms at difficulty 1 and `hard` at 2. */
function seriesOrder(id: string, easy: IndForm[], hard: IndForm[]): Generator<SeriesOrderParams> {
  return {
    id,
    sample: (rng, difficulty) => {
      const isHard = difficulty > 1;
      const s = sampleClaim(rng, isHard ? hard : easy, isHard);
      return { s, hard: isHard, picks: pickDistractors(rng, seriesProof(s, isHard), difficulty) };
    },
    render: ({ s, hard, picks }) => orderSlide(seriesProof(s, hard), picks),
    solution: ({ s, hard, picks }) => orderSolution(seriesProof(s, hard), picks),
  };
}

/** The step's working in the solution: the sum up to k + 1, split, then each line after. */
function stepWorking(s: SeriesClaim): SolutionStep[] {
  const middle = indMiddle(s);
  return [
    { tex: `\\begin{gathered} ${upTo(s, 'k+1')} \\\\ = ${closedTex(s, 'k')} \\\\ + ${indTermK(s, 1)} \\end{gathered}` },
    ...(middle ? [{ tex: `= ${middle}` }] : []),
    { tex: `= ${closedTex(s, 'k', 1)}` },
  ];
}

/* Level 5, lesson 1: the step for a series */

interface ClaimParams {
  s: SeriesClaim;
}

/**
 * The step's first line: the sum up to k + 1 is the assumed sum up to k plus
 * the (k + 1)th term. Two tiles, in either order, since they are added.
 */
const addedTerm: Generator<ClaimParams> = {
  id: 'seq-ind-added-term',
  sample: (rng, difficulty) => ({ s: sampleClaim(rng, difficulty > 1 ? ['rp', 'cube', 'geo'] : ['nat', 'odd', 'lin'], difficulty > 1) }),
  render: ({ s }): Slide => {
    const answer = [closedTex(s, 'k'), indTermK(s, 1)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The claim is $${claimTex(s)}$. The step assumes it at $n = k$. Then the sum up to $k + 1$ is the sum up to $k$ plus one more term: place both.`,
        },
        { kind: 'display', tex: upTo(s, 'k+1') },
      ],
      template: '= {0} + {1}',
      bank: tileBank(answer, [closedTex(s, 'k', 1), indTermK(s, 0), indTermK(s, 2)], 3),
      answer,
      unordered: true,
    };
  },
  solution: ({ s }) => [
    { text: `The assumption gives the sum up to $k$: $${closedTex(s, 'k')}$.` },
    { text: `The term added is $u_{k+1}$: put $r = k + 1$ into $${indTermR(s)}$ to get $${indTermK(s, 1)}$.` },
    { tex: `\\begin{gathered} ${upTo(s, 'k+1')} \\\\ = ${closedTex(s, 'k')} \\\\ + ${indTermK(s, 1)} \\end{gathered}` },
    { text: `$${closedTex(s, 'k', 1)}$ is where the step has to arrive, so it cannot be used on the way there.` },
  ],
};

interface StepCheckParams {
  s: SeriesClaim;
  k: number;
}

/** The step in numbers at one k: the closed form at k, the next term, and their total. */
const stepCheck: Generator<StepCheckParams> = {
  id: 'seq-ind-step-check',
  sample: (rng, difficulty) =>
    drawUntil(
      () =>
        difficulty > 1
          ? { s: sampleClaim(rng, ['rp', 'cube', 'geo'], true), k: rng.int(2, 6) }
          : { s: sampleClaim(rng, ['nat', 'odd', 'lin']), k: rng.int(3, 10) },
      ({ s, k }) => indSum(s, k + 2) < IND_LIMIT,
    ),
  render: ({ s, k }): Slide => {
    const answer = [indSum(s, k), indTerm(s, k + 1), indSum(s, k + 1)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The claim is $${claimTex(s)}$. Its step says the sum up to $k + 1$ is the sum up to $k$ plus the next term. Check that at $k = ${k}$: the formula at $n = ${k}$, the term $u_{${k + 1}}$, then their total.`,
        },
      ],
      // Three factors a side run past a phone's width on one line.
      expression:
        s.form === 'rp'
          ? `\\begin{aligned} &${closedTex(s, 'k')} \\\\ &+ ${indTermK(s, 1)} \\end{aligned}`
          : `${closedTex(s, 'k')} + ${indTermK(s, 1)}`,
      nodes: [
        { id: 'sum', from: [] },
        { id: 'term', from: [] },
        { id: 'total', from: ['sum', 'term'] },
      ],
      bank: smallBank(answer, [indTerm(s, k), indTerm(s, k + 2), indSum(s, k - 1), indSum(s, k) + indTerm(s, k)]),
      answer: answer.map(String),
    };
  },
  solution: ({ s, k }) => [
    { text: `At $k = ${k}$ the formula gives $${indSum(s, k)}$, the sum of the first $${k}$ terms.` },
    { text: `The next term is $u_{${k + 1}} = ${indTerm(s, k + 1)}$.` },
    { tex: `${indSum(s, k)} + ${indTerm(s, k + 1)} = ${indSum(s, k + 1)}` },
    { text: `And the formula at $n = ${k + 1}$ gives $${indSum(s, k + 1)}$ as well: the step agrees with the claim.` },
  ],
};

interface RunningParams {
  s: SeriesClaim;
  start: number;
  sumBlanks: number[];
  termBlank: number;
}

/**
 * n, u_n and S_n in a table, each total the one above plus the next term: the
 * step, in numbers. At difficulty 2 the first total is blank too, so it has
 * to come from the closed form.
 */
const runningTable: Generator<RunningParams> = {
  id: 'seq-ind-running',
  sample: (rng, difficulty) =>
    drawUntil(
      () =>
        difficulty > 1
          ? { s: sampleClaim(rng, ['rp', 'geo', 'lin'], true), start: rng.int(1, 5), sumBlanks: [0, ...positions(rng, 1, 4, 2)], termBlank: rng.int(1, 4) }
          : { s: sampleClaim(rng, ['nat', 'odd', 'lin']), start: rng.int(1, 7), sumBlanks: positions(rng, 1, 4, 2), termBlank: rng.int(1, 4) },
      ({ s, start }) => indSum(s, start + 5) < IND_LIMIT,
    ),
  render: ({ s, start, sumBlanks, termBlank }): Slide => {
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = [0, 1, 2, 3, 4].map((i) => {
      const n = start + i;
      const term = indTerm(s, n);
      const total = indSum(s, n);
      if (i === termBlank) {
        answer.push(term);
        slips.push(indTerm(s, n + 1), indTerm(s, n - 1));
      }
      if (sumBlanks.includes(i)) {
        answer.push(total);
        slips.push(total + indTerm(s, n + 1) - term, total + term, total - 1);
      }
      return [`${n}`, i === termBlank ? null : `${term}`, sumBlanks.includes(i) ? null : `${total}`];
    });
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: sumBlanks.includes(0)
            ? `Here $S_n = ${upTo(s, 'n')}$, and the claim is $S_n = ${closedTex(s, 'n')}$. Use the claim for the first total; after that each total is the one above plus the next term.`
            : `Here $S_n = ${upTo(s, 'n')}$ and $u_n$ is its $n$th term. Fill in the table: each total is the one above plus the next term.`,
        },
      ],
      columns: ['n', 'u_n', 'S_n'],
      rows,
      bank: smallBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ s, start, sumBlanks }) => {
    const ns = [0, 1, 2, 3, 4].map((i) => start + i);
    return [
      { text: `Each term is $${indTermR(s)}$ with $r = n$.` },
      ...(sumBlanks.includes(0) ? [{ text: `The claim at $n = ${start}$ gives the first total, $S_{${start}} = ${indSum(s, start)}$.` }] : []),
      { text: 'Then each total is the one above plus the next term, $S_{n} = S_{n-1} + u_{n}$:' },
      { tex: chain(...ns.slice(1).map((n) => `S_{${n}} &= ${indSum(s, n - 1)} + ${indTerm(s, n)} = ${indSum(s, n)}`)) },
    ];
  },
};

interface NextSumParams {
  s: SeriesClaim;
  k: number;
  /** One term on, two terms on, or one term back. */
  mode: 'next' | 'two' | 'back';
}

const nextSumTop = ({ k, mode }: NextSumParams) => (mode === 'next' ? k + 1 : mode === 'two' ? k + 2 : k - 1);

/** A sum given at k, and the sum one term on (or two on, or one back) typed. */
const nextSum: Generator<NextSumParams> = {
  id: 'seq-ind-next-sum',
  sample: (rng, difficulty) =>
    drawUntil(
      () =>
        difficulty > 1
          ? { s: sampleClaim(rng, ['rp', 'cube', 'geo', 'lin'], true), k: rng.int(3, 8), mode: rng.pick<NextSumParams['mode']>(['two', 'back']) }
          : { s: sampleClaim(rng, ['nat', 'odd', 'lin']), k: rng.int(4, 15), mode: 'next' as const },
      (params) => indSum(params.s, params.k + 2) < IND_LIMIT,
    ),
  render: (params): Slide => {
    const { s, k, mode } = params;
    const top = nextSumTop(params);
    const how =
      mode === 'next'
        ? 'The sum up to the next position is this one plus one more term.'
        : mode === 'two'
          ? 'Add terms on, one at a time.'
          : 'Going back a place takes a term off.';
    return typed(
      [
        { kind: 'prose', text: `You are given that` },
        { kind: 'display', tex: `${upTo(s, k)} = ${indSum(s, k)}` },
        { kind: 'prose', text: `${how} Find` },
        { kind: 'display', tex: upTo(s, top) },
      ],
      '\\text{sum} =',
      indSum(s, top),
    );
  },
  solution: (params) => {
    const { s, k, mode } = params;
    const top = nextSumTop(params);
    if (mode === 'back') {
      return [
        { text: `The sum up to $${k}$ includes $u_{${k}} = ${indTerm(s, k)}$, and the sum up to $${k - 1}$ does not.` },
        { tex: `${indSum(s, k)} - ${indTerm(s, k)} = ${indSum(s, top)}` },
      ];
    }
    const added = mode === 'next' ? [k + 1] : [k + 1, k + 2];
    return [
      { text: added.map((r) => `$u_{${r}} = ${indTerm(s, r)}$`).join(' and ') + '.' },
      { tex: `${indSum(s, k)} + ${added.map((r) => indTerm(s, r)).join(' + ')} = ${indSum(s, top)}` },
    ];
  },
};

/** Whole-number, odd-number and arithmetic sums proved in full. */
const orderSum = seriesOrder('seq-ind-order-sum', ['nat', 'odd', 'lin'], ['nat', 'odd', 'lin']);

/* Level 5, lesson 2: the standard results */

/** Where the step has to arrive, picked from the slips a substitution invites. */
const stepTarget: Generator<ClaimParams> = {
  id: 'seq-ind-target',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { s: sampleClaim(rng, ['rp', 'rp', 'cube'], true) };
    return { s: rng.chance(0.3) ? sampleClaim(rng, ['nat']) : { form: 'rp', c: rng.int(1, 6), p: rng.int(0, 2) } };
  },
  render: ({ s }): Slide => {
    const labels = [closedTex(s, 'k', 1), ...targetSlips(s).slice(0, 3).map((form) => form.tex)];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `To prove $${claimTex(s)}$ by induction, the step assumes it at $n = k$. What must the sum up to $k + 1$ come to?`,
        },
      ],
      ...nativeChoice(labels, mix(claimTex(s))),
    };
  },
  solution: ({ s }) => [
    { text: 'It is the right side with every $n$ replaced by $k + 1$:' },
    { tex: closedTex(s, 'k', 1) },
    ...(s.form === 'rp' || s.form === 'nat'
      ? [{ text: 'So $n + 1$ becomes $k + 2$, not $k + 1 + 1$ left untidied or $k + 1$ again.' }]
      : [{ text: 'So $n^2$ becomes $(k + 1)^2$ and $(n + 1)^2$ becomes $(k + 2)^2$.' }]),
  ],
};

/**
 * The step's S_k + u_{k+1} with its common factor taken out: (k + 1), or
 * (k + 1)^2 for cubes. One blank, the bracket that is left, multiplied out.
 */
const factorOut: Generator<ClaimParams> = {
  id: 'seq-ind-factor-out',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { s: rng.chance(0.8) ? { form: 'rp', c: rng.int(1, 6), p: rng.int(0, 5) } : sampleClaim(rng, ['cube']) };
    return { s: rng.chance(0.35) ? sampleClaim(rng, ['nat']) : { form: 'rp', c: rng.int(1, 6), p: rng.int(0, 2) } };
  },
  render: ({ s }): Slide => {
    const claim = s as RootClaim;
    const [right, ...slips] = innerTex(claim);
    const coef = indCoef(indShape(claim));
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `In the step for $${claimTex(s)}$, the sum up to $k + 1$ has reached the line below. Both parts have a factor $${commonTex(s)}$: take it out.`,
        },
        {
          kind: 'display',
          // Three factors a side run past a phone's width on one line.
          tex:
            s.form === 'rp'
              ? `\\begin{aligned} &${closedTex(s, 'k')} \\\\ &+ ${indTermK(s, 1)} \\end{aligned}`
              : `${closedTex(s, 'k')} + ${indTermK(s, 1)}`,
        },
      ],
      template: `${coef}${commonTex(s)}({0})`,
      bank: tileBank([right], slips, 4),
      answer: [right],
    };
  },
  solution: ({ s }) => {
    const claim = s as RootClaim;
    const coef = indCoef(indShape(claim));
    const { rest, added } = innerParts(claim);
    return [
      {
        text: `Take out $${coef}${commonTex(s)}$ from both parts. The first leaves $${kPoly(rest)}$; the second leaves $${kPoly(added)}$, since $${coef === '' ? '' : `${coef} \\times `}${commonTex(s)}${kPoly(added).includes(' ') ? `(${kPoly(added)})` : kPoly(added)} = ${indTermK(s, 1)}$.`,
      },
      { tex: `${coef}${commonTex(s)}(${kPoly(indInner(claim))})` },
      { text: `That bracket factorises, which is how the step reaches $${closedTex(s, 'k', 1)}$.` },
    ];
  },
};

type Reduction = Extract<Slide, { kind: 'steps' }>['reductions'][number];

/** The tidying of u_{k+1}, where the step starts from it as first written. */
function tidyReduction(s: SeriesClaim): Reduction | undefined {
  if (indRawNext(s) === undefined) return undefined;
  const right = indTermK(s, 1);
  return { span: [2, 3], value: right, bank: stepsBank([right, indTermK(s, 0), indTermK(s, 2)]) };
}

interface StepLineParams {
  s: SeriesClaim;
  hard: boolean;
}

/** The start of the step's line: S_k plus u_{k+1}, as first written when `hard` and there is tidying to do. */
function stepStart({ s, hard }: StepLineParams): string[] {
  return [closedTex(s, 'k'), '+', (hard ? indRawNext(s) : undefined) ?? indTermK(s, 1)];
}

/**
 * The step for a standard result, a line at a time: tidy u_{k+1} (harder
 * draws), take out (k + 1), then factorise what is left into the closed
 * form at k + 1.
 */
const standardStep: Generator<StepLineParams> = {
  id: 'seq-ind-standard-step',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { s: rng.chance(0.85) ? { form: 'rp', c: rng.int(1, 6), p: rng.int(1, 5) } : sampleClaim(rng, ['cube']), hard: true };
    return { s: rng.chance(0.3) ? sampleClaim(rng, ['nat', 'cube']) : { form: 'rp', c: rng.int(1, 6), p: rng.int(0, 2) }, hard: false };
  },
  render: (params): Slide => {
    const { s, hard } = params;
    const claim = s as RootClaim;
    const coef = indCoef(indShape(claim));
    const final = closedTex(s, 'k', 1);
    const finalBank = stepsBank([final, ...targetSlips(s).slice(0, 3).map((form) => form.tex)]);
    const tidy = hard ? tidyReduction(s) : undefined;
    const reductions: Reduction[] = tidy ? [tidy] : [];
    if (s.form === 'nat') {
      reductions.push({ span: [0, 3], operator: 1, value: final, bank: finalBank });
    } else {
      const inner = innerTex(claim).slice(0, 4).map((poly) => `${coef}${commonTex(s)}(${poly})`);
      reductions.push({ span: [0, 3], operator: 1, value: inner[0], bank: stepsBank(inner) });
      reductions.push({ span: [0, 1], value: final, bank: finalBank });
    }
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `The claim is $${claimTex(s)}$. In the step, the sum up to $k + 1$ is the assumed sum plus the next term, below. Work it into the right side at $n = k + 1$: tap the part to work on next, then choose what it becomes.`,
        },
      ],
      start: stepStart(params),
      reductions,
    };
  },
  solution: ({ s, hard }) => [
    ...(hard && indRawNext(s) ? [{ text: `First tidy the new term: $${indRawNext(s)} = ${indTermK(s, 1)}$.` }] : []),
    { text: s.form === 'nat' ? 'Take out the common factor $(k + 1)$:' : `Take out the common factor $${commonTex(s)}$, then factorise what is left:` },
    ...stepWorking(s),
  ],
};

/** The standard results proved in full. */
const orderStandard = seriesOrder('seq-ind-order-standard', ['nat', 'rp', 'cube'], ['rp', 'cube']);

/* Level 5, lesson 3: arithmetic and geometric sums */

/**
 * The last line of the step for an arithmetic or a geometric sum: the
 * multiplied-out line put back into the closed form at k + 1. One blank.
 */
const seriesClose: Generator<ClaimParams> = {
  id: 'seq-ind-ap-close',
  sample: (rng, difficulty) => ({ s: difficulty > 1 ? sampleClaim(rng, ['geo', 'geo', 'lin'], true) : sampleClaim(rng, ['lin']) }),
  render: ({ s }): Slide => {
    let template: string;
    let answer: string;
    let slips: string[];
    if (s.form === 'geo') {
      template = s.e === 1 ? '{0} - 1' : `${s.e}({0} - 1)`;
      answer = `${s.m}^{k+1}`;
      slips = [`${s.m}^k`, `${s.m}^{k+2}`, `${s.m}^{2k}`, `${s.m * s.m}^k`, `${s.m + 1}^k`];
    } else {
      const { a, b } = s as Extract<SeriesClaim, { form: 'lin' }>;
      const c = a + 2 * b;
      template = '\\frac12(k + 1)({0})';
      answer = lin(a, a + c);
      slips = [lin(a, c), lin(a, a + c + 1), lin(a, 2 * a + c), lin(a + 1, c), lin(a, a + c - 1)];
    }
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The claim is $${claimTex(s)}$. In the step, the sum up to $k + 1$ has come to the line below. Write it as the right side at $n = k + 1$.`,
        },
        { kind: 'display', tex: indMiddle(s)! },
      ],
      template,
      bank: tileBank([answer], slips, 4),
      answer: [answer],
    };
  },
  solution: ({ s }) => [
    ...(s.form === 'geo'
      ? [{ text: `Multiplying by $${s.m}$ raises the power by one: $${s.m} \\times ${s.m}^k = ${s.m}^{k+1}$.` }]
      : [{ text: 'The claim at $n = k + 1$ has a factor $(k + 1)$, so the bracket must factorise with it.' }]),
    { tex: `\\begin{aligned} &${indMiddle(s)} \\\\ &= ${closedTex(s, 'k', 1)} \\end{aligned}` },
    { text: 'That is the right side of the claim with $k + 1$ in place of $n$.' },
  ],
};

/** Middle and final slips for an arithmetic or geometric step, each wrong at some k. */
function seriesStepSlips(s: SeriesClaim): { middle: KForm[]; final: KForm[] } {
  const right = (k: number) => indSum(s, k + 1);
  if (s.form === 'geo') {
    const { m, e } = s;
    const E = (inside: string) => (e === 1 ? inside : `${e}(${inside})`);
    const middle = wrongOnly(right, [
      { tex: E(`${m + 1} \\times ${m}^k - 1`), at: (k) => e * ((m + 1) * m ** k - 1) },
      { tex: E(`${m} \\times ${m}^k - ${m}`), at: (k) => e * (m ** (k + 1) - m) },
      { tex: E(`${m}^{2k} - 1`), at: (k) => e * (m ** (2 * k) - 1) },
    ]);
    const final = wrongOnly(right, [
      { tex: E(`${m}^{k+2} - 1`), at: (k) => e * (m ** (k + 2) - 1) },
      { tex: E(`${m}^{2k} - 1`), at: (k) => e * (m ** (2 * k) - 1) },
      { tex: E(`${m}^{k+1} - ${m}`), at: (k) => e * (m ** (k + 1) - m) },
    ]);
    return { middle, final };
  }
  const { a, b } = s as Extract<SeriesClaim, { form: 'lin' }>;
  const c = a + 2 * b;
  const half = (poly: number[]) => `\\frac12(${kPoly(poly)})`;
  const middle = wrongOnly(right, [
    // u_{k+1} not doubled, then u_k in place of u_{k+1}, then a slip in the constant.
    { tex: half([a, a + c, a + b]), at: (k) => (a * k * k + (a + c) * k + a + b) / 2 },
    { tex: half([a, 2 * a + c, 2 * b]), at: (k) => (a * k * k + (2 * a + c) * k + 2 * b) / 2 },
    { tex: half([a, 2 * a + c, a + c + 2]), at: (k) => (a * k * k + (2 * a + c) * k + a + c + 2) / 2 },
  ]);
  const final = wrongOnly(right, [
    { tex: `\\frac12(k + 1)(${lin(a, c)})`, at: (k) => ((k + 1) * (a * k + c)) / 2 },
    { tex: `\\frac12 k(${lin(a, a + c)})`, at: (k) => (k * (a * k + a + c)) / 2 },
    { tex: `\\frac12(k + 1)(${lin(a, a + c + 2)})`, at: (k) => ((k + 1) * (a * k + a + c + 2)) / 2 },
  ]);
  return { middle, final };
}

/**
 * The step for an arithmetic or a geometric sum, a line at a time: tidy the
 * new term (harder draws), combine, then write it as the closed form at k + 1.
 */
const seriesStep: Generator<StepLineParams> = {
  id: 'seq-ind-series-step',
  sample: (rng, difficulty) => ({ s: difficulty > 1 ? sampleClaim(rng, ['geo', 'lin'], true) : sampleClaim(rng, ['lin']), hard: difficulty > 1 }),
  render: (params): Slide => {
    const { s, hard } = params;
    const middle = indMiddle(s)!;
    const final = closedTex(s, 'k', 1);
    const slips = seriesStepSlips(s);
    const tidy = hard ? tidyReduction(s) : undefined;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `The claim is $${claimTex(s)}$. In the step, the sum up to $k + 1$ is the assumed sum plus the next term, below. Work it into the right side at $n = k + 1$: tap the part to work on next, then choose what it becomes.`,
        },
      ],
      start: stepStart(params),
      reductions: [
        ...(tidy ? [tidy] : []),
        { span: [0, 3], operator: 1, value: middle, bank: stepsBank([middle, ...slips.middle.map((form) => form.tex)]) },
        { span: [0, 1], value: final, bank: stepsBank([final, ...slips.final.map((form) => form.tex)]) },
      ],
    };
  },
  solution: ({ s, hard }) => [
    ...(hard && indRawNext(s) ? [{ text: `First tidy the new term: $${indRawNext(s)} = ${indTermK(s, 1)}$.` }] : []),
    {
      text:
        s.form === 'geo'
          ? `$${s.e === 1 ? '' : `${s.e} \\times `}${s.m}^k$ and $${indTermK(s, 1)}$ together make $${s.m}$ lots of ${s.e === 1 ? `$${s.m}^k$` : `$${s.e} \\times ${s.m}^k$`}:`
          : 'Put both over $2$ and multiply out, then factorise:',
    },
    ...stepWorking(s),
  ],
};

interface NextFlowParams {
  s: SeriesClaim;
}

/** Which term the step adds, then what the sum comes to: a slip at either fork is its own branch. */
const nextFlow: Generator<NextFlowParams> = {
  id: 'seq-ind-next-flow',
  sample: (rng, difficulty) => ({ s: difficulty > 1 ? sampleClaim(rng, ['geo', 'geo', 'lin'], true) : sampleClaim(rng, ['lin']) }),
  render: ({ s }): Slide => {
    const next = `$${indTermK(s, 1)}$`;
    const again = `$${indTermK(s, 0)}$`;
    const final = `$${closedTex(s, 'k', 1)}$`;
    const slips = seriesStepSlips(s).final;
    const wrong = slips.find((form) => Number.isInteger(form.at(1)) && form.at(1) !== indSum(s, 2)) ?? slips[0];
    const slip = `$${wrong.tex}$`;
    const salt = mix(claimTex(s));
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Assume the claim holds at $n = k$, and follow the step to $n = k + 1$.' }],
      subject: claimTex(s),
      steps: [
        {
          id: 'which',
          ask: 'Which term is added to the sum up to $k$?',
          branches: turned(
            [
              { label: next, to: 'total' },
              {
                label: again,
                outcome: `That is $u_k$, already in the sum up to $k$. The term added is $u_{k+1}$, from $r = k + 1$: $${indTermK(s, 1)}$.`,
              },
            ],
            salt,
          ),
        },
        {
          id: 'total',
          ask: `Added to $${closedTex(s, 'k')}$, what does it come to?`,
          branches: turned(
            [
              { label: final, outcome: 'That is the right side at $n = k + 1$, so the step works.' },
              {
                label: slip,
                outcome: `That is not it: at $k = 1$ it gives $${wrong.at(1)}$, but the sum up to $2$ is $${indSum(s, 2)}$.`,
              },
            ],
            salt + 1,
          ),
        },
      ],
      answer: [next, final],
    };
  },
  solution: ({ s }) => [
    { text: `The term added is $u_{k+1}$: $r = k + 1$ in $${indTermR(s)}$ gives $${indTermK(s, 1)}$.` },
    ...stepWorking(s),
    { text: 'That is the claim at $n = k + 1$.' },
  ],
};

/** Arithmetic and geometric sums proved in full. */
const orderSeries = seriesOrder('seq-ind-order-series', ['lin', 'geo'], ['lin', 'geo']);

interface ClaimValueParams {
  s: SeriesClaim;
  n: number;
}

/** The proved closed form at a number, as a reduce tree. */
function claimValueExpr({ s, n }: ClaimValueParams): Expr {
  if (s.form === 'geo') {
    const inside = bin('-', pow(num(s.m), num(n)), num(1));
    return s.e === 1 ? inside : bin('*', num(s.e), inside);
  }
  const { a, b } = s as Extract<SeriesClaim, { form: 'lin' }>;
  const scaled = a === 1 ? num(n) : bin('*', num(a), num(n));
  return bin('/', bin('*', num(n), bin('+', scaled, num(a + 2 * b))), num(2));
}

/** `banksFor`, with every distractor kept under 1000 as the values are. */
function smallBanksFor(expr: Expr, path = 'r', out: Record<string, string[]> = {}): Record<string, string[]> {
  if (expr.kind === 'num') return out;
  const value = valueOf(expr);
  const small = (...values: number[]) => values.filter((v) => Math.abs(v) < IND_LIMIT);
  if (expr.kind === 'binary') {
    const l = valueOf(expr.left);
    const r = valueOf(expr.right);
    const slips = expr.op === '*' ? [l + r, value + l, value - r] : expr.op === '+' ? [l - r, l * r, value + 1] : [l + r, r - l, value - 1];
    out[path] = offer(value, ...small(...slips));
    smallBanksFor(expr.left, `${path}.l`, out);
    smallBanksFor(expr.right, `${path}.r`, out);
  } else if (expr.kind === 'power') {
    const b = valueOf(expr.base);
    const e = valueOf(expr.exponent);
    out[path] = offer(value, ...small(b * e, e ** b, b ** (e + 1)));
    smallBanksFor(expr.base, `${path}.b`, out);
    smallBanksFor(expr.exponent, `${path}.e`, out);
  }
  return out;
}

/** Using the proved formula: the sum of the first n terms, worked out a piece at a time. */
const claimValue: Generator<ClaimValueParams> = {
  id: 'seq-ind-claim-value',
  sample: (rng, difficulty) =>
    drawUntil(
      () => (difficulty > 1 ? { s: sampleClaim(rng, ['geo', 'geo', 'lin'], true), n: rng.int(3, 8) } : { s: sampleClaim(rng, ['lin']), n: rng.int(4, 12) }),
      ({ s, n }) => 2 * indSum(s, n) < IND_LIMIT && (s.form !== 'geo' || s.e * s.m ** n < IND_LIMIT),
    ),
  render: (params): Slide => {
    const expr = claimValueExpr(params);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `It has been proved that $${claimTex(params.s)}$. So the sum of the first $${params.n}$ terms is the right side at $n = ${params.n}$, written out below. Tap the part you would work out next, then choose what it comes to.`,
        },
      ],
      expr,
      banks: smallBanksFor(expr),
    };
  },
  solution: ({ s, n }) => {
    if (s.form === 'geo') {
      return [
        { tex: `${s.m}^${n} = ${s.m ** n}` },
        { tex: s.e === 1 ? `${s.m ** n} - 1 = ${indSum(s, n)}` : `${s.e}(${s.m ** n} - 1) = ${s.e} \\times ${s.m ** n - 1} = ${indSum(s, n)}` },
      ];
    }
    const { a, b } = s as Extract<SeriesClaim, { form: 'lin' }>;
    const c = a + 2 * b;
    return [
      { text: 'The bracket first, then multiply by $n$ and halve.' },
      { tex: chain(`${a === 1 ? '' : `${a} \\times `}${n} + ${c} &= ${a * n + c}`, `${n} \\times ${a * n + c} &= ${n * (a * n + c)}`, `${n * (a * n + c)} \\div 2 &= ${indSum(s, n)}`) },
    ];
  },
};

/* Level 5, lesson 4: a recurrence's closed form */

/** u_{n+1} = p u_n + q with closed form u_n = c p^n + d, so q = d(1 - p) and u_1 = cp + d. */
interface Rec {
  p: number;
  c: number;
  d: number;
}

const recQ = ({ p, d }: Rec) => d * (1 - p);
const recAt = ({ p, c, d }: Rec, n: number) => c * p ** n + d;

/** The rule and its start, `u_{n+1} = 2u_n + 1`, `u_1 = 1`. */
const indRuleTex = (r: Rec) => `u_{n+1} = ${r.p}u_n ${signed(recQ(r))}`;
const recStartTex = (r: Rec) => `u_1 = ${recAt(r, 1)}`;

/** The closed form at v + shift: `3 \times 2^n + 1`, `2^{k+1} - 1`. */
function recClosed({ p, c, d }: Rec, v: string, shift = 0): string {
  const power = shift === 0 ? `${p}^${v}` : `${p}^{${v}+${shift}}`;
  return `${c === 1 ? '' : `${c} \\times `}${power} ${signed(d)}`;
}

const RECS_D = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];

/**
 * A recurrence whose terms up to `rows` stay under 1000 and start positive.
 * Easier draws keep p to 2 or 3 and c to 1 or 2 (`plain` forces c = 1).
 */
function sampleRec(rng: Rng, hard: boolean, rows: number, plain = false): Rec {
  return drawUntil(
    () => ({
      p: rng.pick(hard ? [2, 3, 4, 5] : [2, 3]),
      c: plain ? 1 : rng.int(1, hard ? 4 : 2),
      d: rng.pick(RECS_D),
    }),
    (r) => recAt(r, 1) >= 1 && recAt(r, rows) < IND_LIMIT,
  );
}

/** Where the claim sits: `u_n = … for u_{n+1} = …, u_1 = …`, in prose. */
const recClaimProse = (r: Rec) => `$u_n = ${recClosed(r, 'n')}$ for the sequence $${indRuleTex(r)}$, $${recStartTex(r)}$`;

/** A proof of a recurrence's closed form, for the order widget. */
function recProof(r: Rec, hard: boolean): Proof {
  const { p, c, d } = r;
  const q = recQ(r);
  const cTimes = c === 1 ? '' : `${c} \\times `;
  return {
    claim: `Prove by induction that $u_n = ${recClosed(r, 'n')}$ for every $n \\ge 1$, where $${indRuleTex(r)}$ and $${recStartTex(r)}$.`,
    steps: [
      `Base case: the sequence starts at $u_1 = ${recAt(r, 1)}$, and the formula gives $${cTimes}${p}^1 ${signed(d)} = ${recAt(r, 1)}$.`,
      `Assume $u_k = ${recClosed(r, 'k')}$ for some whole number $k \\ge 1$.`,
      `Then $u_{k+1} = ${p}u_k ${signed(q)} = ${p}(${recClosed(r, 'k')}) ${signed(q)}$.`,
      ...(hard ? [`That is $${cTimes}${p}^{k+1} ${signed(p * d)} ${signed(q)}$.`] : []),
      `${hard ? 'And that' : 'That'} is $${recClosed(r, 'k', 1)}$, the formula at $n = k + 1$.`,
      'It holds at $n = 1$, and whenever it holds at $n = k$ it holds at $n = k + 1$: so it holds for every $n \\ge 1$.',
    ],
    pool: [
      { text: `Assume $u_{k+1} = ${recClosed(r, 'k', 1)}$ for some whole number $k \\ge 1$.`, why: 'That assumes what the step has to show.' },
      { text: `Then $u_{k+1} = ${p}(${recClosed(r, 'k')})$.`, why: `After multiplying by $${p}$, the rule has $${signed(q)}$ too.` },
      {
        text: `Then $u_{k+1} = ${p}(${recClosed(r, 'k', 1)}) ${signed(q)}$.`,
        why: `The assumption is about $u_k$, which is $${recClosed(r, 'k')}$; putting in the formula at $k + 1$ assumes the answer.`,
      },
      {
        text: `It also works for $u_2 = ${recAt(r, 2)}$ and $u_3 = ${recAt(r, 3)}$, so it holds for every $n$.`,
        why: 'Checking more values is not a proof.',
      },
    ],
  };
}

interface IndRecTableParams {
  r: Rec;
  rows: number;
  blanks: number[];
}

/**
 * The claim tested against the rule: u_n found from the one above, beside
 * the formula's value, blanks in the same rows of both columns.
 */
const indRecTable: Generator<IndRecTableParams> = {
  id: 'seq-ind-rec-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const r = drawUntil(() => sampleRec(rng, hard, 4), (rec) => !hard || rec.p > 2 || rec.c > 1);
    const rows = recAt(r, 5) < IND_LIMIT ? 5 : 4;
    return { r, rows, blanks: positions(rng, 1, rows - 1, hard ? 3 : 2) };
  },
  render: ({ r, rows, blanks }): Slide => {
    const answer: number[] = [];
    const slips: number[] = [];
    const cells = Array.from({ length: rows }, (_, i) => {
      const n = i + 1;
      const value = recAt(r, n);
      if (!blanks.includes(i)) return [`${n}`, `${value}`, `${value}`];
      answer.push(value, value);
      slips.push(r.p * recAt(r, n - 1) - recQ(r), r.c * r.p ** (n - 1) + r.d, recAt(r, n + 1), value + r.d);
      return [`${n}`, null, null];
    });
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: `Test the claim ${recClaimProse(r)}. Fill in each $u_n$ from the one above it using the rule, and what the formula gives beside it.`,
        },
      ],
      columns: ['n', 'u_n', recClosed(r, 'n')],
      rows: cells,
      bank: smallBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: ({ r, rows }) => [
    { text: `From the rule, each term is $${r.p}$ times the one before ${recQ(r) < 0 ? 'less' : 'plus'} $${Math.abs(recQ(r))}$:` },
    {
      tex: chain(...Array.from({ length: rows - 1 }, (_, i) => `u_{${i + 2}} &= ${r.p} \\times ${br(recAt(r, i + 1))} ${signed(recQ(r))} = ${recAt(r, i + 2)}`)),
    },
    { text: `The formula gives the same values, ${Array.from({ length: rows }, (_, i) => `$${recAt(r, i + 1)}$`).join(', ')}: the claim fits every row, which is evidence but not yet a proof.` },
  ],
};

/**
 * The step for a recurrence, a line at a time: put the assumed u_k in
 * (harder draws), multiply out, then gather the constants into the formula
 * at k + 1.
 */
const recStep: Generator<{ r: Rec; hard: boolean }> = {
  id: 'seq-ind-rec-step',
  sample: (rng, difficulty) => ({ r: sampleRec(rng, difficulty > 1, 1), hard: difficulty > 1 }),
  render: ({ r, hard }): Slide => {
    const { p, c, d } = r;
    const q = recQ(r);
    const cTimes = c === 1 ? '' : `${c} \\times `;
    const closedK = `(${recClosed(r, 'k')})`;
    const tail = [q < 0 ? '-' : '+', `${Math.abs(q)}`];
    const multiplied = (constant: number, power = `${p}^{k+1}`) => `(${cTimes}${power} ${signed(constant)})`;
    const gathered = (constant: number) => `${cTimes}${p}^{k+1} ${signed(constant)}`;
    const reductions: Reduction[] = [];
    if (hard) {
      reductions.push({
        span: [2, 3],
        value: closedK,
        bank: stepsBank([closedK, `(${recClosed(r, 'k', 1)})`, `(${cTimes}${p}^{k-1} ${signed(d)})`]),
      });
    }
    reductions.push({
      span: [0, 3],
      operator: 1,
      value: multiplied(p * d),
      bank: stepsBank([multiplied(p * d), multiplied(d), multiplied(p * d, `${p}^{2k}`), multiplied(p * d, `${p}^k`)]),
    });
    // Slips on the constants: p d left alone, q alone, the sign of q turned, or one out.
    const slipConstants = [...new Set([p * d, q, p * d - q, d + 1])].filter((value) => value !== 0 && value !== d);
    reductions.push({ span: [0, 3], operator: 1, value: gathered(d), bank: stepsBank([d, ...slipConstants.slice(0, 3)].map(gathered)) });
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `The claim is ${recClaimProse(r)}. Assume $u_k = ${recClosed(r, 'k')}$. The rule gives $u_{k+1}$ as below: work it into the formula at $n = k + 1$. Tap the part to work on next, then choose what it becomes.`,
        },
      ],
      start: [`${p}`, '\\times', hard ? 'u_k' : closedK, ...tail],
      reductions,
    };
  },
  solution: ({ r }) => {
    const { p, c, d } = r;
    const q = recQ(r);
    const cTimes = c === 1 ? '' : `${c} \\times `;
    return [
      { text: `Put the assumed $u_k$ into the rule, and multiply out: $${p} \\times ${p}^k = ${p}^{k+1}$.` },
      { tex: `\\begin{gathered} u_{k+1} = ${p}(${recClosed(r, 'k')}) ${signed(q)} \\\\ = ${cTimes}${p}^{k+1} ${signed(p * d)} ${signed(q)} \\\\ = ${recClosed(r, 'k', 1)} \\end{gathered}` },
      { text: `The constants come back to $${d}$ because $${d}$ is the value the rule leaves alone: $${p} \\times ${br(d)} ${signed(q)} = ${d}$.` },
    ];
  },
};

interface RecClosedParams {
  r: Rec;
}

/**
 * A recurrence's closed form found from its first terms and placed as tiles:
 * the power of p and the constant d, or at difficulty 2 the multiple c, the
 * base p and d.
 */
const recClosedTiles: Generator<RecClosedParams> = {
  id: 'seq-ind-rec-closed',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { r: drawUntil(() => sampleRec(rng, true, 4), (rec) => rec.c > 1) }
      : { r: sampleRec(rng, true, 4, true) },
  render: ({ r }): Slide => {
    const { p, c, d } = r;
    const multiple = c > 1;
    // A signed tile in a number's place still reads as that number: `+3 \times 4^n`.
    const constantSlips = [token(-d), token(recQ(r)), token(recAt(r, 1))].filter(
      (t) => t !== token(d) && !(multiple && [token(c), token(p)].includes(t)),
    );
    // With c and p^n as two tiles, p^n \times c would be just as right and
    // graded wrong, so at difficulty 2 the tiles are c and the base p.
    const answer = multiple ? [`${c}`, `${p}`, token(d)] : [`${p}^n`, token(d)];
    const slips = multiple
      ? [`${p + 1}`, ...(p > 2 ? [`${p - 1}`] : []), ...constantSlips, `${c + 1}`, `${c * p}`]
      : [`${p + 1}^n`, ...(p > 2 ? [`${p - 1}^n`] : []), `${p}^{n-1}`, ...constantSlips];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The sequence $${indRuleTex(r)}$, $${recStartTex(r)}$ starts as below. The rule multiplies by $${p}$ each time, so try a closed form ${multiple ? `$c \\times ${p}^n + d$` : `$${p}^n + d$`}. Place it.`,
        },
        { kind: 'display', tex: listTex([1, 2, 3, 4].map((n) => recAt(r, n))) },
      ],
      template: multiple ? 'u_n = {0} \\times {1}^n {2}' : 'u_n = {0} {1}',
      bank: tileBank(answer, slips, multiple ? 5 : 4),
      answer,
    };
  },
  solution: ({ r }) => {
    const { p, c, d } = r;
    return [
      { text: `The constant $d$ is the number the rule leaves alone: $d = ${p}d ${signed(recQ(r))}$ gives $d = ${d}$.` },
      { text: `Then $u_1 = ${recAt(r, 1)}$ needs $${p}c ${signed(d)} = ${recAt(r, 1)}$, so $c = ${c}$.` },
      { tex: `u_n = ${recClosed(r, 'n')}` },
      { text: `Check: $u_2 = ${recAt(r, 2)}$ and $u_3 = ${recAt(r, 3)}$ fit too. Induction is what turns the pattern into a proof.` },
    ];
  },
};

interface RecOrderParams {
  r: Rec;
  hard: boolean;
  picks: number[];
}

/** A recurrence's closed form proved in full. */
const orderRec: Generator<RecOrderParams> = {
  id: 'seq-ind-order-rec',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const r = sampleRec(rng, hard, 3);
    return { r, hard, picks: pickDistractors(rng, recProof(r, hard), difficulty) };
  },
  render: ({ r, hard, picks }) => orderSlide(recProof(r, hard), picks),
  solution: ({ r, hard, picks }) => orderSolution(recProof(r, hard), picks),
};

interface RecTermParams {
  r: Rec;
  n: number;
  /** Find u_n, or find which n gives a value. */
  which: boolean;
}

/** Using a proved closed form: a far term typed, or which term takes a value. */
const recTerm: Generator<RecTermParams> = {
  id: 'seq-ind-rec-term',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => ({ r: sampleRec(rng, false, 1), n: rng.int(hard ? 4 : 5, 9), which: hard }),
      ({ r, n }) => recAt(r, n) < IND_LIMIT,
    );
  },
  render: ({ r, n, which }): Slide =>
    typed(
      [
        { kind: 'prose', text: `It has been proved that ${recClaimProse(r)}.` },
        {
          kind: 'prose',
          text: which ? `Which term of the sequence is $${recAt(r, n)}$?` : `Use the formula to find $u_{${n}}$, rather than running the rule ${n - 1} times.`,
        },
      ],
      which ? 'n =' : `u_{${n}} =`,
      which ? n : recAt(r, n),
    ),
  solution: ({ r, n, which }) => {
    const { p, c, d } = r;
    const cTimes = c === 1 ? '' : `${c} \\times `;
    if (!which) {
      return [
        { text: `Put $n = ${n}$ into the formula:` },
        { tex: `\\begin{gathered} u_{${n}} = ${cTimes}${p}^{${n}} ${signed(d)} \\\\ = ${recAt(r, n)} \\end{gathered}` },
      ];
    }
    return [
      { tex: `${recClosed(r, 'n')} = ${recAt(r, n)}` },
      { tex: `${cTimes}${p}^n = ${recAt(r, n) - d}` },
      ...(c === 1 ? [] : [{ tex: `${p}^n = ${p ** n}` }]),
      { text: `$${p}^{${n}} = ${p ** n}$, so $n = ${n}$.` },
    ];
  },
};

/* Level 5, lesson 5: reading and checking */

/** A claimed formula: the true one, the true one shifted, or a polynomial that fits the first few sums only. */
type Verdict = 'true' | 'shift' | 'fit';

interface TestedParams {
  s: SeriesClaim;
  kind: Verdict;
  shift: number;
}

/**
 * The polynomial in n through the first two sums (for a quadratic sum) or
 * the first three (otherwise), or undefined if its coefficients are not whole.
 */
function fitPoly(s: SeriesClaim): number[] | undefined {
  const [S1, S2, S3] = [1, 2, 3].map((n) => indSum(s, n));
  const quadratic = s.form === 'nat' || s.form === 'odd' || s.form === 'lin';
  if (quadratic) return [S2 - S1, 2 * S1 - S2];
  const d2 = S3 - 2 * S2 + S1;
  const d1 = S2 - S1;
  const poly = [d2 / 2, d1 - (3 * d2) / 2, S1 - d1 + d2];
  return poly.every(Number.isInteger) ? poly : undefined;
}

const polyAt = (poly: number[], n: number) => poly.reduce((total, x) => total * n + x, 0);

/** The claimed right side as a function of n, and in TeX in `v`. */
function claimed({ s, kind, shift }: TestedParams): { at: (n: number) => number; tex: (v: string) => string } {
  if (kind === 'fit') {
    const poly = fitPoly(s)!;
    return { at: (n) => polyAt(poly, n), tex: (v) => kPoly(poly, v) };
  }
  const t = kind === 'shift' ? shift : 0;
  return { at: (n) => indSum(s, n) + t, tex: (v) => closedPlus(s, v, t) };
}

function sampleTested(rng: Rng, hard: boolean): TestedParams {
  return drawUntil(
    () => ({
      s: hard ? sampleClaim(rng, ['rp', 'cube', 'geo'], true) : sampleClaim(rng, ['nat', 'odd', 'lin']),
      kind: rng.pick<Verdict>(['true', 'shift', 'fit']),
      shift: rng.int(1, 5),
    }),
    (params) => (params.kind !== 'fit' || fitPoly(params.s) !== undefined) && indSum(params.s, 5) < IND_LIMIT && claimed(params).at(5) < IND_LIMIT,
  );
}

/** The first n from 1 where the claim and the sum part, or undefined. */
function firstFailure(params: TestedParams): number | undefined {
  const { at } = claimed(params);
  for (let n = 1; n <= 8; n += 1) if (at(n) !== indSum(params.s, n)) return n;
  return undefined;
}

interface TestTableParams extends TestedParams {
  sumBlanks: number[];
  claimBlanks: number[];
}

/**
 * A claim tested against the first five sums: S_n by adding, beside what the
 * claim gives. The claim is true, off by a constant everywhere, or a formula
 * that fits the first two or three sums and then parts from them.
 */
const testTable: Generator<TestTableParams> = {
  id: 'seq-ind-test-table',
  sample: (rng, difficulty) => {
    const params = sampleTested(rng, difficulty > 1);
    const fail = firstFailure(params);
    // Blank the claim where it first fails, so the parting is worked out rather than read.
    const claimBlanks = [...new Set([fail === undefined ? rng.int(2, 4) : fail - 1, rng.int(0, 4)])].sort((x, y) => x - y);
    return { ...params, sumBlanks: positions(rng, 1, 4, difficulty > 1 ? 3 : 2), claimBlanks };
  },
  render: (params): Slide => {
    const { s, sumBlanks, claimBlanks } = params;
    const { at, tex } = claimed(params);
    const answer: number[] = [];
    const slips: number[] = [];
    const rows = [1, 2, 3, 4, 5].map((n, i) => {
      const row: (string | null)[] = [`${n}`];
      if (sumBlanks.includes(i)) {
        answer.push(indSum(s, n));
        slips.push(indSum(s, n) + indTerm(s, n + 1) - indTerm(s, n), indSum(s, n - 1));
      }
      row.push(sumBlanks.includes(i) ? null : `${indSum(s, n)}`);
      if (claimBlanks.includes(i)) {
        answer.push(at(n));
        slips.push(indSum(s, n), at(n + 1));
      }
      row.push(claimBlanks.includes(i) ? null : `${at(n)}`);
      return row;
    });
    return {
      kind: 'table',
      prompt: [
        {
          kind: 'prose',
          text: `Someone claims that $${upTo(s, 'n')} = ${tex('n')}$. Test it: fill in each true total $S_n$ by adding the terms, and what the claim gives beside it.`,
        },
      ],
      columns: ['n', 'S_n', '\\text{claim}'],
      rows,
      bank: smallBank(answer, slips),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { s, kind } = params;
    const fail = firstFailure(params);
    return [
      { text: `The totals are the terms of $${indTermR(s)}$ added up: ${[1, 2, 3, 4, 5].map((n) => `$${indSum(s, n)}$`).join(', ')}.` },
      { text: `The claim gives ${[1, 2, 3, 4, 5].map((n) => `$${claimed(params).at(n)}$`).join(', ')}.` },
      {
        text:
          fail === undefined
            ? 'They agree in every row. That is evidence, not proof: induction is what shows it holds for every $n$.'
            : kind === 'fit'
              ? `They agree at first, then part at $n = ${fail}$: a formula can fit the first few totals and still be wrong.`
              : `They disagree from $n = ${fail}$, so the claim is false.`,
      },
    ];
  },
};


/** u_{k+1} multiplied out in k, for the sums whose terms are polynomials. */
function termPoly(s: SeriesClaim): number[] | undefined {
  switch (s.form) {
    case 'nat':
      return [s.c, s.c];
    case 'odd':
      return [2 * s.c, s.c];
    case 'lin':
      return [s.a, s.a + s.b];
    case 'rp':
      return [s.c, s.c * (2 + s.p), s.c * (1 + s.p)];
    case 'cube':
      return [s.c, 3 * s.c, 3 * s.c, s.c];
    case 'geo':
      return undefined;
  }
}

/** A polynomial in n rewritten at n = k + 1, leading zeros dropped. */
function atNext(poly: number[]): number[] {
  let out = [0];
  for (const x of poly) out = indAdd(indMul(out, [1, 1]), [x]);
  while (out.length > 1 && out[0] === 0) out = out.slice(1);
  return out;
}

/** The claim at n = k + 1, as the learner would write it. */
function claimedNext(params: TestedParams): string {
  if (params.kind === 'fit') return kPoly(atNext(fitPoly(params.s)!));
  return closedPlus(params.s, 'k', params.kind === 'shift' ? params.shift : 0, 1);
}

/**
 * What the step comes to, G(k) + u_{k+1}. A fitted claim's is a polynomial,
 * multiplied out. A true or shifted claim's is the closed form at k + 1, or,
 * when `expanded`, the same multiplied out, so that it has to be compared
 * rather than recognised.
 */
function stepResult(params: TestedParams, expanded: boolean): string {
  const { s, kind, shift } = params;
  if (kind === 'fit') return kPoly(indAdd(fitPoly(s)!, termPoly(s)!));
  const t = kind === 'shift' ? shift : 0;
  if (!expanded || s.form === 'geo') return closedPlus(s, 'k', t, 1);
  const shape = indShape(s);
  const coef = indCoef(shape);
  const all = indExpand(shape.factors, 1);
  if (coef === '' || shape.Q === 1) {
    const whole = indAdd(all.map((x) => x * shape.P), [t]);
    return kPoly(whole);
  }
  return `${coef}(${kPoly(all)})${t === 0 ? '' : ` ${signed(t)}`}`;
}

interface VerdictParams extends TestedParams {
  /** Show the claim at k + 1 too, and the step's result multiplied out, so the check is a comparison. */
  shown: boolean;
}

/**
 * Is a claim proved? The step first: does G(k) + u_{k+1} come to G(k + 1)?
 * Then the base case. A shifted claim passes the step and fails at n = 1; a
 * fitted one fails the step, however well it matched the first totals.
 */
const verdictFlow: Generator<VerdictParams> = {
  id: 'seq-ind-verdict',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    // A fitted geometric claim's step is not a polynomial, so it is not asked here.
    const params = drawUntil(() => sampleTested(rng, hard), (p) => p.kind !== 'fit' || p.s.form !== 'geo');
    return { ...params, shown: !hard };
  },
  render: (params): Slide => {
    const { s, kind, shown } = params;
    const { tex } = claimed(params);
    const next = shown ? ` The claim at $n = k + 1$ is $${claimedNext(params)}$.` : '';
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Assume the claim at $n = k$. Then the sum up to $k + 1$ is $${tex('k')} + ${indTermK(s, 1)}$, which comes to $${stepResult(params, shown)}$.${next}`,
        },
      ],
      subject: `${upTo(s, 'n')} = ${tex('n')}`,
      steps: [
        {
          id: 'step',
          ask: 'Does the step reach the claim at $n = k + 1$?',
          branches: [
            { label: 'Yes', to: 'base' },
            { label: 'No', outcome: 'Then the claim is not proved: a formula whose step fails can match the first few totals and still be wrong.' },
          ],
        },
        {
          id: 'base',
          ask: 'Does it hold at the base case, $n = 1$?',
          branches: [
            { label: 'Yes', outcome: 'Base case and step both hold, so the claim is proved for every $n \\ge 1$.' },
            { label: 'No', outcome: 'Then the claim is false at $n = 1$: the step on its own proves nothing.' },
          ],
        },
      ],
      answer: kind === 'fit' ? ['No'] : kind === 'shift' ? ['Yes', 'No'] : ['Yes', 'Yes'],
    };
  },
  solution: (params) => {
    const { s, kind } = params;
    const { at } = claimed(params);
    if (kind === 'fit') {
      const fail = firstFailure(params)!;
      return [
        { text: `The step gives $${stepResult(params, true)}$, but the claim at $n = k + 1$ is $${claimedNext(params)}$: they differ, so the step fails.` },
        { text: `And the claim really is false: at $n = ${fail}$ the sum is $${indSum(s, fail)}$ but the claim gives $${at(fail)}$.` },
      ];
    }
    return [
      { text: `The step gives $${claimedNext(params)}$, the claim at $n = k + 1$: the step works.` },
      {
        text:
          kind === 'shift'
            ? `But at $n = 1$ the sum is $${indTerm(s, 1)}$ and the claim gives $${at(1)}$. Without a base case the step proves nothing, and this claim is false.`
            : `At $n = 1$ both sides are $${indTerm(s, 1)}$, so the base case holds too: the claim is proved.`,
      },
    ];
  },
};

type Flaw = 'base' | 'assume' | 'term' | 'none';

const FLAWS: Flaw[] = ['base', 'assume', 'term', 'none'];

const FLAW_LABEL: Record<Flaw, string> = {
  base: 'The base case checks the wrong value of n',
  assume: 'The step assumes what it has to prove',
  term: 'The step adds the wrong term',
  none: 'Nothing: the proof is sound',
};

interface FlawParams {
  s: SeriesClaim;
  flaw: Flaw;
}

/** A written proof with at most one flaw: a base case at n = 2, an assumption at k + 1, or u_k added in place of u_{k+1}. */
function flawedLines({ s, flaw }: FlawParams): string[] {
  return [
    flaw === 'base'
      ? `Base case: at $n = 2$ the left side is $u_1 + u_2 = ${indSum(s, 2)}$, and the right side is $${indSum(s, 2)}$ too.`
      : `Base case: at $n = 1$ the left side is $u_1 = ${indTerm(s, 1)}$, and the right side is $${indRightAtOne(s)}$.`,
    flaw === 'assume'
      ? `Assume $${upTo(s, 'k+1')} = ${closedTex(s, 'k', 1)}$ for some whole number $k \\ge 1$.`
      : `Assume $${upTo(s, 'k')} = ${closedTex(s, 'k')}$ for some whole number $k \\ge 1$.`,
    `Then $${upTo(s, 'k+1')} = ${closedTex(s, 'k')} + ${indTermK(s, flaw === 'term' ? 0 : 1)}$, which is $${closedTex(s, 'k', 1)}$.`,
    'So it holds at the start, and whenever it holds at $n = k$ it holds at $n = k + 1$: it holds for every $n \\ge 1$.',
  ];
}

/** A written proof to read: which line, if any, is wrong. */
const flawChoice: Generator<FlawParams> = {
  id: 'seq-ind-flaw',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        s: difficulty > 1 ? sampleClaim(rng, ['rp', 'cube', 'geo'], true) : sampleClaim(rng, ['nat', 'odd', 'lin']),
        flaw: rng.pick(FLAWS),
      }),
      ({ s }) => indSum(s, 2) < IND_LIMIT,
    ),
  render: (params): Slide => {
    const { s, flaw } = params;
    const labels = [FLAW_LABEL[flaw], ...FLAWS.filter((other) => other !== flaw).map((other) => FLAW_LABEL[other])];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Here is a proof by induction that $${claimTex(s)}$ for every $n \\ge 1$.` },
        ...flawedLines(params).map((line, i): Block => ({ kind: 'prose', text: `${i + 1}. ${line}` })),
        { kind: 'prose', text: 'What, if anything, is wrong with it?' },
      ],
      ...nativeChoice(labels, mix(claimTex(s), flaw), false),
    };
  },
  solution: ({ s, flaw }) => {
    if (flaw === 'base') {
      return [
        { text: 'The claim starts at $n = 1$, so that is where the base case must be. Checking $n = 2$ leaves $n = 1$ unproved, and the step only carries a truth forward.' },
        { text: `At $n = 1$: the left side is $${indTerm(s, 1)}$ and the right side is $${indRightAtOne(s)}$.` },
      ];
    }
    if (flaw === 'assume') {
      return [{ text: `Line 2 assumes the claim at $n = k + 1$, which is what the step has to show. It should assume $${upTo(s, 'k')} = ${closedTex(s, 'k')}$.` }];
    }
    if (flaw === 'term') {
      return [
        { text: `Line 3 adds $${indTermK(s, 0)}$, which is $u_k$ and already in the sum up to $k$. The term added is $u_{k+1} = ${indTermK(s, 1)}$.` },
        { text: `And the line is false: at $k = 1$ it gives $${indSum(s, 1) + indTerm(s, 1)}$, but the sum up to $2$ is $${indSum(s, 2)}$.` },
      ];
    }
    return [{ text: 'Every line is right: the base case is at $n = 1$, the step assumes the claim at $n = k$ and adds $u_{k+1}$, and the algebra holds.' }];
  },
};

interface StartParams {
  s: SeriesClaim;
  m: number;
}

/** A sum from r = m, its closed form the one from 1 less the terms before m. */
function startRight({ s, m }: StartParams): string {
  return closedPlus(s, 'n', -indSum(s, m - 1));
}

/** A claim that starts later than n = 1: the base case is there, and the sum there is a single term. */
const startBase: Generator<StartParams> = {
  id: 'seq-ind-start',
  sample: (rng, difficulty) =>
    drawUntil(
      () =>
        difficulty > 1
          ? { s: sampleClaim(rng, ['rp', 'cube', 'geo'], true), m: rng.int(2, 5) }
          : { s: sampleClaim(rng, ['nat', 'odd', 'lin']), m: rng.int(2, 6) },
      ({ s, m }) => indSum(s, m) < IND_LIMIT,
    ),
  render: (params): Slide =>
    typed(
      [
        {
          kind: 'prose',
          text: `Claim: $${sumFrom(params.m, 'n')} ${indTermR(params.s)} = ${startRight(params)}$ for every whole number $n \\ge ${params.m}$.`,
        },
        { kind: 'prose', text: 'The base case goes where the claim starts. There, what do both sides come to?' },
      ],
      '\\text{base case} =',
      indTerm(params.s, params.m),
    ),
  solution: (params) => {
    const { s, m } = params;
    return [
      { text: `The claim starts at $n = ${m}$, so that is the base case, not $n = 1$. The sum from $r = ${m}$ to $${m}$ is the single term $u_{${m}} = ${indTerm(s, m)}$.` },
      { text: `The right side at $n = ${m}$ is $${indSum(s, m)} - ${indSum(s, m - 1)} = ${indTerm(s, m)}$ too.` },
    ];
  },
};

export const sequenceOrders = [orderSum, orderStandard, orderSeries, orderRec];

export const sequenceGenerators = [
  ruleTable,
  ruleKind,
  methodFlow,
  termOf,
  apTree,
  apNthTiles,
  apTerm,
  whichTerm,
  apTable,
  gpTree,
  gpNthTiles,
  gpTable,
  gpTerm,
  diffTable,
  diffSteps,
  classify,
  nextTerm,
  recTable,
  recTiles,
  recTree,
  recFlow,
  sigmaTiles,
  sigmaReduce,
  sigmaCount,
  sigmaTerms,
  apSumTree,
  apSeriesSteps,
  apSumAsk,
  apSumTable,
  gpSumTree,
  gpSeriesSteps,
  gpSumAsk,
  gpFormulaTiles,
  convergeFlow,
  whichConverges,
  sumInfinity,
  partialSlider,
  contextTree,
  contextGp,
  contextFlow,
  firstExceed,
  diffTiles,
  monotoneFlow,
  periodTable,
  periodChoice,
  limitTable,
  fixedPointSteps,
  limitAsk,
  limitBackTree,
  fateFlow,
  fateSlider,
  fateChoice,
  fateTable,
  divideSteps,
  posLimitAsk,
  posConverge,
  powerFlow,
  gapTable,
  gapTree,
  rateFlow,
  gapFirst,
  powerSumTiles,
  powerSumAsk,
  powerSumTable,
  formulaReduce,
  splitTree,
  splitTiles,
  builtSum,
  factorTiles,
  subtractFlow,
  fromAsk,
  dropTree,
  fromSlip,
  telescopeSteps,
  telescopeTiles,
  telescopeTable,
  telescopeSum,
  leftoverFlow,
  infinitySum,
  survivorTree,
  telescopeSlider,
  addedTerm,
  stepCheck,
  runningTable,
  nextSum,
  orderSum,
  stepTarget,
  factorOut,
  standardStep,
  orderStandard,
  seriesClose,
  seriesStep,
  nextFlow,
  orderSeries,
  claimValue,
  indRecTable,
  recStep,
  recClosedTiles,
  orderRec,
  recTerm,
  testTable,
  verdictFlow,
  flawChoice,
  startBase,
];
