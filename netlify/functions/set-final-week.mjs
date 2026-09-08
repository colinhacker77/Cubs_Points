import { requireAdmin } from '../lib/auth.mjs';
import { mutateState, leaderState } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const admin = await requireAdmin(req);
  if (!admin) return Response.json({ error: 'Administrator access required' }, { status: 403 });

  try {
    const { enabled, year } = await req.json();
    const yearLabel = String(year || '').trim();
    if (yearLabel.length < 2 || yearLabel.length > 16) {
      return Response.json({ error: 'Enter a year label, for example 2026/27' }, { status: 400 });
    }

    const state = await mutateState((next) => {
      next.annualRevealEnabled = Boolean(enabled);
      next.annualRevealYear = yearLabel;
      next.annualRevealChangedBy = admin.username;
      next.annualRevealChangedAt = new Date().toISOString();
    });

    return Response.json(leaderState(state));
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to update final week reveal' }, { status: 500 });
  }
};
