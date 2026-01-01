'use client'

import { useState, useEffect, useRef } from 'react'

interface UseClipboardReturn {
  copying: boolean
  success: boolean
  error: string | null
  copyToClipboard: (text: string) => Promise<void>
}

/**
 * Custom hook for copying text to clipboard with state management
 * @returns Object with copying, success, error states and copyToClipboard function
 */
export function useClipboard(): UseClipboardReturn {
  const [copying, setCopying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copyToClipboard = async (text: string) => {
    setCopying(true)
    setError(null)
    setSuccess(false)

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    try {
      await navigator.clipboard.writeText(text)
      setSuccess(true)

      // Auto-reset success after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError('Erro ao copiar para área de transferência')
      setSuccess(false)
    } finally {
      setCopying(false)
    }
  }

  return {
    copying,
    success,
    error,
    copyToClipboard,
  }
}
