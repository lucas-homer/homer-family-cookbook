import type { D1Client } from "@effect/sql-d1/D1Client";
import { Cause, Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import { inviteUnavailableMessage, join, login } from "../auth/flows";
import { getOpenInvite } from "../auth/invites";
import type { SessionUser } from "../auth/current-user";
import { requestPasswordReset } from "../auth/password-reset";
import { limitLoginAttempts, limitResetRequests } from "../auth/rate-limit";
import { sendEmail } from "../email";
import { createSession, deleteSession, validateSession } from "../auth/session";
import { readCategories, readCategory } from "../categories/read";
import { type AppError, Unauthenticated } from "../errors";
import { listFavoriteCategories, listFavorites, setFavorite } from "../favorites";
import { listRecentlyViewed } from "../reads";
import { readRecipe, searchRecipes } from "../recipes/read";
import { readRecipeViewerData } from "../recipes/viewer-data";
import { deleteRecipeMedia, listRecipeMedia, serveRecipeMedia, uploadRecipeMedia } from "../media";

// JSON API for the iOS app, served at /api/v1/*. It reuses the same Effect
// modules as the website.
//
// Auth is a bearer token only: `Authorization: Bearer <token>`. The token is a
// row in the same `sessions` table the website uses (stored hashed), created
// by POST /api/v1/auth/token. The API never reads the session cookie, so a
// browser on another site can't ride a signed-in user's cookie into it, and it
// sends no CORS headers.

type Handler = Effect.Effect<Response, AppError | SqlError, SqlClient | D1Client>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const bearerToken = (request: Request): string | null => {
  const match = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(request.headers.get("Authorization") ?? "");
  return match?.[1] ?? null;
};

const optionalUser = (request: Request): Effect.Effect<SessionUser | null, SqlError, SqlClient> =>
  Effect.gen(function* () {
    const token = bearerToken(request);
    if (!token) return null;
    const session = yield* validateSession(token);
    return session?.user ?? null;
  });

const requireUser = (request: Request) =>
  Effect.flatMap(optionalUser(request), (user) => (user ? Effect.succeed(user) : Effect.fail(new Unauthenticated())));

// Request bodies are JSON objects. Anything else decodes as {} and fails the
// handler's own Schema with a field error.
const readJson = (request: Request): Effect.Effect<Record<string, unknown>> =>
  Effect.promise(async () => {
    if (!(request.headers.get("Content-Type") ?? "").includes("application/json")) return {};
    try {
      const body: unknown = await request.json();
      return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  });

export interface LibraryRecipe {
  readonly id: string;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string | null;
  /** First photo, if the recipe has any (GET /api/v1/media/:id). */
  readonly coverMediaId?: string | null;
  // Course tag names, comma separated by the query and split here.
  readonly courses: readonly string[];
}

// Every recipe for the Library, A to Z, with its Course tags for the subtitle.
export const listLibrary = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<Omit<LibraryRecipe, "courses"> & { courses: string | null }>`
    SELECT r.id, r.title, u.first_name, u.last_name, (SELECT m.id FROM recipe_media m WHERE m.recipe_id = r.id AND m.kind = 'photo' ORDER BY m.position, m.id LIMIT 1) AS cover_media_id,
      (SELECT group_concat(name, char(31)) FROM (
        SELECT c.name FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id
        WHERE rc.recipe_id = r.id AND c.tag_group = 'course' ORDER BY c.name COLLATE NOCASE)) AS courses
    FROM recipes r JOIN users u ON u.id = r.user_id
    ORDER BY r.title COLLATE NOCASE, r.id`;
  return rows.map((row) => ({ ...row, courses: row.courses ? row.courses.split("\u001f") : [] }));
});

const SortParam = Schema.optional(Schema.Literals(["asc", "desc"]));
const query = (url: URL) => Object.fromEntries(url.searchParams);

