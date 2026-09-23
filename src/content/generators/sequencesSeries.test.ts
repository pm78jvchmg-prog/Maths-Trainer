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
