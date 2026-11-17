import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// A temp runs dir: runs/ is read-only. It holds the real bad-line night, an empty night, and
// nothing for 2026-01-03.
let app: ReturnType<typeof createApp>;
beforeAll(() => {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
  writeFileSync(join(runsDir, '2026-01-01.jsonl'), '');
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
});

const jobsInPage = (html: string) => [...html.matchAll(/<tr[^>]*><td>([^<]+)<\/td>/g)].map((m) => m[1]);

describe('GET /digest/:night', () => {
  it('renders a night with a bad line, fails and heavy retries marked', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line could not be read');
    expect(html).toMatch(/<tr class="warn"><td>fixtures\/refresh<\/td>/);
    expect(html).toMatch(/<tr class="warn"><td>notes\/backup<\/td>/);
    expect(html).toMatch(/<tr><td>lane\/sync<\/td>/);
    expect(html).toMatch(/<td>digest\/render<\/td><td>—<\/td>/);
  });

  it('renders "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('404s for a night with no file', async () => {
    expect((await app.request('/digest/2026-01-03')).status).toBe(404);
  });
});

describe('GET /api/digest/:night', () => {
  it('has the same jobs in the same order as the page', async () => {
    const page = await (await app.request('/digest/2026-10-28')).text();
    const res = await app.request('/api/digest/2026-10-28');
    const json = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(json.badLines).toBe(1);
    expect(json.rows.map((r) => r.job)).toEqual(jobsInPage(page));
    expect(json.rows).toHaveLength(5);
  });

  it('returns no rows for an empty night and 404 for a missing one', async () => {
    expect(await (await app.request('/api/digest/2026-01-01')).json()).toMatchObject({ rows: [] });
    expect((await app.request('/api/digest/2026-01-03')).status).toBe(404);
  });
});

describe('status board', () => {
  it('links each night on disk to its digest with counts', async () => {
    const html = await (await app.request('/')).text();
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a>');
    expect(html).toContain('ok 10 · retry 4 · fail 1');
    expect(html).toContain('<a href="/digest/2026-01-01">2026-01-01</a>');
  });
});
