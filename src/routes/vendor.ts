import { Hono } from 'hono';
import type { Env } from '../env';
import { jwtMiddleware } from '../middleware/jwt';

export function registerVendorRoutes(app: Hono<{ Bindings: Env }>) {
  // VENDOR OPERATIONS - Submit payment request
  app.post('/api/vendor/payment-request', jwtMiddleware, async (c) => {
    const vendor = c.get('jwtPayload');
    const { family_number, surname, amount, description } = await c.req.json();

    if (!family_number || !surname || !amount) {
      return c.json({ error: 'Family number, surname, and amount are required' }, 400);
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: 'Amount must be a positive number' }, 400);
    }

    const family = await c.env.DB.prepare(
      'SELECT id, default_limit FROM users WHERE family_number = ?1 AND surname = ?2'
    ).bind(family_number, surname).first<{ id: number; default_limit: number | null }>();

    if (!family) {
      return c.json({ error: 'Invalid family number or surname' }, 404);
    }

    const vendorLimit = await c.env.DB.prepare(
      'SELECT limit_amount FROM vendor_limits WHERE family_number = ?1 AND vendor_id = ?2'
    ).bind(family_number, vendor.sub).first<{ limit_amount: number | null }>();

    const applicableLimit = Number(vendorLimit?.limit_amount ?? family.default_limit ?? 50.0);

    const transaction = await c.env.DB.prepare(
      'INSERT INTO transactions (family_number, vendor_id, amount, description) VALUES (?1, ?2, ?3, ?4) RETURNING id'
    ).bind(family_number, vendor.sub, amount, description || null).first();

    const transactionId = (transaction as any)?.id;

    if (!transactionId) {
      return c.json({ error: 'Failed to create transaction' }, 500);
    }

    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO vendor_surname_cache (vendor_id, family_number, surname, updated_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)'
    ).bind(vendor.sub, family_number, surname).run();

    if (amount <= applicableLimit) {
      await c.env.DB.prepare(
        'UPDATE transactions SET status = "approved", approved_at = CURRENT_TIMESTAMP WHERE id = ?1'
      ).bind(transactionId).run();

      return c.json({
        success: true,
        transaction_id: transactionId,
        message: 'Payment approved automatically',
        requires_approval: false,
      });
    } else {
      return c.json({
        success: true,
        transaction_id: transactionId,
        message: 'Payment request submitted, awaiting approval',
        requires_approval: true,
        approval_timeout: 300,
      });
    }
  });

  // VENDOR OPERATIONS - Get family info and cached surname
  app.post('/api/vendor/family-info', jwtMiddleware, async (c) => {
    const { family_number, vendor_id } = await c.req.json();

    if (!family_number) {
      return c.json({ error: 'Family number is required' }, 400);
    }

    const family = await c.env.DB.prepare(
      'SELECT surname, default_limit FROM users WHERE family_number = ?1'
    ).bind(family_number).first<{ surname: string; default_limit: number | null }>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    const vendorLimit = await c.env.DB.prepare(
      'SELECT limit_amount FROM vendor_limits WHERE family_number = ?1 AND vendor_id = ?2'
    ).bind(family_number, vendor_id).first<{ limit_amount: number | null }>();

    const cached = await c.env.DB.prepare(
      'SELECT surname FROM vendor_surname_cache WHERE vendor_id = ?1 AND family_number = ?2'
    ).bind(vendor_id, family_number).first();

    const applicableLimit = Number(vendorLimit?.limit_amount ?? family.default_limit ?? 50.0);

    return c.json({ surname: (cached as any)?.surname || family.surname, limit: applicableLimit });
  });

  // VENDOR OPERATIONS - Get cached surname for family number
  app.get('/api/vendor/surname/:family_number', jwtMiddleware, async (c) => {
    const vendor = c.get('jwtPayload');
    const family_number = c.req.param('family_number');

    const cached = await c.env.DB.prepare(
      'SELECT surname FROM vendor_surname_cache WHERE vendor_id = ?1 AND family_number = ?2'
    ).bind(vendor.sub, family_number).first();

    return c.json({ surname: (cached as any)?.surname || null });
  });

  // VENDOR OPERATIONS - Get transaction history
  app.get('/api/vendor/history', jwtMiddleware, async (c) => {
    const vendor = c.get('jwtPayload');
    const vendorId = c.req.query('vendorId');

    if (vendorId !== vendor.sub) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // First, get a single surname for each family_number to avoid duplicates
    const transactions = await c.env.DB.prepare(`
      WITH family_surnames AS (
        SELECT family_number, MIN(surname) as surname
        FROM users
        WHERE family_number IN (
          SELECT DISTINCT family_number 
          FROM transactions 
          WHERE vendor_id = ?1 
          AND created_at >= datetime('now', '-1 hour')
        )
        GROUP BY family_number
      )
      SELECT 
        t.id,
        t.created_at as time,
        t.family_number,
        fs.surname,
        t.amount,
        t.status,
        t.description
      FROM transactions t
      LEFT JOIN family_surnames fs ON t.family_number = fs.family_number
      WHERE t.vendor_id = ?1 
      AND t.created_at >= datetime('now', '-1 hour')
      GROUP BY t.id  -- Ensure we get unique transactions
      ORDER BY t.created_at DESC
    `).bind(vendor.sub).all();

    return c.json({ transactions: (transactions as any).results || [] });
  });
}
