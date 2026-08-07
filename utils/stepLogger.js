// Prints one line per test step to stdout — visible directly in a local
// terminal run and in the CircleCI job's step output, with no extra CI
// wiring needed. Reused by utils/screenshotRecorder.js so console logging
// stays in sync with the same step numbering used for screenshots.

const announcedTests = new Set(); // testId -> [Test: Name] header already printed

// Only reshapes raw identifier-style descriptions (e.g. the auto-generated
// "Verify_toHaveURL"). Descriptions page objects already write as plain
// phrases (e.g. "Enter username: standard_user") are left untouched, so an
// underscore inside an actual value like a username never gets mangled.
function humanize(description) {
  const text = String(description);
  if (/\s/.test(text)) return text;

  return text
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function logStep({ testId, testName, stepNumber, description, status, error }) {
  if (!announcedTests.has(testId)) {
    announcedTests.add(testId);
    // eslint-disable-next-line no-console
    console.log(`\n[Test: ${testName}]`);
  }

  const line = `[${timestamp()}] STEP ${stepNumber} - ${humanize(description)} - ${status}`;
  // eslint-disable-next-line no-console
  console.log(line);

  if (status === 'FAIL' && error) {
    // eslint-disable-next-line no-console
    console.log(`  ↳ ${error}`);
  }
}

module.exports = { logStep, humanize };