const routes: ReadonlyArray<{
  readonly method: string;
  readonly pattern: RegExp;
  readonly run: (request: Request, url: URL, params: readonly string[]) => Handler;
}> = [
  {
    method: "POST",
    pattern: /^auth\/token$/,
    run: (request) =>
      Effect.gen(function* () {
        const body = yield* readJson(request);
        yield* limitLoginAttempts(request, String(body.email ?? ""));
        const { user } = yield* login({ email: body.email, password: body.password });
        const session = yield* createSession(user.id);
        return json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user }, 201);
      }),
  },
  {
    method: "DELETE",
    pattern: /^auth\/token$/,
    run: (request) =>
      Effect.gen(function* () {
        const token = bearerToken(request);
        if (token) yield* deleteSession(token);
        return new Response(null, { status: 204 });
      }),
  },
  {
    // Forgot password from the app: emails a link to the website's reset page.
    // Always 202, whether or not the email has an account.
    method: "POST",
    pattern: /^auth\/password-reset$/,
    run: (request, url) =>
      Effect.gen(function* () {
        const body = yield* readJson(request);
        yield* limitResetRequests(request, String(body.email ?? ""));
        const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
        yield* requestPasswordReset(body, { siteUrl: local ? url.origin : "https://homerfamilycookbook.com", send: sendEmail });
        return json({ ok: true }, 202);
      }),
  },
  {
    // An invite link opened in the app: who it's for, or why it can't be used.
    method: "GET",
    pattern: /^invites\/([^/]+)$/,
    run: (_request, _url, [token]) =>
      getOpenInvite(token ?? "").pipe(
        Effect.map((invite) => json({ invite: { email: invite.email, role: invite.role, expiresAt: invite.expiresAt } })),
        Effect.catchTag("InviteUnavailable", (error) =>
          Effect.succeed(json({ error: "InviteUnavailable", reason: error.reason, message: inviteUnavailableMessage(error.reason) }, 410)),
        ),
      ),
  },
  {
    // Redeem an invite: creates the account and signs it in, like the website's /join.
    method: "POST",
    pattern: /^auth\/join$/,
    run: (request) =>
      Effect.gen(function* () {
        const body = yield* readJson(request);
        const user = yield* join(body);
        const session = yield* createSession(user.id);
        return json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user }, 201);
      }),
  },
  { method: "GET", pattern: /^me$/, run: (request) => Effect.map(requireUser(request), (user) => json({ user })) },
  { method: "GET", pattern: /^recipes$/, run: () => Effect.map(listLibrary, (recipes) => json({ recipes })) },
  {
    method: "GET",
    pattern: /^recipes\/([^/]+)$/,
    run: (request, _url, [recipeId]) =>
      Effect.gen(function* () {
        const recipe = yield* readRecipe({ recipeId });
        const user = yield* optionalUser(request);
        const viewer = yield* readRecipeViewerData(user, { recipeId });
        const media = yield* listRecipeMedia(recipe.id);
        return json({ recipe: { ...recipe, media }, viewer: { isFavorite: viewer.isFavorite, canEditRecipe: viewer.canEditRecipe, notes: viewer.notes } });
      }),
  },
  {
    // Add a photo or video. The body is the file itself (not a form), with its
    // real Content-Type and Content-Length. ?width=&height= are optional.
    method: "POST",
    pattern: /^recipes\/([^/]+)\/media$/,
    run: (request, url, [recipeId]) =>
      Effect.gen(function* () {
        const user = yield* requireUser(request);
        const dimension = (name: string) => {
          const value = url.searchParams.get(name);
          return value === null || value === "" ? null : Number(value);
        };
        const media = yield* uploadRecipeMedia(user, {
          recipeId: recipeId ?? "",
          contentType: (request.headers.get("Content-Type") ?? "").split(";")[0]!.trim().toLowerCase(),
          contentLength: Number(request.headers.get("Content-Length") ?? "0"),
          width: dimension("width"),
          height: dimension("height"),
          body: request.body,
        });
        return json({ media }, 201);
      }),
  },
  {
    method: "DELETE",
    pattern: /^recipes\/([^/]+)\/media\/([^/]+)$/,
    run: (request, _url, [recipeId, mediaId]) =>
      Effect.gen(function* () {
        const user = yield* requireUser(request);
        return json(yield* deleteRecipeMedia(user, { recipeId, mediaId }));
      }),
  },
  { method: "GET", pattern: /^media\/([^/]+)$/, run: (request, _url, [mediaId]) => serveRecipeMedia(request, mediaId ?? "") },
  { method: "GET", pattern: /^tags$/, run: () => Effect.map(readCategories, (tags) => json({ tags })) },
  {
    method: "GET",
    pattern: /^tags\/([^/]+)$/,
    run: (_request, url, [categoryId]) =>
      Effect.gen(function* () {
        const { sort } = yield* Schema.decodeUnknownEffect(Schema.Struct({ sort: SortParam }))(query(url)).pipe(
          Effect.orElseSucceed(() => ({ sort: undefined })),
        );
        const withIds = (url.searchParams.get("with") ?? "").split(",").filter(Boolean);
        const page = yield* readCategory({ categoryId, sort: sort ?? "asc", with: withIds });
        return json(page);
      }),
  },
  {
    method: "GET",
    pattern: /^search$/,
    run: (_request, url) => Effect.map(searchRecipes({ q: url.searchParams.get("q") ?? "" }), (results) => json({ results })),
  },
  {
    method: "GET",
    pattern: /^favorites$/,
    run: (request, url) =>
      Effect.gen(function* () {
        const user = yield* requireUser(request);
        const { categoryName, recipes } = yield* listFavorites(user, {
          categoryId: url.searchParams.get("tag") || null,
          sort: url.searchParams.get("sort") ?? undefined,
        });
        const courses = yield* listFavoriteCategories(user);
        return json({ categoryName, courses, recipes });
      }),
  },
  {
    method: "PUT",
    pattern: /^favorites\/([^/]+)$/,
    run: (request, _url, [recipeId]) =>
      Effect.gen(function* () {
        const user = yield* requireUser(request);
        const body = yield* readJson(request);
        return json(yield* setFavorite(user, { recipeId, favorite: body.favorite }));
      }),
  },
  {
    method: "GET",
    pattern: /^recently-viewed$/,
    run: (request, url) =>
      Effect.gen(function* () {
        const user = yield* requireUser(request);
        return json({ recipes: yield* listRecentlyViewed(user, { sort: url.searchParams.get("sort") ?? undefined }) });
      }),
  },
];

