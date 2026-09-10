import { describe, it, expect } from 'vitest';
import {
  startSession,
  reduce,
  currentSlide,
  canGoBack,
  canReveal,
  canRetry,
  scorePercent,
  skillCheckScore,
  type Session,
  type Action,
} from './session';
import type { Lesson, GeneratorRegistry, Generator } from '../content/types';

/** A generator whose answer depends on its drawn parameters, so we can prove
 *  that "try again" re-presents the same question rather than a fresh one. */
const addImaginary: Generator<{ a: number; b: number }> = {
  id: 'add-imaginary',
  sample: (rng) => ({ a: rng.int(2, 9), b: rng.int(2, 9) }),
  render: ({ a, b }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `What is $${a}i + ${b}i$?` }],
    lead: `${a}i + ${b}i =`,
    keypad: [{ insert: 'i', tex: true }],
    answer: `${a + b}i`,
    domain: 'complex',
    mode: 'exact',
  }),
  solution: ({ a, b }) => [
    { text: 'Add the coefficients.', tex: `${a}i + ${b}i = ${a + b}i` },
  ],
};

const registry: GeneratorRegistry = {
  'add-imaginary': addImaginary as unknown as Generator<never>,
};

const lesson: Lesson = {
  id: 'demo',
  title: 'Demo',
  slides: [
    { type: 'literal', slide: { kind: 'teach', body: [{ kind: 'prose', text: 'i squared is minus one.' }] } },
    { type: 'generated', generatorId: 'add-imaginary' },
    {
      type: 'literal',
      slide: {
        kind: 'choice',
        prompt: [{ kind: 'prose', text: 'Does $x^2 = -1$ have real solutions?' }],
        options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
        correctId: 'no',
      },
      solution: [{ text: 'No real number squares to a negative.' }],
    },
  ],
  skillCheck: [
    { type: 'generated', generatorId: 'add-imaginary' },
    { type: 'generated', generatorId: 'add-imaginary' },
  ],
};

const SEED = 1234;
const start = () => startSession(lesson, registry, SEED);
const run = (session: Session, actions: Action[]) => actions.reduce(reduce, session);

/** Advance past the teaching slide at index 0. */
const pastTeach = (session: Session) => reduce(session, { type: 'continue' });

describe('session setup', () => {
  it('resolves every slide up front', () => {
    const s = start();
    expect(s.guided).toHaveLength(3);
    expect(s.skillCheck).toHaveLength(2);
    expect(s.phase).toBe('guided');
    expect(s.index).toBe(0);
  });

  it('rebuilds identically from the same seed', () => {
    const a = startSession(lesson, registry, 99);
    const b = startSession(lesson, registry, 99);
    expect(a.guided[1].slide).toEqual(b.guided[1].slide);
  });

  it('draws different questions for a different seed', () => {
    // Two seeds chosen so the generated slides genuinely differ.
    const a = startSession(lesson, registry, 1);
    const b = startSession(lesson, registry, 7);
    expect(a.guided[1].slide).not.toEqual(b.guided[1].slide);
  });

  it('throws on an unknown generator rather than silently skipping it', () => {
    const broken: Lesson = { ...lesson, slides: [{ type: 'generated', generatorId: 'nope' }] };
    expect(() => startSession(broken, registry, SEED)).toThrow(/Unknown generator/);
  });
});

