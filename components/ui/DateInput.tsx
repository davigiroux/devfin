import React from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('pt-BR', ptBR)

export interface DateInputProps {
  selected: Date | null
  onChange: (date: Date | null) => void
  error?: boolean
  className?: string
  placeholderText?: string
  required?: boolean
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

const DateInput = React.forwardRef<DatePicker, DateInputProps>(
  ({ error, className = '', onChange, ...props }, ref) => {
    const baseClasses = 'w-full px-3 py-2 rounded-md bg-card focus:outline-none focus:ring-ring focus:z-10 text-foreground'
    const borderClasses = error
      ? 'border border-destructive focus:border-destructive'
      : 'border border-input focus:border-ring'

    const handleChange = (date: Date | null) => {
      onChange(date)
    }

    return (
      <DatePicker
        ref={ref}
        dateFormat="dd/MM/yyyy"
        locale="pt-BR"
        className={`${baseClasses} ${borderClasses} ${className}`}
        wrapperClassName="w-full"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        onChange={handleChange}
        {...props}
      />
    )
  }
)

DateInput.displayName = 'DateInput'

export default DateInput
