import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { Forbidden } from "../errors";
import { toFormResult } from "../input";
import { runServer } from "../run";
import { startSession } from "./cookies";
import { isSameOriginRequest } from "./csrf";
import { limitLoginAttempts } from "./rate-limit";
import { getOptionalUser, requireAdmin } from "./current-user";
import { createInviteFor, inviteUnavailableMessage, join, login, revokeInviteById } from "./flows";
import { getOpenInvite, listInvites, type Role } from "./invites";

// Thin server-function wrappers around the auth flows. Every state-changing
// function is POST and checks the request is same-origin (see ./csrf.ts).
// Logout is a POST route handler in src/routes/logout.tsx so a plain form works.

const requireSameOrigin = Effect.suspend(() =>
  isSameOriginRequest(getRequest()) ? Effect.void : Effect.fail(new Forbidden({ reason: "Cross-site request refused" })),
);

export const getSessionUser = createServerFn({ method: "GET" }).handler(() => runServer(getOptionalUser));

export interface LoginData {
  readonly email: string;
  readonly password: string;
  readonly redirectTo?: string | null;
}

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: LoginData) => data)
  .handler(({ data }) =>
    runServer(
      Effect.gen(function* () {
        yield* requireSameOrigin;
        return yield* toFormResult(
          Effect.gen(function* () {
            yield* limitLoginAttempts(getRequest(), String(data.email ?? ""));
            const { user, redirectTo } = yield* login(data);
            yield* startSession(user.id);
            return { redirectTo };
          }),
        );
      }),
    ),
  );

export type JoinInvite =
  | { readonly ok: true; readonly email: string | null; readonly role: Role }
  | { readonly ok: false; readonly message: string };

export const getJoinInvite = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(({ data }) =>
    runServer(
      getOpenInvite(String(data.token)).pipe(
        Effect.map((invite): JoinInvite => ({ ok: true, email: invite.email, role: invite.role })),
        Effect.catchTag("InviteUnavailable", (error) =>
          Effect.succeed<JoinInvite>({ ok: false, message: inviteUnavailableMessage(error.reason) }),
        ),
      ),
    ),
  );

export interface JoinData {
  readonly token: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
}

export const joinFn = createServerFn({ method: "POST" })
  .validator((data: JoinData) => data)
  .handler(({ data }) =>
    runServer(
      Effect.gen(function* () {
        yield* requireSameOrigin;
        return yield* toFormResult(
          Effect.gen(function* () {
            const user = yield* join(data);
            yield* startSession(user.id);
            return { redirectTo: "/" };
          }),
        );
      }),
    ),
  );

export const listInvitesFn = createServerFn({ method: "GET" }).handler(() =>
  runServer(Effect.andThen(requireAdmin, listInvites)),
);

export interface CreateInviteData {
  readonly email: string;
  readonly role: Role;
  readonly expiresInDays: number;
}

export const createInviteFn = createServerFn({ method: "POST" })
  .validator((data: CreateInviteData) => data)
  .handler(({ data }) =>
    runServer(
      Effect.gen(function* () {
        yield* requireSameOrigin;
        const admin = yield* requireAdmin;
        return yield* toFormResult(createInviteFor(admin, data));
      }),
    ),
  );

export const revokeInviteFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(({ data }) =>
    runServer(
      Effect.gen(function* () {
        yield* requireSameOrigin;
        yield* requireAdmin;
        return yield* toFormResult(revokeInviteById(data));
      }),
    ),
  );
