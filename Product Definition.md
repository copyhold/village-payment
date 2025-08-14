# Village Payment Control System - Product Definition Document

## 1. Executive Summary

**Product Name**: Village Payment Control System (VPCS)
**Platform**: Cloudflare Workers Ecosystem
**Purpose**: Prevent unauthorized purchases by children while maintaining the traditional village "number + surname" payment system

## 2. Problem Statement

In our village, the traditional payment system allows purchases using only a family number and surname. While convenient, this system is vulnerable to abuse by children who know their family's payment credentials. Parents need a way to control and approve larger purchases while maintaining the simplicity of the existing system.

## 3. Solution Overview

A web-based application that intercepts payment requests, applies spending limits, and sends real-time approval requests to parents when limits are exceeded. The system maintains backward compatibility with existing village payment practices while adding parental control.

## 4. Core Features

### 4.1 User Management
- **Universal User System**: All users (parents, vendors) share the same account type
- **Family Number Assignment**: Each user can set their unique family number and surname
- **Multi-Device Support**: Users can log in from multiple devices
- **Push Notification Registration**: Automatic enrollment for web push notifications

### 4.2 Vendor Interface
- **Universal Vendor Access**: Any logged-in user can act as a vendor
- **Real-time Response**: Immediate approval/decline feedback
- **Payment Request Form**: Simple form with fields:
  - Family Number (input)
  - Surname (input)
  - Amount (input)
  - Description (optional)

 The Surname should be entered only once by vendor. after that it should be saved in the DB for the vendor.
 The field should be autofilled next time the number is used. 

### 4.3 Spending Control System
- **Default Family Limit**: Global spending threshold per family
- **Vendor-Specific Limits**: Optional custom limits per vendor (overrides default)
- **Automatic Approval**: Purchases under limit are instantly approved
- **Parent Notification**: Push notifications sent when limits exceeded

### 4.4 Real-time Approval System
- **Push Notifications**: Sent to all registered devices for the family
- **Notification Content**:
  - Vendor name
  - Amount requested  
  - Description (if provided)
  - Two action buttons: "Approve" / "Decline"
- **Auto-Approval Timer**: 5-minute timeout with automatic approval
- **Multi-Device Handling**: First response from any device determines outcome

## 5. Technical Architecture

### 5.1 Cloudflare Services Used
- **Cloudflare Workers**: Main application logic and API endpoints
- **D1 Database**: Data persistence (2 databases)
- **Durable Objects**: Real-time notification management and timeouts
- **Workers Push API**: Web push notifications

### 5.2 Database Schema

#### DBAUTH Database
```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    current_challenge TEXT
    family_number TEXT UNIQUE,
    surname TEXT,
    default_limit DECIMAL(10,2) DEFAULT 50.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Vendor-specific limits table
CREATE TABLE vendor_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    limit_amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES users (id)
);

-- Create authenticators table
-- This table stores the WebAuthn authenticators associated with each user.
CREATE TABLE authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    -- The credentialID is a URL-safe base64-encoded string.
    credential_id TEXT NOT NULL UNIQUE,
    -- The public key is stored as a blob.
    credential_public_key BLOB NOT NULL,
    -- The counter is used to prevent replay attacks.
    counter INTEGER NOT NULL,
    -- Transports can be 'internal', 'usb', 'nfc', 'ble', 'hybrid'. Stored as JSON array.
    transports TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create one_time_links table
-- This table stores tokens for adding new devices.
CREATE TABLE one_time_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);```

#### DB Database
```sql
-- Payment transactions table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME DEFAULT NULL,
    declined_at DATETIME DEFAULT NULL,
    timeout_occurred BOOLEAN DEFAULT FALSE
);

-- Notification log table
CREATE TABLE notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    response_action TEXT, -- 'approve', 'decline', 'timeout'
    FOREIGN KEY (transaction_id) REFERENCES transactions (id)
);
```

### 5.3 Core Workflows

