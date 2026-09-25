/**
 * Demonstration generators for the `forces` slide.
 *
 * Roadmap batch C21-widget ships the widget ahead of C21 Forces & Newton's
 * Laws, so no lesson references these yet. They exist so the property tests
 * sweep the widget's slides from the first day, and as the pattern that
 * course starts from.
 *
 * - `fd-pick` asks which forces act. Difficulty 1 is a box on a level floor
 *   (at rest, sliding, or pulled); difficulty 2 is a box on a slope drawn at
 *   its stated angle, or hanging from a string. Every candidate arrow is a
 *   force a learner might plausibly draw: friction on a smooth floor, a
 *   "force of motion" after the push has stopped, a reaction drawn straight
 *   up on a slope, a pull drawn horizontal when it runs along the slope.
 * - `fd-fill` draws every force that acts on a box pulled along a level floor
 *   and leaves one to three magnitudes blank: the weight `mg` with g = 9.8,
 *   the reaction that balances it, the stated pull, and at difficulty 2 the
 *   friction on a rough floor at a steady speed or accelerating.
 *
 * Arrows are listed in a fixed order, never shuffled, and banks are sorted
 * (PITFALLS 3.10). Units live in the prose and in the labels, never in a
 * token: a token is the bare number.
 */
import type { Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { canonicalForces, type Direction, type ForceArrow, type ForceScene } from '../forces';
import { aOrAn } from './format';

type Side = 'left' | 'right';
const other = (side: Side): Side => (side === 'left' ? 'right' : 'left');

/** A number as a token and as the learner reads it: at most one place, no `.0`. */
const fmt = (value: number): string => String(Math.round(value * 10) / 10);

/** What each letter stands for, in the order the letters first appear. */
const MEANING: Record<string, string> = {
  W: 'the weight',
  R: 'the normal reaction',
  F: 'friction',
  T: 'the tension in the string',
  P: 'a push or a pull',
};

/** One sentence naming every letter on the diagram. */
function keyLine(labels: readonly string[]): string {
  const letters = [...new Set(labels.filter((label) => label in MEANING))];
  const parts = letters.map((letter, idx) => `$${letter}$ ${idx === 0 ? 'is ' : ''}${MEANING[letter]}`);
  const joined =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `On the diagram, ${joined}.`;
}

/* ---------- fd-pick ---------- */

interface Candidate {
  id: Direction;
  label: string;
  acts: boolean;
  /** Why it does or does not act, for the worked solution. May hold `$...$`. */
  why: string;
}

interface PickParams {
  scene: ForceScene;
  story: string;
  arrows: Candidate[];
}

const newton = (value: number) => `${value}\\text{ N}`;

// A number and its unit in prose, as one piece of maths, so the line never
// breaks between them.
const kg = (value: number) => `$${value}\\text{ kg}$`;
const inN = (value: number) => `$${value}\\text{ N}$`;

/** Weight: always there, always straight down. */
const weight = (m: number): Candidate => ({
  id: 'down',
  label: 'W',
  acts: true,
  why: `The weight $W = ${m}g$ always acts, straight down.`,
});

function levelPick(rng: Rng): PickParams {
  const m = rng.int(1, 15);
  const side: Side = rng.pick(['left', 'right'] as const);
  const behind = other(side);
  const reaction: Candidate = {
    id: 'up',
    label: 'R',
    acts: true,
    why: 'The floor pushes back on the box at right angles to itself: $R$ acts straight up.',
  };
  const kind = rng.pick(['rest', 'slideSmooth', 'slideRough', 'pullSmooth'] as const);
  const scene: ForceScene = { surface: 'level' };

  if (kind === 'rest') {
    return {
      scene,
      story: `${aOrAn(m, true)} ${kg(m)} box rests on a rough floor. Nothing pushes or pulls it.`,
      arrows: [
        weight(m),
        reaction,
        { id: 'left', label: 'F', acts: false, why: 'With nothing trying to move it, there is no friction to the left.' },
        { id: 'right', label: 'F', acts: false, why: 'Nor any to the right: friction only opposes a push or a slide.' },
      ],
    };
  }

  if (kind === 'pullSmooth') {
    const pull = rng.int(4, 40);
    return {
      scene,
      story: `${aOrAn(m, true)} ${kg(m)} box is pulled to the ${side} along a smooth floor by a horizontal force of ${inN(pull)}.`,
      arrows: [
        weight(m),
        reaction,
        { id: side, label: newton(pull), acts: true, why: `The pull of ${inN(pull)} acts to the ${side}, the way it is pulled.` },
        { id: behind, label: 'F', acts: false, why: 'The floor is smooth, so there is no friction.' },
      ],
    };
  }

  const smooth = kind === 'slideSmooth';
  return {
    scene,
    story: `${aOrAn(m, true)} ${kg(m)} box was pushed and let go. It is now sliding to the ${side} across a ${
      smooth ? 'smooth' : 'rough'
    } floor, with nothing pushing it.`,
    arrows: [
      weight(m),
      reaction,
      smooth
        ? { id: behind, label: 'F', acts: false, why: 'The floor is smooth, so there is no friction.' }
        : { id: behind, label: 'F', acts: true, why: `Friction opposes the slide, so it acts to the ${behind}.` },
      {
        id: side,
        label: 'P',
        acts: false,
        why: 'The push ended when the box was let go. Nothing pushes it along now: it keeps moving without a force.',
      },
    ],
  };
}

function slopePick(rng: Rng): PickParams {
  const m = rng.int(1, 15);
  const angle = rng.pick([25, 30, 35, 40]);
  const rises: Side = rng.pick(['left', 'right'] as const);
  const scene: ForceScene = { surface: 'slope', angle, rises };
  const normal: Candidate = {
    id: 'outOfSlope',
    label: 'R',
    acts: true,
    why: 'The slope pushes back at right angles to its surface: $R$ acts out of the slope, not straight up.',
  };
  const upright: Candidate = {
    id: 'up',
    label: 'R',
    acts: false,
    why: 'A reaction drawn straight up is not at right angles to the slope, so that $R$ is wrong.',
  };
  const kind = rng.pick(['rest', 'slideSmooth', 'slideRough', 'pullRough', 'pullSmooth', 'string'] as const);
  const on = `a slope at $${angle}^\\circ$ to the horizontal`;

  if (kind === 'rest') {
    return {
      scene,
      story: `${aOrAn(m, true)} ${kg(m)} box rests on ${on}. The slope is rough.`,
      arrows: [
        weight(m),
        normal,
        upright,
        { id: 'upSlope', label: 'F', acts: true, why: 'The box would slide down, so friction acts up the slope and holds it.' },
        { id: 'downSlope', label: 'F', acts: false, why: 'Friction opposes the slide it prevents, so it cannot act down the slope.' },
      ],
    };
  }

  if (kind === 'slideSmooth' || kind === 'slideRough') {
    const smooth = kind === 'slideSmooth';
    return {
      scene,
      story: `${aOrAn(m, true)} ${kg(m)} box slides down ${on}. The slope is ${smooth ? 'smooth' : 'rough'}.`,
      arrows: [
        weight(m),
        normal,
        upright,
        smooth
          ? { id: 'upSlope', label: 'F', acts: false, why: 'The slope is smooth, so there is no friction.' }
          : { id: 'upSlope', label: 'F', acts: true, why: 'Friction opposes the slide, so it acts up the slope.' },
        {
          id: 'downSlope',
          label: 'P',
          acts: false,
          why: 'Nothing pushes it down the slope: the weight does that job, and it is already drawn.',
        },
      ],
    };
  }

  if (kind === 'string') {
    return {
      scene,
      story: `${aOrAn(m, true)} ${kg(m)} box is held at rest on ${on} by a string parallel to the slope. The slope is smooth.`,
      arrows: [
        weight(m),
        normal,
        upright,
        { id: 'upSlope', label: 'T', acts: true, why: 'The string pulls along itself, up the slope.' },
        { id: 'downSlope', label: 'F', acts: false, why: 'The slope is smooth, so there is no friction.' },
      ],
    };
  }

  const pull = rng.int(10, 60);
  const rough = kind === 'pullRough';
  return {
    scene,
    story: `${aOrAn(m, true)} ${kg(m)} box is pulled up ${on} by a force of ${inN(pull)} parallel to the slope. The slope is ${
      rough ? 'rough' : 'smooth'
    }.`,
    arrows: [
      weight(m),
      normal,
      upright,
      { id: 'upSlope', label: newton(pull), acts: true, why: `The pull of ${inN(pull)} acts along the slope, up it.` },
      rough
        ? { id: 'downSlope', label: 'F', acts: true, why: 'Friction opposes the motion up the slope, so it acts down the slope.' }
        : { id: 'downSlope', label: 'F', acts: false, why: 'The slope is smooth, so there is no friction.' },
      {
        id: rises,
        label: newton(pull),
        acts: false,
        why: `The pull runs parallel to the slope, not horizontally, so the horizontal ${inN(pull)} arrow is wrong.`,
      },
    ],
  };
}

function hangingPick(rng: Rng): PickParams {
  const m = rng.int(1, 15);
  const story = rng.pick([
    'hangs at rest from a light string',
    'is being raised at a steady speed on a light string',
    'is being lowered at a steady speed on a light string',
    'hangs from a light string tied to a hook in the ceiling',
  ]);
  const rSide: Side = rng.pick(['left', 'right'] as const);
  return {
    scene: { surface: 'hanging' },
    story: `${aOrAn(m, true)} ${kg(m)} box ${story}. Nothing else touches it.`,
    arrows: [
      weight(m),
      { id: 'up', label: 'T', acts: true, why: 'The string pulls up along itself: tension $T$.' },
      { id: rSide, label: 'R', acts: false, why: 'No surface touches the box, so there is no reaction.' },
      { id: other(rSide), label: 'F', acts: false, why: 'No surface touches the box, so there is no friction either.' },
    ],
  };
}

const forcePick: Generator<PickParams> = {
  id: 'fd-pick',
  sample(rng, difficulty) {
    if (difficulty <= 1) return levelPick(rng);
    return rng.chance(0.7) ? slopePick(rng) : hangingPick(rng);
  },
  render({ scene, story, arrows }) {
    return {
      kind: 'forces',
      mode: 'pick',
      prompt: [
        { kind: 'prose', text: story },
        { kind: 'prose', text: `${keyLine(arrows.map((a) => a.label))} Tap every force that acts on the box.` },
      ],
      scene,
      arrows: arrows.map(({ id, label }) => ({ id, label })),
      answer: canonicalForces(arrows.filter((a) => a.acts).map((a) => a.id).join('|')),
    };
  },
  solution({ arrows }): SolutionStep[] {
    const acting = arrows.filter((a) => a.acts);
    return [
      ...arrows.map((a) => ({ text: a.why })),
      {
        text: `So ${acting.length} forces act: ${acting
          .map((a) => `$${a.label}$`)
          .join(', ')
          .replace(/, ([^,]*)$/, ' and $1')}.`,
      },
    ];
  },
};

/* ---------- fd-fill ---------- */

type Quantity = 'W' | 'R' | 'P' | 'F';

interface FillParams {
  m: number;
  pull: number;
  side: Side;
  /** Absent on a smooth floor. Zero is a steady speed. */
  accel?: number;
  blanks: Quantity[];
}

const G = 9.8;

function values({ m, pull, accel }: FillParams): Record<Quantity, number> {
  const w = G * m;
  return { W: w, R: w, P: pull, F: accel === undefined ? 0 : pull - m * accel };
}

const quantities = (p: FillParams): Quantity[] => (p.accel === undefined ? ['W', 'R', 'P'] : ['W', 'R', 'P', 'F']);

const ARROW_OF = (side: Side): Record<Quantity, Direction> => ({
  W: 'down',
  R: 'up',
  P: side,
  F: other(side),
});

/**
 * The wrong numbers a learner reaches: g taken as 10, the mass for the
 * weight, the pull for the friction, a sign slip in F = P - ma.
 */
function distractors(p: FillParams, answers: string[]): string[] {
  const { m, pull, accel } = p;
  const candidates = [10 * m, m, G * m + pull, 2 * G * m];
  if (accel !== undefined) candidates.unshift(pull + m * accel, m * accel, pull);
  const picked: string[] = [];
  for (const value of candidates) {
    const token = fmt(value);
    if (value <= 0 || answers.includes(token) || picked.includes(token)) continue;
    picked.push(token);
    if (picked.length === 3) break;
  }
  return picked;
}

const forceFill: Generator<FillParams> = {
  id: 'fd-fill',
  sample(rng, difficulty) {
    const m = rng.int(1, 20);
    const side: Side = rng.pick(['left', 'right'] as const);
    if (difficulty <= 1) {
      return { m, side, pull: rng.int(5, 40), blanks: rng.pick([['W', 'R'], ['W', 'R', 'P'], ['R']] as Quantity[][]) };
    }
    const accel = rng.pick([0, 0, 0.5, 1, 1.5, 2]);
    // The pull outweighs what the acceleration needs, so friction is left over.
    const pull = Math.ceil(m * accel) + rng.int(4, 30);
    return { m, side, pull, accel, blanks: rng.pick([['F'], ['W', 'R', 'F'], ['R', 'F']] as Quantity[][]) };
  },
  render(p) {
    const v = values(p);
    const arrowOf = ARROW_OF(p.side);
    const arrows: ForceArrow[] = quantities(p).map((q) => ({
      id: arrowOf[q],
      label: q,
      ...(p.blanks.includes(q) ? {} : { given: fmt(v[q]) }),
    }));
    const answer = quantities(p)
      .filter((q) => p.blanks.includes(q))
      .map((q) => fmt(v[q]));
    const bank = [...answer, ...distractors(p, answer)].sort((a, b) => Number(a) - Number(b));
    const floor = p.accel === undefined ? 'smooth' : 'rough';
    const motion =
      p.accel === undefined ? '' : p.accel === 0 ? ' It moves at a steady speed.' : ` It accelerates at $${fmt(p.accel)}\\text{ m s}^{-2}$.`;
    return {
      kind: 'forces',
      mode: 'fill',
      prompt: [
        {
          kind: 'prose',
          text: `${aOrAn(p.m, true)} ${kg(p.m)} box is pulled to the ${p.side} along a ${floor} floor by a horizontal force $P$ of ${inN(p.pull)}.${motion}`,
        },
        {
          kind: 'prose',
          text: `${keyLine(quantities(p))} Take $g = 9.8\\text{ m s}^{-2}$ and fill in the missing forces.`,
        },
      ],
      scene: { surface: 'level' },
      arrows,
      bank,
      answer,
    };
  },
  solution(p) {
    const v = values(p);
    const steps: SolutionStep[] = [
      { text: 'Weight is mass times $g$:', tex: `W = ${p.m} \\times 9.8 = ${fmt(v.W)}\\text{ N}` },
      {
        text: 'Nothing else acts up or down, and the box does not leave the floor, so the reaction balances the weight:',
        tex: `R = W = ${fmt(v.R)}\\text{ N}`,
      },
      { text: `The pull $P$ is given: ${inN(p.pull)} to the ${p.side}.` },
    ];
    if (p.accel === 0) {
      steps.push({
        text: 'At a steady speed the horizontal forces balance, so friction equals the pull:',
        tex: `F = P = ${fmt(v.F)}\\text{ N}`,
      });
    } else if (p.accel !== undefined) {
      steps.push({
        text: 'The resultant force is mass times acceleration, so the pull beats friction by exactly $ma$:',
        tex: `P - F = ma \\implies F = ${p.pull} - ${p.m} \\times ${fmt(p.accel)} = ${fmt(v.F)}\\text{ N}`,
      });
    }
    return steps;
  },
};

export const forceDiagramGenerators = [forcePick, forceFill];
