-- Create usuarios table
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nome_completo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create socios table
CREATE TABLE IF NOT EXISTS public.socios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    percentual_participacao DECIMAL(5,2) NOT NULL CHECK (percentual_participacao >= 0 AND percentual_participacao <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create faturamentos table
CREATE TABLE IF NOT EXISTS public.faturamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    valor_bruto DECIMAL(15,2) NOT NULL CHECK (valor_bruto >= 0),
    irpj DECIMAL(15,2) NOT NULL DEFAULT 0,
    csll DECIMAL(15,2) NOT NULL DEFAULT 0,
    pis DECIMAL(15,2) NOT NULL DEFAULT 0,
    cofins DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_impostos DECIMAL(15,2) NOT NULL DEFAULT 0,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;

-- Create policies for usuarios
CREATE POLICY "Users can view their own data" ON public.usuarios
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.usuarios
    FOR UPDATE USING (auth.uid() = id);

-- Create policies for socios (all authenticated users can manage)
CREATE POLICY "Authenticated users can view socios" ON public.socios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert socios" ON public.socios
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update socios" ON public.socios
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete socios" ON public.socios
    FOR DELETE TO authenticated USING (true);

-- Create policies for faturamentos
CREATE POLICY "Users can view their own faturamentos" ON public.faturamentos
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own faturamentos" ON public.faturamentos
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own faturamentos" ON public.faturamentos
    FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own faturamentos" ON public.faturamentos
    FOR DELETE USING (auth.uid() = usuario_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_faturamentos_usuario_id ON public.faturamentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_data ON public.faturamentos(data DESC);
CREATE INDEX IF NOT EXISTS idx_socios_cpf ON public.socios(cpf);

-- Create function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.socios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.faturamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically create usuario record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nome_completo)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'nome_completo');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
