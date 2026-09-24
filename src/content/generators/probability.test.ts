/**
 * An independent check on Probability levels 1 and 2.
 *
 * The oracle in `generators.test.ts` differentiates a `source`, and nothing
 * here declares one: a probability is a count over a count. So these tests
 * read each question back off the rendered slide — the bag, the dice, the
 * table, the Venn diagram's regions, the labels on a tree — rebuild the sample
 * space from what the learner is shown, count it again, and compare with the
 * answer the slide grades against. Nothing is taken from the generator's own
 * counting helpers, which would only prove it agrees with itself.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import { probabilityGenerators } from './probability';

const SEEDS = 200;

function generator(id: string): Generator<unknown> {
  const found = probabilityGenerators.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found;
}

function slides(id: string): Slide[] {
  const g = generator(id);
  return [1, 2].flatMap((difficulty) => Array.from({ length: SEEDS }, (_, seed) => g.render(g.sample(makeRng(seed), difficulty))));
}

/** A tile, a label or a typed answer as a number: `\frac{3}{8}`, `3/8`, `0.375` or `((3)/(8))`. */
function value(token: string): number {
  const frac = /^\\frac\{(\d+)\}\{(\d+)\}$/.exec(token.trim());
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return math.evaluate(token) as number;
}

/** A fraction in lowest terms, or a whole number or decimal, which has none. */
function lowest(token: string): boolean {
  const frac = /^\\frac\{(\d+)\}\{(\d+)\}$/.exec(token.trim());
  if (!frac) return true;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  return gcd(Number(frac[1]), Number(frac[2])) === 1;
}

const proseOf = (slide: Slide): string =>
  slide.kind === 'teach' ? '' : slide.prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' ');

const svgOf = (slide: Slide): string =>
  slide.kind === 'teach' ? '' : slide.prompt.map((block) => (block.kind === 'diagram' ? block.svg : '')).join('');

