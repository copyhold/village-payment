import { Env, PushSubscription } from './types';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload,
  env: Env
): Promise<boolean> {
  try {
    // Add action buttons for approval
    const notificationPayload = {
      ...payload,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      actions: [
        {
          action: 'approve',
          title: '✅ Approve'
        },
        {
          action: 'decline', 
          title: '❌ Decline'
        }
      ],
      requireInteraction: true, // Keep notification visible until user acts
      tag: 'purchase-approval' // Replace previous notifications
    };

    const webPushPayload = JSON.stringify(notificationPayload);
    
    // Generate JWT token for VAPID authentication
    const vapidToken = await generateVAPIDToken(env);
    
    const pushResponse = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `WebPush ${vapidToken}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '300' // 5 minutes TTL
      },
      body: await encryptPayload(webPushPayload, subscription)
    });

    if (!pushResponse.ok) {
      console.error('Push notification failed:', pushResponse.status, await pushResponse.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

async function generateVAPIDToken(env: Env): Promise<string> {
  // This is a simplified VAPID implementation
  // In production, you'd use a proper JWT library
  
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const payload = {
    aud: 'https://fcm.googleapis.com', // or other push service
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    sub: env.VAPID_SUBJECT
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  
  // Sign with VAPID private key (this is simplified - use proper crypto in production)
  const signature = await signToken(unsignedToken, env.VAPID_PRIVATE_KEY);
  
  return `${unsignedToken}.${signature}`;
}

async function signToken(data: string, privateKey: string): Promise<string> {
  // Simplified signing - in production use proper ECDSA signing
  const encoder = new TextEncoder();
  const keyData = encoder.encode(privateKey);
  const dataToSign = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, dataToSign);
  const signatureArray = new Uint8Array(signature);
  
  return btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function encryptPayload(payload: string, subscription: PushSubscription): Promise<ArrayBuffer> {
  // This is a simplified encryption implementation
  // In production, use a proper web-push library that handles the full encryption
  
  const encoder = new TextEncoder();
  const payloadBuffer = encoder.encode(payload);
  
  // For now, return the payload as-is (unencrypted)
  // In production, implement proper AES-GCM encryption with the subscription keys
  return payloadBuffer.buffer;
}

export function generateVAPIDKeys(): { publicKey: string; privateKey: string } {
  // This would generate VAPID keys - run this once and store the keys as secrets
  // In practice, use the web-push library or openssl to generate proper VAPID keys
  
  return {
    publicKey: 'your-generated-public-key',
    privateKey: 'your-generated-private-key'
  };
}

// Service Worker notification handling
export const notificationServiceWorker = `
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      actions: data.actions,
      data: data.data,
      requireInteraction: data.requireInteraction,
      tag: data.tag
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const action = event.action;
  const transactionId = event.notification.data.transactionId;
  
  if (action === 'approve' || action === 'decline') {
    event.waitUntil(
      fetch('/approval-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionId: transactionId,
          action: action
        })
      }).then(response => {
        if (response.ok) {
          return self.registration.showNotification(
            action === 'approve' ? 'Purchase Approved' : 'Purchase Declined',
            {
              body: action === 'approve' 
                ? 'The purchase has been approved.' 
                : 'The purchase has been declined.',
              icon: '/icon-192x192.png',
              tag: 'approval-result'
            }
          );
        }
      })
    );
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.openWindow('/parent-dashboard')
    );
  }
});
`;