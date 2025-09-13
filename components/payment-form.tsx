"use client"

import type React from "react"

import { useState } from "react"

interface PaymentFormProps {
  onSubmit: (data: { phoneNumber: string; amount: string }) => Promise<void>
  isLoading?: boolean
}

export function PaymentForm({ onSubmit, isLoading = false }: PaymentFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [errors, setErrors] = useState<{ phoneNumber?: string; amount?: string }>({})

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\s+/g, "").replace(/^(\+|00)/, "")

    // Check for valid Kenyan formats:
    // 07XXXXXXXX (local format)
    // 254XXXXXXXXX (international without +)
    // 7XXXXXXXX (without country code or leading 0)
    const kenyanPhoneRegex = /^(254[17]\d{8}|0[17]\d{8}|[17]\d{8})$/
    return kenyanPhoneRegex.test(cleaned)
  }

  const formatPhoneNumber = (phone: string): string => {
    // Remove spaces, plus signs, and leading zeros from country codes
    const cleaned = phone.replace(/\s+/g, "").replace(/^(\+|00)/, "")

    // Handle different input formats
    if (cleaned.startsWith("07")) {
      // Convert 07XXXXXXXX to 254XXXXXXXXX
      return "254" + cleaned.substring(1)
    }
    if (cleaned.startsWith("01")) {
      // Convert 01XXXXXXXX to 254XXXXXXXXX
      return "254" + cleaned.substring(1)
    }
    if (cleaned.startsWith("254")) {
      // Already in correct format
      return cleaned
    }
    if (cleaned.length === 9 && (cleaned.startsWith("7") || cleaned.startsWith("1"))) {
      // Handle 7XXXXXXXX or 1XXXXXXXX format
      return "254" + cleaned
    }

    return cleaned
  }

  const validateAmount = (amt: string): boolean => {
    const numAmount = Number.parseFloat(amt)
    return !isNaN(numAmount) && numAmount >= 1 && numAmount <= 70000
  }

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value)
    if (errors.phoneNumber && validatePhoneNumber(value)) {
      setErrors((prev) => ({ ...prev, phoneNumber: undefined }))
    }
  }

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, "")
    setAmount(numericValue)
    if (errors.amount && validateAmount(numericValue)) {
      setErrors((prev) => ({ ...prev, amount: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: { phoneNumber?: string; amount?: string } = {}

    if (!validatePhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid Kenyan phone number"
    }

    if (!validateAmount(amount)) {
      newErrors.amount = "Amount must be between KES 1 and KES 70,000"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)
    await onSubmit({
      phoneNumber: formattedPhone,
      amount,
    })
  }

  const isFormValid = validatePhoneNumber(phoneNumber) && validateAmount(amount)

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Payment Summary Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-teal-100 rounded flex items-center justify-center">
            <div className="w-3 h-3 bg-teal-600 rounded"></div>
          </div>
          <h2 className="text-sm font-medium text-gray-700">Payment Summary</h2>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Amount</div>
          <div className="text-xl font-bold text-gray-900">KES {amount || "0"}</div>
        </div>
      </div>

      {/* Payment Channel Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-teal-100 rounded flex items-center justify-center">
            <div className="w-3 h-3 bg-teal-600 rounded"></div>
          </div>
          <h2 className="text-sm font-medium text-gray-700">
            Payment Channel <span className="text-red-500">*</span>
          </h2>
        </div>
        <div className="border-2 border-teal-500 rounded-lg p-3 bg-teal-50">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-teal-700">Bank</div>
            <div className="text-xs text-gray-600">Tithe & offering: NCBA BANK 663300226</div>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-6 flex flex-col flex-grow">
        {/* Phone Number Field */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Phone Number <span className="text-red-500">*</span>
            </span>
          </div>
          <input
            type="tel"
            placeholder="+254 700 000 000"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={`w-full text-sm text-gray-900 placeholder-gray-400 border-0 outline-none bg-transparent ${errors.phoneNumber ? "text-red-500" : ""}`}
            disabled={isLoading}
          />
          {errors.phoneNumber && <p className="text-xs text-red-500 mt-2">{errors.phoneNumber}</p>}
        </div>

        {/* Amount Field */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Amount (KES) <span className="text-red-500">*</span>
            </span>
          </div>
          <input
            type="text"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={`w-full text-sm text-gray-900 placeholder-gray-400 border-0 outline-none bg-transparent ${errors.amount ? "text-red-500" : ""}`}
            disabled={isLoading}
          />
          {errors.amount && <p className="text-xs text-red-500 mt-2">{errors.amount}</p>}
        </div>

        {/* Pay Button */}
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={`w-full py-4 rounded-lg text-sm font-medium transition-colors ${
            !isFormValid || isLoading
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-teal-600 text-white hover:bg-teal-700"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </div>
          ) : (
            "Pay Now (M-PESA)"
          )}
        </button>

        <div className="flex-grow"></div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Secured payment</span>
          </div>
          <div className="flex items-center gap-2 text-orange-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Report issue</span>
          </div>
        </div>
      </form>
    </div>
  )
}
