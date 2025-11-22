'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DespesaMensal, PagamentoDespesa } from '@/types'
import { calcularCaixaNecessario } from '@/lib/calculations/caixa'
import { Input, Select, Checkbox, CurrencyInput as CurrencyInputComponent, DateInput } from '@/components/ui'
import { format } from 'date-fns'
import ExpenseHistoryModal from '@/components/ExpenseHistoryModal'

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<DespesaMensal[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoDespesa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingDespesa, setEditingDespesa] = useState<DespesaMensal | null>(null)
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null)

  // Current month view
  const now = new Date()
  const [mesView, setMesView] = useState(now.getMonth() + 1)
  const [anoView, setAnoView] = useState(now.getFullYear())

  // Form state
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<'imposto' | 'compromisso'>('imposto')
  const [valor, setValor] = useState<number | undefined>(undefined)
  const [diaVencimento, setDiaVencimento] = useState<number>(1)
  const [recorrente, setRecorrente] = useState(true)
  const [mesReferencia, setMesReferencia] = useState<number>(now.getMonth() + 1)
  const [anoReferencia, setAnoReferencia] = useState<number>(now.getFullYear())
  const [effectiveFrom, setEffectiveFrom] = useState<Date | null>(new Date(now.getFullYear(), now.getMonth(), 1))

  const supabase = createClient()

  useEffect(() => {
    loadDespesas()
    loadPagamentos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesView, anoView])

  const loadDespesas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: despesasData, error } = await supabase
        .from('despesas_mensais')
        .select('*')
        .eq('usuario_id', user.id)
        .order('tipo', { ascending: true })
        .order('descricao', { ascending: true })

      if (error) throw error

      setDespesas(despesasData || [])
    } catch (err) {
      console.error('Erro ao carregar despesas:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPagamentos = async () => {
    try {
      const { data: pagamentosData, error } = await supabase
        .from('pagamentos_despesas')
        .select('*')
        .eq('mes_referencia', mesView)
        .eq('ano_referencia', anoView)

      if (error) throw error

      setPagamentos(pagamentosData || [])
    } catch (err) {
      console.error('Erro ao carregar pagamentos:', err)
    }
  }

  const startEdit = (despesa: DespesaMensal) => {
    setEditingDespesa(despesa)
    setDescricao(despesa.descricao)
    setTipo(despesa.tipo)
    setValor(despesa.valor)
    setDiaVencimento(despesa.dia_vencimento)
    setRecorrente(despesa.recorrente)
    setMesReferencia(despesa.mes_referencia || now.getMonth() + 1)
    setAnoReferencia(despesa.ano_referencia || now.getFullYear())
    setEffectiveFrom(new Date())
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingDespesa(null)
    setDescricao('')
    setTipo('imposto')
    setValor(undefined)
    setDiaVencimento(1)
    setRecorrente(true)
    setEffectiveFrom(new Date(now.getFullYear(), now.getMonth(), 1))
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      if (!descricao.trim()) {
        throw new Error('Descrição é obrigatória')
      }

      if (!valor || valor <= 0) {
        throw new Error('Valor deve ser maior que zero')
      }

      if (diaVencimento < 1 || diaVencimento > 31) {
        throw new Error('Dia de vencimento deve estar entre 1 e 31')
      }

      if (!recorrente && (!mesReferencia || !anoReferencia)) {
        throw new Error('Despesas não recorrentes devem ter mês e ano de referência')
      }

      if (!effectiveFrom) {
        throw new Error('Data efetiva é obrigatória')
      }

      if (editingDespesa) {
        // Editing: deactivate old version and create new version
        const { error: deactivateError } = await supabase
          .from('despesas_mensais')
          .update({ ativa: false })
          .eq('id', editingDespesa.id)

        if (deactivateError) throw deactivateError

        const { error: insertError } = await supabase
          .from('despesas_mensais')
          .insert({
            descricao,
            tipo,
            valor,
            dia_vencimento: diaVencimento,
            recorrente,
            mes_referencia: recorrente ? null : mesReferencia,
            ano_referencia: recorrente ? null : anoReferencia,
            effective_from: format(effectiveFrom, 'yyyy-MM-dd'),
            version: editingDespesa.version + 1,
            previous_version_id: editingDespesa.id,
            usuario_id: user.id,
          })

        if (insertError) throw insertError
      } else {
        // Creating new expense
        const { error: insertError } = await supabase
          .from('despesas_mensais')
          .insert({
            descricao,
            tipo,
            valor,
            dia_vencimento: diaVencimento,
            recorrente,
            mes_referencia: recorrente ? null : mesReferencia,
            ano_referencia: recorrente ? null : anoReferencia,
            effective_from: format(effectiveFrom, 'yyyy-MM-dd'),
            usuario_id: user.id,
          })

        if (insertError) throw insertError
      }

      // Reset form
      cancelEdit()

      // Reload list
      loadDespesas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar despesa')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleDespesaAtiva = async (despesa: DespesaMensal) => {
    try {
      const { error } = await supabase
        .from('despesas_mensais')
        .update({ ativa: !despesa.ativa })
        .eq('id', despesa.id)

      if (error) throw error

      loadDespesas()
    } catch (err) {
      console.error('Erro ao atualizar despesa:', err)
    }
  }

  const togglePagamento = async (despesa: DespesaMensal) => {
    try {
      const pagamentoExistente = pagamentos.find(
        p => p.despesa_id === despesa.id && p.mes_referencia === mesView && p.ano_referencia === anoView
      )

      if (pagamentoExistente) {
        const updateData: {
          pago: boolean
          data_pagamento: string | null
          valor_pago?: number
        } = {
          pago: !pagamentoExistente.pago,
          data_pagamento: !pagamentoExistente.pago ? new Date().toISOString().split('T')[0] : null
        }

        // Snapshot valor when marking as paid
        if (!pagamentoExistente.pago) {
          updateData.valor_pago = despesa.valor
        }

        const { error } = await supabase
          .from('pagamentos_despesas')
          .update(updateData)
          .eq('id', pagamentoExistente.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('pagamentos_despesas')
          .insert({
            despesa_id: despesa.id,
            mes_referencia: mesView,
            ano_referencia: anoView,
            pago: true,
            data_pagamento: new Date().toISOString().split('T')[0],
            valor_pago: despesa.valor
          })

        if (error) throw error
      }

      loadPagamentos()
    } catch (err) {
      console.error('Erro ao atualizar pagamento:', err)
    }
  }

  const getPagamentoStatus = (despesaId: string) => {
    const pagamento = pagamentos.find(
      p => p.despesa_id === despesaId && p.mes_referencia === mesView && p.ano_referencia === anoView
    )
    return pagamento?.pago || false
  }

  const caixaNecessario = calcularCaixaNecessario(despesas, pagamentos, mesView, anoView)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Despesas Mensais</h1>
          <p className="text-muted-foreground">Gerencie despesas recorrentes e únicas</p>
        </div>
        <button
          onClick={() => showForm ? cancelEdit() : setShowForm(true)}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition"
        >
          {showForm ? 'Cancelar' : 'Nova Despesa'}
        </button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <div className="text-sm text-muted-foreground mb-1">Total Mensal</div>
          <div className="text-2xl font-bold text-foreground">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixaNecessario.total_despesas)}
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <div className="text-sm text-muted-foreground mb-1">Impostos</div>
          <div className="text-2xl font-bold text-destructive">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixaNecessario.despesas_impostos)}
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <div className="text-sm text-muted-foreground mb-1">Compromissos</div>
          <div className="text-2xl font-bold text-warning">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixaNecessario.despesas_compromissos)}
          </div>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-foreground">Visualizar:</label>
        <Select
          value={mesView}
          onChange={(e) => setMesView(Number(e.target.value))}
        >
          <option value={1}>Janeiro</option>
          <option value={2}>Fevereiro</option>
          <option value={3}>Março</option>
          <option value={4}>Abril</option>
          <option value={5}>Maio</option>
          <option value={6}>Junho</option>
          <option value={7}>Julho</option>
          <option value={8}>Agosto</option>
          <option value={9}>Setembro</option>
          <option value={10}>Outubro</option>
          <option value={11}>Novembro</option>
          <option value={12}>Dezembro</option>
        </Select>
        <Input
          type="number"
          value={anoView}
          onChange={(e) => setAnoView(Number(e.target.value))}
          min="2000"
          max="2100"
          className="w-24"
        />
      </div>

      {showForm && (
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-foreground">
            {editingDespesa ? 'Editar Despesa (Nova Versão)' : 'Cadastrar Despesa'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive border border-destructive text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Descrição
              </label>
              <Input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: INSS, Aluguel, etc."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tipo
              </label>
              <Select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'imposto' | 'compromisso')}
              >
                <option value="imposto">Imposto</option>
                <option value="compromisso">Compromisso</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Valor (R$)
              </label>
              <CurrencyInputComponent
                id="valor"
                name="valor"
                placeholder="0,00"
                value={valor}
                onValueChange={(value, name, values) => setValor(values?.float ?? undefined)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Dia de Vencimento
              </label>
              <Input
                type="number"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(Number(e.target.value))}
                min="1"
                max="31"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Data Efetiva (a partir de)
              </label>
              <DateInput
                selected={effectiveFrom}
                onChange={(date: Date | null) => setEffectiveFrom(date)}
                placeholderText="Selecione a data"
                required
              />
            </div>
            <div className="flex items-center">
              <Checkbox
                id="recorrente"
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
              />
              <label htmlFor="recorrente" className="ml-2 block text-sm text-foreground">
                Despesa recorrente (todos os meses)
              </label>
            </div>
            {!recorrente && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Mês
                  </label>
                  <Select
                    value={mesReferencia}
                    onChange={(e) => setMesReferencia(Number(e.target.value))}
                  >
                    <option value={1}>Janeiro</option>
                    <option value={2}>Fevereiro</option>
                    <option value={3}>Março</option>
                    <option value={4}>Abril</option>
                    <option value={5}>Maio</option>
                    <option value={6}>Junho</option>
                    <option value={7}>Julho</option>
                    <option value={8}>Agosto</option>
                    <option value={9}>Setembro</option>
                    <option value={10}>Outubro</option>
                    <option value={11}>Novembro</option>
                    <option value={12}>Dezembro</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Ano
                  </label>
                  <Input
                    type="number"
                    value={anoReferencia}
                    onChange={(e) => setAnoReferencia(Number(e.target.value))}
                    min="2000"
                    max="2100"
                  />
                </div>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-secondary text-foreground px-6 py-2 rounded-md hover:bg-muted transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border">
        {caixaNecessario.despesas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Recorrência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {caixaNecessario.despesas.map((despesa) => (
                  <tr key={despesa.id} className={!despesa.ativa ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {despesa.descricao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        despesa.tipo === 'imposto'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {despesa.tipo === 'imposto' ? 'Imposto' : 'Compromisso'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesa.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      Dia {despesa.dia_vencimento}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {despesa.recorrente ? (
                        <span className="text-success">Mensal</span>
                      ) : (
                        <span className="text-blue-600">
                          {despesa.mes_referencia}/{despesa.ano_referencia}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        despesa.ativa
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {despesa.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => togglePagamento(despesa)}
                        disabled={!despesa.ativa}
                        className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition ${
                          getPagamentoStatus(despesa.id)
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {getPagamentoStatus(despesa.id) ? '✓ Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setViewingHistoryId(despesa.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Histórico
                        </button>
                        <button
                          onClick={() => startEdit(despesa)}
                          disabled={!despesa.ativa}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleDespesaAtiva(despesa)}
                          className="text-primary hover:text-foreground"
                        >
                          {despesa.ativa ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma despesa para {mesView}/{anoView}</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition"
            >
              Cadastrar Primeira Despesa
            </button>
          </div>
        )}
      </div>

      {viewingHistoryId && (
        <ExpenseHistoryModal
          despesaId={viewingHistoryId}
          onClose={() => setViewingHistoryId(null)}
        />
      )}
    </div>
  )
}
