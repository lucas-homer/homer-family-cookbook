// Same-origin check for state-changing requests, on top of SameSite=Lax cookies
// and POST-only endpoints.
//
// TanStack Start already applies an equivalent CSRF middleware to server
// functions by default, but only while the app has no src/start.ts (a custom
// start instance replaces the default request middleware). This check keeps the
// auth endpoints protected either way, and also covers the plain-form
// POST /logout route handler, which the default middleware doesn't touch.
//
// Browsers send Sec-Fetch-Site and/or Origin on every POST; a request with
// neither is treated as cross-site.
export const isSameOriginRequest = (request: Request): boolean => {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null) return fetchSite === "same-origin";
  const origin = request.headers.get("Origin");
  if (origin !== null) return origin === new URL(request.url).origin;
  return false;
};
