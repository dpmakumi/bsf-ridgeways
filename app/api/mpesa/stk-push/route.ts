import { type NextRequest, NextResponse } from "next/server"
import { MpesaAPI } from "@/lib/mpesa"
import { createClient } from "@/lib/supabase/server"

// M-Pesa configuration - these should be environment variables
const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || "",
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
  businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE || "174379", // Sandbox shortcode
  passkey: process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919", // Sandbox passkey
  callbackUrl:
    process.env.MPESA_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/mpesa/callback`,
  environment: (process.env.MPESA_ENVIRONMENT as "sandbox" | "production") || "sandbox",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, amount } = body

    // Validate input
    if (!phoneNumber || !amount) {
      return NextResponse.json({ error: "Phone number and amount are required" }, { status: 400 })
    }

    // Validate amount range (KES 1 - 70,000)
    const numAmount = Number.parseFloat(amount)
    if (numAmount < 1 || numAmount > 70000) {
      return NextResponse.json({ error: "Amount must be between KES 1 and KES 70,000" }, { status: 400 })
    }

    // Initialize M-Pesa API
    const mpesa = new MpesaAPI(mpesaConfig)

    const reference = "BSF Ridgeways Baptist WCGG"

    // Create transaction record in database
    const supabase = await createClient()
    const { data: transaction, error: dbError } = await supabase
      .from("transactions")
      .insert({
        phone_number: phoneNumber,
        amount: numAmount,
        reference: reference,
        status: "pending",
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to create transaction record" }, { status: 500 })
    }

    // Initiate STK Push
    const stkResponse = await mpesa.stkPush({
      phoneNumber,
      amount: numAmount,
      accountReference: reference,
      transactionDesc: `Payment for ${reference}`,
    })

    // Update transaction with M-Pesa response
    await supabase
      .from("transactions")
      .update({
        checkout_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
      })
      .eq("id", transaction.id)

    // Check if STK push was successful
    if (stkResponse.ResponseCode !== "0") {
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          result_code: stkResponse.ResponseCode,
          result_desc: stkResponse.ResponseDescription,
        })
        .eq("id", transaction.id)

      return NextResponse.json({ error: stkResponse.CustomerMessage || "Failed to initiate payment" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: stkResponse.CustomerMessage,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      transactionId: transaction.id,
    })
  } catch (error) {
    console.error("STK Push error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
