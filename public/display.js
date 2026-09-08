const config = {
  red: { label: 'Red', color: '#ef3340', light: '#ff6d73', dark: '#9e1018' },
  yellow: { label: 'Yellow', color: '#f4c430', light: '#ffe468', dark: '#a57500' },
  purple: { label: 'Purple', color: '#9c3cff', light: '#c06dff', dark: '#5712a8' },
  blue: { label: 'Blue', color: '#2f80ed', light: '#67a7ff', dark: '#0b4b9d' }
};

const tubes = document.getElementById('tubes');
const status = document.getElementById('status');
let lastPayload = '';
let pourGeneration = 0;

function marbleSize(value) {
  if (value > 140) return 9;
  if (value > 100) return 10;
  if (value > 70) return 12;
  if (value > 40) return 15;
  return 20;
}

function marbleGap(size) {
  if (size <= 10) return 2;
  if (size <= 12) return 3;
  return 4;
}

function makeTube(name, value) {
  const c = config[name];
  const unit = document.createElement('div');
  unit.className = `tube-unit ${name}`;

  const tube = document.createElement('div');
  tube.className = 'tube';
  tube.setAttribute('aria-label', `${c.label} Six: ${value} points`);

  const badge = document.createElement('div');
  badge.className = 'score-badge';
  badge.innerHTML = `<strong>${value}</strong><small>POINTS</small>`;

  const tubeWindow = document.createElement('div');
  tubeWindow.className = 'tube-window';

  const marbles = document.createElement('div');
  marbles.className = 'marbles';
  marbles.dataset.six = name;
  marbles.dataset.value = String(value);
  marbles.style.setProperty('--marble-size', `${marbleSize(value)}px`);

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
  const positions = [];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const rowStart = row * cols;
    const rowCount = Math.min(cols, count - rowStart);
    const colInRow = i - rowStart;
    const rowWidth = rowCount * size + (rowCount - 1) * gap;
    const leftOffset = Math.max(0, Math.floor((width - rowWidth) / 2));

    positions.push({
      left: leftOffset + colInRow * (size + gap),
      bottom: row * (size + gap)
    });
  }

  return positions;
}

function createMarble(name, index, size, position, holderHeight) {
  const c = config[name];
  const marble = document.createElement('span');
  marble.className = 'marble marble-enter';
  marble.style.setProperty('--color', c.color);
  marble.style.setProperty('--light', c.light);
  marble.style.setProperty('--dark', c.dark);
  marble.style.setProperty('--pour-x', `${((index % 5) - 2) * Math.max(3, Math.round(size * 0.35))}px`);
  marble.style.setProperty('--drop-height', `${Math.max(holderHeight - position.bottom + 70, 140)}px`);
  marble.style.width = `${size}px`;
  marble.style.height = `${size}px`;
  marble.style.left = `${position.left}px`;
  marble.style.bottom = `${position.bottom}px`;
  return marble;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pourTube(name, value, generation) {
  const holder = tubes.querySelector(`.marbles[data-six="${name}"]`);
  if (!holder) return;

  const visible = Math.min(value, 180);
  if (visible <= 0) return;

  const size = marbleSize(value);
  const positions = buildPositions(holder, visible, size);
  const interval = Math.max(40, Math.min(95, 6000 / visible));
  const holderHeight = holder.clientHeight;

  for (let i = 0; i < visible; i++) {
    if (generation !== pourGeneration || !holder.isConnected) return;

    const marble = createMarble(name, i, size, positions[i], holderHeight);
    holder.appendChild(marble);

    const jitter = (i % 4) * 6;
    await wait(interval + jitter);
  }
}

function render(points) {
  pourGeneration += 1;
  const generation = pourGeneration;

  tubes.replaceChildren(
    ...Object.keys(config).map((name) => makeTube(name, Number(points[name] || 0)))
  );

  requestAnimationFrame(() => {
    for (const name of Object.keys(config)) {
      void pourTube(name, Number(points[name] || 0), generation);
    }
  });
}

async function load() {
  try {
    const res = await fetch('/api/points', { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load totals');
    const data = await res.json();
    const payload = JSON.stringify(data.points);
    if (payload !== lastPayload) {
      render(data.points);
      lastPayload = payload;
    }
    status.textContent = data.publishedAt
      ? `Totals updated ${new Date(data.publishedAt).toLocaleString('en-GB')}`
      : 'Ready for your first meeting totals';
  } catch (err) {
    status.textContent = 'Unable to load points — retrying…';
  }
}

load();
setInterval(load, 5000);
