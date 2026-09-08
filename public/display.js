const config = {
  red: { label: 'Red', color: '#ef3340', light: '#ff6d73', dark: '#9e1018' },
  yellow: { label: 'Yellow', color: '#f4c430', light: '#ffe468', dark: '#a57500' },
  purple: { label: 'Purple', color: '#9c3cff', light: '#c06dff', dark: '#5712a8' },
  blue: { label: 'Blue', color: '#2f80ed', light: '#67a7ff', dark: '#0b4b9d' }
};

const tubes = document.getElementById('tubes');
const status = document.getElementById('status');
const subtitle = document.getElementById('displaySubtitle');
const termViewBtn = document.getElementById('termViewBtn');
const yearViewBtn = document.getElementById('yearViewBtn');
const historyGrid = document.getElementById('termHistoryGrid');
let lastPayload = '';
let pourGeneration = 0;
let latestData = null;
let viewMode = 'term';

function marbleSize(value) {
  if (value > 280) return 7;
  if (value > 200) return 8;
  if (value > 140) return 9;
  if (value > 100) return 10;
  if (value > 70) return 12;
  if (value > 40) return 15;
  return 20;
}
function marbleGap(size) { return size <= 10 ? 2 : size <= 12 ? 3 : 4; }

function makeTube(name, value) {
  const c = config[name];
  const unit = document.createElement('div');
  unit.className = `tube-unit ${name}`;
  unit.dataset.six = name;
  const tube = document.createElement('div');
  tube.className = 'tube';
  tube.setAttribute('aria-label', `${c.label} Six: ${value} points`);
  const badge = document.createElement('div');
  badge.className = 'score-badge score-badge-hidden';
  badge.dataset.badge = name;
  badge.innerHTML = `<strong>${value}</strong><small>POINTS</small>`;
  const tubeWindow = document.createElement('div');
  tubeWindow.className = 'tube-window';
  const marbles = document.createElement('div');
  marbles.className = 'marbles';
  marbles.dataset.six = name;
  tubeWindow.append(marbles);
  tube.append(badge, tubeWindow);
  const label = document.createElement('div');
  label.className = 'tube-label';
  label.textContent = c.label;
  unit.append(tube, label);
  return unit;
}

function buildPositions(holder, count, size) {
  const gap = marbleGap(size);
  const width = holder.clientWidth;
  const cols = Math.max(1, Math.floor((width + gap) / (size + gap)));
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const rowStart = row * cols;
    const rowCount = Math.min(cols, count - rowStart);
    const col = i - rowStart;
    const rowWidth = rowCount * size + (rowCount - 1) * gap;
    return { left: Math.max(0, Math.floor((width - rowWidth) / 2)) + col * (size + gap), bottom: row * (size + gap) };
  });
}

