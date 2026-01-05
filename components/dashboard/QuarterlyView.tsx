'use client'

import { useState, Fragment } from 'react'
import { Faturamento, DespesaMensal } from '@/types'
import {
  aggregateByMonth,
  addDespesasToMonthly,
  aggregateByQuarter,
  getQuarterMonths,
} from '@/lib/calculations/aggregations'

interface QuarterlyViewProps {
  faturamentos: Faturamento[]
  despesas: DespesaMensal[]
}

const MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export default function QuarterlyView({ faturamentos, despesas }: QuarterlyViewProps) {
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set())

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Get available years from faturamentos
  const availableYears = Array.from(
    new Set(
      faturamentos.map((f) => new Date(f.data).getFullYear())
    )
  ).sort((a, b) => b - a)

  if (availableYears.length === 0) {
    availableYears.push(new Date().getFullYear())
  }

  // Initialize selectedYear with the most recent year with data
  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0])

  // Filter faturamentos by selected year
  const yearFaturamentos = faturamentos.filter((f) => {
    const year = new Date(f.data).getFullYear()
    return year === selectedYear
  })

  // Aggregate data
  const monthly = aggregateByMonth(yearFaturamentos)
  const monthlyWithDespesas = addDespesasToMonthly(monthly, despesas)
  const quarterly = aggregateByQuarter(monthlyWithDespesas)

  const toggleQuarter = (key: string) => {
    const newExpanded = new Set(expandedQuarters)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedQuarters(newExpanded)
  }

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Visão por Trimestre
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Ano:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1 border rounded-md text-sm"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {quarterly.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhum faturamento cadastrado para {selectedYear}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase w-10"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase">
                  Trimestre
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Faturamento
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Impostos
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Despesas
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  INSS
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
                  Líquido
                </th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {quarterly.map((q) => {
                const quarterKey = `${q.year}-Q${q.quarter}`
                const isExpanded = expandedQuarters.has(quarterKey)
                const quarterMonths = getQuarterMonths(q.quarter)

                return (
                  <Fragment key={quarterKey}>
                    <tr
                      className="border-t border cursor-pointer hover:bg-muted"
                      onClick={() => toggleQuarter(quarterKey)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        <svg
                          className={`w-5 h-5 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-foreground">
                        Q{q.quarter} {q.year}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-foreground">
                        {formatCurrency(q.revenue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-primary">
                        {formatCurrency(q.totalTax)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-warning">
                        {formatCurrency(q.despesas)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {formatCurrency(q.inss)}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${
                          q.net >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {formatCurrency(q.net)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="ml-8">
                            <h4 className="text-sm font-semibold text-foreground mb-3">
                              Detalhamento Mensal - Q{q.quarter} {q.year}
                            </h4>
                            <table className="min-w-full divide-y divide-border">
                              <thead className="bg-card">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-foreground">
                                    Mês
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                                    Faturamento
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                                    Impostos
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                                    Despesas
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                                    INSS
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                                    Líquido
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-card divide-y divide-border">
                                {quarterMonths.map((monthNum) => {
                                  const monthData = q.months.find((m) => m.month === monthNum)
                                  if (!monthData) {
                                    // Show empty row for months with no data
                                    return (
                                      <tr key={monthNum} className="text-muted-foreground">
                                        <td className="px-3 py-2 text-sm">
                                          {MONTHS[monthNum - 1]}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-right">-</td>
                                        <td className="px-3 py-2 text-sm text-right">-</td>
                                        <td className="px-3 py-2 text-sm text-right">-</td>
                                        <td className="px-3 py-2 text-sm text-right">-</td>
                                        <td className="px-3 py-2 text-sm text-right">-</td>
                                      </tr>
                                    )
                                  }

                                  const net =
                                    monthData.revenue -
                                    monthData.totalTax -
                                    monthData.despesas -
                                    monthData.inss

                                  return (
                                    <tr key={monthNum} className="hover:bg-muted">
                                      <td className="px-3 py-2 text-sm text-foreground">
                                        {MONTHS[monthData.month - 1]}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-right text-foreground">
                                        {formatCurrency(monthData.revenue)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-right text-primary">
                                        {formatCurrency(monthData.totalTax)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-right text-warning">
                                        {formatCurrency(monthData.despesas)}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-right text-muted-foreground">
                                        {formatCurrency(monthData.inss)}
                                      </td>
                                      <td
                                        className={`px-3 py-2 text-sm text-right font-medium ${
                                          net >= 0 ? 'text-success' : 'text-destructive'
                                        }`}
                                      >
                                        {formatCurrency(net)}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
