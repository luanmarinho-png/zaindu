'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
  // drawer: painel lateral à direita, com largura ajustável (arrastar a borda ou alternar compacto/amplo).
  variant?: 'dialog' | 'drawer';
  // Quando o corpo é um <form>, o rodapé fica dentro dele para o Enter e o botão de envio funcionarem.
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function Modal({ title, description, onClose, children, footer, size = 'md', onSubmit, variant = 'dialog' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const drawer = variant === 'drawer';
  const [width, setWidth] = useState(() => {
    try { return Number(localStorage.getItem('zaindu-drawer-width')) || 720; } catch { return 720; }
  });
  const setDrawerWidth = (next: number) => {
    const clamped = Math.round(Math.max(420, Math.min(next, window.innerWidth - 24)));
    setWidth(clamped);
    try { localStorage.setItem('zaindu-drawer-width', String(clamped)); } catch {}
  };
  const wide = typeof window !== 'undefined' && width >= window.innerWidth * 0.8;
  function startResize(event: React.PointerEvent) {
    event.preventDefault();
    const move = (e: PointerEvent) => setDrawerWidth(window.innerWidth - e.clientX);
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }
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
      <div className="z-dialog-tools">
        {drawer && <button type="button" className="z-close z-drawer-size" onClick={() => setDrawerWidth(wide ? 720 : window.innerWidth)} aria-label={wide ? 'Diminuir painel' : 'Aumentar painel'} title={wide ? 'Diminuir' : 'Aumentar'}>{wide ? <Minimize2 /> : <Maximize2 />}</button>}
        <button type="button" className="z-close" onClick={onClose} aria-label="Fechar"><X /></button>
      </div>
    </div>
  );
  const body = <div className="z-dialog-body">{children}</div>;
  const foot = footer && <div className="z-dialog-foot">{footer}</div>;

  return (
    <div className={`z-overlay ${drawer ? 'drawer' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className={`z-dialog ${size === 'lg' ? 'lg' : ''} ${drawer ? 'z-drawer' : ''}`} style={drawer ? { width } : undefined} role="dialog" aria-modal="true" aria-labelledby="z-dialog-title">
        {drawer && <div className="z-drawer-handle" onPointerDown={startResize} role="separator" aria-orientation="vertical" aria-label="Arraste para ajustar a largura" />}
        {onSubmit
          ? <form onSubmit={onSubmit} style={{ display: 'contents' }}>{head}{body}{foot}</form>
          : <>{head}{body}{foot}</>}
      </div>
    </div>
  );
}
