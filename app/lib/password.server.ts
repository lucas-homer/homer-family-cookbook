import { randomBytes } from "crypto";
import { promisify } from "util";
import { addHours, compareDesc } from "date-fns";

export async function generateResetInfo() {
  const randomBytesPromiseified = promisify(randomBytes);
  const token = (await randomBytesPromiseified(32)).toString("hex");
  const expiry = addHours(new Date(), 1); // 1 hour from now

  return { token, expiry };
}

export function isTokenExpired(expiry: Date) {
  return compareDesc(new Date(), expiry) === -1;
}
