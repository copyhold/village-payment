import { Link } from '@tanstack/react-router'
import { useAuth } from '../auth-context'

export function Navigation() {
  const { user } = useAuth()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="flex-shrink-0 flex items-center text-xl font-bold text-gray-900"
            >
              VPCS
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Home
            </Link>
            
            <Link
              to="/user"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              {user ? 'Profile' : 'Login'}
            </Link>
            
            <Link
              to="/sell"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Vendor
            </Link>

            {user && (
              <div className="text-sm text-gray-500">
                {user.username}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 