import { requireAdmin } from '../lib/auth.mjs';
import { createUser, deleteUser, listUsers, updateUser } from '../lib/users.mjs';

export default async (req) => {
  const admin = await requireAdmin(req);
  if (!admin) return Response.json({ error: 'Administrator access required' }, { status: 403 });

  try {
    if (req.method === 'GET') return Response.json({ users: await listUsers() }, { headers: { 'Cache-Control': 'no-store' } });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await req.json();
    if (body.action === 'create') {
      await createUser({ username: body.username, password: body.password, role: body.role });
    } else if (body.action === 'update') {
      await updateUser({ username: body.username, newUsername: body.newUsername, role: body.role, password: body.password });
    } else if (body.action === 'delete') {
      await deleteUser(body.username);
    } else {
      return Response.json({ error: 'Unknown user action' }, { status: 400 });
    }
    return Response.json({ users: await listUsers() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || 'Unable to update users' }, { status: 400 });
  }
};
