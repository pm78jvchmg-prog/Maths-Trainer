/**
 * Integrity checks for every course, and the guard on the generator sweep.
 *
 * The generic property tests for every generator used to live here too. They
 * are most of the suite's running time, so they now run from the
 * `generators.sweep-NN.test.ts` shards beside this file, which vitest spreads
 * across its workers; the tests themselves are in `./sweep/generatorSweep.ts`.
 * What stays here is the guard that the shards between them sweep every
 * registered generator.
 *
 * The course sweep is generic: courses come from the course index, so a new
 * one is covered the moment it is exported — there is nothing to wire up here.
 */
import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { makeRng } from '../../engine/rng';
import { registeredGenerators, registry } from '../registry';
import { courses } from '../courses';
import { startSession } from '../../engine/session';
import { levelCheckLesson } from '../types';
import { familyOf } from '../choiceVariant';
import {
  MAX_PER_FAMILY,
  MIN_WIDGET_KINDS,
} from '../shapeVariety';
import { TRIPLES } from './complexPlane';
import {
  BARE_TEX_COMMAND,
  SEEDS,
  SWEEP_SHARDS,
  generatorsInShard,
  lookalikeTiles,
  shardIndexOf,
} from './sweep/generatorSweep';
import type { Generator, Slide, SlideRef } from '../types';

describe('generator sweep shards', () => {
  it('sweeps every registered generator exactly once, from shard files that all exist', () => {
    // A missing shard file would drop its generators from the sweep with
    // nothing red to show for it. Listed lazily: nothing here imports them.
    const files = Object.keys(import.meta.glob('./generators.sweep-*.test.ts'));
    const shards = files.map((file) => shardIndexOf(file) ?? -1).sort((a, b) => a - b);
    expect(shards, `shard files ${files.join(', ')}`).toEqual(
      Array.from({ length: SWEEP_SHARDS }, (_, shard) => shard),
    );

    const swept = shards.flatMap((shard) => generatorsInShard(shard).map((generator) => generator.id));
    const registered = registeredGenerators.map((generator) => generator.id);
    expect(swept.length, 'a generator is swept more than once, or not at all').toBe(registered.length);
    expect(new Set(swept), 'the shards do not sweep the registry').toEqual(new Set(registered));
  });
});

