"""In-memory progress tracking for POST /workflow/run/start + GET
/workflow/run/status/{job_id}, so the frontend can show real per-asset
progress instead of a silent multi-minute wait on the original blocking
POST /workflow/run.

A plain in-process dict is enough here: Render's free-tier deploy log
confirms a single worker (`Setting WEB_CONCURRENCY=1`), and jobs are
inherently short-lived (the whole tick finishes in a few minutes) -- losing
an in-flight job across a redeploy is an acceptable, honest tradeoff for a
hackathon demo, not worth a Redis/Snowflake-backed job table.
"""

import uuid
from datetime import datetime, timezone

_JOBS: dict[str, dict] = {}
_MAX_JOBS = 20  # bound memory -- evict the oldest job once exceeded


def create_job(assets: list[tuple[str, str]]) -> str:
    """assets: list of (asset_id, name) pairs, in the order the workflow
    loop will actually process them."""
    job_id = uuid.uuid4().hex
    if len(_JOBS) >= _MAX_JOBS:
        oldest_id = min(_JOBS, key=lambda k: _JOBS[k]["started_at"])
        _JOBS.pop(oldest_id, None)
    _JOBS[job_id] = {
        "job_id": job_id,
        "status": "running",
        "started_at": datetime.now(timezone.utc),
        "assets": {
            asset_id: {
                "asset_id": asset_id,
                "name": name,
                "step": "queued",
                "risk_level": None,
                "metric_snippet": None,
                "recommendations_count": 0,
            }
            for asset_id, name in assets
        },
        "result": None,
        "error": None,
    }
    return job_id


def get_job(job_id: str) -> dict | None:
    return _JOBS.get(job_id)


def update_asset(job_id: str, asset_id: str, **fields) -> None:
    job = _JOBS.get(job_id)
    if not job:
        return
    job["assets"][asset_id].update(fields)


def mark_complete(job_id: str, result: dict) -> None:
    job = _JOBS.get(job_id)
    if not job:
        return
    job["status"] = "complete"
    job["result"] = result


def mark_error(job_id: str, error: str) -> None:
    job = _JOBS.get(job_id)
    if not job:
        return
    job["status"] = "error"
    job["error"] = error
