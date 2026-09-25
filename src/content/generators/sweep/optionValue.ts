/**
 * The value a choice option's label stands for, read off its TeX.
 *
 * A native choice slide carries only labels and the id of the right one, so
 * the sweep could prove the right id was offered but never that the other
 * options were wrong. `vec-parallel` shipped a second right answer that way.
 * This reads a label the learner sees back into mathjs, so two options can be
 * compared by value rather than by spelling.
 *
 * It is deliberately narrow. It reads numbers, letters, the four operations,
 * powers, fractions, roots, `\pi`, `e`, `i`, brackets and a handful of named
 * functions written with brackets. Anything else — words, sets, inequalities,
 * vectors, coordinates, degrees, `\pm` — returns `undefined`, and the sweep
 * leaves that slide to the checks it already had. A reader that guessed would
 * turn a question about form into a false alarm, or worse, a false pass.
 *
 * A label written `L = R` reads as `R` when every option on the slide opens
 * with the same `L =` (`x = 3`, `x = -2`, ...), which the sweep arranges.
 */

import {
  compileExpression,
  distance,
  evaluateAt,
  magnitude,
  parseExpression,
  samplePoint,
  type Scalar,
} from '../../../engine/expression';
import { probePolicy } from '../../../engine/equivalence';
import { makeRng } from '../../../engine/rng';

/** Functions read when their argument is bracketed. */
const FUNCTIONS: Record<string, string> = {
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  sec: 'sec',
  csc: 'csc',
  cosec: 'csc',
  cot: 'cot',
  ln: 'log',
  exp: 'exp',
  sinh: 'sinh',
  cosh: 'cosh',
  tanh: 'tanh',
  arcsin: 'asin',
  arccos: 'acos',
  arctan: 'atan',
};

/** Commands that are spacing or sizing only, dropped. */
const IGNORED = new Set([',', '!', ';', ':', ' ', 'quad', 'qquad', 'displaystyle', 'left', 'right', 'big', 'Big', 'bigl', 'bigr', 'Bigl', 'Bigr']);

class Unreadable extends Error {}

/**
 * Read a label into mathjs syntax, or `undefined` when it is not plainly a
 * value. Never throws.
 */
export function labelToMath(tex: string): string | undefined {
  // A thin space between digit groups is a thousands separator: 610\,000.
  const joined = tex.replace(/(\d)\\,(?=\d{3}(?!\d))/g, '$1');
  try {
    const reader = new Reader(joined);
    const out = reader.sequence();
    if (!reader.done()) return undefined;
    return out.trim() === '' ? undefined : out;
  } catch (error) {
    if (error instanceof Unreadable) return undefined;
    throw error;
  }
}

class Reader {
  private at = 0;
  private readonly tex: string;
  constructor(tex: string) {
    this.tex = tex;
  }

  done(): boolean {
    this.skipSpace();
    return this.at >= this.tex.length;
  }

  private skipSpace(): void {
    while (this.at < this.tex.length && /\s/.test(this.tex[this.at])) this.at += 1;
  }

  private fail(): never {
    throw new Unreadable();
  }

  /** A run of atoms up to an unmatched closing brace or bracket. */
  sequence(): string {
    const parts: string[] = [];
    for (;;) {
      this.skipSpace();
      if (this.at >= this.tex.length) break;
      const ch = this.tex[this.at];
      if (ch === '}' || ch === ')' || ch === ']') break;
      parts.push(this.atom());
    }
    return parts.join(' ');
  }

  /** `{...}` read whole, or a single atom when there are no braces. */
  private group(): string {
    this.skipSpace();
    if (this.tex[this.at] === '{') {
      this.at += 1;
      const inner = this.sequence();
      if (this.tex[this.at] !== '}') this.fail();
      this.at += 1;
      if (inner.trim() === '') this.fail();
      return `(${inner})`;
    }
    // `^2`, `\frac12`: one character, or one command.
    if (/[0-9A-Za-z]/.test(this.tex[this.at] ?? '')) {
      const ch = this.tex[this.at];
      this.at += 1;
      return this.letter(ch);
    }
    return `(${this.atom()})`;
  }

  private letter(ch: string): string {
    if (/[0-9]/.test(ch)) return ch;
    // Each letter its own factor, so `ab` is a times b rather than a name.
    return ` ${ch} `;
  }

