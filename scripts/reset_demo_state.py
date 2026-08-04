"""Resets the live demo to its default starting state before a live
walkthrough or judging session -- live-testing across many sessions leaves
every asset's reading wherever the random-walk simulator last drifted it,
and pending_approval recommendations pile up next to leftovers from earlier
runs (see progress.md's repeated "known side effect" notes).

What this does, against the real configured Snowflake account:

1. Restores every one of the 5 real Farm Assets to a genuinely healthy
   reading (dashboard opens green across the board: low risk, high health
   score, no active alerts) -- using asset_simulator.default_seed(), the
   simulator's own real healthy baseline per asset type, so this can never
   silently drift out of sync with what the simulator itself considers
   "healthy."
2. One deliberate exception: the Chicken Coop's feed_level_pct is seeded at
   17.0 instead of its default healthy seed (70.0) -- still comfortably
   above the real 15.0 restock threshold (risk_engine.py), so the dashboard
   still opens fully green, but close enough to it that asset_simulator.py's
   real per-tick mechanics for this field (a constant -2.0/tick drift plus
   a +/-3.0 random step, i.e. next value centered at 15.0 with the threshold
   sitting at the middle of the real per-tick spread) give a live Run Farm
   Tick a real, unscripted ~50% chance of tripping real "high" risk
   (feed_shortage -> UI status "critical", red, health_score 35) on the very
   first click, and -- because that drift is a constant per-tick bias, not
   conditional on the current value -- an even higher chance by a second
   click if the first one doesn't land. This is the ONE metric in the whole
   simulator where the real math supports a single-tick healthy-to-critical
   swing being demo-reliable without fabricating a result: every other
   metric's real per-tick step size (see asset_simulator.py's
   _NUMERIC_METRICS) is too small relative to its real risk_engine.py
   threshold distance to cross from a genuinely healthy value in one tick.
3. Writes each asset's risk row using the real risk_engine.assess_risk()
   against the seeded reading (not a hand-typed guess), so the seeded state
   is byte-for-byte what a real /workflow/run tick would have produced for
   that same reading.
4. Deletes any currently pending_approval RECOMMENDATIONS rows -- disposable
   and regenerable by a real Cortex Agent call, so clearing them avoids a
   fresh demo run's pending list piling up next to stale leftovers.
   Already-decided (approved/rejected) rows are real history and are never
   touched.

Deliberately does NOT fabricate a fresh recommendation set itself -- the
real Cortex Agent call belongs at demo time (POST /workflow/run against the
running backend), since watching a genuine live AI call respond to a real
newly-detected risk is a more convincing demo moment than a canned one.

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

from app.services import asset_simulator, risk_engine, snowflake_client  # noqa: E402

# The one deliberate tension point -- see module docstring point 2 for the
# real per-tick math (asset_simulator.py's feed_level_pct drift/step) this
# value was chosen against.
_CHICKEN_COOP_FEED_OVERRIDE = 17.0


def _all_assets() -> list[tuple[str, str, str]]:
    rows = snowflake_client.run_query("SELECT ASSET_ID, ASSET_TYPE, NAME FROM FARM_ASSETS ORDER BY ASSET_ID")
    return [(r["ASSET_ID"], r["ASSET_TYPE"], r["NAME"]) for r in rows]


def _count_pending_recommendations() -> int:
    rows = snowflake_client.run_query(
        "SELECT COUNT(*) AS N FROM RECOMMENDATIONS WHERE STATUS = %s", ("pending_approval",)
    )
    return rows[0]["N"]


def _healthy_reading(asset_type: str) -> dict:
    """A genuinely healthy reading for one asset type, sourced from the real
    simulator's own default seed (never hand-duplicated), plus the one
    deliberate near-threshold override documented in the module docstring
    and non-numeric fields (growth_stage/irrigation_status) set to the same
    values the real simulator would derive for a mid-cycle healthy asset."""
    row: dict = dict.fromkeys(asset_simulator.ALL_READING_FIELDS)
    row.update(asset_simulator.default_seed(asset_type))

    if asset_type == "chicken_coop":
        row["feed_level_pct"] = _CHICKEN_COOP_FEED_OVERRIDE

    if asset_type in ("rice_field", "fruit_orchard", "greenhouse"):
        row["growth_stage"] = "vegetative"

    if asset_type in ("rice_field", "greenhouse"):
        # Same real rule as asset_simulator._next_irrigation_status().
        row["irrigation_status"] = "active" if row["soil_moisture_pct"] < 40.0 else "inactive"

    return row


def _insert_reading(asset_id: str, ts: datetime, reading: dict) -> None:
    columns = ["asset_id", "ts"] + asset_simulator.ALL_READING_FIELDS
    placeholders = ", ".join(["%s"] * len(columns))
    values = (asset_id, ts, *(reading.get(f) for f in asset_simulator.ALL_READING_FIELDS))
    snowflake_client.execute(
        f"INSERT INTO ASSET_READINGS ({', '.join(columns)}) VALUES ({placeholders})",
        values,
    )


def _insert_risk(asset_id: str, ts: datetime, asset_type: str, reading: dict) -> tuple[str, str, str]:
    risk_type, risk_level, notes = risk_engine.assess_risk(asset_type, reading)
    snowflake_client.execute(
        "INSERT INTO ASSET_RISK_ASSESSMENTS (asset_id, ts, risk_type, risk_level, notes) "
        "VALUES (%s, %s, %s, %s, %s)",
        (asset_id, ts, risk_type, risk_level, notes),
    )
    return risk_type, risk_level, notes


def _clear_pending_recommendations() -> int:
    return snowflake_client.execute("DELETE FROM RECOMMENDATIONS WHERE status = %s", ("pending_approval",))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print what would change without writing anything.")
    args = parser.parse_args()

    ts = datetime.now(timezone.utc)
    assets = _all_assets()
    pending_count = _count_pending_recommendations()

    if not assets:
        print("No assets found in FARM_ASSETS -- nothing to reset.")
        return

    if args.dry_run:
        print("[DRY RUN] Would restore a healthy baseline reading for:")
        for asset_id, asset_type, name in assets:
            reading = _healthy_reading(asset_type)
            risk_type, risk_level, _notes = risk_engine.assess_risk(asset_type, reading)
            flag = " <- tuned near its real risk threshold" if asset_type == "chicken_coop" else ""
            print(f"  - {asset_id} ({name}, {asset_type}): risk={risk_level} ({risk_type}){flag}")
        print(f"[DRY RUN] Would delete {pending_count} pending_approval recommendation row(s).")
        return

    for asset_id, asset_type, name in assets:
        reading = _healthy_reading(asset_type)
        _insert_reading(asset_id, ts, reading)
        risk_type, risk_level, _notes = _insert_risk(asset_id, ts, asset_type, reading)
        print(f"Restored {asset_id} ({name}) to a healthy baseline -- real risk assessment: {risk_level} ({risk_type}).")

    cleared = _clear_pending_recommendations()
    print(f"Cleared {cleared} pending_approval recommendation(s).")
    print("Run POST /workflow/run against the live backend to generate a real next tick.")


if __name__ == "__main__":
    main()
