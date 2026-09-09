/**
 * Content model.
 *
 * A course is levels of lessons; a lesson is roughly ten guided slides followed
 * by three skill-check questions. Guided slides alternate between teaching a
 * technique and practising it; the skill check is sealed, with no route back to
 * the worked examples.
 */
import type { Rng } from '../engine/rng';

/** A unit of rendered content. Prose may embed inline maths between $ signs. */
export type Block =
  | { kind: 'prose'; text: string }
  | { kind: 'display'; tex: string };

/** One line of a worked solution, shown only when the learner asks for it. */
export interface SolutionStep {
  /** Explanatory line; may contain $inline maths$. */
  text?: string;
  /** A centred equation for this step. */
  tex?: string;
}

/** A key on the contextual maths keypad. `i` appears only for complex topics. */
export interface KeypadKey {
  /** Text inserted into the answer. */
  insert: string;
  /** Label rendered on the key; defaults to `insert`. */
  label?: string;
  /** Rendered as TeX rather than plain text (used for `i`). */
  tex?: boolean;
}

interface Prompted {
  /** The question, shown above the answer area. */
  prompt: Block[];
}

export type Slide =
  /** Explains an idea. No answer required — the only control is Continue. */
  | ({ kind: 'teach'; body: Block[] })
  /** Tap one option from a small set. */
  | ({ kind: 'choice' } & Prompted & {
      options: { id: string; label: string; tex?: boolean }[];
      correctId: string;
    })
  /** Type an expression on the contextual keypad. Checked by equivalence. */
  | ({ kind: 'expression' } & Prompted & {
      /** Shown to the left of the input, e.g. "3i + 7i =". TeX. */
      lead?: string;
      keypad: KeypadKey[];
      /** The canonical answer; anything equivalent to it is accepted. */
      answer: string;
      domain: 'real' | 'complex';
      mode: 'exact' | 'upToConstant';
    })
  /** Drop tokens from a bank into blanks in an equation. */
  | ({ kind: 'tiles' } & Prompted & {
      /** TeX with {0}, {1}, … marking the blanks. */
      template: string;
      /** Tokens offered, including distractors. */
      bank: string[];
      /** Expected token per blank. */
      answer: string[];
      /** When true the blanks may be filled in any order (e.g. "x = a or x = b"). */
      unordered?: boolean;
    });

/**
 * Produces a slide from randomised parameters.
 *
 * `render` and `solution` both receive the same parameters, which is what lets
 * the opt-in worked solution use the learner's actual numbers rather than a
 * generic template.
 */
export interface Generator<P = unknown> {
  id: string;
  sample(rng: Rng, difficulty: number): P;
  render(params: P): Slide;
  solution(params: P): SolutionStep[];
}

export type GeneratorRegistry = Record<string, Generator<never>>;

export type SlideRef =
  | { type: 'literal'; slide: Slide; solution?: SolutionStep[] }
  | { type: 'generated'; generatorId: string; difficulty?: number };

export interface Lesson {
  id: string;
  title: string;
  /** Roughly ten slides: teach, practise x3, teach, practise x2-3. */
  slides: SlideRef[];
  /** Three sealed questions. Guided slides cannot be reviewed from here. */
  skillCheck: SlideRef[];
}

export interface Level {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  blurb: string;
  levels: Level[];
}
