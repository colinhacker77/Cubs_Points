const SIXES = {
  red: { label: 'Red', color: '#ef3340' },
  yellow: { label: 'Yellow', color: '#f4c430' },
  purple: { label: 'Purple', color: '#9c3cff' },
  blue: { label: 'Blue', color: '#2f80ed' }
};

const loginCard = document.getElementById('loginCard');
const controlPanel = document.getElementById('controlPanel');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const leaderControls = document.getElementById('leaderControls');
const publishBtn = document.getElementById('publishBtn');
const publishStatus = document.getElementById('publishStatus');
const signedInAs = document.getElementById('signedInAs');
const logoutBtn = document.getElementById('logoutBtn');
const toast = document.getElementById('toast');
const helpBtn = document.getElementById('helpBtn');
const helpDialog = document.getElementById('helpDialog');
const adminPanel = document.getElementById('adminPanel');
const pointsManagementTab = document.getElementById('pointsManagementTab');
const userManagementTab = document.getElementById('userManagementTab');
const pointsManagementPanel = document.getElementById('pointsManagementPanel');
const userManagementPanel = document.getElementById('userManagementPanel');
const openAddUserDialogBtn = document.getElementById('openAddUserDialogBtn');
const addUserDialog = document.getElementById('addUserDialog');
const addUserForm = document.getElementById('addUserForm');
const editUserDialog = document.getElementById('editUserDialog');
const editUserForm = document.getElementById('editUserForm');
const editOriginalUsername = document.getElementById('editOriginalUsername');
const editUsername = document.getElementById('editUsername');
const editPassword = document.getElementById('editPassword');
const editRole = document.getElementById('editRole');
const editUserHint = document.getElementById('editUserHint');
const userList = document.getElementById('userList');
const resetPointsBtn = document.getElementById('resetPointsBtn');
const currentTermLabel = document.getElementById('currentTermLabel');
const termSelect = document.getElementById('termSelect');
const setTermBtn = document.getElementById('setTermBtn');
const termStatus = document.getElementById('termStatus');
const weeklyPointsBtn = document.getElementById('weeklyPointsBtn');
const weeklyPointsStatus = document.getElementById('weeklyPointsStatus');
const undoBtn = document.getElementById('undoBtn');
const undoStatus = document.getElementById('undoStatus');
const annualRevealYear = document.getElementById('annualRevealYear');
const annualRevealSelect = document.getElementById('annualRevealSelect');
const saveAnnualRevealBtn = document.getElementById('saveAnnualRevealBtn');
const annualRevealStatus = document.getElementById('annualRevealStatus');

let token = sessionStorage.getItem('cubLeaderToken') || '';
let username = sessionStorage.getItem('cubLeaderUser') || '';
let role = sessionStorage.getItem('cubLeaderRole') || '';
let working = { red: 0, yellow: 0, purple: 0, blue: 0 };
let currentTerm = 'autumn';
let currentTermName = 'Autumn';

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 1900);
}

function londonDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function updateWeeklyPointsUI(state) {
  const usedToday = state.lastWeeklyPointsDay === londonDay();
  weeklyPointsBtn.disabled = usedToday;
  weeklyPointsBtn.textContent = usedToday ? 'Weekly points added' : 'Add weekly points';

  if (state.lastWeeklyPointsAt) {
    const when = new Date(state.lastWeeklyPointsAt).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    const who = state.lastWeeklyPointsBy ? ` by ${state.lastWeeklyPointsBy}` : '';
    weeklyPointsStatus.textContent = `Last added ${when}${who}.`;
  } else {
    weeklyPointsStatus.textContent = 'Weekly points have not been added yet.';
  }
}

function updateUndoUI(state) {
  const last = state.lastUndoableChange;
  undoBtn.disabled = !state.canUndo || !last;

  if (!last) {
    undoStatus.textContent = `There are no point changes to undo in the ${state.currentTermLabel || currentTermName} term.`;
    undoBtn.dataset.summary = '';
    return;
  }

  const when = last.changedAt
    ? new Date(last.changedAt).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';
  const who = last.changedBy ? ` by ${last.changedBy}` : '';
  undoStatus.textContent = `Will undo: ${last.summary}${who}${when ? ` · ${when}` : ''}.`;
  undoBtn.dataset.summary = last.summary || 'the last points change';
}

