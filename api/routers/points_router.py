from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import (
    PointsBalance, 
    PointsTransactionRead, 
    PointsSpendRequest, 
    PointsPurchaseRequest
)
from api.services import points_service, stripe_service
from api.models import User
from typing import List

router = APIRouter(prefix="/points", tags=["Points"])

@router.get("/balance", response_model=PointsBalance)
def get_points_balance(
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Get user's current points balance and recent transactions"""
    try:
        return points_service.get_user_balance(db, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error retrieving points balance: {str(e)}"
        )

@router.get("/transactions", response_model=List[PointsTransactionRead])
def get_transaction_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Get user's points transaction history"""
    try:
        if limit > 100:
            limit = 100  # Cap at 100 transactions
        
        transactions = points_service.get_transaction_history(db, user_id, limit)
        return transactions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error retrieving transaction history: {str(e)}"
        )

@router.post("/spend")
def spend_points(
    spend_request: PointsSpendRequest,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Spend points from user's account"""
    try:
        # Check if user can afford the spend
        if not points_service.can_afford(db, user_id, spend_request.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient points balance"
            )
        
        transaction = points_service.spend_points(db, user_id, spend_request)
        return {
            "message": f"Successfully spent {spend_request.amount} points",
            "transaction_id": str(transaction.id),
            "new_balance": transaction.balance_after
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error spending points: {str(e)}"
        )

@router.post("/purchase")
def purchase_points(
    purchase_request: PointsPurchaseRequest,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Purchase points using Stripe"""
    try:
        from api.schemas import PaymentIntentCreate
        
        payment_data = PaymentIntentCreate(
            amount_dollars=purchase_request.amount_dollars,
            points_per_dollar=100,  # 100 points per dollar
            payment_method_id=purchase_request.payment_method_id,
            description=f"Purchase of {int(purchase_request.amount_dollars * 100)} points"
        )
        
        payment_intent = stripe_service.create_payment_intent(db, user_id, payment_data)
        return payment_intent
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating payment intent: {str(e)}"
        )

@router.get("/can-afford/{amount}")
def check_affordability(
    amount: int,
    db: Session = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000001"
):
    """Check if user can afford to spend the specified amount of points"""
    try:
        can_afford = points_service.can_afford(db, user_id, amount)
        return {
            "can_afford": can_afford,
            "amount_requested": amount,
            "current_balance": points_service.get_user_balance(db, user_id).current_balance
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error checking affordability: {str(e)}"
        )
