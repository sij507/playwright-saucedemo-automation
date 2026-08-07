const fs = require('fs');
const path = require('path');
const { test } = require('@playwright/test');
const { logStep } = require('./stepLogger');

const SCREENSHOTS_ROOT = path.join(process.cwd(), 'screenshots');

// testId -> next step number. Deliberately never cleared: testId is unique
// per test, so a new test always starts at a fresh (unset) counter anyway,
// and eagerly deleting entries on fixture teardown raced with a step whose
// promise was still pending when a whole-test timeout tore fixtures down —
// see fixtures/base.js's `page` fixture for the full explanation.
const stepCounters = new Map();

// Descriptions can embed arbitrary test data (e.g. the "extremely long
// input values" edge case fills a 1000-character username into "Enter
// username: <value>"). Long enough and the sanitized filename blows past
// the filesystem's ~255-byte limit, making page.screenshot({ path }) fail
// silently (caught below) — so anything derived from the description, on
// disk or in the report, uses this truncated form instead of the raw one.
function truncate(text, maxLength = 80) {
  const str = String(text);
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}

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

function nextStepNumber(testId) {
  const stepNumber = (stepCounters.get(testId) || 0) + 1;
  stepCounters.set(testId, stepNumber);
  return stepNumber;
}

async function saveScreenshot(page, testInfo, stepNumber, description) {
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

/**
 * Records a passed step: screenshots the page, saves it under a per-test
 * folder named `<TestName>_<NN>_<StepDescription>.png`, attaches it to the
 * report, and prints a `STEP N - description - PASS` console line.
 */
async function captureStep(page, description) {
  const testInfo = test.info();
  const stepNumber = nextStepNumber(testInfo.testId);
  const safeDescription = truncate(description);

  await saveScreenshot(page, testInfo, stepNumber, safeDescription);
  logStep({ testId: testInfo.testId, testName: testInfo.title, stepNumber, description: safeDescription, status: 'PASS' });
}

/**
 * Records a failed step (an action or assertion that threw): same step
 * numbering/screenshot/console line as captureStep, but status FAIL with
 * the error message. Never throws itself — the caller is expected to
 * re-throw the original error after calling this.
 */
async function captureStepFailure(page, description, error) {
  const testInfo = test.info();
  const stepNumber = nextStepNumber(testInfo.testId);
  const safeDescription = truncate(description);

  await saveScreenshot(page, testInfo, stepNumber, safeDescription);
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
