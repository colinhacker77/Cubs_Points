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
const adminPanel = document.getElementById('adminPanel');
const addUserForm = document.getElementById('addUserForm');
const userList = document.getElementById('userList');
const resetPointsBtn = document.getElementById('resetPointsBtn');

let token = sessionStorage.getItem('cubLeaderToken') || '';
let username = sessionStorage.getItem('cubLeaderUser') || '';
let role = sessionStorage.getItem('cubLeaderRole') || '';
let working = { red: 0, yellow: 0, purple: 0, blue: 0 };

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 1900);
}

function renderControls() {
  leaderControls.replaceChildren(...Object.entries(SIXES).map(([key, six]) => {
    const row = document.createElement('section');
    row.className = 'six-row';
    row.style.setProperty('--six-color', six.color);
    row.innerHTML = `
      <div class="six-name">${six.label}<small>points</small></div>
      <button class="adjust-btn" data-six="${key}" data-delta="-1" aria-label="Remove one point from ${six.label}">−</button>
      <div class="points-value" data-value="${key}">${working[key]}</div>
      <button class="adjust-btn" data-six="${key}" data-delta="1" aria-label="Add one point to ${six.label}">+</button>`;
    return row;
  }));
}

function showControls() {
  loginCard.classList.add('hidden');
  controlPanel.classList.remove('hidden');
  signedInAs.textContent = `Signed in as ${username}${role === 'admin' ? ' · Admin' : ''}`;
  adminPanel.classList.toggle('hidden', role !== 'admin');
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
  username = data.user || username;
  role = data.role || role;
  sessionStorage.setItem('cubLeaderUser', username);
  sessionStorage.setItem('cubLeaderRole', role);
  renderControls();
  showControls();
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
  if (!button) return;
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
    for (const [key, value] of Object.entries(working)) {
      const el = document.querySelector(`[data-value="${key}"]`);
      if (el) el.textContent = value;
    }
  } catch (err) {
    notify(err.message);
  } finally {
    button.disabled = false;
  }
});

publishBtn.addEventListener('click', async () => {
  if (!confirm('Publish these totals to the projector/public display?')) return;
  publishBtn.disabled = true;
  publishBtn.textContent = 'Updating…';
  try {
    const data = await apiJson('/api/publish', { method: 'POST', headers: authHeaders() });
    publishStatus.textContent = `Updated ${new Date(data.publishedAt).toLocaleString('en-GB')}`;
    notify('Public totals updated');
  } catch (err) {
    notify(err.message);
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = 'Update Totals';
  }
});

function userCard(user) {
  const card = document.createElement('form');
  card.className = 'user-card';
  card.dataset.username = user.username;
  const locked = user.username === 'admin';
  card.innerHTML = `
    <div class="user-card-title"><strong>${user.username}</strong><span>${user.role === 'admin' ? 'Administrator' : 'Leader'}</span></div>
    <div class="user-edit-grid">
      <label>Username
        <input name="newUsername" value="${user.username}" ${locked ? 'disabled' : ''}>
      </label>
      <label>Role
        <select name="role" ${locked ? 'disabled' : ''}>
          <option value="leader" ${user.role === 'leader' ? 'selected' : ''}>Leader</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
        </select>
      </label>
      <label class="password-field">New password <span>(leave blank to keep current)</span>
        <input name="password" type="password" autocomplete="new-password" minlength="8">
      </label>
    </div>
    <div class="user-actions">
      <button class="btn btn-small btn-gold" type="submit">Save changes</button>
      ${locked ? '<span class="protected-user">Protected account</span>' : '<button class="btn btn-small btn-outline-danger delete-user" type="button">Remove user</button>'}
    </div>`;
  return card;
}

async function loadUsers() {
  const data = await apiJson('/api/users', { headers: authHeaders(), cache: 'no-store' });
  userList.replaceChildren(...data.users.map(userCard));
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
      body: JSON.stringify({ action: 'create', username: form.get('username'), password: form.get('password'), role: form.get('role') })
    });
    addUserForm.reset();
    await loadUsers();
    notify('User added');
  } catch (err) {
    notify(err.message);
  } finally {
    button.disabled = false;
  }
});

userList.addEventListener('submit', async (event) => {
  const card = event.target.closest('.user-card');
  if (!card) return;
  event.preventDefault();
  const form = new FormData(card);
  const button = card.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await apiJson('/api/users', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        action: 'update',
        username: card.dataset.username,
        newUsername: form.get('newUsername') || card.dataset.username,
        role: form.get('role') || undefined,
        password: form.get('password') || undefined
      })
    });
    await loadUsers();
    notify('User updated');
  } catch (err) {
    notify(err.message);
  } finally {
    button.disabled = false;
  }
});

userList.addEventListener('click', async (event) => {
  const button = event.target.closest('.delete-user');
  if (!button) return;
  const card = button.closest('.user-card');
  const usernameToDelete = card.dataset.username;
  if (!confirm(`Remove ${usernameToDelete}? They will no longer be able to sign in.`)) return;
  button.disabled = true;
  try {
    await apiJson('/api/users', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'delete', username: usernameToDelete })
    });
    await loadUsers();
    notify('User removed');
  } catch (err) {
    notify(err.message);
    button.disabled = false;
  }
});

resetPointsBtn.addEventListener('click', async () => {
  if (!confirm('Reset ALL sixes to zero? This will also immediately reset the public/projector display.')) return;
  if (!confirm('This cannot be undone. Are you sure you want to reset all points to zero?')) return;
  resetPointsBtn.disabled = true;
  try {
    const data = await apiJson('/api/reset-points', { method: 'POST', headers: authHeaders() });
    working = data.working;
    renderControls();
    publishStatus.textContent = `Reset to zero ${new Date(data.lastResetAt).toLocaleString('en-GB')}`;
    notify('All points reset to zero');
  } catch (err) {
    notify(err.message);
  } finally {
    resetPointsBtn.disabled = false;
  }
});

logoutBtn.addEventListener('click', logout);

loadState().catch(err => {
  loginStatus.textContent = err.message;
  showLogin();
});
