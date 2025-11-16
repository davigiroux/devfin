import React from 'react'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Checkbox doesn't need error state in current design
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', ...props }, ref) => {
    const baseClasses = 'h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded'

    return (
      <input
        ref={ref}
        type="checkbox"
        className={`${baseClasses} ${className}`}
        {...props}
      />
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
