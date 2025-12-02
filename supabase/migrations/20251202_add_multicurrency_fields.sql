-- Multi-Currency Faturamento Support
-- Adds USD, PTAX, NF value, and received value fields for export billing

-- Add currency fields to faturamentos table
ALTER TABLE public.faturamentos
ADD COLUMN IF NOT EXISTS valor_usd DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cotacao_ptax DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS valor_nota_fiscal DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS valor_recebido DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS exportacao BOOLEAN DEFAULT false NOT NULL;

-- Add check constraints for currency fields consistency
ALTER TABLE public.faturamentos
ADD CONSTRAINT check_export_currency_fields
CHECK (
  (exportacao = false) OR
  (exportacao = true AND valor_usd IS NOT NULL AND cotacao_ptax IS NOT NULL
   AND valor_nota_fiscal IS NOT NULL AND valor_recebido IS NOT NULL)
);

-- Create PTAX rates cache table
CREATE TABLE IF NOT EXISTS public.ptax_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  rate_venda DECIMAL(10,4) NOT NULL CHECK (rate_venda > 0),
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_ptax_rates_date ON public.ptax_rates(date DESC);

-- Enable RLS on ptax_rates (read-only for authenticated users)
ALTER TABLE public.ptax_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read PTAX rates (shared resource)
CREATE POLICY "Allow authenticated users to read PTAX rates"
  ON public.ptax_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow service role to insert/update PTAX rates (API only)
CREATE POLICY "Only service role can insert PTAX rates"
  ON public.ptax_rates
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Data migration: migrate existing export faturamentos
-- Map valor_bruto to valor_nota_fiscal for exports
UPDATE public.faturamentos
SET valor_nota_fiscal = valor_bruto,
    valor_recebido = valor_bruto
WHERE exportacao = true AND valor_nota_fiscal IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.faturamentos.valor_usd IS 'USD invoice amount for export services';
COMMENT ON COLUMN public.faturamentos.cotacao_ptax IS 'Official PTAX exchange rate (venda) from Banco Central';
COMMENT ON COLUMN public.faturamentos.valor_nota_fiscal IS 'Nota Fiscal value (valor_usd * cotacao_ptax) - tax calculation base';
COMMENT ON COLUMN public.faturamentos.valor_recebido IS 'Actual BRL amount received in bank account';
COMMENT ON TABLE public.ptax_rates IS 'Cache of PTAX exchange rates from Banco Central API';
