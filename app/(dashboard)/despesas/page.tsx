'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DespesaMensal, PagamentoDespesa } from '@/types'
import { calcularCaixaNecessario } from '@/lib/calculations/caixa'
import CurrencyInput from 'react-currency-input-field'

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<DespesaMensal[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoDespesa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
          usuario_id: user.id,
        })

      if (insertError) throw insertError

      // Reset form
      setDescricao('')
      setTipo('imposto')
      setValor(undefined)
      setDiaVencimento(1)
      setRecorrente(true)
      setShowForm(false)

      // Reload list
      loadDespesas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar despesa')
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
        const { error } = await supabase
          .from('pagamentos_despesas')
          .update({
            pago: !pagamentoExistente.pago,
            data_pagamento: !pagamentoExistente.pago ? new Date().toISOString().split('T')[0] : null
          })
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
            data_pagamento: new Date().toISOString().split('T')[0]
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

  const caixaNecessario = calcularCaixaNecessario(despesas, mesView, anoView)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Despesas Mensais</h1>
          <p className="text-gray-600">Gerencie despesas recorrentes e únicas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          {showForm ? 'Cancelar' : 'Nova Despesa'}
        </button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total Mensal</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixaNecessario.total_despesas)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Impostos</div>
          <div className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixaNecessario.despesas_impostos)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Compromissos</div>
          <div className="text-2xl font-bold text-orange-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixaNecessario.despesas_compromissos)}
          </div>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Visualizar:</label>
        <select
          value={mesView}
          onChange={(e) => setMesView(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
        </select>
        <input
          type="number"
          value={anoView}
          onChange={(e) => setAnoView(Number(e.target.value))}
          min="2000"
          max="2100"
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-24"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Cadastrar Despesa</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: INSS, Aluguel, etc."
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'imposto' | 'compromisso')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="imposto">Imposto</option>
                <option value="compromisso">Compromisso</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$)
              </label>
              <CurrencyInput
                id="valor"
                name="valor"
                placeholder="0,00"
                value={valor}
                decimalsLimit={2}
                decimalSeparator=","
                groupSeparator="."
                onValueChange={(value) => setValor(value ? parseFloat(value) : undefined)}
                prefix="R$ "
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dia de Vencimento
              </label>
              <input
                type="number"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(Number(e.target.value))}
                min="1"
                max="31"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="recorrente"
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="recorrente" className="ml-2 block text-sm text-gray-700">
                Despesa recorrente (todos os meses)
              </label>
            </div>
            {!recorrente && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mês
                  </label>
                  <select
                    value={mesReferencia}
                    onChange={(e) => setMesReferencia(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={anoReferencia}
                    onChange={(e) => setAnoReferencia(Number(e.target.value))}
                    min="2000"
                    max="2100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {caixaNecessario.despesas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recorrência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {caixaNecessario.despesas.map((despesa) => (
                  <tr key={despesa.id} className={!despesa.ativa ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesa.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      Dia {despesa.dia_vencimento}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {despesa.recorrente ? (
                        <span className="text-green-600">Mensal</span>
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
                      <button
                        onClick={() => toggleDespesaAtiva(despesa)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {despesa.ativa ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nenhuma despesa para {mesView}/{anoView}</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition"
            >
              Cadastrar Primeira Despesa
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
