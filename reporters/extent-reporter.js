const fs = require('fs');
const path = require('path');
const { renderReportHtml } = require('./extentReportHtml');
const { humanize } = require('../utils/stepLogger');

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

// Given/When/And/But describe setup or an action and aren't themselves a
// verification, so they're "info" unless they threw; "Then" steps and
// assertion steps (fixtures/base.js always names these "Verify_<matcher>")
// are treated as verifications, so a passing one is reported as "pass".
// Note: TestResult.status stays 'skipped' (its unset placeholder) for the
// entire test run and is only finalized once the test completes — so a step
// can't tell here whether its *test* ended up skipped; onTestEnd corrects
// row.steps to 'skip' retroactively once the real status is known.
function stepStatus(step) {
  if (step.error) return 'fail';
  const { keyword, text } = splitBddKeyword(step.title);
  if (keyword === 'Then' || /^Verify/i.test(text)) return 'pass';
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
  acc.push({
    title: step.title,
    keyword,
    text: humanize(text),
    depth,
    status: stepStatus(step),
    timestamp: step.startTime.getTime(),
    durationMs: step.duration,
    screenshot: extractScreenshot(step),
    errorMessage: step.error && step.error.message ? stripAnsi(step.error.message) : null,
    errorStack: step.error && step.error.stack ? stripAnsi(step.error.stack) : null,
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

class ExtentReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || 'extent-report';
    this.outputFile = options.outputFile || 'index.html';
    this.tests = new Map(); // testCase.id -> report row (last attempt wins on retry)
    this.runStartTime = 0;
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
      startTime: result.startTime.getTime(),
      endTime: result.startTime.getTime(),
      durationMs: 0,
      steps: [],
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

    row.status = testStatus(result.status);
    row.startTime = result.startTime.getTime();
    row.durationMs = result.duration;
    row.endTime = row.startTime + result.duration;

    if (row.status === 'skipped') {
      for (const step of row.steps) step.status = 'skip';
    }
  }

  async onEnd() {
    const tests = [...this.tests.values()].sort((a, b) => a.startTime - b.startTime);
    const total = tests.length;
    const passed = tests.filter((t) => t.status === 'passed').length;
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
        passPercent: total ? Math.round((passed / total) * 1000) / 10 : 0,
      },
      tests,
    };

    const html = renderReportHtml(model);
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(path.join(this.outputDir, this.outputFile), html, 'utf-8');
  }
}

module.exports = ExtentReporter;
