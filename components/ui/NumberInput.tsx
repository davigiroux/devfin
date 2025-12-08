import React from 'react'

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  error?: boolean
  value?: number
  onValueChange?: (value: number | undefined) => void
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ error, className = '', value, onValueChange, ...props }, ref) => {
    const baseClasses = 'w-full px-3 py-2 rounded-md bg-card focus:outline-none focus:ring-ring focus:z-10 text-foreground'
    const borderClasses = error
      ? 'border border-destructive focus:border-destructive'
      : 'border border-input focus:border-ring'

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value)
      onValueChange?.(isNaN(val) ? undefined : val)
    }

    return (
      <input
        ref={ref}
        type="text"
        value={value ?? ''}
        onChange={handleChange}
        className={`${baseClasses} ${borderClasses} ${className}`}
        {...props}
      />
    )
  }
)

NumberInput.displayName = 'NumberInput'

export default NumberInput
