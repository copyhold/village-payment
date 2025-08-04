/// areference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

import type { User, Authenticator } from './auth-types';

// Define the environment bindings
type Env = {
  DB: D1Database;
  RP_ID: string;
  RP_NAME: string;
  RP_ORIGIN: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

// Роут для favicon.ico — отдаёт красную PNG 16x16
app.get('/favicon.ico', (c) => {
  // 16x16 PNG, полностью красный
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAJ0lEQVR42mNgGAWjYBSMglEwCkb9j4j8D8R8j8R8j8R8j8R8j8R8j8R8AAD8xA5f3p0qAAAAAElFTkSuQmCC';
  const buffer = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// Add CORS middleware to allow the frontend to communicate with the API
app.use('/api/*', cors());

/**
 * REGISTRATION - START
 *
 * Generates registration options for a new user.
 */
app.post('/api/register/start', async (c) => {
  const { username } = await c.req.json();

  if (!username) {
    return c.json({ error: 'Username is required' }, 400);
  }

  // Check if user already exists
  const existingUser: User | null = await c.env.DB.prepare(
    'SELECT * FROM users WHERE username = ?1'
  ).bind(username).first();

  if (existingUser) {
    return c.json({ error: 'Username already taken' }, 409);
  }

  const user: User = { id: crypto.randomUUID(), username };

  const options = await generateRegistrationOptions({
    rpName: c.env.RP_NAME,
    rpID: c.env.RP_ID,
    userName: user.username,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: [],
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });

  // Temporarily store the user and challenge
  await c.env.DB.prepare(
    'INSERT INTO users (id, username, current_challenge) VALUES (?1, ?2, ?3)'
  ).bind(user.id, user.username, options.challenge).run();

  return c.json({
    ...options,
    userId: user.id
  });
});

/**
 * REGISTRATION - FINISH
 *
 * Verifies the registration response and saves the new authenticator.
 */
app.post('/api/register/finish', async (c) => {
  const { response, userId } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'User ID is required' }, 400);
  }

  // Find the user by the provided user ID
  const user: User | null = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?1'
  ).bind(userId).first();

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  if (!user.current_challenge) {
    return c.json({ error: 'No registration challenge found for user.' }, 400);
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: response,
      expectedChallenge: user.current_challenge,
      expectedOrigin: c.env.RP_ORIGIN,
      expectedRPID: c.env.RP_ID,
      requireUserVerification: true,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 400);
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;
    const transports = response.response.transports || [];

    const newAuthenticator: Authenticator = {
      user_id: user.id,
      credential_id: credentialID,
      credential_public_key: credentialPublicKey,
      counter,
      transports: transports,
    };

    // Save the new authenticator to the database
    await c.env.DB.prepare(
      'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter, transports) VALUES (?1, ?2, ?3, ?4, ?5)'
    ).bind(
      newAuthenticator.user_id,
      newAuthenticator.credential_id,
      newAuthenticator.credential_public_key,
      newAuthenticator.counter,
      JSON.stringify(newAuthenticator.transports) // Store transports as a JSON string
    ).run();

    // Clear the challenge
    await c.env.DB.prepare(
      'UPDATE users SET current_challenge = NULL WHERE id = ?1'
    ).bind(user.id).run();

    return c.json({ verified });
  }

  return c.json({ error: 'Registration verification failed.' }, 400);
});


/**
 * AUTHENTICATION - START
 *
 * Generates authentication options for a user.
 */
app.post('/api/login/start', async (c) => {
  const { username } = await c.req.json();

  if (!username) {
    return c.json({ error: 'Username is required' }, 400);
  }

  const user: User | null = await c.env.DB.prepare(
    'SELECT * FROM users WHERE username = ?1'
  ).bind(username).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

    const { results: userAuthenticators } = await c.env.DB.prepare(
    'SELECT * FROM authenticators WHERE user_id = ?1'
  ).bind(user.id).all<Authenticator>();

  const options = await generateAuthenticationOptions({
    rpID: c.env.RP_ID,
    allowCredentials: userAuthenticators.map(auth => ({
      id: auth.credential_id,
      type: 'public-key',
      transports: auth.transports ? JSON.parse(auth.transports as string) : undefined,
    })),
    userVerification: 'required',
  });

  // Store the challenge
  await c.env.DB.prepare(
    'UPDATE users SET current_challenge = ?1 WHERE id = ?2'
  ).bind(options.challenge, user.id).run();

  return c.json({
    ...options,
    userId: user.id
  });
});

/**
 * AUTHENTICATION - FINISH
 *
 * Verifies the authentication response.
 */
