/**
 * CLI: reconciles a plan's and a report's counted claims against the tree
 * and a captured suite run, and exits non-zero on disagreement — and,
 * separately, non-zero when a supplied document yielded nothing to check.
 *
 * Usage: eval/bin/counts.sh <plan.md> [<report.md>] [--suite-log <file>]
 *    or: eval/bin/counts.sh --dump-facts
 */
import { readFileSync } from 'node:fs';
import { parsePlan, parseReport, parseSuiteLog, reconcile, formatResult, scriptArgs, type Status } from './countsCore';
import { loadFacts } from './countsTree';

const EXIT: Record<Status, number> = { ok: 0, mismatch: 1, nothing: 2, error: 2 };

function usage(): never {
  console.error('usage: counts.sh <plan.md> [<report.md>] [--suite-log <file>]');
  console.error('       counts.sh --dump-facts');
  process.exit(2);
}

function readOrDie(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    console.error(`ERROR: cannot read "${path}"`);
    process.exit(2);
  }
}

async function main(): Promise<void> {
  const repoRoot = process.env.COUNTS_REPO ?? process.cwd();
  // The plan's TASK5-PLAN.md section 8 item 5 claims argv[1] is the
  // vite-node binary and the script's own args begin at index 1. Reproduced
  // here instead of trusted: in this container `process.argv` is
  // [node, vite-node-bin, ...scriptArgs] — the script's own args begin at
  // index 2, not 1. `scriptArgs` (countsCore.ts) derives the split from
  // wherever the vite-node binary itself sits in argv, rather than hard-
  // coding either index, so it works under both observed layouts.
  const args = scriptArgs(process.argv);

  if (args.length === 0) usage();

  if (args.includes('--dump-facts')) {
    if (args.length !== 1) usage();
    const facts = await loadFacts(repoRoot);
    console.log(JSON.stringify(facts, null, 2));
    process.exitCode = 0;
    return;
  }

  let suiteLogPath: string | undefined;
  const positionals: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--suite-log') {
      i++;
      suiteLogPath = args[i];
      if (suiteLogPath === undefined) usage();
    } else if (arg.startsWith('--')) {
      usage();
    } else {
      positionals.push(arg);
    }
  }
  if (positionals.length === 0 || positionals.length > 2) usage();
  const [planPath, reportPath] = positionals;

  const planText = readOrDie(planPath);
  const planParsed = parsePlan(planText);
  const reportText = reportPath !== undefined ? readOrDie(reportPath) : undefined;
  const reportParsed = reportText !== undefined ? parseReport(reportText) : undefined;

  const notes: string[] = [...planParsed.notes, ...(reportParsed?.notes ?? [])];
  for (const note of notes) console.log(note);

  if (planParsed.error) {
    console.error(`ERROR: ${planParsed.error}`);
    process.exit(EXIT.error);
  }
  if (reportParsed?.error) {
    console.error(`ERROR: ${reportParsed.error}`);
    process.exit(EXIT.error);
  }

  const allClaims = [...planParsed.claims, ...(reportParsed?.claims ?? [])];
  const needsSuite = allClaims.some((c) => c.kind === 'tests' || c.kind === 'prose-tests');

  let suiteTotal: number | undefined;
  if (suiteLogPath !== undefined) {
    const parsedSuite = parseSuiteLog(readOrDie(suiteLogPath));
    if (typeof parsedSuite !== 'number') {
      console.error(`ERROR: ${parsedSuite.error}`);
      process.exit(EXIT.error);
    }
    suiteTotal = parsedSuite;
  } else if (needsSuite) {
    console.error('ERROR: a tests claim needs --suite-log; run "npx vitest run > <file> 2>&1" on this checkout first');
    process.exit(EXIT.error);
  }

  const facts = await loadFacts(repoRoot);
  const supplied: Array<'plan' | 'report'> = reportParsed ? ['plan', 'report'] : ['plan'];
  const result = reconcile(allClaims, facts, suiteTotal, supplied);

  console.log(formatResult(result));
  process.exitCode = EXIT[result.status];
}

main().catch((err: unknown) => {
  console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(EXIT.error);
});
