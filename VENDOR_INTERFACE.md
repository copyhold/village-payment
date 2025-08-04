# Vendor Interface Documentation

## Overview

The Vendor Interface is a web-based application that allows vendors to process payments using the Village Payment Control System (VPCS). It provides a simple form for payment requests and a real-time transaction history.

## Features

### Payment Request Form

1. **Family Number Input** (Required)
   - Enter the family's unique number
   - On blur, the system automatically searches for the family and pre-fills the surname if found in the vendor's cache

2. **Surname Input** (Required)
   - Enter the family's surname
   - Can be pre-filled automatically from vendor cache
   - Validates against the family number

3. **Amount Input** (Required)
   - Enter the payment amount as a positive number
   - Shows the family's spending limit below the input
   - Displays vendor-specific limit if set, otherwise shows default limit

4. **Description Input** (Optional)
   - Single line description of the purchase
   - Helps parents understand what the payment is for

5. **Submit Button**
   - Processes the payment request
   - Shows success/error messages
   - Clears the form on successful submission

### Transaction History

1. **Reload Button**
   - Manually refresh the transaction list
   - Will be replaced by automatic SSE updates in future versions

2. **Transaction List**
   - Shows transactions from the last hour
   - Columns: Time (HH:MM), Family Number, Surname, Amount, Status
   - Sortable by time and family number
   - Status indicators: pending, approved, declined, auto_approved

## API Endpoints

### POST /api/vendor/family-info
- **Purpose**: Get family information and cached surname
- **Body**: `{ family_number: string, vendor_id: string }`
- **Response**: `{ surname: string, limit: number }`

### POST /api/vendor/payment-request
- **Purpose**: Submit a payment request
- **Body**: `{ family_number: string, surname: string, amount: number, description?: string }`
- **Response**: `{ success: boolean, transaction_id: string, message: string, requires_approval: boolean }`

### GET /api/vendor/history
- **Purpose**: Get transaction history for the last hour
- **Query**: `vendorId=string`
- **Response**: `{ transactions: Transaction[] }`

## Database Tables

### vendor_surname_cache
- Stores cached surnames for each vendor-family combination
- Enables auto-fill functionality
- Updated automatically when payments are processed

### transactions
- Stores all payment transactions
- Includes status tracking and timestamps
- Links to family and vendor information

### vendor_limits
- Stores vendor-specific spending limits
- Overrides default family limits when set

## Usage Flow

1. **Vendor Login**: Vendor logs in using WebAuthn authentication
2. **Payment Processing**:
   - Enter family number (surname auto-fills if cached)
   - Enter amount (limit is displayed)
   - Add optional description
   - Submit payment request
3. **Auto-Approval**: If amount is under limit, payment is approved immediately
4. **Manual Approval**: If amount exceeds limit, parents receive push notifications
5. **Transaction History**: View recent transactions with real-time updates

## Security Features

- JWT-based authentication for all API calls
- Vendor can only access their own transaction history
- Family number and surname validation
- Rate limiting on payment requests
- Secure push notification delivery

## Future Enhancements

- Server-Sent Events (SSE) for real-time transaction updates
- Bulk payment processing
- Advanced filtering and search in transaction history
- Export functionality for transaction reports
- Mobile-responsive design improvements 