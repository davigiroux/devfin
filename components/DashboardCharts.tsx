'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Faturamento, DespesaMensal, PagamentoDespesa } from '@/types'
import { parseISO } from 'date-fns'

interface DashboardChartsProps {
  faturamentos: Faturamento[]
  despesas: DespesaMensal[]
  pagamentos?: PagamentoDespesa[]
}

const COLORS = {
  irpj: '#8b5cf6',
  csll: '#ec4899',
  pis: '#3b82f6',
  cofins: '#10b981',
  imposto: '#ef4444',
  compromisso: '#f59e0b',
  revenue: '#22c55e',
  expenses: '#ef4444',
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

interface MonthlyData {
  month: string
  year: number
  monthNum: number
  revenue: number
  irpj: number
  csll: number
  pis: number
  cofins: number
  totalTax: number
  expenses: number
  expensesImposto: number
  expensesCompromisso: number
}

export default function DashboardCharts({
  faturamentos,
  despesas,
}: DashboardChartsProps) {
  const currentDate = new Date()
  const [startMonth, setStartMonth] = useState(0)
  const [startYear, setStartYear] = useState(currentDate.getFullYear())
  const [endMonth, setEndMonth] = useState(currentDate.getMonth())
  const [endYear, setEndYear] = useState(currentDate.getFullYear())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const filteredData = useMemo(() => {
    // Filter faturamentos by date range
    const filtered = faturamentos.filter((f) => {
      const date = parseISO(f.data)
      const month = date.getMonth()
      const year = date.getFullYear()

      const startDate = new Date(startYear, startMonth, 1)
      const endDate = new Date(endYear, endMonth, 31)
      const itemDate = new Date(year, month, 1)

      return itemDate >= startDate && itemDate <= endDate
    })

    // Group by month
    const monthlyData = new Map<string, MonthlyData>()

    filtered.forEach((f) => {
      const date = parseISO(f.data)
      const month = date.getMonth()
      const year = date.getFullYear()
      const key = `${year}-${String(month + 1).padStart(2, '0')}`

      if (!monthlyData.has(key)) {
        monthlyData.set(key, {
          month: MONTHS[month],
          year,
          monthNum: month + 1,
          revenue: 0,
          irpj: 0,
          csll: 0,
          pis: 0,
          cofins: 0,
          totalTax: 0,
          expenses: 0,
          expensesImposto: 0,
          expensesCompromisso: 0,
        })
      }

      const data = monthlyData.get(key)!
      data.revenue += Number(f.valor_bruto)
      data.irpj += Number(f.irpj)
      data.csll += Number(f.csll)
      data.pis += Number(f.pis)
      data.cofins += Number(f.cofins)
      data.totalTax += Number(f.total_impostos)
    })

    // Add expenses to monthly data
    despesas.forEach((d) => {
      if (!d.ativa) return

      if (d.recorrente) {
        // Add to each month in range
        const startDate = new Date(startYear, startMonth, 1)
        const endDate = new Date(endYear, endMonth, 31)
        const effectiveFrom = parseISO(d.effective_from)

        let currentDate = new Date(
          Math.max(startDate.getTime(), effectiveFrom.getTime())
        )

        while (currentDate <= endDate) {
          const month = currentDate.getMonth()
          const year = currentDate.getFullYear()
          const key = `${year}-${String(month + 1).padStart(2, '0')}`

          if (!monthlyData.has(key)) {
            monthlyData.set(key, {
              month: MONTHS[month],
              year,
              monthNum: month + 1,
              revenue: 0,
              irpj: 0,
              csll: 0,
              pis: 0,
              cofins: 0,
              totalTax: 0,
              expenses: 0,
              expensesImposto: 0,
              expensesCompromisso: 0,
            })
          }

          const data = monthlyData.get(key)!
          data.expenses += Number(d.valor)
          if (d.tipo === 'imposto') {
            data.expensesImposto += Number(d.valor)
          } else {
            data.expensesCompromisso += Number(d.valor)
          }

          const nextMonth = currentDate.getMonth() + 1
          currentDate = new Date(currentDate.getFullYear(), nextMonth, 1)
        }
      } else if (d.mes_referencia !== null && d.ano_referencia !== null) {
        // One-time expense
        const key = `${d.ano_referencia}-${String(d.mes_referencia).padStart(2, '0')}`

        if (monthlyData.has(key)) {
          const data = monthlyData.get(key)!
          data.expenses += Number(d.valor)
          if (d.tipo === 'imposto') {
            data.expensesImposto += Number(d.valor)
          } else {
            data.expensesCompromisso += Number(d.valor)
          }
        }
      }
    })

    return Array.from(monthlyData.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.monthNum - b.monthNum
    })
  }, [faturamentos, despesas, startMonth, startYear, endMonth, endYear])

  // Tax breakdown pie chart data
  const taxBreakdown = useMemo(() => {
    const totals = filteredData.reduce(
      (acc, d) => ({
        irpj: acc.irpj + d.irpj,
        csll: acc.csll + d.csll,
        pis: acc.pis + d.pis,
        cofins: acc.cofins + d.cofins,
      }),
      { irpj: 0, csll: 0, pis: 0, cofins: 0 }
    )

    return [
      { name: 'IRPJ', value: totals.irpj },
      { name: 'CSLL', value: totals.csll },
      { name: 'PIS', value: totals.pis },
      { name: 'COFINS', value: totals.cofins },
    ].filter((item) => item.value > 0)
  }, [filteredData])

  // Expense breakdown pie chart data
  const expenseBreakdown = useMemo(() => {
    const totals = filteredData.reduce(
      (acc, d) => ({
        imposto: acc.imposto + d.expensesImposto,
        compromisso: acc.compromisso + d.expensesCompromisso,
      }),
      { imposto: 0, compromisso: 0 }
    )

    return [
      { name: 'Impostos', value: totals.imposto },
      { name: 'Compromissos', value: totals.compromisso },
    ].filter((item) => item.value > 0)
  }, [filteredData])

  // Tax payment schedule (revenue in month X -> tax paid in month X+1)
  const taxPaymentSchedule = useMemo(() => {
    return filteredData.map((d) => {
      const paymentYear = d.monthNum === 12 ? d.year + 1 : d.year
      const paymentMonthNum = d.monthNum === 12 ? 1 : d.monthNum + 1

      // Get despesas for payment month
      const monthDespesas = despesas.filter((desp) => {
        if (!desp.ativa) return false

        if (desp.recorrente) {
          const effectiveFrom = parseISO(desp.effective_from)
          const effectiveMonth = effectiveFrom.getMonth() + 1
          const effectiveYear = effectiveFrom.getFullYear()

          if (paymentYear < effectiveYear) return false
          if (paymentYear === effectiveYear && paymentMonthNum < effectiveMonth) return false

          return true
        } else {
          return desp.mes_referencia === paymentMonthNum && desp.ano_referencia === paymentYear
        }
      })

      const totalDespesas = monthDespesas.reduce((acc, desp) => acc + Number(desp.valor), 0)

      return {
        earningMonth: `${d.month}/${d.year}`,
        paymentMonth:
          d.monthNum === 12
            ? `Jan/${d.year + 1}`
            : `${MONTHS[d.monthNum]}/${d.year}`,
        paymentYear,
        paymentMonthNum,
        earningYear: d.year,
        earningMonthNum: d.monthNum,
        irpj: d.irpj,
        csll: d.csll,
        pis: d.pis,
        cofins: d.cofins,
        despesas: totalDespesas,
        total: d.totalTax + totalDespesas,
        revenue: d.revenue,
      }
    })
  }, [filteredData, despesas])

  // Summary totals
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        tax: acc.tax + d.totalTax,
        expenses: acc.expenses + d.expenses,
        net: acc.net + (d.revenue - d.totalTax - d.expenses),
      }),
      { revenue: 0, tax: 0, expenses: 0, net: 0 }
    )
  }, [filteredData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedRows(newExpanded)
  }

  const getDespesasForMonth = (year: number, month: number) => {
    return despesas.filter((d) => {
      if (!d.ativa) return false

      if (d.recorrente) {
        const effectiveFrom = parseISO(d.effective_from)
        const effectiveMonth = effectiveFrom.getMonth() + 1
        const effectiveYear = effectiveFrom.getFullYear()

        // Check if this month/year is after or equal to effective date
        if (year < effectiveYear) return false
        if (year === effectiveYear && month < effectiveMonth) return false

        return true
      } else {
        // One-time expense
        return d.mes_referencia === month && d.ano_referencia === year
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês Início
            </label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano Início
            </label>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="2020"
              max="2030"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês Fim
            </label>
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {MONTHS.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano Fim
            </label>
            <input
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="2020"
              max="2030"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">
            Receita Bruta
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totals.revenue)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">
            Impostos
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(totals.tax)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">
            Despesas
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(totals.expenses)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">
            Líquido
          </div>
          <div
            className={`text-2xl font-bold ${
              totals.net >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(totals.net)}
          </div>
        </div>
      </div>

      {/* Revenue & Tax Trend */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">
          Receita e Impostos por Mês
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={COLORS.revenue}
              name="Receita"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="totalTax"
              stroke={COLORS.irpj}
              name="Impostos"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tax Breakdown & Expense Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            Distribuição de Impostos
          </h3>
          {taxBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={taxBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taxBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[entry.name.toLowerCase() as keyof typeof COLORS]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Sem dados</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            Distribuição de Despesas
          </h3>
          {expenseBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === 'Impostos'
                          ? COLORS.imposto
                          : COLORS.compromisso
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Sem dados</p>
          )}
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa Mensal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="revenue" fill={COLORS.revenue} name="Receita" />
            <Bar dataKey="totalTax" fill={COLORS.irpj} name="Impostos" />
            <Bar dataKey="expenses" fill={COLORS.expenses} name="Despesas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tax Payment Schedule */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">
          Cronograma de Pagamento de Impostos e Despesas
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Importante:</strong> Os impostos sobre faturamento do mês
            X devem ser pagos no mês X+1.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">

                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Faturamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pagar em
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Receita
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  IRPJ
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  CSLL
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  PIS
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  COFINS
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Despesas
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {taxPaymentSchedule.map((item, idx) => {
                const rowKey = `${item.paymentYear}-${item.paymentMonthNum}`
                const isExpanded = expandedRows.has(rowKey)
                const monthDespesas = getDespesasForMonth(
                  item.paymentYear,
                  item.paymentMonthNum
                )

                return (
                  <>
                    <tr
                      key={idx}
                      className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRow(rowKey)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.earningMonth}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                        {item.paymentMonth}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                        {formatCurrency(item.irpj)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                        {formatCurrency(item.csll)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                        {formatCurrency(item.pis)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                        {formatCurrency(item.cofins)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-orange-600">
                        {formatCurrency(item.despesas)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${idx}-detail`} className="bg-gray-50">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="ml-8">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Despesas de {item.paymentMonth}
                            </h4>
                            {monthDespesas.length > 0 ? (
                              <div className="space-y-2">
                                {monthDespesas.map((despesa) => (
                                  <div
                                    key={despesa.id}
                                    className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200"
                                  >
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900">
                                        {despesa.descricao}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {despesa.tipo === 'imposto'
                                          ? 'Imposto'
                                          : 'Compromisso'}{' '}
                                        •{' '}
                                        {despesa.recorrente
                                          ? 'Recorrente'
                                          : 'Único'}{' '}
                                        • Venc: dia {despesa.dia_vencimento}
                                      </div>
                                    </div>
                                    <div
                                      className={`text-sm font-semibold ${
                                        despesa.tipo === 'imposto'
                                          ? 'text-red-600'
                                          : 'text-orange-600'
                                      }`}
                                    >
                                      {formatCurrency(Number(despesa.valor))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">
                                Nenhuma despesa cadastrada para este mês
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
