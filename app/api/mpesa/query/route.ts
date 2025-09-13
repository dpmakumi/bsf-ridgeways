import { type NextRequest, NextResponse } from "next/server"
import { MpesaAPI } from "@/lib/mpesa"
import { createClient } from "@/lib/supabase/server"

const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || "",
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
  businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE || "174379",
  passkey: process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
  callbackUrl:
    process.env.MPESA_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/mpesa/callback`,
  environment: (process.env.MPESA_ENVIRONMENT as "sandbox" | "production") || "sandbox",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { checkoutRequestId } = body

    if (!checkoutRequestId) {
      return NextResponse.json({ error: "Checkout request ID is required" }, { status: 400 })
    }

    // Initialize M-Pesa API
    const mpesa = new MpesaAPI(mpesaConfig)

    // Query STK Push status
    const queryResponse = await mpesa.stkQuery({
      checkoutRequestId,
    })

    // Get transaction from database
    const supabase = await createClient()
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("checkout_request_id", checkoutRequestId)
      .single()

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Update transaction status based on query result
    let status = "pending"
    let mpesaReceiptNumber = null

    if (queryResponse.ResultCode === "0") {
      status = "success"
      // In a real implementation, you'd extract the receipt number from the callback metadata
      mpesaReceiptNumber = "NLJ7RT61SV" // Placeholder
    } else if (queryResponse.ResultCode !== "1032") {
      // 1032 means request in progress
      status = "failed"
    }

    await supabase
      .from("transactions")
      .update({
        status,
        result_code: queryResponse.ResultCode,
        result_desc: queryResponse.ResultDesc,
        mpesa_receipt_number: mpesaReceiptNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)

    return NextResponse.json({
      success: true,
      status,
      resultCode: queryResponse.ResultCode,
      resultDesc: queryResponse.ResultDesc,
      mpesaReceiptNumber,
      transaction: {
        ...transaction,
        status,
        mpesa_receipt_number: mpesaReceiptNumber,
      },
    })
  } catch (error) {
    console.error("STK Query error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
