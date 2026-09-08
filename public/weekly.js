const SIXES = {
  red: { label: 'Red', color: '#ef3340' },
  yellow: { label: 'Yellow', color: '#f4c430' },
  purple: { label: 'Purple', color: '#9c3cff' },
  blue: { label: 'Blue', color: '#2f80ed' }
};

const bars = document.getElementById('weeklyBars');
const updated = document.getElementById('weeklyUpdated');

function render(points) {
  const values = Object.entries(SIXES).map(([key, six]) => ({
    key,
    label: six.label,
    color: six.color,
    value: Number(points[key] || 0)
  }));

  const max = Math.max(1, ...values.map((item) => item.value));

  bars.replaceChildren(...values.map((item) => {
    const row = document.createElement('article');
    row.className = 'weekly-row';
    row.style.setProperty('--six-color', item.color);

    const width = Math.max(16, (item.value / max) * 100);
    row.innerHTML = `
      <div class="weekly-row-top">
        <span class="weekly-six-name">${item.label}</span>
      </div>
      <div class="weekly-track" role="img" aria-label="${item.label} Six: ${item.value} points">
        <div class="weekly-fill" style="width:${width}%">
          <span class="weekly-bar-score">${item.value} pts</span>
        </div>
      </div>`;
    return row;
  }));
}

async function load() {
  try {
    const res = await fetch('/api/points', { cache: 'no-store' });
    if (!res.ok) throw new Error('Unable to load totals');
    const data = await res.json();
    render(data.points || {});

    if (data.publishedAt) {
      const date = new Date(data.publishedAt);
      updated.textContent = `Updated ${date.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })}`;
    } else {
      updated.textContent = 'Current Six points totals';
    }
  } catch (error) {
    updated.textContent = 'Unable to load the latest totals';
  }
}

load();
