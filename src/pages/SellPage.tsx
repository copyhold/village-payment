import { useAuth } from '../auth-context'
import { PaymentRequestForm } from '../components/PaymentRequestForm'
import { TransactionHistory } from '../components/TransactionHistory'

export function SellPage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="container mx-auto p-4">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-yellow-800 mb-2">Authentication Required</h2>
                <p className="text-yellow-600">
                  Please log in to access the vendor interface.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Vendor Interface</h1>
          <p className="text-gray-600">Process payments and manage transactions</p>
          <div className="text-sm text-gray-500 mt-2">
            Logged in as: {user.username}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Payment Request</h2>
            <PaymentRequestForm />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Transactions</h2>
            <TransactionHistory />
          </div>
        </div>
      </div>
    </div>
  )
} 