import Constants from "expo-constants";

// Client for the Worker's JSON API (src/server/api/handler.ts in the site).
// Shapes mirror what the handler returns; keep them in step with it.

const DEFAULT_API = "https://homerfamilycookbook.com";
// EXPO_PUBLIC_API_URL points a dev build at a local Worker (npm run dev in the repo root).
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string | undefined) || DEFAULT_API;

export type Role = "ADMIN" | "MEMBER";
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: Role;
}
export interface RecipeSummary {
  id: string;
  title: string;
  firstName: string;
  lastName: string | null;
  /** The recipe's first photo, if it has one. */
  coverMediaId?: string | null;
}
export interface RecipeMedia {
  id: string;
  kind: "photo" | "video";
  contentType: string;
  width: number | null;
  height: number | null;
}
export interface LibraryRecipe extends RecipeSummary {
  courses: string[];
}
export interface ApiTag {
  id: string;
  name: string;
  tagGroup: string;
  recipeCount?: number;
  description?: string | null;
}
export interface StepTimer {
  seconds: number;
  label: string;
}
export interface RecipeStep {
  text: string;
  timers: StepTimer[];
  /** true when the author saved this step's timers; false when the server found them in the text. */
  reviewed: boolean;
}
export interface Recipe extends RecipeSummary {
  instructions: string;
  /** Older cached copies don't have this; use recipeStepsOf(). */
  steps?: RecipeStep[];
  servings: string | null;
  background: string | null;
  ingredients: { id: string; name: string; quantity: string | null; position: number }[];
  categories: ApiTag[];
  media: RecipeMedia[];
}
export interface RecipeNote {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  canEdit: boolean;
}
export interface RecipeResponse {
  recipe: Recipe;
  viewer: { isFavorite: boolean; canEditRecipe: boolean; notes: RecipeNote[] };
}
export interface TagPage {
  category: ApiTag;
  selected: ApiTag[];
  recipes: RecipeSummary[];
  related: (ApiTag & { recipeCount: number })[];
}

/** A failed request. `status` 0 means the network failed. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(fieldErrors.form ?? code);
  }
}

export function authorName(r: Pick<RecipeSummary, "firstName" | "lastName">) {
  return [r.firstName, r.lastName].filter(Boolean).join(" ");
}

type Options = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; token?: string | null; signal?: AbortSignal };

export async function request<T>(path: string, { method = "GET", body, token, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Offline");
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; fieldErrors?: Record<string, string> };
  if (!res.ok) throw new ApiError(res.status, data.error ?? "ServerError", data.fieldErrors ?? (data.message ? { form: data.message } : {}));
  return data as T;
}

/** The token from an invite link (https://…/join/<token>, familycookbook://join/<token>) or a bare token. */
export function inviteTokenFrom(text: string): string | null {
  const m = /(?:^|\/join\/)([A-Za-z0-9_-]{43})(?:[/?#]|$)/.exec(text.trim());
  return m?.[1] ?? null;
}

/** Where a photo or video is served from. Public, like the recipe. */
export function mediaUrl(id: string) {
  return `${API_URL}/api/v1/media/${encodeURIComponent(id)}`;
}

/** A list row's thumbnail: the recipe's first photo, or nothing. */
export function coverOf(r: Pick<RecipeSummary, "coverMediaId">) {
  return r.coverMediaId ? { uri: mediaUrl(r.coverMediaId) } : undefined;
}

/** Endpoints, by name. Each takes the token when the endpoint uses one. */
export const api = {
  signIn: (email: string, password: string) =>
    request<{ token: string; expiresAt: string; user: User }>("auth/token", { method: "POST", body: { email, password } }),
  signOut: (token: string) => request<void>("auth/token", { method: "DELETE", token }),
  invite: (token: string) =>
    request<{ invite: { email: string | null; role: Role; expiresAt: string } }>(`invites/${encodeURIComponent(token)}`),
  join: (body: { token: string; email: string; firstName: string; lastName: string; password: string }) =>
    request<{ token: string; expiresAt: string; user: User }>("auth/join", { method: "POST", body }),
  requestPasswordReset: (email: string) => request<{ ok: true }>("auth/password-reset", { method: "POST", body: { email } }),
  me: (token: string) => request<{ user: User }>("me", { token }),
  library: () => request<{ recipes: LibraryRecipe[] }>("recipes"),
  recipe: (id: string, token: string | null) => request<RecipeResponse>(`recipes/${encodeURIComponent(id)}`, { token }),
  tags: () => request<{ tags: (ApiTag & { recipeCount: number })[] }>("tags"),
  tag: (id: string, opts: { sort?: "asc" | "desc"; with?: string[] } = {}) => {
    const q = new URLSearchParams();
    if (opts.sort) q.set("sort", opts.sort);
    if (opts.with?.length) q.set("with", opts.with.join(","));
    const qs = q.toString();
    return request<TagPage>(`tags/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`);
  },
  search: (q: string, signal?: AbortSignal) =>
    request<{ results: (RecipeSummary & { snippet: string })[] }>(`search?q=${encodeURIComponent(q)}`, { signal }),
  favorites: (token: string, tag?: string | null) =>
    request<{ categoryName: string | null; courses: { id: string; name: string }[]; recipes: RecipeSummary[] }>(
      `favorites${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`,
      { token },
    ),
  recentlyViewed: (token: string) => request<{ recipes: RecipeSummary[] }>("recently-viewed", { token }),
  deleteMedia: (token: string, recipeId: string, mediaId: string) =>
    request<{ id: string }>(`recipes/${encodeURIComponent(recipeId)}/media/${encodeURIComponent(mediaId)}`, { method: "DELETE", token }),
  setFavorite: (token: string, recipeId: string, favorite: boolean) =>
    request<{ recipeId: string; favorite: boolean }>(`favorites/${encodeURIComponent(recipeId)}`, { method: "PUT", token, body: { favorite } }),
};

/**
 * Recipe instructions are one block of text. Steps are its non-empty lines,
 * with any "1." or "Step 1:" numbering taken off.
 */
export function splitSteps(instructions: string): string[] {
  return instructions
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:step\s*)?\d+\s*[.):-]\s*/i, "").trim())
    .filter(Boolean);
}

/** The recipe's steps with timers, from the API. A copy cached before steps existed gets steps with no timers. */
export function recipeStepsOf(recipe: Recipe): RecipeStep[] {
  return recipe.steps ?? splitSteps(recipe.instructions).map((text) => ({ text, timers: [], reviewed: false }));
}

/** An API tag as the design system's Tag (count = recipes with it). */
export function toTag(t: ApiTag): import("./tags").Tag {
  return { id: t.id, name: t.name, tagGroup: t.tagGroup, count: t.recipeCount };
}
