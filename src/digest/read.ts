import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunLine, RunStatus } from './types.js';

const STATUSES: ReadonlySet<string> = new Set<RunStatus>(['ok', 'retry', 'fail']);
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

// Parses one log line at the edge; anything that isn't a well-formed run line is `null`.
function parseLine(line: string): RunLine | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (typeof o.status !== 'string' || !STATUSES.has(o.status)) return null;
  if (o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return { at: o.at, job: o.job, status: o.status as RunStatus, owner: o.owner, error: o.error };
}

// Folds the night's lines into one row per job, sorted by job. Lines are taken in file order.
export function digest(lines: RunLine[]): DigestRow[] {
  const rows = new Map<string, DigestRow>();
  for (const l of lines) {
    const r = rows.get(l.job);
    if (!r) {
      rows.set(l.job, {
        job: l.job,
        owner: l.owner,
        runs: 1,
        retries: l.status === 'retry' ? 1 : 0,
        lastStatus: l.status,
        lastError: l.error ?? null,
        firstAt: l.at,
        lastAt: l.at,
      });
      continue;
    }
    r.runs += 1;
    if (l.status === 'retry') r.retries += 1;
    r.owner = l.owner ?? r.owner;
    r.lastStatus = l.status;
    r.lastError = l.error ?? null;
    r.lastAt = l.at;
  }
  return [...rows.values()].sort((a, b) => a.job.localeCompare(b.job));
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const lines: RunLine[] = [];
  let badLines = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line) lines.push(line);
    else badLines += 1;
  }
  const counts: Record<RunStatus, number> = { ok: 0, retry: 0, fail: 0 };
  for (const l of lines) counts[l.status] += 1;
  return { night, rows: digest(lines), counts, badLines };
};
