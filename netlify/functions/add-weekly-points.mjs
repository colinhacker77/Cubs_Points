import { requireUser } from '../lib/auth.mjs';
import { getState, mutateState, SIXES, leaderState } from '../lib/state.mjs';

function londonDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const today = londonDay();
    const current = await getState();

    if (current.lastWeeklyPointsDay === today) {
      return Response.json({
        error: 'Weekly points have already been added today',
        ...leaderState(current)
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    const state = await mutateState((next) => {
      for (const six of SIXES) {
        next.working[six] = Number(next.working[six] || 0) + 10;
      }
      next.lastChangedBy = user.username;
      next.lastWeeklyPointsAt = now;
      next.lastWeeklyPointsBy = user.username;
      next.lastWeeklyPointsDay = today;
    });

    return Response.json({
      ...leaderState(state),
      added: 10
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to add weekly points' }, { status: 500 });
  }
};
