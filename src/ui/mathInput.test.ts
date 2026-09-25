/**
 * The answer editor.
 *
 * The point of most interest is `toAnswer`: the editor's whole job is to let a
 * learner type a fraction, and a fraction that grades wrong when it is right is
 * worse than no fraction key at all. So the assertions here do not stop at the
 * string — they push it through the real checker against the answer a generator
 * would state.
 */
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../engine/equivalence';
import { TRIG_KEYS } from '../content/generators/trigonometry';
import type { KeypadKey } from '../content/types';
import {
  EMPTY_DOC,
  applyKey,
  deleteBack,
  docFromKeys,
  insertAtom,
  insertFraction,
  insertRoot,
  insertSup,
  isFilled,
  moveLeft,
  moveRight,
  toAnswer,
  toTex,
  type Doc,
} from './mathInput';

/** Type a run of single-character atoms, as the keypad does. */
function type(doc: Doc, text: string): Doc {
  return [...text].reduce((acc, ch) => insertAtom(acc, ch, ch), doc);
}

describe('editing', () => {
  it('inserts where the caret is, not at the end', () => {
    let doc = type(EMPTY_DOC, '345');
    doc = moveLeft(moveLeft(doc));
    doc = type(doc, '9');
    expect(toAnswer(doc.nodes)).toBe('3945');
  });

  it('puts the caret in the numerator, then the denominator', () => {
    let doc = insertFraction(EMPTY_DOC);
    doc = type(doc, '3');
    doc = moveRight(doc);
    doc = type(doc, '4');
    expect(toAnswer(doc.nodes)).toBe('((3)/(4))');
  });

  it('leaves a fraction when the caret runs off the end of the denominator', () => {
    let doc = insertFraction(EMPTY_DOC);
    doc = moveRight(type(doc, '1'));
    doc = moveRight(type(doc, '2'));
    doc = type(doc, 'x');
    expect(toAnswer(doc.nodes)).toBe('((1)/(2))x');
  });

  it('keeps a half-typed fraction when the caret backs out of it', () => {
    let doc = insertFraction(EMPTY_DOC);
    doc = moveRight(type(doc, '1')); // numerator typed, caret in the denominator
    doc = deleteBack(doc); // out of the empty denominator
    expect(toAnswer(doc.nodes)).toBe('((1)/(()))');
    expect(doc.nodes).toHaveLength(1);
  });

  it('clears an entirely empty fraction in the press that leaves it', () => {
    const doc = deleteBack(insertFraction(EMPTY_DOC));
    expect(doc.nodes).toHaveLength(0);
    expect(toAnswer(doc.nodes)).toBe('');
  });

  it('steps left into the last slot of a template, not past it', () => {
    let doc = insertFraction(EMPTY_DOC);
    doc = moveRight(type(doc, '1'));
    doc = moveRight(type(doc, '2'));
    doc = moveLeft(doc); // back into the denominator, after the 2
    doc = type(doc, '5');
    expect(toAnswer(doc.nodes)).toBe('((1)/(25))');
  });

  it('treats an empty slot as nothing to grade', () => {
    expect(isFilled(insertFraction(EMPTY_DOC).nodes)).toBe(false);
    expect(isFilled(type(insertFraction(EMPTY_DOC), '1').nodes)).toBe(true);
  });
});

describe('what the learner reads', () => {
  it('renders a fraction stacked, with a placeholder for an empty slot', () => {
    const doc = type(insertFraction(EMPTY_DOC), '3');
    expect(toTex(doc.nodes)).toBe('\\frac{3}{\\square}');
  });

  it('draws the caret between the characters it will type between', () => {
    let doc = type(EMPTY_DOC, '12');
    doc = moveLeft(doc);
    expect(toTex(doc.nodes, doc.caret)).toBe('1\\htmlClass{mi-caret}{\\mathstrut}2');
  });
});

/**
 * mathjs binds implicit multiplication tighter than division, so a fraction
 * written with only its slots bracketed swallows whatever follows it:
 * `(8)/(2)x^2` is `8/(2x^2)`. Every case below is a correct answer that was
 * graded wrong before `toAnswer` bracketed the fraction as a whole.
 */
