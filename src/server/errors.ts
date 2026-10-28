import { Data } from "effect";

// Domain errors. `runServer` in ./run.ts turns these into HTTP outcomes,
// so handlers can fail with them instead of throwing.
export class NotFound extends Data.TaggedError("NotFound")<{
  readonly entity: string;
  readonly id?: string;
}> {}

export class Unauthenticated extends Data.TaggedError("Unauthenticated")<{}> {}

export class Forbidden extends Data.TaggedError("Forbidden")<{
  readonly reason: string;
}> {}

export class InvalidInput extends Data.TaggedError("InvalidInput")<{
  readonly fieldErrors: Readonly<Record<string, string>>;
}> {}

export type AppError = NotFound | Unauthenticated | Forbidden | InvalidInput;
