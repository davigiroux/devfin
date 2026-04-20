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
          className="block text-sm font-medium text-foreground mb-1"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

export default FormControl
