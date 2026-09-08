import { getPersistentStore } from './blob-store.mjs';

export const SIXES = ['red', 'yellow', 'purple', 'blue'];
export const TERMS = ['autumn', 'spring', 'summer'];
export const TERM_LABELS = { autumn: 'Autumn', spring: 'Spring', summer: 'Summer' };
const STORE_NAME = 'cub-points';
const STATE_KEY = 'state';

export function zeroPoints() {
  return { red: 0, yellow: 0, purple: 0, blue: 0 };
}

function blankTerm() {
  return {
    working: zeroPoints(),
    published: zeroPoints(),
    publishedAt: null,
    lastWeeklyPointsAt: null,
    lastWeeklyPointsBy: null,
    lastWeeklyPointsDay: null,
    undoHistory: []
  };
}

export const initialState = () => ({
  version: 4,
  currentTerm: 'autumn',
  terms: {
    autumn: blankTerm(),
    spring: blankTerm(),
    summer: blankTerm()
  },
  updatedAt: new Date().toISOString(),
  lastChangedBy: null,
  lastPublishedBy: null,
  lastResetBy: null,
  lastResetAt: null,
  lastTermChangedBy: null,
  lastTermChangedAt: null,
  annualRevealEnabled: false,
  annualRevealYear: String(new Date().getFullYear()),
  annualRevealChangedBy: null,
  annualRevealChangedAt: null
});

function cleanPoints(points = {}) {
  return Object.fromEntries(SIXES.map((six) => [six, Math.max(0, Number(points?.[six] || 0))]));
}

function normaliseTerm(term = {}) {
  return {
    working: cleanPoints(term.working),
    published: cleanPoints(term.published),
    publishedAt: term.publishedAt || null,
    lastWeeklyPointsAt: term.lastWeeklyPointsAt || null,
    lastWeeklyPointsBy: term.lastWeeklyPointsBy || null,
    lastWeeklyPointsDay: term.lastWeeklyPointsDay || null,
    undoHistory: Array.isArray(term.undoHistory) ? term.undoHistory.slice(-20) : []
  };
}

function normaliseState(existing) {
  if (!existing) return initialState();

  if (!existing.terms) {
    // Migrate the original single-term state into Autumn without losing any points.
    const migrated = initialState();
    migrated.terms.autumn = normaliseTerm({
      working: existing.working,
      published: existing.published,
      publishedAt: existing.publishedAt,
      lastWeeklyPointsAt: existing.lastWeeklyPointsAt,
      lastWeeklyPointsBy: existing.lastWeeklyPointsBy,
      lastWeeklyPointsDay: existing.lastWeeklyPointsDay
    });
    migrated.updatedAt = existing.updatedAt || migrated.updatedAt;
    migrated.lastChangedBy = existing.lastChangedBy || null;
    migrated.lastPublishedBy = existing.lastPublishedBy || null;
    migrated.lastResetBy = existing.lastResetBy || null;
    migrated.lastResetAt = existing.lastResetAt || null;
    return migrated;
  }

  const currentTerm = TERMS.includes(existing.currentTerm) ? existing.currentTerm : 'autumn';
  return {
    ...initialState(),
    ...existing,
    version: 4,
    currentTerm,
    terms: Object.fromEntries(TERMS.map((term) => [term, normaliseTerm(existing.terms?.[term])]))
  };
}

