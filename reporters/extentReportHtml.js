/**
 * Renders the self-contained Extent-Spark-style report: one HTML string
 * with all CSS/JS inlined and screenshots embedded as base64 data URIs.
 * The `model` shape is produced by reporters/extent-reporter.js.
 */
function renderReportHtml(model) {
  // Escape '<' so a step title/error containing "</script>" can't break out
  // of the inline JSON payload.
  const dataJson = JSON.stringify(model).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test Report</title>
<style>${CSS}</style>
</head>
<body>
<div class="app" id="app">
  <header class="dashboard">
    <div class="brand">
      <span class="brand-mark">&#9889;</span>
      <span class="brand-title">Test Report</span>
    </div>
    <div class="tiles" id="tiles"></div>
    <button class="theme-toggle" id="themeToggle" title="Toggle dark mode">&#127769;</button>
  </header>
  <div class="body">
    <aside class="sidebar">
      <div class="controls">
        <input id="search" class="search" type="search" placeholder="Search tests...">
        <select id="statusFilter" class="status-filter">
          <option value="all">All</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>
      <ul class="test-list" id="testList"></ul>
    </aside>
    <main class="detail" id="detail">
      <div class="empty-state">Select a test on the left to see its steps.</div>
    </main>
  </div>
</div>
<script>window.__REPORT_DATA__ = ${dataJson};</script>
<script>${JS}</script>
</body>
</html>`;
}

const CSS = `
:root {
  --bg: #f4f6f8;
  --card-bg: #ffffff;
  --border: #e2e6ea;
  --text: #1f2933;
  --muted: #6b7280;
  --pass: #2e7d32;    --pass-bg: #e8f5e9;
  --fail: #c62828;    --fail-bg: #fdecea;
  --skip: #616161;    --skip-bg: #eeeeee;
  --info: #1565c0;    --info-bg: #e3f2fd;
  --start-badge: #009688;
  --end-badge: #e53935;
  --duration-badge: #5c6bc0;
  --accent: #3f51b5;
  --row-hover: #f1f3fb;
  --row-active: #e8eaf9;
}
[data-theme="dark"] {
  --bg: #14161a;
  --card-bg: #1d2025;
  --border: #2c3038;
  --text: #e6e8eb;
  --muted: #9aa0a6;
  --pass-bg: #17321a;
  --fail-bg: #3a1a1a;
  --skip-bg: #2a2c30;
  --info-bg: #10233a;
  --row-hover: #23262d;
  --row-active: #262a44;
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}
.app { display: flex; flex-direction: column; height: 100vh; }

.dashboard {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 20px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 18px; }
.brand-mark { font-size: 20px; }
.tiles { display: flex; gap: 10px; flex-wrap: wrap; flex: 1; }
.tile {
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  min-width: 76px;
}
.tile b { font-size: 16px; color: var(--text); font-family: "SFMono-Regular", Consolas, monospace; }
.tile.pass b { color: var(--pass); }
.tile.fail b { color: var(--fail); }
.tile.skip b { color: var(--skip); }
.theme-toggle {
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 16px;
}

.body { flex: 1; display: flex; min-height: 0; }

.sidebar {
  width: 340px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.controls { display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--border); }
.search {
  flex: 1;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
}
.status-filter {
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
}
.test-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
.test-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.test-row:hover { background: var(--row-hover); }
.test-row.active { background: var(--row-active); }
.status-icon { font-size: 14px; flex-shrink: 0; width: 18px; text-align: center; }
.status-icon.passed { color: var(--pass); }
.status-icon.failed { color: var(--fail); }
.status-icon.skipped { color: var(--skip); }
.test-row-main { min-width: 0; flex: 1; }
.test-row-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.test-row-meta {
  font-size: 11px;
  color: var(--muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.detail { flex: 1; overflow-y: auto; padding: 24px 32px; min-height: 0; }
.empty-state { color: var(--muted); font-size: 14px; margin-top: 40px; text-align: center; }

.detail-title { font-size: 20px; font-weight: 700; margin: 0 0 12px; }
.badges { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.badge {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  font-family: "SFMono-Regular", Consolas, monospace;
}
.badge.start { background: var(--start-badge); }
.badge.end { background: var(--end-badge); }
.badge.duration { background: var(--duration-badge); }

table.steps-table { width: 100%; border-collapse: collapse; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
table.steps-table th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
table.steps-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  vertical-align: top;
}
table.steps-table tr:last-child td { border-bottom: none; }
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.status-badge.info { background: var(--info-bg); color: var(--info); }
.status-badge.pass { background: var(--pass-bg); color: var(--pass); }
.status-badge.fail { background: var(--fail-bg); color: var(--fail); }
.status-badge.skip { background: var(--skip-bg); color: var(--skip); }
.timestamp-cell { font-family: "SFMono-Regular", Consolas, monospace; white-space: nowrap; color: var(--muted); }
.step-keyword { font-weight: 700; color: var(--accent); margin-right: 4px; }
.step-error {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--fail-bg);
  color: var(--fail);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.step-screenshot {
  display: block;
  margin-top: 10px;
  max-width: 480px;
  width: 100%;
  border-radius: 6px;
  border: 1px solid var(--border);
  cursor: zoom-in;
}
.screenshot-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100;
  cursor: zoom-out;
}
.screenshot-overlay img { max-width: 100%; max-height: 100%; border-radius: 6px; }
.screenshot-overlay.hidden { display: none; }
`;

const JS = `
(function () {
  const data = window.__REPORT_DATA__;
  const tiles = document.getElementById('tiles');
  const testList = document.getElementById('testList');
  const detail = document.getElementById('detail');
  const search = document.getElementById('search');
  const statusFilter = document.getElementById('statusFilter');
  const themeToggle = document.getElementById('themeToggle');
  let selectedId = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(ms) {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date(ms));
  }

  function formatDuration(ms) {
    if (ms < 1000) return ms + 'ms';
    const totalSec = ms / 1000;
    if (totalSec < 60) return totalSec.toFixed(2) + 's';
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toFixed(1);
    return m + 'm ' + s + 's';
  }

  function statusIcon(status) {
    if (status === 'passed') return '&#10004;';
    if (status === 'failed') return '&#10008;';
    return '&#9198;';
  }

  function renderTiles() {
    const m = data.meta;
    tiles.innerHTML = [
      ['total', 'Total', m.total],
      ['pass', 'Passed', m.passed],
      ['fail', 'Failed', m.failed],
      ['skip', 'Skipped', m.skipped],
      ['rate', 'Pass %', m.passPercent + '%'],
      ['duration', 'Duration', formatDuration(m.durationMs)],
    ].map(function (t) {
      return '<div class="tile ' + t[0] + '"><span>' + t[1] + '</span><b>' + t[2] + '</b></div>';
    }).join('');
  }

  function matchesFilters(test) {
    const statusOk = statusFilter.value === 'all' || test.status === statusFilter.value;
    const query = search.value.trim().toLowerCase();
    const searchOk = !query || test.title.toLowerCase().includes(query);
    return statusOk && searchOk;
  }

  function renderList() {
    const filtered = data.tests.filter(matchesFilters);
    testList.innerHTML = filtered.map(function (t) {
      return '' +
        '<li class="test-row' + (t.id === selectedId ? ' active' : '') + '" data-id="' + t.id + '">' +
          '<span class="status-icon ' + t.status + '">' + statusIcon(t.status) + '</span>' +
          '<div class="test-row-main">' +
            '<div class="test-row-title">' + escapeHtml(t.title) + '</div>' +
            '<div class="test-row-meta"><span>' + formatTime(t.startTime) + '</span><span>' + formatDuration(t.durationMs) + '</span></div>' +
          '</div>' +
        '</li>';
    }).join('') || '<li class="empty-state">No tests match.</li>';

    testList.querySelectorAll('.test-row[data-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        selectTest(row.getAttribute('data-id'));
      });
    });
  }

  function stepRow(step) {
    let details = '';
    if (step.keyword) details += '<span class="step-keyword">' + escapeHtml(step.keyword) + '</span>';
    details += escapeHtml(step.text);
    if (step.errorMessage) {
      details += '<div class="step-error">' + escapeHtml(step.errorMessage) +
        (step.errorStack ? '\\n\\n' + escapeHtml(step.errorStack) : '') + '</div>';
    }
    if (step.screenshot) {
      details += '<img class="step-screenshot" src="' + step.screenshot + '" alt="step screenshot">';
    }
    return '' +
      '<tr>' +
        '<td><span class="status-badge ' + step.status + '">' + step.status + '</span></td>' +
        '<td class="timestamp-cell">' + formatTime(step.timestamp) + '</td>' +
        '<td>' + details + '</td>' +
      '</tr>';
  }

  function selectTest(id) {
    selectedId = id;
    renderList();
    const test = data.tests.find(function (t) { return t.id === id; });
    if (!test) {
      detail.innerHTML = '<div class="empty-state">Select a test on the left to see its steps.</div>';
      return;
    }
    const stepsHtml = test.steps.length
      ? test.steps.map(stepRow).join('')
      : '<tr><td colspan="3" class="empty-state">No steps recorded for this test.</td></tr>';

    detail.innerHTML = '' +
      '<h2 class="detail-title">' + escapeHtml(test.title) + '</h2>' +
      '<div class="badges">' +
        '<span class="badge start">Start ' + formatTime(test.startTime) + '</span>' +
        '<span class="badge end">End ' + formatTime(test.endTime) + '</span>' +
        '<span class="badge duration">Duration ' + formatDuration(test.durationMs) + '</span>' +
      '</div>' +
      '<table class="steps-table">' +
        '<thead><tr><th>Status</th><th>Timestamp</th><th>Details</th></tr></thead>' +
        '<tbody>' + stepsHtml + '</tbody>' +
      '</table>';

    detail.querySelectorAll('.step-screenshot').forEach(function (img) {
      img.addEventListener('click', function () { openLightbox(img.src); });
    });
  }

  function openLightbox(src) {
    let overlay = document.getElementById('screenshotOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'screenshotOverlay';
      overlay.className = 'screenshot-overlay hidden';
      overlay.innerHTML = '<img>';
      overlay.addEventListener('click', function () { overlay.classList.add('hidden'); });
      document.body.appendChild(overlay);
    }
    overlay.querySelector('img').src = src;
    overlay.classList.remove('hidden');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('extent-report-theme', theme);
  }

  themeToggle.addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(current);
  });

  const savedTheme = localStorage.getItem('extent-report-theme') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  search.addEventListener('input', renderList);
  statusFilter.addEventListener('change', renderList);

  renderTiles();
  renderList();
  if (data.tests.length) selectTest(data.tests[0].id);
})();
`;

module.exports = { renderReportHtml };
