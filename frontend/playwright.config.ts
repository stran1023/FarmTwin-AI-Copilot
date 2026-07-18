import { defineConfig, devices } from "@playwright/test"

// This project has no mock/staging Snowflake account (see docs/architecture.md
// and CLAUDE.md) -- every check in tests/e2e runs against whatever real
// FastAPI backend + live Snowflake account is already configured, the same
// way every session's manual verification has always worked. There is no CI
// pipeline for this repo, so reuseExistingServer is unconditional (not just
// outside CI): these tests assume the dev servers from `npm run dev` are
// already running (this project's normal workflow), and only start a fresh
// one if not. The backend (uvicorn) is NOT auto-started here -- its startup
// depends on a real Snowflake-configured venv at ../backend/venv, which this
// config can't safely assume exists; tests/e2e/global-setup.ts checks it's
// reachable and fails fast with a clear message if it isn't.
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
