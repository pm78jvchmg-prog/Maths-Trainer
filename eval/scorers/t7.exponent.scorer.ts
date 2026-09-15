/**
 * T7 — the exponent key is a template, not a character.
 *
 * Rule 1/1b: `insertSup` does not exist at this task's base commit (c3e90b5),
 * so naming it tests whether the model rediscovered our wording. The exponent
 * action is therefore *discovered* by behaviour. Everything else this file
 * names — EMPTY_DOC, insertAtom, insertFraction, moveRight, toTex, toAnswer —
 * is present at the base and is fair to assert.
 */
import { describe, expect, it } from 'vitest';
import katex from 'katex';
import * as editor from './mathInput';
import { checkAnswer } from '../engine/equivalence';

type Doc = typeof editor.EMPTY_DOC;

const type = (doc: Doc, text: string): Doc =>
  [...text].reduce((d, ch) => editor.insertAtom(d, ch, ch), doc);

/**
 * Any way of entering an exponent, found by what it does.
 *
 * Rule 1c corollary: filtering exports by arity asserts a *signature*, which
 * is coupling of the same kind as asserting a name. A correct fix shaped as
 * `applyKey(doc, key)`, or as an extra optional parameter, or as no new export
 * at all — the `^` character handled inside the existing insert path — would
 * be invisible to a unary-only predicate. So every export is tried under
 * several call shapes, and plain typing is tried alongside them.
 */
function exponentAction(): ((doc: Doc) => Doc) | undefined {
  const shapes: ((fn: unknown, doc: Doc) => Doc)[] = [
    (fn, doc) => (fn as (d: Doc) => Doc)(doc),
    (fn, doc) => (fn as (d: Doc, k: string) => Doc)(doc, '^'),
    (fn, doc) => (fn as (d: Doc, k: { insert: string }) => Doc)(doc, { insert: '^' }),
  ];

  const candidates: ((doc: Doc) => Doc)[] = [
    // No new export at all: the key inserts `^` through the existing path.
    (doc) => type(doc, '^'),
    ...Object.values(editor).flatMap((value) =>
      typeof value === 'function'
        ? shapes.map((shape) => (doc: Doc) => shape(value, doc))
        : [],
    ),
  ];

  for (const candidate of candidates) {
    try {
      const doc = type(candidate(type(editor.EMPTY_DOC, 'x')), '14');
      if (editor.toTex(doc.nodes) === 'x^{14}') return candidate;
    } catch {
      // Not the exponent key, or the wrong call shape. Try the next.
    }
  }
  return undefined;
}

const MISSING = 'nothing in the editor turns typed digits into a stacked exponent';

describe('T7: a multi-digit exponent stacks', () => {
  const power = exponentAction();

  it('the editor offers an exponent action at all', () => {
    expect(power, 'nothing in the editor turns typed digits into a stacked exponent').toBeDefined();
  });

  it('stacks two digits, as read and as graded', () => {
    expect(power, MISSING).toBeDefined();
    const doc = type(power!(type(editor.EMPTY_DOC, 'x')), '14');
    expect(editor.toTex(doc.nodes)).toBe('x^{14}');
    expect(checkAnswer(editor.toAnswer(doc.nodes), 'x^14').status).toBe('correct');
    // Not passing by accepting everything: the one-digit reading is still wrong.
    expect(checkAnswer(editor.toAnswer(doc.nodes), 'x^4').status).toBe('incorrect');
  });

  it('stacks a negative exponent', () => {
    expect(power, MISSING).toBeDefined();
    const doc = type(power!(type(editor.EMPTY_DOC, 'x')), '-3');
    expect(editor.toTex(doc.nodes)).toBe('x^{-3}');
    expect(checkAnswer(editor.toAnswer(doc.nodes), 'x^(-3)').status).toBe('correct');
  });

  it('takes a fraction inside the exponent', () => {
    expect(power, MISSING).toBeDefined();
    let doc = editor.insertFraction(power!(type(editor.EMPTY_DOC, 'x')));
    doc = editor.moveRight(type(doc, '1'));
    doc = type(doc, '2');
    expect(checkAnswer(editor.toAnswer(doc.nodes), 'x^(1/2)', { domain: 'positive' as never }).status)
      .toBe('correct');
  });

  it('renders under KaTeX strict mode', () => {
    expect(power, MISSING).toBeDefined();
    const doc = type(power!(type(editor.EMPTY_DOC, 'x')), '14');
    expect(() =>
      katex.renderToString(editor.toTex(doc.nodes), { throwOnError: true, strict: 'error' }),
    ).not.toThrow();
  });
});
