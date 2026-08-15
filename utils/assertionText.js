// Builds human-readable "Assert <label>: <value>" descriptions for the
// wrapped `expect` in fixtures/base.js, plus a concise "FAILED — Expected:
// X, Actual: Y" summary when a matcher throws. Two separate builders because
// test.step()'s title is fixed at creation time (before pass/fail is known),
// so the failure text is shipped to the reporter via a 'failure-summary'
// attachment instead of ever trying to rewrite the step's own title.
const { truncate } = require('./screenshotRecorder');

// Playwright formats matcher failure messages with ANSI color codes even
// when running non-interactively — must be stripped before regex-parsing
// the "Received:" line, or the codes (and the quotes they sit next to) get
// captured as part of the value.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
function stripAnsi(str) {
  return str ? str.replace(ANSI_RE, '') : str;
}

function isLocator(subject) {
  return !!subject && typeof subject.page === 'function' && typeof subject.toString === 'function';
}

// Locator#toString() is 'locator('.foo')' for a plain CSS/text selector, but
// a chained locator (.filter(...).getByRole(...)) stringifies to the whole
// chain with no single selector to pull out — fall back to the raw chain
// (truncated) rather than failing to produce a label at all.
function describeSubjectLabel(subject) {
  if (!isLocator(subject)) return null;
  let raw;
  try {
    raw = subject.toString();
  } catch {
    return null;
  }
  if (typeof raw !== 'string' || !raw.startsWith("locator(")) return null;
  const simple = raw.match(/^locator\('([^']*)'\)$/);
  return truncate(simple ? simple[1] : raw, 60);
}

function formatValue(value) {
  if (value === undefined) return '';
  if (value instanceof RegExp) return value.toString();
  if (typeof value === 'string') return value;
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    try {
      return truncate(JSON.stringify(value), 100);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function humanizeMatcherName(prop) {
  return prop
    .replace(/^to/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
}

// kind: 'exact' -> "Assert <label>: <value>" / 'contains' -> "Assert <label>
// contains: <value>" / 'boolean' -> "Assert <label>: true|false".
const MATCHER_CONFIG = {
  toHaveURL: (args) => {
    const expected = args[0];
    return {
      label: 'page URL',
      expectedDisplay: formatValue(expected),
      kind: expected instanceof RegExp ? 'contains' : 'exact',
    };
  },
  toHaveText: (args, label) => ({
    label: label ? `${label} text` : 'text',
    expectedDisplay: formatValue(args[0]),
    kind: 'exact',
  }),
  toContainText: (args, label) => ({
    label: label ? `${label} text` : 'text',
    expectedDisplay: formatValue(args[0]),
    kind: 'contains',
  }),
  toBeVisible: () => ({ label: 'visible', expectedDisplay: 'true', kind: 'boolean' }),
  toBeHidden: () => ({ label: 'hidden', expectedDisplay: 'true', kind: 'boolean' }),
  toBeEnabled: () => ({ label: 'enabled', expectedDisplay: 'true', kind: 'boolean' }),
  toBeDisabled: () => ({ label: 'disabled', expectedDisplay: 'true', kind: 'boolean' }),
  toHaveCount: (args, label) => ({
    label: label ? `${label} count` : 'count',
    expectedDisplay: formatValue(args[0]),
    kind: 'exact',
  }),
  toBeGreaterThan: (args) => ({ label: 'value', expectedDisplay: `> ${formatValue(args[0])}`, kind: 'exact' }),
  toBeLessThan: (args) => ({ label: 'value', expectedDisplay: `< ${formatValue(args[0])}`, kind: 'exact' }),
  toBe: (args) => ({ label: 'value', expectedDisplay: formatValue(args[0]), kind: 'exact' }),
  toEqual: (args) => ({ label: 'value', expectedDisplay: formatValue(args[0]), kind: 'exact' }),
};

function getConfig(prop, args, subject, negated) {
  const label = describeSubjectLabel(subject);
  const builder = MATCHER_CONFIG[prop];
  const base = builder
    ? builder(args, label)
    : { label: label || humanizeMatcherName(prop), expectedDisplay: args.length ? formatValue(args[0]) : '', kind: 'exact' };

  if (!negated) return base;
  if (base.kind === 'boolean') {
    return { ...base, expectedDisplay: base.expectedDisplay === 'true' ? 'false' : 'true' };
  }
  return { ...base, label: `not ${base.label}` };
}

function describeAssertion(prop, args, subject, negated) {
  const { label, expectedDisplay, kind } = getConfig(prop, args, subject, negated);
  const prefix = `Assert ${label}`;
  if (kind === 'contains') return `${prefix} contains: ${expectedDisplay}`;
  return `${prefix}: ${expectedDisplay}`;
}

// Playwright's failure message format differs per matcher (verified against
// real output — see the __probe__ spec used during development): toHaveURL
// uses "Expected pattern:"/"Received string:", most others use a plain
// "Expected:"/"Received:" pair, and toEqual on arrays/objects prints a diff
// with no single clean "actual" line at all — returns null in that case so
// the caller falls back to the plain (non-reconstructed) description instead
// of fabricating a misleading one-line summary.
function parseActualFromError(errorMessage) {
  if (!errorMessage) return null;
  const clean = stripAnsi(errorMessage);
  const urlMatch = clean.match(/Received string:\s*"?(.*?)"?\s*(?:\n|$)/);
  if (urlMatch) return urlMatch[1];
  const genericMatch = clean.match(/Received:\s*"?(.*?)"?\s*(?:\n|$)/);
  if (genericMatch) return genericMatch[1];
  return null;
}

// Boolean-kind matchers (toBeVisible, etc.) never need error-message
// parsing: if the expected state didn't hold, the actual state is simply
// its logical opposite.
function buildFailureSummary(prop, args, subject, error, negated) {
  const { label, expectedDisplay, kind } = getConfig(prop, args, subject, negated);
  const prefix = `Assert ${label} FAILED`;

  if (kind === 'boolean') {
    const actual = expectedDisplay === 'true' ? 'false' : 'true';
    return `${prefix} — Expected: ${expectedDisplay}, Actual: ${actual}`;
  }

  const actual = parseActualFromError(error && error.message);
  if (actual === null) return null;
  if (kind === 'contains') return `${prefix} — Expected to contain: ${expectedDisplay}, Actual: ${actual}`;
  return `${prefix} — Expected: ${expectedDisplay}, Actual: ${actual}`;
}

module.exports = { describeAssertion, buildFailureSummary };
