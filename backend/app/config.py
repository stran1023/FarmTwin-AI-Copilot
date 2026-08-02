from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    snowflake_account: str = ""
    snowflake_user: str = ""
    snowflake_role: str = ""
    snowflake_warehouse: str = ""
    snowflake_database: str = ""
    snowflake_schema: str = ""
    snowflake_pat: str = ""

    open_meteo_base_url: str = "https://api.open-meteo.com/v1"
    # Single farm-wide location for weather ingestion (FARM_ASSETS has no
    # lat/lon post-pivot -- the digital twin is one physical farm, not many
    # geo-distributed plots). Defaults to the same Mekong Delta / Can Tho
    # coordinates used by the prior build's demo farms.
    farm_lat: float = 10.0452
    farm_lon: float = 105.7469

    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    # Shared passcode gating Cortex-Agent-triggering endpoints on the public
    # hackathon deployment (see /demo/unlock). Empty string (the default,
    # used by local dev and every test) disables the gate entirely -- it
    # only takes effect once a deployment sets a real value.
    demo_passcode: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
