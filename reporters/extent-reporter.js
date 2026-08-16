const fs = require('fs');
const os = require('os');
const path = require('path');
const { renderReportHtml } = require('./extentReportHtml');
const { humanize } = require('../utils/stepLogger');
const { sanitize } = require('../utils/sanitize');
const { version: installedPlaywrightVersion } = require('@playwright/test/package.json');

const BDD_KEYWORD_RE = /^(Given|When|Then|And|But)\b\s*/;

function splitBddKeyword(title) {
  const match = title.match(BDD_KEYWORD_RE);
  if (!match) return { keyword: null, text: title };
  return { keyword: match[1], text: title.slice(match[0].length) };
}

// Playwright formats step/matcher errors with ANSI color codes for terminal
// output; strip them so they don't show up as literal "[2m", "[39m", etc.
// in the HTML report.
function stripAnsi(str) {
  if (!str) return str;
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// testInfo.attach() calls made inside a test.step() don't append to that
// step's own `.attachments` — Playwright records each attach() as its own
// child step (category 'test.attach') nested under the step that was active
// when it ran. So a step's screenshot lives on a direct 'test.attach' child,
// not on the step itself. Deliberately NOT recursing into nested test.step
// children here: since every meaningful action (BasePage.perform(),
// navigation, assertions) is now its own test.step with its own row, a
// parent BDD step recursing into its children would "steal" a child
// action's screenshot instead of showing its own.
function directAttachments(step) {
  const acc = [];
  for (const child of step.steps || []) {
    if (child.category === 'test.attach' && child.attachments) acc.push(...child.attachments);
  }
  return acc;
}

// The wrapped `expect` (fixtures/base.js) can't rewrite a step's title after
// the fact — test.step()'s title is fixed at creation, before pass/fail is
// known — so on failure it ships the richer "FAILED — Expected: X, Actual:
// Y" text as a 'failure-summary' text attachment instead. When present, this
// is what the report displays in place of the plain pass-style title.
function findFailureSummary(step) {
  const attachment = directAttachments(step).find((a) => a.name === 'failure-summary');
  if (!attachment) return null;
  if (attachment.body) return attachment.body.toString('utf-8');
  if (attachment.path) {
    try {
      return fs.readFileSync(attachment.path, 'utf-8');
    } catch {
      return null;
    }
  }
  return null;
}

function imageToDataUri(image) {
  if (!image) return null;
  let buffer = image.body;
  if (!buffer && image.path) {
    try {
      buffer = fs.readFileSync(image.path);
    } catch {
      return null;
    }
  }
  if (!buffer) return null;
  return `data:${image.contentType};base64,${buffer.toString('base64')}`;
}

function extractScreenshot(step) {
  const image = directAttachments(step).find((a) => a.contentType && a.contentType.startsWith('image/'));
  return imageToDataUri(image);
}

// Fallback for a rare edge case: when a step's testInfo.attach() call is the
// very last thing to happen before the test body returns (no further await
// after it), Playwright hadn't yet folded the resulting attachment into the
// step tree by the time that step's own onStepEnd fired — so extractScreenshot
// found nothing even though the screenshot genuinely exists. TestResult's
// flat attachment list *is* complete by onTestEnd, so this runs as a second
// pass there, matching back by name (captureStep names each attachment
// "<NN>. <description>", and <description> is always exactly the step's
// title); if more than one same-titled step in the test lost its attachment
// this way, prefer the highest step number, since in every observed case it
// was the last step.
function fillOrphanedScreenshots(row, resultAttachments) {
  if (!resultAttachments || !resultAttachments.length) return;
  for (const step of row.steps) {
    if (step.screenshot) continue;
    const suffix = `. ${step.title}`;
    const candidates = resultAttachments
      .filter((a) => a.contentType && a.contentType.startsWith('image/') && a.name.endsWith(suffix))
      .map((a) => ({ attachment: a, stepNumber: parseInt(a.name, 10) }))
      .filter((c) => !Number.isNaN(c.stepNumber))
      .sort((a, b) => b.stepNumber - a.stepNumber);
    if (candidates.length) step.screenshot = imageToDataUri(candidates[0].attachment);
  }
}

// When an action throws, Playwright doesn't just record the error on that
// action's own TestStep — the exception also propagates through every
// ancestor test.step() callback, so each ancestor's TestStep ends up with
// the *same* .error too. Without this, a failed "Then ..." row and the
// "Verify_toHaveText" action row nested under it would both show the
// identical error message/stack. Walk the (already depth-ordered) row list
// and clear a row's error text only when a descendant of its own already
// carries an error — i.e. only when the failure is genuinely duplicated,
// not just because that row happens to have children. A row whose failure
// isn't echoed by any child (e.g. a step that throws directly, with no
// nested perform()/expect call) keeps its own error text, so nothing is
// ever silently lost. Status ('fail') is untouched — only the error
// message/stack text is deduplicated.
function suppressDuplicateAncestorErrors(steps) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step.errorMessage) continue;

    let descendantHasError = false;
    for (let j = i + 1; j < steps.length && steps[j].depth > step.depth; j++) {
      if (steps[j].errorMessage) {
        descendantHasError = true;
        break;
      }
    }
    if (descendantHasError) {
      step.errorMessage = null;
      step.errorStack = null;
    }
  }
}

