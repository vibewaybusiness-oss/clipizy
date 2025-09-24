from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.db import get_db
from api.models import User
from ..auth.auth_router import get_current_user
import stripe
import os
from typing import List, Dict, Any

router = APIRouter(prefix="/admin/stripe", tags=["Admin - Stripe"])

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def is_admin_user(current_user: User) -> bool:
    """Check if user is admin - for now, allow all authenticated users"""
    # TODO: Implement proper admin role checking
    return True

@router.get("/products")
def get_stripe_products(current_user: User = Depends(get_current_user)):
    """Get all Stripe products"""
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        products = stripe.Product.list(limit=100)
        return {
            "success": True,
            "data": products.data,
            "count": len(products.data)
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching products: {str(e)}"
        )

@router.get("/prices")
def get_stripe_prices(current_user: User = Depends(get_current_user)):
    """Get all Stripe prices"""
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        prices = stripe.Price.list(limit=100)
        return {
            "success": True,
            "data": prices.data,
            "count": len(prices.data)
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching prices: {str(e)}"
        )

@router.get("/payment-links")
def get_stripe_payment_links(current_user: User = Depends(get_current_user)):
    """Get all Stripe payment links"""
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        payment_links = stripe.PaymentLink.list(limit=100)
        return {
            "success": True,
            "data": payment_links.data,
            "count": len(payment_links.data)
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching payment links: {str(e)}"
        )

@router.get("/customers")
def get_stripe_customers(current_user: User = Depends(get_current_user)):
    """Get all Stripe customers"""
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        customers = stripe.Customer.list(limit=100)
        return {
            "success": True,
            "data": customers.data,
            "count": len(customers.data)
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching customers: {str(e)}"
        )

@router.get("/subscriptions")
def get_stripe_subscriptions(current_user: User = Depends(get_current_user)):
    """Get all Stripe subscriptions"""
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        subscriptions = stripe.Subscription.list(limit=100)
        return {
            "success": True,
            "data": subscriptions.data,
            "count": len(subscriptions.data)
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching subscriptions: {str(e)}"
        )

@router.get("/payments")
def get_stripe_payments(current_user: User = Depends(get_current_user)):
    """Get recent Stripe payments"""
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        payments = stripe.PaymentIntent.list(limit=100)
        return {
            "success": True,
            "data": payments.data,
            "count": len(payments.data)
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching payments: {str(e)}"
        )

@router.get("/balance")
def get_stripe_balance(current_user: User = Depends(get_current_user)):
    """Get Stripe account balance"""
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        balance = stripe.Balance.retrieve()
        return {
            "success": True,
            "data": balance
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching balance: {str(e)}"
        )

@router.get("/stats")
def get_stripe_stats(current_user: User = Depends(get_current_user)):
    """Get Stripe account statistics"""
    try:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Get counts
        products = stripe.Product.list(limit=1)
        prices = stripe.Price.list(limit=1)
        customers = stripe.Customer.list(limit=1)
        subscriptions = stripe.Subscription.list(limit=1)
        payment_links = stripe.PaymentLink.list(limit=1)
        
        stats = {
            "products_count": products.total_count,
            "prices_count": prices.total_count,
            "customers_count": customers.total_count,
            "subscriptions_count": subscriptions.total_count,
            "payment_links_count": payment_links.total_count,
        }
        
        return {
            "success": True,
            "data": stats
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching stats: {str(e)}"
        )
