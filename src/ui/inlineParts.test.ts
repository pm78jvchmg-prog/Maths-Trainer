import { describe, expect, it } from 'vitest';
import { inlineParts } from './inlineParts';

describe('inlineParts', () => {
  it('keeps a pound sign with the price after it', () => {
    expect(inlineParts('costs £$5$ a month')).toEqual([
      { kind: 'text', text: 'costs ' },
      { kind: 'maths', tex: '5', before: '£', after: '' },
      { kind: 'text', text: ' a month' },
    ]);
  });

  it('keeps each comma of a list with the value before it', () => {
    const parts = inlineParts('Values: $47$, $52$, $58$.');
    expect(parts.filter((p) => p.kind === 'maths')).toEqual([
      { kind: 'maths', tex: '47', before: '', after: ',' },
      { kind: 'maths', tex: '52', before: '', after: ',' },
      { kind: 'maths', tex: '58', before: '', after: '.' },
    ]);
  });

  it('loses and repeats no character', () => {
    const text = 'Take (£$12$), then *half* of **that**: $x = 3$; done!';
    const back = inlineParts(text)
      .map((p) =>
        p.kind === 'maths' ? `${p.before}$${p.tex}$${p.after}` : p.kind === 'bold' ? `**${p.text}**` : p.kind === 'italic' ? `*${p.text}*` : p.text,
      )
      .join('');
    expect(back).toBe(text);
  });

  it('leaves text after a space alone', () => {
    expect(inlineParts('$x$ , then')[0]).toEqual({ kind: 'maths', tex: 'x', before: '', after: '' });
  });
});

describe('inlineParts, long formulas', () => {
  it('leaves a formula long enough to need its own breaks unglued', () => {
    const tex = 'x^{2} + 5x + 6 = (x + 2)(x + 3)';
    expect(inlineParts(`So $${tex}$, as claimed.`)[1]).toEqual({ kind: 'maths', tex, before: '', after: '' });
  });
});
