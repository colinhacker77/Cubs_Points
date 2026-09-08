const config = {
  red: { label: 'Red', color: '#ef3340', light: '#ff6d73', dark: '#9e1018' },
  yellow: { label: 'Yellow', color: '#f4c430', light: '#ffe468', dark: '#a57500' },
  purple: { label: 'Purple', color: '#9c3cff', light: '#c06dff', dark: '#5712a8' },
  blue: { label: 'Blue', color: '#2f80ed', light: '#67a7ff', dark: '#0b4b9d' }
};

const tubes = document.getElementById('tubes');
const status = document.getElementById('status');
let lastPayload = '';

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
  const visible = Math.min(value, 180);
  const size = value > 140 ? 9 : value > 100 ? 10 : value > 70 ? 12 : value > 40 ? 15 : 20;
  marbles.style.setProperty('--marble-size', `${size}px`);
  for (let i = 0; i < visible; i++) {
    const marble = document.createElement('span');
    marble.className = 'marble';
    marble.style.setProperty('--color', c.color);
    marble.style.setProperty('--light', c.light);
    marble.style.setProperty('--dark', c.dark);
    const pourDelay = Math.min(i * 0.14 + (i % 3) * 0.02, 14);
    const pourOffsetX = ((i % 5) - 2) * 7;
    marble.style.setProperty('--drop-delay', `${pourDelay}s`);
    marble.style.setProperty('--pour-x', `${pourOffsetX}px`);
    marbles.appendChild(marble);
  }
  tubeWindow.append(marbles);
  tube.append(badge, tubeWindow);
  const label = document.createElement('div');
  label.className = 'tube-label';
  label.textContent = c.label;

  unit.append(tube, label);
  return unit;
}

function render(points) {
  tubes.replaceChildren(...Object.keys(config).map(name => makeTube(name, Number(points[name] || 0))));
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
