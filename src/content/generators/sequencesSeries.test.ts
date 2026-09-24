/**
 * Sequences & Series, level 3: every claim about where a sequence goes,
 * checked against the rule on the slide.
 *
 * The generic sweep in `generators.test.ts` proves each question agrees with
 * itself: a table's bank holds its answer, a flow's answer reaches an outcome.
 * It would pass a limit that is not a fixed point, a table whose terms do not
 * follow the displayed rule, or a "converges" on a rule with |p| > 1. So each
 * rule is read back off the rendered TeX, turned into arithmetic by mathjs,
 * and iterated here — never through the generator's own helpers.
 */
import { compile } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import { valueOf } from '../expr';
import type { Block, Generator as SlideGenerator, Slide } from '../types';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

function draw(id: string, seed: number, difficulty: number): Slide {
  const g = registry[id] as unknown as SlideGenerator<unknown>;
  return g.render(g.sample(makeRng(seed), difficulty));
}

/** Every draw of one generator, both difficulties. */
function* draws(id: string): Generator<{ slide: Slide; seed: number; difficulty: number }> {
  for (const difficulty of DIFFICULTIES) {
    for (let seed = 0; seed < SEEDS; seed += 1) yield { slide: draw(id, seed, difficulty), seed, difficulty };
  }
}

/** The handful of TeX shapes these slides use, as mathjs reads them. */
function texToMath(tex: string): string {
  // Powers first, so a fraction's braces hold no inner braces.
  let out = tex.replace(/\^\{([^{}]*)\}/g, '^($1)');
  const frac = /\\frac\{([^{}]*)\}\{([^{}]*)\}/;
  while (frac.test(out)) out = out.replace(frac, '(($1)/($2))');
  return out
    .replace(/\\left|\\right/g, '')
    .replace(/\\times/g, '*')
    .replace(/[uv]_\{n\+1\}/g, 'y')
    .replace(/[uv]_n/g, 'x')
    // `n(n + 1)` is a product, not a call.
    .replace(/(?<![a-z\\])n\(/g, 'n*(');
}

function fn(tex: string): (scope: Record<string, number>) => number {
  const code = compile(texToMath(tex));
  return (scope) => Number(code.evaluate({ ...scope }));
}

/**
 * A rule shown over its starting value, `\begin{gathered} rule \\ u_1 = s \end{gathered}`,
 * read as the one-line `rule, \quad u_1 = s` the parsers below expect.
 */
function flat(tex: string): string {
  const stacked = tex.match(/^\\begin\{gathered\} (.*) \\\\ (.*) \\end\{gathered\}$/);
  return stacked ? `${stacked[1]}, \\quad ${stacked[2]}` : tex;
}

/** A first-order rule `u_{n+1} = …`, optionally followed by `, \quad u_1 = s`. */
function firstOrder(tex: string): { f: (x: number) => number; start?: number } {
  const match = flat(tex).match(/^[uv]_\{n\+1\} = (.*?)(?:, \\quad u_1 = (-?\d+))?$/);
  if (!match) throw new Error(`not a first-order rule: ${tex}`);
  const f = fn(match[1]);
  return { f: (x) => f({ x }), start: match[2] === undefined ? undefined : Number(match[2]) };
}

/** p and q of an affine rule, read off the rule itself. */
function pq(f: (x: number) => number): { p: number; q: number } {
  return { p: f(1) - f(0), q: f(0) };
}

function iterate(f: (x: number) => number, start: number, count: number): number[] {
  const out = [start];
  while (out.length < count) out.push(f(out[out.length - 1]));
  return out;
}

/** Any sequence display these slides show: a position rule, or a recurrence of order one or two. */
function sequenceOf(tex: string, count: number): number[] {
  const position = tex.match(/^u_n = (.*)$/);
  if (position) {
    const f = fn(position[1]);
    return Array.from({ length: count }, (_, i) => f({ n: i + 1 }));
  }
  const second = flat(tex).match(/^u_\{n\+2\} = (.*?), \\quad u_1 = (-?\d+), \\; u_2 = (-?\d+)$/);
  if (second) {
    const f = fn(second[1]);
    const out = [Number(second[2]), Number(second[3])];
    while (out.length < count) out.push(f({ x: out[out.length - 2], y: out[out.length - 1] }));
    return out;
  }
  const { f, start } = firstOrder(tex);
  return iterate(f, start!, count);
}

const displays = (blocks: Block[]) =>
  blocks.filter((block): block is Extract<Block, { kind: 'display' }> => block.kind === 'display').map((block) => block.tex);
const prose = (blocks: Block[]) =>
  blocks
    .filter((block): block is Extract<Block, { kind: 'prose' }> => block.kind === 'prose')
    .map((block) => block.text)
    .join(' ');

/** A number in a prompt: `L = 12`. */
function stated(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match) throw new Error(`nothing matching ${pattern} in ${text}`);
  return Number(match[1]);
}

type Table = Extract<Slide, { kind: 'table' }>;

function merged(slide: Table): string[][] {
  let next = 0;
  return slide.rows.map((row) => row.map((cell) => (cell === null ? slide.answer[next++] : cell)));
}

function choiceAnswer(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error(`expected a choice, got ${slide.kind}`);
  return slide.options.find((option) => option.id === slide.correctId)!.label;
}

/** Where a recurrence goes, by running it: converges, periodic or diverges. */
function fateByRunning(f: (x: number) => number, start: number): { kind: 'converges' | 'periodic' | 'diverges'; limit?: number } {
  const terms = iterate(f, start, 400);
  const last = terms[terms.length - 1];
  if (Math.abs(last - terms[terms.length - 2]) < 1e-9) return { kind: 'converges', limit: last };
  if (Math.abs(last - terms[terms.length - 3]) < 1e-9) return { kind: 'periodic' };
  return { kind: 'diverges' };
}

