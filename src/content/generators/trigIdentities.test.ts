/**
 * An independent check on the proving-identities generators (level 5).
 *
 * The property tests in `generators.test.ts` prove each generator agrees with
 * itself, and the oracle there skips every one of these. So these read what
 * the learner is shown — the claim in the prompt, each line of working, each
 * tile, option and step — turn the TeX into mathjs, and evaluate it at angles
 * off the poles. Every line a proof offers as right must equal the side it
 * started from; every slip, spare tile and distractor must not. A line that
 * is written wrongly fails here even when the generator is consistent with
 * itself.
 */
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
    .replace(/\\(sin|cos|tan|sec|csc|cot)(?:\^(\d))?\s*(\d*)\s*x/g, (_m, fn: string, power: string | undefined, k: string) => {
      const call = `${fn}(${k ? `${k}*` : ''}x)`;
      return power ? `(${call})^${power}` : call;
    })
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
  let v: unknown;
  try {
    v = math.evaluate(toMath(tex), { x });
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
  return block.tex
    .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
    .split('\\\\')
    .map((row) => row.replace(/&/g, '').trim().replace(/^=\s*/, '').trim());
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
