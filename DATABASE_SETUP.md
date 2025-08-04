# Database Setup for Village Payment Control System (VPCS)

## Overview

The VPCS system uses a single D1 database that contains all tables for authentication, user management, transactions, and notifications.

## Database Schema

### Single Database (DB)

#### Users Table (Updated)
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    current_challenge TEXT,
    family_number TEXT UNIQUE,
    surname TEXT,
    default_limit DECIMAL(10,2) DEFAULT 50.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Authenticators Table
```sql
CREATE TABLE authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    credential_public_key BLOB NOT NULL,
    counter INTEGER NOT NULL,
    transports TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### Push Subscriptions Table
```sql
CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### Vendor Limits Table
```sql
CREATE TABLE vendor_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    limit_amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES users (id)
);
```

#### Vendor Surname Cache Table
```sql
CREATE TABLE vendor_surname_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id TEXT NOT NULL,
    family_number TEXT NOT NULL,
    surname TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES users (id),
    UNIQUE(vendor_id, family_number)
);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME DEFAULT NULL,
    declined_at DATETIME DEFAULT NULL,
    timeout_occurred BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'timeout'))
);
```

#### Notification Log Table
```sql
CREATE TABLE notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    response_action TEXT CHECK (response_action IN ('approve', 'decline', 'timeout')),
    FOREIGN KEY (transaction_id) REFERENCES transactions (id)
);
```

## Setup Instructions

### 1. Create D1 Database

```bash
# Create the VPCS database
wrangler d1 create village-payments-vpcs
```

### 2. Update wrangler.toml

Replace the database ID in `wrangler.toml` with the actual ID from step 1:

```toml
[[d1_databases]]
binding = "DB"
database_name = "village-payments-vpcs"
database_id = "your-actual-database-id"
```

### 3. Apply Migrations

```bash
# Apply all migrations in order
wrangler d1 execute village-payments-vpcs --file=./migrations/0001_initital-auth-schema.sql
wrangler d1 execute village-payments-vpcs --file=./migrations/0004_consolidated_schema.sql
```

### 4. Verify Setup

```bash
# Check all tables
wrangler d1 execute village-payments-vpcs --command="SELECT name FROM sqlite_master WHERE type='table';"
```

## Benefits of Single Database Approach

✅ **Full Wrangler Migration Support**: Can use `wrangler d1 migrations` for automatic migration tracking
✅ **Simpler Deployment**: Only one database to manage and backup
✅ **Better Development Experience**: Easier to debug and maintain
✅ **Automatic Migration Tracking**: Wrangler handles migration state automatically
✅ **Consistent Data**: All related data in one place with proper foreign key relationships

## API Endpoints

### Family Management
- `PUT /api/family/settings` - Update family number and surname
- `GET /api/family/settings` - Get family settings
- `PUT /api/family/limits` - Update spending limits

### Vendor Operations
- `POST /api/vendor/payment-request` - Submit payment request
- `GET /api/vendor/surname/:family_number` - Get cached surname for autofill

## Next Steps

After database setup, implement:
1. Push notification system
2. Durable Objects for real-time approval workflow
3. Frontend components for family settings and vendor interface
4. Transaction history and analytics 