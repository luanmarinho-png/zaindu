import type { LucideIcon } from 'lucide-react';

type FieldProps = {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  error?: string;
  required?: boolean;
  full?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
};

export function Field({ label, icon: Icon, hint, error, required, full, htmlFor, children }: FieldProps) {
  return (
    <div className={`z-field ${full ? 'full' : ''}`}>
      <label className="z-label" htmlFor={htmlFor}>{Icon && <Icon aria-hidden="true" />}{label}{required && <span aria-hidden="true">*</span>}</label>
      {children}
      {error ? <span className="z-error" role="alert">{error}</span> : hint && <span className="z-hint">{hint}</span>}
    </div>
  );
}
