const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');

const SCREENSHOTS_ROOT = path.join(process.cwd(), 'screenshots');

// testId -> next step number. Reset per test via the `resetStepCounter`
// fixture teardown in fixtures/base.js so memory doesn't grow across a run.
const stepCounters = new Map();

function sanitizeSegment(text) {
  const cleaned = String(text)
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_match, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(/^[a-z]/, (c) => c.toUpperCase());
  return cleaned || 'Step';
}

function testNamePrefix(testInfo) {
  const baseName = path.basename(testInfo.file).replace(/\.spec\.[jt]s$/, '');
  return sanitizeSegment(baseName);
}

function testFolder(testInfo) {
  const prefix = testNamePrefix(testInfo);
  // titlePath[0] is the spec file path; the remaining entries are the
  // describe-block path plus the test title itself. Drop a leading describe
  // segment that just repeats the file-derived prefix (e.g. a top-level
  // `describe('Login', ...)` in login.spec.js) to avoid Login/Login/....
  const rest = testInfo.titlePath.slice(1);
  const segments = rest
    .map(sanitizeSegment)
    .filter((segment, index) => !(index === 0 && segment === prefix));
  return path.join(SCREENSHOTS_ROOT, prefix, ...segments);
}

/**
 * Captures a screenshot for the current test step, saves it under a
 * per-test folder named `<TestName>_<NN>_<StepDescription>.png`, and
 * attaches it to the Playwright HTML report. Safe to call for both
 * passing and failing steps — capture failures never fail the test.
 */
async function captureStep(page, description) {
  const testInfo = test.info();
  const stepNumber = (stepCounters.get(testInfo.testId) || 0) + 1;
  stepCounters.set(testInfo.testId, stepNumber);

  const fileName = `${testNamePrefix(testInfo)}_${String(stepNumber).padStart(2, '0')}_${sanitizeSegment(description)}.png`;
  const folder = testFolder(testInfo);
  const filePath = path.join(folder, fileName);

  try {
    fs.mkdirSync(folder, { recursive: true });
    await page.screenshot({ path: filePath });
    await testInfo.attach(`${String(stepNumber).padStart(2, '0')}. ${description}`, {
      path: filePath,
      contentType: 'image/png',
    });
  } catch {
    // A closed page or a page mid-navigation shouldn't fail the test just
    // because a step screenshot couldn't be captured.
  }
}

function resetStepCounter(testId) {
  stepCounters.delete(testId);
}

module.exports = { captureStep, resetStepCounter };
