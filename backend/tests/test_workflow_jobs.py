"""Pure unit tests for app/services/workflow_jobs.py's in-memory job store
-- no Snowflake/Cortex/network involved, same style as test_demo_auth.py."""

from app.services import workflow_jobs


def test_create_job_seeds_all_assets_as_queued():
    job_id = workflow_jobs.create_job([("FP-001", "Tilapia Pond A"), ("GH-001", "Greenhouse A")])
    job = workflow_jobs.get_job(job_id)
    assert job["status"] == "running"
    assert job["result"] is None
    assert job["error"] is None
    assert set(job["assets"]) == {"FP-001", "GH-001"}
    assert job["assets"]["FP-001"]["step"] == "queued"
    assert job["assets"]["FP-001"]["name"] == "Tilapia Pond A"


def test_get_unknown_job_returns_none():
    assert workflow_jobs.get_job("does-not-exist") is None


def test_update_asset_merges_fields():
    job_id = workflow_jobs.create_job([("FP-001", "Tilapia Pond A")])
    workflow_jobs.update_asset(job_id, "FP-001", step="observing")
    assert workflow_jobs.get_job(job_id)["assets"]["FP-001"]["step"] == "observing"

    workflow_jobs.update_asset(job_id, "FP-001", risk_level="critical", metric_snippet="DO: 2.0 mg/L")
    asset = workflow_jobs.get_job(job_id)["assets"]["FP-001"]
    assert asset["step"] == "observing"  # untouched by the second call
    assert asset["risk_level"] == "critical"
    assert asset["metric_snippet"] == "DO: 2.0 mg/L"


def test_update_asset_on_unknown_job_is_a_no_op():
    workflow_jobs.update_asset("does-not-exist", "FP-001", step="observing")  # must not raise


def test_mark_complete_sets_status_and_result():
    job_id = workflow_jobs.create_job([("FP-001", "Tilapia Pond A")])
    workflow_jobs.mark_complete(job_id, {"assets_assessed": 1})
    job = workflow_jobs.get_job(job_id)
    assert job["status"] == "complete"
    assert job["result"] == {"assets_assessed": 1}


def test_mark_error_sets_status_and_error():
    job_id = workflow_jobs.create_job([("FP-001", "Tilapia Pond A")])
    workflow_jobs.mark_error(job_id, "boom")
    job = workflow_jobs.get_job(job_id)
    assert job["status"] == "error"
    assert job["error"] == "boom"


def test_job_store_evicts_oldest_once_over_the_cap():
    job_ids = [workflow_jobs.create_job([("FP-001", "Tilapia Pond A")]) for _ in range(workflow_jobs._MAX_JOBS + 1)]
    assert workflow_jobs.get_job(job_ids[0]) is None  # oldest evicted
    assert workflow_jobs.get_job(job_ids[-1]) is not None  # newest survives