function renderControls() {
  leaderControls.replaceChildren(...Object.entries(SIXES).map(([key, six]) => {
    const row = document.createElement('section');
    row.className = 'six-row';
    row.style.setProperty('--six-color', six.color);
    row.innerHTML = `
      <div class="six-name">${six.label}<small>points</small></div>
      <button class="adjust-btn" data-six="${key}" data-delta="-1" aria-label="Remove one point from ${six.label}">−</button>
      <div class="points-cell">
        <button class="points-value points-trigger" type="button" data-value="${key}" data-edit="${key}" aria-label="Set ${six.label} points total">${working[key]}</button>
        <form class="manual-entry hidden" data-entry="${key}">
          <input class="manual-input" name="total" type="number" min="0" step="1" inputmode="numeric" pattern="[0-9]*" value="${working[key]}" aria-label="New ${six.label} points total">
          <button class="manual-action manual-save" type="submit" aria-label="Save ${six.label} points total">✓</button>
          <button class="manual-action manual-cancel" type="button" aria-label="Cancel editing ${six.label} points total">✕</button>
        </form>
      </div>
      <button class="adjust-btn" data-six="${key}" data-delta="1" aria-label="Add one point to ${six.label}">+</button>`;
    return row;
  }));
}

function syncWorkingValues() {
  for (const [key, value] of Object.entries(working)) {
    const display = document.querySelector(`[data-value="${key}"]`);
    if (display) display.textContent = value;
    const input = document.querySelector(`.manual-entry[data-entry="${key}"] .manual-input`);
    if (input && document.activeElement !== input) input.value = value;
  }
}

function closeManualEntry(six) {
  const entry = leaderControls.querySelector(`.manual-entry[data-entry="${six}"]`);
  const trigger = leaderControls.querySelector(`.points-trigger[data-edit="${six}"]`);
  if (entry) entry.classList.add('hidden');
  if (trigger) trigger.classList.remove('hidden');
}

function closeAllManualEntries() {
  leaderControls.querySelectorAll('.manual-entry').forEach((entry) => {
    entry.classList.add('hidden');
  });
  leaderControls.querySelectorAll('.points-trigger').forEach((trigger) => {
    trigger.classList.remove('hidden');
  });
}

function openManualEntry(six) {
  closeAllManualEntries();
  const entry = leaderControls.querySelector(`.manual-entry[data-entry="${six}"]`);
  const trigger = leaderControls.querySelector(`.points-trigger[data-edit="${six}"]`);
  if (!entry || !trigger) return;
  trigger.classList.add('hidden');
  entry.classList.remove('hidden');
  const input = entry.querySelector('.manual-input');
  input.value = working[six] ?? 0;
  input.focus();
  input.select();
}

function showControls() {
  loginCard.classList.add('hidden');
  controlPanel.classList.remove('hidden');
  signedInAs.textContent = `Signed in as ${username}${role === 'admin' ? ' · Admin' : ''}`;
  adminPanel.classList.toggle('hidden', role !== 'admin');
  if (role === 'admin') setAdminView('points');
}

function showLogin() {
  controlPanel.classList.add('hidden');
  loginCard.classList.remove('hidden');
}

function logout() {
  token = '';
  username = '';
  role = '';
  sessionStorage.removeItem('cubLeaderToken');
  sessionStorage.removeItem('cubLeaderUser');
  sessionStorage.removeItem('cubLeaderRole');
  showLogin();
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    logout();
    throw new Error('Your session has expired.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadState() {
  if (!token) return showLogin();
  const data = await apiJson('/api/leader-state', { headers: authHeaders(), cache: 'no-store' });
  working = data.working;
  currentTerm = data.currentTerm || 'autumn';
  currentTermName = data.currentTermLabel || 'Autumn';
  username = data.user || username;
  role = data.role || role;
  sessionStorage.setItem('cubLeaderUser', username);
  sessionStorage.setItem('cubLeaderRole', role);
  renderControls();
  showControls();
  currentTermLabel.textContent = `Current term: ${currentTermName}`;
  if (termSelect) termSelect.value = currentTerm;
  if (termStatus) termStatus.textContent = data.lastTermChangedAt ? `Last changed ${new Date(data.lastTermChangedAt).toLocaleString('en-GB')} by ${data.lastTermChangedBy || 'admin'}` : '';
  if (annualRevealYear) annualRevealYear.value = data.annualRevealYear || String(new Date().getFullYear());
  if (annualRevealSelect) annualRevealSelect.value = data.annualRevealEnabled ? 'on' : 'off';
  if (annualRevealStatus) annualRevealStatus.textContent = data.annualRevealChangedAt ? `Last changed ${new Date(data.annualRevealChangedAt).toLocaleString('en-GB')} by ${data.annualRevealChangedBy || 'admin'}` : 'Annual winner reveal is currently disabled.';
  updateWeeklyPointsUI(data);
  updateUndoUI(data);
  publishStatus.textContent = data.publishedAt
    ? `Last public update: ${new Date(data.publishedAt).toLocaleString('en-GB')}`
    : 'No totals have been published yet.';
  if (role === 'admin') await loadUsers();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginStatus.textContent = 'Signing in…';
  const form = new FormData(loginForm);
  try {
    const data = await apiJson('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.get('username'), password: form.get('password') })
    });
    token = data.token;
    username = data.username;
    role = data.role;
    sessionStorage.setItem('cubLeaderToken', token);
    sessionStorage.setItem('cubLeaderUser', username);
    sessionStorage.setItem('cubLeaderRole', role);
    loginForm.reset();
    loginStatus.textContent = '';
    await loadState();
  } catch (err) {
    loginStatus.textContent = err.message;
  }
});