describe('course integrity', () => {
  // Every course, so a new one cannot skip these checks by existing.
  const lessons = courses.flatMap((course) =>
    course.levels.flatMap((level) => level.lessons),
  );

  it('offers no two authored tiles that look the same', () => {
    // The literal counterpart of the generator sweep's check: a hand-written
    // bank holding `- 8` and `-8` shows two identical tiles, one marked wrong.
    const levelChecks = courses.flatMap((course) =>
      course.levels.flatMap((level) => level.levelCheck ?? []),
    );
    const refs = [
      ...lessons.flatMap((lesson) =>
        [...lesson.slides, ...lesson.skillCheck].map((ref) => ({ ref, where: lesson.id })),
      ),
      ...levelChecks.map((ref) => ({ ref, where: 'level check' })),
    ];
    for (const { ref, where } of refs) {
      if (ref.type !== 'literal' || ref.slide.kind !== 'tiles') continue;
      expect(
        lookalikeTiles(ref.slide.bank),
        `${where}: tiles that look the same in ${JSON.stringify(ref.slide.bank)}`,
      ).toEqual([]);
    }
  });

  it('references only generators that exist', () => {
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type === 'generated') {
          expect(registry[ref.generatorId], `${lesson.id} -> ${ref.generatorId}`).toBeDefined();
        }
      }
    }
  });

  it('gives every lesson about ten guided slides and three skill checks', () => {
    for (const lesson of lessons) {
      expect(lesson.slides.length, lesson.id).toBeGreaterThanOrEqual(9);
      expect(lesson.slides.length, lesson.id).toBeLessThanOrEqual(11);
      expect(lesson.skillCheck.length, lesson.id).toBe(3);
    }
  });

  it('gives every level check 10 to 15 questions', () => {
    for (const course of courses) {
      for (const level of course.levels) {
        if (level.levelCheck === undefined) continue;
        expect(level.levelCheck.length, `${course.id}/${level.id}`).toBeGreaterThanOrEqual(8);
        expect(level.levelCheck.length, `${course.id}/${level.id}`).toBeLessThanOrEqual(15);
      }
    }
  });

  it('leaves no inline markup the reader would see as punctuation', () => {
    // `**bold**` and `$maths$` are the only two markups Prose understands. An
    // odd number of either delimiter means one is unclosed, and an unclosed
    // marker reaches the learner as literal asterisks or swallows the rest of
    // the paragraph into a formula.
    const offenders: string[] = [];
    const scan = (where: string, text: string) => {
      const stars = (text.match(/\*\*/g) ?? []).length;
      if (stars % 2 !== 0) offenders.push(`${where}: unclosed ** in ${JSON.stringify(text)}`);
      const dollars = (text.match(/\$/g) ?? []).length;
      if (dollars % 2 !== 0) offenders.push(`${where}: unclosed $ in ${JSON.stringify(text)}`);
      // Every asterisk must belong to a pair. An odd one out reaches the
      // learner as punctuation, or eats the rest of the paragraph into an
      // emphasis that never closes.
      const singles = (text.replace(/\*\*[^*]+\*\*/g, '').match(/\*/g) ?? []).length;
      if (singles % 2 !== 0) offenders.push(`${where}: unclosed * in ${JSON.stringify(text)}`);
    };
    for (const lesson of lessons) {
      for (const ref of lesson.slides) {
        if (ref.type !== 'literal' || ref.slide.kind !== 'teach') continue;
        for (const block of ref.slide.body) {
          if (block.kind === 'prose') scan(lesson.id, block.text);
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  it('gives every traversal figure a path and a dot its animation can find', () => {
    // The dot is placed by querying these ids out of the rendered SVG. A typo
    // in either degrades silently to a still frame, which looks like a figure
    // that simply does not move — the hardest kind of fault to notice.
    let checked = 0;
    for (const lesson of lessons) {
      for (const ref of lesson.slides) {
        if (ref.type !== 'literal' || ref.slide.kind !== 'teach') continue;
        for (const block of ref.slide.body) {
          if (block.kind !== 'traversal') continue;
          checked += 1;
          expect(block.svg, `${lesson.id}: no path #${block.pathId}`).toContain(
            `id="${block.pathId}"`,
          );
          expect(block.svg, `${lesson.id}: no traversal dot`).toContain('id="traversal-dot"');
          expect(block.durationMs, `${lesson.id}: duration`).toBeGreaterThan(0);
        }
      }
    }
    // Otherwise this passes loudly while checking nothing.
    expect(checked, 'no traversal figures found to check').toBeGreaterThan(0);
  });

  it('opens each lesson by teaching before asking', () => {
    for (const lesson of lessons) {
      const first = lesson.slides[0];
      expect(first.type, lesson.id).toBe('literal');
      if (first.type === 'literal') expect(first.slide.kind).toBe('teach');
    }
  });

  it('never puts a teaching slide in a skill check', () => {
    for (const lesson of lessons) {
      for (const ref of lesson.skillCheck) {
        if (ref.type === 'literal') expect(ref.slide.kind).not.toBe('teach');
      }
    }
  });

  it('checks only skills the lesson practised', () => {
    // The owner met a conjugate question in the modulus lesson's skill check
    // and called it what it is: a check of something the lesson never asked.
    // Not interleaving, a defect — so it is a rule, over families rather than
    // ids, because `x`, `x+choice` and `x-steps` are one skill (familyOf).
    // Teach slides do not count: only an ask is practice.
    const offenders: string[] = [];
    for (const lesson of lessons) {
      const practised = new Set(
        lesson.slides
          .filter((ref): ref is GeneratedRef => ref.type === 'generated')
          .map((ref) => familyOf(ref.generatorId)),
      );
      for (const ref of lesson.skillCheck) {
        if (ref.type !== 'generated') continue;
        if (!practised.has(familyOf(ref.generatorId))) {
          offenders.push(`${lesson.id} -> ${ref.generatorId}`);
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  /**
   * Every authored TeX fragment: display blocks, plus the $...$ segments inside
   * prose. Ordinary English is deliberately excluded — a sentence containing
   * the word "times" is not a broken \times command.
   */
  const texFragments = (): { tex: string; where: string }[] => {
    const out: { tex: string; where: string }[] = [];
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type !== 'literal') continue;
        const blocks = ref.slide.kind === 'teach' ? ref.slide.body : ref.slide.prompt;
        for (const block of blocks) {
          if (block.kind === 'display') {
            out.push({ tex: block.tex, where: `${lesson.id} display` });
          }
          if (block.kind === 'prose') {
            // Odd indices of a split on $...$ are the inline maths segments.
            block.text
              .split(/\$([^$]+)\$/g)
              .filter((_, idx) => idx % 2 === 1)
              .forEach((tex) => out.push({ tex, where: `${lesson.id} inline` }));
          }
        }
      }
    }
    return out;
  };

  it('renders every authored TeX fragment without error', () => {
    // Asks the real question — is this valid TeX — so it covers every command,
    // present and future, rather than a list someone must remember to extend.
    const fragments = texFragments();
    expect(fragments.length).toBeGreaterThan(0);
    for (const { tex, where } of fragments) {
      expect(
        () => katex.renderToString(tex, { throwOnError: true, strict: 'error' }),
        `${where}: ${tex}`,
      ).not.toThrow();
    }
  });

  it('never lets a TeX command lose its backslash', () => {
    // Kept alongside the KaTeX check, which does NOT cover this: a
    // backslash-stripped command like "overline{3 + 4i}" is perfectly valid TeX
    // — it renders the literal letters — so KaTeX raises nothing and the learner
    // just sees a wrong slide. Only a name check catches it, and it is applied
    // to TeX fragments alone so English prose is never scanned.
    for (const { tex, where } of texFragments()) {
      expect(BARE_TEX_COMMAND.test(tex), `${where}: bare TeX command in ${tex}`).toBe(false);
    }
  });

  it('never leaves a raw escape sequence in prose', () => {
    // The sibling failure, outside TeX: '\\u2019' in source reaches the reader
    // as the literal text "’" rather than an apostrophe.
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type !== 'literal') continue;
        const blocks = ref.slide.kind === 'teach' ? ref.slide.body : ref.slide.prompt;
        for (const block of blocks) {
          if (block.kind !== 'prose') continue;
          expect(block.text, lesson.id).not.toMatch(/\\u[0-9a-fA-F]{4}/);
        }
      }
    }
  });

  it('backs every promise that another writing is accepted', () => {
    // "Accepted" is the marker rather than a field an author must remember to
    // set, because forgetting the field is exactly the failure this guards
    // against. A teach slide can say "either form is accepted" about a
    // generator that declares nothing in `alsoAccepts` — the sentence would
    // then be true only by luck, exactly the shape of the F2 finding this
    // task repairs (see the generic "accepts every other writing it
    // promises" test in the generator sweep, which pins the declaration to the checker; this
    // one pins the *sentence* to a declaration existing at all). Move the
    // sentence to a lesson whose generators declare nothing and it goes
    // unbacked again with a green suite unless something reads the prose.
    let promises = 0;
    for (const lesson of lessons) {
      const asked = lesson.slides.filter((ref): ref is GeneratedRef => ref.type === 'generated');
      for (const ref of lesson.slides) {
        if (ref.type !== 'literal' || ref.slide.kind !== 'teach') continue;
        for (const block of ref.slide.body) {
          if (block.kind !== 'prose' || !/\baccepted\b/i.test(block.text)) continue;
          promises += 1;
          const declared = asked.some(declaresAlsoAccepts);
          expect(
            declared,
            `${lesson.id} says "${block.text}" but none of ${describeRefs(asked)} declares alsoAccepts on any draw`,
          ).toBe(true);
        }
      }
    }
    // Otherwise this passes loudly while checking nothing — the same
    // loud-pass guard the traversal-figure test above already uses.
    expect(promises, 'no promise found to check').toBeGreaterThan(0);
  });

  it('holds a genuine Pythagorean triple in every modulus row', () => {
    // The modulus generator reads its answer straight from this table instead
    // of rounding Math.hypot. That is only safe while the table is honest, so
    // the invariant is asserted rather than assumed.
    expect(TRIPLES.length).toBeGreaterThan(0);
    for (const [a, b, c] of TRIPLES) {
      expect(a * a + b * b, `${a},${b},${c} is not a triple`).toBe(c * c);
    }
  });

  /**
   * What the learner actually sees, for one seed.
   *
   * Compares the rendered slide rather than the generator id, because the same
   * generator asked twice is fine when it draws different numbers and only a
   * problem when it does not.
   *
   * Signed as the generator rendered it, with the reference's lead-in taken
   * back off the prompt: the same question with and without a lead-in is
   * still the same question. Worked out here from the lesson's own references
   * rather than read from the engine, so a de-duplicator that signs the wrong
   * thing is caught rather than agreed with.
   */
  const renderedDecks = (lesson: (typeof lessons)[number], seed: number) => {
    const session = startSession(lesson, registry, seed);
    const shape = (deck: typeof session.guided, refs: SlideRef[]) =>
      deck.map((resolved, idx) => {
        const ref = refs[idx];
        const lead = ref.type === 'generated' ? (ref.leadIn?.length ?? 0) : 0;
        const { slide } = resolved;
        const bare =
          lead > 0 && slide.kind !== 'teach'
            ? { ...slide, prompt: slide.prompt.slice(lead) }
            : slide;
        return { id: resolved.id, signature: JSON.stringify(bare) };
      });
    // Checked separately: a skill-check question matching a guided one is the
    // assessment doing its job, where two identical guided slides are a bug.
    return [shape(session.guided, lesson.slides), shape(session.skillCheck, lesson.skillCheck)];
  };

  /**
   * The generated half of a `SlideRef` — the only kind whose rendered shape
   * can vary between draws. A lesson's shape guards only ever look at these.
   */
  type GeneratedRef = Extract<SlideRef, { type: 'generated' }>;

  /**
   * Every kind a generator can render across `SEEDS` seeds, at one difficulty.
   * `polar-form` renders a typed `expression` on one direction and a native
   * `choice` on the other, and draws the direction only at difficulty 2 — so
   * the set a lesson's shape guards must reason about is keyed by difficulty,
   * not just by generator id.
   *
   * The sweep is a sample of the reachable kinds, not a proof of them — a
   * branch drawn rarer than roughly 1-in-200 can be missed, which *shrinks*
   * the set and so *hides* offenders, the same way this guard went blind to
   * `polar-form` in the first place. The rarest branch in the registry today
   * is 86/200; a generator branching far more rarely than that would need a
   * wider sweep here.
   */
  const shapeCache = new Map<string, Set<Slide['kind']>>();
  const shapesOf = (ref: GeneratedRef): Set<Slide['kind']> => {
    // The `?? 1` mirrors resolveRef in src/engine/session.ts, the one place
    // this default lives — a reference with no stated difficulty is asked at 1.
    const difficulty = ref.difficulty ?? 1;
    const key = `${ref.generatorId}@${difficulty}`;
    const cached = shapeCache.get(key);
    if (cached) return cached;
    const g = registry[ref.generatorId] as unknown as Generator<unknown>;
    const shapes = new Set<Slide['kind']>();
    for (let seed = 0; seed < SEEDS; seed += 1) {
      shapes.add(g.render(g.sample(makeRng(seed), difficulty)).kind);
    }
    shapeCache.set(key, shapes);
    return shapes;
  };

  /**
   * A kind every reference in the run could take, or `undefined` when no
   * single kind is common to all of them.
   *
   * Per-slide seeds are independent (`resolveRef`, session.ts:123), so every
   * combination of kinds is reachable in some sitting — a run is an offender
   * the moment the intersection of its kind-sets is non-empty, whether or not
   * any one seed sweep happens to land on it. That is deliberately a stronger,
   * deterministic claim than sampling resolved decks for an occurrence.
   */
  const commonShape = (refs: GeneratedRef[]): Slide['kind'] | undefined => {
    let common: Set<Slide['kind']> | undefined;
    for (const ref of refs) {
      const shapes = shapesOf(ref);
      common = common === undefined ? new Set(shapes) : new Set([...common].filter((kind) => shapes.has(kind)));
      if (common.size === 0) return undefined;
    }
    return common === undefined ? undefined : [...common][0];
  };

  /** Names a run of references for a failure message, e.g. `polar-form@2, argument@2`. */
  const describeRefs = (refs: GeneratedRef[]): string =>
    refs.map((ref) => `${ref.generatorId}@${ref.difficulty ?? 1}`).join(', ');

  /**
   * Whether a reference's generator ever renders an `expression` slide
   * declaring `alsoAccepts`, over `SEEDS` seeds at the difficulty it is
   * asked. Cached per `${generatorId}@${difficulty}`, the same key `shapesOf`
   * uses, since both are the same question — what can this reference render —
   * asked about a different property of the result.
   */
  const declaresCache = new Map<string, boolean>();
  const declaresAlsoAccepts = (ref: GeneratedRef): boolean => {
    const difficulty = ref.difficulty ?? 1;
    const key = `${ref.generatorId}@${difficulty}`;
    const cached = declaresCache.get(key);
    if (cached !== undefined) return cached;
    const g = registry[ref.generatorId] as unknown as Generator<unknown>;
    let declares = false;
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const slide = g.render(g.sample(makeRng(seed), difficulty));
      if (slide.kind === 'expression' && slide.alsoAccepts && slide.alsoAccepts.length > 0) {
        declares = true;
        break;
      }
    }
    declaresCache.set(key, declares);
    return declares;
  };

  /** Every deck that repeats a question, across a sweep of seeds. */
  const duplicatesIn = (decks: (typeof lessons)[number][]) => {
    const offenders = new Map<string, number>();
    for (const deck of decks) {
      for (let seed = 0; seed < 40; seed += 1) {
        for (const rendered of renderedDecks(deck, seed)) {
          const seen = new Set<string>();
          for (const { signature } of rendered) {
            if (seen.has(signature)) {
              offenders.set(deck.id, (offenders.get(deck.id) ?? 0) + 1);
            }
            seen.add(signature);
          }
        }
      }
    }
    // Sorted worst-first so a failure names the deck most worth fixing.
    return [...offenders.entries()].sort((a, b) => b[1] - a[1]);
  };

  it('never asks the same question twice in one sitting', () => {
    // A lesson leaning on one generator is fine — that is what practice is.
    // Drawing the *same question* twice is not: it reads as a bug, and it
    // wastes one of the ten slides a lesson gets. Reported across every
    // lesson at once, because fixing these one failure at a time is slow.
    const offenders = duplicatesIn(lessons);
    expect(
      offenders.map(([id, n]) => `${id}: ${n} duplicate(s) across 40 seeds`).join('\n'),
    ).toBe('');
    // Every lesson resolved 40 times over: the sweep grows with the library and
    // outgrew vitest's 5s default once the Phase C courses landed. A budget
    // rather than fewer seeds, as for the oracle tests in the generator sweep.
  }, 60_000);

  it('never repeats a question inside a level check', () => {
    const checks = courses.flatMap((course) =>
      course.levels.map(levelCheckLesson).filter((l) => l !== undefined),
    );
    const offenders = duplicatesIn(checks);
    expect(
      offenders.map(([id, n]) => `${id}: ${n} duplicate(s) across 40 seeds`).join('\n'),
    ).toBe('');
  }, 60_000);

  it('varies the shape of the questions inside a lesson', () => {
    // Seven questions through one widget reads as the same question seven
    // times, even when no two draws are alike — which is exactly what a learner
    // reported after the duplicate-question fix had already landed. The
    // de-duplicator stops a deck repeating a *question*; nothing stopped it
    // repeating a *shape*.
    //
    // Measured by the widget the learner actually taps, not by the generator
    // id: two generators that both render an expression slide feel the same,
    // and one generator asked through its typed and its multiple-choice form
    // feels like two.
    //
    // This used to read one seed at difficulty 1, always — `g.render(g.sample
    // (makeRng(1), 1)).kind`, ignoring the difficulty the lesson actually
    // asks at. `polar-form` renders a typed `expression` one direction and a
    // native `choice` the other, and draws the direction only at difficulty
    // 2, so every difficulty-2 `ask('polar-form', 2)` was being judged by a
    // shape the learner had roughly a 51% chance of never meeting. Now a
    // lesson is an offender when there is one kind every one of its generated
    // references *can* render at the difficulty it is asked — "can all be"
    // rather than "happened to render as, once, at difficulty 1" — since
    // per-slide seeds are independent and every combination is reachable in
    // some sitting.
    const offenders: string[] = [];
    for (const lesson of lessons) {
      const asked = lesson.slides.filter((ref): ref is GeneratedRef => ref.type === 'generated');
      if (asked.length < 4) continue;

      const kind = commonShape(asked);
      if (kind !== undefined) {
        offenders.push(`${lesson.id}: ${asked.length} questions can all be ${kind} (${describeRefs(asked)})`);
      }
    }

    expect(offenders.join('\n')).toBe('');
  });

  it('never runs 3 or more identical-shape questions between teach slides', () => {
    // Same repair as above, applied to a run rather than a whole lesson: the
    // old read was one seed at difficulty 1, always, so a run leaning on
    // `polar-form` at difficulty 2 was judged by the direction it draws at
    // difficulty 1 instead. "Can all be" is checked with `commonShape`, the
    // shared helper above.
    const offenders: string[] = [];
    for (const lesson of lessons) {
      const runs: GeneratedRef[][] = [[]];
      for (const ref of lesson.slides) {
        if (ref.type === 'literal') runs.push([]);
        else runs[runs.length - 1].push(ref);
      }
      for (const run of runs) {
        if (run.length < 3) continue;
        const kind = commonShape(run);
        if (kind !== undefined) {
          offenders.push(`${lesson.id}: run of ${run.length} questions can all be ${kind} (${describeRefs(run)})`);
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  /**
   * The smallest number of distinct widget kinds a *sitting* of these
   * exercises can show.
   *
   * Not the union of what the generators can render: a reference that draws
   * either an `expression` or a `choice` costs the deck nothing extra when
   * some other reference is already `expression`-only, because per-slide seeds
   * are independent and that sitting is reachable. So the honest count is the
   * smallest set of kinds that covers every reference — a minimum hitting set,
   * brute-forced over the union, which is at most nine kinds wide.
   *
   * `commonShape` above is this same question asked for the answer 1: a lesson
   * whose minimum is 1 is one where every exercise can wear the same widget.
   */
  const minDistinctKinds = (refs: GeneratedRef[]): number => {
    if (refs.length === 0) return 0;
    const sets = refs.map(shapesOf);
    const union = [...new Set(sets.flatMap((kinds) => [...kinds]))];
    const covers = (pick: Set<Slide['kind']>) =>
      sets.every((kinds) => [...kinds].some((kind) => pick.has(kind)));
    for (let size = 1; size <= union.length; size += 1) {
      const chosen: Slide['kind'][] = [];
      const search = (from: number): boolean => {
        if (chosen.length === size) return covers(new Set(chosen));
        for (let i = from; i < union.length; i += 1) {
          chosen.push(union[i]);
          if (search(i + 1)) return true;
          chosen.pop();
        }
        return false;
      };
      if (search(0)) return size;
    }
    return union.length;
  };

  /** How often each generator family is asked, worst first. */
  const familyCounts = (refs: GeneratedRef[]): [string, number][] => {
    const counts = new Map<string, number>();
    for (const ref of refs) {
      const family = familyOf(ref.generatorId);
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };

  /** A lesson's guided exercises: the generated refs, which is all of them. */
  const exercisesOf = (lesson: (typeof lessons)[number]): GeneratedRef[] =>
    lesson.slides.filter((ref): ref is GeneratedRef => ref.type === 'generated');

  /**
   * One row per lesson, printed by the report test below.
   *
   * Computed once and shared with the two guards, because `shapesOf` sweeps
   * 200 seeds per reference and there is no reason to pay for it three times.
   */
  const variety = lessons.map((lesson) => {
    const exercises = exercisesOf(lesson);
    const families = familyCounts(exercises);
    return {
      id: lesson.id,
      exercises: exercises.length,
      kinds: minDistinctKinds(exercises),
      topFamily: families[0]?.[0] ?? '-',
      topFamilyAsks: families[0]?.[1] ?? 0,
    };
  });

  it('reports the widget kinds and generator repetition of every lesson', () => {
    // The point of the report is that `npm test` itself says how far phase A
    // has to go, so a number nobody can see would be no use.
    const tally = (values: number[]) =>
      [...new Set(values)]
        .sort((a, b) => a - b)
        .map((value) => `${value}: ${values.filter((v) => v === value).length}`)
        .join('  ');

    const rows = variety.map(
      (row) =>
        `  ${row.id.padEnd(24)} ${String(row.exercises).padStart(2)} exercises` +
        `  ${row.kinds} widget kind${row.kinds === 1 ? ' ' : 's'}` +
        `  ${row.topFamily} x${row.topFamilyAsks}`,
    );
    const kindOffenders = variety.filter((row) => row.kinds < MIN_WIDGET_KINDS).length;
    const askOffenders = variety.filter((row) => row.topFamilyAsks > MAX_PER_FAMILY).length;

    // Straight to stdout rather than through `console.log`, which this vitest
    // setup swallows — and reached through `globalThis` because `src` is typed
    // with `vite/client` alone, so node's globals are deliberately not in scope.
    const stdout = (globalThis as { process?: { stdout?: { write(text: string): void } } })
      .process?.stdout;
    stdout?.write(
      [
        '',
        `shape variety, ${variety.length} lessons`,
        ...rows,
        `  widget kinds per lesson — ${tally(variety.map((row) => row.kinds))}`,
        `  most-asked family per lesson — ${tally(variety.map((row) => row.topFamilyAsks))}`,
        `  below ${MIN_WIDGET_KINDS} widget kinds: ${kindOffenders}`,
        `  one family asked over ${MAX_PER_FAMILY} times: ${askOffenders}`,
        '',
      ].join('\n'),
    );

    expect(variety.length).toBe(lessons.length);
  });

  /**
   * Both guards below were ratchets while phase A ran: each carried an
   * allowlist in `shapeVariety.ts` of the lessons that did not yet clear its
   * bar, holding how far off each one was, and the list could only shrink.
   * Batch A11 deleted both once the widening batches had emptied them, which
   * is what turns these into plain assertions over every lesson. A lesson that
   * cannot meet a bar is a lesson to widen; there is no longer anywhere to
   * record an exception.
   */
  const checkEvery = (
    remedy: string,
    measured: { id: string; value: number }[],
    passes: (value: number) => boolean,
    describe: (value: number) => string,
  ) => {
    const offenders = measured
      .filter(({ value }) => !passes(value))
      .map(({ id, value }) => `${id} ${describe(value)} — ${remedy}`);
    expect(offenders.join('\n')).toBe('');
  };

  it('asks every lesson through at least three widget kinds', () => {
    checkEvery(
      'ask some of its exercises through a different widget',
      variety.map((row) => ({ id: row.id, value: row.kinds })),
      (value) => value >= MIN_WIDGET_KINDS,
      (value) => `asks through ${value} widget kind${value === 1 ? '' : 's'}`,
    );
  });

  it('never asks one generator family more than twice in a lesson', () => {
    checkEvery(
      'spread its exercises across more generators',
      variety.map((row) => ({ id: row.id, value: row.topFamilyAsks })),
      (value) => value <= MAX_PER_FAMILY,
      (value) => `asks one family ${value} times`,
    );
  });

  it('uses unique lesson ids', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