const errorResponse = (error: AppError | SqlError): Response => {
  switch (error._tag) {
    case "InvalidInput":
      return json({ error: "InvalidInput", fieldErrors: error.fieldErrors }, 400);
    case "Unauthenticated":
      return json({ error: "Unauthenticated" }, 401);
    case "Forbidden":
      return json({ error: "Forbidden", reason: error.reason }, 403);
    case "NotFound":
      return json({ error: "NotFound", entity: error.entity }, 404);
    case "SqlError":
      return json({ error: "ServerError" }, 500);
  }
};

/** Handles a request whose path starts with /api/v1/. Never fails: errors become JSON responses. */
export const handleApiRequest = (request: Request): Effect.Effect<Response, never, SqlClient | D1Client> => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1\/?/, "").replace(/\/$/, "");
  const matches = routes.filter((route) => route.pattern.test(path));
  if (matches.length === 0) return Effect.succeed(json({ error: "NotFound", entity: "Route" }, 404));
  const route = matches.find((r) => r.method === request.method);
  if (!route) {
    const allow = [...new Set(matches.map((r) => r.method))].join(", ");
    return Effect.succeed(new Response(JSON.stringify({ error: "MethodNotAllowed" }), { status: 405, headers: { Allow: allow, "Content-Type": "application/json" } }));
  }
  const params = (route.pattern.exec(path) ?? []).slice(1).map((p) => decodeURIComponent(p));
  return route.run(request, url, params).pipe(
    Effect.catch((error) => Effect.succeed(errorResponse(error))),
    Effect.catchCause((cause) => {
      console.error("API defect", Cause.pretty(cause));
      return Effect.succeed(json({ error: "ServerError" }, 500));
    }),
  );
};

