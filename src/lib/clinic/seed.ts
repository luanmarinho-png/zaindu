// Dados iniciais de uma clínica nova, conforme o modelo de prontuário escolhido pelo admin.
import { defaultSettings, initial, makeId, type Store } from './store';
import { recordFromTemplate, TEMPLATES, type TemplateId } from './templates';

export function seedStore(template: TemplateId, settings: { clinicName: string; professionalName: string; specialty: string }): Store {
  const base: Store = structuredClone(initial);
  if (template !== 'tricologia') {
    // Insumos e atendimentos de PRP/MMP só fazem sentido em tricologia; as outras começam com EPI e biossegurança.
    base.supplies = base.supplies.filter(item => item.category === 'EPI' || item.category === 'Biossegurança');
    base.services = [{ id: makeId(), name: 'Consulta', knowledgeCost: base.knowledgeCost, items: base.supplies.map(item => ({ supplyId: item.id, qty: item.defaultQty })) }];
  }
  return {
    ...base,
    settings: {
      ...defaultSettings,
      clinicName: settings.clinicName,
      professionalName: settings.professionalName || defaultSettings.professionalName,
      specialty: settings.specialty || TEMPLATES[template].specialty,
      trichoscopyFindings: [...TEMPLATES[template].findings],
      record: recordFromTemplate(template),
    },
  };
}
