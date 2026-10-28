import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { SqlClient } from "effect/sql/SqlClient";
import { runServer } from "./run";

// Tracer bullet: proves the Worker -> Effect -> D1 path works end to end.
export const getRecipeCount = createServerFn({ method: "GET" }).handler(() =>
  runServer(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ count: number }>`SELECT count(*) AS count FROM recipes`;
      return rows[0]?.count ?? 0;
    }),
  ),
);