const typed = (slide: Slide): number => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression slide, got ${slide.kind}`);
  return value(slide.answer);
};

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

describe('bags of coloured objects', () => {
  /** Every object in the bag, one entry each, read from "holds 5 red, 3 blue and 4 green counters". */
  function bagOf(prose: string): string[] {
    const held = /holds (.+?) [a-z]+\. One/.exec(prose);
    if (!held) throw new Error(`no bag in: ${prose}`);
    return held[1]
      .split(/, | and /)
      .flatMap((part) => {
        const [count, colour] = part.split(' ');
        return Array.from({ length: Number(count) }, () => colour);
      });
  }

  /** "red", "red or blue", "not red". */
  const matches = (event: string) => (colour: string) =>
    event.startsWith('not ') ? colour !== event.slice(4) : event.split(' or ').includes(colour);

  it('counts the bag again for prob-bag-fraction', () => {
    for (const slide of slides('prob-bag-fraction')) {
      const prose = proseOf(slide);
      const bag = bagOf(prose);
      const event = /probability that it is (.+)\.$/.exec(prose)![1];
      expect(typed(slide), prose).toBeCloseTo(bag.filter(matches(event)).length / bag.length, 12);
    }
  });

  it('writes favourable over total, then cancels it, for prob-cancel-tiles', () => {
    for (const slide of slides('prob-cancel-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const prose = proseOf(slide);
      const bag = bagOf(prose);
      const event = /probability that it is (.+) as favourable/.exec(prose)![1];
      const fav = bag.filter(matches(event)).length;
      expect(slide.answer[0], prose).toBe(`\\frac{${fav}}{${bag.length}}`);
      expect(value(slide.answer[1])).toBeCloseTo(fav / bag.length, 12);
      expect(lowest(slide.answer[1]), slide.answer[1]).toBe(true);
      expect(slide.answer[1]).not.toBe(slide.answer[0]);
    }
  });
});

describe('sample spaces of two objects', () => {
  /** The faces of one object, from "a fair coin", "a fair six-sided die" or "numbered 1 to 5". */
  function facesOf(phrase: string): (string | number)[] {
    if (/coin/.test(phrase)) return ['H', 'T'];
    const range = /numbered 1 to (\d+)/.exec(phrase);
    const n = range ? Number(range[1]) : /six-sided/.test(phrase) ? 6 : NaN;
    if (!Number.isFinite(n)) throw new Error(`no faces in: ${phrase}`);
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  /** Both objects, from the opening sentence of the question. */
  function objectsOf(sentence: string): [(string | number)[], (string | number)[]] {
    if (sentence.startsWith('Two ')) {
      const one = facesOf(sentence);
      return [one, one];
    }
    const [a, b] = sentence.split(' and a fair ');
    return [facesOf(a), facesOf(b)];
  }

  /** The event, from the words the learner reads. */
  function eventOf(words: string): (x: string | number, y: string | number) => boolean {
    const n = (m: RegExpExecArray | null) => Number(m![1]);
    let m: RegExpExecArray | null;
    if (words === 'a head and an even number') return (x, y) => x === 'H' && Number(y) % 2 === 0;
    if (words === 'a tail and an odd number') return (x, y) => x === 'T' && Number(y) % 2 === 1;
    if ((m = /^a head and a (\d+)$/.exec(words))) return (x, y) => x === 'H' && y === n(m);
    if ((m = /^a tail and a number greater than (\d+)$/.exec(words))) return (x, y) => x === 'T' && Number(y) > n(m);
    if (words === 'two heads') return (x, y) => x === 'H' && y === 'H';
    if (words === 'one head and one tail') return (x, y) => x !== y;
    if ((m = /^a total of (\d+)$/.exec(words))) return (x, y) => Number(x) + Number(y) === n(m);
    if ((m = /^a total greater than (\d+)$/.exec(words))) return (x, y) => Number(x) + Number(y) > n(m);
    if ((m = /^a difference of (\d+) between the two scores$/.exec(words))) return (x, y) => Math.abs(Number(x) - Number(y)) === n(m);
    if ((m = /^a product greater than (\d+)$/.exec(words))) return (x, y) => Number(x) * Number(y) > n(m);
    if (words === 'the same number on both') return (x, y) => x === y;
    if (words === 'an even product') return (x, y) => (Number(x) * Number(y)) % 2 === 0;
    throw new Error(`unknown event: ${words}`);
  }

  function recount(prose: string) {
    const parsed = /^(.+?\.) Find the probability of (.+?)\.(?: Top row|$)/.exec(prose);
    if (!parsed) throw new Error(`cannot read: ${prose}`);
    const [first, second] = objectsOf(parsed[1]);
    const event = eventOf(parsed[2]);
    let fav = 0;
    for (const x of first) for (const y of second) if (event(x, y)) fav += 1;
    return { m: first.length, n: second.length, fav, total: first.length * second.length };
  }

  it('lists the sample space again for prob-space-event', () => {
    for (const slide of slides('prob-space-event')) {
      const { fav, total } = recount(proseOf(slide));
      expect(fav).toBeGreaterThan(0);
      expect(fav).toBeLessThan(total);
      expect(typed(slide), proseOf(slide)).toBeCloseTo(fav / total, 12);
    }
  });

  it('fills every node of prob-space-tree from the recount', () => {
    for (const slide of slides('prob-space-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const { m, n, fav, total } = recount(proseOf(slide));
      const [a, b, f, t, p] = slide.answer.map(value);
      expect([a, b, f, t], proseOf(slide)).toEqual([m, n, fav, total]);
      expect(p).toBeCloseTo(fav / total, 12);
      expect(lowest(slide.answer[4])).toBe(true);
    }
  });

  it('recomputes every blank of prob-space-table, and its probabilities sum to 1', () => {
    for (const slide of slides('prob-space-table')) {
      if (slide.kind !== 'table') throw new Error('expected a table');
      const prose = proseOf(slide);
      const tally = new Map<number, number>();
      let total = 0;
      const coins = /^(Two|Three) fair coins/.exec(prose);
      if (coins) {
        const k = coins[1] === 'Two' ? 2 : 3;
        for (let mask = 0; mask < 2 ** k; mask += 1) {
          const heads = mask.toString(2).split('').filter((c) => c === '1').length;
          tally.set(heads, (tally.get(heads) ?? 0) + 1);
          total += 1;
        }
      } else {
        const m = /one numbered (.+?) and one numbered (.+?), are spun and the (scores added|difference)/.exec(prose);
        if (!m) throw new Error(`cannot read: ${prose}`);
        const a = m[1].match(/\d+/g)!.map(Number);
        const b = m[2].match(/\d+/g)!.map(Number);
        for (const x of a) {
          for (const y of b) {
            const v = m[3] === 'scores added' ? x + y : Math.abs(x - y);
            tally.set(v, (tally.get(v) ?? 0) + 1);
            total += 1;
          }
        }
      }
      expect(slide.rows.map((row) => Number(row[0])), prose).toEqual([...tally.keys()].sort((p, q) => p - q));
      const fills = [...slide.answer];
      let probabilities = 0;
      for (const row of slide.rows) {
        const ways = tally.get(Number(row[0]))!;
        const waysCell = row[1] ?? fills.shift()!;
        const pCell = row[2] ?? fills.shift()!;
        expect(value(waysCell), prose).toBe(ways);
        expect(value(pCell), prose).toBeCloseTo(ways / total, 12);
        expect(lowest(pCell), pCell).toBe(true);
        probabilities += value(pCell);
      }
      expect(fills).toEqual([]);
      expect(probabilities).toBeCloseTo(1, 12);
    }
  });
});

describe('two-way tables', () => {
  it('completes prob-twoway-fill so that every total agrees', () => {
    for (const slide of slides('prob-twoway-fill')) {
      if (slide.kind !== 'table') throw new Error('expected a table');
      const prose = proseOf(slide);
      const fills = [...slide.answer];
      const grid = slide.rows.map((row) => row.slice(1).map((cell) => value(cell ?? fills.shift()!)));
      expect(fills).toEqual([]);
      const body = grid.slice(0, -1);
      const totals = grid[grid.length - 1];
      expect(slide.rows[slide.rows.length - 1][0]).toBe('\\text{Total}');
      totals.forEach((t, col) => expect(t, prose).toBe(sum(body.map((row) => row[col]))));
      const everyone = Number(/(?:shows how|There are) (\d+)/.exec(prose)![1]);
      expect(sum(totals), prose).toBe(everyone);
      const rowTotal = /(\d+) of them /.exec(prose);
      if (rowTotal) expect(body.map(sum), prose).toContain(Number(rowTotal[1]));
      for (const row of grid) for (const cell of row) expect(cell).toBeGreaterThan(0);
    }
  });

  it('recounts the people in a group for prob-cond-table', () => {
    const g = generator('prob-cond-table');
    for (const difficulty of [1, 2]) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const params = g.sample(makeRng(seed), difficulty) as {
          cells: number[];
          row: number;
          col: number;
          given: 'row' | 'col';
        };
        // One entry per person, [row, column], then the group the question gives.
        const people = params.cells.flatMap((count, i) => Array.from({ length: count }, () => [Math.floor(i / 2), i % 2]));
        const group = people.filter(([r, c]) => (params.given === 'row' ? r === params.row : c === params.col));
        const both = group.filter(([r, c]) => r === params.row && c === params.col);
        expect(typed(g.render(params))).toBeCloseTo(both.length / group.length, 12);
      }
    }
  });
});

describe('Venn diagrams', () => {
  /** Only A, both, only B, neither: read from the diagram's own description. */
  function regionsOf(svg: string): number[] {
    const m = /: (\d+) in \S+ only, (\d+) in both, (\d+) in \S+ only, (\d+) in neither/.exec(svg);
    if (!m) throw new Error('no regions in the diagram');
    return m.slice(1).map(Number);
  }

  it('shows regions that add up to the total in the question', () => {
    for (const slide of slides('prob-venn-union')) {
      const [a, b, c, d] = regionsOf(svgOf(slide));
      const everyone = Number(/shows (\d+)/.exec(proseOf(slide))![1]);
      expect(a + b + c + d, proseOf(slide)).toBe(everyone);
    }
  });

  it('reads the asked-for regions off the diagram for prob-venn-union', () => {
    for (const slide of slides('prob-venn-union')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const [a, b, c, d] = regionsOf(svgOf(slide));
      const total = a + b + c + d;
      const lead = slide.lead!.replace(/ =$/, '');
      const wanted: Record<string, number> = {};
      const [A, B] = /The Venn diagram shows \d+ \w+\. \$(\w)\$ is the set who .+ and \$(\w)\$ the set/.exec(proseOf(slide))!.slice(1);
      wanted[`P(${A})`] = a + b;
      wanted[`P(${A} \\cap ${B})`] = b;
      wanted[`P(${A} \\cup ${B})`] = a + b + c;
      wanted[`P(${A} \\cap ${B}')`] = a;
      wanted[`P((${A} \\cup ${B})')`] = d;
      wanted['P(\\text{exactly one})'] = a + c;
      expect(wanted[lead], lead).toBeDefined();
      expect(typed(slide), lead).toBeCloseTo(wanted[lead] / total, 12);
    }
  });

  it('places the counts in their regions for prob-venn-tree', () => {
    for (const slide of slides('prob-venn-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const prose = proseOf(slide);
      const m = /Of (\d+) \w+, (\d+) .+?, (\d+) .+?, and (\d+) do both/.exec(prose);
      if (!m) throw new Error(`cannot read: ${prose}`);
      const [total, inA, inB, both] = m.slice(1).map(Number);
      const union = inA + inB - both;
      // Rebuilt as regions and checked the way the diagram would be drawn.
      const regions = [inA - both, both, inB - both, total - union];
      expect(sum(regions)).toBe(total);
      for (const r of regions) expect(r).toBeGreaterThanOrEqual(0);
      const got = slide.answer.map(value);
      const want = slide.answer.length === 5 ? [regions[0], regions[2], union, regions[3], regions[3] / total] : [regions[0], regions[2], union, union / total];
      want.forEach((w, i) => expect(got[i], prose).toBeCloseTo(w, 12));
    }
  });
});

