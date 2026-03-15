"""
Configuration module.
Loads environment variables from .env and exports them for use across the ETL pipeline.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the etl package root, then from the project root as fallback
_etl_root = Path(__file__).resolve().parent
_project_root = _etl_root.parent.parent  # predios-app-demo/

load_dotenv(_etl_root / ".env")
load_dotenv(_project_root / ".env")

# ---------- Supabase ----------
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

# ---------- Mapbox ----------
MAPBOX_TOKEN: str = os.getenv("MAPBOX_TOKEN", "")

# ---------- Anthropic ----------
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

# ---------- Google ----------
GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")


def validate():
    """Raise if any critical env var is missing."""
    missing = []
    for name in [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "ANTHROPIC_API_KEY",
        "GOOGLE_PLACES_API_KEY",
    ]:
        if not globals().get(name):
            missing.append(name)
    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}"
        )


if __name__ == "__main__":
    validate()
    print("All required environment variables are set.")
