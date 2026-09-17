/**
 * Loads the tree facts a document's claims are reconciled against: every
 * course file's lesson counts and ids, the generator registry, and the
 * grand total. Read by import rather than by parsing source text, so the
 * facts are exactly what the app itself sees.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CourseFacts, Facts } from './countsCore';

interface CourseModuleShape {
  id: string;
  levels: Array<{ lessons: Array<{ id: string }>; levelCheck?: unknown[] }>;
}

function isCourseModule(value: unknown): value is CourseModuleShape {
  return !!value && typeof value === 'object' && Array.isArray((value as { levels?: unknown }).levels);
}

export async function loadFacts(repoRoot: string): Promise<Facts> {
  const coursesDir = join(repoRoot, 'src/content/courses');
  const files = readdirSync(coursesDir).filter((file) => file.endsWith('.ts') && file !== 'index.ts');

  const courses: Record<string, CourseFacts> = {};
  let totalLessons = 0;

  for (const file of files) {
    const mod: Record<string, unknown> = await import(join(coursesDir, file));
    const courseExports = Object.values(mod).filter(isCourseModule);
    if (courseExports.length === 0) throw new Error(`no export with an array "levels" in ${file}`);
    if (courseExports.length > 1) throw new Error(`${file} exports ${courseExports.length} course-shaped values; expected exactly one`);
    const [courseExport] = courseExports;

    const key = `src/content/courses/${file}`;
    const perLevel = courseExport.levels.map((level) => level.lessons.length);
    const lessonIds = courseExport.levels.flatMap((level) => level.lessons.map((lesson) => lesson.id));
    const levelChecks = courseExport.levels.map((level) => level.levelCheck?.length ?? 0);
    const lessons = perLevel.reduce((a, b) => a + b, 0);

    courses[key] = { id: key, lessons, perLevel, lessonIds, levelChecks };
    totalLessons += lessons;
  }

  const registryModule = (await import(join(repoRoot, 'src/content/registry.ts'))) as { registry: Record<string, unknown> };
  const generators = Object.keys(registryModule.registry).sort();

  return { courses, generators, totalLessons };
}
