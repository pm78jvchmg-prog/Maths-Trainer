/**
 * An independent check on the proving-identities generators (level 5), the
 * factor-formula generators (level 6) and the general-solution generators
 * (level 7).
 *
 * The property tests in `generators.test.ts` prove each generator agrees with
 * itself, and the oracle there skips every one of these. So these read what
 * the learner is shown — the claim in the prompt, each line of working, each
 * tile, option and step — turn the TeX into mathjs, and evaluate it at angles
 * off the poles. Every line a proof offers as right must equal the side it
 * started from; every slip, spare tile and distractor must not. A line that
 * is written wrongly fails here even when the generator is consistent with
 * itself.
 *
 * Level 6 is held the same way, and more: each exact value is compared with
 * the calculator's, and each equation's solutions are found again by scanning
 * the stated range in whole degrees (a lone factor such as sin 8x = 0 is
 * solved exactly instead, since its zeros need not be whole).
 *
 * Level 7's general solutions are read off the TeX as families in n, n put
 * in, and what lands in the range held to a one-degree scan of the equation;
 * every slip, spare tile and wrong option must name a different set.
 */
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 80;

/** Sample angles in radians, clear of every multiple of 45 degrees, where these functions have poles. */
const XS = [0.35, 0.8, 1.2, 2.1, 2.7, 3.6, 4.4, 5.3];

function slides(id: string): { slide: Slide; where: string }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, `no generator ${id}`).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      where: `${id} seed ${seed} d${difficulty}`,
    })),
  );
}

/**
 * TeX as mathjs reads it. The angle's letter, whichever it is, becomes x;
 * `\sin^2 2x` becomes `(sin(2*x))^2`; fractions and roots are unwrapped; and
 * every product written by juxtaposition gets its `*`.
 */
function toMath(tex: string): string {
  let s = tex
    .replace(/\\operatorname\{cosec\}/g, '\\csc')
    .replace(/\\theta/g, 'x')
    .replace(/A/g, 'x')
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\left|\\right/g, '')
    // An angle in degrees, bracketed or not: \sin 255^{\circ}, \sin(-30^{\circ}).
    .replace(/\\(sin|cos|tan)\s*\(\s*(-?\d+)\^\{\\circ\}\s*\)/g, '$1(($2)*pi/180)')
    .replace(/\\(sin|cos|tan)\s*(-?\d+)\^\{\\circ\}/g, '$1(($2)*pi/180)')
    // A half sum or half difference: \sin \frac{8x + 6x}{2}.
    .replace(/\\(sin|cos|tan)\s*\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1((($2)/($3)))')
    .replace(/\\(sin|cos|tan|sec|csc|cot)(?:\^(\d))?\s*(\d*)\s*x/g, (_m, fn: string, power: string | undefined, k: string) => {
      const call = `${fn}(${k ? `${k}*` : ''}x)`;
      return power ? `(${call})^${power}` : call;
    })
    // A bracketed angle, \cos(7x - 5x), or a general one, \sin B.
    .replace(/\\(sin|cos|tan)\s*\(/g, '$1(')
    .replace(/\\(sin|cos|tan)\s*([A-Z])/g, '$1($2)')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
  for (;;) {
    const next = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
    if (next === s) break;
    s = next;
  }
  return s
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\)\s*(?=[a-z(\d])/g, ')*')
    .replace(/(\d)\s*(?=[a-z(])/g, '$1*');
}

function valueAt(tex: string, x: number): number {
  return valueWith(tex, { x });
}

function valueWith(tex: string, scope: Record<string, number>): number {
  let v: unknown;
  try {
    v = math.evaluate(toMath(tex), scope);
  } catch (error) {
    throw new Error(`cannot read ${tex} as ${toMath(tex)}: ${String(error)}`);
  }
  return typeof v === 'number' ? v : NaN;
}

const usable = (v: number) => Number.isFinite(v) && Math.abs(v) < 1e6;

/** True when the two agree at every sample angle where both have a value. */
function same(a: string, b: string): boolean {
  let checked = 0;
  for (const x of XS) {
    const va = valueAt(a, x);
    const vb = valueAt(b, x);
    if (!usable(va) || !usable(vb)) continue;
    checked += 1;
    if (Math.abs(va - vb) > 1e-7 * (1 + Math.abs(va))) return false;
  }
  if (checked < 4) throw new Error(`too few sample points for ${a} and ${b}`);
  return true;
}

const inline = (text: string): string[] => [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);

/** Everything written in prose in the prompt, joined. */
const proseOf = (slide: Slide): string =>
  'prompt' in slide ? slide.prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' ') : '';

/** The claim a prompt states first, as [left, right]. */
function claimIn(slide: Slide): [string, string] {
  const tex = inline(proseOf(slide))[0];
  const parts = tex.split(' = ');
  expect(parts.length, `claim ${tex}`).toBe(2);
  return [parts[0], parts[1]];
}

/** The rows of a displayed column of working, with "=" and alignment stripped. */
function workingRows(slide: Slide): string[] {
  if (!('prompt' in slide)) return [];
  const block = slide.prompt.find((b) => b.kind === 'display' && b.tex.includes('aligned'));
  if (!block || block.kind !== 'display') throw new Error('no working shown');
  const rows: string[] = [];
  for (const raw of block.tex.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '').split('\\\\')) {
    const row = raw.replace(/&/g, '').trim();
    // A row carried on from the one above starts with \quad.
    if (row.startsWith('\\quad')) rows[rows.length - 1] += ` ${row.slice(5).trim()}`;
    else rows.push(row.replace(/^=\s*/, '').trim());
  }
  return rows;
}

/** The maths after "= " in a step or label, or undefined when it has none. */
const lineIn = (text: string): string | undefined => inline(text).find((tex) => tex.startsWith('= '))?.slice(2);

const PROOF_STEPS = ['tid-proof-basic-steps', 'tid-proof-fraction-steps', 'tid-proof-square-steps', 'tid-proof-double-steps'];
const PROOF_ORDERS = ['tid-proof-basic-order', 'tid-proof-fraction-order', 'tid-proof-square-order', 'tid-proof-double-order'];
const NEXT_CHOICES = ['tid-proof-basic-choice', 'tid-proof-fraction-choice', 'tid-proof-double-choice'];
const PROOF_TILES = ['tid-proof-fraction-tiles', 'tid-proof-square-tiles'];