describe('a wrong answer never discloses the answer', () => {
  it('stays on incorrect until the learner explicitly asks', () => {
    let s = pastTeach(start());
    s = reduce(s, { type: 'submit', answer: '999i' });

    expect(s.feedback.kind).toBe('incorrect');
    // Nothing in the feedback carries the answer.
    expect(JSON.stringify(s.feedback)).not.toMatch(/tex|steps/);
    expect(s.states[s.guided[1].id].revealed).toBe(false);
  });

  it('offers the reveal only after a wrong answer', () => {
    let s = pastTeach(start());
    expect(canReveal(s)).toBe(false); // nothing submitted yet

    s = reduce(s, { type: 'submit', answer: '999i' });
    expect(canReveal(s)).toBe(true);

    s = reduce(s, { type: 'reveal' });
    expect(s.feedback.kind).toBe('revealed');
    if (s.feedback.kind === 'revealed') expect(s.feedback.steps.length).toBeGreaterThan(0);
    expect(s.states[s.guided[1].id].revealed).toBe(true);
  });

  it('ignores a reveal that was not preceded by a wrong answer', () => {
    const s = pastTeach(start());
    expect(reduce(s, { type: 'reveal' })).toEqual(s);
  });

  it('reveals the worked solution for the actual generated numbers', () => {
    let s = pastTeach(start());
    const slide = currentSlide(s)!;
    const expected = slide.slide.kind === 'expression' ? slide.slide.answer : '';

    s = reduce(s, { type: 'submit', answer: '999i' });
    s = reduce(s, { type: 'reveal' });

    if (s.feedback.kind !== 'revealed') throw new Error('expected revealed');
    const text = s.feedback.steps.map((step) => step.tex ?? step.text ?? '').join(' ');
    expect(text).toContain(expected);
  });
});

describe('answering', () => {
  it('accepts a correct answer and awards first-try credit', () => {
    let s = pastTeach(start());
    const slide = currentSlide(s)!;
    const answer = slide.slide.kind === 'expression' ? slide.slide.answer : '';

    s = reduce(s, { type: 'submit', answer });
    expect(s.feedback.kind).toBe('correct');
    expect(s.states[slide.id]).toMatchObject({ solved: true, firstTry: true, attempts: 1 });
  });

  it('accepts an equivalent form, not just the canonical string', () => {
    let s = pastTeach(start());
    const slide = currentSlide(s)!;
    if (slide.slide.kind !== 'expression') throw new Error('expected expression slide');
    // "10i" written as a sum of two terms.
    const coefficient = Number(slide.slide.answer.replace('i', ''));
    s = reduce(s, { type: 'submit', answer: `${coefficient - 3}i + 3i` });
    expect(s.feedback.kind).toBe('correct');
  });

  it('withholds first-try credit after a wrong attempt', () => {
    let s = pastTeach(start());
    const slide = currentSlide(s)!;
    const answer = slide.slide.kind === 'expression' ? slide.slide.answer : '';

    s = reduce(s, { type: 'submit', answer: '999i' });
    s = reduce(s, { type: 'tryAgain' });
    s = reduce(s, { type: 'submit', answer });

    expect(s.feedback.kind).toBe('correct');
    expect(s.states[slide.id]).toMatchObject({ solved: true, firstTry: false, attempts: 2 });
  });

  it('treats unreadable input as invalid, not as a failed attempt', () => {
    let s = pastTeach(start());
    const slide = currentSlide(s)!;

    s = reduce(s, { type: 'submit', answer: '3i +' });
    expect(s.feedback.kind).toBe('invalid');
    expect(s.states[slide.id].attempts).toBe(0);

    // First-try credit survives a typo.
    const answer = slide.slide.kind === 'expression' ? slide.slide.answer : '';
    s = reduce(s, { type: 'submit', answer });
    expect(s.states[slide.id].firstTry).toBe(true);
  });

  it('grades multiple choice', () => {
    let s = run(start(), [{ type: 'continue' }]);
    s = reduce(s, { type: 'submit', answer: currentSlide(s)!.slide.kind === 'expression'
      ? (currentSlide(s)!.slide as { answer: string }).answer : '' });
    s = reduce(s, { type: 'continue' }); // now on the choice slide

    expect(currentSlide(s)!.slide.kind).toBe('choice');
    expect(reduce(s, { type: 'submit', answer: 'yes' }).feedback.kind).toBe('incorrect');
    expect(reduce(s, { type: 'submit', answer: 'no' }).feedback.kind).toBe('correct');
  });
});

