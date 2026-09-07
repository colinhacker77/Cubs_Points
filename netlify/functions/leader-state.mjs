import { requireUser } from '../lib/auth.mjs';
import { getState, leaderState } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });
  try {
    const state = await getState();
    return Response.json({ ...leaderState(state), user: user.username, role: user.role }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Unable to load leader state' }, { status: 500 });
  }
};
