import { env } from "cloudflare:workers";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SessionUser } from "./auth/current-user";
import { Forbidden, InvalidInput, NotFound } from "./errors";
import { adminFlag, decodeInput, Id, isAdmin } from "./input";

// Photos and videos on a recipe. The bytes live in the MEDIA R2 bucket and a
// recipe_media row makes them visible. Reading is public like the recipe;
// adding and removing checks that the caller owns the recipe (or is an admin).
//
// Upload order: the file goes to R2 first, then the row. If the row insert
// fails the object is removed again; if that fails too, an object nobody
// links to is left behind, which is harmless. Delete removes the row first.

export const MAX_MEDIA_PER_RECIPE = 12;
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
// Workers accept request bodies up to 100 MB.
export const MAX_VIDEO_BYTES = 95 * 1024 * 1024;

export type MediaKind = "photo" | "video";

// Each accepted type, with a check of the file's first bytes so a file is
// only ever served back as what it really is.
const TYPES: Record<string, { kind: MediaKind; matches: (head: Uint8Array) => boolean }> = {
  "image/jpeg": { kind: "photo", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { kind: "photo", matches: (b) => ascii(b, 1, 3) === "PNG" && b[0] === 0x89 },
  "image/webp": { kind: "photo", matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP" },
  "image/heic": { kind: "photo", matches: (b) => ascii(b, 4, 4) === "ftyp" && ["heic", "heix", "mif1", "msf1", "heim", "heis"].includes(ascii(b, 8, 4)) },
  "video/mp4": { kind: "video", matches: (b) => ascii(b, 4, 4) === "ftyp" },
  "video/quicktime": { kind: "video", matches: (b) => ascii(b, 4, 4) === "ftyp" || ascii(b, 4, 4) === "moov" || ascii(b, 4, 4) === "wide" },
};
const HEAD_BYTES = 16;

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

export const contentTypes = Object.keys(TYPES);

export interface RecipeMedia {
  readonly id: string;
  readonly kind: MediaKind;
  readonly contentType: string;
  readonly width: number | null;
  readonly height: number | null;
}

const objectKey = (recipeId: string, mediaId: string) => `recipes/${recipeId}/${mediaId}`;

const bucket = (): R2Bucket => {
  const media = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!media) throw new Error("MEDIA bucket binding is missing");
  return media;
};

export const listRecipeMedia = (recipeId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<RecipeMedia>`
      SELECT id, kind, content_type, width, height FROM recipe_media
      WHERE recipe_id = ${recipeId} ORDER BY position, id`;
  });

const Dimension = Schema.optional(
  Schema.NullOr(Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 20_000 }))),
);
const UploadInput = Schema.Struct({
  recipeId: Id,
  contentType: Schema.Literals(contentTypes as [string, ...string[]]).annotate({
    message: "Choose a JPEG, PNG, HEIC or WebP photo, or an MP4 or MOV video",
  }),
  contentLength: Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0)),
  width: Dimension,
  height: Dimension,
});

export interface UploadRequest {
  readonly recipeId: string;
  readonly contentType: string;
  readonly contentLength: number;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly body: ReadableStream<Uint8Array> | null;
}

const fileError = (message: string) => new InvalidInput({ fieldErrors: { file: message } });

// The caller may change this recipe's media: they wrote it, or they're an admin.
const checkCanEdit = (user: SessionUser, recipeId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ userId: string }>`SELECT user_id FROM recipes WHERE id = ${recipeId}`;
    const recipe = rows[0];
    if (!recipe) return yield* Effect.fail(new NotFound({ entity: "Recipe", id: recipeId }));
    if (recipe.userId !== user.id && !isAdmin(user)) {
      return yield* Effect.fail(new Forbidden({ reason: "You can only change your own recipes" }));
    }
  });

// Reads the first bytes for the type check, then hands R2 a stream of exactly
// `length` bytes: the bytes already read, then the rest of the body. A body
// longer or shorter than its Content-Length makes the put fail.
const readHead = async (body: ReadableStream<Uint8Array>) => {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < HEAD_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  const head = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    head.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { head, reader };
};

const exactStream = (head: Uint8Array, reader: ReadableStreamDefaultReader<Uint8Array>, length: number) => {
  const { readable, writable } = new FixedLengthStream(length);
  const pump = (async () => {
    const writer = writable.getWriter();
    writer.closed.catch(() => {});
    try {
      await writer.write(head);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
      await writer.close();
    } catch (error) {
      await writer.abort(error).catch(() => {});
      await reader.cancel().catch(() => {});
    }
  })();
  return { readable, pump };
};

