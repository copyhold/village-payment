import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

import type { Env } from '../env';
import type { User, Authenticator } from '../auth-types';
import { jwtMiddleware } from '../middleware/jwt';
import { getOrigin, getRPID } from '../worker';

export function registerAuthRoutes(app: Hono<{ Bindings: Env }>) {
  // REGISTRATION - START
  app.post('/api/register/start', async (c) => {
    const { username } = await c.req.json();

    if (!username) {
      return c.json({ error: 'Username is required' }, 400);
    }

    const existingUser: User | null = await c.env.DB.prepare(
      'SELECT * FROM users WHERE username = ?1'
    ).bind(username).first();

    if (existingUser) {
      return c.json({ error: 'Username already taken' }, 409);
    }

    const user: User = { id: crypto.randomUUID(), username } as any;

    const options = await generateRegistrationOptions({
      rpName: c.env.RP_NAME,
      rpID: getRPID(c),
      userName: user.username,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: [],
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    await c.env.DB.prepare(
      'INSERT INTO users (id, username, current_challenge) VALUES (?1, ?2, ?3)'
    ).bind(user.id, user.username, options.challenge).run();

    return c.json({ ...options, userId: user.id });
  });

  // REGISTRATION - FINISH
  app.post('/api/register/finish', async (c) => {
    const { response, userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

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
        expectedOrigin: getOrigin(c),
        expectedRPID: getRPID(c),
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
      } as any;

      await c.env.DB.prepare(
        'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter, transports) VALUES (?1, ?2, ?3, ?4, ?5)'
      ).bind(
        newAuthenticator.user_id,
        newAuthenticator.credential_id,
        newAuthenticator.credential_public_key,
        newAuthenticator.counter,
        JSON.stringify(newAuthenticator.transports)
      ).run();

      await c.env.DB.prepare(
        'UPDATE users SET current_challenge = NULL WHERE id = ?1'
      ).bind(user.id).run();

      return c.json({ verified });
    }

    return c.json({ error: 'Registration verification failed.' }, 400);
  });

  // AUTHENTICATION - START
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
      rpID: getRPID(c),
      allowCredentials: userAuthenticators.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports as string) : undefined,
      })),
      userVerification: 'required',
    });

    await c.env.DB.prepare(
      'UPDATE users SET current_challenge = ?1 WHERE id = ?2'
    ).bind(options.challenge, user.id).run();

    return c.json({ ...options, userId: user.id });
  });

  // AUTHENTICATION - FINISH
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
        expectedOrigin: getOrigin(c),
        expectedRPID: getRPID(c),
        authenticator: {
          ...authenticator,
          credentialID: (authenticator as any).credential_id,
          credentialPublicKey: (authenticator as any).credential_public_key,
        } as any,
        requireUserVerification: true,
      });
    } catch (error) {
      console.error(error);
      return c.json({ error: (error as Error).message }, 400);
    }

    const { verified, authenticationInfo } = verification as any;

    if (verified) {
      await c.env.DB.prepare(
        'UPDATE authenticators SET counter = ?1 WHERE credential_id = ?2'
      ).bind(authenticationInfo.newCounter, (authenticator as any).credential_id).run();

      await c.env.DB.prepare(
        'UPDATE users SET current_challenge = NULL WHERE id = ?1'
      ).bind(user.id).run();

      const payload = {
        sub: user.id,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
        iat: Math.floor(Date.now() / 1000),
      } as const;

      const token = await sign(payload, c.env.JWT_SECRET);

      const res = c.json({ verified: true });
      res.headers.set('Set-Cookie', `jwt=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 7}`);
      return res;
    }

    return c.json({ error: 'Authentication failed' }, 400);
  });

  // Protected route example
  app.get('/api/me', jwtMiddleware, async (c) => {
    const user = c.get('jwtPayload');
    return c.json({ id: user.sub, username: user.username });
  });

  // Logout endpoint
  app.post('/api/logout', async (c) => {
    const response = c.json({ message: 'Logged out successfully' });
    response.headers.set('Set-Cookie', 'jwt=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
    return response;
  });
}
