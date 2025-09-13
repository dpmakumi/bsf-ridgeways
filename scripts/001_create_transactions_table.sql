-- Create transactions table for M-Pesa payments
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference TEXT,
  checkout_request_id TEXT,
  merchant_request_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  result_code TEXT,
  result_desc TEXT,
  mpesa_receipt_number TEXT,
  transaction_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions (allow all operations for now since this is a payment system)
CREATE POLICY "Allow all operations on transactions" ON public.transactions
  FOR ALL USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_phone_number ON public.transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_transactions_checkout_request_id ON public.transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
