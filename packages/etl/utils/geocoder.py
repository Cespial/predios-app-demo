"""
Geocoder helper using the Google Maps Geocoding API.
"""

from typing import Optional, Tuple
import googlemaps
from ..config import GOOGLE_PLACES_API_KEY

_gmaps: Optional[googlemaps.Client] = None


def _get_client() -> googlemaps.Client:
    global _gmaps
    if _gmaps is None:
        if not GOOGLE_PLACES_API_KEY:
            raise EnvironmentError("GOOGLE_PLACES_API_KEY is not set.")
        _gmaps = googlemaps.Client(key=GOOGLE_PLACES_API_KEY)
    return _gmaps


def geocode_address(
    address: str, city: str = "", country: str = "Colombia"
) -> Optional[Tuple[float, float]]:
    """
    Geocode an address string and return (lat, lng) or None if not found.

    Parameters
    ----------
    address : str
        The street address or place name.
    city : str, optional
        City name to append for disambiguation.
    country : str, optional
        Country name (default "Colombia").

    Returns
    -------
    tuple[float, float] | None
        (latitude, longitude) or None.
    """
    client = _get_client()
    query = f"{address}, {city}, {country}" if city else f"{address}, {country}"
    results = client.geocode(query)
    if not results:
        return None
    location = results[0]["geometry"]["location"]
    return (location["lat"], location["lng"])


def reverse_geocode(lat: float, lng: float) -> Optional[str]:
    """
    Reverse-geocode coordinates into a formatted address string.

    Returns
    -------
    str | None
        Formatted address or None.
    """
    client = _get_client()
    results = client.reverse_geocode((lat, lng))
    if not results:
        return None
    return results[0].get("formatted_address")
