import { useState, useEffect } from 'react'
import { useAuth } from '../auth-context'

interface PaymentRequest {
  familyNumber: string
  surname: string
  amount: number
  description: string
}

interface FamilyInfo {
  surname: string
  limit: number
}

export function PaymentRequestForm() {
  const { user } = useAuth()
  const [formData, setFormData] = useState<PaymentRequest>({
    familyNumber: '',
    surname: '',
    amount: 0,
    description: ''
  })
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFamilyNumberBlur = async () => {
    if (!formData.familyNumber.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/vendor/family-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          family_number: formData.familyNumber,
          vendor_id: user?.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setFamilyInfo(data)
        if (data.surname && !formData.surname) {
          setFormData(prev => ({ ...prev, surname: data.surname }))
        }
      } else if (response.status === 404) {
        setFamilyInfo(null)
        setMessage({ type: 'error', text: 'Family not found' })
      }
    } catch (error) {
      console.error('Error fetching family info:', error)
      setMessage({ type: 'error', text: 'Failed to fetch family information' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/vendor/payment-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          family_number: formData.familyNumber,
          surname: formData.surname,
          amount: formData.amount,
          description: formData.description
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Payment request submitted successfully!' })
        setFormData({
          familyNumber: '',
          surname: '',
          amount: 0,
          description: ''
        })
        setFamilyInfo(null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit payment request' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="familyNumber" className="block text-sm font-medium text-gray-700 mb-2">
          Family Number *
        </label>
        <input
          type="text"
          id="familyNumber"
          required
          value={formData.familyNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, familyNumber: e.target.value }))}
          onBlur={handleFamilyNumberBlur}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter family number"
        />
        {isLoading && (
          <div className="mt-1 text-sm text-gray-500">Searching for family...</div>
        )}
      </div>

      <div>
        <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">
          Surname *
        </label>
        <input
          type="text"
          id="surname"
          required
          value={formData.surname}
          onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter family surname"
        />
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Amount *
        </label>
        <input
          type="number"
          id="amount"
          required
          min="0"
          step="0.01"
          value={formData.amount || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="0.00"
        />
        {familyInfo && (
          <div className="mt-1 text-sm text-gray-600">
            Family limit: ${familyInfo.limit.toFixed(2)}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <input
          type="text"
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Brief description of the purchase"
        />
      </div>

      {message && (
        <div className={`p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Payment Request'}
      </button>
    </form>
  )
} 