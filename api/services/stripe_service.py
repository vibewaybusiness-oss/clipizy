"""
Stripe Payment Service
Handles Stripe payment processing and webhook handling
"""
import stripe
import os
from sqlalchemy.orm import Session
from api.models import User, Payment
from api.models.payment import PaymentStatus, PaymentMethod
from api.schemas import PaymentIntentCreate, PaymentIntentResponse, PaymentWebhookData
from api.services.pricing_service import points_service
from api.config.logging import get_project_logger
from typing import Optional, Dict, Any
import json

logger = get_project_logger()

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

class StripeService:
    def __init__(self):
        logger.info("StripeService initialized")
        if not stripe.api_key:
            logger.warning("STRIPE_SECRET_KEY not found in environment variables")
    
    def create_payment_intent(self, db: Session, user_id: str, 
                            payment_data: PaymentIntentCreate) -> PaymentIntentResponse:
        """Create a Stripe payment intent for points purchase"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            amount_cents = int(payment_data.amount_dollars * 100)
            points_purchased = int(payment_data.amount_dollars * payment_data.points_per_dollar)
            
            # Create or get Stripe customer
            stripe_customer_id = user.billing_id
            if not stripe_customer_id:
                customer = stripe.Customer.create(
                    email=user.email,
                    name=user.username or user.email,
                    metadata={"user_id": str(user_id)}
                )
                stripe_customer_id = customer.id
                user.billing_id = stripe_customer_id
                db.commit()
            
            # Create payment intent
            intent_data = {
                "amount": amount_cents,
                "currency": payment_data.currency,
                "customer": stripe_customer_id,
                "metadata": {
                    "user_id": str(user_id),
                    "points_purchased": str(points_purchased),
                    "points_per_dollar": str(payment_data.points_per_dollar)
                }
            }
            
            if payment_data.payment_method_id:
                intent_data["payment_method"] = payment_data.payment_method_id
                intent_data["confirmation_method"] = "manual"
                intent_data["confirm"] = True
            
            payment_intent = stripe.PaymentIntent.create(**intent_data)
            
            # Create payment record in database
            payment = Payment(
                user_id=user_id,
                stripe_payment_intent_id=payment_intent.id,
                stripe_customer_id=stripe_customer_id,
                amount_cents=amount_cents,
                currency=payment_data.currency,
                payment_method=PaymentMethod.STRIPE_CARD,
                points_purchased=points_purchased,
                points_per_dollar=payment_data.points_per_dollar,
                status=PaymentStatus.PENDING,
                description=payment_data.description or f"Purchase of {points_purchased} points"
            )
            
            db.add(payment)
            db.commit()
            db.refresh(payment)
            
            logger.info(f"Created payment intent {payment_intent.id} for user {user_id}")
            
            return PaymentIntentResponse(
                client_secret=payment_intent.client_secret,
                payment_intent_id=payment_intent.id,
                amount_cents=amount_cents,
                points_purchased=points_purchased,
                status=payment_intent.status
            )
            
        except Exception as e:
            logger.error(f"Error creating payment intent for user {user_id}: {str(e)}")
            db.rollback()
            raise
    
    def confirm_payment_intent(self, db: Session, payment_intent_id: str) -> Payment:
        """Confirm a payment intent"""
        try:
            payment = db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if not payment:
                raise ValueError(f"Payment not found for intent {payment_intent_id}")
            
            # Retrieve payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status == "succeeded":
                payment.status = PaymentStatus.COMPLETED
                payment.stripe_charge_id = intent.latest_charge
                payment.completed_at = intent.created
                
                # Add points to user's account
                points_service.add_points(
                    db=db,
                    user_id=str(payment.user_id),
                    amount=payment.points_purchased,
                    transaction_type="purchased",
                    description=f"Points purchase - {payment.points_purchased} points",
                    reference_id=str(payment.id),
                    reference_type="payment"
                )
                
                db.commit()
                logger.info(f"Payment {payment_intent_id} confirmed and points added")
            
            elif intent.status == "requires_payment_method":
                payment.status = PaymentStatus.FAILED
                db.commit()
                logger.warning(f"Payment {payment_intent_id} requires payment method")
            
            return payment
            
        except Exception as e:
            logger.error(f"Error confirming payment intent {payment_intent_id}: {str(e)}")
            db.rollback()
            raise
    
    def handle_webhook(self, db: Session, payload: str, signature: str) -> bool:
        """Handle Stripe webhook events"""
        try:
            if not STRIPE_WEBHOOK_SECRET:
                logger.warning("STRIPE_WEBHOOK_SECRET not configured")
                return False
            
            event = stripe.Webhook.construct_event(
                payload, signature, STRIPE_WEBHOOK_SECRET
            )
            
            logger.info(f"Received Stripe webhook: {event['type']}")
            
            if event['type'] == 'payment_intent.succeeded':
                payment_intent = event['data']['object']
                self._handle_payment_succeeded(db, payment_intent)
            
            elif event['type'] == 'payment_intent.payment_failed':
                payment_intent = event['data']['object']
                self._handle_payment_failed(db, payment_intent)
            
            elif event['type'] == 'payment_intent.canceled':
                payment_intent = event['data']['object']
                self._handle_payment_canceled(db, payment_intent)
            
            return True
            
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error handling webhook: {str(e)}")
            return False
    
    def _handle_payment_succeeded(self, db: Session, payment_intent: Dict[str, Any]):
        """Handle successful payment"""
        try:
            payment = db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent['id']
            ).first()
            
            if not payment:
                logger.warning(f"Payment not found for intent {payment_intent['id']}")
                return
            
            if payment.status == PaymentStatus.COMPLETED:
                logger.info(f"Payment {payment_intent['id']} already processed")
                return
            
            payment.status = PaymentStatus.COMPLETED
            payment.stripe_charge_id = payment_intent.get('latest_charge')
            payment.completed_at = payment_intent['created']
            
            # Add points to user's account
            points_service.add_points(
                db=db,
                user_id=str(payment.user_id),
                amount=payment.points_purchased,
                transaction_type="purchased",
                description=f"Points purchase - {payment.points_purchased} points",
                reference_id=str(payment.id),
                reference_type="payment"
            )
            
            db.commit()
            logger.info(f"Payment {payment_intent['id']} processed successfully")
            
        except Exception as e:
            logger.error(f"Error handling payment succeeded: {str(e)}")
            db.rollback()
    
    def _handle_payment_failed(self, db: Session, payment_intent: Dict[str, Any]):
        """Handle failed payment"""
        try:
            payment = db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent['id']
            ).first()
            
            if payment:
                payment.status = PaymentStatus.FAILED
                db.commit()
                logger.info(f"Payment {payment_intent['id']} marked as failed")
            
        except Exception as e:
            logger.error(f"Error handling payment failed: {str(e)}")
            db.rollback()
    
    def _handle_payment_canceled(self, db: Session, payment_intent: Dict[str, Any]):
        """Handle canceled payment"""
        try:
            payment = db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent['id']
            ).first()
            
            if payment:
                payment.status = PaymentStatus.CANCELLED
                db.commit()
                logger.info(f"Payment {payment_intent['id']} marked as canceled")
            
        except Exception as e:
            logger.error(f"Error handling payment canceled: {str(e)}")
            db.rollback()
    
    def get_payment_history(self, db: Session, user_id: str, limit: int = 50) -> list[Payment]:
        """Get user's payment history"""
        try:
            payments = (
                db.query(Payment)
                .filter(Payment.user_id == user_id)
                .order_by(Payment.created_at.desc())
                .limit(limit)
                .all()
            )
            return payments
            
        except Exception as e:
            logger.error(f"Error getting payment history for user {user_id}: {str(e)}")
            raise
    
    def refund_payment(self, db: Session, payment_id: str, amount_cents: Optional[int] = None) -> bool:
        """Refund a payment"""
        try:
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                raise ValueError(f"Payment {payment_id} not found")
            
            if payment.status != PaymentStatus.COMPLETED:
                raise ValueError(f"Payment {payment_id} is not completed")
            
            if not payment.stripe_charge_id:
                raise ValueError(f"No charge ID found for payment {payment_id}")
            
            # Create refund in Stripe
            refund_amount = amount_cents or payment.amount_cents
            refund = stripe.Refund.create(
                charge=payment.stripe_charge_id,
                amount=refund_amount
            )
            
            # Update payment status
            payment.status = PaymentStatus.REFUNDED
            
            # Calculate points to refund
            refund_points = int((refund_amount / payment.amount_cents) * payment.points_purchased)
            
            # Refund points to user
            if refund_points > 0:
                points_service.refund_points(
                    db=db,
                    user_id=str(payment.user_id),
                    amount=refund_points,
                    description=f"Refund for payment {payment_id}",
                    reference_id=payment_id
                )
            
            db.commit()
            logger.info(f"Refunded payment {payment_id}: {refund_amount} cents, {refund_points} points")
            return True
            
        except Exception as e:
            logger.error(f"Error refunding payment {payment_id}: {str(e)}")
            db.rollback()
            return False

# Create a default instance
stripe_service = StripeService()