leaderControls.addEventListener('click', async (event) => {
  const button = event.target.closest('.adjust-btn');
  if (button) {
    button.disabled = true;
    const six = button.dataset.six;
    const delta = Number(button.dataset.delta);
    try {
      const data = await apiJson('/api/adjust', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ six, delta })
      });
      working = data.working;
      syncWorkingValues();
      updateUndoUI(data);
    } catch (err) {
      notify(err.message);
    } finally {
      button.disabled = false;
    }
    return;
  }

  const trigger = event.target.closest('.points-trigger');
  if (trigger) {
    openManualEntry(trigger.dataset.edit);
    return;
  }

  const cancel = event.target.closest('.manual-cancel');
  if (cancel) {
    const form = cancel.closest('.manual-entry');
    if (form) closeManualEntry(form.dataset.entry);
  }
});

leaderControls.addEventListener('submit', async (event) => {
  const form = event.target.closest('.manual-entry');
  if (!form) return;
  event.preventDefault();
  const six = form.dataset.entry;
  const input = form.querySelector('.manual-input');
  const buttons = form.querySelectorAll('button');
  const value = Number(input.value);

  if (!Number.isInteger(value) || value < 0) {
    notify('Enter a whole number of 0 or more');
    input.focus();
    input.select();
    return;
  }

  input.disabled = true;
  buttons.forEach((button) => button.disabled = true);
  try {
    const data = await apiJson('/api/set-total', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ six, value })
    });
    working = data.working;
    syncWorkingValues();
    updateUndoUI(data);
    closeManualEntry(six);
    notify(`${SIXES[six].label} total updated`);
  } catch (err) {
    notify(err.message);
    input.disabled = false;
    buttons.forEach((button) => button.disabled = false);
    input.focus();
    input.select();
    return;
  }
  input.disabled = false;
  buttons.forEach((button) => button.disabled = false);
});

weeklyPointsBtn.addEventListener('click', async () => {
  if (weeklyPointsBtn.disabled) return;
  if (!confirm('Add 10 points to every Six? This can only be done once today.')) return;

  weeklyPointsBtn.disabled = true;
  weeklyPointsBtn.textContent = 'Adding 10 points…';

  try {
    const data = await apiJson('/api/add-weekly-points', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({})
    });

    working = { ...data.working };
    renderControls();

    leaderControls.querySelectorAll('.points-value').forEach((el) => {
      el.classList.add('points-bump');
      setTimeout(() => el.classList.remove('points-bump'), 550);
    });

    updateWeeklyPointsUI(data);
    updateUndoUI(data);
    notify('10 points added to every Six');
  } catch (err) {
    notify(err.message);
    try {
      const state = await apiJson('/api/leader-state', { headers: authHeaders(), cache: 'no-store' });
      working = { ...state.working };
      renderControls();
      updateWeeklyPointsUI(state);
      updateUndoUI(state);
    } catch {
      weeklyPointsBtn.disabled = false;
      weeklyPointsBtn.textContent = 'Add weekly points';
    }
  }
});

undoBtn.addEventListener('click', async () => {
  if (undoBtn.disabled) return;
  const summary = undoBtn.dataset.summary || 'the last points change';
  if (!confirm(`Undo ${summary}?`)) return;

  undoBtn.disabled = true;
  const originalText = undoBtn.textContent;
  undoBtn.textContent = 'Undoing…';

  try {
    const data = await apiJson('/api/undo', { method: 'POST', headers: authHeaders() });
    working = { ...data.working };
    renderControls();
    updateWeeklyPointsUI(data);
    updateUndoUI(data);
    const undoneSummary = data.undone?.summary || 'Last points change';
    notify(`${undoneSummary} undone`);
  } catch (err) {
    notify(err.message);
    try {
      const state = await apiJson('/api/leader-state', { headers: authHeaders(), cache: 'no-store' });
      working = { ...state.working };
      renderControls();
      updateWeeklyPointsUI(state);
      updateUndoUI(state);
    } catch {
      // Session expiry or a transient failure is handled elsewhere.
    }
  } finally {
    undoBtn.textContent = originalText;
  }
});

