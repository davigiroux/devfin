import { Faturamento } from '@/types'

/**
 * Formats a date string to DD/MM/YYYY format
 * Parses ISO date (YYYY-MM-DD) directly to avoid timezone issues
 */
function formatDateBR(dateString: string): string {
  const [year, month, day] = dateString.split('T')[0].split('-')
  return `${day}/${month}/${year}`
}

/**
 * Gets the last day of the month from a date string
 */
function getLastDayOfMonth(dateString: string): string {
  const [year, month] = dateString.split('T')[0].split('-')
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  const paddedDay = lastDay.toString().padStart(2, '0')
  return `${paddedDay}/${month}/${year}`
}

/**
 * Formats USD amount with 2 decimal places and thousands separator
 */
function formatUSD(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formats PTAX rate with 4 decimal places
 */
function formatPTAX(rate: number): string {
  return rate.toFixed(4)
}

/**
 * Generates NF description text from faturamento data
 * @param faturamento - Faturamento object with USD and PTAX data
 * @returns Formatted NF description text
 */
export function generateNFDescription(faturamento: Faturamento): string {
  if (!faturamento.valor_usd || !faturamento.cotacao_ptax) {
    throw new Error('Faturamento must have valor_usd and cotacao_ptax')
  }

  const conversionDate = formatDateBR(faturamento.data)
  const dueDate = getLastDayOfMonth(faturamento.data)
  const usdAmount = formatUSD(faturamento.valor_usd)
  const ptaxRate = formatPTAX(faturamento.cotacao_ptax)

  return `Serviços prestados conforme acordado em contrato, referente ao desenvolvimento e manutenção de software para a empresa estrangeira Kake Group LLC.

Dados Bancários
Banco: BTG Pactual S.A. (208)
Agência: 0001
Conta: 01785055-3

Vencimento: ${dueDate}
Valor de $ ${usdAmount} USD convertido no dia ${conversionDate} utilizando o dólar PTAX de venda na cotação R$ ${ptaxRate}.`
}
