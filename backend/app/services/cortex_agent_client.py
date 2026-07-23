"""Calls the Cortex Agent (FARM_OPS_AGENT) that we built via CoCo CLI.

Endpoint + payload shape confirmed against Snowflake's Cortex Agents Run
API docs (agent object variant, since FARM_OPS_AGENT is a named agent
created via CREATE AGENT — see snowflake/coco-prompts.md, step 4):
https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-run
"""

import httpx

from app.config import settings

AGENT_NAME = "FARM_OPS_AGENT"

# The Cortex Search tool (search_agronomy, added by feat-053's CoCo prompt
# alongside query_farm_ops) needs its backing search service named via
# tool_resources on every run call, per the official Cortex Agents Run API
# schema (field name "search_service" -- see
# https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-run).
#
# KNOWN LIVE BLOCKER (see progress.md / feature_list.json feat-048/feat-053):
# FARM_OPS_AGENT's own persisted agent_spec.tool_resources (as created by
# feat-053's CoCo prompt; confirmed via `DESCRIBE AGENT ... ; SELECT
# agent_spec:tool_resources`) uses the field name "cortex_search_service"
# instead. This mismatch makes the platform reject EVERY run call with a 400
# ("field \"search_service\" is not provided for Cortex Search tool
# resource") before the agent even executes -- confirmed this isn't a
# client-payload issue: the identical error occurs whether this client sends
# no tool_resources at all, "search_service", or "cortex_search_service",
# nested per-tool or flat. The fix has to happen in the agent's own
# definition (a new CoCo prompt), which this agent cannot run itself per
# CLAUDE.md. Sending the textbook-correct field name here regardless, since
# it's the right thing to do once that's fixed upstream.
AGRONOMY_SEARCH_TOOL_NAME = "search_agronomy"
AGRONOMY_SEARCH_SERVICE = (
    f"{settings.snowflake_database}.{settings.snowflake_schema}.AGRONOMY_SEARCH"
)

CORTEX_AGENT_ENDPOINT = (
    f"https://{settings.snowflake_account}.snowflakecomputing.com/api/v2/databases/"
    f"{settings.snowflake_database}/schemas/{settings.snowflake_schema}/agents/{AGENT_NAME}:run"
)


async def ask_agent(prompt: str) -> str:
    """Send a user prompt to FARM_OPS_AGENT and return its final text response."""
    headers = {
        "Authorization": f"Bearer {settings.snowflake_pat}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        "stream": False,
        "tool_resources": {
            AGRONOMY_SEARCH_TOOL_NAME: {"search_service": AGRONOMY_SEARCH_SERVICE},
        },
    }
    async with httpx.AsyncClient(timeout=150.0) as client:
        resp = await client.post(CORTEX_AGENT_ENDPOINT, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return "".join(
            item["text"] for item in data.get("content", []) if item.get("type") == "text"
        )
