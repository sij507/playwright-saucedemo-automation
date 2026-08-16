/**
 * Renders the self-contained Extent-Spark-style report: one HTML string
 * with all CSS/JS inlined and screenshots embedded as base64 data URIs.
 * The `model` shape is produced by reporters/extent-reporter.js:
 *
 *   model.meta: {
 *     startTime, endTime, durationMs, total, passed, failed, skipped, flaky,
 *     passPercent,
 *     // all optional, gracefully omitted from the report when absent:
 *     environment, os, nodeVersion, playwrightVersion, branch, commit,
 *     buildNumber, ci,
 *   }
 *   model.tests: Array<{
 *     id, title, project, status: 'passed'|'failed'|'skipped',
 *     // true only when the test ultimately passed after at least one
 *     // earlier attempt failed (see ExtentReporter.onTestEnd) — `status`
 *     // stays 'passed' for a flaky test; `flaky` is what separates it from
 *     // a clean pass everywhere this report counts or filters tests.
 *     flaky, retry, tags: string[],
 *     startTime, endTime, durationMs,
 *     steps: Array<ReportRow>,
 *     artifacts: Array<{ name, type: 'screenshot'|'trace'|'video'|'log'|'file', path }>,
 *   }>
 *   model.projects: Array<{ name, total, passed, failed, skipped, flaky }>
 *
 * ReportRow: { title, keyword, text, depth, status: 'pass'|'fail'|'info'|'skip',
 *   timestamp, durationMs, screenshot, errorMessage, errorStack }
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
<title>Playwright Automation Report</title>
<style>${CSS}</style>
</head>
<body>
<div class="app" id="app">
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">&#9889;</span>
      <div class="brand-text">
        <span class="brand-title">Playwright Automation Report</span>
        <span class="brand-subtitle">UI &bull; E2E Automation</span>
      </div>
    </div>
    <div class="topbar-actions">
      <span class="run-timestamp" id="runTimestamp"></span>
      <button class="icon-btn" id="envToggle" type="button" aria-expanded="false" aria-controls="envPanel" aria-label="Show execution information" title="Execution information">&#8505;&#65039;</button>
      <button class="icon-btn" id="themeToggle" type="button" aria-label="Toggle dark mode" title="Toggle dark mode">&#127769;</button>
    </div>
  </header>
  <div class="env-panel hidden" id="envPanel"></div>
  <section class="summary-wrap">
    <div class="summary" id="summary"></div>
    <button class="projects-toggle hidden" id="projectsToggle" type="button" aria-expanded="false" aria-controls="projectsPanel">
      <span>Projects</span><span class="toggle-caret" id="projectsToggleIcon">&#9656;</span>
    </button>
    <div class="projects-panel hidden" id="projectsPanel"></div>
  </section>
  <div class="body">
    <aside class="sidebar">
      <div class="controls">
        <input id="search" class="search" type="search" placeholder="Search tests, projects, tags..." aria-label="Search tests">
        <select id="projectFilter" class="project-filter" aria-label="Filter by project">
          <option value="all">All projects</option>
        </select>
      </div>
      <div class="filter-pills" id="filterPills" role="group" aria-label="Filter by status"></div>
      <div class="result-count" id="resultCount"></div>
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
  --flaky: #b26a00;   --flaky-bg: #fff3e0;
  --start-badge: #009688;
  --end-badge: #e53935;
  --duration-badge: #5c6bc0;
  --accent: #3f51b5;
  --row-hover: #f1f3fb;
  --row-active: #e8eaf9;
  --shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow-md: 0 4px 10px rgba(16, 24, 40, 0.08);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #14161a;
    --card-bg: #1d2025;
    --border: #2c3038;
    --text: #e8eaed;
    --muted: #9aa0a6;
    --pass-bg: #17321a;
    --fail-bg: #3a1a1a;
    --skip-bg: #2a2c30;
    --info-bg: #10233a;
    --flaky-bg: #3a2a0e;
    --row-hover: #23262d;
    --row-active: #262a44;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.45);
  }
}
:root[data-theme="dark"] {
  --bg: #14161a;
  --card-bg: #1d2025;
  --border: #2c3038;
  --text: #e8eaed;
  --muted: #9aa0a6;
  --pass-bg: #17321a;
  --fail-bg: #3a1a1a;
  --skip-bg: #2a2c30;
  --info-bg: #10233a;
  --flaky-bg: #3a2a0e;
  --row-hover: #23262d;
  --row-active: #262a44;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.45);
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}
button { font-family: inherit; }
.hidden { display: none !important; }
.app { display: flex; flex-direction: column; min-height: 100vh; }

/* ---------- Header ---------- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 20;
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand-mark { font-size: 22px; }
.brand-text { display: flex; flex-direction: column; line-height: 1.25; }
.brand-title { font-weight: 700; font-size: 17px; }
.brand-subtitle { font-size: 11px; color: var(--muted); letter-spacing: 0.02em; }
.topbar-actions { display: flex; align-items: center; gap: 10px; }
.run-timestamp { font-size: 12px; color: var(--muted); font-family: "SFMono-Regular", Consolas, monospace; }
.icon-btn {
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
}
.icon-btn:hover { background: var(--row-hover); }

/* ---------- Execution info panel ---------- */
.env-panel {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 14px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px 24px;
}
.env-item { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.env-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.env-value {
  font-size: 13px;
  font-family: "SFMono-Regular", Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- Summary cards ---------- */
.summary-wrap { background: var(--card-bg); border-bottom: 1px solid var(--border); padding: 16px 24px; }
.summary { display: flex; gap: 12px; flex-wrap: wrap; }
.card {
  flex: 1 1 110px;
  min-width: 100px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
.card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); display: flex; align-items: center; gap: 5px; }
.card-value { font-size: 22px; font-weight: 700; font-family: "SFMono-Regular", Consolas, monospace; margin-top: 4px; }
.card.pass .card-value { color: var(--pass); }
.card.fail .card-value { color: var(--fail); }
.card.skip .card-value { color: var(--skip); }
.card.flaky .card-value { color: var(--flaky); }
.card.rate .card-value, .card.duration .card-value { color: var(--accent); }

.projects-toggle {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
}
.projects-toggle:hover { color: var(--text); }
.toggle-caret { display: inline-block; transition: transform 0.15s ease; font-size: 10px; }
.projects-toggle[aria-expanded="true"] .toggle-caret { transform: rotate(90deg); }
.projects-panel {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.project-card {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 12px;
  min-width: 140px;
}
.project-card-name { font-weight: 700; margin-bottom: 4px; }
.project-card-stats { display: flex; gap: 10px; color: var(--muted); font-family: "SFMono-Regular", Consolas, monospace; flex-wrap: wrap; }
.project-card-stats .pass-n { color: var(--pass); }
.project-card-stats .fail-n { color: var(--fail); }
.project-card-stats .flaky-n { color: var(--flaky); }

/* ---------- Body layout ---------- */
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
.controls { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-bottom: 1px solid var(--border); }
.search, .project-filter {
  width: 100%;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
}
.filter-pills { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px 0; }
.pill {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--muted);
  border-radius: 999px;
  padding: 4px 11px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.pill:hover { background: var(--row-hover); }
.pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.result-count { padding: 8px 12px 4px; font-size: 11px; color: var(--muted); }

.test-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
.test-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.test-row:hover { background: var(--row-hover); }
.test-row.active { background: var(--row-active); box-shadow: inset 3px 0 0 var(--accent); }
.status-icon { font-size: 14px; flex-shrink: 0; width: 18px; text-align: center; margin-top: 1px; }
.status-icon.passed { color: var(--pass); }
.status-icon.failed { color: var(--fail); }
.status-icon.skipped { color: var(--skip); }
.status-icon.flaky { color: var(--flaky); }
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
  flex-wrap: wrap;
  align-items: center;
}
.chip {
  font-size: 10px;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 1px 7px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.chip.retry { color: var(--flaky); border-color: var(--flaky); }
.tag-chip {
  font-size: 10px;
  color: var(--accent);
  background: var(--info-bg);
  border-radius: 4px;
  padding: 1px 6px;
  font-family: "SFMono-Regular", Consolas, monospace;
}
.test-row-tags { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }

/* ---------- Detail panel ---------- */
.detail { flex: 1; overflow-y: auto; padding: 24px 32px; min-height: 0; }
.empty-state { color: var(--muted); font-size: 14px; margin-top: 40px; text-align: center; }

.breadcrumb { font-size: 13px; color: var(--muted); margin-bottom: 4px; }
.detail-title { font-size: 20px; font-weight: 700; margin: 0 0 12px; }
.badges { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 20px; }
.badge {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.badge.status-pill.passed { background: var(--pass-bg); color: var(--pass); }
.badge.status-pill.failed { background: var(--fail-bg); color: var(--fail); }
.badge.status-pill.skipped { background: var(--skip-bg); color: var(--skip); }
.badge.status-pill.flaky { background: var(--flaky-bg); color: var(--flaky); }
.badge.project-pill { background: var(--info-bg); color: var(--info); }
.badge.tag-pill { background: var(--bg); border: 1px solid var(--border); color: var(--muted); font-family: "SFMono-Regular", Consolas, monospace; }

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, max-content));
  gap: 4px 28px;
  margin-bottom: 20px;
  font-size: 13px;
}
.meta-grid .meta-label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.meta-grid .meta-value { font-family: "SFMono-Regular", Consolas, monospace; }

