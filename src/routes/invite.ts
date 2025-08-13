import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

import type { Env } from '../env';
import type { User } from '../auth-types';
import { jwtMiddleware } from '../middleware/jwt';
import { getOrigin, getRPID } from '../worker';

export function registerInviteRoutes(app: Hono<{ Bindings: Env }>) {
  // INVITE - CREATE
  app.post('/api/invite/create', jwtMiddleware, async (c) => {
    const user = c.get('jwtPayload');

    const userData = await c.env.DB.prepare(
      'SELECT family_number, surname FROM users WHERE id = ?1'
    ).bind(user.sub).first();

    if (!userData?.family_number || !userData?.surname) {
      return c.json({ error: 'Family settings must be configured before creating invites' }, 400);
    }

    const token = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

    try {
      await c.env.DB.prepare(
        'INSERT INTO one_time_links (user_id, token, expires_at, used) VALUES (?1, ?2, ?3, ?4)'
      ).bind(user.sub, token, expiresAt, false).run();

      const inviteUrl = `${getOrigin(c)}/invite?token=${token}`;
      return c.json({ success: true, inviteUrl, token, expiresAt });
    } catch (_err) {
      return c.json({ error: 'Failed to create invite link' }, 500);
    }
  });

  // INVITE - VALIDATE
  app.get('/api/invite/validate/:token', async (c) => {
    const token = c.req.param('token');
    if (!token) return c.json({ error: 'Token is required' }, 400);

    try {
      const link = await c.env.DB.prepare(`
        SELECT otl.*, u.family_number, u.surname 
        FROM one_time_links otl
        JOIN users u ON otl.user_id = u.id
        WHERE otl.token = ?1 AND otl.used = 0 AND otl.expires_at > ?2
      `).bind(token, Math.floor(Date.now() / 1000)).first();

      if (!link) return c.json({ error: 'Invalid or expired invite link' }, 400);

      return c.json({ valid: true, family_number: (link as any).family_number, surname: (link as any).surname, expiresAt: (link as any).expires_at });
    } catch (_err) {
      return c.json({ error: 'Failed to validate invite link' }, 500);
    }
  });

  // INVITE - START REGISTRATION
  app.post('/api/invite/start', async (c) => {
    const { token, username } = await c.req.json();

    if (!token || !username) {
      return c.json({ error: 'Token and username are required' }, 400);
    }

    try {
      const link = await c.env.DB.prepare(`
        SELECT otl.*, u.family_number, u.surname 
        FROM one_time_links otl
        JOIN users u ON otl.user_id = u.id
        WHERE otl.token = ?1 AND otl.used = 0 AND otl.expires_at > ?2
      `).bind(token, Math.floor(Date.now() / 1000)).first();

      if (!link) {
        return c.json({ error: 'Invalid or expired invite link' }, 400);
      }

      const existingUser = await c.env.DB.prepare(
        'SELECT * FROM users WHERE username = ?1'
      ).bind(username).first();

      if (existingUser) {
        return c.json({ error: 'Username already taken' }, 409);
      }

      const newUser: User = { id: crypto.randomUUID(), username } as any;

      const options = await generateRegistrationOptions({
        rpName: c.env.RP_NAME,
        rpID: getRPID(c),
        userName: newUser.username,
        userID: new TextEncoder().encode(newUser.id),
        attestationType: 'none',
        excludeCredentials: [],
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'required',
        },
      });

      await c.env.DB.prepare(
        'INSERT INTO users (id, username, current_challenge, default_limit) VALUES (?1, ?2, ?3, ?4)'
      ).bind(newUser.id, newUser.username, options.challenge, 50.0).run();

      await c.env.DB.prepare(
        'UPDATE one_time_links SET new_user_id = ?1 WHERE token = ?2'
      ).bind(newUser.id, token).run();

      return c.json({ ...options, userId: newUser.id, family_number: (link as any).family_number, surname: (link as any).surname });
    } catch (_err) {
      return c.json({ error: 'Failed to start invite registration' }, 500);
    }
  });

  // INVITE - FINISH REGISTRATION
  app.post('/api/invite/finish', async (c) => {
    const { token, response } = await c.req.json();

    if (!token || !response) {
      return c.json({ error: 'Token and response are required' }, 400);
    }

    try {
      const link = await c.env.DB.prepare(`
        SELECT otl.*, u.family_number, u.surname 
        FROM one_time_links otl
        JOIN users u ON otl.user_id = u.id
        WHERE otl.token = ?1 AND otl.used = 0 AND otl.expires_at > ?2
      `).bind(token, Math.floor(Date.now() / 1000)).first();

      if (!link) {
        return c.json({ error: 'Invalid or expired invite link' }, 400);
      }

      const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind((link as any).new_user_id).first();
      if (!user) return c.json({ error: 'User not found' }, 404);

      const verification = await verifyRegistrationResponse({
        response: response as RegistrationResponseJSON,
        expectedChallenge: (user as any).current_challenge || '',
        expectedOrigin: getOrigin(c),
        expectedRPID: getRPID(c),
      });

      if (!verification.verified) {
        return c.json({ error: 'Registration verification failed' }, 400);
      }

      const { registrationInfo } = verification;
      if (!registrationInfo) return c.json({ error: 'No registration info received' }, 400);
      if (!registrationInfo.credentialID || !registrationInfo.credentialPublicKey || typeof registrationInfo.counter !== 'number') {
        return c.json({ error: 'Invalid registration info' }, 400);
      }

      await c.env.DB.prepare(`
        INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter, transports)
        VALUES (?1, ?2, ?3, ?4, ?5)
      `).bind(
        (user as any).id,
        registrationInfo.credentialID,
        registrationInfo.credentialPublicKey,
        registrationInfo.counter,
        JSON.stringify((response as RegistrationResponseJSON).response?.transports || [])
      ).run();

      await c.env.DB.prepare(
        'UPDATE users SET current_challenge = NULL, family_number = ?1, surname = ?2 WHERE id = ?3'
      ).bind((link as any).family_number, (link as any).surname, (user as any).id).run();

      await c.env.DB.prepare('UPDATE one_time_links SET used = 1 WHERE token = ?1').bind(token).run();

      const jwt = await sign({
        sub: (user as any).id,
        username: (user as any).username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        iat: Math.floor(Date.now() / 1000),
      }, c.env.JWT_SECRET);

      return c.json({
        success: true,
        user: { id: (user as any).id, username: (user as any).username, family_number: (link as any).family_number, surname: (link as any).surname },
        token: jwt,
      });
    } catch (error) {
      console.error('Invite finish error:', error);
      return c.json({ error: 'Failed to complete invite registration', details: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });
}
