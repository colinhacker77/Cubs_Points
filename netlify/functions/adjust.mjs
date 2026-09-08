import { requireUser } from '../lib/auth.mjs';
import { mutateState, SIXES, leaderState, currentTermData, recordUndo } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const { six, delta } = await req.json();
    if (!SIXES.includes(six) || ![-1, 1].includes(Number(delta))) return Response.json({ error: 'Invalid adjustment' }, { status: 400 });
    const state = await mutateState((next) => {
      const term = currentTermData(next);
      const before = Number(term.working[six] || 0);
      const after = Math.max(0, before + Number(delta));
      if (after !== before) {
        recordUndo(next, {
          summary: `${six[0].toUpperCase() + six.slice(1)} points changed from ${before} to ${after}`,
          changedBy: user.username
        });
        term.working[six] = after;
        next.lastChangedBy = user.username;
      }
    });
    return Response.json(leaderState(state));
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to adjust points' }, { status: 500 });
  }
};
