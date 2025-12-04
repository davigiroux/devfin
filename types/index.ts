export interface Socio {
  id: string
  nome: string
  cpf: string
  percentual_participacao: number
  created_at: string
  updated_at: string
}

export interface Faturamento {
  id: string
  data: string
  valor_bruto: number
  irpj: number
  csll: number
  pis: number
  cofins: number
  total_impostos: number
  exportacao: boolean
  // Multi-currency fields (for export services)
  valor_usd?: number | null
  cotacao_ptax?: number | null
  valor_nota_fiscal?: number | null
  valor_recebido?: number | null
  usuario_id: string
  created_at: string
  updated_at: string
}

export interface PTAXRate {
  id: string
  date: string
  rate_venda: number
  fetched_at: string
  created_at: string
}

export interface ImpostosCalculados {
  irpj: number
  csll: number
  pis: number
  cofins: number
  total: number
}

export interface INSSSocio {
  socio_id: string
  nome: string
  valor_prolabore: number
  aliquota_inss: number
  valor_inss: number
}

export interface CalculoINSS {
  valor_total_prolabore: number
  socios: INSSSocio[]
  total_inss: number
}

export interface DespesaMensal {
  id: string
  descricao: string
  tipo: 'imposto' | 'compromisso'
  valor: number
  dia_vencimento: number
  recorrente: boolean
  mes_referencia: number | null
  ano_referencia: number | null
  ativa: boolean
  effective_from: string
  version: number
  previous_version_id: string | null
  usuario_id: string
  created_at: string
  updated_at: string
}

export interface PagamentoDespesa {
  id: string
  despesa_id: string
  mes_referencia: number
  ano_referencia: number
  pago: boolean
  data_pagamento: string | null
  valor_pago: number | null
  created_at: string
  updated_at: string
}

export interface CaixaNecessario {
  total_despesas: number
  despesas_impostos: number
  despesas_compromissos: number
  despesas: DespesaMensal[]
}
