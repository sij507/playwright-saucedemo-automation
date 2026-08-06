const fs = require('fs');
const path = require('path');
const { renderReportHtml } = require('./extentReportHtml');

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
// when it ran. So a Given/When/Then step's screenshot lives on a descendant,
// not on the step itself, and has to be found by walking `step.steps`.
function collectAttachments(step, acc = []) {
  if (step.attachments && step.attachments.length) acc.push(...step.attachments);
  for (const child of step.steps || []) collectAttachments(child, acc);
  return acc;
}

// fixtures/extentStep.js always names its screenshot attachment 'screenshot'
// — matching on that name (rather than just "first image found") keeps this
// isolated from unrelated attachments other fixtures/tests might add.
function extractScreenshot(step) {
  const image = collectAttachments(step).find((a) => a.name === 'screenshot' && a.contentType.startsWith('image/'));
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

// Given/When/And/But describe setup or an action and aren't themselves a
// verification, so they're "info" unless they threw; "Then" is treated as
// the verification step, so a passing one is reported as "pass". Note:
// TestResult.status stays 'skipped' (its unset placeholder) for the entire
// test run and is only finalized once the test completes — so a step can't
// tell here whether its *test* ended up skipped; onTestEnd corrects
// row.steps to 'skip' retroactively once the real status is known.
function stepStatus(step) {
  if (step.error) return 'fail';
  const { keyword } = splitBddKeyword(step.title);
  return keyword === 'Then' ? 'pass' : 'info';
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
    if (step.category !== 'test.step') return;
    const row = this.tests.get(test.id);
    if (!row) return;

    const { keyword, text } = splitBddKeyword(step.title);
    row.steps.push({
      title: step.title,
      keyword,
      text,
      status: stepStatus(step),
      timestamp: step.startTime.getTime(),
      durationMs: step.duration,
      screenshot: extractScreenshot(step),
      errorMessage: step.error && step.error.message ? stripAnsi(step.error.message) : null,
      errorStack: step.error && step.error.stack ? stripAnsi(step.error.stack) : null,
    });
  }

  onTestEnd(test, result) {
    const row = this.tests.get(test.id);
    if (!row) return;

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
