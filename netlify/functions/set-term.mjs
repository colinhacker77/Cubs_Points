import { requireAdmin } from '../lib/auth.mjs';
import { mutateState, TERMS, leaderState } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const admin = await requireAdmin(req);
  if (!admin) return Response.json({ error: 'Administrator access required' }, { status: 403 });

  try {
    const { term } = await req.json();
    if (!TERMS.includes(term)) return Response.json({ error: 'Invalid term' }, { status: 400 });
    const now = new Date().toISOString();
    const state = await mutateState((next) => {
      next.currentTerm = term;
      next.lastTermChangedBy = admin.username;
      next.lastTermChangedAt = now;
    });
    return Response.json(leaderState(state));
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to change term' }, { status: 500 });
  }
};
