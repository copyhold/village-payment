import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { registerAuthRoutes } from './routes/auth';
import { registerFamilyRoutes } from './routes/family';
import { registerVendorRoutes } from './routes/vendor';
import { registerInviteRoutes } from './routes/invite';

// Define the environment bindings via imported type

const app = new Hono<{ Bindings: Env }>();

// Роут для favicon.ico — отдаёт красную PNG 16x16
app.get('/favicon.ico', (c) => {
  // 16x16 PNG, полностью красный
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAJ0lEQVR42mNgGAWjYBSMglEwCkb9j4j8D8R8j8R8j8R8j8R8j8R8j8R8AAD8xA5f3p0qAAAAAElFTkSuQmCC';
  const buffer = Uint8Array.from(atob(pngBase64), (ch) => ch.charCodeAt(0));
  return c.newResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// Add CORS middleware to allow the frontend to communicate with the API
app.use('/api/*', cors());
// Register modular routes
registerAuthRoutes(app);
registerFamilyRoutes(app);
registerVendorRoutes(app);
registerInviteRoutes(app);

export default app;
