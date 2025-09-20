import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from api.db import Base
import enum

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class PaymentMethod(str, enum.Enum):
    STRIPE_CARD = "stripe_card"
    STRIPE_BANK = "stripe_bank"
    PAYPAL = "paypal"
    CRYPTO = "crypto"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Stripe integration
    stripe_payment_intent_id = Column(String, nullable=True, unique=True)
    stripe_customer_id = Column(String, nullable=True)
    stripe_charge_id = Column(String, nullable=True)
    
    # Payment details
    amount_cents = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String, default="usd", nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    
    # Points purchase details
    points_purchased = Column(Integer, nullable=False)
    points_per_dollar = Column(Integer, default=100, nullable=False)  # 100 points per $1
    
    # Metadata
    description = Column(Text, nullable=True)
    payment_metadata = Column(Text, nullable=True)  # JSON string for additional data
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="payments")

    def __repr__(self):
        return f"<Payment(id={self.id}, user_id={self.user_id}, amount_cents={self.amount_cents}, status={self.status})>"