describe('toMath', () => {
  it('reads the notation these proofs use', () => {
    expect(valueAt('\\sin^2 x + \\cos^2 x', 0.7)).toBeCloseTo(1, 12);
    expect(valueAt('\\frac{2\\sin \\theta \\cos \\theta}{\\sin 2\\theta}', 0.7)).toBeCloseTo(1, 12);
    expect(valueAt('\\sec^2 A - \\tan^2 A', 0.7)).toBeCloseTo(1, 12);
    expect(valueAt('\\operatorname{cosec} x \\sin x', 0.7)).toBeCloseTo(1, 12);
    expect(valueAt('(1 - \\sin x) (1 + \\sin x)', 0.7)).toBeCloseTo(Math.cos(0.7) ** 2, 12);
    expect(valueAt('\\frac{\\sqrt{3}}{2}', 0)).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(same('\\tan x \\cos x', '\\sin x')).toBe(true);
    expect(same('\\tan x', '\\sin x')).toBe(false);
  });

  it('reads the notation the factor formulae use', () => {
    expect(valueAt('\\sin 255^{\\circ} + \\sin 195^{\\circ}', 0)).toBeCloseTo(-Math.sqrt(6) / 2, 12);
    expect(valueAt('2\\cos 45^{\\circ} \\sin(-30^{\\circ})', 0)).toBeCloseTo(-Math.SQRT2 / 2, 12);
    expect(valueAt('-\\frac{1}{2} - \\left(-\\frac{\\sqrt{3}}{2}\\right)', 0)).toBeCloseTo((Math.sqrt(3) - 1) / 2, 12);
    expect(valueAt('\\cos(7x - 5x) - \\cos(7x + 5x)', 0.7)).toBeCloseTo(2 * Math.sin(4.9) * Math.sin(3.5), 12);
    expect(same('2\\sin \\frac{8x + 6x}{2} \\cos \\frac{8x - 6x}{2}', '\\sin 8x + \\sin 6x')).toBe(true);
    expect(same('\\frac{1}{2}(\\cos 2x - \\cos 12x)', '\\sin 7x \\sin 5x')).toBe(true);
    expect(same('2\\sin 14x \\cos 2x', '\\sin 8x + \\sin 6x')).toBe(false);
    expect(valueWith('\\cos(A + B) - \\cos(A - B)', { x: 0.7, B: 0.3 })).toBeCloseTo(-2 * Math.sin(0.7) * Math.sin(0.3), 12);
  });
});

describe.each(PROOF_STEPS.map((id) => [id]))('%s', (id) => {
  it('keeps every line equal to the left side and ends on the right', () => {
    for (const { slide, where } of slides(id)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const [lhs, rhs] = claimIn(slide);
      let line = slide.start;
      expect(same(line.join(' '), lhs), `${where}: start`).toBe(true);
      slide.reductions.forEach((step, i) => {
        const swap = (value: string) => [...line.slice(0, step.span[0]), value, ...line.slice(step.span[1])];
        for (const offered of step.bank) {
          if (offered === step.value) continue;
          expect(same(swap(offered).join(' '), lhs), `${where}: step ${i} slip ${offered} is not wrong`).toBe(false);
        }
        line = swap(step.value);
        expect(same(line.join(' '), lhs), `${where}: step ${i} gives ${line.join(' ')}`).toBe(true);
      });
      expect(line.join(' '), `${where}: ends on the right side`).toBe(rhs);
    }
  });
});

describe.each(PROOF_ORDERS.map((id) => [id]))('%s', (id) => {
  it('runs from the left side to the right, every line equal, every slip not', () => {
    for (const { slide, where } of slides(id)) {
      if (slide.kind !== 'order') throw new Error('expected order');
      const [lhs, rhs] = claimIn(slide);
      const text = (sid: string) => slide.steps.find((s) => s.id === sid)?.text as string;
      const proof = slide.answer.map(text);
      expect(proof[0]).toContain(`$${lhs}$`);
      const lines = proof.map(lineIn).filter((tex): tex is string => tex !== undefined);
      expect(lines.length, where).toBe(proof.length - 2);
      for (const tex of lines) expect(same(tex, lhs), `${where}: ${tex}`).toBe(true);
      expect(lines[lines.length - 1], where).toBe(rhs);
      for (const step of slide.steps.filter((s) => !slide.answer.includes(s.id))) {
        const tex = lineIn(step.text);
        if (tex !== undefined) expect(same(tex, lhs), `${where}: distractor ${tex} is not wrong`).toBe(false);
      }
    }
  });
});

