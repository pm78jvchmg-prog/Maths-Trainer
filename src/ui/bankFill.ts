/**
 * Blanks filled from a bank, in any order: the state the probability tree
 * and the Venn diagram share, taken from `iterateSlide.tsx`.
 *
 * Holds which blank the next tile goes into and nothing else. The values
 * placed so far are the draft itself, so the reducer still owns the answer
 * and no verdict is ever computed here.
 */
import { useState } from 'react';
import type { Answer } from '../engine/session';

export function useBankFill(answer: Answer, size: number, onAnswer: (answer: Answer) => void) {
  const filled = Array.from({ length: size }, (_, i) =>
    Array.isArray(answer) ? (answer[i] ?? '') : '',
  );
  const [chosen, setChosen] = useState(0);

  // The blank the next tile lands in: the one the learner picked while it is
  // still empty, otherwise the first empty one.
  const firstEmpty = filled.findIndex((slot) => slot === '');
  const target = filled[chosen] === '' ? chosen : firstEmpty;

  const spent = new Map<string, number>();
  for (const token of filled) {
    if (token) spent.set(token, (spent.get(token) ?? 0) + 1);
  }

  /** Whether the bank's tile at `idx` is already placed (a repeated value counts each copy). */
  const used = (bank: string[], idx: number) =>
    bank.slice(0, idx).filter((other) => other === bank[idx]).length < (spent.get(bank[idx]) ?? 0);

  /** Tapping a filled blank empties it; either way it becomes the target. */
  const tapBlank = (idx: number) => {
    if (filled[idx] !== '') {
      const next = [...filled];
      next[idx] = '';
      onAnswer(next);
    }
    setChosen(idx);
  };

  const place = (value: string) => {
    if (target === -1) return;
    const next = [...filled];
    next[target] = value;
    onAnswer(next);
    // On to the next blank, wrapping round to any left before it.
    const after = [...next.slice(target + 1), ...next.slice(0, target + 1)].findIndex(
      (slot) => slot === '',
    );
    setChosen(after === -1 ? target : (target + 1 + after) % size);
  };

  const clear = () => {
    onAnswer(Array.from({ length: size }, () => ''));
    setChosen(0);
  };

  return { filled, target, used, tapBlank, place, clear };
}
