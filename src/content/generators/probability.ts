/**
 * Probability (roadmap C16).
 *
 * Level 1 is outcomes and sample spaces: favourable over total and the scale
 * from 0 to 1, listing the outcomes of two coins, dice and spinners, the
 * complement and "at least one", two-way tables, and relative frequency with
 * the expected number `nP`. Level 2 combines events: the addition rule for
 * mutually exclusive events, the general addition rule read off a Venn
 * diagram, independence and the multiplication rule, two-stage trees, and
 * conditional probability from a table or without replacement. Level 3 draws
 * the diagrams bigger: trees built from words, with a three-way first stage
 * or three stages, and Venn diagrams of two and three sets filled in from
 * totals, working outward from the overlap, then read for probabilities.
 * Level 4 is conditional probability in general: the formula from a two-way
 * table or a table of probabilities, restricting a Venn diagram to one circle
 * or outside it, trees whose second stage depends on the first (drawn with
 * the `probTree` widget where the learner fills or taps branches), testing
 * independence with P(A | B) = P(A), and P(A | B) from a finished tree as one
 * path over the sum of the paths ending in B.
 *
 * Three rules hold everywhere in this file.
 *
 * - Every probability is exact: a fraction in lowest terms through
 *   `fracTex`, or a decimal of at most a few places through `fmt`. A typed
 *   answer is graded by value, so `6/16` is accepted for `3/8`; where the
 *   cancelled form is itself the skill it is asked through `tiles`.
 * - The tree and Venn pictures are static SVG built here, `currentColor`
 *   only, with plain-text labels (`1/6`, `0.3`). The tappable versions are
 *   batch C16-widget. The numbers behind each picture live in the params, so
 *   `probability.test.ts` checks that each stage of a tree sums to 1 and a
 *   Venn diagram's regions to its total.
 * - Nothing here is calculus, so no slide declares `source`, `integrand` or
 *   `limits`. `probability.test.ts` is the independent check instead: it
 *   enumerates each sample space and recounts every answer.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { fmt } from './numericalMethods';
import { fracTex, gcd, stepBank, steered, tokenBank } from './parametricImplicit';

/* ================================================================
 * Shared helpers
 * ================================================================ */

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });
const picture = (svg: string): Block => ({ kind: 'diagram', svg });

/** A probability that may be a fraction: the base keypad has no `/`. */
const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/** A stable number from a question's own parameters, for placing answers. */
const saltOf = (...parts: unknown[]): number => hashSeed(JSON.stringify(parts));

/** A fraction as a pair, never displayed as it stands. */
export type Frac = [number, number];

export function simplest([n, d]: Frac): Frac {
  const g = gcd(n, d);
  return [n / g, d / g];
}

const fv = ([n, d]: Frac): number => n / d;

/** Lowest terms, for the learner. */
const ftex = ([n, d]: Frac): string => fracTex(n, d);

/** As it comes, uncancelled: `\frac{6}{16}`. */
const rawTex = ([n, d]: Frac): string => `\\frac{${n}}{${d}}`;

/** For mathjs: the outer brackets matter (PITFALLS 3.3). */
const fans = ([n, d]: Frac): string => `((${n})/(${d}))`;

/** A fraction as plain text inside an SVG, where there is no KaTeX. */
export function fplain(f: Frac): string {
  const [p, q] = simplest(f);
  return q === 1 ? `${p}` : `${p}/${q}`;
}

const same = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/** Rounded to hundredths, so sums of decimals carry no float dust. */
const hundredths = (value: number): number => Math.round(value * 100) / 100;

/** A value as a tile, a bank entry or an option: what it shows and what it is. */
interface Tok {
  tex: string;
  v: number;
  answer: string;
  frac?: Frac;
}

const dec = (v: number): Tok => ({ tex: fmt(v), v: Number(fmt(v)), answer: fmt(v) });
const fr = (f: Frac): Tok => ({ tex: ftex(f), v: fv(f), answer: fans(f), frac: simplest(f) });

/** A probability as the question states it, fraction or decimal. */
type Prob = { kind: 'dec'; v: number } | { kind: 'frac'; f: Frac };
const probTok = (p: Prob): Tok => (p.kind === 'dec' ? dec(p.v) : fr(p.f));
const probValue = (p: Prob): number => (p.kind === 'dec' ? p.v : fv(p.f));
const probPlain = (p: Prob): string => (p.kind === 'dec' ? fmt(p.v) : fplain(p.f));
/** 1 - p, in the same form. */
const notP = (p: Prob): Prob =>
  p.kind === 'dec' ? { kind: 'dec', v: Number(fmt(1 - p.v)) } : { kind: 'frac', f: [p.f[1] - p.f[0], p.f[1]] };
/** p times q, exactly: fraction if either is. */
function times(p: Prob, q: Prob): Prob {
  if (p.kind === 'dec' && q.kind === 'dec') return { kind: 'dec', v: Number(fmt(p.v * q.v)) };
  const a = p.kind === 'frac' ? p.f : decFrac(p.v);
  const b = q.kind === 'frac' ? q.f : decFrac(q.v);
  return { kind: 'frac', f: simplest([a[0] * b[0], a[1] * b[1]]) };
}
function plus(p: Prob, q: Prob): Prob {
  if (p.kind === 'dec' && q.kind === 'dec') return { kind: 'dec', v: Number(fmt(p.v + q.v)) };
  const a = p.kind === 'frac' ? p.f : decFrac(p.v);
  const b = q.kind === 'frac' ? q.f : decFrac(q.v);
  return { kind: 'frac', f: simplest([a[0] * b[1] + b[0] * a[1], a[1] * b[1]]) };
}
/** A decimal of at most four places as a fraction. */
function decFrac(v: number): Frac {
  return simplest([Math.round(v * 10000), 10000]);
}

/** Near misses to a value, for topping up a bank or a set of options. */
function nearby(t: Tok, k: number): Tok[] {
  if (t.frac) {
    const [n, d] = t.frac;
    return [fr([n + k, d]), fr([n - k, d]), fr([n, d + k])].filter((x) => x.v >= 0);
  }
  if (Number.isInteger(t.v) && Math.abs(t.v) >= 1) return [dec(t.v + k), dec(t.v - k)].filter((x) => x.v >= 0);
  return [dec(t.v + 0.05 * k), dec(t.v - 0.05 * k), dec(t.v + 0.01 * k)].filter((x) => x.v >= 0);
}

/**
 * A bank for `tree`, `table` or `tiles`: the answer as a multiset, then slips
 * that differ from every answer in both spelling and value, topped up with
 * near misses until `spare` are left over. Sorted by value, never shuffled
 * (PITFALLS 3.10).
 */
function bank(answer: Tok[], slips: Tok[], spare = 3): string[] {
  const extras: Tok[] = [];
  const clash = (t: Tok) =>
    !Number.isFinite(t.v) || t.v < 0 || RECURRING.test(t.tex) || [...answer, ...extras].some((o) => o.tex === t.tex || same(o.v, t.v));
  for (const t of slips) {
    if (extras.length >= spare) break;
    if (!clash(t)) extras.push(t);
  }
  for (let k = 1; extras.length < spare && k < 40; k += 1) {
    for (const base of answer) {
      for (const t of nearby(base, k)) if (extras.length < spare && !clash(t)) extras.push(t);
    }
  }
  return [...answer, ...extras].sort((a, b) => a.v - b.v || a.tex.localeCompare(b.tex)).map((t) => t.tex);
}

/**
 * The options of a generator's `choices()`: the right value, the slips given,
 * then near misses, none equal in value to the answer or to each other.
 */
function probChoices(correct: Tok, wrong: Tok[], salt: number): ChoiceOption[] {
  const picked: Tok[] = [];
  const clash = (t: Tok, list: Tok[]) =>
    !Number.isFinite(t.v) || t.v < 0 || RECURRING.test(t.tex) || same(t.v, correct.v) || list.some((p) => same(p.v, t.v) || p.tex === t.tex);
  for (const t of wrong) {
    if (picked.length === 3) break;
    if (!clash(t, picked)) picked.push(t);
  }
  for (let k = 1; picked.length < 3; k += 1) {
    for (const t of nearby(correct, k)) if (picked.length < 3 && !clash(t, picked)) picked.push(t);
  }
  const spare: Tok[] = [];
  for (let k = 1; spare.length < 4 && k < 30; k += 1) {
    for (const t of nearby(correct, k)) if (!clash(t, [...picked, ...spare])) spare.push(t);
  }
  const as = (t: Tok) => ({ tex: t.tex, answer: t.answer });
  return steered(options(as(correct), ...picked.map(as)), salt, spare.map(as));
}

/**
 * A native choice slide: distinct distractors, the answer placed by the
 * question's own salt rather than a shuffle.
 */
function pickSlide(prompt: Block[], correct: string, wrong: string[], salt: number, tex: boolean): Slide {
  const distinct = [...new Set(wrong.filter((w) => w !== correct))].slice(0, 3);
  const at = salt % (distinct.length + 1);
  const labels = [...distinct.slice(0, at), correct, ...distinct.slice(at)];
  return {
    kind: 'choice',
    prompt,
    options: labels.map((label, idx) => ({ id: `opt${idx}`, label, tex })),
    correctId: `opt${at}`,
  };
}

/** Items turned by a salt, so the right branch of a flow is not always first. */
function turn<T>(items: T[], salt: number): T[] {
  const at = salt % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/** An expression slide answered with a probability. */
function probSlide(prompt: Block[], lead: string, answer: string): Slide {
  return { kind: 'expression', prompt, lead, keypad: FRACTION_KEYS, answer, domain: 'real', mode: 'exact' };
}

/** An expression slide answered with a whole number. */
function countSlide(prompt: Block[], lead: string, answer: number): Slide {
  return { kind: 'expression', prompt, lead, keypad: [], answer: `${answer}`, domain: 'real', mode: 'exact' };
}

/** A decimal that does not end within four places. */
const RECURRING = /\.\d{5,}/;

/** `= 0.25`, or `\approx 0.556` where the decimal runs on. */
function aboutTex(v: number): string {
  return RECURRING.test(fmt(v)) ? `\\approx ${v.toFixed(3)}` : `= ${fmt(v)}`;
}

/** `$0.25$`, or `about $0.556$` where the decimal runs on. */
function aboutText(v: number): string {
  return RECURRING.test(fmt(v)) ? `about $${v.toFixed(3)}$` : `$${fmt(v)}$`;
}

/** "5 red, 3 blue and 4 green". */
function listing(parts: string[]): string {
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/* ================================================================
 * Pictures
 * ================================================================ */

const f1 = (v: number): string => v.toFixed(1);

function svgText(text: string, x: number, y: number, extra = ''): string {
  return `<text x="${f1(x)}" y="${f1(y)}" font-size="14" text-anchor="middle" fill="currentColor" ${extra}>${text}</text>`;
}

/** A spinner of `n` equal sectors with the first `shaded` filled in. */
export function spinnerSvg(n: number, shaded: number): string {
  const cx = 140;
  const cy = 70;
  const r = 60;
  const at = (i: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };
  const wedges = Array.from({ length: n }, (_, i) => {
    const p = at(i);
    const q = at(i + 1);
    const fill = i < shaded ? 'fill="currentColor" fill-opacity="0.35"' : 'fill="none"';
    return `<path d="M ${cx} ${cy} L ${f1(p.x)} ${f1(p.y)} A ${r} ${r} 0 0 1 ${f1(q.x)} ${f1(q.y)} Z" ${fill} stroke="currentColor" stroke-width="1.2" />`;
  });
  return [
    `<svg viewBox="0 0 280 140" width="100%" style="max-width:280px" role="img" aria-label="A spinner with ${n} equal sectors, ${shaded} of them shaded">`,
    ...wedges,
    `<circle cx="${cx}" cy="${cy}" r="3" fill="currentColor" />`,
    '</svg>',
  ].join('');
}

/** Where 0 and 1 sit on the probability scale, in the SVG's own units. */
const SCALE_LEFT = 20;
const SCALE_RIGHT = 260;
const SCALE_WIDTH = 280;

/** The span a slider over `scaleSvg` declares, so its marker lands on the scale. */
export const SCALE_WINDOW = {
  xMin: -SCALE_LEFT / (SCALE_RIGHT - SCALE_LEFT),
  xMax: 1 + (SCALE_WIDTH - SCALE_RIGHT) / (SCALE_RIGHT - SCALE_LEFT),
};

/** The probability scale: 0 impossible, 0.5 evens, 1 certain. */
export function scaleSvg(): string {
  const x = (t: number) => SCALE_LEFT + (SCALE_RIGHT - SCALE_LEFT) * t;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(
    (t) => `<line x1="${x(t)}" y1="${t === 0.5 || t === 0 || t === 1 ? 30 : 34}" x2="${x(t)}" y2="46" stroke="currentColor" stroke-width="1.2" />`,
  );
  const small = 'font-size="11"';
  return [
    `<svg viewBox="0 0 ${SCALE_WIDTH} 66" width="100%" role="img" aria-label="The probability scale from 0, impossible, through 0.5, evens, to 1, certain">`,
    `<line x1="${SCALE_LEFT}" y1="40" x2="${SCALE_RIGHT}" y2="40" stroke="currentColor" stroke-width="1.5" />`,
    ...ticks,
    `<text x="${x(0)}" y="22" font-size="11" text-anchor="start" fill="currentColor">Impossible</text>`,
    `<text x="${x(0.5)}" y="22" font-size="11" text-anchor="middle" fill="currentColor">Evens</text>`,
    `<text x="${x(1)}" y="22" font-size="11" text-anchor="end" fill="currentColor">Certain</text>`,
    svgText('0', x(0), 62, small),
    svgText('0.5', x(0.5), 62, small),
    svgText('1', x(1), 62, small),
    '</svg>',
  ].join('');
}

/**
 * Two overlapping sets in a box. Regions in the order: only the first, both,
 * only the second, neither.
 */
export function vennSvg(names: [string, string], regions: [string, string, string, string]): string {
  const italic = 'font-style="italic" font-size="16"';
  return [
    `<svg viewBox="0 0 280 170" width="100%" style="max-width:280px" role="img" aria-label="A Venn diagram of ${names[0]} and ${names[1]}: ${regions[0]} in ${names[0]} only, ${regions[1]} in both, ${regions[2]} in ${names[1]} only, ${regions[3]} in neither">`,
    '<rect x="4" y="4" width="272" height="162" rx="6" fill="none" stroke="currentColor" stroke-width="1.2" />',
    '<circle cx="110" cy="88" r="62" fill="none" stroke="currentColor" stroke-width="1.5" />',
    '<circle cx="170" cy="88" r="62" fill="none" stroke="currentColor" stroke-width="1.5" />',
    svgText(names[0], 58, 34, italic),
    svgText(names[1], 222, 34, italic),
    svgText(regions[0], 78, 93),
    svgText(regions[1], 140, 93),
    svgText(regions[2], 202, 93),
    svgText(regions[3], 254, 156),
    '</svg>',
  ].join('');
}

/**
 * A two-stage tree. `second[0]` hangs off the first branch, `second[1]` off
 * the other; a blank label leaves the branch for the learner to work out.
 */
export interface TreePicture {
  first: [string, string];
  second: [[string, string], [string, string]];
  /** First-stage outcomes, then second-stage ones. */
  names: [string, string, string, string];
}

export function treeSvg({ first, second, names }: TreePicture): string {
  const root = { x: 14, y: 100 };
  const mids = [
    { x: 112, y: 52 },
    { x: 112, y: 148 },
  ];
  const leaves = [
    { x: 212, y: 24 },
    { x: 212, y: 78 },
    { x: 212, y: 122 },
    { x: 212, y: 176 },
  ];
  const line = (p: { x: number; y: number }, q: { x: number; y: number }) =>
    `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="currentColor" stroke-width="1.4" />`;
  const small = 'font-size="13"';
  const parts = [
    `<svg viewBox="0 0 280 200" width="100%" style="max-width:280px" role="img" aria-label="A tree diagram: first ${names[0]} or ${names[1]}, then ${names[2]} or ${names[3]}">`,
    line(root, { x: mids[0].x - 4, y: mids[0].y }),
    line(root, { x: mids[1].x - 4, y: mids[1].y }),
    svgText(first[0], 54, 64, small),
    svgText(first[1], 54, 146, small),
  ];
  mids.forEach((mid, i) => {
    const up = leaves[2 * i];
    const down = leaves[2 * i + 1];
    parts.push(
      line({ x: mid.x + 16, y: mid.y }, up),
      line({ x: mid.x + 16, y: mid.y }, down),
      svgText(names[i], mid.x + 6, mid.y + 5, 'font-style="italic"'),
      svgText(second[i][0], 160, (mid.y + up.y) / 2 - 6, small),
      svgText(second[i][1], 160, (mid.y + down.y) / 2 + 16, small),
      svgText(names[2], up.x + 14, up.y + 5, 'font-style="italic"'),
      svgText(names[3], down.x + 14, down.y + 5, 'font-style="italic"'),
    );
  });
  parts.push('</svg>');
  return parts.join('');
}

/* ================================================================
 * Level 1, lesson 1: chance as a fraction, and the 0 to 1 scale
 * ================================================================ */

const HOLDERS = ['bag', 'box', 'jar', 'tin', 'tub'] as const;
const THINGS = [
  ['counter', 'counters'],
  ['marble', 'marbles'],
  ['bead', 'beads'],
  ['ball', 'balls'],
  ['sweet', 'sweets'],
  ['button', 'buttons'],
  ['cube', 'cubes'],
] as const;
const COLOURS = ['red', 'blue', 'green', 'yellow', 'white', 'black', 'purple', 'orange', 'pink'] as const;

export interface BagParams {
  holder: string;
  thing: number;
  colours: string[];
  counts: number[];
  /** One colour, either of two, or anything but one. */
  ask: 'one' | 'either' | 'not';
  picks: number[];
}

export function bagFavourable({ counts, ask, picks }: BagParams): number {
  const total = counts.reduce((s, c) => s + c, 0);
  const chosen = picks.reduce((s, i) => s + counts[i], 0);
  return ask === 'not' ? total - chosen : chosen;
}

export const bagTotal = ({ counts }: BagParams): number => counts.reduce((s, c) => s + c, 0);

function bagEvent({ colours, ask, picks }: BagParams): string {
  if (ask === 'not') return `not ${colours[picks[0]]}`;
  return picks.map((i) => colours[i]).join(' or ');
}

function bagSentence(params: BagParams): string {
  const [one, many] = THINGS[params.thing];
  const parts = params.counts.map((c, i) => `${c} ${params.colours[i]}`);
  return `A ${params.holder} holds ${listing(parts)} ${many}. One ${one} is taken at random.`;
}

function sampleBag(rng: Rng, difficulty: number, needsCancel: boolean): BagParams {
  const hard = difficulty > 1;
  for (;;) {
    const n = hard ? 4 : 3;
    const colours = rng.sample(COLOURS, n);
    const counts = colours.map(() => (hard ? rng.int(2, 12) : rng.int(1, 9)));
    const ask: BagParams['ask'] = hard ? rng.pick(['either', 'not'] as const) : 'one';
    const picks = ask === 'either' ? rng.sample([0, 1, 2, 3], 2).sort((a, b) => a - b) : [rng.int(0, n - 1)];
    const params: BagParams = { holder: rng.pick(HOLDERS), thing: rng.int(0, THINGS.length - 1), colours, counts, ask, picks };
    const fav = bagFavourable(params);
    const total = bagTotal(params);
    if (fav === 0 || fav === total || total > 36) continue;
    if (needsCancel && gcd(fav, total) === 1) continue;
    return params;
  }
}

function bagSolution(params: BagParams): SolutionStep[] {
  const fav = bagFavourable(params);
  const total = bagTotal(params);
  const [one] = THINGS[params.thing];
  const steps: SolutionStep[] = [
    { text: `There are $${params.counts.join(' + ')} = ${total}$ ${THINGS[params.thing][1]}, each as likely as any other to be taken.` },
    { text: `$${fav}$ of them are ${bagEvent(params)}, so $${fav}$ outcomes are favourable.` },
    { tex: `P(\\text{${bagEvent(params)}}) = ${rawTex([fav, total])}${gcd(fav, total) > 1 ? ` = ${ftex([fav, total])}` : ''}` },
  ];
  if (params.ask === 'not') steps.splice(1, 0, { text: `Every ${one} that is not ${params.colours[params.picks[0]]} counts.` });
  return steps;
}

/** Favourable over total, from a bag of coloured objects. */
const bagFraction: Generator<BagParams> = {
  id: 'prob-bag-fraction',
  sample: (rng, difficulty) => sampleBag(rng, difficulty, false),
  render: (params): Slide =>
    probSlide(
      [say(`${bagSentence(params)} Find the probability that it is ${bagEvent(params)}.`)],
      `P(\\text{${bagEvent(params)}}) =`,
      fans([bagFavourable(params), bagTotal(params)]),
    ),
  solution: bagSolution,
  choices: (params) => {
    const fav = bagFavourable(params);
    const total = bagTotal(params);
    return probChoices(
      fr([fav, total]),
      [fr([fav, total - fav]), fr([total - fav, total]), fr([1, params.counts.length]), fr([fav, total + params.counts.length])],
      saltOf(params),
    );
  },
};

/** The same count written as it comes and then cancelled: the form is the skill. */
const cancelTiles: Generator<BagParams> = {
  id: 'prob-cancel-tiles',
  sample: (rng, difficulty) => sampleBag(rng, difficulty, true),
  render: (params): Slide => {
    const fav = bagFavourable(params);
    const total = bagTotal(params);
    const g = gcd(fav, total);
    return {
      kind: 'tiles',
      prompt: [
        say(bagSentence(params)),
        say(`Write the probability that it is ${bagEvent(params)} as favourable over total, then in its lowest terms.`),
      ],
      template: `P(\\text{${bagEvent(params)}}) = {0} = {1}`,
      answer: [rawTex([fav, total]), ftex([fav, total])],
      bank: tokenBank(
        [rawTex([fav, total]), ftex([fav, total])],
        [rawTex([fav, total - fav]), rawTex([fav / g, total]), rawTex([fav, total / g]), ftex([total - fav, total]), ftex([fav, total - fav])],
        3,
      ),
    };
  },
  solution: (params) => {
    const fav = bagFavourable(params);
    const total = bagTotal(params);
    const g = gcd(fav, total);
    return [
      ...bagSolution(params).slice(0, -1),
      { tex: `P = ${rawTex([fav, total])}` },
      { text: `Both $${fav}$ and $${total}$ divide by $${g}$:` },
      { tex: `${rawTex([fav, total])} = ${rawTex([fav / g, total / g])}` },
    ];
  },
};

const NAMES = ['Jo', 'Sam', 'Ria', 'Tom', 'Ava', 'Kai', 'Mia', 'Leo', 'Zara', 'Ben'] as const;

const LATE = [
  ['a bus is late', 'it is not late'],
  ['it rains tomorrow', 'it stays dry'],
  ['a seed fails to grow', 'it grows'],
  ['a parcel arrives late', 'it arrives on time'],
  ['a train is cancelled', 'it runs'],
  ['a battery is faulty', 'it works'],
] as const;

interface ScaleSliderParams {
  kind: 'spinner' | 'raffle' | 'percent';
  n: number;
  k: number;
  who: number;
}

/** On the 0.05 lattice exactly, as the slider stores it. */
function scaleAnswer({ kind, n, k }: ScaleSliderParams): number {
  const twentieths = kind === 'spinner' ? (20 * k) / n : kind === 'raffle' ? 20 - (20 * k) / n : 20 - k / 5;
  return Math.round(twentieths) / 20;
}

/** Drag a marker along the probability scale to where an event sits. */
const scaleSlider: Generator<ScaleSliderParams> = {
  id: 'prob-scale-slider',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      const n = rng.pick([4, 5, 10, 20]);
      return { kind: 'spinner', n, k: rng.int(1, n - 1), who: 0 };
    }
    if (rng.chance(0.5)) {
      const n = rng.pick([20, 40, 60, 80, 100, 200]);
      return { kind: 'raffle', n, k: (n / 20) * rng.int(1, 19), who: rng.int(0, NAMES.length - 1) };
    }
    return { kind: 'percent', n: 100, k: 5 * rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19]), who: rng.int(0, LATE.length - 1) };
  },
  render: (params): Slide => {
    const { kind, n, k, who } = params;
    const prompt =
      kind === 'spinner'
        ? [
            say(`This fair spinner has ${n} equal sectors, and ${k} of them ${k === 1 ? 'is' : 'are'} shaded. Slide the marker to the probability that it lands on a shaded sector.`),
            picture(spinnerSvg(n, k)),
          ]
        : kind === 'raffle'
          ? [say(`A raffle sells ${n} tickets and ${NAMES[who]} buys ${k} of them. One winning ticket is drawn at random. Slide the marker to the probability that ${NAMES[who]} does **not** win.`)]
          : [say(`The chance that ${LATE[who][0]} is ${k}%. Slide the marker to the probability that ${LATE[who][1]}.`)];
    return {
      kind: 'slider',
      prompt,
      min: 0,
      max: 1,
      step: 0.05,
      answer: scaleAnswer(params),
      readout: kind === 'spinner' ? 'P(\\text{shaded}) = {v}' : 'P = {v}',
      figure: { svg: scaleSvg(), ...SCALE_WINDOW },
    };
  },
  solution: (params) => {
    const { kind, n, k } = params;
    const p = scaleAnswer(params);
    if (kind === 'spinner') {
      return [
        { text: `$${k}$ of the $${n}$ equally likely sectors are shaded.` },
        { tex: `P(\\text{shaded}) = ${rawTex([k, n])} = ${fmt(p)}` },
      ];
    }
    if (kind === 'raffle') {
      return [
        { text: `$${n - k}$ of the $${n}$ tickets are not ${NAMES[params.who]}'s.` },
        { tex: `P(\\text{not win}) = ${rawTex([n - k, n])} = ${fmt(p)}` },
      ];
    }
    return [
      { text: `$${k}\\%$ is $${fmt(k / 100)}$ as a probability, and the event either happens or it does not.` },
      { tex: `1 - ${fmt(k / 100)} = ${fmt(p)}` },
    ];
  },
};

const WORDS = ['Impossible', 'Unlikely', 'Even chance', 'Likely', 'Certain'] as const;

const EVENTS = [
  'it snows here tomorrow',
  'the next car to pass is red',
  'a seed from this packet grows',
  'a new battery lasts a year',
  'the next caller is a woman',
  'a dropped cup lands upright',
  'the school team wins on Saturday',
  'a letter arrives tomorrow',
] as const;

type Shown = { form: 'frac' | 'dec' | 'pct'; top: number; bottom: number };

const shownValue = ({ top, bottom }: Shown): number => top / bottom;

function shownTex(s: Shown): string {
  if (s.form === 'frac') return s.top === 0 || s.top === s.bottom ? `${s.top / s.bottom}` : rawTex([s.top, s.bottom]);
  if (s.form === 'dec') return fmt(s.top / s.bottom);
  return `${fmt((100 * s.top) / s.bottom)}\\%`;
}

function sampleShown(rng: Rng, lo = 0, hi = 1): Shown {
  for (;;) {
    const form = rng.pick(['frac', 'dec', 'pct'] as const);
    const s: Shown =
      form === 'frac'
        ? (() => {
            const bottom = rng.int(2, 12);
            return { form, top: rng.int(0, bottom), bottom };
          })()
        : form === 'dec'
          ? { form, top: rng.int(0, 20) * 5, bottom: 100 }
          : { form, top: rng.int(0, 20) * 5, bottom: 100 };
    const v = shownValue(s);
    if (v < lo || v > hi) continue;
    if (s.form === 'frac' && gcd(s.top, s.bottom) !== 1 && s.top !== 0) continue;
    return s;
  }
}

interface WordsParams {
  event: number;
  shown: Shown[];
}

function wordFor(v: number): string {
  if (v === 0) return WORDS[0];
  if (v === 1) return WORDS[4];
  if (same(v, 0.5)) return WORDS[2];
  return v < 0.5 ? WORDS[1] : WORDS[3];
}

/** Where a probability sits on the scale, in words; at difficulty 2 the most likely of four. */
const scaleWords: Generator<WordsParams> = {
  id: 'prob-scale-words',
  sample: (rng, difficulty) => {
    const event = rng.int(0, EVENTS.length - 1);
    if (difficulty <= 1) {
      // Make the ends and the middle turn up often enough to be learned.
      if (rng.chance(0.2)) {
        const bottom = rng.int(2, 12);
        const top = rng.pick([0, bottom]);
        return { event, shown: [{ form: 'frac', top, bottom: top === 0 ? bottom : top }] };
      }
      return { event, shown: [sampleShown(rng)] };
    }
    for (;;) {
      const forms: Shown['form'][] = rng.shuffle(['frac', 'dec', 'pct', 'frac']);
      const shown = forms.map((form) => {
        for (;;) {
          const s = sampleShown(rng, 0.2, 0.9);
          if (s.form === form) return s;
        }
      });
      const values = shown.map(shownValue).sort((a, b) => b - a);
      if (values.some((v, i) => i > 0 && same(v, values[i - 1]))) continue;
      if (values[0] - values[1] > 0.12 || values[0] - values[1] < 0.01) continue;
      return { event, shown };
    }
  },
  render: ({ event, shown }): Slide => {
    if (shown.length === 1) {
      const v = shownValue(shown[0]);
      return {
        kind: 'choice',
        prompt: [say(`The probability that ${EVENTS[event]} is $${shownTex(shown[0])}$. Which word describes how likely it is?`)],
        options: WORDS.map((word, idx) => ({ id: `opt${idx}`, label: word })),
        correctId: `opt${WORDS.indexOf(wordFor(v) as (typeof WORDS)[number])}`,
      };
    }
    const values = shown.map(shownValue);
    const best = values.indexOf(Math.max(...values));
    return pickSlide(
      [say('Four events have these probabilities. Which is the most likely to happen?')],
      shownTex(shown[best]),
      shown.filter((_, i) => i !== best).map(shownTex),
      saltOf(shown),
      true,
    );
  },
  solution: ({ event, shown }) => {
    if (shown.length === 1) {
      const v = shownValue(shown[0]);
      return [
        { text: `As a decimal the probability that ${EVENTS[event]} is ${aboutText(v)}.` },
        {
          text:
            v === 0
              ? 'A probability of $0$ means it cannot happen: impossible.'
              : v === 1
                ? 'A probability of $1$ means it must happen: certain.'
                : same(v, 0.5)
                  ? 'Exactly halfway along the scale: an even chance.'
                  : v < 0.5
                    ? 'Below $0.5$, so less likely to happen than not: unlikely.'
                    : 'Above $0.5$, so more likely to happen than not: likely.',
        },
      ];
    }
    const values = shown.map(shownValue);
    return [
      { text: 'Write each one as a decimal so they can be compared.' },
      { tex: shown.map((s) => `${shownTex(s)} ${aboutTex(shownValue(s))}`).join(', \\quad ') },
      { text: `The largest is ${aboutText(Math.max(...values))}, so that event is the most likely.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 2: sample spaces
 * ================================================================ */

export type ObjId = 'coin' | 'd4' | 'd6' | 'd8' | 's3' | 's4' | 's5';

export function faces(id: ObjId): (string | number)[] {
  if (id === 'coin') return ['H', 'T'];
  const n = Number(id.slice(1));
  return Array.from({ length: n }, (_, i) => i + 1);
}

function objText(id: ObjId): string {
  if (id === 'coin') return 'a fair coin is flipped';
  if (id === 'd6') return 'a fair six-sided die is rolled';
  if (id === 'd4') return 'a fair four-sided die, numbered 1 to 4, is rolled';
  if (id === 'd8') return 'a fair eight-sided die, numbered 1 to 8, is rolled';
  return `a fair spinner numbered 1 to ${id.slice(1)} is spun`;
}

export type PairEvent =
  | { kind: 'headEven' | 'tailOdd' }
  | { kind: 'headIs' | 'tailOver'; k: number }
  | { kind: 'twoHeads' | 'oneEach' }
  | { kind: 'sum' | 'sumOver' | 'diff' | 'productOver'; k: number }
  | { kind: 'same' | 'productEven' };

export interface PairParams {
  first: ObjId;
  second: ObjId;
  event: PairEvent;
}

/** Whether an outcome (x, y) belongs to the event. The test re-derives this. */
export function inEvent(event: PairEvent, x: string | number, y: string | number): boolean {
  switch (event.kind) {
    case 'headEven':
      return x === 'H' && (y as number) % 2 === 0;
    case 'tailOdd':
      return x === 'T' && (y as number) % 2 === 1;
    case 'headIs':
      return x === 'H' && y === event.k;
    case 'tailOver':
      return x === 'T' && (y as number) > event.k;
    case 'twoHeads':
      return x === 'H' && y === 'H';
    case 'oneEach':
      return x !== y;
    case 'sum':
      return (x as number) + (y as number) === event.k;
    case 'sumOver':
      return (x as number) + (y as number) > event.k;
    case 'diff':
      return Math.abs((x as number) - (y as number)) === event.k;
    case 'productOver':
      return (x as number) * (y as number) > event.k;
    case 'same':
      return x === y;
    case 'productEven':
      return ((x as number) * (y as number)) % 2 === 0;
  }
}

function eventText(event: PairEvent): string {
  switch (event.kind) {
    case 'headEven':
      return 'a head and an even number';
    case 'tailOdd':
      return 'a tail and an odd number';
    case 'headIs':
      return `a head and a ${event.k}`;
    case 'tailOver':
      return `a tail and a number greater than ${event.k}`;
    case 'twoHeads':
      return 'two heads';
    case 'oneEach':
      return 'one head and one tail';
    case 'sum':
      return `a total of ${event.k}`;
    case 'sumOver':
      return `a total greater than ${event.k}`;
    case 'diff':
      return `a difference of ${event.k} between the two scores`;
    case 'productOver':
      return `a product greater than ${event.k}`;
    case 'same':
      return 'the same number on both';
    case 'productEven':
      return 'an even product';
  }
}

export function pairCounts({ first, second, event }: PairParams): { fav: number; total: number } {
  let fav = 0;
  let total = 0;
  for (const x of faces(first)) {
    for (const y of faces(second)) {
      total += 1;
      if (inEvent(event, x, y)) fav += 1;
    }
  }
  return { fav, total };
}

function samplePair(rng: Rng, difficulty: number): PairParams {
  const hard = difficulty > 1;
  const numbers: ObjId[] = ['d4', 'd6', 'd8', 's3', 's4', 's5'];
  for (;;) {
    let params: PairParams;
    const style = hard ? 'numbers' : rng.pick(['coin', 'coin', 'coins', 'numbers'] as const);
    if (style === 'coins') {
      params = { first: 'coin', second: 'coin', event: { kind: rng.pick(['twoHeads', 'oneEach'] as const) } };
    } else if (style === 'coin') {
      const second = rng.pick(numbers);
      const n = faces(second).length;
      const kind = rng.pick(['headEven', 'tailOdd', 'headIs', 'tailOver'] as const);
      params = {
        first: 'coin',
        second,
        event: kind === 'headIs' || kind === 'tailOver' ? { kind, k: rng.int(1, n - 1) } : { kind },
      };
    } else {
      const [first, second] = hard
        ? rng.pick([
            ['d6', 'd6'],
            ['d6', 'd4'],
            ['d8', 'd4'],
            ['d6', 's5'],
            ['d8', 's3'],
            ['d6', 's3'],
          ] as [ObjId, ObjId][])
        : rng.pick([
            ['s3', 's3'],
            ['s3', 's4'],
            ['s4', 's4'],
            ['d4', 's3'],
            ['d4', 'd4'],
            ['s5', 's3'],
          ] as [ObjId, ObjId][]);
      const top = faces(first).length + faces(second).length;
      const kind = hard
        ? rng.pick(['sum', 'sumOver', 'diff', 'productOver', 'productEven'] as const)
        : rng.pick(['sum', 'sumOver', 'same'] as const);
      const k =
        kind === 'sum' || kind === 'sumOver'
          ? rng.int(3, top - 1)
          : kind === 'diff'
            ? rng.int(1, 4)
            : kind === 'productOver'
              ? rng.int(4, 20)
              : 0;
      params = { first, second, event: kind === 'same' || kind === 'productEven' ? { kind } : { kind, k } };
    }
    const { fav, total } = pairCounts(params);
    if (fav === 0 || fav === total) continue;
    return params;
  }
}

/** Two of the same thing, said once. */
function twinText(id: ObjId): string {
  if (id === 'coin') return 'Two fair coins are flipped';
  if (id === 'd6') return 'Two fair six-sided dice are rolled';
  if (id === 'd4') return 'Two fair four-sided dice, each numbered 1 to 4, are rolled';
  if (id === 'd8') return 'Two fair eight-sided dice, each numbered 1 to 8, are rolled';
  return `Two fair spinners, each numbered 1 to ${id.slice(1)}, are spun`;
}

function pairSentence({ first, second }: PairParams): string {
  if (first === second) return `${twinText(first)}.`;
  const a = objText(first);
  return `${a[0].toUpperCase()}${a.slice(1)} and ${objText(second)}.`;
}

function pairSolution(params: PairParams): SolutionStep[] {
  const { fav, total } = pairCounts(params);
  const m = faces(params.first).length;
  const n = faces(params.second).length;
  const hits: string[] = [];
  for (const x of faces(params.first)) {
    for (const y of faces(params.second)) if (inEvent(params.event, x, y)) hits.push(`(${x}, ${y})`);
  }
  return [
    { text: `The sample space has $${m} \\times ${n} = ${total}$ equally likely outcomes.` },
    { text: `The outcomes giving ${eventText(params.event)} are ${hits.length > 8 ? `these ${hits.length}` : listing(hits.map((h) => `$${h}$`))}.` },
    { tex: `P = ${rawTex([fav, total])}${gcd(fav, total) > 1 ? ` = ${ftex([fav, total])}` : ''}` },
  ];
}

/** P(event) for two objects together, by listing the sample space. */
const spaceEvent: Generator<PairParams> = {
  id: 'prob-space-event',
  sample: samplePair,
  render: (params): Slide => {
    const { fav, total } = pairCounts(params);
    return probSlide(
      [say(`${pairSentence(params)} Find the probability of ${eventText(params.event)}.`)],
      'P =',
      fans([fav, total]),
    );
  },
  solution: pairSolution,
  choices: (params) => {
    const { fav, total } = pairCounts(params);
    const m = faces(params.first).length;
    const n = faces(params.second).length;
    return probChoices(fr([fav, total]), [fr([fav, m + n]), fr([1, total]), fr([fav + 1, total]), fr([total - fav, total])], saltOf(params));
  },
};

/** The same count as a tree: each object's outcomes, the favourable ones, the whole space, then P. */
const spaceTree: Generator<PairParams> = {
  id: 'prob-space-tree',
  sample: (rng, difficulty) => samplePair(rng, difficulty),
  render: (params): Slide => {
    const { fav, total } = pairCounts(params);
    const m = faces(params.first).length;
    const n = faces(params.second).length;
    const answer: Tok[] = [dec(m), dec(n), dec(fav), dec(total), fr([fav, total])];
    return {
      kind: 'tree',
      prompt: [
        say(
          `${pairSentence(params)} Find the probability of ${eventText(params.event)}. Top row, left to right: the outcomes of the first, the outcomes of the second, and how many outcomes of the pair give ${eventText(params.event)}. Then the size of the sample space, then the probability.`,
        ),
      ],
      expression: `P = \\frac{\\text{favourable}}{\\text{total}}`,
      nodes: [
        { id: 'm', from: [] },
        { id: 'n', from: [] },
        { id: 'fav', from: [] },
        { id: 'total', from: ['m', 'n'] },
        { id: 'p', from: ['fav', 'total'] },
      ],
      bank: bank(answer, [dec(m + n), fr([fav, m + n]), dec(fav + 1), fr([1, total]), fr([fav + 1, total])]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: pairSolution,
};

const COUNTABLE = [
  { text: 'a coin is flipped', n: 2 },
  { text: 'a six-sided die is rolled', n: 6 },
  { text: 'a four-sided die is rolled', n: 4 },
  { text: 'an eight-sided die is rolled', n: 8 },
  { text: 'a spinner with 3 equal sectors is spun', n: 3 },
  { text: 'a spinner with 5 equal sectors is spun', n: 5 },
  { text: 'a letter is picked from the word MATHS', n: 5 },
  { text: 'a day of the week is picked', n: 7 },
  { text: 'a card is picked from cards numbered 1 to 10', n: 10 },
  { text: 'a month of the year is picked', n: 12 },
] as const;

interface CountParams {
  picks: number[];
}

/** How many outcomes two or three things make together: multiply, never add. */
const outcomeCount: Generator<CountParams> = {
  id: 'prob-outcome-count',
  sample: (rng, difficulty) => ({ picks: rng.sample([...COUNTABLE.keys()], difficulty > 1 ? 3 : 2) }),
  render: ({ picks }): Slide => {
    const sizes = picks.map((i) => COUNTABLE[i].n);
    const product = sizes.reduce((p, s) => p * s, 1);
    const sum = sizes.reduce((p, s) => p + s, 0);
    const said = listing(picks.map((i) => COUNTABLE[i].text));
    const wrong = [sum, product - sizes[0], sizes.length === 3 ? sizes[0] * sizes[1] : product * 2, product + 1, product - 1];
    return pickSlide(
      [say(`${said[0].toUpperCase()}${said.slice(1)}. How many outcomes are in the sample space?`)],
      `${product}`,
      wrong.filter((w) => w > 0 && w !== product).map(String),
      saltOf(picks),
      true,
    );
  },
  solution: ({ picks }) => {
    const sizes = picks.map((i) => COUNTABLE[i].n);
    return [
      { text: 'Each outcome of the first goes with every outcome of the others, so the counts multiply.' },
      { tex: `${sizes.join(' \\times ')} = ${sizes.reduce((p, s) => p * s, 1)}` },
    ];
  },
};

export type TableParams =
  | { kind: 'coins'; n: number; hard: boolean }
  | { kind: 'sum' | 'diff'; a: number[]; b: number[]; hard: boolean };

/** The rows of a sample-space table: each outcome value and how many ways. */
export function tableRows(params: TableParams): { value: number; ways: number }[] {
  const tally = new Map<number, number>();
  if (params.kind === 'coins') {
    for (let mask = 0; mask < 2 ** params.n; mask += 1) {
      let heads = 0;
      for (let i = 0; i < params.n; i += 1) if (mask & (1 << i)) heads += 1;
      tally.set(heads, (tally.get(heads) ?? 0) + 1);
    }
  } else {
    for (const x of params.a) {
      for (const y of params.b) {
        const v = params.kind === 'sum' ? x + y : Math.abs(x - y);
        tally.set(v, (tally.get(v) ?? 0) + 1);
      }
    }
  }
  return [...tally.entries()].sort((p, q) => p[0] - q[0]).map(([value, ways]) => ({ value, ways }));
}

const tableTotal = (params: TableParams): number =>
  params.kind === 'coins' ? 2 ** params.n : params.a.length * params.b.length;

const spinnerFaces = (start: number, size: number, gap: number): number[] =>
  Array.from({ length: size }, (_, i) => start + gap * i);

/** Blank rows of the P column at difficulty 2: the first and the likeliest. */
function hardBlankRows(rows: { ways: number }[]): number[] {
  const most = rows.reduce((best, row, i) => (row.ways > rows[best].ways ? i : best), 0);
  return [...new Set([0, most === 0 ? rows.length - 1 : most])].sort((a, b) => a - b);
}

/** Outcome, ways and probability, the table filled from the sample space. */
const spaceTable: Generator<TableParams> = {
  id: 'prob-space-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      if (!hard && rng.chance(0.15)) return { kind: 'coins', n: rng.pick([2, 3]), hard };
      const kind = hard ? rng.pick(['sum', 'diff'] as const) : 'sum';
      const a = spinnerFaces(rng.int(0, 2), rng.int(2, hard ? 5 : 3), hard ? rng.pick([1, 1, 2]) : 1);
      const b = spinnerFaces(rng.int(0, 2), rng.int(2, hard ? 5 : 4), 1);
      const params: TableParams = { kind, a, b, hard };
      const rows = tableRows(params).length;
      if (rows < 3 || rows > (hard ? 6 : 5)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const rows = tableRows(params);
    const total = tableTotal(params);
    const blankP = params.hard ? hardBlankRows(rows) : rows.map((_, i) => i);
    const cells: (string | null)[][] = rows.map((row, i) => [
      `${row.value}`,
      params.hard ? null : `${row.ways}`,
      blankP.includes(i) ? null : ftex([row.ways, total]),
    ]);
    const answer: Tok[] = [];
    rows.forEach((row, i) => {
      if (params.hard) answer.push(dec(row.ways));
      if (blankP.includes(i)) answer.push(fr([row.ways, total]));
    });
    const slips = rows.flatMap((row) => [fr([row.ways, rows.length]), fr([1, rows.length]), fr([row.ways + 1, total]), dec(row.ways + 1)]);
    const what =
      params.kind === 'coins'
        ? `${params.n === 2 ? 'Two' : 'Three'} fair coins are flipped. Complete the table for the number of heads.`
        : `Two fair spinners, one numbered ${listing(params.a.map(String))} and one numbered ${listing(params.b.map(String))}, are spun and the ${params.kind === 'sum' ? 'scores added' : 'difference between the scores taken'}. Complete the table.`;
    return {
      kind: 'table',
      prompt: [say(`${what} Give each probability in its lowest terms.`)],
      columns: [params.kind === 'coins' ? '\\text{Heads}' : params.kind === 'sum' ? '\\text{Total}' : '\\text{Difference}', '\\text{Ways}', 'P'],
      rows: cells,
      bank: bank(answer, slips, 3),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const rows = tableRows(params);
    const total = tableTotal(params);
    return [
      {
        text:
          params.kind === 'coins'
            ? `There are $2^{${params.n}} = ${total}$ equally likely ways for the coins to land.`
            : `There are $${params.a.length} \\times ${params.b.length} = ${total}$ equally likely pairs of scores.`,
      },
      { text: 'Count the pairs giving each value, then divide by the total.' },
      { tex: rows.map((row) => `P(${row.value}) = ${rawTex([row.ways, total])}`).join(', \\; ') },
      { text: `The ways add up to $${total}$, and the probabilities to $1$.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: the complement and "at least one"
 * ================================================================ */

const EVENT_WORDS = [
  ['a train is late', 'late'],
  ['it rains tomorrow', 'rain'],
  ['a seed grows', 'grows'],
  ['a team wins its next match', 'win'],
  ['a phone battery lasts all day', 'lasts'],
  ['a light bulb is faulty', 'faulty'],
  ['a penalty is scored', 'scored'],
  ['a parcel arrives on time', 'on time'],
] as const;

interface ComplementParams {
  context: number;
  p: Prob;
}

function sampleProb(rng: Rng, hard: boolean): Prob {
  for (;;) {
    if (!hard) {
      const v = rng.int(1, 99) / 100;
      if (!same(v, 0.5)) return { kind: 'dec', v };
      continue;
    }
    const b = rng.int(3, 12);
    const a = rng.int(1, b - 1);
    if (gcd(a, b) !== 1 || 2 * a === b) continue;
    return { kind: 'frac', f: [a, b] };
  }
}

/** 1 - P(A), with the working laid out as a rule. */
const complementTiles: Generator<ComplementParams> = {
  id: 'prob-complement-tiles',
  sample: (rng, difficulty) => ({ context: rng.int(0, EVENT_WORDS.length - 1), p: sampleProb(rng, difficulty > 1) }),
  render: ({ context, p }): Slide => {
    const [sentence, word] = EVENT_WORDS[context];
    const q = notP(p);
    const answer = [dec(1), probTok(p), probTok(q)];
    const slips: Tok[] =
      p.kind === 'dec'
        ? [dec(q.kind === 'dec' ? q.v + 0.1 : 0), dec(q.kind === 'dec' ? q.v - 0.1 : 0), dec(0), dec(0.5)]
        : [fr([p.f[0], p.f[1] - p.f[0]]), fr([p.f[1] - p.f[0] - 1, p.f[1]]), dec(0), fr([1, p.f[1]])];
    return {
      kind: 'tiles',
      prompt: [say(`The probability that ${sentence} is $${probTok(p).tex}$. Find the probability that it does not happen.`)],
      template: `P(\\text{not ${word}}) = {0} - {1} = {2}`,
      answer: answer.map((t) => t.tex),
      bank: bank(answer, slips, 3),
    };
  },
  solution: ({ context, p }) => [
    { text: `Either ${EVENT_WORDS[context][0]} or it does not, and the two probabilities add up to $1$.` },
    { tex: `P(\\text{not}) = 1 - ${probTok(p).tex} = ${probTok(notP(p)).tex}` },
  ],
};

const THREE_WAYS = [
  {
    what: 'A football team can win, draw or lose its next match.',
    outcomes: ['win', 'draw', 'lose'],
    nots: ['the team does not win', 'the match is not a draw', 'the team does not lose'],
  },
  {
    what: 'A bus can be early, on time or late.',
    outcomes: ['early', 'on time', 'late'],
    nots: ['the bus is not early', 'the bus is not on time', 'the bus is not late'],
  },
  {
    what: 'A spinner lands on red, blue or green.',
    outcomes: ['red', 'blue', 'green'],
    nots: ['it does not land on red', 'it does not land on blue', 'it does not land on green'],
  },
  {
    what: 'A student travels to school by car, by bus or on foot.',
    outcomes: ['car', 'bus', 'walk'],
    nots: ['the student does not go by car', 'the student does not go by bus', 'the student does not walk'],
  },
  {
    what: 'Tomorrow will be sunny, cloudy or rainy.',
    outcomes: ['sunny', 'cloudy', 'rainy'],
    nots: ['it is not sunny', 'it is not cloudy', 'it is not rainy'],
  },
] as const;

const RATIO_PAIRS = [
  { what: 'A biased coin', yes: 'heads', no: 'tails' },
  { what: 'A biased spinner', yes: 'red', no: 'blue' },
  { what: 'A chess player', yes: 'wins', no: 'loses' },
  { what: 'A weighted drawing pin', yes: 'point up', no: 'point down' },
  { what: 'A traffic light, when you reach it,', yes: 'is red', no: 'is green' },
] as const;

type ComplementValueParams =
  | { kind: 'three'; context: number; given: [number, number]; missing: number; p: number[] }
  | { kind: 'ratio'; context: number; k: number; askYes: boolean };

function complementValueAnswer(params: ComplementValueParams): Tok {
  if (params.kind === 'three') return dec(hundredths(1 - params.p[params.missing]));
  return params.askYes ? fr([params.k, params.k + 1]) : fr([1, params.k + 1]);
}

/**
 * P(not A) as a number. At difficulty 1 from a three-way split with one
 * outcome's probability left for the learner to find; at difficulty 2 from
 * "k times as likely", which is 1 split into k + 1 parts.
 */
const complementValue: Generator<ComplementValueParams> = {
  id: 'prob-complement-value',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      for (;;) {
        const a = rng.int(1, 15) * 5;
        const b = rng.int(1, 15) * 5;
        if (a + b >= 95) continue;
        const missing = rng.int(0, 2);
        const others = [0, 1, 2].filter((i) => i !== missing) as [number, number];
        const p = [0, 0, 0];
        p[others[0]] = a / 100;
        p[others[1]] = b / 100;
        p[missing] = hundredths(1 - p[others[0]] - p[others[1]]);
        return { kind: 'three', context: rng.int(0, THREE_WAYS.length - 1), given: others, missing, p };
      }
    }
    return { kind: 'ratio', context: rng.int(0, RATIO_PAIRS.length - 1), k: rng.int(2, 9), askYes: rng.chance(0.5) };
  },
  render: (params): Slide => {
    const answer = complementValueAnswer(params);
    if (params.kind === 'three') {
      const ctx = THREE_WAYS[params.context];
      const [i, j] = params.given;
      return probSlide(
        [
          say(`${ctx.what} $P(\\text{${ctx.outcomes[i]}}) = ${fmt(params.p[i])}$ and $P(\\text{${ctx.outcomes[j]}}) = ${fmt(params.p[j])}$.`),
          say(`Find the probability that ${ctx.nots[params.missing]}.`),
        ],
        `P(\\text{not ${ctx.outcomes[params.missing]}}) =`,
        answer.answer,
      );
    }
    const ctx = RATIO_PAIRS[params.context];
    const asked = params.askYes ? ctx.yes : ctx.no;
    return probSlide(
      [
        say(`${ctx.what} always gives ${ctx.yes} or ${ctx.no}, and it is ${params.k} times as likely to give ${ctx.yes} as ${ctx.no}.`),
        say(`Find the probability that it gives ${asked}.`),
      ],
      `P(\\text{${asked}}) =`,
      answer.answer,
    );
  },
  solution: (params) => {
    if (params.kind === 'three') {
      const ctx = THREE_WAYS[params.context];
      const [i, j] = params.given;
      const m = params.missing;
      return [
        { text: `The three outcomes cover everything, so their probabilities add to $1$. "Not ${ctx.outcomes[m]}" is the other two together.` },
        { tex: `${fmt(params.p[i])} + ${fmt(params.p[j])} = ${fmt(1 - params.p[m])}` },
      ];
    }
    const ctx = RATIO_PAIRS[params.context];
    return [
      { text: `Call $P(\\text{${ctx.no}}) = p$. Then $P(\\text{${ctx.yes}}) = ${params.k}p$, and the two add to $1$.` },
      { tex: `${params.k}p + p = ${params.k + 1}p = 1 \\quad \\Rightarrow \\quad p = ${ftex([1, params.k + 1])}` },
      { tex: `P(\\text{${params.askYes ? ctx.yes : ctx.no}}) = ${complementValueAnswer(params).tex}` },
    ];
  },
  choices: (params) => {
    const right = complementValueAnswer(params);
    if (params.kind === 'three') {
      const m = params.missing;
      return probChoices(right, [dec(params.p[m]), dec(1 - params.p[params.given[0]]), dec(1 - params.p[params.given[1]])], saltOf(params));
    }
    return probChoices(
      right,
      [fr([1, params.k]), fr([params.k - 1, params.k]), params.askYes ? fr([1, params.k + 1]) : fr([params.k, params.k + 1])],
      saltOf(params),
    );
  },
};

const REPEATS = [
  { trial: 'a fair coin is flipped', times: 'times', miss: 'no heads', hit: 'at least one head', q: [1, 2] as Frac },
  { trial: 'a fair six-sided die is rolled', times: 'times', miss: 'no sixes', hit: 'at least one six', q: [5, 6] as Frac },
  { trial: 'a fair four-sided die is rolled', times: 'times', miss: 'no 4s', hit: 'at least one 4', q: [3, 4] as Frac },
  { trial: 'a fair spinner with 5 equal sectors, one of them gold, is spun', times: 'times', miss: 'no gold', hit: 'gold at least once', q: [4, 5] as Frac },
] as const;

/**
 * `states` says which probability the question gives: that of the event on
 * one go (so the miss is 1 minus it) or that of the miss itself.
 */
const DECIMAL_REPEATS = [
  { who: 'A light bulb fails in its first year with probability', unit: 'bulbs', hit: 'at least one fails', miss: 'none fails', states: 'hit' },
  { who: 'An archer misses the target with probability', unit: 'arrows', hit: 'at least one arrow hits', miss: 'every arrow misses', states: 'miss' },
  { who: 'A bus is late with probability', unit: 'days', hit: 'the bus is late at least once', miss: 'it is never late', states: 'hit' },
  { who: 'A seed fails to grow with probability', unit: 'seeds', hit: 'at least one seed grows', miss: 'none grows', states: 'miss' },
] as const;

type AtLeastParams =
  | { kind: 'frac'; context: number; n: number }
  | { kind: 'dec'; context: number; n: number; q: number };

/** The probability of a miss on one go. `q` is always the miss. */
function atLeastQ(params: AtLeastParams): Prob {
  if (params.kind === 'frac') return { kind: 'frac', f: REPEATS[params.context].q };
  return { kind: 'dec', v: params.q };
}

function powerOf(p: Prob, n: number): Prob {
  let out: Prob = p;
  for (let i = 1; i < n; i += 1) out = times(out, p);
  return out;
}

function atLeastPrompt(params: AtLeastParams): string {
  if (params.kind === 'frac') {
    const ctx = REPEATS[params.context];
    return `${ctx.trial[0].toUpperCase()}${ctx.trial.slice(1)} ${params.n} times. Find the probability of ${ctx.hit}, working from the probability of ${ctx.miss}.`;
  }
  const ctx = DECIMAL_REPEATS[params.context];
  const p = ctx.states === 'hit' ? hundredths(1 - params.q) : params.q;
  const lead = `${ctx.who} $${fmt(p)}$ each time, independently.`;
  return `${lead} Over ${params.n} ${ctx.unit}, find the probability that ${ctx.hit}, working from the probability that ${ctx.miss}.`;
}

/** 1 - q^n: the power first, then take it from 1. */
const atLeastSteps: Generator<AtLeastParams> = {
  id: 'prob-at-least-one',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    if (rng.chance(0.5)) {
      const context = rng.int(0, REPEATS.length - 1);
      const n = context === 0 ? rng.int(hard ? 4 : 2, hard ? 5 : 3) : hard ? 3 : 2;
      return { kind: 'frac', context, n };
    }
    return { kind: 'dec', context: rng.int(0, DECIMAL_REPEATS.length - 1), n: hard ? 3 : 2, q: rng.int(1, 9) / 10 };
  },
  render: (params): Slide => {
    const q = atLeastQ(params);
    const qn = powerOf(q, params.n);
    const qt = probTok(q);
    const qnt = probTok(qn);
    const rt = probTok(notP(qn));
    const slipPower = probTok(times(q, { kind: 'dec', v: params.n }));
    const qnMinus = probTok(powerOf(q, params.n - 1));
    return {
      kind: 'steps',
      prompt: [say(atLeastPrompt(params)), say('Tap the part you would work out next, then choose what it comes to.')],
      start: ['1', '-', `\\left(${qt.tex}\\right)^{${params.n}}`],
      reductions: [
        { span: [2, 3], value: qnt.tex, bank: stepBank(qnt.tex, slipPower.tex, qnMinus.tex, probTok(notP(q)).tex) },
        {
          span: [0, 3],
          operator: 1,
          value: rt.tex,
          bank: stepBank(rt.tex, qnt.tex, probTok(powerOf(notP(q), params.n)).tex, probTok(notP(powerOf(q, params.n - 1))).tex),
        },
      ],
    };
  },
  solution: (params) => {
    const q = atLeastQ(params);
    const qn = powerOf(q, params.n);
    return [
      { text: '"At least one" covers every outcome except one: the one where it never happens. So work out that one and take it from $1$.' },
      { tex: `P(\\text{never}) = \\left(${probTok(q).tex}\\right)^{${params.n}} = ${probTok(qn).tex}` },
      { tex: `P(\\text{at least one}) = 1 - ${probTok(qn).tex} = ${probTok(notP(qn)).tex}` },
    ];
  },
};

/** The flow's "at least one" events, over coins and dice. */
const FLOW_EVENTS = [
  { trial: 'A fair coin is flipped', q: [1, 2] as Frac, what: 'head', whats: 'heads', goes: 'flips' },
  { trial: 'A fair six-sided die is rolled', q: [5, 6] as Frac, what: 'six', whats: 'sixes', goes: 'rolls' },
  { trial: 'A fair four-sided die is rolled', q: [3, 4] as Frac, what: '4', whats: '4s', goes: 'rolls' },
  { trial: 'A fair spinner with 3 equal sectors, one of them red, is spun', q: [2, 3] as Frac, what: 'red', whats: 'reds', goes: 'spins' },
  { trial: 'A fair eight-sided die is rolled', q: [7, 8] as Frac, what: '1', whats: '1s', goes: 'rolls' },
  { trial: 'A fair spinner with 5 equal sectors, one of them gold, is spun', q: [4, 5] as Frac, what: 'gold', whats: 'golds', goes: 'spins' },
  { trial: 'A card is picked from ten cards numbered 1 to 10 and put back', q: [9, 10] as Frac, what: '10', whats: '10s', goes: 'picks' },
] as const;

interface ComplementFlowParams {
  context: number;
  n: number;
  /** "at least one X", or "not every trial gives X". */
  form: 'atLeast' | 'notAll';
}

function complementFlowValues({ context, n, form }: ComplementFlowParams): { comp: Frac; event: Frac; slips: Frac[] } {
  const [a, b] = FLOW_EVENTS[context].q;
  const none: Frac = [a ** n, b ** n];
  const all: Frac = [(b - a) ** n, b ** n];
  const comp = form === 'atLeast' ? none : all;
  const other = form === 'atLeast' ? all : none;
  return {
    comp,
    event: [comp[1] - comp[0], comp[1]],
    slips: [other, [n * (b - a), b], [b - a, b]],
  };
}

/** Name the complement, find its probability, take it from 1. */
const complementFlow: Generator<ComplementFlowParams> = {
  id: 'prob-complement-flow',
  sample: (rng, difficulty) => {
    const context = rng.int(0, FLOW_EVENTS.length - 1);
    const n = difficulty > 1 ? rng.int(3, context === 0 ? 5 : 4) : rng.int(2, context === 0 ? 4 : 3);
    return { context, n, form: rng.pick(['atLeast', 'notAll'] as const) };
  },
  render: (params): Slide => {
    const ctx = FLOW_EVENTS[params.context];
    const { comp, event, slips } = complementFlowValues(params);
    const salt = saltOf(params);
    const event0 = params.form === 'atLeast' ? `at least one ${ctx.what}` : `not all ${ctx.whats}`;
    const noneText = `No ${ctx.whats} at all`;
    const allText = `Every result a ${ctx.what}`;
    const oneText = `Exactly one ${ctx.what}`;
    const right = params.form === 'atLeast' ? noneText : allText;
    const [a, b] = ctx.q;
    const unique = (fracs: Frac[]) => [...new Set(fracs.map((f) => `$${ftex(f)}$`))].slice(0, 3);
    const compValues = unique([comp, ...slips, [1, b ** params.n]]);
    const eventValues = unique([event, comp, [a, b], [b - a, b]]);
    const goes = ctx.goes;
    return {
      kind: 'flow',
      prompt: [say(`${ctx.trial} ${params.n} times. Work out the probability of ${event0} by way of its complement.`)],
      subject: `P(\\text{${event0}})`,
      steps: [
        {
          id: 'name',
          ask: `What is the complement of ${event0}?`,
          branches: turn(
            [
              { label: right, to: 'comp' },
              { label: params.form === 'atLeast' ? allText : noneText, outcome: 'That is only one of the outcomes the event leaves out. The complement is everything the event does not cover.' },
              { label: oneText, outcome: `Exactly one ${ctx.what} is part of the event itself, not its complement.` },
            ],
            salt,
          ),
        },
        {
          id: 'comp',
          ask: `What is the probability of ${right.toLowerCase()} in ${params.n} ${goes}?`,
          branches: turn(
            compValues.map((label, i) =>
              i === 0
                ? { label, to: 'take' }
                : { label, outcome: 'Not quite. The trials are independent, so multiply the probability of the complement on each one.' },
            ),
            salt >> 3,
          ),
        },
        {
          id: 'take',
          ask: `So what is the probability of ${event0}?`,
          branches: turn(
            eventValues.map((label, i) =>
              i === 0
                ? { label, outcome: 'Right: one minus the probability of the complement.' }
                : { label, outcome: 'Not quite. The event is everything except its complement, so take the complement from 1.' },
            ),
            salt >> 6,
          ),
        },
      ],
      answer: [right, compValues[0], eventValues[0]],
    };
  },
  solution: (params) => {
    const ctx = FLOW_EVENTS[params.context];
    const { comp, event } = complementFlowValues(params);
    const [a, b] = ctx.q;
    const each = params.form === 'atLeast' ? ftex([a, b]) : ftex([b - a, b]);
    return [
      {
        text:
          params.form === 'atLeast'
            ? `"At least one ${ctx.what}" fails only when there are no ${ctx.whats} at all.`
            : `"Not every result a ${ctx.what}" fails only when every result is a ${ctx.what}.`,
      },
      { tex: `P(\\text{complement}) = \\left(${each}\\right)^{${params.n}} = ${ftex(comp)}` },
      { tex: `P = 1 - ${ftex(comp)} = ${ftex(event)}` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 4: two-way tables
 * ================================================================ */

export const TWO_WAY = [
  { who: 'students', one: 'student', rows: ['Year 10', 'Year 11'], cols: ['Walk', 'Bus'], rowAre: ['are in Year 10', 'are in Year 11'], rowIs: ['is in Year 10', 'is in Year 11'], colIs: ['walks to school', 'takes the bus'] },
  { who: 'people', one: 'person', rows: ['Adult', 'Child'], cols: ['Swim', 'Cycle'], rowAre: ['are adults', 'are children'], rowIs: ['is an adult', 'is a child'], colIs: ['chose swimming', 'chose cycling'] },
  { who: 'members', one: 'member', rows: ['Men', 'Women'], cols: ['Tennis', 'Golf'], rowAre: ['are men', 'are women'], rowIs: ['is a man', 'is a woman'], colIs: ['plays tennis', 'plays golf'] },
  { who: 'visitors', one: 'visitor', rows: ['Saturday', 'Sunday'], cols: ['Cafe', 'Shop'], rowAre: ['came on Saturday', 'came on Sunday'], rowIs: ['came on Saturday', 'came on Sunday'], colIs: ['used the cafe', 'used the shop'] },
  { who: 'pupils', one: 'pupil', rows: ['Boys', 'Girls'], cols: ['Maths', 'Art'], rowAre: ['are boys', 'are girls'], rowIs: ['is a boy', 'is a girl'], colIs: ['chose Maths', 'chose Art'] },
  { who: 'trains', one: 'train', rows: ['AM', 'PM'], cols: ['On time', 'Late'], rowAre: ['ran in the morning', 'ran in the evening'], rowIs: ['ran in the morning', 'ran in the evening'], colIs: ['was on time', 'was late'] },
] as const;

/** Cells in reading order: [a, b] over [c, d]. */
export interface TwoWayParams {
  context: number;
  cells: [number, number, number, number];
  /** Which row and column a question is about. */
  row: number;
  col: number;
  hard: boolean;
}

export function twoWayTotals({ cells: [a, b, c, d] }: TwoWayParams) {
  return { rows: [a + b, c + d], cols: [a + c, b + d], total: a + b + c + d };
}

function twoWayTex(params: TwoWayParams, totals: boolean): string {
  const ctx = TWO_WAY[params.context];
  const [a, b, c, d] = params.cells;
  const t = twoWayTotals(params);
  const head = `& \\text{${ctx.cols[0]}} & \\text{${ctx.cols[1]}}${totals ? ' & \\text{Total}' : ''}`;
  const row = (name: string, x: number, y: number, s: number) => `\\text{${name}} & ${x} & ${y}${totals ? ` & ${s}` : ''}`;
  const lines = [head, `\\hline ${row(ctx.rows[0], a, b, t.rows[0])}`, row(ctx.rows[1], c, d, t.rows[1])];
  if (totals) lines.push(`\\hline \\text{Total} & ${t.cols[0]} & ${t.cols[1]} & ${t.total}`);
  // A size down: a row label, two columns and a total run past a phone at full size.
  return `{\\small \\begin{array}{l|cc${totals ? '|c' : ''}} ${lines.join(' \\\\ ')} \\end{array}}`;
}

function sampleTwoWay(rng: Rng, difficulty: number): TwoWayParams {
  const hard = difficulty > 1;
  const cells = [0, 1, 2, 3].map(() => (hard ? rng.int(5, 40) : rng.int(2, 20))) as [number, number, number, number];
  return { context: rng.int(0, TWO_WAY.length - 1), cells, row: rng.int(0, 1), col: rng.int(0, 1), hard };
}

/** Fill the gaps: at difficulty 1 from one row total, at 2 from the grand total. */
const twoWayFill: Generator<TwoWayParams> = {
  id: 'prob-twoway-fill',
  sample: sampleTwoWay,
  render: (params): Slide => {
    const ctx = TWO_WAY[params.context];
    const [a, b, c, d] = params.cells;
    const t = twoWayTotals(params);
    const head = ['', `\\text{${ctx.cols[0]}}`, `\\text{${ctx.cols[1]}}`];
    if (!params.hard) {
      const answer = [d, t.cols[0], t.cols[1]].map(dec);
      return {
        kind: 'table',
        prompt: [say(`The table shows how ${t.total} ${ctx.who} split. ${t.rows[1]} of them ${ctx.rowAre[1]}. Fill in the gaps.`)],
        columns: head,
        rows: [
          [`\\text{${ctx.rows[0]}}`, `${a}`, `${b}`],
          [`\\text{${ctx.rows[1]}}`, `${c}`, null],
          ['\\text{Total}', null, null],
        ],
        bank: bank(answer, [dec(a + b), dec(t.rows[1]), dec(c + d + 1), dec(t.cols[0] - 1), dec(b + c)]),
        answer: answer.map((x) => x.tex),
      };
    }
    const answer = [b, c, t.cols[1]].map(dec);
    return {
      kind: 'table',
      prompt: [say(`There are ${t.total} ${ctx.who} altogether. Fill in the gaps in the table.`)],
      columns: head,
      rows: [
        [`\\text{${ctx.rows[0]}}`, `${a}`, null],
        [`\\text{${ctx.rows[1]}}`, null, `${d}`],
        ['\\text{Total}', `${t.cols[0]}`, null],
      ],
      bank: bank(answer, [dec(t.total - d), dec(t.cols[0] + a), dec(t.total - t.cols[0] - a), dec(b + 10), dec(c + 10)]),
      answer: answer.map((x) => x.tex),
    };
  },
  solution: (params) => {
    const ctx = TWO_WAY[params.context];
    const [a, b, c, d] = params.cells;
    const t = twoWayTotals(params);
    if (!params.hard) {
      return [
        { text: `The ${ctx.rows[1]} row adds up to ${t.rows[1]}: $${t.rows[1]} - ${c} = ${d}$.` },
        { tex: `\\text{${ctx.cols[0]}}: ${a} + ${c} = ${t.cols[0]}, \\quad \\text{${ctx.cols[1]}}: ${b} + ${d} = ${t.cols[1]}` },
      ];
    }
    return [
      { text: `The column totals add up to ${t.total}: $${t.total} - ${t.cols[0]} = ${t.cols[1]}$.` },
      { tex: `${t.cols[1]} - ${d} = ${b}, \\quad ${t.cols[0]} - ${a} = ${c}` },
    ];
  },
};

/** What a two-way question asks about: one cell, a row or a column. */
function twoWayAsk(params: TwoWayParams): { fav: number; text: string } {
  const ctx = TWO_WAY[params.context];
  const [a, b, c, d] = params.cells;
  const t = twoWayTotals(params);
  if (!params.hard) {
    return { fav: [a, b, c, d][2 * params.row + params.col], text: `${ctx.rowIs[params.row]} and ${ctx.colIs[params.col]}` };
  }
  return { fav: t.cols[params.col], text: ctx.colIs[params.col] };
}

/** A cell, or at difficulty 2 a column read from a table without totals, over the total. */
const twoWayCell: Generator<TwoWayParams> = {
  id: 'prob-twoway-cell',
  sample: sampleTwoWay,
  render: (params): Slide => {
    const ctx = TWO_WAY[params.context];
    const { fav, text } = twoWayAsk(params);
    return probSlide(
      [
        say(`The table shows ${twoWayTotals(params).total} ${ctx.who}.`),
        show(twoWayTex(params, !params.hard)),
        say(`One ${ctx.one} is chosen at random. Find the probability that the ${ctx.one} ${text}.`),
      ],
      'P =',
      fans([fav, twoWayTotals(params).total]),
    );
  },
  solution: (params) => {
    const ctx = TWO_WAY[params.context];
    const { fav, text } = twoWayAsk(params);
    const t = twoWayTotals(params);
    const steps: SolutionStep[] = [{ text: `Every one of the ${t.total} ${ctx.who} is equally likely to be chosen.` }];
    if (params.hard) steps.push({ text: `Add down the column: $${params.cells[params.col]} + ${params.cells[2 + params.col]} = ${fav}$ ${text}.` });
    else steps.push({ text: `The cell for "${text}" holds $${fav}$.` });
    steps.push({ tex: `P = ${rawTex([fav, t.total])}${gcd(fav, t.total) > 1 ? ` = ${ftex([fav, t.total])}` : ''}` });
    return steps;
  },
  choices: (params) => {
    const { fav } = twoWayAsk(params);
    const t = twoWayTotals(params);
    return probChoices(
      fr([fav, t.total]),
      [fr([fav, t.rows[params.row]]), fr([fav, t.cols[params.col]]), fr([t.rows[params.row], t.total]), fr([fav, t.total - fav])],
      saltOf(params),
    );
  },
};

/** Row totals, the grand total, then P(a row), as a tree. */
const twoWayTree: Generator<TwoWayParams> = {
  id: 'prob-twoway-tree',
  sample: sampleTwoWay,
  render: (params): Slide => {
    const ctx = TWO_WAY[params.context];
    const t = twoWayTotals(params);
    const byCols = params.hard;
    const parts = byCols ? t.cols : t.rows;
    const which = byCols ? params.col : params.row;
    const names = byCols ? ctx.cols : ctx.rows;
    const said = byCols ? ctx.colIs[which] : ctx.rowIs[which];
    const answer = [dec(parts[0]), dec(parts[1]), dec(t.total), fr([parts[which], t.total])];
    const [a, b, c, d] = params.cells;
    return {
      kind: 'tree',
      prompt: [
        show(twoWayTex(params, false)),
        say(
          `One ${ctx.one} is chosen at random. Find the probability that the ${ctx.one} ${said}. Top row: the ${names[0]} total, then the ${names[1]} total. Then the total of everyone, then the probability.`,
        ),
      ],
      expression: `P = \\frac{\\text{${names[which]}}}{\\text{Total}}`,
      nodes: [
        { id: 'p0', from: [] },
        { id: 'p1', from: [] },
        { id: 'n', from: ['p0', 'p1'] },
        { id: 'p', from: ['n'] },
      ],
      bank: bank(answer, [
        dec(byCols ? a + b : a + c),
        dec(byCols ? c + d : b + d),
        fr([parts[1 - which], t.total]),
        fr([parts[which], parts[1 - which]]),
        dec(t.total + 1),
      ]),
      answer: answer.map((x) => x.tex),
    };
  },
  solution: (params) => {
    const ctx = TWO_WAY[params.context];
    const t = twoWayTotals(params);
    const [a, b, c, d] = params.cells;
    const byCols = params.hard;
    const which = byCols ? params.col : params.row;
    const parts = byCols ? t.cols : t.rows;
    return [
      byCols
        ? { tex: `\\text{${ctx.cols[0]}}: ${a} + ${c} = ${t.cols[0]}, \\quad \\text{${ctx.cols[1]}}: ${b} + ${d} = ${t.cols[1]}` }
        : { tex: `\\text{${ctx.rows[0]}}: ${a} + ${b} = ${t.rows[0]}, \\quad \\text{${ctx.rows[1]}}: ${c} + ${d} = ${t.rows[1]}` },
      { tex: `${parts[0]} + ${parts[1]} = ${t.total}` },
      { tex: `P = ${rawTex([parts[which], t.total])}${gcd(parts[which], t.total) > 1 ? ` = ${ftex([parts[which], t.total])}` : ''}` },
    ];
  },
};

/** Which fraction of the table answers the question: the denominator is the skill. */
const twoWayWhich: Generator<TwoWayParams> = {
  id: 'prob-twoway-which',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleTwoWay(rng, difficulty);
      const { fav } = twoWayAsk(params);
      const t = twoWayTotals(params);
      const values = [fav / t.total, fav / t.rows[params.row], fav / t.cols[params.col], t.rows[params.row] / t.total];
      if (new Set(values.map((v) => v.toFixed(9))).size < 4) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const ctx = TWO_WAY[params.context];
    const t = twoWayTotals(params);
    const [a, b, c, d] = params.cells;
    const cell = [a, b, c, d][2 * params.row + params.col];
    const prompt = [show(twoWayTex(params, true))];
    if (!params.hard) {
      prompt.push(say(`One ${ctx.one} is chosen at random. Which gives the probability that the ${ctx.one} ${ctx.rowIs[params.row]} and ${ctx.colIs[params.col]}?`));
      return pickSlide(
        prompt,
        rawTex([cell, t.total]),
        [rawTex([cell, t.rows[params.row]]), rawTex([cell, t.cols[params.col]]), rawTex([t.rows[params.row], t.total])],
        saltOf(params),
        true,
      );
    }
    prompt.push(say(`One ${ctx.one} is chosen at random. Which gives the probability that the ${ctx.one} ${ctx.rowIs[params.row]}?`));
    return pickSlide(
      prompt,
      rawTex([t.rows[params.row], t.total]),
      [rawTex([cell, t.total]), rawTex([t.rows[params.row], t.rows[1 - params.row]]), rawTex([t.cols[params.col], t.total])],
      saltOf(params),
      true,
    );
  },
  solution: (params) => {
    const ctx = TWO_WAY[params.context];
    const t = twoWayTotals(params);
    const [a, b, c, d] = params.cells;
    const cell = [a, b, c, d][2 * params.row + params.col];
    if (!params.hard) {
      return [
        { text: `The ${ctx.one} is chosen from all ${t.total}, so the bottom of the fraction is the grand total.` },
        { text: `Being both "${ctx.rowIs[params.row]}" and "${ctx.colIs[params.col]}" is one cell: $${cell}$.` },
        { tex: `P = ${rawTex([cell, t.total])}` },
      ];
    }
    return [
      { text: `Everyone in the ${ctx.rows[params.row]} row counts, whichever column they are in: $${t.rows[params.row]}$.` },
      { tex: `P = ${rawTex([t.rows[params.row], t.total])}` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 5: relative frequency and the expected number
 * ================================================================ */

const EXPERIMENTS = [
  { setup: (n: number, k: number) => `A drawing pin is dropped ${n} times and lands point up ${k} times.`, next: 'it lands point up next time', short: 'point up', will: 'land point up' },
  { setup: (n: number, k: number) => `A biased coin is flipped ${n} times and lands heads ${k} times.`, next: 'the next flip is heads', short: 'heads', will: 'land heads' },
  { setup: (n: number, k: number) => `A basketball player takes ${n} shots and scores with ${k} of them.`, next: 'the next shot scores', short: 'scores', will: 'score' },
  { setup: (n: number, k: number) => `${n} seeds are planted and ${k} of them grow.`, next: 'a seed from the same packet grows', short: 'grows', will: 'grow' },
  { setup: (n: number, k: number) => `A piece of toast is dropped ${n} times and lands butter side down ${k} times.`, next: 'it lands butter side down', short: 'butter down', will: 'land butter side down' },
  { setup: (n: number, k: number) => `Of ${n} buses one week, ${k} were late.`, next: 'the next bus is late', short: 'late', will: 'be late' },
] as const;

const SPIN_COLOURS = ['Red', 'Blue', 'Green', 'Yellow'] as const;

type RelFreqParams =
  | { kind: 'one'; context: number; n: number; k: number }
  | { kind: 'table'; freqs: number[]; ask: number; not: boolean };

function relFreqAnswer(params: RelFreqParams): Frac {
  if (params.kind === 'one') return [params.k, params.n];
  const n = params.freqs.reduce((s, f) => s + f, 0);
  const f = params.freqs[params.ask];
  return [params.not ? n - f : f, n];
}

/** An estimate from an experiment: how often it happened over how often it was tried. */
const relFreq: Generator<RelFreqParams> = {
  id: 'prob-rel-freq',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      const n = rng.pick([20, 25, 40, 50, 80, 100, 200]);
      return { kind: 'one', context: rng.int(0, EXPERIMENTS.length - 1), n, k: rng.int(Math.ceil(n / 10), n - Math.ceil(n / 10)) };
    }
    for (;;) {
      const freqs = SPIN_COLOURS.map(() => rng.int(5, 40));
      const n = freqs.reduce((s, f) => s + f, 0);
      if (n % 10 !== 0 && n % 25 !== 0) continue;
      return { kind: 'table', freqs, ask: rng.int(0, 3), not: rng.chance(0.5) };
    }
  },
  render: (params): Slide => {
    const [top, bottom] = relFreqAnswer(params);
    if (params.kind === 'one') {
      const ctx = EXPERIMENTS[params.context];
      return probSlide(
        [say(`${ctx.setup(params.n, params.k)} Estimate the probability that ${ctx.next}.`)],
        `P(\\text{${ctx.short}}) \\approx`,
        fans([top, bottom]),
      );
    }
    const colour = SPIN_COLOURS[params.ask];
    return probSlide(
      [
        say(`A spinner is spun ${bottom} times. The results are:`),
        show(
          `\\begin{array}{l|c} \\text{Colour} & \\text{Frequency} \\\\ \\hline ${SPIN_COLOURS.map((c, i) => `\\text{${c}} & ${params.freqs[i]}`).join(' \\\\ ')} \\end{array}`,
        ),
        say(`Estimate the probability that the next spin is ${params.not ? `**not** ${colour.toLowerCase()}` : colour.toLowerCase()}.`),
      ],
      `P(\\text{${params.not ? 'not ' : ''}${colour.toLowerCase()}}) \\approx`,
      fans([top, bottom]),
    );
  },
  solution: (params) => {
    const [top, bottom] = relFreqAnswer(params);
    const steps: SolutionStep[] = [{ text: 'With no way to count equally likely outcomes, the best estimate is the relative frequency: how often it happened over how many trials.' }];
    if (params.kind === 'table') {
      steps.push({ tex: `\\text{Trials} = ${params.freqs.join(' + ')} = ${bottom}` });
      if (params.not) steps.push({ tex: `${bottom} - ${params.freqs[params.ask]} = ${top}` });
    }
    steps.push({ tex: `P \\approx ${rawTex([top, bottom])} ${aboutTex(top / bottom)}` });
    return steps;
  },
};

const EXPECT_FAIR = [
  { what: (n: number) => `A fair six-sided die is rolled ${n} times.`, ask: 'sixes', p: [1, 6] as Frac },
  { what: (n: number) => `A fair coin is flipped ${n} times.`, ask: 'heads', p: [1, 2] as Frac },
  { what: (n: number) => `A fair spinner with 5 equal sectors, 2 of them red, is spun ${n} times.`, ask: 'reds', p: [2, 5] as Frac },
  { what: (n: number) => `A fair four-sided die is rolled ${n} times.`, ask: '1s', p: [1, 4] as Frac },
  { what: (n: number) => `A card is picked at random from ten cards numbered 1 to 10, and put back, ${n} times.`, ask: 'multiples of 3', p: [3, 10] as Frac },
] as const;

const EXPECT_DECIMAL = [
  { what: (p: string, n: number) => `The probability that a bus is late is ${p}. Over ${n} journeys`, ask: 'late buses' },
  { what: (p: string, n: number) => `The probability that a light bulb is faulty is ${p}. In a batch of ${n} bulbs`, ask: 'faulty bulbs' },
  { what: (p: string, n: number) => `The probability that a seed grows is ${p}. From ${n} seeds`, ask: 'seeds to grow' },
  { what: (p: string, n: number) => `The probability that a customer pays by card is ${p}. Out of ${n} customers`, ask: 'card payments' },
] as const;

type ExpectedParams =
  | { kind: 'fair'; context: number; n: number }
  | { kind: 'dec'; context: number; p: number; n: number }
  | { kind: 'trial'; context: number; n1: number; k: number; n2: number };

function expectedValue(params: ExpectedParams): number {
  if (params.kind === 'fair') {
    const [a, b] = EXPECT_FAIR[params.context].p;
    return (params.n * a) / b;
  }
  if (params.kind === 'dec') return Math.round(params.p * params.n);
  return (params.n2 * params.k) / params.n1;
}

/** The expected number, n times p, from a fair object, a stated probability, or a trial. */
const expected: Generator<ExpectedParams> = {
  id: 'prob-expected',
  sample: (rng, difficulty) => {
    if (difficulty <= 1) {
      if (rng.chance(0.5)) {
        const context = rng.int(0, EXPECT_FAIR.length - 1);
        const b = EXPECT_FAIR[context].p[1];
        return { kind: 'fair', context, n: b * rng.int(3, 30) };
      }
      return { kind: 'dec', context: rng.int(0, EXPECT_DECIMAL.length - 1), p: rng.int(1, 19) / 20, n: 20 * rng.int(1, 15) };
    }
    for (;;) {
      const n1 = rng.pick([20, 25, 40, 50, 80, 100]);
      const k = rng.int(2, n1 - 2);
      const n2 = rng.pick([150, 200, 300, 400, 500, 1000, 2000]);
      if ((n2 * k) % n1 !== 0) continue;
      return { kind: 'trial', context: rng.int(0, EXPERIMENTS.length - 1), n1, k, n2 };
    }
  },
  render: (params): Slide => {
    const value = expectedValue(params);
    if (params.kind === 'fair') {
      const ctx = EXPECT_FAIR[params.context];
      return countSlide([say(`${ctx.what(params.n)} How many ${ctx.ask} would you expect?`)], '\\text{Expected number} =', value);
    }
    if (params.kind === 'dec') {
      const ctx = EXPECT_DECIMAL[params.context];
      return countSlide([say(`${ctx.what(`$${fmt(params.p)}$`, params.n)}, how many ${ctx.ask} would you expect?`)], '\\text{Expected number} =', value);
    }
    const ctx = EXPERIMENTS[params.context];
    return countSlide(
      [say(`${ctx.setup(params.n1, params.k)} Using this as an estimate, how many of the next ${params.n2} would you expect to ${ctx.will}?`)],
      '\\text{Expected number} =',
      value,
    );
  },
  solution: (params) => {
    const value = expectedValue(params);
    if (params.kind === 'fair') {
      const p = EXPECT_FAIR[params.context].p;
      return [{ text: 'Expected number = number of trials times the probability.' }, { tex: `${params.n} \\times ${ftex(p)} = ${value}` }];
    }
    if (params.kind === 'dec') {
      return [{ text: 'Expected number = number of trials times the probability.' }, { tex: `${params.n} \\times ${fmt(params.p)} = ${value}` }];
    }
    return [
      { text: 'Estimate the probability from the trial first.' },
      { tex: `P \\approx ${rawTex([params.k, params.n1])}` },
      { tex: `${params.n2} \\times ${rawTex([params.k, params.n1])} = ${value}` },
    ];
  },
  choices: (params) => {
    const value = expectedValue(params);
    const n = params.kind === 'trial' ? params.n2 : params.n;
    const wrong = [n - value, value * 2, Math.round(value / 2), value + 10];
    return probChoices(dec(value), wrong.map(dec), saltOf(params));
  },
};

const SPIN_OUTCOMES = [
  ['red', 'blue', 'green', 'yellow'],
  ['A', 'B', 'C', 'D'],
  ['north', 'east', 'south', 'west'],
  ['1', '2', '3', '4'],
] as const;

interface ExpectedTreeParams {
  context: number;
  /** Given probabilities in hundredths; the last outcome is the one asked about. */
  given: number[];
  n: number;
}

/** The missing probability from the others, then how many to expect. */
const expectedTree: Generator<ExpectedTreeParams> = {
  id: 'prob-missing-expected',
  sample: (rng, difficulty) => {
    const count = difficulty > 1 ? 3 : 2;
    for (;;) {
      const given = Array.from({ length: count }, () => 5 * rng.int(1, 8));
      const left = 100 - given.reduce((s, g) => s + g, 0);
      if (left < 5 || left > 80) continue;
      const n = rng.pick([40, 60, 80, 100, 120, 200, 300, 400, 500]);
      if ((n * left) % 100 !== 0) continue;
      return { context: rng.int(0, SPIN_OUTCOMES.length - 1), given, n };
    }
  },
  render: ({ context, given, n }): Slide => {
    const names = SPIN_OUTCOMES[context];
    const last = names[given.length];
    const sum = given.reduce((s, g) => s + g, 0) / 100;
    const left = hundredths(1 - sum);
    const answer = [dec(sum), dec(left), dec(Math.round(n * left))];
    const shown = given.map((g, i) => `P(\\text{${names[i]}}) = ${fmt(g / 100)}`).join(', \\quad ');
    return {
      kind: 'tree',
      prompt: [
        say(`A biased spinner can land on ${listing(names.slice(0, given.length + 1).map(String))}, and nothing else.`),
        show(shown),
        say(`It is spun ${n} times. How many times would you expect ${last}? First add the probabilities you know, then find $P(\\text{${last}})$, then the expected number.`),
      ],
      expression: `${n} \\times P(\\text{${last}})`,
      nodes: [
        { id: 's', from: [] },
        { id: 'p', from: ['s'] },
        { id: 'e', from: ['p'] },
      ],
      bank: bank(answer, [dec(Math.round(n * sum)), dec(hundredths(1 + sum)), dec(left + 0.05), dec(Math.round(n * (left + 0.05))), dec(n / (given.length + 1))]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: ({ context, given, n }) => {
    const names = SPIN_OUTCOMES[context];
    const last = names[given.length];
    const sum = given.reduce((s, g) => s + g, 0) / 100;
    const left = hundredths(1 - sum);
    return [
      { text: 'The probabilities of every outcome add up to $1$.' },
      { tex: `${given.map((g) => fmt(g / 100)).join(' + ')} = ${fmt(sum)}` },
      { tex: `P(\\text{${last}}) = 1 - ${fmt(sum)} = ${fmt(left)}` },
      { tex: `${n} \\times ${fmt(left)} = ${fmt(n * left)}` },
    ];
  },
};

type MethodParams =
  | { kind: 'fair'; object: 'die' | 'spinner'; m: number; k: number; n2: number }
  | { kind: 'trial'; context: number; n: number; k: number; n2: number };

function methodP(params: MethodParams): Frac {
  if (params.kind === 'fair') return params.object === 'die' ? [6 - params.k, 6] : [params.k, params.m];
  return [params.k, params.n];
}

/**
 * Count or estimate: equally likely outcomes give favourable over total;
 * anything else needs an experiment. Difficulty 2 carries on to the
 * expected number.
 */
const methodFlow: Generator<MethodParams> = {
  id: 'prob-method-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const n2 = difficulty > 1 ? rng.pick([60, 100, 120, 200, 300, 600]) : 0;
      const params: MethodParams = rng.chance(0.5)
        ? rng.chance(0.5)
          ? { kind: 'fair', object: 'die', m: 6, k: rng.int(1, 4), n2 }
          : (() => {
              const m = rng.pick([4, 5, 8, 10]);
              return { kind: 'fair' as const, object: 'spinner' as const, m, k: rng.int(1, m - 1), n2 };
            })()
        : (() => {
            const n = rng.pick([20, 40, 50, 100]);
            return { kind: 'trial' as const, context: rng.int(0, EXPERIMENTS.length - 1), n, k: rng.int(3, n - 3), n2 };
          })();
      const p = methodP(params);
      if (n2 && (n2 * p[0]) % p[1] !== 0) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const p = methodP(params);
    const salt = saltOf(params);
    const scene =
      params.kind === 'fair'
        ? params.object === 'die'
          ? `A fair six-sided die is rolled. Find the probability that it shows more than ${params.k}.`
          : `A fair spinner has ${params.m} equal sectors, ${params.k} of them shaded. Find the probability that it lands on a shaded sector.`
        : `${EXPERIMENTS[params.context].setup(params.n, params.k)} Find the probability that ${EXPERIMENTS[params.context].next}.`;
    const subject =
      params.kind === 'fair'
        ? params.object === 'die'
          ? `P(\\text{more than ${params.k}})`
          : 'P(\\text{shaded})'
        : `P(\\text{${EXPERIMENTS[params.context].short}})`;
    const counts = params.kind === 'fair';
    const valueBranches = (id: 'count' | 'estimate', next?: string) => {
      const wrong: Frac[] =
        params.kind === 'fair' ? [[p[0], p[1] - p[0]], [1, p[1]]] : [[params.k, params.n - params.k], [1, 2]];
      const labels = [...new Set([p, ...wrong].map((f) => `$${ftex(f)}$`))];
      // On the wrong method's fork no value is right: the path already went astray.
      const onPath = (id === 'count') === counts;
      const astray = counts
        ? 'A fair object needs no experiment: its equally likely outcomes can be counted.'
        : 'These outcomes are not equally likely, so there is nothing to count: the experiment gives the estimate.';
      return {
        id,
        ask: id === 'count' ? 'Favourable over total: what is the probability?' : 'How often it happened over how many trials: what is the estimate?',
        branches: turn(
          labels.map((label, i) =>
            !onPath
              ? { label, outcome: astray }
              : i === 0
                ? next
                  ? { label, to: next }
                  : { label, outcome: 'Right.' }
                : { label, outcome: 'Check what goes on the bottom: every outcome, or every trial.' },
          ),
          salt >> 4,
        ),
      };
    };
    const n2 = params.n2;
    const e = n2 ? (n2 * p[0]) / p[1] : 0;
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [
      {
        id: 'equal',
        ask: 'Can the outcomes be listed as equally likely?',
        branches: turn(
          [
            { label: 'Yes', to: 'count' },
            { label: 'No', to: 'estimate' },
          ],
          salt,
        ),
      },
      valueBranches('count', n2 ? 'expect' : undefined),
      valueBranches('estimate', n2 ? 'expect' : undefined),
    ];
    if (n2) {
      steps.push({
        id: 'expect',
        ask: `How many times would you expect it in ${n2} more goes?`,
        branches: turn(
          [...new Set([e, n2 - e, e * 2, e + 10])].slice(0, 3).map((value, i) =>
            i === 0
              ? { label: `$${value}$`, outcome: 'Right: trials times probability.' }
              : { label: `$${value}$`, outcome: 'Multiply the number of trials by the probability of the event itself, once.' },
          ),
          salt >> 8,
        ),
      });
    }
    const answer = [params.kind === 'fair' ? 'Yes' : 'No', `$${ftex(p)}$`];
    if (n2) answer.push(`$${e}$`);
    return {
      kind: 'flow',
      prompt: [say(scene), say(n2 ? `Then say how many times you would expect it in ${n2} more goes.` : 'Decide how to find it first.')],
      subject,
      steps,
      answer,
    };
  },
  solution: (params) => {
    const p = methodP(params);
    const steps: SolutionStep[] =
      params.kind === 'fair'
        ? [
            { text: 'A fair object has equally likely outcomes, so count them: favourable over total.' },
            { tex: `P = ${rawTex(p)}${gcd(p[0], p[1]) > 1 ? ` = ${ftex(p)}` : ''}` },
          ]
        : [
            { text: 'There is no list of equally likely outcomes here, so the experiment gives an estimate: the relative frequency.' },
            { tex: `P \\approx ${rawTex(p)}${gcd(p[0], p[1]) > 1 ? ` = ${ftex(p)}` : ''}` },
          ];
    if (params.n2) steps.push({ tex: `${params.n2} \\times ${ftex(p)} = ${(params.n2 * p[0]) / p[1]}` });
    return steps;
  },
};

/* ================================================================
 * Level 2, lesson 1: mutually exclusive events
 * ================================================================ */

/** A property of a card numbered 1 to n. */
export type Prop = { kind: 'even' | 'odd' | 'square' | 'prime' } | { kind: 'mult' | 'gt' | 'lt' | 'factor'; k: number };

export function propTest(prop: Prop, x: number): boolean {
  switch (prop.kind) {
    case 'even':
      return x % 2 === 0;
    case 'odd':
      return x % 2 === 1;
    case 'square':
      return Number.isInteger(Math.sqrt(x));
    case 'prime':
      return x > 1 && Array.from({ length: x - 2 }, (_, i) => i + 2).every((d) => x % d !== 0);
    case 'mult':
      return x % prop.k === 0;
    case 'gt':
      return x > prop.k;
    case 'lt':
      return x < prop.k;
    case 'factor':
      return prop.k % x === 0;
  }
}

function propText(prop: Prop): string {
  switch (prop.kind) {
    case 'even':
      return 'an even number';
    case 'odd':
      return 'an odd number';
    case 'square':
      return 'a square number';
    case 'prime':
      return 'a prime number';
    case 'mult':
      return `a multiple of ${prop.k}`;
    case 'gt':
      return `a number greater than ${prop.k}`;
    case 'lt':
      return `a number less than ${prop.k}`;
    case 'factor':
      return `a factor of ${prop.k}`;
  }
}

export const cardsWith = (n: number, prop: Prop): number[] =>
  Array.from({ length: n }, (_, i) => i + 1).filter((x) => propTest(prop, x));

function sampleProp(rng: Rng, n: number): Prop {
  const kind = rng.pick(['even', 'odd', 'square', 'prime', 'mult', 'mult', 'gt', 'lt', 'factor'] as const);
  if (kind === 'mult') return { kind, k: rng.int(3, 7) };
  if (kind === 'gt') return { kind, k: rng.int(Math.floor(n / 2), n - 2) };
  if (kind === 'lt') return { kind, k: rng.int(3, Math.ceil(n / 2)) };
  if (kind === 'factor') return { kind, k: rng.pick([12, 16, 18, 20, 24, 30]) };
  return { kind };
}

const cap = (text: string): string => `${text[0].toUpperCase()}${text.slice(1)}`;

interface ExclusiveParams {
  n: number;
  a: Prop;
  b: Prop;
}

function exclusiveCounts({ n, a, b }: ExclusiveParams) {
  const inA = cardsWith(n, a);
  const inB = cardsWith(n, b);
  const both = inA.filter((x) => inB.includes(x));
  return { nA: inA.length, nB: inB.length, both };
}

function cardsSentence({ n, a, b }: ExclusiveParams): string {
  return `A card is taken at random from ${n} cards numbered 1 to ${n}. $A$ is the event that it shows ${propText(a)}, and $B$ that it shows ${propText(b)}.`;
}

/** Can they happen together? If not, add. */
const exclusiveFlow: Generator<ExclusiveParams> = {
  id: 'prob-exclusive-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const n = hard ? rng.int(20, 30) : rng.int(10, 20);
      const params = { n, a: sampleProp(rng, n), b: sampleProp(rng, n) };
      const { nA, nB, both } = exclusiveCounts(params);
      if (JSON.stringify(params.a) === JSON.stringify(params.b)) continue;
      if (nA === 0 || nB === 0 || nA === n || nB === n || nA + nB > n) continue;
      if (rng.chance(0.5) !== (both.length === 0)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { n } = params;
    const { nA, nB, both } = exclusiveCounts(params);
    const salt = saltOf(params);
    const exclusive = both.length === 0;
    const sum = `$${ftex([nA + nB, n])}$`;
    const values = [...new Set([sum, `$${ftex([nA * nB, n * n])}$`, `$${ftex([nA + nB, 2 * n])}$`, `$${ftex([Math.abs(nA - nB), n])}$`])].slice(0, 3);
    const shared = exclusive ? '' : `${both[0]} is both, so they can.`;
    return {
      kind: 'flow',
      prompt: [say(cardsSentence(params))],
      subject: 'P(A \\text{ or } B)',
      steps: [
        {
          id: 'together',
          ask: 'Can $A$ and $B$ happen at the same time?',
          branches: turn(
            [
              exclusive
                ? { label: 'Yes', outcome: `Check again: no card from 1 to ${n} is both, so they cannot.` }
                : { label: 'Yes', outcome: `Right: ${shared} They are not mutually exclusive, and adding the two probabilities would count that card twice.` },
              exclusive ? { label: 'No', to: 'add' } : { label: 'No', outcome: `Look again: ${shared}` },
            ],
            salt,
          ),
        },
        {
          id: 'add',
          ask: 'Mutually exclusive, so add. What is $P(A \\text{ or } B)$?',
          branches: turn(
            values.map((label, i) =>
              i === 0
                ? { label, outcome: 'Right: for mutually exclusive events, the probabilities add.' }
                : { label, outcome: 'For events that cannot happen together, add the two probabilities.' },
            ),
            salt >> 5,
          ),
        },
      ],
      answer: exclusive ? ['No', sum] : ['Yes'],
    };
  },
  solution: (params) => {
    const { n } = params;
    const { nA, nB, both } = exclusiveCounts(params);
    if (both.length > 0) {
      return [
        { text: `${cap(propText(params.a))} and ${propText(params.b)} can be the same card: $${both.join(', ')}$.` },
        { text: 'So $A$ and $B$ can happen together: they are not mutually exclusive.' },
      ];
    }
    return [
      { text: `No card from 1 to ${n} is both ${propText(params.a)} and ${propText(params.b)}, so $A$ and $B$ are mutually exclusive.` },
      { tex: `P(A \\text{ or } B) = ${rawTex([nA, n])} + ${rawTex([nB, n])} = ${ftex([nA + nB, n])}` },
    ];
  },
};

const OUTCOME_SETS = [
  { what: 'A spinner lands on red, blue, green or yellow.', names: ['red', 'blue', 'green', 'yellow'] },
  { what: 'A student gets to school by car, bus, bike or walking.', names: ['car', 'bus', 'bike', 'walking'] },
  { what: "Tomorrow's weather will be exactly one of sunny, cloudy, rainy or snowy.", names: ['sunny', 'cloudy', 'rainy', 'snowy'] },
  { what: 'A shopper pays by cash, card, phone or voucher.', names: ['cash', 'card', 'phone', 'voucher'] },
  { what: 'A game ends in a win, a draw, a loss or is abandoned.', names: ['win', 'draw', 'loss', 'abandoned'] },
] as const;

interface AddTilesParams {
  context: number;
  i: number;
  j: number;
  /** Hundredths. */
  pi: number;
  pj: number;
  hard: boolean;
}

/** The addition rule written out: two outcomes of one trial, or neither of them. */
const addTiles: Generator<AddTilesParams> = {
  id: 'prob-add-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const [i, j] = rng.sample([0, 1, 2, 3], 2).sort((x, y) => x - y);
      const pi = hard ? rng.int(5, 60) : 5 * rng.int(1, 12);
      const pj = hard ? rng.int(5, 60) : 5 * rng.int(1, 12);
      if (pi === pj || pi + pj > 90) continue;
      return { context: rng.int(0, OUTCOME_SETS.length - 1), i, j, pi, pj, hard };
    }
  },
  render: ({ context, i, j, pi, pj, hard }): Slide => {
    const ctx = OUTCOME_SETS[context];
    const [a, b] = [pi / 100, pj / 100];
    const shown = [say(ctx.what), show(`P(\\text{${ctx.names[i]}}) = ${fmt(a)}, \\quad P(\\text{${ctx.names[j]}}) = ${fmt(b)}`)];
    const slips = [dec(a * b), dec(Math.abs(a - b)), dec(1 - a), dec(1 - b), dec(a + b + 0.1)];
    if (!hard) {
      const answer = [dec(a), dec(b), dec(a + b)];
      return {
        kind: 'tiles',
        prompt: [...shown, say(`Find the probability that it is ${ctx.names[i]} or ${ctx.names[j]}.`)],
        template: `P(\\text{${ctx.names[i]} or ${ctx.names[j]}}) = {0} + {1} = {2}`,
        answer: answer.map((t) => t.tex),
        bank: bank(answer, slips),
      };
    }
    const answer = [dec(1), dec(a), dec(b), dec(1 - a - b)];
    return {
      kind: 'tiles',
      prompt: [...shown, say(`Find the probability that it is neither ${ctx.names[i]} nor ${ctx.names[j]}.`)],
      template: 'P(\\text{neither}) = {0} - {1} - {2} = {3}',
      answer: answer.map((t) => t.tex),
      bank: bank(answer, [dec(a + b), ...slips]),
    };
  },
  solution: ({ context, i, j, pi, pj, hard }) => {
    const ctx = OUTCOME_SETS[context];
    const [a, b] = [pi / 100, pj / 100];
    const steps: SolutionStep[] = [{ text: `One trial cannot give both ${ctx.names[i]} and ${ctx.names[j]}, so the two are mutually exclusive and their probabilities add.` }];
    steps.push({ tex: `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}` });
    if (hard) steps.push({ text: 'Neither is the complement of that.' }, { tex: `1 - ${fmt(a)} - ${fmt(b)} = ${fmt(1 - a - b)}` });
    return steps;
  },
};

interface MissingParams {
  context: number;
  /** Hundredths for each outcome. */
  probs: number[];
  /** The unknown cell, and at difficulty 2 the cell that is `k` times it. */
  missing: number;
  other: number;
  k: number;
}

function missingTex({ context, probs, missing, other, k }: MissingParams): string {
  const names = OUTCOME_SETS[context].names;
  const cells = probs.map((p, i) => (i === missing ? 'x' : k > 1 && i === other ? `${k}x` : fmt(p / 100)));
  // One row per outcome: four columns side by side run off a phone.
  const rows = names.map((n, i) => `\\text{${cap(n)}} & ${cells[i]}`).join(' \\\\ ');
  return `\\begin{array}{l|c} \\text{Outcome} & P \\\\ \\hline ${rows} \\end{array}`;
}

/** The probabilities of every outcome add up to 1, so the gap is what is left. */
const spinnerMissing: Generator<MissingParams> = {
  id: 'prob-spinner-missing',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const [missing, other] = rng.sample([0, 1, 2, 3], 2);
      const k = hard ? rng.int(2, 3) : 1;
      const x = hard ? rng.int(5, 20) : 0;
      const probs = [0, 0, 0, 0];
      const rest = [0, 1, 2, 3].filter((i) => i !== missing && (!hard || i !== other));
      for (const i of rest) probs[i] = hard ? rng.int(5, 40) : 5 * rng.int(1, 8);
      if (hard) {
        probs[missing] = x;
        probs[other] = k * x;
        const used = probs.reduce((s, p) => s + p, 0);
        // Top the last of the given cells up so the four add to 1.
        probs[rest[rest.length - 1]] += 100 - used;
        if (probs[rest[rest.length - 1]] < 5) continue;
      } else {
        const used = probs.reduce((s, p) => s + p, 0);
        probs[missing] = 100 - used;
        if (probs[missing] < 5) continue;
      }
      return { context: rng.int(0, OUTCOME_SETS.length - 1), probs, missing, other, k };
    }
  },
  render: (params): Slide =>
    probSlide(
      [
        say(`${OUTCOME_SETS[params.context].what} The table gives the probabilities.`),
        show(missingTex(params)),
        say('Find $x$.'),
      ],
      'x =',
      fmt(params.probs[params.missing] / 100),
    ),
  solution: (params) => {
    const { probs, missing, other, k } = params;
    const known = probs.filter((_, i) => i !== missing && (k === 1 || i !== other));
    const sum = known.reduce((s, p) => s + p, 0) / 100;
    const x = probs[missing] / 100;
    if (k === 1) {
      return [
        { text: 'Exactly one outcome happens, so the four probabilities add up to $1$.' },
        { tex: `x = 1 - (${known.map((p) => fmt(p / 100)).join(' + ')}) = 1 - ${fmt(sum)} = ${fmt(x)}` },
      ];
    }
    return [
      { text: 'The four probabilities add up to $1$.' },
      { tex: `${fmt(sum)} + x + ${k}x = 1` },
      { tex: `${k + 1}x = ${fmt(1 - sum)} \\quad \\Rightarrow \\quad x = ${fmt(x)}` },
    ];
  },
  choices: (params) => {
    const { probs, missing, other, k } = params;
    const known = probs.filter((_, i) => i !== missing && (k === 1 || i !== other));
    const sum = known.reduce((s, p) => s + p, 0) / 100;
    return probChoices(dec(probs[missing] / 100), [dec(sum), dec(1 - sum), dec((1 - sum) / k), dec(k * probs[missing] / 100)], saltOf(params));
  },
};

interface ExclusiveChoiceParams {
  n: number;
  pairs: [Prop, Prop][];
  /** At difficulty 2 the question turns round: which pair is not mutually exclusive? */
  reverse: boolean;
}

const pairText = ([a, b]: [Prop, Prop]): string => `${cap(propText(a))} and ${propText(b)}`;

/** Which pair of events cannot happen together? */
const exclusiveChoice: Generator<ExclusiveChoiceParams> = {
  id: 'prob-exclusive-choice',
  sample: (rng, difficulty) => {
    const reverse = difficulty > 1;
    for (;;) {
      const n = reverse ? rng.int(20, 30) : rng.int(10, 20);
      const disjoint: [Prop, Prop][] = [];
      const overlap: [Prop, Prop][] = [];
      const seen = new Set<string>();
      for (let tries = 0; tries < 200 && (disjoint.length < 3 || overlap.length < 3); tries += 1) {
        const pair: [Prop, Prop] = [sampleProp(rng, n), sampleProp(rng, n)];
        const text = pairText(pair);
        if (seen.has(text) || JSON.stringify(pair[0]) === JSON.stringify(pair[1])) continue;
        const inA = cardsWith(n, pair[0]);
        const inB = cardsWith(n, pair[1]);
        if (inA.length === 0 || inB.length === 0 || inA.length === n || inB.length === n) continue;
        seen.add(text);
        (inA.some((x) => inB.includes(x)) ? overlap : disjoint).push(pair);
      }
      const [one, three] = reverse ? [overlap, disjoint] : [disjoint, overlap];
      if (one.length < 1 || three.length < 3) continue;
      return { n, pairs: [one[0], ...three.slice(0, 3)], reverse };
    }
  },
  render: (params): Slide =>
    pickSlide(
      [
        say(
          `A card is taken at random from ${params.n} cards numbered 1 to ${params.n}. Which pair of events is ${params.reverse ? '**not** mutually exclusive' : 'mutually exclusive'}?`,
        ),
      ],
      pairText(params.pairs[0]),
      params.pairs.slice(1).map(pairText),
      saltOf(params),
      false,
    ),
  solution: ({ n, pairs, reverse }) => {
    const [a, b] = pairs[0];
    const both = cardsWith(n, a).filter((x) => propTest(b, x));
    return reverse
      ? [
          { text: `${pairText(pairs[0])} can happen together: $${both.join(', ')}$ ${both.length === 1 ? 'is' : 'are'} both.` },
          { text: 'In each of the other pairs no card from the set is both, so those events are mutually exclusive.' },
        ]
      : [
          { text: `No card from 1 to ${n} is both ${propText(a)} and ${propText(b)}, so those two cannot happen together.` },
          { text: 'Each of the other pairs shares at least one card, so they are not mutually exclusive.' },
        ];
  },
};

/* ================================================================
 * Level 2, lesson 2: the general addition rule and Venn diagrams
 * ================================================================ */

export const VENN = [
  { who: 'students', one: 'student', A: 'F', B: 'T', aText: 'play football', bText: 'play tennis' },
  { who: 'people', one: 'person', A: 'C', B: 'D', aText: 'own a cat', bText: 'own a dog' },
  { who: 'members', one: 'member', A: 'S', B: 'R', aText: 'swim', bText: 'run' },
  { who: 'customers', one: 'customer', A: 'B', B: 'M', aText: 'bought bread', bText: 'bought milk' },
  { who: 'pupils', one: 'pupil', A: 'G', B: 'H', aText: 'study German', bText: 'study History' },
  { who: 'guests', one: 'guest', A: 'T', B: 'C', aText: 'drink tea', bText: 'drink coffee' },
] as const;

type VennAsk = 'A' | 'both' | 'union' | 'onlyA' | 'neither' | 'exactlyOne';

export interface VennParams {
  context: number;
  /** Only A, both, only B, neither. */
  regions: [number, number, number, number];
  ask: VennAsk;
}

export function vennFavourable({ regions: [a, b, c, d], ask }: VennParams): number {
  switch (ask) {
    case 'A':
      return a + b;
    case 'both':
      return b;
    case 'union':
      return a + b + c;
    case 'onlyA':
      return a;
    case 'neither':
      return d;
    case 'exactlyOne':
      return a + c;
  }
}

function vennAskTex({ context, ask }: VennParams): string {
  const { A, B } = VENN[context];
  switch (ask) {
    case 'A':
      return `P(${A})`;
    case 'both':
      return `P(${A} \\cap ${B})`;
    case 'union':
      return `P(${A} \\cup ${B})`;
    case 'onlyA':
      return `P(${A} \\cap ${B}')`;
    case 'neither':
      return `P((${A} \\cup ${B})')`;
    case 'exactlyOne':
      return 'P(\\text{exactly one})';
  }
}

const vennTotal = ({ regions }: VennParams): number => regions.reduce((s, r) => s + r, 0);

/** A probability read off the region counts of a Venn diagram. */
const vennUnion: Generator<VennParams> = {
  id: 'prob-venn-union',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const regions = [0, 1, 2, 3].map(() => (hard ? rng.int(3, 30) : rng.int(2, 15))) as VennParams['regions'];
    const ask = rng.pick(hard ? (['onlyA', 'neither', 'exactlyOne'] as const) : (['A', 'both', 'union'] as const));
    return { context: rng.int(0, VENN.length - 1), regions, ask };
  },
  render: (params): Slide => {
    const ctx = VENN[params.context];
    const total = vennTotal(params);
    return probSlide(
      [
        say(`The Venn diagram shows ${total} ${ctx.who}. $${ctx.A}$ is the set who ${ctx.aText} and $${ctx.B}$ the set who ${ctx.bText}.`),
        picture(vennSvg([ctx.A, ctx.B], params.regions.map(String) as [string, string, string, string])),
        say(`One ${ctx.one} is chosen at random. Find $${vennAskTex(params)}$.`),
      ],
      `${vennAskTex(params)} =`,
      fans([vennFavourable(params), total]),
    );
  },
  solution: (params) => {
    const total = vennTotal(params);
    const fav = vennFavourable(params);
    const [a, b, c, d] = params.regions;
    const which: Record<VennAsk, string> = {
      A: `everything inside the first circle: $${a} + ${b} = ${fav}$`,
      both: `the overlap: $${b}$`,
      union: `everything inside either circle: $${a} + ${b} + ${c} = ${fav}$`,
      onlyA: `the first circle outside the overlap: $${a}$`,
      neither: `everything outside both circles: $${d}$`,
      exactlyOne: `each circle outside the overlap: $${a} + ${c} = ${fav}$`,
    };
    return [
      { text: `Add up the regions: $${a} + ${b} + ${c} + ${d} = ${total}$ in all.` },
      { text: `The favourable ones are ${which[params.ask]}.` },
      { tex: `${vennAskTex(params)} = ${rawTex([fav, total])}${gcd(fav, total) > 1 ? ` = ${ftex([fav, total])}` : ''}` },
    ];
  },
  choices: (params) => {
    const total = vennTotal(params);
    const [a, b, c, d] = params.regions;
    return probChoices(
      fr([vennFavourable(params), total]),
      [fr([a + 2 * b + c, total]), fr([a, total]), fr([a + c, total]), fr([b, total]), fr([d, total]), fr([total - d, total])],
      saltOf(params),
    );
  },
};

interface RuleTilesParams {
  /** Hundredths. */
  pA: number;
  pB: number;
  pAB: number;
  hard: boolean;
}

/** P(A or B) = P(A) + P(B) - P(A and B), or the same rule turned round. */
const vennRuleTiles: Generator<RuleTilesParams> = {
  id: 'prob-venn-rule-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const pA = hard ? rng.int(20, 70) : 5 * rng.int(4, 14);
      const pB = hard ? rng.int(20, 70) : 5 * rng.int(4, 14);
      const pAB = hard ? rng.int(5, 30) : 5 * rng.int(1, 6);
      if (pA === pB || pAB >= Math.min(pA, pB) || pA + pB - pAB > 95) continue;
      return { pA, pB, pAB, hard };
    }
  },
  render: ({ pA, pB, pAB, hard }): Slide => {
    const [a, b, ab] = [pA / 100, pB / 100, pAB / 100];
    const u = (pA + pB - pAB) / 100;
    const slips = [dec(a + b), dec(a * b), dec(u + ab), dec(1 - u), dec(a - ab), dec(b - ab)];
    if (!hard) {
      const answer = [dec(a), dec(b), dec(ab), dec(u)];
      return {
        kind: 'tiles',
        prompt: [say('For two events $A$ and $B$:'), show(`P(A) = ${fmt(a)}, \\quad P(B) = ${fmt(b)}, \\quad P(A \\cap B) = ${fmt(ab)}`), say('Find $P(A \\cup B)$.')],
        template: 'P(A \\cup B) = {0} + {1} - {2} = {3}',
        answer: answer.map((t) => t.tex),
        bank: bank(answer, slips),
      };
    }
    const answer = [dec(a), dec(b), dec(u), dec(ab)];
    return {
      kind: 'tiles',
      prompt: [say('For two events $A$ and $B$:'), show(`P(A) = ${fmt(a)}, \\quad P(B) = ${fmt(b)}, \\quad P(A \\cup B) = ${fmt(u)}`), say('Find $P(A \\cap B)$.')],
      template: 'P(A \\cap B) = {0} + {1} - {2} = {3}',
      answer: answer.map((t) => t.tex),
      bank: bank(answer, slips),
    };
  },
  solution: ({ pA, pB, pAB, hard }) => {
    const [a, b, ab] = [pA / 100, pB / 100, pAB / 100];
    const u = (pA + pB - pAB) / 100;
    const steps: SolutionStep[] = [
      { text: 'Adding $P(A)$ and $P(B)$ counts the overlap twice, so take it off once.' },
      { tex: '\\begin{aligned} P(A \\cup B) = {} & P(A) + P(B) \\\\ & - P(A \\cap B) \\end{aligned}' },
    ];
    if (!hard) steps.push({ text: 'So $P(A \\cup B)$ is' }, { tex: `${fmt(a)} + ${fmt(b)} - ${fmt(ab)} = ${fmt(u)}` });
    else steps.push({ text: 'Swap the union and the overlap round, so $P(A \\cap B)$ is' }, { tex: `${fmt(a)} + ${fmt(b)} - ${fmt(u)} = ${fmt(ab)}` });
    return steps;
  },
};

interface VennTreeParams {
  context: number;
  total: number;
  nA: number;
  nB: number;
  both: number;
  hard: boolean;
}

/** From "how many do each, how many do both" to the regions, then a probability. */
const vennTree: Generator<VennTreeParams> = {
  id: 'prob-venn-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const both = rng.int(2, hard ? 15 : 8);
      const nA = both + rng.int(2, hard ? 25 : 12);
      const nB = both + rng.int(2, hard ? 25 : 12);
      const total = nA + nB - both + rng.int(1, hard ? 20 : 10);
      if (nA === nB) continue;
      return { context: rng.int(0, VENN.length - 1), total, nA, nB, both, hard };
    }
  },
  render: (params): Slide => {
    const { total, nA, nB, both, hard } = params;
    const ctx = VENN[params.context];
    const onlyA = nA - both;
    const onlyB = nB - both;
    const union = onlyA + both + onlyB;
    const neither = total - union;
    const answer = hard
      ? [dec(onlyA), dec(onlyB), dec(union), dec(neither), fr([neither, total])]
      : [dec(onlyA), dec(onlyB), dec(union), fr([union, total])];
    const slips = [dec(nA + nB), fr([nA + nB, total]), dec(total - nA - nB), fr([union, nA + nB]), dec(nA), fr([both, total]), dec(neither + both)];
    return {
      kind: 'tree',
      prompt: [
        say(`Of ${total} ${ctx.who}, ${nA} ${ctx.aText}, ${nB} ${ctx.bText}, and ${both} do both. One is chosen at random.`),
        say(
          hard
            ? `Find the probability that they do neither. Top row: how many only ${ctx.aText}, how many only ${ctx.bText}. Then how many do at least one, then how many do neither, then the probability.`
            : `Find the probability that they do at least one. Top row: how many only ${ctx.aText}, how many only ${ctx.bText}. Then how many do at least one, then the probability.`,
        ),
      ],
      expression: hard ? `P((${ctx.A} \\cup ${ctx.B})')` : `P(${ctx.A} \\cup ${ctx.B})`,
      nodes: hard
        ? [
            { id: 'a', from: [] },
            { id: 'b', from: [] },
            { id: 'u', from: ['a', 'b'] },
            { id: 'n', from: ['u'] },
            { id: 'p', from: ['n'] },
          ]
        : [
            { id: 'a', from: [] },
            { id: 'b', from: [] },
            { id: 'u', from: ['a', 'b'] },
            { id: 'p', from: ['u'] },
          ],
      bank: bank(answer, slips),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: ({ total, nA, nB, both, hard, context }) => {
    const ctx = VENN[context];
    const onlyA = nA - both;
    const onlyB = nB - both;
    const union = onlyA + both + onlyB;
    const steps: SolutionStep[] = [
      { text: `The ${both} who do both are inside both counts, so take them off each.` },
      { tex: `${nA} - ${both} = ${onlyA}, \\quad ${nB} - ${both} = ${onlyB}` },
      { text: `Add the three regions inside the circles for how many do at least one: $${onlyA} + ${both} + ${onlyB} = ${union}$.` },
    ];
    if (hard) {
      steps.push({ text: `Everyone else does neither: $${total} - ${union} = ${total - union}$.` }, { tex: `P((${ctx.A} \\cup ${ctx.B})') = ${rawTex([total - union, total])}` });
    } else {
      steps.push({ tex: `P(${ctx.A} \\cup ${ctx.B}) = ${rawTex([union, total])}` });
    }
    return steps;
  },
};

/** Region sets in the order only A, both, only B, neither. */
const REGION_EXPRS: { tex: string; set: number[]; hard: boolean }[] = [
  { tex: 'A \\cap B', set: [1], hard: false },
  { tex: "A \\cap B'", set: [0], hard: false },
  { tex: "A' \\cap B", set: [2], hard: false },
  { tex: "(A \\cup B)'", set: [3], hard: false },
  { tex: "A'", set: [2, 3], hard: true },
  { tex: "B'", set: [0, 3], hard: true },
  { tex: 'A \\cup B', set: [0, 1, 2], hard: true },
  { tex: "(A \\cap B)'", set: [0, 2, 3], hard: true },
  { tex: "A \\cup B'", set: [0, 1, 3], hard: true },
  { tex: "A' \\cup B", set: [1, 2, 3], hard: true },
];

interface RegionParams {
  letters: string[];
  expr: number;
}

function regionLabel(letters: string[], set: number[]): string {
  const names = set.map((i) => letters[i]).sort();
  return listing(names);
}

/** Which region, or regions, a set expression names. */
const vennRegion: Generator<RegionParams> = {
  id: 'prob-venn-region',
  sample: (rng, difficulty) => {
    const pool = REGION_EXPRS.map((e, i) => ({ e, i })).filter(({ e }) => e.hard === difficulty > 1);
    return { letters: rng.sample(['p', 'q', 'r', 's', 't', 'u', 'v', 'w'], 4), expr: rng.pick(pool).i };
  },
  render: ({ letters, expr }): Slide => {
    const { tex, set } = REGION_EXPRS[expr];
    const key = JSON.stringify(set);
    const others = REGION_EXPRS.filter((e) => JSON.stringify(e.set) !== key && (e.set.length === set.length || set.length === 1 ? e.set.length === set.length : true));
    const wrong = [...new Set(others.map((e) => regionLabel(letters, e.set)))];
    // Same-size sets first, so the answer is not the only one of its length.
    wrong.sort((x, y) => Number(x.split(/, | and /).length !== set.length) - Number(y.split(/, | and /).length !== set.length));
    return pickSlide(
      [
        say('The four regions of this Venn diagram are labelled with letters.'),
        picture(vennSvg(['A', 'B'], letters as [string, string, string, string])),
        say(`Which ${set.length === 1 ? 'region is' : 'regions make up'} $${tex}$?`),
      ],
      regionLabel(letters, set),
      wrong.slice(0, 3),
      saltOf(letters, expr),
      false,
    );
  },
  solution: ({ letters, expr }) => {
    const { tex, set } = REGION_EXPRS[expr];
    const said = ['inside $A$ only', 'inside both', 'inside $B$ only', 'outside both circles'];
    return [
      { text: "$\\cap$ is and, $\\cup$ is or, and a dash means not." },
      { text: `$${tex}$ is ${listing(set.map((i) => said[i]))}.` },
      { text: `That is ${set.length === 1 ? 'region' : 'regions'} ${regionLabel(letters, set)}.` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 3: independence and the multiplication rule
 * ================================================================ */

interface IndepFlowParams {
  /** Hundredths. */
  pA: number;
  pB: number;
  pAB: number;
  /** Difficulty 2 gives P(A or B) and leaves P(A and B) to find. */
  viaUnion: boolean;
}

/** Is P(A and B) equal to P(A) times P(B)? */
const indepFlow: Generator<IndepFlowParams> = {
  id: 'prob-indep-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const pA = 10 * rng.int(1, 9);
      const pB = 10 * rng.int(1, 9);
      const product = (pA * pB) / 100;
      const independent = rng.chance(0.5);
      const pAB = independent ? product : product + rng.pick([-10, -5, 5, 10]);
      if (!Number.isInteger(pAB) || pAB <= 0 || pAB >= Math.min(pA, pB) || pA + pB - pAB > 100) continue;
      return { pA, pB, pAB, viaUnion: difficulty > 1 };
    }
  },
  render: (params): Slide => {
    const { pA, pB, pAB, viaUnion } = params;
    const [a, b, ab] = [pA / 100, pB / 100, pAB / 100];
    const u = (pA + pB - pAB) / 100;
    const product = Number(fmt(a * b));
    const independent = same(product, ab);
    const salt = saltOf(params);
    const productLabels = [...new Set([product, Number(fmt(a + b)), Number(fmt(a * b * 10)), Number(fmt(product + 0.1))].map((v) => `$${fmt(v)}$`))].slice(0, 3);
    const decide = {
      id: 'decide',
      ask: `Compare it with $P(A \\cap B) = ${fmt(ab)}$. Are $A$ and $B$ independent?`,
      branches: turn(
        [
          independent
            ? { label: 'Yes', outcome: 'Right: P(A) times P(B) is exactly P(A and B), so they are independent.' }
            : { label: 'Yes', outcome: `They differ: $${fmt(product)} \\neq ${fmt(ab)}$.` },
          independent
            ? { label: 'No', outcome: `Look again: $${fmt(product)}$ is exactly $P(A \\cap B)$.` }
            : { label: 'No', outcome: 'Right: the product is not P(A and B), so they are not independent.' },
        ],
        salt,
      ),
    };
    const multiply = {
      id: 'multiply',
      ask: 'What is $P(A) \\times P(B)$?',
      branches: turn(
        productLabels.map((label, i) =>
          i === 0 ? { label, to: 'decide' } : { label, outcome: `Multiply: $${fmt(a)} \\times ${fmt(b)}$.` },
        ),
        salt >> 3,
      ),
    };
    const steps: Extract<Slide, { kind: 'flow' }>['steps'] = [multiply, decide];
    const answer = [productLabels[0], independent ? 'Yes' : 'No'];
    if (viaUnion) {
      const overlapLabels = [...new Set([ab, Number(fmt(a + b)), Number(fmt(u - a)), Number(fmt(a + b + u))].map((v) => `$${fmt(v)}$`))].slice(0, 3);
      steps.unshift({
        id: 'overlap',
        ask: 'First find $P(A \\cap B) = P(A) + P(B) - P(A \\cup B)$.',
        branches: turn(
          overlapLabels.map((label, i) =>
            i === 0 ? { label, to: 'multiply' } : { label, outcome: 'Turn the addition rule round: the overlap is what the union leaves out of the sum.' },
          ),
          salt >> 6,
        ),
      });
      answer.unshift(overlapLabels[0]);
    }
    return {
      kind: 'flow',
      prompt: [
        say('Decide whether $A$ and $B$ are independent.'),
        show(viaUnion ? `P(A) = ${fmt(a)}, \\quad P(B) = ${fmt(b)}, \\quad P(A \\cup B) = ${fmt(u)}` : `P(A) = ${fmt(a)}, \\quad P(B) = ${fmt(b)}, \\quad P(A \\cap B) = ${fmt(ab)}`),
      ],
      subject: 'P(A \\cap B) \\overset{?}{=} P(A) \\times P(B)',
      steps,
      answer,
    };
  },
  solution: ({ pA, pB, pAB, viaUnion }) => {
    const [a, b, ab] = [pA / 100, pB / 100, pAB / 100];
    const u = (pA + pB - pAB) / 100;
    const product = Number(fmt(a * b));
    const steps: SolutionStep[] = [];
    if (viaUnion) steps.push({ tex: `P(A \\cap B) = ${fmt(a)} + ${fmt(b)} - ${fmt(u)} = ${fmt(ab)}` });
    steps.push({ tex: `P(A) \\times P(B) = ${fmt(a)} \\times ${fmt(b)} = ${fmt(product)}` });
    steps.push({
      text: same(product, ab)
        ? `That equals $P(A \\cap B) = ${fmt(ab)}$, so $A$ and $B$ are independent.`
        : `That is not $P(A \\cap B) = ${fmt(ab)}$, so $A$ and $B$ are not independent.`,
    });
    return steps;
  },
};

const INDEP_PAIRS = [
  { a: 'Sam passes a driving test', b: 'Ali passes a driving test', both: 'both pass', neither: 'neither passes', onlyA: 'Sam passes and Ali does not' },
  { a: 'the 8:10 train is late', b: 'the 17:40 train is late', both: 'both trains are late', neither: 'neither train is late', onlyA: 'only the 8:10 is late' },
  { a: 'Ria wins her match', b: 'Jo wins their match', both: 'both win', neither: 'neither wins', onlyA: 'Ria wins and Jo does not' },
  { a: 'the first set of lights is red', b: 'the second set of lights is red', both: 'both are red', neither: 'neither is red', onlyA: 'only the first is red' },
  { a: 'a phone battery fails this year', b: 'its charger fails this year', both: 'both fail', neither: 'neither fails', onlyA: 'the battery fails but the charger does not' },
] as const;

interface IndepAndParams {
  context: number;
  p: number;
  q: number;
  ask: 'both' | 'neither' | 'onlyA';
}

function indepAndAnswer({ p, q, ask }: IndepAndParams): number {
  if (ask === 'both') return Number(fmt(p * q));
  if (ask === 'neither') return Number(fmt((1 - p) * (1 - q)));
  return Number(fmt(p * (1 - q)));
}

/** Independent, so multiply: both, neither, or one and not the other. */
const indepAnd: Generator<IndepAndParams> = {
  id: 'prob-indep-and',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const p = hard ? 5 * rng.int(1, 19) : 10 * rng.int(1, 9);
      const q = hard ? 5 * rng.int(1, 19) : 10 * rng.int(1, 9);
      if (p === q) continue;
      return { context: rng.int(0, INDEP_PAIRS.length - 1), p: p / 100, q: q / 100, ask: hard ? rng.pick(['neither', 'onlyA'] as const) : 'both' };
    }
  },
  render: (params): Slide => {
    const ctx = INDEP_PAIRS[params.context];
    return probSlide(
      [
        say(`The probability that ${ctx.a} is $${fmt(params.p)}$, and the probability that ${ctx.b} is $${fmt(params.q)}$. The two are independent.`),
        say(`Find the probability that ${ctx[params.ask]}.`),
      ],
      'P =',
      fmt(indepAndAnswer(params)),
    );
  },
  solution: (params) => {
    const { p, q, ask } = params;
    const value = fmt(indepAndAnswer(params));
    if (ask === 'both') return [{ text: 'Independent events: multiply.' }, { tex: `${fmt(p)} \\times ${fmt(q)} = ${value}` }];
    if (ask === 'neither') {
      return [
        { text: 'Neither means the first does not happen and the second does not happen. Each "not" is $1$ minus, and independence lets them multiply.' },
        { tex: `(1 - ${fmt(p)})(1 - ${fmt(q)}) = ${fmt(1 - p)} \\times ${fmt(1 - q)} = ${value}` },
      ];
    }
    return [
      { text: 'The first happens and the second does not: multiply the first by $1$ minus the second.' },
      { tex: `${fmt(p)} \\times (1 - ${fmt(q)}) = ${fmt(p)} \\times ${fmt(1 - q)} = ${value}` },
    ];
  },
  choices: (params) => {
    const { p, q } = params;
    return probChoices(
      dec(indepAndAnswer(params)),
      [dec(p + q), dec(p * q), dec(1 - p * q), dec((1 - p) * q), dec(p * (1 - q)), dec((1 - p) * (1 - q))],
      saltOf(params),
    );
  },
};

const fmul = (a: Frac, b: Frac): Frac => simplest([a[0] * b[0], a[1] * b[1]]);
const fdiv = (a: Frac, b: Frac): Frac => simplest([a[0] * b[1], a[1] * b[0]]);

const FRAC_EVENTS = [
  { what: 'a fair coin lands heads', f: [1, 2] as Frac },
  { what: 'a fair die shows a 6', f: [1, 6] as Frac },
  { what: 'a fair die shows an even number', f: [1, 2] as Frac },
  { what: 'a fair die shows more than 4', f: [1, 3] as Frac },
  { what: 'a fair four-sided die shows a 1', f: [1, 4] as Frac },
  { what: 'a spinner with 5 equal sectors, 2 red, lands red', f: [2, 5] as Frac },
  { what: 'a card from 1 to 10 is a multiple of 3', f: [3, 10] as Frac },
  { what: 'a spinner with 8 equal sectors, 3 blue, lands blue', f: [3, 8] as Frac },
  { what: 'a fair die shows a number less than 5', f: [2, 3] as Frac },
  { what: 'a spinner with 4 equal sectors, 3 green, lands green', f: [3, 4] as Frac },
] as const;

interface IndepTilesParams {
  a: number;
  b: number;
  hard: boolean;
}

/** P(A and B) = P(A) x P(B), and at difficulty 2 the rule turned round to find P(B). */
const indepTiles: Generator<IndepTilesParams> = {
  id: 'prob-indep-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const [a, b] = rng.sample([...FRAC_EVENTS.keys()], 2);
      const fa = FRAC_EVENTS[a].f;
      const fb = FRAC_EVENTS[b].f;
      if (same(fv(fa), fv(fb))) continue;
      return { a, b, hard: difficulty > 1 };
    }
  },
  render: ({ a, b, hard }): Slide => {
    const A = FRAC_EVENTS[a];
    const B = FRAC_EVENTS[b];
    const ab = fmul(A.f, B.f);
    const slipsFor = (x: Frac, y: Frac): Tok[] => [fr([x[0] + y[0], x[1] + y[1]]), fr(fmul(x, [y[1], y[0]])), fr([x[0] * y[0], x[1] + y[1]]), fr([1, x[1] * y[1] + 1])];
    const events = `$A$ is the event that ${A.what}, and $B$ that ${B.what}, on separate goes. They are independent.`;
    if (!hard) {
      const answer = [fr(A.f), fr(B.f), fr(ab)];
      return {
        kind: 'tiles',
        prompt: [say(events), say('Find $P(A \\cap B)$.')],
        template: 'P(A \\cap B) = {0} \\times {1} = {2}',
        answer: answer.map((t) => t.tex),
        bank: bank(answer, slipsFor(A.f, B.f)),
      };
    }
    const answer = [fr(ab), fr(A.f), fr(B.f)];
    return {
      kind: 'tiles',
      prompt: [say(`$A$ and $B$ are independent events with $P(A) = ${ftex(A.f)}$ and $P(A \\cap B) = ${ftex(ab)}$.`), say('Find $P(B)$.')],
      template: 'P(B) = {0} \\div {1} = {2}',
      answer: answer.map((t) => t.tex),
      bank: bank(answer, [fr(fmul(ab, A.f)), fr(fdiv(A.f, ab)), ...slipsFor(ab, A.f)]),
    };
  },
  solution: ({ a, b, hard }) => {
    const A = FRAC_EVENTS[a];
    const B = FRAC_EVENTS[b];
    const ab = fmul(A.f, B.f);
    if (!hard) {
      return [
        { text: `$P(A) = ${ftex(A.f)}$ and $P(B) = ${ftex(B.f)}$. Independent, so multiply.` },
        { tex: `P(A \\cap B) = ${ftex(A.f)} \\times ${ftex(B.f)} = ${ftex(ab)}` },
      ];
    }
    return [
      { text: 'Independence says $P(A \\cap B) = P(A) \\times P(B)$, so divide to undo the multiplication.' },
      { tex: `P(B) = ${ftex(ab)} \\div ${ftex(A.f)} = ${ftex(B.f)}` },
    ];
  },
};

const REPEAT_CONTEXTS = [
  { each: (name: string) => `${name} passes`, all: 'all three pass', none: 'none of them passes', noun: 'a test' },
  { each: (name: string) => `${name}'s train is on time`, all: 'all three trains are on time', none: 'none is on time', noun: 'a train' },
  { each: (name: string) => `${name} scores a penalty`, all: 'all three score', none: 'none of them scores', noun: 'a penalty' },
] as const;

interface RepeatParams {
  context: number;
  names: string[];
  /** Tenths. */
  p: number[];
  none: boolean;
}

/** Three independent events multiplied along, one product at a time. */
const repeatSteps: Generator<RepeatParams> = {
  id: 'prob-repeat-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = [0, 1, 2].map(() => rng.int(1, 9) / 10);
      if (new Set(p).size < 2) continue;
      return { context: rng.int(0, REPEAT_CONTEXTS.length - 1), names: rng.sample(NAMES, 3), p, none: difficulty > 1 };
    }
  },
  render: ({ context, names, p, none }): Slide => {
    const ctx = REPEAT_CONTEXTS[context];
    const said = names.map((name, i) => `the probability that ${ctx.each(name)} is $${fmt(p[i])}$`);
    const prompt = [
      say(`${cap(listing(said))}, independently.`),
      say(`Find the probability that ${none ? ctx.none : ctx.all}. Tap the part you would work out next, then choose what it comes to.`),
    ];
    const f = none ? p.map((v) => Number(fmt(1 - v))) : p;
    const first = Number(fmt(f[0] * f[1]));
    const all = Number(fmt(first * f[2]));
    const products = [
      { span: [0, 3] as [number, number], operator: 1, value: fmt(first), bank: stepBank(fmt(first), fmt(f[0] + f[1]), fmt(first * 10), fmt(Number(fmt(first + 0.1)))) },
      { span: [0, 3] as [number, number], operator: 1, value: fmt(all), bank: stepBank(fmt(all), fmt(first + f[2]), fmt(all * 10), fmt(1 - all)) },
    ];
    if (!none) {
      return { kind: 'steps', prompt, start: [fmt(p[0]), '\\times', fmt(p[1]), '\\times', fmt(p[2])], reductions: products };
    }
    const bracket = (i: number) => ({
      span: [2 * i, 2 * i + 1] as [number, number],
      value: fmt(f[i]),
      bank: stepBank(fmt(f[i]), fmt(p[i]), fmt(1 + p[i]), fmt(Number(fmt(f[i] + 0.1)))),
    });
    return {
      kind: 'steps',
      prompt,
      start: p.flatMap((v, i) => (i === 0 ? [`(1 - ${fmt(v)})`] : ['\\times', `(1 - ${fmt(v)})`])),
      reductions: [bracket(0), bracket(1), bracket(2), ...products],
    };
  },
  solution: ({ p, none }) => {
    const f = none ? p.map((v) => Number(fmt(1 - v))) : p;
    const steps: SolutionStep[] = [];
    if (none) steps.push({ text: 'None means each one fails, and each failure has probability $1$ minus its success.' }, { tex: f.map((v, i) => `1 - ${fmt(p[i])} = ${fmt(v)}`).join(', \\quad ') });
    else steps.push({ text: 'The three are independent, so multiply along.' });
    steps.push({ tex: `${f.map(fmt).join(' \\times ')} = ${fmt(f[0] * f[1])} \\times ${fmt(f[2])} = ${fmt(f[0] * f[1] * f[2])}` });
    return steps;
  },
};

/* ================================================================
 * Level 2, lesson 4: tree diagrams for two independent trials
 * ================================================================ */

const TREE_PAIRS = [
  { a: 'Sam hits the target with the first arrow', b: 'Sam hits it with the second arrow' },
  { a: 'it rains on Saturday', b: 'it rains on Sunday' },
  { a: 'Ria wins the first game', b: 'Ria wins the second game' },
  { a: 'the first set of lights is green', b: 'the second set is green' },
  { a: 'a seed from packet 1 grows', b: 'a seed from packet 2 grows' },
  { a: 'the 8:10 bus is late', b: 'the 17:40 bus is late' },
] as const;

export interface TreeParams {
  context: number;
  p: Prob;
  q: Prob;
  /** The path asked about, where there is one: true for A (or B), false for its complement. */
  path: [boolean, boolean];
  /** Leave the complement branches unlabelled. */
  blank: boolean;
}

/** The branch probabilities, first stage then second: each pair sums to 1. */
export function treeBranches({ p, q }: TreeParams): { first: [Prob, Prob]; second: [Prob, Prob] } {
  return { first: [p, notP(p)], second: [q, notP(q)] };
}

function treePicture(params: TreeParams): Block {
  const { first, second } = treeBranches(params);
  const label = (x: Prob, complement: boolean) => (params.blank && complement ? '' : probPlain(x));
  const pair: [string, string] = [label(second[0], false), label(second[1], true)];
  return picture(
    treeSvg({
      first: [label(first[0], false), label(first[1], true)],
      second: [pair, pair],
      names: ['A', "A'", 'B', "B'"],
    }),
  );
}

function treeSentence(params: TreeParams): string {
  const ctx = TREE_PAIRS[params.context];
  return `$A$ is the event that ${ctx.a}, and $B$ that ${ctx.b}. They are independent.`;
}

function sampleTree(rng: Rng, difficulty: number, blankAtHard: boolean): TreeParams {
  const hard = difficulty > 1;
  for (;;) {
    const pick = (): Prob => {
      if (!hard) return { kind: 'dec', v: rng.int(1, 9) / 10 };
      if (rng.chance(0.5)) return { kind: 'dec', v: 5 * rng.int(1, 19) / 100 };
      const b = rng.int(3, 8);
      const a = rng.int(1, b - 1);
      return { kind: 'frac', f: simplest([a, b]) };
    };
    const p = pick();
    const q = pick();
    if (p.kind !== q.kind && hard) continue;
    if (same(probValue(p), probValue(q)) || same(probValue(p) + probValue(q), 1) || same(probValue(p), 0.5) || same(probValue(q), 0.5)) continue;
    const path: [boolean, boolean] = [rng.chance(0.5), rng.chance(0.5)];
    if (hard && path[0] && path[1]) continue;
    return { context: rng.int(0, TREE_PAIRS.length - 1), p, q, path, blank: hard && blankAtHard };
  }
}

const pathTex = ([x, y]: [boolean, boolean]): string => `P(A${x ? '' : "'"} \\cap B${y ? '' : "'"})`;

function pathValue(params: TreeParams): Prob {
  const { first, second } = treeBranches(params);
  return times(first[params.path[0] ? 0 : 1], second[params.path[1] ? 0 : 1]);
}

/** Multiply along one path of the tree. */
const treeRead: Generator<TreeParams> = {
  id: 'prob-tree-read',
  sample: (rng, difficulty) => sampleTree(rng, difficulty, true),
  render: (params): Slide =>
    probSlide(
      [say(treeSentence(params)), treePicture(params), say(`Find $${pathTex(params.path)}$.`)],
      `${pathTex(params.path)} =`,
      probTok(pathValue(params)).answer,
    ),
  solution: (params) => {
    const { first, second } = treeBranches(params);
    const x = first[params.path[0] ? 0 : 1];
    const y = second[params.path[1] ? 0 : 1];
    const steps: SolutionStep[] = [];
    if (params.blank) steps.push({ text: 'The unlabelled branches are the complements: each pair from one point adds up to $1$.' });
    steps.push({ text: 'Follow the path and multiply along it.' }, { tex: `${pathTex(params.path)} = ${probTok(x).tex} \\times ${probTok(y).tex} = ${probTok(pathValue(params)).tex}` });
    return steps;
  },
  choices: (params) => {
    const { first, second } = treeBranches(params);
    const x = first[params.path[0] ? 0 : 1];
    const y = second[params.path[1] ? 0 : 1];
    return probChoices(
      probTok(pathValue(params)),
      [probTok(plus(x, y)), probTok(times(first[params.path[0] ? 1 : 0], y)), probTok(times(x, second[params.path[1] ? 1 : 0])), probTok(times(params.p, params.q))],
      saltOf(params),
    );
  },
};

/** P(at least one) through the complement: both "nots", neither, then 1 minus. */
const treeAtLeast: Generator<TreeParams> = {
  id: 'prob-tree-atleast',
  sample: (rng, difficulty) => sampleTree(rng, difficulty, true),
  render: (params): Slide => {
    const ac = notP(params.p);
    const bc = notP(params.q);
    const none = times(ac, bc);
    const answer = [probTok(ac), probTok(bc), probTok(none), probTok(notP(none))];
    return {
      kind: 'tree',
      prompt: [
        say(treeSentence(params)),
        treePicture(params),
        say(`Find the probability that at least one of $A$ and $B$ happens. Top row: $P(A')$, then $P(B')$. Then the probability of neither, then of at least one.`),
      ],
      expression: "1 - P(A' \\cap B')",
      nodes: [
        { id: 'ac', from: [] },
        { id: 'bc', from: [] },
        { id: 'none', from: ['ac', 'bc'] },
        { id: 'one', from: ['none'] },
      ],
      bank: bank(answer, [probTok(times(params.p, params.q)), probTok(notP(times(params.p, params.q))), probTok(plus(ac, bc)), probTok(plus(params.p, params.q))]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const ac = notP(params.p);
    const bc = notP(params.q);
    const none = times(ac, bc);
    return [
      { text: 'At least one fails only when neither happens, which is the bottom path of the tree.' },
      { tex: `P(A' \\cap B') = ${probTok(ac).tex} \\times ${probTok(bc).tex} = ${probTok(none).tex}` },
      { tex: `P(\\text{at least one}) = 1 - ${probTok(none).tex} = ${probTok(notP(none)).tex}` },
    ];
  },
};

/** Both or neither: multiply along two paths, then add across. */
const treeSameSteps: Generator<TreeParams> = {
  id: 'prob-tree-same-steps',
  sample: (rng, difficulty) => sampleTree(rng, difficulty, false),
  render: (params): Slide => {
    const { first, second } = treeBranches(params);
    const [p, pc] = first;
    const [q, qc] = second;
    const both = times(p, q);
    const neither = times(pc, qc);
    const total = plus(both, neither);
    const t = (x: Prob) => probTok(x).tex;
    return {
      kind: 'steps',
      prompt: [
        say(treeSentence(params)),
        treePicture(params),
        say('Find the probability that both happen or neither does. Tap the part you would work out next, then choose what it comes to.'),
      ],
      start: [t(p), '\\times', t(q), '+', t(pc), '\\times', t(qc)],
      reductions: [
        { span: [0, 3], operator: 1, value: t(both), bank: stepBank(t(both), t(plus(p, q)), t(times(p, qc)), t(times(pc, q))) },
        { span: [2, 5], operator: 3, value: t(neither), bank: stepBank(t(neither), t(plus(pc, qc)), t(times(p, qc)), t(times(pc, q))) },
        { span: [0, 3], operator: 1, value: t(total), bank: stepBank(t(total), t(times(both, neither)), t(notP(total)), t(plus(total, { kind: 'dec', v: 0.1 }))) },
      ],
    };
  },
  solution: (params) => {
    const { first, second } = treeBranches(params);
    const [p, pc] = first;
    const [q, qc] = second;
    const t = (x: Prob) => probTok(x).tex;
    return [
      { text: 'Two paths give "both or neither": $A$ then $B$, and $A\'$ then $B\'$. Multiply along each path, then add across.' },
      { tex: `${t(p)} \\times ${t(q)} + ${t(pc)} \\times ${t(qc)} = ${t(times(p, q))} + ${t(times(pc, qc))} = ${t(plus(times(p, q), times(pc, qc)))}` },
    ];
  },
};

/** Exactly one: the two mixed paths, written out as the rule, then the value. */
const treeExactlyTiles: Generator<TreeParams> = {
  id: 'prob-tree-exactly-tiles',
  sample: (rng, difficulty) => sampleTree(rng, difficulty, true),
  render: (params): Slide => {
    const { first, second } = treeBranches(params);
    const [p, pc] = first;
    const [q, qc] = second;
    const result = plus(times(p, qc), times(pc, q));
    const answer = [probTok(p), probTok(qc), probTok(pc), probTok(q), probTok(result)];
    return {
      kind: 'tiles',
      prompt: [
        say(treeSentence(params)),
        treePicture(params),
        say('Find the probability that exactly one of them happens:'),
        show("P(A \\cap B') + P(A' \\cap B)"),
      ],
      template: '{0} \\times {1} + {2} \\times {3} = {4}',
      answer: answer.map((t) => t.tex),
      bank: tokenBank(
        answer.map((t) => t.tex),
        [probTok(times(p, q)), probTok(times(pc, qc)), probTok(plus(times(p, q), times(pc, qc))), probTok(plus(p, q))]
          .filter((t) => !answer.some((a) => same(a.v, t.v)))
          .map((t) => t.tex),
        3,
      ),
    };
  },
  solution: (params) => {
    const { first, second } = treeBranches(params);
    const [p, pc] = first;
    const [q, qc] = second;
    const t = (x: Prob) => probTok(x).tex;
    return [
      { text: 'Exactly one happens on two paths: $A$ then $B\'$, and $A\'$ then $B$. Multiply along each, then add.' },
      { tex: `${t(p)} \\times ${t(qc)} + ${t(pc)} \\times ${t(q)} = ${t(times(p, qc))} + ${t(times(pc, q))} = ${t(plus(times(p, qc), times(pc, q)))}` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 5: conditional probability
 * ================================================================ */

export interface CondParams extends TwoWayParams {
  given: 'row' | 'col';
}

/** The cell, the total it is out of, and the words for both. */
export function condParts(params: CondParams) {
  const ctx = TWO_WAY[params.context];
  const t = twoWayTotals(params);
  const [a, b, c, d] = params.cells;
  const cell = [a, b, c, d][2 * params.row + params.col];
  const byRow = params.given === 'row';
  return {
    cell,
    given: byRow ? t.rows[params.row] : t.cols[params.col],
    other: byRow ? t.cols[params.col] : t.rows[params.row],
    total: t.total,
    givenText: byRow ? ctx.rowIs[params.row] : ctx.colIs[params.col],
    askText: byRow ? ctx.colIs[params.col] : ctx.rowIs[params.row],
  };
}

function sampleCond(rng: Rng, difficulty: number): CondParams {
  for (;;) {
    const params: CondParams = { ...sampleTwoWay(rng, difficulty), given: rng.pick(['row', 'col'] as const) };
    const { cell, given, other, total } = condParts(params);
    const values = [cell / given, cell / total, cell / other, given / total];
    if (new Set(values.map((v) => v.toFixed(9))).size < 4) continue;
    return params;
  }
}

/** Given a row or column, the table shrinks to it: the cell over that total. */
const condTable: Generator<CondParams> = {
  id: 'prob-cond-table',
  sample: sampleCond,
  render: (params): Slide => {
    const ctx = TWO_WAY[params.context];
    const { cell, given, givenText, askText } = condParts(params);
    return probSlide(
      [
        show(twoWayTex(params, !params.hard)),
        say(`One ${ctx.one} is chosen at random. Given that the ${ctx.one} ${givenText}, find the probability that the ${ctx.one} ${askText}.`),
      ],
      'P =',
      fans([cell, given]),
    );
  },
  solution: (params) => {
    const ctx = TWO_WAY[params.context];
    const { cell, given, givenText, askText } = condParts(params);
    return [
      { text: `"Given that the ${ctx.one} ${givenText}" means only those ${given} are in the running.` },
      { text: `Of them, $${cell}$ ${askText.replace(/^is /, 'are ').replace(/^was /, 'were ')}.` },
      { tex: `P = ${rawTex([cell, given])}${gcd(cell, given) > 1 ? ` = ${ftex([cell, given])}` : ''}` },
    ];
  },
  choices: (params) => {
    const { cell, given, other, total } = condParts(params);
    return probChoices(fr([cell, given]), [fr([cell, total]), fr([cell, other]), fr([given, total])], saltOf(params));
  },
};

/** Which fraction of the table answers a "given that" question. */
const condWhich: Generator<CondParams> = {
  id: 'prob-cond-which',
  sample: sampleCond,
  render: (params): Slide => {
    const ctx = TWO_WAY[params.context];
    const { cell, given, other, total, givenText, askText } = condParts(params);
    if (!params.hard) {
      return pickSlide(
        [
          show(twoWayTex(params, true)),
          say(`One ${ctx.one} is chosen at random. Given that the ${ctx.one} ${givenText}, which gives the probability that the ${ctx.one} ${askText}?`),
        ],
        rawTex([cell, given]),
        [rawTex([cell, total]), rawTex([cell, other]), rawTex([given, total])],
        saltOf(params),
        true,
      );
    }
    // The other cell in the given row or column: "not" inside the condition.
    const [a, b, c, d] = params.cells;
    const cells = [a, b, c, d];
    const flip = params.given === 'row' ? 2 * params.row + (1 - params.col) : 2 * (1 - params.row) + params.col;
    const rest = cells[flip];
    const notText = params.given === 'row' ? ctx.colIs[1 - params.col] : ctx.rowIs[1 - params.row];
    return pickSlide(
      [
        show(twoWayTex(params, true)),
        say(`One ${ctx.one} is chosen at random. Given that the ${ctx.one} ${givenText}, which gives the probability that the ${ctx.one} ${notText}?`),
      ],
      rawTex([rest, given]),
      [rawTex([cell, given]), rawTex([rest, total]), rawTex([rest, other + rest - cell > 0 ? other : total])],
      saltOf(params),
      true,
    );
  },
  solution: (params) => {
    const ctx = TWO_WAY[params.context];
    const { given, givenText } = condParts(params);
    return [
      { text: `"Given that the ${ctx.one} ${givenText}" narrows the choice to those ${given}: that total goes on the bottom.` },
      { text: 'The top is the part of that row or column the question asks about.' },
    ];
  },
};

interface NoReplParams {
  holder: string;
  thing: number;
  colours: [string, string];
  counts: [number, number];
  /** Two of the first colour, or one of each in the order given. */
  mixed: boolean;
}

function sampleNoRepl(rng: Rng, difficulty: number): NoReplParams {
  const hard = difficulty > 1;
  const colours = rng.sample(COLOURS, 2) as [string, string];
  const counts: [number, number] = [rng.int(2, hard ? 12 : 8), rng.int(2, hard ? 12 : 8)];
  return { holder: rng.pick(HOLDERS), thing: rng.int(0, THINGS.length - 1), colours, counts, mixed: hard };
}

function noReplSentence({ holder, thing, colours, counts }: NoReplParams): string {
  const [, many] = THINGS[thing];
  return `A ${holder} holds ${counts[0]} ${colours[0]} and ${counts[1]} ${colours[1]} ${many}. Two are taken at random, one after the other, without replacement.`;
}

/** The two fractions along the path: the second draw has one fewer of everything. */
export function noReplFactors({ counts, mixed }: NoReplParams): [Frac, Frac] {
  const n = counts[0] + counts[1];
  return mixed ? [[counts[0], n], [counts[1], n - 1]] : [[counts[0], n], [counts[0] - 1, n - 1]];
}

/** Without replacement as a tree: the first draw, the second, then multiplied. */
const noReplTree: Generator<NoReplParams> = {
  id: 'prob-norepl-tree',
  sample: sampleNoRepl,
  render: (params): Slide => {
    const [c0, c1] = params.colours;
    const n = params.counts[0] + params.counts[1];
    const [r, b] = params.counts;
    if (!params.mixed) {
      const [x, y] = noReplFactors(params);
      const answer = [fr(x), fr(y), fr(fmul(x, y))];
      return {
        kind: 'tree',
        prompt: [
          say(noReplSentence(params)),
          say(`Find the probability that both are ${c0}. Top row: $P(\\text{first is ${c0}})$, then $P(\\text{second is ${c0}})$ once one ${c0} has gone. Then multiply.`),
        ],
        expression: `P(\\text{both ${c0}})`,
        nodes: [
          { id: 'x', from: [] },
          { id: 'y', from: [] },
          { id: 'p', from: ['x', 'y'] },
        ],
        bank: bank(answer, [fr([r, n - 1]), fr([r - 1, n]), fr(fmul(x, x)), fr([r * (r - 1), n * n])]),
        answer: answer.map((t) => t.tex),
      };
    }
    const rb = fmul([r, n], [b, n - 1]);
    const br = fmul([b, n], [r, n - 1]);
    const answer = [fr(rb), fr(br), fr(simplest([2 * r * b, n * (n - 1)]))];
    return {
      kind: 'tree',
      prompt: [
        say(noReplSentence(params)),
        say(`Find the probability of one of each colour. Top row: $P(\\text{${c0} then ${c1}})$, then $P(\\text{${c1} then ${c0}})$. Then add.`),
      ],
      expression: `P(\\text{one of each})`,
      nodes: [
        { id: 'rb', from: [] },
        { id: 'br', from: [] },
        { id: 'p', from: ['rb', 'br'] },
      ],
      bank: bank(answer, [fr([r * b, n * n]), fr([2 * r * b, n * n]), fr([r + b, n * (n - 1)]), fr([r * (b - 1), n * (n - 1)])]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const [c0, c1] = params.colours;
    const n = params.counts[0] + params.counts[1];
    const [r, b] = params.counts;
    if (!params.mixed) {
      const [x, y] = noReplFactors(params);
      return [
        { text: `First draw: $${r}$ of the $${n}$ are ${c0}. Second draw: one ${c0} has gone, so $${r - 1}$ of $${n - 1}$.` },
        { tex: `${rawTex(x)} \\times ${rawTex(y)} = ${ftex(fmul(x, y))}` },
      ];
    }
    return [
      { text: `Two orders give one of each. Multiply along each, remembering the second draw is out of $${n - 1}$.` },
      { tex: `P(\\text{${c0} then ${c1}}) = ${rawTex([r, n])} \\times ${rawTex([b, n - 1])} = ${ftex(fmul([r, n], [b, n - 1]))}` },
      { tex: `P(\\text{${c1} then ${c0}}) = ${rawTex([b, n])} \\times ${rawTex([r, n - 1])} = ${ftex(fmul([b, n], [r, n - 1]))}` },
      { tex: `\\text{Add: } ${ftex([2 * r * b, n * (n - 1)])}` },
    ];
  },
};

/** The same path as the rule with its fractions uncancelled, as a tree labels them. */
const noReplTiles: Generator<NoReplParams> = {
  id: 'prob-norepl-tiles',
  sample: sampleNoRepl,
  render: (params): Slide => {
    const [c0, c1] = params.colours;
    const n = params.counts[0] + params.counts[1];
    const [r, b] = params.counts;
    const [x, y] = noReplFactors(params);
    const product = fmul(x, y);
    const second = params.mixed ? b : r;
    const answer = [rawTex(x), rawTex(y), ftex(product)];
    return {
      kind: 'tiles',
      prompt: [say(noReplSentence(params)), say(`Find the probability that the first is ${c0} and the second is ${params.mixed ? c1 : c0}.`)],
      template: `P(\\text{${c0} then ${params.mixed ? c1 : c0}}) = {0} \\times {1} = {2}`,
      answer,
      bank: tokenBank(
        answer,
        [rawTex([second, n]), rawTex([second, n - 1 === second ? n : n - 1]), rawTex([r - 1, n]), ftex(fmul(x, [second, n])), ftex([r * second, n * (n - 1) + 1]), rawTex([second - 1, n - 1])].filter(
          (tex) => !answer.includes(tex),
        ),
        3,
      ),
    };
  },
  solution: (params) => {
    const [c0, c1] = params.colours;
    const [x, y] = noReplFactors(params);
    return [
      { text: `First: ${rawTex(x).replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$$$1$ of the $$$2$')} are ${c0}.` },
      { text: `After one ${c0} has gone there is one fewer of everything, and one fewer ${c0}${params.mixed ? `, but every ${c1} is still there` : ''}.` },
      { tex: `${rawTex(x)} \\times ${rawTex(y)} = ${ftex(fmul(x, y))}` },
    ];
  },
};

/* ================================================================
 * Level 3 pictures: a tree of any shape, and three sets
 * ================================================================ */

/**
 * A tree of any shape. Every point at stage `k` splits into one branch per
 * outcome in `stages[k]`, and `labels[k]` holds that stage's branch labels top
 * to bottom, so it has one entry per branch of the stage. An empty label leaves
 * a branch for the learner to work out.
 *
 * Labels are plain text (`2/5`, `0.35`), since there is no KaTeX inside an
 * SVG. Each branch label carries `data-branch="k.i"` and each outcome name
 * `data-name="k.i"`, which is how `probability.test.ts` reads a tree back.
 */
export interface StagedTree {
  stages: string[][];
  labels: string[][];
}

export function stagedTreeSvg({ stages, labels }: StagedTree): string {
  const leaves = stages.reduce((n, outcomes) => n * outcomes.length, 1);
  const gap = Math.min(50, 208 / leaves);
  const height = Math.round(gap * leaves + 16);
  const step = 272 / stages.length;
  /** Where the branches of stage `k` end, just short of their outcome names. */
  const xEnd = (k: number) => 8 + (k + 1) * step - 20;
  // The height of every point: the leaves evenly spaced, each point above them
  // centred on the branches it splits into.
  const ys: number[][] = [];
  ys[stages.length] = Array.from({ length: leaves }, (_, i) => 8 + gap * (i + 0.5));
  for (let k = stages.length - 1; k >= 0; k -= 1) {
    const size = stages[k].length;
    const below = ys[k + 1];
    ys[k] = Array.from({ length: below.length / size }, (_, i) => below.slice(i * size, (i + 1) * size).reduce((s, y) => s + y, 0) / size);
  }
  const font = gap < 30 ? 11 : 13;
  const parts = [
    `<svg viewBox="0 0 290 ${height}" width="100%" style="max-width:290px" role="img" aria-label="A tree diagram: ${stages.map((s) => s.join(' or ')).join(', then ')}">`,
  ];
  stages.forEach((outcomes, k) => {
    const x0 = k === 0 ? 8 : xEnd(k - 1) + 20;
    const x1 = xEnd(k);
    ys[k + 1].forEach((y1, j) => {
      const y0 = ys[k][Math.floor(j / outcomes.length)];
      const mid = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
      // Above a rising branch, below a falling one, and ending short of where
      // the line would cross it: further left the steeper the branch.
      const labelY = y1 > y0 + 1 ? mid.y + font + 1 : mid.y - 5;
      const labelEnd = mid.x + (Math.abs(y1 - y0) / (x1 - x0) < 0.5 ? 8 : -2);
      parts.push(
        `<line x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x1)}" y2="${f1(y1)}" stroke="currentColor" stroke-width="1.3" />`,
        `<text data-branch="${k}.${j}" x="${f1(labelEnd)}" y="${f1(labelY)}" font-size="${font}" text-anchor="end" fill="currentColor">${labels[k][j] ?? ''}</text>`,
        `<text data-name="${k}.${j}" x="${f1(x1 + 9)}" y="${f1(y1 + 4)}" font-size="13" font-style="italic" text-anchor="middle" fill="currentColor">${outcomes[j % outcomes.length]}</text>`,
      );
    });
  });
  parts.push('</svg>');
  return parts.join('');
}

/** The sets each region of a three-set Venn diagram lies in, in region order. */
export const VENN3_REGIONS: number[][] = [[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2], []];

/** Where each region's label sits: centres of three circles of radius 55, 60 apart. */
const VENN3_SPOTS: [number, number][] = [
  [86, 66],
  [194, 66],
  [140, 160],
  [140, 62],
  [110, 115],
  [170, 115],
  [140, 97],
  [252, 184],
];

/**
 * Three overlapping sets in a box. Regions in the order: only the first, only
 * the second, only the third, the first two only, the first and third only,
 * the last two only, all three, none (`VENN3_REGIONS`). Each region label
 * carries `data-region="i"`.
 */
export function venn3Svg(names: [string, string, string], regions: string[]): string {
  const where = ['only', 'only', 'only', 'only', 'only', 'only', '', ''];
  const described = regions
    .map((r, i) => {
      const sets = VENN3_REGIONS[i];
      const place = sets.length === 0 ? 'none' : sets.length === 3 ? 'all three' : `${sets.map((s) => names[s]).join(' and ')} ${where[i]}`;
      return `${r || 'nothing'} in ${place}`;
    })
    .join(', ');
  const circle = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="55" fill="none" stroke="currentColor" stroke-width="1.5" />`;
  const italic = 'font-style="italic" font-size="16"';
  return [
    `<svg viewBox="0 0 280 200" width="100%" style="max-width:280px" role="img" aria-label="A Venn diagram of ${names.join(', ')}: ${described}">`,
    '<rect x="4" y="4" width="272" height="192" rx="6" fill="none" stroke="currentColor" stroke-width="1.2" />',
    circle(110, 80),
    circle(170, 80),
    circle(140, 132),
    svgText(names[0], 44, 36, italic),
    svgText(names[1], 236, 36, italic),
    svgText(names[2], 210, 182, italic),
    ...regions.map((r, i) => svgText(r, VENN3_SPOTS[i][0], VENN3_SPOTS[i][1] + 5, `data-region="${i}" font-size="13"`)),
    '</svg>',
  ].join('');
}

const sumOf = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

/** `total` split into `parts` whole numbers, each at least `least`. */
function splitWhole(rng: Rng, total: number, parts: number, least: number): number[] {
  const spare = total - parts * least;
  const cuts = Array.from({ length: parts - 1 }, () => rng.int(0, spare)).sort((a, b) => a - b);
  const edges = [0, ...cuts, spare];
  return Array.from({ length: parts }, (_, i) => edges[i + 1] - edges[i] + least);
}

/** Distinct by value, first come first kept, and none equal to `right`. */
function otherValues(right: Tok, candidates: Tok[], keep = (t: Tok) => t.v >= 0 && t.v <= 1): Tok[] {
  const out: Tok[] = [];
  for (const t of candidates) {
    if (!Number.isFinite(t.v) || !keep(t) || same(t.v, right.v) || RECURRING.test(t.tex)) continue;
    if (out.some((o) => same(o.v, t.v) || o.tex === t.tex)) continue;
    out.push(t);
  }
  return out;
}

/**
 * The branches of one fork of a flow: the right one on to `to` (or ending with
 * `done`), the rest ending with `hint`, turned by `salt`.
 */
function forkOf(right: string, wrong: string[], salt: number, hint: string, next: { to: string } | { outcome: string }) {
  return turn([{ label: right, ...next }, ...wrong.map((label) => ({ label, outcome: hint }))], salt);
}

/* ================================================================
 * Level 3, lesson 1: a tree from words
 * ================================================================ */

const WORD_BAGS = [
  { colours: ['red', 'green'], letters: ['R', 'G'] },
  { colours: ['blue', 'yellow'], letters: ['B', 'Y'] },
  { colours: ['white', 'purple'], letters: ['W', 'P'] },
  { colours: ['orange', 'pink'], letters: ['O', 'P'] },
  { colours: ['green', 'white'], letters: ['G', 'W'] },
  { colours: ['red', 'blue'], letters: ['R', 'B'] },
] as const;

const WORD_EVENTS = [
  { a: 'Maya passes her theory test', b: 'she passes her driving test', letters: ['T', 'D'] },
  { a: 'the bus is late on Monday', b: 'it is late on Tuesday', letters: ['M', 'T'] },
  { a: 'Leo scores his first penalty', b: 'he scores his second', letters: ['F', 'S'] },
  { a: 'a battery from box 1 works', b: 'a battery from box 2 works', letters: ['A', 'B'] },
  { a: 'a seed from packet 1 grows', b: 'a seed from packet 2 grows', letters: ['P', 'Q'] },
  { a: 'Nia wins her first race', b: 'she wins her second race', letters: ['W', 'V'] },
] as const;

export interface WordTreeParams {
  /** A bag drawn from twice, or two independent events. */
  bag: boolean;
  context: number;
  holder: string;
  thing: number;
  counts: [number, number];
  replace: boolean;
  /** For events: P(first) and P(second), in tenths. */
  p: number;
  q: number;
  /** One path, both paths that match, or both mixed paths. */
  ask: 'path' | 'same' | 'mixed';
  /** The path: 0 for the first outcome of a stage, 1 for the other. */
  path: [number, number];
}

function sampleWords(rng: Rng, difficulty: number, events: boolean): WordTreeParams {
  const hard = difficulty > 1;
  const bag = hard || !events || rng.chance(0.5);
  for (;;) {
    const counts: [number, number] = [rng.int(2, hard ? 9 : 7), rng.int(2, hard ? 9 : 7)];
    const p = rng.int(1, 9) / 10;
    const q = rng.int(1, 9) / 10;
    if (bag && counts[0] === counts[1]) continue;
    if (!bag && (p === q || p === 0.5 || q === 0.5)) continue;
    return {
      bag,
      context: rng.int(0, (bag ? WORD_BAGS : WORD_EVENTS).length - 1),
      holder: rng.pick(HOLDERS),
      thing: rng.int(0, THINGS.length - 1),
      counts,
      replace: bag && !hard,
      p,
      q,
      ask: 'path',
      path: [rng.int(0, 1), rng.int(0, 1)],
    };
  }
}

/** The branch probabilities: the first stage, then the second under each first branch. */
export function wordsBranches(w: WordTreeParams): { first: [Prob, Prob]; second: [[Prob, Prob], [Prob, Prob]] } {
  if (!w.bag) {
    const p: Prob = { kind: 'dec', v: w.p };
    const q: Prob = { kind: 'dec', v: w.q };
    return { first: [p, notP(p)], second: [[q, notP(q)], [q, notP(q)]] };
  }
  const [r, b] = w.counts;
  const n = r + b;
  const f = (x: number, y: number): Prob => ({ kind: 'frac', f: [x, y] });
  if (w.replace) {
    return { first: [f(r, n), f(b, n)], second: [[f(r, n), f(b, n)], [f(r, n), f(b, n)]] };
  }
  return { first: [f(r, n), f(b, n)], second: [[f(r - 1, n - 1), f(b, n - 1)], [f(r, n - 1), f(b - 1, n - 1)]] };
}

function wordsStages(w: WordTreeParams): string[][] {
  if (w.bag) {
    const letters = [...WORD_BAGS[w.context].letters];
    return [letters, letters];
  }
  const [a, b] = WORD_EVENTS[w.context].letters;
  return [
    [a, `${a}'`],
    [b, `${b}'`],
  ];
}

function wordsSentence(w: WordTreeParams): string {
  if (w.bag) {
    const { colours, letters } = WORD_BAGS[w.context];
    const [one, many] = THINGS[w.thing];
    return `A ${w.holder} holds ${w.counts[0]} ${colours[0]} and ${w.counts[1]} ${colours[1]} ${many}. One ${one} is taken at random and ${w.replace ? 'put back' : 'not put back'}, then a second is taken. $${letters[0]}$ stands for ${colours[0]} and $${letters[1]}$ for ${colours[1]}.`;
  }
  const ctx = WORD_EVENTS[w.context];
  return `The probability that ${ctx.a} is $${fmt(w.p)}$; call this event $${ctx.letters[0]}$. Independently, the probability that ${ctx.b} is $${fmt(w.q)}$; call this $${ctx.letters[1]}$.`;
}

function wordsValue(w: WordTreeParams): Prob {
  const { first, second } = wordsBranches(w);
  if (w.ask === 'path') return times(first[w.path[0]], second[w.path[0]][w.path[1]]);
  if (w.ask === 'same') return plus(times(first[0], second[0][0]), times(first[1], second[1][1]));
  return plus(times(first[0], second[0][1]), times(first[1], second[1][0]));
}

function wordsAskTex(w: WordTreeParams): string {
  const [x, y] = w.path;
  if (w.bag) {
    const { colours } = WORD_BAGS[w.context];
    if (w.ask === 'same') return 'P(\\text{same colour})';
    if (w.ask === 'mixed') return 'P(\\text{one of each})';
    return `P(\\text{${colours[x]} then ${colours[y]}})`;
  }
  const [a, b] = WORD_EVENTS[w.context].letters;
  return `P(${a}${x ? "'" : ''} \\cap ${b}${y ? "'" : ''})`;
}

/** Every branch of a two-stage tree as it should be labelled, a to f. */
const BRANCH_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

/** Fill in every branch of a tree described in words. */
const treeBranchTable: Generator<WordTreeParams> = {
  id: 'prob-tree-branches',
  sample: (rng, difficulty) => sampleWords(rng, difficulty, true),
  render: (w): Slide => {
    const { first, second } = wordsBranches(w);
    const answer = [...first, ...second[0], ...second[1]].map(probTok);
    const [r, b] = w.counts;
    const n = r + b;
    const slips = w.bag
      ? [fr([r, n - 1]), fr([r - 1, n]), fr([b, n - 1]), fr([b - 1, n]), fr([r - 1, n - 1]), fr([b - 1, n - 1]), fr([Math.min(r, b), Math.max(r, b)])]
      : [dec(w.p * w.q), dec(1 - w.p * w.q), dec(Math.abs(w.p - w.q)), dec(w.p + w.q)];
    return {
      kind: 'table',
      prompt: [
        say(wordsSentence(w)),
        picture(stagedTreeSvg({ stages: wordsStages(w), labels: [BRANCH_LETTERS.slice(0, 2), BRANCH_LETTERS.slice(2)] })),
        say('Fill in the probability on each branch, $a$ to $f$.'),
      ],
      columns: ['\\text{Branch}', '\\text{Probability}'],
      rows: BRANCH_LETTERS.map((letter) => [letter, null]),
      bank: bank(
        answer,
        slips.filter((t) => t.v <= 1),
      ),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (w) => {
    const { first, second } = wordsBranches(w);
    const t = (x: Prob) => probTok(x).tex;
    if (!w.bag) {
      const [a, b] = WORD_EVENTS[w.context].letters;
      return [
        { text: `First stage: $a = P(${a}) = ${t(first[0])}$, and $b = 1 - ${t(first[0])} = ${t(first[1])}$.` },
        { text: `The events are independent, so the second stage is the same after either branch: $c = e = ${t(second[0][0])}$ and $d = f = ${t(second[0][1])}$ for $${b}'$.` },
        { text: 'Each pair of branches from one point adds up to $1$.' },
      ];
    }
    const { colours } = WORD_BAGS[w.context];
    const [r, b] = w.counts;
    const n = r + b;
    const steps: SolutionStep[] = [{ text: `First pick: ${r} of the ${n} are ${colours[0]}, so $a = ${t(first[0])}$ and $b = ${t(first[1])}$.` }];
    if (w.replace) {
      steps.push({ text: `It goes back, so the second pick is the same whatever came first: $c = e = ${t(second[0][0])}$ and $d = f = ${t(second[0][1])}$.` });
    } else {
      steps.push(
        { text: `It is not put back, so the second pick is out of $${n - 1}$. After a ${colours[0]}, $${r - 1}$ ${colours[0]} are left: $c = ${t(second[0][0])}$ and $d = ${t(second[0][1])}$.` },
        { text: `After a ${colours[1]}, $${b - 1}$ ${colours[1]} are left: $e = ${t(second[1][0])}$ and $f = ${t(second[1][1])}$.` },
      );
    }
    steps.push({ text: 'Each pair of branches from one point adds up to $1$.' });
    return steps;
  },
};

/** A probability from a tree the learner draws for themselves. */
const treeFromWords: Generator<WordTreeParams> = {
  id: 'prob-tree-words',
  sample: (rng, difficulty) => {
    const w = sampleWords(rng, difficulty, true);
    return difficulty > 1 ? { ...w, ask: rng.chance(0.5) ? 'same' : 'mixed' } : w;
  },
  render: (w): Slide => {
    const ask =
      w.ask === 'same'
        ? 'Find the probability that both are the same colour.'
        : w.ask === 'mixed'
          ? 'Find the probability of one of each colour.'
          : `Find $${wordsAskTex(w)}$.`;
    return probSlide(
      [say(wordsSentence(w)), picture(stagedTreeSvg({ stages: wordsStages(w), labels: [['', ''], ['', '', '', '']] })), say(`Label the branches, then: ${ask}`)],
      `${wordsAskTex(w)} =`,
      probTok(wordsValue(w)).answer,
    );
  },
  solution: (w) => {
    const { first, second } = wordsBranches(w);
    const t = (x: Prob) => probTok(x).tex;
    const along = (x: number, y: number) => `${t(first[x])} \\times ${t(second[x][y])}`;
    const steps: SolutionStep[] = [
      { text: `First stage: $${t(first[0])}$ and $${t(first[1])}$.` },
      {
        text: w.bag && !w.replace ? 'The first is not put back, so the second stage is out of one fewer and changes with the first.' : 'The second stage is the same after either first branch.',
      },
    ];
    if (w.ask === 'path') {
      const [x, y] = w.path;
      steps.push({ text: 'Multiply along the path:' }, { tex: `${wordsAskTex(w)} = ${along(x, y)} = ${t(wordsValue(w))}` });
    } else {
      const [p1, p2]: [[number, number], [number, number]] = w.ask === 'same' ? [[0, 0], [1, 1]] : [[0, 1], [1, 0]];
      steps.push(
        { text: 'Two paths give it. Multiply along each, then add:' },
        { tex: `${along(...p1)} + ${along(...p2)} = ${t(wordsValue(w))}` },
      );
    }
    return steps;
  },
  choices: (w) => {
    const { first, second } = wordsBranches(w);
    const [x, y] = w.path;
    const slips: Prob[] = [];
    if (w.bag) slips.push(wordsValue({ ...w, replace: !w.replace }));
    if (w.ask === 'path') {
      slips.push(plus(first[x], second[x][y]), times(first[1 - x], second[1 - x][y]), times(first[x], second[x][1 - y]));
    } else {
      slips.push(wordsValue({ ...w, ask: w.ask === 'same' ? 'mixed' : 'same' }), times(first[0], second[0][w.ask === 'same' ? 0 : 1]));
    }
    return probChoices(
      probTok(wordsValue(w)),
      slips.map(probTok).filter((t) => t.v <= 1),
      saltOf(w),
    );
  },
};

/** Build a two-draw tree a fork at a time: does the second draw change, its branch, the answer. */
const replaceFlow: Generator<WordTreeParams> = {
  id: 'prob-replace-flow',
  sample: (rng, difficulty) => {
    const w = sampleWords(rng, difficulty, false);
    return { ...w, replace: rng.chance(0.5), ask: difficulty > 1 ? 'mixed' : 'path', path: [0, 0] };
  },
  render: (w): Slide => {
    const { colours } = WORD_BAGS[w.context];
    const [c0, c1] = colours;
    const [one] = THINGS[w.thing];
    const [r, b] = w.counts;
    const n = r + b;
    const salt = saltOf(w);
    const mixed = w.ask === 'mixed';
    const same = `Yes, the ${w.holder} is as it was`;
    const fewer = `No, there is one ${one} fewer`;
    const branchRight: Frac = mixed ? (w.replace ? [b, n] : [b, n - 1]) : w.replace ? [r, n] : [r - 1, n - 1];
    const branchWrong: Frac[] = mixed
      ? [w.replace ? [b, n - 1] : [b, n], [b - 1, n - 1], [b - 1, n]]
      : [w.replace ? [r - 1, n - 1] : [r, n], [r - 1, n], [r, n - 1]];
    const label = (f: Frac) => `$${rawTex(f)}$`;
    const right = probTok(wordsValue(w));
    const wrongValues = otherValues(right, [
      probTok(wordsValue({ ...w, replace: !w.replace })),
      mixed ? fr(fmul([r, n], branchRight)) : fr(fmul([r, n], [r, n])),
      mixed ? probTok(wordsValue({ ...w, ask: 'same' })) : fr([2 * r - 1, 2 * n - 1]),
    ]).slice(0, 2);
    return {
      kind: 'flow',
      prompt: [say(wordsSentence(w)), say('Build the tree one fork at a time.')],
      subject: mixed ? 'P(\\text{one of each})' : `P(\\text{both ${c0}})`,
      steps: [
        {
          id: 'change',
          ask: 'Are the chances on the second pick the same as on the first?',
          branches: forkOf(w.replace ? same : fewer, [w.replace ? fewer : same], salt, `Look again at what happens to the first ${one} before the second is taken.`, { to: 'branch' }),
        },
        {
          id: 'branch',
          ask: mixed ? `What goes on the ${c1} branch after a ${c0}?` : `What goes on the ${c0} branch after a ${c0}?`,
          branches: forkOf(label(branchRight), branchWrong.map(label), salt >> 3, `Count what is in the ${w.holder} at the second pick, of each colour and altogether.`, { to: 'answer' }),
        },
        {
          id: 'answer',
          ask: mixed ? 'So what is the probability of one of each colour?' : `So what is the probability that both are ${c0}?`,
          branches: forkOf(
            `$${right.tex}$`,
            wrongValues.map((t) => `$${t.tex}$`),
            salt >> 6,
            mixed ? 'One of each happens two ways round. Multiply along each path, then add.' : 'Multiply along the path, first branch times second.',
            { outcome: mixed ? 'Right: two paths, each multiplied along, then added.' : 'Right: multiply along the path.' },
          ),
        },
      ],
      answer: [w.replace ? same : fewer, label(branchRight), `$${right.tex}$`],
    };
  },
  solution: (w) => {
    const { first, second } = wordsBranches(w);
    const t = (x: Prob) => probTok(x).tex;
    const { colours } = WORD_BAGS[w.context];
    const [r, b] = w.counts;
    const n = r + b;
    const steps: SolutionStep[] = [
      {
        text: w.replace
          ? `The first goes back, so the second pick is again out of $${n}$ with $${r}$ ${colours[0]} and $${b}$ ${colours[1]}.`
          : `The first is kept out, so the second pick is out of $${n - 1}$, with one fewer of whichever colour came first.`,
      },
    ];
    if (w.ask === 'mixed') {
      steps.push({ tex: `${t(first[0])} \\times ${t(second[0][1])} + ${t(first[1])} \\times ${t(second[1][0])} = ${t(wordsValue(w))}` });
    } else {
      steps.push({ tex: `${t(first[0])} \\times ${t(second[0][0])} = ${t(wordsValue(w))}` });
    }
    return steps;
  },
};

const THREE_WAY = [
  { intro: 'Jess gets to school by bus, on foot or by bike', who: 'she', names: ['B', 'W', 'C'], ways: ['takes the bus', 'walks', 'cycles'], event: 'is late', yes: 'L' },
  { intro: 'Every phone a shop sells is made in factory X, Y or Z', who: 'a phone', names: ['X', 'Y', 'Z'], ways: ['comes from factory X', 'comes from factory Y', 'comes from factory Z'], event: 'is faulty', yes: 'F' },
  { intro: 'Each evening Priya reads, plays a game or watches TV', who: 'she', names: ['R', 'G', 'T'], ways: ['reads', 'plays a game', 'watches TV'], event: 'is asleep by ten', yes: 'S' },
  { intro: 'A customer at a cafe pays by cash, card or phone', who: 'a customer', names: ['C', 'D', 'P'], ways: ['pays by cash', 'pays by card', 'pays by phone'], event: 'leaves a tip', yes: 'T' },
] as const;

export interface MissingBranchParams {
  context: number;
  /** First-stage probabilities, hundredths, adding to 100. */
  first: [number, number, number];
  /** P(yes) after each first outcome, hundredths. */
  yes: [number, number, number];
  /** The first outcome asked about, whose branch is missing. */
  k: number;
  hard: boolean;
}

/** A three-way first stage with a branch missing: 1 minus the others, then multiply. */
const branchMissing: Generator<MissingBranchParams> = {
  id: 'prob-branch-missing',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const unit = hard ? 5 : 10;
    for (;;) {
      const first = splitWhole(rng, 100 / unit, 3, 1).map((x) => x * unit) as [number, number, number];
      const yes = [0, 1, 2].map(() => unit * rng.int(1, 100 / unit - 1)) as [number, number, number];
      if (yes.some((y) => y === 50)) continue;
      return { context: rng.int(0, THREE_WAY.length - 1), first, yes, k: rng.int(0, 2), hard };
    }
  },
  render: (params): Slide => {
    const { first, yes, k, hard } = params;
    const ctx = THREE_WAY[params.context];
    const h = (x: number) => fmt(x / 100);
    const labels = [
      first.map((x, i) => (i === k ? '?' : h(x))),
      yes.flatMap((y, i) => [hard && i === k ? '?' : h(y), h(100 - y)]),
    ];
    const answer = [dec(first[k] / 100), dec(yes[k] / 100), dec((first[k] * yes[k]) / 10000)];
    const others = first.filter((_, i) => i !== k);
    return {
      kind: 'tiles',
      prompt: [
        say(`${ctx.intro}. The tree shows the probabilities, where $${ctx.yes}$ means ${ctx.who} ${ctx.event}.`),
        picture(stagedTreeSvg({ stages: [[...ctx.names], [ctx.yes, `${ctx.yes}'`]], labels })),
        say(`Find the probability that ${ctx.who} ${ctx.ways[k]} and ${ctx.event}.`),
      ],
      template: `P(${ctx.names[k]} \\cap ${ctx.yes}) = {0} \\times {1} = {2}`,
      answer: answer.map((t) => t.tex),
      bank: bank(answer, [
        dec((100 - yes[k]) / 100),
        dec((first[k] * (100 - yes[k])) / 10000),
        ...others.map((x) => dec(x / 100)),
        dec((others[0] * yes[k]) / 10000),
        dec((first[k] + yes[k]) / 100),
      ]),
    };
  },
  solution: ({ first, yes, k, hard, context }) => {
    const ctx = THREE_WAY[context];
    const h = (x: number) => fmt(x / 100);
    const others = first.filter((_, i) => i !== k);
    const steps: SolutionStep[] = [
      { text: 'The three first branches add up to $1$:' },
      { tex: `P(${ctx.names[k]}) = 1 - ${h(others[0])} - ${h(others[1])} = ${h(first[k])}` },
    ];
    if (hard) steps.push({ text: `The two branches after $${ctx.names[k]}$ add up to $1$ too: $1 - ${h(100 - yes[k])} = ${h(yes[k])}$.` });
    steps.push({ text: 'Then multiply along the path:' }, { tex: `${h(first[k])} \\times ${h(yes[k])} = ${fmt((first[k] * yes[k]) / 10000)}` });
    return steps;
  },
};

/* ================================================================
 * Level 3, lesson 2: three-stage trees
 * ================================================================ */

const TRIALS = [
  { setup: 'Ria plays three games of chess', ones: 'games', yes: 'W', no: 'L', yesMeans: 'she wins a game', noMeans: 'she loses it' },
  { setup: 'Ben drives through three sets of traffic lights', ones: 'sets of lights', yes: 'G', no: 'R', yesMeans: 'a set is green', noMeans: 'it is red' },
  { setup: 'Kai takes three penalties', ones: 'penalties', yes: 'S', no: 'M', yesMeans: 'he scores', noMeans: 'he misses' },
  { setup: 'Three seeds are planted, one from each of three packets', ones: 'seeds', yes: 'G', no: 'N', yesMeans: 'a seed grows', noMeans: 'it does not' },
  { setup: 'Zoe guesses the answers to three quiz questions', ones: 'guesses', yes: 'C', no: 'X', yesMeans: 'a guess is correct', noMeans: 'it is wrong' },
  { setup: 'Three trains run on a line one morning', ones: 'trains', yes: 'T', no: 'D', yesMeans: 'a train is on time', noMeans: 'it is delayed' },
] as const;

export interface ThreeParams {
  context: number;
  /** P(yes) at each stage. */
  p: [Prob, Prob, Prob];
  /** A path: true for yes at that stage. */
  path: [boolean, boolean, boolean];
  /** What the question is about, where a generator asks more than one thing. */
  ask: 'yes' | 'no';
}

function sampleThree(rng: Rng, difficulty: number): ThreeParams {
  const hard = difficulty > 1;
  const context = rng.int(0, TRIALS.length - 1);
  const path: [boolean, boolean, boolean] = [rng.chance(0.5), rng.chance(0.5), rng.chance(0.5)];
  const ask = rng.chance(0.5) ? 'yes' : 'no';
  if (!hard) {
    const tenth = (): Prob => ({ kind: 'dec', v: rng.pick([1, 2, 3, 4, 6, 7, 8, 9]) / 10 });
    const one = tenth();
    const p: [Prob, Prob, Prob] = rng.chance(0.5) ? [one, one, one] : [one, tenth(), tenth()];
    return { context, p, path, ask };
  }
  for (;;) {
    const fractions = rng.chance(0.5);
    // One stage in hundredths and two in tenths keeps every path to four places.
    const fine = rng.int(0, 2);
    const pick = (k: number): Prob => {
      if (!fractions && k === fine) return { kind: 'dec', v: 5 * rng.pick([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]) / 100 };
      if (!fractions) return { kind: 'dec', v: rng.pick([1, 2, 3, 4, 6, 7, 8, 9]) / 10 };
      const d = rng.int(3, 8);
      return { kind: 'frac', f: simplest([rng.int(1, d - 1), d]) };
    };
    const p: [Prob, Prob, Prob] = [pick(0), pick(1), pick(2)];
    if (same(probValue(p[0]), probValue(p[1])) && same(probValue(p[1]), probValue(p[2]))) continue;
    if (p.some((x) => same(probValue(x), 0.5))) continue;
    return { context, p, path, ask };
  }
}

function threeSentence({ context }: ThreeParams): string {
  const ctx = TRIALS[context];
  return `${ctx.setup}. $${ctx.yes}$ means ${ctx.yesMeans} and $${ctx.no}$ means ${ctx.noMeans}. The ${ctx.ones} are independent, with the probabilities on the tree.`;
}

function threePicture(params: ThreeParams): Block {
  const ctx = TRIALS[params.context];
  const outcomes = [ctx.yes, ctx.no];
  return picture(
    stagedTreeSvg({
      stages: [outcomes, outcomes, outcomes],
      labels: params.p.map((p, k) => Array.from({ length: 2 ** k }, () => [probPlain(p), probPlain(notP(p))]).flat()),
    }),
  );
}

/** The branch taken at each stage of `path`. */
const branchOf = (params: ThreeParams, path: boolean[]): Prob[] => path.map((yes, k) => (yes ? params.p[k] : notP(params.p[k])));

const productOf = (xs: Prob[]): Prob => xs.reduce((acc, x) => times(acc, x));

const threePathTex = (params: ThreeParams, path: boolean[]): string => {
  const ctx = TRIALS[params.context];
  return `P(${path.map((yes) => (yes ? ctx.yes : ctx.no)).join(', ')})`;
};

/** Multiply along one path of a three-stage tree. */
const threePath: Generator<ThreeParams> = {
  id: 'prob-three-path',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleThree(rng, difficulty);
      if (difficulty > 1 && params.path.every((yes) => yes)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const ctx = TRIALS[params.context];
    const letters = params.path.map((yes) => (yes ? ctx.yes : ctx.no));
    return probSlide(
      [say(threeSentence(params)), threePicture(params), say(`Find $${threePathTex(params, params.path)}$: $${letters[0]}$, then $${letters[1]}$, then $${letters[2]}$.`)],
      `${threePathTex(params, params.path)} =`,
      probTok(productOf(branchOf(params, params.path))).answer,
    );
  },
  solution: (params) => {
    const along = branchOf(params, params.path);
    const t = (x: Prob) => probTok(x).tex;
    return [
      { text: 'Follow the path through all three stages and multiply the three branches on it.' },
      { tex: `${threePathTex(params, params.path)} = ${along.map(t).join(' \\times ')} = ${t(productOf(along))}` },
    ];
  },
  choices: (params) => {
    const along = branchOf(params, params.path);
    const flipped = branchOf(params, params.path.map((yes, k) => (k === 0 ? !yes : yes)));
    return probChoices(
      probTok(productOf(along)),
      [plus(plus(along[0], along[1]), along[2]), times(along[0], along[1]), productOf(flipped), productOf(params.p)].map(probTok).filter((t) => t.v <= 1),
      saltOf(params),
    );
  },
};

/** "At least one" through the one path where it never happens. */
const threeAtLeast: Generator<ThreeParams> = {
  id: 'prob-three-atleast',
  sample: (rng, difficulty) => {
    const params = sampleThree(rng, difficulty);
    return difficulty > 1 ? params : { ...params, ask: 'yes' };
  },
  render: (params): Slide => {
    const ctx = TRIALS[params.context];
    // At least one of `want` fails only on the path that is all of the other.
    const want = params.ask === 'yes' ? ctx.yes : ctx.no;
    const other = params.ask === 'yes' ? ctx.no : ctx.yes;
    const never = branchOf(params, [params.ask === 'no', params.ask === 'no', params.ask === 'no']);
    const none = productOf(never);
    const answer = [...never, none, notP(none)].map(probTok);
    const slips = [productOf(branchOf(params, [params.ask === 'yes', params.ask === 'yes', params.ask === 'yes'])), plus(plus(never[0], never[1]), never[2]), times(never[0], never[1])];
    return {
      kind: 'tree',
      prompt: [
        say(threeSentence(params)),
        threePicture(params),
        say(`Find the probability of at least one $${want}$ in three steps. Top row: $P(${other})$ for each of the three ${ctx.ones} in turn. Then the probability of $${other}$ every time, then of at least one $${want}$.`),
      ],
      expression: `1 - P(${other}, ${other}, ${other})`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'c', from: [] },
        { id: 'none', from: ['a', 'b', 'c'] },
        { id: 'one', from: ['none'] },
      ],
      bank: bank(answer, [...slips, notP(slips[0])].map(probTok).filter((t) => t.v <= 1)),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const ctx = TRIALS[params.context];
    const want = params.ask === 'yes' ? ctx.yes : ctx.no;
    const other = params.ask === 'yes' ? ctx.no : ctx.yes;
    const never = branchOf(params, [params.ask === 'no', params.ask === 'no', params.ask === 'no']);
    const t = (x: Prob) => probTok(x).tex;
    return [
      { text: `At least one $${want}$ fails only on one path: $${other}$ all three times.` },
      { tex: `P(${other}, ${other}, ${other}) = ${never.map(t).join(' \\times ')} = ${t(productOf(never))}` },
      { tex: `P(\\text{at least one } ${want}) = 1 - ${t(productOf(never))} = ${t(notP(productOf(never)))}` },
    ];
  },
};

/** All three the same: two paths, each multiplied along, then added. */
const threeSameSteps: Generator<ThreeParams> = {
  id: 'prob-three-same-steps',
  sample: sampleThree,
  render: (params): Slide => {
    const ctx = TRIALS[params.context];
    const t = (x: Prob) => probTok(x).tex;
    const [p0, p1, p2] = params.p;
    const [q0, q1, q2] = params.p.map(notP);
    const p01 = times(p0, p1);
    const q01 = times(q0, q1);
    const all = times(p01, p2);
    const none = times(q01, q2);
    const total = plus(all, none);
    const nudge: Prob = { kind: 'dec', v: 0.1 };
    return {
      kind: 'steps',
      prompt: [
        say(threeSentence(params)),
        threePicture(params),
        say(`Find the probability that all three ${ctx.ones} go the same way: $${ctx.yes}$ every time or $${ctx.no}$ every time. Tap the part you would work out next, then choose what it comes to.`),
      ],
      start: [t(p0), '\\times', t(p1), '\\times', t(p2), '+', t(q0), '\\times', t(q1), '\\times', t(q2)],
      reductions: [
        { span: [0, 3], operator: 1, value: t(p01), bank: stepBank(t(p01), t(plus(p0, p1)), t(times(p0, q1)), t(times(q0, p1))) },
        { span: [0, 3], operator: 1, value: t(all), bank: stepBank(t(all), t(times(p01, q2)), t(times(p01, p0)), t(plus(all, nudge))) },
        { span: [2, 5], operator: 3, value: t(q01), bank: stepBank(t(q01), t(plus(q0, q1)), t(times(q0, p1)), t(times(p0, q1))) },
        { span: [2, 5], operator: 3, value: t(none), bank: stepBank(t(none), t(times(q01, p2)), t(times(q01, q0)), t(plus(none, nudge))) },
        { span: [0, 3], operator: 1, value: t(total), bank: stepBank(t(total), t(times(all, none)), t(notP(total)), t(plus(total, nudge))) },
      ],
    };
  },
  solution: (params) => {
    const ctx = TRIALS[params.context];
    const t = (x: Prob) => probTok(x).tex;
    const yes = params.p;
    const no = params.p.map(notP);
    return [
      { text: `Two paths go the same way all three times: $${ctx.yes}, ${ctx.yes}, ${ctx.yes}$ and $${ctx.no}, ${ctx.no}, ${ctx.no}$. Multiply along each, then add.` },
      { tex: `${yes.map(t).join(' \\times ')} = ${t(productOf(yes))}` },
      { tex: `${no.map(t).join(' \\times ')} = ${t(productOf(no))}` },
      { tex: `${t(productOf(yes))} + ${t(productOf(no))} = ${t(plus(productOf(yes), productOf(no)))}` },
    ];
  },
};

/** The three paths of "exactly one" or "exactly two", in the order the tree lists them. */
function exactlyPaths(params: ThreeParams): boolean[][] {
  const two = params.ask === 'no';
  return [0, 1, 2].map((odd) => [0, 1, 2].map((k) => (k === odd) !== two));
}

/** Exactly one (or exactly two): three paths written out, then added. */
const threeExactlyTiles: Generator<ThreeParams> = {
  id: 'prob-three-exactly-tiles',
  sample: (rng, difficulty) => {
    const params = sampleThree(rng, difficulty);
    return { ...params, ask: difficulty > 1 ? 'no' : 'yes' };
  },
  render: (params): Slide => {
    const ctx = TRIALS[params.context];
    const paths = exactlyPaths(params);
    const values = paths.map((path) => productOf(branchOf(params, path)));
    const total = values.reduce((acc, v) => plus(acc, v));
    const answer = [...values, total].map(probTok);
    const how = params.ask === 'no' ? 'exactly two' : 'exactly one';
    const slips = [productOf(params.p), productOf(params.p.map(notP)), ...exactlyPaths({ ...params, ask: params.ask === 'no' ? 'yes' : 'no' }).map((path) => productOf(branchOf(params, path)))];
    return {
      kind: 'tiles',
      prompt: [
        say(threeSentence(params)),
        threePicture(params),
        say(`Find the probability of ${how} $${ctx.yes}$ from the three paths it happens on:`),
        show(`\\begin{aligned} & ${threePathTex(params, paths[0])} \\\\ + {} & ${threePathTex(params, paths[1])} \\\\ + {} & ${threePathTex(params, paths[2])} \\end{aligned}`),
      ],
      template: '{0} + {1} + {2} = {3}',
      answer: answer.map((t) => t.tex),
      bank: bank(answer, [...slips, plus(total, values[0])].map(probTok).filter((t) => t.v <= 1)),
    };
  },
  solution: (params) => {
    const paths = exactlyPaths(params);
    const t = (x: Prob) => probTok(x).tex;
    const values = paths.map((path) => productOf(branchOf(params, path)));
    return [
      { text: 'Multiply along each of the three paths:' },
      ...paths.map((path) => ({ tex: `${threePathTex(params, path)} = ${branchOf(params, path).map(t).join(' \\times ')} = ${t(productOf(branchOf(params, path)))}` })),
      { text: 'Then add them:' },
      { tex: `\\begin{aligned} & ${values.map(t).join(' + ')} \\\\ = {} & ${t(values.reduce((acc, v) => plus(acc, v)))} \\end{aligned}` },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 3: a two-set Venn diagram from totals
 * ================================================================ */

export interface TotalsParams {
  context: number;
  /** Only A, both, only B, neither, as `VENN` diagrams hold them. */
  regions: [number, number, number, number];
  /** The fourth fact the question gives: the overlap, or how many do neither. */
  given: 'both' | 'neither';
  /** Which count a question asks for, where it asks for one. */
  ask: 'neither' | 'onlyA' | 'onlyB' | 'union' | 'both';
}

function sampleTotals(rng: Rng, difficulty: number): TotalsParams {
  const hard = difficulty > 1;
  for (;;) {
    const regions: TotalsParams['regions'] = hard
      ? [rng.int(3, 25), rng.int(2, 15), rng.int(3, 25), rng.int(1, 15)]
      : [rng.int(2, 14), rng.int(1, 9), rng.int(2, 14), rng.int(1, 10)];
    if (regions[0] === regions[2]) continue;
    const ask = hard ? rng.pick(['both', 'onlyA', 'onlyB'] as const) : rng.pick(['neither', 'onlyB', 'union'] as const);
    return { context: rng.int(0, VENN.length - 1), regions, given: hard ? 'neither' : 'both', ask };
  }
}

/** The totals a question states: n(A), n(B), everyone. */
export function totalsOf({ regions: [a, b, c, d] }: TotalsParams) {
  return { nA: a + b, nB: b + c, total: a + b + c + d };
}

function totalsSentence(params: TotalsParams): string {
  const ctx = VENN[params.context];
  const { nA, nB, total } = totalsOf(params);
  const last = params.given === 'both' ? `${params.regions[1]} do both` : `${params.regions[3]} do neither`;
  return `Of ${total} ${ctx.who}, ${nA} ${ctx.aText}, ${nB} ${ctx.bText}, and ${last}.`;
}

const blankVenn = (params: TotalsParams): Block => {
  const ctx = VENN[params.context];
  return picture(vennSvg([ctx.A, ctx.B], ['?', '?', '?', '?']));
};

/** The four regions from the totals, overlap first; at difficulty 2 the overlap comes from the total. */
const vennRegionsTable: Generator<TotalsParams> = {
  id: 'prob-venn-regions-table',
  sample: sampleTotals,
  render: (params): Slide => {
    const ctx = VENN[params.context];
    const [a, b, c, d] = params.regions;
    const { nA, nB, total } = totalsOf(params);
    const both = params.given === 'both';
    const labels = both
      ? ['\\text{both}', `${ctx.A} \\text{ only}`, `${ctx.B} \\text{ only}`, '\\text{neither}']
      : ['\\text{at least one}', '\\text{both}', `${ctx.A} \\text{ only}`, `${ctx.B} \\text{ only}`];
    const answer = (both ? [b, a, c, d] : [a + b + c, b, a, c]).map(dec);
    return {
      kind: 'table',
      prompt: [
        say(totalsSentence(params)),
        blankVenn(params),
        say(both ? 'Fill in the four regions, starting with the overlap.' : 'Work out how many do at least one, then fill in the three regions inside the circles.'),
      ],
      columns: ['\\text{Region}', '\\text{Number}'],
      rows: labels.map((label) => [label, null]),
      bank: bank(answer, [dec(nA), dec(nB), dec(nA + nB), dec(total - nA - nB), dec(total - b), dec(nA + nB - total)]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const ctx = VENN[params.context];
    const [a, b, c, d] = params.regions;
    const { nA, nB, total } = totalsOf(params);
    const steps: SolutionStep[] = [];
    if (params.given === 'neither') {
      steps.push(
        { text: `Everyone not in neither is in at least one circle: $${total} - ${d} = ${a + b + c}$.` },
        { text: `Adding the two circles counts the overlap twice, so the overlap is the excess: $${nA} + ${nB} - ${a + b + c} = ${b}$.` },
      );
    } else {
      steps.push({ text: `The overlap is given: $${b}$ do both.` });
    }
    steps.push({ tex: `${ctx.A} \\text{ only}: ${nA} - ${b} = ${a}, \\quad ${ctx.B} \\text{ only}: ${nB} - ${b} = ${c}` });
    if (params.given === 'both') steps.push({ text: `The rest are outside both circles: $${total} - (${a} + ${b} + ${c}) = ${d}$.` });
    return steps;
  },
};

/** Where to start, then each region in turn, as a sequence of forks. */
const vennStartFlow: Generator<TotalsParams> = {
  id: 'prob-venn-start-flow',
  sample: sampleTotals,
  render: (params): Slide => {
    const ctx = VENN[params.context];
    const [a, b, c, d] = params.regions;
    const { nA, nB, total } = totalsOf(params);
    const salt = saltOf(params);
    const num = (n: number) => `$${n}$`;
    const choices = (right: number, wrong: number[]) => [...new Set(wrong.filter((w) => w > 0 && w !== right))].slice(0, 2).map(num);
    const inside = a + b + c;
    const onlyA = { ask: `How many go in $${ctx.A}$ only?`, right: a, wrong: [nA, nA + b, nA - 2 * b, a + 1] };
    const steps =
      params.given === 'both'
        ? [
            {
              id: 'first',
              ask: 'Which region do you fill in first?',
              branches: forkOf('The overlap', [`$${ctx.A}$ only`, 'Outside both circles'], salt, `Each count you are given includes some other region. Which one is given exactly?`, { to: 'only' }),
            },
            { id: 'only', ask: onlyA.ask, branches: forkOf(num(a), choices(a, onlyA.wrong), salt >> 3, `The ${nA} who ${ctx.aText} include the ${b} who do both.`, { to: 'out' }) },
            {
              id: 'out',
              ask: 'How many go outside both circles?',
              branches: forkOf(num(d), choices(d, [total - nA - nB, total - b, total - a - c, d + 1]), salt >> 6, 'Add the three regions inside the circles, then take them from the total.', {
                outcome: 'Right: everyone left over once the circles are filled.',
              }),
            },
          ]
        : [
            {
              id: 'inside',
              ask: 'How many do at least one of the two?',
              branches: forkOf(num(inside), choices(inside, [total, nA + nB, total - d - b, inside + 1]), salt, 'Everyone except those who do neither.', { to: 'both' }),
            },
            {
              id: 'both',
              ask: 'So how many do both?',
              branches: forkOf(num(b), choices(b, [nA + nB - total, total - nA - nB + d, inside - nA, b + 1]), salt >> 3, 'Adding the two circles counts the overlap twice. How far over the at-least-one count is that?', {
                to: 'only',
              }),
            },
            { id: 'only', ask: onlyA.ask, branches: forkOf(num(a), choices(a, onlyA.wrong), salt >> 6, `The ${nA} who ${ctx.aText} include those who do both.`, { outcome: 'Right: the circle minus its overlap.' }) },
          ];
    const answer = params.given === 'both' ? ['The overlap', num(a), num(d)] : [num(inside), num(b), num(a)];
    return {
      kind: 'flow',
      prompt: [say(totalsSentence(params)), blankVenn(params)],
      subject: `\\text{Filling in the diagram}`,
      steps,
      answer,
    };
  },
  solution: (params) => {
    const [a, b, c, d] = params.regions;
    const { nA, total } = totalsOf(params);
    if (params.given === 'both') {
      return [
        { text: `Start with the overlap, which is given: $${b}$.` },
        { text: `Then the rest of each circle: $${nA} - ${b} = ${a}$ in the first only.` },
        { text: `Outside both is what is left: $${total} - (${a} + ${b} + ${c}) = ${d}$.` },
      ];
    }
    return [
      { text: `At least one: $${total} - ${d} = ${a + b + c}$.` },
      { text: `Both: the two circle counts together run over that by the overlap, $${b}$.` },
      { text: `Then the first circle only: $${nA} - ${b} = ${a}$.` },
    ];
  },
};

const TOTALS_ASK = {
  neither: { tex: (A: string, B: string) => `n((${A} \\cup ${B})')`, words: () => 'in neither set' },
  onlyA: { tex: (A: string, B: string) => `n(${A} \\cap ${B}')`, words: (A: string) => `in $${A}$ only` },
  onlyB: { tex: (A: string, B: string) => `n(${A}' \\cap ${B})`, words: (_A: string, B: string) => `in $${B}$ only` },
  union: { tex: (A: string, B: string) => `n(${A} \\cup ${B})`, words: () => 'in at least one set' },
  both: { tex: (A: string, B: string) => `n(${A} \\cap ${B})`, words: () => 'in both sets' },
} as const;

export function totalsAnswer({ regions: [a, b, c, d], ask }: TotalsParams): number {
  return { neither: d, onlyA: a, onlyB: c, union: a + b + c, both: b }[ask];
}

/** One region's count from the totals, typed. */
const vennCount: Generator<TotalsParams> = {
  id: 'prob-venn-count',
  sample: sampleTotals,
  render: (params): Slide => {
    const ctx = VENN[params.context];
    const how = TOTALS_ASK[params.ask];
    return countSlide(
      [say(totalsSentence(params)), say(`Find $${how.tex(ctx.A, ctx.B)}$, the number ${how.words(ctx.A, ctx.B)}, where $${ctx.A}$ is the set who ${ctx.aText} and $${ctx.B}$ the set who ${ctx.bText}.`)],
      `${how.tex(ctx.A, ctx.B)} =`,
      totalsAnswer(params),
    );
  },
  solution: (params) => {
    const [a, b, c, d] = params.regions;
    const { nA, nB, total } = totalsOf(params);
    const steps: SolutionStep[] = [];
    if (params.given === 'neither') {
      steps.push({ text: `At least one: $${total} - ${d} = ${a + b + c}$. The two circles add to $${nA} + ${nB} = ${nA + nB}$, which counts the overlap twice, so the overlap is $${nA + nB} - ${a + b + c} = ${b}$.` });
    } else {
      steps.push({ text: `Start from the overlap, $${b}$.` });
    }
    steps.push({ tex: `${nA} - ${b} = ${a}, \\quad ${nB} - ${b} = ${c}` });
    if (params.given === 'both') steps.push({ text: `Inside the circles: $${a} + ${b} + ${c} = ${a + b + c}$, so outside: $${total} - ${a + b + c} = ${d}$.` });
    steps.push({ text: `So the answer is $${totalsAnswer(params)}$.` });
    return steps;
  },
  choices: (params) => {
    const [, b, , d] = params.regions;
    const { nA, nB, total } = totalsOf(params);
    const right = totalsAnswer(params);
    const wrong = { neither: [total - nA - nB, total - b, b + d], onlyA: [nA, nA + b, total - nB], onlyB: [nB, nB + b, total - nA], union: [nA + nB, total, nA + nB + b], both: [nA + nB - total, total - nA - nB + d, d] }[
      params.ask
    ];
    return probChoices(
      dec(right),
      wrong.filter((w) => w > 0).map(dec),
      saltOf(params),
    );
  },
};

/** Which list of four region counts matches the words: the overlap-twice slips as distractors. */
const vennMatch: Generator<TotalsParams> = {
  id: 'prob-venn-match',
  sample: sampleTotals,
  render: (params): Slide => {
    const ctx = VENN[params.context];
    const [a, b, c, d] = params.regions;
    const { nA, nB, total } = totalsOf(params);
    const list = (xs: number[]) => (xs.every((x) => x >= 0) ? xs.join(', ') : '');
    const right = list([a, b, c, d]);
    const guessed = nA + nB - total;
    const wrong = [
      list([nA, b, nB, d]),
      list([a, b, c, total - nA - nB]),
      list([nA, b, nB, total - nA - nB - b]),
      list([c, b, a, d]),
      params.given === 'neither' && guessed > 0 ? list([nA - guessed, guessed, nB - guessed, d]) : '',
    ].filter((w) => w !== '' && w !== right);
    return pickSlide(
      [say(totalsSentence(params)), say(`Which list gives the four regions of the Venn diagram, in the order $${ctx.A}$ only, both, $${ctx.B}$ only, neither?`)],
      right,
      params.given === 'neither' ? [wrong[wrong.length - 1], ...wrong.slice(0, -1)] : wrong,
      saltOf(params),
      false,
    );
  },
  solution: (params) => {
    const [a, b, c, d] = params.regions;
    const { nA, nB, total } = totalsOf(params);
    return [
      params.given === 'both'
        ? { text: `The overlap is $${b}$. Each circle's count includes it, so take it off each.` }
        : { text: `At least one is $${total} - ${d} = ${a + b + c}$, so the overlap is $${nA} + ${nB} - ${a + b + c} = ${b}$.` },
      { tex: `${nA} - ${b} = ${a}, \\quad ${nB} - ${b} = ${c}` },
      { text: `Neither: $${total} - ${a + b + c} = ${d}$. The list is $${a}, ${b}, ${c}, ${d}$.` },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 4: three-set Venn diagrams
 * ================================================================ */

export const VENN3 = [
  { who: 'students', one: 'student', names: ['F', 'G', 'S'], verb: 'study', nouns: ['French', 'German', 'Spanish'] },
  { who: 'people', one: 'person', names: ['C', 'D', 'R'], verb: 'own', nouns: ['a cat', 'a dog', 'a rabbit'] },
  { who: 'members', one: 'member', names: ['S', 'C', 'R'], verb: '', nouns: ['swim', 'cycle', 'run'] },
  { who: 'customers', one: 'customer', names: ['B', 'M', 'E'], verb: 'bought', nouns: ['bread', 'milk', 'eggs'] },
  { who: 'pupils', one: 'pupil', names: ['A', 'M', 'P'], verb: 'like', nouns: ['art', 'music', 'PE'] },
  { who: 'guests', one: 'guest', names: ['T', 'C', 'J'], verb: 'drink', nouns: ['tea', 'coffee', 'juice'] },
] as const;

type Venn3Context = (typeof VENN3)[number];

const setText = (ctx: Venn3Context, i: number): string => `${ctx.verb} ${ctx.nouns[i]}`.trim();
const bothText = (ctx: Venn3Context, i: number, j: number): string => `${ctx.verb} ${ctx.nouns[i]} and ${ctx.nouns[j]}`.trim();
const names3 = (ctx: Venn3Context): [string, string, string] => [...ctx.names];

/** "$F$ is the set who study French, $G$ who study German and $S$ who study Spanish." */
function venn3Key(ctx: Venn3Context): string {
  return `$${ctx.names[0]}$ is the set who ${setText(ctx, 0)}, $${ctx.names[1]}$ who ${setText(ctx, 1)} and $${ctx.names[2]}$ who ${setText(ctx, 2)}.`;
}

export interface Venn3Params {
  context: number;
  /** In `VENN3_REGIONS` order: three singles, three pairs only, all three, none. */
  regions: number[];
  /** A set the question is about, where it is about one. */
  set: number;
  /** A region the question is about, where it is about one. */
  region: number;
  /** A generator's own switch between two forms of question. */
  form: number;
  hard: boolean;
}

function sampleVenn3(rng: Rng, difficulty: number): Venn3Params {
  const hard = difficulty > 1;
  return {
    context: rng.int(0, VENN3.length - 1),
    regions: Array.from({ length: 8 }, () => (hard ? rng.int(2, 15) : rng.int(1, 9))),
    set: rng.int(0, 2),
    region: rng.int(0, 7),
    form: rng.int(0, 5),
    hard,
  };
}

/** How many are in every region whose sets include all of `sets`. */
export function venn3Count(regions: number[], sets: number[]): number {
  return sumOf(regions.filter((_, i) => sets.every((s) => VENN3_REGIONS[i].includes(s))));
}

/** The region holding exactly these sets. */
const regionOf = (sets: number[]): number => VENN3_REGIONS.findIndex((r) => r.length === sets.length && sets.every((s) => r.includes(s)));

/** The regions of a three-set diagram from the set, pair and grand totals. */
const venn3Fill: Generator<Venn3Params> = {
  id: 'prob-venn3-fill',
  sample: sampleVenn3,
  render: (params): Slide => {
    const ctx = VENN3[params.context];
    const r = params.regions;
    const total = sumOf(r);
    const [A, B, C] = ctx.names;
    const n = [0, 1, 2].map((s) => venn3Count(r, [s]));
    const opening = `Of ${total} ${ctx.who}, ${n[0]} ${setText(ctx, 0)}, ${n[1]} ${setText(ctx, 1)} and ${n[2]} ${setText(ctx, 2)}.`;
    const pairs = [
      [0, 1],
      [0, 2],
      [1, 2],
    ];
    const pairTotals = pairs.map((pair) => venn3Count(r, pair));
    if (!params.hard) {
      const shown = r.map((x, i) => (i >= 3 && i <= 6 ? `${x}` : '?'));
      const answer = [r[0], r[1], r[2], r[7]].map(dec);
      return {
        kind: 'table',
        prompt: [say(`${opening} The diagram already shows those in two or three of the sets.`), picture(venn3Svg(names3(ctx), shown)), say('Fill in the rest.')],
        columns: ['\\text{Region}', '\\text{Number}'],
        rows: [`${A} \\text{ only}`, `${B} \\text{ only}`, `${C} \\text{ only}`, '\\text{none}'].map((label) => [label, null]),
        bank: bank(answer, [...n.map(dec), dec(n[0] - r[3] - r[4]), dec(total - sumOf(n)), dec(r[7] + r[6])]),
        answer: answer.map((t) => t.tex),
      };
    }
    const shown = r.map((x, i) => (i === 6 ? `${x}` : '?'));
    const answer = [r[3], r[4], r[5], r[0], r[1], r[2], r[7]].map(dec);
    return {
      kind: 'table',
      prompt: [
        say(
          `${opening} Also ${pairTotals[0]} ${bothText(ctx, 0, 1)}, ${pairTotals[1]} ${bothText(ctx, 0, 2)} and ${pairTotals[2]} ${bothText(ctx, 1, 2)}; each of these counts includes the ${r[6]} in all three.`,
        ),
        picture(venn3Svg(names3(ctx), shown)),
        say('Work outward from the middle and fill in every region.'),
      ],
      columns: ['\\text{Region}', '\\text{Number}'],
      rows: [`${A} \\cap ${B} \\text{ only}`, `${A} \\cap ${C} \\text{ only}`, `${B} \\cap ${C} \\text{ only}`, `${A} \\text{ only}`, `${B} \\text{ only}`, `${C} \\text{ only}`, '\\text{none}'].map((label) => [
        label,
        null,
      ]),
      bank: bank(answer, [...pairTotals.map(dec), ...n.map(dec), dec(n[0] - pairTotals[0] - pairTotals[1]), dec(total - sumOf(n))]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const ctx = VENN3[params.context];
    const r = params.regions;
    const [A, B, C] = ctx.names;
    const n = [0, 1, 2].map((s) => venn3Count(r, [s]));
    const total = sumOf(r);
    const steps: SolutionStep[] = [];
    if (params.hard) {
      const t = r[6];
      steps.push(
        { text: `Each pair count includes the ${t} in all three, so take ${t} off each for the two-only regions:` },
        { tex: `${venn3Count(r, [0, 1])} - ${t} = ${r[3]}, \\quad ${venn3Count(r, [0, 2])} - ${t} = ${r[4]}, \\quad ${venn3Count(r, [1, 2])} - ${t} = ${r[5]}` },
      );
    }
    steps.push(
      { text: `Each set's total, less everything already written inside that circle, leaves the region for that set only:` },
      { tex: `${A}: ${n[0]} - ${r[3] + r[4] + r[6]} = ${r[0]}, \\quad ${B}: ${n[1]} - ${r[3] + r[5] + r[6]} = ${r[1]}, \\quad ${C}: ${n[2]} - ${r[4] + r[5] + r[6]} = ${r[2]}` },
      { text: `None: the total less the seven regions inside, $${total} - ${total - r[7]} = ${r[7]}$.` },
    );
    return steps;
  },
};

/** For one set: the two-only regions, then the set only, from the counts in words. */
const venn3Outward: Generator<Venn3Params> = {
  id: 'prob-venn3-outward',
  sample: sampleVenn3,
  render: (params): Slide => {
    const ctx = VENN3[params.context];
    const r = params.regions;
    const total = sumOf(r);
    const s = params.set;
    const [t, u] = [0, 1, 2].filter((x) => x !== s);
    const [S, T, U] = [ctx.names[s], ctx.names[t], ctx.names[u]];
    const nS = venn3Count(r, [s]);
    const nST = venn3Count(r, [s, t]);
    const nSU = venn3Count(r, [s, u]);
    const st = r[regionOf([s, t])];
    const su = r[regionOf([s, u])];
    const only = r[s];
    const shown = r.map((x, i) => (i === 6 ? `${x}` : ''));
    const answer = [dec(st), dec(su), dec(only), ...(params.hard ? [fr([only, total])] : [])];
    const nodes = [
      { id: 'st', from: [] },
      { id: 'su', from: [] },
      { id: 'only', from: ['st', 'su'] },
      ...(params.hard ? [{ id: 'p', from: ['only'] }] : []),
    ];
    return {
      kind: 'tree',
      prompt: [
        say(`Of ${total} ${ctx.who}, ${nS} ${setText(ctx, s)}. ${nST} ${bothText(ctx, s, t)} and ${nSU} ${bothText(ctx, s, u)}, counting the ${r[6]} who do all three.`),
        picture(venn3Svg(names3(ctx), shown)),
        say(
          `Top row: how many are in $${S}$ and $${T}$ only, then in $${S}$ and $${U}$ only. Then how many are in $${S}$ only${params.hard ? `, then the probability that one ${ctx.one} chosen at random is in $${S}$ only` : ''}.`,
        ),
      ],
      expression: params.hard ? `P(${S} \\text{ only})` : `n(${S} \\text{ only})`,
      nodes,
      bank: bank(answer, [dec(nST), dec(nSU), dec(nS - st - su), dec(nS - nST - nSU), fr([only, nS]), fr([nS, total])]),
      answer: answer.map((x) => x.tex),
    };
  },
  solution: (params) => {
    const ctx = VENN3[params.context];
    const r = params.regions;
    const s = params.set;
    const [t, u] = [0, 1, 2].filter((x) => x !== s);
    const S = ctx.names[s];
    const nS = venn3Count(r, [s]);
    const st = r[regionOf([s, t])];
    const su = r[regionOf([s, u])];
    const steps: SolutionStep[] = [
      { text: `Start in the middle: $${r[6]}$ are in all three. Each pair count includes them, so take them off:` },
      { tex: `${venn3Count(r, [s, t])} - ${r[6]} = ${st}, \\quad ${venn3Count(r, [s, u])} - ${r[6]} = ${su}` },
      { text: `Then $${S}$ only is what is left of the $${nS}$ in $${S}$:` },
      { tex: `${nS} - ${st} - ${su} - ${r[6]} = ${r[s]}` },
    ];
    if (params.hard) steps.push({ tex: `P(${S} \\text{ only}) = ${rawTex([r[s], sumOf(r)])}${gcd(r[s], sumOf(r)) > 1 ? ` = ${ftex([r[s], sumOf(r)])}` : ''}` });
    return steps;
  },
};

/** A region marked x, from the grand total, a set's total, or how many are in at least one set. */
const venn3Missing: Generator<Venn3Params> = {
  id: 'prob-venn3-missing',
  sample: (rng, difficulty) => {
    const params = sampleVenn3(rng, difficulty);
    return params.hard ? { ...params, region: rng.int(0, 6), form: rng.int(0, 1) } : { ...params, region: 7, form: 0 };
  },
  render: (params): Slide => {
    const ctx = VENN3[params.context];
    const r = params.regions;
    const shown = r.map((x, i) => (i === params.region ? 'x' : `${x}`));
    let clue: string;
    if (!params.hard) {
      clue = `The Venn diagram shows ${sumOf(r)} ${ctx.who}.`;
    } else if (params.form === 0) {
      const holders = VENN3_REGIONS[params.region];
      const s = holders[params.set % holders.length];
      clue = `The Venn diagram shows some ${ctx.who}. Altogether ${venn3Count(r, [s])} ${setText(ctx, s)}.`;
    } else {
      clue = `The Venn diagram shows some ${ctx.who}. Altogether ${sumOf(r) - r[7]} are in at least one of the sets.`;
    }
    return countSlide([say(`${clue} ${venn3Key(ctx)}`), picture(venn3Svg(names3(ctx), shown)), say('Find $x$.')], 'x =', r[params.region]);
  },
  solution: (params) => {
    const ctx = VENN3[params.context];
    const r = params.regions;
    const x = r[params.region];
    if (!params.hard) {
      return [
        { text: 'Everyone is in exactly one region, so the eight regions add up to the total.' },
        { tex: `x = ${sumOf(r)} - ${sumOf(r) - x} = ${x}` },
      ];
    }
    if (params.form === 0) {
      const holders = VENN3_REGIONS[params.region];
      const s = holders[params.set % holders.length];
      const inS = r.filter((_, i) => i !== params.region && VENN3_REGIONS[i].includes(s));
      return [
        { text: `The four regions inside $${ctx.names[s]}$ add up to $${venn3Count(r, [s])}$.` },
        { tex: `x = ${venn3Count(r, [s])} - (${inS.join(' + ')}) = ${x}` },
      ];
    }
    const inside = r.filter((_, i) => i !== params.region && i !== 7);
    return [
      { text: `The seven regions inside the circles add up to $${sumOf(r) - r[7]}$; the ${r[7]} outside are not part of it.` },
      { tex: `x = ${sumOf(r) - r[7]} - ${sumOf(inside)} = ${x}` },
    ];
  },
};

/** Descriptions of groups of regions of a three-set diagram, with their regions. */
const WHERE3: { words: (n: string[]) => string; set: number[]; hard: boolean }[] = [
  { words: ([a]) => `in $${a}$ only`, set: [0], hard: false },
  { words: ([, b]) => `in $${b}$ only`, set: [1], hard: false },
  { words: ([, , c]) => `in $${c}$ only`, set: [2], hard: false },
  { words: ([a, b, c]) => `in $${a}$ and $${b}$ but not $${c}$`, set: [3], hard: false },
  { words: ([a, b, c]) => `in $${a}$ and $${c}$ but not $${b}$`, set: [4], hard: false },
  { words: ([a, b, c]) => `in $${b}$ and $${c}$ but not $${a}$`, set: [5], hard: false },
  { words: () => 'in all three sets', set: [6], hard: false },
  { words: () => 'in none of the sets', set: [7], hard: false },
  { words: () => 'in exactly one set', set: [0, 1, 2], hard: true },
  { words: () => 'in exactly two sets', set: [3, 4, 5], hard: true },
  { words: ([a, b, c]) => `in $${a}$ or $${b}$ but not $${c}$`, set: [0, 1, 3], hard: true },
  { words: () => 'in at least two sets', set: [3, 4, 5, 6], hard: true },
  { words: ([a]) => `in $${a}$`, set: [0, 3, 4, 6], hard: true },
  { words: ([, b]) => `in $${b}$`, set: [1, 3, 5, 6], hard: true },
  { words: ([a]) => `not in $${a}$`, set: [1, 2, 5, 7], hard: true },
  { words: ([a, b]) => `in $${a}$ but not $${b}$`, set: [0, 4], hard: true },
  { words: ([, b, c]) => `in $${b}$ but not $${c}$`, set: [1, 3], hard: true },
  { words: ([a, , c]) => `in $${c}$ but not $${a}$`, set: [2, 5], hard: true },
  { words: ([a, b]) => `in both $${a}$ and $${b}$`, set: [3, 6], hard: true },
  { words: ([a, , c]) => `in both $${a}$ and $${c}$`, set: [4, 6], hard: true },
];

interface Where3Params {
  letters: string[];
  pick: number;
}

/** Which region, or regions, a description names, on a diagram labelled with letters. */
const venn3Where: Generator<Where3Params> = {
  id: 'prob-venn3-where',
  sample: (rng, difficulty) => {
    const pool = WHERE3.map((w, i) => ({ w, i })).filter(({ w }) => w.hard === difficulty > 1);
    return { letters: rng.sample(['p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'k', 'm'], 8), pick: rng.pick(pool).i };
  },
  render: ({ letters, pick }): Slide => {
    const { words, set, hard } = WHERE3[pick];
    const salt = saltOf(letters, pick);
    const label = (regions: number[]) => regionLabel(letters, regions);
    const others = WHERE3.filter((w) => w.hard === hard && label(w.set) !== label(set))
      .map((w) => ({ text: label(w.set), size: w.set.length, key: hashSeed(`${salt}:${label(w.set)}`) }))
      .sort((x, y) => Number(x.size !== set.length) - Number(y.size !== set.length) || x.key - y.key);
    return pickSlide(
      [
        say('The eight regions of this Venn diagram are labelled with letters.'),
        picture(venn3Svg(['A', 'B', 'C'], letters)),
        say(`Which ${set.length === 1 ? 'region holds' : 'regions hold'} everyone ${words(['A', 'B', 'C'])}?`),
      ],
      label(set),
      others.map((o) => o.text).slice(0, 3),
      salt,
      false,
    );
  },
  solution: ({ letters, pick }) => {
    const { words, set } = WHERE3[pick];
    const said = ['in $A$ only', 'in $B$ only', 'in $C$ only', 'in $A$ and $B$ only', 'in $A$ and $C$ only', 'in $B$ and $C$ only', 'in all three', 'outside all three circles'];
    return [
      { text: `Everyone ${words(['A', 'B', 'C'])}: that is ${listing(set.map((i) => said[i]))}.` },
      { text: `So ${set.length === 1 ? 'region' : 'regions'} ${regionLabel(letters, set)}.` },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 5: probabilities from a filled diagram
 * ================================================================ */

/** Events on a three-set diagram, over the sets `s` and `t` where they name two. */
const EVENTS3: { key: string; tex: (n: string[], s: number, t: number) => string; words: (n: string[], s: number, t: number) => string; regions: (s: number, t: number) => number[]; hard: boolean }[] = [
  { key: 'none', tex: () => 'P(\\text{none})', words: () => 'is in none of the sets', regions: () => [7], hard: false },
  { key: 'in', tex: (n, s) => `P(${n[s]})`, words: (n, s) => `is in $${n[s]}$`, regions: (s) => [0, 1, 2, 3, 4, 5, 6].filter((i) => VENN3_REGIONS[i].includes(s)), hard: false },
  { key: 'all', tex: (n) => `P(${n[0]} \\cap ${n[1]} \\cap ${n[2]})`, words: () => 'is in all three sets', regions: () => [6], hard: false },
  { key: 'only', tex: (n, s) => `P(${n[s]} \\text{ only})`, words: (n, s) => `is in $${n[s]}$ only`, regions: (s) => [s], hard: false },
  { key: 'one', tex: () => 'P(\\text{exactly one})', words: () => 'is in exactly one set', regions: () => [0, 1, 2], hard: true },
  { key: 'two', tex: () => 'P(\\text{exactly two})', words: () => 'is in exactly two sets', regions: () => [3, 4, 5], hard: true },
  { key: 'twoPlus', tex: () => 'P(\\text{at least two})', words: () => 'is in at least two sets', regions: () => [3, 4, 5, 6], hard: true },
  {
    key: 'or',
    tex: (n, s, t) => `P(${n[s]} \\cup ${n[t]})`,
    words: (n, s, t) => `is in $${n[s]}$ or $${n[t]}$ or both`,
    regions: (s, t) => [0, 1, 2, 3, 4, 5, 6].filter((i) => VENN3_REGIONS[i].includes(s) || VENN3_REGIONS[i].includes(t)),
    hard: true,
  },
  { key: 'any', tex: (n) => `P(${n[0]} \\cup ${n[1]} \\cup ${n[2]})`, words: () => 'is in at least one set', regions: () => [0, 1, 2, 3, 4, 5, 6], hard: true },
  {
    key: 'and',
    tex: (n, s, t) => `P(${n[s]} \\cap ${n[t]})`,
    words: (n, s, t) => `is in both $${n[s]}$ and $${n[t]}$`,
    regions: (s, t) => [3, 4, 5, 6].filter((i) => VENN3_REGIONS[i].includes(s) && VENN3_REGIONS[i].includes(t)),
    hard: true,
  },
];

export interface ChanceParams extends Venn3Params {
  event: number;
  other: number;
}

/** The regions an event covers, and how many are in them. */
export function chanceFavourable(params: ChanceParams): { regions: number[]; fav: number } {
  const e = EVENTS3[params.event];
  const regions = e.regions(params.set, params.other);
  return { regions, fav: sumOf(regions.map((i) => params.regions[i])) };
}

/** A probability read off a filled three-set diagram. */
const venn3Chance: Generator<ChanceParams> = {
  id: 'prob-venn3-chance',
  sample: (rng, difficulty) => {
    const params = sampleVenn3(rng, difficulty);
    const pool = EVENTS3.map((e, i) => ({ e, i })).filter(({ e }) => e.hard === difficulty > 1);
    return { ...params, event: rng.pick(pool).i, other: (params.set + rng.int(1, 2)) % 3 };
  },
  render: (params): Slide => {
    const ctx = VENN3[params.context];
    const n = names3(ctx);
    const e = EVENTS3[params.event];
    const total = sumOf(params.regions);
    return probSlide(
      [
        say(`The Venn diagram shows ${total} ${ctx.who}. ${venn3Key(ctx)}`),
        picture(venn3Svg(n, params.regions.map(String))),
        say(`One ${ctx.one} is chosen at random. Find the probability that the ${ctx.one} ${e.words(n, params.set, params.other)}.`),
      ],
      `${e.tex(n, params.set, params.other)} =`,
      fans([chanceFavourable(params).fav, total]),
    );
  },
  solution: (params) => {
    const ctx = VENN3[params.context];
    const n = names3(ctx);
    const e = EVENTS3[params.event];
    const total = sumOf(params.regions);
    const { regions, fav } = chanceFavourable(params);
    const said = regionWords(true, n);
    return [
      { text: `The eight regions add up to $${total}$.` },
      { text: `The event covers ${listing(regions.map((i) => said[i]))}: $${regions.map((i) => params.regions[i]).join(' + ')} = ${fav}$.` },
      { tex: `${e.tex(n, params.set, params.other)} = ${rawTex([fav, total])}${gcd(fav, total) > 1 ? ` = ${ftex([fav, total])}` : ''}` },
    ];
  },
  choices: (params) => {
    const r = params.regions;
    const total = sumOf(r);
    const { regions, fav } = chanceFavourable(params);
    const inside = total - r[7];
    const withMiddle = regions.includes(6) ? fav - r[6] : fav + r[6];
    return probChoices(fr([fav, total]), [fr([fav, inside]), fr([withMiddle, total]), fr([total - fav, total]), fr([fav + r[7], total])], saltOf(params));
  },
};

export interface EventsTableParams {
  three: boolean;
  context: number;
  regions: number[];
}

/** Rows of an events table: TeX, then the regions (by index) the event covers. */
function eventRows(params: EventsTableParams): [string, number[]][] {
  if (!params.three) {
    const ctx = VENN[params.context];
    return [
      [`P(${ctx.A} \\cup ${ctx.B})`, [0, 1, 2]],
      ['P(\\text{exactly one})', [0, 2]],
      ['P(\\text{neither})', [3]],
    ];
  }
  return [
    ['P(\\text{at least one})', [0, 1, 2, 3, 4, 5, 6]],
    ['P(\\text{exactly one})', [0, 1, 2]],
    ['P(\\text{exactly two})', [3, 4, 5]],
    ['P(\\text{none})', [7]],
  ];
}

/** Several events' probabilities read off one filled diagram. */
const vennEventsTable: Generator<EventsTableParams> = {
  id: 'prob-venn-events-table',
  sample: (rng, difficulty) => {
    const three = difficulty > 1;
    for (;;) {
      const regions = Array.from({ length: three ? 8 : 4 }, () => (three ? rng.int(1, 12) : rng.int(2, 15)));
      if (!three && regions[0] === regions[2]) continue;
      return { three, context: rng.int(0, (three ? VENN3 : VENN).length - 1), regions };
    }
  },
  render: (params): Slide => {
    const r = params.regions;
    const total = sumOf(r);
    const rows = eventRows(params);
    const answer = rows.map(([, set]) => fr([sumOf(set.map((i) => r[i])), total]));
    const inside = total - r[r.length - 1];
    const slips = rows.flatMap(([, set]) => {
      const fav = sumOf(set.map((i) => r[i]));
      return [fr([fav, inside]), fr([fav + r[1], total]), fr([total - fav, inside])];
    });
    let prompt: Block[];
    if (params.three) {
      const ctx = VENN3[params.context];
      prompt = [say(`The Venn diagram shows ${total} ${ctx.who}. ${venn3Key(ctx)}`), picture(venn3Svg(names3(ctx), r.map(String)))];
    } else {
      const ctx = VENN[params.context];
      prompt = [
        say(`The Venn diagram shows ${total} ${ctx.who}. $${ctx.A}$ is the set who ${ctx.aText} and $${ctx.B}$ the set who ${ctx.bText}.`),
        picture(vennSvg([ctx.A, ctx.B], r.map(String) as [string, string, string, string])),
      ];
    }
    prompt.push(say(`One ${params.three ? VENN3[params.context].one : VENN[params.context].one} is chosen at random. Fill in the probability of each event.`));
    return {
      kind: 'table',
      prompt,
      columns: ['\\text{Event}', '\\text{Probability}'],
      rows: rows.map(([tex]) => [tex, null]),
      bank: bank(answer, slips.filter((t) => t.v <= 1)),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const r = params.regions;
    const total = sumOf(r);
    const outside = r[r.length - 1];
    return [
      { text: `All the regions together come to $${total}$. Every probability is out of that.` },
      ...eventRows(params).flatMap(([tex, set]): SolutionStep[] => {
        const fav = sumOf(set.map((i) => r[i]));
        // "At least one" is everything but the outside, which is quicker as a subtraction.
        const count = set.length === r.length - 1 ? `$${total} - ${outside} = ${fav}$` : set.length > 1 ? `$${set.map((i) => r[i]).join(' + ')} = ${fav}$` : `$${fav}$`;
        return [{ text: `For $${tex}$ the count is ${count}.` }, { tex: `${tex} = ${rawTex([fav, total])}${gcd(fav, total) > 1 ? ` = ${ftex([fav, total])}` : ''}` }];
      }),
    ];
  },
};

/** Region names for a flow's labels: prose with inline TeX. */
function regionWords(three: boolean, n: string[]): string[] {
  return three
    ? [`$${n[0]}$ only`, `$${n[1]}$ only`, `$${n[2]}$ only`, `$${n[0]}$ and $${n[1]}$ only`, `$${n[0]}$ and $${n[2]}$ only`, `$${n[1]}$ and $${n[2]}$ only`, 'all three', 'none']
    : [`$${n[0]}$ only`, 'both', `$${n[1]}$ only`, 'neither'];
}

/** Events a flow asks about: TeX, then regions. Two-set diagrams first, then three. */
const READ_EVENTS = {
  two: [
    { tex: (n: string[]) => `P(${n[0]} \\cup ${n[1]})`, regions: [0, 1, 2] },
    { tex: () => 'P(\\text{exactly one})', regions: [0, 2] },
    { tex: (n: string[]) => `P(${n[1]}')`, regions: [0, 3] },
    { tex: (n: string[]) => `P(${n[0]}')`, regions: [2, 3] },
  ],
  three: [
    { tex: () => 'P(\\text{exactly one})', regions: [0, 1, 2] },
    { tex: () => 'P(\\text{exactly two})', regions: [3, 4, 5] },
    { tex: () => 'P(\\text{at least two})', regions: [3, 4, 5, 6] },
    { tex: (n: string[]) => `P(${n[0]}')`, regions: [1, 2, 5, 7] },
    { tex: (n: string[]) => `P(${n[0]} \\cap ${n[1]}')`, regions: [0, 4] },
  ],
};

/** Distractor region-sets for a flow: the other events', then near misses. */
function nearSets(three: boolean, right: number[]): number[][] {
  const pool = (three ? READ_EVENTS.three : READ_EVENTS.two).map((e) => e.regions);
  const extra = three ? [[0, 1, 2, 7], [3, 4, 5, 6, 7], [6], [0, 4, 6]] : [[1], [0, 1, 2, 3], [0], [1, 3]];
  const key = (s: number[]) => [...s].sort((a, b) => a - b).join(',');
  const seen = new Set([key(right)]);
  const out: number[][] = [];
  for (const s of [...pool, ...extra]) {
    if (seen.has(key(s))) continue;
    seen.add(key(s));
    out.push(s);
  }
  return out;
}

export interface ReadFlowParams extends EventsTableParams {
  event: number;
}

/** An event read off a filled diagram in three forks: its regions, their count, the probability. */
const vennReadFlow: Generator<ReadFlowParams> = {
  id: 'prob-venn-read-flow',
  sample: (rng, difficulty) => {
    const params = vennEventsTable.sample(rng, difficulty);
    return { ...params, event: rng.int(0, (params.three ? READ_EVENTS.three : READ_EVENTS.two).length - 1) };
  },
  render: (params): Slide => {
    const r = params.regions;
    const total = sumOf(r);
    const ctx3 = VENN3[params.context % VENN3.length];
    const ctx2 = VENN[params.context % VENN.length];
    const n = params.three ? names3(ctx3) : [ctx2.A, ctx2.B];
    const words = regionWords(params.three, n);
    const e = (params.three ? READ_EVENTS.three : READ_EVENTS.two)[params.event];
    const setLabel = (s: number[]) => listing(s.map((i) => words[i]));
    const countOf = (s: number[]) => sumOf(s.map((i) => r[i]));
    const salt = saltOf(params);
    const fav = countOf(e.regions);
    const wrongSets = nearSets(params.three, e.regions).filter((s) => setLabel(s) !== setLabel(e.regions));
    const counts: number[] = [];
    for (const c of [...wrongSets.map(countOf), fav + 1, fav - 1, fav + 2]) {
      if (c > 0 && c !== fav && !counts.includes(c) && counts.length < 2) counts.push(c);
    }
    const right = fr([fav, total]);
    const probs = otherValues(right, [fr([fav, total - r[r.length - 1]]), fr([total - fav, total]), fr([fav, total + fav]), fr([fav + 1, total])]).slice(0, 2);
    const one = params.three ? ctx3.one : ctx2.one;
    const who = params.three ? ctx3.who : ctx2.who;
    const prompt: Block[] = params.three
      ? [say(`The Venn diagram shows ${total} ${who}. ${venn3Key(ctx3)}`), picture(venn3Svg(names3(ctx3), r.map(String)))]
      : [
          say(`The Venn diagram shows ${total} ${who}. $${ctx2.A}$ is the set who ${ctx2.aText} and $${ctx2.B}$ the set who ${ctx2.bText}.`),
          picture(vennSvg([ctx2.A, ctx2.B], r.map(String) as [string, string, string, string])),
        ];
    prompt.push(say(`One ${one} is chosen at random. Find $${e.tex(n)}$.`));
    return {
      kind: 'flow',
      prompt,
      subject: e.tex(n),
      steps: [
        {
          id: 'which',
          ask: 'Which regions make up the event?',
          branches: forkOf(setLabel(e.regions), wrongSets.slice(0, 2).map(setLabel), salt, 'Read the event again: which regions are in it, and which are not?', { to: 'count' }),
        },
        {
          id: 'count',
          ask: `How many ${who} is that?`,
          branches: forkOf(`$${fav}$`, counts.map((c) => `$${c}$`), salt >> 3, 'Add the numbers in exactly those regions.', { to: 'prob' }),
        },
        {
          id: 'prob',
          ask: 'So what is the probability?',
          branches: forkOf(`$${right.tex}$`, probs.map((t) => `$${t.tex}$`), salt >> 6, 'The chance is out of everyone in the diagram, inside the circles and out.', {
            outcome: 'Right: the favourable count over everyone.',
          }),
        },
      ],
      answer: [setLabel(e.regions), `$${fav}$`, `$${right.tex}$`],
    };
  },
  solution: (params) => {
    const r = params.regions;
    const total = sumOf(r);
    const n = params.three ? names3(VENN3[params.context % VENN3.length]) : [VENN[params.context % VENN.length].A, VENN[params.context % VENN.length].B];
    const e = (params.three ? READ_EVENTS.three : READ_EVENTS.two)[params.event];
    const fav = sumOf(e.regions.map((i) => r[i]));
    return [
      { text: `$${e.tex(n)}$ covers ${listing(e.regions.map((i) => regionWords(params.three, n)[i]))}.` },
      { text: `Those regions hold $${e.regions.map((i) => r[i]).join(' + ')} = ${fav}$, out of $${total}$ altogether.` },
      { tex: `${e.tex(n)} = ${rawTex([fav, total])}${gcd(fav, total) > 1 ? ` = ${ftex([fav, total])}` : ''}` },
    ];
  },
};

export interface SumTilesParams {
  three: boolean;
  context: number;
  /** Each region's probability, hundredths, adding to 100. */
  regions: number[];
  /** Two-set: the union or exactly one. Three-set: exactly one or at least two. */
  first: boolean;
}

/** The regions a sum-tiles question adds, in the order its working lists them. */
function sumRegions({ three, first }: SumTilesParams): number[] {
  if (three) return first ? [0, 1, 2] : [3, 4, 5, 6];
  return first ? [0, 1, 2] : [0, 2];
}

/** `lhs` on a line of its own, then `= a`, `+ b`, ... one term a line, to fit a phone. */
function stackedSum(lhs: string, terms: string[]): string {
  const [first, ...rest] = terms;
  return `\\begin{aligned} & ${lhs} \\\\ = {} & ${first} ${rest.map((t) => `\\\\ & + ${t}`).join(' ')} \\end{aligned}`;
}

/** A diagram of probabilities: add the regions an event covers. */
const vennSumTiles: Generator<SumTilesParams> = {
  id: 'prob-venn-sum-tiles',
  sample: (rng, difficulty) => {
    const three = difficulty > 1;
    const regions = three ? splitWhole(rng, 100, 8, 2) : splitWhole(rng, 20, 4, 1).map((x) => 5 * x);
    return { three, context: rng.int(0, (three ? VENN3 : VENN).length - 1), regions, first: rng.chance(0.5) };
  },
  render: (params): Slide => {
    const r = params.regions;
    const h = (x: number) => fmt(x / 100);
    const picked = sumRegions(params);
    const answer = [...picked.map((i) => dec(r[i] / 100)), dec(sumOf(picked.map((i) => r[i])) / 100)];
    const template = `${picked.map((_, i) => `{${i}}`).join(' + ')} = {${picked.length}}`;
    let lead: Block[];
    let working: string;
    if (params.three) {
      const ctx = VENN3[params.context];
      const [A, B, C] = ctx.names;
      lead = [say(`The Venn diagram shows the probabilities for one ${ctx.one} chosen at random. ${venn3Key(ctx)}`), picture(venn3Svg(names3(ctx), r.map(h)))];
      working = params.first
        ? stackedSum('P(\\text{exactly one})', [`P(${A} \\text{ only})`, `P(${B} \\text{ only})`, `P(${C} \\text{ only})`])
        : stackedSum('P(\\text{at least two})', [`P(${A} \\cap ${B} \\text{ only})`, `P(${A} \\cap ${C} \\text{ only})`, `P(${B} \\cap ${C} \\text{ only})`, 'P(\\text{all three})']);
    } else {
      const ctx = VENN[params.context];
      const [A, B] = [ctx.A, ctx.B];
      lead = [
        say(`The Venn diagram shows the probabilities for one ${ctx.one} chosen at random. $${A}$ is the set who ${ctx.aText} and $${B}$ the set who ${ctx.bText}.`),
        picture(vennSvg([A, B], r.map(h) as [string, string, string, string])),
      ];
      working = params.first
        ? stackedSum(`P(${A} \\cup ${B})`, [`P(${A} \\text{ only})`, `P(${A} \\cap ${B})`, `P(${B} \\text{ only})`])
        : stackedSum('P(\\text{exactly one})', [`P(${A} \\text{ only})`, `P(${B} \\text{ only})`]);
    }
    const rest = r.map((_, i) => i).filter((i) => !picked.includes(i));
    return {
      kind: 'tiles',
      prompt: [...lead, say('Fill in the working, in the order it is written:'), show(working)],
      template,
      answer: answer.map((t) => t.tex),
      bank: bank(answer, [...rest.map((i) => dec(r[i] / 100)), dec(1 - sumOf(picked.map((i) => r[i])) / 100)]),
    };
  },
  solution: (params) => {
    const r = params.regions;
    const h = (x: number) => fmt(x / 100);
    const picked = sumRegions(params);
    return [
      { text: 'Each region already holds its probability, so add the regions the event covers.' },
      { tex: `\\begin{aligned} & ${picked.map((i) => h(r[i])).join(' + ')} \\\\ = {} & ${h(sumOf(picked.map((i) => r[i])))} \\end{aligned}` },
      { text: `A check: all the regions add up to $1$, so the rest come to $${h(100 - sumOf(picked.map((i) => r[i])))}$.` },
    ];
  },
};

/* ================================================================
 * Level 4: conditional probability, shared
 * ================================================================ */

/** `P(A \mid B)`: the space after `\mid` keeps it off a following letter. */
const condTex = (event: string, on: string): string => `P(${event} \\mid ${on})`;

/**
 * A chain of equal expressions, one to a line and aligned on the equals signs,
 * so a line of working with a conditional in it still fits a phone.
 */
const chain = (first: string, ...rest: string[]): string => `\\begin{aligned} ${first} &= ${rest.join(' \\\\ &= ')} \\end{aligned}`;

/** An event and its complement: `R` and `R'`. */
const not = (label: string): string => (label.endsWith("'") ? label.slice(0, -1) : `${label}'`);

/** Hundredths as a token: `35` is `0.35`. */
const hun = (h: number): Tok => dec(h / 100);

/** Ten-thousandths, the product of two hundredths: `1575` is `0.1575`. */
const tth = (x: number): Tok => dec(x / 10000);

/** A fraction as it stands, uncancelled, for a tile: `\frac{12}{60}`. */
const raw = (f: Frac): Tok => ({ tex: rawTex(f), v: fv(f), answer: fans(f), frac: simplest(f) });

/**
 * Two events, the second depending on the first, with the words for each
 * branch of the tree: `onA` and `offA` name the first-stage branch a sentence
 * is about, `yes` and `no` the second-stage outcome.
 */
export const COND_STORIES = [
  { A: 'R', B: 'L', a: 'it rains on a school day', notA: 'it is dry on a school day', b: 'Sam is late', onA: 'On a rainy day', offA: 'On a dry day', yes: 'Sam is late', no: 'Sam is on time' },
  { A: 'T', B: 'M', a: "Priya's train is delayed", notA: "Priya's train runs on time", b: 'she misses her meeting', onA: 'When the train is delayed', offA: 'When the train runs on time', yes: 'she misses the meeting', no: 'she makes the meeting' },
  { A: 'W', B: 'V', a: 'a team wins the toss', notA: 'the team loses the toss', b: 'it wins the match', onA: 'When the team wins the toss', offA: 'When it loses the toss', yes: 'it wins the match', no: 'it does not win the match' },
  { A: 'F', B: 'T', a: 'a patient has flu', notA: 'a patient does not have flu', b: 'their test comes back positive', onA: 'For a patient with flu', offA: 'For a patient without flu', yes: 'the test is positive', no: 'the test is negative' },
  { A: 'S', B: 'C', a: 'a day is sunny', notA: 'a day is not sunny', b: 'the cafe sells out of ice cream', onA: 'On a sunny day', offA: 'On a day that is not sunny', yes: 'the cafe sells out', no: 'the cafe does not sell out' },
  { A: 'H', B: 'Q', a: 'Ben does his homework', notA: 'Ben has not done his homework', b: 'he passes the quiz', onA: 'When Ben has done his homework', offA: 'When he has not', yes: 'he passes the quiz', no: 'he fails the quiz' },
] as const;

type Story = (typeof COND_STORIES)[number];

function storySentence(s: Story): string {
  return `$${s.A}$ is the event that ${s.a}, and $${s.B}$ that ${s.b}.`;
}

/** "On a rainy day, the probability that Sam is on time is $0.7$." */
function condSentence(s: Story, onA: boolean, yes: boolean, h: number): string {
  return `${onA ? s.onA : s.offA}, the probability that ${yes ? s.yes : s.no} is $${fmt(h / 100)}$.`;
}

/** A tree of two dependent events: the second stage differs under each branch. */
export interface CondTreeParams {
  story: number;
  /** Hundredths: `P(A)`, `P(B | A)` and `P(B | A')`. */
  a: number;
  hit: number;
  miss: number;
  hard: boolean;
}

function sampleCondTree(rng: Rng, difficulty: number): CondTreeParams {
  const hard = difficulty > 1;
  const step = hard ? 5 : 10;
  for (;;) {
    const draw = () => step * rng.int(1, 100 / step - 1);
    const a = draw();
    const hit = draw();
    const miss = draw();
    if (hit === miss || a === 50) continue;
    return { story: rng.int(0, COND_STORIES.length - 1), a, hit, miss, hard };
  }
}

/** The four ends of the tree, top to bottom, in ten-thousandths. */
function condLeaves({ a, hit, miss }: CondTreeParams): [number, number, number, number] {
  return [a * hit, a * (100 - hit), (100 - a) * miss, (100 - a) * (100 - miss)];
}

/** The end reached by `A` or `A'`, then `B` or `B'`. */
const leafOf = (params: CondTreeParams, onA: boolean, yes: boolean): number => condLeaves(params)[(onA ? 0 : 2) + (yes ? 0 : 1)];

/** The branch `P(B | A)`, `P(B' | A')` and so on, in hundredths. */
const condBranchOf = ({ hit, miss }: CondTreeParams, onA: boolean, yes: boolean): number => {
  const h = onA ? hit : miss;
  return yes ? h : 100 - h;
};

/**
 * The tree as a static picture. `hide` blanks branches by position: the first
 * stage top to bottom, then the second stage top to bottom.
 */
function condTreeSvg(params: CondTreeParams, hide: boolean[] = []): string {
  const s = COND_STORIES[params.story];
  const { a, hit, miss } = params;
  const values = [a, 100 - a, hit, 100 - hit, miss, 100 - miss].map((h, i) => (hide[i] ? '' : fmt(h / 100)));
  return treeSvg({
    first: [values[0], values[1]],
    second: [
      [values[2], values[3]],
      [values[4], values[5]],
    ],
    names: [s.A, not(s.A), s.B, not(s.B)],
  });
}

/* ================================================================
 * Level 4, lesson 1: the formula P(A | B) = P(A and B) / P(B)
 * ================================================================ */

/** The formula from a two-way table: each probability out of everyone, then divided. */
const condTableTiles: Generator<CondParams> = {
  id: 'prob-cf-table-tiles',
  sample: sampleCond,
  render: (params): Slide => {
    const ctx = TWO_WAY[params.context];
    const { cell, given, other, total, givenText, askText } = condParts(params);
    const answer = [raw([cell, total]), raw([given, total]), fr([cell, given])];
    return {
      kind: 'tiles',
      prompt: [
        show(twoWayTex(params, !params.hard)),
        say(
          `One ${ctx.one} is chosen at random. $A$ is the event that the ${ctx.one} ${askText}, and $B$ that the ${ctx.one} ${givenText}. Use the formula, with each probability out of all the ${ctx.who}.`,
        ),
      ],
      template: 'P(A \\mid B) = {0} \\div {1} = {2}',
      answer: answer.map((t) => t.tex),
      bank: bank(answer, [raw([other, total]), fr([cell, other]), raw([given - cell, total]), fr([cell, total - given]), raw([cell, given])]),
    };
  },
  solution: (params) => {
    const { cell, given, total } = condParts(params);
    const steps: SolutionStep[] = [];
    if (params.hard) steps.push({ text: `Add up every cell for the total: $${total}$.` });
    steps.push(
      { text: `$P(A \\cap B)$ is one cell, $${cell}$ out of $${total}$. $P(B)$ is the whole of that group, $${given}$ out of $${total}$.` },
      { tex: `P(A \\mid B) = ${rawTex([cell, total])} \\div ${rawTex([given, total])} = ${rawTex([cell, given])}${gcd(cell, given) > 1 ? ` = ${ftex([cell, given])}` : ''}` },
      { text: `The $${total}$s cancel, leaving the cell over the group total, just as in Given That, and Without Replacement.` },
    );
    return steps;
  },
};

type FormulaKind = 'divA' | 'divB' | 'whole' | 'not';

interface CondFormulaParams {
  story: number;
  kind: FormulaKind;
  /** Hundredths: the probability of the event conditioned on, and the conditional probability. */
  p: number;
  c: number;
}

/** What a formula question gives, asks, and its answer, all as tokens. */
function formulaParts({ story, kind, p, c }: CondFormulaParams) {
  const s = COND_STORIES[story];
  const both = dec((p * c) / 10000);
  const on = kind === 'divB' ? s.B : s.A;
  const event = kind === 'divB' ? s.A : kind === 'not' ? not(s.B) : s.B;
  const asked = kind === 'whole' ? `P(${s.A})` : condTex(event, on);
  const answer = kind === 'whole' ? hun(p) : kind === 'not' ? hun(100 - c) : hun(c);
  return { s, both, on, event, asked, answer };
}

/** `P(B | A)` from `P(A)` and `P(A and B)`, or the formula turned round. */
const condFormula: Generator<CondFormulaParams> = {
  id: 'prob-cf-formula',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick(hard ? (['whole', 'not'] as const) : (['divA', 'divB'] as const));
    const p = hard ? 5 * rng.int(2, 18) : 10 * rng.int(2, 8);
    const c = 10 * rng.int(1, 9);
    return { story: rng.int(0, COND_STORIES.length - 1), kind, p, c };
  },
  render: (params): Slide => {
    const { s, both, on, asked, answer } = formulaParts(params);
    const facts =
      params.kind === 'whole'
        ? `$P(${s.A} \\cap ${s.B}) = ${both.tex}$ and $${condTex(s.B, s.A)} = ${fmt(params.c / 100)}$.`
        : `$P(${on}) = ${fmt(params.p / 100)}$ and $P(${s.A} \\cap ${s.B}) = ${both.tex}$.`;
    const question: Record<FormulaKind, string> = {
      divA: `Find the probability that ${s.b}, given that ${s.a}.`,
      divB: `Find the probability that ${s.a}, given that ${s.b}.`,
      whole: `Find $P(${s.A})$.`,
      not: `Find the probability that ${s.no}, given that ${s.a}.`,
    };
    return probSlide([say(storySentence(s)), say(`${facts} ${question[params.kind]}`)], `${asked} =`, answer.answer);
  },
  solution: (params) => {
    const { s, both, on, event, answer } = formulaParts(params);
    const p = fmt(params.p / 100);
    const c = fmt(params.c / 100);
    if (params.kind === 'whole') {
      return [
        { text: `The formula turned round says $P(${s.A} \\cap ${s.B}) = P(${s.A}) \\times ${condTex(s.B, s.A)}$.` },
        { text: 'So divide the overlap by the conditional probability.' },
        { tex: chain(`P(${s.A})`, `\\frac{${both.tex}}{${c}}`, answer.tex) },
      ];
    }
    const steps: SolutionStep[] = [
      { text: `"Given that" puts $${on}$ on the bottom: divide the overlap by $P(${on})$.` },
      { tex: chain(condTex(params.kind === 'not' ? s.B : event, on), `\\frac{${both.tex}}{${p}}`, c) },
    ];
    if (params.kind === 'not') steps.push({ text: `That is the chance ${s.yes}. Given the same thing, the chance ${s.no} is the rest of $1$.` }, { tex: chain(condTex(event, on), `1 - ${c}`, answer.tex) });
    return steps;
  },
  choices: (params) => {
    const { both, answer } = formulaParts(params);
    const p = params.p / 100;
    const c = params.c / 100;
    const slips =
      params.kind === 'whole'
        ? [dec(both.v * c), hun(params.c), both, hun(100 - params.p)]
        : params.kind === 'not'
          ? [hun(params.c), dec(1 - both.v), both, dec(both.v * p)]
          : [dec(both.v * p), both, hun(params.p), hun(100 - params.c)];
    return probChoices(answer, slips, saltOf(params));
  },
};

/** Which fraction of a table of probabilities is a conditional one. */
interface JointParams {
  /** Hundredths: `A ∩ B`, `A ∩ B'`, `A' ∩ B`, `A' ∩ B'`. */
  cells: [number, number, number, number];
  row: number;
  col: number;
  /** Conditioned on the row's event or the column's. */
  on: 'row' | 'col';
  hard: boolean;
}

const JOINT_ROWS = ['A', "A'"];
const JOINT_COLS = ['B', "B'"];

function jointTotals({ cells: [a, b, c, d] }: JointParams) {
  return { rows: [a + b, c + d], cols: [a + c, b + d] };
}

function jointTex(params: JointParams): string {
  const [a, b, c, d] = params.cells.map((h) => fmt(h / 100));
  const t = jointTotals(params);
  const totals = !params.hard;
  const head = `& B & B'${totals ? ' & \\text{Total}' : ''}`;
  const row = (name: string, x: string, y: string, s: number) => `${name} & ${x} & ${y}${totals ? ` & ${fmt(s / 100)}` : ''}`;
  const lines = [head, `\\hline ${row('A', a, b, t.rows[0])}`, row("A'", c, d, t.rows[1])];
  if (totals) lines.push(`\\hline \\text{Total} & ${fmt(t.cols[0] / 100)} & ${fmt(t.cols[1] / 100)} & 1`);
  return `{\\small \\begin{array}{c|cc${totals ? '|c' : ''}} ${lines.join(' \\\\ ')} \\end{array}}`;
}

function jointParts(params: JointParams) {
  const t = jointTotals(params);
  const cell = params.cells[2 * params.row + params.col];
  const byRow = params.on === 'row';
  return {
    cell,
    given: byRow ? t.rows[params.row] : t.cols[params.col],
    other: byRow ? t.cols[params.col] : t.rows[params.row],
    event: byRow ? JOINT_COLS[params.col] : JOINT_ROWS[params.row],
    on: byRow ? JOINT_ROWS[params.row] : JOINT_COLS[params.col],
  };
}

const quotientTex = (top: number, bottom: number): string => `\\frac{${fmt(top / 100)}}{${fmt(bottom / 100)}}`;

const condJointWhich: Generator<JointParams> = {
  id: 'prob-cf-joint-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const draw = () => (hard ? rng.int(3, 40) : 5 * rng.int(1, 8));
      const cells = [draw(), draw(), draw()];
      const last = 100 - cells[0] - cells[1] - cells[2];
      if (last < (hard ? 3 : 5)) continue;
      const params: JointParams = {
        cells: [...cells, last] as JointParams['cells'],
        row: hard ? rng.int(0, 1) : 0,
        col: hard ? rng.int(0, 1) : 0,
        on: rng.pick(['row', 'col'] as const),
        hard,
      };
      if (hard && params.row === 0 && params.col === 0) continue;
      const { cell, given, other } = jointParts(params);
      // The product slip is a different number from the answer, or it is not a slip.
      if (given === other || same(cell / given, (other * given) / 10000)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { cell, given, other, event, on } = jointParts(params);
    return pickSlide(
      [say('The table gives the probabilities for two events $A$ and $B$.'), show(jointTex(params)), say(`Which gives $${condTex(event, on)}$?`)],
      quotientTex(cell, given),
      [quotientTex(cell, other), fmt(cell / 100), `${fmt(other / 100)} \\times ${fmt(given / 100)}`],
      saltOf(params),
      true,
    );
  },
  solution: (params) => {
    const { cell, given, event, on } = jointParts(params);
    const byRow = params.on === 'row';
    const steps: SolutionStep[] = [{ text: `The overlap of $${event}$ and $${on}$ is one cell: $${fmt(cell / 100)}$.` }];
    if (params.hard) {
      const [x, y] = byRow ? [params.cells[2 * params.row], params.cells[2 * params.row + 1]] : [params.cells[params.col], params.cells[2 + params.col]];
      steps.push({ text: `$P(${on})$ is the whole ${byRow ? 'row' : 'column'}: $${fmt(x / 100)} + ${fmt(y / 100)} = ${fmt(given / 100)}$.` });
    } else {
      steps.push({ text: `$P(${on})$ is its ${byRow ? 'row' : 'column'} total, $${fmt(given / 100)}$.` });
    }
    steps.push({ tex: `${condTex(event, on)} = \\frac{P(${event} \\cap ${on})}{P(${on})} = ${quotientTex(cell, given)}` });
    return steps;
  },
};

interface CondAndParams {
  story: number;
  /** Hundredths: `P(A)` and `P(B | A)` or `P(B | A')`, whichever branch is asked. */
  a: number;
  c: number;
  /** The branch asked about: `A` or `A'`. */
  onA: boolean;
  hard: boolean;
}

/** The first node and the second: `P(A')` then `P(B | A')`, say. */
function andParts({ a, c, onA }: CondAndParams): [number, number] {
  return [onA ? a : 100 - a, c];
}

/** The formula turned round: P(A and B) = P(A) times P(B | A). */
const condAndTree: Generator<CondAndParams> = {
  id: 'prob-cf-and-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const step = hard ? 5 : 10;
    for (;;) {
      const a = step * rng.int(1, 100 / step - 1);
      const c = step * rng.int(1, 100 / step - 1);
      if (a === 50 || c === 50) continue;
      return { story: rng.int(0, COND_STORIES.length - 1), a, c, onA: hard ? rng.chance(0.5) : true, hard };
    }
  },
  render: (params): Slide => {
    const s = COND_STORIES[params.story];
    const [f, c] = andParts(params);
    const A = params.onA ? s.A : not(s.A);
    // At difficulty 2 the sentence gives the other outcome, so it comes off 1 first.
    const sentence = condSentence(s, params.onA, !params.hard, params.hard ? 100 - c : c);
    const answer = [hun(f), hun(c), tth(f * c)];
    return {
      kind: 'tree',
      prompt: [
        say(storySentence(s)),
        say(
          `The probability that ${s.a} is $${fmt(params.a / 100)}$. ${sentence} Find the probability that ${params.onA ? s.a : s.notA} and ${s.b}. Top row: $P(${A})$, then $${condTex(s.B, A)}$. Then multiply.`,
        ),
      ],
      expression: `P(${A} \\cap ${s.B})`,
      nodes: [
        { id: 'f', from: [] },
        { id: 'c', from: [] },
        { id: 'p', from: ['f', 'c'] },
      ],
      bank: bank(answer, [hun(100 - f), hun(100 - c), tth(f * (100 - c)), tth((100 - f) * c), hun(Math.min(f + c, 99))]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const s = COND_STORIES[params.story];
    const [f, c] = andParts(params);
    const A = params.onA ? s.A : not(s.A);
    const steps: SolutionStep[] = [];
    if (!params.onA) steps.push({ tex: chain(`P(${A})`, `1 - ${fmt(params.a / 100)}`, fmt(f / 100)) });
    if (params.hard) steps.push({ text: `The sentence gives the chance ${s.no}, so the chance ${s.yes} is what is left of $1$.` }, { tex: chain(condTex(s.B, A), `1 - ${fmt((100 - c) / 100)}`, fmt(c / 100)) });
    steps.push(
      { text: `"And" is the first event times the chance of the second given the first.` },
      { tex: chain(`P(${A} \\cap ${s.B})`, `${fmt(f / 100)} \\times ${fmt(c / 100)}`, tth(f * c).tex) },
    );
    return steps;
  },
};

/* ================================================================
 * Level 4, lesson 2: conditional probability from a Venn diagram
 * ================================================================ */

type VennCond = 'AgB' | 'BgA' | 'AgnB' | 'BgnA' | 'nAgB' | 'nBgA';

/**
 * Each question: the region on top, the two regions kept once the condition
 * is known, and which circle is asked about and which is given. Regions in
 * the order only A, both, only B, neither.
 */
const VENN_ASKS: Record<VennCond, { top: number; keep: [number, number]; mirror: [number, number]; event: [0 | 1, boolean]; on: [0 | 1, boolean] }> = {
  AgB: { top: 1, keep: [1, 2], mirror: [0, 1], event: [0, false], on: [1, false] },
  BgA: { top: 1, keep: [0, 1], mirror: [1, 2], event: [1, false], on: [0, false] },
  AgnB: { top: 0, keep: [0, 3], mirror: [0, 1], event: [0, false], on: [1, true] },
  BgnA: { top: 2, keep: [2, 3], mirror: [1, 2], event: [1, false], on: [0, true] },
  nAgB: { top: 2, keep: [1, 2], mirror: [2, 3], event: [0, true], on: [1, false] },
  nBgA: { top: 0, keep: [0, 1], mirror: [0, 3], event: [1, true], on: [0, false] },
};

/** What a Venn question asks, in the diagram's own letters, and its counts. */
function vennCond(letters: [string, string], regions: number[], ask: VennCond) {
  const q = VENN_ASKS[ask];
  const name = ([i, complement]: [0 | 1, boolean]) => `${letters[i]}${complement ? "'" : ''}`;
  const on = name(q.on);
  return {
    fav: regions[q.top],
    den: regions[q.keep[0]] + regions[q.keep[1]],
    /** The bottom a learner gets by turning the question round. */
    mirror: regions[q.mirror[0]] + regions[q.mirror[1]],
    tex: condTex(name(q.event), on),
    on,
    keep: q.on[1] ? `Outside $${letters[q.on[0]]}$` : `The circle $${letters[q.on[0]]}$`,
    keepWords: q.on[1] ? `everything outside $${letters[q.on[0]]}$` : `the circle $${letters[q.on[0]]}$`,
  };
}

interface VennCondParams {
  context: number;
  regions: [number, number, number, number];
  ask: VennCond;
}

function sampleVennCond(rng: Rng, difficulty: number): VennCondParams {
  const hard = difficulty > 1;
  for (;;) {
    const regions = [0, 1, 2, 3].map(() => (hard ? rng.int(3, 30) : rng.int(2, 15))) as VennCondParams['regions'];
    const ask = rng.pick(hard ? (['AgnB', 'BgnA', 'nAgB', 'nBgA'] as const) : (['AgB', 'BgA'] as const));
    const context = rng.int(0, VENN.length - 1);
    const { fav, den, mirror } = vennCond([VENN[context].A, VENN[context].B], regions, ask);
    const total = regions[0] + regions[1] + regions[2] + regions[3];
    // Every slip a learner might make gives a different number from the answer.
    const values = [fav / den, fav / total, den / total, (den - fav) / den, fav / mirror];
    if (new Set(values.map((v) => v.toFixed(9))).size < values.length || new Set([den, total, fav, mirror]).size < 4) continue;
    return { context, regions, ask };
  }
}

function vennCondPrompt(params: VennCondParams): Block[] {
  const ctx = VENN[params.context];
  const total = params.regions.reduce((s, r) => s + r, 0);
  return [
    say(`The Venn diagram shows ${total} ${ctx.who}. $${ctx.A}$ is the set who ${ctx.aText} and $${ctx.B}$ the set who ${ctx.bText}.`),
    picture(vennSvg([ctx.A, ctx.B], params.regions.map(String) as [string, string, string, string])),
  ];
}

/** Restrict to one circle, or to outside it, and count. */
const condVennCount: Generator<VennCondParams> = {
  id: 'prob-cv-count',
  sample: sampleVennCond,
  render: (params): Slide => {
    const ctx = VENN[params.context];
    const { fav, den, tex } = vennCond([ctx.A, ctx.B], params.regions, params.ask);
    return probSlide([...vennCondPrompt(params), say(`One ${ctx.one} is chosen at random. Find $${tex}$.`)], `${tex} =`, fans([fav, den]));
  },
  solution: (params) => {
    const ctx = VENN[params.context];
    const { fav, den, tex, on, keepWords } = vennCond([ctx.A, ctx.B], params.regions, params.ask);
    const q = VENN_ASKS[params.ask];
    const [x, y] = q.keep.map((i) => params.regions[i]);
    return [
      { text: `Given $${on}$, keep only ${keepWords}: $${x} + ${y} = ${den}$ ${ctx.who}.` },
      { text: `Of those, $${fav}$ are in the event asked about.` },
      { tex: `${tex} = ${rawTex([fav, den])}${gcd(fav, den) > 1 ? ` = ${ftex([fav, den])}` : ''}` },
    ];
  },
  choices: (params) => {
    const ctx = VENN[params.context];
    const { fav, den, mirror } = vennCond([ctx.A, ctx.B], params.regions, params.ask);
    const total = params.regions.reduce((s, r) => s + r, 0);
    return probChoices(fr([fav, den]), [fr([fav, total]), fr([fav, mirror]), fr([den, total]), fr([den - fav, den])], saltOf(params));
  },
};

interface VennFillParams {
  /** Hundredths. */
  pA: number;
  pB: number;
  both: number;
  hard: boolean;
}

/** Fill the regions from P(A), P(B) and a conditional, or from conditionals alone. */
const condVennFill: Generator<VennFillParams> = {
  id: 'prob-cv-fill',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const pB = 10 * rng.int(2, 8);
      const q = 10 * rng.int(1, 9);
      const both = (pB * q) / 100;
      const pA = hard ? 5 * rng.int(2, 18) : both + 5 * rng.int(1, 16);
      if (pA <= both || pA === pB || pA + pB - both >= 100 || pA > 95) continue;
      // Difficulty 2 states P(B | A), so it has to come out in hundredths.
      if (hard && ((both * 100) % pA !== 0 || (both * 100) / pA === q)) continue;
      return { pA, pB, both, hard };
    }
  },
  render: ({ pA, pB, both, hard }): Slide => {
    const answer = [hun(pA - both), hun(both), hun(pB - both), hun(100 - pA - pB + both)];
    const facts = hard
      ? `$P(A \\cap B) = ${fmt(both / 100)}$, $${condTex('A', 'B')} = ${fmt(both / pB)}$ and $${condTex('B', 'A')} = ${fmt(both / pA)}$.`
      : `$P(A) = ${fmt(pA / 100)}$, $P(B) = ${fmt(pB / 100)}$ and $${condTex('A', 'B')} = ${fmt(both / pB)}$.`;
    return {
      kind: 'venn',
      prompt: [say(`For two events $A$ and $B$, ${facts}`), say('Fill in the probability of each region.')],
      sets: ['A', 'B'],
      regions: [null, null, null, null],
      bank: bank(answer, [hun(pA), hun(pB), hun(pA + pB - both), hun(100 - pA), dec(both / pB), hun(Math.abs(pA - pB))]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: ({ pA, pB, both, hard }) => {
    const [a, b, ab] = [pA / 100, pB / 100, both / 100];
    const steps: SolutionStep[] = [];
    if (hard) {
      steps.push(
        { text: 'Turn each conditional round: the overlap divided by the conditional probability gives the circle it was given.' },
        { tex: `P(B) = \\frac{${fmt(ab)}}{${fmt(both / pB)}} = ${fmt(b)}, \\quad P(A) = \\frac{${fmt(ab)}}{${fmt(both / pA)}} = ${fmt(a)}` },
      );
    } else {
      steps.push({ text: `The overlap first, from the formula turned round: $P(A \\cap B) = P(B) \\times ${condTex('A', 'B')}$.` }, { tex: chain('P(A \\cap B)', `${fmt(b)} \\times ${fmt(both / pB)}`, fmt(ab)) });
    }
    steps.push(
      { text: 'Take the overlap off each circle, and whatever is left of $1$ is outside both.' },
      { tex: `${fmt(a)} - ${fmt(ab)} = ${fmt((pA - both) / 100)}, \\quad ${fmt(b)} - ${fmt(ab)} = ${fmt((pB - both) / 100)}` },
      { tex: `1 - ${fmt((pA + pB - both) / 100)} = ${fmt((100 - pA - pB + both) / 100)}` },
    );
    return steps;
  },
};

interface VennGivenParams {
  /** Hundredths, only A, both, only B, neither. */
  regions: [number, number, number, number];
  ask: VennCond;
}

/** Off a Venn diagram of probabilities: the region over the part kept. */
const condVennGivenTiles: Generator<VennGivenParams> = {
  id: 'prob-cv-given-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const ask = rng.pick(hard ? (['AgnB', 'BgnA', 'nAgB', 'nBgA'] as const) : (['AgB', 'BgA'] as const));
    const q = VENN_ASKS[ask];
    const den = 10 * rng.int(2, 8);
    const top = (den / 10) * rng.int(1, 9);
    const rest = 100 - den;
    const x = hard ? rng.int(3, rest - 3) : 5 * rng.int(1, rest / 5 - 1);
    const regions = [0, 0, 0, 0];
    regions[q.top] = top;
    regions[q.keep[0] === q.top ? q.keep[1] : q.keep[0]] = den - top;
    const others = [0, 1, 2, 3].filter((i) => !q.keep.includes(i));
    regions[others[0]] = x;
    regions[others[1]] = rest - x;
    return { regions: regions as VennGivenParams['regions'], ask };
  },
  render: ({ regions, ask }): Slide => {
    const { fav, den, mirror, tex } = vennCond(['A', 'B'], regions, ask);
    const answer = [hun(fav), hun(den), dec(fav / den)];
    return {
      kind: 'tiles',
      prompt: [
        say('The Venn diagram shows the probabilities for two events $A$ and $B$.'),
        picture(vennSvg(['A', 'B'], regions.map((r) => fmt(r / 100)) as [string, string, string, string])),
        say(`Find $${tex}$.`),
      ],
      template: `${tex} = {0} \\div {1} = {2}`,
      answer: answer.map((t) => t.tex),
      bank: bank(answer, [hun(den - fav), hun(mirror), hun(100 - den), dec(fav / 100), hun(fav + den)]),
    };
  },
  solution: ({ regions, ask }) => {
    const { fav, den, tex, on, keepWords } = vennCond(['A', 'B'], regions, ask);
    const [x, y] = VENN_ASKS[ask].keep.map((i) => regions[i]);
    return [
      { text: `Given $${on}$, keep ${keepWords}: $${fmt(x / 100)} + ${fmt(y / 100)} = ${fmt(den / 100)}$.` },
      { text: `The part of it in the event asked about is $${fmt(fav / 100)}$.` },
      { tex: chain(tex, `\\frac{${fmt(fav / 100)}}{${fmt(den / 100)}}`, fmt(fav / den)) },
    ];
  },
};

/** Which part to keep, how many are in it, then the probability, one fork at a time. */
const condVennFlow: Generator<VennCondParams> = {
  id: 'prob-cv-restrict-flow',
  sample: sampleVennCond,
  render: (params): Slide => {
    const ctx = VENN[params.context];
    const letters: [string, string] = [ctx.A, ctx.B];
    const { fav, den, tex, keep } = vennCond(letters, params.regions, params.ask);
    const q = VENN_ASKS[params.ask];
    const total = params.regions.reduce((s, r) => s + r, 0);
    const salt = saltOf(params);
    const other = letters[1 - q.on[0]];
    const keepHint = 'The event after the bar is the one you are told has happened, and that is the part you keep.';
    const wrongParts = q.on[1] ? [`Outside $${other}$`, `The circle $${letters[q.on[0]]}$`] : [`The circle $${other}$`, 'The whole box'];
    const answer = [keep, `${den}`, `$${ftex([fav, den])}$`];
    return {
      kind: 'flow',
      prompt: [...vennCondPrompt(params), say(`One ${ctx.one} is chosen at random. Find $${tex}$ one step at a time.`)],
      subject: tex,
      steps: [
        {
          id: 'keep',
          ask: `For $${tex}$, which part of the diagram do you keep?`,
          branches: turn([{ label: keep, to: 'count' }, ...wrongParts.map((label) => ({ label, outcome: keepHint }))], salt),
        },
        {
          id: 'count',
          ask: `How many ${ctx.who} are in that part?`,
          branches: turn(
            [
              { label: `${den}`, to: 'prob' },
              { label: `${total}`, outcome: 'That is everyone in the box. Count only the part you kept.' },
              { label: `${fav}`, outcome: 'That is only the piece in the event asked about. Count every region in the part you kept.' },
            ],
            salt >> 3,
          ),
        },
        {
          id: 'prob',
          ask: `So what is $${tex}$?`,
          branches: turn(
            [
              { label: answer[2], outcome: 'Right: the piece in the event asked about, out of the part you kept.' },
              { label: `$${ftex([fav, total])}$`, outcome: 'That is out of everyone. Once you are given something, the bottom is the part you kept.' },
              { label: `$${ftex([den - fav, den])}$`, outcome: 'That is the rest of the part you kept. The top is the piece in the event asked about.' },
            ],
            salt >> 6,
          ),
        },
      ],
      answer,
    };
  },
  solution: (params) => {
    const ctx = VENN[params.context];
    const { fav, den, tex, on, keepWords } = vennCond([ctx.A, ctx.B], params.regions, params.ask);
    const [x, y] = VENN_ASKS[params.ask].keep.map((i) => params.regions[i]);
    return [
      { text: `Given $${on}$ means keep ${keepWords}.` },
      { text: `That holds $${x} + ${y} = ${den}$ ${ctx.who}, and $${fav}$ of them are in the event asked about.` },
      { tex: `${tex} = ${rawTex([fav, den])}${gcd(fav, den) > 1 ? ` = ${ftex([fav, den])}` : ''}` },
    ];
  },
};

/* ================================================================
 * Level 4, lesson 3: conditional branches on a tree
 * ================================================================ */

interface CondFillParams extends CondTreeParams {
  /** Whether each sentence, on `A` then on `A'`, states `B` (true) or `B'`. */
  said: [boolean, boolean];
}

/** A tree filled in from sentences: each one is a second-stage branch. */
const condFill: Generator<CondFillParams> = {
  id: 'prob-cb-fill',
  sample: (rng, difficulty) => ({ ...sampleCondTree(rng, difficulty), said: [rng.chance(0.5), rng.chance(0.5)] }),
  render: (params): Slide => {
    const s = COND_STORIES[params.story];
    const { a, hit, miss, hard, said } = params;
    const facts = [
      ...(hard ? [`The probability that ${s.a} is $${fmt(a / 100)}$.`] : []),
      condSentence(s, true, said[0], condBranchOf(params, true, said[0])),
      condSentence(s, false, said[1], condBranchOf(params, false, said[1])),
    ];
    const answer = [...(hard ? [a, 100 - a] : []), hit, 100 - hit, miss, 100 - miss].map(hun);
    const under = [
      { label: s.B, p: null },
      { label: not(s.B), p: null },
    ];
    return {
      kind: 'probTree',
      mode: 'fill',
      prompt: [say(storySentence(s)), say(`${facts.join(' ')} Fill in the missing probabilities.`)],
      branches: [
        { label: s.A, p: hard ? null : hun(a).tex, next: under },
        { label: not(s.A), p: hard ? null : hun(100 - a).tex, next: under },
      ],
      bank: bank(answer, [hun(a), hun(100 - a), hun(Math.abs(hit - miss)), hun(Math.min(hit + miss, 95))]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const s = COND_STORIES[params.story];
    const { a, hit, miss, hard } = params;
    const steps: SolutionStep[] = [];
    if (hard) steps.push({ tex: `P(${s.A}) = ${fmt(a / 100)}, \\quad P(${not(s.A)}) = 1 - ${fmt(a / 100)} = ${fmt((100 - a) / 100)}` });
    steps.push(
      { text: `"${s.onA}" puts a sentence on the branches after $${s.A}$, and "${s.offA.replace(/^When /, 'when ')}" on those after $${not(s.A)}$. Each pair from one point adds up to $1$.` },
      { tex: `${condTex(s.B, s.A)} = ${fmt(hit / 100)}, \\quad ${condTex(not(s.B), s.A)} = ${fmt((100 - hit) / 100)}` },
      { tex: `${condTex(s.B, not(s.A))} = ${fmt(miss / 100)}, \\quad ${condTex(not(s.B), not(s.A))} = ${fmt((100 - miss) / 100)}` },
    );
    return steps;
  },
};

interface CondTotalParams extends CondTreeParams {
  /** Asks for `B'` rather than `B`. */
  flip: boolean;
}

/** P(B) off a tree of conditionals: two paths multiplied, then added. */
const condTotalTree: Generator<CondTotalParams> = {
  id: 'prob-cb-total-tree',
  sample: (rng, difficulty) => ({ ...sampleCondTree(rng, difficulty), flip: difficulty > 1 && rng.chance(0.5) }),
  render: (params): Slide => {
    const s = COND_STORIES[params.story];
    const yes = !params.flip;
    const B = yes ? s.B : not(s.B);
    const p1 = leafOf(params, true, yes);
    const p2 = leafOf(params, false, yes);
    const answer = [tth(p1), tth(p2), tth(p1 + p2)];
    const crossed = [params.a * condBranchOf(params, false, yes), (100 - params.a) * condBranchOf(params, true, yes)];
    const hide = params.hard ? [false, true, false, true, false, true] : [];
    return {
      kind: 'tree',
      prompt: [
        say(storySentence(s)),
        picture(condTreeSvg(params, hide)),
        say(`Find the probability that ${yes ? s.yes : s.no}. Top row: $P(${s.A} \\cap ${B})$, then $P(${not(s.A)} \\cap ${B})$. Then add them.`),
      ],
      expression: `P(${B})`,
      nodes: [
        { id: 'p1', from: [] },
        { id: 'p2', from: [] },
        { id: 's', from: ['p1', 'p2'] },
      ],
      bank: bank(answer, [tth(crossed[0]), tth(crossed[1]), tth(crossed[0] + crossed[1]), hun(Math.min(condBranchOf(params, true, yes) + condBranchOf(params, false, yes), 99))]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const s = COND_STORIES[params.story];
    const yes = !params.flip;
    const B = yes ? s.B : not(s.B);
    const p1 = leafOf(params, true, yes);
    const p2 = leafOf(params, false, yes);
    const steps: SolutionStep[] = [];
    if (params.hard) steps.push({ text: 'The unlabelled branches are the complements: each pair from one point adds up to $1$.' });
    steps.push(
      { text: `Two paths end in $${B}$. Multiply along each, then add.` },
      { tex: chain(`P(${s.A} \\cap ${B})`, `${fmt(params.a / 100)} \\times ${fmt(condBranchOf(params, true, yes) / 100)}`, tth(p1).tex) },
      { tex: chain(`P(${not(s.A)} \\cap ${B})`, `${fmt((100 - params.a) / 100)} \\times ${fmt(condBranchOf(params, false, yes) / 100)}`, tth(p2).tex) },
      { tex: chain(`P(${B})`, `${tth(p1).tex} + ${tth(p2).tex}`, tth(p1 + p2).tex) },
    );
    return steps;
  },
};

interface CondPathParams extends CondTreeParams {
  ask: 'product' | 'most' | 'least';
  /** The end asked for, top to bottom. */
  leaf: number;
}

/** Tap the outcome: the path whose product is stated, or the likeliest or least likely. */
const condPath: Generator<CondPathParams> = {
  id: 'prob-cb-path',
  sample: (rng, difficulty) => {
    for (;;) {
      const base = sampleCondTree(rng, difficulty);
      const leaves = condLeaves(base);
      if (new Set(leaves).size < 4) continue;
      if (difficulty < 2) return { ...base, ask: 'product', leaf: rng.int(0, 3) };
      const ask = rng.pick(['most', 'least'] as const);
      const best = ask === 'most' ? Math.max(...leaves) : Math.min(...leaves);
      const leaf = leaves.indexOf(best);
      // Not simply the bigger (or smaller) branch twice: the learner has to multiply.
      const first = leaf < 2 ? base.a : 100 - base.a;
      if (ask === 'most' ? first > 50 && condBranchOf(base, leaf < 2, leaf % 2 === 0) > 50 : first < 50 && condBranchOf(base, leaf < 2, leaf % 2 === 0) < 50) continue;
      return { ...base, ask, leaf };
    }
  },
  render: (params): Slide => {
    const s = COND_STORIES[params.story];
    const leaves = condLeaves(params);
    const tap = 'Tap its first branch, then the branch after it.';
    const question: Record<CondPathParams['ask'], string> = {
      product: `Which outcome has probability $${tth(leaves[params.leaf]).tex}$? ${tap}`,
      most: `Which outcome is the most likely? ${tap}`,
      least: `Which outcome is the least likely? ${tap}`,
    };
    const under = (onA: boolean) => [
      { label: s.B, p: hun(condBranchOf(params, onA, true)).tex },
      { label: not(s.B), p: hun(condBranchOf(params, onA, false)).tex },
    ];
    return {
      kind: 'probTree',
      mode: 'path',
      prompt: [say(storySentence(s)), say(question[params.ask])],
      branches: [
        { label: s.A, p: hun(params.a).tex, next: under(true) },
        { label: not(s.A), p: hun(100 - params.a).tex, next: under(false) },
      ],
      bank: [],
      answer: [params.leaf < 2 ? s.A : not(s.A), params.leaf % 2 === 0 ? s.B : not(s.B)],
    };
  },
  solution: (params) => {
    const s = COND_STORIES[params.story];
    const lines = [0, 1, 2, 3].map((i) => {
      const onA = i < 2;
      const yes = i % 2 === 0;
      const A = onA ? s.A : not(s.A);
      const B = yes ? s.B : not(s.B);
      return { tex: chain(`P(${A} \\cap ${B})`, `${fmt((onA ? params.a : 100 - params.a) / 100)} \\times ${fmt(condBranchOf(params, onA, yes) / 100)}`, tth(condLeaves(params)[i]).tex) };
    });
    const leafA = params.leaf < 2 ? s.A : not(s.A);
    const leafB = params.leaf % 2 === 0 ? s.B : not(s.B);
    return [{ text: 'Multiply along each of the four paths.' }, ...lines, { text: `So the outcome is $${leafA}$ then $${leafB}$.` }];
  },
};

interface CondWordsParams {
  story: number;
  onA: boolean;
  /** The sentence states `B` (true) or `B'`. */
  yes: boolean;
  h: number;
}

/** A sentence in words as a conditional probability: which way round the bar goes. */
const condWords: Generator<CondWordsParams> = {
  id: 'prob-cb-words',
  sample: (rng, difficulty) => ({
    story: rng.int(0, COND_STORIES.length - 1),
    onA: rng.chance(0.5),
    yes: difficulty < 2,
    h: 5 * rng.int(1, 19),
  }),
  render: (params): Slide => {
    const s = COND_STORIES[params.story];
    const A = params.onA ? s.A : not(s.A);
    const B = params.yes ? s.B : not(s.B);
    const v = fmt(params.h / 100);
    const wrong = params.yes
      ? [`${condTex(A, B)} = ${v}`, `P(${B} \\cap ${A}) = ${v}`, `${condTex(B, not(A))} = ${v}`]
      : [`${condTex(A, B)} = ${v}`, `${condTex(not(B), A)} = ${v}`, `${condTex(B, not(A))} = ${v}`];
    return pickSlide(
      [say(storySentence(s)), say(condSentence(s, params.onA, params.yes, params.h)), say('Which of these does that sentence say?')],
      `${condTex(B, A)} = ${v}`,
      wrong,
      saltOf(params),
      true,
    );
  },
  solution: (params) => {
    const s = COND_STORIES[params.story];
    const A = params.onA ? s.A : not(s.A);
    const B = params.yes ? s.B : not(s.B);
    return [
      { text: `"${params.onA ? s.onA : s.offA}" is what you are told has happened, so it goes after the bar: $${A}$.` },
      { text: `The chance stated is that ${params.yes ? s.yes : s.no}, which goes before the bar: $${B}$.` },
      { tex: `${condTex(B, A)} = ${fmt(params.h / 100)}` },
    ];
  },
};

/* ================================================================
 * Level 4, lesson 4: testing for independence
 * ================================================================ */

interface IndepTableParams {
  context: number;
  cells: [number, number, number, number];
  row: number;
  col: number;
  /** The event conditioned on is the row's or the column's. */
  on: 'row' | 'col';
  hard: boolean;
}

function indepTableParts(params: IndepTableParams) {
  const ctx = TWO_WAY[params.context];
  const t = twoWayTotals(params);
  const cell = params.cells[2 * params.row + params.col];
  const byRow = params.on === 'row';
  return {
    cell,
    total: t.total,
    given: byRow ? t.rows[params.row] : t.cols[params.col],
    target: byRow ? t.cols[params.col] : t.rows[params.row],
    givenText: byRow ? ctx.rowIs[params.row] : ctx.colIs[params.col],
    targetText: byRow ? ctx.colIs[params.col] : ctx.rowIs[params.row],
  };
}

/** From a two-way table: P(A), then P(A | B), then whether they match. */
const indepTableFlow: Generator<IndepTableParams> = {
  id: 'prob-ci-table-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      // Rows in the same ratio across the columns make the events independent.
      const x = rng.int(1, 5);
      const y = rng.int(1, 5);
      const k0 = rng.int(2, hard ? 9 : 6);
      const k1 = rng.int(2, hard ? 9 : 6);
      const shift = rng.chance(0.5) ? 0 : rng.pick(hard ? [-3, -2, -1, 1, 2, 3] : [-2, -1, 1, 2]);
      const cells: IndepTableParams['cells'] = [x * k0 + shift, y * k0 - shift, x * k1, y * k1];
      if (cells.some((c) => c < 1) || x === y || k0 === k1) continue;
      const params: IndepTableParams = {
        context: rng.int(0, TWO_WAY.length - 1),
        cells,
        row: hard ? rng.int(0, 1) : 0,
        col: hard ? rng.int(0, 1) : 0,
        on: hard ? rng.pick(['row', 'col'] as const) : 'row',
        hard,
      };
      const { cell, given, target, total } = indepTableParts(params);
      if (given === target || cell === target || new Set([cell / given, cell / total, cell / target]).size < 3) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const ctx = TWO_WAY[params.context];
    const { cell, total, given, target, givenText, targetText } = indepTableParts(params);
    const independent = cell * total === given * target;
    const salt = saltOf(params);
    const f = (top: number, bottom: number) => `$${ftex([top, bottom])}$`;
    return {
      kind: 'flow',
      prompt: [
        show(twoWayTex(params, !params.hard)),
        say(`One ${ctx.one} is chosen at random. $A$ is the event that the ${ctx.one} ${targetText}, and $B$ that the ${ctx.one} ${givenText}. Are $A$ and $B$ independent?`),
      ],
      subject: 'P(A \\mid B) \\overset{?}{=} P(A)',
      steps: [
        {
          id: 'pa',
          ask: 'What is $P(A)$?',
          branches: turn(
            [
              { label: f(target, total), to: 'pab' },
              { label: f(cell, total), outcome: 'That is $A$ and $B$ together. $P(A)$ counts everyone in $A$.' },
              { label: f(given, total), outcome: 'That is $P(B)$. Count the group for $A$.' },
            ],
            salt,
          ),
        },
        {
          id: 'pab',
          ask: 'What is $P(A \\mid B)$?',
          branches: turn(
            [
              { label: f(cell, given), to: 'decide' },
              { label: f(cell, total), outcome: 'Given $B$, only the $B$ group is in the running, so it goes on the bottom.' },
              { label: f(cell, target), outcome: 'That is out of the $A$ group. Given $B$, the bottom is the $B$ group.' },
            ],
            salt >> 3,
          ),
        },
        {
          id: 'decide',
          ask: 'Are $A$ and $B$ independent?',
          branches: turn(
            [
              { label: 'Yes', ...(independent ? { outcome: 'Right: knowing $B$ leaves the chance of $A$ as it was.' } : { outcome: 'Compare the two fractions again.' }) },
              { label: 'No', ...(independent ? { outcome: 'Compare the two fractions again: write both in lowest terms.' } : { outcome: 'Right: knowing $B$ changes the chance of $A$.' }) },
            ],
            salt >> 6,
          ),
        },
      ],
      answer: [f(target, total), f(cell, given), independent ? 'Yes' : 'No'],
    };
  },
  solution: (params) => {
    const { cell, total, given, target } = indepTableParts(params);
    const independent = cell * total === given * target;
    const steps: SolutionStep[] = [];
    if (params.hard) steps.push({ text: `Add every cell for the total, $${total}$, and the rows and columns for the group sizes.` });
    steps.push(
      { tex: `P(A) = ${rawTex([target, total])}${gcd(target, total) > 1 ? ` = ${ftex([target, total])}` : ''}` },
      { tex: `P(A \\mid B) = ${rawTex([cell, given])}${gcd(cell, given) > 1 ? ` = ${ftex([cell, given])}` : ''}` },
      {
        text: independent
          ? 'They are equal, so knowing $B$ makes no difference: $A$ and $B$ are independent.'
          : 'They differ, so knowing $B$ changes the chance of $A$: they are not independent.',
      },
    );
    return steps;
  },
};

interface IndepVennParams {
  /** Hundredths, only A, both, only B, neither. */
  regions: [number, number, number, number];
  hard: boolean;
}

const vennSums = ([a, b, c]: number[]) => ({ pA: a + b, pB: b + c, both: b });

/** Off a Venn diagram of probabilities: the product, or the conditional, against the diagram. */
const indepVennTiles: Generator<IndepVennParams> = {
  id: 'prob-ci-venn-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const independent = rng.chance(0.5);
      let pA: number;
      let pB: number;
      let both: number;
      if (!hard) {
        pA = 10 * rng.int(2, 8);
        pB = 10 * rng.int(2, 8);
        both = (pA * pB) / 100 + (independent ? 0 : rng.pick([-10, -5, 5, 10]));
      } else {
        pB = 10 * rng.int(2, 8);
        const q = rng.int(1, 9);
        both = (pB * q) / 10;
        pA = 10 * q + (independent ? 0 : rng.pick([-10, -5, 5, 10]));
      }
      const regions: IndepVennParams['regions'] = [pA - both, both, pB - both, 100 - pA - pB + both];
      if (pA === pB || regions.some((r) => r < 3)) continue;
      return { regions, hard };
    }
  },
  render: ({ regions, hard }): Slide => {
    const { pA, pB, both } = vennSums(regions);
    const prompt = [
      say('The Venn diagram shows the probabilities for two events $A$ and $B$.'),
      picture(vennSvg(['A', 'B'], regions.map((r) => fmt(r / 100)) as [string, string, string, string])),
      say('Are $A$ and $B$ independent? Complete the test.'),
    ];
    if (!hard) {
      const product = tth(pA * pB);
      const numbers = [hun(pA), hun(pB), product];
      const rel = same(product.v, both / 100) ? '=' : '\\neq';
      return {
        kind: 'tiles',
        prompt,
        template: 'P(A) \\times P(B) = {0} \\times {1} = {2} \\; {3} \\; P(A \\cap B)',
        answer: [...numbers.map((t) => t.tex), rel],
        bank: [...bank(numbers, [hun(regions[0]), hun(regions[2]), hun(both), hun(pA + pB - both)], 2), '=', '\\neq'],
      };
    }
    const numbers = [hun(both), hun(pB), dec(both / pB)];
    const rel = same(both / pB, pA / 100) ? '=' : '\\neq';
    return {
      kind: 'tiles',
      prompt,
      template: 'P(A \\mid B) = {0} \\div {1} = {2} \\; {3} \\; P(A)',
      answer: [...numbers.map((t) => t.tex), rel],
      bank: [...bank(numbers, [hun(regions[2]), hun(pA), hun(pA + pB - both), dec(both / pA)], 2), '=', '\\neq'],
    };
  },
  solution: ({ regions, hard }) => {
    const { pA, pB, both } = vennSums(regions);
    const [a, b, ab] = [pA / 100, pB / 100, both / 100];
    const steps: SolutionStep[] = [{ text: 'Each circle is its two regions added.' }, { tex: `P(A) = ${fmt(regions[0] / 100)} + ${fmt(ab)} = ${fmt(a)}, \\quad P(B) = ${fmt(ab)} + ${fmt(regions[2] / 100)} = ${fmt(b)}` }];
    if (!hard) {
      const product = Number(fmt(a * b));
      steps.push(
        { tex: `P(A) \\times P(B) = ${fmt(a)} \\times ${fmt(b)} = ${fmt(product)}` },
        { text: same(product, ab) ? `That is the overlap, $${fmt(ab)}$, so $A$ and $B$ are independent.` : `The overlap is $${fmt(ab)}$, not $${fmt(product)}$, so $A$ and $B$ are not independent.` },
      );
    } else {
      steps.push(
        { tex: chain(condTex('A', 'B'), `\\frac{${fmt(ab)}}{${fmt(b)}}`, fmt(both / pB)) },
        { text: same(both / pB, a) ? `That is $P(A) = ${fmt(a)}$: knowing $B$ changes nothing, so they are independent.` : `But $P(A) = ${fmt(a)}$: knowing $B$ changes the chance of $A$, so they are not independent.` },
      );
    }
    return steps;
  },
};

interface IndepTreeParams extends CondTreeParams {
  independent: boolean;
}

/** A tree: are the second-stage branches the same under both first ones? */
const indepTreeChoice: Generator<IndepTreeParams> = {
  id: 'prob-ci-tree-choice',
  sample: (rng, difficulty) => {
    const base = sampleCondTree(rng, difficulty);
    const independent = rng.chance(0.5);
    return { ...base, miss: independent ? base.hit : base.miss, independent };
  },
  render: (params): Slide => {
    const s = COND_STORIES[params.story];
    const [A, B] = [s.A, s.B];
    const yes = `\\text{Yes: } ${condTex(B, A)} = ${condTex(B, not(A))}`;
    const no = `\\text{No: } ${condTex(B, A)} \\neq ${condTex(B, not(A))}`;
    // Difficulty 2 hides one branch of each pair, so one has to come off 1 first.
    const hide = params.hard ? [false, false, false, true, true, false] : [];
    return pickSlide(
      [say(storySentence(s)), picture(condTreeSvg(params, hide)), say(`Are $${A}$ and $${B}$ independent, and why?`)],
      params.independent ? yes : no,
      [params.independent ? no : yes, `\\text{Yes: } P(${A}) + P(${not(A)}) = 1`, `\\text{No: } P(${A}) \\neq ${condTex(B, A)}`],
      saltOf(params),
      true,
    );
  },
  solution: (params) => {
    const s = COND_STORIES[params.story];
    const steps: SolutionStep[] = [];
    if (params.hard) steps.push({ tex: chain(condTex(s.B, not(s.A)), `1 - ${fmt((100 - params.miss) / 100)}`, fmt(params.miss / 100)) });
    steps.push(
      { text: `$${s.A}$ and $${s.B}$ are independent when the chance of $${s.B}$ is the same whichever way the first branch went.` },
      { tex: `${condTex(s.B, s.A)} = ${fmt(params.hit / 100)}, \\quad ${condTex(s.B, not(s.A))} = ${fmt(params.miss / 100)}` },
      { text: params.independent ? 'They are the same, so the events are independent.' : 'They differ, so the events are not independent.' },
    );
    return steps;
  },
};

type IndepAsk = 'AgB' | 'BgA' | 'nAgB' | 'nBgA' | 'BgnA' | 'nBgnA';

interface IndepGivenParams {
  /** Hundredths. */
  pA: number;
  pB: number;
  ask: IndepAsk;
  hard: boolean;
}

function indepGivenParts({ pA, pB, ask }: IndepGivenParams) {
  const texts: Record<IndepAsk, string> = {
    AgB: condTex('A', 'B'),
    BgA: condTex('B', 'A'),
    nAgB: condTex("A'", 'B'),
    nBgA: condTex("B'", 'A'),
    BgnA: condTex('B', "A'"),
    nBgnA: condTex("B'", "A'"),
  };
  const values: Record<IndepAsk, number> = { AgB: pA, BgA: pB, nAgB: 100 - pA, nBgA: 100 - pB, BgnA: pB, nBgnA: 100 - pB };
  return { tex: texts[ask], answer: hun(values[ask]) };
}

/** Independent events: the condition changes nothing. */
const indepGiven: Generator<IndepGivenParams> = {
  id: 'prob-ci-given',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const pA = hard ? 5 * rng.int(2, 18) : 10 * rng.int(1, 9);
      const pB = 10 * rng.int(1, 9);
      if (pA === pB || pA + pB === 100) continue;
      const ask = rng.pick(hard ? (['BgnA', 'nBgnA', 'nBgA', 'BgA'] as const) : (['AgB', 'BgA', 'nAgB', 'nBgA'] as const));
      return { pA, pB, ask, hard };
    }
  },
  render: (params): Slide => {
    const { tex, answer } = indepGivenParts(params);
    const facts = params.hard
      ? `$P(A) = ${fmt(params.pA / 100)}$ and $P(A \\cap B) = ${tth(params.pA * params.pB).tex}$`
      : `$P(A) = ${fmt(params.pA / 100)}$ and $P(B) = ${fmt(params.pB / 100)}$`;
    return probSlide([say(`$A$ and $B$ are independent events with ${facts}.`), say(`Find $${tex}$.`)], `${tex} =`, answer.answer);
  },
  solution: (params) => {
    const { tex, answer } = indepGivenParts(params);
    const steps: SolutionStep[] = [];
    if (params.hard) steps.push({ text: 'Independent, so the overlap is the product: divide it by $P(A)$ for $P(B)$.' }, { tex: `P(B) = ${tth(params.pA * params.pB).tex} \\div ${fmt(params.pA / 100)} = ${fmt(params.pB / 100)}` });
    steps.push({ text: 'For independent events, knowing one has happened, or not happened, leaves the chance of the other as it was.' }, { tex: `${tex} = ${answer.tex}` });
    return steps;
  },
  choices: (params) => {
    const { answer } = indepGivenParts(params);
    const { pA, pB } = params;
    const h = Math.round(answer.v * 100);
    return probChoices(answer, [tth(pA * pB), hun(100 - h), hun(h === pA ? pB : pA), dec(Math.min(pA, pB) / Math.max(pA, pB))], saltOf(params));
  },
};

/* ================================================================
 * Level 4, lesson 5: given the outcome, back up the tree
 * ================================================================ */

interface ReverseParams extends CondTreeParams {
  /** The first-stage outcome asked about, and the second-stage one given. */
  onA: boolean;
  yes: boolean;
}

function sampleReverse(rng: Rng, difficulty: number, anyFirst: boolean): ReverseParams {
  for (;;) {
    const base = sampleCondTree(rng, difficulty);
    const onA = difficulty > 1 && anyFirst ? rng.chance(0.5) : true;
    const yes = difficulty > 1 ? rng.chance(0.5) : true;
    if (difficulty > 1 && anyFirst && onA && yes) continue;
    return { ...base, onA, yes };
  }
}

/** The path asked about, and the other path ending the same way. */
function reverseParts(params: ReverseParams) {
  const s = COND_STORIES[params.story];
  const num = leafOf(params, params.onA, params.yes);
  const other = leafOf(params, !params.onA, params.yes);
  const A = params.onA ? s.A : not(s.A);
  const B = params.yes ? s.B : not(s.B);
  return { s, num, other, A, B, tex: condTex(A, B) };
}

function reverseQuestion(params: ReverseParams): string {
  const s = COND_STORIES[params.story];
  return `Find the probability that ${params.onA ? s.a : s.notA}, given that ${params.yes ? s.yes : s.no}.`;
}

/** P(A | B) = P(A and B) / P(B), with P(B) the sum of the paths ending in B. */
const reverseTiles: Generator<ReverseParams> = {
  id: 'prob-cr-tiles',
  sample: (rng, difficulty) => sampleReverse(rng, difficulty, true),
  render: (params): Slide => {
    const { s, num, other, B, tex } = reverseParts(params);
    const answer = [tth(num), tth(num + other), fr([num, num + other])];
    return {
      kind: 'tiles',
      prompt: [
        say(storySentence(s)),
        picture(condTreeSvg(params)),
        say(`${reverseQuestion(params)} $P(${B})$ is the sum of both paths ending in $${B}$. Give the answer as a fraction.`),
      ],
      template: `${tex} = {0} \\div {1} = {2}`,
      answer: answer.map((t) => t.tex),
      bank: bank(answer, [
        tth(other),
        hun(condBranchOf(params, params.onA, params.yes)),
        fr([other, num + other]),
        fr([num, 10000]),
        fr([num, num + leafOf(params, params.onA, !params.yes)]),
      ]),
    };
  },
  solution: (params) => {
    const { num, other, A, B, tex } = reverseParts(params);
    return [
      { text: `The path through $${A}$ to $${B}$ is the top of the fraction. Both paths ending in $${B}$ make $P(${B})$.` },
      { tex: chain(`P(${B})`, `${tth(num).tex} + ${tth(other).tex}`, tth(num + other).tex) },
      { tex: chain(tex, `\\frac{${tth(num).tex}}{${tth(num + other).tex}}`, ftex([num, num + other])) },
    ];
  },
};

/** The same, laid out as a tree: two paths, their sum, then the quotient. */
const reverseTree: Generator<ReverseParams> = {
  id: 'prob-cr-bayes-tree',
  sample: (rng, difficulty) => sampleReverse(rng, difficulty, false),
  render: (params): Slide => {
    const { s, num, other, A, B, tex } = reverseParts(params);
    const answer = [tth(num), tth(other), tth(num + other), fr([num, num + other])];
    return {
      kind: 'tree',
      prompt: [
        say(storySentence(s)),
        picture(condTreeSvg(params)),
        say(`${reverseQuestion(params)} Top row: $P(${A} \\cap ${B})$, then $P(${not(A)} \\cap ${B})$. Then $P(${B})$, then the answer as a fraction.`),
      ],
      expression: `${tex} = \\frac{P(${A} \\cap ${B})}{P(${B})}`,
      nodes: [
        { id: 'p1', from: [] },
        { id: 'p2', from: [] },
        { id: 'b', from: ['p1', 'p2'] },
        { id: 'r', from: ['p1', 'b'] },
      ],
      bank: bank(answer, [
        hun(condBranchOf(params, params.onA, params.yes)),
        fr([other, num + other]),
        tth(num + leafOf(params, params.onA, !params.yes)),
        fr([num, 10000 - num - other]),
      ]),
      answer: answer.map((t) => t.tex),
    };
  },
  solution: (params) => {
    const { num, other, A, B, tex } = reverseParts(params);
    return [
      { text: `Two paths end in $${B}$. Multiply along each.` },
      { tex: `P(${A} \\cap ${B}) = ${tth(num).tex}, \\quad P(${not(A)} \\cap ${B}) = ${tth(other).tex}` },
      { tex: chain(`P(${B})`, `${tth(num).tex} + ${tth(other).tex}`, tth(num + other).tex) },
      { text: `Given $${B}$, only those two paths are left, and the one through $${A}$ is the part asked about.` },
      { tex: chain(tex, `\\frac{${tth(num).tex}}{${tth(num + other).tex}}`, ftex([num, num + other])) },
    ];
  },
};

/** The fraction that gives P(A | B) off a tree: a path over the sum of two. */
const reverseWhich: Generator<ReverseParams> = {
  id: 'prob-cr-which',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleReverse(rng, difficulty, true);
      const { num, other } = reverseParts(params);
      const x = params.onA ? params.a : 100 - params.a;
      const branch = condBranchOf(params, params.onA, params.yes);
      const otherBranch = condBranchOf(params, !params.onA, params.yes);
      // Every option a different value, so none is right by accident.
      const values = [num / (num + other), branch / 100, (x * branch) / 10000, (x * branch) / (100 * (branch + otherBranch))];
      if (new Set(values.map((v) => v.toFixed(9))).size < 4) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { s, tex } = reverseParts(params);
    const x = fmt((params.onA ? params.a : 100 - params.a) / 100);
    const y = fmt((params.onA ? 100 - params.a : params.a) / 100);
    const bx = fmt(condBranchOf(params, params.onA, params.yes) / 100);
    const by = fmt(condBranchOf(params, !params.onA, params.yes) / 100);
    return pickSlide(
      [say(storySentence(s)), picture(condTreeSvg(params)), say(`Which gives $${tex}$?`)],
      `\\frac{${x} \\times ${bx}}{${x} \\times ${bx} + ${y} \\times ${by}}`,
      [bx, `${x} \\times ${bx}`, `\\frac{${x} \\times ${bx}}{${bx} + ${by}}`],
      saltOf(params),
      true,
    );
  },
  solution: (params) => {
    const { A, B, tex } = reverseParts(params);
    return [
      { text: `$${condTex(B, A)}$ is the branch on the tree. $${tex}$ runs the other way, so it is not on the tree.` },
      { tex: `${tex} = \\frac{P(${A} \\cap ${B})}{P(${B})}` },
      { text: `The top is the path through $${A}$ to $${B}$; the bottom adds both paths that end in $${B}$.` },
    ];
  },
};

type CounterAsk = 'same' | 'second' | 'atleast';

interface CounterParams {
  holder: string;
  thing: number;
  colours: [string, string];
  counts: [number, number];
  ask: CounterAsk;
}

/** Ordered pairs of two draws: the part asked about over the part given. */
function counterParts({ counts: [r, b], ask }: CounterParams): { top: number; bottom: number } {
  const n = r + b;
  if (ask === 'same') return { top: r * (r - 1), bottom: r * (r - 1) + b * (b - 1) };
  if (ask === 'second') return { top: r * (r - 1), bottom: r * (n - 1) };
  return { top: r * (r - 1), bottom: n * (n - 1) - b * (b - 1) };
}

function counterQuestion({ colours: [c0], ask }: CounterParams): string {
  if (ask === 'same') return `Given that they are the same colour, find the probability that both are ${c0}.`;
  if (ask === 'second') return `Given that the second is ${c0}, find the probability that the first was ${c0} too.`;
  return `Given that at least one is ${c0}, find the probability that both are.`;
}

/** Without replacement, told something about the draws: count the pairs that fit. */
const reverseCounters: Generator<CounterParams> = {
  id: 'prob-cr-counters',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const counts: [number, number] = [rng.int(2, hard ? 10 : 8), rng.int(2, hard ? 10 : 8)];
      const params: CounterParams = {
        holder: rng.pick(HOLDERS),
        thing: rng.int(0, THINGS.length - 1),
        colours: rng.sample(COLOURS, 2) as [string, string],
        counts,
        ask: hard ? rng.pick(['second', 'atleast'] as const) : 'same',
      };
      const n = counts[0] + counts[1];
      const { top, bottom } = counterParts(params);
      if (same(top / bottom, (counts[0] * (counts[0] - 1)) / (n * (n - 1)))) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const [one, many] = THINGS[params.thing];
    const [r, b] = params.counts;
    const { top, bottom } = counterParts(params);
    return probSlide(
      [
        say(`A ${params.holder} holds ${r} ${params.colours[0]} and ${b} ${params.colours[1]} ${many}. Two are taken at random, one after the other, without replacement.`),
        say(`${counterQuestion(params)} Each ${one} is equally likely to be taken.`),
      ],
      'P =',
      fans([top, bottom]),
    );
  },
  solution: (params) => {
    const [c0, c1] = params.colours;
    const [r, b] = params.counts;
    const n = r + b;
    const { top, bottom } = counterParts(params);
    const both = `P(\\text{both ${c0}}) = ${rawTex([r, n])} \\times ${rawTex([r - 1, n - 1])} = ${rawTex([r * (r - 1), n * (n - 1)])}`;
    const steps: SolutionStep[] = [{ tex: both }];
    if (params.ask === 'same') {
      steps.push({ tex: `P(\\text{both ${c1}}) = ${rawTex([b, n])} \\times ${rawTex([b - 1, n - 1])} = ${rawTex([b * (b - 1), n * (n - 1)])}` }, { text: 'Same colour is either of those. Given the same colour, both are in the running and the first is the part asked about.' });
    } else if (params.ask === 'second') {
      steps.push({ text: `The second is ${c0} on two paths: ${c0} then ${c0}, or ${c1} then ${c0}.` }, { tex: `P(\\text{second ${c0}}) = ${rawTex([r * (r - 1), n * (n - 1)])} + ${rawTex([b * r, n * (n - 1)])} = ${rawTex([bottom, n * (n - 1)])}` });
    } else {
      steps.push({ text: `At least one is ${c0} unless both are ${c1}.` }, { tex: `P(\\text{at least one ${c0}}) = 1 - ${rawTex([b * (b - 1), n * (n - 1)])} = ${rawTex([bottom, n * (n - 1)])}` });
    }
    steps.push({ text: `Divide: the $${n * (n - 1)}$s cancel.` }, { tex: `P = ${rawTex([top, bottom])}${gcd(top, bottom) > 1 ? ` = ${ftex([top, bottom])}` : ''}` });
    return steps;
  },
  choices: (params) => {
    const [r, b] = params.counts;
    const n = r + b;
    const { top, bottom } = counterParts(params);
    return probChoices(fr([top, bottom]), [fr([r * (r - 1), n * (n - 1)]), fr([r, n]), fr([r - 1, n - 1]), fr([top, n * n]), fr([bottom, n * (n - 1)])], saltOf(params));
  },
};

/* ================================================================
 * Registry
 * ================================================================ */

/**
 * Splits `tex` at `sep` wherever it stands outside every brace and every
 * `\left ... \right` pair, so a separator inside a fraction stays put.
 */
function splitTop(tex: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < tex.length; i += 1) {
    if (tex.startsWith('\\left', i)) depth += 1;
    else if (tex.startsWith('\\right', i)) depth -= 1;
    else if (tex[i] === '{') depth += 1;
    else if (tex[i] === '}') depth -= 1;
    else if (depth === 0 && tex.startsWith(sep, i)) {
      parts.push(tex.slice(from, i));
      from = i + sep.length;
      i = from - 1;
    }
  }
  parts.push(tex.slice(from));
  return parts;
}

/** Roughly how many characters a line of TeX shows: commands and braces dropped. */
const shownLength = (tex: string): number => tex.replace(/\\[a-zA-Z]+/g, '').replace(/[{}\s]/g, '').length;

/**
 * A line of working made to fit a phone, about 320 px across at the display
 * size. A list of results joined by `\quad` becomes a stack, one per line,
 * and a long chain of equalities breaks after its first side, aligned on the
 * equals signs. A line already laid out by its own environment is left alone.
 */
export function fitTex(tex: string): string {
  if (tex.includes('\\begin{')) return tex;
  const implied = splitTop(tex, ' \\quad \\Rightarrow \\quad ');
  if (implied.length > 1) return `\\begin{gathered} ${implied.map(fitTex).join(' \\\\ \\Rightarrow ')} \\end{gathered}`;
  for (const sep of [', \\quad ', ', \\; ']) {
    const items = splitTop(tex, sep);
    if (items.length > 1) return `\\begin{gathered} ${items.map(fitTex).join(' \\\\ ')} \\end{gathered}`;
  }
  const sides = splitTop(tex, ' = ');
  if (sides.length >= 3 && shownLength(tex) > 16) {
    // A long first side goes on a line of its own, or the first row alone overflows.
    const head = shownLength(`${sides[0]}=${sides[1]}`) > 17 ? `& ${sides[0]} \\\\ &= ` : `${sides[0]} &= `;
    return `\\begin{aligned} ${head}${sides.slice(1).join(' \\\\ &= ')} \\end{aligned}`;
  }
  return tex;
}

/** Every displayed line of a generator, prompt and working, passed through `fitTex`. */
function fitted<P>(g: Generator<P>): Generator<P> {
  const fitBlocks = (blocks: Block[]): Block[] => blocks.map((b) => (b.kind === 'display' ? { ...b, tex: fitTex(b.tex) } : b));
  return {
    ...g,
    render: (params) => {
      const slide = g.render(params);
      return slide.kind === 'teach' ? slide : { ...slide, prompt: fitBlocks(slide.prompt) };
    },
    solution: (params) => g.solution(params).map((step) => (step.tex === undefined ? step : { ...step, tex: fitTex(step.tex) })),
  };
}

export const probabilityGenerators = [
  bagFraction,
  scaleSlider,
  scaleWords,
  cancelTiles,
  spaceTable,
  spaceEvent,
  spaceTree,
  outcomeCount,
  complementTiles,
  complementValue,
  atLeastSteps,
  complementFlow,
  twoWayFill,
  twoWayCell,
  twoWayTree,
  twoWayWhich,
  relFreq,
  expected,
  expectedTree,
  methodFlow,
  exclusiveFlow,
  addTiles,
  spinnerMissing,
  exclusiveChoice,
  vennUnion,
  vennRuleTiles,
  vennTree,
  vennRegion,
  indepFlow,
  indepAnd,
  indepTiles,
  repeatSteps,
  treeRead,
  treeAtLeast,
  treeSameSteps,
  treeExactlyTiles,
  condTable,
  condWhich,
  noReplTree,
  noReplTiles,
  treeBranchTable,
  treeFromWords,
  replaceFlow,
  branchMissing,
  threePath,
  threeAtLeast,
  threeSameSteps,
  threeExactlyTiles,
  vennRegionsTable,
  vennStartFlow,
  vennCount,
  vennMatch,
  venn3Fill,
  venn3Outward,
  venn3Missing,
  venn3Where,
  venn3Chance,
  vennEventsTable,
  vennReadFlow,
  vennSumTiles,
  condTableTiles,
  condFormula,
  condJointWhich,
  condAndTree,
  condVennCount,
  condVennFill,
  condVennGivenTiles,
  condVennFlow,
  condFill,
  condTotalTree,
  condPath,
  condWords,
  indepTableFlow,
  indepVennTiles,
  indepTreeChoice,
  indepGiven,
  reverseTiles,
  reverseTree,
  reverseWhich,
  reverseCounters,
].map((g) => fitted(g as Generator<unknown>));
