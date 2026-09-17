/**
 * Reconciles the counts a plan or a report claims against what the tree
 * actually has, and against the test suite's own summary line.
 *
 * Built because the account of the work has twice diverged from the work
 * while the work itself was right: task 1's closing summary named its four
 * generators `df-reciprocal`, `df-quotient`, `df-product` against a tree that
 * held `df-index-form`, `df-chain-root`, `df-product-mixed`, `df-tangent-line`;
 * task 4's summary claimed the trigonometry course had grown to 55 lessons
 * across "4 units (44 lessons)" with "3034 tests" passing, against a tree
 * that actually had 15 lessons, 4 new lessons and 3086 passing tests. Both
 * times the only catcher was an orchestrator remembering to grep the tree
 * rather than trust the prose. This module reconciles three sources — a
 * plan's claims, a report's claims, and the tree itself (course files,
 * the generator registry, and a captured test-suite run) — and treats a
 * document that yields no claims at all as a failure, not a pass: a parser
 * that silently stops matching how a document is phrased is the same defect
 * this file exists to close, wearing a green suite.
 */

/** A single claim one of the two documents makes about the tree. */
export interface Claim {
  source: 'plan' | 'report';
  kind: 'lessons' | 'lesson-ids' | 'level-checks' | 'generators' | 'tests' | 'prose-lessons' | 'prose-tests';
  course?: string;
  value: number | number[] | string[];
  line: number;
}

export type Status = 'ok' | 'mismatch' | 'nothing' | 'error';

export interface Result {
  status: Status;
  lines: string[];
  claims: { plan: number; report: number };
  /** Which supplied document(s), if any, yielded zero claims — drives the `nothing` message. */
  empty: Array<'plan' | 'report'>;
  mismatchCount: number;
}

/** The facts a document's claims are checked against; populated from the live tree by countsTree.ts. */
export interface CourseFacts {
  id: string;
  lessons: number;
  perLevel: number[];
  lessonIds: string[];
  levelChecks: number[];
}

export interface Facts {
  courses: Record<string, CourseFacts>;
  generators: string[];
  totalLessons: number;
}

// --- 2.1 The `counts` block ------------------------------------------------

