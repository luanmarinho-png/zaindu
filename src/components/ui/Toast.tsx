'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';

export function Toast({ tone, message, onClose, action }: { tone: 'danger' | 'success'; message: string; onClose?: () => void; action?: React.ReactNode }) {
  const Icon = tone === 'danger' ? CircleAlert : CircleCheck;
  return (
    <div className={`z-toast ${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <p>{message}</p>
      {action}
      {onClose && <button type="button" className="z-close" onClick={onClose} aria-label="Fechar aviso"><X /></button>}
    </div>
  );
}
