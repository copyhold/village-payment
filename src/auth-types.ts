import type { AuthenticatorTransport } from '@simplewebauthn/types';

/**
 * A user of the application. Corresponds to the `users` table in the database.
 */
export interface User {
  id: string;
  username: string;
  current_challenge?: string;
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
  transports?: AuthenticatorTransport[];
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
