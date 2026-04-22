'use client'

import { useState, useEffect } from 'react'
import { DespesaMensal, PagamentoDespesa } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { loadExpenseHistory } from './ExpenseHistoryModal.actions'

interface ExpenseHistoryModalProps {
  despesaId: string
  onClose: () => void
}

export default function ExpenseHistoryModal({ despesaId, onClose }: ExpenseHistoryModalProps) {
  const [versions, setVersions] = useState<DespesaMensal[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoDespesa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despesaId])

  const loadHistory = async () => {
    try {
      const { versions, pagamentos } = await loadExpenseHistory(despesaId)
      setVersions(versions as DespesaMensal[])
      setPagamentos(pagamentos as PagamentoDespesa[])
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Histórico da Despesa</h2>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="space-y-8">
              {/* Versions */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Versões</h3>
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 rounded-lg border ${
                        version.ativa
                          ? 'border-success/40 bg-success/10'
                          : 'border-border bg-muted'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-foreground">
                            {version.descricao}
                            {version.ativa && (
                              <span className="ml-2 text-xs bg-success text-success-foreground px-2 py-1 rounded">
                                Atual
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Versão {version.version} • Efetivo desde{' '}
                            {format(new Date(version.effective_from), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(version.valor)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {version.tipo === 'imposto' ? 'Imposto' : 'Compromisso'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Vencimento: Dia {version.dia_vencimento} •{' '}
                        {version.recorrente ? (
                          <span className="text-success">Recorrente</span>
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
                <h3 className="text-lg font-semibold text-foreground mb-4">Histórico de Pagamentos</h3>
                {pagamentos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border border border-border rounded-lg">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                            Mês/Ano
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                            Versão
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                            Valor Pago
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                            Data Pagamento
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {pagamentos.map((pagamento) => {
                          const version = getVersionForPagamento(pagamento)
                          return (
                            <tr key={pagamento.id}>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {pagamento.mes_referencia}/{pagamento.ano_referencia}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                v{version?.version || '?'}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {pagamento.valor_pago
                                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pagamento.valor_pago)
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    pagamento.pago
                                      ? 'bg-success/15 text-success'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {pagamento.pago ? 'Pago' : 'Pendente'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
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
                  <div className="text-center py-8 text-muted-foreground bg-muted rounded-lg border border-border">
                    Nenhum pagamento registrado
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-muted text-foreground px-6 py-2 rounded-md hover:bg-muted/70 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
