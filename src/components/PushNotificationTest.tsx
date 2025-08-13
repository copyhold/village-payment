import { useState } from 'react'
import { PushClient } from '../services/push-client'

export function PushNotificationTest() {
  const [pushClient, setPushClient] = useState<PushClient | null>(null)
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const initializePush = async () => {
    setLoading(true)
    setStatus('Initializing push notifications...')
    
    try {
      const client = new PushClient()
      const initialized = await client.initialize()
      
      if (initialized) {
        setPushClient(client)
        setStatus('Push notifications initialized successfully!')
      } else {
        setStatus('Failed to initialize push notifications')
      }
    } catch (error) {
      console.error('Push initialization error:', error)
      setStatus('Error initializing push notifications')
    } finally {
      setLoading(false)
    }
  }

  const testSubscription = async () => {
    if (!pushClient) {
      setStatus('Please initialize push notifications first')
      return
    }

    setLoading(true)
    setStatus('Testing subscription...')
    
    try {
      const isSubscribed = await pushClient.isSubscribed()
      setStatus(`Subscription status: ${isSubscribed ? 'Subscribed' : 'Not subscribed'}`)
    } catch (error) {
      console.error('Subscription test error:', error)
      setStatus('Error testing subscription')
    } finally {
      setLoading(false)
    }
  }

  const testNotification = async () => {
    if (!pushClient) {
      setStatus('Please initialize push notifications first')
      return
    }

    setLoading(true)
    setStatus('Sending test notification...')
    
    try {
      const success = await pushClient.sendTestNotification()
      setStatus(success ? 'Test notification sent successfully!' : 'Failed to send test notification')
    } catch (error) {
      console.error('Test notification error:', error)
      setStatus('Error sending test notification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notification Test</h3>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={initializePush}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? 'Initializing...' : 'Initialize Push Notifications'}
          </button>
        </div>

        <div>
          <button
            onClick={testSubscription}
            disabled={loading || !pushClient}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Test Subscription Status
          </button>
        </div>

        <div>
          <button
            onClick={testNotification}
            disabled={loading || !pushClient}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Send Test Notification
          </button>
        </div>

        {status && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{status}</p>
          </div>
        )}
      </div>
    </div>
  )
}
