import { PurchaseRequest } from './types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePurchaseRequest(request: PurchaseRequest): ValidationResult {
  // Check required fields
  if (!request.number || !request.surname || !request.amount || !request.vendorId) {
    return {
      isValid: false,
      error: 'Missing required fields: number, surname, amount, vendorId'
    };
  }

  // Validate number format (should be digits only)
  if (!/^\d+$/.test(request.number)) {
    return {
      isValid: false,
      error: 'Number must contain only digits'
    };
  }

  // Validate surname (letters, spaces, hyphens only)
  if (!/^[a-zA-Z\s\-']+$/.test(request.surname)) {
    return {
      isValid: false,
      error: 'Surname contains invalid characters'
    };
  }

  // Validate amount (positive number, reasonable limits)
  const amount = parseFloat(request.amount.toString());
  if (isNaN(amount) || amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be a positive number'
    };
  }

  if (amount > 1000) {
    return {
      isValid: false,
      error: 'Amount too large (maximum 1000)'
    };
  }

  // Validate vendor ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(request.vendorId)) {
    return {
      isValid: false,
      error: 'Invalid vendor ID format'
    };
  }

  // Validate optional child name
  if (request.childName && !/^[a-zA-Z\s\-']+$/.test(request.childName)) {
    return {
      isValid: false,
      error: 'Child name contains invalid characters'
    };
  }

  // Validate optional description length
  if (request.description && request.description.length > 200) {
    return {
      isValid: false,
      error: 'Description too long (maximum 200 characters)'
    };
  }

  return { isValid: true };
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-']/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePushSubscription(subscription: any): ValidationResult {
  if (!subscription || typeof subscription !== 'object') {
    return {
      isValid: false,
      error: 'Invalid subscription object'
    };
  }

  if (!subscription.endpoint || typeof subscription.endpoint !== 'string') {
    return {
      isValid: false,
      error: 'Invalid or missing endpoint'
    };
  }

  if (!subscription.keys || typeof subscription.keys !== 'object') {
    return {
      isValid: false,
      error: 'Invalid or missing keys object'
    };
  }

  if (!subscription.keys.p256dh || !subscription.keys.auth) {
    return {
      isValid: false,
      error: 'Missing required keys (p256dh, auth)'
    };
  }

  return { isValid: true };
}

export function validateFamilyRegistration(data: any): ValidationResult {
  // Validate required fields
  if (!data.number || !data.surname || !data.parentPushSubscription) {
    return {
      isValid: false,
      error: 'Missing required fields: number, surname, parentPushSubscription'
    };
  }

  // Validate number format
  if (!/^\d+$/.test(data.number)) {
    return {
      isValid: false,
      error: 'Family number must contain only digits'
    };
  }

  // Validate surname
  if (!/^[a-zA-Z\s\-']+$/.test(data.surname)) {
    return {
      isValid: false,
      error: 'Surname contains invalid characters'
    };
  }

  // Validate default limit
  if (data.defaultLimit && (isNaN(data.defaultLimit) || data.defaultLimit <= 0)) {
    return {
      isValid: false,
      error: 'Default limit must be a positive number'
    };
  }

  // Validate push subscription
  const pushValidation = validatePushSubscription(data.parentPushSubscription);
  if (!pushValidation.isValid) {
    return pushValidation;
  }

  // Validate optional parent name
  if (data.parentName && !/^[a-zA-Z\s\-']+$/.test(data.parentName)) {
    return {
      isValid: false,
      error: 'Parent name contains invalid characters'
    };
  }

  // Validate optional child name
  if (data.childName && !/^[a-zA-Z\s\-']+$/.test(data.childName)) {
    return {
      isValid: false,
      error: 'Child name contains invalid characters'
    };
  }

  return { isValid: true };
}

export function validateVendorInfo(data: any): ValidationResult {
  if (!data.id || !data.name || !data.category) {
    return {
      isValid: false,
      error: 'Missing required fields: id, name, category'
    };
  }

  // Validate vendor ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(data.id)) {
    return {
      isValid: false,
      error: 'Vendor ID must contain only letters, numbers, underscores, and hyphens'
    };
  }

  // Validate vendor name
  if (!/^[a-zA-Z0-9\s\-'&.]+$/.test(data.name)) {
    return {
      isValid: false,
      error: 'Vendor name contains invalid characters'
    };
  }

  // Validate category
  const validCategories = ['grocery', 'pharmacy', 'bakery', 'toys', 'books', 'clothing', 'electronics', 'other'];
  if (!validCategories.includes(data.category.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
    };
  }

  return { isValid: true };
}

export function rateLimit(key: string, windowMs: number, maxRequests: number): boolean {
  // Simple in-memory rate limiting - in production, use KV or Durable Objects
  // This is a placeholder implementation that always returns true
  // In production, implement proper rate limiting logic
  return true;
}

export function validateApprovalResponse(data: any): ValidationResult {
  if (!data.transactionId || !data.action) {
    return {
      isValid: false,
      error: 'Missing required fields: transactionId, action'
    };
  }

  if (!['approve', 'decline'].includes(data.action)) {
    return {
      isValid: false,
      error: 'Action must be either "approve" or "decline"'
    };
  }

  // Validate transaction ID format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.transactionId)) {
    return {
      isValid: false,
      error: 'Invalid transaction ID format'
    };
  }

  // Validate optional reason
  if (data.reason && data.reason.length > 500) {
    return {
      isValid: false,
      error: 'Reason too long (maximum 500 characters)'
    };
  }

  return { isValid: true };
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function isValidAmount(amount: any, maxAmount: number = 1000): boolean {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount > 0 && numAmount <= maxAmount;
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add country code if missing (assuming local format)
  if (digits.length === 10) {
    return `+1${digits}`; // US format
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return digits;
}