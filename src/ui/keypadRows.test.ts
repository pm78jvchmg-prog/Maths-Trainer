import { describe, expect, it } from 'vitest';
import type { KeypadKey } from '../content/types';
import { keypadRows } from './keypadRows';
import { TRIG_WORKING_KEYS, WORKING_KEYS } from '../content/generators/workingKeys';

const plain = (n: number): KeypadKey[] => Array.from({ length: n }, (_, i) => ({ insert: `k${i}` }));
const fns = (n: number): KeypadKey[] => Array.from({ length: n }, (_, i) => ({ insert: `f${i}`, fn: 'degrees' as const }));
const sizes = (rows: KeypadKey[][]) => rows.map((row) => row.length);

describe('keypadRows', () => {
  it('keeps the base keys in their two rows of seven', () => {
    expect(sizes(keypadRows(plain(14), []))).toEqual([7, 7]);
  });

  it('balances topic keys rather than stranding a short last row', () => {
    expect(sizes(keypadRows(plain(14), plain(9)))).toEqual([7, 7, 5, 4]);
    expect(sizes(keypadRows(plain(14), plain(8)))).toEqual([7, 7, 4, 4]);
    expect(sizes(keypadRows(plain(14), plain(7)))).toEqual([7, 7, 7]);
  });

  it('groups function keys last, in rows of at most three', () => {
    const rows = keypadRows(plain(14), [...fns(2), ...plain(4), ...fns(4)]);
    expect(sizes(rows)).toEqual([7, 7, 4, 3, 3]);
    expect(rows.slice(3).flat().every((key) => key.fn)).toBe(true);
    expect(sizes(keypadRows(plain(14), fns(4)))).toEqual([7, 7, 2, 2]);
  });

  it('puts one or two stray keys on the last row of function keys, not a row of their own', () => {
    const rows = keypadRows(plain(14), [plain(1)[0], ...fns(6)]);
    expect(sizes(rows)).toEqual([7, 7, 3, 4]);
    expect(rows[3][3].insert).toBe('k0');
    expect(sizes(keypadRows(plain(14), plain(1)))).toEqual([7, 7, 1]);
    expect(sizes(keypadRows(plain(14), [...plain(3), ...fns(3)]))).toEqual([7, 7, 3, 3]);
  });

  it('loses and duplicates nothing', () => {
    const topic = [...TRIG_WORKING_KEYS, { insert: 'pi', label: 'π' }];
    expect(keypadRows(plain(14), topic).flat()).toHaveLength(14 + topic.length);
  });

  it('lays the working keys out as one full row', () => {
    expect(sizes(keypadRows(plain(14), WORKING_KEYS))).toEqual([7, 7, 6]);
    expect(sizes(keypadRows(plain(14), TRIG_WORKING_KEYS))).toEqual([7, 7, 6, 3]);
  });
});
