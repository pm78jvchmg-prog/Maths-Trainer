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

/* ================================================================
 * Level 3: trees and Venn diagrams read back off the picture
 * ================================================================ */

/** The label on every branch of a staged tree, keyed `stage.index`. */
function branchLabels(svg: string): Map<string, string> {
  return new Map([...svg.matchAll(/<text data-branch="(\d+\.\d+)"[^>]*>([^<]*)<\/text>/g)].map((m) => [m[1], m[2]]));
}

/** The outcome name at the end of every branch, keyed the same way. */
function branchNames(svg: string): Map<string, string> {
  return new Map([...svg.matchAll(/<text data-name="(\d+\.\d+)"[^>]*>([^<]*)<\/text>/g)].map((m) => [m[1], m[2]]));
}

/** Plain-text labels: `2/5`, `0.35`. */
const plainValue = (label: string): number => {
  const [p, q] = label.split('/');
  return q === undefined ? Number(p) : Number(p) / Number(q);
};

/** Each region of a Venn diagram, from its own description: the sets it lies in, and its label. */
function vennRegionsOf(svg: string): { sets: Set<string>; label: string }[] {
  const described = /aria-label="A Venn diagram of [^:]+: ([^"]*)"/.exec(svg);
  if (!described) throw new Error('no Venn diagram');
  return described[1].split(', ').map((part) => {
    const [label, place] = part.split(' in ');
    const all = /^A Venn diagram of (.+?):/.exec(svg.slice(svg.indexOf('A Venn diagram')))![1].split(/, | and /);
    let sets: string[];
    if (place === 'neither' || place === 'none') sets = [];
    else if (place === 'both' || place === 'all three') sets = all;
    else sets = place.replace(/ only$/, '').split(' and ');
    return { sets: new Set(sets), label: label === 'nothing' ? '' : label };
  });
}

/** An event, from the words or the TeX the learner reads, as a test on the sets a region lies in. */
function eventTest(event: string): (sets: Set<string>) => boolean {
  const e = event.replace(/\$/g, '').replace(/^P\((.*)\)$/, '$1').trim();
  const text = /^\\text\{(.+)\}$/.exec(e)?.[1] ?? e.replace(/^is /, '').replace(/^in /, 'in ');
  let m: RegExpExecArray | null;
  const size = (s: Set<string>) => s.size;
  if (/^(none|neither|in none of the sets|in neither set)$/.test(text)) return (s) => size(s) === 0;
  if (/^(exactly one|in exactly one set)$/.test(text)) return (s) => size(s) === 1;
  if (/^(exactly two|in exactly two sets)$/.test(text)) return (s) => size(s) === 2;
  if (/^(at least two|in at least two sets)$/.test(text)) return (s) => size(s) >= 2;
  if (/^(at least one|in at least one set)$/.test(text)) return (s) => size(s) >= 1;
  if (text === 'in all three sets') return (s) => size(s) === 3;
  if ((m = /^in (\w) only$/.exec(text)) || (m = /^(\w) \\text\{ only\}$/.exec(e))) {
    const x = m[1];
    return (s) => size(s) === 1 && s.has(x);
  }
  if ((m = /^in (\w) and (\w) but not (\w)$/.exec(text))) {
    const [x, y, z] = m.slice(1);
    return (s) => s.has(x) && s.has(y) && !s.has(z);
  }
  if ((m = /^in (\w) or (\w) but not (\w)$/.exec(text))) {
    const [x, y, z] = m.slice(1);
    return (s) => (s.has(x) || s.has(y)) && !s.has(z);
  }
  if ((m = /^in (\w) or (\w) or both$/.exec(text))) {
    const [x, y] = m.slice(1);
    return (s) => s.has(x) || s.has(y);
  }
  if ((m = /^in both (\w) and (\w)$/.exec(text))) {
    const [x, y] = m.slice(1);
    return (s) => s.has(x) && s.has(y);
  }
  if ((m = /^in (\w) but not (\w)$/.exec(text))) {
    const [x, y] = m.slice(1);
    return (s) => s.has(x) && !s.has(y);
  }
  if ((m = /^not in (\w)$/.exec(text))) {
    const x = m[1];
    return (s) => !s.has(x);
  }
  if ((m = /^in (\w)$/.exec(text))) {
    const x = m[1];
    return (s) => s.has(x);
  }
  // Set notation: A, A', A \cup B, A \cap B', A \cap B \cap C.
  const atom = (a: string) => {
    const x = a.replace(/'$/, '');
    return a.endsWith("'") ? (s: Set<string>) => !s.has(x) : (s: Set<string>) => s.has(x);
  };
  if (e.includes(' \\cup ')) {
    const parts = e.split(' \\cup ').map(atom);
    return (s) => parts.some((p) => p(s));
  }
  if (/^\w'?( \\cap \w'?)*$/.test(e)) {
    const parts = e.split(' \\cap ').map(atom);
    return (s) => parts.every((p) => p(s));
  }
  throw new Error(`unknown event: ${event}`);
}

