import { requireUser } from '../lib/auth.mjs';
import { getState, mutateState, leaderState, undoLastChange, TERM_LABELS } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const current = await getState();
    const last = current.terms[current.currentTerm]?.undoHistory?.at(-1);
    if (!last) {
      return Response.json({ error: `There is nothing to undo in the ${TERM_LABELS[current.currentTerm]} term`, ...leaderState(current) }, { status: 409 });
    }

    let undone = null;
    const state = await mutateState((next) => {
      undone = undoLastChange(next);
      next.lastChangedBy = user.username;
    });

    return Response.json({
      ...leaderState(state),
      undone: {
        summary: undone?.summary || 'Previous points change',
        changedBy: undone?.changedBy || null,
        changedAt: undone?.changedAt || null,
        undoneBy: user.username
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to undo the last change' }, { status: 500 });
  }
};
