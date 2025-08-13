import { PushSubscription, NotificationPayload } from '../types';

export class PushClient {
  private registration: ServiceWorkerRegistration | null = null;
  private publicKey: string | null = null;

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('Push notifications are not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);

      await this.loadPublicKey();
      return true;
    } catch (error) {
      console.error('Failed to register service worker:', error);
      return false;
    }
  }

  private async loadPublicKey(): Promise<void> {
    try {
      const response = await fetch('/api/push/public-key');
      const data = await response.json();
      this.publicKey = data.publicKey;
    } catch (error) {
      console.error('Failed to load VAPID public key:', error);
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.error('Notifications are not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    if (!this.registration || !this.publicKey) {
      console.error('Service worker or public key not available');
      return null;
    }

    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      console.error('Notification permission denied');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
      });

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      await this.sendSubscriptionToServer(userId, subscriptionData);
      return subscriptionData;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribeFromPush(subscriptionId: number): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ subscriptionId })
      });

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async getUserSubscriptions(): Promise<any[]> {
    try {
      const response = await fetch('/api/push/subscriptions', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.subscriptions || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get user subscriptions:', error);
      return [];
    }
  }

  async sendTestNotification(): Promise<boolean> {
    try {
      const response = await fetch('/api/push/send-test', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Test notification result:', data.message);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  async getNotificationSettings(): Promise<Record<string, string>> {
    try {
      const response = await fetch('/api/push/settings', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.settings || {};
      }
      return {};
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return {};
    }
  }

  async updateNotificationSetting(settingKey: string, settingValue: string): Promise<boolean> {
    try {
      const response = await fetch('/api/push/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ settingKey, settingValue })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      return false;
    }
  }

  private async sendSubscriptionToServer(userId: string, subscription: PushSubscription): Promise<void> {
    const userAgent = navigator.userAgent;
    const deviceName = this.getDeviceName();

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        subscription,
        userAgent,
        deviceName
      })
    });
  }

  private getDeviceName(): string {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'iOS Device';
    } else if (userAgent.includes('Android')) {
      return 'Android Device';
    } else if (userAgent.includes('Windows')) {
      return 'Windows Device';
    } else if (userAgent.includes('Mac')) {
      return 'Mac Device';
    } else if (userAgent.includes('Linux')) {
      return 'Linux Device';
    }
    
    return platform || 'Unknown Device';
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    const subscription = await this.registration.pushManager.getSubscription();
    return subscription !== null;
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      return null;
    }

    const subscription = await this.registration.pushManager.getSubscription();
    if (!subscription) {
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };
  }
}
