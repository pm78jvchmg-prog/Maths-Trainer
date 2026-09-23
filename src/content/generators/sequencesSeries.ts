/**
 * Sequences & Series.
 *
 * Level 1 is sequences: rules that give a term from its position or from the
 * term before, arithmetic and geometric sequences and their nth terms, what
 * the differences between terms say about a sequence, and recurrence
 * relations. Level 2 is series: sigma notation, the arithmetic and geometric
 * sums, the sum to infinity, and series met in words (savings, a bouncing
 * ball, a rising salary).
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
];
