import React from 'react'
import CurrencyInputField, { CurrencyInputProps as CurrencyInputFieldProps, CurrencyInputOnChangeValues } from 'react-currency-input-field'

export interface CurrencyInputProps extends CurrencyInputFieldProps {
  error?: boolean
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ error, className = '', onValueChange, ...props }, ref) => {
    const baseClasses = 'w-full px-3 py-2 rounded-md bg-white focus:outline-none focus:ring-indigo-500 focus:z-10 text-black'
    const borderClasses = error
      ? 'border border-red-300 focus:border-red-500'
      : 'border border-gray-300 focus:border-indigo-500'

    const handleValueChange = (value: string | undefined, name?: string, values?: CurrencyInputOnChangeValues) => {
      console.log('CurrencyInput onValueChange:', { value, name, values })
      if (onValueChange) {
        onValueChange(value, name, values)
      }
    }

    return (
      <CurrencyInputField
        ref={ref}
        allowDecimals={true}
        decimalsLimit={2}
        decimalSeparator=","
        groupSeparator="."
        prefix="R$ "
        onValueChange={handleValueChange}
        className={`${baseClasses} ${borderClasses} ${className}`}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'

export default CurrencyInput
