import { useState, useEffect } from 'react'
import { useAuth } from '../auth-context'

interface Transaction {
  id: string
  time: string
  familyNumber: string
  surname: string
  amount: number
  status: 'pending' | 'approved' | 'declined' | 'auto_approved'
  description?: string
}

type SortField = 'time' | 'familyNumber'
type SortDirection = 'asc' | 'desc'

export function TransactionHistory() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const fetchTransactions = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/vendor/history?vendorId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      } else {
        console.error('Failed to fetch transactions:', response.status)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [user])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    if (sortField === 'time') {
      aValue = new Date(a.time).getTime()
      bValue = new Date(b.time).getTime()
    } else {
      aValue = a.familyNumber
      bValue = b.familyNumber
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'auto_approved':
        return 'text-green-600 bg-green-100'
      case 'declined':
        return 'text-red-600 bg-red-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Last Hour Transactions</h3>
        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Reload'}
        </button>
      </div>

      {isLoading && transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No transactions found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Time</span>
                    {sortField === 'time' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('familyNumber')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Number</span>
                    {sortField === 'familyNumber' && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Family Surname
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(transaction.time)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.familyNumber}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.surname}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatAmount(transaction.amount)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 