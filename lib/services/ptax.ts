interface PTAXAPIResponse {
  value: Array<{
    cotacaoCompra: number
    cotacaoVenda: number
    dataHoraCotacao: string
  }>
}

/**
 * Fetches PTAX exchange rate from Banco Central API with retry logic
 * @param date - Date in YYYY-MM-DD format
 * @param retries - Number of retry attempts (default: 3)
 * @returns PTAX venda rate or null if failed
 */
async function fetchPTAXFromAPI(
  date: Date,
  retries: number = 3
): Promise<number | null> {
  const formattedDate = formatDateForAPI(date)
  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formattedDate}'&$format=json`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: PTAXAPIResponse = await response.json()

      if (!data.value || data.value.length === 0) {
        const isToday = isSameDay(date, new Date())

        if (isToday) {
          // Don't fall back for today - rate might not be published yet (available at 13:30)
          return null
        }

        // For past dates, try previous business day (weekend/holiday)
        const previousDay = getPreviousBusinessDay(date)
        if (previousDay.getTime() !== date.getTime()) {
          console.log(`No PTAX for ${date.toISOString().split('T')[0]}, trying previous business day`)
          return fetchPTAXFromAPI(previousDay, retries)
        }

        return null
      }

      const rate = data.value[0].cotacaoVenda
      if (!rate || rate <= 0) {
        throw new Error('Invalid PTAX rate')
      }

      return rate
    } catch (error) {
      const delay = Math.pow(2, attempt - 1) * 1000 // Exponential backoff: 1s, 2s, 4s
      console.error(`PTAX fetch attempt ${attempt}/${retries} failed:`, error)

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      return null
    }
  }

  return null
}

/**
 * Gets previous business day (skips weekends)
 */
function getPreviousBusinessDay(date: Date): Date {
  const previous = new Date(date)
  previous.setDate(previous.getDate() - 1)

  // If Saturday (6), go back to Friday
  // If Sunday (0), go back to Friday
  const day = previous.getDay()
  if (day === 0) {
    previous.setDate(previous.getDate() - 2)
  } else if (day === 6) {
    previous.setDate(previous.getDate() - 1)
  }

  return previous
}

/**
 * Formats date for Banco Central API (MM-DD-YYYY)
 */
function formatDateForAPI(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}-${day}-${year}`
}

/**
 * Checks if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Internal: fetch PTAX from the external API (no cache).
 * Exported for the server action in `ptax.actions.ts`.
 */
export async function _fetchPTAXFromAPI(dateObj: Date): Promise<number | null> {
  return fetchPTAXFromAPI(dateObj)
}

export function _isSameDay(a: Date, b: Date): boolean {
  return isSameDay(a, b)
}

/**
 * Validates if date is in the past (PTAX only available after business day close)
 */
export function isPastDate(date: string): boolean {
  const inputDate = new Date(date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return inputDate < today
}

/**
 * Validates if date is in the future
 */
export function isFutureDate(date: string): boolean {
  const inputDate = new Date(date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return inputDate > today
}

/**
 * Calculates Nota Fiscal value (USD × PTAX)
 */
export function calcularValorNotaFiscal(valorUSD: number, cotacaoPTAX: number): number {
  return Math.round(valorUSD * cotacaoPTAX * 100) / 100
}
