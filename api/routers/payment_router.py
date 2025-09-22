from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import (
    PaymentIntentCreate, 
    PaymentIntentResponse, 
    PaymentRead,
    PaymentWebhookData
)
from api.services import stripe_service, credits_service, PRICES
from api.routers.auth_router import get_current_user
from api.models import User
from typing import List
import json

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
    payment_data: PaymentIntentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe payment intent for credits purchase"""
    try:
        return stripe_service.create_payment_intent(db, str(current_user.id), payment_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating payment intent: {str(e)}"
        )

@router.post("/confirm/{payment_intent_id}")
def confirm_payment_intent(
    payment_intent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm a payment intent"""
    try:
        payment = stripe_service.confirm_payment_intent(db, payment_intent_id)
        return {
            "message": "Payment confirmed successfully",
            "payment_id": str(payment.id),
            "status": payment.status.value,
            "credits_added": payment.credits_purchased
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error confirming payment: {str(e)}"
        )

@router.get("/history", response_model=List[PaymentRead])
def get_payment_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's payment history"""
    try:
        if limit > 100:
            limit = 100  # Cap at 100 payments
        
        payments = stripe_service.get_payment_history(db, str(current_user.id), limit)
        return payments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error retrieving payment history: {str(e)}"
        )

@router.post("/refund/{payment_id}")
def refund_payment(
    payment_id: str,
    amount_cents: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refund a payment (admin or user's own payments)"""
    try:
        # Verify the payment belongs to the user
        from api.models import Payment
        payment = db.query(Payment).filter(
            Payment.id == payment_id,
            Payment.user_id == current_user.id
        ).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        success = stripe_service.refund_payment(db, payment_id, amount_cents)
        if success:
            return {"message": "Refund processed successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to process refund"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing refund: {str(e)}"
        )

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        signature = request.headers.get("stripe-signature")
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing stripe-signature header"
            )
        
        success = stripe_service.handle_webhook(db, payload.decode(), signature)
        
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook processing failed"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing webhook: {str(e)}"
        )

@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific payment"""
    try:
        from api.models import Payment
        payment = db.query(Payment).filter(
            Payment.id == payment_id,
            Payment.user_id == current_user.id
        ).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        return payment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving payment: {str(e)}"
        )

# PRICING ENDPOINTS
@router.get("/pricing/config")
def get_pricing_config():
    """Get the complete pricing configuration"""
    return PRICES

@router.get("/pricing/music")
def price_music(num_tracks: int = 1):
    """Calculate price for music generation"""
    return credits_service.calculate_music_price(num_tracks)

@router.get("/pricing/image")
def price_image(num_units: int, total_minutes: float):
    """Calculate price for image generation"""
    return credits_service.calculate_image_price(num_units, total_minutes)

@router.get("/pricing/looped-animation")
def price_looped(num_units: int, total_minutes: float):
    """Calculate price for looped animation generation"""
    return credits_service.calculate_looped_animation_price(num_units, total_minutes)

@router.get("/pricing/video")
def price_video(duration_minutes: float):
    """Calculate price for video generation"""
    return credits_service.calculate_video_price(duration_minutes)
