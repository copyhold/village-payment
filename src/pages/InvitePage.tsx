import { useState, useEffect } from 'react'
import { InviteAccept } from '../components/InviteAccept'
import { Link } from '@tanstack/react-router'

export function InvitePage() {
  const [token, setToken] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tokenParam = urlParams.get('token')
    setToken(tokenParam || undefined)
    
    if (!tokenParam) {
      setError('No invite token provided')
    }
  }, [])

  const handleSuccess = () => {
    setSuccess(true)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mb-4">
              <svg className="h-12 w-12 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Family!</h2>
            <p className="text-gray-600 mb-6">
              You've successfully joined the family. You can now receive notifications and approve payments.
            </p>
            <Link
              to="/"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mb-4">
              <svg className="h-12 w-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite Link</h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <Link
              to="/"
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite Link</h2>
            <p className="text-gray-600 mb-6">
              No invite token provided. Please check your invite link.
            </p>
            <Link
              to="/"
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <InviteAccept 
        token={token} 
        onSuccess={handleSuccess} 
        onError={handleError} 
      />
    </div>
  )
}
