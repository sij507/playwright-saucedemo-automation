const { test } = require('@playwright/test');
const { logStep } = require('./stepLogger');

// testId -> next step number. Deliberately never cleared: testId is unique
// per test, so a new test always starts at a fresh (unset) counter anyway,
// and eagerly deleting entries on fixture teardown raced with a step whose
// promise was still pending when a whole-test timeout tore fixtures down —
// see fixtures/base.js's `page` fixture for the full explanation.
const stepCounters = new Map();

// Descriptions can embed arbitrary test data (e.g. the "extremely long
// input values" edge case fills a 1000-character username into "Enter
// username: <value>") — truncated so a single console log line, and the
// step's title/text in the extent report, never balloon to match.
function truncate(text, maxLength = 80) {
  const str = String(text);
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}

function nextStepNumber(testId) {
  const stepNumber = (stepCounters.get(testId) || 0) + 1;
  stepCounters.set(testId, stepNumber);
  return stepNumber;
}

/**
 * Records a passed action: prints a `STEP N - description - PASS` console
 * line. No screenshot is captured or attached here — only the test-step
 * level (fixtures/base.js's `step` fixture) still takes one; action-level
 * screenshots were removed to avoid duplicating it. `page` is accepted for
 * call-site compatibility with the pre-removal signature but is unused.
 */
// eslint-disable-next-line no-unused-vars
async function captureStep(page, description) {
  const testInfo = test.info();
  const stepNumber = nextStepNumber(testInfo.testId);
  const safeDescription = truncate(description);

  logStep({ testId: testInfo.testId, testName: testInfo.title, stepNumber, description: safeDescription, status: 'PASS' });
}

/**
 * Records a failed action (that threw): same step numbering/console line as
 * captureStep, but status FAIL with the error message. No screenshot, same
 * as captureStep. Never throws itself — the caller is expected to re-throw
 * the original error after calling this.
 */
// eslint-disable-next-line no-unused-vars
async function captureStepFailure(page, description, error) {
  const testInfo = test.info();
  const stepNumber = nextStepNumber(testInfo.testId);
  const safeDescription = truncate(description);

  logStep({
    testId: testInfo.testId,
    testName: testInfo.title,
    stepNumber,
    description: safeDescription,
    status: 'FAIL',
    error: error && error.message ? error.message : String(error),
  });
}

module.exports = { captureStep, captureStepFailure, truncate };
