import { Faturamento, DespesaMensal, PagamentoDespesa } from '@/types'

export interface QuarterDates {
  start: Date
  end: Date
  months: number[] // [1,2,3] for Q1, [4,5,6] for Q2, etc
}

export interface QuarterOption {
  value: string // "2024-Q1"
  label: string // "Q1 2024"
  year: number
  quarter: number
}

export interface AggregatedFaturamentos {
  total_bruto: number
  total_irpj: number
  total_csll: number
  total_pis: number
  total_cofins: number
  total_impostos: number
  faturamentos: Faturamento[]
  count: number
}

export interface AggregatedDespesas {
  total_impostos: number
  total_compromissos: number
  despesas_impostos: DespesaMensal[]
  despesas_compromissos: DespesaMensal[]
  pagamentos: PagamentoDespesa[]
}

export interface QuarterlyData {
  year: number
  quarter: number
  faturamentos: AggregatedFaturamentos
  despesas: AggregatedDespesas
  // For INSS (monthly tax)
  inss_total?: number
}

export interface QuarterlyComparison {
  quarters: {
    label: string
    receita: number
    impostos: number
  }[]
}

/**
 * Get date range for a quarter
 * Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
 */
export function getQuarterDates(year: number, quarter: number): QuarterDates {
  if (quarter < 1 || quarter > 4) {
    throw new Error('Quarter must be between 1 and 4')
  }

  const startMonth = (quarter - 1) * 3
  const endMonth = startMonth + 2

  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, endMonth + 1, 0, 23, 59, 59, 999),
    months: [startMonth + 1, startMonth + 2, startMonth + 3]
  }
}

/**
 * Get current quarter
 */
export function getCurrentQuarter(): { year: number; quarter: number } {
  const now = new Date()
  const month = now.getMonth() + 1
  const quarter = Math.ceil(month / 3)

  return {
    year: now.getFullYear(),
    quarter
  }
}

/**
 * Generate quarter options (6 past + current + 6 future)
 */
export function getQuarterOptions(): QuarterOption[] {
  const { year: currentYear, quarter: currentQuarter } = getCurrentQuarter()
  const options: QuarterOption[] = []

  // Calculate starting point (6 quarters ago)
  let year = currentYear
  let quarter = currentQuarter - 6

  while (quarter <= 0) {
    year--
    quarter += 4
  }

  // Generate 13 options (6 past + current + 6 future)
  for (let i = 0; i < 13; i++) {
    options.push({
      value: `${year}-Q${quarter}`,
      label: `Q${quarter} ${year}`,
      year,
      quarter
    })

    quarter++
    if (quarter > 4) {
      quarter = 1
      year++
    }
  }

  return options
}

/**
 * Parse quarter string like "2024-Q1"
 */
export function parseQuarter(quarterStr: string): { year: number; quarter: number } {
  const match = quarterStr.match(/^(\d{4})-Q([1-4])$/)
  if (!match) {
    throw new Error('Invalid quarter format. Expected: YYYY-Q[1-4]')
  }

  return {
    year: parseInt(match[1]),
    quarter: parseInt(match[2])
  }
}

/**
 * Aggregate faturamentos for a quarter
 */
export function aggregateFaturamentos(faturamentos: Faturamento[]): AggregatedFaturamentos {
  const round = (num: number) => Math.round(num * 100) / 100

  if (faturamentos.length === 0) {
    return {
      total_bruto: 0,
      total_irpj: 0,
      total_csll: 0,
      total_pis: 0,
      total_cofins: 0,
      total_impostos: 0,
      faturamentos: [],
      count: 0
    }
  }

  const totals = faturamentos.reduce(
    (acc, fat) => ({
      total_bruto: acc.total_bruto + fat.valor_bruto,
      total_irpj: acc.total_irpj + fat.irpj,
      total_csll: acc.total_csll + fat.csll,
      total_pis: acc.total_pis + fat.pis,
      total_cofins: acc.total_cofins + fat.cofins,
      total_impostos: acc.total_impostos + fat.total_impostos,
    }),
    {
      total_bruto: 0,
      total_irpj: 0,
      total_csll: 0,
      total_pis: 0,
      total_cofins: 0,
      total_impostos: 0,
    }
  )

  return {
    total_bruto: round(totals.total_bruto),
    total_irpj: round(totals.total_irpj),
    total_csll: round(totals.total_csll),
    total_pis: round(totals.total_pis),
    total_cofins: round(totals.total_cofins),
    total_impostos: round(totals.total_impostos),
    faturamentos,
    count: faturamentos.length
  }
}

/**
 * Aggregate despesas for a quarter, considering payment status
 */
export function aggregateDespesas(
  despesas: DespesaMensal[],
  pagamentos: PagamentoDespesa[]
): AggregatedDespesas {
  const round = (num: number) => Math.round(num * 100) / 100

  const impostos = despesas.filter(d => d.tipo === 'imposto')
  const compromissos = despesas.filter(d => d.tipo === 'compromisso')

  // Calculate totals based on payment values (preserves historical accuracy)
  const total_impostos = pagamentos
    .filter(p => {
      const despesa = impostos.find(d => d.id === p.despesa_id)
      return !!despesa
    })
    .reduce((acc, p) => acc + (p.valor_pago || 0), 0)

  const total_compromissos = pagamentos
    .filter(p => {
      const despesa = compromissos.find(d => d.id === p.despesa_id)
      return !!despesa
    })
    .reduce((acc, p) => acc + (p.valor_pago || 0), 0)

  return {
    total_impostos: round(total_impostos),
    total_compromissos: round(total_compromissos),
    despesas_impostos: impostos,
    despesas_compromissos: compromissos,
    pagamentos
  }
}

/**
 * Filter faturamentos by quarter
 */
export function filterFaturamentosByQuarter(
  faturamentos: Faturamento[],
  year: number,
  quarter: number
): Faturamento[] {
  const { start, end } = getQuarterDates(year, quarter)

  return faturamentos.filter(fat => {
    const fatDate = new Date(fat.data)
    return fatDate >= start && fatDate <= end
  })
}

/**
 * Filter despesas by quarter months
 */
export function filterDespesasByQuarter(
  despesas: DespesaMensal[],
  year: number,
  quarter: number
): DespesaMensal[] {
  const { months } = getQuarterDates(year, quarter)

  return despesas.filter(d => {
    // For recurring expenses
    if (d.recorrente) {
      return true
    }

    // For one-off expenses, check if they match the quarter months
    if (d.mes_referencia && d.ano_referencia) {
      return d.ano_referencia === year && months.includes(d.mes_referencia)
    }

    return false
  })
}

/**
 * Filter pagamentos by quarter
 */
export function filterPagamentosByQuarter(
  pagamentos: PagamentoDespesa[],
  year: number,
  quarter: number
): PagamentoDespesa[] {
  const { months } = getQuarterDates(year, quarter)

  return pagamentos.filter(p =>
    p.ano_referencia === year && months.includes(p.mes_referencia)
  )
}

/**
 * Get quarterly comparison data for charts
 */
export function getQuarterlyComparison(
  quarterlyDataList: QuarterlyData[]
): QuarterlyComparison {
  return {
    quarters: quarterlyDataList.map(q => ({
      label: `Q${q.quarter} ${q.year}`,
      receita: q.faturamentos.total_bruto,
      impostos: q.faturamentos.total_impostos + q.despesas.total_impostos
    }))
  }
}
