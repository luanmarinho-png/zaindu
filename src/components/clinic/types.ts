import type { Dispatch, SetStateAction } from 'react';
import type { Store } from '@/lib/clinic/store';

export type ClinicView = 'Visão geral' | 'Agenda' | 'Pacientes' | 'Prontuário' | 'Financeiro' | 'Todos os dias' | 'Configurações';

export type ClinicProps = { data: Store; setData: Dispatch<SetStateAction<Store>> };
