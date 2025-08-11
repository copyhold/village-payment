import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';

export const jwtMiddleware = async (c: any, next: any) => {
  const jwt = c.req.header('Authorization')?.replace('Bearer ', '') || getCookie(c, 'jwt');

  if (!jwt) {
    return c.json({ error: 'No JWT token provided' }, 401);
  }

  try {
    const payload = await verify(jwt, c.env.JWT_SECRET as string);
    c.set('jwtPayload', payload);
    await next();
  } catch (_err) {
    return c.json({ error: 'Invalid JWT token' }, 401);
  }
};
