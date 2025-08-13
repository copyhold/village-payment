# Secret Management for Village Payment Control System

## Overview

This document outlines the secret management setup for the VPCS project, following Cloudflare Workers best practices for handling sensitive information.

## Secret Keys Identified and Managed

### 1. JWT_SECRET
- **Purpose**: Used for signing and verifying JWT tokens for user authentication
- **Previous Location**: Hardcoded in `wrangler.toml` as plaintext
- **Current Status**: ✅ Moved to Cloudflare Secrets
- **Local Development**: Available via `.dev.vars` file

### 2. VAPID_PRIVATE_KEY
- **Purpose**: Used for signing web push notifications
- **Previous Location**: Hardcoded in `wrangler.toml` as plaintext
- **Current Status**: ✅ Moved to Cloudflare Secrets
- **Local Development**: Available via `.dev.vars` file

## Configuration Changes Made

### wrangler.toml Updates
- ✅ Removed `JWT_SECRET` from `[vars]` section
- ✅ Removed `VAPID_PRIVATE_KEY` from `[vars]` section
- ✅ Fixed assets configuration to include `directory` property
- ✅ Kept non-sensitive variables in `[vars]` section

### .dev.vars File Created
```bash
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
VAPID_PRIVATE_KEY="to2xXAPetfqLqdeIKRyPWKaDLf3deuoOz7mOW4J7So0"
```

## Current Secret Status

### Production Environment
```bash
npx wrangler secret list --env=""
[
  {
    "name": "JWT_SECRET",
    "type": "secret_text"
  },
  {
    "name": "VAPID_PRIVATE_KEY",
    "type": "secret_text"
  }
]
```

### Non-Sensitive Variables (Remain in wrangler.toml)
- `RP_ID` - WebAuthn relying party ID
- `RP_NAME` - WebAuthn relying party name
- `RP_ORIGIN` - WebAuthn relying party origin
- `VAPID_PUBLIC_KEY` - Public key for push notifications (safe to expose)
- `VAPID_SUBJECT` - Email subject for push notifications

## Best Practices Implemented

### 1. Separation of Concerns
- **Sensitive data**: Stored as Cloudflare Secrets
- **Non-sensitive data**: Stored in `wrangler.toml` as environment variables
- **Local development**: Uses `.dev.vars` file

### 2. Security
- ✅ Secrets are encrypted and not visible in Wrangler or Cloudflare dashboard
- ✅ `.dev.vars*` is included in `.gitignore` to prevent accidental commits
- ✅ No sensitive data in version control

### 3. Environment Management
- **Local Development**: Uses `.dev.vars` file
- **Production**: Uses Cloudflare Secrets
- **Environment-specific**: Can use `.dev.vars.<environment>` for different environments

## Commands for Secret Management

### View Current Secrets
```bash
npx wrangler secret list --env=""
```

### Add a New Secret
```bash
npx wrangler secret put SECRET_NAME --env=""
```

### Delete a Secret
```bash
npx wrangler secret delete SECRET_NAME --env=""
```

### Update a Secret
```bash
npx wrangler secret put SECRET_NAME --env=""
```

## Local Development Setup

1. **Create `.dev.vars` file** (already done)
2. **Add to `.gitignore`** (already done)
3. **Run development server**: `npm run dev`

The `.dev.vars` file will automatically be loaded during local development.

## Production Deployment

1. **Build the project**: `npm run build`
2. **Deploy to Cloudflare**: `npx wrangler deploy --env=""`
3. **Verify secrets**: `npx wrangler secret list --env=""`

## Security Recommendations

### 1. Rotate Secrets Regularly
- Change JWT_SECRET periodically
- Rotate VAPID keys when needed

### 2. Use Strong Secret Values
- Generate cryptographically secure random strings
- Use different secrets for different environments

### 3. Monitor Secret Usage
- Regularly audit secret access
- Remove unused secrets

### 4. Environment-Specific Secrets
- Use different secrets for staging and production
- Never use production secrets in development

## Troubleshooting

### Secret Already in Use Error
If you encounter "Binding name already in use" error:
1. Deploy the current configuration first
2. Then add the secret using `wrangler secret put`

### Missing Secrets in Production
If secrets are not available in production:
1. Verify secrets are set: `npx wrangler secret list --env=""`
2. Redeploy if needed: `npx wrangler deploy --env=""`

### Local Development Issues
If secrets are not available locally:
1. Check `.dev.vars` file exists and has correct format
2. Restart development server
3. Verify `.dev.vars` is not in `.gitignore` (it should be)

## References

- [Cloudflare Workers Secrets Documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler Secret Commands](https://developers.cloudflare.com/workers/wrangler/commands/#secret)
- [Local Development with Secrets](https://developers.cloudflare.com/workers/development-testing/environment-variables/)
