-- Initial Neon schema for DevFin (post-Supabase migration).
-- Source of truth going forward: lib/db/schema.ts via drizzle-kit.
-- This bootstrap file is what you apply to a fresh Neon DB before loading dumped data.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- usuarios: merged Auth.js user table + DevFin user profile.
-- id kept as UUID so existing faturamentos.usuario_id FKs stay intact across the dump.
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nome_completo TEXT,
    password_hash TEXT,
    email_verified TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.socios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    percentual_participacao DECIMAL(5,2) NOT NULL CHECK (percentual_participacao >= 0 AND percentual_participacao <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.faturamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    valor_bruto DECIMAL(15,2) NOT NULL CHECK (valor_bruto >= 0),
    irpj DECIMAL(15,2) NOT NULL DEFAULT 0,
    csll DECIMAL(15,2) NOT NULL DEFAULT 0,
    pis DECIMAL(15,2) NOT NULL DEFAULT 0,
    cofins DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_impostos DECIMAL(15,2) NOT NULL DEFAULT 0,
    exportacao BOOLEAN NOT NULL DEFAULT false,
    valor_usd DECIMAL(15,2),
    cotacao_ptax DECIMAL(10,4),
    valor_nota_fiscal DECIMAL(15,2),
    valor_recebido DECIMAL(15,2),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT check_export_currency_fields CHECK (
        exportacao = false OR
        (valor_usd IS NOT NULL AND cotacao_ptax IS NOT NULL
         AND valor_nota_fiscal IS NOT NULL AND valor_recebido IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_faturamentos_usuario_id ON public.faturamentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_data ON public.faturamentos(data DESC);
CREATE INDEX IF NOT EXISTS idx_socios_cpf ON public.socios(cpf);

CREATE TABLE IF NOT EXISTS public.despesas_mensais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('imposto', 'compromisso')),
    valor DECIMAL(15,2) NOT NULL CHECK (valor >= 0),
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    recorrente BOOLEAN NOT NULL DEFAULT true,
    mes_referencia INTEGER CHECK (mes_referencia BETWEEN 1 AND 12),
    ano_referencia INTEGER,
    ativa BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES public.despesas_mensais(id) ON DELETE SET NULL,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_despesas_usuario_id ON public.despesas_mensais(usuario_id);
CREATE INDEX IF NOT EXISTS idx_despesas_previous_version ON public.despesas_mensais(previous_version_id);

CREATE TABLE IF NOT EXISTS public.pagamentos_despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    despesa_id UUID NOT NULL REFERENCES public.despesas_mensais(id) ON DELETE CASCADE,
    mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
    ano_referencia INTEGER NOT NULL,
    pago BOOLEAN NOT NULL DEFAULT false,
    data_pagamento DATE,
    valor_pago DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (despesa_id, mes_referencia, ano_referencia)
);
CREATE INDEX IF NOT EXISTS idx_pagamentos_despesa_id ON public.pagamentos_despesas(despesa_id);

CREATE TABLE IF NOT EXISTS public.ptax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    rate_venda DECIMAL(10,4) NOT NULL CHECK (rate_venda > 0),
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ptax_rates_date ON public.ptax_rates(date DESC);

-- updated_at trigger (shared).
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['usuarios','socios','faturamentos','despesas_mensais','pagamentos_despesas']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
                        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
    END LOOP;
END $$;
