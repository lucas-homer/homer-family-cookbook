// Post-login redirect targets come from the query string, so they are
// attacker-controlled. Only same-origin relative paths are allowed; anything
// else falls back to a fixed path. (The legacy app accepted any value here.)

const PROBE_ORIGIN = "https://redirect-check.invalid";
const MAX_LENGTH = 2048;

export const safeRedirectTo = (value: unknown, fallback = "/"): string => {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_LENGTH) return fallback;
  // One leading slash, not "//" (protocol-relative) or "/\" (browsers treat "\" as "/").
  if (value[0] !== "/" || value[1] === "/" || value[1] === "\\") return fallback;
  // Backslashes, whitespace and control characters: URL parsers strip or
  // rewrite these ("/\t/evil.com" becomes "//evil.com"), so refuse them all.
  if (/[\\\s\u0000-\u001f\u007f]/.test(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  // Belt and braces: whatever the parser made of it must stay on our origin.
  if (url.origin !== PROBE_ORIGIN) return fallback;
  // Never bounce back into the auth pages themselves.
  if (url.pathname === "/login" || url.pathname === "/logout") return fallback;
  // Dot-segment removal can manufacture a new "//" prefix ("/a/../..//evil.com"
  // becomes "//evil.com"), so check the normalised path the same way.
  const result = url.pathname + url.search + url.hash;
  if (result[1] === "/" || result[1] === "\\") return fallback;
  return result;
};