describe('try again re-presents the same question', () => {
  it('keeps the generated parameters across an attempt', () => {
    let s = pastTeach(start());
    const before = currentSlide(s)!.slide;

    s = reduce(s, { type: 'submit', answer: '999i' });
    s = reduce(s, { type: 'tryAgain' });

    expect(currentSlide(s)!.slide).toEqual(before);
    expect(s.feedback.kind).toBe('idle');
  });
});

describe('advancing', () => {
  it('refuses to advance past a wrong answer', () => {
    let s = pastTeach(start());
    s = reduce(s, { type: 'submit', answer: '999i' });
    expect(reduce(s, { type: 'continue' }).index).toBe(s.index);
  });

  it('allows advancing once the answer has been revealed', () => {
    let s = pastTeach(start());
    s = reduce(s, { type: 'submit', answer: '999i' });
    s = reduce(s, { type: 'reveal' });
    expect(reduce(s, { type: 'continue' }).index).toBe(s.index + 1);
  });

  it('advances freely through a teaching slide', () => {
    const s = start();
    expect(currentSlide(s)!.slide.kind).toBe('teach');
    expect(reduce(s, { type: 'continue' }).index).toBe(1);
  });
});

describe('the skill check is sealed', () => {
  /** Answer every guided slide correctly and cross into the skill check. */
  const reachSkillCheck = (): Session => {
    let s = start();
    for (let guard = 0; guard < 20 && s.phase === 'guided'; guard++) {
      const slide = currentSlide(s)!;
      if (slide.slide.kind === 'teach') {
        s = reduce(s, { type: 'continue' });
        continue;
      }
      const answer =
        slide.slide.kind === 'expression' ? slide.slide.answer
        : slide.slide.kind === 'choice' ? slide.slide.correctId
        : '';
      s = reduce(s, { type: 'submit', answer });
      s = reduce(s, { type: 'continue' });
    }
    return s;
  };

  it('enters the skill check after the last guided slide', () => {
    const s = reachSkillCheck();
    expect(s.phase).toBe('skillCheck');
    expect(s.index).toBe(0);
  });

  it('permits review during the guided phase', () => {
    const s = reduce(start(), { type: 'continue' });
    expect(canGoBack(s)).toBe(true);
    expect(reduce(s, { type: 'back' }).index).toBe(0);
  });

  it('refuses to go back once the skill check has started', () => {
    let s = reachSkillCheck();
    expect(canGoBack(s)).toBe(false);

    // Even on a later question, there is no route backwards.
    const slide = currentSlide(s)!;
    const answer = slide.slide.kind === 'expression' ? slide.slide.answer : '';
    s = reduce(s, { type: 'submit', answer });
    s = reduce(s, { type: 'continue' });
    expect(s.index).toBe(1);
    expect(canGoBack(s)).toBe(false);
    expect(reduce(s, { type: 'back' })).toEqual(s);
  });

  it('finishes into a summary and scores first-try answers only', () => {
    let s = reachSkillCheck();

    // First question right first time; second only after a wrong attempt.
    const first = currentSlide(s)!;
    s = reduce(s, {
      type: 'submit',
      answer: first.slide.kind === 'expression' ? first.slide.answer : '',
    });
    s = reduce(s, { type: 'continue' });

    const second = currentSlide(s)!;
    s = reduce(s, { type: 'submit', answer: '999i' });
    s = reduce(s, { type: 'tryAgain' });
    s = reduce(s, {
      type: 'submit',
      answer: second.slide.kind === 'expression' ? second.slide.answer : '',
    });
    s = reduce(s, { type: 'continue' });

    expect(s.phase).toBe('summary');
    expect(skillCheckScore(s)).toEqual({ correct: 1, total: 2 });
  });
});

