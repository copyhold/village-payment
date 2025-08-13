import { useState, useEffect } from 'react'
import { useAuth } from '../auth-context'
import { InviteLink } from './InviteLink'
import { PushNotificationSettings } from './PushNotificationSettings'

interface FamilySettings {
  family_number: string | null
  surname: string | null
  default_limit: number
}

export function UserProfile() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<FamilySettings>({
    family_number: null,
    surname: null,
    default_limit: 50.00
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const [formData, setFormData] = useState({
    family_number: '',
    surname: '',
    default_limit: 50.00
  })

  useEffect(() => {
    fetchFamilySettings()
  }, [])

  const fetchFamilySettings = async () => {
    try {
      const response = await fetch('/api/family/settings', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setFormData({
          family_number: data.family_number || '',
          surname: data.surname || '',
          default_limit: data.default_limit
        })
      } else {
        setMessage({ type: 'error', text: 'Failed to load family settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading family settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleFamilySettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/family/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          family_number: formData.family_number,
          surname: formData.surname
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSettings(prev => ({
          ...prev,
          family_number: formData.family_number,
          surname: formData.surname
        }))
        setMessage({ type: 'success', text: 'Family settings updated successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update family settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating family settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleLimitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/family/limits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          default_limit: formData.default_limit
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSettings(prev => ({
          ...prev,
          default_limit: formData.default_limit
        }))
        setMessage({ type: 'success', text: 'Spending limit updated successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update spending limit' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating spending limit' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="text-gray-600 mt-2">Manage your family settings and preferences</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Family Settings */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Family Settings</h2>
            
            <form onSubmit={handleFamilySettingsSubmit} className="space-y-4">
              <div>
                <label htmlFor="family_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Family Number
                </label>
                <input
                  type="text"
                  id="family_number"
                  value={formData.family_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, family_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your family number"
                  required
                />
              </div>

              <div>
                <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-1">
                  Family Surname
                </label>
                <input
                  type="text"
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your family surname"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {saving ? 'Saving...' : 'Update Family Settings'}
              </button>
            </form>
          </div>

          {/* Spending Limits */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Spending Limits</h2>
            
            <form onSubmit={handleLimitSubmit} className="space-y-4">
              <div>
                <label htmlFor="default_limit" className="block text-sm font-medium text-gray-700 mb-1">
                  Default Spending Limit (₪)
                </label>
                <input
                  type="number"
                  id="default_limit"
                  value={formData.default_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_limit: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="50.00"
                  min="0"
                  step="0.01"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  This is the maximum amount that can be spent without requiring approval
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {saving ? 'Saving...' : 'Update Spending Limit'}
              </button>
            </form>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="mt-8">
          <PushNotificationSettings />
        </div>

        {/* Current Settings */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Settings</h2>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-blue-900">Family Number:</span>
                <span className="text-blue-700 ml-2">
                  {settings.family_number || 'Not set'}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Family Surname:</span>
                <span className="text-blue-700 ml-2">
                  {settings.surname || 'Not set'}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Default Limit:</span>
                <span className="text-blue-700 ml-2">
                  ₪{settings.default_limit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {settings.family_number && settings.surname && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Invite Family Members</h4>
              <p className="text-sm text-green-700 mb-3">
                Create an invite link to allow other devices to join your family. 
                They'll be able to receive notifications and approve payments.
              </p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Create Invite Link
              </button>
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <InviteLink onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  )
} 