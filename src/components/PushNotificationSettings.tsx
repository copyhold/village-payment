import { useState, useEffect } from 'react'
import { useAuth } from '../auth-context'
import { PushClient } from '../services/push-client'

interface Subscription {
  id: number
  endpoint: string
  deviceName: string
  userAgent: string
  lastUsed: string
  createdAt: string
}

interface NotificationSettings {
  transaction_approvals: string
  daily_summaries: string
  limit_alerts: string
  quiet_hours_start: string
  quiet_hours_end: string
}

export function PushNotificationSettings() {
  const { user } = useAuth()
  const [pushClient, setPushClient] = useState<PushClient | null>(null)
  const [isSupported, setIsSupported] = useState<boolean>(true)
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    transaction_approvals: 'true',
    daily_summaries: 'false',
    limit_alerts: 'true',
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (user) {
      initializePushNotifications()
    }
  }, [user])

  const initializePushNotifications = async () => {
    try {
      const client = new PushClient()
      const initialized = await client.initialize()
      
      if (!initialized) {
        setIsSupported(false)
        setLoading(false)
        return
      }

      setPushClient(client)
      
      const subscribed = await client.isSubscribed()
      setIsSubscribed(subscribed)
      
      if (subscribed) {
        await loadSubscriptions()
      }
      
      await loadSettings()
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
      setIsSupported(false)
    } finally {
      setLoading(false)
    }
  }

  const loadSubscriptions = async () => {
    if (!pushClient) return
    
    try {
      const subs = await pushClient.getUserSubscriptions()
      setSubscriptions(subs)
    } catch (error) {
      console.error('Failed to load subscriptions:', error)
    }
  }

  const loadSettings = async () => {
    if (!pushClient) return
    
    try {
      const userSettings = await pushClient.getNotificationSettings()
      setSettings(prev => ({
        ...prev,
        ...userSettings
      }))
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    }
  }

  const handleSubscribe = async () => {
    if (!pushClient || !user) return
    
    setSaving(true)
    setMessage(null)

    try {
      const subscription = await pushClient.subscribeToPush(user.id)
      
      if (subscription) {
        setIsSubscribed(true)
        await loadSubscriptions()
        setMessage({ type: 'success', text: 'Successfully subscribed to push notifications!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to subscribe to push notifications' })
      }
    } catch (error) {
      console.error('Subscription error:', error)
      setMessage({ type: 'error', text: 'Error subscribing to push notifications' })
    } finally {
      setSaving(false)
    }
  }

  const handleUnsubscribe = async (subscriptionId: number) => {
    if (!pushClient) return
    
    setSaving(true)
    setMessage(null)

    try {
      const success = await pushClient.unsubscribeFromPush(subscriptionId)
      
      if (success) {
        await loadSubscriptions()
        const remainingSubs = subscriptions.filter(sub => sub.id !== subscriptionId)
        if (remainingSubs.length === 0) {
          setIsSubscribed(false)
        }
        setMessage({ type: 'success', text: 'Successfully unsubscribed from push notifications' })
      } else {
        setMessage({ type: 'error', text: 'Failed to unsubscribe from push notifications' })
      }
    } catch (error) {
      console.error('Unsubscription error:', error)
      setMessage({ type: 'error', text: 'Error unsubscribing from push notifications' })
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!pushClient) return
    
    setSaving(true)
    setMessage(null)

    try {
      const success = await pushClient.sendTestNotification()
      
      if (success) {
        setMessage({ type: 'success', text: 'Test notification sent successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to send test notification' })
      }
    } catch (error) {
      console.error('Test notification error:', error)
      setMessage({ type: 'error', text: 'Error sending test notification' })
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = async (settingKey: keyof NotificationSettings, value: string) => {
    if (!pushClient) return
    
    setSaving(true)
    setMessage(null)

    try {
      const success = await pushClient.updateNotificationSetting(settingKey, value)
      
      if (success) {
        setSettings(prev => ({ ...prev, [settingKey]: value }))
        setMessage({ type: 'success', text: 'Setting updated successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to update setting' })
      }
    } catch (error) {
      console.error('Setting update error:', error)
      setMessage({ type: 'error', text: 'Error updating setting' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-yellow-800">
            Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
      
      {message && (
        <div className={`p-4 rounded-lg mb-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Subscription Status */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Subscription Status</h4>
          
          {!isSubscribed ? (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 mb-3">
                Enable push notifications to receive real-time alerts for purchase approvals and other important updates.
              </p>
              <button
                onClick={handleSubscribe}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {saving ? 'Subscribing...' : 'Enable Push Notifications'}
              </button>
            </div>
          ) : (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-800 mb-3">
                ✅ Push notifications are enabled. You'll receive alerts for purchase approvals and other updates.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleSendTest}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {saving ? 'Sending...' : 'Send Test Notification'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active Subscriptions */}
        {subscriptions.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Active Devices</h4>
            <div className="space-y-2">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{subscription.deviceName}</div>
                    <div className="text-sm text-gray-500">
                      Last used: {new Date(subscription.lastUsed).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnsubscribe(subscription.id)}
                    disabled={saving}
                    className="text-red-600 hover:text-red-800 disabled:text-red-400 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notification Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Notification Preferences</h4>
          
          <div className="space-y-4">
            {/* Transaction Approvals */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Purchase Approval Requests</div>
                <div className="text-sm text-gray-500">Receive notifications when approval is needed for purchases</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.transaction_approvals === 'true'}
                  onChange={(e) => handleSettingChange('transaction_approvals', e.target.checked ? 'true' : 'false')}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Daily Summaries */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Daily Spending Summaries</div>
                <div className="text-sm text-gray-500">Receive daily summaries of family spending</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.daily_summaries === 'true'}
                  onChange={(e) => handleSettingChange('daily_summaries', e.target.checked ? 'true' : 'false')}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Limit Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Spending Limit Alerts</div>
                <div className="text-sm text-gray-500">Receive alerts when approaching spending limits</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.limit_alerts === 'true'}
                  onChange={(e) => handleSettingChange('limit_alerts', e.target.checked ? 'true' : 'false')}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Quiet Hours</h4>
          <p className="text-sm text-gray-500 mb-3">
            Set times when you don't want to receive notifications (except urgent approval requests)
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={settings.quiet_hours_start}
                onChange={(e) => handleSettingChange('quiet_hours_start', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={settings.quiet_hours_end}
                onChange={(e) => handleSettingChange('quiet_hours_end', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
