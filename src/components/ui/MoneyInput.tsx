'use client';

import { useState } from 'react';
import { brl, centsFromInput } from '@/lib/clinic/format';

type MoneyInputProps = {
  id?: string;
  name?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  ariaLabel?: string;
  placeholder?: string;
};

// Campo de moeda em BRL: a pessoa digita só números e o valor aparece como R$ 1.234,56.
// Com `name`, envia o número (em reais) num input escondido para formulários com FormData.
export function MoneyInput({ id, name, value, defaultValue = 0, onChange, ariaLabel, placeholder }: MoneyInputProps) {
  const [inner, setInner] = useState(Math.round(defaultValue * 100));
  const cents = value === undefined ? inner : Math.round(value * 100);
  const text = brl(cents / 100).replace(/^R\$\s?/, '');
  return (
    <div className="z-inputwrap money">
      <span className="z-prefix">R$</span>
      <input
        id={id}
        inputMode="numeric"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={cents ? text : ''}
        onChange={event => {
          const next = centsFromInput(event.target.value);
          if (value === undefined) setInner(next);
          onChange?.(next / 100);
        }}
        onFocus={event => event.target.select()}
      />
      {name && <input type="hidden" name={name} value={(cents / 100).toFixed(2)} />}
    </div>
  );
}
