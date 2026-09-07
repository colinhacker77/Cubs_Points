import { getPersistentStore } from './blob-store.mjs';

export const SIXES = ['red', 'yellow', 'purple', 'blue'];
const STORE_NAME = 'cub-points';
const STATE_KEY = 'state';

export const initialState = () => ({
  published: { red: 0, yellow: 0, purple: 0, blue: 0 },
  working: { red: 0, yellow: 0, purple: 0, blue: 0 },
  updatedAt: new Date().toISOString(),
  publishedAt: null,
  lastChangedBy: null,
  lastPublishedBy: null,
  lastResetBy: null,
  lastResetAt: null
});

export async function getState() {
  const s = getPersistentStore(STORE_NAME);
  const existing = await s.get(STATE_KEY, { type: 'json' });
  if (existing) return existing;
  const state = initialState();
  await s.setJSON(STATE_KEY, state);
  return state;
}

export async function mutateState(mutator) {
  const s = getPersistentStore(STORE_NAME);
  const state = await getState();
  const next = structuredClone(state);
  mutator(next);
  next.updatedAt = new Date().toISOString();
  await s.setJSON(STATE_KEY, next);
  return next;
}

export function publicState(state) {
  return { points: state.published, publishedAt: state.publishedAt };
}

export function leaderState(state) {
  return {
    working: state.working,
    published: state.published,
    updatedAt: state.updatedAt,
    publishedAt: state.publishedAt,
    lastChangedBy: state.lastChangedBy,
    lastPublishedBy: state.lastPublishedBy,
    lastResetBy: state.lastResetBy,
    lastResetAt: state.lastResetAt
  };
}
