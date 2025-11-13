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
  usuario_id: string
  created_at: string
  updated_at: string
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
