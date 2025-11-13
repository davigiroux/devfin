'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularImpostosLucroPresumido } from '@/lib/calculations/impostos'
import { Faturamento } from '@/types'
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import CurrencyInput from 'react-currency-input-field'
import { ptBR } from 'date-fns/locale'
import { format } from 'date-fns'

// Register Brazilian locale for date picker
registerLocale('pt-BR', ptBR)

export default function FaturamentosPage() {
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [data, setData] = useState<Date | null>(null)
  const [valorBruto, setValorBruto] = useState<number | undefined>(undefined)
  const [exportacao, setExportacao] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadFaturamentos()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadFaturamentos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: faturamentosData, error } = await supabase
        .from('faturamentos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('data', { ascending: false })

      if (error) throw error

      setFaturamentos(faturamentosData || [])
    } catch (err) {
      console.error('Erro ao carregar faturamentos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      if (!data) {
        throw new Error('Data é obrigatória')
      }

      if (!valorBruto || valorBruto <= 0) {
        throw new Error('Valor inválido')
      }

      // Format date as YYYY-MM-DD for database
      const dataFormatada = format(data, 'yyyy-MM-dd')

      // Calcular impostos
      const impostos = calcularImpostosLucroPresumido(valorBruto, exportacao)

      // Inserir no banco
      const { error: insertError } = await supabase
        .from('faturamentos')
        .insert({
          data: dataFormatada,
          valor_bruto: valorBruto,
          irpj: impostos.irpj,
          csll: impostos.csll,
          pis: impostos.pis,
          cofins: impostos.cofins,
          total_impostos: impostos.total,
          exportacao,
          usuario_id: user.id,
        })

      if (insertError) throw insertError

      // Resetar formulário
      setData(null)
      setValorBruto(undefined)
      setExportacao(false)
      setShowForm(false)

      // Recarregar lista
      loadFaturamentos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar faturamento')
    } finally {
      setSubmitting(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Faturamentos</h1>
          <p className="text-gray-600">Gerencie seus faturamentos mensais</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          {showForm ? 'Cancelar' : 'Novo Faturamento'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Cadastrar Faturamento</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <DatePicker
                selected={data}
                onChange={(date) => setData(date)}
                dateFormat="dd/MM/yyyy"
                locale="pt-BR"
                placeholderText="Selecione a data"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                wrapperClassName="w-full"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Bruto (R$)
              </label>
              <CurrencyInput
                id="valorBruto"
                name="valorBruto"
                placeholder="0,00"
                value={valorBruto}
                decimalsLimit={2}
                decimalSeparator=","
                groupSeparator="."
                onValueChange={(value) => setValorBruto(value ? parseFloat(value) : undefined)}
                prefix="R$ "
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="exportacao"
                checked={exportacao}
                onChange={(e) => setExportacao(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="exportacao" className="ml-2 block text-sm text-gray-700">
                Exportação de serviços (isento de PIS e COFINS)
              </label>
            </div>
            {valorBruto && valorBruto > 0 && (
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="font-medium text-blue-900 mb-2">Impostos Calculados:</h3>
                {(() => {
                  const impostos = calcularImpostosLucroPresumido(valorBruto, exportacao)
                  return (
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>IRPJ: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.irpj)}</p>
                      <p>CSLL: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.csll)}</p>
                      <p>PIS: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.pis)}</p>
                      <p>COFINS: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.cofins)}</p>
                      <p className="font-bold pt-2 border-t border-blue-200">
                        Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.total)}
                      </p>
                      {exportacao && (
                        <p className="text-xs text-blue-700 pt-2 italic">
                          * PIS e COFINS isentos (exportação de serviços)
                        </p>
                      )}
                    </div>
                  )
                })()}
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
        {faturamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exportação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Bruto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IRPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CSLL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PIS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    COFINS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Impostos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Líquido
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {faturamentos.map((faturamento) => {
                  const liquido = Number(faturamento.valor_bruto) - Number(faturamento.total_impostos)
                  return (
                    <tr key={faturamento.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(faturamento.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {faturamento.exportacao ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Sim
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.valor_bruto))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.irpj))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.csll))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.pis))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.cofins))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.total_impostos))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(liquido)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nenhum faturamento cadastrado</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition"
            >
              Cadastrar Primeiro Faturamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
