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