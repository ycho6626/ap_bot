# User Roles and Stripe Integration Runbook

This runbook covers the user role system, Stripe payment integration, and role-based access control for the AP Calculus tutoring system.

## Overview

The system uses a role-based access control (RBAC) model with Stripe as the payment processor. Users can access different levels of content based on their subscription status and role assignments.

## Role Hierarchy

### 1. **Public** (Default)
- **Access**: Basic public knowledge base content
- **Features**: Limited to general calculus concepts
- **Stripe Product**: None (free tier)

### 2. **calc_paid**
- **Access**: Full AP Calculus AB/BC content
- **Features**: 
  - Verified Answer Mode (VAM)
  - Advanced problem solving
  - Detailed explanations
  - Practice problems
- **Stripe Product**: `ap-calc-subscription`

### 3. **all_paid**
- **Access**: All subjects (future expansion)
- **Features**: Same as calc_paid + future subjects
- **Stripe Product**: `ap-all-subscription`

### 4. **teacher**
- **Access**: All content + administrative features
- **Features**:
  - All calc_paid features
  - Private knowledge base access
  - Student progress monitoring
  - Content review tools
- **Stripe Product**: `ap-teacher-subscription`

## Stripe Integration

### Product Configuration

#### 1. AP Calculus Subscription (`ap-calc-subscription`)
```json
{
  "id": "ap-calc-subscription",
  "name": "AP Calculus AB/BC Premium",
  "description": "Full access to AP Calculus tutoring with verified answers",
  "pricing": {
    "monthly": "$9.99/month",
    "yearly": "$99.99/year"
  },
  "features": [
    "Verified Answer Mode",
    "Advanced problem solving",
    "Detailed explanations",
    "Practice problems"
  ]
}
```

#### 2. All Subjects Subscription (`ap-all-subscription`)
```json
{
  "id": "ap-all-subscription",
  "name": "AP All Subjects Premium",
  "description": "Access to all AP subjects (current and future)",
  "pricing": {
    "monthly": "$19.99/month",
    "yearly": "$199.99/year"
  }
}
```

#### 3. Teacher Subscription (`ap-teacher-subscription`)
```json
{
  "id": "ap-teacher-subscription",
  "name": "AP Teacher License",
  "description": "Full access for educators with administrative tools",
  "pricing": {
    "monthly": "$29.99/month",
    "yearly": "$299.99/year"
  }
}
```

### Webhook Configuration

#### Required Webhook Events
```bash
# Stripe webhook events to configure
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
customer.subscription.trial_will_end
```

#### Webhook Endpoint
```
POST /webhooks/stripe
```

## Role Management

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### User Roles Table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('public', 'calc_paid', 'all_paid', 'teacher')),
  stripe_subscription_id TEXT,
  stripe_product_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

### Role Assignment Logic

#### 1. Subscription Created
```typescript
// When Stripe subscription is created
async function handleSubscriptionCreated(event: Stripe.SubscriptionCreatedEvent) {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  
  // Get user by Stripe customer ID
  const user = await getUserByStripeCustomerId(customerId);
  
  // Determine role based on product
  const role = getRoleFromProductId(subscription.items.data[0].price.product);
  
  // Assign role
  await assignUserRole(user.id, role, {
    stripe_subscription_id: subscription.id,
    stripe_product_id: subscription.items.data[0].price.product,
    expires_at: new Date(subscription.current_period_end * 1000)
  });
}
```

#### 2. Subscription Updated
```typescript
// When Stripe subscription is updated
async function handleSubscriptionUpdated(event: Stripe.SubscriptionUpdatedEvent) {
  const subscription = event.data.object;
  
  if (subscription.status === 'active') {
    // Reactivate role
    await updateUserRole(subscription.id, { active: true });
  } else if (subscription.status === 'canceled') {
    // Deactivate role
    await updateUserRole(subscription.id, { active: false });
  }
}
```

#### 3. Subscription Deleted
```typescript
// When Stripe subscription is deleted
async function handleSubscriptionDeleted(event: Stripe.SubscriptionDeletedEvent) {
  const subscription = event.data.object;
  
  // Downgrade to public role
  await downgradeUserRole(subscription.id);
}
```

## Access Control Implementation

### Row Level Security (RLS)

#### Knowledge Base Access
```sql
-- Public knowledge base (accessible to all)
CREATE POLICY "Public KB access" ON kb_document
  FOR SELECT USING (partition = 'public_kb');

-- Paid knowledge base (calc_paid and above)
CREATE POLICY "Paid KB access" ON kb_document
  FOR SELECT USING (
    partition = 'paraphrased_kb' AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('calc_paid', 'all_paid', 'teacher')
      AND ur.active = true
    )
  );

-- Private knowledge base (teacher only)
CREATE POLICY "Private KB access" ON kb_document
  FOR SELECT USING (
    partition = 'private_kb' AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'teacher'
      AND ur.active = true
    )
  );
```

### API Endpoint Protection

#### Coach Endpoint
```typescript
// /coach endpoint with role-based access
app.post('/coach', async (request, reply) => {
  const { question, exam_variant } = request.body;
  const userId = request.user.id;
  
  // Check user role
  const userRole = await getUserRole(userId);
  
  if (!hasAccessToVAM(userRole)) {
    return reply.code(403).send({
      error: 'Insufficient permissions',
      message: 'Verified Answer Mode requires calc_paid subscription'
    });
  }
  
  // Process with VAM
  const response = await coach({
    question,
    exam_variant,
    user_id: userId,
    session_id: request.sessionId
  });
  
  return response;
});
```

