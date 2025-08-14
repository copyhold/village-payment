import { Hono } from 'hono';
import { Env } from '../env';
import { PushSubscription } from '../types';
import { jwtMiddleware } from '../middleware/jwt';

export function registerPushRoutes(app: Hono<{ Bindings: Env }>) {
  app.post('/api/push/subscribe', jwtMiddleware, async (c) => {
    try {
      const { subscription, userAgent, deviceName } = await c.req.json();
      
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return c.json({ error: 'Invalid subscription data' }, 400);
      }

      const isValid = await c.env.PUSH_SERVICE.validateSubscription(subscription);
      if (!isValid) {
        return c.json({ error: 'Invalid subscription' }, 400);
      }

      const jwtPayload = c.get('jwtPayload');
      const userId = jwtPayload?.sub;
      if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const subscriptionId = await c.env.PUSH_SERVICE.storeSubscription(
        userId,
        subscription,
        userAgent,
        deviceName
      );

      return c.json({
        success: true,
        subscriptionId,
        message: 'Successfully subscribed to push notifications'
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return c.json({ error: 'Failed to subscribe' }, 500);
    }
  });

  app.delete('/api/push/subscribe', jwtMiddleware, async (c) => {
    try {
      const { subscriptionId } = await c.req.json();
      
      if (!subscriptionId) {
        return c.json({ error: 'Subscription ID required' }, 400);
      }

      const jwtPayload = c.get('jwtPayload');
      const userId = jwtPayload?.sub;
      if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      await c.env.PUSH_SERVICE.deactivateSubscription(subscriptionId);

      return c.json({
        success: true,
        message: 'Successfully unsubscribed from push notifications'
      });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return c.json({ error: 'Failed to unsubscribe' }, 500);
    }
  });

  app.get('/api/push/public-key', async (c) => {
    return c.json({
      publicKey: c.env.VAPID_PUBLIC_KEY
    });
  });

  app.get('/api/push/subscriptions', jwtMiddleware, async (c) => {
    try {
      const jwtPayload = c.get('jwtPayload');
      const userId = jwtPayload?.sub;
      if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const subscriptions = await c.env.PUSH_SERVICE.getUserSubscriptions(userId);

      return c.json({
        success: true,
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          endpoint: sub.endpoint,
          deviceName: sub.device_name,
          userAgent: sub.user_agent,
          lastUsed: sub.last_used,
          createdAt: sub.created_at
        }))
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return c.json({ error: 'Failed to fetch subscriptions' }, 500);
    }
  });

  app.post('/api/push/send-test', jwtMiddleware, async (c) => {
    try {
      const jwtPayload = c.get('jwtPayload');
      const userId = jwtPayload?.sub;
      if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const subscriptions = await c.env.PUSH_SERVICE.getUserSubscriptions(userId);
      if (subscriptions.length === 0) {
        return c.json({ error: 'No active subscriptions found' }, 404);
      }

      const testPayload = {
        title: 'Test Notification',
        body: 'This is a test notification from VPCS',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { type: 'test' }
      };

      let successCount = 0;
      for (const subscription of subscriptions) {
        const success = await c.env.PUSH_SERVICE.sendNotification(
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

      return c.json({
        success: true,
        message: `Test notification sent to ${successCount}/${subscriptions.length} devices`
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      return c.json({ error: 'Failed to send test notification' }, 500);
    }
  });

  app.post('/api/push/respond/:transactionId', jwtMiddleware, async (c) => {
    try {
      const transactionId = c.req.param('transactionId');
      const { action, reason } = await c.req.json();
      
      if (!action || !['approve', 'decline'].includes(action)) {
        return c.json({ error: 'Invalid action' }, 400);
      }

      const jwtPayload = c.get('jwtPayload');
      const userId = jwtPayload?.sub;
      if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const now = new Date().toISOString();
      
      if (action === 'approve') {
        await c.env.DB.prepare(`
          UPDATE transactions 
          SET status = 'approved', approved_at = ?, approved_by_user_id = ?
          WHERE id = ? AND status = 'pending'
        `).bind(now, userId, transactionId).run();
      } else {
        await c.env.DB.prepare(`
          UPDATE transactions 
          SET status = 'declined', declined_at = ?, declined_by_user_id = ?, decline_reason = ?
          WHERE id = ? AND status = 'pending'
        `).bind(now, userId, reason || null, transactionId).run();
      }

      await c.env.DB.prepare(`
        UPDATE notification_log 
        SET responded_at = ?, response_action = ?
        WHERE transaction_id = ?
      `).bind(now, action, transactionId).run();

      const transaction = await c.env.DB.prepare(`
        SELECT * FROM transactions WHERE id = ?
      `).bind(transactionId).first<{
        family_number: string;
        amount: number;
        vendor_id: string;
      }>();

      if (transaction) {
        await c.env.PUSH_SERVICE.sendTransactionResult(
          parseInt(transactionId),
          transaction.family_number,
          transaction.amount,
          action === 'approve' ? 'approved' : 'declined',
          reason
        );
      }

      return c.json({
        success: true,
        message: `Transaction ${action}d successfully`
      });
    } catch (error) {
      console.error('Error responding to transaction:', error);
      return c.json({ error: 'Failed to respond to transaction' }, 500);
    }
  });

  app.get('/api/push/settings', jwtMiddleware, async (c) => {
    try {
      const jwtPayload = c.get('jwtPayload');
      const userId = jwtPayload?.sub;
      if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const settings = await c.env.PUSH_SERVICE.getUserNotificationSettings(userId);

      return c.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return c.json({ error: 'Failed to fetch settings' }, 500);
    }
  });

  app.put('/api/push/settings', jwtMiddleware, async (c) => {
    try {
      const jwtPayload = c.get('jwtPayload');
      const userId = jwtPayload?.sub;
      if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const { settingKey, settingValue } = await c.req.json();
      
      if (!settingKey || settingValue === undefined) {
        return c.json({ error: 'Setting key and value required' }, 400);
      }

      await c.env.PUSH_SERVICE.updateUserNotificationSetting(userId, settingKey, settingValue);

      return c.json({
        success: true,
        message: 'Setting updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return c.json({ error: 'Failed to update settings' }, 500);
    }
  });

  app.get('/api/push/status/:subscriptionId', async (c) => {
    try {
      const subscriptionId = c.req.param('subscriptionId');
      
      const subscription = await c.env.DB.prepare(`
        SELECT * FROM push_subscriptions WHERE id = ?
      `).bind(subscriptionId).first<{
        is_active: boolean;
        last_used: string;
      }>();

      if (!subscription) {
        return c.json({ error: 'Subscription not found' }, 404);
      }

      return c.json({
        success: true,
        isActive: subscription.is_active,
        lastUsed: subscription.last_used
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return c.json({ error: 'Failed to check status' }, 500);
    }
  });
}
