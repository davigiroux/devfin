import React from 'react'

export interface FormControlProps {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  htmlFor?: string
}

const FormControl: React.FC<FormControlProps> = ({
  label,
  error,
  required,
  children,
  htmlFor,
}) => {
  return (
    <div>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export default FormControl
