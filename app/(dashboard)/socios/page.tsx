'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularINSSSocios, calcularProlaboreMinimo } from '@/lib/calculations/inss'
import { Socio } from '@/types'
import { Input } from '@/components/ui'

export default function SociosPage() {
  const [socios, setSocios] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [percentual, setPercentual] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [valorProlabore, setValorProlabore] = useState('')
  const [showCalculoINSS, setShowCalculoINSS] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadSocios()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSocios = async () => {
    try {
      const { data: sociosData, error } = await supabase
        .from('socios')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      setSocios(sociosData || [])
    } catch (err) {
      console.error('Erro ao carregar sócios:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return cpf
  }

  const handleCPFChange = (value: string) => {
    setCpf(formatCPF(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const percentualNum = parseFloat(percentual)
      if (isNaN(percentualNum) || percentualNum < 0 || percentualNum > 100) {
        throw new Error('Percentual inválido (deve estar entre 0 e 100)')
      }

      // Verificar se a soma dos percentuais não ultrapassa 100%
      const somaAtual = socios.reduce((acc, s) => acc + s.percentual_participacao, 0)
      if (somaAtual + percentualNum > 100) {
        throw new Error(`A soma dos percentuais ultrapassaria 100%. Disponível: ${100 - somaAtual}%`)
      }

      const { error: insertError } = await supabase
        .from('socios')
        .insert({
          nome,
          cpf,
          percentual_participacao: percentualNum,
        })

      if (insertError) throw insertError

      // Resetar formulário
      setNome('')
      setCpf('')
      setPercentual('')
      setShowForm(false)

      // Recarregar lista
      loadSocios()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar sócio')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPercentual = socios.reduce((acc, s) => acc + s.percentual_participacao, 0)
  const prolaboreMinimo = socios.length > 0 ? calcularProlaboreMinimo(socios.length) : 0

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
          <h1 className="text-3xl font-bold text-foreground">Sócios</h1>
          <p className="text-muted-foreground">Gerencie os sócios da empresa</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition"
        >
          {showForm ? 'Cancelar' : 'Novo Sócio'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-foreground">Cadastrar Sócio</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive border border-destructive text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nome Completo
              </label>
              <Input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                CPF
              </label>
              <Input
                type="text"
                value={cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                required
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Percentual de Participação (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                required
                placeholder="0,00"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Disponível: {(100 - totalPercentual).toFixed(2)}%
              </p>
            </div>
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

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold mb-2 text-foreground">Total de Sócios</h3>
          <p className="text-3xl font-bold text-primary">{socios.length}</p>
        </div>
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold mb-2 text-foreground">Pró-labore Mínimo Recomendado</h3>
          <p className="text-3xl font-bold text-success">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prolaboreMinimo)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Baseado no salário mínimo</p>
        </div>
      </div>

      {socios.length > 0 && totalPercentual === 100 && (
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-foreground">Calcular INSS Pró-labore</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Valor Total do Pró-labore (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={valorProlabore}
                onChange={(e) => setValorProlabore(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <button
              onClick={() => setShowCalculoINSS(true)}
              disabled={!valorProlabore || parseFloat(valorProlabore) <= 0}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition disabled:opacity-50"
            >
              Calcular INSS
            </button>

            {showCalculoINSS && valorProlabore && parseFloat(valorProlabore) > 0 && (
              <div className="bg-blue-50 p-4 rounded-md mt-4">
                <h3 className="font-medium text-blue-900 mb-3">Distribuição do INSS:</h3>
                {(() => {
                  const calculo = calcularINSSSocios(parseFloat(valorProlabore), socios)
                  return (
                    <div className="space-y-3">
                      {calculo.socios.map((socio) => (
                        <div key={socio.socio_id} className="bg-card p-3 rounded border border-blue-200">
                          <p className="font-medium text-foreground">{socio.nome}</p>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <p>Pró-labore: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(socio.valor_prolabore)}</p>
                            <p>Alíquota efetiva: {socio.aliquota_inss.toFixed(2)}%</p>
                            <p className="font-bold text-destructive">INSS: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(socio.valor_inss)}</p>
                          </div>
                        </div>
                      ))}
                      <div className="bg-muted p-3 rounded border mt-3">
                        <p className="font-bold text-foreground">
                          Total INSS: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculo.total_inss)}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-sm border">
        {socios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    CPF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                    Participação
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {socios.map((socio) => (
                  <tr key={socio.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {socio.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {socio.cpf}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {socio.percentual_participacao.toFixed(2)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted">
                  <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                    {totalPercentual.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum sócio cadastrado</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary transition"
            >
              Cadastrar Primeiro Sócio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
