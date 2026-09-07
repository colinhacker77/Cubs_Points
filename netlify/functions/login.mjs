import { createToken } from '../lib/auth.mjs';
import { authenticateUser } from '../lib/users.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const { username, password } = await req.json();
    const user = await authenticateUser(username, password);
    if (!user) return Response.json({ error: 'Invalid username or password' }, { status: 401 });
    return Response.json({ token: createToken(user), username: user.username, role: user.role });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message === 'ADMIN_PASSWORD is not configured' || error.message === 'AUTH_SECRET is not configured' ? 'Login is not configured correctly' : 'Unable to sign in' }, { status: 500 });
  }
};
