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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (value: string, maskInstance: any) => {
        const unmaskedValue = maskInstance?.unmaskedValue || "";
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const element = maskRef.current as any;
      if (element?.maskRef) {
        const displayValue = value !== undefined ? value.toString() : "";
        const currentValue = element.maskRef.unmaskedValue || "";
        if (currentValue !== displayValue) {
          element.maskRef.unmaskedValue = displayValue;
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
