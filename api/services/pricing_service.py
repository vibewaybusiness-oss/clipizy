"""
Points Management Service
Handles user points balance, transactions, spending, and pricing calculations
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from api.models import User, PointsTransaction
from api.models.points import PointsTransactionType
from api.schemas import PointsTransactionCreate, PointsBalance, PointsSpendRequest
from api.config.logging import get_project_logger
from typing import List, Optional, Dict
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

class PointsService:
    def __init__(self):
        logger.info("PointsService initialized")

    def get_user_balance(self, db: Session, user_id: str) -> PointsBalance:
        """Get user's current points balance and recent transactions"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                # Create a default user if it doesn't exist (for demo purposes)
                logger.info(f"User {user_id} not found, creating default user")
                user = User(
                    id=user_id,
                    email="demo@clipizi.com",
                    username="Demo User",
                    is_active=True,
                    is_verified=True,
                    plan="free",
                    points_balance=1000,
                    total_points_earned=1000,
                    total_points_spent=0
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                logger.info(f"Created default user {user_id} with 1000 points")

            # Get recent transactions (last 10)
            recent_transactions = (
                db.query(PointsTransaction)
                .filter(PointsTransaction.user_id == user_id)
                .order_by(desc(PointsTransaction.created_at))
                .limit(10)
                .all()
            )

            return PointsBalance(
                current_balance=user.points_balance,
                total_earned=user.total_points_earned,
                total_spent=user.total_points_spent,
                recent_transactions=recent_transactions
            )

        except Exception as e:
            logger.error(f"Error getting user balance for {user_id}: {str(e)}")
            raise

    def add_points(self, db: Session, user_id: str, amount: int,
                   transaction_type: PointsTransactionType,
                   description: str = None,
                   reference_id: str = None,
                   reference_type: str = None) -> PointsTransaction:
        """Add points to user's account"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")

            if amount <= 0:
                raise ValueError("Amount must be positive")

            # Update user's balance
            new_balance = user.points_balance + amount
            user.points_balance = new_balance
            user.total_points_earned += amount

            # Create transaction record
            transaction = PointsTransaction(
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

            logger.info(f"Added {amount} points to user {user_id}. New balance: {new_balance}")
            return transaction

        except Exception as e:
            logger.error(f"Error adding points for user {user_id}: {str(e)}")
            db.rollback()
            raise

    def spend_points(self, db: Session, user_id: str, spend_request: PointsSpendRequest) -> PointsTransaction:
        """Spend points from user's account"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")

            if spend_request.amount <= 0:
                raise ValueError("Amount must be positive")

            if user.points_balance < spend_request.amount:
                raise ValueError(f"Insufficient points. Current balance: {user.points_balance}, Required: {spend_request.amount}")

            # Update user's balance
            new_balance = user.points_balance - spend_request.amount
            user.points_balance = new_balance
            user.total_points_spent += spend_request.amount

            # Create transaction record
            transaction = PointsTransaction(
                user_id=user_id,
                transaction_type=PointsTransactionType.SPENT,
                amount=-spend_request.amount,  # Negative for spending
                balance_after=new_balance,
                description=spend_request.description,
                reference_id=spend_request.reference_id,
                reference_type=spend_request.reference_type
            )

            db.add(transaction)
            db.commit()
            db.refresh(transaction)

            logger.info(f"Spent {spend_request.amount} points from user {user_id}. New balance: {new_balance}")
            return transaction

        except Exception as e:
            logger.error(f"Error spending points for user {user_id}: {str(e)}")
            db.rollback()
            raise

    def get_transaction_history(self, db: Session, user_id: str, limit: int = 50) -> List[PointsTransaction]:
        """Get user's transaction history"""
        try:
            transactions = (
                db.query(PointsTransaction)
                .filter(PointsTransaction.user_id == user_id)
                .order_by(desc(PointsTransaction.created_at))
                .limit(limit)
                .all()
            )
            return transactions

        except Exception as e:
            logger.error(f"Error getting transaction history for user {user_id}: {str(e)}")
            raise

    def can_afford(self, db: Session, user_id: str, amount: int) -> bool:
        """Check if user can afford to spend the specified amount of points"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            return user.points_balance >= amount

        except Exception as e:
            logger.error(f"Error checking affordability for user {user_id}: {str(e)}")
            return False

    def refund_points(self, db: Session, user_id: str, amount: int,
                     description: str = None,
                     reference_id: str = None) -> PointsTransaction:
        """Refund points to user's account"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")

            if amount <= 0:
                raise ValueError("Amount must be positive")

            # Update user's balance
            new_balance = user.points_balance + amount
            user.points_balance = new_balance
            user.total_points_earned += amount  # Refunds count as earned

            # Create transaction record
            transaction = PointsTransaction(
                user_id=user_id,
                transaction_type=PointsTransactionType.REFUNDED,
                amount=amount,
                balance_after=new_balance,
                description=description or "Points refund",
                reference_id=reference_id,
                reference_type="refund"
            )

            db.add(transaction)
            db.commit()
            db.refresh(transaction)

            logger.info(f"Refunded {amount} points to user {user_id}. New balance: {new_balance}")
            return transaction

        except Exception as e:
            logger.error(f"Error refunding points for user {user_id}: {str(e)}")
            db.rollback()
            raise

    # PRICING METHODS
    def to_credits(self, dollars: float) -> int:
        """Convert $ to credits using global rate."""
        return math.ceil(dollars * CREDITS_RATE)

    def calculate_music_price(self, num_tracks: int, model: str = "clipizi-model") -> Dict:
        """Calculate price for music generation"""
        price = num_tracks * PRICES["music_generator"][model]["price"]
        return {"usd": round(price, 2), "credits": self.to_credits(price)}

    def calculate_image_price(self, num_units: int, total_minutes: float) -> Dict:
        """Calculate price for image generation"""
        base = (num_units * PRICES["image_generator"]["clipizi-model"]["unit_rate"]) + (total_minutes * PRICES["image_generator"]["clipizi-model"]["minute_rate"])
        price = max(base, PRICES["image_generator"]["clipizi-model"]["min"])
        return {"usd": round(price, 2), "credits": self.to_credits(price)}

    def calculate_looped_animation_price(self, num_units: int, total_minutes: float) -> Dict:
        """Calculate price for looped animation generation"""
        base = (num_units * PRICES["looped_animation_generator"]["clipizi-model"]["unit_rate"]) + (total_minutes * PRICES["looped_animation_generator"]["clipizi-model"]["minute_rate"])
        price = max(base, PRICES["looped_animation_generator"]["clipizi-model"]["min"])
        if PRICES["looped_animation_generator"]["clipizi-model"]["max"]:
            price = min(price, PRICES["looped_animation_generator"]["clipizi-model"]["max"])
        return {"usd": round(price, 2), "credits": self.to_credits(price)}

    def calculate_video_price(self, duration_minutes: float) -> Dict:
        """Calculate price for video generation"""
        base = duration_minutes * PRICES["video_generator"]["clipizi-model"]["minute_rate"]
        price = max(base, PRICES["video_generator"]["clipizi-model"]["min"])
        return {"usd": round(price, 2), "credits": self.to_credits(price)}

    def get_pricing_info(self) -> Dict:
        """Get current pricing configuration"""
        return PRICES.copy()

# Create a default instance
points_service = PointsService()
