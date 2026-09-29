import { describe, expect, it } from 'vitest';
import { formProblem } from './answerForm';
import { reduce, startSession } from './session';
import { toAnswer, docFromKeys } from '../ui/mathInput';

const sf = { kind: 'standardForm' } as const;
const surd7 = { kind: 'surd', radicand: 7 } as const;

/** What the editor hands the checker for these keys pressed in order. */
const typed = (...keys: string[]) => toAnswer(docFromKeys(keys.map((insert) => ({ insert }))).nodes);

describe('standard form', () => {
  it('takes the number written out, or in standard form as the keypad types it', () => {
    expect(formProblem('292000', sf)).toBeUndefined();
    expect(formProblem(typed('2', '.', '9', '2', '*10^', '5'), sf)).toBeUndefined();
    expect(formProblem('2.92*10^(-5)', sf)).toBeUndefined();
    expect(formProblem('-2.92*10^5', sf)).toBeUndefined();
  });

  it('refuses the question typed back, and a front number outside 1 to 10', () => {
    expect(formProblem('3.6*10^5 - 6.8*10^4', sf)).toBeDefined();
    expect(formProblem('29.2*10^4', sf)).toBeDefined();
    expect(formProblem('0.292*10^6', sf)).toBeDefined();
    expect(formProblem('2.92*10^(5/2)', sf)).toBeDefined();
  });
});

describe('p + q√d', () => {
  it('takes one whole number and one multiple of the surd, either way round', () => {
    expect(formProblem(typed('2', '0', '+', '1', '4', 'sqrt(', '7'), surd7)).toBeUndefined();
    expect(formProblem('20 - 14sqrt(7)', surd7)).toBeUndefined();
    expect(formProblem('-sqrt(7) + 3', surd7)).toBeUndefined();
    expect(formProblem('sqrt(7)', surd7)).toBeUndefined();
    expect(formProblem('(20) + (-14)*sqrt(7)', surd7)).toBeUndefined();
  });

  it('refuses working left uncollected, a different surd, and the question typed back', () => {
    expect(formProblem('12 + 12sqrt(7) + 8 + 2sqrt(7)', surd7)).toBeDefined();
    expect(formProblem('20 + 14sqrt(28)', surd7)).toBeDefined();
    expect(formProblem('4(3 + 3sqrt(7)) + 2(4 + sqrt(7))', surd7)).toBeDefined();
    expect(formProblem('20 + 14', surd7)).toBeDefined();
  });
});

describe('in the reducer', () => {
  const lesson = {
    id: 'form-test',
    title: 'Form',
    slides: [
      {
        type: 'literal' as const,
        slide: {
          kind: 'expression' as const,
          prompt: [],
          keypad: [],
          answer: '292000',
          domain: 'real' as const,
          mode: 'exact' as const,
          form: sf,
        },
      },
    ],
    skillCheck: [],
  };
  const submit = (answer: string) =>
    reduce(startSession(lesson, {}, 1), { type: 'submit', answer }).feedback.kind;

  it('marks the question typed back as unreadable, not right and not wrong', () => {
    expect(submit('3.6*10^5 - 6.8*10^4')).toBe('invalid');
    expect(submit('292000')).toBe('correct');
    expect(submit('2.92*10^5')).toBe('correct');
    expect(submit('2.93*10^5')).toBe('incorrect');
  });
});
