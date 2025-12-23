'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularImpostosLucroPresumido, calcularSaldoLiquidoExportacao } from '@/lib/calculations/impostos'
import { calcularValorNotaFiscal, isFutureDate } from '@/lib/services/ptax'
import { usePTAX } from '@/hooks/usePTAX'
import { Faturamento } from '@/types'
import { format } from 'date-fns'
import { DateInput, CurrencyInput, NumberInput, Checkbox } from '@/components/ui'
import Link from 'next/link'

export default function FaturamentosPage() {
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [data, setData] = useState<Date | null>(null)
  const [valorBruto, setValorBruto] = useState<number | undefined>(undefined)
  const [exportacao, setExportacao] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Multi-currency fields for exports
  const [valorUSD, setValorUSD] = useState<number | undefined>(undefined)
  const [valorRecebido, setValorRecebido] = useState<number | undefined>(undefined)
  const [manualPTAX, setManualPTAX] = useState<number | undefined>(undefined)
  const { rate: ptaxRate, loading: ptaxLoading, error: ptaxError, fetchPTAX } = usePTAX()

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

  const handleFetchPTAX = async () => {
    if (!data) {
      setError('Selecione uma data primeiro')
      return
    }

    const dataFormatada = format(data, 'yyyy-MM-dd')

    // Validate not future date for exports
    if (isFutureDate(dataFormatada)) {
      setError('Não é possível buscar PTAX para datas futuras')
      return
    }

    setError('')
    await fetchPTAX(dataFormatada)
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

      const dataFormatada = format(data, 'yyyy-MM-dd')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let insertData: any

      if (exportacao) {
        // Validate export-specific fields
        if (!valorUSD || valorUSD <= 0) {
          throw new Error('Valor USD é obrigatório para exportações')
        }

        const cotacao = manualPTAX || ptaxRate
        if (!cotacao || cotacao <= 0) {
          throw new Error('Busque a cotação PTAX ou insira manualmente')
        }

        // valorRecebido is optional - can be added later

        // Validate not future date
        if (isFutureDate(dataFormatada)) {
          throw new Error('Não é possível usar datas futuras para exportação')
        }

        // Calculate NF value
        const valorNotaFiscal = calcularValorNotaFiscal(valorUSD, cotacao)

        // Calculate taxes on NF value
        const impostos = calcularImpostosLucroPresumido(valorNotaFiscal, true)

        insertData = {
          data: dataFormatada,
          valor_bruto: valorNotaFiscal, // For backward compatibility
          valor_usd: valorUSD,
          cotacao_ptax: cotacao,
          valor_nota_fiscal: valorNotaFiscal,
          valor_recebido: valorRecebido || null, // Optional - can be added later
          irpj: impostos.irpj,
          csll: impostos.csll,
          pis: impostos.pis,
          cofins: impostos.cofins,
          total_impostos: impostos.total,
          exportacao: true,
          usuario_id: user.id,
        }
      } else {
        // Normal faturamento
        if (!valorBruto || valorBruto <= 0) {
          throw new Error('Valor bruto é obrigatório')
        }

        const impostos = calcularImpostosLucroPresumido(valorBruto, false)

        insertData = {
          data: dataFormatada,
          valor_bruto: valorBruto,
          irpj: impostos.irpj,
          csll: impostos.csll,
          pis: impostos.pis,
          cofins: impostos.cofins,
          total_impostos: impostos.total,
          exportacao: false,
          usuario_id: user.id,
        }
      }

      // Insert into database
      const { error: insertError } = await supabase
        .from('faturamentos')
        .insert(insertData)

      if (insertError) throw insertError

      // Reset form
      setData(null)
      setValorBruto(undefined)
      setExportacao(false)
      setValorUSD(undefined)
      setValorRecebido(undefined)
      setManualPTAX(undefined)
      setShowForm(false)

      // Reload list
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
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Faturamentos</h1>
          <p className="text-muted-foreground">Gerencie seus faturamentos mensais</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition"
        >
          {showForm ? 'Cancelar' : 'Novo Faturamento'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-foreground">Cadastrar Faturamento</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive border border-destructive text-destructive-foreground px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Data
              </label>
              <DateInput
                selected={data}
                onChange={(date: Date | null) => setData(date)}
                placeholderText="Selecione a data"
                required
              />
            </div>

            <div className="flex items-center">
              <Checkbox
                id="exportacao"
                checked={exportacao}
                onChange={(e) => setExportacao(e.target.checked)}
              />
              <label htmlFor="exportacao" className="ml-2 block text-sm text-foreground">
                Exportação de serviços (isento de PIS e COFINS)
              </label>
            </div>

            {!exportacao ? (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Valor Bruto (R$)
                </label>
                <CurrencyInput
                  id="valorBruto"
                  name="valorBruto"
                  placeholder="0,00"
                  value={valorBruto}
                  onValueChange={(value, name, values) => setValorBruto(values?.float ?? undefined)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-4 transition-all duration-200">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Valor Invoice (USD)
                  </label>
                  <CurrencyInput
                    id="valorUSD"
                    name="valorUSD"
                    placeholder="0.00"
                    value={valorUSD}
                    onValueChange={(value, name, values) => setValorUSD(values?.float ?? undefined)}
                    prefix="$"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Cotação PTAX
                    <span className="text-xs text-muted-foreground ml-2">
                      (Taxa oficial Banco Central)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <NumberInput
                      id="cotacaoPTAX"
                      name="cotacaoPTAX"
                      placeholder="0.0000"
                      value={manualPTAX || ptaxRate || undefined}
                      onValueChange={setManualPTAX}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleFetchPTAX}
                      disabled={!data || ptaxLoading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {ptaxLoading ? 'Buscando...' : 'Buscar PTAX'}
                    </button>
                  </div>
                  {ptaxError && (
                    <p className="text-xs text-destructive mt-1">{ptaxError}</p>
                  )}
                </div>

                {valorUSD && (manualPTAX || ptaxRate) && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Valor Nota Fiscal (R$)
                      <span className="text-xs text-muted-foreground ml-2">
                        (Calculado: USD × PTAX)
                      </span>
                    </label>
                    <div className="bg-muted px-4 py-3 rounded-md text-foreground font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        calcularValorNotaFiscal(valorUSD, manualPTAX || ptaxRate || 0)
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Valor Recebido (R$)
                    <span className="text-xs text-muted-foreground ml-2">
                      (Opcional - pode adicionar depois)
                    </span>
                  </label>
                  <CurrencyInput
                    id="valorRecebido"
                    name="valorRecebido"
                    placeholder="0,00"
                    value={valorRecebido}
                    onValueChange={(value, name, values) => setValorRecebido(values?.float ?? undefined)}
                  />
                </div>
              </div>
            )}
            {((valorBruto && valorBruto > 0 && !exportacao) ||
              (exportacao && valorUSD && (manualPTAX || ptaxRate))) && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Resumo:</h3>
                {(() => {
                  if (exportacao && valorUSD && (manualPTAX || ptaxRate)) {
                    const cotacao = manualPTAX || ptaxRate || 0
                    const valorNF = calcularValorNotaFiscal(valorUSD, cotacao)
                    const impostos = calcularImpostosLucroPresumido(valorNF, true)
                    const saldoLiquido = valorRecebido ? calcularSaldoLiquidoExportacao(valorNF, valorRecebido) : null

                    return (
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <p>Valor NF: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNF)}</p>
                        <p>IRPJ: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.irpj)}</p>
                        <p>CSLL: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.csll)}</p>
                        <p>PIS: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.pis)} <span className="text-xs">(isento)</span></p>
                        <p>COFINS: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.cofins)} <span className="text-xs">(isento)</span></p>
                        <p className="font-bold pt-2 border-t border-blue-200 dark:border-blue-800">
                          Total Impostos: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.total)}
                        </p>
                        {valorRecebido ? (
                          <>
                            <p>Valor Recebido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorRecebido)}</p>
                            <p className="font-bold text-lg pt-2 border-t border-blue-200 dark:border-blue-800 text-green-700 dark:text-green-400">
                              Saldo Líquido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoLiquido!)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs pt-2 border-t border-blue-200 dark:border-blue-800 text-amber-600 dark:text-amber-400">
                            Preencha o valor recebido para calcular o saldo líquido
                          </p>
                        )}
                      </div>
                    )
                  } else if (valorBruto) {
                    const impostos = calcularImpostosLucroPresumido(valorBruto, false)
                    const liquido = valorBruto - impostos.total

                    return (
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <p>Valor Bruto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorBruto)}</p>
                        <p>IRPJ: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.irpj)}</p>
                        <p>CSLL: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.csll)}</p>
                        <p>PIS: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.pis)}</p>
                        <p>COFINS: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.cofins)}</p>
                        <p className="font-bold pt-2 border-t border-blue-200 dark:border-blue-800">
                          Total Impostos: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impostos.total)}
                        </p>
                        <p className="font-bold text-lg pt-2 border-t border-blue-200 dark:border-blue-800 text-green-700 dark:text-green-400">
                          Líquido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(liquido)}
                        </p>
                      </div>
                    )
                  }
                  return null
                })()}
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
                onClick={() => setShowForm(false)}
                className="bg-secondary text-foreground px-6 py-2 rounded-md hover:bg-muted transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border">
        {faturamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Valor Bruto / NF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Recebido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Impostos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Líquido
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {faturamentos.map((faturamento) => {
                  const isExport = faturamento.exportacao
                  const valorBase = isExport && faturamento.valor_nota_fiscal
                    ? faturamento.valor_nota_fiscal
                    : faturamento.valor_bruto
                  const hasValorRecebido = isExport && faturamento.valor_recebido != null
                  const valorRecebidoFinal = hasValorRecebido
                    ? faturamento.valor_recebido!
                    : faturamento.valor_bruto
                  const liquido = hasValorRecebido || !isExport
                    ? valorRecebidoFinal - Number(faturamento.total_impostos)
                    : null

                  return (
                    <tr key={faturamento.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {new Date(faturamento.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {isExport ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Export
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Nacional
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valorBase))}
                        {isExport && faturamento.valor_usd && (
                          <div className="text-xs text-muted-foreground">
                            ${Number(faturamento.valor_usd).toFixed(2)} × {Number(faturamento.cotacao_ptax).toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {isExport ? (
                          hasValorRecebido ? (
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.valor_recebido))
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              Pendente
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-destructive font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.total_impostos))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {liquido !== null ? (
                          <span className="text-success">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(liquido)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <Link
                          href={`/faturamentos/${faturamento.id}`}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum faturamento cadastrado</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition"
            >
              Cadastrar Primeiro Faturamento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
