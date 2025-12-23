'use client'

import { Faturamento, DespesaMensal } from '@/types'
import { getCurrentYearData } from '@/lib/calculations/aggregations'

interface YearSummaryCardsProps {
  faturamentos: Faturamento[]
  despesas: DespesaMensal[]
}

export default function YearSummaryCards({
  faturamentos,
  despesas,
}: YearSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const yearData = getCurrentYearData(faturamentos, despesas)
  const currentYear = new Date().getFullYear()

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            Faturamento {currentYear}
          </div>
          <svg
            className="w-5 h-5 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
        <div className="text-2xl font-bold text-success">
          {formatCurrency(yearData.revenue)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Receita bruta total do ano
        </p>
      </div>

      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            Impostos {currentYear}
          </div>
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
            />
          </svg>
        </div>
        <div className="text-2xl font-bold text-primary">
          {formatCurrency(yearData.totalTax)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          IRPJ, CSLL, PIS e COFINS
        </p>
      </div>

      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            Líquido {currentYear}
          </div>
          <svg
            className="w-5 h-5 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div
          className={`text-2xl font-bold ${
            yearData.net >= 0 ? 'text-success' : 'text-destructive'
          }`}
        >
          {formatCurrency(yearData.net)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Após impostos, despesas e INSS
        </p>
      </div>
    </div>
  )
}
