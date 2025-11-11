import { Socio, CalculoINSS, INSSSocio } from '@/types'

/**
 * Configurações do INSS para 2025
 * Referência: Legislação Previdenciária
 */
export const INSS_CONFIG = {
  // Alíquota do INSS sobre o pró-labore (empresas)
  ALIQUOTA_EMPRESA: 0.20, // 20%

  // Teto do INSS (valor máximo de contribuição)
  TETO_INSS: 7786.02, // Atualizado para 2025

  // Salário mínimo
  SALARIO_MINIMO: 1412.00, // 2024 (atualizar para 2025)
} as const

/**
 * Tabela progressiva do INSS para contribuinte individual
 * Referência: Portaria MPS
 */
export const TABELA_INSS = [
  { limite: 1412.00, aliquota: 0.075 },   // 7.5%
  { limite: 2666.68, aliquota: 0.09 },    // 9%
  { limite: 4000.03, aliquota: 0.12 },    // 12%
  { limite: 7786.02, aliquota: 0.14 },    // 14%
] as const

/**
 * Calcula o INSS com base na tabela progressiva
 *
 * @param valorProlabore - Valor do pró-labore
 * @returns Valor do INSS a ser descontado
 */
export function calcularINSSProgressivo(valorProlabore: number): number {
  if (valorProlabore < 0) {
    throw new Error('Valor do pró-labore não pode ser negativo')
  }

  if (!Number.isFinite(valorProlabore)) {
    throw new Error('Valor do pró-labore deve ser um número válido')
  }

  // Limita ao teto do INSS
  const valorBase = Math.min(valorProlabore, INSS_CONFIG.TETO_INSS)

  let inssTotal = 0
  let valorRestante = valorBase

  for (let i = 0; i < TABELA_INSS.length; i++) {
    const faixa = TABELA_INSS[i]
    const limiteAnterior = i > 0 ? TABELA_INSS[i - 1].limite : 0

    if (valorBase > limiteAnterior) {
      const valorFaixa = Math.min(valorRestante, faixa.limite - limiteAnterior)
      inssTotal += valorFaixa * faixa.aliquota
      valorRestante -= valorFaixa

      if (valorRestante <= 0) break
    }
  }

  return Math.round(inssTotal * 100) / 100
}

/**
 * Calcula a alíquota efetiva do INSS para um valor de pró-labore
 *
 * @param valorProlabore - Valor do pró-labore
 * @returns Alíquota efetiva (percentual)
 */
export function calcularAliquotaEfetiva(valorProlabore: number): number {
  const inss = calcularINSSProgressivo(valorProlabore)
  const aliquota = (inss / valorProlabore) * 100
  return Math.round(aliquota * 100) / 100
}

/**
 * Distribui o valor total do pró-labore entre os sócios proporcionalmente
 * e calcula o INSS de cada um
 *
 * @param valorTotalProlabore - Valor total a ser distribuído
 * @param socios - Array de sócios com seus percentuais de participação
 * @returns Cálculo detalhado do INSS por sócio
 *
 * @example
 * ```typescript
 * const socios = [
 *   { id: '1', nome: 'João', cpf: '111', percentual_participacao: 60, ... },
 *   { id: '2', nome: 'Maria', cpf: '222', percentual_participacao: 40, ... }
 * ]
 * const calculo = calcularINSSSocios(10000, socios)
 * console.log(calculo.total_inss) // Total de INSS a recolher
 * ```
 */
export function calcularINSSSocios(
  valorTotalProlabore: number,
  socios: Socio[]
): CalculoINSS {
  if (valorTotalProlabore < 0) {
    throw new Error('Valor total do pró-labore não pode ser negativo')
  }

  if (!Number.isFinite(valorTotalProlabore)) {
    throw new Error('Valor total do pró-labore deve ser um número válido')
  }

  if (!socios || socios.length === 0) {
    throw new Error('Deve haver pelo menos um sócio')
  }

  // Valida se a soma dos percentuais é 100%
  const somaPercentuais = socios.reduce(
    (acc, socio) => acc + socio.percentual_participacao,
    0
  )

  if (Math.abs(somaPercentuais - 100) > 0.01) {
    throw new Error(
      `A soma dos percentuais deve ser 100%. Atual: ${somaPercentuais}%`
    )
  }

  const sociosComINSS: INSSSocio[] = socios.map((socio) => {
    const valorProlabore = Math.round(
      (valorTotalProlabore * socio.percentual_participacao / 100) * 100
    ) / 100

    const valorINSS = calcularINSSProgressivo(valorProlabore)
    const aliquotaEfetiva = calcularAliquotaEfetiva(valorProlabore)

    return {
      socio_id: socio.id,
      nome: socio.nome,
      valor_prolabore: valorProlabore,
      aliquota_inss: aliquotaEfetiva,
      valor_inss: valorINSS,
    }
  })

  const totalINSS = sociosComINSS.reduce(
    (acc, socio) => acc + socio.valor_inss,
    0
  )

  return {
    valor_total_prolabore: valorTotalProlabore,
    socios: sociosComINSS,
    total_inss: Math.round(totalINSS * 100) / 100,
  }
}

/**
 * Calcula o valor mínimo recomendado de pró-labore por sócio
 * (baseado no salário mínimo)
 *
 * @param numeroSocios - Número de sócios
 * @returns Valor mínimo total recomendado
 */
export function calcularProlaboreMinimo(numeroSocios: number): number {
  if (numeroSocios < 1) {
    throw new Error('Número de sócios deve ser maior que zero')
  }

  return INSS_CONFIG.SALARIO_MINIMO * numeroSocios
}