// Given/When/And/But describe setup or an action and aren't themselves a
// verification, so they're "info" unless they threw; "Then" steps and
// assertion steps (fixtures/base.js always names these "Assert <label>...")
// are treated as verifications, so a passing one is reported as "pass".
// Note: TestResult.status stays 'skipped' (its unset placeholder) for the
// entire test run and is only finalized once the test completes — so a step
// can't tell here whether its *test* ended up skipped; onTestEnd corrects
// row.steps to 'skip' retroactively once the real status is known.
function stepStatus(step) {
  if (step.error) return 'fail';
  const { keyword, text } = splitBddKeyword(step.title);
  if (keyword === 'Then' || /^Assert/i.test(text)) return 'pass';
  return 'info';
}

// Depth among *our* steps only (category 'test.step'), so a Given/When/Then
// step from the `step` fixture is depth 0 and a nested perform()/assertion
// step inside it is depth 1 — used to indent the report so action steps
// visually read as sub-steps of their scenario step.
function stepDepth(step) {
  let depth = 0;
  let current = step.parent;
  while (current) {
    if (current.category === 'test.step') depth += 1;
    current = current.parent;
  }
  return depth;
}

// Builds report rows via a true pre-order walk of Playwright's own step
// tree (step, then each test.step child in its natural nesting order,
// recursing) — NOT by sorting on step.startTime. Millisecond-resolution
// timestamps regularly tie between a step and the child it immediately
// starts (e.g. a "Given" step and the perform() call it kicks off both
// stamped in the same millisecond), and onStepEnd itself fires in
// completion order (children finish before their parent), so either one
// used as a sort key can put an action step before the scenario step it
// belongs to. Walking `step.steps` — populated in the order children were
// *started*, not completed — sidesteps the tie entirely.
function collectStepRows(step, depth, acc) {
  const { keyword, text } = splitBddKeyword(step.title);
  // On failure, an assertion step carries a richer "FAILED — Expected: X,
  // Actual: Y" summary as an attachment (see findFailureSummary) — shown in
  // place of the plain pass-style title so the failure detail stays on this
  // row only, never duplicated on the parent step/test.
  const failureSummary = step.error ? findFailureSummary(step) : null;
  acc.push({
    title: step.title,
    keyword,
    text: failureSummary || humanize(text),
    depth,
    status: stepStatus(step),
    timestamp: step.startTime.getTime(),
    durationMs: step.duration,
    screenshot: extractScreenshot(step),
    errorMessage: step.error && step.error.message ? sanitize(stripAnsi(step.error.message)) : null,
    errorStack: step.error && step.error.stack ? sanitize(stripAnsi(step.error.stack)) : null,
  });
  for (const child of step.steps || []) {
    if (child.category === 'test.step') collectStepRows(child, depth + 1, acc);
  }
}

