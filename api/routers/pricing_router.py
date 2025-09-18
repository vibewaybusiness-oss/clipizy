from fastapi import APIRouter
from api.services import pricing_service
import json
from pathlib import Path

router = APIRouter(prefix="/pricing", tags=["Pricing"])

@router.get("/config")
def get_pricing_config():
    """Get the complete pricing configuration"""
    PRICES_PATH = Path(__file__).resolve().parent.parent / "library" / "prices.json"
    with open(PRICES_PATH) as f:
        return json.load(f)

@router.get("/music")
def price_music(num_tracks: int = 1):
    return pricing_service.calculate_music_price(num_tracks)

@router.get("/image")
def price_image(num_units: int, total_minutes: float):
    return pricing_service.calculate_image_price(num_units, total_minutes)

@router.get("/looped-animation")
def price_looped(num_units: int, total_minutes: float):
    return pricing_service.calculate_looped_animation_price(num_units, total_minutes)

@router.get("/video")
def price_video(duration_minutes: float):
    return pricing_service.calculate_video_price(duration_minutes)