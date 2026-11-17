// The digest's contract (plan morning-digest § 1). Section 2 builds against these types only.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One job's night, folded from its lines. Times keep the log's offset.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// `null` when the night has no file on disk; an empty file gives `rows: []`.
export type Night = {
  night: string;
  rows: DigestRow[];
  // Lines per status across the night, for the board's ok / retry / fail counts.
  counts: Record<RunStatus, number>;
  badLines: number;
};

export type ReadNight = (runsDir: string, night: string) => Night | null;
