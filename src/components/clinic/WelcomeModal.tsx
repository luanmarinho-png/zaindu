'use client';

import { useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DEFAULT_MESSAGES, renderMessage, type MessageTemplate } from '@/lib/clinic/messages';

export function WelcomeModal({ name, clinicName, professionalName = '', message = DEFAULT_MESSAGES.welcome, onDismiss }: { name: string; clinicName: string; professionalName?: string; message?: MessageTemplate; onDismiss: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const values = { name, clinic: clinicName, professional: professionalName, signature: `Equipe ${clinicName}` };
  const subject = renderMessage(message.subject.trim() || DEFAULT_MESSAGES.welcome.subject, values);
  const body = renderMessage(message.body.trim() || DEFAULT_MESSAGES.welcome.body, values);
  async function dismiss() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try { await onDismiss(); }
    catch { setError('Não foi possível salvar. Tente novamente.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return (
    <Modal title={subject} description={`Boas-vindas à ${clinicName}.`} onClose={() => { void dismiss(); }} footer={<button type="button" className="z-btn brand" disabled={busy} onClick={() => { void dismiss(); }}>{busy ? 'Abrindo…' : 'Vamos começar'}</button>}>
      <div className="z-welcome">
        <span className="z-welcome-icon"><Heart aria-hidden="true" /></span>
        <p style={{ whiteSpace: 'pre-wrap' }}>{body}</p>
        {error && <p className="z-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
