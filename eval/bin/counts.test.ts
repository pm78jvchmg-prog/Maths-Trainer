import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  parseCountsBlock,
  parsePlan,
  parseReport,
  parseSuiteLog,
  reconcile,
  verdict,
  formatResult,
  scriptArgs,
  type Facts,
} from './countsCore';
import { loadFacts } from './countsTree';
// Imported statically so the whole content tree (every course file and all
// the generators behind the registry) is transformed and evaluated while the
// file is collected, which is untimed, rather than inside a test's 5 s budget.
// Once they are loaded, loadFacts() re-imports the same modules from vitest's
// cache in tens of milliseconds, so nothing is walked any less.
// The courses as their files write them: placement.ts shows some levels in
// other courses, but this tool counts files.
import { writtenCourses as courses, lessonCount } from '../../src/content/courses/index';
import { registry } from '../../src/content/registry';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const PLANS_DIR = join(REPO_ROOT, 'eval', 'plans');
const FIXTURES_DIR = join(REPO_ROOT, 'eval', 'bin', 'fixtures', 'counts');
const COUNTS_SH = join(REPO_ROOT, 'eval', 'bin', 'counts.sh');
const SUITE_LOG_GREEN = 'Tests  3086 passed (3086)\n';

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

function readPlan(name: string): string {
  return readFileSync(join(PLANS_DIR, name), 'utf8');
}

function loadSnapshot(): Facts {
  return JSON.parse(readFixture('tree-snapshot.json')) as Facts;
}

function runCounts(args: string[]): { status: number; stdout: string } {
  try {
    const stdout = execFileSync(COUNTS_SH, args, { encoding: 'utf8', timeout: 60_000 });
    return { status: 0, stdout };
  } catch (err) {
    const e = err as { status: number | null; stdout: string };
    return { status: e.status ?? -1, stdout: e.stdout };
  }
}

const FACTS: Facts = {
  courses: {
    'src/content/courses/x.ts': {
      id: 'src/content/courses/x.ts',
      lessons: 3,
      perLevel: [2, 1],
      lessonIds: ['x-l1-a', 'x-l1-b', 'x-l2-c'],
      levelChecks: [12, 0],
    },
  },
  generators: ['g-one', 'g-one+choice'],
  totalLessons: 3,
};

