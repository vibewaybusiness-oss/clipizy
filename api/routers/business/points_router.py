from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.db import get_db
from api.schemas import (
    CreditsBalance, 
    CreditsTransactionRead, 
    CreditsSpendRequest, 
    CreditsPurchaseRequest
)
from api.services import credits_service, stripe_service
from api.models import User
from typing import List
from ..auth.auth_router import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/credits", tags=["Credits"])

@router.get("/balance", response_model=CreditsBalance)
def get_credits_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's current credits balance and recent transactions"""
    try:
        return credits_service.get_user_balance(db, str(current_user.id))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving credits balance: {str(e)}"
        )

@router.get("/transactions", response_model=List[CreditsTransactionRead])
def get_transaction_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's credits transaction history"""
    try:
        if limit > 100:
            limit = 100  # Cap at 100 transactions
        
        transactions = credits_service.get_transaction_history(db, str(current_user.id), limit)
        return transactions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving transaction history: {str(e)}"
        )

@router.post("/spend")
def spend_credits(
    spend_request: CreditsSpendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Spend credits from user's account"""
    try:
        # Check if user can afford the spend
        if not credits_service.can_afford(db, str(current_user.id), spend_request.amount):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient credits balance"
            )
        
        transaction = credits_service.spend_credits(db, str(current_user.id), spend_request)
        return {
            "message": f"Successfully spent {spend_request.amount} credits",
            "transaction_id": str(transaction.id),
            "new_balance": transaction.balance_after
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error spending credits: {str(e)}"
        )

@router.post("/purchase")
def purchase_credits(
    purchase_request: CreditsPurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Purchase credits using Stripe"""
    try:
        from api.schemas import PaymentIntentCreate
        
        payment_data = PaymentIntentCreate(
            amount_dollars=purchase_request.amount_dollars,
            credits_per_dollar=100,  # 100 credits per dollar
            payment_method_id=purchase_request.payment_method_id,
            description=f"Purchase of {int(purchase_request.amount_dollars * 100)} credits"
        )
        
        payment_intent = stripe_service.create_payment_intent(db, current_user.id, payment_data)
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
    current_user: User = Depends(get_current_user)
):
    """Check if user can afford to spend the specified amount of credits"""
    try:
        can_afford = credits_service.can_afford(db, current_user.id, amount)
        return {
            "can_afford": can_afford,
            "amount_requested": amount,
            "current_balance": credits_service.get_user_balance(db, current_user.id).current_balance
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error checking affordability: {str(e)}"
        )

class CheckoutRequest(BaseModel):
    plan_id: str
    plan_type: str

@router.post("/checkout")
def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a checkout session for subscription or credits purchase"""
    try:
        # Import stripe service
        from api.services.business.stripe_service import stripe_service
        from api.services.business.stripe_service import CheckoutSessionRequest
        
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            plan_id=request.plan_id,
            plan_type=request.plan_type
        )
        
        # Create actual Stripe checkout session
        result = stripe_service.create_checkout_session(db, str(current_user.id), checkout_request)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating checkout session: {str(e)}"
        )
