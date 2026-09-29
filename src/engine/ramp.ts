import type { SlideRef } from '../content/types';

/**
 * A deck's questions in rising difficulty, so a lesson climbs rather than
 * bouncing between easy and hard.
 *
 * The owner found lessons "a little too challenging and lacking progression",
 * and one reason was order: a harder draw often came straight after a teach
 * slide and an easier one after it. Sorting here rather than in 1,290 lesson
 * files means a lesson written later climbs too.
 *
 * Only a run of plain generated questions is sorted, and stably, so equal
 * difficulties keep their written order. A teach slide or any other literal
 * slide ends a run, since the questions after it are about what it taught. A
 * question with a lead-in stays where it is and ends a run the same way: its
 * lead-in teaches, and the questions after it may lean on that.
 */
export function rampOrder(refs: readonly SlideRef[]): SlideRef[] {
  const out: SlideRef[] = [];
  let run: SlideRef[] = [];
  const flush = () => {
    run.sort((a, b) => difficultyOf(a) - difficultyOf(b));
    out.push(...run);
    run = [];
  };
  for (const ref of refs) {
    if (ref.type !== 'generated') {
      flush();
      out.push(ref);
      continue;
    }
    if (ref.leadIn && ref.leadIn.length > 0) {
      flush();
      out.push(ref);
      continue;
    }
    run.push(ref);
  }
  flush();
  return out;
}

function difficultyOf(ref: SlideRef): number {
  return ref.type === 'generated' ? (ref.difficulty ?? 1) : 1;
}
