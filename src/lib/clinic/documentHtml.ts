// Montagem do documento impresso, sem React: usada pela tela (imprimir/salvar PDF) e por scripts que geram PDF.
import { isLightColor } from './brand';
import { formatDate, maskCpf } from './format';
import type { Brand, Professional } from './permissions';
import type { ClinicalDocument, ClinicSettings, DocumentKind, Patient } from './store';

export const DOCUMENT_KINDS: Record<DocumentKind, { title: string; template: (patient: Patient, date: string) => string }> = {
  receita: { title: 'Receituário', template: () => 'Uso oral\n\n1. \n\nUso tópico\n\n1. ' },
  atestado: {
    title: 'Atestado',
    template: (patient, date) => `Atesto, para os devidos fins, que ${patient.name} esteve sob meus cuidados em ${formatDate(date, { day: '2-digit', month: 'long', year: 'numeric' })}, necessitando de afastamento de suas atividades por ___ dia(s).\n\nCID (somente com autorização do paciente): `,
  },
  comparecimento: {
    title: 'Declaração de comparecimento',
    template: (patient, date) => `Declaro, para os devidos fins, que ${patient.name} compareceu a atendimento nesta clínica em ${formatDate(date, { day: '2-digit', month: 'long', year: 'numeric' })}, das ___:___ às ___:___.`,
  },
  exames: { title: 'Solicitação de exames', template: () => 'Solicito:\n\n1. \n\nIndicação clínica: ' },
  livre: { title: 'Documento', template: () => '' },
};

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));

// Documento A4 com o timbre da clínica (logo, cor, profissional e registro). autoPrint abre a impressão ao carregar.
export function documentHtml(document: ClinicalDocument, patient: Patient, settings: ClinicSettings, brand: Brand | null, professional: Professional | undefined, autoPrint = true): string {
  const color = brand?.color && !isLightColor(brand.color) ? brand.color : '#2e2e30';
  const logo = brand?.logo ? `<img src="${brand.logo}" alt="" class="logo">` : `<span class="logo mark">${escape((settings.clinicName || 'C').slice(0, 1).toUpperCase())}</span>`;
  const signer = professional || { name: settings.professionalName, registry: settings.professionalRegistry, specialty: settings.specialty };
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(document.title)} · ${escape(patient.name)}</title>
<style>
  @page { size: A4; margin: 18mm 18mm 20mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 400 12.5pt/1.6 Inter, 'Helvetica Neue', Arial, sans-serif; color: #1c1d20; }
  header { display: flex; align-items: center; gap: 14px; padding-bottom: 14px; border-bottom: 2px solid ${color}; }
  .logo { width: 52px; height: 52px; object-fit: contain; border-radius: 10px; }
  .mark { display: grid; place-items: center; background: ${color}; color: #fff; font: 600 22pt Inter, sans-serif; }
  header strong { display: block; font-size: 14pt; }
  header small { color: #6b6b6b; font-size: 10pt; }
  h1 { margin: 28px 0 6px; font-size: 16pt; font-weight: 600; letter-spacing: .02em; }
  .patient { margin: 0 0 24px; color: #4a4a4a; font-size: 11pt; }
  .body { white-space: pre-wrap; min-height: 320px; }
  footer { margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; font-size: 11pt; }
  .sign { min-width: 260px; text-align: center; border-top: 1px solid #1c1d20; padding-top: 6px; }
  .sign small { display: block; color: #6b6b6b; font-size: 10pt; }
</style></head><body>
<header>${logo}<div><strong>${escape(settings.clinicName)}</strong><small>${escape(signer.specialty || settings.specialty || '')}</small></div></header>
<h1>${escape(document.title)}</h1>
<p class="patient">Paciente: <b>${escape(patient.name)}</b>${patient.cpf ? ` · CPF ${escape(maskCpf(patient.cpf))}` : ''}</p>
<div class="body">${escape(document.body)}</div>
<footer><span>${escape(formatDate(document.date, { day: '2-digit', month: 'long', year: 'numeric' }))}</span>
<span class="sign">${escape(signer.name)}${signer.registry ? `<small>${escape(signer.registry)}</small>` : ''}</span></footer>
${autoPrint ? '<script>window.onload = () => { window.focus(); window.print(); };</script>' : ''}
</body></html>`;
  return html;
}
