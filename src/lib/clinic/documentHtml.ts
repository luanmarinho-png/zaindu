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

export type LetterheadId = 'classico' | 'diagonal' | 'onda' | 'linhas';
export const LETTERHEADS: { id: LetterheadId; name: string; hint: string }[] = [
  { id: 'classico', name: 'Clássico', hint: 'Logo no topo com linha na cor da clínica e marca d’água discreta' },
  { id: 'diagonal', name: 'Diagonal', hint: 'Faixas inclinadas no topo e no rodapé, contatos com ícones' },
  { id: 'onda', name: 'Onda', hint: 'Cabeçalho e rodapé coloridos com curva e logo grande ao centro' },
  { id: 'linhas', name: 'Linhas', hint: 'Barras finas, contatos no topo e logo esmaecido ao fundo' },
];
export const isLetterhead = (value: unknown): value is LetterheadId => LETTERHEADS.some(item => item.id === value);

// Ícones de contato (traço, estilo Lucide) para o rodapé.
const ICON: Record<string, string> = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  web: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  insta: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

// Documento A4 com o papel timbrado escolhido pela clínica, sempre na cor e com o logo dela.
// Cabeçalho, rodapé e decoração ficam fixos e se repetem em cada página; a tabela reserva o espaço deles.
export function documentHtml(document: ClinicalDocument, patient: Patient, settings: ClinicSettings, brand: Brand | null, professional: Professional | undefined, autoPrint = true, layout?: LetterheadId): string {
  const light = Boolean(brand?.color && isLightColor(brand.color));
  const color = brand?.color && !light ? brand.color : '#2e2e30';
  // Tom de apoio: a própria cor clareada (cor clara da clínica entra como apoio quando é off-white).
  const accent = light && brand?.color ? brand.color : `color-mix(in srgb, ${color} 45%, #fff)`;
  const style: LetterheadId = layout || (isLetterhead(settings.letterhead) ? settings.letterhead : 'classico');
  const initial = escape((settings.clinicName || 'C').slice(0, 1).toUpperCase());
  const logo = brand?.logo ? `<img src="${brand.logo}" alt="" class="logo">` : `<span class="logo mark">${initial}</span>`;
  const bigLogo = brand?.logo ? `<img src="${brand.logo}" alt="">` : `<span class="mark">${initial}</span>`;
  // Marca d'água opcional (Configurações → Papel timbrado).
  const mark = (place: string) => settings.letterheadWatermark === false ? '' : `<div class="watermark ${place}">${bigLogo}</div>`;
  const signer = professional || { name: settings.professionalName, registry: settings.professionalRegistry, specialty: settings.specialty };
  const contacts = ([['phone', settings.clinicPhone], ['mail', settings.clinicEmail], ['insta', settings.clinicInstagram], ['web', settings.clinicWebsite], ['pin', settings.clinicAddress]] as [string, string | undefined][])
    .filter(([, value]) => value?.trim()).map(([name, value]) => `<span>${icon(name)}<em>${escape(String(value))}</em></span>`).join('');
  const brandBlock = `<div class="brand">${logo}<div><strong>${escape(settings.clinicName)}</strong><small>${escape(signer.specialty || settings.specialty || '')}</small></div></div>`;
  const brandWhite = `<div class="brand on-color">${brand?.logo ? `<img src="${brand.logo}" alt="" class="logo">` : `<span class="logo mark inverse">${initial}</span>`}<div><strong>${escape(settings.clinicName)}</strong><small>${escape(signer.specialty || settings.specialty || '')}</small></div></div>`;

  const layouts: Record<LetterheadId, { head: number; foot: number; deco: string; css: string }> = {
    classico: {
      head: 38, foot: 22,
      deco: `<div class="fixed top">${brandBlock}<div class="rule"></div></div>
        <div class="fixed bottom contacts">${contacts}</div>
        ${mark("corner")}`,
      css: `.top { top: 14mm; left: 20mm; right: 20mm; } .rule { height: 2px; margin-top: 12px; background: ${color}; }
        .bottom { bottom: 10mm; left: 20mm; right: 20mm; } .corner { right: 12mm; bottom: 18mm; width: 60mm; height: 60mm; }`,
    },
    diagonal: {
      head: 50, foot: 30,
      deco: `<svg class="fixed page" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">
          <polygon points="88,0 210,0 210,5 52,24" fill="${color}"/><polygon points="40,28 54,22.6 56.5,23.4 42.5,29" fill="${accent}"/>
          <polygon points="150,297 210,297 210,226 172,241" fill="${color}"/><polygon points="139,297 147,297 168,242.6 162,245" fill="${accent}"/>
        </svg>
        <div class="fixed top">${brandBlock}</div>
        <div class="fixed bottom contacts stacked">${contacts}</div>`,
      css: `.top { top: 32mm; left: 20mm; } .bottom { bottom: 10mm; left: 20mm; max-width: 120mm; }`,
    },
    onda: {
      head: 46, foot: 38,
      deco: `<svg class="fixed page" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,0 H210 V20 C168,34 104,12 0,32 Z" fill="${color}"/>
          <path d="M96,30 C140,22 178,30 210,22" fill="none" stroke="${accent}" stroke-width="1.4"/>
          <path d="M0,276 C70,268 140,284 210,272 V297 H0 Z" fill="${color}"/>
          <path d="M0,271 C60,264 120,276 170,268" fill="none" stroke="${accent}" stroke-width="1.2"/>
        </svg>
        <div class="fixed top">${brandWhite}</div>
        ${mark("center")}
        <div class="fixed bottom contacts on-color">${contacts}</div>`,
      css: `.top { top: 7mm; left: 18mm; } .bottom { bottom: 6mm; left: 18mm; right: 18mm; justify-content: center; gap: 2mm 7mm; font-size: 8.5pt; letter-spacing: .01em; }
        .bottom span:last-child:nth-child(n+4) { flex-basis: 100%; justify-content: center; opacity: .85; }
        .center { left: 50%; top: 50%; width: 120mm; height: 120mm; transform: translate(-50%, -50%); }`,
    },
    linhas: {
      head: 40, foot: 24,
      deco: `<svg class="fixed page" viewBox="0 0 210 297" preserveAspectRatio="none" aria-hidden="true">
          <rect x="44" y="0" width="56" height="2.6" fill="${color}"/>
          <rect x="0" y="290" width="152" height="7" fill="${color}"/><rect x="152" y="290" width="58" height="7" fill="${accent}"/>
        </svg>
        ${mark("hero")}
        <div class="fixed top">${brandBlock}</div>
        <div class="fixed side contacts stacked right">${contacts}</div>`,
      css: `.top { top: 16mm; left: 20mm; } .side { top: 14mm; right: 20mm; max-width: 70mm; }
        .hero { right: -10mm; top: 40mm; width: 130mm; height: 130mm; }`,
    },
  };
  const chosen = layouts[style];
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(document.title)} · ${escape(patient.name)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font: 400 12pt/1.6 Inter, 'Helvetica Neue', Arial, sans-serif; color: #1c1d20; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .fixed { position: fixed; z-index: 1; }
  .page { inset: 0; width: 210mm; height: 297mm; z-index: 0; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand strong { display: block; font-size: 13.5pt; }
  .brand small { color: #6b6b6b; font-size: 9.5pt; }
  .brand.on-color strong, .brand.on-color small { color: #fff; }
  .logo { width: 50px; height: 50px; object-fit: contain; border-radius: 10px; }
  .mark { display: grid; place-items: center; background: ${color}; color: #fff; font: 600 22pt Inter, sans-serif; }
  .mark.inverse { background: #fff; color: ${color}; }
  .contacts { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 9pt; color: #4a4a4a; }
  .contacts.stacked { flex-direction: column; }
  .contacts.right { align-items: flex-end; text-align: right; }
  .contacts.on-color { color: #fff; }
  .contacts span { display: inline-flex; align-items: flex-start; gap: 6px; }
  .contacts em { font-style: normal; }
  .contacts.right span { display: block; text-align: right; }
  .contacts.right svg { display: inline-block; vertical-align: -1px; margin: 0 5px 0 0; }
  .contacts svg { width: 11px; height: 11px; flex: none; margin-top: 3px; color: ${color}; }
  .contacts.on-color svg { color: #fff; }
  .watermark { position: fixed; opacity: .06; z-index: 0; pointer-events: none; }
  .watermark img, .watermark .mark { width: 100%; height: 100%; object-fit: contain; border-radius: 16mm; font-size: 48mm; }
  table.sheet { width: 100%; border-collapse: collapse; position: relative; z-index: 2; }
  .sheet td { padding: 0 20mm; }
  .head-space { height: ${chosen.head}mm; } .foot-space { height: ${chosen.foot}mm; }
  h1 { margin: 6mm 0 2mm; font-size: 16pt; font-weight: 600; letter-spacing: .02em; color: ${color}; }
  .patient { margin: 0 0 7mm; color: #4a4a4a; font-size: 10.5pt; }
  .body { white-space: pre-wrap; min-height: 90mm; }
  footer { margin-top: 14mm; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; font-size: 10.5pt; break-inside: avoid; }
  .sign { min-width: 70mm; text-align: center; border-top: 1px solid #1c1d20; padding-top: 6px; }
  .sign small { display: block; color: #6b6b6b; font-size: 9.5pt; }
  ${chosen.css}
</style></head><body>
${chosen.deco}
<table class="sheet"><thead><tr><td><div class="head-space"></div></td></tr></thead>
<tbody><tr><td>
<h1>${escape(document.title)}</h1>
<p class="patient">Paciente: <b>${escape(patient.name)}</b>${patient.cpf ? ` · CPF ${escape(maskCpf(patient.cpf))}` : ''}</p>
<div class="body">${escape(document.body)}</div>
<footer><span>${escape(formatDate(document.date, { day: '2-digit', month: 'long', year: 'numeric' }))}</span>
<span class="sign">${escape(signer.name)}${signer.registry ? `<small>${escape(signer.registry)}</small>` : ''}</span></footer>
</td></tr></tbody>
<tfoot><tr><td><div class="foot-space"></div></td></tr></tfoot></table>
${autoPrint ? '<script>window.onload = () => { window.focus(); window.print(); };</script>' : ''}
</body></html>`;
  return html;
}
