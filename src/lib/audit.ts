import type { Db } from 'mongodb';
import type { Access } from '@/lib/clinic/permissions';

// Histórico de alterações por clínica: quem mudou o quê e quando. Fica só no servidor; a gestora e o admin consultam.
export type AuditDoc = { clinicId: string; email: string; name: string; at: Date; firstAt: Date; count: number; summary: string; lines: string[] };
export const audits = (db: Db) => db.collection<AuditDoc>('audit');

// [singular, plural, feminino]
const LABEL: Record<string, [string, string, boolean]> = {
  patients: ['paciente', 'pacientes', false],
  appointments: ['consulta', 'consultas', true],
  notes: ['evolução', 'evoluções', true],
  media: ['imagem', 'imagens', true],
  documents: ['documento', 'documentos', false],
  services: ['atendimento', 'atendimentos', false],
  supplies: ['insumo', 'insumos', false],
};
const OTHER: Record<string, string> = {
  profiles: 'Anamnese', settings: 'Configurações da clínica', monthlyCosts: 'Custos do mês', knowledgeCost: 'Custo do conhecimento', targetMargin: 'Margem alvo',
};

type Row = Record<string, unknown>;
const byId = (items: unknown) => new Map((Array.isArray(items) ? items as Row[] : []).map(item => [String(item?.id || ''), item]));

// Descreve em português o que mudou em cada parte, com o nome do paciente quando a mudança é de prontuário ou agenda.
export function describeChanges(before: Row, after: Row, keys: string[]): string[] {
  const names = new Map<string, string>();
  for (const source of [before.patients, after.patients]) for (const [id, item] of byId(source)) names.set(id, String(item?.name || 'Paciente'));
  const who = (item: unknown) => { const id = String((item as Row)?.patientId || ''); return id ? ` (${names.get(id) || 'paciente removido'})` : ''; };
  const lines: string[] = [];
  for (const key of keys) {
    if (LABEL[key]) {
      const [one, many, fem] = LABEL[key];
      const old = byId(before[key]);
      const next = byId(after[key]);
      const added = [...next.keys()].filter(id => !old.has(id));
      const removed = [...old.keys()].filter(id => !next.has(id));
      const changed = [...next.keys()].filter(id => old.has(id) && JSON.stringify(old.get(id)) !== JSON.stringify(next.get(id)));
      const verb = (base: string, plural: boolean) => `${base}${fem ? 'a' : 'o'}${plural ? 's' : ''}`;
      const add = (ids: string[], base: string, map: Map<string, unknown>) => {
        if (!ids.length) return;
        if (key === 'patients') {
          const list = ids.map(id => String((map.get(id) as Row)?.name || 'Paciente'));
          lines.push(`${capital(ids.length === 1 ? one : many)} ${verb(base, ids.length > 1)}: ${list.slice(0, 5).join(', ')}${list.length > 5 ? ` e mais ${list.length - 5}` : ''}`);
        } else if (ids.length === 1) lines.push(`${capital(one)} ${verb(base, false)}${who(map.get(ids[0]))}`);
        else lines.push(`${ids.length} ${many} ${verb(base, true)}`);
      };
      add(added, 'criad', next);
      add(changed, 'alterad', next);
      add(removed, 'excluíd', old);
    } else if (key === 'profiles') {
      const old = (before.profiles || {}) as Row;
      const next = (after.profiles || {}) as Row;
      const ids = [...new Set([...Object.keys(old), ...Object.keys(next)])].filter(id => JSON.stringify(old[id]) !== JSON.stringify(next[id]));
      for (const id of ids.slice(0, 5)) lines.push(`Anamnese alterada (${names.get(id) || 'paciente'})`);
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      lines.push(`${OTHER[key] || key} alterado(s)`);
    }
  }
  return lines;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Salvamento automático gera muitos registros seguidos: alterações iguais da mesma pessoa em 10 minutos viram uma linha só.
export async function recordAudit(db: Db, clinicId: string, access: Pick<Access, 'email' | 'name'>, lines: string[]): Promise<void> {
  if (!lines.length) return;
  const summary = lines.join(' · ').slice(0, 500);
  const now = new Date();
  const merged = await audits(db).updateOne(
    { clinicId, email: access.email, summary, at: { $gte: new Date(now.getTime() - 10 * 60 * 1000) } },
    { $set: { at: now }, $inc: { count: 1 } },
  );
  if (!merged.matchedCount) await audits(db).insertOne({ clinicId, email: access.email, name: access.name, at: now, firstAt: now, count: 1, summary, lines: lines.slice(0, 20) });
}
