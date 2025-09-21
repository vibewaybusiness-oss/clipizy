import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Enum
from api.db import GUID
from sqlalchemy.orm import relationship
from api.db import Base
import enum

class PointsTransactionType(str, enum.Enum):
    EARNED = "earned"
    SPENT = "spent"
    PURCHASED = "purchased"
    REFUNDED = "refunded"
    BONUS = "bonus"
    ADMIN_ADJUSTMENT = "admin_adjustment"

class PointsTransaction(Base):
    __tablename__ = "points_transactions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    transaction_type = Column(Enum(PointsTransactionType), nullable=False)
    amount = Column(Integer, nullable=False)  # Positive for earned/purchased, negative for spent
    balance_after = Column(Integer, nullable=False)  # User's balance after this transaction
    
    description = Column(Text, nullable=True)
    reference_id = Column(String, nullable=True)  # Reference to job, payment, etc.
    reference_type = Column(String, nullable=True)  # job, payment, admin, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="points_transactions")

    def __repr__(self):
        return f"<PointsTransaction(id={self.id}, user_id={self.user_id}, type={self.transaction_type}, amount={self.amount})>"
