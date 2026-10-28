import { createServerFn } from "@tanstack/react-start";
import { getOptionalUser } from "./auth/current-user";
import { runServer } from "./run";

export const getViewer = createServerFn({ method: "GET" }).handler(() =>
  runServer(getOptionalUser),
);