describe('tree diagrams', () => {
  /** The branch labels of a two-stage tree: first stage, then under each first branch. */
  function branchesOf(svg: string): (number | undefined)[] {
    const texts = [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    // First stage, then per first branch: its name, two labels, two names.
    return [texts[0], texts[1], texts[3], texts[4], texts[8], texts[9]].map((t) => (t === '' ? undefined : value(t)));
  }

  /** P(A), P(B), with any blank branch completed from its partner. */
  function probabilities(slide: Slide): [number, number] {
    const [p, pc, q, qc, q2, qc2] = branchesOf(svgOf(slide));
    if (p !== undefined && pc !== undefined) expect(p + pc).toBeCloseTo(1, 12);
    if (q !== undefined && qc !== undefined) expect(q + qc).toBeCloseTo(1, 12);
    // Independent events: the second stage is the same under either branch.
    expect(q2).toBe(q);
    expect(qc2).toBe(qc);
    return [p ?? 1 - pc!, q ?? 1 - qc!];
  }

  const ids = ['prob-tree-read', 'prob-tree-atleast', 'prob-tree-same-steps', 'prob-tree-exactly-tiles'];

  it('draws branches that sum to 1 from every point', () => {
    for (const id of ids) {
      for (const slide of slides(id)) {
        const [p, q] = probabilities(slide);
        const ends = [p * q, p * (1 - q), (1 - p) * q, (1 - p) * (1 - q)];
        expect(sum(ends)).toBeCloseTo(1, 12);
      }
    }
  });

  it('multiplies along the path asked for in prob-tree-read', () => {
    for (const slide of slides('prob-tree-read')) {
      const [p, q] = probabilities(slide);
      const m = /Find \$P\((A'?) \\cap (B'?)\)\$/.exec(proseOf(slide));
      if (!m) throw new Error(`cannot read: ${proseOf(slide)}`);
      const want = (m[1] === 'A' ? p : 1 - p) * (m[2] === 'B' ? q : 1 - q);
      expect(typed(slide)).toBeCloseTo(want, 12);
    }
  });

  it('works "at least one" from "neither" in prob-tree-atleast', () => {
    for (const slide of slides('prob-tree-atleast')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const [p, q] = probabilities(slide);
      const want = [1 - p, 1 - q, (1 - p) * (1 - q), 1 - (1 - p) * (1 - q)];
      slide.answer.map(value).forEach((got, i) => expect(got).toBeCloseTo(want[i], 12));
    }
  });

  it('adds the two mixed paths in prob-tree-exactly-tiles', () => {
    for (const slide of slides('prob-tree-exactly-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [p, q] = probabilities(slide);
      const got = slide.answer.map(value);
      expect(got[0] * got[1] + got[2] * got[3]).toBeCloseTo(got[4], 12);
      expect(got[4]).toBeCloseTo(p * (1 - q) + (1 - p) * q, 12);
    }
  });
});

describe('without replacement', () => {
  /** Every ordered pair of two different objects from the bag, as colours. */
  function draws(prose: string): { pairs: [string, string][]; colours: [string, string] } {
    const m = /holds (\d+) (\w+) and (\d+) (\w+) \w+\. Two are taken/.exec(prose);
    if (!m) throw new Error(`cannot read: ${prose}`);
    const colours: [string, string] = [m[2], m[4]];
    const bag = [...Array.from({ length: Number(m[1]) }, () => m[2]), ...Array.from({ length: Number(m[3]) }, () => m[4])];
    const pairs: [string, string][] = [];
    bag.forEach((x, i) => bag.forEach((y, j) => i !== j && pairs.push([x, y])));
    return { pairs, colours };
  }

  it('counts ordered pairs for prob-norepl-tree', () => {
    for (const slide of slides('prob-norepl-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const prose = proseOf(slide);
      const { pairs, colours } = draws(prose);
      const mixed = /one of each colour/.test(prose);
      const hits = pairs.filter(([x, y]) => (mixed ? x !== y : x === colours[0] && y === colours[0]));
      expect(value(slide.answer[2]), prose).toBeCloseTo(hits.length / pairs.length, 12);
      expect(lowest(slide.answer[2])).toBe(true);
      const [x, y] = slide.answer.slice(0, 2).map(value);
      expect(mixed ? x + y : x * y).toBeCloseTo(hits.length / pairs.length, 12);
    }
  });

  it('counts ordered pairs for prob-norepl-tiles', () => {
    for (const slide of slides('prob-norepl-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const prose = proseOf(slide);
      const { pairs } = draws(prose);
      const m = /the first is (\w+) and the second is (\w+)\./.exec(prose)!;
      const hits = pairs.filter(([x, y]) => x === m[1] && y === m[2]);
      const [x, y, product] = slide.answer.map(value);
      expect(product, prose).toBeCloseTo(hits.length / pairs.length, 12);
      expect(x * y).toBeCloseTo(product, 12);
      expect(lowest(slide.answer[2])).toBe(true);
      // The factors are as the draws are made, uncancelled: out of n, then n - 1.
      const n = Number(/\\frac\{\d+\}\{(\d+)\}/.exec(slide.answer[0])![1]);
      expect(n).toBe(Math.round(Math.sqrt(pairs.length + 0.25) + 0.5));
      expect(slide.answer[1]).toMatch(new RegExp(`\\{${n - 1}\\}$`));
    }
  });
});
