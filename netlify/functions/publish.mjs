import { requireUser } from '../lib/auth.mjs';
import { mutateState, leaderState } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const state = await mutateState((next) => {
      next.published = { ...next.working };
      next.publishedAt = new Date().toISOString();
      next.lastPublishedBy = user.username;
    });
    return Response.json(leaderState(state));
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to publish totals' }, { status: 500 });
  }
};
