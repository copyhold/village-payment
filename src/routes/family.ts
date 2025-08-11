import { Hono } from 'hono';
import type { Env } from '../env';
import { jwtMiddleware } from '../middleware/jwt';

export function registerFamilyRoutes(app: Hono<{ Bindings: Env }>) {
  // FAMILY MANAGEMENT - Update family settings
  app.put('/api/family/settings', jwtMiddleware, async (c) => {
    const user = c.get('jwtPayload');
    const { family_number, surname } = await c.req.json();

    if (!family_number || !surname) {
      return c.json({ error: 'Family number and surname are required' }, 400);
    }

    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE family_number = ?1 AND id != ?2'
    ).bind(family_number, user.sub).first();

    if (existingUser) {
      return c.json({ error: 'Family number already taken by another user' }, 409);
    }

    await c.env.DB.prepare(
      'UPDATE users SET family_number = ?1, surname = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3'
    ).bind(family_number, surname, user.sub).run();

    return c.json({ message: 'Family settings updated successfully', family_number, surname });
  });

  // FAMILY MANAGEMENT - Get family settings
  app.get('/api/family/settings', jwtMiddleware, async (c) => {
    const user = c.get('jwtPayload');

    const userData = await c.env.DB.prepare(
      'SELECT family_number, surname, default_limit FROM users WHERE id = ?1'
    ).bind(user.sub).first();

    return c.json({
      family_number: userData?.family_number || null,
      surname: userData?.surname || null,
      default_limit: userData?.default_limit || 50.0,
    });
  });

  // FAMILY MANAGEMENT - Update spending limits
  app.put('/api/family/limits', jwtMiddleware, async (c) => {
    const user = c.get('jwtPayload');
    const { default_limit } = await c.req.json();

    if (typeof default_limit !== 'number' || default_limit < 0) {
      return c.json({ error: 'Default limit must be a positive number' }, 400);
    }

    await c.env.DB.prepare(
      'UPDATE users SET default_limit = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2'
    ).bind(default_limit, user.sub).run();

    return c.json({ message: 'Spending limit updated successfully', default_limit });
  });
}
