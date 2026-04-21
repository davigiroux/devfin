'use client'

import { useState } from 'react'
import { getPTAXRate } from '@/lib/services/ptax.actions'

interface UsePTAXReturn {
  rate: number | null
  loading: boolean
  error: string | null
  cached: boolean
  usedPreviousDay: boolean
  actualDate: string | null
  fetchPTAX: (date: string) => Promise<void>
}

/**
 * Custom hook for fetching PTAX rates with loading and error states
 * @returns Object with rate, loading, error states and fetchPTAX function
 */
export function usePTAX(): UsePTAXReturn {
  const [rate, setRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  const [usedPreviousDay, setUsedPreviousDay] = useState(false)
  const [actualDate, setActualDate] = useState<string | null>(null)

  const fetchPTAX = async (date: string) => {
    setLoading(true)
    setError(null)
    setRate(null)
    setCached(false)
    setUsedPreviousDay(false)
    setActualDate(null)

    try {
      const result = await getPTAXRate(date)

      if (result.error) {
        setError(result.error)
        setRate(null)
      } else {
        setRate(result.rate)
        setCached(result.cached)
        setUsedPreviousDay(result.usedPreviousDay)
        setActualDate(result.actualDate)
      }
    } catch (err) {
      setError('Erro inesperado ao buscar PTAX')
      setRate(null)
    } finally {
      setLoading(false)
    }
  }

  return {
    rate,
    loading,
    error,
    cached,
    usedPreviousDay,
    actualDate,
    fetchPTAX,
  }
}
