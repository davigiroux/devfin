'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DespesaMensal, PagamentoDespesa } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ExpenseHistoryModalProps {
  despesaId: string
  onClose: () => void
}

export default function ExpenseHistoryModal({ despesaId, onClose }: ExpenseHistoryModalProps) {
  const [versions, setVersions] = useState<DespesaMensal[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoDespesa[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despesaId])

  const loadHistory = async () => {
    try {
      // Load all versions of this expense by following the version chain
      const allVersions: DespesaMensal[] = []

      // First, get the current expense
      const { data: currentExpense, error: currentError } = await supabase
        .from('despesas_mensais')
        .select('*')
        .eq('id', despesaId)
        .single()

      if (currentError) throw currentError
      if (!currentExpense) return

      allVersions.push(currentExpense)

      // Then, get all previous versions
      let currentId = currentExpense.previous_version_id
      while (currentId) {
        const { data: prevExpense, error: prevError } = await supabase
          .from('despesas_mensais')
          .select('*')
          .eq('id', currentId)
          .single()

        if (prevError || !prevExpense) break

        allVersions.push(prevExpense)
        currentId = prevExpense.previous_version_id
      }

      // Also get all future versions (where this expense is the previous_version_id)
      const { data: futureVersions, error: futureError } = await supabase
        .from('despesas_mensais')
        .select('*')
        .eq('previous_version_id', despesaId)

      if (!futureError && futureVersions) {
        allVersions.push(...futureVersions)
      }

      // Sort by version number descending (newest first)
      allVersions.sort((a, b) => b.version - a.version)
      setVersions(allVersions)

      // Load all payments for all versions of this expense
      const allVersionIds = allVersions.map(v => v.id)
      const { data: pagamentosData, error: pagamentosError } = await supabase
        .from('pagamentos_despesas')
        .select('*')
        .in('despesa_id', allVersionIds)
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false })

      if (pagamentosError) throw pagamentosError

      setPagamentos(pagamentosData || [])
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setLoading(false)
    }
  }

  const getVersionForPagamento = (pagamento: PagamentoDespesa) => {
    return versions.find(v => v.id === pagamento.despesa_id)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Histórico da Despesa</h2>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-600">Carregando...</div>
          ) : (
            <div className="space-y-8">
              {/* Versions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Versões</h3>
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 rounded-lg border ${
                        version.ativa
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {version.descricao}
                            {version.ativa && (
                              <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded">
                                Atual
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Versão {version.version} • Efetivo desde{' '}
                            {format(new Date(version.effective_from), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(version.valor)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {version.tipo === 'imposto' ? 'Imposto' : 'Compromisso'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Vencimento: Dia {version.dia_vencimento} •{' '}
                        {version.recorrente ? (
                          <span className="text-green-600">Recorrente</span>
                        ) : (
                          <span>
                            {version.mes_referencia}/{version.ano_referencia}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Pagamentos</h3>
                {pagamentos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Mês/Ano
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Versão
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Valor Pago
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Data Pagamento
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pagamentos.map((pagamento) => {
                          const version = getVersionForPagamento(pagamento)
                          return (
                            <tr key={pagamento.id}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {pagamento.mes_referencia}/{pagamento.ano_referencia}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                v{version?.version || '?'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {pagamento.valor_pago
                                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.valor_pago)
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    pagamento.pago
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {pagamento.pago ? 'Pago' : 'Pendente'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {pagamento.data_pagamento
                                  ? format(new Date(pagamento.data_pagamento), 'dd/MM/yyyy', { locale: ptBR })
                                  : '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    Nenhum pagamento registrado
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
