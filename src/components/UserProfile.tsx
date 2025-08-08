import { useState, useEffect } from 'react'
import { useAuth } from '../auth-context'
import { InviteLink } from './InviteLink'

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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">User Profile</h1>
        
        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Username:</span> {user?.username}
              </div>
              <div>
                <span className="font-medium">User ID:</span> {user?.id}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Settings</h3>
            
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

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Limits</h3>
            
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

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Settings</h3>
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
      </div>

      {showInviteModal && (
        <InviteLink onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  )
} 