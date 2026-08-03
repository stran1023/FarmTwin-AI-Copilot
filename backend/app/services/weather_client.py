import asyncio
from datetime import datetime, timezone

import httpx

from app.config import settings

_MAX_ATTEMPTS = 3
_RETRY_DELAY_SECONDS = 2


async def fetch_forecast(lat: float, lon: float) -> dict:
    """Pull daily rainfall / temp / humidity forecast for a farm location.

    Retries on 429 (Open-Meteo's free tier has a burst rate limit that
    clears within seconds -- a genuine transient condition, not a reason
    to fail the whole workflow tick or fabricate a weather reading)."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
        "hourly": "relative_humidity_2m",
        "timezone": "Asia/Ho_Chi_Minh",
    }
    async with httpx.AsyncClient() as client:
        for attempt in range(_MAX_ATTEMPTS):
            resp = await client.get(f"{settings.open_meteo_base_url}/forecast", params=params)
            if resp.status_code == 429 and attempt < _MAX_ATTEMPTS - 1:
                await asyncio.sleep(_RETRY_DELAY_SECONDS * (attempt + 1))
                continue
            resp.raise_for_status()
            return resp.json()


async def get_today_reading(lat: float, lon: float) -> dict:
    """Reduce a raw forecast response to today's rainfall/temp/humidity/wind."""
    forecast = await fetch_forecast(lat, lon)
    daily = forecast["daily"]
    hourly = forecast["hourly"]["relative_humidity_2m"][:24]
    return {
        "ts": datetime.now(timezone.utc),
        "rainfall_mm": daily["precipitation_sum"][0],
        "temp_c": (daily["temperature_2m_max"][0] + daily["temperature_2m_min"][0]) / 2,
        "humidity_pct": sum(hourly) / len(hourly),
        "wind_speed_kmh": daily["wind_speed_10m_max"][0],
    }
