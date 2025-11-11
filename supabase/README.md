# Supabase Setup

## Configuração Inicial

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie a URL do projeto e as chaves de API
3. Configure as variáveis de ambiente no arquivo `.env.local`

## Executar Migrations

Para aplicar as migrations no seu banco de dados Supabase:

1. Acesse o painel do Supabase
2. Vá em SQL Editor
3. Copie e cole o conteúdo do arquivo `migrations/20250111_initial_schema.sql`
4. Execute o SQL

Ou use o Supabase CLI:

```bash
npx supabase db push
```

## Estrutura das Tabelas

### usuarios
- `id`: UUID (referência ao auth.users)
- `email`: TEXT (único)
- `nome_completo`: TEXT
- Timestamps automáticos

### socios
- `id`: UUID
- `nome`: TEXT
- `cpf`: TEXT (único)
- `percentual_participacao`: DECIMAL (0-100)
- Timestamps automáticos

### faturamentos
- `id`: UUID
- `data`: DATE
- `valor_bruto`: DECIMAL
- `irpj`, `csll`, `pis`, `cofins`: DECIMAL (impostos calculados)
- `total_impostos`: DECIMAL
- `usuario_id`: UUID (referência)
- Timestamps automáticos

## Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado com políticas adequadas:
- Usuários só podem ver/editar seus próprios dados
- Faturamentos são isolados por usuário
- Sócios são compartilhados entre usuários autenticados
