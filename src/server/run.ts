import { notFound, redirect } from "@tanstack/react-router";
import { Cause, Effect, Exit, ManagedRuntime, Option } from "effect";
import type { SqlError } from "effect/sql/SqlError";
import type { AppError } from "./errors";
import { runtime } from "./runtime";

type Services = ManagedRuntime.ManagedRuntime.Services<typeof runtime>;

// Runs an Effect from a server function or loader and maps domain errors
// onto TanStack Router outcomes. SqlError and defects are rethrown as-is.
export async function runServer<A>(effect: Effect.Effect<A, AppError | SqlError, Services>): Promise<A> {
  const exit = await runtime.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;

  const failure = Cause.findErrorOption(exit.cause);
  if (Option.isSome(failure)) {
    const error = failure.value;
    switch (error._tag) {
      case "NotFound":
        throw notFound();
      case "Unauthenticated":
        throw redirect({ to: "/login" });
      case "Forbidden":
        throw new Response(error.reason, { status: 403 });
      case "InvalidInput":
        throw error;
      case "SqlError":
        break;
    }
  }
  throw Cause.squash(exit.cause);
}
