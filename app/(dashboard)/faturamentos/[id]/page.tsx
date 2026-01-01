'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Faturamento, DespesaMensal } from '@/types'
import { filtrarDespesasMes } from '@/lib/calculations/caixa'
import { ALIQUOTAS, calcularSaldoLiquidoExportacao } from '@/lib/calculations/impostos'
import { CurrencyInput } from '@/components/ui'
import Link from 'next/link'
import { useClipboard } from '@/hooks/useClipboard'
import { generateNFDescription } from '@/lib/services/nf-description'

export default function FaturamentoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [faturamento, setFaturamento] = useState<Faturamento | null>(null)
  const [despesasMes, setDespesasMes] = useState<DespesaMensal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [valorRecebido, setValorRecebido] = useState<number | undefined>()
  const [saving, setSaving] = useState(false)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Despesas toggle state
  const [includeDespesas, setIncludeDespesas] = useState(true)

  // Clipboard hook
  const { copying, success: copySuccess, error: copyError, copyToClipboard } = useClipboard()

  const supabase = createClient()

  useEffect(() => {
    loadFaturamento()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadFaturamento = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load faturamento
      const { data: faturamentoData, error: faturamentoError } = await supabase
        .from('faturamentos')
        .select('*')
        .eq('id', id)
        .eq('usuario_id', user.id)
        .single()

      if (faturamentoError) throw faturamentoError
      if (!faturamentoData) {
        router.push('/faturamentos')
        return
      }

      setFaturamento(faturamentoData)
      setValorRecebido(faturamentoData.valor_recebido != null ? faturamentoData.valor_recebido : undefined)

      // Load despesas for the same month
      const faturamentoDate = new Date(faturamentoData.data)
      const mes = faturamentoDate.getMonth() + 1
      const ano = faturamentoDate.getFullYear()

      const { data: despesasData } = await supabase
        .from('despesas_mensais')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('ativa', true)

      if (despesasData) {
        const despesasFiltradas = filtrarDespesasMes(despesasData, mes, ano)
        setDespesasMes(despesasFiltradas)
      }
    } catch (err) {
      console.error('Erro ao carregar faturamento:', err)
      setError('Erro ao carregar faturamento')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveValorRecebido = async () => {
    if (!faturamento) return

    setSaving(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('faturamentos')
        .update({ valor_recebido: valorRecebido || null })
        .eq('id', faturamento.id)

      if (updateError) throw updateError

      setFaturamento({ ...faturamento, valor_recebido: valorRecebido ?? null })
      setIsEditing(false)
    } catch {
      setError('Erro ao salvar valor recebido')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!faturamento) return

    setDeleting(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('faturamentos')
        .delete()
        .eq('id', faturamento.id)

      if (deleteError) throw deleteError

      router.push('/faturamentos')
    } catch {
      setError('Erro ao excluir faturamento')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCopyNFDescription = async () => {
    if (!faturamento) return
    try {
      const description = generateNFDescription(faturamento)
      await copyToClipboard(description)
    } catch (err) {
      console.error('Erro ao gerar descrição:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!faturamento) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Faturamento não encontrado</p>
        <Link href="/faturamentos" className="text-primary hover:underline mt-2 inline-block">
          Voltar para lista
        </Link>
      </div>
    )
  }

  const isExport = faturamento.exportacao
  const valorBase = isExport && faturamento.valor_nota_fiscal
    ? Number(faturamento.valor_nota_fiscal)
    : Number(faturamento.valor_bruto)
  const hasValorRecebido = isExport && faturamento.valor_recebido != null

  const faturamentoDate = new Date(faturamento.data)
  const mesAno = faturamentoDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const totalDespesas = despesasMes.reduce((acc, d) => acc + d.valor, 0)

  const saldoLiquidoSemDespesas = hasValorRecebido
    ? calcularSaldoLiquidoExportacao(valorBase, Number(faturamento.valor_recebido))
    : !isExport
      ? Number(faturamento.valor_bruto) - Number(faturamento.total_impostos)
      : null

  const saldoLiquido = saldoLiquidoSemDespesas !== null
    ? (includeDespesas ? saldoLiquidoSemDespesas - totalDespesas : saldoLiquidoSemDespesas)
    : null

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/faturamentos" className="text-primary hover:text-primary/80 text-sm mb-3 inline-flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para lista
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              {new Date(faturamento.data).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
            </h1>
            {isExport ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                Export
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Nacional
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(faturamento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Main Info Card */}
      <div className="bg-card rounded-xl shadow-sm border p-8 mb-8">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Informações
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Valor {isExport ? 'Nota Fiscal' : 'Bruto'}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorBase)}
            </p>
          </div>

          {isExport && faturamento.valor_usd && (
            <>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Valor USD</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${Number(faturamento.valor_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Cotação PTAX</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {Number(faturamento.cotacao_ptax).toFixed(4)}
                </p>
              </div>
            </>
          )}

          {isExport && faturamento.valor_usd && faturamento.cotacao_ptax && (
            <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t border-border/50">
              <button
                onClick={handleCopyNFDescription}
                disabled={copying}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copySuccess
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                    : copyError
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {copying ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Copiando...
                  </>
                ) : copySuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copiado!
                  </>
                ) : copyError ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {copyError}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Descrição para NF
                  </>
                )}
              </button>
            </div>
          )}

          {isExport && (
            <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t border-border/50">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Valor Recebido</p>
                {!isEditing ? (
                  <div className="flex items-center gap-3">
                    {hasValorRecebido ? (
                      <p className="text-2xl font-bold text-foreground">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.valor_recebido))}
                      </p>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Pendente
                      </span>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      {hasValorRecebido ? 'Editar' : 'Adicionar'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <CurrencyInput
                      id="valorRecebido"
                      name="valorRecebido"
                      placeholder="0,00"
                      value={valorRecebido}
                      onValueChange={(value, name, values) => setValorRecebido(values?.float ?? undefined)}
                      className="w-48"
                    />
                    <button
                      onClick={handleSaveValorRecebido}
                      disabled={saving}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setValorRecebido(faturamento.valor_recebido ?? undefined)
                      }}
                      className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Breakdown Card */}
      <div className="bg-card rounded-xl shadow-sm border p-8 mb-8">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          Detalhamento de Impostos
        </h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div>
              <p className="font-semibold text-foreground">IRPJ</p>
              <p className="text-xs text-muted-foreground">{(ALIQUOTAS.IRPJ * 100).toFixed(1)}% sobre valor bruto</p>
            </div>
            <p className="font-bold text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.irpj))}
            </p>
          </div>
          <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div>
              <p className="font-semibold text-foreground">CSLL</p>
              <p className="text-xs text-muted-foreground">{(ALIQUOTAS.CSLL * 100).toFixed(2)}% sobre valor bruto</p>
            </div>
            <p className="font-bold text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.csll))}
            </p>
          </div>
          <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div>
              <p className="font-semibold text-foreground">PIS</p>
              <p className="text-xs text-muted-foreground">
                {(ALIQUOTAS.PIS * 100).toFixed(2)}% sobre valor bruto
                {isExport && ' (isento)'}
              </p>
            </div>
            <p className={`font-bold ${isExport ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.pis))}
              {isExport && <span className="text-xs ml-2 no-underline">(isento)</span>}
            </p>
          </div>
          <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div>
              <p className="font-semibold text-foreground">COFINS</p>
              <p className="text-xs text-muted-foreground">
                {(ALIQUOTAS.COFINS * 100).toFixed(1)}% sobre valor bruto
                {isExport && ' (isento)'}
              </p>
            </div>
            <p className={`font-bold ${isExport ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.cofins))}
              {isExport && <span className="text-xs ml-2 no-underline">(isento)</span>}
            </p>
          </div>
          <div className="flex justify-between items-center py-4 px-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="font-bold text-foreground">Total Impostos</p>
            <p className="font-bold text-xl text-destructive">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.total_impostos))}
            </p>
          </div>
        </div>

        {/* Despesas do Mês */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Despesas de {mesAno.replace(/^\w/, c => c.toUpperCase())}
              </h3>
              <button
                onClick={() => setIncludeDespesas(!includeDespesas)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  includeDespesas
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {includeDespesas ? 'Incluídas' : 'Excluídas'}
              </button>
            </div>
            <Link href="/despesas" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1">
              Ver todas
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {includeDespesas && (
            <>
              {despesasMes.length > 0 ? (
                <>
                  <div className="space-y-3">
              {despesasMes.map((despesa) => (
                <div key={despesa.id} className="flex justify-between items-center py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-semibold text-foreground">{despesa.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        despesa.tipo === 'imposto'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      }`}>
                        {despesa.tipo === 'imposto' ? 'Imposto' : 'Compromisso'}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Venc. dia {despesa.dia_vencimento}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesa.valor)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-border/50 flex justify-between items-center py-3 px-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="font-bold text-foreground">Total Despesas</p>
              <p className="font-bold text-xl text-destructive">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-muted-foreground text-sm">Nenhuma despesa cadastrada para este mês.</p>
          </div>
        )}
              </>
            )}
        </div>

        {/* Saldo Líquido */}
        <div className="mt-6 pt-6 border-t border-border/50">
          {saldoLiquido !== null ? (
            <div className="flex justify-between items-center py-4 px-4 rounded-lg bg-success/10 border border-success/20">
              <div>
                <p className="font-bold text-lg text-foreground">Saldo Líquido</p>
                <p className="text-xs text-muted-foreground">
                  {isExport
                    ? `Valor recebido - impostos${includeDespesas ? ' - despesas' : ''}`
                    : `Valor bruto - impostos${includeDespesas ? ' - despesas' : ''}`}
                </p>
              </div>
              <p className={`font-bold text-2xl ${saldoLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoLiquido)}
              </p>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-amber-600 dark:text-amber-400 text-sm">
                Preencha o valor recebido para calcular o saldo líquido final.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Section */}
      <div className="bg-card rounded-xl shadow-sm border border-destructive/30 p-8">
        <div className="flex items-start gap-3 mb-4">
          <svg className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Zona de Perigo</h2>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. O faturamento será permanentemente excluído.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-destructive text-destructive-foreground px-5 py-2.5 rounded-lg hover:bg-destructive/90 font-medium transition-colors"
          >
            Excluir Faturamento
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
            <p className="text-sm text-foreground font-medium flex-grow">Tem certeza? Esta ação é permanente.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 disabled:opacity-50 font-medium transition-colors"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-muted/80 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
