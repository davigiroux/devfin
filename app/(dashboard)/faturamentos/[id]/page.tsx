'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Faturamento, DespesaMensal } from '@/types'
import { filtrarDespesasMes } from '@/lib/calculations/caixa'
import { ALIQUOTAS, calcularSaldoLiquidoExportacao } from '@/lib/calculations/impostos'
import { CurrencyInput } from '@/components/ui'
import Link from 'next/link'

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
  const saldoLiquido = hasValorRecebido
    ? calcularSaldoLiquidoExportacao(valorBase, Number(faturamento.valor_recebido))
    : !isExport
      ? Number(faturamento.valor_bruto) - Number(faturamento.total_impostos)
      : null

  const faturamentoDate = new Date(faturamento.data)
  const mesAno = faturamentoDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const totalDespesas = despesasMes.reduce((acc, d) => acc + d.valor, 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/faturamentos" className="text-primary hover:underline text-sm mb-2 inline-block">
          ← Voltar para lista
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            Faturamento - {new Date(faturamento.data).toLocaleDateString('pt-BR')}
          </h1>
          {isExport ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Export
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Nacional
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Main Info Card */}
      <div className="bg-card rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Informações</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Valor {isExport ? 'Nota Fiscal' : 'Bruto'}</p>
            <p className="text-lg font-medium text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorBase)}
            </p>
          </div>

          {isExport && faturamento.valor_usd && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Valor USD</p>
                <p className="text-lg font-medium text-foreground">
                  ${Number(faturamento.valor_usd).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cotação PTAX</p>
                <p className="text-lg font-medium text-foreground">
                  R$ {Number(faturamento.cotacao_ptax).toFixed(4)}
                </p>
              </div>
            </>
          )}

          {isExport && (
            <div className="col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Recebido</p>
                  {!isEditing ? (
                    <div className="flex items-center gap-2">
                      {hasValorRecebido ? (
                        <p className="text-lg font-medium text-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.valor_recebido))}
                        </p>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          Pendente
                        </span>
                      )}
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        {hasValorRecebido ? 'Editar' : 'Adicionar'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <CurrencyInput
                        id="valorRecebido"
                        name="valorRecebido"
                        placeholder="0,00"
                        value={valorRecebido}
                        onValueChange={(value, name, values) => setValorRecebido(values?.float ?? undefined)}
                        className="w-40"
                      />
                      <button
                        onClick={handleSaveValorRecebido}
                        disabled={saving}
                        className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:bg-primary/90 disabled:opacity-50"
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setValorRecebido(faturamento.valor_recebido ?? undefined)
                        }}
                        className="text-muted-foreground hover:text-foreground text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Breakdown Card */}
      <div className="bg-card rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Detalhamento de Impostos</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <div>
              <p className="font-medium text-foreground">IRPJ</p>
              <p className="text-xs text-muted-foreground">{(ALIQUOTAS.IRPJ * 100).toFixed(1)}% sobre valor bruto</p>
            </div>
            <p className="font-medium text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.irpj))}
            </p>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <div>
              <p className="font-medium text-foreground">CSLL</p>
              <p className="text-xs text-muted-foreground">{(ALIQUOTAS.CSLL * 100).toFixed(2)}% sobre valor bruto</p>
            </div>
            <p className="font-medium text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.csll))}
            </p>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <div>
              <p className="font-medium text-foreground">PIS</p>
              <p className="text-xs text-muted-foreground">
                {(ALIQUOTAS.PIS * 100).toFixed(2)}% sobre valor bruto
                {isExport && ' (isento)'}
              </p>
            </div>
            <p className={`font-medium ${isExport ? 'text-muted-foreground' : 'text-foreground'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.pis))}
              {isExport && <span className="text-xs ml-1">(isento)</span>}
            </p>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <div>
              <p className="font-medium text-foreground">COFINS</p>
              <p className="text-xs text-muted-foreground">
                {(ALIQUOTAS.COFINS * 100).toFixed(1)}% sobre valor bruto
                {isExport && ' (isento)'}
              </p>
            </div>
            <p className={`font-medium ${isExport ? 'text-muted-foreground' : 'text-foreground'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.cofins))}
              {isExport && <span className="text-xs ml-1">(isento)</span>}
            </p>
          </div>
          <div className="flex justify-between items-center py-3 bg-muted/50 rounded px-3 -mx-3">
            <p className="font-bold text-foreground">Total Impostos</p>
            <p className="font-bold text-destructive">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(faturamento.total_impostos))}
            </p>
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="mt-6 pt-4 border-t border-border">
          {saldoLiquido !== null ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg text-foreground">Saldo Líquido</p>
                <p className="text-xs text-muted-foreground">
                  {isExport ? 'Valor recebido - impostos' : 'Valor bruto - impostos'}
                </p>
              </div>
              <p className="font-bold text-xl text-success">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoLiquido)}
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-4">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                Preencha o valor recebido para calcular o saldo líquido final.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Despesas do Mês */}
      <div className="bg-card rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">Despesas de {mesAno}</h2>
          <Link href="/despesas" className="text-sm text-primary hover:underline">
            Ver todas →
          </Link>
        </div>

        {despesasMes.length > 0 ? (
          <>
            <div className="space-y-2">
              {despesasMes.map((despesa) => (
                <div key={despesa.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{despesa.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {despesa.tipo === 'imposto' ? 'Imposto' : 'Compromisso'} • Venc. dia {despesa.dia_vencimento}
                    </p>
                  </div>
                  <p className="font-medium text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesa.valor)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
              <p className="font-bold text-foreground">Total Despesas</p>
              <p className="font-bold text-destructive">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}
              </p>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma despesa cadastrada para este mês.</p>
        )}
      </div>

      {/* Delete Section */}
      <div className="bg-card rounded-lg shadow-sm border border-destructive/20 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Zona de Perigo</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Esta ação não pode ser desfeita. O faturamento será permanentemente excluído.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90"
          >
            Excluir Faturamento
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
