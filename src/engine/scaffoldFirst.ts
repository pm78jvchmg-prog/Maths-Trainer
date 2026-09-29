import type { Generator, GeneratorRegistry, Slide, SlideRef } from '../content/types';
import { familyOf } from '../content/choiceVariant';
import { makeRng } from './rng';

/**
 * A question broken into its working comes before the question that asks for
 * the same result in one go.
 *
 * The owner met "find the hypotenuse" as one typed answer, then a few slides
 * on "find c², then c" for the same sum, and the breakdown only repeated what
 * had already been done whole. The breakdown is the easier way in, so it goes
 * first and the whole answer follows it.
 *
 * Done here, when a deck is resolved, rather than in some two hundred lesson
 * files, so a lesson written tomorrow is ordered the same way.
 *
 * A **breakdown** is a slide that asks for the working (`steps`, `tree`,
 * `reduce`, `flow`, `table`, `iterate`, or `tiles` with two or more blanks); a
 * **whole answer** is one typed answer or one choice (`expression`, `choice`,
 * `evaluate`). The two ask about the **same method** when they are one family
 * (`familyOf`: `x`, `x+choice`, `x-steps`, `x-tree`) or share a worked
 * solution, which is how a generator file says two questions are one sum.
 *
 * Where a whole answer comes before a breakdown of the same method, the two
 * questions trade places (across a teach slide only for the very same
 * question; see `breaksDown`). Each slot keeps its own difficulty, so the deck
 * still climbs as `rampOrder` left it; a question with a lead-in stays put,
 * since its lead-in was written for it. The breakdown may move up past a teach
 * slide: it is the whole answer's own question with the working asked for, and
 * that question's method was taught before it.
 */
export function scaffoldFirst(refs: readonly SlideRef[], registry: GeneratorRegistry): SlideRef[] {
  const out = [...refs];
  const stretch = stretches(refs);
  for (let i = 0; i < out.length; i += 1) {
    const whole = movable(out[i]);
    if (!whole || shapeOf(whole.generatorId, registry) !== 'whole') continue;
    for (let j = i + 1; j < out.length; j += 1) {
      const later = movable(out[j]);
      if (!later || shapeOf(later.generatorId, registry) !== 'breakdown') continue;
      if (!breaksDown(later.generatorId, whole.generatorId, stretch[i] === stretch[j], registry)) continue;
      out[i] = { ...whole, generatorId: later.generatorId };
      out[j] = { ...later, generatorId: whole.generatorId };
      break;
    }
  }
  return out;
}

/**
 * Which stretch each slide sits in, counting from 0. A literal slide or a
 * question with a lead-in teaches, so it starts a new one.
 */
export function stretches(refs: readonly SlideRef[]): number[] {
  let n = 0;
  return refs.map((ref) => (movable(ref) ? n : ++n));
}

/**
 * Does a breakdown ask the working of a whole-answer question, closely enough
 * that it must come first?
 *
 * In one stretch, the same method is enough: whatever taught one taught both.
 * Across a teach slide it takes the same question, drawn by the same sampler
 * and worked by the same solution. A family can widen as it goes (`rad-add`
 * adds like surds, `rad-add-steps` simplifies unlike ones first, taught by the
 * slide between them), and moving that breakdown up would ask it untaught.
 */
export function breaksDown(breakdown: string, whole: string, sameStretch: boolean, registry: GeneratorRegistry): boolean {
  return sameStretch ? sameMethod(whole, breakdown, registry) : sameQuestion(whole, breakdown, registry);
}

type GeneratedRef = Extract<SlideRef, { type: 'generated' }>;

function movable(ref: SlideRef): GeneratedRef | undefined {
  if (ref.type !== 'generated' || (ref.leadIn?.length ?? 0) > 0) return undefined;
  return ref;
}

export type Shape = 'breakdown' | 'whole' | 'other';

const WORKING_KINDS = new Set<Slide['kind']>(['steps', 'tree', 'reduce', 'flow', 'table', 'iterate']);
const WHOLE_KINDS = new Set<Slide['kind']>(['expression', 'choice', 'evaluate']);

/** A few draws each: a generator is one shape only when every draw agrees. */
const SHAPE_DRAWS = [1, 2, 1, 2];

const shapes = new WeakMap<Generator<never>, Shape>();

/** Is a generator's question a breakdown, a whole answer, or neither? */
export function shapeOf(generatorId: string, registry: GeneratorRegistry): Shape {
  const generator = registry[generatorId];
  if (!generator) return 'other';
  const known = shapes.get(generator);
  if (known) return known;
  const seen = new Set<Shape>();
  SHAPE_DRAWS.forEach((difficulty, n) => {
    const slide = generator.render(generator.sample(makeRng(`shape:${generatorId}:${n}`), difficulty));
    seen.add(shapeOfSlide(slide));
  });
  const shape: Shape = seen.size === 1 ? [...seen][0] : 'other';
  shapes.set(generator, shape);
  return shape;
}

function shapeOfSlide(slide: Slide): Shape {
  if (WORKING_KINDS.has(slide.kind)) return 'breakdown';
  if (slide.kind === 'tiles') return slide.answer.length >= 2 ? 'breakdown' : 'other';
  if (WHOLE_KINDS.has(slide.kind)) return 'whole';
  return 'other';
}

/** Do two generators ask about one computation? */
export function sameMethod(a: string, b: string, registry: GeneratorRegistry): boolean {
  if (familyOf(a) === familyOf(b)) return true;
  const solutionA = baseOf(a, registry)?.solution;
  return solutionA !== undefined && solutionA === baseOf(b, registry)?.solution;
}

/** Do two generators draw the same question and work it the same way? */
export function sameQuestion(a: string, b: string, registry: GeneratorRegistry): boolean {
  const x = baseOf(a, registry);
  const y = baseOf(b, registry);
  return !!x && !!y && x.sample === y.sample && x.solution === y.solution;
}

/** A derived `+choice` generator wraps its original's solution; compare the original's. */
function baseOf(id: string, registry: GeneratorRegistry): Generator<never> | undefined {
  return registry[id.replace(/\+choice$/, '')] ?? registry[id];
}
