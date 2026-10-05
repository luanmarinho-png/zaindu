// Papéis e módulos. Vale no cliente (o que mostrar) e no servidor (o que entregar e aceitar salvar).
import type { Store } from './store';

export type Module = 'agenda' | 'pacientes' | 'prontuario' | 'financeiro' | 'configuracoes';
export type Role = 'admin' | 'manager' | 'member';
// professional = a própria pessoa atende pacientes e tem agenda (id = e-mail).
export type Access = { email: string; name: string; role: Role; clinicId: string | null; modules: Module[]; professional?: boolean };
export type Professional = { id: string; name: string; specialty: string; registry: string };
export const MAIN_PROFESSIONAL = 'principal';
export type Brand = { id: string; name: string; color: string; logo: string };

export const MODULES: { id: Module; label: string; hint: string }[] = [
  { id: 'agenda', label: 'Agenda', hint: 'Ver e marcar consultas' },
  { id: 'pacientes', label: 'Pacientes', hint: 'Cadastro e contato dos pacientes' },
  { id: 'prontuario', label: 'Prontuário', hint: 'Anamnese, evoluções e fotografias' },
  { id: 'financeiro', label: 'Financeiro', hint: 'Receita, custos e preços' },
  { id: 'configuracoes', label: 'Configurações', hint: 'Dados da clínica e etapas do prontuário' },
];
export const ALL_MODULES = MODULES.map(item => item.id);
export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', manager: 'Gestora', member: 'Equipe' };
// Secretária é o caso mais comum de membro: começa só com agenda e pacientes.
export const DEFAULT_MEMBER_MODULES: Module[] = ['agenda', 'pacientes'];

// Perfil de acesso: a gestora define uma vez (ex.: Secretária) e cada pessoa nova com esse perfil herda os módulos.
// Mudar o perfil muda o acesso de todos que o usam.
// professional: quem recebe o perfil já começa marcado como profissional com agenda própria.
export type AccessProfile = { id: string; name: string; modules: Module[]; professional?: boolean };
export const DEFAULT_PROFILES: AccessProfile[] = [
  { id: 'secretaria', name: 'Secretária', modules: DEFAULT_MEMBER_MODULES },
  { id: 'medico', name: 'Médico(a)', modules: ['agenda', 'pacientes', 'prontuario'], professional: true },
];

export const isModule = (value: unknown): value is Module => typeof value === 'string' && (ALL_MODULES as string[]).includes(value);
export const cleanModules = (value: unknown): Module[] => Array.isArray(value) ? ALL_MODULES.filter(id => value.includes(id)) : [];

type Rule = { read: Module[] | 'all'; write: Module[] };
// Cada parte dos dados só sai do servidor para quem tem um dos módulos de leitura, e só é gravada por quem tem um de escrita.
// Pacientes podem ser criados pela agenda (cadastro rápido ao marcar consulta).
export const STORE_RULES: Record<keyof Store, Rule> = {
  patients: { read: ['agenda', 'pacientes', 'prontuario', 'financeiro'], write: ['pacientes', 'agenda'] },
  appointments: { read: ['agenda', 'pacientes', 'prontuario', 'financeiro'], write: ['agenda'] },
  notes: { read: ['prontuario'], write: ['prontuario'] },
  profiles: { read: ['prontuario'], write: ['prontuario'] },
  media: { read: ['prontuario'], write: ['prontuario'] },
  documents: { read: ['prontuario'], write: ['prontuario'] },
  // A agenda recebe só nome e duração dos atendimentos; valores e insumos ficam com o Financeiro.
  services: { read: ['financeiro', 'agenda'], write: ['financeiro'] },
  supplies: { read: ['financeiro'], write: ['financeiro'] },
  knowledgeCost: { read: ['financeiro'], write: ['financeiro'] },
  targetMargin: { read: ['financeiro'], write: ['financeiro'] },
  monthlyCosts: { read: ['financeiro'], write: ['financeiro'] },
  settings: { read: 'all', write: ['configuracoes'] },
};
export const STORE_KEYS = Object.keys(STORE_RULES) as (keyof Store)[];

export const canRead = (key: keyof Store, modules: Module[]) => {
  const rule = STORE_RULES[key].read;
  return rule === 'all' || rule.some(id => modules.includes(id));
};
export const canWrite = (key: keyof Store, modules: Module[]) => STORE_RULES[key].write.some(id => modules.includes(id));

export function readableStore<T extends Partial<Record<keyof Store, unknown>>>(data: T, modules: Module[]): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([key]) => (STORE_KEYS as string[]).includes(key) && canRead(key as keyof Store, modules))) as Partial<T>;
}

// O que o usuário não pode ler fica vazio no navegador, em vez de cair nos valores-padrão de uma clínica nova.
export function blankUnreadable(data: Store, modules: Module[]): Store {
  const next = { ...data } as Record<keyof Store, unknown>;
  for (const key of STORE_KEYS) {
    if (canRead(key, modules)) continue;
    const value = data[key];
    next[key] = Array.isArray(value) ? [] : typeof value === 'number' ? 0 : {};
  }
  return next as Store;
}

export const canManageTeam = (access: Access) => access.role === 'admin' || access.role === 'manager';
