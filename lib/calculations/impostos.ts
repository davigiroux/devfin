import { ImpostosCalculados } from '@/types'

/**
 * Alíquotas do Lucro Presumido para empresas de serviços
 * Referência: Legislação Tributária Brasileira
 */
export const ALIQUOTAS = {
  IRPJ: 0.048,    // 4.8% (32% sobre 15% de presunção)
  CSLL: 0.0288,   // 2.88% (9% sobre 32% de presunção)
  PIS: 0.0065,    // 0.65%
  COFINS: 0.03,   // 3%
} as const

/**
 * Calcula os impostos devidos com base no regime de Lucro Presumido
 *
 * @param valorBruto - Valor bruto do faturamento mensal
 * @returns Objeto com os impostos calculados e o total
 *
 * @example
 * ```typescript
 * const impostos = calcularImpostosLucroPresumido(100000)
 * console.log(impostos.total) // 11330
 * ```
 */
export function calcularImpostosLucroPresumido(valorBruto: number): ImpostosCalculados {
  if (valorBruto < 0) {
    throw new Error('Valor bruto não pode ser negativo')
  }

  if (!Number.isFinite(valorBruto)) {
    throw new Error('Valor bruto deve ser um número válido')
  }

  // Arredondar para 2 casas decimais
  const round = (num: number) => Math.round(num * 100) / 100

  const irpj = round(valorBruto * ALIQUOTAS.IRPJ)
  const csll = round(valorBruto * ALIQUOTAS.CSLL)
  const pis = round(valorBruto * ALIQUOTAS.PIS)
  const cofins = round(valorBruto * ALIQUOTAS.COFINS)
  const total = round(irpj + csll + pis + cofins)

  return {
    irpj,
    csll,
    pis,
    cofins,
    total,
  }
}

/**
 * Calcula o percentual total de impostos sobre o faturamento
 *
 * @returns Percentual total de impostos
 */
export function getPercentualTotalImpostos(): number {
  return Object.values(ALIQUOTAS).reduce((acc, aliquota) => acc + aliquota, 0)
}

/**
 * Calcula o valor líquido após impostos
 *
 * @param valorBruto - Valor bruto do faturamento
 * @returns Valor líquido após dedução dos impostos
 */
export function calcularValorLiquido(valorBruto: number): number {
  const impostos = calcularImpostosLucroPresumido(valorBruto)
  return Math.round((valorBruto - impostos.total) * 100) / 100
}
