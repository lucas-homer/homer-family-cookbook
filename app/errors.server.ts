import { json } from "@remix-run/node";

export function badRequest<TActionData>(data: TActionData) {
  return json(data, { status: 400 });
}
