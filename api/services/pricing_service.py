import json
import math
from pathlib import Path

PRICES_PATH = Path(__file__).resolve().parent.parent / "prices.json"

with open(PRICES_PATH) as f:
    PRICES = json.load(f)

CREDITS_RATE = PRICES["credits_rate"]


def to_credits(dollars: float) -> int:
    """Convert $ to credits using global rate."""
    return math.ceil(dollars * CREDITS_RATE)


def calculate_music_price(num_tracks: int) -> dict:
    price = num_tracks * PRICES["music_generator"]["price"]
    return {"usd": round(price, 2), "credits": to_credits(price)}


def calculate_image_price(num_units: int, total_minutes: float) -> dict:
    base = (num_units * PRICES["image_generator"]["unit_rate"]) + (total_minutes * PRICES["image_generator"]["minute_rate"])
    price = max(base, PRICES["image_generator"]["min"])
    return {"usd": round(price, 2), "credits": to_credits(price)}


def calculate_looped_animation_price(num_units: int, total_minutes: float) -> dict:
    base = (num_units * PRICES["looped_animation_generator"]["unit_rate"]) + (total_minutes * PRICES["looped_animation_generator"]["minute_rate"])
    price = max(base, PRICES["looped_animation_generator"]["min"])
    if PRICES["looped_animation_generator"]["max"]:
        price = min(price, PRICES["looped_animation_generator"]["max"])
    return {"usd": round(price, 2), "credits": to_credits(price)}


def calculate_video_price(duration_minutes: float) -> dict:
    base = duration_minutes * PRICES["video_generator"]["minute_rate"]
    price = max(base, PRICES["video_generator"]["min"])
    return {"usd": round(price, 2), "credits": to_credits(price)}