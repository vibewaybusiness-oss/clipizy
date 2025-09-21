# Points and Payments System

This document describes the points and payments system implemented for clipizi, including user points management and Stripe payment integration.

## Overview

The system allows users to:
- Earn points through various activities
- Purchase points using Stripe payments
- Spend points on services and features
- View their points balance and transaction history
- Get refunds for payments

## Architecture

### Models

#### User Model Updates
- `points_balance`: Current points balance
- `total_points_earned`: Total points earned over time
- `total_points_spent`: Total points spent over time

#### PointsTransaction Model
- Tracks all points transactions (earned, spent, purchased, refunded)
- Links to users and includes reference information
- Maintains audit trail of all points movements

#### Payment Model
- Stores Stripe payment information
- Links payments to points purchases
- Tracks payment status and completion

### Services

#### PointsService
- Manages user points balance
- Handles points transactions (add, spend, refund)
- Provides balance checking and history

#### StripeService
- Creates payment intents
- Handles Stripe webhooks
- Processes payments and refunds
- Manages Stripe customer creation

### API Endpoints

#### Points Endpoints (`/points`)
- `GET /balance` - Get user's points balance
- `GET /transactions` - Get transaction history
- `POST /spend` - Spend points
- `POST /purchase` - Purchase points via Stripe
- `GET /can-afford/{amount}` - Check affordability

#### Payment Endpoints (`/payments`)
- `POST /create-intent` - Create Stripe payment intent
- `POST /confirm/{payment_intent_id}` - Confirm payment
- `GET /history` - Get payment history
- `POST /refund/{payment_id}` - Refund payment
- `POST /webhook` - Stripe webhook handler
- `GET /{payment_id}` - Get payment details

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Database Migration

Run the migration script to create the new tables:

```bash
python api/migrations/add_points_and_payments.py
```

### 3. Install Dependencies

The Stripe dependency is already added to `requirements.txt`:

```bash
pip install stripe==7.8.0
```

## Usage Examples

### Purchasing Points

```python
# Create payment intent
payment_data = PaymentIntentCreate(
    amount_dollars=10.0,
    points_per_dollar=100,
    currency="usd"
)

response = stripe_service.create_payment_intent(db, user_id, payment_data)
# Returns client_secret for frontend Stripe integration
```

### Spending Points

```python
# Spend points on a service
spend_request = PointsSpendRequest(
    amount=50,
    description="Video generation job",
    reference_id="job_123",
    reference_type="job"
)

transaction = points_service.spend_points(db, user_id, spend_request)
```

### Adding Points (Earned)

```python
# Add earned points
points_service.add_points(
    db=db,
    user_id=user_id,
    amount=25,
    transaction_type=PointsTransactionType.EARNED,
    description="Welcome bonus",
    reference_id="welcome_bonus",
    reference_type="bonus"
)
```

## Stripe Integration

### Payment Flow

1. User requests to purchase points
2. Create Stripe payment intent
3. Frontend handles payment with Stripe Elements
4. Stripe webhook confirms payment
5. Points are automatically added to user account

### Webhook Configuration

Configure your Stripe webhook to send events to:
```
https://your-domain.com/api/payments/webhook
```

Required events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

## Points System Rules

### Earning Points
- Users can earn points through various activities
- Points are added via the `add_points` method
- All earnings are tracked in transaction history

### Spending Points
- Users can spend points on services
- Balance is checked before spending
- All spending is tracked in transaction history

### Refunds
- Payment refunds automatically refund points
- Points refunds are tracked separately
- Refunded points are added back to balance

## Security Considerations

- All payment operations require authentication
- Stripe webhooks are verified using signatures
- User can only access their own payments/points
- All transactions are logged for audit purposes

## Error Handling

- Insufficient points balance
- Invalid payment methods
- Stripe API errors
- Database transaction failures
- Webhook signature verification

## Testing

### Test Points Operations
```python
# Test adding points
points_service.add_points(db, user_id, 100, PointsTransactionType.EARNED)

# Test spending points
spend_request = PointsSpendRequest(amount=50, description="Test spend")
points_service.spend_points(db, user_id, spend_request)

# Test balance check
can_afford = points_service.can_afford(db, user_id, 25)
```

### Test Stripe Integration
```python
# Test payment intent creation
payment_data = PaymentIntentCreate(amount_dollars=5.0)
intent = stripe_service.create_payment_intent(db, user_id, payment_data)

# Test webhook handling
success = stripe_service.handle_webhook(db, payload, signature)
```

## Monitoring

- Monitor points balance changes
- Track payment success/failure rates
- Log all transaction activities
- Monitor Stripe webhook delivery

## Future Enhancements

- Points expiration system
- Loyalty program tiers
- Bulk points purchases with discounts
- Points transfer between users
- Admin points management interface
- Points usage analytics