describe('editing an answer is the retry', () => {
  const wrong = (session: Session) =>
    run(pastTeach(session), [{ type: 'submit', answer: '1i' }]);

  it('clears a wrong verdict so a second attempt costs no extra tap', () => {
    const after = reduce(wrong(start()), { type: 'edit' });
    expect(after.feedback.kind).toBe('idle');
  });

  it('keeps the attempt on the record, so first-try credit is still lost', () => {
    const session = reduce(wrong(start()), { type: 'edit' });
    const slide = currentSlide(session)!;
    expect(session.states[slide.id].attempts).toBe(1);

    const answered = reduce(session, {
      type: 'submit',
      answer: (slide.slide as { answer: string }).answer,
    });
    expect(answered.feedback.kind).toBe('correct');
    expect(answered.states[slide.id].firstTry).toBe(false);
  });

  it('clears unreadable input too', () => {
    const invalid = run(pastTeach(start()), [{ type: 'submit', answer: '3i +' }]);
    expect(invalid.feedback.kind).toBe('invalid');
    expect(reduce(invalid, { type: 'edit' }).feedback.kind).toBe('idle');
  });

  it('cannot undo a pass', () => {
    const slide = currentSlide(pastTeach(start()))!;
    const passed = run(pastTeach(start()), [
      { type: 'submit', answer: (slide.slide as { answer: string }).answer },
    ]);
    expect(passed.feedback.kind).toBe('correct');
    expect(reduce(passed, { type: 'edit' }).feedback.kind).toBe('correct');
  });

  it('leaves the worked solution on screen once it has been shown', () => {
    const revealed = run(wrong(start()), [{ type: 'reveal' }]);
    expect(revealed.feedback.kind).toBe('revealed');
    // Editing must not silently drop the steps the learner just asked for.
    expect(reduce(revealed, { type: 'edit' }).feedback.kind).toBe('revealed');
  });
});

describe('working slides', () => {
  const stepsLesson: Lesson = {
    id: 'steps-demo',
    title: 'Steps',
    slides: [],
    skillCheck: [
      {
        type: 'literal',
        slide: {
          kind: 'steps',
          prompt: [{ kind: 'prose', text: 'Evaluate.' }],
          start: ['2^3', '+', '5'],
          reductions: [
            { span: [0, 1], value: '8', bank: ['6', '8', '9'] },
            { span: [0, 3], value: '13', bank: ['13', '15'] },
          ],
        },
      },
    ],
  };

  const treeLesson: Lesson = {
    id: 'tree-demo',
    title: 'Tree',
    slides: [],
    skillCheck: [
      {
        type: 'literal',
        slide: {
          kind: 'tree',
          prompt: [{ kind: 'prose', text: 'Fill the tree.' }],
          expression: '2^3 + 5',
          nodes: [
            { id: 'a', from: [] },
            { id: 'b', from: ['a'] },
          ],
          bank: ['8', '13', '6'],
          answer: ['8', '13'],
        },
      },
    ],
  };

  const grade = (lesson: Lesson, answer: string[]) =>
    reduce(startSession(lesson, registry, SEED), { type: 'submit', answer }).feedback.kind;

  it('accepts the right sequence of reductions', () => {
    expect(grade(stepsLesson, ['8', '13'])).toBe('correct');
  });

  it('rejects a right answer reached by wrong working', () => {
    expect(grade(stepsLesson, ['6', '13'])).toBe('incorrect');
  });

  it('rejects working that stops short', () => {
    expect(grade(stepsLesson, ['8'])).toBe('incorrect');
    expect(grade(stepsLesson, ['8', ''])).toBe('incorrect');
  });

  it('grades a filled tree', () => {
    expect(grade(treeLesson, ['8', '13'])).toBe('correct');
    expect(grade(treeLesson, ['13', '8'])).toBe('incorrect');
  });
});