describe('counts: parsing and reconciliation', () => {
  it('parses every block key into claims', () => {
    const doc = [
      '```counts',
      'course: src/content/courses/x.ts',
      'lessons: 3',
      'lesson-ids: x-l1-a, x-l1-b, x-l2-c',
      'level-checks: 12/0',
      'generators: g-one, g-one+choice',
      'tests: 3',
      '```',
      '',
    ].join('\n');
    const result = parseCountsBlock(doc, 'plan');
    expect(result.error).toBeUndefined();
    expect(result.found).toBe(true);
    expect(result.claims).toHaveLength(5);
    expect(result.claims.every((c) => typeof c.line === 'number')).toBe(true);
    expect(result.claims.map((c) => c.kind)).toEqual(['lessons', 'lesson-ids', 'level-checks', 'generators', 'tests']);
  });

  it('rejects an unknown block key', () => {
    const doc = ['```counts', 'course: src/content/courses/x.ts', 'lesson: 3', '```'].join('\n');
    const result = parseCountsBlock(doc, 'plan');
    expect(result.error).toContain('lesson');
    expect(result.error).toContain('line 3');
  });

  it('rejects a course claim before any course line', () => {
    const doc = ['```counts', 'lessons: 3', '```'].join('\n');
    const result = parseCountsBlock(doc, 'plan');
    expect(result.error).toBeDefined();
  });

  it('rejects two counts blocks in one document', () => {
    const doc = ['```counts', 'tests: 3', '```', '', '```counts', 'tests: 4', '```'].join('\n');
    const result = parseCountsBlock(doc, 'plan');
    expect(result.error).toBeDefined();
    expect(result.found).toBe(true);
  });

  it('reads the four legacy done-list shapes', () => {
    const doc = [
      '## 1. Done',
      '',
      '- `src/content/courses/x.ts` has 3 lessons (ids `x-l1-a, x-l1-b, x-l2-c`); level checks are 12/0.',
      '- `src/content/courses/x.ts` has 3 lessons with ids `x-l1-a, x-l1-b, x-l2-c`; level checks are 12/0.',
      '- `src/content/courses/x.ts` has 3 lessons; `grep -n "^          id: \'" ` lists `x-l1-a, x-l1-b, x-l2-c`; level checks 12/0.',
      '- `npm test` 3100 (or 3086 per the stop rule).',
      '',
    ].join('\n');
    const result = parsePlan(doc);
    expect(result.error).toBeUndefined();
    const lessonsClaims = result.claims.filter((c) => c.kind === 'lessons');
    expect(lessonsClaims).toHaveLength(3);
    expect(lessonsClaims.every((c) => c.value === 3)).toBe(true);
    const idClaims = result.claims.filter((c) => c.kind === 'lesson-ids');
    expect(idClaims).toHaveLength(3);
    for (const claim of idClaims) {
      expect(claim.value).toEqual(['x-l1-a', 'x-l1-b', 'x-l2-c']);
    }
    const testsClaims = result.claims.filter((c) => c.kind === 'tests');
    expect(testsClaims).toHaveLength(1);
    expect(testsClaims[0].value).toBe(3100);
  });

  it('yields nothing for a plan with no done section', () => {
    const result = parsePlan('# A plan with no heading at all.\n');
    expect(result.error).toBeUndefined();
    expect(verdict(result.claims, 0, result.error)).toBe('nothing');
    expect(result.notes.join(' ')).toContain('## N. Done');
  });

  it('yields nothing for a done section with no recognisable claim', () => {
    const result = parsePlan('## 1. Done\n\nEverything shipped.\n');
    expect(result.error).toBeUndefined();
    expect(verdict(result.claims, 0, result.error)).toBe('nothing');
  });

  it('prefers the block over done-section prose', () => {
    const doc = [
      '```counts',
      'course: src/content/courses/x.ts',
      'lessons: 99',
      '```',
      '',
      '## 1. Done',
      '',
      '- `src/content/courses/x.ts` has 3 lessons; level checks are 12/0.',
      '',
    ].join('\n');
    const parsed = parsePlan(doc);
    expect(parsed.error).toBeUndefined();
    expect(parsed.notes.join(' ')).toContain('Done-section prose ignored');
    const result = reconcile(parsed.claims, FACTS, 3);
    expect(result.status).toBe('mismatch');
    const line = result.lines.find((l) => l.includes('MISMATCH'))!;
    expect(line).toContain('99');
    expect(line).toContain('3');
  });

  it('reports every kind of mismatch with both sides', () => {
    const doc = [
      '```counts',
      'course: src/content/courses/x.ts',
      'lessons: 4',
      'lesson-ids: x-l1-b, x-l1-a, x-l2-c',
      'level-checks: 12/1',
      'generators: g-two',
      'tests: 3000',
      '```',
    ].join('\n');
    const parsed = parsePlan(doc);
    const result = reconcile(parsed.claims, FACTS, 3100);
    expect(result.status).toBe('mismatch');
    const mismatchLines = result.lines.filter((l) => l.includes('MISMATCH'));
    expect(mismatchLines).toHaveLength(5);
    expect(mismatchLines.some((l) => l.includes('4') && l.includes('3'))).toBe(true);
    expect(mismatchLines.some((l) => l.includes('different order'))).toBe(true);
    expect(mismatchLines.some((l) => l.includes('12/1') && l.includes('12/0'))).toBe(true);
    expect(mismatchLines.some((l) => l.includes('g-two'))).toBe(true);
    expect(mismatchLines.some((l) => l.includes('3000') && l.includes('3100'))).toBe(true);
  });

  it('agrees when every claim matches', () => {
    const doc = [
      '```counts',
      'course: src/content/courses/x.ts',
      'lessons: 3',
      '```',
    ].join('\n');
    const planParsed = parsePlan(doc);
    const reportDoc = [
      '```counts',
      'course: src/content/courses/x.ts',
      'lessons: 3',
      'lesson-ids: x-l1-a, x-l1-b, x-l2-c',
      'level-checks: 12/0',
      'generators: g-one',
      'tests: 3',
      '```',
    ].join('\n');
    const reportParsed = parseReport(reportDoc);
    const claims = [...planParsed.claims, ...reportParsed.claims];
    const result = reconcile(claims, FACTS, 3);
    expect(result.status).toBe('ok');
    const formatted = formatResult(result);
    expect(formatted).toContain('checked: plan 1 claims, report 5 claims');
  });

  it('errors on a tests claim without a suite total', () => {
    const doc = ['```counts', 'tests: 3', '```'].join('\n');
    const parsed = parsePlan(doc);
    const result = reconcile(parsed.claims, FACTS);
    expect(result.status).toBe('error');
    expect(result.lines.join(' ')).toContain('--suite-log');
  });

  it('reads only an all-green suite line', () => {
    expect(parseSuiteLog('Tests  3086 passed (3086)\n')).toBe(3086);
    const red = parseSuiteLog('Tests  1 failed | 3085 passed (3086)\n');
    expect(red).toHaveProperty('error');
    const neither = parseSuiteLog('nothing useful here\n');
    expect(neither).toHaveProperty('error');
  });

  it('sweeps report prose for lesson and test counts', () => {
    const bad = parseReport('Trigonometric Functions course extended from 11→55 lessons. 4 units (44 lessons) added. All 3034 tests pass.\n');
    const badResult = reconcile(bad.claims, FACTS, 3086);
    const badMismatches = badResult.lines.filter((l) => l.includes('MISMATCH'));
    expect(badMismatches.length).toBeGreaterThanOrEqual(3);

    const good = parseReport('The course has 3 lessons. All 3086 tests pass. 26 passed.\n');
    const proseLessonClaims = good.claims.filter((c) => c.kind === 'prose-lessons');
    const proseTestClaims = good.claims.filter((c) => c.kind === 'prose-tests');
    expect(proseLessonClaims).toHaveLength(1);
    expect(proseTestClaims).toHaveLength(1);
    const goodResult = reconcile(good.claims, FACTS, 3086);
    expect(goodResult.lines.some((l) => l.includes('MISMATCH'))).toBe(false);
  });

  it('yields nothing for a report with no block and no counted phrases', () => {
    const result = parseReport('Nothing quantitative was said here.\n');
    expect(result.error).toBeUndefined();
    expect(verdict(result.claims, 0, result.error)).toBe('nothing');
    expect(result.notes.join(' ')).toContain('no counts block');
  });

  it('treats a supplied-but-empty report as nothing even when the plan has claims', () => {
    const planDoc = ['```counts', 'course: src/content/courses/x.ts', 'lessons: 3', '```'].join('\n');
    const planParsed = parsePlan(planDoc);
    const reportParsed = parseReport('Nothing quantitative was said here.\n');
    const combined = [...planParsed.claims, ...reportParsed.claims];
    const result = reconcile(combined, FACTS, 3, ['plan', 'report']);
    expect(result.status).toBe('nothing');
    expect(result.empty).toEqual(['report']);
    // The same combined claims, told only the plan was supplied, must not
    // read as nothing — the plan's own claims are real.
    const planOnly = reconcile(planParsed.claims, FACTS, 3, ['plan']);
    expect(planOnly.status).toBe('ok');
  });

  it('rejects an empty generators or lesson-ids value rather than treating it as an empty list that trivially agrees', () => {
    const emptyGenerators = parseCountsBlock(['```counts', 'generators:', '```'].join('\n'), 'plan');
    expect(emptyGenerators.error).toBeDefined();
    const emptyIds = parseCountsBlock(['```counts', 'course: src/content/courses/x.ts', 'lesson-ids:', '```'].join('\n'), 'plan');
    expect(emptyIds.error).toBeDefined();
  });

  it('normalises an absolute path prefix on a course line', () => {
    const doc = ['```counts', 'course: /home/user/Maths-Trainer/src/content/courses/x.ts', 'lessons: 3', '```'].join('\n');
    const parsed = parsePlan(doc);
    const result = reconcile(parsed.claims, FACTS, 3);
    expect(result.status).toBe('ok');
  });

  it('reads only a suite line whose two numbers actually agree', () => {
    const inconsistent = parseSuiteLog('Tests  3085 passed (3086)\n');
    expect(inconsistent).toHaveProperty('error');
  });

  it('checks prose lesson counts against every level total and the grand total, not only the course total', () => {
    // FACTS: course lessons=3, perLevel=[2,1], totalLessons=3 — "2 lessons"
    // is valid only via a per-level count, never via the course or grand total.
    const onlyPerLevel = parseReport('The first level has 2 lessons.\n');
    const result = reconcile(onlyPerLevel.claims, FACTS, 3);
    expect(result.lines.some((l) => l.includes('MISMATCH'))).toBe(false);

    const facts2: Facts = { ...FACTS, totalLessons: 9 };
    const onlyGrandTotal = parseReport('9 lessons across the app so far.\n');
    const result2 = reconcile(onlyGrandTotal.claims, facts2, 3);
    expect(result2.lines.some((l) => l.includes('MISMATCH'))).toBe(false);
  });

  it('splits process.argv at the vite-node binary under both observed layouts', () => {
    // TASK5-PLAN.md section 8 item 5's claimed layout: no node entry.
    expect(scriptArgs(['/root/.npm/_npx/x/node_modules/.bin/vite-node', 'alpha', '--suite-log', 'x.txt', '2'])).toEqual([
      'alpha',
      '--suite-log',
      'x.txt',
      '2',
    ]);
    // This container's actual layout: node entry first.
    expect(scriptArgs(['/opt/node22/bin/node', '/root/.npm/_npx/x/node_modules/.bin/vite-node', 'alpha', '--x', 'y'])).toEqual([
      'alpha',
      '--x',
      'y',
    ]);
    // Neither layout found (e.g. plain node): falls back to slice(2) rather than misreading a real arg as the binary.
    expect(scriptArgs(['/opt/node22/bin/node', '/some/script.ts', '--dump-facts'])).toEqual(['--dump-facts']);
  });
});

