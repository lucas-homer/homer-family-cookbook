#!/usr/bin/env node
// Creates the E2E test account and keeps its password in the macOS Keychain
// (never in git). It signs up through the real invite flow (POST /api/v1/auth/join).
//
//   node scripts/e2e/test-user.mjs create local           # local D1 + `pnpm dev` on :5173
//   node scripts/e2e/test-user.mjs create live <invite>   # needs an invite link an admin made on the site
//   node scripts/e2e/test-user.mjs show local|live        # prints email; --password to print the password too
//
// Local: the script writes the invite row into the local D1 itself, and with
// --reset deletes an earlier local test user first. Live: it never touches the
// database directly; an admin creates an email-locked MEMBER invite for the
// address below on the site's admin page and passes the link (or token).

import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

const TARGETS = {
  local: { api: process.env.HFC_LOCAL_API ?? "http://127.0.0.1:5173", email: "claude-e2e@homerfamilycookbook.test" },
  live: { api: "https://homerfamilycookbook.com", email: "claude-e2e@homerfamilycookbook.test" },
};
const keychainService = (target) => `hfc-e2e-${target}`;

const [command, target, arg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const config = TARGETS[target];
if (!config || !["create", "show"].includes(command)) {
  console.error("usage: test-user.mjs create local [--reset] | create live <invite-link> | show local|live [--password]");
  process.exit(2);
}

const sql = (statement) =>
  execFileSync("pnpm", ["exec", "wrangler", "d1", "execute", "DB", "--local", "--command", statement], { stdio: ["ignore", "pipe", "inherit"] });

const keychainRead = () => {
  try {
    return execFileSync("security", ["find-generic-password", "-s", keychainService(target), "-a", config.email, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
};

if (command === "show") {
  const password = keychainRead();
  if (!password) {
    console.error(`No ${target} test user in the Keychain (service ${keychainService(target)}).`);
    process.exit(1);
  }
  console.log(flags.has("--password") ? `${config.email}\n${password}` : config.email);
  process.exit(0);
}

let token;
if (target === "local") {
  if (flags.has("--reset")) sql(`DELETE FROM users WHERE email = '${config.email}'`);
  token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  sql(`INSERT INTO invites (id, token_hash, email, role, expires_at) VALUES ('${crypto.randomUUID()}', '${hash}', '${config.email}', 'MEMBER', '${expires}')`);
} else {
  token = (arg ?? "").split("/join/").pop()?.split(/[?#]/)[0];
  if (!token) {
    console.error("Pass the invite link an admin created for " + config.email);
    process.exit(2);
  }
}

const password = randomBytes(24).toString("base64url");
const response = await fetch(`${config.api}/api/v1/auth/join`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: config.api },
  body: JSON.stringify({ token, email: config.email, firstName: "Claude", lastName: "Test", password }),
});
if (response.status !== 201) {
  console.error(`Sign-up failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}
const { token: session } = await response.json();
// Sign the throwaway session out again; tests sign in themselves.
await fetch(`${config.api}/api/v1/auth/token`, { method: "DELETE", headers: { Authorization: `Bearer ${session}` } }).catch(() => {});

execFileSync("security", ["add-generic-password", "-U", "-s", keychainService(target), "-a", config.email, "-w", password, "-l", `Homer Family Cookbook E2E (${target})`]);
console.log(`Created ${target} test user ${config.email}; password is in the Keychain (service ${keychainService(target)}).`);
