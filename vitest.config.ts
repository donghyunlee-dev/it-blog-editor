import { defineConfig } from "vitest/config";
import path from "path";

// Vitest 4 removed `test.environmentMatchGlobs` (it was deprecated in v3 and
// dropped in v4). The current mechanism for giving different test files
// different environments in a single config is `test.projects`, so existing
// Node-environment tests (documents.test.ts, tiptap-to-storage.test.ts, ...)
// and the new DOM-environment component tests are split into two projects
// that both extend this root config.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "happy-dom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
});
