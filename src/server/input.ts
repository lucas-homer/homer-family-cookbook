import { Effect, Schema, SchemaIssue } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import { Forbidden, InvalidInput, NotFound, type AppError } from "./errors";
import type { SessionUser } from "./auth/current-user";

// Shared helpers for validating user input and shaping form results.

const formatter = SchemaIssue.makeFormatterStandardSchemaV1();

// Decodes untrusted input with `schema`. Failures become InvalidInput keyed by
// the top-level field name (e.g. "title", "ingredients"), first message wins.
export const decodeInput =
  <S extends Schema.Decoder<unknown, never>>(schema: S) =>
  (input: unknown): Effect.Effect<S["Type"], InvalidInput> =>
    Schema.decodeUnknownEffect(schema)(input, { errors: "all", onExcessProperty: "ignore" }).pipe(
      Effect.mapError((error) => {
        const fieldErrors: Record<string, string> = {};
        for (const issue of formatter(error.issue).issues) {
          const head = issue.path?.[0];
          const key = head === undefined ? "form" : String(typeof head === "object" ? head.key : head);
          fieldErrors[key] ??= issue.message;
        }
        return new InvalidInput({ fieldErrors });
      }),
    );

export const Id = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64));

// Trimmed text between `min` and `max` characters.
export const Text = (min: number, max: number, message: string) =>
  Schema.Trim.check(
    Schema.isMinLength(min, { message }),
    Schema.isMaxLength(max, { message: `Must be ${max} characters or fewer` }),
  );

// Optional trimmed text; empty strings, null and missing all become null.
export const OptionalText = (max: number) =>
  Schema.optional(
    Schema.NullOr(Schema.Trim.check(Schema.isMaxLength(max, { message: `Must be ${max} characters or fewer` }))),
  );

export const emptyToNull = (value: string | null | undefined): string | null => (value ? value : null);

export const isAdmin = (user: SessionUser) => user.role === "ADMIN";
// Bound into SQL as `... OR ${adminFlag(user)} = 1` so admin rights are part of the WHERE clause.
export const adminFlag = (user: SessionUser) => (isAdmin(user) ? 1 : 0);

// Called after an ownership-guarded write touched no rows: the row is either
// missing (NotFound) or belongs to someone else (Forbidden).
export const failNoAccess = (entity: "Recipe" | "Note", id: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows =
      entity === "Recipe"
        ? yield* sql`SELECT 1 AS found FROM recipes WHERE id = ${id}`
        : yield* sql`SELECT 1 AS found FROM notes WHERE id = ${id}`;
    return yield* rows.length > 0
      ? Effect.fail(new Forbidden({ reason: `You can only change your own ${entity.toLowerCase()}s` }))
      : Effect.fail(new NotFound({ entity, id }));
  });

export type FormResult<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly fieldErrors: Readonly<Record<string, string>> };

// Server functions behind forms return validation errors as data so the form
// can show them; every other failure still goes through runServer.
export const toFormResult = <A, R>(
  effect: Effect.Effect<A, AppError | SqlError, R>,
): Effect.Effect<FormResult<A>, Exclude<AppError, InvalidInput> | SqlError, R> =>
  effect.pipe(
    Effect.map((value): FormResult<A> => ({ ok: true, value })),
    Effect.catchTag("InvalidInput", (error) => Effect.succeed<FormResult<A>>({ ok: false, fieldErrors: error.fieldErrors })),
  );
