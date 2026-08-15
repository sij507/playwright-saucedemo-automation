// Centralized masking so passwords/tokens/keys never reach the report,
// console, or CI logs in plain text. Matches a sensitive label immediately
// followed by "label: value" and masks only the value portion, so callers
// don't need to remember to mask anything themselves — every description
// funnels through this once at its source (BasePage.perform, the assertion
// wrapper, navigation capture) and stays masked everywhere downstream.
const MASK = '********';
const SENSITIVE_RE = /\b((?:password|passwd|pwd|token|secret|api[-_ ]?key|authorization|auth)\s*:\s*)(\S.*)$/gim;

function sanitize(text) {
  if (text === null || text === undefined) return text;
  return String(text).replace(SENSITIVE_RE, `$1${MASK}`);
}

module.exports = { sanitize, MASK };
