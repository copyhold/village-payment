/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
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
  DBAUTH: D1Database;
  RP_ID: string;
  RP_NAME: string;
  RP_ORIGIN: string;
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
  const existingUser: User | null = await c.env.DBAUTH.prepare(
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
    userID: user.id,
    attestationType: 'none',
    excludeCredentials: [],
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });

  // Temporarily store the user and challenge
  await c.env.DBAUTH.prepare(
    'INSERT INTO users (id, username, current_challenge) VALUES (?1, ?2, ?3)'
  ).bind(user.id, user.username, options.challenge).run();

  return c.json(options);
});

/**
 * REGISTRATION - FINISH
 *
 * Verifies the registration response and saves the new authenticator.
 */
app.post('/api/register/finish', async (c) => {
  const body: RegistrationResponseJSON = await c.req.json();

  // Find the user by the ID in the registration response
  const user: User | null = await c.env.DBAUTH.prepare(
    'SELECT * FROM users WHERE id = ?1'
  ).bind(body.id).first();

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  if (!user.current_challenge) {
    return c.json({ error: 'No registration challenge found for user.' }, 400);
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
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
    const transports = body.response.transports || [];

    const newAuthenticator: Authenticator = {
      user_id: user.id,
      credential_id: credentialID,
      credential_public_key: credentialPublicKey,
      counter,
      transports: transports,
    };

    // Save the new authenticator to the database
    await c.env.DBAUTH.prepare(
      'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter, transports) VALUES (?1, ?2, ?3, ?4, ?5)'
    ).bind(
      newAuthenticator.user_id,
      newAuthenticator.credential_id,
      newAuthenticator.credential_public_key,
      newAuthenticator.counter,
      JSON.stringify(newAuthenticator.transports) // Store transports as a JSON string
    ).run();

    // Clear the challenge
    await c.env.DBAUTH.prepare(
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

  const user: User | null = await c.env.DBAUTH.prepare(
    'SELECT * FROM users WHERE username = ?1'
  ).bind(username).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

    const { results: userAuthenticators } = await c.env.DBAUTH.prepare(
    'SELECT * FROM authenticators WHERE user_id = ?1'
  ).bind(user.id).all<Authenticator>();

  const options = await generateAuthenticationOptions({
    rpID: c.env.RP_ID,
    allowCredentials: userAuthenticators.map(auth => ({
      id: auth.credential_id,
      type: 'public-key',
      transports: auth.transports,
    })),
    userVerification: 'required',
  });

  // Store the challenge
  await c.env.DBAUTH.prepare(
    'UPDATE users SET current_challenge = ?1 WHERE id = ?2'
  ).bind(options.challenge, user.id).run();

  return c.json(options);
});

/**
 * AUTHENTICATION - FINISH
 *
 * Verifies the authentication response.
 */
app.post('/api/login/finish', async (c) => {
  const body: AuthenticationResponseJSON = await c.req.json();

  const user: User | null = await c.env.DBAUTH.prepare(
    'SELECT * FROM users WHERE id = ?1'
  ).bind(body.id).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (!user.current_challenge) {
    return c.json({ error: 'No login challenge found for user.' }, 400);
  }

  // Find the authenticator that the user is trying to use
  const authenticator: Authenticator | null = await c.env.DBAUTH.prepare(
    'SELECT * FROM authenticators WHERE credential_id = ?1 AND user_id = ?2'
  ).bind(body.id, user.id).first();

  if (!authenticator) {
    return c.json({ error: 'Authenticator not found' }, 404);
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
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
    await c.env.DBAUTH.prepare(
      'UPDATE authenticators SET counter = ?1 WHERE credential_id = ?2'
    ).bind(authenticationInfo.newCounter, authenticator.credential_id).run();

    // Clear the challenge
    await c.env.DBAUTH.prepare(
      'UPDATE users SET current_challenge = NULL WHERE id = ?1'
    ).bind(user.id).run();

    return c.json({ verified });
  }

  return c.json({ error: 'Authentication failed' }, 400);
});

export default app;
