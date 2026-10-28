import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Tests run inside workerd with a fresh local D1 per test file.
// They exercise server modules directly, not the TanStack Start entry.
export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");
  return {
    plugins: [
      tsconfigPaths(),
      cloudflareTest({
        main: "./test/worker.ts",
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: {
      include: ["src/**/*.test.ts", "test/**/*.test.ts"],
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
