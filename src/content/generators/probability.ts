/**
 * Probability (roadmap C16).
 *
 * Level 1 is outcomes and sample spaces: favourable over total and the scale
 * from 0 to 1, listing the outcomes of two coins, dice and spinners, the
 * complement and "at least one", two-way tables, and relative frequency with
 * the expected number `nP`. Level 2 combines events: the addition rule for
 * mutually exclusive events, the general addition rule read off a Venn
 * diagram, independence and the multiplication rule, two-stage trees, and
 * conditional probability from a table or without replacement.
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
].map((g) => fitted(g as Generator<unknown>));