describe('lesson 1: increasing, decreasing, periodic', () => {
  it('seq-diff-tiles: the placed difference is u_{n+1} - u_n for every n', () => {
    for (const { slide, seed } of draws('seq-diff-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const u = sequenceOf(displays(slide.prompt)[0], 12);
      const filled = slide.answer.join(' ');
      const d = fn(filled);
      for (let n = 1; n < 12; n += 1) expect(d({ n }), `seed ${seed}: ${filled} at n = ${n}`).toBe(u[n] - u[n - 1]);
    }
  });

  it('seq-monotone-flow: the chosen difference is right, and so is its sign', () => {
    for (const { slide, seed } of draws('seq-monotone-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const u = sequenceOf(slide.subject, 61);
      const diffs = u.slice(1).map((t, i) => t - u[i]);
      const claimed = fn(slide.answer[0].replace(/^\$u_\{n\+1\} - u_n = /, '').replace(/\$$/, ''));
      diffs.slice(0, 20).forEach((d, i) => expect(claimed({ n: i + 1 }), `seed ${seed} n = ${i + 1}`).toBeCloseTo(d, 9));
      const sign = diffs.every((d) => d > 0) ? 'Always positive' : diffs.every((d) => d < 0) ? 'Always negative' : 'It changes sign';
      expect(slide.answer[1], `seed ${seed}: ${slide.subject}`).toBe(sign);
    }
  });

  it('seq-period-table: the column follows the rule and repeats', () => {
    for (const { slide, seed } of draws('seq-period-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const expected = sequenceOf(displays(slide.prompt)[0], slide.rows.length);
      expect(merged(slide).map((row) => Number(row[1])), `seed ${seed}`).toEqual(expected);
    }
  });

  it('seq-period: the answer is the true period, or the true far-off term', () => {
    for (const { slide, seed } of draws('seq-period')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const text = prose(slide.prompt);
      const terms = sequenceOf(displays(slide.prompt)[0], 200);
      const far = text.match(/Find \$u_\{(\d+)\}\$/);
      if (far) {
        expect(Number(choiceAnswer(slide)), `seed ${seed}`).toBe(terms[Number(far[1]) - 1]);
      } else {
        const period = [1, 2, 3, 4, 5, 6].find((p) => terms.every((t, i) => i + p >= terms.length || terms[i + p] === t));
        expect(Number(choiceAnswer(slide)), `seed ${seed}`).toBe(period);
      }
    }
  });
});

describe('lesson 2: the limit of a recurrence', () => {
  it('seq-limit-table: every term follows the displayed rule', () => {
    for (const { slide, seed } of draws('seq-limit-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const { f, start } = firstOrder(displays(slide.prompt)[0]);
      expect(merged(slide).map((row) => Number(row[1])), `seed ${seed}`).toEqual(iterate(f, start!, slide.rows.length));
      expect(Math.abs(pq(f).p), `seed ${seed}: the terms must settle`).toBeLessThan(1);
    }
  });

  it('seq-fixed-point-steps: 1 - p, then a fixed point the terms really reach', () => {
    for (const { slide, seed } of draws('seq-fixed-point-steps')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const rule = prose(slide.prompt).match(/The terms of \$(.*?)\$ settle/)![1];
      const { f } = firstOrder(rule);
      const { p } = pq(f);
      expect(fn(slide.reductions[0].value)({}), `seed ${seed}`).toBeCloseTo(1 - p, 9);
      const L = Number(slide.reductions[slide.reductions.length - 1].value);
      expect(f(L), `seed ${seed}: L = f(L)`).toBeCloseTo(L, 9);
      expect(fateByRunning(f, L + 7).limit!, `seed ${seed}`).toBeCloseTo(L, 6);
    }
  });

  it('seq-limit: the typed limit solves L = f(L), and the terms converge to it', () => {
    for (const { slide, seed } of draws('seq-limit')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const { f, start } = firstOrder(displays(slide.prompt)[0]);
      const L = Number(slide.answer);
      expect(f(L), `seed ${seed}: L = f(L)`).toBeCloseTo(L, 9);
      const run = fateByRunning(f, start!);
      expect(run.kind, `seed ${seed}`).toBe('converges');
      expect(run.limit!, `seed ${seed}`).toBeCloseTo(L, 6);
    }
  });

  it('seq-limit-back-tree: q makes L a fixed point, and u_2 follows', () => {
    for (const { slide, seed } of draws('seq-limit-back-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const L = stated(prose(slide.prompt), /converges to \$L = (-?\d+)\$/);
      const [, rhs, first] = flat(slide.expression).match(/^u_\{n\+1\} = (.*) \+ q, \\quad u_1 = (-?\d+)$/)!;
      const times = fn(rhs);
      const p = times({ x: 1 });
      const [pL, q, pu, next] = slide.answer.map(Number);
      expect(pL, `seed ${seed}`).toBeCloseTo(p * L, 9);
      expect(p * L + q, `seed ${seed}: L = pL + q`).toBeCloseTo(L, 9);
      expect(pu, `seed ${seed}`).toBeCloseTo(p * Number(first), 9);
      expect(next, `seed ${seed}`).toBeCloseTo(p * Number(first) + q, 9);
      expect(Math.abs(p)).toBeLessThan(1);
    }
  });
});

describe('lesson 3: converge, oscillate or diverge', () => {
  it('seq-fate-flow: the path matches p and what the terms actually do', () => {
    for (const { slide, seed } of draws('seq-fate-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const { f, start } = firstOrder(slide.subject);
      const { p } = pq(f);
      const run = fateByRunning(f, start!);
      const size = Math.abs(Math.abs(p) - 1) < 1e-9 ? '$|p| = 1$' : Math.abs(p) < 1 ? '$|p| < 1$' : '$|p| > 1$';
      expect(slide.answer[0], `seed ${seed}: ${slide.subject}`).toBe(size);
      if (size === '$|p| < 1$') expect(run.kind).toBe('converges');
      else if (Math.abs(p + 1) < 1e-9) expect(run.kind).toBe('periodic');
      else expect(run.kind).toBe('diverges');
      if (size !== '$|p| = 1$') expect(slide.answer[1]).toBe(p > 0 ? 'Positive' : 'Negative');
      else expect(slide.answer[1]).toBe(p > 0 ? '$p = 1$' : '$p = -1$');
    }
  });

  it('seq-fate-slider: the answer is where the terms settle, and every dot is on the figure', () => {
    for (const { slide, seed } of draws('seq-fate-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const text = prose(slide.prompt);
      const [, rule, first] = text.match(/terms of \$(.*?)\$, from \$u_1 = (-?\d+)\$/)!;
      const { f } = firstOrder(rule);
      const run = fateByRunning(f, Number(first));
      expect(run.kind, `seed ${seed}`).toBe('converges');
      expect(run.limit!, `seed ${seed}`).toBeCloseTo(slide.answer, 6);
      for (const t of iterate(f, Number(first), 8)) {
        expect(t, `seed ${seed}`).toBeGreaterThan(slide.min);
        expect(t, `seed ${seed}`).toBeLessThan(slide.max);
      }
    }
  });

  it('seq-fate: the right option says what the terms do', () => {
    for (const { slide, seed } of draws('seq-fate')) {
      const tex = displays(slide.kind === 'choice' ? slide.prompt : [])[0];
      const { f, start } = firstOrder(tex);
      const run = fateByRunning(f, start!);
      const right = choiceAnswer(slide);
      if (run.kind === 'converges') expect(right, `seed ${seed}`).toBe(`\\text{Converges to } ${Math.round(run.limit!)}`);
      else if (run.kind === 'periodic') expect(right, `seed ${seed}`).toBe('\\text{Periodic, period } 2');
      else expect(right, `seed ${seed}: ${tex}`).toBe('\\text{Diverges}');
    }
  });

  it('seq-fate-table: both columns follow their rules, share the fixed point, and only u settles', () => {
    for (const { slide, seed } of draws('seq-fate-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const L = stated(prose(slide.prompt), /fixed point \$L = (-?\d+)\$/);
      const [uRule, vRule] = displays(slide.prompt)[0]
        .replace(/\\begin\{gathered\} | \\end\{gathered\}/g, '')
        .split(' \\\\ ')
        .map((rule) => firstOrder(rule).f);
      const table = merged(slide);
      const first = Number(table[0][1]);
      expect(table.map((row) => Number(row[1])), `seed ${seed}`).toEqual(iterate(uRule, first, table.length));
      expect(table.map((row) => Number(row[2])), `seed ${seed}`).toEqual(iterate(vRule, first, table.length));
      expect(uRule(L)).toBeCloseTo(L, 9);
      expect(vRule(L)).toBeCloseTo(L, 9);
      expect(fateByRunning(uRule, first).kind).toBe('converges');
      expect(fateByRunning(vRule, first).kind).not.toBe('converges');
    }
  });
});

describe('lesson 4: limits of position-to-term rules', () => {
  const at = (tex: string, n: number) => fn(tex)({ n });

  it('seq-divide-steps: the last value is where u_n goes', () => {
    for (const { slide, seed } of draws('seq-divide-steps')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const rule = prose(slide.prompt).match(/\$u_n = (.*?)\$\. Dividing/)![1];
      const limit = fn(slide.reductions[slide.reductions.length - 1].value)({});
      expect(at(rule, 1e7), `seed ${seed}: ${rule}`).toBeCloseTo(limit, 4);
    }
  });

  it('seq-pos-limit: the typed limit is where u_n goes', () => {
    for (const { slide, seed } of draws('seq-pos-limit')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const rule = prose(slide.prompt).match(/\$u_n = (.*)\$ as/)![1];
      expect(at(rule, 1e7), `seed ${seed}: ${rule}`).toBeCloseTo(Number(compile(slide.answer).evaluate()), 4);
    }
  });

  it('seq-pos-converge: exactly the right option behaves as asked', () => {
    const settles = (tex: string) => {
      const [x, y, z] = [1e6, 1e6 + 1, 2e6].map((n) => at(tex, n));
      return Math.abs(x - y) < 1e-3 && Math.abs(x - z) < 1e-3;
    };
    for (const { slide, seed } of draws('seq-pos-converge')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const wantConverges = !prose(slide.prompt).includes('not');
      for (const option of slide.options) {
        const rule = option.label.replace(/^u_n = /, '');
        expect(settles(rule) === wantConverges, `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('seq-power-flow: the path matches what u_n does for large n', () => {
    for (const { slide, seed } of draws('seq-power-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const rule = slide.subject.replace(/^u_n = /, '');
      const big = at(rule, 1e7);
      if (slide.answer[0] === 'Higher on the top') expect(Math.abs(big), `seed ${seed}`).toBeGreaterThan(1e5);
      else if (slide.answer[0] === 'Higher on the bottom') expect(Math.abs(big), `seed ${seed}`).toBeLessThan(1e-4);
      else expect(big, `seed ${seed}: ${rule}`).toBeCloseTo(fn(slide.answer[1].replace(/\$/g, ''))({}), 4);
    }
  });
});

describe('lesson 5: how close, how soon', () => {
  it('seq-gap-table: terms follow the rule and the last column is u_n - L', () => {
    for (const { slide, seed } of draws('seq-gap-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const L = stated(prose(slide.prompt), /limit \$L = (-?\d+)\$/);
      const { f, start } = firstOrder(displays(slide.prompt)[0]);
      const table = merged(slide);
      const terms = iterate(f, start!, table.length);
      expect(table.map((row) => Number(row[1])), `seed ${seed}`).toEqual(terms);
      expect(table.map((row) => Number(row[2])), `seed ${seed}`).toEqual(terms.map((t) => t - L));
      expect(f(L)).toBeCloseTo(L, 9);
    }
  });

  it('seq-gap-tree: the far term is the one the rule reaches', () => {
    for (const { slide, seed } of draws('seq-gap-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const text = prose(slide.prompt);
      const L = stated(text, /converges to \$L = (-?\d+)\$/);
      const k = stated(text, /then \$u_\{(\d+)\}\$\.$/);
      const { f, start } = firstOrder(slide.expression);
      const far = iterate(f, start!, k)[k - 1];
      const [first, , gap, term] = slide.answer.map(Number);
      expect(first, `seed ${seed}`).toBe(start! - L);
      expect(gap, `seed ${seed}`).toBeCloseTo(far - L, 9);
      expect(term, `seed ${seed}`).toBeCloseTo(far, 9);
    }
  });

  it('seq-rate-flow: the path compares the two rules as they really run', () => {
    for (const { slide, seed } of draws('seq-rate-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const [a, b] = slide.subject
        .replace(/\\begin\{gathered\} | \\end\{gathered\}/g, '')
        .split(' \\\\ ')
        .map((line) => firstOrder(line.replace(/^[AB]: \\; /, '')).f);
      const [pa, pb] = [Math.abs(pq(a).p), Math.abs(pq(b).p)];
      const [ca, cb] = [fateByRunning(a, 1000).kind === 'converges', fateByRunning(b, 1000).kind === 'converges'];
      if (ca && cb) {
        const which = Math.abs(pa - pb) < 1e-9 ? 'Neither: the same' : pa < pb ? '$A$' : '$B$';
        expect(slide.answer, `seed ${seed}`).toEqual(['Yes', which]);
      } else {
        expect(ca || cb, `seed ${seed}: neither converges`).toBe(true);
        expect(slide.answer, `seed ${seed}`).toEqual([ca ? 'No: only $A$ does' : 'No: only $B$ does']);
      }
    }
  });

  it('seq-gap-first: n is the first term within the tolerance, found by running the rule', () => {
    for (const { slide, seed } of draws('seq-gap-first')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const text = prose(slide.prompt);
      const L = stated(text, /converges to \$L = (-?\d+)\$/);
      const tolerance = stated(text, /first term within \$([\d.]+)\$/);
      const { f, start } = firstOrder(displays(slide.prompt)[0]);
      const terms = iterate(f, start!, 40);
      const first = terms.findIndex((t) => Math.abs(t - L) < tolerance) + 1;
      expect(Number(slide.answer), `seed ${seed}`).toBe(first);
    }
  });
});

/*
 * Level 4: sums of powers and the method of differences. Every total below is
 * checked by adding the terms up one at a time, read off the rendered slide,
 * never through the standard results the generators use. Every split a slide
 * gives is checked by putting numbers into both sides.
 */

/** The TeX these sums use, as mathjs reads it: also `\frac12`, roots, logs and `r(r + 1)`. */
function sumMath(tex: string): string {
  return texToMath(tex)
    .replace(/\\frac(\d)(\d)/g, '($1/$2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
    .replace(/\\ln (\d+)/g, 'log($1)')
    .replace(/\\ln/g, 'log')
    .replace(/(?<![a-z\\])r\(/g, 'r*(')
    .replace(/\)\s*\(/g, ')*(');
}

function termFn(tex: string): (scope: Record<string, number>) => number {
  const code = compile(sumMath(tex));
  return (scope) => Number(code.evaluate({ ...scope }));
}

/** A number written in TeX: `7`, `\frac{7}{8}`. */
const valueTex = (tex: string) => termFn(tex)({});

/** A sigma read off a slide: its two ends and its general term. */
function sigmaParts(tex: string): { lo: string; hi: string; term: string } {
  const match = tex.match(/^\\sum_\{r=([^}]*)\}\^\{([^}]*)\} (.*)$/);
  if (!match) throw new Error(`not a sum: ${tex}`);
  return { lo: match[1], hi: match[2], term: match[3] };
}

/** Add the terms up one at a time, the check every total is held to. An infinite sum stops at `far`. */
function addTerms(tex: string, scope: Record<string, number> = {}, far = 4000): number {
  const { lo, hi, term } = sigmaParts(tex);
  const end = (text: string) => (text === '\\infty' ? far : termFn(text)(scope));
  const f = termFn(term);
  let total = 0;
  for (let r = end(lo); r <= end(hi); r += 1) total += f({ ...scope, r });
  return total;
}

/** 1^k + 2^k + … + n^k, added up from the written-out line. */
function writtenTotal(tex: string): number {
  const match = tex.match(/^1(\^\d)? \+ 2\1 \+ 3\1 \+ \\dots \+ (\d+)\1$/);
  if (!match) throw new Error(`not written out: ${tex}`);
  const k = match[1] ? Number(match[1].slice(1)) : 1;
  let total = 0;
  for (let r = 1; r <= Number(match[2]); r += 1) total += r ** k;
  return total;
}

/** The template with each blank filled by its answer tile. */
function filled(slide: Extract<Slide, { kind: 'tiles' }>): string {
  // Split first, as the widget does: a tile such as `\frac{1}{2}` holds a `{1}` of its own.
  return slide.template.split(/\{(\d+)\}/g).map((piece, i) => (i % 2 === 1 ? slide.answer[Number(piece)] : piece)).join('');
}

/** Two expressions in r that a slide says are equal, compared at r = 1 to 6. */
function sameInR(left: string, right: string, where: string) {
  const [f, g] = [termFn(left), termFn(right)];
  for (let r = 1; r <= 6; r += 1) expect(g({ r }), `${where}: ${left} = ${right} at r = ${r}`).toBeCloseTo(f({ r }), 12);
}

/** Every identity in r a prompt states inline holds; returns how many were checked. */
function splitsHold(text: string, where: string): number {
  let checked = 0;
  for (const tex of text.split(/\$([^$]+)\$/g).filter((_, i) => i % 2 === 1)) {
    if (tex.includes('\\sum') || tex.includes('S_') || !tex.includes(' = ')) continue;
    const sides = tex.replace(/^u_r = /, '').split(' = ');
    if (!sides.every((side) => /(?<![a-z\\])r(?![a-z])/.test(side))) continue;
    for (const side of sides.slice(1)) sameInR(sides[0], side, where);
    checked += 1;
  }
  return checked;
}

/** Fewer draws, for the sweeps that add an infinite sum up to thousands of terms. */
function* someDraws(id: string, count: number): Generator<{ slide: Slide; seed: number }> {
  for (const difficulty of DIFFICULTIES) {
    for (let seed = 0; seed < count; seed += 1) yield { slide: draw(id, seed, difficulty), seed };
  }
}

/** The gap from a partial sum far out to a claimed limit: positive, and inside the tail. */
function closesOn(limit: number, partial: number, tail: number, where: string) {
  expect(limit - partial, `${where}: the partial sums pass the limit`).toBeGreaterThan(0);
  expect(limit - partial, `${where}: the partial sums stop short of the limit`).toBeLessThan(tail);
}

describe('level 4, lesson 1: the standard results', () => {
  it('seq-power-sum: the typed total is the terms added up', () => {
    for (const { slide, seed } of draws('seq-power-sum')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const shown = displays(slide.prompt)[0];
      const total = shown.startsWith('\\sum') ? addTerms(shown) : writtenTotal(shown);
      expect(Number(slide.answer), `seed ${seed}`).toBe(total);
    }
  });

  it('seq-power-sum-tiles: the placed factors multiply to the sum, for every n', () => {
    for (const { slide, seed } of draws('seq-power-sum-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const shown = displays(slide.prompt)[0];
      const factors = slide.answer.map(termFn);
      for (const n of [2, 3, 5, 8]) {
        const v = factors.map((f) => f({ n }));
        const product = slide.template.startsWith('\\frac16')
          ? (v[0] * v[1] * v[2]) / 6
          : slide.template.startsWith('\\frac14')
            ? (v[0] * v[1]) ** 2 / 4
            : (v[0] * v[1]) / 2;
        expect(product, `seed ${seed}, n = ${n}`).toBe(addTerms(shown, { n }));
      }
    }
  });

  it('seq-power-sum-table: every term is n^k and every total the terms from 1 added up', () => {
    for (const { slide, seed } of draws('seq-power-sum-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const k = slide.columns.length === 3 ? Number(slide.columns[1].slice(2)) : 1;
      const table = merged(slide);
      const first = Number(table[0][0]);
      table.forEach((row, i) => {
        const n = Number(row[0]);
        expect(n, `seed ${seed}`).toBe(first + i);
        if (slide.columns.length === 3) expect(Number(row[1]), `seed ${seed}`).toBe(n ** k);
        let total = 0;
        for (let r = 1; r <= n; r += 1) total += r ** k;
        expect(Number(row[row.length - 1]), `seed ${seed}, n = ${n}`).toBe(total);
      });
    }
  });

  it('seq-formula-reduce: the line comes to the sum at that n', () => {
    for (const { slide, seed } of draws('seq-formula-reduce')) {
      if (slide.kind !== 'reduce') throw new Error('not a reduce');
      const text = prose(slide.prompt);
      const n = stated(text, /at \$n = (\d+)\$/);
      const k = Number(text.match(/\\sum_\{r=1\}\^\{n\} r(?:\^(\d))? =/)![1] ?? 1);
      let total = 0;
      for (let r = 1; r <= n; r += 1) total += r ** k;
      expect(valueOf(slide.expr), `seed ${seed}`).toBe(total);
    }
  });
});

describe('level 4, lesson 2: sums built from the standard results', () => {
  it('seq-split-tree: the total is the sum added up, and the tree starts from the standard sum it names', () => {
    for (const { slide, seed } of draws('seq-split-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const n = Number(sigmaParts(slide.expression).hi);
      const k = /Fill the tree: \$\\sum r\^2\$/.test(prose(slide.prompt)) ? 2 : 1;
      let first = 0;
      for (let r = 1; r <= n; r += 1) first += r ** k;
      expect(Number(slide.answer[0]), `seed ${seed}`).toBe(first);
      expect(Number(slide.answer[slide.answer.length - 1]), `seed ${seed}`).toBe(addTerms(slide.expression));
    }
  });

  it('seq-split-tiles: the placed split adds up to the sum, for every n', () => {
    for (const { slide, seed } of draws('seq-split-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const shown = displays(slide.prompt)[0];
      for (let n = 1; n <= 6; n += 1) {
        let squares = 0;
        let plain = 0;
        for (let r = 1; r <= n; r += 1) [squares, plain] = [squares + r * r, plain + r];
        const split = filled(slide).replace(/\\sum r\^2/g, `(${squares})`).replace(/\\sum r/g, `(${plain})`);
        expect(Number(compile(split).evaluate({ n })), `seed ${seed}, n = ${n}: ${filled(slide)}`).toBe(addTerms(shown, { n }));
      }
    }
  });

  it('seq-built-sum: the typed total is the terms added up', () => {
    for (const { slide, seed } of draws('seq-built-sum')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      expect(Number(slide.answer), `seed ${seed}`).toBe(addTerms(displays(slide.prompt)[0]));
    }
  });

  it('seq-factor-tiles: the factorised form equals the sum, for every n', () => {
    for (const { slide, seed } of draws('seq-factor-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const shown = displays(slide.prompt)[0];
      const form = termFn(filled(slide));
      for (let n = 1; n <= 6; n += 1) {
        expect(form({ n }), `seed ${seed}, n = ${n}: ${filled(slide)}`).toBeCloseTo(addTerms(shown, { n }), 9);
      }
    }
  });
});

describe('level 4, lesson 3: sums that do not start at 1', () => {
  it('seq-subtract-flow: the total taken away leaves exactly the sum, and its value is right', () => {
    for (const { slide, seed } of draws('seq-subtract-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const { hi, term } = sigmaParts(slide.subject);
      const upTo = (x: number | string) => addTerms(`\\sum_{r=1}^{${x}} ${term}`);
      const x = Number(slide.answer[0].match(/S_\{(\d+)\}/)![1]);
      expect(upTo(hi) - upTo(x), `seed ${seed}`).toBe(addTerms(slide.subject));
      expect(Number(slide.answer[1].replace(/\$/g, '')), `seed ${seed}`).toBe(upTo(x));
      expect(stated(prose(slide.prompt), /\$S_\{\d+\} = (\d+)\$/), `seed ${seed}`).toBe(upTo(hi));
    }
  });

  it('seq-from-m: the typed total is the terms added up', () => {
    for (const { slide, seed } of draws('seq-from-m')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      expect(Number(slide.answer), `seed ${seed}`).toBe(addTerms(displays(slide.prompt)[0]));
    }
  });

  it('seq-drop-tree: the difference is the sum, and the top total runs from 1', () => {
    for (const { slide, seed } of draws('seq-drop-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const { hi, term } = sigmaParts(slide.expression);
      const [top, drop, sum] = slide.answer.map(Number);
      expect(top, `seed ${seed}`).toBe(addTerms(`\\sum_{r=1}^{${hi}} ${term}`));
      expect(sum, `seed ${seed}`).toBe(addTerms(slide.expression));
      expect(top - drop, `seed ${seed}`).toBe(sum);
    }
  });

  it('seq-from-m-slip: exactly the right option is the sum, for every n', () => {
    for (const { slide, seed } of draws('seq-from-m-slip')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const shown = displays(slide.prompt)[0];
      const { term } = sigmaParts(shown);
      for (const n of [6, 7, 9]) {
        const S = (sub: string) => addTerms(`\\sum_{r=1}^{${sub}} ${term}`, { n });
        const right = slide.options.filter((option) => {
          const [, top, bottom] = option.label.match(/^S_\{([^}]*)\} - S_\{([^}]*)\}$/)!;
          return S(top) - S(bottom) === addTerms(shown, { n });
        });
        expect(right.map((option) => option.id), `seed ${seed}, n = ${n}`).toEqual([slide.correctId]);
      }
    }
  });
});

describe('level 4, lesson 4: the method of differences', () => {
  it('seq-telescope-steps: the split is right, and each line is a partial sum', () => {
    for (const { slide, seed } of draws('seq-telescope-steps')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const text = prose(slide.prompt);
      const [, sum, split] = text.match(/\$(\\sum_\{r=1\}\^\{\d+\} \\frac\{\d\}\{[^$]*\})\$ splits as \$([^$]*)\$/)!;
      const { hi, term } = sigmaParts(sum);
      sameInR(term, split, `seed ${seed}`);
      const upTo = (x: number) => addTerms(`\\sum_{r=1}^{${x}} ${term}`);
      const values = slide.reductions.map((step) => valueTex(step.value));
      [upTo(2), upTo(3), upTo(Number(hi)), upTo(Number(hi))].forEach((expected, i) =>
        expect(values[i], `seed ${seed}, step ${i}`).toBeCloseTo(expected, 12),
      );
      expect(valueTex(slide.start[0]), `seed ${seed}`).toBeCloseTo(upTo(1), 12);
    }
  });

  it('seq-telescope-tiles: what is left equals the sum, for every n', () => {
    for (const { slide, seed } of draws('seq-telescope-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const shown = displays(slide.prompt)[0];
      const left = termFn(filled(slide));
      for (const n of [6, 9, 13]) {
        expect(left({ n }), `seed ${seed}, n = ${n}: ${filled(slide)}`).toBeCloseTo(addTerms(shown, { n }), 12);
      }
    }
  });

  it('seq-telescope-table: every term follows the rule and every partial sum is the terms added up', () => {
    for (const { slide, seed } of draws('seq-telescope-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const text = prose(slide.prompt);
      expect(splitsHold(text, `seed ${seed}`)).toBe(1);
      const rule = text.match(/\$u_r = (\\frac\{\d+\}\{[^$=]*\}) =/)![1];
      for (const [n, u, S] of merged(slide)) {
        expect(valueTex(u), `seed ${seed}, n = ${n}`).toBeCloseTo(termFn(rule)({ r: Number(n) }), 12);
        expect(valueTex(S), `seed ${seed}, n = ${n}`).toBeCloseTo(addTerms(`\\sum_{r=1}^{${n}} ${rule}`), 12);
      }
    }
  });

  it('seq-telescope-sum: the split is right, and the typed fraction is the terms added up', () => {
    for (const { slide, seed } of draws('seq-telescope-sum')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      expect(splitsHold(prose(slide.prompt), `seed ${seed}`)).toBe(1);
      expect(Number(compile(slide.answer).evaluate()), `seed ${seed}`).toBeCloseTo(addTerms(displays(slide.prompt)[0]), 12);
    }
  });
});

describe('level 4, lesson 5: sums to infinity by differences', () => {
  it('seq-leftover-flow: the path says whether S_n settles, and where', () => {
    for (const { slide, seed } of draws('seq-leftover-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const S = termFn(slide.subject.replace(/^S_n = /, ''));
      const [near, far] = [S({ n: 1e6 }), S({ n: 1e12 })];
      if (Math.abs(far - near) < 1e-4) {
        expect(slide.answer[0], `seed ${seed}`).toBe('It tends to $0$');
        expect(valueTex(slide.answer[1].replace(/\$/g, '')), `seed ${seed}`).toBeCloseTo(far, 6);
      } else {
        expect(slide.answer, `seed ${seed}`).toEqual(['It grows without limit']);
      }
    }
  });

  it('seq-infinity-sum: the split is right, and the partial sums close in on the typed sum', () => {
    for (const { slide, seed } of someDraws('seq-infinity-sum', 40)) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      expect(splitsHold(prose(slide.prompt), `seed ${seed}`)).toBe(1);
      const limit = Number(compile(slide.answer).evaluate());
      closesOn(limit, addTerms(displays(slide.prompt)[0]), 6 / 4000, `seed ${seed}`);
    }
  });

  it('seq-survivor-tree: the split is right, the leaves add to the total, and the sum is the limit', () => {
    for (const { slide, seed } of someDraws('seq-survivor-tree', 40)) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      expect(splitsHold(prose(slide.prompt), `seed ${seed}`)).toBe(1);
      const values = slide.answer.map(valueTex);
      const leaves = values.slice(0, -2);
      expect(values[values.length - 2], `seed ${seed}`).toBeCloseTo(leaves.reduce((x, y) => x + y, 0), 12);
      // The sum sits on the first line of a two-line display, its split below.
      const sum = slide.expression.replace(/^\\begin\{gathered\} /, '').split(' \\\\ = ')[0];
      closesOn(values[values.length - 1], addTerms(sum), 6 / 4000, `seed ${seed}`);
    }
  });

  it('seq-telescope-slider: the split is right, and the answer is where the partial sums go', () => {
    for (const { slide, seed } of someDraws('seq-telescope-slider', 40)) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const text = prose(slide.prompt);
      expect(splitsHold(text, `seed ${seed}`)).toBe(1);
      const sum = text.match(/\$(\\sum_\{r=1\}\^\{\\infty\} \\frac\{\d+\}\{[^$]*?\})\$, where/)![1];
      closesOn(slide.answer, addTerms(sum, {}, 20000), 96 / 20000, `seed ${seed}`);
    }
  });
});

/*
 * Level 5: proof by induction for series. Every claim a slide states as true is
 * held to its terms added up one at a time, every line of working to that total
 * at k = 1 to 8, and every recurrence's closed form to the rule run from u_1,
 * all read off the rendered slide rather than the generator's own model.
 */

const KS = [1, 2, 3, 4, 5, 6, 7, 8];

/** Inline maths in a line of prose, in order. */
const inlineMaths = (text: string) => text.split(/\$([^$]+)\$/g).filter((_, i) => i % 2 === 1);

const compiledInK = new Map<string, (scope: Record<string, number>) => number>();

/** A TeX expression evaluated in k, n or r; also `k(k + 1)` and `n^2(n + 1)^2` as products. */
function at(tex: string, scope: Record<string, number>): number {
  let f = compiledInK.get(tex);
  if (!f) {
    f = termFn(tex.replace(/(?<![a-z\\])k\(/g, 'k*(').replace(/\^(\d)\(/g, '^$1*('));
    compiledInK.set(tex, f);
  }
  // `\frac13` comes back a hair off a whole number through floats.
  const value = f(scope);
  return Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : value;
}

/** A display split over two lines, `\begin{aligned} &a \\ &+ b \end{aligned}`, as one. */
const oneLine = (tex: string) => tex.replace(/\\(begin|end)\{aligned\}|&|\\\\/g, '').replace(/\s+/g, ' ').trim();

/** Two functions of k agreeing at k = 1 to 8. */
const sameInK = (f: (k: number) => number, g: (k: number) => number) => KS.every((k) => Math.abs(f(k) - g(k)) < 1e-6);

interface SumClaim {
  lo: number;
  term: string;
  right: string;
}

/** `\sum_{r=a}^{n} term = right`. */
function sumClaim(tex: string): SumClaim {
  const match = tex.match(/^\\sum_\{r=(\d+)\}\^\{n\} (.*?) = (.*)$/);
  if (!match) throw new Error(`not a claimed sum: ${tex}`);
  return { lo: Number(match[1]), term: match[2], right: match[3] };
}

/** The first claimed sum stated inline anywhere in some prose. */
const claimIn = (text: string) => sumClaim(inlineMaths(text).find((tex) => tex.startsWith('\\sum') && tex.includes('^{n}'))!);

const termAt = (c: SumClaim, r: number) => at(c.term, { r });
const rightAt = (c: SumClaim, n: number) => at(c.right, { n });
function addedUp(c: SumClaim, n: number): number {
  let total = 0;
  for (let r = c.lo; r <= n; r += 1) total += termAt(c, r);
  return total;
}

function claimHolds(c: SumClaim, where: string) {
  for (let n = c.lo; n <= c.lo + 9; n += 1) expect(rightAt(c, n), `${where}: the claim at n = ${n}`).toBe(addedUp(c, n));
}

interface RecClaim {
  rule: (x: number) => number;
  start: number;
  closed?: string;
}

/** A recurrence stated inline, `u_{n+1} = …` and `u_1 = s`, with its claimed `u_n = …` if there is one. */
function recIn(text: string): RecClaim {
  const maths = inlineMaths(text);
  const rule = maths.find((tex) => tex.startsWith('u_{n+1} = '))!;
  const start = maths.find((tex) => /^u_1 = -?\d+$/.test(tex))!;
  const closed = maths.find((tex) => tex.startsWith('u_n = '));
  return { rule: firstOrder(rule).f, start: Number(start.slice(6)), closed: closed?.slice(6) };
}

const recTerms = (rec: RecClaim, count: number) => iterate(rec.rule, rec.start, count);

function closedHolds(rec: RecClaim, where: string) {
  const terms = recTerms(rec, 10);
  terms.forEach((u, i) => expect(at(rec.closed!, { n: i + 1 }), `${where}: the formula at n = ${i + 1}`).toBe(u));
}

/** Every way of filling a tiles slide's blanks from its bank, each tile used once. */
function arrangements(slide: Extract<Slide, { kind: 'tiles' }>): string[][] {
  const out: string[][] = [];
  const grow = (picked: number[]) => {
    if (picked.length === slide.answer.length) {
      out.push(picked.map((i) => slide.bank[i]));
      return;
    }
    slide.bank.forEach((_, i) => {
      if (!picked.includes(i)) grow([...picked, i]);
    });
  };
  grow([]);
  return out;
}

const fillWith = (template: string, tiles: string[]) =>
  template.split(/\{(\d+)\}/g).map((piece, i) => (i % 2 === 1 ? tiles[Number(piece)] : piece)).join('');

/** Whether an arrangement, as text, agrees with `target` at every k; unreadable counts as no. */
function fillAgrees(text: string, target: (k: number) => number, scope = 'k'): boolean {
  try {
    return sameInK((k) => at(text, { [scope]: k }), target);
  } catch {
    return false;
  }
}

/** Only the answer's arrangement of tiles comes to `target`. */
function onlyAnswerFits(slide: Extract<Slide, { kind: 'tiles' }>, strip: string, target: (k: number) => number, where: string, scope = 'k') {
  const answer = slide.answer.join('|');
  for (const tiles of arrangements(slide)) {
    const text = fillWith(slide.template, tiles).replace(strip, '');
    const same = tiles.join('|') === answer || (slide.unordered === true && [...tiles].sort().join('|') === [...slide.answer].sort().join('|'));
    expect(fillAgrees(text, target, scope), `${where}: ${text}`).toBe(same);
  }
}

/**
 * Walk a steps slide as the widget does. Every line on the way comes to
 * `target` at k = 1 to 8, and every bank value but the right one does not.
 */
function walkSteps(slide: Extract<Slide, { kind: 'steps' }>, target: (k: number) => number, where: string, uk?: string) {
  const read = (tokens: string[]) => {
    const tex = tokens.join(' ');
    return uk === undefined ? tex : tex.replace(/u_k/g, `(${uk})`);
  };
  let line = [...slide.start];
  expect(fillAgrees(read(line), target), `${where}: the opening line`).toBe(true);
  for (const { span, value, bank } of slide.reductions) {
    const put = (v: string) => [...line.slice(0, span[0]), v, ...line.slice(span[1])];
    expect(bank, where).toContain(value);
    for (const option of bank) expect(fillAgrees(read(put(option)), target), `${where}: ${option}`).toBe(option === value);
    line = put(value);
  }
  expect(line, where).toHaveLength(1);
}

/**
 * Whether one line of a written proof is sound. `left` is what the step
 * assumes a value for, at k; `truth(k)` is the true value there, the sum up to
 * k or the term u_k.
 */
function proofLineSound(line: string, left: string, truth: (k: number) => number, base: (text: string) => boolean): boolean {
  if (line.startsWith('Base case:')) return base(line);
  if (line.startsWith('It holds at $n = 1$, and whenever')) return true;
  if (line.startsWith('It also')) return false;
  const maths = inlineMaths(line);
  if (line.startsWith('Assume')) {
    const [lhs, rhs] = maths[0].split(' = ');
    return lhs === left && sameInK((k) => at(rhs, { k }), truth);
  }
  const next = (k: number) => truth(k + 1);
  if (line.startsWith('Then')) {
    const sides = maths[0].split(' = ');
    return sameInK((k) => at(sides[sides.length - 1], { k }), next);
  }
  const that = line.match(/that is \$([^$]+)\$/i);
  if (!that) throw new Error(`an unread proof line: ${line}`);
  return sameInK((k) => at(that[1], { k }), next);
}

/** Every step of the proof in the answer is sound, and every one left out is not. */
function orderSound(slide: Slide, left: string, truth: (k: number) => number, base: (text: string) => boolean, where: string) {
  if (slide.kind !== 'order') throw new Error('not an order slide');
  for (const step of slide.steps) {
    expect(proofLineSound(step.text, left, truth, base), `${where}: ${step.text}`).toBe(slide.answer.includes(step.id));
  }
}

/** `Base case: at $n = 1$ the left side is $u_1 = X$, and the right side is $… = X$.` */
function seriesBase(c: SumClaim) {
  return (line: string) => {
    const match = line.match(/^Base case: at \$n = (\d+)\$ the left side is \$u_1 = (-?\d+)\$, and the right side is \$(.*) = (-?\d+)\$\.$/);
    if (!match) return false;
    const [n, left, working, right] = [Number(match[1]), Number(match[2]), match[3], Number(match[4])];
    return n === c.lo && left === termAt(c, 1) && at(working, {}) === right && right === left;
  };
}

describe('level 5, lesson 1: the step for a series', () => {
  it('seq-ind-added-term: one tile is the claim at k, the other u_{k+1}, and only that pair adds to the sum', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-added-term')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, where);
      expect(displays(slide.prompt)[0], where).toBe(`\\sum_{r=1}^{k+1} ${c.term}`);
      const [assumed, added] = slide.answer.map((tile) => (k: number) => at(tile, { k }));
      expect(sameInK(assumed, (k) => rightAt(c, k)), `${where}: the sum up to k`).toBe(true);
      expect(sameInK(added, (k) => termAt(c, k + 1)), `${where}: the next term`).toBe(true);
      const both = slide.template.replace(/^= /, '');
      onlyAnswerFits({ ...slide, template: both }, '', (k) => addedUp(c, k + 1), where);
    }
  });

  it('seq-ind-step-check: the claim at k, the term u_{k+1} and their total, each added up', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-step-check')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const c = claimIn(text);
      claimHolds(c, where);
      const k = stated(text, /at \$k = (\d+)\$/);
      expect(slide.answer.map(Number), where).toEqual([addedUp(c, k), termAt(c, k + 1), addedUp(c, k + 1)]);
      expect(at(oneLine(slide.expression), { k }), where).toBe(addedUp(c, k + 1));
    }
  });

  it('seq-ind-running: every term is u_n and every total the terms added up', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-running')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const maths = inlineMaths(prose(slide.prompt));
      const c: SumClaim = { lo: 1, term: maths[0].match(/^S_n = \\sum_\{r=1\}\^\{n\} (.*)$/)![1], right: '' };
      const claimed = maths.find((tex) => tex.startsWith('S_n = ') && !tex.includes('\\sum'));
      if (claimed) claimHolds({ ...c, right: claimed.slice(6) }, where);
      for (const [n, u, total] of merged(slide).map((row) => row.map(Number))) {
        expect(u, `${where}, n = ${n}`).toBe(termAt(c, n));
        expect(total, `${where}, n = ${n}`).toBe(addedUp(c, n));
      }
    }
  });

  it('seq-ind-next-sum: the given sum is the terms added up, and so is the answer', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-next-sum')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const [given, asked] = displays(slide.prompt);
      const [sum, total] = given.split(' = ');
      expect(Number(total), `seed ${seed}, difficulty ${difficulty}`).toBe(addTerms(sum));
      expect(Number(slide.answer), `seed ${seed}, difficulty ${difficulty}`).toBe(addTerms(asked));
    }
  });

  it('seq-ind-order-sum: every step of the proof holds, and every step left out does not', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-order-sum')) {
      if (slide.kind !== 'order') throw new Error('not an order slide');
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, `seed ${seed}`);
      orderSound(slide, `\\sum_{r=1}^{k} ${c.term}`, (k) => addedUp(c, k), seriesBase(c), `seed ${seed}, difficulty ${difficulty}`);
    }
  });
});

describe('level 5, lesson 2: proving the standard results', () => {
  it('seq-ind-target: only the right option is the sum up to k + 1', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-target')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, where);
      for (const option of slide.options) {
        expect(fillAgrees(option.label, (k) => addedUp(c, k + 1)), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('seq-ind-factor-out: the line is the sum up to k + 1, and only the right tile keeps it so', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-factor-out')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, where);
      const target = (k: number) => addedUp(c, k + 1);
      expect(fillAgrees(oneLine(displays(slide.prompt)[0]), target), `${where}: the line`).toBe(true);
      onlyAnswerFits(slide, '', target, where);
    }
  });

  it('seq-ind-standard-step: every line of the working is the sum up to k + 1', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-standard-step')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, `seed ${seed}`);
      walkSteps(slide, (k) => addedUp(c, k + 1), `seed ${seed}, difficulty ${difficulty}`);
    }
  });

  it('seq-ind-order-standard: every step of the proof holds, and every step left out does not', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-order-standard')) {
      if (slide.kind !== 'order') throw new Error('not an order slide');
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, `seed ${seed}`);
      orderSound(slide, `\\sum_{r=1}^{k} ${c.term}`, (k) => addedUp(c, k), seriesBase(c), `seed ${seed}, difficulty ${difficulty}`);
    }
  });
});

describe('level 5, lesson 3: arithmetic and geometric sums', () => {
  it('seq-ind-ap-close: the line is the sum up to k + 1, and only the right tile keeps it so', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-ap-close')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, where);
      const target = (k: number) => addedUp(c, k + 1);
      expect(fillAgrees(displays(slide.prompt)[0], target), `${where}: the line`).toBe(true);
      onlyAnswerFits(slide, '', target, where);
    }
  });

  it('seq-ind-series-step: every line of the working is the sum up to k + 1', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-series-step')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, `seed ${seed}`);
      walkSteps(slide, (k) => addedUp(c, k + 1), `seed ${seed}, difficulty ${difficulty}`);
    }
  });

  it('seq-ind-next-flow: the right branches are u_{k+1} and the sum up to k + 1, and the wrong ones are not', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-next-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const c = sumClaim(slide.subject);
      claimHolds(c, where);
      const [which, total] = slide.steps;
      const bare = (label: string) => label.replace(/^\$|\$$/g, '');
      for (const branch of which.branches) {
        const target = branch.to ? (k: number) => termAt(c, k + 1) : (k: number) => termAt(c, k);
        expect(fillAgrees(bare(branch.label), target), `${where}: ${branch.label}`).toBe(true);
      }
      const assumed = inlineMaths(total.ask)[0];
      expect(fillAgrees(assumed, (k) => rightAt(c, k)), `${where}: ${assumed}`).toBe(true);
      for (const branch of total.branches) {
        const right = branch.label === slide.answer[1];
        expect(fillAgrees(bare(branch.label), (k) => addedUp(c, k + 1)), `${where}: ${branch.label}`).toBe(right);
        if (right) continue;
        const [, given, , sum] = inlineMaths(branch.outcome!).map(Number);
        expect(given, where).toBe(at(bare(branch.label), { k: 1 }));
        expect(sum, where).toBe(addedUp(c, 2));
        expect(given, where).not.toBe(sum);
      }
      expect(slide.answer[0], where).toBe(which.branches.find((branch) => branch.to)!.label);
    }
  });

  it('seq-ind-claim-value: the line comes to the terms added up', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-claim-value')) {
      if (slide.kind !== 'reduce') throw new Error('not a reduce');
      const text = prose(slide.prompt);
      const c = claimIn(text);
      claimHolds(c, `seed ${seed}`);
      expect(valueOf(slide.expr), `seed ${seed}, difficulty ${difficulty}`).toBe(addedUp(c, stated(text, /at \$n = (\d+)\$/)));
    }
  });

  it('seq-ind-order-series: every step of the proof holds, and every step left out does not', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-order-series')) {
      if (slide.kind !== 'order') throw new Error('not an order slide');
      const c = claimIn(prose(slide.prompt));
      claimHolds(c, `seed ${seed}`);
      orderSound(slide, `\\sum_{r=1}^{k} ${c.term}`, (k) => addedUp(c, k), seriesBase(c), `seed ${seed}, difficulty ${difficulty}`);
    }
  });
});

describe("level 5, lesson 4: a recurrence's closed form", () => {
  it('seq-ind-rec-table: every u_n is the rule run from u_1, and the formula column agrees with it', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-rec-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const rec = recIn(prose(slide.prompt));
      expect(slide.columns[2], where).toBe(rec.closed);
      const table = merged(slide);
      const terms = recTerms(rec, table.length);
      table.forEach((row, i) => {
        expect(row.map(Number), `${where}, row ${i + 1}`).toEqual([i + 1, terms[i], at(rec.closed!, { n: i + 1 })]);
      });
      closedHolds(rec, where);
    }
  });

  it('seq-ind-rec-step: every line of the working is u_{k+1}, with u_k the formula assumed', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-rec-step')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const rec = recIn(text);
      closedHolds(rec, where);
      const assumed = inlineMaths(text).find((tex) => tex.startsWith('u_k = '))!.slice(6);
      const terms = recTerms(rec, 10);
      expect(fillAgrees(assumed, (k) => terms[k - 1]), where).toBe(true);
      walkSteps(slide, (k) => terms[k], where, assumed);
    }
  });

  it('seq-ind-rec-closed: the listed terms are the rule run from u_1, and only the answer tiles fit them', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-rec-closed')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const rec = recIn(prose(slide.prompt));
      const terms = recTerms(rec, 10);
      const shown = displays(slide.prompt)[0].split(', \\; ').filter((piece) => piece !== '\\dots').map(Number);
      expect(shown, where).toEqual(terms.slice(0, shown.length));
      onlyAnswerFits(slide, 'u_n = ', (n) => terms[n - 1], where, 'n');
    }
  });

  it('seq-ind-order-rec: every step of the proof holds, and every step left out does not', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-order-rec')) {
      if (slide.kind !== 'order') throw new Error('not an order slide');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const rec = recIn(prose(slide.prompt));
      closedHolds(rec, where);
      const terms = recTerms(rec, 10);
      const base = (line: string) => {
        const match = line.match(/^Base case: the sequence starts at \$u_1 = (-?\d+)\$, and the formula gives \$(.*) = (-?\d+)\$\.$/);
        return match !== null && Number(match[1]) === rec.start && at(match[2], {}) === rec.start && Number(match[3]) === rec.start;
      };
      orderSound(slide, 'u_k', (k) => terms[k - 1], base, where);
    }
  });

  it('seq-ind-rec-term: the term asked for, or the position of the value given, from the rule run from u_1', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-rec-term')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const rec = recIn(text);
      closedHolds(rec, where);
      const terms = recTerms(rec, 40);
      const asked = text.match(/find \$u_\{(\d+)\}\$/);
      if (asked) {
        expect(Number(slide.answer), where).toBe(terms[Number(asked[1]) - 1]);
      } else {
        const value = stated(text, /Which term of the sequence is \$(-?\d+)\$/);
        const places = terms.flatMap((u, i) => (u === value ? [i + 1] : []));
        expect(places, where).toEqual([Number(slide.answer)]);
      }
    }
  });
});

describe('level 5, lesson 5: reading and checking a proof', () => {
  it('seq-ind-test-table: every true total is the terms added up, and every claimed one the claim', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-test-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const c = claimIn(prose(slide.prompt));
      for (const [n, total, claimed] of merged(slide).map((row) => row.map(Number))) {
        expect([total, claimed], `seed ${seed}, difficulty ${difficulty}, n = ${n}`).toEqual([addedUp(c, n), rightAt(c, n)]);
      }
    }
  });

  it('seq-ind-verdict: the path follows whether the step and the base case really hold', () => {
    for (const difficulty of DIFFICULTIES) {
      const seen = new Set<string>();
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const slide = draw('seq-ind-verdict', seed, difficulty);
        if (slide.kind !== 'flow') throw new Error('not a flow');
        const where = `seed ${seed}, difficulty ${difficulty}`;
        const c = sumClaim(slide.subject);
        const reached = (k: number) => rightAt(c, k) + termAt(c, k + 1);
        const text = prose(slide.prompt);
        const working = text.match(/is \$([^$]+)\$, which comes to \$([^$]+)\$/)!;
        expect(fillAgrees(working[1], reached), `${where}: ${working[1]}`).toBe(true);
        expect(fillAgrees(working[2], reached), `${where}: ${working[2]}`).toBe(true);
        const next = text.match(/claim at \$n = k \+ 1\$ is \$([^$]+)\$/);
        if (next) expect(fillAgrees(next[1], (k) => rightAt(c, k + 1)), `${where}: ${next[1]}`).toBe(true);
        const step = sameInK(reached, (k) => rightAt(c, k + 1));
        const base = rightAt(c, 1) === termAt(c, 1);
        const path = step ? ['Yes', base ? 'Yes' : 'No'] : ['No'];
        expect(slide.answer, where).toEqual(path);
        seen.add(path.join(' '));
      }
      expect([...seen].sort(), `difficulty ${difficulty}`).toEqual(['No', 'Yes No', 'Yes Yes']);
    }
  });

  it('seq-ind-flaw: the right option names the one line that is really wrong, or none', () => {
    const labels: Record<string, string> = {
      base: 'The base case checks the wrong value of n',
      assume: 'The step assumes what it has to prove',
      term: 'The step adds the wrong term',
      none: 'Nothing: the proof is sound',
    };
    for (const difficulty of DIFFICULTIES) {
      const seen = new Set<string>();
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const slide = draw('seq-ind-flaw', seed, difficulty);
        if (slide.kind !== 'choice') throw new Error('not a choice');
        const where = `seed ${seed}, difficulty ${difficulty}`;
        const text = prose(slide.prompt);
        const c = claimIn(text);
        claimHolds(c, where);
        const lines = slide.prompt.flatMap((block) => (block.kind === 'prose' && /^\d\. /.test(block.text) ? [block.text.slice(3)] : []));
        expect(lines, where).toHaveLength(4);
        const flaws: string[] = [];

        const [baseAt] = inlineMaths(lines[0]);
        if (baseAt === 'n = 1') {
          expect(seriesBase(c)(lines[0].replace(/\$\.$/, '$.')), `${where}: ${lines[0]}`).toBe(true);
        } else {
          flaws.push('base');
          const [, left, right] = inlineMaths(lines[0]);
          const n = Number(baseAt.slice(4));
          expect([Number(left.split(' = ')[1]), Number(right)], where).toEqual([addedUp(c, n), rightAt(c, n)]);
        }

        const [assumeLeft, assumeRight] = inlineMaths(lines[1])[0].split(' = ');
        const shift = assumeLeft === `\\sum_{r=1}^{k} ${c.term}` ? 0 : 1;
        if (shift) {
          flaws.push('assume');
          expect(assumeLeft, where).toBe(`\\sum_{r=1}^{k+1} ${c.term}`);
        }
        expect(fillAgrees(assumeRight, (k) => rightAt(c, k + shift)), `${where}: ${assumeRight}`).toBe(true);

        const [stepLine, reached] = inlineMaths(lines[2]);
        const added = stepLine.split(' = ').slice(1).join(' = ');
        if (!fillAgrees(added, (k) => addedUp(c, k + 1))) flaws.push('term');
        expect(fillAgrees(reached, (k) => rightAt(c, k + 1)), `${where}: ${reached}`).toBe(true);

        expect(flaws.length, `${where}: more than one flaw`).toBeLessThanOrEqual(1);
        const flaw = flaws[0] ?? 'none';
        expect(choiceAnswer(slide), where).toBe(labels[flaw]);
        seen.add(flaw);
      }
      expect([...seen].sort(), `difficulty ${difficulty}`).toEqual(['assume', 'base', 'none', 'term']);
    }
  });

  it('seq-ind-start: the claim holds from where it starts, and the base case is the first term', () => {
    for (const { slide, seed, difficulty } of draws('seq-ind-start')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const c = claimIn(text);
      expect(stated(text, /\$n \\ge (\d+)\$/), where).toBe(c.lo);
      claimHolds(c, where);
      expect(Number(slide.answer), where).toBe(termAt(c, c.lo));
    }
  });
});

describe('level 5: every number in a slide', () => {
  it('is whole and under 1000', () => {
    const ids = Object.keys(registry).filter((id) => id.startsWith('seq-ind-') && !id.includes('+'));
    expect(ids).toHaveLength(23);
    for (const id of ids) {
      for (const { slide, seed, difficulty } of draws(id)) {
        const { solution: _, ...question } = slide as Slide & { solution?: unknown };
        const numbers = JSON.stringify(question).match(/\d+(\.\d+)?/g) ?? [];
        for (const number of numbers) expect(Number(number), `${id}, seed ${seed}, difficulty ${difficulty}: ${number}`).toBeLessThan(1000);
        expect(numbers.filter((number) => number.includes('.')), `${id}, seed ${seed}`).toEqual([]);
      }
    }
  });
});

/*
 * Level 6: every story run again, a year at a time, from the numbers its prose
 * states. The generators build their questions from their own helpers; none of
 * those is used here, so a balance, a year or a payment that does not follow
 * from what the learner reads fails.
 */

/** x after a year's interest at pct%, which must come out whole. */
function withInterest(x: number, pct: number, where: string): number {
  const value = (x * (100 + pct)) / 100;
  expect(Number.isInteger(value), `${where}: ${x} at ${pct}% is not whole`).toBe(true);
  return value;
}

const percentIn = (text: string) => stated(text, /\$(\d+)\\%\$/);

/** Savings: P paid in at the start of each year, interest at the end. The balances at the ends of years 1 … n. */
function savingsBalances(text: string, n: number, where: string): number[] {
  const P = stated(text, /pays £\$(\d+)\$ into a savings account/);
  const pct = percentIn(text);
  const out: number[] = [];
  for (let k = 0; k < n; k += 1) out.push(withInterest((out[k - 1] ?? 0) + P, pct, where));
  return out;
}

/** A loan as the prose tells it: interest on, then the repayment, or the rest when that is less. */
function loanYears(text: string, where: string): { owed: number[]; after: number[]; paid: number[] } {
  const D = stated(text, /borrows £\$(\d+)\$/);
  const pct = percentIn(text);
  const R = stated(text, /then £\$(\d+)\$ is repaid/);
  const owed: number[] = [];
  const after: number[] = [];
  const paid: number[] = [];
  let u = D;
  while (u > 0) {
    expect(owed.length, `${where}: never clears`).toBeLessThan(10);
    const o = withInterest(u, pct, where);
    owed.push(o);
    paid.push(Math.min(o, R));
    u = o - Math.min(o, R);
    after.push(u);
  }
  return { owed, after, paid };
}

/** The values a model story gives: a fixed rise in pounds or units, a percentage of the first value (fixed too), or of the one before. */
function storyValues(text: string, count: number, where: string): { geo: boolean; values: number[] } {
  const a = stated(text, /(?:pays|is|sells|has) £?\$(\d+)\$/);
  const pct = text.match(/by \$(\d+)\\%\$/) ? percentIn(text) : 0;
  const geo = pct > 0 && !/of the first/.test(text);
  const d = pct > 0 ? (a * pct) / 100 : stated(text, /by £?\$(\d+)\$ every/);
  const values = [a];
  while (values.length < count) values.push(geo ? withInterest(values[values.length - 1], pct, where) : values[values.length - 1] + d);
  return { geo, values };
}

/** Plan A and Plan B, years 1 … N. */
function plansFrom(text: string, N: number, where: string): { A: number[]; B: number[] } {
  const a = stated(text, /Plan A pays £\$(\d+)\$/);
  const d = stated(text, /then £\$(\d+)\$ more each year/);
  const b = stated(text, /Plan B pays £\$(\d+)\$/);
  const pct = percentIn(text);
  const A = Array.from({ length: N }, (_, i) => a + i * d);
  const B = [b];
  while (B.length < N) B.push(withInterest(B[B.length - 1], pct, where));
  return { A, B };
}

const added = (values: number[]) => values.reduce((sum, v) => sum + v, 0);

/** A power of a multiplier as a tile writes it, `1.1^3`, as a number. */
function powerValue(token: string): number {
  const [base, power = '1'] = token.split('^');
  return Number(base) ** Number(power);
}

describe('level 6, lesson 1: regular savings', () => {
  it('seq-save-table: each start is last year plus the payment, each end that with interest', () => {
    for (const { slide, seed, difficulty } of draws('seq-save-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const rows = merged(slide).map((row) => row.map(Number));
      const B = savingsBalances(prose(slide.prompt), rows.length, where);
      const P = stated(prose(slide.prompt), /pays £\$(\d+)\$/);
      rows.forEach(([n, start, end], k) => expect([n, start, end], where).toEqual([k + 1, (B[k - 1] ?? 0) + P, B[k]]));
      expect(B[B.length - 1], where).toBeLessThanOrEqual(6000);
    }
  });

  it('seq-save-series-tiles: the series is r to r^n times the payment, and adds up to the balance', () => {
    for (const { slide, seed, difficulty } of draws('seq-save-series-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const n = stated(slide.template, /^B_(\d) =/);
      expect(stated(text, /end of year \$(\d+)\$/), where).toBe(n);
      expect(stated(slide.template, /= (\d+)\(/), where).toBe(stated(text, /pays £\$(\d+)\$/));
      const r = 1 + percentIn(text) / 100;
      const powers = n === 2 ? [1, 2] : n === 3 ? [1, 2, 3] : [1, 2, n];
      const tokens = slide.answer.slice(0, -1);
      tokens.forEach((token, i) => expect(powerValue(token), `${where}: ${token}`).toBeCloseTo(r ** powers[i], 10));
      expect(Number(slide.answer[slide.answer.length - 1]), where).toBe(savingsBalances(text, n, where)[n - 1]);
    }
  });

  it('seq-save-sum-steps: each term is one payment grown for its years, and the terms add to the balance', () => {
    for (const { slide, seed, difficulty } of draws('seq-save-sum-steps')) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const n = stated(text, /end of year \$(\d+)\$/);
      const P = stated(text, /pays £\$(\d+)\$/);
      const pct = percentIn(text);
      const grownFor = (k: number) => Array.from({ length: k }).reduce<number>((x) => withInterest(x, pct, where), P);
      const values = slide.reductions.map((step) => Number(step.value));
      expect(values.slice(0, n), where).toEqual(Array.from({ length: n }, (_, i) => grownFor(i + 1)));
      expect(values[values.length - 1], where).toBe(savingsBalances(text, n, where)[n - 1]);
      for (const step of slide.reductions) expect(step.bank, where).toContain(step.value);
    }
  });

  it('seq-save-balance: the typed balance is the one the year-by-year run reaches', () => {
    for (const { slide, seed, difficulty } of draws('seq-save-balance')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const n = stated(text, /end of year \$(\d+)\$/);
      expect(Number(slide.answer), where).toBe(savingsBalances(text, n, where)[n - 1]);
    }
  });
});

describe('level 6, lesson 2: paying off a loan', () => {
  it('seq-loan-table: what is owed and what is left follow the loan, down to nothing', () => {
    for (const { slide, seed, difficulty } of draws('seq-loan-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const { owed, after } = loanYears(prose(slide.prompt), where);
      expect(merged(slide).map((row) => row.map(Number)), where).toEqual(owed.map((o, k) => [k + 1, o, after[k]]));
    }
  });

  it('seq-loan-rule-tiles: the recurrence is the multiplier, the repayment and the loan, and u_2 follows', () => {
    for (const { slide, seed, difficulty } of draws('seq-loan-rule-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const { after } = loanYears(text, where);
      expect(after.length, `${where}: u_2 would be past the end`).toBeGreaterThanOrEqual(3);
      expect(slide.answer.map(Number), where).toEqual([
        1 + percentIn(text) / 100,
        stated(text, /then £\$(\d+)\$ is repaid/),
        stated(text, /borrows £\$(\d+)\$/),
        after[1],
      ]);
    }
  });

  it('seq-loan-clear: the year typed is the year the last payment is made', () => {
    for (const { slide, seed, difficulty } of draws('seq-loan-clear')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      expect(Number(slide.answer), where).toBe(loanYears(prose(slide.prompt), where).owed.length);
    }
  });

  it('seq-loan-interest-tree: the last payment, the full ones, the total and the interest all follow the loan', () => {
    for (const { slide, seed, difficulty } of draws('seq-loan-interest-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const { after, paid } = loanYears(text, where);
      const years = paid.length;
      expect(stated(text, /£\$(\d+)\$ is still owed/), where).toBe(after[years - 2]);
      expect(stated(text, /year \$(\d+)\$ clears it/), where).toBe(years);
      const D = stated(text, /borrows £\$(\d+)\$/);
      expect(slide.answer.map(Number), where).toEqual([paid[years - 1], added(paid.slice(0, -1)), added(paid), added(paid) - D]);
    }
  });
});

describe('level 6, lesson 3: years to a target', () => {
  it('seq-target-year: the answer is the first year the balance is more than the target', () => {
    for (const { slide, seed, difficulty } of draws('seq-target-year')) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const T = stated(text, /dashed line is £\$(\d+)\$/);
      const B = savingsBalances(text, slide.answer, where);
      expect(B[slide.answer - 1], where).toBeGreaterThan(T);
      expect(B.slice(0, -1).every((b) => b <= T), where).toBe(true);
      expect(slide.max, where).toBeGreaterThan(slide.answer);
    }
  });

  it('seq-target-payment: paying the typed amount each year lands exactly on the target', () => {
    for (const { slide, seed, difficulty } of draws('seq-target-payment')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const n = stated(text, /end of year \$(\d+)\$/);
      const T = stated(text, /wants £\$(\d+)\$/);
      const asStory = `pays £$${slide.answer}$ into a savings account ${text}`;
      expect(savingsBalances(asStory, n, where)[n - 1], where).toBe(T);
    }
  });

  it('seq-target-scale-tree: the trial runs year by year, and scaling it reaches the target', () => {
    for (const { slide, seed, difficulty } of draws('seq-target-scale-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const trial = stated(text, /Try £\$(\d+)\$/);
      const T = stated(text, /aim is £\$(\d+)\$/);
      const n = stated(text, /end of year \$(\d+)\$/);
      const trialRun = savingsBalances(`pays £$${trial}$ into a savings account ${text}`, n, where);
      const values = slide.answer.map(Number);
      expect(values.slice(0, n), where).toEqual(trialRun);
      expect(values[n], where).toBe(T / trialRun[n - 1]);
      expect(values[n + 1], where).toBe(trial * values[n]);
      expect(savingsBalances(`pays £$${values[n + 1]}$ into a savings account ${text}`, n, where)[n - 1], where).toBe(T);
    }
  });

  it('seq-target-table: balances and gaps follow the plan, and the last row is the first one past the target', () => {
    for (const { slide, seed, difficulty } of draws('seq-target-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const T = stated(text, /target is £\$(\d+)\$/);
      const rows = merged(slide).map((row) => row.map(Number));
      const B = savingsBalances(text, rows.length, where);
      expect(rows, where).toEqual(B.map((b, k) => [k + 1, b, b - T]));
      expect(rows.map((row) => row[2] > 0), where).toEqual(rows.map((_, k) => k === rows.length - 1));
    }
  });
});

describe('level 6, lesson 4: arithmetic or geometric', () => {
  const modelFn = (tex: string) => {
    const f = fn(tex.replace(/^u_n = /, ''));
    return (n: number) => f({ n });
  };

  it('seq-model-check: the path names how the story grows and how the model does, and a matching model matches every value', () => {
    for (const difficulty of DIFFICULTIES) {
      const seen = new Set<string>();
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const slide = draw('seq-model-check', seed, difficulty);
        if (slide.kind !== 'flow') throw new Error('not a flow');
        const where = `seed ${seed}, difficulty ${difficulty}`;
        const { geo, values } = storyValues(prose(slide.prompt), 4, where);
        const model = modelFn(slide.subject);
        const modelGeo = slide.subject.includes('\\times');
        const [adds, multiplies] = ['Adds the same amount', 'Multiplies by the same factor'];
        expect(slide.answer, where).toEqual([geo ? multiplies : adds, modelGeo ? multiplies : adds]);
        const fits = values.every((value, i) => Math.abs(model(i + 1) - value) < 1e-6);
        expect(fits, where).toBe(geo === modelGeo);
        expect([model(1), model(2)], `${where}: a wrong model still starts right`).toEqual([values[0], values[1]].map((v) => expect.closeTo(v, 6)));
        seen.add(`${geo} ${modelGeo}`);
      }
      expect(seen.size, `difficulty ${difficulty}`).toBe(4);
    }
  });

  it('seq-model-pick: the right model gives the story values and every other option misses one', () => {
    for (const { slide, seed, difficulty } of draws('seq-model-pick')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const { values } = storyValues(prose(slide.prompt), 4, where);
      for (const option of slide.options) {
        const model = modelFn(option.label);
        const fits = values.every((value, i) => Math.abs(model(i + 1) - value) < 1e-6);
        expect(fits, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('seq-model-total-tiles: the sum picked comes to the story total, and so does the value', () => {
    for (const { slide, seed, difficulty } of draws('seq-model-total-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const k = stated(slide.template, /^S_(\d) =/);
      const { values } = storyValues(prose(slide.prompt), k, where);
      expect(fn(slide.answer[0])({}), `${where}: ${slide.answer[0]}`).toBeCloseTo(added(values), 6);
      expect(Number(slide.answer[1]), where).toBe(added(values));
      expect(added(values), where).toBeLessThanOrEqual(6000);
    }
  });

  it('seq-model-table: values and running totals follow the story, read the way it grows', () => {
    for (const { slide, seed, difficulty } of draws('seq-model-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const rows = merged(slide).map((row) => row.map(Number));
      const { values } = storyValues(prose(slide.prompt), rows.length, where);
      expect(rows, where).toEqual(values.map((u, i) => [i + 1, u, added(values.slice(0, i + 1))]));
    }
  });
});

describe('level 6, lesson 5: two plans compared', () => {
  it('seq-plans-table: each plan pays what its rule says', () => {
    for (const { slide, seed, difficulty } of draws('seq-plans-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const rows = merged(slide).map((row) => row.map(Number));
      const { A, B } = plansFrom(prose(slide.prompt), rows.length, where);
      expect(rows, where).toEqual(A.map((x, i) => [i + 1, x, B[i]]));
    }
  });

  it('seq-plans-overtake: the answer is the first year Plan B pays more', () => {
    for (const { slide, seed, difficulty } of draws('seq-plans-overtake')) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const { A, B } = plansFrom(prose(slide.prompt), slide.max, where);
      expect(slide.answer, where).toBe(B.findIndex((x, i) => x > A[i]) + 1);
      expect(slide.answer, where).toBeGreaterThanOrEqual(3);
    }
  });

  it('seq-plans-which: the right option names the plan that pays more and by how much', () => {
    for (const { slide, seed, difficulty } of draws('seq-plans-which')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const year = text.match(/In year \$(\d+)\$/);
      const N = year ? Number(year[1]) : stated(text, /first \$(\d+)\$ years/);
      const { A, B } = plansFrom(text, N, where);
      const [x, y] = year ? [A[N - 1], B[N - 1]] : [added(A), added(B)];
      expect(choiceAnswer(slide), where).toBe(`Plan ${x > y ? 'A' : 'B'}, by £${Math.abs(x - y)}`);
    }
  });

  it('seq-plans-total-tree: both totals and the gap between them', () => {
    for (const { slide, seed, difficulty } of draws('seq-plans-total-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const where = `seed ${seed}, difficulty ${difficulty}`;
      const text = prose(slide.prompt);
      const { A, B } = plansFrom(text, stated(text, /first \$(\d+)\$ years/), where);
      expect(slide.answer.map(Number), where).toEqual([added(A), added(B), Math.abs(added(A) - added(B))]);
      expect(Math.max(added(A), added(B)), where).toBeLessThanOrEqual(6000);
    }
  });
});

describe('level 6: every number in a slide', () => {
  it('is whole, apart from a multiplier or a rate written as a decimal', () => {
    const ids = Object.keys(registry).filter((id) => /^seq-(save|loan|target|model|plans)-/.test(id) && !id.includes('+'));
    expect(ids).toHaveLength(20);
    const decimals = new Set(['1.1', '1.2', '1.25', '1.5', '0.1', '0.2', '0.25', '0.5']);
    for (const id of ids) {
      for (const { slide, seed, difficulty } of draws(id)) {
        // A figure's coordinates are drawing, not numbers the learner reads.
        const { solution: _, figure: __, ...question } = slide as Slide & { solution?: unknown; figure?: unknown };
        const numbers = JSON.stringify(question).match(/\d+(\.\d+)?/g) ?? [];
        for (const number of numbers) {
          expect(Number(number), `${id}, seed ${seed}, difficulty ${difficulty}: ${number}`).toBeLessThan(10000);
          if (number.includes('.')) expect(decimals.has(number), `${id}, seed ${seed}, difficulty ${difficulty}: ${number}`).toBe(true);
        }
      }
    }
  });
});
