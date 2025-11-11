# DevFin - Sistema de Gestão Financeira

Sistema completo para gerenciamento financeiro de empresas com cálculo automático de impostos (Lucro Presumido) e gestão de sócios com INSS pró-labore.

## 🚀 Tecnologias

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Estilização:** TailwindCSS
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth
- **Validação:** Zod
- **Testes:** Jest + Testing Library

## 📋 Funcionalidades

### ✅ Cálculo de Impostos (Lucro Presumido)
- Cálculo automático de IRPJ, CSLL, PIS e COFINS
- Baseado no regime de Lucro Presumido para empresas de serviços
- Alíquotas conforme legislação brasileira:
  - IRPJ: 4,8%
  - CSLL: 2,88%
  - PIS: 0,65%
  - COFINS: 3%
  - **Total: 11,33%**

### 👥 Gestão de Sócios
- Cadastro de sócios com CPF e percentual de participação
- Validação automática: soma dos percentuais deve ser 100%
- Cálculo de INSS pró-labore proporcional
- Distribuição automática baseada na participação de cada sócio

### 💰 Gestão de Faturamentos
- Registro de faturamentos mensais
- Cálculo automático de impostos ao cadastrar
- Visualização de valores brutos, impostos e líquidos
- Histórico completo de faturamentos

### 🔐 Autenticação
- Sistema completo de login e registro
- Autenticação via Supabase
- Rotas protegidas com middleware
- Row Level Security (RLS) no banco de dados

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com)

### 1. Clone e instale as dependências

```bash
cd devfin
npm install
```

### 2. Configure o Supabase

1. Crie um novo projeto no Supabase
2. Copie as credenciais do projeto
3. Renomeie `.env.local.example` para `.env.local`
4. Preencha as variáveis de ambiente:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 3. Execute as migrations do banco de dados

1. Acesse o painel do Supabase
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de `supabase/migrations/20250111_initial_schema.sql`
4. Execute o SQL

Ou use o Supabase CLI:

```bash
npx supabase db push
```

### 4. Execute o projeto

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build
npm start

# Executar testes
npm test

# Testes em modo watch
npm run test:watch
```

O projeto estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
devfin/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de rotas de autenticação
│   │   ├── login/               # Página de login
│   │   └── register/            # Página de registro
│   ├── (dashboard)/             # Rotas protegidas
│   │   ├── dashboard/           # Dashboard principal
│   │   ├── faturamentos/        # Gestão de faturamentos
│   │   └── socios/              # Gestão de sócios
│   ├── api/                     # API routes
│   │   └── auth/                # Endpoints de autenticação
│   └── page.tsx                 # Página inicial
├── components/                   # Componentes React
│   ├── ui/                      # Componentes de UI
│   ├── auth/                    # Componentes de autenticação
│   ├── faturamento/            # Componentes de faturamento
│   └── socios/                 # Componentes de sócios
├── lib/                         # Bibliotecas e utilitários
│   ├── supabase/               # Configuração Supabase
│   │   ├── client.ts           # Cliente para componentes client
│   │   └── server.ts           # Cliente para Server Components
│   ├── calculations/           # Módulos de cálculo
│   │   ├── impostos.ts         # Cálculo de impostos
│   │   └── inss.ts             # Cálculo de INSS
│   └── validations/            # Schemas de validação (Zod)
├── types/                       # TypeScript types
│   ├── database.types.ts       # Types do Supabase
│   └── index.ts                # Types customizados
├── __tests__/                   # Testes unitários
│   ├── calculations/           # Testes de cálculos
│   │   ├── impostos.test.ts   # Testes de impostos
│   │   └── inss.test.ts       # Testes de INSS
│   └── components/             # Testes de componentes
├── supabase/                    # Configurações Supabase
│   ├── migrations/             # Migrations SQL
│   └── README.md               # Documentação do banco
├── middleware.ts               # Middleware de autenticação
└── jest.config.ts              # Configuração Jest
```

## 🧪 Testes

O projeto possui **31 testes unitários** que cobrem:

- Cálculo de impostos (Lucro Presumido)
- Cálculo de INSS progressivo
- Distribuição de pró-labore entre sócios
- Validações de entrada
- Casos extremos e erros

```bash
# Executar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Testes com coverage
npm test -- --coverage
```

## 📊 Módulos de Cálculo

### Impostos (Lucro Presumido)

```typescript
import { calcularImpostosLucroPresumido } from '@/lib/calculations/impostos'

const impostos = calcularImpostosLucroPresumido(100000)
// {
//   irpj: 4800,
//   csll: 2880,
//   pis: 650,
//   cofins: 3000,
//   total: 11330
// }
```

### INSS Pró-labore

```typescript
import { calcularINSSSocios } from '@/lib/calculations/inss'

const socios = [
  { id: '1', nome: 'João', percentual_participacao: 60, ... },
  { id: '2', nome: 'Maria', percentual_participacao: 40, ... }
]

const resultado = calcularINSSSocios(10000, socios)
// {
//   valor_total_prolabore: 10000,
//   socios: [
//     { socio_id: '1', nome: 'João', valor_prolabore: 6000, valor_inss: 518.82, ... },
//     { socio_id: '2', nome: 'Maria', valor_prolabore: 4000, valor_inss: 338.82, ... }
//   ],
//   total_inss: 857.64
// }
```

## 🗄️ Banco de Dados

### Tabelas

- **usuarios**: Dados dos usuários (vinculado ao Supabase Auth)
- **socios**: Informações dos sócios da empresa
- **faturamentos**: Registro de faturamentos mensais com impostos calculados

### Segurança

- Row Level Security (RLS) habilitado em todas as tabelas
- Políticas que garantem que usuários só acessem seus próprios dados
- Triggers automáticos para atualização de timestamps
- Função automática para criar registro de usuário no signup

## 🔒 Segurança

- Autenticação via Supabase Auth
- Middleware protegendo rotas do dashboard
- RLS no banco de dados
- Validação de inputs com Zod
- HTTPS obrigatório em produção

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev          # Iniciar servidor de desenvolvimento

# Testes
npm test            # Executar testes
npm run test:watch  # Testes em modo watch

# Build
npm run build       # Build de produção
npm start           # Iniciar em produção

# Linting
npm run lint        # Executar ESLint
```

## 🎯 Próximos Passos

- [ ] Adicionar gráficos e dashboards visuais
- [ ] Implementar exportação para Excel/PDF
- [ ] Adicionar suporte para outros regimes tributários
- [ ] Implementar notificações de vencimentos
- [ ] Adicionar multi-tenancy (múltiplas empresas)
- [ ] Criar aplicativo mobile com React Native

## 📄 Licença

Este projeto é privado e de uso interno.

## 🤝 Contribuindo

Este é um projeto privado. Para contribuir, entre em contato com a equipe.

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

---

**DevFin** - Gestão Financeira Inteligente 💼
