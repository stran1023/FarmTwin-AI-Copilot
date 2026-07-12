# Climate-Adaptive Agriculture Copilot

AI Operations Copilot for Vietnamese rice cooperatives. Turns weather, farm,
and sensor data into daily work orders and briefings via an autonomous
workflow, built on Snowflake Cortex and Snowflake CoCo CLI.

Built for: Snowflake CoCo CLI Hackathon 2026 (Domain-Specific AI Copilot /
Autonomous Workflow track)

## Repo layout

```
climate-agriculture-copilot/
├── snowflake/         # SQL + CoCo session logs — how we built the Snowflake side
├── backend/           # FastAPI app: orchestrates the daily workflow
├── frontend/          # Next.js dashboard
├── scripts/           # one-off seed / demo data scripts
└── docs/              # architecture notes, demo script
```

## Prerequisites

- Snowflake account (trial is fine — see [sign up](https://signup.snowflake.com))
- [Snowflake CoCo CLI](https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code-cli) installed locally
- Python 3.11+
- Node.js 20+
- Git + a GitHub account

## Setup

### 1. Snowflake CoCo CLI

```bash
# macOS / Linux / WSL
curl -fsSL https://ai.snowflake.com/static/cc-scripts/install.sh | sh

# verify
cortex --version
cortex   # launches setup wizard, connects to your Snowflake account
```

CoCo stores your connection in `~/.snowflake/connections.toml` — this is
**never committed** to the repo (see `.gitignore`).

We use CoCo interactively to scaffold the Snowflake-side objects (tables,
Cortex Search service, semantic view, Cortex Agent). See `snowflake/README.md`
for the exact prompts we used — keep that file updated as you go, since it
doubles as your "how we used CoCo" evidence for judging.

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env        # fill in your Snowflake + weather API creds
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npm install
npm run dev
```

(We scaffold this with `create-next-app` directly rather than committing
generated boilerplate — see `frontend/README.md`.)

## Environment variables

See `.env.example` at repo root. Copy it into `backend/.env` and fill in real
values. Never commit `.env`.
