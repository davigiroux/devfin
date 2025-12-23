import { Faturamento, DespesaMensal } from '@/types'
import { parseISO } from 'date-fns'

export interface MonthlyAggregate {
  month: number
  year: number
  revenue: number
  irpj: number
  csll: number
  pis: number
  cofins: number
  totalTax: number
  despesas: number
  inss: number
}

export interface QuarterlyAggregate {
  quarter: number
  year: number
  months: MonthlyAggregate[]
  revenue: number
  totalTax: number
  despesas: number
  inss: number
  net: number
}

export interface YearlyAggregate {
  year: number
  revenue: number
  totalTax: number
  despesas: number
  inss: number
  net: number
}

/**
 * Get quarter number (1-4) from month (1-12)
 */
export function getQuarter(month: number): number {
  return Math.ceil(month / 3)
}

/**
 * Get month range for a quarter
 */
export function getQuarterMonths(quarter: number): number[] {
  const start = (quarter - 1) * 3 + 1
  return [start, start + 1, start + 2]
}

/**
 * Aggregate faturamentos by month
 */
export function aggregateByMonth(faturamentos: Faturamento[]): MonthlyAggregate[] {
  const monthlyMap = new Map<string, MonthlyAggregate>()

  faturamentos.forEach((f) => {
    const date = parseISO(f.data)
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const key = `${year}-${month.toString().padStart(2, '0')}`

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        month,
        year,
        revenue: 0,
        irpj: 0,
        csll: 0,
        pis: 0,
        cofins: 0,
        totalTax: 0,
        despesas: 0,
        inss: 0,
      })
    }

    const aggregate = monthlyMap.get(key)!
    // For exports, use valor_recebido (cash flow), otherwise valor_bruto
    const revenueAmount = f.exportacao && f.valor_recebido
      ? Number(f.valor_recebido)
      : Number(f.valor_bruto)

    aggregate.revenue += revenueAmount
    aggregate.irpj += Number(f.irpj)
    aggregate.csll += Number(f.csll)
    aggregate.pis += Number(f.pis)
    aggregate.cofins += Number(f.cofins)
    aggregate.totalTax += Number(f.total_impostos)
  })

  return Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
}

/**
 * Add despesas to monthly aggregates
 */
export function addDespesasToMonthly(
  monthly: MonthlyAggregate[],
  despesas: DespesaMensal[]
): MonthlyAggregate[] {
  const result = [...monthly]

  despesas.forEach((d) => {
    if (!d.ativa) return

    if (d.recorrente) {
      const effectiveFrom = parseISO(d.effective_from)
      const effectiveMonth = effectiveFrom.getMonth() + 1
      const effectiveYear = effectiveFrom.getFullYear()

      result.forEach((m) => {
        if (m.year > effectiveYear || (m.year === effectiveYear && m.month >= effectiveMonth)) {
          m.despesas += Number(d.valor)
        }
      })
    } else if (d.mes_referencia !== null && d.ano_referencia !== null) {
      const monthAggregate = result.find(
        (m) => m.month === d.mes_referencia && m.year === d.ano_referencia
      )
      if (monthAggregate) {
        monthAggregate.despesas += Number(d.valor)
      }
    }
  })

  return result
}

/**
 * Aggregate monthly data into quarters
 */
export function aggregateByQuarter(monthly: MonthlyAggregate[]): QuarterlyAggregate[] {
  const quarterlyMap = new Map<string, QuarterlyAggregate>()

  monthly.forEach((m) => {
    const quarter = getQuarter(m.month)
    const key = `${m.year}-Q${quarter}`

    if (!quarterlyMap.has(key)) {
      quarterlyMap.set(key, {
        quarter,
        year: m.year,
        months: [],
        revenue: 0,
        totalTax: 0,
        despesas: 0,
        inss: 0,
        net: 0,
      })
    }

    const aggregate = quarterlyMap.get(key)!
    aggregate.months.push(m)
    aggregate.revenue += m.revenue
    aggregate.totalTax += m.totalTax
    aggregate.despesas += m.despesas
    aggregate.inss += m.inss
  })

  // Calculate net for each quarter
  const result = Array.from(quarterlyMap.values())
  result.forEach((q) => {
    q.net = q.revenue - q.totalTax - q.despesas - q.inss
  })

  return result.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.quarter - b.quarter
  })
}

/**
 * Aggregate monthly data by year
 */
export function aggregateByYear(monthly: MonthlyAggregate[]): YearlyAggregate[] {
  const yearlyMap = new Map<number, YearlyAggregate>()

  monthly.forEach((m) => {
    if (!yearlyMap.has(m.year)) {
      yearlyMap.set(m.year, {
        year: m.year,
        revenue: 0,
        totalTax: 0,
        despesas: 0,
        inss: 0,
        net: 0,
      })
    }

    const aggregate = yearlyMap.get(m.year)!
    aggregate.revenue += m.revenue
    aggregate.totalTax += m.totalTax
    aggregate.despesas += m.despesas
    aggregate.inss += m.inss
  })

  // Calculate net for each year
  const result = Array.from(yearlyMap.values())
  result.forEach((y) => {
    y.net = y.revenue - y.totalTax - y.despesas - y.inss
  })

  return result.sort((a, b) => a.year - b.year)
}

/**
 * Get current year's data
 */
export function getCurrentYearData(
  faturamentos: Faturamento[],
  despesas: DespesaMensal[]
): YearlyAggregate {
  const currentYear = new Date().getFullYear()
  const currentYearFaturamentos = faturamentos.filter((f) => {
    const date = parseISO(f.data)
    return date.getFullYear() === currentYear
  })

  const monthly = aggregateByMonth(currentYearFaturamentos)
  const monthlyWithDespesas = addDespesasToMonthly(monthly, despesas)
  const yearly = aggregateByYear(monthlyWithDespesas)

  return yearly.find((y) => y.year === currentYear) || {
    year: currentYear,
    revenue: 0,
    totalTax: 0,
    despesas: 0,
    inss: 0,
    net: 0,
  }
}
