# Village Payment Control System

A Cloudflare Workers-based application to control children's purchases in village stores using traditional "number and surname" payment method.

## Problem Statement

In our village, residents can purchase goods from local vendors using a simple "number and surname" system. Monthly, vendors send payment lists to the country accountant for collection. However, children knowing family numbers can make unauthorized purchases.

## Solution Overview

This application adds a control layer for children's purchases while maintaining the existing payment workflow for adults.

### How It Works

1. **Child Purchase Attempt**: Child provides number and surname to vendor
2. **Vendor Input**: Vendor enters number, surname, and purchase amount into web form
3. **Automatic Processing**: 
   - If amount ≤ predefined family limit → **Automatic approval**
   - If amount > family limit → **Parent notification sent**
4. **Parent Decision**: Parent receives web push notification with approve/decline options
5. **Timeout Handling**: If no response within 5 minutes → **Automatic approval**

## Technical Architecture

### Cloudflare Platform Components
- **Cloudflare Workers**: Main application logic and API endpoints
- **Cloudflare D1**: Database for family data, limits, and transaction logs
- **Cloudflare KV**: Session storage and temporary transaction states
- **Web Push API**: Real-time notifications to parents
- **Cloudflare Pages** (optional): Static frontend hosting

### Key Features
- Real-time purchase approval system
- Configurable spending limits per family
- Web push notifications with action buttons
- Automatic timeout approval mechanism
- Transaction logging and audit trail
- Simple vendor interface
- Parent dashboard for limit management

## Database Schema (Preliminary)

### Families Table
- `family_id` (primary key)
- `number` (village payment number)
- `surname`
- `parent_phone` or `parent_notification_endpoint`
- `spending_limit` (daily/weekly limit)
- `created_at`

### Transactions Table
- `transaction_id` (primary key)
- `family_id` (foreign key)
- `amount`
- `vendor_name`
- `status` (pending/approved/declined)
- `requested_at`
- `responded_at`
- `timeout_approved`

### Vendor Interface
- Simple web form for entering purchase requests
- Real-time status updates
- Transaction history view

### Parent Interface
- Dashboard for managing spending limits
- Transaction history and notifications
- Family member management

## Deployment Architecture
- Single Cloudflare Worker handling all API routes
- D1 database for persistent data
- KV store for temporary states and caching
- Optional: Pages for static frontend hosting
- Web Push service worker for notifications

## Security Considerations
- Rate limiting to prevent abuse
- Input validation and sanitization
- Secure notification endpoints
- Transaction logging for accountability
- Optional: Basic authentication for vendor access

---

*This README will be updated as the project develops with specific implementation details, API documentation, and deployment instructions.*