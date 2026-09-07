import crypto from 'node:crypto';
import { findUser } from './users.mjs';

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function authSecret() {
  const secret = Netlify.env.get('AUTH_SECRET');
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return secret;
}

function sign(message) {
  return crypto.createHmac('sha256', authSecret()).update(message).digest('base64url');
}

export function createToken(user) {
  const payload = {
    sub: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  let expected;
  try { expected = sign(body); } catch { return null; }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireUser(req) {
  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const payload = verifyToken(header.slice(7));
  if (!payload) return null;
  const user = await findUser(payload.sub);
  if (!user) return null;
  return { username: user.username, role: user.role };
}

export async function requireAdmin(req) {
  const user = await requireUser(req);
  return user?.role === 'admin' ? user : null;
}
