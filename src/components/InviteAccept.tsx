import { useState, useEffect } from 'react'
import { useAuth } from '../auth-context'
import { startRegistration } from '@simplewebauthn/browser'

interface InviteAcceptProps {
  token: string
  onSuccess: () => void
  onError: (error: string) => void
}

interface InviteInfo {
  valid: boolean
  family_number: string
  surname: string
  expiresAt: number
}

export function InviteAccept({ token, onSuccess, onError }: InviteAcceptProps) {
  const { login } = useAuth()
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    validateInvite()
  }, [token])

  const validateInvite = async () => {
    try {
      const response = await fetch(`/api/invite/validate/${token}`)
      const data = await response.json()

      if (response.ok) {
        setInviteInfo(data)
      } else {
        setError(data.error || 'Invalid invite link')
        onError(data.error || 'Invalid invite link')
      }
    } catch (error) {
      setError('Failed to validate invite link')
      onError('Failed to validate invite link')
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError(null)

    try {
      const startResponse = await fetch('/api/invite/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, username: username.trim() })
      })

      const startData = await startResponse.json()

      if (!startResponse.ok) {
        throw new Error(startData.error || 'Failed to start registration')
      }

      const registrationOptions = startData

      const registrationResponse = await startRegistration(registrationOptions)

      const finishResponse = await fetch('/api/invite/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          response: registrationResponse
        })
      })

      const finishData = await finishResponse.json()

      if (!finishResponse.ok) {
        throw new Error(finishData.error || 'Failed to complete registration')
      }

      login(finishData.user, finishData.token)
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      setError(errorMessage)
      onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating invite link...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Invite Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!inviteInfo) {
    return null
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Family</h2>
          <p className="text-gray-600">You've been invited to join a family</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Family Information</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <div>
              <span className="font-medium">Family Number:</span> {inviteInfo.family_number}
            </div>
            <div>
              <span className="font-medium">Family Surname:</span> {inviteInfo.surname}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Choose Your Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your username"
              required
              minLength={3}
              maxLength={20}
            />
            <p className="text-sm text-gray-500 mt-1">
              This will be your unique username for this family
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? 'Setting up account...' : 'Join Family'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            You'll be asked to set up biometric authentication on your device
          </p>
        </div>
      </div>
    </div>
  )
}
