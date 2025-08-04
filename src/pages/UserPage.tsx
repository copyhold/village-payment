import { useAuth } from '../auth-context'
import { Register } from '../components/Register'
import { Login } from '../components/Login'
import { Link } from '@tanstack/react-router'

export function UserPage() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="container mx-auto p-4">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">User Profile</h1>
              <p className="text-gray-600">Welcome, {user.username}!</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Username:</span> {user.username}
                  </div>
                  <div>
                    <span className="font-medium">User ID:</span> {user.id}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={logout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Logout
              </button>
              
              <Link
                to="/"
                className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="container mx-auto p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Authentication</h1>
          <p className="text-gray-600">Login or register to access the Village Payment Control System</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
            <Register />
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
            <Login onLoginSuccess={(user) => {
              window.location.reload()
            }} />
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
} 