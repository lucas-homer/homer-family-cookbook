import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { InvalidInput } from "../errors";
import { normalizeEmail } from "./password";

const TOO_MANY = "Too many sign-in attempts. Wait a minute and try again.";

// Fails before any password work when this IP or this email has had too many
// recent attempts. Checking the email as well stops one account being guessed
// from many IPs.
export const limitLoginAttempts = (request: Request, email: string): Effect.Effect<void, InvalidInput> =>
  Effect.gen(function* () {
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const keys = [`ip:${ip}`, `email:${normalizeEmail(email)}`];
    const outcomes = yield* Effect.promise(() => Promise.all(keys.map((key) => env.LOGIN_LIMITER.limit({ key }))));
    if (outcomes.some((outcome) => !outcome.success)) {
      return yield* new InvalidInput({ fieldErrors: { form: TOO_MANY } });
    }
  });