#### 5.3.1 Payment Request Flow
1. Vendor enters family number, and amount
2. if there is already such number in vendor's storage the surname field is prepulated
2. System validates the pair of number+surname
3. System checks applicable limit (vendor-specific or default)
4. If under limit: Auto-approve and log transaction
5. If over limit: Create pending transaction and trigger notification workflow

#### 5.3.2 Notification Workflow (Durable Object)
1. Create Durable Object instance for transaction
2. Send push notifications to all family devices
3. Start 5-minute countdown timer
4. Wait for first response or timeout:
   - **Approve/Decline**: Update transaction status, notify vendor
   - **Timeout**: Auto-approve, update transaction status, notify vendor

## 6. User Interface Design

### 6.1 Authentication Pages
- **Login** and Registration: Family number and passswordless webn auth
- **Dashboard**: Welcome page with navigation options

### 6.2 Family Settings
- **Profile Management**: Set family surname
- **Spending Limits**: Configure default and vendor-specific limits
- **Device Management**: View registered devices for notifications

### 6.3 Vendor Interface
- **Payment Request Form**: Clean, simple form for payment processing
- **Transaction Status**: Real-time feedback on request status
- **Transaction History**: List of processed payments

### 6.4 Parent Dashboard
- **Recent Transactions**: List of family purchases
- **Pending Approvals**: Active notification requests
- **Spending Analytics**: Monthly spending summaries

## 7. API Endpoints

### 7.1 Authentication
- already implemented

### 7.2 Family Management
- `PUT /family/settings` - Update family number and surname
- `GET /family/limits` - Get spending limits
- `PUT /family/limits` - Update spending limits
- `GET /family/transactions` - Get family transaction history

### 7.3 Vendor Operations
- `POST /vendor/payment-request` - Submit payment request
- `GET /vendor/transaction-status/:id` - Check transaction status
- `GET /vendor/history` - Get vendor transaction history

### 7.4 Notifications
- `POST /notifications/subscribe` - Register push subscription
- `POST /notifications/respond/:transactionId` - Respond to approval request
- `GET /notifications/pending` - Get pending approval requests

## 8. Security Considerations

### 8.1 Authentication Security
- Password hashing using bcrypt
- Session management via secure JWT tokens
- CSRF protection on state-changing operations

### 8.2 Data Protection
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- Rate limiting on payment requests and notifications

### 8.3 Notification Security
- Push subscription validation
- Secure notification payload encryption
- Transaction ID verification for approval responses

## 9. Performance Requirements

- **Response Time**: Payment requests < 500ms for auto-approvals
- **Notification Delivery**: Push notifications sent within 2 seconds
- **Concurrent Users**: Support 100+ simultaneous vendor operations
- **Database Performance**: Transaction logging < 100ms

## 10. Monitoring and Analytics

### 10.1 Key Metrics
- Daily transaction volume
- Auto-approval vs manual approval ratio
- Average parent response time
- Timeout occurrence rate

### 10.2 Error Tracking
- Failed payment requests
- Push notification delivery failures
- Database connection issues
- Durable Object timeout problems

## 11. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- Database setup and user authentication
- Basic family number management
- Simple payment request processing

### Phase 2: Notification System (Week 3-4)
- Durable Objects implementation
- Push notification integration
- Approval/decline workflow

### Phase 3: User Interface (Week 5-6)
- Responsive web interface
- Vendor payment form
- Parent dashboard

### Phase 4: Testing and Polish (Week 7-8)
- End-to-end testing
- Performance optimization
- Security audit

## 12. Success Criteria

- **Functional**: 95% of payment requests processed correctly
- **User Experience**: Average vendor transaction time < 30 seconds
- **Parental Control**: 90% of over-limit requests receive parent response
- **System Reliability**: 99.5% uptime during business hours
- **Village Adoption**: 80% of families register within first month

## 13. Future Enhancements

- **Spending Insights**: AI-powered spending pattern analysis
- **Bulk Operations**: Vendor batch payment processing