import { requireAdmin } from '../lib/auth.mjs';
import { mutateState, leaderState } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const admin = await requireAdmin(req);
  if (!admin) return Response.json({ error: 'Administrator access required' }, { status: 403 });

  try {
    const now = new Date().toISOString();
    const state = await mutateState((next) => {
      next.working = { red: 0, yellow: 0, purple: 0, blue: 0 };
      next.published = { red: 0, yellow: 0, purple: 0, blue: 0 };
      next.publishedAt = now;
      next.lastChangedBy = admin.username;
      next.lastPublishedBy = admin.username;
      next.lastResetBy = admin.username;
      next.lastResetAt = now;
    });
    return Response.json(leaderState(state));
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to reset points' }, { status: 500 });
  }
};