const COUNTS_BLOCK = /^```counts[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm;

const BLOCK_KEYS = new Set(['course', 'lessons', 'lesson-ids', 'level-checks', 'generators', 'tests']);

// --- 2.2 The legacy Done-section grammar (parsed form) ---------------------

/** A lesson id: course prefix, level, slug — `tf-l2-symmetry`. */
const LESSON_ID = '[a-z0-9]+-l[0-9]+-[a-z0-9-]+';
/** The Done section: from a `## N. Done` heading to the next `## ` heading or the end of the file. */
const DONE_SECTION = /^## \d+\. Done\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m;
/** "`src/content/courses/x.ts` has 15 lessons"; an absolute prefix before src/ is tolerated. */
const HAS_LESSONS = /`(?:[^`]*\/)?(src\/content\/courses\/[A-Za-z]+\.ts)` has (\d+) lessons/;
/** The first backticked comma-separated run of lesson ids on the same line as HAS_LESSONS. */
const ID_LIST = new RegExp('`(' + LESSON_ID + '(?:, ' + LESSON_ID + ')*)`');
/** "level checks are 15/12/14/15" or "level checks 12/15/15", on the same line as HAS_LESSONS. */
const LEVEL_CHECKS = /level checks (?:are )?(\d+(?:\/\d+)+)/;
/** "`npm test` 3086" — the complete-case count; a trailing "(or …)" list of stop-rule alternatives is ignored. */
const NPM_TEST = /`npm test` (\d{3,5})\b/;

// --- 2.3 The report prose sweep ---------------------------------------------

/** Report prose: "55 lessons" — every such number must be a lesson count the tree actually has. */
const PROSE_LESSONS = /\b(\d+) lessons\b/g;
/** Report prose: "all 3034 tests pass" — must equal the suite total. */
const PROSE_TESTS = /\b(\d+) tests? (?:pass|passed|passing)\b/g;

// --- 2.4 The suite log -------------------------------------------------------

/** vitest's summary line; only an all-green line yields a total. */
const SUITE_GREEN = /^\s*Tests\s+(\d+) passed \((\d+)\)\s*$/m;
/** A red suite must never be read as a total. */
const SUITE_RED = /^\s*Tests\s+.*\bfailed\b/m;

function lineOf(text: string, offset: number): number {
  return text.slice(0, offset).split('\n').length;
}

function normaliseCourse(value: string): string {
  const marker = 'src/content/courses/';
  const idx = value.indexOf(marker);
  return idx === -1 ? value : value.slice(idx);
}

function parseBlockContent(content: string, startLine: number, source: 'plan' | 'report'): { claims: Claim[]; error?: string } {
  const claims: Claim[] = [];
  let currentCourse: string | undefined;
  let sawGenerators = false;
  let sawTests = false;
  const contentLines = content.split('\n');
  for (let i = 0; i < contentLines.length; i++) {
    const rawLine = contentLines[i];
    const lineNo = startLine + i;
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      return { claims: [], error: `malformed line at line ${lineNo}: "${rawLine}"` };
    }
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (!BLOCK_KEYS.has(key)) {
      return { claims: [], error: `unknown key "${key}" at line ${lineNo}` };
    }
    switch (key) {
      case 'course': {
        currentCourse = normaliseCourse(value);
        break;
      }
      case 'lessons': {
        if (!currentCourse) return { claims: [], error: `"lessons" before any "course:" line, at line ${lineNo}` };
        if (!/^\d+$/.test(value)) return { claims: [], error: `"lessons" is not a non-negative integer, at line ${lineNo}` };
        claims.push({ source, kind: 'lessons', course: currentCourse, value: Number(value), line: lineNo });
        break;
      }
      case 'lesson-ids': {
        if (!currentCourse) return { claims: [], error: `"lesson-ids" before any "course:" line, at line ${lineNo}` };
        const ids = value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
        if (ids.length === 0) return { claims: [], error: `"lesson-ids" is empty, at line ${lineNo}` };
        claims.push({ source, kind: 'lesson-ids', course: currentCourse, value: ids, line: lineNo });
        break;
      }
      case 'level-checks': {
        if (!currentCourse) return { claims: [], error: `"level-checks" before any "course:" line, at line ${lineNo}` };
        if (!/^\d+(\/\d+)*$/.test(value)) return { claims: [], error: `"level-checks" does not match N/N/.../N, at line ${lineNo}` };
        claims.push({ source, kind: 'level-checks', course: currentCourse, value: value.split('/').map(Number), line: lineNo });
        break;
      }
      case 'generators': {
        if (sawGenerators) return { claims: [], error: `duplicate "generators" key, at line ${lineNo}` };
        sawGenerators = true;
        const ids = value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
        if (ids.length === 0) return { claims: [], error: `"generators" is empty, at line ${lineNo}` };
        claims.push({ source, kind: 'generators', value: ids, line: lineNo });
        break;
      }
      case 'tests': {
        if (sawTests) return { claims: [], error: `duplicate "tests" key, at line ${lineNo}` };
        sawTests = true;
        if (!/^\d+$/.test(value)) return { claims: [], error: `"tests" is not a non-negative integer, at line ${lineNo}` };
        claims.push({ source, kind: 'tests', value: Number(value), line: lineNo });
        break;
      }
    }
  }
  return { claims };
}

/** Parses the single `counts` fence in a document, if any. Two fences is an error. */
export function parseCountsBlock(text: string, source: 'plan' | 'report'): { claims: Claim[]; error?: string; found: boolean } {
  const matches = [...text.matchAll(COUNTS_BLOCK)];
  if (matches.length === 0) return { claims: [], found: false };
  if (matches.length > 1) return { claims: [], found: true, error: 'more than one counts block in the document' };
  const match = matches[0];
  const startOffset = match.index ?? 0;
  const fenceLine = lineOf(text, startOffset);
  const content = match[1];
  const result = parseBlockContent(content, fenceLine + 1, source);
  if (result.error) return { claims: [], found: true, error: result.error };
  return { claims: result.claims, found: true };
}

/** Parses a plan document: the `counts` block if present, else the legacy Done-section grammar. */
export function parsePlan(text: string): { claims: Claim[]; notes: string[]; error?: string } {
  const block = parseCountsBlock(text, 'plan');
  if (block.error) return { claims: [], notes: [], error: block.error };
  if (block.found) {
    return { claims: block.claims, notes: ['plan: counts block found; Done-section prose ignored'] };
  }

  const doneMatch = DONE_SECTION.exec(text);
  if (!doneMatch) {
    return { claims: [], notes: ['no counts block and no "## N. Done" section'] };
  }

  const section = doneMatch[1];
  const sectionOffset = doneMatch.index + doneMatch[0].length - section.length;
  const sectionStartLine = lineOf(text, sectionOffset);
  const claims: Claim[] = [];
  const lines = section.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = sectionStartLine + i;
    const hasLessons = HAS_LESSONS.exec(line);
    if (!hasLessons) continue;
    const course = hasLessons[1];
    claims.push({ source: 'plan', kind: 'lessons', course, value: Number(hasLessons[2]), line: lineNo });
    const idList = ID_LIST.exec(line);
    if (idList) {
      claims.push({ source: 'plan', kind: 'lesson-ids', course, value: idList[1].split(',').map((s) => s.trim()), line: lineNo });
    }
    const levelChecks = LEVEL_CHECKS.exec(line);
    if (levelChecks) {
      claims.push({ source: 'plan', kind: 'level-checks', course, value: levelChecks[1].split('/').map(Number), line: lineNo });
    }
  }
  const npmTest = NPM_TEST.exec(section);
  if (npmTest) {
    const testsLineNo = sectionStartLine + lineOf(section, npmTest.index ?? 0) - 1;
    claims.push({ source: 'plan', kind: 'tests', value: Number(npmTest[1]), line: testsLineNo });
  }

  if (claims.length === 0) {
    return { claims: [], notes: ['"## N. Done" section found but it contains no recognisable claim'] };
  }
  return { claims, notes: [] };
}

/** Parses a report document: the `counts` block if present (mandatory going forward, no Done-section fallback), plus the prose sweep. */
export function parseReport(text: string): { claims: Claim[]; notes: string[]; error?: string } {
  const block = parseCountsBlock(text, 'report');
  if (block.error) return { claims: [], notes: [], error: block.error };

  const claims: Claim[] = block.found ? [...block.claims] : [];
  const notes: string[] = [block.found ? 'report: counts block found' : 'report: no counts block found; prose sweep only'];

  for (const m of text.matchAll(PROSE_LESSONS)) {
    claims.push({ source: 'report', kind: 'prose-lessons', value: Number(m[1]), line: lineOf(text, m.index ?? 0) });
  }
  for (const m of text.matchAll(PROSE_TESTS)) {
    claims.push({ source: 'report', kind: 'prose-tests', value: Number(m[1]), line: lineOf(text, m.index ?? 0) });
  }

  return { claims, notes };
}

/** Reads the suite total from a captured `npx vitest run` log. Only an all-green summary line counts. */
export function parseSuiteLog(text: string): number | { error: string } {
  if (SUITE_RED.test(text)) return { error: 'suite log shows a failing run' };
  const m = SUITE_GREEN.exec(text);
  if (!m) return { error: 'suite log has no all-green "Tests N passed (N)" summary line' };
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a !== b) return { error: `suite log summary numbers disagree: ${a} vs ${b}` };
  return a;
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function formatLine(claim: Claim, course: string, claimed: unknown, actual: unknown, ok: boolean, reason?: string): string {
  const claimedStr = formatValue(claimed);
  const actualStr = formatValue(actual);
  if (ok) {
    return `${claim.source}  ${claim.kind}  ${course}  ${claimedStr} = ${actualStr}  ok`;
  }
  return `${claim.source}  ${claim.kind}  ${course}  ${claimedStr} = ${actualStr}  MISMATCH: ${reason ?? 'disagreement'} (line ${claim.line})`;
}

function compareIdSequence(claimed: string[], actual: string[]): [boolean, string | undefined] {
  if (claimed.length === actual.length && claimed.every((id, i) => id === actual[i])) {
    return [true, undefined];
  }
  const claimedSet = new Set(claimed);
  const actualSet = new Set(actual);
  const missing = actual.filter((id) => !claimedSet.has(id));
  const extra = claimed.filter((id) => !actualSet.has(id));
  if (missing.length === 0 && extra.length === 0) {
    if (claimed.length !== actual.length) {
      return [false, `same set of ids but a different count (claimed ${claimed.length}, tree ${actual.length}) — a duplicate somewhere`];
    }
    return [false, 'same set, different order'];
  }
  const parts: string[] = [];
  if (missing.length > 0) parts.push(`missing: ${missing.join(', ')}`);
  if (extra.length > 0) parts.push(`extra: ${extra.join(', ')}`);
  return [false, parts.join('; ')];
}

function sameSequence(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function buildProseLessonUniverse(facts: Facts): Set<number> {
  const set = new Set<number>();
  for (const cf of Object.values(facts.courses)) {
    set.add(cf.lessons);
    for (const n of cf.perLevel) set.add(n);
  }
  set.add(facts.totalLessons);
  return set;
}

/** The overall status for one claim set, by the stated precedence: error, then nothing, then mismatch, then ok. */
export function verdict(claims: Claim[], mismatchCount: number, error?: string): Status {
  if (error) return 'error';
  if (claims.length === 0) return 'nothing';
  if (mismatchCount > 0) return 'mismatch';
  return 'ok';
}

/**
 * Checks every claim against the tree (and the suite total, if given), pure
 * — no I/O.
 *
 * `supplied` names which documents were actually given to the CLI (default
 * `['plan']`, since a plan is mandatory and a report is optional). Zero
 * claims from any *supplied* document is `nothing`, even when the other
 * supplied document disagrees or agrees — this is decided here, inside the
 * one function that produces `Result.status`, rather than by a caller
 * inspecting claim counts and overwriting the status afterwards. A second
 * place deciding the same precedence is exactly the failure class this file
 * exists to close.
 */
export function reconcile(claims: Claim[], facts: Facts, suiteTotal?: number, supplied: Array<'plan' | 'report'> = ['plan']): Result {
  const same = (a: number, b: number): boolean => a === b;
  const known = (id: string): boolean => facts.generators.includes(id);

  const lines: string[] = [];
  let mismatches = 0;
  let errorMessage: string | undefined;
  const proseUniverse = buildProseLessonUniverse(facts);

  let suiteErrorLogged = false;
  const needsSuite = (msgKind: string, claim: Claim): boolean => {
    if (suiteTotal !== undefined) return false;
    const msg = `${claim.source}  ${msgKind}  -  ${formatValue(claim.value)} = ?  ERROR: a tests claim needs --suite-log; run "npx vitest run > <file> 2>&1" on this checkout first`;
    if (!suiteErrorLogged) {
      lines.push(msg);
      suiteErrorLogged = true;
    }
    errorMessage = msg;
    return true;
  };

  for (const claim of claims) {
    const course = claim.course;
    if (course !== undefined && !(course in facts.courses)) {
      const msg = `${claim.source}  ${claim.kind}  ${course}  ERROR: unknown course (line ${claim.line})`;
      lines.push(msg);
      errorMessage = msg;
      continue;
    }
    const cf = course !== undefined ? facts.courses[course] : undefined;

    switch (claim.kind) {
      case 'lessons': {
        const claimed = claim.value as number;
        const actual = cf!.lessons;
        const ok = same(claimed, actual);
        lines.push(formatLine(claim, course!, claimed, actual, ok, ok ? undefined : `expected ${claimed}, tree has ${actual}`));
        if (!ok) mismatches++;
        break;
      }
      case 'lesson-ids': {
        const claimed = claim.value as string[];
        const actual = cf!.lessonIds;
        const [ok, reason] = compareIdSequence(claimed, actual);
        lines.push(formatLine(claim, course!, claimed, actual, ok, reason));
        if (!ok) mismatches++;
        break;
      }
      case 'level-checks': {
        const claimed = claim.value as number[];
        const actual = cf!.levelChecks;
        const ok = sameSequence(claimed, actual);
        lines.push(formatLine(claim, course!, claimed, actual, ok, ok ? undefined : `expected ${claimed.join('/')}, tree has ${actual.join('/')}`));
        if (!ok) mismatches++;
        break;
      }
      case 'generators': {
        const claimed = claim.value as string[];
        const absent = claimed.filter((id) => !known(id));
        const ok = absent.length === 0;
        lines.push(
          formatLine(claim, '-', claimed, `[${facts.generators.length} registry ids]`, ok, ok ? undefined : `absent from the registry: ${absent.join(', ')}`),
        );
        if (!ok) mismatches++;
        break;
      }
      case 'tests': {
        if (needsSuite('tests', claim)) break;
        const claimed = claim.value as number;
        const ok = same(claimed, suiteTotal!);
        lines.push(formatLine(claim, '-', claimed, suiteTotal, ok, ok ? undefined : `expected ${claimed}, suite has ${suiteTotal}`));
        if (!ok) mismatches++;
        break;
      }
      case 'prose-lessons': {
        const claimed = claim.value as number;
        const ok = proseUniverse.has(claimed);
        lines.push(
          formatLine(
            claim,
            '-',
            claimed,
            '[tree lesson counts]',
            ok,
            ok ? undefined : `${claimed} is not a lesson count the tree has (no course total, level total or grand total)`,
          ),
        );
        if (!ok) mismatches++;
        break;
      }
      case 'prose-tests': {
        if (needsSuite('prose-tests', claim)) break;
        const claimed = claim.value as number;
        const ok = same(claimed, suiteTotal!);
        lines.push(formatLine(claim, '-', claimed, suiteTotal, ok, ok ? undefined : `expected ${claimed}, suite has ${suiteTotal}`));
        if (!ok) mismatches++;
        break;
      }
    }
  }

  const planCount = claims.filter((c) => c.source === 'plan').length;
  const reportCount = claims.filter((c) => c.source === 'report').length;
  const empty = supplied.filter((s) => !claims.some((c) => c.source === s));
  let status = verdict(claims, mismatches, errorMessage);
  if (status !== 'error' && empty.length > 0) status = 'nothing';
  return { status, lines, claims: { plan: planCount, report: reportCount }, empty, mismatchCount: mismatches };
}

/** Renders a `Result` the way the CLI prints it: per-claim lines, the checked-count line, one verdict line. */
export function formatResult(result: Result): string {
  const lines = [...result.lines];
  lines.push(`checked: plan ${result.claims.plan} claims, report ${result.claims.report} claims`);
  switch (result.status) {
    case 'ok':
      lines.push('COUNTS AGREE');
      break;
    case 'mismatch': {
      lines.push(`COUNTS DISAGREE: ${result.mismatchCount} mismatches`);
      break;
    }
    case 'nothing': {
      const which = result.empty.length > 0 ? result.empty.join(' and ') : 'document';
      lines.push(`NOTHING TO CHECK: ${which} yielded 0 claims`);
      break;
    }
    case 'error': {
      const errLine = result.lines.find((l) => l.includes('ERROR:'));
      lines.push(errLine ?? 'ERROR: unspecified error');
      break;
    }
  }
  return lines.join('\n');
}
