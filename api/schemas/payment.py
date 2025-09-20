from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from api.models.payment import PaymentStatus, PaymentMethod

class PaymentBase(BaseModel):
    amount_cents: int = Field(..., description="Amount in cents")
    currency: str = Field(default="usd", description="Currency code")
    payment_method: PaymentMethod
    points_purchased: int = Field(..., description="Number of points to purchase")
    description: Optional[str] = None
    payment_metadata: Optional[Dict[str, Any]] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentRead(PaymentBase):
    id: str
    user_id: str
    stripe_payment_intent_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None
    status: PaymentStatus
    points_per_dollar: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaymentIntentCreate(BaseModel):
    amount_dollars: float = Field(..., ge=1.0, le=1000.0, description="Amount in dollars")
    points_per_dollar: int = Field(default=100, description="Points per dollar")
    currency: str = Field(default="usd", description="Currency code")
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID")
    description: Optional[str] = None

class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount_cents: int
    points_purchased: int
    status: str

class PaymentWebhookData(BaseModel):
    id: str
    object: str
    type: str
    data: Dict[str, Any]
    created: int
