/**
 * Walking a decision tree.
 *
 * Lives on its own because two callers need the same answer to "where does this
 * path end up?": the widget, to know what to draw, and `hasAnswer`, to know
 * whether *Check* should be live. If they each walked the tree themselves they
 * could disagree — and the way they would disagree is a Check button that grades
 * a walk the learner has not finished, or one that never lights up at all.
 *
 * Nothing is stored. The path in the session is the whole state, and everything
 * on screen is derived from it, so stepping back cannot leave the two out of
 * step.
 */
import type { Slide } from '../content/types';

type FlowSlide = Extract<Slide, { kind: 'flow' }>;
type FlowStep = FlowSlide['steps'][number];
type FlowBranch = FlowStep['branches'][number];

export interface Walk {
  /** The forks already answered, oldest first. */
  trail: { ask: string; label: string }[];
  /** The fork now being asked, if the walk has not finished. */
  step?: FlowStep;
  /** Where the walk ended, if it reached a leaf. */
  outcome?: string;
}

export function walkFlow(slide: FlowSlide, taken: readonly string[]): Walk {
  const trail: Walk['trail'] = [];
  let step: FlowStep | undefined = slide.steps[0];

  for (const label of taken) {
    if (!step) break;
    const branch: FlowBranch | undefined = step.branches.find(
      (candidate) => candidate.label === label,
    );
    // A label that is not on offer here means the path has been tampered with
    // or the content changed under a stored answer. Stop rather than guess.
    if (!branch) break;
    trail.push({ ask: step.ask, label });
    if (branch.outcome !== undefined) return { trail, outcome: branch.outcome };
    step = slide.steps.find((candidate): candidate is FlowStep => candidate.id === branch.to);
  }

  return { trail, step };
}
