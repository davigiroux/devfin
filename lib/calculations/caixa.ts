import { DespesaMensal, CaixaNecessario, PagamentoDespesa } from '@/types'

/**
 * Filtra despesas aplicáveis para um mês/ano específico
 *
 * @param despesas - Lista de todas as despesas
 * @param mes - Mês (1-12)
 * @param ano - Ano
 * @returns Despesas aplicáveis ao mês/ano especificado
 */
export function filtrarDespesasMes(despesas: DespesaMensal[], mes: number, ano: number): DespesaMensal[] {
  const targetDate = new Date(ano, mes - 1, 1) // First day of target month

  return despesas.filter(despesa => {
    if (!despesa.ativa) return false

    // Check if expense was effective by this month
    const effectiveDate = new Date(despesa.effective_from)
    if (effectiveDate > targetDate) return false

    if (despesa.recorrente) {
      return true
    }

    return despesa.mes_referencia === mes && despesa.ano_referencia === ano
  })
}

/**
 * Calcula total de despesas para um mês específico
 *
 * @param despesas - Lista de despesas
 * @param mes - Mês (1-12)
 * @param ano - Ano
 * @returns Total de despesas para o mês
 */
export function calcularTotalDespesasMensais(despesas: DespesaMensal[], mes: number, ano: number): number {
  const despesasMes = filtrarDespesasMes(despesas, mes, ano)
  const total = despesasMes.reduce((acc, despesa) => acc + despesa.valor, 0)
  return Math.round(total * 100) / 100
}

/**
 * Calcula caixa necessário com detalhamento por tipo
 *
 * @param despesas - Lista de despesas
 * @param pagamentos - Lista de pagamentos (para usar valor_pago histórico)
 * @param mes - Mês (1-12)
 * @param ano - Ano
 * @returns Objeto com totais e detalhamento
 */
export function calcularCaixaNecessario(
  despesas: DespesaMensal[],
  pagamentos: PagamentoDespesa[],
  mes: number,
  ano: number
): CaixaNecessario {
  const despesasMes = filtrarDespesasMes(despesas, mes, ano)

  // Use valor_pago if exists, otherwise current valor
  const despesasComValoresHistoricos = despesasMes.map(despesa => {
    const pagamento = pagamentos.find(
      p => p.despesa_id === despesa.id &&
           p.mes_referencia === mes &&
           p.ano_referencia === ano
    )

    return {
      ...despesa,
      valor: pagamento?.valor_pago ?? despesa.valor
    }
  })

  const despesas_impostos = despesasComValoresHistoricos
    .filter(d => d.tipo === 'imposto')
    .reduce((acc, d) => acc + d.valor, 0)

  const despesas_compromissos = despesasComValoresHistoricos
    .filter(d => d.tipo === 'compromisso')
    .reduce((acc, d) => acc + d.valor, 0)

  const total_despesas = despesas_impostos + despesas_compromissos

  return {
    total_despesas: Math.round(total_despesas * 100) / 100,
    despesas_impostos: Math.round(despesas_impostos * 100) / 100,
    despesas_compromissos: Math.round(despesas_compromissos * 100) / 100,
    despesas: despesasComValoresHistoricos
  }
}