describe('grading a typed fraction', () => {
  const grade = (typed: string, expected: string, mode?: 'upToConstant') =>
    checkAnswer(typed, expected, mode ? { mode } : {}).status;

  it('accepts a coefficient written as a fraction times a power', () => {
    let doc = insertFraction(EMPTY_DOC);
    doc = moveRight(type(doc, '6'));
    doc = moveRight(type(doc, '3'));
    doc = type(doc, 'x^3');
    expect(toAnswer(doc.nodes)).toBe('((6)/(3))x^3');
    expect(grade(toAnswer(doc.nodes), '2x^3', 'upToConstant')).toBe('correct');
  });

  it('accepts a fraction added to another term', () => {
    let doc = type(EMPTY_DOC, '3+');
    doc = insertFraction(doc);
    doc = moveRight(type(doc, 'x'));
    doc = moveRight(type(doc, '2'));
    expect(grade(toAnswer(doc.nodes), '3 + x/2')).toBe('correct');
  });

  it('accepts a fraction multiplying a root', () => {
    let doc = insertFraction(EMPTY_DOC);
    doc = moveRight(type(doc, '1'));
    doc = moveRight(type(doc, '2'));
    doc = insertRoot(doc);
    doc = type(doc, 'x');
    expect(toAnswer(doc.nodes)).toBe('((1)/(2))(sqrt(x))');
    expect(grade(toAnswer(doc.nodes), 'sqrt(x)/2')).toBe('correct');
  });

  it('still rejects a wrong fraction', () => {
    let doc = insertFraction(EMPTY_DOC);
    doc = moveRight(type(doc, '6'));
    doc = moveRight(type(doc, '4'));
    doc = type(doc, 'x^3');
    expect(grade(toAnswer(doc.nodes), '2x^3', 'upToConstant')).toBe('incorrect');
  });
});

/**
 * The exponent key used to let `^` through as a flat atom, so `x^14` rendered
 * as x superscript 1, followed by a baseline 4 — KaTeX only stacks the single
 * character straight after `^`. A regression back to that reads `x` then
 * `insertSup` then `12` as `toTex === 'x^12'` (unbraced) rather than the
 * `'x^{12}'` asserted below.
 */
describe('the exponent key is a superscript template', () => {
  it('stacks a multi-digit exponent, both as read and as graded', () => {
    let doc = type(EMPTY_DOC, 'x');
    doc = insertSup(doc);
    doc = type(doc, '12');
    expect(toTex(doc.nodes)).toBe('x^{12}');
    expect(toAnswer(doc.nodes)).toBe('x^(12)');
  });

  it('stacks a negative exponent', () => {
    let doc = type(EMPTY_DOC, 'x');
    doc = insertSup(doc);
    doc = type(doc, '-3');
    expect(toTex(doc.nodes)).toBe('x^{-3}');
    expect(toAnswer(doc.nodes)).toBe('x^(-3)');
  });

  it('accepts a fraction typed inside the exponent', () => {
    let doc = type(EMPTY_DOC, 'x');
    doc = insertSup(doc);
    doc = insertFraction(doc);
    doc = type(doc, '1');
    doc = moveRight(doc);
    doc = type(doc, '2');
    expect(toAnswer(doc.nodes)).toBe('x^(((1)/(2)))');
    expect(
      checkAnswer(toAnswer(doc.nodes), 'x^(1/2)', { domain: 'positive' }).status,
    ).toBe('correct');
  });

  it('grades the same as the unbraced form mathjs would have parsed anyway', () => {
    expect(checkAnswer('x^(12)', 'x^12').status).toBe('correct');
  });
});

/**
 * `x^{2}^{3}` is a KaTeX "double superscript" error, so a second tap on the
 * exponent key used to replace the learner's answer with a red parse message.
 * It nests instead, which is also how mathjs reads `x^2^3`.
 */
describe('a second exponent', () => {
  const typeInto = (doc: Doc, text: string): Doc =>
    [...text].reduce((acc, ch) => insertAtom(acc, ch, ch), doc);

  it('nests inside the first rather than sitting beside it', () => {
    let doc = typeInto(EMPTY_DOC, 'x');
    doc = typeInto(insertSup(doc), '2');
    doc = moveRight(doc); // out of the exponent, back to the top level
    doc = typeInto(insertSup(doc), '3');
    expect(toTex(doc.nodes)).toBe('x^{2^{3}}');
    expect(toAnswer(doc.nodes)).toBe('x^(2^(3))');
  });

  it('renders as TeX KaTeX accepts', () => {
    let doc = typeInto(EMPTY_DOC, 'x');
    doc = typeInto(insertSup(doc), '2');
    doc = moveRight(doc);
    doc = typeInto(insertSup(doc), '3');
    expect(() => katex.renderToString(toTex(doc.nodes), { throwOnError: true, strict: false })).not.toThrow();
  });

  it('grades as the power tower mathjs reads', () => {
    let doc = typeInto(EMPTY_DOC, 'x');
    doc = typeInto(insertSup(doc), '2');
    doc = moveRight(doc);
    doc = typeInto(insertSup(doc), '3');
    expect(checkAnswer(toAnswer(doc.nodes), 'x^8', { domain: 'positive' }).status).toBe('correct');
    expect(checkAnswer(toAnswer(doc.nodes), 'x^6', { domain: 'positive' }).status).toBe('incorrect');
  });
});