app.post('/api/login/finish', async (c) => {
  const { response, userId } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'User ID is required' }, 400);
  }

  const user: User | null = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?1'
  ).bind(userId).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (!user.current_challenge) {
    return c.json({ error: 'No login challenge found for user.' }, 400);
  }

  // Find the authenticator that the user is trying to use
  const authenticator: Authenticator | null = await c.env.DB.prepare(
    'SELECT * FROM authenticators WHERE credential_id = ?1 AND user_id = ?2'
  ).bind(response.id, user.id).first();

  if (!authenticator) {
    return c.json({ error: 'Authenticator not found' }, 404);
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: response,
      expectedChallenge: user.current_challenge,
      expectedOrigin: c.env.RP_ORIGIN,
      expectedRPID: c.env.RP_ID,
      authenticator: {
        ...authenticator,
        credentialID: authenticator.credential_id,
        credentialPublicKey: authenticator.credential_public_key,
      },
      requireUserVerification: true,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 400);
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    // Update the authenticator counter
    await c.env.DB.prepare(
      'UPDATE authenticators SET counter = ?1 WHERE credential_id = ?2'
    ).bind(authenticationInfo.newCounter, authenticator.credential_id).run();

    // Clear the challenge
    await c.env.DB.prepare(
      'UPDATE users SET current_challenge = NULL WHERE id = ?1'
    ).bind(user.id).run();

    // Generate JWT token
    const payload = {
      sub: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
      iat: Math.floor(Date.now() / 1000),
    };

    const token = await sign(payload, c.env.JWT_SECRET);

    // Set JWT as HTTP-only cookie
    const response = c.json({ verified: true });
    response.headers.set('Set-Cookie', `jwt=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 7}`);

    return response;
  }

  return c.json({ error: 'Authentication failed' }, 400);
});

// JWT middleware to verify authentication
const jwtMiddleware = async (c: any, next: any) => {
  const jwt = c.req.header('Authorization')?.replace('Bearer ', '') || 
              getCookie(c, 'jwt');

  if (!jwt) {
    return c.json({ error: 'No JWT token provided' }, 401);
  }

  try {
    const payload = await verify(jwt, c.env.JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid JWT token' }, 401);
  }
};

// Protected route example
app.get('/api/me', jwtMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ 
    id: user.sub, 
    username: user.username 
  });
});

// Logout endpoint
app.post('/api/logout', async (c) => {
  const response = c.json({ message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', 'jwt=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
  return response;
});

/**
 * FAMILY MANAGEMENT - Update family settings
 */
app.put('/api/family/settings', jwtMiddleware, async (c) => {
  const user = c.get('user');
  const { family_number, surname } = await c.req.json();

  if (!family_number || !surname) {
    return c.json({ error: 'Family number and surname are required' }, 400);
  }

  // Check if family number is already taken by another user
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE family_number = ?1 AND id != ?2'
  ).bind(family_number, user.sub).first();

  if (existingUser) {
    return c.json({ error: 'Family number already taken by another user' }, 409);
  }

  // Update user's family settings
  await c.env.DB.prepare(
    'UPDATE users SET family_number = ?1, surname = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3'
  ).bind(family_number, surname, user.sub).run();

  return c.json({ 
    message: 'Family settings updated successfully',
    family_number,
    surname
  });
});

/**
 * FAMILY MANAGEMENT - Get family settings
 */
app.get('/api/family/settings', jwtMiddleware, async (c) => {
  const user = c.get('user');

  const userData = await c.env.DB.prepare(
    'SELECT family_number, surname, default_limit FROM users WHERE id = ?1'
  ).bind(user.sub).first();

  return c.json({
    family_number: userData?.family_number || null,
    surname: userData?.surname || null,
    default_limit: userData?.default_limit || 50.00
  });
});

/**
 * FAMILY MANAGEMENT - Update spending limits
 */
app.put('/api/family/limits', jwtMiddleware, async (c) => {
  const user = c.get('user');
  const { default_limit } = await c.req.json();

  if (typeof default_limit !== 'number' || default_limit < 0) {
    return c.json({ error: 'Default limit must be a positive number' }, 400);
  }

  await c.env.DB.prepare(
    'UPDATE users SET default_limit = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2'
  ).bind(default_limit, user.sub).run();

  return c.json({ 
    message: 'Spending limit updated successfully',
    default_limit
  });
});

/**
 * VENDOR OPERATIONS - Submit payment request
 */
app.post('/api/vendor/payment-request', jwtMiddleware, async (c) => {
  const vendor = c.get('user');
  const { family_number, surname, amount, description } = await c.req.json();

  if (!family_number || !surname || !amount) {
    return c.json({ error: 'Family number, surname, and amount are required' }, 400);
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return c.json({ error: 'Amount must be a positive number' }, 400);
  }

  // Validate family number and surname combination
  const family = await c.env.DB.prepare(
    'SELECT id, default_limit FROM users WHERE family_number = ?1 AND surname = ?2'
  ).bind(family_number, surname).first();

  if (!family) {
    return c.json({ error: 'Invalid family number or surname' }, 404);
  }

  // Check vendor-specific limit first, then default limit
  const vendorLimit = await c.env.DB.prepare(
    'SELECT limit_amount FROM vendor_limits WHERE family_number = ?1 AND vendor_id = ?2'
  ).bind(family_number, vendor.sub).first();

  const applicableLimit = vendorLimit?.limit_amount || family.default_limit || 50.00;

  // Create transaction
  const transaction = await c.env.DB.prepare(
    'INSERT INTO transactions (family_number, vendor_id, amount, description) VALUES (?1, ?2, ?3, ?4) RETURNING id'
  ).bind(family_number, vendor.sub, amount, description || null).first();

  const transactionId = transaction?.id;

  if (!transactionId) {
    return c.json({ error: 'Failed to create transaction' }, 500);
  }

  // Cache the surname for future autofill
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO vendor_surname_cache (vendor_id, family_number, surname, updated_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)'
  ).bind(vendor.sub, family_number, surname).run();

  // Check if auto-approval applies
  if (amount <= applicableLimit) {
    // Auto-approve
    await c.env.DB.prepare(
      'UPDATE transactions SET status = "approved", approved_at = CURRENT_TIMESTAMP WHERE id = ?1'
    ).bind(transactionId).run();

    return c.json({
      success: true,
      transaction_id: transactionId,
      message: 'Payment approved automatically',
      requires_approval: false
    });
  } else {
    // Requires approval - will be handled by notification system later
    return c.json({
      success: true,
      transaction_id: transactionId,
      message: 'Payment request submitted, awaiting approval',
      requires_approval: true,
      approval_timeout: 300 // 5 minutes in seconds
    });
  }
});

