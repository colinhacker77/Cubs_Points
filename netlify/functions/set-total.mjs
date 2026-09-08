import { requireUser } from '../lib/auth.mjs';
import { mutateState, SIXES, leaderState, currentTermData, recordUndo } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const { six, value } = await req.json();
    const nextValue = Number(value);
    if (!SIXES.includes(six) || !Number.isFinite(nextValue) || nextValue < 0 || !Number.isInteger(nextValue)) {
      return Response.json({ error: 'Invalid total' }, { status: 400 });
    }
    const state = await mutateState((next) => {
      const term = currentTermData(next);
      const before = Number(term.working[six] || 0);
      if (before !== nextValue) {
        recordUndo(next, {
          summary: `${six[0].toUpperCase() + six.slice(1)} total changed from ${before} to ${nextValue}`,
          changedBy: user.username
        });
        term.working[six] = nextValue;
        next.lastChangedBy = user.username;
      }
    });
    return Response.json(leaderState(state));
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to set points total' }, { status: 500 });
  }
};