export async function getState() {
  const s = getPersistentStore(STORE_NAME);
  const existing = await s.get(STATE_KEY, { type: 'json' });
  const state = normaliseState(existing);
  if (!existing || !existing.terms || existing.version !== 4) {
    await s.setJSON(STATE_KEY, state);
  }
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

function snapshotTerm(term) {
  return {
    working: cleanPoints(term.working),
    published: cleanPoints(term.published),
    publishedAt: term.publishedAt || null,
    lastWeeklyPointsAt: term.lastWeeklyPointsAt || null,
    lastWeeklyPointsBy: term.lastWeeklyPointsBy || null,
    lastWeeklyPointsDay: term.lastWeeklyPointsDay || null
  };
}

export function recordUndo(state, { summary, changedBy, changedAt = new Date().toISOString() }) {
  const term = currentTermData(state);
  const entry = {
    summary,
    changedBy: changedBy || null,
    changedAt,
    snapshot: snapshotTerm(term)
  };
  term.undoHistory = [...(Array.isArray(term.undoHistory) ? term.undoHistory : []), entry].slice(-20);
  return entry;
}

export function undoLastChange(state) {
  const term = currentTermData(state);
  const history = Array.isArray(term.undoHistory) ? [...term.undoHistory] : [];
  const entry = history.pop();
  if (!entry?.snapshot) return null;

  const restored = snapshotTerm(entry.snapshot);
  term.working = restored.working;
  term.published = restored.published;
  term.publishedAt = restored.publishedAt;
  term.lastWeeklyPointsAt = restored.lastWeeklyPointsAt;
  term.lastWeeklyPointsBy = restored.lastWeeklyPointsBy;
  term.lastWeeklyPointsDay = restored.lastWeeklyPointsDay;
  term.undoHistory = history;
  return entry;
}

function undoSummary(term) {
  const last = Array.isArray(term.undoHistory) ? term.undoHistory.at(-1) : null;
  if (!last) return null;
  return {
    summary: last.summary || 'Previous points change',
    changedBy: last.changedBy || null,
    changedAt: last.changedAt || null
  };
}

export function currentTermData(state) {
  return state.terms[state.currentTerm];
}

export function yearlyPublished(state) {
  const totals = zeroPoints();
  for (const term of TERMS) {
    for (const six of SIXES) totals[six] += Number(state.terms[term].published[six] || 0);
  }
  return totals;
}

export function termSummary(state) {
  return Object.fromEntries(TERMS.map((term) => [term, {
    label: TERM_LABELS[term],
    points: { ...state.terms[term].published },
    publishedAt: state.terms[term].publishedAt
  }]));
}

export function publicState(state) {
  const current = currentTermData(state);
  return {
    points: { ...current.published },
    publishedAt: current.publishedAt,
    currentTerm: state.currentTerm,
    currentTermLabel: TERM_LABELS[state.currentTerm],
    terms: termSummary(state),
    yearly: yearlyPublished(state),
    annualRevealEnabled: Boolean(state.annualRevealEnabled),
    annualRevealYear: state.annualRevealYear || String(new Date().getFullYear())
  };
}

export function leaderState(state) {
  const current = currentTermData(state);
  return {
    working: { ...current.working },
    published: { ...current.published },
    updatedAt: state.updatedAt,
    publishedAt: current.publishedAt,
    currentTerm: state.currentTerm,
    currentTermLabel: TERM_LABELS[state.currentTerm],
    terms: termSummary(state),
    yearly: yearlyPublished(state),
    lastChangedBy: state.lastChangedBy,
    lastPublishedBy: state.lastPublishedBy,
    lastResetBy: state.lastResetBy,
    lastResetAt: state.lastResetAt,
    lastWeeklyPointsAt: current.lastWeeklyPointsAt,
    lastWeeklyPointsBy: current.lastWeeklyPointsBy,
    lastWeeklyPointsDay: current.lastWeeklyPointsDay,
    lastUndoableChange: undoSummary(current),
    canUndo: Boolean(current.undoHistory?.length),
    lastTermChangedBy: state.lastTermChangedBy,
    lastTermChangedAt: state.lastTermChangedAt,
    annualRevealEnabled: Boolean(state.annualRevealEnabled),
    annualRevealYear: state.annualRevealYear || String(new Date().getFullYear()),
    annualRevealChangedBy: state.annualRevealChangedBy,
    annualRevealChangedAt: state.annualRevealChangedAt
  };
}
