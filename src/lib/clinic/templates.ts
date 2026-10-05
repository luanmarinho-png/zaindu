// Modelos de prontuário por especialidade. Cada clínica recebe uma cópia do modelo e pode acrescentar etapas próprias.
export type FieldType = 'text' | 'textarea' | 'date' | 'select' | 'checklist';
export type TemplateField = { key: string; label: string; type: FieldType; placeholder?: string; options?: string[]; wide?: boolean };
export type RecordSection = { id: string; title: string; fields: TemplateField[]; custom?: boolean };
export type TemplateId = 'tricologia' | 'dermatologia' | 'geral';
export type RecordConfig = { template: TemplateId; anamnesis: TemplateField[]; sections: RecordSection[] };

export const FIELD_TYPES: Record<FieldType, string> = { text: 'Texto curto', textarea: 'Texto longo', date: 'Data', select: 'Lista de opções', checklist: 'Checklist' };

export const communicationStyles = ['Direta e objetiva', 'Acolhedora e com tempo para conversar', 'Detalhada, com explicações completas', 'Visual, com exemplos e resumos', 'Prática, com passos simples por escrito', 'Prefere decidir no próprio ritmo'];

const t = (key: string, label: string, placeholder?: string): TemplateField => ({ key, label, type: 'textarea', placeholder });
const wide = (key: string, label: string, placeholder?: string): TemplateField => ({ key, label, type: 'textarea', placeholder, wide: true });

// Campos que todos os modelos têm: o resumo do prontuário (alergias, comorbidades, medicamentos, comunicação) depende deles.
const baseStart: TemplateField[] = [
  { key: 'birthDate', label: 'Data de nascimento', type: 'date' },
  { key: 'occupation', label: 'Ocupação e exposição relevante', type: 'text' },
  { key: 'communicationStyle', label: 'Preferência de comunicação', type: 'select', options: communicationStyles },
];
const baseHealth: TemplateField[] = [
  t('comorbidities', 'Comorbidades e condições clínicas'),
  t('surgicalHistory', 'Histórico cirúrgico e internações relevantes'),
  t('medications', 'Medicamentos em uso, dose, início e mudanças recentes'),
  t('allergies', 'Alergias/intolerâncias: substância, reação e gravidade conhecida'),
];

