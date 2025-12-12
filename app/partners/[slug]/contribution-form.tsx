'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ContributionFormProps {
  partnerSlug: string
  partnerName: string
}

export function ContributionForm({ partnerSlug, partnerName }: ContributionFormProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const amount = selectedAmount || parseInt(customAmount)
      if (!amount || amount < 100) {
        alert('Please enter a valid amount (minimum $1.00)')
        setLoading(false)
        return
      }

      const response = await fetch('/api/partners/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerSlug,
          amountCents: amount * 100,
          userEmail: email || undefined,
          userName: name || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(error instanceof Error ? error.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const presetAmounts = [
    { amount: 500, label: '$500', description: 'Helps secure 1/8 of an SUV.' },
    { amount: 1000, label: '$1,000', description: 'Helps secure 1/4 of an SUV + priority access for 1 event.' },
    { amount: 2000, label: '$2,000', description: 'Anchor Partner tier.' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preset Amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {presetAmounts.map((preset) => (
          <button
            key={preset.amount}
            type="button"
            onClick={() => {
              setSelectedAmount(preset.amount)
              setCustomAmount('')
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedAmount === preset.amount
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-lg mb-1">{preset.label}</div>
            <div className="text-sm text-gray-600">{preset.description}</div>
          </button>
        ))}
      </div>

      {/* Custom Amount */}
      <div>
        <Label htmlFor="custom-amount">Custom Amount</Label>
        <Input
          id="custom-amount"
          type="number"
          min="100"
          step="100"
          placeholder="Enter amount in dollars"
          value={customAmount}
          onChange={(e) => {
            setCustomAmount(e.target.value)
            setSelectedAmount(null)
          }}
          className="mt-2"
        />
      </div>

      {/* Optional: Email and Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Your Name (Optional)</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="email">Your Email (Optional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading || (!selectedAmount && !customAmount)}
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 py-6 text-lg"
      >
        {loading ? 'Processing...' : 'Continue to Secure Contribution'}
      </Button>
    </form>
  )
}


