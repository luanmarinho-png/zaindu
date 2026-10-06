// Formulários de captação criados pelo admin (um por cliente), respondidos em /formulario/<identificador>.
// O questionário original da Dra. Celina continua fixo em /forms; as respostas dele aparecem junto no admin.
import type { Db } from 'mongodb';

export type FormQuestionType = 'single' | 'multi' | 'text' | 'textarea' | 'colors';
export type FormQuestion = { type: FormQuestionType; label: string; hint?: string; options?: string[]; extra?: string; max?: number; files?: boolean; optional?: boolean };
export type FormSection = { title: string; intro?: string; questions: FormQuestion[] };
export type FormStatus = 'rascunho' | 'publicado' | 'encerrado';
export type FormDoc = {
  _id: string; title: string; client: string; eyebrow: string; greeting: string; intro: string;
  thanksTitle: string; thanksText: string; color: string; status: FormStatus; sections: FormSection[];
  createdAt: Date; updatedAt: Date;
};
export type FormResponseDoc = { _id: string; formulario: string; respostas: { secao: string; numero: number; pergunta: string; resposta: string }[]; anexos: { id: string; nome: string; tamanho: number; tipo: string; pergunta: number }[]; texto: string; enviadoEm: Date; createdAt: Date; updatedAt: Date };

export const forms = (db: Db) => db.collection<FormDoc>('forms');
export const formResponses = (db: Db) => db.collection<FormResponseDoc>('form_responses');

export const QUESTION_TYPES: Record<FormQuestionType, string> = { single: 'Escolha única', multi: 'Múltipla escolha', text: 'Texto curto', textarea: 'Texto longo', colors: 'Cores' };
export const STATUS_LABEL: Record<FormStatus, string> = { rascunho: 'Rascunho', publicado: 'Publicado', encerrado: 'Encerrado' };

// Formulários que existiam antes do construtor (página fixa).
export const LEGACY_FORMS = [{ slug: 'questionario-dra-celina', title: 'Questionário Dra. Celina', client: 'Dra. Celina', url: '/forms' }];

