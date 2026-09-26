/**
 * The derived `evaluate` slide keeps its reduction's question.
 *
 * It once read only "Evaluate the expression." whatever the reduction was
 * about, while the worked solution, written for the reduction, compared the
 * value with an equation the learner had not been shown: "The right-hand side
 * is 49, not 52, so x = 8 is not a solution".
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../engine/rng';
import { evaluatePromptFrom } from './choiceVariant';
import { registeredGenerators } from './registry';

describe('a derived evaluate slide', () => {
  it('keeps the question and drops the tapping instructions', () => {
    const prompt = evaluatePromptFrom([
      { kind: 'prose', text: 'Is $x = 8$ a solution of $6x + 4 = 49$? Tap the part you would do **next**, then choose what it comes to.' },
    ]);
    expect(prompt).toEqual([
      { kind: 'prose', text: 'Is $x = 8$ a solution of $6x + 4 = 49$?' },
    ]);
  });

  it('asks for the value when the question is a statement', () => {
    const prompt = evaluatePromptFrom([
      { kind: 'prose', text: 'Find the determinant, one piece at a time. Tap the part to work out next, then choose its value.' },
      { kind: 'display', tex: '\\det M' },
    ]);
    expect(prompt).toEqual([
      { kind: 'prose', text: 'Find the determinant.' },
      { kind: 'display', tex: '\\det M' },
      { kind: 'prose', text: 'What does it come to?' },
    ]);
  });

  it('falls back to evaluating when nothing but instructions was said', () => {
    expect(evaluatePromptFrom([{ kind: 'prose', text: 'Work this out one piece at a time. Tap the part you would do **next**, then choose what it comes to.' }])).toEqual([
      { kind: 'prose', text: 'Evaluate the expression.' },
    ]);
  });

  it('never tells the learner to tap, on any generator', () => {
    const offending: string[] = [];
    for (const generator of registeredGenerators) {
      if (!generator.id.endsWith('+choice')) continue;
      for (const difficulty of [1, 2]) {
        const slide = generator.render(generator.sample(makeRng(difficulty), difficulty));
        if (slide.kind !== 'evaluate') continue;
        const text = slide.prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' ');
        if (/\btap\b|one piece at a time/i.test(text)) offending.push(`${generator.id}: ${text}`);
      }
    }
    expect(offending).toEqual([]);
  });
});