/** How many a diagram of counts puts in an event. */
const countIn = (regions: { sets: Set<string>; label: string }[], event: string): number =>
  sum(regions.filter((r) => eventTest(event)(r.sets)).map((r) => Number(r.label)));

const tableOf = (slide: Slide): { rows: (string | null)[][]; answer: string[] } => {
  if (slide.kind !== 'table') throw new Error(`expected a table, got ${slide.kind}`);
  return slide;
};

describe('trees from words', () => {
  interface Read {
    /** Every ordered pair of draws, as letters, equally likely; or for events, P(first) and P(second). */
    pairs?: [string, string][];
    letters: [string, string];
    colours?: Map<string, string>;
    p?: number;
    q?: number;
    replaced?: boolean;
  }

  function read(prose: string): Read {
    const bag = /holds (\d+) (\w+) and (\d+) (\w+) \w+\. One \w+ is taken at random and (put back|not put back), then a second is taken\. \$(\w)\$ stands for (\w+) and \$(\w)\$ for (\w+)\./.exec(prose);
    if (bag) {
      // Letter to colour, from "$R$ stands for red and $G$ for green".
      const colours = new Map([
        [bag[6], bag[7]],
        [bag[8], bag[9]],
      ]);
      const letterOf = (colour: string) => [...colours.entries()].find(([, c]) => c === colour)![0];
      const objects = [...Array.from({ length: Number(bag[1]) }, () => letterOf(bag[2])), ...Array.from({ length: Number(bag[3]) }, () => letterOf(bag[4]))];
      const replaced = bag[5] === 'put back';
      const pairs: [string, string][] = [];
      objects.forEach((x, i) => objects.forEach((y, j) => (replaced || i !== j) && pairs.push([x, y])));
      return { pairs, letters: [letterOf(bag[2]), letterOf(bag[4])], colours, replaced };
    }
    const events = /probability that .+? is \$([\d.]+)\$; call this event \$(\w)\$\. Independently, the probability that .+? is \$([\d.]+)\$; call this \$(\w)\$\./.exec(prose);
    if (!events) throw new Error(`cannot read: ${prose}`);
    return { letters: [events[2], events[4]], p: Number(events[1]), q: Number(events[3]) };
  }

  /** P(first is x, second is y), x and y as the tree names them. */
  function pathP(r: Read, x: string, y: string): number {
    if (r.pairs) return r.pairs.filter(([a, b]) => a === x && b === y).length / r.pairs.length;
    const first = x.endsWith("'") ? 1 - r.p! : r.p!;
    const second = y.endsWith("'") ? 1 - r.q! : r.q!;
    return first * second;
  }

  it('labels every branch of prob-tree-branches from a recount', () => {
    for (const slide of slides('prob-tree-branches')) {
      const r = read(proseOf(slide));
      const names = branchNames(svgOf(slide));
      const labels = branchLabels(svgOf(slide));
      const { rows, answer } = tableOf(slide);
      // The table's rows are the letters on the tree, a to f, top to bottom.
      const keys = ['0.0', '0.1', '1.0', '1.1', '1.2', '1.3'];
      expect(rows.map((row) => row[0])).toEqual(keys.map((k) => labels.get(k)));
      const got = answer.map(value);
      const first = [names.get('0.0')!, names.get('0.1')!];
      const second = [names.get('1.0')!, names.get('1.1')!];
      const pFirst = first.map((x) => second.reduce((s, y) => s + pathP(r, x, y), 0));
      const want = [...pFirst, ...first.flatMap((x, i) => second.map((y) => pathP(r, x, y) / pFirst[i]))];
      want.forEach((w, i) => expect(got[i], `${proseOf(slide)} branch ${keys[i]}`).toBeCloseTo(w, 12));
      for (let i = 0; i < 6; i += 2) expect(got[i] + got[i + 1]).toBeCloseTo(1, 12);
      for (const token of answer) expect(lowest(token), token).toBe(true);
    }
  });

  it('recounts the event of prob-tree-words', () => {
    for (const slide of slides('prob-tree-words')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const r = read(proseOf(slide));
      const lead = slide.lead!.replace(/ =$/, '');
      const [x, y] = r.letters;
      let want: number;
      if (lead === 'P(\\text{same colour})') want = pathP(r, x, x) + pathP(r, y, y);
      else if (lead === 'P(\\text{one of each})') want = pathP(r, x, y) + pathP(r, y, x);
      else if (/then/.test(lead)) {
        const [c1, c2] = /\\text\{(\w+) then (\w+)\}/.exec(lead)!.slice(1);
        const letter = (c: string) => [...r.colours!.entries()].find(([, colour]) => colour === c)![0];
        want = pathP(r, letter(c1), letter(c2));
      } else {
        const [a, b] = /^P\((\w'?) \\cap (\w'?)\)$/.exec(lead)!.slice(1);
        want = pathP(r, a, b);
      }
      expect(typed(slide), `${proseOf(slide)} ${lead}`).toBeCloseTo(want, 12);
      // The tree is drawn bare: the learner labels it.
      expect([...branchLabels(svgOf(slide)).values()].every((label) => label === '')).toBe(true);
    }
  });

  it('walks the right forks of prob-replace-flow', () => {
    for (const slide of slides('prob-replace-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const prose = proseOf(slide);
      const r = read(prose);
      const [x, y] = r.letters;
      const mixed = slide.subject === 'P(\\text{one of each})';
      expect(slide.answer[0].startsWith('Yes'), prose).toBe(r.replaced);
      const branch = /\$\\frac\{(\d+)\}\{(\d+)\}\$/.exec(slide.answer[1])!;
      const pFirst = pathP(r, x, x) + pathP(r, x, y);
      expect(Number(branch[1]) / Number(branch[2]), prose).toBeCloseTo(pathP(r, x, mixed ? y : x) / pFirst, 12);
      const want = mixed ? pathP(r, x, y) + pathP(r, y, x) : pathP(r, x, x);
      expect(value(slide.answer[2].replace(/\$/g, '')), prose).toBeCloseTo(want, 12);
    }
  });

  it('finds the missing branch of prob-branch-missing from the others', () => {
    for (const slide of slides('prob-branch-missing')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const labels = branchLabels(svgOf(slide));
      const names = branchNames(svgOf(slide));
      const [asked] = /^P\((\w) \\cap/.exec(slide.template)!.slice(1);
      const k = [0, 1, 2].find((i) => names.get(`0.${i}`) === asked)!;
      const first = [0, 1, 2].map((i) => labels.get(`0.${i}`)!);
      expect(first[k]).toBe('?');
      const missing = 1 - sum(first.filter((_, i) => i !== k).map(plainValue));
      const yesLabel = labels.get(`1.${2 * k}`)!;
      const yes = yesLabel === '?' ? 1 - plainValue(labels.get(`1.${2 * k + 1}`)!) : plainValue(yesLabel);
      for (let i = 0; i < 3; i += 1) {
        const pair = [labels.get(`1.${2 * i}`)!, labels.get(`1.${2 * i + 1}`)!];
        if (!pair.includes('?')) expect(sum(pair.map(plainValue))).toBeCloseTo(1, 12);
      }
      const got = slide.answer.map(value);
      expect(got[0]).toBeCloseTo(missing, 12);
      expect(got[1]).toBeCloseTo(yes, 12);
      expect(got[2]).toBeCloseTo(missing * yes, 12);
    }
  });
});

describe('three-stage trees', () => {
  /** P(yes) at each stage, and the letters, read off the tree; every repeat of a stage must agree. */
  function stagesOf(slide: Slide): { p: number[]; yes: string; no: string } {
    const labels = branchLabels(svgOf(slide));
    const names = branchNames(svgOf(slide));
    const p = [0, 1, 2].map((k) => {
      const first = [labels.get(`${k}.0`)!, labels.get(`${k}.1`)!];
      expect(sum(first.map(plainValue))).toBeCloseTo(1, 12);
      for (let j = 0; j < 2 ** (k + 1); j += 2) expect([labels.get(`${k}.${j}`), labels.get(`${k}.${j + 1}`)]).toEqual(first);
      return plainValue(first[0]);
    });
    return { p, yes: names.get('0.0')!, no: names.get('0.1')! };
  }

  /** Every path through the tree with its probability, as a string of letters. */
  function paths(slide: Slide): [string[], number][] {
    const { p, yes, no } = stagesOf(slide);
    const out: [string[], number][] = [];
    for (let mask = 0; mask < 8; mask += 1) {
      const path = [0, 1, 2].map((k) => ((mask >> k) & 1 ? no : yes));
      out.push([path, path.reduce((acc, letter, k) => acc * (letter === yes ? p[k] : 1 - p[k]), 1)]);
    }
    return out;
  }

  it('multiplies the path named in prob-three-path', () => {
    for (const slide of slides('prob-three-path')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const named = /^P\((\w), (\w), (\w)\) =$/.exec(slide.lead!)!.slice(1);
      const [, want] = paths(slide).find(([path]) => path.join() === named.join())!;
      expect(typed(slide)).toBeCloseTo(want, 12);
    }
  });

  it('sums every path with at least one for prob-three-atleast', () => {
    for (const slide of slides('prob-three-atleast')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const want = /at least one \$(\w)\$ in three steps\. Top row/.exec(proseOf(slide))![1];
      const hits = sum(paths(slide).filter(([path]) => path.includes(want)).map(([, p]) => p));
      const got = slide.answer.map(value);
      expect(got[4]).toBeCloseTo(hits, 12);
      expect(got[3]).toBeCloseTo(1 - hits, 12);
    }
  });

  it('ends prob-three-same-steps on the two matching paths', () => {
    for (const slide of slides('prob-three-same-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const want = sum(paths(slide).filter(([path]) => new Set(path).size === 1).map(([, p]) => p));
      expect(value(slide.reductions[slide.reductions.length - 1].value)).toBeCloseTo(want, 12);
    }
  });

  it('adds the right three paths in prob-three-exactly-tiles', () => {
    for (const slide of slides('prob-three-exactly-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [how, letter] = /exactly (one|two) \$(\w)\$/.exec(proseOf(slide))!.slice(1);
      const count = how === 'one' ? 1 : 2;
      const all = paths(slide);
      const want = all.filter(([path]) => path.filter((x) => x === letter).length === count);
      expect(want.length).toBe(3);
      const got = slide.answer.map(value);
      expect(got[3]).toBeCloseTo(sum(want.map(([, p]) => p)), 12);
      // Each term is the path the working names, in the order it names them.
      const display = slide.prompt.find((b) => b.kind === 'display');
      const named = [...(display && display.kind === 'display' ? display.tex : '').matchAll(/P\((\w), (\w), (\w)\)/g)].map((m) => m.slice(1).join());
      named.forEach((path, i) => expect(got[i]).toBeCloseTo(all.find(([p]) => p.join() === path)![1], 12));
    }
  });
});

describe('two-set Venn diagrams from totals', () => {
  /** The four regions, found by trying every overlap until the totals agree. */
  function solve(prose: string): { A: string; B: string; regions: number[] } {
    const m = /^Of (\d+) \w+, (\d+) .+?, (\d+) .+?, and (\d+) do (both|neither)\./.exec(prose);
    if (!m) throw new Error(`cannot read: ${prose}`);
    const [total, nA, nB, given] = m.slice(1, 5).map(Number);
    const fits: number[][] = [];
    for (let both = 0; both <= Math.min(nA, nB); both += 1) {
      const regions = [nA - both, both, nB - both, total - (nA + nB - both)];
      if (regions.some((r) => r < 0)) continue;
      if ((m[5] === 'both' ? regions[1] : regions[3]) === given) fits.push(regions);
    }
    expect(fits.length, prose).toBe(1);
    const letters = /\$(\w)\$ is the set who .+? and \$(\w)\$ the set/.exec(prose);
    return { A: letters?.[1] ?? '', B: letters?.[2] ?? '', regions: fits[0] };
  }

  const named = (A: string, B: string, regions: number[]): Record<string, number> => ({
    '\\text{both}': regions[1],
    [`${A} \\text{ only}`]: regions[0],
    [`${B} \\text{ only}`]: regions[2],
    '\\text{neither}': regions[3],
    '\\text{at least one}': regions[0] + regions[1] + regions[2],
  });

  it('fills every row of prob-venn-regions-table', () => {
    for (const slide of slides('prob-venn-regions-table')) {
      const { regions } = solve(proseOf(slide));
      const [A, B] = /A Venn diagram of (\w) and (\w)/.exec(svgOf(slide))!.slice(1);
      const { rows, answer } = tableOf(slide);
      rows.forEach((row, i) => expect(value(answer[i]), `${proseOf(slide)} ${row[0]}`).toBe(named(A, B, regions)[row[0]!]));
    }
  });

  it('steps through the right counts in prob-venn-start-flow', () => {
    for (const slide of slides('prob-venn-start-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const prose = proseOf(slide);
      const [a, b, c, d] = solve(prose).regions;
      const numbers = slide.answer.filter((label) => label.startsWith('$')).map((label) => Number(label.replace(/\$/g, '')));
      expect(numbers, prose).toEqual(/do both/.test(prose) ? [a, d] : [a + b + c, b, a]);
    }
  });

  it('types the count asked for in prob-venn-count', () => {
    for (const slide of slides('prob-venn-count')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const { A, B, regions } = solve(proseOf(slide));
      const inside = (sets: Set<string>) => ({ sets, label: '' });
      const cells = [inside(new Set([A])), inside(new Set([A, B])), inside(new Set([B])), inside(new Set())].map((cell, i) => ({ ...cell, label: `${regions[i]}` }));
      const event = /^n\((.*)\) =$/.exec(slide.lead!)![1].replace(/^\((.*)\)'$/, 'none:$1');
      const want = event.startsWith('none:') ? regions[3] : countIn(cells, `P(${event})`);
      expect(typed(slide), `${proseOf(slide)} ${slide.lead}`).toBe(want);
    }
  });

  it('marks only the true list right in prob-venn-match', () => {
    for (const slide of slides('prob-venn-match')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const { regions } = solve(proseOf(slide));
      for (const option of slide.options) expect(option.id === slide.correctId, option.label).toBe(option.label === regions.join(', '));
    }
  });
});

describe('three-set Venn diagrams', () => {
  /** "$F$ is the set who study French, $G$ who study German and $S$ who study Spanish." */
  function keyOf(prose: string): Map<string, string> {
    const m = /\$(\w)\$ is the set who (.+?), \$(\w)\$ who (.+?) and \$(\w)\$ who (.+?)\./.exec(prose);
    if (!m) throw new Error(`no key in: ${prose}`);
    return new Map([
      [m[2], m[1]],
      [m[4], m[3]],
      [m[6], m[5]],
    ]);
  }

  it('fills the regions of prob-venn3-fill by inclusion and exclusion', () => {
    for (const slide of slides('prob-venn3-fill')) {
      const prose = proseOf(slide);
      const regions = vennRegionsOf(svgOf(slide));
      const sets = /A Venn diagram of (\w), (\w), (\w)/.exec(svgOf(slide))!.slice(1);
      const m = /^Of (\d+) \w+, (\d+) [^,]+, (\d+) .+? and (\d+) [^.]+\./.exec(prose)!;
      const [total, nA, nB, nC] = m.slice(1).map(Number);
      const { rows, answer } = tableOf(slide);
      let pairs: number[];
      let triple: number;
      const also = /Also (\d+) .+?, (\d+) .+? and (\d+) .+?; each of these counts includes the (\d+) in all three\./.exec(prose);
      if (also) {
        pairs = also.slice(1, 4).map(Number);
        triple = Number(also[4]);
      } else {
        const inPair = (x: string, y: string) => sum(regions.filter((r) => r.sets.has(x) && r.sets.has(y)).map((r) => Number(r.label)));
        pairs = [inPair(sets[0], sets[1]), inPair(sets[0], sets[2]), inPair(sets[1], sets[2])];
        triple = Number(regions.find((r) => r.sets.size === 3)!.label);
      }
      const n = [nA, nB, nC];
      const want: Record<string, number> = {
        '\\text{none}': total - (nA + nB + nC - sum(pairs) + triple),
        [`${sets[0]} \\text{ only}`]: nA - pairs[0] - pairs[1] + triple,
        [`${sets[1]} \\text{ only}`]: nB - pairs[0] - pairs[2] + triple,
        [`${sets[2]} \\text{ only}`]: nC - pairs[1] - pairs[2] + triple,
        [`${sets[0]} \\cap ${sets[1]} \\text{ only}`]: pairs[0] - triple,
        [`${sets[0]} \\cap ${sets[2]} \\text{ only}`]: pairs[1] - triple,
        [`${sets[1]} \\cap ${sets[2]} \\text{ only}`]: pairs[2] - triple,
      };
      rows.forEach((row, i) => expect(value(answer[i]), `${prose} ${row[0]}`).toBe(want[row[0]!]));
      expect(n.every((x) => x > 0)).toBe(true);
    }
  });

  it('works outward to one set only in prob-venn3-outward', () => {
    for (const slide of slides('prob-venn3-outward')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const prose = proseOf(slide);
      const m = /^Of (\d+) \w+, (\d+) [^.]+\. (\d+) .+? and (\d+) .+?, counting the (\d+) who do all three\./.exec(prose)!;
      const [total, nS, nST, nSU, triple] = m.slice(1).map(Number);
      const middle = vennRegionsOf(svgOf(slide)).find((r) => r.sets.size === 3)!;
      expect(Number(middle.label)).toBe(triple);
      const only = nS - (nST - triple) - (nSU - triple) - triple;
      const want = [nST - triple, nSU - triple, only, only / total];
      slide.answer.map(value).forEach((got, i) => expect(got, prose).toBeCloseTo(want[i], 12));
      expect(only).toBeGreaterThan(0);
    }
  });

  it('solves for x in prob-venn3-missing from the clue given', () => {
    for (const slide of slides('prob-venn3-missing')) {
      const prose = proseOf(slide);
      const regions = vennRegionsOf(svgOf(slide));
      const known = regions.filter((r) => r.label !== 'x');
      const x = regions.find((r) => r.label === 'x')!;
      let want: number;
      let m: RegExpExecArray | null;
      if ((m = /shows (\d+) \w+\./.exec(prose))) {
        want = Number(m[1]) - sum(known.map((r) => Number(r.label)));
      } else if ((m = /Altogether (\d+) are in at least one of the sets\./.exec(prose))) {
        want = Number(m[1]) - sum(known.filter((r) => r.sets.size > 0).map((r) => Number(r.label)));
        expect(x.sets.size).toBeGreaterThan(0);
      } else {
        m = /Altogether (\d+) (.+?)\. \$/.exec(prose)!;
        const letter = keyOf(prose).get(m[2])!;
        expect(x.sets.has(letter), prose).toBe(true);
        want = Number(m[1]) - sum(known.filter((r) => r.sets.has(letter)).map((r) => Number(r.label)));
      }
      expect(typed(slide), prose).toBe(want);
      expect(want).toBeGreaterThan(0);
    }
  });

  it('names exactly the regions described in prob-venn3-where', () => {
    for (const slide of slides('prob-venn3-where')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const described = /regions? holds? everyone (.+)\?$/.exec(proseOf(slide))![1];
      const test = eventTest(described);
      const letters = vennRegionsOf(svgOf(slide))
        .filter((r) => test(r.sets))
        .map((r) => r.label)
        .sort();
      const spoken = letters.length === 1 ? letters[0] : `${letters.slice(0, -1).join(', ')} and ${letters[letters.length - 1]}`;
      for (const option of slide.options) expect(option.id === slide.correctId, `${described}: ${option.label}`).toBe(option.label === spoken);
    }
  });
});

describe('probabilities from a filled diagram', () => {
  const total = (regions: { label: string }[]) => sum(regions.map((r) => Number(r.label)));

  it('reads the event of prob-venn3-chance off the diagram', () => {
    for (const slide of slides('prob-venn3-chance')) {
      const regions = vennRegionsOf(svgOf(slide));
      const everyone = Number(/shows (\d+)/.exec(proseOf(slide))![1]);
      expect(total(regions)).toBe(everyone);
      const words = /Find the probability that the \w+ (.+)\.$/.exec(proseOf(slide))![1];
      expect(typed(slide), words).toBeCloseTo(countIn(regions, words) / everyone, 12);
    }
  });

  it('fills every event of prob-venn-events-table', () => {
    for (const slide of slides('prob-venn-events-table')) {
      const regions = vennRegionsOf(svgOf(slide));
      const everyone = total(regions);
      const { rows, answer } = tableOf(slide);
      rows.forEach((row, i) => {
        expect(value(answer[i]), row[0]!).toBeCloseTo(countIn(regions, row[0]!) / everyone, 12);
        expect(lowest(answer[i])).toBe(true);
      });
    }
  });

  it('counts and divides in prob-venn-read-flow', () => {
    for (const slide of slides('prob-venn-read-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const regions = vennRegionsOf(svgOf(slide));
      const fav = countIn(regions, slide.subject);
      expect(slide.answer[1], slide.subject).toBe(`$${fav}$`);
      expect(value(slide.answer[2].replace(/\$/g, ''))).toBeCloseTo(fav / total(regions), 12);
    }
  });

  it('adds the regions the event covers in prob-venn-sum-tiles', () => {
    for (const slide of slides('prob-venn-sum-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const regions = vennRegionsOf(svgOf(slide));
      expect(total(regions)).toBeCloseTo(1, 12);
      const display = slide.prompt.find((b) => b.kind === 'display');
      const event = /^\\begin\{aligned\} & (P\(.+?\)) \\\\/.exec(display && display.kind === 'display' ? display.tex : '')![1];
      const covered = regions.filter((r) => eventTest(event)(r.sets));
      const got = slide.answer.map(value);
      expect(got[got.length - 1], event).toBeCloseTo(total(covered), 12);
      expect(got.length - 1).toBe(covered.length);
      expect(sum(got.slice(0, -1))).toBeCloseTo(got[got.length - 1], 12);
    }
  });
});
