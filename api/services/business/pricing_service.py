"""
Credits Management Service
Handles user credits balance, transactions, spending, and pricing calculations
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from api.models import User, CreditsTransaction
from api.models.pricing import CreditsTransactionType
from api.schemas import CreditsTransactionCreate, CreditsBalance, CreditsSpendRequest
from api.config.logging import get_project_logger
from typing import List, Optional, Dict
from fastapi import HTTPException
import uuid
import math

logger = get_project_logger()

# PRICING CONFIGURATION
CREDITS_RATE = 20

PRICES = {
    "credits_rate": 20,
    "music_generator": {
        "stable-audio": {
            "price": 0.5,
            "description": "Generate a music track based on the description."
        },
        "clipizy-model": {
            "price": 1.0,
            "description": "Generate a music track based on the description."
        }
    },
    "image_generator": {
        "clipizy-model": {
            "minute_rate": 0.10,
            "unit_rate": 0.50,
            "min": 3,
            "max": None,
            "description": "Generate an image based on the description."
        }
    },
    "looped_animation_generator": {
        "clipizy-model": {
            "minute_rate": 0.11,
            "unit_rate": 1,
            "min": 3,
            "max": None,
            "description": "Generate a looping animation based on the description."
        }
    },
    "video_generator": {
        "clipizy-model": {
            "video-duration": 5,
            "minute_rate": 10,
            "min": 20,
            "max": None,
            "description": "Generate a video based on the description."
        }
    }
}

class CreditsService:
    def __init__(self):
        logger.info("CreditsService initialized")

    def get_user_balance(self, db: Session, user_id: str) -> CreditsBalance:
        """Get user's current credits balance and recent transactions"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.warning(f"User {user_id} not found")
                raise HTTPException(status_code=404, detail="User not found")

            # Get recent transactions (last 10)
            recent_transactions = (
                db.query(CreditsTransaction)
                .filter(CreditsTransaction.user_id == user_id)
                .order_by(desc(CreditsTransaction.created_at))
                .limit(10)
                .all()
            )

            return CreditsBalance(
                current_balance=user.credits_balance,
                total_earned=user.total_credits_earned,
                total_spent=user.total_credits_spent,
                recent_transactions=recent_transactions
            )

        except Exception as e:
            logger.error(f"Error getting user balance for {user_id}: {str(e)}")
            raise

    def add_credits(self, db: Session, user_id: str, amount: int,
                   transaction_type: CreditsTransactionType,
                   description: str = None,
                   reference_id: str = None,
                   reference_type: str = None) -> CreditsTransaction:
        """Add credits to user's account"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")

            if amount <= 0:
                raise ValueError("Amount must be positive")

            # Update user's balance
            new_balance = user.credits_balance + amount
            user.credits_balance = new_balance
            user.total_credits_earned += amount

            # Create transaction record
            transaction = CreditsTransaction(
                user_id=user_id,
                transaction_type=transaction_type,
                amount=amount,
                balance_after=new_balance,
                description=description,
                reference_id=reference_id,
                reference_type=reference_type
            )

            db.add(transaction)
            db.commit()
            db.refresh(transaction)

            logger.info(f"Added {amount} credits to user {user_id}. New balance: {new_balance}")
            return transaction

        except Exception as e:
            logger.error(f"Error adding credits for user {user_id}: {str(e)}")
            db.rollback()
            raise

    def spend_credits(self, db: Session, user_id: str, spend_request: CreditsSpendRequest) -> CreditsTransaction:
        """Spend credits from user's account"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")

            if spend_request.amount <= 0:
                raise ValueError("Amount must be positive")

            if user.credits_balance < spend_request.amount:
                raise ValueError(f"Insufficient credits. Current balance: {user.credits_balance}, Required: {spend_request.amount}")

            # Update user's balance
            new_balance = user.credits_balance - spend_request.amount
            user.credits_balance = new_balance
            user.total_credits_spent += spend_request.amount

            # Create transaction record
            transaction = CreditsTransaction(
                user_id=user_id,
                transaction_type=CreditsTransactionType.SPENT,
                amount=-spend_request.amount,  # Negative for spending
                balance_after=new_balance,
                description=spend_request.description,
                reference_id=spend_request.reference_id,
                reference_type=spend_request.reference_type
            )

            db.add(transaction)
            db.commit()
            db.refresh(transaction)

            logger.info(f"Spent {spend_request.amount} credits from user {user_id}. New balance: {new_balance}")
            return transaction

        except Exception as e:
            logger.error(f"Error spending credits for user {user_id}: {str(e)}")
            db.rollback()
            raise

    def get_transaction_history(self, db: Session, user_id: str, limit: int = 50) -> List[CreditsTransaction]:
        """Get user's transaction history"""
        try:
            transactions = (
                db.query(CreditsTransaction)
                .filter(CreditsTransaction.user_id == user_id)
                .order_by(desc(CreditsTransaction.created_at))
                .limit(limit)
                .all()
            )
            return transactions

        except Exception as e:
            logger.error(f"Error getting transaction history for user {user_id}: {str(e)}")
            raise

    def can_afford(self, db: Session, user_id: str, amount: int) -> bool:
        """Check if user can afford to spend the specified amount of credits"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            return user.credits_balance >= amount

        except Exception as e:
            logger.error(f"Error checking affordability for user {user_id}: {str(e)}")
            return False

    def refund_credits(self, db: Session, user_id: str, amount: int,
                     description: str = None,
                     reference_id: str = None) -> CreditsTransaction:
        """Refund credits to user's account"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")

            if amount <= 0:
                raise ValueError("Amount must be positive")

            # Update user's balance
            new_balance = user.credits_balance + amount
            user.credits_balance = new_balance
            user.total_credits_earned += amount  # Refunds count as earned

            # Create transaction record
            transaction = CreditsTransaction(
                user_id=user_id,
                transaction_type=CreditsTransactionType.REFUNDED,
                amount=amount,
                balance_after=new_balance,
                description=description or "Credits refund",
                reference_id=reference_id,
                reference_type="refund"
            )

            db.add(transaction)
            db.commit()
            db.refresh(transaction)

            logger.info(f"Refunded {amount} credits to user {user_id}. New balance: {new_balance}")
            return transaction

        except Exception as e:
            logger.error(f"Error refunding credits for user {user_id}: {str(e)}")
            db.rollback()
            raise

    # PRICING METHODS
    def to_credits(self, dollars: float) -> int:
        """Convert $ to credits using global rate."""
        return math.ceil(dollars * CREDITS_RATE)

    def calculate_music_price(self, num_tracks: int, model: str = "clipizy-model") -> Dict:
        """Calculate price for music generation"""
        price = num_tracks * PRICES["music_generator"][model]["price"]
        return {"usd": round(price, 2), "credits": self.to_credits(price)}

    def calculate_image_price(self, num_units: int, total_minutes: float) -> Dict:
        """Calculate price for image generation"""
        base = (num_units * PRICES["image_generator"]["clipizy-model"]["unit_rate"]) + (total_minutes * PRICES["image_generator"]["clipizy-model"]["minute_rate"])
        price = max(base, PRICES["image_generator"]["clipizy-model"]["min"])
        return {"usd": round(price, 2), "credits": self.to_credits(price)}

    def calculate_looped_animation_price(self, num_units: int, total_minutes: float) -> Dict:
        """Calculate price for looped animation generation"""
        base = (num_units * PRICES["looped_animation_generator"]["clipizy-model"]["unit_rate"]) + (total_minutes * PRICES["looped_animation_generator"]["clipizy-model"]["minute_rate"])
        price = max(base, PRICES["looped_animation_generator"]["clipizy-model"]["min"])
        if PRICES["looped_animation_generator"]["clipizy-model"]["max"]:
            price = min(price, PRICES["looped_animation_generator"]["clipizy-model"]["max"])
        return {"usd": round(price, 2), "credits": self.to_credits(price)}

    def calculate_video_price(self, duration_minutes: float) -> Dict:
        """Calculate price for video generation"""
        base = duration_minutes * PRICES["video_generator"]["clipizy-model"]["minute_rate"]
        price = max(base, PRICES["video_generator"]["clipizy-model"]["min"])
        return {"usd": round(price, 2), "credits": self.to_credits(price)}

    def get_pricing_info(self) -> Dict:
        """Get current pricing configuration"""
        return PRICES.copy()

# Create a default instance
credits_service = CreditsService()