.artifacts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.artifact-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text);
  text-decoration: none;
  font-size: 12px;
}
.artifact-link:hover { background: var(--row-hover); }

/* ---------- Steps table ---------- */
table.steps-table { width: 100%; border-collapse: collapse; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
table.steps-table th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 1;
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
.step-duration { color: var(--muted); font-size: 11px; font-family: "SFMono-Regular", Consolas, monospace; margin-left: 8px; }
.http-method { font-weight: 700; padding: 1px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px; background: var(--info-bg); color: var(--info); }
.http-method.GET { background: var(--info-bg); color: var(--info); }
.http-method.POST { background: var(--pass-bg); color: var(--pass); }
.http-method.PUT, .http-method.PATCH { background: var(--flaky-bg); color: var(--flaky); }
.http-method.DELETE { background: var(--fail-bg); color: var(--fail); }
.http-status-ok { color: var(--pass); font-weight: 700; }
.http-status-warn { color: var(--flaky); font-weight: 700; }
.http-status-err { color: var(--fail); font-weight: 700; }

.step-error-message {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--fail-bg);
  color: var(--fail);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.stack-trace-toggle {
  margin-top: 6px;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 0;
  text-decoration: underline;
}
.stack-trace-toggle:hover { color: var(--text); }
.step-error-stack {
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-height: 320px;
  overflow-y: auto;
}
.screenshot-block { margin-top: 10px; }
.screenshot-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}
.step-screenshot {
  display: block;
  max-width: 320px;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: zoom-in;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.step-screenshot:hover { opacity: 0.9; transform: scale(1.01); }
.step-screenshot.step-screenshot-sm { max-width: 220px; }
tr.step-row-scenario .step-text { font-weight: 700; }
tr.step-row-nested { background: var(--bg); }
tr.step-row-nested .step-text { color: var(--muted); }
tr.step-row-nested .status-badge { font-size: 10px; padding: 2px 8px; }
tr.step-row-scenario { cursor: pointer; user-select: none; }
tr.step-row-scenario:hover { background: var(--row-hover); }
.step-toggle-icon {
  display: inline-block;
  width: 10px;
  margin-right: 6px;
  color: var(--muted);
  font-size: 10px;
  transition: transform 0.15s ease;
  transform: rotate(90deg);
}
tr.step-row-scenario.collapsed .step-toggle-icon { transform: rotate(0deg); }
tr.step-row-nested.step-row-hidden { display: none; }

/* ---------- Screenshot lightbox ---------- */
.screenshot-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100;
  cursor: zoom-out;
}
.screenshot-overlay img { max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: var(--shadow-md); }
.screenshot-overlay.hidden { display: none; }

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .body { flex-direction: column; }
  .sidebar { width: auto; max-height: 44vh; border-right: none; border-bottom: 1px solid var(--border); }
  .detail { padding: 18px 16px; }
  .summary-wrap { padding: 14px 16px; }
  .topbar { padding: 10px 16px; }
  .env-panel { padding: 12px 16px; }
}
@media (max-width: 520px) {
  .card { flex: 1 1 45%; }
  .brand-subtitle { display: none; }
  .run-timestamp { display: none; }
}
`;

const JS = `
(function () {
  const data = window.__REPORT_DATA__;
  const summaryEl = document.getElementById('summary');
  const envToggle = document.getElementById('envToggle');
  const envPanel = document.getElementById('envPanel');
  const projectsToggle = document.getElementById('projectsToggle');
  const projectsPanel = document.getElementById('projectsPanel');
  const testList = document.getElementById('testList');
  const detail = document.getElementById('detail');
  const search = document.getElementById('search');
  const projectFilter = document.getElementById('projectFilter');
  const filterPills = document.getElementById('filterPills');
  const resultCount = document.getElementById('resultCount');
  const themeToggle = document.getElementById('themeToggle');
  const runTimestamp = document.getElementById('runTimestamp');

  let selectedId = null;
  let statusFilterValue = 'all';

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

  function formatDateTime(ms) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms));
  }

  function formatDuration(ms) {
    if (ms < 1000) return ms + 'ms';
    const totalSec = ms / 1000;
    if (totalSec < 60) return totalSec.toFixed(2) + 's';
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toFixed(1);
    return m + 'm ' + s + 's';
  }

  // The one place the "flaky is its own bucket, not a subset of passed"
  // rule (see the model-shape comment atop extentReportHtml.js) is applied
  // client-side, so filtering/icons/counts can never disagree about which
  // bucket a test falls into.
  function bucketStatus(test) {
    if (test.flaky) return 'flaky';
    return test.status; // 'passed' | 'failed' | 'skipped'
  }

  function statusIcon(bucket) {
    if (bucket === 'passed') return '&#10004;';
    if (bucket === 'failed') return '&#10008;';
    if (bucket === 'flaky') return '&#9888;';
    return '&#9198;';
  }

  function renderSummary() {
    const m = data.meta;
    const cards = [
      ['total', '', 'Total', m.total],
      ['pass', '', 'Passed', m.passed],
      ['fail', '', 'Failed', m.failed],
      ['skip', '', 'Skipped', m.skipped],
      ['flaky', '&#9888;', 'Flaky', m.flaky],
      ['rate', '', 'Pass Rate', m.passPercent + '%'],
      ['duration', '', 'Duration', formatDuration(m.durationMs)],
    ];
    summaryEl.innerHTML = cards.map(function (c) {
      return '<div class="card ' + c[0] + '">' +
        '<div class="card-label">' + (c[1] ? '<span>' + c[1] + '</span>' : '') + '<span>' + c[2] + '</span></div>' +
        '<div class="card-value">' + c[3] + '</div>' +
      '</div>';
    }).join('');

    runTimestamp.textContent = 'Run: ' + formatDateTime(m.startTime);
  }

  function renderEnvPanel() {
    const m = data.meta;
    const fields = [
      ['Environment', m.environment],
      ['Operating System', m.os],
      ['Node Version', m.nodeVersion],
      ['Playwright Version', m.playwrightVersion],
      ['CI', m.ci ? 'Yes' : undefined],
      ['Build', m.buildNumber],
      ['Branch', m.branch],
      ['Commit', m.commit],
      ['Execution Start', formatDateTime(m.startTime)],
      ['Execution End', formatDateTime(m.endTime)],
      ['Total Duration', formatDuration(m.durationMs)],
    ].filter(function (f) { return f[1] !== undefined && f[1] !== null && f[1] !== ''; });

    if (!fields.length) {
      envPanel.innerHTML = '<div class="empty-state">No execution metadata available.</div>';
      return;
    }
    envPanel.innerHTML = fields.map(function (f) {
      return '<div class="env-item"><span class="env-label">' + escapeHtml(f[0]) + '</span><span class="env-value" title="' + escapeHtml(String(f[1])) + '">' + escapeHtml(f[1]) + '</span></div>';
    }).join('');
  }

  function renderProjects() {
    if (!data.projects || data.projects.length < 2) {
      projectsToggle.classList.add('hidden');
      return;
    }
    projectsToggle.classList.remove('hidden');
    projectsPanel.innerHTML = data.projects.map(function (p) {
      return '<div class="project-card">' +
        '<div class="project-card-name">' + escapeHtml(p.name || 'default') + '</div>' +
        '<div class="project-card-stats">' +
          '<span class="pass-n">' + p.passed + ' passed</span>' +
          '<span class="fail-n">' + p.failed + ' failed</span>' +
          (p.flaky ? '<span class="flaky-n">' + p.flaky + ' flaky</span>' : '') +
          (p.skipped ? '<span>' + p.skipped + ' skipped</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    const projectNames = data.projects.map(function (p) { return p.name; }).filter(Boolean);
    projectFilter.innerHTML = '<option value="all">All projects</option>' +
      projectNames.map(function (n) { return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>'; }).join('');
  }

  function renderFilterPills() {
    const counts = { all: data.tests.length, passed: 0, failed: 0, skipped: 0, flaky: 0 };
    data.tests.forEach(function (t) { counts[bucketStatus(t)] = (counts[bucketStatus(t)] || 0) + 1; });

    const pills = [
      ['all', 'All'],
      ['passed', 'Passed'],
      ['failed', 'Failed'],
      ['skipped', 'Skipped'],
      ['flaky', 'Flaky'],
    ];
    filterPills.innerHTML = pills.map(function (p) {
      return '<button type="button" class="pill' + (statusFilterValue === p[0] ? ' active' : '') + '" data-status="' + p[0] + '">' +
        p[1] + ' (' + (counts[p[0]] || 0) + ')' +
      '</button>';
    }).join('');

    filterPills.querySelectorAll('.pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        statusFilterValue = btn.getAttribute('data-status');
        renderFilterPills();
        renderList();
      });
    });
  }

  function matchesFilters(test) {
    const statusOk = statusFilterValue === 'all' || bucketStatus(test) === statusFilterValue;
    const projectOk = projectFilter.value === 'all' || test.project === projectFilter.value;
    const query = search.value.trim().toLowerCase();
    const haystack = (test.title + ' ' + test.project + ' ' + (test.tags || []).join(' ')).toLowerCase();
    const searchOk = !query || haystack.includes(query);
    return statusOk && projectOk && searchOk;
  }

  function renderList() {
    const filtered = data.tests.filter(matchesFilters);
    resultCount.textContent = filtered.length + ' of ' + data.tests.length + ' tests';

    testList.innerHTML = filtered.map(function (t) {
      const bucket = bucketStatus(t);
      const tagsHtml = (t.tags || []).length
        ? '<div class="test-row-tags">' + t.tags.map(function (tag) { return '<span class="tag-chip">' + escapeHtml(tag) + '</span>'; }).join('') + '</div>'
        : '';
      return '' +
        '<li class="test-row' + (t.id === selectedId ? ' active' : '') + '" data-id="' + t.id + '">' +
          '<span class="status-icon ' + bucket + '">' + statusIcon(bucket) + '</span>' +
          '<div class="test-row-main">' +
            '<div class="test-row-title" title="' + escapeHtml(t.title) + '">' + escapeHtml(t.title) + '</div>' +
            '<div class="test-row-meta">' +
              (t.project ? '<span class="chip">' + escapeHtml(t.project) + '</span>' : '') +
              '<span>' + formatDuration(t.durationMs) + '</span>' +
              (t.retry ? '<span class="chip retry">retry ' + t.retry + '</span>' : '') +
            '</div>' +
            tagsHtml +
          '</div>' +
        '</li>';
    }).join('') || '<li class="empty-state">No tests match.</li>';

    testList.querySelectorAll('.test-row[data-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        selectTest(row.getAttribute('data-id'));
      });
    });
  }

  // Detects a "METHOD /path" or "Response status: NNN" action row and
  // applies purely cosmetic verb/status-code coloring — a presentation-only
  // affordance for any API tests a project might add later. Reads the same
  // plain-text action rows UI tests already produce; no separate API data
  // model required, and no effect at all on a UI-only suite like this one.
  function decorateApiText(escapedText) {
    const methodMatch = escapedText.match(/^(GET|POST|PUT|PATCH|DELETE)\\b/);
    if (methodMatch) {
      const verb = methodMatch[1];
      return '<span class="http-method ' + verb + '">' + verb + '</span>' + escapedText.slice(verb.length);
    }
    const statusMatch = escapedText.match(/^(Response status: )(\\d+)/);
    if (statusMatch) {
      const code = parseInt(statusMatch[2], 10);
      const cls = code >= 500 ? 'http-status-err' : code >= 400 ? 'http-status-warn' : 'http-status-ok';
      return statusMatch[1] + '<span class="' + cls + '">' + statusMatch[2] + '</span>' + escapedText.slice(statusMatch[0].length);
    }
    return escapedText;
  }

  let stackTraceSeq = 0;

  function stepRow(step, autoExpand) {
    const depth = step.depth || 0;
    let details = '<div class="step-text" style="padding-left:' + (depth * 22) + 'px">';
    if (depth === 0) details += '<span class="step-toggle-icon">&#9654;</span>';
    if (step.keyword) details += '<span class="step-keyword">' + escapeHtml(step.keyword) + '</span>';
    details += decorateApiText(escapeHtml(step.text));
    details += '<span class="step-duration">' + formatDuration(step.durationMs) + '</span>';
    details += '</div>';

    if (step.errorMessage) {
      const stackId = 'stack-' + (stackTraceSeq++);
      details += '<div class="step-error-message">' + escapeHtml(step.errorMessage) + '</div>';
      if (step.errorStack) {
        details += '<button type="button" class="stack-trace-toggle" data-target="' + stackId + '">&#9656; Show stack trace</button>' +
          '<div class="step-error-stack hidden" id="' + stackId + '">' + escapeHtml(step.errorStack) + '</div>';
      }
    }
    if (step.screenshot) {
      details += '<div class="screenshot-block">' +
        '<div class="screenshot-label">&#128247; Screenshot</div>' +
        '<img class="step-screenshot' + (depth > 0 ? ' step-screenshot-sm' : '') +
        '" style="margin-left:' + (depth * 22) + 'px" src="' + step.screenshot + '" alt="Screenshot for: ' + escapeHtml(step.text) + '">' +
      '</div>';
    }

    // Collapsed by default (chevron pointing right, action rows hidden);
    // autoExpand starts a failed test's failing scenario open instead, so
    // the failure is visible without an extra click. The click handler in
    // selectTest() toggles both classes off together on later clicks.
    const rowClass = depth > 0
      ? 'step-row-nested' + (autoExpand ? '' : ' step-row-hidden')
      : 'step-row-scenario' + (autoExpand ? '' : ' collapsed');
    return '' +
      '<tr class="' + rowClass + '">' +
        '<td><span class="status-badge ' + step.status + '">' + step.status + '</span></td>' +
        '<td class="timestamp-cell">' + formatTime(step.timestamp) + '</td>' +
        '<td>' + details + '</td>' +
      '</tr>';
  }

  function renderSteps(steps, testStatus) {
    let scenarioFailed = false;
    return steps.map(function (step) {
      if (step.depth === 0) scenarioFailed = testStatus === 'failed' && step.status === 'fail';
      return stepRow(step, scenarioFailed);
    }).join('');
  }

  function artifactIcon(type) {
    if (type === 'screenshot') return '\\u{1F4F7}';
    if (type === 'trace') return '\\u{1F50D}';
    if (type === 'video') return '\\u{1F3A5}';
    if (type === 'log') return '\\u{1F4C4}';
    return '\\u{1F4E6}';
  }

  function renderArtifacts(test) {
    if (!test.artifacts || !test.artifacts.length) return '';
    return '<div class="artifacts">' + test.artifacts.map(function (a) {
      return '<a class="artifact-link" href="' + escapeHtml(a.path) + '" target="_blank" rel="noopener noreferrer">' +
        artifactIcon(a.type) + ' ' + escapeHtml(a.name) +
      '</a>';
    }).join('') + '</div>';
  }

  function selectTest(id) {
    selectedId = id;
    renderList();
    const test = data.tests.find(function (t) { return t.id === id; });
    if (!test) {
      detail.innerHTML = '<div class="empty-state">Select a test on the left to see its steps.</div>';
      return;
    }
    const bucket = bucketStatus(test);
    const titleParts = test.title.split(' › ');
    const leaf = titleParts.pop();
    const breadcrumb = titleParts.length ? titleParts.join(' › ') : '';

    const stepsHtml = test.steps.length
      ? renderSteps(test.steps, test.status)
      : '<tr><td colspan="3" class="empty-state">No steps recorded for this test.</td></tr>';

    detail.innerHTML = '' +
      (breadcrumb ? '<div class="breadcrumb">' + escapeHtml(breadcrumb) + '</div>' : '') +
      '<h2 class="detail-title">' + escapeHtml(leaf) + '</h2>' +
      '<div class="badges">' +
        '<span class="badge status-pill ' + bucket + '">' + bucket.toUpperCase() + (bucket === 'flaky' ? ' (passed on retry ' + test.retry + ')' : '') + '</span>' +
        (test.project ? '<span class="badge project-pill">' + escapeHtml(test.project) + '</span>' : '') +
        (test.tags || []).map(function (tag) { return '<span class="badge tag-pill">' + escapeHtml(tag) + '</span>'; }).join('') +
      '</div>' +
      '<div class="meta-grid">' +
        '<div><div class="meta-label">Start</div><div class="meta-value">' + formatTime(test.startTime) + '</div></div>' +
        '<div><div class="meta-label">End</div><div class="meta-value">' + formatTime(test.endTime) + '</div></div>' +
        '<div><div class="meta-label">Duration</div><div class="meta-value">' + formatDuration(test.durationMs) + '</div></div>' +
        '<div><div class="meta-label">Retry</div><div class="meta-value">' + test.retry + '</div></div>' +
      '</div>' +
      renderArtifacts(test) +
      '<table class="steps-table">' +
        '<thead><tr><th>Status</th><th>Time</th><th>Details</th></tr></thead>' +
        '<tbody>' + stepsHtml + '</tbody>' +
      '</table>';

    detail.querySelectorAll('.step-screenshot').forEach(function (img) {
      img.addEventListener('click', function (e) {
        e.stopPropagation(); // don't also toggle the step row underneath
        openLightbox(img.src);
      });
    });

    detail.querySelectorAll('.stack-trace-toggle').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const target = document.getElementById(btn.getAttribute('data-target'));
        const nowHidden = target.classList.toggle('hidden');
        btn.innerHTML = (nowHidden ? '&#9656; Show stack trace' : '&#9662; Hide stack trace');
      });
    });

    detail.querySelectorAll('tr.step-row-scenario').forEach(function (row) {
      row.addEventListener('click', function () {
        const collapsed = row.classList.toggle('collapsed');
        let sib = row.nextElementSibling;
        while (sib && sib.classList.contains('step-row-nested')) {
          sib.classList.toggle('step-row-hidden', collapsed);
          sib = sib.nextElementSibling;
        }
      });
    });
  }

  function openLightbox(src) {
    let overlay = document.getElementById('screenshotOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'screenshotOverlay';
      overlay.className = 'screenshot-overlay hidden';
      overlay.innerHTML = '<img alt="Full-size screenshot">';
      overlay.addEventListener('click', function () { closeLightbox(); });
      document.body.appendChild(overlay);
    }
    overlay.querySelector('img').src = src;
    overlay.classList.remove('hidden');
  }

  function closeLightbox() {
    const overlay = document.getElementById('screenshotOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });

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

  envToggle.addEventListener('click', function () {
    const nowHidden = envPanel.classList.toggle('hidden');
    envToggle.setAttribute('aria-expanded', String(!nowHidden));
  });

  projectsToggle.addEventListener('click', function () {
    const nowHidden = projectsPanel.classList.toggle('hidden');
    projectsToggle.setAttribute('aria-expanded', String(!nowHidden));
  });

  search.addEventListener('input', renderList);
  projectFilter.addEventListener('change', renderList);

  renderSummary();
  renderEnvPanel();
  renderProjects();
  renderFilterPills();
  renderList();
  if (data.tests.length) selectTest(data.tests[0].id);
})();
`;

module.exports = { renderReportHtml };
