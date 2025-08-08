# Invite Feature Documentation

## Overview

The invite feature allows logged-in users to create invite links that enable other devices to join the same family. This supports the multi-device family management system where multiple family members can receive notifications and approve payments.

## How It Works

### 1. Creating an Invite Link

1. **Prerequisites**: User must be logged in and have family settings configured (family number and surname)
2. **Access**: Go to User Profile page and click "Create Invite Link" button
3. **Generation**: System creates a unique token and stores it in the `one_time_links` table
4. **Sharing**: User gets a shareable URL (e.g., `https://app.com/invite?token=abc123`)

### 2. Accepting an Invite

1. **Open Link**: Recipient opens the invite link on their device
2. **Validation**: System validates the token and shows family information
3. **Registration**: Recipient chooses a username and completes WebAuthn registration
4. **Joining**: New user is created with the same family number and surname

## API Endpoints

### POST /api/invite/create
Creates a new invite link for the current user's family.

**Requirements**: JWT authentication, family settings configured
**Response**: 
```json
{
  "success": true,
  "inviteUrl": "https://app.com/invite?token=abc123",
  "token": "abc123",
  "expiresAt": 1234567890
}
```

### GET /api/invite/validate/:token
Validates an invite token and returns family information.

**Response**:
```json
{
  "valid": true,
  "family_number": "123",
  "surname": "Smith",
  "expiresAt": 1234567890
}
```

### POST /api/invite/start
Starts the registration process for accepting an invite.

**Body**: `{ "token": "abc123", "username": "john" }`
**Response**: WebAuthn registration options

### POST /api/invite/finish
Completes the registration process for accepting an invite.

**Body**: `{ "token": "abc123", "response": {...} }`
**Response**: User data and JWT token

## Security Features

- **Token Expiration**: Invite links expire after 24 hours
- **Single Use**: Each token can only be used once
- **Family Validation**: Only users with family settings can create invites
- **WebAuthn Required**: Invite acceptance requires biometric authentication
- **Username Uniqueness**: Username must be unique across the system

## Database Schema

Uses the existing `one_time_links` table:
```sql
CREATE TABLE one_time_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## User Interface

### Invite Creation
- Modal dialog in User Profile page
- Shows invite URL with copy functionality
- Displays expiration information

### Invite Acceptance
- Dedicated `/invite` page
- Shows family information before registration
- Username selection form
- WebAuthn registration flow
- Success/error handling

## Error Handling

- Invalid or expired tokens
- Username already taken
- WebAuthn registration failures
- Network errors
- Missing family settings

## Testing

To test the invite feature:

1. **Create Invite**: Log in, set family settings, create invite link
2. **Accept Invite**: Open invite link in incognito/another device
3. **Complete Registration**: Choose username and complete WebAuthn setup
4. **Verify**: Check that new user has same family settings

## Future Enhancements

- Invite link management (view active invites, revoke invites)
- Invite expiration notifications
- Bulk invite creation
- Invite analytics and tracking
