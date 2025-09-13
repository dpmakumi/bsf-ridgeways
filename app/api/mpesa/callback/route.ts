import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] M-Pesa Callback received:", JSON.stringify(body, null, 2))

    // Extract callback data
    const { Body } = body
    const { stkCallback } = Body

    if (!stkCallback) {
      return NextResponse.json({ error: "Invalid callback format" }, { status: 400 })
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    // Initialize Supabase client
    const supabase = await createClient()

    // Find the transaction
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .single()

    if (!transaction) {
      console.error("[v0] Transaction not found for CheckoutRequestID:", CheckoutRequestID)
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Determine transaction status
    let status = "failed"
    let mpesaReceiptNumber = null

    if (ResultCode === 0) {
      status = "success"

      // Extract M-Pesa receipt number from callback metadata
      if (CallbackMetadata && CallbackMetadata.Item) {
        const receiptItem = CallbackMetadata.Item.find((item: any) => item.Name === "MpesaReceiptNumber")
        if (receiptItem) {
          mpesaReceiptNumber = receiptItem.Value
        }
      }
    }

    // Update transaction in database
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status,
        result_code: ResultCode.toString(),
        result_desc: ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)

    if (updateError) {
      console.error("[v0] Failed to update transaction:", updateError)
      return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
    }

    console.log(`[v0] Transaction ${transaction.id} updated to status: ${status}`)

    // Return success response to Safaricom
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    })
  } catch (error) {
    console.error("[v0] Callback processing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
