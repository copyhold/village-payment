import { Link } from '@tanstack/react-router'
import { useAuth } from '../auth-context'

export function HomePage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-center mb-8">Village Payment Control System</h1>
          
          {user && (
            <div className="text-center mb-8">
              <p className="text-lg text-gray-600">Welcome back, {user.username}!</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              to="/user"
              className="block p-6 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <h2 className="text-xl font-semibold text-blue-800 mb-2">User Management</h2>
              <p className="text-blue-600">
                {user ? 'View your profile and settings' : 'Login or register to get started'}
              </p>
            </Link>

            <Link
              to="/sell"
              className="block p-6 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
            >
              <h2 className="text-xl font-semibold text-green-800 mb-2">Vendor Interface</h2>
              <p className="text-green-600">
                Process payments and manage transactions
              </p>
            </Link>

            <div className="block p-6 bg-purple-50 rounded-lg border border-purple-200">
              <h2 className="text-xl font-semibold text-purple-800 mb-2">Family Dashboard</h2>
              <p className="text-purple-600">
                Monitor spending and approve requests
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500">
              Secure, family-controlled payment system for our village
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 