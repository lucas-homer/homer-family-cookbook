import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { requireUser } from "./auth/current-user";
import { listRecentlyViewed } from "./reads";
import { runServer } from "./run";

export const getRecentlyViewed = createServerFn({ method: "GET" })
  .validator((input: { sort?: "newest" | "oldest" }) => input)
  .handler(({ data }) =>
    runServer(
      Effect.gen(function* () {
        const user = yield* requireUser;
        const recipes = yield* listRecentlyViewed(user, data);
        return { firstName: user.firstName, recipes };
      }),
    ),
  );