  private atom(): string {
    const ch = this.tex[this.at];
    if (/[0-9.]/.test(ch)) {
      const match = /^[0-9]*\.?[0-9]+|^[0-9]+/.exec(this.tex.slice(this.at));
      if (!match) this.fail();
      this.at += match[0].length;
      return match[0];
    }
    if (/[A-Za-z]/.test(ch)) {
      // Three letters in a row are a word, not a product.
      if (/^[A-Za-z]{3}/.test(this.tex.slice(this.at))) this.fail();
      // `f(x)`, `P(A)`: a function or a probability, not a product.
      if (/[fghFGHPE]/.test(ch) && /^\s*(\(|\\left)/.test(this.tex.slice(this.at + 1))) this.fail();
      this.at += 1;
      return this.letter(ch);
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      this.at += 1;
      return ` ${ch} `;
    }
    if (ch === '^') {
      this.at += 1;
      return `^${this.group()}`;
    }
    if (ch === '_') this.fail(); // subscripts name things, not values
    if (ch === '(' || ch === '[') {
      this.at += 1;
      const inner = this.sequence();
      const close = this.tex[this.at];
      if (close !== ')' && close !== ']') this.fail();
      this.at += 1;
      if (inner.trim() === '') this.fail();
      return `(${inner})`;
    }
    if (ch === '{') return this.group();
    if (ch === '\\') return this.command();
    return this.fail();
  }

  private command(): string {
    this.at += 1;
    const match = /^[A-Za-z]+|^./.exec(this.tex.slice(this.at));
    if (!match) this.fail();
    const name = match[0];
    this.at += name.length;
    if (IGNORED.has(name)) {
      // `\left(` and `\right)` leave the bracket itself to be read.
      return '';
    }
    switch (name) {
      case 'frac':
      case 'dfrac':
      case 'tfrac': {
        // `\frac{dy}{dx}` is a derivative, not d times y over d times x.
        if (/^\s*\{\s*d/.test(this.tex.slice(this.at))) this.fail();
        const top = this.group();
        const bottom = this.group();
        return `(${top} / ${bottom})`;
      }
      case 'sqrt': {
        this.skipSpace();
        if (this.tex[this.at] === '[') {
          this.at += 1;
          const index = this.sequence();
          if (this.tex[this.at] !== ']') this.fail();
          this.at += 1;
          return `nthRoot(${this.group()}, ${index})`;
        }
        return `sqrt(${this.group()})`;
      }
      case 'times':
      case 'cdot':
        return ' * ';
      case 'div':
        return ' / ';
      case 'pi':
        return ' pi ';
      case 'mathrm':
      case 'text':
      case 'textrm': {
        // Only a lone `e` or `i` in roman type is a value; a word is not.
        const inner = /^\{\s*([ei])\s*\}/.exec(this.tex.slice(this.at));
        if (!inner) this.fail();
        this.at += inner[0].length;
        return ` ${inner[1]} `;
      }
      default: {
        const fn = FUNCTIONS[name];
        if (!fn) this.fail();
        // Only with a bracketed argument: `\sin x` has no written extent.
        this.skipSpace();
        if (this.tex.startsWith('\\left', this.at)) this.at += '\\left'.length;
        if (this.tex[this.at] !== '(') this.fail();
        this.at += 1;
        const inner = this.sequence();
        if (this.tex[this.at] !== ')') this.fail();
        this.at += 1;
        return ` ${fn}(${inner}) `;
      }
    }
  }
}

/**
 * Every label on a slide read as a value, or `undefined` when any one cannot
 * be. A shared `L =` opening is dropped first, so a slide of `x = 3` style
 * options compares the right-hand sides.
 */
export function slideValues(labels: readonly string[]): string[] | undefined {
  const heads = labels.map((label) => {
    const parts = label.split('=');
    return parts.length === 2 ? parts[0].trim() : undefined;
  });
  const shared = heads.every((head) => head !== undefined && head === heads[0]);
  const bodies = shared ? labels.map((label) => label.split('=')[1]) : labels;
  const values: string[] = [];
  for (const body of bodies) {
    const value = labelToMath(body);
    if (value === undefined || !parseExpression(value).ok) return undefined;
    values.push(value);
  }
  return values;
}

/**
 * The pairs of values that are the same, by probing them at shared points the
 * way the checker does: one evaluation when there are no letters, otherwise
 * 24 points, equal when at least 8 evaluate on both sides and 90% of those
 * agree. Each value is parsed and compiled once, so a slide of four costs
 * four compilations rather than the twelve six pairwise checks would.
 */
export function equalPairs(values: readonly string[], seed: number | string): [number, number][] {
  const policy = probePolicy();
  const parsed = values.map((value) => {
    const result = parseExpression(value);
    if (!result.ok) throw new Error(`unreadable option value ${value}`);
    return result;
  });
  const compiled = parsed.map((p) => compileExpression(p.node));
  const variables = [...new Set(parsed.flatMap((p) => p.variables))].sort();
  const rng = makeRng(seed);
  const points =
    variables.length === 0
      ? [{}]
      : Array.from({ length: policy.sampleCount }, () => samplePoint(rng, variables, 'real'));
  const table = compiled.map((fn) => points.map((point) => evaluateAt(fn, { ...point })));
  const close = (a: Scalar, b: Scalar) =>
    distance(a, b) <= policy.relativeTolerance * Math.max(1, magnitude(a), magnitude(b));

  const pairs: [number, number][] = [];
  for (let a = 0; a < values.length; a += 1) {
    for (let b = a + 1; b < values.length; b += 1) {
      let valid = 0;
      let agreeing = 0;
      points.forEach((_, at) => {
        const x = table[a][at];
        const y = table[b][at];
        if (x === undefined || y === undefined) return;
        valid += 1;
        if (close(x, y)) agreeing += 1;
      });
      const enough = variables.length === 0 ? valid === 1 : valid >= policy.minValidPoints;
      if (enough && agreeing / valid >= policy.agreementThreshold) pairs.push([a, b]);
    }
  }
  return pairs;
}
