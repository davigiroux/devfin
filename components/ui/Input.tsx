import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => {
    const baseClasses = 'w-full px-3 py-2 rounded-md bg-white focus:outline-none focus:ring-indigo-500 focus:z-10 text-black'
    const borderClasses = error
      ? 'border border-red-300 focus:border-red-500'
      : 'border border-gray-300 focus:border-indigo-500'

    return (
      <input
        ref={ref}
        className={`${baseClasses} ${borderClasses} ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input
