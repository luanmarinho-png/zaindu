'use client';

import { useEffect, useState } from 'react';

// Número com vírgula decimal (pt-BR). Guarda o texto digitado para permitir "0," enquanto a pessoa digita.
export function DecimalInput({ value, onChange, ariaLabel, suffix, className = '' }: { value: number; onChange: (value: number) => void; ariaLabel: string; suffix?: string; className?: string }) {
  const format = (n: number) => String(n).replace('.', ',');
  const [text, setText] = useState(format(value));
  useEffect(() => {
    setText(current => Number(current.replace(',', '.')) === value ? current : format(value));
  }, [value]);
  return (
    <div className={`z-inputwrap ${className}`}>
      <input
        className="num"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        onChange={event => {
          const next = event.target.value.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '');
          setText(next);
          const parsed = Number(next.replace(',', '.'));
          if (Number.isFinite(parsed)) onChange(Math.max(0, parsed));
        }}
        onBlur={() => setText(format(value))}
      />
      {suffix && <span className="z-prefix">{suffix}</span>}
    </div>
  );
}
