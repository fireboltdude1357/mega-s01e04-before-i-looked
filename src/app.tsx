import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { DigestPage } from './views/digest.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  // The page and the JSON read the same Night, so they cannot disagree (ADR 0001).
  app.get('/digest/:night', (c) => {
    const night = readNight(config.runsDir, c.req.param('night'));
    const body = night ? <DigestPage night={night} /> : <p class="warn">no run log for this night</p>;
    return c.html(
      <Layout title={`digest · ${c.req.param('night')}`} lane={lane()}>
        {body}
      </Layout>,
      night ? 200 : 404,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const night = readNight(config.runsDir, c.req.param('night'));
    return night ? c.json(night) : c.json({ error: 'no run log for this night' }, 404);
  });

  return app;
}
