'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
  // Quando o corpo é um <form>, o rodapé fica dentro dele para o Enter e o botão de envio funcionarem.
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function Modal({ title, description, onClose, children, footer, size = 'md', onSubmit }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLElement>('[autofocus], input:not([type=hidden]), select, textarea, button:not(.z-close)');
    first?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const head = (
    <div className="z-dialog-head">
      <div>
        <h2 className="t-h1" id="z-dialog-title">{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <button type="button" className="z-close" onClick={onClose} aria-label="Fechar"><X /></button>
    </div>
  );
  const body = <div className="z-dialog-body">{children}</div>;
  const foot = footer && <div className="z-dialog-foot">{footer}</div>;

  return (
    <div className="z-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className={`z-dialog ${size === 'lg' ? 'lg' : ''}`} role="dialog" aria-modal="true" aria-labelledby="z-dialog-title">
        {onSubmit
          ? <form onSubmit={onSubmit} style={{ display: 'contents' }}>{head}{body}{foot}</form>
          : <>{head}{body}{foot}</>}
      </div>
    </div>
  );
}
