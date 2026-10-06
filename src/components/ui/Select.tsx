'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

export type SelectOption = { value: string; label: string; hint?: string };

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista de opções no padrão do DS SC (pílula, sombra suave, item ativo com a cor da clínica), no lugar do <select> nativo.
// Teclado: setas, Enter, Esc e digitação para buscar quando há muitas opções.
// Sem value, funciona sozinho (defaultValue) e envia o valor no formulário pelo name.
export function Select({ value: controlled, defaultValue = '', name, options, onChange, ariaLabel, id, placeholder = 'Selecione', size, className = '', disabled }: {
  value?: string;
  defaultValue?: string;
  name?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  ariaLabel?: string;
  id?: string;
  placeholder?: string;
  size?: 'sm';
  className?: string;
  disabled?: boolean;
}) {
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<React.CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const inside = (target: EventTarget | null) => target instanceof Node && (root.current?.contains(target) || pop.current?.contains(target));
  const listId = useId();
  const searchable = options.length > 8;
  const selected = options.find(option => option.value === value);
  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return term ? options.filter(option => normalize(`${option.label} ${option.hint || ''}`).includes(term)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!inside(event.target)) setOpen(false); };
    const onScroll = (event: Event) => { if (!inside(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', () => setOpen(false), { once: true });
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  function toggle() {
    if (disabled) return;
    if (!open && root.current) {
      // Posição fixa na tela: não é cortada pela rolagem de modais. Abre para cima quando falta espaço embaixo.
      const rect = root.current.getBoundingClientRect();
      const up = window.innerHeight - rect.bottom < 300 && rect.top > 300;
      setPlace({ left: rect.left, width: Math.max(rect.width, 200), ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) });
    }
    setQuery('');
    setActive(Math.max(0, options.findIndex(option => option.value === value)));
    setOpen(current => !current);
  }
  function choose(option: SelectOption | undefined) {
    if (!option) return;
    setOwn(option.value);
    onChange?.(option.value);
    setOpen(false);
  }
  function onKey(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { if (open) { event.stopPropagation(); setOpen(false); } return; }
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggle(); return; }
    if (!open) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(filtered.length - 1, index + 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
    if (event.key === 'Enter') { event.preventDefault(); choose(filtered[active]); }
  }

  return (
    <div ref={root} className={`z-dropdown ${size === 'sm' ? 'sm' : ''} ${className}`} onKeyDown={onKey}>
      {name && <input type="hidden" name={name} value={value} />}
      <button type="button" id={id} className="z-dropdown-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={ariaLabel} onClick={toggle} disabled={disabled}>
        <span className={selected ? '' : 't-muted'}>{selected?.label || placeholder}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && createPortal(
        // Portal no body: o modal tem filtro de sombra, que prenderia a lista dentro dele.
        <div ref={pop} className="z-dropdown-pop" style={place} onKeyDown={onKey}>
          {searchable && (
            <div className="z-dropdown-search">
              <Search aria-hidden="true" />
              <input autoFocus value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} placeholder="Buscar" aria-label="Buscar opção" />
            </div>
          )}
          <ul id={listId} role="listbox" aria-label={ariaLabel}>
            {filtered.map((option, index) => (
              <li key={option.value} role="option" aria-selected={option.value === value} className={index === active ? 'active' : ''} onMouseEnter={() => setActive(index)} onMouseDown={event => { event.preventDefault(); choose(option); }}>
                <span><strong>{option.label}</strong>{option.hint && <small>{option.hint}</small>}</span>
                {option.value === value && <Check aria-hidden="true" />}
              </li>
            ))}
            {!filtered.length && <li className="empty">Nada encontrado</li>}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
