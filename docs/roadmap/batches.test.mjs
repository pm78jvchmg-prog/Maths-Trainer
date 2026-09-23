import { describe, expect, it } from 'vitest';
import { parseBatch, readBatches, renderTables } from './batches.mjs';

describe('roadmap batch files', () => {
  it('every file in docs/roadmap/batches/ reads as a batch', () => {
    // readBatches throws naming the file and what is wrong with it.
    const batches = readBatches();
    expect(batches.length).toBeGreaterThan(0);
  });

  it('assembles both phase tables', () => {
    const tables = renderTables(readBatches());
    expect(tables).toContain('### Phase B batches');
    expect(tables).toContain('### Phase C batches');
    expect(tables).toMatch(/\| B1 \| Exponents & Radicals: Standard Form \| done \|/);
  });

  it('refuses a file whose heading names another batch', () => {
    expect(() => parseBatch('B40.md', '# B41: Somewhere\n\nStatus: done\nBranch: `x`\n')).toThrow(/names B41/);
  });

  it('refuses a status outside claimed and done', () => {
    expect(() => parseBatch('B40.md', '# B40: Somewhere\n\nStatus: open\nBranch: `x`\n')).toThrow(/Status/);
  });

  it('refuses a file with no branch', () => {
    expect(() => parseBatch('B40.md', '# B40: Somewhere\n\nStatus: claimed\n')).toThrow(/Branch/);
  });

  it('reads a widget batch id', () => {
    const batch = parseBatch('C2-widget.md', '# C2-widget: Graph transformations\n\nStatus: claimed\nBranch: `b`\n');
    expect(batch).toMatchObject({ id: 'C2-widget', phase: 'C', status: 'claimed', notes: '' });
  });

  it('reads a fix id and prints it in the fixes table', () => {
    const batch = parseBatch('fix-duplicate-tiles.md', '# fix-duplicate-tiles: Two tiles that look the same\n\nStatus: claimed\nBranch: `b`\n');
    expect(batch).toMatchObject({ id: 'fix-duplicate-tiles', phase: 'f', status: 'claimed' });
    expect(renderTables([batch])).toMatch(/### Fixes[\s\S]*\| fix-duplicate-tiles \| Two tiles that look the same \| claimed \|/);
  });

  it('reads a later-level batch id', () => {
    const batch = parseBatch('C10-l3.md', '# C10-l3: Exponential Models: Rates in Models\n\nStatus: claimed\nBranch: `b`\n');
    expect(batch).toMatchObject({ id: 'C10-l3', phase: 'C', status: 'claimed' });
  });
});
