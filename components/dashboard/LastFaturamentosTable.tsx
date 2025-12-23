'use client'

import { Faturamento } from '@/types'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface LastFaturamentosTableProps {
  faturamentos: Faturamento[]
}

export default function LastFaturamentosTable({ faturamentos }: LastFaturamentosTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  // Get last 5 faturamentos, sorted by date descending
  const lastFive = [...faturamentos]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5)

  if (lastFive.length === 0) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Últimos Faturamentos
        </h3>
        <p className="text-muted-foreground text-center py-8">
          Nenhum faturamento cadastrado
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Últimos Faturamentos
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-foreground uppercase">
                Data
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                Valor
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                USD (PTAX)
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                Valor Real
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                IRPJ
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                CSLL
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                PIS
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                COFINS
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                Total Impostos
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-foreground uppercase">
                % Impostos
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-foreground uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {lastFive.map((fat) => {
              const amountToBank = fat.exportacao && fat.valor_recebido
                ? Number(fat.valor_recebido)
                : Number(fat.valor_bruto)
              const taxPercentage = amountToBank > 0
                ? Number(fat.total_impostos) / amountToBank
                : 0

              return (
                <tr key={fat.id} className="hover:bg-muted">
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-foreground">
                    {format(parseISO(fat.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-foreground">
                    {fat.exportacao && fat.valor_nota_fiscal ? (
                      formatCurrency(Number(fat.valor_nota_fiscal))
                    ) : (
                      formatCurrency(Number(fat.valor_bruto))
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-muted-foreground">
                    {fat.exportacao && fat.valor_usd && fat.cotacao_ptax ? (
                      <span className="text-xs">
                        {formatUSD(Number(fat.valor_usd))} (R$ {Number(fat.cotacao_ptax).toFixed(4)})
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-foreground">
                    {formatCurrency(amountToBank)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-muted-foreground">
                    {formatCurrency(Number(fat.irpj))}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-muted-foreground">
                    {formatCurrency(Number(fat.csll))}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-muted-foreground">
                    {formatCurrency(Number(fat.pis))}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-muted-foreground">
                    {formatCurrency(Number(fat.cofins))}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold text-primary">
                    {formatCurrency(Number(fat.total_impostos))}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold text-warning">
                    {formatPercentage(taxPercentage)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                    <Link
                      href="/faturamentos"
                      className="text-primary hover:underline"
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
      <div className="mt-4 pt-4 border-t border-border">
        <Link
          href="/faturamentos"
          className="text-sm text-primary hover:underline font-medium"
        >
          Ver todos os faturamentos →
        </Link>
      </div>
    </div>
  )
}
