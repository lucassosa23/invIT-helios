"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Input numérico que permite borrar el valor mientras se edita y solo
 * clampea (min/max) al perder el foco. Soluciona el bug donde el browser
 * no deja borrar un value={1} porque inmediatamente vuelve a 1.
 */
type Props = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** Si la entrada queda vacía al hacer blur, usar este valor. Default: min ?? 0 */
  fallback?: number;
};

export function NumberInput({
  value,
  onChange,
  min,
  max,
  fallback,
  className,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [draft, setDraft] = useState<string>(String(value));
  const lastEmitted = useRef<number>(value);

  // Sincronizar cuando el valor cambia desde afuera (no por el usuario).
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setDraft(String(value));
      lastEmitted.current = value;
    }
  }, [value]);

  return (
    <Input
      type="number"
      inputMode="numeric"
      value={draft}
      min={min}
      max={max}
      className={cn(className)}
      onFocus={(e) => {
        // Seleccionar todo el contenido al enfocar — facilita reemplazar
        e.currentTarget.select();
        onFocus?.(e);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        // Emitir solo si es un número válido durante edición. Si está
        // vacío o inválido, no emitimos — esperamos al blur.
        if (v === "") return;
        const n = Number(v);
        if (Number.isNaN(n)) return;
        lastEmitted.current = n;
        onChange(n);
      }}
      onBlur={(e) => {
        let n = Number(draft);
        if (draft === "" || Number.isNaN(n)) {
          n = fallback ?? min ?? 0;
        }
        if (min !== undefined && n < min) n = min;
        if (max !== undefined && n > max) n = max;
        setDraft(String(n));
        lastEmitted.current = n;
        onChange(n);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
}
