"""Resets the live demo to a clean, repeatable starting state before a live
walkthrough or judging session -- live-testing across many sessions leaves
the fish pond's DO reading wherever the random-walk simulator last drifted
it, and pending_approval recommendations pile up next to leftovers from
earlier runs (see progress.md's repeated "known side effect" notes, e.g.
feat-017's evidence trail).

What this does, against the real configured Snowflake account:

1. Restores every fish_pond asset (the crisis this demo's narrative is
   built around -- see docs/FarmTwin-AI-Copilot.md and progress.md Session
   011's feat-011 evidence) to a fresh critical dissolved-oxygen reading,
   regardless of how far the simulator has since drifted it.
2. Writes a matching critical ASSET_RISK_ASSESSMENTS row, so GET /assets
   and the dashboard show the crisis immediately, without waiting for a
   fresh /workflow/run tick.
3. Deletes any currently pending_approval RECOMMENDATIONS rows. These are
   disposable/regenerable -- the same real Cortex Agent call
   /workflow/run always makes -- so clearing them avoids a fresh demo
   run's pending list piling up next to stale leftovers. Already-decided
   (approved/rejected) rows are real history and are never touched.

Deliberately does NOT fabricate a fresh recommendation set itself -- the
real Cortex Agent call belongs at demo time (POST /workflow/run against
the running backend), since watching a genuine live AI call respond to
the restored crisis is a more convincing demo moment than a canned one.

This is a manual, opt-in admin tool -- intentionally NOT wired into
init.sh, since it mutates live demo data and shouldn't run as a side
effect of routine verification.

Usage:
    cd backend && venv/Scripts/python ../scripts/reset_demo_state.py --dry-run
    cd backend && venv/Scripts/python ../scripts/reset_demo_state.py
"""

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services import snowflake_client  # noqa: E402

CRISIS_READING = {
    "water_temp_c": 33.4,
    "ph": 6.98,
    "dissolved_oxygen_mg_l": 3.5,
    "feed_level_pct": 24.0,
    "biomass_kg": 329.0,
}

ALL_READING_FIELDS = [
    "water_temp_c", "ph", "dissolved_oxygen_mg_l", "feed_level_pct", "biomass_kg",
    "air_temp_c", "humidity_pct", "water_l", "egg_count",
    "growth_stage", "soil_moisture_pct", "nitrogen_ppm", "irrigation_status",
    "disease_risk_pct", "harvest_readiness_pct",
]


def _fish_pond_asset_ids() -> list[str]:
    rows = snowflake_client.run_query(
        "SELECT ASSET_ID, NAME FROM FARM_ASSETS WHERE ASSET_TYPE = %s", ("fish_pond",)
    )
    return [(r["ASSET_ID"], r["NAME"]) for r in rows]


def _count_pending_recommendations() -> int:
    rows = snowflake_client.run_query(
        "SELECT COUNT(*) AS N FROM RECOMMENDATIONS WHERE STATUS = %s", ("pending_approval",)
    )
    return rows[0]["N"]


def _insert_reading(asset_id: str, ts: datetime) -> None:
    columns = ["asset_id", "ts"] + ALL_READING_FIELDS
    placeholders = ", ".join(["%s"] * len(columns))
    values = (asset_id, ts, *(CRISIS_READING.get(f) for f in ALL_READING_FIELDS))
    snowflake_client.execute(
        f"INSERT INTO ASSET_READINGS ({', '.join(columns)}) VALUES ({placeholders})",
        values,
    )


def _insert_risk(asset_id: str, ts: datetime) -> None:
    snowflake_client.execute(
        "INSERT INTO ASSET_RISK_ASSESSMENTS (asset_id, ts, risk_type, risk_level, notes) "
        "VALUES (%s, %s, %s, %s, %s)",
        (
            asset_id,
            ts,
            "dissolved_oxygen",
            "critical",
            f"Dissolved oxygen at {CRISIS_READING['dissolved_oxygen_mg_l']} mg/L, "
            "below the 3.5 mg/L critical threshold. (reset_demo_state.py)",
        ),
    )


def _clear_pending_recommendations() -> int:
    return snowflake_client.execute(
        "DELETE FROM RECOMMENDATIONS WHERE status = %s", ("pending_approval",)
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change without writing anything.",
    )
    args = parser.parse_args()

    ts = datetime.now(timezone.utc)
    fish_ponds = _fish_pond_asset_ids()
    pending_count = _count_pending_recommendations()

    if not fish_ponds:
        print("No fish_pond asset found in FARM_ASSETS -- nothing to reset.")
        return

    if args.dry_run:
        print("[DRY RUN] Would restore a fresh critical DO reading "
              f"({CRISIS_READING['dissolved_oxygen_mg_l']} mg/L) for:")
        for asset_id, name in fish_ponds:
            print(f"  - {asset_id} ({name})")
        print(f"[DRY RUN] Would delete {pending_count} pending_approval "
              "recommendation row(s). Approved/rejected rows are never touched.")
        return

    for asset_id, name in fish_ponds:
        _insert_reading(asset_id, ts)
        _insert_risk(asset_id, ts)
        print(f"Restored {asset_id} ({name}) to a fresh critical dissolved-oxygen "
              f"reading ({CRISIS_READING['dissolved_oxygen_mg_l']} mg/L).")

    cleared = _clear_pending_recommendations()
    print(f"Cleared {cleared} pending_approval recommendation(s). "
          "Run POST /workflow/run against the live backend to generate a fresh, real set.")


if __name__ == "__main__":
    main()
