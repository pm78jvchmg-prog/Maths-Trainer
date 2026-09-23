/**
 * An independent check on the Simultaneous Equations in Three Unknowns level.
 *
 * The oracle in `generators.test.ts` skips every slide here, and the generic
 * property tests only prove a generator agrees with itself — they would pass
 * a system whose stated solution is wrong. So this file trusts nothing the
 * generator worked out. It reads the equations **as the learner sees them**,
 * from the displayed TeX, parses each side with mathjs, solves the system
 * itself (Cramer's rule on the coefficients mathjs reads off), and holds each
 * slide's claim — a typed value, the right option, a combined equation, a
 * tree's last node — against that.
 *
 * It also enforces the tile-spelling trap for this level: TeX ignores
 * spaces, so `- 8` and `-8` look like one tile, and a bank holding both
 * offers the learner two identical tiles with only one of them right.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { valueOf } from '../expr';
import { registry } from '../registry';
import type { Block, Generator, Slide } from '../types';

const SEEDS = 200;
const LETTERS = ['x', 'y', 'z'] as const;

const ids = Object.keys(registry).filter((id) => id.startsWith('lin-tri-'));

function draws(id: string): { slide: Slide; where: string }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      where: `${id} difficulty ${difficulty} seed ${seed}`,
    })),
  );
}

/** mathjs's reading of one side, as a function of x, y and z. */
function side(tex: string): (v: number[]) => number {
  const node = math.parse(tex.trim());
  return (v) => node.evaluate({ x: v[0], y: v[1], z: v[2] }) as number;
}

interface Equation {
  coefficients: number[];
  right: number;
  lhs: (v: number[]) => number;
}

/** `2x - y + 3z = 5` as coefficients read off by mathjs, never by the generator. */
function equation(tex: string): Equation {
  const [left, right] = tex.split('=');
  const lhs = side(left);
  const zero = lhs([0, 0, 0]);
  return {
    coefficients: [0, 1, 2].map((n) => lhs([0, 1, 2].map((m) => (m === n ? 1 : 0))) - zero),
    right: side(right)([0, 0, 0]) - zero,
    lhs,
  };
}

/** The numbered rows of an `aligned` display, by their number. */
function rowsOf(tex: string): Map<number, Equation> {
  const out = new Map<number, Equation>();
  const body = tex.replace('\\begin{aligned}', '').replace('\\end{aligned}', '');
  for (const line of body.split('\\\\')) {
    const [left, right, label] = line.split('&');
    const number = /\((\d+)\)/.exec(label ?? '');
    if (!number || right === undefined) continue;
    out.set(Number(number[1]), equation(`${left} ${right}`));
  }
  return out;
}

/** The three-equation system on a slide, as displayed. */
function systemOf(slide: Slide): Equation[] | undefined {
  const blocks: Block[] = 'prompt' in slide ? slide.prompt : [];
  const texts = [...blocks.filter((b) => b.kind === 'display').map((b) => (b as { tex: string }).tex)];
  if (slide.kind === 'flow') texts.push(slide.subject);
  for (const tex of texts) {
    const rows = rowsOf(tex);
    if (rows.has(1) && rows.has(2) && rows.has(3)) return [1, 2, 3].map((n) => rows.get(n)!);
  }
  return undefined;
}

