/**
 * An independent check on the mathematics behind Trig Identities level 4.
 *
 * The generic sweep in `generators.test.ts` proves a generator agrees with
 * itself. Nothing there knows that sin^2 15 degrees is (2 - sqrt 3)/4, or that
 * sin 3x = 3 sin x - 4 sin^3 x: tiles, steps, trees and native choices are
 * graded by exact tokens, so a wrong formula written consistently would pass.
 * Here every rewrite is turned back into mathjs and checked as an identity at
 * random angles, every exact value against a calculator, and every equation's
 * answer against the equation itself, reading only what the learner sees.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 150;
const DEGREE = Math.PI / 180;

function slides(id: string): { params: Record<string, unknown>; slide: Slide }[] {
  const g = registry[id] as Generator<Record<string, unknown>>;
  expect(g, `no generator ${id}`).toBeDefined();
  const out: { params: Record<string, unknown>; slide: Slide }[] = [];
  for (const difficulty of [1, 2]) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const params = g.sample(makeRng(seed), difficulty);
      out.push({ params, slide: g.render(params) });
    }
  }
  return out;
}

/** Index of the brace closing the one opened at `open`. */
function closing(tex: string, open: number): number {
  let depth = 0;
  for (let i = open; i < tex.length; i += 1) {
    if (tex[i] === '{') depth += 1;
    else if (tex[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`unbalanced braces in ${tex}`);
}

/** One argument after a command: a braced group or a single character. */
function argument(tex: string, at: number): [string, number] {
  let i = at;
  while (tex[i] === ' ') i += 1;
  if (tex[i] === '{') {
    const end = closing(tex, i);
    return [tex.slice(i + 1, end), end + 1];
  }
  if (tex[i] === '\\') {
    const m = /^\\[a-zA-Z]+/.exec(tex.slice(i))!;
    return [m[0], i + m[0].length];
  }
  return [tex[i], i + 1];
}

/**
 * The TeX this level writes, as mathjs reads it: fractions, roots, degrees,
 * pi, and sin, cos, tan and cot of an angle with an optional power.
 */
function toMath(tex: string): string {
  let s = tex
    .replace(/\\left|\\right/g, '')
    .replace(/\\,|\\;/g, ' ')
    .replace(/\\div/g, '/')
    .replace(/\\times/g, '*')
    .replace(/\^\{\\circ\}/g, ' deg')
    .replace(/\\theta/g, 'theta')
    .replace(/\\pi/g, 'pi');
  // Fractions and roots, innermost first by rescanning.
  for (;;) {
    const m = /\\(d|t)?frac|\\sqrt/.exec(s);
    if (!m) break;
    if (m[0] === '\\sqrt') {
      const [a, end] = argument(s, m.index + m[0].length);
      s = `${s.slice(0, m.index)} sqrt(${a}) ${s.slice(end)}`;
    } else {
      const [a, mid] = argument(s, m.index + m[0].length);
      const [b, end] = argument(s, mid);
      s = `${s.slice(0, m.index)} ((${a})/(${b})) ${s.slice(end)}`;
    }
  }
  // A function, an optional power, then its angle: a bracketed group, or a
  // coefficient and a letter, or a number of degrees.
  s = s.replace(
    /\\(sin|cos|tan|cot)(?:\^(\d))?\s*(\(\([^()]*\)\/\([^()]*\)\)|\d*\.?\d*\s*deg|\d*(?:theta|[xAtB]))/g,
    (_m, fn: string, power: string | undefined, arg: string) => ` ${fn}(${arg.replace(/\s/g, '')})${power ? `^${power}` : ''} `,
  );
  return s.replace(/\)\s*\(/g, ') * (').replace(/(\d)\s*\(/g, '$1 * (');
}

/** A display `fitted` stacked for a phone, back on one line. */
const unfit = (tex: string): string =>
  tex
    .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
    .replace(/\\\\/g, ' ')
    .replace(/\\quad \{\}/g, ' ')
    .replace(/&/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const valueOf = (tex: string, scope: Record<string, number> = {}): number => {
  const v = math.evaluate(toMath(tex), { ...scope });
  return typeof v === 'number' ? v : Number(v.toNumber?.('rad') ?? v);
};

/** Does `a = b` hold at a spread of angles? */
function identity(a: string, b: string): boolean {
  const rng = makeRng(7);
  for (let i = 0; i < 12; i += 1) {
    const scope = {
      x: 0.1 + rng.next() * 1.3,
      theta: 0.1 + rng.next() * 1.3,
      A: 0.1 + rng.next() * 1.3,
      B: 0.1 + rng.next() * 1.3,
      t: 0.1 + rng.next() * 1.3,
    };
    const va = valueOf(a, scope);
    const vb = valueOf(b, scope);
    if (!Number.isFinite(va) || !Number.isFinite(vb) || Math.abs(va - vb) > 1e-9 * (1 + Math.abs(va))) return false;
  }
  return true;
}

const filled = (template: string, answer: string[]): string =>
  answer.reduce((line, token, i) => line.replace(`{${i}}`, token), template);

const sides = (line: string): [string, string] => {
  const at = line.indexOf(' = ');
  return [line.slice(0, at), line.slice(at + 3)];
};

describe('a toMath sanity check', () => {
  it('reads what this level writes', () => {
    expect(valueOf('\\tfrac12\\sqrt{2 - \\sqrt{3}}')).toBeCloseTo(Math.sin(15 * DEGREE), 12);
    expect(valueOf('\\sin^2 \\tfrac{x}2', { x: 1 })).toBeCloseTo(Math.sin(0.5) ** 2, 12);
    expect(valueOf('\\tan 22.5^{\\circ}')).toBeCloseTo(Math.SQRT2 - 1, 12);
    expect(valueOf('4\\cos^3 2\\theta - 3\\cos 2\\theta', { theta: 0.3 })).toBeCloseTo(Math.cos(1.8), 12);
    expect(identity('\\sin 3x', '3\\sin x - 4\\sin^3 x')).toBe(true);
    expect(identity('\\sin 3x', '3\\sin x + 4\\sin^3 x')).toBe(false);
  });
});

describe('every rewrite this level asks for is a true identity', () => {
  it.each(['tid-half-tiles', 'tid-triple-tiles'])('%s', (id) => {
    for (const { slide } of slides(id)) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const [lhs, rhs] = sides(filled(slide.template, slide.answer));
      expect(identity(lhs, rhs), `${lhs} = ${rhs}`).toBe(true);
    }
  });

  it.each(['tid-half-simplify-steps', 'tid-triple-steps'])('%s, at every line', (id) => {
    for (const { slide } of slides(id)) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const opening = slide.start.join(' ');
      // The triple-angle working starts from an expansion of what the prose names.
      const named = /^Write \$([^$]*)\$/.exec((slide.prompt[0] as { text: string }).text);
      const target = named ? named[1] : opening;
      expect(identity(target, opening), `${target} = ${opening}`).toBe(true);
      let line = [...slide.start];
      for (const r of slide.reductions) {
        line = [...line.slice(0, r.span[0]), r.value, ...line.slice(r.span[1])];
        expect(identity(target, line.join(' ')), `${target} = ${line.join(' ')}`).toBe(true);
        for (const slip of r.bank.filter((b) => b !== r.value)) {
          const wrong = [...line];
          wrong[r.span[0]] = slip;
          expect(identity(target, wrong.join(' ')), `slip ${slip} is also right`).toBe(false);
        }
      }
    }
  });

  it('tid-half-rewrite-flow', () => {
    for (const { slide } of slides('tid-half-rewrite-flow')) {
      if (slide.kind !== 'flow') throw new Error('not flow');
      const right = slide.answer[1].slice(1, -1);
      expect(identity(slide.subject, right), `${slide.subject} = ${right}`).toBe(true);
      for (const branch of slide.steps[1].branches) {
        if (branch.label === slide.answer[1]) continue;
        expect(identity(slide.subject, branch.label.slice(1, -1)), `slip ${branch.label}`).toBe(false);
      }
      const formula = slide.answer[0].slice(1, -1);
      expect(identity(...sides(formula)), formula).toBe(true);
    }
  });

  it('tid-triple-choice', () => {
    for (const { slide } of slides('tid-triple-choice')) {
      if (slide.kind !== 'choice') throw new Error('not choice');
      const expr = (slide.prompt[1] as { tex: string }).tex;
      for (const option of slide.options) {
        expect(identity(expr, option.label), `${expr} = ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

/** The half-table angles, read off what the learner is shown. */
function angleIn(tex: string): number {
  const deg = /(\d+(?:\.\d+)?)\^\{\\circ\}/.exec(tex);
  if (deg) return Number(deg[1]);
  const rad = /\\theta = ([^$]*)\$/.exec(tex) ?? /\\(?:sin|cos|tan) ((?:\\frac\{\d*\\pi\}\{\d+\})|\\pi)/.exec(tex);
  return (valueOf(rad![1]) * 180) / Math.PI;
}

const EXACT: Record<string, (d: number) => number> = {
  '\\sin^2': (d) => Math.sin(d * DEGREE) ** 2,
  '\\cos^2': (d) => Math.cos(d * DEGREE) ** 2,
  '\\sin': (d) => Math.sin(d * DEGREE),
  '\\cos': (d) => Math.cos(d * DEGREE),
  '\\tan': (d) => Math.tan(d * DEGREE),
};

describe('every exact value is the calculator value', () => {
  it('tid-half-exact-tiles', () => {
    for (const { slide } of slides('tid-half-exact-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const [lhs, rhs] = sides(filled(slide.template, slide.answer));
      const prose = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
      const d = lhs.includes('\\theta') ? angleIn(prose) : angleIn(lhs);
      const fn = /^\\(sin|cos|tan)(\^2)?/.exec(lhs)![0];
      expect(valueOf(rhs), `${lhs} = ${rhs}`).toBeCloseTo(EXACT[fn](d), 12);
    }
  });

  it('tid-half-exact-choice', () => {
    for (const { slide } of slides('tid-half-exact-choice')) {
      if (slide.kind !== 'choice') throw new Error('not choice');
      const prose = (slide.prompt[0] as { text: string }).text;
      const fn = /\\(sin|cos|tan)/.exec(prose)![0];
      if (slide.prompt.length > 1) {
        const value = valueOf((slide.prompt[1] as { tex: string }).tex);
        for (const option of slide.options) {
          const at = EXACT[fn](angleIn(`${option.label.includes('pi') ? `\\theta = ${option.label}$` : option.label}`));
          expect(Math.abs(at - value) < 1e-9, `${fn} ${option.label}`).toBe(option.id === slide.correctId);
        }
      } else {
        const truth = EXACT[fn](angleIn(prose.includes('circ') ? prose : `\\theta = ${/\$\\[a-z]+ (.*)\$/.exec(prose)![1]}$`));
        for (const option of slide.options) {
          expect(Math.abs(valueOf(option.label) - truth) < 1e-9, `${prose} ${option.label}`).toBe(option.id === slide.correctId);
        }
      }
    }
  });

  it('tid-half-exact-steps, from the substitution on', () => {
    for (const { slide } of slides('tid-half-exact-steps')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const start = slide.start[0];
      const fn = /^\\(sin|cos|tan)(\^2)?/.exec(start)![0];
      const truth = EXACT[fn](angleIn(start.includes('circ') ? start : `\\theta = ${start.replace(/^\\[a-z]+(\^2)? /, '')}$`));
      for (const r of slide.reductions.slice(1)) {
        expect(valueOf(r.value), `${start} = ${r.value}`).toBeCloseTo(truth, 12);
        for (const slip of r.bank.filter((b) => b !== r.value)) {
          expect(Math.abs(valueOf(slip) - truth) > 1e-9, `slip ${slip} is also right`).toBe(true);
        }
      }
    }
  });

  it('tid-half-surd-tree', () => {
    for (const { slide } of slides('tid-half-surd-tree')) {
      if (slide.kind !== 'tree') throw new Error('not tree');
      const [lhs, rhs] = sides(unfit(slide.expression));
      const fn = /^\\(sin|cos|tan)(\^2)?/.exec(lhs)![0];
      const angle = lhs.replace(/^\\[a-z]+(\^2)? /, '');
      const d = angle.includes('circ') ? angleIn(angle) : angleIn(`\\theta = ${angle}$`);
      const last = slide.answer[slide.answer.length - 1];
      const want = fn === '\\sin^2' ? Math.sin(d * DEGREE) : fn === '\\cos^2' ? Math.cos(d * DEGREE) : EXACT[fn](d);
      expect(valueOf(last), `${lhs} ${last}`).toBeCloseTo(want, 12);
      // The top row is the table, and every node is the formula's own number.
      expect(identity(lhs, rhs)).toBe(true);
    }
  });
});

/** cos x = p/q and the range x lies in, read off the prompt. */
function readCos(text: string): { x: number; v: string } {
  const c = /\\cos (x|\\theta|A|B) = (-?)\\frac\{(\d+)\}\{(\d+)\}/.exec(text)!;
  const r = /(-?\d+)\^\{\\circ\} < (?:x|\\theta|A|B) < (-?\d+)\^\{\\circ\}/.exec(text)!;
  const value = (c[2] ? -1 : 1) * (Number(c[3]) / Number(c[4]));
  const lo = Number(r[1]);
  const a = Math.acos(value) / DEGREE;
  const candidates = [a, -a, 360 - a, 360 + a, 720 - a, a - 360];
  const x = candidates.find((d) => d > lo && d < Number(r[2]))!;
  return { x, v: c[1] };
}

const fraction = (tex: string): number => valueOf(tex.replace(/\$/g, ''));

describe('every half-angle value belongs to the angle the prompt describes', () => {
  it('tid-half-value', () => {
    for (const { slide } of slides('tid-half-value')) {
      if (slide.kind !== 'expression') throw new Error('not expression');
      const { x } = readCos((slide.prompt[0] as { text: string }).text);
      const fn = /\\(sin|cos|tan)/.exec(slide.lead!)![0];
      expect(Number(math.evaluate(slide.answer)), slide.lead).toBeCloseTo(EXACT[fn](x / 2), 12);
    }
  });

  it('tid-half-square-tree', () => {
    for (const { slide } of slides('tid-half-square-tree')) {
      if (slide.kind !== 'tree') throw new Error('not tree');
      const { x } = readCos((slide.prompt[0] as { text: string }).text);
      const h = (x / 2) * DEGREE;
      const want = [Math.sin(h) ** 2, Math.cos(h) ** 2, Math.sin(h), Math.cos(h), Math.tan(h)];
      slide.answer.forEach((tex, i) => expect(fraction(tex)).toBeCloseTo(want[i], 12));
    }
  });

  it('tid-half-root-steps', () => {
    for (const { slide } of slides('tid-half-root-steps')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const { x } = readCos((slide.prompt[0] as { text: string }).text);
      const fn = /\\(sin|cos)/.exec(slide.start[0])![0];
      const last = slide.reductions[slide.reductions.length - 1];
      expect(fraction(last.value)).toBeCloseTo(EXACT[fn](x / 2), 12);
    }
  });

  it('tid-half-sign-flow', () => {
    for (const { slide } of slides('tid-half-sign-flow')) {
      if (slide.kind !== 'flow') throw new Error('not flow');
      const { x } = readCos(`${slide.subject} ${(slide.prompt[0] as { text: string }).text}`);
      const fn = /\\(sin|cos|tan)/.exec((slide.prompt[0] as { text: string }).text.split('find')[1])![0];
      expect(fraction(slide.answer[1])).toBeCloseTo(EXACT[fn](x / 2), 12);
      const [lo, hi] = [...slide.answer[0].matchAll(/(-?\d+)\^\{\\circ\}/g)].map((m) => Number(m[1]));
      expect(x / 2 > lo && x / 2 < hi).toBe(true);
    }
  });

  it('tid-half-sign-choice', () => {
    for (const { slide } of slides('tid-half-sign-choice')) {
      if (slide.kind !== 'choice') throw new Error('not choice');
      const text = (slide.prompt[0] as { text: string }).text;
      const r = /(-?\d+)\^\{\\circ\} < (x|\\theta|A|B) < (-?\d+)\^\{\\circ\}/.exec(text)!;
      const fn = /which is \$\\(sin|cos|tan)/.exec(text)![1];
      const v = r[2] === '\\theta' ? 'theta' : r[2];
      const [lo, hi] = [Number(r[1]), Number(r[3])];
      for (const x of [0.13, 0.37, 0.81].map((f) => lo + f * (hi - lo))) {
        const truth = EXACT[`\\${fn}`](x / 2);
        for (const option of slide.options) {
          const got = valueOf(option.label, { [v]: x * DEGREE });
          expect(Math.abs(got - truth) < 1e-9, `${text} ${option.label} at ${x}`).toBe(option.id === slide.correctId);
        }
      }
    }
  });
});

describe('every triple-angle value is sin 3x or cos 3x', () => {
  it('tid-triple-value', () => {
    for (const { slide } of slides('tid-triple-value')) {
      if (slide.kind !== 'expression') throw new Error('not expression');
      const text = (slide.prompt[0] as { text: string }).text;
      const g = /\\(sin|cos) (x|\\theta|A) = (-?)\\frac\{(\d+)\}\{(\d+)\}/.exec(text)!;
      const value = (g[3] ? -1 : 1) * (Number(g[4]) / Number(g[5]));
      const q = text.includes('acute') ? [0, 90] : /(\d+)\^\{\\circ\} < .* < (\d+)\^\{\\circ\}/.exec(text)!.slice(1).map(Number);
      const base = g[1] === 'sin' ? Math.asin(value) / DEGREE : Math.acos(value) / DEGREE;
      const x = [base, 180 - base, 360 - base, 360 + base, -base].find((d) => d > q[0] && d < q[1])!;
      const fn = /\\(sin|cos)/.exec(slide.lead!)![0];
      expect(Number(math.evaluate(slide.answer))).toBeCloseTo(EXACT[fn](3 * x), 12);
    }
  });
});

/** An equation in x/2 or 3x, read off its TeX, as a test at any x in degrees. */
function equation(tex: string): { holds: (x: number) => boolean; letter: string } {
  const m = /^\\(sin|cos|tan) (\\tfrac\{(x|\\theta)\}2|3(x|\\theta)) = (.*)$/.exec(tex)!;
  const f = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[m[1] as 'sin' | 'cos' | 'tan'];
  const half = m[2].startsWith('\\tfrac');
  const k = valueOf(m[5]);
  return {
    holds: (x) => {
      const u = half ? x / 2 : 3 * x;
      if (m[1] === 'tan' && Math.abs(((u % 180) + 180) % 180 - 90) < 1e-9) return false;
      return Math.abs(f(u * DEGREE) - k) < 1e-9;
    },
    letter: m[3] ?? m[4],
  };
}

/** Every solution with lo <= x < top, found by brute force on a half-degree comb. */
const solve = (holds: (x: number) => boolean, top: number): number[] =>
  Array.from({ length: top * 2 }, (_, i) => i / 2).filter(holds);

const topOf = (text: string): number => Number(/\\le (?:x|\\theta) < (\d+)\^\{\\circ\}/.exec(text)![1]);

describe('every equation in x/2 or 3x is answered by its own solutions', () => {
  it('tid-multi-eq-flow counts them', () => {
    for (const { slide } of slides('tid-multi-eq-flow')) {
      if (slide.kind !== 'flow') throw new Error('not flow');
      const { holds } = equation(slide.subject);
      const top = topOf((slide.prompt[0] as { text: string }).text);
      expect(`$${solve(holds, top).length}$`, slide.subject).toBe(slide.answer[1]);
    }
  });

  it('tid-multi-eq-slider slides to one', () => {
    for (const { slide } of slides('tid-multi-eq-slider')) {
      if (slide.kind !== 'slider') throw new Error('not slider');
      const tex = (slide.prompt[1] as { tex: string }).tex;
      const all = solve(equation(tex).holds, 360).filter((x) => x > 0);
      const text = (slide.prompt[0] as { text: string }).text;
      // "smallest", "second largest", "third smallest": a place counted in from one end.
      const inward = text.includes('third') ? 2 : text.includes('second') ? 1 : 0;
      const want = text.includes('largest') ? all[all.length - 1 - inward] : all[inward];
      expect(slide.answer, `${tex}: ${text}`).toBe(want);
      expect(slide.answer, 'the handle rests at 180').not.toBe(180);
      if (!text.includes('the solution')) expect(all.length).toBeGreaterThan(1);
      else expect(all.length).toBe(1);
      expect(slide.answer % 30 === 0 || slide.answer % 45 === 0).toBe(true);
    }
  });

  it('tid-multi-eq-steps ends on all of them', () => {
    for (const { slide } of slides('tid-multi-eq-steps')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const { holds } = equation(slide.start.join(' '));
      const top = topOf((slide.prompt[0] as { text: string }).text);
      const last = slide.reductions[slide.reductions.length - 1].value;
      const listed = [...last.matchAll(/(\d+(?:\.\d+)?)\^\{\\circ\}/g)].map((m) => Number(m[1]));
      expect(listed, last).toEqual(solve(holds, top));
    }
  });

  it('tid-multi-eq-angle types one', () => {
    for (const { slide } of slides('tid-multi-eq-angle')) {
      if (slide.kind !== 'expression') throw new Error('not expression');
      const tex = (slide.prompt[1] as { tex: string }).tex;
      const text = (slide.prompt[0] as { text: string }).text;
      const all = solve(equation(tex).holds, 360);
      const radians = text.includes('radians');
      const got = Number(math.evaluate(slide.answer)) * (radians ? 180 / Math.PI : 1);
      const want = text.includes('largest') ? all[all.length - 1] : all[0];
      expect(got, `${tex}: ${text}`).toBeCloseTo(want, 9);
      if (text.includes('the solution')) expect(all.length).toBe(1);
      expect(want % 30 === 0 || want % 45 === 0).toBe(true);
    }
  });
});
