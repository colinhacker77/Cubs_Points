import { getState, publicState } from '../lib/state.mjs';

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  try {
    const state = await getState();
    return Response.json(publicState(state), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Unable to load points' }, { status: 500 });
  }
};
