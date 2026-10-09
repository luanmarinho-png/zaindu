export const MESSAGE_KINDS = ['welcome', 'birthday', 'celebration', 'discount'] as const;
export type MessageKind = typeof MESSAGE_KINDS[number];
export type MessageAudience = { mode: 'all' | 'selected'; patientIds: string[] };
export type MessageTemplate = { subject: string; body: string; signature: string; audience?: MessageAudience };
export type ClinicMessages = Record<MessageKind, MessageTemplate>;
export const MESSAGE_LABELS: Record<MessageKind, string> = {
  welcome: 'Boas-vindas', birthday: 'Aniversário', celebration: 'Outras comemorações', discount: 'Campanhas de desconto',
};
export const DEFAULT_MESSAGES: ClinicMessages = {
  welcome: { subject: 'Olá, {{nome}}!', body: 'Que bom ter você com a gente!\n\nSeu acesso já está pronto. No menu, você encontra as áreas liberadas para o seu trabalho. Se precisar de ajuda, fale com a pessoa responsável pela clínica.\n\nDesejamos um ótimo começo por aqui.', signature: 'clinic' },
  birthday: { subject: 'Feliz aniversário, {{nome}}!', body: 'Olá, {{nome}}!\n\nFeliz aniversário! Desejo que seu dia seja cheio de carinho e que este novo ano traga saúde e momentos felizes.\n\nUm abraço,\n{{assinatura}}', signature: 'principal' },
  celebration: { subject: 'Uma mensagem da {{clinica}} para você', body: 'Olá, {{nome}}!\n\nDesejamos a você um dia feliz, com bons momentos e pessoas queridas por perto.\n\nUm abraço,\n{{assinatura}}', signature: 'clinic' },
  discount: { subject: 'Uma condição especial na {{clinica}}', body: 'Olá, {{nome}}!\n\nTemos uma condição especial para você. Fale com nossa equipe para conhecer o desconto, os atendimentos participantes e o prazo da campanha.\n\n{{assinatura}}', signature: 'clinic' },
};

// Somente campos conhecidos são mantidos; textos continuam sendo texto, nunca HTML.
export function normalizeMessages(value: unknown): ClinicMessages {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(MESSAGE_KINDS.map(kind => {
    const item = source[kind] && typeof source[kind] === 'object' ? source[kind] as Record<string, unknown> : {};
    const defaults = DEFAULT_MESSAGES[kind];
    return [kind, {
      subject: typeof item.subject === 'string' ? item.subject.slice(0, 160) : defaults.subject,
      body: typeof item.body === 'string' ? item.body.slice(0, 3000) : defaults.body,
      signature: typeof item.signature === 'string' && item.signature ? item.signature.slice(0, 254) : defaults.signature,
      audience: normalizeAudience(item.audience),
    }];
  })) as ClinicMessages;
}

export function normalizeAudience(value: unknown): MessageAudience {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    mode: source.mode === undefined || source.mode === 'all' ? 'all' : 'selected',
    patientIds: Array.isArray(source.patientIds) ? [...new Set(source.patientIds.filter((id): id is string => typeof id === 'string' && Boolean(id) && id.length <= 254))].slice(0, 5000) : [],
  };
}

export const hasMessageEmail = (patient: { email: string }) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email.trim());

export function messageRecipients<T extends { id: string; email: string }>(patients: T[], value: unknown): T[] {
  const audience = normalizeAudience(value);
  const selected = new Set(audience.patientIds);
  return patients.filter(patient => hasMessageEmail(patient) && (audience.mode === 'all' || selected.has(patient.id)));
}

export function renderMessage(text: string, values: { name: string; clinic: string; professional: string; signature: string }): string {
  const replacements: Record<string, string> = { nome: values.name.trim().split(/\s+/)[0] || 'você', clinica: values.clinic, profissional: values.professional, assinatura: values.signature };
  return text.replace(/\{\{(nome|clinica|profissional|assinatura)\}\}/g, (_, token: string) => replacements[token]);
}

export function unknownMessageTokens(text: string): string[] {
  return [...new Set(text.match(/\{\{[^}]+\}\}/g) || [])].filter(token => !['{{nome}}', '{{clinica}}', '{{profissional}}', '{{assinatura}}'].includes(token));
}
