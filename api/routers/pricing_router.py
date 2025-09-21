from fastapi import APIRouter
from api.services import PRICES, points_service

router = APIRouter(tags=["Pricing"])

@router.get("/config")
def get_pricing_config():
    """Get the complete pricing configuration"""
    return PRICES

@router.get("/music")
def price_music(num_tracks: int = 1):
    return points_service.calculate_music_price(num_tracks)

@router.get("/image")
def price_image(num_units: int, total_minutes: float):
    return points_service.calculate_image_price(num_units, total_minutes)

@router.get("/looped-animation")
def price_looped(num_units: int, total_minutes: float):
    return points_service.calculate_looped_animation_price(num_units, total_minutes)

@router.get("/video")
def price_video(duration_minutes: float):
    return points_service.calculate_video_price(duration_minutes)