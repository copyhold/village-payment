# Push Notifications Implementation

This document describes the implementation of web push notifications for the Village Payment Control System (VPCS).

## Overview

The push notification system enables real-time communication between the VPCS and family members for transaction approval requests and other important notifications.

## Architecture

### Components

1. **PushService** (`src/services/push-service.ts`) - Server-side service for managing push notifications
2. **PushClient** (`src/services/push-client.ts`) - Client-side service for subscription management
3. **Service Worker** (`public/sw.js`) - Handles push events and notification interactions
4. **Push Routes** (`src/routes/push.ts`) - API endpoints for push notification operations
5. **Database Schema** - Enhanced tables for subscription and notification tracking

### Database Tables

#### DBAUTH Database
- `push_subscriptions` - Stores user push subscription data
- `push_notification_settings` - User preferences for notifications
- `notification_templates` - Reusable notification content templates

#### DB Database
- `notification_log` - Tracks notification delivery and responses
- `transactions` - Enhanced with approval workflow tracking

## Setup Instructions

### 1. Environment Variables

Add the following to your `wrangler.toml`:

```toml
[vars]
VAPID_PUBLIC_KEY = "your-vapid-public-key"
VAPID_PRIVATE_KEY = "your-vapid-private-key"
VAPID_SUBJECT = "mailto:your-email@example.com"

[[d1_databases]]
binding = "DB"
database_name = "vpcs-journal"
database_id = "your-journal-database-id"
```

### 2. Generate VAPID Keys

You can generate VAPID keys using the web-push library:

```bash
npx web-push generate-vapid-keys
```

### 3. Apply Database Migrations

Run the following migrations in order:

```bash
wrangler d1 execute DB --file=migrations/0006_enhance_push_subscriptions.sql
wrangler d1 execute DB --file=migrations/0007_enhance_notification_log.sql
wrangler d1 execute DB --file=migrations/0008_add_push_settings.sql
wrangler d1 execute DB --file=migrations/0009_enhance_transaction_approval.sql
wrangler d1 execute DB --file=migrations/0010_add_notification_templates.sql
```

## API Endpoints

### Subscription Management

- `POST /api/push/subscribe` - Register new push subscription
- `DELETE /api/push/subscribe` - Unregister push subscription
- `GET /api/push/public-key` - Get VAPID public key
- `GET /api/push/subscriptions` - Get user's active subscriptions

### Notification Sending

- `POST /api/push/send-test` - Send test notification
- `POST /api/push/respond/:transactionId` - Handle approval/decline responses

### Settings Management

- `GET /api/push/settings` - Get user notification settings
- `PUT /api/push/settings` - Update notification setting

## Usage Examples

### Client-Side Subscription

```typescript
import { PushClient } from './services/push-client';

const pushClient = new PushClient();

// Initialize push notifications
await pushClient.initialize();

// Subscribe to push notifications
const subscription = await pushClient.subscribeToPush(userId);
if (subscription) {
  console.log('Successfully subscribed to push notifications');
}
```

### Server-Side Notification Sending

```typescript
import { PushService } from './services/push-service';

const pushService = new PushService(env);

// Send transaction approval request
const success = await pushService.sendTransactionApproval(
  transactionId,
  familyNumber,
  vendorName,
  amount,
  description
);

// Send transaction result
await pushService.sendTransactionResult(
  transactionId,
  familyNumber,
  amount,
  'approved',
  'Approved by parent'
);
```

## Notification Templates

The system includes predefined templates for common notifications:

- `transaction_approval` - Purchase approval requests
- `transaction_approved` - Approved purchase notifications
- `transaction_declined` - Declined purchase notifications
- `limit_alert` - Spending limit warnings
- `daily_summary` - Daily spending summaries

### Template Variables

Templates support variable substitution using `{{variable_name}}` syntax:

- `{{vendor_name}}` - Name of the vendor
- `{{amount}}` - Transaction amount
- `{{percentage}}` - Percentage of limit reached
- `{{total_amount}}` - Total daily spending
- `{{transaction_count}}` - Number of transactions

## User Settings

Users can configure notification preferences:

- `transaction_approvals` - Enable/disable approval requests
- `daily_summaries` - Enable/disable daily summaries
- `limit_alerts` - Enable/disable limit warnings
- `quiet_hours_start` - Start of quiet hours (HH:MM)
- `quiet_hours_end` - End of quiet hours (HH:MM)

## Security Features

### VAPID Authentication
- Proper JWT token generation for push service authentication
- ECDSA signing with VAPID private key
- Subscription validation before storage

### Payload Encryption
- AES-GCM encryption of notification payloads
- Proper key derivation from subscription keys
- Secure content encoding headers

### Rate Limiting
- Built-in protection against subscription spam
- Automatic cleanup of invalid subscriptions
- Error tracking and monitoring

## Error Handling

### Subscription Management
- Automatic deactivation of invalid subscriptions
- Retry logic for failed deliveries
- Comprehensive error logging

### Delivery Tracking
- Success/failure tracking for each notification
- Error message storage for debugging
- Retry count monitoring

## Monitoring and Analytics

### Key Metrics
- Notification delivery success rates
- User response times to approval requests
- Subscription health and activity
- Error rates and types

### Logging
- All notification attempts are logged
- User interactions are tracked
- Error conditions are recorded with context

## Troubleshooting

### Common Issues

1. **Notifications not received**
   - Check browser notification permissions
   - Verify service worker registration
   - Ensure VAPID keys are correct

2. **Subscription failures**
   - Validate subscription format
   - Check VAPID key configuration
   - Review browser console for errors

3. **Delivery failures**
   - Monitor notification log table
   - Check push service response codes
   - Verify subscription endpoint validity

### Debug Tools

- Browser developer tools for service worker debugging
- Network tab for API request monitoring
- Console logs for client-side debugging
- Database queries for server-side investigation

## Future Enhancements

1. **Advanced Templates** - Rich media and interactive notifications
2. **Scheduled Notifications** - Time-based notification delivery
3. **Notification Analytics** - Detailed user engagement metrics
4. **Multi-language Support** - Localized notification content
5. **Notification Channels** - Email/SMS fallback options

## Dependencies

- `@block65/webcrypto-web-push` - VAPID payload building and encryption
- `hono` - Web framework for API endpoints
- `@cloudflare/workers-types` - TypeScript definitions

## Browser Support

The push notification system requires:
- Service Worker support
- Push API support
- Notification API support

Supported browsers:
- Chrome 42+
- Firefox 44+
- Safari 16+
- Edge 17+
