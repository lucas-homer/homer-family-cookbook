import { D1Client } from "@effect/sql-d1";
import { env } from "cloudflare:workers";
import { ManagedRuntime, String } from "effect";

// Database columns are snake_case; application code uses camelCase.
export const DatabaseLive = D1Client.layer({
  db: env.DB,
  transformQueryNames: String.camelToSnake,
  transformResultNames: String.snakeToCamel,
});

// One runtime per Worker isolate. Add service layers here as they are written.
export const AppLayer = DatabaseLive;

export const runtime = ManagedRuntime.make(AppLayer);
