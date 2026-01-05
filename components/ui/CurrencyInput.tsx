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
      (value: string) => {
        // Value comes as cents (e.g., "123339" = 1233.39)
        const numValue = value ? parseFloat(value) / 100 : null;
        const strValue = numValue !== null ? numValue.toString() : undefined;
        onValueChange?.(strValue, name, { float: numValue });
      },
      [name, onValueChange]
    );

    const { ref: maskRef } = useIMask(
      {
        mask: `${prefix}num`,
        lazy: false,
        blocks: {
          num: {
            mask: Number,
            scale: 2,
            radix: ",",
            thousandsSeparator: ".",
            mapToRadix: ["."],
            padFractionalZeros: true,
            normalizeZeros: true,
            min: 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            format: (num: any) => {
              // Convert cents to decimal display
              const cents = Math.round(parseFloat(num) || 0);
              const decimal = cents / 100;
              return decimal.toFixed(2).replace(".", ",");
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parse: (str: any) => {
              // Convert display back to cents
              const cleaned = str.replace(/[^\d]/g, "");
              return cleaned || "0";
            },
          },
        },
      },
      {
        onAccept,
      }
    );

    // Handle controlled value updates
    React.useEffect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const element = maskRef.current as any;
      if (element?.maskRef) {
        // Convert value (decimal) to cents for the mask
        const cents = value !== undefined ? Math.round(value * 100).toString() : "0";
        const currentValue = element.maskRef.unmaskedValue || "0";
        if (currentValue !== cents) {
          element.maskRef.unmaskedValue = cents;
        }
      }
    }, [value, maskRef]);

    // Combine refs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.useImperativeHandle(ref, () => maskRef.current as any);

    return (
      <input
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
