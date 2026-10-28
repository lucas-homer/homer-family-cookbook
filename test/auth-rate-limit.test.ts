import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { limitLoginAttempts } from "~/server/auth/rate-limit";

const attempt = (ip: string, email: string) =>
  Effect.runPromise(
    limitLoginAttempts(new Request("https://example.com", { headers: { "cf-connecting-ip": ip } }), email).pipe(
      Effect.match({ onSuccess: () => "ok", onFailure: (error) => error.fieldErrors.form }),
    ),
  );

describe("login rate limit", () => {
  it("blocks one email guessed from many IPs", async () => {
    const results = [];
    for (let i = 0; i < 12; i++) results.push(await attempt(`10.0.0.${i}`, "Target@Example.com"));
    expect(results.slice(0, 10).every((r) => r === "ok")).toBe(true);
    expect(results.at(-1)).toMatch(/Too many sign-in attempts/);
  });

  it("blocks one IP trying many emails", async () => {
    const results = [];
    for (let i = 0; i < 12; i++) results.push(await attempt("10.9.9.9", `person${i}@example.com`));
    expect(results.at(-1)).toMatch(/Too many sign-in attempts/);
  });
});
