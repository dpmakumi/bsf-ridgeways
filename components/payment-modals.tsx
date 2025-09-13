"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, Smartphone } from "lucide-react"

interface ProcessingModalProps {
  isOpen: boolean
  phoneNumber: string
}

export function ProcessingModal({ isOpen, phoneNumber }: ProcessingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Processing Payment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-6">
          <div className="relative">
            <Smartphone className="h-16 w-16 text-primary" />
            <Loader2 className="h-6 w-6 animate-spin absolute -top-1 -right-1 text-accent" />
          </div>
          <div className="text-center space-y-2">
            <p className="font-medium">Check your phone</p>
            <p className="text-sm text-muted-foreground">
              We've sent an M-PESA prompt to <br />
              <span className="font-medium">{phoneNumber}</span>
            </p>
            <p className="text-xs text-muted-foreground">Enter your M-PESA PIN to complete the payment</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  transactionData: {
    amount: string
    phoneNumber: string
    reference?: string
    mpesaReceiptNumber?: string
  }
}

export function SuccessModal({ isOpen, onClose, transactionData }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-green-600">Payment Successful!</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">KES {transactionData.amount}</p>
            <p className="text-sm text-muted-foreground">Paid from {transactionData.phoneNumber}</p>
            {transactionData.mpesaReceiptNumber && (
              <p className="text-xs text-muted-foreground">Receipt: {transactionData.mpesaReceiptNumber}</p>
            )}
            {transactionData.reference && (
              <p className="text-xs text-muted-foreground">Reference: {transactionData.reference}</p>
            )}
          </div>
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  error: string
  onRetry?: () => void
}

export function ErrorModal({ isOpen, onClose, error, onRetry }: ErrorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-destructive">Payment Failed</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-6">
          <XCircle className="h-16 w-16 text-destructive" />
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex gap-2 w-full">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="flex-1 bg-transparent">
                Try Again
              </Button>
            )}
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
