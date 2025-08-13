# Cloudflare RPC Workers Implementation Guide

## Overview

RPC (Remote Procedure Call) workers in Cloudflare allow you to create modular, reusable services that can be called from other workers. This guide shows how to implement RPC workers using the `WorkerEntrypoint` class.

## Architecture

Your project demonstrates a complete RPC worker implementation with:

1. **Main Worker** (`src/worker.ts`) - Handles HTTP requests and calls RPC services
2. **RPC Worker** (`src/push-worker.ts`) - Handles push notification logic
3. **Service Binding** - Connects the main worker to the RPC worker

## Step-by-Step Implementation

### 1. Create the RPC Worker

```typescript
// src/push-worker.ts
import { WorkerEntrypoint } from "cloudflare:workers";

export class PushService extends WorkerEntrypoint {
  constructor(private env: Env) {
    super();
  }

  // All public methods become RPC endpoints
  async sendTransactionApproval(
    transactionId: number,
    familyNumber: string,
    vendorName: string,
    amount: number,
    description?: string
  ): Promise<boolean> {
    // Implementation here
  }

  async validateSubscription(subscription: PushSubscription): Promise<boolean> {
    // Implementation here
  }

  // Add more RPC methods as needed
}
```

### 2. Configure the RPC Worker

```json
// push-worker.jsonc
{
  "name": "vpcs-push-worker",
  "compatibility_date": "2025-04-03",
  "main": "./src/push-worker.ts",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "village_payments",
      "database_id": "your-database-id"
    }
  ]
}
```

### 3. Bind the RPC Worker to Main Worker

```json
// wrangler.jsonc
{
  "name": "village-payment-auth",
  "main": "./src/worker.ts",
  "services": [
    {
      "binding": "PUSH_SERVICE",
      "service": "vpcs-push-worker",
      "entrypoint": "PushService"
    }
  ]
}
```

### 4. Type the Environment

```typescript
// src/env.ts
export type Env = {
  // ... other bindings
  PUSH_SERVICE: import('@cloudflare/workers-types').Fetcher;
};
```

### 5. Call RPC Methods

```typescript
// In your main worker
app.post('/api/vendor/payment-request', async (c) => {
  const notificationSent = await c.env.PUSH_SERVICE.sendTransactionApproval(
    transactionId,
    familyNumber,
    vendorName,
    amount,
    description
  );
});
```

## Key Concepts

### WorkerEntrypoint Class
- Extends `WorkerEntrypoint` from `"cloudflare:workers"`
- Constructor receives environment bindings
- All public methods become RPC endpoints
- Private methods remain internal

### Service Binding Configuration
- `binding`: Name used to access the service (e.g., `PUSH_SERVICE`)
- `service`: Name of the deployed worker
- `entrypoint`: Class name that extends WorkerEntrypoint

### RPC Method Signatures
- Must be `async` functions
- Can accept any serializable parameters
- Return values must be serializable
- Support TypeScript types

## Benefits

1. **Modularity**: Separate concerns into different workers
2. **Reusability**: Call the same service from multiple workers
3. **Scalability**: Scale services independently
4. **Type Safety**: Full TypeScript support
5. **Performance**: Low latency inter-worker communication

## Deployment

### Deploy RPC Worker First
```bash
wrangler deploy --config push-worker.jsonc
```

### Deploy Main Worker
```bash
wrangler deploy --config wrangler.jsonc
```

## Error Handling

```typescript
try {
  const result = await c.env.PUSH_SERVICE.sendTransactionApproval(...);
} catch (error) {
  console.error('RPC call failed:', error);
  // Handle error appropriately
}
```

## Best Practices

1. **Keep RPC methods focused**: Each method should do one thing well
2. **Use meaningful names**: Method names should clearly indicate their purpose
3. **Handle errors gracefully**: Always catch and handle RPC errors
4. **Type everything**: Use TypeScript for better development experience
5. **Test thoroughly**: Test RPC calls in isolation and integration

## Example Use Cases

- **Authentication Service**: Handle user authentication and session management
- **Notification Service**: Send push notifications, emails, SMS
- **Payment Service**: Process payments and handle financial transactions
- **Analytics Service**: Collect and process analytics data
- **Cache Service**: Provide caching functionality across workers

## Troubleshooting

### Common Issues

1. **Service not found**: Ensure RPC worker is deployed before main worker
2. **Method not found**: Check that method is public in WorkerEntrypoint class
3. **Type errors**: Verify environment types include service binding
4. **Serialization errors**: Ensure parameters and return values are serializable

### Debugging

```typescript
// Add logging to RPC methods
async sendTransactionApproval(...args) {
  console.log('RPC call received:', args);
  // ... implementation
}
```

## Advanced Patterns

### Multiple RPC Workers
```json
{
  "services": [
    {
      "binding": "PUSH_SERVICE",
      "service": "push-worker",
      "entrypoint": "PushService"
    },
    {
      "binding": "AUTH_SERVICE", 
      "service": "auth-worker",
      "entrypoint": "AuthService"
    }
  ]
}
```

### RPC Worker Calling Other RPC Workers
```typescript
export class PaymentService extends WorkerEntrypoint {
  async processPayment(paymentData: PaymentData) {
    // Call another RPC worker
    const authResult = await this.env.AUTH_SERVICE.validateUser(userId);
    // ... rest of implementation
  }
}
```

This implementation provides a robust, scalable architecture for building complex applications on Cloudflare Workers.
