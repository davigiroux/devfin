import React from 'react'



const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    const baseClasses = 'h-4 w-4 text-primary focus:ring-ring border-input rounded'

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
