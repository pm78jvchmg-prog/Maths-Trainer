/**
 * The answer editor.
 *
 * The point of most interest is `toAnswer`: the editor's whole job is to let a
 * learner type a fraction, and a fraction that grades wrong when it is right is
 * worse than no fraction key at all. So the assertions here do not stop at the
 * string — they push it through the real checker against the answer a generator
 * would state.
 */
import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../engine/equivalence';
import {
  EMPTY_DOC,
  deleteBack,
  docFromAnswer,
  insertAtom,
  insertFraction,
  insertRoot,
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
    expect(toAnswer(doc.nodes)).toBe('((1)/(1))');
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

  it('round-trips a stored answer', () => {
    const text = '((3)/(4))x^2';
    expect(toAnswer(docFromAnswer(text).nodes)).toBe(text);
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
    expect(toAnswer(doc.nodes)).toBe('((1)/(2))sqrt(x)');
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
