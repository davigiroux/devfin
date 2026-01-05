import React, { useCallback } from "react";
import { useIMask } from "react-imask";

export interface CurrencyInputProps {
  id?: string;
  name?: string;
  value?: number;
  placeholder?: string;
  error?: boolean;
  className?: string;
  required?: boolean;
  prefix?: string;
  onValueChange?: (
    value: string | undefined,
    name: string | undefined,
    values?: { float: number | null }
  ) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      error,
      className = "",
      value,
      onValueChange,
      prefix = "R$ ",
      id,
      name,
      placeholder,
      required,
    },
    ref
  ) => {
    const baseClasses =
      "w-full px-3 py-2 rounded-md bg-card focus:outline-none focus:ring-ring focus:z-10 text-foreground";
    const borderClasses = error
      ? "border border-destructive focus:border-destructive"
      : "border border-input focus:border-ring";

    const onAccept = useCallback(
      (unmaskedValue: string) => {
        const numValue = unmaskedValue ? parseFloat(unmaskedValue) : null;
        onValueChange?.(unmaskedValue || undefined, name, { float: numValue });
      },
      [name, onValueChange]
    );

    const { ref: maskRef } = useIMask(
      {
        mask: `${prefix}num`,
        blocks: {
          num: {
            mask: Number,
            radix: ",",
            thousandsSeparator: ".",
            mapToRadix: ["."],
            scale: 2,
            padFractionalZeros: true,
            normalizeZeros: true,
          },
        },
      },
      {
        onAccept,
      }
    );

    // Handle controlled value updates
    React.useEffect(() => {
      if (maskRef.current && "maskRef" in maskRef.current) {
        const displayValue = value !== undefined ? value.toString() : "";
        const currentValue = (maskRef.current as any).maskRef?.unmaskedValue || "";
        if (currentValue !== displayValue) {
          (maskRef.current as any).maskRef.unmaskedValue = displayValue;
        }
      }
    }, [value, maskRef]);

    // Combine refs
    React.useImperativeHandle(ref, () => maskRef.current as any);

    return (
      <input
        ref={maskRef as any}
        id={id}
        name={name}
        placeholder={placeholder}
        required={required}
        className={`${baseClasses} ${borderClasses} ${className}`}
        type="text"
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;
