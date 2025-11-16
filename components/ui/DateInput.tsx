import React from 'react'
import DatePicker, { ReactDatePickerProps, registerLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('pt-BR', ptBR)

export interface DateInputProps extends Omit<ReactDatePickerProps, 'onChange'> {
  error?: boolean
  onChange: (date: Date | null) => void
}

const DateInput = React.forwardRef<DatePicker, DateInputProps>(
  ({ error, className = '', ...props }, ref) => {
    const baseClasses = 'w-full px-3 py-2 rounded-md bg-white focus:outline-none focus:ring-indigo-500 focus:z-10 text-black'
    const borderClasses = error
      ? 'border border-red-300 focus:border-red-500'
      : 'border border-gray-300 focus:border-indigo-500'

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
        {...props}
      />
    )
  }
)

DateInput.displayName = 'DateInput'

export default DateInput
