import React from 'react'
import CurrencyInputField, { CurrencyInputProps as CurrencyInputFieldProps } from 'react-currency-input-field'

export interface CurrencyInputProps extends CurrencyInputFieldProps {
  error?: boolean
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ error, className = '', ...props }, ref) => {
    const baseClasses = 'w-full px-3 py-2 rounded-md bg-card focus:outline-none focus:ring-ring focus:z-10 text-foreground'
    const borderClasses = error
      ? 'border border-destructive focus:border-destructive'
      : 'border border-input focus:border-ring'

    return (
      <CurrencyInputField
        ref={ref}
        intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
        fixedDecimalLength={2}
        className={`${baseClasses} ${borderClasses} ${className}`}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'

export default CurrencyInput