publishBtn.addEventListener('click', async () => {
  if (!confirm('Publish these totals to the projector/public display?')) return;
  publishBtn.disabled = true;
  publishBtn.textContent = 'Updating…';
  try {
    const data = await apiJson('/api/publish', { method: 'POST', headers: authHeaders() });
    publishStatus.textContent = `${data.currentTermLabel || currentTermName} updated ${new Date(data.publishedAt).toLocaleString('en-GB')}`;
    notify('Public totals updated');
  } catch (err) {
    notify(err.message);
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = 'Update Totals';
  }
});

function setAdminView(view) {
  const showPoints = view === 'points';
  pointsManagementPanel.classList.toggle('hidden', !showPoints);
  userManagementPanel.classList.toggle('hidden', showPoints);
  pointsManagementTab.classList.toggle('active', showPoints);
  userManagementTab.classList.toggle('active', !showPoints);
  pointsManagementTab.setAttribute('aria-current', showPoints ? 'page' : 'false');
  userManagementTab.setAttribute('aria-current', showPoints ? 'false' : 'page');
}

pointsManagementTab?.addEventListener('click', () => setAdminView('points'));
userManagementTab?.addEventListener('click', () => setAdminView('users'));

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => closeDialog(document.getElementById(button.dataset.closeDialog)));
});

[helpDialog, addUserDialog, editUserDialog].forEach((dialog) => {
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

helpBtn?.addEventListener('click', () => openDialog(helpDialog));

openAddUserDialogBtn?.addEventListener('click', () => {
  addUserForm.reset();
  openDialog(addUserDialog);
  requestAnimationFrame(() => addUserForm.elements.username?.focus());
});

function userRow(user) {
  const row = document.createElement('div');
  row.className = 'admin-user-row';
  row.dataset.username = user.username;
  row.dataset.role = user.role;
  const locked = user.username === 'admin';

  row.innerHTML = `
    <div class="admin-user-identity">
      <strong>${user.username}</strong>
      <span>${user.role === 'admin' ? 'Administrator' : 'Leader'}${locked ? ' · Protected' : ''}</span>
    </div>
    <div class="admin-user-actions">
      <button class="btn btn-small btn-gold edit-user" type="button">Edit</button>
      <button class="btn btn-small btn-outline-danger delete-user" type="button" ${locked ? 'disabled title="The built-in admin account cannot be deleted"' : ''}>Delete</button>
    </div>`;
  return row;
}

async function loadUsers() {
  const data = await apiJson('/api/users', { headers: authHeaders(), cache: 'no-store' });
  userList.replaceChildren(...data.users.map(userRow));
}

addUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(addUserForm);
  const button = addUserForm.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    await apiJson('/api/users', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'create',
        username: form.get('username'),
        password: form.get('password'),
        role: form.get('role')
      })
    });
    closeDialog(addUserDialog);
    addUserForm.reset();
    await loadUsers();
    notify('User added');
  } catch (err) {
    notify(err.message);
  } finally {
    button.disabled = false;
  }
});

userList.addEventListener('click', async (event) => {
  const row = event.target.closest('.admin-user-row');
  if (!row) return;

  const editButton = event.target.closest('.edit-user');
  if (editButton) {
    const locked = row.dataset.username === 'admin';
    editOriginalUsername.value = row.dataset.username;
    editUsername.value = row.dataset.username;
    editUsername.disabled = locked;
    editRole.value = row.dataset.role;
    editRole.disabled = locked;
    editPassword.value = '';
    editUserHint.textContent = locked
      ? 'The built-in admin username and role are protected. You can change its password.'
      : 'Leave the password blank if it does not need changing.';
    openDialog(editUserDialog);
    requestAnimationFrame(() => (locked ? editPassword : editUsername).focus());
    return;
  }

  const deleteButton = event.target.closest('.delete-user');
  if (!deleteButton || deleteButton.disabled) return;

  const usernameToDelete = row.dataset.username;
  if (!confirm(`Delete ${usernameToDelete}? They will immediately lose access to the leader page.`)) return;

  deleteButton.disabled = true;
  try {
    await apiJson('/api/users', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'delete', username: usernameToDelete })
    });
    await loadUsers();
    notify('User deleted');
  } catch (err) {
    notify(err.message);
    deleteButton.disabled = false;
  }
});

editUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(editUserForm);
  const originalUsername = form.get('originalUsername');
  const locked = originalUsername === 'admin';
  const button = editUserForm.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    await apiJson('/api/users', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'update',
        username: originalUsername,
        newUsername: locked ? originalUsername : form.get('newUsername'),
        role: locked ? 'admin' : form.get('role'),
        password: form.get('password') || undefined
      })
    });
    closeDialog(editUserDialog);
    editUserForm.reset();
    await loadUsers();
    notify('User updated');
  } catch (err) {
    notify(err.message);
  } finally {
    button.disabled = false;
  }
});

resetPointsBtn.addEventListener('click', async () => {
  if (!confirm(`Clear all ${currentTermName} term points? This will also clear that term from the projector and yearly total.`)) return;
  if (!confirm('Are you sure? You can use Undo last change if this was done accidentally.')) return;
  resetPointsBtn.disabled = true;
  try {
    const data = await apiJson('/api/reset-points', { method: 'POST', headers: authHeaders() });
    working = data.working;
    renderControls();
    updateWeeklyPointsUI(data);
    updateUndoUI(data);
    publishStatus.textContent = `${data.currentTermLabel || currentTermName} cleared ${new Date(data.lastResetAt).toLocaleString('en-GB')}`;
    notify(`${data.currentTermLabel || currentTermName} points cleared`);
  } catch (err) {
    notify(err.message);
  } finally {
    resetPointsBtn.disabled = false;
  }
});

async function refreshWeeklyPointsStatus() {
  if (!token || controlPanel.classList.contains('hidden')) return;
  try {
    const data = await apiJson('/api/leader-state', { headers: authHeaders(), cache: 'no-store' });
    const changed = Object.keys(SIXES).some((six) => Number(working[six]) !== Number(data.working[six]));
    working = { ...data.working };
    if (changed) syncWorkingValues();
    updateWeeklyPointsUI(data);
    updateUndoUI(data);
  } catch {
    // Session expiry is already handled by apiJson. Ignore transient polling errors.
  }
}

setInterval(refreshWeeklyPointsStatus, 4000);
window.addEventListener('focus', refreshWeeklyPointsStatus);

setTermBtn?.addEventListener('click', async () => {
  const selected = termSelect.value;
  if (selected === currentTerm) return notify(`${currentTermName} is already selected`);
  const label = termSelect.options[termSelect.selectedIndex].text;
  if (!confirm(`Change the current term to ${label}? All leader and public views will switch to that term.`)) return;
  setTermBtn.disabled = true;
  try {
    const data = await apiJson('/api/set-term', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ term: selected })
    });
    working = { ...data.working };
    currentTerm = data.currentTerm;
    currentTermName = data.currentTermLabel;
    renderControls();
    currentTermLabel.textContent = `Current term: ${currentTermName}`;
    termSelect.value = currentTerm;
    termStatus.textContent = `Changed ${new Date(data.lastTermChangedAt).toLocaleString('en-GB')} by ${data.lastTermChangedBy}`;
    updateWeeklyPointsUI(data);
    updateUndoUI(data);
    publishStatus.textContent = data.publishedAt
      ? `Last ${currentTermName} public update: ${new Date(data.publishedAt).toLocaleString('en-GB')}`
      : `No ${currentTermName} totals have been published yet.`;
    notify(`Current term changed to ${currentTermName}`);
  } catch (err) {
    notify(err.message);
  } finally {
    setTermBtn.disabled = false;
  }
});

saveAnnualRevealBtn?.addEventListener('click', async () => {
  const enabled = annualRevealSelect.value === 'on';
  const year = annualRevealYear.value.trim();
  if (!year) return notify('Enter a year label');
  saveAnnualRevealBtn.disabled = true;
  try {
    const data = await apiJson('/api/set-final-week', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ enabled, year })
    });
    annualRevealYear.value = data.annualRevealYear;
    annualRevealSelect.value = data.annualRevealEnabled ? 'on' : 'off';
    annualRevealStatus.textContent = `${data.annualRevealEnabled ? 'Enabled' : 'Disabled'} ${new Date(data.annualRevealChangedAt).toLocaleString('en-GB')} by ${data.annualRevealChangedBy}`;
    notify(data.annualRevealEnabled ? 'Final week winner reveal enabled' : 'Final week winner reveal disabled');
  } catch (err) {
    notify(err.message);
  } finally {
    saveAnnualRevealBtn.disabled = false;
  }
});

logoutBtn.addEventListener('click', logout);

loadState().catch(err => {
  loginStatus.textContent = err.message;
  showLogin();
});
