import React from 'react'
import CurrencyInputField, { CurrencyInputProps as CurrencyInputFieldProps } from 'react-currency-input-field'

export interface CurrencyInputProps extends CurrencyInputFieldProps {
  error?: boolean
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ error, className = '', ...props }, ref) => {
    const baseClasses = 'w-full px-3 py-2 rounded-md bg-white focus:outline-none focus:ring-indigo-500 focus:z-10 text-black'
    const borderClasses = error
      ? 'border border-red-300 focus:border-red-500'
      : 'border border-gray-300 focus:border-indigo-500'

    // Transform raw value to add decimal separator automatically (calculator style)
    const transformRawValue = (rawValue: string): string => {
      // Remove all non-digits
      const digits = rawValue.replace(/\D/g, '')
      if (!digits) return ''

      // Treat last 2 digits as cents (Brazilian calculator style)
      const cents = digits.slice(-2).padStart(2, '0')
      const reais = digits.slice(0, -2) || '0'

      return `${reais}.${cents}`
    }

    return (
      <CurrencyInputField
        ref={ref}
        allowDecimals={true}
        decimalsLimit={2}
        decimalSeparator=","
        groupSeparator="."
        prefix="R$ "
        transformRawValue={transformRawValue}
        className={`${baseClasses} ${borderClasses} ${className}`}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'

export default CurrencyInput
