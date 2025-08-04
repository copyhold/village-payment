import type { AuthenticatorTransport } from '@simplewebauthn/types';

/**
 * A user of the application. Corresponds to the `users` table in the database.
 */
export interface User {
  id: string;
  username: string;
  current_challenge?: string;
  family_number?: string;
  surname?: string;
  default_limit?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * An authenticator associated with a user. Corresponds to the `authenticators` table.
 */
export interface Authenticator {
  id?: number;
  user_id: string;
  credential_id: string;
  credential_public_key: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransport[] | string; // Can be array when used in app, or string when from DB
}

/**
 * A one-time link for adding a new device. Corresponds to the `one_time_links` table.
 */
export interface OneTimeLink {
    id?: number;
    user_id: string;
    token: string;
    expires_at: number; // Unix timestamp
    used: boolean;
}

/**
 * Push subscription for web notifications. Corresponds to the `push_subscriptions` table.
 */
export interface PushSubscription {
  id?: number;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  created_at?: string;
}

/**
 * Vendor-specific spending limit. Corresponds to the `vendor_limits` table.
 */
export interface VendorLimit {
  id?: number;
  family_number: string;
  vendor_id: string;
  limit_amount: number;
  created_at?: string;
}

/**
 * Vendor surname cache for autofill. Corresponds to the `vendor_surname_cache` table.
 */
export interface VendorSurnameCache {
  id?: number;
  vendor_id: string;
  family_number: string;
  surname: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Payment transaction. Corresponds to the `transactions` table in DBJOURNAL.
 */
export interface Transaction {
  id?: number;
  family_number: string;
  vendor_id: string;
  amount: number;
  description?: string;
  created_at?: string;
  approved_at?: string;
  declined_at?: string;
  timeout_occurred?: boolean;
  status?: 'pending' | 'approved' | 'declined' | 'timeout';
}

/**
 * Notification log entry. Corresponds to the `notification_log` table in DBJOURNAL.
 */
export interface NotificationLog {
  id?: number;
  transaction_id: number;
  sent_at?: string;
  responded_at?: string;
  response_action?: 'approve' | 'decline' | 'timeout';
}

/**
 * Payment request from vendor
 */
export interface PaymentRequest {
  family_number: string;
  surname: string;
  amount: number;
  description?: string;
}

/**
 * Payment response to vendor
 */
export interface PaymentResponse {
  success: boolean;
  transaction_id?: number;
  message: string;
  requires_approval?: boolean;
  approval_timeout?: number;
}