describe('trig function keys', () => {
  const key = (name: string): KeypadKey => TRIG_KEYS.find((k) => k.insert === name)!;
  const press = (doc: Doc, ...keys: (KeypadKey | string)[]): Doc =>
    keys.reduce<Doc>(
      (acc, k) => (typeof k === 'string' ? type(acc, k) : applyKey(acc, k)),
      doc,
    );

  it('puts what is typed next inside the brackets', () => {
    const doc = press(EMPTY_DOC, '4', key('sin'), '30');
    expect(toTex(doc.nodes)).toBe('4\\sin\\left(30\\right)');
    expect(doc.caret.steps).toHaveLength(1);
  });

  it('grades in degrees, not the radians mathjs works in', () => {
    const height = press(EMPTY_DOC, '4', key('sin'), '30');
    expect(checkAnswer(toAnswer(height.nodes), '2').status).toBe('correct');
    const across = press(EMPTY_DOC, '8', key('cos'), '120');
    expect(checkAnswer(toAnswer(across.nodes), '-4').status).toBe('correct');
    expect(checkAnswer(toAnswer(across.nodes), '4').status).toBe('incorrect');
  });

  it('hands an inverse back in degrees', () => {
    const doc = applyKey(press(EMPTY_DOC, key('asin')), { insert: '/' });
    const typed = type(moveRight(type(doc, '2')), '4');
    expect(toTex(typed.nodes)).toBe('\\sin^{-1}\\left(\\frac{2}{4}\\right)');
    expect(checkAnswer(toAnswer(typed.nodes), '30').status).toBe('correct');
  });

  it('keeps the function to its brackets when more is typed after it', () => {
    const doc = type(moveRight(press(EMPTY_DOC, '2', key('sin'), '90')), '+1');
    expect(checkAnswer(toAnswer(doc.nodes), '3').status).toBe('correct');
  });

  it('works in radians when the key says so', () => {
    const inside = press(EMPTY_DOC, '6', { insert: 'sin', fn: 'radians' }, { insert: '/' }, { insert: 'pi' });
    const doc = type(moveRight(inside), '6');
    expect(checkAnswer(toAnswer(doc.nodes), '3').status).toBe('correct');
  });

  it('never grades an empty function, even where sin(0) would be right', () => {
    const doc = press(EMPTY_DOC, '4', key('sin'));
    expect(checkAnswer(toAnswer(doc.nodes), '0').status).toBe('invalid');
  });

  it('clears an empty function in the press that leaves it', () => {
    const doc = deleteBack(press(EMPTY_DOC, '4', key('cos')));
    expect(toAnswer(doc.nodes)).toBe('4');
  });

  it('renders every key and every function as TeX KaTeX accepts', () => {
    for (const k of TRIG_KEYS) {
      const doc = press(EMPTY_DOC, k, '1');
      expect(() => katex.renderToString(toTex(doc.nodes), { throwOnError: true, strict: false })).not.toThrow();
    }
  });

  it('opens a prefill with the caret inside the function', () => {
    const doc = type(docFromKeys([{ insert: '6' }, key('sin')]), '150');
    expect(checkAnswer(toAnswer(doc.nodes), '3').status).toBe('correct');
  });
});

/**
 * An empty slot used to be written as a neutral value — a fraction as 0/1, a
 * denominator as 1, a root as sqrt(0), an exponent as 1 — so a template opened
 * and left empty vanished from the graded string. Check is live as soon as
 * anything else is typed, which made `5 + □/□` a right answer to "5". Each
 * template now refuses an empty slot the way the function template does.
 */
