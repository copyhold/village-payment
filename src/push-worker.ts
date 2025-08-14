import { WorkerEntrypoint } from "cloudflare:workers";
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { Env, PushSubscription, PushSubscriptionRecord, NotificationTemplate, NotificationPayload, NotificationLogRecord } from './types';

export default class PushService extends WorkerEntrypoint {
  async validateSubscription(subscription: PushSubscription): Promise<boolean> {
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return false;
    }

    try {
      await buildPushPayload({
        data: "test",
        options: { ttl: 60 }
      }, subscription, {
        subject: this.env.VAPID_SUBJECT,
        publicKey: this.env.VAPID_PUBLIC_KEY,
        privateKey: this.env.VAPID_PRIVATE_KEY
      });
      return true;
    } catch (error) {
      console.error('Subscription validation failed:', error);
      return false;
    }
  }

  async storeSubscription(
    userId: string, 
    subscription: PushSubscription, 
    userAgent?: string,
    deviceName?: string
  ): Promise<number> {
    const result = await this.env.DB.prepare(`
      INSERT INTO push_subscriptions (
        user_id, endpoint, p256dh_key, auth_key, user_agent, device_name
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      userAgent || null,
      deviceName || null
    ).run();

    return result.meta.last_row_id as number;
  }

  async updateSubscriptionLastUsed(subscriptionId: number): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE push_subscriptions 
      SET last_used = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(subscriptionId).run();
  }

  async deactivateSubscription(subscriptionId: number): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE push_subscriptions 
      SET is_active = FALSE 
      WHERE id = ?
    `).bind(subscriptionId).run();
  }

  async getFamilySubscriptions(familyNumber: string): Promise<PushSubscriptionRecord[]> {
    const result = await this.env.DB.prepare(`
      SELECT ps.* 
      FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.family_number = ? AND ps.is_active = TRUE
    `).bind(familyNumber).all<PushSubscriptionRecord>();

    return result.results;
  }

  async getUserSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM push_subscriptions 
      WHERE user_id = ? AND is_active = TRUE
    `).bind(userId).all<PushSubscriptionRecord>();

    return result.results;
  }

  async getNotificationTemplate(templateKey: string): Promise<NotificationTemplate | null> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM notification_templates 
      WHERE template_key = ?
    `).bind(templateKey).first<NotificationTemplate>();

    return result || null;
  }

  async renderTemplate(template: NotificationTemplate, variables: Record<string, any>): Promise<NotificationPayload> {
    let title = template.title_template;
    let body = template.body_template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return {
      title,
      body,
      icon: template.icon_url,
      badge: template.badge_url
    };
  }

  async sendNotification(
    subscription: PushSubscription, 
    payload: NotificationPayload,
    subscriptionId?: number
  ): Promise<boolean> {
    try {
      const webPushPayload = await buildPushPayload({
        data: JSON.stringify(payload),
        options: { ttl: 300 }
      }, subscription, {
        subject: this.env.VAPID_SUBJECT,
        publicKey: this.env.VAPID_PUBLIC_KEY,
        privateKey: this.env.VAPID_PRIVATE_KEY
      });

      const response = await fetch(subscription.endpoint, webPushPayload);

      if (response.ok) {
        if (subscriptionId) {
          await this.updateSubscriptionLastUsed(subscriptionId);
        }
        return true;
      } else if ([401, 403, 404, 410].includes(response.status)) {
        if (subscriptionId) {
          await this.deactivateSubscription(subscriptionId);
        }
        return false;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  async logNotificationDelivery(
    transactionId: number,
    subscriptionId: number,
    subscriptionEndpoint: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    
    if (success) {
      await this.env.DB.prepare(`
        INSERT INTO notification_log (
          transaction_id, subscription_id, subscription_endpoint, 
          sent_at, delivered_at
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(transactionId, subscriptionId, subscriptionEndpoint, now, now).run();
    } else {
      await this.env.DB.prepare(`
        INSERT INTO notification_log (
          transaction_id, subscription_id, subscription_endpoint, 
          sent_at, failed_at, error_message
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(transactionId, subscriptionId, subscriptionEndpoint, now, now, errorMessage).run();
    }
  }

  async sendTransactionApproval(
    transactionId: number,
    familyNumber: string,
    vendorName: string,
    amount: number,
    description?: string
  ): Promise<boolean> {
    const subscriptions = await this.getFamilySubscriptions(familyNumber);
    if (subscriptions.length === 0) {
      return false;
    }

    const template = await this.getNotificationTemplate('transaction_approval');
    if (!template) {
      console.error('Transaction approval template not found');
      return false;
    }

    const payload = await this.renderTemplate(template, {
      vendor_name: vendorName,
      amount: `$${amount.toFixed(2)}`
    });

    const enhancedPayload: NotificationPayload = {
      ...payload,
      data: {
        transactionId,
        type: 'transaction_approval',
        amount,
        vendorName,
        description
      },
      actions: [
        { action: 'approve', title: '✅ Approve' },
        { action: 'decline', title: '❌ Decline' }
      ],
      requireInteraction: true,
      tag: `transaction-${transactionId}`
    };

    let successCount = 0;
    for (const subscription of subscriptions) {
      const success = await this.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        },
        enhancedPayload,
        subscription.id
      );

      await this.logNotificationDelivery(
        transactionId,
        subscription.id,
        subscription.endpoint,
        success
      );

      if (success) successCount++;
    }

    return successCount > 0;
  }

  async sendTransactionResult(
    transactionId: number,
    familyNumber: string,
    amount: number,
    action: 'approved' | 'declined',
    reason?: string
  ): Promise<boolean> {
    const subscriptions = await this.getFamilySubscriptions(familyNumber);
    if (subscriptions.length === 0) {
      return false;
    }

    const templateKey = action === 'approved' ? 'transaction_approved' : 'transaction_declined';
    const template = await this.getNotificationTemplate(templateKey);
    if (!template) {
      console.error(`${templateKey} template not found`);
      return false;
    }

    const payload = await this.renderTemplate(template, {
      amount: `$${amount.toFixed(2)}`
    });

    const enhancedPayload: NotificationPayload = {
      ...payload,
      data: {
        transactionId,
        type: 'transaction_result',
        action,
        amount,
        reason
      },
      tag: `transaction-result-${transactionId}`
    };

    let successCount = 0;
    for (const subscription of subscriptions) {
      const success = await this.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        },
        enhancedPayload,
        subscription.id
      );

      if (success) successCount++;
    }

    return successCount > 0;
  }

  async getUserNotificationSettings(userId: string): Promise<Record<string, string>> {
    const result = await this.env.DB.prepare(`
      SELECT setting_key, setting_value 
      FROM push_notification_settings 
      WHERE user_id = ?
    `).bind(userId).all<{ setting_key: string; setting_value: string }>();

    const settings: Record<string, string> = {};
    for (const row of result.results) {
      settings[row.setting_key] = row.setting_value;
    }

    return settings;
  }

  async updateUserNotificationSetting(
    userId: string,
    settingKey: string,
    settingValue: string
  ): Promise<void> {
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO push_notification_settings (
        user_id, setting_key, setting_value, updated_at
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(userId, settingKey, settingValue).run();
  }

  async shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
    const settings = await this.getUserNotificationSettings(userId);
    
    const settingKey = `${notificationType}_enabled`;
    const enabled = settings[settingKey];
    
    if (enabled === 'false') {
      return false;
    }

    const quietHoursStart = settings.quiet_hours_start || '22:00';
    const quietHoursEnd = settings.quiet_hours_end || '08:00';
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (startTime > endTime) {
      return currentTime < startTime && currentTime > endTime;
    } else {
      return currentTime < startTime || currentTime > endTime;
    }
  }

  async sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    const subscriptions = await this.getUserSubscriptions(userId);
    if (subscriptions.length === 0) {
      return { success: false, message: 'No active subscriptions found' };
    }

    const testPayload: NotificationPayload = {
      title: 'Test Notification',
      body: 'This is a test notification from VPCS',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: { type: 'test' }
    };

    let successCount = 0;
    for (const subscription of subscriptions) {
      const success = await this.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        },
        testPayload,
        subscription.id
      );
      if (success) successCount++;
    }

    return {
      success: successCount > 0,
      message: `Test notification sent to ${successCount}/${subscriptions.length} devices`
    };
  }

  async getSubscriptionStatus(subscriptionId: number): Promise<{ isActive: boolean; lastUsed: string | null }> {
    const subscription = await this.env.DB.prepare(`
      SELECT is_active, last_used FROM push_subscriptions WHERE id = ?
    `).bind(subscriptionId).first<{
      is_active: boolean;
      last_used: string | null;
    }>();

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return {
      isActive: subscription.is_active,
      lastUsed: subscription.last_used
    };
  }

  async fetch() {
    return new Response("Hello from push worker");
  } 
}
