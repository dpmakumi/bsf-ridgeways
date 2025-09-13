"use client"

import { useState } from "react"
import { PaymentForm } from "@/components/payment-form"
import { ProcessingModal, SuccessModal, ErrorModal } from "@/components/payment-modals"

type PaymentStatus = "idle" | "processing" | "success" | "error"

interface TransactionResult {
  success: boolean
  data?: {
    amount: string
    phoneNumber: string
    reference?: string
    mpesaReceiptNumber?: string
  }
  error?: string
}

export default function HomePage() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [currentTransaction, setCurrentTransaction] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>("")

  const handlePayment = async (paymentData: { phoneNumber: string; amount: string; reference?: string }) => {
    setPaymentStatus("processing")
    setCurrentTransaction(paymentData)

    try {
      console.log("[v0] Initiating M-Pesa payment:", paymentData)

      const response = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      })

      const result = await response.json()

      const isSuccessfulInitiation =
        response.ok && (result.success || (result.responseCode && result.responseCode === "1032"))

      if (!isSuccessfulInitiation) {
        throw new Error(result.error || result.responseDescription || "Payment initiation failed")
      }

      if (result.success) {
        setCheckoutRequestId(result.checkoutRequestId)

        const pollPaymentStatus = async () => {
          let attempts = 0
          const maxAttempts = 60 // Poll for up to 10 minutes (60 * 10 seconds)

          const poll = async () => {
            try {
              const queryResponse = await fetch("/api/mpesa/query", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ checkoutRequestId: result.checkoutRequestId }),
              })

              const queryResult = await queryResponse.json()

              if (queryResult.success) {
                if (queryResult.status === "success") {
                  setPaymentStatus("success")
                  setCurrentTransaction({
                    ...paymentData,
                    mpesaReceiptNumber: queryResult.mpesaReceiptNumber,
                  })
                  return
                } else if (queryResult.status === "failed") {
                  setPaymentStatus("error")
                  setError(queryResult.resultDesc || "Payment failed")
                  return
                }
              }

              attempts++
              if (attempts < maxAttempts) {
                setTimeout(poll, 10000) // Poll every 10 seconds
              } else {
                setPaymentStatus("error")
                setError("Payment timeout after 10 minutes. Please check your M-Pesa messages or try again.")
              }
            } catch (err) {
              console.error("[v0] Polling error:", err)
              attempts++
              if (attempts < maxAttempts) {
                setTimeout(poll, 10000)
              } else {
                setPaymentStatus("error")
                setError("Unable to verify payment status. Please contact support.")
              }
            }
          }

          // Start polling after 5 seconds
          setTimeout(poll, 5000)
        }

        pollPaymentStatus()
      } else {
        setPaymentStatus("error")
        setError(result.error || "Payment failed. Please try again.")
      }
    } catch (err) {
      console.error("[v0] Payment error:", err)
      setPaymentStatus("error")
      setError(err instanceof Error ? err.message : "Network error. Please check your connection and try again.")
    }
  }

  const handleCloseSuccess = () => {
    setPaymentStatus("idle")
    setCurrentTransaction(null)
    setCheckoutRequestId("")
  }

  const handleCloseError = () => {
    setPaymentStatus("idle")
    setError("")
    setCheckoutRequestId("")
  }

  const handleRetry = () => {
    setPaymentStatus("idle")
    setError("")
    setCheckoutRequestId("")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* LipaLink Branding */}
      <div className="bg-white px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 3L4 14h7v7l9-11h-7V3z" />
          </svg>
          <span>Powered by LipaLink</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        <PaymentForm onSubmit={handlePayment} isLoading={paymentStatus === "processing"} />
      </div>

      <ProcessingModal isOpen={paymentStatus === "processing"} phoneNumber={currentTransaction?.phoneNumber || ""} />

      <SuccessModal
        isOpen={paymentStatus === "success"}
        onClose={handleCloseSuccess}
        transactionData={currentTransaction || {}}
      />

      <ErrorModal isOpen={paymentStatus === "error"} onClose={handleCloseError} error={error} onRetry={handleRetry} />
    </div>
  )
}
