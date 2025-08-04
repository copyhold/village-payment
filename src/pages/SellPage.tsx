import { useAuth } from '../auth-context'
import { Link } from '@tanstack/react-router'

export function SellPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Vendor Interface</h1>
            <p className="text-gray-600">Process payments and manage transactions</p>
          </div>

          {user ? (
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-blue-800 mb-2">Coming Soon</h2>
                <p className="text-blue-600">
                  The vendor interface is under development. You'll be able to process payments here soon.
                </p>
              </div>
              
              <div className="text-sm text-gray-500 mb-6">
                Logged in as: {user.username}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-yellow-800 mb-2">Authentication Required</h2>
                <p className="text-yellow-600">
                  Please log in to access the vendor interface.
                </p>
              </div>
            </div>
          )}

          <div className="text-center">
            <Link
              to="/"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 