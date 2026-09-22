/**
 * How repetitive each lesson's guided deck is, and which skill-check and
 * level-check questions ask a family the deck never practised.
 *
 * A report, deliberately not a gate. The guard is
 * `checks only skills the lesson practised` in
 * `src/content/generators/generators.test.ts`; this exists so the repetition
 * the owner complained about is a number anyone can re-run, course by course,
 * rather than a number that lived in one conversation. A snapshot test would
 * only pin today's figure, and the figure is meant to move.
 *
 * Usage: eval/bin/variety.sh [--course <course id>] [--threshold 0.7] [--min 5]
 */
import { courses } from '../../src/content/courses';
import { familyOf } from '../../src/content/choiceVariant';
import { scriptArgs } from './countsCore';
import type { Course, SlideRef } from '../../src/content/types';

/** The generated references in a list of slide refs, as families. */
function families(refs: SlideRef[]): string[] {
  return refs
    .filter((ref) => ref.type === 'generated')
    .map((ref) => familyOf((ref as { generatorId: string }).generatorId));
}

/** The generated references in a list of slide refs, as ids. */
function generatedIds(refs: SlideRef[]): string[] {
  return refs
    .filter((ref) => ref.type === 'generated')
    .map((ref) => (ref as { generatorId: string }).generatorId);
}

interface Options {
  course?: string;
  threshold: number;
  min: number;
}

function parseOptions(args: string[]): Options {
  const out: Options = { threshold: 0.7, min: 5 };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--course') {
      out.course = args[i + 1];
      i += 1;
    } else if (arg === '--threshold') {
      out.threshold = Number(args[i + 1]);
      i += 1;
    } else if (arg === '--min') {
      out.min = Number(args[i + 1]);
      i += 1;
    } else {
      console.error(`ERROR: unknown argument "${arg}"`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(out.threshold) || !Number.isFinite(out.min)) {
    console.error('ERROR: --threshold and --min take numbers');
    process.exit(2);
  }
  return out;
}

interface Row {
  lessonId: string;
  questions: number;
  dominant: string;
  share: number;
  repetitive: boolean;
}

function main(): void {
  const options = parseOptions(scriptArgs(process.argv));
  const selected: Course[] = options.course
    ? courses.filter((course) => course.id === options.course)
    : courses;

  const rows: Row[] = [];
  const strayChecks: string[] = [];
  const strayLevelChecks: string[] = [];

  for (const course of selected) {
    for (const level of course.levels) {
      // A level check is measured against every lesson in its own level.
      const levelPractised = new Set(
        level.lessons.flatMap((lesson) => families(lesson.slides)),
      );

      for (const lesson of level.lessons) {
        const asked = families(lesson.slides);
        const tally = new Map<string, number>();
        for (const family of asked) tally.set(family, (tally.get(family) ?? 0) + 1);
        let dominant = '-';
        let best = 0;
        for (const [family, count] of tally) {
          if (count > best) {
            best = count;
            dominant = family;
          }
        }
        const share = asked.length === 0 ? 0 : best / asked.length;
        rows.push({
          lessonId: lesson.id,
          questions: asked.length,
          dominant,
          share,
          repetitive: share >= options.threshold && asked.length >= options.min,
        });

        const practised = new Set(asked);
        for (const id of generatedIds(lesson.skillCheck)) {
          if (!practised.has(familyOf(id))) strayChecks.push(`${lesson.id} -> ${id}`);
        }
      }

      for (const id of generatedIds(level.levelCheck ?? [])) {
        if (!levelPractised.has(familyOf(id))) strayLevelChecks.push(`${level.id} -> ${id}`);
      }
    }
  }

  if (rows.every((row) => row.questions === 0)) {
    // A scan that silently counts nothing is the failure class this whole
    // directory exists to close: report it as a harness error, not as a clean
    // tree.
    console.log('nothing to measure');
    process.exit(2);
  }

  for (const row of [...rows].sort((a, b) => b.share - a.share)) {
    console.log(
      [
        row.lessonId,
        row.questions,
        row.dominant,
        `${Math.round(row.share * 100)}%`,
        row.repetitive ? 'REPETITIVE' : 'ok',
      ].join('\t'),
    );
  }

  const repetitive = rows.filter((row) => row.repetitive).length;
  console.log(
    `repetitive: ${repetitive} of ${rows.length} (dominant family >= ${Math.round(options.threshold * 100)}% of >= ${options.min} questions)`,
  );
  console.log(`stray skill checks: ${strayChecks.length}`);
  console.log(`stray level-check questions: ${strayLevelChecks.length}`);
  for (const stray of strayChecks) console.log(`  ${stray}`);
  for (const stray of strayLevelChecks) console.log(`  ${stray}`);
}

main();