export const slugify = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// Modelo de captação de clínica: as mesmas perguntas do questionário da Dra. Celina, para adaptar a cada cliente.
export const CAPTACAO_TEMPLATE: FormSection[] = [
  {
    "title": "Sobre você",
    "intro": "Para apresentar você do jeito certo no site.",
    "questions": [
      {
        "type": "multi",
        "label": "O que você quer que apareça na sua apresentação?",
        "hint": "Marque só o que fizer sentido para você.",
        "options": [
          "Nome completo",
          "Número do CRM",
          "Títulos e especializações",
          "Pós-graduações e cursos",
          "Onde estudou",
          "Tempo de experiência"
        ],
        "extra": "Como prefere ser chamada?"
      },
      {
        "type": "textarea",
        "label": "Em poucas linhas, conte sua trajetória.",
        "hint": "Formação, onde atuou e o que mais marcou seu caminho."
      },
      {
        "type": "multi",
        "label": "O que mais te motiva no seu trabalho?",
        "options": [
          "Ver a autoestima do paciente melhorar",
          "Resolver casos difíceis",
          "Cuidar da saúde da pele a longo prazo",
          "Resultados que o paciente vê",
          "Acompanhar o paciente por anos"
        ],
        "extra": "Outro motivo"
      },
      {
        "type": "multi",
        "label": "O que os pacientes mais elogiam no seu atendimento?",
        "options": [
          "Atenção e escuta",
          "Explicações claras",
          "Resultados naturais",
          "Pontualidade",
          "Ambiente do consultório",
          "Acompanhamento depois da consulta"
        ],
        "extra": "Outro elogio"
      }
    ]
  },
  {
    "title": "Seu trabalho",
    "intro": "O que você faz e onde atende.",
    "questions": [
      {
        "type": "multi",
        "label": "Quais áreas você atende?",
        "options": [
          "Pele no dia a dia (acne, manchas, alergias)",
          "Estética e rejuvenescimento",
          "Cabelo e couro cabeludo",
          "Unhas",
          "Pequenas cirurgias de pele",
          "Prevenção e check-up de pintas"
        ],
        "extra": "Procedimentos que você faz"
      },
      {
        "type": "multi",
        "max": 3,
        "label": "Quais você mais quer divulgar?",
        "options": [
          "Pele no dia a dia (acne, manchas, alergias)",
          "Estética e rejuvenescimento",
          "Cabelo e couro cabeludo",
          "Unhas",
          "Pequenas cirurgias de pele",
          "Prevenção e check-up de pintas"
        ]
      },
      {
        "type": "single",
        "label": "Como você atende?",
        "options": [
          "Só presencial",
          "Presencial e online",
          "Só online"
        ],
        "extra": "Cidade e bairro"
      },
      {
        "type": "single",
        "label": "Você atende por convênio, particular ou os dois?",
        "options": [
          "Convênio",
          "Particular",
          "Os dois"
        ],
        "extra": "Quais convênios? (opcional)"
      }
    ]
  },
  {
    "title": "Seus pacientes",
    "intro": "Para o site falar com as pessoas certas.",
    "questions": [
      {
        "type": "multi",
        "label": "Quem você mais gosta de atender?",
        "options": [
          "Crianças",
          "Adolescentes",
          "Adultos de 18 a 30",
          "Adultos de 30 a 50",
          "Acima de 50"
        ]
      },
      {
        "type": "multi",
        "label": "Quais dúvidas os pacientes mais trazem antes de marcar?",
        "options": [
          "Valor da consulta",
          "Se atende convênio",
          "Em quanto tempo vê resultado",
          "Se o procedimento dói",
          "Quantas sessões são necessárias",
          "Cuidados depois do procedimento"
        ],
        "extra": "Outra dúvida"
      },
      {
        "type": "multi",
        "label": "Como as pessoas chegam até você hoje?",
        "options": [
          "Indicação",
          "Instagram",
          "Google",
          "Convênio",
          "Plataformas de agendamento"
        ],
        "extra": "Outro caminho"
      }
    ]
  },
  {
    "title": "Sua marca",
    "intro": "Aqui começa a identidade visual.",
    "questions": [
      {
        "type": "single",
        "label": "Você já tem logo, cores ou algum material visual?",
        "hint": "Se tiver os arquivos, anexe aqui ou cole um link.",
        "files": true,
        "options": [
          "Tenho e quero manter",
          "Tenho, mas quero mudar",
          "Ainda não tenho"
        ],
        "extra": "Link dos arquivos (opcional)"
      },
      {
        "type": "multi",
        "max": 3,
        "label": "Escolha até três palavras para como você quer que o paciente se sinta ao conhecer sua marca.",
        "options": [
          "Acolhido",
          "Seguro",
          "Leve",
          "Cuidado",
          "Confiante",
          "Bem informado",
          "À vontade",
          "Especial"
        ]
      },
      {
        "type": "multi",
        "max": 3,
        "label": "E até três que você não quer de jeito nenhum.",
        "options": [
          "Frio",
          "Artificial",
          "Exagerado",
          "Distante",
          "Comercial demais",
          "Infantil",
          "Sério demais"
        ]
      },
      {
        "type": "colors",
        "max": 3,
        "label": "Quais cores combinam com você?",
        "hint": "Escolha até três no seletor de cores.",
        "extra": "Alguma cor que você não quer?"
      },
      {
        "type": "single",
        "label": "Qual estilo te atrai mais?",
        "options": [
          "Minimalista e clean",
          "Elegante e sofisticado",
          "Natural e orgânico",
          "Moderno e marcante",
          "Delicado"
        ],
        "extra": "Links de referência (opcional)"
      },
      {
        "type": "single",
        "label": "Como você imagina sua logo?",
        "options": [
          "Só o nome escrito",
          "Nome com um símbolo",
          "Iniciais (monograma)",
          "Não sei, quero sugestões"
        ],
        "extra": "Símbolo especial (opcional)"
      }
    ]
  },
  {
    "title": "Seu jeito de falar",
    "intro": "Para os textos soarem como você.",
    "questions": [
      {
        "type": "multi",
        "label": "Como é sua conversa no consultório?",
        "options": [
          "Leve",
          "Acolhedora",
          "Didática",
          "Direta",
          "Técnica",
          "Bem-humorada"
        ]
      },
      {
        "type": "single",
        "label": "Como prefere que o site fale com o paciente?",
        "options": [
          "Próximo, tratando por você",
          "Mais formal",
          "Tanto faz"
        ],
        "extra": "Palavras que são a sua cara"
      }
    ]
  },
  {
    "title": "O site",
    "intro": "O que ele precisa fazer por você.",
    "questions": [
      {
        "type": "multi",
        "label": "O que você mais quer que a pessoa faça ao entrar no site?",
        "options": [
          "Marcar consulta",
          "Falar no WhatsApp",
          "Conhecer você melhor",
          "Ver os tratamentos",
          "Seguir no Instagram"
        ]
      },
      {
        "type": "multi",
        "label": "O que você já tem?",
        "options": [
          "Domínio (endereço do site)",
          "E-mail profissional",
          "Perfil no Google",
          "Instagram profissional",
          "Nada disso ainda"
        ],
        "extra": "Endereços (opcional)"
      },
      {
        "type": "single",
        "label": "Você tem fotos profissionais suas ou do consultório?",
        "options": [
          "Tenho fotos recentes",
          "Tenho, mas são antigas",
          "Ainda não tenho"
        ]
      },
      {
        "type": "single",
        "label": "Toparia fazer um ensaio de fotos novo?",
        "options": [
          "Sim",
          "Talvez",
          "Prefiro não"
        ]
      },
      {
        "type": "single",
        "label": "Tem depoimentos de pacientes que autorizaram o uso?",
        "options": [
          "Sim, tenho",
          "Posso pedir",
          "Prefiro não usar"
        ]
      }
    ]
  },
  {
    "title": "Atendimento e prontuário",
    "intro": "Para facilitar sua rotina, não só o site.",
    "questions": [
      {
        "type": "multi",
        "label": "Como o paciente marca consulta hoje?",
        "options": [
          "WhatsApp",
          "Telefone",
          "Instagram",
          "Plataforma de agendamento"
        ]
      },
      {
        "type": "single",
        "label": "Quem responde as mensagens?",
        "options": [
          "Eu mesma",
          "Secretária",
          "As duas"
        ]
      },
      {
        "type": "single",
        "label": "Você usa algum sistema para agenda ou prontuário?",
        "options": [
          "iClinic",
          "Feegow",
          "Doctoralia",
          "Outro sistema",
          "Papel",
          "Nenhum"
        ],
        "extra": "Se for outro, qual?"
      },
      {
        "type": "multi",
        "label": "O que facilitaria sua rotina?",
        "hint": "Marque quantas quiser.",
        "options": [
          "Ficha que o paciente preenche antes da consulta",
          "Agendamento online",
          "Lembretes automáticos de consulta",
          "Envio de orientações e receitas pelo sistema",
          "Termos de consentimento assinados online"
        ]
      }
    ]
  },
  {
    "title": "Para fechar",
    "intro": "Últimas duas.",
    "questions": [
      {
        "type": "single",
        "label": "Para quando você gostaria do site no ar?",
        "options": [
          "Em até 1 mês",
          "Em 2 a 3 meses",
          "Sem pressa"
        ],
        "extra": "Data especial (opcional)"
      },
      {
        "type": "textarea",
        "optional": true,
        "label": "Quer contar mais alguma coisa? (opcional)"
      }
    ]
  }
];

