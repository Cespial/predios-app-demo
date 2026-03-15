"""
Supabase client singleton.
Import `supabase` from this module to interact with the database.
"""

from supabase import create_client, Client
from ..config import SUPABASE_URL, SUPABASE_KEY

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "SUPABASE_URL and SUPABASE_KEY must be set in your .env file."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
