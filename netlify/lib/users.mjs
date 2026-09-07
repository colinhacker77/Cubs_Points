import crypto from 'node:crypto';
import { getPersistentStore } from './blob-store.mjs';

const STORE_NAME = 'cub-users';
const USERS_KEY = 'users';

function normaliseUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function validateUsername(value) {
  const username = normaliseUsername(value);
  if (!/^[a-z0-9._-]{2,32}$/.test(username)) {
    throw new Error('Usernames must be 2–32 characters using letters, numbers, dot, underscore or hyphen.');
  }
  return username;
}

export function hashPassword(password) {
  const clean = String(password || '');
  if (clean.length < 8) throw new Error('Password must be at least 8 characters.');
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(clean, salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export function verifyPassword(password, encoded) {
  const [scheme, salt, storedHex] = String(encoded || '').split('$');
  if (scheme !== 'scrypt' || !salt || !storedHex) return false;
  const derived = crypto.scryptSync(String(password || ''), salt, 64);
  const stored = Buffer.from(storedHex, 'hex');
  return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
}

function publicUser(user) {
  return {
    username: user.username,
    role: user.role,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null
  };
}

function makeAdmin() {
  const password = Netlify.env.get('ADMIN_PASSWORD');
  if (!password) throw new Error('ADMIN_PASSWORD is not configured');
  const now = new Date().toISOString();
  return {
    username: 'admin',
    role: 'admin',
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now
  };
}

function importLegacyUsers(users) {
  const raw = Netlify.env.get('LEADER_USERS');
  if (!raw) return;
  try {
    const legacy = JSON.parse(raw);
    for (const [name, passwordHash] of Object.entries(legacy || {})) {
      const username = normaliseUsername(name);
      if (!username || users[username] || !String(passwordHash).startsWith('scrypt$')) continue;
      const now = new Date().toISOString();
      users[username] = { username, role: username === 'admin' ? 'admin' : 'leader', passwordHash, createdAt: now, updatedAt: now };
    }
  } catch {
    // Ignore malformed legacy configuration. The new Blob-backed user store remains authoritative.
  }
}

export async function getUsersRecord() {
  const s = getPersistentStore(STORE_NAME);
  let record = await s.get(USERS_KEY, { type: 'json' });
  if (record?.users) return record;

  const users = {};
  importLegacyUsers(users);
  if (!users.admin) users.admin = makeAdmin();
  record = { users, updatedAt: new Date().toISOString() };
  await s.setJSON(USERS_KEY, record);
  return record;
}

async function saveUsersRecord(record) {
  record.updatedAt = new Date().toISOString();
  await getPersistentStore(STORE_NAME).setJSON(USERS_KEY, record);
  return record;
}

export async function findUser(username) {
  const key = normaliseUsername(username);
  if (!key) return null;
  const record = await getUsersRecord();
  return record.users[key] || null;
}

export async function authenticateUser(username, password) {
  const user = await findUser(username);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return publicUser(user);
}

export async function listUsers() {
  const record = await getUsersRecord();
  return Object.values(record.users)
    .map(publicUser)
    .sort((a, b) => (a.username === 'admin' ? -1 : b.username === 'admin' ? 1 : a.username.localeCompare(b.username)));
}

export async function createUser({ username, password, role = 'leader' }) {
  const key = validateUsername(username);
  const cleanRole = role === 'admin' ? 'admin' : 'leader';
  const record = await getUsersRecord();
  if (record.users[key]) throw new Error('That username already exists.');
  const now = new Date().toISOString();
  record.users[key] = { username: key, role: cleanRole, passwordHash: hashPassword(password), createdAt: now, updatedAt: now };
  await saveUsersRecord(record);
  return publicUser(record.users[key]);
}

export async function updateUser({ username, newUsername, role, password }) {
  const key = validateUsername(username);
  const record = await getUsersRecord();
  const existing = record.users[key];
  if (!existing) throw new Error('User not found.');

  let targetKey = key;
  if (newUsername !== undefined && normaliseUsername(newUsername) !== key) {
    if (key === 'admin') throw new Error('The admin username cannot be changed.');
    targetKey = validateUsername(newUsername);
    if (record.users[targetKey]) throw new Error('That username already exists.');
  }

  if (role !== undefined) {
    if (key === 'admin' && role !== 'admin') throw new Error('The admin account must remain an administrator.');
    existing.role = role === 'admin' ? 'admin' : 'leader';
  }
  if (password !== undefined && String(password).length) existing.passwordHash = hashPassword(password);
  existing.username = targetKey;
  existing.updatedAt = new Date().toISOString();

  if (targetKey !== key) {
    delete record.users[key];
    record.users[targetKey] = existing;
  }
  await saveUsersRecord(record);
  return publicUser(existing);
}

export async function deleteUser(username) {
  const key = validateUsername(username);
  if (key === 'admin') throw new Error('The admin account cannot be removed.');
  const record = await getUsersRecord();
  if (!record.users[key]) throw new Error('User not found.');
  delete record.users[key];
  await saveUsersRecord(record);
}
