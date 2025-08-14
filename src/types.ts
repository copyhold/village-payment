import {Queue, KVNamespace, D1Database} from '@cloudflare/workers-types';
export interface Env {
  FAMILIES_KV: KVNamespace;
  PENDING_KV: KVNamespace;
  VENDORS_KV: KVNamespace;
  AUTO_APPROVAL_QUEUE: Queue;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  DB: D1Database;
  DB: D1Database;
}

// Используем типы из @cloudflare/workers-types для D1 (D1Database/D1PreparedStatement),
// чтобы были доступны методы вроде .all<T>() и корректные результаты.

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionRecord {
  id: number;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  created_at: string;
  last_used: string;
  is_active: boolean;
  user_agent?: string;
  device_name?: string;
}

export interface NotificationTemplate {
  id: number;
  template_key: string;
  title_template: string;
  body_template: string;
  icon_url?: string;
  badge_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PushNotificationSettings {
  id: number;
  user_id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationLogRecord {
  id: number;
  transaction_id: number;
  sent_at: string;
  responded_at?: string;
  response_action?: 'approve' | 'decline' | 'timeout';
  subscription_id?: number;
  delivered_at?: string;
  failed_at?: string;
  error_message?: string;
  retry_count: number;
  subscription_endpoint?: string;
}

export interface TransactionRecord {
  id: number;
  family_number: string;
  vendor_id: string;
  amount: number;
  description?: string;
  created_at: string;
  approved_at?: string;
  declined_at?: string;
  timeout_occurred: boolean;
  status: 'pending' | 'approved' | 'declined' | 'timeout';
  approval_requested_at?: string;
  approval_timeout_at?: string;
  approved_by_user_id?: string;
  declined_by_user_id?: string;
  decline_reason?: string;
}

export interface VendorSettings {
  limit: number;
  spent: number;
  requireApproval?: boolean; // Force approval even if under limit
}

export interface FamilyData {
  parentPushSubscription: PushSubscription;
  defaultLimit: number;
  totalSpent: number;
  vendors: Record<string, VendorSettings>;
  parentName?: string;
  childName?: string;
}

export interface PendingTransaction {
  familyKey: string;
  amount: number;
  vendorId: string;
  vendorName: string;
  timestamp: number;
  childName?: string;
  description?: string;
}

export interface VendorInfo {
  id: string;
  name: string;
  category: string;
  requiresApproval: boolean; // Some vendors always require approval (e.g., toy stores)
}

export interface PurchaseRequest {
  number: string;
  surname: string;
  amount: number;
  vendorId: string;
  childName?: string;
  description?: string;
}

export interface ApprovalResponse {
  action: 'approve' | 'decline';
  transactionId: string;
  reason?: string;
}

export enum TransactionStatus {
  APPROVED = 'approved',
  DECLINED = 'declined',
  PENDING = 'pending',
  AUTO_APPROVED = 'auto_approved'
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
  requireInteraction?: boolean;
  tag?: string;
}