export const TEMPLATES: Record<TemplateId, { name: string; specialty: string; findings: string[]; record: RecordConfig }> = {
  tricologia: {
    name: 'Tricologia',
    specialty: 'Tricologia',
    findings: ['Variabilidade do diâmetro', 'Fios finos/velus', 'Unidades foliculares', 'Pontos amarelos', 'Pontos pretos', 'Pontos brancos', 'Descamação', 'Eritema perifolicular', 'Óstios foliculares', 'Fios quebrados'],
    record: {
      template: 'tricologia',
      anamnesis: [
        ...baseStart,
        t('chiefComplaint', 'Queixa principal e objetivo da consulta'),
        t('onset', 'Início, duração e circunstâncias'),
        t('progression', 'Evolução e velocidade de progressão'),
        t('pattern', 'Distribuição/padrão percebido pela paciente'),
        t('symptoms', 'Sintomas do couro cabeludo (prurido, dor, ardor, descamação etc.)'),
        t('triggers', 'Eventos ou possíveis desencadeantes e datas (doença, cirurgia, estresse, parto etc.)'),
        t('comorbidities', 'Comorbidades e condições clínicas'),
        t('surgicalHistory', 'Histórico cirúrgico e internações relevantes'),
        t('familyHistory', 'Histórico familiar de queda/alterações capilares'),
        t('medications', 'Medicamentos em uso, dose, início e mudanças recentes'),
        t('supplements', 'Vitaminas, suplementos e produtos em uso'),
        t('allergies', 'Alergias/intolerâncias: substância, reação e gravidade conhecida'),
        t('reproductiveHistory', 'Histórico menstrual/reprodutivo, quando pertinente e consentido'),
        t('dietAndStress', 'Alimentação, mudanças de peso e estressores recentes'),
        t('hairCare', 'Rotina e práticas de cuidado capilar'),
        t('chemicalTreatments', 'Colorações, alisamentos e outros procedimentos químicos (produto/data)'),
        t('heatAndTraction', 'Calor, penteados com tração, extensões e hábitos de tração'),
        t('washRoutine', 'Frequência de lavagem e cuidados antes do exame'),
        t('priorTreatments', 'Tratamentos capilares prévios: produto/procedimento, período, resposta e efeitos'),
        t('relevantTests', 'Exames prévios relevantes: data, resultado e profissional solicitante'),
      ],
      sections: [
        { id: 'clinica', title: 'Relato e avaliação clínica', fields: [
          t('reason', 'Queixa/relato', 'O que a paciente relata?'),
          t('report', 'Evolução desde a última consulta', 'Sintomas, mudanças, resposta relatada e datas'),
          wide('exam', 'Exame clínico do couro cabeludo e fios', 'Distribuição, densidade aparente, eritema, descamação, óstios foliculares, cicatriz, haste e observações'),
          t('pullTest', 'Teste de tração (se realizado)', 'Local, técnica, resultado e observações'),
          t('assessment', 'Impressão/avaliação profissional', 'Registro descritivo do profissional'),
          t('differential', 'Hipóteses/diferenciais considerados', 'Registro profissional; não é gerado automaticamente'),
          t('plan', 'Conduta/plano e orientações', 'Condutas acordadas e orientações'),
          t('followUp', 'Acompanhamento/retorno', 'Prazo, metas de acompanhamento e pendências'),
          t('tests', 'Exames complementares', 'Exame, data, resultado e interpretação profissional'),
        ] },
        { id: 'tricoscopia', title: 'Tricoscopia', fields: [
          t('trichoDevice', 'Equipamento e modo de exame', 'Marca/modelo; contato ou não contato'),
          t('magnification', 'Aumento utilizado', 'Informe o aumento por imagem ou campo'),
          t('frontal', 'Região frontal', 'Descreva os achados observados'),
          t('vertex', 'Vértex/coroa', 'Descreva os achados observados'),
          t('temporalRight', 'Região temporal direita', 'Descreva os achados observados'),
          t('temporalLeft', 'Região temporal esquerda', 'Descreva os achados observados'),
          t('parietal', 'Região parietal', 'Descreva os achados observados'),
          t('occipital', 'Região occipital (comparação)', 'Descreva os achados observados'),
          wide('trichoMetrics', 'Métricas e achados por campo', 'Diâmetro/variabilidade das hastes, fios finos/velus, unidades foliculares e fios por unidade, pontos amarelos/brancos/pretos, óstios, sinais perifoliculares, eritema e descamação. Registre método/unidade e local.'),
          t('photoReference', 'Registro fotográfico', 'Identificador/local da imagem e posição padronizada (frente, topo, laterais, occipital)'),
        ] },
      ],
    },
  },
  dermatologia: {
    name: 'Dermatologia',
    specialty: 'Dermatologia',
    findings: ['Mácula', 'Pápula', 'Placa', 'Nódulo', 'Vesícula', 'Pústula', 'Crosta', 'Descamação', 'Eritema', 'Hiperpigmentação', 'Telangiectasias', 'Cicatriz'],
    record: {
      template: 'dermatologia',
      anamnesis: [
        ...baseStart,
        t('chiefComplaint', 'Queixa principal e objetivo da consulta'),
        t('onset', 'Início, duração e evolução das lesões'),
        t('symptoms', 'Sintomas associados (prurido, dor, ardor, sangramento)'),
        { key: 'phototype', label: 'Fototipo (Fitzpatrick)', type: 'select', options: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
        t('sunExposure', 'Exposição solar, queimaduras e fotoproteção'),
        t('skinCare', 'Rotina de cuidados com a pele e cosméticos em uso'),
        t('cosmeticProcedures', 'Procedimentos estéticos prévios (produto/data/resposta)'),
        ...baseHealth,
        t('familyHistory', 'Histórico familiar (câncer de pele, atopia, psoríase, acne)'),
        t('priorTreatments', 'Tratamentos dermatológicos prévios: produto, período e resposta'),
        t('relevantTests', 'Exames prévios relevantes: data, resultado e profissional solicitante'),
      ],
      sections: [
        { id: 'clinica', title: 'Relato e avaliação clínica', fields: [
          t('reason', 'Queixa/relato', 'O que o paciente relata?'),
          t('report', 'Evolução desde a última consulta', 'Sintomas, mudanças, resposta relatada e datas'),
          wide('exam', 'Exame dermatológico', 'Distribuição, padrão, simetria, áreas acometidas e observações'),
          t('assessment', 'Impressão/avaliação profissional', 'Registro descritivo do profissional'),
          t('differential', 'Hipóteses/diferenciais considerados', 'Registro profissional; não é gerado automaticamente'),
          t('plan', 'Conduta/plano e orientações', 'Prescrição, procedimentos e orientações'),
          t('followUp', 'Acompanhamento/retorno', 'Prazo, metas de acompanhamento e pendências'),
          t('tests', 'Exames complementares', 'Biópsia, exames laboratoriais, data e resultado'),
        ] },
        { id: 'lesoes', title: 'Descrição das lesões', fields: [
          t('location', 'Localização e distribuição', 'Região corporal, extensão, padrão'),
          t('morphology', 'Lesão elementar e morfologia', 'Tipo, forma, superfície'),
          t('sizeColor', 'Tamanho, cor e bordas', 'Medidas, coloração, limites'),
          wide('dermoscopy', 'Dermatoscopia', 'Padrão, estruturas e achados por lesão'),
          t('photoReference', 'Registro fotográfico', 'Identificador/local da imagem e posição padronizada'),
        ] },
      ],
    },
  },
  geral: {
    name: 'Medicina geral',
    specialty: 'Clínica médica',
    findings: [],
    record: {
      template: 'geral',
      anamnesis: [
        ...baseStart,
        t('chiefComplaint', 'Queixa principal e objetivo da consulta'),
        t('onset', 'História da doença atual'),
        ...baseHealth,
        t('familyHistory', 'Histórico familiar'),
        t('habits', 'Hábitos: tabagismo, álcool, atividade física, sono e alimentação'),
        t('vaccination', 'Situação vacinal'),
        t('reproductiveHistory', 'Histórico gineco-obstétrico, quando pertinente e consentido'),
        t('relevantTests', 'Exames prévios relevantes: data, resultado e profissional solicitante'),
      ],
      sections: [
        { id: 'consulta', title: 'Consulta', fields: [
          t('reason', 'Queixa/relato', 'O que o paciente relata?'),
          t('report', 'Evolução desde a última consulta', 'Sintomas, mudanças, adesão e datas'),
          t('systems', 'Revisão de sistemas', 'Sintomas por sistema'),
          { key: 'vitals', label: 'Sinais vitais', type: 'text', placeholder: 'PA, FC, FR, Temp, SpO2, peso, altura' },
          wide('exam', 'Exame físico', 'Achados por aparelho'),
        ] },
        { id: 'conduta', title: 'Avaliação e conduta', fields: [
          t('assessment', 'Impressão/avaliação profissional', 'Registro descritivo do profissional'),
          t('differential', 'Hipóteses/diferenciais considerados', 'Registro profissional; não é gerado automaticamente'),
          wide('plan', 'Conduta, prescrição e orientações', 'Medicações, dose, orientações e encaminhamentos'),
          t('tests', 'Exames solicitados e resultados', 'Exame, data, resultado e interpretação'),
          t('followUp', 'Acompanhamento/retorno', 'Prazo, metas de acompanhamento e pendências'),
        ] },
      ],
    },
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];
export const isTemplateId = (value: unknown): value is TemplateId => typeof value === 'string' && value in TEMPLATES;

// Cópia profunda: a clínica edita a sua versão sem alterar o modelo.
export const recordFromTemplate = (id: TemplateId): RecordConfig => structuredClone(TEMPLATES[id].record);

// Junta as etapas próprias da clínica ao modelo atual, para que melhorias no modelo cheguem a quem já o usa.
export function resolveRecord(record: Partial<RecordConfig> | undefined): RecordConfig {
  const template = isTemplateId(record?.template) ? record.template : 'tricologia';
  const base = recordFromTemplate(template);
  const custom = (record?.sections || []).filter(section => section.custom);
  return { template, anamnesis: base.anamnesis, sections: [...base.sections, ...custom] };
}

export const allNoteFields = (record: RecordConfig) => record.sections.flatMap(section => section.fields);