function det(m: number[][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

/** Cramer's rule: the one triple satisfying all three, or undefined if there is not one. */
function solve(system: Equation[]): number[] | undefined {
  const a = system.map((e) => e.coefficients);
  const d = det(a);
  if (d === 0) return undefined;
  return [0, 1, 2].map((n) => det(a.map((row, i) => row.map((v, m) => (m === n ? system[i].right : v)))) / d);
}

const holds = (e: Equation, v: number[]): boolean => Math.abs(e.lhs(v) - e.right) < 1e-9;

function proseOf(slide: Slide): string {
  return ('prompt' in slide ? slide.prompt : [])
    .filter((b): b is { kind: 'prose'; text: string } => b.kind === 'prose')
    .map((b) => b.text)
    .join(' ');
}

const tripleIn = (text: string): number[] => {
  const found = /\((-?\d+), (-?\d+), (-?\d+)\)/.exec(text);
  if (!found) throw new Error(`no triple in ${text}`);
  return [Number(found[1]), Number(found[2]), Number(found[3])];
};

const letterIndex = (letter: string): number => LETTERS.indexOf(letter as (typeof LETTERS)[number]);

/** A tiles slide's answer placed into its template. */
const filled = (slide: Extract<Slide, { kind: 'tiles' }>): string =>
  slide.template.replace(/\{(\d+)\}/g, (_, n: string) => slide.answer[Number(n)]);

/** The equation a steps slide ends on. */
const lastStep = (slide: Extract<Slide, { kind: 'steps' }>): string =>
  slide.reductions[slide.reductions.length - 1].value;

/** Is `e` (1) plus or minus equation `k`, up to sign — the only honest way to remove a letter here? */
function isPairing(e: Equation, first: Equation, other: Equation): boolean {
  return [1, -1].some((s) =>
    [1, -1].some(
      (t) =>
        e.coefficients.every((c, n) => c === t * (first.coefficients[n] + s * other.coefficients[n])) &&
        e.right === t * (first.right + s * other.right),
    ),
  );
}

describe.each(ids)('%s', (id) => {
  it('shows a system with one whole solution, every number under 100', () => {
    for (const { slide, where } of draws(id)) {
      const system = systemOf(slide);
      if (!system) continue;
      const v = solve(system);
      expect(v, `${where}: the equations are not independent`).toBeDefined();
      for (const value of v!) expect(Number.isInteger(value), `${where}: solution ${v}`).toBe(true);
      for (const e of system) {
        for (const n of [...e.coefficients, e.right]) expect(Math.abs(n), `${where}: ${n}`).toBeLessThan(100);
      }
    }
  });

  it('claims only what the displayed equations say', () => {
    for (const { slide, where } of draws(id)) {
      const system = systemOf(slide);
      const text = proseOf(slide);
      const v = system && solve(system);

      if (slide.kind === 'expression' && v && /^[xyz] =$/.test(slide.lead ?? '')) {
        // A typed value: the letter in the lead, solved independently.
        expect(Number(slide.answer), where).toBe(v[letterIndex(slide.lead![0])]);
      }

      if (slide.kind === 'expression' && v && slide.lead === 'k =') {
        // The multiplier makes (i)'s term exactly (j)'s.
        const [, i, letter, j] = /equation \((\d)\) by \$k\$ so that its \$([xyz])\$ term becomes exactly the \$[xyz]\$ term of \((\d)\)/.exec(text)!;
        const n = letterIndex(letter);
        expect(Number(slide.answer) * system![Number(i) - 1].coefficients[n], where).toBe(system![Number(j) - 1].coefficients[n]);
      }

      if (id === 'lin-tri-which' && slide.kind === 'choice') {
        for (const option of slide.options) {
          const triple = tripleIn(option.label);
          const right = system!.every((e) => holds(e, triple));
          expect(right, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
          if (right) expect(triple, where).toEqual(v);
        }
      }

      if (id === 'lin-tri-check-flow' && slide.kind === 'flow') {
        const triple = tripleIn(text);
        const fails = system!.findIndex((e) => !holds(e, triple));
        const path = fails < 0 ? ['Yes', 'Yes', 'Yes'] : [...Array(fails).fill('Yes'), 'No'];
        expect(slide.answer.map((label) => (label.startsWith('Yes') ? 'Yes' : 'No')), where).toEqual(path);
      }

      if (id === 'lin-tri-lhs-tree' && slide.kind === 'tree') {
        const triple = tripleIn(text);
        const which = Number(/equation \((\d)\)/.exec(text)![1]);
        const e = system![which - 1];
        expect(slide.answer.slice(0, 3).map(Number), where).toEqual(e.coefficients.map((c, n) => c * triple[n] + 0));
        expect(Number(slide.answer[3]), where).toBe(e.lhs(triple));
      }

      if ((id === 'lin-tri-combine' || id === 'lin-tri-drop-steps') && (slide.kind === 'tiles' || slide.kind === 'steps')) {
        const combined = equation(slide.kind === 'tiles' ? filled(slide) : lastStep(slide));
        const gone = letterIndex(/Remove \$([xyz])\$/.exec(text)![1]);
        const other = Number(/from \(1\) and \((\d)\)/.exec(text)![1]);
        expect(combined.coefficients[gone], `${where}: the letter is still there`).toBe(0);
        expect(isPairing(combined, system![0], system![other - 1]), `${where}: not (1) with (${other})`).toBe(true);
        expect(holds(combined, v!), `${where}: loses the solution`).toBe(true);
      }

      if (id === 'lin-tri-drop-check' && slide.kind === 'reduce') {
        const stated = equation(/gave \$([^$]+)\$/.exec(text)![1]);
        expect(tripleIn(text), where).toEqual(v);
        expect(valueOf(slide.expr), where).toBe(stated.lhs(v!));
        expect(holds(stated, v!), where).toBe(true);
      }

      if (id === 'lin-tri-verify' && slide.kind === 'reduce') {
        const which = Number(/equation \((\d)\)/.exec(text)![1]);
        expect(tripleIn(text), where).toEqual(v);
        expect(valueOf(slide.expr), where).toBe(system![which - 1].right);
      }

      if (id === 'lin-tri-finish-tree' && slide.kind === 'tree') {
        const [, last, middle, first] = /then \$([xyz])\$, then \$([xyz])\$ from \(4\), then \$([xyz])\$ from \(1\)/.exec(text)!;
        expect(slide.answer.slice(2).map(Number), where).toEqual([last, middle, first].map((l) => v![letterIndex(l)]));
      }

      if ((id === 'lin-tri-back-steps' || id === 'lin-tri-sum-all-steps') && slide.kind === 'steps') {
        const [letter, value] = lastStep(slide).split(' = ');
        expect(Number(value), where).toBe(v![letterIndex(letter)]);
      }

      if (id === 'lin-tri-scale-tiles' && slide.kind === 'tiles') {
        const [, i, m] = /multiply \((\d)\) by \$(-?\d)\$/.exec(text)!;
        const scaled = equation(filled(slide));
        const row = system![Number(i) - 1];
        expect(scaled.coefficients, where).toEqual(row.coefficients.map((c) => Number(m) * c + 0));
        expect(scaled.right, where).toBe(Number(m) * row.right + 0);
      }

      if ((id === 'lin-tri-letter-choice' || id === 'lin-tri-letter-flow') && system) {
        const zeros = [0, 1, 2].filter((n) => system.some((e) => e.coefficients[n] === 0));
        const same = [0, 1, 2].filter((n) =>
          system.every((e) => e.coefficients[n] !== 0 && Math.abs(e.coefficients[n]) === Math.abs(system[0].coefficients[n])),
        );
        const best = zeros.length === 1 ? zeros[0] : same.length === 1 ? same[0] : -1;
        if (slide.kind === 'choice') expect(slide.correctId, where).toBe(LETTERS[best]);
        if (slide.kind === 'flow') {
          expect(slide.answer, where).toEqual(zeros.length === 1 ? ['Yes'] : same.length === 1 ? ['No', 'Yes'] : ['No', 'No']);
        }
      }
    }
  });

  it('never offers two tiles that read the same', () => {
    for (const { slide, where } of draws(id)) {
      const banks =
        slide.kind === 'tiles' || slide.kind === 'tree'
          ? [slide.bank]
          : slide.kind === 'steps'
            ? slide.reductions.map((r) => r.bank)
            : slide.kind === 'choice'
              ? [slide.options.map((o) => o.label)]
              : [];
      for (const bank of banks) {
        const read = bank.map((token) => token.replace(/\s+/g, ''));
        expect(new Set(read).size, `${where}: ${JSON.stringify(bank)}`).toBe(new Set(bank).size);
      }
    }
  });
});

describe('the story generators', () => {
  it('writes the purchase the story describes', () => {
    for (const { slide, where } of draws('lin-tri-words-tiles')) {
      if (slide.kind !== 'tiles') throw new Error(`${where} is not tiles`);
      const text = proseOf(slide);
      const [, a, b, c] = /Let \$x\$ be the price of one ([a-z ]+), \$y\$ of one ([a-z ]+) and \$z\$ of one ([a-z ]+), in/.exec(text)!;
      const [, list, total] = /buys (.+) for (?:£\$(\d+)\$|\$\d+\$p)/.exec(text)!;
      const cost = total ?? /for \$(\d+)\$p/.exec(text)![1];
      const count = (item: string) => Number(new RegExp(`\\$(\\d+)\\$ ${item}s?(?![a-z])`).exec(list)![1]);
      const written = equation(filled(slide));
      expect(written.coefficients, where).toEqual([a, b, c].map(count));
      expect(written.right, where).toBe(Number(cost));
    }
  });

  it('solves the story the prompt tells', () => {
    for (const { slide, where } of draws('lin-tri-words-solve')) {
      if (slide.kind !== 'expression') throw new Error(`${where} is not typed`);
      const text = proseOf(slide);
      const asked = letterIndex(slide.lead![0]);
      const share = /^(\w+), (\w+) and (\w+) share \$(\d+)\$/.exec(text);
      let v: number[];
      if (share) {
        // Ben's share from the words alone: the total less the difference,
        // over the number of Bens it makes.
        const [, a, b, c, total] = share;
        const d = Number((new RegExp(`${a} gets \\$(\\d+)\\$ more than ${b}`).exec(text) ?? new RegExp(`${b} gets \\$(\\d+)\\$ fewer than ${a}`).exec(text))![1]);
        const words: Record<string, number> = { twice: 2, 'three times': 3, 'four times': 4, half: 2, 'a third of': 3, 'a quarter of': 4 };
        const times = new RegExp(`${c} gets (twice|three times|four times) as many as ${b}`).exec(text);
        const part = new RegExp(`${b} gets (half|a third of|a quarter of) what ${c} gets`).exec(text);
        const k = words[(times ?? part)![1]];
        const y = (Number(total) - d) / (2 + k);
        v = [y + d, y, k * y];
      } else {
        // Three pair totals: each sentence names two of the three and a number.
        const names = [...text.matchAll(/\$[xyz]\$ (?:be )?(?:the price of |the mass of )?([A-Za-z ]+?)(?:'s age| in pence| in kg)?(?:,| and|\.)/g)].map((m) => m[1].trim());
        const sentences = text.split('. ').filter((s) => /\$\d+\$/.test(s));
        const rows = sentences.slice(0, 3).map((s) => {
          const lower = s.toLowerCase();
          return equation(
            `${names.map((name, n) => (lower.includes(name.toLowerCase()) ? LETTERS[n] : '0')).join(' + ')} = ${/\$(\d+)\$/.exec(s)![1]}`,
          );
        });
        v = solve(rows)!;
      }
      expect(Number(slide.answer), where).toBe(v[asked]);
    }
  });
});
