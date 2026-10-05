'use client';

import { useState } from 'react';
import { BookOpen, CalendarDays, ClipboardList, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, UserCog, Users, Wallet, X, type LucideIcon } from 'lucide-react';
import { ROLE_LABEL, type Access, type Brand } from '@/lib/clinic/permissions';
import type { ClinicSettings } from '@/lib/clinic/store';
import { canView, type ClinicView } from './types';

const NAV: [ClinicView, LucideIcon][] = [
  ['Visão geral', LayoutDashboard],
  ['Agenda', CalendarDays],
  ['Pacientes', Users],
  ['Prontuário', ClipboardList],
  ['Financeiro', Wallet],
  ['Equipe', UserCog],
  ['Todos os dias', BookOpen],
  ['Configurações', Settings],
];

type ShellProps = {
  view: ClinicView;
  onNavigate: (view: ClinicView) => void;
  settings: ClinicSettings;
  brand?: Brand | null;
  access?: Access;
  scheduledCount: number;
  onLogout: () => void;
  onExitClinic?: () => void;
  children: React.ReactNode;
};

export function Shell({ view, onNavigate, settings, brand, access, scheduledCount, onLogout, onExitClinic, children }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Gestora aparece como a profissional da clínica; os demais pelo próprio nome e papel.
  const userName = !access || access.role === 'manager' ? settings.professionalName : access.name;
  const userRole = !access || access.role === 'manager' ? settings.specialty : access.role === 'admin' ? 'Suporte ZAINDU' : ROLE_LABEL[access.role];
  const initial = userName.trim().slice(0, 1).toUpperCase() || 'Z';
  // Sem logo próprio, a clínica aparece com a inicial na cor dela; sem clínica (pré-visualização), com a marca ZAINDU.
  const mark = brand?.logo ? <img src={brand.logo} alt="" /> : brand ? <span className="z-brand-swatch" aria-hidden="true">{settings.clinicName.trim().slice(0, 1).toUpperCase() || 'Z'}</span> : <img src="/zaindu-mark.svg" alt="" />;
  const nav = access ? NAV.filter(([item]) => canView(item, access)) : NAV.filter(([item]) => item !== 'Equipe');
  const go = (next: ClinicView) => { onNavigate(next); setMobileOpen(false); };

  return (
    <div className={`z-shell ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <aside className="z-sidebar" id="clinic-sidebar" aria-label="Menu da clínica">
        <div className="z-sidebar-top">
          <div className="z-brand">
            {mark}
            <span className="z-brand-name">{settings.clinicName}</span>
          </div>
          <button type="button" className="z-close z-collapse" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
          <button type="button" className="z-close z-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav className="z-nav" aria-label="Navegação principal">
          {nav.map(([item, Icon]) => (
            <button key={item} type="button" className="z-nav-item" aria-current={view === item ? 'page' : undefined} onClick={() => go(item)} title={collapsed ? item : undefined}>
              <Icon aria-hidden="true" />
              <span className="z-nav-label">{item}</span>
              {item === 'Agenda' && scheduledCount > 0 && <span className="z-nav-count num">{scheduledCount}</span>}
            </button>
          ))}
        </nav>
        {onExitClinic && (
          <button type="button" className="z-nav-item z-exit-clinic" onClick={onExitClinic} title={collapsed ? 'Voltar ao admin' : undefined}>
            <ShieldCheck aria-hidden="true" /><span className="z-nav-label">Voltar ao admin</span>
          </button>
        )}
        <div className="z-sidebar-user">
          <span className="z-avatar">{initial}</span>
          <div className="z-user-text">
            <strong>{userName}</strong>
            <small>{userRole}</small>
          </div>
          <button type="button" className="z-close" onClick={onLogout} aria-label="Sair" title="Sair"><LogOut /></button>
        </div>
      </aside>
      {mobileOpen && <button type="button" className="z-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <div className="z-main">
        <header className="z-mobilebar">
          <button type="button" className="z-close" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen} aria-controls="clinic-sidebar"><Menu /></button>
          <div className="z-brand">{mark}<span className="z-brand-name">{settings.clinicName}</span></div>
          <span className="z-avatar sm">{initial}</span>
        </header>
        <main className="z-content">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="z-pagehead">
      <div>
        <h1 className="t-display">{title}</h1>
        {subtitle && <p className="t-body-lg t-muted">{subtitle}</p>}
      </div>
      {actions && <div className="z-pagehead-actions">{actions}</div>}
    </header>
  );
}
