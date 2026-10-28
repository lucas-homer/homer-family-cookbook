import type { D1Client } from "@effect/sql-d1/D1Client";
import { Effect, Schema } from "effect";
import type { SqlError } from "effect/sql/SqlError";
import { InvalidInput } from "../errors";
import { decodeInput, Id, OptionalText, Text, emptyToNull } from "../input";
import type { SessionUser } from "./current-user";
import { INVITE_MAX_DAYS, createInvite, redeemInvite, revokeInvite } from "./invites";
import { authenticate, checkNewPassword } from "./password";
import { safeRedirectTo } from "./redirect";

// Input validation and error mapping for the auth forms. Each flow decodes
// untrusted input with Schema and reports user-facing problems as InvalidInput
// (field name -> message, "form" for the whole form). Cookies are left to the
// server functions in ./functions.ts so these stay testable without a request.

const Email = Schema.Trim.check(
  Schema.isMaxLength(254, { message: "Email is too long" }),
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "Email is invalid" }),
);

const Token = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/, { message: "This invite link is not valid" }));

const LoginInput = Schema.Struct({
  email: Email,
  password: Schema.String.check(Schema.isMinLength(1, { message: "Password is required" })),
  redirectTo: Schema.optional(Schema.NullOr(Schema.String)),
});

const invalid = (fieldErrors: Record<string, string>) => new InvalidInput({ fieldErrors });

export const INVALID_LOGIN = "Invalid email or password";

export const login = (input: unknown) =>
  Effect.gen(function* () {
    const { email, password, redirectTo } = yield* decodeInput(LoginInput)(input);
    const user = yield* authenticate({ email, password }).pipe(
      Effect.catchTag("InvalidCredentials", () => Effect.fail(invalid({ form: INVALID_LOGIN }))),
    );
    return { user, redirectTo: safeRedirectTo(redirectTo) };
  });

const JoinInput = Schema.Struct({
  token: Token,
  email: Email,
  firstName: Text(1, 100, "First name is required"),
  lastName: OptionalText(100),
  password: Schema.String,
});

const inviteMessages = {
  invalid: "This invite link is not valid.",
  used: "This invite has already been used.",
  expired: "This invite has expired. Ask for a new one.",
  "email-mismatch": "This invite is for a different email address.",
} as const;

export const inviteUnavailableMessage = (reason: keyof typeof inviteMessages) => inviteMessages[reason];

export const join = (input: unknown): Effect.Effect<SessionUser, InvalidInput | SqlError, D1Client> =>
  Effect.gen(function* () {
    const fields = yield* decodeInput(JoinInput)(input);
    const passwordProblem = checkNewPassword(fields.password);
    if (passwordProblem) return yield* invalid({ password: passwordProblem });

    return yield* redeemInvite({
      token: fields.token,
      email: fields.email,
      firstName: fields.firstName,
      lastName: emptyToNull(fields.lastName),
      password: fields.password,
    }).pipe(
      Effect.catchTags({
        InviteUnavailable: (error) =>
          Effect.fail(
            invalid(error.reason === "email-mismatch" ? { email: inviteMessages[error.reason] } : { form: inviteMessages[error.reason] }),
          ),
        EmailTaken: () => Effect.fail(invalid({ email: "An account with this email already exists. Try logging in." })),
      }),
    );
  });

const CreateInviteInput = Schema.Struct({
  email: Schema.Trim.check(
    Schema.isMaxLength(254, { message: "Email is too long" }),
    Schema.isPattern(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "Email is invalid" }),
  ),
  role: Schema.Literals(["MEMBER", "ADMIN"]),
  expiresInDays: Schema.Number.check(
    Schema.isInt({ message: "Whole days only" }),
    Schema.isBetween({ minimum: 1, maximum: INVITE_MAX_DAYS }, { message: `Between 1 and ${INVITE_MAX_DAYS} days` }),
  ),
});

export const createInviteFor = (admin: SessionUser, input: unknown) =>
  Effect.gen(function* () {
    const fields = yield* decodeInput(CreateInviteInput)(input);
    return yield* createInvite({
      email: emptyToNull(fields.email),
      role: fields.role,
      expiresInDays: fields.expiresInDays,
      createdBy: admin.id,
    });
  });

export const revokeInviteById = (input: unknown) =>
  Effect.gen(function* () {
    const { id } = yield* decodeInput(Schema.Struct({ id: Id }))(input);
    const revoked = yield* revokeInvite(id);
    if (!revoked) return yield* invalid({ form: "That invite is already used, expired or gone." });
  });