describe('an empty slot is never graded as a value', () => {
  it('refuses a fraction with nothing in it', () => {
    let doc = type(EMPTY_DOC, '5+');
    doc = insertFraction(doc);
    expect(isFilled(doc.nodes)).toBe(true); // Check is live
    expect(checkAnswer(toAnswer(doc.nodes), '5').status).toBe('invalid');
  });

  it('refuses a fraction with an empty denominator', () => {
    const doc = moveRight(type(insertFraction(EMPTY_DOC), '3'));
    expect(checkAnswer(toAnswer(doc.nodes), '3').status).toBe('invalid');
  });

  it('refuses a fraction with an empty numerator', () => {
    const doc = type(moveRight(insertFraction(EMPTY_DOC)), '4');
    expect(checkAnswer(toAnswer(doc.nodes), '0').status).toBe('invalid');
  });

  it('refuses a root with nothing under it', () => {
    const doc = insertRoot(type(EMPTY_DOC, '7+'));
    expect(checkAnswer(toAnswer(doc.nodes), '7').status).toBe('invalid');
  });

  it('refuses an exponent with nothing in it', () => {
    const doc = insertSup(type(EMPTY_DOC, 'x'));
    expect(checkAnswer(toAnswer(doc.nodes), 'x').status).toBe('invalid');
  });

  it('still grades each template once its slots are filled', () => {
    let frac = type(EMPTY_DOC, '5+');
    frac = type(moveRight(type(insertFraction(frac), '1')), '2');
    expect(checkAnswer(toAnswer(frac.nodes), '5.5').status).toBe('correct');
    const root = type(insertRoot(type(EMPTY_DOC, '7+')), '9');
    expect(checkAnswer(toAnswer(root.nodes), '10').status).toBe('correct');
    const sup = type(insertSup(type(EMPTY_DOC, 'x')), '2');
    expect(checkAnswer(toAnswer(sup.nodes), 'x^2').status).toBe('correct');
  });
});

/**
 * mathjs reads a run of letters as one name, and a name followed by a bracket
 * as a call. So a letter key written straight against what comes next merged
 * with it: `i` then √3 serialised to `isqrt(3)`, "There is no function called
 * isqrt", and `x` then `ln(` to `xln(`. Every key here is one the keypads
 * offer side by side (EXACT_KEYS and SURD_KEYS with √, EXP_KEYS with e and
 * ln, the calculus TRIG_KEYS with sin, PI_KEYS with the fraction), and every
 * answer is typed exactly as it is printed.
 */
describe('a letter key never merges with what follows it', () => {
  const press = (...keys: string[]): Doc =>
    keys.reduce<Doc>((acc, k) => (k === '>' ? moveRight(acc) : applyKey(acc, { insert: k })), EMPTY_DOC);

  it('reads i√3 as i times root 3', () => {
    const doc = press('1', '+', 'i', 'sqrt(', '3');
    expect(checkAnswer(toAnswer(doc.nodes), '1 + sqrt(3)*i').status).toBe('correct');
  });

  it('reads 2x√3 as 2 times x times root 3', () => {
    const doc = press('2', 'x', 'sqrt(', '3');
    expect(checkAnswer(toAnswer(doc.nodes), '2*sqrt(3)*x').status).toBe('correct');
  });

  it('reads x√x as x times root x', () => {
    const doc = press('x', 'sqrt(', 'x');
    expect(checkAnswer(toAnswer(doc.nodes), 'x^(3/2)', { domain: 'positive' }).status).toBe('correct');
  });

  it('reads x ln(x) and x sin(x) as products, not functions named xln and xsin', () => {
    const ln = press('x', 'ln(', 'x', ')');
    expect(checkAnswer(toAnswer(ln.nodes), 'x*log(x)', { domain: 'positive' }).status).toBe('correct');
    const sin = press('x', 'sin(', 'x', ')');
    expect(checkAnswer(toAnswer(sin.nodes), 'x*sin(x)').status).toBe('correct');
  });

  it('reads x e^x as x times e^x, not a symbol named xe', () => {
    const doc = press('x', 'e', '^', 'x');
    expect(checkAnswer(toAnswer(doc.nodes), 'x*exp(x)').status).toBe('correct');
  });

  it('reads π before a fraction as a product, not a call to pi', () => {
    const doc = press('pi', '/', '1', '>', '6');
    expect(checkAnswer(toAnswer(doc.nodes), 'pi/6').status).toBe('correct');
  });

  it('keeps a power on the bracket after a letter, x(x+1)^2', () => {
    const doc = press('x', '(', 'x', '+', '1', ')', '^', '2');
    expect(checkAnswer(toAnswer(doc.nodes), 'x*(x+1)^2').status).toBe('correct');
    expect(checkAnswer(toAnswer(doc.nodes), '(x*(x+1))^2').status).toBe('incorrect');
  });

  it('leaves a letter alone where nothing can merge with it', () => {
    expect(toAnswer(press('x', '^', '2').nodes)).toBe('x^(2)');
    expect(toAnswer(press('2', 'x', '+', '1').nodes)).toBe('2x+1');
  });
});

describe('typing a digit then e on the keypad', () => {
  it('grades 2 e - 1 as 2e - 1, never as 0.2', () => {
    const doc = type(EMPTY_DOC, '2e-1');
    expect(toAnswer(doc.nodes)).toBe('2e-1');
    expect(checkAnswer(toAnswer(doc.nodes), '2*e - 1').status).toBe('correct');
    expect(checkAnswer(toAnswer(doc.nodes), '0.2').status).toBe('incorrect');
  });
});
