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

/** Any unary Doc -> Doc export after which typed characters stack as one exponent. */
function exponentAction(): ((doc: Doc) => Doc) | undefined {
  for (const value of Object.values(editor)) {
    if (typeof value !== 'function' || value.length !== 1) continue;
    const candidate = value as (doc: Doc) => Doc;
    try {
      const doc = type(candidate(type(editor.EMPTY_DOC, 'x')), '14');
      if (editor.toTex(doc.nodes) === 'x^{14}') return candidate;
    } catch {
      // Not the exponent key. Try the next export.
    }
  }
  return undefined;
}

describe('T7: a multi-digit exponent stacks', () => {
  const power = exponentAction();

  it('the editor offers an exponent action at all', () => {
    expect(power, 'no export turns typed digits into a stacked exponent').toBeDefined();
  });

  it('stacks two digits, as read and as graded', () => {
    const doc = type(power!(type(editor.EMPTY_DOC, 'x')), '14');
    expect(editor.toTex(doc.nodes)).toBe('x^{14}');
    expect(checkAnswer(editor.toAnswer(doc.nodes), 'x^14').status).toBe('correct');
    // Not passing by accepting everything: the one-digit reading is still wrong.
    expect(checkAnswer(editor.toAnswer(doc.nodes), 'x^4').status).toBe('incorrect');
  });

  it('stacks a negative exponent', () => {
    const doc = type(power!(type(editor.EMPTY_DOC, 'x')), '-3');
    expect(editor.toTex(doc.nodes)).toBe('x^{-3}');
    expect(checkAnswer(editor.toAnswer(doc.nodes), 'x^(-3)').status).toBe('correct');
  });

  it('takes a fraction inside the exponent', () => {
    let doc = editor.insertFraction(power!(type(editor.EMPTY_DOC, 'x')));
    doc = editor.moveRight(type(doc, '1'));
    doc = type(doc, '2');
    expect(checkAnswer(editor.toAnswer(doc.nodes), 'x^(1/2)', { domain: 'positive' as never }).status)
      .toBe('correct');
  });

  it('renders under KaTeX strict mode', () => {
    const doc = type(power!(type(editor.EMPTY_DOC, 'x')), '14');
    expect(() =>
      katex.renderToString(editor.toTex(doc.nodes), { throwOnError: true, strict: 'error' }),
    ).not.toThrow();
  });
});
