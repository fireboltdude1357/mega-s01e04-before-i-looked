import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('folds 2026-10-28 into 5 jobs and counts the bad line', () => {
    const n = readNight('runs', '2026-10-28');
    expect(n?.badLines).toBe(1);
    expect(n?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const refresh = n?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(n?.rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(n?.rows.find((r) => r.job === 'digest/render')?.owner).toBeNull();
  });

  it('tells a missing night from an empty one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-02')).toBeNull();
    expect(readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], counts: { ok: 0, retry: 0, fail: 0 }, badLines: 0 });
  });

  it('refuses nights that are not dates', () => {
    expect(readNight('runs', '../package')).toBeNull();
  });
});