describe('a level check is sealed from the first question', () => {
  const levelCheck: Lesson = {
    id: 'lc',
    title: 'Level Check',
    slides: [],
    skillCheck: [
      { type: 'generated', generatorId: 'add-imaginary' },
      { type: 'generated', generatorId: 'add-imaginary' },
    ],
  };

  it('opens straight into the skill check rather than an empty guided deck', () => {
    const session = startSession(levelCheck, registry, SEED);
    expect(session.phase).toBe('skillCheck');
    expect(currentSlide(session)).toBeDefined();
  });

  it('offers no way back at any point', () => {
    let session = startSession(levelCheck, registry, SEED);
    expect(canGoBack(session)).toBe(false);
    const slide = currentSlide(session)!;
    session = run(session, [
      { type: 'submit', answer: (slide.slide as { answer: string }).answer },
      { type: 'continue' },
    ]);
    expect(canGoBack(session)).toBe(false);
    expect(reduce(session, { type: 'back' })).toBe(session);
  });

  it('still scores out of the number of questions asked', () => {
    let session = startSession(levelCheck, registry, SEED);
    for (let i = 0; i < 2; i += 1) {
      const slide = currentSlide(session)!;
      session = run(session, [
        { type: 'submit', answer: (slide.slide as { answer: string }).answer },
        { type: 'continue' },
      ]);
    }
    expect(session.phase).toBe('summary');
    expect(skillCheckScore(session)).toEqual({ correct: 2, total: 2 });
  });
});

describe('a level check is an assessment, not a lesson', () => {
  const assessment: Lesson = {
    id: 'lc-assess',
    title: 'Level Check',
    assessment: true,
    slides: [],
    skillCheck: [
      { type: 'generated', generatorId: 'add-imaginary' },
      { type: 'generated', generatorId: 'add-imaginary' },
      { type: 'generated', generatorId: 'add-imaginary' },
      { type: 'generated', generatorId: 'add-imaginary' },
    ],
  };

  const open = () => startSession(assessment, registry, SEED);
  const right = (session: Session) =>
    (currentSlide(session)!.slide as { answer: string }).answer;

  it('refuses a second attempt at a question already answered', () => {
    const wrong = reduce(open(), { type: 'submit', answer: '1i' });
    expect(wrong.feedback.kind).toBe('incorrect');
    expect(canRetry(wrong)).toBe(false);
    expect(reduce(wrong, { type: 'tryAgain' })).toBe(wrong);
    expect(reduce(wrong, { type: 'edit' })).toBe(wrong);
  });

  it('never offers the worked solution', () => {
    const wrong = reduce(open(), { type: 'submit', answer: '1i' });
    expect(canReveal(wrong)).toBe(false);
    expect(reduce(wrong, { type: 'reveal' })).toBe(wrong);
  });

  it('moves on from a wrong answer rather than blocking the deck', () => {
    const wrong = reduce(open(), { type: 'submit', answer: '1i' });
    const next = reduce(wrong, { type: 'continue' });
    expect(next.index).toBe(1);
    expect(next.feedback.kind).toBe('idle');
  });

  it('still lets a typo be corrected, since nothing was graded', () => {
    const invalid = reduce(open(), { type: 'submit', answer: '3i +' });
    expect(invalid.feedback.kind).toBe('invalid');
    expect(reduce(invalid, { type: 'edit' }).feedback.kind).toBe('idle');
  });

  it('scores as a percentage of the questions asked', () => {
    let session = open();
    // Two right, two wrong, out of four.
    for (let i = 0; i < 4; i += 1) {
      session = run(session, [
        { type: 'submit', answer: i < 2 ? right(session) : '1i' },
        { type: 'continue' },
      ]);
    }
    expect(session.phase).toBe('summary');
    expect(skillCheckScore(session)).toEqual({ correct: 2, total: 4 });
    expect(scorePercent(session)).toBe(50);
  });

  it('leaves an ordinary lesson retryable', () => {
    const wrong = run(pastTeach(start()), [{ type: 'submit', answer: '1i' }]);
    expect(canRetry(wrong)).toBe(true);
    expect(canReveal(wrong)).toBe(true);
    // And a wrong answer still blocks the deck outside an assessment.
    expect(reduce(wrong, { type: 'continue' })).toBe(wrong);
  });
});
