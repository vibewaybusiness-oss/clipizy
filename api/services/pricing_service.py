import math

CREDITS_RATE = 20

PRICES = {
    "credits_rate": 20,
    "music_generator": {
        "stable-audio": {
            "price": 0.5,
            "description": "Generate a music track based on the description."
        },
        "clipizi-model": {
            "price": 1.0,
            "description": "Generate a music track based on the description."
        }
    },
    "image_generator": {
        "clipizi-model": {
            "minute_rate": 0.10,
            "unit_rate": 0.50,
            "min": 3,
            "max": None,
            "description": "Generate an image based on the description."
        }
    },
    "looped_animation_generator": {
        "clipizi-model": {
            "minute_rate": 0.11,
            "unit_rate": 1,
            "min": 3,
            "max": None,
            "description": "Generate a looping animation based on the description."
        }
    },
    "video_generator": {
        "clipizi-model": {
            "video-duration": 5,
            "minute_rate": 10,
            "min": 20,
            "max": None,
            "description": "Generate a video based on the description."
        }
    }
}


def to_credits(dollars: float) -> int:
    """Convert $ to credits using global rate."""
    return math.ceil(dollars * CREDITS_RATE)


def calculate_music_price(num_tracks: int, model: str = "clipizi-model") -> dict:
    price = num_tracks * PRICES["music_generator"][model]["price"]
    return {"usd": round(price, 2), "credits": to_credits(price)}


def calculate_image_price(num_units: int, total_minutes: float) -> dict:
    base = (num_units * PRICES["image_generator"]["clipizi-model"]["unit_rate"]) + (total_minutes * PRICES["image_generator"]["clipizi-model"]["minute_rate"])
    price = max(base, PRICES["image_generator"]["clipizi-model"]["min"])
    return {"usd": round(price, 2), "credits": to_credits(price)}


def calculate_looped_animation_price(num_units: int, total_minutes: float) -> dict:
    base = (num_units * PRICES["looped_animation_generator"]["clipizi-model"]["unit_rate"]) + (total_minutes * PRICES["looped_animation_generator"]["clipizi-model"]["minute_rate"])
    price = max(base, PRICES["looped_animation_generator"]["clipizi-model"]["min"])
    if PRICES["looped_animation_generator"]["clipizi-model"]["max"]:
        price = min(price, PRICES["looped_animation_generator"]["clipizi-model"]["max"])
    return {"usd": round(price, 2), "credits": to_credits(price)}


def calculate_video_price(duration_minutes: float) -> dict:
    base = duration_minutes * PRICES["video_generator"]["clipizi-model"]["minute_rate"]
    price = max(base, PRICES["video_generator"]["clipizi-model"]["min"])
    return {"usd": round(price, 2), "credits": to_credits(price)}