export const uploadRecipeMedia = (user: SessionUser, request: UploadRequest) =>
  Effect.gen(function* () {
    const input = yield* decodeInput(UploadInput)(request);
    const type = TYPES[input.contentType]!;
    const max = type.kind === "photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
    if (input.contentLength > max) {
      return yield* Effect.fail(
        fileError(type.kind === "photo" ? "Photos can be up to 20 MB" : "Videos can be up to 95 MB. Try a shorter clip."),
      );
    }
    yield* checkCanEdit(user, input.recipeId);

    const sql = yield* SqlClient;
    const counted = yield* sql<{ count: number }>`SELECT count(*) AS count FROM recipe_media WHERE recipe_id = ${input.recipeId}`;
    const count = counted[0]?.count ?? 0;
    if (count >= MAX_MEDIA_PER_RECIPE) {
      return yield* Effect.fail(fileError(`A recipe can have up to ${MAX_MEDIA_PER_RECIPE} photos and videos`));
    }

    if (!request.body) return yield* Effect.fail(fileError("The upload was empty"));
    const { head, reader } = yield* Effect.promise(() => readHead(request.body!));
    if (head.byteLength < Math.min(HEAD_BYTES, input.contentLength) || !type.matches(head)) {
      yield* Effect.promise(() => reader.cancel().catch(() => {}));
      return yield* Effect.fail(fileError("That file doesn't look like a photo or video we can use"));
    }

    const id = crypto.randomUUID();
    const key = objectKey(input.recipeId, id);
    const { readable, pump } = exactStream(head, reader, input.contentLength);
    yield* Effect.tryPromise({
      try: async () => {
        const put = bucket().put(key, readable, { httpMetadata: { contentType: input.contentType } });
        await Promise.all([put, pump]);
        if (!(await put)) throw new Error("R2 put returned null");
      },
      catch: () => fileError("The upload didn't finish. Try again."),
    });

    yield* sql`
      INSERT INTO recipe_media (id, recipe_id, user_id, kind, content_type, bytes, width, height, position)
      SELECT ${id}, ${input.recipeId}, ${user.id}, ${type.kind}, ${input.contentType}, ${input.contentLength},
        ${input.width ?? null}, ${input.height ?? null},
        coalesce((SELECT max(position) + 1 FROM recipe_media WHERE recipe_id = ${input.recipeId}), 0)`.pipe(
      Effect.tapError(() => Effect.promise(() => bucket().delete(key).catch(() => {}))),
    );

    const media: RecipeMedia = {
      id,
      kind: type.kind,
      contentType: input.contentType,
      width: input.width ?? null,
      height: input.height ?? null,
    };
    return media;
  });

const DeleteInput = Schema.Struct({ recipeId: Id, mediaId: Id });

export const deleteRecipeMedia = (user: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const { recipeId, mediaId } = yield* decodeInput(DeleteInput)(input);
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: string }>`
      DELETE FROM recipe_media
      WHERE id = ${mediaId} AND recipe_id = ${recipeId}
        AND EXISTS (SELECT 1 FROM recipes WHERE id = ${recipeId} AND (user_id = ${user.id} OR ${adminFlag(user)} = 1))
      RETURNING id`;
    if (rows.length === 0) {
      const found = yield* sql`SELECT 1 AS found FROM recipe_media WHERE id = ${mediaId} AND recipe_id = ${recipeId}`;
      return yield* found.length
        ? Effect.fail(new Forbidden({ reason: "You can only change your own recipes" }))
        : Effect.fail(new NotFound({ entity: "Media", id: mediaId }));
    }
    yield* Effect.promise(() => bucket().delete(objectKey(recipeId, mediaId)).catch(() => {}));
    return { id: mediaId };
  });

/** After a recipe is deleted (its rows cascade), remove its files. Best effort. */
export const deleteRecipeMediaFiles = (recipeId: string, mediaIds: ReadonlyArray<string>) =>
  mediaIds.length
    ? Effect.promise(() => bucket().delete(mediaIds.map((id) => objectKey(recipeId, id))).catch(() => {}))
    : Effect.void;

// GET /api/v1/media/:id. Public, cacheable forever (a media id never points
// at different bytes), with Range support so videos can seek.
export const serveRecipeMedia = (request: Request, mediaId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ recipeId: string; contentType: string }>`
      SELECT recipe_id, content_type FROM recipe_media WHERE id = ${mediaId}`;
    const row = rows[0];
    if (!row) return yield* Effect.fail(new NotFound({ entity: "Media", id: mediaId }));
    const key = objectKey(row.recipeId, mediaId);
    const object = yield* Effect.promise(() => bucket().get(key, { range: request.headers, onlyIf: request.headers }));
    if (!object) return yield* Effect.fail(new NotFound({ entity: "Media", id: mediaId }));

    const headers = new Headers({
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Accept-Ranges": "bytes",
      ETag: object.httpEtag,
    });
    if (!("body" in object)) return new Response(null, { status: 304, headers });
    const range = object.range as { offset?: number; length?: number; suffix?: number } | undefined;
    if (request.headers.has("Range") && range) {
      const offset = range.suffix !== undefined ? Math.max(0, object.size - range.suffix) : (range.offset ?? 0);
      const length = range.suffix !== undefined ? object.size - offset : (range.length ?? object.size - offset);
      headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
      headers.set("Content-Length", String(length));
      return new Response(object.body, { status: 206, headers });
    }
    headers.set("Content-Length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  });
