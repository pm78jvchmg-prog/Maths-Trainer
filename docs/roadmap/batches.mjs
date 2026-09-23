#!/usr/bin/env node
/**
 * The roadmap's batch record: one file per batch in `docs/roadmap/batches/`,
 * assembled into the phase B and phase C tables on demand.
 *
 * The tables used to live in `docs/ROADMAP.md` itself, and every batch added a
 * row at the bottom of one of them. With nine branches open at once, each
 * landing put every other branch into a merge conflict on adjacent lines, and
 * a branch spent hours merging main, re-testing and re-building while main
 * moved again. A file per batch is a file nobody else touches.
 *
 *   node docs/roadmap/batches.mjs      print both tables as markdown
 *
 * A batch file looks like this, and `batches.test.mjs` holds every file to it:
 *
 *   # B23: Complex Numbers: The Exponential Form
 *
 *   Status: claimed
 *   Branch: `claude/roadmap-b-complex-numbers-3-ji4c6s`
 *
 *   Free text: what the batch shipped, once it is done.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const batchesDir = join(dirname(fileURLToPath(import.meta.url)), 'batches');

export const STATUSES = ['claimed', 'done'];

/** Batch ids sort B2 before B10, and C2 before C2-widget. */
function compareIds(a, b) {
  return a.localeCompare(b, 'en', { numeric: true });
}

/** Reads one batch file, or throws naming what is wrong with it. */
export function parseBatch(file, text) {
  const id = file.replace(/\.md$/, '');
  const lines = text.split('\n');
  const heading = /^# ([BC]\d+(?:-[a-z]+)?): (.+)$/.exec(lines[0] ?? '');
  if (!heading) throw new Error(`${file}: the first line should be "# ${id}: <batch title>"`);
  if (heading[1] !== id) throw new Error(`${file}: the heading names ${heading[1]}, but the file is ${id}`);

  const field = (name) => lines.find((line) => line.startsWith(`${name}: `))?.slice(name.length + 2).trim();
  const status = field('Status');
  if (!STATUSES.includes(status ?? '')) {
    throw new Error(`${file}: needs a "Status: ${STATUSES.join('" or "Status: ')}" line`);
  }
  const branch = field('Branch');
  if (!branch) throw new Error(`${file}: needs a "Branch: \`<branch name>\`" line`);

  const notes = lines
    .slice(1)
    .filter((line) => !/^(Status|Branch): /.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { id, phase: id[0], title: heading[2], status, branch, notes };
}

export function readBatches(dir = batchesDir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => parseBatch(file, readFileSync(join(dir, file), 'utf8')))
    .sort((a, b) => compareIds(a.id, b.id));
}

export function renderTables(batches) {
  const table = (phase) => [
    `### Phase ${phase} batches`,
    '',
    '| # | Batch | Status | Branch | Notes |',
    '| ---: | --- | --- | --- | --- |',
    ...batches
      .filter((batch) => batch.phase === phase)
      .map((b) => `| ${b.id} | ${b.title} | ${b.status} | ${b.branch} | ${b.notes} |`),
  ];
  return [...table('B'), '', ...table('C'), ''].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(renderTables(readBatches()));
}
