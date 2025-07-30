import { Hono } from 'hono';

// This is the entry point for our API worker.
const app = new Hono();

app.get('/api/hello', (c) => {
  return c.json({ hello: 'world' });
});

export default app;
