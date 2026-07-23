"""Rule-based risk assessment ("Understand") and short-horizon trend
projection ("Predict") for one asset's latest simulated reading.

Thresholds mirror the ones the Cortex Agent itself was instructed to use
(see snowflake/coco-prompts.md Part 2 prompt 4: "DO < 5.0 = stress, < 3.5 =
critical; water temp > 32C; disease risk > 20%"), kept in plain Python so
the Understand stage doesn't need an LLM call for every asset on every
/workflow/run tick -- only assets flagged at medium+ risk here go on to the
(slower, real) Cortex Agent call in the Recommend stage.
"""

_SEVERITY = {"low": 0, "medium": 1, "high": 2, "critical": 3}

# risk_type -> (reading field driving it, "lower_worse" | "higher_worse")
# used by predict_trend() to decide whether the driving metric is moving
# in the bad direction since the previous reading.
_TREND_METRIC = {
    "dissolved_oxygen": ("dissolved_oxygen_mg_l", "lower_worse"),
    "water_temperature": ("water_temp_c", "higher_worse"),
    "heat_stress": ("air_temp_c", "higher_worse"),
    "feed_shortage": ("feed_level_pct", "lower_worse"),
    "drought": ("soil_moisture_pct", "lower_worse"),
    "flood": ("soil_moisture_pct", "higher_worse"),
    "nutrient_deficiency": ("nitrogen_ppm", "lower_worse"),
    "disease": ("disease_risk_pct", "higher_worse"),
    "co2_depletion": ("co2_ppm", "lower_worse"),
}


def assess_risk(asset_type: str, reading: dict) -> tuple[str, str, str]:
    """Return (risk_type, risk_level, notes) -- the single most severe
    rule-based risk for this asset type given its latest reading, or
    ("none", "low", ...) if every monitored metric is within range."""
    candidates: list[tuple[int, str, str, str]] = []

    def add(risk_type: str, level: str, notes: str) -> None:
        candidates.append((_SEVERITY[level], risk_type, level, notes))

    if asset_type == "fish_pond":
        do = reading.get("dissolved_oxygen_mg_l")
        if do is not None:
            if do < 3.5:
                add("dissolved_oxygen", "critical", f"Dissolved oxygen at {do} mg/L, below the 3.5 mg/L critical threshold.")
            elif do < 5.0:
                add("dissolved_oxygen", "high", f"Dissolved oxygen at {do} mg/L, below the 5.0 mg/L stress threshold.")
            elif do < 6.0:
                add("dissolved_oxygen", "medium", f"Dissolved oxygen at {do} mg/L, trending toward the stress threshold.")
        temp = reading.get("water_temp_c")
        if temp is not None and temp > 32.0:
            add("water_temperature", "high", f"Water temperature at {temp}C, above the 32C thermal-stress threshold.")

    elif asset_type == "chicken_coop":
        temp = reading.get("air_temp_c")
        if temp is not None and temp > 32.0:
            add("heat_stress", "high", f"Coop air temperature at {temp}C, above the 32C heat-stress threshold.")
        feed = reading.get("feed_level_pct")
        if feed is not None and feed < 15.0:
            add("feed_shortage", "high", f"Feed level at {feed}%, below the 15% restock threshold.")

    elif asset_type == "rice_field":
        moisture = reading.get("soil_moisture_pct")
        if moisture is not None:
            if moisture < 30.0:
                add("drought", "high", f"Soil moisture at {moisture}%, below the 30% drought threshold.")
            elif moisture > 90.0:
                add("flood", "high", f"Soil moisture at {moisture}%, above the 90% flood-risk threshold.")
        nitrogen = reading.get("nitrogen_ppm")
        if nitrogen is not None and nitrogen < 10.0:
            add("nutrient_deficiency", "medium", f"Nitrogen at {nitrogen} ppm, below the 10 ppm deficiency threshold.")

    elif asset_type == "fruit_orchard":
        disease = reading.get("disease_risk_pct")
        if disease is not None:
            if disease > 40.0:
                add("disease", "critical", f"Disease risk at {disease}%, above the 40% critical threshold.")
            elif disease > 20.0:
                add("disease", "high", f"Disease risk at {disease}%, above the 20% elevated threshold.")

    elif asset_type == "greenhouse":
        disease = reading.get("disease_risk_pct")
        humidity = reading.get("humidity_pct")
        co2 = reading.get("co2_ppm")
        if disease is not None:
            if disease > 40.0:
                add("disease", "critical", f"Disease risk at {disease}%, above the 40% critical threshold.")
            elif humidity is not None and humidity > 80.0 and disease > 20.0:
                add(
                    "disease",
                    "medium",
                    f"Disease risk at {disease}% with humidity at {humidity}%, elevated fungal-disease risk "
                    "from reduced ventilation.",
                )
        if co2 is not None and co2 < 400.0:
            add(
                "co2_depletion",
                "medium",
                f"CO2 at {co2} ppm, below the 400 ppm daytime stress threshold -- ventilation or enrichment needed.",
            )

    if not candidates:
        return ("none", "low", "All monitored metrics within normal range.")
    candidates.sort(key=lambda c: c[0], reverse=True)
    _, risk_type, risk_level, notes = candidates[0]
    return (risk_type, risk_level, notes)


def predict_trend(risk_type: str, current: dict, previous: dict | None) -> str | None:
    """If the metric driving `risk_type` is moving in the worsening
    direction since `previous`, return a one-sentence linear-projection
    prediction. Returns None if stable/improving or there's no prior
    reading to compare against (nothing to predict from yet)."""
    if not previous or risk_type not in _TREND_METRIC:
        return None
    field, direction = _TREND_METRIC[risk_type]
    curr_val, prev_val = current.get(field), previous.get(field)
    if curr_val is None or prev_val is None:
        return None

    delta = curr_val - prev_val
    worsening = delta < 0 if direction == "lower_worse" else delta > 0
    if not worsening:
        return None

    projected = round(curr_val + delta, 2)
    label = field.replace("_", " ")
    return (
        f"{label.capitalize()} moved from {prev_val} to {curr_val} this tick. "
        f"If this trend continues at the same rate, expect approximately "
        f"{projected} by the next reading without intervention."
    )
