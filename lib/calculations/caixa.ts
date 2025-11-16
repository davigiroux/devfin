import { DespesaMensal, CaixaNecessario } from '@/types'

/**
 * Filtra despesas aplicáveis para um mês/ano específico
 *
 * @param despesas - Lista de todas as despesas
 * @param mes - Mês (1-12)
 * @param ano - Ano
 * @returns Despesas aplicáveis ao mês/ano especificado
 */
export function filtrarDespesasMes(despesas: DespesaMensal[], mes: number, ano: number): DespesaMensal[] {
  return despesas.filter(despesa => {
    if (!despesa.ativa) return false

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
 * @param mes - Mês (1-12)
 * @param ano - Ano
 * @returns Objeto com totais e detalhamento
 */
export function calcularCaixaNecessario(despesas: DespesaMensal[], mes: number, ano: number): CaixaNecessario {
  const despesasMes = filtrarDespesasMes(despesas, mes, ano)

  const despesas_impostos = despesasMes
    .filter(d => d.tipo === 'imposto')
    .reduce((acc, d) => acc + d.valor, 0)

  const despesas_compromissos = despesasMes
    .filter(d => d.tipo === 'compromisso')
    .reduce((acc, d) => acc + d.valor, 0)

  const total_despesas = despesas_impostos + despesas_compromissos

  return {
    total_despesas: Math.round(total_despesas * 100) / 100,
    despesas_impostos: Math.round(despesas_impostos * 100) / 100,
    despesas_compromissos: Math.round(despesas_compromissos * 100) / 100,
    despesas: despesasMes
  }
}