## Stripe Webhook Implementation

### Webhook Handler

```typescript
// packages/payments/src/stripe.ts
export async function handleStripeWebhook(
  payload: string,
  signature: string
): Promise<void> {
  // Verify webhook signature
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
  
  // Handle different event types
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event);
      break;
    default:
      logger.warn('Unhandled webhook event', { type: event.type });
  }
}
```

### Idempotency

```typescript
// Ensure webhook events are processed only once
export async function processWebhookEvent(
  eventId: string,
  eventType: string,
  handler: () => Promise<void>
): Promise<void> {
  // Check if event already processed
  const existing = await supabase
    .from('webhook_event')
    .select('id')
    .eq('event_id', eventId)
    .single();
    
  if (existing.data) {
    logger.info('Webhook event already processed', { eventId });
    return;
  }
  
  // Process event
  await handler();
  
  // Record event as processed
  await supabase
    .from('webhook_event')
    .insert({
      event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString()
    });
}
```

## Testing

### Unit Tests

```typescript
// packages/payments/tests/roles.test.ts
describe('Role Management', () => {
  test('should assign calc_paid role for AP Calculus subscription', async () => {
    const mockSubscription = {
      id: 'sub_123',
      customer: 'cus_123',
      items: {
        data: [{
          price: { product: 'ap-calc-subscription' }
        }]
      }
    };
    
    await handleSubscriptionCreated({
      type: 'customer.subscription.created',
      data: { object: mockSubscription }
    });
    
    const userRole = await getUserRole('user_123');
    expect(userRole.role).toBe('calc_paid');
  });
});
```

### Integration Tests

```typescript
// Test webhook processing
describe('Stripe Webhooks', () => {
  test('should process subscription created webhook', async () => {
    const webhookPayload = createWebhookPayload('customer.subscription.created');
    const signature = createWebhookSignature(webhookPayload);
    
    const response = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(webhookPayload);
      
    expect(response.status).toBe(200);
  });
});
```

## Monitoring and Alerts

### Key Metrics

1. **Subscription Conversion Rate**
   - Public → calc_paid
   - calc_paid → all_paid
   - calc_paid → teacher

2. **Churn Rate**
   - Monthly subscription cancellations
   - Failed payment attempts

3. **Revenue Metrics**
   - Monthly Recurring Revenue (MRR)
   - Average Revenue Per User (ARPU)
   - Customer Lifetime Value (CLV)

### Alerting

```typescript
// Alert on high churn rate
if (monthlyChurnRate > 0.05) {
  await sendAlert({
    type: 'HIGH_CHURN_RATE',
    message: `Monthly churn rate is ${monthlyChurnRate * 100}%`,
    severity: 'warning'
  });
}

// Alert on webhook failures
if (webhookFailureRate > 0.01) {
  await sendAlert({
    type: 'WEBHOOK_FAILURES',
    message: `Webhook failure rate is ${webhookFailureRate * 100}%`,
    severity: 'critical'
  });
}
```

## Troubleshooting

### Common Issues

#### 1. Role Not Assigned After Payment

**Symptoms:**
- User paid but still has public access
- VAM features not available

**Debugging:**
```bash
# Check webhook processing
SELECT * FROM webhook_event 
WHERE event_type = 'customer.subscription.created' 
ORDER BY processed_at DESC LIMIT 10;

# Check user roles
SELECT ur.*, u.email 
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE u.email = 'user@example.com';
```

**Solutions:**
- Verify webhook endpoint is accessible
- Check Stripe webhook configuration
- Manually process webhook event

#### 2. Role Expired But User Still Has Access

**Symptoms:**
- User has expired subscription but still accessing paid features
- Database shows inactive role but user has access

**Debugging:**
```sql
-- Check role status
SELECT ur.*, u.email
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE ur.active = true 
AND ur.expires_at < NOW();
```

**Solutions:**
- Run role cleanup job
- Verify RLS policies
- Check application-level role validation

#### 3. Webhook Signature Verification Failed

**Symptoms:**
- Webhook events not processed
- 400 errors in webhook endpoint

**Debugging:**
```bash
# Test webhook signature
curl -X POST https://api.stripe.com/v1/webhook_endpoints \
  -H "Authorization: Bearer sk_test_..." \
  -d "url=https://your-app.com/webhooks/stripe"
```

**Solutions:**
- Verify webhook secret
- Check request headers
- Ensure raw body is used for signature verification

## Security Considerations

### Data Protection

1. **PII Handling**
   - Never log Stripe customer IDs
   - Encrypt sensitive user data
   - Use secure session management

2. **Webhook Security**
   - Always verify webhook signatures
   - Use HTTPS for webhook endpoints
   - Implement rate limiting

3. **Role Validation**
   - Validate roles on every request
   - Use database-level RLS policies
   - Implement proper session management

### Compliance

1. **PCI DSS**
   - Never store payment card data
   - Use Stripe's secure payment processing
   - Implement proper access controls

2. **GDPR**
   - Allow users to delete their data
   - Implement data export functionality
   - Provide clear privacy policies

## Related Documentation

- [Quality Gates Runbook](./quality-gates.md) - Quality thresholds and monitoring
- [Ingest Runbook](./ingest.md) - Content processing pipeline
- [Supabase README](../../supabase/README.md) - Database schema and setup
- [Stripe Documentation](https://stripe.com/docs) - Official Stripe integration guide

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review webhook logs in Stripe dashboard
3. Verify database role assignments
4. Contact the development team with specific error messages
