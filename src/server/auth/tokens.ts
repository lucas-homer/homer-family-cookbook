import { Effect } from "effect";

// Random bearer tokens (session ids, invite tokens). Only a SHA-256 of a token
// is ever stored, so a database leak does not hand out working credentials.

const TOKEN_BYTES = 32; // 256 bits

// 32 bytes encode to exactly 43 base64url characters without padding.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const generateToken = (): string => {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
};

// Cheap shape check so junk cookies and URLs never reach the database.
export const isTokenShaped = (value: unknown): value is string =>
  typeof value === "string" && TOKEN_PATTERN.test(value);

export const hashToken = (token: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return toHex(new Uint8Array(digest));
  });

const base64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
