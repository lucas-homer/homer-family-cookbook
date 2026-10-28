import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { describe, expect, it } from "vitest";
import { runtime } from "~/server/runtime";

describe("database layer", () => {
  it("queries D1 through Effect with camelCase results", async () => {
    const rows = await runtime.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`INSERT INTO users ${sql.insert({ id: "u1", email: "a@example.com", firstName: "Ada" })}`;
        return yield* sql<{ firstName: string }>`SELECT first_name FROM users`;
      }),
    );
    expect(rows).toEqual([{ firstName: "Ada" }]);
  });
});
