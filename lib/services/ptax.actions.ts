'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { ptax_rates } from '@/lib/db/schema'
import { _fetchPTAXFromAPI, _isSameDay } from './ptax'

export async function getPTAXRate(date: string): Promise<{
  rate: number | null
  cached: boolean
  usedPreviousDay: boolean
  actualDate: string
  error?: string
}> {
  const dateObj = new Date(date + 'T00:00:00')

  const [cachedRate] = await db
    .select()
    .from(ptax_rates)
    .where(eq(ptax_rates.date, date))
    .limit(1)

  if (cachedRate) {
    return {
      rate: cachedRate.rate_venda,
      cached: true,
      usedPreviousDay: false,
      actualDate: date,
    }
  }

  const rate = await _fetchPTAXFromAPI(dateObj)

  if (rate === null) {
    const isToday = _isSameDay(dateObj, new Date())
    return {
      rate: null,
      cached: false,
      usedPreviousDay: false,
      actualDate: date,
      error: isToday
        ? 'PTAX ainda não disponível (publicado às 13:30)'
        : 'Erro ao buscar PTAX. Tente novamente em alguns segundos.',
    }
  }

  try {
    await db.insert(ptax_rates).values({ date, rate_venda: rate })
  } catch (error) {
    console.error('Failed to cache PTAX rate:', error)
  }

  return {
    rate,
    cached: false,
    usedPreviousDay: false,
    actualDate: date,
  }
}