export const BLANK_TEMPLATE: FormSection[] = [{ title: 'Primeira parte', intro: '', questions: [{ type: 'textarea', label: 'Nova pergunta' }] }];

const str = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

// Limpa o que vem do construtor: tipos conhecidos, limites de tamanho e de quantidade.
export function cleanSections(value: unknown): FormSection[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map(raw => {
    const section = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const questions = (Array.isArray(section.questions) ? section.questions : []).slice(0, 60).map(entry => {
      const q = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      const type = (Object.keys(QUESTION_TYPES) as FormQuestionType[]).includes(q.type as FormQuestionType) ? q.type as FormQuestionType : 'textarea';
      const options = Array.isArray(q.options) ? q.options.map(item => str(item, 120)).filter(Boolean).slice(0, 40) : [];
      const max = Number(q.max) > 0 ? Math.min(20, Math.round(Number(q.max))) : undefined;
      return {
        type, label: str(q.label, 300) || 'Pergunta sem título',
        ...(str(q.hint, 300) ? { hint: str(q.hint, 300) } : {}),
        ...(type === 'single' || type === 'multi' ? { options } : {}),
        ...(str(q.extra, 160) && type !== 'text' && type !== 'textarea' ? { extra: str(q.extra, 160) } : {}),
        ...(max && (type === 'multi' || type === 'colors') ? { max } : {}),
        ...(q.files === true ? { files: true } : {}),
        ...(q.optional === true ? { optional: true } : {}),
      } satisfies FormQuestion;
    });
    return { title: str(section.title, 120) || 'Parte sem título', intro: str(section.intro, 300), questions };
  }).filter(section => section.questions.length);
}

export function cleanFormFields(body: Record<string, unknown> | null) {
  const status = ['rascunho', 'publicado', 'encerrado'].includes(String(body?.status)) ? body?.status as FormStatus : undefined;
  return {
    ...(body && 'title' in body ? { title: str(body.title, 120) || 'Formulário' } : {}),
    ...(body && 'client' in body ? { client: str(body.client, 120) } : {}),
    ...(body && 'eyebrow' in body ? { eyebrow: str(body.eyebrow, 80) } : {}),
    ...(body && 'greeting' in body ? { greeting: str(body.greeting, 120) } : {}),
    ...(body && 'intro' in body ? { intro: str(body.intro, 600) } : {}),
    ...(body && 'thanksTitle' in body ? { thanksTitle: str(body.thanksTitle, 120) } : {}),
    ...(body && 'thanksText' in body ? { thanksText: str(body.thanksText, 600) } : {}),
    ...(body && 'color' in body && /^#[0-9a-f]{6}$/i.test(String(body.color)) ? { color: String(body.color) } : {}),
    ...(status ? { status } : {}),
    ...(body && 'sections' in body ? { sections: cleanSections(body.sections) } : {}),
  };
}
