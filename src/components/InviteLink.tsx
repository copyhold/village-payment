import { useState } from 'react'

interface InviteLinkProps {
  onClose: () => void
}

export function InviteLink({ onClose }: InviteLinkProps) {
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInvite = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/invite/create', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setInviteUrl(data.inviteUrl)
      } else {
        setError(data.error || 'Failed to create invite link')
      }
    } catch (error) {
      setError('Error creating invite link')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      setError('Failed to copy to clipboard')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Invite Link</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {!inviteUrl ? (
          <div>
            <p className="text-gray-600 mb-4">
              Create an invite link to allow another device to join your family. 
              The link will expire in 24 hours and can only be used once.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={createInvite}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {loading ? 'Creating...' : 'Create Invite Link'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Share this link with someone to invite them to join your family:
            </p>
            
            <div className="mb-4">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-md mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This link will expire in 24 hours and can only be used once.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
