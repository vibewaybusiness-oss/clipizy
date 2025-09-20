from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from api.models.points import PointsTransactionType

class PointsTransactionBase(BaseModel):
    transaction_type: PointsTransactionType
    amount: int = Field(..., description="Amount of points (positive for earned/purchased, negative for spent)")
    description: Optional[str] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None

class PointsTransactionCreate(PointsTransactionBase):
    pass

class PointsTransactionRead(PointsTransactionBase):
    id: str
    user_id: str
    balance_after: int
    created_at: datetime

    class Config:
        from_attributes = True

class PointsBalance(BaseModel):
    current_balance: int
    total_earned: int
    total_spent: int
    recent_transactions: list[PointsTransactionRead] = []

class PointsPurchaseRequest(BaseModel):
    amount_dollars: float = Field(..., ge=1.0, le=1000.0, description="Amount in dollars to spend on points")
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID")

class PointsSpendRequest(BaseModel):
    amount: int = Field(..., gt=0, description="Amount of points to spend")
    description: str = Field(..., description="Description of what the points are being spent on")
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