function createMarble(name, index, size, position, holderHeight) {
  const c = config[name];
  const marble = document.createElement('span');
  marble.className = 'marble marble-enter';
  marble.style.setProperty('--color', c.color);
  marble.style.setProperty('--light', c.light);
  marble.style.setProperty('--dark', c.dark);
  marble.style.setProperty('--pour-x', `${((index % 5) - 2) * Math.max(3, Math.round(size * .35))}px`);
  marble.style.setProperty('--drop-height', `${Math.max(holderHeight - position.bottom + 70, 140)}px`);
  Object.assign(marble.style, { width: `${size}px`, height: `${size}px`, left: `${position.left}px`, bottom: `${position.bottom}px` });
  return marble;
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function revealBadge(name) {
  const badge = tubes.querySelector(`[data-badge="${name}"]`);
  if (badge) { badge.classList.remove('score-badge-hidden'); badge.classList.add('score-badge-reveal'); }
}

async function pourTube(name, value, generation) {
  const holder = tubes.querySelector(`.marbles[data-six="${name}"]`);
  if (!holder) return;
  const visible = Math.min(value, 300);
  if (!visible) { revealBadge(name); return; }
  const size = marbleSize(value);
  const positions = buildPositions(holder, visible, size);
  const interval = Math.max(20, Math.min(55, 3800 / visible));
  const holderHeight = holder.clientHeight;
  for (let i = 0; i < visible; i++) {
    if (generation !== pourGeneration || !holder.isConnected) return;
    holder.appendChild(createMarble(name, i, size, positions[i], holderHeight));
    await wait(interval + (i % 4) * 3);
  }
  await wait(900);
  if (generation === pourGeneration) revealBadge(name);
}

function celebrate(points, generation) {
  if (generation !== pourGeneration) return;
  const max = Math.max(...Object.values(points));
  if (max <= 0) return;
  for (const [six, value] of Object.entries(points)) {
    if (value !== max) continue;
    const unit = tubes.querySelector(`.tube-unit[data-six="${six}"]`);
    if (!unit) continue;
    const burst = document.createElement('div');
    burst.className = 'confetti-burst';
    for (let i = 0; i < 34; i++) {
      const piece = document.createElement('i');
      piece.style.setProperty('--i', i);
      piece.style.setProperty('--piece-color', [config.red.color, config.yellow.color, config.purple.color, config.blue.color, '#ffd978'][i % 5]);
      burst.appendChild(piece);
    }
    unit.appendChild(burst);
    setTimeout(() => burst.remove(), viewMode === 'year' ? 5200 : 3600);
  }
}

async function animateScores(points) {
  pourGeneration += 1;
  const generation = pourGeneration;
  tubes.replaceChildren(...Object.keys(config).map(name => makeTube(name, Number(points[name] || 0))));
  await new Promise(resolve => requestAnimationFrame(resolve));
  for (const name of Object.keys(config)) {
    if (generation !== pourGeneration) return;
    await pourTube(name, Number(points[name] || 0), generation);
    await wait(120);
  }
  await wait(180);
  celebrate(points, generation);
}

function renderHistory(data) {
  if (!data?.terms) return;
  const termOrder = ['autumn', 'spring', 'summer'];
  historyGrid.replaceChildren(...termOrder.map(term => {
    const item = data.terms[term];
    const card = document.createElement('article');
    card.className = `term-history-card${term === data.currentTerm ? ' current' : ''}`;
    card.innerHTML = `<h3>${item.label}${term === data.currentTerm ? ' · Current' : ''}</h3>
      <div class="history-values">${Object.entries(config).map(([six, c]) => `<span><b style="--six-color:${c.color}">${c.label}</b> ${Number(item.points[six] || 0)}</span>`).join('')}</div>`;
    return card;
  }));
}

function selectedPoints() {
  return viewMode === 'year' ? latestData.yearly : latestData.points;
}

function updateView({ animate = true } = {}) {
  if (!latestData) return;
  termViewBtn.classList.toggle('active', viewMode === 'term');
  yearViewBtn.classList.toggle('active', viewMode === 'year');
  subtitle.textContent = viewMode === 'term' ? `${latestData.currentTermLabel} Term Totals` : 'Full Year Totals';
  if (animate) void animateScores(selectedPoints());
}

termViewBtn.addEventListener('click', () => { if (viewMode !== 'term') { viewMode = 'term'; updateView(); } });
yearViewBtn.addEventListener('click', () => { if (viewMode !== 'year') { viewMode = 'year'; updateView(); } });

async function load() {
  try {
    const res = await fetch('/api/points', { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load totals');
    const data = await res.json();
    const payload = JSON.stringify(data);
    latestData = data;
    renderHistory(data);
    if (payload !== lastPayload) { updateView(); lastPayload = payload; }
    status.textContent = data.publishedAt
      ? `${data.currentTermLabel} totals updated ${new Date(data.publishedAt).toLocaleString('en-GB')}`
      : `No ${data.currentTermLabel} totals published yet`;
  } catch {
    status.textContent = 'Unable to load points — retrying…';
  }
}

load();
setInterval(load, 5000);
