// M-Pesa Daraja API utility functions
export interface MpesaConfig {
  consumerKey: string
  consumerSecret: string
  businessShortCode: string
  passkey: string
  callbackUrl: string
  environment: "sandbox" | "production"
}

export interface STKPushRequest {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc: string
}

export interface STKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

export interface STKQueryRequest {
  checkoutRequestId: string
}

export interface STKQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: string
  ResultDesc: string
}

export class MpesaAPI {
  private config: MpesaConfig
  private baseUrl: string

  constructor(config: MpesaConfig) {
    this.config = config
    this.baseUrl =
      config.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"
  }

  // Generate timestamp in YYYYMMDDHHmmss format
  private generateTimestamp(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hour = String(now.getHours()).padStart(2, "0")
    const minute = String(now.getMinutes()).padStart(2, "0")
    const second = String(now.getSeconds()).padStart(2, "0")

    return `${year}${month}${day}${hour}${minute}${second}`
  }

  // Generate password for STK push
  private generatePassword(timestamp: string): string {
    const data = `${this.config.businessShortCode}${this.config.passkey}${timestamp}`
    return Buffer.from(data).toString("base64")
  }

  // Get OAuth access token
  async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString("base64")

    const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`)
    }

    const data = await response.json()
    return data.access_token
  }

  // Format phone number to 254XXXXXXXXX
  private formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, "")

    if (cleaned.startsWith("0")) {
      cleaned = "254" + cleaned.substring(1)
    } else if (cleaned.startsWith("254")) {
      // Already in correct format
    } else if (cleaned.length === 9) {
      cleaned = "254" + cleaned
    }

    return cleaned
  }

  // Initiate STK Push
  async stkPush(request: STKPushRequest): Promise<STKPushResponse> {
    const accessToken = await this.getAccessToken()
    const timestamp = this.generateTimestamp()
    const password = this.generatePassword(timestamp)
    const formattedPhone = this.formatPhoneNumber(request.phoneNumber)

    const payload = {
      BusinessShortCode: this.config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.floor(request.amount), // M-Pesa doesn't accept decimals
      PartyA: formattedPhone,
      PartyB: this.config.businessShortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: this.config.callbackUrl,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc,
    }

    const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`STK Push failed: ${response.statusText}`)
    }

    return await response.json()
  }

  // Query STK Push status
  async stkQuery(request: STKQueryRequest): Promise<STKQueryResponse> {
    const accessToken = await this.getAccessToken()
    const timestamp = this.generateTimestamp()
    const password = this.generatePassword(timestamp)

    const payload = {
      BusinessShortCode: this.config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: request.checkoutRequestId,
    }

    const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`STK Query failed: ${response.statusText}`)
    }

    return await response.json()
  }
}
