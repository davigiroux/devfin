'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, PaymentBadge } from '@/components/ui'
import {
  getQuarterOptions,
  parseQuarter,
  getQuarterDates,
  filterFaturamentosByQuarter,
  filterDespesasByQuarter,
  filterPagamentosByQuarter,
  aggregateFaturamentos,
  aggregateDespesas,
  getCurrentQuarter,
  getQuarterlyComparison,
} from '@/lib/calculations/quarterly'
import type {
  Faturamento,
  DespesaMensal,
  PagamentoDespesa,
  QuarterOption,
  QuarterlyData,
} from '@/types'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [quarterOptions] = useState<QuarterOption[]>(getQuarterOptions())
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    const { year, quarter } = getCurrentQuarter()
    return `${year}-Q${quarter}`
  })

  const [allFaturamentos, setAllFaturamentos] = useState<Faturamento[]>([])
  const [allDespesas, setAllDespesas] = useState<DespesaMensal[]>([])
  const [allPagamentos, setAllPagamentos] = useState<PagamentoDespesa[]>([])

  const [quarterlyData, setQuarterlyData] = useState<QuarterlyData | null>(null)
  const [comparisonData, setComparisonData] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (allFaturamentos.length > 0 || allDespesas.length > 0) {
      calculateQuarterlyData()
    }
  }, [selectedQuarter, allFaturamentos, allDespesas, allPagamentos])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user data
      const { data: userData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      setUserName(userData?.nome_completo || 'Usuário')

      // Fetch all faturamentos
      const { data: faturamentos } = await supabase
        .from('faturamentos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('data', { ascending: false })

      setAllFaturamentos(faturamentos || [])

      // Fetch all despesas
      const { data: despesas } = await supabase
        .from('despesas_mensais')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('ativa', true)
        .order('tipo', { ascending: true })

      setAllDespesas(despesas || [])

      // Fetch all pagamentos
      const { data: pagamentos } = await supabase
        .from('pagamentos_despesas')
        .select('*')
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false })

      setAllPagamentos(pagamentos || [])

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  function calculateQuarterlyData() {
    const { year, quarter } = parseQuarter(selectedQuarter)

    // Filter data for selected quarter
    const quarterFaturamentos = filterFaturamentosByQuarter(allFaturamentos, year, quarter)
    const quarterDespesas = filterDespesasByQuarter(allDespesas, year, quarter)
    const quarterPagamentos = filterPagamentosByQuarter(allPagamentos, year, quarter)

    // Aggregate data
    const faturamentos = aggregateFaturamentos(quarterFaturamentos)
    const despesas = aggregateDespesas(quarterDespesas, quarterPagamentos)

    setQuarterlyData({
      year,
      quarter,
      faturamentos,
      despesas,
    })

    // Calculate comparison data for last 4 quarters
    const comparisonQuarters: QuarterlyData[] = []
    let compYear = year
    let compQuarter = quarter

    for (let i = 0; i < 4; i++) {
      const qFaturamentos = filterFaturamentosByQuarter(allFaturamentos, compYear, compQuarter)
      const qDespesas = filterDespesasByQuarter(allDespesas, compYear, compQuarter)
      const qPagamentos = filterPagamentosByQuarter(allPagamentos, compYear, compQuarter)

      comparisonQuarters.unshift({
        year: compYear,
        quarter: compQuarter,
        faturamentos: aggregateFaturamentos(qFaturamentos),
        despesas: aggregateDespesas(qDespesas, qPagamentos),
      })

      compQuarter--
      if (compQuarter < 1) {
        compQuarter = 4
        compYear--
      }
    }

    const comparison = getQuarterlyComparison(comparisonQuarters)
    setComparisonData(comparison.quarters)

    // Prepare monthly breakdown data for bar chart
    const { months } = getQuarterDates(year, quarter)
    const monthlyBreakdown = months.map(month => {
      const monthFaturamentos = quarterFaturamentos.filter(f => {
        const fatDate = new Date(f.data)
        return fatDate.getMonth() + 1 === month
      })

      const monthReceita = monthFaturamentos.reduce((acc, f) => acc + f.valor_bruto, 0)
      const monthImpostos = monthFaturamentos.reduce((acc, f) => acc + f.total_impostos, 0)

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return {
        month: monthNames[month - 1],
        receita: monthReceita,
        impostos: monthImpostos,
      }
    })

    setMonthlyBreakdown(monthlyBreakdown)
  }

  const [monthlyBreakdown, setMonthlyBreakdown] = useState<any[]>([])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Trimestral
          </h1>
          <p className="text-gray-600">Visão geral por trimestre - Lucro Presumido</p>
        </div>

        <div className="w-48">
          <Select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
          >
            {quarterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Metrics Cards */}
      {quarterlyData && (
        <>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-1">
                Receita Bruta
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(quarterlyData.faturamentos.total_bruto)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {quarterlyData.faturamentos.count} faturamento(s)
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-1">
                Total Impostos
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(quarterlyData.faturamentos.total_impostos)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Sobre faturamentos
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-1">
                Impostos Mensais
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(quarterlyData.despesas.total_impostos)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                DAS, INSS, etc
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm font-medium text-gray-600 mb-1">
                Compromissos
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(quarterlyData.despesas.total_compromissos)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Despesas fixas
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Monthly breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Receita e Impostos por Mês
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="receita" fill="#10b981" name="Receita" />
                  <Bar dataKey="impostos" fill="#ef4444" name="Impostos" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* QoQ comparison */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Evolução Trimestral
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#10b981"
                    name="Receita"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="impostos"
                    stroke="#ef4444"
                    name="Impostos"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables */}
          <div className="space-y-6">
            {/* Faturamentos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Faturamentos do Trimestre
              </h3>
              {quarterlyData.faturamentos.faturamentos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Data
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Valor Bruto
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Impostos
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Exportação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quarterlyData.faturamentos.faturamentos.map(fat => (
                        <tr key={fat.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(fat.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">
                            {formatCurrency(fat.valor_bruto)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            {formatCurrency(fat.total_impostos)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {fat.exportacao ? (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Sim
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                Não
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhum faturamento neste trimestre
                </p>
              )}
            </div>

            {/* Tax breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Detalhamento de Impostos sobre Faturamento
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">IRPJ (4.8%)</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(quarterlyData.faturamentos.total_irpj)}
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">CSLL (2.88%)</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(quarterlyData.faturamentos.total_csll)}
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">PIS (0.65%)</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(quarterlyData.faturamentos.total_pis)}
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">COFINS (3%)</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(quarterlyData.faturamentos.total_cofins)}
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly taxes (impostos mensais) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Impostos Mensais
              </h3>
              {quarterlyData.despesas.despesas_impostos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Descrição
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Vencimento
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quarterlyData.despesas.despesas_impostos.map(despesa => {
                        const pagamento = quarterlyData.despesas.pagamentos.find(
                          p => p.despesa_id === despesa.id
                        )
                        return (
                          <tr key={despesa.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {despesa.descricao}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">
                              {formatCurrency(despesa.valor)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">
                              Dia {despesa.dia_vencimento}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {pagamento ? (
                                <PaymentBadge
                                  pago={pagamento.pago}
                                  dataPagamento={pagamento.data_pagamento}
                                />
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhum imposto mensal cadastrado
                </p>
              )}
            </div>

            {/* Commitments (compromissos) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Compromissos
              </h3>
              {quarterlyData.despesas.despesas_compromissos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Descrição
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Vencimento
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quarterlyData.despesas.despesas_compromissos.map(despesa => {
                        const pagamento = quarterlyData.despesas.pagamentos.find(
                          p => p.despesa_id === despesa.id
                        )
                        return (
                          <tr key={despesa.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {despesa.descricao}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">
                              {formatCurrency(despesa.valor)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">
                              Dia {despesa.dia_vencimento}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {pagamento ? (
                                <PaymentBadge
                                  pago={pagamento.pago}
                                  dataPagamento={pagamento.data_pagamento}
                                />
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhum compromisso cadastrado
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