describe.each(NEXT_CHOICES.map((id) => [id]))('%s', (id) => {
  it('offers one next line equal to the working and three that are not', () => {
    for (const { slide, where } of slides(id)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const [lhs] = claimIn(slide);
      for (const row of workingRows(slide)) expect(same(row, lhs), `${where}: working ${row}`).toBe(true);
      for (const option of slide.options) {
        const tex = option.label.replace(/^=\s*/, '');
        expect(same(tex, lhs), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

/** Every way of placing bank tiles in the blanks, each tile used at most once. */
function placements(bank: string[], slots: number): string[][] {
  if (slots === 0) return [[]];
  return bank.flatMap((token, i) =>
    placements([...bank.slice(0, i), ...bank.slice(i + 1)], slots - 1).map((rest) => [token, ...rest]),
  );
}

describe.each(PROOF_TILES.map((id) => [id]))('%s', (id) => {
  it('fills the gap with a line equal to the rest, and no other placement is equal', () => {
    for (const { slide, where } of slides(id)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [lhs] = claimIn(slide);
      for (const row of workingRows(slide)) {
        if (row === '\\;?') continue;
        expect(same(row, lhs), `${where}: working ${row}`).toBe(true);
      }
      const fill = (tokens: string[]) => slide.template.replace(/\{(\d)\}/g, (_, i: string) => tokens[Number(i)]).replace(/^=\s*/, '');
      expect(same(fill(slide.answer), lhs), `${where}: ${fill(slide.answer)}`).toBe(true);
      const key = (tokens: string[]) => (slide.unordered ? [...tokens].sort() : tokens).join('|');
      for (const tokens of placements(slide.bank, slide.answer.length)) {
        // A placement the grader accepts is the answer; any other must not be equal, or a right line is marked wrong.
        if (key(tokens) === key(slide.answer)) continue;
        expect(same(fill(tokens), lhs), `${where}: ${fill(tokens)} is equal but marked wrong`).toBe(false);
      }
    }
  });
});

describe('tid-proof-start-flow', () => {
  it('starts from the busier side, with a first line equal to it', () => {
    for (const { slide, where } of slides('tid-proof-start-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [left, right] = slide.subject.split(' = ');
      const side = inline(slide.answer[0])[0];
      expect([left, right], where).toContain(side);
      const other = side === left ? right : left;
      // The busier side is the one with the more to write.
      expect(side.length, `${where}: starts from the plainer side`).toBeGreaterThan(other.length);
      expect(same(side, other), `${where}: not an identity`).toBe(true);
      for (const branch of slide.steps[1].branches) {
        const tex = lineIn(branch.label);
        if (tex === undefined) continue;
        expect(same(tex, side), `${where}: ${branch.label}`).toBe(branch.label === slide.answer[1]);
      }
      expect(lineIn(slide.answer[1]), where).toBeDefined();
    }
  });
});

describe('tid-proof-identity-flow', () => {
  it('continues the line with one equal to it, and offers only slips beside it', () => {
    for (const { slide, where } of slides('tid-proof-identity-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [lhs] = claimIn(slide);
      expect(same(slide.subject, lhs), `${where}: subject`).toBe(true);
      for (const branch of slide.steps[1].branches) {
        expect(same(lineIn(branch.label) as string, lhs), `${where}: ${branch.label}`).toBe(branch.label === slide.answer[1]);
      }
    }
  });
});

const angleIn = (text: string): number => {
  const match = /= (-?\d+)\^\{\\circ\}/.exec(text);
  if (!match) throw new Error(`no angle in ${text}`);
  return (Number(match[1]) * Math.PI) / 180;
};

describe('tid-proof-sides-tree', () => {
  it('fills each piece and each side with its value at the angle', () => {
    for (const { slide, where } of slides('tid-proof-sides-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const text = proseOf(slide);
      const x = angleIn(text);
      const [lhs, rhs] = slide.expression.split(' = ');
      const pieces = inline(text.slice(text.indexOf('Top row')));
      const values = slide.answer.map((tex) => valueAt(tex, 0));
      expect(pieces.length + 2, where).toBe(slide.answer.length);
      pieces.forEach((tex, i) => expect(values[i], `${where}: ${tex}`).toBeCloseTo(valueAt(tex, x), 9));
      expect(values[pieces.length], `${where}: left side`).toBeCloseTo(valueAt(lhs, x), 9);
      expect(values[pieces.length + 1], `${where}: right side`).toBeCloseTo(valueAt(rhs, x), 9);
    }
  });
});

describe('tid-proof-side-value', () => {
  it("answers with the side's value at the angle", () => {
    for (const { slide, where } of slides('tid-proof-side-value')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [lhs, rhs] = claimIn(slide);
      const x = angleIn(proseOf(slide));
      const side = /the right side/.test(proseOf(slide)) ? rhs : lhs;
      expect(math.evaluate(slide.answer) as number, where).toBeCloseTo(valueAt(side, x), 9);
    }
  });
});

/** Where the two sides agree across a whole turn, in whole degrees. */
function agreement(lhs: string, rhs: string): { some: boolean; all: boolean } {
  let some = false;
  let all = true;
  for (let d = 0; d < 360; d += 1) {
    const x = (d * Math.PI) / 180;
    const l = valueAt(lhs, x);
    const r = valueAt(rhs, x);
    // Off a pole on both sides: at 90 degrees sec^2 - tan^2 comes out 0 from
    // two huge terms cancelling, where just beside it the value is 1.
    const steady = (tex: string, v: number) => Math.abs(valueAt(tex, x + 1e-6) - v) < 1e-3;
    if (!usable(l) || !usable(r) || !steady(lhs, l) || !steady(rhs, r)) continue;
    if (Math.abs(l - r) < 1e-9 * (1 + Math.abs(l))) some = true;
    else all = false;
  }
  return { some, all };
}

describe('tid-proof-verdict-flow', () => {
  it('reads the test angle and the verdict off the sides themselves', () => {
    for (const { slide, where } of slides('tid-proof-verdict-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [lhs, rhs] = slide.subject.split(' = ');
      const x = angleIn(proseOf(slide));
      const agreesHere = Math.abs(valueAt(lhs, x) - valueAt(rhs, x)) < 1e-9;
      expect(slide.answer[0].startsWith('Yes'), `${where}: test angle`).toBe(agreesHere);
      const { some, all } = agreement(lhs, rhs);
      const verdict = /identity/.test(slide.answer[1]) ? 'identity' : /never/.test(slide.answer[1]) ? 'never' : 'equation';
      expect(verdict, where).toBe(all ? 'identity' : some ? 'equation' : 'never');
    }
  });
});

describe('tid-proof-disprove-order', () => {
  it('evaluates both sides correctly at an angle where they differ', () => {
    for (const { slide, where } of slides('tid-proof-disprove-order')) {
      if (slide.kind !== 'order') throw new Error('expected order');
      const [lhs, rhs] = claimIn(slide);
      const proof = slide.answer.map((sid) => slide.steps.find((s) => s.id === sid)?.text as string);
      const x = angleIn(proof[0]);
      const [, leftValue] = inline(proof[1]);
      const [, rightValue] = inline(proof[2]);
      expect(inline(proof[1])[0]).toBe(lhs);
      expect(inline(proof[2])[0]).toBe(rhs);
      expect(valueAt(leftValue, 0), `${where}: left`).toBeCloseTo(valueAt(lhs, x), 9);
      expect(valueAt(rightValue, 0), `${where}: right`).toBeCloseTo(valueAt(rhs, x), 9);
      expect(Math.abs(valueAt(lhs, x) - valueAt(rhs, x)), where).toBeGreaterThan(1e-6);
    }
  });
});

describe('tid-proof-wrong-choice', () => {
  it('marks the first line that is not equal to the side it started from', () => {
    for (const { slide, where } of slides('tid-proof-wrong-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const [lhs] = claimIn(slide);
      const rows = workingRows(slide);
      const first = rows.findIndex((row) => !same(row, lhs));
      expect(first, `${where}: no wrong line`).toBeGreaterThan(0);
      const correct = slide.options.find((o) => o.id === slide.correctId)?.label.replace(/^=\s*/, '');
      expect(correct, where).toBe(rows[first]);
    }
  });
});

/* ---------- Level 6: the factor formulae ---------- */

/** The four factor formulae, read off a sum's function and sign: the half sum's function, the half difference's, and the coefficient. */
const FACTOR_FORMULAE: Record<string, [string, string, number]> = {
  'sin+': ['sin', 'cos', 2],
  'sin-': ['cos', 'sin', 2],
  'cos+': ['cos', 'cos', 2],
  'cos-': ['sin', 'sin', -2],
};

/** A sum of two terms written `\fn P \pm \fn Q`, taken apart. */
function sumParts(tex: string): { key: string; p: string; q: string } {
  const match = /^\\(sin|cos) (\S+) ([+-]) \\\1 (\S+)$/.exec(tex.trim());
  if (!match) throw new Error(`not a sum of two terms: ${tex}`);
  return { key: `${match[1]}${match[3]}`, p: match[2], q: match[4] };
}

/** The multiple of x a tile or label names: `7x`, `x`, `-x`. */
function multiple(tex: string): number {
  const match = /^(-?)(\d*)x$/.exec(tex.trim());
  if (!match) throw new Error(`not a multiple of x: ${tex}`);
  return (match[1] ? -1 : 1) * (match[2] ? Number(match[2]) : 1);
}

/** An angle in degrees: `225^{\circ}`. */
function degrees(tex: string): number {
  const match = /^(-?\d+)\^\{\\circ\}$/.exec(tex.trim());
  if (!match) throw new Error(`not an angle: ${tex}`);
  return Number(match[1]);
}

/** A written equation holds as an identity when every side agrees with the first. */
function holds(statement: string): boolean {
  const [first, ...rest] = statement.split(' = ');
  return rest.length > 0 && rest.every((side) => same(side, first));
}

/** Every placement of bank tiles in the template: the answer's holds, and no other does. */
function tilesHold(slide: Slide, where: string): void {
  if (slide.kind !== 'tiles') throw new Error('expected tiles');
  const fill = (tokens: string[]) => slide.template.replace(/\{(\d)\}/g, (_, i: string) => tokens[Number(i)]);
  expect(holds(fill(slide.answer)), `${where}: ${fill(slide.answer)}`).toBe(true);
  const key = (tokens: string[]) => (slide.unordered ? [...tokens].sort() : tokens).join('|');
  for (const tokens of placements(slide.bank, slide.answer.length)) {
    if (key(tokens) === key(slide.answer)) continue;
    expect(holds(fill(tokens)), `${where}: ${fill(tokens)} holds but is marked wrong`).toBe(false);
  }
}

/** Every line of a steps slide equal to where it started, every slip in a bank not. */
function stepsHold(slide: Slide, where: string): string {
  if (slide.kind !== 'steps') throw new Error('expected steps');
  const start = slide.start.join(' ');
  let line = slide.start;
  slide.reductions.forEach((step, i) => {
    const swap = (value: string) => [...line.slice(0, step.span[0]), value, ...line.slice(step.span[1])];
    for (const offered of step.bank) {
      if (offered === step.value) continue;
      expect(same(swap(offered).join(' '), start), `${where}: step ${i} slip ${offered} is not wrong`).toBe(false);
    }
    line = swap(step.value);
    expect(same(line.join(' '), start), `${where}: step ${i} gives ${line.join(' ')}`).toBe(true);
  });
  expect(line.length, `${where}: ends on one piece`).toBe(1);
  return line[0];
}

/** One option equal to the shown expression, and three that are not. */
function choiceHolds(slide: Slide, where: string): void {
  if (slide.kind !== 'choice') throw new Error('expected choice');
  const shown = slide.prompt.find((block) => block.kind === 'display');
  if (!shown || shown.kind !== 'display') throw new Error('nothing displayed');
  for (const option of slide.options) {
    expect(same(option.label, shown.tex), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
  }
}

const compiled = new Map<string, (x: number) => number>();

/** The left side minus the right, in degrees, compiled once. */
function differenceAt(equation: string): (x: number) => number {
  let f = compiled.get(equation);
  if (!f) {
    const [lhs, rhs] = equation.split(' = ');
    const code = math.compile(`(${toMath(lhs)}) - (${toMath(rhs)})`);
    f = (x) => code.evaluate({ x: (x * Math.PI) / 180 }) as number;
    compiled.set(equation, f);
  }
  return f;
}

const scanned = new Map<string, number[]>();

/**
 * What a written line says x is, over whole degrees from 0 (or 1, for an open
 * range) up to top: a list of angles read as written, a line of factors
 * joined by "or" as the union of each, and an equation by scanning it.
 */
function solutionsOf(line: string, top: number, open = false): number[] {
  const key = `${line}|${top}|${open}`;
  const known = scanned.get(key);
  if (known) return known;
  let found: number[];
  if (/^(\\begin\{aligned\} )?x = /.test(line)) {
    found = [...line.matchAll(/(-?\d+)\^\{\\circ\}/g)].map((m) => Number(m[1]));
  } else if (/^\\(sin|cos) (\d*)x = 0$/.test(line)) {
    // One factor, solved exactly: its zeros need not be whole degrees, and a
    // scan in whole degrees would miss sin 8x = 0 at 22.5.
    const [, fn, k] = /^\\(sin|cos) (\d*)x = 0$/.exec(line) as RegExpExecArray;
    const n = k ? Number(k) : 1;
    found = [];
    for (let i = 0; ; i += 1) {
      const x = ((fn === 'sin' ? 0 : 90) + 180 * i) / n;
      if (x >= top) break;
      if (x > 0 || !open) found.push(Math.round(x * 1e6) / 1e6);
    }
  } else if (/^-?\d*(\\(sin|cos) \d*x ?)+= 0$/.test(line)) {
    // A product of factors is zero where one of them is.
    const factors = [...line.matchAll(/\\(sin|cos) (\d*x)/g)].map((m) => `\\${m[1]} ${m[2]} = 0`);
    found = [...new Set(factors.flatMap((factor) => solutionsOf(factor, top, open)))].sort((a, b) => a - b);
  } else if (line.includes('\\text{ or }')) {
    found = [...new Set(line.split(' \\text{ or } ').flatMap((part) => solutionsOf(part, top, open)))].sort((a, b) => a - b);
  } else {
    const f = differenceAt(line);
    found = [];
    for (let d = open ? 1 : 0; d < top; d += 1) if (Math.abs(f(d)) < 1e-9) found.push(d);
  }
  scanned.set(key, found);
  return found;
}

/**
 * The solutions of an equation by scanning, and a guard that the scan missed
 * none: a sign change between two whole degrees with no zero at either end
 * would be a root the scan stepped over.
 */
function scanSolutions(equation: string, top: number, open = false): number[] {
  const f = differenceAt(equation);
  for (let d = 0; d + 1 <= top; d += 1) {
    const [a, b] = [f(d), f(d + 1)];
    if (Math.abs(a) > 1e-9 && Math.abs(b) > 1e-9) expect(a * b > 0, `${equation}: a root between ${d} and ${d + 1}`).toBe(true);
  }
  return solutionsOf(equation, top, open);
}

/** The range a prompt states, `0^{\circ} \le x < 180^{\circ}`, as its top. */
function topOf(text: string): number {
  const match = /0\^\{\\circ\} \\le x < (\d+)\^\{\\circ\}/.exec(text);
  if (!match) throw new Error(`no range in ${text}`);
  return Number(match[1]);
}

/** An equation with everything moved to one side: `L = R` as `L - (R)`, written back as TeX. */
const oneSide = (equation: string): string => {
  const [lhs, rhs] = equation.split(' = ');
  return rhs.trim() === '0' ? lhs : `${lhs} - (${rhs})`;
};

describe('tid-factor-add-steps', () => {
  it('expands both brackets correctly and collects to the product', () => {
    for (const { slide, where } of slides('tid-factor-add-steps')) {
      const product = stepsHold(slide, where);
      expect(product, where).not.toMatch(/[+(]/);
    }
  });
});

describe('tid-factor-halves-tree', () => {
  it('fills the sum, the difference, their halves and the product the formula gives', () => {
    for (const { slide, where } of slides('tid-factor-halves-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [, pTex, qTex] = /Here \$P = ([^$]+)\$ and \$Q = ([^$]+)\$/.exec(proseOf(slide)) ?? [];
      const [p, q] = [multiple(pTex), multiple(qTex)];
      expect(sumParts(slide.expression).p, where).toBe(pTex);
      expect(sumParts(slide.expression).q, where).toBe(qTex);
      expect(slide.answer.slice(0, 4).map(multiple), where).toEqual([p + q, p - q, (p + q) / 2, (p - q) / 2]);
      const product = slide.answer[4];
      if (product !== undefined) expect(same(product, slide.expression), `${where}: ${product}`).toBe(true);
      for (const spare of slide.bank.filter((tile) => /\\(sin|cos)/.test(tile) && tile !== product)) {
        expect(same(spare, slide.expression), `${where}: spare ${spare} is right`).toBe(false);
      }
    }
  });
});

describe('tid-factor-derive-order', () => {
  it('starts from a true identity, finds A and B, and ends on the right product', () => {
    for (const { slide, where } of slides('tid-factor-derive-order')) {
      if (slide.kind !== 'order') throw new Error('expected order');
      const text = (sid: string) => slide.steps.find((s) => s.id === sid)?.text as string;
      const proof = slide.answer.map(text);
      const general = inline(proof[0]).find((tex) => tex.includes(' = ')) as string;
      const [lhs, rhs] = general.split(' = ');
      for (const [x, B] of [[0.7, 0.3], [2.1, -1.2]]) {
        expect(valueWith(lhs, { x, B }), `${where}: ${general}`).toBeCloseTo(valueWith(rhs, { x, B }), 12);
      }
      const [, sumTex, diffTex] = /A \+ B = ([^$]+)\$ and \$A - B = ([^$]+)\$/.exec(proof.join(' ')) ?? [];
      const b = inline(proof.find((line) => line.startsWith('Then')) as string)[0].split(' = ');
      expect(multiple(b[b.length - 1]), `${where}: B`).toBe((multiple(sumTex) - multiple(diffTex)) / 2);
      for (const step of slide.steps.filter((s) => s.text.startsWith('So'))) {
        const [sum, product] = inline(step.text)[0].split(' = ');
        expect(same(sum, product), `${where}: ${step.text}`).toBe(slide.answer.includes(step.id));
      }
      for (const step of slide.steps.filter((s) => s.text.startsWith('Then') && !slide.answer.includes(s.id))) {
        const sides = inline(step.text)[0].split(' = ');
        expect(multiple(sides[sides.length - 1]), `${where}: distractor ${step.text}`).not.toBe(multiple(b[b.length - 1]));
      }
    }
  });
});

describe.each([['tid-factor-origin-choice'], ['tid-factor-sum-choice'], ['tid-factor-product-choice'], ['tid-factor-exact-choice']])('%s', (id) => {
  it('offers one option equal to the expression and three that are not', () => {
    for (const { slide, where } of slides(id)) choiceHolds(slide, where);
  });
});

describe.each([['tid-factor-sum-tiles'], ['tid-factor-product-tiles'], ['tid-factor-exact-tiles']])('%s', (id) => {
  it('completes a true identity, and no other placement does', () => {
    for (const { slide, where } of slides(id)) tilesHold(slide, where);
  });
});

describe('tid-factor-sum-steps', () => {
  it('writes the half angles, then tidies them, every line equal to the sum', () => {
    for (const { slide, where } of slides('tid-factor-sum-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      expect(slide.reductions[0].value, where).toContain('\\frac');
      stepsHold(slide, where);
    }
  });
});

describe('tid-factor-sign-flow', () => {
  it('names the halves the formula needs and the product they give', () => {
    for (const { slide, where } of slides('tid-factor-sign-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { p, q } = sumParts(slide.subject);
      const halves = (label: string) => inline(label).map(multiple);
      const right = [(multiple(p) + multiple(q)) / 2, (multiple(p) - multiple(q)) / 2];
      expect(halves(slide.answer[0]), where).toEqual(right);
      for (const branch of slide.steps[0].branches) {
        if (branch.label !== slide.answer[0]) expect(halves(branch.label), `${where}: ${branch.label}`).not.toEqual(right);
      }
      for (const branch of slide.steps[1].branches) {
        expect(same(inline(branch.label)[0], slide.subject), `${where}: ${branch.label}`).toBe(branch.label === slide.answer[1]);
      }
    }
  });
});

describe('tid-factor-product-value', () => {
  it('answers with the value a calculator gives', () => {
    for (const { slide, where } of slides('tid-factor-product-value')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const product = (slide.lead as string).replace(/=\s*$/, '');
      expect(math.evaluate(slide.answer) as number, `${where}: ${product}`).toBeCloseTo(valueAt(product, 0), 12);
      // Off the table: at least one angle is not a multiple of 30 or 45.
      const angles = [...product.matchAll(/(\d+)\^\{\\circ\}/g)].map((m) => Number(m[1]));
      expect(angles.some((a) => a % 30 !== 0 && a % 45 !== 0), `${where}: both angles on the table`).toBe(true);
    }
  });
});

describe.each([['tid-factor-product-steps'], ['tid-factor-exact-steps']])('%s', (id) => {
  it('keeps every line equal to the start and ends on the value a calculator gives', () => {
    for (const { slide, where } of slides(id)) {
      const value = stepsHold(slide, where);
      expect(value, `${where}: ends on a number`).not.toMatch(/\\(sin|cos)/);
    }
  });
});

describe('tid-factor-exact-tree', () => {
  it('fills the half angles, their values and the exact value, each from the formula', () => {
    for (const { slide, where } of slides('tid-factor-exact-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { key, p, q } = sumParts(slide.expression);
      const [f, g, k] = FACTOR_FORMULAE[key];
      const [P, Q] = [degrees(p), degrees(q)];
      const [s, d, fs, gd, v] = slide.answer;
      expect([degrees(s), degrees(d)], where).toEqual([(P + Q) / 2, (P - Q) / 2]);
      const trig = (fn: string, angle: number) => (fn === 'sin' ? Math.sin : Math.cos)((angle * Math.PI) / 180);
      expect(valueAt(fs, 0), `${where}: ${f} ${s}`).toBeCloseTo(trig(f, degrees(s)), 12);
      expect(valueAt(gd, 0), `${where}: ${g} ${d}`).toBeCloseTo(trig(g, degrees(d)), 12);
      expect(valueAt(v, 0), `${where}: value`).toBeCloseTo(k * valueAt(fs, 0) * valueAt(gd, 0), 12);
      expect(valueAt(v, 0), `${where}: calculator`).toBeCloseTo(trig(key.slice(0, 3), P) + (key[3] === '+' ? 1 : -1) * trig(key.slice(0, 3), Q), 12);
    }
  });
});

describe('tid-factor-eq-steps', () => {
  it('factorises correctly, splits into factors, and lists what a scan finds', () => {
    for (const { slide, where } of slides('tid-factor-eq-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const top = topOf(proseOf(slide));
      const start = slide.start.join(' ');
      const answer = scanSolutions(start, top);
      const [factorised, split, listed] = slide.reductions;
      expect(same(oneSide(factorised.value), oneSide(start)), `${where}: ${factorised.value}`).toBe(true);
      for (const offered of factorised.bank.filter((b) => b !== factorised.value)) {
        expect(same(oneSide(offered), oneSide(start)), `${where}: slip ${offered}`).toBe(false);
      }
      for (const step of [split, listed]) {
        expect(solutionsOf(step.value, top), `${where}: ${step.value}`).toEqual(answer);
        for (const offered of step.bank.filter((b) => b !== step.value)) {
          expect(solutionsOf(offered, top), `${where}: slip ${offered}`).not.toEqual(answer);
        }
      }
    }
  });
});

describe('tid-factor-eq-flow', () => {
  it('factorises correctly and counts what a scan finds', () => {
    for (const { slide, where } of slides('tid-factor-eq-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const top = topOf(proseOf(slide));
      for (const branch of slide.steps[0].branches) {
        const tex = inline(branch.label)[0];
        expect(same(oneSide(tex), oneSide(slide.subject)), `${where}: ${tex}`).toBe(branch.label === slide.answer[0]);
      }
      expect(slide.answer[1], where).toBe(`$${scanSolutions(slide.subject, top).length}$`);
    }
  });
});

describe('tid-factor-eq-slider', () => {
  it('lands on the solution it names, from a scan strictly inside 0 to 360', () => {
    for (const { slide, where } of slides('tid-factor-eq-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const shown = slide.prompt.find((block) => block.kind === 'display');
      if (!shown || shown.kind !== 'display') throw new Error('nothing displayed');
      const all = scanSolutions(shown.tex, 360, true);
      const word = /the (smallest|largest|second smallest) solution/.exec(proseOf(slide))?.[1];
      const expected = word === undefined ? (expect(all.length, where).toBe(1), all[0]) : word === 'smallest' ? all[0] : word === 'largest' ? all[all.length - 1] : all[1];
      expect(slide.answer, where).toBe(expected);
      expect(slide.answer % 15, `${where}: off the slider's steps`).toBe(0);
    }
  });
});

describe('tid-factor-eq-angle', () => {
  it('answers with the solution it names, from a scan of the stated range', () => {
    for (const { slide, where } of slides('tid-factor-eq-angle')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const shown = slide.prompt.find((block) => block.kind === 'display');
      if (!shown || shown.kind !== 'display') throw new Error('nothing displayed');
      const text = proseOf(slide);
      const positive = scanSolutions(shown.tex, topOf(text)).filter((x) => x > 0);
      const expected = /largest/.test(text) ? positive[positive.length - 1] : positive[0];
      expect(Number(slide.answer), where).toBe(expected);
    }
  });
});

/* ---------- Level 7: general solutions ---------- */

/** Angles in degrees a general solution is held to when no range is stated: two turns either side of 0. */
const WINDOW: Range7 = { lo: -720, hi: 720, loIn: true, hiIn: false };

interface Range7 {
  lo: number;
  hi: number;
  loIn: boolean;
  hiIn: boolean;
}

const inside = (x: number, r: Range7): boolean => (r.loIn ? x >= r.lo : x > r.lo) && (r.hiIn ? x <= r.hi : x < r.hi);

const round6 = (x: number): number => Math.round(x * 1e6) / 1e6;

const sameList7 = (a: number[], b: number[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

/** An angle or a sum of angles in n as mathjs reads it, in degrees: a radian's pi is 180 degrees. */
function degreesExpr(tex: string): string {
  let s = tex
    .replace(/\^\{\\circ\}/g, '')
    .replace(/\\pi/g, '(180)')
    .replace(/n/g, '(n)');
  for (;;) {
    const next = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
    if (next === s) break;
    s = next;
  }
  return s.replace(/\)\s*(?=[\d(])/g, ')*').replace(/(\d)\s*(?=\()/g, '$1*');
}

/**
 * Every value a general solution names in a range. The families are read off
 * the TeX, a line broken for a phone included, `\pm` read as both signs, and n
 * runs from -24 to 24: a family whose turn is 60 degrees needs n up to 12 to
 * cross two turns, which -3 to 3 would not reach.
 */
function familyValues(tex: string, r: Range7 = WINDOW): number[] {
  const flat = tex
    .replace(/\\begin\{aligned\}|\\end\{aligned\}|&|\\\\|\\;|\\quad|\{\}/g, ' ')
    .replace(/\\Rightarrow/g, ' ');
  const out = new Set<number>();
  for (const raw of flat.split(/\\text\{ ?or ?\}/)) {
    const piece = raw.replace(/^\s*,?\s*(x\s*=)?\s*/, '').trim();
    const signs = piece.startsWith('\\pm') ? ['', '-'] : [''];
    for (const sign of signs) {
      const code = math.compile(degreesExpr(`${sign}${piece.replace(/^\\pm\s*/, '')}`));
      for (let n = -24; n <= 24; n += 1) {
        const x = round6(code.evaluate({ n }) as number);
        if (inside(x, r)) out.add(x);
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** A family's values for x from a line `2x + 30^{\circ} = <family>`: undo the left side. */
function lineValues(line: string, r: Range7 = WINDOW): number[] {
  const at = line.indexOf(' = ');
  const [lhs, rhs] = [line.slice(0, at), line.slice(at + 3)];
  const match = /^(\d*)x(?: ([+-]) (\d+)\^\{\\circ\})?$/.exec(lhs.trim());
  if (!match) throw new Error(`not a linear left side: ${lhs}`);
  const a = match[1] ? Number(match[1]) : 1;
  const b = match[2] ? (match[2] === '-' ? -1 : 1) * Number(match[3]) : 0;
  const wide = { lo: a * r.lo + b - 720, hi: a * r.hi + b + 720, loIn: true, hiIn: false };
  return familyValues(`x = ${rhs}`, wide)
    .map((u) => round6((u - b) / a))
    .filter((x) => inside(x, r));
}

/** TeX with every angle in degrees written as radians, so `toMath` reads a bracket such as (2x + 30^{\circ}). */
const radiansIn = (tex: string): string => tex.replace(/(-?\d+)\^\{\\circ\}/g, '(($1)*pi/180)');

/**
 * Where an equation holds, over whole degrees in the range, and a guard that
 * the scan missed nothing: a sign change between two whole degrees with no
 * zero at either end is a root it stepped over, unless the jump is a pole.
 */
const ranged = new Map<string, number[]>();

function scanRange(equation: string, r: Range7 = WINDOW): number[] {
  const key = `${equation}|${JSON.stringify(r)}`;
  const known = ranged.get(key);
  if (known) return known;
  const found = scanOnce(equation, r);
  ranged.set(key, found);
  return found;
}

function scanOnce(equation: string, r: Range7): number[] {
  const f = differenceAt(radiansIn(equation));
  const lo = Math.ceil(r.lo);
  const at = Array.from({ length: Math.floor(r.hi) - lo + 2 }, (_, i) => f(lo + i));
  const found: number[] = [];
  for (let i = 0; lo + i <= r.hi; i += 1) {
    const [a, b] = [at[i], at[i + 1]];
    if (inside(lo + i, r) && Math.abs(a) < 1e-9) found.push(lo + i);
    if (lo + i + 1 <= r.hi && Math.abs(a) > 1e-9 && Math.abs(b) > 1e-9 && Math.abs(a) < 20 && Math.abs(b) < 20 && a * b < 0) {
      expect.fail(`${equation}: a root between ${lo + i} and ${lo + i + 1}`);
    }
  }
  return found;
}

/**
 * Where an equation holds in one turn, 0 to 360, found on an eighth-degree
 * grid: grid hits, sign changes and near-zero dips, so a slip's roots off the
 * whole degrees are seen too, a double root such as sin 8x cos 4x has at 22.5
 * included. Every equation here repeats within 360 degrees.
 */
const fine = new Map<string, number[]>();

function fineRoots(equation: string): number[] {
  const known = fine.get(equation);
  if (known) return known;
  const f = differenceAt(radiansIn(equation));
  const step = 0.125;
  const at = Array.from({ length: 360 / step + 2 }, (_, i) => f((i - 1) * step));
  const out = new Set<number>();
  for (let i = 1; i <= 360 / step; i += 1) {
    const [prev, here, next] = [at[i - 1], at[i], at[i + 1]];
    const d = (i - 1) * step;
    if (Math.abs(here) < 1e-9) out.add(round6(d));
    else if (Math.abs(here) < 1e-4 && Math.abs(here) <= Math.abs(prev) && Math.abs(here) <= Math.abs(next)) out.add(round6(d));
    else if (i < 360 / step && here * next < 0 && Math.abs(here) < 20 && Math.abs(next) < 20 && Math.abs(next) > 1e-9) out.add(round6(d + step / 2));
  }
  const found = [...out].sort((x, y) => x - y);
  fine.set(equation, found);
  return found;
}

/** Whether an offered equation has exactly the right solutions, judged in one turn on the fine grid. */
const sameRoots = (offered: string, right: string): boolean =>
  sameList7(fineRoots(offered), scanRange(right, { lo: 0, hi: 360, loIn: true, hiIn: false }));

/** An angle as written, in degrees or radians. */
const angleValue = (tex: string): number => round6(math.evaluate(degreesExpr(tex)) as number);

/** The range a prompt states: `-180^{\circ} < x \le 180^{\circ}` or `-\pi \le x < \pi`. */
function range7(text: string): Range7 {
  const match = /(-?[^\s$]+) (\\le|<) x (\\le|<) ([^\s$]+)/.exec(text);
  if (!match) throw new Error(`no range in ${text}`);
  return { lo: angleValue(match[1]), hi: angleValue(match[4]), loIn: match[2] === '\\le', hiIn: match[3] === '\\le' };
}

const displayOf = (slide: Slide): string => {
  const shown = 'prompt' in slide ? slide.prompt.find((block) => block.kind === 'display') : undefined;
  if (!shown || shown.kind !== 'display') throw new Error('nothing displayed');
  return shown.tex;
};

/** The typed answer as degrees, or as a count. */
function typed(slide: Slide): number {
  if (slide.kind !== 'expression') throw new Error('expected expression');
  const value = math.evaluate(slide.answer) as number;
  return slide.lead === 'x =' && /pi/.test(slide.answer) ? round6((value * 180) / Math.PI) : round6(value);
}

/** What a range question asks, read off its prose, checked against the solutions a scan finds. */
function holdsAsk(slide: Slide, found: number[], where: string): void {
  const text = proseOf(slide);
  expect(found.length, `${where}: nothing in range`).toBeGreaterThan(0);
  const expected = /How many/.test(text) ? found.length : /largest/.test(text) ? found[found.length - 1] : found[0];
  expect(typed(slide), where).toBe(expected);
}

/** Tiles: the answer's families are the equation's solutions; no other placement's are. */
function generalTilesHold(slide: Slide, where: string): void {
  if (slide.kind !== 'tiles') throw new Error('expected tiles');
  const right = scanRange(displayOf(slide));
  const fill = (tokens: string[]) => slide.template.replace(/\{(\d)\}/g, (_, i: string) => tokens[Number(i)]);
  expect(familyValues(fill(slide.answer)), `${where}: ${fill(slide.answer)}`).toEqual(right);
  const key = (tokens: string[]) => (slide.unordered ? [...tokens].sort() : tokens).join('|');
  for (const tokens of placements(slide.bank, slide.answer.length)) {
    if (key(tokens) === key(slide.answer)) continue;
    expect(familyValues(fill(tokens)), `${where}: ${fill(tokens)} is right but marked wrong`).not.toEqual(right);
  }
}

describe.each([['tid-general-sincos-tiles'], ['tid-general-tan-tiles']])('%s', (id) => {
  it('places the families a scan finds, and no other placement finds them', () => {
    for (const { slide, where } of slides(id)) generalTilesHold(slide, where);
  });
});

describe('tid-general-partner-flow', () => {
  it('names the principal value a calculator gives, then the families a scan finds', () => {
    for (const { slide, where } of slides('tid-general-partner-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const right = scanRange(slide.subject);
      const fn = /\\(sin|cos|tan)/.exec(slide.subject)?.[1];
      const [lo, hi] = fn === 'cos' ? [0, 180] : [-90, 90];
      const principal = right.filter((x) => x >= lo && x <= hi);
      expect(principal.length, `${where}: one principal value`).toBe(1);
      for (const branch of slide.steps[0].branches) {
        const angle = angleValue(inline(branch.label)[0].replace(/^x = /, ''));
        expect(angle === principal[0], `${where}: ${branch.label}`).toBe(branch.label === slide.answer[0]);
      }
      for (const branch of slide.steps[1].branches) {
        const same7 = sameList7(familyValues(inline(branch.label)[0]), right);
        expect(same7, `${where}: ${branch.label}`).toBe(branch.label === slide.answer[1]);
      }
    }
  });
});

describe('tid-general-in-range', () => {
  it('shows the families a scan finds, and answers from the ones in range', () => {
    for (const { slide, where } of slides('tid-general-in-range')) {
      const text = proseOf(slide);
      const equation = inline(text)[0];
      expect(familyValues(displayOf(slide)), `${where}: ${displayOf(slide)}`).toEqual(scanRange(equation));
      const r = range7(text);
      const inRange = familyValues(displayOf(slide), r);
      expect(inRange, where).toEqual(scanRange(equation, r));
      holdsAsk(slide, inRange, where);
    }
  });
});

describe('tid-general-values-table', () => {
  it('fills each cell with its family at its n, every one a solution', () => {
    for (const { slide, where } of slides('tid-general-values-table')) {
      if (slide.kind !== 'table') throw new Error('expected table');
      const equation = inline(proseOf(slide))[0];
      const f = differenceAt(radiansIn(equation));
      const headers = slide.columns.slice(1);
      expect(familyValues(`x = ${headers.join(' \\text{ or } ')}`), where).toEqual(scanRange(equation));
      const blanks = [...slide.answer];
      for (const row of slide.rows) {
        const n = Number(row[0]);
        row.slice(1).forEach((cell, i) => {
          const value = angleValue(cell ?? (blanks.shift() as string));
          expect(value, `${where}: n = ${n} in ${headers[i]}`).toBe(round6(math.evaluate(degreesExpr(headers[i]), { n }) as number));
          expect(Math.abs(f(value)), `${where}: ${value} does not solve it`).toBeLessThan(1e-9);
        });
      }
    }
  });
});

describe('tid-general-radian-choice', () => {
  it('offers one option naming the solutions a scan finds, and three that do not', () => {
    for (const { slide, where } of slides('tid-general-radian-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const right = scanRange(displayOf(slide));
      for (const option of slide.options) {
        expect(option.label, where).toContain('\\pi');
        expect(sameList7(familyValues(option.label), right), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

describe('tid-general-radian-steps', () => {
  it('keeps every line to the solutions it started with, and every slip off them', () => {
    for (const { slide, where } of slides('tid-general-radian-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const start = slide.start.join(' ');
      const right = scanRange(start);
      for (const step of slide.reductions) {
        const general = step.value.startsWith('x = ');
        expect(general ? familyValues(step.value) : scanRange(step.value), `${where}: ${step.value}`).toEqual(right);
        for (const offered of step.bank.filter((b) => b !== step.value)) {
          const same7 = general ? sameList7(familyValues(offered), right) : sameRoots(offered, start);
          expect(same7, `${where}: slip ${offered}`).toBe(false);
        }
      }
      expect(slide.reductions[slide.reductions.length - 1].value, where).toContain('\\pi');
    }
  });
});

describe('tid-general-bracket-families-tree', () => {
  it('fills the bracket\'s families and the x each gives, and offers no spare that is right', () => {
    for (const { slide, where } of slides('tid-general-bracket-families-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [, fn, arg, rhs] = /^\\(sin|cos) \(?(.+?)\)? = (.+)$/.exec(slide.expression) ?? [];
      const bracket = scanRange(`\\${fn} x = ${rhs}`);
      const [u1, u2, x1, x2] = slide.answer;
      expect([...new Set([...familyValues(`x = ${u1}`), ...familyValues(`x = ${u2}`)])].sort((a, b) => a - b), `${where}: bracket`).toEqual(bracket);
      const principal = bracket.find((u) => (fn === 'cos' ? u >= 0 && u <= 180 : u >= -90 && u <= 90));
      expect(familyValues(`x = ${u1}`), `${where}: the principal value first`).toContain(principal);
      for (const [u, x] of [
        [u1, x1],
        [u2, x2],
      ]) {
        expect(lineValues(`${arg} = ${u}`), `${where}: ${x} from ${u}`).toEqual(familyValues(`x = ${x}`));
      }
      const xs = [...new Set([...familyValues(`x = ${x1}`), ...familyValues(`x = ${x2}`)])].sort((a, b) => a - b);
      expect(xs, `${where}: x`).toEqual(scanRange(slide.expression));
      const answers = slide.answer.map((a) => familyValues(`x = ${a}`));
      for (const spare of slide.bank.filter((b) => !slide.answer.includes(b))) {
        const values = familyValues(`x = ${spare}`);
        expect(answers.some((a) => sameList7(a, values)), `${where}: spare ${spare} is right`).toBe(false);
      }
    }
  });
});

describe.each([['tid-general-bracket-count'], ['tid-general-harder-angle']])('%s', (id) => {
  it('answers from a scan of the stated range', () => {
    for (const { slide, where } of slides(id)) holdsAsk(slide, scanRange(displayOf(slide), range7(proseOf(slide))), where);
  });
});

describe('tid-general-bracket-divide-steps', () => {
  it('starts from a family of the bracket, keeps every line to it, and ends on x', () => {
    for (const { slide, where } of slides('tid-general-bracket-divide-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const equation = inline(proseOf(slide))[0];
      const all = scanRange(equation);
      const right = lineValues(slide.start.join(' '));
      expect(right.every((x) => all.includes(x)) && right.length > 0, `${where}: ${slide.start.join(' ')} is not a family of ${equation}`).toBe(true);
      for (const step of slide.reductions) {
        expect(lineValues(step.value), `${where}: ${step.value}`).toEqual(right);
        for (const offered of step.bank.filter((b) => b !== step.value)) {
          expect(lineValues(offered), `${where}: slip ${offered}`).not.toEqual(right);
        }
      }
      expect(slide.reductions[slide.reductions.length - 1].value, where).toMatch(/^x = /);
    }
  });
});

/** Every `$x = ...$` in a label, together. */
const labelValues = (label: string): number[] =>
  [...new Set(inline(label).flatMap((tex) => familyValues(tex)))].sort((a, b) => a - b);

describe('tid-general-factor-flow', () => {
  it('rewrites to an equation with the same solutions, then names every one of them', () => {
    for (const { slide, where } of slides('tid-general-factor-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const right = scanRange(slide.subject);
      for (const branch of slide.steps[0].branches) {
        const same7 = sameRoots(inline(branch.label)[0], slide.subject);
        expect(same7, `${where}: ${branch.label}`).toBe(branch.label === slide.answer[0]);
      }
      for (const branch of slide.steps[1].branches) {
        expect(sameList7(labelValues(branch.label), right), `${where}: ${branch.label}`).toBe(branch.label === slide.answer[1]);
      }
    }
  });
});

/** Which route an equation wants, read off its shape. */
function routeOf(equation: string): string {
  if (/\^2/.test(equation)) return 'quadratic';
  if (/\\(sin|cos) \d+x/.test(equation)) return 'factor formula';
  if (/= -?[^=]*\\cos x$/.test(equation)) return 'tan x = k';
  return 'R\\sin';
}

describe('tid-general-route-flow', () => {
  it('picks the route the equation\'s shape calls for, and counts what a scan finds', () => {
    for (const { slide, where } of slides('tid-general-route-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      expect(slide.answer[0], `${where}: ${slide.subject}`).toContain(routeOf(slide.subject));
      const found = scanRange(slide.subject, range7(proseOf(slide)));
      expect(slide.answer[1], where).toBe(`$${found.length}$`);
    }
  });
});

describe('tid-general-lost-choice', () => {
  it('offers the solutions a scan finds for the equation but not for what dividing leaves', () => {
    for (const { slide, where } of slides('tid-general-lost-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const text = proseOf(slide);
      const after = inline(text)[1];
      const r = range7(text);
      const kept = scanRange(after, r);
      const lost = scanRange(displayOf(slide), r).filter((x) => !kept.includes(x));
      expect(lost.length, where).toBeGreaterThan(0);
      for (const option of slide.options) {
        const listed = option.label === '\\text{none}' ? [] : [...option.label.matchAll(/(-?\d+)\^\{\\circ\}/g)].map((m) => Number(m[1]));
        expect(sameList7(listed, lost), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

describe('worked solutions', () => {
  // The property sweep in generators.test.ts renders what a slide shows, not
  // what "Show me" shows, and a tiles line filled one blank at a time once
  // wrote the second answer into the first answer's \frac{1}.
  it('render every line of working without a KaTeX error', () => {
    const ids = Object.keys(registry).filter((id) => id.startsWith('tid-proof-'));
    expect(ids.length).toBe(20);
    for (const id of ids) {
      const generator = registry[id] as unknown as Generator<unknown>;
      for (const difficulty of [1, 2]) {
        for (let seed = 0; seed < SEEDS; seed++) {
          const where = `${id} seed ${seed} d${difficulty}`;
          const params = generator.sample(makeRng(seed), difficulty);
          for (const step of generator.solution(params)) {
            for (const tex of [...(step.tex ? [step.tex] : []), ...inline(step.text ?? '')]) {
              expect(() => katex.renderToString(tex, { throwOnError: true, strict: false }), `${where}: ${tex}`).not.toThrow();
            }
          }
        }
      }
    }
  });

  it('name the same missing line the tiles are graded on', () => {
    for (const id of PROOF_TILES) {
      const generator = registry[id] as unknown as Generator<unknown>;
      for (const difficulty of [1, 2]) {
        for (let seed = 0; seed < SEEDS; seed++) {
          const params = generator.sample(makeRng(seed), difficulty);
          const slide = generator.render(params);
          if (slide.kind !== 'tiles') throw new Error('expected tiles');
          const filled = slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]).replace(/^=\s*/, '');
          const named = inline(generator.solution(params)[0].text ?? '')[0];
          expect(named, `${id} seed ${seed} d${difficulty}`).toBe(filled);
        }
      }
    }
  });
});
