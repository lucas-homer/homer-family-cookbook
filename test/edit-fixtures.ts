import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import type { SessionUser } from "~/server/auth/current-user";
import { runtime } from "~/server/runtime";

// Shared seed data for the editing/notes/favorites tests. Each test file gets
// a fresh D1, so ids only need to be unique within a file.

export const run = <A, E>(effect: Effect.Effect<A, E, any>) => runtime.runPromise(effect as Effect.Effect<A, E, never>);

// Runs an effect that should fail and returns the failure.
export const runError = <A, E>(effect: Effect.Effect<A, E, any>) =>
  runtime.runPromise(Effect.flip(effect) as Effect.Effect<E, A, never>);

export const makeUser = (id: string, role: SessionUser["role"] = "MEMBER"): SessionUser => ({
  id,
  email: `${id}@example.com`,
  firstName: id.toUpperCase(),
  lastName: null,
  role,
});

export const alice = makeUser("alice");
export const bob = makeUser("bob");
export const admin = makeUser("admin", "ADMIN");

export const seed = () =>
  run(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      for (const user of [alice, bob, admin]) {
        yield* sql`INSERT INTO users ${sql.insert({ id: user.id, email: user.email, firstName: user.firstName, role: user.role })}`;
      }
      yield* sql`INSERT INTO categories ${sql.insert([
        { id: "cat-dessert", name: "Dessert" },
        { id: "cat-dinner", name: "Dinner" },
        { id: "cat-side", name: "Side" },
      ])}`;
    }),
  );

export const query = <A extends object>(text: TemplateStringsArray, ...args: Array<unknown>) =>
  run(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<A>(text, ...args);
    }),
  );

export const validRecipe = {
  title: "Pie",
  servings: "8",
  background: "Grandma's",
  instructions: "Bake it.",
  categoryIds: ["cat-dessert"],
  ingredients: [
    { name: "flour", quantity: "2 cups" },
    { name: "butter", quantity: "1 stick" },
    { name: "apples", quantity: null },
  ],
};