/**
 * VENDOR OPERATIONS - Get family info and cached surname
 */
app.post('/api/vendor/family-info', jwtMiddleware, async (c) => {
  const vendor = c.get('user');
  const { family_number, vendor_id } = await c.req.json();

  if (!family_number) {
    return c.json({ error: 'Family number is required' }, 400);
  }

  // Get family info
  const family = await c.env.DB.prepare(
    'SELECT surname, default_limit FROM users WHERE family_number = ?1'
  ).bind(family_number).first();

  if (!family) {
    return c.json({ error: 'Family not found' }, 404);
  }

  // Get vendor-specific limit
  const vendorLimit = await c.env.DB.prepare(
    'SELECT limit_amount FROM vendor_limits WHERE family_number = ?1 AND vendor_id = ?2'
  ).bind(family_number, vendor_id).first();

  // Get cached surname for this vendor
  const cached = await c.env.DB.prepare(
    'SELECT surname FROM vendor_surname_cache WHERE vendor_id = ?1 AND family_number = ?2'
  ).bind(vendor_id, family_number).first();

  const applicableLimit = vendorLimit?.limit_amount || family.default_limit || 50.00;

  return c.json({
    surname: cached?.surname || family.surname,
    limit: applicableLimit
  });
});

/**
 * VENDOR OPERATIONS - Get cached surname for family number
 */
app.get('/api/vendor/surname/:family_number', jwtMiddleware, async (c) => {
  const vendor = c.get('user');
  const family_number = c.req.param('family_number');

  const cached = await c.env.DB.prepare(
    'SELECT surname FROM vendor_surname_cache WHERE vendor_id = ?1 AND family_number = ?2'
  ).bind(vendor.sub, family_number).first();

  return c.json({
    surname: cached?.surname || null
  });
});

/**
 * VENDOR OPERATIONS - Get transaction history
 */
app.get('/api/vendor/history', jwtMiddleware, async (c) => {
  const vendor = c.get('user');
  const vendorId = c.req.query('vendorId');

  if (vendorId !== vendor.sub) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  // Get transactions from the last hour
  const transactions = await c.env.DB.prepare(`
    SELECT 
      t.id,
      t.created_at as time,
      t.family_number,
      u.surname,
      t.amount,
      t.status,
      t.description
    FROM transactions t
    LEFT JOIN users u ON t.family_number = u.family_number
    WHERE t.vendor_id = ?1 
    AND t.created_at >= datetime('now', '-1 hour')
    ORDER BY t.created_at DESC
  `).bind(vendor.sub).all();

  return c.json({
    transactions: transactions.results || []
  });
});

export default app;
