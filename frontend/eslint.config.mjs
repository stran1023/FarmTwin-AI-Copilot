import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright e2e specs run under Node's test runner, not the Next.js
    // app runtime -- Next-flavored rules (react-hooks, etc.) don't apply.
    "tests/e2e/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
