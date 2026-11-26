import { D1Client } from "@effect/sql-d1/D1Client";
import { Clock, Effect, Schema } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import type { SendEmail } from "../email";
import { InvalidInput } from "../errors";
import { decodeInput } from "../input";
import { checkNewPassword, hashPassword, normalizeEmail } from "./password";
import { generateToken, hashToken } from "./tokens";

// Forgot password: email a one-time link that lasts RESET_LIFETIME_MS.
// Requesting a reset never says whether the email has an account. Using a
// link sets the new password, uses up every open link for that person, and
// signs them out everywhere (website and app).

export const RESET_LIFETIME_MS = 60 * 60 * 1000;

export const RESET_LINK_INVALID = "This reset link is not valid or has expired. Ask for a new one.";

const Email = Schema.Trim.check(
  Schema.isMaxLength(254, { message: "Email is too long" }),
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "Enter your email address" }),
);
const Token = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/, { message: RESET_LINK_INVALID }));

const invalid = (fieldErrors: Record<string, string>) => new InvalidInput({ fieldErrors });

/** The reset page for a token, on the site at `siteUrl`. */
export const resetLink = (siteUrl: string, token: string) => `${siteUrl.replace(/\/$/, "")}/reset-password/${token}`;

const resetEmail = (firstName: string, link: string) => ({
  subject: "Reset your Homer Family Cookbook password",
  text: `Hi ${firstName},\n\nSomeone asked to reset the password for your Homer Family Cookbook account. To choose a new password, open this link within 1 hour:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.\n`,
  html: `<p>Hi ${escapeHtml(firstName)},</p><p>Someone asked to reset the password for your Homer Family Cookbook account. To choose a new password, open this link within 1 hour:</p><p><a href="${escapeHtml(link)}">Choose a new password</a></p><p>If you didn't ask for this, you can ignore this email. Your password won't change.</p>`,
});

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Emails a reset link if the address has an account. Succeeds the same way
 * either way. A failed send is logged, not shown, for the same reason.
 */
export const requestPasswordReset = (
  input: unknown,
  options: { readonly siteUrl: string; readonly send: SendEmail },
): Effect.Effect<void, InvalidInput | SqlError, SqlClient> =>
  Effect.gen(function* () {
    const { email } = yield* decodeInput(Schema.Struct({ email: Email }))(input);
    const sql = yield* SqlClient;
    const users = yield* sql<{ readonly id: string; readonly firstName: string }>`
      SELECT id, first_name FROM users WHERE email = ${normalizeEmail(email)}`;
    const user = users[0];
    if (!user) return;

    const token = generateToken();
    const tokenHash = yield* hashToken(token);
    const now = yield* Clock.currentTimeMillis;
    const expiresAt = new Date(now + RESET_LIFETIME_MS).toISOString();
    yield* sql`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${user.id}, ${expiresAt})`;

    const message = resetEmail(user.firstName, resetLink(options.siteUrl, token));
    yield* options.send({ to: email, ...message }).pipe(
      Effect.catchTag("EmailNotSent", (error) => Effect.sync(() => console.error("Password reset email failed", error.cause))),
    );
  });

/** Whether a reset link can still be used, for the reset page. */
export const isResetTokenOpen = (token: string): Effect.Effect<boolean, SqlError, SqlClient> =>
  Effect.gen(function* () {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
    const sql = yield* SqlClient;
    const tokenHash = yield* hashToken(token);
    const rows = yield* sql`
      SELECT 1 FROM password_resets
      WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;
    return rows.length > 0;
  });

/**
 * Sets a new password from a reset link. One D1 batch (all or nothing):
 * the password only changes while the link is open; then every open link for
 * that person is used up and all their sessions are deleted.
 * Returns the user id so the caller can start a fresh session.
 */
export const resetPassword = (input: unknown): Effect.Effect<string, InvalidInput | SqlError, D1Client> =>
  Effect.gen(function* () {
    const { token, password } = yield* decodeInput(Schema.Struct({ token: Token, password: Schema.String }))(input);
    const problem = checkNewPassword(password);
    if (problem) return yield* invalid({ password: problem });

    const db = yield* D1Client;
    const tokenHash = yield* hashToken(token);
    const open = yield* db<{ readonly userId: string }>`
      SELECT user_id FROM password_resets
      WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;
    const userId = open[0]?.userId;
    if (!userId) return yield* invalid({ form: RESET_LINK_INVALID });

    const passwordHash = yield* hashPassword(password);
    const now = new Date(yield* Clock.currentTimeMillis).toISOString();
    const [changed] = yield* db.batch([
      db<{ readonly id: string }>`
        UPDATE users SET password_hash = ${passwordHash}, updated_at = ${now}
        WHERE id = ${userId} AND EXISTS (
          SELECT 1 FROM password_resets
          WHERE token_hash = ${tokenHash} AND user_id = ${userId} AND used_at IS NULL
            AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        RETURNING id`,
      db`UPDATE password_resets SET used_at = ${now}
        WHERE user_id = ${userId} AND used_at IS NULL
          AND EXISTS (SELECT 1 FROM users WHERE id = ${userId} AND updated_at = ${now})`,
      db`DELETE FROM sessions
        WHERE user_id = ${userId} AND EXISTS (SELECT 1 FROM users WHERE id = ${userId} AND updated_at = ${now})`,
    ]);
    // Lost a race with another use of the same link.
    if (changed.length === 0) return yield* invalid({ form: RESET_LINK_INVALID });
    return userId;
  });
