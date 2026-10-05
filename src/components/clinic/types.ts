import type { Dispatch, SetStateAction } from 'react';
import type { Store } from '@/lib/clinic/store';
import { canManageTeam, type Access, type Module } from '@/lib/clinic/permissions';

export type ClinicView = 'Visão geral' | 'Agenda' | 'Pacientes' | 'Prontuário' | 'Financeiro' | 'Equipe' | 'Todos os dias' | 'Configurações';

export type ClinicProps = { data: Store; setData: Dispatch<SetStateAction<Store>> };

// Módulo exigido por cada tela; null = todos veem. Equipe depende do papel, não de módulo.
const VIEW_MODULE: Record<ClinicView, Module | null | 'team'> = {
  'Visão geral': null,
  Agenda: 'agenda',
  Pacientes: 'pacientes',
  Prontuário: 'prontuario',
  Financeiro: 'financeiro',
  Equipe: 'team',
  'Todos os dias': null,
  Configurações: 'configuracoes',
};

export function canView(view: ClinicView, access: Access): boolean {
  const need = VIEW_MODULE[view];
  if (need === 'team') return canManageTeam(access);
  return need === null || access.modules.includes(need);
}
