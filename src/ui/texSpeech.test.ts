/**
 * Names for buttons that are maths alone.
 *
 * KaTeX hides its visible output from assistive tech, so a keypad key or a
 * choice option holding only `<Tex>` had an empty accessible name in Chromium.
 * The sweep at the bottom is the one that matters: every TeX-only button the
 * content can produce must come out with a name, and no TeX may be left in it
 * for a screen reader to spell out.
 */
import { describe, expect, it } from 'vitest';
import { keyName, texToSpeech } from './texSpeech';
import { registeredGenerators } from '../content/registry';
import { makeRng } from '../engine/rng';
import type { Generator, KeypadKey } from '../content/types';

describe('reading TeX aloud', () => {
  it.each([
    ['t = 7', 't = 7'],
    ['\\sin(30^{\\circ})', 'sin (30 degrees)'],
    ['-\\cos(30^{\\circ})', 'minus cos (30 degrees)'],
    ['\\frac{1}{2}', '1 over 2'],
    ['\\frac{x + 1}{2}', '(x + 1) over 2'],
    ['\\tfrac{\\pi}{2}', 'π over 2'],
    ['\\sqrt{3}', 'square root of 3'],
    ['\\sqrt[3]{x}', 'cube root of x'],
    ['x^{2} - 1', 'x squared minus 1'],
    ['x^{-1}', 'x to the power (minus 1)'],
    ['\\sin^{-1}', 'inverse sin'],
    ["f'(x)", 'f prime (x)'],
    ['\\bar{x}', 'x bar'],
    ['\\ddot{x} = -4x', 'x double dot = minus 4 x'],
    ['\\begin{pmatrix} 1 \\\\ -4 \\end{pmatrix}', '(1, minus 4)'],
    ['\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}', '(1, 2; 3, 4)'],
    ['\\int_{0}^{1} x \\, dx', 'integral from 0 to 1 x d x'],
    ['\\log_{2} 8', 'log base 2 8'],
    ['x \\le 3', 'x less than or equal to 3'],
    ['3 \\times 4', '3 times 4'],
    ['\\text{no solution}', 'no solution'],
  ])('reads %s as %s', (tex, spoken) => {
    expect(texToSpeech(tex)).toBe(spoken);
  });

  it('falls back to the characters of TeX KaTeX cannot read', () => {
    expect(texToSpeech('\\frac{1}{')).not.toBe('');
    expect(texToSpeech('\\frac{1}{')).not.toMatch(/\\/);
  });
});

describe('naming keypad keys', () => {
  it('names each template key for what it opens', () => {
    expect(keyName({ insert: '/' })).toBe('fraction');
    expect(keyName({ insert: '/', label: '÷' })).toBe('fraction');
    expect(keyName({ insert: 'sqrt(' })).toBe('square root');
    expect(keyName({ insert: '^' })).toBe('power');
  });

  it('names a function key for what it shows', () => {
    expect(keyName({ insert: 'sin', fn: 'degrees' })).toBe('sin');
    expect(keyName({ insert: 'acos', fn: 'degrees' })).toBe('inverse cos');
  });

  it('names a letter key drawn in TeX', () => {
    expect(keyName({ insert: 'x', tex: true })).toBe('x');
    expect(keyName({ insert: ' y', label: 'y', tex: true })).toBe('y');
  });

  it('leaves a key with a text face to name itself', () => {
    expect(keyName({ insert: '7' })).toBeUndefined();
    expect(keyName({ insert: '*', label: '×' })).toBeUndefined();
    expect(keyName({ insert: '(pi)', label: 'π' })).toBeUndefined();
  });
});

describe('every TeX-only button the content produces', () => {
  const SEEDS = 10;
  const options = new Set<string>();
  const keys = new Map<string, KeypadKey>();
  for (const generator of registeredGenerators as Generator<unknown>[]) {
    for (const difficulty of [1, 2]) {
      for (let seed = 0; seed < SEEDS; seed++) {
        const slide = generator.render(generator.sample(makeRng(seed), difficulty));
        if (slide.kind === 'choice') {
          for (const option of slide.options) if (option.tex) options.add(option.label);
        }
        if (slide.kind === 'expression') {
          for (const key of slide.keypad) keys.set(JSON.stringify(key), key);
        }
      }
    }
  }

  // A backslash, a caret or an underscore is TeX a screen reader would spell
  // out letter by letter. Braces are not checked: a set is written with them.
  const leftoverTex = /[\\^_]/;

  it('gives every TeX choice option a name with no TeX in it', () => {
    expect(options.size).toBeGreaterThan(1000);
    const unnamed = [...options].filter((label) => {
      const name = texToSpeech(label);
      return label.trim() !== '' && (name === '' || leftoverTex.test(name));
    });
    expect(unnamed.slice(0, 10)).toEqual([]);
  });

  it('gives every key drawn in TeX a name', () => {
    const drawnInTex = [...keys.values()].filter(
      (key) => key.tex || key.fn || ['/', 'sqrt(', '^'].includes(key.insert),
    );
    expect(drawnInTex.length).toBeGreaterThan(5);
    for (const key of drawnInTex) {
      const name = keyName(key);
      expect(name, JSON.stringify(key)).toBeTruthy();
      expect(name, JSON.stringify(key)).not.toMatch(leftoverTex);
    }
  });
}, 120_000);
