import bcrypt from "bcryptjs";
import { Data, Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SqlError } from "effect/sql/SqlError";
import type { SessionUser } from "./current-user";

// bcryptjs hashes. Imported users keep their legacy hashes (cost 10), so new
// hashes use the same cost: every login then does the same amount of work,
// including the dummy comparison below, which keeps timing uniform.
export const BCRYPT_COST = 10;

// bcrypt ignores everything after 72 bytes, so longer new passwords are refused
// rather than silently truncated.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

// Upper bound on what login will even hash, so huge bodies can't burn CPU.
const LOGIN_PASSWORD_MAX_LENGTH = 1024;

export class InvalidCredentials extends Data.TaggedError("InvalidCredentials")<{}> {}

export const hashPassword = (password: string): Effect.Effect<string> =>
  Effect.promise(() => bcrypt.hash(password, BCRYPT_COST));

// A malformed stored hash counts as a mismatch, never as a crash or a match.
export const verifyPassword = (password: string, hash: string): Effect.Effect<boolean> =>
  Effect.promise(() => bcrypt.compare(password, hash).catch(() => false));

// Returns a message for an unacceptable new password, or undefined if it is fine.
export const checkNewPassword = (password: string): string | undefined => {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return "Password is too long";
  if (password.trim().length === 0) return "Password can't be only spaces";
  return undefined;
};

// Precomputed cost-10 hash of a discarded random string. It is compared against
// when the email is unknown (or the user has no password) so that path costs
// the same as a real check. It is a constant rather than computed lazily, so a
// cold isolate doesn't do extra hashing work that would reveal the difference.
const DUMMY_HASH = "$2b$10$KAaxakZ67pjZsyg3KFG5jOWdtP/jOeNeDMf8sdTyaU4fSv0.42CE2";

interface UserWithHash {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string | null;
  readonly role: "ADMIN" | "MEMBER";
  readonly passwordHash: string | null;
}

// Email + password -> user. Unknown email, missing hash and wrong password all
// fail with the same InvalidCredentials error.
export const authenticate = (input: {
  readonly email: string;
  readonly password: string;
}): Effect.Effect<SessionUser, InvalidCredentials | SqlError, SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const email = normalizeEmail(input.email);
    const password = input.password.slice(0, LOGIN_PASSWORD_MAX_LENGTH);

    const rows = yield* sql<UserWithHash>`
      SELECT id, email, first_name, last_name, role, password_hash
      FROM users WHERE email = ${email}`;
    const row = rows[0];

    if (!row || !row.passwordHash) {
      yield* verifyPassword(password, DUMMY_HASH);
      return yield* new InvalidCredentials();
    }
    if (!(yield* verifyPassword(password, row.passwordHash))) {
      return yield* new InvalidCredentials();
    }
    const { passwordHash: _passwordHash, ...user } = row;
    return user;
  });

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