describe('counts: the real plans, the real tree, and the command line', () => {
  const snapshot = loadSnapshot();

  it('maps every course file to the course it exports', async () => {
    const live = await loadFacts(REPO_ROOT);

    expect(Object.keys(live.courses)).toHaveLength(courses.length);
    // Two live sources compared against each other, so this cannot rot: the
    // course index's own lessonCount() must agree with what countsTree counted.
    const liveLessonsByCourse = Object.values(live.courses)
      .map((c) => c.lessons)
      .sort((a, b) => a - b);
    const indexLessonsByCourse = courses.map((c) => lessonCount(c)).sort((a, b) => a - b);
    expect(liveLessonsByCourse).toEqual(indexLessonsByCourse);

    const summed = Object.values(live.courses).reduce((sum, c) => sum + c.lessons, 0);
    expect(summed).toBe(live.totalLessons);
    expect(live.generators.length).toBe(Object.keys(registry).length);
  });

  it('reconciles the task 1 plan against the tree', () => {
    const parsed = parsePlan(readPlan('TASK1-PLAN.md'));
    expect(parsed.error).toBeUndefined();
    expect(parsed.claims).toHaveLength(3);
    const result = reconcile(parsed.claims, snapshot);
    expect(result.status).toBe('ok');
  });

  it('reconciles the task 2 plan against the tree', () => {
    const parsed = parsePlan(readPlan('TASK2-PLAN.md'));
    expect(parsed.error).toBeUndefined();
    expect(parsed.claims).toHaveLength(3);
    const result = reconcile(parsed.claims, snapshot);
    expect(result.status).toBe('ok');
  });

  it('reconciles the task 3 plan only through its test count', () => {
    const parsed = parsePlan(readPlan('TASK3-PLAN.md'));
    expect(parsed.error).toBeUndefined();
    expect(parsed.claims).toHaveLength(1);
    const agree = reconcile(parsed.claims, snapshot, 2995);
    expect(agree.status).toBe('ok');
    const disagree = reconcile(parsed.claims, snapshot, 3086);
    expect(disagree.status).toBe('mismatch');
    const line = disagree.lines.find((l) => l.includes('MISMATCH'))!;
    expect(line).toContain('2995');
    expect(line).toContain('3086');
  });

  it('reconciles the task 4 plan against the tree', () => {
    const parsed = parsePlan(readPlan('TASK4-PLAN.md'));
    expect(parsed.error).toBeUndefined();
    expect(parsed.claims).toHaveLength(4);
    const result = reconcile(parsed.claims, snapshot, 3086);
    expect(result.status).toBe('ok');
  });

  it('rejects the task 4 summary transcribed as a block', () => {
    const plan = parsePlan(readPlan('TASK4-PLAN.md'));
    const report = parseReport(readFixture('task4-summary-block.md'));
    const claims = [...plan.claims, ...report.claims];
    const result = reconcile(claims, snapshot, 3086, ['plan', 'report']);
    expect(result.status).toBe('mismatch');
    const text = result.lines.join('\n');
    expect(text).toContain('55');
    expect(text).toContain('15');
    expect(text).toContain('3034');
    expect(text).toContain('3086');
    expect(text).toContain('44');
  });

  it('rejects the task 4 summary as prose', () => {
    const report = parseReport(readFixture('task4-summary-prose.md'));
    expect(report.notes.join(' ')).toContain('no counts block');
    const result = reconcile(report.claims, snapshot, 3086, ['report']);
    expect(result.status).toBe('mismatch');
    const text = result.lines.join('\n');
    expect(text).toContain('55');
    expect(text).toContain('44');
    expect(text).toContain('3034');
  });

  it('rejects the generator names the task 1 summary used', () => {
    const plan = parsePlan(readPlan('TASK1-PLAN.md'));
    const report = parseReport(readFixture('task1-summary-block.md'));
    const claims = [...plan.claims, ...report.claims];
    const result = reconcile(claims, snapshot, undefined, ['plan', 'report']);
    expect(result.status).toBe('mismatch');
    const text = result.lines.join('\n');
    expect(text).toContain('df-reciprocal');
    expect(text).toContain('df-quotient');
    expect(text).toContain('df-product');
  });

  it(
    'exits non-zero from the command line when there is nothing to check',
    () => {
      const dir = mkdtempSync(join(tmpdir(), 'counts-nothing-'));
      const planPath = join(dir, 'plan.md');
      const reportPath = join(dir, 'report.md');
      writeFileSync(planPath, '## 1. Done\n\nEverything shipped, no counts stated.\n');
      writeFileSync(reportPath, 'Nothing quantitative was said here.\n');
      const { status, stdout } = runCounts([planPath, reportPath]);
      expect(status).toBe(2);
      expect(stdout).toContain('NOTHING TO CHECK');
    },
    60_000,
  );

  it(
    'exits zero from the command line when plan, report and tree agree',
    async () => {
      // Plan and report are both written from the live tree. The plan used to
      // be the frozen TASK4-PLAN.md, which pins the trig course at 15 lessons
      // and so failed the moment a level was added; the claim that the frozen
      // plan matched the tree it was written against is kept, against the
      // snapshot, by 'reconciles the task 4 plan against the tree'.
      const live = await loadFacts(REPO_ROOT);
      const trig = live.courses['src/content/courses/trigonometricFunctions.ts'];
      const dir = mkdtempSync(join(tmpdir(), 'counts-agree-'));
      const planPath = join(dir, 'plan.md');
      const reportPath = join(dir, 'report.md');
      const suiteLogPath = join(dir, 'suite.txt');
      const trigClaims = [
        'course: src/content/courses/trigonometricFunctions.ts',
        `lessons: ${trig.lessons}`,
        `lesson-ids: ${trig.lessonIds.join(', ')}`,
        `level-checks: ${trig.levelChecks.join('/')}`,
      ];
      const planBlock = ['```counts', ...trigClaims, 'tests: 3086', '```', ''].join('\n');
      const reportBlock = [
        '```counts',
        ...trigClaims,
        'generators: trig-period-from-b, trig-related-angle, trig-solve-height, trig-pythagorean',
        'tests: 3086',
        '```',
        '',
      ].join('\n');
      writeFileSync(planPath, planBlock);
      writeFileSync(reportPath, reportBlock);
      writeFileSync(suiteLogPath, SUITE_LOG_GREEN);
      const { status, stdout } = runCounts([planPath, reportPath, '--suite-log', suiteLogPath]);
      expect(status).toBe(0);
      expect(stdout).toContain('COUNTS AGREE');
      expect(stdout).toContain('checked: plan 4 claims, report 5 claims');
    },
    60_000,
  );

  it(
    'exits one from the command line on a mismatch',
    () => {
      const dir = mkdtempSync(join(tmpdir(), 'counts-mismatch-'));
      const suiteLogPath = join(dir, 'suite.txt');
      writeFileSync(suiteLogPath, SUITE_LOG_GREEN);
      const { status, stdout } = runCounts([
        join(PLANS_DIR, 'TASK4-PLAN.md'),
        join(FIXTURES_DIR, 'task4-summary-block.md'),
        '--suite-log',
        suiteLogPath,
      ]);
      expect(status).toBe(1);
      expect(stdout).toContain('COUNTS DISAGREE');
    },
    60_000,
  );
});