function testStatus(resultStatus) {
  if (resultStatus === 'skipped') return 'skipped';
  if (resultStatus === 'passed') return 'passed';
  return 'failed'; // failed | timedOut | interrupted
}

// Generic, project-agnostic execution/CI metadata — read directly from
// well-known env vars (CircleCI's CIRCLE_*, GitHub Actions' GITHUB_*)
// rather than any project-specific config module, so this reporter (and
// extentReportHtml.js) stay portable to any Playwright project unchanged.
// Every field is optional: a value that isn't set simply doesn't render its
// row in the report's execution-info panel.
function collectExecutionMeta() {
  const shortSha = (sha) => (sha ? sha.slice(0, 7) : undefined);
  return {
    environment: process.env.TEST_ENV || process.env.NODE_ENV || undefined,
    os: `${os.type()} ${os.release()}`,
    nodeVersion: process.version,
    playwrightVersion: installedPlaywrightVersion,
    buildNumber: process.env.CIRCLE_BUILD_NUM || process.env.GITHUB_RUN_NUMBER || undefined,
    branch: process.env.CIRCLE_BRANCH || process.env.GITHUB_REF_NAME || undefined,
    commit: shortSha(process.env.CIRCLE_SHA1 || process.env.GITHUB_SHA),
    ci: Boolean(process.env.CI),
  };
}

function inferArtifactType(attachment) {
  if (attachment.name === 'trace' || attachment.contentType === 'application/zip') return 'trace';
  if (attachment.contentType && attachment.contentType.startsWith('video/')) return 'video';
  if (attachment.contentType && attachment.contentType.startsWith('image/')) return 'screenshot';
  if (attachment.contentType && attachment.contentType.startsWith('text/')) return 'log';
  return 'file';
}

// Test-level artifacts (trace.zip, video.webm, Playwright's own
// auto-captured failure screenshot, error-context.md) — distinct from the
// step screenshot already embedded inline as base64 (see the `step`
// fixture in fixtures/base.js). Those always carry `body`; genuine file
// artifacts always carry `path` instead, which is what tells them apart
// here. Paths are resolved relative to the report's own output directory
// so a link still works if the whole report directory is moved or
// uploaded as a unit — but note this only holds when extent-report/ keeps
// its sibling test-results/ directory alongside it; a report file copied
// out on its own (e.g. downloaded from a chat attachment) loses that and
// the links 404, since there's no way to embed multi-MB traces/videos
// inline without breaking the "keep it lightweight" goal.
function collectArtifacts(outputDir, attachments) {
  const absoluteOutputDir = path.resolve(outputDir);
  const artifacts = [];
  for (const attachment of attachments || []) {
    if (!attachment.path) continue;
    artifacts.push({
      name: attachment.name,
      type: inferArtifactType(attachment),
      path: path.relative(absoluteOutputDir, attachment.path),
    });
  }
  return artifacts;
}

// Compact per-project (per-browser) pass/fail/skip/flaky breakdown for the
// dashboard's expandable "Projects" panel — pure aggregation over the
// already-collected test rows, no extra Playwright capture needed. A flaky
// test counts only toward `flaky`, never also toward `passed` — same rule
// as the top-level dashboard counts in onEnd(), so the two never disagree.
function buildProjectSummaries(tests) {
  const byProject = new Map();
  for (const t of tests) {
    const name = t.project || 'default';
    const summary = byProject.get(name) || { name, total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 };
    summary.total += 1;
    if (t.flaky) summary.flaky += 1;
    else if (t.status === 'passed') summary.passed += 1;
    else if (t.status === 'failed') summary.failed += 1;
    else if (t.status === 'skipped') summary.skipped += 1;
    byProject.set(name, summary);
  }
  return [...byProject.values()].sort((a, b) => a.name.localeCompare(b.name));
}

class ExtentReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || 'extent-report';
    this.outputFile = options.outputFile || 'index.html';
    this.tests = new Map(); // testCase.id -> report row (last attempt wins on retry)
    this.runStartTime = 0;
    this.executionMeta = collectExecutionMeta();
    if (options.environment) this.executionMeta.environment = options.environment;
  }

  onBegin() {
    this.runStartTime = Date.now();
  }

  onTestBegin(test, result) {
    const project = test.parent && test.parent.project ? test.parent.project() : undefined;
    const titlePath = test.titlePath().slice(2);

    this.tests.set(test.id, {
      id: test.id,
      title: titlePath.length ? titlePath.join(' › ') : test.title,
      project: project ? project.name : '',
      status: 'passed',
      flaky: false,
      retry: result.retry,
      tags: test.tags || [],
      startTime: result.startTime.getTime(),
      endTime: result.startTime.getTime(),
      durationMs: 0,
      steps: [],
      artifacts: [],
    });
  }

  onStepEnd(test, result, step) {
    // Only act on root-level test.step nodes (no test.step ancestor) — by
    // the time a step's own onStepEnd fires, all of its descendants have
    // already finished, so its `.steps` tree is fully populated and can be
    // walked in one go. Acting on every depth here would both double-count
    // nested steps and lose the correct parent-before-children ordering
    // (see collectStepRows for why sorting by timestamp doesn't work).
    if (step.category !== 'test.step' || stepDepth(step) !== 0) return;
    const row = this.tests.get(test.id);
    if (!row) return;

    collectStepRows(step, 0, row.steps);
  }

  onTestEnd(test, result) {
    const row = this.tests.get(test.id);
    if (!row) return;

    fillOrphanedScreenshots(row, result.attachments);
    suppressDuplicateAncestorErrors(row.steps);

    row.status = testStatus(result.status);
    row.startTime = result.startTime.getTime();
    row.durationMs = result.duration;
    row.endTime = row.startTime + result.duration;
    row.retry = result.retry;
    // test.outcome() reflects *all* attempts recorded on the TestCase so
    // far, not just this one — onTestBegin resets a fresh row on every
    // retry, so only the row built for the *final* attempt survives into
    // onEnd(), and by then every attempt has been recorded. Safe to read
    // unconditionally here rather than gating on "is this the last attempt".
    row.flaky = test.outcome() === 'flaky';
    row.artifacts = collectArtifacts(this.outputDir, result.attachments);

    if (row.status === 'skipped') {
      for (const step of row.steps) step.status = 'skip';
    }
  }

  async onEnd() {
    const tests = [...this.tests.values()].sort((a, b) => a.startTime - b.startTime);
    const total = tests.length;
    // A flaky test's final `status` is 'passed' (that's its literal
    // TestResult.status), so `passed` explicitly excludes flaky ones here —
    // otherwise the same test would be counted in both the "Passed" and
    // "Flaky" dashboard tiles. Chosen counting model (documented once,
    // here): clean pass -> passed, ultimate failure -> failed, skipped ->
    // skipped, failed-then-passed-on-retry -> flaky. Every test.id appears
    // exactly once in `this.tests` regardless of how many retry attempts
    // it took, so no test is ever double-counted across these buckets.
    const flaky = tests.filter((t) => t.flaky).length;
    const passed = tests.filter((t) => t.status === 'passed' && !t.flaky).length;
    const failed = tests.filter((t) => t.status === 'failed').length;
    const skipped = tests.filter((t) => t.status === 'skipped').length;
    const endTime = Date.now();

    const model = {
      meta: {
        startTime: this.runStartTime,
        endTime,
        durationMs: endTime - this.runStartTime,
        total,
        passed,
        failed,
        skipped,
        flaky,
        passPercent: total ? Math.round((passed / total) * 1000) / 10 : 0,
        ...this.executionMeta,
      },
      tests,
      projects: buildProjectSummaries(tests),
    };

    const html = renderReportHtml(model);
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(path.join(this.outputDir, this.outputFile), html, 'utf-8');
  }
}

module.exports = ExtentReporter;
